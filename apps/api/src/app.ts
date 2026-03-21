import { Hono } from 'hono';
import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type {
  AdminNavId,
  AuthSession,
  AuthSessionState,
  BootstrapPayload,
  ContextItemInput,
  DocumentSummary,
  Launch,
  LaunchInput,
  LaunchPatch,
  ParticipantRun,
  ParticipantRunInput,
  ParticipantRunPatch,
  ParticipantRunTeamAssignmentInput,
  ReportExportFormat,
  RosterMember,
  RosterMemberInput,
  RosterMemberPatch,
  ScenarioDraft,
  ScenarioDraftInput,
  SourceDocumentDetail,
  SourceDocumentInput,
  SourceDocumentUploadInput,
  SuggestionStatus,
  PreviewAuthAccount,
  WorkspaceInvite,
  WorkspaceUser,
  WorkspaceInviteInput,
  WorkspaceInvitePatch,
  WorkspaceUserInput,
  WorkspaceUserPatch,
  WorkspaceUserCapability,
  WorkspaceUserRole,
} from '@resilience/shared';
import { adminNav, scenarioTemplates } from './config';
import { buildInviteMagicLinkPath, deliverWorkspaceInviteEmail } from './invite-delivery';
import {
  buildNativeExtractionProvenance,
  extractSourceDocumentText,
  extractSourceDocumentTextWithAi,
  isInlineTextSourceUpload,
  isSupportedSourceUpload,
  type SourceAiBinding,
} from './source-extraction';
import type { SourceExtractionQueueMessage } from './source-extraction-queue';
import {
  buildLaunchDetail,
  buildLaunches,
  buildOverviewData,
  buildParticipantRunDetail,
  buildReportDetail,
  buildReportExportFile,
  buildReports,
  buildSummaryCards,
  D1ResilienceStore,
  MemoryResilienceStore,
  normalizeContextItemInput,
  normalizeContextItemPatch,
  normalizeLaunchInput,
  normalizeLaunchPatch,
  normalizeParticipantRunInput,
  normalizeParticipantRunPatch,
  normalizeRosterMemberInput,
  normalizeRosterMemberPatch,
  normalizeIdentityEmail,
  normalizeWorkspaceInviteInput,
  normalizeWorkspaceInvitePatch,
  normalizeWorkspaceUserInput,
  normalizeWorkspaceUserPatch,
  normalizeScenarioDraftInput,
  normalizeScenarioDraftPatch,
  normalizeSourceDocumentInput,
  normalizeSourceDocumentPatch,
  normalizeSourceDocumentUploadInput,
  type ResilienceStore,
  isSuggestionStatus,
} from './store';

export type Bindings = {
  APP_NAME?: string;
  APP_STAGE?: string;
  APP_ALLOWED_ORIGINS?: string;
  ALLOW_DEBUG_AUTH?: string;
  APP_BASE_URL?: string;
  INVITE_EMAIL_PROVIDER?: string;
  INVITE_EMAIL_FROM?: string;
  INVITE_EMAIL_REPLY_TO?: string;
  RESEND_API_KEY?: string;
  DB?: D1Database;
  AI?: SourceAiBinding;
  SOURCE_DOCUMENTS_BUCKET?: R2Bucket;
  SOURCE_EXTRACTION_QUEUE?: Queue<SourceExtractionQueueMessage>;
  STORE?: ResilienceStore;
};

const fallbackStore = new MemoryResilienceStore();
const MAX_SOURCE_UPLOAD_BYTES = 5_000_000;
const CURRENT_USER_HEADER = 'x-resilience-user-id';
const SESSION_COOKIE_NAME = 'altira_resilience_session';
const AUTH_SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;
const INVITE_MAGIC_LINK_TTL_SECONDS = 60 * 60 * 24 * 3;
type AppContext = Context<{ Bindings: Bindings }>;

