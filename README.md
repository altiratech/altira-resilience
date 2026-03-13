# Altira Resilience

Canonical implementation home for Altira Resilience.

## Status

Active admin-foundation build.

Current state:
- repo initialized
- Signal-style monorepo shape selected
- `apps/web` uses React + Vite
- `apps/api` uses a Cloudflare Worker API
- `packages/shared` holds shared TypeScript contracts
- D1-backed persistence now exists for:
  - Source Library records
  - Organization Context buckets/items
  - Scenario Drafts with approval state
- Text-based source upload and extraction review now exist for:
  - stored source-file content
  - extracted teams / vendors / escalation-role suggestions
  - apply / dismiss review actions before context changes
- Source Library now also supports production-shaped storage behavior:
  - text uploads can still fall back to inline storage when no bucket is configured
  - supported binary uploads (`pdf`, `docx`, `xlsx`, `pptx`, `png`, `jpg`, `jpeg`, `webp`) store in R2 when the bucket binding exists
  - supported PDFs and modern Office files now extract text inline on upload when possible
  - older stored R2 files can be backfilled through a manual extraction action
  - unreadable stored R2 files can now queue a follow-up extraction job through Cloudflare Queues
  - unreadable uploads now also attempt a bounded upload-time AI extraction before the queue path is used
  - queued follow-up extraction now uses a Cloudflare Workers AI markdown/OCR fallback when inline extraction still fails
  - scanned PDFs now also have a bounded vision-OCR fallback path with provider-specific provenance when markdown conversion does not recover usable text
  - upload-time AI extraction now records distinct `upload_ai` provenance so it is not conflated with queued jobs
  - extracted text now carries stored provenance for method, provider, version, and capture time
  - the latest extraction job also records the last attempted provider/method path
  - description-like AI output is now blocked from becoming reviewable extracted text
  - document detail now shows the latest extraction-job state (`queued`, `processing`, `completed`, `needs_attention`, `failed`)
  - image uploads can now enter the same OCR-backed queue path as document uploads
  - files without usable extracted text still stay honest and land in `needs_attention` with no suggestions generated
  - approved context remains separate from extracted text so reprocessing does not silently rewrite operator-approved records
- Cloudflare source-ingestion infrastructure is now provisioned and wired:
  - production R2 bucket: `altira-resilience-source-documents`
  - preview R2 bucket: `altira-resilience-source-documents-preview`
  - extraction queue: `altira-resilience-source-extraction`
  - Workers AI binding: `AI`
- Explicit launch records and participant runs now exist for:
  - launch creation from approved drafts
  - roster-backed and ad hoc participant assignment
  - deterministic checkpoint scoring
  - report detail, after-action summaries, and exportable evidence outputs
- A first real roster / assignment model now exists for:
  - a persisted participant directory with name, role, team, email, manager, and status
  - roster-backed launch assignment from the admin UI
  - participant-run identity snapshots so evidence stays stable even if the roster changes later
  - report and export outputs that now carry team/email context alongside the assigned participant
- A bounded workspace-user / role model now exists for:
  - persisted `workspace_users` with `admin`, `facilitator`, `manager`, and `participant` roles
  - role-filtered bootstrap payloads, navigation, and API access rules
  - a participant-only `My Exercises` home surface tied to assigned runs
  - facilitator control over tabletop status / phase / notes without broad admin write access
  - preview-grade persona switching through `X-Resilience-User-Id` + local storage so role boundaries can be validated before external auth exists
- the admin workflow now reads/writes real records across Home, Source Library, Organization Context, Scenario Studio, Launches, Reports, and Settings
- the app now includes bounded runtime surfaces inside the same web shell:
  - a participant exercise workspace for assigned individual runs
  - a facilitator tabletop console with launch-level phase control, status control, and facilitator notes
- tabletop launch state is now facilitator-owned at the launch level:
  - launch `status` and `tabletopPhase` remain operator-controlled for tabletop sessions
  - participant runs still drive completion and scoring for assigned individual exercises
- the local preview now runs on isolated ports so it does not collide with Signal:
  - web: `http://localhost:5184`
  - api: `http://localhost:8798`
- local validation passed:
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
  - `npm run db:migrate:local -w @resilience/api`
- no external auth, SSO, tenant-grade identity integration, or roster sync yet
- real-file validation has now been run on:
  - a real text PDF
  - a real image-only PDF derived from a real PDF
  - a real PNG derived from a real PDF
- current live OCR reality:
  - real text PDFs still succeed through the native extraction path
  - the validated real scanned PDF now succeeds through the bounded upload-time Workers AI path with stored `upload_ai` provenance
  - queued scanned-PDF follow-up still retains the provider-specific `workers_ai_vision` fallback when markdown conversion does not recover usable text
  - the local preview queue worker now surfaces an honest environment/storage note if an R2 follow-up job cannot read stored bytes, instead of pretending OCR itself could not find a page image
- legacy `.doc`, `.xls`, and `.ppt` remain explicitly unsupported in v1
- AI/document boundary note now lives at `docs/AI_DOCUMENT_BOUNDARY.md`

## Product Role

Altira Resilience is the separate Altira product focused on:
- business continuity exercises
- cybersecurity training scenarios
- compliance procedure rehearsal
- executive tabletop exercises
- after-action and evidence outputs

It is not an ESCALATION / Altira Flashpoint feature.

## Canonical Strategy Inputs

Product-definition and pre-build strategy docs live in:
- `Business Ideas/Altira-Resilience/`

Key inputs:
- `Business Ideas/Altira-Resilience/Product-Definition.md`
- `Business Ideas/Altira-Resilience/ICP-and-Messaging.md`
- `Business Ideas/Altira-Resilience/Scenario-Studio-v1-PRD.md`
- `Business Ideas/Altira-Resilience/Scenario-Studio-v1-Wireframe-Brief.md`
- `docs/AI_DOCUMENT_BOUNDARY.md`

## Build Rule

Do not build product code in `Business Ideas/`.

Implementation work for this product should happen here:
- `Code/active/altira-resilience`

## Immediate Next Step

Move from the bounded preview-grade role model into enterprise identity:
- add external auth / SSO on top of the new `workspace_users` model
- tighten tenant-safe identity and access boundaries for admin, facilitator, manager, and participant users
- preserve the roster snapshot rule so later directory edits do not rewrite evidence history
- preserve the `upload_ai` vs `queued_ai` provenance split while deeper workflow surfaces are added
- keep legacy `.doc`, `.xls`, and `.ppt` explicitly unsupported in v1
