import { strFromU8, unzipSync, unzlibSync, zlibSync } from 'fflate';
import { extractText as extractPdfText } from 'unpdf';
import type {
  SourceExtractionMethod,
  SourceExtractionProvenance,
} from '@resilience/shared';

export type SourceFileKind =
  | 'plain_text'
  | 'pdf'
  | 'docx'
  | 'xlsx'
  | 'pptx'
  | 'image'
  | 'legacy_word'
  | 'legacy_excel'
  | 'legacy_powerpoint'
  | 'unknown';

export type SourceTextExtractionResult = {
  contentText: string | null;
  extractionNote: string | null;
  fileKind: SourceFileKind;
  extractionProvenance?: SourceExtractionProvenance | null;
  attemptedProvenance?: SourceExtractionProvenance | null;
};

type SourceMarkdownDocument = {
  name: string;
  blob: Blob;
};

type SourceMarkdownConversionResponse =
  | {
      format: 'markdown';
      data: string;
    }
  | {
      format: 'error';
      error: string;
    };

type SourceMarkdownConversionOptions = {
  conversionOptions?: Record<string, unknown>;
};

export type SourceMarkdownAiBinding = {
  toMarkdown(
    file: SourceMarkdownDocument,
    options?: SourceMarkdownConversionOptions,
  ): Promise<SourceMarkdownConversionResponse>;
};

type SourceVisionModel = '@cf/meta/llama-3.2-11b-vision-instruct';

type SourceVisionAiInput = {
  prompt: string;
  image: number[] | string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
};

type SourceVisionAiOutput = {
  response?: string;
};

export type SourceVisionAiBinding = {
  run(model: SourceVisionModel, input: SourceVisionAiInput): Promise<SourceVisionAiOutput>;
};

export type SourceAiBinding = SourceMarkdownAiBinding & Partial<SourceVisionAiBinding>;

export const NATIVE_EXTRACTION_VERSION = 'native-parser-2026-03-09';
export const WORKERS_AI_MARKDOWN_VERSION = 'workers-ai-markdown-2026-03-09';
export const WORKERS_AI_VISION_VERSION = 'workers-ai-vision-2026-03-09';

const PDF_VISION_MODEL: SourceVisionModel = '@cf/meta/llama-3.2-11b-vision-instruct';
const MAX_PDF_VISION_PAGES = 2;
const PDF_VISION_PROMPT = [
  'You are transcribing a scanned business document.',
  'Return only the readable document text.',
  'Preserve headings and line breaks where possible.',
  'Do not describe the page layout, design, or images.',
  'If the text is not readable, return exactly UNREADABLE.',
].join(' ');
const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const PNG_CRC_TABLE = buildPngCrcTable();
const LATIN1_DECODER = new TextDecoder('latin1');
const ASCII_ENCODER = new TextEncoder();
const PDF_SUBTYPE_IMAGE_BYTES = ASCII_ENCODER.encode('/Subtype /Image');
const PDF_STREAM_BYTES = ASCII_ENCODER.encode('stream');
const PDF_ENDSTREAM_BYTES = ASCII_ENCODER.encode('endstream');
const PDF_DICT_OPEN_BYTES = ASCII_ENCODER.encode('<<');
const PDF_DICT_CLOSE_BYTES = ASCII_ENCODER.encode('>>');

const XML_ENTITY_REPLACEMENTS: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
};

const VISUAL_DESCRIPTION_MARKERS = [
  /\bis displayed\b/i,
  /\bthe image\b/i,
  /\bthe document\b/i,
  /\bappears to\b/i,
  /\bfeaturing\b/i,
  /\btop section\b/i,
  /\bbottom section\b/i,
  /\bleft side\b/i,
  /\bright side\b/i,
  /\bbackground\b/i,
  /\bin the image\b/i,
];

