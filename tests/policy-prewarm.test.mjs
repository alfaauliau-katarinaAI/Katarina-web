import test from "node:test";
import assert from "node:assert/strict";
import {prewarmPolicy} from "../workers/autonomous.js";
test("prewarm is skipped with no existing KV binding",async()=>{
 assert.equal(await prewarmPolicy({},Date.parse("2026-10-12T04:08:00Z")),"no-kv");
});
test("prewarm uses one verified latest headline and deduplicates URL, no second LLM",async()=>{
 const now=Date.parse("2026-10-12T04:08:00Z"),values=new Map(),calls=[];
 const env={CACHE:{get:async k=>values.get(k)||null,put:async(k,v)=>{values.set(k,v)}}};
 const item={url:"https://www.rba.gov.au/media-releases/2026/mr-26-27.html",title:"Statement by the Monetary Policy Board: Monetary Policy Decision",publishedAt:new Date(now-120000).toISOString(),market:"AUD"};
 const fetcher=async url=>{
  calls.push(String(url));
  if(String(url).includes("/api/pair-news?"))return new Response(JSON.stringify({items:[item]}),{status:200});
  if(String(url).includes("/api/policy-brief?"))return new Response(JSON.stringify({status:"ai-full-article"}),{status:200});
  throw Error("Unexpected remote target");
 };
 assert.equal(await prewarmPolicy(env,now,fetcher),"attempted");
 assert.equal(calls.filter(x=>x.includes("/api/policy-brief")).length,1);
 assert.equal(await prewarmPolicy(env,now,fetcher),"nothing-new");
 assert.equal(calls.filter(x=>x.includes("/api/policy-brief")).length,1);
});
test("daily cap and older statistical releases cannot trigger unbounded AI usage",async()=>{
 const now=Date.parse("2026-10-12T04:08:00Z"),kv=new Map([["policy:daily:2026-10-12","8"]]);
 const env={CACHE:{get:async k=>kv.get(k),put:async(k,v)=>kv.set(k,v)}};
 assert.equal(await prewarmPolicy(env,now,async()=>{throw Error("must not call")}),"daily-cap");
 kv.set("policy:daily:2026-10-12","0");
 const result=await prewarmPolicy(env,now,async()=>new Response(JSON.stringify({items:[{url:"https://www.boj.or.jp/example",title:"Japanese Government Bonds Held by the Bank of Japan",publishedAt:new Date(now-20000).toISOString()}]}),{status:200}));
 assert.equal(result,"nothing-new");
});
