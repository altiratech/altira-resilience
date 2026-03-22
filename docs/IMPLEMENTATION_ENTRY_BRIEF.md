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

- shared suite auth provider / Google / SSO approach
- real multi-workspace identity and access boundaries beyond the intentional single-workspace private preview
- broader scoring / scenario logic beyond the first deterministic checkpoints

These are the next implementation choices after the architecture lock.

Current preview lock:

- keep Altira Resilience intentionally single-workspace for the curated private preview period
- do not widen into true workspace scoping until after this preview period or before broader customer rollout

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
25. a bounded `workspace_users` model now exists with suite-compatible roles: `user`, `manager`, and `admin`
26. product-specific powers now sit under that simple role model as capability flags, starting with `resilience_tabletop_facilitate`
27. bootstrap, navigation, and API access now filter by the current workspace user instead of assuming one global admin operator
28. `user` members now land in a dedicated `My Exercises` surface and can only read/update runs tied to their `rosterMemberId`
29. `manager` members can review launches and evidence, while tabletop launch status / phase / notes remain limited to admins or managers with the tabletop capability
30. workspace-email sign-in now creates a real server session cookie and maps into the current `workspace_users` model
31. a non-production debug header fallback (`X-Resilience-User-Id`) is still retained for tests and local role simulation, but it is no longer the main web auth path
32. admins can now create and update workspace users directly from the `People` surface without dropping back to mock identity controls
33. admins can now stage pending workspace invites, revoke unused invites, issue or resend short-lived magic links, and let invited people become real workspace users only when that invite link is consumed
34. managers now operate with explicit team scope instead of broad default workspace review, and their launch, evidence, roster, and assignment views are filtered to those scoped teams
35. launch operations now support team-based assignment, so admins and scoped managers can assign an entire team in one action instead of only adding people one by one
36. the admin UX is now organized around the readiness operating model instead of the tool inventory:
   - `Overview`
   - `Exercises`
   - `Evidence`
   - `People`
   - `Materials`
   - `Settings`
