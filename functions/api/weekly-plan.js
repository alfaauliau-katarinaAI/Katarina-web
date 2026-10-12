/* Single-direction weekly H4 plan: H4 trend decides the conditional side.
 * News and COT add context; neither are converted into made-up probabilities.
 */
import {onRequestGet as getH4} from "./h4.js";
import {onRequestGet as getCOT} from "./cot.js";
import {onRequestGet as getNews} from "./pair-news.js";
const OUT=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{"Content-Type":"application/json;charset=UTF-8","Cache-Control":"public,max-age=0,s-maxage=3600"}});
const ALLOWED=/^(?:XAUUSD|XAGUSD|BTCUSD|US30|US500|NASDAQ|(?:EUR|GBP|USD|AUD|NZD|CAD|CHF)(?:EUR|GBP|USD|JPY|CHF|CAD|AUD|NZD))$/;
function ema(xs,n){let a=xs.slice(0,n).reduce((s,x)=>s+x,0)/n,k=2/(n+1);for(let i=n;i<xs.length;i++)a=xs[i]*k+a*(1-k);return a}
function rsi(xs){let plus=0,minus=0;const a=xs.slice(-15);for(let i=1;i<a.length;i++){const d=a[i]-a[i-1];if(d>=0)plus+=d;else minus-=d}return minus===0?100:100-100/(1+plus/minus)}
function getJSON(response){return response?.ok?response.json().catch(()=>null):Promise.resolve(null)}
const round=(x,s)=>Number(x.toFixed(s.endsWith("JPY")?3:/^(EUR|GBP|USD|AUD|NZD|CAD|CHF)[A-Z]{3}$/.test(s)?5:2));
export async function onRequestGet({request}){
 const url=new URL(request.url),symbol=String(url.searchParams.get("symbol")||"").toUpperCase();
 if(!ALLOWED.test(symbol))return OUT({schema:1,status:"invalid-symbol"},400);
 const key=new Request(new URL("/api/weekly-plan?symbol="+symbol+"&revision=4",url));
 try{const saved=await caches.default.match(key);if(saved)return saved}catch{}
 const req=path=>new Request(new URL(path,url).toString());
 const h4=await getJSON(await getH4({request:req("/api/h4?symbol="+symbol)}));
 if(!h4||h4.status!=="ready")return OUT({schema:1,status:"h4-unavailable",symbol,timeframe:"H4",message:"Belum ada candle H4 tepercaya untuk menyusun satu arah analisa. Grafik pasar tetap bisa dibuka."},503);
 const bars=h4.bars,prices=bars.map(x=>x[4]),close=prices.at(-1);
 const maxAge=symbol==="BTCUSD"?20:120;
 if(h4.ageHours>maxAge)return OUT({schema:1,status:"stale-data",symbol,timeframe:"H4",lastClosedAt:h4.lastClosedAt,message:"Candle H4 sudah terlalu lama. KATARINA menunda keputusan arah sampai datanya segar."},503);
 const e20=ema(prices,20),e50=ema(prices,50),momentum=rsi(prices),previous=bars.slice(-14,-1);
 const upper=Math.max(...previous.map(x=>x[2])),lower=Math.min(...previous.map(x=>x[3]));
 const atr=bars.slice(-15).reduce((sum,b,i,arr)=>{if(i===0)return sum;const y=arr[i-1][4];return sum+Math.max(b[2]-b[3],Math.abs(b[2]-y),Math.abs(b[3]-y))},0)/14;
 const last6=prices.at(-1)-prices.at(-7);
 const score=(close>e20?1:-1)+(e20>e50?1:-1)+(momentum>=52?1:momentum<=48?-1:0)+(last6>=0?1:-1);
 const direction=score>=2?"BUY":score<=-2?"SELL":null;
 const [cotResponse,newsResponse]=await Promise.allSettled([getCOT({request:req("/api/cot?symbol="+symbol)}),getNews({request:req("/api/pair-news?symbol="+symbol)})]);
 const cotData=cotResponse.status==="fulfilled"?await getJSON(cotResponse.value):null;
 const newsData=newsResponse.status==="fulfilled"?await getJSON(newsResponse.value):null;
 const news=(newsData?.items||[]).filter(x=>x.url&&x.title).slice(0,4).map(x=>({title:x.title,url:x.url,source:x.source,publishedAt:x.publishedAt,relevanceNote:x.relevanceNote||null}));
 const contracts=cotData?.data||[],contractMap=new Map(contracts.map(x=>[x.currency,x])),base=symbol.slice(0,3),quote=symbol.slice(3);
 let cotNote="Belum ada COT yang cukup untuk mengonfirmasi posisi spekulatif pasangan ini.",cotBias=null;
 const metal=contractMap.get(symbol==="XAUUSD"?"GOLD":symbol==="XAGUSD"?"SILVER":"");
 if(metal){cotBias=metal.netContracts>0?"BUY":"SELL";cotNote="Posisi managed money "+metal.contract+" tercatat "+(metal.netContracts>0?"beli bersih":"jual bersih")+". Data futures mingguan ini bukan sinyal otomatis."}
 else{
  const left=contractMap.get(base),right=contractMap.get(quote);
  if(left&&right){const spread=left.netPctOI-right.netPctOI;cotBias=spread>1?"BUY":spread< -1?"SELL":null;cotNote="Posisi futures "+base+" relatif terhadap "+quote+" memiliki selisih "+Number(spread.toFixed(1))+" poin persentase open interest; "+(cotBias===null?"belum ada arah COT yang tegas.":cotBias==="BUY"?"cenderung mendukung mata uang depan.":"cenderung mendukung mata uang belakang.")}
  else if(left||right){const x=left||right;const relative=left?x.netContracts:-x.netContracts;cotBias=relative>0?"BUY":relative<0?"SELL":null;cotNote="Yang tersedia baru COT "+x.currency+", jadi gambaran pair belum lengkap. "+x.currency+" tercatat "+(x.netContracts>0?"beli bersih.":"jual bersih.")}
 }
 const marketCondition={ema20:round(e20,symbol),ema50:round(e50,symbol),rsi14:Number(momentum.toFixed(1)),atr14:round(atr,symbol),h4Close:round(close,symbol),lastH4ChangePct:Number(((close/prices.at(-2)-1)*100).toFixed(2)),last6H4Change:round(last6,symbol)};
 if(!direction)return OUT({schema:1,status:"no-clear-direction",symbol,timeframe:"H4",source:h4.source,ticker:h4.ticker,proxy:h4.proxy,proxyNote:h4.proxyNote,lastClosedAt:h4.lastClosedAt,marketCondition,cotNote,news,message:"Sinyal H4 belum searah. KATARINA tidak memaksakan BUY atau SELL ketika kondisinya belum jelas."});
 const trigger=direction==="BUY"?upper:lower,invalid=direction==="BUY"?lower:upper,target=direction==="BUY"?trigger+atr*1.6:trigger-atr*1.6;
 const trend=direction==="BUY"?"Fokus cari penguatan":"Fokus cari pelemahan",biasStrength=Math.abs(score)>=3?"cukup sejalan":"masih perlu konfirmasi";
 const signalCondition=direction==="BUY"?"H4 tutup di atas "+round(upper,symbol)+" lalu bertahan saat pengujian ulang.":"H4 tutup di bawah "+round(lower,symbol)+" lalu gagal kembali ke atasnya.";
 const invalidation=direction==="BUY"?"Rencana BUY batal bila candle H4 ditutup di bawah "+round(invalid,symbol)+".":"Rencana SELL batal bila candle H4 ditutup di atas "+round(invalid,symbol)+".";
 const reasons=[
  "EMA 20 H4 "+(e20>e50?"berada di atas":"berada di bawah")+" EMA 50.",
  "Harga terakhir "+(close>=e20?"di atas":"di bawah")+" EMA 20.",
  "RSI H4 "+momentum.toFixed(1)+" dan perubahan enam candle "+(last6>=0?"positif":"negatif")+"."
 ];
 const plan={schema:1,status:"ready",symbol,timeframe:"H4",direction,trend,biasStrength,score,source:h4.source,ticker:h4.ticker,proxy:h4.proxy,proxyNote:h4.proxyNote,lastClosedAt:h4.lastClosedAt,ageHours:h4.ageHours,marketCondition,
  trigger:round(trigger,symbol),invalidation:round(invalid,symbol),objective:round(target,symbol),atr:round(atr,symbol),
  condition:signalCondition,invalidText:invalidation,reasons,cotBias,cotNote,cotAlignment:cotBias===null?"belum terkonfirmasi":cotBias===direction?"searah":"berbeda dari arah utama",
  news,newsInterpretation:"Berita menjadi konteks, bukan bukti langsung arah harga. Periksa rilis dan reaksi yield serta pasangan mata uang setelah pengumuman.",disclaimer:"Ini rencana bersyarat berbasis candle H4 dan data publik, bukan sinyal eksekusi atau jaminan hasil. Jika level pembatalan ditembus dengan penutupan H4, rencana dinyatakan gagal; jangan memaksakan arah lama."};
 const response=OUT(plan);
 try{await caches.default.put(key,response.clone())}catch{}
 return response;
}
