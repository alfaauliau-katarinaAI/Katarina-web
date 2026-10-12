#!/usr/bin/env node
/* Live evidence check of the actual three reported problematic headlines.
 * Search the LIVE feed; never submit unlisted URLs to the production analyzer.
 * At most 3 AI requests, sequential, bounded to avoid exhausting free neurons.
 */
const host="https://katarina-research.pages.dev",results=[];
const targets=[
 {id:"china-gold",pattern:/china.*(?:import|gold)|importing.*gold/i},
 {id:"hybrid-eu",pattern:/china and europe agree to cut chinese hybrid/i},
 {id:"dalio-bond-yield",pattern:/ray dalio warns.*bond yields|cushion against rising bond yields/i}
];
const fetchJson=async(path,timeout)=>{
 const r=await fetch(host+path,{signal:AbortSignal.timeout(timeout),headers:{Accept:"application/json","User-Agent":"KATARINA-source-evidence-test/1.0"}});
 return {http:r.status,json:await r.json()};
};
try{
 const live=await fetchJson("/api/hot-news",13000);
 if(live.http!==200||!Array.isArray(live.json.items))throw Error("Live feed not ready");
 for(const target of targets){
  const index=live.json.items.findIndex(item=>target.pattern.test(item.title));
  if(index<0){results.push({case:target.id,status:"not-in-current-72h-feed"});continue}
  const item=live.json.items[index];
  const query=new URLSearchParams({scope:"dashboard",index:String(index),expected:item.url});
  try{
   const result=await fetchJson("/api/news-intelligence?"+query.toString(),45000);
   const v=result.json,valid=result.http===200&&v.status==="ai-full-article"&&v.url===item.url&&
    v.basis==="Isi artikel publik dari penerbit"&&
    typeof v.summary==="string"&&v.summary.length>40&&
    typeof v.policyEvidence==="string"&&v.policyEvidence.length>25&&
    typeof v.sourceQuote==="string"&&v.sourceQuote.length>=18&&
    (v.keyFacts||[]).length>=1&&
    Array.isArray(v.marketEffects);
   results.push({case:target.id,index,http:result.http,status:v.status,valid,
    cause:v.reason||null,summarySample:valid?v.summary.slice(0,220):null,
    evidenceSample:valid?v.sourceQuote.slice(0,110):null,
    effects:valid?v.marketEffects?.map(e=>({symbol:e.symbol,direction:e.direction})):null});
  }catch(e){results.push({case:target.id,index,status:"timeout-or-network",cause:String(e?.name||"fetch-error")})}
 }
 const checked=results.filter(x=>x.status!=="not-in-current-72h-feed"),validated=checked.filter(x=>x.valid).length;
 const report={checked:checked.length,validated,results};
 console.log("EVIDENCE_REAL_ARTICLES "+JSON.stringify(report));
 if(!checked.length||validated!==checked.length)process.exitCode=1;
}catch(e){console.log("EVIDENCE_REAL_ARTICLES "+JSON.stringify({error:String(e?.message||e).slice(0,150),results}));process.exitCode=1}
