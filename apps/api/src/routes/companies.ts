import type { Hono } from 'hono'
import { ALLOWED_STATES, COMPANY_SIGNAL_TYPES, COVERAGE_TYPES, MS_PER_DAY, type CompanySignalType } from '../constants'
import { getCakeById, getCakeImageById, insertCake, updateCakeMessage } from '../db/cakes'
import { bindAndQueryCompanyRenewalSignalRows, bindAndQueryCompanyRowsByEin } from '../db/renewals'
import { createModelQueryServiceFromEnv, type BusinessCardProfile } from '../services/model-queries'
import { CAKE_COLORS, isCakeColor, type AppBindings, type CakeColor, type CakeRecord, type CompanyDetailRow, type D1DatabaseLike } from '../types'
import { coverageTypeFromDbValue, parseCoverageTypes } from '../utils/coverage'
import { estimatedRenewalDate, toIsoDate, todayUtc } from '../utils/dates'
import { matchesDaysToRenewalFilters, parseCompanySignalTypes, parseDaysToRenewalFilters, parseLimit } from '../utils/filters'
import { toNumberOrNull } from '../utils/numbers'

type CompanyResponse = {
  company_id: string
  name: string | null
  dba_name: string | null
  sponsor_ein: string | null
  location: {
    city: string | null
    state: string | null
    zip: string | null
  }
  business_code: string | null
  metrics: {
    filing_count: number | null
    plan_count: number | null
    contract_count: number | null
    carrier_count: number | null
    contract_number_count: number | null
    policy_end_month_count: number | null
    total_covered_lives_eoy: number | null
    total_premium_received: number | null
    total_earned_premium: number | null
    latest_date_received: string | null
  }
  signals: Array<{
    type: CompanySignalType
    severity: 'low' | 'medium' | 'high'
    label: string
    properties: {
      earliest_estimated_renewal_date: string
      minimum_days_until_renewal: number
      renewal_contract_count: number
      coverage_types: string[]
    }
    evidence: Array<{
      contract_id: string
      plan_id: string
      plan_name: string | null
      carrier: {
        name: string | null
        ein: string | null
        naic_code: string | null
        contract_number: string | null
      }
      coverage_types: string[]
      covered_lives_eoy: number | null
      policy_from_date: string | null
      policy_to_date: string | null
      estimated_renewal_date: string
      days_until_renewal: number
      premium_received_amount: number | null
      total_earned_premium_amount: number | null
    }>
  }>
}

function companyFromRows(rows: CompanyDetailRow[], today: Date): CompanyResponse | null {
  const firstRow = rows[0]
  if (!firstRow) return null

  const company: CompanyResponse = {
    company_id: firstRow.company_id,
    name: firstRow.display_name,
    dba_name: firstRow.dba_name,
    sponsor_ein: firstRow.sponsor_ein,
    location: {
      city: firstRow.mail_city,
      state: firstRow.mail_state,
      zip: firstRow.mail_zip,
    },
    business_code: firstRow.business_code,
    metrics: {
      filing_count: toNumberOrNull(firstRow.filing_count),
      plan_count: toNumberOrNull(firstRow.plan_count),
      contract_count: toNumberOrNull(firstRow.contract_count),
      carrier_count: toNumberOrNull(firstRow.carrier_count),
      contract_number_count: toNumberOrNull(firstRow.contract_number_count),
      policy_end_month_count: toNumberOrNull(firstRow.policy_end_month_count),
      total_covered_lives_eoy: toNumberOrNull(firstRow.total_covered_lives_eoy),
      total_premium_received: toNumberOrNull(firstRow.total_premium_received),
      total_earned_premium: toNumberOrNull(firstRow.total_earned_premium),
      latest_date_received: firstRow.latest_date_received,
    },
    signals: [],
  }

  let minimumDaysUntilRenewal = Number.MAX_SAFE_INTEGER
  let earliestEstimatedRenewalDate = ''
  const coverageTypes = new Set<string>()
  const evidenceByContract = new Map<
    string,
    {
      evidence: CompanyResponse['signals'][number]['evidence'][number]
      coverageTypes: Set<string>
    }
  >()

  for (const row of rows) {
    if (!row.contract_id || !row.plan_id) continue

    const renewalDate = estimatedRenewalDate(row.policy_to_date, today)
    if (!renewalDate) continue

    const daysUntilRenewal = Math.ceil((renewalDate.getTime() - today.getTime()) / MS_PER_DAY)
    const estimatedRenewalDateIso = toIsoDate(renewalDate)

    if (daysUntilRenewal < minimumDaysUntilRenewal) {
      minimumDaysUntilRenewal = daysUntilRenewal
      earliestEstimatedRenewalDate = estimatedRenewalDateIso
    }

    const coverageType = coverageTypeFromDbValue(row.coverage_type)
    if (coverageType) coverageTypes.add(coverageType)

    let evidenceGroup = evidenceByContract.get(row.contract_id)
    if (!evidenceGroup) {
      evidenceGroup = {
        evidence: {
          contract_id: row.contract_id,
          plan_id: row.plan_id,
          plan_name: row.plan_name,
          carrier: {
            name: row.carrier_name,
            ein: row.carrier_ein,
            naic_code: row.carrier_naic_code,
            contract_number: row.contract_number,
          },
          coverage_types: [],
          covered_lives_eoy: toNumberOrNull(row.covered_lives_eoy),
          policy_from_date: row.policy_from_date,
          policy_to_date: row.policy_to_date,
          estimated_renewal_date: estimatedRenewalDateIso,
          days_until_renewal: daysUntilRenewal,
          premium_received_amount: toNumberOrNull(row.premium_received),
          total_earned_premium_amount: toNumberOrNull(row.contract_total_earned_premium),
        },
        coverageTypes: new Set<string>(),
      }
      evidenceByContract.set(row.contract_id, evidenceGroup)
    }

    if (coverageType) evidenceGroup.coverageTypes.add(coverageType)
  }

  const evidence = [...evidenceByContract.values()]
    .map((evidenceGroup) => ({
      ...evidenceGroup.evidence,
      coverage_types: [...evidenceGroup.coverageTypes].sort(),
    }))
    .sort((a, b) => {
      const daysDiff = a.days_until_renewal - b.days_until_renewal
      if (daysDiff !== 0) return daysDiff
      return (a.carrier.name ?? '').localeCompare(b.carrier.name ?? '')
    })

  if (evidence.length > 0) {
    company.signals.push({
      type: 'upcoming_renewal',
      severity: minimumDaysUntilRenewal <= 30 ? 'high' : minimumDaysUntilRenewal <= 90 ? 'medium' : 'low',
      label: `Renewal likely in ${minimumDaysUntilRenewal} days`,
      properties: {
        earliest_estimated_renewal_date: earliestEstimatedRenewalDate,
        minimum_days_until_renewal: minimumDaysUntilRenewal,
        renewal_contract_count: evidence.length,
        coverage_types: [...coverageTypes].sort(),
      },
      evidence,
    })
  }

  return company
}

