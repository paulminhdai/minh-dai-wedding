// Admin guests management Netlify function
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
            // Get guest list
            const { data: guests, error } = await supabaseAdmin
                .from('guests')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;

            // Log admin action
            await supabaseAdmin
                .from('admin_logs')
                .insert({
                    action: 'view_guests',
                    details: 'Admin viewed guest list'
                });

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

            // Insert guest
            const { data: newGuest, error } = await supabaseAdmin
                .from('guests')
                .insert({
                    name: name.trim(),
                    side: side || 'mutual'
                })
                .select()
                .single();
            
            if (error) throw error;

            // Log admin action
            await supabaseAdmin
                .from('admin_logs')
                .insert({
                    action: 'add_guest',
                    details: `Added guest: ${name}`
                });

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify({ 
                    success: true,
                    guest: newGuest
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

            // Delete guest
            const { error } = await supabaseAdmin
                .from('guests')
                .delete()
                .eq('name', guestName);
            
            if (error) throw error;

            // Log admin action
            await supabaseAdmin
                .from('admin_logs')
                .insert({
                    action: 'delete_guest',
                    details: `Deleted guest: ${guestName}`
                });

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