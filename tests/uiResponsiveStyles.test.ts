import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const appStyles = readFileSync(resolve(process.cwd(), 'src/App.css'), 'utf8')

describe('responsive content creation styles', () => {
  it('hides the change-topic button on desktop and restores it on mobile', () => {
    expect(appStyles).toMatch(/\.manual-topic-flow\s+\.topic-detail-change\s*{[^}]*display:\s*none/i)
    expect(appStyles).toMatch(
      /@media\s*\(max-width:\s*720px\)[\s\S]*?\.manual-topic-flow\s+\.topic-detail-change\s*{[^}]*display:\s*inline-flex/i,
    )
  })

  it('keeps the persona upgrade dialog compact and constrains its lock icon', () => {
    expect(appStyles).toMatch(/\.idea-upgrade-dialog\s*{[^}]*width:\s*min\(480px,\s*100%\)/i)
    expect(appStyles).toMatch(/\.idea-upgrade-icon\s*{[^}]*width:\s*56px[^}]*height:\s*56px/i)
    expect(appStyles).toMatch(/\.idea-upgrade-icon\s+svg\s*{[^}]*width:\s*24px[^}]*height:\s*24px/i)
  })
})
