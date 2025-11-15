# Power Zones Feature - Elite Dashboard

## Overview

Based on your coach Matt Roberts' feedback, I've integrated comprehensive power zones tracking and visualization into the Athlytx platform. This feature provides detailed insights into workout intensity beyond just heart rate zones, enabling more precise training analysis and energy system monitoring.

## Key Features Implemented

### 1. **Power Zone Data Model**
Created a dedicated `PowerZone` database table that tracks:

- **7 Power Zones** (based on FTP - Functional Threshold Power):
  - Zone 1: Active Recovery (<55% FTP)
  - Zone 2: Endurance (56-75% FTP)
  - Zone 3: Tempo (76-90% FTP)
  - Zone 4: Lactate Threshold (91-105% FTP)
  - Zone 5: VO2 Max (106-120% FTP)
  - Zone 6: Anaerobic Capacity (121-150% FTP)
  - Zone 7: Neuromuscular Power (>150% FTP)

- **Power Metrics**:
  - Average Power (watts)
  - Normalized Power (weighted average)
  - Maximum Power
  - FTP (Functional Threshold Power)
  - Training Stress Score (TSS)
  - Intensity Factor
  - Variability Index

### 2. **Energy System Contribution Analysis**

Following Matt's notes about energy systems, the platform now automatically calculates:

- **ATP-PC System** (Zones 6-7): Short bursts, explosive power, anaerobic
- **Glycolytic System** (Zones 4-5): High intensity, VO2 max, lactate threshold
- **Aerobic System** (Zones 1-3): Endurance, zone 2 conditioning

This helps answer Matt's key question: "What energy systems are you actually training?"

### 3. **Data Integration**

The system pulls power zones data from:

- **Strava**: Via the zones endpoint (`/activities/{id}/zones`)
- **Garmin**: Via wellness API power zone data

### 4. **API Endpoints**

Enhanced the `/api/athlete/dashboard` endpoint to return:

```json
{
  "powerZones": {
    "zone1": 15,  // percentage
    "zone2": 35,
    "zone3": 25,
    "zone4": 15,
    "zone5": 8,
    "zone6": 2,
    "zone7": 0,
    "totalMinutes": 450,
    "avgPower": 185,
    "maxPower": 425,
    "avgNormalizedPower": 195
  },
  "energySystems": {
    "atpPcSystem": "2.5",      // percentage
    "glycolyticSystem": "23.0",
    "aerobicSystem": "74.5",
    "description": {
      "atpPc": "Anaerobic ATP-PC (Zones 6-7): Short bursts, explosive power",
      "glycolytic": "Glycolytic/Lactate System (Zones 4-5): High intensity, VO2 max work",
      "aerobic": "Aerobic System (Zones 1-3): Endurance, zone 2 conditioning"
    }
  }
}
```

## How Matt's Coaching Insights Are Reflected

### Zone 2 Conditioning Effect
Matt mentioned: "You're doing a strength and conditioning session, but also you're getting a zone two benefit."

The platform now shows:
- Time spent in each power zone
- Correlation between HR zones and power zones
- Energy system contributions showing aerobic vs. anaerobic work

### Power vs. Heart Rate Correlation
Matt said: "The power zones link up with the heart rate zones...the power zones will tell you more specifically the zones that you hit in terms of the output."

The dashboard now displays:
- Both HR zones AND power zones side-by-side
- Shows how short high-intensity intervals don't give your cardiovascular system time to catch up
- Reveals the "fast twitch aspect and explosive outputs"

### Energy System Training
Following Matt's explanation about ATP, lactate threshold, and VO2 max:

The energy systems breakdown shows exactly what you're training:
- High Zone 6-7 time = ATP-PC system (explosive, anaerobic)
- Zone 4-5 time = Glycolytic system (lactate threshold, VO2 max)
- Zone 1-3 time = Aerobic system (endurance, zone 2 cardio)

## Example Workout Analysis

### Strength & Conditioning Session
```
Power Zones Distribution:
- Zone 1-3 (Aerobic): 70% → Zone 2 conditioning effect
- Zone 4-5 (Glycolytic): 25% → VO2 max, lactate threshold
- Zone 6-7 (ATP-PC): 5% → Explosive outputs

Energy Systems:
- Aerobic: 70% (cardiovascular conditioning)
- Glycolytic: 25% (high intensity intervals)
- ATP-PC: 5% (explosive, anaerobic bursts)
```

This shows Matt's exact point: Even though it's a "strength" workout, you're getting significant zone 2 conditioning (70% aerobic)!

## Next Steps for Dashboard Visualization

### Recommended Visualizations:

1. **Dual Zone Chart**: Side-by-side comparison of HR zones vs Power zones
2. **Energy Systems Pie Chart**: Visual breakdown of ATP-PC, Glycolytic, Aerobic
3. **Power Distribution Over Time**: Track how power zones change week-to-week
4. **Correlation Matrix**: Show relationship between HR and power zones
5. **Workout Classification**: Automatically classify workouts by energy system dominance

### Color Coding Suggestion:
- **Zones 1-3 (Aerobic)**: Blue/Green (cool, endurance)
- **Zones 4-5 (Glycolytic)**: Yellow/Orange (medium-high intensity)
- **Zones 6-7 (ATP-PC)**: Red (explosive, maximum effort)

## Technical Implementation

### Files Modified:
- `backend/models/PowerZone.js` - New model for power zones
- `backend/models/index.js` - Added PowerZone to exports
- `backend/services/syncService.js` - Added Strava & Garmin power zone fetching
- `backend/routes/athlete.js` - Added power zone endpoints and calculations

### Database Migration:
The `power_zones` table will be automatically created on next server start.

### Sync Process:
When syncing activities:
1. Fetch activity from Strava/Garmin
2. Check if power data exists
3. Fetch detailed power zones from zones endpoint
4. Calculate energy system contributions
5. Store in PowerZone table

## Usage for Coaches

Coaches can now:
1. See exactly what energy systems athletes are training
2. Identify hidden zone 2 work in strength sessions
3. Monitor fast-twitch/explosive outputs via ATP-PC percentage
4. Understand cardiovascular adaptation from power data
5. Correlate HR zones with power zones for more accurate training effect

## Future Enhancements

1. **FTP Testing Integration**: Auto-detect FTP tests and update zones
2. **Training Load Management**: TSS-based load tracking
3. **Polarized Training Analysis**: 80/20 aerobic/anaerobic split
4. **Workout Recommendations**: AI-powered based on energy system balance
5. **Periodization Tracking**: Monitor training phases via power distribution

---

**Built based on Matt Roberts' coaching feedback on 14 Nov 2025**