37. the new Overview surface now leads with program health, pending approvals, overdue assignments, upcoming exercises, evidence readiness, and coverage gaps
38. Scenario Studio now lives inside `Exercises` as a guided creation stage, not as the product's primary identity
39. reporting is now framed as `Evidence` so after-actions, exports, and proof of completion read like a first-class product pillar
40. workspace access now supports direct membership-lifecycle actions: admins can deactivate/reactivate users, reopen revoked invites, and rely on backend guardrails that prevent removing the last active admin or deactivating/demoting the admin tied to the current session
41. a first persisted audit-event layer now records access changes, launch changes, assignment creation, and participant submission, and surfaces recent admin-visible activity in `Overview` and `People`
42. evidence packages now support admin-authored closeout notes, operator follow-up actions, and explicit `closed` state on top of the existing derived after-action and export flow
43. the first-impression UX pass now removes most internal scaffold/platform language from sign-in, materials, and settings, and tightens `Exercises` sub-navigation to `Program`, `Scenario Studio`, and `Launches`
44. local preview bootstrap now filters validation and smoke-test source documents out of the admin preview payload so product review stays coherent
45. scenario drafts now support reviewer notes, a real `changes_requested` path, persisted review metadata, and audit events for submission/approval/rework actions
46. the program overview and exercises pipeline now show review-ready drafts separately from drafts blocked for changes
47. preview hardening now requires an explicit local-only flag before debug auth shortcuts or demo-account switching appear, instead of enabling them for every non-production stage
48. API CORS now falls back to loopback-only origins in local development and expects explicit allowlisting for any deployed preview origin
49. the sign-in and invite surfaces now speak as a `Private Preview`, and the seeded demo workspace now uses aligned participant counts, distinct invite identity, and resolved document-review states
50. admin invite delivery now supports provider-backed email through Resend when preview email settings are configured, while preserving manual-copy fallback as the safe bridge path
51. invite-send responses and the `People` UI now expose delivery metadata so operators can tell whether an email was sent or whether they still need to share a backup link manually
52. the web client now supports a build-time API origin through `VITE_API_URL`, so deployed preview can target an explicit API host instead of assuming same-origin `/api`
53. preview/prod session cookies now switch to `SameSite=None` outside local development so a real web origin and API origin can share authenticated browser sessions cleanly
54. `apps/api/wrangler.toml` now carries a concrete `preview` env block for `APP_STAGE`, `APP_BASE_URL`, `APP_ALLOWED_ORIGINS`, and `INVITE_EMAIL_PROVIDER`
55. the first Cloudflare-managed preview pair is now live on `https://altira-resilience-web.pages.dev` with API `https://altira-resilience-api-preview.rjameson.workers.dev`
56. deployed preview validation now covers real sign-in, authenticated Overview load, and sign-out in the browser instead of only local Vite review
57. staged preview auth now routes browser `/api/*` traffic through Cloudflare Pages Functions in `apps/web/functions`, so session cookies stay first-party on `pages.dev` instead of depending on a cross-site `workers.dev` cookie path
58. the first staged-preview product review now sets the next product-depth order explicitly: make `Evidence` and the preview workspace tell a believable operational story first, then deepen `Scenario Studio`, then deepen launches/runtime behavior
59. launches can now be renamed after creation, which matters because recurring exercises will often reuse the same approved draft but still need distinct run names for review, evidence, and after-action work
60. the seeded workspace story now includes one active individual exercise, one upcoming tabletop, and one closed evidence package so `Overview`, `Exercises`, and `Evidence` do not open as mostly empty shells
61. Scenario Studio now persists the operator-authored trigger event, scenario scope, and evidence focus for each draft instead of relying mainly on title/objective text
62. Scenario Studio now stores the approved materials and confirmed context inputs selected for each exercise draft, so authoring decisions remain reviewable and stable after save
63. the studio configuration surface now shows readiness counts, a structured exercise outline, and a launch-package summary while the draft is being authored
64. launch queue rows now show runtime posture, submission coverage, evidence posture, and open follow-up load instead of acting mostly like record listings
65. launch detail now opens with exercise-package posture, evidence posture, immediate actions, and direct links into facilitator control or the matching evidence package
66. tabletop control now shows session posture and immediate operational actions, tying facilitator workflow back into the same evidence package used for closeout/export
67. participant run detail now shows launch/program posture so individual exercise work is visibly part of the broader readiness loop rather than an isolated worksheet
68. `People` now treats participant directory and workspace access as one readiness-operations surface instead of separate admin islands
69. roster rows now show direct access posture, admins can jump from a roster member into workspace access, and access management now surfaces team coverage, pending activation, and roster-linked access gaps by default
70. roster, workspace-user, and pending-invite email identity now normalize consistently during create/update flows instead of depending on caller casing
71. accepting a pending invite now reconciles an existing active workspace user to the staged role, scope, capability, and roster link instead of silently keeping stale access
72. `People` no longer treats active email-matched workspace access as a false coverage gap; those records now show up as explicit link follow-up instead
73. `Settings` now acts as a bounded preview-control surface instead of a generic admin dump:
   - preview posture, rollout guardrails, and control-surface boundaries live there
   - day-to-day access, materials, launch, and evidence operations stay in their primary workflow tabs
74. preview support readiness now has a concrete operator path:
   - owner: `Ryan Jameson`
   - inbox: `contact@altiratech.com`
   - intake/triage guide: `docs/PRIVATE_PREVIEW_SUPPORT_PLAYBOOK.md`

Runtime split now fixed:
- individual exercise runs remain participant-owned and deterministically scored
- tabletop launch state remains operator-owned at the launch level, typically an admin or a manager with the tabletop capability

Why:
- it proves the product is becoming real
- it exercises the admin workflow first
- it keeps auth, ingestion, and deeper scenario logic deferred until the object model is stable

## Screenshot-Driven Priority Order

The first staged-preview product review changed the next build priorities.

What the screenshots showed:

