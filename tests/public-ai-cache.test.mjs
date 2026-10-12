import test from "node:test";
import assert from "node:assert/strict";
import {readPublicAI,writePublicAI,publicAIKey} from "../lib/public-ai-cache.js";
import {readFileSync} from "node:fs";
const response={schema:1,status:"ready",symbol:"XAUUSD",generatedAt:new Date().toISOString(),summary:"Documented scenario",model:"test"};
test("shared KV cache stores only successful public AI responses",async()=>{
 const kv=new Map();
 const env={KATARINA_CACHE:{
  put:async(k,s)=>kv.set(k,JSON.parse(s)),
  get:async k=>kv.get(k)
 }};
 assert.equal(await writePublicAI(env,"outlook:XAUUSD",response,21600),true);
 assert.equal((await readPublicAI(env,"outlook:XAUUSD",21600000,x=>x.symbol==="XAUUSD"))?.summary,"Documented scenario");
 assert.equal(await writePublicAI(env,"failed",{status:"quota-exhausted"},1800),false);
 assert.equal(kv.has("failed"),false);
 assert.equal(await readPublicAI(env,"outlook:XAUUSD",21600000,x=>x.symbol==="EURUSD"),null);
});
test("expired, future-dated and malformed cached data are rejected",async()=>{
 const entries={expired:{...response,generatedAt:"2020-01-01T00:00:00Z"},future:{...response,generatedAt:"2099-01-01T00:00:00Z"},error:{...response,status:"unavailable"}};
 const env={KATARINA_CACHE:{get:async k=>entries[k]}};
 for(const key of Object.keys(entries))assert.equal(await readPublicAI(env,key,21600000,()=>true),null);
});
test("KV missing or full does not block website",async()=>{
 assert.equal(await readPublicAI(null,"key",1,()=>true),null);
 assert.equal(await writePublicAI({}, "key",response,600),false);
 assert.equal(await writePublicAI({KATARINA_CACHE:{put:async()=>{throw Error("KV quota")}}},"key",response,600),false);
});
test("hashed key avoids long URL identifiers and is stable",async()=>{
 const key1=await publicAIKey("news:v2","https://www.cnbc.com/2026/10/12/one?x=1");
 const key2=await publicAIKey("news:v2","https://www.cnbc.com/2026/10/12/one?x=1");
 assert.equal(key1,key2);assert.ok(key1.length<120);
 assert.notEqual(key1,await publicAIKey("news:v2","https://www.cnbc.com/2026/10/12/two"));
});
test("public pages optimize existing polling and avoid speculative AI traffic",()=>{
 const app=readFileSync(new URL("../website/app-v4.js",import.meta.url),"utf8");
 const story=readFileSync(new URL("../website/hot-news.js",import.meta.url),"utf8");
 const chart=readFileSync(new URL("../website/chart-draw-v6.js",import.meta.url),"utf8");
 assert.ok(app.includes("15*60000"));
 assert.ok(app.includes("katarina:public:v3:"));
 assert.ok(story.includes("void analyse(item,index)"));
 assert.ok(!story.includes("void analyse(items[0],0)"));
 assert.ok(chart.includes("10*60000"));
});
