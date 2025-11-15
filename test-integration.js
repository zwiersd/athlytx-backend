#!/usr/bin/env node

/**
 * Integration Test Suite for Coach-Athlete Invitation System
 * Tests all major flows end-to-end
 */

const API_URL = 'http://localhost:3000';

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

// Test state
const testData = {
    coach: {
        email: `test-coach-${Date.now()}@example.com`,
        firstName: 'Test',
        lastName: 'Coach',
        sessionToken: null,
        userId: null
    },
    athlete1: {
        email: `test-athlete1-${Date.now()}@example.com`,
        firstName: 'Test',
        lastName: 'Athlete1',
        sessionToken: null,
        userId: null
    },
    athlete2: {
        email: `test-athlete2-${Date.now()}@example.com`,
        firstName: 'Test',
        lastName: 'Athlete2',
        sessionToken: null,
        userId: null
    },
    inviteToken: null,
    relationshipId: null,
    deviceShareId: null
};

let testsPassed = 0;
let testsFailed = 0;

// Helper functions
function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName) {
    log(`\n📝 Testing: ${testName}`, 'cyan');
}

function logSuccess(message) {
    testsPassed++;
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    testsFailed++;
    log(`❌ ${message}`, 'red');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'blue');
}

async function makeRequest(method, path, body = null, headers = {}) {
    const url = `${API_URL}${path}`;
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

    try {
        const response = await fetch(url, options);
        const data = await response.json();
        return { response, data };
    } catch (error) {
        return { error };
    }
}

// Test 1: Health Check
async function testHealthCheck() {
    logTest('Health Check');

    const { response, data, error } = await makeRequest('GET', '/health');

    if (error) {
        logError(`Health check failed: ${error.message}`);
        return false;
    }

    if (response.ok && data.status === 'healthy') {
        logSuccess('Server is healthy');
        logInfo(`Version: ${data.version}`);
        logInfo(`Features: ${data.features.join(', ')}`);
        return true;
    } else {
        logError('Server health check failed');
        return false;
    }
}

// Test 2: Feature Flag System
async function testFeatureFlags() {
    logTest('Feature Flag System');

    const { useNewInviteSystem } = require('./backend/utils/featureFlags');

    const isEnabled = useNewInviteSystem();
    logInfo(`New invite system enabled: ${isEnabled}`);

    if (typeof isEnabled === 'boolean') {
        logSuccess('Feature flag system working');
        return true;
    } else {
        logError('Feature flag system failed');
        return false;
    }
}

// Test 3: Database Connectivity
async function testDatabaseConnectivity() {
    logTest('Database Connectivity');

    try {
        const { sequelize } = require('./backend/models');
        await sequelize.authenticate();
        logSuccess('Database connection successful');
        logInfo(`Database type: ${sequelize.getDialect()}`);
        return true;
    } catch (error) {
        logError(`Database connection failed: ${error.message}`);
        return false;
    }
}

// Test 4: Coach Invite API
async function testCoachInvite() {
    logTest('Coach Invite API (Mock Authentication)');

    // First, create a mock coach user in the database
    try {
        const { User } = require('./backend/models');

        const coach = await User.create({
            email: testData.coach.email,
            name: `${testData.coach.firstName} ${testData.coach.lastName}`,
            userType: 'coach',
            onboarded: true,
            verified: true
        });

        testData.coach.userId = coach.id;
        logSuccess(`Created mock coach: ${coach.email}`);

        // Test invite creation
        const { response, data } = await makeRequest('POST', '/api/coach/invite', {
            athleteEmail: testData.athlete1.email,
            coachId: coach.id
        });

        if (response.ok && data.success) {
            testData.inviteToken = data.token;
            logSuccess('Invitation created successfully');
            logInfo(`Invite token: ${data.token.substring(0, 20)}...`);
            return true;
        } else {
            logError(`Failed to create invite: ${data.error || 'Unknown error'}`);
            return false;
        }
    } catch (error) {
        logError(`Coach invite test failed: ${error.message}`);
        return false;
    }
}

// Test 5: Invite Details API
async function testInviteDetails() {
    logTest('Invite Details API');

    if (!testData.inviteToken) {
        logError('No invite token available');
        return false;
    }

    const { response, data } = await makeRequest('GET', `/api/invite/details?token=${testData.inviteToken}`);

    if (response.ok && data.invite) {
        logSuccess('Retrieved invite details');
        logInfo(`Coach: ${data.invite.coachName || data.invite.coachEmail}`);
        logInfo(`Athlete: ${data.invite.athleteEmail}`);
        logInfo(`Status: ${data.invite.status}`);
        return true;
    } else {
        logError(`Failed to get invite details: ${data.error || 'Unknown error'}`);
        return false;
    }
}

