# Altira Resilience Private Preview Request Access Handoff

## Purpose

Use this guide when a public `Request access` submission turns into a real Altira Resilience preview invite.

The goal is to keep public lead capture separate from product sign-in while still making approved requests easy to stage inside `People`.

## Public Intake Source

- URL: `https://altiratech.com/products/resilience/#request-access`
- Delivery path: `POST /api/request-access` on the Altira company site worker
- Current inbox: `contact@altiratech.com`
- Expected email subject: `Resilience request access from <company> (<name>)`

## Fields Captured By The Public Form

The site intake currently captures:

- name
- work email
- company
- title
- company size
- industry
- primary use case
- product interest
- requested timeline
- problem statement
- source / referrer when available

## Decision Rule

- Keep the preview invite-only.
- Keep the preview intentionally single-workspace.
- Do not create separate customer workspaces on the current preview model.
- Approve only when the request fits the current curated cohort and timing.

## Handoff Steps

1. Review the structured request email in `contact@altiratech.com`.
2. Decide `approve`, `hold`, or `decline`.
3. If approved, open Altira Resilience and go to `People` -> `Access`.
4. Create a workspace invite using the requester's:
   - full name -> `fullName`
   - work email -> `email`
5. Choose the smallest access needed for the preview:
   - default to `user`
   - only grant `manager` scope or tabletop capability when there is an explicit reason
6. Link the invite to an existing roster member when one already exists. If not, stage the invite first and reconcile roster linkage later.
7. Send the invite through the current invite flow:
   - provider-backed email when configured
   - manual-copy fallback when delivery is unavailable

## What Not To Re-Enter

The public intake email is the richer source record for:

- company size
- industry
- primary use case
- requested timeline
- problem statement
- source / referrer

Do not force the operator to copy all of that into the product if the current invite workflow only needs access-specific fields.

## Current Bridge Rule

For this preview phase, the bridge is intentionally lightweight:

- the public site owns lead capture
- the structured request email preserves the richer context
- `People` owns the actual access invite

Only build a richer CRM or invite-ops layer if this manual handoff starts creating real operational drag.
