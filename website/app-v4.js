/* KATARINA Workbench v4 — source-grounded, pair-aware research for 34 instruments. */
(()=>{"use strict";
const $=id=>document.getElementById(id),e=(tag,cls,value)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(value!==undefined)x.textContent=String(value);return x};
const text=(id,v)=>{const node=$(id);if(node)node.textContent=String(v??"—")};
const fmt=(v,symbol)=>Number(v).toLocaleString("id-ID",{minimumFractionDigits:0,maximumFractionDigits:/JPY$/.test(symbol)?3:/^[A-Z]{6}$/.test(symbol)&&!/(XAU|XAG|BTC)/.test(symbol)?5:2});
const pct=x=>(x>=0?"+":"")+x.toFixed(2)+"%";
const presentDate=t=>{try{return new Date(t).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric",timeZone:"Asia/Jakarta"})}catch{return "—"}};
const routes=new Map([["XAUUSD","xau"],["XAGUSD","silver"],["BTCUSD","bitcoin"],["US30","us30"],["US500","sp500"],["NASDAQ","nasdaq"]]);
const tvSymbol={XAUUSD:"OANDA:XAUUSD",XAGUSD:"OANDA:XAGUSD",BTCUSD:"BITSTAMP:BTCUSD",US30:"TVC:DJI",US500:"SP:SPX",NASDAQ:"NASDAQ:IXIC"};
const regions={USD:"The Fed / AS",JPY:"Bank of Japan",EUR:"ECB / Zona Euro",GBP:"Bank of England",CHF:"Swiss National Bank",CAD:"Bank of Canada",AUD:"RBA / Australia",NZD:"RBNZ / Selandia Baru"};
const factors={
 USD:["Keputusan Fed, inflasi CPI/PCE, data lapangan kerja","Yield Treasury dua dan sepuluh tahun, arus dolar global"],
 JPY:["Normalisasi suku bunga BoJ, inflasi dan upah Jepang","Potensi intervensi yen, selisih yield AS–Jepang"],
 EUR:["Suku bunga ECB, HICP dan pertumbuhan Zona Euro","Spread yield Eropa, risiko fiskal dan PMI"],
 GBP:["Kebijakan Bank of England, inflasi jasa dan upah Inggris","Gilt yield, pertumbuhan Inggris dan pembiayaan fiskal"],
 CHF:["Kebijakan SNB, inflasi Swiss dan permintaan safe haven","Sentimen risiko Eropa serta sensitivitas CHF terhadap intervensi"],
 CAD:["Bank of Canada, tenaga kerja dan CPI Kanada","Harga minyak, ekspor energi serta yield AS–Kanada"],
 AUD:["RBA, CPI dan pasar tenaga kerja Australia","Aktivitas ekonomi China, bijih besi dan selera risiko"],
 NZD:["RBNZ, inflasi dan ketenagakerjaan Selandia Baru","Aktivitas China, harga susu dan selera risiko"]
};
const commodities={XAUUSD:["Yield riil dan indeks dolar AS","Kebijakan Fed serta permintaan safe haven","Pembelian bank sentral dan geopolitik"],XAGUSD:["Permintaan industri, logam dasar dan energi","Yield riil dan indeks dolar","Posisi logam berharga dan volatilitas emas"],BTCUSD:["Arus institusional, likuiditas global dan selera risiko","Kebijakan moneter AS dan regulasi aset digital","Pasokan dan volatilitas pasar kripto"],US30:["Yield obligasi AS dan ekspektasi Fed","Laba korporasi, siklus ekonomi dan kredit","Sektor industri/keuangan, harga energi"],US500:["Laba emiten AS, breadth dan valuasi","Yield riil serta kebijakan moneter Fed","Pertumbuhan konsumsi dan premi risiko"],NASDAQ:["Yield obligasi dan valuasi saham teknologi","Laba teknologi, AI dan pengeluaran modal","Likuiditas pasar serta arah suku bunga"]};
const safeUrl=u=>{try{const v=new URL(u);return v.protocol==="https:"?v.href:null}catch{return null}};
const get=async url=>{const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw Error("HTTP "+r.status);return r.json()};
const page=document.body.dataset.page||"dashboard";
let market=null,context=[],calendar=[],selected="XAUUSD",liveReq=0,feed=[],cot=null,official=[],candle=null,profile=null,latest=null;
function showDialog(kicker,title){const d=$("detail-dialog"),b=$("dialog-content");if(!d||!b)return null;text("dialog-label",kicker);b.replaceChildren(e("h2",null,title));try{d.showModal()}catch{d.setAttribute("open","")};return b}
function addBlock(root,title,value){if(!root||!value)return;const box=e("section","block");box.append(e("h3",null,title),e("p",null,value));root.append(box)}
function addLink(root,title,url){const src=safeUrl(url);if(!src||!root)return;const a=e("a",null,title+" ↗");a.href=src;a.target="_blank";a.rel="noopener noreferrer";root.append(a)}
function showEvent(ev){
 const b=showDialog("AGENDA EKONOMI · "+(ev.region||""),ev.title);if(!b)return;
 const m=e("div","modal-metrics");
 const value=[["Aktual",ev.actual===null||ev.actual===undefined?"Belum rilis":ev.actualSource?ev.actual:"Belum diverifikasi"],["Prediksi",ev.forecast&&ev.forecastSource?ev.forecast:"Tidak tersedia"],["Sebelumnya",ev.previous&&ev.previousSource?ev.previous:"Tidak tersedia"]];
 for(const [k,v]of value){const x=e("div");x.append(e("small",null,k),e("strong",null,v));m.append(x)}b.append(m);
 addBlock(b,"Waktu rilis",presentDate(ev.dateWIB+"T12:00:00+07:00")+" · "+ev.timeWIB+" WIB");
 addBlock(b,"Mengapa relevan",ev.transmission||ev.description);
 addBlock(b,"Jika melampaui prediksi",ev.ifAbove||ev.analysisShort);
 addBlock(b,"Jika lebih rendah",ev.ifBelow||ev.conditional);
 addBlock(b,"Konfirmasi pasar",ev.detailedWatch||ev.whatToWatch);
 addLink(b,"Jadwal resmi",ev.source);addLink(b,"Sumber konsensus",ev.forecastSource);
}
function specificImpact(item,symbol){
 const title=String(item.title||"").toLowerCase(),pair=String(symbol||"XAUUSD");
 const base=pair.slice(0,3),quote=pair.slice(3),usd=pair.includes("USD"),jpy=pair.includes("JPY");
 if(/lisa cook/i.test(title))
  return "Polemik Lisa Cook bisa memicu perdebatan soal independensi The Fed. Untuk "+pair+", pengaruhnya baru berarti kalau ekspektasi suku bunga dan yield AS ikut berubah.";
 if(/judy shelton/i.test(title))
  return "Masuknya penasihat ekonomi bukan otomatis perubahan kebijakan Fed. Pantau apakah pasar obligasi menilai ini sebagai sinyal baru untuk dolar dan "+pair+".";
 if(/\b(fed|federal reserve|fomc|powell)\b/i.test(title))
  return "Isu The Fed bisa menggeser ekspektasi suku bunga dolar. Pantau yield Treasury: kalau USD menguat relatif mata uang lawan, "+pair+" berpotensi "+(base==="USD"?"naik":quote==="USD"?"turun":"ikut berubah")+".";
 if(/\b(treasury|bond|obligation|yield|bessent|obligasi|surat utang)\b/i.test(title))
  return "Perubahan imbal hasil obligasi memengaruhi daya tarik mata uang. Untuk "+pair+", bandingkan yield kedua negara agar arah pengaruhnya lebih jelas.";
 if(/\b(boj|bank of japan|japan|japanese|yen|ueda|tankan)\b/i.test(title)||item.market==="JPY")
  return "Perubahan sikap BoJ atau ekonomi Jepang bisa menggerakkan yen. "+(jpy?"Jika yen menguat relatif pasangannya, "+pair+" cenderung "+(quote==="JPY"?"turun.":"naik."):"Reaksinya perlu dibandingkan dengan suku bunga dan sentimen risiko.");
 if(/\b(ecb|lagarde|eurozone|european central bank|euro)\b/i.test(title)||item.market==="EUR")
  return "Pernyataan ECB dapat mengubah perkiraan suku bunga euro. "+(pair.includes("EUR")?"Jika euro menguat relatif lawan, "+pair+" berpotensi "+(base==="EUR"?"naik.":"turun."):"Perhatikan pasar obligasi Eropa dan valas.");
 if(/\b(boe|bank of england|uk inflation|british|sterling|pound)\b/i.test(title)||item.market==="GBP")
  return "Sentimen tentang BoE dan inflasi Inggris berdampak pada pound. Jika GBP menguat relatif terhadap pasangannya, arah "+pair+" bergantung pada apakah GBP berada di depan atau belakang pasangan.";
 if(/\b(inflation|cpi|ppi|consumer price|harga konsumen|inflasi)\b/i.test(title))
  return "Data inflasi yang berbeda dari ekspektasi bisa menggeser perkiraan suku bunga. "+pair+" biasanya bereaksi setelah yield dan mata uang pembentuknya bergerak.";
 if(/\b(oil|crude|iran|houthi|war|conflict|geopolitic|saudi|russia|perang|minyak)\b/i.test(title))
  return "Kabar geopolitik bisa memicu perpindahan dana ke aset aman dan menggerakkan minyak. "+(jpy?"Yen juga sensitif saat pasar menghindari risiko.":usd?"Pantau reaksi dolar, emas, dan yield AS.":"Dampaknya lewat selera risiko dan mata uang terkait.");
 if(/\b(stock|stocks|wall street|equity|nasdaq|shares|market|saham|pasar modal)\b/i.test(title))
  return "Perubahan minat risiko di saham dapat merambat ke mata uang. "+(jpy?"Yen sering dipantau ketika investor mengurangi risiko.":"Periksa apakah efeknya benar-benar muncul pada "+pair+".");
 if(item.market){
  const pos=item.market===base?"di depan":item.market===quote?"di belakang":"dalam penggerak makro";
  return "Kebijakan "+item.market+" berada "+pos+" pasangan "+pair+". Jika mata uang ini menguat terhadap pasangannya, harga akan ikut bereaksi. Lihat keputusan resminya dulu.";
 }
 return item.impact?.slice(0,220)||"Kabar ini bisa mengubah ekspektasi pasar. Pastikan reaksinya terlihat pada yield, sentimen, dan harga "+pair+".";
}
function showNews(item,index){
 const b=showDialog((item.source||"Berita pasar")+" · "+presentDate(item.publishedAt),item.titleId||item.title);if(!b)return;
 if(item.titleId&&item.titleId!==item.title)addBlock(b,"Judul asli penerbit",item.title);
 if(page==="research")addBlock(b,"Apa dampaknya ke "+selected+"?",specificImpact(item,selected));
 if(item.essence)addBlock(b,"Intinya",item.essence);
 if(item.impact)addBlock(b,"Dampak yang mungkin terjadi",item.impact);
 if(item.watch)addBlock(b,"Yang perlu diperhatikan",item.watch);
 if(item.market&&!item.essence){
  const cur=item.market,part=selected.startsWith(cur)?"mata uang dasar":selected.endsWith(cur)?"mata uang pembanding":"salah satu pemicu makro";
  addBlock(b,"Pengaruh ke "+selected,"Kabar dari otoritas "+cur+" berkaitan dengan "+part+" dalam "+selected+". Jika kebijakan membuat "+cur+" menguat relatif terhadap pasangannya, "+selected+" bisa "+(selected.startsWith(cur)?"naik":selected.endsWith(cur)?"turun":"berubah arah")+". Arah akhirnya tetap harus dilihat dari isi keputusan dan reaksi harga.");
 }
 addLink(b,"Baca berita aslinya",item.url);
 const originalIdx=feed.findIndex(x=>x.url===item.url);
 if(item.url&&originalIdx>=0&&originalIdx<2&&!item.market){
  const note=e("p",null,"Memeriksa isi artikelnya…");b.append(note);
  get("/api/ai-news?index="+originalIdx).then(a=>{if(!b.isConnected)return;if(a.status==="ai-full-article"&&a.url===item.url){
   note.textContent="Ringkasan berdasarkan isi artikel penerbit";
   addBlock(b,"Fakta utama",a.summary);addBlock(b,"Apa pemicunya?",a.drivers);addBlock(b,"Dampak untuk pasar",a.impact);addBlock(b,"Yang perlu dipantau",a.watch);addBlock(b,"Yang belum pasti",a.uncertainty);
  }else note.textContent="Isi lengkap artikel belum berhasil dianalisis."}).catch(()=>{if(note.isConnected)note.textContent="Ringkasan lengkap belum tersedia."});
 }
}
function eventCard(ev){
 const btn=e("button","event-card");btn.type="button";btn.append(e("span","date",presentDate(ev.dateWIB+"T12:00:00+07:00")+" · "+ev.timeWIB+" WIB"),e("strong",null,ev.title));
 const numbers=e("div","event-numbers");
 for(const [k,v]of [["Aktual",ev.actual===null||ev.actual===undefined?"Belum rilis":ev.actualSource?ev.actual:"—"],["Prediksi",ev.forecast&&ev.forecastSource?ev.forecast:"—"],["Sebelumnya",ev.previous&&ev.previousSource?ev.previous:"—"]]){const col=e("span",null,k);col.append(e("b",null,v));numbers.append(col)}
 btn.append(numbers,e("span","read","Lihat analisa →"));btn.addEventListener("click",()=>showEvent(ev));return btn;
}
function newsCard(item,index,officialItem=false){
 const btn=e("button",officialItem?"pair-news-card":"news-card");btn.type="button";
 btn.append(e("span",officialItem?"date":"news-top",(item.source||"Berita pasar")+" · "+presentDate(item.publishedAt)),
 e("strong",null,item.titleId||item.title));
 if(!officialItem&&item.essence&&page==="dashboard")btn.append(e("p",null,item.essence.replace(/^Pokok isu:\s*/i,"")));
 if(page==="research"){
  const blurb=specificImpact(item,selected);
  if(blurb)btn.append(e("small","impact-brief","Dampak: "+blurb.slice(0,235)));
 }
 btn.append(e("span","read","Baca dampaknya →"));btn.addEventListener("click",()=>showNews(item,index));return btn;
}
function menu(){
 const panel=$("menu-sheet"),back=$("menu-backdrop"),open=$("menu-toggle");
 const close=()=>{if(panel)panel.hidden=true;if(back)back.hidden=true;open?.setAttribute("aria-expanded","false")};
 const show=()=>{if(panel)panel.hidden=false;if(back)back.hidden=false;open?.setAttribute("aria-expanded","true")};
 open?.addEventListener("click",()=>panel?.hidden?show():close());
 $("dock-more")?.addEventListener("click",show);$("menu-close")?.addEventListener("click",close);back?.addEventListener("click",close);
 $("dialog-close")?.addEventListener("click",()=>$("detail-dialog")?.close());
 $("chooser-close")?.addEventListener("click",()=>$("chooser-dialog")?.close());
 for(const id of ["detail-dialog","chooser-dialog"]){const d=$(id);d?.addEventListener("click",ev=>{if(ev.target===d)d.close()})}
}
function items(){
 const sorted=[...context].sort((a,b)=>a.id.localeCompare(b.id));
 return sorted.length?sorted:[{id:"XAUUSD",label:"XAUUSD",chart:"xau",headline:"Emas spot",drivers:commodities.XAUUSD}];
}
function pick(){
 const d=$("chooser-dialog"),search=$("pair-search"),box=$("pair-options");if(!d||!box)return;
 const draw=()=>{
  box.replaceChildren();const q=(search.value||"").trim().toLowerCase();
  for(const p of items().filter(x=>!q||String(x.id+" "+x.label+" "+x.asset).toLowerCase().includes(q))){
   const b=e("button");b.type="button";b.append(e("b",null,p.id),e("small",null,String(p.label||"").replace(p.id,"").trim()));
   b.addEventListener("click",()=>{selected=p.id;try{localStorage.setItem("katarina-selected-symbol",selected)}catch{}d.close();const url=new URL(location.href);url.searchParams.set("symbol",selected);history.replaceState(null,"",url);renderResearch()});box.append(b)}
  if(!box.children.length)box.append(e("div","empty-state","Instrumen tidak ditemukan"));
 };
 search.value="";draw();search.oninput=draw;d.showModal();setTimeout(()=>search.focus(),30);
}
function signal(bars){
 if(!bars||bars.length<24)return null;
 const complete=bars.filter(x=>Array.isArray(x)&&x.length>=5&&x.slice(1).every(Number.isFinite));
 if(complete.length<24)return null;
 const last=complete.at(-1),prior=complete.at(-2),recent=complete.slice(-21,-1),twenty=complete.slice(-20);
 const close=last[4],prev=prior[4],support=Math.min(...recent.map(x=>x[3])),resistance=Math.max(...recent.map(x=>x[2])),avg=twenty.reduce((s,x)=>s+x[4],0)/20;
 const change=(close/prev-1)*100,week=(close/complete.at(-6)[4]-1)*100;
 const recentRange=Math.max(.000001,resistance-support),level=(close-support)/recentRange,lead=close>avg&&week>0?"menguat":close<avg&&week<0?"melemah":"berkonsolidasi";
 const atr=complete.slice(-14).reduce((s,x,i)=>{const y=complete.at(-(15-i))?.[4]||x[1];return s+Math.max(x[2]-x[3],Math.abs(x[2]-y),Math.abs(x[3]-y))},0)/14;
 return {last,close,support,resistance,avg,change,week,lead,level,atr,asOf:new Date(last[0]*1000),stale:Date.now()-last[0]*1000>10*86400000};
}
function priceSeries(p){return market?.series?.[p.chart||routes.get(p.id)||p.id.toLowerCase()]?.bars||null}
function profileFor(s){return context.find(p=>p.id===s)||{id:s,label:s,chart:routes.get(s)||s.toLowerCase(),headline:"Faktor pasar "+s,drivers:[],monitor:""}}
function macro(p){
 const id=p.id;if(commodities[id])return commodities[id];
 const b=id.slice(0,3),q=id.slice(3);
 return [(regions[b]||b)+": "+(factors[b]?.[0]||"kebijakan moneter"),(regions[q]||q)+": "+(factors[q]?.[0]||"kebijakan moneter"),"Spread relatif "+b+"/"+q+": "+(factors[b]?.[1]||b)+" dibandingkan "+(factors[q]?.[1]||q)];
}
function eventRelevant(ev,symbol){
 if(!ev?.dateWIB||!ev.source)return false;
 const validDate=Date.parse(ev.dateWIB+"T00:00:00+07:00");if(!Number.isFinite(validDate)||Date.now()-validDate>2*86400000)return false;
 const region=String(ev.region||"").toUpperCase();
 const us=region==="AS"||region==="US";const jap=/JEPANG|JAPAN/.test(region),eur=/EURO/.test(region),uk=/INGGRIS|UK/.test(region);
 if(commodities[symbol])return us||Number(ev.instrumentImpact?.[symbol]||0)>=3;
 return us&&symbol.includes("USD")||jap&&symbol.includes("JPY")||eur&&symbol.includes("EUR")||uk&&symbol.includes("GBP")||Number(ev.instrumentImpact?.[symbol]||0)>=3;
}
function pairEvents(symbol){
 return calendar.filter(x=>eventRelevant(x,symbol)).sort((a,b)=>String(a.dateWIB+a.timeWIB).localeCompare(String(b.dateWIB+b.timeWIB))).slice(0,5);
}
const svgns="http://www.w3.org/2000/svg";
function makeSpark(bars,id,large=false){
 const last=(bars||[]).filter(x=>Array.isArray(x)&&Number.isFinite(x[4])).slice(large?-42:-32);
 if(last.length<8)return null;
 const w=large?430:180,h=large?105:53,v=last.map(x=>x[4]),hi=Math.max(...v),lo=Math.min(...v),span=Math.max(1e-8,hi-lo);
 const svg=document.createElementNS(svgns,"svg");svg.setAttribute("viewBox","0 0 "+w+" "+h);svg.setAttribute("role","img");svg.setAttribute("aria-label","Riwayat penutupan historis "+id);
 const pts=v.map((x,i)=>(6+i*(w-12)/(v.length-1))+","+(6+(hi-x)/span*(h-12))).join(" ");
 const grid=document.createElementNS(svgns,"line");grid.setAttribute("x1","0");grid.setAttribute("x2",String(w));grid.setAttribute("y1",String(h/2));grid.setAttribute("y2",String(h/2));grid.setAttribute("stroke","#547889");grid.setAttribute("stroke-opacity",".22");svg.append(grid);
 const poly=document.createElementNS(svgns,"polyline");poly.setAttribute("points",pts);poly.setAttribute("fill","none");poly.setAttribute("stroke",v.at(-1)>=v[0]?"#65decf":"#ef99a7");poly.setAttribute("stroke-width",large?"3.5":"2.5");poly.setAttribute("stroke-linejoin","round");poly.setAttribute("stroke-linecap","round");svg.append(poly);
 return svg;
}
function renderDashboard(){
 const gold=profileFor("XAUUSD"),goldBars=priceSeries(gold),s=signal(goldBars);
 text("hero-gold",s?fmt(s.close,"XAUUSD"):"—");text("hero-gold-change",s?pct(s.change):"—");$("hero-gold-change")?.classList.toggle("negative",Boolean(s&&s.change<0));
 text("hero-gold-time",s?"Penutupan "+presentDate(s.asOf):"Harga historis belum tersedia");
 const goldMini=$("hero-mini-chart");if(goldMini){goldMini.replaceChildren();const art=makeSpark(goldBars,"XAUUSD",true);if(art)goldMini.append(art)}
 const grid=$("dashboard-pairs");if(grid)grid.replaceChildren();
 const focusPair=(()=>{try{return localStorage.getItem("katarina-selected-symbol")||"USDJPY"}catch{return "USDJPY"}})();
 const focusProfile=profileFor(focusPair),d=signal(priceSeries(focusProfile));
 const group=["EURUSD","USDJPY","GBPUSD","USDCAD","AUDUSD","XAGUSD","BTCUSD","EURGBP"].filter(id=>id!==focusPair&&id!=="XAUUSD").slice(0,6);
 for(const id of group){
  const p=profileFor(id),bars=priceSeries(p),a=signal(bars);if(!a||!grid)continue;
  const link=e("a","pick-card");link.href="/research?symbol="+id;
  const brief=a.lead==="menguat"?"Harga sedang menguat":a.lead==="melemah"?"Harga sedang melemah":"Harga masih berkonsolidasi";
  link.append(e("small",null,p.label||id),e("strong",null,fmt(a.close,id)),e("em",a.change>=0?"positive":"negative",pct(a.change)));
  const spark=makeSpark(bars,id);if(spark){spark.classList.add("pick-spark");if(a.change<0)spark.classList.add("negative");link.append(spark)}
  link.append(e("small",null,brief+" · "+presentDate(a.asOf)));grid.append(link);
 }
 const next=calendar.filter(x=>x.dateWIB>=new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Jakarta"})).sort((a,b)=>a.dateWIB.localeCompare(b.dateWIB)).slice(0,2);
 text("focus-title",d?focusPair+" · "+(d.lead==="menguat"?"Menguat, pantau kelanjutannya":d.lead==="melemah"?"Melemah, perhatikan pemulihannya":"Masih mencari arah"):focusPair+" · Menunggu data");
 text("focus-detail",macro(focusProfile).slice(0,2).join(". ")+". Baca skenario lengkap untuk melihat area penting dan pemicu risikonya.");
 text("focus-label",d?"Kondisi harga · "+presentDate(d.asOf):"Harga belum tersedia");
 const focusLink=document.querySelector(".lead-card .focus-foot a");if(focusLink)focusLink.href="/research?symbol="+encodeURIComponent(focusPair);
 const events=$("dash-events");if(events){events.replaceChildren();for(const x of next)events.append(eventCard(x));if(!next.length)events.append(e("p","empty-state","Belum ada agenda ekonomi terverifikasi."))}
 const news=$("dashboard-news");if(news){news.replaceChildren();for(const [idx,item]of feed.slice(0,9).entries())news.append(newsCard(item,idx));if(!feed.length)news.append(e("p","empty-state","Belum ada berita terbaru yang bisa diverifikasi."))}
}
function drawTV(symbol){
 const host=$("tv-host-v4");if(!host)return;
 const chart=tvSymbol[symbol]||(symbol==="EURUSD"?"OANDA:EURUSD":"FX:"+symbol);
 const open=$("tv-open");if(open)open.href="https://www.tradingview.com/chart/?symbol="+encodeURIComponent(chart);
 host.replaceChildren();
 const wrapper=e("div","tradingview-widget-container"),inside=e("div","tradingview-widget-container__widget");inside.style.cssText="width:100%;height:100%";wrapper.append(inside);wrapper.style.cssText="width:100%;height:100%";host.append(wrapper);
 const script=document.createElement("script");script.src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";script.async=true;
 script.textContent=JSON.stringify({autosize:true,symbol:chart,interval:"60",timezone:"Asia/Jakarta",theme:"dark",style:"1",locale:"id",hide_top_toolbar:false,hide_side_toolbar:false,allow_symbol_change:false,withdateranges:true,save_image:true,backgroundColor:"#0c1824",gridColor:"rgba(90,126,148,0.13)",hide_volume:true,details:false,calendar:false,watchlist:[],studies:[]});
 script.onerror=()=>{host.append(e("div","empty-state","Grafik penyedia tidak dapat dimuat. Gunakan Buka layar penuh."))};
 wrapper.append(script);
}
window.KatarinaRenderTV=drawTV;
function renderCot(symbol){
 const box=$("cot-box");if(!box)return;box.replaceChildren();
 if(!cot||cot.symbol!==symbol||!Array.isArray(cot.data)||!cot.data.length){
  box.append(e("p","empty-state","Data posisi futures yang relevan untuk "+symbol+" belum tersedia. Tidak semua pair spot punya kontrak COT langsung."));
  return;
 }
 const data=new Map(cot.data.map(x=>[x.currency,x]));
 const cn=x=>Number(x).toLocaleString("id-ID",{maximumFractionDigits:1});
 for(const x of cot.data){
  const row=e("div","cot-row"),left=e("div");
  left.append(e("b",null,x.currency+" · "+(x.netContracts>0?"Lebih banyak beli":"Lebih banyak jual")),
   e("small",null,"Per "+presentDate(x.asOf+"T12:00:00Z")+" · "+(x.report?.includes("Managed")?"pelaku spekulatif logam":"pelaku leveraged money")));
  const exposure=e("div","cot-values");
  exposure.append(e("strong",x.netContracts>=0?"positive":"negative",(x.netContracts>=0?"+":"")+cn(x.netContracts)+" kontrak"),
  e("small",null,(x.netPctOI>=0?"+":"")+cn(x.netPctOI)+"% dari open interest"));
  row.append(left,exposure);box.append(row);
 }
 const base=symbol.slice(0,3),quote=symbol.slice(3),lhs=data.get(base),rhs=data.get(quote);
 let title="Artinya untuk "+symbol+":",body="";
 if(symbol==="XAUUSD"||symbol==="XAGUSD"){
  const x=data.get(symbol==="XAUUSD"?"GOLD":"SILVER");
  if(x)body=x.netContracts>0?"Pelaku spekulatif masih memegang posisi beli bersih di futures "+x.contract+". Ini menunjukkan kecenderungan posisi mendukung logam, tetapi kalau posisi sudah terlalu ramai, risiko koreksi juga meningkat. Bandingkan dengan yield riil dan arah dolar.":"Di futures "+x.contract+", posisi jual lebih dominan daripada beli. Ini dapat menunjukkan kehati-hatian terhadap logam; penguatan mendadak tetap bisa memicu penutupan posisi jual. Perhatikan yield AS dan dolar.";
 }else if(lhs&&rhs){
  const spread=lhs.netPctOI-rhs.netPctOI;
  body="Untuk "+symbol+", kita bandingkan kontrak "+base+" dengan "+quote+", bukan menjumlahkan kontrak mentah. "+base+" tercatat "+cn(lhs.netPctOI)+"% open interest dan "+quote+" "+cn(rhs.netPctOI)+"%. "+
  (spread>1?"Secara relatif, posisi spekulatif lebih mendukung "+base+"; ini bisa memberi tekanan naik pada "+symbol+".":spread< -1?"Secara relatif, posisi spekulatif lebih mendukung "+quote+"; ini bisa memberi tekanan turun pada "+symbol+".":"Kekuatan posisinya relatif berimbang; COT belum memberi keunggulan arah yang jelas.")+
  " Konfirmasi tetap perlu lewat harga dan faktor makro.";
 }else if(rhs){
  body="Kita punya COT futures "+quote+", bukan kontrak spot "+symbol+". "+(rhs.netContracts<0?"Posisi jual bersih "+quote+" lebih besar. Kalau mata uang pembanding melemah, "+symbol+" punya peluang menguat.":"Posisi beli bersih "+quote+" lebih besar. Kalau mata uang pembanding menguat, "+symbol+" berpotensi tertekan.")+
  " Ini hanya petunjuk positioning; arah dolar dan suku bunga juga menentukan.";
 }else if(lhs){
  body="Posisi futures "+base+" sedang "+(lhs.netContracts>=0?"lebih banyak beli":"lebih banyak jual")+". Jika "+base+" menguat relatif terhadap "+quote+", "+symbol+" berpotensi naik; kalau melemah bisa sebaliknya. Data "+quote+" belum tersedia sehingga pembandingnya belum lengkap.";
 }else{body="Belum tersedia pasangan kontrak futures yang cukup untuk menilai "+symbol+" secara relatif."}
 const info=e("div","cot-explanation");info.append(e("strong",null,title),e("p",null,body));box.append(info);
 box.append(e("p","cot-meta-note","COT adalah snapshot mingguan posisi futures, bukan aliran order real-time. Nilai bersih = kontrak beli dikurangi jual. Positif bukan jaminan harga naik."));
}
function renderResearch(){
 const token=++liveReq,p=profileFor(selected),bars=priceSeries(p),s=signal(bars);
 if(profile!==selected){profile=selected;drawTV(selected)}
 text("pair-symbol",selected);text("pair-market",p.asset||p.label||selected);text("pair-heading",p.label||selected);text("pair-headline",p.headline||"Faktor pasar "+selected);
 text("pair-week-change",s?pct(s.week):"—");
 text("pair-last",s?fmt(s.close,selected):"—");text("pair-move",s?pct(s.change):"—");$("pair-move")?.classList.toggle("negative",Boolean(s&&s.change<0));
 text("pair-asof",s?"Penutupan sumber "+presentDate(s.asOf)+(s.stale?" · perlu pembaruan":""):"Harga belum tersedia");
 text("technical-state",s?({menguat:"Penguatan",melemah:"Pelemahan",berkonsolidasi:"Konsolidasi"}[s.lead]):"Data kurang");
 text("support",s?fmt(s.support,selected):"—");text("resistance",s?fmt(s.resistance,selected):"—");text("weekly-bias",s?s.lead:"Belum tersedia");
 text("sr-low",s?fmt(s.support,selected):"—");text("sr-middle",s?fmt(s.avg,selected):"—");text("sr-high",s?fmt(s.resistance,selected):"—");
 text("plan-heading","Skenario "+selected+" pekan ini");
 const drivers=macro(p),struct=s?"Penutupan "+fmt(s.close,selected)+" berada "+(s.close>=s.avg?"di atas":"di bawah")+" rerata 20 sesi "+fmt(s.avg,selected)+". Rentang pengamatan "+fmt(s.support,selected)+"–"+fmt(s.resistance,selected)+"; perubahan 5 sesi "+pct(s.week)+".":"Data historis belum cukup untuk menentukan struktur "+selected+".";
 text("structure-explain",struct);
 text("scenario-up",s?"Jika "+selected+" ditutup konsisten melewati "+fmt(s.resistance,selected)+" dan pullback bertahan, kelanjutan penguatan layak diamati. Korelasi: "+drivers[0]+".":"Tunggu struktur dan konfirmasi harga.");
 text("scenario-down",s?"Jika "+selected+" berulang kali ditolak di atas dan kehilangan "+fmt(s.support,selected)+", amati tekanan ke rentang bawah. Risiko pembalik: "+drivers[1]+".":"Tunggu struktur dan konfirmasi harga.");
 text("scenario-risk",s?"Invalidasi skenario: penutupan berlawanan yang bertahan; volatilitas rata-rata 14 sesi sekitar "+fmt(s.atr,selected)+". Level ini dihitung dari candle historis, bukan garis otomatis pada TradingView atau target pasti.":"Tidak ada level valid tanpa candle.");
 const drv=$("pair-drivers");if(drv){drv.replaceChildren();for(const [i,x]of drivers.entries()){const row=e("div","driver");row.append(e("b",null,"0"+(i+1)+" / "),document.createTextNode(x));drv.append(row)}}
 const sentiment=$("sentiment-map");if(sentiment){sentiment.replaceChildren();const metrics=[
  ["Struktur harga",s?(s.lead==="menguat"?"Cenderung naik":s.lead==="melemah"?"Cenderung turun":"Berimbang"):"Belum cukup",s?(s.lead==="menguat"?77:s.lead==="melemah"?23:50):50],
  ["Momentum 5 sesi",s?(s.week>=.25?"Positif":s.week<=-.25?"Negatif":"Netral"):"Belum cukup",s?Math.max(10,Math.min(90,50+s.week*6)):50],
  ["Faktor moneter",(selected.length===6&&!commodities[selected]?selected.slice(0,3)+" vs "+selected.slice(3):"Makro global"),null]];
  for(const [k,val,progress]of metrics){const row=e("div","sentiment-item"),bar=e("div","sentiment-bar"),line=e("i");line.style.width=(progress===null?0:progress)+"%";bar.append(line);row.append(e("span",null,k),bar,e("strong",null,val));sentiment.append(row)}
 }
 cot=null;renderCot(selected);
 const ev=$("pair-events");if(ev){ev.replaceChildren();const chosen=pairEvents(selected);for(const x of chosen)ev.append(eventCard(x));if(!chosen.length)ev.append(e("p","empty-state","Belum ada agenda terbaru yang spesifik terhadap "+selected+". Berita bank sentral tetap dipantau."))}
 const news=$("pair-news");if(news){news.replaceChildren(e("p","empty-state","Menelusuri sumber yang relevan untuk "+selected+"…"))}
 get("/api/cot?symbol="+encodeURIComponent(selected)).then(v=>{if(token!==liveReq)return;cot=v;renderCot(selected)}).catch(()=>{if(token===liveReq)renderCot(selected)});
 get("/api/pair-news?symbol="+encodeURIComponent(selected)).then(v=>{if(token!==liveReq)return;official=v?.items||[];renderPairNews();void localizeHeadlines(selected)}).catch(()=>{if(token===liveReq){official=[];renderPairNews()}});
 window.dispatchEvent(new CustomEvent("katarina:pair-change",{detail:{symbol:selected}}));
}
function renderSentimentCot(){ /* Penjelasan COT sekarang hanya ada di panel COT agar tidak berulang. */ }
const translatedScopes=new Map();
async function localizeHeadlines(scope){
 const key=scope.toUpperCase(),when=translatedScopes.get(key)||0;if(Date.now()-when<5*60000)return;
 translatedScopes.set(key,Date.now());
 try{
 const result=await get("/api/berita-id?symbol="+encodeURIComponent(key));
 if(!Array.isArray(result.items)||!result.items.length)return;
 const translated=new Map(result.items.filter(x=>x.titleId&&x.url).map(x=>[x.url,x.titleId]));
 if(key==="DASHBOARD"){
  for(const item of feed)if(translated.has(item.url))item.titleId=translated.get(item.url);
  if(page==="dashboard")renderDashboard();
 }else if(selected===key&&page==="research"){
  for(const item of official)if(translated.has(item.url))item.titleId=translated.get(item.url);
  if(translated.size>=8)official=official.filter(x=>Boolean(x.titleId));
  for(const item of feed)if(translated.has(item.url))item.titleId=translated.get(item.url);
  renderPairNews();
 }
 }catch{}
}
function renderPairNews(){
 const box=$("pair-news");if(!box)return;box.replaceChildren();
 let result=official;
 if(!result.length){
  const cc=selected.length===6&&!commodities[selected]?[selected.slice(0,3),selected.slice(3)]:["USD"];
  const pattern=new RegExp(cc.map(v=>({USD:"fed|dollar|treasury|inflation|cpi|us economy",JPY:"japan|yen|boj",EUR:"euro|ecb",GBP:"britain|pound|boe",AUD:"australia|rba|china",CAD:"canada|oil|boc",NZD:"zealand|rbnz|dairy",CHF:"swiss|snb"}[v]||v)).join("|"),"i");
  result=feed.filter(n=>pattern.test(n.title)).slice(0,6);
 }
 if(!result.length){box.append(e("p","empty-state","Belum ada pembaruan spesifik "+selected+" dari sumber yang terhubung."));return}
 const seenTopics=new Set();let count=0;
 for(const [i,x]of result.entries()){
  if(count>=16)break;
  const title=String(x.title||"").toLowerCase();
  const key=/lisa cook/.test(title)?"fed-lisa-cook":/judy shelton/.test(title)?"fed-shelton":null;
  if(key&&seenTopics.has(key))continue;
  if(key)seenTopics.add(key);
  box.append(newsCard(x,i,Boolean(x.market)));count++;
 }
}
async function start(){
 menu();
 if(page!=="research"&&page!=="dashboard")return;
 const [marketResult,contextResult,calendarResult,newsResult]=await Promise.allSettled(["/market-ohlc.json","/instrument-context.json","/calendar-brief.json","/api/hot-news"].map(get));
 market=marketResult.status==="fulfilled"&&marketResult.value.schema===1?marketResult.value:null;
 context=contextResult.status==="fulfilled"&&Array.isArray(contextResult.value.instruments)?contextResult.value.instruments:[];
 calendar=calendarResult.status==="fulfilled"&&Array.isArray(calendarResult.value.events)?calendarResult.value.events:[];
 feed=newsResult.status==="fulfilled"&&Array.isArray(newsResult.value.items)?newsResult.value.items:[];
 if(page==="dashboard"){renderDashboard();void localizeHeadlines("DASHBOARD");setInterval(async()=>{try{const fresh=await get("/api/hot-news");if(Array.isArray(fresh.items)){feed=fresh.items;renderDashboard();void localizeHeadlines("DASHBOARD")}}catch{}},15*60000)}
 else{
 const param=new URLSearchParams(location.search).get("symbol")?.toUpperCase()||"XAUUSD";
 selected=items().some(x=>x.id===param)?param:"XAUUSD";try{localStorage.setItem("katarina-selected-symbol",selected)}catch{}
 $("pair-choose")?.addEventListener("click",pick);
 renderResearch();
 setInterval(()=>{if(!document.hidden){get("/api/pair-news?symbol="+selected).then(x=>{official=x?.items||[];renderPairNews();void localizeHeadlines(selected)}).catch(()=>{})}},15*60000)
 }
}
document.addEventListener("DOMContentLoaded",()=>{start().catch(()=>{menu();text("pair-headline","Data sementara belum tersedia. Coba muat ulang halaman.")})});
})();