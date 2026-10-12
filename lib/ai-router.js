/* Workers AI models share the same free-neuron pool. No paid provider. */
export const TASK_MODELS=Object.freeze({
 outlook:Object.freeze(["@cf/qwen/qwen3-30b-a3b-fp8","@cf/meta/llama-3.1-8b-instruct-fp8","@cf/zai-org/glm-4.7-flash"]),
 news:Object.freeze(["@cf/zai-org/glm-4.7-flash","@cf/meta/llama-3.1-8b-instruct-fp8","@cf/qwen/qwen3-30b-a3b-fp8"]),
 translation:Object.freeze(["@cf/meta/llama-3.1-8b-instruct-fp8","@cf/meta/llama-3.2-3b-instruct","@cf/qwen/qwen3-30b-a3b-fp8"])
});
export const modelText=output=>typeof output?.response==="string"?output.response:
 typeof output?.result?.response==="string"?output.result.response:
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
export async function runTaskAI({env,task,messages,temperature=0,max_tokens=700,validate=modelText}){
 const models=TASK_MODELS[task];
 if(!models)throw new TypeError("Unknown AI task");
 if(typeof env?.AI?.run!=="function")return {status:"unavailable"};
 let malformed=false;
 for(let index=0;index<models.length;index++){
  try{
   const output=await env.AI.run(models[index],{messages,temperature,max_tokens});
   const value=validate(output);
   if(value)return {status:"ready",value,model:models[index],fallbackUsed:index>0};
   malformed=true;
  }catch(error){
   if(isSharedQuotaError(error))return {status:"quota-exhausted"};
  }
 }
 return {status:malformed?"validation-failed":"model-unavailable"};
}
