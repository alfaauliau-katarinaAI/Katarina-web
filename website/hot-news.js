/* KATARINA Hot News: verified publisher titles + Indonesian conditional macro context.
 * Refreshes via Cloudflare Pages Function and edge TTL, without paid APIs or chat commands.
 */
(()=>{"use strict";
const root=document.getElementById("kt-hotnews");if(!root)return;
const list=document.getElementById("kt-hotnews-list"),featured=document.getElementById("kt-hotnews-featured");
const status=document.getElementById("kt-hotnews-status"),stamp=document.getElementById("kt-hotnews-checked"),manual=document.getElementById("kt-hotnews-refresh");
const ALLOWED=new Set(["www.cnbc.com","www.federalreserve.gov","www.ecb.europa.eu","www.bankofengland.co.uk","www.bls.gov","www.bea.gov"]);
const INTERVAL=15*60*1000;let lastPoll=0,signature="",busy=false,lastValid=[];const aiResults=new Map(),aiRequests=new Set();
const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n};
const time=x=>{try{return new Date(x).toLocaleString("id-ID",{timeZone:"Asia/Jakarta",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})+" WIB"}catch{return "waktu tidak diketahui"}};
const valid=x=>{if(!x||typeof x.title!=="string"||x.title.length<20||typeof x.url!=="string")return false;let u;try{u=new URL(x.url)}catch{return false}const ms=Date.parse(x.publishedAt);return u.protocol==="https:"&&ALLOWED.has(u.hostname)&&Number.isFinite(ms)&&ms>=Date.now()-72*3600000&&ms<Date.now()+1800000};
function summary(item){
 const text=item.essence||"Pokok isu: "+item.category+". Periksa berita asli untuk rincian lengkap.";
 return [text,item.impact||"Dampak makro bergantung pada detail berita dan respons harga setelah publikasi.",item.watch||"Pantau reaksi harga dan sumber resmi."];
}
function card(item,lead){
 const wrap=el("article",lead?"kt-hotnews-lead":"kt-hotnews-item");
 const meta=el("div","kt-hotnews-meta");meta.append(el("span","kt-hotnews-tag",item.category||"Pasar Global"),el("span",null,item.source||"Sumber"),el("time",null,time(item.publishedAt)));
 const original=el("p","kt-hotnews-original","Judul sumber: "+item.title);original.lang="en";
 const ai=aiResults.get(item.url);const [essence,impact,watch]=ai?[ai.summary,ai.impact,ai.watch]:summary(item);
 const heading=el(lead?"h3":"h4","kt-hotnews-main",essence);const badge=el("span",ai?"kt-ai-label kt-ai-ready":"kt-ai-label",ai?"✦ DIRANGKUM AI DARI ISI ARTIKEL":"ANALISIS UMUM TOPIK · BUKAN RANGKUMAN ARTIKEL");
 const intel=el("div","kt-hotnews-intel");
 const b=el("div","kt-hotnews-intel-block");b.append(el("b",null,"DAMPAK MAKRO POTENSIAL"),el("p",null,impact));
 intel.append(b);if(ai){const d=el("div","kt-hotnews-intel-block");d.append(el("b",null,"PENGGERAK MAKRO"),el("p",null,ai.drivers));intel.append(d)}
 if(lead){const c=el("div","kt-hotnews-intel-block");c.append(el("b",null,"PANTAU KONFIRMASI"),el("p",null,watch));intel.append(c)}
 if(ai){const x=el("div","kt-hotnews-intel-block kt-ai-uncertain");x.append(el("b",null,"KETIDAKPASTIAN"),el("p",null,ai.uncertainty));intel.append(x)}
 const link=el("a","kt-hotnews-open","Baca berita dari sumber asli ↗");link.href=item.url;link.target="_blank";link.rel="noopener noreferrer";
 wrap.append(meta,badge,el("span","kt-hotnews-intro",ai?"RANGKUMAN ARTIKEL":"PENJELASAN TOPIK"),heading,original,intel,link);
 return wrap;
}
function render(items){
 const newSignature=items.map(x=>x.url).join("|"),changed=signature&&newSignature!==signature;signature=newSignature;
 lastValid=items;featured.replaceChildren();list.replaceChildren();
 if(!items.length){featured.append(el("p","kt-hotnews-no-data","Belum ada berita pasar baru dari sumber yang memenuhi batas waktu 72 jam."));status.textContent="Menunggu berita yang valid";return}
 featured.append(card(items[0],true));
 for(const item of items.slice(1,5))list.append(card(item,false));
 status.textContent=(changed?"Headline baru terdeteksi · ":"")+items.length+" berita bersumber · AI hanya meringkas jika isi artikel penuh tersedia";
}
async function load(url){
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),12000);
 try{const response=await fetch(url,{cache:"no-store",signal:abort.signal});if(!response.ok)throw Error("HTTP "+response.status);
  const json=await response.json();if(json?.schema!==1||!Array.isArray(json.items))throw Error("Format sumber tidak valid");
  return json.items.filter(valid).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0,12);
 }finally{clearTimeout(timer)}
}
async function analyseArticle(item,index){
 if(aiResults.has(item.url)||aiRequests.has(item.url))return;aiRequests.add(item.url);
 try{
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),16000);
 let data;try{const r=await fetch("/api/ai-news?index="+index,{cache:"no-store",signal:ac.signal});if(!r.ok)return;data=await r.json()}finally{clearTimeout(timer)}
 if(data?.status!=="ai-full-article"||data.url!==item.url)return;
 if(["summary","drivers","impact","watch","uncertainty"].every(k=>typeof data[k]==="string")){
 aiResults.set(item.url,data);if(lastValid.some(x=>x.url===item.url))render(lastValid);
 }
 }catch{}finally{aiRequests.delete(item.url)}
}
async function check(){
 if(busy)return;busy=true;lastPoll=Date.now();if(manual)manual.disabled=true;
 status.textContent="Memeriksa sumber tepercaya…";
 let items=null;
 try{items=await load("/api/hot-news")}catch{
   try{items=await load("/hot-news.json?v="+lastPoll)}catch{}
 }
 if(items!==null){render(items);if(items.length)void analyseArticle(items[0],0);if(items.length>1)void analyseArticle(items[1],1);}
 else status.textContent=lastValid.length?"Penyedia belum tersedia, mempertahankan berita terakhir yang sudah dimuat.":"Sumber tidak dapat diakses; tidak menampilkan berita buatan.";
 if(stamp)stamp.textContent="Terakhir diperiksa "+new Date().toLocaleTimeString("id-ID",{timeZone:"Asia/Jakarta",hour:"2-digit",minute:"2-digit"})+" WIB · otomatis setiap 15 menit saat halaman terbuka";
 if(manual)manual.disabled=false;busy=false;
}
manual?.addEventListener("click",check);
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&Date.now()-lastPoll>=INTERVAL)check()});
setInterval(()=>{if(!document.hidden)check()},INTERVAL);
check();
})();
