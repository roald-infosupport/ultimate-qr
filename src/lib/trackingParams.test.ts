import { describe, expect, it } from 'vitest'
import {
  defaultTrackingToggles,
  getPresentTrackingParamNames,
  groupByCategory,
  stripTrackingParams,
  TRACKING_PARAMETER_CATALOG,
} from './trackingParams'

describe('getPresentTrackingParamNames', () => {
  it('returns only known tracking params present in the query string', () => {
    const present = getPresentTrackingParamNames(
      'https://shop.example.com/menu?utm_source=newsletter',
      'Link',
    )
    expect([...present]).toEqual(['utm_source'])
  })

  it('returns an empty set when no query string is present', () => {
    const present = getPresentTrackingParamNames(
      'https://shop.example.com/menu',
      'Link',
    )
    expect(present.size).toBe(0)
  })

  it('ignores query parameters not on the known catalog', () => {
    const present = getPresentTrackingParamNames(
      'https://shop.example.com/menu?ref=friend&utm_source=newsletter',
      'Link',
    )
    expect([...present]).toEqual(['utm_source'])
  })

  it('returns an empty set for non-Link content', () => {
    const present = getPresentTrackingParamNames(
      'plain text with utm_source=foo in it',
      'Text',
    )
    expect(present.size).toBe(0)
  })

  it('collapses duplicate keys to a single entry (EC-6)', () => {
    const present = getPresentTrackingParamNames(
      'https://shop.example.com/menu?utm_source=a&utm_source=b',
      'Link',
    )
    expect([...present]).toEqual(['utm_source'])
  })
})

describe('stripTrackingParams (unchanged behavior)', () => {
  it('still strips known tracking params by default', () => {
    const result = stripTrackingParams(
      'https://shop.example.com/menu?utm_source=newsletter&ref=friend',
      'Link',
      defaultTrackingToggles(),
    )
    expect(result).toBe('https://shop.example.com/menu?ref=friend')
  })

  it('keeps a param when its toggle is off', () => {
    const toggles = { ...defaultTrackingToggles(), utm_source: false }
    const result = stripTrackingParams(
      'https://shop.example.com/menu?utm_source=newsletter',
      'Link',
      toggles,
    )
    expect(result).toBe('https://shop.example.com/menu?utm_source=newsletter')
  })
})

describe('groupByCategory', () => {
  it('groups the full catalog by category', () => {
    const groups = groupByCategory(TRACKING_PARAMETER_CATALOG)
    const categories = groups.map((g) => g.category)
    expect(categories).toContain('Generic UTM')
    expect(categories).toContain('Facebook')
  })
})
