CREATE TABLE IF NOT EXISTS workspace_invites (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'user')),
  capabilities_json TEXT NOT NULL DEFAULT '[]',
  roster_member_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'revoked')) DEFAULT 'pending',
  invited_by_user_id TEXT,
  accepted_workspace_user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  accepted_at TEXT,
  revoked_at TEXT,
  FOREIGN KEY (roster_member_id) REFERENCES roster_members(id) ON DELETE SET NULL,
  FOREIGN KEY (invited_by_user_id) REFERENCES workspace_users(id) ON DELETE SET NULL,
  FOREIGN KEY (accepted_workspace_user_id) REFERENCES workspace_users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_workspace_invites_email_status ON workspace_invites(email, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_status_updated_at ON workspace_invites(status, updated_at DESC);
