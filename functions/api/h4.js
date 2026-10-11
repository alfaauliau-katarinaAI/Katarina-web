/* Four-hour OHLC from hourly market candles. No synthetic D1-to-H4 interpolation.
 * Yahoo Finance (free public chart) is a reference data source, not executable broker prices. */
const LOOKUP={XAUUSD:"GC=F",XAGUSD:"SI=F",BTCUSD:"BTC-USD",US30:"^DJI",US500:"^GSPC",NASDAQ:"^IXIC"};
const PAIRS=new Set(["EUR","GBP","USD","JPY","CHF","CAD","AUD","NZD"]);
const result=(payload,code=200)=>new Response(JSON.stringify(payload),{status:code,headers:{"Content-Type":"application/json;charset=UTF-8","Cache-Control":"public,max-age=0,s-maxage=3600","Access-Control-Allow-Origin":"*"}});
const tf=4*3600;
const valid=id=>Object.hasOwn(LOOKUP,id)||id.length===6&&PAIRS.has(id.slice(0,3))&&PAIRS.has(id.slice(3))&&id.slice(0,3)!==id.slice(3);
async function fetchMarket(ticker){
 const encoded=encodeURIComponent(ticker);
 for(const hostname of ["query1.finance.yahoo.com","query2.finance.yahoo.com"]){
  try{
   const url="https://"+hostname+"/v8/finance/chart/"+encoded+"?interval=60m&range=1mo";
   const response=await fetch(url,{headers:{"User-Agent":"Mozilla/5.0 (compatible; KatarinaResearch/1.0)","Accept":"application/json"},signal:AbortSignal.timeout(8500)});
   if(!response.ok)continue;
   const d=await response.json(),r=d?.chart?.result?.[0];
   if(Array.isArray(r?.timestamp)&&r.timestamp.length>=180)return r;
  }catch{}
 }
 return null;
}
export async function onRequestGet({request}){
 const u=new URL(request.url),symbol=(u.searchParams.get("symbol")||"").toUpperCase();
 if(!valid(symbol))return result({schema:1,status:"invalid-symbol",symbol},400);
 const ticker=LOOKUP[symbol]||symbol+"=X";
 const key=new Request(new URL("/api/h4?symbol="+symbol+"&revision=2",u));
 try{const hit=await caches.default.match(key);if(hit)return hit}catch{}
 const source=await fetchMarket(ticker);
 if(!source)return result({schema:1,status:"source-unavailable",symbol,reason:"Candle H4 dari penyedia belum tersedia"},503);
 const quotes=source.indicators?.quote?.[0],timestamps=source.timestamp,bucket=new Map(),now=Math.floor(Date.now()/1000);
 if(!quotes?.open||!quotes?.high||!quotes?.low||!quotes?.close)return result({schema:1,status:"invalid-price-feed"},503);
 for(let i=0;i<timestamps.length;i++){
  const ts=Number(timestamps[i]),o=Number(quotes.open[i]),h=Number(quotes.high[i]),l=Number(quotes.low[i]),c=Number(quotes.close[i]);
  if(![ts,o,h,l,c].every(Number.isFinite)||o<=0||c<=0||h<l||h<Math.max(o,c)||l>Math.min(o,c)||ts>now+3600)continue;
  const stamp=Math.floor(ts/tf)*tf;
  if(stamp+tf>now)continue; // current H4 candle is still forming
  const old=bucket.get(stamp);
  if(!old)bucket.set(stamp,{ts:stamp,o,h,l,c,count:1});
  else{old.h=Math.max(old.h,h);old.l=Math.min(old.l,l);old.c=c;old.count++}
 }
 const bars=[...bucket.values()].sort((a,b)=>a.ts-b.ts).filter(x=>x.count>=2).map(x=>[x.ts,x.o,x.h,x.l,x.c]);
 if(bars.length<54)return result({schema:1,status:"not-enough-h4",symbol,count:bars.length},503);
 const last=bars.at(-1),ageHours=(now-last[0]-tf)/3600;
 const date=new Date(last[0]*1000).toISOString(),isProxy=["XAUUSD","XAGUSD","US30","US500","NASDAQ"].includes(symbol);
 const obj={schema:1,status:"ready",symbol,timeframe:"H4",source:"Yahoo Finance · hourly-to-four-hour UTC aggregation",ticker,proxy:isProxy,proxyNote:isProxy?"Harga acuan futures/indeks. Bisa berbeda dari harga spot/CFD pada TradingView dan broker.":"Harga referensi pasar, tidak selalu sama dengan broker.",lastClosedAt:date,ageHours:Number(ageHours.toFixed(1)),bars:bars.slice(-155)};
 const reply=result(obj);
 try{await caches.default.put(key,reply.clone())}catch{}
 return reply;
}
