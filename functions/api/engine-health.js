/* Safe, read-only autonomous engine health; returns no account identifiers or secrets. */
const out=(payload,code=200)=>new Response(JSON.stringify(payload),{
 status:code,headers:{"Content-Type":"application/json;charset=utf-8","Cache-Control":"public,max-age=0,s-maxage=180","X-Content-Type-Options":"nosniff"}
});
export async function onRequestGet({env}){
 if(!env?.KATARINA_DB)return out({status:"database-not-bound",collector:"unknown",cloudStorage:false},503);
 try{
  const [headlines,plans,translations]=await Promise.all([
   env.KATARINA_DB.prepare("SELECT COUNT(*) AS count, MAX(collected_at) AS lastCollected FROM headlines").first(),
   env.KATARINA_DB.prepare("SELECT COUNT(*) AS count, MAX(recorded_at) AS lastRecorded FROM h4_analyses").first(),
   env.KATARINA_DB.prepare("SELECT COUNT(*) AS count FROM headline_translations").first()
  ]);
  return out({schema:1,status:"ready",cloudStorage:true,headlines:Number(headlines?.count||0),lastCollectionAt:headlines?.lastCollected||null,h4Snapshots:Number(plans?.count||0),lastAnalysisAt:plans?.lastRecorded||null,storedTranslations:Number(translations?.count||0)});
 }catch{return out({status:"database-unavailable",cloudStorage:false},503)}
}
