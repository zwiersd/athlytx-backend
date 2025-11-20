# Athlytx Garmin Integration - Important Context

## Start Here
**IMPORTANT:** Before starting any work, read the API documentation:
- **Main location**: `/Users/darrenzwiers/Documents/GitHub/athlytx-backend/API Documentation/`

**Garmin API Docs** (`API Documentation/Garmin/`):
  - `Health_API_1.2.2_0.pdf` - Daily health data (body battery, HRV, stress, sleep)
  - `Activity_API-1.2.3_0.pdf` - Activity endpoints and data formats
  - `OAuth2PKCE_1.pdf` - OAuth 2.0 authentication
  - `Garmin Developer Program_Start_Guide_1.1_0.pdf` - Getting started guide

**Strava API Docs** (`API Documentation/Strava/`):
  - Read before making Strava-related changes

**All other provider APIs** (Oura, Whoop, etc.):
  - Check `API Documentation/` folder for relevant docs before working on any provider

## Critical Rules
1. **NO PULLING from Garmin API** - PUSH webhooks only (Garmin production requirement)
2. **All Garmin endpoints MUST use `www.athlytx.com`** not Railway URL
3. Frontend at `www.athlytx.com` proxies to Railway backend

## Known Issues Fixed
- **userId orphaning**: Multiple userIds created when localStorage clears
- **Webhook duplicate tokens**: Webhook was using old token, now uses most recent
- **Data migration**: Activities orphaned under userId `3c37dd1f-25f8-4212-afcf-52a7d37f0903` (migrated to `82b58332-34e2-41c2-9599-c8a3b5511175`)

## Current Setup
- **User's Garmin GUID**: `f1d91633-0bcf-48a4-b94c-5664e3994c11`
- **User's current userId**: `82b58332-34e2-41c2-9599-c8a3b5511175`
- **Status**: Activities working (4 shown), daily health data NOT coming through

## Garmin Developer Portal - Endpoint Configuration
**Registered webhook URLs:**
- **Push/Webhook**: `https://www.athlytx.com/api/garmin/push`
- **Deregister**: `https://www.athlytx.com/api/garmin/deregister`

**Data Access Approved:**
- ✅ **API: Daily Health Stats** - Approved, 12 Active Endpoints
- ✅ **API: Activity** - Enabled, Approved, 5 Active Endpoints

**Actual Data Received:**
- ✅ Activities - Working (4 activities received)
- ❌ Daily Health Stats - ENABLED but NOT receiving (0 records)
  - Body Battery: 0 records
  - HRV: 0 records
  - Stress: 0 records
  - Sleep: 0 records

## Architecture
- Backend: Railway (`athlytx-backend-production.up.railway.app`)
- Frontend: `www.athlytx.com` (served by same backend)
- Webhook file: `backend/routes/garmin-health.js` (line 44)
- Mounted at: `server.js` line 150

## Outstanding Issues - RESOLVED Nov 20, 2025
- ✅ **FIXED:** Daily health data was queued but not sent - "on hold" was checked in portal
- ✅ **FIXED:** Unchecked "on hold" for all 12 Health API endpoints
- ✅ **EXPECTED:** Data should start flowing immediately after saving
- Test activity (TEST123) may still be visible - needs deletion

## User Preferences
- Direct, no fluff
- Fix things properly, no trial and error
- Explain what you're doing and why
