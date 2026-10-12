import test from "node:test";
import assert from "node:assert/strict";
import {TASK_MODELS,modelText,isSharedQuotaError,runTaskAI} from "../lib/ai-router.js";
test("roles have different primary models and backups",()=>{
 const primaries=["outlook","news","translation"].map(k=>TASK_MODELS[k][0]);
 assert.equal(new Set(primaries).size,3);
 for(const models of ["outlook","news","translation"].map(k=>TASK_MODELS[k])){
  assert.equal(models.length,3);
  assert.equal(new Set(models).size,3);
  assert.ok(models.every(x=>x.startsWith("@cf/")));
 }
});
test("primary model avoids unnecessary retries",async()=>{
 const calls=[];
 const result=await runTaskAI({env:{AI:{run:async model=>{calls.push(model);return {response:"ok"}}}},task:"news",messages:[]});
 assert.equal(result.status,"ready");
 assert.equal(result.fallbackUsed,false);
 assert.deepEqual(calls,[TASK_MODELS.news[0]]);
});
test("recoverable model failure triggers fallback",async()=>{
 const calls=[];
 const result=await runTaskAI({env:{AI:{run:async model=>{calls.push(model);if(calls.length===1)throw new Error("3040 out of capacity");return {response:"valid"}}}},task:"outlook",messages:[],validate:x=>x.response==="valid"?x.response:null});
 assert.equal(result.status,"ready");
 assert.equal(result.model,TASK_MODELS.outlook[1]);
 assert.equal(result.fallbackUsed,true);
 assert.deepEqual(calls,TASK_MODELS.outlook.slice(0,2));
});
test("invalid response uses next model only after validation fails",async()=>{
 let calls=0;
 const result=await runTaskAI({env:{AI:{run:async()=>({response:++calls===1?"bad":"valid"})}},task:"translation",messages:[],validate:x=>x.response==="valid"?x.response:null});
 assert.equal(calls,2);
 assert.equal(result.value,"valid");
});
test("shared neuron limit stops all further retries",async()=>{
 let calls=0;
 const result=await runTaskAI({env:{AI:{run:async()=>{calls++;throw Object.assign(new Error("You have used up your daily free allocation of 10,000 neurons."),{code:3036})}}},task:"outlook",messages:[]});
 assert.equal(result.status,"quota-exhausted");
 assert.equal(calls,1);
 assert.equal(isSharedQuotaError({code:3040,message:"Capacity temporarily exceeded"}),false);
});
test("missing binding or invalid output does not fabricate result",async()=>{
 assert.equal((await runTaskAI({env:{},task:"news",messages:[]})).status,"unavailable");
 let calls=0;
 const result=await runTaskAI({env:{AI:{run:async()=>{calls++;return {response:"invalid"}}}},task:"news",messages:[],validate:()=>null});
 assert.equal(result.status,"validation-failed");
 assert.equal(calls,TASK_MODELS.news.length);
 assert.equal(modelText({result:{response:"hello"}}),"hello");
});
test("invalid task is rejected",async()=>{
 await assert.rejects(()=>runTaskAI({env:{},task:"unused",messages:[]}),TypeError);
});

test("deprecated Cloudflare model is not used and chat-completion variants parse",()=>{
 const values=Object.values(TASK_MODELS).flat();
 assert.equal(values.some(x=>x.includes("gemma-3-12b-it")),false);
 assert.equal(modelText({choices:[{message:{content:"new"}}]}),"new");
 assert.equal(modelText({result:{choices:[{message:{content:"nested"}}]}}),"nested");
});

test("busy-queue rejection option is passed to Cloudflare binding",async()=>{
 const args=[];
 const result=await runTaskAI({env:{AI:{run:async(...items)=>{args.push(items);return {response:"ok"}}}},task:"outlook",messages:[{role:"user",content:"test"}]});
 assert.equal(result.status,"ready");
 assert.equal(args.length,1);
 assert.equal(args[0][0],TASK_MODELS.outlook[0]);
 assert.deepEqual(args[0][2],{rejectIfBusy:true});
});

test("policy route prefers verified lightweight models without paid providers",()=>{
 assert.equal(TASK_MODELS.policy.length,2);
 assert.equal(TASK_MODELS.policy[0],"@cf/meta/llama-3.1-8b-instruct-fp8");
 assert.ok(TASK_MODELS.policy.every(x=>x.startsWith("@cf/")));
});

test("active Cloudflare fast model receives JSON schema only when supported",async()=>{
 const list=[],format={type:"json_schema",json_schema:{type:"object",properties:{summary:{type:"string"}},required:["summary"]}};
 const value=await runTaskAI({env:{AI:{run:async(model,payload)=>{list.push({model,payload});return {response:{summary:"Source quote check"}}}}},
  task:"intelligence",messages:[],response_format:format,validate:r=>r.response?.summary});
 assert.equal(value.status,"ready");
 assert.equal(value.model,"@cf/meta/llama-3.1-8b-instruct-fast");
 assert.deepEqual(list[0].payload.response_format,format);
});

test("complex article falls back to JSON-capable active 70B Fast instead of slow non-schema models",async()=>{
 let n=0;const args=[];
 const format={type:"json_schema",json_schema:{type:"object",properties:{summary:{type:"string"}},required:["summary"]}};
 const result=await runTaskAI({env:{AI:{run:async(model,payload)=>{
  args.push([model,payload]);
  if(++n===1)return {response:"invalid"};
  return {response:{summary:"Article-grounded interpretation"}};
 }}},task:"intelligence",messages:[{role:"user",content:"source"}],response_format:format,
  validate:v=>v?.response&&typeof v.response==="object"?v.response.summary:null});
 assert.equal(result.status,"ready");
 assert.equal(result.fallbackUsed,true);
 assert.equal(args.length,2);
 assert.equal(args[1][0],"@cf/meta/llama-3.3-70b-instruct-fp8-fast");
 assert.deepEqual(args[1][1].response_format,format);
});
