import { OpenRouter } from '@openrouter/sdk'
import type { ChatJsonSchemaConfig, ChatMessages, ChatResult } from '@openrouter/sdk/models'
import type { AppBindings } from '../types'

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
  },
  required: ['message'],
} as const

type JsonSchema = Exclude<ChatJsonSchemaConfig['schema'], undefined>

type CakeMessageResponse = {
  message: string
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
  createCakeMessage: (occasion: string) => Promise<string>
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

  async function createCakeMessage(occasion: string) {
    const response = await singleTurnJsonQuery<CakeMessageResponse>({
      schemaName: 'cake_message',
      schemaDescription: 'A short celebratory message suitable for writing on a cake.',
      schema: CAKE_MESSAGE_SCHEMA,
      systemPrompt: 'You write concise, warm cake messages. Return only data matching the supplied JSON schema.',
      userPrompt: `Write a cake message for this occasion: ${occasion}`,
      maxTokens: 80,
      temperature: 0.7,
      parseResponse: parseCakeMessageResponse,
    })

    return response.message
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
  if (!isRecord(value) || typeof value.message !== 'string' || value.message.trim().length === 0) {
    throw new Error('Model response did not match the cake message schema.')
  }

  return {
    message: value.message,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
