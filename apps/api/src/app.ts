import { Hono } from 'hono';
import type { Context } from 'hono';
import { cors } from 'hono/cors';
import type {
  AdminNavId,
  BootstrapPayload,
  ContextItemInput,
  Launch,
  LaunchInput,
  LaunchPatch,
  ParticipantRun,
  ParticipantRunInput,
  ParticipantRunPatch,
  ReportExportFormat,
  RosterMemberInput,
  RosterMemberPatch,
  ScenarioDraftInput,
  SourceDocumentDetail,
  SourceDocumentInput,
  SourceDocumentUploadInput,
  SuggestionStatus,
  WorkspaceUser,
  WorkspaceUserRole,
} from '@resilience/shared';
import { adminNav, scenarioTemplates } from './config';
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
  DB?: D1Database;
  AI?: SourceAiBinding;
  SOURCE_DOCUMENTS_BUCKET?: R2Bucket;
  SOURCE_EXTRACTION_QUEUE?: Queue<SourceExtractionQueueMessage>;
  STORE?: ResilienceStore;
};

const fallbackStore = new MemoryResilienceStore();
const MAX_SOURCE_UPLOAD_BYTES = 5_000_000;
const CURRENT_USER_HEADER = 'x-resilience-user-id';
type AppContext = Context<{ Bindings: Bindings }>;

