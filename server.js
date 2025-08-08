const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Paths
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const RSVPS_FILE = path.join(DATA_DIR, 'rsvps.json');
const GUESTS_FILE = path.join(DATA_DIR, 'guests.txt');

// Middleware
app.use(express.json({ limit: '10mb' }));
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
            return res.status(400).json({
                error: 'Names, phone number, and attendance status are required.'
            });
        }

        // Validate guest count if attending
        if (attending === 'yes' && (!guests || guests < 1 || guests > 8)) {
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
            return res.status(400).json({
                error: 'Please provide a valid phone number.'
            });
        }

        // Check guest list if applicable
        const isAllowed = await utils.isGuestAllowed(sanitizedData.names, sanitizedData.guestCode);
        if (!isAllowed) {
            return res.status(403).json({
                error: 'We couldn\'t find your name on our guest list. Please check your spelling or contact us directly.'
            });
        }

        // Load existing RSVPs
        const existingRSVPs = await utils.loadRSVPs();

        // Check for duplicates (same name and phone combination)
        const isDuplicate = existingRSVPs.some(rsvp => 
            rsvp.names.toLowerCase() === sanitizedData.names.toLowerCase() &&
            rsvp.phone === sanitizedData.phone
        );

        if (isDuplicate) {
            return res.status(409).json({
                error: 'An RSVP with this name and phone number already exists. Please contact us if you need to make changes.'
            });
        }

        // Add new RSVP
        const newRSVP = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            ...sanitizedData
        };

        existingRSVPs.push(newRSVP);

        // Save to file
        await utils.saveRSVPs(existingRSVPs);

        // Log the RSVP (in production, use proper logging)
        console.log('New RSVP received:', {
            id: newRSVP.id,
            names: newRSVP.names,
            phone: newRSVP.phone,
            attending: newRSVP.attending,
            timestamp: newRSVP.timestamp
        });

        // Send success response
        res.status(201).json({
            message: sanitizedData.attending === 'yes' 
                ? 'Thank you for your RSVP! We can\'t wait to celebrate with you!'
                : 'Thank you for letting us know. We\'ll miss you on our special day!',
            id: newRSVP.id
        });

    } catch (error) {
        console.error('RSVP processing error:', error);
        res.status(500).json({
            error: 'Something went wrong processing your RSVP. Please try again later.'
        });
    }
});

// Admin endpoint to view RSVPs (basic protection)
app.get('/api/admin', async (req, res) => {
    try {
        // Simple password protection (in production, use proper authentication)
        const password = req.query.password;
        if (password !== '061722') {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const rsvps = await utils.loadRSVPs();
        
        // Include all relevant fields for admin view
        const adminRSVPs = rsvps.map(rsvp => ({
            id: rsvp.id,
            names: rsvp.names,
            phone: rsvp.phone,
            attending: rsvp.attending,
            guests: rsvp.guests,
            dietaryRestrictions: rsvp.dietaryRestrictions,
            message: rsvp.message,
            timestamp: rsvp.timestamp
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
        if (password !== '061722') {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const rsvpId = req.params.id;
        if (!rsvpId) {
            return res.status(400).json({ error: 'RSVP ID is required' });
        }

        const rsvps = await utils.loadRSVPs();
        const rsvpIndex = rsvps.findIndex(rsvp => rsvp.id === rsvpId);
        
        if (rsvpIndex === -1) {
            return res.status(404).json({ error: 'RSVP not found' });
        }

        // Remove the RSVP
        const deletedRsvp = rsvps.splice(rsvpIndex, 1)[0];
        await utils.saveRSVPs(rsvps);

        console.log(`Admin deleted RSVP: ${deletedRsvp.names} (${deletedRsvp.id})`);

        res.json({
            success: true,
            message: 'RSVP deleted successfully',
            deletedRsvp: {
                id: deletedRsvp.id,
                names: deletedRsvp.names
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
        if (password !== '061722') {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const guests = await utils.loadGuestList();

        res.json({
            success: true,
            guests: guests,
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
        if (password !== '061722') {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Guest name is required' });
        }

        const guests = await utils.loadGuestList();
        const sanitizedName = utils.sanitizeInput(name.trim());

        // Check if guest already exists (case insensitive)
        const existingGuest = guests.find(guest => 
            guest.toLowerCase() === sanitizedName.toLowerCase()
        );

        if (existingGuest) {
            return res.status(400).json({ error: 'Guest already exists' });
        }

        // Add the new guest
        guests.push(sanitizedName);
        await utils.saveGuestList(guests);

        console.log(`Admin added guest: ${sanitizedName}`);

        res.json({
            success: true,
            message: 'Guest added successfully',
            guest: sanitizedName,
            total: guests.length
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
        if (password !== '061722') {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const guestName = decodeURIComponent(req.params.name);
        if (!guestName) {
            return res.status(400).json({ error: 'Guest name is required' });
        }

        const guests = await utils.loadGuestList();
        const guestIndex = guests.findIndex(guest => 
            guest.toLowerCase() === guestName.toLowerCase()
        );
        
        if (guestIndex === -1) {
            return res.status(404).json({ error: 'Guest not found' });
        }

        // Remove the guest
        const deletedGuest = guests.splice(guestIndex, 1)[0];
        await utils.saveGuestList(guests);

        console.log(`Admin deleted guest: ${deletedGuest}`);

        res.json({
            success: true,
            message: 'Guest deleted successfully',
            deletedGuest: deletedGuest,
            total: guests.length
        });

    } catch (error) {
        console.error('Admin delete guest error:', error);
        res.status(500).json({ error: 'Server error' });
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
app.listen(PORT, () => {
    console.log(`Wedding website server running on port ${PORT}`);
    console.log(`Visit: http://localhost:${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin`);
    console.log(`Admin API: http://localhost:${PORT}/api/admin?password=061722`);
    
    // Ensure data directory exists on startup
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
