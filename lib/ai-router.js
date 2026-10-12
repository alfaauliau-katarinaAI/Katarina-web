/* Workers AI models share the same free-neuron pool. No paid provider. */
export const TASK_MODELS=Object.freeze({
 outlook:Object.freeze(["@cf/meta/llama-3.1-8b-instruct-fp8","@cf/qwen/qwen3-30b-a3b-fp8","@cf/zai-org/glm-4.7-flash"]),
 news:Object.freeze(["@cf/zai-org/glm-4.7-flash","@cf/meta/llama-3.1-8b-instruct-fp8","@cf/qwen/qwen3-30b-a3b-fp8"]),
 translation:Object.freeze(["@cf/meta/llama-3.2-3b-instruct","@cf/meta/llama-3.1-8b-instruct-fp8","@cf/qwen/qwen3-30b-a3b-fp8"]),
 policy:Object.freeze(["@cf/meta/llama-3.1-8b-instruct-fp8","@cf/meta/llama-3.2-3b-instruct"]),
 intelligence:Object.freeze(["@cf/meta/llama-3.1-8b-instruct-fast","@cf/meta/llama-3.3-70b-instruct-fp8-fast"])
});
export const modelText=output=>typeof output?.response==="string"?output.response:
 output?.response&&typeof output.response==="object"?JSON.stringify(output.response):
 typeof output?.result?.response==="string"?output.result.response:
 output?.result?.response&&typeof output.result.response==="object"?JSON.stringify(output.result.response):
 typeof output?.choices?.[0]?.message?.content==="string"?output.choices[0].message.content:
 typeof output?.result?.choices?.[0]?.message?.content==="string"?output.result.choices[0].message.content:"";
export function isSharedQuotaError(error){
 const code=String(error?.code??error?.error?.code??error?.cause?.code??"");
 const detail=String(error?.message??error?.error?.message??error??"");
 return code==="3036"||/\b3036\b/.test(detail)||
 /used up (?:your )?daily free allocation|daily.{0,40}(?:neuron|quota)|free.{0,30}allocation.{0,30}(?:used|exceed)|quota.{0,30}exceed|insufficient.{0,30}neuron/i.test(detail);
}
/* Run one specialist. Retry only on model failure or invalid output.
 * Stop immediately when Cloudflare account-wide daily neurons are exhausted.
 */
export async function runTaskAI({env,task,messages,temperature=0,max_tokens=700,response_format=null,validate=modelText}){
 const models=TASK_MODELS[task];
 if(!models)throw new TypeError("Unknown AI task");
 if(typeof env?.AI?.run!=="function")return {status:"unavailable"};
 let malformed=false;
 for(let index=0;index<models.length;index++){
  try{
   const input={messages,temperature,max_tokens};
   if(response_format&&/llama-3\.(?:1-8b-instruct-fast|3-70b-instruct-fp8-fast)$/.test(models[index]))input.response_format=response_format;
   const output=await env.AI.run(models[index],input,{rejectIfBusy:true});
   const value=validate(output);
   if(value)return {status:"ready",value,model:models[index],fallbackUsed:index>0};
   malformed=true;
  }catch(error){
   if(isSharedQuotaError(error))return {status:"quota-exhausted"};
  }
 }
 return {status:malformed?"validation-failed":"model-unavailable"};
}
