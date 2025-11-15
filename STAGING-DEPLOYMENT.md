# 🚀 Staging Deployment Guide
## Athlytx Coach-Athlete Invitation System

**Date:** 2025-11-15
**Version:** 2.0.0
**Status:** Ready for Staging Deployment

---

## 📋 Pre-Deployment Checklist

### ✅ Code Quality
- [x] All critical security issues fixed
- [x] All high-priority bugs resolved
- [x] Integration tests passing (93.3%)
- [x] Server runs without errors
- [x] All migrations tested

### ✅ Documentation
- [x] AUDIT-REPORT.md - Comprehensive security audit
- [x] SECURITY-FIXES-COMPLETE.md - Fix documentation
- [x] PHASE-4-5-SUMMARY.md - Testing & deployment guide
- [x] This deployment guide

### ⏳ Before Deploying
- [ ] Backup production database
- [ ] Review environment variables
- [ ] Test SSL/TLS certificates
- [ ] Verify DNS configuration
- [ ] Set up error monitoring (optional)

---

## 🌐 Staging Environment Setup

### 1. Environment Variables

Create a `.env.staging` file with:

```bash
# Database (Use staging database, NOT production!)
DATABASE_URL=postgresql://user:pass@staging-db-host:5432/athlytx_staging

# Application
NODE_ENV=staging
PORT=3000
FRONTEND_URL=https://staging.athlytx.com

# Security
SESSION_SECRET=<generate-with-openssl-rand-hex-32>
ENABLE_NEW_INVITE_SYSTEM=false  # Start disabled, enable after verification

# Email (Resend)
RESEND_API_KEY=re_staging_...

# OAuth Providers (Use test credentials if available)
STRAVA_CLIENT_ID=staging_...
STRAVA_CLIENT_SECRET=staging_...
OURA_CLIENT_ID=staging_...
OURA_CLIENT_SECRET=staging_...
WHOOP_CLIENT_ID=staging_...
WHOOP_CLIENT_SECRET=staging_...
GARMIN_CONSUMER_KEY=staging_...
GARMIN_CONSUMER_SECRET=staging_...

# Monitoring (Optional)
SENTRY_DSN=https://...@sentry.io/...
LOG_LEVEL=debug
```

#### Generate SESSION_SECRET:
```bash
openssl rand -hex 32
```

---

## 📦 Deployment Steps

### Step 1: Prepare Database

```bash
# 1. Create staging database
createdb athlytx_staging

# OR for PostgreSQL on hosting provider:
# Create database via hosting panel/CLI

# 2. Verify connection
psql $DATABASE_URL -c "SELECT version();"
```

### Step 2: Deploy Code

#### Option A: Git Deployment (Recommended)
```bash
# 1. Push to staging branch
git checkout main
git pull
git push origin main:staging

# 2. On staging server:
git clone <repo-url> athlytx-backend
cd athlytx-backend
git checkout staging

# 3. Install dependencies
npm ci --production

# 4. Copy environment file
cp .env.staging .env

# 5. Start server
npm start
```

#### Option B: Railway/Heroku Deployment
```bash
# Railway
railway up --environment staging

# Heroku
git push heroku staging:main
```

#### Option C: Docker Deployment
```dockerfile
# Dockerfile already exists, just build and run
docker build -t athlytx-backend:staging .
docker run -d \
  --name athlytx-staging \
  --env-file .env.staging \
  -p 3000:3000 \
  athlytx-backend:staging
```

### Step 3: Run Migrations

Migrations run automatically on server startup, but verify:

```bash
# Check logs for migration completion
npm start 2>&1 | grep MIGRATION

# You should see:
# ✅ [MIGRATION-001] Invites table
# ✅ [MIGRATION-002] DeviceShares table
# ✅ [MIGRATION-003] Device sharing columns
# ✅ [MIGRATION-004] Performance indexes
# ✅ [MIGRATION-005] Backfill DeviceShares
# ✅ [MIGRATION-006] Migrate pending invites
# ✅ All invite system migrations complete!
```

### Step 4: Verify Health

```bash
# Test health endpoint
curl https://staging.athlytx.com/health

# Expected response:
{
  "message": "Athlytx Unified Service Live! 🚀",
  "status": "healthy",
  "version": "2.0.0",
  "features": ["frontend", "api", "database", "auth", "coach-sharing"],
  "database": {
    "hasUrl": true,
    "dialect": "postgres",
    "type": "PostgreSQL"
  }
}
```

### Step 5: Test Frontend Routes

```bash
# Test all frontend pages
curl -I https://staging.athlytx.com/access  # Should return 200
curl -I https://staging.athlytx.com/coach  # Should return 200
curl -I https://staging.athlytx.com/athlete  # Should return 200
curl -I https://staging.athlytx.com/invite/accept  # Should return 200
```

---

## 🧪 Smoke Testing on Staging

### 1. API Smoke Tests

```bash
# Test rate limiting
for i in {1..6}; do
  curl -X POST https://staging.athlytx.com/api/invite/accept-with-consent \
    -H "Content-Type: application/json" \
    -d '{"token":"test","deviceIds":[],"consent":true}'
  echo "Request $i"
  sleep 1
done

# After 5 requests, should get 429 (rate limited)
```

### 2. Frontend Smoke Tests

