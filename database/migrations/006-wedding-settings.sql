-- Migration: Site-wide settings (singleton row)
-- Date: 2026-06-21
-- Purpose: Admin-controlled runtime config for the disposable camera popup
--          and gallery reveal date. Single-row "wedding_settings" pattern.

-- ============================================
-- 1. Settings table (always exactly one row, id = 1)
-- ============================================
CREATE TABLE IF NOT EXISTS wedding_settings (
    id INT PRIMARY KEY DEFAULT 1,

    -- Disposable camera popup (shown on the home page on first visit)
    camera_popup_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    camera_popup_title VARCHAR(120) NOT NULL DEFAULT '📷 Be our photographer',
    camera_popup_body TEXT NOT NULL DEFAULT 'Help us capture every angle of our day! Each guest gets a 24-shot disposable camera roll. Snap candid moments throughout the wedding — every photo will be revealed in a shared gallery the day after.',
    camera_popup_cta VARCHAR(60) NOT NULL DEFAULT 'Pick up your camera',

    -- Gallery reveal: photos stay locked until this point
    gallery_reveal_at TIMESTAMPTZ NOT NULL DEFAULT '2026-06-27 00:00:00-07:00',

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Enforce singleton: only one row, id = 1, ever
    CONSTRAINT wedding_settings_singleton CHECK (id = 1)
);

-- Insert the singleton row if it doesn't exist
INSERT INTO wedding_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. Trigger to bump updated_at on every change
-- ============================================
CREATE OR REPLACE FUNCTION wedding_settings_touch()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wedding_settings_touch ON wedding_settings;
CREATE TRIGGER trg_wedding_settings_touch
    BEFORE UPDATE ON wedding_settings
    FOR EACH ROW EXECUTE FUNCTION wedding_settings_touch();

-- ============================================
-- 3. Admin action enum value for setting changes
-- ============================================
ALTER TYPE admin_action ADD VALUE IF NOT EXISTS 'settings_updated';

-- ============================================
-- 4. RLS - settings are managed via service role only
-- ============================================
ALTER TABLE wedding_settings ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE wedding_settings IS 'Site-wide runtime configuration. Always exactly one row (id = 1).';
COMMENT ON COLUMN wedding_settings.camera_popup_enabled IS 'Whether to show the disposable-camera "new feature" popup on first visit';
COMMENT ON COLUMN wedding_settings.gallery_reveal_at IS 'Time after which photos become visible in the public gallery';
