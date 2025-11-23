# Athlytx - Intelligent Fitness Analytics Platform

**Version 3.0** - Production platform with advanced analytics, multi-device integration, and coach-athlete sharing.

## 🎯 Overview

Athlytx is a comprehensive fitness analytics platform that unifies data from Strava, Garmin, Oura, and Whoop to provide intelligent training readiness scores, recovery insights, and performance analytics.

## 🏗️ Architecture

Unified **Node.js/Express** application serving both frontend and backend:

```
athlytx-backend/
├── server.js                      # Main entry point
├── frontend/                      # Static SPA
│   ├── index.html                 # Athlete dashboard
│   ├── coach-elite.html          # Coach dashboard
│   ├── athlete-dashboard.html    # Shared athlete view
│   ├── about.html                # About/landing page
│   └── styles/
│       ├── dashboard.css         # Main UI styles
│       └── layout.css            # Layout & responsive design
├── backend/
│   ├── routes/
│   │   ├── authentication.js     # Magic link login
│   │   ├── legacy-routes.js      # OAuth endpoints (Strava, Oura, Whoop)
│   │   ├── garmin-health.js      # Garmin PUSH webhooks
│   │   ├── devices.js            # Connected device management
│   │   ├── coach.js              # Coach endpoints
│   │   ├── athlete.js            # Athlete management
│   │   ├── invite.js             # Coach-athlete invitations
│   │   ├── sync.js               # Data sync operations
│   │   └── agent.js              # AI agent integration
│   ├── models/                   # Database models (Sequelize)
│   │   ├── User.js
│   │   ├── OAuthToken.js
│   │   ├── CoachAthlete.js
│   │   ├── DailyMetric.js
│   │   ├── Activity.js
│   │   ├── GarminActivity.js
│   │   └── GarminDaily.js
│   └── utils/
│       └── database.js           # PostgreSQL connection
└── migrations/                   # Database migrations
```

## ✨ Key Features

### 🎨 Modern UI/UX
- **Vertical Sidebar Navigation** - Fint-inspired design with smooth animations
- **Glassmorphism Design** - Beautiful frosted glass cards with backdrop blur
- **Mobile Responsive** - Hamburger menu, optimized for all screen sizes
- **Real-time Updates** - Live connection status, sync indicators, and data refresh
- **Professional Account Page** - Profile cards with avatar, stats, and service status

### 📊 Athlytx Score Algorithm
- **Intelligent Readiness Calculation** - Combines recovery, sleep, strain, and HRV trends
- **Confidence Scoring** - Shows data quality and algorithm certainty
- **Multi-source Aggregation** - Merges data from all connected devices
- **Period Analysis** - 7/14/30/90-day views plus "Today" snapshot
- **Recovery Metrics** - CTL (Chronic Training Load), ATL (Acute Training Load), TSB (Training Stress Balance)

### 🔌 Device Integrations

**Garmin** (PUSH + PULL APIs):
- Daily summaries (Body Battery, HRV, stress, sleep, steps)
- Activities with full metrics
- Real-time webhook notifications
- Backfill historical data
- Database persistence

**Strava**:
- Activities with GPS data
- Performance metrics
- Segment efforts

**Oura Ring**:
- Sleep stages and quality
- Readiness scores
- HRV and resting HR
- Activity tracking

**Whoop**:
- Recovery scores
- Strain tracking
- Sleep performance
- Physiological cycles

### 👥 Coach Features
- Coach-athlete invitation system
- Multi-athlete dashboard
- Athlete selector in header
- View athlete analytics as coach
- Granular permission management

### 🔐 Authentication
- Magic link email login
- Session-based auth with JWT
- Encrypted OAuth token storage (AES-256)
- Secure cookie handling

## 🚀 Deployment (Railway)

### Prerequisites
1. Railway account connected to GitHub
2. PostgreSQL database provisioned
3. Custom domain configured (optional)

### Environment Variables

```bash
# Database (auto-set by Railway PostgreSQL)
DATABASE_URL=postgresql://...

# Application
NODE_ENV=production
SESSION_SECRET=random-32-char-string
ENCRYPTION_KEY=random-64-char-hex-string
FRONTEND_URL=https://www.athlytx.com

# OAuth Client Secrets
STRAVA_CLIENT_SECRET=xxx
OURA_CLIENT_SECRET=xxx
GARMIN_CONSUMER_SECRET=xxx
WHOOP_CLIENT_SECRET=xxx

# Email (Resend)
RESEND_API_KEY=re_xxx

# Optional: AI Agent
ANTHROPIC_API_KEY=sk-ant-xxx
```

