/* One source-specific deep brief for ANY headline in the current feeds.
 * News is never selected by a caller-provided URL; compare the expected URL
 * to prevent silent reindexing when the upstream feed refreshes.
 * Cache key follows article URL, so dashboard and all pairs reuse one analysis.
 */
import {onRequestGet as hotNews} from "./hot-news.js";
import {onRequestGet as pairNews} from "./pair-news.js";
import {analyzeItem,pairView} from "./policy-brief.js";
import {publicAIKey,readPublicAI,writePublicAI} from "../../lib/public-ai-cache.js";
const HOSTS=new Set(["www.rba.gov.au","www.snb.ch","www.boj.or.jp","www.federalreserve.gov",
 "www.ecb.europa.eu","www.bankofengland.co.uk","www.bankofcanada.ca","www.cnbc.com","www.bls.gov","www.bea.gov"]);
const allowedSymbol=/^(?:XAUUSD|XAGUSD|BTCUSD|US30|US500|NASDAQ|(?:EUR|GBP|USD|AUD|NZD|CAD|CHF)(?:EUR|GBP|USD|JPY|CHF|CAD|AUD|NZD))$/;
const json=(v,status=200,ttl=0)=>new Response(JSON.stringify(v),{status,headers:{
 "Content-Type":"application/json;charset=utf-8","Cache-Control":ttl?"public,max-age=0,s-maxage="+ttl:"no-store",
 "X-Content-Type-Options":"nosniff"}});
export async function onRequestGet({request,env}){
 const u=new URL(request.url),scope=u.searchParams.get("scope")==="pair"?"pair":"dashboard";
 const symbol=(u.searchParams.get("symbol")||"XAUUSD").toUpperCase();
 const rawIndex=u.searchParams.get("index"),index=Number(rawIndex);
 if(rawIndex===null||!Number.isInteger(index)||index<0||index>29||
 (scope==="pair"&&(!allowedSymbol.test(symbol)||index>21)))return json({status:"invalid-parameters"},400);
 let feed;
 try{
  const path=scope==="pair"?"/api/pair-news?symbol="+encodeURIComponent(symbol):"/api/hot-news";
  const r=scope==="pair"?
   await pairNews({request:new Request(new URL(path,u)),env}):
   await hotNews({request:new Request(new URL(path,u)),env});
  if(!r.ok)return json({status:"feed-unavailable"},503);
  feed=await r.json();
 }catch{return json({status:"feed-unavailable"},503)}
 const item=feed?.items?.[index];
 if(!item?.url||!item.title)return json({status:"article-not-found"},404);
 const expected=u.searchParams.get("expected");
 if(!expected||expected!==item.url)return json({status:"headline-changed",reason:"Daftar berita diperbarui. Buka kembali judul untuk memastikan artikel cocok."},409);
 let uri;try{uri=new URL(item.url)}catch{return json({status:"invalid-source"},400)}
 if(uri.protocol!=="https:"||!HOSTS.has(uri.hostname))return json({status:"source-not-supported",
  url:item.url,reason:"Sumber ini belum mendukung pembacaan isi secara penuh. Silakan baca sumber aslinya."},200);
 const cacheKey=new Request(new URL("/api/news-intelligence?article="+encodeURIComponent(item.url)+"&v=3",u).toString());
 try{const hit=await caches.default.match(cacheKey);if(hit){
  const content=await hit.json();return json(pairView(content,symbol),200,900);
 }}catch{}
 const key=await publicAIKey("policy:v3",item.url);
 const cached=await readPublicAI(env,key,21600000,
  x=>x.status==="ai-full-article"&&x.url===item.url&&x.basis==="Isi artikel publik dari penerbit"&&typeof x.summary==="string"&&Array.isArray(x.keyFacts)&&Array.isArray(x.marketEffects)&&typeof x.macroMechanism==="string");
 if(cached){
  const response=json(pairView(cached,symbol),200,900);
  try{await caches.default.put(cacheKey,json(cached,200,900))}catch{}
  return response;
 }
 const response=await analyzeItem({item,env,symbol});
 if(!response.ok)return response;
 const payload=await response.json();
 if(payload.status!=="ai-full-article")return json(payload,200,0);
 const {symbol:_symbol,pairDirection:_pairDirection,pairMessage:_pairMessage,...stored}=payload;
 // Only valid publisher-backed analyses may be shared; no template or error caching.
 await writePublicAI(env,key,stored,21600);
 try{await caches.default.put(cacheKey,json(stored,200,900))}catch{}
 return json(payload,200,900);
}
