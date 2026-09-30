import { useEffect } from 'react'

const ACTIVE_PAGE_STORAGE_KEY = 'reframe.activePage'
const THREADS_CALLBACK_TARGET_PATH = '/connecting-apps'

export function buildThreadsCallbackRedirect(search: string) {
  return `${THREADS_CALLBACK_TARGET_PATH}${search || ''}`
}

export function ThreadsCallbackPage() {
  useEffect(() => {
    const search = window.location.search || ''

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ACTIVE_PAGE_STORAGE_KEY, 'connecting-apps')
    }

    window.location.replace(buildThreadsCallbackRedirect(search))
  }, [])

  return null
}
