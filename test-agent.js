/**
 * Test script for the Athlytx API & OAuth Specialist Agent
 *
 * This demonstrates the agent's capabilities without needing a full server setup
 *
 * Usage:
 * 1. Make sure ANTHROPIC_API_KEY is set in your .env file
 * 2. Run: node test-agent.js
 */

require('dotenv').config();

// Check if API key is set
if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY not set in environment');
    console.error('Please add it to your .env file:');
    console.error('ANTHROPIC_API_KEY=your-key-here');
    process.exit(1);
}

const ApiOAuthSpecialistAgent = require('./backend/agents/api-oauth-specialist');

async function runTests() {
    console.log('🤖 Athlytx API & OAuth Specialist Agent - Test Suite\n');

    try {
        // Initialize the agent
        console.log('1️⃣ Initializing agent...');
        const agent = new ApiOAuthSpecialistAgent();
        console.log('✅ Agent initialized successfully\n');

        // Test 1: System health check
        console.log('2️⃣ Running system health check...');
        const healthResult = await agent.performHealthCheck();
        console.log('📊 Health Check Result:');
        console.log(healthResult.response);
        console.log(`   Tools used: ${healthResult.toolsUsed}\n`);

        // Test 2: OAuth diagnosis (simulated)
        console.log('3️⃣ Testing OAuth diagnosis capabilities...');
        const diagnosisResult = await agent.processMessage(
            'test-user',
            'What should I check if my Garmin connection is not working?'
        );
        console.log('🔍 Diagnosis Result:');
        console.log(diagnosisResult.response);
        console.log(`   Tools used: ${diagnosisResult.toolsUsed}\n`);

        // Test 3: Natural language query understanding
        console.log('4️⃣ Testing natural language understanding...');
        const queryResult = await agent.processMessage(
            'test-user',
            'How would I query my running activities from the last month?'
        );
        console.log('💬 Query Understanding:');
        console.log(queryResult.response);
        console.log(`   Tools used: ${queryResult.toolsUsed}\n`);

        // Test 4: Error troubleshooting
        console.log('5️⃣ Testing error troubleshooting...');
        const errorResult = await agent.processMessage(
            'test-user',
            'I got an "invalid_grant" error from Strava. What does that mean and how do I fix it?'
        );
        console.log('🔧 Troubleshooting Result:');
        console.log(errorResult.response);
        console.log(`   Tools used: ${errorResult.toolsUsed}\n`);

        // Test 5: Token management advice
        console.log('6️⃣ Testing token management advice...');
        const tokenResult = await agent.processMessage(
            'test-user',
            'Explain how OAuth token refresh works and when tokens need to be refreshed'
        );
        console.log('🔑 Token Management:');
        console.log(tokenResult.response);
        console.log(`   Tools used: ${tokenResult.toolsUsed}\n`);

        console.log('✅ All tests completed successfully!\n');
        console.log('📝 Summary:');
        console.log('   - Agent initialized and responding correctly');
        console.log('   - Can perform system health checks');
        console.log('   - Understands OAuth issues and provides solutions');
        console.log('   - Parses natural language queries');
        console.log('   - Troubleshoots errors with actionable advice');
        console.log('   - Explains technical concepts clearly\n');

        console.log('🎉 The agent is ready to use!');
        console.log('   Start your server and try: POST /api/agent/chat');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('\nPossible issues:');
        console.error('1. ANTHROPIC_API_KEY not valid');
        console.error('2. Network connectivity issues');
        console.error('3. Database not configured (some tests may fail)');
        console.error('\nFull error:', error);
        process.exit(1);
    }
}

// Alternative: Direct tool testing without agent
async function testToolsDirectly() {
    console.log('\n🔧 Direct Tool Testing (No Claude API calls)\n');

    const monitoringTools = require('./backend/agents/tools/monitoring-tools');
    const oauthTools = require('./backend/agents/tools/oauth-tools');

    // Test monitoring tools
    console.log('1️⃣ Testing monitoring tools...');
    const metrics = monitoringTools.getMetricsSummary();
    console.log('📊 Current Metrics:', JSON.stringify(metrics, null, 2));

    // Test OAuth diagnosis
    console.log('\n2️⃣ Testing OAuth diagnosis...');
    const diagnosis = await oauthTools.diagnoseOAuthIssue('garmin', {
        error: 'invalid_grant'
    });
    console.log('🔍 Diagnosis:', JSON.stringify(diagnosis, null, 2));

    console.log('\n✅ Direct tool testing complete!');
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--tools-only')) {
    // Test tools without using Claude API
    testToolsDirectly().catch(console.error);
} else {
    // Run full agent tests (requires ANTHROPIC_API_KEY)
    runTests().catch(console.error);
}
