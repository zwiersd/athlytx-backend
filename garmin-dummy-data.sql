-- SQL INSERT statements for dummy Garmin data

-- Activities table inserts:
INSERT INTO activities (id, "userId", provider, "externalId", "activityType", "activityName", "startTime", "durationSeconds", "distanceMeters", calories, "avgHr", "maxHr", "deviceModel", "createdAt", "updatedAt") VALUES (
  gen_random_uuid(),
  '3c37dd1f-25f8-4212-afcf-52a7d37f0903',
  'garmin',
  'demo-garmin-1763076055789-0',
  'Running',
  'Morning Run',
  '2025-11-13T10:00:00.000Z',
  2700,
  7200,
  420,
  152,
  178,
  'Garmin Epix Pro (Gen 2)',
  NOW(),
  NOW()
);

INSERT INTO activities (id, "userId", provider, "externalId", "activityType", "activityName", "startTime", "durationSeconds", "distanceMeters", calories, "avgHr", "maxHr", "deviceModel", "createdAt", "updatedAt") VALUES (
  gen_random_uuid(),
  '3c37dd1f-25f8-4212-afcf-52a7d37f0903',
  'garmin',
  'demo-garmin-1763076055790-1',
  'Cycling',
  'Afternoon Ride',
  '2025-11-13T10:00:00.000Z',
  3600,
  18000,
  540,
  138,
  165,
  'Garmin Epix Pro (Gen 2)',
  NOW(),
  NOW()
);

INSERT INTO activities (id, "userId", provider, "externalId", "activityType", "activityName", "startTime", "durationSeconds", "distanceMeters", calories, "avgHr", "maxHr", "deviceModel", "createdAt", "updatedAt") VALUES (
  gen_random_uuid(),
  '3c37dd1f-25f8-4212-afcf-52a7d37f0903',
  'garmin',
  'demo-garmin-1763076055790-2',
  'Running',
  'Interval Training',
  '2025-11-12T10:00:00.000Z',
  2100,
  5500,
  380,
  165,
  186,
  'Garmin Epix Pro (Gen 2)',
  NOW(),
  NOW()
);

INSERT INTO activities (id, "userId", provider, "externalId", "activityType", "activityName", "startTime", "durationSeconds", "distanceMeters", calories, "avgHr", "maxHr", "deviceModel", "createdAt", "updatedAt") VALUES (
  gen_random_uuid(),
  '3c37dd1f-25f8-4212-afcf-52a7d37f0903',
  'garmin',
  'demo-garmin-1763076055790-3',
  'Swimming',
  'Pool Swim',
  '2025-11-12T10:00:00.000Z',
  1800,
  1500,
  280,
  135,
  155,
  'Garmin Epix Pro (Gen 2)',
  NOW(),
  NOW()
);

INSERT INTO activities (id, "userId", provider, "externalId", "activityType", "activityName", "startTime", "durationSeconds", "distanceMeters", calories, "avgHr", "maxHr", "deviceModel", "createdAt", "updatedAt") VALUES (
  gen_random_uuid(),
  '3c37dd1f-25f8-4212-afcf-52a7d37f0903',
  'garmin',
  'demo-garmin-1763076055790-4',
  'Running',
  'Easy Recovery Run',
  '2025-11-11T10:00:00.000Z',
  1800,
  4200,
  240,
  128,
  142,
  'Garmin Epix Pro (Gen 2)',
  NOW(),
  NOW()
);

INSERT INTO activities (id, "userId", provider, "externalId", "activityType", "activityName", "startTime", "durationSeconds", "distanceMeters", calories, "avgHr", "maxHr", "deviceModel", "createdAt", "updatedAt") VALUES (
  gen_random_uuid(),
  '3c37dd1f-25f8-4212-afcf-52a7d37f0903',
  'garmin',
  'demo-garmin-1763076055790-5',
  'Strength Training',
  'Upper Body Workout',
  '2025-11-10T10:00:00.000Z',
  3000,
  0,
  320,
  115,
  145,
  'Garmin Epix Pro (Gen 2)',
  NOW(),
  NOW()
);

