/* KATARINA UI: compact navigation and accessible insight dialogs. */
(()=>{"use strict";
const html=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=String(txt);return e};
const which=()=>location.pathname==="/"?"/":(location.pathname.endsWith(".html")?location.pathname:location.pathname.replace(/\/$/,"")+".html");
const links=[["/","Dasbor"],["/research.html","Riset & Analisa"],["/journal.html","Jurnal"],["/insights.html","Artikel"],["/sponsors.html","Dukungan"]];
function nav(){
 const nav=document.querySelector("header.shell nav.nav"),old=nav?.querySelector(".navlinks");if(!old)return;
 const linksLeft=html("div","ka-primary");
 for(const [path,label] of links.slice(0,2)){
  const a=html("a",null,label);a.href=path;if(which()===path||path==="/research.html"&&which()==="/analisa.html"){a.className="ka-active";a.setAttribute("aria-current","page")}linksLeft.append(a);
 }
 const menu=html("div","ka-navmenu"),trigger=html("button","ka-navtrigger","Lainnya");trigger.type="button";trigger.setAttribute("aria-haspopup","true");trigger.setAttribute("aria-expanded","false");trigger.setAttribute("aria-controls","ka-navigation-popover");
 const pop=html("div","ka-nav-popover");pop.id="ka-navigation-popover";pop.hidden=true;
 for(const [path,label] of links.slice(2).concat([["/about.html","Tentang KATARINA"],["/contact.html","Kontak"]])){const a=html("a",null,label);a.href=path;if(which()===path){a.className="ka-active";a.setAttribute("aria-current","page")}pop.append(a)}
 const close=()=>{pop.hidden=true;trigger.setAttribute("aria-expanded","false")};
 trigger.addEventListener("click",()=>{const next=pop.hidden;pop.hidden=!next;trigger.setAttribute("aria-expanded",String(next))});
 document.addEventListener("pointerdown",e=>{if(!menu.contains(e.target))close()});
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!pop.hidden){close();trigger.focus()}});
 menu.append(trigger,pop);old.replaceChildren(linksLeft,menu);old.classList.add("ka-nav-compact");
 nav.querySelectorAll(":scope > label").forEach(e=>e.classList.add("ka-language-hide"));
}
/* The dialog never injects remote markup, all externally sourced text uses textContent. */
let dialog,content,returnFocus;
function initDialog(){
 if(dialog)return;
 dialog=html("dialog","ka-dialog");dialog.id="ka-insight-dialog";dialog.setAttribute("aria-labelledby","ka-dialog-title");
 const card=html("div","ka-dialog-card");const bar=html("div","ka-dialog-bar");
 const mini=html("span","ka-dialog-brand","KATARINA  /  INTELIJEN PASAR");
 const close=html("button","ka-dialog-close","Tutup ×");close.type="button";close.setAttribute("aria-label","Tutup analisa");close.addEventListener("click",()=>dialog.close());
 bar.append(mini,close);content=html("div","ka-dialog-content");card.append(bar,content);dialog.append(card);document.body.append(dialog);
 dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close()});
 dialog.addEventListener("close",()=>{document.body.classList.remove("ka-modal-open");returnFocus?.focus?.()});
}
function modal(kicker,title){
 initDialog();returnFocus=document.activeElement;content.replaceChildren();content.append(html("div","ka-dialog-kicker",kicker),html("h2","",title));
 if(!dialog.open){try{dialog.showModal()}catch{dialog.setAttribute("open","")}}
 document.body.classList.add("ka-modal-open");return content;
}
function block(parent,title,value){
 if(!value)return;
 const el=html("section","ka-dialog-section");el.append(html("h3",null,title),html("p",null,value));parent.append(el);
}
function metrics(parent,values){
 const grid=html("div","ka-dialog-metrics");for(const [name,value] of values){const item=html("div","ka-dialog-metric");item.append(html("span",null,name),html("strong",null,value===null||value===undefined||value===""?"—":String(value)));grid.append(item)}parent.append(grid);
}
function link(parent,label,href){
 try{const url=new URL(href);if(url.protocol!=="https:")return;const anchor=html("a","ka-dialog-link",label+" ↗");anchor.href=url.href;anchor.target="_blank";anchor.rel="noopener noreferrer";parent.append(anchor)}catch{}
}
function event(ev){
 const c=modal("AGENDA EKONOMI · "+ev.region+" · "+ev.dateWIB+" · "+ev.timeWIB+" WIB",ev.title);
 metrics(c,[["Aktual",ev.actual===null||ev.actual===undefined?"Belum rilis":ev.actualSource?ev.actual:"Belum diverifikasi"],["Prediksi",ev.forecast&&ev.forecastSource?ev.forecast:"—"],["Sebelumnya",ev.previous&&ev.previousSource?ev.previous:"—"]]);
 block(c,"Ringkasan",ev.description);block(c,"Mengapa penting",ev.transmission||ev.analysisShort);
 block(c,"Jika hasil di atas prediksi",ev.ifAbove);block(c,"Jika hasil di bawah prediksi",ev.ifBelow);
 block(c,"Yang perlu dipantau",ev.detailedWatch||ev.whatToWatch);
 const foot=html("div","ka-dialog-sources");link(foot,"Jadwal resmi",ev.source);link(foot,"Sumber prediksi",ev.forecastSource);link(foot,"Sumber aktual",ev.actualSource);c.append(foot);
}
function news(item,analysis){
 const done=analysis?.status==="ai-full-article"&&analysis.url===item.url;
 const c=modal((item.source||"Berita pasar")+" · "+new Date(item.publishedAt).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric",timeZone:"Asia/Jakarta"}),item.title);
 c.append(html("p",done?"ka-ai-verified":"ka-ai-context",done?"Analisis dari isi sumber asli, bukan sekadar judul":"Buka berita ini untuk memperoleh analisis bersumber; arah tidak boleh ditebak dari judul."));
 if(done){
  block(c,"Inti berita",analysis.summary);
  block(c,"Fakta penting",(analysis.keyFacts||[]).join("\n"));
  block(c,"Arah kebijakan",analysis.policyDirection+" — "+analysis.policyEvidence);
  block(c,"Ekspektasi pasar",analysis.expectationComparison);
  block(c,"Mengapa pasar dapat bergerak",analysis.macroMechanism);
  block(c,"Yang berpotensi diuntungkan",analysis.benefits);
  block(c,"Yang berpotensi dirugikan",analysis.harms);
  for(const effect of (analysis.marketEffects||[]))block(c,"Dampak "+effect.symbol+" ("+effect.direction+")",effect.reason);
  block(c,"Skenario dekat",analysis.shortTerm);
  block(c,"Skenario menengah",analysis.mediumTerm);
  block(c,"Bukti dari sumber",analysis.sourceQuote);
  block(c,"Konfirmasi",analysis.watch);
  block(c,"Ketidakpastian",analysis.uncertainty);
 }else block(c,"Status analisis","Ringkasan isi lengkap belum tervalidasi; tidak ada dampak pasar yang dikarang.");
 const foot=html("div","ka-dialog-sources");link(foot,"Baca sumber asli",item.url);c.append(foot);
}

function miniEvent(ev){
 const button=html("button","ka-release");button.type="button";button.setAttribute("aria-label","Buka analisa "+ev.title);
 const top=html("div","ka-release-top");const stamp=new Date(ev.dateWIB+"T12:00:00Z");const date=Number.isFinite(stamp.getTime())?stamp.toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}):ev.dateWIB;top.append(html("span",null,"Rilis "+date+" · "+ev.timeWIB+" WIB"),html("span",null,ev.region||""));
 button.append(top,html("strong","ka-release-title",ev.title));
 const m=html("div","ka-release-metrics");
 for(const [k,v] of [["Aktual",ev.actual===null||ev.actual===undefined?"Belum rilis":ev.actualSource?ev.actual:"—"],["Prediksi",ev.forecast&&ev.forecastSource?ev.forecast:"—"],["Sebelumnya",ev.previous&&ev.previousSource?ev.previous:"—"]]){const cell=html("div",null);cell.append(html("span",null,k),html("b",null,v));m.append(cell)}
 button.append(m,html("span","ka-release-bottom","Buka analisa dan skenario →"));button.addEventListener("click",()=>event(ev));return button;
}
document.addEventListener("DOMContentLoaded",nav);
window.KatarinaUI={openEvent:event,openNews:news,releaseButton:miniEvent};
})();