export function createApp(storeOverride?: ResilienceStore) {
  const app = new Hono<{ Bindings: Bindings }>();

  app.use('*', async (c, next) => {
    const origin = c.req.header('Origin');
    const allowedOrigin = resolveCorsOrigin(c.env, origin);

    if (c.req.method === 'OPTIONS') {
      if (!allowedOrigin) {
        return new Response(null, { status: 204 });
      }

      return new Response(null, {
        status: 204,
        headers: buildCorsHeaders(c.env, allowedOrigin),
      });
    }

    await next();

    if (!allowedOrigin) {
      return;
    }

    const headers = buildCorsHeaders(c.env, allowedOrigin);
    Object.entries(headers).forEach(([key, value]) => c.header(key, value));
  });

  app.get('/health', (c) =>
    c.json({
      ok: true,
      app: c.env?.APP_NAME ?? 'Altira Resilience',
      stage: getAppStage(c.env),
    }),
  );

  app.get('/api/v1/auth/session', async (c) => {
    const store = resolveStore(c.env ?? {}, storeOverride);
    const availableUsers = await store.listWorkspaceUsers();
    const resolved = await resolveOptionalSessionUser(c, store, availableUsers);
    return c.json(buildAuthSessionStatePayload(c.env, availableUsers, resolved ?? null));
  });

  app.post('/api/v1/auth/sign-in', async (c) => {
    const store = resolveStore(c.env ?? {}, storeOverride);
    const body = await c.req
      .json<{ email?: string }>()
      .catch((): { email?: string } => ({}));
    const email = body.email?.trim().toLowerCase() ?? '';

    if (!email) {
      return c.json({ error: 'Enter the workspace email for the account you want to use.' }, 400);
    }

    const workspaceUser = await store.getWorkspaceUserByEmail(email);

    if (!workspaceUser) {
      const pendingInvite = await store.getPendingWorkspaceInviteByEmail(email);
      if (pendingInvite) {
        return c.json({ error: 'This workspace email has a pending invite. Open the magic link from the invite to activate the account.' }, 401);
      }
    }

    if (!workspaceUser || workspaceUser.status !== 'active') {
      return c.json({ error: 'No active workspace user matches that email.' }, 401);
    }

    const sessionToken = createSessionToken();
    const tokenHash = await hashSessionToken(sessionToken);
    const expiresAt = isoFromNow(AUTH_SESSION_TTL_SECONDS);
    const session = await store.createAuthSession({
      workspaceUserId: workspaceUser.id,
      tokenHash,
      expiresAt,
    });
    const localRequest = isLocalRequest(c);

    setCookie(c, SESSION_COOKIE_NAME, sessionToken, {
      path: '/',
      httpOnly: true,
      sameSite: localRequest ? 'Lax' : 'None',
      secure: localRequest ? false : isSecureRequest(c),
      maxAge: AUTH_SESSION_TTL_SECONDS,
      expires: new Date(expiresAt),
    });

    const availableUsers = await store.listWorkspaceUsers();
    return c.json(buildAuthSessionStatePayload(c.env, availableUsers, { currentUser: workspaceUser, session }), 201);
  });

  app.post('/api/v1/auth/magic-link/consume', async (c) => {
    const store = resolveStore(c.env ?? {}, storeOverride);
    const body = await c.req
      .json<{ token?: string }>()
      .catch((): { token?: string } => ({}));
    const token = body.token?.trim() ?? '';

    if (!token) {
      return c.json({ error: 'Magic link token is required.' }, 400);
    }

    const tokenHash = await hashSessionToken(token);
    const invite = await store.getWorkspaceInviteByMagicLinkTokenHash(tokenHash);

    if (!invite) {
      return c.json({ error: 'Magic link is invalid or expired.' }, 401);
    }

    let workspaceUser = await store.getWorkspaceUserByEmail(invite.email);
    const workspaceUsers = await store.listWorkspaceUsers();
    const conflictingRosterUser = invite.rosterMemberId
      ? findWorkspaceUserByRosterMemberId(workspaceUsers, invite.rosterMemberId, workspaceUser?.id ?? null)
      : null;

    if (conflictingRosterUser) {
      return c.json(
        { error: 'Invite access conflicts with another workspace user already linked to that roster member.' },
        409,
      );
    }

    let reconciliationDetail = 'Invite accepted through a magic-link sign-in.';
    if (!workspaceUser) {
      workspaceUser = await store.createWorkspaceUser({
        fullName: invite.fullName,
        email: invite.email,
        role: invite.role,
        capabilities: invite.capabilities,
        scopeTeams: invite.scopeTeams,
        rosterMemberId: invite.rosterMemberId,
        status: 'active',
      });
      reconciliationDetail = 'Invite accepted through a magic-link sign-in. Created a new workspace user.';
    }

    if (workspaceUser.status !== 'active') {
      return c.json({ error: 'Workspace user is inactive. Ask an admin to reactivate the account.' }, 403);
    }

    const reconciledUser = await store.updateWorkspaceUser(workspaceUser.id, {
      fullName: invite.fullName,
      email: invite.email,
      role: invite.role,
      capabilities: invite.capabilities,
      scopeTeams: invite.scopeTeams,
      rosterMemberId: invite.rosterMemberId,
    });
    if (!reconciledUser) {
      return c.json({ error: 'Unable to reconcile the invited workspace user.' }, 500);
    }
    workspaceUser = reconciledUser;
    if (reconciliationDetail === 'Invite accepted through a magic-link sign-in.') {
      reconciliationDetail = 'Invite accepted through a magic-link sign-in. Reconciled the existing workspace user to the staged access.';
    }

    await store.acceptWorkspaceInvite(invite.id, workspaceUser.id);
    await store.createAuditEvent(
      buildWorkspaceInviteAuditEvent(
        workspaceUser,
        'workspace_invite_accepted',
        invite,
        reconciliationDetail,
      ),
    );

    const sessionToken = createSessionToken();
    const session = await store.createAuthSession({
      workspaceUserId: workspaceUser.id,
      tokenHash: await hashSessionToken(sessionToken),
      expiresAt: isoFromNow(AUTH_SESSION_TTL_SECONDS),
    });
    const localRequest = isLocalRequest(c);

    setCookie(c, SESSION_COOKIE_NAME, sessionToken, {
      path: '/',
      httpOnly: true,
      sameSite: localRequest ? 'Lax' : 'None',
      secure: localRequest ? false : isSecureRequest(c),
      maxAge: AUTH_SESSION_TTL_SECONDS,
      expires: new Date(session.expiresAt),
    });

    const availableUsers = await store.listWorkspaceUsers();
    return c.json(buildAuthSessionStatePayload(c.env, availableUsers, { currentUser: workspaceUser, session }), 201);
  });

  app.post('/api/v1/auth/sign-out', async (c) => {
    const store = resolveStore(c.env ?? {}, storeOverride);
    const availableUsers = await store.listWorkspaceUsers();
    const resolved = await resolveOptionalSessionUser(c, store, availableUsers, { allowDebugHeader: false });

    if (resolved?.session) {
      await store.revokeAuthSession(resolved.session.id);
    }

    deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' });
    return c.json(buildAuthSessionStatePayload(c.env, availableUsers, null));
  });

  app.get('/api/v1/bootstrap', async (c) => {
    const store = resolveStore(c.env ?? {}, storeOverride);
    const session = await requireResolvedSession(c, store);
    if (session instanceof Response) return session;
    const payload = await buildBootstrapPayload(store, session.currentUser, session.availableUsers, c.env);
    return c.json(payload);
  });

  app.get('/api/v1/source-documents', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin']);
    if (currentUser instanceof Response) return currentUser;

    const documents = await store.listSourceDocuments();
    return c.json({ documents });
  });

  app.get('/api/v1/source-documents/:documentId', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin']);
    if (currentUser instanceof Response) return currentUser;

    const documentId = c.req.param('documentId');
    const document = await store.getSourceDocument(documentId);

    if (!document) {
      return c.json({ error: 'Source document not found.' }, 404);
    }

    return c.json({ document });
  });

  app.post('/api/v1/source-documents', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin']);
    if (currentUser instanceof Response) return currentUser;

    const body = await c.req.json<Partial<SourceDocumentInput>>();
    const input = normalizeSourceDocumentInput(body);
    if (!input) {
      return c.json({ error: 'Invalid source document payload.' }, 400);
    }

    const document = await store.createSourceDocument(input);
    return c.json({ document }, 201);
  });

  app.post('/api/v1/source-documents/upload', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin']);
    if (currentUser instanceof Response) return currentUser;

    const form = await c.req.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return c.json({ error: 'A source file upload is required.' }, 400);
    }

    const mimeType = file.type || inferMimeTypeFromFileName(file.name);
    if (!isSupportedSourceUpload(mimeType, file.name)) {
      return c.json(
        { error: 'Unsupported file type. v1 upload supports text, markdown, csv, json, pdf, docx, xlsx, pptx, and common image files.' },
        400,
      );
    }

    if (file.size > MAX_SOURCE_UPLOAD_BYTES) {
      return c.json({ error: 'Upload exceeds the 5 MB limit for this preview.' }, 400);
    }

    const textExtractable = isInlineTextSourceUpload(mimeType, file.name);
    const bucket = c.env?.SOURCE_DOCUMENTS_BUCKET;

    if (!textExtractable && !bucket) {
      return c.json(
        { error: 'Binary uploads require an R2 source-documents bucket in this environment. Text-based uploads still work without it.' },
        400,
      );
    }

    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const nativeExtractionBytes = fileBytes.slice();
    const aiExtractionBytes = fileBytes.slice();
    let extraction = await extractSourceDocumentText({
      bytes: nativeExtractionBytes,
      fileName: file.name,
      mimeType,
    });

    if (!extraction.contentText && c.env?.AI) {
      const aiExtraction = await extractSourceDocumentTextWithAi({
        ai: c.env.AI,
        bytes: aiExtractionBytes,
        fileName: file.name,
        mimeType,
        method: 'upload_ai',
      });

      if (aiExtraction.contentText) {
        extraction = aiExtraction;
      }
    }

    const storageBackend = bucket ? 'r2' : 'inline';
    const storageObjectKey = bucket ? buildSourceDocumentObjectKey(file.name) : null;
    const input = normalizeSourceDocumentUploadInput({
      name: readFormString(form, 'name') ?? file.name,
      type: readFormString(form, 'type') ?? undefined,
      businessUnit: readFormString(form, 'businessUnit') ?? undefined,
      owner: readFormString(form, 'owner') ?? undefined,
      effectiveDate: readFormString(form, 'effectiveDate') ?? undefined,
      fileName: file.name,
      mimeType,
      byteSize: file.size,
      storageBackend,
      storageObjectKey,
      contentText: extraction.contentText,
      extractionNote:
        extraction.contentText || textExtractable
          ? extraction.extractionNote
          : extraction.extractionNote ?? buildPendingExtractionNote(file.name, mimeType, storageBackend),
      extractionProvenance:
        extraction.contentText
          ? extraction.extractionProvenance ?? buildNativeExtractionProvenance('upload_native')
          : null,
    } satisfies Partial<SourceDocumentUploadInput>);

    if (!input) {
      return c.json(
        { error: 'Invalid upload payload. Upload a supported file under 5 MB with the required metadata.' },
        400,
      );
    }

    if (bucket && storageObjectKey) {
      await bucket.put(storageObjectKey, fileBytes.slice(), {
        httpMetadata: { contentType: mimeType },
      });
    }

    let document = await store.uploadSourceDocument(input);

    if (!extraction.contentText && bucket && c.env?.SOURCE_EXTRACTION_QUEUE && document.storageBackend === 'r2') {
      const queuedDocument = await store.queueSourceDocumentExtraction(document.id, {
        note: buildQueuedExtractionNote(file.name, mimeType),
      });

      if (queuedDocument?.latestExtractionJob?.status === 'queued') {
        await c.env.SOURCE_EXTRACTION_QUEUE.send({
          jobId: queuedDocument.latestExtractionJob.id,
          documentId: queuedDocument.id,
        });
        document = queuedDocument;
      }
    }

    return c.json({ document }, 201);
  });

  app.post('/api/v1/source-documents/:documentId/extract', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin']);
    if (currentUser instanceof Response) return currentUser;

    const documentId = c.req.param('documentId');
    const document = await store.getSourceDocument(documentId);

    if (!document) {
      return c.json({ error: 'Source document not found.' }, 404);
    }

    if (document.storageStatus !== 'stored' || !document.uploadedFileName || !document.mimeType) {
      return c.json({ error: 'This source document does not have a stored file to extract.' }, 400);
    }

    if (document.extractionStatus !== 'not_started') {
      return c.json({ document });
    }

    const fileBytes = await readStoredSourceDocumentBytes(document, c.env?.SOURCE_DOCUMENTS_BUCKET);
    if (!fileBytes) {
      return c.json(
        { error: 'Stored file bytes are not available for extraction in this environment.' },
        400,
      );
    }

    const extraction = await extractSourceDocumentText({
      bytes: fileBytes,
      fileName: document.uploadedFileName,
      mimeType: document.mimeType,
    });
    const updatedDocument = await store.applySourceDocumentExtraction(documentId, {
      contentText: extraction.contentText,
      extractionNote:
        extraction.contentText
          ? null
          : extraction.extractionNote ??
            buildPendingExtractionNote(
              document.uploadedFileName,
              document.mimeType,
              document.storageBackend ?? 'r2',
            ),
      extractionProvenance: extraction.contentText ? buildNativeExtractionProvenance('manual_native') : null,
    });

    if (!updatedDocument) {
      return c.json({ error: 'Source document could not be updated after extraction.' }, 500);
    }

    return c.json({ document: updatedDocument });
  });

  app.post('/api/v1/source-documents/:documentId/queue-extract', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin']);
    if (currentUser instanceof Response) return currentUser;

    if (!c.env?.SOURCE_EXTRACTION_QUEUE) {
      return c.json({ error: 'Background extraction queue is not configured in this environment.' }, 400);
    }

    const documentId = c.req.param('documentId');
    const currentDocument = await store.getSourceDocument(documentId);

    if (!currentDocument) {
      return c.json({ error: 'Source document not found.' }, 404);
    }

    if (
      currentDocument.storageStatus !== 'stored' ||
      currentDocument.storageBackend !== 'r2' ||
      !currentDocument.storageObjectKey ||
      !currentDocument.uploadedFileName ||
      !currentDocument.mimeType
    ) {
      return c.json({ error: 'This source document is not eligible for queued extraction.' }, 400);
    }

    if (
      currentDocument.latestExtractionJob &&
      (currentDocument.latestExtractionJob.status === 'queued' ||
        currentDocument.latestExtractionJob.status === 'processing')
    ) {
      return c.json({ document: currentDocument });
    }

    const queuedDocument = await store.queueSourceDocumentExtraction(documentId, {
      note: buildQueuedExtractionNote(currentDocument.uploadedFileName, currentDocument.mimeType),
    });

    if (!queuedDocument?.latestExtractionJob) {
      return c.json({ error: 'Source document could not be queued for extraction.' }, 500);
    }

    await c.env.SOURCE_EXTRACTION_QUEUE.send({
      jobId: queuedDocument.latestExtractionJob.id,
      documentId,
    });

    return c.json({ document: queuedDocument });
  });

  app.patch('/api/v1/source-documents/:documentId', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin']);
    if (currentUser instanceof Response) return currentUser;

    const documentId = c.req.param('documentId');
    const patch = normalizeSourceDocumentPatch(await c.req.json());
    const document = await store.updateSourceDocument(documentId, patch);

    if (!document) {
      return c.json({ error: 'Source document not found.' }, 404);
    }

    return c.json({ document });
  });

  app.patch('/api/v1/source-suggestions/:suggestionId', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin']);
    if (currentUser instanceof Response) return currentUser;

    const suggestionId = c.req.param('suggestionId');
    const body = (await c.req.json()) as { status?: SuggestionStatus };

    if (!isSuggestionStatus(body.status)) {
      return c.json({ error: 'Invalid suggestion status.' }, 400);
    }

    const suggestion = await store.updateSourceExtractionSuggestionStatus(
      suggestionId,
      body.status,
    );

    if (!suggestion) {
      return c.json({ error: 'Source suggestion not found.' }, 404);
    }

    return c.json({ suggestion });
  });

  app.post('/api/v1/source-suggestions/:suggestionId/apply', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin']);
    if (currentUser instanceof Response) return currentUser;

    const suggestionId = c.req.param('suggestionId');
    const result = await store.applySourceExtractionSuggestion(suggestionId);

    if (!result) {
      return c.json({ error: 'Source suggestion not found.' }, 404);
    }

    return c.json(result);
  });

  app.get('/api/v1/context', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin']);
    if (currentUser instanceof Response) return currentUser;

    const context = await store.listContextBuckets();
    return c.json({ organizationContext: context });
  });

  app.post('/api/v1/context-items', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin']);
    if (currentUser instanceof Response) return currentUser;

    const body = await c.req.json<Partial<ContextItemInput>>();
    const input = normalizeContextItemInput(body);
    if (!input) {
      return c.json({ error: 'Invalid context item payload.' }, 400);
    }

    const item = await store.createContextItem(input);
    if (!item) {
      return c.json({ error: 'Context bucket not found.' }, 404);
    }

    return c.json({ item }, 201);
  });

  app.patch('/api/v1/context-items/:itemId', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin']);
    if (currentUser instanceof Response) return currentUser;

    const itemId = c.req.param('itemId');
    const patch = normalizeContextItemPatch(await c.req.json());
    const item = await store.updateContextItem(itemId, patch);

    if (!item) {
      return c.json({ error: 'Context item not found.' }, 404);
    }

    return c.json({ item });
  });

  app.get('/api/v1/scenario-drafts', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin']);
    if (currentUser instanceof Response) return currentUser;

    const drafts = await store.listScenarioDrafts();
    return c.json({ drafts });
  });

  app.post('/api/v1/scenario-drafts', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin']);
    if (currentUser instanceof Response) return currentUser;

    const body = await c.req.json<Partial<ScenarioDraftInput>>();
    const input = normalizeScenarioDraftInput(body);
    if (!input) {
      return c.json({ error: 'Invalid scenario draft payload.' }, 400);
    }

    const preparedInput = prepareScenarioDraftForSave(input, currentUser);
    if ('error' in preparedInput) {
      return c.json({ error: preparedInput.error }, 400);
    }

    const draft = await store.createScenarioDraft(preparedInput.input);
    const auditEvent = buildScenarioDraftAuditEvent(currentUser, null, draft);
    if (auditEvent) {
      await store.createAuditEvent(auditEvent);
    }
    return c.json({ draft }, 201);
  });

  app.patch('/api/v1/scenario-drafts/:draftId', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin']);
    if (currentUser instanceof Response) return currentUser;

    const draftId = c.req.param('draftId');
    const currentDraft = await store.getScenarioDraft(draftId);

    if (!currentDraft) {
      return c.json({ error: 'Scenario draft not found.' }, 404);
    }

    const patch = normalizeScenarioDraftPatch(await c.req.json());
    const preparedPatch = prepareScenarioDraftPatchForSave(patch, currentDraft, currentUser);
    if ('error' in preparedPatch) {
      return c.json({ error: preparedPatch.error }, 400);
    }

    const draft = await store.updateScenarioDraft(draftId, preparedPatch.patch);

    if (!draft) {
      return c.json({ error: 'Scenario draft not found.' }, 404);
    }

    const auditEvent = buildScenarioDraftAuditEvent(currentUser, currentDraft, draft);
    if (auditEvent) {
      await store.createAuditEvent(auditEvent);
    }

    return c.json({ draft });
  });

  app.get('/api/v1/roster-members', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin', 'manager']);
    if (currentUser instanceof Response) return currentUser;

    const rosterMembers = await store.listRosterMembers();
    return c.json({ rosterMembers: filterRosterMembersForUser(currentUser, rosterMembers) });
  });

  app.post('/api/v1/roster-members', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin']);
    if (currentUser instanceof Response) return currentUser;

    const body = await c.req.json<Partial<RosterMemberInput>>();
    const input = normalizeRosterMemberInput(body);
    if (!input) {
      return c.json({ error: 'Invalid roster member payload.' }, 400);
    }

    const rosterMembers = await store.listRosterMembers();
    const conflictingRosterMember = findRosterMemberByEmail(rosterMembers, input.email);
    if (conflictingRosterMember) {
      return c.json({ error: 'A roster member already exists for that email.' }, 409);
    }

    const rosterMember = await store.createRosterMember(input);
    return c.json({ rosterMember }, 201);
  });

  app.patch('/api/v1/roster-members/:memberId', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin']);
    if (currentUser instanceof Response) return currentUser;

    const memberId = c.req.param('memberId');
    const patch = normalizeRosterMemberPatch(await c.req.json<Partial<RosterMemberPatch>>());
    const existingRosterMember = await store.getRosterMember(memberId);
    if (!existingRosterMember) {
      return c.json({ error: 'Roster member not found.' }, 404);
    }

    if (patch.email) {
      const rosterMembers = await store.listRosterMembers();
      const conflictingRosterMember = findRosterMemberByEmail(rosterMembers, patch.email, memberId);
      if (conflictingRosterMember) {
        return c.json({ error: 'Another roster member already uses that email.' }, 409);
      }
    }

    const rosterMember = await store.updateRosterMember(memberId, patch);

    if (!rosterMember) {
      return c.json({ error: 'Roster member not found.' }, 404);
    }

    return c.json({ rosterMember });
  });

  app.get('/api/v1/workspace-users', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin']);
    if (currentUser instanceof Response) return currentUser;

    const workspaceUsers = await store.listWorkspaceUsers();
    return c.json({ workspaceUsers });
  });

  app.post('/api/v1/workspace-users', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin']);
    if (currentUser instanceof Response) return currentUser;

    const body = await c.req.json<Partial<WorkspaceUserInput>>();
    const input = normalizeWorkspaceUserInput(body);
    if (!input) {
      return c.json({ error: 'Invalid workspace user payload.' }, 400);
    }

    const existingUser = await store.getWorkspaceUserByEmail(input.email);
    if (existingUser) {
      return c.json({ error: 'A workspace user already exists for that email.' }, 409);
    }

    const pendingInvite = await store.getPendingWorkspaceInviteByEmail(input.email);
    if (pendingInvite) {
      return c.json({ error: 'A pending invite already exists for that email. Revoke or accept it before creating a user directly.' }, 409);
    }

    if (input.rosterMemberId) {
      const [workspaceUsers, workspaceInvites] = await Promise.all([store.listWorkspaceUsers(), store.listWorkspaceInvites()]);
      const conflictingWorkspaceUser = findWorkspaceUserByRosterMemberId(workspaceUsers, input.rosterMemberId);
      if (conflictingWorkspaceUser) {
        return c.json({ error: 'Another workspace user is already linked to that roster member.' }, 409);
      }

      const conflictingInvite = findPendingInviteByRosterMemberId(workspaceInvites, input.rosterMemberId);
      if (conflictingInvite) {
        return c.json({ error: 'A pending invite is already staged for that roster member.' }, 409);
      }
    }

    const workspaceUser = await store.createWorkspaceUser(input);
    await store.createAuditEvent(buildWorkspaceUserAuditEvent(currentUser, null, workspaceUser));
    return c.json({ workspaceUser }, 201);
  });

  app.patch('/api/v1/workspace-users/:userId', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin']);
    if (currentUser instanceof Response) return currentUser;

    const userId = c.req.param('userId');
    const patch = normalizeWorkspaceUserPatch(await c.req.json<Partial<WorkspaceUserPatch>>());
    const existingWorkspaceUser = await store.getWorkspaceUser(userId);
    if (!existingWorkspaceUser) {
      return c.json({ error: 'Workspace user not found.' }, 404);
    }

    if (patch.email) {
      const existingUser = await store.getWorkspaceUserByEmail(patch.email);
      if (existingUser && existingUser.id !== userId) {
        return c.json({ error: 'Another workspace user already uses that email.' }, 409);
      }

      const pendingInvite = await store.getPendingWorkspaceInviteByEmail(patch.email);
      if (pendingInvite) {
        return c.json({ error: 'A pending invite already exists for that email. Resolve it before moving another user onto that address.' }, 409);
      }
    }

    const nextRosterMemberId =
      patch.rosterMemberId === undefined ? existingWorkspaceUser.rosterMemberId : patch.rosterMemberId;
    if (nextRosterMemberId) {
      const [workspaceUsers, workspaceInvites] = await Promise.all([store.listWorkspaceUsers(), store.listWorkspaceInvites()]);
      const conflictingWorkspaceUser = findWorkspaceUserByRosterMemberId(workspaceUsers, nextRosterMemberId, userId);
      if (conflictingWorkspaceUser) {
        return c.json({ error: 'Another workspace user is already linked to that roster member.' }, 409);
      }

      const conflictingInvite = findPendingInviteByRosterMemberId(workspaceInvites, nextRosterMemberId);
      if (conflictingInvite) {
        return c.json({ error: 'A pending invite is already staged for that roster member.' }, 409);
      }
    }

    const nextRole = patch.role ?? existingWorkspaceUser.role;
    const nextStatus = patch.status ?? existingWorkspaceUser.status;
    if (userId === currentUser.id && nextStatus !== 'active') {
      return c.json({ error: 'You cannot deactivate the workspace user tied to the current session.' }, 400);
    }
    if (userId === currentUser.id && nextRole !== 'admin') {
      return c.json({ error: 'You cannot remove admin access from the workspace user tied to the current session.' }, 400);
    }

    const workspaceUsers = await store.listWorkspaceUsers();
    const remainingActiveAdminCount = workspaceUsers.filter((user) => {
      if (user.id === userId) {
        return nextRole === 'admin' && nextStatus === 'active';
      }
      return user.role === 'admin' && user.status === 'active';
    }).length;

    if (remainingActiveAdminCount === 0) {
      return c.json({ error: 'At least one active admin must remain in the workspace.' }, 400);
    }

    const workspaceUser = await store.updateWorkspaceUser(userId, patch);
    if (workspaceUser) {
      await store.createAuditEvent(buildWorkspaceUserAuditEvent(currentUser, existingWorkspaceUser, workspaceUser));
    }
    return c.json({ workspaceUser });
  });

  app.get('/api/v1/workspace-invites', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin']);
    if (currentUser instanceof Response) return currentUser;

    const workspaceInvites = await store.listWorkspaceInvites();
    return c.json({ workspaceInvites });
  });

  app.post('/api/v1/workspace-invites', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin']);
    if (currentUser instanceof Response) return currentUser;

    const body = await c.req.json<Partial<WorkspaceInviteInput>>();
    const input = normalizeWorkspaceInviteInput(body);
    if (!input) {
      return c.json({ error: 'Invalid workspace invite payload.' }, 400);
    }

    const existingUser = await store.getWorkspaceUserByEmail(input.email);
    if (existingUser) {
      return c.json({ error: 'A workspace user already exists for that email.' }, 409);
    }

    const existingInvite = await store.getPendingWorkspaceInviteByEmail(input.email);
    if (existingInvite) {
      return c.json({ error: 'A pending invite already exists for that email.' }, 409);
    }

    if (input.rosterMemberId) {
      const [workspaceUsers, workspaceInvites] = await Promise.all([store.listWorkspaceUsers(), store.listWorkspaceInvites()]);
      const conflictingWorkspaceUser = findWorkspaceUserByRosterMemberId(workspaceUsers, input.rosterMemberId);
      if (conflictingWorkspaceUser) {
        return c.json({ error: 'Another workspace user is already linked to that roster member.' }, 409);
      }

      const conflictingInvite = findPendingInviteByRosterMemberId(workspaceInvites, input.rosterMemberId);
      if (conflictingInvite) {
        return c.json({ error: 'A pending invite is already staged for that roster member.' }, 409);
      }
    }

    const workspaceInvite = await store.createWorkspaceInvite({
      ...input,
      invitedByUserId: currentUser.id,
    });
    await store.createAuditEvent(buildWorkspaceInviteAuditEvent(currentUser, 'workspace_invite_created', workspaceInvite));
    return c.json({ workspaceInvite }, 201);
  });

  app.post('/api/v1/workspace-invites/:inviteId/send', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin']);
    if (currentUser instanceof Response) return currentUser;

    const inviteId = c.req.param('inviteId');
    const invite = (await store.listWorkspaceInvites()).find((entry) => entry.id === inviteId) ?? null;
    if (!invite) {
      return c.json({ error: 'Workspace invite not found.' }, 404);
    }
    if (invite.status !== 'pending') {
      return c.json({ error: 'Only pending invites can issue a magic link.' }, 400);
    }

    const token = createSessionToken();
    const expiresAt = isoFromNow(INVITE_MAGIC_LINK_TTL_SECONDS);
    const workspaceInvite = await store.issueWorkspaceInviteMagicLink(inviteId, {
      tokenHash: await hashSessionToken(token),
      expiresAt,
    });

    if (!workspaceInvite) {
      return c.json({ error: 'Workspace invite not found.' }, 404);
    }

    return c.json(
      {
        workspaceInvite,
        magicLinkPath: buildInviteMagicLinkPath(token),
        expiresAt,
        ...(await deliverWorkspaceInviteEmail({
          env: c.env,
          invite: workspaceInvite,
          token,
          expiresAt,
          requestUrl: c.req.url,
        })),
      },
      201,
    );
  });

  app.patch('/api/v1/workspace-invites/:inviteId', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin']);
    if (currentUser instanceof Response) return currentUser;

    const inviteId = c.req.param('inviteId');
    const patch = normalizeWorkspaceInvitePatch(await c.req.json<Partial<WorkspaceInvitePatch>>());
    const existingInvite = (await store.listWorkspaceInvites()).find((invite) => invite.id === inviteId) ?? null;
    if (!existingInvite) {
      return c.json({ error: 'Workspace invite not found.' }, 404);
    }

    if (patch.status === 'accepted') {
      return c.json({ error: 'Invite acceptance is system-managed when the invited user signs in.' }, 400);
    }

    if (patch.status === 'pending') {
      if (existingInvite.status !== 'revoked') {
        return c.json({ error: 'Only revoked invites can be reopened.' }, 400);
      }

      const existingUser = await store.getWorkspaceUserByEmail(existingInvite.email);
      if (existingUser) {
        return c.json({ error: 'A workspace user already exists for that invite email.' }, 409);
      }

      const otherPendingInvite = await store.getPendingWorkspaceInviteByEmail(existingInvite.email);
      if (otherPendingInvite && otherPendingInvite.id !== inviteId) {
        return c.json({ error: 'Another pending invite already exists for that email.' }, 409);
      }

      if (existingInvite.rosterMemberId) {
        const [workspaceUsers, workspaceInvites] = await Promise.all([store.listWorkspaceUsers(), store.listWorkspaceInvites()]);
        const conflictingWorkspaceUser = findWorkspaceUserByRosterMemberId(workspaceUsers, existingInvite.rosterMemberId);
        if (conflictingWorkspaceUser) {
          return c.json({ error: 'A workspace user is already linked to that roster member.' }, 409);
        }

        const conflictingInvite = findPendingInviteByRosterMemberId(workspaceInvites, existingInvite.rosterMemberId, inviteId);
        if (conflictingInvite) {
          return c.json({ error: 'Another pending invite is already staged for that roster member.' }, 409);
        }
      }
    }

    const workspaceInvite = await store.updateWorkspaceInvite(inviteId, patch);
    if (workspaceInvite && patch.status === 'revoked') {
      await store.createAuditEvent(buildWorkspaceInviteAuditEvent(currentUser, 'workspace_invite_revoked', workspaceInvite));
    }
    if (workspaceInvite && patch.status === 'pending') {
      await store.createAuditEvent(buildWorkspaceInviteAuditEvent(currentUser, 'workspace_invite_reopened', workspaceInvite));
    }
    return c.json({ workspaceInvite });
  });

  app.get('/api/v1/audit-events', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin']);
    if (currentUser instanceof Response) return currentUser;

    const limit = Math.min(50, Math.max(1, Number.parseInt(c.req.query('limit') ?? '20', 10) || 20));
    const auditEvents = await store.listAuditEvents(limit);
    return c.json({ auditEvents });
  });

  app.get('/api/v1/launches', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin', 'manager']);
    if (currentUser instanceof Response) return currentUser;

    const [launches, participantRuns, rosterMembers] = await Promise.all([
      store.listLaunches(),
      store.listParticipantRuns(),
      store.listRosterMembers(),
    ]);
    const visibleRuns = filterParticipantRunsForUser(currentUser, participantRuns, rosterMembers);
    return c.json({ launches: buildLaunches(launches, visibleRuns) });
  });

  app.get('/api/v1/launches/:launchId', async (c) => {
    const launchId = c.req.param('launchId');
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin', 'manager']);
    if (currentUser instanceof Response) return currentUser;

    const [launch, participantRuns, scenarioDrafts, rosterMembers] = await Promise.all([
      store.getLaunch(launchId),
      store.listParticipantRuns(launchId),
      store.listScenarioDrafts(),
      store.listRosterMembers(),
    ]);

    if (!launch) {
      return c.json({ error: 'Launch not found.' }, 404);
    }

    const draftApprovalStatus =
      scenarioDrafts.find((draft) => draft.id === launch.scenarioDraftId)?.approvalStatus ?? 'approved';
    const visibleRuns = filterParticipantRunsForUser(currentUser, participantRuns, rosterMembers);

    return c.json({ launch: buildLaunchDetail(launch, visibleRuns, draftApprovalStatus) });
  });

  app.post('/api/v1/launches', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin']);
    if (currentUser instanceof Response) return currentUser;

    const body = await c.req.json<Partial<LaunchInput>>();
    const input = normalizeLaunchInput(body);
    if (!input) {
      return c.json({ error: 'Invalid launch payload.' }, 400);
    }

    const launch = await store.createLaunch(input);
    if (!launch) {
      return c.json({ error: 'Approved scenario draft not found for launch creation.' }, 400);
    }

    await store.createAuditEvent(buildLaunchAuditEvent(currentUser, null, launch));

    return c.json({ launch }, 201);
  });

  app.patch('/api/v1/launches/:launchId', async (c) => {
    const launchId = c.req.param('launchId');
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin', 'manager']);
    if (currentUser instanceof Response) return currentUser;

    const currentLaunch = await store.getLaunch(launchId);
    if (!currentLaunch) {
      return c.json({ error: 'Launch not found or patch invalid.' }, 404);
    }

    const rosterMembers = await store.listRosterMembers();
    const launchRuns = await store.listParticipantRuns(launchId);
    const visibleLaunchRuns = filterParticipantRunsForUser(currentUser, launchRuns, rosterMembers);

    const patch = normalizeLaunchPatch(await c.req.json());
    if (
      currentUser.role !== 'admin' &&
      (!hasWorkspaceCapability(currentUser, 'resilience_tabletop_facilitate') ||
        visibleLaunchRuns.length === 0 ||
        !isFacilitatorLaunchPatchAllowed(currentLaunch, patch) ||
        Object.keys(patch).length === 0)
    ) {
      return c.json({ error: 'Manager access only allows tabletop status, phase, and facilitator note updates.' }, 403);
    }

    const launch = await store.updateLaunch(launchId, patch);

    if (!launch) {
      return c.json({ error: 'Launch not found or patch invalid.' }, 404);
    }

    await store.createAuditEvent(buildLaunchAuditEvent(currentUser, currentLaunch, launch));

    return c.json({ launch });
  });

  app.post('/api/v1/participant-runs', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin', 'manager']);
    if (currentUser instanceof Response) return currentUser;

    const body = await c.req.json<Partial<ParticipantRunInput>>();
    const input = normalizeParticipantRunInput(body);
    if (!input) {
      return c.json({ error: 'Invalid participant run payload.' }, 400);
    }

    if (currentUser.role === 'manager') {
      const rosterMembers = await store.listRosterMembers();
      const rosterMember = input.rosterMemberId ? rosterMembers.find((member) => member.id === input.rosterMemberId) ?? null : null;
      const targetTeam = rosterMember?.team ?? input.participantTeam ?? null;

      if (!targetTeam) {
        return c.json({ error: 'Managers must assign a participant tied to a scoped team.' }, 400);
      }

      if (!isTeamWithinUserScope(currentUser, targetTeam, rosterMembers)) {
        return c.json({ error: 'Manager access can only assign participants inside the manager team scope.' }, 403);
      }
    }

    const run = await store.createParticipantRun(input);
    if (!run) {
      return c.json({ error: 'Launch or roster member not found for participant assignment.' }, 404);
    }

    const launch = await store.getLaunch(run.launchId);
    if (launch) {
      await store.createAuditEvent(
        buildParticipantAssignmentAuditEvent(
          currentUser,
          launch,
          1,
          `${run.participantName}${run.participantTeam ? ` · ${run.participantTeam}` : ''}`,
        ),
      );
    }

    return c.json({ run }, 201);
  });

  app.post('/api/v1/participant-runs/team-assignments', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin', 'manager']);
    if (currentUser instanceof Response) return currentUser;

    const body = await c.req.json<Partial<ParticipantRunTeamAssignmentInput>>();
    const launchId = body.launchId?.trim();
    const team = body.team?.trim();
    const dueAt = body.dueAt?.trim() ? body.dueAt.trim() : null;

    if (!launchId || !team) {
      return c.json({ error: 'A launch and team are required for team assignment.' }, 400);
    }

    const [launch, rosterMembers, existingRuns] = await Promise.all([
      store.getLaunch(launchId),
      store.listRosterMembers(),
      store.listParticipantRuns(launchId),
    ]);

    if (!launch) {
      return c.json({ error: 'Launch not found for team assignment.' }, 404);
    }

    if (currentUser.role === 'manager' && !isTeamWithinUserScope(currentUser, team, rosterMembers)) {
      return c.json({ error: 'Manager access can only assign teams inside the manager team scope.' }, 403);
    }

    const existingRosterMemberIds = new Set(
      existingRuns.map((run) => run.rosterMemberId).filter((value): value is string => Boolean(value)),
    );
    const eligibleMembers = rosterMembers.filter(
      (member) => member.status === 'active' && member.team === team && !existingRosterMemberIds.has(member.id),
    );

    const createdRuns: ParticipantRun[] = [];
    for (const member of eligibleMembers) {
      const run = await store.createParticipantRun({
        launchId,
        rosterMemberId: member.id,
        participantName: member.fullName,
        participantEmail: member.email,
        participantRole: member.roleTitle,
        participantTeam: member.team,
        dueAt,
      });
      if (run) createdRuns.push(run);
    }

    if (createdRuns.length > 0) {
      await store.createAuditEvent(
        buildParticipantAssignmentAuditEvent(
          currentUser,
          launch,
          createdRuns.length,
          `${team}${dueAt ? ` · due ${dueAt}` : ''}`,
        ),
      );
    }

    return c.json(
      {
        launchId,
        team,
        createdRuns,
        skippedExistingCount: existingRuns.filter((run) => run.participantTeam === team).length,
      },
      201,
    );
  });

  app.get('/api/v1/participant-runs/:runId', async (c) => {
    const runId = c.req.param('runId');
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await resolveCurrentUser(c, store);
    if (currentUser instanceof Response) return currentUser;

    const run = await store.getParticipantRun(runId);

    if (!run) {
      return c.json({ error: 'Participant run not found.' }, 404);
    }

    const rosterMembers = await store.listRosterMembers();
    if (!canAccessParticipantRun(currentUser, run, rosterMembers, 'read')) {
      return c.json({ error: 'You do not have access to this participant run.' }, 403);
    }

    const [launch, launchRuns] = await Promise.all([store.getLaunch(run.launchId), store.listParticipantRuns(run.launchId)]);
    if (!launch) {
      return c.json({ error: 'Launch not found for participant run.' }, 404);
    }

    const visibleLaunchRuns = filterParticipantRunsForUser(currentUser, launchRuns, rosterMembers);

    return c.json({ run: buildParticipantRunDetail(launch, run, visibleLaunchRuns) });
  });

  app.patch('/api/v1/participant-runs/:runId', async (c) => {
    const runId = c.req.param('runId');
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await resolveCurrentUser(c, store);
    if (currentUser instanceof Response) return currentUser;

    const existingRun = await store.getParticipantRun(runId);
    if (!existingRun) {
      return c.json({ error: 'Participant run not found.' }, 404);
    }
    const rosterMembers = await store.listRosterMembers();
    if (!canAccessParticipantRun(currentUser, existingRun, rosterMembers, 'write')) {
      return c.json({ error: 'You do not have access to update this participant run.' }, 403);
    }

    const patch = normalizeParticipantRunPatch(await c.req.json<Partial<ParticipantRunPatch>>());
    const run = await store.updateParticipantRun(runId, patch);

    if (!run) {
      return c.json({ error: 'Participant run not found.' }, 404);
    }

    if (existingRun.status !== 'submitted' && run.status === 'submitted') {
      const launch = await store.getLaunch(run.launchId);
      if (launch) {
        await store.createAuditEvent(buildParticipantRunSubmissionAuditEvent(currentUser, launch, run));
      }
    }

    return c.json({ run });
  });

  app.get('/api/v1/reports/:launchId', async (c) => {
    const launchId = c.req.param('launchId');
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin', 'manager']);
    if (currentUser instanceof Response) return currentUser;

    const [launch, participantRuns, rosterMembers] = await Promise.all([
      store.getLaunch(launchId),
      store.listParticipantRuns(launchId),
      store.listRosterMembers(),
    ]);

    if (!launch) {
      return c.json({ error: 'Report not found.' }, 404);
    }

    const visibleRuns = filterParticipantRunsForUser(currentUser, participantRuns, rosterMembers);
    if (currentUser.role === 'manager' && visibleRuns.length === 0) {
      return c.json({ error: 'Report not found.' }, 404);
    }

    return c.json({ report: buildReportDetail(launch, visibleRuns) });
  });

  app.patch('/api/v1/reports/:launchId/review', async (c) => {
    const launchId = c.req.param('launchId');
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin']);
    if (currentUser instanceof Response) return currentUser;

    const [launch, participantRuns] = await Promise.all([
      store.getLaunch(launchId),
      store.listParticipantRuns(launchId),
    ]);

    if (!launch) {
      return c.json({ error: 'Report not found.' }, 404);
    }

    const body = (await c.req.json().catch(() => null)) as {
      closeoutNotes?: unknown;
      followUpText?: unknown;
      markClosed?: unknown;
    } | null;

    if (!body) {
      return c.json({ error: 'Invalid report review payload.' }, 400);
    }

    const closeoutNotes = typeof body.closeoutNotes === 'string' ? body.closeoutNotes.trim() : '';
    const followUpText = typeof body.followUpText === 'string' ? body.followUpText.trim() : '';
    const markClosed = body.markClosed === true;
    const currentReport = buildReportDetail(launch, participantRuns);

    if (markClosed && currentReport.evidenceStatus !== 'ready') {
      return c.json({ error: 'Evidence closeout requires at least one submitted response.' }, 400);
    }

    const updatedLaunch = await store.updateReportReview(launchId, {
      closeoutNotes,
      followUpText,
      markClosed,
      actorUserId: currentUser.id,
      actorName: currentUser.fullName,
    });

    if (!updatedLaunch) {
      return c.json({ error: 'Unable to update report review.' }, 500);
    }

    await store.createAuditEvent(buildReportCloseoutAuditEvent(currentUser, updatedLaunch, markClosed));

    return c.json({ report: buildReportDetail(updatedLaunch, participantRuns) });
  });

  app.get('/api/v1/reports/:launchId/export', async (c) => {
    const launchId = c.req.param('launchId');
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin', 'manager']);
    if (currentUser instanceof Response) return currentUser;

    const format = c.req.query('format') ?? 'markdown';

    if (!isReportExportFormat(format)) {
      return c.json({ error: 'Invalid report export format.' }, 400);
    }

    const [launch, participantRuns, rosterMembers] = await Promise.all([
      store.getLaunch(launchId),
      store.listParticipantRuns(launchId),
      store.listRosterMembers(),
    ]);

    if (!launch) {
      return c.json({ error: 'Report not found.' }, 404);
    }

    const visibleRuns = filterParticipantRunsForUser(currentUser, participantRuns, rosterMembers);
    if (currentUser.role === 'manager' && visibleRuns.length === 0) {
      return c.json({ error: 'Report not found.' }, 404);
    }

    const exportFile = buildReportExportFile(launch, visibleRuns, format);

    c.header('Content-Type', exportFile.mimeType);
    c.header('Content-Disposition', `attachment; filename="${exportFile.fileName}"`);
    c.header('Cache-Control', 'no-store');
    c.header('X-Export-Generated-At', exportFile.generatedAt);

    return c.body(exportFile.content);
  });

  app.onError((error, c) => {
    console.error('[resilience-api] request failed', error);
    return c.json({ error: 'Internal server error.' }, 500);
  });

  return app;
}