const AI_TRANSCRIPTION_PREAMBLE = /^(?:here(?:'s| is)\s+)?(?:the\s+)?(?:transcribed|extracted|ocr)\s+text[:\s-]*/i;
const AI_UNREADABLE_MARKERS = [
  /^unreadable\b/i,
  /\billegible\b/i,
  /\bunable to read\b/i,
  /\bcannot read\b/i,
  /\bcan't read\b/i,
  /\bunable to transcribe\b/i,
  /\bnot readable\b/i,
];

type PdfObjectRef = {
  objectNumber: number;
  generation: number;
};

type PdfParsedObject = {
  objectNumber: number;
  generation: number;
  bodyStart: number;
  bodyText: string;
  dictionaryText: string | null;
  streamStart: number | null;
  streamSearchIndex: number | null;
  streamLengthToken: number | PdfObjectRef | null;
};

type PdfVisionImage = {
  pageNumber: number;
  encodedBytes: Uint8Array;
  mimeType: 'image/jpeg' | 'image/png' | 'image/jp2';
  sortArea: number;
};

type VisionResponseClassification =
  | { kind: 'text'; contentText: string }
  | { kind: 'description' | 'unreadable' | 'empty' };

export function detectSourceFileKind(mimeType: string, fileName: string): SourceFileKind {
  const normalizedMimeType = mimeType.toLowerCase();
  const lowerFileName = fileName.toLowerCase();

  if (
    normalizedMimeType.startsWith('text/') ||
    normalizedMimeType === 'application/json' ||
    normalizedMimeType === 'application/ld+json' ||
    /\.(txt|md|markdown|csv|json)$/i.test(fileName)
  ) {
    return 'plain_text';
  }

  if (normalizedMimeType === 'application/pdf' || lowerFileName.endsWith('.pdf')) {
    return 'pdf';
  }

  if (
    normalizedMimeType.includes('wordprocessingml') ||
    lowerFileName.endsWith('.docx')
  ) {
    return 'docx';
  }

  if (
    normalizedMimeType.includes('spreadsheetml') ||
    lowerFileName.endsWith('.xlsx')
  ) {
    return 'xlsx';
  }

  if (
    normalizedMimeType.includes('presentationml') ||
    lowerFileName.endsWith('.pptx')
  ) {
    return 'pptx';
  }

  if (
    normalizedMimeType.startsWith('image/') ||
    /\.(png|jpe?g|webp)$/i.test(fileName)
  ) {
    return 'image';
  }

  if (normalizedMimeType === 'application/msword' || lowerFileName.endsWith('.doc')) {
    return 'legacy_word';
  }

  if (normalizedMimeType === 'application/vnd.ms-excel' || lowerFileName.endsWith('.xls')) {
    return 'legacy_excel';
  }

  if (
    normalizedMimeType === 'application/vnd.ms-powerpoint' ||
    lowerFileName.endsWith('.ppt')
  ) {
    return 'legacy_powerpoint';
  }

  return 'unknown';
}

export function isSupportedSourceUpload(mimeType: string, fileName: string): boolean {
  return detectSourceFileKind(mimeType, fileName) !== 'unknown';
}

export function isInlineTextSourceUpload(mimeType: string, fileName: string): boolean {
  return detectSourceFileKind(mimeType, fileName) === 'plain_text';
}

export async function extractSourceDocumentText(input: {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
}): Promise<SourceTextExtractionResult> {
  const fileKind = detectSourceFileKind(input.mimeType, input.fileName);

  switch (fileKind) {
    case 'plain_text':
      const contentText = normalizeExtractedText(new TextDecoder().decode(input.bytes));
      return {
        fileKind,
        contentText,
        extractionNote: contentText ? null : 'Stored text file is empty, so there was no extractable content to review.',
      };
    case 'pdf':
      return extractPdfDocumentText(input.bytes);
    case 'docx':
      return extractDocxDocumentText(input.bytes);
    case 'xlsx':
      return extractXlsxDocumentText(input.bytes);
    case 'pptx':
      return extractPptxDocumentText(input.bytes);
    case 'image':
      return {
        fileKind,
        contentText: null,
        extractionNote:
          'Image file was stored successfully, but OCR runs in the background extraction queue when AI extraction is configured.',
      };
    case 'legacy_word':
    case 'legacy_excel':
    case 'legacy_powerpoint':
      return {
        fileKind,
        contentText: null,
        extractionNote:
          'Legacy Office binary files are stored successfully, but v1 extraction currently supports PDF, DOCX, XLSX, and PPTX only.',
      };
    default:
      return {
        fileKind,
        contentText: null,
        extractionNote: 'Stored file requires extracted text before suggestions can be reviewed.',
      };
  }
}

export function supportsAiMarkdownFallback(fileKind: SourceFileKind): boolean {
  return (
    fileKind === 'pdf' ||
    fileKind === 'docx' ||
    fileKind === 'xlsx' ||
    fileKind === 'image'
  );
}

export function supportsAiVisionFallback(fileKind: SourceFileKind): boolean {
  return fileKind === 'pdf';
}

export async function extractSourceDocumentTextWithAi(input: {
  ai: SourceAiBinding;
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
  method?: Extract<SourceExtractionMethod, 'upload_ai' | 'queued_ai'>;
}): Promise<SourceTextExtractionResult> {
  const fileKind = detectSourceFileKind(input.mimeType, input.fileName);
  const extractionMethod = input.method ?? 'queued_ai';

  if (!supportsAiMarkdownFallback(fileKind) && !supportsAiVisionFallback(fileKind)) {
    return {
      fileKind,
      contentText: null,
      extractionNote: buildAiUnsupportedNote(fileKind),
    };
  }

  const markdownBytes = supportsAiMarkdownFallback(fileKind) ? input.bytes.slice() : null;
  const visionBytes =
    fileKind === 'pdf' && input.ai.run && supportsAiVisionFallback(fileKind)
      ? input.bytes.slice()
      : null;
  const markdownResult = supportsAiMarkdownFallback(fileKind)
    ? await extractSourceDocumentTextWithMarkdownAi({
        ai: input.ai,
        bytes: markdownBytes ?? input.bytes,
        fileName: input.fileName,
        mimeType: input.mimeType,
        method: extractionMethod,
      })
    : null;

  if (markdownResult?.contentText) {
    return markdownResult;
  }

  if (fileKind === 'pdf' && input.ai.run) {
    const visionResult = await extractSourceDocumentTextWithPdfVision({
      ai: { run: input.ai.run },
      bytes: visionBytes ?? input.bytes,
      fileName: input.fileName,
      mimeType: input.mimeType,
      method: extractionMethod,
    });
    if (visionResult.contentText || visionResult.attemptedProvenance) {
      return visionResult;
    }
  }

  return (
    markdownResult ?? {
      fileKind,
      contentText: null,
      extractionNote: buildAiUnsupportedNote(fileKind),
    }
  );
}

async function extractSourceDocumentTextWithMarkdownAi(input: {
  ai: SourceMarkdownAiBinding;
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
  method: Extract<SourceExtractionMethod, 'upload_ai' | 'queued_ai'>;
}): Promise<SourceTextExtractionResult> {
  const fileKind = detectSourceFileKind(input.mimeType, input.fileName);
  const attemptedProvenance = buildAiExtractionProvenance(input.method);
  let response: SourceMarkdownConversionResponse;

  try {
    response = await input.ai.toMarkdown(
      {
        name: input.fileName,
        blob: new Blob([toArrayBuffer(input.bytes)], { type: input.mimeType || undefined }),
      },
      buildAiMarkdownOptions(fileKind),
    );
  } catch (error) {
    return {
      fileKind,
      contentText: null,
      extractionNote: buildAiErrorNote(
        fileKind,
        error instanceof Error ? error.message : 'Unknown AI markdown conversion error.',
      ),
      attemptedProvenance,
    };
  }

  if (response.format === 'error') {
    return {
      fileKind,
      contentText: null,
      extractionNote: buildAiErrorNote(fileKind, response.error),
      attemptedProvenance,
    };
  }

  const contentText = normalizeExtractedText(response.data);
  if (contentText) {
    if (looksLikeVisualDescription(contentText)) {
      return {
        fileKind,
        contentText: null,
        extractionNote: buildAiDescriptionNote(fileKind),
        attemptedProvenance,
      };
    }

    return {
      fileKind,
      contentText,
      extractionNote: null,
      extractionProvenance: attemptedProvenance,
      attemptedProvenance,
    };
  }

  return {
    fileKind,
    contentText: null,
    extractionNote: buildAiEmptyNote(fileKind),
    attemptedProvenance,
  };
}

export function buildNativeExtractionProvenance(
  method: Extract<SourceExtractionMethod, 'upload_native' | 'manual_native' | 'queued_native'>,
  generatedAt: string = new Date().toISOString(),
): SourceExtractionProvenance {
  return {
    method,
    provider: 'native_parser',
    version: NATIVE_EXTRACTION_VERSION,
    generatedAt,
  };
}

export function buildAiExtractionProvenance(
  method: Extract<SourceExtractionMethod, 'upload_ai' | 'queued_ai'> = 'queued_ai',
  generatedAt: string = new Date().toISOString(),
): SourceExtractionProvenance {
  return {
    method,
    provider: 'workers_ai_markdown',
    version: WORKERS_AI_MARKDOWN_VERSION,
    generatedAt,
  };
}

export function buildAiVisionExtractionProvenance(
  method: Extract<SourceExtractionMethod, 'upload_ai' | 'queued_ai'> = 'queued_ai',
  generatedAt: string = new Date().toISOString(),
): SourceExtractionProvenance {
  return {
    method,
    provider: 'workers_ai_vision',
    version: WORKERS_AI_VISION_VERSION,
    generatedAt,
  };
}

async function extractPdfDocumentText(bytes: Uint8Array): Promise<SourceTextExtractionResult> {
  try {
    const { text } = await extractPdfText(bytes, { mergePages: true });
    const contentText = normalizeExtractedText(text);

    if (contentText) {
      return { fileKind: 'pdf', contentText, extractionNote: null };
    }

    return {
      fileKind: 'pdf',
      contentText: null,
      extractionNote:
        'PDF was stored successfully, but no extractable text was found. This usually means the file is image-based or uses unsupported text encoding.',
    };
  } catch {
    return {
      fileKind: 'pdf',
      contentText: null,
      extractionNote:
        'PDF was stored successfully, but text extraction could not read this file. It may be image-based or use unsupported encoding.',
    };
  }
}

function extractDocxDocumentText(bytes: Uint8Array): SourceTextExtractionResult {
  return extractZippedXmlDocument({
    bytes,
    fileKind: 'docx',
    entryPatterns: [
      /^word\/document\.xml$/i,
      /^word\/header\d+\.xml$/i,
      /^word\/footer\d+\.xml$/i,
      /^word\/footnotes\.xml$/i,
      /^word\/endnotes\.xml$/i,
      /^word\/comments\.xml$/i,
    ],
    emptyNote:
      'Word document was stored successfully, but no extractable text was found in the document body.',
    parser: extractWordXmlText,
  });
}

function extractXlsxDocumentText(bytes: Uint8Array): SourceTextExtractionResult {
  try {
    const archive = unzipSync(bytes);
    const workbookXml = readArchiveEntryText(archive, 'xl/workbook.xml');
    const sharedStringsXml = readArchiveEntryText(archive, 'xl/sharedStrings.xml');
    const sharedStrings = parseSharedStrings(sharedStringsXml);
    const sheetNames = parseWorkbookSheetNames(workbookXml);

    const sheetEntries = Object.keys(archive)
      .filter((path) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(path))
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

    const sections = sheetEntries
      .map((path, index) => {
        const xml = readArchiveEntryText(archive, path);
        if (!xml) return null;
        const rows = extractSpreadsheetRows(xml, sharedStrings);
        if (!rows.length) return null;
        const header = sheetNames[index] ?? `Sheet ${index + 1}`;
        return [header, ...rows].join('\n');
      })
      .filter((section): section is string => Boolean(section));

    const contentText = normalizeExtractedText(sections.join('\n\n'));
    if (contentText) {
      return { fileKind: 'xlsx', contentText, extractionNote: null };
    }

    return {
      fileKind: 'xlsx',
      contentText: null,
      extractionNote:
        'Spreadsheet was stored successfully, but no extractable worksheet text was found.',
    };
  } catch {
    return {
      fileKind: 'xlsx',
      contentText: null,
      extractionNote:
        'Spreadsheet was stored successfully, but text extraction could not read this workbook.',
    };
  }
}

function extractPptxDocumentText(bytes: Uint8Array): SourceTextExtractionResult {
  return extractZippedXmlDocument({
    bytes,
    fileKind: 'pptx',
    entryPatterns: [/^ppt\/slides\/slide\d+\.xml$/i, /^ppt\/notesSlides\/notesSlide\d+\.xml$/i],
    emptyNote:
      'Presentation was stored successfully, but no extractable slide text was found.',
    parser: extractPresentationXmlText,
  });
}

function extractZippedXmlDocument(input: {
  bytes: Uint8Array;
  fileKind: Extract<SourceFileKind, 'docx' | 'pptx'>;
  entryPatterns: RegExp[];
  emptyNote: string;
  parser: (xml: string) => string;
}): SourceTextExtractionResult {
  try {
    const archive = unzipSync(input.bytes);
    const sections = Object.keys(archive)
      .filter((path) => input.entryPatterns.some((pattern) => pattern.test(path)))
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
      .map((path) => input.parser(readArchiveEntryText(archive, path)))
      .filter(Boolean);

    const contentText = normalizeExtractedText(sections.join('\n\n'));
    if (contentText) {
      return { fileKind: input.fileKind, contentText, extractionNote: null };
    }

    return {
      fileKind: input.fileKind,
      contentText: null,
      extractionNote: input.emptyNote,
    };
  } catch {
    return {
      fileKind: input.fileKind,
      contentText: null,
      extractionNote:
        input.fileKind === 'docx'
          ? 'Word document was stored successfully, but text extraction could not read this file.'
          : 'Presentation was stored successfully, but text extraction could not read this file.',
    };
  }
}

function readArchiveEntryText(archive: Record<string, Uint8Array>, path: string): string {
  const bytes = archive[path];
  return bytes ? strFromU8(bytes) : '';
}

function extractWordXmlText(xml: string): string {
  return cleanXmlText(
    xml
      .replace(/<w:tab\b[^>]*\/>/g, '\t')
      .replace(/<w:br\b[^>]*\/>/g, '\n')
      .replace(/<w:cr\b[^>]*\/>/g, '\n')
      .replace(/<\/w:p>/g, '\n')
      .replace(/<\/w:tr>/g, '\n')
      .replace(/<\/w:tc>/g, '\t'),
  );
}

function extractPresentationXmlText(xml: string): string {
  const tokens = Array.from(xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g))
    .map((match) => decodeXmlEntities(match[1]))
    .map((token) => token.trim())
    .filter(Boolean);

  return tokens.join('\n');
}

function parseSharedStrings(xml: string): string[] {
  return Array.from(xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)).map((match) =>
    cleanXmlText(match[1]),
  );
}

