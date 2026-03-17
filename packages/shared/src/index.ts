export type AdminNavId =
  | 'home'
  | 'source-library'
  | 'org-context'
  | 'scenario-studio'
  | 'roster'
  | 'launches'
  | 'reports'
  | 'settings';

export type AdminNavItem = {
  id: AdminNavId;
  label: string;
};

export type SummaryTone = 'neutral' | 'attention' | 'ready';

export type AdminSummaryCard = {
  id: string;
  label: string;
  value: string;
  note: string;
  tone: SummaryTone;
};

export type OverviewQueueItem = {
  id: string;
  title: string;
  note: string;
  statusLabel: string;
};

export type OverviewCoverageGap = {
  team: string;
  activeMembers: number;
  assignedMembers: number;
  submittedMembers: number;
  note: string;
};

export type DocumentParseStatus = 'uploaded' | 'parsed' | 'needs_review' | 'approved';
export type SourceStorageStatus = 'metadata_only' | 'stored';
export type SourceStorageBackend = 'inline' | 'r2';
export type SourceExtractionStatus = 'not_started' | 'queued' | 'ready_for_review' | 'reviewed' | 'needs_attention';
export type SourceExtractionJobStatus = 'queued' | 'processing' | 'completed' | 'needs_attention' | 'failed';
export type SuggestionStatus = 'pending_review' | 'applied' | 'dismissed';
export type SuggestionConfidence = 'high' | 'medium';
export type SourceExtractionMethod =
  | 'upload_native'
  | 'upload_ai'
  | 'manual_native'
  | 'queued_native'
  | 'queued_ai';
export type SourceExtractionProvider =
  | 'native_parser'
  | 'workers_ai_markdown'
  | 'workers_ai_vision';

export type SourceExtractionProvenance = {
  method: SourceExtractionMethod;
  provider: SourceExtractionProvider;
  version: string;
  generatedAt: string;
};

export type DocumentSummary = {
  id: string;
  name: string;
  type: string;
  businessUnit: string;
  owner: string;
  effectiveDate: string;
  parseStatus: DocumentParseStatus;
  storageStatus: SourceStorageStatus;
  storageBackend: SourceStorageBackend | null;
  uploadedFileName: string | null;
  byteSize: number | null;
  extractionStatus: SourceExtractionStatus;
  pendingSuggestionCount: number;
  updatedAt: string;
};

export type SourceExtractionSuggestion = {
  id: string;
  documentId: string;
  bucketId: string;
  name: string;
  sourceSnippet: string;
  confidence: SuggestionConfidence;
  status: SuggestionStatus;
};

export type SourceExtractionSuggestionPatch = {
  status: SuggestionStatus;
};

