import { useCallback, useMemo, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Link, useNavigate } from 'react-router-dom'
import useSWR from 'swr'

import { CakeHeader } from '../components/CakeHeader'
import { Combobox } from '../components/ui/combobox'
import { DataTable, SortableHeader } from '../components/ui/data-table'
import { Input } from '../components/ui/input'
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel } from '../components/ui/sidebar'
import { getBusinessCardProfile } from '../features/profile/profileStorage'
import { storeCakeCompany } from '../features/prospecting/cakeCompanyStorage'
import { stateOptions } from '../features/prospecting/constants'
import { formatCoverageType, formatCurrency, formatNumber } from '../features/prospecting/formatters'
import {
  defaultSelectedProspectSignalIds,
  prospectSignalDefinitionById,
  prospectSignalGroups,
  sortProspectSignalIdsByRegistry,
  type ProspectSignalCategoryId,
  type ProspectSignalDefinition,
  type ProspectSignalId,
} from '../features/prospecting/signals'
import { type CompaniesResponse, type Company, type CompanySignal } from '../features/prospecting/types'
import { api } from '../lib/api'

const DEFAULT_COMPANY_STATE = 'KY'
const COMPANY_RESULTS_LIMIT = '200'

function primarySignal(company: Company) {
  return company.signals[0]
}

function signalSortValue(signal: CompanySignal) {
  return signal.properties.minimum_days_until_renewal
}

function mergeCompanySignals(signals: CompanySignal[]) {
  return [...signals].sort((a, b) => signalSortValue(a) - signalSortValue(b))
}

function mergeCompanies(left: Company, right: Company): Company {
  return {
    ...left,
    signals: mergeCompanySignals([...left.signals, ...right.signals]),
  }
}

function addCompanyToMap(companyMap: Map<string, Company>, company: Company) {
  const existingCompany = companyMap.get(company.company_id)
  companyMap.set(company.company_id, existingCompany ? mergeCompanies(existingCompany, company) : company)
}

function groupSelectedSignals(signalIds: ProspectSignalId[]) {
  const groups = new Map<ProspectSignalCategoryId, ProspectSignalDefinition[]>()

  for (const signalId of signalIds) {
    const signal = prospectSignalDefinitionById[signalId]
    const existingSignals = groups.get(signal.categoryId) ?? []
    existingSignals.push(signal)
    groups.set(signal.categoryId, existingSignals)
  }

  return groups
}

function intersectCategoryCompanyMaps(categoryCompanyMaps: Array<Map<string, Company>>) {
  if (categoryCompanyMaps.length === 0) return []

  const [smallestMap, ...otherMaps] = [...categoryCompanyMaps].sort((a, b) => a.size - b.size)
  const companies: Company[] = []

  for (const [companyId, company] of smallestMap) {
    if (!otherMaps.every((companyMap) => companyMap.has(companyId))) continue

    const mergedCompany = otherMaps.reduce((currentCompany, companyMap) => {
      const matchingCompany = companyMap.get(companyId)
      return matchingCompany ? mergeCompanies(currentCompany, matchingCompany) : currentCompany
    }, company)

    companies.push(mergedCompany)
  }

  return companies.sort((a, b) => {
    const aDays = primarySignal(a)?.properties.minimum_days_until_renewal ?? Number.MAX_SAFE_INTEGER
    const bDays = primarySignal(b)?.properties.minimum_days_until_renewal ?? Number.MAX_SAFE_INTEGER
    if (aDays !== bDays) return aDays - bDays
    return (a.name ?? '').localeCompare(b.name ?? '')
  })
}

type CompaniesQueryKey = readonly ['companies', string, readonly ProspectSignalId[]]

async function fetchSignalCompanies(signal: ProspectSignalDefinition, state: string) {
  const params = new URLSearchParams({
    state,
    signal: 'upcoming_renewal',
    limit: COMPANY_RESULTS_LIMIT,
  })

  Object.entries(signal.companyApiQuery).forEach(([name, value]) => params.set(name, value))

  const payload = await api.get<CompaniesResponse>('/api/companies', { searchParams: params })
  return payload.companies
}

async function fetchSelectedCompanies([, state, signalIds]: CompaniesQueryKey): Promise<CompaniesResponse> {
  const selectedSignalsByCategory = groupSelectedSignals([...signalIds])
  const categoryCompanyMaps = await Promise.all(
    [...selectedSignalsByCategory.values()].map(async (signals) => {
      const companyResults = await Promise.all(signals.map((signal) => fetchSignalCompanies(signal, state)))
      const companyMap = new Map<string, Company>()
      companyResults.flat().forEach((company) => addCompanyToMap(companyMap, company))
      return companyMap
    }),
  )

  const companies = intersectCategoryCompanyMaps(categoryCompanyMaps)
  return { count: companies.length, total_count: companies.length, companies }
}

