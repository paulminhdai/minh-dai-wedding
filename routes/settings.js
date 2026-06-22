// Settings routes.
//
// Public:
//   GET   /api/settings         everyone needs to know if the popup is on +
//                               when the gallery reveals
//
// Admin (JWT):
//   GET   /api/admin/settings   full settings (incl. updated_at)
//   PATCH /api/admin/settings   update one or more fields

const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const settingsService = require('../lib/settingsService');
const photoService = require('../lib/photoService');
const { verifyToken } = require('../middleware/auth');
const { adminLimiter } = require('../middleware/security');
const { DatabaseUtils } = require('../database/supabase-config');

const settingsLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false
});

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
// PUBLIC: lightweight settings the home page needs.
// Cached server-side; we also let browsers cache for 30s.
// ============================================
router.get('/', settingsLimiter, async (req, res) => {
    try {
        const settings = await settingsService.getSettings();
        // RSVP_OPEN is an env-controlled toggle. Default = true (RSVPs open).
        // Set RSVP_OPEN=false to flip the home page into "find your table"
        // mode (hero CTA changes + RSVP form submit disabled).
        const rsvpOpen = process.env.RSVP_OPEN !== 'false';
        res.set('Cache-Control', 'public, max-age=30');
        res.json({
            cameraPopup: {
                enabled: settings.camera_popup_enabled,
                title: settings.camera_popup_title,
                body: settings.camera_popup_body,
                cta: settings.camera_popup_cta
            },
            camera: {
                // Active Kodak film emulation, or null if disabled. The
                // camera page uses this to mirror the look in the live
                // viewfinder via a CSS filter approximation.
                film: photoService.getActiveFilmName()
            },
            gallery: {
                revealAt: settings.gallery_reveal_at,
                revealed: Date.now() >= new Date(settings.gallery_reveal_at).getTime()
            },
            game: {
                questions: settings.game_questions || []
            },
            rsvp: {
                open: rsvpOpen
            }
        });
    } catch (e) {
        console.error('Public settings error:', e);
        res.status(500).json({ error: 'Failed to load settings' });
    }
});

// ============================================
// ADMIN: full settings + update
// ============================================
const adminRouter = express.Router();

adminRouter.get('/', verifyToken, adminLimiter, async (req, res) => {
    try {
        const settings = await settingsService.getSettings();
        res.json({ settings });
    } catch (e) {
        console.error('Admin get settings error:', e);
        res.status(500).json({ error: 'Failed to load settings' });
    }
});

adminRouter.patch('/',
    verifyToken,
    adminLimiter,
    [
        body('camera_popup_enabled').optional().isBoolean(),
        body('camera_popup_title').optional().isString().isLength({ max: 120 }),
        body('camera_popup_body').optional().isString().isLength({ max: 1000 }),
        body('camera_popup_cta').optional().isString().isLength({ max: 60 }),
        body('gallery_reveal_at').optional().isISO8601()
            .withMessage('gallery_reveal_at must be a valid ISO 8601 datetime'),
        body('game_results').optional().isObject(),
        body('game_questions').optional().isArray()
    ],
    handleValidation,
    async (req, res) => {
        try {
            const updated = await settingsService.updateSettings(req.body);

            // Build a short, human-readable diff for the audit log
            const changes = Object.keys(req.body).filter(k => k in updated).join(', ');
            await DatabaseUtils.logAdminAction(
                'settings_updated',
                `Settings updated: ${changes || '(no fields)'}`,
                req.ip
            );

            res.json({ success: true, settings: updated });
        } catch (e) {
            if (e.code === 'INVALID_DATE') {
                return res.status(400).json({ error: 'Invalid reveal date' });
            }
            if (e.code === 'NO_FIELDS') {
                return res.status(400).json({ error: 'No fields to update' });
            }
            // PostgREST returns PGRST205 when the table is missing from the
            // schema cache — typically because the migration hasn't been run.
            if (e.code === 'PGRST205' || /could not find the table/i.test(e.message || '')) {
                return res.status(503).json({
                    error: 'Settings table not found. Run database/migrations/006-wedding-settings.sql in the Supabase SQL editor and try again.'
                });
            }
            console.error('Admin patch settings error:', e);
            res.status(500).json({ error: 'Failed to update settings' });
        }
    }
);

module.exports = { publicRouter: router, adminRouter };
