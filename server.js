// Load environment variables
require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const rateLimit = require('express-rate-limit');
const { DatabaseUtils } = require('./database/supabase-config');

const app = express();
const PORT = process.env.PORT || 3000;

// Paths
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const RSVPS_FILE = path.join(DATA_DIR, 'rsvps.json');
const GUESTS_FILE = path.join(DATA_DIR, 'guests.txt');

// Middleware
app.use(express.json({ limit: '10mb' }));

// Disable caching in development
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Expires', '-1');
        res.set('Pragma', 'no-cache');
        next();
    });
}

app.use(express.static(PUBLIC_DIR));

// Rate limiting for RSVP endpoint
const rsvpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
        error: 'Too many RSVP attempts. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

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

// Routes

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Serve admin page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});

// RSVP endpoint
app.post('/api/rsvp', rsvpLimiter, async (req, res) => {
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
                error: 'Names, phone number, and attendance status are required.'
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
                error: 'Please specify the number of guests (1-8 people).'
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
                error: 'Please provide a valid phone number.'
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
                    error: 'Please enter your full name as it appears on the invitation. Single first names may match multiple guests.'
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
                    error: 'We couldn\'t find your name on our guest list. Please enter your full name as shown on your invitation, or contact us directly.'
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
                error: 'An RSVP already exists for this guest. Please contact us if you need to update your response.'
            });
        } else if (errorMessage.includes('Multiple guests found')) {
            await DatabaseUtils.logAdminAction(
                'rsvp_rejected',
                `RSVP rejected - Multiple guests matched: ${guestName}`,
                ipAddress
            );
            res.status(400).json({
                error: errorMessage
            });
        } else {
            await DatabaseUtils.logAdminAction(
                'rsvp_error',
                `RSVP error - ${errorMessage} (Guest: ${guestName})`,
                ipAddress
            );
            res.status(500).json({
                error: 'Something went wrong processing your RSVP. Please try again later.',
                debug: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
});

// Admin endpoint to view RSVPs (basic protection)
app.get('/api/admin', async (req, res) => {
    try {
        // Simple password protection (in production, use proper authentication)
        const password = req.query.password;
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (password !== adminPassword) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get RSVPs from database
        const rsvps = await DatabaseUtils.getRSVPs(password);
        
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
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin delete RSVP endpoint
app.delete('/api/admin/rsvp/:id', async (req, res) => {
    try {
        // Simple password protection (in production, use proper authentication)
        const password = req.query.password;
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (password !== adminPassword) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const rsvpId = req.params.id;
        if (!rsvpId) {
            return res.status(400).json({ error: 'RSVP ID is required' });
        }

        // Delete RSVP from database
        const deletedRsvp = await DatabaseUtils.deleteRSVP(rsvpId, password);
        
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

// Admin get guest list endpoint
app.get('/api/admin/guests', async (req, res) => {
    try {
        // Simple password protection (in production, use proper authentication)
        const password = req.query.password;
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (password !== adminPassword) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const guests = await DatabaseUtils.getGuestList(password);

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

// Admin add guest endpoint
app.post('/api/admin/guests', async (req, res) => {
    try {
        // Simple password protection (in production, use proper authentication)
        const password = req.query.password;
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (password !== adminPassword) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { name, side = 'mutual' } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Guest name is required' });
        }

        const sanitizedName = utils.sanitizeInput(name.trim());

        // Add the new guest to database (addGuest handles duplicate checking)
        const newGuest = await DatabaseUtils.addGuest({
            name: sanitizedName,
            side: side,
            is_invited: true
        }, password);

        if (!newGuest) {
            throw new Error('Failed to create guest in database');
        }

        console.log(`Admin added guest: ${sanitizedName}`);

        // Get updated total count
        const allGuests = await DatabaseUtils.getGuestList(password);

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

// Admin delete guest endpoint
app.delete('/api/admin/guests/:name', async (req, res) => {
    try {
        // Simple password protection (in production, use proper authentication)
        const password = req.query.password;
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (password !== adminPassword) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const guestName = decodeURIComponent(req.params.name);
        if (!guestName) {
            return res.status(400).json({ error: 'Guest name is required' });
        }

        // Find guest in database
        const guests = await DatabaseUtils.findGuestByName(guestName);
        
        if (guests.length === 0) {
            return res.status(404).json({ error: 'Guest not found' });
        }

        // Delete the guest from database
        const deletedGuest = await DatabaseUtils.deleteGuest(guests[0].id, password);
        
        if (!deletedGuest) {
            return res.status(500).json({ error: 'Failed to delete guest' });
        }

        console.log(`Admin deleted guest: ${deletedGuest.name}`);

        // Get updated total count
        const remainingGuests = await DatabaseUtils.getGuestList(password);

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

// Admin get logs endpoint
app.get('/api/admin/logs', async (req, res) => {
    try {
        // Simple password protection (in production, use proper authentication)
        const password = req.query.password;
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (password !== adminPassword) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

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

// Guest search endpoint - returns possible matches for autocomplete
app.get('/api/guests/search', async (req, res) => {
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
