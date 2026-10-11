/* KATARINA Research detail — each symbol has its own observed structure and conditional weekly map.
 * TradingView supplies the interactive chart. The overlay is a separate KATARINA HTML element,
 * not a native TradingView drawing or a claim that live prices were analysed.
 */
(()=>{"use strict";
const $=id=>document.getElementById(id),el=(tag,cls,t)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(t!==undefined)n.textContent=String(t);return n};
const keys={XAUUSD:"xau",XAGUSD:"silver",BTCUSD:"bitcoin",US30:"us30",US500:"sp500",NASDAQ:"nasdaq"};
const fmt=(v,id)=>Number(v).toLocaleString("id-ID",{maximumFractionDigits:/JPY$/.test(id)?3:/^(EUR|GBP|AUD|NZD|USD|CAD|CHF)[A-Z]{3}$/.test(id)?5:2});
const date=s=>{try{return new Date(s).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric",timeZone:"Asia/Jakarta"})}catch{return "—"}};
let market=null,context=null,calendar=null,current="",ready=false,aiClock=null,aiRevision=0;
function ema(xs,p){const k=2/(p+1);let result=xs.slice(0,p).reduce((sum,x)=>sum+x,0)/p;for(let i=p;i<xs.length;i++)result=xs[i]*k+result*(1-k);return result}
function rsi(xs){let gain=0,loss=0;const d=xs.slice(-15);for(let i=1;i<d.length;i++){const v=d[i]-d[i-1];if(v>0)gain+=v;else loss-=v}if(loss===0)return gain===0?50:100;return 100-100/(1+gain/loss)}
function signal(bars){
 const b=(bars||[]).filter(x=>Array.isArray(x)&&x.length===5&&x.slice(1).every(v=>typeof v==="number"&&Number.isFinite(v)));
 if(b.length<54)return null;
 const closes=b.map(x=>x[4]),last=b.at(-1),prior=b.at(-2),r=b.slice(-21,-1);
 const up=Math.max(...r.map(x=>x[2])),down=Math.min(...r.map(x=>x[3])),e20=ema(closes,20),e50=ema(closes,50);
 const vol=b.slice(-14).reduce((s,x,i)=>{const p=b.at(-(15-i))?.[4]||x[1];return s+Math.max(x[2]-x[3],Math.abs(x[2]-p),Math.abs(x[3]-p))},0)/14;
 const strength=rsi(closes);
 const perf5=(last[4]/b.at(-6)[4]-1)*100,perf20=(last[4]/b.at(-21)[4]-1)*100;
 const state=last[4]>e20&&e20>e50&&strength>53?"penguatan":last[4]<e20&&e20<e50&&strength<47?"pelemahan":"konsolidasi";
 const candleBody=Math.abs(last[4]-last[1]),range=Math.max(last[2]-last[3],1e-10),prevBody=Math.abs(prior[4]-prior[1]);
 const engulfBull=last[4]>last[1]&&prior[4]<prior[1]&&last[1]<=prior[4]&&last[4]>=prior[1];
 const engulfBear=last[4]<last[1]&&prior[4]>prior[1]&&last[1]>=prior[4]&&last[4]<=prior[1];
 const pinDown=(Math.min(last[1],last[4])-last[3])>2.4*candleBody&&(last[2]-Math.max(last[1],last[4]))<range*.25;
 const pinUp=(last[2]-Math.max(last[1],last[4]))>2.4*candleBody&&(Math.min(last[1],last[4])-last[3])<range*.25;
 const pattern=engulfBull?"Engulfing naik":engulfBear?"Engulfing turun":pinDown?"Pin bar bawah":pinUp?"Pin bar atas":Math.max(candleBody,prevBody)<range*.2?"Body kecil / ragu":"Tidak ada pola dominan";
 return {last,close:last[4],up,down,e20,e50,atr:vol,rsi:strength,perf5,perf20,state,pattern};
}
const metric=(label,value,note)=>{const a=el("div","detail-metric");a.append(el("small",null,label),el("strong",null,value),el("span",null,note));return a};
const line=(name,detail)=>{const a=el("div","watch-row");a.append(el("span",null,name),el("p",null,detail));return a};
function overlay(s,id){
 const host=$("tv-host-v4");if(!host)return;
 host.querySelector(".chart-bias-overlay")?.remove();
 const a=el("button","chart-bias-overlay"),flag=el("strong",null,(s.state==="penguatan"?"↗":s.state==="pelemahan"?"↘":"↔")+" "+id+" · "+s.state);
 const body=el("span",null,"Tekan untuk lihat batas skenario");const sub=el("small",null,"Atas "+fmt(s.up,id)+" · Bawah "+fmt(s.down,id));
 a.type="button";a.setAttribute("aria-expanded","false");a.append(flag,body,sub);
 sub.hidden=true;
 a.addEventListener("click",()=>{sub.hidden=!sub.hidden;body.textContent=sub.hidden?"Tekan untuk lihat batas skenario":"Berdasarkan data historis";a.setAttribute("aria-expanded",String(!sub.hidden))});
 host.append(a);
}
function refreshAI(symbol){
 const host=$("pair-ai-overview");if(!host)return;
 const version=++aiRevision;clearTimeout(aiClock);
 host.replaceChildren(el("p","ai-wait","Membaca data dan menyusun gambaran makro "+symbol+"…"));
 aiClock=setTimeout(async()=>{
  try{
   const result=await fetch("/api/pair-outlook?symbol="+encodeURIComponent(symbol),{cache:"no-store"});
   if(version!==aiRevision)return;
   const data=await result.json();if(!result.ok||data?.status!=="ready"||data.symbol!==symbol)throw Error("Unavailable");
   host.replaceChildren();
   const intro=el("p","ai-overview-intro",data.summary);host.append(intro);
   const grid=el("div","ai-overview-grid");
   const fields=[["Penggerak utama",data.drivers],["Bila harga menguat",data.upside],["Bila harga melemah",data.downside],["Yang patut diamati",data.watch],["Catatan penting",data.uncertainty]];
   for(const [title,body]of fields){if(!body)continue;const box=el("div","ai-overview-item");box.append(el("strong",null,title),el("p",null,body));grid.append(box)}
   host.append(grid);
   host.append(el("small","ai-source-note","Berdasarkan candle historis dan kalender yang tersedia. Penilaian makro bersifat bersyarat; bukan keputusan transaksi."));
  }catch{
   if(version!==aiRevision)return;
   host.replaceChildren(el("p","ai-wait","Pembacaan mendalam belum tersedia untuk "+symbol+". Analisa teknikal, faktor penggerak dan skenario mingguan di atas tetap bisa dibaca."));
  }
 },650);
}

function render(symbol){
 if(!market?.series||!symbol)return;const ctx=context?.find(x=>x.id===symbol),rows=market.series[ctx?.chart||keys[symbol]||symbol.toLowerCase()]?.bars;
 const s=signal(rows),metrics=$("deep-metrics"),explainer=$("research-explainer"),risk=$("risk-checklist");
 if(!metrics||!explainer||!risk)return;
 metrics.replaceChildren();explainer.replaceChildren();risk.replaceChildren();
 if(!s){metrics.append(el("p","empty-state","Belum tersedia candle yang cukup untuk indikator dan proyeksi "+symbol+"."));$("forecast-direction").textContent="Data belum cukup";const aiHost=$("pair-ai-overview");if(aiHost)aiHost.textContent="Data belum cukup untuk analisa mendalam.";return}
 const last=new Date(s.last[0]*1000),d=date(last);
 const direction=s.state==="penguatan"?"Cenderung menguat ↗":s.state==="pelemahan"?"Cenderung melemah ↘":"Menunggu konfirmasi ↔";
 $("forecast-direction").textContent=direction;$("forecast-direction").className=s.state==="penguatan"?"positive":s.state==="pelemahan"?"negative":"";
 $("forecast-date").textContent="Acuan penutupan "+d;$("forecast-bull").textContent="Di atas "+fmt(s.up,symbol);$("forecast-bear").textContent="Di bawah "+fmt(s.down,symbol);
 const stamp=Date.now()-last.getTime();if(stamp>4*86400000)$("forecast-date").textContent="Data historis "+d+" · tunggu harga terbaru";
 metrics.append(metric("EMA 20",fmt(s.e20,symbol),s.close>=s.e20?"Harga di atas rata-rata":"Harga di bawah rata-rata"));
 metrics.append(metric("EMA 50",fmt(s.e50,symbol),s.e20>s.e50?"Rata-rata pendek lebih tinggi":"Rata-rata pendek lebih rendah"));
 metrics.append(metric("RSI 14",s.rsi.toFixed(1),s.rsi>70?"Momentum jenuh beli":s.rsi<30?"Momentum jenuh jual":s.rsi>=50?"Momentum positif":"Momentum negatif"));
 metrics.append(metric("ATR 14",fmt(s.atr,symbol),"Kisaran harian rata-rata"));
 metrics.append(metric("5 sesi",(s.perf5>=0?"+":"")+s.perf5.toFixed(2)+"%", "Kinerja historis"));
 metrics.append(metric("20 sesi",(s.perf20>=0?"+":"")+s.perf20.toFixed(2)+"%", "Kinerja historis"));
 metrics.append(metric("Pola candle",s.pattern,"Candle harian terakhir"));
 metrics.append(metric("Penutupan terakhir",fmt(s.close,symbol),d));
 const panel=el("div","research-narrative");
 const desc=s.state==="penguatan"?"Rata-rata jangka pendek berada di atas rata-rata panjang dan momentum mendukung kenaikan. Posisi ini baru menarik jika kenaikan bertahan saat area hambatan diuji.":s.state==="pelemahan"?"Harga dan momentum lebih lemah daripada rata-rata harian. Perhatikan apakah rebound berhenti di area hambatan atau justru membentuk pembalikan.":"EMA dan momentum belum sejalan. Sebelum mengikuti arah, lebih masuk akal memantau penutupan yang benar-benar meninggalkan rentang harian.";
 panel.append(el("strong",null,"Pembacaan "+symbol+" — "+direction),el("p",null,desc));
 const more=ctx?.drivers?.slice(0,2)||[];
 if(more.length)panel.append(el("p",null,"Pemicu yang perlu dibandingkan: "+more.join("; ")+"."));
 explainer.append(panel);
 const events=(calendar?.events||[]).filter(x=>x?.dateWIB&&x?.source&&(x.instrumentImpact?.[symbol]>=3||symbol.includes("USD")&&x.region==="AS")).slice(0,3);
 if(events.length){for(const ev of events)risk.append(line(ev.title,"Rilis "+ev.dateWIB+" · aktual vs prediksi dapat mengubah volatilitas "+symbol+". Pantau respons setelah lonjakan awal."))}
 else risk.append(line("Perubahan ekspektasi suku bunga","Perhatikan rilis dan pernyataan bank sentral yang menggerakkan mata uang pembentuk "+symbol+"."));
 risk.append(line("Posisi pasar & korelasi","COT hanya mencatat futures mingguan. Bandingkan juga perubahan yield, dolar, dan selera risiko sebelum menyimpulkan arah."),line("Kesegaran data","Peta ini dihitung dari candle harian historis sampai "+d+". Grafik TradingView bisa bergerak lebih cepat; periksa harga terkini sebelum mengambil keputusan."));
 refreshAI(symbol);
}
const load=async()=>{
 try{const [m,c,k]=await Promise.all(["/market-ohlc.json","/instrument-context.json","/calendar-brief.json"].map(u=>fetch(u,{cache:"no-store"}).then(r=>r.ok?r.json():null)));
 market=m?.schema===1?m:null;context=c?.instruments||[];calendar=k;ready=true;render(current||new URLSearchParams(location.search).get("symbol")||"XAUUSD");
 }catch{const x=$("deep-metrics");if(x)x.textContent="Data belum tersedia."}
};
window.addEventListener("katarina:pair-change",event=>{current=event.detail?.symbol||"XAUUSD";if(ready)requestAnimationFrame(()=>render(current))});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",load);else load();
})();
