# Garmin Health API Setup - Critical Fix for Body Battery/Wellness Data

## Problem Summary

The `/user/registration` endpoint is returning **401 InvalidApiKey** because we're using the wrong credentials. We need separate credentials for:

1. **Garmin Connect OAuth API** (for user authentication/login)
2. **Garmin Health/Wellness API** (for push notifications and wellness data)

Currently, we're trying to sign Health API requests with Connect OAuth credentials, which fails.

---

## Solution: Get the Correct Health API Credentials

### Step 1: Locate Your Garmin Health API Credentials

1. Go to [Garmin Developer Portal](https://developer.garmin.com/)
2. Navigate to **Health API** section (NOT the Connect API section)
3. Look for:
   - **Health API Key** (also called Consumer Key)
   - **Health API Secret** (also called Consumer Secret)

**Important Notes:**
- These are **different** from your Connect OAuth Client ID/Secret
- These are **different** from the temporary "API Pull Token"
- If you don't see a Health API app, you may need to apply for Health API access first

### Step 2: Update Railway Environment Variables

1. Go to your Railway project dashboard
2. Navigate to the **Variables** tab
3. Update these environment variables:

```bash
GARMIN_CONSUMER_KEY=<your-health-api-key>
GARMIN_CONSUMER_SECRET=<your-health-api-secret>
```

**CRITICAL:**
- **DO NOT** use the Connect OAuth Client ID (`ee6809d5-abc0-4a33-b38a-d433e5045987`) as the consumer key
- These must be your **Health API** credentials, not Connect OAuth credentials
- Both values must be set (not empty)

### Step 3: Redeploy on Railway

After updating the variables, Railway should automatically redeploy. If not, trigger a manual deployment so the new environment variables are loaded.

### Step 4: Reconnect Athletes

For each athlete using Garmin:

1. **Disconnect Garmin** (to invalidate old tokens signed with wrong credentials)
2. **Reconnect Garmin** (to get new tokens that match the Health API credentials)

### Step 5: Register Users for Push Notifications

After reconnecting, register each user:

```bash
curl -X POST https://www.athlytx.com/api/garmin/admin/register-user \
  -H "Content-Type: application/json" \
  -d '{"userId": "<athlete-user-id>"}'
```

**Expected Responses:**
- `200 OK` - Successfully registered
- `409 Conflict` - Already registered (this is fine)
- ❌ `401 Unauthorized` - Still using wrong credentials

---

## How the Two Credential Sets Are Used

### Connect OAuth Credentials (Client ID/Secret)
**Used for:** User authentication flow (OAuth 2.0)
- Redirecting users to Garmin login
- Exchanging authorization codes for access tokens
- Refreshing expired tokens

**Example:**
```javascript
// OAuth 2.0 token exchange
const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
fetch('https://diauth.garmin.com/di-oauth2-service/oauth/token', {
    headers: { 'Authorization': `Basic ${credentials}` }
});
```

### Health API Credentials (Consumer Key/Secret)
**Used for:** Signing wellness API requests (OAuth 1.0a signatures with OAuth 2.0 tokens)
- Registering users for push notifications (`/user/registration`)
- Fetching wellness data (`/dailies`, `/bodyComps`, `/sleeps`)
- All requests to `https://apis.garmin.com/wellness-api/rest/*`

**Example:**
```javascript
// Wellness API requests
const signer = new GarminOAuth1Hybrid(CONSUMER_KEY, CONSUMER_SECRET);
const authHeader = signer.generateAuthHeader('POST', 'https://apis.garmin.com/wellness-api/rest/user/registration', {}, accessToken);
```

---

## Current Code Status

✅ **The code is already correct!**

The code in `backend/utils/garmin-api.js` and `backend/routes/garmin-register-existing.js` already uses `GARMIN_CONSUMER_KEY` and `GARMIN_CONSUMER_SECRET` for Health API requests.

❌ **The Railway environment variables need to be updated!**

Current Railway variables (likely):
- `GARMIN_CONSUMER_KEY=ee6809d5-abc0-4a33-b38a-d433e5045987` (this is actually the Connect Client ID, not Health API key)
- `GARMIN_CONSUMER_SECRET=` (may be empty or incorrect)

You need to replace these with your actual **Garmin Health API** credentials from the Health API portal.

---

## Testing After Fix

### 1. Test Registration Endpoint

```bash
curl -X POST https://www.athlytx.com/api/garmin/admin/register-user \
  -H "Content-Type: application/json" \
  -d '{"userId": "82b58332-34e2-41c2-9599-c8a3b5511175"}'
```

Should return `200` or `409`, NOT `401`.

### 2. Wait for Garmin to Push Data

- Garmin pushes data when the device syncs (not on-demand)
- Body Battery, stress, HRV will start flowing when the athlete syncs their device
- Historical data backfill is limited (Garmin doesn't always send old data)

### 3. Check Webhook Logs

Monitor `/api/garmin/push` to see incoming data:

```bash
curl https://www.athlytx.com/api/debug/garmin/all
```

---

## Common Mistakes to Avoid

❌ Using Connect OAuth Client ID as Consumer Key
❌ Using the temporary "API Pull Token" as credentials
❌ Not restarting the server after updating environment variables
❌ Not having athletes reconnect after credential change
❌ Expecting immediate data (Garmin pushes when device syncs, not instantly)

---

## Questions to Ask Garmin Support (If Needed)

If you don't see Health API credentials in your portal:

> "I have a Garmin Connect OAuth app approved, but I need to register users for push notifications via `/user/registration`. Where can I find my Health/Wellness API Consumer Key and Consumer Secret? These appear to be different from my Connect OAuth Client ID/Secret."

---

## Summary Checklist

- [ ] Locate Health API Key and Secret in Garmin Developer Portal (Health/Wellness section)
- [ ] Go to Railway project → Variables tab
- [ ] Update `GARMIN_CONSUMER_KEY` with Health API Key (NOT Connect Client ID)
- [ ] Update `GARMIN_CONSUMER_SECRET` with Health API Secret
- [ ] Wait for Railway to automatically redeploy (or trigger manual deploy)
- [ ] Have athletes disconnect and reconnect Garmin
- [ ] Run `/api/garmin/admin/register-user` for each athlete
- [ ] Verify registration returns 200/409, not 401
- [ ] Wait for next device sync and check for Body Battery data

---

## File References

- [backend/utils/garmin-api.js](../backend/utils/garmin-api.js:11) - Uses GARMIN_CONSUMER_KEY/SECRET
- [backend/routes/garmin-register-existing.js](../backend/routes/garmin-register-existing.js:58) - Registration endpoint
- [backend/utils/garmin-oauth1-hybrid.js](../backend/utils/garmin-oauth1-hybrid.js) - OAuth 1.0a signature generator
