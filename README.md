# Athlytx Unified Platform

**Version 2.0** - Production-ready fitness analytics platform with database persistence and coach sharing.

## 🏗️ Architecture

This is a **unified Node.js service** that serves both:
- **Frontend**: Static HTML/JS single-page application
- **Backend API**: Express REST API for OAuth and data management
- **Database**: PostgreSQL for user data, OAuth tokens, and fitness metrics

```
athlytx-backend/
├── server.js                   # Main entry point
├── frontend/                   # Static frontend files
│   ├── index.html
│   ├── about.html
│   ├── garmin-oauth2.js
│   └── whoop-oauth2.js
├── backend/
│   ├── routes/
│   │   └── legacy-routes.js    # OAuth API endpoints
│   ├── models/                 # Database models (Sequelize)
│   │   ├── User.js
│   │   ├── OAuthToken.js
│   │   ├── CoachAthlete.js
│   │   ├── DailyMetric.js
│   │   └── Activity.js
│   ├── services/               # Business logic (future)
│   ├── middleware/             # Auth, error handling (future)
│   └── utils/
│       └── database.js         # Database connection
└── migrations/                 # Database migrations (future)
```

## 🚀 Deployment to Railway

### Step 1: Add PostgreSQL Database

1. Go to your Railway project dashboard
2. Click **"New"** → **"Database"** → **"Add PostgreSQL"**
3. Railway will automatically set `DATABASE_URL` environment variable

### Step 2: Set Environment Variables

In Railway dashboard, add these variables:

```bash
# Already set (keep existing values)
STRAVA_CLIENT_SECRET=xxx
OURA_CLIENT_SECRET=xxx
GARMIN_CONSUMER_SECRET=xxx
WHOOP_CLIENT_SECRET=xxx

# NEW - Add these:
NODE_ENV=production
SESSION_SECRET=generate-a-random-32-char-string
ENCRYPTION_KEY=generate-a-random-64-char-hex-string
FRONTEND_URL=https://athlytx-backend-production.up.railway.app

# Email (for magic links) - Optional for now
SMTP_HOST=smtp.sendgrid.net
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=noreply@athlytx.com
```

### Step 3: Deploy

```bash
cd /Users/darrenzwiers/Documents/GitHub/athlytx-backend

# Install dependencies locally to test
npm install

# Test locally (optional)
npm start
# Visit http://localhost:3000

# Commit and push to GitHub
git add .
git commit -m "🚀 v2.0: Unified service with PostgreSQL, frontend serving, and database models"
git push origin main

# Railway will auto-deploy! ✅
```

## 📊 What's New in v2.0

### ✅ Completed
- [x] Unified service architecture (frontend + backend in one)
- [x] Static file serving for frontend
- [x] Database models with Sequelize ORM
- [x] PostgreSQL connection with SSL support
- [x] User, OAuth Token, Coach-Athlete, Daily Metrics, Activity models
- [x] Automatic database initialization on startup
- [x] Railway configuration
- [x] All existing OAuth endpoints preserved

### 🚧 Next Phase (To Build)
- [ ] Authentication system (magic link login)
- [ ] Auth middleware for protected routes
- [ ] Data sync service (daily background jobs)
- [ ] Coach invitation system
- [ ] Coach dashboard API endpoints
- [ ] Frontend updates for login/auth
- [ ] Token encryption service

## 🔌 API Endpoints

### Existing OAuth Endpoints (All Working)

**Strava:**
- `POST /api/strava/token` - Exchange auth code for token
- `GET /api/strava/athlete` - Get athlete profile
- `GET /api/strava/activities` - Get recent activities

**Oura:**
- `POST /api/oura/token` - Exchange auth code for token
- `GET /api/oura/personal` - Get personal info
- `GET /api/oura/sleep` - Get sleep data
- `GET /api/oura/readiness` - Get readiness scores
- `GET /api/oura/activity` - Get activity data

