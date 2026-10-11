(()=>{"use strict";
const $=id=>document.getElementById(id),e=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=String(value);return n};
let data=null,filter="all";
const permitted=r=>r?.verified===true&&r?.approvedForPublication===true&&["backtest","demo","live"].includes(r.mode);
const mode=m=>({backtest:"Uji historis",demo:"Akun demo",live:"Akun live"}[m]||m);
const num=v=>typeof v==="number"&&Number.isFinite(v)?v.toLocaleString("id-ID"):"—";
const date=s=>{try{return new Date(s+"T12:00:00Z").toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"})}catch{return "—"}};
function empty(value){const box=e("div","journal-empty");box.append(e("span","journal-empty-symbol","⌁"),e("p",null,value));return box}
function draw(){
 const daily=$("journal-daily"),weekly=$("journal-weekly");if(!daily||!weekly)return;daily.replaceChildren();weekly.replaceChildren();
 const all=(data?.daily||[]).filter(permitted);const rows=all.filter(x=>filter==="all"||x.mode===filter);
 for(const rec of rows.slice(0,40)){const card=e("article","journal-entry");card.append(e("span","journal-entry-meta",date(rec.date)+" · "+mode(rec.mode)),e("strong",null,rec.title||rec.summary?.id||rec.summary||"Laporan yang telah diverifikasi"));if(typeof rec.notes==="string")card.append(e("p",null,rec.notes));daily.append(card)}
 if(!rows.length)daily.append(empty(filter==="all"?"Belum ada transaksi atau hasil pengujian yang telah diverifikasi untuk publikasi.":"Belum ada catatan "+mode(filter).toLowerCase()+" yang lolos verifikasi."));
 for(const rec of (data?.weekly||[]).filter(permitted).slice(0,12)){const card=e("article","journal-entry");card.append(e("span","journal-entry-meta",date(rec.date)+" · "+mode(rec.mode)),e("strong",null,rec.title||rec.summary?.id||rec.summary||"Evaluasi minggu ini"));if(typeof rec.notes==="string")card.append(e("p",null,rec.notes));weekly.append(card)}
 if(!weekly.children.length)weekly.append(empty("Evaluasi mingguan akan tampil setelah ada laporan yang disetujui untuk publikasi."));
 const metrics=all.filter(x=>typeof x.trades==="number"&&typeof x.winRate==="number"&&typeof x.returnPct==="number"&&typeof x.maxDrawdownPct==="number");
 if(metrics.length===1){const x=metrics[0];$("j-total").textContent=num(x.trades);$("j-winrate").textContent=num(x.winRate)+"%";$("j-return").textContent=num(x.returnPct)+"%";$("j-drawdown").textContent=num(x.maxDrawdownPct)+"%";}
 else{for(const id of ["j-total","j-winrate","j-return","j-drawdown"])$(id).textContent="—"}
 const plotted=(data?.equityCurve||[]).filter(permitted).filter(x=>Number.isFinite(Number(x.returnPct)));
 if(plotted.length>2&&new Set(plotted.map(x=>x.mode)).size===1){const root=$("journal-curve");root.replaceChildren();const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("viewBox","0 0 500 220");svg.setAttribute("role","img");svg.setAttribute("aria-label","Grafik return laporan yang lolos verifikasi");const vals=plotted.map(x=>Number(x.returnPct)),hi=Math.max(...vals),lo=Math.min(...vals),range=Math.max(.01,hi-lo);const pts=vals.map((v,i)=>(15+i*470/(vals.length-1))+","+(185-(v-lo)/range*155)).join(" ");const poly=document.createElementNS("http://www.w3.org/2000/svg","polyline");poly.setAttribute("points",pts);poly.setAttribute("fill","none");poly.setAttribute("stroke","#67e0cb");poly.setAttribute("stroke-width","3");poly.setAttribute("stroke-linejoin","round");svg.append(poly);root.append(svg)}
 $("journal-state").textContent=all.length?"Ada laporan terverifikasi":"Belum ada laporan publik";
 $("journal-updated").textContent=data?.updatedAt?"Pemeriksaan "+date(data.updatedAt):"Menunggu audit";
}
$("journal-filters")?.addEventListener("click",ev=>{const btn=ev.target.closest("button[data-mode]");if(!btn)return;filter=btn.dataset.mode;$("journal-filters").querySelectorAll("button").forEach(b=>b.classList.toggle("selected",b===btn));draw()});
fetch("/reports.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("source");return r.json()}).then(x=>{data=x?.schema===1?x:null;draw()}).catch(()=>{data=null;draw()});
})();