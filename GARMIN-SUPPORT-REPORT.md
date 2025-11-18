# Garmin Health API Push Notifications - Support Request

**Date:** November 18, 2025
**Application:** Athlytx
**Issue:** Push notifications for activities and dailies not being received

---

## Application Details

**Application Name:** Athlytx
**Callback URL:** `https://athlytx-backend-production.up.railway.app/api/garmin/health/push`
**OAuth Flow:** Successfully completed
**Current Status:** OAuth token valid, but push notifications not received

---

## OAuth Token Status

✅ **OAuth Connection:** Active and Valid

```json
{
    "userId": "3c37dd1f-25f8-4212-afcf-52a7d37f0903",
    "provider": "garmin",
    "providerUserId": "f1d91633-0bcf-48a4-b94c-5664e3994c11",
    "expiresAt": "2025-11-19T12:35:25.199Z",
    "createdAt": "2025-11-18T10:30:02.363Z",
    "updatedAt": "2025-11-18T12:35:26.354Z"
}
```

**Garmin User ID (GUID):** `f1d91633-0bcf-48a4-b94c-5664e3994c11`
**Token Expiry:** November 19, 2025 12:35 UTC
**OAuth Scopes Requested:** activities, dailies, wellness

---

## Current Data Status

**Total Activities in Database:** 274
**Total Heart Rate Zone Records:** 151
**Last Successful Data Sync:** November 18, 2025 15:32:57 UTC (6 hours ago)

**Data Sources Currently Working:**
- ✅ Strava (receiving push notifications)
- ✅ Whoop (receiving push notifications)
- ✅ Oura (receiving webhooks)
- ❌ Garmin (NOT receiving push notifications)

---

## Issue Description

### Problem
After successfully completing OAuth authorization and obtaining access tokens, our application is **not receiving any push notifications** from Garmin Health API for:
1. New activities
2. Daily summaries
3. Wellness data

### Expected Behavior
When a user completes an activity or a new daily summary is available, Garmin Health API should send an HTTP POST request to our callback URL with the notification.

### Actual Behavior
- No HTTP POST requests are being received at our callback endpoint
- Server logs show no incoming Garmin push notifications
- Application has been waiting 6+ hours with no data updates from Garmin

---

## Technical Implementation

### Push Notification Endpoint

**URL:** `https://athlytx-backend-production.up.railway.app/api/garmin/health/push`
**Method:** POST
**Status:** Accessible and ready to receive notifications

### Endpoint Code

```javascript
router.post('/push', async (req, res) => {
    try {
        console.log('📬 Received Garmin Health API push notification');
        console.log('Headers:', JSON.stringify(req.headers, null, 2));
        console.log('Body:', JSON.stringify(req.body, null, 2));

        const notifications = Array.isArray(req.body) ? req.body : [req.body];

        for (const notification of notifications) {
            const { userId: garminUserId, summaryId, userAccessToken } = notification;

            // Find our user by Garmin user ID
            const token = await OAuthToken.findOne({
                where: {
                    provider: 'garmin',
                    providerUserId: garminUserId
                }
            });

            if (!token) {
                console.log(`No token found for Garmin user ${garminUserId}`);
                continue;
            }

            // Fetch and process the activity/daily data
            // ... processing logic
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Garmin push error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
```

### Registration Details

We have attempted to register our callback URL using the Garmin Health API registration endpoint:

**Registration Request:**
```bash
PUT https://apis.garmin.com/wellness-api/rest/user/registration

Headers:
- Authorization: OAuth oauth_consumer_key="...", oauth_token="...", oauth_signature_method="HMAC-SHA1", oauth_signature="...", oauth_timestamp="...", oauth_nonce="..."

Body:
{
  "userAccessToken": "f1d91633-0bcf-48a4-b94c-5664e3994c11"
}
```

**Registration Response:**
- We are unsure if registration was successful
- No error messages received, but also no confirmation
- Push notifications still not arriving

---

## Server Logs Analysis

### Recent Server Activity (Last 2 Hours)
- ✅ Strava push notifications received successfully
- ✅ Whoop push notifications received successfully
- ✅ Oura webhooks received successfully
- ❌ **ZERO Garmin push notifications received**

### Endpoint Accessibility
Our callback endpoint is publicly accessible and returns 200 OK:

```bash
$ curl -X POST https://athlytx-backend-production.up.railway.app/api/garmin/health/push \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

Response: {"success": true}
```

---

## Questions for Garmin Support

1. **Registration Status:** How can we verify that our push notification callback URL was successfully registered for user `f1d91633-0bcf-48a4-b94c-5664e3994c11`?

2. **Required Scopes:** Are there specific OAuth scopes beyond "activities" and "dailies" required for push notifications to work?

3. **Registration Endpoint:** Should we use `/wellness-api/rest/user/registration` or a different endpoint to register for push notifications?

4. **User Access Token:** Is the `userAccessToken` in the registration request supposed to be the Garmin User GUID (`f1d91633-0bcf-48a4-b94c-5664e3994c11`) or the OAuth access token?

5. **Notification Delay:** What is the typical delay between an activity being completed and a push notification being sent?

6. **Backfill:** If push notifications aren't configured, do we need to use the pull API to backfill historical data?

7. **Debugging:** Is there a way to view/debug push notification delivery status for a specific user or application?

---

## Request for Assistance

We need help:
1. Verifying our push notification registration is correct
2. Understanding why notifications are not being delivered
3. Confirming the correct API endpoint and request format for registration
4. Testing push notification delivery to our callback URL

Our application is production-ready and successfully receiving data from other providers (Strava, Whoop, Oura), but Garmin integration is blocked by this push notification issue.

---

## Contact Information

**Developer:** Darren Zwiers
**Application:** Athlytx
**Callback URL:** https://athlytx-backend-production.up.railway.app/api/garmin/health/push
**Garmin User ID:** f1d91633-0bcf-48a4-b94c-5664e3994c11

Thank you for your assistance!
