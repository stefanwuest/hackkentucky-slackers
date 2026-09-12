import type { RenewalRow } from '../types'
import { normalizeForDistinct } from './strings'

export function sponsorKey(row: RenewalRow) {
  return normalizeForDistinct(row.SPONS_DFE_EIN) ?? normalizeForDistinct(row.SPONSOR_DFE_NAME) ?? row.ACK_ID
}

export function distinctCarrierKey(row: RenewalRow) {
  const name = normalizeForDistinct(row.INS_CARRIER_NAME)
  const ein = normalizeForDistinct(row.INS_CARRIER_EIN)
  const naic = normalizeForDistinct(row.INS_CARRIER_NAIC_CODE)
  if (!name && !ein && !naic) return null
  return [name ?? '', ein ?? '', naic ?? ''].join('|')
}

export function distinctContractKey(row: RenewalRow) {
  return normalizeForDistinct(row.INS_CONTRACT_NUM)
}
