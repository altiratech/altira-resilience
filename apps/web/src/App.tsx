import { useEffect, useState } from 'react';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type {
  AdminNavId,
  AdminNavItem,
  AdminSummaryCard,
  AuditEvent,
  AuthSessionState,
  BootstrapPayload,
  ContextBucket,
  ContextItemInput,
  DocumentParseStatus,
  DocumentSummary,
  LaunchDetail,
  LaunchInput,
  LaunchMode,
  LaunchPatch,
  LaunchSummary,
  ParticipantRun,
  ParticipantRunDetail,
  ParticipantRunInput,
  ParticipantRunTeamAssignmentInput,
  PreviewAuthAccount,
  ReportDetail,
  ReportExportFormat,
  ReportSummary,
  RosterMember,
  RosterMemberInput,
  ScenarioApprovalStatus,
  ScenarioDifficulty,
  ScenarioDraft,
  ScenarioDraftInput,
  ScenarioTemplate,
  SourceDocumentDetail,
  SourceExtractionJob,
  SourceExtractionProvenance,
  SourceExtractionSuggestion,
  SuggestionStatus,
  TabletopPhase,
  WorkspaceInvite,
  WorkspaceInviteMagicLinkResult,
  WorkspaceInviteInput,
  WorkspaceUser,
  WorkspaceUserInput,
  WorkspaceUserCapability,
} from '@resilience/shared';
import {
  getBootstrap,
  getAuthSessionState,
  getLaunchDetail,
  getParticipantRun,
  getReportDetail,
  getSourceDocument,
  consumeInviteMagicLink,
  signInWithWorkspaceEmail,
  signOutCurrentSession,
  applySourceSuggestion,
  createContextItem,
  createLaunch,
  createParticipantRun,
  createParticipantRunsByTeam,
  createRosterMember,
  createWorkspaceInvite,
  createWorkspaceUser,
  createScenarioDraft,
  extractSourceDocument,
  exportReport,
  queueSourceDocumentExtraction,
  RequestError,
  updateReportReview,
  updateContextItem,
  updateLaunch,
  updateParticipantRun,
  updateRosterMember,
  sendWorkspaceInviteMagicLink,
  updateWorkspaceInvite,
  updateWorkspaceUser,
  updateScenarioDraft,
  updateSourceDocument,
  updateSourceSuggestionStatus,
  uploadSourceDocument,
} from './api';

type StudioStep = 'source-library' | 'org-context' | 'templates' | 'configuration';
type ExercisesView = 'pipeline' | 'studio' | 'launch-queue';
type MaterialsView = 'library' | 'context';
type PeopleView = 'directory' | 'access';

type ParticipantResponseForm = {
  firstAction: string;
  escalationChoice: string;
  impactAssessment: string;
  notes: string;
  policyAcknowledged: boolean;
};

type SignInFormState = {
  email: string;
};

type WorkspaceAccessForm = WorkspaceUserInput;
type WorkspaceInviteForm = WorkspaceInviteInput;
type TeamAssignmentForm = ParticipantRunTeamAssignmentInput;
type ReportCloseoutForm = {
  closeoutNotes: string;
  followUpText: string;
};

type SourceUploadForm = {
  name: string;
  type: string;
  businessUnit: string;
  owner: string;
  effectiveDate: string;
  file: File | null;
};

const stepTitles: Record<StudioStep, string> = {
  templates: 'Template Selection',
  configuration: 'Scenario Configuration',
  'source-library': 'Source Library',
  'org-context': 'Context Review',
};

const studioSteps: StudioStep[] = ['templates', 'configuration'];

const fallbackNav: AdminNavItem[] = [
  { id: 'home', label: 'Overview' },
  { id: 'launches', label: 'Exercises' },
  { id: 'reports', label: 'Evidence' },
  { id: 'roster', label: 'People' },
  { id: 'source-library', label: 'Materials' },
  { id: 'settings', label: 'Settings' },
];

const fallbackSummaryCards: AdminSummaryCard[] = [
  {
    id: 'active-exercises',
    label: 'Active exercises',
    value: '0',
    note: 'API unavailable. Showing local preview fallback.',
    tone: 'attention',
  },
];

const fallbackDocuments: DocumentSummary[] = [];
const fallbackContext: ContextBucket[] = [];
const fallbackTemplates: ScenarioTemplate[] = [
  {
    id: 'cyber-incident-escalation',
    name: 'Cyber Incident Escalation',
    description: 'Cross-functional response to identity or vendor compromise.',
    recommendedInputs: ['IR playbook', 'Escalation matrix', 'Vendor list'],
    primaryAudience: 'Operations + Compliance',
  },
];
const fallbackLaunches: LaunchSummary[] = [];
const fallbackReports: ReportSummary[] = [];
const fallbackDrafts: ScenarioDraft[] = [];
const fallbackRosterMembers: RosterMember[] = [];
const fallbackWorkspaceInvites: WorkspaceInvite[] = [];
const fallbackAuditEvents: AuditEvent[] = [];
const fallbackParticipantAssignments: ParticipantRun[] = [];
const fallbackOverview: BootstrapPayload['overview'] = {
  programHealth: fallbackSummaryCards,
  pendingApprovals: [],
  upcomingExercises: [],
  overdueAssignments: [],
  evidenceReady: [],
  recentAfterActions: [],
  coverageGaps: [],
};
const fallbackAvailableUsers: WorkspaceUser[] = [
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
];
const fallbackCurrentUser = fallbackAvailableUsers[0];
const SESSION_SETTLE_ATTEMPTS = 4;
const SESSION_SETTLE_DELAY_MS = 150;

const navCopy: Record<AdminNavId, { title: string; description: string }> = {
  home: {
    title: 'Overview',
    description: 'See what needs attention, what is live, and what evidence is ready.',
  },
  'source-library': {
    title: 'Materials',
    description: 'Keep firm materials and reviewed context current.',
  },
  'org-context': {
    title: 'Context Review',
    description: 'Confirm the teams, vendors, and escalation roles that shape exercises.',
  },
  'scenario-studio': {
    title: 'Scenario Studio',
    description: 'Build structured exercises from reviewed materials and approved context.',
  },
  roster: {
    title: 'People',
    description: 'Manage participants, managers, and workspace access.',
  },
  launches: {
    title: 'Exercises',
    description: 'Create, review, launch, and monitor exercises.',
  },
  reports: {
    title: 'Evidence',
    description: 'Review after-actions and export evidence.',
  },
  settings: {
    title: 'Settings',
    description: 'Set the operating standards for how this workspace runs.',
  },
};

