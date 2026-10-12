/* KATARINA cloud autonomous engine: scheduled news collection and H4 snapshots.
 * Free-tier budget: 2 RSS sources/minute, 3 pairs/minute only after each H4 close.
 * No external paid APIs, WhatsApp messages, trades, or AI calls.
 */
const FEEDS=[
 ["CNBC Pasar","https://www.cnbc.com/id/10000664/device/rss/rss.html","www.cnbc.com"],
 ["CNBC Dunia","https://www.cnbc.com/id/100727362/device/rss/rss.html","www.cnbc.com"],
 ["CNBC Ekonomi","https://www.cnbc.com/id/20910258/device/rss/rss.html","www.cnbc.com"],
 ["CNBC Bisnis","https://www.cnbc.com/id/10001147/device/rss/rss.html","www.cnbc.com"],
 ["CNBC Asia","https://www.cnbc.com/id/19832390/device/rss/rss.html","www.cnbc.com"],
 ["CNBC Eropa","https://www.cnbc.com/id/19794221/device/rss/rss.html","www.cnbc.com"],
 ["CNBC Utama","https://www.cnbc.com/id/100003114/device/rss/rss.html","www.cnbc.com"],
 ["CNBC Politik","https://www.cnbc.com/id/10000113/device/rss/rss.html","www.cnbc.com"],
 ["Federal Reserve","https://www.federalreserve.gov/feeds/press_monetary.xml","www.federalreserve.gov"],
 ["BLS","https://www.bls.gov/feed/bls_latest.rss","www.bls.gov"]
];
const PAIRS=[
 "XAUUSD","USDJPY","EURUSD","GBPUSD","AUDUSD","USDCAD","USDCHF","NZDUSD","EURGBP","EURJPY","EURCHF","EURCAD",
 "EURAUD","EURNZD","GBPJPY","GBPCHF","GBPCAD","GBPAUD","GBPNZD","AUDJPY","AUDCAD","AUDCHF","AUDNZD","CADJPY",
 "CADCHF","CHFJPY","NZDJPY","NZDCAD","NZDCHF","XAGUSD","BTCUSD","US30","US500","NASDAQ"
];
const TOPIC=/\b(fed|federal reserve|fomc|rates?|bond|treasur|inflation|cpi|ppi|nfp|oil|crude|energy|gold|silver|dollar|forex|currency|yen|euro|pound|market|wall street|stock|nasdaq|dow|geopolitic|iran|saudi|china|tariff|commodit|payroll|employment|central bank|crypto|bitcoin|debt|yield|banks|econom|recession|interest|imf)\b/i;
function clean(text){return String(text||"").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi,"$1").replace(/<[^>]*>/g," ").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&(amp|quot|apos|lt|gt);/gi,(_,x)=>({amp:"&",quot:'"',apos:"'",lt:"<",gt:">"}[x.toLowerCase()]||" ")).replace(/\s+/g," ").trim()}
function field(item,key){const m=item.match(new RegExp("<"+key+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/"+key+"\\s*>","i"));return m?clean(m[1]):""}
function topic(title){if(/gold|silver/i.test(title))return "Emas / Logam";if(/oil|energy|war|iran|saudi/i.test(title))return "Energi / Geopolitik";if(/bitcoin|crypto/i.test(title))return "Kripto";if(/yen|euro|dollar|currency|forex/i.test(title))return "Valas";if(/inflation|fed|rate|bond|treasury|yield|payroll/i.test(title))return "Suku Bunga / Inflasi";return "Pasar Global"}
export function parseRSS(xml,definition,now){
 const [source,,host]=definition;
 const chunks=String(xml||"").match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item\s*>/gi)||[],found=[];
 for(const item of chunks.slice(0,30)){
  const title=field(item,"title"),raw=field(item,"link"),date=Date.parse(field(item,"pubDate"));
  if(title.length<24||title.length>215||!TOPIC.test(title)||!Number.isFinite(date)||date>now+1800000||now-date>72*3600000)continue;
  let u;try{u=new URL(raw)}catch{continue}
  if(u.protocol!=="https:"||u.hostname!==host)continue;
  u.hash="";u.search="";
  found.push({url:u.href,title,source,publishedAt:new Date(date).toISOString(),category:topic(title)});
  if(found.length>=14)break;
 }
 return found;
}
async function collectOne(def,env,now){
 let r;try{r=await fetch(def[1],{headers:{"Accept":"application/rss+xml,application/xml,text/xml"},cf:{cacheTtl:120},signal:AbortSignal.timeout(8500)})}catch{return 0}
 if(!r?.ok)return 0;
 const xml=(await r.text()).slice(0,300000),items=parseRSS(xml,def,now);
 if(!items.length)return 0;
 let count=0;
 // Read existing URLs first: duplicates should not consume D1 write quotas.
 const ids=items.map(x=>x.url);
 const placeholders=ids.map(()=>"?").join(",");
 const exists=await env.DB.prepare("SELECT url FROM headlines WHERE url IN ("+placeholders+")").bind(...ids).all();
 const known=new Set((exists.results||[]).map(x=>x.url));
 for(const row of items.filter(x=>!known.has(x.url)).slice(0,12)){
  const done=await env.DB.prepare("INSERT OR IGNORE INTO headlines(url,title,source,published_at,category,collected_at) VALUES(?,?,?,?,?,?)").bind(row.url,row.title,row.source,row.publishedAt,row.category,new Date(now).toISOString()).run();
  if(done.success)count++;
 }
 return count;
}
async function snapshotOne(symbol,env,now){
 let obj;
 try{
  const r=await fetch("https://katarina-research.pages.dev/api/weekly-plan?symbol="+symbol,{signal:AbortSignal.timeout(23000)});
  if(!r.ok)return false;
  obj=await r.json();
 }catch{return false}
 if(!obj?.lastClosedAt||!["ready","no-clear-direction"].includes(obj.status))return false;
 if(Date.parse(obj.lastClosedAt)<now-120*3600000)return false;
 const exists=await env.DB.prepare("SELECT 1 FROM h4_analyses WHERE symbol=? AND last_closed_at=?").bind(symbol,obj.lastClosedAt).first();
 if(exists)return false;
 const fields=[symbol,obj.lastClosedAt,obj.status,obj.direction||null,Number.isFinite(obj.trigger)?obj.trigger:null,Number.isFinite(obj.invalidation)?obj.invalidation:null,Number.isFinite(obj.objective)?obj.objective:null,obj.source||"",new Date(now).toISOString(),JSON.stringify({
  marketCondition:obj.marketCondition||null,cotNote:obj.cotNote||null,cotAlignment:obj.cotAlignment||null,
  reasons:obj.reasons||[],news:obj.news||[],proxy:obj.proxy||false,condition:obj.condition||null,invalidText:obj.invalidText||null
 })];
 await env.DB.prepare("INSERT OR IGNORE INTO h4_analyses(symbol,last_closed_at,status,direction,trigger,invalidation,objective,source,recorded_at,evidence_json) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(...fields).run();
 return true;
}

/* Low-frequency prewarming of fresh policy releases. Existing scheduled Worker
 * + KV only; no new cron, no paid services. At most 8 model-bearing
 * attempts/day account-wide; no inference on repeated content.
 */
/* Work through ALL public headlines over time, not only the first two articles
 * or a particular currency pair. One inference per 15-min cycle max.
 * Account-wide AI free quota is shared; no paid fallback / GPU.
 */
export async function prewarmPublicNews(env,now,fetcher=fetch){
 if(!env?.CACHE?.get||!env?.CACHE?.put)return "no-kv";
 const day=new Date(now).toISOString().slice(0,10),counter="intel:daily:"+day,limit=48;
 try{
  const used=Number(await env.CACHE.get(counter)||0);
  if(used>=limit)return "daily-cap";
  const r=await fetcher("https://katarina-research.pages.dev/api/hot-news",
   {signal:AbortSignal.timeout(9000)});
  if(!r.ok)return "source-down";
  const feed=await r.json(),items=(feed.items||[]).slice(0,30);
  for(let index=0;index<items.length;index++){
   const item=items[index],age=now-Date.parse(item?.publishedAt||"");
   if(!item?.url||!item.title||!Number.isFinite(age)||age<-1800000||age>72*3600000)continue;
   const url=new URL(item.url);
   if(url.protocol!=="https:")continue;
   const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(item.url));
   const hex=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
   const marker="intel:seen:"+hex;
   if(await env.CACHE.get(marker)||await env.CACHE.get("policy:v1:"+hex))continue;
   // Reserve one per URL and daily inference BEFORE calling the server endpoint.
   await env.CACHE.put(marker,String(now),{expirationTtl:259200});
   await env.CACHE.put(counter,String(used+1),{expirationTtl:90000});
   const query=new URL("https://katarina-research.pages.dev/api/news-intelligence");
   for(const [k,v]of Object.entries({scope:"dashboard",index:String(index),expected:item.url}))query.searchParams.set(k,v);
   try{
    const answer=await fetcher(query.toString(),{signal:AbortSignal.timeout(28000)});
    if(answer.status===503){
     const body=await answer.json().catch(()=>null);
     if(body?.status==="quota-exhausted"){
      await env.CACHE.put(counter,String(limit),{expirationTtl:90000});
      return "free-neuron-limit";
     }
    }
    return answer.ok?"attempted":"source-pending";
   }catch{return "attempt-failed"}
  }
  return "no-new-headlines";
 }catch{return "prewarm-unavailable"}
}

const POLICY_PAIR_ROTATION=["AUDJPY","USDJPY","EURUSD","GBPUSD","XAUUSD","USDCHF"];
export async function prewarmPolicy(env,now,fetcher=fetch){
 if(!env?.CACHE?.get||!env?.CACHE?.put)return "no-kv";
 const slot=Math.floor(now/900000),symbol=POLICY_PAIR_ROTATION[slot%POLICY_PAIR_ROTATION.length];
 const date=new Date(now).toISOString().slice(0,10),counter="policy:daily:"+date;
 try{
  const used=Number(await env.CACHE.get(counter)||0);
  if(used>=8)return "daily-cap";
  const resp=await fetcher("https://katarina-research.pages.dev/api/pair-news?symbol="+symbol,
    {signal:AbortSignal.timeout(9000)});
  if(!resp.ok)return "source-down";
  const items=(await resp.json()).items||[];
  const candidates=items.map((item,index)=>({...item,index})).filter(item=>{
   const age=now-Date.parse(item.publishedAt||"");
   const title=String(item.title||"");
   return Number.isFinite(age)&&age>=-60000&&age<36*3600000&&
    !/output gap|potential growth|bonds? held|holdings/i.test(title)&&
    /policy|rates?|inflation|monetary|economy|meeting|fomc|minutes|employment|jobs/i.test(title);
  }).slice(0,3);
  for(const item of candidates){
   const marker="policy:attempt:"+encodeURIComponent(item.url).slice(0,400);
   if(await env.CACHE.get(marker))continue;
   // Reserve BEFORE network work so failures and retries do not burn unbounded neurons.
   await env.CACHE.put(marker,new Date(now).toISOString(),{expirationTtl:172800});
   await env.CACHE.put(counter,String(used+1),{expirationTtl:90000});
   const r=await fetcher("https://katarina-research.pages.dev/api/policy-brief?symbol="+symbol+"&index="+item.index,
     {signal:AbortSignal.timeout(28000)});
   return r.ok?"attempted":"source-unavailable";
  }
  return "nothing-new";
 }catch{return "prewarm-unavailable"}
}

export default {
 async scheduled(event,env,ctx){
  if(!env.DB)return;
  const now=event.scheduledTime||Date.now(),minute=Math.floor(now/60000);
  ctx.waitUntil((async()=>{
   let total=0;
   const shard=env.FEED_SHARD==="1"?1:0,base=(minute*4)%FEEDS.length;
   const selected=[FEEDS[(base+shard*2)%FEEDS.length],FEEDS[(base+shard*2+1)%FEEDS.length]];
   for(const def of selected){try{total+=await collectOne(def,env,now)}catch{}}
   // Check H4 twice after each close (+8..19m and +38..49m).
   // Second pass catches data-provider delays and expires any prior plan cache.
   const offset=minute%240;
   const batch=offset>=8&&offset<20?offset-8:offset>=38&&offset<50?offset-38:-1;
   if(shard===0&&batch>=0&&batch<12){
    for(const symbol of PAIRS.slice(batch*3,batch*3+3)){try{await snapshotOne(symbol,env,now)}catch{}}
   }
   // Policy intelligence: only one verified-source prewarm every 15 minutes,
   // with a hard shared daily budget of 8 and a KV dedupe record.
   if(shard===0&&minute%15===8)try{await prewarmPolicy(env,now)}catch{}
   if(shard===0&&minute%15===11)try{await prewarmPublicNews(env,now)}catch{}
   // KV serves as regional-disaster fallback, not a per-visitor read path.
   // Shard 0 writes one compact, public-only snapshot every five minutes:
   // at most 288 KV writes/day, safely below the 1,000/day Free allowance.
   if(shard===0&&minute%5===0&&env.CACHE){
    try{
     const threshold=new Date(now-72*3600000).toISOString();
     const result=await env.DB.prepare("SELECT url,title,source,published_at,category,collected_at FROM headlines WHERE published_at >= ? ORDER BY published_at DESC LIMIT 30").bind(threshold).all();
     const items=(result.results||[]).filter(x=>x.url?.startsWith("https://")&&x.title);
     if(items.length>=6)await env.CACHE.put("hot-news:latest",JSON.stringify({version:1,createdAt:new Date(now).toISOString(),items}),{expirationTtl:3600});
    }catch{}
   }
   // Keep at most 90 days: cheap once-a-day housekeeping.
   if(shard===0&&minute%1440===22){
    try{await env.DB.prepare("DELETE FROM headlines WHERE published_at < ?").bind(new Date(now-90*86400000).toISOString()).run()}catch{}
   }
  })());
 },
 async fetch(request,env){
  const u=new URL(request.url);
  // Public, no-personal-data read endpoint. Cloudflare Workers Caching can
  // answer repeated GET requests before Worker execution at global edge.
  if(u.pathname==="/news"){
   try{
    const r=await fetch("https://katarina-research.pages.dev/api/hot-news",{
     headers:{"Accept":"application/json"},signal:AbortSignal.timeout(10000)
    });
    if(!r.ok)return new Response(JSON.stringify({status:"source-unavailable"}),{
     status:503,headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Cache-Control":"no-store"}
    });
    return new Response(r.body,{
     status:200,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"public, max-age=0, s-maxage=120",
      "Access-Control-Allow-Origin":"*","X-Content-Type-Options":"nosniff"}
    });
   }catch{return new Response(JSON.stringify({status:"temporarily-unavailable"}),{
    status:503,headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Cache-Control":"no-store"}
   })}
  }
  if(u.pathname==="/health")return new Response(JSON.stringify({service:"KATARINA autonomous collector",mode:"free-tier",cron:"every minute",newsSourcesPerRun:2,feedShard:env.FEED_SHARD||"0",kvBound:Boolean(env.CACHE),snapshots:"up to 34 symbols per completed H4, checked twice for provider delays"}),{headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
  // No public direct database reading: the bound Pages application is the reader.
  return new Response("Not found",{status:404});
 }
};
