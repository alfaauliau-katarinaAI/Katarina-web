# KATARINA AI: batas gratis dan operasional mandiri (audit 12 Oktober 2026)

## Yang benar-benar berjalan

- Cloudflare Pages `katarina-research`: website, news API dan rencana mingguan H4.
- Dua Worker ringan `katarina-free-ingest` (shard 0) dan `katarina-free-ingest-b` (shard 1): masing-masing Cron setiap **1 menit**, total empat feed RSS per menit; tiap sumber diperiksa kira-kira **2–3 menit sekali** tanpa pengunjung. Worker shard 0 saja yang menyusun histori H4. Simpan URL, judul, penerbit, dan tanggal terverifikasi ke D1.
- Cloudflare D1 `katarina-research-data`: berita, terjemahan bahasa Indonesia, serta struktur tabel riwayat analisa H4.
- Histori H4: 34 instrumen, dua pemeriksaan terdistribusi pada **8–19 menit** dan **38–49 menit** setelah penutupan masing-masing candle H4. Simpan hanya `(symbol,last_closed_at)` baru.
- Front-end saat terlihat: cek berita **3 menit**, tidak render ulang bila daftar sama; harga H4 refresh mengikuti interval 3 menit. Saat tab tak terlihat, polling berita berhenti.
- Terjemahan AI: cek D1 dulu per judul, hanya judul yang belum ada yang diterjemahkan, lalu catat hasilnya di D1.
- Deployment website: bila kode GitHub berubah. Tidak ada redeploy otomatis hanya untuk refresh proyek setiap 6 jam.
- Cadangan RSS GitHub: **1 kali per hari**. Jadwal GitHub Actions bisa terlambat dan bukan jalur utama berita.

## Kuota paket gratis resmi Cloudflare (per Oktober 2026)

| Produk | Batas gratis | Penggunaan KATARINA |
|---|---|---|
| Workers dan Pages Functions | 100.000 eksekusi per hari, CPU **10 ms** per eksekusi, maksimal **5 Cron Triggers** | Satu Cron Worker; pemakaian umum di bawah kuota tetapi CPU harus dipantau. |
| Workers AI | 10.000 neurons per hari; setelah habis di Free permintaan baru gagal, bukan otomatis menagih | D1 deduplikasi terjemahan; pembatasan AI tetap penting. |
| D1 | 5 juta baris baca/hari, 100.000 baris tulis/hari, 5 GB total | Berita + validasi + histori H4. |
| KV | 100.000 baca/hari, 1.000 tulis/hari, 1 GB | Tidak digunakan untuk alur berita: batas penulisan relatif kecil. |
| R2 Standard | 10 GB-bulan, 1 juta Class A dan 10 juta Class B/bulan | Tidak digunakan; audit token akun menunjukkan izin R2 belum tersedia. |
| Pages | 500 build/bulan pada Free, aset statis gratis | Pengurangan redeploy terjadwal untuk menjaga jatah build. |
| GitHub Actions repositori publik | Runner standar gratis, jadwal bisa terlambat | Backup + deployment + test regresi. |

## Estimasi kasar beban per hari

- 2 Cron per menit = **2.880 invokasi/hari** (2 dari maksimal 5 Cron Triggers gratis).
- 4 feed per menit = **5.760 HTTP pemeriksaan RSS/hari** total, sekitar **576 per sumber per hari**; tergantung peraturan dan ketersediaan feed penerbit.
- 34 instrumen × 6 candle H4 sehari × 2 pass = maksimal **408 pemeriksaan analisa/hari**, hanya melalui Worker pertama. Baris histori *baru* sekitar **204/hari**, jika seluruh instrumen dan data tersedia.
- Misal 50–300 berita baru + 50–300 terjemahan valid/hari, total perkiraan **304–804 penulisan D1/hari** termasuk 204 histori. Ini skenario, bukan pemakaian akun yang sudah terukur.
- Jika 100 pengunjung **terus membuka** dashboard selama 24 jam, polling sekali per 3 menit menghasilkan **48.000 pemanggilan API/hari** sebelum optimasi cache; tambah halaman, pair, dan cron. Cap 100.000/hari tetap berlaku di seluruh akun. Pengunjung biasa umumnya tidak membuka sepanjang hari.
- Misal API berita membaca 30 baris D1 per polling, pada contoh ekstrem 100 sesi selalu terbuka: paling banyak **1,44 juta baris dibaca/hari** dari endpoint berita, belum termasuk panggilan API lain. Caching Cloudflare mengurangi permintaan riil, tetapi jangan berasumsi semuanya di-cache.
- Target operasional konservatif: sisakan **30–50% headroom** Workers/Pages Functions; turunkan polling untuk pengunjung sangat ramai, gunakan cache CDN, jangan memperbanyak model AI tanpa pengukuran.

## Kontrol keandalan dan biaya

1. Pantau `https://katarina-research.pages.dev/api/engine-health` untuk koneksi D1, jumlah berita/terjemahan, dan histori H4. Ini bukan metrik penagihan Cloudflare.
2. Pantau **Cloudflare Workers & Pages → Analytics**, **D1 → Row Metrics**, **Workers AI → Neurons**, dan **GitHub Actions** untuk pemakaian nyata. Audit otomatis hanya memastikan izin/resource, bukan mengakses metrik tagihan pribadi.
3. Ketika D1 gagal, API berita kembali ke RSS langsung; analisa tanpa data harga valid tidak boleh memaksakan sinyal.
4. Sistem tidak menjalankan transaksi atau mengirim WhatsApp otomatis. Jalur grup tetap default OFF sampai Meta dan izin diaktifkan.
5. Kuota gratis dari Cloudflare adalah batas akun, bukan per website. Jika ada Worker/website lain dalam akun yang sama, kuota dipakai bersama.

## Sumber resmi

- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/kv/platform/limits/
- https://developers.cloudflare.com/r2/pricing/
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://developers.cloudflare.com/pages/platform/limits/
- https://docs.github.com/en/actions/concepts/billing-and-usage
