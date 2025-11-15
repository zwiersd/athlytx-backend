# ✅ QA Testing Checklist
## Athlytx Coach-Athlete Invitation System

**Version:** 2.0.0
**Test Environment:** Staging
**Tester:** _______________
**Date:** _______________

---

## 🎯 Test Coverage Summary

- **Total Test Cases:** 45
- **Critical:** 15
- **High:** 18
- **Medium:** 12

---

## 🔐 CRITICAL: Security Tests (Must Pass)

### Authentication & Authorization

- [ ] **TC-S01: Consent requires authentication**
  - Attempt POST `/api/invite/accept-with-consent` without session token
  - **Expected:** 401 Unauthorized
  - **Status:** ⏳ | ✅ | ❌
  - **Notes:** _____________

- [ ] **TC-S02: Invalid session rejected**
  - Use expired/invalid session token
  - **Expected:** 401 Session expired
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-S03: Can't accept invite for different email**
  - User A tries to accept invite meant for User B
  - **Expected:** 403 Invalid invitation for this user
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-S04: Can't share other user's devices**
  - Submit deviceIds belonging to different user
  - **Expected:** 403 Devices do not belong to this user
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-S05: Coach can only see own athletes**
  - Coach A tries to access Coach B's athlete data
  - **Expected:** 403 Access denied
  - **Status:** ⏳ | ✅ | ❌

---

### Rate Limiting

- [ ] **TC-S06: Consent rate limit enforced**
  - Make 6 consent requests in 15 minutes
  - **Expected:** 6th request returns 429 Rate limit exceeded
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-S07: Invite accept rate limit enforced**
  - Make 21 invite accept requests in 5 minutes
  - **Expected:** 21st request returns 429
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-S08: Coach invite rate limit enforced**
  - Create 11 invites in 1 hour from same IP
  - **Expected:** 11th invite returns 429
  - **Status:** ⏳ | ✅ | ❌

---

### Input Validation

- [ ] **TC-S09: Invalid email rejected**
  - Submit invite with email: `invalid-email`
  - **Expected:** 400 Invalid email address format
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-S10: Email injection prevented**
  - Submit email with newline: `test\n@example.com`
  - **Expected:** 400 Invalid email address
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-S11: Long email rejected**
  - Submit email > 255 characters
  - **Expected:** 400 Email address too long
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-S12: Invalid UUID rejected**
  - Submit token with invalid UUID format
  - **Expected:** 404 Invalid invitation (after 100ms delay)
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-S13: Empty deviceIds array rejected**
  - Submit consent with deviceIds: []
  - **Expected:** 400 Missing required fields
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-S14: Too many devices rejected**
  - Submit consent with 11 deviceIds
  - **Expected:** 400 Maximum 10 devices
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-S15: Missing consent checkbox**
  - Submit with consent: false
  - **Expected:** 400 Consent required
  - **Status:** ⏳ | ✅ | ❌

---

## 🎯 HIGH: Functionality Tests

### Coach Invite Flow

- [ ] **TC-F01: Coach can send invite**
  - Coach logs in, sends invite to athlete email
  - **Expected:** 200 Success, email sent
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-F02: Duplicate invite prevented**
  - Send same invite twice (same coach, same athlete)
  - **Expected:** 400 Pending invitation already exists
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-F03: Invite expires after 24 hours**
  - Create invite, wait 24 hours (or mock date)
  - **Expected:** 404 Invalid or expired invitation
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-F04: Invite email contains correct link**
  - Check email contains: `/athlete?invite={token}`
  - **Expected:** Link is clickable and valid
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-F05: Coach sees pending invites**
  - GET `/api/coach/invitations`
  - **Expected:** List includes sent invites with status
  - **Status:** ⏳ | ✅ | ❌

---

### Athlete Invite Acceptance - PATH A (Has Devices)

- [ ] **TC-F06: Athlete clicks invite link**
  - Navigate to `/athlete?invite={token}`
  - **Expected:** Athlete login page with invite notice
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-F07: Athlete logs in**
  - Enter email, receive magic link, login
  - **Expected:** Session created
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-F08: Consent screen shows devices**
  - After login with invite, see `/invite/accept`
  - **Expected:** All connected devices listed
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-F09: Consent screen shows coach info**
  - Check consent screen displays coach name/email
  - **Expected:** Coach information visible
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-F10: Accept button disabled until consent**
  - Try clicking accept before checking consent box
  - **Expected:** Button is disabled
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-F11: Athlete accepts and shares devices**
  - Check consent box, click Accept
  - **Expected:** 200 Success, redirect to dashboard
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-F12: DeviceShares created in database**
  - Query `device_shares` table after acceptance
  - **Expected:** Records exist for all devices
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-F13: Coach receives confirmation email**
  - Check coach's email after athlete accepts
  - **Expected:** Email confirms athlete accepted
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-F14: Athlete receives confirmation email**
  - Check athlete's email after accepting
  - **Expected:** Email confirms devices shared
  - **Status:** ⏳ | ✅ | ❌

---

### Athlete Invite Acceptance - PATH C (New User)

