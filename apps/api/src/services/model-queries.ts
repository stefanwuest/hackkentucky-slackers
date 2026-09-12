import { OpenRouter } from '@openrouter/sdk'
import type { ChatJsonSchemaConfig, ChatMessages, ChatResult } from '@openrouter/sdk/models'
import { CAKE_SHAPES, CAKE_SIZES, type AppBindings, type CakeShape, type CakeSize } from '../types'

export type OpenAiChatModel = `openai/${string}`
export type GeminiChatModel = `google/${string}`
export type ChatModel = OpenAiChatModel | GeminiChatModel
export type OpenAiImageModel = `openai/${string}`

export const DEFAULT_OPENAI_CHAT_MODEL = 'openai/gpt-4o-mini' satisfies OpenAiChatModel
export const DEFAULT_GEMINI_ADDRESS_LOOKUP_MODEL = 'google/gemini-2.5-flash-lite' satisfies GeminiChatModel
export const DEFAULT_OPENAI_IMAGE_MODEL = 'openai/gpt-image-2.5-flare' satisfies OpenAiImageModel

const DEFAULT_APP_TITLE = 'Zywave Prospect Intelligence API'

const CAKE_MESSAGE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    message: {
      type: 'string',
    },
    cake_size: {
      type: 'string',
      enum: CAKE_SIZES,
    },
    cake_shape: {
      type: 'string',
      enum: CAKE_SHAPES,
    },
  },
  required: ['message', 'cake_size', 'cake_shape'],
} as const

const COMPANY_ADDRESS_CANDIDATE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    address_line_1: {
      type: ['string', 'null'],
      description: 'Primary street address line only, without company name.',
    },
    address_line_2: {
      type: ['string', 'null'],
      description: 'Suite, unit, floor, building, or other secondary address detail, if present.',
    },
    city: {
      type: ['string', 'null'],
    },
    state: {
      type: ['string', 'null'],
      description: 'Two-letter USPS state abbreviation.',
    },
    zip_code: {
      type: ['string', 'null'],
      description: 'U.S. ZIP code in 12345 or 12345-6789 format.',
    },
  },
  required: ['address_line_1', 'address_line_2', 'city', 'state', 'zip_code'],
} as const

type JsonSchema = Exclude<ChatJsonSchemaConfig['schema'], undefined>

export type CakeMessageResponse = {
  message: string
  cake_size: CakeSize
  cake_shape: CakeShape
}

export type CakeMessageRequest = {
  prospectInformation: string
  minCharacters?: number
  maxCharacters?: number
}

export type CakeImageRequest = {
  cakeMessage: CakeMessageResponse
  frostingColor?: string
  user?: string
}

export type CakeImageResponse = {
  b64_json: string
  media_type: string | null
  model: OpenAiImageModel
  prompt: string
}

export type CompanyAddressCandidateRequest = {
  name: string
  ein: string
  city?: string | null
  state?: string | null
}

export type CompanyAddressCandidateResponse = {
  address_line_1: string | null
  address_line_2: string | null
  city: string | null
  state: string | null
  zip_code: string | null
}

export type ModelQueryServiceOptions = {
  apiKey: string
  appTitle?: string
  httpReferer?: string
  model?: ChatModel
  imageModel?: OpenAiImageModel
}

export type SingleTurnJsonQueryOptions<TResponse> = {
  systemPrompt?: string
  userPrompt: string
  schema: JsonSchema
  schemaDescription?: string
  schemaName: string
  model?: ChatModel
  temperature?: number
  maxTokens?: number
  parseResponse?: (value: unknown) => TResponse
}

export type ModelQueryService = {
  singleTurnJsonQuery: <TResponse>(options: SingleTurnJsonQueryOptions<TResponse>) => Promise<TResponse>
  createCakeMessage: (request: CakeMessageRequest) => Promise<CakeMessageResponse>
  createCakeImage: (request: CakeImageRequest) => Promise<CakeImageResponse>
  createCompanyAddressCandidate: (request: CompanyAddressCandidateRequest) => Promise<CompanyAddressCandidateResponse>
}

