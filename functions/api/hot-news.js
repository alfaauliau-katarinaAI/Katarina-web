/* KATARINA Cloudflare Pages Function: on-demand, cached headline checking.
 * No API keys, paid API, VPS, cron worker, invented headlines, or financial signals.
 * Runs on demand; short-term cache preserves free-tier request and CPU budgets.
 */
const FEEDS = [
  ["CNBC Pasar","https://www.cnbc.com/id/10000664/device/rss/rss.html","www.cnbc.com"],
  ["CNBC Dunia","https://www.cnbc.com/id/100727362/device/rss/rss.html","www.cnbc.com"],
  ["CNBC Utama","https://www.cnbc.com/id/100003114/device/rss/rss.html","www.cnbc.com"],
  ["CNBC Ekonomi","https://www.cnbc.com/id/20910258/device/rss/rss.html","www.cnbc.com"],
  ["CNBC Bisnis","https://www.cnbc.com/id/10001147/device/rss/rss.html","www.cnbc.com"],
  ["CNBC Asia","https://www.cnbc.com/id/19832390/device/rss/rss.html","www.cnbc.com"],
  ["CNBC Eropa","https://www.cnbc.com/id/19794221/device/rss/rss.html","www.cnbc.com"],
  ["CNBC Politik","https://www.cnbc.com/id/10000113/device/rss/rss.html","www.cnbc.com"],
  ["Federal Reserve","https://www.federalreserve.gov/feeds/press_monetary.xml","www.federalreserve.gov"],
  ["Biro Statistik Tenaga Kerja AS","https://www.bls.gov/feed/bls_latest.rss","www.bls.gov"]
];
const TOPICS = /\b(fed|federal reserve|fomc|rates?|bonds?|treasur(?:y|ies)|inflation|cpi|ppi|nfp|oil|crude|energy|gold|silver|dollar|forex|currenc(?:y|ies)|yen|euro|pound|markets?|wall street|stocks?|equities|nasdaq|dow jones|geopolitic\w*|iran|saudi|china|tariffs?|commodit\w*|payrolls?|employment|central bank|crypto\w*|bitcoin|debt|yields?|jpmorgan|banks?|econom\w*|recession|monetary|interest|imf|world bank)\b/i;
const EXCLUDED = /\b(NBA|NFL|basketball|baseball|soccer|football|hockey|tennis|athlete|celebrity|movie|entertainment|music awards|actor|streaming series)\b/i;
function decode(text){
  return String(text||"").replace(/&#(x[0-9a-f]+|\d+);/gi,(_,s)=>{const n=s[0]?.toLowerCase()==="x"?parseInt(s.slice(1),16):parseInt(s,10);return Number.isFinite(n)&&n>0&&n<=0x10ffff?String.fromCodePoint(n):""}).replace(/&(?:amp|lt|gt|quot|apos|nbsp);/gi,s=>({"&amp;":"&","&lt;":"<","&gt;":">","&quot;":'"',"&apos;":"'","&nbsp;":" "}[s.toLowerCase()]||s));
}
function clean(s){
  return decode(String(s||"").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi,"$1").replace(/<[^>]*>/g,"")).replace(/\s+/g," ").trim();
}
function tag(xml,name){
  const match=xml.match(new RegExp("<"+name+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/"+name+"\\s*>","i"));
  return match?clean(match[1]):"";
}
function topic(title){
  if(/\b(gold|silver|precious metal)\b/i.test(title))return "Emas / Logam";
  if(/\b(oil|crude|iran|middle east|saudi|energy|war|geopolitic)\b/i.test(title))return "Energi / Geopolitik";
  if(/\b(bitcoin|crypto|blockchain|digital asset)\b/i.test(title))return "Kripto";
  if(/\b(yen|euro|dollar|forex|currency|sterling)\b/i.test(title))return "Valas";
  if(/\b(fed|fomc|inflation|cpi|ppi|rates?|treasury|bond|yield|monetary|payroll)\b/i.test(title))return "Suku Bunga / Inflasi";
  return "Pasar Global";
}

/* Rule-based Indonesian context. Headline/RSS description is not a verified full-article abstract.
 * All impact statements are conditional scenarios, never claims of measured market moves.
 */
function context(title){
 const t=title.toLowerCase();
 if(/\b(houthi|iran|saudi|war|conflict|military|strike|missile|putin|kremlin|russia|diesel|oil|crude|opec)\b/.test(t))
   return {essence:"Pokok isu: perkembangan geopolitik atau pasokan energi yang dapat mengubah premi risiko global.",impact:"Jika risiko gangguan pasokan meningkat, harga energi dan ekspektasi inflasi dapat tertekan naik; emas serta USD bisa diburu saat penghindaran risiko. Konfirmasi melalui minyak, imbal hasil AS dan XAUUSD.",watch:"Pantau minyak mentah, XAUUSD, DXY, imbal hasil obligasi dan kejelasan pernyataan resmi."};
 if(/\b(fed|fomc|powell|central bank|interest rate|monetary|rate cut|rate hike)\b/.test(t))
   return {essence:"Pokok isu: kebijakan atau kredibilitas bank sentral yang memengaruhi ekspektasi suku bunga.",impact:"Nada lebih ketat berpotensi mengangkat yield dan USD serta menekan aset berisiko atau emas; nada lebih longgar dapat memberi respons sebaliknya. Reaksi bergantung pada ekspektasi pasar sebelumnya.",watch:"Bandingkan pernyataan sumber resmi, futures suku bunga, yield Treasury, DXY dan emas."};
 if(/\b(inflation|consumer price|producer price|cpi|ppi|price pressure)\b/.test(t))
   return {essence:"Pokok isu: perubahan tekanan harga dan peluang revisi ekspektasi kebijakan moneter.",impact:"Inflasi di atas konsensus bisa mendorong yield/USD dan meningkatkan volatilitas emas, saham, serta forex; hasil di bawah konsensus belum tentu otomatis bullish bila pertumbuhan melemah.",watch:"Periksa data aktual versus konsensus, komponen inti, revisi dan reaksi yield dua tahun."};
 if(/\b(payroll|jobs|employment|unemployment|wages|labor market)\b/.test(t))
   return {essence:"Pokok isu: kondisi tenaga kerja, pertumbuhan dan kemampuan bank sentral menahan atau mengubah suku bunga.",impact:"Tenaga kerja di luar perkiraan dapat menggeser yield, USD, indeks dan emas. Arah tidak otomatis sama untuk tiap indikator; lihat upah, revisi dan tingkat pengangguran.",watch:"Periksa rilis resmi, revisi data, yield 2 tahun, DXY dan reaksi pasar berikutnya."};
 if(/\b(bond|yield|deficit|debt|treasury|credit|fixed income|fiscal)\b/.test(t))
   return {essence:"Pokok isu: obligasi, beban utang atau risiko fiskal yang memengaruhi biaya pendanaan.",impact:"Kenaikan premi risiko atau yield dapat membebani valuasi saham dan kurs tertentu; meningkatnya kekhawatiran kredit dapat mendorong permintaan aset defensif. Dampak bergantung negara serta tenor.",watch:"Pantau yield obligasi, spread kredit, indeks USD dan respons saham."};
 if(/\b(tariff|trade|china|export|import|sanction|supply chain)\b/.test(t))
   return {essence:"Pokok isu: kebijakan perdagangan, rantai pasokan atau hambatan lintas negara.",impact:"Tarif dan hambatan perdagangan dapat memengaruhi biaya impor, proyeksi inflasi, mata uang mitra dagang dan prospek pertumbuhan. Efek harga baru dapat dinilai setelah detail kebijakan jelas.",watch:"Verifikasi detail kebijakan, reaksi mata uang terkait, energi, yield dan komoditas."};
 if(/\b(bitcoin|crypto|digital asset)\b/.test(t))
   return {essence:"Pokok isu: perubahan kondisi pasar aset digital dan selera risiko.",impact:"Perubahan regulasi, likuiditas atau arus modal dapat memperbesar volatilitas kripto. Dampak ke USD, saham dan emas tidak selalu searah.",watch:"Pantau pengumuman resmi, likuiditas, BTCUSD dan sentimen saham teknologi."};
 if(/\b(gold|silver|bullion|precious metal)\b/.test(t))
   return {essence:"Pokok isu: harga logam mulia dan faktor permintaan aset pelindung nilai.",impact:"Yield riil, dolar AS, permintaan fisik serta risiko geopolitik dapat menggerakkan emas/perak dengan arah berbeda. Jangan simpulkan hanya dari satu judul.",watch:"Amati DXY, yield riil AS, harga emas/perak dan volatilitas setelah rilis."};
 return {essence:"Pokok isu: perubahan sentimen pasar, laba, valuasi atau kondisi pembiayaan yang diberitakan penerbit.",impact:"Sentimen risiko dapat merambat ke indeks saham, kurs dan obligasi, tetapi arah dan besar dampaknya harus dikonfirmasi menggunakan data harga serta sumber lengkap.",watch:"Periksa konteks artikel, indeks saham utama, DXY dan imbal hasil obligasi."};
}

async function source([name,feed,host],now){
  const controller=new AbortController();
  const id=setTimeout(()=>controller.abort(),8000);
  try{
    const r=await fetch(feed,{signal:controller.signal,headers:{"Accept":"application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.5"},cf:{cacheEverything:true,cacheTtl:180}});
    if(!r.ok) return [];
    const payload=await r.text();
    if(payload.length>900000) return [];
    const chunks=payload.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item\s*>/gi)||[];
    const found=[];
    for(const item of chunks.slice(0,100)){
      const title=tag(item,"title"),rawLink=tag(item,"link"),rawDate=tag(item,"pubDate");
      if(title.length<24||title.length>215||!TOPICS.test(title)||EXCLUDED.test(title))continue;
      let u;
      try{u=new URL(rawLink)}catch{continue}
      if(u.protocol!=="https:"||u.hostname!==host)continue;
      const timestamp=Date.parse(rawDate);
      if(!Number.isFinite(timestamp)||timestamp>now+1800000||now-timestamp>72*3600000)continue;
      const date=new Date(timestamp);
      if(host==="www.cnbc.com"&&!u.pathname.includes("/"+date.getUTCFullYear()+"/"+String(date.getUTCMonth()+1).padStart(2,"0")+"/"))continue;
      u.hash="";u.search="";
      found.push({title,source:name,url:u.href,publishedAt:date.toISOString(),category:topic(title),language:"en",...context(title),contextBasis:"Penjelasan bersyarat berdasarkan topik judul; periksa artikel lengkap untuk rincian."});
    }
    return found;
  }catch{return []}
  finally{clearTimeout(id)}
}
export async function onRequestGet({request,env}){
  // The minute-scheduled Worker collects source RSS into D1, without visitors.
  // Prefer durable, source-attributed snapshots; fall back to RSS when D1 is empty.
  if(env?.KATARINA_DB){
    try{
      const limitDate=new Date(Date.now()-72*3600000).toISOString();
      const result=await env.KATARINA_DB.prepare("SELECT url,title,source,published_at,category,collected_at FROM headlines WHERE published_at >= ? ORDER BY published_at DESC LIMIT 30").bind(limitDate).all();
      const records=result?.results||[];
      if(records.length>=6){
        const now=Date.now();
        const items=records.filter(x=>x.url?.startsWith("https://")&&x.title&&Number.isFinite(Date.parse(x.published_at))&&Date.parse(x.published_at)<=now+1800000)
        .map(x=>({title:x.title,source:x.source,url:x.url,publishedAt:x.published_at,category:x.category,language:"en",...context(x.title),contextBasis:"Penjelasan bersyarat berdasarkan judul; periksa sumber lengkap."}));
        if(items.length>=6)return new Response(JSON.stringify({schema:1,kind:"attributed-headline-feed",updatedAt:records.reduce((latest,row)=>row.collected_at>latest?row.collected_at:latest,"")||null,status:"source-headlines",storage:"Cloudflare D1 (minute-cron)",items}),{
          headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"public,max-age=0,s-maxage=180","X-Content-Type-Options":"nosniff"}
        });
      }
    }catch{/* D1 binding absent, initializing, or temporarily unavailable: use RSS. */}
  }

  const cacheKey=new Request(new URL("/api/hot-news?schema=macro-v4",request.url).toString());
  try{const hit=await caches.default.match(cacheKey);if(hit)return hit}catch{}
  const now=Date.now();
  const batches=await Promise.all(FEEDS.map(feed=>source(feed,now)));
  const uniq=new Map();
  for(const item of batches.flat()){if(!uniq.has(item.url))uniq.set(item.url,item)}
  const items=[...uniq.values()].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0,30);
  const ok=items.length>0;
  const data={schema:1,kind:"attributed-headline-feed",updatedAt:new Date(now).toISOString(),status:ok?"source-headlines":"temporarily-unavailable",items};
  const response=new Response(JSON.stringify(data),{status:ok?200:503,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":ok?"public, max-age=0, s-maxage=180":"no-store","X-Content-Type-Options":"nosniff"}});
  if(ok){try{await caches.default.put(cacheKey,response.clone())}catch{}}
  return response;
}
