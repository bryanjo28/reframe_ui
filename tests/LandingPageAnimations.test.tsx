import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LandingPage } from '../src/pages/LandingPage'

type ObserverCallback = IntersectionObserverCallback

class IntersectionObserverStub {
  static callback: ObserverCallback | null = null
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  root = null
  rootMargin = ''
  thresholds = [0]

  constructor(callback: ObserverCallback) {
    IntersectionObserverStub.callback = callback
  }

  takeRecords() {
    return []
  }
}

describe('landing page motion', () => {
  beforeEach(() => {
    IntersectionObserverStub.callback = null
    vi.stubGlobal('IntersectionObserver', IntersectionObserverStub)
  })

  it('reveals a section when it enters the viewport', () => {
    render(<LandingPage />)
    const howItWorks = document.querySelector('#cara-kerja')

    expect(howItWorks).toHaveClass('landing-reveal')
    expect(howItWorks).not.toHaveClass('is-visible')

    IntersectionObserverStub.callback?.(
      [{ isIntersecting: true, target: howItWorks } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    )

    expect(howItWorks).toHaveClass('is-visible')
  })

  it('exposes a smooth mobile menu state when toggled', () => {
    render(<LandingPage />)
    const toggle = screen.getByRole('button', { name: 'Buka menu' })
    const menu = screen.getByTestId('landing-mobile-menu')

    expect(menu).toHaveAttribute('data-state', 'closed')

    fireEvent.click(toggle)

    expect(screen.getByRole('button', { name: 'Tutup menu' })).toHaveAttribute('aria-expanded', 'true')
    expect(menu).toHaveClass('open')
    expect(menu).toHaveAttribute('data-state', 'open')
  })
})
