/* No two-way WhatsApp conversations during the group-only pilot.
 * GET is retained strictly for Meta webhook verification if a future official group integration requires it.
 * Incoming POST events are acknowledged but no text or sender ID is processed or stored.
 */
const respond=(text,code=200)=>new Response(text,{status:code,headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"}});
export async function onRequestGet({request,env}){
 const u=new URL(request.url);
 if(u.searchParams.get("hub.mode")!=="subscribe"||!u.searchParams.has("hub.challenge"))return respond("Not found",404);
 if(!env?.WA_VERIFY_TOKEN||u.searchParams.get("hub.verify_token")!==env.WA_VERIFY_TOKEN)return respond("Not authorized",403);
 const challenge=u.searchParams.get("hub.challenge");
 return /^[\w.-]{1,256}$/.test(challenge)?respond(challenge):respond("Invalid challenge",400);
}
export async function onRequestPost(){return respond("EVENT_RECEIVED")}
