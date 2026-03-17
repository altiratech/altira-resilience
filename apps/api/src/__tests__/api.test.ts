import { describe, expect, it, vi } from 'vitest';
import type {
  AuditEvent,
  BootstrapPayload,
  ContextItem,
  DocumentSummary,
  Launch,
  ParticipantRun,
  ReportDetail,
  ReportEvidencePackage,
  RosterMember,
  ScenarioDraft,
  SourceDocumentDetail,
  SourceExtractionSuggestion,
  WorkspaceInvite,
  WorkspaceUser,
} from '@resilience/shared';
import { createApp } from '../app';
import { MemoryResilienceStore } from '../store';

const adminHeaders = { 'X-Resilience-User-Id': 'user_dana_admin' };
const adminJsonHeaders = {
  'Content-Type': 'application/json',
  'X-Resilience-User-Id': 'user_dana_admin',
};
const managerHeaders = { 'X-Resilience-User-Id': 'user_kim_manager' };
const managerJsonHeaders = {
  'Content-Type': 'application/json',
  'X-Resilience-User-Id': 'user_kim_manager',
};

describe('Altira Resilience API', () => {
  it('requires sign-in for bootstrap when no session or debug override is present', async () => {
    const app = createApp(new MemoryResilienceStore());
    const response = await app.request('/api/v1/bootstrap', {}, { APP_STAGE: 'production' } as never);
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(payload.error).toContain('Sign in');
  });

  it('creates and reports a workspace email session', async () => {
    const app = createApp(new MemoryResilienceStore());

    const signInResponse = await app.request('/api/v1/auth/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dana.smith@altira-demo.local' }),
    });
    const signInPayload = (await signInResponse.json()) as { authenticated: boolean; currentUser: WorkspaceUser | null };

    expect(signInResponse.status).toBe(201);
    expect(signInPayload.authenticated).toBe(true);
    expect(signInPayload.currentUser?.role).toBe('admin');
    expect(signInResponse.headers.get('set-cookie')).toContain('altira_resilience_session=');

    const cookie = signInResponse.headers.get('set-cookie');
    const sessionResponse = await app.request('/api/v1/auth/session', {
      headers: cookie ? { Cookie: cookie } : undefined,
    });
    const sessionPayload = (await sessionResponse.json()) as { authenticated: boolean; currentUser: WorkspaceUser | null };

    expect(sessionResponse.status).toBe(200);
    expect(sessionPayload.authenticated).toBe(true);
    expect(sessionPayload.currentUser?.email).toBe('dana.smith@altira-demo.local');
  });

  it('requires a pending invite to be activated through a magic link instead of plain email sign-in', async () => {
    const app = createApp(new MemoryResilienceStore());

    const inviteResponse = await app.request('/api/v1/workspace-invites', {
      method: 'POST',
      headers: adminJsonHeaders,
      body: JSON.stringify({
        email: 'new.ops.lead@altira-demo.local',
        fullName: 'New Ops Lead',
        role: 'manager',
        capabilities: ['resilience_tabletop_facilitate'],
        scopeTeams: ['Operations'],
        rosterMemberId: null,
      }),
    });
    const invitePayload = (await inviteResponse.json()) as { workspaceInvite: WorkspaceInvite };

    expect(inviteResponse.status).toBe(201);
    expect(invitePayload.workspaceInvite.status).toBe('pending');

    const signInResponse = await app.request('/api/v1/auth/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'new.ops.lead@altira-demo.local' }),
    });
    const signInPayload = (await signInResponse.json()) as { error: string };

    expect(signInResponse.status).toBe(401);
    expect(signInPayload.error).toContain('magic link');

    const sendLinkResponse = await app.request(`/api/v1/workspace-invites/${invitePayload.workspaceInvite.id}/send`, {
      method: 'POST',
      headers: adminHeaders,
    });
    const sendLinkPayload = (await sendLinkResponse.json()) as {
      workspaceInvite: WorkspaceInvite;
      magicLinkPath: string;
      expiresAt: string;
      deliveryMode: 'manual_copy';
    };

    expect(sendLinkResponse.status).toBe(201);
    expect(sendLinkPayload.workspaceInvite.magicLinkSentAt).not.toBeNull();
    expect(sendLinkPayload.deliveryMode).toBe('manual_copy');

    const magicLinkUrl = new URL(`http://localhost${sendLinkPayload.magicLinkPath}`);
    const token = magicLinkUrl.searchParams.get('magic_link_token');

    expect(token).toBeTruthy();

    const consumeResponse = await app.request('/api/v1/auth/magic-link/consume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const consumePayload = (await consumeResponse.json()) as { authenticated: boolean; currentUser: WorkspaceUser | null };

    expect(consumeResponse.status).toBe(201);
    expect(consumePayload.authenticated).toBe(true);
    expect(consumePayload.currentUser?.email).toBe('new.ops.lead@altira-demo.local');
    expect(consumePayload.currentUser?.role).toBe('manager');
    expect(consumePayload.currentUser?.capabilities).toEqual(['resilience_tabletop_facilitate']);
    expect(consumePayload.currentUser?.scopeTeams).toEqual(['Operations']);
  });

  it('returns seeded bootstrap data with launches, reports, and stored source documents', async () => {
    const app = createApp(new MemoryResilienceStore());
    const response = await app.request('/api/v1/bootstrap', { headers: adminHeaders });
    const payload = (await response.json()) as BootstrapPayload;

    expect(response.status).toBe(200);
    expect(payload.currentUser.role).toBe('admin');
    expect(payload.nav.map((item) => item.label)).toEqual([
      'Overview',
      'Exercises',
      'Evidence',
      'People',
      'Materials',
      'Settings',
    ]);
    expect(payload.overview.programHealth.length).toBeGreaterThan(0);
    expect(payload.overview.pendingApprovals.length).toBeGreaterThan(0);
    expect(payload.availableUsers.length).toBeGreaterThan(0);
    expect(payload.auditEvents.length).toBeGreaterThan(0);
    expect(payload.availableUsers.find((user) => user.id === 'user_morgan_facilitator')?.capabilities).toEqual([
      'resilience_tabletop_facilitate',
    ]);
    expect(payload.workspaceInvites.length).toBeGreaterThan(0);
    expect(payload.sourceLibrary.length).toBeGreaterThan(0);
    expect(payload.sourceLibrary.some((document) => document.storageStatus === 'stored')).toBe(true);
    expect(payload.organizationContext.length).toBeGreaterThan(0);
    expect(payload.scenarioDrafts.length).toBeGreaterThan(0);
    expect(payload.rosterMembers.length).toBeGreaterThan(0);
    expect(payload.participantAssignments.length).toBeGreaterThan(0);
    expect(payload.launches.length).toBeGreaterThan(0);
    expect(payload.reports.length).toBeGreaterThan(0);
  });

  it('filters validation and smoke-test source records from scaffold bootstrap payloads', async () => {
    const documents: DocumentSummary[] = [
      {
        id: 'doc_customer_continuity',
        name: 'Business Continuity Plan',
        type: 'Continuity Plan',
        businessUnit: 'Operations',
        owner: 'Dana Smith',
        effectiveDate: '2026-03-01',
        parseStatus: 'needs_review',
        storageStatus: 'stored',
        storageBackend: 'inline',
        uploadedFileName: 'business-continuity-plan.md',
        byteSize: 420,
        extractionStatus: 'ready_for_review',
        pendingSuggestionCount: 2,
        updatedAt: '2026-03-01T10:00:00.000Z',
      },
      {
        id: 'doc_validation_noise',
        name: 'Resume Scanned Validation',
        type: 'Continuity Plan',
        businessUnit: 'Operations',
        owner: 'Codex Validation',
        effectiveDate: '2026-03-13',
        parseStatus: 'needs_review',
        storageStatus: 'stored',
        storageBackend: 'r2',
        uploadedFileName: 'resume-scanned.pdf',
        byteSize: 143161,
        extractionStatus: 'ready_for_review',
        pendingSuggestionCount: 7,
        updatedAt: '2026-03-13T15:19:06.337Z',
      },
    ];

    const app = createApp(new MemoryResilienceStore({ documents, scenarioDrafts: [] }));
    const response = await app.request('/api/v1/bootstrap', { headers: adminHeaders });
    const payload = (await response.json()) as BootstrapPayload;

    expect(response.status).toBe(200);
    expect(payload.sourceLibrary.map((document) => document.name)).toEqual(['Business Continuity Plan']);
    expect(payload.overview.pendingApprovals.map((item) => item.title)).toEqual(['Business Continuity Plan']);
  });

  it('requires reviewer notes before a draft can be sent back with changes requested', async () => {
    const app = createApp(new MemoryResilienceStore());

    const response = await app.request('/api/v1/scenario-drafts/draft_vendor_tabletop', {
      method: 'PATCH',
      headers: adminJsonHeaders,
      body: JSON.stringify({ approvalStatus: 'changes_requested', reviewerNotes: '   ' }),
    });
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(payload.error).toContain('reviewer notes');
  });

  it('records draft review metadata, audit activity, and overview blocking when changes are requested', async () => {
    const app = createApp(new MemoryResilienceStore());

    const reviewResponse = await app.request('/api/v1/scenario-drafts/draft_vendor_tabletop', {
      method: 'PATCH',
      headers: adminJsonHeaders,
      body: JSON.stringify({
        approvalStatus: 'changes_requested',
        reviewerNotes: 'Add the first 30 minute communications owner handoff before launch.',
      }),
    });
    const reviewPayload = (await reviewResponse.json()) as { draft: ScenarioDraft };

    expect(reviewResponse.status).toBe(200);
    expect(reviewPayload.draft.approvalStatus).toBe('changes_requested');
    expect(reviewPayload.draft.reviewerNotes).toContain('communications owner handoff');
    expect(reviewPayload.draft.reviewedByName).toBe('Dana Smith');
    expect(reviewPayload.draft.reviewedAt).toBeTruthy();

    const bootstrapResponse = await app.request('/api/v1/bootstrap', { headers: adminHeaders });
    const bootstrapPayload = (await bootstrapResponse.json()) as BootstrapPayload;

    expect(bootstrapResponse.status).toBe(200);
    expect(bootstrapPayload.overview.pendingApprovals.some((item) => item.title === 'Core Vendor Outage Tabletop')).toBe(true);
    expect(
      bootstrapPayload.overview.pendingApprovals.find((item) => item.title === 'Core Vendor Outage Tabletop')?.statusLabel,
    ).toBe('Changes requested');
    expect(bootstrapPayload.auditEvents[0]?.action).toBe('scenario_draft_changes_requested');
  });

  it('limits participant bootstrap access to their own assignments', async () => {
    const app = createApp(new MemoryResilienceStore());
    const response = await app.request('/api/v1/bootstrap', {
      headers: { 'X-Resilience-User-Id': 'user_jordan_participant' },
    });
    const payload = (await response.json()) as BootstrapPayload;

    expect(response.status).toBe(200);
    expect(payload.currentUser.role).toBe('user');
    expect(payload.currentUser.capabilities).toEqual([]);
    expect(payload.nav.map((item) => item.id)).toEqual(['home']);
    expect(payload.nav.map((item) => item.label)).toEqual(['Overview']);
    expect(payload.sourceLibrary).toHaveLength(0);
    expect(payload.reports).toHaveLength(0);
    expect(payload.auditEvents).toHaveLength(0);
    expect(payload.overview.programHealth).toHaveLength(0);
    expect(payload.participantAssignments).toHaveLength(1);
    expect(payload.participantAssignments[0]?.rosterMemberId).toBe('roster_jordan_lee');
  });

  it('limits managers to scoped teams while allowing team-based assignment inside that scope', async () => {
    const app = createApp(new MemoryResilienceStore());

    const bootstrapResponse = await app.request('/api/v1/bootstrap', {
      headers: managerHeaders,
    });
    const bootstrapPayload = (await bootstrapResponse.json()) as BootstrapPayload;

    expect(bootstrapResponse.status).toBe(200);
    expect(bootstrapPayload.currentUser.role).toBe('manager');
    expect(bootstrapPayload.currentUser.scopeTeams).toEqual(['Operations']);
    expect(bootstrapPayload.nav.map((item) => item.id)).toEqual(['home', 'launches', 'reports', 'roster']);
    expect(bootstrapPayload.rosterMembers.map((member) => member.team)).toEqual(['Operations']);
    expect(bootstrapPayload.availableUsers.map((user) => user.id)).toEqual(['user_kim_manager']);
    expect(bootstrapPayload.reports.map((report) => report.id)).toEqual(['launch_q2_cyber_wave1']);

    const forbiddenRunResponse = await app.request('/api/v1/participant-runs/run_vendor_exec_coo', {
      headers: managerHeaders,
    });
    expect(forbiddenRunResponse.status).toBe(403);

    const allowedRunResponse = await app.request('/api/v1/participant-runs/run_kim_ops', {
      headers: managerHeaders,
    });
    expect(allowedRunResponse.status).toBe(200);

    const outOfScopeAssignResponse = await app.request('/api/v1/participant-runs/team-assignments', {
      method: 'POST',
      headers: managerJsonHeaders,
      body: JSON.stringify({
        launchId: 'launch_vendor_tabletop_exec',
        team: 'Security',
        dueAt: '2026-03-27',
      }),
    });
    expect(outOfScopeAssignResponse.status).toBe(403);

    const scopedAssignResponse = await app.request('/api/v1/participant-runs/team-assignments', {
      method: 'POST',
      headers: managerJsonHeaders,
      body: JSON.stringify({
        launchId: 'launch_vendor_tabletop_exec',
        team: 'Operations',
        dueAt: '2026-03-27',
      }),
    });
    const scopedAssignPayload = (await scopedAssignResponse.json()) as {
      createdRuns: ParticipantRun[];
      skippedExistingCount: number;
    };

    expect(scopedAssignResponse.status).toBe(201);
    expect(scopedAssignPayload.createdRuns).toHaveLength(1);
    expect(scopedAssignPayload.createdRuns[0]?.participantTeam).toBe('Operations');
    expect(scopedAssignPayload.skippedExistingCount).toBe(0);

    const reportResponse = await app.request('/api/v1/reports/launch_vendor_tabletop_exec', {
      headers: managerHeaders,
    });
    const reportPayload = (await reportResponse.json()) as { report: ReportDetail };

    expect(reportResponse.status).toBe(200);
    expect(reportPayload.report.participantRuns).toHaveLength(1);
    expect(reportPayload.report.participantRuns[0]?.participantTeam).toBe('Operations');
  });

  it('keeps report closeout admin-only', async () => {
    const app = createApp(new MemoryResilienceStore());

    const response = await app.request('/api/v1/reports/launch_q2_cyber_wave1/review', {
      method: 'PATCH',
      headers: managerJsonHeaders,
      body: JSON.stringify({
        closeoutNotes: 'Manager should not be able to close the package.',
        followUpText: 'Confirm ownership',
        markClosed: true,
      }),
    });
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(403);
    expect(payload.error).toContain('role');
  });

  it('blocks user access to admin-only workflows but allows their own run updates', async () => {
    const app = createApp(new MemoryResilienceStore());

    const sourceResponse = await app.request('/api/v1/source-documents', {
      headers: { 'X-Resilience-User-Id': 'user_jordan_participant' },
    });
    const sourcePayload = (await sourceResponse.json()) as { error: string };

    expect(sourceResponse.status).toBe(403);
    expect(sourcePayload.error).toContain('role');

    const updateRunResponse = await app.request('/api/v1/participant-runs/run_jordan_compliance', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Resilience-User-Id': 'user_jordan_participant',
      },
      body: JSON.stringify({
        firstAction: 'Escalate to the incident commander and log the outage scope.',
      }),
    });
    const updateRunPayload = (await updateRunResponse.json()) as { run: ParticipantRun };

    expect(updateRunResponse.status).toBe(200);
    expect(updateRunPayload.run.firstAction).toContain('incident commander');

    const forbiddenRunResponse = await app.request('/api/v1/participant-runs/run_kim_ops', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Resilience-User-Id': 'user_jordan_participant',
      },
      body: JSON.stringify({
        notes: 'Attempting to edit another participant run.',
      }),
    });

    expect(forbiddenRunResponse.status).toBe(403);
  });

  it('allows manager tabletop facilitation only when the capability is present', async () => {
    const app = createApp(new MemoryResilienceStore());

    const facilitatorResponse = await app.request('/api/v1/launches/launch_vendor_tabletop_exec', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Resilience-User-Id': 'user_morgan_facilitator',
      },
      body: JSON.stringify({
        tabletopPhase: 'injects',
        facilitatorNotes: 'Drive communications ownership before moving to the next inject.',
      }),
    });
    const facilitatorPayload = (await facilitatorResponse.json()) as { launch: Launch };

    expect(facilitatorResponse.status).toBe(200);
    expect(facilitatorPayload.launch.tabletopPhase).toBe('injects');
    expect(
      facilitatorPayload.launch.id,
    ).toBe('launch_vendor_tabletop_exec');

    const managerResponse = await app.request('/api/v1/launches/launch_vendor_tabletop_exec', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Resilience-User-Id': 'user_kim_manager',
      },
      body: JSON.stringify({
        tabletopPhase: 'after_action',
      }),
    });

    expect(managerResponse.status).toBe(403);
  });

  it('creates roster members and snapshots them into participant assignments', async () => {
    const app = createApp(new MemoryResilienceStore());

    const createRosterResponse = await app.request('/api/v1/roster-members', {
      method: 'POST',
      headers: adminJsonHeaders,
      body: JSON.stringify({
        fullName: 'Avery Stone',
        email: 'avery.stone@firm.com',
        roleTitle: 'Business Continuity Lead',
        team: 'Resilience',
        managerName: 'Morgan Avery',
        status: 'active',
      }),
    });
    const createRosterPayload = (await createRosterResponse.json()) as { rosterMember: RosterMember };

    expect(createRosterResponse.status).toBe(201);
    expect(createRosterPayload.rosterMember.fullName).toBe('Avery Stone');

    const updateRosterResponse = await app.request(
      `/api/v1/roster-members/${createRosterPayload.rosterMember.id}`,
      {
        method: 'PATCH',
        headers: adminJsonHeaders,
        body: JSON.stringify({
          team: 'Enterprise Resilience',
        }),
      },
    );
    const updateRosterPayload = (await updateRosterResponse.json()) as { rosterMember: RosterMember };

    expect(updateRosterResponse.status).toBe(200);
    expect(updateRosterPayload.rosterMember.team).toBe('Enterprise Resilience');

    const assignResponse = await app.request('/api/v1/participant-runs', {
      method: 'POST',
      headers: adminJsonHeaders,
      body: JSON.stringify({
        launchId: 'launch_q2_cyber_wave1',
        rosterMemberId: createRosterPayload.rosterMember.id,
        dueAt: '2026-03-20',
      }),
    });
    const assignPayload = (await assignResponse.json()) as { run: ParticipantRun };

    expect(assignResponse.status).toBe(201);
    expect(assignPayload.run.rosterMemberId).toBe(createRosterPayload.rosterMember.id);
    expect(assignPayload.run.participantName).toBe('Avery Stone');
    expect(assignPayload.run.participantEmail).toBe('avery.stone@firm.com');
    expect(assignPayload.run.participantRole).toBe('Business Continuity Lead');
    expect(assignPayload.run.participantTeam).toBe('Enterprise Resilience');
  });

  it('creates and updates workspace users directly through the admin surface', async () => {
    const app = createApp(new MemoryResilienceStore());

    const createResponse = await app.request('/api/v1/workspace-users', {
      method: 'POST',
      headers: adminJsonHeaders,
      body: JSON.stringify({
        fullName: 'Alex Rivera',
        email: 'alex.rivera@altira-demo.local',
        role: 'user',
        capabilities: [],
        scopeTeams: [],
        rosterMemberId: null,
        status: 'active',
      }),
    });
    const createPayload = (await createResponse.json()) as { workspaceUser: WorkspaceUser };

    expect(createResponse.status).toBe(201);
    expect(createPayload.workspaceUser.email).toBe('alex.rivera@altira-demo.local');

    const updateResponse = await app.request(`/api/v1/workspace-users/${createPayload.workspaceUser.id}`, {
      method: 'PATCH',
      headers: adminJsonHeaders,
      body: JSON.stringify({
        role: 'manager',
        capabilities: ['resilience_tabletop_facilitate'],
        scopeTeams: ['Enterprise Resilience'],
      }),
    });
    const updatePayload = (await updateResponse.json()) as { workspaceUser: WorkspaceUser };

    expect(updateResponse.status).toBe(200);
    expect(updatePayload.workspaceUser.role).toBe('manager');
    expect(updatePayload.workspaceUser.capabilities).toEqual(['resilience_tabletop_facilitate']);
    expect(updatePayload.workspaceUser.scopeTeams).toEqual(['Enterprise Resilience']);
  });

  it('supports deactivating and reactivating a non-admin workspace user', async () => {
    const app = createApp(new MemoryResilienceStore());

    const createResponse = await app.request('/api/v1/workspace-users', {
      method: 'POST',
      headers: adminJsonHeaders,
      body: JSON.stringify({
        fullName: 'Taylor Brooks',
        email: 'taylor.brooks@altira-demo.local',
        role: 'user',
        capabilities: [],
        scopeTeams: [],
        rosterMemberId: null,
        status: 'active',
      }),
    });
    const createPayload = (await createResponse.json()) as { workspaceUser: WorkspaceUser };

    expect(createResponse.status).toBe(201);

    const deactivateResponse = await app.request(`/api/v1/workspace-users/${createPayload.workspaceUser.id}`, {
      method: 'PATCH',
      headers: adminJsonHeaders,
      body: JSON.stringify({ status: 'inactive' }),
    });
    const deactivatePayload = (await deactivateResponse.json()) as { workspaceUser: WorkspaceUser };

    expect(deactivateResponse.status).toBe(200);
    expect(deactivatePayload.workspaceUser.status).toBe('inactive');

    const reactivateResponse = await app.request(`/api/v1/workspace-users/${createPayload.workspaceUser.id}`, {
      method: 'PATCH',
      headers: adminJsonHeaders,
      body: JSON.stringify({ status: 'active' }),
    });
    const reactivatePayload = (await reactivateResponse.json()) as { workspaceUser: WorkspaceUser };

    expect(reactivateResponse.status).toBe(200);
    expect(reactivatePayload.workspaceUser.status).toBe('active');
  });

  it('prevents the current admin from removing the last active admin in the workspace', async () => {
    const app = createApp(new MemoryResilienceStore());

    const deactivateResponse = await app.request('/api/v1/workspace-users/user_dana_admin', {
      method: 'PATCH',
      headers: adminJsonHeaders,
      body: JSON.stringify({ status: 'inactive' }),
    });
    const deactivatePayload = (await deactivateResponse.json()) as { error: string };

    expect(deactivateResponse.status).toBe(400);
    expect(deactivatePayload.error).toContain('current session');

    const demoteResponse = await app.request('/api/v1/workspace-users/user_dana_admin', {
      method: 'PATCH',
      headers: adminJsonHeaders,
      body: JSON.stringify({ role: 'manager' }),
    });
    const demotePayload = (await demoteResponse.json()) as { error: string };

    expect(demoteResponse.status).toBe(400);
    expect(demotePayload.error).toContain('admin access');
  });

  it('allows revoked invites to be reopened when no user exists for that email', async () => {
    const app = createApp(new MemoryResilienceStore());

    const createResponse = await app.request('/api/v1/workspace-invites', {
      method: 'POST',
      headers: adminJsonHeaders,
      body: JSON.stringify({
        email: 'reopen.invite@altira-demo.local',
        fullName: 'Reopen Invite',
        role: 'manager',
        capabilities: [],
        scopeTeams: ['Operations'],
        rosterMemberId: null,
      }),
    });
    const createPayload = (await createResponse.json()) as { workspaceInvite: WorkspaceInvite };

    expect(createResponse.status).toBe(201);
    expect(createPayload.workspaceInvite.status).toBe('pending');

    const revokeResponse = await app.request(`/api/v1/workspace-invites/${createPayload.workspaceInvite.id}`, {
      method: 'PATCH',
      headers: adminJsonHeaders,
      body: JSON.stringify({ status: 'revoked' }),
    });
    const revokePayload = (await revokeResponse.json()) as { workspaceInvite: WorkspaceInvite };

    expect(revokeResponse.status).toBe(200);
    expect(revokePayload.workspaceInvite.status).toBe('revoked');

    const reopenResponse = await app.request(`/api/v1/workspace-invites/${createPayload.workspaceInvite.id}`, {
      method: 'PATCH',
      headers: adminJsonHeaders,
      body: JSON.stringify({ status: 'pending' }),
    });
    const reopenPayload = (await reopenResponse.json()) as { workspaceInvite: WorkspaceInvite };

    expect(reopenResponse.status).toBe(200);
    expect(reopenPayload.workspaceInvite.status).toBe('pending');
    expect(reopenPayload.workspaceInvite.email).toBe('reopen.invite@altira-demo.local');
  });

  it('records audit events for access changes and returns them to admins', async () => {
    const app = createApp(new MemoryResilienceStore());

    const createResponse = await app.request('/api/v1/workspace-users', {
      method: 'POST',
      headers: adminJsonHeaders,
      body: JSON.stringify({
        fullName: 'Audit Target',
        email: 'audit.target@altira-demo.local',
        role: 'user',
        capabilities: [],
        scopeTeams: [],
        rosterMemberId: null,
        status: 'active',
      }),
    });

    expect(createResponse.status).toBe(201);

    const auditResponse = await app.request('/api/v1/audit-events?limit=3', {
      headers: adminHeaders,
    });
    const auditPayload = (await auditResponse.json()) as { auditEvents: AuditEvent[] };

    expect(auditResponse.status).toBe(200);
    expect(auditPayload.auditEvents[0]?.action).toBe('workspace_user_created');
    expect(auditPayload.auditEvents[0]?.summary).toContain('Audit Target');

    const forbiddenResponse = await app.request('/api/v1/audit-events', {
      headers: managerHeaders,
    });

    expect(forbiddenResponse.status).toBe(403);
  });

  it('persists tabletop phase and facilitator notes on a launch', async () => {
    const app = createApp(new MemoryResilienceStore());
    const patchResponse = await app.request('/api/v1/launches/launch_vendor_tabletop_exec', {
      method: 'PATCH',
      headers: adminJsonHeaders,
      body: JSON.stringify({
        status: 'in_progress',
        tabletopPhase: 'injects',
        facilitatorNotes: 'Communications ownership remained unclear after the second inject.',
      }),
    });
    const patchPayload = (await patchResponse.json()) as { launch: Launch };

    expect(patchResponse.status).toBe(200);
    expect(patchPayload.launch.status).toBe('in_progress');
    expect(patchPayload.launch.tabletopPhase).toBe('injects');
    expect(patchPayload.launch.facilitatorNotes).toContain('Communications ownership');

    const detailResponse = await app.request('/api/v1/launches/launch_vendor_tabletop_exec', {
      headers: adminHeaders,
    });
    const detailPayload = (await detailResponse.json()) as { launch: Launch };

    expect(detailResponse.status).toBe(200);
    expect(detailPayload.launch.status).toBe('in_progress');
    expect(detailPayload.launch.tabletopPhase).toBe('injects');
    expect(detailPayload.launch.facilitatorNotes).toContain('Communications ownership');
  });

  it('uploads a source file and creates reviewable extraction suggestions', async () => {
    const app = createApp(new MemoryResilienceStore());
    const formData = new FormData();
    formData.set(
      'file',
      new File(
        [
          `Teams:
- Security
- Operations

Vendors:
- Okta
- Primary Custodian

Escalation Roles:
- Incident Commander`,
        ],
        'continuity-notes.md',
        { type: 'text/markdown' },
      ),
    );
    formData.set('name', 'Continuity Notes');
    formData.set('type', 'Continuity Plan');
    formData.set('businessUnit', 'Operations');
    formData.set('owner', 'Dana Smith');
    formData.set('effectiveDate', '2026-03-07');

    const uploadResponse = await app.request('/api/v1/source-documents/upload', {
      method: 'POST',
      headers: adminHeaders,
      body: formData,
    });
    const uploadPayload = (await uploadResponse.json()) as { document: SourceDocumentDetail };

    expect(uploadResponse.status).toBe(201);
    expect(uploadPayload.document.storageStatus).toBe('stored');
    expect(uploadPayload.document.extractionSuggestions.length).toBeGreaterThan(0);

    const suggestion = uploadPayload.document.extractionSuggestions[0];
    const applyResponse = await app.request(`/api/v1/source-suggestions/${suggestion.id}/apply`, {
      method: 'POST',
      headers: adminHeaders,
    });
    const applyPayload = (await applyResponse.json()) as { suggestion: SourceExtractionSuggestion; item: ContextItem | null };

    expect(applyResponse.status).toBe(200);
    expect(applyPayload.suggestion.status).toBe('applied');
    expect(applyPayload.item?.bucketId).toBe(suggestion.bucketId);
  });

  it('extracts reviewable text from supported PDF uploads stored in R2', async () => {
    const app = createApp(new MemoryResilienceStore());
    const fakeBucket = createFakeBucket();
    const formData = new FormData();
    formData.set(
      'file',
      new File(
        [toArrayBuffer(createPdfBuffer(['Teams: Security, Operations', 'Vendors: Okta', 'Escalation Roles: Incident Commander']))],
        'continuity-plan.pdf',
        {
          type: 'application/pdf',
        },
      ),
    );
    formData.set('name', 'Continuity Plan PDF');
    formData.set('type', 'Continuity Plan');
    formData.set('businessUnit', 'Operations');
    formData.set('owner', 'Dana Smith');
    formData.set('effectiveDate', '2026-03-08');

    const uploadResponse = await app.request(
      '/api/v1/source-documents/upload',
      {
        method: 'POST',
        headers: adminHeaders,
        body: formData,
      },
      { SOURCE_DOCUMENTS_BUCKET: fakeBucket } as never,
    );
    const uploadPayload = (await uploadResponse.json()) as { document: SourceDocumentDetail };

    expect(uploadResponse.status).toBe(201);
    expect(uploadPayload.document.storageBackend).toBe('r2');
    expect(uploadPayload.document.extractionStatus).toBe('ready_for_review');
    expect(uploadPayload.document.extractionSuggestions.length).toBeGreaterThan(0);
    expect(uploadPayload.document.extractionNote).toBeNull();
    expect(uploadPayload.document.extractionProvenance?.method).toBe('upload_native');
    expect(uploadPayload.document.extractionProvenance?.provider).toBe('native_parser');
    expect(fakeBucket.put).toHaveBeenCalledTimes(1);
  });

  it('rejects binary uploads when the R2 bucket is not configured', async () => {
    const app = createApp(new MemoryResilienceStore());
    const formData = new FormData();
    formData.set('file', new File([new Uint8Array([80, 75, 3, 4])], 'playbook.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
    formData.set('name', 'IR Playbook');
    formData.set('type', 'Incident Response');
    formData.set('businessUnit', 'Security');
    formData.set('owner', 'Alex Morgan');
    formData.set('effectiveDate', '2026-03-08');

    const uploadResponse = await app.request('/api/v1/source-documents/upload', {
      method: 'POST',
      headers: adminHeaders,
      body: formData,
    });
    const payload = (await uploadResponse.json()) as { error: string };

    expect(uploadResponse.status).toBe(400);
    expect(payload.error).toContain('Binary uploads require an R2 source-documents bucket');
  });

  it('keeps legacy Office uploads stored but clearly unparsed', async () => {
    const app = createApp(new MemoryResilienceStore());
    const fakeBucket = createFakeBucket();
    const formData = new FormData();
    formData.set(
      'file',
      new File([toArrayBuffer(new Uint8Array([208, 207, 17, 224]))], 'playbook.doc', {
        type: 'application/msword',
      }),
    );
    formData.set('name', 'Legacy Playbook');
    formData.set('type', 'Incident Response');
    formData.set('businessUnit', 'Security');
    formData.set('owner', 'Alex Morgan');
    formData.set('effectiveDate', '2026-03-08');

    const uploadResponse = await app.request(
      '/api/v1/source-documents/upload',
      {
        method: 'POST',
        headers: adminHeaders,
        body: formData,
      },
      { SOURCE_DOCUMENTS_BUCKET: fakeBucket } as never,
    );
    const payload = (await uploadResponse.json()) as { document: SourceDocumentDetail };

    expect(uploadResponse.status).toBe(201);
    expect(payload.document.storageBackend).toBe('r2');
    expect(payload.document.extractionStatus).toBe('not_started');
    expect(payload.document.extractionSuggestions).toHaveLength(0);
    expect(payload.document.extractionNote).toContain('Legacy Office binary files');
    expect(payload.document.extractionProvenance).toBeNull();
  });

  it('queues a background follow-up when binary upload still has no usable text', async () => {
    const app = createApp(new MemoryResilienceStore());
    const fakeBucket = createFakeBucket();
    const fakeQueue = createFakeQueue();
    const formData = new FormData();
    formData.set(
      'file',
      new File([toArrayBuffer(new Uint8Array([208, 207, 17, 224]))], 'legacy-playbook.doc', {
        type: 'application/msword',
      }),
    );
    formData.set('name', 'Queued Legacy Playbook');
    formData.set('type', 'Incident Response');
    formData.set('businessUnit', 'Security');
    formData.set('owner', 'Alex Morgan');
    formData.set('effectiveDate', '2026-03-08');

    const uploadResponse = await app.request(
      '/api/v1/source-documents/upload',
      {
        method: 'POST',
        headers: adminHeaders,
        body: formData,
      },
      { SOURCE_DOCUMENTS_BUCKET: fakeBucket, SOURCE_EXTRACTION_QUEUE: fakeQueue } as never,
    );
    const payload = (await uploadResponse.json()) as { document: SourceDocumentDetail };

    expect(uploadResponse.status).toBe(201);
    expect(payload.document.extractionStatus).toBe('queued');
    expect(payload.document.latestExtractionJob?.status).toBe('queued');
    expect(payload.document.latestExtractionJob?.attemptedProvenance).toBeNull();
    expect(fakeQueue.send).toHaveBeenCalledTimes(1);
  });

  it('accepts scanned image uploads and queues OCR follow-up when R2 and queue bindings exist', async () => {
    const app = createApp(new MemoryResilienceStore());
    const fakeBucket = createFakeBucket();
    const fakeQueue = createFakeQueue();
    const formData = new FormData();
    formData.set(
      'file',
      new File([toArrayBuffer(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]))], 'scanned-policy.png', {
        type: 'image/png',
      }),
    );
    formData.set('name', 'Scanned Policy Page');
    formData.set('type', 'Continuity Plan');
    formData.set('businessUnit', 'Operations');
    formData.set('owner', 'Dana Smith');
    formData.set('effectiveDate', '2026-03-08');

    const uploadResponse = await app.request(
      '/api/v1/source-documents/upload',
      {
        method: 'POST',
        headers: adminHeaders,
        body: formData,
      },
      { SOURCE_DOCUMENTS_BUCKET: fakeBucket, SOURCE_EXTRACTION_QUEUE: fakeQueue } as never,
    );
    const payload = (await uploadResponse.json()) as { document: SourceDocumentDetail };

    expect(uploadResponse.status).toBe(201);
    expect(payload.document.storageBackend).toBe('r2');
    expect(payload.document.extractionStatus).toBe('queued');
    expect(payload.document.extractionNote).toContain('background image OCR follow-up was queued');
    expect(payload.document.extractionProvenance).toBeNull();
    expect(fakeQueue.send).toHaveBeenCalledTimes(1);
  });

  it('uses inline AI extraction for scanned PDF uploads when AI is configured', async () => {
    const app = createApp(new MemoryResilienceStore());
    const fakeBucket = createFakeBucket();
    const fakeQueue = createFakeQueue();
    const formData = new FormData();
    formData.set(
      'file',
      new File([toArrayBuffer(createScannedPdfBuffer())], 'scanned-continuity-plan.pdf', {
        type: 'application/pdf',
      }),
    );
    formData.set('name', 'Scanned Continuity Plan');
    formData.set('type', 'Continuity Plan');
    formData.set('businessUnit', 'Operations');
    formData.set('owner', 'Dana Smith');
    formData.set('effectiveDate', '2026-03-13');

    const uploadResponse = await app.request(
      '/api/v1/source-documents/upload',
      {
        method: 'POST',
        headers: adminHeaders,
        body: formData,
      },
      {
        SOURCE_DOCUMENTS_BUCKET: fakeBucket,
        SOURCE_EXTRACTION_QUEUE: fakeQueue,
        AI: createFakeAi({
          markdown:
            'The document appears to be a scanned continuity plan. The top section contains a title and the bottom section contains narrative paragraphs.',
          visionResponse: 'Teams: Security\nVendors: Okta\nEscalation Roles: Incident Commander',
        }),
      } as never,
    );
    const payload = (await uploadResponse.json()) as { document: SourceDocumentDetail };

    expect(uploadResponse.status).toBe(201);
    expect(payload.document.storageBackend).toBe('r2');
    expect(payload.document.extractionStatus).toBe('ready_for_review');
    expect(payload.document.extractionProvenance?.method).toBe('upload_ai');
    expect(payload.document.extractionProvenance?.provider).toBe('workers_ai_vision');
    expect(payload.document.contentExcerpt).toContain('Teams: Security');
    expect(payload.document.latestExtractionJob).toBeNull();
    expect(fakeQueue.send).not.toHaveBeenCalled();
  });

  it('backfills extraction for an already stored PDF document', async () => {
    const pdfBytes = createPdfBuffer(['Teams: Security', 'Vendors: Okta', 'Escalation Roles: Incident Commander']);
    const seedDocument: DocumentSummary = {
      id: 'doc_pending_pdf',
      name: 'Pending PDF',
      type: 'Continuity Plan',
      businessUnit: 'Operations',
      owner: 'Dana Smith',
      effectiveDate: '2026-03-01',
      parseStatus: 'uploaded',
      storageStatus: 'stored',
      storageBackend: 'r2',
      uploadedFileName: 'pending-plan.pdf',
      byteSize: pdfBytes.byteLength,
      extractionStatus: 'not_started',
      pendingSuggestionCount: 0,
      updatedAt: '2026-03-08T10:00:00.000Z',
    };
    const store = new MemoryResilienceStore({
      documents: [seedDocument],
      documentFiles: [
        {
          documentId: seedDocument.id,
          uploadedFileName: 'pending-plan.pdf',
          mimeType: 'application/pdf',
          byteSize: pdfBytes.byteLength,
          storageBackend: 'r2',
          storageObjectKey: 'source-documents/pending-plan.pdf',
          contentText: null,
          contentExcerpt: null,
          extractionNote: 'Stored in R2. PDF text extraction is still pending, so no suggestions were generated yet.',
          extractionStatus: 'not_started',
          extractionMethod: null,
          extractionProvider: null,
          extractionVersion: null,
          extractedAt: null,
          createdAt: '2026-03-08T10:00:00.000Z',
          updatedAt: '2026-03-08T10:00:00.000Z',
        },
      ],
      suggestions: [],
      contextBuckets: [],
      scenarioDrafts: [],
      launches: [],
      participantRuns: [],
    });
    const app = createApp(store);
    const fakeBucket = createFakeBucket({ objectBytes: pdfBytes });

    const response = await app.request(
      `/api/v1/source-documents/${seedDocument.id}/extract`,
      { method: 'POST', headers: adminHeaders },
      { SOURCE_DOCUMENTS_BUCKET: fakeBucket } as never,
    );
    const payload = (await response.json()) as { document: SourceDocumentDetail };

    expect(response.status).toBe(200);
    expect(payload.document.extractionStatus).toBe('ready_for_review');
    expect(payload.document.extractionSuggestions.length).toBeGreaterThan(0);
    expect(payload.document.contentExcerpt).toContain('Teams: Security');
    expect(payload.document.extractionProvenance?.method).toBe('manual_native');
    expect(payload.document.extractionProvenance?.provider).toBe('native_parser');
    expect(fakeBucket.get).toHaveBeenCalledTimes(1);
  });

  it('creates launches from approved scenario drafts and participant runs for them', async () => {
    const app = createApp(new MemoryResilienceStore());

    const launchResponse = await app.request('/api/v1/launches', {
      method: 'POST',
      headers: adminJsonHeaders,
      body: JSON.stringify({
        scenarioDraftId: 'draft_q2_cyber',
        startsAt: '2026-03-21',
        participantsLabel: '12 assignees',
      }),
    });
    const launchPayload = (await launchResponse.json()) as { launch: Launch };

    expect(launchResponse.status).toBe(201);
    expect(launchPayload.launch.scenarioDraftId).toBe('draft_q2_cyber');

    const runResponse = await app.request('/api/v1/participant-runs', {
      method: 'POST',
      headers: adminJsonHeaders,
      body: JSON.stringify({
        launchId: launchPayload.launch.id,
        participantName: 'Morgan Bell',
        participantRole: 'Operations Analyst',
        dueAt: '2026-03-21',
      }),
    });
    const runPayload = (await runResponse.json()) as { run: ParticipantRun };

    expect(runResponse.status).toBe(201);
    expect(runPayload.run.launchId).toBe(launchPayload.launch.id);
    expect(runPayload.run.status).toBe('assigned');
  });

  it('updates context items, scenario drafts, and participant runs into report detail', async () => {
    const app = createApp(new MemoryResilienceStore());

    const contextResponse = await app.request('/api/v1/context-items/team_security', {
      method: 'PATCH',
      headers: adminJsonHeaders,
      body: JSON.stringify({ reviewState: 'confirmed' }),
    });
    const contextPayload = (await contextResponse.json()) as { item: ContextItem };

    expect(contextResponse.status).toBe(200);
    expect(contextPayload.item.reviewState).toBe('confirmed');

    const draftResponse = await app.request('/api/v1/scenario-drafts/draft_vendor_tabletop', {
      method: 'PATCH',
      headers: adminJsonHeaders,
      body: JSON.stringify({ approvalStatus: 'approved' }),
    });
    const draftPayload = (await draftResponse.json()) as { draft: ScenarioDraft };

    expect(draftResponse.status).toBe(200);
    expect(draftPayload.draft.approvalStatus).toBe('approved');

    const runResponse = await app.request('/api/v1/participant-runs/run_jordan_compliance', {
      method: 'PATCH',
      headers: adminJsonHeaders,
      body: JSON.stringify({
        firstAction: 'Notify the incident commander and log the outage against the cyber escalation path.',
        escalationChoice: 'Incident Commander',
        impactAssessment: 'Trade review is delayed for advisory teams while authentication remains unstable.',
        notes: 'Escalation ownership is clear, but vendor contact expectations need tightening.',
        policyAcknowledged: true,
        status: 'submitted',
      }),
    });
    const runPayload = (await runResponse.json()) as { run: ParticipantRun };

    expect(runResponse.status).toBe(200);
    expect(runPayload.run.status).toBe('submitted');
    expect(runPayload.run.scorePercent).toBe(100);

    const reportResponse = await app.request('/api/v1/reports/launch_q2_cyber_wave1', {
      headers: adminHeaders,
    });
    const reportPayload = (await reportResponse.json()) as { report: ReportDetail };

    expect(reportResponse.status).toBe(200);
    expect(reportPayload.report.completionRate).toBe(100);
    expect(reportPayload.report.evidenceStatus).toBe('ready');
    expect(reportPayload.report.afterActionSummary.executiveSummary).toContain('submitted response');
    expect(reportPayload.report.participantRuns.length).toBeGreaterThan(1);

    const closeoutResponse = await app.request('/api/v1/reports/launch_q2_cyber_wave1/review', {
      method: 'PATCH',
      headers: adminJsonHeaders,
      body: JSON.stringify({
        closeoutNotes: 'Operator review completed. Close this package and track the vendor escalation handoff update.',
        followUpText: 'Update the vendor escalation matrix\nConfirm policy wording for after-action note capture',
        markClosed: true,
      }),
    });
    const closeoutPayload = (await closeoutResponse.json()) as { report: ReportDetail };

    expect(closeoutResponse.status).toBe(200);
    expect(closeoutPayload.report.status).toBe('closed');
    expect(closeoutPayload.report.closeoutNotes).toContain('Operator review completed');
    expect(closeoutPayload.report.followUpActions).toHaveLength(2);
    expect(closeoutPayload.report.closedByName).toBe('Dana Smith');
    expect(closeoutPayload.report.closedAt).not.toBeNull();

    const markdownExportResponse = await app.request('/api/v1/reports/launch_q2_cyber_wave1/export?format=markdown', {
      headers: adminHeaders,
    });
    const markdownExport = await markdownExportResponse.text();

    expect(markdownExportResponse.status).toBe(200);
    expect(markdownExportResponse.headers.get('Content-Type')).toContain('text/markdown');
    expect(markdownExportResponse.headers.get('Content-Disposition')).toContain('after-action.md');
    expect(markdownExport).toContain('# Altira Resilience After-Action Brief');
    expect(markdownExport).toContain('## Operator Closeout');
    expect(markdownExport).toContain('Update the vendor escalation matrix');
    expect(markdownExport).toContain('## Participant Evidence');

    const jsonExportResponse = await app.request('/api/v1/reports/launch_q2_cyber_wave1/export?format=json', {
      headers: adminHeaders,
    });
    const jsonExport = JSON.parse(await jsonExportResponse.text()) as ReportEvidencePackage;

    expect(jsonExportResponse.status).toBe(200);
    expect(jsonExportResponse.headers.get('Content-Type')).toContain('application/json');
    expect(jsonExportResponse.headers.get('Content-Disposition')).toContain('evidence-package.json');
    expect(jsonExport.status).toBe('closed');
    expect(jsonExport.closeoutNotes).toContain('Operator review completed');
    expect(jsonExport.followUpActions).toContain('Update the vendor escalation matrix');
    expect(jsonExport.afterActionSummary.recommendedActions.length).toBeGreaterThan(0);
    expect(jsonExport.participantRuns.length).toBe(reportPayload.report.participantRuns.length);
  });
});

