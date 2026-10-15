import { useEffect, useRef, useState } from 'react'
import { AppIcon } from '../components/AppIcon'
import { BrandLogo } from '../components/BrandLogo'
import { MARKETING_PLANS, type MarketingPlan } from '../config/marketingPlans'

const features = [
  { icon: 'user', title: 'AI Persona', copy: 'Simpan karakter, sudut pandang, dan gaya komunikasi yang ingin kamu pakai.' },
  { icon: 'layers', title: 'Content Pillar', copy: 'Susun tema utama supaya ide konten tetap fokus dan konsisten.' },
  { icon: 'sparkles', title: 'AI Topic Generator', copy: 'Temukan topik relevan dari Persona dan Content Pillar pilihanmu.' },
  { icon: 'sparkles', title: 'AI Content Generator', copy: 'Ubah topik menjadi draft Threads yang siap kamu kembangkan.' },
  { icon: 'refresh', title: 'Regenerate Content', copy: 'Buat alternatif baru saat draft pertama belum terasa pas.' },
  { icon: 'pencil', title: 'Content List & Editor', copy: 'Rapikan, edit, dan kelola semua draft dalam satu workspace.' },
  { icon: 'calendar', title: 'Content Calendar', copy: 'Lihat rencana konten secara teratur dalam tampilan kalender.' },
  { icon: 'clock', title: 'Schedule Post Threads', copy: 'Jadwalkan publikasi otomatis pada waktu yang sudah kamu tentukan.' },
]

const faqs = [
  ['Apa itu Alurin?', 'Alurin adalah workspace AI untuk menyusun Persona, Content Pillar, ide, draft, dan jadwal konten Threads dalam satu alur.'],
  ['Apakah Alurin gratis?', 'Ya. Paket Free memberi 6 AI Credits sekali daftar serta akses untuk membuat topik dan konten selama credits tersedia.'],
  ['Apa itu AI Credits?', 'AI Credits adalah saldo yang digunakan saat fitur AI memproses token. Satu credit setara dengan hingga 5.000 token pemakaian.'],
  ['Apakah credits bisa habis?', 'Bisa. Credits berkurang berdasarkan pemakaian token aktual ketika kamu generate atau regenerate dengan AI.'],
  ['Bisakah membeli tambahan credits?', 'Bisa. Top up menambah AI Credits tanpa mengubah paket atau membuka entitlement berbayar.'],
  ['Apakah Alurin bisa menjadwalkan posting Threads?', 'Bisa pada paket Starter, Creator, dan Pro dengan subscription aktif serta akun Threads yang terhubung.'],
  ['Apakah perlu menghubungkan akun Threads?', 'Tidak untuk membuat dan mengedit konten. Akun Threads hanya diperlukan ketika kamu ingin menjadwalkan atau memublikasikan konten.'],
  ['Apakah bisa membatalkan subscription?', 'Pengelolaan subscription mengikuti status pembayaran pada akunmu. Detail pembatalan akan tersedia pada halaman langganan ketika alurnya didukung penuh.'],
]

function MarketingButton({ href, children, secondary = false }: { href: string; children: React.ReactNode; secondary?: boolean }) {
  return <a className={`landing-button${secondary ? ' secondary' : ''}`} href={href}>{children}</a>
}

