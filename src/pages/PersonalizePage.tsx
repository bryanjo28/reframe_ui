import { useEffect, useState } from 'react'
import { AppIcon } from '../components/AppIcon'
import { listContentPillars, type ContentPillarRecord } from '../services/contentPillars'
import type { PersonaConfigRecord } from '../services/personaConfigs'
import type { NavKey } from '../types/navigation'
import { CreateContentPillarPage } from './CreateContentPillarPage'
import { CreatePersonaPage } from './CreatePersonaPage'

type PersonalizeTab = 'persona' | 'content-pillar'
type Props = { personaConfig: PersonaConfigRecord | null; onPersonaSaved?: (config: PersonaConfigRecord) => void; onPillarSaved?: () => void; initialTab?: PersonalizeTab; onNavigate?: (page: NavKey) => void; tourStep?: number | null }
const valueOf = (record: Record<string, unknown> | null, keys: string[]) => keys.map((key) => record?.[key]).find((value) => typeof value === 'string' && value.trim()) as string || ''

export function PersonalizePage({ personaConfig, onPersonaSaved, onPillarSaved, initialTab, onNavigate, tourStep }: Props) {
  const [activeTab, setActiveTab] = useState<PersonalizeTab | null>(initialTab ?? null)
  const [pillars, setPillars] = useState<ContentPillarRecord[]>([])
  const [brainReady, setBrainReady] = useState(false)
  const isInitialSetup = !personaConfig
  const isPillarSetup = (initialTab === 'content-pillar' || tourStep === 3) && !brainReady
  const isTutorialPersonaStep = tourStep === 2

  useEffect(() => { if (personaConfig) void listContentPillars().then(setPillars).catch(() => setPillars([])) }, [personaConfig])

  if (isInitialSetup) return <CreatePersonaPage personaConfig={personaConfig} isInitialSetup onSaved={(config) => onPersonaSaved?.(config)} />
  if (brainReady) return <section className="brain-ready-wrap"><section className="brain-ready panel"><span className="brain-ready-icon"><AppIcon name="check" /></span><p className="eyebrow">Content Brain</p><h1>Content Brain kamu sudah siap ✓</h1><p>Reframe sekarang sudah punya dasar untuk membantu membuat ide dan kontenmu.</p><button className="primary-button" data-tour-step={tourStep === 4 ? 4 : undefined} type="button" onClick={() => onNavigate?.('generate-topic')}>Cari Ide Pertama</button></section></section>

  return <section className="persona-page">
    {!isPillarSetup ? <header className="page-header outcome-header"><p className="eyebrow">Content Brain</p><h1>Content Brain 🧠</h1><p className="page-description">Ini yang Reframe gunakan untuk memahami kamu dan membuat konten yang lebih sesuai.</p></header> : null}
    {!activeTab ? <>
      <section className="content-brain-flow" aria-label="Content Brain flow"><span>Persona</span><b>+</b><span>Content Pillars</span><AppIcon name="chevron-right" /><span>Ideas</span><AppIcon name="chevron-right" /><span>Content</span></section>
      <div className="content-brain-grid">
        <article className="panel brain-summary"><div className="brain-summary-head"><span className="create-hub-icon"><AppIcon name="user" /></span><div><p className="eyebrow">Persona</p><h2>{valueOf(personaConfig, ['persona','persona_name']) || 'Your persona'}</h2></div></div><dl><div><dt>Audience</dt><dd>{valueOf(personaConfig, ['targetAudience','target_audience']) || 'Not set'}</dd></div><div><dt>Tone</dt><dd>{valueOf(personaConfig, ['tone']) || 'Not set'}</dd></div></dl><button className="ghost-button" type="button" onClick={() => setActiveTab('persona')}>Edit Persona</button></article>
        <article className="panel brain-summary"><div className="brain-summary-head"><span className="create-hub-icon"><AppIcon name="layers" /></span><div><p className="eyebrow">Content Pillars</p><h2>{pillars.length ? `${pillars.length} topics` : 'No pillars yet'}</h2></div></div><div className="brain-pillar-chips">{pillars.slice(0,6).map((pillar,index) => <span key={String(pillar.id || index)}>{pillar.name || `Pillar ${index+1}`}</span>)}{!pillars.length ? <p>Topik utama yang menjadi arah kontenmu.</p> : null}</div><button className="ghost-button" type="button" onClick={() => setActiveTab('content-pillar')}>Edit Pillars</button></article>
      </div>
      <p className="brain-footnote">Perubahan pada Content Brain akan digunakan oleh flow generasi yang sudah ada untuk ide dan konten berikutnya.</p>
    </> : <>
      {!isPillarSetup && !isTutorialPersonaStep ? <div className="personalize-context-bar"><div><p className="eyebrow">Editing</p><strong>{activeTab === 'persona' ? 'Persona' : 'Content Pillars'}</strong></div><button type="button" className="ghost-button" onClick={() => setActiveTab(null)}>Back to Content Brain</button></div> : null}
      {activeTab === 'persona' ? <CreatePersonaPage personaConfig={personaConfig} isInitialSetup={isTutorialPersonaStep} onSaved={(config) => onPersonaSaved?.(config)} /> : <CreateContentPillarPage isInitialSetup={isPillarSetup} onSaved={(pillar) => { setPillars((current) => [pillar, ...current.filter((item) => item.id !== pillar.id)]); if (isPillarSetup) { setBrainReady(true); onPillarSaved?.() } }} />}
    </>}
  </section>
}
