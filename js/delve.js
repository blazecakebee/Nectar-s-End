// Nectar's End — 0.10 "Delve": Noita-style terrain (a winding descent path that curves, climbs, dips through pools and
// opens into caverns, carved through noise caves — different every run), line-of-sight fog of war, rarer events,
// fewer lodged fragments and bare-handed extraction.
(function (NE) {
'use strict';
const { clamp, lerp, chance, ri, rf, pick } = NE; const T = NE.T; const G = NE.G; const W_ = NE.World.prototype;

// =====================================================================================================================
// TERRAIN: a seeded worm carves the main way down; noise caverns branch off it; dips flood into pools you swim through
// =====================================================================================================================
const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const h2 = (x, y, s) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1274126177); h = Math.imul(h ^ (h >>> 13), 1103515245); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const vnoise = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = h2(xi, yi, s), b = h2(xi + 1, yi, s), c = h2(xi, yi + 1, s), d = h2(xi + 1, yi + 1, s); return lerp(lerp(a, b, u), lerp(c, d, u), v); };
const fbm = (x, y, s) => vnoise(x, y, s) * 0.55 + vnoise(x * 2.1, y * 2.1, s + 7) * 0.3 + vnoise(x * 4.3, y * 4.3, s + 13) * 0.15;
// per-biome terrain character
const STYLE = {
  grotto: { thr: 0.6, sx: 0.07, sy: 0.11, cham: 1, dip: 1, wide: 0 },
  desert: { thr: 0.64, sx: 0.05, sy: 0.12, cham: 1.4, dip: 0.5, wide: 1 },
  ice: { thr: 0.62, sx: 0.06, sy: 0.1, cham: 1, dip: 0.7, wide: 0, ice: 1 },
  crystal: { thr: 0.58, sx: 0.09, sy: 0.12, cham: 1.6, dip: 0.6, wide: 0 },
  magma: { thr: 0.63, sx: 0.06, sy: 0.1, cham: 1.3, dip: 0.3, wide: 1 },
  hive: { thr: 0.56, sx: 0.1, sy: 0.13, cham: 0.8, dip: 0.8, wide: 0 },
  drowned: { thr: 0.6, sx: 0.07, sy: 0.1, cham: 1, dip: 2.2, wide: 0 },
  ossuary: { thr: 0.66, sx: 0.08, sy: 0.12, cham: 0.8, dip: 0.6, wide: 0 },
  heart: { thr: 0.57, sx: 0.08, sy: 0.1, cham: 1.5, dip: 1.2, wide: 1 },
};
NE.TERRAIN_STYLE = STYLE;
W_.worm = function () {
  if (this._wp) return this._wp; const rng = mulberry((this.seed ^ 0x9E3779B9) >>> 0); const f0 = this.floors[0];
  let sx = 20; const pn = this.pitNext && this.pitNext[0]; if (pn) sx = Math.round((pn[0] + pn[1]) / 2); else if (this.ladNext && this.ladNext[0] != null) sx = this.ladNext[0];
  return this._wp = { rng, pts: [], pools: [], chambers: [], x: sx, y: NE.FH, fy: NE.FH, minY: NE.FH + 3, dir: rng() < 0.5 ? 1 : -1, seg: null, stop: null, hatch: {} };
};
W_.wormExtend = function (yTarget) {
  const P = this.worm(), R = P.rng, Wd = this.W, FH = NE.FH;
  const push = (r, extra) => P.pts.push(Object.assign({ x: P.x, y: Math.round(P.fy), r }, extra || {}));
  let guard = 0;
  while (P.fy < yTarget && !P.stop && guard++ < 20000) {
    // stop at a town roof: the hatch goes where the path arrives
    const band = Math.floor((P.fy + 1) / FH); if (NE.isTownFloor(band) && P.fy + 1 >= band * FH - 1) { P.fy = band * FH - 1; push(2.2); P.stop = { f: band }; P.hatch[band] = P.x; break; }
    if (!P.seg || P.seg.n <= 0) { const st = STYLE[(NE.biomeAt(P.fy / FH * FH * NE.MPT) || {}).id] || STYLE.grotto;
      const w = [['run', 46], ['drop', 15], ['climb', 13], ['dip', 9 * st.dip], ['turn', 9], ['cham', 5 * st.cham]]; let tot = 0; for (const e of w) tot += e[1]; let k = R() * tot, kind = 'run'; for (const e of w) { k -= e[1]; if (k <= 0) { kind = e[0]; break; } }
      const r = 2.3 + R() * 1.2 + (st.wide ? 0.5 : 0);
      if (kind === 'run') P.seg = { kind, n: 8 + Math.floor(R() * 30), slope: -0.18 + R() * 0.65, r };
      else if (kind === 'drop') P.seg = { kind, n: 3 + Math.floor(R() * 5), r: 1.7 };
      else if (kind === 'climb') P.seg = { kind, n: 4 + Math.floor(R() * 5), r };
      else if (kind === 'dip') { const n = 12 + Math.floor(R() * 8); P.seg = { kind, n, n0: n, depth: 3 + Math.floor(R() * 2), r: 2.6, y0: P.fy }; P.pools.push(P.seg.pool = { x0: P.x, x1: P.x, lip: Math.round(P.fy) + 1, bot: Math.round(P.fy) }); }
      else if (kind === 'turn') { P.dir = -P.dir; P.seg = { kind: 'run', n: 4 + Math.floor(R() * 6), slope: 0.2, r }; }
      else { P.chambers.push({ x: P.x, y: Math.round(P.fy), rx: 6 + R() * 6, ry: 3.5 + R() * 2.5 }); P.seg = { kind: 'run', n: 6, slope: 0.1, r }; }
    }
    const S = P.seg; S.n--;
    if (P.x <= 7) P.dir = 1; if (P.x >= Wd - 8) P.dir = -1;
    switch (S.kind) {
      case 'run': P.x += P.dir; P.fy += S.slope; push(S.r); break;
      case 'drop': P.fy += 1; if (R() < 0.25) P.x += P.dir; push(S.r, { shaft: 1 }); break;
      case 'climb': P.x += P.dir; P.fy -= 0.55; push(S.r); break;
      case 'dip': { P.x += P.dir; const k = 1 - S.n / S.n0; const target = S.y0 + Math.sin(k * Math.PI) * S.depth; P.fy = target; S.pool.x0 = Math.min(S.pool.x0, P.x); S.pool.x1 = Math.max(S.pool.x1, P.x); S.pool.bot = Math.max(S.pool.bot, Math.round(P.fy)); push(S.r); if (S.n <= 0) S.pool.lip = Math.min(Math.round(S.y0), Math.round(P.fy)) + 1; break; }
    }
    P.x = clamp(P.x, 5, Wd - 6); if (P.fy < P.minY && S.kind !== 'drop') { P.fy = P.minY; const q = P.pts[P.pts.length - 1]; if (q) q.y = Math.round(P.fy); }
  }
};
W_.wormResume = function (x, y) { const P = this.worm(); P.stop = null; P.x = x; P.fy = y; P.minY = y + 3; P.seg = { kind: 'drop', n: 2, r: 1.7 }; };
const carveBand = function (W, fl) {
  const Wd = W.W, FH = NE.FH, y0 = fl.y0, B = fl.biome.id; const st = STYLE[B] || STYLE.grotto; const seed = (W.seed >>> 0) % 1000003;
  W.wormExtend(y0 + FH + 8); const P = W.worm();
  const inBand = r => r >= y0 && r < y0 + FH; const keep = new Set();
  // the POI (a set piece) gets a flat-floored hall on the path
  if (fl.poi) { const a = Math.max(3, Math.floor(fl.poi.x0 / T) - 1), b = Math.min(Wd - 4, Math.ceil(fl.poi.x1 / T) + 1); fl._poiHall = [a, b]; }
  const set = (x, r, t) => { if (x < 2 || x > Wd - 3 || !inBand(r) || keep.has(r * Wd + x)) return; W.set(x, r, t); };
  // 1) solid rock, then noise caverns
  for (let r = y0; r < y0 + FH; r++) for (let x = 0; x < Wd; x++) { if (keep.has(r * Wd + x)) continue; let t = 1; if (x >= 3 && x <= Wd - 4) { const n = fbm(x * st.sx, r * st.sy, seed + 11); if (n > st.thr) t = 0; } W.set(x, r, t); }
  const brush = (cx, cy, rr) => { const R2 = Math.ceil(rr); for (let dy = -R2; dy <= R2; dy++) for (let dx = -R2 - 1; dx <= R2 + 1; dx++) { if ((dx * dx) / ((rr + 0.6) * (rr + 0.6)) + (dy * dy) / (rr * rr) > 1) continue; set(Math.round(cx + dx), Math.round(cy + dy), 0); } };
  // 5) POI hall: flat floor where the path crosses (or comes closest to) it
  if (fl._poiHall) { const [a, b] = fl._poiHall; const mid = (a + b) / 2; let best = null, bd = 1e9; for (const q of P.pts) { if (!inBand(q.y) || q.y > y0 + FH - 2) continue; const d = Math.abs(q.x - mid) + (q.x >= a && q.x <= b ? 0 : 20); if (d < bd) { bd = d; best = q; } }
    const fyR = clamp(best ? best.y : y0 + FH - 4, y0 + 6, y0 + FH - 2); for (let x = a; x <= b; x++) { for (let r = fyR - 5; r < fyR; r++) set(x, r, 0); set(x, fyR, 1); set(x, fyR + 1, 1); }
    if (best && (best.x < a || best.x > b)) { const ex = best.x < a ? a : b; const n = Math.max(Math.abs(best.x - ex), Math.abs(best.y - fyR)); for (let i = 0; i <= n; i++) { const k = n ? i / n : 0; brush(lerp(ex, best.x, k), lerp(fyR, best.y, k) - 2.2, 2.2); } }
    fl._poiFloor = fyR; }
  // 2) the winding main path
  for (const q of P.pts) { if (q.y < y0 - 6 || q.y > y0 + FH + 6) continue; if (q.shaft) brush(q.x, q.y - 1, 1.6); else brush(q.x, q.y - q.r + 0.4, q.r); }
  for (const c of P.chambers) { if (c.y + c.ry < y0 - 2 || c.y - c.ry * 2 > y0 + FH + 2) continue; for (let dy = -Math.ceil(c.ry * 2); dy <= 0; dy++) for (let dx = -Math.ceil(c.rx); dx <= Math.ceil(c.rx); dx++) { if ((dx * dx) / (c.rx * c.rx) + ((dy + c.ry) * (dy + c.ry)) / (c.ry * c.ry) > 1) continue; set(c.x + dx, c.y - 1 + dy, 0); } }
  // 3) pools in the dips
  const LQ = B === 'hive' || B === 'heart' ? 11 : 5;
  const hall = fl._poiHall;
  for (const p of P.pools) { if (p.bot < y0 + 1 || p.lip < y0 + 1 || p.bot > y0 + FH - 2) continue; if (hall && p.x1 >= hall[0] - 6 && p.x0 <= hall[1] + 6) continue;
    const cells = [], seen = new Set(), st2 = []; const sx = Math.round((p.x0 + p.x1) / 2); let start = null; for (let r = p.bot; r >= p.lip; r--) if (W.get(sx, r) === 0) { start = [sx, r]; break; } if (!start) continue;
    st2.push(start); let bad = false;
    while (st2.length && !bad) { const [x, r] = st2.pop(); const k = r * Wd + x; if (seen.has(k)) continue; seen.add(k); if (r < p.lip || W.get(x, r) !== 0) continue; if (r >= y0 + FH - 1 || x <= 2 || x >= Wd - 3 || cells.length > 260) { bad = true; break; } cells.push([x, r]); st2.push([x + 1, r], [x - 1, r], [x, r + 1], [x, r - 1]); }
    if (bad || cells.length < 4) continue; for (const [x, r] of cells) W.set(x, r, LQ); fl._pools = (fl._pools || []).concat([[p.x0 - 2, p.x1 + 2]]); }
  // 4) side walls, ice floors, a little crystal
  for (let r = y0; r < y0 + FH; r++) { W.set(0, r, 1); W.set(1, r, 1); W.set(Wd - 1, r, 1); W.set(Wd - 2, r, 1); }
  if (st.ice) for (let r = y0; r < y0 + FH; r++) for (let x = 2; x < Wd - 2; x++) if (W.get(x, r) === 1 && W.get(x, r - 1) === 0 && h2(x, r, seed) < 0.45 && !keep.has(r * Wd + x)) W.set(x, r, 10);
};
// cells you can actually get to from the path (air, liquid, ladders, platforms)
const reachOf = function (W, fl) { const Wd = W.W, FH = NE.FH, y0 = fl.y0, P = W.worm(); const R = new Uint8Array(Wd * FH); const st = []; const pass = t => t === 0 || t === 2 || t === 3 || t === 5 || t === 11;
  for (const q of P.pts) if (q.y >= y0 && q.y < y0 + FH + 1) for (let d = 1; d <= 3; d++) { const r = q.y - d - y0; if (r >= 0 && r < FH && pass(W.get(q.x, y0 + r))) st.push(r * Wd + q.x); }
  if (fl._poiHall && fl._poiFloor) st.push((fl._poiFloor - 1 - y0) * Wd + Math.round((fl._poiHall[0] + fl._poiHall[1]) / 2));
  while (st.length) { const k = st.pop(); if (k < 0 || k >= R.length || R[k]) continue; const x = k % Wd, r = (k / Wd) | 0; if (!pass(W.get(x, y0 + r))) continue; R[k] = 1; if (x > 0) st.push(k - 1); if (x < Wd - 1) st.push(k + 1); if (r > 0) st.push(k - Wd); if (r < FH - 1) st.push(k + Wd); }
  fl._reach = R; return R; };
