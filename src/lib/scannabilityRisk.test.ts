import { describe, expect, it } from 'vitest'
import {
  computeScannabilityRisk,
  LOW_CONTRAST_THRESHOLD,
  MAX_SAFE_LOGO_COVERAGE_PERCENT,
} from './scannabilityRisk'

describe('computeScannabilityRisk', () => {
  it('reports no risk when both factors are null (no design parameters active yet)', () => {
    const risk = computeScannabilityRisk(null, null)
    expect(risk.isAtRisk).toBe(false)
    expect(risk.riskFactors).toEqual([])
    expect(risk.contrastRatio).toBeNull()
    expect(risk.logoCoveragePercent).toBeNull()
  })

  it('reports no risk when contrast is exactly at the threshold', () => {
    const risk = computeScannabilityRisk(LOW_CONTRAST_THRESHOLD, null)
    expect(risk.isAtRisk).toBe(false)
    expect(risk.riskFactors).toEqual([])
  })

  it('reports low contrast risk just below the threshold', () => {
    const risk = computeScannabilityRisk(LOW_CONTRAST_THRESHOLD - 0.01, null)
    expect(risk.isAtRisk).toBe(true)
    expect(risk.riskFactors).toEqual(['lowContrast'])
  })

  it('reports no risk when logo coverage is exactly at the safe maximum', () => {
    const risk = computeScannabilityRisk(null, MAX_SAFE_LOGO_COVERAGE_PERCENT)
    expect(risk.isAtRisk).toBe(false)
    expect(risk.riskFactors).toEqual([])
  })

  it('reports excessive logo coverage risk just above the safe maximum', () => {
    const risk = computeScannabilityRisk(null, MAX_SAFE_LOGO_COVERAGE_PERCENT + 0.01)
    expect(risk.isAtRisk).toBe(true)
    expect(risk.riskFactors).toEqual(['excessiveLogoCoverage'])
  })

  it('reports both risk factors together when both are at risk', () => {
    const risk = computeScannabilityRisk(
      LOW_CONTRAST_THRESHOLD - 1,
      MAX_SAFE_LOGO_COVERAGE_PERCENT + 10,
    )
    expect(risk.isAtRisk).toBe(true)
    expect(risk.riskFactors).toEqual(['lowContrast', 'excessiveLogoCoverage'])
  })

  it('reports no risk when contrast is fine and logo coverage is null', () => {
    const risk = computeScannabilityRisk(21, null)
    expect(risk.isAtRisk).toBe(false)
  })

  it('reports no risk when logo coverage is fine and contrast is null', () => {
    const risk = computeScannabilityRisk(null, 10)
    expect(risk.isAtRisk).toBe(false)
  })
})
