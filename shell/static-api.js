// NORTHLINE static API ($0 host). PAPER ONLY. Bot state/lab/calendar/indices: private Supabase tables (owner-only RLS), read with the logged-in session.
window.NL_AUTH_HASH=location.hash;window.NL_SB={url:'https://esymjstgmijmkksapsqw.supabase.co',key:'sb_publishable_vrR-ymzo6NgBuvPL0s-fbw_6SDBSFnd'};
(()=>{const DATA='https://raw.githubusercontent.com/lensleyluan001-create/lensleyluan001-create.github.io/data/';const K='https://api.kraken.com/0/public/';
const of=window.fetch.bind(window),C=new Map();
const cached=(k,ttl,fn)=>{const h=C.get(k);if(h&&Date.now()-h.t<ttl)return h.p;const p=fn().catch(e=>{C.delete(k);throw e;});C.set(k,{t:Date.now(),p});return p;};
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json'}});
const SB=window.NL_SB;const tok=()=>{try{const t=JSON.parse(localStorage.getItem('nl_auth')||'null');return t&&t.mode==='supabase'&&t.exp>Date.now()/1000?t.token:null;}catch{return null;}};
const sbGet=async(table,q)=>{const t=tok();if(!t)throw new Error('not signed in');const r=await of(SB.url+'/rest/v1/'+table+'?select=data&'+q,{headers:{apikey:SB.key,authorization:'Bearer '+t},cache:'no-store'});if(!r.ok)throw new Error(table+' HTTP '+r.status);const j=await r.json();if(!j.length)throw new Error(table+' empty');return j[0].data;};
const MAP=f=>f==='state.json'?['bot_state','id=eq.current']:f==='calendar.json'?['calendar','id=eq.current']:f==='indices.json'?['indices','id=eq.current']:['lab','symbol=eq.'+encodeURIComponent(f.replace(/^lab\//,'').replace(/\.json$/,''))];
const data=(f,ttl=60000)=>cached('d:'+f,ttl,()=>sbGet(...MAP(f)));
const eng=()=>cached('eng',1e12,async()=>{const m=await import('/engine/pulse.js');const cfg=await (await of('/engine/pulse_config.json')).json();m.verifyConfig(cfg);return {m,cfg};});
async function kj(p){const r=await of(K+p);const d=await r.json();if(d.error&&d.error.length)throw new Error('kraken '+d.error.join(','));return d.result;}
const first=res=>res[Object.keys(res).find(k=>k!=='last')];
const ohlc=async(p,i)=>first(await kj(`OHLC?pair=${p}&interval=${i}`)).map(x=>({time:x[0],open:+x[1],high:+x[2],low:+x[3],close:+x[4],vwap:+x[5],volume:+x[6],count:x[7]}));
const depth=async(p,n)=>{const d=first(await kj(`Depth?pair=${p}&count=${n}`));const m=a=>a.map(x=>({price:+x[0],volume:+x[1],timestamp:+x[2]}));return{bids:m(d.bids),asks:m(d.asks)};};
const pulseAll=()=>cached('pulse',25000,async()=>{const {m,cfg}=await eng();const pairs=Object.keys(cfg.pairs),d=cfg.data,t0=Date.now();
 const r=await kj('Ticker?pair='+pairs.join(','));const tk={};for(const[k,v]of Object.entries(r))tk[k]={last:+v.c[0],bid:+v.b[0],ask:+v.a[0],open:+v.o,high24:+v.h[1],low24:+v.l[1]};
 const out={};await Promise.all(pairs.map(async p=>{let [c15,c60,ob]=await Promise.all([ohlc(p,d.tf_fast),ohlc(p,d.tf_slow),depth(p,d.depth_levels)]);
  if(d.drop_forming_bar){c15=c15.slice(0,-1);c60=c60.slice(0,-1);}const t=tk[cfg.pairs[p].ticker_key];const x=m.compute(p,c15,c60,ob.bids,ob.asks,t.last,t.bid,t.ask,cfg);delete x.atr15;
  x.change24_pct=Number(((t.last/t.open-1)*100).toFixed(2));x.high24=t.high24;x.low24=t.low24;x.spark=c15.slice(-96).map(b=>b.close);out[p]=x;}));
 return {engine_version:cfg.engine_version,engine_hash:cfg.hash,verdict_rules:cfg.verdict,source:'kraken_public_rest (in-browser, same engine)',fetched_at:Math.floor(t0/1000),latency_ms:Date.now()-t0,pairs:out};});
const state=()=>data('state.json').catch(()=>null);
async function health(st){const {cfg}=await eng();const now=Math.floor(Date.now()/1000),h=st?.bot_health||{};const last=h.last_tick_ts||st?.generated_at||null;const age=last?now-last:null;
 return {now,last_tick_ts:last,last_tick_age_s:age,bot_down:age==null||age>75*60,engine_app:cfg.hash,engine_bot:st?.engine?.hash||null,engine_match:st?.engine?.hash===cfg.hash,
  last_publish_received_at:st?.generated_at||null,last_publish_status:h.last_publish_status??null,last_deploy:h.last_deploy??null,last_error:h.last_error??null,deployed_engine_check:h.engine_check??null};}
const R={
 '/api/all':async u=>{const [p,s,i]=await Promise.allSettled([pulseAll(),state(),u.searchParams.get('idx')?data('indices.json',300000):Promise.resolve(null)]);const st=s.status==='fulfilled'?s.value:null;
  return J({pulse:p.status==='fulfilled'?p.value:{error:String(p.reason)},state:st,health:await health(st),indices:i.status==='fulfilled'?i.value:null});},
 '/api/pulse':async u=>{const {cfg}=await eng();if(u.searchParams.get('meta'))return J({engine_version:cfg.engine_version,engine_hash:cfg.hash,config:cfg});try{return J(await pulseAll());}catch(e){return J({engine_hash:cfg.hash,error:String(e.message||e)},502);}},
 '/api/state':async()=>{const s=await state();return J(s||{error:'no state published yet'},s?200:404);},
 '/api/health':async()=>J(await health(await state())),
 '/api/market':async u=>{const {m,cfg}=await eng();const pair=u.searchParams.get('pair')||'XBTUSD',tf=+(u.searchParams.get('tf')||15);if(!cfg.pairs[pair])return J({error:'bad pair/tf'},400);
  const [c,ob]=await cached(`m:${pair}:${tf}`,25000,()=>Promise.all([ohlc(pair,tf),depth(pair,cfg.data.depth_levels)]));const cl=c.map(b=>b.close),I=cfg.indicators,off=Math.max(0,c.length-300);
  const ef=m.emaSeries(cl,I.ema_fast),es=m.emaSeries(cl,I.ema_slow);
  return J({pair,tf,fetched_at:Math.floor(Date.now()/1000),candles:c.slice(-300),ema_fast:ef.slice(off).map((v,i)=>({time:c[off+i].time,value:v})),ema_slow:es.slice(off).map((v,i)=>({time:c[off+i].time,value:v})),ema_periods:[I.ema_fast,I.ema_slow],depth:ob,last_bar_forming:true});},
 '/api/lab':async u=>{const k=(u.searchParams.get('key')||'summary').replace(/[^A-Za-z0-9_]/g,'');try{return J(await data('lab/'+k+'.json',300000));}catch{return J({error:'not computed yet'},404);}},
 '/api/calendar':async()=>{try{const ev=await data('calendar.json',600000);return J({source:'ForexFactory weekly calendar JSON (via bot tick)',guard_rule:'bot pauses NEW entries ±30 min around High-impact USD events',events:ev.filter(e=>['High','Medium'].includes(e.impact)).map(e=>({title:e.title,country:e.country,impact:e.impact,date:e.date,forecast:e.forecast,previous:e.previous}))});}catch(e){return J({error:String(e),events:[]},502);}},
 '/api/indices':async()=>{try{return J(await data('indices.json',300000));}catch{return J({fetched_at:Math.floor(Date.now()/1000),note:'Indices unavailable on the free host.',quotes:[]});}},
 '/api/mt5':async()=>J({connected:false,setup:['MT5 bridge is off on the free host (paper only).'],message:'Disconnected'}),
 '/api/prefs':async(u,o)=>{const t=tok();const k='nl_prefs_srv';if(!t){if((o?.method||'GET')==='PUT'){localStorage.setItem(k,o.body);return J({ok:true});}const v=localStorage.getItem(k);return J({prefs:v?JSON.parse(v):null});}
  const H={apikey:SB.key,authorization:'Bearer '+t,'content-type':'application/json'};const uid=JSON.parse(localStorage.getItem('nl_auth')).sub;
  if((o?.method||'GET')==='PUT'){const r=await of(SB.url+'/rest/v1/prefs?on_conflict=user_id',{method:'POST',headers:{...H,prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({user_id:uid,data:JSON.parse(o.body),updated_at:new Date().toISOString()})});return J({ok:r.ok},r.ok?200:502);}
  const r=await of(SB.url+'/rest/v1/prefs?select=data&user_id=eq.'+uid,{headers:H});const j=r.ok?await r.json():[];return J({prefs:j[0]?.data||null});},
 '/api/feedback':async(u,o)=>{const t=tok();if(!t)return J({error:'sign in first'},401);const b=JSON.parse(o.body);const r=await of(SB.url+'/rest/v1/feedback',{method:'POST',headers:{apikey:SB.key,authorization:'Bearer '+t,'content-type':'application/json',prefer:'return=minimal'},body:JSON.stringify({message:b.message,page:b.page})});return J({ok:r.ok},r.ok?201:502);}};
window.fetch=(input,o)=>{const s=typeof input==='string'?input:input.url;const u=new URL(s,location.href);
 if(u.origin===location.origin){if(R[u.pathname])return R[u.pathname](u,o).catch(e=>J({error:String(e.message||e)},502));
  if(u.pathname==='/'&&o?.method==='POST')return Promise.resolve(J({error:'feedback inbox off on free host'},503));
  if(u.pathname.startsWith('/.netlify/'))return Promise.resolve(J({error:'identity off'},404));}
 return of(input,o);};})();
