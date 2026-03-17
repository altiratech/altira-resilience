CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  workspace_user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY (workspace_user_id) REFERENCES workspace_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_workspace_user_id ON auth_sessions(workspace_user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);
