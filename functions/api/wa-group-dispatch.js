/* Outbound-only WhatsApp Groups API test publisher.
 * No incoming message commands, no individual recipient delivery.
 * Requires official Groups API eligibility, explicit opt-in, durable KV, and secrets.
 */
import {formatReport} from "../../lib/wa-report.js";
import {pairList,chooseGroupUpdate,savedState,invalidatedText,noPlanText} from "../../lib/wa-group-broadcast.js";
import {onRequestGet as getWeekly} from "./weekly-plan.js";
import {onRequestGet as getCot} from "./cot.js";

const respond=(obj,code=200)=>new Response(JSON.stringify(obj),{status:code,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const auth=(request,env)=>!!env?.WA_GROUP_JOB_TOKEN&&
 request.headers.get("authorization")==="Bearer "+env.WA_GROUP_JOB_TOKEN;
const validMetaGroup=id=>/^[A-Za-z0-9_+=\/:-]{10,256}$/.test(String(id||""))&&!String(id).endsWith("@g.us");
const validPhone=id=>/^\d{5,30}$/.test(String(id||""));
async function jsonFrom(response){try{return response?.ok?await response.json():null}catch{return null}}
async function calendar(request,env){
 if(!env?.ASSETS?.fetch)return null;
 try{const r=await env.ASSETS.fetch(new Request(new URL("/calendar-brief.json",request.url)));return r.ok?await r.json():null}catch{return null}
}
export async function sendMetaGroupText({env,body}){
 if(!validPhone(env?.WA_PHONE_NUMBER_ID)||!validMetaGroup(env?.WA_GROUP_ID)||!env?.WA_ACCESS_TOKEN)throw Error("group identity or API credentials missing");
 const endpoint="https://graph.facebook.com/v26.0/"+env.WA_PHONE_NUMBER_ID+"/messages";
 const response=await fetch(endpoint,{method:"POST",headers:{"Authorization":"Bearer "+env.WA_ACCESS_TOKEN,"Content-Type":"application/json"},
  body:JSON.stringify({messaging_product:"whatsapp",recipient_type:"group",to:env.WA_GROUP_ID,type:"text",text:{preview_url:false,body:body.slice(0,3900)}}),signal:AbortSignal.timeout(18000)});
 if(!response.ok)throw Error("Meta group message rejected (HTTP "+response.status+")");
 const payload=await response.json().catch(()=>({}));
 const messageId=payload?.messages?.[0]?.id;
 if(typeof messageId!=="string"||!messageId)throw Error("Meta did not acknowledge group message ID");
 return {accepted:true}; // API acceptance is not delivery confirmation.
}
export async function onRequestGet(){
 return respond({schema:1,mode:"outbound-group-only",status:"safe-by-default",automated:"after-configuration",inboundReplies:false,individualMessages:false});
}
export async function onRequestPost({request,env}){
 if(!auth(request,env))return respond({status:"forbidden"},403);
 const u=new URL(request.url),preview=u.searchParams.get("preview")==="1";
 if(!preview&&env?.WA_GROUP_ENABLED!=="true")return respond({status:"disabled",sent:0,detail:"Pengiriman ke grup belum diaktifkan."});
 const groups=pairList(env?.WA_GROUP_PAIRS);
 if(!groups.length)return respond({status:"no-pairs-configured"},503);
 if(!preview){
  if(!validMetaGroup(env?.WA_GROUP_ID)||!validPhone(env?.WA_PHONE_NUMBER_ID)||!env?.WA_ACCESS_TOKEN)return respond({status:"group-api-not-configured",detail:"Wajib menggunakan Group ID resmi Meta, bukan JID grup WhatsApp Web."},503);
  if(typeof env?.WA_GROUP_STATE?.get!=="function"||typeof env?.WA_GROUP_STATE?.put!=="function")return respond({status:"durable-state-not-configured",detail:"Cloudflare KV dibutuhkan agar bot tidak mengirim pesan berulang."},503);
 }
 const selected=groups.slice(0,3),entries=[];let sent=0,errors=0,skipped=0,attempts=0;
 for(const symbol of selected){
  const key="group-v1:"+symbol;
  try{
   const previous=env?.WA_GROUP_STATE?.get?await env.WA_GROUP_STATE.get(key,{type:"json"}):null;
   const plan=await jsonFrom(await getWeekly({request:new Request(new URL("/api/weekly-plan?symbol="+symbol,u))}));
   const decision=chooseGroupUpdate({symbol,plan,previous,now:Date.now()});
   if(decision.action==="skip"){entries.push({symbol,action:"skip",reason:decision.reason});skipped++;continue}
   let content;
   if(decision.action==="report"){
    const [cotResult,events]=await Promise.allSettled([getCot({request:new Request(new URL("/api/cot?symbol="+symbol,u))}),calendar(request,env)]);
    const cot=cotResult.status==="fulfilled"?await jsonFrom(cotResult.value):null;
    const data=events.status==="fulfilled"?events.value:null;
    content=formatReport({symbol,plan,cot,calendar:data});
    if(content.includes("LAPORAN DITAHAN")||content.includes("TIDAK ADA PLAN AKTIF"))throw Error("Risk verification rejected report");
   }else if(decision.action==="invalidated")content=invalidatedText({symbol,previous,plan});
   else if(decision.action==="no-plan")content=noPlanText(symbol);
   else throw Error("Unknown decision");
   if(preview){entries.push({symbol,action:decision.action,reason:decision.reason,preview:content.slice(0,3800)});continue}
   attempts++;
   await sendMetaGroupText({env,body:content});
   await env.WA_GROUP_STATE.put(key,JSON.stringify(savedState({...decision,plan,previous,now:Date.now()})));
   sent++;entries.push({symbol,action:decision.action,status:"accepted-by-api"});
  }catch{
   errors++;entries.push({symbol,status:"failed-or-unavailable",reason:"Data, izin grup, atau pengiriman perlu diperiksa."});
  }
 }
 return respond({schema:1,status:preview?"preview":errors?"partial-or-failed":"checked",mode:"group-only",
  accepted:sent,attempted:attempts,skipped,failed:errors,entries},errors&&!preview?502:200);
}
