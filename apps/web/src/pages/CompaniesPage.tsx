import { FormEvent, useMemo, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'

import { DataTable, SortableHeader } from '../components/ui/data-table'
import { Input } from '../components/ui/input'
import { API_BASE_URL, daysOperatorParams } from '../features/prospecting/constants'
import { formatCoverageType, formatCurrency, formatNumber } from '../features/prospecting/formatters'
import {
  RenewalFilterFields,
  SharedProspectingFilters,
  SubmitButton,
} from '../features/prospecting/ProspectingFilters'
import { type CompaniesResponse, type Company, type DaysOperator } from '../features/prospecting/types'

function primarySignal(company: Company) {
  return company.signals[0]
}

export function CompaniesPage() {
  const [state, setState] = useState('KY')
  const [coverageTypes, setCoverageTypes] = useState<string[]>([])
  const [daysOperator, setDaysOperator] = useState<DaysOperator>('lte')
  const [daysToRenewal, setDaysToRenewal] = useState('90')
  const [limit, setLimit] = useState('50')
  const [companyData, setCompanyData] = useState<CompaniesResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const companyColumns = useMemo<ColumnDef<Company>[]>(
    () => [
      {
        id: 'company',
        accessorFn: (row) => row.name ?? 'Unnamed company',
        header: () => <SortableHeader label="Company" />,
        cell: ({ row, getValue }) => (
          <div className="table-primary-cell">
            <strong>{getValue<string>()}</strong>
            <span>{row.original.dba_name ? `DBA ${row.original.dba_name}` : row.original.sponsor_ein ?? 'EIN not reported'}</span>
          </div>
        ),
      },
      {
        id: 'location',
        accessorFn: (row) => `${row.location.city ?? ''} ${row.location.state ?? ''} ${row.location.zip ?? ''}`,
        header: () => <SortableHeader label="Location" />,
        cell: ({ row }) => (
          <span>
            {row.original.location.city ?? 'Unknown city'}, {row.original.location.state ?? '—'}
          </span>
        ),
      },
      {
        id: 'signal',
        accessorFn: (row) => primarySignal(row)?.severity ?? '',
        header: () => <SortableHeader label="Signal" />,
        cell: ({ row }) => {
          const signal = primarySignal(row.original)
          if (!signal) return 'No signal'
          return <span className={`pill severity-${signal.severity}`}>{signal.label}</span>
        },
      },
      {
        id: 'renewal_date',
        accessorFn: (row) => primarySignal(row)?.properties.earliest_estimated_renewal_date ?? '',
        header: () => <SortableHeader label="Renewal date" />,
      },
      {
        id: 'days_until_renewal',
        accessorFn: (row) => primarySignal(row)?.properties.minimum_days_until_renewal ?? Number.MAX_SAFE_INTEGER,
        header: () => <SortableHeader label="Days" />,
        cell: ({ row }) => {
          const signal = primarySignal(row.original)
          return signal ? `${signal.properties.minimum_days_until_renewal} days` : '—'
        },
      },
      {
        id: 'coverage',
        accessorFn: (row) => primarySignal(row)?.properties.coverage_types.map(formatCoverageType).join(', ') ?? '',
        header: 'Coverage',
        cell: ({ row }) => {
          const coverages = primarySignal(row.original)?.properties.coverage_types ?? []
          return (
            <div className="tag-row table-tags">
              {coverages.slice(0, 3).map((coverage) => (
                <span key={coverage}>{formatCoverageType(coverage)}</span>
              ))}
              {coverages.length > 3 && <span>+{coverages.length - 3}</span>}
            </div>
          )
        },
      },
      {
        id: 'contracts',
        accessorFn: (row) => primarySignal(row)?.properties.renewal_contract_count ?? 0,
        header: () => <SortableHeader label="Contracts" />,
        cell: ({ row }) => {
          const signal = primarySignal(row.original)
          return signal ? formatNumber(signal.properties.renewal_contract_count) : '—'
        },
      },
      {
        id: 'lives_premium',
        accessorFn: (row) => row.metrics.total_covered_lives_eoy ?? 0,
        header: 'Lives / Premium',
        cell: ({ row }) => (
          <div className="table-primary-cell compact">
            <strong>{formatNumber(row.original.metrics.total_covered_lives_eoy)}</strong>
            <span>{formatCurrency(row.original.metrics.total_earned_premium)}</span>
          </div>
        ),
      },
    ],
    [],
  )

  function buildParams() {
    const params = new URLSearchParams({
      state: state.trim().toUpperCase(),
      signal: 'upcoming_renewal',
    })
    coverageTypes.forEach((coverageType) => params.append('coverage_type', coverageType))
    if (daysToRenewal.trim()) params.set(daysOperatorParams[daysOperator], daysToRenewal.trim())
    if (limit.trim()) params.set('limit', limit.trim())
    return params
  }

  async function loadResults(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/companies?${buildParams()}`)
      const payload = (await response.json()) as CompaniesResponse
      if (!response.ok) throw new Error(payload.error ?? 'Unable to load companies.')
      setCompanyData(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load companies.')
      setCompanyData(null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <form className="table-filters" onSubmit={loadResults}>
        <SharedProspectingFilters
          state={state}
          coverageTypes={coverageTypes}
          onStateChange={setState}
          onCoverageTypesChange={setCoverageTypes}
        />
        <RenewalFilterFields
          daysOperator={daysOperator}
          daysToRenewal={daysToRenewal}
          onDaysOperatorChange={setDaysOperator}
          onDaysToRenewalChange={setDaysToRenewal}
        />
        <label className="filter-field filter-field-limit">
          Limit
          <Input type="number" min="1" max="200" value={limit} onChange={(event) => setLimit(event.target.value)} />
        </label>
        <SubmitButton isLoading={isLoading} />
      </form>

      {error && <div className="notice error">{error}</div>}

      <section className="results-section">
        {companyData ? (
          <>
            <div className="notice">
              Showing {companyData.count} of {companyData.total_count} companies with upcoming renewal signals.
            </div>
            <DataTable
              columns={companyColumns}
              data={companyData.companies}
              searchPlaceholder="Filter companies, locations, carriers, coverages..."
              emptyMessage="No companies match these filters."
              getRowId={(row) => row.company_id}
            />
          </>
        ) : (
          !error && <div className="empty-state">Search for companies with broker-ready prospecting signals.</div>
        )}
      </section>
    </>
  )
}