function ProductPreview() {
  return (
    <div className="landing-product-frame" aria-label="Preview workspace Alurin">
      <div className="landing-browser-bar"><i /><i /><i /><span>app.alurin.id/dashboard</span></div>
      <div className="landing-product-shell">
        <aside>
          <BrandLogo />
          <div className="preview-nav active"><AppIcon name="grid" /> Dashboard</div>
          <div className="preview-nav"><AppIcon name="sparkles" /> Create</div>
          <div className="preview-nav"><AppIcon name="calendar" /> Calendar</div>
          <div className="preview-nav"><AppIcon name="layers" /> Content List</div>
        </aside>
        <div className="preview-main">
          <header><div><small>SELAMAT DATANG</small><strong>Kontenmu hari ini</strong></div><span>586 AI Credits</span></header>
          <div className="preview-metrics"><article><small>Draft siap</small><strong>12</strong></article><article><small>Terjadwal</small><strong>8</strong></article><article><small>Persona aktif</small><strong>3</strong></article></div>
          <div className="preview-workspace">
            <article className="preview-primary"><span className="preview-icon"><AppIcon name="sparkles" /></span><small>MULAI DARI IDE</small><h3>Buat konten Threads baru</h3><p>Pilih Persona dan Content Pillar, lalu biarkan Alurin membantu menyusun topik.</p><b>Generate Topic <AppIcon name="chevron-right" /></b></article>
            <article className="preview-calendar"><div><strong>Oktober 2026</strong><span>Calendar</span></div><div className="preview-week"><i>S</i><i>S</i><i>R</i><i>K</i><i>J</i></div><div className="preview-days"><span>12</span><span className="has-event">13</span><span>14</span><span className="has-event">15</span><span>16</span></div><p><i /> 09:30 · Tips membangun personal brand</p><p><i /> 16:00 · Kenapa konsistensi lebih penting</p></article>
          </div>
        </div>
      </div>
    </div>
  )
}