async function buildBootstrapPayload(
  store: ResilienceStore,
  currentUser: WorkspaceUser,
  availableUsers: WorkspaceUser[],
  env?: Bindings,
): Promise<BootstrapPayload> {
  const [
    documents,
    contextBuckets,
    scenarioDrafts,
    rosterMembers,
    workspaceInvites,
    launches,
    participantRuns,
    auditEvents,
  ] = await Promise.all([
    store.listSourceDocuments(),
    store.listContextBuckets(),
    store.listScenarioDrafts(),
    store.listRosterMembers(),
    store.listWorkspaceInvites(),
    store.listLaunches(),
    store.listParticipantRuns(),
    currentUser.role === 'admin' ? store.listAuditEvents(12) : Promise.resolve([]),
  ]);

  const filteredDocuments =
    isLocalStage(env)
      ? documents.filter((document) => !isPreviewNoiseDocument(document))
      : documents;
  const visibleParticipantRuns = filterParticipantRunsForUser(currentUser, participantRuns, rosterMembers);
  const participantAssignments = visibleParticipantRuns;
  const launchIdsForParticipant = new Set(visibleParticipantRuns.map((run) => run.launchId));
  const visibleLaunches =
    currentUser.role === 'user'
      ? launches.filter((launch) => launchIdsForParticipant.has(launch.id))
      : launches;
  const visibleDocuments = currentUser.role === 'admin' ? filteredDocuments : [];
  const visibleContextBuckets = currentUser.role === 'admin' ? contextBuckets : [];
  const visibleScenarioDrafts = currentUser.role === 'admin' ? scenarioDrafts : [];
  const visibleRosterMembers = filterRosterMembersForUser(currentUser, rosterMembers);
  const visibleWorkspaceInvites = currentUser.role === 'admin' ? workspaceInvites : [];
  const visibleReports =
    currentUser.role === 'user' ? [] : buildReports(visibleLaunches, visibleParticipantRuns);
  const overview =
    currentUser.role === 'user'
      ? {
          programHealth: [],
          pendingApprovals: [],
          upcomingExercises: [],
          overdueAssignments: [],
          evidenceReady: [],
          recentAfterActions: [],
          coverageGaps: [],
        }
      : buildOverviewData(
          visibleDocuments,
          visibleScenarioDrafts,
          visibleLaunches,
          visibleParticipantRuns,
          visibleRosterMembers,
        );

  return {
    appName: env?.APP_NAME ?? 'Altira Resilience',
    stage: getAppStage(env),
    currentUser,
    availableUsers: filterWorkspaceUsersForUser(currentUser, availableUsers, rosterMembers),
    workspaceInvites: visibleWorkspaceInvites,
    auditEvents,
    nav: adminNav.filter((item) => canAccessNav(currentUser.role, item.id)),
    summaryCards: overview.programHealth,
    overview,
    sourceLibrary: visibleDocuments,
    organizationContext: visibleContextBuckets,
    scenarioTemplates,
    scenarioDrafts: visibleScenarioDrafts,
    rosterMembers: visibleRosterMembers,
    participantAssignments,
    launches: buildLaunches(visibleLaunches, visibleParticipantRuns),
    reports: visibleReports,
  };
}

