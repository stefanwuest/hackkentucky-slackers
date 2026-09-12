import type { CoverageType } from './constants'

export const CAKE_SIZES = ['6in', '8in', '10in', '12in', 'half_sheet', 'sheet'] as const
export const CAKE_SHAPES = ['round', 'square'] as const
export const CAKE_COLORS = ['#be123c', '#c2410c', '#047857', '#4f46e5', '#be185d'] as const

export type CakeSize = (typeof CAKE_SIZES)[number]
export type CakeShape = (typeof CAKE_SHAPES)[number]
export type CakeColor = (typeof CAKE_COLORS)[number]

export function isCakeColor(value: string): value is CakeColor {
  return (CAKE_COLORS as readonly string[]).includes(value)
}

export type D1Result<T> = {
  results?: T[]
  success?: boolean
  error?: string
}

export type D1RunResult = {
  success?: boolean
  error?: string
}

export type D1BoundStatement = {
  all: <T>() => Promise<D1Result<T>>
  first: <T>() => Promise<T | null>
  run: () => Promise<D1RunResult>
}

export type D1PreparedStatement = {
  bind: (...values: unknown[]) => D1BoundStatement
}

export type D1DatabaseLike = {
  prepare: (query: string) => D1PreparedStatement
}

export type AppBindings = {
  DB?: D1DatabaseLike
  MY_DB?: D1DatabaseLike
  OPENROUTER_API_KEY?: string
  OPENROUTER_APP_TITLE?: string
  OPENROUTER_HTTP_REFERER?: string
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

export type CakeRow = {
  cake_id: string
  sponsor_ein: string
  company_id: string | null
  message: string
  cake_size: CakeSize
  cake_shape: CakeShape
  cake_color: CakeColor | null
  image_mime_type: string | null
  image_filename: string | null
  image_generated_at: string | null
  image_blob_present: string | number | boolean | null
  created_at: string
  updated_at: string
}

export type CakeRecord = {
  cake_id: string
  sponsor_ein: string
  company_id: string | null
  message: string
  cake_size: CakeSize
  cake_shape: CakeShape
  cake_color: CakeColor | null
  image_mime_type: string | null
  image_filename: string | null
  image_generated_at: string | null
  has_image_blob: boolean
  created_at: string
  updated_at: string
}
