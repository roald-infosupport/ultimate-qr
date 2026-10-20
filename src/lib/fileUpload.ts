import { computeCapacityStatus, type ErrorCorrectionLevel } from './capacity'
import { minifyIcs, minifySvg, minifyVcf } from './fileMinification'

export type FileExtension = 'ics' | 'ico' | 'svg' | 'vcf'

export interface UploadedFile {
  fileName: string
  extension: FileExtension
  mimeType: string
  rawBytes: Uint8Array
  minifiedBytes: Uint8Array | null
  finalBytes: Uint8Array
  isMinified: boolean
}

export type FileUploadResult =
  | { outcome: 'accepted'; file: UploadedFile; minificationApplied: boolean }
  | { outcome: 'rejectedUnsupportedType'; message: string }
  | { outcome: 'rejectedTooLarge'; message: string }
  | { outcome: 'rejectedOverCapacity'; message: string }
  | { outcome: 'rejectedInvalidContent'; message: string }

export const ACCEPTED_EXTENSIONS: FileExtension[] = ['ics', 'ico', 'svg', 'vcf']

export const MIME_TYPES: Record<FileExtension, string> = {
  ics: 'text/calendar',
  ico: 'image/x-icon',
  svg: 'image/svg+xml',
  vcf: 'text/vcard',
}

export const TEXT_BASED_EXTENSIONS: FileExtension[] = ['ics', 'svg', 'vcf']

// Early sanity ceiling for the raw upload (NFR-004), checked before reading file
// contents into memory. Generous: even a 2 MB unminified file can never fit a
// QR code (max ~2953 bytes raw), so this purely guards against freezing the
// browser on an absurdly large selection.
export const MAX_RAW_FILE_SIZE_BYTES = 2 * 1024 * 1024

const UNSUPPORTED_TYPE_MESSAGE =
  'Unsupported file type. Please upload a .ics, .ico, .svg, or .vcf file.'

export function extensionFromFileName(fileName: string): FileExtension | null {
  const match = /\.([a-z0-9]+)$/i.exec(fileName)
  if (!match) return null
  const ext = match[1].toLowerCase()
  return (ACCEPTED_EXTENSIONS as string[]).includes(ext) ? (ext as FileExtension) : null
}

export function checkRawFileSize(file: File): { ok: true } | { ok: false; message: string } {
  if (file.size <= MAX_RAW_FILE_SIZE_BYTES) return { ok: true }

  const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
  const limitMb = (MAX_RAW_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)
  return {
    ok: false,
    message: `This file is ${sizeMb} MB — files over ${limitMb} MB can never fit in a QR code and are rejected immediately.`,
  }
}

export async function readFileBytes(file: File): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer()
  return new Uint8Array(buffer)
}

export function validateFileContent(
  extension: FileExtension,
  bytes: Uint8Array,
): { valid: true } | { valid: false; message: string } {
  if (extension === 'ico') return { valid: true }

  const text = new TextDecoder().decode(bytes)

  if (extension === 'svg') {
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
    const hasParserError = doc.getElementsByTagName('parsererror').length > 0
    const rootIsSvg = doc.documentElement?.tagName.toLowerCase() === 'svg'
    if (hasParserError || !rootIsSvg) {
      return { valid: false, message: "This file isn't a valid SVG image." }
    }
    return { valid: true }
  }

  if (extension === 'vcf') {
    if (!/^BEGIN:VCARD\s*$/im.test(text) || !/^END:VCARD\s*$/im.test(text)) {
      return {
        valid: false,
        message: "This file doesn't look like a valid vCard (missing BEGIN:VCARD/END:VCARD).",
      }
    }
    return { valid: true }
  }

  // ics
  if (!/^BEGIN:VCALENDAR\s*$/im.test(text) || !/^END:VCALENDAR\s*$/im.test(text)) {
    return {
      valid: false,
      message: "This file doesn't look like a valid calendar file (missing BEGIN:VCALENDAR/END:VCALENDAR).",
    }
  }
  return { valid: true }
}

export function toBase64(bytes: Uint8Array): string {
  // Build the binary string in chunks to avoid blowing the call stack on
  // String.fromCharCode(...bytes) for large arrays.
  const CHUNK_SIZE = 8192
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

export function toDataUri(mimeType: string, bytes: Uint8Array): string {
  return `data:${mimeType};base64,${toBase64(bytes)}`
}

function minifyBytes(extension: FileExtension, bytes: Uint8Array): Uint8Array {
  const text = new TextDecoder().decode(bytes)
  const minifiers: Record<string, (text: string) => string> = {
    ics: minifyIcs,
    svg: minifySvg,
    vcf: minifyVcf,
  }
  return new TextEncoder().encode(minifiers[extension](text))
}

function buildOverCapacityMessage(
  usedBytes: number,
  maxBytes: number,
  level: ErrorCorrectionLevel,
): string {
  const overBy = usedBytes - maxBytes
  return `This file is ${usedBytes} bytes once encoded, which exceeds the ${level} error-correction limit of ${maxBytes} bytes by ${overBy} bytes.`
}

export function processUploadedFile(
  fileName: string,
  rawBytes: Uint8Array,
  errorCorrectionLevel: ErrorCorrectionLevel,
): FileUploadResult {
  const extension = extensionFromFileName(fileName)
  if (!extension) {
    return { outcome: 'rejectedUnsupportedType', message: UNSUPPORTED_TYPE_MESSAGE }
  }

  const validation = validateFileContent(extension, rawBytes)
  if (!validation.valid) {
    return { outcome: 'rejectedInvalidContent', message: validation.message }
  }

  const mimeType = MIME_TYPES[extension]
  const rawDataUri = toDataUri(mimeType, rawBytes)
  const rawCapacity = computeCapacityStatus(rawDataUri, errorCorrectionLevel)

  if (rawCapacity.status !== 'blocked') {
    return {
      outcome: 'accepted',
      minificationApplied: false,
      file: {
        fileName,
        extension,
        mimeType,
        rawBytes,
        minifiedBytes: null,
        finalBytes: rawBytes,
        isMinified: false,
      },
    }
  }

  if (!TEXT_BASED_EXTENSIONS.includes(extension)) {
    return {
      outcome: 'rejectedOverCapacity',
      message: buildOverCapacityMessage(
        rawCapacity.capacityUsedBytes,
        rawCapacity.capacityMaxBytes,
        errorCorrectionLevel,
      ),
    }
  }

  const minifiedBytes = minifyBytes(extension, rawBytes)
  const minifiedDataUri = toDataUri(mimeType, minifiedBytes)
  const minifiedCapacity = computeCapacityStatus(minifiedDataUri, errorCorrectionLevel)

  if (minifiedCapacity.status !== 'blocked') {
    return {
      outcome: 'accepted',
      minificationApplied: true,
      file: {
        fileName,
        extension,
        mimeType,
        rawBytes,
        minifiedBytes,
        finalBytes: minifiedBytes,
        isMinified: true,
      },
    }
  }

  return {
    outcome: 'rejectedOverCapacity',
    message: buildOverCapacityMessage(
      minifiedCapacity.capacityUsedBytes,
      minifiedCapacity.capacityMaxBytes,
      errorCorrectionLevel,
    ),
  }
}
