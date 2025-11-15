# Athlytx Elite - Technical Brief & Implementation Plan

## Project Overview

**Project Name:** Athlytx Elite  
**Purpose:** Multi-user platform for coaches to monitor and analyse athlete training data  
**Tech Stack:** React (frontend), Node.js/Express (backend), PostgreSQL (database), Railway (deployment)  
**Key Innovation:** Seamless integration with existing Athlytx homepage device connections

---

## Executive Summary

Athlytx Elite extends the existing Athlytx platform by adding coach-athlete relationship management. Coaches can invite athletes, view their training data, and provide insights. Athletes maintain full control over their data through explicit consent mechanisms.

**Critical Requirement:** Athletes who already use the main Athlytx homepage (with connected devices) should NOT need to reconnect their devices when accepting a coach invitation. We detect existing connections and request consent to share them.

---

## User Roles & Access

### Coach
- **Registration:** Open (anyone can become a coach)
- **Dashboard:** `/coach`
- **Capabilities:**
  - View multiple athletes' data
  - Send athlete invitations via email
  - Analyse training metrics, HR zones, recovery data
  - Manage roster
  - Edit profile (name, business name)

### Athlete
- **Registration:** Invitation-only from coaches
- **Dashboard:** `/athlete`
- **Capabilities:**
  - View personal training data
  - Accept/manage multiple coach relationships
  - Connect/manage devices (Garmin, Strava, Whoop, Oura)
  - Grant/revoke coach access to specific devices
  - Edit profile (name, sport)

---

## Authentication System

### Magic Link Authentication
**Flow for both coaches and existing athletes:**

1. User enters email at `/coach` or `/athlete`
2. Backend generates unique token (UUID), stores in `MagicLink` table with 15-minute expiry
3. Email sent with link: `https://athlytx.com/auth/verify?token={token}`
4. User clicks, backend validates token (not expired, not used)
5. If valid:
   - Mark `MagicLink.usedAt`
   - Generate JWT with 7-day expiry
   - Set httpOnly, Secure, SameSite cookie
   - Redirect to appropriate dashboard

**Session Management:**
- **MVP:** 7-day session cookie, re-auth via magic link after expiry
- **Production:** Implement refresh tokens (15min access, 30-day refresh) with rotation

---

## Invitation System

### Coach Sends Invitation

**UI Flow:**
1. Coach navigates to "Invite Athlete" in dashboard
2. Enters athlete email, optional message, selects role (primary/assistant/viewer)
3. Submits form

**Backend Process:**
1. Create `Invite` record:
   - Generate unique `inviteToken` (UUID)
   - Set `expiresAt` (24 hours default, extendable to 72 hours)
   - Link to `coachId`
   - Store `athleteEmail`, `message`, `roleRequested`
2. Send invitation email with magic link containing `inviteToken`
3. Coach sees pending invitation in dashboard

### Athlete Accepts Invitation

**Critical: Device Connection Detection**

**Flow:**
1. Athlete clicks magic link in email
2. Backend validates `inviteToken` (not expired, not revoked, not accepted)
3. **DETECTION PHASE:**
   ```javascript
   const existingUser = await User.findOne({ email: invite.athleteEmail });
   
   if (existingUser) {
     // EXISTING USER PATH
     const devices = await DeviceConnection.findAll({ 
       where: { athleteId: existingUser.id } 
     });
     
     if (devices.length > 0) {
       // User has devices - SKIP device connection, show consent screen
       return {
         onboardNeeded: false,
         existingDevices: devices,
         requireConsent: true
       };
     } else {
       // User exists but no devices - standard onboarding
       return {
         onboardNeeded: true,
         requireDeviceConnect: true
       };
     }
   } else {
     // NEW USER PATH
     return {
       onboardNeeded: true,
       requireDeviceConnect: true
     };
   }
   ```

4. **PATH A - Existing User with Devices:**
   - Authenticate user
   - Create `CoachAthlete` relationship
   - Mark `Invite.acceptedAt`
   - Show **consent screen** with list of connected devices
   - Athlete reviews and ticks consent checkbox
   - Backend sets `share_with_coaches = true` on selected devices
   - Creates audit records in `device_shares` table
   - Sends confirmation emails to both parties
   - Redirects to athlete dashboard

5. **PATH B - Existing User without Devices OR New User:**
   - Create user if doesn't exist
   - Show onboarding form (name, sport, terms acceptance)
   - **Require connecting minimum 1 device** using existing OAuth flows
   - Create `CoachAthlete` relationship
   - Mark `Invite.acceptedAt`
   - Sends confirmation emails
   - Redirects to athlete dashboard