function parseWorkbookSheetNames(xml: string): string[] {
  return Array.from(xml.matchAll(/<sheet\b[^>]*name="([^"]+)"/g)).map((match) =>
    decodeXmlEntities(match[1]),
  );
}

function extractSpreadsheetRows(xml: string, sharedStrings: string[]): string[] {
  const rows: string[] = [];

  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const rowValues: string[] = [];

    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attributes = cellMatch[1];
      const content = cellMatch[2];
      const typeMatch = /\bt="([^"]+)"/.exec(attributes);
      const cellType = typeMatch?.[1] ?? null;
      const value = extractSpreadsheetCellValue(content, cellType, sharedStrings);

      if (value) {
        rowValues.push(value);
      }
    }

    if (rowValues.length > 0) {
      rows.push(rowValues.join(' | '));
    }
  }

  return rows;
}

function extractSpreadsheetCellValue(
  xml: string,
  cellType: string | null,
  sharedStrings: string[],
): string | null {
  if (cellType === 'inlineStr') {
    return cleanXmlText(xml);
  }

  const valueMatch = /<v[^>]*>([\s\S]*?)<\/v>/.exec(xml);
  if (!valueMatch) return null;

  const rawValue = decodeXmlEntities(valueMatch[1]).trim();
  if (!rawValue) return null;

  if (cellType === 's') {
    const sharedString = sharedStrings[Number(rawValue)];
    return sharedString ? sharedString.trim() : null;
  }

  if (cellType === 'b') {
    return rawValue === '1' ? 'TRUE' : 'FALSE';
  }

  return rawValue;
}

