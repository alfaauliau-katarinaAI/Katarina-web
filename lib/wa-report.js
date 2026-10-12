/* KATARINA WhatsApp trial: reproducible report formatting and evidence gates.
 * No unverified win rates, no simulated COT/news, no invented price levels.
 */
export const SYMBOL=/^(?:XAUUSD|XAGUSD|BTCUSD|US30|US500|NASDAQ|(?:EUR|GBP|USD|AUD|NZD|CAD|CHF)(?:EUR|GBP|USD|JPY|CHF|CAD|AUD|NZD))$/;
const format=(n,pair)=>Number(n).toLocaleString("id-ID",{maximumFractionDigits:pair.endsWith("JPY")?3:/^(EUR|GBP|AUD|USD|NZD|CAD|CHF)[A-Z]{3}$/.test(pair)?5:2});
const time=(date)=>{const d=new Date(date);return Number.isNaN(d.getTime())?"belum ada":new Intl.DateTimeFormat("id-ID",{timeZone:"Asia/Jakarta",day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(d)+" WIB"};
const clean=text=>String(text||"").replace(/[\r\n\t]+/g," ").replace(/\s+/g," ").trim();
export function command(raw){
 const v=clean(raw).toUpperCase();
 if(/^(?:BANTUAN|HELP|MENU|MULAI|HI|HALO|START)$/.test(v))return {action:"help"};
 if(/^(?:STOP|BERHENTI|BATAL LANGGANAN)$/.test(v))return {action:"stop"};
 const m=v.match(/^(?:ANALISA|ANALISIS|RISET|LAPORAN)\s+([A-Z0-9]{4,9})$/);
 if(m)return SYMBOL.test(m[1])?{action:"report",symbol:m[1]}:{action:"invalid-symbol"};
 return {action:"help"};
}
export const helpText="*KATARINA AI — Uji Coba*\n\nKetik *ANALISA XAUUSD* atau *ANALISA USDJPY* untuk melihat laporan pasar H4, alasan arah, COT, berita, dan batas pembatalan.\n\nKetik *BANTUAN* untuk melihat menu ini atau *STOP* untuk berhenti menerima balasan uji coba.\n\nMode ini hanya membalas permintaan nomor penguji yang diizinkan. Belum ada langganan atau broadcast otomatis.";
export function formatReport({symbol,plan,cot,calendar,now=Date.now()}){
 if(!SYMBOL.test(symbol))return "Instrumen belum dikenali. Contoh: *ANALISA XAUUSD*.";
 if(!plan||plan.status!=="ready"||!["BUY","SELL"].includes(plan.direction)){
  const reason=clean(plan?.message||"Data H4 atau konfirmasi arah belum mencukupi.");
  return "*KATARINA AI | "+symbol+" — H4*\n\n*KEPUTUSAN: TIDAK ADA PLAN AKTIF*\n"+reason+"\n\nKATARINA tidak mengirim sinyal ketika data atau struktur harga belum jelas. Cek kembali setelah penutupan H4 berikutnya.\n\nLihat grafik: https://katarina-research.pages.dev/research?symbol="+symbol;
 }
 const n=plan.marketCondition||{},dir=plan.direction,trigger=plan.trigger,invalid=plan.invalidation,target=plan.objective;
 const numeric=[trigger,invalid,target,n.h4Close,n.ema20,n.ema50,n.rsi14,n.atr14].every(Number.isFinite);
 const coherence=dir==="BUY"?invalid<trigger&&target>trigger:invalid>trigger&&target<trigger;
 if(!numeric||!coherence)return "*KATARINA AI | "+symbol+"*\n\n*LAPORAN DITAHAN*: pemeriksaan level dan indikator gagal. KATARINA tidak mengirim rencana yang belum konsisten.";
 const closed=new Date(plan.lastClosedAt).getTime(),age=(now-closed)/3600000,day=new Date(now).getUTCDay();
 const maxFresh=(day===0||day===6||day===1)?96:32;
 const fresh=Number.isFinite(age)&&age>=0&&age<=maxFresh;
 const rawCot=Array.isArray(cot?.data)?cot.data:[],cotCurrent=rawCot.filter(x=>Number.isFinite(Date.parse(x.asOf))&&now-Date.parse(x.asOf)<=16*86400000);
 const cotState=!cotCurrent.length?"tidak tersedia / terlalu lama":plan.cotAlignment||"belum jelas";
 const cotConflict=plan.cotBias&&plan.cotBias!==dir;
 const cotSupport=plan.cotBias===dir&&cotCurrent.length>0;
 const events=Array.isArray(calendar?.events)?calendar.events:[],upcoming=events.filter(x=>{
  const when=x.dateWIB+"T"+(x.timeWIB||"00:00")+":00+07:00",ts=Date.parse(when);
  return Number.isFinite(ts)&&ts>=now-24*3600000&&ts<=now+8*86400000&&x.instrumentImpact?.[symbol]>=3&&typeof x.source==="string"&&x.source.startsWith("https://");
 }).sort((a,b)=>String(a.dateWIB+a.timeWIB).localeCompare(String(b.dateWIB+b.timeWIB))).slice(0,2);
 const news=Array.isArray(plan.news)?plan.news.filter(x=>x?.url?.startsWith("https://")&&Number.isFinite(Date.parse(x.publishedAt))&&now-Date.parse(x.publishedAt)>=0&&now-Date.parse(x.publishedAt)<5*86400000).slice(0,2):[];
 const verdict=!fresh?"DATA H4 PERLU DIPERBARUI":cotConflict?"H4 SEARAH, COT BERLAWANAN":cotSupport?"LAYAK DIPANTAU, BELUM TERKONFIRMASI ENTRY":"MASIH PERLU KONFIRMASI";
 const reasons=(plan.reasons||[]).filter(x=>typeof x==="string").slice(0,3);
 const t=[
 "*KATARINA AI | LAPORAN UJI COBA*",
 "*"+symbol+" · H4 · "+time(plan.lastClosedAt)+"*",
 "",
 "*Arah utama: "+dir+"*",
 "*Status verifikasi: "+verdict+"*",
 "Dasar arah: "+clean(plan.trend||"Struktur harga H4")+". Laporan ini bukan perintah entry.",
 "",
 "*1. Data harga yang diperiksa*",
 "Penutupan H4: "+format(n.h4Close,symbol),
 "EMA20 / EMA50: "+format(n.ema20,symbol)+" / "+format(n.ema50,symbol),
 "RSI14: "+n.rsi14+" | ATR14: "+format(n.atr14,symbol),
 ...reasons.map(x=>"• "+clean(x)),
 "",
 "*2. Rencana dan batas risiko*",
 "Konfirmasi: "+format(trigger,symbol)+" — "+clean(plan.condition),
 "Area tujuan indikatif: "+format(target,symbol)+" (proyeksi berbasis ATR, bukan target pasti).",
 "*BATAL* jika H4 tutup "+(dir==="BUY"?"di bawah ":"di atas ")+format(invalid,symbol)+".",
 "",
 "*3. COT / posisi pelaku besar*",
 clean(plan.cotNote||"Belum ada data COT yang dapat diperiksa."),
 "Kesesuaian arah: "+cotState+".",
 ...(cotConflict?["⚠ Posisi futures bertentangan dengan arah H4; jangan menyebut analisa sudah terkonfirmasi."]:[]),
 "",
 "*4. Fundamental & berita*",
 news.length?news.map(x=>"• "+clean(x.source)+" ("+time(x.publishedAt)+"): "+clean(x.relevanceNote||"Ada pembaruan; arah dampak harga harus dilihat dari rilis dan reaksi pasar.")+"\n  "+x.url).join("\n"):"Belum ada berita relevan yang cukup baru untuk mengonfirmasi arah.",
 "",
 "*5. Agenda berisiko tinggi*",
 upcoming.length?upcoming.map(x=>"• "+clean(x.title)+" — "+x.dateWIB+" "+(x.timeWIB||"")+" WIB. "+clean(x.analysisShort||x.description||"Periksa aktual dibanding perkiraan.")+"\n  "+x.source).join("\n"):"Tidak ditemukan agenda terkait yang telah diverifikasi dalam jendela pemeriksaan.",
 "",
 "*6. Evaluasi akhir*",
 !fresh?"Candle sumber sudah lama. Rencana ini tidak boleh dianggap aktif sebelum data harga diperbarui.":cotConflict?"Struktur H4 dan COT belum sejalan. Tunggu konfirmasi harga, bukan sekadar mengikuti arah utama.":!cotSupport?"Sinyal H4 bersyarat; posisi futures belum cukup untuk mendukungnya. Cek reaksi berita dan pergerakan H4 berikutnya.":"H4 dan posisi futures relatif sejalan, namun belum ada bukti profitabilitas atau probabilitas kemenangan yang tervalidasi.",
 "",
 "Sumber harga: "+clean(plan.source||"OHLC pasar publik")+(plan.proxy?" (acuan futures/indeks, bisa berbeda dari broker).":"."),
 "Grafik: https://katarina-research.pages.dev/research?symbol="+symbol,
 "⚠ Data dan interpretasi dapat berubah; ini bukan nasihat investasi, bukan hasil backtest terverifikasi."
 ];
 // WhatsApp text bodies have a maximum size. Keep the evidence gate and invalidation.
 const out=t.join("\n");if(out.length<=3900)return out;
 const minimal=[...t.slice(0,24),"", "*Berita dan agenda lengkap:* https://katarina-research.pages.dev/research?symbol="+symbol,"",...t.slice(-4)];
 return minimal.join("\n").slice(0,3900);
}
