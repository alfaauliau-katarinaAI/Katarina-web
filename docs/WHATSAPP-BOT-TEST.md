# KATARINA AI — Bot Pengumuman Grup WhatsApp

**Hanya satu arah dan satu grup untuk 3–5 penguji.** Tidak ada chatbot tanya-jawab, balasan kepada anggota, pengiriman ke nomor pribadi, ataupun pendaftaran pelanggan dalam tahap ini.

## Status awal

**Belum aktif mengirim WhatsApp.** Jadwal dan kode penerbit disiapkan, tetapi tombol pengiriman aman secara default (WA_GROUP_ENABLED selain true). Tidak ada grup/nomor/akses Meta yang tersambung saat kode dibuat.

Meta Groups API resmi khusus akun bisnis yang memenuhi syarat, termasuk Official Business Account (OBA). Nomor test Meta biasa tidak otomatis bisa menggunakan Groups API. Grup resmi dibatasi sekitar 8 peserta. Jangan memasukkan ID grup WhatsApp Web yang berakhiran @g.us ke kolom Group ID resmi Meta.

## Cara kerja bila akses resmi sudah tersedia

GitHub Actions memicu pemeriksaan sekitar setiap 4 jam (07.27, 11.27, 15.27, 19.27, 23.27, dan 03.27 WIB; waktu aktual GitHub bisa sedikit bergeser). Cloudflare membaca H4, COT, agenda ekonomi, dan berita relevan. Lalu bot:

- Mengirim laporan awal untuk pair yang ditetapkan, maksimal 3 pair.
- Mengirim pembaruan mingguan ketika memasuki pekan baru.
- Mengirim pembaruan jika arah BUY/SELL berubah, rencana H4 gagal, atau kondisi pasar tidak lagi membentuk satu arah.
- **Tidak mengirim ulang** setiap empat jam jika belum ada perubahan penting.
- Tidak mengirim rencana bila sumber harga stale/tidak tersedia, level keliru, atau pemeriksaan kualitas gagal.

Laporan memuat arah H4, penjelasan EMA/RSI/ATR, posisi COT, berita sumber asli, agenda ekonomi, syarat konfirmasi, dan batas pembatalan. Data yang tidak lengkap maupun COT yang berbeda arah diberi keterangan, bukan dianggap tervalidasi.

## Syarat aktivasi yang perlu disiapkan pemilik

1. Aktifkan akun Meta WhatsApp **Groups API resmi** yang memenuhi kelayakan bisnis (termasuk OBA), lalu buat grup resmi dan undang 3–5 penguji yang setuju menerima pesan.
2. Cloudflare Workers & Pages > katarina-research > Settings > Variables and Secrets: buat WA_GROUP_JOB_TOKEN sebagai secret acak panjang, WA_GROUP_ENABLED **false** dahulu, WA_GROUP_ID (ID resmi dari Meta Groups API), WA_PHONE_NUMBER_ID, WA_ACCESS_TOKEN, WA_GROUP_PAIRS (misalnya XAUUSD,USDJPY). Jangan pernah menyimpan token di GitHub atau chat.
3. Cloudflare KV: buat namespace dan binding **WA_GROUP_STATE** untuk website tersebut. Wajib ada agar riwayat notifikasi tidak hilang dan laporan tidak berulang.
4. GitHub Katarina-web > Settings > Secrets and variables > Actions: buat **WA_GROUP_JOB_TOKEN** dengan nilai yang sama. Workflow whatsapp-group-test.yml akan aktif memeriksa setiap 4 jam.
5. Sebelum pengiriman sungguhan, lakukan preview rahasia: POST https://katarina-research.pages.dev/api/wa-group-dispatch?preview=1 memakai header Authorization Bearer WA_GROUP_JOB_TOKEN. Preview tidak mengirim WhatsApp.
6. Setelah preview dan izin Groups API terverifikasi, ubah WA_GROUP_ENABLED menjadi **true** secara sadar. Catatan: ini mengaktifkan pesan yang berpotensi berbiaya dan hanya untuk grup penguji.

## Endpoint dan keamanan

- GET /api/wa-group-dispatch: informasi status umum, tanpa mengirim.
- POST /api/wa-group-dispatch: hanya menerima permintaan dengan Bearer token rahasia. Mengambil data terbaru, memeriksa perubahan dan mengirim jika sudah diaktifkan.
- POST /api/wa-group-dispatch?preview=1: menyusun laporan uji, memerlukan Bearer secret, tetapi tidak mengirim apa pun.
- POST /api/wa-webhook: mengabaikan isi semua pesan masuk; tidak menanggapi chat anggota maupun pribadi.
- Pengiriman nyata menggunakan recipient_type=group dan Group ID Meta resmi. Keberhasilan API tidak selalu berarti pesan diterima setiap anggota; status akhir perlu dipantau dari Meta.
- State disimpan di Cloudflare KV. Simulasi pengujian di CI **tidak mengirim** pesan WhatsApp nyata.

## Produk pelanggan berbayar nantinya

Pengiriman pribadi kepada pelanggan berlangganan adalah pekerjaan tahap berikutnya yang **belum diaktifkan**. Itu memerlukan pendaftaran, pembayaran, opt-in, pilihan pair, template Meta yang disetujui, serta pengelolaan STOP dan privasi.
