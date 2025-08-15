// Admin dashboard Netlify function
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
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
            // Get RSVP list
            const { data: rsvps, error } = await supabaseAdmin
                .from('rsvps')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;

            // Log admin action
            await supabaseAdmin
                .from('admin_logs')
                .insert({
                    action: 'view_rsvps',
                    details: 'Admin viewed RSVP list'
                });

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    rsvps: rsvps || [],
                    count: rsvps?.length || 0
                })
            };
        } 
        
        else if (event.httpMethod === 'PUT') {
            // Update RSVP (for future use)
            const pathParts = event.path.split('/');
            const rsvpId = pathParts[pathParts.length - 1];
            
            if (!rsvpId) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'RSVP ID is required' })
                };
            }

            const body = JSON.parse(event.body);
            
            const { data: updatedRsvp, error } = await supabaseAdmin
                .from('rsvps')
                .update(body)
                .eq('id', rsvpId)
                .select()
                .single();
            
            if (error) throw error;

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    success: true,
                    rsvp: updatedRsvp
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