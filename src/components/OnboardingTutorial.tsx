import { useState } from 'react'
import { AppIcon } from './AppIcon'

const screens = [
  { title: 'Welcome to Reframe 👋', copy: 'Bikin konten Threads lebih konsisten tanpa harus mikirin ide setiap hari.', visual: <div className="onboarding-orbit"><AppIcon name="sparkles" /><span>Ide</span><i /><span>Konten</span></div> },
  { title: 'Reframe belajar dari kamu', copy: 'Atur Persona dan Content Pillar supaya Reframe memahami siapa kamu, topikmu, dan gaya kontenmu.', visual: <div className="onboarding-equation"><span>Persona</span><b>+</b><span>Pillars</span><i>↓</i><strong>Content Brain</strong></div> },
  { title: 'Dari ide sampai terjadwal', copy: 'Reframe bantu cari ide, membuat konten, sampai menyiapkannya untuk diposting.', visual: <div className="onboarding-journey"><span>Idea</span><i>→</i><span>Content</span><i>→</i><span>Schedule</span><i>→</i><span>Threads</span></div> },
]

export function OnboardingTutorial({ onComplete }: { onComplete: () => void }) {
  const [index, setIndex] = useState(0)
  const screen = screens[index]
  return <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-label="Tutorial Reframe">
    <section className="onboarding-card">
      <div className="onboarding-progress">{screens.map((_, item) => <i key={item} className={item === index ? 'active' : ''} />)}</div>
      <div className="onboarding-visual">{screen.visual}</div>
      <div><p className="eyebrow">Reframe</p><h1>{screen.title}</h1><p>{screen.copy}</p></div>
      <button className="primary-button" type="button" onClick={() => index === screens.length - 1 ? onComplete() : setIndex(index + 1)}>{index === screens.length - 1 ? 'Mulai Setup' : 'Lanjut'}</button>
      {index < screens.length - 1 ? <button className="onboarding-skip" type="button" onClick={onComplete}>Skip</button> : null}
    </section>
  </div>
}
