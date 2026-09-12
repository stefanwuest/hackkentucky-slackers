import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'

import { CakeHeader } from '../components/CakeHeader'
import { getBusinessCardProfile } from '../features/profile/profileStorage'
import { readCakeCompany, storeCakeCompany } from '../features/prospecting/cakeCompanyStorage'
import { formatCoverageType } from '../features/prospecting/formatters'
import { marketingMethods, type MarketingMethod } from '../features/prospecting/marketingMethods'
import { type CakeResponse, type Company } from '../features/prospecting/types'
import { api } from '../lib/api'

type ProspectLocationState = {
  company?: Company
}

const SUGGESTION_LOADING_STAGES = [
  'Gathering company data...',
  'Analyzing signals...',
  'Querying marketing repository...',
  'Tailoring suggestions...',
]
const SUGGESTION_LOADING_STAGE_DURATION_MS = 1500

function decodeRouteId(value: string | undefined) {
  if (!value) return undefined

  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function isProspectLocationState(value: unknown): value is ProspectLocationState {
  return typeof value === 'object' && value !== null && 'company' in value
}

function companyFromState(value: unknown, sponsorEin?: string) {
  if (!isProspectLocationState(value)) return null
  const company = value.company
  if (!company || company.sponsor_ein !== sponsorEin) return null
  return company
}

function MethodImage({ method }: { method: MarketingMethod }) {
  return (
    <span className="prospect-method-image-placeholder" data-has-image={method.imageSrc ? 'true' : 'false'} aria-hidden="true">
      {method.imageSrc ? <img src={method.imageSrc} alt="" /> : <span>{method.shortLabel}</span>}
    </span>
  )
}

function ProspectFallback() {
  return (
    <div className="prospect-methods-page">
      <CakeHeader showHomeLink />
      <section className="cake-fallback-card">
        <span className="cake-eyebrow">Prospect missing</span>
        <h1>Pick a prospect first.</h1>
        <p>This suggestion page is intentionally request-free, so it needs the company selected from the prospect table.</p>
        <Link className="cake-primary-link" to="/">
          Back to prospects
        </Link>
      </section>
    </div>
  )
}

export function ProspectMethodsPage() {
  const { prospectId: routeProspectId } = useParams()
  const prospectId = decodeRouteId(routeProspectId)
  const location = useLocation()
  const navigate = useNavigate()
  const [isCreatingCake, setIsCreatingCake] = useState(false)
  const [cakeCreationError, setCakeCreationError] = useState<string | null>(null)
  const [isPreparingSuggestions, setIsPreparingSuggestions] = useState(true)
  const [loadingStageIndex, setLoadingStageIndex] = useState(0)

  const company = useMemo(
    () => companyFromState(location.state, prospectId) ?? readCakeCompany(prospectId),
    [location.state, prospectId],
  )

  useEffect(() => {
    if (!prospectId || !company) return undefined

    setIsPreparingSuggestions(true)
    setLoadingStageIndex(0)

    const stageTimers = SUGGESTION_LOADING_STAGES.slice(1).map((_, index) =>
      window.setTimeout(() => setLoadingStageIndex(index + 1), SUGGESTION_LOADING_STAGE_DURATION_MS * (index + 1)),
    )
    const completionTimer = window.setTimeout(
      () => setIsPreparingSuggestions(false),
      SUGGESTION_LOADING_STAGE_DURATION_MS * SUGGESTION_LOADING_STAGES.length,
    )

    return () => {
      stageTimers.forEach((timer) => window.clearTimeout(timer))
      window.clearTimeout(completionTimer)
    }
  }, [company, prospectId])

  if (!prospectId || !company) return <ProspectFallback />

  const companyName = company.name ?? company.dba_name ?? 'Selected prospect'
  const primarySignal = company.signals[0]
  const activeMethod = marketingMethods.find((method) => method.status === 'available')
  const coverageTypes = primarySignal?.properties.coverage_types ?? []
  const prospectContextItems = [
    [company.location.city, company.location.state].filter(Boolean).join(', '),
    primarySignal?.label,
    coverageTypes.length > 0 ? coverageTypes.slice(0, 2).map(formatCoverageType).join(' + ') : null,
  ].filter((item): item is string => Boolean(item))
  const profile = getBusinessCardProfile()

  async function handleCreateCake() {
    if (!activeMethod || !company?.sponsor_ein || isCreatingCake) return
    if (!profile) {
      setCakeCreationError('Add your sender profile before creating a cake.')
      return
    }

    setCakeCreationError(null)
    setIsCreatingCake(true)

    try {
      const response = await api.post<CakeResponse>(`/api/company/${encodeURIComponent(company.sponsor_ein)}/cakes`, {
        businessProfile: profile,
      })
      storeCakeCompany(response.company)
      navigate(`/cakes/${encodeURIComponent(response.cake.cake_id)}`, { state: response })
    } catch (error) {
      setCakeCreationError(error instanceof Error ? error.message : 'Failed to create cake.')
    } finally {
      setIsCreatingCake(false)
    }
  }

  return (
    <div className="prospect-methods-page">
      <CakeHeader showHomeLink />

      <main className="prospect-methods-board" aria-label={`Marketing suggestions for ${companyName}`}>
        <div className="prospect-board-background" aria-hidden="true" />

        <section className="prospect-board-intro">
          <p>Tailored outreach suggestions for</p>
          <h1>{companyName}</h1>
          <div className="prospect-context-row" aria-label="Prospect context">
            {prospectContextItems.join(' • ')}
          </div>
        </section>

        {isPreparingSuggestions ? (
          <section className="prospect-loading-card" aria-live="polite" aria-label="Preparing marketing suggestions">
            <div className="prospect-loading-placeholder" aria-hidden="true" />
            <div className="prospect-loading-copy">
              <strong>{SUGGESTION_LOADING_STAGES[loadingStageIndex]}</strong>
              <span>Building a short list of outreach plays for this prospect.</span>
            </div>
            <div className="prospect-loading-progress" aria-hidden="true">
              {SUGGESTION_LOADING_STAGES.map((stage, index) => (
                <span key={stage} data-active={index <= loadingStageIndex ? 'true' : 'false'} />
              ))}
            </div>
          </section>
        ) : (
          <section className="prospect-method-list" aria-label="Marketing methods">
            {marketingMethods.map((method) => {
              const isAvailable = method.status === 'available'

              return (
                <button
                  key={method.id}
                  className="prospect-method-card"
                  type="button"
                  data-active={isAvailable ? 'true' : 'false'}
                  disabled={!isAvailable || isCreatingCake}
                  onClick={() => void handleCreateCake()}
                >
                  <MethodImage method={method} />
                  <span className="prospect-method-copy">
                    <span className="prospect-method-title-row">
                      <strong>{method.title}</strong>
                      {!isAvailable ? <span className="prospect-coming-soon">Coming soon</span> : null}
                    </span>
                    <span>{method.howItWorks}</span>
                  </span>
                  {isAvailable && isCreatingCake ? (
                    <span className="prospect-method-action" role="status" aria-label="Creating cake">
                      <svg className="prospect-method-spinner" viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
                        <path d="M21 12a9 9 0 0 1-9 9" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
                      </svg>
                    </span>
                  ) : (
                    <span className="prospect-method-proof" aria-label={`${method.proofMetric} ${method.proofReason}`}>
                      <span className="prospect-method-proof-metric">{method.proofMetric}</span>
                      <span className="prospect-method-proof-reason">{method.proofReason}</span>
                    </span>
                  )}
                </button>
              )
            })}
          </section>
        )}

        {cakeCreationError ? (
          <div className="prospect-method-error" role="alert">
            {cakeCreationError}
            {!profile ? (
              <Link to="/profile">Complete profile</Link>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  )
}