NE.reachOf = reachOf;
// recompute ground/ceiling profiles after carving: each column's "main" floor is the one nearest the path
const reprofile = function (W, fl) {
  const Wd = W.W, FH = NE.FH, y0 = fl.y0, P = W.worm(); const near = new Array(Wd).fill(null);
  for (const q of P.pts) if (q.y >= y0 && q.y < y0 + FH) near[q.x] = q.y - y0;
  let last = Math.floor(FH / 2); for (let x = 0; x < Wd; x++) { if (near[x] != null) last = near[x]; else near[x] = last; }
  for (let x = 0; x < Wd; x++) { let best = -1, bd = 1e9; for (let r = 1; r < FH + 3; r++) { const s = W.solid(W.get(x, y0 + r)) || W.get(x, y0 + r) === 2, a = W.get(x, y0 + r - 1) === 0; if (s && a) { const d = Math.abs(r - near[x]); if (d < bd) { bd = d; best = r; } } }
    if (best < 0) best = clamp(near[x], 2, FH - 1); fl.g[x] = best; let c = best - 1; while (c > -6 && W.get(x, y0 + c - 1) === 0) c--; fl.c[x] = c; }
};
// put every object back onto real ground (or ceiling) near where it was meant to be
const surfaceNear = (W, fl, tx, ry, ceil, head) => { const FH = NE.FH, y0 = fl.y0, R = fl._reach, Wd = W.W; head = head || 2;
  const reach = (x, r) => !R || (r - y0 >= 0 && r - y0 < FH && R[(r - y0) * Wd + x]);
  for (let dx = 0; dx <= 14; dx++) for (const sx of dx ? [tx + dx, tx - dx] : [tx]) { if (sx < 3 || sx > Wd - 4) continue; let best = null, bd = 1e9;
    for (let r = 0; r < FH + 1; r++) { const Rr = y0 + r; let ok;
      if (ceil) ok = W.solid(W.get(sx, Rr - 1)) && W.get(sx, Rr) === 0 && W.get(sx, Rr + 1) === 0 && reach(sx, Rr);
      else { ok = (W.solid(W.get(sx, Rr)) || W.get(sx, Rr) === 2) && reach(sx, Rr - 1); for (let k = 1; k <= head && ok; k++) if (W.get(sx, Rr - k) !== 0) ok = false; }
      if (!ok) continue; const d = Math.abs(r - ry); if (d < bd) { bd = d; best = Rr; } }
    if (best != null) return { x: sx, y: best }; } return null; };
