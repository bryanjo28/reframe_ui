import { CreateContentPillarPage } from './CreateContentPillarPage'
import { CreatePersonaPage } from './CreatePersonaPage'
import type { PersonaConfigRecord } from '../services/personaConfigs'

type PersonalizeTab = 'persona' | 'content-pillar'

type PersonalizePageProps = {
  personaConfig: PersonaConfigRecord | null
  onPersonaSaved?: (personaConfig: PersonaConfigRecord) => void
  initialTab?: PersonalizeTab
}

export function PersonalizePage({ personaConfig, onPersonaSaved, initialTab }: PersonalizePageProps) {
  const isInitialSetup = !personaConfig
  const activeTab: PersonalizeTab = initialTab ?? 'persona'

  if (isInitialSetup) {
    return (
      <CreatePersonaPage
        personaConfig={personaConfig}
        isInitialSetup
        onSaved={(nextConfig) => {
          onPersonaSaved?.(nextConfig)
        }}
      />
    )
  }

  return activeTab === 'persona' ? (
    <CreatePersonaPage
      personaConfig={personaConfig}
      isInitialSetup={false}
      onSaved={(nextConfig) => {
        onPersonaSaved?.(nextConfig)
      }}
    />
  ) : (
    <CreateContentPillarPage />
  )
}
