# Altira Resilience - Implementation Entry Brief

## Purpose

This brief exists so the repo can be opened and understood quickly at the start of implementation.

## What Is Fixed

- Product name: `Altira Resilience`
- Product boundary: separate sibling Altira product, not Altira Flashpoint
- Initial wedge: mid-market regulated financial firms
- Architecture shape:
  - `apps/web` = React + Vite
  - `apps/api` = Cloudflare Worker API
  - `packages/shared` = shared TypeScript contracts
  - intended v1 data stores = D1 + R2
- v1 core workflow:
  - Source Library
  - Organization Context Review
  - Scenario Studio
  - Approval before launch
  - Individual exercise mode
  - Facilitator-led tabletop mode
  - Reporting and evidence export

## What Is Not Fixed Yet

- external auth / SSO approach
- tenant-safe identity and access boundaries across admin, facilitator, manager, and participant surfaces
- broader scoring / scenario logic beyond the first deterministic checkpoints

These are the next implementation choices after the architecture lock.

## Recommended First Runnable Slice

The current implemented foundation is:

1. admin shell
2. home dashboard with launch/report preview
3. persisted source library records
4. persisted organization context review and edit flow
5. scenario template selection screen
6. persisted scenario draft configuration with approval state
7. source upload with inline text fallback plus optional R2-backed binary storage
8. inline extracted-text handling for supported PDF / DOCX / XLSX / PPTX uploads plus a manual backfill action for stored R2 files
9. explicit launch creation from approved drafts
10. manual participant assignment and bounded exercise surface
11. facilitator tabletop console with launch-level phase, status, and note controls
12. first report-detail, after-action summary, and evidence-export surface
13. launches / reports / settings admin surfaces
14. Cloudflare R2-backed binary document storage with real production and preview buckets
15. queue-backed follow-up extraction jobs for unreadable stored documents, surfaced in Source Library detail
16. Workers AI markdown/OCR fallback inside the queued extraction path for scanned PDFs, image uploads, and selected stored document types
17. provider-specific scanned-PDF vision fallback provenance (`workers_ai_vision`) so the product can distinguish markdown conversion from page-image OCR attempts
18. extraction provenance stored on both the extracted text artifact and the latest extraction attempt so provider/method/version stay visible and rerunnable
19. description-like AI output is now blocked from becoming reviewable extracted text, so image-caption output lands in manual attention instead of generating garbage suggestions
20. bounded upload-time AI extraction now attempts scanned-PDF/document recovery before the queue path is used
21. AI extraction provenance now distinguishes `upload_ai` from `queued_ai`
22. queue follow-up now surfaces an honest environment/storage note when local preview cannot read stored bytes from R2
23. a persisted roster directory now exists for participant assignment, with roster-backed launch assignment in the admin UI
24. participant runs now snapshot roster identity fields (name, email, role, team) so later directory changes do not silently rewrite evidence records
25. a bounded `workspace_users` model now exists with `admin`, `facilitator`, `manager`, and `participant` roles
26. bootstrap, navigation, and API access now filter by the current workspace-user role instead of assuming one global admin operator
27. participant users now land in a dedicated `My Exercises` surface and can only read/update runs tied to their `rosterMemberId`
28. facilitator users can control tabletop launch status / phase / notes without gaining broader admin write access
29. preview persona switching now exists through local storage + `X-Resilience-User-Id` so role boundaries can be tested before external auth exists

Runtime split now fixed:
- individual exercise runs remain participant-owned and deterministically scored
- tabletop launch state remains facilitator-owned at the launch level

Why:
- it proves the product is becoming real
- it exercises the admin workflow first
- it keeps auth, ingestion, and deeper scenario logic deferred until the object model is stable

## Immediate Next Build Block

1. add external auth / SSO on top of the now-stable `workspace_users` operator model
2. keep the provider/versioning/provenance boundary in `docs/AI_DOCUMENT_BOUNDARY.md` as the rule for future ingestion work
3. keep legacy `.doc`, `.xls`, and `.ppt` explicitly unsupported in v1 rather than widening ingestion scope
4. keep extraction review-gated so uploaded materials still require operator approval before they change context
5. continue moving from preview-grade identity into pilot-ready tenant and persona boundaries

## Canonical Inputs

- `Business Ideas/Altira-Resilience/Product-Definition.md`
- `Business Ideas/Altira-Resilience/ICP-and-Messaging.md`
- `Business Ideas/Altira-Resilience/Scenario-Studio-v1-PRD.md`
- `Business Ideas/Altira-Resilience/Scenario-Studio-v1-Wireframe-Brief.md`
- `Business Ideas/Altira-Resilience/Scenario-Studio-v1-Clickable-Prototype-Brief.md`
