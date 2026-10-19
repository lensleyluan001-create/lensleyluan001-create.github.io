// NORTHLINE shell v2: intro film, login (Supabase magic link, invite-only), command palette, prefs + feedback (Supabase).
// Presentation/workflow only. Does not touch engine, bot, data or /api reads.
(()=>{
const Q=new URLSearchParams(location.search),$=s=>document.querySelector(s),h=(t,a={},c='')=>{const e=document.createElement(t);for(const k in a)e.setAttribute(k,a[k]);e.innerHTML=c;return e;};
const SB=window.NL_SB||{},AU=SB.url+'/auth/v1',TK='nl_auth',SS=sessionStorage,LS=localStorage;
const hash=new URLSearchParams((window.NL_AUTH_HASH||location.hash).slice(1));const cbErr=hash.get('error_description');
let idOn=true;
const authed=()=>{try{const t=JSON.parse(LS.getItem(TK)||'null');if(!t)return false;if(t.mode!=='supabase')return false;return t.exp>Date.now()/1000;}catch{return false;}};
let guideWait=false;const lock=on=>{document.body.classList.toggle('locked',on);if(!on&&guideWait){guideWait=false;setTimeout(()=>{const g=document.querySelector('#guide');g&&!g.open&&g.showModal();},600);}};
(()=>{const g=document.querySelector('#guide');if(!g)return;const o=g.showModal.bind(g);g.showModal=()=>{if(document.body.classList.contains('locked')){guideWait=true;return;}o();};})();

/* ---------- sticky offsets + nav hints ---------- */
function layout(){const t=$('.top'),n=$('#tabs');if(t&&n)n.style.top=t.offsetHeight+'px';}
addEventListener('resize',layout);
const TABS=[['overview','Overview','1'],['engine','Engine','2'],['charts','Charts','3'],['markets','Markets','4'],['bot','Bot','5'],['proof','Proof','6'],['brain','Brain','7'],['rnd','R&D','8'],['office','Office','9']];
function hints(){document.querySelectorAll('#tabs a').forEach(a=>{const t=TABS.find(x=>x[0]===a.dataset.t);if(t&&!a.querySelector('.kb'))a.append(h('span',{class:'kb'},t[2]));});
 const hd=$('.hdr');if(hd&&!$('#palOpen')){const b=h('button',{id:'palOpen',class:'ibtn wide palbtn',title:'Command palette'},'⌘K');b.onclick=pal;hd.prepend(b);}}

/* ---------- INTRO FILM ---------- */
function intro(done){
 if(SS.getItem('nl_intro')||Q.get('intro')==='0'||cbErr||hash.get('access_token')){done();return;}
 lock(true);
 const pts=Array.from({length:40},(_,i)=>`${i*36},${200+Math.sin(i*.7)*60+Math.cos(i*1.9)*40-i*2}`).join(' ');
 const neur=Array.from({length:26},()=>`<i style="left:${Math.random()*100}%;top:${Math.random()*100}%;animation-delay:${(Math.random()*3).toFixed(2)}s"></i>`).join('');
 const el=h('div',{id:'nlIntro',role:'dialog','aria-label':'SUPER TRADING OS intro'},`
 <div class="prog"></div><div class="bar"><span class="lg-brand">SUPER TRADING OS <b>▲</b></span><button class="nlbtn" id="skip">Skip intro →</button></div>
 <section class="scene s-open"><div class="bgfx gridfx par"></div><div class="copy rv"><div class="kick">A paper trading lab</div><h1 class="grad">SUPER TRADING OS</h1><p>Every market tells a story every second. We built a machine to listen.</p></div><div class="scrollhint">SCROLL ↓</div></section>
 <section class="scene s-markets"><div class="bgfx"><svg viewBox="0 0 1400 400" preserveAspectRatio="none"><polyline points="${pts}" style="fill:none;stroke:#2fe39b;stroke-width:2;stroke-dasharray:2400;stroke-dashoffset:2400;animation:draw 6s ease forwards infinite alternate"/></svg></div><div class="copy rv"><div class="kick">01 · Markets</div><h2>Live crypto. Delayed indices, gold &amp; FX.</h2><p>Kraken data streams in for the coins the bot trades. Everything else sits beside it, marked delayed, for context only.</p><div class="chips"><span>BTC</span><span>ETH</span><span>SOL</span><span>+7 ALTS</span><span>US100</span><span>XAU</span></div></div></section>
 <section class="scene s-pulse"><div class="bgfx"><div class="pulse-ring"></div><div class="pulse-ring"></div><div class="pulse-ring"></div></div><div class="copy rv"><div class="kick">02 · The Pulse engine</div><div class="score">6/6</div><h2>Six checks. One score.</h2><p>The same engine file runs on this desk and in the paper bot. It only acts when the score clears its line and all six checks are green. Otherwise it waits.</p></div></section>
 <section class="scene s-brain"><div class="bgfx neur">${neur}</div><div class="copy rv"><div class="kick">03 · The Brain</div><h2>It watches. It scores itself.</h2><p>Every 30 minutes it records what the market did next. A setup only earns trust after 30 out-of-sample results. Today: <b>learning, not proven yet.</b></p></div></section>
 <section class="scene s-loop"><div class="copy rv"><div class="kick">04 · Death &amp; respawn</div><div class="loop"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="80" fill="none" stroke="#1c2531" stroke-width="2"/><circle cx="100" cy="100" r="80" fill="none" stroke="#2fe39b" stroke-width="3" stroke-dasharray="120 383" stroke-linecap="round"/><circle cx="180" cy="100" r="6" fill="#ff5470"/></svg></div><h2>Lose half. Die. Learn. Respawn.</h2><p>Each version that blows through its limit is retired, studied, and rebuilt. Hard risk caps, paper money only.</p></div></section>
 <section class="scene s-end"><div class="bgfx gridfx"></div><div class="copy rv"><div class="kick">Paper only · no live money</div><h2 class="grad">Enter the desk.</h2><p><button class="nlbtn pri" id="enter">Continue →</button></p></div></section>`);
 document.body.append(el);
 const fin=()=>{SS.setItem('nl_intro','1');el.style.transition='opacity .5s';el.style.opacity='0';setTimeout(()=>{el.remove();done();},450);};
 el.querySelector('#skip').onclick=fin;el.querySelector('#enter').onclick=fin;
 const pr=el.querySelector('.prog');el.addEventListener('scroll',()=>{pr.style.width=(el.scrollTop/(el.scrollHeight-el.clientHeight)*100)+'%';},{passive:true});
 if(!CSS.supports('animation-timeline','view()')){const io=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&e.target.classList.add('in')),{root:el,threshold:.25});el.querySelectorAll('.rv').forEach(r=>io.observe(r));}
 addEventListener('keydown',function k(e){if(e.key==='Escape'&&document.contains(el)){fin();removeEventListener('keydown',k);}});
}

