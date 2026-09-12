import {
  COVERAGE_TYPE_BY_DB_VALUE,
  COVERAGE_TYPE_BY_VALUE,
  COVERAGE_TYPES,
  type CoverageType,
} from '../constants'
import type { RenewalRow } from '../types'

function isTruthyIndicator(value: unknown) {
  return String(value ?? '').trim() === '1'
}

export function parseCoverageTypes(url: URL) {
  const rawValues = url.searchParams
    .getAll('coverage_type')
    .flatMap((value) => value.split(','))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)

  const coverageTypes = [...new Set(rawValues)]
  const invalid = coverageTypes.filter((value) => !(value in COVERAGE_TYPE_BY_VALUE))

  return {
    coverageTypes: coverageTypes as CoverageType[],
    invalid,
  }
}

export function dbCoverageValuesForCoverageTypes(coverageTypes: CoverageType[]) {
  return coverageTypes.map((coverageType) => COVERAGE_TYPE_BY_VALUE[coverageType].dbValue)
}

export function coverageTypeFromDbValue(value: string | null) {
  if (!value) return null
  return COVERAGE_TYPE_BY_DB_VALUE[value]?.value ?? value
}

export function coverageTypesForRow(row: RenewalRow) {
  return COVERAGE_TYPES.filter((coverageType) => isTruthyIndicator(row[coverageType.column as keyof RenewalRow])).map(
    (coverageType) => coverageType.value,
  )
}
