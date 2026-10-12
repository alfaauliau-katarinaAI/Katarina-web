import test from "node:test";
import assert from "node:assert/strict";
import {TASK_MODELS,modelText,isSharedQuotaError,runTaskAI} from "../lib/ai-router.js";
test("roles have different primary models and backups",()=>{
 const primaries=Object.values(TASK_MODELS).map(x=>x[0]);
 assert.equal(new Set(primaries).size,3);
 for(const models of Object.values(TASK_MODELS)){
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
