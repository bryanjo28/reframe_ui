export type UiLanguage = 'id' | 'en'

const phrases: Array<[string, string]> = [
  ['Lanjutkan pembayaran', 'Continue payment'],
  ['Perlu Review','Needs review'],['Siap','Ready'],['Agenda','Schedule'],['HARI INI','TODAY'],['BESOK','TOMORROW'],
  ['Paket Gratis','Free plan'],['Paket Pemula','Starter plan'],['Paket Kreator','Creator plan'],
  ['Siap Dijadwalkan','Ready to schedule'],['Siap Dijadwalkan','Ready to schedule'],['Terjadwal','Scheduled'],['Perlu Review','Needs review'],
  ['Beranda','Home'],['Buat','Create'],['Jadwal','Schedule'],['Lainnya','More'],['Pengaturan','Settings'],
  ['Ruang Kerja','Workspace'],['Tutup','Close'],['Topik','Topics'],['Konten','Content'],['Draf','Draft'],
  ['Buat Konten','Create Content'],['Buat Konten Baru','Create New Content'],['Cari Ide','Find Ideas'],['Cari Ide Baru','Find New Ideas'],['Cari ide konten','Find content ideas'],
  ['✨ Buat Konten Baru','✨ Create New Content'],['Mulai di sini','Start here'],['+ Cari Ide Baru','+ Find New Ideas'],
  ['Ide Konten','Content Ideas'],['Ide Tersimpan','Saved Ideas'],['Konten Kamu','Your Content'],['Konten Terbaru','Recent Content'],['Konten Saya','My Content'],
  ['Buat konten baru dari ide kamu atau lanjutkan konten yang sudah ada.','Create new content from your ideas or continue existing content.'],
  ['Ubah ide yang sudah kamu pilih menjadi konten siap posting.','Turn selected ideas into ready-to-post content.'],
  ['Belum ada ide yang siap dibuat','No ideas are ready yet'],['Cari ide dulu supaya alurin punya bahan untuk membuat konten.','Find ideas first so alurin has material to create content.'],
  ['Konten yang kamu buat akan muncul di sini.','Content you create will appear here.'],['Lihat Semua','View All'],['Lihat Semua →','View All →'],
  ['Content Brain','Content Brain'],['Persona','Persona'],['Pilar Konten','Content Pillars'],['Edit Persona','Edit Persona'],['Edit Pillars','Edit Pillars'],
  ['Biar alurin kenal kamu dulu 👋','Let alurin get to know you 👋'],['Ceritakan sedikit tentang kamu, audiensmu, dan bagaimana kamu ingin terdengar.','Tell us about yourself, your audience, and how you want to sound.'],
  ['Kamu mau dikenal bahas apa?','What do you want to be known for?'],['Tentukan topik utama yang akan menjadi arah kontenmu.','Choose the main topics that will guide your content.'],
  ['Simpan & Lanjut','Save & Continue'],['Content Brain kamu sudah siap ✓','Your Content Brain is ready ✓'],['Cari Ide Pertama','Find Your First Idea'],
  ['alurin akan membuat ide berdasarkan Content Brain kamu.','alurin will create ideas based on your Content Brain.'],['Ide untuk kamu','Ideas for you'],['Pilih ide yang ingin kamu jadikan konten.','Select the ideas you want to turn into content.'],
  ['Simpan untuk nanti','Save for later'],['Cari ide lainnya','Find more ideas'],['dipilih','selected'],['Tersimpan ✓','Saved ✓'],['Menyimpan...','Saving...'],
  ['Pilih arah ide','Choose an idea direction'],['Jumlah Topics','Number of Ideas'],['Mencari ide...','Finding ideas...'],
  ['Konten Baru','New Content'],['Lihat Konten Saya','View My Content'],['Ubah ide yang sudah kamu pilih menjadi konten siap direview.','Turn selected ideas into content ready for review.'],
  ['Pilih sumber ide','Choose an idea source'],['Lagi bikin konten kamu...','Creating your content...'],['Atur Jadwal','Set Schedule'],['Jadwalkan Konten','Schedule Content'],
  ['Atur jadwal posting','Set your posting schedule'],['Siap Dijadwalkan','Ready to Schedule'],['Terjadwal','Scheduled'],['Terbit','Published'],
  ['Kontenmu dalam satu tampilan','Your content, at a glance'],['Lanjutkan langkah paling penting berikutnya.','Pick up the most useful next step.'],['Langkah berikutnya','Next action'],
  ['Alur konten','Content pipeline'],['Konten terbaru','Recent content'],['Akan datang','Upcoming'],['Jadwal kamu','Your schedule'],['Belum ada yang dijadwalkan','Nothing scheduled yet'],
  ['Belum ada konten','No content yet'],['Buat Konten','Create Content'],['Buka Jadwal','Open Schedule'],['Review Konten','Review Content'],
  ['Akun Terhubung','Connected Accounts'],['Langganan','Subscription'],['Keluar','Logout'],['Mode terang','Light mode'],['Mode gelap','Dark mode'],['Lihat Tutorial Lagi','View Tutorial Again'],
  ['Selamat datang di alurin 👋','Welcome to alurin 👋'],['alurin belajar dari kamu','alurin learns from you'],['Dari ide sampai terjadwal','From ideas to scheduled posts'],
  ['Lanjut','Continue'],['Skip','Skip'],['Mulai Setup','Start Setup'],['Bahasa','Language'],['Indonesia','Indonesian'],['Inggris','English'],
  ['Memuat...','Loading...'],['Memuat dashboard...','Loading dashboard...'],['Coba lagi','Try again'],['Kembali ke Content Brain','Back to Content Brain'],
  ['Akun & aplikasi','Account & app'],['Pengaturan','Settings'],['Kelola akun, preferensi, privasi, dan bantuan dari satu tempat.','Manage your account, preferences, privacy, and support in one place.'],
  ['Email tidak tersedia','Email unavailable'],['Lihat profil','View profile'],['Akun & langganan','Account & subscription'],['Kelola koneksi Threads dan akun sosial','Manage Threads and social account connections'],
  ['Langganan & AI Credits','Subscription & AI Credits'],['Kelola paket, saldo, pemakaian, dan top up credits','Manage your plan, balance, usage, and credit top-ups'],['Pembayaran','Payments'],['Lihat riwayat order dan cek status pembayaran','View orders and check payment status'],
  ['Preferensi','Preferences'],['Bahasa antarmuka aplikasi','App interface language'],['Tampilan','Appearance'],['Pilih tema yang nyaman digunakan','Choose a comfortable theme'],['Gelap','Dark'],['Terang','Light'],
  ['Izin notifikasi dan perangkat','Notification and device permissions'],['Bantuan & privasi','Support & privacy'],['Tutorial, bantuan, dan dukungan','Tutorials, help, and support'],
  ['Kirim Feedback','Send feedback'],['Bagikan saran untuk membantu alurin berkembang','Share suggestions to help improve alurin'],['Masukan dari pengguna','Feedback from users'],['Belum ada feedback dari pengguna.','No user feedback yet.'],['Pusat Privasi','Privacy Center'],['Data, keamanan, dan kontrol privasi','Data, security, and privacy controls'],['Referral & Rewards','Referral & Rewards'],['Ajak Teman, Dapat AI Credits!','Invite friends, earn AI Credits!'],['Belum ada teman yang bergabung. Bagikan link referral kamu dan mulai kumpulkan AI Credits!','No friends have joined yet. Share your referral link and start earning AI Credits!'],['Punya kode referral?','Have a referral code?'],['Masukkan kode referral (opsional)','Enter a referral code (optional)'],['Memeriksa kode...','Checking code...'],['Validasi kode','Validate code'],['Kode referral tidak valid atau program sedang tidak aktif.','This referral code is invalid or the program is currently inactive.'],['Kode referral valid. Referral pertama yang valid akan dipakai.','Referral code is valid. The first valid referral will be applied.'],['Kode referral valid, tetapi referral pertama yang sudah tersimpan tetap digunakan.','Referral code is valid, but your first saved referral will remain in use.'],['Kode referral belum bisa diverifikasi.','The referral code could not be verified.'],['Kamu diundang untuk mencoba Alurin!','You are invited to try Alurin!'],['Daftar sekarang dan dapatkan bonus','Sign up now and get'],['AI Credits setelah pembelian paket pertamamu berhasil. Bonus masuk setelah periode validasi pembayaran.','AI Credits after your first subscription payment succeeds. The reward is granted after the payment validation period.'],['Kode referral tervalidasi.','Referral code verified.'],['Kode referral tidak valid. Pendaftaran dilanjutkan tanpa referral.','This referral code is invalid. Registration will continue without a referral.'],['Referral pertama yang valid akan dipakai.','The first valid referral will be used.'],['Program referral, performa, dan validasi reward','Referral program, performance, and reward validation'],['Program aktif','Program active'],['Tampilkan referral di aplikasi','Show referral in the app'],['Bonus pengundang','Referrer bonus'],['Bonus pengguna baru','New user bonus'],['Masa atribusi (hari)','Attribution window (days)'],['Masa validasi (hari)','Validation period (days)'],['Masa berlaku kredit (hari)','Credit expiration (days)'],['Paket yang memenuhi syarat','Eligible plans'],['Simpan pengaturan','Save settings'],['Proses reward yang jatuh tempo','Process due rewards'],['Pengundang','Referrer'],['Pengguna baru','Referred user'],['Paket pertama','First plan'],['Pembayaran','Payment'],['Reward','Reward'],['Tindakan','Action'],['Tolak','Reject'],['Estimasi biaya reward','Estimated reward cost'],['Referral status:','Referral status:'],['Acquisition','Acquisition'],['Referral credits issued','Referral credits issued'],['Referral credits available','Referral credits available'],['Est. reward cost','Estimated reward cost'],
  ['Informasi','Information'],['Tentang alurin','About alurin'],['Privacy Policy, Terms, source, dan versi','Privacy Policy, Terms, source, and version'],['Keluar dari akun','Log out'],
  ['Kembali ke Pengaturan','Back to Settings'],['Akun','Account'],['Profil','Profile'],['Informasi yang terhubung dengan akun alurin kamu.','Information linked to your alurin account.'],
  ['Nama lengkap','Full name'],['Username','Username'],['Belum tersedia','Not available'],['Perubahan data profil belum tersedia. Data ini mengikuti akun yang kamu gunakan saat mendaftar.','Profile editing is not available yet. This information comes from the account you used to register.'],
  ['Perangkat','Device'],['Izin Perangkat','Device Permissions'],['Kelola akses yang membantu alurin bekerja di perangkat ini.','Manage permissions that help alurin work on this device.'],
  ['Notifikasi browser','Browser notifications'],['Dipakai untuk mengingatkan jadwal dan status konten.','Used for schedule and content status reminders.'],['Tidak tersedia','Unavailable'],['Diizinkan','Allowed'],['Diblokir','Blocked'],['Belum diatur','Not set'],
  ['Izin perangkat tetap dikendalikan oleh browser. Jika diblokir, ubah melalui pengaturan situs di browser kamu.','Device permissions are controlled by your browser. If blocked, change them in your browser site settings.'],
  ['Bantuan','Help'],['Pusat Bantuan','Help Center'],['Temukan bantuan untuk menggunakan alurin.','Find help using alurin.'],['Ulangi tutorial','Replay tutorial'],['Pelajari kembali alur membuat konten.','Review how to create content.'],
  ['Pusat bantuan','Help center'],['Artikel bantuan sedang dipersiapkan.','Help articles are being prepared.'],['Segera hadir','Coming soon'],['Hubungi dukungan','Contact support'],['Kirim email ke alurin.support@alurin.pro untuk mendapatkan bantuan.','Email alurin.support@alurin.pro to get help.'],
  ['Masukan','Feedback'],['Kirim Feedback','Send Feedback'],['Bantu kami membuat alurin lebih baik. Ceritakan saran atau pengalamanmu.','Help us make alurin better. Share a suggestion or tell us about your experience.'],
  ['Feedback kamu','Your feedback'],['Tulis saran atau masukanmu di sini...','Write your suggestion or feedback here...'],['Kirim feedback','Send feedback'],['Feedback disimpan dengan aman dan hanya dapat dilihat admin Alurin.','Feedback is securely stored and only visible to Alurin admins.'],
  ['Keamanan','Security'],['Pusat Privasi','Privacy Center'],['Kontrol privasi dan pahami bagaimana datamu digunakan.','Manage your privacy and learn how your data is used.'],['Data akun','Account data'],['Kelola salinan dan penghapusan data akun.','Manage copies and deletion of your account data.'],
  ['Preferensi privasi','Privacy preferences'],['Atur penggunaan data dan personalisasi.','Manage data use and personalization.'],['Fitur kontrol privasi lengkap akan tersedia pada pengembangan berikutnya.','More privacy controls will be available in a future update.'],
  ['Tentang alurin','About alurin'],['Informasi aplikasi dan dokumen legal.','App information and legal documents.'],['Kebijakan Privasi','Privacy Policy'],['Cara alurin mengelola dan melindungi data.','How alurin manages and protects your data.'],
  ['Syarat & Ketentuan','Terms & Conditions'],['Ketentuan layanan, langganan, pembayaran, dan AI Credits.','Terms for services, subscriptions, payments, and AI Credits.'],['Open-source licenses','Open-source licenses'],['Lisensi pustaka yang digunakan aplikasi.','Licenses for libraries used by the app.'],['Versi aplikasi','App version'],
  // Shared shell, navigation, dialogs, and feedback
  ['Gagal memeriksa session','Could not check your session'],['Akun administrator','Administrator account'],['Mau masuk ke mana?','Where would you like to go?'],['Pilih dashboard yang ingin kamu buka. Kamu bisa berpindah kapan saja.','Choose a dashboard. You can switch between them at any time.'],['Dashboard Pengguna','User Dashboard'],['Buat konten dan kelola workspace kamu','Create content and manage your workspace'],['Kelola pengguna, paket, dan aktivitas','Manage users, plans, and activity'],['Buka fitur ini di alurin','Unlock this feature in alurin'],['Nanti','Not now'],['Upgrade Plan','Upgrade plan'],['Akun & workspace','Account & workspace'],['Lihat profil & pengaturan','View profile & settings'],['Semua Pengaturan','All settings'],['dipakai sebagai batas usage saat ini.','used as the current usage limit.'],['Notifikasi','Notifications'],['baru','new'],['Memuat notifikasi...','Loading notifications...'],['Belum ada notifikasi.','No notifications yet.'],['Halaman notifikasi sebelumnya','Previous notifications page'],['Halaman notifikasi berikutnya','Next notifications page'],['Halaman sebelumnya','Previous page'],['Halaman berikutnya','Next page'],['Primary navigation','Primary navigation'],['More navigation','More navigation'],['Menu profil','Profile menu'],['Profil & Pengaturan','Profile & Settings'],['Buka menu profil','Open profile menu'],['Saldo AI Credits','AI Credits balance'],['Konten lengkap','Full content'],['Tutup konten lengkap','Close full content'],['Isi Threads','Threads content'],['bagian','parts'],['Thread','Thread'],['karakter','characters'],['Ulangi tutorial','Replay tutorial'],['Content generation progress','Content generation progress'],['of','of'],['content processing','content processing'],['QRIS akan muncul di sini','Your QRIS code will appear here'],['Menunggu data QR dari payment gateway','Waiting for QR data from the payment gateway'],['Nomor','Number'],['Salin nomor VA','Copy virtual account number'],['Waktu pembayaran','Payment time'],['Ringkasan order','Order summary'],['ID transaksi','Transaction ID'],['Total pembayaran','Total payment'],['Metode','Method'],['Buka aplikasi bank atau e-wallet.','Open your banking or e-wallet app.'],['Pilih menu scan QRIS dan arahkan ke kode.','Choose QRIS scan and point your camera at the code.'],['Konfirmasi nominal, lalu selesaikan pembayaran.','Confirm the amount, then complete the payment.'],['Buka aplikasi atau ATM bank tujuan.','Open your bank app or visit an ATM.'],['Pilih transfer ke virtual account.','Choose virtual account transfer.'],['Masukkan nomor VA dan bayar sesuai total.','Enter the virtual account number and pay the total.'],['Buka halaman pembayaran','Open payment page'],['Pembayaran dapat dibuka kembali melalui Riwayat pembayaran.','You can reopen this payment from Payment History.'],['Metode pembayaran','Payment method'],['Tutup pembayaran','Close payment'],
  // Authentication and account setup
  ['Kembali','Back'],['alurin Access','Akses alurin'],['Session kamu sudah berakhir.','Your session has expired.'],['Silakan login kembali untuk melanjutkan.','Please log in again to continue.'],['Email','Email'],['Nama lengkap','Full Name'],['Kata sandi','Password'],['Lupa kata sandi?','Forgot password?'],['Konfirmasi Password','Confirm password'],['nama@email.com','name@email.com'],['nama lengkap kamu','your full name'],['username kamu','your username'],['Masukkan password','Enter your password'],['Masukkan ulang password','Re-enter your password'],['Saya setuju dengan','I agree to the'],['Syarat & Ketentuan','Terms & Conditions'],['Pemberitahuan Privasi','Privacy Notice'],['yang berlaku.','currently in effect.'],['Pemulihan kata sandi','Password Recovery'],['Masukkan email akunmu. Kami akan mengirimkan link untuk membuat password baru.','Enter your account email. We will send you a link to create a new password.'],['Kembali ke login','Back to login'],['Buat password baru','Create a new password'],['Gunakan minimal 8 karakter untuk password barumu.','Use at least 8 characters for your new password.'],['Link reset password tidak valid atau kedaluwarsa.','The password reset link is invalid or has expired.'],['Minta link reset baru','Request a new reset link'],['Password baru','New password'],['Konfirmasi password baru','Confirm new password'],['Periksa email','Check Email'],['Cek email kamu dulu','Check your email'],['Kami sudah mengirim link verifikasi ke','We sent a verification link to'],['. Buka email tersebut dan klik link verifikasi sebelum login.','. Open the email and click the verification link before logging in.'],['Kembali ke Login','Back to login'],['Konfirmasi email','Email Confirmation'],['Email berhasil diverifikasi','Email verified successfully'],['Silakan login untuk melanjutkan ke workspace kamu.','Log in to continue to your workspace.'],['Login','Log in'],
  // Content creation, ideas, topics, and review
  ['Review, edit, dan siapkan konten yang sudah pernah kamu buat.','Review, edit, and prepare content you have already created.'],['Ide','Ideas'],['Tinjau','Review'],['Muat ulang','Refresh'],['Review konten','Review content'],['Memuat content outputs...','Loading content...'],['Sedang ambil daftar output yang dibuat user aktif.','Fetching content created by the current user.'],['Tujuan','Goal'],['Status','Status'],['Dibuat','Created'],['Aksi','Actions'],['Sebelumnya','Previous'],['Berikutnya','Next'],['Konten yang kamu buat akan muncul di sini untuk direview.','Content you create will appear here for review.'],['Jadwalkan retry','Reschedule retry'],['Jadwal retry','Retry schedule'],['Pilih tanggal dan waktu baru untuk mencoba posting kembali.','Choose a new date and time to try posting again.'],['Buat kontenmu','Create your content'],['Kita mulai dari card supaya tampilan awal lebih tenang. Setelah dipilih, baru form yang sesuai muncul di bawah.','Start with a card to keep the page simple. Choose one to show its form below.'],['Pilih alur','Choose a flow'],['Pilih dulu yang mau kamu edit','Choose what you want to edit'],['2 pilihan','2 options'],['Satu menu untuk pilih cara kerja content engine. Auto langsung jalan dari pillar, dan list buat lihat hasil yang sudah jadi.','Choose how the Content Engine works. Auto generates from a pillar; the list shows finished content.'],['Ubah ide tersimpan menjadi konten siap direview.','Turn a saved idea into content ready for review.'],['Lihat konten yang sudah pernah kamu buat.','View content you have already created.'],['Buat beberapa angle konten dari satu topic yang sudah tersedia.','Create several content angles from one available topic.'],['Dari topik','From Topic'],['Pilih topic, atur variant, lalu generate langsung.','Choose a topic, set the variations, then generate.'],['Pilih topik utama','Choose a main topic'],['topik','topics'],['Memuat topik utama...','Loading main topics...'],['Topik utama','Main topic'],['Belum ada topik utama','No main topics yet'],['Lengkapi Content Brain untuk mulai membuat konten.','Complete your Content Brain to start creating content.'],['Ide yang tersedia','Available ideas'],['Ide yang tersedia akan muncul setelah topik utama dipilih.','Available ideas will appear after you choose a main topic.'],['Memuat ide...','Loading ideas...'],['topic lain tersedia.','other topics available.'],['Belum ada ide untuk topik utama ini','No ideas for this main topic yet'],['Cari dan simpan ide terlebih dahulu.','Find and save an idea first.'],['Edit nama topic','Edit topic name'],['Ubah nama topic yang dipilih.','Change the selected topic name.'],['Nama topic','Topic name'],['Pengaturan konten','Content settings'],['Jumlah konten','Number of posts'],['Maksimum','Maximum'],['ide tersedia.','ideas available.'],['Aktif','Active'],['Pilih persona dan pillar, lalu tentukan berapa ide yang ingin kamu dapatkan.','Choose a persona and pillar, then set how many ideas you want.'],['Pilih Persona','Choose a persona'],['Persona menentukan sudut pandang, audiens, dan gaya ide yang dibuat.','Your persona defines the perspective, audience, and style of generated ideas.'],['Free · terkunci','Free · locked'],['Persona belum tersedia','No persona available'],['Tone:','Tone:'],['· Fokus:','· Focus:'],['Pilih Pillar','Choose a pillar'],['Pillar adalah tema utama yang menjadi arah ide kontenmu.','A pillar is the main theme that guides your content ideas.'],['pillar','pillars'],['Memuat pillar...','Loading pillars...'],['Belum ada pillar','No pillars yet'],['Lengkapi Content Brain untuk mulai mencari ide.','Complete your Content Brain to start finding ideas.'],['ide','ideas'],['Judul ide','Idea title'],['Kategori','Category'],['Pilih kategori','Choose a category'],['Angle:','Angle:'],['Pain:','Pain:'],['Why it works:','Why it works:'],['dari','of'],['Buat Konten dari','Create content from'],['Ide yang kamu cari akan muncul di sini','The ideas you find will appear here'],['Jumlah ide','Number of ideas'],['Berapa ide yang kamu inginkan?','How many ideas do you want?'],['Masukkan angka 1 sampai','Enter a number from 1 to'],['Fitur premium','Premium feature'],['Upgrade untuk mengganti','Upgrade to change'],['Akun Free menggunakan persona dan pillar utama. Upgrade paket untuk memilih konfigurasi lain saat mencari ide.','Free accounts use the default persona and pillar. Upgrade to choose other options when finding ideas.'],['Lihat Paket','View plans'],['Content Bank','Content Bank'],['Simpan, review, dan siapkan seluruh kontenmu dari satu tempat.','Save, review, and prepare all your content in one place.'],['Memuat Content Bank...','Loading Content Bank...'],['Jadwalkan','Schedule'],['Lihat Jadwal','View schedule'],['Coba lagi','Retry'],['Lihat','View'],['Judul konten','Content title'],['Konten Terbit','Published content'],['Memuat link publikasi...','Loading published link...'],['Lihat post di Threads','View post on Threads'],['Link publikasi belum tersedia.','The published link is not available yet.'],['Hapus Konten','Delete content'],['Apakah Anda yakin ingin menghapus konten ini? Tindakan ini tidak dapat dibatalkan.','Are you sure you want to delete this content? This action cannot be undone.'],
  // Scheduling and publishing
  ['Atur konten yang akan tayang dan kapan waktunya.','Manage what gets published and when.'],['Kalender','Calendar'],['Daftar','List'],['Hari ini','Today'],['lainnya','more'],['Agenda','Agenda'],['Belum ada konten terjadwal.','No scheduled content.'],['WIB','WIB'],['Belum ada konten terjadwal','No scheduled content yet'],['Konten yang kamu jadwalkan akan muncul di sini.','Content you schedule will appear here.'],['Belum dijadwalkan','Not scheduled'],['konten','posts'],['Memuat konten...','Loading content...'],['· Siap','· Ready'],['Belum ada konten yang siap dijadwalkan','No content is ready to schedule'],['Review dan approve konten terlebih dahulu.','Review and approve content first.'],['konten dipilih','posts selected'],['Pilih waktu','Choose a time'],['Tanggal','Date'],['Waktu (WIB)','Time (WIB)'],['Lihat konten','View content'],['Batalkan jadwal','Cancel schedule'],['Batalkan jadwal?','Cancel this schedule?'],['Konten tidak akan dihapus dan bisa dijadwalkan kembali.','The content will not be deleted and can be scheduled again.'],['Atur hasil Threads','Configure Threads output'],['Sesuaikan format sebelum konten dibuat.','Adjust the format before creating content.'],['Topic terpilih','Selected topic'],['Jumlah varian','Number of variations'],['Buat hingga 5 versi dengan angle yang berbeda.','Create up to 5 versions with different angles.'],['Panjang konten','Content length'],['Pendek','Short'],['1 post ringkas','1 concise post'],['Panjang','Long'],['Post utama + reply','Main post + reply'],['Instruksi tambahan','Additional instructions'],['(opsional)','(optional)'],['Setiap varian memakai angle berbeda agar hasil tidak repetitif.','Each variation uses a different angle to avoid repetitive results.'],['Belum ada topic dipilih','No topic selected'],['Klik salah satu baris tabel untuk lihat detail topic di panel ini.','Select a table row to see topic details here.'],['Topic Library','Topic Library'],['Daftar content topic','Content topics'],['Cari topic','Search topics'],['Topik','Topic'],['Kategori','Category'],['Aksi','Action'],['Memuat topic...','Loading topics...'],['Sedang mengambil data content topic dari database.','Fetching content topics from the database.'],['Belum ada topic yang cocok','No matching topics'],['Coba ubah kata kunci pencarian atau pilih category lain.','Try another search term or choose a different category.'],['Pilih satu topic','Choose a topic'],['Topic adalah ide utama yang ingin kamu jadikan konten.','A topic is the main idea you want to turn into content.'],['Sedang membuat','Creating'],['varian','variations'],['Jangan tutup halaman ini. Hasil akan muncul otomatis.','Keep this page open. Results will appear automatically.'],['Pilih arah ide','Choose an idea direction'],['Jumlah Topics','Number of ideas'],['Mencari ide...','Finding ideas...'],['Pilih sumber ide','Choose an idea source'],['Lagi bikin konten kamu...','Creating your content...'],['Atur Jadwal','Set schedule'],['Jadwalkan Konten','Schedule content'],['Atur jadwal posting','Set posting schedule'],['Siap Dijadwalkan','Ready to schedule'],['Terjadwal','Scheduled'],['Terbit','Published'],
  // Dashboard, account connections, payments, and plans
  ['Lihat semua','View all'],['Buat postingan pertamamu dari sebuah ide.','Create your first post from an idea.'],['postingan saat ini sudah terjadwal.','posts are currently scheduled.'],['Postingan yang disetujui siap ditambahkan ke jadwal.','Approved posts will be ready to place on your schedule.'],['Akun alurin','alurin Account'],['Hubungkan akun media sosial Anda untuk memulai automasi.','Connect your social media account to start automating.'],['Hubungkan','Connect'],['Putuskan koneksi Threads?','Disconnect Threads?'],['Koneksi Threads akan diputus. Setelah itu status akun menjadi disconnected dan action berikutnya adalah connect lagi.','Your Threads account will be disconnected. Its status will change to disconnected, and you can connect it again later.'],['Kembali ke AI Credits','Back to AI Credits'],['Memuat riwayat pembayaran...','Loading payment history...'],['Riwayat pembayaran','Payment history'],['Maksimal 10 order terbaru dari akun kamu.','Your 10 most recent orders.'],['Tidak ada pembayaran dengan status ini.','No payments with this status.'],['Memuat halaman pembayaran...','Loading payment page...'],['Menyiapkan paket dan saldo AI Credits kamu.','Preparing your plans and AI Credits balance.'],['Top up AI Credits','Top up AI Credits'],['Pilih paket credits, periksa ringkasan order, lalu selesaikan pembayaran melalui halaman pembayaran yang aman.','Choose a credit package, review your order, then pay securely.'],['Saldo saat ini','Current balance'],['AI Credits tersedia','AI Credits available'],['Pilih paket credits','Choose a credit package'],['Top up tidak mengubah paket langganan atau entitlement akun.','A top-up does not change your subscription plan or account entitlements.'],['Pilih QRIS atau virtual account yang tersedia.','Choose an available QRIS or virtual account payment method.'],['Harga paket','Package price'],['Biaya layanan','Service fee'],['Credits masuk setelah pembayaran berhasil diverifikasi oleh server dan berlaku selama 12 bulan.','Credits are added after the server verifies payment and remain valid for 12 months.'],['Belum ada paket top up yang tersedia.','No top-up packages are available yet.'],['Pembayaran terenkripsi','Encrypted payment'],['Credits diberikan otomatis','Credits added automatically'],['Webhook aman dan idempotent','Secure, idempotent webhook'],['Menyiapkan saldo dan riwayat penggunaanmu.','Preparing your balance and usage history.'],['Kelola AI Credits kamu','Manage your AI Credits'],['Pantau saldo, pemakaian, dan riwayat credits dalam satu halaman.','Track your balance, usage, and credit history in one place.'],['Total AI Credits','Total AI Credits'],['+ Top up','+ Top up'],['Paket kamu','Your plan'],['Kelola langganan atau lihat pilihan paket lainnya.','Manage your subscription or browse other plans.'],['Lihat paket','View plans'],['Riwayat credits','Credit history'],['Belum ada transaksi credits.','No credit transactions yet.'],['Riwayat penggunaan','Usage History'],['Belum ada penggunaan AI.','No AI usage yet.'],['Paling direkomendasikan','Recommended'],['Sesuai kebutuhan','Built for your needs'],['Fleksibel','Flexible'],['Untuk tim atau bisnis yang membutuhkan kapasitas lebih besar dari paket Max.','For teams or businesses that need more capacity than the Max plan.'],['AI Credits dalam jumlah khusus','Custom AI Credits allowance'],['Volume konten dan workspace lebih besar','Higher content and workspace limits'],['Skema harga yang disesuaikan','Custom pricing'],['Bantuan onboarding dan prioritas support','Onboarding and priority support'],['Untuk kebutuhan besar','For larger needs'],['Hubungi kami','Contact Us'],['Paket tersedia','Available plans'],['Paket saat ini','Current plan'],['Memuat subscription plans...','Loading subscription plans...'],['Menunggu daftar paket aktif dan status subscription user.','Loading available plans and your subscription status.'],['Tidak ada plan aktif','No active plans'],['Pastikan endpoint `GET /api/subscription-plans` mengembalikan paket aktif.','Make sure `GET /api/subscription-plans` returns active plans.'],['Bayar','Pay'],
  ['Pilih','Choose'],['Pembuat Persona alurin','alurin Persona Builder'],['Buka tips persona','Open persona tips'],['Tips','Tips'],['Persona baru','New Persona'],['Tips persona','Persona tips'],['Isi target audience dan niche dengan contoh yang konkret.','Describe your target audience and niche with concrete examples.'],['Pilih tone yang sesuai dengan gaya kontenmu.','Choose a tone that fits your content style.'],['Mulai dari versi sederhana, lalu perbaiki setelah disimpan.','Start with a simple version, then refine it after saving.'],['Tutup tips','Close tips'],['Panduan Persona','Persona Wizard'],['Langkah','Step'],['AI','AI'],['Asisten','Assistant'],['Kita mulai pelan-pelan. Jawab saja satu per satu, dan kalau mau cepat pakai pill yang sudah disiapkan.','We will take it one step at a time. Answer each question, or use a suggested option to move faster.'],['Kamu','You'],['Kolom saat ini','Current field'],['Pilihan cepat','Quick picks'],['Jawabanmu','Your answer'],['Catatan langkah','Step note'],['Kembali','Back'],['Berikutnya','Next'],['Pembuat Pilar alurin','alurin Pillar Builder'],['Buka tips content pillar','Open content pillar tips'],['Pilih persona dulu','Choose a persona first'],['Pilih Content Pillar','Choose a content pillar'],['Pillar baru','New pillar'],['New Pillar','New pillar'],['Tips content pillar','Content pillar tips'],['Pilih persona yang sesuai dengan audiens dan gaya kontenmu.','Choose a persona that fits your audience and content style.'],['Gunakan satu tema utama yang jelas untuk setiap pillar.','Use one clear main theme for each pillar.'],['Isi tujuan, audiens, dan pesan utama dengan contoh yang konkret.','Describe the goal, audience, and key message with concrete examples.'],['Sesuaikan jenis thread dan ajakan bertindak dengan tujuan konten.','Match the thread format and call to action to your content goal.'],['Mulai dari ide baru atau gunakan ide yang sudah tersimpan.','Start with a new idea or use a saved one.'],['Dapatkan ide berdasarkan Content Brain kamu.','Get ideas based on your Content Brain.'],['Gunakan Ide Tersimpan','Use a saved idea'],['Preview ide yang tersedia di langkah berikutnya.','Preview available ideas in the next step.'],['Belum ada ide tersimpan','No saved ideas yet'],['Cari ide baru untuk mulai membuat konten.','Find new ideas to start creating content.'],['alurin sekarang sudah punya dasar untuk membantu membuat ide dan kontenmu.','alurin now has a foundation to help create your ideas and content.'],['Ini yang alurin gunakan untuk memahami kamu dan membuat konten yang lebih sesuai.','alurin uses this to understand you and create more relevant content.'],['Ide','Ideas'],['Audiens','Audience'],['Tone','Tone'],['Topik utama yang menjadi arah kontenmu.','The main topics that guide your content.'],['Perubahan pada Content Brain akan digunakan oleh flow generasi yang sudah ada untuk ide dan konten berikutnya.','Changes to your Content Brain will guide future idea and content generation.'],['Editing','Editing'],['Pilih arah ide','Choose an idea direction'],['Jumlah Topics','Number of ideas'],['Mencari ide...','Finding ideas...'],['Pilih sumber ide','Choose an idea source'],['Lagi bikin konten kamu...','Creating your content...'],['Atur Jadwal','Set schedule'],['Jadwalkan Konten','Schedule content'],['Atur jadwal posting','Set posting schedule'],['Siap Dijadwalkan','Ready to schedule'],['Terjadwal','Scheduled'],['Terbit','Published'],
  ['SELAMAT DATANG','WELCOME'],['Kontenmu hari ini','Your content today'],['Draft siap','Ready drafts'],['Persona aktif','Active persona'],['MULAI DARI IDE','START WITH AN IDEA'],['Buat konten Threads baru','Create a new Threads post'],['Pilih Persona dan Content Pillar, lalu biarkan Alurin membantu menyusun topik.','Choose a Persona and Content Pillar, then let Alurin help shape your topics.'],['Generate Topic','Generate a topic'],['Oktober 2026','October 2026'],['Paling Populer','Most popular'],['Mulai Gratis','Start for free'],['Lewati ke konten','Skip to content'],['Fitur','Features'],['Cara Kerja','How it works'],['Harga','Pricing'],['Workspace konten Threads bertenaga AI','AI-powered Threads content workspace'],['Ide ngalir,','Ideas flow,'],['konten terbit.','content gets published.'],['Dari cari ide, bikin konten, sampai jadwal posting Threads. Semua lebih gampang dengan Alurin.','From finding ideas and creating content to scheduling Threads posts. Alurin makes it easier.'],['Lihat Cara Kerja','See how it works'],['6 AI Credits gratis · Tanpa kartu kredit','6 free AI Credits · No credit card required'],['CARA KERJA','HOW IT WORKS'],['Dari ide kosong ke konten terjadwal.','From a blank page to scheduled content.'],['Satu alur sederhana untuk membangun ritme konten yang lebih konsisten.','One simple workflow to build a more consistent content rhythm.'],['FITUR ALURIN','ALURIN FEATURES'],['Semua yang kamu butuhkan untuk terus terbit.','Everything you need to keep publishing.'],['Bukan sekadar generator. Alurin menyatukan proses berpikir, menulis, mengedit, dan menjadwalkan.','More than a generator. Alurin brings planning, writing, editing, and scheduling together.'],['HARGA','PRICING'],['Mulai gratis, bertumbuh sesuai kebutuhan.','Start for free and grow as you need.'],['Semua paket bisa Generate Topic dan Content selama AI Credits tersedia.','Every plan can generate topics and content while AI Credits are available.'],['Paket berbayar memiliki Schedule Post tanpa kuota bulanan dari Alurin, dengan tetap mengikuti batas Threads API.','Paid plans include post scheduling without an Alurin monthly quota, subject to Threads API limits.'],['Pertanyaan yang sering muncul.','Frequently asked questions.'],['SIAP MULAI?','READY TO START?'],['Konten Threads nggak harus bikin pusing.','Threads content does not have to be stressful.'],['Mulai dari satu ide, biarkan Alurin bantu kamu bikin konten lebih konsisten.','Start with one idea and let Alurin help you publish more consistently.'],['Mulai Gratis Sekarang','Start for free now'],['Ide ngalir, konten terbit.','Ideas flow, content gets published.'],['Produk','Product'],['Syarat & Ketentuan','Terms of Service'],['Daftar','Register'],['Alurin. Hak cipta dilindungi.','Alurin. All rights reserved.'],['Demo gratis','Free demo'],['AI writing workspace untuk Threads','AI writing workspace for Threads'],['Ubah satu ide menjadi','Turn one idea into a'],['thread yang siap posting.','thread ready to post.'],['Jawab empat pertanyaan singkat. alurin akan menyusun arah kontenmu sebelum kamu melanjutkan ke workspace.','Answer four quick questions. alurin will shape your content direction before you continue to the workspace.'],['4 langkah singkat','4 quick steps'],['Gratis dicoba','Try it for free'],['Tanpa kartu','No credit card'],['Mulai cepat','Quick start'],['Hasil demo','Demo result'],['Pratinjau','Preview'],['Login untuk lanjut','Log in to continue'],['Opsional','Optional'],['Lihat semua','View all'],['Buat postingan pertamamu dari sebuah ide.','Create your first post from an idea.'],['Postingan yang disetujui siap ditambahkan ke jadwal.','Approved posts will be ready to place on your schedule.'],
  ['Dokumen legal','Legal documents'],['Berlaku dan terakhir diperbarui:','Effective and last updated:'],['alurin menyediakan alat bantu berbasis AI untuk menyusun ide, membuat dan mengelola konten, menjadwalkan publikasi, serta menghubungkan akun media sosial seperti Threads.','alurin provides AI-powered tools to develop ideas, create and manage content, schedule publishing, and connect social media accounts such as Threads.'],['Data yang kami proses','Data we process'],['Data akun, seperti nama, alamat email, dan informasi profil.','Account data such as your name, email address, and profile information.'],['Data yang kamu masukkan, termasuk persona, pilar konten, ide, draf, dan jadwal publikasi.','Information you provide, including personas, content pillars, ideas, drafts, and publishing schedules.'],['Informasi akun media sosial yang kamu hubungkan serta token akses yang diperlukan untuk menjalankan fitur yang kamu pilih.','Information about connected social media accounts and the access tokens needed to provide the features you choose.'],['Data teknis dan penggunaan, seperti log kesalahan, perangkat, alamat IP, dan aktivitas fitur.','Technical and usage data such as error logs, device information, IP addresses, and feature activity.'],['Informasi langganan dan transaksi. Detail kartu atau rekening diproses oleh penyedia pembayaran dan tidak kami simpan secara langsung.','Subscription and transaction information. Payment providers process card and bank details; we do not store them directly.'],['Cara kami menggunakan data','How we use data'],['Kami menggunakan data untuk menyediakan dan mengamankan layanan, menghasilkan konten sesuai instruksi kamu, memublikasikan konten yang kamu setujui, mengelola akun dan langganan, memberi dukungan, mencegah penyalahgunaan, serta memperbaiki kualitas produk.','We use data to provide and secure the service, generate content based on your instructions, publish content you approve, manage accounts and subscriptions, provide support, prevent misuse, and improve the product.'],['Pembagian dan penyimpanan data','Sharing and retaining data'],['Data hanya dibagikan seperlunya kepada penyedia infrastruktur, autentikasi, AI, pembayaran, analitik, dan platform media sosial yang kamu hubungkan. Kami tidak menjual data pribadimu. Masa penyimpanan disesuaikan dengan kebutuhan layanan, kewajiban hukum, keamanan, dan penyelesaian sengketa.','We share data only as needed with infrastructure, authentication, AI, payment, analytics, and connected social media providers. We do not sell your personal data. We retain data as needed to provide the service, meet legal obligations, protect security, and resolve disputes.'],['Penghapusan data','Deleting data'],['Kamu dapat memutuskan koneksi Threads dari pengaturan aplikasi. Untuk menghapus akun dan data terkait, kirim permintaan dari email terdaftar ke','You can disconnect Threads in the app settings. To delete your account and related data, email your request from your registered address to'],['. Kami akan memverifikasi kepemilikan akun, menghapus atau menganonimkan data yang tidak wajib disimpan, dan memberi konfirmasi setelah proses selesai.','. We will verify account ownership, delete or anonymize data that we are not required to retain, and confirm when the process is complete.'],['Salinan tertentu dapat dipertahankan sementara jika diwajibkan oleh hukum, diperlukan untuk keamanan, atau masih berada dalam siklus pencadangan terbatas.','Some copies may be retained temporarily when required by law, needed for security, or held in a limited backup cycle.'],['Hak dan pilihan kamu','Your rights and choices'],['Kamu dapat meminta akses, koreksi, atau penghapusan data, mencabut koneksi layanan pihak ketiga, serta berhenti menggunakan layanan. Mencabut izin dapat membuat beberapa fitur tidak lagi berfungsi.','You may request access, correction, or deletion of your data, disconnect third-party services, and stop using the service. Revoking access may disable some features.'],['Keamanan dan perubahan kebijakan','Security and policy changes'],['Kami menerapkan perlindungan teknis dan organisasi yang wajar, tetapi tidak ada sistem internet yang sepenuhnya bebas risiko. Jika kebijakan ini berubah secara material, tanggal pembaruan di halaman ini akan disesuaikan.','We use reasonable technical and organizational safeguards, but no internet system is entirely risk-free. If this policy changes materially, we will update the date shown on this page.'],['Isi dokumen','Contents'],['Layanan','Services'],['Konten & AI','Content & AI'],['AI Credits','AI Credits'],['Pembatalan & refund','Cancellation & refunds'],['Larangan','Prohibited use'],['Tanggung jawab','Liability'],['1. Ruang lingkup layanan','1. Scope of service'],['alurin menyediakan perangkat lunak berbasis AI untuk membantu perencanaan, pembuatan, pengelolaan, penjadwalan, dan publikasi konten. Fitur, kuota, harga, dan ketersediaan dapat berbeda menurut paket. Kami dapat memperbaiki, mengubah, menambah, atau menghentikan fitur dengan pemberitahuan yang wajar jika perubahan berdampak material kepada pengguna.','alurin provides AI-powered software to help plan, create, manage, schedule, and publish content. Features, limits, prices, and availability may vary by plan. We may fix, change, add, or discontinue features with reasonable notice when a change materially affects users.'],['2. Kelayakan, akun, dan keamanan','2. Eligibility, accounts, and security'],['Kamu harus berusia sekurang-kurangnya 17 tahun atau memiliki kapasitas hukum untuk menyetujui perjanjian ini. Kamu wajib memberikan informasi akun yang benar dan terbaru, menjaga kerahasiaan kredensial, tidak memindahtangankan akun, serta segera memberi tahu kami jika akun diduga disalahgunakan. Kamu bertanggung jawab atas aktivitas melalui akunmu sampai kami menerima laporan dan mengambil tindakan pengamanan yang wajar.','You must be at least 17 years old or otherwise have the legal capacity to accept this agreement. You must provide accurate, current account information, keep your credentials confidential, not transfer your account, and promptly notify us of suspected misuse. You are responsible for activity on your account until we receive your report and take reasonable security measures.'],['3. Konten pengguna dan hasil AI','3. User content and AI output'],['Kamu tetap memiliki hak atas konten asli yang kamu masukkan dan memberi alurin izin terbatas untuk memprosesnya hanya guna menyediakan layanan. Kamu bertanggung jawab memastikan bahwa materi masukan dan publikasi tidak melanggar hukum atau hak pihak lain.','You retain your rights to original content you provide and grant alurin limited permission to process it only to provide the service. You are responsible for ensuring that your inputs and published content do not violate the law or anyone else’s rights.'],['Hasil AI dapat mengandung kesalahan, informasi yang tidak mutakhir, kemiripan dengan keluaran lain, atau materi yang memerlukan penyuntingan. Kamu wajib meninjau fakta, hak penggunaan, nada, dan kelayakan hasil sebelum digunakan atau dipublikasikan. alurin tidak menjamin performa, jangkauan, atau hasil bisnis tertentu.','AI output may contain errors, outdated information, similarities to other output, or material that needs editing. You must review facts, usage rights, tone, and suitability before using or publishing it. alurin does not guarantee specific performance, reach, or business results.'],['4. AI Credits dan batas penggunaan','4. AI Credits and usage limits'],['AI Credits adalah satuan penggunaan fitur AI di alurin, bukan uang elektronik, alat pembayaran, atau aset yang dapat diuangkan dan dipindahtangankan. Jumlah credits yang terpakai bergantung pada fitur dan beban pemrosesan yang dijelaskan di aplikasi.','AI Credits measure usage of alurin AI features. They are not electronic money, a payment instrument, or an asset that can be redeemed for cash or transferred. The number of credits used depends on the feature and processing load described in the app.'],['Credits dari langganan mengikuti siklus dan ketentuan paket. Credits hasil top up berlaku selama 12 bulan sejak berhasil ditambahkan ke akun. Saat ada lebih dari satu saldo, sistem dapat menentukan urutan pemakaian untuk mengoptimalkan masa berlaku. Credits yang kedaluwarsa atau diberikan sebagai bonus tidak dapat diuangkan.','Subscription credits follow the plan cycle and terms. Top-up credits are valid for 12 months from the date they are added to your account. If you have multiple balances, the system may choose their usage order to make the best use of their validity period. Expired or bonus credits cannot be redeemed for cash.'],['5. Harga, langganan, dan pembayaran','5. Prices, subscriptions, and payments'],['Seluruh harga ditampilkan dalam Rupiah (IDR). Rincian paket, kuota, periode tagihan, pajak atau biaya yang berlaku, serta jumlah akhir ditampilkan sebelum pembayaran. Kamu bertanggung jawab memeriksa detail transaksi sebelum melanjutkan.','All prices are shown in Indonesian Rupiah (IDR). Plan details, limits, billing period, applicable taxes or fees, and the final amount are shown before payment. You are responsible for reviewing the transaction details before continuing.'],['Pembayaran diproses melalui penyedia pembayaran dan mitra kanalnya. alurin tidak menyimpan detail kartu, PIN, atau kredensial perbankanmu. Pembayaran dianggap berhasil setelah statusnya diverifikasi oleh sistem kami dari penyedia pembayaran. Instruksi, batas waktu, dan ketentuan kanal pembayaran yang kamu pilih tetap berlaku.','Payments are processed by payment providers and their channel partners. alurin does not store your card details, PIN, or banking credentials. A payment is considered successful after our system verifies its status with the provider. The instructions, deadlines, and terms of your chosen payment method still apply.'],['Untuk langganan berulang, biaya akan ditagihkan sesuai periode yang ditampilkan saat pembelian sampai dibatalkan. Perubahan harga untuk periode berikutnya akan diberitahukan terlebih dahulu. Kegagalan pembayaran dapat menyebabkan penundaan aktivasi, penghentian perpanjangan, atau penurunan akses.','For recurring subscriptions, charges continue at the interval shown when you purchase until you cancel. We will notify you in advance of price changes for future periods. A failed payment may delay activation, stop renewal, or reduce access.'],['6. Pembatalan, refund, dan transaksi bermasalah','6. Cancellations, refunds, and payment issues'],['Kamu dapat membatalkan perpanjangan langganan untuk periode berikutnya. Akses paket tetap tersedia sampai akhir periode yang sudah dibayar, kecuali dinyatakan lain pada saat pembelian.','You may cancel renewal for the next subscription period. Your plan remains available until the end of the period you paid for, unless stated otherwise at purchase.'],['Pembelian produk digital yang telah aktif atau AI Credits yang telah ditambahkan pada umumnya tidak dapat dibatalkan atau dikembalikan, kecuali diwajibkan oleh hukum, terjadi pembayaran ganda, atau layanan gagal diberikan karena kesalahan sistem kami. Permintaan terkait transaksi harus dikirim ke','Activated digital products and AI Credits that have been added are generally non-cancellable and non-refundable, except where required by law, for duplicate payments, or when our system fails to provide the service. Send transaction requests to'],['dengan email akun, ID transaksi, dan bukti pendukung. Persetujuan dan waktu pengembalian mengikuti hasil verifikasi serta proses kanal pembayaran.','with your account email, transaction ID, and supporting evidence. Refund approval and timing depend on verification and the payment provider’s process.'],['7. Layanan pihak ketiga','7. Third-party services'],['Fitur tertentu bergantung pada layanan pihak ketiga, termasuk Threads atau Meta, penyedia AI, autentikasi, infrastruktur, dan penyedia pembayaran. Penggunaan fitur tersebut juga tunduk pada ketentuan masing-masing penyedia. Perubahan, pembatasan, atau gangguan pihak ketiga dapat memengaruhi fungsi alurin.','Some features rely on third-party services, including Threads or Meta, AI providers, authentication, infrastructure, and payment providers. Your use of those features is also subject to each provider’s terms. Third-party changes, restrictions, or outages may affect alurin.'],['8. Penggunaan yang dilarang','8. Prohibited use'],['Kamu tidak boleh memakai alurin untuk melanggar hukum atau hak pihak lain, melakukan penipuan, spam, manipulasi, ujaran kebencian, eksploitasi seksual, perjudian ilegal, distribusi malware, akses tanpa izin, penghindaran batas penggunaan, atau kegiatan lain yang berbahaya. Kamu juga tidak boleh menjual kembali akses, merekayasa balik, mengganggu sistem, atau menggunakan pembayaran alurin untuk memproses transaksi pihak lain tanpa izin tertulis.','You may not use alurin to break the law or violate others’ rights, commit fraud, send spam, manipulate, spread hate speech, sexually exploit others, conduct illegal gambling, distribute malware, gain unauthorized access, evade usage limits, or engage in other harmful activity. You may not resell access, reverse engineer or disrupt the system, or use alurin payments to process someone else’s transactions without written permission.'],['9. Hak kekayaan intelektual','9. Intellectual property'],['Perangkat lunak, desain, merek, dokumentasi, dan materi milik alurin dilindungi oleh hak kekayaan intelektual. Kami memberi kamu hak terbatas, non-eksklusif, tidak dapat dialihkan, dan dapat dicabut untuk menggunakan layanan sesuai paket dan Syarat dan Ketentuan ini.','alurin’s software, designs, brands, documentation, and materials are protected by intellectual property rights. We grant you a limited, non-exclusive, non-transferable, and revocable right to use the service under your plan and these Terms and Conditions.'],['10. Penangguhan dan penghentian','10. Suspension and termination'],['Kami dapat membatasi atau menghentikan akses jika terjadi pelanggaran, risiko keamanan, indikasi penipuan, kewajiban hukum, tunggakan, atau penggunaan yang merugikan pengguna maupun sistem lain. Jika memungkinkan, kami akan memberi pemberitahuan dan kesempatan yang wajar untuk memperbaiki pelanggaran.','We may restrict or terminate access for violations, security risks, suspected fraud, legal obligations, overdue payments, or use that harms users or other systems. Where possible, we will provide notice and a reasonable opportunity to address the issue.'],['11. Ketersediaan dan batasan tanggung jawab','11. Availability and limitation of liability'],['Layanan diberikan sebagaimana tersedia. Kami berupaya menjaga layanan tetap aman dan berfungsi, namun tidak menjamin layanan selalu bebas gangguan atau kesalahan. Sejauh diizinkan hukum, alurin tidak bertanggung jawab atas kerugian tidak langsung, kehilangan peluang, atau dampak yang timbul dari keputusan pengguna berdasarkan hasil AI atau gangguan layanan pihak ketiga.','The service is provided as available. We work to keep it secure and operational, but cannot guarantee it will always be uninterrupted or error-free. To the extent permitted by law, alurin is not liable for indirect loss, lost opportunities, or consequences of decisions based on AI output or third-party service disruptions.'],['12. Hukum yang berlaku dan perubahan','12. Governing law and changes'],['Syarat dan Ketentuan ini diatur oleh hukum Republik Indonesia. Perselisihan terlebih dahulu akan diupayakan selesai melalui musyawarah. Kami dapat memperbarui dokumen ini untuk mencerminkan perubahan produk, keamanan, pembayaran, atau kewajiban hukum dan akan memperbarui tanggal berlaku di halaman ini.','These Terms and Conditions are governed by the laws of the Republic of Indonesia. We will first seek to resolve disputes through discussion. We may update this document to reflect changes to the product, security, payments, or legal obligations, and will update the effective date on this page.'],['13. Kontak','13. Contact'],['Pertanyaan, keluhan, dan permintaan terkait akun atau transaksi dapat dikirim ke','Questions, complaints, and requests about your account or transactions can be sent to'],['. Sertakan informasi yang cukup agar kami dapat melakukan verifikasi tanpa mengirimkan kata sandi, PIN, atau OTP.','. Include enough information for us to verify your request, but do not send your password, PIN, or one-time passcode.'],
  ['Alurin operations','Operasional Alurin'],['Pusat Kontrol Admin','Admin Control Center'],['Monitoring dan data operasional aktual.','Monitoring and current operational data.'],['Kembali ke dashboard pengguna','Back to user dashboard'],['Operations','Operasional'],['Cari','Search'],['Paket','Plan'],['Semua paket','All plans'],['Urutkan','Sort'],['Semua status','All statuses'],['Dari','From'],['Sampai','To'],['Memuat data…','Loading data…'],['7 hari','7 days'],['30 hari','30 days'],['Coverage dan kualitas data','Data coverage and quality'],['Snapshot','Snapshot'],['Belum ada data pada rentang ini.','No data for this date range.'],['Daftar users dibatasi pada 100.000 profil untuk menjaga penggunaan database.','The user list is limited to 100,000 profiles to protect database capacity.'],['records','records'],['Sebelumnya','Previous'],['Halaman','Page'],['Log mencakup error API/server berstatus 5xx. Body request, kredensial, dan stack trace tidak disimpan.','Logs include API/server errors with 5xx status codes. Request bodies, credentials, and stack traces are not stored.'],['← Kembali ke daftar pengguna','← Back to user list'],['Profil pengguna','User profile'],['AI requests terbaru','Latest AI requests'],['Transaksi terbaru','Latest transactions'],['Perubahan kredit terbaru','Latest credit changes'],['Post terjadwal terbaru','Latest scheduled posts'],['alurin Content Engine','alurin Content Engine'],['Buat variant dari satu topic','Create variations from one topic'],['Pilih satu topic lalu buat hingga lima angle konten yang berbeda.','Choose a topic and create up to five different content angles.'],['Manual mode','Mode manual'],['Change flow','Ganti alur'],['×','×'],['Batal','Cancel'],['Sebelumnya','Previous'],['Paket khusus','Custom Plan'],['Batal','Cancel'],['FAQ','FAQ'],['Legal','Legal'],['Daftar konten','Content List'],['Dashboard','Dashboard'],['586 AI Credits','586 AI Credits'],['09:30 · Tips membangun personal brand','09:30 · Tips for building a personal brand'],['16:00 · Kenapa konsistensi lebih penting','16:00 · Why consistency matters more'],['Pilar','Pillar'],['Ide tersimpan','Saved ideas'],['Content Brain 🧠','Content Brain 🧠'],['alurin 0.1.0','alurin 0.1.0'],['AI Credits tersedia','AI Credits available'],['token ·','tokens ·'],['credits','credits'],['dan','and'],['·','·'],
  ['Memuat AI Credits...','Loading AI Credits...'],['· Top up','· Top up'],['item','items'],['Kita mulai dari gambaran audiensmu. Jawaban singkat saja sudah cukup.','Let’s start with your audience. A short answer is enough.'],['Syarat &amp; Ketentuan','Terms & Conditions'],['Khusus','Custom'],['Rp0','IDR 0'],
  ['Urutkan data di halaman ini','Sort data on this page'],['Modul admin','Admin modules'],['Tren pendapatan (top-up saja)','Revenue trend (top-ups only)'],['Tren biaya AI (estimasi internal)','AI cost trend (internal estimate)'],['Pendapatan vs biaya AI','Revenue vs AI cost'],['Pertumbuhan pengguna','User growth'],['Pendapatan berdasarkan paket langganan','Revenue by subscription plan'],['Penggunaan AI berdasarkan fitur','AI usage by feature'],['Paket langganan aktif','Active subscription plan'],['Edit jadwal','Edit schedule'],['Cari konten','Search content'],['Cari konten...','Search content...'],['Hapus output','Delete content'],['Konten terbit','Published content'],['Konfirmasi hapus konten','Confirm content deletion'],['Retry output','Retry content'],['Edit output','Edit content'],['Delete output','Delete content'],['Alur pembuatan konten','Content creation flow'],['Cara membuat konten','How to create content'],['Pillar sebelumnya','Previous pillar'],['Pillar berikutnya','Next pillar'],['Masukkan nama topic','Enter a topic name'],['Navigasi demo','Demo navigation'],['Beranda alurin','Alurin home'],['Detail demo','Demo details'],['Pilih cara mulai','Choose how to start'],['Hasil ide','Idea results'],['Tutup hasil ide','Close idea results'],['Edit judul ide','Edit idea title'],['Aksi ide terpilih','Selected idea actions'],['Preview workspace Alurin','Alurin workspace preview'],['Navigasi utama','Main navigation'],['Beranda alurin','Alurin home'],['Daftar isi Syarat dan Ketentuan','Terms and Conditions contents'],['Tautan legal','Legal links'],['Ketik judul topic, category, atau pillar...','Enter a topic title, category, or pillar...'],['Filter kategori topic','Filter topic categories'],['Daftar topic','Topic list'],['Pagination topic','Topic pagination'],['Kurangi jumlah variant','Decrease number of variations'],['Jumlah variant','Number of variations'],['Tambah jumlah variant','Increase number of variations'],['Tonenya lebih santai dan tambahkan CTA yang natural.','Use a more casual tone and add a natural call to action.'],['Pilih topic','Choose a topic'],['Tutup pemilih topic','Close topic selector'],['Cari berdasarkan judul atau category...','Search by title or category...'],['Filter kategori topic mobile','Filter topic categories on mobile'],['Halaman sebelumnya mobile','Previous page on mobile'],['Halaman berikutnya mobile','Next page on mobile'],['Filter status pembayaran','Filter payment status'],['Content Brain flow','Content Brain flow'],['Paket top up AI Credits','AI Credits top-up packages'],['Ringkasan pembayaran','Payment summary'],['Tutorial alurin','alurin tutorial'],['Admin Dashboard','Admin Dashboard'],['Penggunaan AI Credits','AI Credits usage'],['Monitoring dan data operasional aktual.','Monitoring and current operational data.'],['Daftar users dibatasi pada 100.000 profil untuk menjaga penggunaan database.','The user list is limited to 100,000 profiles to protect database capacity.'],['* Kontribusi dihitung dari top-up tercatat dikurangi estimasi biaya AI IDR. Angka USD tersimpan dihitung memakai tarif internal yang belum diverifikasi terhadap tagihan provider; model SumoPod belum dikonfigurasi di environment backend saat audit. Pendapatan subscription, refund, biaya gateway, dan kurs historis tidak tersedia, jadi ini bukan profit total atau margin aktual.','* Contribution is calculated from recorded top-ups minus estimated AI costs in IDR. Stored USD amounts use internal rates that have not been verified against provider invoices; the SumoPod model was not configured in the backend environment during review. Subscription revenue, refunds, gateway fees, and historical exchange rates are unavailable, so this is not total profit or actual margin.'],['* Estimasi memakai top-up yang tercatat dan estimasi biaya AI IDR. Data subscription revenue, biaya gateway, refunds lengkap, dan kurs historis belum tersedia.','* Estimates use recorded top-ups and estimated AI costs in IDR. Subscription revenue, gateway fees, complete refund data, and historical exchange rates are not available.'],
  ['Login ke workspace kamu','Log in to your workspace'],['Register alurin','Sign up for alurin'],['Login dengan email kamu untuk melanjutkan.','Log in with your email to continue.'],['Mulai perjalanan konten kamu.','Start your content journey.'],['Sembunyikan kata sandi','Hide password'],['Tampilkan kata sandi','Show password'],['Memproses...','Processing...'],['Belum punya akun?','Don’t have an account?'],['Sudah punya akun?','Already have an account?'],['Koneksi Threads telah kedaluwarsa. Hubungkan kembali akun Anda.','Your Threads connection has expired. Reconnect your account.'],['Hubungkan Threads untuk membuat jadwal baru.','Connect Threads to create a new schedule.'],['Hubungkan Ulang Threads','Reconnect Threads'],['Hubungkan Threads','Connect Threads'],['Jadwalkan konten','Schedule content'],['Membatalkan...','Cancelling...'],['Batalkan Jadwal','Cancel schedule'],['email yang kamu daftarkan','the email address you registered'],['Mengirim...','Sending...'],['Kirim ulang verifikasi','Resend verification'],['Perlu dihubungkan ulang','Reconnect required'],['Memeriksa status koneksi...','Checking connection status...'],['Belum terhubung','Not connected'],['Terhubung','Connected'],['Disconnecting...','Disconnecting...'],['Menghubungkan...','Connecting...'],['Connect Threads','Connect Threads'],['Baru dibuat','Recently created'],['Menyetujui...','Approving...'],['Menghapus...','Deleting...'],['Konten tidak ditemukan','Content not found'],['Content Bank masih kosong','Your Content Bank is empty'],['Coba kata kunci atau filter lain.','Try another search term or filter.'],['Buat konten baru untuk mulai mengisi Content Bank.','Create new content to start filling your Content Bank.'],['Simpan dan Tandai Siap','Save and mark as ready'],['Simpan Perubahan','Save changes'],['Lengkapi data','Complete the required fields'],['Belum dipilih','Not selected'],['Sedang membuat konten...','Creating content...'],['Perbarui content pillar','Update content pillar'],['Buat content pillar','Create content pillar'],['Content Pillar','Content Pillar'],['Update Pillar','Update pillar'],['Create Pillar','Create pillar'],['Deleting...','Deleting...'],['Delete Pillar','Delete pillar'],['Bayangin ini seperti ngobrol dengan AI. Setiap pertanyaan sudah kita arahkan, jadi user tinggal jawab step by step lewat pill atau isi sendiri.','Think of this as a conversation with AI. We guide each question, so you can answer step by step using a suggestion or your own words.'],['Flow ini bisa dipakai juga untuk edit persona yang sudah ada, tanpa menghapus form lama.','You can also use this flow to edit an existing persona without removing the original form.'],['Pick a pill or type your own answer','Choose a suggestion or type your own answer'],['Type a longer answer','Enter a longer answer'],['Type your answer below','Type your answer below'],['Save Persona','Save persona'],['Content Brain · 2 of 2','Content Brain · 2 of 2'],['Topik utama yang menjadi arah ide dan kontenmu.','The main topic that guides your ideas and content.'],['Update persona utama','Update main persona'],['Buat persona utama','Create main persona'],['Memuat persona...','Loading persona...'],['Update Persona','Update persona'],['Create Persona','Create persona'],['Loading your workspace…','Loading your workspace…'],['Generating topics...','Generating topics...'],['Audiens belum diatur','Audience not set'],['No category_type','No category'],['Alur pembuatan konten','Content creation flow'],['Pilih topik, atur variant, lalu generate langsung.','Choose a topic, set the variations, then generate.'],['Atur Persona & Content Pillar','Set up a persona and content pillar'],['Tentukan siapa yang bicara, untuk siapa, dan topik utama yang ingin kamu bangun.','Choose who is speaking, who they are speaking to, and the main topic you want to develop.'],['Generate Topic & Content','Generate a topic and content'],['Pilih ide yang paling relevan lalu ubah menjadi draft Threads dengan bantuan AI.','Choose the most relevant idea and turn it into a Threads draft with AI.'],['Jadwalkan lewat Calendar','Schedule with the calendar'],['Review, edit, dan tentukan waktu terbit agar konten berjalan sesuai rencana.','Review, edit, and set a publishing time to keep your content on track.'],['Tutup menu','Close menu'],['Buka menu','Open menu'],['All categories','All categories'],['Refreshing...','Refreshing...'],['Ganti topic','Change topic'],['Cocok untuk pesan yang langsung dan cepat dibaca.','Best for a direct message that is quick to read.'],['Cocok untuk pembahasan bertahap yang lebih mendalam.','Best for a more in-depth discussion in several parts.'],['Sedang membuat varian...','Creating variations...'],['Cek status','Check status'],['Memproses...','Processing...'],['Pembayaran AI Credits','AI Credits payment'],['Paket saat ini','Current Plan'],['Sudah login','Logged in'],['Belum siap','Not ready'],['Membuat order...','Creating order...'],['Bayar sekarang','Pay now'],['Lihat detail akun','View account details'],['Detail transaksi','Transaction details'],['Scan untuk menyelesaikan pembayaran','Scan to complete payment'],['Selesaikan pembayaran melalui virtual account','Complete payment using the virtual account'],['Bayar nanti','Pay later'],['Tutup sidebar','Close sidebar'],['Buka sidebar','Open sidebar'],['Collapse sidebar','Ciutkan sidebar'],['Agregasi analytics belum tersedia sampai skrip admin_monitoring_setup.sql diterapkan ke database.','Analytics aggregation is unavailable until the admin_monitoring_setup.sql script is applied to the database.'],['Revenue di sini hanya top-up sukses yang tersimpan. Subscription revenue/MRR, biaya gateway, kurs historis, dan last-active tidak tersedia. Biaya AI IDR merupakan estimasi internal, bukan biaya aktual provider.','Revenue here includes only recorded successful top-ups. Subscription revenue/MRR, gateway fees, historical exchange rates, and last-active data are unavailable. AI costs in IDR are internal estimates, not actual provider costs.'],['Riwayat pembayaran langganan belum disimpan sebagai ledger keuangan utama. Rincian pendapatan langganan tidak tersedia.','Subscription payment history is not stored as a canonical financial ledger. Subscription revenue breakdown is unavailable.'],['Belum ada error server yang tercatat.','No server errors have been recorded.'],['Belum ada data untuk filter ini.','No data matches these filters.'],['Status paket','Plan status'],['Top-up tercatat','Recorded top-ups'],['Estimasi biaya AI','Estimated AI costs'],['Paket gratis','Free plan'],['Langganan aktif','Active subscription'],['Transaksi credits','Credit transactions'],
  ['Beranda alurin','alurin home'],['Bank Konten','Content Bank'],['Persona & Pilar','Persona & Content Pillars'],['alurin sedang mengalami kendala. Coba lagi beberapa saat.','alurin is having trouble. Please try again in a few moments.'],['Koneksi internet bermasalah. Periksa koneksi kamu lalu coba lagi.','There is a problem with your internet connection. Check your connection and try again.'],['Token penggunaan kamu sudah habis. Lihat paket untuk melanjutkan.','You have run out of usage credits. View plans to continue.'],['Terlalu banyak permintaan dalam waktu singkat. Tunggu sebentar lalu coba lagi.','Too many requests in a short time. Wait a moment and try again.'],['Prosesnya memakan waktu lebih lama dari biasanya. Coba lagi dalam beberapa saat.','This is taking longer than usual. Please try again in a moment.'],['Email atau password yang kamu masukkan belum benar.','The email or password you entered is incorrect.'],['Memuat data…','Loading data…'],['Membuka...','Opening...'],['Hubungkan akun','Connect account'],['Berhasil','Successful'],['Gagal','Failed'],['Pilih semua','Select all'],['Tersimpan','Saved'],['Tidak ada hasil','No results'],['Silakan coba lagi.','Please try again.'],['Tidak dapat memuat data.','Could not load data.'],
  ['Sebelumnya','Prev'],['Mulai cepat','Quick Start'],['KHUSUS','CUSTOM'],['Penggunaan AI Credits','AI Credit Usage'],['Pilar','Pillars'],['Ide','Idea'],
  ['Pendapatan top-up tercatat','Recorded top-up revenue'],['Estimasi biaya AI','Estimated AI cost'],['Penggunaan AI','AI usage'],['Cari nama atau account name','Search name or account name'],['Cari kode error atau request ID','Search error code or request ID'],['Cari user, order atau request','Search user, order, or request'],['Revenue tertinggi','Highest revenue'],['Biaya AI tertinggi','Highest AI cost'],['Token tertinggi','Most tokens'],['Kredit tertinggi','Most credits'],['Profit terendah','Lowest profit'],['Profit tertinggi','Highest profit'],['Profit negatif','Negative profit'],['Kontribusi estimasi*','Estimated contribution*'],['Kredit tersedia','Available credits'],['Kredit terpakai','Credits used'],['Token tercatat','Recorded tokens'],['Persona / pilar','Personas / pillars'],['Topik / konten','Topics / content'],['Jadwal post','Scheduled posts'],['Menjadwalkan...','Scheduling...'],['Platform tidak diketahui','Unknown platform'],['Login dulu untuk lanjut ke demo content.','Log in to continue to the content demo.'],['Hasil demo siap','Your demo is ready'],['Generating...','Generating...'],['Generate demo','Generate demo'],['Template Content','Template content'],['Content Brain · 1 of 2','Content Brain · 1 of 2'],['Atur cara alurin memahami suara, audiens, dan tujuan kontenmu.','Set how alurin understands your voice, audience, and content goals.'],['Kirim link reset password','Send password reset link'],['Persona kamu','Your persona'],['Mengubah...','Updating...'],['Ubah password','Change password'],['Lanjut Pembayaran','Continue to payment'],['Generasi sedang berlangsung','Generation in progress'],['Metode pembayaran tidak valid:','Invalid payment method:'],['Scan dari aplikasi bank atau e-wallet','Scan using your bank or e-wallet app'],['Bayar melalui nomor virtual account','Pay using a virtual account number'],
  // Persona and Content Pillar builders: form copy, placeholders, options, and feedback
  ['Contoh: Growth mentor yang practical dan persuasive','Example: A growth mentor with a practical, persuasive style'],
  ['Contoh: Creator pemula, affiliate marketer, dan small business owner','Example: Beginner creators, affiliate marketers, and small business owners'],
  ['Contoh: Personal branding, content strategy, monetisasi audience','Example: Personal branding, content strategy, and audience monetization'],
  ['Contoh: Singkat, padat, mudah di-scan, dan insight-driven','Example: Concise, easy to scan, and insight-driven'],
  ['Contoh: Bangun trust, tingkatkan engagement, dan dorong klik affiliate link','Example: Build trust, increase engagement, and drive affiliate link clicks'],
  ['Pilih tone','Choose a tone'],
  ['Hangat, percaya diri, to the point','Warm, confident, and to the point'],
  ['Friendly dan ringan','Friendly and light'],
  ['Authority dan edukatif','Authoritative and educational'],
  ['Bold dan kontrarian','Bold and contrarian'],
  ['Mode create aktif. Form sudah dikosongkan.','Create mode is active. The form has been cleared.'],
  ['Nama Content Pillar','Content Pillar Name'],
  ['Contoh: Educational Threads Funnel','Example: Educational Threads Funnel'],
  ['Template Content','Content Template'],
  ['Hook singkat yang menyorot pain audience, lanjutkan dengan insight praktis 3 poin, lalu tutup dengan CTA yang mengajak reply atau save.','Start with a concise hook that highlights an audience pain point, follow with three practical insights, then close with a CTA inviting readers to reply or save.'],
  ['Contoh: Bangun trust sambil mengarahkan audience ke conversion CTA','Example: Build trust while guiding the audience toward a conversion CTA'],
  ['Contoh: Creator dan affiliate marketer yang ingin jualan lebih halus','Example: Creators and affiliate marketers who want to sell more naturally'],
  ['Contoh: https://brandgrowth.id/go/starter-kit','Example: https://brandgrowth.id/go/starter-kit'],
  ['(Optional)','(Optional)'],
  ['Pilih persona dulu sebelum menyimpan content pillar.','Choose a persona before saving this content pillar.'],
  ['Content pillar berhasil diperbarui.','Content pillar updated successfully.'],
  ['Content pillar berhasil dibuat.','Content pillar created successfully.'],
  ['Content pillar belum berhasil disimpan. Coba lagi.','Could not save the content pillar. Please try again.'],
  ['Content Pillar belum berhasil disimpan','Could not save the content pillar'],
  ['Pilih content pillar yang mau dihapus dulu.','Choose a content pillar to delete first.'],
  ['Content pillar berhasil dihapus.','Content pillar deleted successfully.'],
  ['Content pillar belum berhasil dihapus. Coba lagi.','Could not delete the content pillar. Please try again.'],
  ['Content pillar delete failed','Content pillar deletion failed'],
  ['Persona belum bisa dimuat. Coba lagi.','Could not load the persona. Please try again.'],
  ['Persona load failed','Persona loading failed'],
  ['Mode create aktif. Form sudah dikosongkan.','Create mode is active. The form has been cleared.'],
  ['Persona config berhasil diperbarui.','Persona settings updated successfully.'],
  ['Persona config berhasil dibuat. Dashboard akan terbuka setelah ini.','Persona settings created successfully. Your dashboard will open next.'],
  ['Persona belum berhasil disimpan. Coba lagi.','Could not save the persona. Please try again.'],
  ['Menyimpan persona','Saving persona'],
  ['Tips persona','Persona tips'],
  ['Tutup tips','Close tips'],
  ['Isi target audience dan niche dengan contoh yang konkret.','Describe your target audience and niche with concrete examples.'],
  ['Pilih tone yang sesuai dengan gaya kontenmu.','Choose a tone that fits your content style.'],
  ['Mulai dari versi sederhana, lalu perbaiki setelah disimpan.','Start with a simple version, then refine it after saving.'],
  ['Content pillar belum bisa dimuat. Coba lagi.','Could not load content pillars. Please try again.'],
  ['Workspace belum bisa dimuat. Coba lagi.','Could not load the workspace. Please try again.'],
  ['Menyimpan content pillar','Saving content pillar'],
  ['Menghapus content pillar','Deleting content pillar'],
  ['Alur pembuatan konten','Content creation flow'],
  ['Mulai dari ide baru atau gunakan ide yang sudah tersimpan.','Start with a new idea or use a saved one.'],
  ['Mulai dari ide baru atau gunakan ide yang sudah tersimpan.','Start with a new idea or use a saved one.'],
  ['Ide tersimpan','Saved ideas'],
  ['Preview ide yang tersedia di langkah berikutnya.','Preview ideas available in the next step.'],
  ['Belum ada ide tersimpan','No saved ideas yet'],
  ['Cari ide baru untuk mulai membuat konten.','Find new ideas to start creating content.'],
  ['Memuat ide...','Loading ideas...'],
  ['Ide tanpa judul','Untitled idea'],
  ['Ide Konten','Content idea'],
  ['Persona','Persona'],
  ['Sebelum mulai, persona utama ini siapa?','First, who is this main persona?'],
  ['Isi nama peran atau karakter utama yang mau kamu bangun.','Enter the main role or character you want to build.'],
  ['Tulis sendiri persona utamanya','Enter the main persona'],
  ['Oke. Sekarang, siapa target audience utamanya?','Great. Who is the primary target audience?'],
  ['Pilih pill jika cocok, atau ketik sendiri kalau mau lebih spesifik.','Choose a suggestion or type your own answer for more detail.'],
  ['Contoh: Creator pemula yang ingin konsisten bikin konten','Example: A beginner creator who wants to post consistently'],
  ['Kalau niche atau topik fokusnya, kita arahkan ke mana?','What niche or topic should this focus on?'],
  ['Ini akan bantu AI menjaga isi konten tetap tajam.','This helps AI keep the content focused.'],
  ['Contoh: Personal branding dan content strategy','Example: Personal branding and content strategy'],
  ['Gaya kontennya mau terasa seperti apa?','What should the content style feel like?'],
  ['Pilih gaya yang paling dekat dengan cara kamu ingin tampil.','Choose the style that best matches how you want to come across.'],
  ['Contoh: Singkat, padat, dan insight-driven','Example: Concise, focused, and insight-driven'],
  ['Singkat dan tajam','Concise and sharp'],
  ['Kalau kamu pilih framework based, gaya kontennya akan berorientasi pada framework.','With a framework-based style, the content will be structured around frameworks.'],
  ['Story driven','Story-driven'],
  ['Insight heavy','Insight-rich'],
  ['Tone yang paling cocok buat persona ini apa?','Which tone best fits this persona?'],
  ['Kamu juga bisa ketik tone custom kalau belum pas dengan pilihan.','You can also enter a custom tone if none of these options fit.'],
  ['Contoh: Hangat, percaya diri, to the point','Example: Warm, confident, and to the point'],
  ['Tujuan utama dari persona ini apa?','What is the main goal for this persona?'],
  ['Goal ini akan dipakai AI sebagai kompas saat menyusun konten.','AI will use this goal to guide content creation.'],
  ['Contoh: Bangun trust, tingkatkan engagement, dan dorong klik','Example: Build trust, increase engagement, and drive clicks'],
  ['Platform utamanya di mana?','Which platform matters most?'],
  ['Kamu bisa pilih platform paling dominan dulu.','Choose the platform you use most.'],
  ['Isi dulu jawaban pada step ini sebelum lanjut.','Enter an answer for this step before continuing.'],
  ['Persona config berhasil diperbarui lewat chat flow.','Persona settings updated through the chat flow.'],
  ['Persona config berhasil dibuat lewat chat flow.','Persona settings created through the chat flow.'],
  ['Menyimpan persona lewat chat','Saving persona through chat'],
  ['Kita mulai pelan-pelan. Jawab saja satu per satu, dan kalau mau cepat pakai pill yang sudah disiapkan.','We will take it one step at a time. Answer each question, or use a suggestion to move faster.'],
  ['Pilih yang cocok atau ketik jawabanmu sendiri','Choose an option or type your own answer'],
  ['Ketik jawaban yang lebih panjang','Enter a longer answer'],
  ['Tulis jawabanmu di bawah','Type your answer below'],
  ['persona yang mau kamu bangun','persona you want to build'],
  ['ide tersedia untuk dibuat.','ideas available to create.'],
  // Common page state, validation, and content workflow messages
  ['Session kamu sudah berakhir. Silakan login kembali untuk melanjutkan.','Your session has expired. Please log in again to continue.'],
  ['Fitur ini membutuhkan paket berlangganan. Upgrade paket untuk melanjutkan.','This feature requires a paid plan. Upgrade your plan to continue.'],
  ['Memuat session auth','Loading your authentication session'],
  ['Session belum bisa dimuat. Coba lagi.','Could not load your session. Please try again.'],
  ['Email berhasil diverifikasi. Silakan login untuk masuk ke dashboard.','Your email has been verified. Log in to open your dashboard.'],
  ['Session login tidak tersedia.','Your login session is unavailable.'],
  ['Memuat session setelah login','Loading your session after sign-in'],
  ['Session login belum bisa dimuat. Coba lagi.','Could not load your login session. Please try again.'],
  ['Setelah verifikasi email selesai, login dulu untuk masuk ke dashboard.','After verifying your email, log in to open your dashboard.'],
  ['Upgrade paket','Upgrade plan'],
  ['Konten belum tersedia.','Content is not available yet.'],
  ['Notifikasi belum bisa dimuat.','Notifications could not be loaded.'],
  ['Notifikasi belum berhasil ditandai dibaca. Coba lagi.','Could not mark this notification as read. Please try again.'],
  ['Pilih bank','Choose a bank'],
  ['Metode lain yang tersedia','Other available methods'],
  ['Pilih salah satu metode pembayaran yang tersedia','Choose one of the available payment methods'],
  ['Belum ada metode pembayaran yang tersedia.','No payment methods are available yet.'],
  ['Pembayaran berhasil','Payment successful'],
  ['Pembayaran dibatalkan/kedaluwarsa','Payment cancelled or expired'],
  ['Pembayaran kedaluwarsa','Payment expired'],
  ['Pembayaran gagal','Payment failed'],
  ['Pembayaran dikembalikan','Payment refunded'],
  ['Menunggu konfirmasi server','Waiting for server confirmation'],
  ['Menunggu pembayaran','Waiting for payment'],
  ['Bikin konten Threads lebih konsisten tanpa harus mikirin ide setiap hari.','Create Threads content more consistently without having to come up with ideas every day.'],
  ['Atur Persona dan Content Pillar supaya alurin memahami siapa kamu, topikmu, dan gaya kontenmu.','Set up your Persona and Content Pillars so alurin understands who you are, your topics, and your content style.'],
  ['alurin bantu cari ide, membuat konten, sampai menyiapkannya untuk diposting.','alurin helps you find ideas, create content, and prepare it for publishing.'],
  // Admin dashboard metrics and operational copy
  ['Pembayaran top-up berstatus berhasil','Successful top-up payments'],
  ['Riwayat pembayaran subscription belum tersedia','Subscription payment history is not available yet'],
  ['Kas masuk dari QRIS subscription terverifikasi','Cash collected from verified subscription QRIS payments'],
  ['Nilai periode layanan yang belum diberikan','Value of service time not yet delivered'],
  ['Kredit bulanan yang tercatat di ledger','Monthly credits recorded in the ledger'],
  ['USD tersimpan di log penggunaan','USD amount stored in usage logs'],
  ['Kurs dan tarif perlu verifikasi','Exchange rate and pricing need verification'],
  ['Pengguna dengan top-up sukses pada periode','Users with successful top-ups during this period'],
  ['Berdasarkan subscription aktif / semua profil','Based on active subscriptions / all profiles'],
  ['Pengguna dengan aktivitas tercatat','Users with recorded activity'],
  ['Bagian dari input; tidak dihitung dua kali','Included in input; not counted twice'],
  ['Konten terjadwal pada periode','Content scheduled during this period'],
  ['Post berhasil terkirim','Posts published successfully'],
  ['Post gagal terkirim','Posts that failed to publish'],
  ['Post selesai: berhasil / selesai','Completed posts: successful / total'],
  ['Akun, plan dan saldo kredit','Accounts, plans, and credit balances'],
  ['Perbandingan pembayaran dan konsumsi AI','Payment and AI usage comparison'],
  ['Order top up dan Midtrans','Top-up orders and Midtrans'],
  ['Token, biaya dan kredit','Tokens, costs, and credits'],
  ['Antrean dan hasil publish','Queue and publishing results'],
  ['Riwayat tindakan admin','Admin action history'],
  ['Error server dan API','Server and API errors'],
  ['Harga multi-durasi, credits bulanan, dan reminder','Multi-duration pricing, monthly credits, and reminders'],
  ['Kas, revenue diakui, kewajiban layanan, dan biaya AI','Cash collected, recognized revenue, service obligations, and AI costs'],
  ['Data admin tidak dapat dimuat.','Could not load admin data.'],
  ['Perubahan admin gagal disimpan.','Could not save admin changes.'],
  ['Pengaturan referral gagal disimpan.','Could not save referral settings.'],
  ['Referral gagal ditolak.','Could not reject the referral.'],
  ['Reward referral gagal diproses.','Could not process the referral reward.'],
  ['Draft harga gagal disimpan.','Could not save the pricing draft.'],
  ['Publikasikan harga dan jatah credits ini? Order baru akan langsung memakai konfigurasi terbaru.','Publish these prices and credit allowances? New orders will immediately use the latest configuration.'],
  ['Konfigurasi gagal dipublikasikan.','Could not publish the configuration.'],
  ['Perlu ditinjau','Needs review'],
  ['Cari nama, email, atau feedback','Search by name, email, or feedback'],
  ['Migration multi-duration belum diterapkan; metrik keuangan subscription menampilkan nol sampai setup database selesai.','The multi-duration migration has not been applied. Subscription financial metrics will remain at zero until the database setup is complete.'],
  ['Cash, revenue yang diakui, dan service obligation berasal dari kontrak subscription. Biaya AI IDR merupakan estimasi internal; pembayaran legacy tanpa kontrak dan refund yang tak tercatat tidak direkonstruksi.','Cash collected, recognized revenue, and service obligations come from subscription contracts. AI costs in IDR are internal estimates; legacy payments without contracts and unrecorded refunds are not reconstructed.'],
  ['* Kolom subscription memakai kontrak berbayar yang tercatat. Revenue yang diakui dialokasikan sepanjang layanan; biaya AI IDR tetap estimasi internal, refund dan gateway fees yang tidak tersimpan tidak direkonstruksi.','* Subscription figures use recorded paid contracts. Recognized revenue is allocated over the service period; AI costs in IDR remain internal estimates, and unrecorded refunds or gateway fees are not reconstructed.'],
  ['Revenue dialokasikan harian selama masa layanan; AI cost tersimpan berasal dari log aplikasi dan biaya IDR merupakan estimasi internal. Data pembayaran historis yang tidak memiliki subscription contract tidak direkonstruksi.','Revenue is allocated daily over the service period. Stored AI costs come from application logs, and IDR costs are internal estimates. Historical payments without subscription contracts are not reconstructed.'],
  ['Reward berhasil','Reward successful'],
  ['Menunggu validasi','Awaiting validation'],
  ['Estimasi biaya reward memakai perkiraan internal Rp50 per AI Credit. Kredit referral berlaku untuk penggunaan AI dan tidak membuka fitur paket berbayar.','Estimated reward costs use an internal estimate of Rp50 per AI Credit. Referral credits can be used for AI but do not unlock paid plan features.'],
  ['Harga paket dan jatah bulanan','Plan pricing and monthly allowances'],
  ['Perubahan draft belum dipakai user sampai dipublikasikan. Order baru akan menyimpan snapshot harga dan versi konfigurasi saat dibuat.','Users will not see draft changes until they are published. New orders store a snapshot of the price and configuration version at creation.'],
  ['Draft berubah','Draft changed'],
  ['Draft sama dengan live','Draft matches live version'],
  ['Durasi yang tersedia','Available durations'],
  ['Pembayaran lama, harga snapshot, dan periode credits yang sudah dibuat tidak berubah. Perubahan paket di tengah masa aktif dibatasi; renewal paket yang sama diperbolehkan.','Existing payments, price snapshots, and credit periods are unchanged. Plan changes are limited during an active period; renewing the same plan is allowed.'],
  ['Durasi berbayar ditagih sekali melalui QRIS. AI Credits selalu diberikan per bulan dan kredit top-up maupun referral tetap mengikuti aturan expiry masing-masing.','Paid durations are charged once through QRIS. AI Credits are granted monthly, while top-up and referral credits keep their own expiration rules.'],
  ['Migration subscription finance belum diterapkan.','The subscription finance migration has not been applied.'],
  ['* Revenue subscription memakai kontrak berbayar yang tercatat dan dialokasikan sepanjang masa layanan. Biaya AI IDR merupakan estimasi internal; refund dan gateway fees yang tidak tersimpan tidak direkonstruksi.','* Subscription revenue uses recorded paid contracts and is allocated over the service period. AI costs in IDR are internal estimates; unrecorded refunds and gateway fees are not reconstructed.'],
  ['Belum ada riwayat AI.','No AI usage history yet.'],
  ['Belum ada transaksi.','No transactions yet.'],
  ['Belum ada transaksi kredit.','No credit transactions yet.'],
  ['Belum ada jadwal post.','No posts are scheduled yet.'],
  // Credits, scheduling, content review, and generation
  ['Tanggal tidak tersedia','Date unavailable'],
  ['Gagal memuat AI Credits.','Could not load AI Credits.'],
  ['Saldo credits saat ini','Current credit balance'],
  ['Langganan dibayar sekali melalui QRIS dan tidak diperpanjang otomatis. Credits bulanan diperbarui selama masa aktif.','Subscriptions are paid once through QRIS and do not renew automatically. Monthly credits refresh while the plan is active.'],
  ['Lihat riwayat pembayaran','View payment history'],
  ['Konten tanpa judul','Untitled content'],
  ['Data jadwal belum termuat','Schedule data has not loaded'],
  ['Coba muat ulang halaman.','Try refreshing the page.'],
  ['Pilih tanggal dan waktu jadwal yang valid (WIB).','Choose a valid schedule date and time (WIB).'],
  ['Jadwal harus setelah waktu sekarang (WIB). Pilih waktu yang lebih akhir.','The schedule must be after the current time (WIB). Choose a later time.'],
  ['Hubungkan kembali akun Threads sebelum menjadwalkan konten.','Reconnect your Threads account before scheduling content.'],
  ['Pilih konten yang ingin dijadwalkan.','Choose the content you want to schedule.'],
  ['Jadwal diperbarui','Schedule updated'],
  ['Jadwal belum tersimpan','Schedule was not saved'],
  ['Jadwal dibatalkan','Schedule cancelled'],
  ['Konten kembali ke Belum dijadwalkan.','The content is no longer scheduled.'],
  ['Coba lagi.','Please try again.'],
  ['Jadwal sudah dibatalkan','Schedule cancelled'],
  ['Daftar jadwal telah disinkronkan kembali.','The schedule list has been refreshed.'],
  ['Jadwal belum dibatalkan','Could not cancel the schedule'],
  ['Draft berhasil diperbarui.','Draft updated successfully.'],
  ['Perubahan disimpan','Changes saved'],
  ['Konten belum tersimpan','Content was not saved'],
  ['Konten siap dijadwalkan','Content is ready to schedule'],
  ['Konten sudah disetujui.','Content has been approved.'],
  ['Konten belum disetujui','Content was not approved'],
  ['Output berhasil dihapus.','Content output deleted successfully.'],
  ['Output belum terhapus','Content output was not deleted'],
  ['Konten akan diposting ulang sesuai jadwal baru.','The content will be reposted on the new schedule.'],
  ['Retry belum dijadwalkan','Retry was not scheduled'],
  ['Belum ada deskripsi ringkas untuk pillar ini.','There is no short description for this pillar yet.'],
  ['Belum ada preview output.','No output preview yet.'],
  ['Batas generate konten harian Anda sudah habis.','You have reached your daily content generation limit.'],
  ['Sebagian atau seluruh konten gagal dibuat.','Some or all content could not be generated.'],
  ['Generate konten gagal. Silakan coba kembali.','Content generation failed. Please try again.'],
  ['Konten belum berhasil dibuat','Content could not be created'],
  ['Konten berhasil dibuat. Silakan review hasilnya.','Content created successfully. Please review the result.'],
  ['Konten berhasil dibuat','Content created successfully'],
  ['Hasilnya sudah siap untuk direview.','Your result is ready for review.'],
  ['Gagal memuat content pillar.','Could not load content pillars.'],
  ['Gagal memuat content outputs.','Could not load content outputs.'],
  ['Belum ada ide yang bisa dibuat menjadi konten untuk topik utama ini.','There are no ideas for this main topic that can be turned into content yet.'],
  ['Lengkapi topik utama, jumlah konten, dan waktu pembuatan.','Choose a main topic, the number of posts, and a creation time.'],
  ['Tanggal dan waktu yang dipilih tidak valid.','The selected date and time are invalid.'],
  ['Menyiapkan pembuatan konten...','Preparing content generation...'],
  ['Schedule berhasil dibuat, tetapi job ID tidak ditemukan.','The schedule was created, but its job ID could not be found.'],
  ['Konten sedang dibuat. Pantau progres sampai selesai.','Content is being created. Track its progress until it is complete.'],
  ['Pembuatan konten berhasil dijadwalkan.','Content generation was scheduled successfully.'],
  ['Konten akan dibuat pada waktu yang dipilih.','Content will be created at the selected time.'],
  ['Coba buat konten lagi.','Try creating the content again.'],
  ['Output yang dipilih tidak valid.','The selected output is invalid.'],
  ['Menyimpan perubahan output...','Saving output changes...'],
  ['Perubahan output sudah tersimpan.','Output changes have been saved.'],
  ['Output berhasil diupdate.','Output updated successfully.'],
  ['Gagal mengubah output.','Could not update the output.'],
  ['Menghapus output...','Deleting output...'],
  ['Output berhasil dihapus.','Output deleted successfully.'],
  ['Gagal menghapus output.','Could not delete the output.'],
  ['Pilih jadwal retry yang valid dulu.','Choose a valid retry time first.'],
  ['Menjadwalkan retry post...','Scheduling post retry...'],
  ['Retry post berhasil dijadwalkan.','Post retry scheduled successfully.'],
  ['Nama topic berhasil disimpan.','Topic name saved successfully.'],
  ['Topic belum tersimpan','Topic was not saved'],
  ['Pilih topik utama yang valid sebelum menyimpan ide.','Choose a valid main topic before saving ideas.'],
  ['Coba lagi sebelum membuat konten.','Please try again before creating content.'],
  ['Dashboard belum dapat dimuat. Silakan coba kembali.','Could not load the dashboard. Please try again.'],
  ['Lengkapi Content Brain agar alurin punya arah topik yang jelas.','Complete your Content Brain to give alurin a clear direction for your topics.'],
  ['Lanjut Setup','Continue setup'],
  ['Koneksi Threads perlu diperbarui.','Your Threads connection needs to be refreshed.'],
  ['Konten kamu sudah siap.','Your content is ready.'],
  ['Hubungkan Threads supaya konten bisa dijadwalkan.','Connect Threads to schedule your content.'],
  ['Pilih topik utama dan jumlah ide terlebih dahulu.','Choose a main topic and the number of ideas first.'],
  ['Tidak ada ide yang diterima dari hasil generate.','No ideas were returned from generation.'],
  ['Topik utama belum memiliki data yang lengkap.','The main topic is missing required information.'],
  ['Semua ide tersimpan','All ideas saved'],
  ['Coba lagi agar semua ide dapat disimpan.','Try again to save all ideas.'],
  ['Ide belum berhasil disimpan','Could not save ideas'],
  ['Ide belum berhasil dibuat','Could not create ideas'],
  ['Pilih topic dulu sebelum generate content manual.','Choose a topic before generating content manually.'],
  ['Auth token belum tersedia. Silakan login ulang dulu.','The authentication token is unavailable. Please log in again.'],
  ['Konten berhasil dibuat','Content created successfully'],
  ['Gagal generate content.','Could not generate content.'],
  ['Daftar topic berhasil diperbarui.','Topic list updated successfully.'],
  // Referral, subscriptions, and checkout
  ['Menunggu pembayaran','Awaiting payment'],
  ['Link belum tersalin','Link was not copied'],
  ['Memuat data referral…','Loading referral data…'],
  ['Program referral sedang tidak tersedia.','The referral program is currently unavailable.'],
  ['Link referral kamu','Your referral link'],
  ['Kode ini unik dan permanen. Atribusi berlaku selama','This code is unique and permanent. Referrals are attributed for'],
  ['Referral berhasil','Referral successful'],
  ['Riwayat referral','Referral history'],
  ['Teman yang kamu undang','Friends you invited'],
  ['sekali daftar','one-time signup'],
  ['Schedule Post tidak tersedia','Post scheduling is unavailable'],
  ['Harga normal','Regular price'],
  ['Tersedia setelah masa aktif','Available after the current period ends'],
  ['Saya tertarik dengan Custom Plan. Berikut kebutuhan saya:','I’m interested in a custom plan. Here are my requirements:'],
  ['Email akun alurin:','alurin account email:'],
  ['Kebutuhan utama atau fitur yang diperlukan:','Main requirements or features needed:'],
  ['Mohon rekomendasi paket yang sesuai beserta informasi harganya.','Please recommend a suitable plan and provide its pricing.'],
  ['Gagal memuat subscription plans.','Could not load subscription plans.'],
  ['Order tersimpan. Coba lagi checkout dari riwayat pembayaran.','Your order was saved. Try checkout again from your payment history.'],
  ['Gagal membuat order pembayaran. Coba lagi.','Could not create the payment order. Please try again.'],
  ['Kembali ke paket','Back to plans'],
  ['Pilih durasi langganan, periksa ringkasan order, lalu pilih metode pembayaran.','Choose a subscription duration, review your order summary, then choose a payment method.'],
  ['Pilih durasi langganan','Choose a subscription duration'],
  ['Paket dibayar satu kali untuk periode yang kamu pilih.','Your plan is charged once for the period you choose.'],
  ['Dibayar sekali di awal. Credits bulanan diberikan selama masa aktif.','Charged once at the start. Monthly credits are granted while the plan is active.'],
  ['Pilih QRIS atau virtual account bank.','Choose QRIS or a bank virtual account.'],
  ['Lanjutkan Pembayaran','Continue to payment'],
  ['Pilih durasi','Choose a duration'],
  ['Gagal memuat pembayaran.','Could not load payment details.'],
  ['Checkout belum tersedia. Coba lagi dari riwayat pembayaran.','Checkout is not available yet. Try again from your payment history.'],
  ['Order pembayaran dibuat','Payment order created'],
  ['Silakan selesaikan pembayaran.','Please complete your payment.'],
  ['Coba lagi.','Please try again.'],
  ['Pilih paket credits, periksa ringkasan order, lalu pilih metode pembayaran.','Choose a credit package, review your order summary, then choose a payment method.'],
  ['Top up tidak mengubah paket langgananmu.','A top-up does not change your subscription plan.'],
  ['Credits masuk setelah pembayaran berhasil diverifikasi oleh server.','Credits are added after the server verifies your payment.'],
  ['Pilih QRIS atau virtual account bank.','Choose QRIS or a bank virtual account.'],
  ['Content Bank belum termuat','Content Bank has not loaded'],
  ['Topic diperbarui','Topic updated'],
  ['Persona utama','Primary persona'],
  ['Gagal memuat workspace data.','Could not load workspace data.'],
  ['Topik utama belum tersedia. Lengkapi Content Brain terlebih dahulu.','No main topics are available yet. Complete your Content Brain first.'],
  ['Gagal memuat content topics.','Could not load content topics.'],
  ['Nama topic berhasil disimpan.','Topic name saved successfully.'],
  ['Gagal memperbarui nama topic.','Could not update the topic name.'],
  ['Gagal memuat detail topic.','Could not load topic details.'],
  ['Memuat data referral…','Loading referral data…'],
  // Authentication, account settings, and help
  ['Format email tidak valid.','Please enter a valid email address.'],
  ['Setujui Syarat & Ketentuan dan Pemberitahuan Privasi untuk membuat akun.','Accept the Terms and Conditions and Privacy Notice to create an account.'],
  ['Full name harus terdiri dari 2-100 karakter.','Full name must be between 2 and 100 characters.'],
  ['Username harus terdiri dari 3-30 karakter.','Username must be between 3 and 30 characters.'],
  ['Gunakan huruf, angka, titik, underscore, atau tanda hubung.','Use letters, numbers, periods, underscores, or hyphens.'],
  ['Minimal 8 karakter dengan huruf besar, huruf kecil, dan angka.','Use at least 8 characters, including uppercase and lowercase letters and a number.'],
  ['Konfirmasi password tidak sama.','Password confirmation does not match.'],
  ['Kode referral belum bisa diverifikasi. Pendaftaran dilanjutkan tanpa referral.','The referral code could not be verified. Sign-up will continue without a referral.'],
  ['Register berhasil, tapi session belum tersedia. Silakan login.','Registration succeeded, but your session is unavailable. Please log in.'],
  ['Email ini sudah terdaftar. Gunakan email lain atau login jika ini akun kamu.','This email is already registered. Use another email or log in to this account.'],
  ['Username ini sudah dipakai. Coba gunakan username lain.','This username is taken. Try another one.'],
  ['Login belum berhasil. Coba lagi.','Could not log in. Please try again.'],
  ['Email verifikasi telah dikirim ulang.','The verification email has been resent.'],
  ['Gagal mengirim ulang email verifikasi. Coba lagi.','Could not resend the verification email. Please try again.'],
  ['Akun Threads berhasil terhubung dan status koneksi sudah diperbarui.','Your Threads account is connected and its status has been updated.'],
  ['Terjadi error saat menyelesaikan koneksi Threads.','An error occurred while completing the Threads connection.'],
  ['Gagal memuat status koneksi Threads.','Could not load the Threads connection status.'],
  ['Terjadi error saat memulai koneksi Threads.','An error occurred while starting the Threads connection.'],
  ['Koneksi akun Threads berhasil dihapus.','The Threads account connection has been removed.'],
  ['Terjadi error saat menghapus koneksi Threads.','An error occurred while removing the Threads connection.'],
  ['Gagal mengirim link reset password. Coba lagi.','Could not send the password reset link. Please try again.'],
  ['Gagal mengubah password. Coba lagi.','Could not change the password. Please try again.'],
  ['Pengguna alurin','alurin user'],
  ['Terima kasih sudah membantu kami mengembangkan alurin.','Thank you for helping us improve alurin.'],
  ['Feedback belum terkirim','Feedback was not submitted'],
  ['Coba lagi beberapa saat.','Please try again in a few moments.'],
  ['Minimal 10 karakter. Feedback disimpan dengan aman dan hanya dapat dilihat admin Alurin.','At least 10 characters. Feedback is stored securely and can only be viewed by Alurin admins.'],
  ['Checkout belum tersedia','Checkout is not available yet'],
  ['Order tetap tersimpan. Silakan coba lagi.','Your order is still saved. Please try again.'],
  ['Status pembayaran diperbarui','Payment status updated'],
  ['Status belum dapat diperbarui','Could not update the status'],
  // Public landing page and legal content
  ['Simpan karakter, sudut pandang, dan gaya komunikasi yang ingin kamu pakai.','Save the character, point of view, and communication style you want to use.'],
  ['Susun tema utama supaya ide konten tetap fokus dan konsisten.','Set core themes to keep your content ideas focused and consistent.'],
  ['Temukan topik relevan dari Persona dan Content Pillar pilihanmu.','Find relevant topics from your chosen Persona and Content Pillars.'],
  ['Ubah topik menjadi draft Threads yang siap kamu kembangkan.','Turn topics into Threads drafts you can develop further.'],
  ['Buat alternatif baru saat draft pertama belum terasa pas.','Create alternatives when the first draft does not feel right.'],
  ['Rapikan, edit, dan kelola semua draft dalam satu workspace.','Polish, edit, and manage all your drafts in one workspace.'],
  ['Lihat rencana konten secara teratur dalam tampilan kalender.','Review your content plan in a clear calendar view.'],
  ['Jadwalkan publikasi otomatis pada waktu yang sudah kamu tentukan.','Schedule posts to publish automatically at the time you choose.'],
  ['Alurin adalah workspace AI untuk menyusun Persona, Content Pillar, ide, draft, dan jadwal konten Threads dalam satu alur.','Alurin is an AI workspace for building Personas and Content Pillars, finding ideas, drafting posts, and scheduling Threads content in one workflow.'],
  ['Ya. Paket Free memberi 6 AI Credits sekali daftar serta akses untuk membuat topik dan konten selama credits tersedia.','Yes. The Free plan includes 6 AI Credits at sign-up and lets you create topics and content while credits remain.'],
  ['AI Credits adalah saldo yang digunakan saat fitur AI memproses token. Satu credit setara dengan hingga 5.000 token pemakaian.','AI Credits are a balance used when AI features process tokens. One credit covers up to 5,000 usage tokens.'],
  ['Apakah credits bisa habis?','Can I run out of credits?'],
  ['Bisa. Credits berkurang berdasarkan pemakaian token aktual ketika kamu generate atau regenerate dengan AI.','Yes. Credits are deducted based on actual token usage when you generate or regenerate with AI.'],
  ['Bisa. Top up menambah AI Credits tanpa mengubah paket atau membuka entitlement berbayar.','Yes. A top-up adds AI Credits without changing your plan or unlocking paid features.'],
  ['Apakah Alurin bisa menjadwalkan posting Threads?','Can Alurin schedule Threads posts?'],
  ['Bisa pada paket Starter, Creator, dan Pro dengan subscription aktif serta akun Threads yang terhubung.','Yes. Starter, Creator, and Pro plans can schedule posts while the subscription is active and a Threads account is connected.'],
  ['Apakah perlu menghubungkan akun Threads?','Do I need to connect a Threads account?'],
  ['Tidak untuk membuat dan mengedit konten. Akun Threads hanya diperlukan ketika kamu ingin menjadwalkan atau memublikasikan konten.','No. You only need a Threads account when you want to schedule or publish content.'],
  ['Apakah bisa membatalkan subscription?','Can I cancel my subscription?'],
  ['Pengelolaan subscription mengikuti status pembayaran pada akunmu. Detail pembatalan akan tersedia pada halaman langganan ketika alurnya didukung penuh.','Subscription management follows the payment status on your account. Cancellation details will appear on the subscription page when the flow is fully supported.'],
  ['Connect 1 akun Threads','Connect one Threads account'],
  ['Alurin — Ide ngalir, konten terbit.','Alurin — Ideas flow, content gets published.'],
  ['Ajak Teman, Dapat Bonus AI Credits!','Invite friends and earn bonus AI Credits!'],
  ['Bagikan Alurin ke temanmu. Kalian berdua bisa mendapatkan bonus credits setelah temanmu berlangganan untuk pertama kalinya. Pengajak mendapat','Share Alurin with a friend. You can both earn bonus credits after they make their first subscription payment. You will receive'],
  ['credits dan temanmu','credits, and your friend will receive'],
  ['credits setelah periode validasi pembayaran.','credits after the payment validation period.'],
  ['Pemberitahuan ini menjelaskan bagaimana alurin mengumpulkan, menggunakan, menyimpan, dan melindungi data saat kamu memakai layanan kami.','This notice explains how alurin collects, uses, stores, and protects data when you use our services.'],
  ['Syarat dan Ketentuan ini mengatur penggunaan website, aplikasi, langganan, dan AI Credits alurin. Dengan mencentang persetujuan saat mendaftar, kamu menyatakan telah membaca dan menyetujuinya serta Pemberitahuan Privasi.','These Terms and Conditions govern your use of the alurin website, app, subscriptions, and AI Credits. By checking the box during sign-up, you confirm that you have read and accepted these terms and the Privacy Notice.'],
  // Public demo and one-to-one API error messages shown in the UI
  ['Demo ini mau dipakai untuk persona siapa?','Which persona is this demo for?'],
  ['Bikin singkat saja, cukup peran utama yang mau kamu target.','Keep it brief: enter the main role you want to target.'],
  ['Contoh: Creator educator','Example: Creator educator'],
  ['Siapa audience paling cocok buat persona ini?','Which audience best fits this persona?'],
  ['Pilih yang paling dekat dengan target utama, nanti AI sisanya akan adaptasi.','Choose the closest match to your target. AI will adapt the rest.'],
  ['Contoh: Creator pemula','Example: Beginner creator'],
  ['Topik utama yang mau dibahas apa?','What main topic do you want to cover?'],
  ['Contoh: Content strategy','Example: Content strategy'],
  ['Ini dipakai untuk bikin thread pendek yang sesuai persona.','This helps create a short thread that fits the persona.'],
  ['Contoh: Singkat, padat, insight-driven','Example: Concise and insight-driven'],
  ['Demo berhasil dibuat, tetapi respons belum punya isi yang bisa ditampilkan.','The demo was created, but the response did not include any content to display.'],
  ['Akun siap dipakai. Klik Generate sekali lagi untuk lanjut.','Your account is ready. Click Generate once more to continue.'],
  ['Login dulu untuk melanjutkan proses generate.','Log in before continuing with generation.'],
  ['Isi dulu semua pertanyaan singkatnya sebelum generate.','Answer all the quick questions before generating.'],
  ['Demo content berhasil dibuat.','Demo content created successfully.'],
  ['Gagal generate demo content.','Could not generate demo content.'],
  ['Isi jawaban step ini dulu sebelum lanjut.','Answer this step before continuing.'],
  ['Offer dan funnel','Offers and funnels'],
  ['Respons auth tidak valid.','The authentication response is invalid.'],
  ['Gagal mengambil data user aktif.','Could not load the active user profile.'],
  ['Logout gagal.','Could not log out.'],
  ['Request generate content timeout. Coba lagi.','The content generation request timed out. Please try again.'],
  ['Gagal generate content output.','Could not generate the content output.'],
  ['Gagal generate demo content output.','Could not generate the demo content output.'],
  ['Gagal mengubah content output.','Could not update the content output.'],
  ['Gagal menghapus content output.','Could not delete the content output.'],
  ['Gagal mengambil content outputs.','Could not load content outputs.'],
  ['Gagal mengambil content pillars.','Could not load content pillars.'],
  ['Gagal mengambil content pillar.','Could not load the content pillar.'],
  ['Content pillar tidak ditemukan.','Content pillar not found.'],
  ['Gagal membuat content pillar.','Could not create the content pillar.'],
  ['Respons create content pillar tidak valid.','The content pillar creation response is invalid.'],
  ['Gagal memperbarui content pillar.','Could not update the content pillar.'],
  ['Respons update content pillar tidak valid.','The content pillar update response is invalid.'],
  ['Gagal menghapus content pillar.','Could not delete the content pillar.'],
  ['Gagal enhance content pillar.','Could not improve the content pillar.'],
  ['Gagal mengambil content topics.','Could not load content topics.'],
  ['Gagal mengambil content topic.','Could not load the content topic.'],
  ['Content topic tidak ditemukan.','Content topic not found.'],
  ['Gagal menyimpan content topic.','Could not save the content topic.'],
  ['Respons create content topic tidak valid.','The content topic creation response is invalid.'],
  ['Gagal mengambil persona configs.','Could not load persona settings.'],
  ['Gagal mengambil persona config.','Could not load persona settings.'],
  ['Persona config tidak ditemukan.','Persona settings not found.'],
  ['Gagal membuat persona config.','Could not create persona settings.'],
  ['Respons create persona config tidak valid.','The persona settings creation response is invalid.'],
  ['Gagal memperbarui persona config.','Could not update persona settings.'],
  ['Respons update persona config tidak valid.','The persona settings update response is invalid.'],
  ['Gagal menghapus persona config.','Could not delete persona settings.'],
  ['Gagal mengambil prompt templates.','Could not load prompt templates.'],
  ['Gagal mengambil prompt template.','Could not load the prompt template.'],
  ['Prompt template tidak ditemukan.','Prompt template not found.'],
  ['Sesi login sudah berakhir. Silakan login kembali.','Your session has expired. Please log in again.'],
  ['Permintaan referral gagal. Coba lagi.','The referral request failed. Please try again.'],
  ['Gagal mengambil subscription plans.','Could not load subscription plans.'],
  ['Gagal mengambil subscription aktif.','Could not load the active subscription.'],
  ['Token login belum tersedia. Silakan login ulang.','Your login token is unavailable. Please log in again.'],
  ['Authorization URL Threads tidak tersedia.','The Threads authorization URL is unavailable.'],
  ['Gagal menghapus koneksi Threads.','Could not remove the Threads connection.'],
  ['Ada post gagal','A post failed'],
  ['Gagal mengubah jadwal konten.','Could not update the content schedule.'],
  ['Gagal membatalkan jadwal konten.','Could not cancel the content schedule.'],
  ['Gagal mengambil scheduled job.','Could not load the scheduled job.'],
  ['Scheduled job tidak ditemukan.','Scheduled job not found.'],
  ['Gagal mengambil scheduled jobs.','Could not load scheduled jobs.'],
  ['Respons AI Credits tidak valid.','The AI Credits response is invalid.'],
  ['Gagal mengambil usage user.','Could not load user usage data.'],
  ['Respons pembayaran tidak valid.','The payment response is invalid.'],
  ['Respons notifikasi tidak valid.','The notification response is invalid.'],
  ['Konfirmasi password tidak sama.','Password confirmation does not match.'],
  ['Terjadi kesalahan pada koneksi Threads.','An error occurred with the Threads connection.'],
  ['Koneksi Threads sedang tidak dapat diperbarui. Silakan coba kembali beberapa saat lagi.','The Threads connection cannot be refreshed right now. Please try again in a few moments.'],
  ['Akun Threads belum terhubung.','Your Threads account is not connected.'],
  ['6 AI Credits sekali daftar','6 AI Credits at sign-up'],
  ['Contoh: Threads','Example: Threads'],
]

