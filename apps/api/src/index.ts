import { Hono } from 'hono'
import { cors } from 'hono/cors'

type D1Result<T> = {
  results?: T[]
  success?: boolean
  error?: string
}

type D1PreparedStatement = {
  bind: (...values: unknown[]) => {
    all: <T>() => Promise<D1Result<T>>
  }
}

type D1DatabaseLike = {
  prepare: (query: string) => D1PreparedStatement
}

type Bindings = {
  DB?: D1DatabaseLike
  MY_DB?: D1DatabaseLike
}

type RenewalRow = {
  ACK_ID: string
  PLAN_NAME: string | null
  SPONSOR_DFE_NAME: string | null
  SPONS_DFE_EIN: string | null
  SPONS_DFE_MAIL_US_CITY: string | null
  SPONS_DFE_MAIL_US_STATE: string | null
  SPONS_DFE_MAIL_US_ZIP: string | null
  INS_CARRIER_NAME: string | null
  INS_CARRIER_EIN: string | null
  INS_CARRIER_NAIC_CODE: string | null
  INS_CONTRACT_NUM: string | null
  INS_PRSN_COVERED_EOY_CNT: string | number | null
  INS_POLICY_FROM_DATE: string | null
  INS_POLICY_TO_DATE: string | null
  WLFR_PREMIUM_RCVD_AMT: string | number | null
  WLFR_TOT_EARNED_PREM_AMT: string | number | null
  WLFR_TYPE_BNFT_OTH_TEXT: string | null
  WLFR_BNFT_HEALTH_IND: string | number | null
  WLFR_BNFT_DENTAL_IND: string | number | null
  WLFR_BNFT_VISION_IND: string | number | null
  WLFR_BNFT_LIFE_INSUR_IND: string | number | null
  WLFR_BNFT_TEMP_DISAB_IND: string | number | null
  WLFR_BNFT_LONG_TERM_DISAB_IND: string | number | null
  WLFR_BNFT_UNEMP_IND: string | number | null
  WLFR_BNFT_DRUG_IND: string | number | null
  WLFR_BNFT_STOP_LOSS_IND: string | number | null
  WLFR_BNFT_HMO_IND: string | number | null
  WLFR_BNFT_PPO_IND: string | number | null
  WLFR_BNFT_INDEMNITY_IND: string | number | null
  WLFR_BNFT_OTHER_IND: string | number | null
}

type ScatteredRenewalGroup = {
  sponsor: {
    name: string | null
    ein: string | null
    city: string | null
    state: string | null
    zip: string | null
  }
  coverage_type: CoverageType
  carriers: Map<
    string,
    {
      name: string | null
      ein: string | null
      naic_code: string | null
    }
  >
  contracts: Map<
    string,
    {
      contract_number: string | null
      carrier_name: string | null
    }
  >
  endMonths: Map<
    number,
    {
      month: number
      label: string
      policy_to_dates: Set<string>
    }
  >
  plans: Array<{
    ack_id: string
    plan_name: string | null
    carrier_name: string | null
    carrier_ein: string | null
    carrier_naic_code: string | null
    contract_number: string | null
    policy_from_date: string | null
    policy_to_date: string | null
    policy_end_month: number
    covered_lives_eoy: number | null
    premium_received_amount: number | null
    total_earned_premium_amount: number | null
  }>
}

type CompanyRenewalSignalRow = {
  company_id: string
  sponsor_ein: string | null
  display_name: string | null
  dba_name: string | null
  mail_city: string | null
  mail_state: string | null
  mail_zip: string | null
  business_code: string | null
  filing_count: string | number | null
  plan_count: string | number | null
  latest_date_received: string | null
  contract_count: string | number | null
  carrier_count: string | number | null
  contract_number_count: string | number | null
  policy_end_month_count: string | number | null
  total_covered_lives_eoy: string | number | null
  total_premium_received: string | number | null
  total_earned_premium: string | number | null
  contract_id: string
  plan_id: string
  plan_name: string | null
  carrier_name: string | null
  carrier_ein: string | null
  carrier_naic_code: string | null
  contract_number: string | null
  coverage_type: string | null
  covered_lives_eoy: string | number | null
  policy_from_date: string | null
  policy_to_date: string | null
  premium_received: string | number | null
  contract_total_earned_premium: string | number | null
}

