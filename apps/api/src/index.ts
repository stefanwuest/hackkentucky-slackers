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

const COVERAGE_TYPES = [
  { value: 'health', label: 'Health', column: 'WLFR_BNFT_HEALTH_IND' },
  { value: 'dental', label: 'Dental', column: 'WLFR_BNFT_DENTAL_IND' },
  { value: 'vision', label: 'Vision', column: 'WLFR_BNFT_VISION_IND' },
  { value: 'life_insurance', label: 'Life insurance', column: 'WLFR_BNFT_LIFE_INSUR_IND' },
  { value: 'short_term_disability', label: 'Short-term disability', column: 'WLFR_BNFT_TEMP_DISAB_IND' },
  { value: 'long_term_disability', label: 'Long-term disability', column: 'WLFR_BNFT_LONG_TERM_DISAB_IND' },
  { value: 'unemployment', label: 'Unemployment', column: 'WLFR_BNFT_UNEMP_IND' },
  { value: 'prescription_drug', label: 'Prescription drug', column: 'WLFR_BNFT_DRUG_IND' },
  { value: 'stop_loss', label: 'Stop loss', column: 'WLFR_BNFT_STOP_LOSS_IND' },
  { value: 'hmo', label: 'HMO', column: 'WLFR_BNFT_HMO_IND' },
  { value: 'ppo', label: 'PPO', column: 'WLFR_BNFT_PPO_IND' },
  { value: 'indemnity', label: 'Indemnity', column: 'WLFR_BNFT_INDEMNITY_IND' },
  { value: 'other', label: 'Other', column: 'WLFR_BNFT_OTHER_IND' },
] as const

type CoverageType = (typeof COVERAGE_TYPES)[number]['value']

const COVERAGE_TYPE_BY_VALUE = Object.fromEntries(
  COVERAGE_TYPES.map((coverageType) => [coverageType.value, coverageType]),
) as Record<CoverageType, (typeof COVERAGE_TYPES)[number]>

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

app.get('/', (c) => c.json({ name: 'Zywave Prospect Intelligence API', status: 'ok' }))
app.get('/api/health', (c) => c.json({ status: 'ok' }))

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