const sourceText = new WeakMap<Text, string>()
const sourceAttribute = new WeakMap<Element, Map<string,string>>()

function lookup(value: string, language: UiLanguage) {
  const trimmed = value.trim()
  const availableIdeas = trimmed.match(/^(\d+) (?:ide tersedia untuk dibuat\.|ideas available to create\.)$/)
  if (availableIdeas) {
    const translated = language === 'en'
      ? `${availableIdeas[1]} ideas available to create.`
      : `${availableIdeas[1]} ide tersedia untuk dibuat.`
    return value.replace(trimmed, translated)
  }

  const savedIdeaCount = trimmed.match(/^(\d+) (?:ide berhasil disimpan\.|ideas saved successfully\.)$/)
  if (savedIdeaCount) {
    const translated = language === 'en'
      ? `${savedIdeaCount[1]} ideas saved successfully.`
      : `${savedIdeaCount[1]} ide berhasil disimpan.`
    return value.replace(trimmed, translated)
  }

  const addedIdeaCount = trimmed.match(/^(\d+) (?:ide sudah masuk ke daftar topik\.|ideas have been added to your topic list\.)$/)
  if (addedIdeaCount) {
    const translated = language === 'en'
      ? `${addedIdeaCount[1]} ideas have been added to your topic list.`
      : `${addedIdeaCount[1]} ide sudah masuk ke daftar topik.`
    return value.replace(trimmed, translated)
  }

  const pair = phrases.find(([id,en]) => trimmed === id || trimmed === en)
  if (!pair) return value
  const translated = language === 'id' ? pair[0] : pair[1]
  return value.replace(trimmed, translated)
}

