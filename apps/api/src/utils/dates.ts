import { MONTH_NAMES } from '../constants'

export function todayUtc() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function dateFromMonthDay(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, Math.min(day, daysInMonth(year, month))))
}

export function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function policyEndDateParts(policyToDate: string | null) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(policyToDate ?? '')
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  return { year, month, day }
}

export function estimatedRenewalDate(policyToDate: string | null, today = todayUtc()) {
  const parts = policyEndDateParts(policyToDate)
  if (!parts) return null

  let estimated = dateFromMonthDay(today.getUTCFullYear(), parts.month, parts.day)
  if (estimated.getTime() < today.getTime()) {
    estimated = dateFromMonthDay(today.getUTCFullYear() + 1, parts.month, parts.day)
  }

  return estimated
}

export function monthLabel(month: number) {
  return MONTH_NAMES[month - 1] ?? 'Unknown'
}
