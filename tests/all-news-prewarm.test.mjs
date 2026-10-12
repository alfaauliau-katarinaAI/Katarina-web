import test from "node:test";
import assert from "node:assert/strict";
import {prewarmPublicNews} from "../workers/autonomous.js";
const now=Date.parse("2026-10-12T05:00:00Z");
test("all-news prewarmer avoids extra resources and respects free budgets",async()=>{
 assert.equal(await prewarmPublicNews({},now),"no-kv");
 const kv=new Map([["intel:daily:2026-10-12","48"]]);
 const env={CACHE:{get:async k=>kv.get(k),put:async(k,v)=>kv.set(k,v)}};
 assert.equal(await prewarmPublicNews(env,now,async()=>{throw Error("must not spend tokens")}),"daily-cap");
});
test("news prewarmer advances distinct URL and shares same source-backed cache",async()=>{
 const kv=new Map(),calls=[],env={CACHE:{get:async k=>kv.get(k)||null,put:async(k,v)=>kv.set(k,v)}};
 const items=["one","two"].map(x=>({url:"https://www.cnbc.com/2026/10/12/"+x,title:"Verified macro report "+x,publishedAt:new Date(now-80000).toISOString()}));
 const fetcher=async url=>{
  calls.push(url);if(url.endsWith("/api/hot-news"))return new Response(JSON.stringify({items}),{status:200});
  return new Response(JSON.stringify({status:"ai-full-article"}),{status:200});
 };
 assert.equal(await prewarmPublicNews(env,now,fetcher),"attempted");
 assert.equal(await prewarmPublicNews(env,now,fetcher),"attempted");
 assert.equal(await prewarmPublicNews(env,now,fetcher),"no-new-headlines");
 const aiCalls=calls.filter(x=>x.includes("/api/news-intelligence?"));
 assert.equal(aiCalls.length,2);
 assert.ok(aiCalls.every(x=>x.includes("expected=")&&x.includes("scope=dashboard")));
 assert.equal(Number(kv.get("intel:daily:2026-10-12")),2);
});
