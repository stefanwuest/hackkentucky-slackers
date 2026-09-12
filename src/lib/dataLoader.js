// src/lib/dataLoader.js
import { csvToObjects } from './csv.js'

const IND_TRUE_VALUES = new Set(['1'])

function isIndicatorTrue(value) {
  return IND_TRUE_VALUES.has((value ?? '').trim())
}

function toInt(value) {
  const n = parseInt(value, 10)
  return Number.isNaN(n) ? 0 : n
}

function toNumber(value) {
  const n = parseFloat(value)
  return Number.isNaN(n) ? 0 : n
}

function cleanEin(value) {
  return (value ?? '').replace(/[^0-9]/g, '')
}

export function parseForm5500(rawCsvText) {
  const rows = csvToObjects(rawCsvText)

  return rows.map((r) => ({
    ackId: r.ACK_ID?.trim(),
    ein: cleanEin(r.SPONS_DFE_EIN),
    sponsorName: r.SPONSOR_DFE_NAME?.trim() || 'Unknown Sponsor',
    planName: r.PLAN_NAME?.trim() || 'Unnamed Plan',
    planYearBegin: r.FORM_PLAN_YEAR_BEGIN_DATE || null,
    taxPeriod: r.FORM_TAX_PRD || null,
    activeParticipants: toInt(r.TOT_ACTIVE_PARTCP_CNT),
    businessCode: r.BUSINESS_CODE || null,
    city: r.SPONS_DFE_LOC_US_CITY || r.SPONS_DFE_MAIL_US_CITY || null,
    state: r.SPONS_DFE_LOC_US_STATE || r.SPONS_DFE_MAIL_US_STATE || null,
  }))
}

export function parseScheduleA(rawCsvText) {
  const rows = csvToObjects(rawCsvText)

  return rows.map((r) => ({
    ackId: r.ACK_ID,
    ein: cleanEin(r.SCH_A_EIN),
    carrierName: r.INS_CARRIER_NAME?.trim() || 'Unknown Carrier',
    personsCovered: toInt(r.INS_PRSN_COVERED_EOY_CNT),
    policyFrom: r.INS_POLICY_FROM_DATE || null,
    policyTo: r.INS_POLICY_TO_DATE || null,
    earnedPremium: toNumber(r.WLFR_TOT_EARNED_PREM_AMT),
    brokerCommission: toNumber(r.INS_BROKER_COMM_TOT_AMT),
    benefits: {
      health: isIndicatorTrue(r.WLFR_BNFT_HEALTH_IND),
      dental: isIndicatorTrue(r.WLFR_BNFT_DENTAL_IND),
      vision: isIndicatorTrue(r.WLFR_BNFT_VISION_IND),
      life: isIndicatorTrue(r.WLFR_BNFT_LIFE_INSUR_IND),
      longTermDisability: isIndicatorTrue(r.WLFR_BNFT_LONG_TERM_DISAB_IND),
      tempDisability: isIndicatorTrue(r.WLFR_BNFT_TEMP_DISAB_IND),
      stopLoss: isIndicatorTrue(r.WLFR_BNFT_STOP_LOSS_IND),
      drug: isIndicatorTrue(r.WLFR_BNFT_DRUG_IND),
    },
  }))
}