### Deploy

```bash
# Push to GitHub (Railway auto-deploys)
git add .
git commit -m "Deploy latest changes"
git push origin main
```

## 🔧 Local Development

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Add your API keys to .env

# Start server
npm start

# Visit http://localhost:3000
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/send-magic-link` - Send login email
- `GET /api/auth/verify` - Verify magic link token
- `POST /api/auth/logout` - End session
- `POST /api/signup` - Create new user account

### OAuth Integration
**Strava:**
- `POST /api/strava/token` - Exchange auth code
- `GET /api/strava/athlete` - Get profile
- `GET /api/strava/activities` - Get activities

**Oura:**
- `POST /api/oura/token` - Exchange auth code
- `GET /api/oura/personal` - Get personal info
- `GET /api/oura/sleep` - Get sleep data
- `GET /api/oura/readiness` - Get readiness scores
- `GET /api/oura/activity` - Get activity data

**Whoop:**
- `POST /api/whoop/token` - Exchange auth code (PKCE)
- `GET /api/whoop/profile` - Get user profile
- `GET /api/whoop/recovery` - Get recovery data
- `GET /api/whoop/sleep` - Get sleep data
- `GET /api/whoop/workouts` - Get workouts
- `GET /api/whoop/cycles` - Get physiological cycles

**Garmin:**
- `POST /api/garmin/token` - Exchange auth code (PKCE)
- `POST /api/garmin/push` - Webhook for PUSH notifications
- `GET /api/garmin/ping` - Health check for Garmin
- `GET /api/garmin/v2/dailies` - Get daily summaries
- `GET /api/garmin/v2/activities` - Get activities
- `POST /api/garmin/backfill` - Backfill historical data
- `GET /api/garmin/db/activities` - Get stored activities
- `GET /api/garmin/db/dailies` - Get stored dailies

### Device Management
- `GET /api/devices/connected` - List connected devices
- `POST /api/devices/disconnect` - Disconnect a device

### Coach Features
- `POST /api/coach/invite` - Send athlete invitation
- `GET /api/coach/athletes` - List coach's athletes
- `GET /api/athlete/data` - Get athlete fitness data
- `POST /api/invite/accept` - Accept coach invitation

### Data Sync
- `POST /api/sync/all` - Trigger full data sync
- `GET /api/sync/status` - Check sync status

## 🗄️ Database Schema

### Users
- `id` (UUID, primary key)
- `email` (unique, indexed)
- `name`
- `role` (athlete | coach)
- `timezone`
- `lastLogin`
- `createdAt`

### OAuth Tokens
- `id` (UUID)
- `userId` (foreign key, indexed)
- `provider` (strava | oura | garmin | whoop)
- `accessTokenEncrypted` (AES-256)
- `refreshTokenEncrypted` (AES-256)
- `expiresAt`
- `scope`
- `lastSync`
- `status` (active | expired | revoked)

### Garmin Activities
- `id` (UUID)
- `userId` (foreign key, indexed)
- `activityId` (Garmin's ID, unique)
- `activityType` (RUNNING, CYCLING, etc.)
- `activityName`
- `startTimeInSeconds`
- `durationInSeconds`
- `distanceInMeters`
- `activeKilocalories`
- `averageHeartRateInBeatsPerMinute`
- `maxHeartRateInBeatsPerMinute`
- `metadata` (JSON - full webhook payload)

### Garmin Dailies
- `id` (UUID)
- `userId` (foreign key, indexed)
- `calendarDate` (indexed)
- `steps`
- `distanceInMeters`
- `activeTimeInSeconds`
- `bodyBatteryHighestValue`
- `bodyBatteryChargedValue`
- `bodyBatteryDrainedValue`
- `averageStressLevel`
- `restingHr`
- `hrvAvg`
- `sleepingSeconds`
- `deepSleepSeconds`
- `lightSleepSeconds`
- `remSleepSeconds`
- `awakeSleepSeconds`
- `metadata` (JSON - full webhook payload)

### Coach-Athlete Relationships
- `id` (UUID)
- `coachId` (foreign key)
- `athleteId` (foreign key)
- `inviteToken` (unique)
- `invitedAt`
- `acceptedAt`
- `status` (pending | accepted | revoked)

### Daily Metrics
- `id` (UUID)
- `userId` (foreign key, indexed)
- `date` (indexed)
- `athlytxScore`
- `recoveryComponent`
- `sleepComponent`
- `strainComponent`
- `hrvAvg`
- `restingHr`
- `sleepHours`
- `trainingLoad`
- `dataSources` (JSON)
- `syncStatus`

## 🎨 Frontend Features

### Dashboard Views
1. **Overview** - Athlytx score, readiness status, key metrics
2. **Running** - Activity analytics with period selectors
3. **Strava** - Activity feed and performance data
4. **Garmin** - Health metrics, Body Battery, stress, HRV
5. **Oura** - Sleep stages, readiness, recovery
6. **Whoop** - Recovery scores, strain, sleep performance
7. **Account** - Profile, connected services, stats

### Design System
- **Glass Cards** - `rgba(255,255,255,0.08)` with backdrop blur
- **Gradient Avatars** - `linear-gradient(135deg, #667eea, #764ba2)`
- **Color Scheme** - Dark mode with purple/blue accents
- **Typography** - Inter font family, system fallbacks
- **Animations** - Cubic-bezier easing, smooth transitions

### Responsive Breakpoints
- Desktop: Sidebar + full layout
- Tablet: Collapsible sidebar
- Mobile: Hamburger menu, stacked cards

## 🚧 Roadmap

### ✅ Completed
- [x] Unified service architecture
- [x] Database models and migrations
- [x] Magic link authentication
- [x] OAuth integration (4 providers)
- [x] Garmin PUSH webhooks
- [x] Database storage for Garmin data
- [x] Athlytx score algorithm v3.0
- [x] Coach-athlete system
- [x] Modern UI redesign (Fint-inspired)
- [x] Account page with live stats
- [x] Connection status indicators
- [x] Period selectors for analytics
- [x] Mobile responsive design

### 🔜 Next Phase
- [ ] Background sync jobs (node-cron)
- [ ] Historical data backfill UI
- [ ] Export analytics (PDF/CSV)
- [ ] Training plan recommendations
- [ ] Workout library
- [ ] Custom goal tracking
- [ ] Mobile app (React Native)
- [ ] API rate limiting improvements
- [ ] Comprehensive error monitoring

## 📊 Analytics Features

### Athlytx Score Components
1. **Recovery (40% weight)**
   - Device readiness (Oura/Whoop)
   - HRV trends (7-day vs 30-day baseline)
   - Resting HR trends
   - Physiological stress indicators

2. **Sleep (30% weight)**
   - Sleep duration vs baseline
   - Sleep quality/efficiency
   - REM and deep sleep percentages
   - Sleep consistency

3. **Strain (20% weight)**
   - Training load (CTL/ATL/TSB)
   - Recent workout intensity
   - Active calories
   - Strain-recovery balance

4. **HRV Trends (10% weight)**
   - Short-term variability
   - Long-term baseline comparison
   - Recovery velocity
   - Parasympathetic tone

### Confidence Calculation
- **High (80-100%)** - 7+ days of quality data from multiple sources
- **Medium (50-79%)** - 3-6 days of data or single source
- **Low (<50%)** - Insufficient data or gaps

## 🔒 Security

- **OAuth Token Encryption** - AES-256-GCM with unique keys
- **Session Security** - HTTP-only cookies, secure flags in production
- **CSRF Protection** - Token validation on state changes
- **Rate Limiting** - API endpoint throttling
- **SQL Injection Prevention** - Parameterized queries via Sequelize
- **Input Validation** - Server-side validation on all inputs

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/zwiersd/athlytx-backend/issues)
- **Deployment**: [Railway Dashboard](https://railway.app)
- **Production**: [www.athlytx.com](https://www.athlytx.com)

## 📄 License

Private - All Rights Reserved

---

**Built with**: Node.js, Express, PostgreSQL, Sequelize, Garmin Health API, Strava API, Oura API, Whoop API
