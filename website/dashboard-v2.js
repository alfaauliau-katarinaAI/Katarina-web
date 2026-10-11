/* Dashboard highlights only, all figures read from public sourced snapshots. */
(()=>{"use strict";
const get=id=>document.getElementById(id);
const fmt=(v,pair)=>Number(v).toLocaleString("id-ID",{maximumFractionDigits:/JPY/.test(pair)?3:/^(EUR|GBP|AUD|NZD|USD|CAD|CHF)/.test(pair)?5:2});
const day=d=>{try{return new Date(d).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric",timeZone:"Asia/Jakarta"})}catch{return "—"}};
const text=(id,value)=>{if(get(id))get(id).textContent=value};
const keys={XAUUSD:"xau",XAGUSD:"silver",EURUSD:"eurusd",USDJPY:"usdjpy",BTCUSD:"bitcoin",US30:"us30"};
const safe=(j)=>j&&j.schema===1?j:null;
Promise.allSettled(["/market-ohlc.json","/calendar-brief.json"].map(url=>fetch(url,{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("Gagal mengambil sumber");return r.json()}))).then(results=>{
const market=safe(results[0].status==="fulfilled"?results[0].value:null);
const calendar=safe(results[1].status==="fulfilled"?results[1].value:null);
const gold=market?.series?.xau;
if(gold?.bars?.length){const bars=gold.bars;const last=bars.at(-1),prior=bars.at(-2),pct=(last[4]/prior[4]-1)*100;
text("kt-v2-gold-price",fmt(last[4],"XAUUSD")+"  "+(pct>=0?"+":"")+pct.toFixed(2)+"%");
text("kt-v2-gold-date","Penutupan "+day(last[0]*1000)+" · "+(gold.source||market.provider||"Sumber harga referensi")+" · bukan real-time");
const cv=get("kt-v2-spark"),ctx=cv?.getContext("2d");if(ctx){const rect=cv.getBoundingClientRect(),w=Math.max(250,Math.round(rect.width)),h=130,dpr=Math.min(2,window.devicePixelRatio||1);cv.width=w*dpr;cv.height=h*dpr;ctx.scale(dpr,dpr);const data=bars.slice(-45).map(x=>x[4]);let lo=Math.min(...data),hi=Math.max(...data);if(hi===lo)hi=lo+1;ctx.strokeStyle="#143853";for(let i=1;i<4;i++){let y=h*i/4;ctx.beginPath();ctx.moveTo(5,y);ctx.lineTo(w-5,y);ctx.stroke()}ctx.beginPath();data.forEach((v,i)=>{const x=7+i*(w-14)/Math.max(1,data.length-1),y=15+(hi-v)/(hi-lo)*(h-30);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.strokeStyle=pct>=0?"#38e0bc":"#ff879b";ctx.lineWidth=2.5;ctx.stroke()}}
else{text("kt-v2-gold-price","Data belum tersedia");text("kt-v2-gold-date","Tidak menampilkan harga tanpa sumber")}
const box=get("kt-v2-tickers");if(box){box.replaceChildren();let matched=0;for(const [symbol,key] of Object.entries(keys)){const series=market?.series?.[key],bars=series?.bars;if(!bars||bars.length<2)continue;const v=bars.at(-1)[4],p=bars.at(-2)[4],change=(v/p-1)*100;
const a=document.createElement("a");a.className="kt-v2-ticker";a.href="/research.html?symbol="+encodeURIComponent(symbol);const s=document.createElement("span");s.textContent=symbol;const b=document.createElement("strong");b.textContent=fmt(v,symbol);const em=document.createElement("em");em.textContent=(change>=0?"+":"")+change.toFixed(2)+"%";em.className=change>=0?"up":"down";const small=document.createElement("small");small.textContent="Per "+day(bars.at(-1)[0]*1000)+" · Historis";a.append(s,b,em,small);box.append(a);matched++}
if(!matched){const p=document.createElement("p");p.textContent="Belum ada harga historis yang lolos validasi.";box.append(p)}}
const events=Array.isArray(calendar?.events)?calendar.events.filter(e=>e?.title&&e?.dateWIB&&e?.source):[];
const nearest=events.filter(e=>{const t=Date.parse(e.dateWIB+"T00:00:00+07:00");return Number.isFinite(t)&&t>=Date.now()-86400000}).sort((a,b)=>String(a.dateWIB+a.timeWIB).localeCompare(String(b.dateWIB+b.timeWIB))).slice(0,3);
const eb=get("kt-v2-events");if(eb){eb.replaceChildren();for(const item of nearest){const e=document.createElement("article"),time=document.createElement("small"),b=document.createElement("strong"),c=document.createElement("span");time.textContent=day(item.dateWIB+"T00:00:00+07:00")+" · "+(item.timeWIB||"WIB")+" WIB";b.textContent=item.title;c.textContent=(item.region||"Makro")+" · "+(item.impact||"Perhatikan reaksi pasar");e.append(time,b,c);eb.append(e)}if(!nearest.length){const p=document.createElement("p");p.textContent="Belum ada agenda mendatang yang dapat diverifikasi.";eb.append(p)}}
if(calendar?.weekStart&&calendar?.weekEnd)text("kt-v2-week",day(calendar.weekStart+"T00:00:00+07:00")+" – "+day(calendar.weekEnd+"T00:00:00+07:00"));
text("kt-v2-risk",nearest[0]?.title||"Menunggu agenda resmi");
text("kt-v2-week-note",nearest[0]?"Pantau "+nearest[0].title+". Bandingkan aktual dengan konsensus, cek USD, imbal hasil obligasi, dan konfirmasi respons harga sebelum menyimpulkan arah.":"Gunakan grafik dan kalender bersumber. Tidak ada skenario yang dijadikan sinyal otomatis.");
});})();
