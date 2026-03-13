import type { DocumentSummary, SourceExtractionJob } from '@resilience/shared';
import { describe, expect, it } from 'vitest';
import { processSourceExtractionQueueMessage } from '../source-extraction-queue';
import { MemoryResilienceStore } from '../store';

describe('source extraction queue', () => {
  it('completes a queued PDF job into reviewable suggestions', async () => {
    const pdfBytes = createPdfBuffer(['Teams: Security', 'Vendors: Okta', 'Escalation Roles: Incident Commander']);
    const store = new MemoryResilienceStore(
      createQueuedDocumentSeed({
        documentId: 'doc_queue_pdf',
        jobId: 'job_queue_pdf',
        fileName: 'queued-plan.pdf',
        mimeType: 'application/pdf',
        byteSize: pdfBytes.byteLength,
        objectKey: 'source-documents/queued-plan.pdf',
        extractionNote: 'Stored in R2. No usable text was available on upload, so a background PDF extraction follow-up was queued.',
      }),
    );

    await processSourceExtractionQueueMessage({
      store,
      bucket: createFakeBucket(pdfBytes),
      message: { jobId: 'job_queue_pdf', documentId: 'doc_queue_pdf' },
    });

    const document = await store.getSourceDocument('doc_queue_pdf');
    expect(document?.extractionStatus).toBe('ready_for_review');
    expect(document?.extractionSuggestions.length).toBeGreaterThan(0);
    expect(document?.extractionProvenance?.method).toBe('queued_native');
    expect(document?.latestExtractionJob?.attemptedProvenance?.provider).toBe('native_parser');
    expect(document?.latestExtractionJob?.status).toBe('completed');
  });

  it('marks a queued legacy Office job as needing attention', async () => {
    const legacyBytes = new Uint8Array([208, 207, 17, 224]);
    const store = new MemoryResilienceStore(
      createQueuedDocumentSeed({
        documentId: 'doc_queue_legacy',
        jobId: 'job_queue_legacy',
        fileName: 'legacy-playbook.doc',
        mimeType: 'application/msword',
        byteSize: legacyBytes.byteLength,
        objectKey: 'source-documents/legacy-playbook.doc',
        extractionNote: 'Stored in R2. No usable text was available on upload, so a background Word-document follow-up was queued.',
      }),
    );

    await processSourceExtractionQueueMessage({
      store,
      bucket: createFakeBucket(legacyBytes),
      message: { jobId: 'job_queue_legacy', documentId: 'doc_queue_legacy' },
    });

    const document = await store.getSourceDocument('doc_queue_legacy');
    expect(document?.extractionStatus).toBe('needs_attention');
    expect(document?.extractionNote).toContain('Legacy Office binary files');
    expect(document?.latestExtractionJob?.attemptedProvenance?.method).toBe('queued_native');
    expect(document?.latestExtractionJob?.status).toBe('needs_attention');
  });

  it('uses AI markdown conversion when a queued scanned PDF has no embedded text', async () => {
    const scannedPdfBytes = createPdfBuffer([]);
    const store = new MemoryResilienceStore(
      createQueuedDocumentSeed({
        documentId: 'doc_queue_scanned_pdf',
        jobId: 'job_queue_scanned_pdf',
        fileName: 'scanned-continuity-plan.pdf',
        mimeType: 'application/pdf',
        byteSize: scannedPdfBytes.byteLength,
        objectKey: 'source-documents/scanned-continuity-plan.pdf',
        extractionNote: 'Stored in R2. No usable text was available on upload, so a background PDF extraction follow-up was queued.',
      }),
    );

    await processSourceExtractionQueueMessage({
      store,
      bucket: createFakeBucket(scannedPdfBytes),
      ai: createFakeAi({
        markdown: 'Teams: Security\nVendors: Okta\nEscalation Roles: Incident Commander',
      }),
      message: { jobId: 'job_queue_scanned_pdf', documentId: 'doc_queue_scanned_pdf' },
    });

    const document = await store.getSourceDocument('doc_queue_scanned_pdf');
    expect(document?.extractionStatus).toBe('ready_for_review');
    expect(document?.contentExcerpt).toContain('Teams: Security');
    expect(document?.extractionProvenance?.method).toBe('queued_ai');
    expect(document?.latestExtractionJob?.attemptedProvenance?.provider).toBe('workers_ai_markdown');
    expect(document?.latestExtractionJob?.status).toBe('completed');
  });

  it('falls back to vision OCR when a queued scanned PDF still has no usable markdown text', async () => {
    const scannedPdfBytes = createScannedPdfBuffer();
    const store = new MemoryResilienceStore(
      createQueuedDocumentSeed({
        documentId: 'doc_queue_scanned_pdf_vision',
        jobId: 'job_queue_scanned_pdf_vision',
        fileName: 'scanned-continuity-plan.pdf',
        mimeType: 'application/pdf',
        byteSize: scannedPdfBytes.byteLength,
        objectKey: 'source-documents/scanned-continuity-plan.pdf',
        extractionNote: 'Stored in R2. No usable text was available on upload, so a background PDF extraction follow-up was queued.',
      }),
    );

    await processSourceExtractionQueueMessage({
      store,
      bucket: createFakeBucket(scannedPdfBytes),
      ai: createFakeAi({
        markdown:
          'The document appears to be a scanned continuity plan. The top section contains a title and the bottom section contains narrative paragraphs.',
        visionResponse: 'Teams: Security\nVendors: Okta\nEscalation Roles: Incident Commander',
      }),
      message: {
        jobId: 'job_queue_scanned_pdf_vision',
        documentId: 'doc_queue_scanned_pdf_vision',
      },
    });

    const document = await store.getSourceDocument('doc_queue_scanned_pdf_vision');
    expect(document?.extractionStatus).toBe('ready_for_review');
    expect(document?.contentExcerpt).toContain('Teams: Security');
    expect(document?.extractionProvenance?.provider).toBe('workers_ai_vision');
    expect(document?.latestExtractionJob?.attemptedProvenance?.provider).toBe('workers_ai_vision');
    expect(document?.latestExtractionJob?.status).toBe('completed');
  });

  it('keeps description-like AI output in needs_attention for image uploads', async () => {
    const imageBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const store = new MemoryResilienceStore(
      createQueuedDocumentSeed({
        documentId: 'doc_queue_image_description',
        jobId: 'job_queue_image_description',
        fileName: 'scanned-policy.png',
        mimeType: 'image/png',
        byteSize: imageBytes.byteLength,
        objectKey: 'source-documents/scanned-policy.png',
        extractionNote: 'Stored in R2. No usable text was available on upload, so a background image OCR follow-up was queued.',
      }),
    );

    await processSourceExtractionQueueMessage({
      store,
      bucket: createFakeBucket(imageBytes),
      ai: createFakeAi({
        markdown:
          'A white and light gray document is displayed, featuring a resume for Ryan Jameson. The resume includes a headshot. The top section presents contact details.',
      }),
      message: { jobId: 'job_queue_image_description', documentId: 'doc_queue_image_description' },
    });

    const document = await store.getSourceDocument('doc_queue_image_description');
    expect(document?.extractionStatus).toBe('needs_attention');
    expect(document?.contentExcerpt).toBeNull();
    expect(document?.extractionSuggestions).toHaveLength(0);
    expect(document?.latestExtractionJob?.attemptedProvenance?.provider).toBe('workers_ai_markdown');
    expect(document?.latestExtractionJob?.status).toBe('needs_attention');
  });

  it('surfaces an honest note when queued extraction cannot read stored bytes in the environment', async () => {
    const store = new MemoryResilienceStore(
      createQueuedDocumentSeed({
        documentId: 'doc_queue_empty_object',
        jobId: 'job_queue_empty_object',
        fileName: 'scanned-continuity-plan.pdf',
        mimeType: 'application/pdf',
        byteSize: 143161,
        objectKey: 'source-documents/scanned-continuity-plan.pdf',
        extractionNote: 'Stored in R2. No usable text was available on upload, so a background PDF extraction follow-up was queued.',
      }),
    );

    await processSourceExtractionQueueMessage({
      store,
      bucket: createFakeBucket(new Uint8Array()),
      ai: createFakeAi({
        markdown: 'UNREADABLE',
        visionResponse: 'UNREADABLE',
      }),
      message: { jobId: 'job_queue_empty_object', documentId: 'doc_queue_empty_object' },
    });

    const document = await store.getSourceDocument('doc_queue_empty_object');
    expect(document?.extractionStatus).toBe('needs_attention');
    expect(document?.extractionNote).toContain('could not read the stored file bytes in this environment');
    expect(document?.latestExtractionJob?.status).toBe('needs_attention');
  });
});

