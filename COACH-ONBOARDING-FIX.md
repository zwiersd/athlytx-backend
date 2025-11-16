# Coach Onboarding & Settings Fix

## Issues Fixed

### 1. Missing Coach Onboarding ✅
**Problem**: New coaches weren't going through onboarding - the form existed but the backend endpoint was missing.

**Root Cause**: Frontend form at `/coach-onboarding.html` was submitting to `/api/auth/register/coach` but this endpoint didn't exist.

**Solution**: Created the missing endpoint at `backend/routes/auth.js:562`

**Features**:
- Accepts full profile data: firstName, lastName, email, organization, specialty, bio
- Creates or updates coach user with complete profile
- Sends magic link for immediate login
- Sends admin notification for new coach signups
- Returns magic link in dev mode for testing

### 2. Missing Coach Settings/Profile Management ✅
**Problem**: No way for coaches to update their profile after signup.

**Root Cause**:
- No settings page existed
- Update profile endpoint only handled `name`, not other fields

**Solution**:
- Created new settings page: `frontend/coach-settings.html`
- Enhanced `/api/auth/update-profile` to handle all profile fields
- Added Settings button to coach dashboard header

**Settings Page Features**:
- View account information (email, user ID, role)
- Update full name
- Update organization/team
- Update specialty
- Update bio
- Sign out functionality
- Auto-saves to localStorage
- Responsive design

## Files Modified

### Backend
1. **`backend/routes/auth.js`**
   - Added `POST /api/auth/register/coach` (line 562-654)
   - Enhanced `POST /api/auth/update-profile` (line 660-707)

### Frontend
2. **`frontend/coach-settings.html`** - NEW FILE
   - Complete settings page with profile management

3. **`frontend/coach-elite.html`**
   - Added Settings button to header (line 1018-1020)

## How It Works Now

### Coach Registration Flow

```
User visits /coach-onboarding.html
    ↓
Fills out form (name, email, org, specialty, bio)
    ↓
Submits to POST /api/auth/register/coach
    ↓
Backend creates/updates user with full profile
    ↓
Sends magic link to email
    ↓
Coach clicks magic link
    ↓
Logs into /elite dashboard
```

### Settings Management Flow

```
Coach clicks "Settings" button in dashboard
    ↓
Opens /coach-settings.html
    ↓
Loads current profile from localStorage
    ↓
Coach updates fields
    ↓
Submits to POST /api/auth/update-profile
    ↓
Backend updates all provided fields
    ↓
Returns updated profile
    ↓
localStorage updated
    ↓
Success message shown
```

## Testing

### Test Coach Onboarding

1. Visit `/coach-onboarding.html`
2. Fill out the form:
   - First Name: John
   - Last Name: Smith
   - Email: coach@test.com
   - Organization: Elite Running Club
   - Specialty: Running
   - Bio: "Experienced running coach..."
3. Submit
4. Check server logs for magic link (in dev mode)
5. Use magic link to login
6. Verify you're logged into dashboard

### Test Settings

1. Login as a coach
2. Click "⚙️ Settings" button in header
3. Verify current profile loads
4. Update fields:
   - Change name
   - Update organization
   - Change specialty
   - Edit bio
5. Click "Save Changes"
6. Verify success message
7. Click "Reset" to reload original values
8. Click "Back to Dashboard" to return

## API Endpoints

### POST /api/auth/register/coach
Complete coach onboarding with full profile.

**Request**:
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "email": "coach@test.com",
  "organization": "Elite Running Club",
  "specialty": "running",
  "bio": "Experienced coach..."
}
```

**Response**:
```json
{
  "success": true,
  "message": "Account created! Check your email for the magic link to login.",
  "userId": "uuid-here",
  "code": "123456",  // dev only
  "token": "token-here"  // dev only
}
```

### POST /api/auth/update-profile
Update coach profile information.

**Request**:
```json
{
  "sessionToken": "session-token",
  "name": "John Smith",
  "organization": "New Org Name",
  "specialty": "triathlon",
  "bio": "Updated bio..."
}
```

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "coach@test.com",
    "name": "John Smith",
    "organization": "New Org Name",
    "specialty": "triathlon",
    "bio": "Updated bio...",
    "role": "coach"
  }
}
```

## Database Fields

The following fields are now used in the `users` table for coaches:
- `email` - Coach's email (required, unique)
- `name` - Full name (required)
- `organization` - Team/club name (optional)
- `specialty` - Coaching specialty (optional)
- `bio` - Coach bio/description (optional)
- `role` - Set to 'coach'
- `isActive` - Set to true

## User Experience Improvements

**Before**:
- ❌ Coaches had no onboarding flow
- ❌ No way to set organization or specialty
- ❌ No settings page to manage profile
- ❌ Could only update name via hidden modal

**After**:
- ✅ Complete onboarding with all profile fields
- ✅ Organization and specialty captured during signup
- ✅ Dedicated settings page accessible from dashboard
- ✅ Can update all profile fields anytime
- ✅ Settings button prominently displayed in header
- ✅ Auto-saves to localStorage for quick access

## Next Steps (Optional Enhancements)

1. **Profile Photos**: Add avatar upload to settings
2. **Certifications**: Add field for coaching certifications
3. **Social Links**: Add LinkedIn, Twitter, etc.
4. **Email Preferences**: Add notification settings
5. **Password**: Option to set password for non-magic-link login
6. **Delete Account**: Add account deletion option
7. **Export Data**: Allow coaches to export their data

## Security Considerations

- ✅ Session token required for profile updates
- ✅ Session expiry checked on every update
- ✅ Email normalization (lowercase, trim)
- ✅ Input sanitization on all fields
- ✅ Admin notification on new coach signup
- ✅ Magic link expiration (15 minutes)

## Rollout Plan

1. Deploy backend changes to staging
2. Test onboarding flow end-to-end
3. Test settings page functionality
4. Verify magic link email delivery
5. Check admin notifications
6. Deploy to production
7. Monitor for errors
8. Notify existing coaches about new settings page

## Support Documentation

Add to coach help docs:
- How to complete onboarding
- How to access settings
- How to update profile
- What each field means
- How to manage account

---

**Status**: ✅ Complete and ready for testing

**Last Updated**: 2025-11-16
