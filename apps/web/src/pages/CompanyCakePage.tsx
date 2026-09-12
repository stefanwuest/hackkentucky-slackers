import { type CSSProperties, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'

import { createCakeConcept } from '../features/prospecting/cakeConcept'
import { readCakeCompany, storeCakeCompany } from '../features/prospecting/cakeCompanyStorage'
import { type Company } from '../features/prospecting/types'

type CompanyCakeRouteState = {
  company?: Company
}

type CopyButtonProps = {
  value: string
  label?: string
}

function decodeRouteId(value: string | undefined) {
  if (!value) return undefined

  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="cake-summary-item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function CopyButton({ value, label = 'Copy prompt' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <button className="cake-copy-button" type="button" onClick={() => void handleCopy()}>
      {copied ? 'Copied!' : label}
    </button>
  )
}

function MissingCompanyFallback() {
  return (
    <section className="cake-fallback-card">
      <span className="cake-eyebrow">No crumbs found</span>
      <h1>Pick a prospect to cake first.</h1>
      <p>
        The cake detail page needs a selected company from the prospect table. Head back to the homepage and use the
        Cake it action on any row.
      </p>
      <Link className="cake-primary-link" to="/">
        Back to Cake my prospect
      </Link>
    </section>
  )
}

function PromptCard({ title, prompt }: { title: string; prompt: string }) {
  return (
    <article className="prompt-card">
      <div className="prompt-card-header">
        <h3>{title}</h3>
        <CopyButton value={prompt} />
      </div>
      <p>{prompt}</p>
    </article>
  )
}

export function CompanyCakePage() {
  const { companyId: routeCompanyId } = useParams()
  const companyId = decodeRouteId(routeCompanyId)
  const location = useLocation()
  const routedCompany = (location.state as CompanyCakeRouteState | null)?.company

  const company = useMemo(() => {
    if (routedCompany?.company_id === companyId) return routedCompany
    return readCakeCompany(companyId)
  }, [companyId, routedCompany])

  useEffect(() => {
    if (company) storeCakeCompany(company)
  }, [company])

  const concept = useMemo(() => (company ? createCakeConcept(company) : null), [company])

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

          <section className="ai-prompts-section">
            <div className="ai-prompts-header">
              <span className="cake-eyebrow">Phase 2 ready</span>
              <h2>AI image prompts</h2>
              <p>These deterministic prompts can later be sent to a real image-generation endpoint behind this same UI.</p>
            </div>
            <div className="prompt-grid">
              <PromptCard title="Printable cake topper prompt" prompt={concept.designPrompt} />
              <PromptCard title="Cake mockup prompt" prompt={concept.mockupPrompt} />
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
