import type { WorkspaceInvite, WorkspaceInviteMagicLinkResult } from '@resilience/shared';

export type InviteDeliveryBindings = {
  APP_BASE_URL?: string;
  APP_NAME?: string;
  INVITE_EMAIL_PROVIDER?: string;
  INVITE_EMAIL_FROM?: string;
  INVITE_EMAIL_REPLY_TO?: string;
  RESEND_API_KEY?: string;
};

type InviteDeliveryParams = {
  env: InviteDeliveryBindings | undefined;
  invite: WorkspaceInvite;
  token: string;
  expiresAt: string;
  requestUrl: string;
};

export async function deliverWorkspaceInviteEmail(
  params: InviteDeliveryParams,
): Promise<Omit<WorkspaceInviteMagicLinkResult, 'workspaceInvite' | 'magicLinkPath' | 'expiresAt'>> {
  const magicLinkPath = buildInviteMagicLinkPath(params.token);
  const magicLinkUrl = buildInviteMagicLinkUrl(params.env, params.requestUrl, magicLinkPath);
  const provider = normalizeInviteProvider(params.env?.INVITE_EMAIL_PROVIDER);

  if (provider === 'resend' && params.env?.RESEND_API_KEY && params.env?.INVITE_EMAIL_FROM) {
    try {
      await sendViaResend({
        apiKey: params.env.RESEND_API_KEY,
        from: params.env.INVITE_EMAIL_FROM,
        replyTo: params.env.INVITE_EMAIL_REPLY_TO ?? null,
        to: params.invite.email,
        subject: `Your Altira Resilience private preview invite`,
        html: buildInviteEmailHtml(params.invite, magicLinkUrl, params.expiresAt, params.env?.APP_NAME ?? 'Altira Resilience'),
        text: buildInviteEmailText(params.invite, magicLinkUrl, params.expiresAt, params.env?.APP_NAME ?? 'Altira Resilience'),
      });

      return {
        deliveryMode: 'provider_email',
        deliveryProvider: 'resend',
        deliverySummary: `Invite email sent to ${params.invite.email} through Resend.`,
        deliveryWarning: null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invite email delivery failed.';
      return {
        deliveryMode: 'manual_copy',
        deliveryProvider: 'manual_copy',
        deliverySummary: 'Copy and send this time-limited invite link manually.',
        deliveryWarning: `Resend delivery was unavailable, so the backup link is shown here instead. ${message}`,
      };
    }
  }

  return {
    deliveryMode: 'manual_copy',
    deliveryProvider: 'manual_copy',
    deliverySummary: 'Copy and send this time-limited invite link manually.',
    deliveryWarning: null,
  };
}

export function buildInviteMagicLinkPath(token: string): string {
  return `/?magic_link_token=${encodeURIComponent(token)}`;
}

function normalizeInviteProvider(value: string | undefined): 'manual_copy' | 'resend' {
  return value?.trim().toLowerCase() === 'resend' ? 'resend' : 'manual_copy';
}

function buildInviteMagicLinkUrl(
  env: InviteDeliveryBindings | undefined,
  requestUrl: string,
  path: string,
): string {
  const baseUrl = env?.APP_BASE_URL?.trim() || new URL(requestUrl).origin;
  return new URL(path, baseUrl).toString();
}

async function sendViaResend(input: {
  apiKey: string;
  from: string;
  replyTo: string | null;
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${input.apiKey}`,
    },
    body: JSON.stringify({
      from: input.from,
      to: [input.to],
      reply_to: input.replyTo ? [input.replyTo] : undefined,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? `Invite email delivery returned HTTP ${response.status}.`);
  }
}

function buildInviteEmailHtml(
  invite: WorkspaceInvite,
  magicLinkUrl: string,
  expiresAt: string,
  appName: string,
): string {
  const safeName = escapeHtml(invite.fullName);
  const safeUrl = escapeHtml(magicLinkUrl);
  const safeAppName = escapeHtml(appName);
  const safeExpiry = escapeHtml(formatExpiry(expiresAt));

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <p>Hello ${safeName},</p>
      <p>You have been invited to ${safeAppName} Private Preview.</p>
      <p>Use the secure link below to activate your workspace access:</p>
      <p><a href="${safeUrl}" style="display: inline-block; padding: 12px 18px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 6px;">Open Altira Resilience</a></p>
      <p>This link expires ${safeExpiry}.</p>
      <p>If the button does not open, copy this link into your browser:</p>
      <p>${safeUrl}</p>
    </div>
  `.trim();
}

function buildInviteEmailText(
  invite: WorkspaceInvite,
  magicLinkUrl: string,
  expiresAt: string,
  appName: string,
): string {
  return [
    `Hello ${invite.fullName},`,
    '',
    `You have been invited to ${appName} Private Preview.`,
    'Use the secure link below to activate your workspace access:',
    magicLinkUrl,
    '',
    `This link expires ${formatExpiry(expiresAt)}.`,
  ].join('\n');
}

function formatExpiry(expiresAt: string): string {
  return new Date(expiresAt).toUTCString();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
