const fs = require('fs').promises;
const path = require('path');

// Utility functions (copied from server.js)
const utils = {
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input
            .replace(/[<>\"']/g, '')
            .trim()
            .substring(0, 500);
    },

    isValidPhone(phone) {
        const digits = phone.replace(/\D/g, '');
        return digits.length >= 10 && digits.length <= 11;
    },

    fuzzyMatch(str1, str2) {
        const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
        const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        if (s1 === s2) return true;
        if (s1.includes(s2) || s2.includes(s1)) return true;
        
        const distance = this.levenshteinDistance(s1, s2);
        const maxLength = Math.max(s1.length, s2.length);
        return distance / maxLength < 0.3;
    },

    levenshteinDistance(str1, str2) {
        const matrix = [];
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[str2.length][str1.length];
    }
};

// Netlify serverless function handler
exports.handler = async (event, context) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const data = JSON.parse(event.body);
        
        // Validate required fields
        if (!data.names || !data.phone || !data.attending) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required fields' })
            };
        }

        // Sanitize inputs
        const sanitizedData = {
            names: utils.sanitizeInput(data.names),
            phone: utils.sanitizeInput(data.phone),
            attending: data.attending,
            guests: data.guests ? parseInt(data.guests) : undefined,
            dietary: data.dietary ? utils.sanitizeInput(data.dietary) : undefined,
            message: data.message ? utils.sanitizeInput(data.message) : undefined,
            timestamp: new Date().toISOString()
        };

        // Validate phone number
        if (!utils.isValidPhone(sanitizedData.phone)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid phone number format' })
            };
        }

        // For Netlify deployment, you could:
        // 1. Store in a service like Airtable, Google Sheets, or Supabase
        // 2. Send email notification using a service like SendGrid
        // 3. Store in Netlify's built-in form handling
        
        // For now, we'll just log it (in production, implement proper storage)
        console.log('RSVP Received:', sanitizedData);

        // TODO: Implement actual storage/notification system
        // Example: await sendToAirtable(sanitizedData);
        // Example: await sendEmailNotification(sanitizedData);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true, 
                message: 'RSVP received successfully!' 
            })
        };

    } catch (error) {
        console.error('Error processing RSVP:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
