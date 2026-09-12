import { FormEvent, useMemo, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'

import { CoverageCombobox } from './components/ui/coverage-combobox'
import { DataTable, SortableHeader } from './components/ui/data-table'
import { Input } from './components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'

type Renewal = {
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

type RenewalsResponse = {
  count: number
  renewals: Renewal[]
  error?: string
}

type ScatteredContract = {
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

type ScatteredContractsResponse = {
  count: number
  scattered_renewals: ScatteredContract[]
  error?: string
}

type DashboardTab = 'renewals' | 'scattered'
type DaysOperator = 'lt' | 'lte' | 'gt' | 'gte'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const numberFormatter = new Intl.NumberFormat('en-US')
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

const stateOptions = [
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

const coverageOptions = [
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

const coverageFilterOptions = coverageOptions.filter((option) => option.value !== 'all')
const coverageLabels = Object.fromEntries(coverageOptions.map((option) => [option.value, option.label]))

const daysOperatorLabels: Record<DaysOperator, string> = {
  lt: 'Less than',
  lte: 'Less than or equal to',
  gt: 'Greater than',
  gte: 'Greater than or equal to',
}

const daysOperatorParams: Record<DaysOperator, string> = {
  lt: 'days_to_renewal_lt',
  lte: 'days_to_renewal_lte',
  gt: 'days_to_renewal_gt',
  gte: 'days_to_renewal_gte',
}

function formatCurrency(value: number | null) {
  return value == null ? 'Not reported' : currencyFormatter.format(value)
}

function formatNumber(value: number | null) {
  return value == null ? 'Not reported' : numberFormatter.format(value)
}

function formatCoverageType(value: string) {
  return coverageLabels[value] ?? value.replaceAll('_', ' ')
}

function formatList(values: Array<string | null | undefined>, fallback = 'Not reported') {
  const cleaned = values.filter((value): value is string => Boolean(value))
  if (!cleaned.length) return fallback
  return cleaned.slice(0, 3).join(', ') + (cleaned.length > 3 ? ` +${cleaned.length - 3}` : '')
}

function reasonLabel(reason: string) {
  return reason.replace('multiple_', 'Multiple ').replaceAll('_', ' ')
}

export default function App() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('renewals')
  const [state, setState] = useState('KY')
  const [coverageTypes, setCoverageTypes] = useState<string[]>([])
  const [daysOperator, setDaysOperator] = useState<DaysOperator>('lte')
  const [daysToRenewal, setDaysToRenewal] = useState('90')
  const [carrierCount, setCarrierCount] = useState('2')
  const [contractCount, setContractCount] = useState('')
  const [endMonthCount, setEndMonthCount] = useState('')
  const [renewalData, setRenewalData] = useState<RenewalsResponse | null>(null)
  const [scatteredData, setScatteredData] = useState<ScatteredContractsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const renewalColumns = useMemo<ColumnDef<Renewal>[]>(
    () => [
      {
        accessorKey: 'days_until_renewal',
        header: () => <SortableHeader label="Days" />,
        cell: ({ row }) => <span className="pill pill-amber">{row.original.days_until_renewal} days</span>,
      },
      {
        id: 'sponsor',
        accessorFn: (row) => row.sponsor.name ?? row.plan_name ?? 'Unnamed sponsor',
        header: () => <SortableHeader label="Sponsor" />,
        cell: ({ row, getValue }) => (
          <div className="table-primary-cell">
            <strong>{getValue<string>()}</strong>
            <span>
              {row.original.sponsor.city ?? 'Unknown city'}, {row.original.sponsor.state ?? '—'}
            </span>
          </div>
        ),
      },
      {
        id: 'carrier',
        accessorFn: (row) => row.carrier.name ?? 'Carrier not reported',
        header: () => <SortableHeader label="Carrier" />,
      },
      {
        id: 'coverage',
        accessorFn: (row) => row.coverage_types.map(formatCoverageType).join(', '),
        header: 'Coverage',
        cell: ({ row }) => (
          <div className="tag-row table-tags">
            {row.original.coverage_types.slice(0, 3).map((coverage) => (
              <span key={coverage}>{formatCoverageType(coverage)}</span>
            ))}
          </div>
        ),
      },
      {
        accessorKey: 'covered_lives_eoy',
        header: () => <SortableHeader label="Lives" />,
        cell: ({ row }) => formatNumber(row.original.covered_lives_eoy),
      },
      {
        accessorKey: 'total_earned_premium_amount',
        header: () => <SortableHeader label="Premium" />,
        cell: ({ row }) => formatCurrency(row.original.total_earned_premium_amount),
      },
      {
        accessorKey: 'estimated_renewal_date',
        header: () => <SortableHeader label="Renewal date" />,
      },
    ],
    [],
  )

  const scatteredColumns = useMemo<ColumnDef<ScatteredContract>[]>(
    () => [
      {
        id: 'sponsor',
        accessorFn: (row) => row.sponsor.name ?? 'Unnamed sponsor',
        header: () => <SortableHeader label="Sponsor" />,
        cell: ({ row, getValue }) => (
          <div className="table-primary-cell">
            <strong>{getValue<string>()}</strong>
            <span>
              {row.original.sponsor.city ?? 'Unknown city'}, {row.original.sponsor.state ?? '—'}
            </span>
          </div>
        ),
      },
      {
        id: 'coverage',
        accessorFn: (row) => formatCoverageType(row.coverage_type),
        header: () => <SortableHeader label="Coverage" />,
        cell: ({ getValue }) => <span className="pill pill-amber">{getValue<string>()}</span>,
      },
      {
        id: 'reasons',
        accessorFn: (row) => row.scatter_reasons.map(reasonLabel).join(', '),
        header: 'Scatter reasons',
        cell: ({ row }) => (
          <div className="tag-row table-tags">
            {row.original.scatter_reasons.map((reason) => (
              <span key={reason}>{reasonLabel(reason)}</span>
            ))}
          </div>
        ),
      },
      {
        accessorKey: 'carrier_count',
        header: () => <SortableHeader label="Carriers" />,
        cell: ({ row }) => (
          <div className="table-primary-cell compact">
            <strong>{row.original.carrier_count}</strong>
            <span>{formatList(row.original.carriers.map((carrier) => carrier.name))}</span>
          </div>
        ),
      },
      {
        accessorKey: 'contract_count',
        header: () => <SortableHeader label="Contracts" />,
        cell: ({ row }) => (
          <div className="table-primary-cell compact">
            <strong>{row.original.contract_count}</strong>
            <span>{formatList(row.original.contracts.map((contract) => contract.contract_number))}</span>
          </div>
        ),
      },
      {
        accessorKey: 'end_month_count',
        header: () => <SortableHeader label="End months" />,
        cell: ({ row }) => (
          <div className="table-primary-cell compact">
            <strong>{row.original.end_month_count}</strong>
            <span>{formatList(row.original.end_months.map((month) => month.label))}</span>
          </div>
        ),
      },
      {
        accessorKey: 'row_count',
        header: () => <SortableHeader label="Rows" />,
      },
    ],
    [],
  )

  function buildParams(tab: DashboardTab) {
    const params = new URLSearchParams({ state: state.trim().toUpperCase() })
    coverageTypes.forEach((coverageType) => params.append('coverage_type', coverageType))

    if (tab === 'renewals') {
      if (daysToRenewal.trim()) params.set(daysOperatorParams[daysOperator], daysToRenewal.trim())
    } else {
      if (carrierCount.trim()) params.set('carrier_count', carrierCount.trim())
      if (contractCount.trim()) params.set('contract_count', contractCount.trim())
      if (endMonthCount.trim()) params.set('end_month_count', endMonthCount.trim())
    }

    return params
  }

  async function loadResults(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    setIsLoading(true)
    setError(null)

    const endpoint = activeTab === 'renewals' ? '/api/renewals' : '/api/scattered-renewals'
    const params = buildParams(activeTab)

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}?${params}`)
      const payload = (await response.json()) as RenewalsResponse | ScatteredContractsResponse
      if (!response.ok) throw new Error(payload.error ?? 'Unable to load results.')

      if (activeTab === 'renewals') {
        setRenewalData(payload as RenewalsResponse)
      } else {
        setScatteredData(payload as ScatteredContractsResponse)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load results.')
      if (activeTab === 'renewals') setRenewalData(null)
      else setScatteredData(null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="app-shell">
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value as DashboardTab)
          setError(null)
        }}
      >
        <TabsList aria-label="Prospecting views">
          <TabsTrigger value="renewals">Renewals</TabsTrigger>
          <TabsTrigger value="scattered">Scattered contracts</TabsTrigger>
        </TabsList>

        <form className="table-filters" onSubmit={loadResults}>
          <label className="filter-field filter-field-state">
            State
            <Select value={state} onValueChange={setState}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                {stateOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.value} — {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="filter-field filter-field-coverage">
            Coverage
            <CoverageCombobox options={coverageFilterOptions} value={coverageTypes} onValueChange={setCoverageTypes} />
          </label>

          {activeTab === 'renewals' ? (
            <>
              <label className="filter-field">
                Days operator
                <Select value={daysOperator} onValueChange={(value) => setDaysOperator(value as DaysOperator)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(daysOperatorLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="filter-field">
                Days
                <Input
                  type="number"
                  min="0"
                  max="365"
                  value={daysToRenewal}
                  onChange={(event) => setDaysToRenewal(event.target.value)}
                />
              </label>
            </>
          ) : (
            <>
              <label className="filter-field">
                Min carriers
                <Input
                  type="number"
                  min="1"
                  value={carrierCount}
                  onChange={(event) => setCarrierCount(event.target.value)}
                />
              </label>
              <label className="filter-field">
                Min contracts
                <Input
                  type="number"
                  min="1"
                  value={contractCount}
                  placeholder="Any"
                  onChange={(event) => setContractCount(event.target.value)}
                />
              </label>
              <label className="filter-field">
                Min end months
                <Input
                  type="number"
                  min="1"
                  value={endMonthCount}
                  placeholder="Any"
                  onChange={(event) => setEndMonthCount(event.target.value)}
                />
              </label>
            </>
          )}

          <button
            type="submit"
            className="bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? 'Loading…' : 'Apply filters'}
          </button>
        </form>

        {error && <div className="notice error">{error}</div>}

        <TabsContent value="renewals">
          <section className="results-section">
            {renewalData ? (
              <DataTable
                columns={renewalColumns}
                data={renewalData.renewals}
                searchPlaceholder="Filter sponsors, carriers, coverages..."
                emptyMessage="No renewals match these filters."
                getRowId={(row) => row.ack_id}
              />
            ) : (
              !error && <div className="empty-state">Choose filters, then search for upcoming renewals.</div>
            )}
          </section>
        </TabsContent>

        <TabsContent value="scattered">
          <section className="results-section">
            {scatteredData ? (
              <DataTable
                columns={scatteredColumns}
                data={scatteredData.scattered_renewals}
                searchPlaceholder="Filter sponsors, carriers, contracts..."
                emptyMessage="No scattered contracts match these filters."
              />
            ) : (
              !error && <div className="empty-state">Find sponsors with multiple carriers, contracts, or end months.</div>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </main>
  )
}
