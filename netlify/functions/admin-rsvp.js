// Admin RSVP management Netlify function
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

        // Delete RSVP
        const { error } = await supabaseAdmin
            .from('rsvps')
            .delete()
            .eq('id', rsvpId);
        
        if (error) throw error;

        // Log admin action
        await supabaseAdmin
            .from('admin_logs')
            .insert({
                action: 'delete_rsvp',
                details: `Deleted RSVP for ${rsvpId}`
            });

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