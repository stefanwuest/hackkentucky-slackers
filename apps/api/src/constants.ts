export const COVERAGE_TYPES = [
  { value: 'health', label: 'Health', column: 'WLFR_BNFT_HEALTH_IND', dbValue: 'health' },
  { value: 'dental', label: 'Dental', column: 'WLFR_BNFT_DENTAL_IND', dbValue: 'dental' },
  { value: 'vision', label: 'Vision', column: 'WLFR_BNFT_VISION_IND', dbValue: 'vision' },
  { value: 'life_insurance', label: 'Life insurance', column: 'WLFR_BNFT_LIFE_INSUR_IND', dbValue: 'life' },
  {
    value: 'short_term_disability',
    label: 'Short-term disability',
    column: 'WLFR_BNFT_TEMP_DISAB_IND',
    dbValue: 'temporary_disability',
  },
  {
    value: 'long_term_disability',
    label: 'Long-term disability',
    column: 'WLFR_BNFT_LONG_TERM_DISAB_IND',
    dbValue: 'long_term_disability',
  },
  { value: 'unemployment', label: 'Unemployment', column: 'WLFR_BNFT_UNEMP_IND', dbValue: 'unemployment' },
  { value: 'prescription_drug', label: 'Prescription drug', column: 'WLFR_BNFT_DRUG_IND', dbValue: 'drug' },
  { value: 'stop_loss', label: 'Stop loss', column: 'WLFR_BNFT_STOP_LOSS_IND', dbValue: 'stop_loss' },
  { value: 'hmo', label: 'HMO', column: 'WLFR_BNFT_HMO_IND', dbValue: 'hmo' },
  { value: 'ppo', label: 'PPO', column: 'WLFR_BNFT_PPO_IND', dbValue: 'ppo' },
  { value: 'indemnity', label: 'Indemnity', column: 'WLFR_BNFT_INDEMNITY_IND', dbValue: 'indemnity' },
  { value: 'other', label: 'Other', column: 'WLFR_BNFT_OTHER_IND', dbValue: 'other' },
] as const

export type CoverageType = (typeof COVERAGE_TYPES)[number]['value']

export const COVERAGE_TYPE_BY_VALUE = Object.fromEntries(
  COVERAGE_TYPES.map((coverageType) => [coverageType.value, coverageType]),
) as Record<CoverageType, (typeof COVERAGE_TYPES)[number]>

export const COVERAGE_TYPE_BY_DB_VALUE = Object.fromEntries(
  COVERAGE_TYPES.map((coverageType) => [coverageType.dbValue, coverageType]),
) as Record<string, (typeof COVERAGE_TYPES)[number]>

export const COMPANY_SIGNAL_TYPES = [{ value: 'upcoming_renewal', label: 'Upcoming renewal' }] as const

export type CompanySignalType = (typeof COMPANY_SIGNAL_TYPES)[number]['value']

export const COMPANY_SIGNAL_TYPE_BY_VALUE = Object.fromEntries(
  COMPANY_SIGNAL_TYPES.map((signalType) => [signalType.value, signalType]),
) as Record<CompanySignalType, (typeof COMPANY_SIGNAL_TYPES)[number]>

export const ALLOWED_STATES = [
  'AK',
  'AL',
  'AR',
  'AZ',
  'CA',
  'CO',
  'CT',
  'DC',
  'DE',
  'FL',
  'GA',
  'GU',
  'HI',
  'IA',
  'ID',
  'IL',
  'IN',
  'KS',
  'KY',
  'LA',
  'MA',
  'MD',
  'ME',
  'MI',
  'MN',
  'MO',
  'MS',
  'MT',
  'NC',
  'ND',
  'NE',
  'NH',
  'NJ',
  'NM',
  'NV',
  'NY',
  'OH',
  'OK',
  'OR',
  'PA',
  'PR',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VA',
  'VI',
  'VT',
  'WA',
  'WI',
  'WV',
  'WY',
] as const

export const MS_PER_DAY = 24 * 60 * 60 * 1000

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

export const ALLOWED_COVERAGE_TYPES = COVERAGE_TYPES.map(({ value, label }) => ({ value, label }))
export const ALLOWED_SIGNAL_TYPES = COMPANY_SIGNAL_TYPES.map(({ value, label }) => ({ value, label }))
