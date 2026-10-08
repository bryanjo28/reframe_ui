import { useEffect, useMemo, useState } from 'react'
import { AppIcon } from '../components/AppIcon'
import { listContentOutputs, type ContentOutputRecord } from '../services/contentOutputs'
import { listContentTopics } from '../services/contentTopics'
import { listContentPillars } from '../services/contentPillars'
import type { NavKey } from '../types/navigation'

type Pipeline = { ideas: number; drafts: number; approved: number; scheduled: number; published: number }
const emptyPipeline: Pipeline = { ideas: 0, drafts: 0, approved: 0, scheduled: 0, published: 0 }
const statusOf = (record: ContentOutputRecord) => String(record.status || '').trim().toLowerCase()

export function DashboardPage({ userId, onNavigate, isThreadsConnected }: { activePage: NavKey; userId: string; onNavigate: (page: NavKey) => void; isThreadsConnected: boolean }) {
  const [pipeline, setPipeline] = useState<Pipeline>(emptyPipeline)
  const [recent, setRecent] = useState<ContentOutputRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pillarCount, setPillarCount] = useState(0)

  useEffect(() => {
    let mounted = true
    async function load() {
      setIsLoading(true)
      try {
        const [outputs, topics, pillars] = await Promise.all([listContentOutputs(userId || undefined), listContentTopics(), listContentPillars()])
        if (!mounted) return
        const count = (statuses: string[]) => outputs.filter((item) => statuses.includes(statusOf(item))).length
        setPipeline({ ideas: topics.length, drafts: count(['draft', 'generated']), approved: count(['approved', 'ready']), scheduled: count(['scheduled', 'queued']), published: count(['published', 'posted']) })
        setRecent(outputs.slice(0, 4))
        setPillarCount(pillars.length)
      } catch { if (mounted) setPipeline(emptyPipeline) } finally { if (mounted) setIsLoading(false) }
    }
    void load()
    return () => { mounted = false }
  }, [userId])

  const nextAction = useMemo(() => {
    if (pillarCount === 0) return { title: 'Tambahkan Content Pillar', copy: 'Lengkapi Content Brain agar Reframe punya arah topik yang jelas.', label: 'Lanjut Setup', page: 'content-pillar' as NavKey }
    if (pipeline.approved > 0 && !isThreadsConnected) return { title: 'Konten kamu sudah siap.', copy: 'Hubungkan Threads supaya konten bisa dijadwalkan.', label: 'Hubungkan Threads', page: 'connecting-apps' as NavKey }
    if (pipeline.approved > 0) return { title: `${pipeline.approved} posts are ready to schedule`, copy: 'Pick a time and keep your publishing queue moving.', label: 'Schedule Posts', page: 'auto-post' as NavKey }
    if (pipeline.drafts > 0) return { title: `${pipeline.drafts} drafts are waiting for review`, copy: 'Review and approve your content before scheduling.', label: 'Review Content', page: 'content-bank' as NavKey }
    if (pipeline.ideas > 0) return { title: 'Your ideas are ready', copy: 'Turn an idea into content your audience will want to read.', label: 'Create Content', page: 'content-engine' as NavKey }
    return { title: "Let's find your next idea", copy: 'Generate ideas from your persona and content pillars.', label: 'Find Ideas', page: 'generate-topic' as NavKey }
  }, [isThreadsConnected, pillarCount, pipeline])

  return <section className="home-page">
    <header className="page-header outcome-header"><p className="eyebrow">Home</p><h1>Your content, at a glance</h1><p className="page-description">Pick up the most useful next step.</p></header>
    <section className="home-next-action"><div className="home-next-icon"><AppIcon name="sparkles" /></div><div><span>Next action</span><h2>{isLoading ? 'Loading your workspace…' : nextAction.title}</h2><p>{nextAction.copy}</p></div><button className="primary-button" type="button" onClick={() => onNavigate(nextAction.page)} disabled={isLoading}>{nextAction.label}</button></section>
    <section className="pipeline-grid" aria-label="Content pipeline">{Object.entries(pipeline).map(([label, value]) => <article key={label}><span>{label}</span><strong>{isLoading ? '—' : value}</strong></article>)}</section>
    <div className="home-detail-grid">
      <section className="panel home-recent-panel"><div className="panel-heading"><div><p className="eyebrow">Content pipeline</p><h2>Recent content</h2></div><button className="text-button" type="button" onClick={() => onNavigate('content-bank')}>View all</button></div>{recent.length ? <div className="home-recent-list">{recent.map((item, index) => <article key={String(item.id || index)}><span className={`status-dot ${statusOf(item)}`} /><div><strong>{String(item.content || item.title || `Content ${index + 1}`).slice(0, 88)}</strong><small>{statusOf(item) || 'draft'}</small></div></article>)}</div> : <div className="outcome-empty"><AppIcon name="layers" /><div><strong>No content yet</strong><p>Create your first post from an idea.</p></div><button className="ghost-button" type="button" onClick={() => onNavigate('create')}>Create Content</button></div>}</section>
      <section className="panel home-upcoming-panel"><p className="eyebrow">Upcoming</p><h2>Your schedule</h2>{pipeline.scheduled ? <p><strong>{pipeline.scheduled}</strong> posts are currently scheduled.</p> : <div className="outcome-empty compact"><AppIcon name="calendar" /><div><strong>Nothing scheduled yet</strong><p>Approved posts will be ready to place on your schedule.</p></div></div>}<button className="ghost-button" type="button" onClick={() => onNavigate('auto-post')}>Open Schedule</button></section>
    </div>
  </section>
}