function isPreviewNoiseDocument(document: DocumentSummary): boolean {
  const normalizedOwner = document.owner.trim().toLowerCase();
  const normalizedName = document.name.trim().toLowerCase();

  if (normalizedOwner === 'codex validation' || normalizedOwner === 'smoke test' || normalizedOwner === 'validation runner') {
    return true;
  }

  return normalizedName.includes('validation') || normalizedName.includes('smoke test');
}

export function resolveStore(env: Bindings, storeOverride?: ResilienceStore): ResilienceStore {
  if (storeOverride) return storeOverride;
  if (env.STORE) return env.STORE;
  if (env.DB) return new D1ResilienceStore(env.DB);
  return fallbackStore;
}

function readFormString(form: FormData, key: string): string | null {
  const value = form.get(key);
  return typeof value === 'string' ? value : null;
}

function findRosterMemberByEmail(
  rosterMembers: RosterMember[],
  email: string,
  excludedRosterMemberId?: string,
): RosterMember | null {
  const normalizedEmail = normalizeIdentityEmail(email);
  return (
    rosterMembers.find(
      (member) => member.id !== excludedRosterMemberId && normalizeIdentityEmail(member.email) === normalizedEmail,
    ) ?? null
  );
}

function findWorkspaceUserByRosterMemberId(
  workspaceUsers: WorkspaceUser[],
  rosterMemberId: string,
  excludedWorkspaceUserId?: string | null,
): WorkspaceUser | null {
  return (
    workspaceUsers.find((user) => user.id !== excludedWorkspaceUserId && user.rosterMemberId === rosterMemberId) ?? null
  );
}

