# Coach Dashboard Implementation Plan

## Overview
Build a coach dashboard where your coach can view your training data, specifically heart rate zone analysis from Garmin and Oura.

---

## Data We Can Capture

### From Garmin Health API:
- **Activities**: Each workout with detailed HR zone breakdown
  - Time in Zone 1, Zone 2, Zone 3, Zone 4, Zone 5
  - Average HR, Max HR, Resting HR
  - Activity type, duration, distance
  - Calories, training effect
  - Intensity minutes

- **Dailies**: Daily summaries
  - Resting HR
  - Max HR for the day
  - Total intensity minutes
  - Steps, active calories

### From Oura API:
- **Daily Activity**:
  - Average HR throughout day
  - Activity periods with intensity levels
  - Steps, calories

- **Sleep**:
  - HR during sleep
  - HRV (heart rate variability)
  - Sleep stages with HR data

---

## Heart Rate Zones

Standard HR zones based on % of max HR:

```
Zone 1 (50-60%):   Easy/Recovery
Zone 2 (60-70%):   Aerobic/Base
Zone 3 (70-80%):   Tempo
Zone 4 (80-90%):   Threshold
Zone 5 (90-100%):  Max Effort
```

You'll provide your specific BPM ranges.

---

## Architecture

### 1. Data Sync Service (New)

**Daily Background Job** (runs at 3 AM):
```javascript
async function dailySync(userId) {
  // 1. Fetch yesterday's Garmin activities
  const activities = await fetchGarminActivities(userId, yesterday);

  // 2. Parse HR zone data from each activity
  for (const activity of activities) {
    const zones = parseHeartRateZones(activity);
    await storeActivityZones(userId, activity, zones);
  }

  // 3. Fetch Oura daily data
  const ouraData = await fetchOuraDaily(userId, yesterday);
  await storeDailyMetrics(userId, ouraData);

  // 4. Calculate weekly/monthly summaries
  await calculateTrainingSummary(userId);
}
```

### 2. Database Schema (Extended)

**New Table: `heart_rate_zones`**
```sql
CREATE TABLE heart_rate_zones (
  id UUID PRIMARY KEY,
  activity_id UUID REFERENCES activities(id),
  user_id UUID REFERENCES users(id),
  date DATE NOT NULL,

  -- Time in each zone (seconds)
  zone1_seconds INTEGER,
  zone2_seconds INTEGER,
  zone3_seconds INTEGER,
  zone4_seconds INTEGER,
  zone5_seconds INTEGER,

  -- HR metrics
  avg_hr INTEGER,
  max_hr INTEGER,
  resting_hr INTEGER,

  -- Activity context
  activity_type VARCHAR(100),
  duration_seconds INTEGER,

  created_at TIMESTAMP DEFAULT NOW()
);
```

**Update existing `activities` table:**
```sql
ALTER TABLE activities ADD COLUMN heart_rate_zones JSONB;
-- Store detailed zone data: { zone1: 600, zone2: 1200, ... }
```