NE.surfaceNear = surfaceNear;
const resnap = function (W, fl) {
  const y0 = fl.y0; const CEIL = { lamp: 1, icicle: 1 }; const H = fl._poiHall; const inHall = x => H && x >= H[0] && x <= H[1];
  const out = [];
  for (const o of fl.objs) { if (o.x == null || o.y == null) { out.push(o); continue; } const tx = Math.floor(o.x / T);
    if (inHall(tx) && fl._poiFloor && !(CEIL[o.type] || o.ceil)) { o.y = fl._poiFloor * T; out.push(o); continue; }
    const ceil = CEIL[o.type] || (o.type === 'crystal' && o.ceil); const ry = Math.round(o.y / T) - y0; const big = o.type === 'medtent' || o.type === 'quarter' || o.type === 'bed' ? 4 : 2; const s = surfaceNear(W, fl, tx, ceil ? ry : fl.g[clamp(tx, 0, W.W - 1)], ceil, big); if (!s) continue;
    o.x = s.x * T + (o.x - tx * T); o.y = ceil ? s.y * T + 1 : s.y * T; out.push(o); }
  fl.objs = out;
  fl.spawns = fl.spawns.filter(sp => { const tx = Math.floor(sp.x / T); if (inHall(tx) && fl._poiFloor) { sp.y = fl._poiFloor * T; return true; } const s = surfaceNear(W, fl, tx, fl.g[clamp(tx, 0, W.W - 1)], false, 3); if (!s) return false; sp.x = s.x * T + 4; sp.y = s.y * T; return true; });
  fl.decor = fl.decor.filter(d => { const tx = Math.floor(d.x / T); if (inHall(tx) && fl._poiFloor && !(d.k === 'stal' || d.k === 'vine' || d.k === 'roots' || d.k === 'chain' || d.k === 'web')) { d.y = fl._poiFloor * T; return true; }
    if (d.k === 'stal' || d.k === 'vine' || d.k === 'roots' || d.k === 'chain' || d.k === 'web') { const s = surfaceNear(W, fl, tx, fl.c[clamp(tx, 0, W.W - 1)], true); if (!s) return false; d.y = s.y * T; return true; } const s = surfaceNear(W, fl, tx, fl.g[clamp(tx, 0, W.W - 1)], false); if (!s) return false; d.x = s.x * T + (d.x % T); d.y = s.y * T; return true; });
};
const regLiquids = function (W, fl) { const LIQ = { 5: 1, 9: 1, 11: 1 }; if (!W.liq) return; const y0 = fl.y0, FH = NE.FH, Wd = W.W;
  for (let r = y0; r < y0 + FH; r++) for (let x = 0; x < Wd; x++) { const k = r * Wd + x; const t = W.get(x, r); if (LIQ[t]) { W.liq.set(k, { a: 1, t }); W.liqGen.set(k, t); } else { W.liq.delete(k); W.liqGen.delete(k); } } };
