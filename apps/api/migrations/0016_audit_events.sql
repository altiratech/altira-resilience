CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('access', 'operations')),
  action TEXT NOT NULL CHECK (
    action IN (
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
  target_type TEXT NOT NULL CHECK (target_type IN ('workspace_user', 'workspace_invite', 'launch', 'participant_run')),
  target_id TEXT NOT NULL,
  actor_user_id TEXT REFERENCES workspace_users(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('user', 'manager', 'admin', 'system')),
  summary TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
) VALUES
  (
    'audit_access_admin_created_kim',
    'access',
    'workspace_user_created',
    'workspace_user',
    'user_kim_manager',
    'user_dana_admin',
    'Dana Smith',
    'admin',
    'Dana Smith created workspace user Kim Patel as a manager.',
    'Initial manager access created for Operations oversight.',
    '2026-03-11T14:40:00.000Z'
  ),
  (
    'audit_access_scope_morgan',
    'access',
    'manager_scope_updated',
    'workspace_user',
    'user_morgan_facilitator',
    'user_dana_admin',
    'Dana Smith',
    'admin',
    'Dana Smith updated Morgan Avery scope to Executive, Security.',
    'Tabletop facilitate capability remains enabled.',
    '2026-03-11T14:35:00.000Z'
  ),
  (
    'audit_operations_launch_tabletop',
    'operations',
    'launch_created',
    'launch',
    'launch_vendor_tabletop_exec',
    'user_dana_admin',
    'Dana Smith',
    'admin',
    'Dana Smith created launch Core Vendor Outage Tabletop.',
    'Executive tabletop launch created from the approved vendor outage draft.',
    '2026-03-08T09:00:00.000Z'
  ),
  (
    'audit_operations_assignment_ops',
    'operations',
    'participant_assignment_created',
    'launch',
    'launch_q2_cyber_wave1',
    'user_dana_admin',
    'Dana Smith',
    'admin',
    'Dana Smith created 1 participant assignment for Q2 Cyber Escalation Drill.',
    'Kim Patel · Operations',
    '2026-03-12T15:00:00.000Z'
  ),
  (
    'audit_access_invite_taylor',
    'access',
    'workspace_invite_created',
    'workspace_invite',
    'invite_taylor_observer',
    'user_dana_admin',
    'Dana Smith',
    'admin',
    'Dana Smith created a workspace invite for Taylor Observer.',
    'Invite remains pending until first sign-in.',
    '2026-03-16T12:30:00.000Z'
  );
