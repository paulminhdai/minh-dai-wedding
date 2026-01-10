// Migration script to transfer data from JSON files to Supabase
// Run this script after setting up your Supabase database

const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: Missing Supabase configuration');
    console.log('Please set the following environment variables:');
    console.log('- SUPABASE_URL');
    console.log('- SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Paths to data files
const DATA_DIR = path.join(__dirname, '..', 'data');
const RSVPS_FILE = path.join(DATA_DIR, 'rsvps.json');
const GUESTS_FILE = path.join(DATA_DIR, 'guests.txt');

async function loadExistingData() {
    console.log('🔍 Loading existing data files...');
    
    const data = {
        rsvps: [],
        guests: []
    };

    try {
        // Load RSVPs
        const rsvpData = await fs.readFile(RSVPS_FILE, 'utf8');
        data.rsvps = JSON.parse(rsvpData);
        console.log(`✅ Found ${data.rsvps.length} RSVPs in JSON file`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('ℹ️  No existing RSVPs file found');
        } else {
            console.warn('⚠️  Error reading RSVPs file:', error.message);
        }
    }

    try {
        // Load guests
        const guestData = await fs.readFile(GUESTS_FILE, 'utf8');
        data.guests = guestData
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.startsWith('#'));
        console.log(`✅ Found ${data.guests.length} guests in text file`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('ℹ️  No existing guests file found');
        } else {
            console.warn('⚠️  Error reading guests file:', error.message);
        }
    }

    return data;
}

async function migrateGuests(guests) {
    if (guests.length === 0) {
        console.log('⏭️  No guests to migrate');
        return new Map();
    }

    console.log(`🚀 Migrating ${guests.length} guests...`);
    
    const guestMap = new Map(); // Map old name to new guest record
    const guestsToInsert = guests.map(name => ({
        name: name,
        is_invited: true,
        created_at: new Date().toISOString()
    }));

    try {
        const { data, error } = await supabase
            .from('guests')
            .insert(guestsToInsert)
            .select();

        if (error) throw error;

        // Create mapping for RSVP migration
        data.forEach(guest => {
            guestMap.set(guest.name, guest);
        });

        console.log(`✅ Successfully migrated ${data.length} guests`);
        return guestMap;
    } catch (error) {
        console.error('❌ Error migrating guests:', error.message);
        throw error;
    }
}

async function migrateRSVPs(rsvps, guestMap) {
    if (rsvps.length === 0) {
        console.log('⏭️  No RSVPs to migrate');
        return;
    }

    console.log(`🚀 Migrating ${rsvps.length} RSVPs...`);
    
    let successCount = 0;
    let errorCount = 0;

    for (const rsvp of rsvps) {
        try {
            // Find or create guest
            let guest = null;
            
            // Try to find existing guest
            const existingGuest = Array.from(guestMap.values()).find(g => 
                g.name.toLowerCase() === rsvp.names.toLowerCase()
            );

            if (existingGuest) {
                guest = existingGuest;
            } else {
                // Create new guest
                const { data: newGuest, error: guestError } = await supabase
                    .from('guests')
                    .insert([{
                        name: rsvp.names,
                        email: rsvp.email || null,
                        phone: rsvp.phone,
                        is_invited: true
                    }])
                    .select()
                    .single();

                if (guestError) throw guestError;
                guest = newGuest;
                guestMap.set(guest.name, guest);
            }

            // Convert old RSVP format to new format
            const status = rsvp.attending === 'yes' ? 'attending' : 
                         rsvp.attending === 'no' ? 'not_attending' : 'maybe';

            // Create RSVP record
            const { data: newRSVP, error: rsvpError } = await supabase
                .from('rsvps')
                .insert([{
                    guest_id: guest.id,
                    status: status,
                    party_size: rsvp.guests || 1,
                    dietary_restrictions: rsvp.dietary || rsvp.dietaryRestrictions,
                    special_requests: rsvp.message,
                    ip_address: rsvp.ipAddress,
                    rsvp_date: rsvp.timestamp || new Date().toISOString(),
                    created_at: rsvp.timestamp || new Date().toISOString()
                }])
                .select()
                .single();

            if (rsvpError) throw rsvpError;

            // If attending, create default event attendance
            if (status === 'attending') {
                const { data: events } = await supabase
                    .from('wedding_events')
                    .select('id');

                if (events && events.length > 0) {
                    const attendanceData = events.map(event => ({
                        rsvp_id: newRSVP.id,
                        event_id: event.id,
                        attending: true
                    }));

                    await supabase
                        .from('event_attendance')
                        .insert(attendanceData);
                }
            }

            successCount++;
            console.log(`✅ Migrated RSVP: ${rsvp.names} (${status})`);

        } catch (error) {
            errorCount++;
            console.error(`❌ Error migrating RSVP for ${rsvp.names}:`, error.message);
        }
    }

    console.log(`📊 Migration complete: ${successCount} successful, ${errorCount} errors`);
}

