import { Link, useParams } from 'react-router-dom'
import useSWR from 'swr'

import { type CakeResponse, type CheckoutAddress, type CheckoutAddressResponse } from '../features/prospecting/types'
import { api, apiUrl } from '../lib/api'

type CakeQueryKey = readonly ['cake', string]
type CheckoutAddressQueryKey = readonly ['checkout-address', string]

const PRICE_ITEMS = [
  { label: 'Cake', amount: 4800 },
  { label: 'Shipping', amount: 1200 },
  { label: 'Service fee', amount: 500 },
]

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

async function fetchCheckoutAddress([, cakeId]: CheckoutAddressQueryKey) {
  return api.get<CheckoutAddressResponse>(`/api/cakes/${encodeURIComponent(cakeId)}/checkout-address`)
}

function formatUsd(cents: number) {
  return new Intl.NumberFormat('en-US', { currency: 'USD', style: 'currency' }).format(cents / 100)
}

function formatAddress(address: CheckoutAddress) {
  const line2 = address.line2.trim()
  return [
    address.line1,
    line2 ? line2 : null,
    `${address.city}, ${address.state} ${address.postalCode}`,
    address.country,
  ].filter(Boolean)
}

export function CakeReceiptPage() {
  const { cakeId: routeCakeId } = useParams()
  const cakeId = decodeRouteId(routeCakeId)

  const {
    data: cakeResponse,
    error: cakeError,
    isLoading: isCakeLoading,
  } = useSWR<CakeResponse, Error, CakeQueryKey | null>(cakeId ? ['cake', cakeId] : null, fetchCake, {
    revalidateOnFocus: false,
  })

  const {
    data: checkoutAddress,
    error: addressError,
    isLoading: isAddressLoading,
  } = useSWR<CheckoutAddressResponse, Error, CheckoutAddressQueryKey | null>(cakeId ? ['checkout-address', cakeId] : null, fetchCheckoutAddress, {
    revalidateOnFocus: false,
  })

  const total = PRICE_ITEMS.reduce((sum, item) => sum + item.amount, 0)
  const cake = cakeResponse?.cake
  const company = cakeResponse?.company
  const recipient = checkoutAddress?.recipient ?? company?.name ?? company?.dba_name ?? ''
  const address = checkoutAddress?.address ?? null
  const generatedImageSrc = cake?.has_image_blob
    ? apiUrl(`/api/cakes/${encodeURIComponent(cake.cake_id)}/image`, { v: cake.image_generated_at ?? cake.updated_at })
    : null
  const handlePrint = () => window.print()

  if (!cakeId) {
    return (
      <section className="checkout-card checkout-card-narrow">
        <h1>Receipt</h1>
        <p>Missing cake id.</p>
        <Link className="checkout-secondary-button" to="/">
          Back
        </Link>
      </section>
    )
  }

  if (isCakeLoading) {
    return (
      <section className="checkout-card checkout-card-narrow">
        <h1>Receipt</h1>
        <p>Loading…</p>
      </section>
    )
  }

  if (cakeError || !cake || !company) {
    return (
      <section className="checkout-card checkout-card-narrow">
        <h1>Receipt</h1>
        <p>{cakeError?.message ?? 'Cake not found.'}</p>
        <Link className="checkout-secondary-button" to="/">
          Back
        </Link>
      </section>
    )
  }

  return (
    <div className="checkout-receipt-page">
      <section className="checkout-card checkout-receipt-card">
        <h1>Receipt</h1>

        {generatedImageSrc ? (
          <img className="checkout-cake-image checkout-receipt-image" src={generatedImageSrc} alt="Cake" />
        ) : (
          <div className="checkout-cake-image checkout-cake-image-empty checkout-receipt-image">Cake image</div>
        )}

        <div className="checkout-success-message" aria-live="polite">
          <svg className="checkout-success-check" viewBox="0 0 96 96" aria-hidden="true" focusable="false">
            <circle cx="48" cy="48" r="42" fill="currentColor" opacity="0.12" />
            <path
              d="M30 49.5 42.2 61.7 67 35.8"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="8"
            />
          </svg>
          <p className="checkout-thank-you">Thank you for your order! Hope this deal takes the cake 🎂</p>
        </div>

        <div className="checkout-receipt-details">
          <div className="checkout-receipt-row">
            <span className="checkout-receipt-label">Recipient: </span>
            <span className="checkout-receipt-value">{recipient || '—'}</span>
          </div>

          <div className="checkout-receipt-row">
            <span className="checkout-receipt-label">Address: </span>
            <span className="checkout-receipt-value">
              {isAddressLoading ? 'Loading…' : address ? formatAddress(address).join(', ') : '—'}
            </span>
          </div>
        </div>
        {addressError ? <p className="checkout-error">Could not load address.</p> : null}

        <div className="checkout-price-list" aria-label="Price summary">
          {PRICE_ITEMS.map((item) => (
            <div className="checkout-price-row" key={item.label}>
              <span>{item.label}</span>
              <strong>{formatUsd(item.amount)}</strong>
            </div>
          ))}
          <div className="checkout-price-row checkout-price-total">
            <span>Total</span>
            <strong>{formatUsd(total)}</strong>
          </div>
        </div>
      </section>

      <div className="checkout-receipt-actions">
        <Link className="checkout-secondary-button checkout-receipt-more-link" to={`/`}>
          Find more prospects…
        </Link>
        <button className="checkout-primary-button checkout-receipt-print-button" type="button" onClick={handlePrint}>
          Print
        </button>
      </div>
    </div>
  )
}