function normalizeSponsorEin(value: string | undefined) {
  const sponsorEin = value?.trim().replace(/\D/g, '') ?? ''
  return sponsorEin || null
}

type GenerateCakeRequestBody = {
  minCharacters?: unknown
  maxCharacters?: unknown
  min_characters?: unknown
  max_characters?: unknown
  businessProfile?: unknown
  business_profile?: unknown
}

const BUSINESS_PROFILE_FIELD_LABELS = {
  name: 'businessProfile.name',
  company: 'businessProfile.company',
  phoneNumber: 'businessProfile.phoneNumber',
} as const

type UpdateCakeTextRequestBody = {
  message?: unknown
  text?: unknown
  cakeColor?: unknown
  cake_color?: unknown
  businessProfile?: unknown
  business_profile?: unknown
}

const MAX_CUSTOM_CAKE_MESSAGE_CHARACTERS = 110

type IntegerParseResult =
  | {
      value: number | undefined
    }
  | {
      error: string
    }

type StringParseResult =
  | {
      value: string
    }
  | {
      error: string
    }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function parseOptionalJsonBody(req: { header: (name: string) => string | undefined; json: () => Promise<unknown> }) {
  const contentType = req.header('content-type') ?? ''
  if (!contentType.toLowerCase().includes('application/json')) return undefined

  return req.json()
}

function parseOptionalPositiveInteger(body: unknown, camelCaseName: keyof GenerateCakeRequestBody, snakeCaseName: keyof GenerateCakeRequestBody): IntegerParseResult {
  if (!isRecord(body)) return { value: undefined }

  const value = body[camelCaseName] ?? body[snakeCaseName]
  if (value === undefined || value === null) return { value: undefined }

  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    return { error: `${String(camelCaseName)} must be a positive integer.` }
  }

  return { value }
}

function normalizeRequiredString(value: unknown, label: string): StringParseResult {
  if (typeof value !== 'string') return { error: `${label} must be a string.` }

  const normalizedValue = value.trim().replace(/\s+/g, ' ')
  if (!normalizedValue) return { error: `${label} must not be empty.` }

  return { value: normalizedValue }
}

function parseBusinessCardProfile(body: unknown): BusinessCardProfile | { error: string } | undefined {
  if (!isRecord(body)) return undefined

  const value = body.businessProfile ?? body.business_profile ?? body.businessCardProfile ?? body.business_card_profile
  if (value === undefined || value === null) return undefined
  if (!isRecord(value)) return { error: 'businessProfile must be an object.' }

  const nameResult = normalizeRequiredString(value.name, BUSINESS_PROFILE_FIELD_LABELS.name)
  if ('error' in nameResult) return { error: nameResult.error }

  const companyResult = normalizeRequiredString(value.company, BUSINESS_PROFILE_FIELD_LABELS.company)
  if ('error' in companyResult) return { error: companyResult.error }

  const phoneNumberResult = normalizeRequiredString(value.phoneNumber ?? value.phone_number ?? value.phone, BUSINESS_PROFILE_FIELD_LABELS.phoneNumber)
  if ('error' in phoneNumberResult) return { error: phoneNumberResult.error }

  return {
    name: nameResult.value,
    company: companyResult.value,
    phoneNumber: phoneNumberResult.value,
  }
}