function createQueuedDocumentSeed(input: {
  documentId: string;
  jobId: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  objectKey: string;
  extractionNote: string;
}) {
  const document: DocumentSummary = {
    id: input.documentId,
    name: input.fileName,
    type: 'Continuity Plan',
    businessUnit: 'Operations',
    owner: 'Dana Smith',
    effectiveDate: '2026-03-08',
    parseStatus: 'uploaded',
    storageStatus: 'stored',
    storageBackend: 'r2',
    uploadedFileName: input.fileName,
    byteSize: input.byteSize,
    extractionStatus: 'queued',
    pendingSuggestionCount: 0,
    updatedAt: '2026-03-08T12:00:00.000Z',
  };

  const extractionJob: SourceExtractionJob = {
    id: input.jobId,
    documentId: input.documentId,
    status: 'queued',
    attemptCount: 0,
    lastError: null,
    attemptedProvenance: null,
    createdAt: '2026-03-08T12:00:00.000Z',
    updatedAt: '2026-03-08T12:00:00.000Z',
    startedAt: null,
    completedAt: null,
  };

  return {
    documents: [document],
    documentFiles: [
      {
        documentId: input.documentId,
        uploadedFileName: input.fileName,
        mimeType: input.mimeType,
        byteSize: input.byteSize,
        storageBackend: 'r2' as const,
        storageObjectKey: input.objectKey,
        contentText: null,
        contentExcerpt: null,
        extractionNote: input.extractionNote,
        extractionStatus: 'queued' as const,
        extractionMethod: null,
        extractionProvider: null,
        extractionVersion: null,
        extractedAt: null,
        createdAt: '2026-03-08T12:00:00.000Z',
        updatedAt: '2026-03-08T12:00:00.000Z',
      },
    ],
    suggestions: [],
    extractionJobs: [extractionJob],
    contextBuckets: [],
    scenarioDrafts: [],
    launches: [],
    participantRuns: [],
  };
}

