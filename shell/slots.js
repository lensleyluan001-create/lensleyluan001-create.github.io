// Shared slot-status rule (Office + Money KPI). Read-only, no polling.
// retired = scoreboard status RETIRED; active = the published row that carries the bot (squad loops / indie) updated in the last 60 min;
// otherwise paused/idle (row older than 60 min, or no row carries the bot = "no tick source").
const ROWS=['squad','squad_fwd5m','squad_fwdw','squad_fwdcopy','squad_rnd_scanner'];
const t2=t=>t?Date.parse(String(t).replace(' ','T').slice(0,19)+(String(t).length<=16?':00':'')+'+02:00')||0:0;
let C=null,at=0,inf=null;
async function rows(){if(C&&Date.now()-at<60000)return C;if(inf)return inf;inf=(async()=>{const o={};await Promise.all(ROWS.map(async k=>{try{const r=await fetch('/api/lab?key='+k);const d=r.ok?await r.json():null;if(d&&!d.error)o[k]=d;}catch{}}));C=o;at=Date.now();inf=null;return o;})();return inf;}
const ids=d=>Array.isArray(d?.bots)?d.bots.map(x=>x?.id).filter(Boolean):d?.bots&&typeof d.bots==='object'?Object.keys(d.bots):[];
export async function slotStatus(sb=window.NL_HB?.scoreboard,indie=window.NL_HB?.indie){if(!sb?.bots)return null;const R=await rows(),last={};
 const mark=(id,t)=>{if(t>(last[id]||0))last[id]=t;};for(const k of ROWS){const d=R[k];if(d)for(const id of ids(d))mark(id,t2(d.updated_sast));}if(indie)for(const id of ids(indie))mark(id,t2(indie.updated_sast));
 const out={active:[],idle:[],retired:[]},now=Date.now();for(const [id,v] of Object.entries(sb.bots)){const t=last[id]||0,o={id,v,last:t};if(v?.status==='RETIRED')out.retired.push(o);else if(t&&now-t<3600e3)out.active.push(o);else out.idle.push({...o,why:t?'no tick in 60 min':'no tick source published'});}return out;}
