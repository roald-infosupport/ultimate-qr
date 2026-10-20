import type { ContentType } from './qrContent'

export interface TrackingParameterRule {
  name: string
  category: string
}

export const TRACKING_PARAMETER_CATALOG: TrackingParameterRule[] = [
  { name: 'utm_source', category: 'Generic UTM' },
  { name: 'utm_medium', category: 'Generic UTM' },
  { name: 'utm_campaign', category: 'Generic UTM' },
  { name: 'utm_term', category: 'Generic UTM' },
  { name: 'utm_content', category: 'Generic UTM' },
  { name: 'utm_id', category: 'Generic UTM' },
  { name: 'fbclid', category: 'Facebook' },
  { name: 'fb_action_ids', category: 'Facebook' },
  { name: 'fb_action_types', category: 'Facebook' },
  { name: 'fb_ref', category: 'Facebook' },
  { name: 'fb_source', category: 'Facebook' },
  { name: 'h', category: 'Facebook' },
  { name: 'gclid', category: 'Google Ads' },
  { name: 'gclsrc', category: 'Google Ads' },
  { name: 'dclid', category: 'Google Ads' },
  { name: 'gbraid', category: 'Google Ads' },
  { name: 'wbraid', category: 'Google Ads' },
  { name: 'msclkid', category: 'Microsoft Ads' },
  { name: 'mc_cid', category: 'Mailchimp' },
  { name: 'mc_eid', category: 'Mailchimp' },
  { name: 'igshid', category: 'Instagram' },
  { name: 'igsh', category: 'Instagram' },
]

export interface TrackingParameterGroup {
  category: string
  params: TrackingParameterRule[]
}

export function groupByCategory(
  catalog: TrackingParameterRule[],
): TrackingParameterGroup[] {
  const groups: TrackingParameterGroup[] = []
  for (const rule of catalog) {
    let group = groups.find((g) => g.category === rule.category)
    if (!group) {
      group = { category: rule.category, params: [] }
      groups.push(group)
    }
    group.params.push(rule)
  }
  return groups
}

export function defaultTrackingToggles(): Record<string, boolean> {
  return Object.fromEntries(
    TRACKING_PARAMETER_CATALOG.map((rule) => [rule.name, true]),
  )
}

export const OTHER_CATEGORY = 'Other'

const CATEGORY_BY_NAME = new Map(
  TRACKING_PARAMETER_CATALOG.map((rule) => [rule.name, rule.category]),
)

export function isKnownTrackingParam(name: string): boolean {
  return CATEGORY_BY_NAME.has(name)
}

export function categoryForParam(name: string): string {
  return CATEGORY_BY_NAME.get(name) ?? OTHER_CATEGORY
}

/** Known tracking params are stripped by default; unrecognized params are kept by default. */
export function defaultToggleState(name: string): boolean {
  return isKnownTrackingParam(name)
}

export function resolveToggleState(
  name: string,
  toggles: Record<string, boolean>,
): boolean {
  return toggles[name] ?? defaultToggleState(name)
}

function parseQueryString(
  content: string,
): { base: string; params: URLSearchParams; hash: string } | null {
  const queryIndex = content.indexOf('?')
  if (queryIndex === -1) return null

  const hashIndex = content.indexOf('#', queryIndex)
  const base = content.slice(0, queryIndex)
  const query =
    hashIndex === -1
      ? content.slice(queryIndex + 1)
      : content.slice(queryIndex + 1, hashIndex)
  const hash = hashIndex === -1 ? '' : content.slice(hashIndex)

  return { base, params: new URLSearchParams(query), hash }
}

/** Every query parameter currently present, known or not, in first-seen order. */
export function getPresentParamNames(
  content: string,
  contentType: ContentType,
): string[] {
  if (contentType !== 'Link') return []

  const parsed = parseQueryString(content)
  if (!parsed) return []

  return [...new Set(parsed.params.keys())]
}

export function buildPresentParameterGroups(
  content: string,
  contentType: ContentType,
): TrackingParameterGroup[] {
  const groups: TrackingParameterGroup[] = []
  for (const name of getPresentParamNames(content, contentType)) {
    const category = categoryForParam(name)
    let group = groups.find((g) => g.category === category)
    if (!group) {
      group = { category, params: [] }
      groups.push(group)
    }
    group.params.push({ name, category })
  }
  // "Other" (unrecognized params) is shown last, after all known categories.
  groups.sort((a, b) => {
    if (a.category === OTHER_CATEGORY) return 1
    if (b.category === OTHER_CATEGORY) return -1
    return 0
  })
  return groups
}

export function stripTrackingParams(
  content: string,
  contentType: ContentType,
  toggles: Record<string, boolean>,
): string {
  if (contentType !== 'Link') return content

  const parsed = parseQueryString(content)
  if (!parsed) return content
  const { base, params, hash } = parsed

  for (const name of new Set(params.keys())) {
    if (resolveToggleState(name, toggles)) {
      params.delete(name)
    }
  }

  const newQuery = params.toString()
  return base + (newQuery ? `?${newQuery}` : '') + hash
}
