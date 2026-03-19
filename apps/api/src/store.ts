import type {
  AdminSummaryCard,
  AuditEvent,
  AuditEventAction,
  AuditEventCategory,
  AuditEventTargetType,
  AuthSession,
  ContextBucket,
  ContextItem,
  ContextItemInput,
  ContextItemPatch,
  DocumentParseStatus,
  DocumentSummary,
  EvidenceStatus,
  Launch,
  LaunchInput,
  LaunchPatch,
  LaunchStatus,
  LaunchSummary,
  OverviewCoverageGap,
  OverviewData,
  OverviewQueueItem,
  ParticipantRun,
  ParticipantRunDetail,
  ParticipantRunInput,
  ParticipantRunPatch,
  ParticipantRunStatus,
  RosterMember,
  RosterMemberInput,
  RosterMemberPatch,
  RosterMemberStatus,
  ReportAfterActionSummary,
  ReportDetail,
  ReportEvidencePackage,
  ReportEvidenceItem,
  ReportExportFile,
  ReportExportFormat,
  ReportStatus,
  ReportSummary,
  ReviewState,
  ScenarioApprovalStatus,
  ScenarioDifficulty,
  ScenarioDraft,
  ScenarioDraftInput,
  ScenarioDraftPatch,
  SourceDocumentDetail,
  SourceDocumentInput,
  SourceDocumentPatch,
  SourceDocumentUploadInput,
  SourceExtractionJob,
  SourceExtractionJobStatus,
  SourceExtractionMethod,
  SourceExtractionProvenance,
  SourceExtractionProvider,
  SourceExtractionStatus,
  SourceExtractionSuggestion,
  SourceStorageBackend,
  SourceStorageStatus,
  SuggestionConfidence,
  SuggestionStatus,
  TabletopPhase,
  WorkspaceUser,
  WorkspaceInvite,
  WorkspaceInviteInput,
  WorkspaceInvitePatch,
  WorkspaceInviteStatus,
  WorkspaceUserInput,
  WorkspaceUserPatch,
  WorkspaceUserCapability,
  WorkspaceUserRole,
  WorkspaceUserStatus,
} from '@resilience/shared';

export interface ResilienceStore {
  listSourceDocuments(): Promise<DocumentSummary[]>;
  getSourceDocument(id: string): Promise<SourceDocumentDetail | null>;
  createSourceDocument(input: SourceDocumentInput): Promise<DocumentSummary>;
  uploadSourceDocument(input: SourceDocumentUploadInput): Promise<SourceDocumentDetail>;
  queueSourceDocumentExtraction(
    id: string,
    input?: { note?: string | null },
  ): Promise<SourceDocumentDetail | null>;
  applySourceDocumentExtraction(
    id: string,
    input: SourceDocumentExtractionUpdate,
  ): Promise<SourceDocumentDetail | null>;
  getSourceDocumentExtractionJob(id: string): Promise<SourceExtractionJob | null>;
  markSourceDocumentExtractionJobProcessing(id: string): Promise<SourceExtractionJob | null>;
  completeSourceDocumentExtractionJob(
    id: string,
    input: SourceDocumentExtractionJobCompletion,
  ): Promise<SourceDocumentDetail | null>;
  updateSourceDocument(id: string, patch: SourceDocumentPatch): Promise<DocumentSummary | null>;
  updateSourceExtractionSuggestionStatus(
    suggestionId: string,
    status: SuggestionStatus,
  ): Promise<SourceExtractionSuggestion | null>;
  applySourceExtractionSuggestion(
    suggestionId: string,
  ): Promise<{ suggestion: SourceExtractionSuggestion; item: ContextItem | null } | null>;
  listContextBuckets(): Promise<ContextBucket[]>;
  createContextItem(input: ContextItemInput): Promise<ContextItem | null>;
  updateContextItem(id: string, patch: ContextItemPatch): Promise<ContextItem | null>;
  listScenarioDrafts(): Promise<ScenarioDraft[]>;
  getScenarioDraft(id: string): Promise<ScenarioDraft | null>;
  createScenarioDraft(input: ScenarioDraftInput): Promise<ScenarioDraft>;
  updateScenarioDraft(id: string, patch: ScenarioDraftPatch): Promise<ScenarioDraft | null>;
  listRosterMembers(): Promise<RosterMember[]>;
  getRosterMember(id: string): Promise<RosterMember | null>;
  createRosterMember(input: RosterMemberInput): Promise<RosterMember>;
  updateRosterMember(id: string, patch: RosterMemberPatch): Promise<RosterMember | null>;
  listWorkspaceUsers(): Promise<WorkspaceUser[]>;
  getWorkspaceUser(id: string): Promise<WorkspaceUser | null>;
  getWorkspaceUserByEmail(email: string): Promise<WorkspaceUser | null>;
  createWorkspaceUser(input: WorkspaceUserInput): Promise<WorkspaceUser>;
  updateWorkspaceUser(id: string, patch: WorkspaceUserPatch): Promise<WorkspaceUser | null>;
  listWorkspaceInvites(): Promise<WorkspaceInvite[]>;
  createWorkspaceInvite(input: WorkspaceInviteInput & { invitedByUserId: string | null }): Promise<WorkspaceInvite>;
  updateWorkspaceInvite(id: string, patch: WorkspaceInvitePatch): Promise<WorkspaceInvite | null>;
  issueWorkspaceInviteMagicLink(id: string, input: { tokenHash: string; expiresAt: string }): Promise<WorkspaceInvite | null>;
  getWorkspaceInviteByMagicLinkTokenHash(tokenHash: string): Promise<WorkspaceInvite | null>;
  getPendingWorkspaceInviteByEmail(email: string): Promise<WorkspaceInvite | null>;
  acceptWorkspaceInvite(id: string, workspaceUserId: string): Promise<WorkspaceInvite | null>;
  listAuditEvents(limit?: number): Promise<AuditEvent[]>;
  createAuditEvent(input: {
    category: AuditEventCategory;
    action: AuditEventAction;
    targetType: AuditEventTargetType;
    targetId: string;
    actorUserId: string | null;
    actorName: string;
    actorRole: WorkspaceUserRole | 'system';
    summary: string;
    detail?: string | null;
  }): Promise<AuditEvent>;
  createAuthSession(input: {
    workspaceUserId: string;
    tokenHash: string;
    expiresAt: string;
  }): Promise<AuthSession>;
  getAuthSessionByTokenHash(tokenHash: string): Promise<AuthSession | null>;
  revokeAuthSession(id: string): Promise<void>;
  touchAuthSession(id: string): Promise<AuthSession | null>;
  listLaunches(): Promise<Launch[]>;
  getLaunch(id: string): Promise<Launch | null>;
  createLaunch(input: LaunchInput): Promise<Launch | null>;
  updateLaunch(id: string, patch: LaunchPatch): Promise<Launch | null>;
  updateReportReview(
    launchId: string,
    input: {
      closeoutNotes: string;
      followUpText: string;
      markClosed: boolean;
      actorUserId: string;
      actorName: string;
    },
  ): Promise<Launch | null>;
  listParticipantRuns(launchId?: string): Promise<ParticipantRun[]>;
  getParticipantRun(id: string): Promise<ParticipantRun | null>;
  createParticipantRun(input: ParticipantRunInput): Promise<ParticipantRun | null>;
  updateParticipantRun(id: string, patch: ParticipantRunPatch): Promise<ParticipantRun | null>;
}

type SourceDocumentRow = {
  id: string;
  name: string;
  type: string;
  businessUnit: string;
  owner: string;
  effectiveDate: string;
  parseStatus: DocumentParseStatus;
  updatedAt: string;
};

type SourceDocumentListRow = SourceDocumentRow & {
  uploadedFileName: string | null;
  byteSize: number | null;
  storageBackend: SourceStorageBackend | null;
  extractionStatus: SourceExtractionStatus | null;
  pendingSuggestionCount: number | null;
};

