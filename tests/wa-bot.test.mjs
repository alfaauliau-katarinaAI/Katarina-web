import test from "node:test";
import assert from "node:assert/strict";
import {command,formatReport} from "../lib/wa-report.js";
import {pairList,jakartaWeek,chooseGroupUpdate,savedState,invalidatedText} from "../lib/wa-group-broadcast.js";
import {onRequestGet as webhookGet,onRequestPost as webhookPost} from "../functions/api/wa-webhook.js";
import {onRequestGet as groupGet,onRequestPost as groupPost,sendMetaGroupText} from "../functions/api/wa-group-dispatch.js";

const plan={status:"ready",symbol:"USDJPY",direction:"BUY",lastClosedAt:"2026-10-12T00:00:00.000Z",
 marketCondition:{h4Close:150,ema20:149.7,ema50:148.9,rsi14:57,atr14:1},trigger:151,invalidation:148,objective:153,
 source:"H4 test",condition:"Tunggu H4 tutup di atas 151",reasons:["Harga di atas EMA20"],news:[],cotNote:"COT belum tersedia",cotAlignment:"belum tersedia",cotBias:null};
const now=Date.parse("2026-10-12T00:30:00Z"),ctx={symbol:"USDJPY",plan,now};

test("Premium report retains evidence and invalidation",()=>{
 assert.equal(command("ANALISA USDJPY").action,"report");
 const msg=formatReport({symbol:"USDJPY",plan,cot:{data:[]},calendar:{events:[]},now});
 assert.match(msg,/BATAL/);assert.match(msg,/COT/);assert.ok(msg.length<=3900);
 assert.match(formatReport({symbol:"USDJPY",plan:{...plan,invalidation:158},now}),/LAPORAN DITAHAN/);
});
test("Only three unique valid instruments can be configured",()=>{
 assert.deepEqual(pairList("XAUUSD,usdJPY,XAUUSD,INVALID,EURGBP,GBPJPY"),["XAUUSD","USDJPY","EURGBP"]);
 assert.deepEqual(pairList(""),["XAUUSD"]);assert.equal(jakartaWeek(now),"2026-10-12");
});
test("Group publication deduplicates and changes only for a new week or changed plan",()=>{
 const first=chooseGroupUpdate(ctx);assert.equal(first.action,"report");
 const state=savedState({...ctx,...first});
 assert.equal(chooseGroupUpdate({...ctx,previous:state}).action,"skip");
 assert.equal(chooseGroupUpdate({...ctx,previous:{...state,week:"2026-10-05"}}).action,"report");
 const sell={...plan,direction:"SELL",trigger:148,invalidation:151,objective:146};
 assert.equal(chooseGroupUpdate({...ctx,plan:sell,previous:state}).action,"report");
 const breached={...plan,marketCondition:{...plan.marketCondition,h4Close:147}};
 const invalid=chooseGroupUpdate({...ctx,plan:breached,previous:state});assert.equal(invalid.action,"invalidated");
 assert.match(invalidatedText({symbol:"USDJPY",previous:state,plan:breached}),/BATAL/);
 const stopped=savedState({...ctx,...invalid,plan:breached,previous:state});
 assert.equal(chooseGroupUpdate({...ctx,plan:breached,previous:stopped}).action,"skip");
 assert.equal(chooseGroupUpdate({...ctx,plan:{status:"no-clear-direction"},previous:state}).action,"no-plan");
 assert.equal(chooseGroupUpdate({...ctx,plan:{status:"stale-data"},previous:state}).action,"skip");
});
test("Incoming messages are ignored: no two-way chat or private sends",async()=>{
 const verify=new Request("https://katarina-research.pages.dev/api/wa-webhook?hub.mode=subscribe&hub.verify_token=test&hub.challenge=12345");
 assert.equal(await (await webhookGet({request:verify,env:{WA_VERIFY_TOKEN:"test"}})).text(),"12345");
 assert.equal((await webhookGet({request:verify,env:{WA_VERIFY_TOKEN:"wrong"}})).status,403);
 const inbound=await webhookPost({request:new Request("https://katarina-research.pages.dev/api/wa-webhook",{method:"POST",body:JSON.stringify({messages:[{text:"ANALISA XAUUSD"}]})})});
 assert.equal(inbound.status,200);assert.equal(await inbound.text(),"EVENT_RECEIVED");
});
test("Group endpoint authenticates caller and is disabled by default",async()=>{
 const req=k=>new Request("https://katarina-research.pages.dev/api/wa-group-dispatch",{method:"POST",headers:k?{authorization:"Bearer "+k}:{}});
 assert.equal((await groupPost({request:req(""),env:{WA_GROUP_JOB_TOKEN:"test-secret"}})).status,403);
 const result=await groupPost({request:req("test-secret"),env:{WA_GROUP_JOB_TOKEN:"test-secret",WA_GROUP_ENABLED:"false"}});
 assert.equal((await result.json()).status,"disabled");
 assert.equal((await (await groupGet()).json()).individualMessages,false);
});
test("Meta send payload addressed only to official group ID",async()=>{
 const prev=globalThis.fetch;let calls=0;
 globalThis.fetch=async(url,opts)=>{
  calls++;assert.match(url,/^https:\/\/graph\.facebook\.com\/v26\.0\/1234567890\/messages$/);
  const data=JSON.parse(opts.body);assert.equal(data.recipient_type,"group");
  assert.equal(data.to,"Y2FwaV9ncm91cDoxNzA1NTU1MDEzOToxMjAzNjM0MDQ2OTQyMzM4MjAZD");
  return new Response(JSON.stringify({messages:[{id:"wamid.group-test"}]}),{status:200});
 };
 try{
  const env={WA_PHONE_NUMBER_ID:"1234567890",WA_GROUP_ID:"Y2FwaV9ncm91cDoxNzA1NTU1MDEzOToxMjAzNjM0MDQ2OTQyMzM4MjAZD",WA_ACCESS_TOKEN:"fake"};
  assert.deepEqual(await sendMetaGroupText({env,body:"KATARINA"}),{accepted:true});
  assert.equal(calls,1);
  await assert.rejects(sendMetaGroupText({env:{...env,WA_GROUP_ID:"120363123@g.us"},body:"KATARINA"}));
  assert.equal(calls,1);
 }finally{globalThis.fetch=prev}
});
