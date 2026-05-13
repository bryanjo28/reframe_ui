import { useState } from 'react'
import { CreateContentPillarPage } from './CreateContentPillarPage'
import { CreatePersonaPage } from './CreatePersonaPage'
import type { PersonaConfigRecord } from '../services/personaConfigs'

type PersonalizeTab = 'persona' | 'content-pillar'

type PersonalizePageProps = {
  personaConfig: PersonaConfigRecord | null
  onPersonaSaved?: (personaConfig: PersonaConfigRecord) => void
}

export function PersonalizePage({ personaConfig, onPersonaSaved }: PersonalizePageProps) {
  const [activeTab, setActiveTab] = useState<PersonalizeTab | null>(null)

  return (
    <section className="persona-page">
      <header className="page-header">
        <p className="eyebrow">Workspace</p>
        <h1>Personalize</h1>
        <p className="page-description">
          Satu menu untuk atur Persona dan Content Pillar. User pilih dulu lewat card,
          lalu halaman form lama tampil di bawah.
        </p>
      </header>

      {!activeTab ? (
        <section className="personalize-picker panel">
          <div className="personalize-picker-copy">
            <p className="eyebrow">Choose a flow</p>
            <h2>Pilih dulu yang mau kamu edit</h2>
            <p>
              Kita mulai dari card supaya tampilan awal lebih tenang. Setelah dipilih,
              baru form klasik yang muncul di bawah.
            </p>
          </div>

          <div className="personalize-choice-grid">
            <button
              type="button"
              className="personalize-choice-card"
              onClick={() => setActiveTab('persona')}
            >
              <strong>Persona</strong>
              <p>Bangun atau edit persona dengan field form.</p>
            </button>

            <button
              type="button"
              className="personalize-choice-card"
              onClick={() => setActiveTab('content-pillar')}
            >
              <strong>Content Pillar</strong>
              <p>Susun pillar yang nyambung ke persona dengan field form.</p>
            </button>
          </div>
        </section>
      ) : (
        <div className="personalize-context-bar">
          <div>
            <p className="eyebrow">Active flow</p>
            <strong>{activeTab === 'persona' ? 'Persona' : 'Content Pillar'}</strong>
          </div>
          <button
            type="button"
            className="ghost-button personalize-back-to-chooser"
            onClick={() => setActiveTab(null)}
          >
            Change flow
          </button>
        </div>
      )}

      {activeTab === 'persona' ? (
        <CreatePersonaPage
          personaConfig={personaConfig}
          isInitialSetup={!personaConfig}
          onSaved={(nextConfig) => {
            onPersonaSaved?.(nextConfig)
          }}
        />
      ) : activeTab === 'content-pillar' ? (
        <CreateContentPillarPage />
      ) : null}
    </section>
  )
}
