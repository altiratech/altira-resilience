#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
LIFEHUB_ROOT="${LIFEHUB_ROOT:-$(cd "${APP_ROOT}/../../.." && pwd)}"
SITE_ROOT="${SITE_ROOT:-${LIFEHUB_ROOT}/Code/active/altiratech-site}"
APP_API_ROOT="${APP_ROOT}/apps/api"
WRANGLER_BIN="${WRANGLER_BIN:-${APP_ROOT}/node_modules/.bin/wrangler}"

CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-73e262c2b93b216f461c51bd1945fee4}"
CLOUDFLARE_ZONE_ID="${CLOUDFLARE_ZONE_ID:-285d9491aa8c6d686cccd189513b0d43}"
PAGES_PROJECT="${PAGES_PROJECT:-altira-resilience-web}"
RESILIENCE_DOMAIN="${RESILIENCE_DOMAIN:-resilience.altiratech.com}"
PAGES_TARGET="${PAGES_TARGET:-altira-resilience-web.pages.dev}"
APP_BASE_URL="${APP_BASE_URL:-https://${RESILIENCE_DOMAIN}}"
INVITE_EMAIL_FROM="${INVITE_EMAIL_FROM:-Altira <contact@altiratech.com>}"
INVITE_EMAIL_REPLY_TO="${INVITE_EMAIL_REPLY_TO:-contact@altiratech.com}"

log() {
  printf '\n== %s ==\n' "$1"
}

require_env() {
  local key
  for key in "$@"; do
    if [[ -z "${!key:-}" ]]; then
      printf 'Missing required environment variable: %s\n' "$key" >&2
      exit 1
    fi
  done
}

require_command() {
  local cmd
  for cmd in "$@"; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      printf 'Missing required command: %s\n' "$cmd" >&2
      exit 1
    fi
  done
}

cf_api() {
  local method="$1"
  local url="$2"
  local payload="${3:-}"

  if [[ -n "$payload" ]]; then
    curl -sS -X "$method" \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
      -H "Content-Type: application/json" \
      --data "$payload" \
      "$url"
  else
    curl -sS -X "$method" \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
      "$url"
  fi
}

ensure_pages_domain() {
  log "Ensure Pages Custom Domain"

  local list_url="https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${PAGES_PROJECT}/domains"
  local detail_url="https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${PAGES_PROJECT}/domains/${RESILIENCE_DOMAIN}"
  local domains_response
  domains_response="$(cf_api GET "$list_url")"

  if ! jq -e '.success == true' >/dev/null <<<"$domains_response"; then
    jq '{success, errors, messages}' <<<"$domains_response" >&2
    exit 1
  fi

  if ! jq -e --arg domain "$RESILIENCE_DOMAIN" '.result[] | select(.name == $domain)' >/dev/null <<<"$domains_response"; then
    local create_response
    create_response="$(cf_api POST "$list_url" "$(jq -nc --arg name "$RESILIENCE_DOMAIN" '{name: $name}')")"
    if ! jq -e '.success == true' >/dev/null <<<"$create_response"; then
      jq '{success, errors, messages}' <<<"$create_response" >&2
      exit 1
    fi
  fi

  cf_api GET "$detail_url" | jq '{name: .result.name, status: .result.status, verification_status: .result.verification_data.status}'
}

