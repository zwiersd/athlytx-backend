# Darren's Heart Rate Zones Configuration

## Heart Rate Zones (BPM)

```
Zone 1 - Recovery:     Rest - 121 bpm
Zone 2 - Endurance:    122 - 151 bpm
Zone 3 - Tempo:        152 - 166 bpm
Zone 4 - Threshold:    167 - 180 bpm
Zone 5 - Anaerobic:    181 - Max bpm
```

## Zone Configuration (for database/code)

```javascript
const HR_ZONES = {
  zone1: { min: 0,   max: 121, name: 'Recovery',  color: '#A8E6CF' },
  zone2: { min: 122, max: 151, name: 'Endurance', color: '#FFD93D' },
  zone3: { min: 152, max: 166, name: 'Tempo',     color: '#FFA07A' },
  zone4: { min: 167, max: 180, name: 'Threshold', color: '#FF6B6B' },
  zone5: { min: 181, max: 220, name: 'Anaerobic', color: '#8B0000' }
};
```

## Training Focus by Zone

- **Zone 1 (Recovery)**: Active recovery, easy movement
- **Zone 2 (Endurance)**: Base building, long slow distance
- **Zone 3 (Tempo)**: Aerobic capacity, tempo runs
- **Zone 4 (Threshold)**: Lactate threshold training
- **Zone 5 (Anaerobic)**: High intensity intervals, sprints

## Ideal Weekly Distribution (Example)

- Zone 1: 10-15%
- Zone 2: 60-70% (majority of training)
- Zone 3: 10-15%
- Zone 4: 5-10%
- Zone 5: <5%
