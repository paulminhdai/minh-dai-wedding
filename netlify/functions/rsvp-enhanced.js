// Enhanced RSVP Netlify function using Supabase
// Replaces the original file-based RSVP system

const { DatabaseUtils } = require('../../database/supabase-config');

// Rate limiting store (in-memory for serverless)
const rateLimitStore = new Map();

// Rate limiting function
function checkRateLimit(ip, windowMs = 15 * 60 * 1000, maxRequests = 5) {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old entries
    for (const [key, timestamps] of rateLimitStore.entries()) {
        const filtered = timestamps.filter(time => time > windowStart);
        if (filtered.length === 0) {
            rateLimitStore.delete(key);
        } else {
            rateLimitStore.set(key, filtered);
        }
    }
    
    // Check current IP
    const ipRequests = rateLimitStore.get(ip) || [];
    const recentRequests = ipRequests.filter(time => time > windowStart);
    
    if (recentRequests.length >= maxRequests) {
        return false;
    }
    
    // Add current request
    recentRequests.push(now);
    rateLimitStore.set(ip, recentRequests);
    return true;
}

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ 
                error: 'Method not allowed',
                message: 'This endpoint only accepts POST requests'
            })
        };
    }

    try {
        // Rate limiting
        const clientIP = event.headers['x-forwarded-for'] || 
                        event.headers['x-real-ip'] || 
                        event.requestContext?.identity?.sourceIp || 
                        'unknown';
        
        if (!checkRateLimit(clientIP)) {
            return {
                statusCode: 429,
                headers,
                body: JSON.stringify({
                    error: 'Too many requests',
                    message: 'Please wait before submitting another RSVP. Limit: 5 requests per 15 minutes.'
                })
            };
        }

        // Parse request body
        let requestData;
        try {
            requestData = JSON.parse(event.body);
        } catch (parseError) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Invalid JSON',
                    message: 'Request body must be valid JSON'
                })
            };
        }

        // Validate required fields
        const { names, phone, attending, guests, dietary, message, email, guestCode, partyMembers } = requestData;

        if (!names || !phone || !attending) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Missing required fields',
                    message: 'Names, phone number, and attendance status are required.',
                    required: ['names', 'phone', 'attending']
                })
            };
        }

        // Validate attending value
        if (!['yes', 'no', 'maybe'].includes(attending)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Invalid attendance status',
                    message: 'Attendance must be "yes", "no", or "maybe"'
                })
            };
        }

        // Validate guest count if attending
        if (attending === 'yes' && (!guests || guests < 1 || guests > 10)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Invalid guest count',
                    message: 'Please specify the number of guests (1-10 people) when attending.'
                })
            };
        }

        // Sanitize inputs
        const sanitizedData = {
            names: DatabaseUtils.sanitizeInput(names),
            phone: DatabaseUtils.sanitizeInput(phone),
            email: email ? DatabaseUtils.sanitizeInput(email) : null,
            attending: attending,
            guests: attending === 'yes' ? parseInt(guests) || 1 : 0,
            dietary: dietary ? DatabaseUtils.sanitizeInput(dietary) : null,
            message: message ? DatabaseUtils.sanitizeInput(message) : null,
            guestCode: guestCode ? DatabaseUtils.sanitizeInput(guestCode) : null,
            ipAddress: clientIP,
            partyMembers: partyMembers || []
        };

        // Validate phone number
        if (!DatabaseUtils.isValidPhone(sanitizedData.phone)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Invalid phone number',
                    message: 'Please provide a valid phone number (10-11 digits)'
                })
            };
        }

        // Validate email if provided
        if (sanitizedData.email && !DatabaseUtils.isValidEmail(sanitizedData.email)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Invalid email address',
                    message: 'Please provide a valid email address'
                })
            };
        }

        // Initialize database connection
        const dbConnected = await DatabaseUtils.init();
        if (!dbConnected) {
            throw new Error('Database connection failed');
        }

        // Check guest list if guest validation is enabled
        if (process.env.ENABLE_GUEST_VALIDATION === 'true') {
            const isGuestAllowed = await DatabaseUtils.checkGuestExists(sanitizedData.names);
            if (!isGuestAllowed) {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({
                        error: 'Guest not found',
                        message: 'We couldn\'t find your name on our guest list. Please check your spelling or contact us directly.'
                    })
                };
            }
        }

        // Create RSVP in database
        const rsvpResult = await DatabaseUtils.createRSVP(sanitizedData);

        // Prepare response message
        let responseMessage;
        if (sanitizedData.attending === 'yes') {
            responseMessage = 'Thank you for your RSVP! We can\'t wait to celebrate with you! 🎉';
        } else if (sanitizedData.attending === 'no') {
            responseMessage = 'Thank you for letting us know. We\'ll miss you on our special day! 💙';
        } else {
            responseMessage = 'Thank you for your response. Please let us know your final decision when you can! 💛';
        }

        // Log successful RSVP
        console.log('✅ RSVP Created Successfully:', {
            rsvpId: rsvpResult.rsvp.id,
            guestName: rsvpResult.guest.name,
            status: rsvpResult.rsvp.status,
            partySize: rsvpResult.rsvp.party_size,
            timestamp: rsvpResult.rsvp.rsvp_date
        });

        // Return success response
        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                success: true,
                message: responseMessage,
                rsvp: {
                    id: rsvpResult.rsvp.id,
                    status: rsvpResult.rsvp.status,
                    partySize: rsvpResult.rsvp.party_size,
                    rsvpDate: rsvpResult.rsvp.rsvp_date
                },
                guest: {
                    name: rsvpResult.guest.name,
                    email: rsvpResult.guest.email
                }
            })
        };

    } catch (error) {
        console.error('❌ RSVP Error:', error);

        // Handle specific database errors
        if (error.message === 'An RSVP already exists for this guest') {
            return {
                statusCode: 409,
                headers,
                body: JSON.stringify({
                    error: 'Duplicate RSVP',
                    message: 'An RSVP with this name already exists. Please contact us if you need to make changes.'
                })
            };
        }

        if (error.message === 'Unauthorized') {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({
                    error: 'Unauthorized',
                    message: 'Invalid guest code or unauthorized access'
                })
            };
        }

        if (error.message === 'Database connection failed') {
            return {
                statusCode: 503,
                headers,
                body: JSON.stringify({
                    error: 'Service unavailable',
                    message: 'Database is temporarily unavailable. Please try again later.'
                })
            };
        }

        // Generic error response
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                message: 'Something went wrong processing your RSVP. Please try again later.',
                timestamp: new Date().toISOString()
            })
        };
    }
};
