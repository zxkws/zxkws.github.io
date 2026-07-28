import type { UploadRecord } from '../../services/fileManagerService';

export const MAX_TEXT_PREVIEW_BYTES = 2 * 1024 * 1024;
// Proxied previews must remain below Vercel's response-body boundary.
// Images, video, audio and PDF use the direct trusted TG URL instead.
export const MAX_STRUCTURED_PREVIEW_BYTES = 3 * 1024 * 1024;

const MAX_ARCHIVE_ENTRIES = 2_000;
const MAX_ARCHIVE_EXPANDED_BYTES = 80 * 1024 * 1024;
const MAX_SPREADSHEET_SHEETS = 20;
const MAX_SPREADSHEET_CELLS = 50_000;
const MAX_SPREADSHEET_ROWS = 500;
const MAX_SPREADSHEET_COLUMNS = 100;

const TEXT_EXTENSIONS = new Set([
  'asm',
  'bat',
  'c',
  'conf',
  'cpp',
  'cs',
  'css',
  'csv',
  'diff',
  'dockerfile',
  'env',
  'go',
  'graphql',
  'h',
  'hpp',
  'htm',
  'html',
  'ini',
  'java',
  'js',
  'json',
  'jsonl',
  'jsx',
  'kt',
  'kts',
  'less',
  'log',
  'lua',
  'md',
  'mjs',
  'php',
  'properties',
  'proto',
  'ps1',
  'py',
  'rb',
  'rs',
  'rtf',
  'sass',
  'scss',
  'sh',
  'sql',
  'svg',
  'toml',
  'ts',
  'tsx',
  'txt',
  'vue',
  'xml',
  'yaml',
  'yml',
]);

const IMAGE_EXTENSIONS = new Set(['apng', 'avif', 'bmp', 'gif', 'ico', 'jfif', 'jpeg', 'jpg', 'png', 'webp']);
const VIDEO_EXTENSIONS = new Set(['m4v', 'mkv', 'mov', 'mp4', 'ogv', 'webm']);
const AUDIO_EXTENSIONS = new Set(['aac', 'flac', 'm4a', 'mp3', 'oga', 'ogg', 'opus', 'wav', 'weba']);
const WORD_EXTENSIONS = new Set(['docx']);
const SPREADSHEET_EXTENSIONS = new Set(['fods', 'numbers', 'ods', 'xls', 'xlsb', 'xlsm', 'xlsx']);
const PRESENTATION_EXTENSIONS = new Set(['odp', 'pptx']);
const ARCHIVE_EXTENSIONS = new Set(['apk', 'cbz', 'epub', 'jar', 'vsix', 'zip']);

export type PreviewKind =
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'text'
  | 'word'
  | 'spreadsheet'
  | 'presentation'
  | 'archive'
  | 'unsupported';

export type SpreadsheetSheet = {
  name: string;
  rows: string[][];
  truncated: boolean;
};

export type PresentationSlide = {
  number: number;
  text: string;
};

export type ArchiveEntry = {
  name: string;
  directory: boolean;
  compressedSize?: number;
  size?: number;
  date?: string;
};

export type StructuredPreview =
  | { kind: 'word'; text: string; warnings: string[] }
  | { kind: 'spreadsheet'; sheets: SpreadsheetSheet[]; truncated: boolean }
  | { kind: 'presentation'; slides: PresentationSlide[] }
  | { kind: 'archive'; entries: ArchiveEntry[] };

export type FilePreviewErrorCode =
  | 'http'
  | 'no-body'
  | 'too-large'
  | 'invalid-file'
  | 'too-many-entries'
  | 'expanded-too-large';

export class FilePreviewError extends Error {
  constructor(
    readonly code: FilePreviewErrorCode,
    readonly status?: number,
  ) {
    super(code);
  }
}

const extensionOf = (filename: string) => {
  const basename = filename.trim().toLowerCase().split('/').pop() || '';
  if (!basename.includes('.') && basename === 'dockerfile') return basename;
  return basename.split('.').pop() || '';
};