function cakeProspectInformation(company: CompanyResponse) {
  const upcomingRenewalSignal = company.signals.find((signal) => signal.type === 'upcoming_renewal')
  const carriers = new Set(
    upcomingRenewalSignal?.evidence
      .map((evidence) => evidence.carrier.name)
      .filter((carrierName): carrierName is string => Boolean(carrierName)) ?? [],
  )

  const location = [company.location.city, company.location.state, company.location.zip].filter(Boolean).join(', ')
  const lines: string[] = []
  const addLine = (label: string, value: string | number | null | undefined) => {
    if (value !== null && value !== undefined && value !== '') lines.push(`${label}: ${value}`)
  }

  addLine('Company', company.name)
  addLine('DBA', company.dba_name)
  addLine('Location', location)
  addLine('Business code', company.business_code)
  addLine('Renewal signal', upcomingRenewalSignal?.label)
  addLine('Estimated renewal date', upcomingRenewalSignal?.properties.earliest_estimated_renewal_date)
  addLine('Days until renewal', upcomingRenewalSignal?.properties.minimum_days_until_renewal)
  addLine('Coverage types', upcomingRenewalSignal?.properties.coverage_types.join(', '))
  addLine('Covered lives at year end', formatInteger(company.metrics.total_covered_lives_eoy))
  addLine('Total earned premium', formatUsd(company.metrics.total_earned_premium))
  addLine('Known carriers', [...carriers].sort().join(', '))

  return lines.join('\n')
}

function formatInteger(value: number | null) {
  return value === null ? null : new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}

function formatUsd(value: number | null) {
  return value === null
    ? null
    : new Intl.NumberFormat('en-US', { currency: 'USD', maximumFractionDigits: 0, style: 'currency' }).format(value)
}

function getDatabase(env: AppBindings) {
  return env.DB ?? env.MY_DB
}

function createCakeId() {
  return `cake_${crypto.randomUUID()}`
}

function createCakeImageFilename(cakeId: string, mediaType: string) {
  const extension = mediaType === 'image/jpeg' ? 'jpg' : mediaType === 'image/webp' ? 'webp' : 'png'
  return `${cakeId}.${extension}`
}

type CakeMessageOptions = {
  businessCardProfile?: BusinessCardProfile
  minCharacters?: number
  maxCharacters?: number
}

type CakeResponse = {
  cake: CakeRecord
  company: CompanyResponse
}

function cakeResponse(cake: CakeRecord, company: CompanyResponse): CakeResponse {
  return { cake, company }
}

async function getCompanyBySponsorEin(db: D1DatabaseLike, sponsorEin: string) {
  const queryResult = await bindAndQueryCompanyRowsByEin(db, sponsorEin)
  if (queryResult.success === false) {
    throw new Error(queryResult.error ?? 'Failed to query company.')
  }

  return companyFromRows(queryResult.results ?? [], todayUtc())
}

async function generateCakeAssets(env: AppBindings, company: CompanyResponse, options: CakeMessageOptions) {
  const modelService = createModelQueryServiceFromEnv(env)
  const cakeMessage = await modelService.createCakeMessage({
    prospectInformation: cakeProspectInformation(company),
    businessCardProfile: options.businessCardProfile,
    minCharacters: options.minCharacters,
    maxCharacters: options.maxCharacters,
  })
  const cakeImage = await modelService.createCakeImage({
    cakeMessage,
    businessCardProfile: options.businessCardProfile,
    frostingColor: cakeMessage.cake_color,
    user: company.company_id ?? company.sponsor_ein ?? undefined,
  })

  return { cakeMessage, cakeImage }
}

async function generateCakeImageForText(env: AppBindings, cake: CakeRecord, message: string, cakeColor?: CakeColor, businessCardProfile?: BusinessCardProfile) {
  const modelService = createModelQueryServiceFromEnv(env)
  const resolvedCakeColor = cakeColor ?? cake.cake_color ?? CAKE_COLORS[0]
  return modelService.createCakeImage({
    cakeMessage: {
      message,
      cake_size: cake.cake_size,
      cake_shape: cake.cake_shape,
      cake_color: resolvedCakeColor,
    },
    businessCardProfile,
    frostingColor: resolvedCakeColor,
    user: cake.company_id ?? cake.sponsor_ein ?? undefined,
  })
}

function base64ToArrayBuffer(base64: string) {
  const base64Content = base64.includes(',') ? base64.slice(base64.indexOf(',') + 1) : base64
  const binary = atob(base64Content.replace(/\s/g, ''))
  const buffer = new ArrayBuffer(binary.length)
  const bytes = new Uint8Array(buffer)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return buffer
}

