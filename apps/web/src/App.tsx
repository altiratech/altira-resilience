import { useEffect, useState } from 'react';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type {
  AdminNavId,
  AdminNavItem,
  AdminSummaryCard,
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
  WorkspaceUser,
} from '@resilience/shared';
import {
  applySourceSuggestion,
  createContextItem,
  createLaunch,
  createParticipantRun,
  createRosterMember,
  createScenarioDraft,
  extractSourceDocument,
  exportReport,
  getCurrentUserId,
  getBootstrap,
  getLaunchDetail,
  getParticipantRun,
  getReportDetail,
  getSourceDocument,
  queueSourceDocumentExtraction,
  setCurrentUserId,
  updateContextItem,
  updateLaunch,
  updateParticipantRun,
  updateRosterMember,
  updateScenarioDraft,
  updateSourceDocument,
  updateSourceSuggestionStatus,
  uploadSourceDocument,
} from './api';

type StudioStep = 'source-library' | 'org-context' | 'templates' | 'configuration';

type ParticipantResponseForm = {
  firstAction: string;
  escalationChoice: string;
  impactAssessment: string;
  notes: string;
  policyAcknowledged: boolean;
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
  'source-library': 'Source Library',
  'org-context': 'Organization Context',
  templates: 'Template Selection',
  configuration: 'Scenario Configuration',
};

const studioSteps: StudioStep[] = ['source-library', 'org-context', 'templates', 'configuration'];

const fallbackNav: AdminNavItem[] = [
  { id: 'home', label: 'Home' },
  { id: 'source-library', label: 'Source Library' },
  { id: 'org-context', label: 'Organization Context' },
  { id: 'scenario-studio', label: 'Scenario Studio' },
  { id: 'roster', label: 'Roster' },
  { id: 'launches', label: 'Launches' },
  { id: 'reports', label: 'Reports' },
  { id: 'settings', label: 'Settings' },
];

