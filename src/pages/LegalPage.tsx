type LegalPageProps = {
  document: 'privacy' | 'terms'
}

const LAST_UPDATED = '13 Oktober 2026'

function LegalHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="legal-header">
      <a className="legal-brand" href="/" aria-label="Sociora beranda">Sociora</a>
      <p className="eyebrow">Dokumen legal</p>
      <h1>{title}</h1>
      <p>{description}</p>
      <small>Terakhir diperbarui: {LAST_UPDATED}</small>
    </header>
  )
}

function PrivacyPolicy() {
  return (
    <>
      <LegalHeader title="Kebijakan Privasi" description="Kebijakan ini menjelaskan bagaimana Sociora mengumpulkan, menggunakan, menyimpan, dan melindungi data saat kamu memakai layanan kami." />
      <section>
        <h2>Tentang Sociora</h2>
        <p>Sociora menyediakan alat bantu berbasis AI untuk menyusun ide, membuat dan mengelola konten, menjadwalkan publikasi, serta menghubungkan akun media sosial seperti Threads.</p>
      </section>
      <section>
        <h2>Data yang kami proses</h2>
        <ul>
          <li>Data akun, seperti nama, alamat email, dan informasi profil.</li>
          <li>Data yang kamu masukkan, termasuk persona, pilar konten, ide, draf, dan jadwal publikasi.</li>
          <li>Informasi akun media sosial yang kamu hubungkan serta token akses yang diperlukan untuk menjalankan fitur yang kamu pilih.</li>
          <li>Data teknis dan penggunaan, seperti log kesalahan, perangkat, alamat IP, dan aktivitas fitur untuk menjaga keamanan serta meningkatkan layanan.</li>
          <li>Informasi langganan dan transaksi. Detail kartu pembayaran diproses oleh penyedia pembayaran dan tidak kami simpan secara langsung.</li>
        </ul>
      </section>
      <section>
        <h2>Cara kami menggunakan data</h2>
        <p>Kami menggunakan data untuk menyediakan dan mengamankan layanan, menghasilkan konten sesuai instruksi kamu, memublikasikan konten yang kamu setujui, mengelola akun dan langganan, memberi dukungan, mencegah penyalahgunaan, serta memperbaiki kualitas produk.</p>
      </section>
      <section>
        <h2>Pembagian dan penyimpanan data</h2>
        <p>Data hanya dibagikan seperlunya kepada penyedia infrastruktur, autentikasi, AI, pembayaran, analitik, dan platform media sosial yang kamu hubungkan. Kami tidak menjual data pribadimu. Masa penyimpanan disesuaikan dengan kebutuhan layanan, kewajiban hukum, keamanan, dan penyelesaian sengketa.</p>
      </section>
      <section>
        <h2>Penghapusan data</h2>
        <p>Kamu dapat memutuskan koneksi Threads dari pengaturan aplikasi untuk menghentikan akses berikutnya. Untuk menghapus akun dan data terkait, ajukan permintaan melalui kanal dukungan resmi Sociora dengan menggunakan email yang terdaftar. Kami akan memverifikasi kepemilikan akun, menghapus atau menganonimkan data yang tidak wajib disimpan, dan memberi konfirmasi setelah proses selesai.</p>
        <p>Salinan tertentu dapat dipertahankan sementara jika diwajibkan oleh hukum, diperlukan untuk keamanan, atau masih berada dalam siklus pencadangan terbatas.</p>
      </section>
      <section>
        <h2>Hak dan pilihan kamu</h2>
        <p>Kamu dapat meminta akses, koreksi, atau penghapusan data, mencabut koneksi layanan pihak ketiga, serta berhenti menggunakan layanan. Mencabut izin dapat membuat beberapa fitur tidak lagi berfungsi.</p>
      </section>
      <section>
        <h2>Keamanan dan perubahan kebijakan</h2>
        <p>Kami menerapkan perlindungan teknis dan organisasi yang wajar, tetapi tidak ada sistem internet yang sepenuhnya bebas risiko. Jika kebijakan ini berubah secara material, tanggal pembaruan di halaman ini akan disesuaikan.</p>
      </section>
    </>
  )
}