export const getPreviewKind = (record: UploadRecord): PreviewKind => {
  const mimeType = record.mimeType?.toLowerCase().split(';')[0].trim() || '';
  const extension = extensionOf(record.filename);

  if ((mimeType.startsWith('image/') && mimeType !== 'image/svg+xml') || IMAGE_EXTENSIONS.has(extension)) {
    return 'image';
  }
  if (mimeType.startsWith('video/') || VIDEO_EXTENSIONS.has(extension)) return 'video';
  if (mimeType.startsWith('audio/') || AUDIO_EXTENSIONS.has(extension)) return 'audio';
  if (mimeType === 'application/pdf' || extension === 'pdf') return 'pdf';
  if (
    mimeType.startsWith('text/') ||
    [
      'application/graphql',
      'application/javascript',
      'application/json',
      'application/ld+json',
      'application/sql',
      'application/toml',
      'application/typescript',
      'application/x-httpd-php',
      'application/x-yaml',
      'application/xml',
      'application/yaml',
    ].includes(mimeType) ||
    TEXT_EXTENSIONS.has(extension)
  ) {
    return 'text';
  }
  if (
    WORD_EXTENSIONS.has(extension) ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'word';
  }
  if (
    SPREADSHEET_EXTENSIONS.has(extension) ||
    [
      'application/vnd.ms-excel',
      'application/vnd.oasis.opendocument.spreadsheet',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ].includes(mimeType)
  ) {
    return 'spreadsheet';
  }
  if (
    PRESENTATION_EXTENSIONS.has(extension) ||
    [
      'application/vnd.oasis.opendocument.presentation',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ].includes(mimeType)
  ) {
    return 'presentation';
  }
  if (
    ARCHIVE_EXTENSIONS.has(extension) ||
    ['application/epub+zip', 'application/java-archive', 'application/zip'].includes(mimeType)
  ) {
    return 'archive';
  }
  return 'unsupported';
};

const readLimitedResponse = async (response: Response, maxBytes: number) => {
  if (!response.ok) throw new FilePreviewError('http', response.status);

  const declaredSize = Number(response.headers.get('content-length') || 0);
  if (declaredSize > maxBytes) throw new FilePreviewError('too-large');
  if (!response.body) throw new FilePreviewError('no-body');

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new FilePreviewError('too-large');
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes.buffer;
};

export const fetchPreviewBuffer = async (url: string, maxBytes: number, signal: AbortSignal) => {
  const response = await fetch(url, {
    credentials: 'include',
    signal,
  });
  return readLimitedResponse(response, maxBytes);
};

export const decodeTextPreview = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  }
  const offset = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0;
  return new TextDecoder('utf-8').decode(bytes.subarray(offset));
};

type ZipEntryWithSizes = {
  _data?: {
    compressedSize?: number;
    uncompressedSize?: number;
  };
  unsafeOriginalName?: string;
};

const loadCheckedZip = async (buffer: ArrayBuffer) => {
  const JSZip = (await import('jszip')).default;
  let zip: Awaited<ReturnType<typeof JSZip.loadAsync>>;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new FilePreviewError('invalid-file');
  }

  const entries = Object.values(zip.files);
  if (entries.length > MAX_ARCHIVE_ENTRIES) throw new FilePreviewError('too-many-entries');

  let expandedBytes = 0;
  for (const entry of entries) {
    const sizes = entry as typeof entry & ZipEntryWithSizes;
    expandedBytes += sizes._data?.uncompressedSize || 0;
    if (expandedBytes > MAX_ARCHIVE_EXPANDED_BYTES) {
      throw new FilePreviewError('expanded-too-large');
    }
  }
  return { zip, entries };
};

const xmlDocument = (source: string) => {
  const document = new DOMParser().parseFromString(source, 'application/xml');
  if (document.getElementsByTagName('parsererror').length) throw new FilePreviewError('invalid-file');
  return document;
};

const textFromElements = (parent: Document | Element, localNames: string[]) => {
  const values: string[] = [];
  for (const localName of localNames) {
    for (const element of Array.from(parent.getElementsByTagNameNS('*', localName))) {
      const value = element.textContent;
      if (value) values.push(value);
    }
  }
  return values.join('\n');
};

const parseWord = async (buffer: ArrayBuffer): Promise<StructuredPreview> => {
  await loadCheckedZip(buffer);
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ arrayBuffer: buffer.slice(0) });
    return {
      kind: 'word',
      text: result.value,
      warnings: result.messages.map((message) => message.message),
    };
  } catch (error) {
    if (error instanceof FilePreviewError) throw error;
    throw new FilePreviewError('invalid-file');
  }
};

