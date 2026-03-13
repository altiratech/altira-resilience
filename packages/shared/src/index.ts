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
export type ScenarioApprovalStatus = 'draft' | 'ready_for_review' | 'approved';
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
  scheduledStartAt: string | null;
  participantsLabel: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LaunchStatus = 'draft' | 'scheduled' | 'in_progress' | 'completed';
export type RosterMemberStatus = 'active' | 'inactive';
export type WorkspaceUserRole = 'admin' | 'facilitator' | 'manager' | 'participant';
export type WorkspaceUserStatus = 'active' | 'inactive';

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
  rosterMemberId: string | null;
  status: WorkspaceUserStatus;
  updatedAt: string;
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

export type ReportStatus = 'in_review' | 'ready';

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
  nav: AdminNavItem[];
  summaryCards: AdminSummaryCard[];
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
