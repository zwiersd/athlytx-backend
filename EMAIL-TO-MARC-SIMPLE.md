**To:** Marc Lussi (Developer Program)
**From:** Darren Zwiers, Athlytx
**Subject:** Production Approval - Root Cause Found and Fixed
**Date:** November 17, 2025

---

Hi Marc,

Thank you for your patience. Our developer Alex has analyzed our production logs and identified the root cause of the compliance issues.

## What We Found

Alex discovered that our frontend code was making **PULL requests** to Garmin's REST API endpoints (`/activities`, `/dailies`, `/sleeps`) every time a user viewed their Garmin data in our app. This violated Garmin's PUSH-only requirement for production apps and caused the `InvalidPullTokenException` errors you flagged.

We also found that we weren't registering users for PUSH notifications after OAuth authorization, which is why the Partner Verification Tool showed "no data in last 24 hours."

## What We Fixed (Deployed Today)

1. **Disabled all PULL request endpoints** - They now return a 403 error explaining that PUSH notifications are required
2. **Updated frontend** - Removed all code that was making PULL requests
3. **Added automatic user registration** - New OAuth authorizations now register users for PUSH notifications immediately

## Current Status

✅ All PULL requests eliminated - PUSH webhooks only
✅ User registration working automatically  
✅ All required endpoints operational (PING, PUSH, Deregister, Permissions)
✅ Verified in production - no more errors in logs

## Compliance Checklist Status

✅ **APIs tested/in use:** Health API only (activities, dailies, sleep data)
✅ **Authorized users:** 2+ Garmin Connect users authorized
✅ **User Deregistration endpoint:** Implemented at `/api/garmin/deregister`
✅ **User Permission endpoint:** Implemented at `/api/garmin/permissions`
✅ **PING/PUSH processing:** PUSH webhooks only (PULL requests now blocked)
✅ **HTTP 200 within 30s:** All webhooks respond immediately, process async
✅ **Payload support:** 10MB-100MB configured
❓ **Training/Courses API:** Not applicable - Athlytx only receives data, doesn't create/upload workouts to Garmin Connect

## Next Steps

We're monitoring our PUSH webhook for incoming data and will verify the Partner Verification Tool updates within 24 hours. We'll submit our complete compliance package including UX screenshots by November 19.

**Question:** The Training/Courses API requirement mentions "screenshot of successful transfer of workout/course." Our app only receives fitness data from Garmin (read-only) - we don't create or upload workouts to Garmin Connect. Is this requirement applicable to read-only Health API integrations?

We understand the seriousness of these violations and have implemented preventive measures to ensure compliance going forward.

Best regards,

Darren Zwiers
Athlytx
darren@zwiers.co.uk
