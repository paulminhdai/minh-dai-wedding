// Database setup script for Supabase
// Initializes the database schema and configuration

// Load environment variables from .env file
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: Missing Supabase configuration');
    console.log('Please set the following environment variables:');
    console.log('- SUPABASE_URL: Your Supabase project URL');
    console.log('- SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key');
    console.log('');
    console.log('You can find these in your Supabase dashboard:');
    console.log('https://app.supabase.com/project/YOUR_PROJECT_ID/settings/api');
    process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testConnection() {
    console.log('🔗 Testing Supabase connection...');
    
    try {
        const { data, error } = await supabase
            .from('wedding_events')
            .select('count', { count: 'exact', head: true });
            
        if (error) {
            if (error.code === 'PGRST116') {
                console.log('ℹ️  Database tables not found - schema needs to be created');
                return false;
            }
            throw error;
        }
        
        console.log('✅ Successfully connected to Supabase');
        console.log(`   Database has ${data.count || 0} wedding events`);
        return true;
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        return false;
    }
}

async function checkSchema() {
    console.log('🔍 Checking database schema...');
    
    const requiredTables = [
        'guests',
        'wedding_events', 
        'rsvps',
        'rsvp_guests',
        'event_attendance',
        'admin_logs'
    ];
    
    const existingTables = [];
    const missingTables = [];
    
    for (const table of requiredTables) {
        try {
            const { error } = await supabase
                .from(table)
                .select('count', { count: 'exact', head: true });
                
            if (error && error.code !== 'PGRST116') {
                throw error;
            }
            
            if (!error) {
                existingTables.push(table);
            } else {
                missingTables.push(table);
            }
        } catch (error) {
            console.error(`❌ Error checking table ${table}:`, error.message);
            missingTables.push(table);
        }
    }
    
    console.log(`✅ Found ${existingTables.length} existing tables:`, existingTables);
    
    if (missingTables.length > 0) {
        console.log(`⚠️  Missing ${missingTables.length} tables:`, missingTables);
        return false;
    }
    
    return true;
}

async function initializeDefaultData() {
    console.log('📋 Initializing default data...');
    
    try {
        // Check if wedding events exist
        const { data: events, error: eventsError } = await supabase
            .from('wedding_events')
            .select('count', { count: 'exact', head: true });
            
        if (eventsError) throw eventsError;
        
        if (events.count === 0) {
            console.log('🎉 Creating default wedding events...');
            
            const defaultEvents = [
                {
                    name: 'Tea Ceremony',
                    description: 'Traditional Vietnamese tea ceremony',
                    start_time: '2026-06-26T09:00:00-07:00',
                    end_time: '2026-06-26T11:00:00-07:00',
                    venue_name: 'Private Residence',
                    venue_address: 'Orange County, CA',
                    max_capacity: 50,
                    is_active: true
                },
                {
                    name: 'Wedding Ceremony',
                    description: 'Catholic wedding mass',
                    start_time: '2026-06-26T14:30:00-07:00',
                    end_time: '2026-06-26T15:30:00-07:00',
                    venue_name: 'Korean Martys Catholic Center',
                    venue_address: 'Orange County, CA',
                    max_capacity: 200,
                    is_active: true
                },
                {
                    name: 'Cocktail Hour',
                    description: 'Pre-reception cocktails and appetizers',
                    start_time: '2026-06-26T18:00:00-07:00',
                    end_time: '2026-06-26T19:00:00-07:00',
                    venue_name: 'White Place 2',
                    venue_address: 'Orange County, CA',
                    max_capacity: 150,
                    is_active: true
                },
                {
                    name: 'Reception',
                    description: 'Wedding reception dinner and dancing',
                    start_time: '2026-06-26T19:00:00-07:00',
                    end_time: '2026-06-26T23:00:00-07:00',
                    venue_name: 'White Place 2',
                    venue_address: 'Orange County, CA',
                    max_capacity: 150,
                    is_active: true
                }
            ];
            
            const { data: createdEvents, error: createError } = await supabase
                .from('wedding_events')
                .insert(defaultEvents)
                .select();
                
            if (createError) throw createError;
            
            console.log(`✅ Created ${createdEvents.length} wedding events`);
        } else {
            console.log(`ℹ️  Wedding events already exist (${events.count} events)`);
        }
        
        // Check if sample guests exist (from existing data)
        const { data: guests, error: guestsError } = await supabase
            .from('guests')
            .select('count', { count: 'exact', head: true });
            
        if (guestsError) throw guestsError;
        
        if (guests.count === 0) {
            console.log('👥 Creating sample guest data...');
            
            const sampleGuests = [
                {
                    name: 'Han Vuong',
                    is_invited: true,
                    guest_code: 'HAN2026'
                },
                {
                    name: 'Nhat Nguyen', 
                    is_invited: true,
                    guest_code: 'NHAT2026'
                }
            ];
            
            const { data: createdGuests, error: createGuestsError } = await supabase
                .from('guests')
                .insert(sampleGuests)
                .select();
                
            if (createGuestsError) throw createGuestsError;
            
            console.log(`✅ Created ${createdGuests.length} sample guests`);
        } else {
            console.log(`ℹ️  Guests already exist (${guests.count} guests)`);
        }
        
    } catch (error) {
        console.error('❌ Error initializing default data:', error.message);
        throw error;
    }
}

