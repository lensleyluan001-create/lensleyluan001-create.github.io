// INFLUENCER WATCH (PAPER research). Read-only lab row 'influence' published by the box (publish_supabase.publish_influence):
// map.json from Lulu Research + last statement times from the raw feeds + news alerts. Fetched once per tab visit (60 s cache). No photos: initials icons.
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let C=null,at=0,inf=null;
export async function loadInfluence(){if(at&&Date.now()-at<60000)return C;if(inf)return inf;inf=(async()=>{try{const r=await fetch('/api/lab?key=influence');C=r.ok?await r.json():null;if(C&&!C.generated_sast)C=null;}catch{C=null;}at=Date.now();inf=null;return C;})();return inf;}
const ROSTER=['Trump','Powell','Bessent','OPEC/Saudi','Iran','Israel','Xi','Lagarde','SEC chair','Musk','Saylor','CZ'];
const ALIAS={Trump:/trump|white house/i,Powell:/powell|\bfed\b|fomc/i,Bessent:/bessent|treasury/i,'OPEC/Saudi':/opec|saudi/i,Iran:/iran/i,Israel:/israel/i,Xi:/\bxi\b|china|beijing/i,Lagarde:/lagarde|ecb/i,'SEC chair':/\bsec\b/i,Musk:/musk/i,Saylor:/saylor/i,CZ:/\bcz\b|binance/i};
const hue=s=>{let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))%360;return h;};
export const initials=n=>n.replace(/[^A-Za-z/ ]/g,'').split(/[\s/]+/).filter(Boolean).map(w=>w[0]).join('').slice(0,2).toUpperCase();
export const icon=(n,sz=40)=>`<svg class="iw-ic" width="${sz}" height="${sz}" viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="g${hue(n)}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue(n)},70%,45%)"/><stop offset="1" stop-color="hsl(${(hue(n)+50)%360},70%,25%)"/></linearGradient></defs><polygon points="20,1 37,10.5 37,29.5 20,39 3,29.5 3,10.5" fill="url(#g${hue(n)})"/><text x="20" y="25" text-anchor="middle" font-size="13" font-weight="700" fill="#fff" font-family="monospace">${esc(initials(n))}</text></svg>`;
const ago=ts=>{if(!ts)return'—';const m=Math.round((Date.now()/1000-ts)/60);return m<1?'just now':m<90?m+' min ago':m<48*60?Math.round(m/60)+' h ago':Math.round(m/1440)+' d ago';};
const sast=ts=>ts?new Date((ts+7200)*1000).toISOString().slice(0,16).replace('T',' '):'—';
// one row per person: the map's people when Research has published them, else the watch roster with honest blanks
export function people(q){if(!q)return[];const last=q.last||{},alerts=[...(q.alerts||[]),...(q.alert_now?[q.alert_now]:[])],now=Date.now()/1000;
 const src=Array.isArray(q.people)&&q.people.length?q.people.map(p=>({name:p.name||p.speaker||p.id||'?',raw:p})):ROSTER.map(n=>({name:n,raw:null}));
 return src.map(({name,raw})=>{const re=ALIAS[name]||new RegExp(name.replace(/[^\w ]/g,'.'),'i'),key=Object.keys(last).find(k=>k===name||re.test(k)),L=key?last[key]:null;
  const ex=key===name?null:key,hit=alerts.filter(a=>re.test(`${a.headline||''} ${(a.topics||[]).join(' ')}`)),hot=hit.find(a=>{const t=Date.parse(a.time_utc||'')/1000;return t&&now-t<4*3600;});
  const ts=L?.last_ts||null,status=hot?'HIGH':ts&&now-ts<6*3600?'WATCH':'quiet';
  const markets=raw?(raw.markets||raw.moves||raw.affects||[]):[],score=raw?(raw.impact_score??raw.impact??raw.score??null):null;
  return{name,raw,markets:Array.isArray(markets)?markets:[String(markets)],score,ts,via:ex,recent:L?.recent||[],alerts:hit,status,
   sources:(q.sources||[]).filter(s=>re.test(s.speaker||'')),handles:(q.x_handles||[]).filter(h=>re.test(h.speaker||''))};});}