- [ ] **TC-F15: New user clicks invite link**
  - Use email not in system, click invite link
  - **Expected:** Login page with invite notice
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-F16: New user creates account**
  - Register new account
  - **Expected:** Account created successfully
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-F17: Onboarding requires device connection**
  - Try completing onboarding without devices
  - **Expected:** Complete button disabled
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-F18: Device connection successful**
  - Connect at least one device (Garmin/Strava/etc)
  - **Expected:** Device shows as connected
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-F19: Complete onboarding with invite**
  - Finish onboarding, devices automatically shared
  - **Expected:** Redirect to dashboard, coach notified
  - **Status:** ⏳ | ✅ | ❌

---

### Device Revocation

- [ ] **TC-F20: Athlete can revoke single device**
  - From dashboard, revoke access to one device
  - **Expected:** 200 Success, coach loses access to that device only
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-F21: Athlete can revoke all devices**
  - Revoke access to all devices for a coach
  - **Expected:** 200 Success, coach loses all access
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-F22: Coach receives revocation email**
  - Check coach's email after revocation
  - **Expected:** Email notifies of access removal
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-F23: Coach can't access revoked data**
  - Coach tries to view athlete data after revocation
  - **Expected:** 403 Access denied
  - **Status:** ⏳ | ✅ | ❌

---

## 📱 MEDIUM: Frontend/UX Tests

### Responsive Design

- [ ] **TC-U01: Mobile view (375px width)**
  - Test all pages on mobile viewport
  - **Expected:** All content readable, buttons accessible
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-U02: Tablet view (768px width)**
  - Test all pages on tablet viewport
  - **Expected:** Layout adjusts appropriately
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-U03: Desktop view (1920px width)**
  - Test all pages on desktop viewport
  - **Expected:** Optimal use of space
  - **Status:** ⏳ | ✅ | ❌

---

### Page Loading

- [ ] **TC-U04: Access page loads < 2 seconds**
  - Measure page load time
  - **Expected:** < 2000ms
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-U05: No JavaScript console errors**
  - Check browser console on all pages
  - **Expected:** No errors (warnings OK)
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-U06: Images load properly**
  - Check all logos and icons display
  - **Expected:** No broken images
  - **Status:** ⏳ | ✅ | ❌

---

### Forms & Validation

- [ ] **TC-U07: Email input validation**
  - Enter invalid email in forms
  - **Expected:** Client-side validation error
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-U08: Required fields marked**
  - Check forms show required fields clearly
  - **Expected:** Visual indication (asterisk, color, etc)
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-U09: Loading states shown**
  - Click submit buttons, observe feedback
  - **Expected:** Button shows "Loading..." or spinner
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-U10: Error messages displayed**
  - Trigger API errors, check user feedback
  - **Expected:** Clear error messages shown
  - **Status:** ⏳ | ✅ | ❌

---

### Cross-Browser Testing

- [ ] **TC-U11: Chrome/Edge (latest)**
  - Test complete flow
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-U12: Firefox (latest)**
  - Test complete flow
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-U13: Safari (latest)**
  - Test complete flow
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-U14: Mobile Safari (iOS)**
  - Test on actual iPhone or simulator
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-U15: Mobile Chrome (Android)**
  - Test on actual Android or emulator
  - **Status:** ⏳ | ✅ | ❌

---

## 🔄 MEDIUM: Data Integrity Tests

### Database

- [ ] **TC-D01: Transactions are atomic**
  - Force error during consent, check no partial data
  - **Expected:** Either all data saved or none
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-D02: Foreign key constraints enforced**
  - Delete user, check related data handled
  - **Expected:** Cascade deletes work correctly
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-D03: Indexes improve performance**
  - Run EXPLAIN on common queries
  - **Expected:** Indexes used, query < 100ms
  - **Status:** ⏳ | ✅ | ❌

---

### Concurrent Operations

- [ ] **TC-D04: Concurrent invite acceptance**
  - Two athletes accept simultaneously
  - **Expected:** Both succeed without errors
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-D05: Race condition protection**
  - Same athlete clicks accept twice quickly
  - **Expected:** Only one acceptance processed
  - **Status:** ⏳ | ✅ | ❌

---

## 📊 Performance Tests

- [ ] **TC-P01: API response time < 500ms**
  - Measure average response time of all endpoints
  - **Expected:** < 500ms p95
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-P02: Database query time < 100ms**
  - Measure query performance
  - **Expected:** < 100ms p95
  - **Status:** ⏳ | ✅ | ❌

- [ ] **TC-P03: Frontend page load < 2s**
  - Measure Time to Interactive
  - **Expected:** < 2000ms
  - **Status:** ⏳ | ✅ | ❌

---

## ✅ Final Sign-Off

### Test Results Summary

- **Critical Tests Passed:** ____ / 15
- **High Priority Passed:** ____ / 18
- **Medium Priority Passed:** ____ / 12
- **Overall Pass Rate:** ____ %

### Blockers Found

1. _____________________________
2. _____________________________
3. _____________________________

### Deployment Decision

- [ ] ✅ **APPROVED FOR PRODUCTION** - All critical tests passed
- [ ] ⚠️ **APPROVED WITH NOTES** - Minor issues, can deploy
- [ ] ❌ **REJECTED** - Critical issues found, do not deploy

### Sign-Off

**QA Tester:** _______________
**Date:** _______________
**Signature:** _______________

**Technical Lead:** _______________
**Date:** _______________
**Signature:** _______________

---

## 📝 Notes & Issues

_Use this space to document any issues found during testing:_

---

**Test Completed:** ⏳ Pending
**Ready for Production:** ⏳ Pending QA