function cleanXmlText(xml: string): string {
  return decodeXmlEntities(xml.replace(/<[^>]+>/g, ' '));
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&(amp|lt|gt|quot|apos);/g, (entity) => XML_ENTITY_REPLACEMENTS[entity] ?? entity);
}

function buildAiMarkdownOptions(fileKind: SourceFileKind): SourceMarkdownConversionOptions {
  switch (fileKind) {
    case 'pdf':
      return {
        conversionOptions: {
          pdf: {
            metadata: false,
            images: {
              convert: true,
              maxConvertedImages: 8,
              descriptionLanguage: 'en',
            },
          },
        },
      };
    case 'docx':
      return {
        conversionOptions: {
          docx: {
            images: {
              convert: true,
              maxConvertedImages: 6,
              descriptionLanguage: 'en',
            },
          },
        },
      };
    case 'image':
      return {
        conversionOptions: {
          image: {
            descriptionLanguage: 'en',
          },
        },
      };
    default:
      return {};
  }
}

async function extractSourceDocumentTextWithPdfVision(input: {
  ai: SourceVisionAiBinding;
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
  method: Extract<SourceExtractionMethod, 'upload_ai' | 'queued_ai'>;
}): Promise<SourceTextExtractionResult> {
  const attemptedProvenance = buildAiVisionExtractionProvenance(input.method);

  try {
    const pageImages = await extractPdfImagesForVision(input.bytes, MAX_PDF_VISION_PAGES);
    if (!pageImages.length) {
      return {
        fileKind: 'pdf',
        contentText: null,
        extractionNote: buildVisionNoImageNote(),
        attemptedProvenance,
      };
    }

    const pageTranscripts: string[] = [];
    let sawDescription = false;
    let sawUnreadable = false;

    for (const pageImage of pageImages) {
      const response = await input.ai.run(PDF_VISION_MODEL, {
        prompt: PDF_VISION_PROMPT,
        image: Array.from(pageImage.encodedBytes),
        max_tokens: 1800,
        temperature: 0,
        top_p: 0.1,
      });
      const classification = classifyVisionTranscriptionResponse(response.response ?? '');

      if (classification.kind === 'text') {
        pageTranscripts.push(
          pageImages.length > 1
            ? [`Page ${pageImage.pageNumber}`, classification.contentText].join('\n')
            : classification.contentText,
        );
        continue;
      }

      if (classification.kind === 'description') {
        sawDescription = true;
        continue;
      }

      if (classification.kind === 'unreadable') {
        sawUnreadable = true;
      }
    }

    const contentText = normalizeExtractedText(pageTranscripts.join('\n\n'));
    if (contentText) {
      return {
        fileKind: 'pdf',
        contentText,
        extractionNote: null,
        extractionProvenance: attemptedProvenance,
        attemptedProvenance,
      };
    }

    return {
      fileKind: 'pdf',
      contentText: null,
      extractionNote: sawDescription ? buildAiDescriptionNote('pdf') : buildVisionEmptyNote(sawUnreadable),
      attemptedProvenance,
    };
  } catch (error) {
    return {
      fileKind: 'pdf',
      contentText: null,
      extractionNote: buildVisionErrorNote(error instanceof Error ? error.message : 'Unknown AI vision OCR error.'),
      attemptedProvenance,
    };
  }
}

function buildAiUnsupportedNote(fileKind: SourceFileKind): string {
  if (fileKind === 'legacy_word' || fileKind === 'legacy_excel' || fileKind === 'legacy_powerpoint') {
    return 'This legacy Office format is stored successfully, but the current AI extraction fallback does not support it yet.';
  }

  return 'This file is stored successfully, but the current AI extraction fallback does not support it yet.';
}

