import { describe, expect, it } from 'vitest'
import {
  buildPresentParameterGroups,
  defaultToggleState,
  defaultTrackingToggles,
  getPresentParamNames,
  resolveToggleState,
  stripTrackingParams,
} from './trackingParams'

describe('getPresentParamNames', () => {
  it('returns every query param present, known or not', () => {
    const present = getPresentParamNames(
      'https://shop.example.com/menu?table=12&utm_source=newsletter',
      'Link',
    )
    expect(present).toEqual(['table', 'utm_source'])
  })

  it('returns an empty list when no query string is present', () => {
    expect(
      getPresentParamNames('https://shop.example.com/menu', 'Link'),
    ).toEqual([])
  })

  it('returns an empty list for non-Link content', () => {
    expect(
      getPresentParamNames('plain text with utm_source=foo in it', 'Text'),
    ).toEqual([])
  })

  it('collapses duplicate keys to a single entry (EC-6)', () => {
    expect(
      getPresentParamNames(
        'https://shop.example.com/menu?utm_source=a&utm_source=b',
        'Link',
      ),
    ).toEqual(['utm_source'])
  })
})

describe('defaultToggleState', () => {
  it('defaults known tracking params to stripped (true)', () => {
    expect(defaultToggleState('utm_source')).toBe(true)
  })

  it('defaults unrecognized params to kept (false)', () => {
    expect(defaultToggleState('table')).toBe(false)
  })
})

describe('buildPresentParameterGroups', () => {
  it('groups known params by category and unrecognized params under Other', () => {
    const groups = buildPresentParameterGroups(
      'https://shop.example.com/menu?table=12&utm_source=newsletter',
      'Link',
    )
    expect(groups).toEqual([
      { category: 'Generic UTM', params: [{ name: 'utm_source', category: 'Generic UTM' }] },
      { category: 'Other', params: [{ name: 'table', category: 'Other' }] },
    ])
  })

  it('returns nothing when no params are present', () => {
    expect(
      buildPresentParameterGroups('https://shop.example.com/menu', 'Link'),
    ).toEqual([])
  })

  it('sorts Other after known categories regardless of appearance order', () => {
    const groups = buildPresentParameterGroups(
      'https://shop.example.com/menu?booth=3&utm_source=newsletter',
      'Link',
    )
    expect(groups.map((g) => g.category)).toEqual(['Generic UTM', 'Other'])
  })
})

describe('resolveToggleState', () => {
  it('falls back to the kind default when no explicit toggle is set', () => {
    expect(resolveToggleState('utm_source', {})).toBe(true)
    expect(resolveToggleState('table', {})).toBe(false)
  })

  it('honors an explicit toggle over the default', () => {
    expect(resolveToggleState('utm_source', { utm_source: false })).toBe(false)
    expect(resolveToggleState('table', { table: true })).toBe(true)
  })
})

describe('stripTrackingParams', () => {
  it('still strips known tracking params by default', () => {
    const result = stripTrackingParams(
      'https://shop.example.com/menu?utm_source=newsletter&ref=friend',
      'Link',
      defaultTrackingToggles(),
    )
    expect(result).toBe('https://shop.example.com/menu?ref=friend')
  })

  it('keeps a known param when its toggle is off', () => {
    const toggles = { ...defaultTrackingToggles(), utm_source: false }
    const result = stripTrackingParams(
      'https://shop.example.com/menu?utm_source=newsletter',
      'Link',
      toggles,
    )
    expect(result).toBe('https://shop.example.com/menu?utm_source=newsletter')
  })

  it('preserves an unrecognized param by default (SC-004)', () => {
    const result = stripTrackingParams(
      'https://shop.example.com/menu?table=12&utm_source=newsletter',
      'Link',
      {},
    )
    expect(result).toBe('https://shop.example.com/menu?table=12')
  })

  it('strips an unrecognized param when explicitly toggled on (SC-012b)', () => {
    const result = stripTrackingParams(
      'https://shop.example.com/menu?table=12',
      'Link',
      { table: true },
    )
    expect(result).toBe('https://shop.example.com/menu')
  })
})