function createFakeBucket(bytes: Uint8Array): R2Bucket {
  return {
    get: async () => ({
      arrayBuffer: async () => toArrayBuffer(bytes),
    }),
  } as unknown as R2Bucket;
}

function createFakeAi(input: { markdown: string; visionResponse?: string }) {
  return {
    toMarkdown: async () => ({
      format: 'markdown' as const,
      data: input.markdown,
    }),
    ...(input.visionResponse
      ? {
          run: async () => ({
            response: input.visionResponse,
          }),
        }
      : {}),
  };
}

function encodeText(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function createPdfBuffer(lines: string[]): Uint8Array {
  const stream = [
    'BT',
    '/F1 12 Tf',
    ...lines.map((line, index) => {
      const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
      return index === 0 ? `72 720 Td (${escaped}) Tj` : `0 -16 Td (${escaped}) Tj`;
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
  const pageDrawCommands = encodeText('q\n1 0 0 1 0 0 cm\n/Im1 Do\nQ');
  const imageObject = concatBytes([
    encodeText(
      `<< /Type /XObject /Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${jpegBytes.byteLength} /Filter /DCTDecode >>\nstream\n`,
    ),
    jpegBytes,
    encodeText('\nendstream'),
  ]);
  const contentsObject = concatBytes([
    encodeText(`<< /Length ${pageDrawCommands.byteLength} >>\nstream\n`),
    pageDrawCommands,
    encodeText('\nendstream'),
  ]);

  return buildBinaryPdf([
    encodeText('<< /Type /Catalog /Pages 2 0 R >>'),
    encodeText('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
    encodeText(
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 1 1] /Resources << /ProcSet [ /PDF /ImageC ] /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>',
    ),
    imageObject,
    contentsObject,
  ]);
}

function buildBinaryPdf(objects: Uint8Array[]): Uint8Array {
  const parts: Uint8Array[] = [encodeText('%PDF-1.4\n')];
  const offsets: number[] = [0];
  let length = parts[0].byteLength;

  objects.forEach((objectBytes, index) => {
    offsets.push(length);
    const chunk = concatBytes([
      encodeText(`${index + 1} 0 obj\n`),
      objectBytes,
      encodeText('\nendobj\n'),
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
  parts.push(encodeText(trailer));

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
