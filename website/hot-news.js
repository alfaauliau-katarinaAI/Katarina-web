/* KATARINA stories: compact headline list; analyses in accessible modal on click. */
(()=>{"use strict";
const root=document.getElementById("kt-hotnews");if(!root)return;
const featured=document.getElementById("kt-hotnews-featured"),list=document.getElementById("kt-hotnews-list");
const ALLOWED=new Set(["www.cnbc.com","www.federalreserve.gov","www.ecb.europa.eu","www.bankofengland.co.uk","www.bls.gov","www.bea.gov"]);
const INTERVAL=15*60000;const aiResults=new Map(),requested=new Set();
let lastPoll=0,items=[],busy=false,selectedUrl="";
const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=String(txt);return n};
const time=x=>new Date(x).toLocaleString("id-ID",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit",timeZone:"Asia/Jakarta"})+" WIB";
function trusted(item){
 try{const u=new URL(item.url),date=Date.parse(item.publishedAt);return u.protocol==="https:"&&ALLOWED.has(u.hostname)&&typeof item.title==="string"&&item.title.length>20&&Number.isFinite(date)&&date<=Date.now()+1800000&&Date.now()-date<72*3600000}catch{return false}
}
async function analyse(item,index){
 if(aiResults.has(item.url)||requested.has(item.url))return;
 requested.add(item.url);
 try{
  const stop=new AbortController(),timer=setTimeout(()=>stop.abort(),21000);
  let response;try{response=await fetch("/api/news-intelligence?"+new URLSearchParams({scope:"dashboard",index:String(index),expected:item.url}),{cache:"no-store",signal:stop.signal})}finally{clearTimeout(timer)}
  if(!response.ok)return;const data=await response.json();
  if(data.status!=="ai-full-article"||data.url!==item.url)return;
  if(!["summary","policyEvidence","benefits","harms","watch","uncertainty"].every(k=>typeof data[k]==="string"))return;
  aiResults.set(item.url,data);
  if(selectedUrl===item.url&&document.getElementById("ka-insight-dialog")?.open)window.KatarinaUI?.openNews(item,data);
  render();
 }catch{}finally{requested.delete(item.url)}
}
function card(item,index){
 const btn=el("button","ka-newscard");btn.type="button";
 const top=el("div","ka-news-top");top.append(el("span",null,item.source||"Berita Pasar"),el("time",null,time(item.publishedAt)));
 const title=el("strong","ka-news-title",item.title);title.lang="en";
 const bottom=el("div","ka-news-bottom");
 const summary=aiResults.get(item.url)?.summary||"Baca rangkuman isi berita, arah kebijakan dan dampak pada aset yang relevan.";
 bottom.append(el("p",null,summary),el("span",null,"Baca analisa →"));
 btn.append(top,title,bottom);
 btn.addEventListener("click",()=>{selectedUrl=item.url;window.KatarinaUI?.openNews(item,aiResults.get(item.url));void analyse(item,index)});
 return btn;
}
function render(){
 if(!featured||!list)return;featured.replaceChildren();list.replaceChildren();
 if(!items.length){featured.append(el("p","ka-news-empty","Belum ada berita terbaru yang dapat diverifikasi."));return}
 featured.append(card(items[0],0));
 for(let i=1;i<Math.min(items.length,6);i++)list.append(card(items[i],i));
}
async function refresh(){
 if(busy)return;busy=true;lastPoll=Date.now();
 try{
  const res=await fetch("/api/hot-news",{cache:"no-store"});if(!res.ok)throw Error("source");
  const data=await res.json();if(data.schema!==1||!Array.isArray(data.items))throw Error("invalid");
  items=data.items.filter(trusted).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0,12);
  render();
  // Analyse full article only when the user opens its details (no speculative AI spend).
 }catch{if(!items.length)render()}
 finally{busy=false}
}
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&Date.now()-lastPoll>=INTERVAL)void refresh()});
setInterval(()=>{if(!document.hidden)void refresh()},INTERVAL);
refresh();
})();