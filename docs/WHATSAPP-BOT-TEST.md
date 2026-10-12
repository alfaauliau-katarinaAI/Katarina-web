# Uji bot WhatsApp KATARINA AI — Cloudflare

**Default NONAKTIF.** Tidak ada pengiriman pesan sebelum kredensial Meta dan allowlist penguji dikonfigurasi. Tidak ada langganan atau broadcast otomatis.

1. Buat aplikasi Meta for Developers dengan fitur WhatsApp Business Platform; pakai test number resmi Meta terlebih dulu.
2. Di WhatsApp > API Setup, temukan Phone Number ID dan token akses serta daftarkan penerima test.
3. Di Cloudflare Dashboard > Workers & Pages > katarina-research > Settings > Variables and Secrets, buat sebagai secrets (jangan pernah simpan di GitHub):
   - WA_VERIFY_TOKEN: string acak panjang yang sama digunakan pada pengaturan Webhook Meta.
   - WA_APP_SECRET: App Secret dari Meta App Settings > Basic.
   - WA_ACCESS_TOKEN: WhatsApp API token (sementara boleh untuk uji).
   - WA_PHONE_NUMBER_ID: ID dari WhatsApp > API Setup.
   - WA_ALLOWED_TEST_NUMBERS: nomor penguji format internasional tanpa tanda +, bisa pisah koma; wajib ada.
   - WA_BOT_ENABLED: set true jika siap mengaktifkan bot uji coba.
4. Meta WhatsApp > Configuration > Webhook Callback URL: https://katarina-research.pages.dev/api/wa-webhook
5. Subscribe event messages, lalu chat ke nomor test Meta: BANTUAN atau ANALISA XAUUSD / ANALISA USDJPY.

Bot hanya menjawab pesan masuk dari allowlist dengan pemeriksaan signature X-Hub-Signature-256. Tidak menyimpan kontak. STOP menjelaskan status uji coba; belum ada sistem berlangganan.

Laporan hanya berdasarkan sumber H4, posisi CFTC, kalender dan berita yang tersedia. COT atau data yang bertentangan dengan arah ditandai jelas. Tidak mengarang win rate, akurasi, target profit atau data yang tidak ada.

**Tahap pelanggan belum dibuat:** nanti perlu pendaftaran+opt-in, D1/auth, manajemen langganan/STOP, idempotensi database, pemeriksaan biaya/template pesan WhatsApp, dan persetujuan sebelum broadcast.
