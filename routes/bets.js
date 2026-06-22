// Routes for the "Place Your Bets" prediction game.
//
// Public:
//   POST   /api/bets                 submit predictions
//   GET    /api/bets/status          check if current device already bet
//
// Admin (JWT-protected):
//   GET    /api/admin/bets           list all bets
//   DELETE /api/admin/bets/:id       delete a bet

const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, param, validationResult } = require('express-validator');
const betsService = require('../lib/betsService');
const { verifyToken } = require('../middleware/auth');
const { adminLimiter } = require('../middleware/security');
const { DatabaseUtils } = require('../database/supabase-config');
const { v4: uuidv4 } = require('uuid');

const betsLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again in a moment.' }
});

// Re-use the same device cookie logic as photos.js for consistency.
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
// PUBLIC: check status
// ============================================
router.get('/status', betsLimiter, async (req, res) => {
    try {
        const deviceId = getOrIssueDeviceId(req, res);
        const bet = await betsService.getBetByDevice(deviceId);
        res.json({
            deviceId,
            hasBet: !!bet,
            bet: bet ? { guestName: bet.guest_name, createdAt: bet.created_at } : null
        });
    } catch (error) {
        console.error('Bet status error:', error);
        res.status(500).json({ error: 'Failed to check bet status' });
    }
});

// ============================================
// PUBLIC: place a bet
// ============================================
router.post('/',
    betsLimiter,
    [
        body('guest_name')
            .trim()
            .isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters')
            .matches(/^[^<>]+$/).withMessage('Name contains invalid characters'),
        body('predictions')
            .isObject().withMessage('Predictions must be an object')
    ],
    handleValidation,
    async (req, res) => {
        try {
            const deviceId = getOrIssueDeviceId(req, res);
            
            // Check if already bet
            const existing = await betsService.getBetByDevice(deviceId);
            if (existing) {
                return res.status(409).json({ error: 'You have already placed your bets!' });
            }

            const bet = await betsService.placeBet({
                deviceId,
                guestName: req.body.guest_name,
                predictions: req.body.predictions
            });

            res.status(201).json({
                success: true,
                bet: {
                    id: bet.id,
                    guestName: bet.guest_name,
                    createdAt: bet.created_at
                }
            });
        } catch (error) {
            if (error.message === 'ALREADY_BET') {
                return res.status(409).json({ error: 'You have already placed your bets!' });
            }
            console.error('Place bet error:', error);
            res.status(500).json({ error: 'Could not save your bets. Please try again.' });
        }
    }
);

// ============================================
// ADMIN: list and moderation
// ============================================
const adminRouter = express.Router();

adminRouter.get('/', verifyToken, adminLimiter, async (req, res) => {
    try {
        const bets = await betsService.adminListBets();
        res.json({ total: bets.length, bets });
    } catch (error) {
        if (error.code === 'PGRST205' || /could not find the table/i.test(error.message || '')) {
            return res.status(503).json({ error: 'Bets table not found. Run database/migrations/007-wedding-bets.sql.' });
        }
        console.error('Admin list bets error:', error);
        res.status(500).json({ error: 'Failed to load bets' });
    }
});

adminRouter.delete('/:id',
    verifyToken,
    adminLimiter,
    [param('id').isUUID().withMessage('Invalid bet id')],
    handleValidation,
    async (req, res) => {
        try {
            const deleted = await betsService.deleteBet(req.params.id);
            if (!deleted) return res.status(404).json({ error: 'Bet not found' });
            
            await DatabaseUtils.logAdminAction(
                'bet_deleted',
                `Deleted bet by ${deleted.guest_name}`,
                req.ip
            );
            res.json({ success: true });
        } catch (error) {
            console.error('Admin delete bet error:', error);
            res.status(500).json({ error: 'Failed to delete bet' });
        }
    }
);

module.exports = { publicRouter: router, adminRouter };
