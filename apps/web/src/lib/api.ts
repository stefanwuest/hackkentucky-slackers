const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

type QueryValue = string | number | boolean | null | undefined
export type QueryParams = URLSearchParams | Record<string, QueryValue | QueryValue[]>

export type ApiRequestOptions = Omit<RequestInit, 'body' | 'method'> & {
  searchParams?: QueryParams
}

type InternalApiRequestOptions = Omit<RequestInit, 'method'> & {
  searchParams?: QueryParams
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly payload: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function buildUrl(path: string, searchParams?: QueryParams) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = `${API_BASE_URL}${normalizedPath}`
  if (!searchParams) return url

  const params = searchParams instanceof URLSearchParams ? searchParams : new URLSearchParams()

  if (!(searchParams instanceof URLSearchParams)) {
    Object.entries(searchParams).forEach(([key, value]) => {
      const values = Array.isArray(value) ? value : [value]
      values.forEach((item) => {
        if (item !== null && item !== undefined) params.append(key, String(item))
      })
    })
  }

  const query = params.toString()
  if (!query) return url

  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}${query}`
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object') {
    const { error, message } = payload as { error?: unknown; message?: unknown }
    if (typeof error === 'string') return error
    if (typeof message === 'string') return message
  }

  return fallback
}

async function parseResponse(response: Response) {
  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) return response.json()

  return response.text()
}

async function request<T>(method: string, path: string, { searchParams, ...init }: InternalApiRequestOptions = {}) {
  const response = await fetch(buildUrl(path, searchParams), { ...init, method })
  const payload = await parseResponse(response)

  if (!response.ok) {
    throw new ApiError(getErrorMessage(payload, response.statusText || 'API request failed.'), response.status, payload)
  }

  return payload as T
}

function jsonHeaders(headers: HeadersInit | undefined) {
  const nextHeaders = new Headers(headers)
  if (!nextHeaders.has('content-type')) nextHeaders.set('content-type', 'application/json')
  return nextHeaders
}

export const api = {
  get: <T>(path: string, options?: ApiRequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    request<T>('POST', path, {
      ...options,
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: body === undefined ? options?.headers : jsonHeaders(options?.headers),
    }),
}
