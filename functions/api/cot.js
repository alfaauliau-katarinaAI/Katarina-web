/* CFTC sourced COT positioning, no fabricated reports. Futures proxies, not spot positions. */
const KEYS={EUR:"EURO FX",GBP:"BRITISH POUND",JPY:"JAPANESE YEN",CHF:"SWISS FRANC",CAD:"CANADIAN DOLLAR",AUD:"AUSTRALIAN DOLLAR",NZD:"NEW ZEALAND DOLLAR"};
const ID=/^(?:XAUUSD|XAGUSD|BTCUSD|US30|US500|NASDAQ|(?:EUR|GBP|USD|AUD|NZD|CAD|CHF)(?:EUR|GBP|USD|JPY|CHF|CAD|AUD|NZD))$/;
const json=(p,s=200)=>new Response(JSON.stringify(p),{status:s,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":s===200?"public,max-age=0,s-maxage=21600":"no-store"}});
async function query(ccy){
 const contract=KEYS[ccy];if(!contract)return null;
 const url=new URL("https://publicreporting.cftc.gov/resource/gpe5-46if.json");
 url.searchParams.set("$where","contract_market_name = '"+contract+"'");
 url.searchParams.set("$order","report_date_as_yyyy_mm_dd DESC");
 url.searchParams.set("$limit","3");
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),9500);
 try{
 const res=await fetch(url,{signal:ctrl.signal,headers:{"Accept":"application/json"},cf:{cacheTtl:21600}});
 if(!res.ok)return null;
 const rows=await res.json();
 if(!Array.isArray(rows))return null;
 const row=rows.find(x=>x.contract_market_name===contract&&/CHICAGO MERCANTILE EXCHANGE/.test(x.market_and_exchange_names||""));
 if(!row)return null;
 const date=String(row.report_date_as_yyyy_mm_dd||"").slice(0,10);
 const lng=Number(row.lev_money_positions_long),sht=Number(row.lev_money_positions_short),oi=Number(row.open_interest_all);
 if(!/^\d{4}-\d\d-\d\d$/.test(date)||![lng,sht,oi].every(Number.isFinite)||oi<=0)return null;
 const timestamp=Date.parse(date+"T00:00:00Z");if(!Number.isFinite(timestamp)||Date.now()-timestamp>28*86400000)return null;
 return {currency:ccy,contract,asOf:date,netContracts:lng-sht,longContracts:lng,shortContracts:sht,openInterest:oi,netPctOI:Number(((lng-sht)/oi*100).toFixed(2)),meaning:(lng-sht)>0?"bersih beli":(lng-sht)<0?"bersih jual":"seimbang"};
 }catch{return null}finally{clearTimeout(timer)}
}
export async function onRequestGet({request}){
 const u=new URL(request.url),symbol=(u.searchParams.get("symbol")||"").toUpperCase();
 if(!ID.test(symbol))return json({schema:1,status:"invalid-symbol"},400);
 const cached=new Request(new URL("/api/cot?symbol="+symbol,u).toString());
 try{const hit=await caches.default.match(cached);if(hit)return hit}catch{}
 const parts=symbol.length===6&&!["XAUUSD","XAGUSD","BTCUSD","NASDAQ"].includes(symbol)?[symbol.slice(0,3),symbol.slice(3)]:[];
 const curr=[...new Set(parts.filter(x=>KEYS[x]))];
 const values=(await Promise.all(curr.map(query))).filter(Boolean);
 const payload={schema:1,symbol,status:values.length?"official-futures":"unavailable",source:"CFTC · Traders in Financial Futures · Futures Only",sourceUrl:"https://publicreporting.cftc.gov/resource/gpe5-46if.json",data:values,note:"Data posisi leveraged money futures mingguan, bukan volume spot forex atau bukti prediksi arah. Untuk pasangan silang, baca mata uang dasar dan kuotasi secara relatif."};
 const res=json(payload);try{await caches.default.put(cached,res.clone())}catch{}
 return res;
}