function buildAiEmptyNote(fileKind: SourceFileKind): string {
  switch (fileKind) {
    case 'pdf':
      return 'Background AI extraction completed, but the PDF still did not produce usable text. It likely needs manual OCR follow-up.';
    case 'image':
      return 'Background AI OCR completed, but the image still did not produce usable text. It likely needs manual review.';
    case 'legacy_excel':
      return 'Background AI extraction completed, but the legacy spreadsheet still did not produce usable text.';
    default:
      return 'Background AI extraction completed, but the file still did not produce usable text.';
  }
}

function buildAiDescriptionNote(fileKind: SourceFileKind): string {
  switch (fileKind) {
    case 'image':
      return 'Background AI OCR described the image layout, but did not recover usable document text. This file still needs manual review.';
    case 'pdf':
      return 'Background AI extraction described the PDF page visually, but did not recover usable document text. This file still needs manual review.';
    default:
      return 'Background AI extraction described the file visually, but did not recover usable document text. This file still needs manual review.';
  }
}

function buildVisionNoImageNote(): string {
  return 'Background AI OCR could not isolate a page image from this PDF. It still needs manual OCR follow-up.';
}

function buildVisionEmptyNote(sawUnreadable: boolean): string {
  if (sawUnreadable) {
    return 'Background AI OCR reviewed scanned PDF pages, but the text was still not readable enough to recover. This file still needs manual follow-up.';
  }

  return 'Background AI OCR completed, but the scanned PDF still did not produce usable document text. It still needs manual follow-up.';
}

function buildVisionErrorNote(error: string): string {
  const cleanedError = error.trim();
  if (/PDF file is empty/i.test(cleanedError)) {
    return 'Background AI OCR could not isolate page imagery from this scanned PDF in the current worker runtime. It still needs manual OCR follow-up.';
  }

  const suffix = cleanedError ? ` (${cleanedError})` : '';
  return `Background AI OCR could not process this scanned PDF${suffix}.`;
}

