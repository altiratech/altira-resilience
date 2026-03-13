CREATE TABLE IF NOT EXISTS source_documents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  business_unit TEXT NOT NULL,
  owner TEXT NOT NULL,
  effective_date TEXT NOT NULL,
  parse_status TEXT NOT NULL CHECK (parse_status IN ('uploaded', 'parsed', 'needs_review', 'approved')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS context_buckets (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS context_items (
  id TEXT PRIMARY KEY,
  bucket_id TEXT NOT NULL REFERENCES context_buckets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  review_state TEXT NOT NULL CHECK (review_state IN ('confirmed', 'needs_review')),
  required INTEGER NOT NULL CHECK (required IN (0, 1)),
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scenario_drafts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  template_id TEXT NOT NULL,
  audience TEXT NOT NULL,
  launch_mode TEXT NOT NULL CHECK (launch_mode IN ('individual', 'tabletop')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('low', 'medium', 'high')),
  learning_objectives TEXT NOT NULL,
  approval_status TEXT NOT NULL CHECK (approval_status IN ('draft', 'ready_for_review', 'approved')),
  scheduled_start_at TEXT,
  participants_label TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_context_items_bucket ON context_items(bucket_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_source_documents_updated_at ON source_documents(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_scenario_drafts_updated_at ON scenario_drafts(updated_at DESC);

INSERT OR IGNORE INTO source_documents (
  id, name, type, business_unit, owner, effective_date, parse_status, created_at, updated_at
) VALUES
  ('doc_continuity_2026', 'Continuity Plan 2026', 'Continuity Plan', 'Operations', 'Dana Smith', '2026-01-15', 'approved', '2026-03-01T10:00:00.000Z', '2026-03-01T10:00:00.000Z'),
  ('doc_vendor_matrix', 'Vendor Matrix', 'Vendor List', 'Operations', 'Dana Smith', '2026-02-01', 'needs_review', '2026-03-03T10:00:00.000Z', '2026-03-03T10:00:00.000Z'),
  ('doc_ir_playbook', 'IR Playbook', 'Incident Response', 'Security', 'Alex Morgan', '2026-02-10', 'approved', '2026-03-05T10:00:00.000Z', '2026-03-05T10:00:00.000Z');

INSERT OR IGNORE INTO context_buckets (
  id, label, sort_order, created_at, updated_at
) VALUES
  ('teams', 'Teams', 1, '2026-03-01T10:00:00.000Z', '2026-03-01T10:00:00.000Z'),
  ('vendors', 'Vendors', 2, '2026-03-01T10:00:00.000Z', '2026-03-01T10:00:00.000Z'),
  ('escalation', 'Escalation Roles', 3, '2026-03-01T10:00:00.000Z', '2026-03-01T10:00:00.000Z');

INSERT OR IGNORE INTO context_items (
  id, bucket_id, name, review_state, required, sort_order, created_at, updated_at
) VALUES
  ('team_ops', 'teams', 'Operations', 'confirmed', 1, 1, '2026-03-01T10:00:00.000Z', '2026-03-01T10:00:00.000Z'),
  ('team_compliance', 'teams', 'Compliance', 'confirmed', 1, 2, '2026-03-01T10:00:00.000Z', '2026-03-01T10:00:00.000Z'),
  ('team_security', 'teams', 'Security', 'needs_review', 1, 3, '2026-03-01T10:00:00.000Z', '2026-03-01T10:00:00.000Z'),
  ('vendor_okta', 'vendors', 'Identity Provider', 'confirmed', 1, 1, '2026-03-01T10:00:00.000Z', '2026-03-01T10:00:00.000Z'),
  ('vendor_custodian', 'vendors', 'Primary Custodian', 'confirmed', 1, 2, '2026-03-01T10:00:00.000Z', '2026-03-01T10:00:00.000Z'),
  ('vendor_comms', 'vendors', 'Communications Platform', 'needs_review', 0, 3, '2026-03-01T10:00:00.000Z', '2026-03-01T10:00:00.000Z'),
  ('role_incident_commander', 'escalation', 'Incident Commander', 'confirmed', 1, 1, '2026-03-01T10:00:00.000Z', '2026-03-01T10:00:00.000Z'),
  ('role_exec_sponsor', 'escalation', 'Executive Sponsor', 'needs_review', 1, 2, '2026-03-01T10:00:00.000Z', '2026-03-01T10:00:00.000Z');

INSERT OR IGNORE INTO scenario_drafts (
  id, title, template_id, audience, launch_mode, difficulty, learning_objectives,
  approval_status, scheduled_start_at, participants_label, created_at, updated_at
) VALUES
  (
    'draft_q2_cyber',
    'Q2 Cyber Escalation Drill',
    'cyber-incident-escalation',
    'Operations + Compliance',
    'individual',
    'medium',
    'Validate the first escalation actions, vendor coordination path, and cross-functional communication chain.',
    'approved',
    '2026-03-18',
    '48 assignees',
    '2026-03-02T09:00:00.000Z',
    '2026-03-06T14:00:00.000Z'
  ),
  (
    'draft_vendor_tabletop',
    'Core Vendor Outage Tabletop',
    'critical-vendor-outage',
    'Executive Team',
    'tabletop',
    'high',
    'Pressure test executive decisions, comms ownership, and manual-workaround escalation.',
    'ready_for_review',
    '2026-03-27',
    '8 leaders',
    '2026-03-04T12:00:00.000Z',
    '2026-03-06T16:00:00.000Z'
  );