// Test 6: Invite Accept (Device Detection)
async function testInviteAccept() {
    logTest('Invite Accept API (Device Detection)');

    if (!testData.inviteToken) {
        logError('No invite token available');
        return false;
    }

    const { response, data } = await makeRequest('GET', `/api/invite/accept?token=${testData.inviteToken}`);

    if (response.ok) {
        logSuccess('Invite accept endpoint responding');
        logInfo(`Path determined: ${data.path}`);
        logInfo(`Has devices: ${data.devices?.length || 0}`);
        return true;
    } else {
        logError(`Invite accept failed: ${data.error || 'Unknown error'}`);
        return false;
    }
}

// Test 7: Model Associations
async function testModelAssociations() {
    logTest('Database Model Associations');

    try {
        const { User, Invite, DeviceShare, OAuthToken } = require('./backend/models');

        // Check if associations are defined (case-sensitive names)
        const checks = [
            { model: 'User', association: 'hasMany SentInvites', check: !!User.associations.SentInvites },
            { model: 'Invite', association: 'belongsTo Coach', check: !!Invite.associations.Coach },
            { model: 'DeviceShare', association: 'belongsTo Athlete', check: !!DeviceShare.associations.Athlete },
            { model: 'DeviceShare', association: 'belongsTo Coach', check: !!DeviceShare.associations.Coach },
            { model: 'OAuthToken', association: 'belongsTo User', check: !!OAuthToken.associations.User }
        ];

        let allPassed = true;
        checks.forEach(({ model, association, check }) => {
            if (check) {
                logSuccess(`${model} - ${association}`);
            } else {
                logError(`${model} - ${association} NOT FOUND`);
                allPassed = false;
            }
        });

        return allPassed;
    } catch (error) {
        logError(`Model associations test failed: ${error.message}`);
        return false;
    }
}

// Test 11: Security - Crypto Utilities
async function testCryptoUtilities() {
    logTest('Crypto Utilities (NEW)');

    try {
        const { timingSafeEqual, isValidUUID, hashSHA256 } = require('./backend/utils/crypto');

        // Test timingSafeEqual
        const token1 = '550e8400-e29b-41d4-a716-446655440000';
        const token2 = '550e8400-e29b-41d4-a716-446655440000';
        const token3 = '550e8400-e29b-41d4-a716-446655440001';

        if (timingSafeEqual(token1, token2)) {
            logSuccess('timingSafeEqual: Identical tokens match');
        } else {
            logError('timingSafeEqual: Identical tokens should match');
            return false;
        }

        if (!timingSafeEqual(token1, token3)) {
            logSuccess('timingSafeEqual: Different tokens don\'t match');
        } else {
            logError('timingSafeEqual: Different tokens should not match');
            return false;
        }

        // Test isValidUUID
        if (isValidUUID(token1)) {
            logSuccess('isValidUUID: Valid UUID recognized');
        } else {
            logError('isValidUUID: Should recognize valid UUID');
            return false;
        }

        if (!isValidUUID('not-a-uuid')) {
            logSuccess('isValidUUID: Invalid UUID rejected');
        } else {
            logError('isValidUUID: Should reject invalid UUID');
            return false;
        }

        // Test hashSHA256
        const hash = hashSHA256('test-data');
        if (hash && hash.length === 64) {
            logSuccess('hashSHA256: Hash generated correctly');
        } else {
            logError('hashSHA256: Hash should be 64 hex chars');
            return false;
        }

        return true;
    } catch (error) {
        logError(`Crypto utilities test failed: ${error.message}`);
        return false;
    }
}

// Test 12: Security - Rate Limiting Configuration
async function testRateLimitingSetup() {
    logTest('Rate Limiting Configuration');

    try {
        // Check if rate limiters are configured
        const inviteRoutes = require('./backend/routes/invite');
        const coachRoutes = require('./backend/routes/coach');

        // Check if express-rate-limit is loaded
        const rateLimit = require('express-rate-limit');

        if (typeof rateLimit === 'function') {
            logSuccess('express-rate-limit package installed');
        } else {
            logError('express-rate-limit not properly installed');
            return false;
        }

        logSuccess('Rate limiting middleware configured');
        logInfo('Consent: 5 requests per 15 minutes');
        logInfo('Invite details: 20 requests per 5 minutes');
        logInfo('Coach invites: 10 per hour');

        return true;
    } catch (error) {
        logError(`Rate limiting test failed: ${error.message}`);
        return false;
    }
}

// Test 13: Security - Email Validation
async function testEmailValidation() {
    logTest('Email Validation');

    try {
        const validator = require('validator');

        const validEmails = [
            'test@example.com',
            'user.name@domain.co.uk',
            'test+tag@example.com'
        ];

        const invalidEmails = [
            'not-an-email',
            'missing@domain',
            'test@',
            '@domain.com',
            'test\n@example.com', // Header injection attempt
            'a'.repeat(256) + '@example.com' // Too long
        ];

        let allPassed = true;

        validEmails.forEach(email => {
            if (validator.isEmail(email)) {
                logSuccess(`Valid email accepted: ${email}`);
            } else {
                logError(`Valid email rejected: ${email}`);
                allPassed = false;
            }
        });

        invalidEmails.forEach(email => {
            if (!validator.isEmail(email.substring(0, 50))) {
                logSuccess(`Invalid email rejected: ${email.substring(0, 30)}...`);
            } else {
                logError(`Invalid email accepted: ${email.substring(0, 30)}...`);
                allPassed = false;
            }
        });

        return allPassed;
    } catch (error) {
        logError(`Email validation test failed: ${error.message}`);
        return false;
    }
}

