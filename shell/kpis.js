// RESKIN pass 2 (2026-10-22): Overview KPI cards with sparklines. Display only, PAPER ONLY.
let SL=null,SLat=0;
// Layout idea: Kiranism/next-shadcn-dashboard-starter + tremor KPI cards (MIT / Apache-2.0), ideas only, own code.
// Uses data the site already loaded (S.d.state, S.d.pulse, NL_HB.scoreboard). No fetches, no timers.
(()=>{const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $m=v=>v==null||isNaN(v)?'—':(v<0?'−':'')+'$'+Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
function spark(arr,col){const a=(arr||[]).filter(v=>v!=null&&!isNaN(v));if(a.length<2)return '<div class="rk-sp rk-sp0">not enough history yet</div>';
 const W=160,H=36,mn=Math.min(...a),mx=Math.max(...a),sp=mx-mn||1,pts=a.map((v,i)=>[i/(a.length-1)*W,H-2-(v-mn)/sp*(H-4)]);
 const d=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+','+p[1].toFixed(1)).join('');
 return `<svg class="rk-sp" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}L${W},${H}L0,${H}Z" fill="${col}" fill-opacity=".12"/><path d="${d}" fill="none" stroke="${col}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`;}
function host(){let el=document.getElementById('rsKpis');if(el)return el;const c=document.getElementById('cards');if(!c)return null;el=document.createElement('div');el.id='rsKpis';el.className='rk';c.before(el);return el;}
let LAST='';
function draw(){const S=window.S;if(!S||!S.on('overview')||!S.d)return;const el=host();if(!el)return;const st=S.d.state,ch=st?.challenge,sb=window.NL_HB?.scoreboard?.bots?.v5,P=S.d.pulse?.pairs||{};
 const key=JSON.stringify([st?.generated_at,ch?.equity_usd,sb,S.d.pulse?.fetched_at]);if(key===LAST)return;LAST=key;
 if(!st||!ch){el.innerHTML='<div class="rk-c rk-wide"><span class="rk-l">Paper account</span><span class="rk-sub">sign in to see the bot\'s paper balance and record</span></div>';return;}
 // balance curve: start capital + cumulative realized P&L of this version's closed trades (open P&L added to the last point)
 const tr=(st.recent_trades||[]).filter(t=>t.version===ch.version&&t.pnl_usd!=null).sort((a,b)=>a.ts-b.ts);let run=+ch.start_usd||1000;const curve=[run,...tr.map(t=>run+=t.pnl_usd)];curve.push(+ch.equity_usd);
 const eq=+ch.equity_usd,st0=+ch.start_usd||1000,chg=(eq/st0-1)*100;
 const closed=sb?.closed_trades,wr=sb?.win_rate_after_fees,net=sb?.net_pnl_after_fees,left=sb?.trades_to_judgement,need=closed!=null&&left!=null?closed+left:30;
 const wins=[];let w=0,n=0;for(const t of tr){n++;if(t.pnl_usd>0)w++;wins.push(w/n*100);}
 const H=st.pulse_history||[],best=H.map(h=>Math.max(...Object.values(h.scores||{}).filter(v=>v!=null))),bestNow=Math.max(...Object.values(P).map(p=>p.score).filter(v=>v!=null));
 const bp=Object.values(P).reduce((a,p)=>!a||p.score>a.score?p:a,null);
 if(window.NL_HB?.scoreboard&&Date.now()-SLat>60000){SLat=Date.now();import('/shell/slots.js?v=942ede908c').then(m=>m.slotStatus()).then(r=>{SL=r;LAST=null;draw();}).catch(()=>{});}
 const SBB=window.NL_HB?.scoreboard?.bots||{},live=Object.entries(SBB).filter(([k,b])=>b&&b.status!=='RETIRED'&&b.balance!=null),tot=live.reduce((a,[,b])=>a+ +b.balance,0),st1=live.length*1000,tch=st1?(tot/st1-1)*100:0,v5r=SBB.v5?.status==='RETIRED',v5o=(ch.open_positions||[]).length;
 el.innerHTML=`
 <div class="rk-c"><span class="rk-l">Total paper equity · ${SL?`${SL.active.length} active · ${SL.idle.length} paused/idle · ${SL.retired.length} retired`:`${live.length} non-retired slots`}</span><b class="rk-v num">${live.length?$m(tot):'—'}</b><span class="rk-sub ${tch>=0?'up':'dn'}">${live.length?(tch>=0?'+':'')+tch.toFixed(2)+'% vs '+$m(st1)+' start':'scoreboard not loaded'}</span><span class="rk-f">sum of the ${live.length} non-retired slots that publish a balance (scoreboard row)${v5r?` · <span class="dim">v5 retired, closing ${v5o} open trade${v5o===1?'':'s'} (${$m(eq)})</span>`:''}</span></div>
 <div class="rk-c"><span class="rk-l">Win rate after fees · v5${SBB.v5?.status==='RETIRED'?' (retired)':''}</span><b class="rk-v num">${wr==null?'—':(wr*100).toFixed(0)+'%'}</b><span class="rk-sub ${net>0?'up':net<0?'dn':''}">net ${$m(net)} after fees</span>${spark(wins,'#38bdf8')}<span class="rk-f">running win rate per closed fill</span></div>
 <div class="rk-c"><span class="rk-l">Trades left before judging</span><b class="rk-v num">${left==null?'—':left}</b><span class="rk-sub">${closed==null?'—':closed} of ${need} closed</span><div class="rk-bar"><i style="width:${closed==null?0:Math.min(100,closed/need*100)}%"></i></div><span class="rk-f">the coach judges at ${need} closed trades</span></div>
 <div class="rk-c"><span class="rk-l">Best pulse score now</span><b class="rk-v num">${isFinite(bestNow)?bestNow.toFixed(1):'—'}</b><span class="rk-sub">${bp?esc(bp.label)+' · '+esc(String(bp.verdict).replace('_',' ')):'—'}</span>${spark(best.slice(-48),'#f59e0b')}<span class="rk-f">best of 10 engine coins, last ${Math.min(48,best.length)} bot ticks</span></div>`;}
window.rsKpis=draw;addEventListener('nl-hb',()=>{LAST='';draw();});})();
