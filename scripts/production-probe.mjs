#!/usr/bin/env node
/* Bounded production probe: a total of <= 85 requests, max concurrency 8,
 * single optional AI prompt. Not a true high-scale capacity benchmark.
 */
import {writeFileSync,mkdirSync,appendFileSync} from "node:fs";
const ROOT="https://katarina-research.pages.dev";
const limit=9000,rows=[];
const started=new Date().toISOString();
const pctl=(a,p)=>a.length?a[Math.min(a.length-1,Math.max(0,Math.ceil((p/100)*a.length)-1))]:null;
async function check(path,kind="json",timeoutMs=limit){
 const begin=performance.now();let status=0,payload=null,err=null,cacheStatus=null;
 try{
  const r=await fetch(ROOT+path,{headers:{Accept:kind==="json"?"application/json":"text/html","User-Agent":"KATARINA-bounded-smoke/1.0"},signal:AbortSignal.timeout(timeoutMs)});
  status=r.status;cacheStatus=r.headers.get("cf-cache-status");
  const raw=await r.text();
  if(kind==="json")try{payload=JSON.parse(raw)}catch{err="invalid-json"}
  else payload={size:raw.length,titlePresent:raw.includes("KATARINA")};
 }catch(e){err=e?.name==="TimeoutError"?"timeout":"network-error"}
 const ms=Math.round(performance.now()-begin);
 return {path,status,ms,err,cacheStatus,...(payload?.status?{appStatus:payload.status}:{}),data:payload};
}
const smokePaths=[
 ["/","html"],["/api/engine-health","json"],["/api/hot-news","json"],
 ["/api/pair-outlook?symbol=XAUUSD&health=1","json"],
 ["/api/weekly-plan?symbol=XAUUSD","json"]];
for(const [path,kind]of smokePaths){
 const result=await check(path,kind);rows.push(result);
 console.log("SMOKE "+JSON.stringify({path,status:result.status,ms:result.ms,error:result.err,appStatus:result.appStatus,
  aiBound:typeof result.data?.ai==="boolean"?result.data.ai:undefined,
  assetsBound:typeof result.data?.assets==="boolean"?result.data.assets:undefined}));
}
// Exactly one production AI API request, never in the concurrent burst.
const ai=await check("/api/pair-outlook?symbol=XAUUSD","json",30000);
rows.push(ai);
const warmAI=ai.status===200&&ai.data?.status==="ready"?await check("/api/pair-outlook?symbol=XAUUSD","json",7500):null;
if(warmAI)rows.push(warmAI);
console.log("AI_WARM "+JSON.stringify({httpStatus:warmAI?.status??null,appStatus:warmAI?.appStatus??null,latencyMs:warmAI?.ms??null,valid:warmAI?.status===200&&warmAI?.data?.status==="ready",model:warmAI?.data?.model||null}));
console.log("AI_LIVE "+JSON.stringify({httpStatus:ai.status,appStatus:ai.appStatus,
 model:ai.data?.model||null,fallbackUsed:ai.data?.fallbackUsed??null,latencyMs:ai.ms,
 validatedFields:["summary","drivers","upside","downside","watch","uncertainty"].every(k=>typeof ai.data?.[k]==="string"&&ai.data[k].length>=10)}));
const groups=[];
for(const concurrency of [2,4,8]){
 const target=24, results=[],paths=["/api/hot-news","/api/hot-news","/api/weekly-plan?symbol=XAUUSD"];
 let index=0,stop=false;
 const work=async()=>{
  while(index<target&&!stop){
   const item=index++;const res=await check(paths[item%paths.length]);
   results.push(res);
   if(results.length>=10&&results.filter(r=>r.status!==200).length/results.length>.3)stop=true;
  }
 };
 const begin=performance.now();
 await Promise.all(Array.from({length:concurrency},()=>work()));
 const ms=results.map(r=>r.ms).sort((a,b)=>a-b);
 const errors=results.filter(r=>r.status!==200||r.err).length;
 const summary={concurrency,requests:results.length,errors,p50Ms:pctl(ms,50),p95Ms:pctl(ms,95),
  peakMs:ms.at(-1)||0,durationMs:Math.round(performance.now()-begin),statusCounts:results.reduce((a,r)=>(a[r.status||"network"]=(a[r.status||"network"]||0)+1,a),{})};
 groups.push(summary);console.log("LOAD "+JSON.stringify(summary));
 if(stop)break;
}
const health=rows.find(r=>r.path==="/api/engine-health");
const badHealth=health?.status!==200||health?.data?.status!=="ready";
const badBurst=groups.some(g=>g.errors>Math.max(1,Math.floor(g.requests*.1)));
const report={started,finished:new Date().toISOString(),maxConcurrent:8,
 requestsTotal:rows.length+groups.reduce((s,x)=>s+x.requests,0),
 productionAI:{httpStatus:ai.status,appStatus:ai.appStatus,model:ai.data?.model||null,fallbackUsed:ai.data?.fallbackUsed??null,warmCacheLatencyMs:warmAI?.ms??null,warmCacheValid:warmAI?.status===200&&warmAI?.data?.status==="ready",
 valid:ai.status===200&&ai.data?.status==="ready"&&["summary","drivers","upside","downside","watch","uncertainty"].every(k=>typeof ai.data[k]==="string"&&ai.data[k].length>=10)},
 endpoints:rows.map(({path,status,ms,err,appStatus,cacheStatus})=>({path,status,ms,err,appStatus,cacheStatus})),
 bursts:groups,verdict:badHealth||badBurst?"failed":!ai.status||ai.status!==200?"degraded":"passed",
 note:"Small bounded live burst, not a guarantee for thousands of simultaneous visitors."};
mkdirSync("test-results",{recursive:true});
writeFileSync("test-results/production-smoke.json",JSON.stringify(report,null,2));
console.log("PRODUCTION_RESULT "+JSON.stringify({verdict:report.verdict,requestsTotal:report.requestsTotal,ai:report.productionAI}));
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,
 "\n### Live production probe\n\n- Verdict: **"+report.verdict+"**\n- Requests: "+report.requestsTotal+
 "\n- Max concurrency: 8\n- AI API status: "+(ai.appStatus||ai.status)+
 "\n- Successful verified AI response: "+report.productionAI.valid+
 "\n- No saturation stress test; no paid resources activated.\n");
if(report.verdict==="failed")process.exitCode=1;
