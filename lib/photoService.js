// Photo service: orchestrates compression, storage upload, and Supabase persistence.
// Sits between the route handlers and the storage adapters / DB.

const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const { supabaseAdmin } = require('../database/supabase-config');
const { getStorage } = require('./storage');
const settingsService = require('./settingsService');

// "Roll of film" limit. Matches the disposable-camera metaphor and keeps total
// storage predictable: 150 guests × 24 photos × ~250KB ≈ 900 MB main + 90 MB
// thumbnails = ~1 GB at the absolute upper bound, designed to fit in Supabase
// Storage's 1 GB free tier with realistic usage (most guests upload <10 photos).
const PHOTOS_PER_ROLL = parseInt(process.env.PHOTOS_PER_ROLL, 10) || 24;

// Main image: 1200px max edge, JPEG quality 75, EXIF stripped, ~200-300KB.
// Tuned down from 1600px/Q80 so the gallery stays inside Supabase's 1 GB free
// tier. Still sharp on phones and laptops; only noticeable on a 4K monitor.
const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 75;

// Thumbnail variant for the gallery grid: ~25KB. Cuts gallery egress by ~10x
// vs. loading full images in the grid - critical for staying inside Supabase's
// 5 GB free egress quota.
const THUMB_DIMENSION = 400;
const THUMB_QUALITY = 70;

// =====================================================================
// Kodak film emulation
// ---------------------------------------------------------------------
// Applied ONCE on the shared base pipeline before .clone(), so both the
// main and thumbnail variants inherit the same look without re-running
// the colour ops twice. Each filter is a pure function from a sharp
// pipeline to a sharp pipeline.
//
// The numbers below are hand-tuned per look:
//   - .modulate({ saturation, brightness }) — multiplicative
//   - .linear([slopeR,G,B], [offsetR,G,B])  — per-channel a*x + b
//   - .gamma(g)                             — midtone shape
//
// Toggle via env: CAMERA_FILM=off|gold|portra|ektar (default: off).
// Photos already in storage are not re-processed; only new uploads
// take on the active look.
// =====================================================================
const FILMS = {
    // Kodak Gold 200 — warm, sunny, "family album" classic.
    // Mild sat lift, golden cast in midtones, gentle blue pull-down in shadows.
    gold: pipeline => pipeline
        .modulate({ saturation: 1.12, brightness: 1.03 })
        .linear([1.05, 1.02, 0.95], [4, 2, -6])
        .gamma(1.05),

    // Kodak Portra 400 — soft, low-contrast portrait/wedding film.
    // Smooth skin tones, slight magenta cast, milky shadows, slightly
    // desaturated. The photographer's go-to for weddings.
    portra: pipeline => pipeline
        .modulate({ saturation: 0.93, brightness: 1.04 })
        .linear([1.00, 0.97, 1.01], [6, 5, 3])
        .gamma(1.08),

    // Kodak Ektar 100 — fine-grain, vivid, contrasty.
    // Punchy reds and blues, deeper saturation, snappier midtones.
    // Best on bright outdoor scenes. No .gamma() — sharp clamps gamma to
    // [1.0, 3.0] which only lifts midtones; the contrast we want here comes
    // from the .linear() slope + negative offset, which is the right knob.
    ektar: pipeline => pipeline
        .modulate({ saturation: 1.28, brightness: 1.00 })
        .linear([1.12, 1.07, 1.09], [-6, -3, -4])
};

function getActiveFilm() {
    const raw = (process.env.CAMERA_FILM || 'off').toLowerCase().trim();
    if (!raw || raw === 'off' || raw === 'none') return null;
    if (!FILMS[raw]) {
        console.warn(`photoService: unknown CAMERA_FILM="${raw}", expected one of: ${Object.keys(FILMS).join(', ')}, off. Falling back to off.`);
        return null;
    }
    return { name: raw, apply: FILMS[raw] };
}

// Public helper for UI surfaces that want to show / preview the active look
// (e.g. the camera page wants to apply a CSS filter approximation to the
// live <video> so guests see the look while composing).
function getActiveFilmName() {
    const f = getActiveFilm();
    return f ? f.name : null;
}

// List of valid film names exposed to clients for picker UIs and request
// validation. Keep in sync with the FILMS map above.
const SUPPORTED_FILMS = Object.keys(FILMS);

/**
 * Resolve the film a single upload should be processed with.
 *
 * Priority:
 *   1. Explicit per-upload override from the client (validated against
 *      SUPPORTED_FILMS). The string 'off'/'none' is an explicit opt-out
 *      and produces null even when the env default is set.
 *   2. The env default from CAMERA_FILM (via getActiveFilm).
 *   3. null (no colour grade).
 *
 * Unknown / malformed overrides fall through to the env default rather than
 * silently disabling the look — the client may be on a stale build.
 */
