import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import useSWR from 'swr'

import { type CakeResponse, type CheckoutAddress, type CheckoutAddressResponse } from '../features/prospecting/types'
import { api, apiUrl } from '../lib/api'

type CakeQueryKey = readonly ['cake', string]
type CheckoutAddressQueryKey = readonly ['checkout-address', string]

const EMPTY_ADDRESS: CheckoutAddress = {
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'US',
}

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

export function CakeCheckoutPage() {
  const { cakeId: routeCakeId } = useParams()
  const cakeId = decodeRouteId(routeCakeId)
  const [address, setAddress] = useState<CheckoutAddress>(EMPTY_ADDRESS)
  const [isPlaced, setIsPlaced] = useState(false)

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

  useEffect(() => {
    if (checkoutAddress?.address) setAddress(checkoutAddress.address)
  }, [checkoutAddress?.address])

  function updateAddressField(field: keyof CheckoutAddress, value: string) {
    setAddress((currentAddress) => ({ ...currentAddress, [field]: value }))
  }

  const total = PRICE_ITEMS.reduce((sum, item) => sum + item.amount, 0)
  const cake = cakeResponse?.cake
  const company = cakeResponse?.company
  const recipient = checkoutAddress?.recipient ?? company?.name ?? company?.dba_name ?? ''
  const canPlaceOrder = Boolean(address.line1.trim() && address.city.trim() && address.state.trim() && address.postalCode.trim())
  const generatedImageSrc = cake?.has_image_blob
    ? apiUrl(`/api/cakes/${encodeURIComponent(cake.cake_id)}/image`, { v: cake.image_generated_at ?? cake.updated_at })
    : null

  if (!cakeId) {
    return (
      <section className="checkout-card checkout-card-narrow">
        <h1>Checkout</h1>
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
        <h1>Checkout</h1>
        <p>Loading…</p>
      </section>
    )
  }

  if (cakeError || !cake || !company) {
    return (
      <section className="checkout-card checkout-card-narrow">
        <h1>Checkout</h1>
        <p>{cakeError?.message ?? 'Cake not found.'}</p>
        <Link className="checkout-secondary-button" to="/">
          Back
        </Link>
      </section>
    )
  }

  return (
    <section className="checkout-card">
      <h1>Checkout</h1>

      {generatedImageSrc ? (
        <img className="checkout-cake-image" src={generatedImageSrc} alt="Cake" />
      ) : (
        <div className="checkout-cake-image checkout-cake-image-empty">Cake image</div>
      )}

      <label className="checkout-field">
        <span>Recipient</span>
        <input value={recipient} readOnly />
      </label>

      <div className="checkout-address-fields">
        <label className="checkout-field">
          <span>Address line 1</span>
          <input
            value={address.line1}
            placeholder={isAddressLoading ? 'Loading…' : 'Street address'}
            onChange={(event) => updateAddressField('line1', event.target.value)}
          />
        </label>

        <label className="checkout-field">
          <span>Address line 2</span>
          <input value={address.line2} placeholder="Apt, suite, etc. (optional)" onChange={(event) => updateAddressField('line2', event.target.value)} />
        </label>

        <label className="checkout-field">
          <span>City</span>
          <input value={address.city} onChange={(event) => updateAddressField('city', event.target.value)} />
        </label>

        <div className="checkout-address-row">
          <label className="checkout-field">
            <span>State</span>
            <input value={address.state} onChange={(event) => updateAddressField('state', event.target.value)} />
          </label>

          <label className="checkout-field">
            <span>ZIP</span>
            <input value={address.postalCode} onChange={(event) => updateAddressField('postalCode', event.target.value)} />
          </label>
        </div>
      </div>
      {addressError ? <p className="checkout-error">Could not load address. Enter it manually.</p> : null}

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

      <div className="checkout-actions">
        <Link className="checkout-secondary-button" to={`/cakes/${encodeURIComponent(cakeId)}`}>
          Back
        </Link>
        <button className="checkout-primary-button" type="button" disabled={!canPlaceOrder || isPlaced} onClick={() => setIsPlaced(true)}>
          {isPlaced ? 'Order placed' : 'Place order'}
        </button>
      </div>
    </section>
  )
}
