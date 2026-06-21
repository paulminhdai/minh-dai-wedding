// Photo service: orchestrates compression, storage upload, and Supabase persistence.
// Sits between the route handlers and the storage adapters / DB.

const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const { supabaseAdmin } = require('../database/supabase-config');
const { getStorage } = require('./storage');
const settingsService = require('./settingsService');

// "Roll of film" limit. Matches the disposable-camera metaphor and keeps total
// storage predictable: 150 guests × 24 photos × ~600KB ≈ 2.1 GB.
const PHOTOS_PER_ROLL = parseInt(process.env.PHOTOS_PER_ROLL, 10) || 24;

// Compression target: 1600px max edge, JPEG quality 80, EXIF stripped.
// At ~600KB per photo this stays comfortably inside the Drive 15GB free tier
// for an event of this size while preserving print-grade quality.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 80;

// Reveal date now lives in wedding_settings (admin-controlled at runtime).
// These wrappers stay async to keep the rest of the codebase consistent.
async function getRevealDate() {
    return settingsService.getRevealDate();
}

async function isRevealed() {
    return settingsService.isRevealed();
}

/**
 * Run the raw upload buffer through sharp:
 *   - auto-rotate based on EXIF orientation
 *   - resize so the longest edge is MAX_DIMENSION (no upscaling)
 *   - re-encode as progressive JPEG, mozjpeg-style
 *   - strip ALL metadata (privacy: removes GPS/device info from guests' phones)
 */
async function processImage(rawBuffer) {
    const image = sharp(rawBuffer, { failOn: 'none' }).rotate();
    const metadata = await image.metadata();

    const longestEdge = Math.max(metadata.width || 0, metadata.height || 0);
    const pipeline = image.clone();
    if (longestEdge > MAX_DIMENSION) {
        pipeline.resize({
            width: metadata.width >= metadata.height ? MAX_DIMENSION : null,
            height: metadata.height > metadata.width ? MAX_DIMENSION : null,
            fit: 'inside',
            withoutEnlargement: true
        });
    }

    const buffer = await pipeline
        .jpeg({ quality: JPEG_QUALITY, progressive: true, mozjpeg: true })
        .toBuffer({ resolveWithObject: true });

    return {
        buffer: buffer.data,
        width: buffer.info.width,
        height: buffer.info.height,
        sizeBytes: buffer.info.size
    };
}

/**
 * Upsert the photographer record by device_id. Bumps last_seen_at and
 * updates display_name if the guest changed it. Returns the row.
 */
async function findOrCreatePhotographer({ deviceId, displayName, ipAddress, userAgent }) {
    const { data: existing, error: findErr } = await supabaseAdmin
        .from('photographers')
        .select('*')
        .eq('device_id', deviceId)
        .maybeSingle();

    if (findErr) throw findErr;

    if (existing) {
        const { data: updated, error: updErr } = await supabaseAdmin
            .from('photographers')
            .update({
                display_name: displayName,
                last_seen_at: new Date().toISOString(),
                ip_address: ipAddress,
                user_agent: userAgent
            })
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
async function uploadPhoto({ rawBuffer, mimeType, deviceId, displayName, caption, ipAddress, userAgent }) {
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

    // 2. Compress
    let processed;
    try {
        processed = await processImage(rawBuffer);
    } catch (e) {
        const err = new Error('INVALID_IMAGE');
        err.cause = e.message;
        throw err;
    }

    // 3. Upload
    const storage = getStorage();
    const filename = `${Date.now()}-${uuidv4().slice(0, 8)}.jpg`;
    const uploadResult = await storage.upload(processed.buffer, {
        filename,
        mimeType: 'image/jpeg'
    });

    // 4. Persist DB row. The trigger increments photo_count on the photographer.
    const { data: photo, error: insErr } = await supabaseAdmin
        .from('photos')
        .insert([{
            photographer_id: photographer.id,
            photographer_name: photographer.display_name,
            storage_provider: storage.providerName,
            storage_file_id: uploadResult.fileId,
            public_url: uploadResult.publicUrl,
            thumbnail_url: uploadResult.thumbnailUrl,
            file_size_bytes: processed.sizeBytes,
            width: processed.width,
            height: processed.height,
            mime_type: 'image/jpeg',
            caption: caption ? caption.trim().substring(0, 280) : null,
            ip_address: ipAddress,
            user_agent: userAgent
        }])
        .select()
        .single();

    if (insErr) {
        // Best-effort cleanup of the orphaned upload so storage doesn't drift.
        try { await storage.remove(uploadResult.fileId); } catch (_) {}
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
        if (photo.storage_provider === 'drive') {
            await require('./storage').driveStorage.remove(photo.storage_file_id);
        } else {
            await require('./storage').localStorage.remove(photo.storage_file_id);
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
    adminListPhotographers
};
