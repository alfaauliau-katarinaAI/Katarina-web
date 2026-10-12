#!/usr/bin/env node
/* One fourth-headline test; do not fabricate results if source text is missing. */
const root="https://katarina-research.pages.dev";
const request=async(path,timeout)=>{
 const r=await fetch(root+path,{headers:{Accept:"application/json","User-Agent":"KATARINA-universal-news-check/1.0"},signal:AbortSignal.timeout(timeout)});
 return {status:r.status,data:await r.json()};
};
const report={api:"news-intelligence",testedIndex:3,sourceSpecific:false,valid:false};
try{
 const news=await request("/api/hot-news",11000);
 const article=news.data?.items?.[3];
 if(news.status!==200||!article?.url)throw Error("Fourth headline unavailable");
 const query=new URLSearchParams({scope:"dashboard",index:"3",expected:article.url});
 const result=await request("/api/news-intelligence?"+query.toString(),36000);
 report.http=result.status;report.status=result.data.status;
 report.sourceSpecific=result.data.url===article.url;
 report.valid=result.status===200&&result.data.status==="ai-full-article"&&report.sourceSpecific&&
  ["summary","policyEvidence","benefits","harms","macroMechanism","watch"].every(k=>typeof result.data[k]==="string"&&result.data[k].length>=12)&&
  Array.isArray(result.data.marketEffects);
 report.hasEvidenceQuote=typeof result.data.sourceQuote==="string"&&result.data.sourceQuote.length>=18;
 report.reason=!report.valid?String(result.data.reason||"Publisher content/AI response unavailable").slice(0,180):undefined;
 console.log("ALL_NEWS_PRODUCTION "+JSON.stringify(report));
 if([400,404,409].includes(result.status)||result.data.status==="article-not-found"||result.data.status==="headline-changed")process.exitCode=1;
}catch(error){
 report.status="network-or-timeout";report.reason=String(error?.message||error).slice(0,130);
 console.log("ALL_NEWS_PRODUCTION "+JSON.stringify(report));
}
