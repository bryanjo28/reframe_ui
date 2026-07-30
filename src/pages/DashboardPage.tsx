import type { NavKey } from '../types/navigation'
import { useEffect, useMemo, useState } from 'react'
import { listContentOutputs } from '../services/contentOutputs'
import { listPersonaConfigs } from '../services/personaConfigs'

type FocusStat = {
  label: string
  value: string
  note: string
}

type OperationalItem = {
  title: string
  description: string
  tone: 'ready' | 'active' | 'watch'
}

const operationalItems: OperationalItem[] = [
  {
    title: 'Persona review',
    description: 'Rapikan persona yang masih draft atau belum final sebelum dipakai.',
    tone: 'ready',
  },
  {
    title: 'Content pipeline',
    description: 'Pantau batch approved, lanjutkan yang siap publish, dan bereskan yang pending.',
    tone: 'active',
  },
  {
    title: 'Operational focus',
    description: 'Awasi engine, queue, dan slot posting supaya alur tetap rapi setiap hari.',
    tone: 'watch',
  },
]

const pageMeta: Record<NavKey, { eyebrow: string; title: string; description: string }> = {
  dashboard: {
    eyebrow: 'Reframe Overview',
    title: 'Dashboard Reframe yang lebih fokus.',
    description:
      'Tampilan utama sekarang diringkas ke 4 inti: persona ready, content ready, engine nyala, dan operational focus.',
  },
  personalize: {
    eyebrow: 'Reframe Personalize',
    title: 'Satukan setup persona dan content pillar dalam satu flow chat.',
    description:
      'User tinggal pindah tab antara Persona dan Content Pillar tanpa loncat ke menu berbeda.',
  },
  'create-persona-chat': {
    eyebrow: 'Reframe Persona Setup',
    title: 'Bangun persona pertama lewat flow chat yang lebih terasa seperti game.',
    description:
      'Mode onboarding dibuat fokus, tanpa sidebar, supaya user bisa ngobrol dengan AI satu langkah demi satu langkah.',
  },
  'create-persona': {
    eyebrow: 'Reframe Persona',
    title: 'Bangun persona yang matang sebelum masuk ke proses content generation.',
    description:
      'Reframe membantu tim menyusun persona, enhance dengan AI, lalu review sebelum persona dipakai ke workflow berikutnya.',
  },
  'content-pillar': {
    eyebrow: 'Reframe Pillars',
    title: 'Susun pilar konten yang rapi supaya output AI tetap konsisten.',
    description:
      'Fokus utamanya ada di template content, penyempurnaan wording, dan penyisipan affiliate link yang relevan di dalam Reframe.',
  },
  'generate-topic': {
    eyebrow: 'Reframe Generator',
    title: 'Generate batch content dari template dan pillar.',
    description:
      'Kontrol jumlah konten dan quality review ditampilkan jelas supaya flow generate di Reframe lebih enak dipantau.',
  },
  'content-engine': {
    eyebrow: 'Reframe Content Engine',
    title: 'Pilih template, pillar, lalu generate topic dalam satu panel.',
    description:
      'Tampilan awalnya sederhana: pilih sumber konten, review payload, lalu lanjut ke proses berikutnya.',
  },
  'auto-post': {
    eyebrow: 'Reframe Auto Post',
    title: 'Draft post, pilih waktu, lalu siapkan auto post sederhana.',
    description:
      'Mode ini dipakai buat menyiapkan konten posting dan jadwal sebelum nanti tersambung ke queue backend.',
  },
  'subscription-plans': {
    eyebrow: 'Reframe Billing',
    title: 'Lihat paket aktif dan paket yang sedang dimiliki akun ini.',
    description:
      'Card plan menampilkan status owned/current plan supaya user langsung tahu paket yang sedang aktif.',
  },
  'manual-post': {
    eyebrow: 'Reframe Scheduler',
    title: 'Kelola auto post yang sudah siap jalan.',
    description:
      'Lihat queue aktif, cek detail topic, lalu lanjutkan ke proses penjadwalan posting.',
  },
  'connecting-apps': {
    eyebrow: 'Reframe Connections',
    title: 'Hubungkan seluruh channel publish tanpa keluar dari dashboard.',
    description:
      'Sidebar tetap diam, area tengah berganti sesuai halaman aktif supaya pengalaman memakai Reframe terasa ringan.',
  },
}