function findPendingInviteByRosterMemberId(
  workspaceInvites: WorkspaceInvite[],
  rosterMemberId: string,
  excludedInviteId?: string,
): WorkspaceInvite | null {
  return (
    workspaceInvites.find(
      (invite) =>
        invite.id !== excludedInviteId && invite.status === 'pending' && invite.rosterMemberId === rosterMemberId,
    ) ?? null
  );
}

async function resolveCurrentUser(c: AppContext, store: ResilienceStore): Promise<WorkspaceUser | Response> {
  const session = await requireResolvedSession(c, store);
  if (session instanceof Response) return session;
  return session.currentUser;
}

async function requireWorkspaceRole(
  c: AppContext,
  store: ResilienceStore,
  allowedRoles: WorkspaceUserRole[],
): Promise<WorkspaceUser | Response> {
  const currentUser = await resolveCurrentUser(c, store);
  if (currentUser instanceof Response) return currentUser;

  if (!allowedRoles.includes(currentUser.role)) {
    return c.json({ error: 'This role does not have access to that workflow.' }, 403);
  }

  return currentUser;
}

async function requireResolvedSession(
  c: AppContext,
  store: ResilienceStore,
): Promise<{ currentUser: WorkspaceUser; availableUsers: WorkspaceUser[]; session: AuthSession | null } | Response> {
  const availableUsers = await store.listWorkspaceUsers();
  const resolved = await resolveOptionalSessionUser(c, store, availableUsers);

  if (!resolved) {
    return c.json({ error: 'Sign in to continue.' }, 401);
  }

  if (resolved.currentUser.status !== 'active') {
    return c.json({ error: 'Current workspace user is inactive.' }, 403);
  }

  return {
    currentUser: resolved.currentUser,
    availableUsers,
    session: resolved.session,
  };
}

