const THREADS_CALLBACK_TARGET_PATH = '/connecting-apps'

export function buildThreadsCallbackRedirect(search: string) {
  const callbackParams = new URLSearchParams(search)
  const safeParams = new URLSearchParams()
  const connected = callbackParams.get('connected')
  const error = callbackParams.get('error')

  if (connected === 'true') {
    safeParams.set('connected', connected)
  }

  if (error) {
    safeParams.set('error', error)
  }

  const safeSearch = safeParams.toString()

  return `${THREADS_CALLBACK_TARGET_PATH}${safeSearch ? `?${safeSearch}` : ''}`
}
