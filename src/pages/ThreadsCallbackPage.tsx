import { useEffect } from 'react'

export function ThreadsCallbackPage() {
  useEffect(() => {
    const search = window.location.search || ''
    window.location.replace(`/${search}`)
  }, [])

  return null
}