INSERT INTO activities (id, "userId", provider, "externalId", "activityType", "activityName", "startTime", "durationSeconds", "distanceMeters", calories, "avgHr", "maxHr", "deviceModel", "createdAt", "updatedAt") VALUES (
  gen_random_uuid(),
  '3c37dd1f-25f8-4212-afcf-52a7d37f0903',
  'garmin',
  'demo-garmin-1763076055790-6',
  'Cycling',
  'Hill Repeats',
  '2025-11-10T10:00:00.000Z',
  4500,
  25000,
  680,
  148,
  172,
  'Garmin Epix Pro (Gen 2)',
  NOW(),
  NOW()
);

INSERT INTO activities (id, "userId", provider, "externalId", "activityType", "activityName", "startTime", "durationSeconds", "distanceMeters", calories, "avgHr", "maxHr", "deviceModel", "createdAt", "updatedAt") VALUES (
  gen_random_uuid(),
  '3c37dd1f-25f8-4212-afcf-52a7d37f0903',
  'garmin',
  'demo-garmin-1763076055791-7',
  'Running',
  'Long Run',
  '2025-11-09T10:00:00.000Z',
  5400,
  15000,
  820,
  142,
  168,
  'Garmin Epix Pro (Gen 2)',
  NOW(),
  NOW()
);

INSERT INTO activities (id, "userId", provider, "externalId", "activityType", "activityName", "startTime", "durationSeconds", "distanceMeters", calories, "avgHr", "maxHr", "deviceModel", "createdAt", "updatedAt") VALUES (
  gen_random_uuid(),
  '3c37dd1f-25f8-4212-afcf-52a7d37f0903',
  'garmin',
  'demo-garmin-1763076055791-8',
  'Yoga',
  'Yoga Flow',
  '2025-11-08T10:00:00.000Z',
  2700,
  0,
  150,
  95,
  118,
  'Garmin Epix Pro (Gen 2)',
  NOW(),
  NOW()
);

INSERT INTO activities (id, "userId", provider, "externalId", "activityType", "activityName", "startTime", "durationSeconds", "distanceMeters", calories, "avgHr", "maxHr", "deviceModel", "createdAt", "updatedAt") VALUES (
  gen_random_uuid(),
  '3c37dd1f-25f8-4212-afcf-52a7d37f0903',
  'garmin',
  'demo-garmin-1763076055791-9',
  'Running',
  'Tempo Run',
  '2025-11-08T10:00:00.000Z',
  2400,
  6800,
  420,
  158,
  175,
  'Garmin Epix Pro (Gen 2)',
  NOW(),
  NOW()
);

INSERT INTO activities (id, "userId", provider, "externalId", "activityType", "activityName", "startTime", "durationSeconds", "distanceMeters", calories, "avgHr", "maxHr", "deviceModel", "createdAt", "updatedAt") VALUES (
  gen_random_uuid(),
  '3c37dd1f-25f8-4212-afcf-52a7d37f0903',
  'garmin',
  'demo-garmin-1763076055791-10',
  'Cycling',
  'Recovery Ride',
  '2025-11-07T10:00:00.000Z',
  2700,
  12000,
  320,
  125,
  142,
  'Garmin Epix Pro (Gen 2)',
  NOW(),
  NOW()
);

INSERT INTO activities (id, "userId", provider, "externalId", "activityType", "activityName", "startTime", "durationSeconds", "distanceMeters", calories, "avgHr", "maxHr", "deviceModel", "createdAt", "updatedAt") VALUES (
  gen_random_uuid(),
  '3c37dd1f-25f8-4212-afcf-52a7d37f0903',
  'garmin',
  'demo-garmin-1763076055791-11',
  'Hiking',
  'Mountain Hike',
  '2025-11-07T10:00:00.000Z',
  7200,
  8500,
  580,
  118,
  155,
  'Garmin Epix Pro (Gen 2)',
  NOW(),
  NOW()
);

INSERT INTO activities (id, "userId", provider, "externalId", "activityType", "activityName", "startTime", "durationSeconds", "distanceMeters", calories, "avgHr", "maxHr", "deviceModel", "createdAt", "updatedAt") VALUES (
  gen_random_uuid(),
  '3c37dd1f-25f8-4212-afcf-52a7d37f0903',
  'garmin',
  'demo-garmin-1763076055791-12',
  'Running',
  'Track Workout',
  '2025-11-06T10:00:00.000Z',
  3000,
  8000,
  485,
  162,
  182,
  'Garmin Epix Pro (Gen 2)',
  NOW(),
  NOW()
);

