import { FormEvent, useMemo, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'

import { DataTable, SortableHeader } from '../components/ui/data-table'
import { API_BASE_URL, daysOperatorParams } from '../features/prospecting/constants'
import { formatCoverageType, formatCurrency, formatNumber } from '../features/prospecting/formatters'
import {
  RenewalFilterFields,
  SharedProspectingFilters,
  SubmitButton,
} from '../features/prospecting/ProspectingFilters'
import { type DaysOperator, type Renewal, type RenewalsResponse } from '../features/prospecting/types'

export function RenewalsPage() {
  const [state, setState] = useState('KY')
  const [coverageTypes, setCoverageTypes] = useState<string[]>([])
  const [daysOperator, setDaysOperator] = useState<DaysOperator>('lte')
  const [daysToRenewal, setDaysToRenewal] = useState('90')
  const [renewalData, setRenewalData] = useState<RenewalsResponse | null>(null)
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

  function buildParams() {
    const params = new URLSearchParams({ state: state.trim().toUpperCase() })
    coverageTypes.forEach((coverageType) => params.append('coverage_type', coverageType))
    if (daysToRenewal.trim()) params.set(daysOperatorParams[daysOperator], daysToRenewal.trim())
    return params
  }

  async function loadResults(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/renewals?${buildParams()}`)
      const payload = (await response.json()) as RenewalsResponse
      if (!response.ok) throw new Error(payload.error ?? 'Unable to load results.')
      setRenewalData(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load results.')
      setRenewalData(null)
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
        <SubmitButton isLoading={isLoading} />
      </form>

      {error && <div className="notice error">{error}</div>}

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
    </>
  )
}
