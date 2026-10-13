import { useEffect } from 'react'
import { dismissModal } from '../utils/modalAnimation'

type Props = { title: string; content: string; onClose: () => void }
const splitMarker = /\s*---THREAD_SPLIT---\s*/g

export function ContentPreviewModal({ title, content, onClose }: Props) {
  const parts = content.split(splitMarker).map((part) => part.trim()).filter(Boolean)
  useEffect(() => { const close = (event: KeyboardEvent) => { if (event.key === 'Escape') dismissModal(onClose) }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close) }, [onClose])
  const visibleParts = parts.length ? parts : [content || 'Konten belum tersedia.']
  return <div className="content-preview-backdrop content-bank-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) dismissModal(onClose, event.currentTarget) }}><section className="content-bank-dialog content-preview-modal" role="dialog" aria-modal="true" aria-label="Konten lengkap"><header><div><p className="eyebrow">Review Konten</p><h2>{title}</h2></div><button type="button" aria-label="Tutup konten lengkap" onClick={(event) => dismissModal(onClose, event.currentTarget)}>×</button></header><div className="content-preview-form"><div className="content-bank-thread-editor"><div className="content-bank-thread-heading"><span>Isi Threads</span><small>{visibleParts.length} bagian</small></div><div className="content-output-thread-list">{visibleParts.map((part, index) => <label className="content-output-thread-card" key={index}><span className="content-output-thread-card-head"><strong>Thread {index + 1}</strong><small>{part.length} karakter</small></span><textarea aria-label={`Thread ${index + 1}`} value={part} rows={5} readOnly /></label>)}</div></div><div className="content-bank-dialog-actions content-preview-actions"><button className="primary-button" type="button" onClick={(event) => dismissModal(onClose, event.currentTarget)}>Tutup</button></div></div></section></div>
}
