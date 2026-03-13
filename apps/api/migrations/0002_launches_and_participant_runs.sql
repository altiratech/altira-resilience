CREATE TABLE IF NOT EXISTS launches (
  id TEXT PRIMARY KEY,
  scenario_draft_id TEXT NOT NULL REFERENCES scenario_drafts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('individual', 'tabletop')),
  audience TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'scheduled', 'in_progress', 'completed')),
  starts_at TEXT,
  participants_label TEXT,
  scenario_brief TEXT NOT NULL,
  learning_objectives TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS participant_runs (
  id TEXT PRIMARY KEY,
  launch_id TEXT NOT NULL REFERENCES launches(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL,
  participant_role TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('assigned', 'in_progress', 'submitted')),
  first_action TEXT NOT NULL DEFAULT '',
  escalation_choice TEXT NOT NULL DEFAULT '',
  impact_assessment TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  policy_acknowledged INTEGER NOT NULL DEFAULT 0 CHECK (policy_acknowledged IN (0, 1)),
  score_percent INTEGER,
  required_actions_completed INTEGER NOT NULL DEFAULT 0,
  total_required_actions INTEGER NOT NULL DEFAULT 4,
  due_at TEXT,
  started_at TEXT,
  submitted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_launches_updated_at ON launches(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_launches_scenario_draft ON launches(scenario_draft_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_participant_runs_launch ON participant_runs(launch_id, updated_at DESC);

INSERT OR IGNORE INTO launches (
  id, scenario_draft_id, name, mode, audience, status, starts_at, participants_label,
  scenario_brief, learning_objectives, created_at, updated_at
) VALUES
  (
    'launch_q2_cyber_wave1',
    'draft_q2_cyber',
    'Q2 Cyber Escalation Drill',
    'individual',
    'Operations + Compliance',
    'in_progress',
    '2026-03-18',
    '48 assignees',
    'A critical identity provider begins failing across employee authentication and advisor portal access. Participants must decide the first escalation, assess customer impact, and coordinate the internal response using approved procedures.',
    'Validate the first escalation actions, vendor coordination path, and cross-functional communication chain.',
    '2026-03-06T18:00:00.000Z',
    '2026-03-07T12:00:00.000Z'
  );

INSERT OR IGNORE INTO participant_runs (
  id, launch_id, participant_name, participant_role, status, first_action, escalation_choice,
  impact_assessment, notes, policy_acknowledged, score_percent, required_actions_completed,
  total_required_actions, due_at, started_at, submitted_at, created_at, updated_at
) VALUES
  (
    'run_kim_ops',
    'launch_q2_cyber_wave1',
    'Kim Patel',
    'Operations Manager',
    'submitted',
    'Escalate to the incident commander and confirm the identity provider outage scope.',
    'Incident Commander',
    'Advisor and employee login failures interrupt transaction review, but customer assets remain accessible.',
    'The vendor contact tree needs a cleaner handoff between security and operations.',
    1,
    100,
    4,
    4,
    '2026-03-18',
    '2026-03-07T11:00:00.000Z',
    '2026-03-07T12:00:00.000Z',
    '2026-03-07T11:00:00.000Z',
    '2026-03-07T12:00:00.000Z'
  ),
  (
    'run_jordan_compliance',
    'launch_q2_cyber_wave1',
    'Jordan Lee',
    'Compliance Officer',
    'assigned',
    '',
    '',
    '',
    '',
    0,
    NULL,
    0,
    4,
    '2026-03-18',
    NULL,
    NULL,
    '2026-03-07T09:00:00.000Z',
    '2026-03-07T09:00:00.000Z'
  );