type SourceDocumentFileRow = {
  documentId: string;
  uploadedFileName: string;
  mimeType: string;
  byteSize: number;
  storageBackend: SourceStorageBackend;
  storageObjectKey: string | null;
  contentText: string | null;
  contentExcerpt: string | null;
  extractionNote: string | null;
  extractionStatus: SourceExtractionStatus;
  extractionMethod: SourceExtractionMethod | null;
  extractionProvider: SourceExtractionProvider | null;
  extractionVersion: string | null;
  extractedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type SourceExtractionSuggestionRow = {
  id: string;
  documentId: string;
  bucketId: string;
  name: string;
  sourceSnippet: string;
  confidence: SuggestionConfidence;
  status: SuggestionStatus;
  createdAt: string;
  updatedAt: string;
};

type SourceExtractionJobRow = {
  id: string;
  documentId: string;
  status: SourceExtractionJobStatus;
  attemptCount: number;
  lastError: string | null;
  attemptedMethod: SourceExtractionMethod | null;
  attemptedProvider: SourceExtractionProvider | null;
  attemptedVersion: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

type ContextBucketRow = {
  id: string;
  label: string;
  sortOrder: number;
};

type ContextItemRow = {
  id: string;
  bucketId: string;
  name: string;
  reviewState: ReviewState;
  required: number;
  sortOrder: number;
};

type ScenarioDraftRow = {
  id: string;
  title: string;
  templateId: string;
  audience: string;
  launchMode: 'individual' | 'tabletop';
  difficulty: ScenarioDifficulty;
  learningObjectives: string;
  approvalStatus: ScenarioApprovalStatus;
  reviewerNotes: string | null;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  reviewedByName: string | null;
  scheduledStartAt: string | null;
  participantsLabel: string | null;
  createdAt: string;
  updatedAt: string;
};

type LaunchRow = {
  id: string;
  scenarioDraftId: string;
  name: string;
  mode: 'individual' | 'tabletop';
  audience: string;
  status: LaunchStatus;
  startsAt: string | null;
  participantsLabel: string | null;
  scenarioBrief: string;
  learningObjectives: string;
  tabletopPhase: TabletopPhase | null;
  facilitatorNotes: string;
  reportCloseoutNotes: string;
  reportFollowUpText: string;
  reportClosedAt: string | null;
  reportClosedByUserId: string | null;
  reportClosedByName: string | null;
  createdAt: string;
  updatedAt: string;
};

type RosterMemberRow = {
  id: string;
  fullName: string;
  email: string;
  roleTitle: string;
  team: string;
  managerName: string | null;
  status: RosterMemberStatus;
  createdAt: string;
  updatedAt: string;
};

type WorkspaceUserRow = {
  id: string;
  fullName: string;
  email: string;
  role: WorkspaceUserRole;
  capabilitiesJson: string | null;
  scopeTeamsJson: string | null;
  rosterMemberId: string | null;
  status: WorkspaceUserStatus;
  createdAt: string;
  updatedAt: string;
};

type AuthSessionRow = {
  id: string;
  workspaceUserId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
  revokedAt: string | null;
};

type AuditEventRow = {
  id: string;
  category: AuditEventCategory;
  action: AuditEventAction;
  targetType: AuditEventTargetType;
  targetId: string;
  actorUserId: string | null;
  actorName: string;
  actorRole: WorkspaceUserRole | 'system';
  summary: string;
  detail: string | null;
  createdAt: string;
};

type WorkspaceInviteRow = {
  id: string;
  email: string;
  fullName: string;
  role: WorkspaceUserRole;
  capabilitiesJson: string | null;
  scopeTeamsJson: string | null;
  rosterMemberId: string | null;
  status: WorkspaceInviteStatus;
  invitedByUserId: string | null;
  acceptedWorkspaceUserId: string | null;
  createdAt: string;
  updatedAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  magicLinkTokenHash: string | null;
  magicLinkExpiresAt: string | null;
  magicLinkSentAt: string | null;
};

type ParticipantRunRow = {
  id: string;
  launchId: string;
  rosterMemberId: string | null;
  participantName: string;
  participantEmail: string | null;
  participantRole: string;
  participantTeam: string | null;
  status: ParticipantRunStatus;
  firstAction: string;
  escalationChoice: string;
  impactAssessment: string;
  notes: string;
  policyAcknowledged: number;
  scorePercent: number | null;
  requiredActionsCompleted: number;
  totalRequiredActions: number;
  dueAt: string | null;
  startedAt: string | null;
  submittedAt: string | null;
  updatedAt: string;
};

type ParticipantMetrics = {
  requiredActionsCompleted: number;
  totalRequiredActions: number;
  scorePercent: number;
};

export type SourceDocumentExtractionUpdate = {
  contentText: string | null;
  extractionNote: string | null;
  extractionProvenance?: SourceExtractionProvenance | null;
};

export type SourceDocumentExtractionJobCompletion = {
  status: Extract<SourceExtractionJobStatus, 'completed' | 'needs_attention' | 'failed'>;
  contentText: string | null;
  extractionNote: string | null;
  lastError?: string | null;
  extractionProvenance?: SourceExtractionProvenance | null;
  attemptedProvenance?: SourceExtractionProvenance | null;
};

const TOTAL_REQUIRED_ACTIONS = 4;
const MAX_UPLOAD_BYTES = 5_000_000;

export function isDocumentParseStatus(value: unknown): value is DocumentParseStatus {
  return value === 'uploaded' || value === 'parsed' || value === 'needs_review' || value === 'approved';
}

export function isSourceStorageBackend(value: unknown): value is SourceStorageBackend {
  return value === 'inline' || value === 'r2';
}

export function isReviewState(value: unknown): value is ReviewState {
  return value === 'confirmed' || value === 'needs_review';
}

export function isScenarioDifficulty(value: unknown): value is ScenarioDifficulty {
  return value === 'low' || value === 'medium' || value === 'high';
}

export function isScenarioApprovalStatus(value: unknown): value is ScenarioApprovalStatus {
  return value === 'draft' || value === 'ready_for_review' || value === 'changes_requested' || value === 'approved';
}

export function isLaunchMode(value: unknown): value is 'individual' | 'tabletop' {
  return value === 'individual' || value === 'tabletop';
}

export function isLaunchStatus(value: unknown): value is LaunchStatus {
  return value === 'draft' || value === 'scheduled' || value === 'in_progress' || value === 'completed';
}

export function isTabletopPhase(value: unknown): value is TabletopPhase {
  return value === 'briefing' || value === 'injects' || value === 'decision_review' || value === 'after_action';
}

export function isParticipantRunStatus(value: unknown): value is ParticipantRunStatus {
  return value === 'assigned' || value === 'in_progress' || value === 'submitted';
}

export function isRosterMemberStatus(value: unknown): value is RosterMemberStatus {
  return value === 'active' || value === 'inactive';
}

export function isWorkspaceUserRole(value: unknown): value is WorkspaceUserRole {
  return value === 'admin' || value === 'manager' || value === 'user';
}

export function isWorkspaceUserCapability(value: unknown): value is WorkspaceUserCapability {
  return value === 'resilience_tabletop_facilitate';
}

export function isWorkspaceUserStatus(value: unknown): value is WorkspaceUserStatus {
  return value === 'active' || value === 'inactive';
}

export function isWorkspaceInviteStatus(value: unknown): value is WorkspaceInviteStatus {
  return value === 'pending' || value === 'accepted' || value === 'revoked';
}

export function isSuggestionStatus(value: unknown): value is SuggestionStatus {
  return value === 'pending_review' || value === 'applied' || value === 'dismissed';
}

export function isSourceExtractionStatus(value: unknown): value is SourceExtractionStatus {
  return (
    value === 'not_started' ||
    value === 'queued' ||
    value === 'ready_for_review' ||
    value === 'reviewed' ||
    value === 'needs_attention'
  );
}

export function isSourceExtractionJobStatus(value: unknown): value is SourceExtractionJobStatus {
  return (
    value === 'queued' ||
    value === 'processing' ||
    value === 'completed' ||
    value === 'needs_attention' ||
    value === 'failed'
  );
}

export function isSourceExtractionMethod(value: unknown): value is SourceExtractionMethod {
  return (
    value === 'upload_native' ||
    value === 'upload_ai' ||
    value === 'manual_native' ||
    value === 'queued_native' ||
    value === 'queued_ai'
  );
}

export function isSourceExtractionProvider(value: unknown): value is SourceExtractionProvider {
  return (
    value === 'native_parser' ||
    value === 'workers_ai_markdown' ||
    value === 'workers_ai_vision'
  );
}

export function normalizeSourceDocumentInput(raw: Partial<SourceDocumentInput>): SourceDocumentInput | null {
  const name = readTrimmedString(raw.name);
  const type = readTrimmedString(raw.type);
  const businessUnit = readTrimmedString(raw.businessUnit);
  const owner = readTrimmedString(raw.owner);
  const effectiveDate = readTrimmedString(raw.effectiveDate);
  const parseStatus = isDocumentParseStatus(raw.parseStatus) ? raw.parseStatus : null;

  if (!name || !type || !businessUnit || !owner || !effectiveDate || !parseStatus) {
    return null;
  }

  return { name, type, businessUnit, owner, effectiveDate, parseStatus };
}

export function normalizeSourceDocumentUploadInput(raw: Partial<SourceDocumentUploadInput>): SourceDocumentUploadInput | null {
  const name = readTrimmedString(raw.name);
  const type = readTrimmedString(raw.type);
  const businessUnit = readTrimmedString(raw.businessUnit);
  const owner = readTrimmedString(raw.owner);
  const effectiveDate = readTrimmedString(raw.effectiveDate);
  const fileName = readTrimmedString(raw.fileName);
  const mimeType = readTrimmedString(raw.mimeType);
  const storageBackend = isSourceStorageBackend(raw.storageBackend) ? raw.storageBackend : null;
  const storageObjectKey = normalizeNullableString(raw.storageObjectKey);
  const contentText = normalizeNullableString(raw.contentText);
  const extractionNote = normalizeNullableString(raw.extractionNote);
  const extractionProvenance = normalizeSourceExtractionProvenance(raw.extractionProvenance);
  const byteSize = typeof raw.byteSize === 'number' && raw.byteSize > 0 ? raw.byteSize : null;

  if (!name || !type || !businessUnit || !owner || !effectiveDate || !fileName || !mimeType || !storageBackend || !byteSize) {
    return null;
  }

  if (byteSize > MAX_UPLOAD_BYTES) return null;
  if (storageBackend === 'r2' && !storageObjectKey) return null;
  if (!contentText && !extractionNote) return null;

  return {
    name,
    type,
    businessUnit,
    owner,
    effectiveDate,
    fileName,
    mimeType,
    byteSize,
    storageBackend,
    storageObjectKey,
    contentText,
    extractionNote,
    extractionProvenance,
  };
}

export function normalizeSourceDocumentPatch(raw: Partial<SourceDocumentPatch>): SourceDocumentPatch {
  const patch: SourceDocumentPatch = {};
  const name = readTrimmedString(raw.name);
  const type = readTrimmedString(raw.type);
  const businessUnit = readTrimmedString(raw.businessUnit);
  const owner = readTrimmedString(raw.owner);
  const effectiveDate = readTrimmedString(raw.effectiveDate);
  if (name) patch.name = name;
  if (type) patch.type = type;
  if (businessUnit) patch.businessUnit = businessUnit;
  if (owner) patch.owner = owner;
  if (effectiveDate) patch.effectiveDate = effectiveDate;
  if (isDocumentParseStatus(raw.parseStatus)) patch.parseStatus = raw.parseStatus;
  return patch;
}

export function normalizeContextItemInput(raw: Partial<ContextItemInput>): ContextItemInput | null {
  const bucketId = readTrimmedString(raw.bucketId);
  const name = readTrimmedString(raw.name);
  const reviewState = isReviewState(raw.reviewState) ? raw.reviewState : null;
  const required = typeof raw.required === 'boolean' ? raw.required : null;

  if (!bucketId || !name || !reviewState || required === null) {
    return null;
  }

  return { bucketId, name, reviewState, required };
}

export function normalizeContextItemPatch(raw: Partial<ContextItemPatch>): ContextItemPatch {
  const patch: ContextItemPatch = {};
  const bucketId = readTrimmedString(raw.bucketId);
  const name = readTrimmedString(raw.name);
  if (bucketId) patch.bucketId = bucketId;
  if (name) patch.name = name;
  if (isReviewState(raw.reviewState)) patch.reviewState = raw.reviewState;
  if (typeof raw.required === 'boolean') patch.required = raw.required;
  return patch;
}

export function normalizeScenarioDraftInput(raw: Partial<ScenarioDraftInput>): ScenarioDraftInput | null {
  const title = readTrimmedString(raw.title);
  const templateId = readTrimmedString(raw.templateId);
  const audience = readTrimmedString(raw.audience);
  const launchMode = isLaunchMode(raw.launchMode) ? raw.launchMode : null;
  const difficulty = isScenarioDifficulty(raw.difficulty) ? raw.difficulty : null;
  const learningObjectives = readTrimmedString(raw.learningObjectives);
  const approvalStatus = isScenarioApprovalStatus(raw.approvalStatus) ? raw.approvalStatus : null;

  if (!title || !templateId || !audience || !launchMode || !difficulty || !learningObjectives || !approvalStatus) {
    return null;
  }

  return {
    title,
    templateId,
    audience,
    launchMode,
    difficulty,
    learningObjectives,
    approvalStatus,
    reviewerNotes: normalizeNullableString(raw.reviewerNotes),
    reviewedAt: normalizeNullableString(raw.reviewedAt),
    reviewedByUserId: normalizeNullableString(raw.reviewedByUserId),
    reviewedByName: normalizeNullableString(raw.reviewedByName),
    scheduledStartAt: normalizeNullableString(raw.scheduledStartAt),
    participantsLabel: normalizeNullableString(raw.participantsLabel),
  };
}

export function normalizeScenarioDraftPatch(raw: Partial<ScenarioDraftPatch>): ScenarioDraftPatch {
  const patch: ScenarioDraftPatch = {};
  const title = readTrimmedString(raw.title);
  const templateId = readTrimmedString(raw.templateId);
  const audience = readTrimmedString(raw.audience);
  const learningObjectives = readTrimmedString(raw.learningObjectives);
  if (title) patch.title = title;
  if (templateId) patch.templateId = templateId;
  if (audience) patch.audience = audience;
  if (isLaunchMode(raw.launchMode)) patch.launchMode = raw.launchMode;
  if (isScenarioDifficulty(raw.difficulty)) patch.difficulty = raw.difficulty;
  if (learningObjectives) patch.learningObjectives = learningObjectives;
  if (isScenarioApprovalStatus(raw.approvalStatus)) patch.approvalStatus = raw.approvalStatus;
  if (raw.reviewerNotes === null || typeof raw.reviewerNotes === 'string') {
    patch.reviewerNotes = normalizeNullableString(raw.reviewerNotes);
  }
  if (raw.reviewedAt === null || typeof raw.reviewedAt === 'string') {
    patch.reviewedAt = normalizeNullableString(raw.reviewedAt);
  }
  if (raw.reviewedByUserId === null || typeof raw.reviewedByUserId === 'string') {
    patch.reviewedByUserId = normalizeNullableString(raw.reviewedByUserId);
  }
  if (raw.reviewedByName === null || typeof raw.reviewedByName === 'string') {
    patch.reviewedByName = normalizeNullableString(raw.reviewedByName);
  }
  if (raw.scheduledStartAt === null || typeof raw.scheduledStartAt === 'string') {
    patch.scheduledStartAt = normalizeNullableString(raw.scheduledStartAt);
  }
  if (raw.participantsLabel === null || typeof raw.participantsLabel === 'string') {
    patch.participantsLabel = normalizeNullableString(raw.participantsLabel);
  }
  return patch;
}

export function normalizeLaunchInput(raw: Partial<LaunchInput>): LaunchInput | null {
  const scenarioDraftId = readTrimmedString(raw.scenarioDraftId);
  if (!scenarioDraftId) return null;

  return {
    scenarioDraftId,
    startsAt: normalizeNullableString(raw.startsAt),
    participantsLabel: normalizeNullableString(raw.participantsLabel),
  };
}

export function normalizeLaunchPatch(raw: Partial<LaunchPatch>): LaunchPatch {
  const patch: LaunchPatch = {};
  const scenarioDraftId = readTrimmedString(raw.scenarioDraftId);
  const facilitatorNotes = readTrimmedString(raw.facilitatorNotes);
  if (scenarioDraftId) patch.scenarioDraftId = scenarioDraftId;
  if (raw.startsAt === null || typeof raw.startsAt === 'string') {
    patch.startsAt = normalizeNullableString(raw.startsAt);
  }
  if (raw.participantsLabel === null || typeof raw.participantsLabel === 'string') {
    patch.participantsLabel = normalizeNullableString(raw.participantsLabel);
  }
  if (isLaunchStatus(raw.status)) patch.status = raw.status;
  if (raw.tabletopPhase === null || isTabletopPhase(raw.tabletopPhase)) {
    patch.tabletopPhase = raw.tabletopPhase;
  }
  if (facilitatorNotes !== null) patch.facilitatorNotes = facilitatorNotes;
  return patch;
}

export function normalizeRosterMemberInput(raw: Partial<RosterMemberInput>): RosterMemberInput | null {
  const fullName = readTrimmedString(raw.fullName);
  const email = readTrimmedString(raw.email);
  const roleTitle = readTrimmedString(raw.roleTitle);
  const team = readTrimmedString(raw.team);
  const managerName = normalizeNullableString(raw.managerName);
  const status = isRosterMemberStatus(raw.status) ? raw.status : null;

  if (!fullName || !email || !roleTitle || !team || !status) {
    return null;
  }

  return {
    fullName,
    email,
    roleTitle,
    team,
    managerName,
    status,
  };
}

export function normalizeRosterMemberPatch(raw: Partial<RosterMemberPatch>): RosterMemberPatch {
  const patch: RosterMemberPatch = {};
  const fullName = readTrimmedString(raw.fullName);
  const email = readTrimmedString(raw.email);
  const roleTitle = readTrimmedString(raw.roleTitle);
  const team = readTrimmedString(raw.team);

  if (fullName) patch.fullName = fullName;
  if (email) patch.email = email;
  if (roleTitle) patch.roleTitle = roleTitle;
  if (team) patch.team = team;
  if (raw.managerName === null || typeof raw.managerName === 'string') {
    patch.managerName = normalizeNullableString(raw.managerName);
  }
  if (isRosterMemberStatus(raw.status)) patch.status = raw.status;

  return patch;
}

export function normalizeWorkspaceUserInput(raw: Partial<WorkspaceUserInput>): WorkspaceUserInput | null {
  const fullName = readTrimmedString(raw.fullName);
  const email = readTrimmedString(raw.email);
  const role = isWorkspaceUserRole(raw.role) ? raw.role : null;
  const status = isWorkspaceUserStatus(raw.status) ? raw.status : null;
  const rosterMemberId = normalizeNullableString(raw.rosterMemberId);
  const capabilities = normalizeWorkspaceUserCapabilities(raw.capabilities);
  const scopeTeams = normalizeScopeTeams(raw.scopeTeams);

  if (!fullName || !email || !role || !status) {
    return null;
  }

  return {
    fullName,
    email,
    role,
    capabilities,
    scopeTeams,
    rosterMemberId,
    status,
  };
}

export function normalizeWorkspaceUserPatch(raw: Partial<WorkspaceUserPatch>): WorkspaceUserPatch {
  const patch: WorkspaceUserPatch = {};
  const fullName = readTrimmedString(raw.fullName);
  const email = readTrimmedString(raw.email);
  if (fullName) patch.fullName = fullName;
  if (email) patch.email = email;
  if (isWorkspaceUserRole(raw.role)) patch.role = raw.role;
  if (isWorkspaceUserStatus(raw.status)) patch.status = raw.status;
  if (raw.rosterMemberId === null || typeof raw.rosterMemberId === 'string') {
    patch.rosterMemberId = normalizeNullableString(raw.rosterMemberId);
  }
  if (Array.isArray(raw.capabilities)) {
    patch.capabilities = normalizeWorkspaceUserCapabilities(raw.capabilities);
  }
  if (Array.isArray(raw.scopeTeams)) {
    patch.scopeTeams = normalizeScopeTeams(raw.scopeTeams);
  }
  return patch;
}

export function normalizeWorkspaceInviteInput(raw: Partial<WorkspaceInviteInput>): WorkspaceInviteInput | null {
  const email = readTrimmedString(raw.email);
  const fullName = readTrimmedString(raw.fullName);
  const role = isWorkspaceUserRole(raw.role) ? raw.role : null;
  const rosterMemberId = normalizeNullableString(raw.rosterMemberId);
  const capabilities = normalizeWorkspaceUserCapabilities(raw.capabilities);
  const scopeTeams = normalizeScopeTeams(raw.scopeTeams);

  if (!email || !fullName || !role) {
    return null;
  }

  return {
    email,
    fullName,
    role,
    capabilities,
    scopeTeams,
    rosterMemberId,
  };
}

export function normalizeWorkspaceInvitePatch(raw: Partial<WorkspaceInvitePatch>): WorkspaceInvitePatch {
  const patch: WorkspaceInvitePatch = {};
  if (isWorkspaceInviteStatus(raw.status)) patch.status = raw.status;
  return patch;
}

export function normalizeParticipantRunInput(raw: Partial<ParticipantRunInput>): ParticipantRunInput | null {
  const launchId = readTrimmedString(raw.launchId);
  const rosterMemberId = normalizeNullableString(raw.rosterMemberId);
  const participantName = readTrimmedString(raw.participantName);
  const participantEmail = normalizeNullableString(raw.participantEmail);
  const participantRole = readTrimmedString(raw.participantRole);
  const participantTeam = normalizeNullableString(raw.participantTeam);

  if (!launchId || (!rosterMemberId && (!participantName || !participantRole))) {
    return null;
  }

  return {
    launchId,
    rosterMemberId,
    participantName: participantName ?? '',
    participantEmail,
    participantRole: participantRole ?? '',
    participantTeam,
    dueAt: normalizeNullableString(raw.dueAt),
  };
}

export function normalizeParticipantRunPatch(raw: Partial<ParticipantRunPatch>): ParticipantRunPatch {
  const patch: ParticipantRunPatch = {};
  const participantName = readTrimmedString(raw.participantName);
  const participantEmail = normalizeNullableString(raw.participantEmail);
  const participantRole = readTrimmedString(raw.participantRole);
  const participantTeam = normalizeNullableString(raw.participantTeam);
  const firstAction = readTrimmedString(raw.firstAction);
  const escalationChoice = readTrimmedString(raw.escalationChoice);
  const impactAssessment = readTrimmedString(raw.impactAssessment);
  const notes = readTrimmedString(raw.notes);

  if (raw.rosterMemberId === null || typeof raw.rosterMemberId === 'string') {
    patch.rosterMemberId = normalizeNullableString(raw.rosterMemberId);
  }
  if (participantName) patch.participantName = participantName;
  if (raw.participantEmail === null || typeof raw.participantEmail === 'string') {
    patch.participantEmail = participantEmail;
  }
  if (participantRole) patch.participantRole = participantRole;
  if (raw.participantTeam === null || typeof raw.participantTeam === 'string') {
    patch.participantTeam = participantTeam;
  }
  if (firstAction !== null) patch.firstAction = firstAction;
  if (escalationChoice !== null) patch.escalationChoice = escalationChoice;
  if (impactAssessment !== null) patch.impactAssessment = impactAssessment;
  if (notes !== null) patch.notes = notes;
  if (typeof raw.policyAcknowledged === 'boolean') patch.policyAcknowledged = raw.policyAcknowledged;
  if (isParticipantRunStatus(raw.status)) patch.status = raw.status;
  if (raw.dueAt === null || typeof raw.dueAt === 'string') {
    patch.dueAt = normalizeNullableString(raw.dueAt);
  }
  return patch;
}

export function buildSummaryCards(
  documents: DocumentSummary[],
  scenarioDrafts: ScenarioDraft[],
  launches: Launch[],
  participantRuns: ParticipantRun[],
): AdminSummaryCard[] {
  const pendingMaterialApprovals = documents.filter(
    (document) => document.parseStatus === 'needs_review' || document.pendingSuggestionCount > 0,
  ).length;
  const pendingDraftApprovals = scenarioDrafts.filter((draft) => draft.approvalStatus === 'ready_for_review').length;
  const requestedChangesDrafts = scenarioDrafts.filter((draft) => draft.approvalStatus === 'changes_requested').length;
  const reports = buildReports(launches, participantRuns);
  const activeLaunches = launches.filter((launch) => launch.status === 'scheduled' || launch.status === 'in_progress').length;
  const overdueAssignments = participantRuns.filter(
    (run) => Boolean(run.dueAt) && run.status !== 'submitted' && run.dueAt! < todayDate(),
  ).length;
  const readyEvidence = reports.filter((report) => report.evidenceStatus === 'ready' && report.status !== 'closed').length;
  const pendingApprovalSegments = [
    pendingDraftApprovals > 0 ? `${pendingDraftApprovals} draft review${pendingDraftApprovals === 1 ? '' : 's'}` : null,
    requestedChangesDrafts > 0
      ? `${requestedChangesDrafts} requested change${requestedChangesDrafts === 1 ? '' : 's'}`
      : null,
    pendingMaterialApprovals > 0
      ? `${pendingMaterialApprovals} material review${pendingMaterialApprovals === 1 ? '' : 's'}`
      : null,
  ].filter((segment): segment is string => Boolean(segment));

  return [
    {
      id: 'active-exercises',
      label: 'Active exercises',
      value: String(activeLaunches),
      note:
        activeLaunches > 0
          ? `${activeLaunches} launch${activeLaunches === 1 ? '' : 'es'} are currently scheduled or in progress.`
          : 'No exercises are currently scheduled. Create a draft or launch the next readiness run.',
      tone: activeLaunches > 0 ? 'ready' : 'neutral',
    },
    {
      id: 'pending-approvals',
      label: 'Pending approvals',
      value: String(pendingDraftApprovals + pendingMaterialApprovals + requestedChangesDrafts),
      note:
        pendingDraftApprovals + pendingMaterialApprovals + requestedChangesDrafts > 0
          ? `${formatReadableList(pendingApprovalSegments)} ${pendingApprovalSegments.length === 1 ? 'is' : 'are'} waiting on operator action.`
          : 'No drafts or materials are blocked in review right now.',
      tone: pendingDraftApprovals + pendingMaterialApprovals + requestedChangesDrafts > 0 ? 'attention' : 'ready',
    },
    {
      id: 'overdue-assignments',
      label: 'Overdue assignments',
      value: String(overdueAssignments),
      note:
        overdueAssignments > 0
          ? `${overdueAssignments} participant assignment${overdueAssignments === 1 ? '' : 's'} are past due without a submitted response.`
          : 'No participant assignments are currently overdue.',
      tone: overdueAssignments > 0 ? 'attention' : 'ready',
    },
    {
      id: 'evidence-ready',
      label: 'Evidence ready',
      value: String(readyEvidence),
      note:
        readyEvidence > 0
          ? `${readyEvidence} evidence package${readyEvidence === 1 ? '' : 's'} are ready for review or export.`
          : 'No evidence packages are ready yet. Reports will mature as runs are submitted.',
      tone: readyEvidence > 0 ? 'ready' : 'neutral',
    },
  ];
}

export function buildOverviewData(
  documents: DocumentSummary[],
  scenarioDrafts: ScenarioDraft[],
  launches: Launch[],
  participantRuns: ParticipantRun[],
  rosterMembers: RosterMember[],
): OverviewData {
  const launchSummaries = buildLaunches(launches, participantRuns);
  const reports = buildReports(launches, participantRuns);
  const pendingApprovals = buildPendingApprovalQueue(documents, scenarioDrafts);
  const overdueAssignments = participantRuns
    .filter((run) => Boolean(run.dueAt) && run.status !== 'submitted' && run.dueAt! < todayDate())
    .slice()
    .sort(compareParticipantRuns);
  const upcomingExercises = launchSummaries
    .filter((launch) => launch.status === 'scheduled' || launch.status === 'in_progress')
    .slice()
    .sort(compareLaunchSummariesForOverview)
    .slice(0, 5);
  const evidenceReady = reports
    .filter((report) => report.evidenceStatus === 'ready' && report.status !== 'closed')
    .slice()
    .sort((left, right) => right.lastUpdated.localeCompare(left.lastUpdated))
    .slice(0, 5);
  const recentAfterActions = reports
    .slice()
    .sort((left, right) => right.lastUpdated.localeCompare(left.lastUpdated))
    .slice(0, 5);

  return {
    programHealth: buildSummaryCards(documents, scenarioDrafts, launches, participantRuns),
    pendingApprovals,
    upcomingExercises,
    overdueAssignments,
    evidenceReady,
    recentAfterActions,
    coverageGaps: buildCoverageGaps(rosterMembers, participantRuns),
  };
}

export function buildLaunches(launches: Launch[], participantRuns: ParticipantRun[]): LaunchSummary[] {
  const runsByLaunch = groupParticipantRunsByLaunch(participantRuns);

  return launches
    .map((launch) => syncLaunchWithRuns(launch, runsByLaunch.get(launch.id) ?? []))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map((launch) => {
      const runs = runsByLaunch.get(launch.id) ?? [];
      const completedCount = runs.filter((run) => run.status === 'submitted').length;

      return {
        id: launch.id,
        scenarioDraftId: launch.scenarioDraftId,
        name: launch.name,
        mode: launch.mode,
        audience: launch.audience,
        status: launch.status,
        tabletopPhase: launch.tabletopPhase,
        startsAt: launch.startsAt ?? 'Not scheduled',
        participantsLabel: launch.participantsLabel ?? 'Participants not set',
        participantCount: runs.length,
        completedCount,
      };
    });
}

function buildPendingApprovalQueue(
  documents: DocumentSummary[],
  scenarioDrafts: ScenarioDraft[],
): OverviewQueueItem[] {
  const draftItems: OverviewQueueItem[] = scenarioDrafts
    .filter((draft) => draft.approvalStatus === 'ready_for_review' || draft.approvalStatus === 'changes_requested')
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map((draft) => ({
      id: `draft-${draft.id}`,
      title: draft.title,
      note:
        draft.approvalStatus === 'changes_requested'
          ? `${draft.reviewedByName ?? 'Operator'} requested changes${draft.reviewerNotes ? ` · ${summarizeDraftReviewNote(draft.reviewerNotes)}` : ''}`
          : `${draft.audience} · ${draft.launchMode === 'tabletop' ? 'Tabletop' : 'Individual'} · updated ${formatShortDate(draft.updatedAt)}`,
      statusLabel: draft.approvalStatus === 'changes_requested' ? 'Changes requested' : 'Draft review',
    }));

  const materialItems: OverviewQueueItem[] = documents
    .filter((document) => document.parseStatus === 'needs_review' || document.pendingSuggestionCount > 0)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map((document) => ({
      id: `document-${document.id}`,
      title: document.name,
      note:
        document.pendingSuggestionCount > 0
          ? `${document.pendingSuggestionCount} reviewable suggestion${document.pendingSuggestionCount === 1 ? '' : 's'} · ${document.owner}`
          : `Awaiting material review · ${document.owner}`,
      statusLabel: 'Material review',
    }));

  return [...draftItems, ...materialItems].slice(0, 6);
}

function buildCoverageGaps(
  rosterMembers: RosterMember[],
  participantRuns: ParticipantRun[],
): OverviewCoverageGap[] {
  const activeRosterMembers = rosterMembers.filter((member) => member.status === 'active');
  const rosterById = new Map(activeRosterMembers.map((member) => [member.id, member]));
  const teams = new Map<
    string,
    { activeMembers: Set<string>; assignedMembers: Set<string>; submittedMembers: Set<string> }
  >();

  for (const member of activeRosterMembers) {
    const entry = teams.get(member.team) ?? {
      activeMembers: new Set<string>(),
      assignedMembers: new Set<string>(),
      submittedMembers: new Set<string>(),
    };
    entry.activeMembers.add(member.id);
    teams.set(member.team, entry);
  }

  for (const run of participantRuns) {
    const rosterMember = run.rosterMemberId ? rosterById.get(run.rosterMemberId) : null;
    const team = rosterMember?.team ?? run.participantTeam;
    if (!team) continue;

    const entry = teams.get(team) ?? {
      activeMembers: new Set<string>(),
      assignedMembers: new Set<string>(),
      submittedMembers: new Set<string>(),
    };
    const memberKey = run.rosterMemberId ?? `${team}:${run.participantName}`;
    entry.assignedMembers.add(memberKey);
    if (run.status === 'submitted') {
      entry.submittedMembers.add(memberKey);
    }
    teams.set(team, entry);
  }

  const gaps = Array.from(teams.entries()).map(([team, entry]) => {
    const activeMembers = entry.activeMembers.size;
    const assignedMembers = entry.assignedMembers.size;
    const submittedMembers = entry.submittedMembers.size;

    let note = 'Coverage is current.';
    if (assignedMembers === 0) {
      note = 'No active exercise coverage yet.';
    } else if (submittedMembers === 0) {
      note = 'Assignments exist, but no evidence has been submitted yet.';
    } else if (submittedMembers < activeMembers) {
      note = `${activeMembers - submittedMembers} active team member${activeMembers - submittedMembers === 1 ? '' : 's'} still lack submitted evidence.`;
    }

    return {
      team,
      activeMembers,
      assignedMembers,
      submittedMembers,
      note,
    } satisfies OverviewCoverageGap;
  });

  const unresolved = gaps.filter((gap) => gap.assignedMembers === 0 || gap.submittedMembers < gap.activeMembers);
  return (unresolved.length ? unresolved : gaps)
    .sort(compareCoverageGaps)
    .slice(0, 5);
}

function summarizeDraftReviewNote(note: string): string {
  return note.length > 96 ? `${note.slice(0, 93).trimEnd()}...` : note;
}

function formatReadableList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function compareCoverageGaps(left: OverviewCoverageGap, right: OverviewCoverageGap): number {
  return coverageGapRank(left) - coverageGapRank(right) || right.activeMembers - left.activeMembers || left.team.localeCompare(right.team);
}

function coverageGapRank(gap: OverviewCoverageGap): number {
  if (gap.assignedMembers === 0) return 0;
  if (gap.submittedMembers === 0) return 1;
  if (gap.submittedMembers < gap.activeMembers) return 2;
  return 3;
}

function compareLaunchSummariesForOverview(left: LaunchSummary, right: LaunchSummary): number {
  return launchSummaryRank(left) - launchSummaryRank(right) || compareMaybeDate(left.startsAt, right.startsAt);
}

function launchSummaryRank(launch: LaunchSummary): number {
  if (launch.status === 'in_progress') return 0;
  if (launch.status === 'scheduled') return 1;
  return 2;
}

function compareMaybeDate(left: string, right: string): number {
  const normalizedLeft = /^\d{4}-\d{2}-\d{2}$/.test(left) ? left : '9999-12-31';
  const normalizedRight = /^\d{4}-\d{2}-\d{2}$/.test(right) ? right : '9999-12-31';
  return normalizedLeft.localeCompare(normalizedRight);
}

function formatShortDate(value: string): string {
  return value.slice(0, 10);
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function buildReports(launches: Launch[], participantRuns: ParticipantRun[]): ReportSummary[] {
  const runsByLaunch = groupParticipantRunsByLaunch(participantRuns);

  return launches
    .map((launch) => {
      const runs = runsByLaunch.get(launch.id) ?? [];
      if (runs.length === 0) return null;

      const syncedLaunch = syncLaunchWithRuns(launch, runs);
      const metrics = summarizeParticipantRuns(runs);

      return {
        id: launch.id,
        name: launch.name,
        completionRate: metrics.completionRate,
        averageScore: metrics.averageScore,
        status: deriveReportStatus(syncedLaunch, metrics),
        evidenceStatus: metrics.submittedCount > 0 ? 'ready' : 'pending',
        lastUpdated: syncedLaunch.updatedAt,
      } satisfies ReportSummary;
    })
    .filter((report): report is ReportSummary => report !== null)
    .sort((left, right) => right.lastUpdated.localeCompare(left.lastUpdated));
}

export function buildLaunchDetail(
  launch: Launch,
  participantRuns: ParticipantRun[],
  draftApprovalStatus: ScenarioApprovalStatus = 'approved',
) {
  const syncedLaunch = syncLaunchWithRuns(launch, participantRuns);

  return {
    ...syncedLaunch,
    draftApprovalStatus,
    participantRuns: participantRuns.slice().sort(compareParticipantRuns),
  };
}

export function buildParticipantRunDetail(launch: Launch, run: ParticipantRun): ParticipantRunDetail {
  return {
    ...run,
    launchName: launch.name,
    launchMode: launch.mode,
    audience: launch.audience,
    startsAt: launch.startsAt,
    scenarioBrief: launch.scenarioBrief,
    learningObjectives: launch.learningObjectives,
  };
}

export function buildReportDetail(launch: Launch, participantRuns: ParticipantRun[]): ReportDetail {
  const syncedLaunch = syncLaunchWithRuns(launch, participantRuns);
  const metrics = summarizeParticipantRuns(participantRuns);
  const highlightNotes = buildReportHighlights(syncedLaunch, participantRuns, metrics);
  const afterActionSummary = buildAfterActionSummary(syncedLaunch, participantRuns, metrics);
  const evidenceItems = buildEvidenceItems(participantRuns, metrics);

  return {
    id: launch.id,
    launchId: launch.id,
    name: launch.name,
    launchStatus: syncedLaunch.status,
    mode: launch.mode,
    audience: launch.audience,
    startsAt: launch.startsAt ?? 'Not scheduled',
    completionRate: metrics.completionRate,
    averageScore: metrics.averageScore,
    status: deriveReportStatus(syncedLaunch, metrics),
    evidenceStatus: metrics.submittedCount > 0 ? 'ready' : 'pending',
    learningObjectives: launch.learningObjectives,
    scenarioBrief: launch.scenarioBrief,
    highlights: highlightNotes,
    afterActionSummary,
    closeoutNotes: launch.reportCloseoutNotes,
    followUpActions: parseFollowUpActions(launch.reportFollowUpText),
    closedAt: launch.reportClosedAt,
    closedByName: launch.reportClosedByName,
    evidenceItems,
    participantRuns: participantRuns.slice().sort(compareParticipantRuns),
  };
}

export function buildReportExportFile(
  launch: Launch,
  participantRuns: ParticipantRun[],
  format: ReportExportFormat,
): ReportExportFile {
  const report = buildReportDetail(launch, participantRuns);
  const generatedAt = nowIso();
  const evidencePackage = buildReportEvidencePackage(report, generatedAt);
  const fileStem = slugifyFileSegment(report.name);

  if (format === 'json') {
    return {
      format,
      fileName: `${fileStem}-evidence-package.json`,
      mimeType: 'application/json; charset=utf-8',
      content: JSON.stringify(evidencePackage, null, 2),
      generatedAt,
    };
  }

  return {
    format,
    fileName: `${fileStem}-after-action.md`,
    mimeType: 'text/markdown; charset=utf-8',
    content: buildMarkdownReportExport(evidencePackage),
    generatedAt,
  };
}

function prepareSourceUploadState(input: SourceDocumentUploadInput, documentId: string) {
  return prepareSourceExtractionState({
    documentId,
    fileName: input.fileName,
    mimeType: input.mimeType,
    contentText: input.contentText,
    extractionNote: input.extractionNote,
    extractionProvenance: input.extractionProvenance,
  });
}

function prepareSourceExtractionState(input: {
  documentId: string;
  fileName: string;
  mimeType: string;
  contentText: string | null;
  extractionNote: string | null;
  extractionProvenance?: SourceExtractionProvenance | null;
}) {
  const suggestions = input.contentText ? extractContextSuggestions(input.contentText, input.documentId) : [];
  const parseStatus: DocumentParseStatus = input.contentText ? 'needs_review' : 'uploaded';
  const extractionStatus: SourceExtractionStatus = input.contentText
    ? deriveSourceExtractionStatus(suggestions)
    : 'not_started';

  return {
    parseStatus,
    suggestions,
    extractionStatus,
    contentExcerpt: input.contentText ? buildContentExcerpt(input.contentText) : null,
    extractionProvenance: input.contentText ? (input.extractionProvenance ?? null) : null,
    extractionNote: input.contentText
      ? null
      : (input.extractionNote ?? buildPendingExtractionNote(input.fileName, input.mimeType)),
  };
}

const seedDocuments: DocumentSummary[] = [
  {
    id: 'doc_continuity_2026',
    name: 'Continuity Plan 2026',
    type: 'Continuity Plan',
    businessUnit: 'Operations',
    owner: 'Dana Smith',
    effectiveDate: '2026-01-15',
    parseStatus: 'approved',
    storageStatus: 'stored',
    storageBackend: 'inline',
    uploadedFileName: 'continuity-plan-2026.md',
    byteSize: 482,
    extractionStatus: 'reviewed',
    pendingSuggestionCount: 0,
    updatedAt: '2026-03-01T10:00:00.000Z',
  },
  {
    id: 'doc_vendor_matrix',
    name: 'Vendor Matrix',
    type: 'Vendor List',
    businessUnit: 'Operations',
    owner: 'Dana Smith',
    effectiveDate: '2026-02-01',
    parseStatus: 'needs_review',
    storageStatus: 'metadata_only',
    storageBackend: null,
    uploadedFileName: null,
    byteSize: null,
    extractionStatus: 'not_started',
    pendingSuggestionCount: 0,
    updatedAt: '2026-03-03T10:00:00.000Z',
  },
  {
    id: 'doc_ir_playbook',
    name: 'IR Playbook',
    type: 'Incident Response',
    businessUnit: 'Security',
    owner: 'Alex Morgan',
    effectiveDate: '2026-02-10',
    parseStatus: 'approved',
    storageStatus: 'stored',
    storageBackend: 'inline',
    uploadedFileName: 'ir-playbook.md',
    byteSize: 426,
    extractionStatus: 'reviewed',
    pendingSuggestionCount: 0,
    updatedAt: '2026-03-05T10:00:00.000Z',
  },
];

const seedDocumentFiles: SourceDocumentFileRow[] = [
  {
    documentId: 'doc_continuity_2026',
    uploadedFileName: 'continuity-plan-2026.md',
    mimeType: 'text/markdown',
    byteSize: 482,
    storageBackend: 'inline',
    storageObjectKey: null,
    contentText: `Teams:
- Operations
- Compliance

Critical Vendors:
- Identity Provider
- Primary Custodian

Escalation Roles:
- Incident Commander
- Executive Sponsor`,
    contentExcerpt:
      'Teams: Operations, Compliance. Critical Vendors: Identity Provider, Primary Custodian. Escalation Roles: Incident Commander, Executive Sponsor.',
    extractionNote: null,
    extractionStatus: 'reviewed',
    extractionMethod: 'upload_native',
    extractionProvider: 'native_parser',
    extractionVersion: 'native-parser-2026-03-09',
    extractedAt: '2026-03-01T10:00:00.000Z',
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z',
  },
  {
    documentId: 'doc_ir_playbook',
    uploadedFileName: 'ir-playbook.md',
    mimeType: 'text/markdown',
    byteSize: 426,
    storageBackend: 'inline',
    storageObjectKey: null,
    contentText: `Escalation Roles:
- Incident Commander
- Communications Lead

Vendors:
- Okta
- Communications Platform

Teams:
- Security
- Operations`,
    contentExcerpt:
      'Escalation Roles: Incident Commander, Communications Lead. Vendors: Okta, Communications Platform. Teams: Security, Operations.',
    extractionNote: null,
    extractionStatus: 'reviewed',
    extractionMethod: 'upload_native',
    extractionProvider: 'native_parser',
    extractionVersion: 'native-parser-2026-03-09',
    extractedAt: '2026-03-05T10:00:00.000Z',
    createdAt: '2026-03-05T10:00:00.000Z',
    updatedAt: '2026-03-05T10:00:00.000Z',
  },
];

const seedSuggestions: SourceExtractionSuggestion[] = [
  {
    id: 'suggestion_continuity_vendor_identity',
    documentId: 'doc_continuity_2026',
    bucketId: 'vendors',
    name: 'Identity Provider',
    sourceSnippet: 'Critical Vendors: Identity Provider',
    confidence: 'high',
    status: 'applied',
  },
  {
    id: 'suggestion_continuity_exec_sponsor',
    documentId: 'doc_continuity_2026',
    bucketId: 'escalation',
    name: 'Executive Sponsor',
    sourceSnippet: 'Escalation Roles: Executive Sponsor',
    confidence: 'high',
    status: 'dismissed',
  },
  {
    id: 'suggestion_ir_okta',
    documentId: 'doc_ir_playbook',
    bucketId: 'vendors',
    name: 'Okta',
    sourceSnippet: 'Vendors: Okta',
    confidence: 'high',
    status: 'dismissed',
  },
  {
    id: 'suggestion_ir_comms_lead',
    documentId: 'doc_ir_playbook',
    bucketId: 'escalation',
    name: 'Communications Lead',
    sourceSnippet: 'Escalation Roles: Communications Lead',
    confidence: 'high',
    status: 'applied',
  },
];

const seedExtractionJobs: SourceExtractionJob[] = [];

const seedContextBuckets: ContextBucket[] = [
  {
    id: 'teams',
    label: 'Teams',
    items: [
      { id: 'team_ops', bucketId: 'teams', name: 'Operations', reviewState: 'confirmed', required: true },
      { id: 'team_compliance', bucketId: 'teams', name: 'Compliance', reviewState: 'confirmed', required: true },
      { id: 'team_security', bucketId: 'teams', name: 'Security', reviewState: 'needs_review', required: true },
    ],
  },
  {
    id: 'vendors',
    label: 'Vendors',
    items: [
      { id: 'vendor_okta', bucketId: 'vendors', name: 'Identity Provider', reviewState: 'confirmed', required: true },
      { id: 'vendor_custodian', bucketId: 'vendors', name: 'Primary Custodian', reviewState: 'confirmed', required: true },
      { id: 'vendor_comms', bucketId: 'vendors', name: 'Communications Platform', reviewState: 'needs_review', required: false },
    ],
  },
  {
    id: 'escalation',
    label: 'Escalation Roles',
    items: [
      { id: 'role_incident_commander', bucketId: 'escalation', name: 'Incident Commander', reviewState: 'confirmed', required: true },
      { id: 'role_exec_sponsor', bucketId: 'escalation', name: 'Executive Sponsor', reviewState: 'needs_review', required: true },
    ],
  },
];

const seedScenarioDrafts: ScenarioDraft[] = [
  {
    id: 'draft_q2_cyber',
    title: 'Q2 Cyber Escalation Drill',
    templateId: 'cyber-incident-escalation',
    audience: 'Operations + Compliance',
    launchMode: 'individual',
    difficulty: 'medium',
    learningObjectives: 'Validate the first escalation actions, vendor coordination path, and cross-functional communication chain.',
    approvalStatus: 'approved',
    reviewerNotes: 'Approved for the next operations wave once vendor-contact ownership is confirmed in launch notes.',
    reviewedAt: '2026-03-06T14:00:00.000Z',
    reviewedByUserId: 'user_dana_admin',
    reviewedByName: 'Dana Smith',
    scheduledStartAt: '2026-03-18',
    participantsLabel: '2 assignees',
    createdAt: '2026-03-02T09:00:00.000Z',
    updatedAt: '2026-03-06T14:00:00.000Z',
  },
  {
    id: 'draft_vendor_tabletop',
    title: 'Core Vendor Outage Tabletop',
    templateId: 'critical-vendor-outage',
    audience: 'Executive Team',
    launchMode: 'tabletop',
    difficulty: 'high',
    learningObjectives: 'Pressure test executive decisions, comms ownership, and manual-workaround escalation.',
    approvalStatus: 'approved',
    reviewerNotes: 'Approved for facilitator-led use after executive briefing materials were refreshed.',
    reviewedAt: '2026-03-08T18:00:00.000Z',
    reviewedByUserId: 'user_dana_admin',
    reviewedByName: 'Dana Smith',
    scheduledStartAt: '2026-03-27',
    participantsLabel: '2 leaders',
    createdAt: '2026-03-04T12:00:00.000Z',
    updatedAt: '2026-03-08T18:00:00.000Z',
  },
  {
    id: 'draft_exec_comms_rework',
    title: 'Executive Communications Escalation Rehearsal',
    templateId: 'executive-tabletop',
    audience: 'Executive Team',
    launchMode: 'tabletop',
    difficulty: 'high',
    learningObjectives: 'Confirm who owns executive messaging, customer updates, and regulator escalation when the firm loses a core provider.',
    approvalStatus: 'changes_requested',
    reviewerNotes: 'Tighten the first 30 minutes of decision flow and add explicit communications owner handoff before resubmitting.',
    reviewedAt: '2026-03-15T16:20:00.000Z',
    reviewedByUserId: 'user_dana_admin',
    reviewedByName: 'Dana Smith',
    scheduledStartAt: '2026-04-03',
    participantsLabel: '7 leaders',
    createdAt: '2026-03-14T11:00:00.000Z',
    updatedAt: '2026-03-15T16:20:00.000Z',
  },
];

const seedRosterMembers: RosterMember[] = [
  {
    id: 'roster_kim_patel',
    fullName: 'Kim Patel',
    email: 'kim.patel@altira-demo.local',
    roleTitle: 'Operations Manager',
    team: 'Operations',
    managerName: 'Dana Smith',
    status: 'active',
    updatedAt: '2026-03-06T18:00:00.000Z',
  },
  {
    id: 'roster_jordan_lee',
    fullName: 'Jordan Lee',
    email: 'jordan.lee@altira-demo.local',
    roleTitle: 'Compliance Officer',
    team: 'Compliance',
    managerName: 'Dana Smith',
    status: 'active',
    updatedAt: '2026-03-06T18:00:00.000Z',
  },
  {
    id: 'roster_taylor_brooks',
    fullName: 'Taylor Brooks',
    email: 'taylor.brooks@altira-demo.local',
    roleTitle: 'Chief Information Security Officer',
    team: 'Security',
    managerName: 'Morgan Avery',
    status: 'active',
    updatedAt: '2026-03-08T18:00:00.000Z',
  },
  {
    id: 'roster_morgan_avery',
    fullName: 'Morgan Avery',
    email: 'morgan.avery@altira-demo.local',
    roleTitle: 'Chief Operating Officer',
    team: 'Executive',
    managerName: null,
    status: 'active',
    updatedAt: '2026-03-08T18:00:00.000Z',
  },
];

const seedWorkspaceUsers: WorkspaceUser[] = [
  {
    id: 'user_dana_admin',
    fullName: 'Dana Smith',
    email: 'dana.smith@altira-demo.local',
    role: 'admin',
    capabilities: [],
    scopeTeams: [],
    rosterMemberId: null,
    status: 'active',
    updatedAt: '2026-03-11T14:30:00.000Z',
  },
  {
    id: 'user_morgan_facilitator',
    fullName: 'Morgan Avery',
    email: 'morgan.avery@altira-demo.local',
    role: 'manager',
    capabilities: ['resilience_tabletop_facilitate'],
    scopeTeams: ['Executive', 'Security'],
    rosterMemberId: 'roster_morgan_avery',
    status: 'active',
    updatedAt: '2026-03-11T14:35:00.000Z',
  },
  {
    id: 'user_kim_manager',
    fullName: 'Kim Patel',
    email: 'kim.patel@altira-demo.local',
    role: 'manager',
    capabilities: [],
    scopeTeams: ['Operations'],
    rosterMemberId: 'roster_kim_patel',
    status: 'active',
    updatedAt: '2026-03-11T14:40:00.000Z',
  },
  {
    id: 'user_jordan_participant',
    fullName: 'Jordan Lee',
    email: 'jordan.lee@altira-demo.local',
    role: 'user',
    capabilities: [],
    scopeTeams: [],
    rosterMemberId: 'roster_jordan_lee',
    status: 'active',
    updatedAt: '2026-03-11T14:45:00.000Z',
  },
];

const seedAuthSessions: AuthSessionRow[] = [];

const seedWorkspaceInvites: WorkspaceInvite[] = [
  {
    id: 'invite_taylor_observer',
    email: 'riley.chen@altira-demo.local',
    fullName: 'Riley Chen',
    role: 'user',
    capabilities: [],
    scopeTeams: [],
    rosterMemberId: null,
    status: 'pending',
    invitedByUserId: 'user_dana_admin',
    acceptedWorkspaceUserId: null,
    createdAt: '2026-03-16T12:30:00.000Z',
    updatedAt: '2026-03-16T12:30:00.000Z',
    acceptedAt: null,
    magicLinkSentAt: null,
    magicLinkExpiresAt: null,
  },
];

const seedAuditEvents: AuditEvent[] = [
  {
    id: 'audit_access_admin_created_kim',
    category: 'access',
    action: 'workspace_user_created',
    targetType: 'workspace_user',
    targetId: 'user_kim_manager',
    actorUserId: 'user_dana_admin',
    actorName: 'Dana Smith',
    actorRole: 'admin',
    summary: 'Dana Smith created workspace user Kim Patel as a manager.',
    detail: 'Initial manager access created for Operations oversight.',
    createdAt: '2026-03-11T14:40:00.000Z',
  },
  {
    id: 'audit_access_scope_morgan',
    category: 'access',
    action: 'manager_scope_updated',
    targetType: 'workspace_user',
    targetId: 'user_morgan_facilitator',
    actorUserId: 'user_dana_admin',
    actorName: 'Dana Smith',
    actorRole: 'admin',
    summary: 'Dana Smith updated Morgan Avery scope to Executive, Security.',
    detail: 'Tabletop facilitate capability remains enabled.',
    createdAt: '2026-03-11T14:35:00.000Z',
  },
  {
    id: 'audit_operations_launch_tabletop',
    category: 'operations',
    action: 'launch_created',
    targetType: 'launch',
    targetId: 'launch_vendor_tabletop_exec',
    actorUserId: 'user_dana_admin',
    actorName: 'Dana Smith',
    actorRole: 'admin',
    summary: 'Dana Smith launched Core Vendor Outage Tabletop.',
    detail: 'Executive tabletop launch created from the approved vendor outage draft.',
    createdAt: '2026-03-08T09:00:00.000Z',
  },
  {
    id: 'audit_operations_assignment_ops',
    category: 'operations',
    action: 'participant_assignment_created',
    targetType: 'launch',
    targetId: 'launch_q2_cyber_wave1',
    actorUserId: 'user_dana_admin',
    actorName: 'Dana Smith',
    actorRole: 'admin',
    summary: 'Dana Smith assigned Kim Patel to Q2 Cyber Escalation Drill.',
    detail: 'Due date set for the current quarter exercise wave.',
    createdAt: '2026-03-12T15:00:00.000Z',
  },
  {
    id: 'audit_access_invite_taylor',
    category: 'access',
    action: 'workspace_invite_created',
    targetType: 'workspace_invite',
    targetId: 'invite_taylor_observer',
    actorUserId: 'user_dana_admin',
    actorName: 'Dana Smith',
    actorRole: 'admin',
    summary: 'Dana Smith created a workspace invite for Riley Chen.',
    detail: 'Invite remains pending until Riley activates the time-limited sign-in link.',
    createdAt: '2026-03-16T12:30:00.000Z',
  },
];

const seedLaunches: Launch[] = [
  {
    id: 'launch_q2_cyber_wave1',
    scenarioDraftId: 'draft_q2_cyber',
    name: 'Q2 Cyber Escalation Drill',
    mode: 'individual',
    audience: 'Operations + Compliance',
    status: 'in_progress',
    startsAt: '2026-03-18',
    participantsLabel: '2 assignees',
    scenarioBrief:
      'A critical identity provider begins failing across employee authentication and advisor portal access. Participants must decide the first escalation, assess customer impact, and coordinate the internal response using approved procedures.',
    learningObjectives: 'Validate the first escalation actions, vendor coordination path, and cross-functional communication chain.',
    tabletopPhase: null,
    facilitatorNotes: '',
    reportCloseoutNotes: '',
    reportFollowUpText: '',
    reportClosedAt: null,
    reportClosedByUserId: null,
    reportClosedByName: null,
    createdAt: '2026-03-06T18:00:00.000Z',
    updatedAt: '2026-03-07T12:00:00.000Z',
  },
  {
    id: 'launch_vendor_tabletop_exec',
    scenarioDraftId: 'draft_vendor_tabletop',
    name: 'Core Vendor Outage Tabletop',
    mode: 'tabletop',
    audience: 'Executive Team',
    status: 'scheduled',
    startsAt: '2026-03-27',
    participantsLabel: '2 leaders',
    scenarioBrief:
      'A primary operations vendor loses regional processing capacity during market hours. The executive team must confirm the first decision path, assign external communications ownership, and determine whether continuity workarounds are sufficient.',
    learningObjectives: 'Pressure test executive decision rights, external communications ownership, and continuity workaround readiness.',
    tabletopPhase: 'briefing',
    facilitatorNotes:
      'Start with the vendor outage alert, then press on customer communications, manual workarounds, and escalation ownership.',
    reportCloseoutNotes: '',
    reportFollowUpText: '',
    reportClosedAt: null,
    reportClosedByUserId: null,
    reportClosedByName: null,
    createdAt: '2026-03-08T18:00:00.000Z',
    updatedAt: '2026-03-08T18:00:00.000Z',
  },
];

const seedParticipantRuns: ParticipantRun[] = [
  {
    id: 'run_kim_ops',
    launchId: 'launch_q2_cyber_wave1',
    rosterMemberId: 'roster_kim_patel',
    participantName: 'Kim Patel',
    participantEmail: 'kim.patel@altira-demo.local',
    participantRole: 'Operations Manager',
    participantTeam: 'Operations',
    status: 'submitted',
    firstAction: 'Escalate to the incident commander and confirm the identity provider outage scope.',
    escalationChoice: 'Incident Commander',
    impactAssessment: 'Advisor and employee login failures interrupt transaction review, but customer assets remain accessible.',
    notes: 'The vendor contact tree needs a cleaner handoff between security and operations.',
    policyAcknowledged: true,
    scorePercent: 100,
    requiredActionsCompleted: 4,
    totalRequiredActions: 4,
    dueAt: '2026-03-18',
    startedAt: '2026-03-07T11:00:00.000Z',
    submittedAt: '2026-03-07T12:00:00.000Z',
    updatedAt: '2026-03-07T12:00:00.000Z',
  },
  {
    id: 'run_jordan_compliance',
    launchId: 'launch_q2_cyber_wave1',
    rosterMemberId: 'roster_jordan_lee',
    participantName: 'Jordan Lee',
    participantEmail: 'jordan.lee@altira-demo.local',
    participantRole: 'Compliance Officer',
    participantTeam: 'Compliance',
    status: 'assigned',
    firstAction: '',
    escalationChoice: '',
    impactAssessment: '',
    notes: '',
    policyAcknowledged: false,
    scorePercent: null,
    requiredActionsCompleted: 0,
    totalRequiredActions: 4,
    dueAt: '2026-03-18',
    startedAt: null,
    submittedAt: null,
    updatedAt: '2026-03-07T09:00:00.000Z',
  },
  {
    id: 'run_vendor_exec_coo',
    launchId: 'launch_vendor_tabletop_exec',
    rosterMemberId: 'roster_morgan_avery',
    participantName: 'Morgan Avery',
    participantEmail: 'morgan.avery@altira-demo.local',
    participantRole: 'Chief Operating Officer',
    participantTeam: 'Executive',
    status: 'assigned',
    firstAction: '',
    escalationChoice: '',
    impactAssessment: '',
    notes: '',
    policyAcknowledged: false,
    scorePercent: null,
    requiredActionsCompleted: 0,
    totalRequiredActions: 4,
    dueAt: '2026-03-27',
    startedAt: null,
    submittedAt: null,
    updatedAt: '2026-03-08T18:00:00.000Z',
  },
  {
    id: 'run_vendor_exec_ciso',
    launchId: 'launch_vendor_tabletop_exec',
    rosterMemberId: 'roster_taylor_brooks',
    participantName: 'Taylor Brooks',
    participantEmail: 'taylor.brooks@altira-demo.local',
    participantRole: 'Chief Information Security Officer',
    participantTeam: 'Security',
    status: 'assigned',
    firstAction: '',
    escalationChoice: '',
    impactAssessment: '',
    notes: '',
    policyAcknowledged: false,
    scorePercent: null,
    requiredActionsCompleted: 0,
    totalRequiredActions: 4,
    dueAt: '2026-03-27',
    startedAt: null,
    submittedAt: null,
    updatedAt: '2026-03-08T18:00:00.000Z',
  },
];

export class MemoryResilienceStore implements ResilienceStore {
  private documents: SourceDocumentRow[];
  private documentFiles: SourceDocumentFileRow[];
  private suggestions: SourceExtractionSuggestion[];
  private extractionJobs: SourceExtractionJob[];
  private contextBuckets: ContextBucket[];
  private scenarioDrafts: ScenarioDraft[];
  private rosterMembers: RosterMember[];
  private workspaceUsers: WorkspaceUser[];
  private workspaceInvites: WorkspaceInvite[];
  private auditEvents: AuditEvent[];
  private authSessions: AuthSessionRow[];
  private launches: Launch[];
  private participantRuns: ParticipantRun[];

  constructor(seed?: {
    documents?: DocumentSummary[];
    documentFiles?: SourceDocumentFileRow[];
    suggestions?: SourceExtractionSuggestion[];
    extractionJobs?: SourceExtractionJob[];
    contextBuckets?: ContextBucket[];
    scenarioDrafts?: ScenarioDraft[];
    rosterMembers?: RosterMember[];
    workspaceUsers?: WorkspaceUser[];
    workspaceInvites?: WorkspaceInvite[];
    auditEvents?: AuditEvent[];
    authSessions?: AuthSessionRow[];
    launches?: Launch[];
    participantRuns?: ParticipantRun[];
  }) {
    this.documents = structuredClone((seed?.documents ?? seedDocuments).map(stripDocumentSummary));
    this.documentFiles = structuredClone(seed?.documentFiles ?? seedDocumentFiles);
    this.suggestions = structuredClone(seed?.suggestions ?? seedSuggestions);
    this.extractionJobs = structuredClone(seed?.extractionJobs ?? seedExtractionJobs);
    this.contextBuckets = structuredClone(seed?.contextBuckets ?? seedContextBuckets);
    this.scenarioDrafts = structuredClone(seed?.scenarioDrafts ?? seedScenarioDrafts);
    this.rosterMembers = structuredClone(seed?.rosterMembers ?? seedRosterMembers);
    this.workspaceUsers = structuredClone(seed?.workspaceUsers ?? seedWorkspaceUsers);
    this.workspaceInvites = structuredClone(seed?.workspaceInvites ?? seedWorkspaceInvites);
    this.auditEvents = structuredClone(seed?.auditEvents ?? seedAuditEvents);
    this.authSessions = structuredClone(seed?.authSessions ?? seedAuthSessions);
    this.launches = structuredClone(seed?.launches ?? seedLaunches);
    this.participantRuns = structuredClone(seed?.participantRuns ?? seedParticipantRuns);
  }

  async listSourceDocuments(): Promise<DocumentSummary[]> {
    return this.documents
      .map((document) => buildDocumentSummary(document, this.documentFiles, this.suggestions))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((document) => structuredClone(document));
  }

  async getSourceDocument(id: string): Promise<SourceDocumentDetail | null> {
    const document = this.documents.find((entry) => entry.id === id);
    if (!document) return null;

    return structuredClone(buildDocumentDetail(document, this.documentFiles, this.suggestions, this.extractionJobs));
  }

  async createSourceDocument(input: SourceDocumentInput): Promise<DocumentSummary> {
    const document: SourceDocumentRow = {
      id: crypto.randomUUID(),
      updatedAt: nowIso(),
      ...input,
    };
    this.documents.unshift(document);
    return structuredClone(buildDocumentSummary(document, this.documentFiles, this.suggestions));
  }

  async uploadSourceDocument(input: SourceDocumentUploadInput): Promise<SourceDocumentDetail> {
    const timestamp = nowIso();
    const documentId = crypto.randomUUID();
    const prepared = prepareSourceUploadState(input, documentId);

    const document: SourceDocumentRow = {
      id: documentId,
      name: input.name,
      type: input.type,
      businessUnit: input.businessUnit,
      owner: input.owner,
      effectiveDate: input.effectiveDate,
      parseStatus: prepared.parseStatus,
      updatedAt: timestamp,
    };

    const file: SourceDocumentFileRow = {
      documentId,
      uploadedFileName: input.fileName,
      mimeType: input.mimeType,
      byteSize: input.byteSize,
      storageBackend: input.storageBackend,
      storageObjectKey: input.storageObjectKey,
      contentText: input.contentText,
      contentExcerpt: prepared.contentExcerpt,
      extractionNote: prepared.extractionNote,
      extractionStatus: prepared.extractionStatus,
      extractionMethod: prepared.extractionProvenance?.method ?? null,
      extractionProvider: prepared.extractionProvenance?.provider ?? null,
      extractionVersion: prepared.extractionProvenance?.version ?? null,
      extractedAt: prepared.extractionProvenance?.generatedAt ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.documents.unshift(document);
    this.documentFiles.unshift(file);
    this.suggestions.unshift(...prepared.suggestions);

    return structuredClone(buildDocumentDetail(document, this.documentFiles, this.suggestions, this.extractionJobs));
  }

  async queueSourceDocumentExtraction(
    id: string,
    input?: { note?: string | null },
  ): Promise<SourceDocumentDetail | null> {
    const document = this.documents.find((entry) => entry.id === id);
    const file = this.documentFiles.find((entry) => entry.documentId === id);
    if (!document || !file) return null;

    const activeJob = findLatestExtractionJob(this.extractionJobs, id);
    if (activeJob && (activeJob.status === 'queued' || activeJob.status === 'processing')) {
      return structuredClone(buildDocumentDetail(document, this.documentFiles, this.suggestions, this.extractionJobs));
    }

    const timestamp = nowIso();
    const job: SourceExtractionJob = {
      id: crypto.randomUUID(),
      documentId: id,
      status: 'queued',
      attemptCount: 0,
      lastError: null,
      attemptedProvenance: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      startedAt: null,
      completedAt: null,
    };

    this.extractionJobs.unshift(job);
    file.extractionStatus = 'queued';
    file.extractionNote = input?.note ?? file.extractionNote;
    file.updatedAt = timestamp;
    document.updatedAt = timestamp;

    return structuredClone(buildDocumentDetail(document, this.documentFiles, this.suggestions, this.extractionJobs));
  }

  async applySourceDocumentExtraction(
    id: string,
    input: SourceDocumentExtractionUpdate,
  ): Promise<SourceDocumentDetail | null> {
    const document = this.documents.find((entry) => entry.id === id);
    const file = this.documentFiles.find((entry) => entry.documentId === id);
    if (!document || !file) return null;

    const timestamp = nowIso();
    const prepared = prepareSourceExtractionState({
      documentId: id,
      fileName: file.uploadedFileName,
      mimeType: file.mimeType,
      contentText: input.contentText,
      extractionNote: input.extractionNote,
      extractionProvenance: input.extractionProvenance,
    });

    file.contentText = input.contentText;
    file.contentExcerpt = prepared.contentExcerpt;
    file.extractionNote = prepared.extractionNote;
    file.extractionStatus = prepared.extractionStatus;
    file.extractionMethod = prepared.extractionProvenance?.method ?? null;
    file.extractionProvider = prepared.extractionProvenance?.provider ?? null;
    file.extractionVersion = prepared.extractionProvenance?.version ?? null;
    file.extractedAt = prepared.extractionProvenance?.generatedAt ?? null;
    file.updatedAt = timestamp;

    document.parseStatus = prepared.parseStatus;
    document.updatedAt = timestamp;

    this.suggestions = this.suggestions.filter((entry) => entry.documentId !== id);
    this.suggestions.unshift(...prepared.suggestions);

    return structuredClone(buildDocumentDetail(document, this.documentFiles, this.suggestions, this.extractionJobs));
  }

  async getSourceDocumentExtractionJob(id: string): Promise<SourceExtractionJob | null> {
    const job = this.extractionJobs.find((entry) => entry.id === id);
    return job ? structuredClone(job) : null;
  }

  async markSourceDocumentExtractionJobProcessing(id: string): Promise<SourceExtractionJob | null> {
    const job = this.extractionJobs.find((entry) => entry.id === id);
    if (!job) return null;

    const timestamp = nowIso();
    job.status = 'processing';
    job.attemptCount += 1;
    job.lastError = null;
    job.startedAt = timestamp;
    job.updatedAt = timestamp;
    return structuredClone(job);
  }

  async completeSourceDocumentExtractionJob(
    id: string,
    input: SourceDocumentExtractionJobCompletion,
  ): Promise<SourceDocumentDetail | null> {
    const job = this.extractionJobs.find((entry) => entry.id === id);
    if (!job) return null;

    const document = this.documents.find((entry) => entry.id === job.documentId);
    const file = this.documentFiles.find((entry) => entry.documentId === job.documentId);
    if (!document || !file) return null;

    const timestamp = nowIso();
    let detail: SourceDocumentDetail | null;

    if (input.status === 'completed' && input.contentText) {
      detail = await this.applySourceDocumentExtraction(job.documentId, {
        contentText: input.contentText,
        extractionNote: null,
        extractionProvenance: input.extractionProvenance ?? null,
      });
    } else {
      file.extractionStatus = 'needs_attention';
      file.extractionNote = input.extractionNote;
      file.updatedAt = timestamp;
      document.updatedAt = timestamp;
      detail = structuredClone(buildDocumentDetail(document, this.documentFiles, this.suggestions, this.extractionJobs));
    }

    job.status = input.status;
    job.lastError = input.lastError ?? null;
    job.attemptedProvenance = input.attemptedProvenance ?? input.extractionProvenance ?? null;
    job.completedAt = timestamp;
    job.updatedAt = timestamp;

    return detail ? structuredClone(buildDocumentDetail(document, this.documentFiles, this.suggestions, this.extractionJobs)) : null;
  }

  async updateSourceDocument(id: string, patch: SourceDocumentPatch): Promise<DocumentSummary | null> {
    const document = this.documents.find((entry) => entry.id === id);
    if (!document) return null;

    Object.assign(document, patch, { updatedAt: nowIso() });
    return structuredClone(buildDocumentSummary(document, this.documentFiles, this.suggestions));
  }

  async updateSourceExtractionSuggestionStatus(
    suggestionId: string,
    status: SuggestionStatus,
  ): Promise<SourceExtractionSuggestion | null> {
    const suggestion = this.suggestions.find((entry) => entry.id === suggestionId);
    if (!suggestion) return null;

    suggestion.status = status;
    this.syncDocumentExtractionState(suggestion.documentId);
    return structuredClone(suggestion);
  }

  async applySourceExtractionSuggestion(
    suggestionId: string,
  ): Promise<{ suggestion: SourceExtractionSuggestion; item: ContextItem | null } | null> {
    const suggestion = this.suggestions.find((entry) => entry.id === suggestionId);
    if (!suggestion) return null;

    const existingItem = findExistingContextItem(this.contextBuckets, suggestion.bucketId, suggestion.name);
    const item =
      existingItem ??
      ({
        id: crypto.randomUUID(),
        bucketId: suggestion.bucketId,
        name: suggestion.name,
        reviewState: 'needs_review',
        required: true,
      } satisfies ContextItem);

    if (!existingItem) {
      const bucket = this.contextBuckets.find((entry) => entry.id === suggestion.bucketId);
      if (bucket) {
        bucket.items.push(item);
      }
    }

    suggestion.status = 'applied';
    this.syncDocumentExtractionState(suggestion.documentId);

    return { suggestion: structuredClone(suggestion), item: structuredClone(item) };
  }

  async listContextBuckets(): Promise<ContextBucket[]> {
    return structuredClone(this.contextBuckets);
  }

  async createContextItem(input: ContextItemInput): Promise<ContextItem | null> {
    const bucket = this.contextBuckets.find((entry) => entry.id === input.bucketId);
    if (!bucket) return null;

    const item: ContextItem = {
      id: crypto.randomUUID(),
      bucketId: input.bucketId,
      name: input.name,
      reviewState: input.reviewState,
      required: input.required,
    };
    bucket.items.push(item);
    return structuredClone(item);
  }

  async updateContextItem(id: string, patch: ContextItemPatch): Promise<ContextItem | null> {
    for (const bucket of this.contextBuckets) {
      const item = bucket.items.find((entry) => entry.id === id);
      if (!item) continue;

      if (patch.bucketId && patch.bucketId !== bucket.id) {
        const destination = this.contextBuckets.find((entry) => entry.id === patch.bucketId);
        if (!destination) return null;
        bucket.items = bucket.items.filter((entry) => entry.id !== id);
        const movedItem: ContextItem = {
          ...item,
          bucketId: patch.bucketId,
          name: patch.name ?? item.name,
          reviewState: patch.reviewState ?? item.reviewState,
          required: patch.required ?? item.required,
        };
        destination.items.push(movedItem);
        return structuredClone(movedItem);
      }

      Object.assign(item, patch);
      return structuredClone(item);
    }

    return null;
  }

  async listScenarioDrafts(): Promise<ScenarioDraft[]> {
    return structuredClone(this.scenarioDrafts).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async getScenarioDraft(id: string): Promise<ScenarioDraft | null> {
    const draft = this.scenarioDrafts.find((entry) => entry.id === id);
    return draft ? structuredClone(draft) : null;
  }

  async createScenarioDraft(input: ScenarioDraftInput): Promise<ScenarioDraft> {
    const timestamp = nowIso();
    const draft: ScenarioDraft = {
      id: crypto.randomUUID(),
      createdAt: timestamp,
      updatedAt: timestamp,
      ...input,
      reviewerNotes: input.reviewerNotes ?? null,
      reviewedAt: input.reviewedAt ?? null,
      reviewedByUserId: input.reviewedByUserId ?? null,
      reviewedByName: input.reviewedByName ?? null,
    };
    this.scenarioDrafts.unshift(draft);
    return structuredClone(draft);
  }

  async updateScenarioDraft(id: string, patch: ScenarioDraftPatch): Promise<ScenarioDraft | null> {
    const draft = this.scenarioDrafts.find((entry) => entry.id === id);
    if (!draft) return null;

    Object.assign(draft, patch, {
      updatedAt: nowIso(),
      reviewerNotes: patch.reviewerNotes === undefined ? draft.reviewerNotes : patch.reviewerNotes,
      reviewedAt: patch.reviewedAt === undefined ? draft.reviewedAt : patch.reviewedAt,
      reviewedByUserId: patch.reviewedByUserId === undefined ? draft.reviewedByUserId : patch.reviewedByUserId,
      reviewedByName: patch.reviewedByName === undefined ? draft.reviewedByName : patch.reviewedByName,
    });
    return structuredClone(draft);
  }

  async listRosterMembers(): Promise<RosterMember[]> {
    return structuredClone(this.rosterMembers).sort(compareRosterMembers);
  }

  async getRosterMember(id: string): Promise<RosterMember | null> {
    const member = this.rosterMembers.find((entry) => entry.id === id);
    return member ? structuredClone(member) : null;
  }

  async createRosterMember(input: RosterMemberInput): Promise<RosterMember> {
    const timestamp = nowIso();
    const member: RosterMember = {
      id: crypto.randomUUID(),
      ...input,
      updatedAt: timestamp,
    };

    this.rosterMembers.push(member);
    return structuredClone(member);
  }

  async updateRosterMember(id: string, patch: RosterMemberPatch): Promise<RosterMember | null> {
    const member = this.rosterMembers.find((entry) => entry.id === id);
    if (!member) return null;

    Object.assign(member, patch, { updatedAt: nowIso() });
    return structuredClone(member);
  }

  async listWorkspaceUsers(): Promise<WorkspaceUser[]> {
    return structuredClone(this.workspaceUsers).sort(compareWorkspaceUsers);
  }

  async getWorkspaceUser(id: string): Promise<WorkspaceUser | null> {
    const user = this.workspaceUsers.find((entry) => entry.id === id);
    return user ? structuredClone(user) : null;
  }

  async getWorkspaceUserByEmail(email: string): Promise<WorkspaceUser | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = this.workspaceUsers.find((entry) => entry.email.trim().toLowerCase() === normalizedEmail);
    return user ? structuredClone(user) : null;
  }

  async createWorkspaceUser(input: WorkspaceUserInput): Promise<WorkspaceUser> {
    const user: WorkspaceUser = {
      id: crypto.randomUUID(),
      fullName: input.fullName,
      email: input.email,
      role: input.role,
      capabilities: input.capabilities,
      scopeTeams: input.scopeTeams,
      rosterMemberId: input.rosterMemberId,
      status: input.status,
      updatedAt: nowIso(),
    };

    this.workspaceUsers.unshift(user);
    return structuredClone(user);
  }

  async updateWorkspaceUser(id: string, patch: WorkspaceUserPatch): Promise<WorkspaceUser | null> {
    const user = this.workspaceUsers.find((entry) => entry.id === id);
    if (!user) return null;

    Object.assign(user, patch, {
      capabilities: patch.capabilities ?? user.capabilities,
      scopeTeams: patch.scopeTeams ?? user.scopeTeams,
      updatedAt: nowIso(),
    });
    return structuredClone(user);
  }

  async listWorkspaceInvites(): Promise<WorkspaceInvite[]> {
    return structuredClone(this.workspaceInvites).sort(compareWorkspaceInvites);
  }

  async createWorkspaceInvite(input: WorkspaceInviteInput & { invitedByUserId: string | null }): Promise<WorkspaceInvite> {
    const timestamp = nowIso();
    const invite: WorkspaceInvite = {
      id: crypto.randomUUID(),
      email: input.email,
      fullName: input.fullName,
      role: input.role,
      capabilities: input.capabilities,
      scopeTeams: input.scopeTeams,
      rosterMemberId: input.rosterMemberId,
      status: 'pending',
      invitedByUserId: input.invitedByUserId,
      acceptedWorkspaceUserId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      acceptedAt: null,
      magicLinkSentAt: null,
      magicLinkExpiresAt: null,
    };

    this.workspaceInvites.unshift(invite);
    return structuredClone(invite);
  }

  async updateWorkspaceInvite(id: string, patch: WorkspaceInvitePatch): Promise<WorkspaceInvite | null> {
    const invite = this.workspaceInvites.find((entry) => entry.id === id);
    if (!invite) return null;

    if (patch.status === 'revoked') {
      invite.status = 'revoked';
      invite.updatedAt = nowIso();
      invite.magicLinkSentAt = null;
      invite.magicLinkExpiresAt = null;
      (invite as WorkspaceInvite & { magicLinkTokenHash?: string | null }).magicLinkTokenHash = null;
      return structuredClone(invite);
    }

    if (patch.status === 'pending') {
      invite.status = 'pending';
      invite.updatedAt = nowIso();
      invite.acceptedWorkspaceUserId = null;
      invite.acceptedAt = null;
      invite.magicLinkSentAt = null;
      invite.magicLinkExpiresAt = null;
      return structuredClone(invite);
    }

    return structuredClone(invite);
  }

  async issueWorkspaceInviteMagicLink(
    id: string,
    input: { tokenHash: string; expiresAt: string },
  ): Promise<WorkspaceInvite | null> {
    const invite = this.workspaceInvites.find((entry) => entry.id === id);
    if (!invite) return null;

    const timestamp = nowIso();
    Object.assign(invite, {
      updatedAt: timestamp,
      magicLinkSentAt: timestamp,
      magicLinkExpiresAt: input.expiresAt,
    });
    (invite as WorkspaceInvite & { magicLinkTokenHash?: string | null }).magicLinkTokenHash = input.tokenHash;
    return structuredClone(invite);
  }

  async getWorkspaceInviteByMagicLinkTokenHash(tokenHash: string): Promise<WorkspaceInvite | null> {
    const invite = this.workspaceInvites.find(
      (entry) =>
        entry.status === 'pending' &&
        (entry as WorkspaceInvite & { magicLinkTokenHash?: string | null }).magicLinkTokenHash === tokenHash,
    );
    if (!invite) return null;
    if (invite.magicLinkExpiresAt && invite.magicLinkExpiresAt <= nowIso()) return null;
    return structuredClone(invite);
  }

  async getPendingWorkspaceInviteByEmail(email: string): Promise<WorkspaceInvite | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const invite = this.workspaceInvites.find(
      (entry) => entry.status === 'pending' && entry.email.trim().toLowerCase() === normalizedEmail,
    );
    return invite ? structuredClone(invite) : null;
  }

  async acceptWorkspaceInvite(id: string, workspaceUserId: string): Promise<WorkspaceInvite | null> {
    const invite = this.workspaceInvites.find((entry) => entry.id === id);
    if (!invite) return null;

    const timestamp = nowIso();
    invite.status = 'accepted';
    invite.acceptedWorkspaceUserId = workspaceUserId;
    invite.acceptedAt = timestamp;
    invite.updatedAt = timestamp;
    invite.magicLinkSentAt = null;
    invite.magicLinkExpiresAt = null;
    (invite as WorkspaceInvite & { magicLinkTokenHash?: string | null }).magicLinkTokenHash = null;
    return structuredClone(invite);
  }

  async listAuditEvents(limit?: number): Promise<AuditEvent[]> {
    const events = structuredClone(this.auditEvents).sort(compareAuditEvents);
    return typeof limit === 'number' ? events.slice(0, limit) : events;
  }

  async createAuditEvent(input: {
    category: AuditEventCategory;
    action: AuditEventAction;
    targetType: AuditEventTargetType;
    targetId: string;
    actorUserId: string | null;
    actorName: string;
    actorRole: WorkspaceUserRole | 'system';
    summary: string;
    detail?: string | null;
  }): Promise<AuditEvent> {
    const event: AuditEvent = {
      id: crypto.randomUUID(),
      category: input.category,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      actorRole: input.actorRole,
      summary: input.summary,
      detail: input.detail ?? null,
      createdAt: nowIso(),
    };

    this.auditEvents.unshift(event);
    return structuredClone(event);
  }

  async createAuthSession(input: {
    workspaceUserId: string;
    tokenHash: string;
    expiresAt: string;
  }): Promise<AuthSession> {
    const timestamp = nowIso();
    const session: AuthSessionRow = {
      id: crypto.randomUUID(),
      workspaceUserId: input.workspaceUserId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      createdAt: timestamp,
      updatedAt: timestamp,
      lastSeenAt: timestamp,
      revokedAt: null,
    };

    this.authSessions.unshift(session);
    return structuredClone(mapAuthSessionRow(session));
  }

  async getAuthSessionByTokenHash(tokenHash: string): Promise<AuthSession | null> {
    const session = this.authSessions.find((entry) => entry.tokenHash === tokenHash && !entry.revokedAt);
    if (!session) return null;
    if (session.expiresAt <= nowIso()) return null;
    return structuredClone(mapAuthSessionRow(session));
  }

  async revokeAuthSession(id: string): Promise<void> {
    const session = this.authSessions.find((entry) => entry.id === id);
    if (!session) return;

    const timestamp = nowIso();
    session.revokedAt = timestamp;
    session.updatedAt = timestamp;
  }

  async touchAuthSession(id: string): Promise<AuthSession | null> {
    const session = this.authSessions.find((entry) => entry.id === id && !entry.revokedAt);
    if (!session) return null;
    if (session.expiresAt <= nowIso()) return null;

    const timestamp = nowIso();
    session.lastSeenAt = timestamp;
    session.updatedAt = timestamp;
    return structuredClone(mapAuthSessionRow(session));
  }

  async listLaunches(): Promise<Launch[]> {
    return this.launches
      .map((launch) => syncLaunchWithRuns(launch, this.participantRuns.filter((run) => run.launchId === launch.id)))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((launch) => structuredClone(launch));
  }

  async getLaunch(id: string): Promise<Launch | null> {
    const launch = this.launches.find((entry) => entry.id === id);
    if (!launch) return null;

    return structuredClone(syncLaunchWithRuns(launch, this.participantRuns.filter((run) => run.launchId === id)));
  }

  async createLaunch(input: LaunchInput): Promise<Launch | null> {
    const draft = this.scenarioDrafts.find((entry) => entry.id === input.scenarioDraftId && entry.approvalStatus === 'approved');
    if (!draft) return null;

    const timestamp = nowIso();
    const launch: Launch = {
      id: crypto.randomUUID(),
      scenarioDraftId: draft.id,
      name: draft.title,
      mode: draft.launchMode,
      audience: draft.audience,
      status: deriveBaseLaunchStatus(input.startsAt ?? draft.scheduledStartAt),
      startsAt: input.startsAt ?? draft.scheduledStartAt,
      participantsLabel: input.participantsLabel ?? draft.participantsLabel,
      scenarioBrief: buildScenarioBrief(draft),
      learningObjectives: draft.learningObjectives,
      tabletopPhase: defaultTabletopPhase(draft.launchMode),
      facilitatorNotes: '',
      reportCloseoutNotes: '',
      reportFollowUpText: '',
      reportClosedAt: null,
      reportClosedByUserId: null,
      reportClosedByName: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.launches.unshift(launch);
    return structuredClone(launch);
  }

  async updateLaunch(id: string, patch: LaunchPatch): Promise<Launch | null> {
    const launch = this.launches.find((entry) => entry.id === id);
    if (!launch) return null;

    if (patch.scenarioDraftId && patch.scenarioDraftId !== launch.scenarioDraftId) {
      const replacementDraft = this.scenarioDrafts.find(
        (entry) => entry.id === patch.scenarioDraftId && entry.approvalStatus === 'approved',
      );
      if (!replacementDraft) return null;
      launch.scenarioDraftId = replacementDraft.id;
      launch.name = replacementDraft.title;
      launch.mode = replacementDraft.launchMode;
      launch.audience = replacementDraft.audience;
      launch.learningObjectives = replacementDraft.learningObjectives;
      launch.scenarioBrief = buildScenarioBrief(replacementDraft);
    }

    launch.startsAt = patch.startsAt === undefined ? launch.startsAt : patch.startsAt;
    launch.participantsLabel = patch.participantsLabel === undefined ? launch.participantsLabel : patch.participantsLabel;
    launch.status = patch.status ?? deriveBaseLaunchStatus(launch.startsAt);
    launch.tabletopPhase = resolveTabletopPhase(
      launch.mode,
      patch.tabletopPhase === undefined ? launch.tabletopPhase : patch.tabletopPhase,
    );
    launch.facilitatorNotes =
      launch.mode === 'tabletop'
        ? patch.facilitatorNotes === undefined
          ? launch.facilitatorNotes
          : patch.facilitatorNotes
        : '';
    launch.updatedAt = nowIso();
    this.syncMemoryLaunchStatus(id);

    return structuredClone(this.launches.find((entry) => entry.id === id) ?? launch);
  }

  async updateReportReview(
    id: string,
    input: {
      closeoutNotes: string;
      followUpText: string;
      markClosed: boolean;
      actorUserId: string;
      actorName: string;
    },
  ): Promise<Launch | null> {
    const launch = this.launches.find((entry) => entry.id === id);
    if (!launch) return null;

    const timestamp = nowIso();
    launch.reportCloseoutNotes = input.closeoutNotes;
    launch.reportFollowUpText = input.followUpText;
    launch.reportClosedAt = input.markClosed ? timestamp : null;
    launch.reportClosedByUserId = input.markClosed ? input.actorUserId : null;
    launch.reportClosedByName = input.markClosed ? input.actorName : null;
    launch.updatedAt = timestamp;

    this.syncMemoryLaunchStatus(id);
    return structuredClone(this.launches.find((entry) => entry.id === id) ?? launch);
  }

  async listParticipantRuns(launchId?: string): Promise<ParticipantRun[]> {
    return structuredClone(
      this.participantRuns
        .filter((run) => !launchId || run.launchId === launchId)
        .sort(compareParticipantRuns),
    );
  }

  async getParticipantRun(id: string): Promise<ParticipantRun | null> {
    const run = this.participantRuns.find((entry) => entry.id === id);
    return run ? structuredClone(run) : null;
  }

  async createParticipantRun(input: ParticipantRunInput): Promise<ParticipantRun | null> {
    const launch = this.launches.find((entry) => entry.id === input.launchId);
    if (!launch) return null;

    const rosterMember = input.rosterMemberId
      ? this.rosterMembers.find((entry) => entry.id === input.rosterMemberId)
      : null;
    if (input.rosterMemberId && !rosterMember) {
      return null;
    }

    const timestamp = nowIso();
    const run: ParticipantRun = {
      id: crypto.randomUUID(),
      launchId: input.launchId,
      rosterMemberId: rosterMember?.id ?? null,
      participantName: rosterMember?.fullName ?? input.participantName,
      participantEmail: rosterMember?.email ?? input.participantEmail,
      participantRole: rosterMember?.roleTitle ?? input.participantRole,
      participantTeam: rosterMember?.team ?? input.participantTeam,
      status: 'assigned',
      firstAction: '',
      escalationChoice: '',
      impactAssessment: '',
      notes: '',
      policyAcknowledged: false,
      scorePercent: null,
      requiredActionsCompleted: 0,
      totalRequiredActions: TOTAL_REQUIRED_ACTIONS,
      dueAt: input.dueAt,
      startedAt: null,
      submittedAt: null,
      updatedAt: timestamp,
    };

    this.participantRuns.push(run);
    this.syncMemoryLaunchStatus(input.launchId);
    return structuredClone(run);
  }

  async updateParticipantRun(id: string, patch: ParticipantRunPatch): Promise<ParticipantRun | null> {
    const run = this.participantRuns.find((entry) => entry.id === id);
    if (!run) return null;

    const rosterMember =
      patch.rosterMemberId === undefined
        ? undefined
        : patch.rosterMemberId
          ? this.rosterMembers.find((entry) => entry.id === patch.rosterMemberId) ?? null
          : null;
    if (patch.rosterMemberId && !rosterMember) {
      return null;
    }

    const next = applyParticipantRunPatch(run, patch, rosterMember);
    Object.assign(run, next);
    this.syncMemoryLaunchStatus(run.launchId);
    return structuredClone(run);
  }

  private syncMemoryLaunchStatus(launchId: string) {
    const launch = this.launches.find((entry) => entry.id === launchId);
    if (!launch) return;

    const syncedLaunch = syncLaunchWithRuns(launch, this.participantRuns.filter((run) => run.launchId === launchId));
    Object.assign(launch, syncedLaunch);
  }

  private syncDocumentExtractionState(documentId: string) {
    const file = this.documentFiles.find((entry) => entry.documentId === documentId);
    const document = this.documents.find((entry) => entry.id === documentId);
    if (!file || !document) return;

    file.extractionStatus = deriveSourceExtractionStatus(this.suggestions.filter((entry) => entry.documentId === documentId));
    file.updatedAt = nowIso();
    document.updatedAt = file.updatedAt;
  }
}

export class D1ResilienceStore implements ResilienceStore {
  constructor(private readonly db: D1Database) {}

  async listSourceDocuments(): Promise<DocumentSummary[]> {
    const result = await this.db.prepare(
      `SELECT d.id, d.name, d.type, d.business_unit AS businessUnit, d.owner, d.effective_date AS effectiveDate,
              d.parse_status AS parseStatus, d.updated_at AS updatedAt,
              f.uploaded_file_name AS uploadedFileName, f.byte_size AS byteSize, f.storage_backend AS storageBackend,
              f.extraction_status AS extractionStatus,
              SUM(CASE WHEN s.status = 'pending_review' THEN 1 ELSE 0 END) AS pendingSuggestionCount
       FROM source_documents d
       LEFT JOIN source_document_files f ON f.document_id = d.id
       LEFT JOIN source_extraction_suggestions s ON s.document_id = d.id
       GROUP BY d.id, d.name, d.type, d.business_unit, d.owner, d.effective_date, d.parse_status,
                d.updated_at, f.uploaded_file_name, f.byte_size, f.storage_backend, f.extraction_status
       ORDER BY d.updated_at DESC, d.name ASC`,
    ).all<SourceDocumentListRow>();

    return (result.results ?? []).map(mapSourceDocumentListRow);
  }

  async getSourceDocument(id: string): Promise<SourceDocumentDetail | null> {
    const row = await this.db.prepare(
      `SELECT d.id, d.name, d.type, d.business_unit AS businessUnit, d.owner, d.effective_date AS effectiveDate,
              d.parse_status AS parseStatus, d.updated_at AS updatedAt,
              f.document_id AS documentId, f.uploaded_file_name AS uploadedFileName, f.mime_type AS mimeType,
              f.byte_size AS byteSize, f.storage_backend AS storageBackend, f.storage_object_key AS storageObjectKey,
              f.content_text AS contentText, f.content_excerpt AS contentExcerpt, f.extraction_note AS extractionNote,
              f.extraction_status AS extractionStatus, f.extraction_method AS extractionMethod,
              f.extraction_provider AS extractionProvider, f.extraction_version AS extractionVersion,
              f.extracted_at AS extractedAt, f.created_at AS createdAt, f.updated_at AS fileUpdatedAt
       FROM source_documents d
       LEFT JOIN source_document_files f ON f.document_id = d.id
       WHERE d.id = ?`,
    ).bind(id).first<
      SourceDocumentRow & {
        documentId: string | null;
        uploadedFileName: string | null;
        mimeType: string | null;
        byteSize: number | null;
        storageBackend: SourceStorageBackend | null;
        storageObjectKey: string | null;
        contentText: string | null;
        contentExcerpt: string | null;
        extractionNote: string | null;
        extractionStatus: SourceExtractionStatus | null;
        extractionMethod: SourceExtractionMethod | null;
        extractionProvider: SourceExtractionProvider | null;
        extractionVersion: string | null;
        extractedAt: string | null;
        createdAt: string | null;
        fileUpdatedAt: string | null;
      }
    >();

    if (!row) return null;

    const [suggestions, latestExtractionJob] = await Promise.all([
      this.listSourceSuggestionsForDocument(id),
      this.getLatestSourceDocumentExtractionJob(id),
    ]);

    return {
      id: row.id,
      name: row.name,
      type: row.type,
      businessUnit: row.businessUnit,
      owner: row.owner,
      effectiveDate: row.effectiveDate,
      parseStatus: row.parseStatus,
      storageStatus: row.uploadedFileName ? 'stored' : 'metadata_only',
      storageBackend: row.storageBackend,
      uploadedFileName: row.uploadedFileName,
      byteSize: row.byteSize,
      extractionStatus: row.extractionStatus ?? 'not_started',
      pendingSuggestionCount: suggestions.filter((suggestion) => suggestion.status === 'pending_review').length,
      updatedAt: row.updatedAt,
      mimeType: row.mimeType,
      storageObjectKey: row.storageObjectKey,
      contentExcerpt: row.contentExcerpt,
      extractionNote: row.extractionNote,
      extractionProvenance: buildExtractionProvenance(
        row.extractionMethod,
        row.extractionProvider,
        row.extractionVersion,
        row.extractedAt,
      ),
      extractionSuggestions: suggestions,
      latestExtractionJob,
    };
  }

  async createSourceDocument(input: SourceDocumentInput): Promise<DocumentSummary> {
    const document: SourceDocumentRow = {
      id: crypto.randomUUID(),
      updatedAt: nowIso(),
      ...input,
    };

    await this.db.prepare(
      `INSERT INTO source_documents (
        id, name, type, business_unit, owner, effective_date, parse_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      document.id,
      document.name,
      document.type,
      document.businessUnit,
      document.owner,
      document.effectiveDate,
      document.parseStatus,
      document.updatedAt,
      document.updatedAt,
    ).run();

    return buildDocumentSummary(document, [], []);
  }

  async uploadSourceDocument(input: SourceDocumentUploadInput): Promise<SourceDocumentDetail> {
    const timestamp = nowIso();
    const documentId = crypto.randomUUID();
    const prepared = prepareSourceUploadState(input, documentId);

    await this.db.prepare(
      `INSERT INTO source_documents (
        id, name, type, business_unit, owner, effective_date, parse_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      documentId,
      input.name,
      input.type,
      input.businessUnit,
      input.owner,
      input.effectiveDate,
      prepared.parseStatus,
      timestamp,
      timestamp,
    ).run();

    await this.db.prepare(
      `INSERT INTO source_document_files (
        document_id, uploaded_file_name, mime_type, byte_size, storage_backend, storage_object_key,
        content_text, content_excerpt, extraction_note, extraction_status,
        extraction_method, extraction_provider, extraction_version, extracted_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      documentId,
      input.fileName,
      input.mimeType,
      input.byteSize,
      input.storageBackend,
      input.storageObjectKey,
      input.contentText,
      prepared.contentExcerpt,
      prepared.extractionNote,
      prepared.extractionStatus,
      prepared.extractionProvenance?.method ?? null,
      prepared.extractionProvenance?.provider ?? null,
      prepared.extractionProvenance?.version ?? null,
      prepared.extractionProvenance?.generatedAt ?? null,
      timestamp,
      timestamp,
    ).run();

    if (prepared.suggestions.length > 0) {
      const statement = this.db.prepare(
        `INSERT INTO source_extraction_suggestions (
          id, document_id, bucket_id, name, source_snippet, confidence, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );

      for (const suggestion of prepared.suggestions) {
        await statement
          .bind(
            suggestion.id,
            suggestion.documentId,
            suggestion.bucketId,
            suggestion.name,
            suggestion.sourceSnippet,
            suggestion.confidence,
            suggestion.status,
            timestamp,
            timestamp,
          )
          .run();
      }
    }

    const detail = await this.getSourceDocument(documentId);
    if (!detail) {
      throw new Error('Uploaded source document could not be reloaded.');
    }
    return detail;
  }

  async queueSourceDocumentExtraction(
    id: string,
    input?: { note?: string | null },
  ): Promise<SourceDocumentDetail | null> {
    const detail = await this.getSourceDocument(id);
    if (!detail) return null;

    const latestJob = await this.getLatestSourceDocumentExtractionJob(id);
    if (latestJob && (latestJob.status === 'queued' || latestJob.status === 'processing')) {
      return detail;
    }

    const timestamp = nowIso();
    const jobId = crypto.randomUUID();

    await this.db.prepare(
      `INSERT INTO source_document_extraction_jobs (
        id, document_id, status, attempt_count, last_error, attempted_method, attempted_provider,
        attempted_version, created_at, updated_at, started_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(jobId, id, 'queued', 0, null, null, null, null, timestamp, timestamp, null, null).run();

    await this.db.prepare(
      `UPDATE source_document_files
       SET extraction_status = ?, extraction_note = ?, updated_at = ?
       WHERE document_id = ?`,
    ).bind('queued', input?.note ?? detail.extractionNote, timestamp, id).run();

    await this.db.prepare(
      `UPDATE source_documents
       SET updated_at = ?
       WHERE id = ?`,
    ).bind(timestamp, id).run();

    return this.getSourceDocument(id);
  }

  async applySourceDocumentExtraction(
    id: string,
    input: SourceDocumentExtractionUpdate,
  ): Promise<SourceDocumentDetail | null> {
    const detail = await this.getSourceDocument(id);
    if (!detail || !detail.uploadedFileName || !detail.mimeType) return null;

    const timestamp = nowIso();
    const prepared = prepareSourceExtractionState({
      documentId: id,
      fileName: detail.uploadedFileName,
      mimeType: detail.mimeType,
      contentText: input.contentText,
      extractionNote: input.extractionNote,
      extractionProvenance: input.extractionProvenance,
    });

    await this.db.prepare(
      `UPDATE source_document_files
       SET content_text = ?, content_excerpt = ?, extraction_note = ?, extraction_status = ?,
           extraction_method = ?, extraction_provider = ?, extraction_version = ?, extracted_at = ?, updated_at = ?
       WHERE document_id = ?`,
    ).bind(
      input.contentText,
      prepared.contentExcerpt,
      prepared.extractionNote,
      prepared.extractionStatus,
      prepared.extractionProvenance?.method ?? null,
      prepared.extractionProvenance?.provider ?? null,
      prepared.extractionProvenance?.version ?? null,
      prepared.extractionProvenance?.generatedAt ?? null,
      timestamp,
      id,
    ).run();

    await this.db.prepare(
      `UPDATE source_documents
       SET parse_status = ?, updated_at = ?
       WHERE id = ?`,
    ).bind(prepared.parseStatus, timestamp, id).run();

    await this.db.prepare('DELETE FROM source_extraction_suggestions WHERE document_id = ?').bind(id).run();

    if (prepared.suggestions.length > 0) {
      const statement = this.db.prepare(
        `INSERT INTO source_extraction_suggestions (
          id, document_id, bucket_id, name, source_snippet, confidence, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );

      for (const suggestion of prepared.suggestions) {
        await statement
          .bind(
            suggestion.id,
            suggestion.documentId,
            suggestion.bucketId,
            suggestion.name,
            suggestion.sourceSnippet,
            suggestion.confidence,
            suggestion.status,
            timestamp,
            timestamp,
          )
          .run();
      }
    }

    return this.getSourceDocument(id);
  }

  async getSourceDocumentExtractionJob(id: string): Promise<SourceExtractionJob | null> {
    const row = await this.db.prepare(
      `SELECT id, document_id AS documentId, status, attempt_count AS attemptCount, last_error AS lastError,
              attempted_method AS attemptedMethod, attempted_provider AS attemptedProvider,
              attempted_version AS attemptedVersion, created_at AS createdAt, updated_at AS updatedAt,
              started_at AS startedAt, completed_at AS completedAt
       FROM source_document_extraction_jobs
       WHERE id = ?`,
    ).bind(id).first<SourceExtractionJobRow>();

    return row ? mapSourceExtractionJobRow(row) : null;
  }

  async markSourceDocumentExtractionJobProcessing(id: string): Promise<SourceExtractionJob | null> {
    const current = await this.getSourceDocumentExtractionJob(id);
    if (!current) return null;

    const timestamp = nowIso();
    await this.db.prepare(
      `UPDATE source_document_extraction_jobs
       SET status = ?, attempt_count = ?, last_error = ?, started_at = ?, updated_at = ?
       WHERE id = ?`,
    ).bind('processing', current.attemptCount + 1, null, timestamp, timestamp, id).run();

    return this.getSourceDocumentExtractionJob(id);
  }

  async completeSourceDocumentExtractionJob(
    id: string,
    input: SourceDocumentExtractionJobCompletion,
  ): Promise<SourceDocumentDetail | null> {
    const current = await this.getSourceDocumentExtractionJob(id);
    if (!current) return null;

    const timestamp = nowIso();
    let detail: SourceDocumentDetail | null;

    if (input.status === 'completed' && input.contentText) {
      detail = await this.applySourceDocumentExtraction(current.documentId, {
        contentText: input.contentText,
        extractionNote: null,
        extractionProvenance: input.extractionProvenance ?? null,
      });
    } else {
      await this.db.prepare(
        `UPDATE source_document_files
         SET extraction_status = ?, extraction_note = ?, updated_at = ?
         WHERE document_id = ?`,
      ).bind('needs_attention', input.extractionNote, timestamp, current.documentId).run();

      await this.db.prepare(
        `UPDATE source_documents
         SET updated_at = ?
         WHERE id = ?`,
      ).bind(timestamp, current.documentId).run();

      detail = await this.getSourceDocument(current.documentId);
    }

    await this.db.prepare(
      `UPDATE source_document_extraction_jobs
       SET status = ?, last_error = ?, attempted_method = ?, attempted_provider = ?, attempted_version = ?,
           completed_at = ?, updated_at = ?
       WHERE id = ?`,
    ).bind(
      input.status,
      input.lastError ?? null,
      (input.attemptedProvenance ?? input.extractionProvenance ?? null)?.method ?? null,
      (input.attemptedProvenance ?? input.extractionProvenance ?? null)?.provider ?? null,
      (input.attemptedProvenance ?? input.extractionProvenance ?? null)?.version ?? null,
      timestamp,
      timestamp,
      id,
    ).run();

    return detail ? this.getSourceDocument(current.documentId) : null;
  }

  async updateSourceDocument(id: string, patch: SourceDocumentPatch): Promise<DocumentSummary | null> {
    const current = await this.db.prepare(
      `SELECT id, name, type, business_unit AS businessUnit, owner, effective_date AS effectiveDate,
              parse_status AS parseStatus, updated_at AS updatedAt
       FROM source_documents
       WHERE id = ?`,
    ).bind(id).first<SourceDocumentRow>();

    if (!current) return null;

    const next: SourceDocumentRow = {
      ...current,
      ...patch,
      updatedAt: nowIso(),
    };

    await this.db.prepare(
      `UPDATE source_documents
       SET name = ?, type = ?, business_unit = ?, owner = ?, effective_date = ?, parse_status = ?, updated_at = ?
       WHERE id = ?`,
    ).bind(
      next.name,
      next.type,
      next.businessUnit,
      next.owner,
      next.effectiveDate,
      next.parseStatus,
      next.updatedAt,
      id,
    ).run();

    const files = await this.listSourceDocuments();
    return files.find((document) => document.id === id) ?? buildDocumentSummary(next, [], []);
  }

  async updateSourceExtractionSuggestionStatus(
    suggestionId: string,
    status: SuggestionStatus,
  ): Promise<SourceExtractionSuggestion | null> {
    const current = await this.db.prepare(
      `SELECT id, document_id AS documentId, bucket_id AS bucketId, name, source_snippet AS sourceSnippet,
              confidence, status, created_at AS createdAt, updated_at AS updatedAt
       FROM source_extraction_suggestions
       WHERE id = ?`,
    ).bind(suggestionId).first<SourceExtractionSuggestionRow>();

    if (!current) return null;

    const updatedAt = nowIso();
    await this.db.prepare(
      `UPDATE source_extraction_suggestions
       SET status = ?, updated_at = ?
       WHERE id = ?`,
    ).bind(status, updatedAt, suggestionId).run();

    await this.syncDocumentExtractionState(current.documentId);

    return {
      id: current.id,
      documentId: current.documentId,
      bucketId: current.bucketId,
      name: current.name,
      sourceSnippet: current.sourceSnippet,
      confidence: current.confidence,
      status,
    };
  }

  async applySourceExtractionSuggestion(
    suggestionId: string,
  ): Promise<{ suggestion: SourceExtractionSuggestion; item: ContextItem | null } | null> {
    const current = await this.db.prepare(
      `SELECT id, document_id AS documentId, bucket_id AS bucketId, name, source_snippet AS sourceSnippet,
              confidence, status, created_at AS createdAt, updated_at AS updatedAt
       FROM source_extraction_suggestions
       WHERE id = ?`,
    ).bind(suggestionId).first<SourceExtractionSuggestionRow>();

    if (!current) return null;

    let item = await this.findContextItemByBucketAndName(current.bucketId, current.name);
    if (!item) {
      const sortResult = await this.db.prepare(
        'SELECT COALESCE(MAX(sort_order) + 1, 1) AS nextSortOrder FROM context_items WHERE bucket_id = ?',
      ).bind(current.bucketId).first<{ nextSortOrder: number }>();

      const createdItem: ContextItem = {
        id: crypto.randomUUID(),
        bucketId: current.bucketId,
        name: current.name,
        reviewState: 'needs_review',
        required: true,
      };

      const timestamp = nowIso();
      await this.db.prepare(
        `INSERT INTO context_items (
          id, bucket_id, name, review_state, required, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        createdItem.id,
        createdItem.bucketId,
        createdItem.name,
        createdItem.reviewState,
        1,
        sortResult?.nextSortOrder ?? 1,
        timestamp,
        timestamp,
      ).run();

      item = createdItem;
    }

    const suggestion = await this.updateSourceExtractionSuggestionStatus(suggestionId, 'applied');
    if (!suggestion) return null;

    return { suggestion, item };
  }

  async listContextBuckets(): Promise<ContextBucket[]> {
    const bucketResult = await this.db.prepare(
      `SELECT id, label, sort_order AS sortOrder
       FROM context_buckets
       ORDER BY sort_order ASC, label ASC`,
    ).all<ContextBucketRow>();

    const itemResult = await this.db.prepare(
      `SELECT id, bucket_id AS bucketId, name, review_state AS reviewState, required, sort_order AS sortOrder
       FROM context_items
       ORDER BY sort_order ASC, name ASC`,
    ).all<ContextItemRow>();

    const itemsByBucket = new Map<string, ContextItem[]>();
    for (const row of itemResult.results ?? []) {
      const item = mapContextItemRow(row);
      const items = itemsByBucket.get(item.bucketId) ?? [];
      items.push(item);
      itemsByBucket.set(item.bucketId, items);
    }

    return (bucketResult.results ?? []).map((bucket) => ({
      id: bucket.id,
      label: bucket.label,
      items: itemsByBucket.get(bucket.id) ?? [],
    }));
  }

  async createContextItem(input: ContextItemInput): Promise<ContextItem | null> {
    const bucket = await this.db.prepare('SELECT id FROM context_buckets WHERE id = ?').bind(input.bucketId).first<{ id: string }>();
    if (!bucket) return null;

    const sortResult = await this.db.prepare(
      'SELECT COALESCE(MAX(sort_order) + 1, 1) AS nextSortOrder FROM context_items WHERE bucket_id = ?',
    ).bind(input.bucketId).first<{ nextSortOrder: number }>();

    const timestamp = nowIso();
    const item: ContextItem = {
      id: crypto.randomUUID(),
      bucketId: input.bucketId,
      name: input.name,
      reviewState: input.reviewState,
      required: input.required,
    };

    await this.db.prepare(
      `INSERT INTO context_items (
        id, bucket_id, name, review_state, required, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      item.id,
      item.bucketId,
      item.name,
      item.reviewState,
      item.required ? 1 : 0,
      sortResult?.nextSortOrder ?? 1,
      timestamp,
      timestamp,
    ).run();

    return item;
  }

  async updateContextItem(id: string, patch: ContextItemPatch): Promise<ContextItem | null> {
    const current = await this.db.prepare(
      `SELECT id, bucket_id AS bucketId, name, review_state AS reviewState, required, sort_order AS sortOrder
       FROM context_items
       WHERE id = ?`,
    ).bind(id).first<ContextItemRow>();

    if (!current) return null;

    const next: ContextItem = {
      ...mapContextItemRow(current),
      ...patch,
      bucketId: patch.bucketId ?? current.bucketId,
      name: patch.name ?? current.name,
      reviewState: patch.reviewState ?? current.reviewState,
      required: patch.required ?? Boolean(current.required),
    };

    await this.db.prepare(
      `UPDATE context_items
       SET bucket_id = ?, name = ?, review_state = ?, required = ?, updated_at = ?
       WHERE id = ?`,
    ).bind(
      next.bucketId,
      next.name,
      next.reviewState,
      next.required ? 1 : 0,
      nowIso(),
      id,
    ).run();

    return next;
  }

  async listScenarioDrafts(): Promise<ScenarioDraft[]> {
    const result = await this.db.prepare(
      `SELECT id, title, template_id AS templateId, audience, launch_mode AS launchMode, difficulty,
              learning_objectives AS learningObjectives, approval_status AS approvalStatus,
              reviewer_notes AS reviewerNotes, reviewed_at AS reviewedAt,
              reviewed_by_user_id AS reviewedByUserId, reviewed_by_name AS reviewedByName,
              scheduled_start_at AS scheduledStartAt, participants_label AS participantsLabel,
              created_at AS createdAt, updated_at AS updatedAt
       FROM scenario_drafts
       ORDER BY updated_at DESC, title ASC`,
    ).all<ScenarioDraftRow>();

    return (result.results ?? []).map(mapScenarioDraftRow);
  }

  async getScenarioDraft(id: string): Promise<ScenarioDraft | null> {
    const row = await this.db.prepare(
      `SELECT id, title, template_id AS templateId, audience, launch_mode AS launchMode, difficulty,
              learning_objectives AS learningObjectives, approval_status AS approvalStatus,
              reviewer_notes AS reviewerNotes, reviewed_at AS reviewedAt,
              reviewed_by_user_id AS reviewedByUserId, reviewed_by_name AS reviewedByName,
              scheduled_start_at AS scheduledStartAt, participants_label AS participantsLabel,
              created_at AS createdAt, updated_at AS updatedAt
       FROM scenario_drafts
       WHERE id = ?`,
    ).bind(id).first<ScenarioDraftRow>();

    return row ? mapScenarioDraftRow(row) : null;
  }

  async createScenarioDraft(input: ScenarioDraftInput): Promise<ScenarioDraft> {
    const timestamp = nowIso();
    const draft: ScenarioDraft = {
      id: crypto.randomUUID(),
      createdAt: timestamp,
      updatedAt: timestamp,
      ...input,
      reviewerNotes: input.reviewerNotes ?? null,
      reviewedAt: input.reviewedAt ?? null,
      reviewedByUserId: input.reviewedByUserId ?? null,
      reviewedByName: input.reviewedByName ?? null,
    };

    await this.db.prepare(
      `INSERT INTO scenario_drafts (
        id, title, template_id, audience, launch_mode, difficulty, learning_objectives,
        approval_status, reviewer_notes, reviewed_at, reviewed_by_user_id, reviewed_by_name,
        scheduled_start_at, participants_label, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      draft.id,
      draft.title,
      draft.templateId,
      draft.audience,
      draft.launchMode,
      draft.difficulty,
      draft.learningObjectives,
      draft.approvalStatus,
      draft.reviewerNotes,
      draft.reviewedAt,
      draft.reviewedByUserId,
      draft.reviewedByName,
      draft.scheduledStartAt,
      draft.participantsLabel,
      draft.createdAt,
      draft.updatedAt,
    ).run();

    return draft;
  }

  async updateScenarioDraft(id: string, patch: ScenarioDraftPatch): Promise<ScenarioDraft | null> {
    const current = await this.db.prepare(
      `SELECT id, title, template_id AS templateId, audience, launch_mode AS launchMode, difficulty,
              learning_objectives AS learningObjectives, approval_status AS approvalStatus,
              reviewer_notes AS reviewerNotes, reviewed_at AS reviewedAt,
              reviewed_by_user_id AS reviewedByUserId, reviewed_by_name AS reviewedByName,
              scheduled_start_at AS scheduledStartAt, participants_label AS participantsLabel,
              created_at AS createdAt, updated_at AS updatedAt
       FROM scenario_drafts
       WHERE id = ?`,
    ).bind(id).first<ScenarioDraftRow>();

    if (!current) return null;

    const next: ScenarioDraft = {
      ...mapScenarioDraftRow(current),
      ...patch,
      updatedAt: nowIso(),
      reviewerNotes: patch.reviewerNotes === undefined ? current.reviewerNotes : patch.reviewerNotes,
      reviewedAt: patch.reviewedAt === undefined ? current.reviewedAt : patch.reviewedAt,
      reviewedByUserId: patch.reviewedByUserId === undefined ? current.reviewedByUserId : patch.reviewedByUserId,
      reviewedByName: patch.reviewedByName === undefined ? current.reviewedByName : patch.reviewedByName,
      scheduledStartAt: patch.scheduledStartAt === undefined ? current.scheduledStartAt : patch.scheduledStartAt,
      participantsLabel: patch.participantsLabel === undefined ? current.participantsLabel : patch.participantsLabel,
    };

    await this.db.prepare(
      `UPDATE scenario_drafts
       SET title = ?, template_id = ?, audience = ?, launch_mode = ?, difficulty = ?, learning_objectives = ?,
           approval_status = ?, reviewer_notes = ?, reviewed_at = ?, reviewed_by_user_id = ?, reviewed_by_name = ?,
           scheduled_start_at = ?, participants_label = ?, updated_at = ?
       WHERE id = ?`,
    ).bind(
      next.title,
      next.templateId,
      next.audience,
      next.launchMode,
      next.difficulty,
      next.learningObjectives,
      next.approvalStatus,
      next.reviewerNotes,
      next.reviewedAt,
      next.reviewedByUserId,
      next.reviewedByName,
      next.scheduledStartAt,
      next.participantsLabel,
      next.updatedAt,
      id,
    ).run();

    return next;
  }

  async listRosterMembers(): Promise<RosterMember[]> {
    const result = await this.db.prepare(
      `SELECT id, full_name AS fullName, email, role_title AS roleTitle, team,
              manager_name AS managerName, status, created_at AS createdAt, updated_at AS updatedAt
       FROM roster_members
       ORDER BY full_name ASC, updated_at DESC`,
    ).all<RosterMemberRow>();

    return (result.results ?? []).map(mapRosterMemberRow).sort(compareRosterMembers);
  }

  async getRosterMember(id: string): Promise<RosterMember | null> {
    const row = await this.db.prepare(
      `SELECT id, full_name AS fullName, email, role_title AS roleTitle, team,
              manager_name AS managerName, status, created_at AS createdAt, updated_at AS updatedAt
       FROM roster_members
       WHERE id = ?`,
    ).bind(id).first<RosterMemberRow>();

    return row ? mapRosterMemberRow(row) : null;
  }

  async createRosterMember(input: RosterMemberInput): Promise<RosterMember> {
    const timestamp = nowIso();
    const member: RosterMember = {
      id: crypto.randomUUID(),
      ...input,
      updatedAt: timestamp,
    };

    await this.db.prepare(
      `INSERT INTO roster_members (
        id, full_name, email, role_title, team, manager_name, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      member.id,
      member.fullName,
      member.email,
      member.roleTitle,
      member.team,
      member.managerName,
      member.status,
      timestamp,
      member.updatedAt,
    ).run();

    return member;
  }

  async updateRosterMember(id: string, patch: RosterMemberPatch): Promise<RosterMember | null> {
    const current = await this.getRosterMember(id);
    if (!current) return null;

    const next: RosterMember = {
      ...current,
      ...patch,
      managerName: patch.managerName === undefined ? current.managerName : patch.managerName,
      updatedAt: nowIso(),
    };

    await this.db.prepare(
      `UPDATE roster_members
       SET full_name = ?, email = ?, role_title = ?, team = ?, manager_name = ?, status = ?, updated_at = ?
       WHERE id = ?`,
    ).bind(
      next.fullName,
      next.email,
      next.roleTitle,
      next.team,
      next.managerName,
      next.status,
      next.updatedAt,
      id,
    ).run();

    return next;
  }

  async listWorkspaceUsers(): Promise<WorkspaceUser[]> {
    const result = await this.db.prepare(
      `SELECT id, full_name AS fullName, email, role, capabilities_json AS capabilitiesJson,
              scope_teams_json AS scopeTeamsJson, roster_member_id AS rosterMemberId,
              status, created_at AS createdAt, updated_at AS updatedAt
       FROM workspace_users
       ORDER BY full_name ASC, updated_at DESC`,
    ).all<WorkspaceUserRow>();

    return (result.results ?? []).map(mapWorkspaceUserRow).sort(compareWorkspaceUsers);
  }

  async getWorkspaceUser(id: string): Promise<WorkspaceUser | null> {
    const row = await this.db.prepare(
      `SELECT id, full_name AS fullName, email, role, capabilities_json AS capabilitiesJson,
              scope_teams_json AS scopeTeamsJson, roster_member_id AS rosterMemberId,
              status, created_at AS createdAt, updated_at AS updatedAt
       FROM workspace_users
       WHERE id = ?`,
    ).bind(id).first<WorkspaceUserRow>();

    return row ? mapWorkspaceUserRow(row) : null;
  }

  async getWorkspaceUserByEmail(email: string): Promise<WorkspaceUser | null> {
    const row = await this.db.prepare(
      `SELECT id, full_name AS fullName, email, role, capabilities_json AS capabilitiesJson,
              scope_teams_json AS scopeTeamsJson, roster_member_id AS rosterMemberId,
              status, created_at AS createdAt, updated_at AS updatedAt
       FROM workspace_users
       WHERE lower(email) = lower(?)`,
    ).bind(email.trim()).first<WorkspaceUserRow>();

    return row ? mapWorkspaceUserRow(row) : null;
  }

  async createWorkspaceUser(input: WorkspaceUserInput): Promise<WorkspaceUser> {
    const user: WorkspaceUser = {
      id: crypto.randomUUID(),
      fullName: input.fullName,
      email: input.email,
      role: input.role,
      capabilities: input.capabilities,
      scopeTeams: input.scopeTeams,
      rosterMemberId: input.rosterMemberId,
      status: input.status,
      updatedAt: nowIso(),
    };

    await this.db.prepare(
      `INSERT INTO workspace_users (
        id,
        full_name,
        email,
        role,
        capabilities_json,
        scope_teams_json,
        roster_member_id,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      user.id,
      user.fullName,
      user.email,
      user.role,
      JSON.stringify(user.capabilities),
      JSON.stringify(user.scopeTeams),
      user.rosterMemberId,
      user.status,
      user.updatedAt,
      user.updatedAt,
    ).run();

    return user;
  }

  async updateWorkspaceUser(id: string, patch: WorkspaceUserPatch): Promise<WorkspaceUser | null> {
    const current = await this.getWorkspaceUser(id);
    if (!current) return null;

    const next: WorkspaceUser = {
      ...current,
      ...patch,
      capabilities: patch.capabilities ?? current.capabilities,
      scopeTeams: patch.scopeTeams ?? current.scopeTeams,
      rosterMemberId: patch.rosterMemberId === undefined ? current.rosterMemberId : patch.rosterMemberId,
      updatedAt: nowIso(),
    };

    await this.db.prepare(
      `UPDATE workspace_users
       SET full_name = ?, email = ?, role = ?, capabilities_json = ?, scope_teams_json = ?, roster_member_id = ?, status = ?, updated_at = ?
       WHERE id = ?`,
    ).bind(
      next.fullName,
      next.email,
      next.role,
      JSON.stringify(next.capabilities),
      JSON.stringify(next.scopeTeams),
      next.rosterMemberId,
      next.status,
      next.updatedAt,
      id,
    ).run();

    return next;
  }

  async listWorkspaceInvites(): Promise<WorkspaceInvite[]> {
    const result = await this.db.prepare(
      `SELECT id, email, full_name AS fullName, role, capabilities_json AS capabilitiesJson,
              scope_teams_json AS scopeTeamsJson,
              roster_member_id AS rosterMemberId, status, invited_by_user_id AS invitedByUserId,
              accepted_workspace_user_id AS acceptedWorkspaceUserId, created_at AS createdAt,
              updated_at AS updatedAt, accepted_at AS acceptedAt, revoked_at AS revokedAt,
              magic_link_token_hash AS magicLinkTokenHash, magic_link_expires_at AS magicLinkExpiresAt,
              magic_link_sent_at AS magicLinkSentAt
       FROM workspace_invites
       ORDER BY updated_at DESC, email ASC`,
    ).all<WorkspaceInviteRow>();

    return (result.results ?? []).map(mapWorkspaceInviteRow).sort(compareWorkspaceInvites);
  }

  async createWorkspaceInvite(input: WorkspaceInviteInput & { invitedByUserId: string | null }): Promise<WorkspaceInvite> {
    const invite: WorkspaceInvite = {
      id: crypto.randomUUID(),
      email: input.email,
      fullName: input.fullName,
      role: input.role,
      capabilities: input.capabilities,
      scopeTeams: input.scopeTeams,
      rosterMemberId: input.rosterMemberId,
      status: 'pending',
      invitedByUserId: input.invitedByUserId,
      acceptedWorkspaceUserId: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      acceptedAt: null,
      magicLinkSentAt: null,
      magicLinkExpiresAt: null,
    };

    await this.db.prepare(
      `INSERT INTO workspace_invites (
        id,
        email,
        full_name,
        role,
        capabilities_json,
        scope_teams_json,
        roster_member_id,
        status,
        invited_by_user_id,
      accepted_workspace_user_id,
      created_at,
      updated_at,
      accepted_at,
      revoked_at,
      magic_link_token_hash,
      magic_link_expires_at,
      magic_link_sent_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      invite.id,
      invite.email,
      invite.fullName,
      invite.role,
      JSON.stringify(invite.capabilities),
      JSON.stringify(invite.scopeTeams),
      invite.rosterMemberId,
      invite.status,
      invite.invitedByUserId,
      invite.acceptedWorkspaceUserId,
      invite.createdAt,
      invite.updatedAt,
      invite.acceptedAt,
      null,
      null,
      null,
      null,
    ).run();

    return invite;
  }

  async updateWorkspaceInvite(id: string, patch: WorkspaceInvitePatch): Promise<WorkspaceInvite | null> {
    const current = await this.db.prepare(
      `SELECT id, email, full_name AS fullName, role, capabilities_json AS capabilitiesJson,
              scope_teams_json AS scopeTeamsJson,
              roster_member_id AS rosterMemberId, status, invited_by_user_id AS invitedByUserId,
              accepted_workspace_user_id AS acceptedWorkspaceUserId, created_at AS createdAt,
              updated_at AS updatedAt, accepted_at AS acceptedAt, revoked_at AS revokedAt,
              magic_link_token_hash AS magicLinkTokenHash, magic_link_expires_at AS magicLinkExpiresAt,
              magic_link_sent_at AS magicLinkSentAt
       FROM workspace_invites
       WHERE id = ?`,
    ).bind(id).first<WorkspaceInviteRow>();

    if (!current) return null;
    const invite = mapWorkspaceInviteRow(current);

    if (patch.status === 'revoked') {
      const timestamp = nowIso();
      await this.db.prepare(
        `UPDATE workspace_invites
         SET status = ?, updated_at = ?, revoked_at = ?, magic_link_token_hash = ?, magic_link_expires_at = ?, magic_link_sent_at = ?
         WHERE id = ?`,
      ).bind('revoked', timestamp, timestamp, null, null, null, id).run();

      return {
        ...invite,
        status: 'revoked',
        updatedAt: timestamp,
      };
    }

    if (patch.status === 'pending') {
      const timestamp = nowIso();
      await this.db.prepare(
        `UPDATE workspace_invites
         SET status = ?, updated_at = ?, accepted_workspace_user_id = ?, accepted_at = ?, revoked_at = ?, magic_link_token_hash = ?, magic_link_expires_at = ?, magic_link_sent_at = ?
         WHERE id = ?`,
      ).bind('pending', timestamp, null, null, null, null, null, null, id).run();

      return {
        ...invite,
        status: 'pending',
        acceptedWorkspaceUserId: null,
        acceptedAt: null,
        updatedAt: timestamp,
      };
    }

    return invite;
  }

  async issueWorkspaceInviteMagicLink(
    id: string,
    input: { tokenHash: string; expiresAt: string },
  ): Promise<WorkspaceInvite | null> {
    const timestamp = nowIso();
    await this.db.prepare(
      `UPDATE workspace_invites
       SET magic_link_token_hash = ?, magic_link_expires_at = ?, magic_link_sent_at = ?, updated_at = ?
       WHERE id = ?`,
    ).bind(input.tokenHash, input.expiresAt, timestamp, timestamp, id).run();

    const row = await this.db.prepare(
      `SELECT id, email, full_name AS fullName, role, capabilities_json AS capabilitiesJson,
              scope_teams_json AS scopeTeamsJson,
              roster_member_id AS rosterMemberId, status, invited_by_user_id AS invitedByUserId,
              accepted_workspace_user_id AS acceptedWorkspaceUserId, created_at AS createdAt,
              updated_at AS updatedAt, accepted_at AS acceptedAt, revoked_at AS revokedAt,
              magic_link_token_hash AS magicLinkTokenHash, magic_link_expires_at AS magicLinkExpiresAt,
              magic_link_sent_at AS magicLinkSentAt
       FROM workspace_invites
       WHERE id = ?`,
    ).bind(id).first<WorkspaceInviteRow>();

    return row ? mapWorkspaceInviteRow(row) : null;
  }

  async getWorkspaceInviteByMagicLinkTokenHash(tokenHash: string): Promise<WorkspaceInvite | null> {
    const row = await this.db.prepare(
      `SELECT id, email, full_name AS fullName, role, capabilities_json AS capabilitiesJson,
              scope_teams_json AS scopeTeamsJson,
              roster_member_id AS rosterMemberId, status, invited_by_user_id AS invitedByUserId,
              accepted_workspace_user_id AS acceptedWorkspaceUserId, created_at AS createdAt,
              updated_at AS updatedAt, accepted_at AS acceptedAt, revoked_at AS revokedAt,
              magic_link_token_hash AS magicLinkTokenHash, magic_link_expires_at AS magicLinkExpiresAt,
              magic_link_sent_at AS magicLinkSentAt
       FROM workspace_invites
       WHERE magic_link_token_hash = ? AND status = 'pending'
       ORDER BY updated_at DESC
       LIMIT 1`,
    ).bind(tokenHash).first<WorkspaceInviteRow>();

    if (!row) return null;
    const invite = mapWorkspaceInviteRow(row);
    if (invite.magicLinkExpiresAt && invite.magicLinkExpiresAt <= nowIso()) return null;
    return invite;
  }

  async getPendingWorkspaceInviteByEmail(email: string): Promise<WorkspaceInvite | null> {
    const row = await this.db.prepare(
      `SELECT id, email, full_name AS fullName, role, capabilities_json AS capabilitiesJson,
              scope_teams_json AS scopeTeamsJson,
              roster_member_id AS rosterMemberId, status, invited_by_user_id AS invitedByUserId,
              accepted_workspace_user_id AS acceptedWorkspaceUserId, created_at AS createdAt,
              updated_at AS updatedAt, accepted_at AS acceptedAt, revoked_at AS revokedAt,
              magic_link_token_hash AS magicLinkTokenHash, magic_link_expires_at AS magicLinkExpiresAt,
              magic_link_sent_at AS magicLinkSentAt
       FROM workspace_invites
       WHERE lower(email) = lower(?) AND status = 'pending'
       ORDER BY updated_at DESC
       LIMIT 1`,
    ).bind(email.trim()).first<WorkspaceInviteRow>();

    return row ? mapWorkspaceInviteRow(row) : null;
  }

  async acceptWorkspaceInvite(id: string, workspaceUserId: string): Promise<WorkspaceInvite | null> {
    const timestamp = nowIso();
    await this.db.prepare(
      `UPDATE workspace_invites
       SET status = ?, accepted_workspace_user_id = ?, accepted_at = ?, updated_at = ?, magic_link_token_hash = ?, magic_link_expires_at = ?, magic_link_sent_at = ?
       WHERE id = ?`,
    ).bind('accepted', workspaceUserId, timestamp, timestamp, null, null, null, id).run();

    const row = await this.db.prepare(
      `SELECT id, email, full_name AS fullName, role, capabilities_json AS capabilitiesJson,
              scope_teams_json AS scopeTeamsJson,
              roster_member_id AS rosterMemberId, status, invited_by_user_id AS invitedByUserId,
              accepted_workspace_user_id AS acceptedWorkspaceUserId, created_at AS createdAt,
              updated_at AS updatedAt, accepted_at AS acceptedAt, revoked_at AS revokedAt,
              magic_link_token_hash AS magicLinkTokenHash, magic_link_expires_at AS magicLinkExpiresAt,
              magic_link_sent_at AS magicLinkSentAt
       FROM workspace_invites
       WHERE id = ?`,
    ).bind(id).first<WorkspaceInviteRow>();

    return row ? mapWorkspaceInviteRow(row) : null;
  }

  async listAuditEvents(limit?: number): Promise<AuditEvent[]> {
    const resolvedLimit = typeof limit === 'number' ? Math.max(1, limit) : 50;
    const result = await this.db.prepare(
      `SELECT id, category, action, target_type AS targetType, target_id AS targetId,
              actor_user_id AS actorUserId, actor_name AS actorName, actor_role AS actorRole,
              summary, detail, created_at AS createdAt
       FROM audit_events
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
    ).bind(resolvedLimit).all<AuditEventRow>();

    return (result.results ?? []).map(mapAuditEventRow).sort(compareAuditEvents);
  }

  async createAuditEvent(input: {
    category: AuditEventCategory;
    action: AuditEventAction;
    targetType: AuditEventTargetType;
    targetId: string;
    actorUserId: string | null;
    actorName: string;
    actorRole: WorkspaceUserRole | 'system';
    summary: string;
    detail?: string | null;
  }): Promise<AuditEvent> {
    const event: AuditEvent = {
      id: crypto.randomUUID(),
      category: input.category,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      actorRole: input.actorRole,
      summary: input.summary,
      detail: input.detail ?? null,
      createdAt: nowIso(),
    };

    await this.db.prepare(
      `INSERT INTO audit_events (
        id,
        category,
        action,
        target_type,
        target_id,
        actor_user_id,
        actor_name,
        actor_role,
        summary,
        detail,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      event.id,
      event.category,
      event.action,
      event.targetType,
      event.targetId,
      event.actorUserId,
      event.actorName,
      event.actorRole,
      event.summary,
      event.detail,
      event.createdAt,
    ).run();

    return event;
  }

  async createAuthSession(input: {
    workspaceUserId: string;
    tokenHash: string;
    expiresAt: string;
  }): Promise<AuthSession> {
    const session: AuthSession = {
      id: crypto.randomUUID(),
      workspaceUserId: input.workspaceUserId,
      expiresAt: input.expiresAt,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      lastSeenAt: nowIso(),
    };

    await this.db.prepare(
      `INSERT INTO auth_sessions (
        id,
        workspace_user_id,
        token_hash,
        expires_at,
        created_at,
        updated_at,
        last_seen_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      session.id,
      session.workspaceUserId,
      input.tokenHash,
      session.expiresAt,
      session.createdAt,
      session.updatedAt,
      session.lastSeenAt,
    ).run();

    return session;
  }

  async getAuthSessionByTokenHash(tokenHash: string): Promise<AuthSession | null> {
    const row = await this.db.prepare(
      `SELECT id, workspace_user_id AS workspaceUserId, token_hash AS tokenHash, expires_at AS expiresAt,
              created_at AS createdAt, updated_at AS updatedAt, last_seen_at AS lastSeenAt, revoked_at AS revokedAt
       FROM auth_sessions
       WHERE token_hash = ?
       LIMIT 1`,
    ).bind(tokenHash).first<AuthSessionRow>();

    if (!row || row.revokedAt || row.expiresAt <= nowIso()) return null;
    return mapAuthSessionRow(row);
  }

  async revokeAuthSession(id: string): Promise<void> {
    const timestamp = nowIso();
    await this.db.prepare(
      `UPDATE auth_sessions
       SET revoked_at = ?, updated_at = ?
       WHERE id = ?`,
    ).bind(timestamp, timestamp, id).run();
  }

  async touchAuthSession(id: string): Promise<AuthSession | null> {
    const timestamp = nowIso();
    await this.db.prepare(
      `UPDATE auth_sessions
       SET last_seen_at = ?, updated_at = ?
       WHERE id = ? AND revoked_at IS NULL AND expires_at > ?`,
    ).bind(timestamp, timestamp, id, timestamp).run();

    const row = await this.db.prepare(
      `SELECT id, workspace_user_id AS workspaceUserId, token_hash AS tokenHash, expires_at AS expiresAt,
              created_at AS createdAt, updated_at AS updatedAt, last_seen_at AS lastSeenAt, revoked_at AS revokedAt
       FROM auth_sessions
       WHERE id = ?
       LIMIT 1`,
    ).bind(id).first<AuthSessionRow>();

    if (!row || row.revokedAt || row.expiresAt <= nowIso()) return null;
    return mapAuthSessionRow(row);
  }

  async listLaunches(): Promise<Launch[]> {
    const launches = await this.fetchLaunchRows();
    const participantRuns = await this.listParticipantRuns();
    const runsByLaunch = groupParticipantRunsByLaunch(participantRuns);

    return launches
      .map((launch) => syncLaunchWithRuns(launch, runsByLaunch.get(launch.id) ?? []))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async getLaunch(id: string): Promise<Launch | null> {
    const launchRow = await this.db.prepare(
      `SELECT id, scenario_draft_id AS scenarioDraftId, name, mode, audience, status,
              starts_at AS startsAt, participants_label AS participantsLabel,
              scenario_brief AS scenarioBrief, learning_objectives AS learningObjectives,
              tabletop_phase AS tabletopPhase, facilitator_notes AS facilitatorNotes,
              report_closeout_notes AS reportCloseoutNotes, report_follow_up_text AS reportFollowUpText,
              report_closed_at AS reportClosedAt, report_closed_by_user_id AS reportClosedByUserId,
              report_closed_by_name AS reportClosedByName,
              created_at AS createdAt, updated_at AS updatedAt
       FROM launches
       WHERE id = ?`,
    ).bind(id).first<LaunchRow>();

    if (!launchRow) return null;

    const runs = await this.listParticipantRuns(id);
    return syncLaunchWithRuns(mapLaunchRow(launchRow), runs);
  }

  async createLaunch(input: LaunchInput): Promise<Launch | null> {
    const draft = await this.db.prepare(
      `SELECT id, title, template_id AS templateId, audience, launch_mode AS launchMode, difficulty,
              learning_objectives AS learningObjectives, approval_status AS approvalStatus,
              reviewer_notes AS reviewerNotes, reviewed_at AS reviewedAt,
              reviewed_by_user_id AS reviewedByUserId, reviewed_by_name AS reviewedByName,
              scheduled_start_at AS scheduledStartAt, participants_label AS participantsLabel,
              created_at AS createdAt, updated_at AS updatedAt
       FROM scenario_drafts
       WHERE id = ?`,
    ).bind(input.scenarioDraftId).first<ScenarioDraftRow>();

    if (!draft || draft.approvalStatus !== 'approved') return null;

    const scenarioDraft = mapScenarioDraftRow(draft);
    const timestamp = nowIso();
    const launch: Launch = {
      id: crypto.randomUUID(),
      scenarioDraftId: scenarioDraft.id,
      name: scenarioDraft.title,
      mode: scenarioDraft.launchMode,
      audience: scenarioDraft.audience,
      status: deriveBaseLaunchStatus(input.startsAt ?? scenarioDraft.scheduledStartAt),
      startsAt: input.startsAt ?? scenarioDraft.scheduledStartAt,
      participantsLabel: input.participantsLabel ?? scenarioDraft.participantsLabel,
      scenarioBrief: buildScenarioBrief(scenarioDraft),
      learningObjectives: scenarioDraft.learningObjectives,
      tabletopPhase: defaultTabletopPhase(scenarioDraft.launchMode),
      facilitatorNotes: '',
      reportCloseoutNotes: '',
      reportFollowUpText: '',
      reportClosedAt: null,
      reportClosedByUserId: null,
      reportClosedByName: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.db.prepare(
      `INSERT INTO launches (
        id, scenario_draft_id, name, mode, audience, status, starts_at, participants_label,
        scenario_brief, learning_objectives, tabletop_phase, facilitator_notes,
        report_closeout_notes, report_follow_up_text, report_closed_at, report_closed_by_user_id, report_closed_by_name,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      launch.id,
      launch.scenarioDraftId,
      launch.name,
      launch.mode,
      launch.audience,
      launch.status,
      launch.startsAt,
      launch.participantsLabel,
      launch.scenarioBrief,
      launch.learningObjectives,
      launch.tabletopPhase,
      launch.facilitatorNotes,
      launch.reportCloseoutNotes,
      launch.reportFollowUpText,
      launch.reportClosedAt,
      launch.reportClosedByUserId,
      launch.reportClosedByName,
      launch.createdAt,
      launch.updatedAt,
    ).run();

    return launch;
  }

  async updateLaunch(id: string, patch: LaunchPatch): Promise<Launch | null> {
    const current = await this.getLaunch(id);
    if (!current) return null;

    let nextDraftId = current.scenarioDraftId;
    let nextName = current.name;
    let nextMode = current.mode;
    let nextAudience = current.audience;
    let nextLearningObjectives = current.learningObjectives;
    let nextScenarioBrief = current.scenarioBrief;

    if (patch.scenarioDraftId && patch.scenarioDraftId !== current.scenarioDraftId) {
      const replacementDraft = await this.db.prepare(
        `SELECT id, title, template_id AS templateId, audience, launch_mode AS launchMode, difficulty,
                learning_objectives AS learningObjectives, approval_status AS approvalStatus,
                reviewer_notes AS reviewerNotes, reviewed_at AS reviewedAt,
                reviewed_by_user_id AS reviewedByUserId, reviewed_by_name AS reviewedByName,
                scheduled_start_at AS scheduledStartAt, participants_label AS participantsLabel,
                created_at AS createdAt, updated_at AS updatedAt
         FROM scenario_drafts
         WHERE id = ?`,
      ).bind(patch.scenarioDraftId).first<ScenarioDraftRow>();

      if (!replacementDraft || replacementDraft.approvalStatus !== 'approved') return null;

      const mappedDraft = mapScenarioDraftRow(replacementDraft);
      nextDraftId = mappedDraft.id;
      nextName = mappedDraft.title;
      nextMode = mappedDraft.launchMode;
      nextAudience = mappedDraft.audience;
      nextLearningObjectives = mappedDraft.learningObjectives;
      nextScenarioBrief = buildScenarioBrief(mappedDraft);
    }

    const next: Launch = {
      ...current,
      scenarioDraftId: nextDraftId,
      name: nextName,
      mode: nextMode,
      audience: nextAudience,
      learningObjectives: nextLearningObjectives,
      scenarioBrief: nextScenarioBrief,
      startsAt: patch.startsAt === undefined ? current.startsAt : patch.startsAt,
      participantsLabel: patch.participantsLabel === undefined ? current.participantsLabel : patch.participantsLabel,
      status: patch.status ?? deriveBaseLaunchStatus(patch.startsAt === undefined ? current.startsAt : patch.startsAt),
      tabletopPhase: resolveTabletopPhase(
        nextMode,
        patch.tabletopPhase === undefined ? current.tabletopPhase : patch.tabletopPhase,
      ),
      facilitatorNotes:
        nextMode === 'tabletop'
          ? patch.facilitatorNotes === undefined
            ? current.facilitatorNotes
            : patch.facilitatorNotes
          : '',
      updatedAt: nowIso(),
    };

    await this.db.prepare(
      `UPDATE launches
       SET scenario_draft_id = ?, name = ?, mode = ?, audience = ?, status = ?, starts_at = ?,
           participants_label = ?, scenario_brief = ?, learning_objectives = ?, tabletop_phase = ?,
           facilitator_notes = ?, report_closeout_notes = ?, report_follow_up_text = ?, report_closed_at = ?,
           report_closed_by_user_id = ?, report_closed_by_name = ?, updated_at = ?
       WHERE id = ?`,
    ).bind(
      next.scenarioDraftId,
      next.name,
      next.mode,
      next.audience,
      next.status,
      next.startsAt,
      next.participantsLabel,
      next.scenarioBrief,
      next.learningObjectives,
      next.tabletopPhase,
      next.facilitatorNotes,
      next.reportCloseoutNotes,
      next.reportFollowUpText,
      next.reportClosedAt,
      next.reportClosedByUserId,
      next.reportClosedByName,
      next.updatedAt,
      id,
    ).run();

    await this.syncLaunchStatus(id);
    return this.getLaunch(id);
  }

  async updateReportReview(
    id: string,
    input: {
      closeoutNotes: string;
      followUpText: string;
      markClosed: boolean;
      actorUserId: string;
      actorName: string;
    },
  ): Promise<Launch | null> {
    const current = await this.getLaunch(id);
    if (!current) return null;

    const timestamp = nowIso();
    const next: Launch = {
      ...current,
      reportCloseoutNotes: input.closeoutNotes,
      reportFollowUpText: input.followUpText,
      reportClosedAt: input.markClosed ? timestamp : null,
      reportClosedByUserId: input.markClosed ? input.actorUserId : null,
      reportClosedByName: input.markClosed ? input.actorName : null,
      updatedAt: timestamp,
    };

    await this.db.prepare(
      `UPDATE launches
       SET report_closeout_notes = ?, report_follow_up_text = ?, report_closed_at = ?,
           report_closed_by_user_id = ?, report_closed_by_name = ?, updated_at = ?
       WHERE id = ?`,
    ).bind(
      next.reportCloseoutNotes,
      next.reportFollowUpText,
      next.reportClosedAt,
      next.reportClosedByUserId,
      next.reportClosedByName,
      next.updatedAt,
      id,
    ).run();

    return this.getLaunch(id);
  }

  async listParticipantRuns(launchId?: string): Promise<ParticipantRun[]> {
    const query = launchId
      ? `SELECT id, launch_id AS launchId, roster_member_id AS rosterMemberId,
                participant_name AS participantName, participant_email AS participantEmail,
                participant_role AS participantRole, participant_team AS participantTeam,
                status, first_action AS firstAction, escalation_choice AS escalationChoice,
                impact_assessment AS impactAssessment, notes, policy_acknowledged AS policyAcknowledged,
                score_percent AS scorePercent, required_actions_completed AS requiredActionsCompleted,
                total_required_actions AS totalRequiredActions, due_at AS dueAt, started_at AS startedAt,
                submitted_at AS submittedAt, updated_at AS updatedAt
         FROM participant_runs
         WHERE launch_id = ?
         ORDER BY participant_name ASC, updated_at DESC`
      : `SELECT id, launch_id AS launchId, roster_member_id AS rosterMemberId,
                participant_name AS participantName, participant_email AS participantEmail,
                participant_role AS participantRole, participant_team AS participantTeam,
                status, first_action AS firstAction, escalation_choice AS escalationChoice,
                impact_assessment AS impactAssessment, notes, policy_acknowledged AS policyAcknowledged,
                score_percent AS scorePercent, required_actions_completed AS requiredActionsCompleted,
                total_required_actions AS totalRequiredActions, due_at AS dueAt, started_at AS startedAt,
                submitted_at AS submittedAt, updated_at AS updatedAt
         FROM participant_runs
         ORDER BY updated_at DESC, participant_name ASC`;

    const statement = launchId ? this.db.prepare(query).bind(launchId) : this.db.prepare(query);
    const result = await statement.all<ParticipantRunRow>();
    return (result.results ?? []).map(mapParticipantRunRow);
  }

  async getParticipantRun(id: string): Promise<ParticipantRun | null> {
    const row = await this.db.prepare(
      `SELECT id, launch_id AS launchId, roster_member_id AS rosterMemberId,
              participant_name AS participantName, participant_email AS participantEmail,
              participant_role AS participantRole, participant_team AS participantTeam,
              status, first_action AS firstAction, escalation_choice AS escalationChoice,
              impact_assessment AS impactAssessment, notes, policy_acknowledged AS policyAcknowledged,
              score_percent AS scorePercent, required_actions_completed AS requiredActionsCompleted,
              total_required_actions AS totalRequiredActions, due_at AS dueAt, started_at AS startedAt,
              submitted_at AS submittedAt, updated_at AS updatedAt
       FROM participant_runs
       WHERE id = ?`,
    ).bind(id).first<ParticipantRunRow>();

    return row ? mapParticipantRunRow(row) : null;
  }

  async createParticipantRun(input: ParticipantRunInput): Promise<ParticipantRun | null> {
    const launch = await this.db.prepare('SELECT id FROM launches WHERE id = ?').bind(input.launchId).first<{ id: string }>();
    if (!launch) return null;

    const rosterMember = input.rosterMemberId
      ? await this.getRosterMember(input.rosterMemberId)
      : null;
    if (input.rosterMemberId && !rosterMember) {
      return null;
    }

    const timestamp = nowIso();
    const run: ParticipantRun = {
      id: crypto.randomUUID(),
      launchId: input.launchId,
      rosterMemberId: rosterMember?.id ?? null,
      participantName: rosterMember?.fullName ?? input.participantName,
      participantEmail: rosterMember?.email ?? input.participantEmail,
      participantRole: rosterMember?.roleTitle ?? input.participantRole,
      participantTeam: rosterMember?.team ?? input.participantTeam,
      status: 'assigned',
      firstAction: '',
      escalationChoice: '',
      impactAssessment: '',
      notes: '',
      policyAcknowledged: false,
      scorePercent: null,
      requiredActionsCompleted: 0,
      totalRequiredActions: TOTAL_REQUIRED_ACTIONS,
      dueAt: input.dueAt,
      startedAt: null,
      submittedAt: null,
      updatedAt: timestamp,
    };

    await this.db.prepare(
      `INSERT INTO participant_runs (
        id, launch_id, roster_member_id, participant_name, participant_email, participant_role,
        participant_team, status, first_action, escalation_choice,
        impact_assessment, notes, policy_acknowledged, score_percent, required_actions_completed,
        total_required_actions, due_at, started_at, submitted_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      run.id,
      run.launchId,
      run.rosterMemberId,
      run.participantName,
      run.participantEmail,
      run.participantRole,
      run.participantTeam,
      run.status,
      run.firstAction,
      run.escalationChoice,
      run.impactAssessment,
      run.notes,
      run.policyAcknowledged ? 1 : 0,
      run.scorePercent,
      run.requiredActionsCompleted,
      run.totalRequiredActions,
      run.dueAt,
      run.startedAt,
      run.submittedAt,
      timestamp,
      timestamp,
    ).run();

    await this.syncLaunchStatus(run.launchId);
    return run;
  }

  async updateParticipantRun(id: string, patch: ParticipantRunPatch): Promise<ParticipantRun | null> {
    const current = await this.getParticipantRun(id);
    if (!current) return null;

    const rosterMember =
      patch.rosterMemberId === undefined
        ? undefined
        : patch.rosterMemberId
          ? await this.getRosterMember(patch.rosterMemberId)
          : null;
    if (patch.rosterMemberId && !rosterMember) {
      return null;
    }

    const next = applyParticipantRunPatch(current, patch, rosterMember);

    await this.db.prepare(
      `UPDATE participant_runs
       SET roster_member_id = ?, participant_name = ?, participant_email = ?, participant_role = ?,
           participant_team = ?, status = ?, first_action = ?, escalation_choice = ?, impact_assessment = ?,
           notes = ?, policy_acknowledged = ?, score_percent = ?, required_actions_completed = ?,
           total_required_actions = ?, due_at = ?, started_at = ?, submitted_at = ?, updated_at = ?
       WHERE id = ?`,
    ).bind(
      next.rosterMemberId,
      next.participantName,
      next.participantEmail,
      next.participantRole,
      next.participantTeam,
      next.status,
      next.firstAction,
      next.escalationChoice,
      next.impactAssessment,
      next.notes,
      next.policyAcknowledged ? 1 : 0,
      next.scorePercent,
      next.requiredActionsCompleted,
      next.totalRequiredActions,
      next.dueAt,
      next.startedAt,
      next.submittedAt,
      next.updatedAt,
      id,
    ).run();

    await this.syncLaunchStatus(next.launchId);
    return next;
  }

  private async fetchLaunchRows(): Promise<Launch[]> {
    const result = await this.db.prepare(
      `SELECT id, scenario_draft_id AS scenarioDraftId, name, mode, audience, status,
              starts_at AS startsAt, participants_label AS participantsLabel,
              scenario_brief AS scenarioBrief, learning_objectives AS learningObjectives,
              tabletop_phase AS tabletopPhase, facilitator_notes AS facilitatorNotes,
              report_closeout_notes AS reportCloseoutNotes, report_follow_up_text AS reportFollowUpText,
              report_closed_at AS reportClosedAt, report_closed_by_user_id AS reportClosedByUserId,
              report_closed_by_name AS reportClosedByName,
              created_at AS createdAt, updated_at AS updatedAt
       FROM launches
       ORDER BY updated_at DESC, name ASC`,
    ).all<LaunchRow>();

    return (result.results ?? []).map(mapLaunchRow);
  }

  private async findContextItemByBucketAndName(bucketId: string, name: string): Promise<ContextItem | null> {
    const row = await this.db.prepare(
      `SELECT id, bucket_id AS bucketId, name, review_state AS reviewState, required, sort_order AS sortOrder
       FROM context_items
       WHERE bucket_id = ? AND LOWER(name) = LOWER(?)
       LIMIT 1`,
    ).bind(bucketId, name).first<ContextItemRow>();

    return row ? mapContextItemRow(row) : null;
  }

  private async listSourceSuggestionsForDocument(documentId: string): Promise<SourceExtractionSuggestion[]> {
    const result = await this.db.prepare(
      `SELECT id, document_id AS documentId, bucket_id AS bucketId, name, source_snippet AS sourceSnippet,
              confidence, status, created_at AS createdAt, updated_at AS updatedAt
       FROM source_extraction_suggestions
       WHERE document_id = ?
       ORDER BY created_at ASC, name ASC`,
    ).bind(documentId).all<SourceExtractionSuggestionRow>();

    return (result.results ?? []).map(mapSuggestionRow);
  }

  private async getLatestSourceDocumentExtractionJob(documentId: string): Promise<SourceExtractionJob | null> {
    const row = await this.db.prepare(
      `SELECT id, document_id AS documentId, status, attempt_count AS attemptCount, last_error AS lastError,
              attempted_method AS attemptedMethod, attempted_provider AS attemptedProvider,
              attempted_version AS attemptedVersion, created_at AS createdAt, updated_at AS updatedAt,
              started_at AS startedAt, completed_at AS completedAt
       FROM source_document_extraction_jobs
       WHERE document_id = ?
       ORDER BY updated_at DESC, created_at DESC
       LIMIT 1`,
    ).bind(documentId).first<SourceExtractionJobRow>();

    return row ? mapSourceExtractionJobRow(row) : null;
  }

  private async syncDocumentExtractionState(documentId: string): Promise<void> {
    const suggestions = await this.listSourceSuggestionsForDocument(documentId);
    const extractionStatus = deriveSourceExtractionStatus(suggestions);
    const timestamp = nowIso();

    await this.db.prepare(
      `UPDATE source_document_files
       SET extraction_status = ?, updated_at = ?
       WHERE document_id = ?`,
    ).bind(extractionStatus, timestamp, documentId).run();

    await this.db.prepare(
      `UPDATE source_documents
       SET updated_at = ?
       WHERE id = ?`,
    ).bind(timestamp, documentId).run();
  }

  private async syncLaunchStatus(launchId: string): Promise<void> {
    const launch = await this.getLaunch(launchId);
    if (!launch) return;

    await this.db.prepare(
      `UPDATE launches
       SET status = ?, updated_at = ?
       WHERE id = ?`,
    ).bind(launch.status, launch.updatedAt, launchId).run();
  }
}

function buildScenarioBrief(draft: ScenarioDraft): string {
  const deliveryLabel = draft.launchMode === 'individual' ? 'assigned exercise' : 'facilitator-led tabletop';
  return `${draft.title} is a ${deliveryLabel} for ${draft.audience}. Participants should use approved internal procedures to determine the first escalation, assess business impact, and document the next required action.`;
}

function buildDocumentSummary(
  document: SourceDocumentRow,
  documentFiles: Array<
    SourceDocumentFileRow | Pick<SourceDocumentFileRow, 'documentId' | 'uploadedFileName' | 'byteSize' | 'storageBackend' | 'extractionStatus'>
  >,
  suggestions: Array<SourceExtractionSuggestion | Pick<SourceExtractionSuggestion, 'documentId' | 'status'>>,
): DocumentSummary {
  const file = documentFiles.find((entry) => entry.documentId === document.id) ?? null;
  const documentSuggestions = suggestions.filter((entry) => entry.documentId === document.id);
  const pendingSuggestionCount = documentSuggestions.filter((entry) => entry.status === 'pending_review').length;

  return {
    id: document.id,
    name: document.name,
    type: document.type,
    businessUnit: document.businessUnit,
    owner: document.owner,
    effectiveDate: document.effectiveDate,
    parseStatus: document.parseStatus,
    storageStatus: file ? 'stored' : 'metadata_only',
    storageBackend: file?.storageBackend ?? null,
    uploadedFileName: file?.uploadedFileName ?? null,
    byteSize: file?.byteSize ?? null,
    extractionStatus: file?.extractionStatus ?? 'not_started',
    pendingSuggestionCount,
    updatedAt: document.updatedAt,
  };
}

function buildDocumentDetail(
  document: SourceDocumentRow,
  documentFiles: SourceDocumentFileRow[],
  suggestions: SourceExtractionSuggestion[],
  extractionJobs: SourceExtractionJob[],
): SourceDocumentDetail {
  const summary = buildDocumentSummary(document, documentFiles, suggestions);
  const file = documentFiles.find((entry) => entry.documentId === document.id) ?? null;

  return {
    ...summary,
    mimeType: file?.mimeType ?? null,
    storageObjectKey: file?.storageObjectKey ?? null,
    contentExcerpt: file?.contentExcerpt ?? null,
    extractionNote: file?.extractionNote ?? null,
    extractionProvenance: buildExtractionProvenance(
      file?.extractionMethod,
      file?.extractionProvider,
      file?.extractionVersion,
      file?.extractedAt,
    ),
    extractionSuggestions: suggestions
      .filter((entry) => entry.documentId === document.id)
      .sort((left, right) => left.name.localeCompare(right.name)),
    latestExtractionJob: findLatestExtractionJob(extractionJobs, document.id),
  };
}

function stripDocumentSummary(summary: DocumentSummary): SourceDocumentRow {
  return {
    id: summary.id,
    name: summary.name,
    type: summary.type,
    businessUnit: summary.businessUnit,
    owner: summary.owner,
    effectiveDate: summary.effectiveDate,
    parseStatus: summary.parseStatus,
    updatedAt: summary.updatedAt,
  };
}

function extractContextSuggestions(contentText: string, documentId: string): SourceExtractionSuggestion[] {
  const lines = contentText.split(/\r?\n/);
  let activeBucket: string | null = null;
  const suggestions = new Map<string, SourceExtractionSuggestion>();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      activeBucket = null;
      continue;
    }

    const explicitHeader = inferSectionBucket(line);
    if (explicitHeader) {
      activeBucket = explicitHeader;
      const inlineValues = splitInlineValues(line);
      for (const value of inlineValues) {
        addSuggestion(suggestions, {
          documentId,
          bucketId: explicitHeader,
          candidate: value,
          sourceSnippet: line,
          confidence: 'high',
        });
      }
      continue;
    }

    const candidateBucket = activeBucket ?? inferBucketFromLine(line);
    if (!candidateBucket) continue;

    const candidates = line.includes(',') && !line.startsWith('-') ? splitCommaCandidates(line) : [line];
    for (const candidate of candidates) {
      addSuggestion(suggestions, {
        documentId,
        bucketId: candidateBucket,
        candidate,
        sourceSnippet: line,
        confidence: activeBucket ? 'high' : 'medium',
      });
    }
  }

  return Array.from(suggestions.values());
}

function addSuggestion(
  collection: Map<string, SourceExtractionSuggestion>,
  input: {
    documentId: string;
    bucketId: string;
    candidate: string;
    sourceSnippet: string;
    confidence: SuggestionConfidence;
  },
) {
  const name = cleanSuggestionName(input.candidate, input.bucketId);
  if (!name) return;

  const key = `${input.documentId}:${input.bucketId}:${name.toLowerCase()}`;
  if (collection.has(key)) return;

  collection.set(key, {
    id: crypto.randomUUID(),
    documentId: input.documentId,
    bucketId: input.bucketId,
    name,
    sourceSnippet: input.sourceSnippet.slice(0, 180),
    confidence: input.confidence,
    status: 'pending_review',
  });
}

function inferSectionBucket(line: string): string | null {
  if (/^(teams?|departments?|functions?)\b/i.test(line)) return 'teams';
  if (/^(vendors?|providers?|critical vendors?)\b/i.test(line)) return 'vendors';
  if (/^(escalation roles?|roles?|contacts?)\b/i.test(line)) return 'escalation';
  return null;
}

function inferBucketFromLine(line: string): string | null {
  if (/\b(incident commander|executive sponsor|communications lead|escalation|response lead|coordinator|owner)\b/i.test(line)) {
    return 'escalation';
  }
  if (/\b(vendor|provider|custodian|platform|okta|aws|microsoft|slack|twilio|carrier)\b/i.test(line)) {
    return 'vendors';
  }
  if (/\b(team|department|operations|compliance|security|legal|finance|technology|leadership|executive)\b/i.test(line)) {
    return 'teams';
  }
  return null;
}

function splitInlineValues(line: string): string[] {
  const separatorIndex = line.indexOf(':');
  if (separatorIndex === -1) return [];
  return splitCommaCandidates(line.slice(separatorIndex + 1));
}

function splitCommaCandidates(text: string): string[] {
  return text
    .split(/[;,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function cleanSuggestionName(raw: string, bucketId: string): string | null {
  const cleaned = raw
    .replace(/^[-*•\d.\s]+/, '')
    .replace(/^(teams?|departments?|functions?|vendors?|providers?|critical vendors?|escalation roles?|roles?|contacts?)\s*:\s*/i, '')
    .replace(/\s+/g, ' ')
    .replace(/[.:;,\-]+$/, '')
    .trim();

  if (!cleaned) return null;
  if (cleaned.length > 80) return null;

  const normalized = cleaned
    .replace(/\bteam\b/i, bucketId === 'teams' ? '' : 'Team')
    .replace(/\bvendor\b/i, bucketId === 'vendors' ? '' : 'Vendor')
    .trim();

  if (!normalized) return null;
  return normalized;
}

function deriveSourceExtractionStatus(suggestions: Array<Pick<SourceExtractionSuggestion, 'status'>>): SourceExtractionStatus {
  if (suggestions.length === 0) return 'reviewed';
  if (suggestions.some((suggestion) => suggestion.status === 'pending_review')) return 'ready_for_review';
  return 'reviewed';
}

function buildPendingExtractionNote(fileName: string, mimeType: string): string {
  const normalized = mimeType.toLowerCase();

  if (normalized === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
    return 'Stored file is a PDF. Text extraction is still pending, so no suggestions were generated yet.';
  }

  if (
    normalized.includes('wordprocessingml') ||
    normalized === 'application/msword' ||
    /\.(doc|docx)$/i.test(fileName)
  ) {
    return 'Stored file is a Word document. Text extraction is still pending, so no suggestions were generated yet.';
  }

  if (
    normalized.includes('presentationml') ||
    normalized === 'application/vnd.ms-powerpoint' ||
    /\.(ppt|pptx)$/i.test(fileName)
  ) {
    return 'Stored file is a presentation. Text extraction is still pending, so no suggestions were generated yet.';
  }

  if (
    normalized.includes('spreadsheetml') ||
    normalized === 'application/vnd.ms-excel' ||
    /\.(xls|xlsx)$/i.test(fileName)
  ) {
    return 'Stored file is a spreadsheet. Text extraction is still pending, so no suggestions were generated yet.';
  }

  return 'Stored file requires extracted text before suggestions can be reviewed.';
}

function buildContentExcerpt(contentText: string): string {
  return contentText.replace(/\s+/g, ' ').trim().slice(0, 220);
}

function applyParticipantRunPatch(
  current: ParticipantRun,
  patch: ParticipantRunPatch,
  rosterMember?: RosterMember | null,
): ParticipantRun {
  const nextStatus = patch.status ?? current.status;
  const now = nowIso();
  const identity = rosterMember
    ? {
        rosterMemberId: rosterMember.id,
        participantName: rosterMember.fullName,
        participantEmail: rosterMember.email,
        participantRole: rosterMember.roleTitle,
        participantTeam: rosterMember.team,
      }
    : patch.rosterMemberId === null
      ? {
          rosterMemberId: null,
          participantName: current.participantName,
          participantEmail: current.participantEmail,
          participantRole: current.participantRole,
          participantTeam: current.participantTeam,
        }
      : {
          rosterMemberId: current.rosterMemberId,
          participantName: current.participantName,
          participantEmail: current.participantEmail,
          participantRole: current.participantRole,
          participantTeam: current.participantTeam,
        };

  const merged: ParticipantRun = {
    ...current,
    rosterMemberId: identity.rosterMemberId,
    participantName: patch.participantName ?? identity.participantName,
    participantEmail: patch.participantEmail === undefined ? identity.participantEmail : patch.participantEmail,
    participantRole: patch.participantRole ?? identity.participantRole,
    participantTeam: patch.participantTeam === undefined ? identity.participantTeam : patch.participantTeam,
    dueAt: patch.dueAt === undefined ? current.dueAt : patch.dueAt,
    status: nextStatus,
    firstAction: patch.firstAction ?? current.firstAction,
    escalationChoice: patch.escalationChoice ?? current.escalationChoice,
    impactAssessment: patch.impactAssessment ?? current.impactAssessment,
    notes: patch.notes ?? current.notes,
    policyAcknowledged: patch.policyAcknowledged ?? current.policyAcknowledged,
    updatedAt: now,
  };

  if (merged.status === 'assigned' && hasAnyParticipantProgress(merged)) {
    merged.status = 'in_progress';
  }

  if (!merged.startedAt && (merged.status === 'in_progress' || merged.status === 'submitted' || hasAnyParticipantProgress(merged))) {
    merged.startedAt = now;
  }

  if (merged.status === 'submitted') {
    merged.submittedAt = merged.submittedAt ?? now;
  } else {
    merged.submittedAt = null;
  }

  const metrics = computeParticipantMetrics(merged);
  merged.requiredActionsCompleted = metrics.requiredActionsCompleted;
  merged.totalRequiredActions = metrics.totalRequiredActions;
  merged.scorePercent = merged.status === 'submitted' || hasAnyParticipantProgress(merged) ? metrics.scorePercent : null;

  return merged;
}

function computeParticipantMetrics(run: Pick<ParticipantRun, 'firstAction' | 'escalationChoice' | 'impactAssessment' | 'policyAcknowledged'>): ParticipantMetrics {
  const requiredActionsCompleted = [
    readTrimmedString(run.firstAction),
    readTrimmedString(run.escalationChoice),
    readTrimmedString(run.impactAssessment),
    run.policyAcknowledged ? 'policy' : null,
  ].filter(Boolean).length;

  return {
    requiredActionsCompleted,
    totalRequiredActions: TOTAL_REQUIRED_ACTIONS,
    scorePercent: Math.round((requiredActionsCompleted / TOTAL_REQUIRED_ACTIONS) * 100),
  };
}

function hasAnyParticipantProgress(run: Pick<ParticipantRun, 'firstAction' | 'escalationChoice' | 'impactAssessment' | 'notes' | 'policyAcknowledged'>): boolean {
  return Boolean(
    readTrimmedString(run.firstAction) ||
      readTrimmedString(run.escalationChoice) ||
      readTrimmedString(run.impactAssessment) ||
      readTrimmedString(run.notes) ||
      run.policyAcknowledged,
  );
}

function summarizeParticipantRuns(participantRuns: ParticipantRun[]) {
  const totalCount = participantRuns.length;
  const submittedRuns = participantRuns.filter((run) => run.status === 'submitted');
  const submittedCount = submittedRuns.length;
  const completionRate = totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0;
  const scoreValues = participantRuns
    .map((run) => run.scorePercent)
    .filter((score): score is number => typeof score === 'number');
  const averageScore =
    scoreValues.length > 0 ? Math.round(scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length) : null;

  return { totalCount, submittedCount, completionRate, averageScore };
}

function buildEvidenceItems(
  participantRuns: ParticipantRun[],
  metrics: ReturnType<typeof summarizeParticipantRuns>,
): ReportEvidenceItem[] {
  const noteCount = participantRuns.filter((run) => Boolean(readTrimmedString(run.notes))).length;

  return [
    {
      id: 'roster',
      label: 'Participant roster',
      status: evidenceReady(metrics.totalCount > 0),
      note:
        metrics.totalCount > 0
          ? `${metrics.totalCount} participant assignment${metrics.totalCount === 1 ? '' : 's'} recorded for this launch.`
          : 'No participant assignments recorded yet.',
    },
    {
      id: 'responses',
      label: 'Submitted response log',
      status: evidenceReady(metrics.submittedCount > 0),
      note:
        metrics.submittedCount > 0
          ? `${metrics.submittedCount} submitted response${metrics.submittedCount === 1 ? '' : 's'} available for audit review.`
          : 'No submitted participant responses yet.',
    },
    {
      id: 'after-action-notes',
      label: 'After-action notes',
      status: evidenceReady(noteCount > 0),
      note:
        noteCount > 0
          ? `${noteCount} participant note${noteCount === 1 ? '' : 's'} captured for after-action review.`
          : 'No after-action notes captured yet.',
    },
  ];
}

function evidenceReady(value: boolean): EvidenceStatus {
  return value ? 'ready' : 'pending';
}

function deriveReportStatus(
  launch: Pick<Launch, 'reportClosedAt'>,
  metrics: ReturnType<typeof summarizeParticipantRuns>,
): ReportStatus {
  if (launch.reportClosedAt) return 'closed';
  return metrics.completionRate === 100 ? 'ready' : 'in_review';
}

function parseFollowUpActions(value: string): string[] {
  return value
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildReportHighlights(
  launch: Launch,
  participantRuns: ParticipantRun[],
  metrics: ReturnType<typeof summarizeParticipantRuns>,
): string[] {
  if (participantRuns.length === 0) {
    return ['No participant assignments exist yet, so this launch cannot produce evidence or completion reporting.'];
  }

  const highlights: string[] = [];
  highlights.push(`${metrics.submittedCount} of ${metrics.totalCount} participant runs have been submitted for ${launch.name}.`);

  const missingPolicyCount = participantRuns.filter((run) => run.status === 'submitted' && !run.policyAcknowledged).length;
  if (missingPolicyCount > 0) {
    highlights.push(`${missingPolicyCount} submitted response${missingPolicyCount === 1 ? '' : 's'} did not acknowledge the controlling policy or playbook.`);
  } else if (metrics.submittedCount > 0) {
    highlights.push('Submitted responses consistently acknowledged the policy or playbook reference.');
  }

  if (metrics.averageScore !== null) {
    highlights.push(`Average deterministic checkpoint score is ${metrics.averageScore}%.`);
  }

  const incompleteRuns = participantRuns.filter((run) => run.requiredActionsCompleted < run.totalRequiredActions).length;
  if (incompleteRuns > 0) {
    highlights.push(`${incompleteRuns} participant run${incompleteRuns === 1 ? '' : 's'} still miss one or more required checkpoint actions.`);
  }

  return highlights;
}

function buildAfterActionSummary(
  launch: Launch,
  participantRuns: ParticipantRun[],
  metrics: ReturnType<typeof summarizeParticipantRuns>,
): ReportAfterActionSummary {
  if (participantRuns.length === 0) {
    return {
      executiveSummary: `No participant assignments were recorded for ${launch.name}, so the exercise cannot yet produce a usable after-action assessment.`,
      strengths: [],
      gaps: ['No participant roster was assigned to this launch.'],
      recommendedActions: ['Assign the intended participant roster before relaunching this exercise.'],
    };
  }

  const missingPolicyCount = participantRuns.filter((run) => run.status === 'submitted' && !run.policyAcknowledged).length;
  const incompleteRuns = participantRuns.filter((run) => run.requiredActionsCompleted < run.totalRequiredActions).length;
  const noteCount = participantRuns.filter((run) => Boolean(readTrimmedString(run.notes))).length;
  const outstandingRuns = metrics.totalCount - metrics.submittedCount;

  const strengths: string[] = [];
  if (metrics.submittedCount > 0) {
    strengths.push(`${metrics.submittedCount} participant response${metrics.submittedCount === 1 ? '' : 's'} were submitted for review.`);
  }
  if (metrics.completionRate === 100 && metrics.totalCount > 0) {
    strengths.push('All assigned participants completed the exercise before closeout.');
  }
  if (metrics.averageScore !== null && metrics.averageScore >= 85) {
    strengths.push(`Submitted responses achieved an average deterministic checkpoint score of ${metrics.averageScore}%.`);
  }
  if (metrics.submittedCount > 0 && missingPolicyCount === 0) {
    strengths.push('Submitted responses consistently acknowledged the controlling policy or playbook.');
  }
  if (noteCount > 0) {
    strengths.push(`${noteCount} participant note${noteCount === 1 ? '' : 's'} were captured for after-action review.`);
  }

  const gaps: string[] = [];
  if (outstandingRuns > 0) {
    gaps.push(`${outstandingRuns} participant run${outstandingRuns === 1 ? '' : 's'} remain incomplete and still need follow-up.`);
  }
  if (missingPolicyCount > 0) {
    gaps.push(`${missingPolicyCount} submitted response${missingPolicyCount === 1 ? '' : 's'} did not acknowledge the controlling policy or playbook.`);
  }
  if (incompleteRuns > 0) {
    gaps.push(`${incompleteRuns} participant run${incompleteRuns === 1 ? '' : 's'} missed one or more required checkpoint actions.`);
  }
  if (metrics.submittedCount > 0 && noteCount === 0) {
    gaps.push('No participant after-action notes were captured for this launch.');
  }

  const recommendedActions: string[] = [];
  if (outstandingRuns > 0) {
    recommendedActions.push('Follow up with incomplete participants before closing the evidence package.');
  }
  if (missingPolicyCount > 0) {
    recommendedActions.push('Reinforce the required policy reference in the exercise brief and facilitator review.');
  }
  if (incompleteRuns > 0) {
    recommendedActions.push('Review the missed checkpoints and confirm the controlling action sequence in the next rehearsal.');
  }
  if (metrics.submittedCount > 0 && noteCount === 0) {
    recommendedActions.push('Require a short participant after-action note so improvement items are captured consistently.');
  }
  if (recommendedActions.length === 0) {
    recommendedActions.push('Use this launch as the baseline evidence package for the next review cycle.');
  }

  const scoreSentence =
    metrics.averageScore !== null
      ? ` Submitted responses averaged ${metrics.averageScore}% across deterministic checkpoints.`
      : '';
  const completionSentence =
    outstandingRuns > 0
      ? ` ${outstandingRuns} assigned participant${outstandingRuns === 1 ? '' : 's'} still require follow-up before the evidence package is complete.`
      : ' All assigned participants submitted evidence for review.';

  return {
    executiveSummary: `${launch.name} produced ${metrics.submittedCount} submitted response${
      metrics.submittedCount === 1 ? '' : 's'
    } out of ${metrics.totalCount} assigned participant${metrics.totalCount === 1 ? '' : 's'}.${scoreSentence}${completionSentence}`,
    strengths,
    gaps,
    recommendedActions,
  };
}

function buildReportEvidencePackage(report: ReportDetail, generatedAt: string): ReportEvidencePackage {
  return {
    exportVersion: '2026-03-07',
    generatedAt,
    reportId: report.id,
    launchId: report.launchId,
    name: report.name,
    launchStatus: report.launchStatus,
    mode: report.mode,
    audience: report.audience,
    startsAt: report.startsAt,
    completionRate: report.completionRate,
    averageScore: report.averageScore,
    status: report.status,
    evidenceStatus: report.evidenceStatus,
    learningObjectives: report.learningObjectives,
    scenarioBrief: report.scenarioBrief,
    highlights: report.highlights,
    afterActionSummary: report.afterActionSummary,
    closeoutNotes: report.closeoutNotes,
    followUpActions: report.followUpActions,
    closedAt: report.closedAt,
    closedByName: report.closedByName,
    evidenceItems: report.evidenceItems,
    participantRuns: report.participantRuns,
  };
}

function buildMarkdownReportExport(report: ReportEvidencePackage): string {
  const lines = [
    '# Altira Resilience After-Action Brief',
    '',
    `Generated: ${report.generatedAt}`,
    `Launch: ${report.name}`,
    '',
    '## Exercise Overview',
    `- Launch status: ${formatStatusLabel(report.launchStatus)}`,
    `- Mode: ${formatStatusLabel(report.mode)}`,
    `- Audience: ${report.audience}`,
    `- Starts at: ${report.startsAt}`,
    `- Completion rate: ${report.completionRate}%`,
    `- Average score: ${report.averageScore !== null ? `${report.averageScore}%` : 'No score recorded'}`,
    `- Evidence status: ${formatStatusLabel(report.evidenceStatus)}`,
    '',
    '## Scenario Brief',
    report.scenarioBrief,
    '',
    '## Learning Objectives',
    report.learningObjectives,
    '',
    '## Highlights',
    ...formatMarkdownList(report.highlights, 'No report highlights recorded.'),
    '',
    '## After-Action Summary',
    report.afterActionSummary.executiveSummary,
    '',
    '## Operator Closeout',
    report.closeoutNotes || 'No operator closeout notes recorded.',
    '',
    `- Closed at: ${report.closedAt ?? 'Not closed'}`,
    `- Closed by: ${report.closedByName ?? 'Not recorded'}`,
    '',
    '### Operator Follow-Up Actions',
    ...formatMarkdownList(report.followUpActions, 'No operator follow-up actions recorded.'),
    '',
    '### Strengths',
    ...formatMarkdownList(report.afterActionSummary.strengths, 'No strengths recorded yet.'),
    '',
    '### Gaps',
    ...formatMarkdownList(report.afterActionSummary.gaps, 'No gaps recorded yet.'),
    '',
    '### Recommended Actions',
    ...formatMarkdownList(report.afterActionSummary.recommendedActions, 'No follow-up actions recorded yet.'),
    '',
    '## Evidence Checklist',
    ...report.evidenceItems.flatMap((item) => [
      `- ${item.label} (${formatStatusLabel(item.status)}): ${item.note}`,
    ]),
    '',
    '## Participant Evidence',
  ];

  if (report.participantRuns.length === 0) {
    lines.push('- No participant runs recorded.');
    return lines.join('\n');
  }

  for (const run of report.participantRuns) {
    lines.push(`### ${run.participantName} - ${run.participantRole}`);
    if (run.participantTeam) {
      lines.push(`- Team: ${run.participantTeam}`);
    }
    if (run.participantEmail) {
      lines.push(`- Email: ${run.participantEmail}`);
    }
    lines.push(`- Status: ${formatStatusLabel(run.status)}`);
    lines.push(`- Score: ${run.scorePercent !== null ? `${run.scorePercent}%` : 'Not submitted'}`);
    lines.push(`- Required checkpoints: ${run.requiredActionsCompleted}/${run.totalRequiredActions}`);
    lines.push(`- Policy acknowledged: ${run.policyAcknowledged ? 'Yes' : 'No'}`);
    if (readTrimmedString(run.firstAction)) {
      lines.push(`- First action: ${run.firstAction}`);
    }
    if (readTrimmedString(run.escalationChoice)) {
      lines.push(`- Escalation choice: ${run.escalationChoice}`);
    }
    if (readTrimmedString(run.impactAssessment)) {
      lines.push(`- Impact assessment: ${run.impactAssessment}`);
    }
    if (readTrimmedString(run.notes)) {
      lines.push(`- Notes: ${run.notes}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function formatMarkdownList(items: string[], emptyLabel: string): string[] {
  if (items.length === 0) {
    return [`- ${emptyLabel}`];
  }

  return items.map((item) => `- ${item}`);
}

function groupParticipantRunsByLaunch(participantRuns: ParticipantRun[]) {
  const runsByLaunch = new Map<string, ParticipantRun[]>();

  for (const run of participantRuns) {
    const runs = runsByLaunch.get(run.launchId) ?? [];
    runs.push(run);
    runsByLaunch.set(run.launchId, runs);
  }

  return runsByLaunch;
}

function syncLaunchWithRuns(launch: Launch, participantRuns: ParticipantRun[]): Launch {
  const latestRunActivity = participantRuns
    .map((run) => run.updatedAt)
    .sort((left, right) => right.localeCompare(left))[0];

  return {
    ...launch,
    status: deriveLaunchStatus(launch, participantRuns),
    tabletopPhase: resolveTabletopPhase(launch.mode, launch.tabletopPhase),
    facilitatorNotes: launch.mode === 'tabletop' ? launch.facilitatorNotes : '',
    updatedAt: latestRunActivity && latestRunActivity > launch.updatedAt ? latestRunActivity : launch.updatedAt,
  };
}

function deriveBaseLaunchStatus(startsAt: string | null): LaunchStatus {
  return startsAt ? 'scheduled' : 'draft';
}

function defaultTabletopPhase(mode: Launch['mode']): TabletopPhase | null {
  return mode === 'tabletop' ? 'briefing' : null;
}

function resolveTabletopPhase(
  mode: Launch['mode'],
  tabletopPhase: TabletopPhase | null | undefined,
): TabletopPhase | null {
  if (mode !== 'tabletop') return null;
  return tabletopPhase ?? 'briefing';
}

function deriveLaunchStatus(launch: Launch, participantRuns: ParticipantRun[]): LaunchStatus {
  if (launch.mode === 'tabletop') {
    return launch.status;
  }

  if (participantRuns.length > 0 && participantRuns.every((run) => run.status === 'submitted')) {
    return 'completed';
  }

  if (participantRuns.some((run) => run.status === 'in_progress' || run.status === 'submitted')) {
    return 'in_progress';
  }

  return deriveBaseLaunchStatus(launch.startsAt);
}

function compareParticipantRuns(left: ParticipantRun, right: ParticipantRun): number {
  return left.participantName.localeCompare(right.participantName) || right.updatedAt.localeCompare(left.updatedAt);
}

function compareRosterMembers(left: RosterMember, right: RosterMember): number {
  if (left.status !== right.status) {
    return left.status === 'active' ? -1 : 1;
  }

  return left.fullName.localeCompare(right.fullName) || right.updatedAt.localeCompare(left.updatedAt);
}

function compareWorkspaceUsers(left: WorkspaceUser, right: WorkspaceUser): number {
  if (left.status !== right.status) {
    return left.status === 'active' ? -1 : 1;
  }

  const roleRank = workspaceRoleRank(left.role) - workspaceRoleRank(right.role);
  if (roleRank !== 0) {
    return roleRank;
  }

  return left.fullName.localeCompare(right.fullName) || right.updatedAt.localeCompare(left.updatedAt);
}

function compareWorkspaceInvites(left: WorkspaceInvite, right: WorkspaceInvite): number {
  if (left.status !== right.status) {
    const rank = workspaceInviteStatusRank(left.status) - workspaceInviteStatusRank(right.status);
    if (rank !== 0) return rank;
  }

  return right.updatedAt.localeCompare(left.updatedAt) || left.email.localeCompare(right.email);
}

function compareAuditEvents(left: AuditEvent, right: AuditEvent): number {
  return right.createdAt.localeCompare(left.createdAt) || left.id.localeCompare(right.id);
}

function workspaceRoleRank(role: WorkspaceUserRole): number {
  if (role === 'admin') return 0;
  if (role === 'manager') return 1;
  return 2;
}

function workspaceInviteStatusRank(status: WorkspaceInviteStatus): number {
  if (status === 'pending') return 0;
  if (status === 'accepted') return 1;
  return 2;
}

function findExistingContextItem(contextBuckets: ContextBucket[], bucketId: string, name: string): ContextItem | null {
  const bucket = contextBuckets.find((entry) => entry.id === bucketId);
  if (!bucket) return null;
  return bucket.items.find((entry) => entry.name.toLowerCase() === name.toLowerCase()) ?? null;
}

function findLatestExtractionJob(
  extractionJobs: SourceExtractionJob[],
  documentId: string,
): SourceExtractionJob | null {
  return (
    extractionJobs
      .filter((entry) => entry.documentId === documentId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null
  );
}

function mapSourceDocumentListRow(row: SourceDocumentListRow): DocumentSummary {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    businessUnit: row.businessUnit,
    owner: row.owner,
    effectiveDate: row.effectiveDate,
    parseStatus: row.parseStatus,
    storageStatus: row.uploadedFileName ? 'stored' : 'metadata_only',
    storageBackend: row.storageBackend ?? null,
    uploadedFileName: row.uploadedFileName,
    byteSize: row.byteSize,
    extractionStatus: row.extractionStatus ?? 'not_started',
    pendingSuggestionCount: row.pendingSuggestionCount ?? 0,
    updatedAt: row.updatedAt,
  };
}

function mapContextItemRow(row: ContextItemRow): ContextItem {
  return {
    id: row.id,
    bucketId: row.bucketId,
    name: row.name,
    reviewState: row.reviewState,
    required: Boolean(row.required),
  };
}

function mapScenarioDraftRow(row: ScenarioDraftRow): ScenarioDraft {
  return {
    id: row.id,
    title: row.title,
    templateId: row.templateId,
    audience: row.audience,
    launchMode: row.launchMode,
    difficulty: row.difficulty,
    learningObjectives: row.learningObjectives,
    approvalStatus: row.approvalStatus,
    reviewerNotes: row.reviewerNotes,
    reviewedAt: row.reviewedAt,
    reviewedByUserId: row.reviewedByUserId,
    reviewedByName: row.reviewedByName,
    scheduledStartAt: row.scheduledStartAt,
    participantsLabel: row.participantsLabel,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapLaunchRow(row: LaunchRow): Launch {
  return {
    id: row.id,
    scenarioDraftId: row.scenarioDraftId,
    name: row.name,
    mode: row.mode,
    audience: row.audience,
    status: row.status,
    startsAt: row.startsAt,
    participantsLabel: row.participantsLabel,
    scenarioBrief: row.scenarioBrief,
    learningObjectives: row.learningObjectives,
    tabletopPhase: row.tabletopPhase,
    facilitatorNotes: row.facilitatorNotes,
    reportCloseoutNotes: row.reportCloseoutNotes,
    reportFollowUpText: row.reportFollowUpText,
    reportClosedAt: row.reportClosedAt,
    reportClosedByUserId: row.reportClosedByUserId,
    reportClosedByName: row.reportClosedByName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapRosterMemberRow(row: RosterMemberRow): RosterMember {
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    roleTitle: row.roleTitle,
    team: row.team,
    managerName: row.managerName,
    status: row.status,
    updatedAt: row.updatedAt,
  };
}

function mapWorkspaceUserRow(row: WorkspaceUserRow): WorkspaceUser {
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    role: row.role,
    capabilities: parseWorkspaceUserCapabilities(row.capabilitiesJson),
    scopeTeams: parseScopeTeams(row.scopeTeamsJson),
    rosterMemberId: row.rosterMemberId,
    status: row.status,
    updatedAt: row.updatedAt,
  };
}

function mapWorkspaceInviteRow(row: WorkspaceInviteRow): WorkspaceInvite {
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    role: row.role,
    capabilities: parseWorkspaceUserCapabilities(row.capabilitiesJson),
    scopeTeams: parseScopeTeams(row.scopeTeamsJson),
    rosterMemberId: row.rosterMemberId,
    status: row.status,
    invitedByUserId: row.invitedByUserId,
    acceptedWorkspaceUserId: row.acceptedWorkspaceUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    acceptedAt: row.acceptedAt,
    magicLinkSentAt: row.magicLinkSentAt,
    magicLinkExpiresAt: row.magicLinkExpiresAt,
  };
}

function mapAuditEventRow(row: AuditEventRow): AuditEvent {
  return {
    id: row.id,
    category: row.category,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    actorUserId: row.actorUserId,
    actorName: row.actorName,
    actorRole: row.actorRole,
    summary: row.summary,
    detail: row.detail,
    createdAt: row.createdAt,
  };
}

function parseWorkspaceUserCapabilities(raw: string | null): WorkspaceUserCapability[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isWorkspaceUserCapability);
  } catch {
    return [];
  }
}

function normalizeWorkspaceUserCapabilities(raw: unknown): WorkspaceUserCapability[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isWorkspaceUserCapability);
}

function parseScopeTeams(raw: string | null): string[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    return normalizeScopeTeams(parsed);
  } catch {
    return [];
  }
}

function normalizeScopeTeams(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  return Array.from(
    new Set(
      raw
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter((entry) => entry.length > 0),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function mapAuthSessionRow(row: AuthSessionRow): AuthSession {
  return {
    id: row.id,
    workspaceUserId: row.workspaceUserId,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastSeenAt: row.lastSeenAt,
  };
}

function mapParticipantRunRow(row: ParticipantRunRow): ParticipantRun {
  return {
    id: row.id,
    launchId: row.launchId,
    rosterMemberId: row.rosterMemberId,
    participantName: row.participantName,
    participantEmail: row.participantEmail,
    participantRole: row.participantRole,
    participantTeam: row.participantTeam,
    status: row.status,
    firstAction: row.firstAction,
    escalationChoice: row.escalationChoice,
    impactAssessment: row.impactAssessment,
    notes: row.notes,
    policyAcknowledged: Boolean(row.policyAcknowledged),
    scorePercent: row.scorePercent,
    requiredActionsCompleted: row.requiredActionsCompleted,
    totalRequiredActions: row.totalRequiredActions,
    dueAt: row.dueAt,
    startedAt: row.startedAt,
    submittedAt: row.submittedAt,
    updatedAt: row.updatedAt,
  };
}

function mapSuggestionRow(row: SourceExtractionSuggestionRow): SourceExtractionSuggestion {
  return {
    id: row.id,
    documentId: row.documentId,
    bucketId: row.bucketId,
    name: row.name,
    sourceSnippet: row.sourceSnippet,
    confidence: row.confidence,
    status: row.status,
  };
}

function mapSourceExtractionJobRow(row: SourceExtractionJobRow): SourceExtractionJob {
  return {
    id: row.id,
    documentId: row.documentId,
    status: row.status,
    attemptCount: row.attemptCount,
    lastError: row.lastError,
    attemptedProvenance: buildExtractionProvenance(
      row.attemptedMethod,
      row.attemptedProvider,
      row.attemptedVersion,
      row.completedAt ?? row.startedAt ?? row.updatedAt,
    ),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
  };
}

function normalizeSourceExtractionProvenance(value: unknown): SourceExtractionProvenance | null {
  if (!value || typeof value !== 'object') return null;

  const raw = value as Partial<SourceExtractionProvenance>;
  const method = isSourceExtractionMethod(raw.method) ? raw.method : null;
  const provider = isSourceExtractionProvider(raw.provider) ? raw.provider : null;
  const version = normalizeNullableString(raw.version);
  const generatedAt = normalizeNullableString(raw.generatedAt);

  if (!method || !provider || !version || !generatedAt) {
    return null;
  }

  return {
    method,
    provider,
    version,
    generatedAt,
  };
}

function buildExtractionProvenance(
  method: SourceExtractionMethod | null | undefined,
  provider: SourceExtractionProvider | null | undefined,
  version: string | null | undefined,
  generatedAt: string | null | undefined,
): SourceExtractionProvenance | null {
  if (!method || !provider || !version || !generatedAt) {
    return null;
  }

  return {
    method,
    provider,
    version,
    generatedAt,
  };
}

function normalizeNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = readTrimmedString(value);
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function formatStatusLabel(value: string): string {
  return value.replace(/_/g, ' ');
}

function slugifyFileSegment(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'altira-resilience-report';
}

function readTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '';
}

function nowIso(): string {
  return new Date().toISOString();
}
