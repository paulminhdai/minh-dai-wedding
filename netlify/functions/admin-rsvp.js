// Admin RSVP management Netlify function
const { DatabaseUtils } = require('../../database/supabase-config');

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers };
    }

    if (event.httpMethod !== 'DELETE') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Check for admin password
        const password = event.queryStringParameters?.password;
        const adminPassword = process.env.ADMIN_PASSWORD;
        
        if (!adminPassword) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Server configuration error: ADMIN_PASSWORD not set' })
            };
        }
        
        if (password !== adminPassword) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Unauthorized - Invalid password' })
            };
        }

        // Extract RSVP ID from path
        const pathParts = event.path.split('/');
        const rsvpId = pathParts[pathParts.length - 1];
        
        if (!rsvpId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'RSVP ID is required' })
            };
        }

        // Delete RSVP using database utils
        await DatabaseUtils.deleteRSVP(rsvpId, password);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true,
                message: `RSVP ${rsvpId} deleted successfully`
            })
        };

    } catch (error) {
        console.error('Error in admin-rsvp delete function:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                details: error.message 
            })
        };
    }
};