import { useAuthStore } from '@/store/authStore'

// The Next.js frontend is a separate origin from the FastAPI backend (no dev
// proxy, unlike the Vite app). Set NEXT_PUBLIC_API_BASE_URL to point at the
// backend; defaults to the local dev backend on :8000.
const API_ORIGIN = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'
const API_BASE = `${API_ORIGIN}/api/v1`

export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  auth?: boolean
}

async function parseErrorBody(response: Response): Promise<{ code: string; message: string }> {
  try {
    const data = await response.json()
    if (data?.error?.code) return { code: data.error.code, message: data.error.message ?? 'Request failed.' }
    if (data?.detail?.error?.code) return { code: data.detail.error.code, message: data.detail.error.message }
    return { code: 'UNKNOWN_ERROR', message: response.statusText || 'Request failed.' }
  } catch {
    return { code: 'UNKNOWN_ERROR', message: response.statusText || 'Request failed.' }
  }
}

async function rawRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (auth) {
    const token = useAuthStore.getState().accessToken
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (response.status === 204) return undefined as T

  if (!response.ok) {
    const { code, message } = await parseErrorBody(response)
    throw new ApiError(response.status, code, message)
  }

  return (await response.json()) as T
}

let refreshPromise: Promise<void> | null = null

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    return await rawRequest<T>(path, options)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && options.auth !== false) {
      const { refreshToken, setTokens, logout } = useAuthStore.getState()
      if (!refreshToken) {
        logout()
        throw error
      }
      try {
        if (!refreshPromise) {
          refreshPromise = rawRequest<{ access_token: string; refresh_token: string }>('/auth/refresh', {
            method: 'POST',
            body: { refresh_token: refreshToken },
            auth: false,
          }).then((tokens) => {
            setTokens(tokens.access_token, tokens.refresh_token)
          }).finally(() => {
            refreshPromise = null
          })
        }
        await refreshPromise
        return await rawRequest<T>(path, options)
      } catch {
        logout()
        throw error
      }
    }
    throw error
  }
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PUT', body }),
  // Takes an optional body: a delete that has to be justified (an admin
  // deleting a user) carries its reason here rather than in the query string,
  // where a long or multiline reason does not belong.
  delete: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'DELETE', body }),
  publicGet: <T>(path: string) => apiRequest<T>(path, { method: 'GET', auth: false }),
  publicPost: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'POST', body, auth: false }),
}
