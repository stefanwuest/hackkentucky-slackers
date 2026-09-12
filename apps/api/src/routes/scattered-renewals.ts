import type { Hono } from 'hono'
import { ALLOWED_STATES, COVERAGE_TYPES } from '../constants'
import { bindAndQueryRenewalRows } from '../db/renewals'
import type { AppBindings, ScatteredRenewalGroup } from '../types'
import { coverageTypesForRow, parseCoverageTypes } from '../utils/coverage'
import { monthLabel, policyEndDateParts } from '../utils/dates'
import { parseMinimumCount } from '../utils/filters'
import { toNumberOrNull } from '../utils/numbers'
import { distinctCarrierKey, distinctContractKey, sponsorKey } from '../utils/renewal-rows'

export function registerScatteredRenewalsRoute(app: Hono<{ Bindings: AppBindings }>) {
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
}
