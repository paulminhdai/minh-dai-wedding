// Netlify function for admin guest management (view/add/delete guests)
exports.handler = async (event, context) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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
            // Return guest list
            // Note: In a real production system, you'd want to store guests in a database
            const mockGuests = [
                'John Smith',
                'Jane Smith',
                'Demo Guest (Netlify)'
            ];

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    guests: mockGuests,
                    total: mockGuests.length,
                    note: 'This is mock data. In production, implement proper database storage.'
                })
            };

        } else if (event.httpMethod === 'POST') {
            // Add new guest
            const data = JSON.parse(event.body || '{}');
            const guestName = data.name;

            if (!guestName || !guestName.trim()) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Guest name is required' })
                };
            }

            // In a real system, you'd add to your database here
            console.log(`Admin requested to add guest: ${guestName.trim()} at ${new Date().toISOString()}`);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: 'Guest addition simulated successfully',
                    guest: guestName.trim(),
                    note: 'In production, implement actual database storage. Check function logs for add requests.'
                })
            };

        } else if (event.httpMethod === 'DELETE') {
            // Handle guest deletion
            // Extract guest name from path
            const pathSegments = event.path.split('/');
            const guestName = decodeURIComponent(pathSegments[pathSegments.length - 1]);

            if (!guestName || guestName === 'admin-guests') {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Guest name is required' })
                };
            }

            // In a real system, you'd delete from your database here
            console.log(`Admin requested deletion of guest: ${guestName} at ${new Date().toISOString()}`);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: 'Guest deletion simulated successfully',
                    deletedGuest: guestName,
                    note: 'In production, implement actual database deletion. Check function logs for deletion requests.'
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
        console.error('Error in admin-guests function:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
