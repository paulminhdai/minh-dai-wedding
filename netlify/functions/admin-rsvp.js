// Netlify function to handle admin RSVP deletion
exports.handler = async (event, context) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
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

    // Only allow DELETE requests
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
        const adminPassword = process.env.ADMIN_PASSWORD || '061722';
        
        if (!password || password !== adminPassword) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Unauthorized - Invalid password' })
            };
        }

        // Extract RSVP ID from path
        const pathSegments = event.path.split('/');
        const rsvpId = pathSegments[pathSegments.length - 1];

        if (!rsvpId || rsvpId === 'admin-rsvp') {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'RSVP ID is required' })
            };
        }

        // Log the deletion attempt
        console.log(`Admin requested deletion of RSVP: ${rsvpId} at ${new Date().toISOString()}`);

        // In a real production system, you would:
        // 1. Connect to your database (Airtable, Supabase, etc.)
        // 2. Delete the RSVP record
        // 3. Return the actual result
        
        // For now, we'll simulate a successful deletion
        // Since Netlify functions are stateless, we can't actually delete from a local file
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'RSVP deletion simulated successfully',
                deletedId: rsvpId,
                note: 'In production, implement actual database deletion. Check function logs for deletion requests.'
            })
        };

    } catch (error) {
        console.error('Error in admin-rsvp delete function:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
