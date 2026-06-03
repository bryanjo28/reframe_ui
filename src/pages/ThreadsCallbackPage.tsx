import { useEffect } from 'react'

export function ThreadsCallbackPage() {
  useEffect(() => {
    window.location.replace('/')
  }, [])

  return null
}
