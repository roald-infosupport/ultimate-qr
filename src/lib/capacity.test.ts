import { describe, expect, it } from 'vitest'
import { byteLength, computeCapacityStatus, truncateToCapacity } from './capacity'

describe('byteLength', () => {
  it('counts plain ASCII as one byte per character', () => {
    expect(byteLength('hello')).toBe(5)
  })

  it('counts multi-byte characters by their UTF-8 byte length, not character count', () => {
    // '😀' is 1 character (well, 2 UTF-16 code units) but 4 UTF-8 bytes.
    expect(byteLength('😀')).toBe(4)
    // 'é' is 2 UTF-8 bytes.
    expect(byteLength('é')).toBe(2)
    // CJK characters are 3 UTF-8 bytes each.
    expect(byteLength('日本語')).toBe(9)
  })
})

describe('computeCapacityStatus', () => {
  it('reports ok well below the warning threshold', () => {
    const status = computeCapacityStatus('short text', 'M')
    expect(status.status).toBe('ok')
    expect(status.capacityMaxBytes).toBe(2331)
    expect(status.capacityUsedBytes).toBe(10)
  })

  it('reports warning at exactly 75% of capacity', () => {
    const max = 2331
    const content = 'a'.repeat(Math.ceil(max * 0.75))
    const status = computeCapacityStatus(content, 'M')
    expect(status.status).toBe('warning')
  })

  it('reports ok just below the 75% threshold', () => {
    const max = 2331
    const content = 'a'.repeat(Math.floor(max * 0.75) - 1)
    const status = computeCapacityStatus(content, 'M')
    expect(status.status).toBe('ok')
  })

  it('reports blocked when content exceeds the absolute max', () => {
    const content = 'a'.repeat(2332)
    const status = computeCapacityStatus(content, 'M')
    expect(status.status).toBe('blocked')
  })

  it('reports warning (not blocked) at exactly the absolute max', () => {
    const content = 'a'.repeat(2331)
    const status = computeCapacityStatus(content, 'M')
    expect(status.status).toBe('warning')
  })

  it('uses the correct ceiling per error-correction level', () => {
    expect(computeCapacityStatus('a'.repeat(2954), 'L').status).toBe('blocked')
    expect(computeCapacityStatus('a'.repeat(2953), 'L').status).toBe('warning')
    expect(computeCapacityStatus('a'.repeat(1664), 'Q').status).toBe('blocked')
    expect(computeCapacityStatus('a'.repeat(1274), 'H').status).toBe('blocked')
  })
})

describe('truncateToCapacity', () => {
  it('returns content unchanged when already within capacity', () => {
    expect(truncateToCapacity('short text', 'M')).toBe('short text')
  })

  it('truncates ASCII content to fit the absolute max', () => {
    const content = 'a'.repeat(2500)
    const truncated = truncateToCapacity(content, 'M')
    expect(byteLength(truncated)).toBeLessThanOrEqual(2331)
    expect(truncated.length).toBe(2331)
  })

  it('never splits a multi-byte character mid-codepoint', () => {
    // Build content that lands the max-byte cutoff exactly in the middle of a
    // multi-byte emoji sequence.
    const filler = 'a'.repeat(2330) // 1 byte short of the M-level max (2331)
    const content = filler + '😀' // next char is a 4-byte emoji, straddling the boundary
    const truncated = truncateToCapacity(content, 'M')

    expect(byteLength(truncated)).toBeLessThanOrEqual(2331)
    // Decoding must not throw/produce replacement characters from a split codepoint.
    expect(truncated).not.toContain('�')
    expect(truncated).toBe(filler)
  })
})
