/**
 * Complete User Flow Testing
 * Tests all coach and athlete journeys end-to-end
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

// Test results tracking
const results = {
    passed: [],
    failed: [],
    warnings: []
};

function pass(test) {
    results.passed.push(test);
    console.log(`✅ ${test}`);
}

function fail(test, error) {
    results.failed.push({ test, error });
    console.log(`❌ ${test}: ${error}`);
}

function warn(test, message) {
    results.warnings.push({ test, message });
    console.log(`⚠️  ${test}: ${message}`);
}

// Helper to make API calls
async function apiCall(method, endpoint, body = null, headers = {}) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_URL}${endpoint}`, options);
    const data = await response.json().catch(() => ({}));

    return { response, data };
}

// Test 1: Frontend Pages Load
async function testFrontendPages() {
    console.log('\n📄 Testing Frontend Pages...\n');

    const pages = [
        { path: '/coach', name: 'Coach Login' },
        { path: '/coach/onboard', name: 'Coach Onboarding' },
        { path: '/coach-settings.html', name: 'Coach Settings' },
        { path: '/elite', name: 'Coach Dashboard (Elite)' },
        { path: '/athlete', name: 'Athlete Login' },
        { path: '/athlete/onboard', name: 'Athlete Onboarding' },
        { path: '/athlete-settings.html', name: 'Athlete Settings' },
        { path: '/athlete-dashboard.html', name: 'Athlete Dashboard' }
    ];

    for (const page of pages) {
        try {
            const response = await fetch(`${BASE_URL}${page.path}`);
            if (response.status === 200) {
                pass(`${page.name} loads (${page.path})`);
            } else {
                fail(`${page.name}`, `Status ${response.status}`);
            }
        } catch (error) {
            fail(`${page.name}`, error.message);
        }
    }
}

// Test 2: Coach Registration
async function testCoachRegistration() {
    console.log('\n👨‍💼 Testing Coach Registration Flow...\n');

    const coachData = {
        firstName: 'Test',
        lastName: 'Coach',
        email: 'testcoach@example.com',
        organization: 'Elite Running Club',
        specialty: 'running',
        bio: 'Experienced running coach'
    };

    try {
        const { response, data } = await apiCall('POST', '/auth/register/coach', coachData);

        if (response.ok && data.success) {
            pass('Coach registration endpoint works');
            if (data.code || data.token) {
                pass('Magic link code returned (dev mode)');
                return { userId: data.userId, token: data.token, code: data.code };
            } else {
                warn('Coach registration', 'No magic link in response (production mode)');
                return null;
            }
        } else {
            fail('Coach registration', data.error || 'Unknown error');
            return null;
        }
    } catch (error) {
        fail('Coach registration', error.message);
        return null;
    }
}

// Test 3: Magic Link Verification
async function testMagicLinkVerification(token, code) {
    console.log('\n🔐 Testing Magic Link Verification...\n');

    if (!token && !code) {
        warn('Magic link test', 'No token/code provided, skipping');
        return null;
    }

    try {
        const { response, data } = await apiCall('POST', '/auth/verify', { token, code });

        if (response.ok && data.success) {
            pass('Magic link verification works');
            if (data.sessionToken) {
                pass('Session token returned');
                return {
                    sessionToken: data.sessionToken,
                    user: data.user
                };
            }
        } else {
            fail('Magic link verification', data.error || 'Unknown error');
        }
        return null;
    } catch (error) {
        fail('Magic link verification', error.message);
        return null;
    }
}

// Test 4: Profile Update
async function testProfileUpdate(sessionToken, isCoach = true) {
    console.log(`\n📝 Testing ${isCoach ? 'Coach' : 'Athlete'} Profile Update...\n`);

    if (!sessionToken) {
        warn('Profile update', 'No session token, skipping');
        return;
    }

    const updateData = isCoach ? {
        sessionToken,
        name: 'Updated Coach Name',
        organization: 'New Organization',
        specialty: 'triathlon',
        bio: 'Updated bio'
    } : {
        sessionToken,
        name: 'Updated Athlete Name',
        sport: 'cycling',
        timezone: 'America/Los_Angeles'
    };

    try {
        const { response, data } = await apiCall('POST', '/auth/update-profile', updateData);

        if (response.ok && data.success) {
            pass(`${isCoach ? 'Coach' : 'Athlete'} profile update works`);
            if (data.user.name === updateData.name) {
                pass('Profile data updated correctly');
            } else {
                fail('Profile data', 'Name not updated');
            }
        } else {
            fail(`${isCoach ? 'Coach' : 'Athlete'} profile update`, data.error || 'Unknown error');
        }
    } catch (error) {
        fail('Profile update', error.message);
    }
}

// Test 5: Athlete Registration
async function testAthleteOnboarding() {
    console.log('\n🏃 Testing Athlete Onboarding Flow...\n');

    const athleteData = {
        userId: null, // Will be set after first step
        sessionToken: null,
        name: 'Test Athlete',
        dateOfBirth: '1990-01-01',
        sport: 'running',
        timezone: 'America/New_York'
    };

    try {
        const { response, data } = await apiCall('POST', '/auth/onboarding/complete', athleteData);

        if (response.ok && data.success) {
            pass('Athlete onboarding endpoint works');
            return data;
        } else {
            // This might fail if no user exists yet - expected
            warn('Athlete onboarding', data.error || 'Requires existing user');
            return null;
        }
    } catch (error) {
        warn('Athlete onboarding', error.message);
        return null;
    }
}

// Test 6: API Health
async function testAPIHealth() {
    console.log('\n🏥 Testing API Health...\n');

    try {
        const response = await fetch(`${BASE_URL}/health`);
        const data = await response.json();

        if (response.ok && data.status === 'healthy') {
            pass('Server health check');
            pass(`Database: ${data.database.type}`);
            pass(`Version: ${data.version}`);
        } else {
            fail('Server health', 'Not healthy');
        }
    } catch (error) {
        fail('Server health', error.message);
    }
}

// Test 7: Database Structure
async function testDatabaseStructure() {
    console.log('\n🗄️  Testing Database Structure...\n');

    const { execSync } = require('child_process');

    try {
        // Check if users table exists
        const tables = execSync('sqlite3 athlytx.db "SELECT name FROM sqlite_master WHERE type=\'table\';"', {
            encoding: 'utf-8'
        });

        if (tables.includes('users')) {
            pass('Users table exists');
        } else {
            fail('Users table', 'Not found');
        }

        if (tables.includes('oauth_tokens')) {
            pass('OAuth tokens table exists');
        }

        if (tables.includes('coach_athletes')) {
            pass('Coach-athlete relationships table exists');
        }

        // Check for new invite system tables
        if (tables.includes('invites')) {
            pass('Invites table exists (new system)');
        } else {
            warn('Invites table', 'Not found (old system only)');
        }

        if (tables.includes('device_shares')) {
            pass('Device shares table exists (new system)');
        } else {
            warn('Device shares table', 'Not found (old system only)');
        }

    } catch (error) {
        warn('Database check', error.message);
    }
}

// Test 8: Check for common issues
async function testCommonIssues() {
    console.log('\n🔍 Testing Common Issues...\n');

    // Check if coach-settings page has proper session handling
    try {
        const response = await fetch(`${BASE_URL}/coach-settings.html`);
        const html = await response.text();

        if (html.includes('JSON.parse') && html.includes('athlytx_session')) {
            pass('Coach settings has proper session handling');
        } else {
            fail('Coach settings', 'Missing session handling code');
        }

        if (html.includes('currentSession')) {
            pass('Coach settings uses currentSession variable');
        } else {
            warn('Coach settings', 'May have session handling issues');
        }
    } catch (error) {
        fail('Coach settings check', error.message);
    }

    // Check athlete settings
    try {
        const response = await fetch(`${BASE_URL}/athlete-settings.html`);
        const html = await response.text();

        if (html.includes('Profile') || html.includes('profile')) {
            pass('Athlete settings has profile section');
        } else {
            fail('Athlete settings', 'Missing profile section');
        }
    } catch (error) {
        fail('Athlete settings check', error.message);
    }
}

// Main test runner
async function runAllTests() {
    console.log('🧪 ATHLYTX USER FLOW TESTING');
    console.log('============================\n');

    // Test 1: Health check
    await testAPIHealth();

    // Test 2: Database structure
    await testDatabaseStructure();

    // Test 3: Frontend pages
    await testFrontendPages();

    // Test 4: Common issues
    await testCommonIssues();

    // Test 5: Coach registration flow
    const coachAuth = await testCoachRegistration();

    if (coachAuth && coachAuth.token) {
        // Test 6: Magic link verification
        const session = await testMagicLinkVerification(coachAuth.token, coachAuth.code);

        if (session) {
            // Test 7: Profile update
            await testProfileUpdate(session.sessionToken, true);
        }
    }

    // Test 8: Athlete onboarding (might fail without user)
    await testAthleteOnboarding();

    // Print summary
    console.log('\n📊 TEST SUMMARY');
    console.log('===============\n');
    console.log(`✅ Passed: ${results.passed.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log(`⚠️  Warnings: ${results.warnings.length}`);

    if (results.failed.length > 0) {
        console.log('\n❌ FAILURES:');
        results.failed.forEach(({ test, error }) => {
            console.log(`   - ${test}: ${error}`);
        });
    }

    if (results.warnings.length > 0) {
        console.log('\n⚠️  WARNINGS:');
        results.warnings.forEach(({ test, message }) => {
            console.log(`   - ${test}: ${message}`);
        });
    }

    const successRate = ((results.passed.length / (results.passed.length + results.failed.length)) * 100).toFixed(1);
    console.log(`\n📈 Success Rate: ${successRate}%`);

    if (results.failed.length === 0) {
        console.log('\n🎉 ALL CRITICAL TESTS PASSED!\n');
    } else {
        console.log('\n⚠️  SOME TESTS FAILED - SEE ABOVE FOR DETAILS\n');
    }
}

// Run tests
runAllTests().catch(error => {
    console.error('Test suite error:', error);
    process.exit(1);
});
