PRAGMA foreign_keys = OFF;

CREATE TABLE scenario_drafts_next (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  template_id TEXT NOT NULL,
  audience TEXT NOT NULL,
  launch_mode TEXT NOT NULL CHECK (launch_mode IN ('individual', 'tabletop')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('low', 'medium', 'high')),
  learning_objectives TEXT NOT NULL,
  approval_status TEXT NOT NULL CHECK (approval_status IN ('draft', 'ready_for_review', 'changes_requested', 'approved')),
  reviewer_notes TEXT,
  reviewed_at TEXT,
  reviewed_by_user_id TEXT REFERENCES workspace_users(id) ON DELETE SET NULL,
  reviewed_by_name TEXT,
  scheduled_start_at TEXT,
  participants_label TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO scenario_drafts_next (
  id,
  title,
  template_id,
  audience,
  launch_mode,
  difficulty,
  learning_objectives,
  approval_status,
  reviewer_notes,
  reviewed_at,
  reviewed_by_user_id,
  reviewed_by_name,
  scheduled_start_at,
  participants_label,
  created_at,
  updated_at
)
SELECT
  id,
  title,
  template_id,
  audience,
  launch_mode,
  difficulty,
  learning_objectives,
  approval_status,
  NULL,
  NULL,
  NULL,
  NULL,
  scheduled_start_at,
  participants_label,
  created_at,
  updated_at
FROM scenario_drafts;

DROP TABLE scenario_drafts;
ALTER TABLE scenario_drafts_next RENAME TO scenario_drafts;

CREATE INDEX IF NOT EXISTS idx_scenario_drafts_updated_at ON scenario_drafts(updated_at DESC);

INSERT OR IGNORE INTO scenario_drafts (
  id,
  title,
  template_id,
  audience,
  launch_mode,
  difficulty,
  learning_objectives,
  approval_status,
  reviewer_notes,
  reviewed_at,
  reviewed_by_user_id,
  reviewed_by_name,
  scheduled_start_at,
  participants_label,
  created_at,
  updated_at
) VALUES (
  'draft_exec_comms_rework',
  'Executive Communications Escalation Rehearsal',
  'executive-tabletop',
  'Executive Team',
  'tabletop',
  'high',
  'Confirm who owns executive messaging, customer updates, and regulator escalation when the firm loses a core provider.',
  'changes_requested',
  'Tighten the first 30 minutes of decision flow and add explicit communications owner handoff before resubmitting.',
  '2026-03-15T16:20:00.000Z',
  'user_dana_admin',
  'Dana Smith',
  '2026-04-03',
  '7 leaders',
  '2026-03-14T11:00:00.000Z',
  '2026-03-15T16:20:00.000Z'
);

CREATE TABLE audit_events_next (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('access', 'operations')),
  action TEXT NOT NULL CHECK (
    action IN (
      'scenario_draft_submitted',
      'scenario_draft_approved',
      'scenario_draft_changes_requested',
      'workspace_user_created',
      'workspace_user_updated',
      'workspace_user_deactivated',
      'workspace_user_reactivated',
      'manager_scope_updated',
      'workspace_invite_created',
      'workspace_invite_revoked',
      'workspace_invite_reopened',
      'workspace_invite_accepted',
      'launch_created',
      'launch_updated',
      'participant_assignment_created',
      'participant_run_submitted'
    )
  ),
  target_type TEXT NOT NULL CHECK (target_type IN ('workspace_user', 'workspace_invite', 'scenario_draft', 'launch', 'participant_run')),
  target_id TEXT NOT NULL,
  actor_user_id TEXT REFERENCES workspace_users(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('user', 'manager', 'admin', 'system')),
  summary TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO audit_events_next (
  id,
  category,
  action,
  target_type,
  target_id,
  actor_user_id,
  actor_name,
  actor_role,
  summary,
  detail,
  created_at
)
SELECT
  id,
  category,
  action,
  target_type,
  target_id,
  actor_user_id,
  actor_name,
  actor_role,
  summary,
  detail,
  created_at
FROM audit_events;

DROP TABLE audit_events;
ALTER TABLE audit_events_next RENAME TO audit_events;

CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_target ON audit_events(target_type, target_id, created_at DESC);

INSERT OR IGNORE INTO audit_events (
  id,
  category,
  action,
  target_type,
  target_id,
  actor_user_id,
  actor_name,
  actor_role,
  summary,
  detail,
  created_at
) VALUES (
  'audit_operations_draft_rework',
  'operations',
  'scenario_draft_changes_requested',
  'scenario_draft',
  'draft_exec_comms_rework',
  'user_dana_admin',
  'Dana Smith',
  'admin',
  'Dana Smith requested changes on scenario draft Executive Communications Escalation Rehearsal.',
  'Executive Team · Tabletop · note Tighten the first 30 minutes of decision flow and add explicit communications owner handoff before resubmitting.',
  '2026-03-15T16:20:00.000Z'
);

PRAGMA foreign_keys = ON;
