import { Hono } from 'hono'

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

const app = new Hono<{ Bindings: Bindings }>()

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

function estimatedRenewalDate(policyToDate: string | null, today = todayUtc()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(policyToDate ?? '')
  if (!match) return null

  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  let estimated = dateFromMonthDay(today.getUTCFullYear(), month, day)
  if (estimated.getTime() < today.getTime()) {
    estimated = dateFromMonthDay(today.getUTCFullYear() + 1, month, day)
  }

  return estimated
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

function parseDaysToRenewal(value: string | null) {
  if (value == null || value.trim() === '') return { daysToRenewal: undefined }
  const daysToRenewal = Number(value)
  if (!Number.isInteger(daysToRenewal) || daysToRenewal < 0 || daysToRenewal > 365) {
    return { error: 'days_to_renewal must be an integer from 0 to 365.' }
  }
  return { daysToRenewal }
}

function coverageTypesForRow(row: RenewalRow) {
  return COVERAGE_TYPES.filter((coverageType) => isTruthyIndicator(row[coverageType.column as keyof RenewalRow])).map(
    (coverageType) => coverageType.value,
  )
}

app.get('/', (c) => {
  return c.html(`
    <html>
      <head>
        <style>
          * {
            box-sizing: border-box;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            margin: 0;
            background: #f5f5f5;
            color: #1a1a2e;
          }

          /* --- Floating header bar --- */
          .header-bar {
            position: sticky;
            top: 0;
            z-index: 100;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 2rem;
            padding: 0.85rem 1.5rem;
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border-bottom: 1px solid rgba(26, 26, 46, 0.08);
            box-shadow: 0 4px 16px rgba(26, 26, 46, 0.06);
          }

          .header-titles {
            display: flex;
            flex-direction: column;
            line-height: 1.15;
          }

          .header-titles h1 {
            font-size: 1.35rem;
            font-weight: 700;
            color: #1a1a2e;
            margin: 0;
            text-align: left;
          }

          .header-titles h2 {
            font-size: 0.85rem;
            font-weight: 400;
            color: #3f3755;
            margin: 0.15rem 0 0;
            text-align: left;
          }

          .search-wrap {
            flex: 0 1 340px;
          }

          .search-input {
            width: 100%;
            padding: 0.55rem 0.9rem;
            border: 1px solid rgba(26, 26, 46, 0.15);
            border-radius: 6px;
            font-size: 0.9rem;
            color: #1a1a2e;
            background: #ffffff;
            outline: none;
            transition: border-color 0.15s ease, box-shadow 0.15s ease;
          }

          .search-input::placeholder {
            color: #8b8698;
          }

          .search-input:focus {
            border-color: #c17817;
            box-shadow: 0 0 0 3px rgba(193, 120, 23, 0.15);
          }

          /* --- Placeholder report area, so you can see the float in action --- */
          .report-area {
            padding: 2rem 1.5rem;
            max-width: 900px;
          }

          .report-area p {
            color: #3f3755;
            line-height: 1.6;
          }
        </style>
      </head>
      <body>
        <div class="header-bar">
          <div class="header-titles">
            <h1>Zywave Prospect Intelligence!</h1>
            <h2>Your reason to call...</h2>
          </div>
          <div class="search-wrap">
            <input class="search-input" type="text" placeholder="Search accounts, contacts, or reports..." />
          </div>
        </div>

        <div class="report-area">
          <p>Report content will load here. Scroll to see the header stay fixed at the top.</p>
        </div>
      </body>
    </html>
  `)
})

app.get('/renewals', async (c) => {
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

  const parsedDaysToRenewal = parseDaysToRenewal(url.searchParams.get('days_to_renewal'))
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

  const queryResult = await db.prepare(sql).bind(state).all<RenewalRow>()
  if (queryResult.success === false) {
    return c.json({ error: queryResult.error ?? 'Failed to query renewals.' }, 500)
  }

  const today = todayUtc()
  const renewals = (queryResult.results ?? []).flatMap((row) => {
    const renewalDate = estimatedRenewalDate(row.INS_POLICY_TO_DATE, today)
    if (!renewalDate) return []

    const daysUntilRenewal = Math.ceil((renewalDate.getTime() - today.getTime()) / MS_PER_DAY)
    if (
      parsedDaysToRenewal.daysToRenewal !== undefined &&
      daysUntilRenewal > parsedDaysToRenewal.daysToRenewal
    ) {
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
      days_to_renewal: parsedDaysToRenewal.daysToRenewal ?? null,
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

export default app