export type SourceExtractionJob = {
  id: string;
  documentId: string;
  status: SourceExtractionJobStatus;
  attemptCount: number;
  lastError: string | null;
  attemptedProvenance: SourceExtractionProvenance | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

export type SourceDocumentDetail = DocumentSummary & {
  mimeType: string | null;
  storageObjectKey: string | null;
  contentExcerpt: string | null;
  extractionNote: string | null;
  extractionProvenance: SourceExtractionProvenance | null;
  extractionSuggestions: SourceExtractionSuggestion[];
  latestExtractionJob: SourceExtractionJob | null;
};

export type ReviewState = 'confirmed' | 'needs_review';

export type ContextItem = {
  id: string;
  bucketId: string;
  name: string;
  reviewState: ReviewState;
  required: boolean;
};

export type ContextBucket = {
  id: string;
  label: string;
  items: ContextItem[];
};

export type ScenarioTemplate = {
  id: string;
  name: string;
  description: string;
  recommendedInputs: string[];
  primaryAudience: string;
};

export type LaunchMode = 'individual' | 'tabletop';
export type ScenarioDifficulty = 'low' | 'medium' | 'high';
export type ScenarioApprovalStatus = 'draft' | 'ready_for_review' | 'changes_requested' | 'approved';
export type TabletopPhase = 'briefing' | 'injects' | 'decision_review' | 'after_action';

export type ScenarioDraft = {
  id: string;
  title: string;
  templateId: string;
  audience: string;
  launchMode: LaunchMode;
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

export type LaunchStatus = 'draft' | 'scheduled' | 'in_progress' | 'completed';
export type RosterMemberStatus = 'active' | 'inactive';
export type WorkspaceUserRole = 'user' | 'manager' | 'admin';
export type WorkspaceUserStatus = 'active' | 'inactive';
export type WorkspaceUserCapability = 'resilience_tabletop_facilitate';
export type WorkspaceInviteStatus = 'pending' | 'accepted' | 'revoked';
export type AuditEventCategory = 'access' | 'operations';
export type AuditEventAction =
  | 'scenario_draft_submitted'
  | 'scenario_draft_approved'
  | 'scenario_draft_changes_requested'
  | 'workspace_user_created'
  | 'workspace_user_updated'
  | 'workspace_user_deactivated'
  | 'workspace_user_reactivated'
  | 'manager_scope_updated'
  | 'workspace_invite_created'
  | 'workspace_invite_revoked'
  | 'workspace_invite_reopened'
  | 'workspace_invite_accepted'
  | 'launch_created'
  | 'launch_updated'
  | 'participant_assignment_created'
  | 'participant_run_submitted';
export type AuditEventTargetType = 'workspace_user' | 'workspace_invite' | 'scenario_draft' | 'launch' | 'participant_run';
export type AuditEventActorRole = WorkspaceUserRole | 'system';

export type RosterMember = {
  id: string;
  fullName: string;
  email: string;
  roleTitle: string;
  team: string;
  managerName: string | null;
  status: RosterMemberStatus;
  updatedAt: string;
};

export type WorkspaceUser = {
  id: string;
  fullName: string;
  email: string;
  role: WorkspaceUserRole;
  capabilities: WorkspaceUserCapability[];
  scopeTeams: string[];
  rosterMemberId: string | null;
  status: WorkspaceUserStatus;
  updatedAt: string;
};

export type WorkspaceInvite = {
  id: string;
  email: string;
  fullName: string;
  role: WorkspaceUserRole;
  capabilities: WorkspaceUserCapability[];
  scopeTeams: string[];
  rosterMemberId: string | null;
  status: WorkspaceInviteStatus;
  invitedByUserId: string | null;
  acceptedWorkspaceUserId: string | null;
  createdAt: string;
  updatedAt: string;
  acceptedAt: string | null;
  magicLinkSentAt: string | null;
  magicLinkExpiresAt: string | null;
};

export type WorkspaceInviteMagicLinkResult = {
  workspaceInvite: WorkspaceInvite;
  magicLinkPath: string;
  expiresAt: string;
  deliveryMode: 'manual_copy';
};

export type PreviewAuthAccount = {
  email: string;
  fullName: string;
  role: WorkspaceUserRole;
};

export type AuthSession = {
  id: string;
  workspaceUserId: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
};

export type AuditEvent = {
  id: string;
  category: AuditEventCategory;
  action: AuditEventAction;
  targetType: AuditEventTargetType;
  targetId: string;
  actorUserId: string | null;
  actorName: string;
  actorRole: AuditEventActorRole;
  summary: string;
  detail: string | null;
  createdAt: string;
};

export type AuthSessionState = {
  authenticated: boolean;
  currentUser: WorkspaceUser | null;
  session: AuthSession | null;
  signInMode: 'workspace_email';
  previewAccounts: PreviewAuthAccount[];
};

export type Launch = {
  id: string;
  scenarioDraftId: string;
  name: string;
  mode: LaunchMode;
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

export type LaunchSummary = {
  id: string;
  scenarioDraftId: string;
  name: string;
  mode: LaunchMode;
  audience: string;
  status: LaunchStatus;
  tabletopPhase: TabletopPhase | null;
  startsAt: string;
  participantsLabel: string;
  participantCount: number;
  completedCount: number;
};

export type ParticipantRunStatus = 'assigned' | 'in_progress' | 'submitted';

export type ParticipantRun = {
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
  policyAcknowledged: boolean;
  scorePercent: number | null;
  requiredActionsCompleted: number;
  totalRequiredActions: number;
  dueAt: string | null;
  startedAt: string | null;
  submittedAt: string | null;
  updatedAt: string;
};

export type LaunchDetail = Launch & {
  draftApprovalStatus: ScenarioApprovalStatus;
  participantRuns: ParticipantRun[];
};

export type ParticipantRunDetail = ParticipantRun & {
  launchName: string;
  launchMode: LaunchMode;
  audience: string;
  startsAt: string | null;
  scenarioBrief: string;
  learningObjectives: string;
};

export type ReportStatus = 'in_review' | 'ready' | 'closed';

export type EvidenceStatus = 'pending' | 'ready';

export type ReportSummary = {
  id: string;
  name: string;
  completionRate: number;
  averageScore: number | null;
  status: ReportStatus;
  evidenceStatus: EvidenceStatus;
  lastUpdated: string;
};

export type ReportEvidenceItem = {
  id: string;
  label: string;
  status: EvidenceStatus;
  note: string;
};

export type ReportAfterActionSummary = {
  executiveSummary: string;
  strengths: string[];
  gaps: string[];
  recommendedActions: string[];
};

export type ReportDetail = {
  id: string;
  launchId: string;
  name: string;
  launchStatus: LaunchStatus;
  mode: LaunchMode;
  audience: string;
  startsAt: string;
  completionRate: number;
  averageScore: number | null;
  status: ReportStatus;
  evidenceStatus: EvidenceStatus;
  learningObjectives: string;
  scenarioBrief: string;
  highlights: string[];
  afterActionSummary: ReportAfterActionSummary;
  closeoutNotes: string;
  followUpActions: string[];
  closedAt: string | null;
  closedByName: string | null;
  evidenceItems: ReportEvidenceItem[];
  participantRuns: ParticipantRun[];
};

export type ReportEvidencePackage = {
  exportVersion: string;
  generatedAt: string;
  reportId: string;
  launchId: string;
  name: string;
  launchStatus: LaunchStatus;
  mode: LaunchMode;
  audience: string;
  startsAt: string;
  completionRate: number;
  averageScore: number | null;
  status: ReportStatus;
  evidenceStatus: EvidenceStatus;
  learningObjectives: string;
  scenarioBrief: string;
  highlights: string[];
  afterActionSummary: ReportAfterActionSummary;
  closeoutNotes: string;
  followUpActions: string[];
  closedAt: string | null;
  closedByName: string | null;
  evidenceItems: ReportEvidenceItem[];
  participantRuns: ParticipantRun[];
};

export type ReportExportFormat = 'json' | 'markdown';

export type ReportExportFile = {
  format: ReportExportFormat;
  fileName: string;
  mimeType: string;
  content: string;
  generatedAt: string;
};

export type OverviewData = {
  programHealth: AdminSummaryCard[];
  pendingApprovals: OverviewQueueItem[];
  upcomingExercises: LaunchSummary[];
  overdueAssignments: ParticipantRun[];
  evidenceReady: ReportSummary[];
  recentAfterActions: ReportSummary[];
  coverageGaps: OverviewCoverageGap[];
};

export type SourceDocumentInput = {
  name: string;
  type: string;
  businessUnit: string;
  owner: string;
  effectiveDate: string;
  parseStatus: DocumentParseStatus;
};

export type SourceDocumentPatch = Partial<SourceDocumentInput>;

export type SourceDocumentUploadInput = {
  name: string;
  type: string;
  businessUnit: string;
  owner: string;
  effectiveDate: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  storageBackend: SourceStorageBackend;
  storageObjectKey: string | null;
  contentText: string | null;
  extractionNote: string | null;
  extractionProvenance: SourceExtractionProvenance | null;
};

export type ContextItemInput = {
  bucketId: string;
  name: string;
  reviewState: ReviewState;
  required: boolean;
};

export type ContextItemPatch = Partial<ContextItemInput>;

export type ScenarioDraftInput = {
  title: string;
  templateId: string;
  audience: string;
  launchMode: LaunchMode;
  difficulty: ScenarioDifficulty;
  learningObjectives: string;
  approvalStatus: ScenarioApprovalStatus;
  reviewerNotes?: string | null;
  reviewedAt?: string | null;
  reviewedByUserId?: string | null;
  reviewedByName?: string | null;
  scheduledStartAt: string | null;
  participantsLabel: string | null;
};

export type ScenarioDraftPatch = Partial<ScenarioDraftInput>;

export type LaunchInput = {
  scenarioDraftId: string;
  startsAt: string | null;
  participantsLabel: string | null;
};

export type LaunchPatch = Partial<LaunchInput> & {
  tabletopPhase?: TabletopPhase | null;
  facilitatorNotes?: string;
  status?: LaunchStatus;
};

export type ParticipantRunInput = {
  launchId: string;
  rosterMemberId: string | null;
  participantName: string;
  participantEmail: string | null;
  participantRole: string;
  participantTeam: string | null;
  dueAt: string | null;
};

export type ParticipantRunPatch = {
  rosterMemberId?: string | null;
  participantName?: string;
  participantEmail?: string | null;
  participantRole?: string;
  participantTeam?: string | null;
  dueAt?: string | null;
  status?: ParticipantRunStatus;
  firstAction?: string;
  escalationChoice?: string;
  impactAssessment?: string;
  notes?: string;
  policyAcknowledged?: boolean;
};

export type BootstrapPayload = {
  appName: string;
  stage: string;
  currentUser: WorkspaceUser;
  availableUsers: WorkspaceUser[];
  workspaceInvites: WorkspaceInvite[];
  auditEvents: AuditEvent[];
  nav: AdminNavItem[];
  summaryCards: AdminSummaryCard[];
  overview: OverviewData;
  sourceLibrary: DocumentSummary[];
  organizationContext: ContextBucket[];
  scenarioTemplates: ScenarioTemplate[];
  scenarioDrafts: ScenarioDraft[];
  rosterMembers: RosterMember[];
  participantAssignments: ParticipantRun[];
  launches: LaunchSummary[];
  reports: ReportSummary[];
};

export type RosterMemberInput = {
  fullName: string;
  email: string;
  roleTitle: string;
  team: string;
  managerName: string | null;
  status: RosterMemberStatus;
};

export type RosterMemberPatch = Partial<RosterMemberInput>;

export type WorkspaceUserInput = {
  fullName: string;
  email: string;
  role: WorkspaceUserRole;
  capabilities: WorkspaceUserCapability[];
  scopeTeams: string[];
  rosterMemberId: string | null;
  status: WorkspaceUserStatus;
};

export type WorkspaceUserPatch = Partial<WorkspaceUserInput>;

export type WorkspaceInviteInput = {
  email: string;
  fullName: string;
  role: WorkspaceUserRole;
  capabilities: WorkspaceUserCapability[];
  scopeTeams: string[];
  rosterMemberId: string | null;
};

export type WorkspaceInvitePatch = {
  status?: WorkspaceInviteStatus;
};

export type ParticipantRunTeamAssignmentInput = {
  launchId: string;
  team: string;
  dueAt: string | null;
};

export type ParticipantRunTeamAssignmentResult = {
  launchId: string;
  team: string;
  createdRuns: ParticipantRun[];
  skippedExistingCount: number;
};

export type ReportReviewUpdateInput = {
  closeoutNotes: string;
  followUpText: string;
  markClosed: boolean;
};