- the shell and navigation are now strong enough to carry the product
- `Overview` and `Materials` feel substantially more real than the other surfaces
- `Exercises` has the right shape, but still needs deeper working content
- `Evidence` was too empty before the deeper review pass, and `Settings` needed a clearer owner/job instead of filler
- the next wins should come from making the default workspace tell a believable readiness-program story, not from another shell redesign

Prioritized next build order:

1. keep `Settings` bounded as a preview-control surface:
   - let it own rollout posture, guardrails, and control-surface boundaries
   - keep day-to-day operator work in the other tabs
2. keep preview workspace coherence across `Overview`, `Exercises`, `Evidence`, and `People`
   - maintain one active exercise, one upcoming launch, and one completed/closed package so the product keeps reading like a live program instead of an empty console
3. keep preview support intentionally lightweight:
   - use the named owner + email inbox + simple intake checklist now
   - defer richer ticketing or support workflow until real preview volume proves the need

## Immediate Next Build Block

1. `Evidence` is now materially deeper and should be treated as good enough for this pass:
   - queue rows now show posture, participant coverage, and follow-up load
   - detail now opens with review posture, immediate actions, closeout state, and export readiness
2. treat the newly deeper `Scenario Studio` as complete enough for this pass and resist reopening the shell or IA again right now
3. keep the staged preview workspace proving the product by default:
   - one active exercise
   - one upcoming launch
   - one evidence package in review
   - one closed evidence package
4. treat `People` as materially deeper for this pass:
   - roster and workspace access now read as one connected operator workflow
   - access coverage, pending activation, and roster-linked cleanup now show up directly in the product
5. treat the identity-integrity pass as done for now:
   - email identity is now normalized consistently across roster members, workspace users, and pending invites
   - pending invite acceptance now reconciles existing active users instead of silently preserving stale access
   - `People` now distinguishes true gaps from email-matched link follow-up
6. keep the current preview intentionally single-workspace for this curated period:
   - do not create separate customer workspaces on the current preview data model
   - revisit true workspace scoping only after this preview period or before broader rollout
7. keep `Settings` bounded to preview posture, rollout rules, and control-surface boundaries instead of letting it absorb daily operational tasks
8. keep the current workspace-user admin, invite flow, and manager team-scope model as the bridge layer until shared Altira auth exists
9. keep provider-backed invite delivery on top of the existing magic-link bridge, but treat preview sender config as deployment work rather than the main product task
10. keep the new audit trail lightweight and operator-readable rather than widening it into a full approval engine too early
11. keep the provider/versioning/provenance boundary in `docs/AI_DOCUMENT_BOUNDARY.md` as the rule for future ingestion work
12. keep legacy `.doc`, `.xls`, and `.ppt` explicitly unsupported in v1 rather than widening ingestion scope
13. keep extraction review-gated so uploaded materials still require operator approval before they change context
14. keep visible roles simple as `user`, `manager`, and `admin`, adding product-specific capability flags only when needed
15. keep the current workspace-email sign-in for active users plus invite-based magic-link activation for pending invites as the bridge until shared Altira auth exists, then layer Google / SSO onto the same model
16. preserve the new buyer-facing readiness-OS IA rather than drifting back toward implementation-shaped navigation
17. keep deployed preview access on explicit origins only, with debug auth shortcuts disabled unless a local-only flag is intentionally turned on
18. keep the current Pages + Workers staged-preview pair stable while product-depth work continues, and bind `resilience.altiratech.com` only after the preview checklist is honestly complete

## Canonical Inputs

- `Business Ideas/Altira-Resilience/Product-Definition.md`
- `Business Ideas/Altira-Resilience/ICP-and-Messaging.md`
- `Business Ideas/Altira-Resilience/Scenario-Studio-v1-PRD.md`
- `Business Ideas/Altira-Resilience/Scenario-Studio-v1-Wireframe-Brief.md`
- `Business Ideas/Altira-Resilience/Scenario-Studio-v1-Clickable-Prototype-Brief.md`
- `docs/PRIVATE_PREVIEW_LAUNCH_CHECKLIST.md`
