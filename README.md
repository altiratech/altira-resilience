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
  - team-based assignment from the launch UI so admins and scoped managers can assign an entire team in one action
  - participant-run identity snapshots so evidence stays stable even if the roster changes later
  - report and export outputs that now carry team/email context alongside the assigned participant
- A bounded workspace-user / role model now exists for:
  - persisted `workspace_users` aligned to the suite role model: `user`, `manager`, `admin`
  - a first product-specific capability flag layer underneath those roles, starting with `resilience_tabletop_facilitate`
  - role-filtered bootstrap payloads, navigation, and API access rules
  - a user-only `My Exercises` home surface tied to assigned runs
  - manager tabletop control only when the specific Resilience capability is present
  - explicit manager team scope, with manager views and evidence filtered to scoped teams instead of defaulting to workspace-wide review
  - real workspace-email sign-in with server-side session cookies mapped onto `workspace_users`
  - a non-production debug header fallback (`X-Resilience-User-Id`) retained only for tests and local role simulation
- A first real auth/session layer now exists for:
  - `GET /api/v1/auth/session`
  - `POST /api/v1/auth/sign-in`
  - `POST /api/v1/auth/sign-out`
  - cookie-backed session resolution before bootstrap and protected workflow access
  - a sign-in screen that replaces the old in-shell persona switcher
  - admin-managed workspace users and invite records that sit above roster assignment
  - admin-issued invite magic links with short-lived hashed-token activation for pending workspace invites
  - manual-copy send / resend flow for those invite links from `People`
  - direct deactivate / reactivate controls for workspace users in `People`
  - revoked invite reopen behavior when the invite email is still free and no other pending invite exists
  - backend guardrails that prevent self-deactivation, self-demotion out of admin, and leaving the workspace with zero active admins
- A first lightweight audit trail now exists for:
  - access changes across workspace users and invites
  - launch creation and launch-state updates
  - participant assignment creation and exercise submission
  - recent admin-visible activity in `Overview` and `People`
  - persisted audit events through D1 migration `0016_audit_events.sql`
- A first real evidence closeout workflow now exists for:
  - admin-authored closeout notes and follow-up actions on each launch-backed evidence package
  - explicit `closed` evidence state on top of the derived `in_review` / `ready` posture
  - export packages that now carry operator closeout notes alongside the deterministic after-action summary
  - admin-only final close / reopen control so scoped managers cannot close launch-wide evidence they only partially see
- A matching pre-launch draft review workflow now exists for:
  - reviewer notes on scenario drafts
  - explicit `changes_requested` state before launch
  - persisted reviewer identity and review timestamp on draft records
  - overview and exercises surfaces that now show blocked drafts separately from ready-for-review drafts
  - audit events for draft submission, approval, and change requests
- the admin workflow now reads/writes real records across Home, Source Library, Organization Context, Scenario Studio, Launches, Reports, and Settings
- the admin UX is now reorganized around the readiness operating model:
  - `Overview`
  - `Exercises`
  - `Evidence`
  - `People`
  - `Materials`
  - `Settings`
- the first-impression/admin UX pass is now materially cleaner:
  - sign-in now speaks in product/outcome language instead of auth-implementation language
  - `Exercises` sub-navigation now reads as `Program`, `Scenario Studio`, `Launches`
  - settings and materials surfaces no longer expose platform-stack details or raw object-storage jargon to first-time operators
  - participant home copy is now more action-oriented and less internally framed
- scaffold-stage bootstrap now filters validation and smoke-test source documents out of the admin preview payload so local product review is not polluted by ingestion-test artifacts
- the default admin landing view now leads with program signals instead of scaffold narration:
  - pending approvals
  - upcoming exercises
  - overdue assignments
  - evidence ready for review/export
  - coverage gaps by team
- Scenario Studio is now nested inside `Exercises` instead of defining the whole product identity
- reporting is now framed as `Evidence`, with stronger emphasis on after-action outputs, completion posture, and exportable proof
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
  - `npm run typecheck -w @resilience/api`
  - `npm run test -w @resilience/api`
  - `npm run typecheck -w @resilience/web`
  - `./node_modules/.bin/tsc --noEmit -p packages/shared/tsconfig.json`
  - `npm run build -w @resilience/web`
  - `npm run db:migrate:local -w @resilience/api`
- current validation note:
  - the direct API typecheck path now completes cleanly again in the repo validation loop
  - current API test baseline is `46/46`
- no shared suite auth provider, Google sign-in, enterprise SSO, provider-backed emailed invite delivery, or roster sync yet
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
- `docs/PRIVATE_PREVIEW_LAUNCH_CHECKLIST.md`

## Build Rule

Do not build product code in `Business Ideas/`.

Implementation work for this product should happen here:
- `Code/active/altira-resilience`

## Immediate Next Step

Move from local product completeness into private-preview readiness:
- keep the new draft-review and evidence-closeout controls as the governed operator loop
- keep the current workspace-user administration and invite queue as the local bridge model until shared Altira auth exists
- add provider-backed invite delivery and tighten the preview/demo workspace so outside testers can navigate without local context
- keep the visible suite roles simple: `user`, `manager`, `admin`
- later layer Google sign-in and enterprise SSO onto the same workspace membership model instead of replacing it
- tighten tenant-safe identity and access boundaries without rewriting evidence history
- keep the new membership-lifecycle guardrails simple and operator-owned while deciding whether manager scope should remain admin-managed only or gain a request/approval path
- keep the new audit trail lightweight and operator-readable instead of widening into a full workflow engine too early
- keep the new evidence closeout model launch-backed and admin-owned until real pilot workflows force per-team or delegated review semantics
- treat provider-backed emailed invites as a later layer on top of the current staged invite + magic-link records rather than a separate identity system
- keep the new manager team-scope model simple and operational, widening it only if real pilot workflows force more complexity
- add the next pre-launch review layer by giving scenario drafts explicit reviewer notes / request-changes handling instead of only `draft -> ready_for_review -> approved`
- preserve the `upload_ai` vs `queued_ai` provenance split while deeper workflow surfaces are added
- keep legacy `.doc`, `.xls`, and `.ppt` explicitly unsupported in v1
- use `docs/PRIVATE_PREVIEW_LAUNCH_CHECKLIST.md` as the go / no-go gate before opening `resilience.altiratech.com` as a real private-preview URL