export function createApp(storeOverride?: ResilienceStore) {
  const app = new Hono<{ Bindings: Bindings }>();

  app.use(
    '*',
    cors({
      origin: '*',
      allowMethods: ['GET', 'POST', 'PATCH'],
      allowHeaders: ['Content-Type', 'X-Resilience-User-Id'],
    }),
  );

  app.get('/health', (c) =>
    c.json({
      ok: true,
      app: c.env?.APP_NAME ?? 'Altira Resilience',
      stage: c.env?.APP_STAGE ?? 'scaffold',
    }),
  );

  app.get('/api/v1/bootstrap', async (c) => {
    const store = resolveStore(c.env ?? {}, storeOverride);
    const session = await resolveSessionUser(store, c.req.header(CURRENT_USER_HEADER));
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
      return c.json({ error: 'Upload exceeds the 5 MB limit for this slice.' }, 400);
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

    const draft = await store.createScenarioDraft(input);
    return c.json({ draft }, 201);
  });

  app.patch('/api/v1/scenario-drafts/:draftId', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin']);
    if (currentUser instanceof Response) return currentUser;

    const draftId = c.req.param('draftId');
    const patch = normalizeScenarioDraftPatch(await c.req.json());
    const draft = await store.updateScenarioDraft(draftId, patch);

    if (!draft) {
      return c.json({ error: 'Scenario draft not found.' }, 404);
    }

    return c.json({ draft });
  });

  app.get('/api/v1/roster-members', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin']);
    if (currentUser instanceof Response) return currentUser;

    const rosterMembers = await store.listRosterMembers();
    return c.json({ rosterMembers });
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

    const rosterMember = await store.createRosterMember(input);
    return c.json({ rosterMember }, 201);
  });

  app.patch('/api/v1/roster-members/:memberId', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin']);
    if (currentUser instanceof Response) return currentUser;

    const memberId = c.req.param('memberId');
    const patch = normalizeRosterMemberPatch(await c.req.json<Partial<RosterMemberPatch>>());
    const rosterMember = await store.updateRosterMember(memberId, patch);

    if (!rosterMember) {
      return c.json({ error: 'Roster member not found.' }, 404);
    }

    return c.json({ rosterMember });
  });

  app.get('/api/v1/launches', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin', 'facilitator', 'manager']);
    if (currentUser instanceof Response) return currentUser;

    const [launches, participantRuns] = await Promise.all([store.listLaunches(), store.listParticipantRuns()]);
    return c.json({ launches: buildLaunches(launches, participantRuns) });
  });

  app.get('/api/v1/launches/:launchId', async (c) => {
    const launchId = c.req.param('launchId');
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin', 'facilitator', 'manager']);
    if (currentUser instanceof Response) return currentUser;

    const [launch, participantRuns, scenarioDrafts] = await Promise.all([
      store.getLaunch(launchId),
      store.listParticipantRuns(launchId),
      store.listScenarioDrafts(),
    ]);

    if (!launch) {
      return c.json({ error: 'Launch not found.' }, 404);
    }

    const draftApprovalStatus =
      scenarioDrafts.find((draft) => draft.id === launch.scenarioDraftId)?.approvalStatus ?? 'approved';

    return c.json({ launch: buildLaunchDetail(launch, participantRuns, draftApprovalStatus) });
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

    return c.json({ launch }, 201);
  });

  app.patch('/api/v1/launches/:launchId', async (c) => {
    const launchId = c.req.param('launchId');
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin', 'facilitator']);
    if (currentUser instanceof Response) return currentUser;

    const currentLaunch = await store.getLaunch(launchId);
    if (!currentLaunch) {
      return c.json({ error: 'Launch not found or patch invalid.' }, 404);
    }

    const patch = normalizeLaunchPatch(await c.req.json());
    if (
      currentUser.role === 'facilitator' &&
      (!isFacilitatorLaunchPatchAllowed(currentLaunch, patch) || Object.keys(patch).length === 0)
    ) {
      return c.json({ error: 'Facilitator access only allows tabletop status, phase, and notes updates.' }, 403);
    }

    const launch = await store.updateLaunch(launchId, patch);

    if (!launch) {
      return c.json({ error: 'Launch not found or patch invalid.' }, 404);
    }

    return c.json({ launch });
  });

  app.post('/api/v1/participant-runs', async (c) => {
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin']);
    if (currentUser instanceof Response) return currentUser;

    const body = await c.req.json<Partial<ParticipantRunInput>>();
    const input = normalizeParticipantRunInput(body);
    if (!input) {
      return c.json({ error: 'Invalid participant run payload.' }, 400);
    }

    const run = await store.createParticipantRun(input);
    if (!run) {
      return c.json({ error: 'Launch or roster member not found for participant assignment.' }, 404);
    }

    return c.json({ run }, 201);
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

    if (!canAccessParticipantRun(currentUser, run, 'read')) {
      return c.json({ error: 'You do not have access to this participant run.' }, 403);
    }

    const launch = await store.getLaunch(run.launchId);
    if (!launch) {
      return c.json({ error: 'Launch not found for participant run.' }, 404);
    }

    return c.json({ run: buildParticipantRunDetail(launch, run) });
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
    if (!canAccessParticipantRun(currentUser, existingRun, 'write')) {
      return c.json({ error: 'You do not have access to update this participant run.' }, 403);
    }

    const patch = normalizeParticipantRunPatch(await c.req.json<Partial<ParticipantRunPatch>>());
    const run = await store.updateParticipantRun(runId, patch);

    if (!run) {
      return c.json({ error: 'Participant run not found.' }, 404);
    }

    return c.json({ run });
  });

  app.get('/api/v1/reports/:launchId', async (c) => {
    const launchId = c.req.param('launchId');
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin', 'facilitator', 'manager']);
    if (currentUser instanceof Response) return currentUser;

    const [launch, participantRuns] = await Promise.all([store.getLaunch(launchId), store.listParticipantRuns(launchId)]);

    if (!launch) {
      return c.json({ error: 'Report not found.' }, 404);
    }

    return c.json({ report: buildReportDetail(launch, participantRuns) });
  });

  app.get('/api/v1/reports/:launchId/export', async (c) => {
    const launchId = c.req.param('launchId');
    const store = resolveStore(c.env, storeOverride);
    const currentUser = await requireWorkspaceRole(c, store, ['admin', 'facilitator', 'manager']);
    if (currentUser instanceof Response) return currentUser;

    const format = c.req.query('format') ?? 'markdown';

    if (!isReportExportFormat(format)) {
      return c.json({ error: 'Invalid report export format.' }, 400);
    }

    const [launch, participantRuns] = await Promise.all([store.getLaunch(launchId), store.listParticipantRuns(launchId)]);

    if (!launch) {
      return c.json({ error: 'Report not found.' }, 404);
    }

    const exportFile = buildReportExportFile(launch, participantRuns, format);

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
  const [documents, contextBuckets, scenarioDrafts, rosterMembers, launches, participantRuns] = await Promise.all([
    store.listSourceDocuments(),
    store.listContextBuckets(),
    store.listScenarioDrafts(),
    store.listRosterMembers(),
    store.listLaunches(),
    store.listParticipantRuns(),
  ]);

  const participantAssignments = filterParticipantAssignmentsForUser(currentUser, participantRuns);
  const launchIdsForParticipant = new Set(participantAssignments.map((run) => run.launchId));
  const visibleParticipantRuns = currentUser.role === 'participant' ? participantAssignments : participantRuns;
  const visibleLaunches =
    currentUser.role === 'participant'
      ? launches.filter((launch) => launchIdsForParticipant.has(launch.id))
      : launches;
  const visibleDocuments = currentUser.role === 'admin' ? documents : [];
  const visibleContextBuckets = currentUser.role === 'admin' ? contextBuckets : [];
  const visibleScenarioDrafts = currentUser.role === 'admin' ? scenarioDrafts : [];
  const visibleRosterMembers = currentUser.role === 'admin' ? rosterMembers : [];
  const visibleReports =
    currentUser.role === 'participant' ? [] : buildReports(visibleLaunches, participantRuns);

  return {
    appName: env?.APP_NAME ?? 'Altira Resilience',
    stage: env?.APP_STAGE ?? 'scaffold',
    currentUser,
    availableUsers,
    nav: adminNav.filter((item) => canAccessNav(currentUser.role, item.id)),
    summaryCards:
      currentUser.role === 'participant'
        ? []
        : buildSummaryCards(
            visibleDocuments,
            visibleContextBuckets,
            visibleScenarioDrafts,
            visibleLaunches,
            visibleParticipantRuns,
          ),
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

async function resolveCurrentUser(c: AppContext, store: ResilienceStore): Promise<WorkspaceUser | Response> {
  const session = await resolveSessionUser(store, c.req.header(CURRENT_USER_HEADER));
  if (session.currentUser.status !== 'active') {
    return c.json({ error: 'Current workspace user is inactive.' }, 403);
  }

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

async function resolveSessionUser(store: ResilienceStore, requestedUserId?: string | null) {
  const availableUsers = await store.listWorkspaceUsers();
  const activeUsers = availableUsers.filter((user) => user.status === 'active');
  const fallbackUser =
    activeUsers.find((user) => user.role === 'admin') ??
    activeUsers[0] ??
    availableUsers[0];

  const currentUser =
    (requestedUserId
      ? availableUsers.find((user) => user.id === requestedUserId)
      : null) ?? fallbackUser;

  if (!currentUser) {
    throw new Error('No workspace users are configured.');
  }

  return { currentUser, availableUsers };
}

function canAccessNav(role: WorkspaceUserRole, navId: AdminNavId): boolean {
  if (role === 'admin') return true;
  if (role === 'facilitator') return navId === 'home' || navId === 'launches' || navId === 'reports';
  if (role === 'manager') return navId === 'home' || navId === 'launches' || navId === 'reports';
  return navId === 'home';
}

function filterParticipantAssignmentsForUser(
  currentUser: WorkspaceUser,
  participantRuns: ParticipantRun[],
): ParticipantRun[] {
  if (currentUser.role === 'participant') {
    return participantRuns.filter(
      (run) => Boolean(currentUser.rosterMemberId) && run.rosterMemberId === currentUser.rosterMemberId,
    );
  }

  return participantRuns;
}

function canAccessParticipantRun(
  currentUser: WorkspaceUser,
  run: ParticipantRun,
  mode: 'read' | 'write',
): boolean {
  if (currentUser.role === 'admin') return true;
  if (mode === 'read' && (currentUser.role === 'facilitator' || currentUser.role === 'manager')) return true;
  if (currentUser.role === 'participant' && currentUser.rosterMemberId) {
    return run.rosterMemberId === currentUser.rosterMemberId;
  }
  return false;
}

function isFacilitatorLaunchPatchAllowed(launch: Launch, patch: LaunchPatch) {
  if (launch.mode !== 'tabletop') return false;
  const allowedKeys = new Set(['status', 'tabletopPhase', 'facilitatorNotes']);
  return Object.keys(patch).every((key) => allowedKeys.has(key));
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