const fallbackSummaryCards: AdminSummaryCard[] = [
  {
    id: 'approved-sources',
    label: 'Approved source documents',
    value: '0',
    note: 'API unavailable. Showing local scaffold fallback.',
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
const fallbackParticipantAssignments: ParticipantRun[] = [];
const fallbackAvailableUsers: WorkspaceUser[] = [
  {
    id: 'user_dana_admin',
    fullName: 'Dana Smith',
    email: 'dana.smith@altira-demo.local',
    role: 'admin',
    rosterMemberId: null,
    status: 'active',
    updatedAt: '2026-03-11T14:30:00.000Z',
  },
];
const fallbackCurrentUser = fallbackAvailableUsers[0];

const navCopy: Record<AdminNavId, { title: string; description: string }> = {
  home: {
    title: 'Home',
    description:
      'Admin-first scaffold for turning approved plans, playbooks, and escalation rules into guided rehearsal.',
  },
  'source-library': {
    title: 'Source Library',
    description:
      'Upload firm materials, review extracted teams/vendors/escalation roles, and decide what becomes structured context.',
  },
  'org-context': {
    title: 'Organization Context',
    description:
      'Reviewable teams, vendors, and escalation paths become structured exercise inputs before any scenario draft is launched.',
  },
  'scenario-studio': {
    title: 'Scenario Studio',
    description:
      'Template-first authoring keeps v1 bounded, serious, and reviewable instead of drifting into open-ended generation.',
  },
  roster: {
    title: 'Roster',
    description:
      'Keep a real participant directory with names, roles, teams, and reporting lines so launches can assign against a controlled roster instead of free text.',
  },
  launches: {
    title: 'Launches',
    description:
      'Launches are now explicit operational records with assigned participants, run status, and a real exercise surface.',
  },
  reports: {
    title: 'Reports',
    description:
      'Readiness only matters if completion, deterministic checkpoints, and evidence can be reviewed after the exercise closes.',
  },
  settings: {
    title: 'Settings',
    description:
      'Core product controls should stay operator-owned: permissions, retention, model usage, and audit posture.',
  },
};

function App() {
  const [loading, setLoading] = useState(true);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<BootstrapPayload | null>(null);
  const [activeNav, setActiveNav] = useState<AdminNavId>('home');
  const [activeStudioStep, setActiveStudioStep] = useState<StudioStep>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('cyber-incident-escalation');
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [selectedSourceDocumentId, setSelectedSourceDocumentId] = useState<string | null>(null);
  const [activeSourceDocument, setActiveSourceDocument] = useState<SourceDocumentDetail | null>(null);
  const [selectedLaunchId, setSelectedLaunchId] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedRosterMemberId, setSelectedRosterMemberId] = useState<string | null>(null);
  const [activeLaunchDetail, setActiveLaunchDetail] = useState<LaunchDetail | null>(null);
  const [activeReportDetail, setActiveReportDetail] = useState<ReportDetail | null>(null);
  const [activeFacilitatorLaunchId, setActiveFacilitatorLaunchId] = useState<string | null>(null);
  const [activeParticipantRunId, setActiveParticipantRunId] = useState<string | null>(null);
  const [activeParticipantRun, setActiveParticipantRun] = useState<ParticipantRunDetail | null>(null);
  const [facilitatorNotesForm, setFacilitatorNotesForm] = useState('');
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
  const [draftForm, setDraftForm] = useState<ScenarioDraftInput>(makeDefaultDraftInput(fallbackTemplates[0]));
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
  const [participantResponseForm, setParticipantResponseForm] = useState<ParticipantResponseForm>({
    firstAction: '',
    escalationChoice: '',
    impactAssessment: '',
    notes: '',
    policyAcknowledged: false,
  });

  const nav = payload?.nav ?? fallbackNav;
  const summaryCards = payload?.summaryCards ?? fallbackSummaryCards;
  const documents = payload?.sourceLibrary ?? fallbackDocuments;
  const contextBuckets = payload?.organizationContext ?? fallbackContext;
  const templates = payload?.scenarioTemplates ?? fallbackTemplates;
  const scenarioDrafts = payload?.scenarioDrafts ?? fallbackDrafts;
  const rosterMembers = payload?.rosterMembers ?? fallbackRosterMembers;
  const currentUser = payload?.currentUser ?? fallbackCurrentUser;
  const availableUsers = payload?.availableUsers ?? fallbackAvailableUsers;
  const participantAssignments = payload?.participantAssignments ?? fallbackParticipantAssignments;
  const launches = payload?.launches ?? fallbackLaunches;
  const reports = payload?.reports ?? fallbackReports;
  const approvedDrafts = scenarioDrafts.filter((draft) => draft.approvalStatus === 'approved');
  const activeWorkflowStep = getWorkflowStep(activeNav, activeStudioStep);
  const selectedScenarioTemplate =
    templates.find((template) => template.id === selectedTemplate) ?? templates[0];
  const participantWorkspace = currentUser.role === 'participant';
  const participantView = Boolean(activeParticipantRun);
  const facilitatorView =
    Boolean(activeFacilitatorLaunchId) &&
    activeLaunchDetail?.id === activeFacilitatorLaunchId &&
    activeLaunchDetail.mode === 'tabletop';

  const headerCopy = participantView
    ? {
        title: activeParticipantRun?.launchName ?? 'Participant Exercise',
        description:
          'This participant surface is intentionally bounded: complete the required checkpoints, cite the policy path, and submit a traceable response.',
      }
    : facilitatorView
      ? {
          title: activeLaunchDetail?.name ?? 'Facilitator Tabletop',
          description:
            'Facilitator mode keeps launch control, phase management, roster review, and evidence-oriented note capture in one bounded tabletop console.',
        }
    : participantWorkspace
      ? {
          title: 'My Exercises',
          description:
            'Participant access is intentionally narrow: open assigned runs, complete the required checkpoints, and submit a traceable response.',
        }
    : activeNav === 'scenario-studio'
      ? {
          title: stepTitles[activeStudioStep],
          description:
            activeStudioStep === 'configuration'
              ? 'Scenario drafts persist with approval state, while launches and participant runs now continue the workflow after approval.'
              : navCopy['scenario-studio'].description,
        }
      : navCopy[activeNav];

  useEffect(() => {
    const storedUserId = getCurrentUserId();
    if (!storedUserId) {
      setCurrentUserId(fallbackCurrentUser.id);
    }
  }, []);

  useEffect(() => {
    void reloadBootstrap();
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
    if (!nav.some((item) => item.id === activeNav)) {
      setActiveNav(nav[0]?.id ?? 'home');
    }
  }, [activeNav, nav]);

  async function reloadBootstrap() {
    setError(null);
    setLoading(true);
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
      setError(loadError instanceof Error ? loadError.message : 'Unable to load Altira Resilience data.');
      setPayload({
        appName: 'Altira Resilience',
        stage: 'offline-fallback',
        currentUser: fallbackCurrentUser,
        availableUsers: fallbackAvailableUsers,
        nav: fallbackNav,
        summaryCards: fallbackSummaryCards,
        sourceLibrary: fallbackDocuments,
        organizationContext: fallbackContext,
        scenarioTemplates: fallbackTemplates,
        scenarioDrafts: fallbackDrafts,
        rosterMembers: fallbackRosterMembers,
        participantAssignments: fallbackParticipantAssignments,
        launches: fallbackLaunches,
        reports: fallbackReports,
      });
    } finally {
      setLoading(false);
    }
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

  async function handleCurrentUserChange(userId: string) {
    setCurrentUserId(userId);
    setActiveNav('home');
    closeParticipantRun();
    closeFacilitatorConsole();
    setSelectedSourceDocumentId(null);
    setActiveSourceDocument(null);
    setSelectedLaunchId(null);
    setActiveLaunchDetail(null);
    setSelectedReportId(null);
    setActiveReportDetail(null);
    await reloadBootstrap();
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

  function startNewDraftFromTemplate(template: ScenarioTemplate) {
    setSelectedTemplate(template.id);
    setActiveDraftId(null);
    setDraftForm(makeDefaultDraftInput(template));
    setActiveNav('scenario-studio');
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
    setActiveNav('scenario-studio');
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
    });
  }

  function resetRosterForm() {
    setSelectedRosterMemberId(null);
    setRosterForm(makeDefaultRosterMemberInput());
  }

  async function handleDraftSave(nextStatus?: ScenarioApprovalStatus) {
    const payloadToSave: ScenarioDraftInput = {
      ...draftForm,
      templateId: selectedScenarioTemplate.id,
      audience: draftForm.audience.trim() || selectedScenarioTemplate.primaryAudience,
      title: draftForm.title.trim() || defaultTitleForTemplate(selectedScenarioTemplate),
      approvalStatus: nextStatus ?? draftForm.approvalStatus,
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
      setActiveNav('launches');
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

  return (
    <div className={participantWorkspace ? 'shell shell-participant' : 'shell'}>
      {!participantWorkspace ? (
        <aside className="sidebar">
          <div className="brand">
            <div className="eyebrow">Altira</div>
            <h1>Resilience</h1>
            <p>Role-aware operator scaffold for the first runnable workflow slice.</p>
          </div>
          <nav className="nav">
            {nav.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === activeNav && !participantView && !facilitatorView ? 'nav-item active' : 'nav-item'}
                onClick={() => {
                  closeParticipantRun();
                  closeFacilitatorConsole();
                  setActiveNav(item.id);
                }}
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
                ? 'Participant Mode'
                : facilitatorView
                  ? 'Facilitator Mode'
                  : participantWorkspace
                    ? 'Assigned Exercise Access'
                    : 'Active Scaffold'}
            </div>
            <h2>{headerCopy.title}</h2>
            <p>{headerCopy.description}</p>
          </div>
          <div className="meta">
            <label className="persona-select">
              <span className="summary-label">Preview user</span>
              <select value={currentUser.id} onChange={(event) => void handleCurrentUserChange(event.target.value)}>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName} · {user.role}
                  </option>
                ))}
              </select>
            </label>
            <span className="chip">{currentUser.fullName}</span>
            <span className="chip muted">{currentUser.role}</span>
            <span className="chip">{payload?.appName ?? 'Altira Resilience'}</span>
            <span className="chip muted">{loading ? 'loading' : payload?.stage ?? 'scaffold'}</span>
            {busyLabel ? <span className="chip muted">{busyLabel}</span> : null}
          </div>
        </header>

        {error ? <section className="notice notice-error">{error}</section> : null}

        {!participantWorkspace ? (
          <section className="workflow-note">
            <strong>Bounded v1 rule:</strong> uploads must be reviewed before they influence structured context,
            and scoring logic, approval, launch control, participant evidence, and report outputs stay
            deterministic and operator-owned.
          </section>
        ) : null}

        {!participantWorkspace && !participantView && !facilitatorView ? <SummaryStrip cards={summaryCards} /> : null}

        {!participantView && !facilitatorView && participantWorkspace ? (
          <ParticipantHomePanel
            currentUser={currentUser}
            launches={launches}
            participantAssignments={participantAssignments}
            onOpenParticipantRun={(runId) => void openParticipantRun(runId)}
          />
        ) : null}

        {!participantWorkspace && !participantView && !facilitatorView && isWorkflowNav(activeNav) ? (
          <section className="stepper">
            {studioSteps.map((step, index) => (
              <button
                key={step}
                type="button"
                className={step === activeWorkflowStep ? 'step active' : 'step'}
                onClick={() => jumpToWorkflowStep(step, setActiveNav, setActiveStudioStep)}
              >
                <span className="step-index">0{index + 1}</span>
                <span>{stepTitles[step]}</span>
              </button>
            ))}
          </section>
        ) : null}

        {participantView && activeParticipantRun ? (
          <ParticipantExercisePanel
            run={activeParticipantRun}
            form={participantResponseForm}
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
          <HomePanel launches={launches} reports={reports} scenarioDrafts={scenarioDrafts} />
        ) : null}

        {!participantWorkspace && !participantView && !facilitatorView && activeNav === 'source-library' ? (
          <SourceLibraryPanel
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
          />
        ) : null}

        {!participantWorkspace && !participantView && !facilitatorView && activeNav === 'org-context' ? (
          <OrgContextPanel
            buckets={contextBuckets}
            form={contextForm}
            onFormChange={setContextForm}
            onSubmit={handleCreateContextItem}
            onItemPatch={handleContextItemPatch}
          />
        ) : null}

        {!participantWorkspace && !participantView && !facilitatorView && activeNav === 'scenario-studio' && activeStudioStep === 'templates' ? (
          <TemplatePanel
            templates={templates}
            selectedTemplate={selectedTemplate}
            onSelect={setSelectedTemplate}
            onContinue={() => startNewDraftFromTemplate(selectedScenarioTemplate)}
          />
        ) : null}

        {!participantWorkspace && !participantView && !facilitatorView && activeNav === 'scenario-studio' && activeStudioStep === 'configuration' ? (
          <ConfigurationPanel
            selectedTemplate={selectedScenarioTemplate}
            scenarioDrafts={scenarioDrafts}
            activeDraftId={activeDraftId}
            form={draftForm}
            onFormChange={setDraftForm}
            onBack={() => setActiveStudioStep('templates')}
            onSaveDraft={handleDraftSave}
            onLoadDraft={loadSavedDraft}
            onStartNewDraft={() => startNewDraftFromTemplate(selectedScenarioTemplate)}
          />
        ) : null}

        {!participantWorkspace && !participantView && !facilitatorView && activeNav === 'roster' ? (
          <RosterPanel
            rosterMembers={rosterMembers}
            selectedRosterMemberId={selectedRosterMemberId}
            form={rosterForm}
            onFormChange={setRosterForm}
            onSelectMember={loadRosterMember}
            onSubmit={handleSaveRosterMember}
            onReset={resetRosterForm}
          />
        ) : null}

        {!participantWorkspace && !participantView && !facilitatorView && activeNav === 'launches' ? (
          <LaunchesPanel
            launches={launches}
            approvedDrafts={approvedDrafts}
            rosterMembers={rosterMembers}
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
            onCreateParticipantRun={handleCreateParticipantRun}
            onOpenParticipantRun={(runId) => void openParticipantRun(runId)}
            onOpenFacilitatorConsole={openFacilitatorConsole}
          />
        ) : null}

        {!participantWorkspace && !participantView && !facilitatorView && activeNav === 'reports' ? (
          <ReportsPanel
            reports={reports}
            selectedReportId={selectedReportId}
            onSelectReport={(launchId) => void handleSelectReport(launchId)}
            activeReportDetail={activeReportDetail}
            exportBusy={Boolean(busyLabel)}
            onExportReport={(launchId, format) => void handleExportReport(launchId, format)}
          />
        ) : null}

        {!participantWorkspace && !participantView && !facilitatorView && activeNav === 'settings' ? <SettingsPanel /> : null}
      </main>
    </div>
  );
}