function buildAiErrorNote(fileKind: SourceFileKind, error: string): string {
  const cleanedError = error.trim();
  const suffix = cleanedError ? ` (${cleanedError})` : '';

  switch (fileKind) {
    case 'pdf':
      return `Background AI extraction could not process this PDF${suffix}.`;
    case 'image':
      return `Background AI OCR could not process this image${suffix}.`;
    default:
      return `Background AI extraction could not process this file${suffix}.`;
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function normalizeExtractedText(text: string): string | null {
  const normalized = text
    .replace(/\u0000/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/\t+/g, ' | ')
    .replace(/[ \f\v]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return normalized.length > 0 ? normalized : null;
}

async function extractPdfImagesForVision(
  bytes: Uint8Array,
  maxPages: number,
): Promise<PdfVisionImage[]> {
  const pdfText = decodePdfLatin1(bytes);
  const parsedObjects = parsePdfObjects(pdfText);
  const objectsById = new Map(parsedObjects.map((object) => [object.objectNumber, object]));

  const parsedImages = parsedObjects
    .map((object) => resolvePdfImageForVision(object, bytes, objectsById))
    .filter((image): image is Omit<PdfVisionImage, 'pageNumber'> => Boolean(image))
    .sort((left, right) => right.sortArea - left.sortArea);

  if (parsedImages.length > 0) {
    return parsedImages.slice(0, maxPages).map((image, index) => ({
      pageNumber: index + 1,
      ...image,
    }));
  }

  return extractPdfImagesForVisionByByteScan(bytes, maxPages).map((image, index) => ({
    pageNumber: index + 1,
    ...image,
  }));
}

function decodePdfLatin1(bytes: Uint8Array): string {
  return LATIN1_DECODER.decode(bytes);
}

function parsePdfObjects(pdfText: string): PdfParsedObject[] {
  const objectPattern = /(\d+)\s+(\d+)\s+obj\b/g;
  const objects: PdfParsedObject[] = [];

  for (let match = objectPattern.exec(pdfText); match; match = objectPattern.exec(pdfText)) {
    const bodyStart = objectPattern.lastIndex;
    const endObjIndex = pdfText.indexOf('endobj', bodyStart);
    if (endObjIndex === -1) {
      break;
    }

    const bodyText = pdfText.slice(bodyStart, endObjIndex);
    const streamMatch = /\bstream\r?\n/.exec(bodyText);
    const prefix = streamMatch ? bodyText.slice(0, streamMatch.index) : bodyText;

    objects.push({
      objectNumber: Number.parseInt(match[1], 10),
      generation: Number.parseInt(match[2], 10),
      bodyStart,
      bodyText,
      dictionaryText: extractPdfDictionaryText(prefix),
      streamStart: streamMatch ? bodyStart + streamMatch.index + streamMatch[0].length : null,
      streamSearchIndex: streamMatch ? streamMatch.index + streamMatch[0].length : null,
      streamLengthToken: readPdfIntegerOrRef(prefix, 'Length'),
    });

    objectPattern.lastIndex = endObjIndex + 'endobj'.length;
  }

  return objects;
}

function extractPdfDictionaryText(text: string): string | null {
  const startIndex = text.indexOf('<<');
  const endIndex = text.lastIndexOf('>>');

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return null;
  }

  return text.slice(startIndex, endIndex + 2);
}

function readPdfIntegerOrRef(text: string, key: string): number | PdfObjectRef | null {
  const directMatch = new RegExp(`/${key}\\s+(\\d+)\\b`).exec(text);
  if (directMatch) {
    return Number.parseInt(directMatch[1], 10);
  }

  const refMatch = new RegExp(`/${key}\\s+(\\d+)\\s+(\\d+)\\s+R\\b`).exec(text);
  if (!refMatch) {
    return null;
  }

  return {
    objectNumber: Number.parseInt(refMatch[1], 10),
    generation: Number.parseInt(refMatch[2], 10),
  };
}

function readPdfInteger(text: string, key: string): number | null {
  const match = new RegExp(`/${key}\\s+(\\d+)\\b`).exec(text);
  return match ? Number.parseInt(match[1], 10) : null;
}

function readPdfNameList(text: string, key: string): string[] {
  const arrayMatch = new RegExp(`/${key}\\s*\\[((?:\\s*/[A-Za-z0-9]+\\s*)+)\\]`).exec(text);
  if (arrayMatch) {
    return Array.from(arrayMatch[1].matchAll(/\/([A-Za-z0-9]+)/g)).map((match) => match[1]);
  }

  const directMatch = new RegExp(`/${key}\\s*/([A-Za-z0-9]+)`).exec(text);
  return directMatch ? [directMatch[1]] : [];
}

function readPdfObjectRef(text: string, key: string): PdfObjectRef | null {
  const match = new RegExp(`/${key}\\s+(\\d+)\\s+(\\d+)\\s+R\\b`).exec(text);
  if (!match) {
    return null;
  }

  return {
    objectNumber: Number.parseInt(match[1], 10),
    generation: Number.parseInt(match[2], 10),
  };
}

function resolvePdfImageForVision(
  object: PdfParsedObject,
  bytes: Uint8Array,
  objectsById: Map<number, PdfParsedObject>,
): Omit<PdfVisionImage, 'pageNumber'> | null {
  const dictionaryText = object.dictionaryText;
  if (!dictionaryText || !/\/Subtype\s*\/Image\b/.test(dictionaryText)) {
    return null;
  }

  const width = readPdfInteger(dictionaryText, 'Width');
  const height = readPdfInteger(dictionaryText, 'Height');
  if (!width || !height) {
    return null;
  }

  const streamBytes = resolvePdfStreamBytes(object, bytes, objectsById);
  if (!streamBytes || !streamBytes.byteLength) {
    return null;
  }

  const decodedImage = decodePdfImageStream(streamBytes, readPdfNameList(dictionaryText, 'Filter'));
  if (!decodedImage) {
    return null;
  }

  if (decodedImage.kind === 'encoded') {
    return {
      encodedBytes: decodedImage.bytes,
      mimeType: decodedImage.mimeType,
      sortArea: width * height,
    };
  }

  const bitsPerComponent = readPdfInteger(dictionaryText, 'BitsPerComponent') ?? 8;
  if (bitsPerComponent !== 8) {
    return null;
  }

  const channels = derivePdfImageChannels({
    dictionaryText,
    decodedBytes: decodedImage.bytes,
    width,
    height,
    objectsById,
  });
  if (!channels) {
    return null;
  }

  return {
    encodedBytes: encodePngFromRawImage({
      data: decodedImage.bytes,
      width,
      height,
      channels,
    }),
    mimeType: 'image/png',
    sortArea: width * height,
  };
}

function extractPdfImagesForVisionByByteScan(
  bytes: Uint8Array,
  maxPages: number,
): Omit<PdfVisionImage, 'pageNumber'>[] {
  const images: Omit<PdfVisionImage, 'pageNumber'>[] = [];
  let searchIndex = 0;

  while (searchIndex < bytes.byteLength) {
    const subtypeIndex = indexOfBytes(bytes, PDF_SUBTYPE_IMAGE_BYTES, searchIndex);
    if (subtypeIndex === -1) {
      break;
    }

    const dictionaryStart = lastIndexOfBytes(bytes, PDF_DICT_OPEN_BYTES, subtypeIndex);
    const streamMarkerIndex = indexOfBytes(bytes, PDF_STREAM_BYTES, subtypeIndex);

    if (dictionaryStart === -1 || streamMarkerIndex === -1) {
      searchIndex = subtypeIndex + PDF_SUBTYPE_IMAGE_BYTES.length;
      continue;
    }

    const dictionaryEnd = lastIndexOfBytes(bytes, PDF_DICT_CLOSE_BYTES, streamMarkerIndex);
    if (dictionaryEnd === -1 || dictionaryEnd <= dictionaryStart) {
      searchIndex = subtypeIndex + PDF_SUBTYPE_IMAGE_BYTES.length;
      continue;
    }

    const dictionaryText = decodePdfLatin1(bytes.slice(dictionaryStart, dictionaryEnd + PDF_DICT_CLOSE_BYTES.length));
    const width = readPdfInteger(dictionaryText, 'Width');
    const height = readPdfInteger(dictionaryText, 'Height');
    if (!width || !height) {
      searchIndex = streamMarkerIndex + PDF_STREAM_BYTES.length;
      continue;
    }

    const streamStart = skipPdfStreamLineBreak(bytes, streamMarkerIndex + PDF_STREAM_BYTES.length);
    if (streamStart >= bytes.byteLength) {
      searchIndex = streamMarkerIndex + PDF_STREAM_BYTES.length;
      continue;
    }

    const streamLengthToken = readPdfIntegerOrRef(dictionaryText, 'Length');
    let streamBytes: Uint8Array | null = null;

    if (typeof streamLengthToken === 'number' && streamLengthToken >= 0) {
      const streamEnd = streamStart + streamLengthToken;
      if (streamEnd <= bytes.byteLength) {
        streamBytes = bytes.slice(streamStart, streamEnd);
      }
    }

    if (!streamBytes) {
      const endStreamIndex = indexOfBytes(bytes, PDF_ENDSTREAM_BYTES, streamStart);
      if (endStreamIndex !== -1) {
        let sliceEnd = endStreamIndex;
        while (
          sliceEnd > streamStart &&
          (bytes[sliceEnd - 1] === 0x0a || bytes[sliceEnd - 1] === 0x0d)
        ) {
          sliceEnd -= 1;
        }
        streamBytes = bytes.slice(streamStart, sliceEnd);
      }
    }

    if (!streamBytes || !streamBytes.byteLength) {
      searchIndex = streamMarkerIndex + PDF_STREAM_BYTES.length;
      continue;
    }

    const decodedImage = decodePdfImageStream(streamBytes, readPdfNameList(dictionaryText, 'Filter'));
    if (!decodedImage) {
      searchIndex = streamMarkerIndex + PDF_STREAM_BYTES.length;
      continue;
    }

    if (decodedImage.kind === 'encoded') {
      images.push({
        encodedBytes: decodedImage.bytes,
        mimeType: decodedImage.mimeType,
        sortArea: width * height,
      });
      searchIndex = streamMarkerIndex + PDF_STREAM_BYTES.length;
      continue;
    }

    const bitsPerComponent = readPdfInteger(dictionaryText, 'BitsPerComponent') ?? 8;
    if (bitsPerComponent !== 8) {
      searchIndex = streamMarkerIndex + PDF_STREAM_BYTES.length;
      continue;
    }

    const channels = derivePdfImageChannels({
      dictionaryText,
      decodedBytes: decodedImage.bytes,
      width,
      height,
      objectsById: new Map(),
    });
    if (!channels) {
      searchIndex = streamMarkerIndex + PDF_STREAM_BYTES.length;
      continue;
    }

    images.push({
      encodedBytes: encodePngFromRawImage({
        data: decodedImage.bytes,
        width,
        height,
        channels,
      }),
      mimeType: 'image/png',
      sortArea: width * height,
    });
    searchIndex = streamMarkerIndex + PDF_STREAM_BYTES.length;
  }

  return images.sort((left, right) => right.sortArea - left.sortArea).slice(0, maxPages);
}

function resolvePdfStreamBytes(
  object: PdfParsedObject,
  bytes: Uint8Array,
  objectsById: Map<number, PdfParsedObject>,
): Uint8Array | null {
  if (object.streamStart == null) {
    return null;
  }

  const resolvedLength = resolvePdfStreamLength(object.streamLengthToken, objectsById);
  if (
    resolvedLength != null &&
    resolvedLength >= 0 &&
    object.streamStart + resolvedLength <= bytes.byteLength
  ) {
    return bytes.slice(object.streamStart, object.streamStart + resolvedLength);
  }

  if (object.streamSearchIndex == null) {
    return null;
  }

  const endStreamIndex = object.bodyText.indexOf('endstream', object.streamSearchIndex);
  if (endStreamIndex === -1) {
    return null;
  }

  let sliceEnd = object.bodyStart + endStreamIndex;
  while (
    sliceEnd > object.streamStart &&
    (bytes[sliceEnd - 1] === 0x0a || bytes[sliceEnd - 1] === 0x0d)
  ) {
    sliceEnd -= 1;
  }

  return bytes.slice(object.streamStart, sliceEnd);
}

function skipPdfStreamLineBreak(bytes: Uint8Array, index: number): number {
  if (bytes[index] === 0x0d && bytes[index + 1] === 0x0a) {
    return index + 2;
  }

  if (bytes[index] === 0x0d || bytes[index] === 0x0a) {
    return index + 1;
  }

  return index;
}

function indexOfBytes(haystack: Uint8Array, needle: Uint8Array, fromIndex: number): number {
  if (needle.byteLength === 0) {
    return fromIndex;
  }

  const startIndex = Math.max(0, fromIndex);
  const lastStart = haystack.byteLength - needle.byteLength;

  for (let index = startIndex; index <= lastStart; index += 1) {
    let matches = true;
    for (let needleIndex = 0; needleIndex < needle.byteLength; needleIndex += 1) {
      if (haystack[index + needleIndex] !== needle[needleIndex]) {
        matches = false;
        break;
      }
    }

    if (matches) {
      return index;
    }
  }

  return -1;
}

function lastIndexOfBytes(haystack: Uint8Array, needle: Uint8Array, fromIndex: number): number {
  if (needle.byteLength === 0) {
    return fromIndex;
  }

  const startIndex = Math.min(
    Math.max(0, fromIndex),
    haystack.byteLength - needle.byteLength,
  );

  for (let index = startIndex; index >= 0; index -= 1) {
    let matches = true;
    for (let needleIndex = 0; needleIndex < needle.byteLength; needleIndex += 1) {
      if (haystack[index + needleIndex] !== needle[needleIndex]) {
        matches = false;
        break;
      }
    }

    if (matches) {
      return index;
    }
  }

  return -1;
}

function resolvePdfStreamLength(
  token: number | PdfObjectRef | null,
  objectsById: Map<number, PdfParsedObject>,
): number | null {
  if (typeof token === 'number') {
    return token;
  }

  if (!token) {
    return null;
  }

  const object = objectsById.get(token.objectNumber);
  if (!object) {
    return null;
  }

  const match = object.bodyText.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function decodePdfImageStream(
  streamBytes: Uint8Array,
  filters: string[],
):
  | { kind: 'encoded'; bytes: Uint8Array; mimeType: 'image/jpeg' | 'image/jp2' }
  | { kind: 'raw'; bytes: Uint8Array }
  | null {
  let current = streamBytes;

  for (const filter of filters) {
    switch (filter) {
      case 'ASCII85Decode':
        current = decodeAscii85(current);
        break;
      case 'ASCIIHexDecode':
        current = decodeAsciiHex(current);
        break;
      case 'FlateDecode':
        current = unzlibSync(current);
        break;
      case 'DCTDecode':
        return { kind: 'encoded', bytes: current, mimeType: 'image/jpeg' };
      case 'JPXDecode':
        return { kind: 'encoded', bytes: current, mimeType: 'image/jp2' };
      default:
        return null;
    }
  }

  return { kind: 'raw', bytes: current };
}

function decodeAsciiHex(bytes: Uint8Array): Uint8Array {
  const hexText = decodePdfLatin1(bytes).replace(/[\s>]/g, '');
  const padded = hexText.length % 2 === 1 ? `${hexText}0` : hexText;
  const output = new Uint8Array(padded.length / 2);

  for (let index = 0; index < padded.length; index += 2) {
    output[index / 2] = Number.parseInt(padded.slice(index, index + 2), 16);
  }

  return output;
}

function decodeAscii85(bytes: Uint8Array): Uint8Array {
  const input = decodePdfLatin1(bytes)
    .replace(/[\s]/g, '')
    .replace(/^<~/, '')
    .replace(/~>$/, '');

  const output: number[] = [];
  let chunk: number[] = [];

  for (const character of input) {
    if (character === 'z' && chunk.length === 0) {
      output.push(0, 0, 0, 0);
      continue;
    }

    const value = character.charCodeAt(0) - 33;
    if (value < 0 || value > 84) {
      continue;
    }

    chunk.push(value);
    if (chunk.length === 5) {
      appendAscii85Chunk(output, chunk, 4);
      chunk = [];
    }
  }

  if (chunk.length > 0) {
    const paddedLength = chunk.length;
    while (chunk.length < 5) {
      chunk.push(84);
    }
    appendAscii85Chunk(output, chunk, paddedLength - 1);
  }

  return Uint8Array.from(output);
}

function appendAscii85Chunk(output: number[], chunk: number[], bytesToWrite: number): void {
  let value = 0;
  for (const digit of chunk) {
    value = value * 85 + digit;
  }

  const bytes = [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ];

  output.push(...bytes.slice(0, bytesToWrite));
}

function derivePdfImageChannels(input: {
  dictionaryText: string;
  decodedBytes: Uint8Array;
  width: number;
  height: number;
  objectsById: Map<number, PdfParsedObject>;
}): number | null {
  const directMatch = /\/ColorSpace\s*\/(DeviceGray|DeviceRGB|DeviceCMYK)\b/.exec(input.dictionaryText);
  if (directMatch) {
    return mapPdfColorSpaceToChannels(directMatch[1]);
  }

  const colorSpaceRef = readPdfObjectRef(input.dictionaryText, 'ColorSpace');
  if (colorSpaceRef) {
    const colorSpaceObject = input.objectsById.get(colorSpaceRef.objectNumber);
    if (colorSpaceObject) {
      const directObjectMatch = /\/(DeviceGray|DeviceRGB|DeviceCMYK)\b/.exec(colorSpaceObject.bodyText);
      if (directObjectMatch) {
        return mapPdfColorSpaceToChannels(directObjectMatch[1]);
      }

      const iccMatch = /\[\s*\/ICCBased\s+(\d+)\s+(\d+)\s+R\s*\]/.exec(colorSpaceObject.bodyText);
      if (iccMatch) {
        const iccObject = input.objectsById.get(Number.parseInt(iccMatch[1], 10));
        const channels = iccObject ? readPdfInteger(iccObject.bodyText, 'N') : null;
        if (channels && channels >= 1 && channels <= 4) {
          return channels;
        }
      }
    }
  }

  const derivedChannels = input.decodedBytes.byteLength / (input.width * input.height);
  return Number.isInteger(derivedChannels) && derivedChannels >= 1 && derivedChannels <= 4
    ? derivedChannels
    : null;
}

function mapPdfColorSpaceToChannels(colorSpace: string): number | null {
  switch (colorSpace) {
    case 'DeviceGray':
      return 1;
    case 'DeviceRGB':
      return 3;
    case 'DeviceCMYK':
      return 4;
    default:
      return null;
  }
}

function encodePngFromRawImage(input: {
  data: Uint8Array;
  width: number;
  height: number;
  channels: number;
}): Uint8Array {
  const bytesPerPixel = input.channels;
  if (input.channels < 1 || input.channels > 4) {
    throw new Error(`Unsupported PDF image channel count: ${input.channels}`);
  }

  const expectedLength = input.width * input.height * bytesPerPixel;
  if (input.data.byteLength !== expectedLength) {
    throw new Error('PDF image byte length did not match the expected dimensions.');
  }

  const scanlineLength = input.width * bytesPerPixel;
  const raw = new Uint8Array(input.height * (scanlineLength + 1));

  for (let row = 0; row < input.height; row += 1) {
    const rawOffset = row * (scanlineLength + 1);
    const sourceOffset = row * scanlineLength;
    raw[rawOffset] = 0;
    raw.set(input.data.subarray(sourceOffset, sourceOffset + scanlineLength), rawOffset + 1);
  }

  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, input.width);
  ihdrView.setUint32(4, input.height);
  ihdr[8] = 8;
  ihdr[9] = mapChannelsToPngColorType(input.channels);
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlibSync(raw);
  return concatUint8Arrays([
    PNG_SIGNATURE,
    buildPngChunk('IHDR', ihdr),
    buildPngChunk('IDAT', compressed),
    buildPngChunk('IEND', new Uint8Array()),
  ]);
}

function mapChannelsToPngColorType(channels: number): number {
  switch (channels) {
    case 1:
      return 0;
    case 2:
      return 4;
    case 3:
      return 2;
    case 4:
      return 6;
    default:
      throw new Error(`Unsupported PDF image channel count: ${channels}`);
  }
}

function buildPngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const chunk = new Uint8Array(12 + data.byteLength);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.byteLength);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  view.setUint32(8 + data.byteLength, crc32(typeBytes, data));
  return chunk;
}