async function verifySetup() {
    console.log('🔍 Verifying database setup...');
    
    try {
        // Test all main functions
        const tests = [
            {
                name: 'Guest creation',
                test: async () => {
                    const { data, error } = await supabase
                        .from('guests')
                        .select('*')
                        .limit(1);
                    return !error;
                }
            },
            {
                name: 'Wedding events',
                test: async () => {
                    const { data, error } = await supabase
                        .from('wedding_events')
                        .select('*')
                        .limit(1);
                    return !error && data.length > 0;
                }
            },
            {
                name: 'RSVP view',
                test: async () => {
                    const { data, error } = await supabase
                        .from('rsvp_summary')
                        .select('*')
                        .limit(1);
                    return !error;
                }
            },
            {
                name: 'Statistics function',
                test: async () => {
                    const { data, error } = await supabase
                        .rpc('get_rsvp_stats');
                    return !error;
                }
            }
        ];
        
        let passedTests = 0;
        
        for (const test of tests) {
            try {
                const passed = await test.test();
                if (passed) {
                    console.log(`  ✅ ${test.name}`);
                    passedTests++;
                } else {
                    console.log(`  ❌ ${test.name}`);
                }
            } catch (error) {
                console.log(`  ❌ ${test.name}: ${error.message}`);
            }
        }
        
        console.log(`📊 Tests passed: ${passedTests}/${tests.length}`);
        return passedTests === tests.length;
        
    } catch (error) {
        console.error('❌ Error verifying setup:', error.message);
        return false;
    }
}

async function generateEnvTemplate() {
    const envTemplate = `# Supabase Configuration
# Get these values from your Supabase dashboard: https://app.supabase.com/project/YOUR_PROJECT_ID/settings/api

SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Admin Configuration
ADMIN_PASSWORD=your_secure_password_here

# Optional Settings
ENABLE_GUEST_VALIDATION=true
NODE_ENV=production

# Netlify Environment Variables
# Add these to your Netlify site settings: https://app.netlify.com/sites/YOUR_SITE/settings/env-vars
# - SUPABASE_URL
# - SUPABASE_ANON_KEY  
# - SUPABASE_SERVICE_ROLE_KEY
# - ADMIN_PASSWORD
# - ENABLE_GUEST_VALIDATION
`;

    const envPath = path.join(__dirname, '..', '.env.example');
    await fs.writeFile(envPath, envTemplate);
    console.log('📄 Created .env.example file');
}

async function main() {
    console.log('🚀 Setting up Supabase database for Wedding Website');
    console.log('==================================================');
    
    try {
        // Test connection
        const connected = await testConnection();
        
        if (!connected) {
            console.log('');
            console.log('📋 Next steps:');
            console.log('1. Create a new project at https://app.supabase.com');
            console.log('2. Go to SQL Editor and run the schema.sql file');
            console.log('3. Update your environment variables');
            console.log('4. Run this setup script again');
            
            await generateEnvTemplate();
            return;
        }
        
        // Check schema
        const schemaReady = await checkSchema();
        
        if (!schemaReady) {
            console.log('');
            console.log('⚠️  Database schema incomplete!');
            console.log('Please run the schema.sql file in your Supabase SQL Editor:');
            console.log('1. Go to https://app.supabase.com/project/YOUR_PROJECT_ID/sql');
            console.log('2. Copy and paste the contents of database/schema.sql');
            console.log('3. Run the SQL commands');
            console.log('4. Run this setup script again');
            return;
        }
        
        // Initialize default data
        await initializeDefaultData();
        
        // Verify everything works
        const setupValid = await verifySetup();
        
        if (setupValid) {
            console.log('');
            console.log('🎉 Database setup completed successfully!');
            console.log('');
            console.log('📊 Current database status:');
            
            // Show current stats
            const { data: stats } = await supabase.rpc('get_rsvp_stats');
            const { data: guestCount } = await supabase
                .from('guests')
                .select('count', { count: 'exact', head: true });
            const { data: eventCount } = await supabase
                .from('wedding_events')
                .select('count', { count: 'exact', head: true });
                
            console.log(`   - ${guestCount?.count || 0} guests in database`);
            console.log(`   - ${stats?.total_rsvps || 0} RSVPs received`);
            console.log(`   - ${eventCount?.count || 0} wedding events configured`);
            
            console.log('');
            console.log('🔗 Your wedding website is ready to use Supabase!');
            console.log('');
            console.log('Next steps:');
            console.log('1. Update your Netlify functions to use the enhanced versions');
            console.log('2. Set environment variables in Netlify dashboard');
            console.log('3. Deploy the updated functions');
            console.log('4. Test the RSVP system');
            
        } else {
            console.log('');
            console.log('⚠️  Setup verification failed');
            console.log('Please check the error messages above and try again');
        }
        
        await generateEnvTemplate();
        
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        console.log('');
        console.log('Troubleshooting:');
        console.log('- Verify your Supabase credentials are correct');
        console.log('- Check that your Supabase project is active');
        console.log('- Ensure you have internet connectivity');
        console.log('- Make sure the schema.sql has been executed');
        process.exit(1);
    }
}

// Run setup if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    testConnection,
    checkSchema,
    initializeDefaultData,
    verifySetup,
    generateEnvTemplate
};
