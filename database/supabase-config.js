// Supabase configuration for wedding website
// This file contains the database connection and helper functions

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create Supabase clients
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Database utility functions
const DatabaseUtils = {
    // Initialize connection and verify database
    async init() {
        try {
            const { data, error } = await supabase
                .from('wedding_events')
                .select('count', { count: 'exact', head: true });
            
            if (error) throw error;
            console.log('✅ Supabase connection established');
            return true;
        } catch (error) {
            console.error('❌ Supabase connection failed:', error.message);
            return false;
        }
    },

    // Guest management functions
    async findGuestByName(guestName) {
        try {
            const { data, error } = await supabaseAdmin
                .from('guests')
                .select('*')
                .or(`name.ilike.%${guestName}%,name.ilike.%${guestName.split(' ').join('%')}%`)
                .limit(5);
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error finding guest:', error);
            return [];
        }
    },

    async createGuest(guestData) {
        try {
            const { data, error } = await supabaseAdmin
                .from('guests')
                .insert([{
                    name: guestData.name,
                    email: guestData.email,
                    phone: guestData.phone,
                    guest_code: guestData.guestCode,
                    is_invited: true,
                    side: guestData.side || 'mutual'
                }])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating guest:', error);
            throw error;
        }
    },

    async checkGuestExists(guestName) {
        try {
            const { data, error } = await supabase
                .rpc('check_guest_exists', { guest_name: guestName });
            
            if (error) throw error;
            return data || false;
        } catch (error) {
            console.error('Error checking guest existence:', error);
            return false; // Allow if check fails
        }
    },

    // RSVP management functions
    async createRSVP(rsvpData) {
        try {
            // Start a transaction-like operation
            let guest = null;
            
            // Find or create guest
            const existingGuests = await this.findGuestByName(rsvpData.names);
            if (existingGuests.length > 0) {
                guest = existingGuests[0];
                // Update guest info if provided
                if (rsvpData.email || rsvpData.phone) {
                    const { data: updatedGuest, error: updateError } = await supabaseAdmin
                        .from('guests')
                        .update({
                            email: rsvpData.email || guest.email,
                            phone: rsvpData.phone || guest.phone
                        })
                        .eq('id', guest.id)
                        .select()
                        .single();
                    
                    if (updateError) throw updateError;
                    guest = updatedGuest;
                }
            } else {
                // Create new guest
                guest = await this.createGuest({
                    name: rsvpData.names,
                    email: rsvpData.email,
                    phone: rsvpData.phone,
                    guestCode: rsvpData.guestCode
                });
            }

            // Check for duplicate RSVP
            const { data: existingRSVP } = await supabaseAdmin
                .from('rsvps')
                .select('id')
                .eq('guest_id', guest.id)
                .single();

            if (existingRSVP) {
                throw new Error('An RSVP already exists for this guest');
            }

            // Create RSVP
            const { data: rsvp, error: rsvpError } = await supabaseAdmin
                .from('rsvps')
                .insert([{
                    guest_id: guest.id,
                    status: rsvpData.attending === 'yes' ? 'attending' : 'not_attending',
                    party_size: rsvpData.guests || 1,
                    special_requests: rsvpData.message,
                    ip_address: rsvpData.ipAddress
                }])
                .select()
                .single();

            if (rsvpError) throw rsvpError;

            // Create party members if attending
            if (rsvpData.attending === 'yes' && rsvpData.partyMembers) {
                const partyMembersData = rsvpData.partyMembers.map(member => ({
                    rsvp_id: rsvp.id,
                    name: member.name,
                    age_group: member.ageGroup || 'adult',
                    meal_preference: member.mealPreference,
                    dietary_restrictions: member.dietaryRestrictions
                }));

                const { error: partyError } = await supabase
                    .from('rsvp_guests')
                    .insert(partyMembersData);

                if (partyError) throw partyError;
            }

            // Create event attendance records (default to all events if attending)
            if (rsvpData.attending === 'yes') {
                const { data: events } = await supabase
                    .from('wedding_events')
                    .select('id')
                    .eq('is_active', true);

                if (events && events.length > 0) {
                    const attendanceData = events.map(event => ({
                        rsvp_id: rsvp.id,
                        event_id: event.id,
                        attending: true
                    }));

                    const { error: attendanceError } = await supabase
                        .from('event_attendance')
                        .insert(attendanceData);

                    if (attendanceError) console.error('Error creating attendance records:', attendanceError);
                }
            }

            return {
                rsvp,
                guest,
                success: true
            };

        } catch (error) {
            console.error('Error creating RSVP:', error);
            throw error;
        }
    },

    async getRSVPs(adminPassword) {
        try {
            // Verify admin password
            const expectedPassword = process.env.ADMIN_PASSWORD;
            if (!expectedPassword) {
                throw new Error('ADMIN_PASSWORD not configured');
            }
            if (adminPassword !== expectedPassword) {
                throw new Error('Unauthorized');
            }

            // Log admin access
            await this.logAdminAction('view_rsvps', 'Admin viewed RSVP list');

            const { data, error } = await supabase
                .from('rsvp_summary')
                .select('*')
                .order('rsvp_date', { ascending: false });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Error getting RSVPs:', error);
            throw error;
        }
    },

    async deleteRSVP(rsvpId, adminPassword) {
        try {
            // Verify admin password
            const expectedPassword = process.env.ADMIN_PASSWORD;
            if (!expectedPassword) {
                throw new Error('ADMIN_PASSWORD not configured');
            }
            if (adminPassword !== expectedPassword) {
                throw new Error('Unauthorized');
            }

            // Get RSVP details for logging
            const { data: rsvpDetails } = await supabase
                .from('rsvp_summary')
                .select('guest_name')
                .eq('id', rsvpId)
                .single();

            // Delete RSVP (cascades to related records)
            const { error } = await supabaseAdmin
                .from('rsvps')
                .delete()
                .eq('id', rsvpId);

            if (error) throw error;

            // Log admin action
            await this.logAdminAction('delete_rsvp', `Deleted RSVP for ${rsvpDetails?.guest_name || rsvpId}`);

            return { success: true };
        } catch (error) {
            console.error('Error deleting RSVP:', error);
            throw error;
        }
    },

    // Analytics and reporting
    async getRSVPStats() {
        try {
            const { data, error } = await supabase
                .rpc('get_rsvp_stats');

            if (error) throw error;
            return data || {};
        } catch (error) {
            console.error('Error getting RSVP stats:', error);
            return {};
        }
    },

    async getEventAttendance() {
        try {
            const { data, error } = await supabase
                .from('event_attendance_summary')
                .select('*');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting event attendance:', error);
            return [];
        }
    },

    // Admin logging
    async logAdminAction(action, details, ipAddress = null) {
        try {
            await supabase
                .from('admin_logs')
                .insert([{
                    action,
                    details,
                    ip_address: ipAddress
                }]);
        } catch (error) {
            console.error('Error logging admin action:', error);
        }
    },

    // Guest list management
    async getGuestList(adminPassword) {
        try {
            const expectedPassword = process.env.ADMIN_PASSWORD;
            if (!expectedPassword) {
                throw new Error('ADMIN_PASSWORD not configured');
            }
            if (adminPassword !== expectedPassword) {
                throw new Error('Unauthorized');
            }

            const { data, error } = await supabaseAdmin
                .from('guests')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            await this.logAdminAction('view_rsvps', 'Admin viewed guest list');
            return data || [];
        } catch (error) {
            console.error('Error getting guest list:', error);
            throw error;
        }
    },

    async addGuest(guestData, adminPassword) {
        try {
            const expectedPassword = process.env.ADMIN_PASSWORD;
            if (!expectedPassword) {
                throw new Error('ADMIN_PASSWORD not configured');
            }
            if (adminPassword !== expectedPassword) {
                throw new Error('Unauthorized');
            }

            const guest = await this.createGuest(guestData);
            await this.logAdminAction('add_guest', `Added guest: ${guestData.name}`);
            
            return guest;
        } catch (error) {
            console.error('Error adding guest:', error);
            throw error;
        }
    },

    async deleteGuest(guestId, adminPassword) {
        try {
            const expectedPassword = process.env.ADMIN_PASSWORD;
            if (!expectedPassword) {
                throw new Error('ADMIN_PASSWORD not configured');
            }
            if (adminPassword !== expectedPassword) {
                throw new Error('Unauthorized');
            }

            // Get guest details for logging
            const { data: guestDetails } = await supabaseAdmin
                .from('guests')
                .select('name')
                .eq('id', guestId)
                .single();

            // Delete guest (cascades to RSVPs)
            const { error } = await supabaseAdmin
                .from('guests')
                .delete()
                .eq('id', guestId);

            if (error) throw error;

            await this.logAdminAction('delete_rsvp', `Deleted guest: ${guestDetails?.name || guestId}`);
            return guestDetails;
        } catch (error) {
            console.error('Error deleting guest:', error);
            throw error;
        }
    },

    // Admin logging function
    async logAdminAction(action, details = null) {
        try {
            const { error } = await supabaseAdmin
                .from('admin_logs')
                .insert([{
                    action: action,
                    details: details,
                    ip_address: null, // Could be passed as parameter in future
                    user_agent: null  // Could be passed as parameter in future
                }]);

            if (error) {
                console.error('Failed to log admin action:', error);
            } else {
                console.log(`📝 Admin action logged: ${action} - ${details}`);
            }
        } catch (error) {
            console.error('Error logging admin action:', error);
        }
    },

    // Validation helpers
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

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
};

module.exports = {
    supabase,
    supabaseAdmin,
    DatabaseUtils
};
