// Admin dashboard Netlify function
const { DatabaseUtils } = require('../../database/supabase-config');

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
    'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers };
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

        if (event.httpMethod === 'GET') {
            // Get RSVPs from database
            const rsvps = await DatabaseUtils.getRSVPs(password);
            
            // Transform to match frontend expectations
            const adminRSVPs = rsvps.map(rsvp => ({
                id: rsvp.id,
                names: rsvp.guest_name,
                phone: rsvp.phone,
                attending: rsvp.status === 'attending' ? 'yes' : 'no',
                guests: rsvp.party_size,
                dietaryRestrictions: rsvp.dietary_restrictions,
                message: rsvp.message,
                timestamp: rsvp.rsvp_date || rsvp.created_at
            }));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    total: adminRSVPs.length,
                    attending: adminRSVPs.filter(r => r.attending === 'yes').length,
                    notAttending: adminRSVPs.filter(r => r.attending === 'no').length,
                    rsvps: adminRSVPs
                })
            };
        } 
        
        else if (event.httpMethod === 'DELETE') {
            // Handle RSVP deletion
            const pathSegments = event.path.split('/');
            const rsvpId = pathSegments[pathSegments.length - 1];

            if (!rsvpId || rsvpId === 'admin') {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'RSVP ID is required' })
                };
            }

            // Delete from database
            await DatabaseUtils.deleteRSVP(rsvpId, password);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: 'RSVP deleted successfully'
                })
            };
        } 
        
        else {
            return {
                statusCode: 405,
                headers,
                body: JSON.stringify({ error: 'Method not allowed' })
            };
        }

    } catch (error) {
        console.error('Error in admin function:', error);
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