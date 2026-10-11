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
function showNews(item,index){
 const b=showDialog((item.source||"Berita ekonomi").toUpperCase()+" · "+presentDate(item.publishedAt),item.title);if(!b)return;
 if(item.essence)addBlock(b,"Konteks berita",item.essence);
 if(item.impact)addBlock(b,"Dampak makro potensial",item.impact);
 if(item.watch)addBlock(b,"Perlu dipantau",item.watch);
 if(item.market&&!item.essence)addBlock(b,"Kaitan ke "+selected,"Pernyataan ini berasal dari "+item.market+" dan terkait dengan salah satu faktor kebijakan instrumen. Detail dampak baru dapat disimpulkan setelah membaca berita sumber dan reaksi pasar.");
 addLink(b,"Buka sumber berita",item.url);
 if(item.url&&index<2&&!item.market){
 const note=e("p",null,"Memeriksa ringkasan artikel…");b.append(note);
 get("/api/ai-news?index="+index).then(a=>{if(!b.isConnected)return;if(a.status==="ai-full-article"&&a.url===item.url){
  note.textContent="Ringkasan berdasarkan isi artikel dari penerbit";addBlock(b,"Inti fakta",a.summary);addBlock(b,"Penggerak",a.drivers);addBlock(b,"Analisis dampak",a.impact);addBlock(b,"Pantauan",a.watch);addBlock(b,"Batasan",a.uncertainty);
 }else note.textContent="Analisis mendalam belum tersedia untuk berita ini."}).catch(()=>{if(note.isConnected)note.textContent="Ringkasan mendalam belum tersedia."});
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
 const top=e("span",officialItem?"date":"news-top",item.source+" · "+presentDate(item.publishedAt));btn.append(top,e("strong",null,item.title));
 if(!officialItem&&item.essence)btn.append(e("p",null,item.essence));
 btn.append(e("span","read",officialItem?"Baca sumber & konteks →":"Baca analisa →"));btn.addEventListener("click",()=>showNews(item,index));return btn;
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
   b.addEventListener("click",()=>{selected=p.id;d.close();const url=new URL(location.href);url.searchParams.set("symbol",selected);history.replaceState(null,"",url);renderResearch()});box.append(b)}
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
function renderDashboard(){
 const p=profileFor("XAUUSD"),s=signal(priceSeries(p));
 text("hero-gold",s?fmt(s.close,"XAUUSD"):"—");text("hero-gold-change",s?pct(s.change):"—");$("hero-gold-change")?.classList.toggle("negative",Boolean(s&&s.change<0));
 text("hero-gold-time",s?"Penutupan "+presentDate(s.asOf):"Harga historis belum tersedia");
 const strip=$("ticker-preview"),grid=$("dashboard-pairs");
 for(const box of [strip,grid])if(box)box.replaceChildren();
 for(const id of ["XAUUSD","EURUSD","USDJPY","GBPUSD","BTCUSD","XAGUSD"]){
  const p=profileFor(id),d=signal(priceSeries(p));if(!d)continue;
  if(strip){const a=e("a");a.href="/research?symbol="+id;a.append(e("b",null,id),e("span",null,fmt(d.close,id)),e("em",d.change>=0?"positive":"negative",pct(d.change)));strip.append(a)}
  if(grid){const a=e("a","pick-card");a.href="/research?symbol="+id;a.append(e("small",null,p.label||id),e("strong",null,fmt(d.close,id)),e("em",d.change>=0?"positive":"negative",pct(d.change)));grid.append(a)}
 }
 const d=signal(priceSeries(profileFor("USDJPY"))),next=calendar.filter(x=>x.dateWIB>=new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Jakarta"})).sort((a,b)=>a.dateWIB.localeCompare(b.dateWIB)).slice(0,2);
 text("focus-title",d?"USDJPY · "+(d.lead==="menguat"?"Yen dan selisih imbal hasil":d.lead==="melemah"?"Risiko koreksi dolar/yen":"Uji keseimbangan USD vs JPY"):"Perubahan arah yen dan dolar");
 text("focus-detail","Kondisi USDJPY mengikuti perkembangan kebijakan Fed–BoJ, posisi futures JPY dan respons yield AS. Buka terminal untuk skenario harga yang dapat diukur.");
 text("focus-label",d?"Struktur: "+d.lead+" · "+presentDate(d.asOf):"Pantau pasar");
 const events=$("dash-events");if(events){events.replaceChildren();for(const x of next)events.append(eventCard(x));if(!next.length)events.append(e("p","empty-state","Belum ada rilis mendatang terverifikasi."))}
 const news=$("dashboard-news");if(news){news.replaceChildren();for(const [i,x]of feed.slice(0,6).entries())news.append(newsCard(x,i));if(!feed.length)news.append(e("p","empty-state","Belum ada berita baru dari sumber terverifikasi."))}
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
function renderCot(symbol){
 const box=$("cot-box");if(!box)return;box.replaceChildren();
 if(!cot||cot.symbol!==symbol||!cot.data?.length){box.append(e("p","empty-state","Posisi COT futures yang cocok belum tersedia untuk instrumen ini."));return}
 for(const x of cot.data){const row=e("div","cot-row"),left=e("div");left.append(e("b",null,x.currency+" · "+x.contract),e("small",null,"Per "+presentDate(x.asOf+"T12:00:00Z")+" · leveraged money"));row.append(left,e("strong",x.netContracts>=0?"positive":"negative",(x.netContracts>=0?"+":"")+Number(x.netContracts).toLocaleString("id-ID")));box.append(row)}
 const f=e("p","empty-state","Posisi bersih adalah long dikurangi short pada futures, bukan prediksi pair spot. Untuk "+symbol+", baca mata uang dasar berhadapan dengan mata uang kuotasi.");box.append(f);
}
function renderResearch(){
 const token=++liveReq,p=profileFor(selected),bars=priceSeries(p),s=signal(bars);
 if(profile!==selected){profile=selected;drawTV(selected)}
 text("pair-symbol",selected);text("pair-market",p.asset||p.label||selected);text("pair-heading",p.label||selected);text("pair-headline",p.headline||"Faktor pasar "+selected);
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
  ["Faktor moneter",(selected.length===6&&!commodities[selected]?selected.slice(0,3)+" vs "+selected.slice(3):"Makro global"),55],
  ["COT (mingguan)",cot?.data?.length?"Sumber CFTC":"Belum tersedia",cot?.data?.length?60:50]];
  for(const [k,val,progress]of metrics){const row=e("div","sentiment-item"),bar=e("div","sentiment-bar"),line=e("i");line.style.width=progress+"%";bar.append(line);row.append(e("span",null,k),bar,e("strong",null,val));sentiment.append(row)}
 }
 cot=null;renderCot(selected);
 const ev=$("pair-events");if(ev){ev.replaceChildren();const chosen=pairEvents(selected);for(const x of chosen)ev.append(eventCard(x));if(!chosen.length)ev.append(e("p","empty-state","Belum ada agenda terbaru yang spesifik terhadap "+selected+". Berita bank sentral tetap dipantau."))}
 const news=$("pair-news");if(news){news.replaceChildren(e("p","empty-state","Menelusuri sumber yang relevan untuk "+selected+"…"))}
 get("/api/cot?symbol="+encodeURIComponent(selected)).then(v=>{if(token!==liveReq)return;cot=v;renderCot(selected);renderSentimentCot()}).catch(()=>{if(token===liveReq)renderCot(selected)});
 get("/api/pair-news?symbol="+encodeURIComponent(selected)).then(v=>{if(token!==liveReq)return;official=v?.items||[];renderPairNews()}).catch(()=>{if(token===liveReq){official=[];renderPairNews()}});
}
function renderSentimentCot(){
 const div=$("sentiment-map");if(!div)return;const row=div.querySelectorAll(".sentiment-item")[3];if(!row)return;
 const b=row.querySelector("strong");if(b)b.textContent=cot?.data?.length?cot.data.map(x=>x.currency+": "+(x.netContracts>=0?"net long":"net short")).join(" | "):"Belum tersedia";
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
 for(const [i,x]of result.slice(0,7).entries())box.append(newsCard(x,i,Boolean(x.market)));
}
async function start(){
 menu();
 const [marketResult,contextResult,calendarResult,newsResult]=await Promise.allSettled(["/market-ohlc.json","/instrument-context.json","/calendar-brief.json","/api/hot-news"].map(get));
 market=marketResult.status==="fulfilled"&&marketResult.value.schema===1?marketResult.value:null;
 context=contextResult.status==="fulfilled"&&Array.isArray(contextResult.value.instruments)?contextResult.value.instruments:[];
 calendar=calendarResult.status==="fulfilled"&&Array.isArray(calendarResult.value.events)?calendarResult.value.events:[];
 feed=newsResult.status==="fulfilled"&&Array.isArray(newsResult.value.items)?newsResult.value.items:[];
 if(page==="dashboard"){renderDashboard();setInterval(async()=>{try{const fresh=await get("/api/hot-news");if(Array.isArray(fresh.items)){feed=fresh.items;renderDashboard()}}catch{}},15*60000)}
 else{
 const param=new URLSearchParams(location.search).get("symbol")?.toUpperCase()||"XAUUSD";
 selected=items().some(x=>x.id===param)?param:"XAUUSD";
 $("pair-choose")?.addEventListener("click",pick);
 renderResearch();
 setInterval(()=>{if(!document.hidden){get("/api/pair-news?symbol="+selected).then(x=>{official=x?.items||[];renderPairNews()}).catch(()=>{})}},15*60000)
 }
}
document.addEventListener("DOMContentLoaded",()=>{start().catch(()=>{menu();text("pair-headline","Data sementara belum tersedia. Coba muat ulang halaman.")})});
})();