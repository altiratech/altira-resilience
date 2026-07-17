# Current Status

Product: Altira Resilience private-preview surface.

Current state:
- The private preview is live at `https://resilience.ryanjameson.me` on the `altira-resilience-web` Pages project.
- The preview API is deployed at `https://altira-resilience-api-preview.rjameson.workers.dev` with the personal host as `APP_BASE_URL` and an explicit personal-host CORS allowlist.
- Remote D1 migrations `0021`–`0023` are applied; the demo workspace loads through the personal host after workspace-email sign-in.
- Invite delivery is intentionally `manual_copy` until a verified Resend sender and secret are configured; workspace-email sign-in remains the available demo path.
- `resilience.altiratech.com` remains inactive and is not advertised.
- The Pages URL remains a functional fallback while the personal custom domain is the canonical preview link.

Working bias:
- Treat cutover as an operational launch task, not a product redesign task.
