CREATE TABLE IF NOT EXISTS source_document_files (
  document_id TEXT PRIMARY KEY REFERENCES source_documents(id) ON DELETE CASCADE,
  uploaded_file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  content_text TEXT NOT NULL,
  content_excerpt TEXT NOT NULL,
  extraction_status TEXT NOT NULL CHECK (extraction_status IN ('not_started', 'ready_for_review', 'reviewed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS source_extraction_suggestions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
  bucket_id TEXT NOT NULL REFERENCES context_buckets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_snippet TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium')),
  status TEXT NOT NULL CHECK (status IN ('pending_review', 'applied', 'dismissed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_source_document_files_updated_at ON source_document_files(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_source_suggestions_document ON source_extraction_suggestions(document_id, status, created_at);

INSERT OR IGNORE INTO source_document_files (
  document_id, uploaded_file_name, mime_type, byte_size, content_text, content_excerpt,
  extraction_status, created_at, updated_at
) VALUES
  (
    'doc_continuity_2026',
    'continuity-plan-2026.md',
    'text/markdown',
    482,
    'Teams:
- Operations
- Compliance

Critical Vendors:
- Identity Provider
- Primary Custodian

Escalation Roles:
- Incident Commander
- Executive Sponsor',
    'Teams: Operations, Compliance. Critical Vendors: Identity Provider, Primary Custodian. Escalation Roles: Incident Commander, Executive Sponsor.',
    'ready_for_review',
    '2026-03-01T10:00:00.000Z',
    '2026-03-01T10:00:00.000Z'
  ),
  (
    'doc_ir_playbook',
    'ir-playbook.md',
    'text/markdown',
    426,
    'Escalation Roles:
- Incident Commander
- Communications Lead

Vendors:
- Okta
- Communications Platform

Teams:
- Security
- Operations',
    'Escalation Roles: Incident Commander, Communications Lead. Vendors: Okta, Communications Platform. Teams: Security, Operations.',
    'ready_for_review',
    '2026-03-05T10:00:00.000Z',
    '2026-03-05T10:00:00.000Z'
  );

INSERT OR IGNORE INTO source_extraction_suggestions (
  id, document_id, bucket_id, name, source_snippet, confidence, status, created_at, updated_at
) VALUES
  (
    'suggestion_continuity_vendor_identity',
    'doc_continuity_2026',
    'vendors',
    'Identity Provider',
    'Critical Vendors: Identity Provider',
    'high',
    'pending_review',
    '2026-03-01T10:00:00.000Z',
    '2026-03-01T10:00:00.000Z'
  ),
  (
    'suggestion_continuity_exec_sponsor',
    'doc_continuity_2026',
    'escalation',
    'Executive Sponsor',
    'Escalation Roles: Executive Sponsor',
    'high',
    'pending_review',
    '2026-03-01T10:00:00.000Z',
    '2026-03-01T10:00:00.000Z'
  ),
  (
    'suggestion_ir_okta',
    'doc_ir_playbook',
    'vendors',
    'Okta',
    'Vendors: Okta',
    'high',
    'pending_review',
    '2026-03-05T10:00:00.000Z',
    '2026-03-05T10:00:00.000Z'
  ),
  (
    'suggestion_ir_comms_lead',
    'doc_ir_playbook',
    'escalation',
    'Communications Lead',
    'Escalation Roles: Communications Lead',
    'high',
    'pending_review',
    '2026-03-05T10:00:00.000Z',
    '2026-03-05T10:00:00.000Z'
  );