function App() {
  const [loading, setLoading] = useState(true);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authState, setAuthState] = useState<AuthSessionState | null>(null);
  const [payload, setPayload] = useState<BootstrapPayload | null>(null);
  const [activeNav, setActiveNav] = useState<AdminNavId>('home');
  const [activeExercisesView, setActiveExercisesView] = useState<ExercisesView>('pipeline');
  const [activeMaterialsView, setActiveMaterialsView] = useState<MaterialsView>('library');
  const [activePeopleView, setActivePeopleView] = useState<PeopleView>('directory');
  const [activeStudioStep, setActiveStudioStep] = useState<StudioStep>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('cyber-incident-escalation');
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [selectedSourceDocumentId, setSelectedSourceDocumentId] = useState<string | null>(null);
  const [activeSourceDocument, setActiveSourceDocument] = useState<SourceDocumentDetail | null>(null);
  const [selectedLaunchId, setSelectedLaunchId] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedRosterMemberId, setSelectedRosterMemberId] = useState<string | null>(null);
  const [selectedWorkspaceUserId, setSelectedWorkspaceUserId] = useState<string | null>(null);
  const [activeLaunchDetail, setActiveLaunchDetail] = useState<LaunchDetail | null>(null);
  const [activeReportDetail, setActiveReportDetail] = useState<ReportDetail | null>(null);
  const [activeFacilitatorLaunchId, setActiveFacilitatorLaunchId] = useState<string | null>(null);
  const [activeParticipantRunId, setActiveParticipantRunId] = useState<string | null>(null);
  const [activeParticipantRun, setActiveParticipantRun] = useState<ParticipantRunDetail | null>(null);
  const [facilitatorNotesForm, setFacilitatorNotesForm] = useState('');
  const [reportCloseoutForm, setReportCloseoutForm] = useState<ReportCloseoutForm>(makeDefaultReportCloseoutForm());
  const [sourceUploadForm, setSourceUploadForm] = useState<SourceUploadForm>({
    name: '',
    type: 'Continuity Plan',
    businessUnit: 'Operations',
    owner: '',
    effectiveDate: '',
    file: null,
  });
  const [uploadResetKey, setUploadResetKey] = useState(0);
  const [contextForm, setContextForm] = useState<ContextItemInput>({
    bucketId: 'teams',
    name: '',
    reviewState: 'needs_review',
    required: true,
  });
  const [rosterForm, setRosterForm] = useState<RosterMemberInput>(makeDefaultRosterMemberInput());
  const [workspaceUserForm, setWorkspaceUserForm] = useState<WorkspaceAccessForm>(makeDefaultWorkspaceUserInput());
  const [workspaceInviteForm, setWorkspaceInviteForm] = useState<WorkspaceInviteForm>(makeDefaultWorkspaceInviteInput());
  const [draftForm, setDraftForm] = useState<ScenarioDraftInput>(makeDefaultDraftInput(fallbackTemplates[0]));
  const [draftReviewNotes, setDraftReviewNotes] = useState('');
  const [launchForm, setLaunchForm] = useState<LaunchInput>({
    scenarioDraftId: '',
    startsAt: null,
    participantsLabel: null,
  });
  const [participantAssignmentForm, setParticipantAssignmentForm] = useState<ParticipantRunInput>({
    launchId: '',
    rosterMemberId: null,
    participantName: '',
    participantEmail: null,
    participantRole: '',
    participantTeam: null,
    dueAt: null,
  });
  const [participantTeamAssignmentForm, setParticipantTeamAssignmentForm] = useState<TeamAssignmentForm>({
    launchId: '',
    team: '',
    dueAt: null,
  });
  const [participantResponseForm, setParticipantResponseForm] = useState<ParticipantResponseForm>({
    firstAction: '',
    escalationChoice: '',
    impactAssessment: '',
    notes: '',
    policyAcknowledged: false,
  });
  const [signInForm, setSignInForm] = useState<SignInFormState>({ email: '' });
  const [latestInviteMagicLink, setLatestInviteMagicLink] = useState<WorkspaceInviteMagicLinkResult | null>(null);

  const nav = payload?.nav ?? fallbackNav;
  const documents = payload?.sourceLibrary ?? fallbackDocuments;
  const contextBuckets = payload?.organizationContext ?? fallbackContext;
  const templates = payload?.scenarioTemplates ?? fallbackTemplates;
  const scenarioDrafts = payload?.scenarioDrafts ?? fallbackDrafts;
  const rosterMembers = payload?.rosterMembers ?? fallbackRosterMembers;
  const workspaceInvites = payload?.workspaceInvites ?? fallbackWorkspaceInvites;
  const auditEvents = payload?.auditEvents ?? fallbackAuditEvents;
  const currentUser = payload?.currentUser ?? fallbackCurrentUser;
  const availableUsers = payload?.availableUsers ?? fallbackAvailableUsers;
  const participantAssignments = payload?.participantAssignments ?? fallbackParticipantAssignments;
  const launches = payload?.launches ?? fallbackLaunches;
  const reports = payload?.reports ?? fallbackReports;
  const overview = payload?.overview ?? fallbackOverview;
  const previewAccounts = authState?.previewAccounts ?? [];
  const authenticated = authState?.authenticated ?? false;
  const approvedDrafts = scenarioDrafts.filter((draft) => draft.approvalStatus === 'approved');
  const selectedScenarioTemplate =
    templates.find((template) => template.id === selectedTemplate) ?? templates[0];
  const participantWorkspace = currentUser.role === 'user';
  const participantView = Boolean(activeParticipantRun);
  const facilitatorView =
    Boolean(activeFacilitatorLaunchId) &&
    activeLaunchDetail?.id === activeFacilitatorLaunchId &&
    activeLaunchDetail.mode === 'tabletop';

  const headerCopy = participantView
    ? {
        title: activeParticipantRun?.launchName ?? 'Participant Exercise',
        description:
          activeParticipantRun && canWriteParticipantRun(currentUser, activeParticipantRun)
            ? 'Complete the assigned exercise, work from the controlling procedure, and submit a response that becomes part of the launch evidence.'
            : 'Review the submitted or assigned run record without changing the participant evidence directly.',
      }
    : facilitatorView
      ? {
          title: activeLaunchDetail?.name ?? 'Facilitator Tabletop',
          description:
            'Facilitator mode keeps launch control, phase management, roster review, and after-action note capture in one tabletop control surface.',
        }
    : participantWorkspace
      ? {
          title: 'My Exercises',
          description:
            'Open assigned exercises, work through the required decisions, and submit a traceable response tied to the firm’s procedure.',
        }
    : activeNav === 'launches'
      ? activeExercisesView === 'studio'
        ? {
            title: 'Scenario Studio',
            description:
              activeStudioStep === 'configuration'
                ? 'Turn reviewed materials into launch-ready exercise drafts without leaving the broader exercise workflow.'
                : navCopy['scenario-studio'].description,
          }
        : activeExercisesView === 'launch-queue'
          ? {
              title: 'Launch Queue',
              description:
                'Run approved exercises as scheduled operational work with participant assignment, launch control, and facilitator access.',
            }
          : {
              title: 'Exercises',
              description:
                'Move from draft review to launch and completion in one exercise pipeline built for recurring readiness programs.',
            }
    : activeNav === 'source-library'
      ? {
          title: 'Materials',
          description:
            activeMaterialsView === 'context'
              ? navCopy['org-context'].description
              : navCopy['source-library'].description,
        }
    : activeNav === 'roster'
      ? {
          title: 'People',
          description:
            activePeopleView === 'access'
              ? 'Review the current workspace access model and role assignments that sit on top of the participant directory.'
              : navCopy.roster.description,
        }
      : navCopy[activeNav];

  useEffect(() => {
    void initializeApp();
  }, []);

  useEffect(() => {
    if (!contextBuckets.length) return;
    const currentBucketExists = contextBuckets.some((bucket) => bucket.id === contextForm.bucketId);
    if (!currentBucketExists) {
      setContextForm((current) => ({ ...current, bucketId: contextBuckets[0].id }));
    }
  }, [contextBuckets, contextForm.bucketId]);

  useEffect(() => {
    if (activeDraftId || !selectedScenarioTemplate) return;
    setDraftForm((current) => ({
      ...current,
      templateId: selectedScenarioTemplate.id,
      audience: selectedScenarioTemplate.primaryAudience,
      title: current.title ? current.title : defaultTitleForTemplate(selectedScenarioTemplate),
    }));
  }, [activeDraftId, selectedScenarioTemplate]);

  useEffect(() => {
    if (!approvedDrafts.length) {
      setLaunchForm({ scenarioDraftId: '', startsAt: null, participantsLabel: null });
      return;
    }

    const selectedDraft =
      approvedDrafts.find((draft) => draft.id === launchForm.scenarioDraftId) ?? approvedDrafts[0];

    setLaunchForm((current) => ({
      scenarioDraftId: selectedDraft.id,
      startsAt: current.scenarioDraftId === selectedDraft.id ? current.startsAt : selectedDraft.scheduledStartAt,
      participantsLabel:
        current.scenarioDraftId === selectedDraft.id ? current.participantsLabel : selectedDraft.participantsLabel,
    }));
  }, [approvedDrafts, launchForm.scenarioDraftId]);

  useEffect(() => {
    if (!activeLaunchDetail || activeLaunchDetail.mode !== 'tabletop') {
      setFacilitatorNotesForm('');
      return;
    }

    setFacilitatorNotesForm(activeLaunchDetail.facilitatorNotes);
  }, [activeLaunchDetail]);

  useEffect(() => {
    if (!activeReportDetail) {
      setReportCloseoutForm(makeDefaultReportCloseoutForm());
      return;
    }

    setReportCloseoutForm({
      closeoutNotes: activeReportDetail.closeoutNotes,
      followUpText: activeReportDetail.followUpActions.join('\n'),
    });
  }, [activeReportDetail]);

  useEffect(() => {
    if (!documents.length) {
      setSelectedSourceDocumentId(null);
      setActiveSourceDocument(null);
      return;
    }

    if (selectedSourceDocumentId && documents.some((document) => document.id === selectedSourceDocumentId)) {
      return;
    }

    void handleSelectSourceDocument(documents[0].id);
  }, [documents, selectedSourceDocumentId]);

  useEffect(() => {
    if (!launches.length) {
      setSelectedLaunchId(null);
      setActiveLaunchDetail(null);
      setActiveFacilitatorLaunchId(null);
      setParticipantAssignmentForm((current) => ({ ...current, launchId: '' }));
      return;
    }

    if (selectedLaunchId && launches.some((launch) => launch.id === selectedLaunchId)) {
      setParticipantAssignmentForm((current) => ({ ...current, launchId: selectedLaunchId }));
      return;
    }

    void handleSelectLaunch(launches[0].id);
  }, [launches, selectedLaunchId]);

  useEffect(() => {
    if (!activeFacilitatorLaunchId) return;
    if (!launches.some((launch) => launch.id === activeFacilitatorLaunchId)) {
      setActiveFacilitatorLaunchId(null);
    }
  }, [activeFacilitatorLaunchId, launches]);

  useEffect(() => {
    if (!reports.length) {
      setSelectedReportId(null);
      setActiveReportDetail(null);
      return;
    }

    if (selectedReportId && reports.some((report) => report.id === selectedReportId)) {
      return;
    }

    void handleSelectReport(reports[0].id);
  }, [reports, selectedReportId]);

  useEffect(() => {
    if (!selectedRosterMemberId) return;
    if (!rosterMembers.some((member) => member.id === selectedRosterMemberId)) {
      setSelectedRosterMemberId(null);
      setRosterForm(makeDefaultRosterMemberInput());
    }
  }, [rosterMembers, selectedRosterMemberId]);

  useEffect(() => {
    if (!selectedWorkspaceUserId) return;
    const selectedUser = availableUsers.find((user) => user.id === selectedWorkspaceUserId);
    if (!selectedUser) {
      setSelectedWorkspaceUserId(null);
      setWorkspaceUserForm(makeDefaultWorkspaceUserInput());
      return;
    }

    setWorkspaceUserForm(makeWorkspaceUserForm(selectedUser));
  }, [availableUsers, selectedWorkspaceUserId]);

  useEffect(() => {
    if (!nav.some((item) => item.id === activeNav)) {
      setActiveNav(nav[0]?.id ?? 'home');
    }
  }, [activeNav, nav]);

  async function initializeApp() {
    setError(null);
    setLoading(true);
    try {
      const magicLinkToken = readMagicLinkTokenFromUrl();
      if (magicLinkToken) {
        const session = await consumeInviteMagicLink(magicLinkToken);
        clearMagicLinkTokenFromUrl();
        setAuthState(session);
        setSignInForm({ email: session.currentUser?.email ?? '' });
        await settleAuthenticatedSession(session);
        await reloadBootstrap({ preserveErrorState: true });
        return;
      }

      const session = await getAuthSessionState();
      setAuthState(session);

      if (!session.authenticated) {
        setPayload(null);
        return;
      }

      await reloadBootstrap({ preserveErrorState: true });
    } catch (loadError) {
      if (readMagicLinkTokenFromUrl()) {
        clearMagicLinkTokenFromUrl();
      }
      setError(loadError instanceof Error ? loadError.message : 'Unable to load Altira Resilience data.');
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }

  async function reloadBootstrap(options?: { preserveErrorState?: boolean }) {
    if (!options?.preserveErrorState) {
      setError(null);
    }

    try {
      const data = await getBootstrap();
      setPayload(data);
      if (data.scenarioTemplates.length > 0 && !data.scenarioTemplates.some((template) => template.id === selectedTemplate)) {
        setSelectedTemplate(data.scenarioTemplates[0].id);
      }
      if (data.organizationContext.length > 0 && !data.organizationContext.some((bucket) => bucket.id === contextForm.bucketId)) {
        setContextForm((current) => ({ ...current, bucketId: data.organizationContext[0].id }));
      }
    } catch (loadError) {
      if (loadError instanceof RequestError && loadError.status === 401) {
        const session = await getAuthSessionState().catch(() => null);
        setAuthState(
          session ?? {
            authenticated: false,
            currentUser: null,
            session: null,
            signInMode: 'workspace_email',
            previewAccounts: [],
          },
        );
        setPayload(null);
        return;
      }

      throw loadError;
    }
  }

  function handleNavChange(nextNav: AdminNavId) {
    closeParticipantRun();
    closeFacilitatorConsole();

    if (nextNav === 'home') {
      setActiveNav('home');
      return;
    }

    if (nextNav === 'launches') {
      setActiveNav('launches');
      setActiveExercisesView('pipeline');
      return;
    }

    if (nextNav === 'reports') {
      setActiveNav('reports');
      return;
    }

    if (nextNav === 'roster') {
      setActiveNav('roster');
      setActivePeopleView('directory');
      return;
    }

    if (nextNav === 'source-library') {
      setActiveNav('source-library');
      setActiveMaterialsView('library');
      return;
    }

    setActiveNav('settings');
  }

  async function withBusyState(label: string, action: () => Promise<void>) {
    setBusyLabel(label);
    setError(null);
    try {
      await action();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Request failed.');
    } finally {
      setBusyLabel(null);
    }
  }

  function resetShellState() {
    setActiveNav('home');
    setActiveExercisesView('pipeline');
    setActiveMaterialsView('library');
    setActivePeopleView('directory');
    closeParticipantRun();
    closeFacilitatorConsole();
    setSelectedSourceDocumentId(null);
    setActiveSourceDocument(null);
    setSelectedLaunchId(null);
    setActiveLaunchDetail(null);
    setSelectedReportId(null);
    setActiveReportDetail(null);
    setSelectedWorkspaceUserId(null);
    setWorkspaceUserForm(makeDefaultWorkspaceUserInput());
    setWorkspaceInviteForm(makeDefaultWorkspaceInviteInput());
    setDraftReviewNotes('');
    setParticipantTeamAssignmentForm(makeDefaultTeamAssignmentInput());
    setReportCloseoutForm(makeDefaultReportCloseoutForm());
    setLatestInviteMagicLink(null);
  }

  async function handleSignIn(email: string) {
    await withBusyState('Signing in', async () => {
      const session = await signInWithWorkspaceEmail(email);
      setAuthState(session);
      setSignInForm({ email: session.currentUser?.email ?? email });
      resetShellState();
      const settledSession = await settleAuthenticatedSession(session);
      if (!settledSession.authenticated || !settledSession.session) {
        throw new Error('Sign-in succeeded, but the browser did not finish establishing the session. Retry once or allow cookies for this preview.');
      }
      await reloadBootstrap();
    });
  }

  async function handleSignOut() {
    await withBusyState('Signing out', async () => {
      const session = await signOutCurrentSession();
      setAuthState(session);
      setPayload(null);
      resetShellState();
    });
  }

  async function refreshSelections(options?: {
    sourceDocumentId?: string | null;
    launchId?: string | null;
    reportId?: string | null;
    participantRunId?: string | null;
  }) {
    await reloadBootstrap();

    if (options?.sourceDocumentId) {
      await handleSelectSourceDocument(options.sourceDocumentId, true);
    }

    if (options?.launchId) {
      await handleSelectLaunch(options.launchId, true);
    }

    if (options?.reportId) {
      await handleSelectReport(options.reportId, true);
    }

    if (options?.participantRunId) {
      await openParticipantRun(options.participantRunId, true);
    }
  }

  async function settleAuthenticatedSession(initialState: AuthSessionState): Promise<AuthSessionState> {
    let latestState = initialState;

    if (initialState.authenticated && initialState.session) {
      return initialState;
    }

    for (let attempt = 0; attempt < SESSION_SETTLE_ATTEMPTS; attempt += 1) {
      const sessionState = await getAuthSessionState().catch(() => null);
      if (sessionState) {
        latestState = sessionState;
        setAuthState(sessionState);
      }

      if (sessionState?.authenticated && sessionState.session) {
        return sessionState;
      }

      if (attempt < SESSION_SETTLE_ATTEMPTS - 1) {
        await delay(SESSION_SETTLE_DELAY_MS * (attempt + 1));
      }
    }

    return latestState;
  }

  function startNewDraftFromTemplate(template: ScenarioTemplate) {
    setSelectedTemplate(template.id);
    setActiveDraftId(null);
    setDraftForm(makeDefaultDraftInput(template));
    setDraftReviewNotes('');
    setActiveNav('launches');
    setActiveExercisesView('studio');
    setActiveStudioStep('configuration');
  }

  function loadSavedDraft(draft: ScenarioDraft) {
    setActiveDraftId(draft.id);
    setSelectedTemplate(draft.templateId);
    setDraftForm({
      title: draft.title,
      templateId: draft.templateId,
      audience: draft.audience,
      launchMode: draft.launchMode,
      difficulty: draft.difficulty,
      learningObjectives: draft.learningObjectives,
      approvalStatus: draft.approvalStatus,
      scheduledStartAt: draft.scheduledStartAt,
      participantsLabel: draft.participantsLabel,
    });
    setDraftReviewNotes(draft.reviewerNotes ?? '');
    setActiveNav('launches');
    setActiveExercisesView('studio');
    setActiveStudioStep('configuration');
  }

  async function handleSelectSourceDocument(documentId: string, silent = false) {
    if (!silent) setBusyLabel('Loading source document');

    try {
      const document = await getSourceDocument(documentId);
      setSelectedSourceDocumentId(documentId);
      setActiveSourceDocument(document);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load source document detail.');
    } finally {
      if (!silent) setBusyLabel(null);
    }
  }

  async function handleSourceUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const uploadFile = sourceUploadForm.file;

    if (!uploadFile) {
      setError('Choose a supported text, PDF, or Office file to upload.');
      return;
    }

    await withBusyState('Uploading source file', async () => {
      const formData = new FormData();
      formData.set('file', uploadFile);
      formData.set('name', sourceUploadForm.name.trim() || stripFileExtension(uploadFile.name));
      formData.set('type', sourceUploadForm.type);
      formData.set('businessUnit', sourceUploadForm.businessUnit);
      formData.set('owner', sourceUploadForm.owner);
      formData.set('effectiveDate', sourceUploadForm.effectiveDate);

      const document = await uploadSourceDocument(formData);
      setSourceUploadForm({
        name: '',
        type: 'Continuity Plan',
        businessUnit: 'Operations',
        owner: '',
        effectiveDate: '',
        file: null,
      });
      setUploadResetKey((current) => current + 1);
      setActiveNav('source-library');
      setActiveMaterialsView('library');
      await refreshSelections({
        sourceDocumentId: document.id,
        launchId: selectedLaunchId,
        reportId: selectedReportId,
        participantRunId: activeParticipantRunId,
      });
    });
  }

  async function handleDocumentStatusChange(documentId: string, parseStatus: DocumentParseStatus) {
    await withBusyState('Updating document', async () => {
      await updateSourceDocument(documentId, { parseStatus });
      await refreshSelections({
        sourceDocumentId: documentId,
        launchId: selectedLaunchId,
        reportId: selectedReportId,
        participantRunId: activeParticipantRunId,
      });
    });
  }

  async function handleDocumentExtraction(documentId: string) {
    await withBusyState('Running document extraction', async () => {
      await extractSourceDocument(documentId);
      await refreshSelections({
        sourceDocumentId: documentId,
        launchId: selectedLaunchId,
        reportId: selectedReportId,
        participantRunId: activeParticipantRunId,
      });
    });
  }

  async function handleQueueDocumentExtraction(documentId: string) {
    await withBusyState('Queueing extraction follow-up', async () => {
      await queueSourceDocumentExtraction(documentId);
      await refreshSelections({
        sourceDocumentId: documentId,
        launchId: selectedLaunchId,
        reportId: selectedReportId,
        participantRunId: activeParticipantRunId,
      });
    });
  }

  async function handleSuggestionStatusChange(suggestionId: string, status: SuggestionStatus) {
    if (!selectedSourceDocumentId) return;

    await withBusyState('Updating suggestion', async () => {
      await updateSourceSuggestionStatus(suggestionId, status);
      await refreshSelections({
        sourceDocumentId: selectedSourceDocumentId,
        launchId: selectedLaunchId,
        reportId: selectedReportId,
        participantRunId: activeParticipantRunId,
      });
    });
  }

  async function handleSuggestionApply(suggestionId: string) {
    if (!selectedSourceDocumentId) return;

    await withBusyState('Applying suggestion', async () => {
      await applySourceSuggestion(suggestionId);
      await refreshSelections({
        sourceDocumentId: selectedSourceDocumentId,
        launchId: selectedLaunchId,
        reportId: selectedReportId,
        participantRunId: activeParticipantRunId,
      });
    });
  }

  async function handleCreateContextItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await withBusyState('Saving context item', async () => {
      await createContextItem(contextForm);
      setContextForm((current) => ({ ...current, name: '' }));
      await refreshSelections({
        sourceDocumentId: selectedSourceDocumentId,
        launchId: selectedLaunchId,
        reportId: selectedReportId,
        participantRunId: activeParticipantRunId,
      });
    });
  }

  async function handleContextItemPatch(itemId: string, patch: Partial<ContextItemInput>) {
    await withBusyState('Updating context item', async () => {
      await updateContextItem(itemId, patch);
      await refreshSelections({
        sourceDocumentId: selectedSourceDocumentId,
        launchId: selectedLaunchId,
        reportId: selectedReportId,
        participantRunId: activeParticipantRunId,
      });
    });
  }

  function loadRosterMember(member: RosterMember | null) {
    setSelectedRosterMemberId(member?.id ?? null);
    setRosterForm(member ? mapRosterMemberToInput(member) : makeDefaultRosterMemberInput());
    setActiveNav('roster');
    setActivePeopleView('directory');
  }

  async function handleSaveRosterMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payloadToSave: RosterMemberInput = {
      ...rosterForm,
      fullName: rosterForm.fullName.trim(),
      email: rosterForm.email.trim(),
      roleTitle: rosterForm.roleTitle.trim(),
      team: rosterForm.team.trim(),
      managerName: rosterForm.managerName?.trim() ? rosterForm.managerName.trim() : null,
    };

    await withBusyState(selectedRosterMemberId ? 'Updating roster member' : 'Saving roster member', async () => {
      const member = selectedRosterMemberId
        ? await updateRosterMember(selectedRosterMemberId, payloadToSave)
        : await createRosterMember(payloadToSave);

      setSelectedRosterMemberId(member.id);
      setRosterForm(mapRosterMemberToInput(member));
      await refreshSelections({
        sourceDocumentId: selectedSourceDocumentId,
        launchId: selectedLaunchId,
        reportId: selectedReportId,
        participantRunId: activeParticipantRunId,
      });
      setActiveNav('roster');
      setActivePeopleView('directory');
    });
  }

  function resetRosterForm() {
    setSelectedRosterMemberId(null);
    setRosterForm(makeDefaultRosterMemberInput());
  }

  function loadWorkspaceUser(user: WorkspaceUser | null) {
    setSelectedWorkspaceUserId(user?.id ?? null);
    setWorkspaceUserForm(user ? makeWorkspaceUserForm(user) : makeDefaultWorkspaceUserInput());
    setActiveNav('roster');
    setActivePeopleView('access');
  }

  async function handleSaveWorkspaceUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payloadToSave: WorkspaceUserInput = {
      ...workspaceUserForm,
      fullName: workspaceUserForm.fullName.trim(),
      email: workspaceUserForm.email.trim().toLowerCase(),
      scopeTeams: workspaceUserForm.role === 'manager' ? workspaceUserForm.scopeTeams : [],
      rosterMemberId: workspaceUserForm.rosterMemberId || null,
      capabilities: workspaceUserForm.capabilities,
    };

    await withBusyState(selectedWorkspaceUserId ? 'Updating workspace user' : 'Creating workspace user', async () => {
      const workspaceUser = selectedWorkspaceUserId
        ? await updateWorkspaceUser(selectedWorkspaceUserId, payloadToSave)
        : await createWorkspaceUser(payloadToSave);

      setSelectedWorkspaceUserId(workspaceUser.id);
      setWorkspaceUserForm(makeWorkspaceUserForm(workspaceUser));
      await refreshSelections({
        sourceDocumentId: selectedSourceDocumentId,
        launchId: selectedLaunchId,
        reportId: selectedReportId,
        participantRunId: activeParticipantRunId,
      });
      setActiveNav('roster');
      setActivePeopleView('access');
    });
  }

  async function handleSetWorkspaceUserStatus(user: WorkspaceUser, status: WorkspaceUser['status']) {
    const statusLabel = status === 'active' ? 'Reactivating workspace user' : 'Deactivating workspace user';
    await withBusyState(statusLabel, async () => {
      const workspaceUser = await updateWorkspaceUser(user.id, { status });
      if (selectedWorkspaceUserId === user.id) {
        setWorkspaceUserForm(makeWorkspaceUserForm(workspaceUser));
      }
      await refreshSelections({
        sourceDocumentId: selectedSourceDocumentId,
        launchId: selectedLaunchId,
        reportId: selectedReportId,
        participantRunId: activeParticipantRunId,
      });
      setActiveNav('roster');
      setActivePeopleView('access');
    });
  }

  function resetWorkspaceUserForm() {
    setSelectedWorkspaceUserId(null);
    setWorkspaceUserForm(makeDefaultWorkspaceUserInput());
  }

  async function handleCreateWorkspaceInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payloadToSave: WorkspaceInviteInput = {
      ...workspaceInviteForm,
      fullName: workspaceInviteForm.fullName.trim(),
      email: workspaceInviteForm.email.trim().toLowerCase(),
      scopeTeams: workspaceInviteForm.role === 'manager' ? workspaceInviteForm.scopeTeams : [],
      rosterMemberId: workspaceInviteForm.rosterMemberId || null,
      capabilities: workspaceInviteForm.capabilities,
    };

    await withBusyState('Creating invite', async () => {
      await createWorkspaceInvite(payloadToSave);
      setWorkspaceInviteForm(makeDefaultWorkspaceInviteInput());
      await refreshSelections({
        sourceDocumentId: selectedSourceDocumentId,
        launchId: selectedLaunchId,
        reportId: selectedReportId,
        participantRunId: activeParticipantRunId,
      });
      setActiveNav('roster');
      setActivePeopleView('access');
    });
  }

  async function handleRevokeWorkspaceInvite(inviteId: string) {
    await withBusyState('Revoking invite', async () => {
      await updateWorkspaceInvite(inviteId, { status: 'revoked' });
      await refreshSelections({
        sourceDocumentId: selectedSourceDocumentId,
        launchId: selectedLaunchId,
        reportId: selectedReportId,
        participantRunId: activeParticipantRunId,
      });
      setActiveNav('roster');
      setActivePeopleView('access');
    });
  }

  async function handleReopenWorkspaceInvite(inviteId: string) {
    await withBusyState('Reopening invite', async () => {
      await updateWorkspaceInvite(inviteId, { status: 'pending' });
      await refreshSelections({
        sourceDocumentId: selectedSourceDocumentId,
        launchId: selectedLaunchId,
        reportId: selectedReportId,
        participantRunId: activeParticipantRunId,
      });
      setActiveNav('roster');
      setActivePeopleView('access');
    });
  }

  async function handleSendWorkspaceInviteMagicLink(inviteId: string) {
    await withBusyState('Issuing magic link', async () => {
      const result = await sendWorkspaceInviteMagicLink(inviteId);
      setLatestInviteMagicLink(result);
      await refreshSelections({
        sourceDocumentId: selectedSourceDocumentId,
        launchId: selectedLaunchId,
        reportId: selectedReportId,
        participantRunId: activeParticipantRunId,
      });
      setActiveNav('roster');
      setActivePeopleView('access');
    });
  }

  async function handleDraftSave(nextStatus?: ScenarioApprovalStatus) {
    const reviewerNotes = draftReviewNotes.trim();
    const statusToSave = nextStatus ?? draftForm.approvalStatus;

    if (statusToSave === 'changes_requested' && !reviewerNotes) {
      setError('Add reviewer notes before requesting changes on a draft.');
      return;
    }

    const payloadToSave: ScenarioDraftInput = {
      ...draftForm,
      templateId: selectedScenarioTemplate.id,
      audience: draftForm.audience.trim() || selectedScenarioTemplate.primaryAudience,
      title: draftForm.title.trim() || defaultTitleForTemplate(selectedScenarioTemplate),
      approvalStatus: statusToSave,
      reviewerNotes: reviewerNotes ? reviewerNotes : null,
    };

    await withBusyState('Saving scenario draft', async () => {
      const draft = activeDraftId
        ? await updateScenarioDraft(activeDraftId, payloadToSave)
        : await createScenarioDraft(payloadToSave);

      setActiveDraftId(draft.id);
      setSelectedTemplate(draft.templateId);
      setDraftForm({
        title: draft.title,
        templateId: draft.templateId,
        audience: draft.audience,
        launchMode: draft.launchMode,
        difficulty: draft.difficulty,
        learningObjectives: draft.learningObjectives,
        approvalStatus: draft.approvalStatus,
        scheduledStartAt: draft.scheduledStartAt,
        participantsLabel: draft.participantsLabel,
      });
      setDraftReviewNotes(draft.reviewerNotes ?? '');
      await refreshSelections({
        sourceDocumentId: selectedSourceDocumentId,
        launchId: selectedLaunchId,
        reportId: selectedReportId,
        participantRunId: activeParticipantRunId,
      });
    });
  }

  function handleLaunchDraftSelection(draftId: string) {
    const draft = approvedDrafts.find((entry) => entry.id === draftId);
    setLaunchForm({
      scenarioDraftId: draftId,
      startsAt: draft?.scheduledStartAt ?? null,
      participantsLabel: draft?.participantsLabel ?? null,
    });
  }

  async function handleCreateLaunch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await withBusyState('Creating launch', async () => {
      const launch = await createLaunch(launchForm);
      setParticipantAssignmentForm({
        launchId: launch.id,
        rosterMemberId: null,
        participantName: '',
        participantEmail: null,
        participantRole: '',
        participantTeam: null,
        dueAt: launch.startsAt,
      });
      setParticipantTeamAssignmentForm({
        launchId: launch.id,
        team: '',
        dueAt: launch.startsAt,
      });
      setActiveNav('launches');
      setActiveExercisesView('launch-queue');
      await refreshSelections({
        sourceDocumentId: selectedSourceDocumentId,
        launchId: launch.id,
        reportId: launch.id,
      });
    });
  }

  async function handleSelectLaunch(launchId: string, silent = false) {
    if (!silent) {
      setBusyLabel('Loading launch');
    }

    try {
      const launch = await getLaunchDetail(launchId);
      setSelectedLaunchId(launchId);
      setActiveLaunchDetail(launch);
      setParticipantAssignmentForm((current) => ({
        launchId,
        rosterMemberId: current.launchId === launchId ? current.rosterMemberId : null,
        participantName: current.launchId === launchId ? current.participantName : '',
        participantEmail: current.launchId === launchId ? current.participantEmail : null,
        participantRole: current.launchId === launchId ? current.participantRole : '',
        participantTeam: current.launchId === launchId ? current.participantTeam : null,
        dueAt: current.launchId === launchId ? current.dueAt : launch.startsAt,
      }));
      setParticipantTeamAssignmentForm((current) => ({
        launchId,
        team: current.launchId === launchId ? current.team : '',
        dueAt: current.launchId === launchId ? current.dueAt : launch.startsAt,
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load launch detail.');
    } finally {
      if (!silent) {
        setBusyLabel(null);
      }
    }
  }

  function openFacilitatorConsole(launchId: string) {
    setActiveParticipantRunId(null);
    setActiveParticipantRun(null);
    setActiveFacilitatorLaunchId(launchId);
    setActiveNav('launches');
    setActiveExercisesView('launch-queue');
  }

  function closeFacilitatorConsole() {
    setActiveFacilitatorLaunchId(null);
  }

  async function handleLaunchPatch(launchId: string, patch: LaunchPatch, label: string) {
    await withBusyState(label, async () => {
      await updateLaunch(launchId, patch);
      await refreshSelections({
        sourceDocumentId: selectedSourceDocumentId,
        launchId,
        reportId: launchId,
        participantRunId: activeParticipantRunId,
      });
    });
  }

  async function handleSelectReport(launchId: string, silent = false) {
    if (!silent) {
      setBusyLabel('Loading report');
    }

    try {
      const report = await getReportDetail(launchId);
      setSelectedReportId(launchId);
      setActiveReportDetail(report);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load report detail.');
    } finally {
      if (!silent) {
        setBusyLabel(null);
      }
    }
  }

  async function handleExportReport(launchId: string, format: ReportExportFormat) {
    const label = format === 'json' ? 'Preparing JSON evidence package' : 'Preparing markdown after-action brief';

    await withBusyState(label, async () => {
      const exportFile = await exportReport(launchId, format);
      triggerDownload(exportFile.fileName, exportFile.content, exportFile.mimeType);
    });
  }

  async function handleUpdateReportCloseout(launchId: string, markClosed: boolean) {
    const label = markClosed ? 'Closing evidence package' : 'Saving closeout notes';

    await withBusyState(label, async () => {
      await updateReportReview(launchId, {
        closeoutNotes: reportCloseoutForm.closeoutNotes,
        followUpText: reportCloseoutForm.followUpText,
        markClosed,
      });
      await refreshSelections({
        sourceDocumentId: selectedSourceDocumentId,
        launchId: selectedLaunchId,
        reportId: launchId,
        participantRunId: activeParticipantRunId,
      });
    });
  }

  async function handleCreateParticipantRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await withBusyState('Assigning participant', async () => {
      const run = await createParticipantRun(participantAssignmentForm);
      setParticipantAssignmentForm((current) => ({
        ...current,
        rosterMemberId: null,
        participantName: '',
        participantEmail: null,
        participantRole: '',
        participantTeam: null,
      }));
      await refreshSelections({
        sourceDocumentId: selectedSourceDocumentId,
        launchId: participantAssignmentForm.launchId,
        reportId: participantAssignmentForm.launchId,
        participantRunId: activeParticipantRunId ?? undefined,
      });
      if (run.launchId === selectedLaunchId) {
        await handleSelectLaunch(run.launchId, true);
      }
    });
  }

  async function handleAssignTeamToLaunch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await withBusyState('Assigning team', async () => {
      await createParticipantRunsByTeam(participantTeamAssignmentForm);
      setParticipantTeamAssignmentForm((current) => ({
        ...current,
        team: '',
      }));
      await refreshSelections({
        sourceDocumentId: selectedSourceDocumentId,
        launchId: participantTeamAssignmentForm.launchId,
        reportId: participantTeamAssignmentForm.launchId,
        participantRunId: activeParticipantRunId ?? undefined,
      });
      if (participantTeamAssignmentForm.launchId === selectedLaunchId) {
        await handleSelectLaunch(participantTeamAssignmentForm.launchId, true);
      }
    });
  }

  async function openParticipantRun(runId: string, silent = false) {
    if (!silent) {
      setBusyLabel('Loading participant run');
    }

    try {
      const run = await getParticipantRun(runId);
      setActiveFacilitatorLaunchId(null);
      setActiveParticipantRunId(runId);
      setActiveParticipantRun(run);
      setParticipantResponseForm({
        firstAction: run.firstAction,
        escalationChoice: run.escalationChoice,
        impactAssessment: run.impactAssessment,
        notes: run.notes,
        policyAcknowledged: run.policyAcknowledged,
      });
      setActiveNav('launches');
      setActiveExercisesView('launch-queue');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load participant run.');
    } finally {
      if (!silent) {
        setBusyLabel(null);
      }
    }
  }

  function closeParticipantRun() {
    setActiveParticipantRunId(null);
    setActiveParticipantRun(null);
    setParticipantResponseForm({
      firstAction: '',
      escalationChoice: '',
      impactAssessment: '',
      notes: '',
      policyAcknowledged: false,
    });
  }

  async function handleParticipantResponseSave(submit = false) {
    if (!activeParticipantRun) return;

    await withBusyState(submit ? 'Submitting response' : 'Saving participant progress', async () => {
      await updateParticipantRun(activeParticipantRun.id, {
        ...participantResponseForm,
        status: submit ? 'submitted' : undefined,
      });
      await refreshSelections({
        sourceDocumentId: selectedSourceDocumentId,
        launchId: activeParticipantRun.launchId,
        reportId: activeParticipantRun.launchId,
        participantRunId: activeParticipantRun.id,
      });
    });
  }

  if (loading) {
    return (
      <div className="auth-shell">
        <div className="auth-panel">
          <div className="eyebrow">Altira</div>
          <h1>Resilience</h1>
          <p>Loading workspace session and readiness console.</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <SignInPanel
        error={error}
        busyLabel={busyLabel}
        email={signInForm.email}
        previewAccounts={previewAccounts}
        onEmailChange={(email) => setSignInForm({ email })}
        onSubmit={() => void handleSignIn(signInForm.email)}
        onUsePreviewAccount={(email) => void handleSignIn(email)}
      />
    );
  }

  if (!payload) {
    return (
      <div className="auth-shell">
        <section className="auth-panel auth-panel-primary">
          <div className="eyebrow">Altira</div>
          <h1>Resilience</h1>
          <p>We found your session, but the workspace console did not finish loading.</p>
          {error ? <div className="notice notice-error">{error}</div> : null}
          <div className="button-row">
            <button type="button" className="button-primary" onClick={() => void initializeApp()}>
              Retry load
            </button>
            <button type="button" className="button-secondary" onClick={() => void handleSignOut()}>
              Sign out
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={participantWorkspace ? 'shell shell-participant' : 'shell'}>
      {!participantWorkspace ? (
        <aside className="sidebar">
          <div className="brand">
            <div className="eyebrow">Altira</div>
            <h1>Resilience</h1>
            <p>Operational console for readiness programs, exercises, and evidence.</p>
          </div>
          <nav className="nav">
            {nav.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === activeNav && !participantView && !facilitatorView ? 'nav-item active' : 'nav-item'}
                onClick={() => handleNavChange(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>
      ) : null}

      <main className="main">
        <header className="header">
          <div>
            <div className="eyebrow">
              {participantView
                ? 'Assigned Exercise'
                : facilitatorView
                  ? 'Facilitator Control'
                  : participantWorkspace
                    ? 'Readiness Work'
                    : activeNav === 'home'
                      ? 'Readiness Program'
                      : headerCopy.title}
            </div>
            <h2>{headerCopy.title}</h2>
            <p>{headerCopy.description}</p>
          </div>
          <div className="meta">
            <span className="chip">{currentUser.fullName}</span>
            <span className="chip muted">{formatWorkspaceRoleLabel(currentUser.role)}</span>
            <span className="chip muted">{currentUser.email}</span>
            {busyLabel ? <span className="chip muted">{busyLabel}</span> : null}
            <button type="button" className="button-secondary" onClick={() => void handleSignOut()}>
              Sign out
            </button>
          </div>
        </header>

        {error ? <section className="notice notice-error">{error}</section> : null}

        {!participantView && !facilitatorView && participantWorkspace ? (
          <ParticipantHomePanel
            currentUser={currentUser}
            launches={launches}
            participantAssignments={participantAssignments}
            onOpenParticipantRun={(runId) => void openParticipantRun(runId)}
          />
        ) : null}

        {participantView && activeParticipantRun ? (
          <ParticipantExercisePanel
            run={activeParticipantRun}
            form={participantResponseForm}
            readOnly={!canWriteParticipantRun(currentUser, activeParticipantRun)}
            onFormChange={setParticipantResponseForm}
            onBack={closeParticipantRun}
            onSaveProgress={() => void handleParticipantResponseSave(false)}
            onSubmitResponse={() => void handleParticipantResponseSave(true)}
          />
        ) : null}

        {facilitatorView && activeLaunchDetail ? (
          <FacilitatorTabletopPanel
            launch={activeLaunchDetail}
            notes={facilitatorNotesForm}
            onNotesChange={setFacilitatorNotesForm}
            onBack={closeFacilitatorConsole}
            onSaveNotes={() =>
              void handleLaunchPatch(
                activeLaunchDetail.id,
                { facilitatorNotes: facilitatorNotesForm },
                'Saving facilitator notes',
              )
            }
            onSetPhase={(tabletopPhase) =>
              void handleLaunchPatch(activeLaunchDetail.id, { tabletopPhase }, 'Updating tabletop phase')
            }
            onSetStatus={(status) => void handleLaunchPatch(activeLaunchDetail.id, { status }, 'Updating launch status')}
            onOpenParticipantRun={(runId) => void openParticipantRun(runId)}
          />
        ) : null}

        {!participantWorkspace && !participantView && !facilitatorView && activeNav === 'home' ? (
          <OverviewPanel
            overview={overview}
            auditEvents={auditEvents}
            onCreateExercise={() => {
              setActiveNav('launches');
              setActiveExercisesView('studio');
              setActiveStudioStep('templates');
            }}
            onReviewEvidence={() => setActiveNav('reports')}
            onLaunchTabletop={() => {
              const tabletopDraft =
                approvedDrafts.find((draft) => draft.launchMode === 'tabletop') ?? approvedDrafts[0] ?? null;
              if (tabletopDraft) {
                setLaunchForm({
                  scenarioDraftId: tabletopDraft.id,
                  startsAt: tabletopDraft.scheduledStartAt,
                  participantsLabel: tabletopDraft.participantsLabel,
                });
              }
              setActiveNav('launches');
              setActiveExercisesView('launch-queue');
            }}
            onOpenMaterials={() => {
              setActiveNav('source-library');
              setActiveMaterialsView('library');
            }}
            onOpenExercises={() => {
              setActiveNav('launches');
              setActiveExercisesView('pipeline');
            }}
            onOpenEvidence={() => setActiveNav('reports')}
          />
        ) : null}

        {!participantWorkspace && !participantView && !facilitatorView && activeNav === 'source-library' ? (
          <MaterialsHubPanel
            activeView={activeMaterialsView}
            onViewChange={setActiveMaterialsView}
            documents={documents}
            selectedDocumentId={selectedSourceDocumentId}
            onSelectDocument={(documentId) => void handleSelectSourceDocument(documentId)}
            activeDocument={activeSourceDocument}
            uploadForm={sourceUploadForm}
            onUploadFormChange={setSourceUploadForm}
            onUploadSubmit={handleSourceUpload}
            uploadResetKey={uploadResetKey}
            onDocumentStatusChange={handleDocumentStatusChange}
            onDocumentExtraction={(documentId) => void handleDocumentExtraction(documentId)}
            onQueueDocumentExtraction={(documentId) => void handleQueueDocumentExtraction(documentId)}
            onSuggestionDismiss={(suggestionId) => void handleSuggestionStatusChange(suggestionId, 'dismissed')}
            onSuggestionApply={(suggestionId) => void handleSuggestionApply(suggestionId)}
            contextBuckets={contextBuckets}
            contextForm={contextForm}
            onContextFormChange={setContextForm}
            onCreateContextItem={handleCreateContextItem}
            onContextItemPatch={handleContextItemPatch}
          />
        ) : null}

        {!participantWorkspace && !participantView && !facilitatorView && activeNav === 'roster' ? (
          <PeopleHubPanel
            currentUser={currentUser}
            activeView={activePeopleView}
            onViewChange={setActivePeopleView}
            rosterMembers={rosterMembers}
            selectedRosterMemberId={selectedRosterMemberId}
            form={rosterForm}
            onFormChange={setRosterForm}
            onSelectMember={loadRosterMember}
            onSubmit={handleSaveRosterMember}
            onReset={resetRosterForm}
            availableUsers={availableUsers}
            selectedWorkspaceUserId={selectedWorkspaceUserId}
            workspaceUserForm={workspaceUserForm}
            onWorkspaceUserFormChange={setWorkspaceUserForm}
            onSelectWorkspaceUser={loadWorkspaceUser}
            onSaveWorkspaceUser={handleSaveWorkspaceUser}
            onResetWorkspaceUser={resetWorkspaceUserForm}
            onSetWorkspaceUserStatus={handleSetWorkspaceUserStatus}
            workspaceInvites={workspaceInvites}
            auditEvents={auditEvents}
            latestInviteMagicLink={latestInviteMagicLink}
            workspaceInviteForm={workspaceInviteForm}
            onWorkspaceInviteFormChange={setWorkspaceInviteForm}
            onCreateWorkspaceInvite={handleCreateWorkspaceInvite}
            onRevokeWorkspaceInvite={handleRevokeWorkspaceInvite}
            onReopenWorkspaceInvite={handleReopenWorkspaceInvite}
            onSendWorkspaceInviteMagicLink={handleSendWorkspaceInviteMagicLink}
          />
        ) : null}

        {!participantWorkspace && !participantView && !facilitatorView && activeNav === 'launches' ? (
          <ExercisesHubPanel
            activeView={activeExercisesView}
            onViewChange={setActiveExercisesView}
            studioStep={activeStudioStep}
            onStudioStepChange={setActiveStudioStep}
            templates={templates}
            selectedTemplate={selectedTemplate}
            onSelectTemplate={setSelectedTemplate}
            selectedScenarioTemplate={selectedScenarioTemplate}
            scenarioDrafts={scenarioDrafts}
            activeDraftId={activeDraftId}
            draftForm={draftForm}
            draftReviewNotes={draftReviewNotes}
            onDraftFormChange={setDraftForm}
            onDraftReviewNotesChange={setDraftReviewNotes}
            onSaveDraft={handleDraftSave}
            onLoadDraft={loadSavedDraft}
            onStartNewDraft={() => {
              setActiveExercisesView('studio');
              setActiveStudioStep('templates');
              setActiveDraftId(null);
              setDraftForm(makeDefaultDraftInput(selectedScenarioTemplate));
              setDraftReviewNotes('');
            }}
            onOpenMaterialsLibrary={() => {
              setActiveNav('source-library');
              setActiveMaterialsView('library');
            }}
            onOpenMaterialsContext={() => {
              setActiveNav('source-library');
              setActiveMaterialsView('context');
            }}
            launches={launches}
            approvedDrafts={approvedDrafts}
            rosterMembers={rosterMembers}
            participantAssignments={participantAssignments}
            currentUser={currentUser}
            launchForm={launchForm}
            onLaunchFormChange={setLaunchForm}
            onLaunchDraftChange={handleLaunchDraftSelection}
            onCreateLaunch={handleCreateLaunch}
            selectedLaunchId={selectedLaunchId}
            onSelectLaunch={(launchId) => void handleSelectLaunch(launchId)}
            activeLaunchDetail={activeLaunchDetail}
            participantAssignmentForm={participantAssignmentForm}
            onParticipantAssignmentFormChange={setParticipantAssignmentForm}
            participantTeamAssignmentForm={participantTeamAssignmentForm}
            onParticipantTeamAssignmentFormChange={setParticipantTeamAssignmentForm}
            onCreateParticipantRun={handleCreateParticipantRun}
            onAssignTeamToLaunch={handleAssignTeamToLaunch}
            onOpenParticipantRun={(runId) => void openParticipantRun(runId)}
            onOpenFacilitatorConsole={openFacilitatorConsole}
          />
        ) : null}

        {!participantWorkspace && !participantView && !facilitatorView && activeNav === 'reports' ? (
          <EvidencePanel
            currentUser={currentUser}
            reports={reports}
            selectedReportId={selectedReportId}
            onSelectReport={(launchId) => void handleSelectReport(launchId)}
            activeReportDetail={activeReportDetail}
            exportBusy={Boolean(busyLabel)}
            onExportReport={(launchId, format) => void handleExportReport(launchId, format)}
            reportCloseoutForm={reportCloseoutForm}
            onReportCloseoutFormChange={setReportCloseoutForm}
            onUpdateReportCloseout={(launchId, markClosed) => void handleUpdateReportCloseout(launchId, markClosed)}
          />
        ) : null}

        {!participantWorkspace && !participantView && !facilitatorView && activeNav === 'settings' ? <SettingsPanel /> : null}
      </main>
    </div>
  );
}

const tabletopStatusOptions: Array<LaunchDetail['status']> = ['scheduled', 'in_progress', 'completed'];
const tabletopPhaseOptions: TabletopPhase[] = ['briefing', 'injects', 'decision_review', 'after_action'];

type TabletopRunbookStep = {
  id: TabletopPhase;
  title: string;
  description: string;
  prompts: string[];
};

type ParticipantCheckpoint = {
  id: string;
  label: string;
  note: string;
  complete: boolean;
};

function buildTabletopRunbook(launch: LaunchDetail): TabletopRunbookStep[] {
  return [
    {
      id: 'briefing',
      title: 'Brief the room',
      description: 'Set the incident baseline, objectives, and rules for the exercise before decisions start.',
      prompts: [
        `State the scenario brief in plain language: ${launch.scenarioBrief}`,
        `Confirm the tabletop objective: ${launch.learningObjectives}`,
      ],
    },
    {
      id: 'injects',
      title: 'Press the decision points',
      description: 'Move from the initial event into injects that force ownership, escalation, and workaround decisions.',
      prompts: [
        'Ask which executive owns the first external communication.',
        'Push on whether the current workaround is approved and scalable.',
      ],
    },
    {
      id: 'decision_review',
      title: 'Review decisions and dependencies',
      description: 'Capture what the room chose, what assumptions were made, and which policy paths were unclear.',
      prompts: [
        'What decision was made first, and was it policy-backed?',
        'Which vendor, team, or escalation owner remained ambiguous?',
      ],
    },
    {
      id: 'after_action',
      title: 'Close with follow-up actions',
      description: 'Summarize what changed, what failed, and which ownership gaps should move into after-action tracking.',
      prompts: [
        'Name the top two policy or communications gaps exposed by the exercise.',
        'Assign a concrete follow-up owner for each gap before closing.',
      ],
    },
  ];
}

function buildParticipantCheckpoints(form: ParticipantResponseForm): ParticipantCheckpoint[] {
  return [
    {
      id: 'first-action',
      label: 'First action identified',
      note: 'State the first required action under the governing procedure.',
      complete: Boolean(form.firstAction.trim()),
    },
    {
      id: 'escalation-owner',
      label: 'Escalation owner named',
      note: 'Identify the controlling role or escalation owner.',
      complete: Boolean(form.escalationChoice.trim()),
    },
    {
      id: 'impact-assessment',
      label: 'Immediate impact assessed',
      note: 'Describe the first operational or customer impact.',
      complete: Boolean(form.impactAssessment.trim()),
    },
    {
      id: 'policy-reference',
      label: 'Policy path acknowledged',
      note: 'Confirm the response was grounded in the controlling policy or playbook.',
      complete: form.policyAcknowledged,
    },
  ];
}

function SignInPanel({
  error,
  busyLabel,
  email,
  previewAccounts,
  onEmailChange,
  onSubmit,
  onUsePreviewAccount,
}: {
  error: string | null;
  busyLabel: string | null;
  email: string;
  previewAccounts: PreviewAuthAccount[];
  onEmailChange: (email: string) => void;
  onSubmit: () => void;
  onUsePreviewAccount: (email: string) => void;
}) {
  return (
    <div className="auth-shell">
      <section className="auth-panel auth-panel-primary">
        <div className="eyebrow">Altira Resilience</div>
        <h1>Private Preview</h1>
        <p>Rehearse the incidents your policies assume you can handle.</p>
        <p className="subtle">Invited workspace users can sign in to run exercises, review evidence, and manage the readiness program.</p>

        {error ? <div className="notice notice-error">{error}</div> : null}

        <div className="panel-form auth-form">
          <label>
            Workspace email
            <input
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="name@company.com"
              autoComplete="email"
            />
          </label>
          <button
            type="button"
            className="button-primary"
            onClick={onSubmit}
            disabled={!email.trim() || Boolean(busyLabel)}
          >
            {busyLabel ?? 'Sign in'}
          </button>
        </div>
      </section>

      <section className="auth-panel">
        <h3>What you can do here</h3>
        <ul className="muted-list">
          <li>Review firm materials and confirm the internal context that should shape exercises.</li>
          <li>Launch structured exercises for teams or leadership without losing operational control.</li>
          <li>Review evidence, after-actions, and follow-up actions in one place.</li>
        </ul>

        {previewAccounts.length ? (
          <>
            <div className="panel-spacer" />
            <h4>Local review access</h4>
            <p className="subtle">These demo accounts are available only in local development.</p>
            <div className="auth-account-list">
              {previewAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  className="auth-account-card"
                  onClick={() => onUsePreviewAccount(account.email)}
                  disabled={Boolean(busyLabel)}
                >
                  <strong>{account.fullName}</strong>
                  <span>{account.email}</span>
                  <span className="table-note">{formatWorkspaceRoleLabel(account.role)}</span>
                </button>
              ))}
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}

function SummaryStrip({ cards }: { cards: AdminSummaryCard[] }) {
  return (
    <section className="summary-grid">
      {cards.map((card) => (
        <article key={card.id} className={`summary-card summary-${card.tone}`}>
          <div className="summary-label">{card.label}</div>
          <div className="summary-value">{card.value}</div>
          <p className="summary-note">{card.note}</p>
        </article>
      ))}
    </section>
  );
}

function SectionTabs({
  tabs,
  activeId,
  onChange,
}: {
  tabs: Array<{ id: string; label: string }>;
  activeId: string;
  onChange: (id: string) => void;
}) {
  return (
    <section className="section-tabs" aria-label="Section tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={tab.id === activeId ? 'section-tab active' : 'section-tab'}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </section>
  );
}

function OverviewPanel({
  overview,
  auditEvents,
  onCreateExercise,
  onReviewEvidence,
  onLaunchTabletop,
  onOpenMaterials,
  onOpenExercises,
  onOpenEvidence,
}: {
  overview: BootstrapPayload['overview'];
  auditEvents: AuditEvent[];
  onCreateExercise: () => void;
  onReviewEvidence: () => void;
  onLaunchTabletop: () => void;
  onOpenMaterials: () => void;
  onOpenExercises: () => void;
  onOpenEvidence: () => void;
}) {
  return (
    <section className="stack">
      <div className="overview-hero">
        <div className="overview-hero-copy">
          <div className="eyebrow">Altira Resilience</div>
          <h3>Rehearse the incidents your policies assume you can handle.</h3>
          <p>Turn firm materials into structured exercises, keep launches visible, and close the loop with evidence.</p>
        </div>
        <div className="overview-action-grid">
          <button type="button" className="button-primary" onClick={onCreateExercise}>
            Create exercise
          </button>
          <button type="button" className="button-secondary" onClick={onReviewEvidence}>
            Review evidence
          </button>
          <button type="button" className="button-secondary" onClick={onLaunchTabletop}>
            Launch tabletop
          </button>
        </div>
      </div>

      <SummaryStrip cards={overview.programHealth} />

      <div className="panel-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Needs action today</h3>
              <p>Keep blocked approvals, overdue work, and review-ready evidence in one place.</p>
            </div>
          </div>
          <div className="stack-tight">
            <div>
              <div className="subsection-label">Pending approvals</div>
              {overview.pendingApprovals.length ? (
                <div className="queue-list">
                  {overview.pendingApprovals.map((item) => (
                    <article key={item.id} className="queue-item">
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.note}</p>
                      </div>
                      <span className="badge">{item.statusLabel}</span>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state">No draft reviews, requested changes, or material reviews are waiting right now.</div>
              )}
            </div>

            <div>
              <div className="subsection-label">Overdue assignments</div>
              {overview.overdueAssignments.length ? (
                <div className="queue-list">
                  {overview.overdueAssignments.map((run) => (
                    <article key={run.id} className="queue-item">
                      <div>
                        <strong>{run.participantName}</strong>
                        <p>
                          {run.participantRole}
                          {run.participantTeam ? ` · ${run.participantTeam}` : ''}
                          {run.dueAt ? ` · due ${run.dueAt}` : ''}
                        </p>
                      </div>
                      <span className={`badge status-${run.status}`}>{run.status.replace(/_/g, ' ')}</span>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state">No participant assignments are currently overdue.</div>
              )}
            </div>
          </div>
          <div className="button-row">
            <button type="button" className="button-secondary" onClick={onOpenMaterials}>
              Review materials
            </button>
            <button type="button" className="button-secondary" onClick={onOpenExercises}>
              Open exercises
            </button>
          </div>
        </div>

        <div className="panel side-panel">
          <h3>Coverage gaps</h3>
          <p>See which teams have not been exercised recently or still lack submitted evidence.</p>
          {overview.coverageGaps.length ? (
            <div className="queue-list">
              {overview.coverageGaps.map((gap) => (
                <article key={gap.team} className="queue-item compact">
                  <div>
                    <strong>{gap.team}</strong>
                    <p>{gap.note}</p>
                  </div>
                  <div className="table-note">
                    {gap.submittedMembers}/{gap.activeMembers} submitted
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">No coverage gaps are visible yet.</div>
          )}
        </div>
      </div>

      <div className="panel-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Upcoming exercises</h3>
              <p>Treat scheduled exercises like operational work, not background training.</p>
            </div>
          </div>
          <LaunchTable launches={overview.upcomingExercises} />
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Evidence ready for review</h3>
              <p>These launches already have enough evidence for review or export.</p>
            </div>
          </div>
          {overview.evidenceReady.length ? <ReportTable reports={overview.evidenceReady} /> : <div className="empty-state">No evidence packages are ready yet.</div>}
          <div className="button-row">
            <button type="button" className="button-secondary" onClick={onOpenEvidence}>
              Open evidence
            </button>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Recent after-actions</h3>
            <p>Use recent outcomes to tighten the program, not just archive reports.</p>
          </div>
        </div>
        <ReportTable reports={overview.recentAfterActions} />
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Recent program activity</h3>
            <p>Keep access changes, launch changes, assignments, and submissions visible.</p>
          </div>
        </div>
        {auditEvents.length ? (
          <div className="queue-list">
            {auditEvents.map((event) => (
              <article key={event.id} className="queue-item">
                <div>
                  <strong>{event.summary}</strong>
                  <p>
                    {event.detail ?? 'No additional detail recorded.'}
                    {' · '}
                    {event.actorName}
                    {' · '}
                    {formatDate(event.createdAt)}
                  </p>
                </div>
                <span className={`badge status-${event.category === 'access' ? 'pending' : 'ready'}`}>{event.category}</span>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">No audit activity is visible yet.</div>
        )}
      </div>
    </section>
  );
}

function MaterialsHubPanel({
  activeView,
  onViewChange,
  documents,
  selectedDocumentId,
  onSelectDocument,
  activeDocument,
  uploadForm,
  onUploadFormChange,
  onUploadSubmit,
  uploadResetKey,
  onDocumentStatusChange,
  onDocumentExtraction,
  onQueueDocumentExtraction,
  onSuggestionDismiss,
  onSuggestionApply,
  contextBuckets,
  contextForm,
  onContextFormChange,
  onCreateContextItem,
  onContextItemPatch,
}: {
  activeView: MaterialsView;
  onViewChange: (view: MaterialsView) => void;
  documents: DocumentSummary[];
  selectedDocumentId: string | null;
  onSelectDocument: (documentId: string) => void;
  activeDocument: SourceDocumentDetail | null;
  uploadForm: SourceUploadForm;
  onUploadFormChange: Dispatch<SetStateAction<SourceUploadForm>>;
  onUploadSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  uploadResetKey: number;
  onDocumentStatusChange: (documentId: string, parseStatus: DocumentParseStatus) => Promise<void>;
  onDocumentExtraction: (documentId: string) => void;
  onQueueDocumentExtraction: (documentId: string) => void;
  onSuggestionDismiss: (suggestionId: string) => void;
  onSuggestionApply: (suggestionId: string) => void;
  contextBuckets: ContextBucket[];
  contextForm: ContextItemInput;
  onContextFormChange: Dispatch<SetStateAction<ContextItemInput>>;
  onCreateContextItem: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onContextItemPatch: (itemId: string, patch: Partial<ContextItemInput>) => Promise<void>;
}) {
  return (
    <section className="stack">
      <SectionTabs
        tabs={[
          { id: 'library', label: 'Source Library' },
          { id: 'context', label: 'Context Review' },
        ]}
        activeId={activeView}
        onChange={(value) => onViewChange(value as MaterialsView)}
      />
      {activeView === 'library' ? (
        <SourceLibraryPanel
          documents={documents}
          selectedDocumentId={selectedDocumentId}
          onSelectDocument={onSelectDocument}
          activeDocument={activeDocument}
          uploadForm={uploadForm}
          onUploadFormChange={onUploadFormChange}
          onUploadSubmit={onUploadSubmit}
          uploadResetKey={uploadResetKey}
          onDocumentStatusChange={onDocumentStatusChange}
          onDocumentExtraction={onDocumentExtraction}
          onQueueDocumentExtraction={onQueueDocumentExtraction}
          onSuggestionDismiss={onSuggestionDismiss}
          onSuggestionApply={onSuggestionApply}
        />
      ) : (
        <OrgContextPanel
          buckets={contextBuckets}
          form={contextForm}
          onFormChange={onContextFormChange}
          onSubmit={onCreateContextItem}
          onItemPatch={onContextItemPatch}
        />
      )}
    </section>
  );
}

function PeopleHubPanel({
  currentUser,
  activeView,
  onViewChange,
  rosterMembers,
  selectedRosterMemberId,
  form,
  onFormChange,
  onSelectMember,
  onSubmit,
  onReset,
  availableUsers,
  selectedWorkspaceUserId,
  workspaceUserForm,
  onWorkspaceUserFormChange,
  onSelectWorkspaceUser,
  onSaveWorkspaceUser,
  onResetWorkspaceUser,
  onSetWorkspaceUserStatus,
  workspaceInvites,
  auditEvents,
  latestInviteMagicLink,
  workspaceInviteForm,
  onWorkspaceInviteFormChange,
  onCreateWorkspaceInvite,
  onRevokeWorkspaceInvite,
  onReopenWorkspaceInvite,
  onSendWorkspaceInviteMagicLink,
}: {
  currentUser: WorkspaceUser;
  activeView: PeopleView;
  onViewChange: (view: PeopleView) => void;
  rosterMembers: RosterMember[];
  selectedRosterMemberId: string | null;
  form: RosterMemberInput;
  onFormChange: Dispatch<SetStateAction<RosterMemberInput>>;
  onSelectMember: (member: RosterMember | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onReset: () => void;
  availableUsers: WorkspaceUser[];
  selectedWorkspaceUserId: string | null;
  workspaceUserForm: WorkspaceAccessForm;
  onWorkspaceUserFormChange: Dispatch<SetStateAction<WorkspaceAccessForm>>;
  onSelectWorkspaceUser: (user: WorkspaceUser | null) => void;
  onSaveWorkspaceUser: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onResetWorkspaceUser: () => void;
  onSetWorkspaceUserStatus: (user: WorkspaceUser, status: WorkspaceUser['status']) => Promise<void>;
  workspaceInvites: WorkspaceInvite[];
  auditEvents: AuditEvent[];
  latestInviteMagicLink: WorkspaceInviteMagicLinkResult | null;
  workspaceInviteForm: WorkspaceInviteForm;
  onWorkspaceInviteFormChange: Dispatch<SetStateAction<WorkspaceInviteForm>>;
  onCreateWorkspaceInvite: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onRevokeWorkspaceInvite: (inviteId: string) => void;
  onReopenWorkspaceInvite: (inviteId: string) => Promise<void>;
  onSendWorkspaceInviteMagicLink: (inviteId: string) => Promise<void>;
}) {
  const accessVisible = currentUser.role === 'admin';
  const resolvedActiveView = accessVisible ? activeView : 'directory';

  return (
    <section className="stack">
      <SectionTabs
        tabs={
          accessVisible
            ? [
                { id: 'directory', label: 'Participant Directory' },
                { id: 'access', label: 'Workspace Access' },
              ]
            : [{ id: 'directory', label: 'Participant Directory' }]
        }
        activeId={resolvedActiveView}
        onChange={(value) => onViewChange(value as PeopleView)}
      />
      {resolvedActiveView === 'directory' ? (
        <RosterPanel
          currentUser={currentUser}
          rosterMembers={rosterMembers}
          selectedRosterMemberId={selectedRosterMemberId}
          form={form}
          onFormChange={onFormChange}
          onSelectMember={onSelectMember}
          onSubmit={onSubmit}
          onReset={onReset}
        />
      ) : (
        <WorkspaceAccessPanel
          currentUser={currentUser}
          availableUsers={availableUsers}
          rosterMembers={rosterMembers}
          selectedWorkspaceUserId={selectedWorkspaceUserId}
          workspaceUserForm={workspaceUserForm}
          onWorkspaceUserFormChange={onWorkspaceUserFormChange}
          onSelectWorkspaceUser={onSelectWorkspaceUser}
          onSaveWorkspaceUser={onSaveWorkspaceUser}
          onResetWorkspaceUser={onResetWorkspaceUser}
          onSetWorkspaceUserStatus={onSetWorkspaceUserStatus}
          workspaceInvites={workspaceInvites}
          auditEvents={auditEvents}
          latestInviteMagicLink={latestInviteMagicLink}
          workspaceInviteForm={workspaceInviteForm}
          onWorkspaceInviteFormChange={onWorkspaceInviteFormChange}
          onCreateWorkspaceInvite={onCreateWorkspaceInvite}
          onRevokeWorkspaceInvite={onRevokeWorkspaceInvite}
          onReopenWorkspaceInvite={onReopenWorkspaceInvite}
          onSendWorkspaceInviteMagicLink={onSendWorkspaceInviteMagicLink}
        />
      )}
    </section>
  );
}

function WorkspaceAccessPanel({
  currentUser,
  availableUsers,
  rosterMembers,
  selectedWorkspaceUserId,
  workspaceUserForm,
  onWorkspaceUserFormChange,
  onSelectWorkspaceUser,
  onSaveWorkspaceUser,
  onResetWorkspaceUser,
  onSetWorkspaceUserStatus,
  workspaceInvites,
  auditEvents,
  latestInviteMagicLink,
  workspaceInviteForm,
  onWorkspaceInviteFormChange,
  onCreateWorkspaceInvite,
  onRevokeWorkspaceInvite,
  onReopenWorkspaceInvite,
  onSendWorkspaceInviteMagicLink,
}: {
  currentUser: WorkspaceUser;
  availableUsers: WorkspaceUser[];
  rosterMembers: RosterMember[];
  selectedWorkspaceUserId: string | null;
  workspaceUserForm: WorkspaceAccessForm;
  onWorkspaceUserFormChange: Dispatch<SetStateAction<WorkspaceAccessForm>>;
  onSelectWorkspaceUser: (user: WorkspaceUser | null) => void;
  onSaveWorkspaceUser: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onResetWorkspaceUser: () => void;
  onSetWorkspaceUserStatus: (user: WorkspaceUser, status: WorkspaceUser['status']) => Promise<void>;
  workspaceInvites: WorkspaceInvite[];
  auditEvents: AuditEvent[];
  latestInviteMagicLink: WorkspaceInviteMagicLinkResult | null;
  workspaceInviteForm: WorkspaceInviteForm;
  onWorkspaceInviteFormChange: Dispatch<SetStateAction<WorkspaceInviteForm>>;
  onCreateWorkspaceInvite: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onRevokeWorkspaceInvite: (inviteId: string) => void;
  onReopenWorkspaceInvite: (inviteId: string) => void;
  onSendWorkspaceInviteMagicLink: (inviteId: string) => Promise<void>;
}) {
  const rosterById = new Map(rosterMembers.map((member) => [member.id, member]));
  const rosterTeams = Array.from(new Set(rosterMembers.map((member) => member.team))).sort((left, right) =>
    left.localeCompare(right),
  );
  const pendingInvites = workspaceInvites.filter((invite) => invite.status === 'pending');
  const accessAuditEvents = auditEvents.filter((event) => event.category === 'access').slice(0, 6);
  const activeUsers = availableUsers.filter((user) => user.status === 'active');
  const inactiveUsers = availableUsers.filter((user) => user.status === 'inactive');
  const revokedInvites = workspaceInvites.filter((invite) => invite.status === 'revoked');
  const activeAdmins = activeUsers.filter((user) => user.role === 'admin');

  return (
    <section className="stack">
      <section className="summary-grid">
        <article className="summary-card summary-ready">
          <div className="summary-label">Active users</div>
          <div className="summary-value">{activeUsers.length}</div>
          <p>Workspace members who can currently sign in and operate inside Resilience.</p>
        </article>
        <article className="summary-card summary-neutral">
          <div className="summary-label">Inactive users</div>
          <div className="summary-value">{inactiveUsers.length}</div>
          <p>Accounts held in the workspace without current sign-in access.</p>
        </article>
        <article className="summary-card summary-attention">
          <div className="summary-label">Pending invites</div>
          <div className="summary-value">{pendingInvites.length}</div>
          <p>Invites waiting for first sign-in before they become active workspace users.</p>
        </article>
        <article className={`summary-card ${activeAdmins.length > 1 ? 'summary-ready' : 'summary-attention'}`}>
          <div className="summary-label">Active admins</div>
          <div className="summary-value">{activeAdmins.length}</div>
          <p>Keep at least one active admin available so the workspace cannot be locked out.</p>
        </article>
      </section>

      <div className="panel-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Workspace users</h3>
              <p>The user layer governs who can administer programs, run tabletops, review evidence, or complete assigned exercises.</p>
            </div>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Capabilities</th>
                <th>Team scope</th>
                <th>Linked roster</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {availableUsers.map((user) => {
                const linkedRoster = user.rosterMemberId ? rosterById.get(user.rosterMemberId) : null;
                const selected = user.id === selectedWorkspaceUserId;
                const isCurrentUser = user.id === currentUser.id;
                return (
                  <tr
                    key={user.id}
                    className={selected ? 'table-row-selected' : undefined}
                    onClick={() => onSelectWorkspaceUser(user)}
                  >
                    <td>
                      <strong>{user.fullName}</strong>
                      <div className="table-note">{user.email}</div>
                    </td>
                    <td>{formatWorkspaceRoleLabel(user.role)}</td>
                    <td>
                      {user.capabilities.length ? user.capabilities.map(formatWorkspaceCapabilityLabel).join(', ') : 'None'}
                    </td>
                    <td>{formatWorkspaceScopeLabel(user.role, user.scopeTeams, linkedRoster?.team ?? null)}</td>
                    <td>{linkedRoster ? `${linkedRoster.fullName} · ${linkedRoster.team}` : 'No linked roster member'}</td>
                    <td>
                      <span className={`badge status-${user.status}`}>{user.status}</span>
                    </td>
                    <td>
                      {user.status === 'active' ? (
                        <button
                          type="button"
                          className="button-secondary table-button"
                          disabled={isCurrentUser}
                          onClick={(event) => {
                            event.stopPropagation();
                            void onSetWorkspaceUserStatus(user, 'inactive');
                          }}
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="button-secondary table-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void onSetWorkspaceUserStatus(user, 'active');
                          }}
                        >
                          Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="panel side-panel">
          <h3>{selectedWorkspaceUserId ? 'Edit workspace user' : 'Create workspace user'}</h3>
          <form className="panel-form" onSubmit={(event) => void onSaveWorkspaceUser(event)}>
            <label>
              Full name
              <input
                value={workspaceUserForm.fullName}
                onChange={(event) =>
                  onWorkspaceUserFormChange((current) => ({ ...current, fullName: event.target.value }))
                }
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={workspaceUserForm.email}
                onChange={(event) =>
                  onWorkspaceUserFormChange((current) => ({ ...current, email: event.target.value }))
                }
              />
            </label>
            <label>
              Role
              <select
                value={workspaceUserForm.role}
                onChange={(event) =>
                  onWorkspaceUserFormChange((current) => ({
                    ...current,
                    role: event.target.value as WorkspaceUser['role'],
                    scopeTeams: event.target.value === 'manager' ? current.scopeTeams : [],
                  }))
                }
              >
                <option value="user">User</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label>
              Linked roster
              <select
                value={workspaceUserForm.rosterMemberId ?? ''}
                onChange={(event) =>
                  onWorkspaceUserFormChange((current) => ({
                    ...current,
                    rosterMemberId: event.target.value || null,
                  }))
                }
              >
                <option value="">No linked roster member</option>
                {rosterMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.fullName} · {member.team}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select
                value={workspaceUserForm.status}
                onChange={(event) =>
                  onWorkspaceUserFormChange((current) => ({
                    ...current,
                    status: event.target.value as WorkspaceUser['status'],
                  }))
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="checkbox-inline">
              <input
                type="checkbox"
                checked={workspaceUserForm.capabilities.includes('resilience_tabletop_facilitate')}
                onChange={(event) =>
                  onWorkspaceUserFormChange((current) => ({
                    ...current,
                    capabilities: event.target.checked ? ['resilience_tabletop_facilitate'] : [],
                  }))
                }
              />
              Tabletop facilitate
            </label>
            {workspaceUserForm.role === 'manager' ? (
              <fieldset className="checkbox-group">
                <legend>Manager team scope</legend>
                {rosterTeams.length ? (
                  rosterTeams.map((team) => (
                    <label key={team} className="checkbox-inline">
                      <input
                        type="checkbox"
                        checked={workspaceUserForm.scopeTeams.includes(team)}
                        onChange={(event) =>
                          onWorkspaceUserFormChange((current) => ({
                            ...current,
                            scopeTeams: event.target.checked
                              ? [...current.scopeTeams, team].sort((left, right) => left.localeCompare(right))
                              : current.scopeTeams.filter((entry) => entry !== team),
                          }))
                        }
                      />
                      {team}
                    </label>
                  ))
                ) : (
                  <div className="table-note">No roster teams exist yet.</div>
                )}
              </fieldset>
            ) : null}
            <div className="button-row">
              <button type="submit" className="button-primary">
                {selectedWorkspaceUserId ? 'Save user' : 'Create user'}
              </button>
              <button type="button" className="button-secondary" onClick={onResetWorkspaceUser}>
                New user
              </button>
            </div>
          </form>
          <div className="panel-spacer" />
          <h4>Current role model</h4>
          <ul className="muted-list">
            <li>Admins manage workspace settings, materials, people, exercises, launches, and evidence.</li>
            <li>Managers can review launch and evidence posture for scoped teams without getting full admin write access.</li>
            <li>Users only see the exercises assigned to their linked roster identity.</li>
            <li>Product-specific powers now sit in capabilities, not new top-level suite roles.</li>
            <li>The active admin tied to the current session cannot deactivate or demote itself.</li>
          </ul>
        </div>
      </div>

      <div className="panel-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
            <h3>Invite queue</h3>
              <p>Pending invites let admins stage access before a workspace user exists. Invited users activate access through a time-limited sign-in link.</p>
            </div>
          </div>
          {workspaceInvites.length ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Invite</th>
                  <th>Role</th>
                  <th>Delivery</th>
                  <th>Team scope</th>
                  <th>Status</th>
                  <th>Linked roster</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {workspaceInvites.map((invite) => {
                  const linkedRoster = invite.rosterMemberId ? rosterById.get(invite.rosterMemberId) : null;
                  return (
                    <tr key={invite.id}>
                      <td>
                        <strong>{invite.fullName}</strong>
                        <div className="table-note">{invite.email}</div>
                      </td>
                      <td>
                        {formatWorkspaceRoleLabel(invite.role)}
                        {invite.capabilities.length ? ` · ${invite.capabilities.map(formatWorkspaceCapabilityLabel).join(', ')}` : ''}
                      </td>
                      <td>{formatInviteMagicLinkState(invite)}</td>
                      <td>{formatWorkspaceScopeLabel(invite.role, invite.scopeTeams, linkedRoster?.team ?? null)}</td>
                      <td>
                        <span className={`badge status-${invite.status}`}>{invite.status}</span>
                      </td>
                      <td>{linkedRoster ? `${linkedRoster.fullName} · ${linkedRoster.team}` : 'No linked roster member'}</td>
                      <td>
                        {invite.status === 'pending' ? (
                          <div className="table-action-group">
                            <button
                              type="button"
                              className="button-secondary table-button"
                              onClick={() => void onSendWorkspaceInviteMagicLink(invite.id)}
                            >
                              {invite.magicLinkSentAt ? 'Resend link' : 'Send link'}
                            </button>
                            <button
                              type="button"
                              className="button-secondary table-button"
                              onClick={() => onRevokeWorkspaceInvite(invite.id)}
                            >
                              Revoke
                            </button>
                          </div>
                        ) : invite.status === 'revoked' ? (
                          <button
                            type="button"
                            className="button-secondary table-button"
                            onClick={() => onReopenWorkspaceInvite(invite.id)}
                          >
                            Reopen
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">No workspace invites exist yet.</div>
          )}
        </div>

        <div className="panel side-panel">
          <h3>Create invite</h3>
          <form className="panel-form" onSubmit={(event) => void onCreateWorkspaceInvite(event)}>
            <label>
              Full name
              <input
                value={workspaceInviteForm.fullName}
                onChange={(event) =>
                  onWorkspaceInviteFormChange((current) => ({ ...current, fullName: event.target.value }))
                }
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={workspaceInviteForm.email}
                onChange={(event) =>
                  onWorkspaceInviteFormChange((current) => ({ ...current, email: event.target.value }))
                }
              />
            </label>
            <label>
              Role
              <select
                value={workspaceInviteForm.role}
                onChange={(event) =>
                  onWorkspaceInviteFormChange((current) => ({
                    ...current,
                    role: event.target.value as WorkspaceUser['role'],
                    scopeTeams: event.target.value === 'manager' ? current.scopeTeams : [],
                  }))
                }
              >
                <option value="user">User</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label>
              Linked roster
              <select
                value={workspaceInviteForm.rosterMemberId ?? ''}
                onChange={(event) =>
                  onWorkspaceInviteFormChange((current) => ({
                    ...current,
                    rosterMemberId: event.target.value || null,
                  }))
                }
              >
                <option value="">No linked roster member</option>
                {rosterMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.fullName} · {member.team}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox-inline">
              <input
                type="checkbox"
                checked={workspaceInviteForm.capabilities.includes('resilience_tabletop_facilitate')}
                onChange={(event) =>
                  onWorkspaceInviteFormChange((current) => ({
                    ...current,
                    capabilities: event.target.checked ? ['resilience_tabletop_facilitate'] : [],
                  }))
                }
              />
              Tabletop facilitate
            </label>
            {workspaceInviteForm.role === 'manager' ? (
              <fieldset className="checkbox-group">
                <legend>Manager team scope</legend>
                {rosterTeams.length ? (
                  rosterTeams.map((team) => (
                    <label key={team} className="checkbox-inline">
                      <input
                        type="checkbox"
                        checked={workspaceInviteForm.scopeTeams.includes(team)}
                        onChange={(event) =>
                          onWorkspaceInviteFormChange((current) => ({
                            ...current,
                            scopeTeams: event.target.checked
                              ? [...current.scopeTeams, team].sort((left, right) => left.localeCompare(right))
                              : current.scopeTeams.filter((entry) => entry !== team),
                          }))
                        }
                      />
                      {team}
                    </label>
                  ))
                ) : (
                  <div className="table-note">No roster teams exist yet.</div>
                )}
              </fieldset>
            ) : null}
            <button type="submit" className="button-primary">
              Create invite
            </button>
          </form>
          <div className="panel-spacer" />
          <h4>Access rules</h4>
          <ul className="muted-list">
            <li>Admins control workspace access, launches, and final evidence closeout.</li>
            <li>Managers only see the teams assigned to their scope.</li>
            <li>Invite links keep first-time access deliberate and traceable.</li>
            <li>Reopened invites are blocked when the email already has active access in the workspace.</li>
          </ul>
          <div className="table-note">
            {pendingInvites.length} pending invite{pendingInvites.length === 1 ? '' : 's'} and {revokedInvites.length} revoked
            invite{revokedInvites.length === 1 ? '' : 's'} currently tracked.
          </div>
          {latestInviteMagicLink ? (
            <>
              <div className="panel-spacer" />
              <h4>{latestInviteMagicLink.deliveryMode === 'provider_email' ? 'Invite delivery' : 'Share invite link'}</h4>
              <div className="notice">
                <strong>{latestInviteMagicLink.deliverySummary}</strong>
                <div className="table-note">
                  Backup link: {buildMagicLinkUrl(latestInviteMagicLink.magicLinkPath)}
                  {' · '}
                  expires {formatDate(latestInviteMagicLink.expiresAt)}
                </div>
                {latestInviteMagicLink.deliveryWarning ? (
                  <div className="table-note">{latestInviteMagicLink.deliveryWarning}</div>
                ) : null}
              </div>
              <div className="button-row">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => {
                    void navigator.clipboard.writeText(buildMagicLinkUrl(latestInviteMagicLink.magicLinkPath));
                  }}
                >
                  {latestInviteMagicLink.deliveryMode === 'provider_email' ? 'Copy backup link' : 'Copy link'}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Recent access activity</h3>
            <p>Use the audit trail to confirm who changed workspace access, when the change happened, and which records were affected.</p>
          </div>
        </div>
        {accessAuditEvents.length ? (
          <div className="queue-list">
            {accessAuditEvents.map((event) => (
              <article key={event.id} className="queue-item">
                <div>
                  <strong>{event.summary}</strong>
                  <p>
                    {event.detail ?? 'No additional detail recorded.'}
                    {' · '}
                    {event.actorName}
                    {' · '}
                    {formatDate(event.createdAt)}
                  </p>
                </div>
                <span className="badge status-pending">{event.action.replace(/_/g, ' ')}</span>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">No access activity is visible yet.</div>
        )}
      </div>
    </section>
  );
}

function ExercisesHubPanel({
  activeView,
  onViewChange,
  studioStep,
  onStudioStepChange,
  templates,
  selectedTemplate,
  onSelectTemplate,
  selectedScenarioTemplate,
  scenarioDrafts,
  activeDraftId,
  draftForm,
  draftReviewNotes,
  onDraftFormChange,
  onDraftReviewNotesChange,
  onSaveDraft,
  onLoadDraft,
  onStartNewDraft,
  onOpenMaterialsLibrary,
  onOpenMaterialsContext,
  launches,
  approvedDrafts,
  rosterMembers,
  participantAssignments,
  currentUser,
  launchForm,
  onLaunchFormChange,
  onLaunchDraftChange,
  onCreateLaunch,
  selectedLaunchId,
  onSelectLaunch,
  activeLaunchDetail,
  participantAssignmentForm,
  onParticipantAssignmentFormChange,
  participantTeamAssignmentForm,
  onParticipantTeamAssignmentFormChange,
  onCreateParticipantRun,
  onAssignTeamToLaunch,
  onOpenParticipantRun,
  onOpenFacilitatorConsole,
}: {
  activeView: ExercisesView;
  onViewChange: (view: ExercisesView) => void;
  studioStep: StudioStep;
  onStudioStepChange: (value: StudioStep) => void;
  templates: ScenarioTemplate[];
  selectedTemplate: string;
  onSelectTemplate: (value: string) => void;
  selectedScenarioTemplate: ScenarioTemplate;
  scenarioDrafts: ScenarioDraft[];
  activeDraftId: string | null;
  draftForm: ScenarioDraftInput;
  draftReviewNotes: string;
  onDraftFormChange: Dispatch<SetStateAction<ScenarioDraftInput>>;
  onDraftReviewNotesChange: Dispatch<SetStateAction<string>>;
  onSaveDraft: (nextStatus?: ScenarioApprovalStatus) => Promise<void>;
  onLoadDraft: (draft: ScenarioDraft) => void;
  onStartNewDraft: () => void;
  onOpenMaterialsLibrary: () => void;
  onOpenMaterialsContext: () => void;
  launches: LaunchSummary[];
  approvedDrafts: ScenarioDraft[];
  rosterMembers: RosterMember[];
  participantAssignments: ParticipantRun[];
  currentUser: WorkspaceUser;
  launchForm: LaunchInput;
  onLaunchFormChange: Dispatch<SetStateAction<LaunchInput>>;
  onLaunchDraftChange: (draftId: string) => void;
  onCreateLaunch: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  selectedLaunchId: string | null;
  onSelectLaunch: (launchId: string) => void;
  activeLaunchDetail: LaunchDetail | null;
  participantAssignmentForm: ParticipantRunInput;
  onParticipantAssignmentFormChange: Dispatch<SetStateAction<ParticipantRunInput>>;
  participantTeamAssignmentForm: TeamAssignmentForm;
  onParticipantTeamAssignmentFormChange: Dispatch<SetStateAction<TeamAssignmentForm>>;
  onCreateParticipantRun: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onAssignTeamToLaunch: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onOpenParticipantRun: (runId: string) => void;
  onOpenFacilitatorConsole: (launchId: string) => void;
}) {
  return (
    <section className="stack">
      <SectionTabs
        tabs={[
          { id: 'pipeline', label: 'Program' },
          { id: 'studio', label: 'Scenario Studio' },
          { id: 'launch-queue', label: 'Launches' },
        ]}
        activeId={activeView}
        onChange={(value) => onViewChange(value as ExercisesView)}
      />

      {activeView === 'pipeline' ? (
        <ExercisePipelinePanel
          launches={launches}
          scenarioDrafts={scenarioDrafts}
          participantAssignments={participantAssignments}
          onOpenStudio={() => onViewChange('studio')}
          onOpenLaunchQueue={() => onViewChange('launch-queue')}
          onLoadDraft={onLoadDraft}
        />
      ) : null}

      {activeView === 'studio' ? (
        <section className="stack">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>Scenario Studio</h3>
                <p>Build a structured exercise from approved materials and confirmed internal context.</p>
              </div>
            </div>
            <div className="button-row">
              <button type="button" className="button-secondary" onClick={onOpenMaterialsLibrary}>
                Review source library
              </button>
              <button type="button" className="button-secondary" onClick={onOpenMaterialsContext}>
                Review context inputs
              </button>
            </div>
          </div>

          <section className="stepper">
            {studioSteps.map((step, index) => (
              <button
                key={step}
                type="button"
                className={step === studioStep ? 'step active' : 'step'}
                onClick={() => onStudioStepChange(step)}
              >
                <span className="step-index">0{index + 1}</span>
                <span>{stepTitles[step]}</span>
              </button>
            ))}
          </section>

          {studioStep === 'templates' ? (
            <TemplatePanel
              templates={templates}
              selectedTemplate={selectedTemplate}
              onSelect={onSelectTemplate}
              onContinue={() => {
                onStudioStepChange('configuration');
                onStartNewDraft();
              }}
            />
          ) : (
            <ConfigurationPanel
              selectedTemplate={selectedScenarioTemplate}
              scenarioDrafts={scenarioDrafts}
              activeDraftId={activeDraftId}
              form={draftForm}
              reviewNotes={draftReviewNotes}
              onFormChange={onDraftFormChange}
              onReviewNotesChange={onDraftReviewNotesChange}
              onBack={() => onStudioStepChange('templates')}
              onSaveDraft={onSaveDraft}
              onLoadDraft={onLoadDraft}
              onStartNewDraft={onStartNewDraft}
            />
          )}
        </section>
      ) : null}

      {activeView === 'launch-queue' ? (
        <LaunchesPanel
          launches={launches}
          approvedDrafts={approvedDrafts}
          rosterMembers={rosterMembers}
          currentUser={currentUser}
          launchForm={launchForm}
          onLaunchFormChange={onLaunchFormChange}
          onLaunchDraftChange={onLaunchDraftChange}
          onCreateLaunch={onCreateLaunch}
          selectedLaunchId={selectedLaunchId}
          onSelectLaunch={onSelectLaunch}
            activeLaunchDetail={activeLaunchDetail}
            participantAssignmentForm={participantAssignmentForm}
            onParticipantAssignmentFormChange={onParticipantAssignmentFormChange}
            participantTeamAssignmentForm={participantTeamAssignmentForm}
            onParticipantTeamAssignmentFormChange={onParticipantTeamAssignmentFormChange}
            onCreateParticipantRun={onCreateParticipantRun}
            onAssignTeamToLaunch={onAssignTeamToLaunch}
            onOpenParticipantRun={onOpenParticipantRun}
            onOpenFacilitatorConsole={onOpenFacilitatorConsole}
          />
      ) : null}
    </section>
  );
}

function ExercisePipelinePanel({
  launches,
  scenarioDrafts,
  participantAssignments,
  onOpenStudio,
  onOpenLaunchQueue,
  onLoadDraft,
}: {
  launches: LaunchSummary[];
  scenarioDrafts: ScenarioDraft[];
  participantAssignments: ParticipantRun[];
  onOpenStudio: () => void;
  onOpenLaunchQueue: () => void;
  onLoadDraft: (draft: ScenarioDraft) => void;
}) {
  const readyForReview = scenarioDrafts.filter((draft) => draft.approvalStatus === 'ready_for_review').length;
  const changesRequested = scenarioDrafts.filter((draft) => draft.approvalStatus === 'changes_requested').length;
  const approvedDrafts = scenarioDrafts.filter((draft) => draft.approvalStatus === 'approved').length;
  const activeExercises = launches.filter((launch) => launch.status === 'scheduled' || launch.status === 'in_progress').length;
  const overdueAssignments = participantAssignments.filter(
    (run) => run.dueAt !== null && run.status !== 'submitted' && run.dueAt < new Date().toISOString().slice(0, 10),
  ).length;

  const pipelineCards: AdminSummaryCard[] = [
    {
      id: 'exercise-pipeline-active',
      label: 'Active exercises',
      value: String(activeExercises),
      note: activeExercises > 0 ? 'Exercises are currently scheduled or in progress.' : 'No exercises are active right now.',
      tone: activeExercises > 0 ? 'ready' : 'neutral',
    },
    {
      id: 'exercise-pipeline-review',
      label: 'Ready for review',
      value: String(readyForReview),
      note: readyForReview > 0 ? 'These drafts are blocked until an operator reviews them.' : 'No drafts are waiting on review.',
      tone: readyForReview > 0 ? 'attention' : 'ready',
    },
    {
      id: 'exercise-pipeline-rework',
      label: 'Changes requested',
      value: String(changesRequested),
      note:
        changesRequested > 0
          ? 'These drafts need revision before they can move into launch planning.'
          : 'No drafts are currently waiting on author revisions.',
      tone: changesRequested > 0 ? 'attention' : 'ready',
    },
    {
      id: 'exercise-pipeline-approved',
      label: 'Approved drafts',
      value: String(approvedDrafts),
      note: approvedDrafts > 0 ? 'Approved drafts can move directly into the launch queue.' : 'No drafts are approved for launch yet.',
      tone: approvedDrafts > 0 ? 'ready' : 'neutral',
    },
    {
      id: 'exercise-pipeline-overdue',
      label: 'Overdue assignments',
      value: String(overdueAssignments),
      note: overdueAssignments > 0 ? 'Some assigned runs are now past due.' : 'No exercise assignments are overdue.',
      tone: overdueAssignments > 0 ? 'attention' : 'ready',
    },
  ];

  const prioritizedDrafts = scenarioDrafts
    .slice()
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 6);

  return (
    <section className="stack">
      <SummaryStrip cards={pipelineCards} />

      <div className="panel-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Drafts and approvals</h3>
              <p>Keep draft review, approval, and launch readiness visible in one place.</p>
            </div>
            <button type="button" className="button-primary" onClick={onOpenStudio}>
              Create exercise
            </button>
          </div>
          {prioritizedDrafts.length ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Draft</th>
                  <th>Status</th>
                  <th>Mode</th>
                  <th>Start</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {prioritizedDrafts.map((draft) => (
                  <tr key={draft.id}>
                    <td>
                      <strong>{draft.title}</strong>
                      <div className="table-note">{draft.audience}</div>
                    </td>
                    <td>
                      <span className={`badge status-${draft.approvalStatus}`}>
                        {formatScenarioApprovalStatusLabel(draft.approvalStatus)}
                      </span>
                      {draft.approvalStatus === 'changes_requested' && draft.reviewerNotes ? (
                        <div className="table-note">{draft.reviewerNotes}</div>
                      ) : null}
                    </td>
                    <td>{draft.launchMode === 'tabletop' ? 'Tabletop' : 'Individual'}</td>
                    <td>{draft.scheduledStartAt ?? 'Not scheduled'}</td>
                    <td>
                      <button type="button" className="button-secondary table-button" onClick={() => onLoadDraft(draft)}>
                        Open draft
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">No exercise drafts exist yet. Create the first exercise in Scenario Studio.</div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Live launches</h3>
              <p>Approved exercises become live operational work with assignment, completion, and evidence attached.</p>
            </div>
            <button type="button" className="button-secondary" onClick={onOpenLaunchQueue}>
              Open launches
            </button>
          </div>
          <LaunchTable launches={launches.slice(0, 6)} />
        </div>
      </div>
    </section>
  );
}

function ParticipantHomePanel({
  currentUser,
  launches,
  participantAssignments,
  onOpenParticipantRun,
}: {
  currentUser: WorkspaceUser;
  launches: LaunchSummary[];
  participantAssignments: ParticipantRun[];
  onOpenParticipantRun: (runId: string) => void;
}) {
  const launchesById = new Map(launches.map((launch) => [launch.id, launch]));

  return (
    <section className="panel-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>My assigned exercises</h3>
              <p>Focus on the exercises assigned to you, complete the required decisions, and submit a response tied to the firm&apos;s procedure.</p>
            </div>
          </div>
        {participantAssignments.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Exercise</th>
                <th>Status</th>
                <th>Due</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {participantAssignments.map((run) => {
                const launch = launchesById.get(run.launchId);
                return (
                  <tr key={run.id}>
                    <td>
                      <strong>{launch?.name ?? 'Assigned launch'}</strong>
                      <div className="table-note">
                        {run.participantRole}
                        {run.participantTeam ? ` · ${run.participantTeam}` : ''}
                      </div>
                    </td>
                    <td>
                      <span className={`badge status-${run.status}`}>{run.status.replace(/_/g, ' ')}</span>
                    </td>
                    <td>{run.dueAt ?? launch?.startsAt ?? 'Not scheduled'}</td>
                    <td>
                      <button type="button" className="button-primary table-button" onClick={() => onOpenParticipantRun(run.id)}>
                        {run.status === 'submitted' ? 'Review run' : 'Open exercise'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">No participant runs are currently assigned to {currentUser.fullName}.</div>
        )}
      </div>

      <div className="panel side-panel">
        <h3>How this works</h3>
        <ul className="muted-list">
          <li>Complete the exercises assigned to your role and team.</li>
          <li>Your submission becomes part of the evidence package reviewers use later.</li>
          <li>Required fields drive scoring; notes help improve the next run.</li>
        </ul>
      </div>
    </section>
  );
}

function SourceLibraryPanel({
  documents,
  selectedDocumentId,
  onSelectDocument,
  activeDocument,
  uploadForm,
  onUploadFormChange,
  onUploadSubmit,
  uploadResetKey,
  onDocumentStatusChange,
  onDocumentExtraction,
  onQueueDocumentExtraction,
  onSuggestionDismiss,
  onSuggestionApply,
}: {
  documents: DocumentSummary[];
  selectedDocumentId: string | null;
  onSelectDocument: (documentId: string) => void;
  activeDocument: SourceDocumentDetail | null;
  uploadForm: SourceUploadForm;
  onUploadFormChange: Dispatch<SetStateAction<SourceUploadForm>>;
  onUploadSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  uploadResetKey: number;
  onDocumentStatusChange: (documentId: string, parseStatus: DocumentParseStatus) => Promise<void>;
  onDocumentExtraction: (documentId: string) => void;
  onQueueDocumentExtraction: (documentId: string) => void;
  onSuggestionDismiss: (suggestionId: string) => void;
  onSuggestionApply: (suggestionId: string) => void;
}) {
  return (
    <section className="panel-grid">
      <div className="stack">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Firm materials</h3>
              <p>Keep continuity plans, playbooks, vendor lists, and policy files in one reviewed materials library.</p>
            </div>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Storage</th>
                <th>Extraction</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr
                  key={document.id}
                  className={`selectable-row${document.id === selectedDocumentId ? ' active' : ''}`}
                  onClick={() => onSelectDocument(document.id)}
                >
                  <td>
                    <strong>{document.name}</strong>
                    <div className="table-note">{document.owner}</div>
                  </td>
                  <td>
                    <span className={`badge status-${document.storageStatus}`}>{document.storageStatus.replace('_', ' ')}</span>
                    <div className="table-note">{document.uploadedFileName ?? 'Metadata only'}</div>
                    <div className="table-note">{document.storageBackend ? formatStorageBackendLabel(document.storageBackend) : 'No stored backend'}</div>
                  </td>
                  <td>
                    <span className={`badge status-${document.extractionStatus}`}>{document.extractionStatus.replace(/_/g, ' ')}</span>
                    <div className="table-note">
                      {document.pendingSuggestionCount} suggestion{document.pendingSuggestionCount === 1 ? '' : 's'} pending
                    </div>
                  </td>
                  <td>
                    <span className={`badge status-${document.parseStatus}`}>{document.parseStatus.replace('_', ' ')}</span>
                  </td>
                  <td>{formatDate(document.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Document review</h3>
              <p>Review extracted suggestions before they become part of the organization context used in exercise creation.</p>
            </div>
          </div>
          {activeDocument ? (
            <SourceDocumentDetailPanel
              document={activeDocument}
              onDocumentStatusChange={onDocumentStatusChange}
              onDocumentExtraction={onDocumentExtraction}
              onQueueDocumentExtraction={onQueueDocumentExtraction}
              onSuggestionDismiss={onSuggestionDismiss}
              onSuggestionApply={onSuggestionApply}
            />
          ) : (
            <div className="empty-state">Select a source document to review stored content and extraction suggestions.</div>
          )}
        </div>
      </div>

      <div className="panel side-panel">
        <h3>Upload source file</h3>
        <form className="panel-form" onSubmit={(event) => void onUploadSubmit(event)}>
          <label>
            Source name
            <input
              value={uploadForm.name}
              onChange={(event) => onUploadFormChange((current) => ({ ...current, name: event.target.value }))}
              placeholder="Continuity Plan 2026"
            />
          </label>
          <label>
            Type
            <input
              value={uploadForm.type}
              onChange={(event) => onUploadFormChange((current) => ({ ...current, type: event.target.value }))}
            />
          </label>
          <label>
            Business unit
            <input
              value={uploadForm.businessUnit}
              onChange={(event) => onUploadFormChange((current) => ({ ...current, businessUnit: event.target.value }))}
            />
          </label>
          <label>
            Owner
            <input
              value={uploadForm.owner}
              onChange={(event) => onUploadFormChange((current) => ({ ...current, owner: event.target.value }))}
              placeholder="Dana Smith"
            />
          </label>
          <label>
            Effective date
            <input
              type="date"
              value={uploadForm.effectiveDate}
              onChange={(event) => onUploadFormChange((current) => ({ ...current, effectiveDate: event.target.value }))}
            />
          </label>
          <label>
            File
            <input
              key={uploadResetKey}
              type="file"
              accept=".txt,.md,.markdown,.csv,.json,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,text/plain,text/markdown,text/csv,application/json,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/png,image/jpeg,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                onUploadFormChange((current) => ({
                  ...current,
                  name: current.name || (file ? stripFileExtension(file.name) : ''),
                  file,
                }));
              }}
            />
          </label>
          <button type="submit" className="button-primary button-block">
            Upload and process
          </button>
        </form>
        <div className="panel-spacer" />
        <h4>Upload guidance</h4>
        <ul className="muted-list">
          <li>Supports text, PDF, modern Office files, spreadsheets, presentations, and common image files.</li>
          <li>Files must stay under 5 MB in the current product pass.</li>
          <li>Some uploaded files may need background extraction before suggestions appear.</li>
          <li>Only extracted text creates suggestions, and suggestions still require operator review.</li>
        </ul>
      </div>
    </section>
  );
}

function SourceDocumentDetailPanel({
  document,
  onDocumentStatusChange,
  onDocumentExtraction,
  onQueueDocumentExtraction,
  onSuggestionDismiss,
  onSuggestionApply,
}: {
  document: SourceDocumentDetail;
  onDocumentStatusChange: (documentId: string, parseStatus: DocumentParseStatus) => Promise<void>;
  onDocumentExtraction: (documentId: string) => void;
  onQueueDocumentExtraction: (documentId: string) => void;
  onSuggestionDismiss: (suggestionId: string) => void;
  onSuggestionApply: (suggestionId: string) => void;
}) {
  const pendingSuggestions = document.extractionSuggestions.filter((suggestion) => suggestion.status === 'pending_review');
  const reviewedSuggestions = document.extractionSuggestions.filter((suggestion) => suggestion.status !== 'pending_review');
  const canRunInlineExtraction = document.storageBackend === 'r2' && document.extractionStatus === 'not_started';
  const canQueueFollowUp =
    document.storageBackend === 'r2' &&
    (document.extractionStatus === 'not_started' || document.extractionStatus === 'needs_attention');

  return (
    <div className="stack">
      <div className="stat-grid">
        <article className="stat-card">
          <span className="summary-label">File</span>
          <strong>{document.uploadedFileName ?? 'No file stored'}</strong>
        </article>
        <article className="stat-card">
          <span className="summary-label">Bytes</span>
          <strong>{document.byteSize ?? 'N/A'}</strong>
        </article>
        <article className="stat-card">
          <span className="summary-label">Storage</span>
          <strong>{document.storageBackend ? formatStorageBackendLabel(document.storageBackend) : 'No stored backend'}</strong>
        </article>
        <article className="stat-card">
          <span className="summary-label">Extraction</span>
          <strong>{document.extractionStatus.replace(/_/g, ' ')}</strong>
        </article>
        <article className="stat-card">
          <span className="summary-label">Parse status</span>
          <select
            className="table-select"
            value={document.parseStatus}
            onChange={(event) => void onDocumentStatusChange(document.id, event.target.value as DocumentParseStatus)}
          >
            <option value="uploaded">uploaded</option>
            <option value="parsed">parsed</option>
            <option value="needs_review">needs review</option>
            <option value="approved">approved</option>
          </select>
        </article>
      </div>

      <div className="detail-card">
        <span className="summary-label">Content excerpt</span>
        <p>{document.contentExcerpt ?? document.extractionNote ?? 'No stored content excerpt available.'}</p>
        {canRunInlineExtraction || canQueueFollowUp ? (
          <div className="button-row">
            {canRunInlineExtraction ? (
              <button type="button" className="button-secondary" onClick={() => onDocumentExtraction(document.id)}>
                Run extraction now
              </button>
            ) : null}
            {canQueueFollowUp ? (
              <button type="button" className="button-primary" onClick={() => onQueueDocumentExtraction(document.id)}>
                {document.extractionStatus === 'needs_attention' ? 'Queue OCR follow-up' : 'Queue follow-up'}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="detail-card">
        <span className="summary-label">Extracted text</span>
        <ExtractionProvenancePanel
          provenance={document.extractionProvenance}
          emptyMessage="No extracted-text artifact has been recorded for this document yet."
        />
        <p className="detail-footnote">
          Source file, extracted text, review suggestions, and approved context stay separate so reviewed records do not
          change silently.
        </p>
      </div>

      <ExtractionJobCard job={document.latestExtractionJob} />

      <div className="detail-card">
        <span className="summary-label">Source storage</span>
        <p>
          {document.storageBackend === 'r2'
            ? 'Original file stored for review and follow-up extraction.'
            : 'Inline text stored directly in the workspace record.'}
        </p>
      </div>

      <div className="detail-card">
        <span className="summary-label">Pending suggestions</span>
        {pendingSuggestions.length ? (
          <div className="suggestion-list">
            {pendingSuggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onDismiss={() => onSuggestionDismiss(suggestion.id)}
                onApply={() => onSuggestionApply(suggestion.id)}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            {document.extractionStatus === 'not_started'
              ? document.extractionNote ?? 'No suggestions yet because text extraction is still pending.'
              : 'No suggestions waiting for review.'}
          </div>
        )}
      </div>

      {reviewedSuggestions.length ? (
        <div className="detail-card">
          <span className="summary-label">Reviewed suggestions</span>
          <div className="suggestion-list">
            {reviewedSuggestions.map((suggestion) => (
              <SuggestionCard key={suggestion.id} suggestion={suggestion} readOnly />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ExtractionJobCard({ job }: { job: SourceExtractionJob | null }) {
  return (
    <div className="detail-card">
      <span className="summary-label">Latest extraction job</span>
      {job ? (
        <div className="stack-tight">
          <div className="meta">
            <span className={`badge status-${job.status}`}>{job.status.replace(/_/g, ' ')}</span>
            <span className="table-note">Attempts: {job.attemptCount}</span>
            <span className="table-note">Updated: {formatDate(job.updatedAt)}</span>
          </div>
          <ExtractionProvenancePanel
            provenance={job.attemptedProvenance}
            emptyMessage="No provider or method metadata was recorded for the latest extraction attempt."
          />
          {job.lastError ? <p>{job.lastError}</p> : <p>No job errors recorded.</p>}
        </div>
      ) : (
        <div className="empty-state">No background extraction job recorded for this document.</div>
      )}
    </div>
  );
}

function ExtractionProvenancePanel({
  provenance,
  emptyMessage,
}: {
  provenance: SourceExtractionProvenance | null;
  emptyMessage: string;
}) {
  if (!provenance) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  return (
    <div className="provenance-grid">
      <div className="provenance-item">
        <span className="summary-label">Method</span>
        <strong>{formatExtractionMethodLabel(provenance.method)}</strong>
      </div>
      <div className="provenance-item">
        <span className="summary-label">Provider</span>
        <strong>{formatExtractionProviderLabel(provenance.provider)}</strong>
      </div>
      <div className="provenance-item">
        <span className="summary-label">Version</span>
        <strong>{provenance.version}</strong>
      </div>
      <div className="provenance-item">
        <span className="summary-label">Captured</span>
        <strong>{formatDate(provenance.generatedAt)}</strong>
      </div>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  onDismiss,
  onApply,
  readOnly = false,
}: {
  suggestion: SourceExtractionSuggestion;
  onDismiss?: () => void;
  onApply?: () => void;
  readOnly?: boolean;
}) {
  return (
    <article className="suggestion-card">
      <div className="suggestion-header">
        <div>
          <strong>{suggestion.name}</strong>
          <div className="table-note">{formatBucketLabel(suggestion.bucketId)}</div>
        </div>
        <div className="meta">
          <span className={`badge status-${suggestion.confidence}`}>{suggestion.confidence}</span>
          <span className={`badge status-${suggestion.status}`}>{suggestion.status.replace(/_/g, ' ')}</span>
        </div>
      </div>
      <p>{suggestion.sourceSnippet}</p>
      {!readOnly ? (
        <div className="button-row">
          <button type="button" className="button-secondary" onClick={onDismiss}>
            Dismiss
          </button>
          <button type="button" className="button-primary" onClick={onApply}>
            Apply to context
          </button>
        </div>
      ) : null}
    </article>
  );
}

function OrgContextPanel({
  buckets,
  form,
  onFormChange,
  onSubmit,
  onItemPatch,
}: {
  buckets: ContextBucket[];
  form: ContextItemInput;
  onFormChange: Dispatch<SetStateAction<ContextItemInput>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onItemPatch: (itemId: string, patch: Partial<ContextItemInput>) => Promise<void>;
}) {
  return (
    <section className="panel-grid">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Context review</h3>
            <p>Confirm the teams, vendors, escalation roles, and internal language that should shape exercise behavior.</p>
          </div>
        </div>
        <div className="bucket-list">
          {buckets.map((bucket) => (
            <div key={bucket.id} className="bucket">
              <h4>{bucket.label}</h4>
              {bucket.items.map((item) => (
                <div key={item.id} className="bucket-row bucket-row-editable">
                  <span>{item.name}</span>
                  <select
                    className="table-select"
                    value={item.reviewState}
                    onChange={(event) =>
                      void onItemPatch(item.id, { reviewState: event.target.value as ContextItemInput['reviewState'] })
                    }
                  >
                    <option value="confirmed">confirmed</option>
                    <option value="needs_review">needs review</option>
                  </select>
                  <label className="checkbox-inline">
                    <input
                      type="checkbox"
                      checked={item.required}
                      onChange={(event) => void onItemPatch(item.id, { required: event.target.checked })}
                    />
                    required
                  </label>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="panel side-panel">
        <h3>Add context item</h3>
        <form className="panel-form" onSubmit={(event) => void onSubmit(event)}>
          <label>
            Bucket
            <select
              value={form.bucketId}
              onChange={(event) => onFormChange((current) => ({ ...current, bucketId: event.target.value }))}
            >
              {buckets.map((bucket) => (
                <option key={bucket.id} value={bucket.id}>
                  {bucket.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Name
            <input
              value={form.name}
              onChange={(event) => onFormChange((current) => ({ ...current, name: event.target.value }))}
              placeholder="Vendor crisis lead"
            />
          </label>
          <label>
            Review state
            <select
              value={form.reviewState}
              onChange={(event) =>
                onFormChange((current) => ({ ...current, reviewState: event.target.value as ContextItemInput['reviewState'] }))
              }
            >
              <option value="needs_review">needs review</option>
              <option value="confirmed">confirmed</option>
            </select>
          </label>
          <label className="checkbox-inline">
            <input
              type="checkbox"
              checked={form.required}
              onChange={(event) => onFormChange((current) => ({ ...current, required: event.target.checked }))}
            />
            Required input
          </label>
          <button type="submit" className="button-primary button-block">
            Save context item
          </button>
        </form>
      </div>
    </section>
  );
}

function RosterPanel({
  currentUser,
  rosterMembers,
  selectedRosterMemberId,
  form,
  onFormChange,
  onSelectMember,
  onSubmit,
  onReset,
}: {
  currentUser: WorkspaceUser;
  rosterMembers: RosterMember[];
  selectedRosterMemberId: string | null;
  form: RosterMemberInput;
  onFormChange: Dispatch<SetStateAction<RosterMemberInput>>;
  onSelectMember: (member: RosterMember | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onReset: () => void;
}) {
  const canEditRoster = currentUser.role === 'admin';

  return (
    <section className="panel-grid">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Participant directory</h3>
            <p>Assignments should resolve from a controlled roster so evidence exports use the same names, roles, teams, and reporting lines.</p>
          </div>
        </div>
        {rosterMembers.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Team</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rosterMembers.map((member) => (
                <tr
                  key={member.id}
                  className={`selectable-row${member.id === selectedRosterMemberId ? ' active' : ''}`}
                  onClick={() => onSelectMember(member)}
                >
                  <td>
                    <strong>{member.fullName}</strong>
                    <div className="table-note">{member.email}</div>
                  </td>
                  <td>{member.roleTitle}</td>
                  <td>
                    {member.team}
                    {member.managerName ? <div className="table-note">Manager: {member.managerName}</div> : null}
                  </td>
                  <td>
                    <span className={`badge status-${member.status}`}>{member.status}</span>
                  </td>
                  <td>
                    {canEditRoster ? (
                      <button type="button" className="button-secondary table-button" onClick={() => onSelectMember(member)}>
                        Edit
                      </button>
                    ) : (
                      <button type="button" className="button-secondary table-button" onClick={() => onSelectMember(member)}>
                        View
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">No roster members yet. Add the initial participant directory on the right.</div>
        )}
      </div>

      <div className="panel side-panel">
        <div className="panel-header">
          <div>
            <h3>{canEditRoster ? (selectedRosterMemberId ? 'Edit roster member' : 'Add roster member') : 'Directory detail'}</h3>
            <p>
              {canEditRoster
                ? 'Keep the directory lean and operational. This is the assignment source for launches, not a general HR system.'
                : 'Managers can review the directory for their scoped teams here, but directory edits remain an admin workflow.'}
            </p>
          </div>
          {canEditRoster && selectedRosterMemberId ? (
            <button type="button" className="button-secondary" onClick={onReset}>
              New entry
            </button>
          ) : null}
        </div>
        {canEditRoster ? (
        <form className="panel-form" onSubmit={(event) => void onSubmit(event)}>
          <label>
            Full name
            <input
              value={form.fullName}
              onChange={(event) => onFormChange((current) => ({ ...current, fullName: event.target.value }))}
              placeholder="Jordan Lee"
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => onFormChange((current) => ({ ...current, email: event.target.value }))}
              placeholder="jordan.lee@firm.com"
            />
          </label>
          <label>
            Role title
            <input
              value={form.roleTitle}
              onChange={(event) => onFormChange((current) => ({ ...current, roleTitle: event.target.value }))}
              placeholder="Compliance Officer"
            />
          </label>
          <label>
            Team
            <input
              value={form.team}
              onChange={(event) => onFormChange((current) => ({ ...current, team: event.target.value }))}
              placeholder="Compliance"
            />
          </label>
          <label>
            Manager
            <input
              value={form.managerName ?? ''}
              onChange={(event) =>
                onFormChange((current) => ({
                  ...current,
                  managerName: event.target.value ? event.target.value : null,
                }))
              }
              placeholder="Morgan Avery"
            />
          </label>
          <label>
            Status
            <select
              value={form.status}
              onChange={(event) =>
                onFormChange((current) => ({
                  ...current,
                  status: event.target.value as RosterMemberInput['status'],
                }))
              }
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </label>
          <button type="submit" className="button-primary button-block">
            {selectedRosterMemberId ? 'Save roster member' : 'Add roster member'}
          </button>
        </form>
        ) : selectedRosterMemberId ? (
          <div className="detail-card compact-detail-card">
            <span className="summary-label">{form.fullName}</span>
            <p>
              {form.roleTitle}
              {form.team ? ` · ${form.team}` : ''}
              {form.managerName ? ` · Manager: ${form.managerName}` : ''}
              {form.email ? ` · ${form.email}` : ''}
            </p>
          </div>
        ) : (
          <div className="empty-state">Select a scoped roster member to review their role, team, and manager information.</div>
        )}
      </div>
    </section>
  );
}

function TemplatePanel({
  templates,
  selectedTemplate,
  onSelect,
  onContinue,
}: {
  templates: ScenarioTemplate[];
  selectedTemplate: string;
  onSelect: (value: string) => void;
  onContinue: () => void;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h3>Choose a template</h3>
          <p>Start from a controlled template so the exercise stays realistic, structured, and aligned to the program.</p>
        </div>
        <button type="button" className="button-primary" onClick={onContinue}>
          Start draft from template
        </button>
      </div>
      <div className="template-grid">
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            className={template.id === selectedTemplate ? 'template-card active' : 'template-card'}
            onClick={() => onSelect(template.id)}
          >
            <h4>{template.name}</h4>
            <p>{template.description}</p>
            <div className="template-meta">
              <span>{template.primaryAudience}</span>
              <span>{template.recommendedInputs.join(' • ')}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function ConfigurationPanel({
  selectedTemplate,
  scenarioDrafts,
  activeDraftId,
  form,
  reviewNotes,
  onFormChange,
  onReviewNotesChange,
  onBack,
  onSaveDraft,
  onLoadDraft,
  onStartNewDraft,
}: {
  selectedTemplate: ScenarioTemplate;
  scenarioDrafts: ScenarioDraft[];
  activeDraftId: string | null;
  form: ScenarioDraftInput;
  reviewNotes: string;
  onFormChange: Dispatch<SetStateAction<ScenarioDraftInput>>;
  onReviewNotesChange: Dispatch<SetStateAction<string>>;
  onBack: () => void;
  onSaveDraft: (nextStatus?: ScenarioApprovalStatus) => Promise<void>;
  onLoadDraft: (draft: ScenarioDraft) => void;
  onStartNewDraft: () => void;
}) {
  const activeDraft = activeDraftId ? scenarioDrafts.find((draft) => draft.id === activeDraftId) ?? null : null;

  return (
    <section className="panel-grid">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Scenario configuration</h3>
            <p>{activeDraftId ? 'Refine a saved exercise draft before review or launch.' : 'Build a new exercise draft from the selected template.'}</p>
          </div>
          <button type="button" className="button-secondary" onClick={onBack}>
            Back to templates
          </button>
        </div>
        <div className="form-grid">
          <label>
            Scenario title
            <input
              value={form.title}
              onChange={(event) => onFormChange((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
          <label>
            Audience
            <input
              value={form.audience}
              onChange={(event) => onFormChange((current) => ({ ...current, audience: event.target.value }))}
            />
          </label>
          <label>
            Launch mode
            <select
              value={form.launchMode}
              onChange={(event) => onFormChange((current) => ({ ...current, launchMode: event.target.value as LaunchMode }))}
            >
              <option value="individual">Assigned individual exercise</option>
              <option value="tabletop">Facilitator-led tabletop</option>
            </select>
          </label>
          <label>
            Difficulty
            <select
              value={form.difficulty}
              onChange={(event) =>
                onFormChange((current) => ({ ...current, difficulty: event.target.value as ScenarioDifficulty }))
              }
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label>
            Scheduled start
            <input
              type="date"
              value={form.scheduledStartAt ?? ''}
              onChange={(event) =>
                onFormChange((current) => ({
                  ...current,
                  scheduledStartAt: event.target.value ? event.target.value : null,
                }))
              }
            />
          </label>
          <label>
            Participants label
            <input
              value={form.participantsLabel ?? ''}
              onChange={(event) =>
                onFormChange((current) => ({
                  ...current,
                  participantsLabel: event.target.value ? event.target.value : null,
                }))
              }
              placeholder="48 assignees"
            />
          </label>
          <label className="full-width">
            Learning objectives
            <textarea
              value={form.learningObjectives}
              onChange={(event) =>
                onFormChange((current) => ({ ...current, learningObjectives: event.target.value }))
              }
            />
          </label>
          <label className="full-width">
            Reviewer notes
            <textarea
              value={reviewNotes}
              onChange={(event) => onReviewNotesChange(event.target.value)}
              placeholder="Use this for approval notes or clear change requests."
            />
          </label>
        </div>
        <div className="button-row">
          <button type="button" className="button-secondary" onClick={() => void onSaveDraft('draft')}>
            Save draft
          </button>
          <button type="button" className="button-secondary" onClick={() => void onSaveDraft('ready_for_review')}>
            Submit for review
          </button>
          <button
            type="button"
            className="button-secondary"
            onClick={() => void onSaveDraft('changes_requested')}
            disabled={!activeDraftId}
          >
            Request changes
          </button>
          <button type="button" className="button-primary" onClick={() => void onSaveDraft('approved')}>
            Approve draft
          </button>
        </div>
      </div>

      <div className="panel side-panel">
        <h3>Selected template</h3>
        <p>{selectedTemplate.name}</p>
        <ul className="muted-list">
          {selectedTemplate.recommendedInputs.map((input) => (
            <li key={input}>{input}</li>
          ))}
        </ul>
        <div className="detail-card compact-detail-card draft-review-card">
          <div className="subsection-label">Review posture</div>
          <div className="draft-review-status">
            <span className={`badge status-${activeDraft?.approvalStatus ?? form.approvalStatus}`}>
              {formatScenarioApprovalStatusLabel(activeDraft?.approvalStatus ?? form.approvalStatus)}
            </span>
          </div>
          <p>
            {activeDraft?.reviewedByName && activeDraft?.reviewedAt
              ? `Last review by ${activeDraft.reviewedByName} on ${formatDate(activeDraft.reviewedAt)}.`
              : activeDraftId
                ? 'This draft has not been formally reviewed yet.'
                : 'New drafts can be saved, submitted for review, or approved from here.'}
          </p>
          {activeDraft?.reviewerNotes ? <p className="draft-review-note">{activeDraft.reviewerNotes}</p> : null}
        </div>
        <h4>Saved drafts</h4>
        <div className="draft-list">
          {scenarioDrafts.length ? (
            scenarioDrafts.map((draft) => (
              <button
                key={draft.id}
                type="button"
                className={draft.id === activeDraftId ? 'draft-item active' : 'draft-item'}
                onClick={() => onLoadDraft(draft)}
              >
                <strong>{draft.title}</strong>
                <span>{formatScenarioApprovalStatusLabel(draft.approvalStatus)}</span>
                {draft.approvalStatus === 'changes_requested' && draft.reviewerNotes ? (
                  <span className="draft-item-note">{draft.reviewerNotes}</span>
                ) : null}
              </button>
            ))
          ) : (
            <div className="empty-state">No drafts saved yet.</div>
          )}
        </div>
        <button type="button" className="button-primary button-block" onClick={onStartNewDraft}>
          Start new draft
        </button>
      </div>
    </section>
  );
}

function LaunchesPanel({
  launches,
  approvedDrafts,
  rosterMembers,
  currentUser,
  launchForm,
  onLaunchFormChange,
  onLaunchDraftChange,
  onCreateLaunch,
  selectedLaunchId,
  onSelectLaunch,
  activeLaunchDetail,
  participantAssignmentForm,
  onParticipantAssignmentFormChange,
  participantTeamAssignmentForm,
  onParticipantTeamAssignmentFormChange,
  onCreateParticipantRun,
  onAssignTeamToLaunch,
  onOpenParticipantRun,
  onOpenFacilitatorConsole,
}: {
  launches: LaunchSummary[];
  approvedDrafts: ScenarioDraft[];
  rosterMembers: RosterMember[];
  currentUser: WorkspaceUser;
  launchForm: LaunchInput;
  onLaunchFormChange: Dispatch<SetStateAction<LaunchInput>>;
  onLaunchDraftChange: (draftId: string) => void;
  onCreateLaunch: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  selectedLaunchId: string | null;
  onSelectLaunch: (launchId: string) => void;
  activeLaunchDetail: LaunchDetail | null;
  participantAssignmentForm: ParticipantRunInput;
  onParticipantAssignmentFormChange: Dispatch<SetStateAction<ParticipantRunInput>>;
  participantTeamAssignmentForm: TeamAssignmentForm;
  onParticipantTeamAssignmentFormChange: Dispatch<SetStateAction<TeamAssignmentForm>>;
  onCreateParticipantRun: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onAssignTeamToLaunch: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onOpenParticipantRun: (runId: string) => void;
  onOpenFacilitatorConsole: (launchId: string) => void;
}) {
  return (
    <section className="panel-grid">
      <div className="stack">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Launch queue</h3>
              <p>Approved drafts become live exercises with assignment, completion, and evidence attached.</p>
            </div>
          </div>
          <LaunchTable launches={launches} activeId={selectedLaunchId} onSelect={onSelectLaunch} />
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Launch detail</h3>
              <p>Review the scenario brief, assign the right people, and manage the live exercise from one launch record.</p>
            </div>
          </div>
          {activeLaunchDetail ? (
            <LaunchDetailPanel
              launch={activeLaunchDetail}
              rosterMembers={rosterMembers}
              currentUser={currentUser}
              participantAssignmentForm={participantAssignmentForm}
              onParticipantAssignmentFormChange={onParticipantAssignmentFormChange}
              participantTeamAssignmentForm={participantTeamAssignmentForm}
              onParticipantTeamAssignmentFormChange={onParticipantTeamAssignmentFormChange}
              onCreateParticipantRun={onCreateParticipantRun}
              onAssignTeamToLaunch={onAssignTeamToLaunch}
              onOpenParticipantRun={onOpenParticipantRun}
              onOpenFacilitatorConsole={onOpenFacilitatorConsole}
            />
          ) : (
            <div className="empty-state">Select a launch to review its scenario brief and participant roster.</div>
          )}
        </div>
      </div>

        <div className="panel side-panel">
        <h3>Create launch</h3>
        {currentUser.role !== 'admin' ? (
          <div className="empty-state">Only admins can create launches from approved drafts.</div>
        ) : approvedDrafts.length ? (
          <form className="panel-form" onSubmit={(event) => void onCreateLaunch(event)}>
            <label>
              Approved draft
              <select
                value={launchForm.scenarioDraftId}
                onChange={(event) => onLaunchDraftChange(event.target.value)}
              >
                {approvedDrafts.map((draft) => (
                  <option key={draft.id} value={draft.id}>
                    {draft.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Launch date
              <input
                type="date"
                value={launchForm.startsAt ?? ''}
                onChange={(event) =>
                  onLaunchFormChange((current) => ({
                    ...current,
                    startsAt: event.target.value ? event.target.value : null,
                  }))
                }
              />
            </label>
            <label>
              Participants label
              <input
                value={launchForm.participantsLabel ?? ''}
                onChange={(event) =>
                  onLaunchFormChange((current) => ({
                    ...current,
                    participantsLabel: event.target.value ? event.target.value : null,
                  }))
                }
                placeholder="48 assignees"
              />
            </label>
            <button type="submit" className="button-primary button-block">
              Create launch
            </button>
          </form>
        ) : (
          <div className="empty-state">Approve a scenario draft first. Only approved drafts can become launches.</div>
        )}
        <div className="panel-spacer" />
        <h4>What gets locked at launch</h4>
        <ul className="muted-list">
          <li>Scenario brief and learning objectives are copied from the approved draft.</li>
          <li>Participant runs attach to the launch, not to the scenario template.</li>
          <li>Evidence is generated from the launch roster, participant submissions, and facilitator notes.</li>
        </ul>
      </div>
    </section>
  );
}

function LaunchDetailPanel({
  launch,
  rosterMembers,
  currentUser,
  participantAssignmentForm,
  onParticipantAssignmentFormChange,
  participantTeamAssignmentForm,
  onParticipantTeamAssignmentFormChange,
  onCreateParticipantRun,
  onAssignTeamToLaunch,
  onOpenParticipantRun,
  onOpenFacilitatorConsole,
}: {
  launch: LaunchDetail;
  rosterMembers: RosterMember[];
  currentUser: WorkspaceUser;
  participantAssignmentForm: ParticipantRunInput;
  onParticipantAssignmentFormChange: Dispatch<SetStateAction<ParticipantRunInput>>;
  participantTeamAssignmentForm: TeamAssignmentForm;
  onParticipantTeamAssignmentFormChange: Dispatch<SetStateAction<TeamAssignmentForm>>;
  onCreateParticipantRun: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onAssignTeamToLaunch: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onOpenParticipantRun: (runId: string) => void;
  onOpenFacilitatorConsole: (launchId: string) => void;
}) {
  const selectedRosterMember =
    rosterMembers.find((member) => member.id === participantAssignmentForm.rosterMemberId) ?? null;
  const assignableTeams = Array.from(
    new Set(rosterMembers.filter((member) => member.status === 'active').map((member) => member.team)),
  ).sort((left, right) => left.localeCompare(right));
  const canManageAssignments = currentUser.role === 'admin' || currentUser.role === 'manager';
  const canUseFacilitatorConsole =
    currentUser.role === 'admin' || hasWorkspaceCapability(currentUser, 'resilience_tabletop_facilitate');

  return (
    <div className="stack">
      <div className="stat-grid">
        <article className="stat-card">
          <span className="summary-label">Launch status</span>
          <strong>{launch.status.replace(/_/g, ' ')}</strong>
        </article>
        <article className="stat-card">
          <span className="summary-label">Launch date</span>
          <strong>{launch.startsAt ?? 'Not scheduled'}</strong>
        </article>
        <article className="stat-card">
          <span className="summary-label">Draft approval</span>
          <strong>{launch.draftApprovalStatus.replace(/_/g, ' ')}</strong>
        </article>
        <article className="stat-card">
          <span className="summary-label">Participants</span>
          <strong>{launch.participantRuns.length}</strong>
        </article>
        {launch.mode === 'tabletop' ? (
          <article className="stat-card">
            <span className="summary-label">Tabletop phase</span>
            <strong>{formatTabletopPhaseLabel(launch.tabletopPhase)}</strong>
          </article>
        ) : null}
      </div>

      <div className="detail-grid">
        <div className="detail-card">
          <span className="summary-label">Scenario brief</span>
          <p>{launch.scenarioBrief}</p>
        </div>
        <div className="detail-card">
          <span className="summary-label">Learning objectives</span>
          <p>{launch.learningObjectives}</p>
        </div>
        {launch.mode === 'tabletop' ? (
          <div className="detail-card">
            <span className="summary-label">Facilitator console</span>
            <p>
              Use the tabletop console to manage phase, session status, live prompts, and facilitator notes without
              leaving the launch.
            </p>
            {canUseFacilitatorConsole ? (
              <div className="button-row">
                <button type="button" className="button-primary" onClick={() => onOpenFacilitatorConsole(launch.id)}>
                  Open facilitator console
                </button>
              </div>
            ) : (
              <div className="empty-state">Your current role can review the launch, but not control the tabletop session.</div>
            )}
          </div>
        ) : null}
      </div>

      <div className="panel-grid compact-grid">
        <div className="panel inset-panel">
          <div className="panel-header">
            <div>
              <h4>{launch.mode === 'tabletop' ? 'Leadership roster' : 'Participant roster'}</h4>
              <p>
                {launch.mode === 'tabletop'
                  ? 'Tabletop seats stay attached to the launch so facilitator review and later evidence packages use the same roster.'
                  : 'Each participant run opens the assigned exercise workspace and produces its own evidence record.'}
              </p>
            </div>
          </div>
          {launch.participantRuns.length ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Participant</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Last activity</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {launch.participantRuns.map((run) => (
                  <tr key={run.id}>
                    <td>
                      <strong>{run.participantName}</strong>
                      <div className="table-note">
                        {run.participantRole}
                        {run.participantTeam ? ` · ${run.participantTeam}` : ''}
                        {run.participantEmail ? ` · ${run.participantEmail}` : ''}
                      </div>
                    </td>
                    <td>
                      <span className={`badge status-${run.status}`}>{run.status.replace(/_/g, ' ')}</span>
                    </td>
                    <td>{run.scorePercent !== null ? `${run.scorePercent}%` : 'Not started'}</td>
                    <td>{formatDate(run.updatedAt)}</td>
                    <td>
                      <button type="button" className="button-secondary table-button" onClick={() => onOpenParticipantRun(run.id)}>
                        {launch.mode === 'tabletop' ? 'View seat record' : 'Open run'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">No participants assigned yet.</div>
          )}
        </div>

        <div className="panel inset-panel">
          <h4>{launch.mode === 'tabletop' ? 'Assignment controls' : 'Assignment controls'}</h4>
          {canManageAssignments ? (
            <div className="stack">
              <form className="panel-form" onSubmit={(event) => void onAssignTeamToLaunch(event)}>
                <label>
                  Assign whole team
                  <select
                    value={participantTeamAssignmentForm.team}
                    onChange={(event) =>
                      onParticipantTeamAssignmentFormChange((current) => ({
                        ...current,
                        launchId: launch.id,
                        team: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select a team</option>
                    {assignableTeams.map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Due date
                  <input
                    type="date"
                    value={participantTeamAssignmentForm.dueAt ?? ''}
                    onChange={(event) =>
                      onParticipantTeamAssignmentFormChange((current) => ({
                        ...current,
                        launchId: launch.id,
                        dueAt: event.target.value ? event.target.value : null,
                      }))
                    }
                  />
                </label>
                <button type="submit" className="button-secondary button-block" disabled={!participantTeamAssignmentForm.team}>
                  {launch.mode === 'tabletop' ? 'Add leadership team' : 'Assign team'}
                </button>
              </form>

              <div className="divider-text">or assign an individual</div>

              <form className="panel-form" onSubmit={(event) => void onCreateParticipantRun(event)}>
                <label>
                  Assign from roster
                  <select
                    value={participantAssignmentForm.rosterMemberId ?? ''}
                    onChange={(event) => {
                      const nextMember =
                        rosterMembers.find((member) => member.id === event.target.value) ?? null;
                      onParticipantAssignmentFormChange((current) => ({
                        ...current,
                        launchId: launch.id,
                        rosterMemberId: nextMember?.id ?? null,
                        participantName: nextMember ? nextMember.fullName : '',
                        participantEmail: nextMember?.email ?? null,
                        participantRole: nextMember ? nextMember.roleTitle : '',
                        participantTeam: nextMember?.team ?? null,
                      }));
                    }}
                  >
                    <option value="">Ad hoc assignment</option>
                    {rosterMembers
                      .filter((member) => member.status === 'active')
                      .map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.fullName} · {member.roleTitle}
                        </option>
                      ))}
                  </select>
                </label>
                {selectedRosterMember ? (
                  <div className="detail-card compact-detail-card">
                    <span className="summary-label">Roster snapshot</span>
                    <p>
                      {selectedRosterMember.email}
                      {' · '}
                      {selectedRosterMember.team}
                      {selectedRosterMember.managerName ? ` · Manager: ${selectedRosterMember.managerName}` : ''}
                    </p>
                  </div>
                ) : null}
                <label>
                  Name
                  <input
                    value={participantAssignmentForm.participantName}
                    onChange={(event) =>
                      onParticipantAssignmentFormChange((current) => ({
                        ...current,
                        launchId: launch.id,
                        participantName: event.target.value,
                      }))
                    }
                    placeholder={launch.mode === 'tabletop' ? 'Morgan Avery' : 'Jordan Lee'}
                    disabled={Boolean(selectedRosterMember)}
                  />
                </label>
                <label>
                  Role
                  <input
                    value={participantAssignmentForm.participantRole}
                    onChange={(event) =>
                      onParticipantAssignmentFormChange((current) => ({
                        ...current,
                        launchId: launch.id,
                        participantRole: event.target.value,
                      }))
                    }
                    placeholder={launch.mode === 'tabletop' ? 'Chief Operating Officer' : 'Compliance Officer'}
                    disabled={Boolean(selectedRosterMember)}
                  />
                </label>
                <label>
                  Team
                  <input
                    value={participantAssignmentForm.participantTeam ?? ''}
                    onChange={(event) =>
                      onParticipantAssignmentFormChange((current) => ({
                        ...current,
                        launchId: launch.id,
                        participantTeam: event.target.value ? event.target.value : null,
                      }))
                    }
                    placeholder={launch.mode === 'tabletop' ? 'Executive' : 'Operations'}
                    disabled={Boolean(selectedRosterMember)}
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    value={participantAssignmentForm.participantEmail ?? ''}
                    onChange={(event) =>
                      onParticipantAssignmentFormChange((current) => ({
                        ...current,
                        launchId: launch.id,
                        participantEmail: event.target.value ? event.target.value : null,
                      }))
                    }
                    placeholder="name@firm.com"
                    disabled={Boolean(selectedRosterMember)}
                  />
                </label>
                <label>
                  Due date
                  <input
                    type="date"
                    value={participantAssignmentForm.dueAt ?? ''}
                    onChange={(event) =>
                      onParticipantAssignmentFormChange((current) => ({
                        ...current,
                        launchId: launch.id,
                        dueAt: event.target.value ? event.target.value : null,
                      }))
                    }
                  />
                </label>
                <button type="submit" className="button-primary button-block">
                  {launch.mode === 'tabletop' ? 'Add seat' : 'Assign participant'}
                </button>
              </form>
            </div>
          ) : (
            <div className="empty-state">Your current role can review the launch, but assignment changes remain outside your scope.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportsPanel({
  currentUser,
  reports,
  selectedReportId,
  onSelectReport,
  activeReportDetail,
  exportBusy,
  onExportReport,
  reportCloseoutForm,
  onReportCloseoutFormChange,
  onUpdateReportCloseout,
}: {
  currentUser: WorkspaceUser;
  reports: ReportSummary[];
  selectedReportId: string | null;
  onSelectReport: (launchId: string) => void;
  activeReportDetail: ReportDetail | null;
  exportBusy: boolean;
  onExportReport: (launchId: string, format: ReportExportFormat) => void;
  reportCloseoutForm: ReportCloseoutForm;
  onReportCloseoutFormChange: Dispatch<SetStateAction<ReportCloseoutForm>>;
  onUpdateReportCloseout: (launchId: string, markClosed: boolean) => void;
}) {
  return (
    <section className="panel-grid">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Evidence queue</h3>
            <p>Review after-actions, completion posture, score trends, and export-ready evidence packages by exercise.</p>
          </div>
        </div>
        <ReportTable reports={reports} activeId={selectedReportId} onSelect={onSelectReport} />
      </div>

      <div className="panel side-panel">
        <h3>Evidence detail</h3>
        {activeReportDetail ? (
          <ReportDetailPanel
            currentUser={currentUser}
            report={activeReportDetail}
            exportBusy={exportBusy}
            onExportReport={onExportReport}
            closeoutForm={reportCloseoutForm}
            onCloseoutFormChange={onReportCloseoutFormChange}
            onUpdateReportCloseout={onUpdateReportCloseout}
          />
        ) : (
          <div className="empty-state">Select a report to review the latest evidence and participant findings.</div>
        )}
      </div>
    </section>
  );
}

function EvidencePanel({
  currentUser,
  reports,
  selectedReportId,
  onSelectReport,
  activeReportDetail,
  exportBusy,
  onExportReport,
  reportCloseoutForm,
  onReportCloseoutFormChange,
  onUpdateReportCloseout,
}: {
  currentUser: WorkspaceUser;
  reports: ReportSummary[];
  selectedReportId: string | null;
  onSelectReport: (launchId: string) => void;
  activeReportDetail: ReportDetail | null;
  exportBusy: boolean;
  onExportReport: (launchId: string, format: ReportExportFormat) => void;
  reportCloseoutForm: ReportCloseoutForm;
  onReportCloseoutFormChange: Dispatch<SetStateAction<ReportCloseoutForm>>;
  onUpdateReportCloseout: (launchId: string, markClosed: boolean) => void;
}) {
  const readyEvidence = reports.filter((report) => report.evidenceStatus === 'ready' && report.status !== 'closed').length;
  const inReview = reports.filter((report) => report.status === 'in_review').length;
  const closedPackages = reports.filter((report) => report.status === 'closed').length;
  const averageCompletion =
    reports.length > 0 ? Math.round(reports.reduce((sum, report) => sum + report.completionRate, 0) / reports.length) : 0;
  const scoredReports = reports.filter((report) => report.averageScore !== null);
  const averageScore =
    scoredReports.length > 0
      ? Math.round(scoredReports.reduce((sum, report) => sum + (report.averageScore ?? 0), 0) / scoredReports.length)
      : null;

  const evidenceCards: AdminSummaryCard[] = [
    {
      id: 'evidence-ready',
      label: 'Evidence ready',
      value: String(readyEvidence),
      note: readyEvidence > 0 ? 'These exercises are ready for review or export.' : 'No evidence packages are ready yet.',
      tone: readyEvidence > 0 ? 'ready' : 'neutral',
    },
    {
      id: 'evidence-review',
      label: 'Reports in review',
      value: String(inReview),
      note: inReview > 0 ? 'These reports still need operator review.' : 'No reports are currently waiting in review.',
      tone: inReview > 0 ? 'attention' : 'ready',
    },
    {
      id: 'evidence-closed',
      label: 'Closed packages',
      value: String(closedPackages),
      note: closedPackages > 0 ? 'These evidence packages were reviewed and formally closed.' : 'No evidence packages are closed yet.',
      tone: closedPackages > 0 ? 'ready' : 'neutral',
    },
    {
      id: 'evidence-completion',
      label: 'Average completion',
      value: `${averageCompletion}%`,
      note: 'Average assigned-run completion across visible exercise reports.',
      tone: averageCompletion >= 75 ? 'ready' : averageCompletion > 0 ? 'attention' : 'neutral',
    },
    {
      id: 'evidence-score',
      label: 'Average score',
      value: averageScore !== null ? `${averageScore}%` : 'N/A',
      note:
        averageScore !== null
          ? 'Average score across reports that already include participant scoring.'
          : 'Scoring will appear after participants submit required responses.',
      tone: averageScore !== null && averageScore >= 75 ? 'ready' : averageScore !== null ? 'attention' : 'neutral',
    },
  ];

  return (
    <section className="stack">
      <SummaryStrip cards={evidenceCards} />
      <ReportsPanel
        currentUser={currentUser}
        reports={reports}
        selectedReportId={selectedReportId}
        onSelectReport={onSelectReport}
        activeReportDetail={activeReportDetail}
        exportBusy={exportBusy}
        onExportReport={onExportReport}
        reportCloseoutForm={reportCloseoutForm}
        onReportCloseoutFormChange={onReportCloseoutFormChange}
        onUpdateReportCloseout={onUpdateReportCloseout}
      />
    </section>
  );
}

function ReportDetailPanel({
  currentUser,
  report,
  exportBusy,
  onExportReport,
  closeoutForm,
  onCloseoutFormChange,
  onUpdateReportCloseout,
}: {
  currentUser: WorkspaceUser;
  report: ReportDetail;
  exportBusy: boolean;
  onExportReport: (launchId: string, format: ReportExportFormat) => void;
  closeoutForm: ReportCloseoutForm;
  onCloseoutFormChange: Dispatch<SetStateAction<ReportCloseoutForm>>;
  onUpdateReportCloseout: (launchId: string, markClosed: boolean) => void;
}) {
  const canManageCloseout = currentUser.role === 'admin';

  return (
    <div className="stack">
      <div className="stat-grid">
        <article className="stat-card">
          <span className="summary-label">Completion</span>
          <strong>{report.completionRate}%</strong>
        </article>
        <article className="stat-card">
          <span className="summary-label">Average score</span>
          <strong>{report.averageScore !== null ? `${report.averageScore}%` : 'No score yet'}</strong>
        </article>
        <article className="stat-card">
          <span className="summary-label">Evidence</span>
          <strong>{report.evidenceStatus}</strong>
        </article>
        <article className="stat-card">
          <span className="summary-label">Launch status</span>
          <strong>{report.launchStatus.replace(/_/g, ' ')}</strong>
        </article>
        <article className="stat-card">
          <span className="summary-label">Review status</span>
          <strong>{report.status.replace(/_/g, ' ')}</strong>
        </article>
      </div>

      <div className="detail-card">
        <span className="summary-label">Scenario brief</span>
        <p>{report.scenarioBrief}</p>
      </div>

      <div className="detail-card">
        <span className="summary-label">Highlights</span>
        <ul className="muted-list">
          {report.highlights.map((highlight) => (
            <li key={highlight}>{highlight}</li>
          ))}
        </ul>
      </div>

      <div className="detail-card">
        <span className="summary-label">After-action summary</span>
        <p>{report.afterActionSummary.executiveSummary}</p>
        <div className="detail-grid report-detail-grid">
          <div className="report-section">
            <strong>Strengths</strong>
            <ListOrEmpty items={report.afterActionSummary.strengths} emptyLabel="No strengths recorded yet." />
          </div>
          <div className="report-section">
            <strong>Gaps</strong>
            <ListOrEmpty items={report.afterActionSummary.gaps} emptyLabel="No gaps recorded yet." />
          </div>
          <div className="report-section full-width">
            <strong>Recommended actions</strong>
            <ListOrEmpty
              items={report.afterActionSummary.recommendedActions}
              emptyLabel="No follow-up actions recorded yet."
            />
          </div>
        </div>
      </div>

      <div className="detail-card">
        <span className="summary-label">Operator closeout</span>
        {report.closedAt ? (
          <p>
            Closed {formatDate(report.closedAt)}
            {report.closedByName ? ` by ${report.closedByName}` : ''}.
          </p>
        ) : (
          <p>Evidence remains open for operator review and closeout.</p>
        )}
        {canManageCloseout ? (
          <div className="stack compact-stack">
            <label>
              Closeout notes
              <textarea
                value={closeoutForm.closeoutNotes}
                onChange={(event) =>
                  onCloseoutFormChange((current) => ({ ...current, closeoutNotes: event.target.value }))
                }
                placeholder="Summarize the operator's conclusion, approval posture, and what should happen next."
              />
            </label>
            <label>
              Follow-up actions
              <textarea
                value={closeoutForm.followUpText}
                onChange={(event) =>
                  onCloseoutFormChange((current) => ({ ...current, followUpText: event.target.value }))
                }
                placeholder={'One follow-up action per line'}
              />
            </label>
            <div className="button-row">
              <button
                type="button"
                className="button-secondary"
                disabled={exportBusy}
                onClick={() => onUpdateReportCloseout(report.launchId, false)}
              >
                {report.closedAt ? 'Reopen package' : 'Save notes'}
              </button>
              <button
                type="button"
                className="button-primary"
                disabled={exportBusy || report.evidenceStatus !== 'ready'}
                onClick={() => onUpdateReportCloseout(report.launchId, true)}
              >
                {report.closedAt ? 'Save as closed' : 'Close evidence package'}
              </button>
            </div>
            {report.evidenceStatus !== 'ready' ? (
              <p className="subtle">At least one submitted response is required before the evidence package can be closed.</p>
            ) : null}
          </div>
        ) : (
          <div className="detail-grid report-detail-grid">
            <div className="report-section full-width">
              <strong>Closeout notes</strong>
              <p className="subtle">{report.closeoutNotes || 'No operator closeout notes recorded yet.'}</p>
            </div>
            <div className="report-section full-width">
              <strong>Follow-up actions</strong>
              <ListOrEmpty items={report.followUpActions} emptyLabel="No operator follow-up actions recorded yet." />
            </div>
          </div>
        )}
      </div>

      <div className="detail-card">
        <span className="summary-label">Evidence checklist</span>
        <div className="evidence-list">
          {report.evidenceItems.map((item) => (
            <div key={item.id} className="evidence-row">
              <span className={`badge status-${item.status}`}>{item.status}</span>
              <div>
                <strong>{item.label}</strong>
                <p>{item.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="detail-card">
        <span className="summary-label">Export outputs</span>
        <div className="export-list">
          <div className="export-row">
            <div>
              <strong>Markdown after-action brief</strong>
              <p>Readable after-action summary with highlights, gaps, follow-ups, and participant evidence.</p>
            </div>
            <button
              type="button"
              className="button-secondary table-button"
              disabled={exportBusy}
              onClick={() => onExportReport(report.launchId, 'markdown')}
            >
              Download .md
            </button>
          </div>
          <div className="export-row">
            <div>
              <strong>JSON evidence package</strong>
              <p>Structured roster, completion, checkpoint, and note data for audit or compliance workflows.</p>
            </div>
            <button
              type="button"
              className="button-secondary table-button"
              disabled={exportBusy}
              onClick={() => onExportReport(report.launchId, 'json')}
            >
              Download .json
            </button>
          </div>
        </div>
      </div>

      <div className="detail-card">
        <span className="summary-label">Participant runs</span>
        <table className="table">
          <thead>
            <tr>
              <th>Participant</th>
              <th>Status</th>
              <th>Score</th>
              <th>Required checkpoints</th>
            </tr>
          </thead>
          <tbody>
            {report.participantRuns.map((run) => (
              <tr key={run.id}>
                <td>
                  <strong>{run.participantName}</strong>
                  <div className="table-note">{run.participantRole}</div>
                </td>
                <td>
                  <span className={`badge status-${run.status}`}>{run.status.replace(/_/g, ' ')}</span>
                </td>
                <td>{run.scorePercent !== null ? `${run.scorePercent}%` : 'Not started'}</td>
                <td>
                  {run.requiredActionsCompleted}/{run.totalRequiredActions}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ListOrEmpty({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <p className="subtle">{emptyLabel}</p>;
  }

  return (
    <ul className="muted-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function FacilitatorTabletopPanel({
  launch,
  notes,
  onNotesChange,
  onBack,
  onSaveNotes,
  onSetPhase,
  onSetStatus,
  onOpenParticipantRun,
}: {
  launch: LaunchDetail;
  notes: string;
  onNotesChange: Dispatch<SetStateAction<string>>;
  onBack: () => void;
  onSaveNotes: () => void;
  onSetPhase: (phase: TabletopPhase) => void;
  onSetStatus: (status: LaunchDetail['status']) => void;
  onOpenParticipantRun: (runId: string) => void;
}) {
  const tabletopRunbook = buildTabletopRunbook(launch);

  return (
    <section className="stack">
      <div className="participant-topbar">
        <button type="button" className="button-secondary" onClick={onBack}>
          Back to launch control
        </button>
        <div className="meta">
          <span className={`badge status-${launch.status}`}>{launch.status.replace(/_/g, ' ')}</span>
          <span className="chip muted">{formatTabletopPhaseLabel(launch.tabletopPhase)}</span>
          <span className="chip muted">{launch.audience}</span>
        </div>
      </div>

      <div className="tabletop-hero">
        <div className="tabletop-hero-copy">
          <div className="eyebrow">Facilitator Console</div>
          <h3>{launch.name}</h3>
          <p>{launch.scenarioBrief}</p>
        </div>
        <div className="tabletop-hero-meta">
          <div className="tabletop-hero-card">
            <span className="summary-label">Session date</span>
            <strong>{launch.startsAt ?? 'Not scheduled'}</strong>
          </div>
          <div className="tabletop-hero-card">
            <span className="summary-label">Roster</span>
            <strong>{launch.participantRuns.length} seats</strong>
          </div>
          <div className="tabletop-hero-card">
            <span className="summary-label">Objective</span>
            <strong>{launch.learningObjectives}</strong>
          </div>
        </div>
      </div>

      <div className="tabletop-layout">
        <div className="stack">
          <div className="panel tabletop-panel">
          <div className="panel-header">
            <div>
              <h3>Session controls</h3>
              <p>Control session status, phase progression, and tabletop flow without leaving the live exercise.</p>
            </div>
          </div>
            <div className="tabletop-control-grid">
              {tabletopStatusOptions.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={launch.status === status ? 'phase-button active' : 'phase-button'}
                  onClick={() => onSetStatus(status)}
                >
                  {status.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
            <div className="tabletop-phase-strip">
              {tabletopPhaseOptions.map((phase) => (
                <button
                  key={phase}
                  type="button"
                  className={launch.tabletopPhase === phase ? 'phase-button active' : 'phase-button'}
                  onClick={() => onSetPhase(phase)}
                >
                  {formatTabletopPhaseLabel(phase)}
                </button>
              ))}
            </div>
          </div>

          <div className="panel tabletop-panel">
            <div className="panel-header">
              <div>
                <h3>Run of show</h3>
                <p>Move the session forward with a clear run of show tied to the tabletop objective and decision points.</p>
              </div>
            </div>
            <div className="tabletop-sequence">
              {tabletopRunbook.map((step, index) => (
                <article
                  key={step.id}
                  className={launch.tabletopPhase === step.id ? 'sequence-card active' : 'sequence-card'}
                >
                  <div className="sequence-index">0{index + 1}</div>
                  <div className="sequence-body">
                    <strong>{step.title}</strong>
                    <p>{step.description}</p>
                    <ul className="muted-list">
                      {step.prompts.map((prompt) => (
                        <li key={prompt}>{prompt}</li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="panel tabletop-panel">
            <div className="panel-header">
              <div>
                <h3>Facilitator notes</h3>
                <p>Capture operator observations separately from participant evidence so after-action review stays traceable.</p>
              </div>
            </div>
            <textarea
              className="tabletop-notes"
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              placeholder="Record decision friction, policy confusion, missing owners, and follow-up items."
            />
            <div className="button-row">
              <button type="button" className="button-primary" onClick={onSaveNotes}>
                Save facilitator notes
              </button>
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="panel tabletop-sidebar-panel">
            <div className="panel-header">
              <div>
                <h3>Leadership roster</h3>
                <p>The same launch roster supports attendance, response records, and later evidence packaging.</p>
              </div>
            </div>
            {launch.participantRuns.length ? (
              <div className="tabletop-roster">
                {launch.participantRuns.map((run) => (
                  <div key={run.id} className="roster-row">
                    <div>
                      <strong>{run.participantName}</strong>
                      <div className="table-note">{run.participantRole}</div>
                    </div>
                    <div className="roster-actions">
                      <span className={`badge status-${run.status}`}>{run.status.replace(/_/g, ' ')}</span>
                      <button type="button" className="button-secondary table-button" onClick={() => onOpenParticipantRun(run.id)}>
                        View seat record
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">No leader seats assigned yet.</div>
            )}
          </div>

          <div className="panel tabletop-sidebar-panel">
            <h3>Decision prompts</h3>
            <ul className="muted-list">
              <li>What is the first governing decision the executive team must make under the firm&apos;s continuity plan?</li>
              <li>Who owns customer, regulator, and vendor communications if the outage extends into the next operating window?</li>
              <li>Which workaround is approved today, and what evidence would prove it is viable at scale?</li>
              <li>What dependency or role remains ambiguous enough to create delay in a real event?</li>
            </ul>
          </div>

          <div className="panel tabletop-sidebar-panel">
            <h3>Evidence posture</h3>
            <ul className="muted-list">
              <li>Facilitator notes stay separate from participant scoring and completion records.</li>
              <li>Phase and status changes remain operator-owned and reviewable.</li>
              <li>Any seat-level response still flows into the same launch report and export package.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function ParticipantExercisePanel({
  run,
  form,
  readOnly,
  onFormChange,
  onBack,
  onSaveProgress,
  onSubmitResponse,
}: {
  run: ParticipantRunDetail;
  form: ParticipantResponseForm;
  readOnly: boolean;
  onFormChange: Dispatch<SetStateAction<ParticipantResponseForm>>;
  onBack: () => void;
  onSaveProgress: () => void;
  onSubmitResponse: () => void;
}) {
  const checkpoints = buildParticipantCheckpoints(form);

  return (
    <section className="stack">
      <div className="participant-topbar">
        <button type="button" className="button-secondary" onClick={onBack}>
          Back to launch control
        </button>
        <div className="meta">
          <span className={`badge status-${run.status}`}>{run.status.replace(/_/g, ' ')}</span>
          <span className="chip muted">{run.participantRole}</span>
          <span className="chip muted">{run.participantName}</span>
        </div>
      </div>

      <div className="participant-hero">
        <div className="participant-hero-copy">
          <div className="eyebrow">Exercise Workspace</div>
          <h3>{run.launchName}</h3>
          <p>{run.scenarioBrief}</p>
        </div>
        <div className="participant-hero-stats">
          <article className="tabletop-hero-card">
            <span className="summary-label">Due</span>
            <strong>{run.dueAt ?? 'Not scheduled'}</strong>
          </article>
          <article className="tabletop-hero-card">
            <span className="summary-label">Score</span>
            <strong>{run.scorePercent !== null ? `${run.scorePercent}%` : 'No score yet'}</strong>
          </article>
          <article className="tabletop-hero-card">
            <span className="summary-label">Checkpoints</span>
            <strong>
              {run.requiredActionsCompleted}/{run.totalRequiredActions}
            </strong>
          </article>
        </div>
      </div>

      <div className="participant-layout">
        <div className="stack">
            <div className="panel participant-workspace">
              <div className="panel-header">
                <div>
                <h3>{readOnly ? 'Run record' : 'Action worksheet'}</h3>
                <p>
                  {readOnly
                    ? 'This view is read-only in the current role. Review the participant response and evidence without editing the run.'
                    : 'Answer the required exercise fields directly from the firm&apos;s procedure, not from memory.'}
                </p>
                </div>
              </div>
            <div className="participant-callout">
              Your response is scored only against the required exercise fields. Notes stay separate as after-action evidence.
            </div>
            <div className="response-grid">
              <label className="full-width">
                First action
                <textarea
                  value={form.firstAction}
                  disabled={readOnly}
                  onChange={(event) => onFormChange((current) => ({ ...current, firstAction: event.target.value }))}
                  placeholder="State the first required action under the controlling procedure."
                />
              </label>
              <label>
                Escalation owner
                <input
                  value={form.escalationChoice}
                  disabled={readOnly}
                  onChange={(event) => onFormChange((current) => ({ ...current, escalationChoice: event.target.value }))}
                  placeholder="Incident Commander"
                />
              </label>
              <label>
                Impact assessment
                <input
                  value={form.impactAssessment}
                  disabled={readOnly}
                  onChange={(event) => onFormChange((current) => ({ ...current, impactAssessment: event.target.value }))}
                  placeholder="Who is impacted first?"
                />
              </label>
              <label className="full-width">
                After-action note
                <textarea
                  value={form.notes}
                  disabled={readOnly}
                  onChange={(event) => onFormChange((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Record anything unclear, missing, or slow in the current policy path."
                />
              </label>
              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  disabled={readOnly}
                  checked={form.policyAcknowledged}
                  onChange={(event) =>
                    onFormChange((current) => ({ ...current, policyAcknowledged: event.target.checked }))
                  }
                />
                I used the controlling policy or playbook to answer this exercise.
              </label>
            </div>

            {readOnly ? (
              <div className="participant-callout">This run is read-only in the current role. Changes must come from the assigned user or an admin.</div>
            ) : (
              <div className="button-row">
                <button type="button" className="button-secondary" onClick={onSaveProgress}>
                  Save progress
                </button>
                <button type="button" className="button-primary" onClick={onSubmitResponse}>
                  Submit response
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="stack">
          <div className="panel participant-side-panel">
            <div className="panel-header">
              <div>
                <h3>Exercise brief</h3>
                <p>Keep the scenario context, timing, and learning objective visible while you work through the exercise.</p>
              </div>
            </div>
            <div className="key-value-list">
              <div className="key-value-row">
                <span>Audience</span>
                <strong>{run.audience}</strong>
              </div>
              <div className="key-value-row">
                <span>Launch date</span>
                <strong>{run.startsAt ?? 'Not scheduled'}</strong>
              </div>
              <div className="key-value-row">
                <span>Learning objective</span>
                <strong>{run.learningObjectives}</strong>
              </div>
            </div>
          </div>

          <div className="panel participant-side-panel">
            <div className="panel-header">
              <div>
                <h3>Required checkpoints</h3>
                <p>Your score reflects completion of the required response fields, not open-ended narrative quality.</p>
              </div>
            </div>
            <div className="checkpoint-list">
              {checkpoints.map((checkpoint) => (
                <div key={checkpoint.id} className="checkpoint-row">
                  <span className={checkpoint.complete ? 'checkpoint-dot complete' : 'checkpoint-dot'} />
                  <div>
                    <strong>{checkpoint.label}</strong>
                    <p>{checkpoint.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel participant-side-panel">
            <h3>Evidence output</h3>
            <ul className="muted-list">
              <li>Your submission becomes part of the launch report and evidence checklist.</li>
              <li>After-action notes are kept separate from the required checkpoint score.</li>
              <li>This exercise stays structured so results remain comparable across participants and launches.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function SettingsPanel() {
  return (
    <section className="panel-grid">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Program standards</h3>
            <p>Keep approval, evidence, and customer-material handling explicit.</p>
          </div>
        </div>
        <div className="key-value-list">
          <div className="key-value-row">
            <span>Customer data posture</span>
            <strong>No model training on customer materials by default</strong>
          </div>
          <div className="key-value-row">
            <span>Approval gate</span>
            <strong>Admin review before launch</strong>
          </div>
          <div className="key-value-row">
            <span>Exercise scoring</span>
            <strong>Deterministic template logic</strong>
          </div>
          <div className="key-value-row">
            <span>Auditability</span>
            <strong>Launch, response, and export events must be traceable</strong>
          </div>
        </div>
      </div>

      <div className="panel side-panel">
        <h3>Admin controls</h3>
        <ul className="muted-list">
          <li>Review materials before they shape live exercises.</li>
          <li>Control who can access the workspace and which teams managers can oversee.</li>
          <li>Approve launches and close evidence packages when review is complete.</li>
          <li>Keep access changes, launch changes, and exports traceable for audit.</li>
        </ul>
      </div>
    </section>
  );
}

function LaunchTable({
  launches,
  activeId,
  onSelect,
}: {
  launches: LaunchSummary[];
  activeId?: string | null;
  onSelect?: (launchId: string) => void;
}) {
  if (launches.length === 0) {
    return <div className="empty-state">No launches yet. Approve a draft and create one from the launch panel.</div>;
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Mode</th>
          <th>Audience</th>
          <th>Status</th>
          <th>Participants</th>
          <th>Starts</th>
        </tr>
      </thead>
      <tbody>
        {launches.map((launch) => (
          <tr
            key={launch.id}
            className={onSelect ? `selectable-row${launch.id === activeId ? ' active' : ''}` : undefined}
            onClick={onSelect ? () => onSelect(launch.id) : undefined}
          >
            <td>
              <strong>{launch.name}</strong>
              <div className="table-note">{launch.participantsLabel}</div>
            </td>
            <td>
              {launch.mode === 'individual' ? 'Individual' : 'Tabletop'}
              {launch.mode === 'tabletop' && launch.tabletopPhase ? (
                <div className="table-note">{formatTabletopPhaseLabel(launch.tabletopPhase)}</div>
              ) : null}
            </td>
            <td>{launch.audience}</td>
            <td>
              <span className={`badge status-${launch.status}`}>{launch.status.replace(/_/g, ' ')}</span>
            </td>
            <td>
              {launch.completedCount}/{launch.participantCount}
            </td>
            <td>{launch.startsAt}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ReportTable({
  reports,
  activeId,
  onSelect,
}: {
  reports: ReportSummary[];
  activeId?: string | null;
  onSelect?: (reportId: string) => void;
}) {
  if (reports.length === 0) {
    return <div className="empty-state">No report data yet. Assign participants and collect at least one run.</div>;
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Exercise</th>
          <th>Completion</th>
          <th>Average score</th>
          <th>Evidence</th>
          <th>Status</th>
          <th>Updated</th>
        </tr>
      </thead>
      <tbody>
        {reports.map((report) => (
          <tr
            key={report.id}
            className={onSelect ? `selectable-row${report.id === activeId ? ' active' : ''}` : undefined}
            onClick={onSelect ? () => onSelect(report.id) : undefined}
          >
            <td>{report.name}</td>
            <td>{report.completionRate}%</td>
            <td>{report.averageScore !== null ? `${report.averageScore}%` : 'No score yet'}</td>
            <td>
              <span className={`badge status-${report.evidenceStatus}`}>{report.evidenceStatus}</span>
            </td>
            <td>
              <span className={`badge status-${report.status}`}>{report.status.replace('_', ' ')}</span>
            </td>
            <td>{formatDate(report.lastUpdated)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function makeDefaultDraftInput(template: ScenarioTemplate): ScenarioDraftInput {
  return {
    title: defaultTitleForTemplate(template),
    templateId: template.id,
    audience: template.primaryAudience,
    launchMode: 'individual',
    difficulty: 'medium',
    learningObjectives: `Validate how ${template.primaryAudience.toLowerCase()} should respond using the firm's own procedures and escalation paths.`,
    approvalStatus: 'draft',
    scheduledStartAt: null,
    participantsLabel: null,
  };
}

function makeDefaultRosterMemberInput(): RosterMemberInput {
  return {
    fullName: '',
    email: '',
    roleTitle: '',
    team: '',
    managerName: null,
    status: 'active',
  };
}

function makeDefaultWorkspaceUserInput(): WorkspaceAccessForm {
  return {
    fullName: '',
    email: '',
    role: 'user',
    capabilities: [],
    scopeTeams: [],
    rosterMemberId: null,
    status: 'active',
  };
}

function makeDefaultWorkspaceInviteInput(): WorkspaceInviteForm {
  return {
    fullName: '',
    email: '',
    role: 'user',
    capabilities: [],
    scopeTeams: [],
    rosterMemberId: null,
  };
}

function makeWorkspaceUserForm(user: WorkspaceUser): WorkspaceAccessForm {
  return {
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    capabilities: user.capabilities,
    scopeTeams: user.scopeTeams,
    rosterMemberId: user.rosterMemberId,
    status: user.status,
  };
}

function makeDefaultTeamAssignmentInput(): TeamAssignmentForm {
  return {
    launchId: '',
    team: '',
    dueAt: null,
  };
}

function makeDefaultReportCloseoutForm(): ReportCloseoutForm {
  return {
    closeoutNotes: '',
    followUpText: '',
  };
}

function mapRosterMemberToInput(member: RosterMember): RosterMemberInput {
  return {
    fullName: member.fullName,
    email: member.email,
    roleTitle: member.roleTitle,
    team: member.team,
    managerName: member.managerName,
    status: member.status,
  };
}

function defaultTitleForTemplate(template: ScenarioTemplate): string {
  return `${template.name} Draft`;
}

function formatDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return value.slice(0, 10);
}

function formatTabletopPhaseLabel(value: TabletopPhase | null | undefined): string {
  if (!value) return 'Not started';
  return value.replace(/_/g, ' ');
}

function formatScenarioApprovalStatusLabel(value: ScenarioDraft['approvalStatus']): string {
  if (value === 'changes_requested') return 'Changes requested';
  if (value === 'ready_for_review') return 'Ready for review';
  return value.replace(/_/g, ' ');
}

function canWriteParticipantRun(
  user: WorkspaceUser,
  run: Pick<ParticipantRun, 'rosterMemberId'>,
): boolean {
  if (user.role === 'admin') return true;
  return user.role === 'user' && Boolean(user.rosterMemberId) && user.rosterMemberId === run.rosterMemberId;
}

function formatWorkspaceRoleLabel(role: WorkspaceUser['role']): string {
  if (role === 'admin') return 'Admin';
  if (role === 'manager') return 'Manager';
  return 'User';
}

function formatWorkspaceScopeLabel(
  role: WorkspaceUser['role'],
  scopeTeams: string[],
  fallbackTeam: string | null,
): string {
  if (role === 'admin') return 'Workspace-wide';
  if (role === 'user') return fallbackTeam ? `${fallbackTeam} (linked roster)` : 'Assigned via roster';
  if (scopeTeams.length > 0) return scopeTeams.join(', ');
  if (fallbackTeam) return `${fallbackTeam} (linked roster)`;
  return 'No team scope';
}

function formatInviteMagicLinkState(invite: WorkspaceInvite): string {
  if (invite.status !== 'pending') return 'Not active';
  if (!invite.magicLinkSentAt || !invite.magicLinkExpiresAt) return 'Not sent';
  if (invite.magicLinkExpiresAt < new Date().toISOString()) {
    return `Expired ${formatDate(invite.magicLinkExpiresAt)}`;
  }
  return `Sent ${formatDate(invite.magicLinkSentAt)} · expires ${formatDate(invite.magicLinkExpiresAt)}`;
}

function formatWorkspaceCapabilityLabel(capability: WorkspaceUserCapability): string {
  if (capability === 'resilience_tabletop_facilitate') return 'Tabletop facilitate';
  return capability;
}

function hasWorkspaceCapability(user: WorkspaceUser, capability: WorkspaceUserCapability): boolean {
  return user.capabilities.includes(capability);
}

function stripFileExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '');
}

function readMagicLinkTokenFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('magic_link_token');
}

function clearMagicLinkTokenFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete('magic_link_token');
  window.history.replaceState({}, '', url);
}

function buildMagicLinkUrl(path: string): string {
  return new URL(path, window.location.origin).toString();
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function formatBucketLabel(bucketId: string): string {
  if (bucketId === 'teams') return 'Teams';
  if (bucketId === 'vendors') return 'Vendors';
  if (bucketId === 'escalation') return 'Escalation Roles';
  return bucketId;
}

function formatStorageBackendLabel(storageBackend: 'inline' | 'r2'): string {
  return storageBackend === 'r2' ? 'Stored file' : 'Inline text';
}

function formatExtractionMethodLabel(value: SourceExtractionProvenance['method']): string {
  if (value === 'upload_native') return 'Upload native';
  if (value === 'upload_ai') return 'Upload AI';
  if (value === 'manual_native') return 'Manual native';
  if (value === 'queued_native') return 'Queued native';
  return 'Queued AI';
}

function formatExtractionProviderLabel(value: SourceExtractionProvenance['provider']): string {
  if (value === 'workers_ai_markdown') return 'Workers AI markdown';
  if (value === 'workers_ai_vision') return 'Workers AI vision';
  return 'Native parser';
}

function triggerDownload(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export default App;