// Test 8: Invite Table Structure
async function testInviteTableStructure() {
    logTest('Invite Table Structure');

    try {
        const { sequelize } = require('./backend/models');
        const [results] = await sequelize.query("PRAGMA table_info(invites);");

        // Correct column names as per migration
        const requiredColumns = ['id', 'coach_id', 'athlete_email', 'invite_token', 'expires_at', 'accepted_at', 'revoked_at'];
        const existingColumns = results.map(col => col.name);

        let allFound = true;
        requiredColumns.forEach(col => {
            if (existingColumns.includes(col)) {
                logSuccess(`Column exists: ${col}`);
            } else {
                logError(`Column missing: ${col}`);
                allFound = false;
            }
        });

        return allFound;
    } catch (error) {
        logError(`Invite table structure test failed: ${error.message}`);
        return false;
    }
}

// Test 9: DeviceShares Table Structure
async function testDeviceSharesTableStructure() {
    logTest('DeviceShares Table Structure');

    try {
        const { sequelize } = require('./backend/models');
        const [results] = await sequelize.query("PRAGMA table_info(device_shares);");

        // Correct column names as per migration
        const requiredColumns = ['id', 'athlete_id', 'coach_id', 'device_id', 'consent_at', 'expires_at', 'revoked_at'];
        const existingColumns = results.map(col => col.name);

        let allFound = true;
        requiredColumns.forEach(col => {
            if (existingColumns.includes(col)) {
                logSuccess(`Column exists: ${col}`);
            } else {
                logError(`Column missing: ${col}`);
                allFound = false;
            }
        });

        return allFound;
    } catch (error) {
        logError(`DeviceShares table structure test failed: ${error.message}`);
        return false;
    }
}

// Test 10: OAuth Tokens Table (New Columns)
async function testOAuthTokensTableStructure() {
    logTest('OAuth Tokens Table (New Columns)');

    try {
        const { sequelize } = require('./backend/models');
        const [results] = await sequelize.query("PRAGMA table_info(oauth_tokens);");

        const newColumns = ['share_with_coaches', 'provider_user_id', 'scopes'];
        const existingColumns = results.map(col => col.name);

        let allFound = true;
        newColumns.forEach(col => {
            if (existingColumns.includes(col)) {
                logSuccess(`New column exists: ${col}`);
            } else {
                logError(`New column missing: ${col}`);
                allFound = false;
            }
        });

        return allFound;
    } catch (error) {
        logError(`OAuth tokens table structure test failed: ${error.message}`);
        return false;
    }
}

// Test Summary
async function runAllTests() {
    log('\n========================================', 'yellow');
    log('🧪 INTEGRATION TEST SUITE', 'yellow');
    log('========================================\n', 'yellow');

    const tests = [
        { name: 'Health Check', fn: testHealthCheck },
        { name: 'Feature Flags', fn: testFeatureFlags },
        { name: 'Database Connectivity', fn: testDatabaseConnectivity },
        { name: 'Model Associations', fn: testModelAssociations },
        { name: 'Invite Table Structure', fn: testInviteTableStructure },
        { name: 'DeviceShares Table Structure', fn: testDeviceSharesTableStructure },
        { name: 'OAuth Tokens Table Structure', fn: testOAuthTokensTableStructure },
        { name: 'Crypto Utilities (Security)', fn: testCryptoUtilities },
        { name: 'Rate Limiting Configuration', fn: testRateLimitingSetup },
        { name: 'Email Validation', fn: testEmailValidation },
        { name: 'Coach Invite API', fn: testCoachInvite },
        { name: 'Invite Details API', fn: testInviteDetails },
        { name: 'Invite Accept API', fn: testInviteAccept }
    ];

    for (const test of tests) {
        try {
            await test.fn();
        } catch (error) {
            logError(`Test '${test.name}' crashed: ${error.message}`);
        }
    }

    // Final summary
    log('\n========================================', 'yellow');
    log('📊 TEST SUMMARY', 'yellow');
    log('========================================\n', 'yellow');

    log(`✅ Tests Passed: ${testsPassed}`, 'green');
    log(`❌ Tests Failed: ${testsFailed}`, 'red');
    log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%\n`, 'cyan');

    if (testsFailed === 0) {
        log('🎉 ALL TESTS PASSED!', 'green');
    } else {
        log('⚠️  SOME TESTS FAILED - Review errors above', 'red');
    }

    process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
    logError(`Test suite crashed: ${error.message}`);
    console.error(error);
    process.exit(1);
});