function resolveFilm(override) {
    if (override !== undefined && override !== null && override !== '') {
        const lower = String(override).toLowerCase().trim();
        if (lower === 'off' || lower === 'none') return null;
        if (FILMS[lower]) return { name: lower, apply: FILMS[lower] };
        // Fall through on unknown values.
    }
    return getActiveFilm();
}

// One-time startup log so the operator can confirm the active look.
{
    const f = getActiveFilm();
    if (f) console.log(`photoService: Kodak film emulation active -> ${f.name}`);
}

/**
 * Derive the thumbnail filename from the main filename. Used both at upload
 * time to keep the two variants paired and at delete time to clean up the
 * thumbnail without needing a separate DB column.
 *
 *   "1719010823-abc12345.jpg"  ->  "1719010823-abc12345.thumb.jpg"
 */
function thumbnailFilenameFor(mainFilename) {
    if (!mainFilename) return null;
    const dot = mainFilename.lastIndexOf('.');
    if (dot < 0) return `${mainFilename}.thumb`;
    return `${mainFilename.slice(0, dot)}.thumb${mainFilename.slice(dot)}`;
}

// Reveal date now lives in wedding_settings (admin-controlled at runtime).
// These wrappers stay async to keep the rest of the codebase consistent.
async function getRevealDate() {
    return settingsService.getRevealDate();
}

async function isRevealed() {
    return settingsService.isRevealed();
}

/**
 * Run the raw upload buffer through sharp twice — once for the main display
 * variant and once for the gallery-grid thumbnail. Both:
 *   - auto-rotate based on EXIF orientation
 *   - resize so the longest edge fits the variant's max dimension (no upscaling)
 *   - re-encode as progressive JPEG, mozjpeg-style
 *   - strip ALL metadata (privacy: removes GPS/device info from guests' phones)
 *
 * Returning both lets the gallery render the lightweight thumbnail in grids
 * and only fetch the full image when a guest opens a photo.
 */
async function processImage(rawBuffer, filmOverride) {
    let base = sharp(rawBuffer, { failOn: 'none' }).rotate();

    // Apply the colour grade once on the shared base. Both clones below
    // inherit it; sharp fuses these ops with the resize+encode passes.
    // The filmOverride lets a single guest pick their own roll on the
    // camera page; the env-default kicks in otherwise.
    const film = filmOverride !== undefined ? resolveFilm(filmOverride) : getActiveFilm();
    if (film) base = film.apply(base);

    const metadata = await base.metadata();
    const sourceWidth = metadata.width || 0;
    const sourceHeight = metadata.height || 0;

    async function variant({ maxEdge, quality }) {
        const pipeline = base.clone();
        const longestEdge = Math.max(sourceWidth, sourceHeight);
        if (longestEdge > maxEdge) {
            pipeline.resize({
                width: sourceWidth >= sourceHeight ? maxEdge : null,
                height: sourceHeight > sourceWidth ? maxEdge : null,
                fit: 'inside',
                withoutEnlargement: true
            });
        }
        const out = await pipeline
            .jpeg({ quality, progressive: true, mozjpeg: true })
            .toBuffer({ resolveWithObject: true });
        return {
            buffer: out.data,
            width: out.info.width,
            height: out.info.height,
            sizeBytes: out.info.size
        };
    }

    // Run the two encodes in parallel; sharp releases the GIL-equivalent so
    // this is meaningfully faster on multi-core hosts.
    const [main, thumb] = await Promise.all([
        variant({ maxEdge: MAX_DIMENSION, quality: JPEG_QUALITY }),
        variant({ maxEdge: THUMB_DIMENSION, quality: THUMB_QUALITY })
    ]);

    return { main, thumb };
}

/**
 * Upsert the photographer record by device_id. The name a guest typed on
 * their FIRST upload becomes their permanent attribution for the device —
 * subsequent uploads cannot rename them. This stops accidental (or
 * intentional) name changes from rewriting attribution on photos already
 * shared in the gallery.
 *
 * If you ever need to rename a photographer, do it from the admin UI; the
 * back-end accepts that explicitly via setHidden / blockPhotographer flows.
 */
