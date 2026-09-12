import { type DaysOperator } from './types'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export const stateOptions = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'DC', label: 'District of Columbia' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
]

export const coverageOptions = [
  { value: 'all', label: 'All coverages' },
  { value: 'health', label: 'Health' },
  { value: 'dental', label: 'Dental' },
  { value: 'vision', label: 'Vision' },
  { value: 'life_insurance', label: 'Life insurance' },
  { value: 'short_term_disability', label: 'Short-term disability' },
  { value: 'long_term_disability', label: 'Long-term disability' },
  { value: 'unemployment', label: 'Unemployment' },
  { value: 'prescription_drug', label: 'Prescription drug' },
  { value: 'stop_loss', label: 'Stop loss' },
  { value: 'hmo', label: 'HMO' },
  { value: 'ppo', label: 'PPO' },
  { value: 'indemnity', label: 'Indemnity' },
  { value: 'other', label: 'Other' },
]

export const coverageFilterOptions = coverageOptions.filter((option) => option.value !== 'all')
export const coverageLabels = Object.fromEntries(coverageOptions.map((option) => [option.value, option.label]))

export const daysOperatorLabels: Record<DaysOperator, string> = {
  lt: 'Less than',
  lte: 'Less than or equal to',
  gt: 'Greater than',
  gte: 'Greater than or equal to',
}

export const daysOperatorParams: Record<DaysOperator, string> = {
  lt: 'days_to_renewal_lt',
  lte: 'days_to_renewal_lte',
  gt: 'days_to_renewal_gt',
  gte: 'days_to_renewal_gte',
}