function parseCakeMessageOptions(body: unknown): CakeMessageOptions | { error: string } {
  const minCharactersResult = parseOptionalPositiveInteger(body, 'minCharacters', 'min_characters')
  if ('error' in minCharactersResult) return { error: minCharactersResult.error }

  const maxCharactersResult = parseOptionalPositiveInteger(body, 'maxCharacters', 'max_characters')
  if ('error' in maxCharactersResult) return { error: maxCharactersResult.error }

  const businessCardProfile = parseBusinessCardProfile(body)
  if (businessCardProfile && 'error' in businessCardProfile) return { error: businessCardProfile.error }

  if (
    minCharactersResult.value !== undefined &&
    maxCharactersResult.value !== undefined &&
    minCharactersResult.value > maxCharactersResult.value
  ) {
    return { error: 'minCharacters must be less than or equal to maxCharacters.' }
  }

  return {
    businessCardProfile,
    minCharacters: minCharactersResult.value,
    maxCharacters: maxCharactersResult.value,
  }
}

function normalizeCakeText(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function parseCakeTextUpdate(body: unknown): { message: string; cakeColor?: CakeColor; businessCardProfile?: BusinessCardProfile } | { error: string } {
  if (!isRecord(body)) return { error: 'JSON body with message is required.' }

  const value = (body as UpdateCakeTextRequestBody).message ?? (body as UpdateCakeTextRequestBody).text
  if (typeof value !== 'string') return { error: 'message must be a string.' }

  const cakeColorValue = (body as UpdateCakeTextRequestBody).cakeColor ?? (body as UpdateCakeTextRequestBody).cake_color
  if (cakeColorValue !== undefined && cakeColorValue !== null && typeof cakeColorValue !== 'string') {
    return { error: 'cakeColor must be a hex color string.' }
  }

  const cakeColor = typeof cakeColorValue === 'string' && cakeColorValue.trim() ? cakeColorValue.trim().toLowerCase() : undefined
  let parsedCakeColor: CakeColor | undefined
  if (cakeColor) {
    if (!isCakeColor(cakeColor)) return { error: `cakeColor must be one of: ${CAKE_COLORS.join(', ')}.` }
    parsedCakeColor = cakeColor
  }

  const businessCardProfile = parseBusinessCardProfile(body)
  if (businessCardProfile && 'error' in businessCardProfile) return { error: businessCardProfile.error }

  const message = normalizeCakeText(value)
  if (!message) return { error: 'message must not be empty.' }
  if (message.length > MAX_CUSTOM_CAKE_MESSAGE_CHARACTERS) {
    return { error: `message must be ${MAX_CUSTOM_CAKE_MESSAGE_CHARACTERS} characters or fewer.` }
  }

  return { message, cakeColor: parsedCakeColor, businessCardProfile }
}

export function registerCompaniesRoute(app: Hono<{ Bindings: AppBindings }>) {
  app.post('/api/company/:sponsorEin/cakes', async (c) => {
    const sponsorEin = normalizeSponsorEin(c.req.param('sponsorEin'))
    if (!sponsorEin) return c.json({ error: 'sponsor_ein is required.' }, 400)

    let body: unknown
    try {
      body = await parseOptionalJsonBody(c.req)
    } catch {
      return c.json({ error: 'Invalid JSON body.' }, 400)
    }

    const cakeMessageOptions = parseCakeMessageOptions(body)
    if ('error' in cakeMessageOptions) return c.json({ error: cakeMessageOptions.error }, 400)

    const db = getDatabase(c.env)
    if (!db) {
      return c.json(
        {
          error: 'D1 database binding not found. Bind the seeded database as DB (preferred) or MY_DB.',
        },
        500,
      )
    }

    if (!c.env.OPENROUTER_API_KEY) return c.json({ error: 'OPENROUTER_API_KEY is not configured.' }, 500)

    let company: CompanyResponse | null
    try {
      company = await getCompanyBySponsorEin(db, sponsorEin)
    } catch (error) {
      console.error('Failed to query company.', error)
      return c.json({ error: 'Failed to query company.' }, 500)
    }

    if (!company) return c.json({ error: 'Company not found.' }, 404)

    try {
      const { cakeMessage, cakeImage } = await generateCakeAssets(c.env, company, cakeMessageOptions)
      const cakeId = createCakeId()
      const imageMimeType = cakeImage.media_type ?? 'image/png'
      const now = new Date().toISOString()
      const cake = await insertCake(db, {
        cakeId,
        sponsorEin,
        companyId: company.company_id,
        message: cakeMessage.message,
        cakeSize: cakeMessage.cake_size,
        cakeShape: cakeMessage.cake_shape,
        cakeColor: cakeMessage.cake_color,
        imageBlob: base64ToArrayBuffer(cakeImage.b64_json),
        imageMimeType,
        imageFilename: createCakeImageFilename(cakeId, imageMimeType),
        imageGeneratedAt: now,
        createdAt: now,
      })

      return c.json(cakeResponse(cake, company), 201)
    } catch (error) {
      console.error('Failed to create cake.', error)
      return c.json({ error: 'Failed to create cake.' }, 502)
    }
  })

  app.get('/api/cakes/:cakeId', async (c) => {
    const cakeId = c.req.param('cakeId')?.trim()
    if (!cakeId) return c.json({ error: 'cake_id is required.' }, 400)

    const db = getDatabase(c.env)
    if (!db) {
      return c.json(
        {
          error: 'D1 database binding not found. Bind the seeded database as DB (preferred) or MY_DB.',
        },
        500,
      )
    }

    try {
      const cake = await getCakeById(db, cakeId)
      if (!cake) return c.json({ error: 'Cake not found.' }, 404)

      const company = await getCompanyBySponsorEin(db, cake.sponsor_ein)
      if (!company) return c.json({ error: 'Company not found.' }, 404)

      return c.json(cakeResponse(cake, company))
    } catch (error) {
      console.error('Failed to fetch cake.', error)
      return c.json({ error: 'Failed to fetch cake.' }, 500)
    }
  })

  app.get('/api/cakes/:cakeId/checkout-address', async (c) => {
    const cakeId = c.req.param('cakeId')?.trim()
    if (!cakeId) return c.json({ error: 'cake_id is required.' }, 400)

    const db = getDatabase(c.env)
    if (!db) {
      return c.json(
        {
          error: 'D1 database binding not found. Bind the seeded database as DB (preferred) or MY_DB.',
        },
        500,
      )
    }

    try {
      const cake = await getCakeById(db, cakeId)
      if (!cake) return c.json({ error: 'Cake not found.' }, 404)

      const company = await getCompanyBySponsorEin(db, cake.sponsor_ein)
      if (!company) return c.json({ error: 'Company not found.' }, 404)
      if (!c.env.OPENROUTER_API_KEY) return c.json({ error: 'OPENROUTER_API_KEY is not configured.' }, 500)

      const recipient = company.name ?? company.dba_name ?? 'Recipient'
      const modelService = createModelQueryServiceFromEnv(c.env)
      const address = await modelService.createCompanyAddressCandidate({
        name: recipient,
        ein: cake.sponsor_ein,
        city: company.location.city,
        state: company.location.state,
      })

      return c.json({
        recipient,
        address: {
          line1: address.address_line_1 ?? '',
          line2: address.address_line_2 ?? '',
          city: address.city ?? '',
          state: address.state ?? '',
          postalCode: address.zip_code ?? '',
          country: 'US',
        },
      })
    } catch (error) {
      console.error('Failed to fetch checkout address.', error)
      return c.json({ error: 'Failed to fetch checkout address.' }, 502)
    }
  })

  app.get('/api/cakes/:cakeId/image', async (c) => {
    const cakeId = c.req.param('cakeId')?.trim()
    if (!cakeId) return c.json({ error: 'cake_id is required.' }, 400)

    const db = getDatabase(c.env)
    if (!db) {
      return c.json(
        {
          error: 'D1 database binding not found. Bind the seeded database as DB (preferred) or MY_DB.',
        },
        500,
      )
    }

    try {
      const image = await getCakeImageById(db, cakeId)
      if (!image) return c.json({ error: 'Cake image not found.' }, 404)

      return c.body(image.image_blob, 200, {
        'Cache-Control': 'private, max-age=300',
        'Content-Disposition': `inline; filename="${image.image_filename ?? `${cakeId}.png`}"`,
        'Content-Type': image.image_mime_type,
      })
    } catch (error) {
      console.error('Failed to fetch cake image.', error)
      return c.json({ error: 'Failed to fetch cake image.' }, 500)
    }
  })

  app.put('/api/cakes/:cakeId', async (c) => {
    const cakeId = c.req.param('cakeId')?.trim()
    if (!cakeId) return c.json({ error: 'cake_id is required.' }, 400)

    let body: unknown
    try {
      body = await parseOptionalJsonBody(c.req)
    } catch {
      return c.json({ error: 'Invalid JSON body.' }, 400)
    }

    const cakeMessageOptions = parseCakeMessageOptions(body)
    if ('error' in cakeMessageOptions) return c.json({ error: cakeMessageOptions.error }, 400)

    const db = getDatabase(c.env)
    if (!db) {
      return c.json(
        {
          error: 'D1 database binding not found. Bind the seeded database as DB (preferred) or MY_DB.',
        },
        500,
      )
    }

    if (!c.env.OPENROUTER_API_KEY) return c.json({ error: 'OPENROUTER_API_KEY is not configured.' }, 500)

    try {
      const existingCake = await getCakeById(db, cakeId)
      if (!existingCake) return c.json({ error: 'Cake not found.' }, 404)

      const company = await getCompanyBySponsorEin(db, existingCake.sponsor_ein)
      if (!company) return c.json({ error: 'Company not found.' }, 404)

      const { cakeMessage, cakeImage } = await generateCakeAssets(c.env, company, cakeMessageOptions)
      const imageMimeType = cakeImage.media_type ?? 'image/png'
      const updatedAt = new Date().toISOString()
      const updatedCake = await updateCakeMessage(db, {
        cakeId,
        message: cakeMessage.message,
        cakeSize: cakeMessage.cake_size,
        cakeShape: cakeMessage.cake_shape,
        cakeColor: cakeMessage.cake_color,
        imageBlob: base64ToArrayBuffer(cakeImage.b64_json),
        imageMimeType,
        imageFilename: createCakeImageFilename(cakeId, imageMimeType),
        imageGeneratedAt: updatedAt,
        updatedAt,
      })

      if (!updatedCake) return c.json({ error: 'Cake not found.' }, 404)

      return c.json(cakeResponse(updatedCake, company))
    } catch (error) {
      console.error('Failed to regenerate cake message.', error)
      return c.json({ error: 'Failed to regenerate cake message.' }, 502)
    }
  })

  app.put('/api/cakes/:cakeId/message', async (c) => {
    const cakeId = c.req.param('cakeId')?.trim()
    if (!cakeId) return c.json({ error: 'cake_id is required.' }, 400)

    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON body.' }, 400)
    }

    const cakeTextUpdate = parseCakeTextUpdate(body)
    if ('error' in cakeTextUpdate) return c.json({ error: cakeTextUpdate.error }, 400)

    const db = getDatabase(c.env)
    if (!db) {
      return c.json(
        {
          error: 'D1 database binding not found. Bind the seeded database as DB (preferred) or MY_DB.',
        },
        500,
      )
    }

    if (!c.env.OPENROUTER_API_KEY) return c.json({ error: 'OPENROUTER_API_KEY is not configured.' }, 500)

    try {
      const existingCake = await getCakeById(db, cakeId)
      if (!existingCake) return c.json({ error: 'Cake not found.' }, 404)

      const company = await getCompanyBySponsorEin(db, existingCake.sponsor_ein)
      if (!company) return c.json({ error: 'Company not found.' }, 404)

      const cakeColor = cakeTextUpdate.cakeColor ?? existingCake.cake_color ?? CAKE_COLORS[0]
      const cakeImage = await generateCakeImageForText(c.env, existingCake, cakeTextUpdate.message, cakeColor, cakeTextUpdate.businessCardProfile)
      const imageMimeType = cakeImage.media_type ?? 'image/png'
      const updatedAt = new Date().toISOString()
      const updatedCake = await updateCakeMessage(db, {
        cakeId,
        message: cakeTextUpdate.message,
        cakeSize: existingCake.cake_size,
        cakeShape: existingCake.cake_shape,
        cakeColor,
        imageBlob: base64ToArrayBuffer(cakeImage.b64_json),
        imageMimeType,
        imageFilename: createCakeImageFilename(cakeId, imageMimeType),
        imageGeneratedAt: updatedAt,
        updatedAt,
      })

      if (!updatedCake) return c.json({ error: 'Cake not found.' }, 404)

      return c.json(cakeResponse(updatedCake, company))
    } catch (error) {
      console.error('Failed to update cake message.', error)
      return c.json({ error: 'Failed to update cake message.' }, 502)
    }
  })

  app.get('/api/company/:sponsorEin', async (c) => {
    const sponsorEin = normalizeSponsorEin(c.req.param('sponsorEin'))
    if (!sponsorEin) return c.json({ error: 'sponsor_ein is required.' }, 400)

    const db = c.env.DB ?? c.env.MY_DB
    if (!db) {
      return c.json(
        {
          error: 'D1 database binding not found. Bind the seeded database as DB (preferred) or MY_DB.',
        },
        500,
      )
    }

    const queryResult = await bindAndQueryCompanyRowsByEin(db, sponsorEin)
    if (queryResult.success === false) {
      return c.json({ error: queryResult.error ?? 'Failed to query company.' }, 500)
    }

    const rows = queryResult.results ?? []
    const today = todayUtc()
    const company = companyFromRows(rows, today)
    if (!company) return c.json({ error: 'Company not found.' }, 404)

    return c.json({
      metadata: {
        as_of_date: toIsoDate(today),
        included_sidebar_fields: [
          'name',
          'dba_name',
          'sponsor_ein',
          'location',
          'renewal_signal',
          'estimated_renewal_date',
          'days_until_renewal',
          'coverage_types',
          'covered_lives_eoy',
          'total_earned_premium',
          'carriers',
        ],
      },
      company,
    })
  })

  app.get('/api/companies', async (c) => {
    const url = new URL(c.req.url)
    const state = url.searchParams.get('state')?.trim().toUpperCase()

    if (!state) {
      return c.json(
        {
          error: 'state is required for the first company signal endpoint.',
          allowed_states: ALLOWED_STATES,
        },
        400,
      )
    }

    if (!ALLOWED_STATES.includes(state as (typeof ALLOWED_STATES)[number])) {
      return c.json(
        {
          error: 'state must be one of the Schedule A states.',
          allowed_states: ALLOWED_STATES,
        },
        400,
      )
    }

    const { signalTypes, invalid: invalidSignalTypes } = parseCompanySignalTypes(url)
    if (invalidSignalTypes.length > 0) {
      return c.json(
        {
          error: 'signal contains unsupported values.',
          invalid_signal_types: invalidSignalTypes,
          allowed_signal_types: COMPANY_SIGNAL_TYPES.map(({ value, label }) => ({ value, label })),
        },
        400,
      )
    }

    const { coverageTypes, invalid } = parseCoverageTypes(url)
    if (invalid.length > 0) {
      return c.json(
        {
          error: 'coverage_type contains unsupported values.',
          invalid_coverage_types: invalid,
          allowed_coverage_types: COVERAGE_TYPES.map(({ value, label }) => ({ value, label })),
        },
        400,
      )
    }

    const parsedDaysToRenewal = parseDaysToRenewalFilters(url)
    if ('error' in parsedDaysToRenewal) {
      return c.json({ error: parsedDaysToRenewal.error }, 400)
    }

    const parsedLimit = parseLimit(url.searchParams.get('limit'))
    if ('error' in parsedLimit) return c.json({ error: parsedLimit.error }, 400)

    if (!signalTypes.includes('upcoming_renewal')) {
      return c.json(
        {
          filters: {
            state,
            signal: signalTypes,
            coverage_type: coverageTypes,
            days_to_renewal: parsedDaysToRenewal.legacyDaysToRenewal ?? null,
            days_to_renewal_filters: parsedDaysToRenewal.filters,
            limit: parsedLimit.limit,
          },
          metadata: {
            allowed_signal_types: COMPANY_SIGNAL_TYPES.map(({ value, label }) => ({ value, label })),
            allowed_coverage_types: COVERAGE_TYPES.map(({ value, label }) => ({ value, label })),
            allowed_states: ALLOWED_STATES,
          },
          count: 0,
          total_count: 0,
          companies: [],
        },
        200,
      )
    }

    const db = c.env.DB ?? c.env.MY_DB
    if (!db) {
      return c.json(
        {
          error: 'D1 database binding not found. Bind the seeded database as DB (preferred) or MY_DB.',
        },
        500,
      )
    }

    const queryResult = await bindAndQueryCompanyRenewalSignalRows(db, state, coverageTypes)
    if (queryResult.success === false) {
      return c.json({ error: queryResult.error ?? 'Failed to query companies.' }, 500)
    }

    const today = todayUtc()
    const groups = new Map<
      string,
      {
        company: {
          company_id: string
          name: string | null
          dba_name: string | null
          sponsor_ein: string | null
          location: {
            city: string | null
            state: string | null
            zip: string | null
          }
          business_code: string | null
          metrics: {
            filing_count: number | null
            plan_count: number | null
            contract_count: number | null
            carrier_count: number | null
            contract_number_count: number | null
            policy_end_month_count: number | null
            total_covered_lives_eoy: number | null
            total_premium_received: number | null
            total_earned_premium: number | null
            latest_date_received: string | null
          }
          signals: Array<{
            type: CompanySignalType
            severity: 'low' | 'medium' | 'high'
            label: string
            properties: {
              earliest_estimated_renewal_date: string
              minimum_days_until_renewal: number
              renewal_contract_count: number
              coverage_types: string[]
            }
            evidence: Array<{
              contract_id: string
              plan_id: string
              plan_name: string | null
              carrier: {
                name: string | null
                ein: string | null
                naic_code: string | null
                contract_number: string | null
              }
              coverage_types: string[]
              covered_lives_eoy: number | null
              policy_from_date: string | null
              policy_to_date: string | null
              estimated_renewal_date: string
              days_until_renewal: number
              premium_received_amount: number | null
              total_earned_premium_amount: number | null
            }>
          }>
        }
        minimumDaysUntilRenewal: number
        earliestEstimatedRenewalDate: string
        coverageTypes: Set<string>
        evidenceByContract: Map<
          string,
          {
            evidence: {
              contract_id: string
              plan_id: string
              plan_name: string | null
              carrier: {
                name: string | null
                ein: string | null
                naic_code: string | null
                contract_number: string | null
              }
              coverage_types: string[]
              covered_lives_eoy: number | null
              policy_from_date: string | null
              policy_to_date: string | null
              estimated_renewal_date: string
              days_until_renewal: number
              premium_received_amount: number | null
              total_earned_premium_amount: number | null
            }
            coverageTypes: Set<string>
          }
        >
      }
    >()

    for (const row of queryResult.results ?? []) {
      const renewalDate = estimatedRenewalDate(row.policy_to_date, today)
      if (!renewalDate) continue

      const daysUntilRenewal = Math.ceil((renewalDate.getTime() - today.getTime()) / MS_PER_DAY)
      if (!matchesDaysToRenewalFilters(daysUntilRenewal, parsedDaysToRenewal.filters)) continue

      const estimatedRenewalDateIso = toIsoDate(renewalDate)
      let group = groups.get(row.company_id)
      if (!group) {
        group = {
          company: {
            company_id: row.company_id,
            name: row.display_name,
            dba_name: row.dba_name,
            sponsor_ein: row.sponsor_ein,
            location: {
              city: row.mail_city,
              state: row.mail_state,
              zip: row.mail_zip,
            },
            business_code: row.business_code,
            metrics: {
              filing_count: toNumberOrNull(row.filing_count),
              plan_count: toNumberOrNull(row.plan_count),
              contract_count: toNumberOrNull(row.contract_count),
              carrier_count: toNumberOrNull(row.carrier_count),
              contract_number_count: toNumberOrNull(row.contract_number_count),
              policy_end_month_count: toNumberOrNull(row.policy_end_month_count),
              total_covered_lives_eoy: toNumberOrNull(row.total_covered_lives_eoy),
              total_premium_received: toNumberOrNull(row.total_premium_received),
              total_earned_premium: toNumberOrNull(row.total_earned_premium),
              latest_date_received: row.latest_date_received,
            },
            signals: [],
          },
          minimumDaysUntilRenewal: daysUntilRenewal,
          earliestEstimatedRenewalDate: estimatedRenewalDateIso,
          coverageTypes: new Set<string>(),
          evidenceByContract: new Map(),
        }
        groups.set(row.company_id, group)
      }

      if (daysUntilRenewal < group.minimumDaysUntilRenewal) {
        group.minimumDaysUntilRenewal = daysUntilRenewal
        group.earliestEstimatedRenewalDate = estimatedRenewalDateIso
      }

      const coverageType = coverageTypeFromDbValue(row.coverage_type)
      if (coverageType) group.coverageTypes.add(coverageType)

      let evidenceGroup = group.evidenceByContract.get(row.contract_id)
      if (!evidenceGroup) {
        evidenceGroup = {
          evidence: {
            contract_id: row.contract_id,
            plan_id: row.plan_id,
            plan_name: row.plan_name,
            carrier: {
              name: row.carrier_name,
              ein: row.carrier_ein,
              naic_code: row.carrier_naic_code,
              contract_number: row.contract_number,
            },
            coverage_types: [],
            covered_lives_eoy: toNumberOrNull(row.covered_lives_eoy),
            policy_from_date: row.policy_from_date,
            policy_to_date: row.policy_to_date,
            estimated_renewal_date: estimatedRenewalDateIso,
            days_until_renewal: daysUntilRenewal,
            premium_received_amount: toNumberOrNull(row.premium_received),
            total_earned_premium_amount: toNumberOrNull(row.contract_total_earned_premium),
          },
          coverageTypes: new Set<string>(),
        }
        group.evidenceByContract.set(row.contract_id, evidenceGroup)
      }
      if (coverageType) evidenceGroup.coverageTypes.add(coverageType)
    }

    const companies = [...groups.values()]
      .map((group) => {
        const evidence = [...group.evidenceByContract.values()]
          .map((evidenceGroup) => ({
            ...evidenceGroup.evidence,
            coverage_types: [...evidenceGroup.coverageTypes].sort(),
          }))
          .sort((a, b) => {
            const daysDiff = a.days_until_renewal - b.days_until_renewal
            if (daysDiff !== 0) return daysDiff
            return (a.carrier.name ?? '').localeCompare(b.carrier.name ?? '')
          })

        group.company.signals.push({
          type: 'upcoming_renewal',
          severity: group.minimumDaysUntilRenewal <= 30 ? 'high' : group.minimumDaysUntilRenewal <= 90 ? 'medium' : 'low',
          label: `Renewal likely in ${group.minimumDaysUntilRenewal} days`,
          properties: {
            earliest_estimated_renewal_date: group.earliestEstimatedRenewalDate,
            minimum_days_until_renewal: group.minimumDaysUntilRenewal,
            renewal_contract_count: evidence.length,
            coverage_types: [...group.coverageTypes].sort(),
          },
          evidence,
        })

        return group.company
      })
      .sort((a, b) => {
        const aDays = a.signals[0]?.properties.minimum_days_until_renewal ?? Number.MAX_SAFE_INTEGER
        const bDays = b.signals[0]?.properties.minimum_days_until_renewal ?? Number.MAX_SAFE_INTEGER
        if (aDays !== bDays) return aDays - bDays
        return (a.name ?? '').localeCompare(b.name ?? '')
      })

    const limitedCompanies = companies.slice(0, parsedLimit.limit)

    return c.json({
      filters: {
        state,
        signal: signalTypes,
        coverage_type: coverageTypes,
        days_to_renewal: parsedDaysToRenewal.legacyDaysToRenewal ?? null,
        days_to_renewal_filters: parsedDaysToRenewal.filters,
        limit: parsedLimit.limit,
      },
      metadata: {
        signal_filter_semantics:
          'Signal-specific filters currently apply to upcoming_renewal and are combined with AND semantics.',
        allowed_signal_types: COMPANY_SIGNAL_TYPES.map(({ value, label }) => ({ value, label })),
        allowed_coverage_types: COVERAGE_TYPES.map(({ value, label }) => ({ value, label })),
        allowed_states: ALLOWED_STATES,
      },
      count: limitedCompanies.length,
      total_count: companies.length,
      companies: limitedCompanies,
    })
  })
}
