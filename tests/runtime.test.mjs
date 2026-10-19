import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestGet} from '../functions/api/runtime.js';
const originalFetch=globalThis.fetch;
const packet=()=>{const now=new Date().toISOString();return {captured_at_utc:now,private:'PRIVATE_TOKEN',agent_board:{result:'SNAPSHOT_PASS',snapshot_process_matches:true,current_process_pid:42,delivery:'DISABLED',live_execution_authorized:false,activity:{pid:42,cycle:1,fresh:true,current:{seq:1,phase:'REPORT',state:'DONE',at_utc:now},events:[{seq:1,phase:'REPORT',state:'DONE',at_utc:now,account:'PRIVATE_ACCOUNT'}]},research_source_verified:false,research_reports:{status:'RESEARCH_REPORTS',pid:42,as_of_utc:now,counts:{},recent:[],candidates:[],production_approved:true}}}};
test('Cloudflare endpoint forwards only safe current VPS telemetry without secrets or caching',async()=>{
 let request;
 globalThis.fetch=async(url,options)=>{request={url,options};return Response.json(packet())};
 try{const r=await onRequestGet();const text=await r.text();assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert(!text.includes('PRIVATE_TOKEN'));assert(!text.includes('PRIVATE_ACCOUNT'));const out=JSON.parse(text);assert.equal(out.agent_board.current_process_pid,42);assert.equal(out.agent_board.activity.current.phase,'REPORT');assert.equal(out.agent_board.research_reports.production_approved,false);assert(!request.options.headers.Authorization);assert.equal(request.options.redirect,'manual');assert(request.url.endsWith('/public-status'))}finally{globalThis.fetch=originalFetch}
});
test('stale, mismatched, execution-enabled and unavailable data fail closed',async()=>{
 for(const mutate of [p=>p.captured_at_utc=new Date(Date.now()-21000).toISOString(),p=>p.agent_board.snapshot_process_matches=false,p=>p.agent_board.live_execution_authorized=true,p=>p.agent_board.activity.fresh=false]){
  const p=packet();mutate(p);globalThis.fetch=async()=>Response.json(p);assert.equal((await onRequestGet()).status,503);
 }
 globalThis.fetch=async()=>{throw Error('PRIVATE_BODY')};const r=await onRequestGet();assert.equal(r.status,503);assert(!(await r.text()).includes('PRIVATE'));globalThis.fetch=originalFetch;
});
test('oversized upstream is rejected',async()=>{globalThis.fetch=async()=>new Response('x'.repeat(131073));try{assert.equal((await onRequestGet()).status,503)}finally{globalThis.fetch=originalFetch}});

test('redirect responses are rejected without following another origin',async()=>{globalThis.fetch=async()=>new Response(null,{status:302,headers:{Location:'https://untrusted.invalid/'}});try{const r=await onRequestGet();assert.equal(r.status,503);assert.equal((await r.json()).reason,'UPSTREAM_HTTP_302')}finally{globalThis.fetch=originalFetch}});