const genFloorD = W_.genFloor;
W_.genFloor = function (f) {
  const fl = genFloorD.call(this, f); if (this.lobby || !fl) return fl;
  if (f === 0) { this.worm(); return fl; }
  if (fl.town) { const P = this.worm(); const pn = this.pitNext && this.pitNext[0]; const xe = pn ? Math.round((pn[0] + pn[1]) / 2) : Math.floor(this.W / 2); this.wormResume(xe, fl.y0 + NE.FH); return fl; }
  carveBand(this, fl); reachOf(this, fl); reprofile(this, fl); resnap(this, fl); regLiquids(this, fl);
  fl.feetY = (fl.y0 + fl.g[20]) * T; fl.delve = true;
  return fl;
};
// the town hatch goes where the path arrives
NE.townHatchX = function (W, f) { const P = W.worm && W.worm(); return P && P.hatch[f] != null ? P.hatch[f] : null; };

// =====================================================================================================================
// FOG OF WAR: you only see what's in your line of sight; far or hidden places stay dark (remembered ground stays dim).
// Your lantern (and other light you can see) pushes the fog back.
// =====================================================================================================================
const FOG = { cv: null, t: 0, cols: 0, rows: 0, data: null, ox: 0, oy: 0 };
const losClear = (W, x0, y0, x1, y1) => { const dx = x1 - x0, dy = y1 - y0; const n = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / (T * 0.5)); for (let i = 1; i < n; i++) { const x = x0 + dx * i / n, y = y0 + dy * i / n; const t = W.get(Math.floor(x / T), Math.floor(y / T)); if (W.solid(t)) return false; } return true; };
NE.fogUpdate = function (cx, cy) {
  const g = G, W = g.world, p = g.player; if (!W || W.lobby || g.state === 'lobby') return null;
  const cols = Math.ceil(NE.VW / T) + 3, rows = Math.ceil(NE.VH / T) + 3; const tx0 = Math.floor(cx / T) - 1, ty0 = Math.floor(cy / T) - 1;
  if (!FOG.cv || FOG.cols !== cols || FOG.rows !== rows) { FOG.cv = document.createElement('canvas'); FOG.cv.width = cols; FOG.cv.height = rows; FOG.cols = cols; FOG.rows = rows; FOG.img = FOG.cv.getContext('2d').createImageData(cols, rows); }
  const eyes = []; const lamp = (p.light && p.light.on && p.light.bat > 0) ? 1 : 0; const st = p.stats || {};
  if (p.alive) eyes.push({ x: p.x, y: p.y - p.h + 4, r: (7 + lamp * 7 * (st.lamp || 1)) * (st.sight || 1) * T });
  else if (g.goop) eyes.push({ x: g.goop.x, y: g.goop.y - 4, r: 10 * T }); else eyes.push({ x: p.x, y: p.y - 10, r: 8 * T });
  const q = g.net && g.net.on && g.net.peer; if (q && q.alive && !q.hidden) eyes.push({ x: q.x, y: q.y - 18, r: (q.lightOn ? 13 : 7) * T });
  const lights = (g.lights || []).filter(l => !l.player && l.r > 20);
  const D = FOG.img.data; const A = FOG.a = (FOG.a && FOG.a.length === cols * rows) ? FOG.a : new Float32Array(cols * rows); const near = FOG.n = (FOG.n && FOG.n.length === cols * rows) ? FOG.n : new Uint8Array(cols * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const tx = tx0 + i, ty = ty0 + j; const px = tx * T + 4, py = ty * T + 4; let a = 1, nr = 0;
    for (const e of eyes) { const d = Math.hypot(px - e.x, py - e.y); if (d < e.r * 1.25) nr = 1; let lit = d < e.r ? 1 - Math.max(0, (d - e.r * 0.7) / (e.r * 0.3)) : 0;
      if (lit < 1) for (const l of lights) { const dl = Math.hypot(px - l.x, py - l.y); if (dl < l.r * 0.85) lit = Math.max(lit, 0.85 * (1 - dl / (l.r * 0.85))); }
      if (lit <= 0 || d > 30 * T) continue; if (!losClear(W, e.x, e.y, px, py)) continue; a = Math.min(a, 1 - lit); }
    A[j * cols + i] = a; near[j * cols + i] = nr; }
  const mt = g.t || 0;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const k = j * cols + i; const tx = tx0 + i, ty = ty0 + j; let a = A[k];
    // the face of a wall you can see is visible too; solid rock near you shows as a dim silhouette
    if (a > 0.3 && W.solid(W.get(tx, ty))) { let m = 1; if (i > 0) m = Math.min(m, A[k - 1]); if (i < cols - 1) m = Math.min(m, A[k + 1]); if (j > 0) m = Math.min(m, A[k - cols]); if (j < rows - 1) m = Math.min(m, A[k + cols]); a = Math.min(a, m + 0.12); if (near[k]) a = Math.min(a, 0.62); }
    const fl = W.floors[Math.floor(ty / NE.FH)]; let mem = 0; if (fl && fl.seen) { const r = ty - fl.y0; if (r >= 0 && r < NE.FH && tx >= 0 && tx < W.W) { if (a < 0.55) fl.seen[r * W.W + tx] = 1; mem = fl.seen[r * W.W + tx]; } }
    const fog = mem ? Math.min(a, 0.55) : Math.min(a, 0.8); // fog only creeps in around the screen edges and corners; the middle of the view stays clear
    const nx = (i + 0.5) / cols * 2 - 1, ny = (j + 0.5) / rows * 2 - 1, ed = clamp((Math.hypot(nx * 0.95, ny * 1.05) - 0.62) / 0.55, 0, 1), edge = ed * ed * (3 - 2 * ed);
    const v = Math.round(clamp(fog * 0.6 * edge, 0, 1) * 255);
    // grey drifting mist rather than a black void
    const mist = 0.82 + 0.18 * Math.sin(tx * 0.31 + mt * 0.35) * Math.sin(ty * 0.47 - mt * 0.22 + tx * 0.07); const q = k * 4; D[q] = 66 * mist | 0; D[q + 1] = 70 * mist | 0; D[q + 2] = 76 * mist | 0; D[q + 3] = v; }
  FOG.cv.getContext('2d').putImageData(FOG.img, 0, 0); FOG.ox = tx0 * T - cx; FOG.oy = ty0 * T - cy; return FOG.cv;
};
const dlF = G.drawLighting;
G.drawLighting = function (cx, cy, fl) { dlF.apply(this, arguments); if (G.world && !G.world.lobby && G.state !== 'lobby' && G.meta.settings.fog !== false) { FOG.t -= 1 / 60; if (FOG.t <= 0 || !FOG.cv) { FOG.t = 1 / 20; NE.fogUpdate(cx, cy); FOG.cx = cx; FOG.cy = cy; } if (FOG.cv) { const ctx = G.ctx; ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(FOG.cv, FOG.ox - (cx - FOG.cx), FOG.oy - (cy - FOG.cy), FOG.cols * T, FOG.rows * T); ctx.restore(); ctx.imageSmoothingEnabled = false; } } };
// the old "reveal everything around you" map marking is replaced by what you actually see
G.markSeen = function () {};

