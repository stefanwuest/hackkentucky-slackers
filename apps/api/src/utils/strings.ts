export function normalizeForDistinct(value: string | number | null | undefined) {
  const normalized = String(value ?? '').trim().replace(/\s+/g, ' ').toUpperCase()
  return normalized === '' ? null : normalized
}
