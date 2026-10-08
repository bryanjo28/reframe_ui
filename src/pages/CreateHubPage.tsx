import { useEffect, useState } from 'react'
import { AppIcon } from '../components/AppIcon'
import { listContentTopics, type ContentTopicRecord } from '../services/contentTopics'
import type { NavKey } from '../types/navigation'

const topicTitle = (topic: ContentTopicRecord) => String(topic.topic || 'Ide tanpa judul')

export function CreateHubPage({ onNavigate }: { onNavigate: (page: NavKey) => void }) {
  const [topics, setTopics] = useState<ContentTopicRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    void listContentTopics()
      .then((topicRows) => { if (mounted) setTopics(topicRows) })
      .catch(() => { if (mounted) setTopics([]) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  return <section className="create-hub-page create-start-page">
    <header className="page-header outcome-header"><h1>Buat</h1><p className="page-description">Mulai dari ide baru atau gunakan ide yang sudah tersimpan.</p></header>
    <div className="create-flow-progress" aria-label="Alur pembuatan konten"><strong>Ide</strong><span>→</span><span>Buat</span><span>→</span><span>Review</span></div>

    <section className="create-start-options" aria-label="Pilih cara mulai">
      <button className="create-start-option primary" type="button" onClick={() => onNavigate('generate-topic')}>
        <span className="create-start-icon"><AppIcon name="plus" /></span>
        <span><strong>Cari Ide Baru</strong><small>Dapatkan ide berdasarkan Content Brain kamu.</small></span>
        <AppIcon name="chevron-right" />
      </button>
      <button className="create-start-option" type="button" onClick={() => onNavigate('content-engine')}>
        <span className="create-start-icon"><AppIcon name="layers" /></span>
        <span><strong>Gunakan Ide Tersimpan</strong><small>{loading ? 'Memuat ide...' : `${topics.length} ide tersedia untuk dibuat.`}</small></span>
        <AppIcon name="chevron-right" />
      </button>
    </section>

    <section className="create-preview-section">
      <div className="create-section-heading"><div><h2>Ide tersimpan</h2><p>Preview ide yang tersedia di langkah berikutnya.</p></div>{topics.length > 4 ? <button className="schedule-text-button" type="button" onClick={() => onNavigate('content-engine')}>Lihat semua</button> : null}</div>
      {loading ? <div className="create-calm-empty">Memuat ide...</div> : topics.length ? <div className="create-idea-preview">{topics.slice(0, 4).map((topic, index) => <article key={String(topic.id || index)}><span>{index + 1}</span><div><strong>{topicTitle(topic)}</strong><small>{String(topic.category || 'Ide Konten')}</small></div></article>)}</div> : <div className="create-calm-empty"><strong>Belum ada ide tersimpan</strong><p>Cari ide baru untuk mulai membuat konten.</p><button className="schedule-primary" type="button" onClick={() => onNavigate('generate-topic')}>Cari Ide Baru</button></div>}
    </section>
  </section>
}
