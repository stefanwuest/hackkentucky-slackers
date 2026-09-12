import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import cakeMyProspectLogo from '../assets/cakemyprospect-logo.svg'
import { getBusinessCardProfile, storeBusinessCardProfile } from '../features/profile/profileStorage'

const EMPTY_PROFILE = {
  name: '',
  company: '',
  phoneNumber: '',
}

export function ProfilePage() {
  const navigate = useNavigate()
  const initialProfile = useMemo(() => getBusinessCardProfile(), [])
  const isFirstTimeSetup = !initialProfile
  const [profileDraft, setProfileDraft] = useState(initialProfile ?? EMPTY_PROFILE)
  const [error, setError] = useState<string | null>(null)

  function updateProfileField(field: keyof typeof EMPTY_PROFILE, value: string) {
    setProfileDraft((currentProfile) => ({ ...currentProfile, [field]: value }))
  }

  function handleCancel() {
    if (isFirstTimeSetup) return
    navigate('/')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      storeBusinessCardProfile(profileDraft)
      navigate('/')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to save profile.')
    }
  }

  const canSave = Boolean(profileDraft.name.trim() && profileDraft.company.trim() && profileDraft.phoneNumber.trim())

  return (
    <form className="checkout-card checkout-card-narrow profile-card" onSubmit={handleSubmit}>
      <img className="profile-logo" src={cakeMyProspectLogo} alt="Cake my prospect" />
      <h1>Setup profile</h1>

      <div className="checkout-address-fields">
        <label className="checkout-field">
          <span>Name</span>
          <input value={profileDraft.name} autoComplete="name" onChange={(event) => updateProfileField('name', event.target.value)} />
        </label>

        <label className="checkout-field">
          <span>Company</span>
          <input value={profileDraft.company} autoComplete="organization" onChange={(event) => updateProfileField('company', event.target.value)} />
        </label>

        <label className="checkout-field">
          <span>Phone Number</span>
          <input type="tel" value={profileDraft.phoneNumber} autoComplete="tel" onChange={(event) => updateProfileField('phoneNumber', event.target.value)} />
        </label>
      </div>

      {error ? <p className="checkout-error">{error}</p> : null}

      <div className="checkout-actions">
        <button className="checkout-secondary-button" type="button" disabled={isFirstTimeSetup} onClick={handleCancel}>
          Cancel
        </button>
        <button className="checkout-primary-button" type="submit" disabled={!canSave}>
          Save profile
        </button>
      </div>
    </form>
  )
}
