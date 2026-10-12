#!/usr/bin/env node
/* Read-only Cloudflare capacity snapshot using repository's existing GitHub Actions secrets.
 * Fail closed on permission gaps; never print token/account ID or raw API response.
 */
import {writeFileSync,mkdirSync,appendFileSync} from "node:fs";
const token=process.env.CF_TOKEN||"",account=process.env.CF_ACCOUNT||"";
const today=new Date(),start=new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate()));
const from=start.toISOString(),until=today.toISOString();
const base={asOf:until,periodStartUTC:from,source:"Cloudflare GraphQL adaptive analytics (may be sampled / delayed)",data:{}};
const errorCode=(s)=>String(s||"").replace(/https?:\/\/\S+/g,"").slice(0,150);
const query=async(q)=>{
 const response=await fetch("https://api.cloudflare.com/client/v4/graphql",{
  method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
  body:JSON.stringify({query:q}),signal:AbortSignal.timeout(15000)});
 const body=await response.json();
 if(!response.ok||body.errors?.length)throw Error("analytics API status "+response.status+"; "+errorCode(body.errors?.[0]?.message||"permission or schema unavailable"));
 return body.data?.viewer?.accounts?.[0]||null;
};
async function inspect(label,queryText,mapper){
 try{
  const data=await query(queryText);
  if(!data)throw Error("no matching account or insufficient analytics scope");
  base.data[label]={status:"available",...mapper(data)};
 }catch(e){base.data[label]={status:"unavailable",reason:errorCode(e.message)}}
}
if(!/^[0-9a-f]{32}$/i.test(account)||!token){
 base.data.credentials={status:"unavailable",reason:"GitHub Actions Cloudflare secrets unavailable"};
}else{
 const head='query { viewer { accounts(filter: { accountTag: "'+account+'" }) {';
 const tail=' } } }';
 await inspect("workersAI",head+' aiInferenceAdaptiveGroups(limit: 100, filter: { datetime_geq: "'+from+'", datetime_leq: "'+until+'" }) { count dimensions { modelId } sum { totalNeurons totalInputTokens totalOutputTokens } }'+tail,
  x=>{
   const rows=x.aiInferenceAdaptiveGroups||[];
   return {sampledGroupCount:rows.length,mayBeTruncated:rows.length===100,
    neuronsObserved:Math.round(rows.reduce((a,r)=>a+Number(r.sum?.totalNeurons||0),0)*100)/100,
    requestsObserved:rows.reduce((a,r)=>a+Number(r.count||0),0),
    byModel:rows.map(r=>({model:r.dimensions?.modelId||"unknown",neurons:Math.round(Number(r.sum?.totalNeurons||0)*100)/100,requests:Number(r.count||0)})).slice(0,20)};
  });
 await inspect("workers",head+' workersInvocationsAdaptive(limit: 100, filter: { datetime_geq: "'+from+'", datetime_leq: "'+until+'" }) { dimensions { scriptName } sum { requests errors } }'+tail,
  x=>{
   const rows=x.workersInvocationsAdaptive||[];
   return {sampledRows:rows.length,mayBeTruncated:rows.length===100,
     sampledRequests:rows.reduce((a,r)=>a+Number(r.sum?.requests||0),0),
     sampledErrors:rows.reduce((a,r)=>a+Number(r.sum?.errors||0),0),
     note:"workersInvocationsAdaptive returns sampled/raw rows, not an exact all-account daily total"};
  });
}
mkdirSync("test-results",{recursive:true});
writeFileSync("test-results/cloudflare-usage.json",JSON.stringify(base,null,2));
console.log("CLOUDFLARE_USAGE "+JSON.stringify(base));
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,
 "\n### Cloudflare capacity\n\n- Workers AI analytics: "+(base.data.workersAI?.status||"unavailable")+
 "\n- Workers analytics: "+(base.data.workers?.status||"unavailable")+
 "\n- AI neurons observed (sampling/delay applies): "+(base.data.workersAI?.neuronsObserved??"not measurable")+
 "\n- No billing changes performed.\n");
