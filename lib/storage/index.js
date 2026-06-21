// Storage selector. Returns the active storage adapter based on env config.
//
// Preference order:
//   1. Supabase Storage (recommended) - if SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
//      are set, which they always are for this app since the rest of the
//      backend uses Supabase. This is the primary path going forward.
//   2. Google Drive (legacy) - only if SUPABASE_STORAGE_DISABLED=1 AND Drive is
//      configured. Kept around for completeness but blocked by Google's
//      "service accounts have 0 storage quota" policy on personal Gmail; not
//      recommended.
//   3. Local filesystem - dev / no-config fallback. Files written under
//      data/uploads/ which is ephemeral on Railway / Render / Netlify, so
//      this is only safe for local development.

const driveStorage = require('./driveStorage');
const localStorage = require('./localStorage');
const supabaseStorage = require('./supabaseStorage');

function getActiveStorage() {
    if (process.env.SUPABASE_STORAGE_DISABLED !== '1' && supabaseStorage.isConfigured()) {
        console.log(`📦 Photo storage: Supabase Storage (bucket: ${supabaseStorage.bucketName})`);
        return supabaseStorage;
    }
    if (driveStorage.isConfigured()) {
        console.log('📦 Photo storage: Google Drive (legacy - watch for storage-quota errors)');
        return driveStorage;
    }
    console.log('📦 Photo storage: local filesystem (data/uploads/) — NOT durable in production. Configure Supabase.');
    return localStorage;
}

let cached = null;
function getStorage() {
    if (!cached) cached = getActiveStorage();
    return cached;
}

module.exports = {
    getStorage,
    driveStorage,
    localStorage,
    supabaseStorage
};
