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
app.use(express.json());
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
            connected: !!process.env.DATABASE_URL,
            dialect: dbDialect,
            type: dbDialect === 'postgres' ? 'PostgreSQL' : 'SQLite'
        }
    });
});

// Import legacy routes (existing OAuth endpoints)
const legacyRoutes = require('./backend/routes/legacy-routes');
legacyRoutes(app);

// Import new routes
const syncRoutes = require('./backend/routes/sync');
const testRoutes = require('./backend/routes/test-garmin');
app.use('/api/sync', syncRoutes);
app.use('/api/test', testRoutes);

// Import future routes (will create these next)
// const authRoutes = require('./backend/routes/auth');
// const coachRoutes = require('./backend/routes/coach');
// app.use('/api/auth', authRoutes);
// app.use('/api/coach', coachRoutes);

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

    app.listen(PORT, () => {
        console.log('\n🚀 Athlytx Unified Service');
        console.log(`📡 Server running on port ${PORT}`);
        console.log(`🌐 Frontend: http://localhost:${PORT}`);
        console.log(`🔌 API: http://localhost:${PORT}/api`);
        console.log(`💾 Database: ${dbReady ? 'Ready ✅' : 'Not configured ⚠️'}\n`);
    });
}

startServer();

// ===== GRACEFUL SHUTDOWN =====
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});
