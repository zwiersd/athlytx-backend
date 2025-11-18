# Garmin Activity API Testing Guide

Your test app has Activity API enabled and approved! Now we need to test it and get screenshots for Garmin.

## Current Status

✅ Test App Consumer Key: `ee6809d5-abc0-4a33-b38a-d433e5045987`
✅ Test App Consumer Secret: `0Xjs//vs29LPby1XbvGUBcVM1gzn7/idbavTyTVnl3M`
✅ Activity API: Enabled and Approved on test app
❌ Current OAuth token: Created with old credentials (no Activity API access)

## Steps to Test Activity API

### 1. Update Railway Environment Variables

Go to: https://railway.app → Your Project → athlytx-backend → Variables

Update these two variables:
```
GARMIN_CONSUMER_KEY = ee6809d5-abc0-4a33-b38a-d433e5045987
GARMIN_CONSUMER_SECRET = 0Xjs//vs29LPby1XbvGUBcVM1gzn7/idbavTyTVnl3M
```

Save and wait ~1 minute for Railway to redeploy.

### 2. Reconnect Garmin on Website

1. Go to: https://athlytx-backend-production.up.railway.app
2. Click "Disconnect" on Garmin (if already connected)
3. Click "Connect Garmin" again
4. Authorize with your Garmin account
5. This will create a NEW OAuth token with Activity API access

### 3. Test Activity API

Run this command to fetch activities:
```bash
node test-activity-api-simple.js
```

You should see activities being fetched!

### 4. View Activities in Browser

Open the visual test page:
```bash
open test-activity-api.html
```

Or visit: http://localhost:3000/test-activity-api.html

Click "Fetch Activities" to see your activities with HR zones displayed nicely.

### 5. Take Screenshots

Take screenshots showing:
- Activities list with heart rate zones
- Individual activity details
- Your app's branding/UI

### 6. Send to Garmin

Email to Garmin Developer Relations with:

**Subject:** Activity API Testing Complete - Ready for Production

**Body:**
```
Dear Garmin Developer Relations,

I have successfully tested the Activity API on my test app and am ready to have it enabled on production.

Test App Details:
- Test Consumer Key: ee6809d5-abc0-4a33-b38a-d433e5045987
- Testing completed successfully (see attached screenshots)
- Activities with HR zones fetching correctly

Production App Details:
- Production Consumer Key: [YOUR ORIGINAL PRODUCTION KEY - check Railway current vars]
- App Name: Athlytx
- Please enable Activity API on this production app

Attached Screenshots:
1. Activities list with HR zone data
2. Individual activity details
3. App UI showing Garmin integration

Please enable Activity API for the production app.

Thank you!
```

## After Garmin Approves Production

1. Update Railway variables BACK to production credentials
2. Reconnect Garmin one more time
3. Your production app will now have Activity API access!

## Troubleshooting

**Still getting 0 activities?**
- Make sure you have activities in Garmin Connect in the last 14 days
- Check that you've synced your Garmin device recently
- Verify the OAuth token was created AFTER updating Railway env vars

**InvalidPullTokenException?**
- The OAuth token is old and doesn't have Activity API scopes
- Disconnect and reconnect Garmin after updating env vars
