type CheckEmailPageProps = {
  email?: string
  onBackToLogin: () => void
}

export function CheckEmailPage({ email, onBackToLogin }: CheckEmailPageProps) {
  return (
    <div className="bootstrap-shell">
      <section className="panel bootstrap-card">
        <p className="eyebrow">Check Email</p>
        <h1>Cek email kamu dulu</h1>
        <p className="page-description">
          Kami sudah kirim link verifikasi ke {email || 'email yang kamu daftarkan'}.
          Setelah verifikasi selesai, login dulu untuk masuk ke dashboard.
        </p>
        <button className="primary-button" type="button" onClick={onBackToLogin}>
          Kembali ke Login
        </button>
      </section>
    </div>
  )
}