async function findOrCreatePhotographer({ deviceId, displayName, ipAddress, userAgent }) {
    const { data: existing, error: findErr } = await supabaseAdmin
        .from('photographers')
        .select('*')
        .eq('device_id', deviceId)
        .maybeSingle();

    if (findErr) throw findErr;

    if (existing) {
        // Name lock: once the device has uploaded at least one photo, keep
        // whatever name they used the first time. Only allow renaming while
        // photo_count is still 0 (e.g. they typed a name, didn't submit, and
        // came back to fix a typo before their first shot).
        const lockName = (existing.photo_count || 0) > 0;
        const update = {
            last_seen_at: new Date().toISOString(),
            ip_address: ipAddress,
            user_agent: userAgent
        };
        if (!lockName) {
            update.display_name = displayName;
        }

        const { data: updated, error: updErr } = await supabaseAdmin
            .from('photographers')
            .update(update)
            .eq('id', existing.id)
            .select()
            .single();
        if (updErr) throw updErr;
        return updated;
    }

    const { data: inserted, error: insErr } = await supabaseAdmin
        .from('photographers')
        .insert([{
            device_id: deviceId,
            display_name: displayName,
            ip_address: ipAddress,
            user_agent: userAgent
        }])
        .select()
        .single();
    if (insErr) throw insErr;
    return inserted;
}

/**
 * Full upload pipeline: validate roll quota → compress → upload → persist.
 * Throws specific errors the route handler turns into HTTP responses.
 */
async function uploadPhoto({ rawBuffer, mimeType, deviceId, displayName, caption, ipAddress, userAgent, film }) {
    if (!deviceId) throw new Error('MISSING_DEVICE_ID');
    if (!displayName || displayName.trim().length < 1) throw new Error('MISSING_NAME');

    // 1. Find / create photographer, enforce block + roll quota
    const photographer = await findOrCreatePhotographer({
        deviceId,
        displayName: displayName.trim().substring(0, 100),
        ipAddress,
        userAgent
    });

    if (photographer.is_blocked) {
        throw new Error('PHOTOGRAPHER_BLOCKED');
    }

    if (photographer.photo_count >= PHOTOS_PER_ROLL) {
        const err = new Error('ROLL_FULL');
        err.photoCount = photographer.photo_count;
        err.limit = PHOTOS_PER_ROLL;
        throw err;
    }

    // 2. Compress into main + thumbnail variants
    let processed;
    try {
        processed = await processImage(rawBuffer, film);
    } catch (e) {
        const err = new Error('INVALID_IMAGE');
        err.cause = e.message;
        throw err;
    }

    // 3. Upload both variants. Filenames share a common stem so we can derive
    //    the thumbnail file id from the main file id at delete time and avoid
    //    a schema migration to add a thumbnail_file_id column.
    const storage = getStorage();
    const stem = `${Date.now()}-${uuidv4().slice(0, 8)}`;
    const mainFilename = `${stem}.jpg`;
    const thumbFilename = thumbnailFilenameFor(mainFilename);

    let mainUpload;
    let thumbUpload;
    try {
        mainUpload = await storage.upload(processed.main.buffer, {
            filename: mainFilename,
            mimeType: 'image/jpeg'
        });
        thumbUpload = await storage.upload(processed.thumb.buffer, {
            filename: thumbFilename,
            mimeType: 'image/jpeg'
        });
    } catch (e) {
        // Best-effort cleanup if only one of the two uploads succeeded.
        if (mainUpload) { try { await storage.remove(mainUpload.fileId); } catch (_) {} }
        if (thumbUpload) { try { await storage.remove(thumbUpload.fileId); } catch (_) {} }
        throw e;
    }

    // 4. Persist DB row. The trigger increments photo_count on the photographer.
    const { data: photo, error: insErr } = await supabaseAdmin
        .from('photos')
        .insert([{
            photographer_id: photographer.id,
            photographer_name: photographer.display_name,
            storage_provider: storage.providerName,
            storage_file_id: mainUpload.fileId,
            public_url: mainUpload.publicUrl,
            thumbnail_url: thumbUpload.publicUrl,
            file_size_bytes: processed.main.sizeBytes,
            width: processed.main.width,
            height: processed.main.height,
            mime_type: 'image/jpeg',
            caption: caption ? caption.trim().substring(0, 280) : null,
            ip_address: ipAddress,
            user_agent: userAgent
        }])
        .select()
        .single();

    if (insErr) {
        // Best-effort cleanup of the orphaned uploads so storage doesn't drift.
        try { await storage.remove(mainUpload.fileId); } catch (_) {}
        try { await storage.remove(thumbUpload.fileId); } catch (_) {}
        throw insErr;
    }

    return {
        photo,
        photographer,
        // Recompute the post-insert count locally so we can respond before the
        // trigger commits (avoids an extra round trip).
        remaining: Math.max(PHOTOS_PER_ROLL - (photographer.photo_count + 1), 0)
    };
}

/**
 * List visible photos for the public gallery. Returns [] until reveal time
 * unless the caller is an admin.
 */
