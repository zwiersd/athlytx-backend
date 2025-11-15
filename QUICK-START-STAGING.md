# 🚀 Quick Start: Staging Deployment

This guide will get your staging environment up and running in ~15 minutes.

## Prerequisites

- [ ] Railway account (or your chosen hosting platform)
- [ ] PostgreSQL database provisioned
- [ ] Domain/subdomain configured (e.g., staging.athlytx.com)
- [ ] OAuth credentials from Garmin, Strava, etc.

## Step 1: Environment Setup (5 min)

```bash
# Copy the template
cp .env.staging.template .env.staging

# Edit with your actual values
nano .env.staging  # or use your preferred editor
```

**Critical variables to update:**
- `DATABASE_URL` - Your PostgreSQL connection string
- `JWT_SECRET` - Generate with `openssl rand -hex 32`
- `GARMIN_CONSUMER_KEY` & `GARMIN_CONSUMER_SECRET`
- `STRAVA_CLIENT_ID` & `STRAVA_CLIENT_SECRET`
- `FRONTEND_URL` - Your staging frontend URL

## Step 2: Database Migrations (2 min)

```bash
# Run migrations
npm run migrate

# Verify tables created
npm run db:verify
```

## Step 3: Deploy to Railway (5 min)

```bash
# Install Railway CLI if not installed
npm install -g railway

# Login
railway login

# Link to your project
railway link

# Deploy
railway up
```

**Alternative: Manual deployment script**
```bash
# Make executable
chmod +x deploy-staging.sh

# Run deployment
./deploy-staging.sh
```

## Step 4: Verify Deployment (3 min)

### Health Check
```bash
curl https://your-staging-url.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-11-15T..."
}
```

### Test Key Routes

1. **Frontend Routes:**
   - `GET /` - Landing page
   - `GET /coach` - Coach login
   - `GET /athlete` - Athlete login
   - `GET /access` - Access control page

2. **API Health:**
   - `GET /api/health` - API status
   - `GET /api/coach/dashboard` - Should require auth

### Quick Integration Test

```bash
# Install test dependencies
npm install --save-dev

# Run integration tests against staging
BACKEND_URL=https://your-staging-url.railway.app npm test
```

## Step 5: Configure OAuth Callbacks

Update callback URLs in your OAuth provider dashboards:

### Garmin
- Redirect URI: `https://your-staging-url.railway.app/garmin/callback`
- Deregistration URI: `https://your-staging-url.railway.app/garmin/deregister`

### Strava
- Authorization Callback: `https://your-staging-url.railway.app/strava/callback`

### WHOOP
- Redirect URI: `https://your-staging-url.railway.app/whoop/callback`

## Troubleshooting

### Database connection fails
```bash
# Test connection string
railway run node -e "require('./backend/models').sequelize.authenticate().then(() => console.log('✅ Connected')).catch(e => console.error('❌', e))"
```

### OAuth errors
- Verify callback URLs match exactly (no trailing slashes)
- Check consumer keys/secrets are correct
- Ensure HTTPS is enabled

### Migrations fail
```bash
# Check migration status
railway run npm run db:status

# Reset and retry (CAUTION: drops all data)
railway run npm run db:reset
railway run npm run migrate
```

## What's Next?

- [ ] Test complete user flows (coach signup → athlete invite → data sync)
- [ ] Monitor logs: `railway logs`
- [ ] Set up monitoring/alerting
- [ ] Load test with realistic data
- [ ] Review DEPLOYMENT-CHECKLIST.md for comprehensive QA

## Production Deploy

Once staging is stable for 1-2 weeks:
1. Follow same process with production environment variables
2. Update DNS to production domain
3. Enable production OAuth apps
4. Monitor closely for 24-48 hours

---

**Need Help?**
- Full checklist: `DEPLOYMENT-CHECKLIST.md`
- Detailed guide: `STAGING-DEPLOYMENT.md`
- Health report: `HEALTH-CHECK-REPORT.md`
