# 🚀 Deployment Checklist for Railway

Follow these steps to deploy Athlytx v2.0 to production.

## Pre-Deployment Checklist

- [x] Frontend files copied to `frontend/` directory
- [x] Database models created
- [x] Server.js updated to serve static files
- [x] Railway.json configuration file added
- [x] .env.example created
- [x] Dependencies installed and tested
- [ ] PostgreSQL added to Railway project
- [ ] Environment variables configured
- [ ] Code committed and pushed

---

## Step 1: Add PostgreSQL to Railway

1. Open your Railway dashboard: https://railway.app
2. Navigate to your `athlytx-backend` project
3. Click **"New"** → **"Database"** → **"Add PostgreSQL"**
4. Wait for provisioning (~30 seconds)
5. ✅ Railway automatically sets `DATABASE_URL` environment variable

---

## Step 2: Set Environment Variables

Go to your Railway service → **Variables** tab and add:

### Required Variables (Add These)

```bash
SESSION_SECRET=your-random-32-character-secret-here
ENCRYPTION_KEY=your-64-character-hex-key-here
FRONTEND_URL=https://athlytx-backend-production.up.railway.app
NODE_ENV=production
```

**How to generate secrets:**
```bash
# SESSION_SECRET (32 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# ENCRYPTION_KEY (32 bytes = 64 hex characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Existing Variables (Keep These)

These should already be set from your original deployment:

```bash
STRAVA_CLIENT_ID=167615
STRAVA_CLIENT_SECRET=xxxxx
OURA_CLIENT_SECRET=xxxxx
GARMIN_CONSUMER_KEY=ee6809d5-abc0-4a33-b38a-d433e5045987
GARMIN_CONSUMER_SECRET=xxxxx
WHOOP_CLIENT_ID=31c6c2ac-890c-46ef-81da-b961c1cb1ca7
WHOOP_CLIENT_SECRET=xxxxx
```

### Optional (Email for Magic Links - Add Later)

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=noreply@athlytx.com
```

---

## Step 3: Commit and Deploy

```bash
cd /Users/darrenzwiers/Documents/GitHub/athlytx-backend

# Check what files will be committed
git status

# Add all files
git add .

# Commit
git commit -m "🚀 v2.0: Unified service with PostgreSQL and frontend serving

- Merged frontend and backend into single service
- Added PostgreSQL database with Sequelize ORM
- Created User, OAuthToken, CoachAthlete, DailyMetric, Activity models
- Server now serves static frontend files from /frontend
- All existing OAuth API endpoints preserved
- Railway configuration added
- Foundation for authentication and coach sharing"

# Push to GitHub
git push origin main
```

Railway will automatically:
1. Detect the push
2. Install dependencies
3. Run `npm start`
4. Deploy your app
5. Create/update database tables

---

## Step 4: Verify Deployment

### Check Railway Logs

1. Go to Railway dashboard
2. Click on your service
3. Go to **"Deployments"** tab
4. Click latest deployment
5. Check logs for:

```
✅ Database connection successful
✅ Database models synchronized
🚀 Athlytx Unified Service
📡 Server running on port 3000
🌐 Frontend: http://localhost:3000
🔌 API: http://localhost:3000/api
💾 Database: Ready ✅
```

### Test Endpoints

**Health Check:**
```bash
curl https://athlytx-backend-production.up.railway.app/health
```

Expected response:
```json
{
  "message": "Athlytx Unified Service Live! 🚀",
  "status": "healthy",
  "version": "2.0.0",
  "features": ["frontend", "api", "database", "auth", "coach-sharing"]
}
```

**Frontend:**

Visit: `https://athlytx-backend-production.up.railway.app`

Should load your index.html with all the Athlytx dashboard!

**API:**

All existing OAuth endpoints should still work:
- `/api/strava/token`
- `/api/oura/token`
- `/api/garmin/token`
- `/api/whoop/token`
- etc.

---

## Step 5: Update OAuth Redirect URIs

After deployment, you need to update redirect URIs in each provider:

### Strava
1. Go to https://www.strava.com/settings/api
2. Update **Authorization Callback Domain** to: `athlytx-backend-production.up.railway.app`

### Oura
1. Go to Oura developer dashboard
2. Update redirect URI to: `https://athlytx-backend-production.up.railway.app`

### Garmin
1. Go to Garmin developer dashboard
2. Update redirect URI to: `https://athlytx-backend-production.up.railway.app`

### WHOOP
1. Go to WHOOP developer dashboard
2. Update redirect URI to: `https://athlytx-backend-production.up.railway.app`

---

## Step 6: Update Frontend Configuration (Optional)

If your frontend has hardcoded backend URL, update it in `frontend/index.html`:

Find:
```javascript
const API_CONFIG = {
    backend: 'https://athlytx-backend-production.up.railway.app',
    // ...
}
```

Make sure it points to the correct Railway URL.

---

## Post-Deployment Verification

### ✅ Checklist

- [ ] Health endpoint returns 200 OK
- [ ] Frontend loads at root URL
- [ ] Database connection shows as "Ready ✅" in logs
- [ ] All 4 OAuth providers' redirect URIs updated
- [ ] Test OAuth flow with one provider (e.g., Strava)
- [ ] Check Railway logs for any errors
- [ ] Verify database tables were created (check Railway PostgreSQL)

### Database Tables Created

You should see these tables in PostgreSQL:

- `users`
- `magic_links`
- `oauth_tokens`
- `coach_athletes`
- `daily_metrics`
- `activities`

To check in Railway:
1. Go to PostgreSQL service
2. Click **"Data"** tab
3. View tables

---

## Rollback Plan

If something goes wrong:

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or force push previous version
git reset --hard <previous-commit-hash>
git push --force origin main
```

Railway will auto-deploy the previous version.

---

## Common Issues & Solutions

### Issue: Database connection fails

**Solution:** Check that `DATABASE_URL` is set in Railway variables. It should be auto-set when you add PostgreSQL.

### Issue: Frontend returns 404

**Solution:** Make sure all files are in `frontend/` directory and committed to git.

### Issue: OAuth redirects fail

**Solution:** Update redirect URIs in all provider dashboards to match your Railway URL.

### Issue: "crypto" module error

**Solution:** Remove `crypto` from package.json dependencies (it's built-in to Node.js).

---

## Next Steps

After successful deployment:

1. **Test all OAuth flows** with real accounts
2. **Monitor Railway logs** for first 24 hours
3. **Plan Phase 2**: Authentication system implementation
4. **Set up custom domain** (optional): athlytx.com → Railway
5. **Enable database backups** in Railway

---

## Support

- Railway Dashboard: https://railway.app
- GitHub Repo: https://github.com/zwiersd/athlytx-backend
- Railway Docs: https://docs.railway.app

---

**Ready to deploy?** Start with Step 1! 🚀
