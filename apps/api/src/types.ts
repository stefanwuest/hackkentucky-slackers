import type { CoverageType } from './constants'

export type D1Result<T> = {
  results?: T[]
  success?: boolean
  error?: string
}

export type D1PreparedStatement = {
  bind: (...values: unknown[]) => {
    all: <T>() => Promise<D1Result<T>>
  }
}

export type D1DatabaseLike = {
  prepare: (query: string) => D1PreparedStatement
}

export type AppBindings = {
  DB?: D1DatabaseLike
  MY_DB?: D1DatabaseLike
}

export type RenewalRow = {
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

export type ScatteredRenewalGroup = {
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

export type CompanyRenewalSignalRow = {
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

export type CompanyDetailRow = Omit<CompanyRenewalSignalRow, 'contract_id' | 'plan_id'> & {
  contract_id: string | null
  plan_id: string | null
}
