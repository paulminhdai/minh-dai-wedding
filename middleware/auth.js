// Authentication middleware for JWT token verification
const jwt = require('jsonwebtoken');

// Get JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '1h'; // Token expiration time

/**
 * Generate JWT token for admin authentication
 * @param {Object} payload - Data to encode in the token
 * @returns {String} JWT token
 */
function generateToken(payload = { admin: true }) {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'wedding-website'
    });
}

/**
 * Verify JWT token middleware
 * Checks for token in Authorization header or cookies
 */
function verifyToken(req, res, next) {
    try {
        // Check Authorization header first (Bearer token)
        let token = null;
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } 
        // Fallback to cookie
        else if (req.cookies && req.cookies.admin_token) {
            token = req.cookies.admin_token;
        }

        if (!token) {
            return res.status(401).json({ 
                error: 'Unauthorized',
                message: 'Authentication token required'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Attach decoded payload to request
        req.user = decoded;
        
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                error: 'Unauthorized',
                message: 'Invalid token'
            });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Unauthorized',
                message: 'Token expired'
            });
        } else {
            console.error('Token verification error:', error);
            return res.status(500).json({ 
                error: 'Internal server error'
            });
        }
    }
}

/**
 * Optional token verification - doesn't reject if no token
 * Used for endpoints that work with or without authentication
 */
function optionalToken(req, res, next) {
    try {
        let token = null;
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else if (req.cookies && req.cookies.admin_token) {
            token = req.cookies.admin_token;
        }

        if (token) {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
        }
        
        next();
    } catch (error) {
        // Continue even if token is invalid
        next();
    }
}

module.exports = {
    generateToken,
    verifyToken,
    optionalToken,
    JWT_SECRET,
    JWT_EXPIRES_IN
};
