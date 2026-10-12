import {article} from "../functions/api/policy-brief.js";
#!/usr/bin/env node
/* Read-only publisher diagnostic. Logs status, lengths and short feed summaries
 * (not cookies, credentials or copyrighted full articles). */
const feeds=[
 ["CNBC Asia","https://www.cnbc.com/id/19832390/device/rss/rss.html"],
 ["CNBC Dunia","https://www.cnbc.com/id/100727362/device/rss/rss.html"],
 ["CNBC Ekonomi","https://www.cnbc.com/id/20910258/device/rss/rss.html"]
];
const articles=[
 "https://www.cnbc.com/2026/10/12/china-gold-buying-interest-rate-.html",
 "https://www.cnbc.com/2026/10/09/china-europe-hybrid-vehicle-exports-deal.html"
];
async function get(url){
 try{const resp=await fetch(url,{headers:{"User-Agent":"Mozilla/5.0 (compatible; KATARINA-news-analysis/1.0)","Accept":"text/html,application/rss+xml,application/xml,*/*"},signal:AbortSignal.timeout(7500),redirect:"follow"});
  const text=(await resp.text()).slice(0,1250000);
  return {status:resp.status,contentType:resp.headers.get("content-type"),length:text.length,
   blocked:/captcha|request blocked|access denied|robot|enable javascript|please enable cookies/i.test(text.slice(0,1300)),text};
 }catch(e){return {status:0,error:String(e?.name||"error")}};
}
for(const [label,url] of feeds){
 const x=await get(url),items=[...(x.text||"").matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].slice(0,80);
 const match=items.filter(m=>/ray dalio|chinese hybrid|china.*gold|importing a record|bond yields/i.test(m[1])).slice(0,4);
 const info=match.map(m=>{const tag=n=>(m[1].match(new RegExp("<"+n+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/"+n+">","i"))||[])[1]||"";
   const clean=s=>s.replace(/<!\[CDATA\[|\]\]>/g,"").replace(/<[^>]*>/g," ").replace(/&(?:amp|quot|apos|nbsp);/g," ").replace(/\s+/g," ").trim();
   return {title:clean(tag("title")).slice(0,115),descriptionLength:clean(tag("description")).length,url:clean(tag("link")).slice(0,210),descriptionSample:clean(tag("description")).slice(0,200),contentEncodedLength:clean(tag("content:encoded")).length};
 });
 console.log("PUBLISHER_FEED "+JSON.stringify({label,http:x.status,contentType:x.contentType,length:x.length,matches:info,error:x.error}));
}
for(const url of articles){
 const x=await get(url);
 let extracted;try{extracted=await article(url)}catch(e){extracted="ERROR "+String(e?.message||e)}
 const pTexts=[...(x.text||"").matchAll(/<p\\b[^>]*>([\\s\\S]*?)<\\/p>/gi)]
   .map(y=>y[1].replace(/<[^>]+>/g," ").replace(/\\s+/g," ").trim()).filter(t=>t.length>55);
 console.log("EXTRACTION_CHECK "+JSON.stringify({url,parsedLen:typeof extracted==="string"?extracted.length:0,
  preview:typeof extracted==="string"?extracted.slice(0,190):null,paragraphLengths:pTexts.slice(0,15).map(y=>y.length),
  firstP:pTexts[0]?.slice(0,160)}));
 console.log("PUBLISHER_ARTICLE "+JSON.stringify({url,http:x.status,contentType:x.contentType,length:x.length,blocked:x.blocked,
  hasBody:/articleBody|ArticleBody-articleBody|<article\b/i.test(x.text||""),
  paragraphs:[...(x.text||"").matchAll(/<p\b[^>]*>/gi)].length,
  structuredArticleBody:[...(x.text||"").matchAll(/articleBody/gi)].length,
  nextData:/__NEXT_DATA__|__APOLLO_STATE__|__data/gi.test(x.text||""),
  metaDescription:((x.text||"").match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)/i)||[])[1]?.slice(0,180),
  error:x.error}));
}
