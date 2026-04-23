PRAGMA foreign_keys = OFF;

CREATE TABLE scenario_drafts_next (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  template_id TEXT NOT NULL,
  audience TEXT NOT NULL,
  launch_mode TEXT NOT NULL CHECK (launch_mode IN ('individual', 'tabletop')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('low', 'medium', 'high')),
  trigger_event TEXT NOT NULL,
  scenario_scope TEXT NOT NULL,
  evidence_focus TEXT NOT NULL,
  selected_document_ids_json TEXT NOT NULL DEFAULT '[]',
  selected_context_item_ids_json TEXT NOT NULL DEFAULT '[]',
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
  trigger_event,
  scenario_scope,
  evidence_focus,
  selected_document_ids_json,
  selected_context_item_ids_json,
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
  CASE
    WHEN id = 'draft_q2_cyber' THEN 'Suspicious identity-provider outage and endpoint credential reset requests begin hitting operations during market open.'
    WHEN id = 'draft_vendor_tabletop' THEN 'A core vendor outage interrupts transaction processing and forces a manual-workaround decision before client reporting deadlines.'
    WHEN id = 'draft_exec_comms_rework' THEN 'The firm loses a core provider while inbound client and regulator questions start arriving before the executive team has aligned on the message.'
    ELSE 'An operational disruption forces the team to follow the firm''s approved escalation path under time pressure.'
  END,
  CASE
    WHEN id = 'draft_q2_cyber' THEN 'First-hour response across Operations, Compliance, and Security with vendor coordination and customer-impact triage.'
    WHEN id = 'draft_vendor_tabletop' THEN 'Executive tabletop covering continuity workaround approval, external communications, and cross-functional escalation ownership.'
    WHEN id = 'draft_exec_comms_rework' THEN 'Leadership-only rehearsal of executive message ownership, regulator notification posture, and communications handoff during the first 30 minutes.'
    ELSE 'Initial response window, cross-functional escalation path, impact assessment, and next-action ownership.'
  END,
  CASE
    WHEN id = 'draft_q2_cyber' THEN 'Escalation timing, vendor handoff, policy acknowledgement, and impact-assessment quality.'
    WHEN id = 'draft_vendor_tabletop' THEN 'Decision-right clarity, continuity workaround approval path, and leadership communications sequencing.'
    WHEN id = 'draft_exec_comms_rework' THEN 'Named communications owner, regulator/customer sequencing, and explicit executive handoff moments.'
    ELSE 'Escalation quality, impact assessment, and the next required action.'
  END,
  CASE
    WHEN id = 'draft_q2_cyber' THEN '["doc_ir_playbook","doc_continuity_2026"]'
    WHEN id IN ('draft_vendor_tabletop', 'draft_exec_comms_rework') THEN '["doc_continuity_2026","doc_vendor_matrix"]'
    ELSE '[]'
  END,
  CASE
    WHEN id = 'draft_q2_cyber' THEN '["team_ops","team_compliance","vendor_okta","role_incident_commander"]'
    WHEN id = 'draft_vendor_tabletop' THEN '["team_ops","vendor_custodian","role_incident_commander"]'
    WHEN id = 'draft_exec_comms_rework' THEN '["team_compliance","vendor_custodian","role_incident_commander"]'
    ELSE '[]'
  END,
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
FROM scenario_drafts;

DROP TABLE scenario_drafts;
ALTER TABLE scenario_drafts_next RENAME TO scenario_drafts;

CREATE INDEX IF NOT EXISTS idx_scenario_drafts_updated_at ON scenario_drafts(updated_at DESC);

PRAGMA foreign_keys = ON;
