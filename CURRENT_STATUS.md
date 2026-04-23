# Current Status

Product: Altira Resilience private-preview surface.

Current state:
- The outward-facing cutover is still incomplete. `resilience.altiratech.com` does not resolve yet.
- The working preview remains the Pages deployment, and the public site should continue pointing there until branded-domain activation is verified.
- `scripts/finish_preview_cutover.sh` exists to complete the domain, DNS, sender, and deploy sequence once real Cloudflare and Resend credentials are available.

Working bias:
- Treat cutover as an operational launch task, not a product redesign task.
