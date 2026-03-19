UPDATE scenario_drafts
SET participants_label = '2 assignees'
WHERE id = 'draft_q2_cyber';

UPDATE scenario_drafts
SET participants_label = '2 leaders'
WHERE id = 'draft_vendor_tabletop';

UPDATE launches
SET participants_label = '2 assignees'
WHERE id = 'launch_q2_cyber_wave1';

UPDATE launches
SET participants_label = '2 leaders'
WHERE id = 'launch_vendor_tabletop_exec';

UPDATE source_document_files
SET extraction_status = 'reviewed'
WHERE document_id IN ('doc_continuity_2026', 'doc_ir_playbook');

UPDATE source_extraction_suggestions
SET status = 'applied'
WHERE id = 'suggestion_continuity_vendor_identity';

UPDATE source_extraction_suggestions
SET status = 'dismissed'
WHERE id IN ('suggestion_continuity_exec_sponsor', 'suggestion_ir_okta');

UPDATE source_extraction_suggestions
SET status = 'applied'
WHERE id = 'suggestion_ir_comms_lead';

UPDATE workspace_invites
SET email = 'riley.chen@altira-demo.local',
    full_name = 'Riley Chen',
    updated_at = '2026-03-18T14:00:00.000Z'
WHERE id = 'invite_taylor_observer';

UPDATE audit_events
SET summary = 'Dana Smith created a workspace invite for Riley Chen.',
    detail = 'Invite remains pending until Riley activates the time-limited sign-in link.'
WHERE id = 'audit_access_invite_taylor';