export function speaking(q){return people(q).filter(p=>p.status!=='quiet');}
export async function showBoard(sel){const el=document.querySelector(sel);if(!el)return;const q=await loadInfluence();
 if(!q){el.innerHTML=`<div class="ph"><b class="a">INFLUENCER WATCH</b><span class="dim small">building: no 'influence' row published yet (or not signed in). Nothing is shown rather than made up.</span></div>`;return;}
 const P=people(q),building=q.status!=='ready';
 el.innerHTML=`<div class="ph"><b class="a">INFLUENCER WATCH · PAPER RESEARCH</b><span class="dim small">${building?'<b class="a">BUILDING</b>: Lulu Research is still writing the people map, so markets moved and impact scores are not measured yet · ':''}map ${esc(q.map_date_sast||'—')} · row updated ${esc(q.generated_sast)} SAST · ${(q.alerts||[]).length} news alerts on record</span></div>
 <div class="iw-g">${P.map((p,i)=>`<button class="iw-t ${p.status==='HIGH'?'hi':p.status==='WATCH'?'wa':''}" data-i="${i}">${icon(p.name)}<span class="iw-n"><b>${esc(p.name)}</b><span class="iw-s">${p.status==='HIGH'?'HIGH pulse':p.status}</span></span>
  <span class="iw-m small">${p.markets.length?esc(p.markets.slice(0,4).join(' · ')):'<span class="dim">markets: building</span>'}</span>
  <span class="iw-k small"><span>impact <b>${p.score==null?'—':esc(p.score)}</b></span><span class="dim">${p.ts?'spoke '+ago(p.ts):'no feed yet'}</span></span></button>`).join('')}</div><div id="iwCard" class="iw-card" hidden></div>`;
 el.onclick=e=>{const t=e.target.closest('.iw-t'),c=el.querySelector('#iwCard');if(e.target.closest('.iw-x')){c.hidden=true;return;}if(!t)return;const p=P[+t.dataset.i];
  c.innerHTML=`<button class="iw-x" aria-label="close">✕</button><div class="iw-ch">${icon(p.name,56)}<div><h4>${esc(p.name)}</h4><div class="small">status <b>${p.status==='HIGH'?'HIGH pulse':p.status}</b> · last statement ${p.ts?`${sast(p.ts)} SAST (${ago(p.ts)})${p.via?' via '+esc(p.via):''}`:'<span class="dim">no feed for this person yet</span>'}</div></div></div>
  <div class="small"><b>Markets moved:</b> ${p.markets.length?esc(p.markets.join(', ')):'<span class="dim">not measured yet (map building)</span>'} · <b>impact score:</b> ${p.score==null?'<span class="dim">not measured yet</span>':esc(p.score)}</div>
  ${p.raw?`<div class="small dim">map stats: ${esc(JSON.stringify(p.raw).slice(0,400))}</div>`:''}
  <div class="small"><b>Recent statements</b>${p.recent.length?`<ul>${p.recent.map(r=>`<li>${sast(r.ts)} SAST · ${esc(r.text)}</li>`).join('')}</ul>`:' <span class="dim">none captured yet</span>'}</div>
  <div class="small"><b>News alerts</b> ${p.alerts.length?p.alerts.slice(-5).map(a=>`<div>${esc(a.time_sast||a.time_utc)} · ${esc(a.severity)} · ${esc((a.affected_markets||[]).join(','))} · ${esc(a.headline)}</div>`).join(''):'<span class="dim">none on record</span>'}</div>
  <div class="small dim">sources: ${p.sources.length?p.sources.map(s=>`${esc(s.source)} (${s.reachable?'reachable':'unreachable'}${s.polled_in_tick?', polled in tick':''})`).join('; '):'none mapped yet'}${p.handles.length?' · X: '+p.handles.map(h=>'@'+esc(h.handle)).join(', ')+' (confirm-only)':''}</div>`;c.hidden=false;c.scrollIntoView({block:'nearest',behavior:'smooth'});};}
