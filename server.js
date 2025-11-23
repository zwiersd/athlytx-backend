require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const { initializeDatabase } = require('./backend/models');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARE =====
app.use(cors({
    origin: process.env.FRONTEND_URL || true,
    credentials: true
}));
// Increase payload limit for Garmin Health API (min 10MB, Activity Details: 100MB)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'athlytx-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
}));

// ===== SERVE STATIC FRONTEND =====
// Explicit routes for pages (must come BEFORE static middleware)

// Landing page
app.get('/access', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'access.html'));
});

// Coach routes - SIMPLE AUTH (default)
app.get('/coach', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'coach-simple-auth.html'));
});

app.get('/coach/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'coach-elite.html'));
});

// Athlete routes - SIMPLE AUTH (default)
app.get('/athlete', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'athlete-simple-auth.html'));
});

app.get('/athlete/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'athlete-dashboard.html'));
});

// Legacy magic link routes (kept for backward compatibility)
app.get('/coach-magic', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'coach-login.html'));
});

app.get('/coach/onboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'coach-onboarding.html'));
});

app.get('/athlete-magic', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'athlete-login.html'));
});

app.get('/athlete/onboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'athlete-onboard.html'));
});

// Password reset route
app.get('/reset-password', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'reset-password.html'));
});

// Invite routes
app.get('/invite/accept', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'consent-screen.html'));
});

app.use(express.static(path.join(__dirname, 'frontend')));

// ===== API ROUTES =====

// Health check
app.get('/health', (req, res) => {
    console.log('🔐 Environment check:');
    console.log(`  - Strava: ${process.env.STRAVA_CLIENT_SECRET ? '✅' : '❌'}`);
    console.log(`  - Oura: ${process.env.OURA_CLIENT_SECRET ? '✅' : '❌'}`);
    console.log(`  - Whoop: ${process.env.WHOOP_CLIENT_SECRET ? '✅' : '❌'}`);
    console.log(`  - Garmin: ${process.env.GARMIN_CONSUMER_SECRET ? '✅' : '❌'}`);
    console.log(`  - Database: ${process.env.DATABASE_URL ? '✅' : '❌'}`);

    const { sequelize } = require('./backend/models');
    const dbDialect = sequelize.getDialect();

    res.json({
        message: 'Athlytx Unified Service Live! 🚀',
        timestamp: new Date().toISOString(),
        status: 'healthy',
        version: '2.0.0',
        features: ['frontend', 'api', 'database', 'auth', 'coach-sharing'],
        database: {
            hasUrl: !!process.env.DATABASE_URL,
            urlPrefix: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) + '...' : 'not set',
            dialect: dbDialect,
            type: dbDialect === 'postgres' ? 'PostgreSQL' : 'SQLite'
        }
    });
});

// Admin migration endpoint (temporary - run once then remove)
app.get('/admin/migrate-oauth-tokens', async (req, res) => {
    try {
        const migrate = require('./backend/migrations/add-oauth-token-columns');
        await migrate();
        res.json({ success: true, message: 'Migration completed' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message, stack: error.stack });
    }
});

// Guest mode migration endpoint
app.get('/admin/migrate-guest-mode', async (req, res) => {
    try {
        const migrate = require('./backend/migrations/add-guest-mode-fields');
        await migrate();
        res.json({ success: true, message: 'Guest mode migration completed' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message, stack: error.stack });
    }
});

// Import legacy routes (existing OAuth endpoints)
const legacyRoutes = require('./backend/routes/legacy-routes');
legacyRoutes(app);

// Import new routes
const syncRoutes = require('./backend/routes/sync');
const testRoutes = require('./backend/routes/test-garmin');
const garminHealthRoutes = require('./backend/routes/garmin-health');
const garminOAuthTestRoutes = require('./backend/routes/garmin-oauth-test');
app.use('/api/sync', syncRoutes);
app.use('/api/test', testRoutes);
app.use('/api/garmin', garminHealthRoutes);
app.use('/api/garmin/test', garminOAuthTestRoutes);

// Import authentication, coach, athlete, invite, and device routes
const authRoutes = require('./backend/routes/auth');
const authenticationRoutes = require('./backend/routes/authentication'); // Optional guest mode auth
const coachRoutes = require('./backend/routes/coach');
const athleteRoutes = require('./backend/routes/athlete');
const inviteRoutes = require('./backend/routes/invite');
const deviceRoutes = require('./backend/routes/devices');
app.use('/api/auth', authRoutes);
app.use('/api/authentication', authenticationRoutes); // Guest mode + optional signup
app.use('/api/coach', coachRoutes);
app.use('/api/athlete', athleteRoutes);
app.use('/api/invite', inviteRoutes);
app.use('/api/devices', deviceRoutes);

// Import AI agent routes
const agentRoutes = require('./backend/routes/agent');
app.use('/api/agent', agentRoutes);

// Import contact form routes
const contactRoutes = require('./backend/routes/contact');
app.use('/api/contact', contactRoutes);

// Import API logs routes
const logsRoutes = require('./backend/routes/logs');
app.use('/api/logs', logsRoutes);

// OAuth callback handlers (server-side processing)
app.get('/auth/garmin/callback', async (req, res) => {
    const { code, state, error } = req.query;

    console.log('🔐 Garmin OAuth callback received:', {
        hasCode: !!code,
        hasState: !!state,
        error
    });

    // If there's an error from Garmin
    if (error) {
        console.error('❌ Garmin OAuth error:', error);
        return res.redirect(`/?error=garmin_auth_failed&message=${encodeURIComponent(error)}`);
    }

    // If we have a code, redirect to frontend with the OAuth params
    // The frontend will handle the token exchange
    if (code && state) {
        // Preserve the OAuth parameters but use a clean URL structure
        const params = new URLSearchParams({
            garmin_code: code,
            garmin_state: state,
            provider: 'garmin'
        });

        // Redirect to clean URL with parameters
        return res.redirect(`/?${params.toString()}#garmin-callback`);
    }

    // No code or error - something went wrong
    res.redirect('/?error=garmin_auth_invalid');
});

// ===== SPECIAL ROUTES =====
// Clean URL routes (without .html)
app.get('/privacy', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'privacy.html'));
});

app.get('/terms', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'terms.html'));
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'about.html'));
});

// ===== CATCH-ALL: Serve index.html for SPA routing =====
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ===== START SERVER =====
async function startServer() {
    // Initialize database first
    const dbReady = await initializeDatabase();

    if (!dbReady) {
        console.error('⚠️  Database not ready, but starting server anyway...');
    }

    app.listen(PORT, '0.0.0.0', () => {
        console.log('\n🚀 Athlytx Unified Service');
        console.log(`📡 Server running on port ${PORT}`);
        console.log(`🌐 Frontend: http://localhost:${PORT}`);
        console.log(`🔌 API: http://localhost:${PORT}/api`);
        console.log(`💾 Database: ${dbReady ? 'Ready ✅' : 'Not configured ⚠️'}`);

        // Start AI Agent scheduled monitoring (if API key is configured)
        if (process.env.ANTHROPIC_API_KEY) {
            try {
                const scheduledMonitor = require('./backend/agents/scheduled-monitor');
                scheduledMonitor.start();
                console.log('🤖 AI Agent monitoring: Enabled ✅\n');
            } catch (error) {
                console.log('⚠️  AI Agent monitoring: Disabled (not configured)\n');
            }
        } else {
            console.log('⚠️  AI Agent monitoring: Disabled (ANTHROPIC_API_KEY not set)\n');
        }
    });
}

startServer();

// ===== GRACEFUL SHUTDOWN =====
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});
