/* Official bank news by symbol, priority weights genuinely differ per selected currency. */
const DEFS={
 USD:["Fed","https://www.federalreserve.gov/feeds/press_monetary.xml","www.federalreserve.gov"],
 JPY:["Bank of Japan","https://www.boj.or.jp/en/rss/whatsnew.xml","www.boj.or.jp"],
 EUR:["ECB","https://www.ecb.europa.eu/rss/press.html","www.ecb.europa.eu"],
 GBP:["Bank of England","https://www.bankofengland.co.uk/rss/news","www.bankofengland.co.uk"],
 CAD:["Bank of Canada","https://www.bankofcanada.ca/feed/","www.bankofcanada.ca"]
};
const VALID=/^(?:XAUUSD|XAGUSD|BTCUSD|US30|US500|NASDAQ|(?:EUR|GBP|USD|AUD|NZD|CAD|CHF)(?:EUR|GBP|USD|JPY|CHF|CAD|AUD|NZD))$/;
function plain(x){return String(x||"").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi,"$1").replace(/<[^>]*>/g," ").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/\s+/g," ").trim()}
function tag(item,k){const m=item.match(new RegExp("<"+k+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/"+k+"\\s*>","i"));return m?plain(m[1]):""}
async function feed(def){
 const [currency,url,host]=def;const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),8500);
 try{
  const r=await fetch(url,{signal:ctrl.signal,cf:{cacheTtl:900}});if(!r.ok)return[];
  const xml=(await r.text()).slice(0,350000);const records=xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item\s*>/gi)||[];
  const items=[];
  for(const item of records.slice(0,35)){
   const title=tag(item,"title"),raw=tag(item,"link"),pub=tag(item,"pubDate")||tag(item,"dc:date");
   if(title.length<15||title.length>220)continue;
   let u;try{u=new URL(raw)}catch{continue}
   if(u.protocol!=="https:"||!u.hostname.endsWith(host.replace(/^www\./,""))||u.hostname.includes("evil"))continue;
   const t=Date.parse(pub);if(!Number.isFinite(t)||Date.now()-t>10*86400000||t>Date.now()+1800000)continue;
   items.push({title,url:u.href,publishedAt:new Date(t).toISOString(),source:currency,market:currency});
  }return items;
 }catch{return []}finally{clearTimeout(timer)}
}
export async function onRequestGet({request}){
 const u=new URL(request.url),symbol=(u.searchParams.get("symbol")||"").toUpperCase();
 if(!VALID.test(symbol))return new Response(JSON.stringify({status:"invalid-symbol"}),{status:400,headers:{"Content-Type":"application/json"}});
 const cacheKey=new Request(new URL("/api/pair-news?symbol="+symbol,u));
 try{const hit=await caches.default.match(cacheKey);if(hit)return hit}catch{}
 const currencies=symbol==="XAUUSD"||symbol==="XAGUSD"||symbol==="BTCUSD"||["US30","US500","NASDAQ"].includes(symbol)?["USD"]:symbol.length===6?[symbol.slice(0,3),symbol.slice(3)]:["USD"];
 const selected=[...new Set(currencies.filter(x=>DEFS[x]))].map(x=>[x,...DEFS[x].slice(1)]);
 const all=(await Promise.all(selected.map(feed))).flat().sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
 const seen=new Set(),unique=all.filter(x=>{if(seen.has(x.url))return false;seen.add(x.url);return true}).slice(0,12);
 const res=new Response(JSON.stringify({schema:1,status:unique.length?"official-updates":"no-relevant-official-release",symbol,items:unique,sourcePolicy:"official-central-bank-headlines"}),{headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"public, max-age=0, s-maxage=900"}});
 try{await caches.default.put(cacheKey,res.clone())}catch{}
 return res;
}