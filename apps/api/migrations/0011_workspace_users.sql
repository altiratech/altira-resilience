CREATE TABLE IF NOT EXISTS workspace_users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'facilitator', 'manager', 'participant')),
  roster_member_id TEXT REFERENCES roster_members(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workspace_users_role_status ON workspace_users(role, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_users_roster_member_id ON workspace_users(roster_member_id, updated_at DESC);

INSERT OR IGNORE INTO workspace_users (
  id,
  full_name,
  email,
  role,
  roster_member_id,
  status,
  created_at,
  updated_at
) VALUES
  (
    'user_dana_admin',
    'Dana Smith',
    'dana.smith@altira-demo.local',
    'admin',
    NULL,
    'active',
    '2026-03-11T14:30:00.000Z',
    '2026-03-11T14:30:00.000Z'
  ),
  (
    'user_morgan_facilitator',
    'Morgan Avery',
    'morgan.avery@altira-demo.local',
    'facilitator',
    'roster_morgan_avery',
    'active',
    '2026-03-11T14:35:00.000Z',
    '2026-03-11T14:35:00.000Z'
  ),
  (
    'user_kim_manager',
    'Kim Patel',
    'kim.patel@altira-demo.local',
    'manager',
    'roster_kim_patel',
    'active',
    '2026-03-11T14:40:00.000Z',
    '2026-03-11T14:40:00.000Z'
  ),
  (
    'user_jordan_participant',
    'Jordan Lee',
    'jordan.lee@altira-demo.local',
    'participant',
    'roster_jordan_lee',
    'active',
    '2026-03-11T14:45:00.000Z',
    '2026-03-11T14:45:00.000Z'
  );
