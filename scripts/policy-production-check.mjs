#!/usr/bin/env node
/* Bounded public production check for the real reported duplicated Japan news.
 * One pair-news request; at most ONE AI policy-brief request (only if a relevant
 * institutional Japan report is still present in source feed).
 */
const base="https://katarina-research.pages.dev";
const get=async(path,ms)=>{
 const r=await fetch(base+path,{signal:AbortSignal.timeout(ms),headers:{"Accept":"application/json","User-Agent":"KATARINA-policy-check/1.0"}});
 return {status:r.status,data:await r.json()};
};
const output={pair:"AUDJPY",feedHttp:0,items:0,japanItems:0,statisticalNeutral:0,statisticalMisclassified:0,briefStatus:"not-sampled",notes:[]};
try{
 const response=await get("/api/pair-news?symbol=AUDJPY",14000);
 output.feedHttp=response.status;output.items=response.data.items?.length||0;
 if(response.status!==200||!Array.isArray(response.data.items))throw Error("pair-news source invalid");
 const items=response.data.items;
 for(const item of items){
  if(item.market==="JPY")output.japanItems++;
  if(/output gap|potential growth|bonds? held|holdings/i.test(item.title)){
   if(item.policyHeadline?.eventType==="STATISTICS"&&item.policyHeadline.currencyBias==="UNKNOWN")output.statisticalNeutral++;
   else output.statisticalMisclassified++;
  }
 }
 const first=items.map((v,i)=>({...v,index:i})).find(x=>x.market==="JPY"&&/output gap|potential growth|bonds? held|holdings/i.test(x.title));
 if(first){
  try{
   const result=await get("/api/policy-brief?symbol=AUDJPY&index="+first.index,30000);
   output.briefHttp=result.status;output.briefStatus=result.data.status;
   if(result.data.status==="ai-full-article"){
    output.policyDirection=result.data.policyDirection;
    output.currencyBias=result.data.currencyBias;
    output.pairDirection=result.data.pairDirection;
    if(result.data.policyDirection!=="NO_DECISION"||result.data.currencyBias!=="UNKNOWN"||result.data.pairDirection!=="UNKNOWN")output.statisticalMisclassified++;
   }else output.notes.push("Article text or model validation unavailable; no fabricated policy direction shown.");
  }catch{output.briefStatus="timeout-or-network";output.notes.push("Source/full-text AI could not be confirmed in bounded check.");}
 }else output.notes.push("Historical BoJ report is outside current official news feed window.");
 console.log("POLICY_PRODUCTION "+JSON.stringify(output));
 if(output.statisticalMisclassified>0||output.feedHttp!==200)process.exitCode=1;
}catch(e){
 output.notes.push(String(e.message||e).slice(0,200));
 console.log("POLICY_PRODUCTION "+JSON.stringify(output));
 process.exitCode=1;
}
