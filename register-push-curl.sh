#!/bin/bash

# Manual PUSH registration using the Garmin access token
# This calls Garmin's API directly using the token from localStorage

GARMIN_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImRpLW9hdXRoLXNpZ25lci1wcm9kLTIwMjQtcTEifQ.eyJzY29wZSI6WyJQQVJUTkVSX1dSSVRFIiwiUEFSVE5FUl9SRUFEIiwiQ09OTkVDVF9SRUFEIiwiQ09OTkVDVF9XUklURSJdLCJpc3MiOiJodHRwczovL2RpYXV0aC5nYXJtaW4uY29tIiwicmV2b2NhdGlvbl9lbGlnaWJpbGl0eSI6WyJDTElFTlRfVVNFUl9SRVZPQ0FUSU9OIiwiTUFOQUdFRF9TVEFUVVMiXSwiY2xpZW50X3R5cGUiOiJQQVJUTkVSIiwiZXhwIjoxNzYzNTU1NzI1LCJpYXQiOjE3NjM0NjkzMjUsImdhcm1pbl9ndWlkIjoiZjFkOTE2MzMtMGJjZi00OGE0LWI5NGMtNTY2NGUzOTk0YzExIiwianRpIjoiOWI5MzBmZWUtZjQyYy00ZGRkLWFjMzItN2ExMTVmNzI5Y2Y3IiwiY2xpZW50X2lkIjoiNGFmMzFlNWMtZDc1OC00NDJkLWEwMDctODA5ZWE0NWY0NDRhIn0.JslPSW4KiYl_wakHLY8NXFPxDzTfJuoDIpQ5fvEtRxYqz6rtVUrKXSJ4HtHkddTZqZXTPfuF9QFMjEJA6WqBvvhMkOSTybWOJEuCA3PnJhpofrfSqclVa68Ci5B8dtLwUvHtXU_uVDfojphq2pFexe_eDaBFGZ3Ob_FcuJ_iL-AL6aFvRkwxPOZbY3Rm4zXb11wOQYh61uLx19mAk8Y5StOK79I3Ng6CnEWLxfe7RoJy84zieikQNkgJBs2PecBSWTMWXwXZl8_Ipxe7DKMplFnsfwgbKdmlOuVK6FUqkt9qIZFiafXPToyloH6TnUgxZnzrTG8ks8GyzXQYE9-EIw"

echo ""
echo "📝 === REGISTERING PUSH NOTIFICATIONS WITH GARMIN ==="
echo ""

echo "📡 Calling Garmin PUSH registration endpoint..."
echo "   URL: https://apis.garmin.com/wellness-api/rest/user/registration"
echo "   Method: POST"
echo "   Auth: OAuth 2.0 Bearer token"
echo ""

response=$(curl -s -w "\n%{http_code}" -X POST \
  "https://apis.garmin.com/wellness-api/rest/user/registration" \
  -H "Authorization: Bearer ${GARMIN_TOKEN}" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{}')

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

echo "📊 Response:"
echo "   Status: $http_code"
echo "   Body: $body"
echo ""

if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
    echo "✅ SUCCESS: User registered for PUSH notifications"
    echo ""
    echo "📱 Next steps:"
    echo "   1. Send an activity from your Garmin device"
    echo "   2. Wait 1-2 minutes for Garmin to send PUSH notification"
    echo "   3. Check the database for new activities and dailies"
elif [ "$http_code" = "409" ]; then
    echo "✅ SUCCESS: User already registered (this is normal)"
    echo ""
    echo "📱 The PUSH webhook should be working."
    echo "   If activities aren't coming through:"
    echo "   1. Check Railway logs for incoming PUSH notifications"
    echo "   2. Verify the webhook URL is correct in Garmin's system"
    echo "   3. Send a test activity to trigger a PUSH"
else
    echo "❌ PUSH registration failed"
    echo ""
    echo "   Possible causes:"
    echo "   - Invalid or expired OAuth token"
    echo "   - Garmin API credentials issue"
    echo "   - PUSH webhook URL not configured"
fi
echo ""