const COVERAGE_TYPES = [
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

type CoverageType = (typeof COVERAGE_TYPES)[number]['value']

const COVERAGE_TYPE_BY_VALUE = Object.fromEntries(
  COVERAGE_TYPES.map((coverageType) => [coverageType.value, coverageType]),
) as Record<CoverageType, (typeof COVERAGE_TYPES)[number]>

const COVERAGE_TYPE_BY_DB_VALUE = Object.fromEntries(
  COVERAGE_TYPES.map((coverageType) => [coverageType.dbValue, coverageType]),
) as Record<string, (typeof COVERAGE_TYPES)[number]>

const COMPANY_SIGNAL_TYPES = [{ value: 'upcoming_renewal', label: 'Upcoming renewal' }] as const

type CompanySignalType = (typeof COMPANY_SIGNAL_TYPES)[number]['value']

const COMPANY_SIGNAL_TYPE_BY_VALUE = Object.fromEntries(
  COMPANY_SIGNAL_TYPES.map((signalType) => [signalType.value, signalType]),
) as Record<CompanySignalType, (typeof COMPANY_SIGNAL_TYPES)[number]>

const ALLOWED_STATES = [
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

const MS_PER_DAY = 24 * 60 * 60 * 1000

const MONTH_NAMES = [
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

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`
}

function scheduleColumn(column: string) {
  return `s.${quoteIdentifier(column)}`
}

function isTruthyIndicator(value: unknown) {
  return String(value ?? '').trim() === '1'
}

function toNumberOrNull(value: string | number | null) {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function todayUtc() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function dateFromMonthDay(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, Math.min(day, daysInMonth(year, month))))
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function policyEndDateParts(policyToDate: string | null) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(policyToDate ?? '')
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  return { year, month, day }
}

function estimatedRenewalDate(policyToDate: string | null, today = todayUtc()) {
  const parts = policyEndDateParts(policyToDate)
  if (!parts) return null

  let estimated = dateFromMonthDay(today.getUTCFullYear(), parts.month, parts.day)
  if (estimated.getTime() < today.getTime()) {
    estimated = dateFromMonthDay(today.getUTCFullYear() + 1, parts.month, parts.day)
  }

  return estimated
}

function monthLabel(month: number) {
  return MONTH_NAMES[month - 1] ?? 'Unknown'
}

function normalizeForDistinct(value: string | number | null | undefined) {
  const normalized = String(value ?? '').trim().replace(/\s+/g, ' ').toUpperCase()
  return normalized === '' ? null : normalized
}

function parseCoverageTypes(url: URL) {
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

function dbCoverageValuesForCoverageTypes(coverageTypes: CoverageType[]) {
  return coverageTypes.map((coverageType) => COVERAGE_TYPE_BY_VALUE[coverageType].dbValue)
}

function coverageTypeFromDbValue(value: string | null) {
  if (!value) return null
  return COVERAGE_TYPE_BY_DB_VALUE[value]?.value ?? value
}

function parseCompanySignalTypes(url: URL) {
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

type DaysToRenewalOperator = 'lt' | 'lte' | 'gt' | 'gte'

type DaysToRenewalFilter = {
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

function parseDaysToRenewalFilters(url: URL) {
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

function matchesDaysToRenewalFilters(daysUntilRenewal: number, filters: DaysToRenewalFilter[]) {
  return filters.every((filter) => {
    if (filter.operator === 'lt') return daysUntilRenewal < filter.value
    if (filter.operator === 'lte') return daysUntilRenewal <= filter.value
    if (filter.operator === 'gt') return daysUntilRenewal > filter.value
    return daysUntilRenewal >= filter.value
  })
}

function parseMinimumCount(value: string | null, parameterName: string) {
  if (value == null || value.trim() === '') return { count: undefined }
  const count = Number(value)
  if (!Number.isInteger(count) || count < 1) {
    return { error: `${parameterName} must be a positive integer.` }
  }
  return { count }
}

function parseLimit(value: string | null, defaultLimit = 50, maxLimit = 200) {
  if (value == null || value.trim() === '') return { limit: defaultLimit }
  const limit = Number(value)
  if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit) {
    return { error: `limit must be an integer from 1 to ${maxLimit}.` }
  }
  return { limit }
}

function coverageTypesForRow(row: RenewalRow) {
  return COVERAGE_TYPES.filter((coverageType) => isTruthyIndicator(row[coverageType.column as keyof RenewalRow])).map(
    (coverageType) => coverageType.value,
  )
}

function sponsorKey(row: RenewalRow) {
  return normalizeForDistinct(row.SPONS_DFE_EIN) ?? normalizeForDistinct(row.SPONSOR_DFE_NAME) ?? row.ACK_ID
}

function distinctCarrierKey(row: RenewalRow) {
  const name = normalizeForDistinct(row.INS_CARRIER_NAME)
  const ein = normalizeForDistinct(row.INS_CARRIER_EIN)
  const naic = normalizeForDistinct(row.INS_CARRIER_NAIC_CODE)
  if (!name && !ein && !naic) return null
  return [name ?? '', ein ?? '', naic ?? ''].join('|')
}

function distinctContractKey(row: RenewalRow) {
  return normalizeForDistinct(row.INS_CONTRACT_NUM)
}

function bindAndQueryRenewalRows(db: D1DatabaseLike, state: string, coverageTypes: CoverageType[]) {
  const coverageWhere = coverageTypes.length
    ? `AND (${coverageTypes
        .map((coverageType) => `${scheduleColumn(COVERAGE_TYPE_BY_VALUE[coverageType].column)} = '1'`)
        .join(' OR ')})`
    : ''

  const sql = `
    SELECT
      s."ACK_ID",
      f."PLAN_NAME",
      f."SPONSOR_DFE_NAME",
      f."SPONS_DFE_EIN",
      f."SPONS_DFE_MAIL_US_CITY",
      f."SPONS_DFE_MAIL_US_STATE",
      f."SPONS_DFE_MAIL_US_ZIP",
      s."INS_CARRIER_NAME",
      s."INS_CARRIER_EIN",
      s."INS_CARRIER_NAIC_CODE",
      s."INS_CONTRACT_NUM",
      s."INS_PRSN_COVERED_EOY_CNT",
      s."INS_POLICY_FROM_DATE",
      s."INS_POLICY_TO_DATE",
      s."WLFR_PREMIUM_RCVD_AMT",
      s."WLFR_TOT_EARNED_PREM_AMT",
      s."WLFR_TYPE_BNFT_OTH_TEXT",
      s."WLFR_BNFT_HEALTH_IND",
      s."WLFR_BNFT_DENTAL_IND",
      s."WLFR_BNFT_VISION_IND",
      s."WLFR_BNFT_LIFE_INSUR_IND",
      s."WLFR_BNFT_TEMP_DISAB_IND",
      s."WLFR_BNFT_LONG_TERM_DISAB_IND",
      s."WLFR_BNFT_UNEMP_IND",
      s."WLFR_BNFT_DRUG_IND",
      s."WLFR_BNFT_STOP_LOSS_IND",
      s."WLFR_BNFT_HMO_IND",
      s."WLFR_BNFT_PPO_IND",
      s."WLFR_BNFT_INDEMNITY_IND",
      s."WLFR_BNFT_OTHER_IND"
    FROM "schedule_a_2025_latest" s
    INNER JOIN "form_5500_2025_latest" f ON f."ACK_ID" = s."ACK_ID"
    WHERE f."SPONS_DFE_MAIL_US_STATE" = ?
      AND s."INS_POLICY_TO_DATE" IS NOT NULL
      AND s."INS_POLICY_TO_DATE" != ''
      ${coverageWhere}
    ORDER BY s."INS_POLICY_TO_DATE" ASC, f."SPONSOR_DFE_NAME" ASC
  `

  return db.prepare(sql).bind(state).all<RenewalRow>()
}

function bindAndQueryCompanyRenewalSignalRows(db: D1DatabaseLike, state: string, coverageTypes: CoverageType[]) {
  const bindings: unknown[] = [state]
  const dbCoverageValues = dbCoverageValuesForCoverageTypes(coverageTypes)
  const coverageWhere = dbCoverageValues.length
    ? `AND cct."coverage_type" IN (${dbCoverageValues.map(() => '?').join(', ')})`
    : ''
  bindings.push(...dbCoverageValues)

  const sql = `
    SELECT
      c."company_id",
      c."sponsor_ein",
      c."display_name",
      c."dba_name",
      c."mail_city",
      c."mail_state",
      c."mail_zip",
      c."business_code",
      c."filing_count",
      c."plan_count",
      c."latest_date_received",
      ccs."contract_count",
      ccs."carrier_count",
      ccs."contract_number_count",
      ccs."policy_end_month_count",
      ccs."total_covered_lives_eoy",
      ccs."total_premium_received",
      ccs."total_earned_premium",
      ic."contract_id",
      ic."plan_id",
      p."plan_name",
      ic."carrier_name",
      ic."carrier_ein",
      ic."carrier_naic_code",
      ic."contract_number",
      cct."coverage_type",
      ic."covered_lives_eoy",
      ic."policy_from_date",
      ic."policy_to_date",
      ic."premium_received",
      ic."total_earned_premium" AS "contract_total_earned_premium"
    FROM "companies" c
    LEFT JOIN "company_contract_summary" ccs ON ccs."company_id" = c."company_id"
    INNER JOIN "insurance_contracts" ic ON ic."company_id" = c."company_id"
    LEFT JOIN "plans" p ON p."plan_id" = ic."plan_id"
    LEFT JOIN "contract_coverage_types" cct ON cct."contract_id" = ic."contract_id"
    WHERE c."mail_state" = ?
      AND ic."policy_to_date" IS NOT NULL
      AND ic."policy_to_date" != ''
      ${coverageWhere}
    ORDER BY c."display_name" ASC, ic."policy_to_date" ASC
  `

  return db.prepare(sql).bind(...bindings).all<CompanyRenewalSignalRow>()
}

app.get('/', (c) => c.json({ name: 'Zywave Prospect Intelligence API', status: 'ok' }))
app.get('/api/health', (c) => c.json({ status: 'ok' }))

app.get('/api/companies', async (c) => {
  const url = new URL(c.req.url)
  const state = url.searchParams.get('state')?.trim().toUpperCase()

  if (!state) {
    return c.json(
      {
        error: 'state is required for the first company signal endpoint.',
        allowed_states: ALLOWED_STATES,
      },
      400,
    )
  }

  if (!ALLOWED_STATES.includes(state as (typeof ALLOWED_STATES)[number])) {
    return c.json(
      {
        error: 'state must be one of the Schedule A states.',
        allowed_states: ALLOWED_STATES,
      },
      400,
    )
  }

  const { signalTypes, invalid: invalidSignalTypes } = parseCompanySignalTypes(url)
  if (invalidSignalTypes.length > 0) {
    return c.json(
      {
        error: 'signal contains unsupported values.',
        invalid_signal_types: invalidSignalTypes,
        allowed_signal_types: COMPANY_SIGNAL_TYPES.map(({ value, label }) => ({ value, label })),
      },
      400,
    )
  }

  const { coverageTypes, invalid } = parseCoverageTypes(url)
  if (invalid.length > 0) {
    return c.json(
      {
        error: 'coverage_type contains unsupported values.',
        invalid_coverage_types: invalid,
        allowed_coverage_types: COVERAGE_TYPES.map(({ value, label }) => ({ value, label })),
      },
      400,
    )
  }

  const parsedDaysToRenewal = parseDaysToRenewalFilters(url)
  if ('error' in parsedDaysToRenewal) {
    return c.json({ error: parsedDaysToRenewal.error }, 400)
  }

  const parsedLimit = parseLimit(url.searchParams.get('limit'))
  if ('error' in parsedLimit) return c.json({ error: parsedLimit.error }, 400)

  if (!signalTypes.includes('upcoming_renewal')) {
    return c.json(
      {
        filters: {
          state,
          signal: signalTypes,
          coverage_type: coverageTypes,
          days_to_renewal: parsedDaysToRenewal.legacyDaysToRenewal ?? null,
          days_to_renewal_filters: parsedDaysToRenewal.filters,
          limit: parsedLimit.limit,
        },
        metadata: {
          allowed_signal_types: COMPANY_SIGNAL_TYPES.map(({ value, label }) => ({ value, label })),
          allowed_coverage_types: COVERAGE_TYPES.map(({ value, label }) => ({ value, label })),
          allowed_states: ALLOWED_STATES,
        },
        count: 0,
        total_count: 0,
        companies: [],
      },
      200,
    )
  }

  const db = c.env.DB ?? c.env.MY_DB
  if (!db) {
    return c.json(
      {
        error: 'D1 database binding not found. Bind the seeded database as DB (preferred) or MY_DB.',
      },
      500,
    )
  }

  const queryResult = await bindAndQueryCompanyRenewalSignalRows(db, state, coverageTypes)
  if (queryResult.success === false) {
    return c.json({ error: queryResult.error ?? 'Failed to query companies.' }, 500)
  }

  const today = todayUtc()
  const groups = new Map<
    string,
    {
      company: {
        company_id: string
        name: string | null
        dba_name: string | null
        sponsor_ein: string | null
        location: {
          city: string | null
          state: string | null
          zip: string | null
        }
        business_code: string | null
        metrics: {
          filing_count: number | null
          plan_count: number | null
          contract_count: number | null
          carrier_count: number | null
          contract_number_count: number | null
          policy_end_month_count: number | null
          total_covered_lives_eoy: number | null
          total_premium_received: number | null
          total_earned_premium: number | null
          latest_date_received: string | null
        }
        signals: Array<{
          type: CompanySignalType
          severity: 'low' | 'medium' | 'high'
          label: string
          properties: {
            earliest_estimated_renewal_date: string
            minimum_days_until_renewal: number
            renewal_contract_count: number
            coverage_types: string[]
          }
          evidence: Array<{
            contract_id: string
            plan_id: string
            plan_name: string | null
            carrier: {
              name: string | null
              ein: string | null
              naic_code: string | null
              contract_number: string | null
            }
            coverage_types: string[]
            covered_lives_eoy: number | null
            policy_from_date: string | null
            policy_to_date: string | null
            estimated_renewal_date: string
            days_until_renewal: number
            premium_received_amount: number | null
            total_earned_premium_amount: number | null
          }>
        }>
      }
      minimumDaysUntilRenewal: number
      earliestEstimatedRenewalDate: string
      coverageTypes: Set<string>
      evidenceByContract: Map<
        string,
        {
          evidence: {
            contract_id: string
            plan_id: string
            plan_name: string | null
            carrier: {
              name: string | null
              ein: string | null
              naic_code: string | null
              contract_number: string | null
            }
            coverage_types: string[]
            covered_lives_eoy: number | null
            policy_from_date: string | null
            policy_to_date: string | null
            estimated_renewal_date: string
            days_until_renewal: number
            premium_received_amount: number | null
            total_earned_premium_amount: number | null
          }
          coverageTypes: Set<string>
        }
      >
    }
  >()

  for (const row of queryResult.results ?? []) {
    const renewalDate = estimatedRenewalDate(row.policy_to_date, today)
    if (!renewalDate) continue

    const daysUntilRenewal = Math.ceil((renewalDate.getTime() - today.getTime()) / MS_PER_DAY)
    if (!matchesDaysToRenewalFilters(daysUntilRenewal, parsedDaysToRenewal.filters)) continue

    const estimatedRenewalDateIso = toIsoDate(renewalDate)
    let group = groups.get(row.company_id)
    if (!group) {
      group = {
        company: {
          company_id: row.company_id,
          name: row.display_name,
          dba_name: row.dba_name,
          sponsor_ein: row.sponsor_ein,
          location: {
            city: row.mail_city,
            state: row.mail_state,
            zip: row.mail_zip,
          },
          business_code: row.business_code,
          metrics: {
            filing_count: toNumberOrNull(row.filing_count),
            plan_count: toNumberOrNull(row.plan_count),
            contract_count: toNumberOrNull(row.contract_count),
            carrier_count: toNumberOrNull(row.carrier_count),
            contract_number_count: toNumberOrNull(row.contract_number_count),
            policy_end_month_count: toNumberOrNull(row.policy_end_month_count),
            total_covered_lives_eoy: toNumberOrNull(row.total_covered_lives_eoy),
            total_premium_received: toNumberOrNull(row.total_premium_received),
            total_earned_premium: toNumberOrNull(row.total_earned_premium),
            latest_date_received: row.latest_date_received,
          },
          signals: [],
        },
        minimumDaysUntilRenewal: daysUntilRenewal,
        earliestEstimatedRenewalDate: estimatedRenewalDateIso,
        coverageTypes: new Set<string>(),
        evidenceByContract: new Map(),
      }
      groups.set(row.company_id, group)
    }

    if (daysUntilRenewal < group.minimumDaysUntilRenewal) {
      group.minimumDaysUntilRenewal = daysUntilRenewal
      group.earliestEstimatedRenewalDate = estimatedRenewalDateIso
    }

    const coverageType = coverageTypeFromDbValue(row.coverage_type)
    if (coverageType) group.coverageTypes.add(coverageType)

    let evidenceGroup = group.evidenceByContract.get(row.contract_id)
    if (!evidenceGroup) {
      evidenceGroup = {
        evidence: {
          contract_id: row.contract_id,
          plan_id: row.plan_id,
          plan_name: row.plan_name,
          carrier: {
            name: row.carrier_name,
            ein: row.carrier_ein,
            naic_code: row.carrier_naic_code,
            contract_number: row.contract_number,
          },
          coverage_types: [],
          covered_lives_eoy: toNumberOrNull(row.covered_lives_eoy),
          policy_from_date: row.policy_from_date,
          policy_to_date: row.policy_to_date,
          estimated_renewal_date: estimatedRenewalDateIso,
          days_until_renewal: daysUntilRenewal,
          premium_received_amount: toNumberOrNull(row.premium_received),
          total_earned_premium_amount: toNumberOrNull(row.contract_total_earned_premium),
        },
        coverageTypes: new Set<string>(),
      }
      group.evidenceByContract.set(row.contract_id, evidenceGroup)
    }
    if (coverageType) evidenceGroup.coverageTypes.add(coverageType)
  }

  const companies = [...groups.values()]
    .map((group) => {
      const evidence = [...group.evidenceByContract.values()]
        .map((evidenceGroup) => ({
          ...evidenceGroup.evidence,
          coverage_types: [...evidenceGroup.coverageTypes].sort(),
        }))
        .sort((a, b) => {
          const daysDiff = a.days_until_renewal - b.days_until_renewal
          if (daysDiff !== 0) return daysDiff
          return (a.carrier.name ?? '').localeCompare(b.carrier.name ?? '')
        })

      group.company.signals.push({
        type: 'upcoming_renewal',
        severity: group.minimumDaysUntilRenewal <= 30 ? 'high' : group.minimumDaysUntilRenewal <= 90 ? 'medium' : 'low',
        label: `Renewal likely in ${group.minimumDaysUntilRenewal} days`,
        properties: {
          earliest_estimated_renewal_date: group.earliestEstimatedRenewalDate,
          minimum_days_until_renewal: group.minimumDaysUntilRenewal,
          renewal_contract_count: evidence.length,
          coverage_types: [...group.coverageTypes].sort(),
        },
        evidence,
      })

      return group.company
    })
    .sort((a, b) => {
      const aDays = a.signals[0]?.properties.minimum_days_until_renewal ?? Number.MAX_SAFE_INTEGER
      const bDays = b.signals[0]?.properties.minimum_days_until_renewal ?? Number.MAX_SAFE_INTEGER
      if (aDays !== bDays) return aDays - bDays
      return (a.name ?? '').localeCompare(b.name ?? '')
    })

  const limitedCompanies = companies.slice(0, parsedLimit.limit)

  return c.json({
    filters: {
      state,
      signal: signalTypes,
      coverage_type: coverageTypes,
      days_to_renewal: parsedDaysToRenewal.legacyDaysToRenewal ?? null,
      days_to_renewal_filters: parsedDaysToRenewal.filters,
      limit: parsedLimit.limit,
    },
    metadata: {
      signal_filter_semantics:
        'Signal-specific filters currently apply to upcoming_renewal and are combined with AND semantics.',
      allowed_signal_types: COMPANY_SIGNAL_TYPES.map(({ value, label }) => ({ value, label })),
      allowed_coverage_types: COVERAGE_TYPES.map(({ value, label }) => ({ value, label })),
      allowed_states: ALLOWED_STATES,
    },
    count: limitedCompanies.length,
    total_count: companies.length,
    companies: limitedCompanies,
  })
})

app.get('/api/renewals', async (c) => {
  const url = new URL(c.req.url)
  const state = url.searchParams.get('state')?.trim().toUpperCase()

  if (!state) {
    return c.json(
      {
        error: 'state is required.',
        allowed_states: ALLOWED_STATES,
      },
      400,
    )
  }

  if (!ALLOWED_STATES.includes(state as (typeof ALLOWED_STATES)[number])) {
    return c.json(
      {
        error: 'state must be one of the Schedule A states.',
        allowed_states: ALLOWED_STATES,
      },
      400,
    )
  }

  const { coverageTypes, invalid } = parseCoverageTypes(url)
  if (invalid.length > 0) {
    return c.json(
      {
        error: 'coverage_type contains unsupported values.',
        invalid_coverage_types: invalid,
        allowed_coverage_types: COVERAGE_TYPES.map(({ value, label }) => ({ value, label })),
      },
      400,
    )
  }

  const parsedDaysToRenewal = parseDaysToRenewalFilters(url)
  if ('error' in parsedDaysToRenewal) {
    return c.json({ error: parsedDaysToRenewal.error }, 400)
  }

  const db = c.env.DB ?? c.env.MY_DB
  if (!db) {
    return c.json(
      {
        error: 'D1 database binding not found. Bind the seeded database as DB (preferred) or MY_DB.',
      },
      500,
    )
  }

  const queryResult = await bindAndQueryRenewalRows(db, state, coverageTypes)
  if (queryResult.success === false) {
    return c.json({ error: queryResult.error ?? 'Failed to query renewals.' }, 500)
  }

  const today = todayUtc()
  const renewals = (queryResult.results ?? []).flatMap((row) => {
    const renewalDate = estimatedRenewalDate(row.INS_POLICY_TO_DATE, today)
    if (!renewalDate) return []

    const daysUntilRenewal = Math.ceil((renewalDate.getTime() - today.getTime()) / MS_PER_DAY)
    if (!matchesDaysToRenewalFilters(daysUntilRenewal, parsedDaysToRenewal.filters)) {
      return []
    }

    return [
      {
        ack_id: row.ACK_ID,
        plan_name: row.PLAN_NAME,
        sponsor: {
          name: row.SPONSOR_DFE_NAME,
          ein: row.SPONS_DFE_EIN,
          city: row.SPONS_DFE_MAIL_US_CITY,
          state: row.SPONS_DFE_MAIL_US_STATE,
          zip: row.SPONS_DFE_MAIL_US_ZIP,
        },
        carrier: {
          name: row.INS_CARRIER_NAME,
          ein: row.INS_CARRIER_EIN,
          naic_code: row.INS_CARRIER_NAIC_CODE,
          contract_number: row.INS_CONTRACT_NUM,
        },
        coverage_types: coverageTypesForRow(row),
        other_coverage_text: row.WLFR_TYPE_BNFT_OTH_TEXT,
        covered_lives_eoy: toNumberOrNull(row.INS_PRSN_COVERED_EOY_CNT),
        policy_from_date: row.INS_POLICY_FROM_DATE,
        policy_to_date: row.INS_POLICY_TO_DATE,
        estimated_renewal_date: toIsoDate(renewalDate),
        days_until_renewal: daysUntilRenewal,
        premium_received_amount: toNumberOrNull(row.WLFR_PREMIUM_RCVD_AMT),
        total_earned_premium_amount: toNumberOrNull(row.WLFR_TOT_EARNED_PREM_AMT),
      },
    ]
  })

  renewals.sort((a, b) => a.days_until_renewal - b.days_until_renewal)

  return c.json({
    filters: {
      state,
      coverage_type: coverageTypes,
      days_to_renewal: parsedDaysToRenewal.legacyDaysToRenewal ?? null,
      days_to_renewal_filters: parsedDaysToRenewal.filters,
    },
    metadata: {
      as_of_date: toIsoDate(today),
      allowed_coverage_types: COVERAGE_TYPES.map(({ value, label }) => ({ value, label })),
      allowed_states: ALLOWED_STATES,
    },
    count: renewals.length,
    renewals,
  })
})

app.get('/api/scattered-renewals', async (c) => {
  const url = new URL(c.req.url)
  const state = url.searchParams.get('state')?.trim().toUpperCase()

  if (!state) {
    return c.json(
      {
        error: 'state is required.',
        allowed_states: ALLOWED_STATES,
      },
      400,
    )
  }

  if (!ALLOWED_STATES.includes(state as (typeof ALLOWED_STATES)[number])) {
    return c.json(
      {
        error: 'state must be one of the Schedule A states.',
        allowed_states: ALLOWED_STATES,
      },
      400,
    )
  }

  const { coverageTypes, invalid } = parseCoverageTypes(url)
  if (invalid.length > 0) {
    return c.json(
      {
        error: 'coverage_type contains unsupported values.',
        invalid_coverage_types: invalid,
        allowed_coverage_types: COVERAGE_TYPES.map(({ value, label }) => ({ value, label })),
      },
      400,
    )
  }

  const parsedCarrierCount = parseMinimumCount(url.searchParams.get('carrier_count'), 'carrier_count')
  if ('error' in parsedCarrierCount) return c.json({ error: parsedCarrierCount.error }, 400)

  const parsedContractCount = parseMinimumCount(url.searchParams.get('contract_count'), 'contract_count')
  if ('error' in parsedContractCount) return c.json({ error: parsedContractCount.error }, 400)

  const parsedEndMonthCount = parseMinimumCount(url.searchParams.get('end_month_count'), 'end_month_count')
  if ('error' in parsedEndMonthCount) return c.json({ error: parsedEndMonthCount.error }, 400)

  const hasCountFilters =
    parsedCarrierCount.count !== undefined ||
    parsedContractCount.count !== undefined ||
    parsedEndMonthCount.count !== undefined

  const db = c.env.DB ?? c.env.MY_DB
  if (!db) {
    return c.json(
      {
        error: 'D1 database binding not found. Bind the seeded database as DB (preferred) or MY_DB.',
      },
      500,
    )
  }

  const queryResult = await bindAndQueryRenewalRows(db, state, coverageTypes)
  if (queryResult.success === false) {
    return c.json({ error: queryResult.error ?? 'Failed to query scattered renewals.' }, 500)
  }

  const groups = new Map<string, ScatteredRenewalGroup>()

  for (const row of queryResult.results ?? []) {
    const endDateParts = policyEndDateParts(row.INS_POLICY_TO_DATE)
    if (!endDateParts) continue

    const rowCoverageTypes = coverageTypesForRow(row).filter(
      (coverageType) => coverageTypes.length === 0 || coverageTypes.includes(coverageType),
    )

    for (const coverageType of rowCoverageTypes) {
      const groupKey = `${sponsorKey(row)}|${coverageType}`
      let group = groups.get(groupKey)

      if (!group) {
        group = {
          sponsor: {
            name: row.SPONSOR_DFE_NAME,
            ein: row.SPONS_DFE_EIN,
            city: row.SPONS_DFE_MAIL_US_CITY,
            state: row.SPONS_DFE_MAIL_US_STATE,
            zip: row.SPONS_DFE_MAIL_US_ZIP,
          },
          coverage_type: coverageType,
          carriers: new Map(),
          contracts: new Map(),
          endMonths: new Map(),
          plans: [],
        }
        groups.set(groupKey, group)
      }

      const carrierKey = distinctCarrierKey(row)
      if (carrierKey && !group.carriers.has(carrierKey)) {
        group.carriers.set(carrierKey, {
          name: row.INS_CARRIER_NAME,
          ein: row.INS_CARRIER_EIN,
          naic_code: row.INS_CARRIER_NAIC_CODE,
        })
      }

      const contractKey = distinctContractKey(row)
      if (contractKey && !group.contracts.has(contractKey)) {
        group.contracts.set(contractKey, {
          contract_number: row.INS_CONTRACT_NUM,
          carrier_name: row.INS_CARRIER_NAME,
        })
      }

      const endMonth = group.endMonths.get(endDateParts.month) ?? {
        month: endDateParts.month,
        label: monthLabel(endDateParts.month),
        policy_to_dates: new Set<string>(),
      }
      if (row.INS_POLICY_TO_DATE) endMonth.policy_to_dates.add(row.INS_POLICY_TO_DATE)
      group.endMonths.set(endDateParts.month, endMonth)

      group.plans.push({
        ack_id: row.ACK_ID,
        plan_name: row.PLAN_NAME,
        carrier_name: row.INS_CARRIER_NAME,
        carrier_ein: row.INS_CARRIER_EIN,
        carrier_naic_code: row.INS_CARRIER_NAIC_CODE,
        contract_number: row.INS_CONTRACT_NUM,
        policy_from_date: row.INS_POLICY_FROM_DATE,
        policy_to_date: row.INS_POLICY_TO_DATE,
        policy_end_month: endDateParts.month,
        covered_lives_eoy: toNumberOrNull(row.INS_PRSN_COVERED_EOY_CNT),
        premium_received_amount: toNumberOrNull(row.WLFR_PREMIUM_RCVD_AMT),
        total_earned_premium_amount: toNumberOrNull(row.WLFR_TOT_EARNED_PREM_AMT),
      })
    }
  }

  const scatteredRenewals = [...groups.values()].flatMap((group) => {
    const carrierCount = group.carriers.size
    const contractCount = group.contracts.size
    const endMonthCount = group.endMonths.size

    const matchesCountFilters = hasCountFilters
      ? (parsedCarrierCount.count === undefined || carrierCount >= parsedCarrierCount.count) &&
        (parsedContractCount.count === undefined || contractCount >= parsedContractCount.count) &&
        (parsedEndMonthCount.count === undefined || endMonthCount >= parsedEndMonthCount.count)
      : carrierCount > 1 || contractCount > 1 || endMonthCount > 1

    if (!matchesCountFilters) return []

    const scatterReasons = [
      carrierCount > 1 ? 'multiple_carriers' : null,
      contractCount > 1 ? 'multiple_contracts' : null,
      endMonthCount > 1 ? 'multiple_end_months' : null,
    ].filter((reason): reason is string => reason !== null)

    return [
      {
        sponsor: group.sponsor,
        coverage_type: group.coverage_type,
        scatter_reasons: scatterReasons,
        carrier_count: carrierCount,
        contract_count: contractCount,
        end_month_count: endMonthCount,
        row_count: group.plans.length,
        carriers: [...group.carriers.values()].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
        contracts: [...group.contracts.values()].sort((a, b) =>
          (a.contract_number ?? '').localeCompare(b.contract_number ?? ''),
        ),
        end_months: [...group.endMonths.values()]
          .sort((a, b) => a.month - b.month)
          .map((endMonth) => ({
            month: endMonth.month,
            label: endMonth.label,
            policy_to_dates: [...endMonth.policy_to_dates].sort(),
          })),
        plans: group.plans.sort((a, b) => {
          const monthDiff = a.policy_end_month - b.policy_end_month
          if (monthDiff !== 0) return monthDiff
          return (a.carrier_name ?? '').localeCompare(b.carrier_name ?? '')
        }),
      },
    ]
  })

  scatteredRenewals.sort((a, b) => {
    const reasonDiff = b.scatter_reasons.length - a.scatter_reasons.length
    if (reasonDiff !== 0) return reasonDiff

    const carrierDiff = b.carrier_count - a.carrier_count
    if (carrierDiff !== 0) return carrierDiff

    const contractDiff = b.contract_count - a.contract_count
    if (contractDiff !== 0) return contractDiff

    const endMonthDiff = b.end_month_count - a.end_month_count
    if (endMonthDiff !== 0) return endMonthDiff

    return (a.sponsor.name ?? '').localeCompare(b.sponsor.name ?? '')
  })

  return c.json({
    filters: {
      state,
      coverage_type: coverageTypes,
      carrier_count: parsedCarrierCount.count ?? null,
      contract_count: parsedContractCount.count ?? null,
      end_month_count: parsedEndMonthCount.count ?? null,
    },
    metadata: {
      count_filter_semantics: hasCountFilters
        ? 'Provided count filters are minimums and are combined with AND.'
        : 'No count filters provided; returned groups have multiple carriers, contracts, or end-date months.',
      allowed_coverage_types: COVERAGE_TYPES.map(({ value, label }) => ({ value, label })),
      allowed_states: ALLOWED_STATES,
    },
    count: scatteredRenewals.length,
    scattered_renewals: scatteredRenewals,
  })
})

export default app
