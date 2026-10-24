// What-happened feed (public.updates, owner-only RLS). Signed-in only; hidden when signed out or the table is missing.
// Fetch once on open + piggybacks the existing 5-min heartbeat refresh (window.NL_UPD called from hbLoad). No own polling.
(()=>{'use strict';
const TABS=['overview','engine','charts','markets','bot','proof','brain','rnd','office','terminal'],SEV={info:'#6aa9ff',good:'#3ee08f',warn:'#f5b942',high:'#ff5a5a'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let ROWS=null,SEEN=null,busy=false,autoShown=false,bell=null,sheet=null;
function auth(){try{const s=window.NL_SB,a=JSON.parse(localStorage.getItem('nl_auth')||'null');return s&&a&&a.mode==='supabase'&&a.exp>Date.now()/1000+30?{s,t:a.token}:null}catch{return null}}
const lsPrefs=()=>{try{return JSON.parse(localStorage.getItem('nl_prefs')||'{}')||{}}catch{return{}}};
const day=ts=>new Date(ts).toLocaleDateString('en-ZA',{timeZone:'Africa/Johannesburg',weekday:'short',day:'numeric',month:'short',year:'numeric'});
const hm=ts=>new Date(ts).toLocaleTimeString('en-GB',{timeZone:'Africa/Johannesburg',hour:'2-digit',minute:'2-digit'});
const unread=()=>(ROWS||[]).filter(r=>!SEEN||r.ts>SEEN);
function hide(){if(bell)bell.classList.add('hidden');if(sheet)sheet.classList.add('hidden');}
function paintBell(){const n=unread().length;if(!bell){bell=document.createElement('button');bell.id='updBell';bell.className='ibtn wide upd-bell';bell.type='button';bell.addEventListener('click',()=>open(false));const c=document.getElementById('cur');c?c.parentNode.insertBefore(bell,c):document.querySelector('.hdr')?.appendChild(bell);}
 bell.classList.remove('hidden');bell.innerHTML=`🔔${n?`<b class="upd-n">${n>99?'99+':n}</b>`:''}`;bell.setAttribute('aria-label',n?`What happened: ${n} unread`:'What happened: no unread');}
function linkHtml(l){if(!l)return'';const t=String(l).replace(/^[#/]+/,'').split(/[/?#]/)[0];if(TABS.includes(t))return` <button class="upd-go" data-t="${t}">open ${esc(t==='rnd'?'R&D':t)} →</button>`;if(/^https:\/\//.test(l))return` <a class="upd-go" href="${esc(l)}" target="_blank" rel="noopener">open link ↗</a>`;return'';}
function open(auto){if(!ROWS)return;const un=unread(),list=auto||un.length?un:ROWS.slice(0,30);
 if(!sheet){sheet=document.createElement('div');sheet.id='updSheet';sheet.className='upd-wrap hidden';sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-label','What happened');document.body.appendChild(sheet);
  sheet.addEventListener('click',e=>{const b=e.target.closest('button');if(e.target===sheet||b?.id==='updClose')return close();if(b?.id==='updRead')return markRead();if(b?.dataset.t){close();try{window.go(b.dataset.t);history.pushState(null,'',b.dataset.t==='overview'?'/':'/'+b.dataset.t)}catch{}}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!sheet.classList.contains('hidden'))close();});}
 let h='',last='';for(const r of list){const d=day(r.ts);if(d!==last){h+=`<li class="upd-day">${esc(d)}</li>`;last=d;}const c=SEV[r.severity]||SEV.info;
  h+=`<li class="upd-it" style="border-left-color:${c}"><div class="upd-h"><span class="upd-t">${esc(hm(r.ts))} SAST</span><span class="upd-sev" style="color:${c}">${esc(r.severity)}</span><span class="upd-src">${esc(r.source)} · ${esc(r.kind)}</span></div><b>${esc(r.title)}</b>${r.body?`<div class="upd-b">${esc(r.body)}</div>`:''}${linkHtml(r.link)}</li>`;}
 sheet.innerHTML=`<div class="upd-sheet"><div class="upd-top"><b>${un.length?`SINCE YOUR LAST VISIT · ${un.length} new`:'WHAT HAPPENED · recent'}</b><span><button id="updRead" class="ibtn wide"${un.length?'':' disabled'}>Mark all read</button> <button id="updClose" class="ibtn" aria-label="Close">✕</button></span></div><ol class="upd-list">${h||'<li class="dim">Nothing yet.</li>'}</ol></div>`;
 sheet.classList.remove('hidden');}
function close(){sheet&&sheet.classList.add('hidden');}
async function markRead(){if(!ROWS||!ROWS.length)return;const v=ROWS[0].ts>(SEEN||'')?ROWS[0].ts:SEEN;SEEN=v;const p={...lsPrefs(),last_seen_updates:v};localStorage.setItem('nl_prefs',JSON.stringify(p));
 try{const r=await fetch('/api/prefs?k=upd');const j=r.ok?await r.json():null;const m={...(j&&j.prefs)||{},...p,last_seen_updates:v};localStorage.setItem('nl_prefs',JSON.stringify(m));await fetch('/api/prefs?k=upd',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(m)});}catch{}
 paintBell();close();}
let lastAt=0;async function load(){const a=auth();if(!a){ROWS=null;return hide();}if(busy||Date.now()-lastAt<60000)return;busy=true;lastAt=Date.now();
 try{const H={apikey:a.s.key,Authorization:'Bearer '+a.t};
  // gate: the lab row 'updates_meta' (written by post_update.py after the table exists) avoids a 404 console error while the table is not applied
  const mr=await fetch(a.s.url+'/rest/v1/lab?select=data&symbol=eq.updates_meta',{cache:'no-store',headers:H});const mj=mr.ok?await mr.json():null;const meta=Array.isArray(mj)&&mj[0]&&mj[0].data;if(!meta||!meta.ready){ROWS=null;return hide();}
  if(ROWS&&meta.last_ts&&ROWS.length&&new Date(meta.last_ts).toISOString()<=ROWS[0].ts){paintBell();return;}
  const r=await fetch(a.s.url+'/rest/v1/updates?select=id,ts,source,kind,title,body,link,severity&order=ts.desc&limit=100',{cache:'no-store',headers:{apikey:a.s.key,Authorization:'Bearer '+a.t}});
  if(!r.ok){ROWS=null;return hide();}const j=await r.json();if(!Array.isArray(j)){ROWS=null;return hide();}ROWS=j.filter(x=>x&&x.ts&&x.title);
  if(SEEN==null){let s=lsPrefs().last_seen_updates||null;try{const q=await fetch('/api/prefs?k=upd');const pj=q.ok?await q.json():null;const v=pj&&pj.prefs&&pj.prefs.last_seen_updates;if(v&&(!s||v>s))s=v;}catch{}SEEN=s||'';}
  // normalise ts strings so string compare == time compare
  for(const x of ROWS)x.ts=new Date(x.ts).toISOString();ROWS.sort((p,q)=>q.ts<p.ts?-1:1);
  paintBell();if(!autoShown){autoShown=true;if(unread().length)open(true);}
 }catch{ROWS=null;hide();}finally{busy=false;}}
window.NL_UPD=load;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(load,800));else setTimeout(load,800);
})();