/* ---------- LOGIN ---------- */
function saveTok(j){const p=JSON.parse(atob(j.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));LS.setItem(TK,JSON.stringify({mode:'supabase',token:j.access_token,refresh:j.refresh_token,exp:p.exp,email:p.email,sub:p.sub}));}
function fromHash(){const at=hash.get('access_token');if(!at)return false;saveTok({access_token:at,refresh_token:hash.get('refresh_token')});history.replaceState(null,'',location.pathname+location.search);return true;}
async function refresh(){try{const t=JSON.parse(LS.getItem(TK)||'null');if(!t?.refresh||t.mode!=='supabase')return false;const r=await fetch(AU+'/token?grant_type=refresh_token',{method:'POST',headers:{apikey:SB.key,'content-type':'application/json'},body:JSON.stringify({refresh_token:t.refresh})});if(!r.ok)return false;saveTok(await r.json());return true;}catch{return false;}}
const PENDING='Invite pending: this email has no confirmed invite yet. Open the invite email from Supabase first, then come back and request a sign-in link.';
function login(done){
 const el=h('div',{id:'nlLogin'},`<div class="lg-wrap">
 <div class="lg-pitch"><div class="lg-brand">SUPER TRADING OS <b>▲</b></div>
  <h1>One desk for every signal the bot sees, and <span class="grad">every lesson it learns.</span></h1>
  <p class="lead">A private trading lab: live crypto scoring, an R&amp;D lab, a self-learning brain and a paper bot that has to prove itself before any real money is ever considered.</p>
  <div class="feat">
   <div><i>MARKETS</i><b>Markets &amp; Lab</b><span>Live Kraken coins plus delayed indices, gold and FX for context.</span></div>
   <div><i>ENGINE</i><b>Pulse engine</b><span>Six checks, one 0–100 score. Same file as the bot, verified by hash.</span></div>
   <div><i>R&amp;D</i><b>Research lab</b><span>Ideas, honest backtests with costs and sample sizes, and the paper squad.</span></div>
   <div><i>BRAIN</i><b>Self-learning brain</b><span>Scores ~1,360 indicator combos on what happened next. Trust only after 30 results.</span></div>
   <div><i>PROOF</i><b>Proof</b><span>Every paper trade, version, death and respawn, on the record.</span></div>
   <div><i>DESK</i><b>Trade desk</b><span>Charts, order book, stops and targets, all in one place.</span></div>
  </div>
  <div class="honest"><b>Honest status:</b> paper trading only, no live money. The bot is learning and no strategy is proven yet. This is a research desk, not financial advice.</div>
 </div>
 <form class="lg-card" id="lgForm" autocomplete="on"><h2>Sign in</h2><div class="sub" id="lgSub">Invite-only. Owner access. We email you a one-time sign-in link.</div>
  <div id="lgEmailRow"><label for="lgEmail">Email</label><input id="lgEmail" type="email" autocomplete="username" required value="tradebotz.za@gmail.com"></div>
  <button class="nlbtn pri" type="submit" id="lgGo">Email me a sign-in link</button>
  <div class="lg-msg" id="lgMsg"></div>
  <div class="lg-foot">Secured by Supabase Auth · registration by invite only</div></form></div>`);
 document.body.append(el);lock(true);
 const msg=(t,c='')=>{const m=el.querySelector('#lgMsg');m.textContent=t;m.className='lg-msg '+c;};
 if(cbErr)msg(/expired|invalid/i.test(cbErr)?'That link expired or was already used. Request a new one.':cbErr,'err');
 el.querySelector('#lgForm').onsubmit=async e=>{e.preventDefault();const email=el.querySelector('#lgEmail').value.trim();msg('Sending…');
  try{const r=await fetch(AU+'/otp?redirect_to='+encodeURIComponent(location.origin+'/'),{method:'POST',headers:{apikey:SB.key,'content-type':'application/json'},body:JSON.stringify({email,create_user:false})});
   if(r.ok){msg('Check your inbox: the sign-in link opens the OS on this device.','ok');return;}
   const j=await r.json().catch(()=>({}));const t=(j.msg||j.error_description||j.message||'')+'';
   msg(/signup|not allowed|not found|otp_disabled|user/i.test(t)||r.status===422||r.status===400?PENDING:/rate|seconds/i.test(t)||r.status===429?'Email limit reached: Supabase\'s free mailer sends only a few emails per hour. A link may already be in your inbox (check spam); use the newest one, or try again in about an hour.':(t||'Could not send the link'),'err');
  }catch{msg('Network error, try again','err');}};
 setTimeout(()=>el.querySelector('#lgEmail').focus(),200);
}
function logout(){LS.removeItem(TK);SS.removeItem('nl_intro');location.reload();}

