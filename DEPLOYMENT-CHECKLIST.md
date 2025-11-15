# 📋 Staging Deployment Checklist

**Date:** _______________
**Deployer:** _______________
**Environment:** Staging

---

## Pre-Deployment (Do First)

### 1. Environment Configuration ⏳
- [ ] Copy `.env.staging.template` to `.env.staging`
- [ ] Generate SESSION_SECRET: `openssl rand -hex 32`
- [ ] Configure DATABASE_URL (PostgreSQL connection string)
- [ ] Set FRONTEND_URL to staging domain
- [ ] Add RESEND_API_KEY for emails
- [ ] Configure OAuth provider credentials (staging keys)
- [ ] Set ENABLE_NEW_INVITE_SYSTEM=false (start disabled)

### 2. Database Setup ⏳
- [ ] Create PostgreSQL database for staging
- [ ] Verify connection: `psql $DATABASE_URL -c "SELECT 1;"`
- [ ] Ensure database is empty or backed up
- [ ] Verify database user has CREATE/ALTER permissions

### 3. Code Preparation ⏳
- [ ] All code changes committed
- [ ] All tests passing locally (93.3%+)
- [ ] No uncommitted changes: `git status`
- [ ] Push to repository: `git push origin main`

---

## Deployment Steps

### 4. Deploy Code ⏳

**Option A: Using deploy script (recommended)**
```bash
./deploy-staging.sh
```

**Option B: Manual deployment**
```bash
# Install dependencies
npm ci --production

# Copy environment
cp .env.staging .env

# Start server (migrations run automatically)
npm start
```

**Option C: Railway/Heroku**
```bash
# Railway
railway up --environment staging

# Heroku
git push heroku main
```

### 5. Verify Deployment ⏳
- [ ] Server started without errors
- [ ] All 6 migrations completed successfully
- [ ] Health check: `curl https://staging.athlytx.com/health`
- [ ] Response: `{"status": "healthy"}`

### 6. Test Routes ⏳
- [ ] GET /access returns 200
- [ ] GET /coach returns 200
- [ ] GET /athlete returns 200
- [ ] GET /coach/onboard returns 200
- [ ] GET /athlete/onboard returns 200
- [ ] GET /invite/accept returns 200

---

## Post-Deployment Verification

### 7. Database Verification ⏳
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Should see: invites, device_shares, oauth_tokens, etc.

-- Check migrations
SELECT * FROM migrations ORDER BY name;

-- Should see all 6 migrations
```

- [ ] All tables exist
- [ ] All migrations recorded
- [ ] Indexes created

### 8. Security Testing ⏳

**Test Authentication:**
```bash
# Should return 401 Unauthorized
curl -X POST https://staging.athlytx.com/api/invite/accept-with-consent \
  -H "Content-Type: application/json" \
  -d '{"token":"test","deviceIds":[],"consent":true}'
```

**Test Email Validation:**
```bash
# Should return 400 Invalid email
curl -X POST https://staging.athlytx.com/api/coach/invite \
  -H "Content-Type: application/json" \
  -d '{"athleteEmail":"invalid-email"}'
```

**Test Rate Limiting:**
```bash
# Make 6 requests quickly - 6th should be 429
for i in {1..6}; do
  curl -X POST https://staging.athlytx.com/api/invite/accept-with-consent \
    -H "Content-Type: application/json" \
    -d '{"token":"test","deviceIds":[]}'
  sleep 1
done
```

- [ ] Authentication required (401)
- [ ] Email validation works (400)
- [ ] Rate limiting triggers (429 after limit)

### 9. Monitor Logs ⏳
- [ ] No critical errors in logs
- [ ] Migrations completed successfully
- [ ] No database connection errors
- [ ] Feature flag status logged

---

## QA Testing

### 10. Run QA Checklist ⏳
Follow **QA-CHECKLIST.md** for comprehensive testing:

- [ ] Critical security tests (15 tests)
- [ ] Functionality tests (18 tests)
- [ ] UI/UX tests (12 tests)

**QA Pass Rate:** ____ / 45 tests

---

## Feature Flag Rollout

### 11. Initial Verification (Feature Flag OFF) ⏳
- [ ] Old system still works
- [ ] New tables exist but unused
- [ ] No errors with feature flag disabled

### 12. Enable New System ⏳
```bash
# Update .env.staging
ENABLE_NEW_INVITE_SYSTEM=true

# Restart server
pm2 restart athlytx-backend
# OR
railway restart
```

- [ ] Feature flag enabled
- [ ] Server restarted
- [ ] No errors on startup

### 13. Test New System ⏳
- [ ] Coach can send invite
- [ ] Athlete receives email
- [ ] Consent screen works
- [ ] Device sharing works
- [ ] Revocation works

---

## Performance Testing

### 14. Response Times ⏳
```bash
# Test API response time
curl -w "@curl-format.txt" -o /dev/null -s https://staging.athlytx.com/health

# Create curl-format.txt:
echo "time_total: %{time_total}s" > curl-format.txt
```

- [ ] Health endpoint < 500ms
- [ ] Frontend pages < 2s load time
- [ ] API endpoints < 500ms

---

## Final Verification

### 15. Complete System Test ⏳

**Test Complete User Flow:**
1. [ ] Coach registers
2. [ ] Coach sends invite
3. [ ] Check email delivered
4. [ ] Athlete clicks invite link
5. [ ] Athlete logs in
6. [ ] Consent screen shows devices
7. [ ] Athlete accepts
8. [ ] Coach can view athlete data
9. [ ] Athlete can revoke access
10. [ ] Coach loses access

---

## Sign-Off

### Deployment Summary

**Environment:** Staging
**Date Deployed:** _______________
**Deployed By:** _______________

**Tests Passed:** ____ / 45
**Critical Issues:** ____
**Blockers:** ____

**Health Status:**
- [ ] ✅ All systems healthy
- [ ] ✅ No critical errors
- [ ] ✅ Performance acceptable
- [ ] ✅ Security verified

### Approval

**Ready for Production?**
- [ ] YES - All tests passed, no blockers
- [ ] NO - Issues found (list below)
- [ ] PARTIAL - Minor issues, can proceed with caution

**Issues Found:**
1. _____________________________
2. _____________________________
3. _____________________________

**Next Steps:**
- [ ] Fix blocking issues
- [ ] Re-test
- [ ] Deploy to production
- [ ] Monitor for 24 hours

---

**Technical Lead Sign-Off:** _______________
**Date:** _______________

**QA Sign-Off:** _______________
**Date:** _______________

---

## Rollback Plan (If Needed)

### Quick Rollback (Feature Flag)
```bash
# Disable new system
ENABLE_NEW_INVITE_SYSTEM=false

# Restart
pm2 restart athlytx-backend
```

### Full Rollback (Code)
```bash
# Revert to previous version
git checkout <previous-commit>

# Redeploy
./deploy-staging.sh
```

### Database Rollback (Last Resort)
```bash
# Restore backup
pg_restore -d athlytx_staging backup.sql
```

---

**Checklist Completed:** _______________
**Deployment Status:** ⏳ In Progress | ✅ Complete | ❌ Failed
