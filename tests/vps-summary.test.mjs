import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('homepage retains market design and uses a compact VPS summary instead of the monitor iframe',()=>{
 const h=fs.readFileSync(new URL('../website/index.html',import.meta.url),'utf8');
 for(const id of ['hero-gold','dashboard-pairs','dashboard-news','focus-title','vps-activity'])assert(h.includes('id="'+id+'"'));
 assert(!h.includes('<iframe'));assert(h.indexOf('id="katarina-live-runtime"')<h.indexOf('class="dashboard-grid"'));
});
test('home VPS summary shows only fresh actual activity and clears it on stale or failed data',async()=>{
 const elements=new Map();const get=id=>{if(!elements.has(id))elements.set(id,{textContent:'',dataset:{}});return elements.get(id)};
 const now=Date.now();const packet={captured_at_utc:new Date(now).toISOString(),agent_board:{snapshot_process_matches:true,activity:{fresh:true,current:{phase:'HEARTBEAT'},active:[{phase:'GEMINI',state:'STARTED',at_utc:new Date(now).toISOString()}]},research_lab:{experiments:123},research_reports:{status:'RESEARCH_REPORTS',as_of_utc:new Date(now).toISOString(),reviewed_experiments:30,counts:{CANDIDATE_FORWARD:0}}}};
 const intervals=[];let fail=false;
 const env={document:{hidden:false,getElementById:get,addEventListener(){}},Date,Number,Intl,AbortController,setTimeout:()=>1,clearTimeout(){},setInterval:fn=>(intervals.push(fn),intervals.length),clearInterval(){},fetch:async()=>({ok:!fail,json:async()=>packet})};
 vm.runInNewContext(fs.readFileSync(new URL('../website/vps-summary.js',import.meta.url),'utf8'),env);
 await new Promise(r=>setImmediate(r));assert.equal(get('vps-status').textContent,'Terhubung');assert.equal(get('vps-workers').textContent,'1 tugas sedang berjalan');assert(get('vps-activity').textContent.includes('Gemini'));assert(get('vps-results').textContent.includes('30'));
 packet.captured_at_utc=new Date(now-25000).toISOString();intervals[0]();assert.equal(get('vps-status').textContent,'Belum terhubung');assert.equal(get('vps-workers').textContent,'—');
 fail=true;await intervals[1]();assert.equal(get('vps-status').dataset.live,'false');
});
