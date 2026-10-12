import test from "node:test";
import assert from "node:assert/strict";
import worker,{parseRSS} from "../workers/autonomous.js";
const now=Date.parse("2026-10-12T02:01:00.000Z");
const item=(title,link,time=new Date(now-20000).toUTCString())=>"<item><title>"+title+"</title><link>"+link+"</link><pubDate>"+time+"</pubDate></item>";
const sample="<rss><channel>"+item("Federal Reserve market inflation and rates outlook update","https://www.cnbc.com/2026/10/12/federal-reserve.html")+"</channel></rss>";
test("Autonomous RSS parser only accepts recent publisher-verified headlines",()=>{
 const feed=["CNBC","https://www.cnbc.com/id/test/rss.xml","www.cnbc.com"];
 const found=parseRSS(sample,feed,now);
 assert.equal(found.length,1);assert.equal(found[0].source,"CNBC");assert.equal(found[0].category,"Suku Bunga / Inflasi");
 assert.equal(parseRSS("<rss>"+item("Markets Federal Reserve monetary outlook is updated","https://www.cnbc.com.attacker.invalid/latest")+"</rss>",feed,now).length,0);
 assert.equal(parseRSS("<rss>"+item("Markets Federal Reserve monetary outlook is updated","https://www.cnbc.com/old",new Date(now-80*3600000).toUTCString())+"</rss>",feed,now).length,0);
});
test("Every cron run touches only two different news sources and uses D1",async()=>{
 const original=globalThis.fetch;const network=[],writes=[];let waiting;
 globalThis.fetch=async (url)=>{network.push(String(url));return new Response(sample,{status:200})};
 const env={DB:{prepare:(sql)=>({bind:(...values)=>({
  all:async()=>({results:[]}),
  first:async()=>null,
  run:async()=>{writes.push({sql,values});return {success:true}}
 })})}};
 try{
  await worker.scheduled({scheduledTime:now},env,{waitUntil:p=>waiting=p});
  await waiting;
  assert.equal(network.length,2);
  assert.notEqual(network[0],network[1]);
  assert.equal(writes.length,2);
  assert.ok(writes.every(x=>x.sql.includes("INSERT OR IGNORE INTO headlines")));
 }finally{globalThis.fetch=original}
});
test("Every completed H4 window checks three instruments per minute, never 34 at once",async()=>{
 const original=globalThis.fetch,network=[];let waiting;
 const time=Date.parse("2026-10-12T04:08:00Z");
 const asset={status:"ready",symbol:"XAUUSD",direction:"BUY",lastClosedAt:"2026-10-12T04:00:00.000Z",source:"mock",
   marketCondition:{h4Close:4000},reasons:[]};
 globalThis.fetch=async url=>{network.push(String(url));return String(url).includes("/api/weekly-plan")?
  new Response(JSON.stringify(asset),{status:200}):new Response(sample,{status:200})};
 const writes=[];
 const env={DB:{prepare:sql=>({bind:(...values)=>({
  all:async()=>({results:[]}),first:async()=>null,run:async()=>{writes.push({sql,values});return {success:true}}
 })})}};
 try{
  await worker.scheduled({scheduledTime:time},env,{waitUntil:p=>waiting=p});await waiting;
  assert.equal(network.filter(x=>x.includes("/api/weekly-plan")).length,3);
  assert.equal(network.filter(x=>!x.includes("/api/weekly-plan")).length,2);
  assert.equal(writes.filter(x=>x.sql.includes("h4_analyses")).length,3);
 }finally{globalThis.fetch=original}
});
