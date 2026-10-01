import { useEffect } from 'react'
import { buildThreadsCallbackRedirect } from '../utils/threadsCallback'

const ACTIVE_PAGE_STORAGE_KEY = 'reframe.activePage'

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