Visit in browser:
- [ ] https://staging.athlytx.com/access - Landing page loads
- [ ] https://staging.athlytx.com/coach - Coach login page loads
- [ ] https://staging.athlytx.com/athlete - Athlete login page loads
- [ ] https://staging.athlytx.com/coach/onboard - Coach registration loads
- [ ] All pages are mobile responsive
- [ ] No console errors in browser

### 3. Database Smoke Tests

```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Should include:
-- - invites
-- - device_shares
-- - oauth_tokens
-- - coach_athletes
-- - users

-- Verify indexes
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('invites', 'device_shares');

-- Should include rate limiting indexes
```

---

## 🔍 Post-Deployment Verification

### Security Checks

```bash
# 1. Test authentication is required
curl -X POST https://staging.athlytx.com/api/invite/accept-with-consent \
  -H "Content-Type: application/json" \
  -d '{"token":"test","deviceIds":[],"consent":true}'

# Expected: 401 Unauthorized

# 2. Test email validation
curl -X POST https://staging.athlytx.com/api/coach/invite \
  -H "Content-Type: application/json" \
  -d '{"athleteEmail":"invalid-email","coachId":"test"}'

# Expected: 400 Invalid email format

# 3. Test timing-safe comparison (manual - observe response times are consistent)
time curl https://staging.athlytx.com/api/invite/accept?token=invalid-token-1
time curl https://staging.athlytx.com/api/invite/accept?token=invalid-token-2
# Response times should be similar (~100ms + network latency)
```

### Performance Checks

```bash
# Test API response times
curl -w "@curl-format.txt" -o /dev/null -s https://staging.athlytx.com/health

# Create curl-format.txt:
echo "time_total: %{time_total}s\ntime_starttransfer: %{time_starttransfer}s" > curl-format.txt

# Expected: < 500ms total time
```

---

## 📊 Monitoring Setup (Optional but Recommended)

### Option 1: Simple Logging
```bash
# View logs
pm2 logs  # If using PM2
docker logs athlytx-staging  # If using Docker
railway logs  # If using Railway
heroku logs --tail  # If using Heroku
```

### Option 2: Error Tracking (Sentry)
```bash
npm install @sentry/node

# Add to server.js (already configured if SENTRY_DSN is set)
```

### Option 3: Uptime Monitoring
Use services like:
- UptimeRobot (free)
- Pingdom
- StatusCake

Monitor: `https://staging.athlytx.com/health`

---

## 🚦 Feature Flag Rollout

### Phase 1: Disabled (Day 1)
```bash
# In .env.staging
ENABLE_NEW_INVITE_SYSTEM=false
```
- New system is deployed but not active
- Old invite system continues working
- Safe to verify all code deployed correctly

### Phase 2: Testing (Days 2-3)
```bash
# Enable for testing
ENABLE_NEW_INVITE_SYSTEM=true
```
- Test complete invite flows
- Create test invitations
- Accept invitations
- Verify device sharing
- Test revocation

### Phase 3: Beta Users (Days 4-7)
- Select beta users/coaches
- Monitor closely for errors
- Gather feedback

### Phase 4: Full Rollout (Day 8+)
- All users on new system
- Monitor metrics
- Be ready to rollback if needed

---

## ↩️ Rollback Plan

### Quick Rollback (Feature Flag)
```bash
# Disable new system immediately
ENABLE_NEW_INVITE_SYSTEM=false
pm2 restart athlytx-backend  # or equivalent
```
- Old system takes over
- Zero downtime
- New data remains in database

### Full Rollback (Code)
```bash
# Revert to previous version
git checkout <previous-commit-hash>
pm2 restart athlytx-backend

# Or redeploy previous version
```

### Database Rollback (LAST RESORT)
```bash
# Restore from backup
pg_restore -d athlytx_staging backup-YYYYMMDD.sql

# Only if critical data corruption
```

---

## ✅ Success Criteria

Staging deployment is successful if:

- [ ] All smoke tests pass
- [ ] No errors in logs (first 1 hour)
- [ ] Health endpoint returns healthy
- [ ] All frontend pages load
- [ ] Authentication works
- [ ] Rate limiting triggers properly
- [ ] Email validation works
- [ ] No database connection issues
- [ ] Response times < 500ms
- [ ] Can create and accept invite (manually)

---

## 📞 Support & Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check DATABASE_URL is correct
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Check firewall rules allow connection
```

#### Migrations Failed
```bash
# Check migration logs
npm start 2>&1 | grep -A 5 MIGRATION

# Manually run migrations if needed
node -e "require('./backend/models').initializeDatabase()"
```

#### Rate Limiting Not Working
```bash
# Check express-rate-limit is installed
npm list express-rate-limit

# Verify routes are using middleware
grep -r "rateLimiter" backend/routes/
```

#### Port Already in Use
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm start
```

---

## 📈 Next Steps After Staging

Once staging is verified:

1. **Production Deployment**
   - Follow same steps with production environment
   - Use production database
   - Enable monitoring
   - Set up backups

2. **Final QA** (see QA-CHECKLIST.md)
   - Complete end-to-end testing
   - Security verification
   - Performance testing
   - User acceptance testing

3. **Go Live**
   - Enable feature flag
   - Monitor closely (24-48 hours)
   - Be ready for quick rollback
   - Gather user feedback

---

**Deployment Date:** _______________
**Deployed By:** _______________
**Sign-off:** _______________

**Staging URL:** https://staging.athlytx.com
**Status:** ⏳ Pending Deployment
