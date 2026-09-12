import { COMPANY_SIGNAL_TYPE_BY_VALUE, type CompanySignalType } from '../constants'

export function parseCompanySignalTypes(url: URL) {
  const rawValues = url.searchParams
    .getAll('signal')
    .concat(url.searchParams.getAll('signal_type'))
    .flatMap((value) => value.split(','))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)

  const signalTypes = rawValues.length > 0 ? [...new Set(rawValues)] : ['upcoming_renewal']
  const invalid = signalTypes.filter((value) => !(value in COMPANY_SIGNAL_TYPE_BY_VALUE))

  return {
    signalTypes: signalTypes as CompanySignalType[],
    invalid,
  }
}

export type DaysToRenewalOperator = 'lt' | 'lte' | 'gt' | 'gte'

export type DaysToRenewalFilter = {
  operator: DaysToRenewalOperator
  value: number
}

function parseDaysToRenewalValue(value: string | null, parameterName: string) {
  if (value == null || value.trim() === '') return { value: undefined }
  const daysToRenewal = Number(value)
  if (!Number.isInteger(daysToRenewal) || daysToRenewal < 0 || daysToRenewal > 365) {
    return { error: `${parameterName} must be an integer from 0 to 365.` }
  }
  return { value: daysToRenewal }
}

export function parseDaysToRenewalFilters(url: URL) {
  const parameterOperators = [
    ['days_to_renewal', 'lte'],
    ['days_to_renewal_lt', 'lt'],
    ['days_to_renewal_lte', 'lte'],
    ['days_to_renewal_gt', 'gt'],
    ['days_to_renewal_gte', 'gte'],
  ] as const

  const filters: DaysToRenewalFilter[] = []
  let legacyDaysToRenewal: number | undefined

  for (const [parameterName, operator] of parameterOperators) {
    const parsed = parseDaysToRenewalValue(url.searchParams.get(parameterName), parameterName)
    if ('error' in parsed) return { error: parsed.error }
    if (parsed.value === undefined) continue

    filters.push({ operator, value: parsed.value })
    if (parameterName === 'days_to_renewal') legacyDaysToRenewal = parsed.value
  }

  return { filters, legacyDaysToRenewal }
}

export function matchesDaysToRenewalFilters(daysUntilRenewal: number, filters: DaysToRenewalFilter[]) {
  return filters.every((filter) => {
    if (filter.operator === 'lt') return daysUntilRenewal < filter.value
    if (filter.operator === 'lte') return daysUntilRenewal <= filter.value
    if (filter.operator === 'gt') return daysUntilRenewal > filter.value
    return daysUntilRenewal >= filter.value
  })
}

export function parseMinimumCount(value: string | null, parameterName: string) {
  if (value == null || value.trim() === '') return { count: undefined }
  const count = Number(value)
  if (!Number.isInteger(count) || count < 1) {
    return { error: `${parameterName} must be a positive integer.` }
  }
  return { count }
}

export function parseLimit(value: string | null, defaultLimit = 50, maxLimit = 200) {
  if (value == null || value.trim() === '') return { limit: defaultLimit }
  const limit = Number(value)
  if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit) {
    return { error: `limit must be an integer from 1 to ${maxLimit}.` }
  }
  return { limit }
}