---

## Database Schema

### Existing Tables (Already in Athlytx)

#### Users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  role ENUM('coach', 'athlete') NOT NULL,
  business_name VARCHAR(255), -- For coaches only
  sport VARCHAR(100), -- For athletes only
  deleted_at TIMESTAMP, -- Soft delete
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

### New Tables for Elite

#### CoachAthlete (Relationship Table)
```sql
CREATE TABLE coach_athlete (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role ENUM('primary', 'assistant', 'viewer') DEFAULT 'primary',
  status ENUM('active', 'revoked') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(coach_id, athlete_id)
);

CREATE INDEX idx_coach_athlete_coach ON coach_athlete(coach_id);
CREATE INDEX idx_coach_athlete_athlete ON coach_athlete(athlete_id);
CREATE INDEX idx_coach_athlete_status ON coach_athlete(status);
```

#### Invite
```sql
CREATE TABLE invite (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  athlete_email VARCHAR(255) NOT NULL,
  invite_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  message TEXT,
  role_requested ENUM('primary', 'assistant', 'viewer') DEFAULT 'primary',
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invite_token ON invite(invite_token);
CREATE INDEX idx_invite_athlete_email ON invite(athlete_email);
CREATE INDEX idx_invite_coach ON invite(coach_id);
```

#### MagicLink
```sql
CREATE TABLE magic_link (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  invite_id UUID REFERENCES invite(id) ON DELETE SET NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_magic_link_token ON magic_link(token);
CREATE INDEX idx_magic_link_email ON magic_link(email);
```

#### DeviceConnection (Enhanced - Add new fields to existing table)
```sql
-- Add these columns to existing device_connections table
ALTER TABLE device_connections ADD COLUMN IF NOT EXISTS provider_user_id VARCHAR(255);
ALTER TABLE device_connections ADD COLUMN IF NOT EXISTS share_with_coaches BOOLEAN DEFAULT false;
ALTER TABLE device_connections ADD COLUMN IF NOT EXISTS scopes JSONB;

CREATE INDEX idx_device_provider_user ON device_connections(provider, provider_user_id);
CREATE INDEX idx_device_athlete_provider ON device_connections(athlete_id, provider);
```

#### DeviceShares (New Audit Table)
```sql
CREATE TABLE device_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES device_connections(id) ON DELETE CASCADE,
  consent_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP, -- Optional expiry
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_device_shares_athlete_coach ON device_shares(athlete_id, coach_id);
CREATE INDEX idx_device_shares_device ON device_shares(device_id);
```

---

## API Endpoints

### Authentication

#### POST /api/auth/request-magic-link
**Purpose:** Request magic link for login  
**Body:**
```json
{
  "email": "user@example.com",
  "userType": "coach" | "athlete"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Magic link sent to user@example.com"
}
```

#### GET /api/auth/verify?token={token}
**Purpose:** Verify magic link and create session  
**Response:** Redirects to dashboard with session cookie set

#### POST /api/auth/logout
**Purpose:** Clear session  
**Response:**
```json
{
  "success": true
}
```

---

### Invitations

#### POST /api/coach/invite
**Purpose:** Coach sends invitation to athlete  
**Auth:** Required (coach only)  
**Body:**
```json
{
  "athleteEmail": "athlete@example.com",
  "message": "Looking forward to working together!",
  "role": "primary"
}
```
**Response:**
```json
{
  "success": true,
  "invite": {
    "id": "uuid",
    "athleteEmail": "athlete@example.com",
    "expiresAt": "2024-11-16T10:00:00Z",
    "status": "pending"
  }
}
```

#### GET /api/coach/invites
**Purpose:** Get all invitations sent by coach  
**Auth:** Required (coach only)  
**Response:**
```json
{
  "invites": [
    {
      "id": "uuid",
      "athleteEmail": "athlete@example.com",
      "status": "pending",
      "expiresAt": "2024-11-16T10:00:00Z",
      "createdAt": "2024-11-15T10:00:00Z"
    }
  ]
}
```

#### POST /api/coach/invite/:id/revoke
**Purpose:** Revoke pending invitation  
**Auth:** Required (coach only)  
**Response:**
```json
{
  "success": true,
  "message": "Invitation revoked"
}
```

