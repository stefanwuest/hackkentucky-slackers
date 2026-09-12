import { COVERAGE_TYPE_BY_VALUE, type CoverageType } from '../constants'
import type { CompanyRenewalSignalRow, D1DatabaseLike, RenewalRow } from '../types'
import { dbCoverageValuesForCoverageTypes } from '../utils/coverage'

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`
}

function scheduleColumn(column: string) {
  return `s.${quoteIdentifier(column)}`
}

export function bindAndQueryRenewalRows(db: D1DatabaseLike, state: string, coverageTypes: CoverageType[]) {
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

export function bindAndQueryCompanyRenewalSignalRows(db: D1DatabaseLike, state: string, coverageTypes: CoverageType[]) {
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
