/* Public-only cross-colo Workers AI result cache via existing optional KV.
 * Strict TTL/facts validation: never cache user-specific data or failures.
 * No new Cloudflare resources; safe when KV binding/permissions are absent.
 */
export async function readPublicAI(env,key,maxAgeMs,validate){
 if(typeof env?.KATARINA_CACHE?.get!=="function")return null;
 try{
  const value=await env.KATARINA_CACHE.get(key,{type:"json"});
  const timestamp=Date.parse(value?.generatedAt||value?.analysedAt||"");
  if(!value||value.status!=="ready"&&value.status!=="ai-full-article"||
     !Number.isFinite(timestamp)||timestamp>Date.now()+60000||
     Date.now()-timestamp>maxAgeMs||!validate(value))return null;
  return value;
 }catch{return null}
}
export async function writePublicAI(env,key,value,ttlSeconds){
 if(typeof env?.KATARINA_CACHE?.put!=="function")return false;
 if(!value||!["ready","ai-full-article"].includes(value.status))return false;
 try{
  await env.KATARINA_CACHE.put(key,JSON.stringify(value),{expirationTtl:ttlSeconds});
  return true;
 }catch{return false}
}
export async function publicAIKey(namespace,identity){
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(identity));
 return namespace+":"+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
}