**WHOOP:**
- `POST /api/whoop/token` - Exchange auth code for token (PKCE)
- `GET /api/whoop/profile` - Get user profile
- `GET /api/whoop/recovery` - Get recovery data
- `GET /api/whoop/sleep` - Get sleep data
- `GET /api/whoop/workouts` - Get workout data
- `GET /api/whoop/cycles` - Get physiological cycles

**Garmin:**
- `POST /api/garmin/token` - Exchange auth code for token (PKCE)
- `GET /api/garmin/v2/permissions` - Check permissions
- `GET /api/garmin/v2/dailies` - Get daily summaries
- `GET /api/garmin/v2/activities` - Get activities
- `GET /api/garmin/v2/sleep` - Get sleep data

### Health Check
- `GET /health` - Server status and environment check

## 🗄️ Database Schema

### Users
- `id` (UUID, primary key)
- `email` (unique)
- `name`
- `role` (athlete | coach)
- `timezone`
- `lastLogin`

### OAuth Tokens
- `id` (UUID)
- `userId` (foreign key)
- `provider` (strava | oura | garmin | whoop)
- `accessTokenEncrypted` (encrypted with AES-256)
- `refreshTokenEncrypted`
- `expiresAt`
- `scope`

### Coach-Athlete Relationships
- `id` (UUID)
- `coachId` (foreign key to users)
- `athleteId` (foreign key to users)
- `inviteToken`
- `invitedAt`
- `acceptedAt`

### Daily Metrics
- `id` (UUID)
- `userId` (foreign key)
- `date`
- `athlytxScore`, `recoveryComponent`, `sleepComponent`, `strainComponent`
- `hrvAvg`, `restingHr`, `sleepHours`, `sleepQuality`
- `trainingLoad`, `activeCalories`, `steps`
- `dataSources` (JSON: which APIs contributed)
- `syncStatus`

### Activities
- `id` (UUID)
- `userId` (foreign key)
- `externalId` (provider's activity ID)
- `provider`
- `activityType`, `activityName`
- `startTime`, `durationSeconds`, `distanceMeters`
- `calories`, `avgHr`, `maxHr`, `trainingLoad`
- `rawData` (JSON: full API response)

## 🔧 Local Development

```bash
# Install dependencies
npm install

# Create .env file (copy from .env.example)
cp .env.example .env

# Edit .env with your values
# Note: Without DATABASE_URL, it will use SQLite for local testing

# Run server
npm start

# Visit http://localhost:3000
```

## 📝 Migration Notes

### From v1.0 to v2.0

**What Changed:**
- Frontend and backend merged into one repository
- Database added for data persistence
- Frontend now served by Express (no more FTP deployment)
- OAuth tokens will be stored in database (encrypted)
- User authentication system foundation laid

**What Stayed the Same:**
- All OAuth endpoints still work identically
- Frontend code unchanged (for now)
- Same OAuth client IDs
- Same API response formats

**Breaking Changes:**
- None! This is backward compatible.
- Frontend still uses LocalStorage temporarily
- Will migrate to session-based auth in next phase

## 🚧 Roadmap

### Phase 1: Foundation (DONE ✅)
- Unified service structure
- Database models
- Frontend serving

### Phase 2: Authentication (Next)
- Magic link login system
- User registration
- Session management
- Protected routes

### Phase 3: Data Persistence
- Store OAuth tokens in database
- Daily sync service
- Historical data storage
- Athlytx score calculations

### Phase 4: Coach Features
- Coach invitation system
- Coach dashboard
- Athlete management
- Granular permissions

### Phase 5: Production Hardening
- Email service integration
- Cron jobs for daily sync
- Error monitoring
- Performance optimization

## 📞 Support

For issues or questions, check:
- GitHub Issues: https://github.com/zwiersd/athlytx-backend/issues
- Railway Dashboard: https://railway.app

## 📄 License

Private - All Rights Reserved
