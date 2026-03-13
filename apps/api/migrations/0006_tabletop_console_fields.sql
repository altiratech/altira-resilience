ALTER TABLE launches ADD COLUMN tabletop_phase TEXT;
ALTER TABLE launches ADD COLUMN facilitator_notes TEXT NOT NULL DEFAULT '';

UPDATE launches
SET tabletop_phase = 'briefing'
WHERE mode = 'tabletop'
  AND tabletop_phase IS NULL;

UPDATE scenario_drafts
SET approval_status = 'approved',
    updated_at = '2026-03-08T18:00:00.000Z'
WHERE id = 'draft_vendor_tabletop'
  AND approval_status = 'ready_for_review';

INSERT OR IGNORE INTO launches (
  id,
  scenario_draft_id,
  name,
  mode,
  audience,
  status,
  starts_at,
  participants_label,
  scenario_brief,
  learning_objectives,
  tabletop_phase,
  facilitator_notes,
  created_at,
  updated_at
) VALUES (
  'launch_vendor_tabletop_exec',
  'draft_vendor_tabletop',
  'Core Vendor Outage Tabletop',
  'tabletop',
  'Executive Team',
  'scheduled',
  '2026-03-27',
  '8 leaders',
  'A primary operations vendor loses regional processing capacity during market hours. The executive team must confirm the first decision path, assign external communications ownership, and determine whether continuity workarounds are sufficient.',
  'Pressure test executive decision rights, external communications ownership, and continuity workaround readiness.',
  'briefing',
  '',
  '2026-03-08T18:00:00.000Z',
  '2026-03-08T18:00:00.000Z'
);

INSERT OR IGNORE INTO participant_runs (
  id,
  launch_id,
  participant_name,
  participant_role,
  status,
  first_action,
  escalation_choice,
  impact_assessment,
  notes,
  policy_acknowledged,
  score_percent,
  required_actions_completed,
  total_required_actions,
  due_at,
  started_at,
  submitted_at,
  created_at,
  updated_at
) VALUES
  (
    'run_vendor_exec_coo',
    'launch_vendor_tabletop_exec',
    'Morgan Avery',
    'Chief Operating Officer',
    'assigned',
    '',
    '',
    '',
    '',
    0,
    NULL,
    0,
    4,
    '2026-03-27',
    NULL,
    NULL,
    '2026-03-08T18:00:00.000Z',
    '2026-03-08T18:00:00.000Z'
  ),
  (
    'run_vendor_exec_ciso',
    'launch_vendor_tabletop_exec',
    'Taylor Brooks',
    'Chief Information Security Officer',
    'assigned',
    '',
    '',
    '',
    '',
    0,
    NULL,
    0,
    4,
    '2026-03-27',
    NULL,
    NULL,
    '2026-03-08T18:00:00.000Z',
    '2026-03-08T18:00:00.000Z'
  );
