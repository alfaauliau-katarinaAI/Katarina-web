(()=>{
 'use strict';
 const root=document.getElementById('katarina-live-runtime');if(!root)return;
 const put=(id,text)=>{const el=document.getElementById(id);if(el&&el.textContent!==text)el.textContent=text};
 const status=document.getElementById('vps-status');
 const names={GEMINI:'Mengkaji hipotesis dengan Gemini',REPORT:'Menyusun laporan penelitian',HISTORY:'Membaca riwayat pasar',SENSORS:'Mengamati data pasar',EXPERIMENT:'Menguji strategi',VALIDATE:'Menguji ketahanan biaya',VALIDATE3:'Menguji ketahanan biaya',MEMORY_WRITE:'Menyimpan hasil pembelajaran',NEWS:'Meneliti berita',RESEARCH:'Meneliti pasar',HEARTBEAT:'Proses terhubung',WAITING:'Menunggu siklus berikutnya',WAIT_ACK:'Menunggu konfirmasi proses',BLOCKED:'Pemeriksaan data tertahan',DEGRADED:'Memeriksa kendala proses'};
 function phase(p){if(/^TEST_/.test(p||''))return 'Menguji strategi secara paralel';return names[p]||'Memproses penelitian'}
 const count=n=>Number.isSafeInteger(n)&&n>=0?new Intl.NumberFormat('id-ID').format(n):'—';
 let packet=null,timer=null,busy=false;
 function offline(){status.textContent='Belum terhubung';status.dataset.live='false';put('vps-activity','Data VPS belum tersedia');put('vps-time','Menunggu pembaruan terverifikasi');put('vps-workers','—');put('vps-experiments','—');put('vps-results','—');put('vps-result-note','Hasil terakhir tidak ditampilkan sebagai data live')}
 function render(){
  const b=packet?.agent_board,at=Date.parse(packet?.captured_at_utc),age=Date.now()-at;
  if(!b||!Number.isFinite(at)||age< -30000||age>20000||b.snapshot_process_matches!==true||b.activity?.fresh!==true){offline();return}
  status.textContent='Terhubung';status.dataset.live='true';
  const active=(b.activity.active||[]).filter(e=>e.state==='STARTED'&&Date.now()-Date.parse(e.at_utc)<=180000);
  put('vps-activity',active.length?phase(active[0].phase):phase(b.activity.current?.phase));
  put('vps-time','Diperbarui '+new Date(at).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'Asia/Jakarta'})+' WIB');
  put('vps-workers',active.length+' tugas sedang berjalan');
  put('vps-experiments',count(b.research_lab?.experiments)+' eksperimen tercatat');
  const reports=b.research_reports;
  const reportAge=Date.now()-Date.parse(reports?.as_of_utc);
  if(reports?.status==='RESEARCH_REPORTS'&&Number.isFinite(reportAge)&&reportAge>=-30000&&reportAge<=60000){
   const candidates=reports.counts?.CANDIDATE_FORWARD||0;
   put('vps-results',candidates?count(candidates)+' kandidat untuk uji lanjutan':count(reports.reviewed_experiments)+' eksperimen ditinjau');
   put('vps-result-note',candidates?'Masih memerlukan forward test': 'Belum ada kandidat yang lolos seluruh pemeriksaan');
  }else{put('vps-results','Laporan belum tersedia');put('vps-result-note','Menunggu laporan VPS yang terverifikasi')}
 }
 async function refresh(){
  if(busy||document.hidden)return;busy=true;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),7000);
  try{const r=await fetch('/api/runtime',{signal:controller.signal,headers:{Accept:'application/json'}});if(!r.ok)throw Error('unavailable');packet=await r.json();render()}
  catch{packet=null;offline()}finally{clearTimeout(timeout);busy=false}
 }
 function schedule(){clearInterval(timer);if(!document.hidden){refresh();timer=setInterval(refresh,3000)}}
 document.addEventListener('visibilitychange',schedule);setInterval(render,1000);schedule();
})();