export function createModelQueryService(options: ModelQueryServiceOptions): ModelQueryService {
  const apiKey = options.apiKey.trim()
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is required to call models.')

  const defaultModel = options.model ?? DEFAULT_OPENAI_CHAT_MODEL
  const defaultImageModel = options.imageModel ?? DEFAULT_OPENAI_IMAGE_MODEL
  const openRouter = new OpenRouter({
    apiKey,
    appTitle: options.appTitle ?? DEFAULT_APP_TITLE,
    httpReferer: options.httpReferer,
  })

  async function singleTurnJsonQuery<TResponse>({
    systemPrompt,
    userPrompt,
    schema,
    schemaDescription,
    schemaName,
    model = defaultModel,
    temperature = 0.4,
    maxTokens = 200,
    parseResponse,
  }: SingleTurnJsonQueryOptions<TResponse>) {
    const messages: ChatMessages[] = []
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
    messages.push({ role: 'user', content: userPrompt })

    const result = await openRouter.chat.send({
      chatRequest: {
        model,
        messages,
        stream: false,
        temperature,
        maxTokens,
        responseFormat: {
          type: 'json_schema',
          jsonSchema: {
            name: schemaName,
            description: schemaDescription,
            schema,
            strict: true,
          },
        },
      },
    })

    const parsed = parseJsonObject(extractAssistantText(result))
    return parseResponse ? parseResponse(parsed) : (parsed as TResponse)
  }

  async function createCakeMessage({ prospectInformation, minCharacters = 35, maxCharacters = 90 }: CakeMessageRequest) {
    validateCharacterRange(minCharacters, maxCharacters)

    const response = await singleTurnJsonQuery<CakeMessageResponse>({
      schemaName: 'cake_message',
      schemaDescription: 'A short, witty message suitable for writing on a prospecting cake.',
      schema: CAKE_MESSAGE_SCHEMA,
      systemPrompt: `You are helping an insurance broker get a foot in the door with a “cold cake” — an unsolicited cake sent to a prospective client.

Your task is to write a witty, memorable message to be written on the cake. The message should spark curiosity, feel relevant to the prospect, and make them more likely to take a short follow-up call.

Requirements:
- The message must be between ${minCharacters} and ${maxCharacters} characters.
- Keep it short enough to fit naturally on a cake.
- Recommend a cake_size from: ${CAKE_SIZES.join(', ')}.
- Recommend a cake_shape from: ${CAKE_SHAPES.join(', ')}.
- Be clever, warm, and professional.
- Avoid sounding pushy, creepy, overly salesy, or generic.
- Do not mention that you are an AI.
- Do not include quotation marks around the message.
- Return only JSON matching the provided schema.`,
      userPrompt: `Write the cake message using the prospect information below.

Prospect information:
${prospectInformation}`,
      maxTokens: 100,
      temperature: 0.7,
      parseResponse: parseCakeMessageResponse,
    })

    return response
  }

  async function createCakeImage({ cakeMessage, frostingColor, user }: CakeImageRequest) {
    const validatedCakeMessage = parseCakeMessageResponse(cakeMessage)
    const prompt = createCakeImagePrompt(validatedCakeMessage, frostingColor)

    const result = await openRouter.images.generate({
      imageGenerationRequest: {
        model: defaultImageModel,
        prompt,
        aspectRatio: '1:1',
        quality: 'low',
        n: 1,
        stream: false,
        user,
      },
    })

    const image = extractGeneratedImage(result)
    return {
      b64_json: image.b64Json,
      media_type: image.mediaType ?? null,
      model: defaultImageModel,
      prompt,
    }
  }

  async function createCompanyAddressCandidate({ name, ein, city, state }: CompanyAddressCandidateRequest) {
    const companyName = validateNonEmptyString(name, 'name')
    const companyEin = validateNonEmptyString(ein, 'ein')
    const knownCity = city?.trim() || null
    const knownState = state?.trim() || null

    return singleTurnJsonQuery<CompanyAddressCandidateResponse>({
      schemaName: 'company_address_candidate',
      schemaDescription: 'A best-effort candidate for a company U.S. mailing address in standard address fields.',
      schema: COMPANY_ADDRESS_CANDIDATE_SCHEMA,
      systemPrompt: `You are helping identify a likely U.S. mailing or headquarters address for a company.

Use the company name, EIN, and known location context together to disambiguate the company. Return one best address candidate using standard U.S. address formatting.

Requirements:
- Return only JSON matching the provided schema.
- Do not include the company name in the address fields.
- Use address_line_1 for the primary street address.
- Use address_line_2 only for suite, unit, floor, building, or other secondary address details; otherwise return null.
- Use a two-letter USPS state abbreviation.
- Use zip_code in 12345 or 12345-6789 format.
- If a reliable candidate cannot be identified, return null for unknown fields rather than fabricating details.`,
      userPrompt: `Find the best U.S. address candidate for this company.

Company name: ${companyName}
EIN: ${companyEin}
Known city: ${knownCity ?? 'unknown'}
Known state: ${knownState ?? 'unknown'}`,
      model: DEFAULT_GEMINI_ADDRESS_LOOKUP_MODEL,
      maxTokens: 120,
      temperature: 0.2,
      parseResponse: parseCompanyAddressCandidateResponse,
    })
  }

  return {
    singleTurnJsonQuery,
    createCakeMessage,
    createCakeImage,
    createCompanyAddressCandidate,
  }
}

export function createModelQueryServiceFromEnv(env: AppBindings) {
  return createModelQueryService({
    apiKey: env.OPENROUTER_API_KEY ?? '',
    appTitle: env.OPENROUTER_APP_TITLE,
    httpReferer: env.OPENROUTER_HTTP_REFERER,
  })
}

