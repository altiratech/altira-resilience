# Altira Resilience Private Preview Launch Checklist

## Purpose

Use this checklist before launching `resilience.altiratech.com` as a real Altira app URL.

The goal is not a public launch. The goal is a controlled `Private Preview` that:
- gives us a real URL for browser-based testing
- lets selected testers sign in and use the app
- avoids avoidable security, data, and trust problems

## Target State

Desired posture for the first URL-based launch:
- domain: `resilience.altiratech.com`
- product label: `Private Preview`
- access model: invite-only or explicitly approved users
- audience: internal team plus a small number of trusted testers
- primary CTA on the public product page: `Request access`
- secondary CTA: `Sign in`

## Go / No-Go Rule

Do not open the preview URL until every item in the `Must Be True` section is satisfied.

If something is partially done but still brittle, treat it as not done.

## Must Be True

### 1. Product Experience

- The sign-in page clearly says `Private Preview`.
- The sign-in page explains what the product is in plain language, not internal build language.
- A first-time admin can understand where to start within 1-2 minutes.
- A first-time participant can open an assigned exercise and understand what to do without live narration.
- The preview workspace is curated and coherent:
  - no validation documents
  - no smoke-test artifacts
  - no duplicate junk records
  - no confusing placeholder content

### 2. Access And Identity

- Real sign-in works from the deployed URL.
- Invite flow works reliably for approved testers.
- `user`, `manager`, and `admin` boundaries are enforced in the deployed environment.
- Manager scope is enforced correctly in the deployed environment.
- The debug identity path is not usable as a public auth shortcut.
- Session cookies behave correctly on the real domain:
  - sign in
  - refresh
  - sign out
  - expired session handling

### 3. Security And Data Discipline

- Production and preview secrets are stored correctly and are not hardcoded.
- Demo/test data is intentionally separated from any real customer workspace data.
- Uploads, evidence, and access events remain auditable.
- No known path allows one user to see another workspace's restricted data.
- No known path allows a manager to act outside assigned scope.
- No known path allows a non-admin to close launch-wide evidence.

### 4. Environment And Operations

- The deployed environment has the required bindings and storage configured.
- The app can start, sign in, load bootstrap data, and complete core flows on the deployed URL.
- Errors fail clearly enough that a tester knows what happened.
- We have a named owner for preview support and bug triage.
- We have one clean rollback path if the preview deployment misbehaves.

### 5. Marketing And Data Capture

- Public lead capture stays separate from product access.
- `Request access` data is captured outside the app login flow.
- At minimum, the request-access process captures:
  - name
  - work email
  - company
  - title
  - company size
  - industry
  - primary use case
  - product interest
  - requested timeline
  - free-text problem statement
  - source / referrer when available
- There is a simple way to map approved leads into preview invites without re-entering everything manually.

### 6. Preview Rollout Discipline

- The preview is labeled as `Private Preview`, not public launch.
- Testers know this is a preview and where to send feedback.
- We have a short tester script for what we want people to try:
  - sign in
  - review materials
  - create or review an exercise
  - open an assigned run
  - review evidence
- We know who is allowed in the first cohort.

## Strongly Recommended Before Launch

- Provider-backed invite email delivery instead of manual link copy.
- A preview feedback form or lightweight issue intake flow.
- A clean analytics trail for:
  - request access
  - sign in
  - activation
  - exercise creation
  - evidence review
- A short operator walkthrough for internal demos.

## Explicitly Not Required For First Private Preview

- Public self-serve signup
- Stripe billing
- Enterprise SSO
- SCIM
- Broad external marketing push
- Public claim that the product is generally available

## First Launch Recommendation

When we are ready, the first release should be:

1. `resilience.altiratech.com`
2. `Private Preview` label on sign-in
3. invite-only access
4. clean demo workspace
5. public product page remains the discovery layer
6. `Request access` remains the main public CTA

## Decision Trigger

Revisit deployment only when this checklist can be reviewed item by item and honestly marked complete.
