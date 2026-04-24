import type { NavKey } from '../types/navigation'

type SummaryCard = {
  label: string
  value: string
  note: string
}

type ActionCard = {
  eyebrow: string
  title: string
  description: string
}

type ScheduleRow = {
  title: string
  schedule: string
  status: string
}

const summaryCards: SummaryCard[] = [
  {
    label: 'Persona ready',
    value: '12',
    note: '3 masih perlu review.',
  },
  {
    label: 'Content library',
    value: '136',
    note: 'Siap dipakai untuk generate dan schedule.',
  },
  {
    label: 'Auto post active',
    value: '24',
    note: 'Mix fixed time dan random slot.',
  },
]

const actionCards: ActionCard[] = [
  {
    eyebrow: 'Persona',
    title: 'Bentuk persona',
    description: 'Isi persona, enhance dengan AI, lalu review sebelum dipakai.',
  },
  {
    eyebrow: 'Pillar',
    title: 'Susun content pillar',
    description: 'Rapikan template content dan siapkan affiliate link opsional.',
  },
  {
    eyebrow: 'Generate',
    title: 'Generate batch content',
    description: 'Pilih persona dan pillar, lalu hasilkan content sesuai kebutuhan.',
  },
  {
    eyebrow: 'Schedule',
    title: 'Kelola auto post',
    description: 'Jadwalkan content dari library dan pantau queue aktif.',
  },
]

const scheduleRows: ScheduleRow[] = [
  {
    title: 'Batch edukasi pagi',
    schedule: 'Setiap hari, 08:30 WIB',
    status: 'Active',
  },
  {
    title: 'Promo affiliate weekend',
    schedule: 'Random slot 18:00 - 21:00 WIB',
    status: 'Queued',
  },
]

const pageMeta: Record<NavKey, { eyebrow: string; title: string; description: string }> = {
  dashboard: {
    eyebrow: 'Reframe Overview',
    title: 'Semua workflow inti Reframe dalam satu tempat.',
    description:
      'Mulai dari persona, content pillar, generate content, sampai auto post tanpa dashboard yang terlalu padat.',
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
  'generate-content': {
    eyebrow: 'Reframe Generator',
    title: 'Pilih persona dan pilar, lalu hasilkan batch content dalam sekali jalan.',
    description:
      'Kontrol jumlah konten dan quality review ditampilkan jelas supaya flow generate di Reframe lebih enak dipantau.',
  },
  'auto-post': {
    eyebrow: 'Reframe Scheduler',
    title: 'Atur schedule posting dari content library dengan fixed time atau random slot.',
    description:
      'Queue posting, status schedule, dan tindakan hapus jadwal disusun supaya operasional harian di Reframe lebih praktis.',
  },
  'connecting-apps': {
    eyebrow: 'Reframe Connections',
    title: 'Hubungkan seluruh channel publish tanpa keluar dari dashboard.',
    description:
      'Sidebar tetap diam, area tengah berganti sesuai halaman aktif supaya pengalaman memakai Reframe terasa ringan.',
  },
}

export function DashboardPage({ activePage }: { activePage: NavKey }) {
  const meta = pageMeta[activePage]

  return (
    <>
      <section className="hero-panel dashboard-hero">
        <div>
          <p className="eyebrow">{meta.eyebrow}</p>
          <h1>{meta.title}</h1>
          <p className="hero-copy">{meta.description}</p>
        </div>
        <div className="hero-actions">
          <button className="ghost-button">Open Persona</button>
          <button className="primary-button">Generate Content</button>
        </div>
      </section>

      <section className="stats-grid compact">
        {summaryCards.map((card) => (
          <article className="stat-card" key={card.label}>
            <span className="stat-label">{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.note}</p>
          </article>
        ))}
      </section>

      <section className="quick-actions-grid">
        {actionCards.map((card) => (
          <article className="panel quick-action-card" key={card.title}>
            <p className="eyebrow">{card.eyebrow}</p>
            <h2>{card.title}</h2>
            <p>{card.description}</p>
          </article>
        ))}
      </section>

      <section className="panel dashboard-focus-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Operational Focus</p>
            <h2>Schedule yang perlu dipantau</h2>
          </div>
          <span className="pill subtle">2 queue</span>
        </div>

        <div className="queue-list">
          {scheduleRows.map((row) => (
            <div className="queue-row" key={row.title}>
              <div>
                <strong>{row.title}</strong>
                <p>{row.schedule}</p>
              </div>
              <div className="queue-actions">
                <span className={`status-badge ${row.status.toLowerCase()}`}>
                  {row.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
