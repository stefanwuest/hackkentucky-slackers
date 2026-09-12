export type BusinessCardProfile = {
  name: string
  company: string
  phoneNumber: string
}

const BUSINESS_CARD_PROFILE_STORAGE_KEY = 'cake-my-prospect:business-card-profile'

function isStringRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeProfile(value: unknown): BusinessCardProfile | null {
  if (!isStringRecord(value)) return null

  const name = typeof value.name === 'string' ? value.name.trim() : ''
  const company = typeof value.company === 'string' ? value.company.trim() : ''
  const phoneNumber = typeof value.phoneNumber === 'string' ? value.phoneNumber.trim() : ''

  if (!name || !company || !phoneNumber) return null

  return { name, company, phoneNumber }
}

export function getBusinessCardProfile(): BusinessCardProfile | null {
  try {
    const storedValue = window.localStorage.getItem(BUSINESS_CARD_PROFILE_STORAGE_KEY)
    if (!storedValue) return null

    return normalizeProfile(JSON.parse(storedValue))
  } catch {
    return null
  }
}

export function storeBusinessCardProfile(profile: BusinessCardProfile) {
  const normalizedProfile = normalizeProfile(profile)
  if (!normalizedProfile) {
    throw new Error('Profile requires name, company, and phone number.')
  }

  window.localStorage.setItem(BUSINESS_CARD_PROFILE_STORAGE_KEY, JSON.stringify(normalizedProfile))
  return normalizedProfile
}
