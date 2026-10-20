import { describe, expect, it } from 'vitest'
import { minifyIcs, minifySvg, minifyVcf } from './fileMinification'

describe('minifyIcs / minifyVcf', () => {
  it('strips blank lines', () => {
    const input = 'BEGIN:VCALENDAR\r\n\r\nSUMMARY:Party\r\n\r\nEND:VCALENDAR'
    const result = minifyIcs(input)
    expect(result).toBe('BEGIN:VCALENDAR\r\nSUMMARY:Party\r\nEND:VCALENDAR')
  })

  it('trims trailing whitespace on each line', () => {
    const input = 'BEGIN:VCARD   \r\nFN:Jane Doe\t\r\nEND:VCARD'
    const result = minifyVcf(input)
    expect(result).toBe('BEGIN:VCARD\r\nFN:Jane Doe\r\nEND:VCARD')
  })

  it('preserves leading whitespace on folded continuation lines', () => {
    // RFC 6350 line folding: a line starting with a single space is a
    // continuation of the previous property's value and must survive intact.
    const input = 'BEGIN:VCARD\r\nNOTE:This is a very long note that wraps\r\n onto a continuation line\r\nEND:VCARD'
    const result = minifyVcf(input)
    expect(result).toContain(' onto a continuation line')
  })

  it('does not alter actual field values', () => {
    const input = 'BEGIN:VCARD\nFN:Jane Doe\nEMAIL:jane@example.com\nEND:VCARD'
    const result = minifyVcf(input)
    expect(result).toContain('FN:Jane Doe')
    expect(result).toContain('EMAIL:jane@example.com')
  })

  it('handles already-minimal input without altering it', () => {
    const input = 'BEGIN:VCARD\r\nFN:Jane Doe\r\nEND:VCARD'
    expect(minifyVcf(input)).toBe(input)
  })
})

describe('minifySvg', () => {
  it('strips comments', () => {
    const input = '<svg><!-- this is a comment --><rect/></svg>'
    expect(minifySvg(input)).toBe('<svg><rect/></svg>')
  })

  it('collapses whitespace strictly between tags', () => {
    const input = '<svg>\n  <rect/>\n  <circle/>\n</svg>'
    expect(minifySvg(input)).toBe('<svg><rect/><circle/></svg>')
  })

  it('never touches attribute values', () => {
    const input = '<svg><rect fill="  red  blue  "/></svg>'
    expect(minifySvg(input)).toBe('<svg><rect fill="  red  blue  "/></svg>')
  })

  it('never touches non-whitespace text content', () => {
    const input = '<svg><text>Hello   World</text></svg>'
    expect(minifySvg(input)).toBe('<svg><text>Hello   World</text></svg>')
  })

  it('leaves an embedded script tag intact (inert), since safety comes from rendering, not stripping', () => {
    const input = '<svg><script>alert(1)</script><rect/></svg>'
    const result = minifySvg(input)
    expect(result).toContain('<script>alert(1)</script>')
  })
})
