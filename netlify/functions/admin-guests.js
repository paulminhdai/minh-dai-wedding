// Admin guests management Netlify function
const { DatabaseUtils } = require('../../database/supabase-config');

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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

        // Handle different HTTP methods
        if (event.httpMethod === 'GET') {
            // Get guest list from database
            const guests = await DatabaseUtils.getGuestList(password);
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    guests: guests || [],
                    count: guests?.length || 0
                })
            };
        } 
        
        else if (event.httpMethod === 'POST') {
            // Add a new guest
            const body = JSON.parse(event.body);
            const { name, side } = body;
            
            if (!name) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Guest name is required' })
                };
            }

            // Add guest using database utils
            await DatabaseUtils.addGuest({ name, side }, password);

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify({ 
                    success: true,
                    message: 'Guest added successfully'
                })
            };
        } 
        
        else if (event.httpMethod === 'DELETE') {
            // Delete a guest
            const pathParts = event.path.split('/');
            const guestName = decodeURIComponent(pathParts[pathParts.length - 1]);
            
            if (!guestName) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Guest name is required' })
                };
            }

            // Delete guest using database utils
            await DatabaseUtils.deleteGuest(guestName, password);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    success: true,
                    message: `Guest ${guestName} deleted successfully`
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
        console.error('Error in admin-guests function:', error);
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