#### GET /api/invite/accept?token={inviteToken}
**Purpose:** Validate invitation and return user/device status  
**Response (existing user with devices):**
```json
{
  "onboardNeeded": false,
  "user": {
    "id": "uuid",
    "email": "athlete@example.com",
    "name": "John Doe",
    "sport": "Running"
  },
  "devices": [
    {
      "id": "device-uuid",
      "provider": "strava",
      "connectedAt": "2024-01-15T10:00:00Z",
      "lastSync": "2024-11-15T08:00:00Z"
    }
  ],
  "coach": {
    "name": "Coach Sarah",
    "businessName": "Elite Performance"
  },
  "invite": {
    "message": "Looking forward to working together!",
    "role": "primary"
  }
}
```

**Response (new user):**
```json
{
  "onboardNeeded": true,
  "requireDeviceConnect": true,
  "coach": {
    "name": "Coach Sarah",
    "businessName": "Elite Performance"
  }
}
```

---

### Device Sharing & Consent

#### POST /api/athlete/consent-share
**Purpose:** Record athlete's consent to share devices with coach  
**Auth:** Required (athlete only)  
**Body:**
```json
{
  "athleteId": "uuid",
  "coachId": "uuid",
  "deviceIds": ["device-uuid-1", "device-uuid-2"],
  "consent": true
}
```
**Backend Actions:**
1. `UPDATE device_connections SET share_with_coaches = true WHERE id IN (...)`
2. `INSERT INTO device_shares (athlete_id, coach_id, device_id, consent_at) VALUES (...)`
3. Send confirmation emails
4. Log audit trail

**Response:**
```json
{
  "success": true,
  "sharedDevices": [
    { "provider": "strava", "sharedAt": "2024-11-15T10:00:00Z" },
    { "provider": "garmin", "sharedAt": "2024-11-15T10:00:00Z" }
  ],
  "coachNotified": true
}
```

#### POST /api/athlete/revoke-access
**Purpose:** Revoke coach access to devices  
**Auth:** Required (athlete only)  
**Body:**
```json
{
  "athleteId": "uuid",
  "coachId": "uuid",
  "deviceIds": ["device-uuid-1"] // or null for all
}
```
**Backend Actions:**
1. `UPDATE device_connections SET share_with_coaches = false WHERE id IN (...)`
2. `UPDATE device_shares SET revoked_at = NOW() WHERE ...`
3. If all devices revoked: `UPDATE coach_athlete SET status = 'revoked'`
4. Notify coach
5. Log audit trail

**Response:**
```json
{
  "success": true,
  "revokedDevices": ["strava"],
  "relationshipStatus": "partial" // or "revoked"
}
```

#### GET /api/athlete/device-status
**Purpose:** Get athlete's devices and sharing status  
**Auth:** Required (athlete only)  
**Response:**
```json
{
  "devices": [
    {
      "id": "uuid",
      "provider": "strava",
      "shareWithCoaches": true,
      "sharedWith": [
        {
          "coachId": "uuid",
          "coachName": "Coach Sarah",
          "businessName": "Elite Performance",
          "sharedAt": "2024-11-01T10:00:00Z",
          "canRevoke": true
        }
      ],
      "lastSync": "2024-11-15T08:00:00Z",
      "status": "active"
    }
  ]
}
```

---

### Coach Dashboard

#### GET /api/coach/athletes
**Purpose:** Get all athletes connected to coach  
**Auth:** Required (coach only)  
**Response:**
```json
{
  "athletes": [
    {
      "id": "uuid",
      "name": "John Doe",
      "sport": "Running",
      "relationshipStatus": "active",
      "connectedDevices": ["strava", "garmin"],
      "lastSync": "2024-11-15T08:00:00Z",
      "metrics": {
        "athlytxScore": 78,
        "recoveryScore": 85,
        "hrv": 65,
        "restingHr": 48
      }
    }
  ]
}
```

#### GET /api/coach/athlete/:athleteId/data
**Purpose:** Get detailed athlete data  
**Auth:** Required (coach only, must have active relationship)  
**Response:**
```json
{
  "athlete": {
    "id": "uuid",
    "name": "John Doe",
    "sport": "Running"
  },
  "devices": ["strava", "garmin", "oura"],
  "recentActivities": [
    {
      "id": "activity-uuid",
      "type": "run",
      "date": "2024-11-14",
      "duration": 3600,
      "distance": 10000,
      "avgHr": 145,
      "trainingLoad": 85
    }
  ],
  "dailyMetrics": [
    {
      "date": "2024-11-14",
      "athlytxScore": 78,
      "hrv": 65,
      "restingHr": 48,
      "sleep": 7.5,
      "readiness": 82
    }
  ]
}
```

---

### Athlete Dashboard

