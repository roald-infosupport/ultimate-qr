import { describe, expect, it } from 'vitest'
import {
  ACCEPTED_EXTENSIONS,
  checkRawFileSize,
  extensionFromFileName,
  MAX_RAW_FILE_SIZE_BYTES,
  processUploadedFile,
  toBase64,
  toDataUri,
  validateFileContent,
} from './fileUpload'

function bytesOf(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

describe('extensionFromFileName', () => {
  it('accepts supported extensions', () => {
    expect(extensionFromFileName('invite.ics')).toBe('ics')
    expect(extensionFromFileName('icon.ico')).toBe('ico')
    expect(extensionFromFileName('logo.svg')).toBe('svg')
    expect(extensionFromFileName('contact.vcf')).toBe('vcf')
  })

  it('is case-insensitive', () => {
    expect(extensionFromFileName('INVITE.ICS')).toBe('ics')
  })

  it('rejects unsupported extensions', () => {
    expect(extensionFromFileName('photo.jpg')).toBeNull()
  })

  it('rejects file names with no extension', () => {
    expect(extensionFromFileName('noextension')).toBeNull()
  })

  it('every accepted extension is reachable', () => {
    for (const ext of ACCEPTED_EXTENSIONS) {
      expect(extensionFromFileName(`file.${ext}`)).toBe(ext)
    }
  })
})

describe('checkRawFileSize', () => {
  it('passes files within the ceiling', () => {
    const file = new File([new Uint8Array(1024)], 'small.ics')
    expect(checkRawFileSize(file)).toEqual({ ok: true })
  })

  it('rejects files over the ceiling with a specific message', () => {
    const file = new File([new Uint8Array(MAX_RAW_FILE_SIZE_BYTES + 1)], 'huge.ico')
    const result = checkRawFileSize(file)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toMatch(/MB/)
    }
  })
})

describe('validateFileContent', () => {
  it('accepts any bytes for .ico (binary, no structural check)', () => {
    expect(validateFileContent('ico', new Uint8Array([0, 1, 2, 3]))).toEqual({ valid: true })
  })

  it('accepts a well-formed svg', () => {
    const svg = bytesOf('<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>')
    expect(validateFileContent('svg', svg)).toEqual({ valid: true })
  })

  it('rejects malformed svg xml', () => {
    const svg = bytesOf('<svg><rect></svg>')
    const result = validateFileContent('svg', svg)
    expect(result.valid).toBe(false)
  })

  it('accepts a well-formed vcf', () => {
    const vcf = bytesOf('BEGIN:VCARD\nFN:Jane Doe\nEND:VCARD')
    expect(validateFileContent('vcf', vcf)).toEqual({ valid: true })
  })

  it('rejects a vcf missing BEGIN:VCARD', () => {
    const vcf = bytesOf('FN:Jane Doe\nEND:VCARD')
    const result = validateFileContent('vcf', vcf)
    expect(result.valid).toBe(false)
  })

  it('accepts a well-formed ics', () => {
    const ics = bytesOf('BEGIN:VCALENDAR\nSUMMARY:Party\nEND:VCALENDAR')
    expect(validateFileContent('ics', ics)).toEqual({ valid: true })
  })

  it('rejects an ics missing BEGIN:VCALENDAR', () => {
    const ics = bytesOf('SUMMARY:Party\nEND:VCALENDAR')
    const result = validateFileContent('ics', ics)
    expect(result.valid).toBe(false)
  })
})

describe('toBase64 / toDataUri', () => {
  it('round-trips known byte arrays', () => {
    const bytes = bytesOf('hello world')
    const base64 = toBase64(bytes)
    expect(atob(base64)).toBe('hello world')
  })

  it('handles large byte arrays without stack overflow', () => {
    const bytes = new Uint8Array(100_000).fill(65) // 'A'
    expect(() => toBase64(bytes)).not.toThrow()
    expect(toBase64(bytes).length).toBeGreaterThan(0)
  })

  it('builds a correctly formatted data URI', () => {
    const uri = toDataUri('text/calendar', bytesOf('hi'))
    expect(uri).toBe(`data:text/calendar;base64,${toBase64(bytesOf('hi'))}`)
  })
})

describe('processUploadedFile', () => {
  it('SC-001: accepts a small valid .ics unminified', () => {
    const ics = 'BEGIN:VCALENDAR\nSUMMARY:Party\nEND:VCALENDAR'
    const result = processUploadedFile('invite.ics', bytesOf(ics), 'M')
    expect(result.outcome).toBe('accepted')
    if (result.outcome === 'accepted') {
      expect(result.minificationApplied).toBe(false)
      expect(result.file.isMinified).toBe(false)
      expect(new TextDecoder().decode(result.file.finalBytes)).toBe(ics)
    }
  })

  it('SC-002: rejects an unsupported file type, message lists all 4 formats', () => {
    const result = processUploadedFile('photo.jpg', bytesOf('irrelevant'), 'M')
    expect(result.outcome).toBe('rejectedUnsupportedType')
    if (result.outcome === 'rejectedUnsupportedType') {
      expect(result.message).toContain('.ics')
      expect(result.message).toContain('.ico')
      expect(result.message).toContain('.svg')
      expect(result.message).toContain('.vcf')
    }
  })

  it('SC-003: rejects an oversized .ico with size/limit/over-by numbers', () => {
    // .ico can't be minified — binary. A raw payload whose base64 data URI
    // alone already exceeds the M-level ceiling (2331 bytes).
    const bytes = new Uint8Array(3000).fill(1)
    const result = processUploadedFile('icon.ico', bytes, 'M')
    expect(result.outcome).toBe('rejectedOverCapacity')
    if (result.outcome === 'rejectedOverCapacity') {
      expect(result.message).toMatch(/\d+ bytes/)
      expect(result.message).toContain('2331 bytes')
      expect(result.message).toMatch(/by \d+ bytes/)
    }
  })

  it('SC-004: minifies a borderline .ics that only exceeds capacity due to whitespace', () => {
    // Build an .ics whose raw form (with lots of blank lines) is just over the
    // M-level ceiling once base64-inflated, but fits after blank lines are stripped.
    const paddingLines = Array.from({ length: 5000 }, () => '').join('\r\n')
    const ics = `BEGIN:VCALENDAR\r\nSUMMARY:Party${paddingLines}\r\nEND:VCALENDAR`
    const result = processUploadedFile('event.ics', bytesOf(ics), 'M')
    expect(result.outcome).toBe('accepted')
    if (result.outcome === 'accepted') {
      expect(result.minificationApplied).toBe(true)
      expect(result.file.isMinified).toBe(true)
    }
  })

  it('SC-005 / EC-3: rejects a .vcf still over capacity after minification', () => {
    // A single enormous NOTE field has no strippable whitespace/blank lines,
    // so minification cannot shrink it enough to fit.
    const vcf = `BEGIN:VCARD\nNOTE:${'x'.repeat(5000)}\nEND:VCARD`
    const result = processUploadedFile('contact.vcf', bytesOf(vcf), 'M')
    expect(result.outcome).toBe('rejectedOverCapacity')
  })

  it('rejects invalid content before attempting capacity checks', () => {
    const result = processUploadedFile('logo.svg', bytesOf('<svg><rect></svg>'), 'M')
    expect(result.outcome).toBe('rejectedInvalidContent')
  })
})