// =====================================================================================================================
// EVENTS: much rarer (every 4–8 minutes instead of every 1–2), supply drops rarer still
// =====================================================================================================================
const evF = G.events; G.events = function (dt) { const before = G.eventT; evF.apply(this, arguments); if (G.eventT > before + 1) G.eventT = rf(240, 480); };
const srF = G.startRun; G.startRun = function () { const r = srF.apply(this, arguments); G.eventT = rf(180, 300); return r; };
if (NE.EVENTS && NE.EVENTS.supplydrop) NE.EVENTS.supplydrop.w = 0.45;

// =====================================================================================================================
// LODGED FRAGMENTS: far less often, and you can try to pull one out with your bare fingers (low odds, hurts, dirty)
// =====================================================================================================================
const dmgF = NE.Anatomy.prototype.damage;
NE.Anatomy.prototype.damage = function (part, amt, kind) { const P = this.parts[part]; const n0 = P ? P.wounds.length : 0; const r = dmgF.apply(this, arguments); if (P && (kind === 'bullet' || kind === 'frag')) for (let i = n0; i < P.wounds.length; i++) { const w = P.wounds[i]; if (w.bullet && !chance(kind === 'bullet' ? 0.4 : 0.35)) w.bullet = false; } return r; };
NE.HAND_DIG = 0.3;
const stF = NE.startTreat; NE.startTreat = function (pl, entry, part, op) { if (op !== 'handdig') return stF.apply(this, arguments); if (pl.anat.uncon) return; const P = pl.anat.parts[part]; if (!P.wounds.some(w => w.bullet)) return pl.g.toast('Nothing lodged here.'); if (pl.anat.armFactor() < 0.2) return pl.g.toast('You need a working hand for that.');
  pl.treating = { entry: null, part, op: 'handdig', t: 0, dur: 7 * pl.stats.treat / Math.sqrt(Math.max(0.3, pl.anat.armFactor())) }; NE.Audio.play('gasp', 0.6); pl.g.say(pick(['Okay... okay. Fingers in.', 'Hold still. Hold still.', 'This is going to hurt.']), 0.8); };