INSERT INTO activities (id, "userId", provider, "externalId", "activityType", "activityName", "startTime", "durationSeconds", "distanceMeters", calories, "avgHr", "maxHr", "deviceModel", "createdAt", "updatedAt") VALUES (
  gen_random_uuid(),
  '3c37dd1f-25f8-4212-afcf-52a7d37f0903',
  'garmin',
  'demo-garmin-1763076055791-13',
  'Trail Running',
  'Trail Run',
  '2025-11-05T10:00:00.000Z',
  3900,
  9200,
  595,
  145,
  172,
  'Garmin Epix Pro (Gen 2)',
  NOW(),
  NOW()
);

INSERT INTO activities (id, "userId", provider, "externalId", "activityType", "activityName", "startTime", "durationSeconds", "distanceMeters", calories, "avgHr", "maxHr", "deviceModel", "createdAt", "updatedAt") VALUES (
  gen_random_uuid(),
  '3c37dd1f-25f8-4212-afcf-52a7d37f0903',
  'garmin',
  'demo-garmin-1763076055791-14',
  'Cycling',
  'Endurance Ride',
  '2025-11-04T10:00:00.000Z',
  5400,
  32000,
  780,
  135,
  158,
  'Garmin Epix Pro (Gen 2)',
  NOW(),
  NOW()
);



-- Heart Rate Zones table inserts:
-- For activity: Morning Run
-- Note: You'll need to get the actual activity ID from the database after inserting activities
INSERT INTO heart_rate_zones ("userId", "activityId", date, "activityType", "durationSeconds", provider, "zone1Seconds", "zone2Seconds", "zone3Seconds", "zone4Seconds", "zone5Seconds", "avgHr", "maxHr", "createdAt", "updatedAt") VALUES (
  '3c37dd1f-25f8-4212-afcf-52a7d37f0903',
  (SELECT id FROM activities WHERE "externalId" = 'demo-garmin-1763076055791-0' LIMIT 1),
  '2025-11-13',
  'Running',
  2700,
  'garmin',
  300,
  900,
  1200,
  300,
  0,
  152,
  178,
  NOW(),
  NOW()
);

-- For activity: Afternoon Ride
-- Note: You'll need to get the actual activity ID from the database after inserting activities
INSERT INTO heart_rate_zones ("userId", "activityId", date, "activityType", "durationSeconds", provider, "zone1Seconds", "zone2Seconds", "zone3Seconds", "zone4Seconds", "zone5Seconds", "avgHr", "maxHr", "createdAt", "updatedAt") VALUES (
  '3c37dd1f-25f8-4212-afcf-52a7d37f0903',
  (SELECT id FROM activities WHERE "externalId" = 'demo-garmin-1763076055791-1' LIMIT 1),
  '2025-11-13',
  'Cycling',
  3600,
  'garmin',
  600,
  2400,
  600,
  0,
  0,
  138,
  165,
  NOW(),
  NOW()
);

-- For activity: Interval Training
-- Note: You'll need to get the actual activity ID from the database after inserting activities
INSERT INTO heart_rate_zones ("userId", "activityId", date, "activityType", "durationSeconds", provider, "zone1Seconds", "zone2Seconds", "zone3Seconds", "zone4Seconds", "zone5Seconds", "avgHr", "maxHr", "createdAt", "updatedAt") VALUES (
  '3c37dd1f-25f8-4212-afcf-52a7d37f0903',
  (SELECT id FROM activities WHERE "externalId" = 'demo-garmin-1763076055791-2' LIMIT 1),
  '2025-11-12',
  'Running',
  2100,
  'garmin',
  180,
  480,
  720,
  600,
  120,
  165,
  186,
  NOW(),
  NOW()
);

-- For activity: Pool Swim
-- Note: You'll need to get the actual activity ID from the database after inserting activities
INSERT INTO heart_rate_zones ("userId", "activityId", date, "activityType", "durationSeconds", provider, "zone1Seconds", "zone2Seconds", "zone3Seconds", "zone4Seconds", "zone5Seconds", "avgHr", "maxHr", "createdAt", "updatedAt") VALUES (
  '3c37dd1f-25f8-4212-afcf-52a7d37f0903',
  (SELECT id FROM activities WHERE "externalId" = 'demo-garmin-1763076055791-3' LIMIT 1),
  '2025-11-12',
  'Swimming',
  1800,
  'garmin',
  300,
  1200,
  300,
  0,
  0,
  135,
  155,
  NOW(),
  NOW()
);

