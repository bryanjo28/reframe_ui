import { buildApiUrl } from '../config/api'

const AUTH_TOKEN_STORAGE_KEY = 'reframe.authToken'

export type AuthCredentials = {
  email: string
  password: string
}

export type RegisterCredentials = {
  email: string
  accountName: string
  password: string
}

export type AuthUser = {
  id: string
  email?: string
  username?: string
  name?: string
  accountName?: string
  fullName?: string
  role?: string
  [key: string]: unknown
}

export type AuthSession = {
  token?: string
  user: AuthUser
}

type ApiResponse = {
  success?: boolean
  message?: string
  data?: unknown
  user?: unknown
  profile?: unknown
  token?: unknown
  accessToken?: unknown
  session?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function getTokenFromRecord(value: unknown) {
  if (!isRecord(value)) {
    return undefined
  }

  return getString(value.accessToken) || getString(value.token)
}

function normalizeUser(candidate: unknown): AuthUser | null {
  if (!isRecord(candidate)) {
    return null
  }

  const id = getString(candidate.id ?? candidate.userId ?? candidate.user_id)

  if (!id) {
    return null
  }

  return {
    ...candidate,
    id,
    email: getString(candidate.email),
    username: getString(candidate.username),
    name: getString(candidate.name),
    accountName: getString(candidate.accountName),
    fullName: getString(candidate.fullName),
    role: getString(candidate.role),
  }
}

function normalizeProfile(candidate: unknown) {
  if (!isRecord(candidate)) {
    return null
  }

  return {
    id: getString(candidate.id),
    accountName: getString(candidate.accountName ?? candidate.account_name),
    fullName: getString(candidate.fullName ?? candidate.full_name),
    role: getString(candidate.role),
  }
}

function mergeUserProfile(user: AuthUser, profile: ReturnType<typeof normalizeProfile>) {
  if (!profile) {
    return user
  }

  return {
    ...user,
    accountName: profile.accountName ?? user.accountName,
    fullName: profile.fullName ?? user.fullName,
    role: profile.role ?? user.role,
  }
}

function normalizeSessionPayload(payload: ApiResponse): AuthSession | null {
  const candidates = [payload.data, payload.user, payload.session]

  for (const candidate of candidates) {
    const user = normalizeUser(candidate)
    const profile = normalizeProfile(isRecord(candidate) ? candidate.profile : payload.profile)

    if (user) {
      const candidateRecord = isRecord(candidate) ? candidate : undefined
      const token =
        getString(payload.token) ||
        getString(payload.accessToken) ||
        getString(candidateRecord?.token) ||
        getString(candidateRecord?.accessToken) ||
        getTokenFromRecord(candidateRecord?.session)

      const mergedUser = mergeUserProfile(user, profile)

      return token ? { token, user: mergedUser } : { user: mergedUser }
    }

    if (isRecord(candidate)) {
      const nestedUser = normalizeUser(candidate.user)
      const rawSession = candidate.session
      const nestedSession = isRecord(rawSession) ? rawSession : undefined
      const nestedProfile = normalizeProfile(candidate.profile)

      if (nestedUser) {
        const token =
          getString(payload.token) ||
          getString(payload.accessToken) ||
          getString(candidate.token) ||
          getString(candidate.accessToken) ||
          getTokenFromRecord(nestedSession)

        const mergedUser = mergeUserProfile(nestedUser, nestedProfile)

        return token ? { token, user: mergedUser } : { user: mergedUser }
      }

      const sessionUser = normalizeUser(nestedSession?.user)

      if (sessionUser) {
        const token =
          getString(payload.token) ||
          getString(payload.accessToken) ||
          getTokenFromRecord(nestedSession)

        const mergedUser = mergeUserProfile(sessionUser, nestedProfile)

        return token ? { token, user: mergedUser } : { user: mergedUser }
      }
    }
  }

  return null
}

function getStoredAuthToken() {
  if (typeof localStorage === 'undefined') {
    return undefined
  }

  return getString(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY))
}

function setStoredAuthToken(token?: string) {
  if (typeof localStorage === 'undefined') {
    return
  }

  if (token) {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
  } else {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
  }
}

function buildRequestHeaders(additionalHeaders: Record<string, string> = {}) {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...additionalHeaders,
  }

  const token = getStoredAuthToken()

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

async function parseAuthResponse(response: Response) {
  const data = (await response.json()) as ApiResponse
  const session = normalizeSessionPayload(data)

  if (!session) {
    throw new Error('Respons auth tidak valid.')
  }

  if (session.token) {
    setStoredAuthToken(session.token)
  }

  return session
}

export function clearAuthSession() {
  setStoredAuthToken(undefined)
}

export async function login(payload: AuthCredentials) {
  const response = await fetch(buildApiUrl('/api/auth/login'), {
    method: 'POST',
    headers: buildRequestHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error('Login gagal. Periksa email/username dan password.')
  }

  return parseAuthResponse(response)
}

export async function register(payload: RegisterCredentials) {
  const response = await fetch(buildApiUrl('/api/auth/register'), {
    method: 'POST',
    headers: buildRequestHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error('Register gagal. Periksa input yang dimasukkan.')
  }

  return parseAuthResponse(response)
}

export async function getCurrentUser() {
  const response = await fetch(buildApiUrl('/api/auth/me'), {
    method: 'GET',
    headers: buildRequestHeaders(),
  })

  if (response.status === 401) {
    return null
  }

  if (!response.ok) {
    throw new Error('Gagal mengambil data user aktif.')
  }

  const data = (await response.json()) as ApiResponse
  const session = normalizeSessionPayload(data)
  let user = session?.user ?? null

  if (!user) {
    const fallbackUser = normalizeUser(data.data ?? data.user ?? data.session)

    if (fallbackUser) {
      user = mergeUserProfile(
        fallbackUser,
        normalizeProfile(isRecord(data.data) ? data.data.profile : data.profile),
      )
    }
  }

  if (!user) {
    throw new Error('Data user aktif tidak valid.')
  }

  return user
}

export function getCurrentAuthToken() {
  return getStoredAuthToken()
}

export async function logout() {
  const response = await fetch(buildApiUrl('/api/auth/logout'), {
    method: 'POST',
    headers: buildRequestHeaders(),
  })

  clearAuthSession()

  if (!response.ok && response.status !== 401) {
    throw new Error('Logout gagal.')
  }
}
