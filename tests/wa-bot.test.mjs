import test from "node:test";
import assert from "node:assert/strict";
import {createHmac,webcrypto} from "node:crypto";
import {command,formatReport} from "../lib/wa-report.js";
import {onRequestGet,onRequestPost} from "../functions/api/wa-webhook.js";
globalThis.crypto??=webcrypto;
test("WhatsApp parsing and report evidence gates",()=>{
 assert.deepEqual(command("ANALISA USDJPY"),{action:"report",symbol:"USDJPY"});
 assert.equal(command("ANALISA RANDOM").action,"invalid-symbol");
 assert.equal(command("STOP").action,"stop");
 const plan={status:"ready",symbol:"USDJPY",direction:"BUY",lastClosedAt:new Date().toISOString(),marketCondition:{h4Close:150.1,ema20:149.7,ema50:149.1,rsi14:59,atr14:1.25},trigger:151.2,invalidation:147.8,objective:153.4,source:"historical data test",condition:"Tunggu penutupan H4",reasons:["Harga di atas EMA20."],news:[],cotNote:"Belum ada COT"};
 const msg=formatReport({symbol:"USDJPY",plan,cot:{data:[]},calendar:{events:[]}});
 assert.match(msg,/BATAL/);assert.match(msg,/COT/);assert.ok(msg.length<=3900);
 assert.match(formatReport({symbol:"USDJPY",plan:{...plan,invalidation:159}}),/LAPORAN DITAHAN/);
 assert.match(formatReport({symbol:"USDJPY",plan:{status:"no-clear-direction",message:"H4 tidak sejalan"}}),/TIDAK ADA PLAN/);
});
test("Meta webhook verifies token/signature, allowlist, and disabled-by-default",async()=>{
 const check=new Request("https://katarina-research.pages.dev/api/wa-webhook?hub.mode=subscribe&hub.verify_token=verify&hub.challenge=1234");
 assert.equal(await (await onRequestGet({request:check,env:{WA_VERIFY_TOKEN:"verify"}})).text(),"1234");
 assert.equal((await onRequestGet({request:check,env:{WA_VERIFY_TOKEN:"wrong"}})).status,403);
 const env={WA_BOT_ENABLED:"true",WA_VERIFY_TOKEN:"verify",WA_APP_SECRET:"test_secret",WA_ACCESS_TOKEN:"not_real",WA_PHONE_NUMBER_ID:"1234567890",WA_ALLOWED_TEST_NUMBERS:"628123456789"};
 const msg={object:"whatsapp_business_account",entry:[{changes:[{field:"messages",value:{metadata:{phone_number_id:"1234567890"},messages:[{id:"wamid.example12345",from:"628123456789",type:"text",text:{body:"BANTUAN"}}]}}]}]};
 const raw=JSON.stringify(msg);
 const fakeSig="sha256="+createHmac("sha256","test_secret").update(raw).digest("hex");
 const req=(signature,body=raw)=>new Request("https://katarina-research.pages.dev/api/wa-webhook",{method:"POST",headers:{"x-hub-signature-256":signature},body});
 assert.equal((await onRequestPost({request:req("sha256"+"0".repeat(64)),env})).status,403);
 assert.equal((await onRequestPost({request:req(fakeSig),env:{...env,WA_BOT_ENABLED:"false"}})).status,200);
 let calls=0,tasks=[];const old=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{assert.match(String(url),/^https:\/\/graph\.facebook\.com\/v26\.0\//);assert.equal(JSON.parse(options.body).to,"628123456789");calls++;return new Response("{}",{status:200})};
 try{
  assert.equal((await onRequestPost({request:req(fakeSig),env,context:{waitUntil:p=>tasks.push(p)}})).status,200);
  await Promise.all(tasks);
  assert.equal(calls,1);
  const limited={...env,WA_ALLOWED_TEST_NUMBERS:"628999999999"};tasks=[];
  assert.equal((await onRequestPost({request:req(fakeSig),env:limited,context:{waitUntil:p=>tasks.push(p)}})).status,200);
  await Promise.all(tasks);assert.equal(calls,1);
 }finally{globalThis.fetch=old}
});
