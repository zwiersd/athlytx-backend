#!/bin/bash

# Call the admin endpoint to register existing Garmin users for PUSH notifications
# Run this AFTER deploying the fix to production

echo "=========================================="
echo "Registering Existing Garmin Users"
echo "=========================================="
echo ""
echo "Calling: POST /api/garmin/admin/register-existing-users"
echo ""

curl -X POST \
  https://athlytx-backend-production.up.railway.app/api/garmin/admin/register-existing-users \
  -H "Content-Type: application/json" \
  -s | json_pp

echo ""
echo "=========================================="
echo "NEXT STEPS:"
echo "=========================================="
echo "1. Wait 30-60 minutes for Garmin to process"
echo "2. Users should record activities on their Garmin devices"
echo "3. Garmin will send PUSH notifications to your webhook"
echo "4. Check Partner Verification Tool - should show data"
echo "=========================================="