function isWorkflowNav(nav: AdminNavId): boolean {
  return nav === 'source-library' || nav === 'org-context' || nav === 'scenario-studio';
}

function getWorkflowStep(nav: AdminNavId, studioStep: StudioStep): StudioStep {
  if (nav === 'source-library') return 'source-library';
  if (nav === 'org-context') return 'org-context';
  return studioStep;
}

function jumpToWorkflowStep(
  step: StudioStep,
  setActiveNav: (value: AdminNavId) => void,
  setActiveStudioStep: (value: StudioStep) => void,
) {
  if (step === 'source-library') {
    setActiveNav('source-library');
    return;
  }

  if (step === 'org-context') {
    setActiveNav('org-context');
    return;
  }

  setActiveNav('scenario-studio');
  setActiveStudioStep(step);
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

function HomePanel({
  launches,
  reports,
  scenarioDrafts,
}: {
  launches: LaunchSummary[];
  reports: ReportSummary[];
  scenarioDrafts: ScenarioDraft[];
}) {
  const reviewCount = scenarioDrafts.filter((draft) => draft.approvalStatus === 'ready_for_review').length;
  const approvedDraftCount = scenarioDrafts.filter((draft) => draft.approvalStatus === 'approved').length;

  return (
    <section className="stack">
      <div className="panel-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>What this slice proves</h3>
              <p>The product now includes real source ingestion review, not just source metadata placeholders.</p>
            </div>
          </div>
          <ul className="muted-list">
            <li>Text-based continuity, cyber, vendor, and policy files can now be uploaded into the product.</li>
            <li>Uploaded materials generate reviewable teams, vendors, and escalation-role suggestions before they affect context.</li>
            <li>Launch control, participant delivery, and report detail continue to work on top of the same bounded object model.</li>
          </ul>
        </div>

        <div className="panel side-panel">
          <h3>Current posture</h3>
          <ul className="muted-list">
            <li>{reviewCount} draft{reviewCount === 1 ? '' : 's'} still need operator review before launch.</li>
            <li>{approvedDraftCount} approved draft{approvedDraftCount === 1 ? '' : 's'} are eligible for launch creation.</li>
            <li>Unsupported or image-heavy files now have a queue-backed follow-up path instead of staying stranded in a raw pending state.</li>
          </ul>
        </div>
      </div>

      <div className="panel-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Open launches</h3>
              <p>Launches remain visible as scheduled operational work with participant completion attached to them.</p>
            </div>
          </div>
          <LaunchTable launches={launches} />
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Recent reports</h3>
              <p>Reports still reflect participant evidence and deterministic checkpoints from real launch data.</p>
            </div>
          </div>
          <ReportTable reports={reports} />
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
            <p>Your role can only access runs assigned to you. Admin workflows and reporting stay separated.</p>
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
        <h3>Access boundary</h3>
        <ul className="muted-list">
          <li>You can only open runs assigned to your linked roster identity.</li>
          <li>Scenario authoring, launch administration, and reporting stay on the operator side of the product.</li>
          <li>Your submitted answers still write into the same deterministic evidence record used by managers and audit reviewers.</li>
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
              <h3>Source library</h3>
              <p>Stored uploads now show extraction state and reviewable suggestion counts per document.</p>
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
              <p>Apply or dismiss extracted suggestions before they become part of the structured organization context.</p>
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
        <h4>Current upload limits</h4>
        <ul className="muted-list">
          <li>Supports text, markdown, csv, json, pdf, docx, xlsx, pptx, and common image files.</li>
          <li>Files must be under 5 MB in this pass.</li>
          <li>PDF, Office, and other binary files require an R2 bucket in this environment.</li>
          <li>PDF, DOCX, XLSX, and PPTX now extract text when possible. Legacy .doc, .xls, and .ppt stay stored but unparsed unless a later queue fallback can help.</li>
          <li>When usable text is still missing, R2-backed files can queue a background AI extraction or OCR follow-up.</li>
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
          <span className="summary-label">Storage backend</span>
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
        <span className="summary-label">Extracted text artifact</span>
        <ExtractionProvenancePanel
          provenance={document.extractionProvenance}
          emptyMessage="No extracted-text artifact has been recorded for this document yet."
        />
        <p className="detail-footnote">
          The original file, extracted text, review suggestions, and approved context stay separate so extraction can be
          rerun without silently changing approved records.
        </p>
      </div>

      <ExtractionJobCard job={document.latestExtractionJob} />

      <div className="detail-card">
        <span className="summary-label">Stored object</span>
        <p>{document.storageObjectKey ?? 'Inline source storage (no R2 object key recorded).'}</p>
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
            <p>Review state and required flags now save against real context records.</p>
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
  rosterMembers,
  selectedRosterMemberId,
  form,
  onFormChange,
  onSelectMember,
  onSubmit,
  onReset,
}: {
  rosterMembers: RosterMember[];
  selectedRosterMemberId: string | null;
  form: RosterMemberInput;
  onFormChange: Dispatch<SetStateAction<RosterMemberInput>>;
  onSelectMember: (member: RosterMember | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onReset: () => void;
}) {
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
                    <button type="button" className="button-secondary table-button" onClick={() => onSelectMember(member)}>
                      Edit
                    </button>
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
            <h3>{selectedRosterMemberId ? 'Edit roster member' : 'Add roster member'}</h3>
            <p>
              Keep the directory lean and operational. This is the assignment source for launches, not a general HR system.
            </p>
          </div>
          {selectedRosterMemberId ? (
            <button type="button" className="button-secondary" onClick={onReset}>
              New entry
            </button>
          ) : null}
        </div>
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
          <p>Template-first authoring keeps v1 guided and reviewable.</p>
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
  onFormChange,
  onBack,
  onSaveDraft,
  onLoadDraft,
  onStartNewDraft,
}: {
  selectedTemplate: ScenarioTemplate;
  scenarioDrafts: ScenarioDraft[];
  activeDraftId: string | null;
  form: ScenarioDraftInput;
  onFormChange: Dispatch<SetStateAction<ScenarioDraftInput>>;
  onBack: () => void;
  onSaveDraft: (nextStatus?: ScenarioApprovalStatus) => Promise<void>;
  onLoadDraft: (draft: ScenarioDraft) => void;
  onStartNewDraft: () => void;
}) {
  return (
    <section className="panel-grid">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Scenario configuration</h3>
            <p>{activeDraftId ? 'Editing saved draft' : 'Create a new saved draft from the selected template.'}</p>
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
        </div>
        <div className="button-row">
          <button type="button" className="button-secondary" onClick={() => void onSaveDraft('draft')}>
            Save draft
          </button>
          <button type="button" className="button-secondary" onClick={() => void onSaveDraft('ready_for_review')}>
            Submit for review
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
                <span>{draft.approvalStatus.replace(/_/g, ' ')}</span>
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
  onCreateParticipantRun,
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
  onCreateParticipantRun: (event: FormEvent<HTMLFormElement>) => Promise<void>;
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
              <p>Approved drafts are now promoted into explicit launches with real participant progress behind them.</p>
            </div>
          </div>
          <LaunchTable launches={launches} activeId={selectedLaunchId} onSelect={onSelectLaunch} />
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Launch detail</h3>
              <p>Participant assignment and scenario brief review happen at the launch level, not inside the template picker.</p>
            </div>
          </div>
          {activeLaunchDetail ? (
            <LaunchDetailPanel
              launch={activeLaunchDetail}
              rosterMembers={rosterMembers}
              currentUser={currentUser}
              participantAssignmentForm={participantAssignmentForm}
              onParticipantAssignmentFormChange={onParticipantAssignmentFormChange}
              onCreateParticipantRun={onCreateParticipantRun}
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
          <div className="empty-state">Only admins can create launches in this slice.</div>
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
        <h4>What is fixed at launch time</h4>
        <ul className="muted-list">
          <li>Scenario brief and learning objectives are copied from the approved draft.</li>
          <li>Participant runs attach to the launch, not to the scenario template.</li>
          <li>Report evidence is generated from participant submissions against deterministic checkpoints.</li>
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
  onCreateParticipantRun,
  onOpenParticipantRun,
  onOpenFacilitatorConsole,
}: {
  launch: LaunchDetail;
  rosterMembers: RosterMember[];
  currentUser: WorkspaceUser;
  participantAssignmentForm: ParticipantRunInput;
  onParticipantAssignmentFormChange: Dispatch<SetStateAction<ParticipantRunInput>>;
  onCreateParticipantRun: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onOpenParticipantRun: (runId: string) => void;
  onOpenFacilitatorConsole: (launchId: string) => void;
}) {
  const selectedRosterMember =
    rosterMembers.find((member) => member.id === participantAssignmentForm.rosterMemberId) ?? null;
  const canManageAssignments = currentUser.role === 'admin';
  const canUseFacilitatorConsole = currentUser.role === 'admin' || currentUser.role === 'facilitator';

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
                  : 'Each participant run opens the same bounded exercise surface and produces its own evidence record.'}
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
          <h4>{launch.mode === 'tabletop' ? 'Add leader seat' : 'Add participant'}</h4>
          {canManageAssignments ? (
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
          ) : (
            <div className="empty-state">Only admins can create or reassign participant runs in this slice.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportsPanel({
  reports,
  selectedReportId,
  onSelectReport,
  activeReportDetail,
  exportBusy,
  onExportReport,
}: {
  reports: ReportSummary[];
  selectedReportId: string | null;
  onSelectReport: (launchId: string) => void;
  activeReportDetail: ReportDetail | null;
  exportBusy: boolean;
  onExportReport: (launchId: string, format: ReportExportFormat) => void;
}) {
  return (
    <section className="panel-grid">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Exercise reports</h3>
            <p>Report summaries now represent real participant completion, score, and evidence status.</p>
          </div>
        </div>
        <ReportTable reports={reports} activeId={selectedReportId} onSelect={onSelectReport} />
      </div>

      <div className="panel side-panel">
        <h3>Report detail</h3>
        {activeReportDetail ? (
          <ReportDetailPanel report={activeReportDetail} exportBusy={exportBusy} onExportReport={onExportReport} />
        ) : (
          <div className="empty-state">Select a report to review the latest evidence and participant findings.</div>
        )}
      </div>
    </section>
  );
}

function ReportDetailPanel({
  report,
  exportBusy,
  onExportReport,
}: {
  report: ReportDetail;
  exportBusy: boolean;
  onExportReport: (launchId: string, format: ReportExportFormat) => void;
}) {
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
                <p>Tabletop launches stay facilitator-owned. Participant runs inform the roster, not the live session state.</p>
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
                <p>Each phase stays bounded around a specific facilitator job instead of freeform branching.</p>
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
              <li>Facilitator notes stay separate from deterministic participant scores.</li>
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
  onFormChange,
  onBack,
  onSaveProgress,
  onSubmitResponse,
}: {
  run: ParticipantRunDetail;
  form: ParticipantResponseForm;
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
                <h3>Action worksheet</h3>
                <p>Answer the required exercise fields directly from the firm&apos;s procedure, not from memory.</p>
              </div>
            </div>
            <div className="participant-callout">
              Deterministic scoring only checks the four required exercise fields. After-action notes remain narrative evidence.
            </div>
            <div className="response-grid">
              <label className="full-width">
                First action
                <textarea
                  value={form.firstAction}
                  onChange={(event) => onFormChange((current) => ({ ...current, firstAction: event.target.value }))}
                  placeholder="State the first required action under the controlling procedure."
                />
              </label>
              <label>
                Escalation owner
                <input
                  value={form.escalationChoice}
                  onChange={(event) => onFormChange((current) => ({ ...current, escalationChoice: event.target.value }))}
                  placeholder="Incident Commander"
                />
              </label>
              <label>
                Impact assessment
                <input
                  value={form.impactAssessment}
                  onChange={(event) => onFormChange((current) => ({ ...current, impactAssessment: event.target.value }))}
                  placeholder="Who is impacted first?"
                />
              </label>
              <label className="full-width">
                After-action note
                <textarea
                  value={form.notes}
                  onChange={(event) => onFormChange((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Record anything unclear, missing, or slow in the current policy path."
                />
              </label>
              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={form.policyAcknowledged}
                  onChange={(event) =>
                    onFormChange((current) => ({ ...current, policyAcknowledged: event.target.checked }))
                  }
                />
                I used the controlling policy or playbook to answer this exercise.
              </label>
            </div>

            <div className="button-row">
              <button type="button" className="button-secondary" onClick={onSaveProgress}>
                Save progress
              </button>
              <button type="button" className="button-primary" onClick={onSubmitResponse}>
                Submit response
              </button>
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="panel participant-side-panel">
            <div className="panel-header">
              <div>
                <h3>Exercise brief</h3>
                <p>Keep the bounded prompt, timing, and policy context visible while responding.</p>
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
                <h3>Deterministic checkpoints</h3>
                <p>The score is not model-owned. It only reflects completion of the required response fields.</p>
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
              <li>After-action notes are kept separate from the deterministic checkpoint score.</li>
              <li>This is intentionally bounded. There is no open-ended simulation branch in v1.</li>
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
            <h3>Product guardrails</h3>
            <p>The admin product should stay explicit about what the model can influence and what it cannot.</p>
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
        <h3>Architecture chosen</h3>
        <ul className="muted-list">
          <li>React + Vite web app</li>
          <li>Cloudflare Worker API with D1-backed persistence</li>
          <li>Shared TypeScript contracts package</li>
          <li>D1 stores structured app data and source metadata</li>
          <li>R2-backed source upload is now supported when the bucket binding is configured</li>
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

function stripFileExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '');
}

function formatBucketLabel(bucketId: string): string {
  if (bucketId === 'teams') return 'Teams';
  if (bucketId === 'vendors') return 'Vendors';
  if (bucketId === 'escalation') return 'Escalation Roles';
  return bucketId;
}

function formatStorageBackendLabel(storageBackend: 'inline' | 'r2'): string {
  return storageBackend === 'r2' ? 'R2 object storage' : 'Inline app storage';
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
