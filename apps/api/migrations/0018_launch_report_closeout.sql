ALTER TABLE launches ADD COLUMN report_closeout_notes TEXT NOT NULL DEFAULT '';
ALTER TABLE launches ADD COLUMN report_follow_up_text TEXT NOT NULL DEFAULT '';
ALTER TABLE launches ADD COLUMN report_closed_at TEXT;
ALTER TABLE launches ADD COLUMN report_closed_by_user_id TEXT REFERENCES workspace_users(id) ON DELETE SET NULL;
ALTER TABLE launches ADD COLUMN report_closed_by_name TEXT;
