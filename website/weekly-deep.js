/* Expanded sourced weekly research: observed metrics and conditional checklist, never trading signals. */
(()=>{"use strict";
const host=document.getElementById("kt-week-deep");if(!host)return;
const keymap={XAUUSD:"xau",XAGUSD:"silver",US30:"us30",US500:"sp500",NASDAQ:"nasdaq",BTCUSD:"bitcoin"};
let market=null,calendar=null,context=null;
const selected=()=>document.querySelector("[data-instrument-select]")?.value||"XAUUSD";
const num=(x,s)=>Number(x).toLocaleString("id-ID",{maximumFractionDigits:/JPY$/.test(s)?3:/(EUR|GBP|AUD|NZD|USD|CAD|CHF)/.test(s.slice(0,3))?5:2});
const div=(cls)=>{const e=document.createElement("div");e.className=cls;return e};
const el=(tag,cls,value)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=String(value);return e};
function card(title,subtitle,steps){const section=el("section","kt-deep-card");section.append(el("span","kt-deep-kicker",title),el("h3",null,subtitle));const list=el("ol",null);for(const step of steps)list.append(el("li",null,step));section.append(list);return section}
function render(){
 host.replaceChildren();
 const symbol=selected(),series=market?.series?.[keymap[symbol]||symbol.toLowerCase()];
 const raw=series?.bars||[];
 const bars=raw.filter(b=>Array.isArray(b)&&b.length>=5&&b.slice(1,5).every(v=>typeof v==="number"&&Number.isFinite(v))&&b[2]>=Math.max(b[1],b[4])&&b[3]<=Math.min(b[1],b[4]));
 const item=context?.instruments?.find(x=>x.id===symbol);
 const ev=(calendar?.events||[]).filter(e=>(e.instrumentImpact?.[symbol]||0)>=2).slice(0,5);
 if(bars.length<24){host.append(el("p","kt-deep-empty","Dataset historis untuk "+symbol+" belum cukup untuk indikator struktur tambahan. KATARINA tidak mengisi kekosongan dengan estimasi."));return}
 const recent=bars.slice(-20),last=bars.at(-1),close=last[4],top=Math.max(...recent.map(b=>b[2])),bottom=Math.min(...recent.map(b=>b[3])),sma=recent.reduce((a,b)=>a+b[4],0)/20;
 const change5=(close/bars.at(-6)[4]-1)*100,change20=(close/bars.at(-21)[4]-1)*100;
 const tr=bars.slice(-15).map((b,i,a)=>{const previous=(bars.at(-16+i)||b)[4];return Math.max(b[2]-b[3],Math.abs(b[2]-previous),Math.abs(b[3]-previous))});
 const atr=tr.slice(-14).reduce((a,b)=>a+b,0)/14;
 const pos=(close-bottom)/Math.max(0.00001,top-bottom);
 const data=div("kt-deep-metrics");
 const metrics=[["Penutupan referensi",num(close,symbol)],["Perubahan 5 sesi",(change5>=0?"+":"")+change5.toFixed(2)+"%"],["Perubahan 20 sesi",(change20>=0?"+":"")+change20.toFixed(2)+"%"],["Rerata 20 sesi",num(sma,symbol)],["Batas atas 20 sesi",num(top,symbol)],["Batas bawah 20 sesi",num(bottom,symbol)],["ATR 14 sesi (estimasi)",num(atr,symbol)],["Posisi dalam rentang",Math.round(pos*100)+"% dari bawah"]];
 for(const [label,value] of metrics){const m=div("kt-deep-metric");m.append(el("small",null,label),el("strong",null,value));data.append(m)}
 const heading=el("div","kt-deep-heading");heading.append(el("h3",null,"Peta struktur & pemeriksaan mingguan"),el("p",null,"Seluruh angka dihitung dari candle harian historis yang disimpan. ATR merupakan jarak harga rata-rata, bukan target keuntungan."));
 host.append(heading,data);
 const rangeTest=pos>=.75?"Harga dekat rentang atas 20 sesi: amati penerimaan di atasnya atau penolakan kembali ke dalam rentang.":pos<=.25?"Harga dekat rentang bawah 20 sesi: amati penutupan di bawahnya atau pembalikan kembali ke dalam rentang.":"Harga masih di tengah rentang 20 sesi: hindari menyimpulkan breakout sebelum ada penutupan yang mendukung.";
 const driver=(item?.drivers||[]).slice(0,2).join("; ");
 const macro=ev.length?ev.slice(0,3).map(e=>e.title).join(" · "):"Belum ada peristiwa relevan yang cukup tersaring";
 const steps=div("kt-deep-grid");
 steps.append(
 card("01 / STRUKTUR","Penanda teknikal yang diuji",[
   "Perhatikan area ekstrem 20 sesi "+num(bottom,symbol)+"–"+num(top,symbol)+" sebagai batas pengamatan historis, bukan zona entry.",
   rangeTest,
   "Bandingkan penutupan harga dengan rerata 20 sesi ("+num(sma,symbol)+") serta pelebaran rentang harian terhadap ATR 14 ("+num(atr,symbol)+")."
 ]),
 card("02 / MAKRO","Penggerak yang perlu diperiksa",[
   "Agenda relevan: "+macro+".",
   "Konteks instrumen: "+(driver||item?.monitor||"Perlu sumber tambahan sebelum menarik kesimpulan."),
   "Setelah berita penting, evaluasi reaksi USD, imbal hasil, aset berisiko dan apakah pergerakan harga bertahan setelah volatilitas awal."
 ]),
 card("03 / SKENARIO A","Bila tekanan menguat",[
   "Syarat pengamatan: harga bertahan di atas rerata 20 sesi dan menguji batas atas "+num(top,symbol)+" dengan penutupan yang jelas.",
   "Periksa apakah perubahan didukung agenda ekonomi dan volatilitas yang wajar, bukan satu lonjakan saat rilis.",
   "Bila harga kembali masuk rentang dan melemah di bawah rerata, skenario penguatan perlu ditinjau ulang."
 ]),
 card("04 / SKENARIO B","Bila tekanan melemah",[
   "Syarat pengamatan: penutupan berulang di bawah rerata 20 sesi dan pengujian batas bawah "+num(bottom,symbol)+".",
   "Periksa apakah pelemahan merupakan reaksi sesaat atau perubahan struktur yang berkelanjutan.",
   "Jika harga kembali di atas rerata dan kehilangan momentum turun, skenario pelemahan belum terkonfirmasi."
 ])
 );
 host.append(steps,el("p","kt-deep-disclaimer","Protokol pembacaan: observasi → pemicu makro → konfirmasi candle → cek risiko → evaluasi alternatif. Tidak memuat order buy/sell, target, level stop-loss atau probabilitas yang belum lolos uji."));
}
Promise.all(["/market-ohlc.json","/calendar-brief.json","/instrument-context.json"].map(u=>fetch(u,{cache:"no-store"}).then(r=>r.ok?r.json():null).catch(()=>null))).then(([m,c,i])=>{market=m?.schema===1?m:null;calendar=c?.schema===1?c:null;context=i?.schema===1?i:null;render()});
window.addEventListener("katarina-instrument",render);
})();