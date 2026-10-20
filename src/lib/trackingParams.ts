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

const TRACKING_PARAM_NAMES = new Set(
  TRACKING_PARAMETER_CATALOG.map((rule) => rule.name),
)

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

export function getPresentTrackingParamNames(
  content: string,
  contentType: ContentType,
): Set<string> {
  if (contentType !== 'Link') return new Set()

  const parsed = parseQueryString(content)
  if (!parsed) return new Set()

  const present = new Set<string>()
  for (const name of parsed.params.keys()) {
    if (TRACKING_PARAM_NAMES.has(name)) present.add(name)
  }
  return present
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
    if (TRACKING_PARAM_NAMES.has(name) && toggles[name] !== false) {
      params.delete(name)
    }
  }

  const newQuery = params.toString()
  return base + (newQuery ? `?${newQuery}` : '') + hash
}
