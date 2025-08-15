// Admin logs Netlify function
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Only allow GET
    if (event.httpMethod !== 'GET') {
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
        
        if (!password || password !== adminPassword) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Unauthorized' })
            };
        }

        // Fetch admin logs
        const { data: logs, error, count } = await supabase
            .from('admin_logs')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                logs: logs || [],
                total: count || 0
            })
        };
    } catch (error) {
        console.error('Admin logs error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Failed to fetch admin logs',
                details: error.message 
            })
        };
    }
};
