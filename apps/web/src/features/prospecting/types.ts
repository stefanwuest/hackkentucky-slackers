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
