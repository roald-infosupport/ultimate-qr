const NETWORK_TIMEOUT_MS = 5000

function toParsableUrl(content: string): URL | null {
  try {
    return new URL(content)
  } catch {
    try {
      return new URL(`https://${content}`)
    } catch {
      return null
    }
  }
}

interface WrapperPattern {
  matches(url: URL): boolean
  extract(url: URL): string | null
}

// Facebook's l.php appends its own `h` tracking param inside the already
// percent-encoded `u` value rather than as a proper sibling query param, so
// decoding `u` can yield "https://example.com/page&h=abc123" with no `?`.
// Only that specific known suffix shape is promoted into a real query string
// (not any bare `&`, which could otherwise corrupt a path that legitimately
// contains an unencoded `&`) so the generic tracking-parameter stripper
// (re-run on this destination) can clean it.
const ORPHANED_FACEBOOK_H_PARAM = /&h=[^&]*$/

function normalizeOrphanedQueryParams(url: string): string {
  if (url.includes('?')) return url
  return url.replace(ORPHANED_FACEBOOK_H_PARAM, (match) => `?${match.slice(1)}`)
}

const WRAPPER_PATTERNS: WrapperPattern[] = [
  {
    matches: (url) =>
      /(^|\.)facebook\.com$/i.test(url.hostname) && url.pathname === '/l.php',
    extract: (url) => {
      const destination = url.searchParams.get('u')
      return destination ? normalizeOrphanedQueryParams(destination) : null
    },
  },
]

export function resolveLocalWrapper(content: string): string | null {
  const url = toParsableUrl(content)
  if (!url) return null

  for (const pattern of WRAPPER_PATTERNS) {
    if (pattern.matches(url)) {
      const destination = pattern.extract(url)
      if (destination) return destination
    }
  }

  return null
}

export async function resolveViaNetwork(
  content: string,
  timeoutMs: number = NETWORK_TIMEOUT_MS,
): Promise<string | null> {
  const url = toParsableUrl(content)
  if (!url) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url.toString(), {
      redirect: 'follow',
      signal: controller.signal,
    })
    if (response.url && response.url !== url.toString()) {
      return response.url
    }
    return null
  } finally {
    clearTimeout(timer)
  }
}
