CREATE TABLE IF NOT EXISTS roster_members (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role_title TEXT NOT NULL,
  team TEXT NOT NULL,
  manager_name TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

ALTER TABLE participant_runs ADD COLUMN roster_member_id TEXT REFERENCES roster_members(id) ON DELETE SET NULL;
ALTER TABLE participant_runs ADD COLUMN participant_email TEXT;
ALTER TABLE participant_runs ADD COLUMN participant_team TEXT;

CREATE INDEX IF NOT EXISTS idx_roster_members_status_name ON roster_members(status, full_name, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_participant_runs_roster_member_id ON participant_runs(roster_member_id, updated_at DESC);

INSERT OR IGNORE INTO roster_members (
  id,
  full_name,
  email,
  role_title,
  team,
  manager_name,
  status,
  created_at,
  updated_at
) VALUES
  (
    'roster_kim_patel',
    'Kim Patel',
    'kim.patel@altira-demo.com',
    'Operations Manager',
    'Operations',
    'Morgan Avery',
    'active',
    '2026-03-11T14:00:00.000Z',
    '2026-03-11T14:00:00.000Z'
  ),
  (
    'roster_jordan_lee',
    'Jordan Lee',
    'jordan.lee@altira-demo.com',
    'Compliance Officer',
    'Compliance',
    'Morgan Avery',
    'active',
    '2026-03-11T14:05:00.000Z',
    '2026-03-11T14:05:00.000Z'
  ),
  (
    'roster_taylor_brooks',
    'Taylor Brooks',
    'taylor.brooks@altira-demo.com',
    'Chief Information Security Officer',
    'Security',
    'Morgan Avery',
    'active',
    '2026-03-11T14:10:00.000Z',
    '2026-03-11T14:10:00.000Z'
  ),
  (
    'roster_morgan_avery',
    'Morgan Avery',
    'morgan.avery@altira-demo.com',
    'Chief Operating Officer',
    'Executive',
    NULL,
    'active',
    '2026-03-11T14:15:00.000Z',
    '2026-03-11T14:15:00.000Z'
  );

UPDATE participant_runs
SET roster_member_id = 'roster_kim_patel',
    participant_email = 'kim.patel@altira-demo.com',
    participant_team = 'Operations'
WHERE participant_name = 'Kim Patel'
  AND participant_role = 'Operations Manager';

UPDATE participant_runs
SET roster_member_id = 'roster_jordan_lee',
    participant_email = 'jordan.lee@altira-demo.com',
    participant_team = 'Compliance'
WHERE participant_name = 'Jordan Lee'
  AND participant_role = 'Compliance Officer';

UPDATE participant_runs
SET roster_member_id = 'roster_taylor_brooks',
    participant_email = 'taylor.brooks@altira-demo.com',
    participant_team = 'Security'
WHERE participant_name = 'Taylor Brooks'
  AND participant_role = 'Chief Information Security Officer';

UPDATE participant_runs
SET roster_member_id = 'roster_morgan_avery',
    participant_email = 'morgan.avery@altira-demo.com',
    participant_team = 'Executive'
WHERE participant_name = 'Morgan Avery'
  AND participant_role = 'Chief Operating Officer';