export function DashboardPage({
  activePage,
  userId,
}: {
  activePage: NavKey
  userId: string
}) {
  const meta = pageMeta[activePage]
  const [personaReady, setPersonaReady] = useState(0)
  const [contentReady, setContentReady] = useState(0)
  const [engineActive, setEngineActive] = useState(0)

  useEffect(() => {
    let isMounted = true

    async function loadDashboardStats() {
      try {
        const [personaConfigs, contentOutputs] = await Promise.all([
          listPersonaConfigs(),
          listContentOutputs(userId || undefined),
        ])

        if (!isMounted) {
          return
        }

        const ownedPersonaConfigs = userId
          ? personaConfigs.filter((record) => {
              const ownerId =
                (typeof record.userId === 'string' && record.userId) ||
                (typeof record.user_id === 'string' && record.user_id) ||
                (typeof record.ownerId === 'string' && record.ownerId) ||
                (typeof record.owner_id === 'string' && record.owner_id) ||
                ''

              return !ownerId || ownerId === userId
            })
          : personaConfigs

        const draftOutputs = contentOutputs.filter(
          (record) => record.status?.trim().toLowerCase() === 'draft',
        )
        const activeEngineOutputs = contentOutputs.filter((record) => {
          const status = record.status?.trim().toLowerCase() || ''
          return ['approved', 'scheduled', 'queued', 'published', 'posted'].includes(status)
        })

        setPersonaReady(ownedPersonaConfigs.length)
        setContentReady(draftOutputs.length)
        setEngineActive(activeEngineOutputs.length)
      } catch {
        if (!isMounted) {
          return
        }

        setPersonaReady(0)
        setContentReady(0)
        setEngineActive(0)
      }
    }

    void loadDashboardStats()

    return () => {
      isMounted = false
    }
  }, [userId])

  const focusStats = useMemo<FocusStat[]>(
    () => [
      {
        label: 'Persona ready',
        value: personaReady.toLocaleString('id-ID'),
        note: 'Persona yang sudah siap dipakai ke workflow berikutnya.',
      },
      {
        label: 'Content ready',
        value: contentReady.toLocaleString('id-ID'),
        note: 'Konten draft yang siap diproses lebih lanjut di engine.',
      },
      {
        label: 'Engine nyala',
        value: engineActive.toLocaleString('id-ID'),
        note: 'Konten aktif yang sedang masuk alur engine atau schedule.',
      },
    ],
    [contentReady, engineActive, personaReady],
  )

  return (
    <section className="dashboard-focus-stack">
      <section className="hero-panel dashboard-hero dashboard-hero-compact">
        <div>
          <p className="eyebrow">{meta.eyebrow}</p>
          <h1>{meta.title}</h1>
          <p className="hero-copy">{meta.description}</p>
        </div>
      </section>

      <section className="dashboard-focus-grid">
        {focusStats.map((card) => (
          <article className="stat-card dashboard-focus-card" key={card.label}>
            <span className="stat-label">{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.note}</p>
          </article>
        ))}
      </section>

      <section className="panel dashboard-ops-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Operational Focus</p>
            <h2>Yang perlu dijaga tetap jalan</h2>
          </div>
          <span className="pill subtle">4 fokus inti</span>
        </div>

        <div className="dashboard-ops-grid">
          {operationalItems.map((item) => (
            <article className="dashboard-ops-card" key={item.title}>
              <span className={`status-badge ${item.tone}`}>{item.tone}</span>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}
