// Netlify function to view all RSVP submissions (admin only)
exports.handler = async (event, context) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

    // Only allow GET requests
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
        const adminPassword = process.env.ADMIN_PASSWORD || '061722';
        
        if (!password || password !== adminPassword) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Unauthorized - Invalid password' })
            };
        }

        // Note: In the current Netlify setup, RSVPs are logged to function logs
        // For a production system, you'd want to store RSVPs in:
        // - Airtable
        // - Google Sheets
        // - Supabase
        // - FaunaDB
        // etc.

        const mockRSVPs = [
            {
                id: '1',
                names: 'Test User',
                phone: '(555) 123-4567',
                attending: 'yes',
                guests: 2,
                timestamp: new Date().toISOString(),
                note: 'This is mock data - check Netlify Function logs for actual RSVPs'
            }
        ];

        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Content-Type': 'text/html'
            },
            body: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RSVP Admin - Minh & Đại Wedding</title>
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background: #f8fafc;
            color: #334155;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2rem;
            font-weight: 600;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
        }
        .content {
            padding: 30px;
        }
        .warning {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
        }
        .warning h3 {
            margin: 0 0 10px 0;
            color: #92400e;
        }
        .warning p {
            margin: 0;
            color: #78350f;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: #f1f5f9;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            color: #2c3e50;
        }
        .stat-label {
            color: #64748b;
            font-size: 0.9rem;
        }
        .rsvp-list {
            margin-top: 30px;
        }
        .rsvp-item {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 15px;
            background: #f8fafc;
        }
        .rsvp-header {
            display: flex;
            justify-content: between;
            align-items: center;
            margin-bottom: 10px;
        }
        .rsvp-name {
            font-weight: 600;
            color: #1e293b;
        }
        .rsvp-status {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 500;
        }
        .status-yes {
            background: #dcfce7;
            color: #166534;
        }
        .status-no {
            background: #fee2e2;
            color: #991b1b;
        }
        .rsvp-details {
            color: #64748b;
            font-size: 0.9rem;
        }
        .instructions {
            background: #eff6ff;
            border: 1px solid #3b82f6;
            border-radius: 8px;
            padding: 20px;
            margin-top: 30px;
        }
        .instructions h3 {
            margin: 0 0 15px 0;
            color: #1d4ed8;
        }
        .instructions ol {
            margin: 0;
            padding-left: 20px;
        }
        .instructions li {
            margin-bottom: 8px;
            color: #1e40af;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>RSVP Admin Dashboard</h1>
            <p>Minh & Đại Wedding - June 26, 2026</p>
        </div>
        
        <div class="content">
            <div class="warning">
                <h3>⚠️ Important: Mock Data Displayed</h3>
                <p>This is currently showing sample data. Actual RSVP submissions are logged in Netlify Function logs. To view real RSVPs, check your Netlify dashboard → Functions → rsvp → Function log.</p>
            </div>

            <div class="stats">
                <div class="stat-card">
                    <div class="stat-number">${mockRSVPs.length}</div>
                    <div class="stat-label">Total RSVPs</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${mockRSVPs.filter(r => r.attending === 'yes').length}</div>
                    <div class="stat-label">Attending</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${mockRSVPs.filter(r => r.attending === 'no').length}</div>
                    <div class="stat-label">Not Attending</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${mockRSVPs.reduce((sum, r) => sum + (r.guests || 1), 0)}</div>
                    <div class="stat-label">Total Guests</div>
                </div>
            </div>

            <div class="rsvp-list">
                <h3>RSVP Responses</h3>
                ${mockRSVPs.map(rsvp => `
                    <div class="rsvp-item">
                        <div class="rsvp-header">
                            <span class="rsvp-name">${rsvp.names}</span>
                            <span class="rsvp-status status-${rsvp.attending}">${rsvp.attending === 'yes' ? 'Attending' : 'Not Attending'}</span>
                        </div>
                        <div class="rsvp-details">
                            📞 ${rsvp.phone} | 👥 ${rsvp.guests || 1} guests | 📅 ${new Date(rsvp.timestamp).toLocaleDateString()}
                            ${rsvp.note ? `<br>📝 ${rsvp.note}` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="instructions">
                <h3>🔧 To Set Up Real RSVP Storage:</h3>
                <ol>
                    <li><strong>Airtable</strong>: Create a base and modify the RSVP function to store data</li>
                    <li><strong>Google Sheets</strong>: Use Google Sheets API to append RSVP data</li>
                    <li><strong>Email Notifications</strong>: Use SendGrid to email you each RSVP</li>
                    <li><strong>Supabase</strong>: Set up a real-time database for RSVP storage</li>
                </ol>
                <p><strong>Current Location</strong>: Check Netlify dashboard → Functions → rsvp → Function log for actual submissions</p>
            </div>
        </div>
    </div>
</body>
</html>
            `
        };

    } catch (error) {
        console.error('Error in admin function:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
