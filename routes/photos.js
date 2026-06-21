// Routes for the disposable camera feature.
//
// Public:
//   POST   /api/photos                 multipart upload (field: "photo")
//   GET    /api/photos                 list photos (gated by reveal date)
//   GET    /api/photos/roll-status     remaining shots for current device cookie
//
// Admin (JWT-protected, registered by server.js):
//   GET    /api/admin/photos           list all photos including hidden
//   GET    /api/admin/photographers    list photographers + counts
//   PATCH  /api/admin/photos/:id       hide / unhide
//   DELETE /api/admin/photos/:id       soft-delete + storage cleanup
//   POST   /api/admin/photographers/:id/block

const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const { body, param, validationResult } = require('express-validator');

const photoService = require('../lib/photoService');
const { verifyToken } = require('../middleware/auth');
const { adminLimiter } = require('../middleware/security');
const { DatabaseUtils } = require('../database/supabase-config');

// 15MB raw cap before compression. Modern phone HEICs/JPEGs sit at 3-5MB so
// this is generous without inviting abuse.
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
    fileFilter: (req, file, cb) => {
        if (!/^image\//.test(file.mimetype)) {
            return cb(new Error('Only image files are allowed'));
        }
        cb(null, true);
    }
});

// Throttle photo uploads. Generous enough that a guest taking quick reception
// shots isn't hindered, strict enough to block a bot dumping their full roll
// in seconds.
const uploadLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 12,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Slow down on the shutter, photographer! Try again in a moment.' }
});

const galleryLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false
});

// 1-year stable device cookie. Generated server-side on first /api/photos hit
// so that even if localStorage is cleared, the same browser keeps its roll.
const DEVICE_COOKIE = 'wedding_device_id';
const DEVICE_COOKIE_OPTS = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 365 * 24 * 60 * 60 * 1000,
    path: '/'
};

function getOrIssueDeviceId(req, res) {
    let deviceId = req.cookies?.[DEVICE_COOKIE];
    // Belt-and-suspenders: also accept a header from the camera client when
    // 3rd-party cookies are restricted by the browser.
    if (!deviceId && typeof req.body?.device_id === 'string') {
        deviceId = req.body.device_id;
    }
    if (!deviceId && typeof req.headers['x-device-id'] === 'string') {
        deviceId = req.headers['x-device-id'];
    }
    if (!deviceId || !/^[a-f0-9-]{8,64}$/i.test(deviceId)) {
        deviceId = uuidv4();
        res.cookie(DEVICE_COOKIE, deviceId, DEVICE_COOKIE_OPTS);
    }
    return deviceId;
}

function handleValidation(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array().map(e => ({ field: e.path, message: e.msg }))
        });
    }
    next();
}

const router = express.Router();

// ============================================
// PUBLIC: roll status (lightweight - no auth, no DB writes)
// ============================================
router.get('/roll-status', galleryLimiter, async (req, res) => {
    try {
        const deviceId = getOrIssueDeviceId(req, res);
        const [status, revealDate] = await Promise.all([
            photoService.getRollStatus(deviceId),
            photoService.getRevealDate()
        ]);
        res.json({
            deviceId,
            limit: status.limit,
            count: status.count,
            remaining: status.remaining,
            exists: status.exists,
            displayName: status.displayName || null,
            blocked: status.blocked || false,
            revealAt: revealDate.toISOString(),
            revealed: Date.now() >= revealDate.getTime()
        });
    } catch (error) {
        console.error('Roll status error:', error);
        res.status(500).json({ error: 'Failed to load roll status' });
    }
});

// ============================================
// PUBLIC: upload a photo
// ============================================
router.post('/',
    uploadLimiter,
    (req, res, next) => {
        upload.single('photo')(req, res, err => {
            if (!err) return next();
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ error: 'Photo too large (max 15MB)' });
            }
            return res.status(400).json({ error: err.message || 'Upload failed' });
        });
    },
    [
        body('display_name')
            .trim()
            .isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters')
            // Allow Vietnamese diacritics + apostrophes, but no angle brackets
            .matches(/^[^<>]+$/).withMessage('Name contains invalid characters'),
        body('caption')
            .optional({ checkFalsy: true })
            .trim()
            .isLength({ max: 280 }).withMessage('Caption must be under 280 characters')
    ],
    handleValidation,
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No photo provided' });
            }

            const deviceId = getOrIssueDeviceId(req, res);
            const ipAddress = req.ip || req.connection?.remoteAddress || null;
            const userAgent = (req.headers['user-agent'] || '').substring(0, 500);

            const result = await photoService.uploadPhoto({
                rawBuffer: req.file.buffer,
                mimeType: req.file.mimetype,
                deviceId,
                displayName: req.body.display_name,
                caption: req.body.caption,
                ipAddress,
                userAgent
            });

            await DatabaseUtils.logAdminAction(
                'photo_uploaded',
                `Photo uploaded by ${result.photographer.display_name} (${result.remaining} shots left)`,
                ipAddress
            );

            res.status(201).json({
                success: true,
                photo: {
                    id: result.photo.id,
                    publicUrl: result.photo.public_url,
                    thumbnailUrl: result.photo.thumbnail_url,
                    createdAt: result.photo.created_at
                },
                roll: {
                    limit: photoService.PHOTOS_PER_ROLL,
                    count: result.photographer.photo_count + 1,
                    remaining: result.remaining
                }
            });
        } catch (error) {
            const code = error.message;
            if (code === 'MISSING_DEVICE_ID') {
                return res.status(400).json({ error: 'Device identification missing. Please refresh and try again.' });
            }
            if (code === 'MISSING_NAME') {
                return res.status(400).json({ error: 'Please tell us your name first.' });
            }
            if (code === 'PHOTOGRAPHER_BLOCKED') {
                return res.status(403).json({ error: 'This device has been blocked by the couple.' });
            }
            if (code === 'ROLL_FULL') {
                return res.status(429).json({
                    error: "Your roll's full! You've used all your shots. Thank you for sharing your view!",
                    code: 'ROLL_FULL',
                    limit: error.limit,
                    count: error.photoCount
                });
            }
            if (code === 'INVALID_IMAGE') {
                return res.status(400).json({ error: 'That file doesn\'t look like a valid image.' });
            }
            console.error('Photo upload error:', error);
            res.status(500).json({ error: 'Could not save your photo. Please try again.' });
        }
    }
);

