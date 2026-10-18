// Pulse engine — JS twin of pulse.py. Reads the SAME pulse_config.json. No numbers hard-coded.
import { createHash } from 'node:crypto';
const sortKeys = v => Array.isArray(v) ? v.map(sortKeys) : (v && typeof v === 'object') ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sortKeys(v[k])])) : v;
const pyNum = s => s; // JSON numbers in config are plain decimals; JSON.stringify matches Python json.dumps for them
export function canon(cfg) { const c = { ...cfg }; delete c.hash; return JSON.stringify(sortKeys(c)); }
export function hashConfig(cfg) { return createHash('sha256').update(canon(cfg)).digest('hex').slice(0, 16); }
export function verifyConfig(cfg) { const h = hashConfig(cfg); if (cfg.hash !== h) throw new Error(`pulse_config hash mismatch ${cfg.hash} != ${h}`); return cfg; }
const ema = (x, n) => { const k = 2 / (n + 1); let e = x[0]; const o = []; for (const v of x) { e = v * k + e * (1 - k); o.push(e); } return o; };
const emaSeries = ema;
function rsi(x, n) { let g = 0, l = 0; for (let i = 1; i <= n; i++) { const d = x[i] - x[i - 1]; g += Math.max(d, 0); l += Math.max(-d, 0); }
  g /= n; l /= n; for (let i = n + 1; i < x.length; i++) { const d = x[i] - x[i - 1]; g = (g * (n - 1) + Math.max(d, 0)) / n; l = (l * (n - 1) + Math.max(-d, 0)) / n; }
  return l === 0 ? 100 : 100 - 100 / (1 + g / l); }
function atr(c, n) { const tr = []; for (let i = 1; i < c.length; i++) { const a = c[i - 1], b = c[i]; tr.push(Math.max(b.high - b.low, Math.abs(b.high - a.close), Math.abs(b.low - a.close))); }
  let a = 0; for (let i = 0; i < n; i++) a += tr[i]; a /= n; for (let i = n; i < tr.length; i++) a = (a * (n - 1) + tr[i]) / n; return a; }
const clamp = (v, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, v));
const r = (x, n) => Number(x.toFixed(n));
export function compute(pair, c15, c60, bids, asks, last, bid, ask, cfg, minScore = null) {
  const I = cfg.indicators, N = cfg.normalise, L = cfg.layers, W = cfg.weights, G = cfg.regime, V = cfg.verdict;
  const takeMin = minScore == null ? V.take_min : minScore;
  const cl15 = c15.map(b => b.close), cl60 = c60.map(b => b.close);
  const e20 = ema(cl60, I.ema_fast).at(-1), e50 = ema(cl60, I.ema_slow).at(-1), eloc = ema(cl15, I.ema_loc).at(-1);
  const trend = clamp(((e20 - e50) / e50) / N.trend_gap_full);
  const rs = rsi(cl15, I.rsi_len), rb = I.roc_bars_slow, base = cl60[cl60.length - 1 - rb], roc = (cl60.at(-1) - base) / base;
  const mom = clamp(N.mom_w_rsi * clamp((rs - N.rsi_mid) / N.rsi_span) + N.mom_w_roc * clamp(roc / N.roc_full));
  const a = atr(c15, I.atr_len), atrp = a / last * 100;
  const volOk = L.atr_pct_min <= atrp && atrp <= L.atr_pct_max;
  const v = c15.map(b => b.volume), nb = I.vol_avg_bars; let s0 = 0; for (const x of v.slice(-nb - 1, -1)) s0 += x; const avg = s0 / nb; const vrat = v.at(-1) / (avg || 1);
  let bv = 0, av = 0; for (const x of bids) bv += x.volume * x.price; for (const x of asks) av += x.volume * x.price;
  const imb = (bv - av) / ((bv + av) || 1);
  const spreadBps = (ask - bid) / ((ask + bid) / 2) * 1e4;
  const direction = trend > 0 && mom > 0 ? 'long' : trend < 0 && mom < 0 ? 'short' : 'none';
  const s = direction === 'short' ? -1 : 1;
  const layers = { bias: trend * s > L.bias_min,
    momentum: mom * s > L.mom_min && (s > 0 ? rs < L.rsi_long_max : rs > L.rsi_short_min),
    location: s > 0 ? cl15.at(-1) > eloc : cl15.at(-1) < eloc,
    flow: imb * s > L.flow_imb_min && vrat >= L.vol_ratio_min, volatility: volOk, spread: spreadBps <= L.spread_bps_max };
  const raw = W.trend * Math.max(0, trend * s) + W.momentum * Math.max(0, mom * s) + W.location * (layers.location ? 1 : 0)
    + W.book * clamp(0.5 + imb * s, 0, 1) + W.volatility * (volOk ? 1 : 0) + W.spread * (layers.spread ? 1 : 0);
  const score = 100 * raw * (direction !== 'none' ? 1 : cfg.no_direction_factor);
  let regime = trend > G.trend_up ? 'trend_up' : trend < G.trend_down ? 'trend_down' : 'range';
  if (atrp > G.high_vol_atr_pct) regime = 'high_vol'; else if (atrp < G.dead_atr_pct) regime = 'dead';
  const allok = Object.values(layers).every(Boolean) || !V.take_requires_all_layers;
  const verdict = direction !== 'none' && score >= takeMin && allok ? 'TAKE' : score >= V.watch_min ? 'WATCH' : 'STAND_ASIDE';
  const bl = cfg.bias_label_min;
  return { pair, label: cfg.pairs[pair].label, engine_version: cfg.engine_version, engine_hash: cfg.hash, last, bid, ask,
    score: r(score, 1), verdict, direction, bias: trend > bl ? 'bullish' : trend < -bl ? 'bearish' : 'neutral', regime, layers,
    metrics: { trend: r(trend, 3), momentum: r(mom, 3), rsi15: r(rs, 1), roc6h_pct: r(roc * 100, 2), atr15_pct: r(atrp, 3), vol_ratio: r(vrat, 2),
      book_imb: r(imb, 3), spread_bps: r(spreadBps, 2), ema20h: r(e20, 6), ema50h: r(e50, 6) },
    atr15: a, stop: r(last - cfg.levels.stop_atr * a * s, 6), t1: r(last + cfg.levels.t1_atr * a * s, 6), bar_time: c15.at(-1).time };
}
export { emaSeries };