async function resolveOptionalSessionUser(
  c: AppContext,
  store: ResilienceStore,
  availableUsers?: WorkspaceUser[],
  options?: { allowDebugHeader?: boolean },
): Promise<{ currentUser: WorkspaceUser; session: AuthSession | null } | null> {
  const users = availableUsers ?? (await store.listWorkspaceUsers());
  const cookieToken = getCookie(c, SESSION_COOKIE_NAME);

  if (cookieToken) {
    const tokenHash = await hashSessionToken(cookieToken);
    const session = await store.getAuthSessionByTokenHash(tokenHash);

    if (session) {
      const currentUser = await store.getWorkspaceUser(session.workspaceUserId);
      if (currentUser && currentUser.status === 'active') {
        const touchedSession = await store.touchAuthSession(session.id);
        return {
          currentUser,
          session: touchedSession ?? session,
        };
      }
    }
  }

  if ((options?.allowDebugHeader ?? true) && isDebugAuthHeaderAllowed(c.env)) {
    const requestedUserId = c.req.header(CURRENT_USER_HEADER);
    if (requestedUserId) {
      const currentUser = users.find((user) => user.id === requestedUserId) ?? null;
      if (currentUser && currentUser.status === 'active') {
        return { currentUser, session: null };
      }
    }
  }

  return null;
}

function buildAuthSessionStatePayload(
  env: Bindings | undefined,
  availableUsers: WorkspaceUser[],
  resolved: { currentUser: WorkspaceUser; session: AuthSession | null } | null,
): AuthSessionState {
  return {
    authenticated: Boolean(resolved),
    currentUser: resolved?.currentUser ?? null,
    session: resolved?.session ?? null,
    signInMode: 'workspace_email',
    previewAccounts: buildPreviewAccounts(env, availableUsers),
  };
}

function buildPreviewAccounts(env: Bindings | undefined, availableUsers: WorkspaceUser[]): PreviewAuthAccount[] {
  if (!isDebugAuthHeaderAllowed(env)) return [];

  return availableUsers
    .filter((user) => user.status === 'active')
    .map((user) => ({
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    }));
}

function isDebugAuthHeaderAllowed(env: Bindings | undefined): boolean {
  return (env?.ALLOW_DEBUG_AUTH ?? '').trim().toLowerCase() === 'true';
}

function getAppStage(env: Bindings | undefined): string {
  return env?.APP_STAGE?.trim() || 'local';
}

function isLocalStage(env: Bindings | undefined): boolean {
  const stage = getAppStage(env).toLowerCase();
  return stage === 'local' || stage === 'scaffold';
}

function resolveCorsOrigin(env: Bindings | undefined, origin: string | undefined): string | null {
  if (!origin) return null;

  const configuredOrigins = parseAllowedOrigins(env?.APP_ALLOWED_ORIGINS);
  if (configuredOrigins.length > 0) {
    if (configuredOrigins.includes(origin)) {
      return origin;
    }

    if (isAllowedPagesPreviewOrigin(env, origin, configuredOrigins)) {
      return origin;
    }

    return null;
  }

  if (isLocalStage(env) && isLoopbackOrigin(origin)) {
    return origin;
  }

  return null;
}

function buildCorsHeaders(env: Bindings | undefined, origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': buildCorsAllowHeaders(env).join(', '),
    'Access-Control-Expose-Headers': 'Content-Disposition, Content-Type, X-Export-Generated-At',
    Vary: 'Origin',
  };
}

function buildCorsAllowHeaders(env: Bindings | undefined): string[] {
  const headers = ['Content-Type'];
  if (isDebugAuthHeaderAllowed(env)) {
    headers.push('X-Resilience-User-Id');
  }
  return headers;
}

function parseAllowedOrigins(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isAllowedPagesPreviewOrigin(
  env: Bindings | undefined,
  origin: string,
  configuredOrigins: string[],
): boolean {
  if (getAppStage(env).toLowerCase() !== 'preview') {
    return false;
  }

  try {
    const originUrl = new URL(origin);
    const hasPagesProjectOrigin = configuredOrigins.some((entry) => new URL(entry).hostname === 'altira-resilience-web.pages.dev');

    if (!hasPagesProjectOrigin) {
      return false;
    }

    return (
      originUrl.hostname === 'altira-resilience-web.pages.dev' ||
      originUrl.hostname.endsWith('.altira-resilience-web.pages.dev')
    );
  } catch {
    return false;
  }
}

function isLoopbackOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.hostname === '127.0.0.1' || url.hostname === 'localhost';
  } catch {
    return false;
  }
}

