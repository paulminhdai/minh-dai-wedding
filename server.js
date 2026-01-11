// Load environment variables
require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { DatabaseUtils } = require('./database/supabase-config');

// Import middleware
const { verifyToken, generateToken } = require('./middleware/auth');
const { 
    enforceHTTPS, 
    rsvpLimiter, 
    loginLimiter, 
    adminLimiter,
    searchLimiter,
    apiLimiter,
    requestLogger,
    securityHeaders,
    sanitizeInput
} = require('./middleware/security');
const { 
    validateRSVP, 
    validateLogin,
    validateGuestName,
    validateRSVPId,
    validateGuestSearch,
    validateGuestNameParam
} = require('./middleware/validation');

const app = express();
const PORT = process.env.PORT || 3000;

// Paths
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const RSVPS_FILE = path.join(DATA_DIR, 'rsvps.json');
const GUESTS_FILE = path.join(DATA_DIR, 'guests.txt');

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Trust proxy - Important for rate limiting and getting real IP addresses
app.set('trust proxy', 1);

// Helmet - Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com"],
            scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers (onclick, etc.)
            connectSrc: ["'self'", "https://www.google-analytics.com"],
            frameSrc: ["'self'", "https://www.google.com"],
            mediaSrc: ["'self'"]
        }
    },
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
    }
}));

// CORS - Allow only specific origins in production
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = process.env.ALLOWED_ORIGINS 
            ? process.env.ALLOWED_ORIGINS.split(',')
            : ['http://localhost:3000', 'http://127.0.0.1:3000'];
        
        // In production, strictly check origin
        if (process.env.NODE_ENV === 'production') {
            if (allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        } else {
            // In development, be more permissive
            callback(null, true);
        }
    },
    credentials: true, // Allow cookies
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// HTTPS enforcement (only in production)
app.use(enforceHTTPS);

// Body parsing
app.use(express.json({ limit: '1mb' })); // Reduced from 10mb for security
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Request logging for security monitoring
app.use(requestLogger);

// Input sanitization
app.use(sanitizeInput);

// Additional security headers
app.use(securityHeaders);

// Rate limiting for all API routes
app.use('/api/', apiLimiter);

// Disable caching in development
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Expires', '-1');
        res.set('Pragma', 'no-cache');
        next();
    });
}

// Serve static files
app.use(express.static(PUBLIC_DIR));

// Utility functions
const utils = {
    // Sanitize input to prevent XSS
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input
            .replace(/[<>\"']/g, '') // Remove potentially dangerous characters
            .trim()
            .substring(0, 500); // Limit length
    },

    // Validate phone number format
    isValidPhone(phone) {
        // Remove all non-digit characters for validation
        const digits = phone.replace(/\D/g, '');
        // Accept phone numbers with 10 or 11 digits (US format)
        return digits.length >= 10 && digits.length <= 11;
    },

    // Fuzzy match for guest name comparison
    fuzzyMatch(str1, str2) {
        const normalize = (str) => str.toLowerCase().replace(/[^\w\s]/g, '').trim();
        const normalized1 = normalize(str1);
        const normalized2 = normalize(str2);
        
        // Exact match
        if (normalized1 === normalized2) return true;
        
        // Check if one contains the other
        if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) return true;
        
        // Check individual words
        const words1 = normalized1.split(/\s+/);
        const words2 = normalized2.split(/\s+/);
        
        return words1.some(word1 => 
            words2.some(word2 => 
                word1.includes(word2) || word2.includes(word1)
            )
        );
    },

    // Ensure data directory exists
    async ensureDataDir() {
        try {
            await fs.access(DATA_DIR);
        } catch {
            await fs.mkdir(DATA_DIR, { recursive: true });
        }
    },

    // Load RSVPs from file
    async loadRSVPs() {
        try {
            const data = await fs.readFile(RSVPS_FILE, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return []; // File doesn't exist yet
            }
            throw error;
        }
    },

    // Save RSVPs to file
    async saveRSVPs(rsvps) {
        await this.ensureDataDir();
        await fs.writeFile(RSVPS_FILE, JSON.stringify(rsvps, null, 2), 'utf8');
    },

    // Load guest list from file
    async loadGuestList() {
        try {
            const data = await fs.readFile(GUESTS_FILE, 'utf8');
            return data
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0 && !line.startsWith('#')); // Filter out comments
        } catch (error) {
            if (error.code === 'ENOENT') {
                return []; // File doesn't exist, no guest restrictions
            }
            throw error;
        }
    },

    // Save guest list to file
    async saveGuestList(guests) {
        await this.ensureDataDir();
        const header = `# Guest List for Wedding Website
# One name per line - case insensitive fuzzy matching is used
# If this file doesn't exist, anyone can RSVP

`;
        const content = header + guests.join('\n');
        await fs.writeFile(GUESTS_FILE, content, 'utf8');
    },

    // Check if guest name is in the allowed list
    async isGuestAllowed(guestName, guestCode = '') {
        const guestList = await this.loadGuestList();
        
        // If no guest list exists, allow anyone
        if (guestList.length === 0) return true;
        
        // If guest code is provided and matches a pattern, allow
        // TODO: Implement guest code validation logic if needed
        
        // Check if name matches any in the guest list
        return guestList.some(allowedGuest => this.fuzzyMatch(guestName, allowedGuest));
    }
};

