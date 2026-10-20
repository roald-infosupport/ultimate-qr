import { stripTrackingParams } from './trackingParams'

// 'File' is set directly by the file-upload path in App.tsx — it is never
// derived by classify(), which only ever distinguishes typed Link/Text input.
export type ContentType = 'Link' | 'Text' | 'File'

// Matches a bare domain/hostname (example.com), optionally followed by a path/query/fragment,
// with or without a leading scheme (https://, www.).
const LINK_PATTERN =
  /^(?:[a-z][a-z0-9+.-]*:\/\/)?(?:www\.)?[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+(?:[:/?#]\S*)?$/i

const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i

export function trimInput(rawInput: string): string {
  return rawInput.trim()
}

export function classify(trimmedInput: string): ContentType {
  if (trimmedInput === '') return 'Text'
  return LINK_PATTERN.test(trimmedInput) ? 'Link' : 'Text'
}

export function hasScheme(trimmedInput: string): boolean {
  return SCHEME_PATTERN.test(trimmedInput)
}

export function computeEncodedContent(
  trimmedInput: string,
  contentType: ContentType,
  schemeAutoAddEnabled: boolean,
  trackingToggles: Record<string, boolean>,
): string {
  let content = trimmedInput

  if (
    schemeAutoAddEnabled &&
    contentType === 'Link' &&
    content !== '' &&
    !hasScheme(content)
  ) {
    content = `https://${content}`
  }

  return stripTrackingParams(content, contentType, trackingToggles)
}
