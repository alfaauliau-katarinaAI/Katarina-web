(()=>{"use strict";
const host=document.getElementById("project-feed");if(!host)return;
function box(name,cls,value){const n=document.createElement(name);if(cls)n.className=cls;if(value!==undefined)n.textContent=String(value);return n}
const niceTime=t=>{try{return new Date(t).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric",timeZone:"Asia/Jakarta"})}catch{return "—"}};
async function refresh(){
 try{
 const res=await fetch("/api/project-updates",{cache:"no-store"});if(!res.ok)throw Error("source");
 const data=await res.json();if(!Array.isArray(data.items)||!data.items.length)throw Error("empty");
 host.replaceChildren();
 for(const row of data.items.slice(0,4)){
  if(!row.link?.startsWith("https://github.com/"))continue;
  const item=box("a","project-entry");item.href=row.link;item.target="_blank";item.rel="noopener noreferrer";
  item.append(box("small",null,row.category),box("strong",null,row.title),box("span",null,niceTime(row.date)+" · Lihat catatan pembaruan ↗"));
  host.append(item);
 }
 if(!host.children.length)throw Error("links");
 }catch{host.replaceChildren(box("p","project-empty","Pembaruan proyek sedang tidak tersedia. Catatan perkembangan tetap bisa dilihat melalui GitHub."))}
}
refresh();setInterval(()=>{if(!document.hidden)refresh()},60*60*1000);
})();