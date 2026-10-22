// DESIGN PASS A (2026-10-22): motion layer. Display only, PAPER ONLY. Own code, vanilla, no libraries.
// Ideas: magicui (MIT) number/border motion, FLIP technique (Paul Lewis). Only transform/opacity/stroke-dashoffset animate;
// one MutationObserver + requestAnimationFrame; no fetches, no timers beyond rAF; prefers-reduced-motion = everything static.
(()=>{const RM=matchMedia('(prefers-reduced-motion: reduce)');if(RM.matches)return;
const raf2=f=>requestAnimationFrame(()=>requestAnimationFrame(f));
// 1) pulse gauges: re-rendered cards start from the previous needle/arc, then transition (CSS already has the transitions)
const G=new Map();
function gauges(root){for(const svg of root.querySelectorAll('svg.gauge:not([data-mo])')){svg.dataset.mo='1';const card=svg.closest('.card');const k=card?.querySelector('.sym')?.textContent||'';
 const nd=svg.querySelector('.needle'),arc=svg.querySelector('.arc');if(!nd||!arc)continue;const to={t:nd.style.transform,o:arc.getAttribute('stroke-dashoffset')};
 const from=G.get(k)||{t:'rotate(-90deg)',o:arc.getAttribute('stroke-dasharray')};G.set(k,to);if(from.t===to.t&&from.o===to.o)continue;
 nd.style.transition='none';arc.style.transition='none';nd.style.transform=from.t;arc.setAttribute('stroke-dashoffset',from.o);
 raf2(()=>{nd.style.transition='';arc.style.transition='';nd.style.transform=to.t;arc.setAttribute('stroke-dashoffset',to.o);});}}
// 2) sparklines draw in once per element (stroke-dashoffset), using pathLength so no getTotalLength layout read
function sparks(root){for(const p of root.querySelectorAll('svg.spark polyline:not([data-mo]),svg.rk-sp path[fill="none"]:not([data-mo]),.pv-wv:not([data-mo])')){p.dataset.mo='1';if(p.tagName==='I'){p.classList.add('mo-grow');continue;}p.setAttribute('pathLength','1');p.classList.add('mo-draw');}}
// 3) bars (Lab countdown, KPI progress, pulse weights) grow with transform:scaleX
function bars(root){for(const b of root.querySelectorAll('.lb-bar span:not([data-mo]),.rk-bar i:not([data-mo])')){b.dataset.mo='1';b.classList.add('mo-grow');}}
// 4) leaderboard FLIP: rows keep their old screen position, then glide to the new rank
const RP=new Map();
function flip(root){const t=root.querySelector?.('.rc-t')||(root.classList?.contains('rc')?root.querySelector('.rc-t'):null);if(!t||t.dataset.mo)return;t.dataset.mo='1';
 const rows=[...t.tBodies[0]?.rows||[]],now=new Map();for(const r of rows){const id=r.cells[1]?.querySelector('b')?.textContent;if(id)now.set(id,[r,r.getBoundingClientRect().top]);}
 const moved=[];for(const [id,[r,top]] of now){const old=RP.get(id);if(old!=null&&Math.abs(old-top)>1){r.style.transform=`translateY(${old-top}px)`;r.style.transition='none';moved.push([r,old>top]);}}
 for(const [id,[,top]] of now)RP.set(id,top);if(!moved.length)return;
 raf2(()=>{for(const [r,up] of moved){r.style.transition='transform .7s cubic-bezier(.2,.8,.2,1)';r.style.transform='';r.classList.add(up?'mo-up':'mo-dn');}});}
// keep FLIP positions relative to the page so scrolling between renders does not fake a move
addEventListener('scroll',()=>{RP.clear();},{passive:true});
function run(n){if(n.nodeType!==1)return;gauges(n);sparks(n);bars(n);flip(n);}
let Q=new Set(),q=0;new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)Q.add(n);if(q)return;q=requestAnimationFrame(()=>{q=0;const s=Q;Q=new Set();for(const n of s)if(n.isConnected)run(n);});}).observe(document.body,{childList:true,subtree:true});
run(document.body);})();
