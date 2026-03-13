import { zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { extractSourceDocumentText, extractSourceDocumentTextWithAi } from '../source-extraction';

describe('source extraction', () => {
  it('extracts text from docx documents', async () => {
    const archive = zipSync({
      '[Content_Types].xml': encodeText('<?xml version="1.0" encoding="UTF-8"?><Types />'),
      'word/document.xml': encodeText(
        `<?xml version="1.0" encoding="UTF-8"?>
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:body>
            <w:p><w:r><w:t>Teams:</w:t></w:r></w:p>
            <w:p><w:r><w:t>Security</w:t></w:r></w:p>
            <w:p><w:r><w:t>Vendors:</w:t></w:r></w:p>
            <w:p><w:r><w:t>Okta</w:t></w:r></w:p>
          </w:body>
        </w:document>`,
      ),
    });

    const result = await extractSourceDocumentText({
      bytes: archive,
      fileName: 'playbook.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    expect(result.contentText).toContain('Teams:');
    expect(result.contentText).toContain('Security');
    expect(result.contentText).toContain('Vendors:');
    expect(result.contentText).toContain('Okta');
    expect(result.extractionNote).toBeNull();
  });

  it('extracts text from xlsx worksheets', async () => {
    const archive = zipSync({
      '[Content_Types].xml': encodeText('<?xml version="1.0" encoding="UTF-8"?><Types />'),
      'xl/workbook.xml': encodeText(
        `<?xml version="1.0" encoding="UTF-8"?>
        <workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
          <sheets>
            <sheet name="Scenario Inputs" sheetId="1" r:id="rId1" />
          </sheets>
        </workbook>`,
      ),
      'xl/sharedStrings.xml': encodeText(
        `<?xml version="1.0" encoding="UTF-8"?>
        <sst>
          <si><t>Teams</t></si>
          <si><t>Security</t></si>
          <si><t>Vendors</t></si>
          <si><t>Okta</t></si>
        </sst>`,
      ),
      'xl/worksheets/sheet1.xml': encodeText(
        `<?xml version="1.0" encoding="UTF-8"?>
        <worksheet>
          <sheetData>
            <row r="1">
              <c r="A1" t="s"><v>0</v></c>
              <c r="B1" t="s"><v>1</v></c>
            </row>
            <row r="2">
              <c r="A2" t="s"><v>2</v></c>
              <c r="B2" t="s"><v>3</v></c>
            </row>
          </sheetData>
        </worksheet>`,
      ),
    });

    const result = await extractSourceDocumentText({
      bytes: archive,
      fileName: 'vendor-matrix.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    expect(result.contentText).toContain('Scenario Inputs');
    expect(result.contentText).toContain('Teams | Security');
    expect(result.contentText).toContain('Vendors | Okta');
    expect(result.extractionNote).toBeNull();
  });

  it('extracts text from pptx slides', async () => {
    const archive = zipSync({
      '[Content_Types].xml': encodeText('<?xml version="1.0" encoding="UTF-8"?><Types />'),
      'ppt/slides/slide1.xml': encodeText(
        `<?xml version="1.0" encoding="UTF-8"?>
        <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <p:cSld>
            <p:spTree>
              <p:sp>
                <p:txBody>
                  <a:p><a:r><a:t>Escalation Roles</a:t></a:r></a:p>
                  <a:p><a:r><a:t>Incident Commander</a:t></a:r></a:p>
                </p:txBody>
              </p:sp>
            </p:spTree>
          </p:cSld>
        </p:sld>`,
      ),
    });

    const result = await extractSourceDocumentText({
      bytes: archive,
      fileName: 'tabletop-deck.pptx',
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    });

    expect(result.contentText).toContain('Escalation Roles');
    expect(result.contentText).toContain('Incident Commander');
    expect(result.extractionNote).toBeNull();
  });

  it('uses AI markdown conversion for image-based source uploads', async () => {
    const result = await extractSourceDocumentTextWithAi({
      ai: {
        toMarkdown: async () => ({
          format: 'markdown',
          data: 'Teams: Security\nVendors: Okta',
        }),
      },
      bytes: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
      fileName: 'scanned-policy.png',
      mimeType: 'image/png',
    });

    expect(result.fileKind).toBe('image');
    expect(result.contentText).toContain('Teams: Security');
    expect(result.extractionNote).toBeNull();
  });

  it('rejects description-like AI output for image uploads', async () => {
    const result = await extractSourceDocumentTextWithAi({
      ai: {
        toMarkdown: async () => ({
          format: 'markdown',
          data:
            'A white and light gray document is displayed, featuring a resume for Ryan Jameson. The resume includes a headshot. The top section presents contact details.',
        }),
      },
      bytes: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
      fileName: 'scanned-policy.png',
      mimeType: 'image/png',
    });

    expect(result.fileKind).toBe('image');
    expect(result.contentText).toBeNull();
    expect(result.extractionNote).toContain('described the image layout');
  });

  it('uses AI markdown conversion for scanned PDFs when inline text extraction cannot help', async () => {
    const result = await extractSourceDocumentTextWithAi({
      ai: {
        toMarkdown: async () => ({
          format: 'markdown',
          data: 'Teams: Security\nVendors: Okta',
        }),
      },
      bytes: createPdfBuffer([]),
      fileName: 'scanned-plan.pdf',
      mimeType: 'application/pdf',
    });

    expect(result.fileKind).toBe('pdf');
    expect(result.contentText).toContain('Teams: Security');
    expect(result.extractionNote).toBeNull();
  });

  it('falls back to scanned-PDF image transcription when markdown OCR does not recover text', async () => {
    const result = await extractSourceDocumentTextWithAi({
      ai: {
        toMarkdown: async () => ({
          format: 'markdown',
          data:
            'The document appears to be a scanned business continuity plan. The top section shows a title and the bottom section contains body text.',
        }),
        run: async () => ({
          response: 'Teams: Security\nVendors: Okta\nEscalation Roles: Incident Commander',
        }),
      },
      bytes: createScannedPdfBuffer(),
      fileName: 'scanned-plan.pdf',
      mimeType: 'application/pdf',
    });

    expect(result.fileKind).toBe('pdf');
    expect(result.contentText).toContain('Teams: Security');
    expect(result.extractionProvenance?.provider).toBe('workers_ai_vision');
    expect(result.extractionNote).toBeNull();
  });

  it('still reaches scanned-PDF vision OCR when markdown conversion throws', async () => {
    const result = await extractSourceDocumentTextWithAi({
      ai: {
        toMarkdown: async () => {
          throw new Error('error code: 1031');
        },
        run: async () => ({
          response: 'Teams: Security\nVendors: Okta',
        }),
      },
      bytes: createScannedPdfBuffer(),
      fileName: 'scanned-plan.pdf',
      mimeType: 'application/pdf',
    });

    expect(result.fileKind).toBe('pdf');
    expect(result.contentText).toContain('Teams: Security');
    expect(result.extractionProvenance?.provider).toBe('workers_ai_vision');
  });

  it('keeps scanned PDFs in manual follow-up when vision OCR still returns a layout description', async () => {
    const result = await extractSourceDocumentTextWithAi({
      ai: {
        toMarkdown: async () => ({
          format: 'markdown',
          data: '',
        }),
        run: async () => ({
          response:
            'The document is displayed on a white page. The top section contains a title and the bottom section contains paragraphs.',
        }),
      },
      bytes: createScannedPdfBuffer(),
      fileName: 'scanned-plan.pdf',
      mimeType: 'application/pdf',
    });

    expect(result.fileKind).toBe('pdf');
    expect(result.contentText).toBeNull();
    expect(result.attemptedProvenance?.provider).toBe('workers_ai_vision');
    expect(result.extractionNote).toContain('described the PDF page visually');
  });

  it('keeps scanned PDFs in manual follow-up when no embedded page image can be isolated', async () => {
    const result = await extractSourceDocumentTextWithAi({
      ai: {
        toMarkdown: async () => ({
          format: 'markdown',
          data: '',
        }),
        run: async () => ({
          response: 'Teams: Security\nVendors: Okta',
        }),
      },
      bytes: createPdfBuffer([]),
      fileName: 'scanned-plan.pdf',
      mimeType: 'application/pdf',
    });

    expect(result.fileKind).toBe('pdf');
    expect(result.contentText).toBeNull();
    expect(result.attemptedProvenance?.provider).toBe('workers_ai_vision');
    expect(result.extractionNote).toContain('could not isolate a page image');
  });

  it('keeps legacy Office formats explicitly unsupported in the AI fallback for v1', async () => {
    let called = false;
    const result = await extractSourceDocumentTextWithAi({
      ai: {
        toMarkdown: async () => {
          called = true;
          return {
            format: 'markdown',
            data: 'Should not be reached',
          };
        },
      },
      bytes: new Uint8Array([208, 207, 17, 224]),
      fileName: 'legacy-vendor-matrix.xls',
      mimeType: 'application/vnd.ms-excel',
    });

    expect(result.fileKind).toBe('legacy_excel');
    expect(result.contentText).toBeNull();
    expect(result.extractionNote).toContain('current AI extraction fallback does not support it yet');
    expect(called).toBe(false);
  });
});

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