/* ---------- PREFS (Supabase prefs table via /api/prefs; localStorage first) ---------- */
const devKey=()=>{let k=LS.getItem('nl_dev');if(!k){k='d'+crypto.getRandomValues(new Uint32Array(3)).join('');LS.setItem('nl_dev',k);}return k;};
let P={compact:false};
const pkey=()=>{try{const t=JSON.parse(LS.getItem(TK)||'null');return t?.sub?'u'+t.sub.replace(/[^a-z0-9]/gi,''):devKey();}catch{return devKey();}};
async function loadPrefs(){try{const c=LS.getItem('nl_prefs');if(c)P={...P,...JSON.parse(c)};applyPrefs();const r=await fetch('/api/prefs?k='+pkey());if(r.ok){const j=await r.json();if(j&&j.prefs){P={...P,...j.prefs};LS.setItem('nl_prefs',JSON.stringify(P));applyPrefs();}}}catch{}}
function savePrefs(){LS.setItem('nl_prefs',JSON.stringify(P));fetch('/api/prefs?k='+pkey(),{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(P)}).catch(()=>{});}
function applyPrefs(){document.body.classList.toggle('compact',!!P.compact);}

/* ---------- FEEDBACK (Supabase feedback table) ---------- */
function feedback(){let d=$('#nlFb');if(!d){d=h('dialog',{id:'nlFb'},`<form method="dialog" id="fbF"><h2>Send feedback</h2><p class="dim small">Saved privately to the SUPER TRADING OS feedback inbox.</p><textarea name="message" required placeholder="What should look or work better?"></textarea><p style="display:flex;gap:8px;justify-content:flex-end"><button class="nlbtn" value="cancel" formnovalidate>Cancel</button><button class="nlbtn pri" id="fbSend" value="send">Send</button></p><div class="dim small" id="fbMsg"></div></form>`);document.body.append(d);
 d.querySelector('#fbSend').onclick=async e=>{e.preventDefault();const ta=d.querySelector('textarea');if(!ta.value.trim())return;
  const r=await fetch('/api/feedback',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:ta.value,page:location.pathname})}).catch(()=>null);
  d.querySelector('#fbMsg').textContent=r&&r.ok?'Thanks, saved.':'Could not send right now.';if(r&&r.ok){ta.value='';setTimeout(()=>d.close(),900);}};}
 d.showModal();}