const apF = NE.applyTreatment; NE.applyTreatment = function (pl, entry, part, op) { if (op !== 'handdig') return apF.apply(this, arguments); const A = pl.anat, P = A.parts[part], g = pl.g; const w = P.wounds.find(x => x.bullet); if (!w) return;
  A.painSpike += 60; w.dirty = Math.min(1, w.dirty + 0.45); if (!pl.stats.coldblood && A.pain + 60 > A.threshold + 30 && chance(0.6)) { A.cons -= 50; g.say('Everything goes white—', 1); }
  if (chance(NE.HAND_DIG * (pl.abil && pl.abil.includes('longarms') ? 1.2 : 1))) { for (const w2 of P.wounds) if (w2.bullet) { w2.bullet = false; w2.bleed += 0.8; } g.toast('You work the fragment out with your fingers. It bleeds — clean and dress it.'); } else { w.bleed += 0.7; g.toast('It slips away from your fingers. Still in there.'); }
  NE.Audio.play('pain'); };
// the Health panel offers it whenever a fragment is lodged
const hiF = NE.UI.healthInfo;
if (hiF) NE.UI.healthInfo = function () { const r = hiF.apply(this, arguments); try { const p = G.player; const el = document.querySelector('.hl-info'); if (!el || !p) return r; const part = NE.UI.hpart; const P = part && p.anat.parts[part]; if (!P || !P.wounds.some(w => w.bullet) || el.querySelector('[data-handdig]')) return r;
  const box = document.createElement('div'); box.innerHTML = '<h4>PULL IT OUT BY HAND <small class="dim">no tools — ' + Math.round(NE.HAND_DIG * 100) + '% chance, very painful, dirty</small></h4><div class="treats"><button class="tr" data-handdig="1"><span>Bare fingers<small>' + Math.round(NE.HAND_DIG * 100) + '% chance • ~7s</small></span></button></div>';
  el.appendChild(box); box.querySelector('[data-handdig]').onclick = () => { NE.startTreat(p, null, part, 'handdig'); setTimeout(NE.UI.healthInfo, 50); }; } catch (e) { } return r; };

// =====================================================================================================================
// KICKS: a 'weapon' slot between Fists and your weapons (scroll to it). LMB on the ground: front kick, in the air: drop kick.
// =====================================================================================================================
const AU = NE.Audio; const playK = AU.play;
AU.play = function (name, vol) { vol = vol == null ? 1 : vol; try {
  if (name === 'kick') { AU.noise(0.09, 900, 1.2, 0.18 * vol, 'bandpass'); AU.tone(180, 0.06, 0.05 * vol, 'triangle', 120); return; }
  if (name === 'kickhit') { AU.noise(0.16, 160, 0.8, 0.6 * vol, 'lowpass'); AU.tone(90, 0.12, 0.28 * vol, 'sine', 45); AU.noise(0.05, 2400, 1, 0.08 * vol, 'highpass'); return; }
  if (name === 'dropkick') { AU.noise(0.32, 700, 0.6, 0.22 * vol, 'bandpass'); AU.tone(260, 0.22, 0.07 * vol, 'sawtooth', 140); return; }
  if (name === 'dropkickhit') { AU.noise(0.28, 110, 0.7, 0.85 * vol, 'lowpass'); AU.tone(70, 0.22, 0.4 * vol, 'sine', 35); AU.noise(0.08, 3000, 1, 0.12 * vol, 'highpass'); return; }
  if (name === 'gunbash') { AU.noise(0.1, 1400, 1.5, 0.22 * vol, 'bandpass'); AU.tone(420, 0.05, 0.08 * vol, 'square', 300); return; }
} catch (e) { } return playK.apply(this, arguments); };
const okHit = (me, t) => t !== me && t.alive && !t.town && !t.isRemote && !(t.faction === 'neutral' && !t.hostile && !t.D) && t.anat;
NE.Player.prototype.kick = function () {
  const g = this.g, A = this.anat; if ((this.kickCD || 0) > g.t || this.rd || A.uncon || this.climbing || this.hang || this.treating || this.search || this.impaled) return;
  if (A.legFactor().f < 0.4) return g.toast('Your legs can\'t manage a kick.'); if (A.stam < 8) return g.say('Too tired...', 1);
  if (!this.onGround && !this.climbing && !this.crawl && A.stam >= 14) { // drop kick
    A.stam -= 14; this.kickCD = g.t + 1.6; this.dkT = 0.5; this.dkHit = false; this.dkDir = this.facing; this.vx = this.facing * 235; this.vy = Math.max(Math.min(this.vy, -40), -120); AU.play('dropkick'); g.say(pick(['HYAAH!', 'Get—', 'Hup!']), 0.5); return; }
  if (this.crawl) return; A.stam -= 8; this.kickCD = g.t + 0.85; this.fkT = 0.32; this.fkDir = this.facing; AU.play('kick');
  setTimeout(() => { if (!this.alive) return; let best = null, bd = 19; for (const t of g.actors) { if (!okHit(this, t)) continue; const dx = (t.x - this.x) * this.facing; if (dx < -2 || dx > bd || Math.abs(t.y - this.y) > 18) continue; bd = dx; best = t; }
    if (!best) return; const m = (this.stats.melee || 1) * (NE.styleMul ? Math.max(1, NE.styleMul(this, { id: 'fists' }) * 0.6) : 1); best.hurt(pick(['torso', 'torso', 'lleg', 'rleg']), 10 * m, 'blunt', this.surv.first, { x: this.facing, y: -0.2 });
    best.vx += this.facing * 240; best.vy -= 60; best.stagger = Math.max(best.stagger || 0, 0.8); if (best.charge) best.charge = null; best.windT = 0; AU.play('kickhit'); g.shake(1.8); g.noise(this.x, this.y, 70); if (best.onAggro) best.onAggro(this); }, 120);
};
const puK = NE.Player.prototype.update;
NE.Player.prototype.update = function (dt, input) { if (this.fkT > 0) { this.fkT -= dt; this.facing = this.fkDir || this.facing; }
  if (this.dkT > 0) { this.dkT -= dt; this.facing = this.dkDir || this.facing; this.vx = this.facing * Math.max(150, Math.abs(this.vx)); const g = this.g;
    if (!this.dkHit) for (const t of g.actors) { if (!okHit(this, t)) continue; const dx = (t.x - this.x) * this.facing; if (dx < -4 || dx > 15 || this.y < t.y - (t.h || 14) - 6 || this.y - 12 > t.y + 2) continue;
      this.dkHit = true; const m = this.stats.melee || 1; t.hurt('torso', 17 * m, 'blunt', this.surv.first, { x: this.facing, y: -0.3 }); if (t.knockdown) t.knockdown(this.facing * 260, -90, 1.1); else { t.vx += this.facing * 320; t.vy -= 90; } t.stagger = Math.max(t.stagger || 0, 1.2); t.windT = 0; if (t.charge) t.charge = null;
      AU.play('dropkickhit'); g.shake(4); g.slowmo = Math.max(g.slowmo || 0, 0.12); g.noise(this.x, this.y, 110); this.vx = -this.facing * 60; this.dkT = Math.min(this.dkT, 0.12); if (t.onAggro) t.onAggro(this); break; }
    if (this.dkT <= 0 || this.onGround) { this.dkT = 0; if (!this.onGround || this.dkHit) this.knockdown(0, -10, this.dkHit ? 0.45 : 0.7); } }
  const r = puK.apply(this, arguments); if (this.dkT > 0 && this.dkDir) this.facing = this.dkDir; else if (this.fkT > 0 && this.fkDir) this.facing = this.fkDir; return r; };