**New Table: `training_summaries`**
```sql
CREATE TABLE training_summaries (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  period_type VARCHAR(20), -- 'weekly', 'monthly'
  period_start DATE,
  period_end DATE,

  -- Total time in zones across all activities
  total_zone1_minutes INTEGER,
  total_zone2_minutes INTEGER,
  total_zone3_minutes INTEGER,
  total_zone4_minutes INTEGER,
  total_zone5_minutes INTEGER,

  -- Summary metrics
  total_training_minutes INTEGER,
  avg_resting_hr INTEGER,
  total_activities INTEGER,

  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Coach Dashboard Pages

**New Routes:**
- `/coach` - Coach login page
- `/coach/dashboard` - Coach's main dashboard
- `/coach/athlete/:id` - View specific athlete's data

**Dashboard Components:**

#### A. HR Zone Distribution (Pie Chart)
```
Zone 1 (Easy):      15% (3.5 hours)
Zone 2 (Aerobic):   45% (10.2 hours)
Zone 3 (Tempo):     25% (5.8 hours)
Zone 4 (Threshold): 12% (2.7 hours)
Zone 5 (Max):        3% (0.8 hours)
```

#### B. Weekly Zone Trends (Line Chart)
```
Time in zones over last 4 weeks
X-axis: Weeks
Y-axis: Hours
Lines for each zone
```

#### C. Activity Log (Table)
```
Date     | Type    | Duration | Avg HR | Zones Split
---------|---------|----------|--------|-------------
Nov 10   | Run     | 45 min   | 152    | Z2: 60%, Z3: 30%, Z4: 10%
Nov 9    | Bike    | 90 min   | 142    | Z2: 85%, Z3: 15%
```

#### D. Training Load (Chart)
```
Acute vs Chronic workload ratio
Weekly intensity minutes
Recovery status
```

---

## Implementation Phases

### Phase 1: Data Collection (Week 1)
- [ ] Create database migrations for new tables
- [ ] Build data sync service
- [ ] Create background job scheduler (node-cron)
- [ ] Implement Garmin activity fetching with HR zones
- [ ] Implement Oura data fetching
- [ ] Store data in database

### Phase 2: Coach Authentication (Week 1)
- [ ] Create magic link auth system
- [ ] Build coach invitation flow
- [ ] Create coach-athlete relationship
- [ ] Implement access control

### Phase 3: Coach Dashboard UI (Week 2)
- [ ] Build coach login page
- [ ] Create athlete selection interface
- [ ] Build HR zone visualization components
- [ ] Create activity log table
- [ ] Add weekly/monthly summary views

### Phase 4: Data Analysis (Week 2)
- [ ] Calculate training load metrics
- [ ] Generate zone distribution summaries
- [ ] Build trend analysis
- [ ] Add export functionality (PDF/CSV)

---

## API Endpoints Needed

### For Data Sync:
```
POST /api/sync/manual - Trigger manual sync
GET  /api/sync/status - Check sync status
POST /api/sync/schedule - Configure sync schedule
```

### For Coach:
```
POST /api/coach/login - Magic link login
GET  /api/coach/athletes - List connected athletes
GET  /api/coach/athlete/:id/zones - Get HR zone data
GET  /api/coach/athlete/:id/activities - Get activity log
GET  /api/coach/athlete/:id/summary - Get training summary
```

---

## Example: HR Zone Data from Garmin

```json
{
  "activityId": "12345",
  "date": "2025-11-10",
  "activityType": "RUNNING",
  "durationSeconds": 2700,
  "heartRateZones": {
    "zone1": { "seconds": 300, "percent": 11 },
    "zone2": { "seconds": 1200, "percent": 44 },
    "zone3": { "seconds": 900, "percent": 33 },
    "zone4": { "seconds": 270, "percent": 10 },
    "zone5": { "seconds": 30, "percent": 2 }
  },
  "averageHeartRate": 152,
  "maxHeartRate": 178,
  "calories": 425
}
```

---

## Coach Dashboard Mockup

```
┌─────────────────────────────────────────────────────────────┐
│ Coach Dashboard - Viewing: Darren Zwiers                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📊 Heart Rate Zone Distribution (Last 7 Days)              │
│  ┌───────────────────────────────────────────────┐          │
│  │        [Pie Chart]                            │          │
│  │   Zone 2 (Aerobic): 45%                       │          │
│  │   Zone 3 (Tempo): 25%                         │          │
│  │   Zone 1 (Easy): 15%                          │          │
│  └───────────────────────────────────────────────┘          │
│                                                               │
│  📈 Training Load Trend                                      │
│  ┌───────────────────────────────────────────────┐          │
│  │        [Line Chart]                           │          │
│  │   Acute: ████████░░ 85                        │          │
│  │   Chronic: ███████░░░ 72                      │          │
│  │   Ratio: 1.18 (Optimal)                       │          │
│  └───────────────────────────────────────────────┘          │
│                                                               │
│  🏃 Recent Activities                                        │
│  ┌───────────────────────────────────────────────┐          │
│  │ Date    Type   Dur   Avg HR  Zone Split       │          │
│  │ Nov 10  Run    45m   152     60% Z2, 30% Z3   │          │
│  │ Nov 9   Bike   90m   142     85% Z2, 15% Z3   │          │
│  │ Nov 8   Run    35m   158     50% Z3, 40% Z2   │          │
│  └───────────────────────────────────────────────┘          │
│                                                               │
│  💓 Key Metrics                                              │
│  Resting HR: 48 bpm    HRV: 65ms    Recovery: Good          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. **Define your HR zones** - Provide your specific BPM ranges for each zone
2. **Choose starting point**:
   - Option A: Build data sync first (so coach has data to view)
   - Option B: Build coach UI first (with mock data)
3. **Timeline**: ~2 weeks for full implementation

Ready to start building?
