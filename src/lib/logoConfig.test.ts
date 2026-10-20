import { describe, expect, it } from 'vitest'
import {
  ACCEPTED_LOGO_EXTENSIONS,
  checkRawLogoFileSize,
  clampLogoPosition,
  clampLogoSizePercent,
  computeLogoCoveragePercent,
  extensionFromLogoFileName,
  MAX_LOGO_SIZE_PERCENT,
  MAX_RAW_LOGO_SIZE_BYTES,
  processUploadedLogo,
  validateLogoFileContent,
} from './logoConfig'
import { MAX_SAFE_LOGO_COVERAGE_PERCENT } from './scannabilityRisk'

const PNG_HEADER = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])
const JPEG_HEADER = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])

function bytesOf(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

describe('extensionFromLogoFileName', () => {
  it('accepts supported extensions', () => {
    expect(extensionFromLogoFileName('logo.png')).toBe('png')
    expect(extensionFromLogoFileName('logo.jpg')).toBe('jpg')
    expect(extensionFromLogoFileName('logo.jpeg')).toBe('jpeg')
    expect(extensionFromLogoFileName('logo.svg')).toBe('svg')
  })

  it('is case-insensitive', () => {
    expect(extensionFromLogoFileName('LOGO.PNG')).toBe('png')
  })

  it('rejects unsupported extensions', () => {
    expect(extensionFromLogoFileName('logo.gif')).toBeNull()
    expect(extensionFromLogoFileName('logo.webp')).toBeNull()
  })

  it('rejects file names with no extension', () => {
    expect(extensionFromLogoFileName('noextension')).toBeNull()
  })

  it('every accepted extension is reachable', () => {
    for (const ext of ACCEPTED_LOGO_EXTENSIONS) {
      expect(extensionFromLogoFileName(`file.${ext}`)).toBe(ext)
    }
  })
})

describe('checkRawLogoFileSize', () => {
  it('passes files within the ceiling', () => {
    const file = new File([new Uint8Array(1024)], 'small.png')
    expect(checkRawLogoFileSize(file)).toEqual({ ok: true })
  })

  it('rejects files over the ceiling with a specific message', () => {
    const file = new File([new Uint8Array(MAX_RAW_LOGO_SIZE_BYTES + 1)], 'huge.png')
    const result = checkRawLogoFileSize(file)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toMatch(/MB/)
    }
  })
})

describe('validateLogoFileContent', () => {
  it('SC-004 (analogue): accepts a well-formed svg', () => {
    const svg = bytesOf('<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>')
    expect(validateLogoFileContent('svg', svg)).toEqual({ valid: true })
  })

  it('rejects malformed svg xml', () => {
    const svg = bytesOf('<svg><rect></svg>')
    const result = validateLogoFileContent('svg', svg)
    expect(result.valid).toBe(false)
  })

  it('SC-003 (analogue): accepts a png with a valid signature', () => {
    expect(validateLogoFileContent('png', PNG_HEADER)).toEqual({ valid: true })
  })

  it('SC-003 (analogue): rejects a png with an invalid signature', () => {
    const result = validateLogoFileContent('png', bytesOf('not a png'))
    expect(result.valid).toBe(false)
  })

  it('accepts a jpg/jpeg with a valid signature', () => {
    expect(validateLogoFileContent('jpg', JPEG_HEADER)).toEqual({ valid: true })
    expect(validateLogoFileContent('jpeg', JPEG_HEADER)).toEqual({ valid: true })
  })

  it('rejects a jpg with an invalid signature', () => {
    const result = validateLogoFileContent('jpg', bytesOf('not a jpeg'))
    expect(result.valid).toBe(false)
  })

  it('rejects a file too short to contain a full signature, without throwing', () => {
    expect(() => validateLogoFileContent('png', new Uint8Array([0x89, 0x50]))).not.toThrow()
    expect(validateLogoFileContent('png', new Uint8Array([0x89, 0x50])).valid).toBe(false)
  })
})

describe('processUploadedLogo', () => {
  it('SC-001 (analogue): accepts a valid png', () => {
    const result = processUploadedLogo('logo.png', PNG_HEADER)
    expect(result.outcome).toBe('accepted')
    if (result.outcome === 'accepted') {
      expect(result.extension).toBe('png')
      expect(result.mimeType).toBe('image/png')
    }
  })

  it('SC-002: rejects an unsupported file type, message lists the supported formats', () => {
    const result = processUploadedLogo('logo.gif', bytesOf('irrelevant'))
    expect(result.outcome).toBe('rejectedUnsupportedType')
    if (result.outcome === 'rejectedUnsupportedType') {
      expect(result.message).toContain('.png')
      expect(result.message).toContain('.jpg/.jpeg')
      expect(result.message).toContain('.svg')
    }
  })

  it('SC-003: rejects a corrupt/invalid logo without crashing', () => {
    const result = processUploadedLogo('logo.png', bytesOf('this is not a real png'))
    expect(result.outcome).toBe('rejectedInvalidContent')
  })
})

describe('computeLogoCoveragePercent', () => {
  it('SC-005/SC-008 reconciliation: at the safe maximum size, the plate exceeds the safe coverage threshold', () => {
    const coverage = computeLogoCoveragePercent(MAX_LOGO_SIZE_PERCENT)
    expect(coverage).toBeGreaterThan(MAX_SAFE_LOGO_COVERAGE_PERCENT)
  })

  it('a size well below the cap stays under the safe coverage threshold', () => {
    const coverage = computeLogoCoveragePercent(10)
    expect(coverage).toBeLessThan(MAX_SAFE_LOGO_COVERAGE_PERCENT)
  })

  it('scales proportionally with size', () => {
    expect(computeLogoCoveragePercent(20)).toBeCloseTo(computeLogoCoveragePercent(10) * 2, 5)
  })
})

describe('clampLogoSizePercent', () => {
  it('clamps values above the maximum down to it', () => {
    expect(clampLogoSizePercent(MAX_LOGO_SIZE_PERCENT + 50)).toBe(MAX_LOGO_SIZE_PERCENT)
  })

  it('leaves in-range values untouched', () => {
    expect(clampLogoSizePercent(15)).toBe(15)
  })

  it('clamps non-positive values up to the minimum', () => {
    expect(clampLogoSizePercent(0)).toBe(1)
  })
})

describe('clampLogoPosition', () => {
  it('leaves a centered position untouched', () => {
    expect(clampLogoPosition(50, 50, 20)).toEqual({ x: 50, y: 50 })
  })

  it('pulls an out-of-bounds position back within the frame', () => {
    const result = clampLogoPosition(-10, 150, 20)
    expect(result.x).toBeGreaterThan(-10)
    expect(result.y).toBeLessThan(150)
    expect(result.x).toBeGreaterThanOrEqual(0)
    expect(result.y).toBeLessThanOrEqual(100)
  })

  it('a position valid at a small size pulls further inward once re-clamped at a larger size (motivates re-clamping the stored position on resize, not just on drag)', () => {
    const smallSizeClamp = clampLogoPosition(5, 5, 5)
    const largeSizeClamp = clampLogoPosition(smallSizeClamp.x, smallSizeClamp.y, MAX_LOGO_SIZE_PERCENT)
    expect(largeSizeClamp.x).toBeGreaterThan(smallSizeClamp.x)
    expect(largeSizeClamp.y).toBeGreaterThan(smallSizeClamp.y)
  })
})
