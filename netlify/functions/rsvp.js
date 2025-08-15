// RSVP submission Netlify function
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
};

// Guest matching functions
function normalizeGuessVariations(name) {
    const lowerName = name.toLowerCase().trim();
    const patterns = [
        /\s+/g,           // Remove spaces
        /[''`]/g,         // Remove apostrophes
        /\-/g,            // Remove hyphens
        /\./g,            // Remove periods
        /[àáảãạ]/g,       // Vietnamese 'a' variations
        /[èéẻẽẹ]/g,       // Vietnamese 'e' variations
        /[ìíỉĩị]/g,       // Vietnamese 'i' variations
        /[òóỏõọ]/g,       // Vietnamese 'o' variations
        /[ùúủũụ]/g,       // Vietnamese 'u' variations
        /[ỳýỷỹỵ]/g,       // Vietnamese 'y' variations
        /đ/g,             // Vietnamese 'd'
    ];
    
    let normalized = lowerName;
    patterns.forEach(pattern => {
        normalized = normalized.replace(pattern, '');
    });
    
    return normalized;
}

function calculateMatchScore(guest, searchName) {
    const guestLower = guest.toLowerCase();
    const searchLower = searchName.toLowerCase();
    
    // Exact match
    if (guestLower === searchLower) return 100;
    
    // Normalized match
    const guestNorm = normalizeGuessVariations(guest);
    const searchNorm = normalizeGuessVariations(searchName);
    if (guestNorm === searchNorm) return 90;
    
    // Contains match
    if (guestLower.includes(searchLower) || searchLower.includes(guestLower)) return 70;
    if (guestNorm.includes(searchNorm) || searchNorm.includes(guestNorm)) return 65;
    
    // Word-based matching
    const guestWords = guestLower.split(/\s+/);
    const searchWords = searchLower.split(/\s+/);
    
    let wordMatches = 0;
    searchWords.forEach(searchWord => {
        if (guestWords.some(guestWord => guestWord === searchWord)) {
            wordMatches++;
        }
    });
    
    if (wordMatches > 0) {
        return 50 + (wordMatches * 10);
    }
    
    // Fuzzy match using Levenshtein-like scoring
    const longer = guestNorm.length > searchNorm.length ? guestNorm : searchNorm;
    const shorter = guestNorm.length > searchNorm.length ? searchNorm : guestNorm;
    
    if (longer.includes(shorter)) return 40;
    
    return 0;
}

exports.handler = async (event, context) => {
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const body = JSON.parse(event.body);
        const { names, phone, attending, guests = 1, message = '' } = body;

        // Validate required fields
        if (!names || !phone || !attending) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Names, phone number, and attendance status are required.' })
            };
        }

        // Validate guest count
        if (guests < 1 || guests > 8) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Please specify the number of guests (1-8 people).' })
            };
        }

        // Check if guest validation is enabled
        const enableValidation = process.env.ENABLE_GUEST_VALIDATION === 'true';
        
        if (enableValidation) {
            // Check guest list
            const { data: guestList, error: guestError } = await supabaseAdmin
                .from('guests')
                .select('name');
            
            if (guestError) throw guestError;

            // Fuzzy match logic
            let bestMatch = null;
            let bestScore = 0;

            guestList.forEach(guest => {
                const score = calculateMatchScore(guest.name, names);
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = guest.name;
                }
            });

            // Require at least 40% match
            if (bestScore < 40) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Sorry, we could not find your name on the guest list. Please check the spelling or contact the couple.',
                        searchedFor: names
                    })
                };
            }
        }

        // Create RSVP
        const { data: newRsvp, error: rsvpError } = await supabaseAdmin
            .from('rsvps')
            .insert({
                guest_name: names.trim(),
                phone: phone.trim(),
                attending: attending === 'yes' ? 'yes' : 'no',
                guests: attending === 'yes' ? guests : 0,
                message: message.trim()
            })
            .select()
            .single();
        
        if (rsvpError) throw rsvpError;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Thank you for your RSVP!',
                rsvp: newRsvp
            })
        };

    } catch (error) {
        console.error('Error processing RSVP:', error);
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