async function listPublicPhotos({ asAdmin = false, limit = 500 } = {}) {
    const revealDate = await getRevealDate();
    const revealAt = revealDate.toISOString();
    const revealed = Date.now() >= revealDate.getTime();

    if (!asAdmin && !revealed) {
        return { revealed: false, revealAt, photos: [] };
    }

    const { data, error } = await supabaseAdmin
        .from('photos')
        .select('id, photographer_name, public_url, thumbnail_url, width, height, caption, created_at, is_hidden')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;

    // Non-admins never see hidden photos. Admins get the flag so they can toggle.
    const visible = asAdmin ? data : data.filter(p => !p.is_hidden);
    return {
        revealed: true,
        revealAt,
        photos: visible
    };
}

/**
 * Get a photographer's roll status by device_id. Used by the camera page on
 * load to render "X of 24 shots used" without exposing other photographers.
 */
async function getRollStatus(deviceId) {
    if (!deviceId) {
        return { exists: false, count: 0, limit: PHOTOS_PER_ROLL, remaining: PHOTOS_PER_ROLL };
    }

    const { data, error } = await supabaseAdmin
        .from('photographers')
        .select('display_name, photo_count, is_blocked')
        .eq('device_id', deviceId)
        .maybeSingle();

    if (error) throw error;

    if (!data) {
        return { exists: false, count: 0, limit: PHOTOS_PER_ROLL, remaining: PHOTOS_PER_ROLL };
    }

    return {
        exists: true,
        displayName: data.display_name,
        blocked: data.is_blocked,
        count: data.photo_count,
        limit: PHOTOS_PER_ROLL,
        remaining: Math.max(PHOTOS_PER_ROLL - data.photo_count, 0)
    };
}

// ============================================
// Admin moderation helpers
// ============================================

async function setHidden(photoId, hidden, reason = null) {
    const update = hidden
        ? { is_hidden: true, hidden_reason: reason, hidden_at: new Date().toISOString() }
        : { is_hidden: false, hidden_reason: null, hidden_at: null };

    const { data, error } = await supabaseAdmin
        .from('photos')
        .update(update)
        .eq('id', photoId)
        .select()
        .single();
    if (error) throw error;
    return data;
}

async function deletePhoto(photoId) {
    const { data: photo, error: fetchErr } = await supabaseAdmin
        .from('photos')
        .select('*')
        .eq('id', photoId)
        .single();
    if (fetchErr) throw fetchErr;
    if (!photo) return null;

    // Soft-delete in DB first, then attempt hard delete from storage.
    const { error: updErr } = await supabaseAdmin
        .from('photos')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', photoId);
    if (updErr) throw updErr;

    try {
        const adapters = require('./storage');
        const adapter =
            photo.storage_provider === 'supabase' ? adapters.supabaseStorage :
            photo.storage_provider === 'drive'    ? adapters.driveStorage :
                                                    adapters.localStorage;

        // Remove main + thumbnail. Older rows uploaded before the thumbnail
        // variant existed won't have a paired thumb file - the adapter's
        // remove() treats missing files as a no-op so this is safe either way.
        await adapter.remove(photo.storage_file_id);
        const thumbFileId = thumbnailFilenameFor(photo.storage_file_id);
        if (thumbFileId && thumbFileId !== photo.storage_file_id) {
            try { await adapter.remove(thumbFileId); } catch (_) {}
        }
    } catch (e) {
        // Log but don't fail - the row is already soft-deleted, an admin can
        // do a manual storage cleanup if needed.
        console.error('Storage delete failed for photo', photoId, e.message);
    }

    return photo;
}

async function blockPhotographer(photographerId, reason = null) {
    const { data, error } = await supabaseAdmin
        .from('photographers')
        .update({ is_blocked: true, blocked_reason: reason })
        .eq('id', photographerId)
        .select()
        .single();
    if (error) throw error;
    return data;
}

async function adminListPhotos({ limit = 500 } = {}) {
    const { data, error } = await supabaseAdmin
        .from('photos')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error) throw error;
    return data || [];
}

async function adminListPhotographers() {
    const { data, error } = await supabaseAdmin
        .from('photographers')
        .select('*')
        .order('photo_count', { ascending: false });
    if (error) throw error;
    return data || [];
}

module.exports = {
    PHOTOS_PER_ROLL,
    getRevealDate,
    isRevealed,
    uploadPhoto,
    listPublicPhotos,
    getRollStatus,
    setHidden,
    deletePhoto,
    blockPhotographer,
    adminListPhotos,
    adminListPhotographers,
    getActiveFilmName,
    SUPPORTED_FILMS
};