#### GET /api/athlete/coaches
**Purpose:** Get all coaches athlete is connected to  
**Auth:** Required (athlete only)  
**Response:**
```json
{
  "coaches": [
    {
      "id": "uuid",
      "name": "Coach Sarah",
      "businessName": "Elite Performance",
      "role": "primary",
      "status": "active",
      "connectedAt": "2024-11-01T10:00:00Z",
      "sharedDevices": ["strava", "garmin"]
    }
  ]
}
```

#### GET /api/athlete/dashboard
**Purpose:** Get athlete's personal dashboard data  
**Auth:** Required (athlete only)  
**Response:**
```json
{
  "athlete": {
    "name": "John Doe",
    "sport": "Running"
  },
  "devices": [
    {
      "provider": "strava",
      "status": "connected",
      "lastSync": "2024-11-15T08:00:00Z"
    }
  ],
  "recentActivities": [...],
  "metrics": {
    "athlytxScore": 78,
    "recoveryScore": 85
  }
}
```

---

## Frontend Routes & Components

### Routes

```
/access                 - Entry point: choose coach or athlete
/coach                  - Coach dashboard (auth required)
/coach/login            - Coach login page
/athlete                - Athlete dashboard (auth required)
/athlete/login          - Athlete login page
/auth/verify            - Magic link verification handler
/invite/accept          - Invitation acceptance flow
```

### Key Components

#### /access Page
```jsx
// Glassmorphism design with two cards
<AccessPage>
  <Card onClick={() => navigate('/coach/login')}>
    <Icon>👨‍💼</Icon>
    <Title>I'm a Coach</Title>
    <Description>Manage athletes and analyse their training data</Description>
  </Card>
  
  <Card onClick={() => navigate('/athlete/login')}>
    <Icon>🏃</Icon>
    <Title>I'm an Athlete</Title>
    <Description>Connect with your coach and track your progress</Description>
  </Card>
</AccessPage>
```

#### Coach Dashboard
```jsx
<CoachDashboard>
  <Header>
    <BusinessName>Elite Performance</BusinessName>
    <ProfileMenu />
  </Header>
  
  <InviteButton onClick={openInviteModal}>Invite Athlete</InviteButton>
  
  <AthleteGrid>
    {athletes.map(athlete => (
      <AthleteCard key={athlete.id}>
        <AthleteName>{athlete.name}</AthleteName>
        <QuickMetrics>
          <Metric label="AthlytxScore" value={athlete.metrics.athlytxScore} />
          <Metric label="Recovery" value={athlete.metrics.recoveryScore} />
          <Metric label="HRV" value={athlete.metrics.hrv} />
        </QuickMetrics>
        <RecentActivities activities={athlete.recentActivities.slice(0, 3)} />
        <TrendSparkline data={athlete.trends} />
        <ViewDetailButton onClick={() => navigate(`/coach/athlete/${athlete.id}`)}>
          View Details
        </ViewDetailButton>
      </AthleteCard>
    ))}
  </AthleteGrid>
</CoachDashboard>
```

#### Athlete Dashboard
```jsx
<AthleteDashboard>
  <Header>
    <WelcomeMessage>Welcome back, {name}</WelcomeMessage>
    <ProfileMenu />
  </Header>
  
  <ConnectedCoaches>
    <SectionTitle>Your Coaches</SectionTitle>
    {coaches.map(coach => (
      <CoachCard key={coach.id}>
        <CoachName>{coach.name}</CoachName>
        <BusinessName>{coach.businessName}</BusinessName>
        <SharedDevices devices={coach.sharedDevices} />
        <RevokeButton onClick={() => handleRevoke(coach.id)}>
          Manage Access
        </RevokeButton>
      </CoachCard>
    ))}
  </ConnectedCoaches>
  
  <DeviceStatus>
    <SectionTitle>Connected Devices</SectionTitle>
    {devices.map(device => (
      <DeviceCard key={device.id}>
        <ProviderLogo provider={device.provider} />
        <LastSync>{device.lastSync}</LastSync>
        <SharingStatus shared={device.shareWithCoaches} />
      </DeviceCard>
    ))}
  </DeviceStatus>
  
  <PersonalMetrics>
    {/* Same visualisations as coach sees, but athlete-focused language */}
  </PersonalMetrics>
</AthleteDashboard>
```

