// Security middleware configuration
const rateLimit = require('express-rate-limit');

/**
 * HTTPS enforcement middleware
 * Redirects HTTP requests to HTTPS in production
 */
function enforceHTTPS(req, res, next) {
    // Skip in development
    if (process.env.NODE_ENV !== 'production') {
        return next();
    }

    // Skip health check endpoint (Railway health checks use HTTP)
    if (req.path === '/api/health') {
        return next();
    }

    // Check if request is already HTTPS or if it's from a proxy
    const isSecure = req.secure || 
                     req.headers['x-forwarded-proto'] === 'https' ||
                     req.headers['x-forwarded-ssl'] === 'on';

    if (!isSecure) {
        // Redirect to HTTPS
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }

    next();
}

/**
 * Rate limiter for RSVP submissions
 * Prevents spam and abuse
 */
const rsvpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
        error: 'Too many RSVP attempts. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false
});

/**
 * Rate limiter for admin login attempts
 * Prevents brute force attacks
 */
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per windowMs
    message: {
        error: 'Too many login attempts. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true // Don't count successful logins
});

/**
 * Rate limiter for general admin operations
 * Skipped entirely for verified admins (verifyToken runs before this).
 */
const adminLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 30,
    message: {
        error: 'Too many requests. Please slow down.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => !!req.user // verified admin token → skip rate limit
});

/**
 * Rate limiter for guest search
 * Prevents enumeration attacks
 */
const searchLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20, // Limit each IP to 20 searches per minute
    message: {
        error: 'Too many search requests. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * General API rate limiter
 * Catch-all protection
 */
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // Limit each IP to 60 requests per minute
    message: {
        error: 'Too many requests. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Request logger middleware
 * Logs all requests for security monitoring
 */
function requestLogger(req, res, next) {
    const timestamp = new Date().toISOString();
    const ip = req.ip || req.connection.remoteAddress;
    const method = req.method;
    const path = req.path;
    
    // Don't log sensitive data
    const sanitizedPath = path.includes('password') ? 
        path.replace(/password=[^&]*/gi, 'password=***') : path;
    
    console.log(`[${timestamp}] ${method} ${sanitizedPath} - IP: ${ip}`);
    
    next();
}

/**
 * Security headers middleware
 * Additional security beyond Helmet
 */
function securityHeaders(req, res, next) {
    // Prevent caching of sensitive endpoints
    if (req.path.startsWith('/api/admin')) {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    }
    
    next();
}

/**
 * Input sanitization middleware
 * Cleans user input to prevent XSS and injection attacks
 */
function sanitizeInput(req, res, next) {
    // Sanitize body
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key]
                    .replace(/[<>]/g, '') // Remove angle brackets
                    .trim()
                    .substring(0, 5000); // Limit length
            }
        });
    }
    
    // Sanitize query params
    if (req.query) {
        Object.keys(req.query).forEach(key => {
            if (typeof req.query[key] === 'string') {
                req.query[key] = req.query[key]
                    .replace(/[<>]/g, '')
                    .trim()
                    .substring(0, 1000);
            }
        });
    }
    
    next();
}

module.exports = {
    enforceHTTPS,
    rsvpLimiter,
    loginLimiter,
    adminLimiter,
    searchLimiter,
    apiLimiter,
    requestLogger,
    securityHeaders,
    sanitizeInput
};
