import type { ResilienceStore } from './store';
import {
  buildNativeExtractionProvenance,
  extractSourceDocumentText,
  extractSourceDocumentTextWithAi,
  type SourceAiBinding,
  supportsAiMarkdownFallback,
} from './source-extraction';

export type SourceExtractionQueueMessage = {
  jobId: string;
  documentId: string;
};

export async function processSourceExtractionQueueMessage(input: {
  store: ResilienceStore;
  bucket?: R2Bucket;
  ai?: SourceAiBinding;
  message: SourceExtractionQueueMessage;
}): Promise<void> {
  const job = await input.store.markSourceDocumentExtractionJobProcessing(input.message.jobId);
  if (!job) return;

  const document = await input.store.getSourceDocument(input.message.documentId);
  if (
    !document ||
    document.storageBackend !== 'r2' ||
    !document.storageObjectKey ||
    !document.mimeType ||
    !document.uploadedFileName
  ) {
    await input.store.completeSourceDocumentExtractionJob(input.message.jobId, {
      status: 'failed',
      contentText: null,
      extractionNote: 'Queued extraction could not find a stored R2 file for this document.',
      lastError: 'Stored file metadata missing.',
    });
    return;
  }

  if (!input.bucket) {
    await input.store.completeSourceDocumentExtractionJob(input.message.jobId, {
      status: 'failed',
      contentText: null,
      extractionNote: 'Queued extraction is not available because the R2 bucket binding is missing in this environment.',
      lastError: 'SOURCE_DOCUMENTS_BUCKET binding missing.',
    });
    return;
  }

  const object = await input.bucket.get(document.storageObjectKey);
  if (!object) {
    await input.store.completeSourceDocumentExtractionJob(input.message.jobId, {
      status: 'failed',
      contentText: null,
      extractionNote: 'Queued extraction could not load the stored file from R2.',
      lastError: 'Stored R2 object not found.',
    });
    return;
  }

  try {
    const fileBytes = new Uint8Array(await object.arrayBuffer());
    if (fileBytes.byteLength === 0 && (document.byteSize ?? 0) > 0) {
      await input.store.completeSourceDocumentExtractionJob(input.message.jobId, {
        status: 'needs_attention',
        contentText: null,
        extractionNote:
          'Queued extraction could not read the stored file bytes in this environment. The file is still stored, but OCR should be retried from upload-time extraction or a deployed environment.',
      });
      return;
    }

    const extraction = await extractSourceDocumentText({
      bytes: fileBytes.slice(),
      fileName: document.uploadedFileName,
      mimeType: document.mimeType,
    });

    if (extraction.contentText) {
      await input.store.completeSourceDocumentExtractionJob(input.message.jobId, {
        status: 'completed',
        contentText: extraction.contentText,
        extractionNote: null,
        extractionProvenance: buildNativeExtractionProvenance('queued_native'),
        attemptedProvenance: buildNativeExtractionProvenance('queued_native'),
      });
      return;
    }

    if (input.ai && supportsAiMarkdownFallback(extraction.fileKind)) {
      const aiExtraction = await extractSourceDocumentTextWithAi({
        ai: input.ai,
        bytes: fileBytes.slice(),
        fileName: document.uploadedFileName,
        mimeType: document.mimeType,
      });

      if (aiExtraction.contentText) {
        await input.store.completeSourceDocumentExtractionJob(input.message.jobId, {
          status: 'completed',
          contentText: aiExtraction.contentText,
          extractionNote: null,
          extractionProvenance:
            aiExtraction.extractionProvenance ?? aiExtraction.attemptedProvenance ?? null,
          attemptedProvenance:
            aiExtraction.attemptedProvenance ?? aiExtraction.extractionProvenance ?? null,
        });
        return;
      }

      await input.store.completeSourceDocumentExtractionJob(input.message.jobId, {
        status: 'needs_attention',
        contentText: null,
        attemptedProvenance: aiExtraction.attemptedProvenance ?? null,
        extractionNote:
          aiExtraction.extractionNote ??
          extraction.extractionNote ??
          'Queued extraction completed, but this file still needs OCR or manual follow-up before suggestions can be generated.',
      });
      return;
    }

    await input.store.completeSourceDocumentExtractionJob(input.message.jobId, {
      status: 'needs_attention',
      contentText: null,
      attemptedProvenance: buildNativeExtractionProvenance('queued_native'),
      extractionNote:
        extraction.extractionNote ??
        'Queued extraction completed, but this file still needs OCR or manual follow-up before suggestions can be generated.',
    });
  } catch (error) {
    await input.store.completeSourceDocumentExtractionJob(input.message.jobId, {
      status: 'failed',
      contentText: null,
      attemptedProvenance: buildNativeExtractionProvenance('queued_native'),
      extractionNote: 'Queued extraction failed before usable text could be produced.',
      lastError: error instanceof Error ? error.message : 'Unknown queue extraction error.',
    });
  }
}
