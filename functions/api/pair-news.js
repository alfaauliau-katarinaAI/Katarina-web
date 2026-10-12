import {onRequestGet as marketHeadlines} from "./hot-news.js";
import {headlinePolicy} from "../../lib/macro-policy.js";
/* Official bank news by symbol, priority weights genuinely differ per selected currency. */
const DEFS={
 USD:["Fed","https://www.federalreserve.gov/feeds/press_monetary.xml","www.federalreserve.gov"],
 JPY:["Bank of Japan","https://www.boj.or.jp/en/rss/whatsnew.xml","www.boj.or.jp"],
 AUD:["RBA","https://www.rba.gov.au/rss/rss-cb-media-releases.xml","www.rba.gov.au"],
 CHF:["SNB","https://www.snb.ch/public/rss/en/mopo","www.snb.ch"],
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
  const r=await fetch(url,{signal:ctrl.signal,cf:{cacheTtl:180}});if(!r.ok)return[];
  const xml=(await r.text()).slice(0,350000);const records=xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item\s*>/gi)||[];
  const items=[];
  for(const item of records.slice(0,35)){
   const title=tag(item,"title"),raw=tag(item,"link"),pub=tag(item,"pubDate")||tag(item,"dc:date");
   if(title.length<15||title.length>220)continue;
   let u;try{u=new URL(raw)}catch{continue}
   // Some official BoJ feeds publish http links; upgrade the known institutional host.
   if(u.protocol==="http:"&&u.hostname===host)u.protocol="https:";
   if(u.protocol!=="https:"||!(u.hostname===host||u.hostname==="www."+host.replace(/^www\./,""))||u.hostname.includes("evil"))continue;
   // Avoid banknote artwork, technology notices, and unrelated releases.
   if(!/policy|monetary|econom|inflation|interest|rates?|yen|bond|stability|outlook|meeting|minutes|survey|tankan|growth|forecast|financial stability|statement|speech|consumer|employment|wages?|liquidity|regional economic report|financial markets|exchange rates?/i.test(title)||/banknotes?|animal|cloud outage|eligible collateral|amounts outstanding|bank of japan accounts|website|recruitment|competition|anniversary|lecture|museum|internship|system maintenance/i.test(title))continue;
   const t=Date.parse(pub);if(!Number.isFinite(t)||Date.now()-t>10*86400000||t>Date.now()+1800000)continue;
   items.push({title,url:u.href,publishedAt:new Date(t).toISOString(),source:currency,market:currency});
  }return items;
 }catch{return []}finally{clearTimeout(timer)}
}
export async function onRequestGet({request,env}){
 const u=new URL(request.url),symbol=(u.searchParams.get("symbol")||"").toUpperCase();
 if(!VALID.test(symbol))return new Response(JSON.stringify({status:"invalid-symbol"}),{status:400,headers:{"Content-Type":"application/json"}});
 const cacheKey=new Request(new URL("/api/pair-news?symbol="+symbol+"&revision=coverage-v7",u));
 try{const hit=await caches.default.match(cacheKey);if(hit)return hit}catch{}
 const currencies=symbol==="XAUUSD"||symbol==="XAGUSD"||symbol==="BTCUSD"||["US30","US500","NASDAQ"].includes(symbol)?["USD"]:symbol.length===6?[symbol.slice(0,3),symbol.slice(3)]:["USD"];
 const selected=[...new Set(currencies.filter(x=>DEFS[x]))].map(x=>[x,...DEFS[x].slice(1)]);
 const bank=(await Promise.all(selected.map(feed))).flat();
 // Headlines are references, not republished article content.
 const words={
 USD:/\b(fed|fomc|powell|dollar|treasury|u\.s\.|united states|us inflation|cpi|nfp|payroll|yields?|wall street|american economy)\b/i,
 JPY:/\b(japan|japanese|yen|boj|tokyo|ueda|jgb|intervention)\b/i,
 EUR:/\b(euro|europe|ecb|lagarde|eu zone|european|germany|france|eurozone)\b/i,
 GBP:/\b(britain|british|uk|sterling|pound|boe|bank of england|gilt)\b/i,
 CAD:/\b(canada|canadian|cad|oil|crude|boc|bank of canada)\b/i,
 AUD:/\b(australia|australian|aussie|rba|china|iron ore)\b/i,
 NZD:/\b(new zealand|kiwi|rbnz|dairy)\b/i,
 CHF:/\b(swiss|switzerland|snb|franc)\b/i
 };
 const topics={
 XAUUSD:/\b(gold|bullion|precious metal|real yield|treasury|fed|dollar|inflation|geopolitic|iran|russia)\b/i,
 XAGUSD:/\b(silver|industrial metal|copper|gold|metals|treasury|fed|china)\b/i,
 BTCUSD:/\b(bitcoin|crypto|digital assets?|etf|liquidity|fed)\b/i,
 US30:/\b(dow|wall street|stocks?|equities|jpmorgan|banks?|fed|earnings|treasury)\b/i,
 US500:/\b(s&p|stocks?|equities|wall street|inflation|earnings|treasury|fed)\b/i,
 NASDAQ:/\b(nasdaq|tech|ai|chip|semiconductor|stocks?|earnings|treasury)\b/i
 };
 const paired=(symbol.length===6&&!topics[symbol])?[symbol.slice(0,3),symbol.slice(3)]:["USD"];
 const matched=[];
 try{
 const mr=await marketHeadlines({request:new Request(new URL("/api/hot-news",u).toString()),env});
 if(mr.ok){const news=await mr.json();for(const article of news.items||[]){
 const title=String(article.title||"");
 let strength=0,match=[];
 for(const cur of paired){if(words[cur]?.test(title)){strength+=3;match.push(cur)}}
 if(topics[symbol]?.test(title))strength+=5;
 if(/\b(fed|fomc|inflation|cpi|ppi|interest rates?|central banks?|nonfarm payrolls?|tariffs?)\b/i.test(title))strength+=1;
 if(strength<3)continue;
 const reason=match.length?"Penting untuk "+symbol+" karena berkaitan dengan "+match.join(" dan ")+".":"Berpotensi memengaruhi "+symbol+" melalui perubahan kebijakan, likuiditas atau selera risiko.";
 matched.push({...article,market:null,relevance:strength,relevanceNote:reason+" Arah harga perlu dikonfirmasi dari reaksi pasar."});
 }}
 }catch{}
 bank.sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
 matched.sort((a,b)=>b.relevance-a.relevance||Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
 const all=[...matched.slice(0,14),...bank.slice(0,10)];
 const seen=new Set(),unique=all.filter(x=>{if(seen.has(x.url))return false;seen.add(x.url);return true}).slice(0,22).map(x=>({...x,policyHeadline:headlinePolicy(x)}));

 const res=new Response(JSON.stringify({schema:1,status:unique.length?"official-updates":"no-relevant-official-release",symbol,items:unique,sourcePolicy:"sourced-market-headlines-and-official-central-bank-releases"}),{headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"public, max-age=0, s-maxage=180"}});
 try{await caches.default.put(cacheKey,res.clone())}catch{}
 return res;
}