// ============================================
// PUBLIC: list photos (revealed only)
// ============================================
router.get('/', galleryLimiter, async (req, res) => {
    try {
        const result = await photoService.listPublicPhotos({ asAdmin: false });
        res.set('Cache-Control', 'public, max-age=30');
        res.json(result);
    } catch (error) {
        console.error('List photos error:', error);
        res.status(500).json({ error: 'Failed to load gallery' });
    }
});

// ============================================
// ADMIN: list photos (incl. hidden), photographers, moderation
// Mounted under /api/admin/* by server.js for path consistency.
// ============================================
const adminRouter = express.Router();

// Detect "missing table" errors from PostgREST so we can surface a clear
// "run the migration" message in the admin UI instead of a generic 500.
function isMissingTableError(err) {
    return err && (err.code === 'PGRST205' || /could not find the table/i.test(err.message || ''));
}
const MIGRATION_HINT = 'Photos table not found. Run database/migrations/005-disposable-camera.sql in the Supabase SQL editor.';

adminRouter.get('/photos', verifyToken, adminLimiter, async (req, res) => {
    try {
        const [photos, revealDate] = await Promise.all([
            photoService.adminListPhotos({ limit: 1000 }),
            photoService.getRevealDate()
        ]);
        res.json({
            total: photos.length,
            revealed: Date.now() >= revealDate.getTime(),
            revealAt: revealDate.toISOString(),
            photos
        });
    } catch (error) {
        if (isMissingTableError(error)) {
            return res.status(503).json({ error: MIGRATION_HINT });
        }
        console.error('Admin list photos error:', error);
        res.status(500).json({ error: 'Failed to load photos' });
    }
});

adminRouter.get('/photographers', verifyToken, adminLimiter, async (req, res) => {
    try {
        const photographers = await photoService.adminListPhotographers();
        res.json({ total: photographers.length, photographers });
    } catch (error) {
        if (isMissingTableError(error)) {
            return res.status(503).json({ error: MIGRATION_HINT });
        }
        console.error('Admin photographers error:', error);
        res.status(500).json({ error: 'Failed to load photographers' });
    }
});

adminRouter.patch('/photos/:id',
    verifyToken,
    adminLimiter,
    [
        param('id').isUUID().withMessage('Invalid photo id'),
        body('hidden').isBoolean().withMessage('hidden must be boolean'),
        body('reason').optional().isString().isLength({ max: 280 })
    ],
    handleValidation,
    async (req, res) => {
        try {
            const updated = await photoService.setHidden(req.params.id, req.body.hidden, req.body.reason);
            await DatabaseUtils.logAdminAction(
                req.body.hidden ? 'photo_hidden' : 'photo_unhidden',
                `Photo ${req.params.id} (${updated.photographer_name})`,
                req.ip
            );
            res.json({ success: true, photo: updated });
        } catch (error) {
            console.error('Admin patch photo error:', error);
            res.status(500).json({ error: 'Failed to update photo' });
        }
    }
);

adminRouter.delete('/photos/:id',
    verifyToken,
    adminLimiter,
    [param('id').isUUID().withMessage('Invalid photo id')],
    handleValidation,
    async (req, res) => {
        try {
            const deleted = await photoService.deletePhoto(req.params.id);
            if (!deleted) return res.status(404).json({ error: 'Photo not found' });
            await DatabaseUtils.logAdminAction(
                'photo_deleted',
                `Deleted photo by ${deleted.photographer_name}`,
                req.ip
            );
            res.json({ success: true });
        } catch (error) {
            console.error('Admin delete photo error:', error);
            res.status(500).json({ error: 'Failed to delete photo' });
        }
    }
);

adminRouter.post('/photographers/:id/block',
    verifyToken,
    adminLimiter,
    [
        param('id').isUUID(),
        body('reason').optional().isString().isLength({ max: 280 })
    ],
    handleValidation,
    async (req, res) => {
        try {
            const blocked = await photoService.blockPhotographer(req.params.id, req.body.reason);
            await DatabaseUtils.logAdminAction(
                'photographer_blocked',
                `Blocked ${blocked.display_name} (${blocked.device_id})`,
                req.ip
            );
            res.json({ success: true, photographer: blocked });
        } catch (error) {
            console.error('Block photographer error:', error);
            res.status(500).json({ error: 'Failed to block photographer' });
        }
    }
);

module.exports = { publicRouter: router, adminRouter };
