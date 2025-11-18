#!/bin/bash
# Monitor for incoming Garmin PUSH notifications
# Run this after completing your activity

echo "🔍 Watching for Garmin PUSH notifications..."
echo "Press Ctrl+C to stop"
echo ""

railway logs --service athlytx-backend --tail 100 2>&1 | grep -i "push notification\|📨.*push\|POST /api/garmin/push" --line-buffered | while read line; do
    echo "✅ PUSH RECEIVED: $line"
done
