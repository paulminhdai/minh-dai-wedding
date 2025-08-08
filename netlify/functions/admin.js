// Netlify function for admin operations (view/delete RSVPs)
exports.handler = async (event, context) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
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

        if (event.httpMethod === 'GET') {
            // Return RSVP data for viewing
            // Note: In a real production system, you'd want to store RSVPs in:
            // - Airtable, Google Sheets, Supabase, FaunaDB, etc.
            // For now, we'll return mock data since Netlify functions are stateless
            
            const mockRSVPs = [
                {
                    id: 'netlify-demo-1',
                    names: 'Demo User (Netlify)',
                    phone: '(555) 123-4567',
                    attending: 'yes',
                    guests: 2,
                    dietaryRestrictions: 'Vegetarian',
                    message: 'This is mock data for Netlify deployment',
                    timestamp: new Date().toISOString()
                }
            ];

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    total: mockRSVPs.length,
                    attending: mockRSVPs.filter(r => r.attending === 'yes').length,
                    notAttending: mockRSVPs.filter(r => r.attending === 'no').length,
                    rsvps: mockRSVPs,
                    note: 'This is mock data. In production, implement proper database storage.'
                })
            };

        } else if (event.httpMethod === 'DELETE') {
            // Handle RSVP deletion
            // Extract RSVP ID from path
            const pathSegments = event.path.split('/');
            const rsvpId = pathSegments[pathSegments.length - 1];

            if (!rsvpId || rsvpId === 'admin') {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'RSVP ID is required' })
                };
            }

            // In a real system, you'd delete from your database here
            // For demo purposes, we'll just return success
            console.log(`Admin requested deletion of RSVP: ${rsvpId}`);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: 'RSVP deletion requested (mock response)',
                    deletedId: rsvpId,
                    note: 'In production, implement actual database deletion'
                })
            };

        } else {
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
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