#### Consent Screen (Critical Component)
```jsx
<ConsentScreen coach={coachData} devices={existingDevices}>
  <Title>Share Your Connected Devices</Title>
  
  <Description>
    These devices are already connected to your Athlytx account. 
    By accepting this invitation, you allow <strong>{coach.name}</strong> 
    to see data from these sources:
  </Description>
  
  <DeviceList>
    {devices.map(device => (
      <DeviceItem key={device.id}>
        <Checkbox checked disabled />
        <ProviderInfo>
          <ProviderName>{device.provider}</ProviderName>
          <DataDescription>
            {getProviderDataDescription(device.provider)}
          </DataDescription>
        </ProviderInfo>
        <ConnectedBadge>✓ Connected</ConnectedBadge>
      </DeviceItem>
    ))}
  </DeviceList>
  
  <ConsentCheckbox>
    <input 
      type="checkbox" 
      id="consent" 
      checked={consentGiven}
      onChange={(e) => setConsentGiven(e.target.checked)}
    />
    <label htmlFor="consent">
      I consent to share my device data with {coach.name}
    </label>
  </ConsentCheckbox>
  
  <PrivacyNote>
    You can revoke access at any time from your dashboard settings. 
    Historical data will remain visible unless you specifically request removal.
  </PrivacyNote>
  
  <Actions>
    <CancelButton onClick={handleCancel}>Cancel</CancelButton>
    <AcceptButton 
      onClick={handleAccept} 
      disabled={!consentGiven}
    >
      Accept & Share Devices
    </AcceptButton>
  </Actions>
</ConsentScreen>
```

---

## Email Templates

### Invitation Email (to Athlete)
```
Subject: You've been invited to Athlytx Elite by {CoachName}

Hi there,

{CoachName} from {BusinessName} has invited you to join Athlytx Elite.

{OptionalMessage}

Accept this invitation to share your training data and get personalised 
coaching insights:

[Accept Invitation Button] → {inviteAcceptUrl}

This invitation expires in 24 hours.

---
Athlytx Elite - Smarter Training Together
```

### Confirmation Email (to Athlete after accepting)
```
Subject: You're now connected with {CoachName} on Athlytx Elite

Hi {AthleteName},

You've successfully connected with {CoachName} from {BusinessName}.

Shared devices:
- {DeviceList}

You can manage your coach access anytime from your dashboard.

[Go to Dashboard] → {athleteDashboardUrl}

---
Athlytx Elite
```

### Confirmation Email (to Coach after athlete accepts)
```
Subject: {AthleteName} accepted your invitation

Hi {CoachName},

Great news! {AthleteName} has accepted your invitation and is now part 
of your roster.

Connected devices:
- {DeviceList}

You can now view their training data and provide insights.

[View Athlete Dashboard] → {coachDashboardUrl}

---
Athlytx Elite
```

### Revocation Email (to Coach when athlete revokes access)
```
Subject: {AthleteName} has updated their data sharing preferences

Hi {CoachName},

{AthleteName} has revoked access to the following devices:
- {RevokedDeviceList}

{RemainingDeviceList OR "You no longer have access to this athlete's data."}

---
Athlytx Elite
```

---

## Design System: Glassmorphism

### Core Principles
- Frosted glass effect with backdrop blur
- Subtle transparency (alpha 0.1-0.2)
- Gradient borders
- Soft shadows
- Smooth animations

### CSS Variables
```css
:root {
  --glass-bg: rgba(255, 255, 255, 0.1);
  --glass-border: rgba(255, 255, 255, 0.2);
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --gradient-secondary: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  --gradient-success: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}
```

### Glass Card Component
```css
.glass-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  padding: 30px;
  transition: all 0.3s ease;
}

.glass-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}
```

### Apply to All Elite Pages
- `/access` page cards
- Coach dashboard components
- Athlete dashboard components
- Consent screen
- Modals and overlays

---

## Implementation Phases

### Phase 1: Database & Authentication (Week 1)
**Priority: Critical**

**Tasks:**
1. Create database migrations
   - [ ] Create `coach_athlete` table
   - [ ] Create `invite` table
   - [ ] Create `magic_link` table
   - [ ] Create `device_shares` table
   - [ ] Add columns to `device_connections` (provider_user_id, share_with_coaches, scopes)
   - [ ] Add indexes for performance

2. Implement magic link authentication
   - [ ] POST /api/auth/request-magic-link
   - [ ] GET /api/auth/verify
   - [ ] JWT generation and validation middleware
   - [ ] Session management (httpOnly cookies)
   - [ ] POST /api/auth/logout

3. Email service integration
   - [ ] Configure email provider (SendGrid/AWS SES)
   - [ ] Email template system
   - [ ] Magic link email template
   - [ ] Test email delivery

4. Build /access page
   - [ ] Glassmorphism design
   - [ ] Coach/Athlete selection cards
   - [ ] Route to respective login pages

**Deliverables:**
- Working magic link authentication
- Session management
- Email service operational
- /access page deployed

---

### Phase 2: Invitation System (Week 2)
**Priority: Critical**

