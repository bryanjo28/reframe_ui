export type UiLanguage = 'id' | 'en'

const phrases: Array<[string, string]> = [
  ['Beranda','Home'],['Buat','Create'],['Jadwal','Schedule'],['Lainnya','More'],['Pengaturan','Settings'],
  ['Ruang Kerja','Workspace'],['Tutup','Close'],['Topik','Topics'],['Konten','Content'],['Draf','Draft'],
  ['Buat Konten','Create Content'],['Buat Konten Baru','Create New Content'],['Cari Ide','Find Ideas'],['Cari Ide Baru','Find New Ideas'],['Cari ide konten','Find content ideas'],
  ['✨ Buat Konten Baru','✨ Create New Content'],['Mulai di sini','Start here'],['+ Cari Ide Baru','+ Find New Ideas'],
  ['Ide Konten','Content Ideas'],['Ide Tersimpan','Saved Ideas'],['Konten Kamu','Your Content'],['Konten Terbaru','Recent Content'],['Konten Saya','My Content'],
  ['Buat konten baru dari ide kamu atau lanjutkan konten yang sudah ada.','Create new content from your ideas or continue existing content.'],
  ['Ubah ide yang sudah kamu pilih menjadi konten siap posting.','Turn selected ideas into ready-to-post content.'],
  ['Belum ada ide yang siap dibuat','No ideas are ready yet'],['Cari ide dulu supaya Reframe punya bahan untuk membuat konten.','Find ideas first so Reframe has material to create content.'],
  ['Konten yang kamu buat akan muncul di sini.','Content you create will appear here.'],['Lihat Semua','View All'],['Lihat Semua →','View All →'],
  ['Content Brain','Content Brain'],['Persona','Persona'],['Content Pillars','Content Pillars'],['Edit Persona','Edit Persona'],['Edit Pillars','Edit Pillars'],
  ['Biar Reframe kenal kamu dulu 👋','Let Reframe get to know you 👋'],['Ceritakan sedikit tentang kamu, audiensmu, dan bagaimana kamu ingin terdengar.','Tell us about yourself, your audience, and how you want to sound.'],
  ['Kamu mau dikenal bahas apa?','What do you want to be known for?'],['Tentukan topik utama yang akan menjadi arah kontenmu.','Choose the main topics that will guide your content.'],
  ['Simpan & Lanjut','Save & Continue'],['Content Brain kamu sudah siap ✓','Your Content Brain is ready ✓'],['Cari Ide Pertama','Find Your First Idea'],
  ['Reframe akan membuat ide berdasarkan Content Brain kamu.','Reframe will create ideas based on your Content Brain.'],['Ide untuk kamu','Ideas for you'],['Pilih ide yang ingin kamu jadikan konten.','Select the ideas you want to turn into content.'],
  ['Simpan untuk nanti','Save for later'],['Cari ide lainnya','Find more ideas'],['dipilih','selected'],['Tersimpan ✓','Saved ✓'],['Menyimpan...','Saving...'],
  ['Pilih arah ide','Choose an idea direction'],['Jumlah Topics','Number of Ideas'],['Mencari ide...','Finding ideas...'],
  ['Konten Baru','New Content'],['Lihat Konten Saya','View My Content'],['Ubah ide yang sudah kamu pilih menjadi konten siap direview.','Turn selected ideas into content ready for review.'],
  ['Pilih sumber ide','Choose an idea source'],['Lagi bikin konten kamu...','Creating your content...'],['Atur Jadwal','Set Schedule'],['Jadwalkan Konten','Schedule Content'],
  ['Atur jadwal posting','Set your posting schedule'],['Siap Dijadwalkan','Ready to Schedule'],['Terjadwal','Scheduled'],['Terbit','Published'],
  ['Kontenmu dalam satu tampilan','Your content, at a glance'],['Lanjutkan langkah paling penting berikutnya.','Pick up the most useful next step.'],['Langkah berikutnya','Next action'],
  ['Alur konten','Content pipeline'],['Konten terbaru','Recent content'],['Akan datang','Upcoming'],['Jadwal kamu','Your schedule'],['Belum ada yang dijadwalkan','Nothing scheduled yet'],
  ['Belum ada konten','No content yet'],['Buat Konten','Create Content'],['Buka Jadwal','Open Schedule'],['Review Konten','Review Content'],
  ['Akun Terhubung','Connected Accounts'],['Langganan','Subscription'],['Keluar','Logout'],['Mode terang','Light mode'],['Mode gelap','Dark mode'],['Lihat Tutorial Lagi','View Tutorial Again'],
  ['Selamat datang di Reframe 👋','Welcome to Reframe 👋'],['Reframe belajar dari kamu','Reframe learns from you'],['Dari ide sampai terjadwal','From ideas to scheduled posts'],
  ['Lanjut','Continue'],['Skip','Skip'],['Mulai Setup','Start Setup'],['Bahasa','Language'],['Indonesia','Indonesian'],['Inggris','English'],
  ['Memuat...','Loading...'],['Memuat dashboard...','Loading dashboard...'],['Coba lagi','Try again'],['Kembali ke Content Brain','Back to Content Brain'],
]

const sourceText = new WeakMap<Text, string>()
const sourceAttribute = new WeakMap<Element, Map<string,string>>()

function lookup(value: string, language: UiLanguage) {
  const trimmed = value.trim()
  const pair = phrases.find(([id,en]) => trimmed === id || trimmed === en)
  if (!pair) return value
  const translated = language === 'id' ? pair[0] : pair[1]
  return value.replace(trimmed, translated)
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
