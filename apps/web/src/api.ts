import type {
  AuthSessionState,
  BootstrapPayload,
  ContextItem,
  ContextItemInput,
  ContextItemPatch,
  DocumentSummary,
  Launch,
  LaunchDetail,
  LaunchInput,
  LaunchPatch,
  ParticipantRun,
  ParticipantRunDetail,
  ParticipantRunInput,
  ParticipantRunPatch,
  ParticipantRunTeamAssignmentInput,
  ParticipantRunTeamAssignmentResult,
  ReportDetail,
  ReportExportFile,
  ReportExportFormat,
  ReportReviewUpdateInput,
  RosterMember,
  RosterMemberInput,
  RosterMemberPatch,
  ScenarioDraft,
  ScenarioDraftInput,
  ScenarioDraftPatch,
  SourceDocumentDetail,
  SourceDocumentInput,
  SourceDocumentPatch,
  SourceExtractionSuggestion,
  SuggestionStatus,
  WorkspaceInvite,
  WorkspaceInviteInput,
  WorkspaceInviteMagicLinkResult,
  WorkspaceInvitePatch,
  WorkspaceUser,
  WorkspaceUserInput,
  WorkspaceUserPatch,
} from '@resilience/shared';

// Empty string in local dev so Vite proxying can stay simple.
// Explicit full origin in preview/prod so the browser never guesses.
const API_BASE = import.meta.env.VITE_API_URL?.trim() ?? '';

export async function getBootstrap(): Promise<BootstrapPayload> {
  return requestJson<BootstrapPayload>('/api/v1/bootstrap');
}

export async function getAuthSessionState(): Promise<AuthSessionState> {
  return requestJson<AuthSessionState>('/api/v1/auth/session');
}

