/* Outbound-only WhatsApp group announcements.
 * Pure scheduling rules for one testing group, evaluated every four hours.
 * No inbound message processing or private subscriber delivery.
 */
export const VALID_PAIR=/^(?:XAUUSD|XAGUSD|BTCUSD|US30|US500|NASDAQ|(?:EUR|GBP|USD|AUD|NZD|CAD|CHF)(?:EUR|GBP|USD|JPY|CHF|CAD|AUD|NZD))$/;
export function pairList(raw){
 const values=String(raw||"XAUUSD").toUpperCase().split(",").map(x=>x.trim()).filter(x=>VALID_PAIR.test(x));
 return [...new Set(values)].slice(0,3);
}
export function jakartaWeek(utc=Date.now()){
 const date=new Date(utc);
 const parts=Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date).filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
 const d=new Date(Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day)));
 const shift=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-shift);
 return d.toISOString().slice(0,10);
}
const isPlan=p=>p?.status==="ready"&&["BUY","SELL"].includes(p.direction)&&
 [p.trigger,p.invalidation,p.objective,p.marketCondition?.h4Close].every(Number.isFinite)&&
 (p.direction==="BUY"?p.invalidation<p.trigger&&p.objective>p.trigger:p.invalidation>p.trigger&&p.objective<p.trigger);
export function chooseGroupUpdate({symbol,plan,previous=null,now=Date.now()}){
 const week=jakartaWeek(now);
 if(!plan||plan.status==="h4-unavailable"||plan.status==="stale-data"||plan.status==="source-unavailable"||plan.status==="error"){
  return {action:"skip",reason:"sumber harga belum dapat diverifikasi",week};
 }
 const active=isPlan(plan);
 if(!active){
  if(previous?.status==="active"&&previous?.week===week){
   return {action:"no-plan",reason:"analisa H4 kehilangan arah",week};
  }
  return {action:"skip",reason:"belum ada rencana baru yang terkonfirmasi",week};
 }
 if(!previous)return {action:"report",reason:"laporan pertama ke grup uji",week};
 const old=previous?.plan||{};
 if(old.direction&&old.direction!==plan.direction){
  return {action:"report",reason:"arah baru menggantikan rencana sebelumnya",week};
 }
 const close=plan.marketCondition.h4Close;
 const invalidated=previous.status==="active"&&Number.isFinite(old.invalidation)&&
   (old.direction==="BUY"?close<old.invalidation:close>old.invalidation);
 if(invalidated)return {action:"invalidated",reason:"candle H4 melampaui level batal rencana sebelumnya",week};
 if(previous.status==="invalidated"&&previous.week===week&&old.direction===plan.direction){
  return {action:"skip",reason:"rencana lama batal; menunggu pekan baru atau arah baru",week};
 }
 if(previous.week!==week)return {action:"report",reason:"ringkasan pekan baru",week};
 if(previous.status==="no-plan")return {action:"report",reason:"rencana H4 kembali tersedia",week};
 return {action:"skip",reason:"belum ada perubahan material; cegah pesan berulang",week};
}
export function savedState({action,week,plan,previous=null,now=Date.now()}){
 if(action==="skip")return previous;
 const p=plan&&["BUY","SELL"].includes(plan.direction)?plan:null;
 const old=previous?.plan;
 return {status:action==="invalidated"?"invalidated":action==="no-plan"?"no-plan":"active",
  week,updatedAt:new Date(now).toISOString(),plan:action==="invalidated"?old:p?{
   direction:p.direction,invalidation:p.invalidation,trigger:p.trigger,objective:p.objective,lastClosedAt:p.lastClosedAt
  }:null};
}
export function invalidatedText({symbol,previous,plan}){
 const old=previous?.plan;
 if(!old)return "Rencana sebelumnya perlu ditinjau ulang.";
 const price=Number(plan.marketCondition.h4Close).toLocaleString("id-ID",{maximumFractionDigits:5});
 return ["*KATARINA AI | PERINGATAN RENCANA BATAL*",
  "Instrumen: *"+symbol+"* · H4",
  "Rencana "+old.direction+" sebelumnya dinyatakan *BATAL* setelah penutupan H4 mencapai "+price+".",
  "Level pembatalan sebelumnya: "+old.invalidation+".",
  "KATARINA tidak menganggap arah lama masih aktif. Tunggu analisa baru sebelum membuat keputusan.",
  "Detail: https://katarina-research.pages.dev/research?symbol="+symbol,
  "Ini notifikasi evaluasi, bukan perintah transaksi."].join("\n");
}
export function noPlanText(symbol){
 return "*KATARINA AI | ANALISA DITUNDA*\n\n"+symbol+" · H4\nStruktur harga tidak lagi memberi satu arah yang layak. KATARINA menghentikan pengiriman rencana lama dan menunggu konfirmasi baru.\n\nhttps://katarina-research.pages.dev/research?symbol="+symbol;
}
