export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H'

// Byte-mode, version-40 (largest QR version) maximum capacities in bytes.
// Error-correction level is fixed to Medium (M) throughout the app today; level
// selection is a future story's responsibility (see spec 001 section 3).
const MAX_CAPACITY_BYTES: Record<ErrorCorrectionLevel, number> = {
  L: 2953,
  M: 2331,
  Q: 1663,
  H: 1273,
}

export const WARNING_THRESHOLD_RATIO = 0.75

export type CapacityStatusLevel = 'ok' | 'warning' | 'blocked'

export interface CapacityStatus {
  errorCorrectionLevel: ErrorCorrectionLevel
  capacityUsedBytes: number
  capacityMaxBytes: number
  status: CapacityStatusLevel
}

export function byteLength(content: string): number {
  return new TextEncoder().encode(content).length
}

export function computeCapacityStatus(
  content: string,
  errorCorrectionLevel: ErrorCorrectionLevel = 'M',
): CapacityStatus {
  const capacityUsedBytes = byteLength(content)
  const capacityMaxBytes = MAX_CAPACITY_BYTES[errorCorrectionLevel]

  let status: CapacityStatusLevel
  if (capacityUsedBytes > capacityMaxBytes) {
    status = 'blocked'
  } else if (capacityUsedBytes >= capacityMaxBytes * WARNING_THRESHOLD_RATIO) {
    status = 'warning'
  } else {
    status = 'ok'
  }

  return { errorCorrectionLevel, capacityUsedBytes, capacityMaxBytes, status }
}

// Truncates content to fit the absolute max capacity for the given level, cutting
// at a UTF-8-safe boundary so a multi-byte character is never split mid-codepoint.
// Used only by the Link/Text path (spec 001 EC-1) — the File path never truncates.
export function truncateToCapacity(
  content: string,
  errorCorrectionLevel: ErrorCorrectionLevel,
): string {
  const maxBytes = MAX_CAPACITY_BYTES[errorCorrectionLevel]
  const encoded = new TextEncoder().encode(content)
  if (encoded.length <= maxBytes) return content

  let end = maxBytes
  // Back off while we're in the middle of a multi-byte UTF-8 sequence
  // (continuation bytes have the high bits 10xxxxxx, i.e. 0x80-0xBF).
  while (end > 0 && (encoded[end] & 0xc0) === 0x80) {
    end -= 1
  }

  return new TextDecoder().decode(encoded.subarray(0, end))
}
