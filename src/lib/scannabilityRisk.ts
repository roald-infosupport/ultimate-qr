export type RiskFactor = 'lowContrast' | 'excessiveLogoCoverage'

export interface ScannabilityRisk {
  contrastRatio: number | null
  logoCoveragePercent: number | null
  isAtRisk: boolean
  riskFactors: RiskFactor[]
}

// WCAG-style contrast ratio (1-21); below this, a QR scanner's binarization
// step is at meaningfully higher risk of misreading modules.
export const LOW_CONTRAST_THRESHOLD = 4.5

// Matches story 005's planned default safe maximum for logo coverage.
export const MAX_SAFE_LOGO_COVERAGE_PERCENT = 30

// Nullable inputs: both stay null until stories 005 (logo) / 006 (colors)
// exist and feed in real values — a null input never contributes risk.
export function computeScannabilityRisk(
  contrastRatio: number | null,
  logoCoveragePercent: number | null,
): ScannabilityRisk {
  const riskFactors: RiskFactor[] = []

  if (contrastRatio !== null && contrastRatio < LOW_CONTRAST_THRESHOLD) {
    riskFactors.push('lowContrast')
  }

  if (
    logoCoveragePercent !== null &&
    logoCoveragePercent > MAX_SAFE_LOGO_COVERAGE_PERCENT
  ) {
    riskFactors.push('excessiveLogoCoverage')
  }

  return {
    contrastRatio,
    logoCoveragePercent,
    isAtRisk: riskFactors.length > 0,
    riskFactors,
  }
}