function createFakeBucket(options?: { objectBytes?: Uint8Array }) {
  return {
    put: vi.fn(async () => ({ key: 'fake-key' })),
    get: vi.fn(async () =>
      options?.objectBytes
        ? {
            arrayBuffer: async () => options.objectBytes!.slice().buffer,
          }
        : null,
    ),
  };
}

function createFakeQueue() {
  return {
    send: vi.fn(async () => undefined),
  };
}

function createFakeAi(options: { markdown: string; visionResponse?: string }) {
  return {
    toMarkdown: vi.fn(async () => ({
      format: 'markdown' as const,
      data: options.markdown,
    })),
    run: vi.fn(async () => ({
      response: options.visionResponse ?? 'UNREADABLE',
    })),
  };
}

function createPdfBuffer(lines: string[]): Uint8Array {
  const stream = [
    'BT',
    '/F1 12 Tf',
    ...lines.flatMap((line, index) => {
      const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
      return index === 0 ? [`72 720 Td (${escaped}) Tj`] : [`0 -16 Td (${escaped}) Tj`];
    }),
    'ET',
  ].join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += object;
  }

  const xrefOffset = pdf.length;
  pdf += 'xref\n0 6\n';
  pdf += '0000000000 65535 f \n';

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

function createScannedPdfBuffer(): Uint8Array {
  const jpegBytes = decodeBase64Bytes(
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEBAQEBAPEA8PDw8PDw8PDw8PDw8QFREWFhURFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMsNygtLisBCgoKDg0OGhAQGy0lICYtLS8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAQMBIgACEQEDEQH/xAAXAAADAQAAAAAAAAAAAAAAAAAAAQID/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEAMQAAAB6AAAAP/EABQQAQAAAAAAAAAAAAAAAAAAACD/2gAIAQEAAT8Af//EABQRAQAAAAAAAAAAAAAAAAAAACD/2gAIAQIBAT8Af//EABQRAQAAAAAAAAAAAAAAAAAAACD/2gAIAQMBAT8Af//Z',
  );
  const pageDrawCommands = new TextEncoder().encode('q\n1 0 0 1 0 0 cm\n/Im1 Do\nQ');
  const imageObject = concatBytes([
    new TextEncoder().encode(
      `<< /Type /XObject /Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${jpegBytes.byteLength} /Filter /DCTDecode >>\nstream\n`,
    ),
    jpegBytes,
    new TextEncoder().encode('\nendstream'),
  ]);
  const contentsObject = concatBytes([
    new TextEncoder().encode(`<< /Length ${pageDrawCommands.byteLength} >>\nstream\n`),
    pageDrawCommands,
    new TextEncoder().encode('\nendstream'),
  ]);

  return buildBinaryPdf([
    new TextEncoder().encode('<< /Type /Catalog /Pages 2 0 R >>'),
    new TextEncoder().encode('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
    new TextEncoder().encode(
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 1 1] /Resources << /ProcSet [ /PDF /ImageC ] /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>',
    ),
    imageObject,
    contentsObject,
  ]);
}

function buildBinaryPdf(objects: Uint8Array[]): Uint8Array {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [encoder.encode('%PDF-1.4\n')];
  const offsets: number[] = [0];
  let length = parts[0].byteLength;

  objects.forEach((objectBytes, index) => {
    offsets.push(length);
    const chunk = concatBytes([
      encoder.encode(`${index + 1} 0 obj\n`),
      objectBytes,
      encoder.encode('\nendobj\n'),
    ]);
    parts.push(chunk);
    length += chunk.byteLength;
  });

  const xrefOffset = length;
  let trailer = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    trailer += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  trailer += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  parts.push(encoder.encode(trailer));

  return concatBytes(parts);
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }

  return result;
}

function decodeBase64Bytes(value: string): Uint8Array {
  const binary = atob(value);
  const result = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    result[index] = binary.charCodeAt(index);
  }

  return result;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
