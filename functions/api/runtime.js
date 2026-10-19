// Public, read-only VPS telemetry. No account or service credentials belong here.
const phases=new Set(["REPORT","TEST_MOMENTUM_H4","TEST_MOMENTUM_H12","TEST_MOMENTUM_H24","TEST_REVERSION_H4","TEST_REVERSION_H12","TEST_REVERSION_H24","TEST_BREAKOUT_H4","TEST_BREAKOUT_H12","TEST_BREAKOUT_H24","VALIDATE3","TEST_MOMENTUM","TEST_REVERSION","TEST_BREAKOUT","VALIDATE","GEMINI","STARTING","CONNECT","NEWS","SENSORS","TECHNICAL","MEMORY","RISK_AUDIT","WAIT_ACK","PUBLISH","WAITING","DEGRADED","STOPPED","BLOCKED","SETTLE","CHECKPOINT","LEARNING_REVIEW","RESEARCH","MEMORY_WRITE","RECALL","ASSOCIATION","HISTORY","EXPERIMENT","HEARTBEAT"]);
const states=new Set(["STARTED","DONE","FAILED","IDLE"]);
const integer=v=>Number.isSafeInteger(v)&&v>=0&&v<=1000000?v:null;
const code=v=>typeof v==="string"&&/^[A-Za-z0-9_.:#/-]{1,96}$/.test(v)?v:null;
const iso=v=>typeof v==="string"&&/^[0-9T:.+Z-]{1,40}$/.test(v)&&Number.isFinite(Date.parse(v))?v:null;
function activity(value,now){
 const events=[];
 for(const e of (Array.isArray(value?.events)?value.events:[]).slice(-80)){
  const at=iso(e?.at_utc),age=at?(now-Date.parse(at))/1000:Infinity;
  if(!at||age< -30||age>600||!phases.has(e.phase)||!states.has(e.state)||!integer(e.seq))continue;
  const item={seq:e.seq,at_utc:at,phase:e.phase,state:e.state};
  events.push(item);
 }
 const active=[];
 for(const e of (Array.isArray(value?.active)?value.active:[]).slice(0,24)){
  const at=iso(e?.at_utc),age=at?(now-Date.parse(at))/1000:Infinity;
  if(at&&age>=-30&&age<=180&&phases.has(e.phase)&&e.state==="STARTED"&&integer(e.seq))active.push({seq:e.seq,at_utc:at,phase:e.phase,state:e.state});
 }
 const current=events.at(-1)||null;
 return {schema_version:1,pid:integer(value?.pid),cycle:integer(value?.cycle),events,active,current,
  fresh:Boolean(current&&(now-Date.parse(current.at_utc))/1000<=180),source:"CANONICAL_OBSERVER_EVENTS"};
}
function cleanLearning(value,passed){
 if(!passed||!value||!["NO_NEW_MATURED_EVIDENCE","RESEARCH_REPORTED"].includes(value.status))return {status:"NOT_ATTESTED"};
 const out={status:value.status,source:"CANONICAL_RESEARCH_SNAPSHOT",neural_activation_measured:false,model_training_verified:false,improvement_verified:false,live_authorized:false};
 for(const k of ["observation_utc","cognitive_as_of_utc"])out[k]=iso(value[k]);
 for(const k of ["ledger_status","evolution_decision"])out[k]=code(value[k]);
 for(const k of ["matured_observations","memory_records_inserted","memory_records_considered","shadow_rows_read","external_models_invoked","virtual_open"])out[k]=integer(value[k]);
 return out;
}
function cleanResearch(value){
 const nodes=[],edges=[],ids=new Set();
 const kinds=new Set(["source","topic","document","paragraph","pattern","evidence","instrument","dataset","experiment"]);
 const labels={instrument:/^INSTRUMENT \/ [a-f0-9]{8}$/,dataset:/^DATASET \/ [a-f0-9]{8}$/,experiment:/^EXPERIMENT \/ [a-f0-9]{8}$/,source:/^(FED|ECB|BOE|BOC|RBA|CNBC)$/,topic:/^(RATES_INFLATION|EMPLOYMENT_GROWTH|ENERGY_SUPPLY|PRECIOUS_METALS|GEOPOLITICS_TRADE|TECH_RISK|FX|OTHER)$/,document:/^DOC \/ [a-f0-9]{8}$/,paragraph:/^TEXT \/ [a-f0-9]{8}$/,pattern:/^EVIDENCE PATTERN$/,evidence:/^STORED EVIDENCE$/};
 for(const n of (Array.isArray(value?.nodes)?value.nodes:[]).slice(0,384)){
  if(!kinds.has(n?.kind)||typeof n.id!=="string"||!new RegExp("^"+n.kind+":[a-f0-9]{24}$").test(n.id)||ids.has(n.id)||!labels[n.kind].test(n.label))continue;
  const item={id:n.id,kind:n.kind,label:n.label};if(iso(n.known_utc))item.known_utc=n.known_utc;
  if(n.kind==="experiment"&&/^TEST_(MOMENTUM|REVERSION|BREAKOUT)_H(4|12|24)$/.test(n.producer_phase))item.producer_phase=n.producer_phase;
  nodes.push(item);ids.add(n.id);
 }
 const relations=new Set(["RETRIEVED_FROM","LEXICAL_TOPIC","PART_OF_DOCUMENT","SUPPORTED_BY_RECORD","HAS_DATASET","TESTED_ON"]),seen=new Set();
 for(const e of (Array.isArray(value?.edges)?value.edges:[]).slice(0,512)){
  const key=[e?.a,e?.b,e?.relation].join("|");
  if(ids.has(e?.a)&&ids.has(e?.b)&&relations.has(e.relation)&&!seen.has(key)){edges.push({a:e.a,b:e.b,relation:e.relation});seen.add(key)}
 }
 return {schema_version:1,source:"PERSISTED_RESEARCH_PROVENANCE",nodes,edges,truncated:value?.truncated===true,total_documents:integer(value?.total_documents),semantics:"PROVENANCE_AND_LEXICAL_TOPICS_NOT_NEURAL_WEIGHTS",neural_activation_measured:false};
}
function cleanLab(v,passed){
 if(!passed||!v||!["RUNNING","EMPTY_UNIVERSE","PAUSED_LOW_DISK","PAUSED_STORAGE_BUDGET"].includes(v.status))return {status:"NOT_ATTESTED"};
 const out={status:v.status,live_authorized:false,improvement_verified:false,independent_holdout:false,broker_fill_verified:false};
 for(const k of ["universe_count","scanned_count","history_symbols","history_bars","experiments","strategy_candidates"])out[k]=Number.isSafeInteger(v[k])&&v[k]>=0&&v[k]<=100000000?v[k]:null;
 out.worker_phases=(Array.isArray(v.worker_phases)?v.worker_phases:[]).filter(p=>["TEST_MOMENTUM_H4","TEST_MOMENTUM_H12","TEST_MOMENTUM_H24","TEST_REVERSION_H4","TEST_REVERSION_H12","TEST_REVERSION_H24","TEST_BREAKOUT_H4","TEST_BREAKOUT_H12","TEST_BREAKOUT_H24","VALIDATE","VALIDATE3","GEMINI","TEST_MOMENTUM","TEST_REVERSION","TEST_BREAKOUT"].includes(p)).slice(0,12);
 out.results=[];
 for(const r of (Array.isArray(v.results)?v.results:[]).slice(0,6)){
  if(!["MOMENTUM","MEAN_REVERSION","BREAKOUT"].includes(r?.method)||!["BUY","SELL"].includes(r?.side))continue;
  const item={method:r.method,side:r.side};for(const k of ["development_n","review_n","development_mean_r","review_mean_r"])item[k]=typeof r[k]==="number"&&Number.isFinite(r[k])&&Math.abs(r[k])<1000000?r[k]:null;out.results.push(item);
 }
 return out;
}
function cleanReports(v,passed,now,pid){
 if(!passed||v?.status!=="RESEARCH_REPORTS"||v.pid!==pid||!iso(v.as_of_utc)||now-Date.parse(v.as_of_utc)<-30000||now-Date.parse(v.as_of_utc)>60000)return {status:"NOT_ATTESTED"};
 const decisions=new Set(["CANDIDATE_FORWARD","AWAITING_COST_REVIEWS","REJECTED","INSUFFICIENT_EVIDENCE","REVIEW_BLOCKED"]),states=new Set(["PASSED","PENDING","REJECTED","INSUFFICIENT","BLOCKED"]);
 const rows=items=>(Array.isArray(items)?items:[]).slice(0,8).flatMap(r=>{
  if(!/^[a-f0-9]{64}$/.test(r?.id)||!/^[a-f0-9]{64}$/.test(r?.trial_id)||!/^[a-f0-9]{24}$/.test(r?.instrument_id)||!["MOMENTUM","MEAN_REVERSION","BREAKOUT"].includes(r.method)||!["BUY","SELL"].includes(r.side)||!decisions.has(r.decision)||!iso(r.experiment_utc)||!iso(r.reported_utc))return [];
  const checks={};for(const k of ["historical","cost2","cost3"]){if(!states.has(r.checks?.[k]))return [];checks[k]=r.checks[k]}
  const passedCount=Object.values(checks).filter(x=>x==="PASSED").length;
  if(r.decision==="CANDIDATE_FORWARD"&&passedCount!==3)return [];
  const out={id:r.id,trial_id:r.trial_id,instrument_id:r.instrument_id,method:r.method,side:r.side,decision:r.decision,experiment_utc:iso(r.experiment_utc),reported_utc:iso(r.reported_utc),checks,checks_passed:passedCount,checks_required:3,consensus:"RULE_BASED_CHECKS_NOT_INDEPENDENT_VOTES",engine:"PYTHON_H1_RESEARCH",production_approved:false,live_authorized:false,independent_holdout:false,prospective_validation:false,mt5_tester_verified:false};
  for(const [k,values] of [["lookback",[12,24,48]],["horizon",[4,12,24]],["threshold",[.5,1,1.5]]])if(values.includes(r[k]))out[k]=r[k];
  for(const part of ["development","review"]){out[part]={};for(const k of ["n","mean_range_units"]){const x=r[part]?.[k];if(typeof x==="number"&&Number.isFinite(x)&&Math.abs(x)<100000000)out[part][k]=x}}
  return [out];
 });
 const counts={};for(const k of decisions)counts[k]=integer(v.counts?.[k]);
 return {status:"RESEARCH_REPORTS",source:"PERSISTED_RULE_BASED_RESEARCH_REPORTS",pid,as_of_utc:iso(v.as_of_utc),counts,reviewed_experiments:integer(v.reviewed_experiments),unreported_experiments:integer(v.unreported_experiments),recent:rows(v.recent),candidates:rows(v.candidates).filter(r=>["CANDIDATE_FORWARD","AWAITING_COST_REVIEWS"].includes(r.decision)).slice(0,3),production_approved:false,live_authorized:false};
}
function cleanEntries(value,passed,now){
 const positions=[];
 if(!passed||value?.status!=="OBSERVED")return {status:"NOT_ATTESTED",positions};
 for(const p of (Array.isArray(value.positions)?value.positions:[]).slice(0,20)){
  const stamp=iso(p?.opened_utc);
  if(!code(p?.symbol)||!["BUY","SELL"].includes(p?.side)||typeof p?.entry_price!=="number"||!Number.isFinite(p.entry_price)||p.entry_price<=0||p.entry_price>=1e12||!stamp||Date.parse(stamp)>now)continue;
  positions.push({symbol:p.symbol,side:p.side,entry_price:p.entry_price,opened_utc:stamp});
 }
 return {status:"OBSERVED",positions,truncated:value.truncated===true,origin:"BROKER_BOOK_NOT_ATTRIBUTED_TO_KATARINA"};
}
function publicSnapshot(report,now){
 const b=report?.agent_board;if(!b||typeof b!=="object")throw Error("invalid");
 const passed=b.result==="SNAPSHOT_PASS",off=b.delivery==="DISABLED",matched=b.snapshot_process_matches===true;
 const lanes=[
 ["SCAN",passed?"OBSERVED":"BLOCKED","Akuisisi informasi"],
 ["ANALYST",passed?"RESEARCH_OBSERVED":"NOT_ATTESTED","Analisis di engine privat"],
 ["STRATEGY","RESEARCH_ONLY","Hipotesis dan riset"],
 ["BALANCE","PRIVATE","Data akun tidak dipublikasikan"],
 ["EXEC",off?"LIVE_OFF":"NOT_ATTESTED","Pengiriman order nonaktif"],
 ["AUDIT",passed?"SNAPSHOT_PASS":"BLOCKED","Validasi snapshot"]
 ].map(([id,status,description])=>({id,status,description,reason:description}));
 const telemetry={};for(const key of ["successful_calls","failed_calls"]){const n=integer(b.model?.telemetry?.[key]);if(n!==null)telemetry[key]=n}
 return {agent_board:{schema_version:1,architecture:"SINGLE_UNIFIED_KATARINA_BRAIN",source:"VPS_SIGNED_TELEMETRY",agent_workers_started:0,visualization_only:true,
 result:passed?"SNAPSHOT_PASS":"BLOCKED",blockers:passed?[]:["SNAPSHOT_NOT_VERIFIED"],market_symbols:null,cycles:integer(b.cycles),successful_cycles:integer(b.successful_cycles),
 observed_at_utc:iso(b.observed_at_utc),delivery:off?"DISABLED":"UNVERIFIED",current_process_pid:integer(b.current_process_pid),snapshot_process_matches:matched,
 live_execution_authorized:false,broker_execution_verified:false,profit_verified:false,model:{configured:b.model?.configured===true,quality_verified:false,telemetry},
 operational:{},activity:activity(b.activity,now),learning:cleanLearning(b.learning,passed&&matched),
 research_reports:cleanReports(b.research_reports,matched&&off,now,integer(b.current_process_pid)),
 research_source_verified:b.research_source_verified===true&&matched&&off,research_lab:cleanLab(b.research_lab,matched&&off),research_graph:cleanResearch(b.research_source_verified===true&&matched&&off?b.research_graph:null),entries:cleanEntries(b.entries,passed&&matched,now),lanes,public_scope:"RESEARCH_GRAPH_AND_ENTRY_ONLY"},
 captured_at_utc:iso(report.captured_at_utc),transport:"VPS_SIGNED_TELEMETRY",view_mode:"PUBLIC_READONLY",dialog_available:false,delivery:off?"DISABLED":"UNVERIFIED"};
}

export async function onRequestGet(){
 const headers={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
 const fail=(reason="UPSTREAM_UNAVAILABLE")=>new Response(JSON.stringify({status:"VPS_TELEMETRY_STALE_OR_MISSING",reason}),{status:503,headers});
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
 try{
  const response=await fetch("https://katarina-ai-runtime.safetune5.chatgpt.site/public-status",{redirect:"error",cache:"no-store",headers:{Accept:"application/json","User-Agent":"Katarina-Runtime-Monitor/1.0"},signal:controller.signal,cf:{cacheTtl:0,cacheEverything:false}});
  if(!response.ok)return fail("UPSTREAM_HTTP_"+response.status);
  const reader=response.body.getReader(),decoder=new TextDecoder();let text="",size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>131072){await reader.cancel();return fail("UPSTREAM_TOO_LARGE")}text+=decoder.decode(value,{stream:true})}text+=decoder.decode();
  const packet=JSON.parse(text),now=Date.now(),age=now-Date.parse(packet.captured_at_utc),b=packet.agent_board;
  if(!Number.isFinite(age)||age< -30000||age>20000||b?.delivery!=="DISABLED"||b?.live_execution_authorized!==false||b?.snapshot_process_matches!==true||b?.activity?.fresh!==true)return fail("UPSTREAM_NOT_CURRENT_OR_ATTESTED");
  return new Response(JSON.stringify(publicSnapshot(packet,now)),{status:200,headers});
 }catch(e){return fail(e?.name==="AbortError"?"UPSTREAM_TIMEOUT":"UPSTREAM_REQUEST_FAILED")}finally{clearTimeout(timer)}
}
