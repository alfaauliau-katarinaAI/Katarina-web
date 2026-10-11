/* Historical, annotated KATARINA chart. TradingView stays a separate live-price tab. */
(()=>{"use strict";
const NS="http://www.w3.org/2000/svg",get=id=>document.getElementById(id),keys={XAUUSD:"xau",XAGUSD:"silver",BTCUSD:"bitcoin",US30:"us30",US500:"sp500",NASDAQ:"nasdaq"};
const svg=(tag,attrs,text)=>{const x=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs||{}))x.setAttribute(k,String(v));if(text!==undefined)x.textContent=String(text);return x};
const txt=(tag,cls,text)=>{const x=document.createElement(tag);x.className=cls;x.textContent=text;return x};
const fmt=(x,id)=>Number(x).toLocaleString("id-ID",{maximumFractionDigits:id.endsWith("JPY")?3:/^(EUR|GBP|AUD|NZD|USD|CAD|CHF)[A-Z]{3}$/.test(id)?5:2});
let market=null,profiles=[],symbol="XAUUSD";
const line=(r,pts,color)=>r.append(svg("polyline",{points:pts.map(p=>p.join(",")).join(" "),stroke:color,fill:"none","stroke-width":3,"stroke-linecap":"round","stroke-dasharray":"9 7"}));
function draw(){
 const host=get("katarina-chart");if(!host||!market?.series)return;host.replaceChildren();
 const p=profiles.find(x=>x.id===symbol),v=market.series[p?.chart||keys[symbol]||symbol.toLowerCase()]?.bars||[];
 const bars=v.filter(x=>Array.isArray(x)&&x.length===5&&x.slice(1).every(Number.isFinite)).slice(-54);
 if(bars.length<24){host.append(txt("p","empty-state","Riwayat candle "+symbol+" belum cukup untuk menggambar skenario."));return}
 const last=bars.at(-1),recent=bars.slice(-21,-1),sup=Math.min(...recent.map(x=>x[3])),res=Math.max(...recent.map(x=>x[2]));
 const atr=bars.slice(-14).reduce((s,x,i)=>{const prev=bars.at(-(15-i))?.[4]||x[1];return s+Math.max(x[2]-x[3],Math.abs(x[2]-prev),Math.abs(x[3]-prev))},0)/14;
 const low=Math.min(...bars.map(x=>x[3]),sup-2.2*atr),high=Math.max(...bars.map(x=>x[2]),res+2.2*atr);
 const W=1000,H=485,T=30,B=424,L=30,END=680,FUT=738,XMAX=925;
 const y=z=>T+(high-z)/Math.max(high-low,1e-8)*(B-T),x=i=>L+i*(END-L)/(bars.length-1);
 const root=svg("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":"Candlestick "+symbol+" dengan support "+fmt(sup,symbol)+", resistensi "+fmt(res,symbol)+" dan skenario naik atau turun"});
 root.append(svg("rect",{x:0,y:0,width:W,height:H,fill:"#0b1b29"}));
 for(let i=0;i<=6;i++){
  const value=low+(high-low)*i/6,yy=y(value);
  root.append(svg("line",{x1:L,x2:925,y1:yy,y2:yy,stroke:"#446475","stroke-opacity":".29","stroke-dasharray":"4 7"}));
  root.append(svg("text",{x:935,y:yy+4,fill:"#a3bccc","font-size":11},fmt(value,symbol)));
 }
 for(let i=0;i<=7;i++){const xx=L+i*(END-L)/7;root.append(svg("line",{x1:xx,x2:xx,y1:T,y2:B,stroke:"#385365","stroke-opacity":".25"}))}
 for(const [v,color,label]of [[sup,"#f5a4ae","SUPPORT"],[res,"#72e7cf","RESISTENSI"]]){
  const yy=y(v),th=Math.max(4,atr/(high-low)*45);
  root.append(svg("rect",{x:L,y:yy-th/2,width:900,height:th,fill:color,"fill-opacity":".11",stroke:color,"stroke-opacity":".25"}));
  root.append(svg("line",{x1:L,x2:926,y1:yy,y2:yy,stroke:color,"stroke-width":"1.5","stroke-dasharray":"7 6"}));
  root.append(svg("text",{x:FUT,y:yy-7,fill:color,"font-size":12,"font-weight":700},label+" "+fmt(v,symbol)));
 }
 const cw=Math.max(3,Math.min(9,(END-L)/bars.length*.65));
 bars.forEach((b,i)=>{const xx=x(i),color=b[4]>=b[1]?"#5cddc5":"#e68c9b";
  root.append(svg("line",{x1:xx,x2:xx,y1:y(b[2]),y2:y(b[3]),stroke:color,"stroke-width":1.5}));
  root.append(svg("rect",{x:xx-cw/2,y:Math.min(y(b[1]),y(b[4])),width:cw,height:Math.max(2,Math.abs(y(b[4])-y(b[1]))),fill:color,rx:".7"}));
 });
 root.append(svg("line",{x1:FUT-25,x2:FUT-25,y1:T,y2:B,stroke:"#99bbc5","stroke-dasharray":"4 7"}));
 root.append(svg("text",{x:FUT,y:T+15,fill:"#b5d8dc","font-size":13,"font-weight":700},"5 SESI KE DEPAN"));
 const up=Math.max(res+atr*.7,last[4]+atr*.6),down=Math.min(sup-atr*.7,last[4]-atr*.6);
 line(root,[[END,y(last[4])],[FUT+30,y(Math.min(res,last[4]+atr*.25))],[FUT+100,y(res+atr*.2)],[900,y(up)]],"#7aebcf");
 line(root,[[END,y(last[4])],[FUT+30,y(Math.max(sup,last[4]-atr*.25))],[FUT+100,y(sup-atr*.2)],[900,y(down)]],"#f7a0ac");
 root.append(svg("circle",{cx:END,cy:y(last[4]),r:5,fill:"#f1fffd",stroke:"#0a2731","stroke-width":3}));
 root.append(svg("text",{x:906,y:y(up)-9,fill:"#7be7d0","font-size":14},"↗"));
 root.append(svg("text",{x:906,y:y(down)+9,fill:"#f9adb6","font-size":14},"↘"));
 const date=v=>new Date(v*1000).toLocaleDateString("id-ID",{day:"numeric",month:"short",timeZone:"Asia/Jakarta"});
 root.append(svg("text",{x:L,y:458,fill:"#89aab8","font-size":12},date(bars[0][0])));
 root.append(svg("text",{x:END-55,y:458,fill:"#89aab8","font-size":12},date(last[0])));
 root.append(svg("text",{x:FUT+25,y:458,fill:"#89aab8","font-size":12},"Dua kemungkinan"));
 const tooltip=txt("div","chart-tooltip","");tooltip.hidden=true;
 root.addEventListener("pointermove",event=>{
 const ctm=root.getScreenCTM();if(!ctm)return;const p=root.createSVGPoint();p.x=event.clientX;p.y=event.clientY;const coord=p.matrixTransform(ctm.inverse());
 if(coord.x<L||coord.x>END+10){tooltip.hidden=true;return}
 const i=Math.max(0,Math.min(bars.length-1,Math.round((coord.x-L)*(bars.length-1)/(END-L)))),v=bars[i];
 tooltip.textContent=date(v[0])+" • O "+fmt(v[1],symbol)+" H "+fmt(v[2],symbol)+" L "+fmt(v[3],symbol)+" C "+fmt(v[4],symbol);tooltip.hidden=false;
 });root.addEventListener("pointerleave",()=>tooltip.hidden=true);
 const header=txt("div","analysis-chart-header","");header.append(txt("strong","",symbol+" · Candle harian"),txt("span","","Penutupan "+date(last[0])));
 const footer=txt("div","analysis-chart-footer","");const legend=txt("div","analysis-chart-legend","");
 ["Skenario atas","Skenario bawah","Zona historis"].forEach(z=>legend.append(txt("span","",z)));
 footer.append(legend,txt("span","","Proyeksi bersyarat, bukan target pasti · data historis"));
 host.append(header,root,tooltip,footer);
}
function tabs(){
 const a=get("chart-tab-analysis"),b=get("chart-tab-tradingview"),left=get("katarina-chart"),right=get("tv-host-v4");
 if(!a||!b||!left||!right)return;
 const set=mode=>{const own=mode==="analysis";left.classList.toggle("chart-hidden",!own);right.classList.toggle("chart-hidden",own);a.classList.toggle("selected",own);b.classList.toggle("selected",!own);a.setAttribute("aria-pressed",String(own));b.setAttribute("aria-pressed",String(!own));};
 a.addEventListener("click",()=>set("analysis"));b.addEventListener("click",()=>{set("tv");window.KatarinaRenderTV?.(symbol)});set("analysis");
}
async function init(){tabs();try{const [a,b]=await Promise.all(["/market-ohlc.json","/instrument-context.json"].map(url=>fetch(url).then(r=>r.ok?r.json():null)));market=a?.schema===1?a:null;profiles=b?.instruments||[];symbol=new URLSearchParams(location.search).get("symbol")?.toUpperCase()||"XAUUSD";draw()}catch{}}
window.addEventListener("katarina:pair-change",event=>{symbol=event.detail?.symbol||"XAUUSD";draw()});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();