function concatUint8Arrays(chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return output;
}

function buildPngCrcTable(): Uint32Array {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;

    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }

    table[index] = value >>> 0;
  }

  return table;
}

function crc32(typeBytes: Uint8Array, data: Uint8Array): number {
  let crc = 0xffffffff;

  for (const bytes of [typeBytes, data]) {
    for (const value of bytes) {
      crc = PNG_CRC_TABLE[(crc ^ value) & 0xff] ^ (crc >>> 8);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function classifyVisionTranscriptionResponse(response: string): VisionResponseClassification {
  const normalized = normalizeExtractedText(stripCodeFences(response));
  if (!normalized) {
    return { kind: 'empty' };
  }

  const stripped = normalized.replace(AI_TRANSCRIPTION_PREAMBLE, '').trim();
  if (!stripped) {
    return { kind: 'empty' };
  }

  if (AI_UNREADABLE_MARKERS.some((pattern) => pattern.test(stripped))) {
    return { kind: 'unreadable' };
  }

  if (looksLikeVisualDescription(stripped)) {
    return { kind: 'description' };
  }

  return { kind: 'text', contentText: stripped };
}

function stripCodeFences(text: string): string {
  return text.replace(/^```[\w-]*\n?/i, '').replace(/\n```$/i, '');
}

function looksLikeVisualDescription(text: string): boolean {
  const normalized = text.trim();
  if (!normalized.length) return false;

  const hasStructuredLines = normalized.split(/\n+/).length >= 3;
  if (hasStructuredLines) return false;

  const markerHits = VISUAL_DESCRIPTION_MARKERS.filter((pattern) => pattern.test(normalized)).length;
  const startsLikeCaption = /^(a|an|the)\s/i.test(normalized);

  return markerHits >= 3 || (markerHits >= 2 && startsLikeCaption);
}