export function translateText(value: string, language: UiLanguage) {
  return lookup(value, language)
}

export function translateUiText(value: string, language: UiLanguage) {
  if (language === 'id' || !value.trim()) return value
  const exact = lookup(value, language)
  if (exact !== value) return exact

  const failure = value.trim().match(/^(.*?) belum berhasil (dibuat|disimpan|dihapus|disetujui|dijadwalkan|dikirim)(?:\.\s*(.*))?\.?$/i)
  if (failure) {
    const subjectKey = failure[1].trim().toLowerCase()
    const subject = subjectKey.startsWith('ide') ? 'ideas' : subjectKey.startsWith('konten') ? 'content' : subjectKey.startsWith('persona') ? 'persona' : subjectKey.startsWith('output') ? 'output' : subjectKey.startsWith('topic') ? 'topic' : subjectKey.startsWith('content pillar') ? 'content pillar' : 'request'
    const action = ({ dibuat: 'created', disimpan: 'saved', dihapus: 'deleted', disetujui: 'approved', dijadwalkan: 'scheduled', dikirim: 'sent' } as Record<string, string>)[failure[2].toLowerCase()]
    const headline = `${subject[0].toUpperCase()}${subject.slice(1)} could not be ${action}.`
    const detail = failure[3]?.trim()
    if (!detail) return headline
    const knownDetails: Record<string, string> = {
      'coba generate lagi dalam beberapa saat': 'Try generating again in a few moments.',
      'coba lagi agar semua ide dapat disimpan': 'Try again to save all ideas.',
      'coba lagi': 'Please try again.',
      'silakan coba lagi': 'Please try again.',
    }
    const normalizedDetail = detail.replace(/[.?!]+$/, '').toLowerCase()
    return `${headline} ${knownDetails[normalizedDetail] || lookup(detail, language)}`
  }

  const retry = value.trim().match(/^coba (?:generate )?lagi(?: dalam beberapa saat| beberapa saat)?\.?$/i)
  if (retry) return 'Please try again in a few moments.'
  if (/\b(berhasil|gagal|belum|sudah|telah|dibuat|disimpan|dihapus|diperbarui|pembayaran|saldo|masuk|silakan|coba lagi)\b/i.test(value)) {
    return 'The request could not be completed. Please try again in a few moments.'
  }
  return value
}