function PricingCard({ plan }: { plan: MarketingPlan }) {
  const items = [
    plan.credits,
    `${plan.personas} Persona`,
    `${plan.pillars} Content Pillar`,
    'Generate Topic & Content',
    plan.threads ? 'Connect 1 akun Threads' : 'Tanpa Connect Threads',
    plan.schedule ? 'Schedule Post' : 'Tanpa Schedule Post',
  ]
  return (
    <article className={`landing-price-card${plan.popular ? ' popular' : ''}`}>
      {plan.popular ? <span className="landing-popular">Paling Populer</span> : null}
      <div><p>{plan.name}</p><h3>{plan.price}<small>{plan.interval}</small></h3></div>
      <ul>{items.map((item, index) => <li className={!plan.threads && index > 3 ? 'muted' : ''} key={item}><AppIcon name={index > 3 && !plan.threads ? 'minus' : 'check'} />{item}</li>)}</ul>
      <MarketingButton href="/register" secondary={!plan.popular}>Mulai Gratis</MarketingButton>
    </article>
  )
}

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const pageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
    document.title = 'Alurin — Ide ngalir, konten terbit.'
    return () => document.documentElement.removeAttribute('data-theme')
  }, [])

  useEffect(() => {
    const revealElements = pageRef.current?.querySelectorAll<HTMLElement>('.landing-reveal')
    if (!revealElements?.length) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      revealElements.forEach((element) => element.classList.add('is-visible'))
      return
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      })
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 })

    revealElements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="landing-page" ref={pageRef}>
      <a className="landing-skip" href="#main-content">Lewati ke konten</a>
      <nav className="landing-nav" aria-label="Navigasi utama">
        <a className="landing-brand" href="/" aria-label="Alurin home"><BrandLogo /></a>
        <button className="landing-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="landing-navigation-links" aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'} onClick={() => setMenuOpen((value) => !value)}><AppIcon name={menuOpen ? 'close' : 'menu'} /></button>
        <div id="landing-navigation-links" data-testid="landing-mobile-menu" data-state={menuOpen ? 'open' : 'closed'} className={`landing-nav-links${menuOpen ? ' open' : ''}`}>
          <a href="#fitur" onClick={() => setMenuOpen(false)}>Fitur</a><a href="#cara-kerja" onClick={() => setMenuOpen(false)}>Cara Kerja</a><a href="#harga" onClick={() => setMenuOpen(false)}>Harga</a><a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a>
          <a className="landing-mobile-login" href="/login" onClick={() => setMenuOpen(false)}><AppIcon name="user" /><span>Login</span></a>
        </div>
        <div className="landing-nav-actions"><a href="/login">Login</a><MarketingButton href="/register">Mulai Gratis</MarketingButton></div>
      </nav>

      <main id="main-content">
        <section className="landing-hero landing-hero-enter">
          <div className="landing-hero-copy"><span className="landing-kicker"><i /> Workspace konten Threads bertenaga AI</span><h1>Ide ngalir,<br /><em>konten terbit.</em></h1><p>Dari cari ide, bikin konten, sampai jadwal posting Threads. Semua lebih gampang dengan Alurin.</p><div className="landing-hero-actions"><MarketingButton href="/register">Mulai Gratis <AppIcon name="chevron-right" /></MarketingButton><MarketingButton href="#cara-kerja" secondary>Lihat Cara Kerja</MarketingButton></div><small>6 AI Credits gratis · Tanpa kartu kredit</small></div>
          <ProductPreview />
        </section>

        <section className="landing-section landing-how landing-reveal" id="cara-kerja"><div className="landing-section-head"><span>CARA KERJA</span><h2>Dari ide kosong ke konten terjadwal.</h2><p>Satu alur sederhana untuk membangun ritme konten yang lebih konsisten.</p></div><div className="landing-step-grid">{[
          ['01', 'Atur Persona & Content Pillar', 'Tentukan siapa yang bicara, untuk siapa, dan topik utama yang ingin kamu bangun.'],
          ['02', 'Generate Topic & Content', 'Pilih ide yang paling relevan lalu ubah menjadi draft Threads dengan bantuan AI.'],
          ['03', 'Jadwalkan lewat Calendar', 'Review, edit, dan tentukan waktu terbit agar konten berjalan sesuai rencana.'],
        ].map(([number, title, copy]) => <article key={number}><b>{number}</b><span><AppIcon name={number === '01' ? 'user' : number === '02' ? 'sparkles' : 'calendar'} /></span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>

        <section className="landing-section landing-features landing-reveal" id="fitur"><div className="landing-section-head"><span>FITUR ALURIN</span><h2>Semua yang kamu butuhkan untuk terus terbit.</h2><p>Bukan sekadar generator. Alurin menyatukan proses berpikir, menulis, mengedit, dan menjadwalkan.</p></div><div className="landing-feature-grid">{features.map((feature) => <article key={feature.title}><span><AppIcon name={feature.icon} /></span><h3>{feature.title}</h3><p>{feature.copy}</p></article>)}</div></section>

        <section className="landing-section landing-pricing landing-reveal" id="harga"><div className="landing-section-head"><span>HARGA</span><h2>Mulai gratis, bertumbuh sesuai kebutuhan.</h2><p>Semua paket bisa Generate Topic dan Content selama AI Credits tersedia.</p></div><div className="landing-price-grid">{MARKETING_PLANS.map((plan) => <PricingCard plan={plan} key={plan.code} />)}</div><p className="landing-price-note"><AppIcon name="info" /> Paket berbayar memiliki Schedule Post tanpa kuota bulanan dari Alurin, dengan tetap mengikuti batas Threads API.</p></section>

        <section className="landing-section landing-faq landing-reveal" id="faq"><div className="landing-section-head"><span>FAQ</span><h2>Pertanyaan yang sering muncul.</h2></div><div className="landing-faq-list">{faqs.map(([question, answer]) => <details key={question}><summary>{question}<span><AppIcon name="plus" /></span></summary><p>{answer}</p></details>)}</div></section>

        <section className="landing-final-cta landing-reveal"><div><span>SIAP MULAI?</span><h2>Konten Threads nggak harus bikin pusing.</h2><p>Mulai dari satu ide, biarkan Alurin bantu kamu bikin konten lebih konsisten.</p><MarketingButton href="/register">Mulai Gratis Sekarang <AppIcon name="chevron-right" /></MarketingButton></div></section>
      </main>

      <footer className="landing-footer"><div><BrandLogo /><p>Ide ngalir, konten terbit.</p></div><div><strong>Produk</strong><a href="#fitur">Fitur</a><a href="#cara-kerja">Cara Kerja</a><a href="#harga">Harga</a></div><div><strong>Legal</strong><a href="/terms-of-service">Terms of Service</a><a href="/privacy-policy">Privacy Policy</a></div><div><strong>Akun</strong><a href="/login">Login</a><a href="/register">Register</a></div><small>© {new Date().getFullYear()} Alurin. All rights reserved.</small></footer>
    </div>
  )
}
