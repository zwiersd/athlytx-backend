# Garmin Health API Production Compliance

**Application:** Athlytx Fitness
**App ID:** 4af31e5c-d758-442d-a007-809ea45f444a
**Evaluation App ID:** ee6809d5-abc0-4a33-b38a-d433e5045987
**Date:** November 17, 2025
**Deadline:** 3 days (November 20, 2025)

---

## Response to Garmin Developer Program Requirements

### 1. Technical Requirements ✅

#### APIs Tested/In Use
- **Health API** - Enabled and tested via PUSH notifications
  - Daily summaries (steps, calories, heart rate, stress, sleep)
  - Activity summaries with heart rate zones
  - Sleep data
  - Wellness metrics

**Note on Training/Courses API:**
- Requirement states: "Training/Courses API: screenshot of successful transfer of workout/course at Garmin Connect"
- **Current Status:** We are NOT using Training/Courses API
- **What we use:** Health API only (receiving activity data, not creating workouts)
- **Action:** Confirm with Garmin if this requirement applies only IF using Training/Courses API, or if it's mandatory for all apps

#### Authorization Status
- ✅ **Requirement:** At least two Garmin Connect users
- **Status:** PENDING - Need to add second user
- **Action Required:** Add second verified individual to developer account

#### User Deregistration Endpoint ✅
- **Endpoint:** `POST /api/garmin/deregister`
- **Location:** [backend/routes/garmin-health.js:78-122](backend/routes/garmin-health.js#L78-L122)
- **Implementation:**
  - Accepts `userId` or `userAccessToken`
  - Deletes all OAuth tokens from database
  - Returns HTTP 200 with deletion confirmation
  - Logs all deregistration requests

#### User Permissions Endpoint ✅
- **Endpoint:** `GET /api/garmin/permissions`
- **Location:** [backend/routes/garmin-health.js:130-163](backend/routes/garmin-health.js#L130-L163)
- **Implementation:**
  - Returns all data types accessed
  - Specifies data retention policy (90 days)
  - Confirms no third-party sharing
  - Lists usage purposes

#### PING/PUSH Notification Processing ✅
- **PING Endpoint:** `GET /api/garmin/ping`
  - Location: [backend/routes/garmin-health.js:19-34](backend/routes/garmin-health.js#L19-L34)
  - Returns HTTP 200 within milliseconds
  - Confirms server availability

- **PUSH Endpoint:** `POST /api/garmin/push`
  - Location: [backend/routes/garmin-health.js:44-68](backend/routes/garmin-health.js#L44-L68)
  - **Returns HTTP 200 within 30 seconds** ✅
  - Handles minimum 10MB payloads (configured for 100MB)
  - Processes data asynchronously after responding
  - Stores activities, heart rate zones, daily metrics

#### PULL-ONLY Requests ✅
- **Status:** NOT USED - We are PUSH-only
- **Confirmation:** All data received via webhook notifications
- **Previous Implementation:** Removed pull endpoint attempts (was causing errors)

#### Payload Size Handling ✅
- **Configuration:** [server.js:16-18](server.js#L16-L18)
  ```javascript
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));
  ```
- Supports 10MB minimum (Health API)
- Supports 100MB for Activity Details

---

### 2. UX and Brand Compliance ✅

#### Garmin Branding Assets
All Garmin branding follows API Brand Guidelines from GCDP Branding Assets.

**Assets Located in:** `/frontend/src/images/`
- ✅ `Garmin.svg` - Official Garmin logo
- ✅ `GarminConnect.png` - Garmin Connect icon
- ✅ `garmin-logo.jpeg` - Additional branding

#### UX Flow Implementation

**1. Connect Button** ([frontend/index.html](frontend/index.html))
- Clear "Connect with Garmin" button using Garmin branding
- Located in device connection cards
- Uses Garmin colors and official logo

**2. Garmin Attribution Header**
- Displays "Powered by Garmin" with official logo
- Located in Garmin Data tab
- SVG logo at proper size (45px height)
- Location: HTML line ~523

**3. Footer Attribution**
- "Powered by Garmin, Strava, Whoop, and Oura"
- Displays all partner logos including Garmin.svg
- Proper brand logo sizing and spacing

**4. Meta Description**
- Mentions Garmin integration prominently
- Line 19: "Connect Strava, Garmin, Oura, and Whoop"

**5. Garmin Data Tab**
- Dedicated tab showing Garmin health & wellness data
- Displays activities, distance, avg HR, training time
- Charts showing HR zones, activity types, volume
- Clear attribution to Garmin throughout

#### Screenshots Needed for Submission
We will provide:
1. ✅ Connect screen showing "Connect with Garmin" button
2. ✅ Garmin Data tab with logo and attribution
3. ✅ Activity list showing Garmin-sourced data
4. ✅ Heart rate zone charts with Garmin branding
5. ✅ Footer showing "Powered by Garmin" attribution
6. ✅ Complete OAuth flow UX

---

### 3. Account Setup

#### API Blog Email Subscription
- **Status:** NEEDS COMPLETION
- **Action Required:** Sign up at developer.garmin.com for API updates
- **URL:** https://developer.garmin.com/gc-developer-program/blog/

#### Authorized Users
- **Current:** Darren Zwiers (primary account)
- **Status:** NEEDS SECOND USER
- **Requirements Met:**
  - ✅ Company domain email (not gmail/outlook)
  - ✅ Personalized email (not info@, support@, dev@)
  - ❌ Need to add second verified individual

#### Third-Party Integrators
- **Status:** N/A - No third-party integrators
- **Confirmation:** All development done in-house

---

## Technical Implementation Summary

### Endpoints Configured
| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/garmin/ping` | GET | Server health check | ✅ Working |
| `/api/garmin/push` | POST | Receive health data | ✅ Working |
| `/api/garmin/deregister` | POST | User disconnection | ✅ Working |
| `/api/garmin/permissions` | GET | Permission disclosure | ✅ Working |
| `/api/garmin/backfill` | POST | Historical data request | ✅ Working |

### Data Flow
1. User connects via OAuth 2.0
2. Garmin User ID stored in `providerUserId` field
3. Garmin sends PUSH notifications to `/api/garmin/push`
4. Server responds HTTP 200 within 30 seconds
5. Data processed asynchronously:
   - Activities → `activities` table
   - Heart rate zones → `heart_rate_zones` table
   - Daily metrics → `daily_metrics` table
6. Frontend displays data in Garmin tab

### Data Retention
- **Policy:** 90 days
- **Implementation:** Database cleanup scripts
- **Third-Party Sharing:** None

---

## Outstanding Actions (Before Deadline)

### Critical (Required for Approval)
1. ⚠️ **Add second authorized user to Garmin Developer account**
   - Must use company domain email
   - Must be personalized (not generic)
   - Update account within 24 hours

2. ⚠️ **Sign up for API Blog emails**
   - Visit developer.garmin.com
   - Subscribe to API updates
   - Confirm subscription

3. ⚠️ **Test with Partner Verification Tool**
   - Use Evaluation Key (ee6809d5-abc0-4a33-b38a-d433e5045987)
   - Verify all endpoints respond correctly
   - Confirm 2+ user authorizations

4. ⚠️ **Prepare UX Screenshots**
   - Connect screen
   - Garmin Data tab
   - Attribution examples
   - Complete OAuth flow
   - Activity displays with HR zones

### Submission Package
Once complete, submit to Garmin ticket:
- ✅ Confirmation all technical requirements met
- ✅ Partner Verification Tool results
- ✅ UX screenshots showing all Garmin branding
- ✅ Confirmation of API Blog subscription
- ✅ Confirmation of authorized users added

---

## Notes

### Why We Were Getting Errors
- We were attempting to use **PULL endpoints** (`/wellness-api/rest/activities`)
- Garmin Production Apps require **PUSH-only** implementation
- Our PUSH webhook was already working correctly
- We just needed to stop testing pull endpoints

### Current Status
- ✅ PUSH notification system fully working
- ✅ All required endpoints implemented
- ✅ Garmin branding properly displayed
- ❌ Need second authorized user
- ❌ Need API Blog subscription
- ❌ Need Partner Verification Tool testing
- ❌ Need UX screenshots for submission

### Timeline
- **Today (Nov 17):** Prepare compliance documentation ✅
- **Tomorrow (Nov 18):** Add second user, sign up for blog, run verification tool
- **Nov 19:** Take screenshots, prepare submission package
- **Nov 20:** Submit to Garmin (before 3-day deadline)

---

## Contact Information

**Developer:** Darren Zwiers
**Email:** [Your company email]
**Application:** Athlytx Fitness
**Website:** https://www.athlytx.com
**Garmin Support Ticket:** [Your ticket number]
