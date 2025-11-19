# Athlytx Garmin Integration - Important Context

## Critical Rules
1. **NO PULLING from Garmin API** - PUSH webhooks only (Garmin production requirement)
2. **All Garmin endpoints MUST use `www.athlytx.com`** not Railway URL
3. Frontend at `www.athlytx.com` proxies to Railway backend

## Known Issues Fixed
- **userId orphaning**: Multiple userIds created when localStorage clears
- **Webhook duplicate tokens**: Webhook was using old token, now uses most recent
- **Data migration**: Activities orphaned under userId `3c37dd1f-25f8-4212-afcf-52a7d37f0903` (migrated to `82b58332-34e2-41c2-9599-c8a3b5511175`)

## Current Setup
- **Webhook**: `https://www.athlytx.com/api/garmin/push` (working, tested)
- **User's Garmin GUID**: `f1d91633-0bcf-48a4-b94c-5664e3994c11`
- **User's current userId**: `82b58332-34e2-41c2-9599-c8a3b5511175`
- **Status**: Activities working (4 shown), daily health data NOT coming through

## Architecture
- Backend: Railway (`athlytx-backend-production.up.railway.app`)
- Frontend: `www.athlytx.com` (served by same backend)
- Webhook file: `backend/routes/garmin-health.js` (line 44)
- Mounted at: `server.js` line 150

## Outstanding Issues
- Daily health data (body battery, HRV, stress) = 0 records
- Need to verify Garmin Developer Portal has daily summaries enabled
- Test activity (TEST123) may still be visible - needs deletion

## User Preferences
- Direct, no fluff
- Fix things properly, no trial and error
- Explain what you're doing and why