export function translatePlanName(name: string, key: string, language: UiLanguage) {
  if (language === 'id') return name
  const normalized = `${key} ${name}`.toLowerCase()
  if (/\bfree\b|gratis/.test(normalized)) return 'Free'
  if (/starter|pemula/.test(normalized)) return 'Starter'
  if (/creator|kreator/.test(normalized)) return 'Creator'
  if (/\bpro\b/.test(normalized)) return 'Pro'
  if (/\bmax\b|maksimal/.test(normalized)) return 'Max'
  if (/\bbasic\b|dasar/.test(normalized)) return 'Basic'
  if (/\bplus\b|tambahan/.test(normalized)) return 'Plus'
  if (/premium/.test(normalized)) return 'Premium'
  return lookup(name, language)
}

export function applyLanguage(root: ParentNode, language: UiLanguage) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode() as Text | null
  while (node) {
    const parent = node.parentElement
    if (parent && !['SCRIPT','STYLE'].includes(parent.tagName)) {
      const current = node.data
      const remembered = sourceText.get(node)
      const source = remembered && (current === lookup(remembered,'id') || current === lookup(remembered,'en')) ? remembered : current
      sourceText.set(node, source)
      const next = lookup(source, language)
      if (node.data !== next) node.data = next
    }
    node = walker.nextNode() as Text | null
  }
  root.querySelectorAll?.('[placeholder],[aria-label],[title]').forEach((element) => {
    for (const attr of ['placeholder','aria-label','title']) {
      const current = element.getAttribute(attr); if (!current) continue
      let values = sourceAttribute.get(element); if (!values) { values=new Map(); sourceAttribute.set(element,values) }
      const remembered=values.get(attr); const source=remembered && (current===lookup(remembered,'id')||current===lookup(remembered,'en')) ? remembered : current
      values.set(attr,source); const next=lookup(source,language); if(current!==next) element.setAttribute(attr,next)
    }
  })
}

export function watchLanguage(language: UiLanguage) {
  document.documentElement.lang = language
  applyLanguage(document.body, language)
  const observer = new MutationObserver((mutations) => { for (const mutation of mutations) { if (mutation.type==='childList') mutation.addedNodes.forEach((node) => { if(node.nodeType===Node.ELEMENT_NODE) applyLanguage(node as Element,language); else if(node.nodeType===Node.TEXT_NODE && node.parentNode) applyLanguage(node.parentNode,language) }); else if(mutation.target.parentNode) applyLanguage(mutation.target.parentNode,language) } })
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','aria-label','title']})
  return () => observer.disconnect()
}