**Tasks:**
1. Coach invitation endpoints
   - [ ] POST /api/coach/invite
   - [ ] GET /api/coach/invites
   - [ ] POST /api/coach/invite/:id/revoke
   - [ ] Invitation email template

2. Invitation acceptance flow
   - [ ] GET /api/invite/accept?token={token}
   - [ ] Existing user detection logic
   - [ ] Device connection detection
   - [ ] CoachAthlete relationship creation

3. Frontend invitation UI
   - [ ] Coach: Invite athlete modal
   - [ ] Coach: Pending invitations list
   - [ ] Coach: Revoke invitation button
   - [ ] Invitation acceptance page routing

**Deliverables:**
- Coaches can send invitations
- Invitation emails sent successfully
- Basic acceptance flow working

---

### Phase 3: Device Connection & Consent (Week 2-3)
**Priority: Critical**

**Tasks:**
1. Device connection detection
   - [ ] User lookup by email
   - [ ] Device fetching logic
   - [ ] provider_user_id matching

2. Consent system
   - [ ] POST /api/athlete/consent-share
   - [ ] device_shares audit table population
   - [ ] Confirmation emails (athlete & coach)

3. Consent screen UI
   - [ ] Build consent screen component
   - [ ] Device list with descriptions
   - [ ] Consent checkbox
   - [ ] Accept/Cancel actions
   - [ ] Glassmorphism styling

4. Revocation system
   - [ ] POST /api/athlete/revoke-access
   - [ ] device_shares.revoked_at update
   - [ ] coach_athlete status update logic
   - [ ] Revocation email to coach

**Deliverables:**
- Existing device connections detected
- Consent screen functional
- Audit trail created
- Revocation working

---

### Phase 4: Onboarding Flows (Week 3)
**Priority: High**

**Tasks:**
1. Coach onboarding
   - [ ] Onboarding form (name, businessName)
   - [ ] State persistence
   - [ ] Redirect to dashboard after completion

2. Athlete onboarding (new users)
   - [ ] Onboarding form (name, sport, terms)
   - [ ] Device connection requirement (min 1)
   - [ ] Integration with existing OAuth flows
   - [ ] State persistence
   - [ ] Redirect to dashboard after completion

3. Onboarding UI
   - [ ] Multi-step form component
   - [ ] Progress indicator
   - [ ] Glassmorphism styling
   - [ ] Mobile responsive

**Deliverables:**
- Coach onboarding complete
- Athlete onboarding complete
- Device connection integration working

---

### Phase 5: Coach Dashboard (Week 3-4)
**Priority: High**

**Tasks:**
1. Backend data endpoints
   - [ ] GET /api/coach/athletes
   - [ ] GET /api/coach/athlete/:athleteId/data
   - [ ] Data aggregation logic
   - [ ] Permission checks (active relationship required)

2. Coach dashboard UI
   - [ ] Athlete roster grid
   - [ ] Athlete cards with quick metrics
   - [ ] 14-day trend sparklines
   - [ ] Recent activities list
   - [ ] "View Details" deep-dive page

3. Invite management UI
   - [ ] Invite athlete button
   - [ ] Pending invitations section
   - [ ] Revoke invitation functionality

4. Profile settings
   - [ ] Edit name
   - [ ] Edit business name
   - [ ] Account management

**Deliverables:**
- Coach can view all athletes
- Quick metrics displayed
- Deep-dive athlete view working
- Profile settings functional

---

### Phase 6: Athlete Dashboard (Week 4-5)
**Priority: High**

**Tasks:**
1. Backend data endpoints
   - [ ] GET /api/athlete/coaches
   - [ ] GET /api/athlete/dashboard
   - [ ] GET /api/athlete/device-status

2. Athlete dashboard UI
   - [ ] Connected coaches list
   - [ ] Device status cards
   - [ ] Personal metrics visualisations
   - [ ] Recent activities
   - [ ] Manage coach access UI

3. Device management
   - [ ] Per-device sharing toggles
   - [ ] Revoke coach access per device
   - [ ] Revoke coach access globally
   - [ ] Device sync status

4. Profile settings
   - [ ] Edit name
   - [ ] Edit sport
   - [ ] Account management

**Deliverables:**
- Athlete can view personal data
- Coach management working
- Device sharing controls functional
- Profile settings functional

---

### Phase 7: Glassmorphism Polish (Week 5-6)
**Priority: Medium**

**Tasks:**
1. Extract homepage glass components
   - [ ] Audit existing glassmorphism styles
   - [ ] Create reusable component library
   - [ ] Document design tokens