async function createBackup() {
    console.log('💾 Creating backup of original data...');
    
    const backupDir = path.join(__dirname, 'backup');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    try {
        await fs.mkdir(backupDir, { recursive: true });
        
        // Copy original files
        try {
            await fs.copyFile(RSVPS_FILE, path.join(backupDir, `rsvps-${timestamp}.json`));
            console.log('✅ Backed up RSVPs file');
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
        
        try {
            await fs.copyFile(GUESTS_FILE, path.join(backupDir, `guests-${timestamp}.txt`));
            console.log('✅ Backed up guests file');
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
        
    } catch (error) {
        console.warn('⚠️  Warning: Could not create backup:', error.message);
    }
}

async function verifyMigration() {
    console.log('🔍 Verifying migration...');
    
    try {
        const { data: guests, error: guestsError } = await supabase
            .from('guests')
            .select('count', { count: 'exact', head: true });
            
        if (guestsError) throw guestsError;
        
        const { data: rsvps, error: rsvpsError } = await supabase
            .from('rsvps')
            .select('count', { count: 'exact', head: true });
            
        if (rsvpsError) throw rsvpsError;
        
        console.log(`📊 Migration verification:`);
        console.log(`   - Guests in database: ${guests.count || 0}`);
        console.log(`   - RSVPs in database: ${rsvps.count || 0}`);
        
        // Get sample data
        const { data: sampleRSVPs } = await supabase
            .from('rsvp_summary')
            .select('*')
            .limit(3);
            
        if (sampleRSVPs && sampleRSVPs.length > 0) {
            console.log('✅ Sample migrated RSVPs:');
            sampleRSVPs.forEach(rsvp => {
                console.log(`   - ${rsvp.guest_name}: ${rsvp.status} (${rsvp.party_size} guests)`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error verifying migration:', error.message);
    }
}

async function main() {
    console.log('🚀 Starting data migration to Supabase...');
    console.log('================================================');
    
    try {
        // Test database connection
        console.log('🔗 Testing Supabase connection...');
        const { data, error } = await supabase
            .from('guests')
            .select('count', { count: 'exact', head: true });
            
        if (error) {
            throw new Error(`Database connection failed: ${error.message}`);
        }
        console.log('✅ Connected to Supabase successfully');
        
        // Create backup
        await createBackup();
        
        // Load existing data
        const existingData = await loadExistingData();
        
        if (existingData.guests.length === 0 && existingData.rsvps.length === 0) {
            console.log('ℹ️  No data to migrate. Starting with fresh database.');
            return;
        }
        
        // Migrate guests first (creates guest records)
        const guestMap = await migrateGuests(existingData.guests);
        
        // Migrate RSVPs (references guest records)
        await migrateRSVPs(existingData.rsvps, guestMap);
        
        // Verify migration
        await verifyMigration();
        
        console.log('================================================');
        console.log('🎉 Migration completed successfully!');
        console.log('');
        console.log('Next steps:');
        console.log('1. Update your Netlify environment variables with Supabase credentials');
        console.log('2. Replace your RSVP function with the enhanced version');
        console.log('3. Update your admin panel to use the new database');
        console.log('4. Test the new system thoroughly');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.log('');
        console.log('Troubleshooting:');
        console.log('- Check your Supabase credentials');
        console.log('- Ensure the database schema has been created');
        console.log('- Verify network connectivity');
        process.exit(1);
    }
}

// Run migration if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    loadExistingData,
    migrateGuests,
    migrateRSVPs,
    createBackup,
    verifyMigration
};
