import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(new URL('../website/katarina-live.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1].replace('resize();toggleAuto();','resize();');
const elements=new Map(),arcs=[];
const ctx=new Proxy({}, {get:(o,k)=>k in o?o[k]:(...args)=>{if(k==='arc')arcs.push(args)},set:(o,k,v)=>(o[k]=v,true)});
function el(){return {children:[],style:{},dataset:{},value:'',textContent:'',getContext:()=>ctx,getBoundingClientRect:()=>({width:800,height:500,left:0,top:0}),append(...a){this.children.push(...a)},replaceChildren(...a){this.children=a},setAttribute(){},addEventListener(name,fn){this.handlers??={};this.handlers[name]=fn}}}
const env={console,Date,Math,JSON,Map,Set,Array,Number,String,Boolean,Object,Error,performance:{now:()=>10000},document:{hidden:false,getElementById:id=>{if(!elements.has(id))elements.set(id,el());return elements.get(id)},createElement:el,createElementNS:el,addEventListener(){}},window:{matchMedia:()=>({matches:false}),addEventListener(){},devicePixelRatio:1},requestAnimationFrame:()=>1,setInterval:()=>1,clearInterval(){},setTimeout:()=>1,clearTimeout(){},AbortController,fetch:()=>Promise.reject(Error('disabled'))};
assert(html.includes('class="live-status"'));assert(!/<div class="scene" id="scene"><div id="pulse-proof"/.test(html));
vm.createContext(env);vm.runInContext(script,env);
vm.runInContext(`
if(phaseColor('EXPERIMENT')===phaseColor('SENSORS')||phaseColor('MEMORY_WRITE')===phaseColor('GEMINI')||phaseColor('VALIDATE')===phaseColor('DEGRADED'))throw Error('Functional neuron colors collapsed');
const boxes=[];for(let i=0;i<12;i++)labelPlacement(100,100,'label '+i,boxes);for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];if(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)throw Error('Labels overlap');}
boardNow={result:'BLOCKED',snapshot_process_matches:true,delivery:'DISABLED',current_process_pid:42,activity:{fresh:true,current:{phase:'EXPERIMENT',state:'STARTED',at_utc:new Date().toISOString()}}};graphFresh=true;
if(!currentWork())throw Error('Partial sensor incorrectly suppressed actual work');
buildGraph({...boardNow,research_source_verified:false,activity:{...boardNow.activity,events:[{phase:'EXPERIMENT',state:'STARTED',seq:1,at_utc:new Date().toISOString()}]}},Date.now());
acceptPulseEvents([{phase:'EXPERIMENT',state:'DONE',seq:2,at_utc:new Date().toISOString()}],10000,false);draw(10400);
if(!graph.nodes.some(n=>n.id==='core')||!graph.nodes.some(n=>n.id==='p:EXPERIMENT'))throw Error('Missing pulse endpoints');
if(eventPulses.length!==1)throw Error('Missing real event replay');
acceptPulseEvents([{phase:'HEARTBEAT',state:'IDLE',seq:3,at_utc:new Date().toISOString()}],11000,false);
if(corePulseMode!=='HEARTBEAT'||eventPulses.length!==1)throw Error('Heartbeat masquerades as analysis');
const phaseNode=graph.nodes.find(n=>n.id==='p:EXPERIMENT'),idleNode={id:'knowledge:inactive'};
const m1=nodeMotion(phaseNode,11400),m2=nodeMotion(phaseNode,11700);if(m1.x===m2.x&&m1.y===m2.y)throw Error('Active node coordinates remain stationary');
if(nodeMotion(idleNode,11700).x!==0)throw Error('Inactive knowledge node invents work');
boardNow.snapshot_process_matches=false;if(nodeMotion(phaseNode,11700).x!==0)throw Error('Mismatched process moves node');if(currentWork())throw Error('Wrong process may animate');
invalidate('stale');if(eventPulses.length||corePulseAt!==-10000)throw Error('Stale animation not cleared');
boardNow={snapshot_process_matches:true,delivery:'DISABLED',activity:{fresh:true,current:{phase:'HEARTBEAT',state:'IDLE',at_utc:new Date().toISOString()}}};graphFresh=true;orbitOn=true;pulseOn=true;lastFrame=20000;const beforeYaw=yaw;draw(20050);if(yaw===beforeYaw)throw Error('Fresh process does not move network');
corePulseAt=11000;corePulseMode='HEARTBEAT';const hb1=nodeMotion({id:'core'},11200),hb2=nodeMotion({id:'core'},11500);if(hb1.x===hb2.x&&hb1.y===hb2.y)throw Error('Katarina core does not follow live flow');
boardNow.activity.current.at_utc=new Date(Date.now()-30000).toISOString();if(nodeMotion({id:'core'},11500).x!==0)throw Error('Stale heartbeat moves node');lastFrame=20100;const staleYaw=yaw;draw(20150);if(yaw!==staleYaw)throw Error('Stale process still moves network');
`,env);
vm.runInContext(`
const stamp=new Date().toISOString();boardNow={snapshot_process_matches:true,delivery:'DISABLED',current_process_pid:44,activity:{fresh:true,current:{phase:'HEARTBEAT',state:'IDLE',at_utc:stamp},events:[],active:[{phase:'GEMINI',state:'STARTED',at_utc:stamp,seq:101},{phase:'TEST_BREAKOUT',state:'STARTED',at_utc:stamp,seq:102}]}};graphFresh=true;
if(currentWorks().length!==2)throw Error('Concurrent work collapsed to a single event');
buildGraph(boardNow,Date.now());
for(const phase of ['GEMINI','TEST_BREAKOUT']){const n=graph.nodes.find(n=>n.id==='p:'+phase);if(!n)throw Error('Missing worker node');const a=nodeMotion(n,22000),b=nodeMotion(n,22300);if(a.x===b.x&&a.y===b.y)throw Error('Simultaneous worker node stays still');}
boardNow.activity.active.pop();if(currentWorks().length!==1)throw Error('Completed worker still considered active');
`,env);
vm.runInContext(`
width=320;height=520;yaw=0;pitch=0;zoom=1;
boardNow={snapshot_process_matches:true,delivery:'DISABLED',current_process_pid:45,research_lab:{worker_phases:workerPhases},activity:{fresh:true,current:{phase:'HEARTBEAT',state:'IDLE',at_utc:new Date().toISOString()},events:[],active:[]}};
graphFresh=true;buildGraph(boardNow,Date.now());
const orbitNodes=graph.nodes.filter(n=>workerPhases.includes(n.phase));if(orbitNodes.length!==12)throw Error('Expected twelve worker nodes');
const points=orbitNodes.map(project);
for(const p of points)if(p.x<16||p.x>width-16||p.y<16||p.y>height-16)throw Error('Orbit clipped on mobile');
if(Math.max(...orbitNodes.map(n=>n.z))-Math.min(...orbitNodes.map(n=>n.z))<1.4)throw Error('Network is a flat disc');
for(const angle of [0,Math.PI/4,Math.PI/2,Math.PI*3/4,Math.PI])for(const tilt of [0,.8,1.2]){
 yaw=angle;pitch=tilt;const view=orbitNodes.map(project),xs=view.map(p=>p.x),ys=view.map(p=>p.y);
 const sx=Math.max(...xs)-Math.min(...xs),sy=Math.max(...ys)-Math.min(...ys);
 if(sx<150||sy<150||sx/sy<.7||sx/sy>1.4)throw Error('Rotating sphere collapses into a disc');
 for(const p of view)if(p.x<16||p.x>width-16||p.y<16||p.y>height-16)throw Error('Rotated sphere clipped on mobile');
}

`,env);
vm.runInContext(`
knowledgeLoaded=false;knownResearchIds.clear();nodeBirths.clear();
const experimentA={id:'experiment:'+ 'a'.repeat(24),kind:'experiment',label:'EXPERIMENT / aaaaaaaa',producer_phase:'TEST_MOMENTUM_H4'};
const experimentB={id:'experiment:'+ 'b'.repeat(24),kind:'experiment',label:'EXPERIMENT / bbbbbbbb',known_utc:new Date().toISOString(),producer_phase:'TEST_MOMENTUM_H4'};
boardNow.research_source_verified=true;boardNow.research_graph={nodes:[experimentA],edges:[]};
buildGraph(boardNow,Date.now());if(nodeBirths.size)throw Error('Initial snapshot fabricated growth');
boardNow.research_graph.nodes.push(experimentB);buildGraph(boardNow,Date.now());
if(nodeBirths.size!==1||!nodeBirths.has('k:'+experimentB.id))throw Error('New persisted result has no birth signal');
if(!graph.edges.some(e=>e.a==='p:TEST_MOMENTUM_H4'&&e.b==='k:'+experimentB.id&&e.relation==='PRODUCED_BY_WORKER'))throw Error('Result not linked to real producer');
buildGraph(boardNow,Date.now());if(nodeBirths.size!==1)throw Error('Repeated snapshot created growth');
`,env);
vm.runInContext(`
renderResearchReports({status:'RESEARCH_REPORTS',as_of_utc:new Date().toISOString(),counts:{CANDIDATE_FORWARD:1},reviewed_experiments:1,unreported_experiments:0,recent:[],candidates:[{id:'c'.repeat(64),trial_id:'d'.repeat(64),instrument_id:'e'.repeat(24),method:'MOMENTUM',side:'BUY',decision:'CANDIDATE_FORWARD',experiment_utc:new Date().toISOString(),reported_utc:new Date().toISOString(),checks_passed:3,checks:{historical:'PASSED',cost2:'PASSED',cost3:'PASSED'}}]});
if(!document.getElementById('research-report-alert').textContent.includes('perlu forward test'))throw Error('Candidate alert implies production readiness');
renderResearchReports(null);if(!document.getElementById('research-report-alert').textContent.includes('tidak segar'))throw Error('Stale reports remain visible');
`,env);
assert(!html.includes('id="node-select"'));assert(!html.includes('class="controls"'));assert(!html.includes('id="pid"'));assert(!html.includes('ID PROSES VPS'));assert(html.includes('id="runtime-state"'));
vm.runInContext(`
cameraInput=null;cameraVelocity={yaw:0,pitch:0};panX=0;panY=0;lastFrame=30000;draw(30008.5);if(lastFrame!==30008.5)throw Error('Renderer still drops 120Hz frames');
const originalYaw=yaw;
canvas.handlers.pointerdown({pointerId:1,clientX:100,clientY:100,timeStamp:1000});
canvas.handlers.pointermove({pointerId:1,clientX:150,clientY:120,timeStamp:1016});
if(!cameraInput||cameraInput.yaw===originalYaw)throw Error('Touch rotation has no target');
draw(30017);if(yaw===originalYaw)throw Error('Touch camera is stationary');
canvas.handlers.pointerup({pointerId:1,clientX:150,clientY:120,timeStamp:1020});const beforeInertia=yaw;draw(30026);if(yaw===beforeInertia)throw Error('Inertia stops abruptly');
canvas.handlers.pointerdown({pointerId:2,clientX:100,clientY:100,timeStamp:1100});
canvas.handlers.pointerdown({pointerId:3,clientX:200,clientY:100,timeStamp:1101});
canvas.handlers.pointermove({pointerId:3,clientX:220,clientY:100,timeStamp:1116});const beforePinch=cameraInput.zoom;
canvas.handlers.pointermove({pointerId:3,clientX:260,clientY:130,timeStamp:1132});if(cameraInput.zoom<=beforePinch)throw Error('Pinch does not zoom');
if(!Number.isFinite(cameraInput.panX)||!Number.isFinite(cameraInput.panY))throw Error('Two-finger pan invalid');
canvas.handlers.pointercancel({pointerId:2});canvas.handlers.pointercancel({pointerId:3});if(pointers.size)throw Error('Cancelled touch left gesture stuck');
cameraInput=null;cameraVelocity={yaw:0,pitch:0};
canvas.handlers.pointerdown({pointerId:4,clientX:10,clientY:10,timeStamp:2000});canvas.handlers.pointerup({pointerId:4,clientX:10,clientY:10,timeStamp:2010});
canvas.handlers.pointerdown({pointerId:4,clientX:10,clientY:10,timeStamp:2200});canvas.handlers.pointerup({pointerId:4,clientX:10,clientY:10,timeStamp:2210});if(!cameraInput||cameraInput.zoom!==1||cameraInput.panX!==0)throw Error('Double tap does not reset view');
`,env);
assert(!html.includes('Owner requested a visual monitor'));assert(!html.includes('.overview,.rail'));assert(html.includes('pulseOn=true'));assert(arcs.length>0);console.log('Canvas pulses draw; partial sensor work visible; heartbeat distinct; process mismatch and stale state stop work.');