upsert_dns_cname() {
  log "Ensure DNS Record"

  local list_url="https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records?type=CNAME&name=${RESILIENCE_DOMAIN}"
  local existing_response
  existing_response="$(cf_api GET "$list_url")"

  if ! jq -e '.success == true' >/dev/null <<<"$existing_response"; then
    jq '{success, errors, messages}' <<<"$existing_response" >&2
    exit 1
  fi

  local record_id
  record_id="$(jq -r '.result[0].id // empty' <<<"$existing_response")"

  if [[ -n "$record_id" ]]; then
    local current_content
    current_content="$(jq -r '.result[0].content' <<<"$existing_response")"
    if [[ "$current_content" == "$PAGES_TARGET" ]]; then
      jq '{name: .result[0].name, content: .result[0].content, proxied: .result[0].proxied}' <<<"$existing_response"
      return
    fi

    local patch_payload
    patch_payload="$(jq -nc --arg name "$RESILIENCE_DOMAIN" --arg content "$PAGES_TARGET" '{type: "CNAME", name: $name, content: $content, proxied: true}')"
    local patch_response
    patch_response="$(cf_api PATCH "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${record_id}" "$patch_payload")"
    if ! jq -e '.success == true' >/dev/null <<<"$patch_response"; then
      jq '{success, errors, messages}' <<<"$patch_response" >&2
      exit 1
    fi
    jq '{name: .result.name, content: .result.content, proxied: .result.proxied}' <<<"$patch_response"
    return
  fi

  local create_payload
  create_payload="$(jq -nc --arg name "$RESILIENCE_DOMAIN" --arg content "$PAGES_TARGET" '{type: "CNAME", name: $name, content: $content, proxied: true}')"
  local create_response
  create_response="$(cf_api POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records" "$create_payload")"
  if ! jq -e '.success == true' >/dev/null <<<"$create_response"; then
    jq '{success, errors, messages}' <<<"$create_response" >&2
    exit 1
  fi
  jq '{name: .result.name, content: .result.content, proxied: .result.proxied}' <<<"$create_response"
}

wait_for_pages_domain() {
  log "Wait For Domain Activation"

  local detail_url="https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${PAGES_PROJECT}/domains/${RESILIENCE_DOMAIN}"
  local attempt
  for attempt in $(seq 1 24); do
    local response
    response="$(cf_api GET "$detail_url")"
    local status
    status="$(jq -r '.result.status // "unknown"' <<<"$response")"
    local verification
    verification="$(jq -r '.result.verification_data.status // "unknown"' <<<"$response")"

    printf 'Attempt %s: status=%s verification=%s\n' "$attempt" "$status" "$verification"

    if [[ "$status" == "active" ]]; then
      curl -fsSI "https://${RESILIENCE_DOMAIN}" >/dev/null
      return
    fi

    sleep 5
  done

  printf 'Custom domain did not become active in time. Check the Cloudflare Pages domain panel for %s.\n' "$RESILIENCE_DOMAIN" >&2
  exit 1
}

deploy_preview_api() {
  log "Deploy Preview API"

  printf '%s' "$RESEND_API_KEY" | "$WRANGLER_BIN" --cwd "$APP_API_ROOT" secret put RESEND_API_KEY --env preview
  printf '%s' "$INVITE_EMAIL_FROM" | "$WRANGLER_BIN" --cwd "$APP_API_ROOT" secret put INVITE_EMAIL_FROM --env preview
  printf '%s' "$INVITE_EMAIL_REPLY_TO" | "$WRANGLER_BIN" --cwd "$APP_API_ROOT" secret put INVITE_EMAIL_REPLY_TO --env preview

  "$WRANGLER_BIN" --cwd "$APP_API_ROOT" deploy \
    --env preview \
    --keep-vars \
    --var "APP_BASE_URL:${APP_BASE_URL}" \
    --message "Finalize Resilience preview cutover"
}

deploy_public_site() {
  log "Deploy Public Site"

  "$WRANGLER_BIN" --cwd "$SITE_ROOT" deploy --message "Publish Resilience request access cutover"
}

verify_live_state() {
  log "Verify Live State"

  curl -fsS "https://altira-resilience-api-preview.rjameson.workers.dev/health" | jq .
  curl -fsSI "https://${RESILIENCE_DOMAIN}" | sed -n '1,5p'
  curl -fsSL "https://altiratech.com/products/resilience/" | rg -n "Request Access|resilience.altiratech.com|Sign In"
}

main() {
  require_command curl jq rg sed sleep
  require_env CLOUDFLARE_API_TOKEN RESEND_API_KEY

  if [[ ! -x "$WRANGLER_BIN" ]]; then
    printf 'Wrangler binary not found at %s\n' "$WRANGLER_BIN" >&2
    exit 1
  fi

  if [[ ! -d "$SITE_ROOT" ]]; then
    printf 'Site repo not found at %s\n' "$SITE_ROOT" >&2
    exit 1
  fi

  ensure_pages_domain
  upsert_dns_cname
  wait_for_pages_domain
  deploy_preview_api
  deploy_public_site
  verify_live_state

  log "Done"
  printf 'Resilience preview cutover completed for %s\n' "$RESILIENCE_DOMAIN"
}

main "$@"
