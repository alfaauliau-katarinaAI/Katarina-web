/* Macro evidence: no directional signal for a statistical title alone. */
export const CCYS=["USD","JPY","EUR","GBP","AUD","CAD","NZD","CHF"];
export function recent(date,hours=72,now=Date.now()){
 const age=now-Date.parse(date||"");return Number.isFinite(age)&&age>=-1800000&&age<=hours*3600000;
}
export function headlinePolicy(item){
 const t=String(item?.title||""),currency=CCYS.includes(item?.market)?item.market:null;
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
export function summarizeMacro(symbol,records,now=Date.now()){
 const chosen=[],seen=new Set();
 const valid=(records||[]).filter(x=>x.status==="ai-full-article"&&x.basis==="Isi artikel publik dari penerbit"&&recent(x.publishedAt,72,now))
 .sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
 for(const x of valid){
  const direction=pairDirection(symbol,x.currency,x.currencyBias),key=x.currency+":"+x.policyDirection;
  if(direction==="UNKNOWN"||seen.has(key))continue;
  seen.add(key);chosen.push({...x,direction});if(chosen.length>=4)break;
 }
 const buy=chosen.some(x=>x.direction==="BUY"),sell=chosen.some(x=>x.direction==="SELL");
 const bias=buy&&sell?"CONFLICT":buy?"BUY":sell?"SELL":"UNKNOWN";
 return {bias,verifiedCount:chosen.length,stories:chosen.map(x=>({
  title:x.title,url:x.url,publishedAt:x.publishedAt,summary:x.summary,
  currency:x.currency,policyDirection:x.policyDirection,pairDirection:x.direction
 })),message:!chosen.length?
 "Belum ada rilis baru yang selesai dianalisis dari isi aslinya. Arah harga H4 belum terkonfirmasi fundamental.":
 bias==="CONFLICT"?"Rilis terbaru memberikan arah yang saling bertentangan; jangan paksa satu posisi.":
 "Bukti berita terbaru cenderung mendukung "+bias+" "+symbol+"; tetap memerlukan konfirmasi harga."};
}
