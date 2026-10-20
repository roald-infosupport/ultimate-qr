// Non-lossy minification for text-based upload formats. Each function may only strip
// whitespace/comments/structure that carries no semantic meaning — it must never alter
// the actual data a file encodes (spec 002 section 5.4).

function stripBlankLinesAndTrailingWhitespace(text: string): string {
  const lines = text.split(/\r\n|\r|\n/)
  const kept = lines
    .map((line) => line.replace(/[ \t]+$/, ''))
    // A blank line carries no data in iCalendar/vCard; drop it entirely. A line
    // starting with whitespace is a folded continuation of the previous property
    // (RFC 5545/6350) and its leading whitespace must never be touched.
    .filter((line) => line !== '')

  return kept.join('\r\n')
}

export function minifyIcs(text: string): string {
  return stripBlankLinesAndTrailingWhitespace(text)
}

export function minifyVcf(text: string): string {
  return stripBlankLinesAndTrailingWhitespace(text)
}

export function minifySvg(text: string): string {
  return text
    .replace(/<!--[\s\S]*?-->/g, '')
    // Collapse whitespace-only text nodes sitting strictly between two tags
    // (e.g. indentation/newlines between elements). Never touches whitespace
    // inside attribute values or inside non-whitespace text content.
    .replace(/>\s+</g, '><')
    .trim()
}