const parseSpreadsheet = async (buffer: ArrayBuffer): Promise<StructuredPreview> => {
  try {
    const signature = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 4));
    if (signature[0] === 0x50 && signature[1] === 0x4b) {
      await loadCheckedZip(buffer);
    }
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, {
      cellDates: false,
      cellFormula: true,
      cellHTML: false,
      cellNF: false,
      cellStyles: false,
      sheetRows: MAX_SPREADSHEET_ROWS + 1,
    });
    const sheetNames = workbook.SheetNames.slice(0, MAX_SPREADSHEET_SHEETS);
    const cellsPerSheet = Math.max(1, Math.floor(MAX_SPREADSHEET_CELLS / Math.max(sheetNames.length, 1)));
    const sheets = sheetNames.map((name) => {
      const sheet = workbook.Sheets[name];
      const reference = sheet?.['!ref'];
      if (!sheet || !reference) return { name, rows: [], truncated: false };

      const range = XLSX.utils.decode_range(reference);
      const fullReference = sheet['!fullref'];
      const fullRange = fullReference ? XLSX.utils.decode_range(fullReference) : range;
      const availableRows = Math.max(0, range.e.r - range.s.r + 1);
      const availableColumns = Math.max(0, range.e.c - range.s.c + 1);
      const columnCount = Math.min(availableColumns, MAX_SPREADSHEET_COLUMNS, cellsPerSheet);
      const rowCount = Math.min(availableRows, MAX_SPREADSHEET_ROWS, Math.floor(cellsPerSheet / columnCount));
      const rows: string[][] = [];

      for (let rowOffset = 0; rowOffset < rowCount; rowOffset += 1) {
        const row: string[] = [];
        for (let columnOffset = 0; columnOffset < columnCount; columnOffset += 1) {
          const address = XLSX.utils.encode_cell({
            r: range.s.r + rowOffset,
            c: range.s.c + columnOffset,
          });
          const value = sheet[address]?.v;
          row.push(value === undefined || value === null ? '' : String(value));
        }
        rows.push(row);
      }

      return {
        name,
        rows,
        truncated: fullRange.e.r - fullRange.s.r + 1 > rowCount || fullRange.e.c - fullRange.s.c + 1 > columnCount,
      };
    });

    return {
      kind: 'spreadsheet',
      sheets,
      truncated: workbook.SheetNames.length > sheetNames.length || sheets.some((sheet) => sheet.truncated),
    };
  } catch (error) {
    if (error instanceof FilePreviewError) throw error;
    throw new FilePreviewError('invalid-file');
  }
};

const parsePresentation = async (buffer: ArrayBuffer, extension: string): Promise<StructuredPreview> => {
  const { zip } = await loadCheckedZip(buffer);
  try {
    if (extension === 'odp') {
      const content = zip.file('content.xml');
      if (!content) throw new FilePreviewError('invalid-file');
      const document = xmlDocument(await content.async('text'));
      const pages = Array.from(document.getElementsByTagNameNS('*', 'page'));
      return {
        kind: 'presentation',
        slides: pages.map((page, index) => ({
          number: index + 1,
          text: textFromElements(page, ['h', 'p']),
        })),
      };
    }

    const slideFiles = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
      .sort((left, right) => {
        const leftNumber = Number(left.match(/slide(\d+)\.xml$/i)?.[1] || 0);
        const rightNumber = Number(right.match(/slide(\d+)\.xml$/i)?.[1] || 0);
        return leftNumber - rightNumber;
      });
    const slides: PresentationSlide[] = [];
    for (const [index, name] of slideFiles.entries()) {
      const slide = zip.file(name);
      if (!slide) continue;
      const document = xmlDocument(await slide.async('text'));
      slides.push({
        number: index + 1,
        text: textFromElements(document, ['t']),
      });
    }
    return { kind: 'presentation', slides };
  } catch (error) {
    if (error instanceof FilePreviewError) throw error;
    throw new FilePreviewError('invalid-file');
  }
};

const parseArchive = async (buffer: ArrayBuffer): Promise<StructuredPreview> => {
  const { entries } = await loadCheckedZip(buffer);
  return {
    kind: 'archive',
    entries: entries.map((entry) => {
      const value = entry as typeof entry & ZipEntryWithSizes;
      return {
        name: value.unsafeOriginalName || entry.name,
        directory: entry.dir,
        compressedSize: value._data?.compressedSize,
        size: value._data?.uncompressedSize,
        date: entry.date?.toISOString(),
      };
    }),
  };
};

export const parseStructuredPreview = async (
  buffer: ArrayBuffer,
  kind: Extract<PreviewKind, 'word' | 'spreadsheet' | 'presentation' | 'archive'>,
  filename: string,
) => {
  if (kind === 'word') return parseWord(buffer);
  if (kind === 'spreadsheet') return parseSpreadsheet(buffer);
  if (kind === 'presentation') return parsePresentation(buffer, extensionOf(filename));
  return parseArchive(buffer);
};
