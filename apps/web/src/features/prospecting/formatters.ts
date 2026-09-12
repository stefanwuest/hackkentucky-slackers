import { coverageLabels } from './constants'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const numberFormatter = new Intl.NumberFormat('en-US')

export function formatCurrency(value: number | null) {
  return value == null ? 'Not reported' : currencyFormatter.format(value)
}

export function formatNumber(value: number | null) {
  return value == null ? 'Not reported' : numberFormatter.format(value)
}

export function formatCoverageType(value: string) {
  return coverageLabels[value] ?? value.replaceAll('_', ' ')
}

export function formatList(values: Array<string | null | undefined>, fallback = 'Not reported') {
  const cleaned = values.filter((value): value is string => Boolean(value))
  if (!cleaned.length) return fallback
  return cleaned.slice(0, 3).join(', ') + (cleaned.length > 3 ? ` +${cleaned.length - 3}` : '')
}

export function reasonLabel(reason: string) {
  return reason.replace('multiple_', 'Multiple ').replaceAll('_', ' ')
}
