/* Public GitHub activity presented as product development updates, not claims of profitable trading. */
const ORIGIN="https://api.github.com/repos/";
const SOURCES=[
 {repo:"alfaauliau-katarinaAI/Katarina-AI",category:"Riset KATARINA"},
 {repo:"alfaauliau-katarinaAI/Katarina-web",category:"Website KATARINA"}
];
const response=(payload,status=200)=>new Response(JSON.stringify(payload),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":status===200?"public, max-age=0, s-maxage=3600":"no-store"}});
function summary(message,category){
 const text=String(message||"").split("\n")[0].toLowerCase();
 if(/55.pair|55.market|55 mt5|55 broker|55.instrument/.test(text))return /backtest|test|audit/.test(text)?"Pengujian strategi di 55 instrumen pasar":"Pemeriksaan logika pada 55 instrumen";
 if(/decision brain|market decision|advisor/.test(text))return "Pengembangan cara KATARINA membaca kondisi pasar";
 if(/chart|h4|candle|forecast/.test(text))return "Grafik H4 dan skenario harga diperbarui";
 if(/news|berita|headline|language|translate/.test(text))return "Berita dan pilihan bahasa diperbaiki";
 if(/journal|jurnal/.test(text))return "Tampilan jurnal dan pencatatan hasil diperbarui";
 if(/risk|drawdown|strategy/.test(text))return "Aturan risiko dan pengujian strategi diperiksa";
 if(/deploy|cloudflare|pages/.test(text))return "Penerbitan website diperbarui";
 if(/research|analysis|analisa|analyst|scenario/.test(text))return "Fitur riset dan pembacaan pasar dikembangkan";
 return category==="Website KATARINA"?"Penyempurnaan website KATARINA":"Pengembangan sistem riset KATARINA";
}
async function history(source){
 try{
 const u=ORIGIN+source.repo+"/commits?per_page=8";
 const r=await fetch(u,{headers:{"Accept":"application/vnd.github+json","User-Agent":"Katarina-Public-Research-Site"},signal:AbortSignal.timeout(7000)});
 if(!r.ok)return [];
 const commits=await r.json();if(!Array.isArray(commits))return [];
 return commits.filter(c=>c?.html_url?.startsWith("https://github.com/")&&c?.commit?.committer?.date)
  .map(c=>({category:source.category,title:summary(c.commit.message,source.category),date:c.commit.committer.date,link:c.html_url,detail:"Pembaruan kode tersedia di GitHub. Status pengujian dan kinerja strategi perlu diperiksa terpisah."}));
 }catch{return []}
}
export async function onRequestGet({request,env}){
 const u=new URL(request.url),key=new Request(new URL("/api/project-updates?version=1",u));
 try{const hit=await caches.default.match(key);if(hit)return hit}catch{}
 const runs=await Promise.all(SOURCES.map(history)),all=runs.flat().sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)),seen=new Set();
 const items=all.filter(x=>{const key=x.category+"|"+x.title;if(seen.has(key))return false;seen.add(key);return true}).slice(0,5);
 if(!items.length&&env?.ASSETS?.fetch){
  try{
   const resource=new URL("/project-updates.json",u);
   const r=await env.ASSETS.fetch(new Request(resource.toString()));
   if(r.ok){const archive=await r.json();if(Array.isArray(archive?.items)&&archive.items.length)return response(archive)}
  }catch{}
 }
 const answer=response({schema:1,status:items.length?"ready":"unavailable",items,source:"Commit publik GitHub",updatedAt:new Date().toISOString()});
 if(items.length)try{await caches.default.put(key,answer.clone())}catch{}
 return answer;
}
