import type { ErrorCorrectionLevel } from './capacity'
import { MAX_SAFE_LOGO_COVERAGE_PERCENT } from './scannabilityRisk'

export type LogoExtension = 'png' | 'jpg' | 'jpeg' | 'svg'

export interface LogoPosition {
  x: number
  y: number
}

export interface LogoConfiguration {
  isActive: boolean
  fileName: string | null
  extension: LogoExtension | null
  mimeType: string | null
  imageData: Uint8Array | null
  sizePercent: number | null
  backingPlateColor: string | null
  positionPercent: LogoPosition
  errorCorrectionLevelBeforeLogo: ErrorCorrectionLevel | null
  ecLevelAutoSet: boolean
}

export type LogoUploadResult =
  | { outcome: 'accepted'; extension: LogoExtension; mimeType: string; imageData: Uint8Array }
  | { outcome: 'rejectedUnsupportedType'; message: string }
  | { outcome: 'rejectedInvalidContent'; message: string }

export const ACCEPTED_LOGO_EXTENSIONS: LogoExtension[] = ['png', 'jpg', 'jpeg', 'svg']

export const LOGO_MIME_TYPES: Record<LogoExtension, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  svg: 'image/svg+xml',
}

// Early sanity ceiling for the raw logo upload (NFR-002), checked before
// reading file contents into memory — same rationale as fileUpload.ts's
// MAX_RAW_FILE_SIZE_BYTES, just a logo is never QR-encoded content so this
// isn't tied to any capacity calculation.
export const MAX_RAW_LOGO_SIZE_BYTES = 5 * 1024 * 1024

// Matches the QR PNG's own background, which is always white regardless of
// the app's light/dark theme (story 006 doesn't exist yet to override this).
export const DEFAULT_BACKING_PLATE_COLOR = '#ffffff'

export const DEFAULT_LOGO_POSITION: LogoPosition = { x: 50, y: 50 }

// FR-006's safe maximum — reuses scannabilityRisk's constant as the single
// source of truth rather than duplicating the number.
export const MAX_LOGO_SIZE_PERCENT = MAX_SAFE_LOGO_COVERAGE_PERCENT
export const DEFAULT_LOGO_SIZE_PERCENT = 20

// The backing plate is deliberately larger than the logo itself (FR-005), so
// soft/transparent edges never expose the QR pattern underneath (EC-4). This
// is also what's fed to spec 004's logoCoveragePercent: a logo sized at the
// 30% cap produces a plate just over 30%, which is what trips the
// "excessiveLogoCoverage" warning (SC-008) even though the raw size control
// itself never exceeds its cap (SC-005).
export const LOGO_PLATE_PADDING_RATIO = 0.15

const UNSUPPORTED_LOGO_TYPE_MESSAGE =
  'Unsupported image type. Please upload a .png, .jpg/.jpeg, or .svg file.'

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff]

function hasSignature(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false
  return signature.every((byte, index) => bytes[index] === byte)
}

export function extensionFromLogoFileName(fileName: string): LogoExtension | null {
  const match = /\.([a-z0-9]+)$/i.exec(fileName)
  if (!match) return null
  const ext = match[1].toLowerCase()
  return (ACCEPTED_LOGO_EXTENSIONS as string[]).includes(ext) ? (ext as LogoExtension) : null
}

export function checkRawLogoFileSize(file: File): { ok: true } | { ok: false; message: string } {
  if (file.size <= MAX_RAW_LOGO_SIZE_BYTES) return { ok: true }

  const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
  const limitMb = (MAX_RAW_LOGO_SIZE_BYTES / (1024 * 1024)).toFixed(0)
  return {
    ok: false,
    message: `This logo is ${sizeMb} MB — files over ${limitMb} MB are rejected immediately.`,
  }
}

// Structural validation only (FR-003) — not a full image decode. SVG reuses
// fileUpload.ts's DOMParser pattern; raster formats check magic bytes. This
// mirrors the project's existing "structural check, not full semantic
// validation" approach and stays synchronous/unit-testable under jsdom.
export function validateLogoFileContent(
  extension: LogoExtension,
  bytes: Uint8Array,
): { valid: true } | { valid: false; message: string } {
  if (extension === 'svg') {
    const text = new TextDecoder().decode(bytes)
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
    const hasParserError = doc.getElementsByTagName('parsererror').length > 0
    const rootIsSvg = doc.documentElement?.tagName.toLowerCase() === 'svg'
    if (hasParserError || !rootIsSvg) {
      return { valid: false, message: "This file isn't a valid SVG image." }
    }
    return { valid: true }
  }

  if (extension === 'png') {
    if (!hasSignature(bytes, PNG_SIGNATURE)) {
      return { valid: false, message: "This file isn't a valid PNG image." }
    }
    return { valid: true }
  }

  // jpg / jpeg
  if (!hasSignature(bytes, JPEG_SIGNATURE)) {
    return { valid: false, message: "This file isn't a valid JPEG image." }
  }
  return { valid: true }
}

export function processUploadedLogo(fileName: string, bytes: Uint8Array): LogoUploadResult {
  const extension = extensionFromLogoFileName(fileName)
  if (!extension) {
    return { outcome: 'rejectedUnsupportedType', message: UNSUPPORTED_LOGO_TYPE_MESSAGE }
  }

  const validation = validateLogoFileContent(extension, bytes)
  if (!validation.valid) {
    return { outcome: 'rejectedInvalidContent', message: validation.message }
  }

  return {
    outcome: 'accepted',
    extension,
    mimeType: LOGO_MIME_TYPES[extension],
    imageData: bytes,
  }
}

// The backing plate's effective width as a percentage of the code — always
// somewhat larger than the raw logo sizePercent (see LOGO_PLATE_PADDING_RATIO
// above). This is the value fed into spec 004's ScannabilityRisk.
export function computeLogoCoveragePercent(sizePercent: number): number {
  return sizePercent * (1 + LOGO_PLATE_PADDING_RATIO)
}

// Defensive backstop (the native range input's min/max already enforces this
// at the control level per NFR-004).
export function clampLogoSizePercent(value: number): number {
  return Math.min(MAX_LOGO_SIZE_PERCENT, Math.max(1, value))
}

// Keeps the backing plate fully within the 0-100% QR frame bounds given its
// current (coverage-based) size, so a drag can never push the logo off the
// code.
export function clampLogoPosition(x: number, y: number, sizePercent: number): LogoPosition {
  const halfPlatePercent = computeLogoCoveragePercent(sizePercent) / 2
  const min = halfPlatePercent
  const max = 100 - halfPlatePercent
  return {
    x: Math.min(max, Math.max(min, x)),
    y: Math.min(max, Math.max(min, y)),
  }
}
