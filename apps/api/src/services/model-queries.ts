import { OpenRouter } from '@openrouter/sdk'
import type { ChatJsonSchemaConfig, ChatMessages, ChatResult } from '@openrouter/sdk/models'
import { CAKE_SHAPES, CAKE_SIZES, type AppBindings, type CakeShape, type CakeSize } from '../types'

export type OpenAiChatModel = `openai/${string}`

export const DEFAULT_OPENAI_CHAT_MODEL = 'openai/gpt-4o-mini' satisfies OpenAiChatModel

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

export type ModelQueryServiceOptions = {
  apiKey: string
  appTitle?: string
  httpReferer?: string
  model?: OpenAiChatModel
}

export type SingleTurnJsonQueryOptions<TResponse> = {
  systemPrompt?: string
  userPrompt: string
  schema: JsonSchema
  schemaDescription?: string
  schemaName: string
  model?: OpenAiChatModel
  temperature?: number
  maxTokens?: number
  parseResponse?: (value: unknown) => TResponse
}

export type ModelQueryService = {
  singleTurnJsonQuery: <TResponse>(options: SingleTurnJsonQueryOptions<TResponse>) => Promise<TResponse>
  createCakeMessage: (request: CakeMessageRequest) => Promise<CakeMessageResponse>
}

export function createModelQueryService(options: ModelQueryServiceOptions): ModelQueryService {
  const apiKey = options.apiKey.trim()
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is required to call models.')

  const defaultModel = options.model ?? DEFAULT_OPENAI_CHAT_MODEL
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

  return {
    singleTurnJsonQuery,
    createCakeMessage,
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

function isCakeSize(value: unknown): value is CakeSize {
  return typeof value === 'string' && CAKE_SIZES.includes(value as CakeSize)
}

function isCakeShape(value: unknown): value is CakeShape {
  return typeof value === 'string' && CAKE_SHAPES.includes(value as CakeShape)
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
