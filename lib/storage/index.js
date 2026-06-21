// Storage selector. Returns the active storage adapter based on env config.
//
// Preference order:
//   1. Google Drive (if GOOGLE_DRIVE_FOLDER_ID + GOOGLE_SERVICE_ACCOUNT_KEY are set)
//   2. Local filesystem (always available, used in dev or as fallback)

const driveStorage = require('./driveStorage');
const localStorage = require('./localStorage');

function getActiveStorage() {
    if (driveStorage.isConfigured()) {
        console.log('📦 Photo storage: Google Drive');
        return driveStorage;
    }
    console.log('📦 Photo storage: local filesystem (data/uploads/) - configure Google Drive for production');
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
    localStorage
};
