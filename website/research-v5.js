/* KATARINA weekly research — single side from real H4 candles.
 * Not trading advice: if confirmation is missing or invalidation hits, no plan.
 */
(()=>{"use strict";
const $=id=>document.getElementById(id),el=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=String(value);return n};
const fmt=(v,id)=>Number(v).toLocaleString("id-ID",{maximumFractionDigits:id.endsWith("JPY")?3:/^(EUR|GBP|AUD|NZD|USD|CAD|CHF)[A-Z]{3}$/.test(id)?5:2});
const when=iso=>new Date(iso).toLocaleString("id-ID",{timeZone:"Asia/Jakarta",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
const label=(title,value,note)=>{const n=el("div","detail-metric");n.append(el("small",null,title),el("strong",null,value),el("span",null,note));return n};
const row=(title,content)=>{const n=el("div","watch-row");n.append(el("span",null,title),el("p",null,content));return n};
let current="",version=0,lastPlan=null;
function text(id,value){if($(id))$(id).textContent=String(value)}
function showMissing(message){
 const headline=message||"Belum ada arah H4 yang layak.";
 text("forecast-direction","Belum ada plan mingguan");
 text("forecast-date","Menunggu candle H4 dan konfirmasi pasar");
 text("forecast-bull","—");text("forecast-bear","—");
 const plan=$("single-plan");if(plan)plan.replaceChildren(el("p","empty-state",headline));
 const metrics=$("deep-metrics");if(metrics)metrics.replaceChildren(el("p","empty-state","Data H4 yang cukup belum tersedia."));
 const context=$("research-explainer");if(context)context.replaceChildren();
 const ai=$("pair-ai-overview");if(ai)ai.replaceChildren(el("p","ai-wait","Arah belum layak ditetapkan; cek bukti rilis dan data H4."));
 const risks=$("risk-checklist");if(risks)risks.replaceChildren(row("Standar pembatalan","Jika syarat konfirmasi tidak terpenuhi, rencana tidak aktif."));
}
function present(p){
 const id=p.symbol,dir=p.direction,positive=dir==="BUY",m=p.marketCondition;
 text("forecast-direction",positive?"Fokus BUY · mencari kenaikan ↗":"Fokus SELL · mencari penurunan ↘");
 const heading=$("forecast-direction");if(heading)heading.className=positive?"positive":"negative";
 text("forecast-date","H4 terakhir "+when(p.lastClosedAt)+" WIB · "+p.biasStrength);
 text("forecast-bull",fmt(p.trigger,id));
 text("forecast-bear",fmt(p.invalidation,id));
 text("plan-heading","Rencana "+dir+" "+id);
 text("technical-state",positive?"Cenderung menguat":"Cenderung melemah");
 const prev6=m.h4Close-m.last6H4Change;
 const change6=prev6>0?100*m.last6H4Change/prev6:0;
 text("pair-week-change",(change6>=0?"+":"")+change6.toFixed(2)+"%");
 text("pair-move",(m.lastH4ChangePct>=0?"+":"")+m.lastH4ChangePct.toFixed(2)+"% H4");
 text("pair-last",fmt(m.h4Close,id));
 text("pair-asof","Penutupan H4 "+when(p.lastClosedAt)+" WIB"+(p.proxy?" · acuan futures/indeks":" · harga referensi"));
 const metrics=$("deep-metrics");if(metrics){
  metrics.replaceChildren(label("EMA 20 H4",fmt(m.ema20,id),"Acuan tren dekat"),
    label("EMA 50 H4",fmt(m.ema50,id),"Acuan tren lebih besar"),
    label("RSI 14 H4",m.rsi14,"Momentum harga"),
    label("ATR 14 H4",fmt(m.atr14,id),"Rata-rata gerak H4"),
    label("Enam candle H4",fmt(m.last6H4Change,id),"Perubahan harga"),
    label("Penutupan H4",fmt(m.h4Close,id),when(p.lastClosedAt)));
 }
 const explain=$("research-explainer");if(explain){
  const block=el("div","research-narrative");
  const title=positive?"Kenapa KATARINA condong naik?":"Kenapa KATARINA condong turun?";
  block.append(el("strong",null,title),el("p",null,p.reasons.join(" ")));
  explain.replaceChildren(block);
 }
 const root=$("single-plan");if(root){
  const lead=el("div","single-plan-lead "+(positive?"buy":"sell"));
  lead.append(el("small",null,"ARAH UTAMA PEKAN INI"),el("strong",null,dir+" · "+id),el("p",null,"Belum otomatis menjadi sinyal entry. "+p.condition));
  const grid=el("div","single-plan-grid");
  for(const [a,b]of [["Pemicu konfirmasi",p.trigger],["Batas batal",p.invalidation],["Area tujuan awal",p.objective]]){
   const cell=el("div","plan-level");cell.append(el("small",null,a),el("strong",null,fmt(b,id)));grid.append(cell)}
  root.replaceChildren(lead,grid,el("div","plan-invalidate",p.invalidText));
  root.append(el("p","cot-meta-note",p.disclaimer));
 }
 const ai=$("pair-ai-overview");if(ai){
  const top=el("p","ai-overview-intro",p.trend+". "+p.reasons.join(" "));
  const cot=el("div","ai-overview-item");cot.append(el("strong",null,"Bagaimana posisi COT?"),el("p",null,p.cotNote+" COT "+p.cotAlignment+" dengan "+dir+"."));
  const news=el("div","ai-overview-item"),macro=p.macroReview;
  news.append(el("strong",null,"Kesimpulan fundamental dari rilis terverifikasi"),el("p",null,macro?.message||"Belum ada rilis yang cukup untuk menyimpulkan arah kebijakan."));
  for(const effect of (macro?.crossAsset||[]).slice(0,3)){
   const div=el("p",null,"Dampak yang diperkirakan: "+effect.direction+" · "+effect.reason+" (berdasarkan "+effect.title+")");
   news.append(div);
  }
  for(const fact of (macro?.stories||[]).slice(0,3)){
   const line=el("p",null,fact.currency+" · "+fact.policyDirection+" · "+fact.summary+" → "+fact.pairDirection);
   news.append(line);
   if(/^https:\/\//.test(fact.url)){const a=el("a",null,"Sumber resmi ↗");a.href=fact.url;a.target="_blank";a.rel="noopener noreferrer";news.append(a)}
  }
  ai.replaceChildren(top,cot,news);
  ai.append(el("small","ai-source-note",p.proxy?p.proxyNote:"Data H4 dari harga referensi, bukan quote broker. Keputusan mengikuti syarat harga, bukan judul berita saja."));
 }
 const risks=$("risk-checklist");if(risks){
  risks.replaceChildren(row("Kapan analisa dianggap gagal?",p.invalidText),row("Kapan belum boleh dianggap aktif?","Sebelum ada penutupan H4 yang memenuhi syarat "+fmt(p.trigger,id)+" beserta konfirmasi lanjutan, arah ini masih sebatas skenario."),row("Risiko berita","Rilis ekonomi, bank sentral, atau perubahan sentimen dapat membalikkan harga dalam hitungan jam. "+p.newsInterpretation));
 }
}
async function refresh(symbol,fresh=false){
 const token=++version;current=symbol;showMissing("Mengecek struktur H4, COT dan kesimpulan rilis kebijakan…");
 try{
  const r=await fetch("/api/weekly-plan?symbol="+encodeURIComponent(symbol)+(fresh?"&fresh=1":""),{cache:"no-store"}),j=await r.json();
  if(token!==version)return;
  if(r.ok&&j.status==="ready"&&j.direction){lastPlan=j;present(j);window.dispatchEvent(new CustomEvent("katarina:weekly-plan",{detail:{plan:j}}));return}
  lastPlan=null;showMissing(j.message||"Tidak ada arah H4 yang cukup jelas untuk "+symbol+".");
  if(j.macroReview){const box=$("pair-ai-overview");if(box)box.replaceChildren(
    el("strong",null,"Evaluasi fundamental"),el("p",null,j.macroReview.message),
    ...(j.macroReview.stories||[]).slice(0,3).map(x=>el("p",null,x.title+" · "+x.currency+" → "+x.pairDirection))
  )}
  window.dispatchEvent(new CustomEvent("katarina:weekly-plan",{detail:{plan:null,symbol}}));
 }catch{if(token===version){lastPlan=null;showMissing("Layanan H4 sedang tidak tersedia. Coba beberapa saat lagi.");window.dispatchEvent(new CustomEvent("katarina:weekly-plan",{detail:{plan:null,symbol}}));}}
}
window.addEventListener("katarina:pair-change",e=>{const symbol=e.detail?.symbol;if(symbol)refresh(symbol)});
window.addEventListener("katarina:policy-brief-updated",e=>{if(e.detail?.symbol===current)refresh(current,true)});
const start=()=>{const symbol=new URLSearchParams(location.search).get("symbol")?.toUpperCase()||"XAUUSD";refresh(symbol);setInterval(()=>{if(!document.hidden&&current)refresh(current)},60*60*1000)};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();