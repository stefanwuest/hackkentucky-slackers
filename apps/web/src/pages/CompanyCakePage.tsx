import { type CSSProperties, useEffect, useMemo } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import useSWR from 'swr'

import { createCakeConcept } from '../features/prospecting/cakeConcept'
import { readCakeCompany, storeCakeCompany } from '../features/prospecting/cakeCompanyStorage'
import { type Company, type CompanyResponse } from '../features/prospecting/types'
import { api } from '../lib/api'

type CompanyCakeRouteState = {
  company?: Company
}

function decodeRouteId(value: string | undefined) {
  if (!value) return undefined

  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

async function fetchCompanyByEin([, companyEin]: readonly ['company', string]) {
  const payload = await api.get<CompanyResponse>(`/api/company/${encodeURIComponent(companyEin)}`)
  return payload.company
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
          'The cake detail page needs a company EIN from the prospect table. Head back to the homepage and use the Cake it action on any row.'}
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
      <h1>Loading company details…</h1>
      <p>Fetching the latest company data for this EIN.</p>
    </section>
  )
}

export function CompanyCakePage() {
  const { companyEin: routeCompanyEin } = useParams()
  const companyEin = decodeRouteId(routeCompanyEin)
  const location = useLocation()
  const routedCompany = (location.state as CompanyCakeRouteState | null)?.company

  const cachedCompany = useMemo(() => {
    if (routedCompany?.sponsor_ein === companyEin) return routedCompany
    return readCakeCompany(companyEin)
  }, [companyEin, routedCompany])

  const {
    data: fetchedCompany,
    error,
    isLoading,
  } = useSWR<Company, Error, readonly ['company', string] | null>(
    companyEin ? ['company', companyEin] : null,
    fetchCompanyByEin,
    { fallbackData: cachedCompany ?? undefined },
  )

  const company = fetchedCompany ?? cachedCompany

  useEffect(() => {
    if (company) storeCakeCompany(company)
  }, [company])

  const concept = useMemo(() => (company ? createCakeConcept(company) : null), [company])

  if (!company && isLoading) return <LoadingCompanyFallback />
  if (!company && error) return <MissingCompanyFallback message={error.message} />
  if (!company || !concept) return <MissingCompanyFallback />

  return (
    <div className="cake-page">
      <header className="cake-detail-hero">
        <Link className="cake-back-link" to="/">
          ← Back to prospects
        </Link>
        <span className="cake-eyebrow">Cake my prospect</span>
        <h1>{concept.companyName}</h1>
        <p>{concept.hookMessage}</p>
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

            <div className="cake-hook-card">
              <span>Cake hook</span>
              <p>{concept.hookMessage}</p>
            </div>
          </div>
        </aside>

        <main className="cake-main" aria-label="Generated cake previews">
          <section className="cake-output-grid">
            <article className="cake-output-card">
              <div className="cake-output-header">
                <div>
                  <span className="cake-eyebrow">SVG fallback</span>
                  <h2>Printable cake design</h2>
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
                  <span className="cake-eyebrow">CSS mockup</span>
                  <h2>Cake mockup</h2>
                </div>
              </div>
              <div className="cake-mockup-scene" style={{ '--cake-primary': concept.palette.primary, '--cake-secondary': concept.palette.secondary, '--cake-accent': concept.palette.accent } as CSSProperties}>
                <div className="cake-plate" />
                <div className="cake-base">
                  <div className="cake-drip drip-one" />
                  <div className="cake-drip drip-two" />
                  <div className="cake-drip drip-three" />
                  <img src={concept.printableSvgDataUrl} alt={`Cake topper mockup for ${concept.companyName}`} />
                </div>
                <div className="cake-layer" />
                <div className="cake-sprinkles" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </article>
          </section>

          <section className="cake-action-section" aria-label="Cake actions">
            <button className="cake-action-button" type="button">
              Regenerate
            </button>
            <button className="cake-action-button cake-action-button-primary" type="button">
              Continue
            </button>
          </section>
        </main>
      </div>
    </div>
  )
}
