// Supabase Storage adapter for the disposable camera feature.
//
// Uploads each compressed JPEG (and its thumbnail variant) to a public
// Supabase Storage bucket. Files are served via the bucket's CDN, so guests
// can render them with simple <img src> tags and we get long-lived browser
// caching for free.
//
// Why this is the recommended adapter:
//   - Reuses the Supabase project we already use for RSVPs / photos table.
//   - No service-account/quota dance like Google Drive (Drive blocks service
//     accounts from owning files in a personal account).
//   - The 1-year Cache-Control header below means returning gallery viewers
//     hit the browser cache and never re-egress the same file.
//
// Env vars (already required for the rest of the app):
//   SUPABASE_URL                 - https://<project>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY    - service role key (server-side only)
//
// Optional:
//   SUPABASE_STORAGE_BUCKET      - bucket name (default: wedding-photos)
//
// Bucket setup (one-time, in Supabase Dashboard -> Storage):
//   1. Create a new bucket named `wedding-photos`.
//   2. Toggle "Public bucket" ON so the gallery can fetch via plain URLs.
//   3. Optional: set a 10MB file size limit and JPEG/PNG MIME allowlist.
//
// On first upload, this adapter will try to auto-create the bucket if it's
// missing. That call uses the service role key, so it works without any
// Dashboard click — but explicit Dashboard setup is recommended so you can
// also configure size/MIME limits there.

const { supabaseAdmin } = require('../../database/supabase-config');

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'wedding-photos';

let ensurePromise = null;

async function ensureBucket() {
    if (ensurePromise) return ensurePromise;
    ensurePromise = (async () => {
        try {
            const { data } = await supabaseAdmin.storage.getBucket(BUCKET);
            if (data) return;
        } catch (_) {
            // getBucket may throw on missing bucket depending on client version;
            // fall through to createBucket which handles "already exists".
        }

        const { error } = await supabaseAdmin.storage.createBucket(BUCKET, {
            public: true,
            fileSizeLimit: 10 * 1024 * 1024,
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
        });
        if (error && !/already exists|duplicate/i.test(error.message || '')) {
            throw new Error(
                `Could not create Supabase Storage bucket "${BUCKET}": ${error.message}. ` +
                `Create it manually in the Supabase Dashboard (Storage tab) and toggle "Public bucket" on.`
            );
        }
    })();
    return ensurePromise;
}

/**
 * Upload a buffer to the configured bucket. Returns { fileId, publicUrl }.
 * The caller is responsible for choosing a unique filename. We attach a
 * 1-year immutable Cache-Control so Supabase's CDN + browsers cache hard.
 */
async function upload(buffer, { filename, mimeType = 'image/jpeg' }) {
    await ensureBucket();

    const { error } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(filename, buffer, {
            contentType: mimeType,
            // 1 year - filenames already include a timestamp + uuid so cache busts on new uploads.
            cacheControl: '31536000',
            upsert: false
        });
    if (error) throw error;

    const { data } = supabaseAdmin.storage
        .from(BUCKET)
        .getPublicUrl(filename);

    return {
        fileId: filename,
        publicUrl: data.publicUrl
    };
}

/**
 * Hard delete a file from the bucket. Treats "not found" as success so
 * admin moderation cleanup is idempotent.
 */
async function remove(fileId) {
    if (!fileId) return;
    const { error } = await supabaseAdmin.storage
        .from(BUCKET)
        .remove([fileId]);
    if (error && !/not found/i.test(error.message || '')) {
        throw error;
    }
}

function isConfigured() {
    return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

module.exports = {
    upload,
    remove,
    isConfigured,
    providerName: 'supabase',
    bucketName: BUCKET
};
