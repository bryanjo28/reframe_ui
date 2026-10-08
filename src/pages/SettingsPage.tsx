import { useState } from 'react'
import { AppIcon } from '../components/AppIcon'
import type { AuthUser } from '../services/authService'
import type { AppTheme } from '../types/navigation'
import type { UiLanguage } from '../utils/uiLanguage'

type Detail = 'profile' | 'permissions' | 'help' | 'privacy' | 'about' | null

type Props = {
  user: AuthUser | null
  language: UiLanguage
  onLanguageChange: (language: UiLanguage) => void
  theme: AppTheme
  onThemeChange: (theme: AppTheme) => void
  onReplayTutorial: () => void
  onLogout: () => void
}

function displayName(user: AuthUser | null) {
  return user?.fullName || user?.accountName || user?.name || user?.username || 'Pengguna Reframe'
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function SettingsRow({ icon, title, description, value, onClick }: { icon: string; title: string; description: string; value?: string; onClick: () => void }) {
  return <button className="settings-row" type="button" onClick={onClick}><span className="settings-row-icon"><AppIcon name={icon} /></span><span className="settings-row-copy"><strong>{title}</strong><small>{description}</small></span>{value ? <span className="settings-row-value">{value}</span> : null}<AppIcon name="chevron-right" /></button>
}

export function SettingsPage({ user, language, onLanguageChange, theme, onThemeChange, onReplayTutorial, onLogout }: Props) {
  const [detail, setDetail] = useState<Detail>(null)
  const name = displayName(user)
  const notificationStatus = typeof Notification === 'undefined' ? 'Tidak tersedia' : Notification.permission === 'granted' ? 'Diizinkan' : Notification.permission === 'denied' ? 'Diblokir' : 'Belum diatur'

  if (detail) {
    return <div className="settings-page settings-detail-page">
      <button className="settings-back" type="button" onClick={() => setDetail(null)}><AppIcon name="chevron-left" /> Kembali ke Pengaturan</button>
      {detail === 'profile' ? <><header className="settings-page-header"><p className="eyebrow">Akun</p><h1>Profil</h1><p>Informasi yang terhubung dengan akun Reframe kamu.</p></header><section className="settings-detail-card"><div className="profile-avatar large">{initials(name)}</div><div className="profile-fields"><label>Nama lengkap<span>{name}</span></label><label>Username<span>{user?.username || user?.accountName || 'Belum tersedia'}</span></label><label>Email<span>{user?.email || 'Belum tersedia'}</span></label></div><p className="settings-note"><AppIcon name="info" /> Perubahan data profil belum tersedia. Data ini mengikuti akun yang kamu gunakan saat mendaftar.</p></section></> : null}
      {detail === 'permissions' ? <><header className="settings-page-header"><p className="eyebrow">Perangkat</p><h1>Device Permissions</h1><p>Kelola akses yang membantu Reframe bekerja di perangkat ini.</p></header><section className="settings-detail-card"><div className="permission-row"><span><strong>Notifikasi browser</strong><small>Dipakai untuk mengingatkan jadwal dan status konten.</small></span><b>{notificationStatus}</b></div><p className="settings-note"><AppIcon name="info" /> Izin perangkat tetap dikendalikan oleh browser. Jika diblokir, ubah melalui pengaturan situs di browser kamu.</p></section></> : null}
      {detail === 'help' ? <><header className="settings-page-header"><p className="eyebrow">Bantuan</p><h1>Help Center</h1><p>Temukan bantuan untuk menggunakan Reframe.</p></header><section className="settings-detail-card settings-link-list"><button type="button" onClick={onReplayTutorial}><span><strong>Ulangi tutorial</strong><small>Pelajari kembali alur membuat konten.</small></span><AppIcon name="chevron-right" /></button><button type="button" disabled><span><strong>Pusat bantuan</strong><small>Artikel bantuan sedang dipersiapkan.</small></span><em>Segera hadir</em></button><button type="button" disabled><span><strong>Hubungi dukungan</strong><small>Kanal dukungan sedang dipersiapkan.</small></span><em>Segera hadir</em></button></section></> : null}
      {detail === 'privacy' ? <><header className="settings-page-header"><p className="eyebrow">Keamanan</p><h1>Privacy Center</h1><p>Kontrol privasi dan pahami bagaimana datamu digunakan.</p></header><section className="settings-detail-card settings-link-list"><button type="button" disabled><span><strong>Data akun</strong><small>Kelola salinan dan penghapusan data akun.</small></span><em>Segera hadir</em></button><button type="button" disabled><span><strong>Preferensi privasi</strong><small>Atur penggunaan data dan personalisasi.</small></span><em>Segera hadir</em></button><p className="settings-note"><AppIcon name="lock" /> Fitur kontrol privasi lengkap akan tersedia pada pengembangan berikutnya.</p></section></> : null}
      {detail === 'about' ? <><header className="settings-page-header"><p className="eyebrow">Informasi</p><h1>Tentang Reframe</h1><p>Informasi aplikasi dan dokumen legal.</p></header><section className="settings-detail-card settings-link-list"><button type="button" disabled><span><strong>Privacy Policy</strong><small>Kebijakan privasi Reframe.</small></span><em>Belum tersedia</em></button><button type="button" disabled><span><strong>Terms of Use</strong><small>Ketentuan penggunaan Reframe.</small></span><em>Belum tersedia</em></button><button type="button" disabled><span><strong>Open-source licenses</strong><small>Lisensi pustaka yang digunakan aplikasi.</small></span><em>Belum tersedia</em></button><div className="app-version"><span>Versi aplikasi</span><strong>Reframe 0.1.0</strong></div></section></> : null}
    </div>
  }

  return <div className="settings-page">
    <header className="settings-page-header"><p className="eyebrow">Akun & aplikasi</p><h1>Pengaturan</h1><p>Kelola akun, preferensi, privasi, dan bantuan dari satu tempat.</p></header>
    <button className="settings-profile-card" type="button" onClick={() => setDetail('profile')}><span className="profile-avatar">{initials(name)}</span><span><strong>{name}</strong><small>{user?.email || 'Email tidak tersedia'}</small><em>Lihat profil</em></span><AppIcon name="chevron-right" /></button>
    <section className="settings-group"><h2>Preferensi</h2><div className="settings-surface"><div className="settings-control"><span className="settings-row-icon"><AppIcon name="menu" /></span><span><strong>Bahasa</strong><small>Bahasa antarmuka aplikasi</small></span><select value={language} onChange={(event) => onLanguageChange(event.target.value as UiLanguage)}><option value="id">Indonesia</option><option value="en">English</option></select></div><div className="settings-control"><span className="settings-row-icon"><AppIcon name="sun" /></span><span><strong>Tampilan</strong><small>Pilih tema yang nyaman digunakan</small></span><select value={theme} onChange={(event) => onThemeChange(event.target.value as AppTheme)}><option value="dark">Dark</option><option value="light">Light</option></select></div><SettingsRow icon="info" title="Device Permissions" description="Izin notifikasi dan perangkat" value={notificationStatus} onClick={() => setDetail('permissions')} /></div></section>
    <section className="settings-group"><h2>Bantuan & privasi</h2><div className="settings-surface"><SettingsRow icon="sparkles" title="Help Center" description="Tutorial, bantuan, dan dukungan" onClick={() => setDetail('help')} /><SettingsRow icon="lock" title="Privacy Center" description="Data, keamanan, dan kontrol privasi" onClick={() => setDetail('privacy')} /></div></section>
    <section className="settings-group"><h2>Informasi</h2><div className="settings-surface"><SettingsRow icon="info" title="Tentang Reframe" description="Privacy Policy, Terms, source, dan versi" onClick={() => setDetail('about')} /></div></section>
    <button className="settings-logout" type="button" onClick={onLogout}><AppIcon name="logout" /> Keluar dari akun</button>
  </div>
}
