/* Meta WhatsApp Cloud API trial. Disabled by default; replies only to allowlisted test numbers. */
import {command,helpText,formatReport} from "../../lib/wa-report.js";
import {onRequestGet as getWeekly} from "./weekly-plan.js";
import {onRequestGet as getCot} from "./cot.js";
const reply=(s,code=200)=>new Response(s,{status:code,headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"}});
const ok=()=>reply("EVENT_RECEIVED");
const num=s=>String(s||"").replace(/\D/g,"");
const allowlist=env=>new Set(String(env?.WA_ALLOWED_TEST_NUMBERS||"").split(",").map(num).filter(x=>x.length>=9&&x.length<=16));
export async function onRequestGet({request,env}){
 const u=new URL(request.url);
 if(u.searchParams.get("hub.mode")!=="subscribe"||!u.searchParams.has("hub.challenge"))return reply("Not found",404);
 if(!env?.WA_VERIFY_TOKEN||u.searchParams.get("hub.verify_token")!==env.WA_VERIFY_TOKEN)return reply("Not authorized",403);
 const challenge=u.searchParams.get("hub.challenge");
 return /^[\w.-]{1,256}$/.test(challenge)?reply(challenge):reply("Invalid challenge",400);
}
async function checkSignature(payload,header,secret){
 if(!secret||!/^sha256=[a-f0-9]{64}$/i.test(String(header||"")))return false;
 const bytes=Uint8Array.from(header.slice(7).match(/../g),v=>parseInt(v,16));
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["verify"]);
 return crypto.subtle.verify("HMAC",key,bytes,payload);
}
async function onlyOnce(messageId,request){
 if(!/^[\w.:\-]{10,200}$/.test(messageId))return false;
 try{
  const key=new Request(new URL("/api/wa-webhook?handled="+encodeURIComponent(messageId),request.url));
  const used=await caches.default.match(key);if(used)return false;
  await caches.default.put(key,new Response("1",{headers:{"Cache-Control":"public,max-age=0,s-maxage=21600"}}));
 }catch{/* cache unavailable in local test */}
 return true;
}
async function send(to,body,env){
 if(!env?.WA_ACCESS_TOKEN||!/^\d{5,30}$/.test(String(env.WA_PHONE_NUMBER_ID||"")))return;
 const url="https://graph.facebook.com/v26.0/"+env.WA_PHONE_NUMBER_ID+"/messages";
 const res=await fetch(url,{method:"POST",headers:{"Authorization":"Bearer "+env.WA_ACCESS_TOKEN,"Content-Type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",recipient_type:"individual",to,type:"text",text:{preview_url:false,body:body.slice(0,3900)}}),signal:AbortSignal.timeout(18000)});
 if(!res.ok)throw new Error("Meta message API returned HTTP "+res.status);
}
async function calendarData(request,env){
 if(!env?.ASSETS?.fetch)return null;
 try{const r=await env.ASSETS.fetch(new Request(new URL("/calendar-brief.json",request.url)));return r.ok?await r.json():null}catch{return null}
}
async function getJSON(res){try{return res?.ok?await res.json():null}catch{return null}}
async function handleOne(msg,request,env){
 const sender=num(msg.from);
 if(!sender||!allowlist(env).has(sender))return;
 const c=command(msg.text?.body);
 if(c.action==="stop"){await send(sender,"Tidak ada langganan otomatis yang aktif. Bot uji coba hanya membalas pesan yang kamu kirim.",env);return}
 if(c.action==="help"||c.action==="invalid-symbol"){await send(sender,c.action==="invalid-symbol"?"Pair belum tersedia. Contoh: *ANALISA XAUUSD* atau *ANALISA USDJPY*.\n\n"+helpText:helpText,env);return}
 const req=p=>new Request(new URL(p,request.url));
 const [a,b,d]=await Promise.allSettled([getWeekly({request:req("/api/weekly-plan?symbol="+c.symbol)}),getCot({request:req("/api/cot?symbol="+c.symbol)}),calendarData(request,env)]);
 const plan=a.status==="fulfilled"?await getJSON(a.value):null,cot=b.status==="fulfilled"?await getJSON(b.value):null,calendar=d.status==="fulfilled"?d.value:null;
 await send(sender,formatReport({symbol:c.symbol,plan,cot,calendar}),env);
}
export async function onRequestPost({request,env,context}){
 if(env?.WA_BOT_ENABLED!=="true")return ok();
 if(!env?.WA_APP_SECRET||!env?.WA_VERIFY_TOKEN||!env?.WA_ACCESS_TOKEN||!env?.WA_PHONE_NUMBER_ID||!allowlist(env).size)return reply("Bot not configured",503);
 if(Number(request.headers.get("content-length")||0)>128000)return reply("Payload too large",413);
 const payload=await request.arrayBuffer();
 if(payload.byteLength>128000)return reply("Payload too large",413);
 if(!(await checkSignature(payload,request.headers.get("x-hub-signature-256"),env.WA_APP_SECRET)))return reply("Invalid signature",403);
 let event;try{event=JSON.parse(new TextDecoder().decode(payload))}catch{return reply("Invalid JSON",400)}
 if(event?.object!=="whatsapp_business_account"||!Array.isArray(event.entry))return ok();
 const messages=[];
 for(const entry of event.entry.slice(0,3)){
  for(const item of (entry.changes||[]).slice(0,5)){
   if(item.field!=="messages"||item.value?.metadata?.phone_number_id!==String(env.WA_PHONE_NUMBER_ID))continue;
   for(const msg of (item.value.messages||[]).slice(0,8)){
    if(msg?.type!=="text"||!msg.text?.body||!allowlist(env).has(num(msg.from)))continue;
    if(await onlyOnce(String(msg.id||""),request))messages.push(msg);
   }
  }
 }
 if(!messages.length)return ok();
 const task=async()=>{for(const msg of messages.slice(0,2)){try{await handleOne(msg,request,env)}catch{/* avoid logging PII or credentials */}}};
 if(context?.waitUntil)context.waitUntil(task());else await task();
 return ok();
}
