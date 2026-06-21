-- Migration: Disposable Camera feature ("Once"-style guest photo gallery)
-- Date: 2026-06-21
-- Purpose: Let wedding guests upload photos with a 24-shot roll limit per device,
--          stored in Google Drive (or local fallback), revealed after the wedding.

-- ============================================
-- 1. Extend admin_action enum with photo actions
-- ============================================
ALTER TYPE admin_action ADD VALUE IF NOT EXISTS 'photo_uploaded';
ALTER TYPE admin_action ADD VALUE IF NOT EXISTS 'photo_hidden';
ALTER TYPE admin_action ADD VALUE IF NOT EXISTS 'photo_deleted';
ALTER TYPE admin_action ADD VALUE IF NOT EXISTS 'photo_unhidden';
ALTER TYPE admin_action ADD VALUE IF NOT EXISTS 'photographer_blocked';
ALTER TYPE admin_action ADD VALUE IF NOT EXISTS 'gallery_revealed';

-- ============================================
-- 2. Photographers table
--    One row per device that uploads photos.
--    device_id is a UUID generated client-side and stored in a HttpOnly
--    cookie + localStorage; serves as the throttle key for the 24-shot roll.
-- ============================================
CREATE TABLE IF NOT EXISTS photographers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id VARCHAR(64) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    photo_count INTEGER NOT NULL DEFAULT 0,
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    blocked_reason TEXT,
    ip_address INET,
    user_agent TEXT,
    first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photographers_device_id ON photographers(device_id);
CREATE INDEX IF NOT EXISTS idx_photographers_display_name ON photographers(display_name);

-- ============================================
-- 3. Photos table
-- ============================================
CREATE TABLE IF NOT EXISTS photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    photographer_id UUID NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
    -- Denormalized snapshot of the photographer's name at upload time.
    -- Lets us show attribution even if the photographer record is later
    -- renamed and avoids a join on the public gallery query.
    photographer_name VARCHAR(100) NOT NULL,

    -- Where the bytes live: 'drive' (Google Drive) or 'local' (fallback / dev)
    storage_provider VARCHAR(16) NOT NULL DEFAULT 'drive',
    storage_file_id VARCHAR(255) NOT NULL,
    public_url TEXT NOT NULL,
    thumbnail_url TEXT,

    file_size_bytes INTEGER,
    width INTEGER,
    height INTEGER,
    mime_type VARCHAR(64) NOT NULL DEFAULT 'image/jpeg',
    caption VARCHAR(280),

    -- Moderation. Photos are auto-approved; admin can hide later.
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    hidden_reason TEXT,
    hidden_at TIMESTAMP WITH TIME ZONE,
    flagged_count INTEGER NOT NULL DEFAULT 0,

    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_photos_photographer_id ON photos(photographer_id);
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_visible
    ON photos(created_at DESC)
    WHERE deleted_at IS NULL AND is_hidden = FALSE;

-- ============================================
-- 4. Trigger: keep photographers.photo_count in sync
-- ============================================
CREATE OR REPLACE FUNCTION update_photographer_photo_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE photographers
            SET photo_count = photo_count + 1,
                last_seen_at = NOW()
            WHERE id = NEW.photographer_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE photographers
            SET photo_count = GREATEST(photo_count - 1, 0)
            WHERE id = OLD.photographer_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_photos_count ON photos;
CREATE TRIGGER trg_photos_count
    AFTER INSERT OR DELETE ON photos
    FOR EACH ROW EXECUTE FUNCTION update_photographer_photo_count();

-- ============================================
-- 5. Public view used by the gallery API
--    Hides soft-deleted/hidden rows and exposes only safe columns.
-- ============================================
CREATE OR REPLACE VIEW public_photos AS
SELECT
    p.id,
    p.photographer_name,
    p.public_url,
    p.thumbnail_url,
    p.width,
    p.height,
    p.caption,
    p.created_at
FROM photos p
WHERE p.deleted_at IS NULL
  AND p.is_hidden = FALSE
ORDER BY p.created_at ASC;

-- ============================================
-- 6. RLS - photos and photographers are managed via service role only
--    (anon clients hit our Express API, never Supabase directly).
-- ============================================
ALTER TABLE photographers ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. Permissions
-- ============================================
GRANT SELECT ON public_photos TO anon, authenticated;

COMMENT ON TABLE photographers IS 'Wedding guests who have uploaded photos via the disposable camera page';
COMMENT ON TABLE photos IS 'Guest-uploaded photos for the disposable camera gallery';
COMMENT ON COLUMN photographers.device_id IS 'Client-generated UUID, used as throttle key for the 24-shot roll limit';
COMMENT ON COLUMN photos.storage_provider IS 'Where the binary lives: drive | local';