function TermsOfService() {
  return (
    <>
      <LegalHeader title="Ketentuan Layanan" description="Ketentuan ini mengatur penggunaan Sociora. Dengan membuat akun atau memakai layanan, kamu menyetujui ketentuan berikut." />
      <section>
        <h2>Penggunaan layanan</h2>
        <p>Kamu harus memberikan informasi akun yang akurat, menjaga keamanan kredensial, dan hanya menggunakan layanan sesuai hukum. Kamu bertanggung jawab atas instruksi, konten, jadwal, dan tindakan publikasi yang dilakukan melalui akunmu.</p>
      </section>
      <section>
        <h2>Konten dan AI</h2>
        <p>Kamu tetap memiliki hak atas konten asli yang kamu masukkan. Kamu memberi Sociora izin terbatas untuk memproses konten tersebut hanya guna menjalankan layanan. Hasil AI dapat tidak akurat, mirip dengan konten lain, atau memerlukan penyuntingan; kamu wajib meninjau hasil sebelum menggunakan atau memublikasikannya.</p>
      </section>
      <section>
        <h2>Layanan pihak ketiga</h2>
        <p>Fitur tertentu bergantung pada layanan pihak ketiga, termasuk Threads, penyedia AI, autentikasi, dan pembayaran. Penggunaan fitur tersebut juga tunduk pada ketentuan pihak terkait. Perubahan atau gangguan pada layanan pihak ketiga dapat memengaruhi fungsi Sociora.</p>
      </section>
      <section>
        <h2>Larangan penggunaan</h2>
        <p>Kamu tidak boleh memakai Sociora untuk melanggar hukum atau hak pihak lain, menyebarkan malware, melakukan spam, mencoba mengakses sistem tanpa izin, menghindari batas penggunaan, atau menghasilkan dan menyebarkan konten yang berbahaya maupun menipu.</p>
      </section>
      <section>
        <h2>Langganan dan pembayaran</h2>
        <p>Harga, kuota, periode tagihan, dan fitur paket ditampilkan sebelum pembelian. Biaya yang telah dibayarkan tidak dapat dikembalikan kecuali diwajibkan oleh hukum atau dinyatakan lain pada saat transaksi. Kami dapat mengubah paket dengan pemberitahuan yang wajar.</p>
      </section>
      <section>
        <h2>Penangguhan dan penghentian</h2>
        <p>Kamu dapat berhenti menggunakan layanan kapan saja. Kami dapat membatasi atau menghentikan akses jika terjadi pelanggaran ketentuan, risiko keamanan, kewajiban hukum, atau penggunaan yang merugikan pengguna maupun sistem lain.</p>
      </section>
      <section>
        <h2>Batasan tanggung jawab</h2>
        <p>Layanan diberikan sebagaimana tersedia. Sejauh diizinkan hukum, Sociora tidak menjamin hasil AI, jangkauan konten, atau ketersediaan tanpa gangguan dan tidak bertanggung jawab atas kerugian tidak langsung akibat penggunaan layanan.</p>
      </section>
      <section>
        <h2>Perubahan ketentuan</h2>
        <p>Kami dapat memperbarui ketentuan ini untuk mencerminkan perubahan produk, hukum, atau keamanan. Penggunaan layanan setelah ketentuan baru berlaku berarti kamu menerima versi terbaru.</p>
      </section>
    </>
  )
}

export function LegalPage({ document }: LegalPageProps) {
  return (
    <main className="legal-page">
      <article className="legal-document">
        {document === 'privacy' ? <PrivacyPolicy /> : <TermsOfService />}
        <footer className="legal-footer">
          <nav aria-label="Tautan legal">
            <a href="/privacy-policy">Kebijakan Privasi</a>
            <a href="/terms-of-service">Ketentuan Layanan</a>
          </nav>
          <p>© {new Date().getFullYear()} Sociora</p>
        </footer>
      </article>
    </main>
  )
}
