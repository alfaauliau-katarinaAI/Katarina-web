/* KATARINA chart timeframes. Candles for intraday/full history belong to the labeled external provider. */
(()=>{"use strict";
const controls=document.getElementById("kt-tf-switch");if(!controls)return;
const home=document.getElementById("tv-host"),surface=document.querySelector(".kt-chart-primary .chart-surface"),provider=document.getElementById("kt-tf-provider"),caption=document.getElementById("kt-tf-caption");
if(!home||!surface||!provider)return;
const names={XAUUSD:"OANDA:XAUUSD",XAGUSD:"OANDA:XAGUSD",US30:"TVC:DJI",US500:"SP:SPX",NASDAQ:"NASDAQ:IXIC",BTCUSD:"BITSTAMP:BTCUSD"};
const intervals={60:"1 jam",240:"4 jam",D:"harian",W:"mingguan",M:"bulanan"};
let timeframe="K",current="";
const selected=()=>document.querySelector("[data-instrument-select]")?.value||"XAUUSD";
function render(force=false){
 const symbol=selected();
 controls.querySelectorAll("[data-kt-timeframe]").forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.ktTimeframe===timeframe)));
 if(timeframe==="K"){
   provider.hidden=true;surface.hidden=false;
   const btn=document.getElementById("kt-week-map-toggle");if(btn)btn.disabled=false;
   caption.textContent="Peta KATARINA: OHLC harian historis, zona ekstrem 20 sesi dan dua skenario bersyarat. Geser atau cubit grafik untuk histori tersimpan.";
   current="";return;
 }
 surface.hidden=true;provider.hidden=false;
 const button=document.getElementById("kt-week-map-toggle");if(button)button.disabled=true;
 caption.textContent="Grafik "+intervals[timeframe]+" dari TradingView/penyedia terpilih. Periode histori dan jeda kuotasi mengikuti penyedia; data bisa berbeda dari snapshot harian KATARINA dan broker MT5.";
 const symbolTV=names[symbol]||("OANDA:"+symbol);
 const signature=symbolTV+"|"+timeframe;
 if(signature===current&&!force)return;
 current=signature;
 const frame=document.createElement("iframe");
 frame.className="kt-tf-iframe";frame.loading="lazy";frame.referrerPolicy="no-referrer-when-downgrade";
 frame.title="Grafik "+intervals[timeframe]+" "+symbol+" dari TradingView";
 frame.allowFullscreen=true;
 const args=new URLSearchParams({symbol:symbolTV,interval:timeframe,theme:"dark",style:"1",locale:"id",toolbarbg:"#06162b",allow_symbol_change:"false",save_image:"false",hideideas:"1",symboledit:"0",withdateranges:"1"});
 frame.src="https://s.tradingview.com/widgetembed/?"+args.toString();
 const note=document.createElement("p");note.className="kt-tf-note";note.textContent="Sumber: TradingView / "+symbolTV+" · Periode "+intervals[timeframe]+" · Hasil bukan sinyal KATARINA. Jika grafik eksternal dibatasi browser, gunakan tautan sumber.";
 const a=document.createElement("a");a.href="https://www.tradingview.com/chart/?symbol="+encodeURIComponent(symbolTV);a.target="_blank";a.rel="noopener noreferrer";a.textContent="Buka grafik interaktif penuh ↗";
 provider.replaceChildren(frame,note,a);
}
controls.addEventListener("click",e=>{const b=e.target.closest?.("[data-kt-timeframe]");if(!b)return;timeframe=b.dataset.ktTimeframe;render(true)});
window.addEventListener("katarina-instrument",()=>render());
document.querySelector("[data-instrument-select]")?.addEventListener("change",()=>requestAnimationFrame(render));
render();
})();