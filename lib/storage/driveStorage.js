// Google Drive storage adapter for the disposable camera feature.
//
// Uploads each compressed JPEG into a single shared Drive folder using a
// service account, sets per-file "anyone with link can view" permission,
// and returns a stable public URL the gallery can render via <img src>.
//
// Required env vars (set both):
//   GOOGLE_DRIVE_FOLDER_ID         - Drive folder ID (the part after /folders/ in the URL)
//   GOOGLE_SERVICE_ACCOUNT_KEY     - service account JSON, either as raw JSON
//                                    or base64-encoded JSON (preferred for env files)
//
// Setup steps for the couple:
//   1. Create a Google Cloud project, enable the Drive API.
//   2. Create a service account, download its JSON key.
//   3. Create / pick a Drive folder, "Share" it with the service account email
//      (xxx@xxx.iam.gserviceaccount.com) as Editor.
//   4. Copy the folder ID from the URL into GOOGLE_DRIVE_FOLDER_ID.
//   5. Paste the JSON key (or base64 of it) into GOOGLE_SERVICE_ACCOUNT_KEY.

const { google } = require('googleapis');
const { Readable } = require('stream');

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const RAW_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

let driveClient = null;
let initError = null;

function parseServiceAccountKey(raw) {
    if (!raw) return null;
    const trimmed = raw.trim();
    // Allow both raw JSON and base64-encoded JSON in the env var.
    // Base64 is recommended because most platforms strip newlines from
    // multi-line env values, which breaks the embedded private_key.
    if (trimmed.startsWith('{')) {
        return JSON.parse(trimmed);
    }
    const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
    return JSON.parse(decoded);
}

function getDriveClient() {
    if (driveClient) return driveClient;
    if (initError) throw initError;

    if (!FOLDER_ID || !RAW_KEY) {
        initError = new Error(
            'Drive storage not configured. Set GOOGLE_DRIVE_FOLDER_ID and GOOGLE_SERVICE_ACCOUNT_KEY.'
        );
        throw initError;
    }

    try {
        const credentials = parseServiceAccountKey(RAW_KEY);
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/drive.file']
        });
        driveClient = google.drive({ version: 'v3', auth });
        return driveClient;
    } catch (error) {
        initError = new Error(`Drive storage init failed: ${error.message}`);
        throw initError;
    }
}

function bufferToStream(buffer) {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
}

/**
 * Upload a compressed JPEG buffer to the configured Drive folder.
 * Returns { fileId, publicUrl, thumbnailUrl }.
 */
async function upload(buffer, { filename, mimeType = 'image/jpeg' }) {
    const drive = getDriveClient();

    const createRes = await drive.files.create({
        requestBody: {
            name: filename,
            parents: [FOLDER_ID],
            mimeType
        },
        media: {
            mimeType,
            body: bufferToStream(buffer)
        },
        fields: 'id, name, thumbnailLink, webContentLink'
    });

    const fileId = createRes.data.id;

    // Make the file viewable by anyone with the link, so guests can <img src> it
    // without needing OAuth. We scope this to per-file (not whole folder) so we
    // can revoke individual photos later via admin moderation.
    await drive.permissions.create({
        fileId,
        requestBody: { role: 'reader', type: 'anyone' }
    });

    // Direct view URL that browsers can render as an image. The standard
    // /uc?export=view endpoint serves the binary directly and is CDN-cached
    // by Google. We also expose the thumbnailLink for grid views.
    const publicUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
    const thumbnailUrl = createRes.data.thumbnailLink
        ? createRes.data.thumbnailLink.replace(/=s\d+$/, '=s640')
        : publicUrl;

    return { fileId, publicUrl, thumbnailUrl };
}

/**
 * Hard delete a file from Drive. Used by the admin "delete" action;
 * regular guest deletes only soft-delete the DB row.
 */
async function remove(fileId) {
    if (!fileId) return;
    try {
        const drive = getDriveClient();
        await drive.files.delete({ fileId });
    } catch (error) {
        // Treat 404 as already gone - safe to swallow during moderation cleanup.
        if (error?.code === 404 || /not found/i.test(error?.message || '')) {
            return;
        }
        throw error;
    }
}

function isConfigured() {
    return Boolean(FOLDER_ID && RAW_KEY);
}

module.exports = {
    upload,
    remove,
    isConfigured,
    providerName: 'drive'
};
