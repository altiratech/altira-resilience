# Altira Resilience

Altira Resilience turns continuity policies, cyber-response plans, and operational procedures into rehearsable exercises with after-action evidence.

It is a separate Altira product from Flashpoint / ESCALATION. Flashpoint is a strategic scenario simulation product; Resilience is an operating surface for business continuity, cybersecurity training, compliance procedure rehearsal, tabletop facilitation, and evidence closeout.

## Status

Active private-preview product build.

The current implementation includes:
- React + Vite web app
- Cloudflare Worker API
- shared TypeScript contracts
- D1-backed persistence for source library records, organization context, scenario drafts, launches, participant runs, users, invites, and audit events
- document upload, extraction review, and bounded OCR/AI fallback paths for supported file types
- admin surfaces for Overview, Exercises, Evidence, People, Materials, and Settings
- participant exercise workspace for assigned runs
- facilitator tabletop console for launch-level control
- exportable evidence packages with deterministic after-action summaries and operator closeout notes

Current deployment note:
- The working staged preview is the Cloudflare Pages deployment.
- The branded `resilience.altiratech.com` cutover is not complete yet.
- Treat custom-domain activation, sender setup, and preview cutover as operational launch work rather than product redesign.

## Product Boundary

Resilience is built for readiness operations:
- source materials and context are reviewed before they become approved organization context
- exercise drafts require approval before launch
- participant runs and tabletop sessions produce reviewable evidence
- evidence packages preserve operator notes, follow-up actions, and closeout state
- access is role and capability aware, but shared Altira suite auth is still a later layer

It does not replace legal, compliance, incident-response, or security advice. It helps teams rehearse, document, review, and improve readiness workflows.

## Quick Start

```bash
git clone https://github.com/altiratech/altira-resilience.git
cd altira-resilience
npm install
```

Run the API and web app in separate terminals:

```bash
npm run dev:api
```

```bash
npm run dev:web
```

Useful checks:

```bash
npm run typecheck
npm run test
npm run build
```

Local D1 migration helper:

```bash
npm run db:migrate:local -w @resilience/api
```

## Repo Shape

```text
apps/api/        Cloudflare Worker API and D1 persistence
apps/web/        React/Vite private-preview web app
packages/shared/ Shared TypeScript contracts
docs/            Product, launch, support, and AI/document-boundary notes
scripts/         Operational helpers for preview cutover and validation
```

## Supported Source Files

The source library currently supports text upload plus selected binary formats, including:
- PDF
- DOCX
- XLSX
- PPTX
- PNG, JPG, JPEG, and WEBP

Legacy `.doc`, `.xls`, and `.ppt` files are intentionally unsupported in v1.

## Validation Notes

Recent local validation has covered:
- API typecheck and tests
- web typecheck and build
- shared package typecheck
- local D1 migration path where the host environment permits SQLite writes
- real text PDF, scanned PDF, and image-derived extraction paths

The staged preview remains the source of truth for cutover review until the branded domain is active.

## License

No open-source license has been selected yet. Public source visibility does not grant reuse rights until a license file is added.
