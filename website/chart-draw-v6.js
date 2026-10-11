/* KATARINA H4 price map: one plan at most, no fabricated inverse scenario. */
(()=>{"use strict";
const NS="http://www.w3.org/2000/svg",get=id=>document.getElementById(id);
const svg=(tag,attrs,text)=>{const node=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs||{}))node.setAttribute(k,String(v));if(text!==undefined)node.textContent=String(text);return node};
const e=(tag,cls,t)=>{const node=document.createElement(tag);node.className=cls;if(t!==undefined)node.textContent=String(t);return node};
const fmt=(v,id)=>Number(v).toLocaleString("id-ID",{maximumFractionDigits:id.endsWith("JPY")?3:/^(EUR|GBP|AUD|NZD|USD|CAD|CHF)[A-Z]{3}$/.test(id)?5:2});
let selected=new URLSearchParams(location.search).get("symbol")?.toUpperCase()||"XAUUSD",bars=null,source=null,plan=null,fetchId=0;
function render(){
 const host=get("katarina-chart");if(!host)return;host.replaceChildren();
 if(!bars||bars.length<30){host.append(e("p","empty-state","Grafik H4 menunggu data sumber tepercaya. Kamu masih bisa membuka grafik TradingView."));return}
 const data=bars.slice(-62),v=data.at(-1),p=plan?.symbol===selected?plan:null,small=window.innerWidth<=620;
 const W=small?580:1000,H=small?450:475,T=30,B=small?390:407,L=small?17:30,END=small?355:665,RIGHT=W-66,FUT=small?399:732;
 const prices=[...data.flatMap(x=>[x[2],x[3]])],levels=p?[p.trigger,p.invalidation,p.objective]:[],lo=Math.min(...prices,...levels),hi=Math.max(...prices,...levels),pad=Math.max((hi-lo)*.10,1e-6);
 const min=lo-pad,max=hi+pad,yy=x=>T+(max-x)/(max-min)*(B-T),xx=i=>L+i*(END-L)/(data.length-1);
 const root=svg("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":"Grafik H4 "+selected+(p?" dengan proyeksi "+p.direction+" dan batas invalidasi":" tanpa rencana aktif")});
 root.append(svg("rect",{x:0,y:0,width:W,height:H,fill:"#0b1b29"}));
 for(let i=0;i<=6;i++){const value=min+(max-min)*i/6,y=yy(value);
  root.append(svg("line",{x1:L,x2:RIGHT,y1:y,y2:y,stroke:"#5a7383","stroke-opacity":".25","stroke-dasharray":"4 7"}));
  root.append(svg("text",{x:RIGHT+6,y:y+4,fill:"#a2c2cf","font-size":small?11:11},fmt(value,selected)));
 }
 for(let i=0;i<=6;i++){const x=L+(END-L)*i/6;root.append(svg("line",{x1:x,x2:x,y1:T,y2:B,stroke:"#44616e","stroke-opacity":".22"}))}
 const width=Math.max(2.8,Math.min(7,(END-L)/data.length*.58));
 data.forEach((b,i)=>{const x=xx(i),green=b[4]>=b[1],c=green?"#63ddbe":"#e990a2";
  root.append(svg("line",{x1:x,x2:x,y1:yy(b[2]),y2:yy(b[3]),stroke:c,"stroke-width":"1.2"}));
  root.append(svg("rect",{x:x-width/2,y:Math.min(yy(b[1]),yy(b[4])),width,height:Math.max(2,Math.abs(yy(b[1])-yy(b[4]))),fill:c}));
 });
 root.append(svg("line",{x1:FUT-18,x2:FUT-18,y1:T,y2:B,stroke:"#aac2c6","stroke-opacity":".7","stroke-dasharray":"5 7"}));
 const label=svg("text",{x:FUT,y:T+15,fill:"#abcbd1","font-size":small?12:13,"font-weight":700},p?"RENCANA "+p.direction:"BELUM ADA PLAN");root.append(label);
 const drawHorizontal=(price,color,name,style="6 5")=>{
  const y=yy(price);root.append(svg("line",{x1:L,x2:RIGHT,y1:y,y2:y,stroke:color,"stroke-width":"1.7","stroke-dasharray":style}));
  root.append(svg("text",{x:FUT,y:y-6,fill:color,"font-size":small?11:12,"font-weight":700},name+" "+fmt(price,selected)));
 };
 if(p){
  drawHorizontal(p.trigger,"#80e6d5","AKTIF");
  drawHorizontal(p.invalidation,"#f3a7b1","BATAL");
  drawHorizontal(p.objective,"#8bb9f1","TUJUAN");
  const color=p.direction==="BUY"?"#7ae6d0":"#f3a5b0",goalX=W-91,now=yy(v[4]),gate=yy(p.trigger),target=yy(p.objective);
  const poly=svg("polyline",{points:[[END,now],[FUT+32,(now+gate)/2],[FUT+64,gate],[goalX,target]].map(x=>x.join(",")).join(" "),stroke:color,fill:"none","stroke-width":"3","stroke-dasharray":"8 7","stroke-linecap":"round"});
  root.append(poly);root.append(svg("circle",{cx:END,cy:now,r:5,fill:"#f4fffc",stroke:"#0d2936","stroke-width":3}));
  root.append(svg("text",{x:goalX+5,y:target-7,fill:color,"font-size":15},p.direction==="BUY"?"↗":"↘"));
 }
 const date=n=>new Date(n*1000).toLocaleDateString("id-ID",{day:"numeric",month:"short",timeZone:"Asia/Jakarta"});
 root.append(svg("text",{x:L,y:H-24,fill:"#9eb5bf","font-size":11},date(data[0][0])));
 root.append(svg("text",{x:END-42,y:H-24,fill:"#9eb5bf","font-size":11},date(v[0])));
 root.append(svg("text",{x:FUT+12,y:H-24,fill:"#9eb5bf","font-size":11},p?"Skenario bersyarat":"Belum konfirmasi"));
 const tooltip=e("div","chart-tooltip","");tooltip.hidden=true;
 root.addEventListener("pointermove",evt=>{const mat=root.getScreenCTM();if(!mat)return;const point=root.createSVGPoint();point.x=evt.clientX;point.y=evt.clientY;
  const pt=point.matrixTransform(mat.inverse());if(pt.x<L||pt.x>END+7){tooltip.hidden=true;return}
  const i=Math.max(0,Math.min(data.length-1,Math.round((pt.x-L)*(data.length-1)/(END-L)))),b=data[i];tooltip.textContent=date(b[0])+" · Buka "+fmt(b[1],selected)+" · Tinggi "+fmt(b[2],selected)+" · Rendah "+fmt(b[3],selected)+" · Tutup "+fmt(b[4],selected);tooltip.hidden=false;
 });root.addEventListener("pointerleave",()=>{tooltip.hidden=true});
 const header=e("div","analysis-chart-header","");header.append(e("strong","",selected+" · 4 jam (H4)"),e("span","","Data terakhir "+date(v[0])));
 const foot=e("div","analysis-chart-footer","");
 foot.append(e("span","",source?.proxy?source.proxyNote:"Candlestick H4 dari harga referensi. Bukan feed harga broker."),e("span","",p?"Garis arah hanya untuk rencana "+p.direction+". Tutup H4 melewati batas BATAL berarti plan gagal.":"Tidak ada garis prediksi sebelum rencana terkonfirmasi."));
 host.append(header,root,tooltip,foot);
}
async function load(symbol){
 const version=++fetchId;selected=symbol;bars=null;plan=null;render();
 try{const r=await fetch("/api/h4?symbol="+encodeURIComponent(symbol),{cache:"no-store"}),data=await r.json();
 if(version!==fetchId)return;if(!r.ok||data.status!=="ready"){bars=null;return render()}
 source=data;bars=data.bars;render();
 }catch{if(version===fetchId){bars=null;render()}}
}
function tabs(){
 const a=get("chart-tab-analysis"),b=get("chart-tab-tradingview"),left=get("katarina-chart"),right=get("tv-host-v4");if(!a||!b||!left||!right)return;
 const set=which=>{const own=which==="analysis";left.classList.toggle("chart-hidden",!own);right.classList.toggle("chart-hidden",own);a.classList.toggle("selected",own);b.classList.toggle("selected",!own);a.setAttribute("aria-pressed",String(own));b.setAttribute("aria-pressed",String(!own));};
 a.addEventListener("click",()=>set("analysis"));b.addEventListener("click",()=>{set("tv");window.KatarinaRenderTV?.(selected)});set("analysis");
}
window.addEventListener("katarina:pair-change",e=>{if(e.detail?.symbol)load(e.detail.symbol)});
window.addEventListener("katarina:weekly-plan",e=>{const received=e.detail?.plan;if(received?.symbol===selected){plan=received;render()}else if(e.detail?.symbol===selected){plan=null;render()}});
const start=()=>{tabs();load(selected)};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();