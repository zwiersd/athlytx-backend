# Athlete Profile Settings Fix

## Issue Fixed

### Missing Profile Editor in Athlete Settings ✅
**Problem**: Athletes had a settings page (`athlete-settings.html`) but it only showed:
- Coach management (revoke access)
- Account deletion

**Missing**: No way to update profile (name, sport, timezone) after onboarding!

**Root Cause**: The settings page existed but lacked profile editing functionality.

## Solution

Added complete profile editing section to athlete settings page.

## Files Modified

### Frontend
1. **`frontend/athlete-settings.html`**
   - Added Profile section (line 377-427)
   - Added profile loading function (line 594-602)
   - Added profile form handler (line 604-644)
   - Added success/error messages (line 646-661)

### Backend
2. **`backend/routes/auth.js`**
   - Enhanced `POST /api/auth/update-profile` (line 660-719)
   - Now handles athlete fields: sport, timezone, dateOfBirth
   - Already handled coach fields: organization, specialty, bio

## What Was Added

### Profile Section UI
Athletes can now update:
- **Full Name** - Text input
- **Primary Sport** - Dropdown (Running, Cycling, Triathlon, Swimming, Strength, CrossFit, Other)
- **Timezone** - Dropdown (All major US/EU/Asia/AU timezones)

### Features
- Auto-loads current profile from session
- Real-time validation
- Success/error messages
- Reset button to reload original values
- Saves to localStorage automatically
- Responsive design

## How It Works

### Profile Loading
```javascript
// When page loads
1. Check session authentication
2. Load profile from session.user
3. Populate form fields
```

### Profile Update Flow
```
Athlete clicks "Settings" in dashboard
    ↓
Profile section loads with current data
    ↓
Athlete updates fields
    ↓
Clicks "Save Changes"
    ↓
POST /api/auth/update-profile
    ↓
Backend updates user record
    ↓
Returns updated user object
    ↓
Session storage updated
    ↓
Success message shown
```

## Comparison: Before vs After

### Before
```
Athlete Settings Page:
├── My Coaches ✅
├── Danger Zone ✅
└── Profile Settings ❌ MISSING
```

### After
```
Athlete Settings Page:
├── Profile Settings ✅ NEW!
│   ├── Full Name
│   ├── Primary Sport
│   └── Timezone
├── My Coaches ✅
└── Danger Zone ✅
```

## Testing

### Test Profile Update

1. Login as an athlete
2. Click "Settings" in dashboard
3. Verify Profile section appears first
4. Update fields:
   - Change name to "Test Athlete"
   - Change sport to "Triathlon"
   - Change timezone to "Pacific Time"
5. Click "Save Changes"
6. Verify success message appears
7. Refresh page
8. Verify changes persisted
9. Click "Reset" button
10. Verify form reloads from session

## API Endpoint Enhancement

### POST /api/auth/update-profile

Now handles BOTH coach and athlete fields in a single endpoint.

**Athlete Request**:
```json
{
  "sessionToken": "session-token-here",
  "name": "Test Athlete",
  "sport": "triathlon",
  "timezone": "America/Los_Angeles"
}
```

**Coach Request**:
```json
{
  "sessionToken": "session-token-here",
  "name": "Test Coach",
  "organization": "Elite Running Club",
  "specialty": "running",
  "bio": "Experienced coach..."
}
```

**Response** (returns all fields):
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@test.com",
    "name": "Test User",
    "role": "athlete",
    // Coach fields (null for athletes)
    "organization": null,
    "specialty": null,
    "bio": null,
    // Athlete fields (null for coaches)
    "sport": "triathlon",
    "timezone": "America/Los_Angeles",
    "dateOfBirth": null
  }
}
```

## Database Fields

The `users` table now uses these athlete-specific fields:
- `sport` - Primary sport/activity (optional)
- `timezone` - User's timezone for data display (optional)
- `dateOfBirth` - Athlete's birthdate for age-based metrics (optional, not yet in UI)

## User Experience Improvements

**Before**:
- ❌ Athletes could set profile during onboarding
- ❌ NO way to change it after
- ❌ Sport/timezone locked forever
- ❌ Had to email support to update

**After**:
- ✅ Complete profile section in settings
- ✅ Update anytime
- ✅ Immediate save with feedback
- ✅ Changes persist across sessions
- ✅ Self-service profile management

## Integration with Existing Features

### Athlete Onboarding
- Onboarding still works (line 770 in auth.js)
- Sets initial sport, timezone, name
- Now can be changed later via settings

### Coach Dashboard
- Coaches see athlete sport in athlete list
- Timezone used for data display
- Name shown in athlete cards

### Session Management
- Profile changes update session storage
- No need to re-login
- Changes reflected immediately

## Next Steps (Optional Enhancements)

1. **Date of Birth Field**: Add to UI (currently in backend but not frontend)
2. **Profile Photo**: Avatar upload
3. **Athlete Bio**: Add bio field for athletes (like coaches have)
4. **Activity Preferences**: Preferred units (miles/km, etc.)
5. **Notification Settings**: Email/push preferences
6. **Privacy Controls**: What coaches can see
7. **Performance Goals**: Set personal targets

## Security Considerations

- ✅ Session token required for all updates
- ✅ Session expiry checked
- ✅ User can only update own profile
- ✅ Input validation on all fields
- ✅ Profile changes logged

## Summary

### Coach Settings
- ✅ Onboarding flow
- ✅ Settings page with profile editor
- ✅ Can update: name, organization, specialty, bio
- ✅ Settings button in dashboard

### Athlete Settings
- ✅ Onboarding flow (already existed)
- ✅ Settings page enhanced
- ✅ Can update: name, sport, timezone
- ✅ Settings link in dashboard (already existed)

### Shared Backend
- ✅ Single `/api/auth/update-profile` endpoint
- ✅ Handles coach-specific fields
- ✅ Handles athlete-specific fields
- ✅ Returns complete user object

---

**Status**: ✅ Complete - Athletes and Coaches both have full profile management

**Last Updated**: 2025-11-16
