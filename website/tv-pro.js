/* Official TradingView Advanced Chart Widget. Widget is cross-origin; KATARINA overlays an independent HTML context panel instead of claiming native TV drawings. */
(()=>{"use strict";
const root=document.getElementById("kt-pro-tradingview");if(!root)return;
const open=document.getElementById("kt-tv-open"),toggle=document.getElementById("kt-pro-context-toggle"),content=document.getElementById("kt-pro-context-content"),label=document.getElementById("kt-pro-context-visibility");
const map={XAUUSD:"OANDA:XAUUSD",XAGUSD:"OANDA:XAGUSD",BTCUSD:"BITSTAMP:BTCUSD",US30:"TVC:DJI",US500:"SP:SPX",NASDAQ:"NASDAQ:IXIC"};
const symbol=()=>document.querySelector("[data-instrument-select]")?.value||"XAUUSD";
let current="",request=0;
function chartSym(s){return map[s]||("FX:"+s)}
function load(){
 const pair=symbol(),sym=chartSym(pair);if(sym===current)return;current=sym;const token=++request;
 if(open)open.href="https://www.tradingview.com/chart/?symbol="+encodeURIComponent(sym);
 const outer=document.createElement("div");outer.className="tradingview-widget-container";outer.style.cssText="width:100%;height:100%";
 const inner=document.createElement("div");inner.className="tradingview-widget-container__widget";inner.style.cssText="width:100%;height:100%";outer.append(inner);
 root.replaceChildren(outer);
 const script=document.createElement("script");script.type="text/javascript";script.async=true;script.src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
 script.textContent=JSON.stringify({autosize:true,symbol:sym,interval:"D",timezone:"Asia/Jakarta",theme:"dark",style:"1",locale:"id",allow_symbol_change:false,hide_top_toolbar:false,hide_side_toolbar:false,withdateranges:true,save_image:true,backgroundColor:"#071426",gridColor:"rgba(77,137,180,0.12)",calendar:false,details:false,hotlist:false,hide_legend:false,hide_volume:true,watchlist:[],studies:[]});
 script.onerror=()=>{if(token!==request)return;const warn=document.createElement("p");warn.className="kt-pro-tv-error";warn.textContent="TradingView tidak dapat dimuat oleh browser. Gunakan tombol untuk membuka grafik penuh.";root.append(warn)};
 outer.append(script);
 const mark=document.getElementById("kt-pro-symbol");if(mark)mark.textContent=pair;
}
function updateContext(){
 const pair=symbol(),structure=document.getElementById("kt-week-structure")?.textContent,
 price=document.getElementById("kt-week-price")?.textContent,
 theme=document.getElementById("kt-week-theme")?.textContent;
 const a=document.getElementById("kt-pro-trend"),b=document.getElementById("kt-pro-macro");
 if(a)a.textContent=pair+" · "+(structure&&structure!=="Memuat…"?structure:"menunggu data historis")+". "+(price||"");
 if(b)b.textContent=theme&&theme!=="Memuat…"?("Makro: "+theme):"Konteks makro instrumen sedang diperiksa.";
}
toggle?.addEventListener("click",()=>{const show=content.hidden;content.hidden=!show;toggle.setAttribute("aria-expanded",String(show));label.textContent=show?"Tutup ringkasan ▴":"Buka ringkasan ▾"});
window.addEventListener("katarina-instrument",()=>{load();updateContext()});
document.querySelector("[data-instrument-select]")?.addEventListener("change",()=>requestAnimationFrame(()=>{load();updateContext()}));
for(const id of ["kt-week-structure","kt-week-price","kt-week-theme"]){const node=document.getElementById(id);if(node)new MutationObserver(updateContext).observe(node,{childList:true,characterData:true,subtree:true})}
load();updateContext();
})();