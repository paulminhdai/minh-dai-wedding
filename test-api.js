#!/usr/bin/env node
// Simple script to test your deployed API endpoints

const BASE_URL = 'https://web-production-c6f85.up.railway.app';

async function testAPI() {
    console.log('🧪 Testing Wedding Website API...\n');
    console.log(`Base URL: ${BASE_URL}\n`);
    
    // Test 1: Health Check
    console.log('1️⃣  Testing health endpoint...');
    try {
        const response = await fetch(`${BASE_URL}/api/health`);
        const data = await response.json();
        console.log('✅ Health check passed:', data);
    } catch (error) {
        console.log('❌ Health check failed:', error.message);
    }
    console.log('');
    
    // Test 2: Admin Login (without password)
    console.log('2️⃣  Testing admin endpoint (without password)...');
    try {
        const response = await fetch(`${BASE_URL}/api/admin`);
        const data = await response.json();
        console.log(`Response status: ${response.status}`);
        console.log('Response:', data);
        if (response.status === 401) {
            console.log('✅ Correctly returns 401 Unauthorized (password required)');
        } else {
            console.log('⚠️  Unexpected response status');
        }
    } catch (error) {
        console.log('❌ Admin endpoint failed:', error.message);
    }
    console.log('');
    
    // Test 3: Admin Login (with test password)
    console.log('3️⃣  Testing admin endpoint (with password)...');
    console.log('⚠️  NOTE: Replace "test123" with your actual ADMIN_PASSWORD');
    const testPassword = process.argv[2] || 'test123';
    try {
        const response = await fetch(`${BASE_URL}/api/admin?password=${encodeURIComponent(testPassword)}`);
        const data = await response.json();
        console.log(`Response status: ${response.status}`);
        
        if (response.status === 200) {
            console.log('✅ Admin login successful!');
            console.log('RSVP Data:', {
                total: data.total,
                attending: data.attending,
                notAttending: data.notAttending,
                rsvpCount: data.rsvps?.length || 0
            });
        } else if (response.status === 401) {
            console.log('❌ Admin login failed - Wrong password or not set');
            console.log('Response:', data);
        } else {
            console.log('⚠️  Unexpected response:', data);
        }
    } catch (error) {
        console.log('❌ Admin endpoint failed:', error.message);
    }
    console.log('');
    
    // Test 4: Guest Search
    console.log('4️⃣  Testing guest search endpoint...');
    try {
        const response = await fetch(`${BASE_URL}/api/guests/search?q=John`);
        const data = await response.json();
        console.log('✅ Guest search response:', data);
    } catch (error) {
        console.log('❌ Guest search failed:', error.message);
    }
    console.log('');
    
    console.log('🏁 Tests complete!\n');
    console.log('💡 Tip: If admin login fails, check your Railway environment variables:');
    console.log('   - ADMIN_PASSWORD should be set');
    console.log('   - SUPABASE_URL should be set');
    console.log('   - SUPABASE_ANON_KEY should be set');
    console.log('   - SUPABASE_SERVICE_ROLE_KEY should be set');
    console.log('\nTo test with your password, run:');
    console.log(`   node test-api.js "your_password_here"\n`);
}

// Run tests
testAPI().catch(console.error);

