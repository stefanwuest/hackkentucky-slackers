import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import useSWR from 'swr'

import { CakeHeader } from '../components/CakeHeader'
import { getBusinessCardProfile } from '../features/profile/profileStorage'
import { createCakeConcept } from '../features/prospecting/cakeConcept'
import { storeCakeCompany } from '../features/prospecting/cakeCompanyStorage'
import { type CakeResponse } from '../features/prospecting/types'
import { api, apiUrl } from '../lib/api'

type CakeQueryKey = readonly ['cake', string]

const MAX_CAKE_MESSAGE_CHARACTERS = 110

const CAKE_COLOR_OPTIONS = [
  { name: 'Berry', background: '#be123c', ink: '#ffffff' },
  { name: 'Spice', background: '#c2410c', ink: '#ffffff' },
  { name: 'Mint', background: '#047857', ink: '#ffffff' },
  { name: 'Lavender', background: '#4f46e5', ink: '#ffffff' },
  { name: 'Rose', background: '#be185d', ink: '#ffffff' },
] as const

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
  const [isEditingCakeText, setIsEditingCakeText] = useState(false)
  const [cakeTextDraft, setCakeTextDraft] = useState('')
  const [isSavingCakeText, setIsSavingCakeText] = useState(false)
  const [cakeTextError, setCakeTextError] = useState<string | null>(null)
  const [selectedCakeColor, setSelectedCakeColor] = useState<string | null>(null)
  const cakeTextAreaRef = useRef<HTMLTextAreaElement | null>(null)

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

  useEffect(() => {
    if (!isEditingCakeText) setCakeTextDraft(cake?.message ?? '')
  }, [cake?.message, isEditingCakeText])

  useEffect(() => {
    if (!isEditingCakeText) return undefined

    const frameId = window.requestAnimationFrame(() => {
      cakeTextAreaRef.current?.focus()
      cakeTextAreaRef.current?.select()
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [isEditingCakeText])

  function normalizedCakeTextDraft() {
    return cakeTextDraft.trim().replace(/\s+/g, ' ')
  }

  function handleStartEditingCakeText() {
    setCakeTextDraft(cake?.message ?? '')
    setCakeTextError(null)
    setIsEditingCakeText(true)
  }

  function handleCancelEditingCakeText() {
    setCakeTextDraft(cake?.message ?? '')
    setSelectedCakeColor(null)
    setCakeTextError(null)
    setIsEditingCakeText(false)
  }

  async function handleSaveCakeText() {
    if (!cakeId || isSavingCakeText) return

    const message = normalizedCakeTextDraft()
    if (!message) {
      setCakeTextError('Cake text cannot be empty.')
      return
    }

    if (message.length > MAX_CAKE_MESSAGE_CHARACTERS) {
      setCakeTextError(`Cake text must be ${MAX_CAKE_MESSAGE_CHARACTERS} characters or fewer.`)
      return
    }

    const persistedCakeColor = cake?.cake_color ?? concept?.palette.secondary
    const hasCakeColorChanged = selectedCakeColor !== null && selectedCakeColor !== persistedCakeColor
    if (message === cake?.message && !hasCakeColorChanged) {
      setSelectedCakeColor(null)
      setIsEditingCakeText(false)
      setCakeTextError(null)
      return
    }

    setCakeTextError(null)
    setIsSavingCakeText(true)

    try {
      const updatedCakeResponse = await api.put<CakeResponse>(`/api/cakes/${encodeURIComponent(cakeId)}/message`, {
        message,
        cakeColor: selectedCakeColor ?? cake?.cake_color ?? concept?.palette.secondary,
        businessProfile: getBusinessCardProfile(),
      })
      storeCakeCompany(updatedCakeResponse.company)
      setCakeTextDraft(updatedCakeResponse.cake.message)
      setSelectedCakeColor(null)
      setIsEditingCakeText(false)
      await mutate(updatedCakeResponse, { revalidate: false })
    } catch (error) {
      setCakeTextError(error instanceof Error ? error.message : 'Failed to update cake text.')
    } finally {
      setIsSavingCakeText(false)
    }
  }

  async function handleRegenerateCakeMessage() {
    if (!cakeId || isRegeneratingCakeMessage || isSavingCakeText) return

    setRegenerateError(null)
    setCakeTextError(null)
    setIsRegeneratingCakeMessage(true)

    try {
      const updatedCakeResponse = await api.put<CakeResponse>(`/api/cakes/${encodeURIComponent(cakeId)}`, {
        businessProfile: getBusinessCardProfile(),
      })
      storeCakeCompany(updatedCakeResponse.company)
      setCakeTextDraft(updatedCakeResponse.cake.message)
      setSelectedCakeColor(null)
      setIsEditingCakeText(false)
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
  const normalizedDraft = normalizedCakeTextDraft()
  const isCakeTextDraftInvalid = !normalizedDraft || normalizedDraft.length > MAX_CAKE_MESSAGE_CHARACTERS
  const isCakeTextSaveDisabled = isCakeTextDraftInvalid || isSavingCakeText || isRegeneratingCakeMessage
  const activeCakeColor = selectedCakeColor ?? cake?.cake_color ?? concept?.palette.secondary
  const selectedCakeColorOption = CAKE_COLOR_OPTIONS.find((option) => option.background === activeCakeColor)
  const cakePreviewStyle = concept
    ? ({
        '--cake-preview-bg': activeCakeColor,
        '--cake-preview-ink': selectedCakeColorOption?.ink ?? concept.palette.ink,
      } as CSSProperties)
    : undefined

  if (!cakeResponse && isLoading) return <LoadingCompanyFallback />
  if (!cakeResponse && error) return <MissingCompanyFallback message={error.message} />
  if (!company || !cake || !concept) return <MissingCompanyFallback />

  return (
    <div className="cake-page">
      <CakeHeader showHomeLink />

      <div className="cake-detail-layout">
        <aside className="cake-sidebar" aria-label="Company cake summary">
          <div className="cake-sidebar-card">
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
                  <span className="cake-eyebrow">Cake text</span>
                  {isRegeneratingCakeMessage ? <p>Regenerating cake copy…</p> : null}
                  {isSavingCakeText ? <p>Updating cake text and image…</p> : null}
                  {regenerateError ? <p>{regenerateError}</p> : null}
                </div>
                <div className="cake-output-actions">
                  {isEditingCakeText ? (
                    <div className="cake-color-options" aria-label="Cake color options">
                      {CAKE_COLOR_OPTIONS.map((option) => (
                        <button
                          key={option.background}
                          className={`cake-color-option${activeCakeColor === option.background ? ' cake-color-option-selected' : ''}`}
                          type="button"
                          style={{ '--cake-color-option': option.background } as CSSProperties}
                          aria-label={`Use ${option.name} cake color`}
                          aria-pressed={activeCakeColor === option.background}
                          disabled={isSavingCakeText}
                          onClick={() => setSelectedCakeColor(option.background)}
                        />
                      ))}
                    </div>
                  ) : (
                    <button
                      className="cake-icon-button cake-secondary-button"
                      type="button"
                      aria-label="Edit cake text"
                      title="Edit cake text"
                      disabled={isSavingCakeText}
                      onClick={handleStartEditingCakeText}
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <form
                className="cake-text-edit-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  void handleSaveCakeText()
                }}
              >
                <div className="cake-text-edit-stage" style={cakePreviewStyle}>
                  <div className={`cake-html-preview${isEditingCakeText ? ' cake-preview-editing' : ''}`}>
                    <p>{concept.hookMessage}</p>
                  </div>
                  {isEditingCakeText ? (
                    <>
                      <label className="cake-text-editor-label" htmlFor="cake-text-editor">
                        Cake text
                      </label>
                      <textarea
                        id="cake-text-editor"
                        ref={cakeTextAreaRef}
                        className="cake-textarea-overlay"
                        value={cakeTextDraft}
                        maxLength={MAX_CAKE_MESSAGE_CHARACTERS}
                        disabled={isSavingCakeText}
                        onChange={(event) => setCakeTextDraft(event.target.value)}
                      />
                    </>
                  ) : null}
                </div>

                {isEditingCakeText ? (
                  <div className="cake-text-edit-footer">
                    <span>{cakeTextDraft.length}/{MAX_CAKE_MESSAGE_CHARACTERS}</span>
                    <div className="cake-text-edit-actions">
                      <button className="cake-download-button cake-secondary-button" type="button" disabled={isSavingCakeText} onClick={handleCancelEditingCakeText}>
                        Cancel
                      </button>
                      <button className="cake-download-button" type="submit" disabled={isCakeTextSaveDisabled}>
                        {isSavingCakeText ? 'Saving…' : 'Save text'}
                      </button>
                    </div>
                  </div>
                ) : null}
                {cakeTextError ? <p className="cake-text-edit-error">{cakeTextError}</p> : null}
              </form>
            </article>

            <article className="cake-output-card cake-mockup-card">
              <div className="cake-output-header">
                <div>
                  <span className="cake-eyebrow">Preview</span>
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
            <button className="cake-action-button" type="button" disabled={isRegeneratingCakeMessage || isSavingCakeText} onClick={() => void handleRegenerateCakeMessage()}>
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