-- For activity: Easy Recovery Run
-- Note: You'll need to get the actual activity ID from the database after inserting activities
INSERT INTO heart_rate_zones ("userId", "activityId", date, "activityType", "durationSeconds", provider, "zone1Seconds", "zone2Seconds", "zone3Seconds", "zone4Seconds", "zone5Seconds", "avgHr", "maxHr", "createdAt", "updatedAt") VALUES (
  '3c37dd1f-25f8-4212-afcf-52a7d37f0903',
  (SELECT id FROM activities WHERE "externalId" = 'demo-garmin-1763076055791-4' LIMIT 1),
  '2025-11-11',
  'Running',
  1800,
  'garmin',
  600,
  1200,
  0,
  0,
  0,
  128,
  142,
  NOW(),
  NOW()
);

-- For activity: Upper Body Workout
-- Note: You'll need to get the actual activity ID from the database after inserting activities
INSERT INTO heart_rate_zones ("userId", "activityId", date, "activityType", "durationSeconds", provider, "zone1Seconds", "zone2Seconds", "zone3Seconds", "zone4Seconds", "zone5Seconds", "avgHr", "maxHr", "createdAt", "updatedAt") VALUES (
  '3c37dd1f-25f8-4212-afcf-52a7d37f0903',
  (SELECT id FROM activities WHERE "externalId" = 'demo-garmin-1763076055791-5' LIMIT 1),
  '2025-11-10',
  'Strength Training',
  3000,
  'garmin',
  2100,
  900,
  0,
  0,
  0,
  115,
  145,
  NOW(),
  NOW()
);

-- For activity: Hill Repeats
-- Note: You'll need to get the actual activity ID from the database after inserting activities
INSERT INTO heart_rate_zones ("userId", "activityId", date, "activityType", "durationSeconds", provider, "zone1Seconds", "zone2Seconds", "zone3Seconds", "zone4Seconds", "zone5Seconds", "avgHr", "maxHr", "createdAt", "updatedAt") VALUES (
  '3c37dd1f-25f8-4212-afcf-52a7d37f0903',
  (SELECT id FROM activities WHERE "externalId" = 'demo-garmin-1763076055792-6' LIMIT 1),
  '2025-11-10',
  'Cycling',
  4500,
  'garmin',
  600,
  2100,
  1500,
  300,
  0,
  148,
  172,
  NOW(),
  NOW()
);

-- For activity: Long Run
-- Note: You'll need to get the actual activity ID from the database after inserting activities
INSERT INTO heart_rate_zones ("userId", "activityId", date, "activityType", "durationSeconds", provider, "zone1Seconds", "zone2Seconds", "zone3Seconds", "zone4Seconds", "zone5Seconds", "avgHr", "maxHr", "createdAt", "updatedAt") VALUES (
  '3c37dd1f-25f8-4212-afcf-52a7d37f0903',
  (SELECT id FROM activities WHERE "externalId" = 'demo-garmin-1763076055792-7' LIMIT 1),
  '2025-11-09',
  'Running',
  5400,
  'garmin',
  900,
  3300,
  1200,
  0,
  0,
  142,
  168,
  NOW(),
  NOW()
);

-- For activity: Yoga Flow
-- Note: You'll need to get the actual activity ID from the database after inserting activities
INSERT INTO heart_rate_zones ("userId", "activityId", date, "activityType", "durationSeconds", provider, "zone1Seconds", "zone2Seconds", "zone3Seconds", "zone4Seconds", "zone5Seconds", "avgHr", "maxHr", "createdAt", "updatedAt") VALUES (
  '3c37dd1f-25f8-4212-afcf-52a7d37f0903',
  (SELECT id FROM activities WHERE "externalId" = 'demo-garmin-1763076055792-8' LIMIT 1),
  '2025-11-08',
  'Yoga',
  2700,
  'garmin',
  2700,
  0,
  0,
  0,
  0,
  95,
  118,
  NOW(),
  NOW()
);

