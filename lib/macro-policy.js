/* Macro evidence: no directional signal for a statistical title alone. */
export const CCYS=["USD","JPY","EUR","GBP","AUD","CAD","NZD","CHF"];
export function recent(date,hours=72,now=Date.now()){
 const age=now-Date.parse(date||"");return Number.isFinite(age)&&age>=-1800000&&age<=hours*3600000;
}
export function headlinePolicy(item){
 const t=String(item?.title||"");
 let currency=CCYS.includes(item?.market)?item.market:null;
 if(!currency){
  const found=[
   ["JPY",/\b(boj|bank of japan|japanese|yen)\b/i],
   ["USD",/\b(fomc|federal reserve|u\.s\. fed|us inflation|us payroll|us cpi|powell)\b/i],
   ["EUR",/\b(ecb|european central bank|eurozone|euro area)\b/i],
   ["GBP",/\b(boe|bank of england|sterling|british inflation)\b/i],
   ["AUD",/\b(rba|reserve bank of australia|australian inflation)\b/i],
   ["CAD",/\b(boc|bank of canada|canadian inflation)\b/i],
   ["NZD",/\b(rbnz|reserve bank of new zealand)\b/i],
   ["CHF",/\b(snb|swiss national bank|swiss inflation)\b/i]
  ].filter(x=>x[1].test(t));
  if(found.length===1)currency=found[0][0];
 }
 const statistics=/output gap|potential growth|labor market indicators|bonds? held|holdings|balance sheet|statistical|statistics|tankan|survey/i.test(t);
 const spec=/\b(may|might|could|expected|expects|forecast|possible|plans? to|consider|rumou?r)\b/i.test(t);
 let policyDirection="NO_DECISION",currencyBias="UNKNOWN";
 if(!statistics&&!spec&&/interest|policy rate|bank rate/i.test(t)){
  if(/\b(raises?|raised|hikes?|hiked|increases?|increased)\b.{0,45}\b(rates?|interest|policy rate)\b/i.test(t)){policyDirection="TIGHTENING";currencyBias="STRONGER";}
  else if(/\b(cuts?|cut|lowers?|lowered|reduces?|reduced)\b.{0,45}\b(rates?|interest|policy rate)\b/i.test(t)){policyDirection="EASING";currencyBias="WEAKER";}
  else if(/\b(holds?|held|keeps?|kept)\b.{0,45}\b(rates?|interest|policy rate)\b/i.test(t))policyDirection="HOLD";
 }
 return {eventType:statistics?"STATISTICS":policyDirection!=="NO_DECISION"?"DECISION":"UNVERIFIED",policyDirection,currencyBias:currency?currencyBias:"UNKNOWN",currency,
  evidenceLevel:"headline-only",note:statistics?"Ini laporan statistik, bukan keputusan kebijakan. Tidak ada arah JPY yang dapat disimpulkan dari judul.":"Perlu membaca isi rilis dan reaksinya sebelum membuat kesimpulan trading."};
}
export function pairDirection(symbol,currency,bias){
 if(!CCYS.includes(currency)||!["STRONGER","WEAKER"].includes(bias)||!/^[A-Z]{6}$/.test(symbol)||/^(XAU|XAG|BTC)/.test(symbol))return "UNKNOWN";
 if(symbol.slice(0,3)===currency)return bias==="STRONGER"?"BUY":"SELL";
 if(symbol.slice(3)===currency)return bias==="STRONGER"?"SELL":"BUY";
 return "UNKNOWN";
}
/* An article may mention both bullish and bearish transmission for one asset.
 * Never publish contradictory BUY and SELL directions as separate verdicts.
 */
export function normalizeMarketEffects(values){
 const effects=Array.isArray(values)?values:[];
 const normalized=new Map();
 for(const value of effects){
  if(!value||typeof value.symbol!=="string"||!["UP","DOWN","MIXED","UNKNOWN"].includes(value.direction)||typeof value.reason!=="string")continue;
  const key=value.symbol;
  const previous=normalized.get(key);
  if(!previous){normalized.set(key,{symbol:key,direction:value.direction,reason:value.reason.trim()});continue}
  if(previous.direction!==value.direction)previous.direction="MIXED";
  if(value.reason.trim()&&!previous.reason.includes(value.reason.trim()))previous.reason=(previous.reason+"; "+value.reason.trim()).slice(0,450);
 }
 return [...normalized.values()].slice(0,6);
}

export function summarizeMacro(symbol,records,now=Date.now()){
 const chosen=[],seen=new Set();
 const valid=(records||[]).filter(x=>x.status==="ai-full-article"&&x.basis==="Isi artikel publik dari penerbit"&&recent(x.publishedAt,72,now))
 .sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
 for(const x of valid){
  const direction=pairDirection(symbol,x.currency,x.currencyBias),key=x.currency+":"+x.policyDirection;
  if(direction==="UNKNOWN"||seen.has(key))continue;
  seen.add(key);chosen.push({...x,direction});if(chosen.length>=4)break;
 }
 // News impacts are conditional market scenarios, not objective policy decisions.
 // Require 2 separately hosted, full-source recent articles before using them as
 // a strong risk veto. Single reports still appear in the research rationale.
 const assetEvidence=valid.flatMap(x=>normalizeMarketEffects(x.marketEffects).filter(e=>
  e.symbol===symbol&&["UP","DOWN","MIXED"].includes(e.direction)&&x.eventType!=="STATISTICS")
  .map(e=>({title:x.title,url:x.url,source:x.source,publishedAt:x.publishedAt,direction:e.direction,reason:e.reason})));
 const unique=new Map();
 for(const e of assetEvidence){
  let host;try{host=new URL(e.url).hostname}catch{continue}
  if(!unique.has(host))unique.set(host,e);
 }
 const crossAsset=[...unique.values()].slice(0,5);
 const up=crossAsset.filter(e=>e.direction==="UP").length,down=crossAsset.filter(e=>e.direction==="DOWN").length;
 const crossAssetBias=up>=2&&!down?"BUY":down>=2&&!up?"SELL":up&&down?"CONFLICT":"UNKNOWN";
 const buy=chosen.some(x=>x.direction==="BUY"),sell=chosen.some(x=>x.direction==="SELL");
 const bias=buy&&sell?"CONFLICT":buy?"BUY":sell?"SELL":"UNKNOWN";
 return {bias,crossAsset,crossAssetBias,verifiedCount:chosen.length,stories:chosen.map(x=>({
  title:x.title,url:x.url,publishedAt:x.publishedAt,summary:x.summary,
  currency:x.currency,policyDirection:x.policyDirection,pairDirection:x.direction
 })),message:!chosen.length?
 crossAsset.length?"Ada "+crossAsset.length+" dampak pasar dari berita terverifikasi yang relevan untuk "+symbol+". Evaluasi ini bersyarat dan perlu diuji dengan pergerakan harga.":"Belum ada rilis baru yang selesai dianalisis dari isi aslinya. Arah H4 belum terkonfirmasi fundamental.":
 bias==="CONFLICT"?"Rilis terbaru memberikan arah yang saling bertentangan; jangan paksa satu posisi.":
 "Bukti berita terbaru cenderung mendukung "+bias+" "+symbol+"; tetap memerlukan konfirmasi harga."};
}
