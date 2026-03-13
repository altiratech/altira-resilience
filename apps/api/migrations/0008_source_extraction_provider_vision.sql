CREATE TABLE source_document_files_next_provider (
  document_id TEXT PRIMARY KEY REFERENCES source_documents(id) ON DELETE CASCADE,
  uploaded_file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  storage_backend TEXT NOT NULL DEFAULT 'inline' CHECK (storage_backend IN ('inline', 'r2')),
  storage_object_key TEXT,
  content_text TEXT,
  content_excerpt TEXT,
  extraction_note TEXT,
  extraction_status TEXT NOT NULL CHECK (
    extraction_status IN ('not_started', 'queued', 'ready_for_review', 'reviewed', 'needs_attention')
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  extraction_method TEXT CHECK (
    extraction_method IN ('upload_native', 'manual_native', 'queued_native', 'queued_ai')
  ),
  extraction_provider TEXT CHECK (
    extraction_provider IN ('native_parser', 'workers_ai_markdown', 'workers_ai_vision')
  ),
  extraction_version TEXT,
  extracted_at TEXT
);

INSERT INTO source_document_files_next_provider (
  document_id,
  uploaded_file_name,
  mime_type,
  byte_size,
  storage_backend,
  storage_object_key,
  content_text,
  content_excerpt,
  extraction_note,
  extraction_status,
  created_at,
  updated_at,
  extraction_method,
  extraction_provider,
  extraction_version,
  extracted_at
)
SELECT
  document_id,
  uploaded_file_name,
  mime_type,
  byte_size,
  storage_backend,
  storage_object_key,
  content_text,
  content_excerpt,
  extraction_note,
  extraction_status,
  created_at,
  updated_at,
  extraction_method,
  extraction_provider,
  extraction_version,
  extracted_at
FROM source_document_files;

DROP TABLE source_document_files;

ALTER TABLE source_document_files_next_provider RENAME TO source_document_files;

CREATE INDEX IF NOT EXISTS idx_source_document_files_updated_at ON source_document_files(updated_at DESC);

CREATE TABLE source_document_extraction_jobs_next_provider (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'needs_attention', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  attempted_method TEXT CHECK (
    attempted_method IN ('upload_native', 'manual_native', 'queued_native', 'queued_ai')
  ),
  attempted_provider TEXT CHECK (
    attempted_provider IN ('native_parser', 'workers_ai_markdown', 'workers_ai_vision')
  ),
  attempted_version TEXT
);

INSERT INTO source_document_extraction_jobs_next_provider (
  id,
  document_id,
  status,
  attempt_count,
  last_error,
  created_at,
  updated_at,
  started_at,
  completed_at,
  attempted_method,
  attempted_provider,
  attempted_version
)
SELECT
  id,
  document_id,
  status,
  attempt_count,
  last_error,
  created_at,
  updated_at,
  started_at,
  completed_at,
  attempted_method,
  attempted_provider,
  attempted_version
FROM source_document_extraction_jobs;

DROP TABLE source_document_extraction_jobs;

ALTER TABLE source_document_extraction_jobs_next_provider RENAME TO source_document_extraction_jobs;

CREATE INDEX IF NOT EXISTS idx_source_document_extraction_jobs_document_id
  ON source_document_extraction_jobs(document_id, updated_at DESC);