export function CompaniesPage() {
  const navigate = useNavigate()
  const [selectedState, setSelectedState] = useState(DEFAULT_COMPANY_STATE)
  const [selectedSignalIds, setSelectedSignalIds] = useState<ProspectSignalId[]>(defaultSelectedProspectSignalIds)
  const [tableSearch, setTableSearch] = useState('')
  const handleSelectProspect = useCallback(
    (company: Company) => {
      const sponsorEin = company.sponsor_ein
      if (!sponsorEin) return

      storeCakeCompany(company)
      navigate(`/prospect/${encodeURIComponent(sponsorEin)}`, { state: { company } })
    },
    [navigate],
  )

  const companiesQueryKey = useMemo<CompaniesQueryKey | null>(
    () => (selectedSignalIds.length > 0 ? ['companies', selectedState, selectedSignalIds] : null),
    [selectedSignalIds, selectedState],
  )
  const {
    data: companyData,
    error,
    isLoading,
  } = useSWR<CompaniesResponse, Error, CompaniesQueryKey | null>(companiesQueryKey, fetchSelectedCompanies)

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
      {
        id: 'cake_action',
        header: 'Outreach',
        enableSorting: false,
        cell: ({ row }) => (
          <button
            className="cake-it-button"
            type="button"
            disabled={!row.original.sponsor_ein}
            onClick={() => handleSelectProspect(row.original)}
          >
            {row.original.sponsor_ein ? "Close 'em" : 'No EIN'}
          </button>
        ),
      },
    ],
    [handleSelectProspect],
  )

  function handleSignalToggle(signalId: ProspectSignalId, checked: boolean) {
    setSelectedSignalIds((previousSignalIds) => {
      const nextSignalIds = new Set(previousSignalIds)
      if (checked) nextSignalIds.add(signalId)
      else nextSignalIds.delete(signalId)
      return sortProspectSignalIdsByRegistry(nextSignalIds)
    })
  }

  const selectedSignalCount = selectedSignalIds.length
  const businessCardProfile = getBusinessCardProfile()

  return (
    <div className="cake-home-page">
      <CakeHeader />

      <div className="faceted-page">
        <Sidebar className="signals-sidebar" aria-label="Company signal filters">
          <SidebarContent>
            <Input
              aria-label="Filter companies"
              value={tableSearch}
              onChange={(event) => setTableSearch(event.target.value)}
              placeholder="Search companies..."
              className="sidebar-search"
            />

            <label className="filter-field filter-field-state">
              State
              <Combobox
                options={stateOptions.map((option) => ({
                  value: option.value,
                  label: `${option.value} — ${option.label}`,
                }))}
                value={selectedState}
                onValueChange={setSelectedState}
                placeholder="Select state"
                searchPlaceholder="Search states..."
                emptyMessage="No state found."
              />
            </label>

          {prospectSignalGroups.map((group) => (
            <SidebarGroup key={group.id}>
              <SidebarGroupLabel>
                <strong>{group.label}</strong>
              </SidebarGroupLabel>
              <div className="facet-list">
                {group.signals.map((signal) => {
                  const checked = selectedSignalIds.includes(signal.id)

                  return (
                    <label className="facet-option" key={signal.id}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => handleSignalToggle(signal.id, event.target.checked)}
                      />
                      <span className="facet-option-label">{signal.label}</span>
                    </label>
                  )
                })}
              </div>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="signals-sidebar-footer">
          <button
            className="clear-filters-button"
            type="button"
            disabled={selectedSignalCount === 0}
            onClick={() => setSelectedSignalIds([])}
          >
            Clear all filters
          </button>

          {businessCardProfile ? (
            <Link className="sidebar-profile-card" to="/profile" aria-label="Edit business card profile">
              <div>
                <strong>{businessCardProfile.name}</strong>
                <p>{businessCardProfile.company}</p>
              </div>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          ) : null}
        </SidebarFooter>
      </Sidebar>

      <div className="faceted-main">
        {error && <div className="notice error">{error.message}</div>}

        <section className="results-section">
          {selectedSignalCount === 0 ? (
            <div className="empty-state">Select at least one signal to find matching companies.</div>
          ) : companyData ? (
            <DataTable
              className="companies-table"
              columns={companyColumns}
              data={companyData.companies}
              searchPlaceholder="Filter companies, locations, carriers, coverages..."
              searchValue={tableSearch}
              onSearchValueChange={setTableSearch}
              hideSearch
              emptyMessage="No companies match these signals."
              getRowId={(row) => row.company_id}
            />
          ) : (
            isLoading && <div className="empty-state">Loading companies for the selected signals.</div>
          )}
          </section>
        </div>
      </div>
    </div>
  )
}
