CREATE TABLE source_document_files_next (
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
  updated_at TEXT NOT NULL
);

INSERT INTO source_document_files_next (
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
  updated_at
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
  updated_at
FROM source_document_files;

DROP TABLE source_document_files;

ALTER TABLE source_document_files_next RENAME TO source_document_files;

CREATE INDEX IF NOT EXISTS idx_source_document_files_updated_at ON source_document_files(updated_at DESC);

CREATE TABLE IF NOT EXISTS source_document_extraction_jobs (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'needs_attention', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_source_document_extraction_jobs_document_id
  ON source_document_extraction_jobs(document_id, updated_at DESC);
