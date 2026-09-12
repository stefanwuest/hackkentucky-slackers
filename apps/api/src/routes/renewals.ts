import type { Hono } from 'hono'
import { ALLOWED_STATES, COVERAGE_TYPES, MS_PER_DAY } from '../constants'
import { bindAndQueryRenewalRows } from '../db/renewals'
import type { AppBindings } from '../types'
import { coverageTypesForRow, parseCoverageTypes } from '../utils/coverage'
import { estimatedRenewalDate, toIsoDate, todayUtc } from '../utils/dates'
import { matchesDaysToRenewalFilters, parseDaysToRenewalFilters } from '../utils/filters'
import { toNumberOrNull } from '../utils/numbers'

export function registerRenewalsRoute(app: Hono<{ Bindings: AppBindings }>) {
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
}
