import { FormEvent, useMemo, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'

import { DataTable, SortableHeader } from '../components/ui/data-table'
import { API_BASE_URL } from '../features/prospecting/constants'
import { formatCoverageType, formatList, reasonLabel } from '../features/prospecting/formatters'
import {
  ScatteredContractFilterFields,
  SharedProspectingFilters,
  SubmitButton,
} from '../features/prospecting/ProspectingFilters'
import {
  type ScatteredContract,
  type ScatteredContractsResponse,
} from '../features/prospecting/types'

export function ScatteredContractsPage() {
  const [state, setState] = useState('KY')
  const [coverageTypes, setCoverageTypes] = useState<string[]>([])
  const [carrierCount, setCarrierCount] = useState('2')
  const [contractCount, setContractCount] = useState('')
  const [endMonthCount, setEndMonthCount] = useState('')
  const [scatteredData, setScatteredData] = useState<ScatteredContractsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  function buildParams() {
    const params = new URLSearchParams({ state: state.trim().toUpperCase() })
    coverageTypes.forEach((coverageType) => params.append('coverage_type', coverageType))
    if (carrierCount.trim()) params.set('carrier_count', carrierCount.trim())
    if (contractCount.trim()) params.set('contract_count', contractCount.trim())
    if (endMonthCount.trim()) params.set('end_month_count', endMonthCount.trim())
    return params
  }

  async function loadResults(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/scattered-renewals?${buildParams()}`)
      const payload = (await response.json()) as ScatteredContractsResponse
      if (!response.ok) throw new Error(payload.error ?? 'Unable to load results.')
      setScatteredData(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load results.')
      setScatteredData(null)
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
        <ScatteredContractFilterFields
          carrierCount={carrierCount}
          contractCount={contractCount}
          endMonthCount={endMonthCount}
          onCarrierCountChange={setCarrierCount}
          onContractCountChange={setContractCount}
          onEndMonthCountChange={setEndMonthCount}
        />
        <SubmitButton isLoading={isLoading} />
      </form>

      {error && <div className="notice error">{error}</div>}

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
    </>
  )
}
