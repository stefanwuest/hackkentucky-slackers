import { type Company } from './types'

const SELECTED_COMPANY_KEY = 'cake-my-prospect:selected-company'
const COMPANY_KEY_PREFIX = 'cake-my-prospect:company:'

function companyKey(companyId: string) {
  return `${COMPANY_KEY_PREFIX}${companyId}`
}

function canUseSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
}

function safeParseCompany(value: string | null) {
  if (!value) return null

  try {
    const parsed = JSON.parse(value) as Partial<Company>
    return typeof parsed.company_id === 'string' && Array.isArray(parsed.signals) ? (parsed as Company) : null
  } catch {
    return null
  }
}

export function storeCakeCompany(company: Company) {
  if (!canUseSessionStorage()) return

  const serializedCompany = JSON.stringify(company)
  window.sessionStorage.setItem(SELECTED_COMPANY_KEY, serializedCompany)
  window.sessionStorage.setItem(companyKey(company.company_id), serializedCompany)
  if (company.sponsor_ein) window.sessionStorage.setItem(companyKey(company.sponsor_ein), serializedCompany)
}

export function readCakeCompany(companyKeyValue?: string) {
  if (!canUseSessionStorage()) return null

  if (companyKeyValue) {
    const matchingCompany = safeParseCompany(window.sessionStorage.getItem(companyKey(companyKeyValue)))
    if (matchingCompany) return matchingCompany
  }

  const selectedCompany = safeParseCompany(window.sessionStorage.getItem(SELECTED_COMPANY_KEY))
  if (
    !companyKeyValue ||
    selectedCompany?.company_id === companyKeyValue ||
    selectedCompany?.sponsor_ein === companyKeyValue
  ) {
    return selectedCompany
  }

  return null
}
