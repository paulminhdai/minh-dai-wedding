// Enhanced Admin Netlify function using Supabase
// Provides comprehensive admin dashboard functionality

const { DatabaseUtils } = require('../../database/supabase-config');

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, PUT, OPTIONS',
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
        // Get admin password from query parameters or headers
        const password = event.queryStringParameters?.password || 
                        event.headers?.authorization?.replace('Bearer ', '');

        if (!password) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({
                    error: 'Authentication required',
                    message: 'Admin password is required'
                })
            };
        }

        // Initialize database connection
        const dbConnected = await DatabaseUtils.init();
        if (!dbConnected) {
            throw new Error('Database connection failed');
        }

        // Get client IP for logging
        const clientIP = event.headers['x-forwarded-for'] || 
                        event.headers['x-real-ip'] || 
                        event.requestContext?.identity?.sourceIp || 
                        'unknown';

        // Route based on HTTP method and path
        const path = event.path || '';
        const method = event.httpMethod;

        // GET /admin - Get RSVPs and dashboard data
        if (method === 'GET' && (path.endsWith('/admin') || path.endsWith('/admin-enhanced'))) {
            try {
                const [rsvps, stats, eventAttendance] = await Promise.all([
                    DatabaseUtils.getRSVPs(password),
                    DatabaseUtils.getRSVPStats(),
                    DatabaseUtils.getEventAttendance()
                ]);

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        timestamp: new Date().toISOString(),
                        summary: {
                            total: stats.total_rsvps || 0,
                            attending: stats.attending || 0,
                            notAttending: stats.not_attending || 0,
                            maybe: stats.maybe || 0,
                            totalGuests: stats.total_guests || 0,
                            lastRsvp: stats.last_rsvp
                        },
                        rsvps: rsvps,
                        eventAttendance: eventAttendance,
                        dataSource: 'Supabase Database'
                    })
                };
            } catch (error) {
                if (error.message === 'Unauthorized') {
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({
                            error: 'Unauthorized',
                            message: 'Invalid admin password'
                        })
                    };
                }
                throw error;
            }
        }

        // GET /admin/guests - Get guest list
        if (method === 'GET' && path.includes('/guests')) {
            try {
                const guests = await DatabaseUtils.getGuestList(password);
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        guests: guests,
                        total: guests.length
                    })
                };
            } catch (error) {
                if (error.message === 'Unauthorized') {
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({
                            error: 'Unauthorized',
                            message: 'Invalid admin password'
                        })
                    };
                }
                throw error;
            }
        }

        // POST /admin/guests - Add new guest
        if (method === 'POST' && path.includes('/guests')) {
            try {
                const requestData = JSON.parse(event.body);
                const { name, email, phone, guestCode } = requestData;

                if (!name || !name.trim()) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({
                            error: 'Invalid data',
                            message: 'Guest name is required'
                        })
                    };
                }

                const guestData = {
                    name: DatabaseUtils.sanitizeInput(name.trim()),
                    email: email ? DatabaseUtils.sanitizeInput(email.trim()) : null,
                    phone: phone ? DatabaseUtils.sanitizeInput(phone.trim()) : null,
                    guestCode: guestCode ? DatabaseUtils.sanitizeInput(guestCode.trim()) : null
                };

                // Validate email if provided
                if (guestData.email && !DatabaseUtils.isValidEmail(guestData.email)) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({
                            error: 'Invalid email',
                            message: 'Please provide a valid email address'
                        })
                    };
                }

                // Validate phone if provided
                if (guestData.phone && !DatabaseUtils.isValidPhone(guestData.phone)) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({
                            error: 'Invalid phone',
                            message: 'Please provide a valid phone number'
                        })
                    };
                }

                const newGuest = await DatabaseUtils.addGuest(guestData, password);

                return {
                    statusCode: 201,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        message: 'Guest added successfully',
                        guest: newGuest
                    })
                };

            } catch (error) {
                if (error.message === 'Unauthorized') {
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({
                            error: 'Unauthorized',
                            message: 'Invalid admin password'
                        })
                    };
                }

                if (error.message.includes('duplicate') || error.message.includes('unique')) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({
                            error: 'Duplicate guest',
                            message: 'A guest with this information already exists'
                        })
                    };
                }

                throw error;
            }
        }

        // DELETE /admin/rsvp/:id - Delete RSVP
        if (method === 'DELETE' && path.includes('/rsvp/')) {
            try {
                const pathSegments = path.split('/');
                const rsvpId = pathSegments[pathSegments.length - 1];

                if (!rsvpId || rsvpId === 'admin-enhanced') {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({
                            error: 'Invalid request',
                            message: 'RSVP ID is required'
                        })
                    };
                }

                await DatabaseUtils.deleteRSVP(rsvpId, password);

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        message: 'RSVP deleted successfully',
                        deletedId: rsvpId
                    })
                };

            } catch (error) {
                if (error.message === 'Unauthorized') {
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({
                            error: 'Unauthorized',
                            message: 'Invalid admin password'
                        })
                    };
                }

                if (error.message.includes('not found')) {
                    return {
                        statusCode: 404,
                        headers,
                        body: JSON.stringify({
                            error: 'RSVP not found',
                            message: 'The specified RSVP could not be found'
                        })
                    };
                }

                throw error;
            }
        }

        // DELETE /admin/guest/:id - Delete guest
        if (method === 'DELETE' && path.includes('/guest/')) {
            try {
                const pathSegments = path.split('/');
                const guestId = pathSegments[pathSegments.length - 1];

                if (!guestId) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({
                            error: 'Invalid request',
                            message: 'Guest ID is required'
                        })
                    };
                }

                await DatabaseUtils.deleteGuest(guestId, password);

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        message: 'Guest deleted successfully',
                        deletedId: guestId
                    })
                };

            } catch (error) {
                if (error.message === 'Unauthorized') {
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({
                            error: 'Unauthorized',
                            message: 'Invalid admin password'
                        })
                    };
                }

                if (error.message.includes('not found')) {
                    return {
                        statusCode: 404,
                        headers,
                        body: JSON.stringify({
                            error: 'Guest not found',
                            message: 'The specified guest could not be found'
                        })
                    };
                }

                throw error;
            }
        }

        // GET /admin/export - Export all data
        if (method === 'GET' && path.includes('/export')) {
            try {
                const [rsvps, guests, stats, eventAttendance] = await Promise.all([
                    DatabaseUtils.getRSVPs(password),
                    DatabaseUtils.getGuestList(password),
                    DatabaseUtils.getRSVPStats(),
                    DatabaseUtils.getEventAttendance()
                ]);

                // Log export action
                await DatabaseUtils.logAdminAction('export_data', 'Admin exported all data', clientIP);

                return {
                    statusCode: 200,
                    headers: {
                        ...headers,
                        'Content-Disposition': `attachment; filename="wedding-data-${new Date().toISOString().split('T')[0]}.json"`
                    },
                    body: JSON.stringify({
                        exportDate: new Date().toISOString(),
                        summary: stats,
                        rsvps: rsvps,
                        guests: guests,
                        eventAttendance: eventAttendance
                    }, null, 2)
                };

            } catch (error) {
                if (error.message === 'Unauthorized') {
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({
                            error: 'Unauthorized',
                            message: 'Invalid admin password'
                        })
                    };
                }
                throw error;
            }
        }

        // Default: Method/path not found
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({
                error: 'Not found',
                message: 'The requested admin endpoint was not found',
                availableEndpoints: [
                    'GET /admin - View dashboard',
                    'GET /admin/guests - View guest list',
                    'POST /admin/guests - Add guest',
                    'DELETE /admin/rsvp/:id - Delete RSVP',
                    'DELETE /admin/guest/:id - Delete guest',
                    'GET /admin/export - Export data'
                ]
            })
        };

    } catch (error) {
        console.error('❌ Admin function error:', error);

        // Handle specific errors
        if (error.message === 'Database connection failed') {
            return {
                statusCode: 503,
                headers,
                body: JSON.stringify({
                    error: 'Service unavailable',
                    message: 'Database is temporarily unavailable. Please try again later.'
                })
            };
        }

        // Generic error response
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                message: 'An unexpected error occurred. Please try again later.',
                timestamp: new Date().toISOString()
            })
        };
    }
};
