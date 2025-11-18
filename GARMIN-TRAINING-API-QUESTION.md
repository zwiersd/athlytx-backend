# Training/Courses API Requirement - Clarification Needed

**Date:** November 17, 2025
**Status:** QUESTION for Garmin Support

---

## The Requirement

From Garmin's compliance email:

> "Training/Courses API: screenshot of successful transfer of workout/course at Garmin Connect"

---

## Our Situation

### What We're Using
- **Health API** - via PUSH notifications
  - Receives activity data (runs, bikes, swims, etc.)
  - Receives daily health summaries
  - Receives heart rate zones
  - Receives sleep and wellness data

### What We're NOT Using
- **Training/Courses API**
  - Creating workout plans
  - Scheduling workouts
  - Uploading courses
  - Sending training data TO Garmin

---

## The Question

**Does the Training/Courses API requirement apply to ALL apps, or only apps that use the Training/Courses API?**

### Two Possible Interpretations

#### Interpretation 1: Conditional Requirement
"IF you're using Training/Courses API, THEN provide screenshot"
- Makes sense for apps that CREATE workouts for users
- Would NOT apply to us (we only READ activity data)

#### Interpretation 2: Universal Requirement
"ALL apps must demonstrate Training/Courses API functionality"
- Would require us to implement workout creation
- Seems unlikely for apps that only read data

---

## Our Use Case

**Athlytx** is an analytics and tracking platform:

1. **What we DO:**
   - Connect to user's Garmin account
   - Receive their activity data via PUSH webhook
   - Analyze heart rate zones
   - Display training metrics
   - Provide performance insights

2. **What we DON'T do:**
   - Create workout plans for users
   - Schedule workouts to Garmin calendar
   - Upload courses to Garmin devices
   - Send training data back to Garmin

---

## Why This Matters

### If NOT Required
- We're already compliant
- Can proceed with current implementation
- Submit compliance package as planned

### If Required
- Need to implement Training/Courses functionality
- Add workout creation endpoint
- Test workout transfer to Garmin Connect
- Take screenshots showing successful transfer
- Adds 2-3 days of development work
- May miss 3-day deadline

---

## Recommended Action

### Include in Email to Garmin

Add this clarification request to your compliance response:

```
**Training/Courses API Requirement:**

We noticed the requirement for "screenshot of successful transfer
of workout/course at Garmin Connect."

Our application (Athlytx) uses the Health API to RECEIVE activity
data from users via PUSH notifications. We do not currently use
the Training/Courses API to CREATE or SCHEDULE workouts.

**Question:** Does the Training/Courses API requirement apply to:
1. ALL applications regardless of API usage, OR
2. Only applications that actively use the Training/Courses API?

If this is a universal requirement, we will need to implement
Training/Courses functionality and may require a brief extension
to the deadline to complete this additional development.

Please advise on whether this requirement applies to our use case.
```

---

## If They Say It's Required

### Implementation Steps

1. **Add Training/Courses API to App Settings**
   - Request access in Garmin Developer Portal
   - Wait for approval

2. **Implement Workout Creation Endpoint**
   - Create endpoint to receive workout data
   - Format according to Garmin Training API spec
   - POST to Garmin's workout upload endpoint

3. **Test Workout Transfer**
   - Create test workout in our app
   - Upload to Garmin Connect
   - Verify it appears in user's calendar

4. **Take Screenshots**
   - Screenshot of workout in our app
   - Screenshot of workout successfully transferred to Garmin Connect
   - Screenshot showing workout in Garmin calendar

5. **Update Documentation**
   - Add Training/Courses API to compliance docs
   - Update endpoints list
   - Include screenshots in submission

**Time Required:** 2-3 days of development + testing

---

## Most Likely Scenario

Based on the wording and context, **this requirement likely only applies IF using Training/Courses API**.

### Evidence
1. It's listed as a specific API requirement (not general)
2. It says "Training/Courses API: screenshot..." suggesting conditional
3. Most apps receiving data don't need to send data back
4. Health API alone is sufficient for our use case

### Recommendation
- Ask for clarification in your email
- Don't start implementing unless confirmed required
- Include the question prominently so Garmin addresses it

---

## Summary

**Question for Garmin:**
> "Does the Training/Courses API screenshot requirement apply to all apps, or only apps actively using the Training/Courses API to create/schedule workouts?"

**Our Position:**
- We use Health API only (receiving data)
- We don't create workouts or courses
- This requirement seems conditional on API usage

**Action:**
- Include clarification request in compliance email
- Wait for Garmin's response before implementing
- If required, request brief deadline extension

---

## Updated Compliance Timeline

### If NOT Required (Most Likely)
- **Nov 17:** Send email with clarification question ✅
- **Nov 18:** Add 2nd user, run Partner Tool
- **Nov 19:** Screenshots, submit package
- **Timeline:** On track

### If Required
- **Nov 17-18:** Garmin confirms requirement
- **Nov 18-19:** Implement Training/Courses functionality
- **Nov 20-21:** Test and take screenshots
- **Nov 22:** Submit with Training/Courses evidence
- **Timeline:** Need 2-3 day extension

---

## Notes

- Don't panic - most likely NOT required for your use case
- Ask the question clearly in your email
- Garmin should respond within 24 hours
- If required, politely request extension citing the additional development work

---

**Conclusion:** Include the clarification question in your email to Garmin today, but proceed with the existing compliance plan. Only implement Training/Courses if Garmin confirms it's required for your application.
