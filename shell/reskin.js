// RESKIN 2026-10-22 (staging): sidebar collapse + number ticker. Display only, no data/engine logic.
// Sidebar idea: satnaing/shadcn-admin (MIT). Number ticker idea: magicuidesign/magicui NumberTicker (MIT). Own code, no copy.
(()=>{const IC={money:'◱',machines:'◉',research:'⚗',settings:'⚙',overview:'◱',engine:'◎',charts:'▤',markets:'◈',bot:'◉',proof:'✓',brain:'✦',rnd:'⚗',office:'▦',terminal:'▣',lab:'✎'};
const nav=document.getElementById('tabs');
function deco(){if(!nav)return;for(const a of nav.querySelectorAll('a[data-t]')){if(a.querySelector('.rs-lb'))continue;const kb=a.querySelector('.kb');
 const txt=[...a.childNodes].filter(n=>n!==kb).map(n=>n.textContent).join('').replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF\uFE0F]/gu,'').trim();
 [...a.childNodes].forEach(n=>{if(n!==kb)n.remove();});const ic=document.createElement('span');ic.className='rs-ic';ic.textContent=IC[a.dataset.t]||'•';const lb=document.createElement('span');lb.className='rs-lb';lb.textContent=txt;a.prepend(ic,lb);a.title=txt;}}
// DESIGN PASS B: Engine moves under an ADVANCED group at the end of the nav (section, route /engine and key 2 unchanged)
function adv(){if(!nav)return;const e=nav.querySelector('a[data-t="settings"]');if(!e)return;let g=nav.querySelector('.rs-grp');
 if(!g){g=document.createElement('span');g.className='rs-grp';g.setAttribute('role','presentation');g.textContent='Advanced';}
 if(nav.lastElementChild!==e||e.previousElementSibling!==g){nav.append(g,e);}}
const navTick=()=>{deco();adv();};navTick();if(nav)new MutationObserver(navTick).observe(nav,{childList:true,subtree:true});
const b=document.createElement('button');b.id='rsCollapse';b.type='button';b.title='Collapse sidebar';b.setAttribute('aria-label','Toggle sidebar');
const set=c=>{document.body.classList.toggle('rs-col',c);b.textContent=c?'»':'«';try{localStorage.setItem('rs_col',c?'1':'0');}catch{}};
b.onclick=()=>set(!document.body.classList.contains('rs-col'));document.body.append(b);set(localStorage.getItem('rs_col')==='1');
// number ticker: when a big number is re-rendered with a new value, count from the old value to the new one
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches,SEL='.px,.kpi .v,.bign,.rk-v',last=new Map();
const parse=s=>{const m=String(s).match(/-?[\d,]*\.?\d+/);return m?{n:parseFloat(m[0].replace(/,/g,'')),m:m[0],dec:(m[0].split('.')[1]||'').length,comma:m[0].includes(',')}:null;};
const key=el=>{const c=el.closest('.card,.kpi,.panel');const l=c?.querySelector('.l,.pair,.ph b,h3')?.textContent||'';return el.className+'|'+l.trim().slice(0,30)+'|'+[...document.querySelectorAll(SEL)].indexOf(el);};
function anim(el,from,to,p){if(el.children.length)return;const fmt=v=>{let s=v.toFixed(p.dec);if(p.comma){const [i,d]=s.split('.');s=i.replace(/\B(?=(\d{3})+(?!\d))/g,',')+(d!=null?'.'+d:'');}return el.dataset.rsTpl.replace('§',s);};
 el.dataset.rsTpl=el.textContent.replace(p.m,'§');el.dataset.rsBusy='1';el.classList.add('rs-tick',to>from?'rs-up':'rs-dn');const t0=performance.now(),D=650;
 const st=t=>{const k=Math.min(1,(t-t0)/D),e=1-Math.pow(1-k,3);el.textContent=fmt(from+(to-from)*e);if(k<1&&el.isConnected)requestAnimationFrame(st);else{el.textContent=fmt(to);delete el.dataset.rsBusy;setTimeout(()=>el.classList.remove('rs-up','rs-dn'),500);}};requestAnimationFrame(st);}
function scan(){for(const el of document.querySelectorAll(SEL)){if(el.dataset.rsBusy)continue;const p=parse(el.textContent);if(!p)continue;const k=key(el),o=last.get(k);last.set(k,p.n);
 if(!RM&&o!=null&&o!==p.n&&Math.abs(o-p.n)/Math.max(1e-9,Math.abs(p.n))<.2)anim(el,o,p.n,p);}}
let q=0;new MutationObserver(()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;scan();});}).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});})();