// poses
const poseK = NE.ragPose;
NE.ragPose = function (a) { const out = poseK(a); const f = a.facing || 1;
  if (a.fkT > 0 && !a.crawl) { const k = Math.sin(Math.PI * Math.min(1, 1 - a.fkT / 0.32)); const hip = out[2]; out[9] = [hip[0] + f * (2 + 5 * k), hip[1] + 2 - 3 * k]; out[10] = [hip[0] + f * (3 + 9 * k), hip[1] + 6 - 7 * k]; out[0] = [out[0][0] - f * k * 1.5, out[0][1] + k * 0.5]; out[1] = [out[1][0] - f * k, out[1][1]]; out[5] = [out[1][0] - f * 3, out[1][1] + 3]; out[6] = [out[1][0] - f * 5, out[1][1] + 5]; }
  if (a.dkT > 0) { const x = a.x, y = a.y - 9; out[0] = [x - f * 9, y - 2]; out[1] = [x - f * 6, y - 1]; out[2] = [x, y + 1]; out[3] = [x - f * 6, y + 3]; out[4] = [x - f * 9, y + 4]; out[5] = [x - f * 4, y - 4]; out[6] = [x - f * 7, y - 6]; out[7] = [x + f * 4, y]; out[8] = [x + f * 9, y - 1]; out[9] = [x + f * 4, y + 2]; out[10] = [x + f * 9, y + 1]; }
  if (a._bashT > 0) { const k = Math.min(1, a._bashT / 0.3); const sh = out[1]; out[5] = [sh[0] + a.facing * (2 + 4 * (1 - k)), sh[1] - 3 + 4 * (1 - k)]; out[6] = [sh[0] + a.facing * (4 + 6 * (1 - k)), sh[1] - 6 + 7 * (1 - k)]; }
  return out; };

// =====================================================================================================================
// GUNS AS CLUBS: an empty gun swings harder and further; armed enemies you get up close to now bash you with their gun
// =====================================================================================================================
const gbF = NE.Player.prototype.gunButt;
NE.Player.prototype.gunButt = function (w) { if (this.cd > 0) return; const g = this.g, A = this.anat; this.cd = w.twoHand ? 0.65 : 0.45; this.swingDur = this.swingT = 0.3; A.stam -= 5; this._bashT = 0.3; AU.play('gunbash', 0.8);
  if (!this.inv.count(w.gun.ammo) && !this._dryTold) { this._dryTold = 1; g.toast('No ammo left — your ' + w.name.toLowerCase() + ' is a club now.'); }
  let best = null, bd = 1e9; for (const a of g.actors) { if (!okHit(this, a)) continue; const dx = a.x - this.x; if (dx * this.facing < -3 || Math.abs(dx) > 22 + (w.twoHand ? 5 : 0) || Math.abs(a.y - this.y) > 20) continue; if (Math.abs(dx) < bd) { bd = Math.abs(dx); best = a; } }
  if (!best) return; const part = Math.hypot(g.mouse.wx - best.x, g.mouse.wy - best.cy) < 26 ? best.partNear(g.mouse.wx, g.mouse.wy) : 'torso';
  const dmg = (w.twoHand ? 20 : 15) * 1.2 * this.stats.melee * A.armFactor(); best.hurt(part, dmg, 'blunt', this.surv.first, { x: this.facing, y: -0.2 }); best.lastBy = this;
  best.vx += this.facing * 130; best.stagger = Math.max(best.stagger || 0, 0.6); best.windT = 0; NE.Audio.play('hit', 1); g.shake(2); if (best.onAggro) best.onAggro(this); };
