ALTER TABLE source_document_files
  ADD COLUMN extraction_method TEXT CHECK (
    extraction_method IN ('upload_native', 'manual_native', 'queued_native', 'queued_ai')
  );

ALTER TABLE source_document_files
  ADD COLUMN extraction_provider TEXT CHECK (
    extraction_provider IN ('native_parser', 'workers_ai_markdown')
  );

ALTER TABLE source_document_files
  ADD COLUMN extraction_version TEXT;

ALTER TABLE source_document_files
  ADD COLUMN extracted_at TEXT;

ALTER TABLE source_document_extraction_jobs
  ADD COLUMN attempted_method TEXT CHECK (
    attempted_method IN ('upload_native', 'manual_native', 'queued_native', 'queued_ai')
  );

ALTER TABLE source_document_extraction_jobs
  ADD COLUMN attempted_provider TEXT CHECK (
    attempted_provider IN ('native_parser', 'workers_ai_markdown')
  );

ALTER TABLE source_document_extraction_jobs
  ADD COLUMN attempted_version TEXT;

UPDATE source_document_files
SET
  extraction_method = 'upload_native',
  extraction_provider = 'native_parser',
  extraction_version = 'native-parser-2026-03-09',
  extracted_at = COALESCE(updated_at, created_at)
WHERE content_text IS NOT NULL
  AND extraction_method IS NULL;