-- For activity: Tempo Run
-- Note: You'll need to get the actual activity ID from the database after inserting activities
INSERT INTO heart_rate_zones ("userId", "activityId", date, "activityType", "durationSeconds", provider, "zone1Seconds", "zone2Seconds", "zone3Seconds", "zone4Seconds", "zone5Seconds", "avgHr", "maxHr", "createdAt", "updatedAt") VALUES (
  '3c37dd1f-25f8-4212-afcf-52a7d37f0903',
  (SELECT id FROM activities WHERE "externalId" = 'demo-garmin-1763076055792-9' LIMIT 1),
  '2025-11-08',
  'Running',
  2400,
  'garmin',
  300,
  600,
  1320,
  180,
  0,
  158,
  175,
  NOW(),
  NOW()
);

-- For activity: Recovery Ride
-- Note: You'll need to get the actual activity ID from the database after inserting activities
INSERT INTO heart_rate_zones ("userId", "activityId", date, "activityType", "durationSeconds", provider, "zone1Seconds", "zone2Seconds", "zone3Seconds", "zone4Seconds", "zone5Seconds", "avgHr", "maxHr", "createdAt", "updatedAt") VALUES (
  '3c37dd1f-25f8-4212-afcf-52a7d37f0903',
  (SELECT id FROM activities WHERE "externalId" = 'demo-garmin-1763076055792-10' LIMIT 1),
  '2025-11-07',
  'Cycling',
  2700,
  'garmin',
  900,
  1800,
  0,
  0,
  0,
  125,
  142,
  NOW(),
  NOW()
);

-- For activity: Mountain Hike
-- Note: You'll need to get the actual activity ID from the database after inserting activities
INSERT INTO heart_rate_zones ("userId", "activityId", date, "activityType", "durationSeconds", provider, "zone1Seconds", "zone2Seconds", "zone3Seconds", "zone4Seconds", "zone5Seconds", "avgHr", "maxHr", "createdAt", "updatedAt") VALUES (
  '3c37dd1f-25f8-4212-afcf-52a7d37f0903',
  (SELECT id FROM activities WHERE "externalId" = 'demo-garmin-1763076055792-11' LIMIT 1),
  '2025-11-07',
  'Hiking',
  7200,
  'garmin',
  4800,
  2100,
  300,
  0,
  0,
  118,
  155,
  NOW(),
  NOW()
);

-- For activity: Track Workout
-- Note: You'll need to get the actual activity ID from the database after inserting activities
INSERT INTO heart_rate_zones ("userId", "activityId", date, "activityType", "durationSeconds", provider, "zone1Seconds", "zone2Seconds", "zone3Seconds", "zone4Seconds", "zone5Seconds", "avgHr", "maxHr", "createdAt", "updatedAt") VALUES (
  '3c37dd1f-25f8-4212-afcf-52a7d37f0903',
  (SELECT id FROM activities WHERE "externalId" = 'demo-garmin-1763076055792-12' LIMIT 1),
  '2025-11-06',
  'Running',
  3000,
  'garmin',
  300,
  720,
  1080,
  720,
  180,
  162,
  182,
  NOW(),
  NOW()
);

-- For activity: Trail Run
-- Note: You'll need to get the actual activity ID from the database after inserting activities
INSERT INTO heart_rate_zones ("userId", "activityId", date, "activityType", "durationSeconds", provider, "zone1Seconds", "zone2Seconds", "zone3Seconds", "zone4Seconds", "zone5Seconds", "avgHr", "maxHr", "createdAt", "updatedAt") VALUES (
  '3c37dd1f-25f8-4212-afcf-52a7d37f0903',
  (SELECT id FROM activities WHERE "externalId" = 'demo-garmin-1763076055792-13' LIMIT 1),
  '2025-11-05',
  'Trail Running',
  3900,
  'garmin',
  720,
  2100,
  900,
  180,
  0,
  145,
  172,
  NOW(),
  NOW()
);

-- For activity: Endurance Ride
-- Note: You'll need to get the actual activity ID from the database after inserting activities
INSERT INTO heart_rate_zones ("userId", "activityId", date, "activityType", "durationSeconds", provider, "zone1Seconds", "zone2Seconds", "zone3Seconds", "zone4Seconds", "zone5Seconds", "avgHr", "maxHr", "createdAt", "updatedAt") VALUES (
  '3c37dd1f-25f8-4212-afcf-52a7d37f0903',
  (SELECT id FROM activities WHERE "externalId" = 'demo-garmin-1763076055792-14' LIMIT 1),
  '2025-11-04',
  'Cycling',
  5400,
  'garmin',
  1200,
  3600,
  600,
  0,
  0,
  135,
  158,
  NOW(),
  NOW()
);

(node:13629) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
