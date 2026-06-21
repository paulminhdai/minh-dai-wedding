// Local filesystem storage adapter - fallback when Google Drive isn't configured.
// Useful for local development and as an emergency fallback if the Drive API
// is unavailable. Files are written to data/uploads/ and served via
// /uploads/<filename> (mounted in server.js).

const fs = require('fs').promises;
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'data', 'uploads');

async function ensureDir() {
    try {
        await fs.access(UPLOADS_DIR);
    } catch {
        await fs.mkdir(UPLOADS_DIR, { recursive: true });
    }
}

async function upload(buffer, { filename }) {
    await ensureDir();
    const filePath = path.join(UPLOADS_DIR, filename);
    await fs.writeFile(filePath, buffer);

    return {
        fileId: filename,
        publicUrl: `/uploads/${filename}`,
        thumbnailUrl: `/uploads/${filename}`
    };
}

async function remove(fileId) {
    if (!fileId) return;
    const filePath = path.join(UPLOADS_DIR, fileId);
    try {
        await fs.unlink(filePath);
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }
}

function isConfigured() {
    return true;
}

module.exports = {
    upload,
    remove,
    isConfigured,
    providerName: 'local',
    UPLOADS_DIR
};
