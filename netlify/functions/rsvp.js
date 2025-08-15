// RSVP submission Netlify function
const { DatabaseUtils } = require('../../database/supabase-config');

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
};

// Utility functions
const utils = {
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input
            .replace(/[<>\"']/g, '')
            .trim()
            .substring(0, 500);
    },

    isValidPhone(phone) {
        const digits = phone.replace(/\D/g, '');
        return digits.length >= 10 && digits.length <= 11;
    }
};

exports.handler = async (event, context) => {
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const body = JSON.parse(event.body);
        const { names, phone, attending, guests = 1, message = '', dietary = '' } = body;

        // Validate required fields
        if (!names || !phone || !attending) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Names, phone number, and attendance status are required.' })
            };
        }

        // Validate guest count
        if (attending === 'yes' && (!guests || guests < 1 || guests > 8)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Please specify the number of guests (1-8 people).' })
            };
        }

        // Sanitize inputs
        const sanitizedData = {
            names: utils.sanitizeInput(names),
            phone: utils.sanitizeInput(phone),
            attending: attending === 'yes' ? 'yes' : 'no',
            guests: attending === 'yes' ? parseInt(guests) : 0,
            dietary: dietary ? utils.sanitizeInput(dietary) : null,
            message: message ? utils.sanitizeInput(message) : null,
            timestamp: new Date().toISOString()
        };

        // Validate phone number
        if (!utils.isValidPhone(sanitizedData.phone)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Please provide a valid phone number.' })
            };
        }

        // Check if guest validation is enabled
        const enableValidation = process.env.ENABLE_GUEST_VALIDATION === 'true';
        
        if (enableValidation) {
            const isOnGuestList = await DatabaseUtils.checkGuestExists(sanitizedData.names);
            if (!isOnGuestList) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Sorry, we could not find your name on the guest list. Please check the spelling or contact the couple.' 
                    })
                };
            }
        }

        // Create RSVP in database
        const newRSVP = await DatabaseUtils.createRSVP({
            names: sanitizedData.names,
            phone: sanitizedData.phone,
            attending: sanitizedData.attending,
            guests: sanitizedData.guests || 1,
            dietary: sanitizedData.dietary || null,
            message: sanitizedData.message || null
        });

        console.log('New RSVP received:', {
            id: newRSVP.rsvp?.id,
            guest_name: sanitizedData.names,
            phone: sanitizedData.phone,
            attending: sanitizedData.attending,
            guests: sanitizedData.guests
        });

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                message: sanitizedData.attending === 'yes' 
                    ? 'Thank you for your RSVP! We can\'t wait to celebrate with you!'
                    : 'Thank you for letting us know. We\'ll miss you on our special day!',
                success: true,
                attending: sanitizedData.attending,
                guestCount: sanitizedData.guests
            })
        };

    } catch (error) {
        console.error('Error processing RSVP:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Unable to process RSVP. Please try again later.',
                details: error.message 
            })
        };
    }
};