const puB = NE.Player.prototype.update; NE.Player.prototype.update = function (dt) { if (this._bashT > 0) this._bashT -= dt; if (this.equip.weapon && this.equip.weapon.mag) this._dryTold = 0; return puB.apply(this, arguments); };
const euB = NE.Enemy.prototype.update;
NE.Enemy.prototype.update = function (dt) { const r = euB.apply(this, arguments); if (!this.alive) return r; if (this._bashT > 0) this._bashT -= dt;
  const t = this.target; const isGun = this.weapon && NE.ITEMS[this.weapon] && NE.ITEMS[this.weapon].gun; if (!isGun || !t || !t.alive || this.rd || (this.anat && this.anat.uncon) || this.frozenT > 0 || this.calmed) return r;
  const dx = t.x - this.x, d = Math.abs(dx); if (d > 22 || Math.abs(t.y - this.y) > 20) { this._bw = 0; return r; }
  this.facing = dx >= 0 ? 1 : -1; if (this.state === 'aim') this.state = 'chase';
  if (!this._bw) { if ((this._bashCD || 0) > G.t) return r; this._bw = G.t + 0.32; this._bashT = 0.32; NE.Audio.play('swing', 0.5); return r; }
  if (G.t >= this._bw) { this._bw = 0; this._bashCD = G.t + rf(0.9, 1.3); const two = NE.ITEMS[this.weapon].twoHand; if (d <= 22 && Math.abs(t.y - this.y) <= 20 && !(t.dashIF > 0)) {
      const blocked = t.guard && t.facing === -this.facing; const dmg = (two ? 15 : 11) * (NE.ENEMY_DMG || 1.2) * (blocked ? 0.25 : 1); t.hurt(chance(0.3) ? 'head' : 'torso', dmg, 'blunt', this.D ? this.D.name : 'Raider', { x: this.facing, y: -0.2 }); t.vx += this.facing * (blocked ? 40 : 120); if (!blocked && t.isPlayer) t.stagger = Math.max(t.stagger || 0, 0.35); NE.Audio.play(blocked ? 'block' : 'hit', 0.9); G.shake && G.shake(1.5); if (t.isPlayer) G.say && chance(0.3) && G.npcSay && G.npcSay(this, pick(['Back off!', 'Too close!', 'Eat this!']), 1.5); }
    this.vx -= this.facing * 40; }
  return r; };
const pmK = NE.Actor.prototype.physicsMove; NE.Actor.prototype.physicsMove = function (dt, c) { if (this.isPlayer && this.dkT > 0) { const v = this.vx; const d = this.dkDir || this.facing; this.facing = d; const r = pmK.call(this, dt, Object.assign({}, c, { mx: d, jump: false })); if (!this.dkHit && !this.onGround) this.vx = d * Math.max(150, Math.abs(v) * 0.985); return r; } if (this.isPlayer && this.fkT > 0) c = Object.assign({}, c, { mx: 0 }); return pmK.call(this, dt, c); };

// ---- Kicks as a weapon slot: Fists -> Kicks -> weapons, cycled with the scroll wheel like any weapon
const KICKS = NE.KICKS = { id: 'fists', name: 'Kicks', kicks: true, melee: { dmg: 10, kind: 'blunt', reach: 19, stam: 8, cd: 0.85 } };
const wdK = NE.Player.prototype.weaponDef; NE.Player.prototype.weaponDef = function () { if (!this.equip.weapon && this.kickMode && !this.stats.mand) return KICKS; return wdK.apply(this, arguments); };
const atK = NE.Player.prototype.attack; NE.Player.prototype.attack = function () { if (!this.equip.weapon && this.kickMode && !this.armless()) { this.charge = null; return this.kick(); } return atK.apply(this, arguments); };
const upKM = NE.Player.prototype.update; NE.Player.prototype.update = function () { if (this.equip && this.equip.weapon) this.kickMode = false; return upKM.apply(this, arguments); };
G.cycleWeapon = function (dir) { dir = dir || 1; const p = G.player; const ws = p.inv.items.filter(e => NE.ITEMS[e.id].cat === 'weapon'); const all = [null, 'KICKS', ...ws];
  const cur = p.equip.weapon ? all.indexOf(p.equip.weapon) : p.kickMode ? 1 : 0; const i = ((Math.max(0, cur) + dir) % all.length + all.length) % all.length;
  p.equip.weapon = all[i] === 'KICKS' ? null : all[i]; p.kickMode = all[i] === 'KICKS'; p.charge = null; NE.UI.weaponFlash(all, i); NE.Audio.play('click', 0.7); };
NE.UI.weaponFlash = function (all, i) { const el = document.querySelector('#wsel'); if (!el) return; const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const img = (k, sc) => '<img class="pix" src="' + NE.iconURL(k, null, sc) + '">';
  el.innerHTML = all.map((e, k) => { const kk = e === 'KICKS'; const icon = kk ? img('boot', 3) : e ? '<img class="pix" src="' + NE.itemIconURL(e.id, 3) + '">' : img('fist', 3); const nm = kk ? 'Kicks' : e ? NE.ITEMS[e.id].name : 'Fists'; return '<div class="ws' + (k === i ? ' on' : '') + '">' + icon + (k === i ? '<b>' + esc(nm) + '</b>' : '') + '</div>'; }).join('');
  el.classList.remove('hide'); clearTimeout(NE.UI._wsT); NE.UI._wsT = setTimeout(() => el.classList.add('hide'), 1100); };
})(window.NE);