2. Apply to all Elite pages
   - [ ] /access page
   - [ ] Coach login/dashboard
   - [ ] Athlete login/dashboard
   - [ ] Consent screen
   - [ ] Modals and overlays

3. Animations and transitions
   - [ ] Hover effects
   - [ ] Page transitions
   - [ ] Loading states
   - [ ] Micro-interactions

4. Mobile responsiveness
   - [ ] Test all screens on mobile
   - [ ] Adjust layouts for small screens
   - [ ] Touch-friendly controls

**Deliverables:**
- Consistent glassmorphism across all Elite pages
- Smooth animations
- Mobile-optimized UI

---

### Phase 8: Testing & Edge Cases (Week 6)
**Priority: High**

**Tasks:**
1. Security testing
   - [ ] JWT validation edge cases
   - [ ] Magic link expiry enforcement
   - [ ] Permission checks (coach can only see active athletes)
   - [ ] SQL injection prevention
   - [ ] XSS prevention

2. Edge case handling
   - [ ] Different email account linking
   - [ ] Duplicate provider connections
   - [ ] Expired invitation handling
   - [ ] Revoked invitation handling
   - [ ] Multiple coaches per athlete
   - [ ] Soft delete coach account

3. Error handling
   - [ ] Network failures
   - [ ] Email delivery failures
   - [ ] Invalid tokens
   - [ ] Missing data
   - [ ] User-friendly error messages

4. GDPR compliance
   - [ ] Data export endpoint
   - [ ] Data deletion endpoint
   - [ ] Consent audit trail verification
   - [ ] Privacy policy updates

**Deliverables:**
- All edge cases handled
- Security vulnerabilities closed
- GDPR compliant
- Comprehensive error handling

---

## Testing Strategy

### Unit Tests
- Authentication logic
- Invitation creation/validation
- Device detection logic
- Consent recording
- Permission checks

### Integration Tests
- Complete invitation flow (coach sends → athlete accepts)
- Magic link flow (request → verify → session)
- Device sharing flow (consent → share → revoke)
- Multi-coach scenario

### E2E Tests
- Coach creates account → invites athlete → views data
- Athlete accepts invite → connects devices → grants consent
- Athlete revokes access → coach loses visibility

---

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/athlytx

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=your-refresh-secret-here
REFRESH_TOKEN_EXPIRES_IN=30d

# Email
EMAIL_PROVIDER=sendgrid # or aws-ses
EMAIL_API_KEY=your-api-key
EMAIL_FROM=noreply@athlytx.com
EMAIL_FROM_NAME=Athlytx Elite

# Frontend URL
FRONTEND_URL=https://athlytx.com

# OAuth (existing)
STRAVA_CLIENT_ID=your-strava-client-id
STRAVA_CLIENT_SECRET=your-strava-client-secret
GARMIN_CLIENT_ID=your-garmin-client-id
GARMIN_CLIENT_SECRET=your-garmin-client-secret
OURA_CLIENT_ID=your-oura-client-id
OURA_CLIENT_SECRET=your-oura-client-secret
WHOOP_CLIENT_ID=your-whoop-client-id
WHOOP_CLIENT_SECRET=your-whoop-client-secret

# Encryption
OAUTH_TOKEN_ENCRYPTION_KEY=your-aes-256-key

