# Email to Marc Lussi - Production Approval Compliance

**To:** Marc Lussi (Developer Program)
**Subject:** Re: Production Approval Requirements - All Requirements Confirmed
**Date:** November 17, 2025

---

Hi Marc,

Thank you for the clarification and for sending over the production requirements again.

I understand the urgency and am committed to meeting all requirements before the November 20 deadline. I have completed significant progress today and can confirm the following:

---

## 1. Technical Review - ✅ CONFIRMED

### APIs Tested/In Use:
- **Health API** (PUSH notifications for daily summaries, activities, sleep, wellness data)
- **Using Evaluation Key:** ee6809d5-abc0-4a33-b38a-d433e5045987

### Partner Verification Tool Results:
I have successfully tested the application using the Partner Verification Tool with the following results:

**✅ Summary Domains Configured:**
- CONSUMER_PERMISSIONS (push): https://athlytx-backend-production.up.railway.app/api/garmin/push
- GC_ACTIVITY_UPDATE (push): https://athlytx-backend-production.up.railway.app/api/garmin/push
- USER_DEREG (ping): https://athlytx-backend-production.up.railway.app/api/garmin/deregister

**✅ User Authorization Status:**
- **3 users with data** uploaded in the last 24 hours (exceeds 2 minimum requirement)
- User IDs: 94435bc6c4bf4e47d6ffb404257273d8, 0a2bd543599ed7457c076f3314f54be3, 35a83697-0114-4426-9baa-91fe6fbe2234

### Technical Requirements Verified:

✅ **Authorization:** 3 Garmin Connect users authorized (exceeds 2 minimum)
✅ **User Deregistration:** Endpoint enabled at `/api/garmin/deregister`
✅ **User Permissions:** Endpoint enabled at `/api/garmin/permissions`
✅ **PING/PUSH notifications:** Fully implemented (PULL-ONLY not used)
✅ **HTTP 200 < 30 seconds:** Confirmed - all endpoints respond in < 1 second
✅ **Payload support:** 10MB minimum (Health API), 100MB (Activity Details) configured

### PULL-ONLY Confirmation:
Our application uses **PUSH notifications exclusively**. We do NOT use any pull endpoints. All data is received via webhook notifications to our `/api/garmin/push` endpoint.

### Training/Courses API Clarification Request:
We currently use **Health API only** to receive activity data via PUSH notifications. We do not use the Training/Courses API to create or schedule workouts.

**Question:** Does the Training/Courses API screenshot requirement apply only to applications actively using that API, or is it mandatory for all applications?

If this is a universal requirement, we will need to implement Training/Courses functionality and may require a brief extension to complete this additional development. Please clarify so we can proceed accordingly.

---

## 2. UX and Brand Compliance - ✅ IN PROGRESS

### Garmin Branding Assets:
All branding follows API Brand Guidelines from GCDP Branding Assets:

**Assets Implemented:**
- ✅ Official Garmin.svg logo (header, footer, data sections)
- ✅ GarminConnect.png icon (device connection, activities)
- ✅ "Powered by Garmin" attribution statements
- ✅ Activity source attribution (Garmin icon on each activity)

**Branding Locations:**
1. Device connection card with Garmin Connect icon
2. "Powered by Garmin" header in Garmin Data tab
3. Footer: "Powered by Garmin, Strava, Whoop, and Oura"
4. Activity list with Garmin attribution for each item
5. OAuth flow uses official Garmin authorization pages

### UX Screenshots:
I will provide complete UX screenshots by **November 19** showing:
- All Garmin trademarks, logos, and brand elements
- Complete OAuth authorization flow
- Garmin data display with proper attribution
- Heart rate zones and activity analytics
- Footer co-branding

All screenshots will demonstrate compliance with API Brand Guidelines.

---

## 3. Account Setup - ✅ COMPLETED

✅ **API Blog Email:** Subscribed to API Blog at developer.garmin.com for future API updates

✅ **Authorized Users:** Updated account with second verified individual:
- All users use company domain emails (not gmail/outlook/hotmail)
- All users have personalized emails (not info@, support@, dev@)
- No freemail accounts used

✅ **Third-party Integrators:** N/A - All development completed in-house

---

## Timeline for Completion

**November 17 (Today) - ✅ COMPLETED:**
- Partner Verification Tool testing
- All endpoints verified working
- Second authorized user added
- API Blog subscription confirmed
- This response email

**November 18:**
- Ensure Garmin connection has activity data for screenshots
- Verify all branding displays correctly in production

**November 19:**
- Complete all UX screenshots
- Prepare final compliance package
- Submit to support ticket

**November 20 (Deadline):**
- All requirements confirmed and submitted

---

## Summary of Compliance Status

| Requirement Category | Status |
|---------------------|--------|
| **Technical Requirements** | ✅ Verified via Partner Tool |
| **User Authorization (2+)** | ✅ 3 users (exceeds requirement) |
| **Endpoints (PING/PUSH/Dereg/Permissions)** | ✅ All tested and working |
| **PULL-ONLY Compliance** | ✅ PUSH notifications only |
| **Payload Support (10-100MB)** | ✅ Configured |
| **API Blog Subscription** | ✅ Completed |
| **Authorized Users** | ✅ Completed |
| **UX Screenshots** | 🔄 In progress (Nov 19) |
| **Brand Compliance** | ✅ Verified, awaiting screenshots |

---

## Pending Items

**Only remaining item:**
- UX screenshots (scheduled for November 19)
- Clarification on Training/Courses API requirement

---

## Request for Clarification

**Training/Courses API Screenshot Requirement:**

The requirements state: "Training/Courses API: screenshot of successful transfer of workout/course at Garmin Connect"

Our application:
- ✅ Uses Health API to **receive** activity data
- ❌ Does NOT use Training/Courses API to **create/schedule** workouts

**Please confirm:**
1. Is the Training/Courses API screenshot required only for apps using that specific API?
2. Or is it a mandatory requirement for all applications regardless of API usage?

If mandatory, we will implement the necessary functionality, but this will require additional development time beyond the November 20 deadline.

---

## Production Application Details

**Production App:** Athlytx Fitness
**Production Client ID:** 4af31e5c-d758-442d-a007-809ea45f444a

**Evaluation App:** Athlytx
**Evaluation Client ID:** ee6809d5-abc0-4a33-b38a-d433e5045987

**Production URLs:**
- PING: https://athlytx-backend-production.up.railway.app/api/garmin/ping
- PUSH: https://athlytx-backend-production.up.railway.app/api/garmin/push
- Permissions: https://athlytx-backend-production.up.railway.app/api/garmin/permissions
- Deregister: https://athlytx-backend-production.up.railway.app/api/garmin/deregister

---

## Commitment

I am fully committed to maintaining production approval and completing all requirements by the November 20 deadline. All technical requirements have been verified and are working correctly.

The only outstanding items are:
1. UX screenshots (November 19)
2. Training/Courses API clarification

Please let me know if you need any additional information or clarification on any of the points above.

Thank you for your patience and guidance throughout this process.

---

Best regards,

Darren Zwiers
Athlytx
[Your company email]
[Your phone number if applicable]

---

## Attachments (To be included in final submission on Nov 19):

1. Partner Verification Tool Results
2. UX Screenshots Package (6-7 images)
3. Endpoint Test Results
4. Brand Compliance Verification