function extractAssistantText(result: ChatResult | AsyncIterable<unknown>) {
  if (!('choices' in result)) throw new Error('Expected a non-streaming model response.')

  const content = result.choices[0]?.message.content
  if (typeof content !== 'string') throw new Error('Model response did not include text content.')

  return content
}

function parseJsonObject(content: string) {
  try {
    return JSON.parse(content) as unknown
  } catch (error) {
    throw new Error(`Model returned invalid JSON: ${error instanceof Error ? error.message : 'unknown error'}`)
  }
}

function createCakeImagePrompt(cakeMessage: CakeMessageResponse, frostingColor?: string) {
  const cakeSize = cakeMessage.cake_size.replace('_', ' ')
  const colorRequirement = frostingColor ? `\n- Use ${frostingColor} as the dominant glaze / frosting surface color.` : ''

  return `Create a square, top-down bakery product mockup of a ${cakeSize} ${cakeMessage.cake_shape} frosted cake for a professional B2B prospecting gift.

The cake inscription must be exactly: ${JSON.stringify(cakeMessage.message)}

Requirements:
- Center the cake in a 1:1 image.
- Make the inscription highly legible, written with cake print on the cake surface.
- The full cake should be covered in one color glaze with the print. No cream.${colorRequirement}
- The cake should appear as an editable print with the text only.
- Keep the design warm, clever, polished, and professional.
- Use tasteful decorations that support an insurance renewal / business outreach theme.
- Do not include any extra words, logos, watermarks, hands, people, packaging labels, or UI elements.`
}

function extractGeneratedImage(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new Error('Expected a non-streaming image generation response.')
  }

  const image = value.data[0]
  if (!isRecord(image) || typeof image.b64Json !== 'string' || image.b64Json.trim().length === 0) {
    throw new Error('Image generation response did not include image data.')
  }

  if (image.mediaType !== undefined && typeof image.mediaType !== 'string') {
    throw new Error('Image generation response media type must be a string when present.')
  }

  return {
    b64Json: image.b64Json,
    mediaType: image.mediaType,
  }
}

function parseCakeMessageResponse(value: unknown): CakeMessageResponse {
  if (
    !isRecord(value) ||
    typeof value.message !== 'string' ||
    value.message.trim().length === 0 ||
    !isCakeSize(value.cake_size) ||
    !isCakeShape(value.cake_shape)
  ) {
    throw new Error('Model response did not match the cake message schema.')
  }

  return {
    message: value.message,
    cake_size: value.cake_size,
    cake_shape: value.cake_shape,
  }
}

function parseCompanyAddressCandidateResponse(value: unknown): CompanyAddressCandidateResponse {
  if (!isRecord(value)) throw new Error('Model response did not match the company address candidate schema.')

  return {
    address_line_1: normalizeNullableString(value.address_line_1, 'address_line_1'),
    address_line_2: normalizeNullableString(value.address_line_2, 'address_line_2'),
    city: normalizeNullableString(value.city, 'city'),
    state: normalizeState(value.state),
    zip_code: normalizeZipCode(value.zip_code),
  }
}

function normalizeNullableString(value: unknown, fieldName: string) {
  if (value === null) return null
  if (typeof value !== 'string') throw new Error(`Model response field ${fieldName} must be a string or null.`)

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeState(value: unknown) {
  const state = normalizeNullableString(value, 'state')
  if (state === null) return null

  const normalizedState = state.toUpperCase()
  if (!/^[A-Z]{2}$/.test(normalizedState)) {
    throw new Error('Model response field state must be a two-letter USPS abbreviation or null.')
  }

  return normalizedState
}

function normalizeZipCode(value: unknown) {
  const zipCode = normalizeNullableString(value, 'zip_code')
  if (zipCode === null) return null

  if (/^\d{9}$/.test(zipCode)) return `${zipCode.slice(0, 5)}-${zipCode.slice(5)}`
  if (!/^\d{5}(-\d{4})?$/.test(zipCode)) {
    throw new Error('Model response field zip_code must be a 5-digit ZIP code, ZIP+4, or null.')
  }

  return zipCode
}

function isCakeSize(value: unknown): value is CakeSize {
  return typeof value === 'string' && CAKE_SIZES.includes(value as CakeSize)
}

function isCakeShape(value: unknown): value is CakeShape {
  return typeof value === 'string' && CAKE_SHAPES.includes(value as CakeShape)
}

function validateNonEmptyString(value: string, fieldName: string) {
  const trimmed = value.trim()
  if (trimmed.length === 0) throw new Error(`${fieldName} must not be empty.`)

  return trimmed
}

function validateCharacterRange(minCharacters: number, maxCharacters: number) {
  if (!Number.isInteger(minCharacters) || minCharacters <= 0) {
    throw new Error('minCharacters must be a positive integer.')
  }

  if (!Number.isInteger(maxCharacters) || maxCharacters <= 0) {
    throw new Error('maxCharacters must be a positive integer.')
  }

  if (minCharacters > maxCharacters) {
    throw new Error('minCharacters must be less than or equal to maxCharacters.')
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