// ============================================
// ROUTES
// ============================================

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Serve admin page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});

// Serve find your table page
app.get('/findyourtable', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'findyourtable.html'));
});

// ============================================
// AUTHENTICATION ROUTES
// ============================================

// Admin login endpoint
app.post('/api/auth/login', loginLimiter, validateLogin, async (req, res) => {
    try {
        const { password } = req.body;
        const adminPassword = process.env.ADMIN_PASSWORD;
        
        if (!adminPassword) {
            console.error('ADMIN_PASSWORD not configured');
            return res.status(500).json({ 
                error: 'Server configuration error' 
            });
        }
        
        // Verify password
        if (password !== adminPassword) {
            await DatabaseUtils.logAdminAction(
                'login_failed',
                'Failed login attempt',
                req.ip || req.connection.remoteAddress || 'unknown'
            );
            return res.status(401).json({ 
                error: 'Invalid password' 
            });
        }
        
        // Generate JWT token
        const token = generateToken({ admin: true });
        
        // Set HTTP-only cookie (more secure than localStorage)
        res.cookie('admin_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // HTTPS only in production
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
        
        // Log successful login
        await DatabaseUtils.logAdminAction(
            'login_success',
            'Admin logged in successfully',
            req.ip || req.connection.remoteAddress || 'unknown'
        );
        
        res.json({ 
            success: true,
            message: 'Login successful',
            token // Also return token for Bearer auth if needed
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            error: 'Login failed' 
        });
    }
});

// Admin logout endpoint
app.post('/api/auth/logout', verifyToken, async (req, res) => {
    try {
        // Clear cookie
        res.clearCookie('admin_token');
        
        await DatabaseUtils.logAdminAction(
            'logout',
            'Admin logged out',
            req.ip || req.connection.remoteAddress || 'unknown'
        );
        
        res.json({ 
            success: true,
            message: 'Logged out successfully' 
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ 
            error: 'Logout failed' 
        });
    }
});

// Verify token endpoint (for frontend to check if logged in)
app.get('/api/auth/verify', verifyToken, (req, res) => {
    res.json({ 
        success: true,
        authenticated: true,
        user: req.user 
    });
});

// ============================================
// PUBLIC ROUTES
// ============================================

// RSVP endpoint (with validation)
app.post('/api/rsvp', rsvpLimiter, validateRSVP, async (req, res) => {
    try {
        console.log('📝 RSVP request received:', req.body);
        
        // Extract and sanitize data
        const {
            guestCode = '',
            names,
            phone,
            attending,
            guests,
            dietary,
            message
        } = req.body;

        // Validate required fields
        if (!names || !phone || !attending) {
            await DatabaseUtils.logAdminAction(
                'rsvp_rejected',
                `RSVP rejected - Missing required fields: ${!names ? 'name' : ''} ${!phone ? 'phone' : ''} ${!attending ? 'attending' : ''}`,
                req.ip || req.connection.remoteAddress || 'unknown'
            );
            return res.status(400).json({
                errorCode: 'REQUIRED_FIELDS'
            });
        }

        // Validate guest count if attending
        if (attending === 'yes' && (!guests || guests < 1 || guests > 8)) {
            await DatabaseUtils.logAdminAction(
                'rsvp_rejected',
                `RSVP rejected - Invalid guest count: ${guests} (Name: ${names})`,
                req.ip || req.connection.remoteAddress || 'unknown'
            );
            return res.status(400).json({
                errorCode: 'INVALID_GUEST_COUNT'
            });
        }

        // Sanitize inputs
        const sanitizedData = {
            guestCode: utils.sanitizeInput(guestCode),
            names: utils.sanitizeInput(names),
            phone: utils.sanitizeInput(phone),
            attending: attending === 'yes' ? 'yes' : 'no',
            timestamp: new Date().toISOString(),
            ipAddress: req.ip || req.connection.remoteAddress || 'unknown'
        };

        // Add additional fields if attending
        if (attending === 'yes') {
            sanitizedData.guests = parseInt(guests) || 1;
            if (dietary) {
                sanitizedData.dietary = utils.sanitizeInput(dietary);
            }
            if (message) {
                sanitizedData.message = utils.sanitizeInput(message);
            }
        }

        // Validate phone number format (basic validation)
        if (!utils.isValidPhone(sanitizedData.phone)) {
            await DatabaseUtils.logAdminAction(
                'rsvp_rejected',
                `RSVP rejected - Invalid phone number: ${sanitizedData.phone} (Name: ${sanitizedData.names})`,
                sanitizedData.ipAddress
            );
            return res.status(400).json({
                errorCode: 'INVALID_PHONE'
            });
        }

        // Check guest list validation
        if (process.env.ENABLE_GUEST_VALIDATION === 'true') {
            console.log('🔍 Checking guest list for:', sanitizedData.names);
            
            // For single short names, require more specific input
            const nameWords = sanitizedData.names.trim().split(/\s+/);
            if (nameWords.length === 1 && nameWords[0].length < 6) {
                console.log('⚠️ Single short name provided:', sanitizedData.names);
                await DatabaseUtils.logAdminAction(
                    'rsvp_rejected',
                    `RSVP rejected - Single short name: ${sanitizedData.names}`,
                    sanitizedData.ipAddress
                );
                return res.status(400).json({
                    errorCode: 'SHORT_NAME'
                });
            }
            
            const isGuestInvited = await DatabaseUtils.checkGuestExists(sanitizedData.names);
            
            if (!isGuestInvited) {
                console.log('❌ Guest not found in guest list:', sanitizedData.names);
                await DatabaseUtils.logAdminAction(
                    'rsvp_rejected',
                    `RSVP rejected - Guest not found in list: ${sanitizedData.names}`,
                    sanitizedData.ipAddress
                );
                return res.status(403).json({
                    errorCode: 'NOT_IN_GUEST_LIST'
                });
            }
            
            console.log('✅ Guest found in guest list:', sanitizedData.names);
        }

        // Create RSVP in database (it handles duplicate checking internally)
        const newRSVP = await DatabaseUtils.createRSVP({
            names: sanitizedData.names,
            phone: sanitizedData.phone,
            attending: sanitizedData.attending,
            guests: sanitizedData.guests || 1,
            dietary: sanitizedData.dietary || null,
            message: sanitizedData.message || null,
            guestCode: sanitizedData.guestCode || null,
            ipAddress: sanitizedData.ipAddress
        });

        if (!newRSVP) {
            throw new Error('Failed to create RSVP in database');
        }

        // Log the RSVP (in production, use proper logging)
        console.log('New RSVP received:', {
            id: newRSVP.rsvp?.id,
            guest_name: sanitizedData.names,
            phone: sanitizedData.phone,
            attending: sanitizedData.attending,
            guests: sanitizedData.guests
        });

        // Send success response
        res.status(201).json({
            message: sanitizedData.attending === 'yes' 
                ? 'Thank you for your RSVP! We can\'t wait to celebrate with you!'
                : 'Thank you for letting us know. We\'ll miss you on our special day!',
            id: newRSVP.rsvp?.id || 'created'
        });

    } catch (error) {
        console.error('RSVP processing error:', error);
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
        
        // Log the error
        const errorMessage = error.message || 'Unknown error';
        const guestName = req.body?.names || 'Unknown';
        const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
        
        // Check for specific error types
        if (errorMessage.includes('already exists')) {
            await DatabaseUtils.logAdminAction(
                'rsvp_rejected',
                `RSVP rejected - Duplicate RSVP: ${guestName}`,
                ipAddress
            );
            res.status(409).json({
                errorCode: 'ALREADY_EXISTS'
            });
        } else if (errorMessage.includes('Multiple guests found')) {
            await DatabaseUtils.logAdminAction(
                'rsvp_rejected',
                `RSVP rejected - Multiple guests matched: ${guestName}`,
                ipAddress
            );
            res.status(400).json({
                errorCode: 'MULTIPLE_GUESTS'
            });
        } else {
            await DatabaseUtils.logAdminAction(
                'rsvp_error',
                `RSVP error - ${errorMessage} (Guest: ${guestName})`,
                ipAddress
            );
            res.status(500).json({
                errorCode: 'SERVER_ERROR',
                debug: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
});

// ============================================
// ADMIN ROUTES (Protected with JWT)
// ============================================

// Admin endpoint to view RSVPs (JWT protected)
app.get('/api/admin/rsvps', verifyToken, adminLimiter, async (req, res) => {
    try {
        // Get RSVPs from database (no password needed, JWT verified)
        const rsvps = await DatabaseUtils.getRSVPs(process.env.ADMIN_PASSWORD);
        
        // Include all relevant fields for admin view
        const adminRSVPs = rsvps.map(rsvp => ({
            id: rsvp.id,
            names: rsvp.guest_name,
            phone: rsvp.phone,
            attending: rsvp.status === 'attending' ? 'yes' : 'no',
            guests: rsvp.party_size,
            dietaryRestrictions: rsvp.dietary_restrictions,
            message: rsvp.special_requests,
            timestamp: rsvp.rsvp_date || rsvp.created_at
        }));

        res.json({
            total: adminRSVPs.length,
            attending: adminRSVPs.filter(r => r.attending === 'yes').length,
            notAttending: adminRSVPs.filter(r => r.attending === 'no').length,
            rsvps: adminRSVPs
        });

    } catch (error) {
        console.error('Admin endpoint error:', error);
        res.status(500).json({ 
            error: 'Server error',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Database error'
        });
    }
});

// Admin delete RSVP endpoint (JWT protected)
app.delete('/api/admin/rsvp/:id', verifyToken, adminLimiter, validateRSVPId, async (req, res) => {
    try {
        const rsvpId = req.params.id;

        // Delete RSVP from database (no password needed, JWT verified)
        const deletedRsvp = await DatabaseUtils.deleteRSVP(rsvpId, process.env.ADMIN_PASSWORD);
        
        if (!deletedRsvp) {
            return res.status(404).json({ error: 'RSVP not found' });
        }

        console.log(`Admin deleted RSVP: ${deletedRsvp.guest_name} (${deletedRsvp.id})`);

        res.json({
            success: true,
            message: 'RSVP deleted successfully',
            deletedRsvp: {
                id: deletedRsvp.id,
                names: deletedRsvp.guest_name
            }
        });

    } catch (error) {
        console.error('Admin delete error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin get guest list endpoint (JWT protected)
app.get('/api/admin/guests', verifyToken, adminLimiter, async (req, res) => {
    try {
        const guests = await DatabaseUtils.getGuestList(process.env.ADMIN_PASSWORD);

        res.json({
            success: true,
            guests: guests.map(guest => ({
                name: guest.name,
                side: guest.side || 'mutual'
            })),
            total: guests.length
        });

    } catch (error) {
        console.error('Admin guests endpoint error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin add guest endpoint (JWT protected)
app.post('/api/admin/guests', verifyToken, adminLimiter, validateGuestName, async (req, res) => {
    try {
        const { name, side = 'mutual' } = req.body;

        const sanitizedName = utils.sanitizeInput(name.trim());

        // Add the new guest to database (addGuest handles duplicate checking)
        const newGuest = await DatabaseUtils.addGuest({
            name: sanitizedName,
            side: side,
            is_invited: true
        }, process.env.ADMIN_PASSWORD);

        if (!newGuest) {
            throw new Error('Failed to create guest in database');
        }

        console.log(`Admin added guest: ${sanitizedName}`);

        // Get updated total count
        const allGuests = await DatabaseUtils.getGuestList(process.env.ADMIN_PASSWORD);

        res.json({
            success: true,
            message: 'Guest added successfully',
            guest: sanitizedName,
            total: allGuests.length
        });

    } catch (error) {
        console.error('Admin add guest error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin delete guest endpoint (JWT protected)
app.delete('/api/admin/guests/:name', verifyToken, adminLimiter, validateGuestNameParam, async (req, res) => {
    try {
        const guestName = decodeURIComponent(req.params.name);

        // Find guest in database
        const guests = await DatabaseUtils.findGuestByName(guestName);
        
        if (guests.length === 0) {
            return res.status(404).json({ error: 'Guest not found' });
        }

        // Delete the guest from database
        const deletedGuest = await DatabaseUtils.deleteGuest(guests[0].id, process.env.ADMIN_PASSWORD);
        
        if (!deletedGuest) {
            return res.status(500).json({ error: 'Failed to delete guest' });
        }

        console.log(`Admin deleted guest: ${deletedGuest.name}`);

        // Get updated total count
        const remainingGuests = await DatabaseUtils.getGuestList(process.env.ADMIN_PASSWORD);

        res.json({
            success: true,
            message: 'Guest deleted successfully',
            deletedGuest: deletedGuest.name,
            total: remainingGuests.length
        });

    } catch (error) {
        console.error('Admin delete guest error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin get logs endpoint (JWT protected)
app.get('/api/admin/logs', verifyToken, adminLimiter, async (req, res) => {
    try {
        // Get admin logs from database (last 50 entries)
        const { supabaseAdmin } = require('./database/supabase-config');
        const { data: logs, error } = await supabaseAdmin
            .from('admin_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error fetching admin logs:', error);
            return res.status(500).json({ error: 'Database error' });
        }

        res.json({
            success: true,
            logs: logs || [],
            total: logs?.length || 0
        });

    } catch (error) {
        console.error('Admin logs endpoint error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Guest search endpoint - returns possible matches for autocomplete (with rate limiting)
app.get('/api/guests/search', searchLimiter, validateGuestSearch, async (req, res) => {
    try {
        const searchTerm = req.query.q;
        
        if (!searchTerm || searchTerm.trim().length < 2) {
            return res.json({ suggestions: [] });
        }
        
        const sanitizedSearch = utils.sanitizeInput(searchTerm);
        
        // Search for matching guests
        const matches = await DatabaseUtils.searchGuests(sanitizedSearch);
        
        // Return only guest names (no personal info)
        const suggestions = matches.map(guest => ({
            name: guest.name,
            side: guest.side || 'mutual'
        }));
        
        res.json({ 
            suggestions,
            searchTerm: sanitizedSearch
        });
        
    } catch (error) {
        console.error('Guest search error:', error);
        res.status(500).json({ error: 'Search failed', suggestions: [] });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Environment check endpoint (admin only, JWT protected)
app.get('/api/admin/env-check', verifyToken, adminLimiter, async (req, res) => {
    try {
        // Check environment variables
        const envCheck = {
            adminPasswordSet: !!process.env.ADMIN_PASSWORD,
            jwtSecretSet: !!process.env.JWT_SECRET,
            supabaseUrlSet: !!process.env.SUPABASE_URL,
            supabaseAnonKeySet: !!process.env.SUPABASE_ANON_KEY,
            supabaseServiceKeySet: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            enableGuestValidation: process.env.ENABLE_GUEST_VALIDATION,
            nodeEnv: process.env.NODE_ENV || 'development',
            port: process.env.PORT || 3000
        };

        // Test database connection
        let dbStatus = 'unknown';
        let dbError = null;
        try {
            const dbConnected = await DatabaseUtils.init();
            dbStatus = dbConnected ? 'connected' : 'failed';
        } catch (error) {
            dbStatus = 'error';
            dbError = error.message;
        }

        res.json({
            environment: envCheck,
            database: {
                status: dbStatus,
                error: dbError
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Env check error:', error);
        res.status(500).json({ 
            error: 'Server error',
            message: error.message 
        });
    }
});

// 404 handler for SPA
app.get('*', (req, res) => {
    // Check if it's an API request
    if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API endpoint not found' });
    } else {
        // Serve the main page for client-side routing
        res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error'
    });
});

// Start server
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Wedding website server running on port ${PORT}`);
    console.log(`Visit: http://localhost:${PORT}`);
    console.log(`Network access: http://192.168.1.189:${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin`);
    console.log(`Admin panel (network): http://192.168.1.189:${PORT}/admin`);
    if (process.env.ADMIN_PASSWORD) {
        console.log(`Admin API: http://localhost:${PORT}/api/admin`);
        console.log(`Note: Use ADMIN_PASSWORD from your .env file`);
    } else {
        console.log(`⚠️  WARNING: ADMIN_PASSWORD not set in .env file!`);
        console.log(`Admin dashboard will not be accessible.`);
    }
    
    // Initialize database connection
    console.log('🔗 Initializing database connection...');
    const dbConnected = await DatabaseUtils.init();
    if (dbConnected) {
        console.log('✅ Database connected successfully - RSVPs will be saved to Supabase');
    } else {
        console.log('❌ Database connection failed - Check your .env configuration');
    }
    
    // Ensure data directory exists on startup (for legacy support)
    utils.ensureDataDir().catch(console.error);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully');
    process.exit(0);
});

module.exports = app;
