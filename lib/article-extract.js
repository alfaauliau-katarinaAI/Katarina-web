/* Extract publicly visible publisher article paragraphs, not just headline/meta
 * description. Does not bypass login, paywall, cookies or access controls.
 */
export function decodeEntities(text){
 return String(text||"").replace(/&#(x[0-9a-f]+|\d+);/gi,(_,s)=>{
  const n=s[0]?.toLowerCase()==="x"?parseInt(s.slice(1),16):parseInt(s,10);
  return Number.isInteger(n)&&n>0&&n<=0x10ffff?String.fromCodePoint(n):"";
 }).replace(/&(?:amp|lt|gt|quot|apos|nbsp|rsquo|lsquo|rdquo|ldquo|mdash|ndash);/gi,s=>
 ({"&amp;":"&","&lt;":"<","&gt;":">","&quot;":'"',"&apos;":"'","&nbsp;":" ",
 "&rsquo;":"’","&lsquo;":"‘","&rdquo;":"”","&ldquo;":"“","&mdash;":"—","&ndash;":"–"}[s.toLowerCase()]||" "));
}
export function plainText(html){
 return decodeEntities(String(html||"")
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
  .replace(/<[^>]+>/g," ").replace(/\s+/g," ")).trim();
}
export function articleText(html, minChars=650){
 if(typeof html!=="string"||html.length<700)return null;
 // Favor publisher-declared structured article text if valid and substantive.
 let ldText="";
 for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
  try{
   const tree=JSON.parse(m[1]);
   const inspect=(node,depth=0)=>{
    if(depth>4||!node)return;
    if(Array.isArray(node)){for(const x of node.slice(0,30))inspect(x,depth+1);return}
    if(typeof node!=="object")return;
    if(typeof node.articleBody==="string"){
     const body=plainText(node.articleBody);
     if(body.length>ldText.length)ldText=body;
    }
    for(const key of ["@graph","mainEntity"])inspect(node[key],depth+1);
   };inspect(tree);
  }catch{}
 }
 if(ldText.length>=minChars)return ldText.slice(0,13500);
 // CNBC places story paragraphs after hundreds of KB of page state/scripts.
 // Never truncate raw HTML before locating <p> nodes, or article text disappears.
 const stripped=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
  .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi," ");
 const paragraphs=[],seen=new Set();
 for(const m of stripped.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)){
  const p=plainText(m[1]);
  if(p.length<50||p.length>2800||/^(subscribe|sign up|advertisement|cookie|read more|privacy policy|copyright|image:|photo:)/i.test(p))continue;
  if(/^(get the cnbc|watch live|become a member|make sure you don't miss|you can unsubscribe)/i.test(p))continue;
  if(!seen.has(p)){seen.add(p);paragraphs.push(p)}
  if(paragraphs.length>=45)break;
 }
 const body=paragraphs.join("\n");
 return paragraphs.length>=3&&body.length>=minChars?body.slice(0,13500):null;
}