function createSessionToken(): string {
  return `${crypto.randomUUID()}.${crypto.randomUUID()}`;
}

async function hashSessionToken(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function isoFromNow(ttlSeconds: number): string {
  return new Date(Date.now() + ttlSeconds * 1000).toISOString();
}

function isSecureRequest(c: AppContext): boolean {
  const forwardedProto = c.req.header('x-forwarded-proto');
  if (forwardedProto) {
    return forwardedProto === 'https';
  }
  return c.req.url.startsWith('https://');
}

function isLocalRequest(c: AppContext): boolean {
  try {
    const hostname = new URL(c.req.url).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  } catch {
    return false;
  }
}

function canAccessNav(role: WorkspaceUserRole, navId: AdminNavId): boolean {
  if (role === 'admin') return true;
  if (role === 'manager') return navId === 'home' || navId === 'launches' || navId === 'reports' || navId === 'roster';
  return navId === 'home';
}

function filterWorkspaceUsersForUser(
  currentUser: WorkspaceUser,
  workspaceUsers: WorkspaceUser[],
  rosterMembers: RosterMember[],
): WorkspaceUser[] {
  if (currentUser.role === 'admin') return workspaceUsers;
  if (currentUser.role === 'manager') {
    const visibleRosterIds = new Set(filterRosterMembersForUser(currentUser, rosterMembers).map((member) => member.id));
    return workspaceUsers.filter(
      (user) => user.id === currentUser.id || (user.rosterMemberId ? visibleRosterIds.has(user.rosterMemberId) : false),
    );
  }

  return workspaceUsers.filter((user) => user.id === currentUser.id);
}

function filterRosterMembersForUser(
  currentUser: WorkspaceUser,
  rosterMembers: RosterMember[],
): RosterMember[] {
  if (currentUser.role === 'admin') return rosterMembers;
  if (currentUser.role === 'manager') {
    const scopeTeams = resolveManagerScopeTeams(currentUser, rosterMembers);
    if (scopeTeams.size === 0) return [];
    return rosterMembers.filter((member) => scopeTeams.has(member.team));
  }
  if (currentUser.rosterMemberId) {
    return rosterMembers.filter((member) => member.id === currentUser.rosterMemberId);
  }
  return [];
}

function filterParticipantRunsForUser(
  currentUser: WorkspaceUser,
  participantRuns: ParticipantRun[],
  rosterMembers: RosterMember[],
): ParticipantRun[] {
  if (currentUser.role === 'user') {
    return participantRuns.filter(
      (run) => Boolean(currentUser.rosterMemberId) && run.rosterMemberId === currentUser.rosterMemberId,
    );
  }

  if (currentUser.role === 'manager') {
    const scopeTeams = resolveManagerScopeTeams(currentUser, rosterMembers);
    if (scopeTeams.size === 0) return [];
    const rosterById = new Map(rosterMembers.map((member) => [member.id, member]));
    return participantRuns.filter((run) => {
      const team = resolveRunTeam(run, rosterById);
      return team ? scopeTeams.has(team) : false;
    });
  }

  return participantRuns;
}

function canAccessParticipantRun(
  currentUser: WorkspaceUser,
  run: ParticipantRun,
  rosterMembers: RosterMember[],
  mode: 'read' | 'write',
): boolean {
  if (currentUser.role === 'admin') return true;
  if (mode === 'read' && currentUser.role === 'manager') {
    const scopeTeams = resolveManagerScopeTeams(currentUser, rosterMembers);
    if (scopeTeams.size === 0) return false;
    const rosterById = new Map(rosterMembers.map((member) => [member.id, member]));
    const team = resolveRunTeam(run, rosterById);
    return team ? scopeTeams.has(team) : false;
  }
  if (currentUser.role === 'user' && currentUser.rosterMemberId) {
    return run.rosterMemberId === currentUser.rosterMemberId;
  }
  return false;
}

function resolveManagerScopeTeams(currentUser: WorkspaceUser, rosterMembers: RosterMember[]): Set<string> {
  if (currentUser.role !== 'manager') return new Set();
  if (currentUser.scopeTeams.length > 0) return new Set(currentUser.scopeTeams);

  if (!currentUser.rosterMemberId) return new Set();
  const linkedRosterMember = rosterMembers.find((member) => member.id === currentUser.rosterMemberId) ?? null;
  return linkedRosterMember?.team ? new Set([linkedRosterMember.team]) : new Set();
}

function isTeamWithinUserScope(currentUser: WorkspaceUser, team: string, rosterMembers: RosterMember[]): boolean {
  if (currentUser.role === 'admin') return true;
  if (currentUser.role !== 'manager') return false;

  const scopeTeams = resolveManagerScopeTeams(currentUser, rosterMembers);
  return scopeTeams.has(team);
}

function resolveRunTeam(
  run: ParticipantRun,
  rosterById: Map<string, RosterMember>,
): string | null {
  if (run.participantTeam) return run.participantTeam;
  if (!run.rosterMemberId) return null;
  return rosterById.get(run.rosterMemberId)?.team ?? null;
}

function hasWorkspaceCapability(user: WorkspaceUser, capability: WorkspaceUserCapability): boolean {
  return user.capabilities.includes(capability);
}

function isFacilitatorLaunchPatchAllowed(launch: Launch, patch: LaunchPatch) {
  if (launch.mode !== 'tabletop') return false;
  const allowedKeys = new Set(['status', 'tabletopPhase', 'facilitatorNotes']);
  return Object.keys(patch).every((key) => allowedKeys.has(key));
}

function prepareScenarioDraftForSave(
  input: ScenarioDraftInput,
  actor: WorkspaceUser,
): { input: ScenarioDraftInput } | { error: string } {
  const reviewerNotes = normalizeDraftReviewerNotes(input.reviewerNotes);

  if (input.approvalStatus === 'changes_requested' && !reviewerNotes) {
    return { error: 'Requesting changes requires reviewer notes.' };
  }

  if (input.approvalStatus === 'approved' || input.approvalStatus === 'changes_requested') {
    return {
      input: {
        ...input,
        reviewerNotes,
        reviewedAt: nowIso(),
        reviewedByUserId: actor.id,
        reviewedByName: actor.fullName,
      },
    };
  }

  return {
    input: {
      ...input,
      reviewerNotes,
      reviewedAt: null,
      reviewedByUserId: null,
      reviewedByName: null,
    },
  };
}

function prepareScenarioDraftPatchForSave(
  patch: Partial<ScenarioDraftInput>,
  current: ScenarioDraft,
  actor: WorkspaceUser,
): { patch: Partial<ScenarioDraftInput> } | { error: string } {
  const nextReviewerNotes =
    patch.reviewerNotes === undefined ? current.reviewerNotes : normalizeDraftReviewerNotes(patch.reviewerNotes);

  if (patch.approvalStatus === 'changes_requested' && !nextReviewerNotes) {
    return { error: 'Requesting changes requires reviewer notes.' };
  }

  if (patch.approvalStatus === 'approved' || patch.approvalStatus === 'changes_requested') {
    return {
      patch: {
        ...patch,
        reviewerNotes: nextReviewerNotes,
        reviewedAt: nowIso(),
        reviewedByUserId: actor.id,
        reviewedByName: actor.fullName,
      },
    };
  }

  return {
    patch: {
      ...patch,
      reviewerNotes: patch.reviewerNotes === undefined ? undefined : nextReviewerNotes,
      reviewedAt: undefined,
      reviewedByUserId: undefined,
      reviewedByName: undefined,
    },
  };
}

function normalizeDraftReviewerNotes(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function buildScenarioDraftAuditEvent(
  actor: WorkspaceUser,
  previous: ScenarioDraft | null,
  next: ScenarioDraft,
): Parameters<ResilienceStore['createAuditEvent']>[0] | null {
  if (next.approvalStatus === 'ready_for_review' && previous?.approvalStatus !== 'ready_for_review') {
    return {
      category: 'operations',
      action: 'scenario_draft_submitted',
      targetType: 'scenario_draft',
      targetId: next.id,
      actorUserId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      summary: `${actor.fullName} submitted scenario draft ${next.title} for review.`,
      detail: buildScenarioDraftAuditDetail(next),
    };
  }

  if (next.approvalStatus === 'approved' && previous?.approvalStatus !== 'approved') {
    return {
      category: 'operations',
      action: 'scenario_draft_approved',
      targetType: 'scenario_draft',
      targetId: next.id,
      actorUserId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      summary: `${actor.fullName} approved scenario draft ${next.title}.`,
      detail: buildScenarioDraftAuditDetail(next),
    };
  }

  if (next.approvalStatus === 'changes_requested' && previous?.approvalStatus !== 'changes_requested') {
    return {
      category: 'operations',
      action: 'scenario_draft_changes_requested',
      targetType: 'scenario_draft',
      targetId: next.id,
      actorUserId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      summary: `${actor.fullName} requested changes on scenario draft ${next.title}.`,
      detail: buildScenarioDraftAuditDetail(next),
    };
  }

  return null;
}

function buildScenarioDraftAuditDetail(draft: ScenarioDraft): string {
  const note = draft.reviewerNotes ? ` · note ${draft.reviewerNotes}` : '';
  return `${draft.audience} · ${draft.launchMode === 'tabletop' ? 'Tabletop' : 'Individual'} · trigger ${draft.triggerEvent}${note}`;
}

function buildWorkspaceUserAuditEvent(
  actor: WorkspaceUser,
  previous: WorkspaceUser | null,
  next: WorkspaceUser,
): Parameters<ResilienceStore['createAuditEvent']>[0] {
  if (!previous) {
    return {
      category: 'access',
      action: 'workspace_user_created',
      targetType: 'workspace_user',
      targetId: next.id,
      actorUserId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      summary: `${actor.fullName} created workspace user ${next.fullName} as ${next.role}.`,
      detail: buildWorkspaceUserAuditDetail(next),
    };
  }

  if (previous.status !== next.status) {
    const action = next.status === 'active' ? 'workspace_user_reactivated' : 'workspace_user_deactivated';
    const verb = next.status === 'active' ? 'reactivated' : 'deactivated';
    return {
      category: 'access',
      action,
      targetType: 'workspace_user',
      targetId: next.id,
      actorUserId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      summary: `${actor.fullName} ${verb} workspace user ${next.fullName}.`,
      detail: buildWorkspaceUserAuditDetail(next),
    };
  }

  if (previous.role !== next.role || previous.scopeTeams.join('|') !== next.scopeTeams.join('|')) {
    return {
      category: 'access',
      action: next.role === 'manager' ? 'manager_scope_updated' : 'workspace_user_updated',
      targetType: 'workspace_user',
      targetId: next.id,
      actorUserId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      summary:
        next.role === 'manager'
          ? `${actor.fullName} updated ${next.fullName} scope to ${formatAuditScopeTeams(next.scopeTeams)}.`
          : `${actor.fullName} updated workspace user ${next.fullName}.`,
      detail: buildWorkspaceUserAuditDetail(next),
    };
  }

  return {
    category: 'access',
    action: 'workspace_user_updated',
    targetType: 'workspace_user',
    targetId: next.id,
    actorUserId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.role,
    summary: `${actor.fullName} updated workspace user ${next.fullName}.`,
    detail: buildWorkspaceUserAuditDetail(next),
  };
}

function buildWorkspaceInviteAuditEvent(
  actor: WorkspaceUser,
  action: 'workspace_invite_created' | 'workspace_invite_revoked' | 'workspace_invite_reopened' | 'workspace_invite_accepted',
  invite: WorkspaceInvite,
  detail?: string,
): Parameters<ResilienceStore['createAuditEvent']>[0] {
  const summaryByAction = {
    workspace_invite_created: `${actor.fullName} created a workspace invite for ${invite.fullName}.`,
    workspace_invite_revoked: `${actor.fullName} revoked the workspace invite for ${invite.fullName}.`,
    workspace_invite_reopened: `${actor.fullName} reopened the workspace invite for ${invite.fullName}.`,
    workspace_invite_accepted: `${actor.fullName} accepted a staged workspace invite.`,
  } satisfies Record<typeof action, string>;

  return {
    category: 'access',
    action,
    targetType: 'workspace_invite',
    targetId: invite.id,
    actorUserId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.role,
    summary: summaryByAction[action],
    detail: detail ?? `${invite.email} · role ${invite.role}${invite.scopeTeams.length ? ` · scope ${invite.scopeTeams.join(', ')}` : ''}`,
  };
}

function buildLaunchAuditEvent(
  actor: WorkspaceUser,
  previous: Launch | null,
  next: Launch,
): Parameters<ResilienceStore['createAuditEvent']>[0] {
  return {
    category: 'operations',
    action: previous ? 'launch_updated' : 'launch_created',
    targetType: 'launch',
    targetId: next.id,
    actorUserId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.role,
    summary: previous
      ? `${actor.fullName} updated launch ${next.name}.`
      : `${actor.fullName} created launch ${next.name}.`,
    detail: `Status ${next.status}${next.tabletopPhase ? ` · phase ${next.tabletopPhase}` : ''}${next.startsAt ? ` · starts ${next.startsAt}` : ''}`,
  };
}

function buildParticipantAssignmentAuditEvent(
  actor: WorkspaceUser,
  launch: Launch,
  createdCount: number,
  detail: string,
): Parameters<ResilienceStore['createAuditEvent']>[0] {
  return {
    category: 'operations',
    action: 'participant_assignment_created',
    targetType: 'launch',
    targetId: launch.id,
    actorUserId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.role,
    summary: `${actor.fullName} created ${createdCount} participant assignment${createdCount === 1 ? '' : 's'} for ${launch.name}.`,
    detail,
  };
}

function buildParticipantRunSubmissionAuditEvent(
  actor: WorkspaceUser,
  launch: Launch,
  run: ParticipantRun,
): Parameters<ResilienceStore['createAuditEvent']>[0] {
  return {
    category: 'operations',
    action: 'participant_run_submitted',
    targetType: 'participant_run',
    targetId: run.id,
    actorUserId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.role,
    summary: `${actor.fullName} submitted an exercise response for ${launch.name}.`,
    detail: `${run.participantName}${run.participantTeam ? ` · ${run.participantTeam}` : ''}`,
  };
}

function buildReportCloseoutAuditEvent(
  actor: WorkspaceUser,
  launch: Launch,
  markClosed: boolean,
): Parameters<ResilienceStore['createAuditEvent']>[0] {
  return {
    category: 'operations',
    action: 'launch_updated',
    targetType: 'launch',
    targetId: launch.id,
    actorUserId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.role,
    summary: markClosed
      ? `${actor.fullName} closed the evidence package for ${launch.name}.`
      : `${actor.fullName} updated the evidence closeout record for ${launch.name}.`,
    detail: markClosed
      ? `${launch.reportClosedAt ?? 'Closed'}${launch.reportClosedByName ? ` · by ${launch.reportClosedByName}` : ''}`
      : 'Evidence package reopened or closeout notes updated.',
  };
}

function buildWorkspaceUserAuditDetail(user: WorkspaceUser): string {
  const scope =
    user.role === 'admin'
      ? 'workspace-wide'
      : user.role === 'manager'
        ? formatAuditScopeTeams(user.scopeTeams)
        : 'linked roster only';
  return `Role ${user.role} · status ${user.status} · scope ${scope}`;
}

function formatAuditScopeTeams(scopeTeams: string[]): string {
  return scopeTeams.length ? scopeTeams.join(', ') : 'no explicit team scope';
}

function inferMimeTypeFromFileName(fileName: string): string {
  const normalized = fileName.toLowerCase();
  if (normalized.endsWith('.md') || normalized.endsWith('.markdown')) return 'text/markdown';
  if (normalized.endsWith('.csv')) return 'text/csv';
  if (normalized.endsWith('.json')) return 'application/json';
  if (normalized.endsWith('.pdf')) return 'application/pdf';
  if (normalized.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (normalized.endsWith('.doc')) return 'application/msword';
  if (normalized.endsWith('.xlsx')) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  if (normalized.endsWith('.xls')) return 'application/vnd.ms-excel';
  if (normalized.endsWith('.pptx')) {
    return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  }
  if (normalized.endsWith('.ppt')) return 'application/vnd.ms-powerpoint';
  if (normalized.endsWith('.png')) return 'image/png';
  if (normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')) return 'image/jpeg';
  if (normalized.endsWith('.webp')) return 'image/webp';
  return 'text/plain';
}

function isReportExportFormat(value: string): value is ReportExportFormat {
  return value === 'json' || value === 'markdown';
}

function buildSourceDocumentObjectKey(fileName: string): string {
  return `source-documents/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${sanitizeObjectSegment(fileName)}`;
}

function sanitizeObjectSegment(fileName: string): string {
  return fileName.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'source-file';
}

function buildPendingExtractionNote(fileName: string, mimeType: string, storageBackend: 'inline' | 'r2'): string {
  const normalized = mimeType.toLowerCase();
  const storageLabel = storageBackend === 'r2' ? 'Stored in R2.' : 'Stored inline.';

  if (normalized === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
    return `${storageLabel} PDF text extraction is still pending, so no suggestions were generated yet.`;
  }

  if (normalized.includes('wordprocessingml') || normalized === 'application/msword' || /\.(doc|docx)$/i.test(fileName)) {
    return `${storageLabel} Word-document text extraction is still pending, so no suggestions were generated yet.`;
  }

  if (normalized.includes('spreadsheetml') || normalized === 'application/vnd.ms-excel' || /\.(xls|xlsx)$/i.test(fileName)) {
    return `${storageLabel} Spreadsheet text extraction is still pending, so no suggestions were generated yet.`;
  }

  if (normalized.includes('presentationml') || normalized === 'application/vnd.ms-powerpoint' || /\.(ppt|pptx)$/i.test(fileName)) {
    return `${storageLabel} Presentation text extraction is still pending, so no suggestions were generated yet.`;
  }

  if (normalized.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(fileName)) {
    return `${storageLabel} Image OCR is still pending, so no suggestions were generated yet.`;
  }

  return `${storageLabel} Text extraction is still pending, so no suggestions were generated yet.`;
}

function buildQueuedExtractionNote(fileName: string, mimeType: string): string {
  const normalized = mimeType.toLowerCase();

  if (normalized === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
    return 'Stored in R2. No usable text was available on upload, so a background PDF extraction follow-up was queued.';
  }

  if (normalized.includes('wordprocessingml') || /\.(doc|docx)$/i.test(fileName)) {
    return 'Stored in R2. No usable text was available on upload, so a background Word-document follow-up was queued.';
  }

  if (normalized.includes('spreadsheetml') || /\.(xls|xlsx)$/i.test(fileName)) {
    return 'Stored in R2. No usable text was available on upload, so a background spreadsheet follow-up was queued.';
  }

  if (normalized.includes('presentationml') || /\.(ppt|pptx)$/i.test(fileName)) {
    return 'Stored in R2. No usable text was available on upload, so a background presentation follow-up was queued.';
  }

  if (normalized.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(fileName)) {
    return 'Stored in R2. No usable text was available on upload, so a background image OCR follow-up was queued.';
  }

  return 'Stored in R2. No usable text was available on upload, so a background extraction follow-up was queued.';
}

async function readStoredSourceDocumentBytes(
  document: SourceDocumentDetail,
  bucket?: R2Bucket,
): Promise<Uint8Array | null> {
  if (document.storageBackend !== 'r2' || !document.storageObjectKey || !bucket) {
    return null;
  }

  const object = await bucket.get(document.storageObjectKey);
  if (!object) return null;

  return new Uint8Array(await object.arrayBuffer());
}

function nowIso(): string {
  return new Date().toISOString();
}
