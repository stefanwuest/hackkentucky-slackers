export type Renewal = {
  ack_id: string
  plan_name: string | null
  sponsor: {
    name: string | null
    city: string | null
    state: string | null
  }
  carrier: {
    name: string | null
  }
  coverage_types: string[]
  estimated_renewal_date: string
  days_until_renewal: number
  covered_lives_eoy: number | null
  total_earned_premium_amount: number | null
}

export type RenewalsResponse = {
  count: number
  renewals: Renewal[]
  error?: string
}

export type ScatteredContract = {
  sponsor: {
    name: string | null
    city: string | null
    state: string | null
  }
  coverage_type: string
  scatter_reasons: string[]
  carrier_count: number
  contract_count: number
  end_month_count: number
  row_count: number
  carriers: Array<{ name: string | null }>
  contracts: Array<{ contract_number: string | null; carrier_name: string | null }>
  end_months: Array<{ label: string; policy_to_dates: string[] }>
}

export type ScatteredContractsResponse = {
  count: number
  scattered_renewals: ScatteredContract[]
  error?: string
}

export type DaysOperator = 'lt' | 'lte' | 'gt' | 'gte'

export type CompanySignalType = 'upcoming_renewal'

export type CompanySignal = {
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
}

export type Company = {
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
  signals: CompanySignal[]
}

export type CompaniesResponse = {
  count: number
  total_count: number
  companies: Company[]
  error?: string
}

export type CompanyResponse = {
  company: Company
  error?: string
}