export async function signInWithWorkspaceEmail(email: string): Promise<AuthSessionState> {
  return requestJson<AuthSessionState>('/api/v1/auth/sign-in', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function consumeInviteMagicLink(token: string): Promise<AuthSessionState> {
  return requestJson<AuthSessionState>('/api/v1/auth/magic-link/consume', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export async function signOutCurrentSession(): Promise<AuthSessionState> {
  return requestJson<AuthSessionState>('/api/v1/auth/sign-out', {
    method: 'POST',
  });
}

export async function getSourceDocument(documentId: string): Promise<SourceDocumentDetail> {
  const payload = await requestJson<{ document: SourceDocumentDetail }>(`/api/v1/source-documents/${documentId}`);
  return payload.document;
}

export async function createSourceDocument(input: SourceDocumentInput): Promise<DocumentSummary> {
  const payload = await requestJson<{ document: DocumentSummary }>('/api/v1/source-documents', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return payload.document;
}

export async function uploadSourceDocument(formData: FormData): Promise<SourceDocumentDetail> {
  const response = await fetch(api('/api/v1/source-documents/upload'), {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    throw await buildRequestError(response);
  }

  const payload = (await response.json()) as { document: SourceDocumentDetail };
  return payload.document;
}

export async function extractSourceDocument(documentId: string): Promise<SourceDocumentDetail> {
  const payload = await requestJson<{ document: SourceDocumentDetail }>(
    `/api/v1/source-documents/${documentId}/extract`,
    {
      method: 'POST',
    },
  );
  return payload.document;
}

export async function queueSourceDocumentExtraction(documentId: string): Promise<SourceDocumentDetail> {
  const payload = await requestJson<{ document: SourceDocumentDetail }>(
    `/api/v1/source-documents/${documentId}/queue-extract`,
    {
      method: 'POST',
    },
  );
  return payload.document;
}

export async function updateSourceDocument(
  documentId: string,
  patch: SourceDocumentPatch,
): Promise<DocumentSummary> {
  const payload = await requestJson<{ document: DocumentSummary }>(`/api/v1/source-documents/${documentId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return payload.document;
}

export async function updateSourceSuggestionStatus(
  suggestionId: string,
  status: SuggestionStatus,
): Promise<SourceExtractionSuggestion> {
  const payload = await requestJson<{ suggestion: SourceExtractionSuggestion }>(`/api/v1/source-suggestions/${suggestionId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return payload.suggestion;
}

export async function applySourceSuggestion(
  suggestionId: string,
): Promise<{ suggestion: SourceExtractionSuggestion; item: ContextItem | null }> {
  return requestJson<{ suggestion: SourceExtractionSuggestion; item: ContextItem | null }>(
    `/api/v1/source-suggestions/${suggestionId}/apply`,
    {
      method: 'POST',
    },
  );
}

export async function createContextItem(input: ContextItemInput): Promise<ContextItem> {
  const payload = await requestJson<{ item: ContextItem }>('/api/v1/context-items', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return payload.item;
}

export async function updateContextItem(itemId: string, patch: ContextItemPatch): Promise<ContextItem> {
  const payload = await requestJson<{ item: ContextItem }>(`/api/v1/context-items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return payload.item;
}

export async function createScenarioDraft(input: ScenarioDraftInput): Promise<ScenarioDraft> {
  const payload = await requestJson<{ draft: ScenarioDraft }>('/api/v1/scenario-drafts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return payload.draft;
}

export async function updateScenarioDraft(
  draftId: string,
  patch: ScenarioDraftPatch,
): Promise<ScenarioDraft> {
  const payload = await requestJson<{ draft: ScenarioDraft }>(`/api/v1/scenario-drafts/${draftId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return payload.draft;
}

export async function createRosterMember(input: RosterMemberInput): Promise<RosterMember> {
  const payload = await requestJson<{ rosterMember: RosterMember }>('/api/v1/roster-members', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return payload.rosterMember;
}

export async function updateRosterMember(
  memberId: string,
  patch: RosterMemberPatch,
): Promise<RosterMember> {
  const payload = await requestJson<{ rosterMember: RosterMember }>(`/api/v1/roster-members/${memberId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return payload.rosterMember;
}

export async function createWorkspaceUser(input: WorkspaceUserInput): Promise<WorkspaceUser> {
  const payload = await requestJson<{ workspaceUser: WorkspaceUser }>('/api/v1/workspace-users', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return payload.workspaceUser;
}

export async function updateWorkspaceUser(
  userId: string,
  patch: WorkspaceUserPatch,
): Promise<WorkspaceUser> {
  const payload = await requestJson<{ workspaceUser: WorkspaceUser }>(`/api/v1/workspace-users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return payload.workspaceUser;
}

export async function createWorkspaceInvite(input: WorkspaceInviteInput): Promise<WorkspaceInvite> {
  const payload = await requestJson<{ workspaceInvite: WorkspaceInvite }>('/api/v1/workspace-invites', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return payload.workspaceInvite;
}

export async function updateWorkspaceInvite(
  inviteId: string,
  patch: WorkspaceInvitePatch,
): Promise<WorkspaceInvite> {
  const payload = await requestJson<{ workspaceInvite: WorkspaceInvite }>(`/api/v1/workspace-invites/${inviteId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return payload.workspaceInvite;
}

export async function sendWorkspaceInviteMagicLink(
  inviteId: string,
): Promise<WorkspaceInviteMagicLinkResult> {
  return requestJson<WorkspaceInviteMagicLinkResult>(`/api/v1/workspace-invites/${inviteId}/send`, {
    method: 'POST',
  });
}

export async function createLaunch(input: LaunchInput): Promise<Launch> {
  const payload = await requestJson<{ launch: Launch }>('/api/v1/launches', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return payload.launch;
}

export async function updateLaunch(launchId: string, patch: LaunchPatch): Promise<Launch> {
  const payload = await requestJson<{ launch: Launch }>(`/api/v1/launches/${launchId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return payload.launch;
}

export async function getLaunchDetail(launchId: string): Promise<LaunchDetail> {
  const payload = await requestJson<{ launch: LaunchDetail }>(`/api/v1/launches/${launchId}`);
  return payload.launch;
}

export async function createParticipantRun(input: ParticipantRunInput): Promise<ParticipantRun> {
  const payload = await requestJson<{ run: ParticipantRun }>('/api/v1/participant-runs', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return payload.run;
}

export async function createParticipantRunsByTeam(
  input: ParticipantRunTeamAssignmentInput,
): Promise<ParticipantRunTeamAssignmentResult> {
  return requestJson<ParticipantRunTeamAssignmentResult>('/api/v1/participant-runs/team-assignments', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getParticipantRun(runId: string): Promise<ParticipantRunDetail> {
  const payload = await requestJson<{ run: ParticipantRunDetail }>(`/api/v1/participant-runs/${runId}`);
  return payload.run;
}

export async function updateParticipantRun(runId: string, patch: ParticipantRunPatch): Promise<ParticipantRun> {
  const payload = await requestJson<{ run: ParticipantRun }>(`/api/v1/participant-runs/${runId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return payload.run;
}

export async function getReportDetail(launchId: string): Promise<ReportDetail> {
  const payload = await requestJson<{ report: ReportDetail }>(`/api/v1/reports/${launchId}`);
  return payload.report;
}

export async function updateReportReview(
  launchId: string,
  input: ReportReviewUpdateInput,
): Promise<ReportDetail> {
  const payload = await requestJson<{ report: ReportDetail }>(`/api/v1/reports/${launchId}/review`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return payload.report;
}

export async function exportReport(launchId: string, format: ReportExportFormat): Promise<ReportExportFile> {
  const response = await fetch(api(`/api/v1/reports/${launchId}/export?format=${format}`), {
    credentials: 'include',
  });

  if (!response.ok) {
    throw await buildRequestError(response);
  }

  return {
    format,
    fileName: parseFileName(response.headers.get('Content-Disposition')) ?? fallbackExportFileName(format),
    mimeType: response.headers.get('Content-Type') ?? 'text/plain; charset=utf-8',
    generatedAt: response.headers.get('X-Export-Generated-At') ?? new Date().toISOString(),
    content: await response.text(),
  };
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(api(path), {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    credentials: 'include',
    ...init,
  });

  if (!response.ok) {
    throw await buildRequestError(response);
  }

  return (await response.json()) as T;
}

function api(path: string): string {
  if (!API_BASE) {
    return path;
  }

  return `${API_BASE.replace(/\/$/, '')}${path}`;
}

async function buildRequestError(response: Response): Promise<RequestError> {
  let detail = 'Request failed.';
  try {
    const payload = (await response.json()) as { error?: string };
    detail = payload.error ?? detail;
  } catch {
    // Ignore body parse failures and keep the generic error.
  }
  return new RequestError(detail, response.status);
}

function parseFileName(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;
  const match = /filename="([^"]+)"/.exec(contentDisposition);
  return match?.[1] ?? null;
}

function fallbackExportFileName(format: ReportExportFormat): string {
  return format === 'json' ? 'altira-resilience-evidence-package.json' : 'altira-resilience-after-action.md';
}

export class RequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'RequestError';
    this.status = status;
  }
}
