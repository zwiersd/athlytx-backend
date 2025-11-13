# 🛡️ GARMIN INTEGRATION - PRESERVATION CHECKLIST

**CRITICAL:** This checklist ensures Garmin Health API compliance is maintained during rebuild.

---

## 🔴 CANNOT CHANGE (Garmin-Approved)

### 1. OAuth Credentials
```bash
GARMIN_CONSUMER_KEY=ee6809d5-abc0-4a33-b38a-d433e5045987
GARMIN_CONSUMER_SECRET=[Keep existing value]
GARMIN_REDIRECT_URI=[Keep registered domain]
```
- [ ] Verify credentials unchanged in `.env`
- [ ] Confirm redirect URI matches registration

### 2. Endpoint Paths (Registered with Garmin)
- [ ] `/api/garmin/ping` - Preserved exactly
- [ ] `/api/garmin/push` - Preserved exactly
- [ ] `/api/garmin/deregister` - Preserved exactly
- [ ] `/api/garmin/permissions` - Preserved exactly
- [ ] `/api/garmin/backfill` - Preserved exactly

### 3. Response Requirements
- [ ] PING returns HTTP 200 within 30 seconds
- [ ] PUSH returns HTTP 200 within 30 seconds (async processing)
- [ ] PUSH handles 100MB payloads (`express.json({ limit: '100mb' })`)
- [ ] Deregister returns HTTP 200 after deleting data
- [ ] Permissions returns exact JSON format

### 4. OAuth 2.0 Flow (PKCE)
- [ ] PKCE implementation preserved (`code_verifier`, `code_challenge`)
- [ ] State parameter validation maintained
- [ ] Scope remains `WELLNESS_READ`
- [ ] Authorization URL format unchanged

### 5. Data Models
- [ ] OAuthToken model includes `provider: 'garmin'` enum
- [ ] Activity model includes `provider: 'garmin'` enum
- [ ] HeartRateZone model includes `provider: 'garmin'` enum
- [ ] Token encryption/decryption logic preserved

### 6. Field Mappings (Garmin API → Database)
- [ ] `activityId/summaryId` → `externalId`
- [ ] `startTimeInSeconds` → `startTime` (converted to Date)
- [ ] `durationInSeconds` → `durationSeconds`
- [ ] `distanceInMeters` → `distanceMeters`
- [ ] `activeKilocalories` → `calories`
- [ ] `averageHeartRateInBeatsPerMinute` → `avgHr`
- [ ] `maxHeartRateInBeatsPerMinute` → `maxHr`
- [ ] `timeInHeartRateZonesInSeconds` → HR zone seconds

---

## ⚠️ MUST FIX (Compliance Gaps)

### 1. Data Retention Policy
**Problem:** Permissions endpoint declares 90-day retention, but data stored indefinitely.

**Fix Required:**
```javascript
// Add to backend/services/cleanupService.js
async function cleanupOldGarminData() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    await Activity.destroy({
        where: {
            provider: 'garmin',
            startTime: { [Op.lt]: cutoffDate }
        }
    });

    await HeartRateZone.destroy({
        where: {
            provider: 'garmin',
            date: { [Op.lt]: cutoffDate }
        }
    });
}

// Run daily via cron
```

- [ ] Create cleanup service
- [ ] Add daily cron job
- [ ] Test cleanup doesn't break dashboards
- [ ] OR update permissions endpoint to declare actual retention

### 2. Complete User Deregistration
**Problem:** Deregister endpoint only deletes OAuthToken, not activities/metrics.

**Fix Required:**
```javascript
// Update backend/routes/garmin-health.js deregister endpoint
await Activity.destroy({ where: { userId, provider: 'garmin' } });
await HeartRateZone.destroy({ where: { userId, provider: 'garmin' } });
await OAuthToken.destroy({ where: { userId, provider: 'garmin' } });
```

- [ ] Update deregister endpoint to delete all Garmin data
- [ ] Test complete data deletion
- [ ] Ensure HTTP 200 response maintained

### 3. Rate Limiting
**Problem:** No rate limiting on Garmin API calls (could abuse API).

**Fix Required:**
```javascript
const rateLimit = require('express-rate-limit');

const garminApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});

router.get('/v2/dailies', garminApiLimiter, async (req, res) => { ... });
```

- [ ] Install `express-rate-limit`
- [ ] Apply to all Garmin data endpoints
- [ ] Test rate limit behavior

---

## 🟢 CAN MODIFY (Non-Critical)

### Frontend UI
- [ ] Can redesign UI while maintaining OAuth flow
- [ ] Can improve UX for device connection
- [ ] Must support same OAuth callback handling

### Backend Services
- [ ] Can refactor sync service structure
- [ ] Can improve error handling
- [ ] Must maintain field mappings and data processing

### Database Schema
- [ ] Can add new fields to models
- [ ] Can add indexes for performance
- [ ] Must keep existing Garmin-related fields

---

## 📋 REBUILD VERIFICATION CHECKLIST

After any changes, verify:

### Manual Testing
- [ ] Coach/athlete can connect Garmin account
- [ ] OAuth redirect returns to correct page
- [ ] Garmin activities sync successfully
- [ ] HR zone data appears correctly
- [ ] Sleep data syncs (if available)
- [ ] Deregister endpoint deletes all data
- [ ] PING endpoint responds within 30 seconds
- [ ] PUSH endpoint handles large payloads

### Automated Testing
- [ ] Unit tests for Garmin field mappings
- [ ] Integration tests for OAuth flow
- [ ] Webhook endpoint tests (ping, push, deregister)
- [ ] Data cleanup job tests

### Compliance Verification
- [ ] Data retention policy enforced
- [ ] Deregistration deletes ALL Garmin data
- [ ] Rate limits active
- [ ] 100MB payload limit configured
- [ ] All endpoints return correct HTTP codes

---

## 🚨 EMERGENCY CONTACTS

If Garmin integration breaks:

1. **Check Logs:** Look for Garmin API errors
2. **Verify Credentials:** Ensure env vars unchanged
3. **Test Endpoints:** Use Postman/curl to test `/api/garmin/*`
4. **Rollback:** Revert to last working commit
5. **Contact Garmin:** If approval revoked, re-submit app

---

## 📚 REFERENCE FILES

### Critical Files (DO NOT DELETE)
- `/backend/routes/garmin-health.js` - Required endpoints
- `/backend/routes/legacy-routes.js` - OAuth implementation
- `/backend/services/syncService.js` - Garmin sync logic
- `/frontend/garmin-oauth2.js` - OAuth client
- `/frontend/oauth-handler.js` - Callback handling

### Configuration
- `server.js` - Line 17-19 (100mb limit)
- `.env` - Garmin credentials

### Models
- `/backend/models/OAuthToken.js`
- `/backend/models/Activity.js`
- `/backend/models/HeartRateZone.js`

---

**Last Updated:** 2025-11-12
**Garmin Approval Status:** ✅ ACTIVE
**Compliance Gaps:** ⚠️ 3 (Data Retention, Deregistration, Rate Limiting)
