import { formatCoverageType, formatCurrency, formatList, formatNumber } from './formatters'
import { type Company, type CompanySignal } from './types'

export type CakeConcept = {
  companyName: string
  initials: string
  hookMessage: string
  designPrompt: string
  mockupPrompt: string
  palette: {
    primary: string
    secondary: string
    accent: string
    frosting: string
    ink: string
  }
  primarySignal: CompanySignal | null
  summary: {
    dbaOrEin: string
    location: string
    signalLabel: string
    estimatedRenewalDate: string
    daysUntilRenewal: string
    coverageTypes: string
    coveredLives: string
    totalEarnedPremium: string
    carrierNames: string
  }
}

type CakePalette = CakeConcept['palette']

const cakePalettes: CakePalette[] = [
  { primary: '#ff4f8b', secondary: '#ffd6e6', accent: '#7c3aed', frosting: '#fff7fb', ink: '#3b1230' },
  { primary: '#f97316', secondary: '#ffedd5', accent: '#0ea5e9', frosting: '#fff8ed', ink: '#431407' },
  { primary: '#10b981', secondary: '#d1fae5', accent: '#f43f5e', frosting: '#f0fdf4', ink: '#052e16' },
  { primary: '#6366f1', secondary: '#e0e7ff', accent: '#f59e0b', frosting: '#f8fafc', ink: '#1e1b4b' },
  { primary: '#ec4899', secondary: '#fce7f3', accent: '#14b8a6', frosting: '#fff1f7', ink: '#500724' },
]

function hashString(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}


export function selectPrimarySignal(company: Company) {
  return [...company.signals].sort((a, b) => a.properties.minimum_days_until_renewal - b.properties.minimum_days_until_renewal)[0] ?? null
}

export function getCompanyDisplayName(company: Company) {
  return company.name?.trim() || company.dba_name?.trim() || 'Unnamed prospect'
}

export function getCompanyInitials(name: string) {
  const words = name
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) return 'CP'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
}

export function getCakePalette(companyName: string) {
  return cakePalettes[hashString(companyName) % cakePalettes.length]
}

export function getCarrierNames(signal: CompanySignal | null) {
  const carriers = signal?.evidence.map((item) => item.carrier.name).filter((name): name is string => Boolean(name?.trim())) ?? []
  return [...new Set(carriers)]
}

export function formatCompanyLocation(company: Company) {
  const cityState = [company.location.city, company.location.state].filter(Boolean).join(', ')
  return [cityState, company.location.zip].filter(Boolean).join(' ') || 'Location not reported'
}

export function generateCakeHook(company: Company) {
  const signal = selectPrimarySignal(company)
  const companyName = getCompanyDisplayName(company)
  const coverage = signal?.properties.coverage_types[0]
  const coverageLabel = coverage ? formatCoverageType(coverage).toLowerCase() : 'benefits'
  const days = signal?.properties.minimum_days_until_renewal

  if (typeof days === 'number' && days <= 30) {
    return `${companyName} has a renewal coming fast — bring a ${coverageLabel} cake hook before the conversation gets stale.`
  }

  if (typeof days === 'number') {
    return `Sweeten the next ${coverageLabel} renewal conversation with a cake-worthy opener ${days} days before renewal.`
  }

  return `Turn ${companyName} into a memorable cake-worthy conversation starter.`
}

export function createCakePrompts(company: Company, hookMessage: string) {
  const companyName = getCompanyDisplayName(company)
  const signal = selectPrimarySignal(company)
  const coverageTypes = signal?.properties.coverage_types.map(formatCoverageType).join(', ') || 'employee benefits'
  const renewalTiming = signal
    ? `${signal.properties.minimum_days_until_renewal} days until estimated renewal on ${signal.properties.earliest_estimated_renewal_date}`
    : 'upcoming renewal timing'

  return {
    designPrompt: `Create a clean printable square cake topper design for ${companyName}. Include the company name or initials, ${renewalTiming}, ${coverageTypes}, and the message: "${hookMessage}". Make it playful, professional, high contrast, bakery-ready, no photorealistic cake, flat vector design, centered composition.`,
    mockupPrompt: `Create a polished hackathon demo mockup of a frosted celebration cake for prospect outreach. Place the ${companyName} cake topper design on top of the cake, include subtle renewal-themed decorations, keep text legible, cheerful sales-meets-bakery mood, premium but fun. Use this hook: "${hookMessage}"`,
  }
}

export function createCakeConcept(company: Company, generatedCakeMessage?: string): CakeConcept {
  const companyName = getCompanyDisplayName(company)
  const primarySignal = selectPrimarySignal(company)
  const hookMessage = generatedCakeMessage?.trim() || generateCakeHook(company)
  const palette = getCakePalette(companyName)
  const carrierNames = getCarrierNames(primarySignal)
  const coverageTypes = primarySignal?.properties.coverage_types.map(formatCoverageType) ?? []
  const { designPrompt, mockupPrompt } = createCakePrompts(company, hookMessage)

  return {
    companyName,
    initials: getCompanyInitials(companyName),
    hookMessage,
    designPrompt,
    mockupPrompt,
    palette,
    primarySignal,
    summary: {
      dbaOrEin: company.dba_name ? `DBA ${company.dba_name}` : company.sponsor_ein ? `EIN ${company.sponsor_ein}` : 'DBA / EIN not reported',
      location: formatCompanyLocation(company),
      signalLabel: primarySignal?.label ?? 'No renewal signal selected',
      estimatedRenewalDate: primarySignal?.properties.earliest_estimated_renewal_date ?? 'Not reported',
      daysUntilRenewal: primarySignal ? `${primarySignal.properties.minimum_days_until_renewal} days` : 'Not reported',
      coverageTypes: formatList(coverageTypes),
      coveredLives: formatNumber(company.metrics.total_covered_lives_eoy),
      totalEarnedPremium: formatCurrency(company.metrics.total_earned_premium),
      carrierNames: formatList(carrierNames),
    },
  } satisfies CakeConcept
}
