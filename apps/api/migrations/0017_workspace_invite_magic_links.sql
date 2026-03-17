ALTER TABLE workspace_invites ADD COLUMN magic_link_token_hash TEXT;
ALTER TABLE workspace_invites ADD COLUMN magic_link_expires_at TEXT;
ALTER TABLE workspace_invites ADD COLUMN magic_link_sent_at TEXT;

CREATE INDEX IF NOT EXISTS idx_workspace_invites_magic_link_token_hash
  ON workspace_invites(magic_link_token_hash);