# Environment
NODE_ENV=production
PORT=3000
```

---

## Security Considerations

### Critical Security Requirements

1. **Authentication**
   - Magic links expire in 15 minutes
   - Single-use tokens (mark used_at)
   - JWT tokens in httpOnly, Secure, SameSite cookies
   - 7-day session expiry (MVP), refresh tokens in production

2. **Authorization**
   - Coach can only view athletes with active relationship
   - Athlete can only revoke own access
   - Permission middleware on all protected routes

3. **Data Protection**
   - OAuth tokens encrypted with AES-256
   - Database credentials not in code
   - Environment variables for all secrets
   - SQL injection prevention (parameterized queries)
   - XSS prevention (sanitize inputs)

4. **Privacy**
   - Explicit consent required for data sharing
   - Comprehensive audit trail (device_shares table)
   - GDPR data export/deletion
   - Clear privacy language in consent screen

5. **Rate Limiting**
   - Magic link requests: 5 per hour per email
   - Invitation sends: 20 per hour per coach
   - API endpoints: 100 requests per minute per user

---

## Success Metrics

### MVP Success Criteria
- [ ] Coach can register and log in
- [ ] Coach can send athlete invitation
- [ ] Athlete receives invitation email
- [ ] Athlete with existing devices sees consent screen
- [ ] Athlete without devices goes through onboarding
- [ ] Device connections are detected and reused
- [ ] Consent is recorded in audit table
- [ ] Coach can view athlete data after consent
- [ ] Athlete can revoke coach access
- [ ] Coach loses access after revocation
- [ ] All emails deliver successfully
- [ ] Glassmorphism design consistent across Elite

---

## Open Questions / Decisions Needed

1. **Email Provider:** SendGrid vs AWS SES?
2. **Session Duration:** Stick with 7-day for MVP or implement refresh tokens immediately?
3. **Per-Provider Sharing:** MVP includes it or add in v2?
4. **Historical Data Deletion:** When athlete revokes, offer to delete historical data or keep for audit?
5. **Invitation Expiry Extension:** Allow coaches to extend from 24h to 72h in UI or set globally?

---

## File Structure

```
/athlytx-elite
├── /backend
│   ├── /config
│   │   ├── database.js
│   │   ├── email.js
│   │   └── jwt.js
│   ├── /migrations
│   │   ├── 001_create_coach_athlete.sql
│   │   ├── 002_create_invite.sql
│   │   ├── 003_create_magic_link.sql
│   │   ├── 004_create_device_shares.sql
│   │   └── 005_alter_device_connections.sql
│   ├── /models
│   │   ├── User.js
│   │   ├── CoachAthlete.js
│   │   ├── Invite.js
│   │   ├── MagicLink.js
│   │   ├── DeviceConnection.js
│   │   └── DeviceShare.js
│   ├── /routes
│   │   ├── auth.js
│   │   ├── coach.js
│   │   ├── athlete.js
│   │   └── invite.js
│   ├── /controllers
│   │   ├── authController.js
│   │   ├── coachController.js
│   │   ├── athleteController.js
│   │   └── inviteController.js
│   ├── /middleware
│   │   ├── auth.js
│   │   ├── roleCheck.js
│   │   └── rateLimit.js
│   ├── /services
│   │   ├── emailService.js
│   │   ├── tokenService.js
│   │   ├── inviteService.js
│   │   └── deviceService.js
│   ├── /utils
│   │   ├── crypto.js
│   │   └── validation.js
│   └── server.js
├── /frontend
│   ├── /src
│   │   ├── /components
│   │   │   ├── /glass
│   │   │   │   ├── GlassCard.jsx
│   │   │   │   ├── GlassModal.jsx
│   │   │   │   └── GlassButton.jsx
│   │   │   ├── /coach
│   │   │   │   ├── CoachDashboard.jsx
│   │   │   │   ├── AthleteCard.jsx
│   │   │   │   ├── InviteModal.jsx
│   │   │   │   └── AthleteDetailView.jsx
│   │   │   ├── /athlete
│   │   │   │   ├── AthleteDashboard.jsx
│   │   │   │   ├── CoachCard.jsx
│   │   │   │   ├── DeviceCard.jsx
│   │   │   │   └── ConsentScreen.jsx
│   │   │   └── /shared
│   │   │       ├── Navbar.jsx
│   │   │       ├── ProfileMenu.jsx
│   │   │       └── LoadingSpinner.jsx
│   │   ├── /pages
│   │   │   ├── AccessPage.jsx
│   │   │   ├── CoachLogin.jsx
│   │   │   ├── AthleteLogin.jsx
│   │   │   ├── CoachOnboarding.jsx
│   │   │   ├── AthleteOnboarding.jsx
│   │   │   └── InviteAccept.jsx
│   │   ├── /hooks
│   │   │   ├── useAuth.js
│   │   │   ├── useDevices.js
│   │   │   └── useCoaches.js
│   │   ├── /services
│   │   │   ├── api.js
│   │   │   ├── auth.js
│   │   │   └── invite.js
│   │   ├── /styles
│   │   │   ├── glassmorphism.css
│   │   │   └── global.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
└── README.md
```

---

## Next Steps

1. **Confirm technical decisions** (email provider, session management approach)
2. **Set up development environment** (database, local dev server)
3. **Begin Phase 1** (database migrations + authentication)
4. **Iterate through phases** sequentially
5. **Test thoroughly** after each phase
6. **Deploy to Railway** once MVP complete

---

## Support & Resources

- **Existing Athlytx Codebase:** Reference for OAuth flows, device connections, data models
- **Glassmorphism Homepage:** Extract components and design tokens
- **API Documentation:** Document all endpoints in Postman/Swagger
- **Email Templates:** Create in email provider dashboard
- **Testing Suite:** Jest (backend), React Testing Library (frontend), Playwright (E2E)

---

**Ready to build in Claude Code. This brief contains everything needed for implementation.**