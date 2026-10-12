/* KATARINA v8 — bilingual site controls and static UI; preserve source data and chart numbers.
 * Original Indonesian text is preserved for exact round-trip switching.
 */
(()=>{"use strict";
const pairs=[["INTELIJEN PASAR","MARKET INTELLIGENCE"],["Beranda","Home"],["Riset Pasar","Market Research"],["Riset & Analisa","Research & Analysis"],["Riset","Research"],["Jurnal","Journal"],["Artikel","Articles"],["Dukungan","Support"],["Jelajahi KATARINA","Explore KATARINA"],["Menu","Menu"],["Metodologi","Methodology"],["Privasi","Privacy"],["Kontak","Contact"],["Pilih instrumen","Choose instrument"],["Ganti","Change"],["INSTRUMEN AKTIF","ACTIVE INSTRUMENT"],["TERMINAL RISET KATARINA","KATARINA RESEARCH TERMINAL"],["Terminal","Market"],["Pasar.","Terminal."],["Struktur harga, faktor fundamental, positioning dan berita yang berubah mengikuti instrumen.","Price structure, fundamentals, positioning, and market news tailored to each instrument."],["Kondisi harga","Price condition"],["Perubahan 6 candle H4","Change over 6 H4 candles"],["Harga referensi","Reference price"],["Harga referensi historis","Historical reference price"],["KATARINA / INTELIJEN PASAR","KATARINA / MARKET INTELLIGENCE"],["Kenali arah.","Read the market."],["Pahami alasan.","Understand the why."],["Data harga, agenda ekonomi, dan berita yang relevan untuk melihat apa yang sedang menggerakkan pasar.","Market prices, economic events, and relevant news to explain what is moving the market."],["Buka terminal riset","Open research terminal"],["Berita penting","Top news"],["EMAS / XAUUSD","GOLD / XAUUSD"],["Lihat analisa emas","View gold analysis"],["Fokus pasar","Market focus"],["INSTRUMEN PANTAUAN","WATCHLIST INSTRUMENT"],["Menganalisis pasar…","Analyzing the market…"],["Buka analisa ↗","View analysis ↗"],["AGENDA MAKRO","MACRO CALENDAR"],["Rilis berikutnya","Upcoming releases"],["Pantauan pilihan","Featured instruments"],["Cari instrumen lain ↗","Explore other instruments ↗"],["Perkembangan KATARINA AI","KATARINA AI project updates"],["Lihat proyek ↗","View project ↗"],["Apa yang sedang kami bangun dan uji? Ini pembaruan langsung dari catatan pengerjaan proyek.","See what we are building and testing, with updates taken directly from project development records."],["Memuat pembaruan proyek…","Loading project updates…"],["Berita yang perlu kamu tahu","News worth watching"],["Memuat berita terbaru…","Loading latest news…"],["RISET BERDASARKAN INSTRUMEN","RESEARCH BY INSTRUMENT"],["Setiap pair punya ceritanya sendiri.","Every pair has its own story."],["Eksplorasi pasar ↗","Explore markets ↗"],["Grafik dan peta arah","Chart & market outlook"],["Buka layar penuh ↗","Open full screen ↗"],["Peta Analisa KATARINA","KATARINA Analysis Map"],["TradingView • Harga Pasar","TradingView • Market Price"],["Menyiapkan grafik analisa…","Preparing analysis chart…"],["Menyiapkan harga pasar…","Loading market price…"],["ANALISA MINGGUAN · H4","WEEKLY OUTLOOK · H4"],["Menyiapkan analisa H4…","Preparing H4 analysis…"],["SYARAT AKTIF","CONFIRMATION LEVEL"],["RENCANA BATAL JIKA","INVALIDATION LEVEL"],["Apa kata pergerakan harga?","What is price action telling us?"],["Satu arah, satu rencana","One direction, one plan"],["Memeriksa struktur H4 dan berita terkait…","Reviewing H4 structure and relevant news…"],["Faktor yang memengaruhi pair","What drives this pair"],["Sentimen pasar","Market sentiment"],["Posisi pelaku besar (COT)","Large traders' positioning (COT)"],["Membaca laporan COT…","Loading COT report…"],["Laporan resmi CFTC ↗","Official CFTC report ↗"],["Alasan KATARINA memilih arah","Why KATARINA chose this direction"],["Menyiapkan alasan berdasarkan H4, COT, dan berita pendukung…","Preparing rationale based on H4, COT, and supporting news…"],["Kapan rencana perlu ditinjau ulang?","When should the plan be reviewed?"],["Agenda ekonomi terkait","Relevant economic calendar"],["Berita penggerak harga","Market-moving news"],["Harga referensi historis","Historical reference price"],["Emas spot","Spot gold"],["Mengambil konteks instrumen…","Loading instrument context…"],["JURNAL KATARINA","KATARINA JOURNAL"],["Jejak riset.","Research progress."],["Hasil yang bisa dibuktikan.","Results backed by evidence."],["Catatan pengujian dan perkembangan strategi ditampilkan apa adanya. Angka performa hanya muncul jika laporan memiliki bukti dan izin publikasi.","Testing and strategy development are reported transparently. Performance figures appear only when evidence and publication approval are available."],["STATUS JURNAL","JOURNAL STATUS"],["Memeriksa laporan…","Checking reports…"],["Total transaksi terverifikasi","Verified trades"],["Data audit yang disetujui","Approved audited data"],["Tingkat kemenangan","Win rate"],["Bukan estimasi","Not an estimate"],["Imbal hasil","Return"],["Sesuai jenis pengujian","By testing method"],["Penurunan modal terbesar","Maximum drawdown"],["Hanya hasil terverifikasi","Verified results only"],["01 / CATATAN","01 / RECORDS"],["Aktivitas trading","Trading activity"],["Semua","All"],["Uji historis","Backtest"],["Demo","Demo"],["Live","Live"],["02 / PERFORMA","02 / PERFORMANCE"],["Pergerakan hasil","Performance over time"],["Grafik akan muncul setelah data performa lolos pemeriksaan.","The performance chart will appear after the data passes verification."],["Data hasil yang sudah diaudit","Audited performance data"],["03 / EVALUASI","03 / REVIEW"],["Ringkasan mingguan","Weekly review"],["Standar transparansi KATARINA","KATARINA transparency standard"],["Catatan hasil uji historis, demo, dan live dipisahkan. Tidak ada angka profit, persentase kemenangan, atau grafik ekuitas yang dibuat-buat. Saat laporan belum dapat diverifikasi, halaman tetap menampilkan statusnya dengan jelas.","Backtest, demo, and live results are kept separate. No fabricated profits, win rates, or equity curves. Reports not yet verified are clearly marked."],["Baca metodologi riset ↗","Read research methodology ↗"],["KATARINA / ANALISIS","KATARINA / ANALYSIS"],["Rencana BUY","BUY plan"],["Rencana SELL","SELL plan"],["Cenderung menguat","Bullish bias"],["Cenderung melemah","Bearish bias"],["Konsolidasi","Consolidating"],["Menguat","Strengthening"],["Melemah","Weakening"],["Fokus BUY · mencari kenaikan ↗","BUY bias · watching for upside ↗"],["Fokus SELL · mencari penurunan ↘","SELL bias · watching for downside ↘"],["Belum ada plan mingguan","No confirmed weekly plan"],["Menunggu candle H4 dan konfirmasi pasar","Waiting for H4 candles and market confirmation"],["ARAH UTAMA PEKAN INI","MAIN WEEKLY BIAS"],["Pemicu konfirmasi","Confirmation trigger"],["Batas batal","Invalidation level"],["Area tujuan awal","Initial objective zone"],["EMA 20 H4","H4 EMA 20"],["EMA 50 H4","H4 EMA 50"],["RSI 14 H4","H4 RSI 14"],["ATR 14 H4","H4 ATR 14"],["Rata-rata gerak H4","Average H4 range"],["Acuan tren dekat","Short-term trend"],["Acuan tren lebih besar","Broader trend"],["Momentum harga","Price momentum"],["Enam candle H4","Six H4 candles"],["Perubahan harga","Price change"],["Penutupan H4","H4 close"],["Yang perlu dipantau","What to watch"],["Berita pendukung","Supporting news"],["Bagaimana posisi COT?","What does COT positioning show?"],["Baca berita aslinya","Read original article"],["Baca dampaknya →","Read market impact →"],["Fakta utama","Key facts"],["Dampak untuk pasar","Market impact"],["Yang belum pasti","Remaining uncertainty"],["Kapan analisa dianggap gagal?","When does this outlook fail?"],["Risiko berita","News-related risks"],["Harga sedang menguat","Price is strengthening"],["Harga sedang melemah","Price is weakening"],["Harga masih berkonsolidasi","Price is consolidating"],["Total transaksi terverifikasi","Verified trades"],["Belum ada laporan publik","No public reports yet"],["Ada laporan terverifikasi","Verified reports available"],["Menunggu audit","Awaiting audit"],["Membaca laporan COT…","Loading COT report…"],["Berita pasar","Market news"],["Dampak:","Impact:"],["Baca dampaknya →","Read market impact →"],["Indikator belum tersedia","Indicators unavailable"]];
const translations=new Map(pairs),originals=new WeakMap(),skip=new Set(["SCRIPT","STYLE","NOSCRIPT","TEXTAREA","INPUT","SELECT","SVG","CODE","PRE"]);
const stored=()=>{try{return localStorage.getItem("katarina-news-language")==="en"?"en":"id"}catch{return "id"}};
let language=stored(),scheduled=false;
function dynamicIdToEn(s){
 let v=translations.get(s);if(v)return v;
 if(/^Rencana (BUY|SELL) ([A-Z]{6})$/.test(s))return s.replace(/^Rencana/,"Plan");
 if(/^Fokus (BUY|SELL)\b/.test(s))return s.replace("Fokus","Focus");
 if(/^Penutupan H4\b/.test(s))return s.replace(/^Penutupan H4/,"H4 close");
 if(/^Harga terakhir\b/.test(s))return s.replace(/^Harga terakhir/,"Last price");
 if(/^Kondisi harga\b/.test(s))return s.replace(/^Kondisi harga/,"Price condition");
 if(/^Tidak ada (?:arah|rencana)/i.test(s))return s.replace(/^Tidak ada /,"No ");
 if(/^Memuat\b/.test(s))return s.replace(/^Memuat\b/,"Loading");
 if(/^Mengecek arah mingguan/.test(s))return "Checking the weekly outlook using H4 candles…";
 if(/^Candle H4/.test(s))return s.replace(/^Candle H4/,"H4 candle");
 if(/^Perubahan\b/.test(s))return s.replace(/^Perubahan/,"Change");
 if(/^Pembaruan proyek sedang tidak tersedia/.test(s))return "Project updates are currently unavailable. You can still view the development records on GitHub.";
 if(/^Kondisi harga · /.test(s))return s.replace(/^Kondisi harga/,"Price action");
 if(/^Penutupan /.test(s))return s.replace(/^Penutupan/,"Closed on");
 if(/^Buka analisa/.test(s))return s.replace("Buka analisa","Open analysis");
 return null;
}
function shouldSkip(node){
 const p=node?.parentElement;if(!p)return true;
 if(p.closest("script,style,noscript,textarea,input,select,svg,pre,code,[translate='no']"))return true;
 return false;
}
function apply(node){
 if(node.nodeType!==3||shouldSkip(node))return;
 const now=node.nodeValue,previous=originals.get(node);
 let base=previous?.original;
 if(!previous||now!==previous.applied){
  base=now;originals.set(node,{original:base,applied:now});
 }
 const trimmed=base.trim();
 if(!trimmed)return;
 const translation=language==="en"?dynamicIdToEn(trimmed):null;
 const result=translation?base.replace(trimmed,translation):base;
 if(result!==now){originals.set(node,{original:base,applied:result});node.nodeValue=result}
}
function walk(root){
 if(!root)return;
 if(root.nodeType===3){apply(root);return}
 if(root.nodeType!==1&&root.nodeType!==9&&root.nodeType!==11)return;
 if(root.nodeType===1&&skip.has(root.tagName))return;
 const nodes=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
 while((node=nodes.nextNode()))apply(node);
}
function update(){
 language=stored();
 document.documentElement.lang=language;
 const chooser=document.getElementById("site-language");if(chooser&&chooser.value!==language)chooser.value=language;
 walk(document.body);
 document.title=language==="en"?"KATARINA AI · "+(document.body.dataset.page==="research"?"Market Research":document.body.dataset.page==="journal"?"Trading Journal":"Market Intelligence"):document.title.replace("Market Research","Terminal Riset").replace("Trading Journal","Jurnal Riset").replace("Market Intelligence","Intelijen Pasar");
}
function schedule(){
 if(scheduled)return;scheduled=true;
 queueMicrotask(()=>{scheduled=false;walk(document.body)});
}
function init(){
 update();
 const chooser=document.getElementById("site-language");
 chooser?.addEventListener("change",()=>{
  try{localStorage.setItem("katarina-news-language",chooser.value==="en"?"en":"id")}catch{}
  update();
 });
 const observer=new MutationObserver(records=>{
  if(!records.some(x=>x.type==="characterData"||x.addedNodes?.length))return;
  schedule();
 });
 observer.observe(document.body,{subtree:true,childList:true,characterData:true});
 window.addEventListener("storage",e=>{if(e.key==="katarina-news-language")update()});
 window.KatarinaLanguage={get:()=>language,refresh:update};
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();