import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import useSWR from 'swr'

import { createCakeConcept } from '../features/prospecting/cakeConcept'
import { storeCakeCompany } from '../features/prospecting/cakeCompanyStorage'
import { type CakeResponse } from '../features/prospecting/types'
import { api, apiUrl } from '../lib/api'

type CakeQueryKey = readonly ['cake', string]

function decodeRouteId(value: string | undefined) {
  if (!value) return undefined

  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

async function fetchCake([, cakeId]: CakeQueryKey) {
  return api.get<CakeResponse>(`/api/cakes/${encodeURIComponent(cakeId)}`)
}

function isCakeResponse(value: unknown): value is CakeResponse {
  return typeof value === 'object' && value !== null && 'cake' in value && 'company' in value
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="cake-summary-item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function MissingCompanyFallback({ message }: { message?: string }) {
  return (
    <section className="cake-fallback-card">
      <span className="cake-eyebrow">No crumbs found</span>
      <h1>Pick a prospect to cake first.</h1>
      <p>
        {message ??
          'The cake detail page needs a cake id from the prospect table. Head back to the homepage and use the Cake it action on any row.'}
      </p>
      <Link className="cake-primary-link" to="/">
        Back to Cake my prospect
      </Link>
    </section>
  )
}

function LoadingCompanyFallback() {
  return (
    <section className="cake-fallback-card">
      <span className="cake-eyebrow">Mixing batter</span>
      <h1>Loading cake details…</h1>
      <p>Fetching the saved cake message and latest company data.</p>
    </section>
  )
}

export function CompanyCakePage() {
  const { cakeId: routeCakeId } = useParams()
  const cakeId = decodeRouteId(routeCakeId)
  const location = useLocation()
  const routedCakeResponse = isCakeResponse(location.state) ? location.state : undefined
  const fallbackCakeResponse = routedCakeResponse?.cake.cake_id === cakeId ? routedCakeResponse : undefined
  const [isRegeneratingCakeMessage, setIsRegeneratingCakeMessage] = useState(false)
  const [regenerateError, setRegenerateError] = useState<string | null>(null)

  const {
    data: cakeResponse,
    error,
    isLoading,
    mutate,
  } = useSWR<CakeResponse, Error, CakeQueryKey | null>(cakeId ? ['cake', cakeId] : null, fetchCake, {
    fallbackData: fallbackCakeResponse,
    revalidateOnFocus: false,
  })

  const company = cakeResponse?.company
  const cake = cakeResponse?.cake

  useEffect(() => {
    if (company) storeCakeCompany(company)
  }, [company])

  async function handleRegenerateCakeMessage() {
    if (!cakeId || isRegeneratingCakeMessage) return

    setRegenerateError(null)
    setIsRegeneratingCakeMessage(true)

    try {
      const updatedCakeResponse = await api.put<CakeResponse>(`/api/cakes/${encodeURIComponent(cakeId)}`)
      storeCakeCompany(updatedCakeResponse.company)
      await mutate(updatedCakeResponse, { revalidate: false })
    } catch (error) {
      setRegenerateError(error instanceof Error ? error.message : 'Failed to regenerate cake message.')
    } finally {
      setIsRegeneratingCakeMessage(false)
    }
  }

  const concept = useMemo(() => (company && cake ? createCakeConcept(company, cake.message) : null), [cake, company])
  const generatedImageSrc = cake?.has_image_blob
    ? apiUrl(`/api/cakes/${encodeURIComponent(cake.cake_id)}/image`, { v: cake.image_generated_at ?? cake.updated_at })
    : null

  if (!cakeResponse && isLoading) return <LoadingCompanyFallback />
  if (!cakeResponse && error) return <MissingCompanyFallback message={error.message} />
  if (!company || !cake || !concept) return <MissingCompanyFallback />

  return (
    <div className="cake-page">
      <header className="cake-detail-hero">
        <Link className="cake-back-link" to="/">
          ← Back to prospects
        </Link>
        <span className="cake-eyebrow">Cake my prospect</span>
        <h1>{concept.companyName}</h1>
        <p>Review the printable cake design and mockup for this prospect.</p>
      </header>

      <div className="cake-detail-layout">
        <aside className="cake-sidebar" aria-label="Company cake summary">
          <div className="cake-sidebar-card">
            <div className="cake-initials-badge" style={{ background: concept.palette.primary, color: '#fff' }}>
              {concept.initials}
            </div>
            <h2>{concept.companyName}</h2>
            <p>{concept.summary.dbaOrEin}</p>

            <dl className="cake-summary-list">
              <SummaryItem label="Location" value={concept.summary.location} />
              <SummaryItem label="Renewal signal" value={concept.summary.signalLabel} />
              <SummaryItem label="Estimated renewal" value={concept.summary.estimatedRenewalDate} />
              <SummaryItem label="Days until renewal" value={concept.summary.daysUntilRenewal} />
              <SummaryItem label="Coverage types" value={concept.summary.coverageTypes} />
              <SummaryItem label="Covered lives" value={concept.summary.coveredLives} />
              <SummaryItem label="Total earned premium" value={concept.summary.totalEarnedPremium} />
              <SummaryItem label="Carriers" value={concept.summary.carrierNames} />
            </dl>
          </div>
        </aside>

        <main className="cake-main" aria-label="Generated cake previews">
          <section className="cake-output-grid">
            <article className="cake-output-card">
              <div className="cake-output-header">
                <div>
                  <span className="cake-eyebrow">SVG fallback</span>
                  <h2>Printable cake design</h2>
                  {isRegeneratingCakeMessage ? <p>Regenerating cake copy…</p> : null}
                  {regenerateError ? <p>{regenerateError}</p> : null}
                </div>
                <a className="cake-download-button" href={concept.printableSvgDataUrl} download={`${concept.initials.toLowerCase()}-cake-design.svg`}>
                  Download SVG
                </a>
              </div>
              <div className="printable-svg-preview" dangerouslySetInnerHTML={{ __html: concept.printableSvg }} />
            </article>

            <article className="cake-output-card cake-mockup-card">
              <div className="cake-output-header">
                <div>
                  <span className="cake-eyebrow">Generated image</span>
                  <h2>Cake mockup</h2>
                </div>
              </div>
              <div className="cake-generated-image-frame">
                {generatedImageSrc ? (
                  <img className="cake-generated-image" src={generatedImageSrc} alt={`Generated cake mockup for ${concept.companyName}`} />
                ) : (
                  <p>No generated cake image is available yet.</p>
                )}
              </div>
            </article>
          </section>

          <section className="cake-action-section" aria-label="Cake actions">
            <button className="cake-action-button" type="button" disabled={isRegeneratingCakeMessage} onClick={() => void handleRegenerateCakeMessage()}>
              {isRegeneratingCakeMessage ? 'Generating…' : 'Regenerate'}
            </button>
            <Link className="cake-action-button cake-action-button-primary" to={`/cakes/${encodeURIComponent(cake.cake_id)}/checkout`}>
              Continue
            </Link>
          </section>
        </main>
      </div>
    </div>
  )
}
