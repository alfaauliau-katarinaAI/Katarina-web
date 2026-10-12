/* KATARINA interactive H4 map: genuine reference candles, touch pan, zoom,
 * conditional single-direction forecast and annotated Fibonacci/price zones.
 * Live forming candles update only when the publisher supplies fresh market data.
 */
(()=>{"use strict";
const NS="http://www.w3.org/2000/svg",get=id=>document.getElementById(id);
const svg=(name,attributes={},value)=>{const n=document.createElementNS(NS,name);for(const [k,v]of Object.entries(attributes))n.setAttribute(k,String(v));if(value!==undefined)n.textContent=String(value);return n};
const html=(name,cls,value)=>{const n=document.createElement(name);if(cls)n.className=cls;if(value!==undefined)n.textContent=String(value);return n};
const fmt=(n,id)=>Number(n).toLocaleString("id-ID",{maximumFractionDigits:id.endsWith("JPY")?3:/^(EUR|GBP|AUD|NZD|USD|CAD|CHF)[A-Z]{3}$/.test(id)?5:2});
const when=sec=>new Date(sec*1000).toLocaleDateString("id-ID",{timeZone:"Asia/Jakarta",day:"numeric",month:"short"});
let selected=new URLSearchParams(location.search).get("symbol")?.toUpperCase()||"XAUUSD";
let completed=[],active=null,source=null,plan=null,loadId=0,view={count:48,back:0},host=null,pan=null;
const latest=()=>[...completed,...(active?.bar?[active.bar]:[])];
const status=(text)=>{const h=get("chart-feed-status");if(h)h.textContent=text};
function render(){
 host=get("katarina-chart");if(!host)return;host.replaceChildren();
 const list=latest();if(list.length<30){host.append(html("p","empty-state","Belum ada candle H4 dari sumber yang dapat diperiksa. Grafik TradingView tetap tersedia."));return}
 const small=window.innerWidth<680,W=small?610:1020,H=small?455:488,T=36,B=small?396:420,L=small?19:38,EDGE=W-(small?84:105),FUT=small?425:736;
 const visible=Math.min(view.count,list.length),maxBack=Math.max(0,list.length-visible);view.back=Math.max(0,Math.min(maxBack,view.back));
 const final=list.length-view.back,first=Math.max(0,final-visible),bars=list.slice(first,final);
 const atLatest=view.back===0,p=atLatest&&plan?.symbol===selected?plan:null,fx=p?[p.trigger,p.invalidation,p.objective]:[];
 const all=bars.flatMap(r=>[r[2],r[3]]).concat(fx);
 const lo=Math.min(...all),hi=Math.max(...all),pad=Math.max((hi-lo)*.09,1e-7),minimum=lo-pad,maximum=hi+pad;
 const px=x=>T+(maximum-x)/(maximum-minimum)*(B-T);
 const chartRight=atLatest?(small?359:693):EDGE-8;
 const coord=i=>L+i*(chartRight-L)/Math.max(bars.length-1,1),width=Math.max(2.5,Math.min(small?7:9,(chartRight-L)/bars.length*.66));
 const root=svg("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":"Candle H4 "+selected+(p?", peta "+p.direction+" dengan zona dan level batal":"; belum ada rencana arah"),"data-bars":bars.length});
 root.append(svg("rect",{x:0,y:0,width:W,height:H,fill:"#0a1a28"}));
 const grid=svg("g",{});for(let i=0;i<=6;i++){const val=minimum+(maximum-minimum)*i/6,y=px(val);
  grid.append(svg("line",{x1:L,x2:EDGE,y1:y,y2:y,stroke:"#486374","stroke-opacity":".29","stroke-dasharray":"3 7"}));
  grid.append(svg("text",{x:EDGE+6,y:y+4,fill:"#adc4d0","font-size":small?12:12},fmt(val,selected)));
 }
 for(let i=0;i<=6;i++){const x=L+i*(chartRight-L)/6;grid.append(svg("line",{x1:x,x2:x,y1:T,y2:B,stroke:"#41606e","stroke-opacity":".21"}))}
 root.append(grid);
 const band=(yvalue,spread,color,label)=>{
  const y=px(yvalue),half=Math.max(5,Math.min(19,spread/(maximum-minimum)*(B-T)*.5));
  root.append(svg("rect",{x:L,y:y-half,width:EDGE-L,height:half*2,fill:color,"fill-opacity":".15",stroke:color,"stroke-opacity":".38","stroke-width":"1"}));
  root.append(svg("line",{x1:L,x2:EDGE,y1:y,y2:y,stroke:color,"stroke-width":"1.6","stroke-dasharray":"6 5"}));
  root.append(svg("text",{x:atLatest?FUT:Math.max(L+5,EDGE-210),y:y-half-6,fill:color,"font-size":small?11:12,"font-weight":"700"},label+" "+fmt(yvalue,selected)));
 };
 if(p){
  const spread=Math.max(Math.abs(p.trigger-p.invalidation)*.08,(p.atr||0)*.25);
  band(p.trigger,spread,"#f1b16e",p.direction==="BUY"?"ZONA TEMBUS":"ZONA PECAH");
  band(p.invalidation,spread,"#adb3be","BATAL");
 }
 const body=svg("g",{});
 bars.forEach((b,i)=>{
  const x=coord(i),up=b[4]>=b[1],color=up?"#67ddc5":"#e68c9b",y=Math.min(px(b[1]),px(b[4])),height=Math.max(2,Math.abs(px(b[1])-px(b[4])));
  body.append(svg("line",{x1:x,x2:x,y1:px(b[2]),y2:px(b[3]),stroke:color,"stroke-width":"1.5"}));
  body.append(svg("rect",{x:x-width/2,y,width,height,rx:".65",fill:color}));
  if(atLatest&&active?.bar&&b[0]===active.bar[0])body.append(svg("rect",{x:x-width/2-1,y:y-1,width:width+2,height:height+2,rx:"1",fill:"none",stroke:"#e7c989","stroke-dasharray":"2 2"}));
 });
 root.append(body);
 const low=Math.min(...bars.slice(-Math.min(24,bars.length)).map(x=>x[3])),high=Math.max(...bars.slice(-Math.min(24,bars.length)).map(x=>x[2]));
 if(p&&high>low){
  // Fib levels are measured over the visible H4 impulse range. They are visual reference levels, not guaranteed reversals.
  const increase=p.direction==="BUY";
  const a=increase?high:low,b=increase?low:high,scale=a-b;
  for(const [fraction,note]of [[.382,"38,2%"],[.5,"50%"],[.618,"61,8%"]]){
   const level=a-scale*fraction,y=px(level);
   root.append(svg("line",{x1:L+Math.round((chartRight-L)*.43),x2:EDGE-8,y1:y,y2:y,stroke:"#aab9d2","stroke-width":"1","stroke-opacity":".48","stroke-dasharray":"3 5"}));
   root.append(svg("text",{x:EDGE-68,y:y-7,fill:"#c2cadb","font-size":"10"},note));
  }
 }
 if(p){
  const lastBar=bars.at(-1),x=chartRight,from=px(lastBar[4]),endX=EDGE-28,mid=px(p.trigger),end=px(p.objective),color=p.direction==="BUY"?"#8be9d7":"#f0a9b8";
  root.append(svg("line",{x1:chartRight+22,x2:chartRight+22,y1:T,y2:B,stroke:"#96b1bb","stroke-width":"1","stroke-dasharray":"5 7"}));
  root.append(svg("text",{x:FUT,y:T+15,fill:color,"font-size":small?11:13,"font-weight":"800"},p.direction+" / H4"));
  const swing=px(lastBar[4]-(p.direction==="BUY"?1:-1)*(p.atr||0)*.55);
  const points=[[x,from],[x+(endX-x)*.22,swing],[x+(endX-x)*.39,mid],[x+(endX-x)*.54,(mid+swing)/2],[x+(endX-x)*.77,mid],[endX,end]];
  root.append(svg("polyline",{points:points.map(q=>q.join(",")).join(" "),fill:"none",stroke:color,"stroke-width":small?3.3:3.7,"stroke-linecap":"round","stroke-linejoin":"round","stroke-dasharray":"8 6"}));
  root.append(svg("circle",{cx:x,cy:from,r:5.5,fill:color,stroke:"#0b1e2d","stroke-width":2}));
  root.append(svg("text",{x:endX-6,y:end-10,fill:color,"font-size":"17","font-weight":"900"},p.direction==="BUY"?"↗":"↘"));
  if(p.objective!==p.trigger)root.append(svg("text",{x:FUT,y:end+(p.direction==="BUY"?18:-8),fill:color,"font-size":"11"},fmt(p.objective,selected)));
 }
 const label=svg("g",{});
 label.append(svg("text",{x:L,y:H-19,fill:"#89abb9","font-size":"12"},when(bars[0][0])));
 label.append(svg("text",{x:Math.max(L+80,chartRight-55),y:H-19,fill:"#89abb9","font-size":"12"},when(bars.at(-1)[0])));
 if(p)label.append(svg("text",{x:FUT+3,y:H-19,fill:"#89abb9","font-size":"11"},"Jika terkonfirmasi"));
 root.append(label);
 const tip=html("div","chart-tooltip","");tip.hidden=true;
 function pointerPosition(evt){const mat=root.getScreenCTM();if(!mat)return null;const point=root.createSVGPoint();point.x=evt.clientX;point.y=evt.clientY;return point.matrixTransform(mat.inverse())}
 function updateTip(evt){const point=pointerPosition(evt);if(!point||point.x<L||point.x>chartRight+8){tip.hidden=true;return}
  const index=Math.min(bars.length-1,Math.max(0,Math.round((point.x-L)/(chartRight-L)*(bars.length-1)))),v=bars[index];
  tip.textContent=when(v[0])+" · O "+fmt(v[1],selected)+" H "+fmt(v[2],selected)+" L "+fmt(v[3],selected)+" C "+fmt(v[4],selected)+(active?.bar?.[0]===v[0]?" · berjalan":"");tip.hidden=false}
 root.addEventListener("pointermove",evt=>{if(!pan)updateTip(evt)});
 root.addEventListener("pointerleave",()=>{tip.hidden=true});
 // Pan state persists across SVG redraws; pointer events continue on window.
 root.addEventListener("pointerdown",evt=>{
  if(evt.pointerType==="mouse"&&evt.button!==0)return;
  pan={id:evt.pointerId,start:evt.clientX,back:view.back,perBar:Math.max(2,root.getBoundingClientRect().width*(chartRight-L)/W/Math.max(bars.length-1,1)),moved:false};
 });
 root.addEventListener("wheel",evt=>{evt.preventDefault();zoom(evt.deltaY>0?-1:1)},{passive:false});
 const header=html("div","analysis-chart-header","");header.append(html("strong","",selected+" · Grafik H4 interaktif"),html("span","",atLatest?(active?.bar?"Candle berjalan":"Candle terakhir selesai"):"Melihat riwayat"));
 const controls=html("div","chart-controls","");
 const action=(name,fn,description)=>{const b=html("button","chart-control",name);b.type="button";b.setAttribute("aria-label",description);b.addEventListener("click",fn);return b};
 controls.append(action("−",()=>zoom(-1),"Perkecil grafik"),action("+",()=>zoom(1),"Perbesar grafik"),action("Terbaru",()=>{view.back=0;render()},"Kembali ke candle terbaru"));
 const bottom=html("div","analysis-chart-footer","");bottom.append(html("span","","Geser kanan-kiri untuk melihat riwayat · tombol +/− untuk zoom"),
 html("span","",atLatest?(active?.bar?"Candle H4 yang sedang berjalan, bukan tick broker. ":"Harga penutupan H4. ")+(p?"Garis rencana "+p.direction+"; batal di "+fmt(p.invalidation,selected)+".":"Belum ada satu arah yang terkonfirmasi."): "Geser kembali ke candle terbaru untuk melihat rencana mingguan."));
 host.append(header,controls,root,tip,bottom);
}

function movePan(evt){
 if(!pan||evt.pointerId!==pan.id)return;
 const px=evt.clientX-pan.start;
 if(Math.abs(px)<5&&!pan.moved)return;
 pan.moved=true;
 const step=Math.round(px/pan.perBar),maxBack=Math.max(0,latest().length-view.count),next=Math.min(maxBack,Math.max(0,pan.back-step));
 if(view.back!==next){view.back=next;render()}
}
function endPan(evt){if(pan&&evt.pointerId===pan.id){pan=null}}
function zoom(direction){const n=Math.max(18,Math.min(105,view.count+(direction>0?-12:12)));if(n!==view.count){view.count=n;render()}}
async function refresh(symbol,reset=false){
 const id=++loadId;if(reset){selected=symbol;completed=[];active=null;source=null;plan=null;view.back=0;render()}
 try{
 const response=await fetch("/api/h4?symbol="+encodeURIComponent(symbol),{cache:"no-store"}),j=await response.json();
 if(id!==loadId||symbol!==selected)return;
 if(response.ok&&j.status==="ready"){completed=j.bars||[];active=j.forming||null;source=j;render()}
 else if(!completed.length)render();
 }catch{if(id===loadId&&!completed.length)render()}
}
function tabs(){
 const a=get("chart-tab-analysis"),b=get("chart-tab-tradingview"),left=get("katarina-chart"),right=get("tv-host-v4");if(!a||!b||!left||!right)return;
 const select=kind=>{const ours=kind==="analysis";left.classList.toggle("chart-hidden",!ours);right.classList.toggle("chart-hidden",ours);a.classList.toggle("selected",ours);b.classList.toggle("selected",!ours);a.setAttribute("aria-pressed",String(ours));b.setAttribute("aria-pressed",String(!ours))};
 a.addEventListener("click",()=>select("analysis"));b.addEventListener("click",()=>{select("tv");window.KatarinaRenderTV?.(selected)});select("analysis");
}
window.addEventListener("katarina:pair-change",event=>{if(event.detail?.symbol)refresh(event.detail.symbol,true)});
window.addEventListener("katarina:weekly-plan",event=>{if(event.detail?.plan?.symbol===selected){plan=event.detail.plan;render()}else if(event.detail?.symbol===selected){plan=null;render()}});
const init=()=>{tabs();refresh(selected,true);window.addEventListener("pointermove",movePan,{passive:true});window.addEventListener("pointerup",endPan);window.addEventListener("pointercancel",endPan);setInterval(()=>{if(!document.hidden)refresh(selected,false)},10*60000)};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();