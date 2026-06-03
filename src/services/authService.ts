import { buildApiHeaders, buildApiUrl } from '../config/api'

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

export type ThreadsSocialAccountState = {
  connected?: boolean
  needsReconnect?: boolean
  username?: string
  accountId?: string
  threadsId?: string
  token?: string
  refreshToken?: string
  expiresAt?: string
  updatedAt?: string
  [key: string]: unknown
}

export type AuthMeState = {
  user: AuthUser
  socialAccounts: {
    threads?: ThreadsSocialAccountState
    [key: string]: unknown
  } | null
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
  socialAccounts?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function getStringFromKeys(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = getString(record[key])

    if (value) {
      return value
    }
  }

  return undefined
}

function getBooleanFromKeys(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]

    if (typeof value === 'boolean') {
      return value
    }
  }

  return undefined
}

function looksLikeThreadsAccountRecord(record: Record<string, unknown>) {
  return Boolean(
    getStringFromKeys(record, ['expiresAt', 'expires_at']) ||
      getStringFromKeys(record, ['refreshToken', 'refresh_token']) ||
      getStringFromKeys(record, ['platformUserId', 'platform_user_id']) ||
      getStringFromKeys(record, ['accountId', 'account_id']) ||
      getStringFromKeys(record, ['threadsId', 'threads_id']) ||
      getStringFromKeys(record, ['username', 'user_name']) ||
      getBooleanFromKeys(record, ['connected']) !== undefined ||
      getBooleanFromKeys(record, ['needsReconnect', 'needs_reconnect']) !== undefined,
  )
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

function normalizeThreadsSocialAccount(candidate: unknown) {
  if (!isRecord(candidate)) {
    return null
  }

  const expiresAt =
    getStringFromKeys(candidate, ['expiresAt', 'expires_at']) ||
    getString(candidate.expiresAt)
  const parsedExpiresAt = expiresAt ? Date.parse(expiresAt) : Number.NaN
  const hasValidExpiry = Number.isFinite(parsedExpiresAt)
  const isExpired = hasValidExpiry ? parsedExpiresAt <= Date.now() : true
  const refreshToken = getStringFromKeys(candidate, ['refreshToken', 'refresh_token'])
  const token = getStringFromKeys(candidate, ['token', 'accessToken', 'access_token'])
  const accountId = getStringFromKeys(candidate, ['accountId', 'account_id', 'platformUserId', 'platform_user_id'])
  const threadsId = getStringFromKeys(candidate, ['threadsId', 'threads_id'])
  const username = getStringFromKeys(candidate, ['username', 'user_name'])
  const connectedOverride = getBooleanFromKeys(candidate, ['connected'])
  const needsReconnectOverride = getBooleanFromKeys(candidate, ['needsReconnect', 'needs_reconnect'])
  const hasConnectionRow = Boolean(token || refreshToken || accountId || threadsId || username)

  return {
    ...candidate,
    connected:
      connectedOverride ??
      (hasConnectionRow && !isExpired && hasValidExpiry),
    needsReconnect:
      needsReconnectOverride ?? (hasConnectionRow ? !Boolean(connectedOverride ?? (!isExpired && hasValidExpiry)) : undefined),
    username,
    accountId,
    threadsId,
    token,
    refreshToken,
    expiresAt,
    updatedAt: getStringFromKeys(candidate, ['updatedAt', 'updated_at']),
  }
}

function normalizeAuthMeState(payload: ApiResponse): AuthMeState | null {
  const session = normalizeSessionPayload(payload)
  const dataRecord = isRecord(payload.data) ? payload.data : null
  const fallbackUser = normalizeUser(payload.data ?? payload.user ?? payload.session)
  const user = session?.user ?? fallbackUser

  if (!user) {
    return null
  }

  const socialAccountsRecord = isRecord(dataRecord?.socialAccounts)
    ? (dataRecord.socialAccounts as Record<string, unknown>)
    : isRecord(dataRecord?.social_accounts)
      ? (dataRecord.social_accounts as Record<string, unknown>)
      : isRecord(payload.socialAccounts)
        ? (payload.socialAccounts as Record<string, unknown>)
        : isRecord((payload as Record<string, unknown>).social_accounts)
          ? ((payload as Record<string, unknown>).social_accounts as Record<string, unknown>)
          : null

  const threadsCandidate = socialAccountsRecord
    ? socialAccountsRecord.threads ??
      socialAccountsRecord.threads_account ??
      socialAccountsRecord.thread
    : undefined
  const directThreadsCandidate =
    socialAccountsRecord && looksLikeThreadsAccountRecord(socialAccountsRecord)
      ? socialAccountsRecord
      : undefined
  const providerCandidate =
    socialAccountsRecord &&
    (socialAccountsRecord.platform === 'threads' ||
      socialAccountsRecord.platform === 'THREADS' ||
      socialAccountsRecord.provider === 'threads')
      ? socialAccountsRecord
      : undefined

  const threads =
    normalizeThreadsSocialAccount(threadsCandidate) ??
    normalizeThreadsSocialAccount(directThreadsCandidate) ??
    normalizeThreadsSocialAccount(providerCandidate)

  return {
    user,
    socialAccounts: socialAccountsRecord
      ? {
          ...socialAccountsRecord,
          threads: threads ?? undefined,
        }
      : null,
  }
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
  const headers = buildApiHeaders({ additionalHeaders })

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
  const authState = await getCurrentAuthState()

  return authState?.user ?? null
}

export async function getCurrentAuthState() {
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

  return normalizeAuthMeState(data)
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
