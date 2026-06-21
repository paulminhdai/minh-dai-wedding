#!/usr/bin/env node
//
// One-time setup: have the service account create + own the Drive folder
// that will hold guest photos. Sidesteps the "exceeded sharing quota" error
// you hit when sharing your personal Drive folder TO the service account.
//
// Usage:
//
//   # 1. Make sure GOOGLE_SERVICE_ACCOUNT_KEY is set in .env (raw JSON or base64)
//   # 2. Run:
//   node scripts/init-drive-folder.js
//
//   # Optional - share the new folder back to your personal Gmail so it
//   # shows up in your My Drive (the SA → user direction has different
//   # quota rules and usually works fine):
//   node scripts/init-drive-folder.js you@gmail.com
//
// Output: prints the folder ID. Paste it into .env as GOOGLE_DRIVE_FOLDER_ID.

require('dotenv').config();
const { google } = require('googleapis');

const RAW_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
const FOLDER_NAME = process.env.DRIVE_FOLDER_NAME || 'Wedding Disposable Camera';
const SHARE_WITH = (process.argv[2] || process.env.DRIVE_FOLDER_OWNER_EMAIL || '').trim();

function parseKey(raw) {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) return JSON.parse(trimmed);
    return JSON.parse(Buffer.from(trimmed, 'base64').toString('utf8'));
}

async function main() {
    if (!RAW_KEY) {
        console.error('❌ GOOGLE_SERVICE_ACCOUNT_KEY is not set in .env');
        console.error('   Set it to either the raw JSON of your service account key,');
        console.error('   or the base64-encoded version (preferred - survives env file roundtrips).');
        process.exit(1);
    }

    let credentials;
    try {
        credentials = parseKey(RAW_KEY);
    } catch (e) {
        console.error('❌ Could not parse GOOGLE_SERVICE_ACCOUNT_KEY:', e.message);
        console.error('   Expected raw JSON or base64-encoded JSON.');
        process.exit(1);
    }

    console.log(`🔑 Service account: ${credentials.client_email}`);

    // The init script needs the broader 'drive' scope to share the folder.
    // The runtime app (lib/storage/driveStorage.js) only uses 'drive.file'.
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive']
    });
    const drive = google.drive({ version: 'v3', auth });

    console.log(`📂 Creating folder "${FOLDER_NAME}"...`);
    let folder;
    try {
        folder = await drive.files.create({
            requestBody: {
                name: FOLDER_NAME,
                mimeType: 'application/vnd.google-apps.folder'
            },
            fields: 'id, name, webViewLink'
        });
    } catch (e) {
        console.error('❌ Could not create folder:', e.message);
        if (e.errors) console.error(JSON.stringify(e.errors, null, 2));
        process.exit(1);
    }

    const folderId = folder.data.id;
    const viewLink = folder.data.webViewLink;
    console.log(`✅ Folder created`);
    console.log(`   id:   ${folderId}`);
    console.log(`   view: ${viewLink}`);

    // Optional: share the folder back to a personal email so it shows up
    // in their My Drive. SA → user share is a different quota path and
    // usually doesn't trip the "exceeded sharing quota" filter.
    if (SHARE_WITH) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(SHARE_WITH)) {
            console.warn(`⚠️  "${SHARE_WITH}" doesn't look like an email; skipping share-back.`);
        } else {
            console.log(`👤 Sharing folder with ${SHARE_WITH} as Editor...`);
            try {
                await drive.permissions.create({
                    fileId: folderId,
                    requestBody: { role: 'writer', type: 'user', emailAddress: SHARE_WITH },
                    sendNotificationEmail: true,
                    fields: 'id'
                });
                console.log(`✅ Invitation sent. Check ${SHARE_WITH}'s inbox and accept it`);
                console.log('   so the folder shows up in your My Drive sidebar.');
            } catch (e) {
                console.warn(`⚠️  Could not share back: ${e.message}`);
                console.warn('   That\'s OK - the camera feature still works.');
                console.warn(`   You can browse photos directly via: ${viewLink}`);
            }
        }
    }

    console.log('\n────────────────────────────────────────────────────');
    console.log('🎉 Done! Add this single line to your .env file:\n');
    console.log(`   GOOGLE_DRIVE_FOLDER_ID=${folderId}\n`);
    console.log('────────────────────────────────────────────────────\n');

    console.log('💡 What just happened:');
    console.log('   • The service account created a folder it OWNS.');
    console.log('   • Guest photos uploaded by your wedding website will be');
    console.log('     stored in that folder, owned by the service account.');
    console.log('   • Each photo will be public-via-link so the gallery can');
    console.log('     render it (the folder itself stays private).');
    if (!SHARE_WITH) {
        console.log('\n📌 To make this folder visible in your My Drive, rerun:');
        console.log(`   node scripts/init-drive-folder.js your-email@gmail.com`);
    }
    console.log(`\n🔗 You can always browse the folder directly at:\n   ${viewLink}\n`);
}

main().catch(err => {
    console.error('\n❌ Setup failed:', err.message);
    if (err.errors) console.error(JSON.stringify(err.errors, null, 2));
    process.exit(1);
});