/* ---------- COMMAND PALETTE + SHORTCUTS ---------- */
const CMDS=()=>[...TABS.map(([t,n,k])=>({n:'Go to '+n,k,f:()=>window.go&&window.go(t)})),
 {n:'Toggle compact density',k:'D',f:()=>{P.compact=!P.compact;applyPrefs();savePrefs();}},
 {n:'Toggle currency (USD/ZAR)',k:'C',f:()=>$('#cur')?.click()},
 {n:'Open guide',k:'?',f:()=>$('#help')?.click()},
 {n:'Send feedback',k:'F',f:feedback},
 {n:'Replay intro film',k:'',f:()=>{SS.removeItem('nl_intro');intro(()=>lock(false));}},
 {n:'Open selftest',k:'',f:()=>location.href='/pulse/selftest/'},
 {n:'Open API health',k:'',f:()=>open('/api/health','_blank')},
 {n:'Sign out',k:'',f:logout}];
let palEl,sel=0,list=[];
function pal(){if(!palEl){palEl=h('div',{id:'nlPal'},'<div class="box"><input placeholder="Type a command or tab…" aria-label="Command"><ul></ul></div>');document.body.append(palEl);
 const inp=palEl.querySelector('input');palEl.onclick=e=>{if(e.target===palEl)palEl.classList.remove('open');};
 inp.oninput=()=>{sel=0;draw();};inp.onkeydown=e=>{if(e.key==='ArrowDown'){sel=Math.min(sel+1,list.length-1);draw();e.preventDefault();}else if(e.key==='ArrowUp'){sel=Math.max(sel-1,0);draw();e.preventDefault();}else if(e.key==='Enter'){run(list[sel]);}else if(e.key==='Escape')palEl.classList.remove('open');};}
 palEl.classList.add('open');const i=palEl.querySelector('input');i.value='';sel=0;draw();setTimeout(()=>i.focus(),10);}
function draw(){const q=palEl.querySelector('input').value.toLowerCase();list=CMDS().filter(c=>c.n.toLowerCase().includes(q));
 const ul=palEl.querySelector('ul');ul.innerHTML='';list.forEach((c,i)=>{const li=h('li',{class:i===sel?'sel':''},`<span>${c.n}</span><kbd>${c.k}</kbd>`);li.onclick=()=>run(c);ul.append(li);});}
function run(c){if(!c)return;palEl.classList.remove('open');c.f();}
addEventListener('keydown',e=>{if(document.body.classList.contains('locked'))return;
 if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();pal();return;}
 const tg=e.target.tagName;if(tg==='INPUT'||tg==='TEXTAREA'||tg==='SELECT'||e.metaKey||e.ctrlKey||e.altKey||palEl?.classList.contains('open'))return;
 if(e.key==='/'){e.preventDefault();pal();return;}
 const t=TABS.find(x=>x[2]===e.key);if(t&&window.go){window.go(t[0]);return;}
 const c=CMDS().find(x=>x.k&&x.k.toLowerCase()===e.key.toLowerCase()&&isNaN(x.k));if(c&&e.key!=='?')c.f();});

/* ---------- boot ---------- */
async function boot(){hints();layout();loadPrefs();
 fromHash();if(!authed())await refresh();
 if(authed()){lock(false);return;}
 intro(()=>login(()=>{loadPrefs();layout();}));}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
