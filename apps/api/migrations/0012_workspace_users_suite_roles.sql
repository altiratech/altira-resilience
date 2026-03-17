CREATE TABLE IF NOT EXISTS workspace_users_v2 (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'user')),
  capabilities_json TEXT NOT NULL DEFAULT '[]',
  roster_member_id TEXT REFERENCES roster_members(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR REPLACE INTO workspace_users_v2 (
  id,
  full_name,
  email,
  role,
  capabilities_json,
  roster_member_id,
  status,
  created_at,
  updated_at
)
SELECT
  id,
  full_name,
  email,
  CASE role
    WHEN 'facilitator' THEN 'manager'
    WHEN 'participant' THEN 'user'
    ELSE role
  END AS role,
  CASE role
    WHEN 'facilitator' THEN '["resilience_tabletop_facilitate"]'
    ELSE '[]'
  END AS capabilities_json,
  roster_member_id,
  status,
  created_at,
  updated_at
FROM workspace_users;

DROP TABLE workspace_users;

ALTER TABLE workspace_users_v2 RENAME TO workspace_users;

CREATE INDEX IF NOT EXISTS idx_workspace_users_role_status ON workspace_users(role, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_users_roster_member_id ON workspace_users(roster_member_id, updated_at DESC);
