// Nectar's End — procedural endless CAVE descent: organic bands, ropes, pits, stalactites, five cave biomes
(function (NE) {
'use strict';
const G_t = () => (NE.G && NE.G.t) || performance.now() / 1000;
const { ri, rf, pick, chance, clamp } = NE; const T = NE.T;
const TL = NE.TL = { AIR: 0, SOLID: 1, PLAT: 2, LADDER: 3, SHARDS: 4, WATER: 5, CRUMBLE: 6, VENT: 7, METAL: 8, LAVA: 9, ICE: 10 };
NE.depthOfY = y => Math.max(0, (y - 10 * T) / T * NE.MPT);
NE.isTownFloor = f => { if (f < 2) return false; const d = f * NE.FH * NE.MPT, dp = (f - 1) * NE.FH * NE.MPT; return Math.floor(d / 250) > Math.floor(dp / 250); };
NE.isExtFloor = NE.isTownFloor;
NE.LOBBY_PAL = { bg: '#0f0c0a', back: '#1d1813', back2: '#251f19', tile: '#4a3d32', tile2: '#3a3028', edge: '#7a6a50', top: '#5a6a30', plat: '#6a5038', ladder: '#9a7a48', lamp: '#ffc070' };

// smooth 1D value noise from a few sines (random phases per band)
function noise1(seedA) { const p = [rf(0, 6.28), rf(0, 6.28), rf(0, 6.28)], f = [rf(0.05, 0.09), rf(0.13, 0.2), rf(0.3, 0.45)]; return x => (Math.sin(x * f[0] + p[0]) * 0.55 + Math.sin(x * f[1] + p[1]) * 0.3 + Math.sin(x * f[2] + p[2]) * 0.15); }

class World {
  constructor(opts) { opts = opts || {}; this.W = opts.W || NE.WW; this.rows = []; this.floors = []; this.ladNext = []; this.pitNext = []; this.lobby = !!opts.lobby; this.crumble = new Map(); this.tex = {}; this.seed = opts.seed != null ? opts.seed : (Math.random() * 1e9) | 0; this.mods = new Map(); this.thp = new Map(); this.onMod = null; }
  get(x, y) { if (x < 0 || x >= this.W || y < 0) return 1; const r = this.rows[y]; return r ? r[x] : 1; }
  set(x, y, v) { const r = this.rows[y]; if (r && x >= 0 && x < this.W) r[x] = v; }
  solid(t) { return t === 1 || t === 6 || t === 7 || t === 8 || t === 10; }
  solidAt(px, py) { return this.solid(this.get(Math.floor(px / T), Math.floor(py / T))); }
  platformish(x, y) { const t = this.get(x, y); if (t === 2) return true; if (t === 3) { const u = this.get(x, y - 1); return u !== 3 && !this.solid(u); } return false; }
  isWater(px, py) { const t = this.get(Math.floor(px / T), Math.floor(py / T)); return t === 5 || t === 9; }
  isLava(px, py) { return this.get(Math.floor(px / T), Math.floor(py / T)) === 9; }
  floorOf(ty) { if (this.lobby) return this.floors[0]; return this.floors[Math.floor(ty / NE.FH)] || this.floors[this.floors.length - 1]; }
  biomeAtY(py) { const f = this.floorOf(Math.floor(py / T)); return f ? f.biome : NE.BIOMES[0]; }
  los(x0, y0, x1, y1) { const d = Math.hypot(x1 - x0, y1 - y0); const n = Math.ceil(d / 3); for (let i = 1; i < n; i++) { const t = i / n; if (this.solidAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false; } return true; }
  ray(x, y, dx, dy, max) { for (let d = 0; d < max; d += 2) if (this.solidAt(x + dx * d, y + dy * d)) return d; return max; }
  // first solid surface at/under column (px) within a band
  groundY(fl, px) { const tx = clamp(Math.floor(px / T), 0, this.W - 1); return (fl.y0 + fl.g[tx]) * T; }
  ceilY(fl, px) { const tx = clamp(Math.floor(px / T), 0, this.W - 1); return (fl.y0 + fl.c[tx]) * T; }

  static lobbyWorld() { return NE.withSeed(777, () => World._lobby()); }
  static _lobby() {
    const w = new World({ W: 58, lobby: true, seed: 777 }); const H = 17; const nz = noise1();
    for (let r = 0; r < H; r++) { const a = new Uint8Array(w.W); w.rows.push(a); }
    const g = [], c = [];
    for (let x = 0; x < w.W; x++) { g[x] = 13; c[x] = clamp(3 + Math.round(nz(x) * 1.4), 2, 4); if (x < 2 || x >= w.W - 2) c[x] = 13; for (let r = 0; r < H; r++) w.rows[r][x] = (r < c[x] || r >= g[x]) ? 1 : 0; }
    for (let x = 0; x < 3; x++) for (let r = 7; r < 13; r++) w.rows[r][x] = 0; // the cave mouth you came in through
    for (let x = 49; x <= 55; x++) for (let r = 0; r < 13; r++) w.rows[r][x] = (x === 49 || x === 55) ? (r < 9 ? 8 : 0) : 0; // lift shaft up to the surface
    for (let x = 49; x <= 55; x++) c[x] = 0;
    const fy = 13 * T;
    const fl = { f: 0, y0: 0, depth: 0, g, c, biome: { id: 'lobby', name: 'Base Camp', pal: NE.LOBBY_PAL, dark: 0.55, decor: [] }, objs: [], spawns: [], decor: [], seen: null, feetY: fy };
    fl.objs.push({ type: 'terminal', x: 12 * T, y: fy, label: 'Survey Table — Skills', act: 'skills' });
    fl.objs.push({ type: 'caveexit', x: 2 * T, y: fy, label: 'Cave mouth — the way you came in', act: 'caveexit' });
    fl.objs.push({ type: 'locker', x: 20 * T, y: fy, label: 'Gear Rack & Backpacks', act: 'wardrobe' });
    fl.objs.push({ type: 'quarter', x: 29 * T, y: fy, label: 'Quartermaster', act: 'shop' });
    fl.objs.push({ type: 'dossier', x: 38 * T, y: fy, label: 'Diver Dossier', act: 'dossier' });
    fl.objs.push({ type: 'fire', x: 44 * T, y: fy, label: 'Campfire' });
    fl.objs.push({ type: 'elevator', kind: 'descent', x: 52 * T, y: fy, label: 'Descent Winch Lift', act: 'descend' });
    for (const lx of [8, 18, 28, 37]) fl.objs.push({ type: 'lamp', x: lx * T + 4, y: c[lx] * T + 1, on: true, col: '#ffc070', flick: chance(0.4) ? rf(0.2, 0.6) : 0 });
    fl.decor = [{ k: 'crates', x: 33 * T, y: fy }, { k: 'desk', x: 14 * T, y: fy }, { k: 'plant', x: 17 * T + 4, y: fy }, { k: 'fridge', x: 23 * T, y: fy }, { k: 'shelf', x: 25 * T, y: fy }, { k: 'genset', x: 34 * T + 4, y: fy }, { k: 'plant', x: 41 * T, y: fy }, { k: 'neon', x: 26 * T, y: fy }, { k: 'roots', x: 24 * T, y: 4 * T }, { k: 'roots', x: 15 * T, y: 4 * T }];
    w.floors.push(fl); return w;
  }
  ensure(f, cb) { while (this.floors.length <= f) { const n = this.floors.length; const fl = NE.withSeed((this.seed + n * 7919) >>> 0, () => this.genFloor(n)); this.applyMods(fl); if (cb) cb(fl); } }
  // ---- destructible terrain
  key(x, y) { return x + ',' + y; }
  diggable(x, y) { if (this.lobby || x < 1 || x >= this.W - 1 || y < 1) return false; const t = this.get(x, y); return t === 1 || t === 6 || t === 10 || t === 7 || t === 4 || t === 2 || t === 8; }
  tileHP(t) { return { 1: 7, 6: 2, 10: 5, 7: 10, 4: 1, 2: 3, 8: 16 }[t] || 7; }
  setMod(x, y, v, quiet) { this.set(x, y, v); this.mods.set(this.key(x, y), v); this.thp.delete(this.key(x, y)); if (this.onMod && !quiet) this.onMod(x, y, v); }
  damageTile(x, y, amt) { if (!this.diggable(x, y)) return false; const k = this.key(x, y); const t = this.get(x, y); const d = (this.thp.get(k) || 0) + amt; if (d >= this.tileHP(t)) { this.setMod(x, y, 0); return 'broke'; } this.thp.set(k, d); return 'hit'; }
  applyMods(fl) { const y0 = fl.y0, y1 = fl.y0 + NE.FH; for (const [k, v] of this.mods) { const i = k.indexOf(','); const y = +k.slice(i + 1); if (y >= y0 && y < y1) this.set(+k.slice(0, i), y, v); } }

  genFloor(f) {
    const W = this.W, FH = NE.FH, y0 = f * FH, depth = f * FH * NE.MPT, biome = NE.biomeAt(depth), B = biome.id;
    const rows = []; for (let r = 0; r < FH; r++) rows.push(new Uint8Array(W).fill(1));
    const nG = noise1(), nC = noise1(), nW = noise1();
    const g = new Array(W), c = new Array(W);
    const chamber = rf(0.6, 1.4);
    for (let x = 0; x < W; x++) {
      g[x] = clamp(FH - 4 + Math.round(nG(x) * 1.7), FH - 6, FH - 3);
      c[x] = clamp(2 + Math.round(nC(x) * 1.9 * chamber + Math.sin(x * 0.21 + f) * 0.8), 0, 5); // lower, wavier ceilings = narrower, organic passages
    }
    for (let x = 1; x < W; x++) { if (g[x] > g[x - 1] + 1) g[x] = g[x - 1] + 1; if (g[x] < g[x - 1] - 1) g[x] = g[x - 1] - 1; }
    for (let x = 0; x < W; x++) if (g[x] - c[x] < 6) c[x] = Math.max(0, g[x] - 6);
    const fl = { f, y0, depth, biome, g, c, objs: [], spawns: [], decor: [], ladIn: this.ladNext.slice(), pitIn: this.pitNext.slice(), ext: false, seen: new Uint8Array(W * FH), poi: null };
    const res = []; const free = (a, b) => a >= 4 && b <= W - 5 && !res.some(r => !(b < r[0] || a > r[1]));
    const tryX = (wd, pad) => { for (let k = 0; k < 50; k++) { const x = ri(4, W - 5 - wd); if (free(x - (pad || 0), x + wd + (pad || 0))) { res.push([x - (pad || 0), x + wd + (pad || 0)]); return x; } } return -1; };
    const flatten = (a, b, gv, minHead) => { for (let x = a; x <= b; x++) { g[x] = gv; c[x] = Math.min(c[x], gv - (minHead || 7)); if (c[x] < 0) c[x] = 0; } };
    // incoming openings from the band above
    for (const lx of fl.ladIn) { c[lx] = 0; res.push([lx - 2, lx + 2]); }
    for (const [a, b] of fl.pitIn) for (let x = a; x <= b; x++) c[x] = 0;
    // special structures
    if (f === 0) { flatten(3, 16, FH - 4, 8); res.push([2, 17]); fl.objs.push({ type: 'elevator', kind: 'arrival', x: 9 * T, label: 'The winch lift (it only goes down)', act: 'arrival' }); }
    if (NE.isTownFloor(f)) return this.genTown(f, fl, rows, g, c);
    // POI pocket
    const poiW = { grotto: [['medic', 2], ['camp', 2], ['triage', 1.2], ['armory', 1], ['none', 2]], desert: [['triage', 2], ['camp', 2], ['armory', 1.5], ['medic', 1], ['none', 1.5]], ice: [['medic', 2], ['camp', 2], ['armory', 1.5], ['none', 2]], crystal: [['lab', 3], ['armory', 1.5], ['medic', 1.2], ['none', 1]], magma: [['lab', 1.5], ['armory', 2], ['camp', 1.5], ['medic', 1], ['none', 1]] , hive: [['medic', 2], ['camp', 1], ['lab', 1], ['none', 2]], drowned: [['medic', 1.5], ['armory', 1.5], ['camp', 1], ['none', 2]], ossuary: [['triage', 1.5], ['medic', 1], ['lab', 1], ['none', 2]], heart: [['medic', 1.5], ['lab', 1.5], ['armory', 1], ['none', 1.5]] }[B] || [['none', 1]];
    const poi = f === 0 ? 'none' : NE.wpick(poiW); let poiX = -1, poiW2 = 0;
    if (poi !== 'none') { poiW2 = ri(12, 15); poiX = tryX(poiW2, 1); if (poiX > 0) flatten(poiX, poiX + poiW2, FH - 4, 8); }
    // crawlspace with hidden cache (decided before carving so its entrances line up)
    let crawl = null; if (f > 0 && chance(0.22)) { const w = ri(7, 10); const x = tryX(w, 2); if (x > 0) { crawl = [x, x + w]; flatten(x - 2, x + w + 2, FH - 4, 6); } }
    // carve air
    for (let x = 2; x < W - 2; x++) { const edge = Math.max(0, Math.round(nW(x * 0.5) * 1.2)); for (let r = c[x] + (x < 4 || x > W - 5 ? edge : 0); r < g[x]; r++) rows[r][x] = 0; }
    // wavy side walls
    for (let r = 0; r < FH; r++) { const k = Math.round(1 + Math.abs(nW(r * 0.7 + y0)) * 2); for (let i = 0; i < k; i++) { rows[r][2 + i] = 1; rows[r][W - 3 - i] = 1; } }
    for (const lx of fl.ladIn) for (let r = 0; r < g[lx]; r++) rows[r][lx] = 3;
    if (f === 0) for (let x = 3; x <= 16; x++) for (let r = c[x]; r < g[x]; r++) rows[r][x] = 0;
    if (poiX > 0) for (let x = poiX; x <= poiX + poiW2; x++) for (let r = c[x]; r < g[x]; r++) rows[r][x] = 0;
    for (const [a, b] of fl.pitIn) for (let x = a; x <= b; x++) for (let r = 0; r < g[x]; r++) rows[r][x] = 0;
    for (const [a, b, dir, cav] of fl.pitIn) { if (dir) { const x0 = dir > 0 ? b : a; for (let i = 1; i < 16; i++) { const x = x0 + dir * i, r = i; if (x < 3 || x > W - 4 || r >= g[x] - 1) break; } }
      if (cav) for (let r = 2, side = 0; r < g[a] - 3; r += 4, side ^= 1) { const sx = side ? b - 1 : a, d = side ? -1 : 1; for (let q = 0; q < 2; q++) { if (rows[r + q] && rows[r + q][sx] === 0) rows[r + q][sx] = 1; } if (rows[r][sx + d] === 0) rows[r][sx + d] = 1; } }
    if (crawl) { const gv = FH - 4; for (let x = crawl[0]; x <= crawl[1]; x++) for (let r = 0; r < gv; r++) rows[r][x] = r === gv - 1 ? 0 : 1; fl.objs.push(this.container('stash', ((crawl[0] + crawl[1]) / 2) * T, 0, depth)); fl.crawl = crawl; }
    // ropes down (narrow shafts)
    // winding chutes: sloped tunnels that snake down through the floor rock into the band below (replace most rope shafts)
    const chutes = []; for (let k = 0; k < (f === 0 ? 1 : ri(2, 3)); k++) {
      const len = ri(7, 12), x = tryX(len + 1, 2); if (x <= 0) continue; const dir = chance(0.5) ? 1 : -1; const g0 = g[dir > 0 ? x : x + len];
      let xe = 0; for (let i = 0; i <= len; i++) { const xx = dir > 0 ? x + i : x + len - i; const fl2 = Math.min(FH, g0 + Math.round((FH - g0) * (i + 1) / (len + 1)) + (i > 1 && i < len - 1 && chance(0.3) ? 1 : 0));
        for (let r = Math.max(0, fl2 - 5); r < Math.min(FH, fl2); r++) rows[r][xx] = 0; if (i >= len - 1) for (let r = fl2; r < FH; r++) rows[r][xx] = 0; xe = xx; }
      chutes.push([Math.min(xe, xe - dir), Math.max(xe, xe - dir), dir]);
    }
        if (!chutes.length) { // guarantee at least one natural way down
      const len = 8, x = clamp(20 + Math.floor(rf(0, 40)), 4, W - 14), dir = 1; const g0 = g[x]; let xe = x;
      for (let i = 0; i <= len; i++) { const xx = x + i; const fl2 = Math.min(FH, g0 + Math.round((FH - g0) * (i + 1) / (len + 1))); for (let r = Math.max(0, fl2 - 5); r < Math.min(FH, fl2); r++) rows[r][xx] = 0; if (i >= len - 1) for (let r = fl2; r < FH; r++) rows[r][xx] = 0; xe = xx; }
      chutes.push([xe - 1, xe, dir]); }
    this.ladNext = [];
    // open pits (risky shortcut drops)
    const pits = []; for (let k = 0; k < (f === 0 ? 0 : ri(0, 2)); k++) { const w = ri(2, 3); const x = tryX(w, 2); if (x > 0) { pits.push([x, x + w - 1]); for (let i = 0; i < w; i++) for (let r = g[x + i]; r < FH; r++) rows[r][x + i] = 0; } }
    if (f > 0 && chance(0.55)) { const w = ri(5, 8), x = tryX(w, 2); if (x > 0) { for (let i = 0; i <= w; i++) for (let r = g[x + i]; r < FH; r++) rows[r][x + i] = 0;
        for (let r = g[x] + 2, side = 0; r < FH - 1; r += 3, side ^= 1) { const sx = side ? x + w - 1 : x, d = side ? -1 : 1; rows[r][sx] = 1; rows[r][sx + d] = 1; if (rows[r + 1]) rows[r + 1][sx] = 1; }
        pits.push([x, x + w, 0, 1]); } }
    this.pitNext = pits.concat(chutes);
    // stalactites & stalagmites & pillars
    for (let k = 0; k < ri(4, 9); k++) { const x = ri(5, W - 6); if (!free(x, x)) continue; const len = ri(1, 3); for (let r = c[x]; r < Math.min(g[x] - 4, c[x] + len); r++) rows[r][x] = 1; if (len > 1 && rows[c[x]][x + 1] === 0) rows[c[x]][x + 1] = 1; }
    for (let k = 0; k < ri(2, 5); k++) { const x = ri(5, W - 6); if (!free(x - 1, x + 1)) continue; if (g[x] > c[x] + 6 && rows[g[x] - 1][x] === 0) rows[g[x] - 1][x] = 1; }
    for (let k = 0; k < ri(0, 2); k++) { const x = tryX(1, 2); if (x > 0) for (let r = c[x]; r < g[x] - 4; r++) { rows[r][x] = 1; if (r < g[x] - 6) rows[r][x + 1] = 1; } }
    // (floating one-way ledges removed: terrain set-pieces are added after generation instead)
    // ----- biome features
    const span = (minW, maxW, pad) => { const w = ri(minW, maxW); const x = tryX(w, pad || 1); return x > 0 ? [x, x + w] : null; };
    if (B === 'grotto' || B === 'ice') for (let k = 0; k < ri(0, 2); k++) { const s = span(4, 9); if (!s) continue; for (let x = s[0]; x <= s[1]; x++) { const d = (x === s[0] || x === s[1]) ? 1 : 2; for (let r = g[x]; r < g[x] + d; r++) rows[r][x] = 0; for (let r = g[x]; r < g[x] + d; r++) rows[r][x] = 5; } fl.pool = true; }
    if (B === 'magma') for (let k = 0; k < ri(1, 2); k++) { const s = span(3, 7); if (!s) continue; for (let x = s[0]; x <= s[1]; x++) { const d = (x === s[0] || x === s[1]) ? 1 : 2; for (let r = g[x]; r < g[x] + d; r++) rows[r][x] = 9; } }
    if (B === 'ice') for (let k = 0; k < ri(2, 4); k++) { const x0 = ri(5, W - 14), w = ri(4, 10); for (let x = x0; x < x0 + w; x++) if (rows[g[x]][x] === 1) rows[g[x]][x] = 10; }
    if (B === 'desert' && f > 0) for (let k = 0; k < ri(1, 2); k++) { const s = span(3, 5); if (!s) continue; for (let x = s[0]; x <= s[1]; x++) { rows[g[x]][x] = 6; for (let r = g[x] + 1; r < Math.min(FH, g[x] + 3); r++) if (rows[r][x] === 1) rows[r][x] = 0; } }
    if (B === 'crystal' && chance(0.45)) { const x = ri(8, W - 10); if (free(x, x + 2)) for (let i = 0; i < 2; i++) if (rows[g[x + i] - 1][x + i] === 0) rows[g[x + i] - 1][x + i] = 4; }
    if ((B === 'magma') && f > 0) for (let k = 0; k < ri(1, 2); k++) { const x = tryX(0, 2); if (x > 0) { rows[g[x]][x] = 7; fl.objs.push({ type: 'vent', x: (x + 0.5) * T, t: rf(0, 6), period: rf(5, 9) }); } }
    if (B === 'grotto' && f > 1 && chance(0.25)) { const x = ri(8, W - 8); fl.objs.push({ type: 'gasleak', spore: true, x: x * T, y: 0, t: 0 }); }
    // relic flower: rare, glowing, guarded by nothing but the dark
    if (depth >= 90 && chance(Math.min(0.32, 0.1 + depth / 5000))) { const x = tryX(0, 2); if (x > 0) fl.objs.push({ type: 'relic', x: (x + 0.5) * T, label: 'Relic Flower', act: 'harvest', hue: ri(0, 2) }); }
    if (B === 'crystal' && f > 0 && chance(0.7)) { const x = ri(8, W - 8); fl.objs.push({ type: 'rad', x: x * T, r: rf(30, 50) }); }
    if (B === 'ice') for (let k = 0; k < ri(2, 5); k++) { const x = ri(5, W - 6); fl.objs.push({ type: 'icicle', x: (x + 0.5) * T, y: 0, armed: true }); }
    if (B === 'crystal') for (let k = 0; k < ri(4, 7); k++) fl.objs.push({ type: 'crystal', x: ri(5, W - 6) * T + 4, ceil: chance(0.4), col: pick(['#80d0ff', '#c090ff', '#90ffd0', '#ff90d0']) });
    if (B === 'grotto') for (let k = 0; k < ri(3, 6); k++) fl.objs.push({ type: 'glowshroom', x: ri(5, W - 6) * T + 4 });
    if (B === 'magma') for (let k = 0; k < ri(2, 4); k++) fl.objs.push({ type: 'ember', x: ri(5, W - 6) * T + 4 });
    // forage (biome perk)
    const forage = { grotto: [['mushroom', 3], ['herb', 2]], desert: [['cactus', 3], ['herb', 1]], ice: [['mushroom', 1]], crystal: [['datashard', 1], ['mushroom', 1]], magma: [['datashard', 1]] , hive: [['honey', 3], ['herb', 1]], drowned: [['mushroom', 2]], ossuary: [['herb', 1]], heart: [['honey', 2], ['herb', 1]] }[B] || [['mushroom', 1]];
    for (let k = 0; k < (B === 'grotto' ? ri(2, 4) : B === 'desert' ? ri(1, 3) : ri(0, 1)); k++) { const x = tryX(0, 0); if (x > 0) fl.objs.push({ type: 'forage', item: NE.wpick(forage), x: (x + 0.5) * T, label: '', act: 'pick' }); }
    // POI contents
    if (poiX > 0) this.buildPOI(fl, poi, poiX, poiX + poiW2);
    // containers
    const ctab = { grotto: [['crate', 3], ['locker', 1], ['duffel', 1]], desert: [['crate', 2], ['locker', 1], ['urn', 3]], ice: [['locker', 2], ['crate', 2], ['duffel', 1]], crystal: [['locker', 2], ['weaponchest', 1], ['duffel', 1]], magma: [['locker', 2], ['weaponchest', 1.5], ['crate', 1]] , hive: [['crate', 1], ['locker', 1]], drowned: [['locker', 2], ['crate', 1]], ossuary: [['urn', 2], ['locker', 1]], heart: [['locker', 1], ['weaponchest', 1]] }[B] || [['crate', 1]];
    for (let k = 0; k < ri(1, 3) + (f === 0 ? 1 : 0); k++) { const x = tryX(1, 0); if (x > 0) { if (g[x + 1] !== g[x]) g[x + 1] = g[x]; fl.objs.push(this.container(NE.wpick(ctab), (x + 1) * T, 0, depth)); } }
    // old expedition lanterns
    for (let k = 0; k < ri(2, 4); k++) fl.objs.push({ type: 'lamp', x: ri(5, W - 6) * T + 4, y: 0, on: chance(0.75), col: biome.pal.lamp, flick: chance(0.5) ? rf(0.1, 0.8) : 0 });
    // background decor
    for (let k = 0; k < ri(4, 8); k++) fl.decor.push({ k: pick(biome.decor), x: ri(4, W - 6) * T, y: 0, s: rf(0, 1) });
    // spawns
    if (f > 0) {
      const n = clamp(Math.floor(rf(0.3, 1.7) + Math.sqrt(depth) / 15), 0, depth < 300 ? 2 : 3); // grows slowly and caps at 3 per level
      const tbl = depth < 120 ? [['scav', 5], ['gunner', depth > 60 ? 1 : 0.01]] : biome.enemies; // only people near the surface
      for (let k = 0; k < n; k++) { const ty = NE.wpick(tbl); const pack = (ty === 'trog' && chance(0.35) && k === 0) ? 2 : 1; for (let q = 0; q < pack; q++) fl.spawns.push({ kind: 'enemy', type: ty, x: ri(8, W - 8) * T }); }
      if (f >= 2 && chance(0.13)) fl.spawns.push({ kind: 'survivor', x: ri(10, W - 10) * T });
      if (depth > 300 && chance(0.05)) fl.spawns.push({ kind: 'trader', x: ri(10, W - 10) * T });
      if (f >= 3 && chance(0.12)) fl.spawns.push({ kind: 'standoff', x: ri(15, W - 15) * T });
    }
    if (f > 0) for (let k = 0; k < ri(1, 3); k++) fl.spawns.push({ kind: 'prop', p: pick(['crate', 'barrel', 'brick', 'bottle', 'debris', 'debris']), x: ri(6, W - 6) * T, dy: -8 });
    for (const r of rows) this.rows.push(r);
    // resolve y positions now that rows exist
    fl.feetY = (y0 + FH - 4) * T;
    for (const o of fl.objs) { if (o.type === 'lamp' || o.type === 'icicle' || (o.type === 'crystal' && o.ceil) || o.type === 'gasleak') o.y = this.ceilY(fl, o.x) + (o.type === 'gasleak' ? 4 : 1); else if (o.type === 'rad') o.y = this.groundY(fl, o.x) - 20; else o.y = this.groundY(fl, o.x); }
    for (const s of fl.spawns) s.y = this.groundY(fl, s.x) + (s.dy || 0);
    for (const d of fl.decor) d.y = this.groundY(fl, d.x);
    this.floors.push(fl); return fl;
  }
  genTown(f, fl, rows, g, c) {
    const W = this.W, FH = NE.FH; const B = fl.biome.id; const gv = FH - 4;
    for (let x = 0; x < W; x++) { g[x] = gv; c[x] = x < 3 || x > W - 4 ? gv : (x < 6 || x > W - 7 ? 2 : 0); }
    for (let r = 0; r < FH; r++) for (let x = 0; x < W; x++) rows[r][x] = (r < c[x] || r >= g[x]) ? 1 : 0;
    for (const lx of fl.ladIn) { for (let r = 0; r < g[lx]; r++) rows[r][lx] = 3; }
    const name = pick(NE.TOWNS[B] || ['Waystation']); fl.town = { name, x0: 6 * T, x1: (W - 7) * T };
    // ropes onward
    { const dir = ri(0, 1) ? 1 : -1, x0 = dir > 0 ? 7 : W - 8; let xe = x0; for (let i = 0; i < 7; i++) { const xx = x0 + dir * i; const fl2 = Math.min(FH, gv + Math.round((FH - gv) * (i + 1) / 7)); for (let r = Math.max(gv - 1, fl2 - 4); r < Math.min(FH, fl2); r++) rows[r][xx] = 0; if (i >= 5) for (let r = fl2; r < FH; r++) rows[r][xx] = 0; xe = xx; }
      this.ladNext = []; this.pitNext = [[Math.min(xe, xe - dir), Math.max(xe, xe - dir), dir]]; }
    for (let x = 14; x < W - 14; x += ri(9, 13)) fl.decor.push({ k: 'shack', x: x * T, y: 0, s: rf(0, 1), col: pick(['#6a4a30', '#5a4636', '#4a3a2a', '#705038']) });
    const mid = Math.floor(W / 2) * T; const at = k => (k) * T;
    fl.objs.push({ type: 'post', x: mid, label: 'Deep Post — send loot topside', act: 'post' });
    fl.objs.push({ type: 'fire', x: mid - 22, label: 'Town Hearth', act: 'fire' });
    fl.objs.push({ type: 'bed', x: at(20), label: 'Inn Bed — rest & save', act: 'rest' });
    fl.objs.push({ type: 'bench', x: mid + 34, label: 'Town Workbench', act: 'craft' });
    fl.objs.push({ type: 'dispenser', x: at(W - 20), label: 'Town Well', act: 'drink', uses: 99 });
    fl.objs.push({ type: 'sign', x: at(12), label: name });
    for (let x = 8; x < W - 8; x += 7) fl.objs.push({ type: 'lamp', x: x * T + 4, y: 0, on: true, col: pick(['#ffc070', '#ffd890', '#ffb060']), flick: 0 });
    for (let x = 10; x < W - 10; x += 16) fl.decor.push({ k: 'bunting', x: x * T, y: 0 });
    for (const [k, x] of [['table2', 24], ['plant', 33], ['shelf', W - 36], ['table2', W - 26], ['genset', 40], ['plant', W - 42]]) fl.decor.push({ k, x: x * T, y: 0 });
    const npc = (role, x) => { const sv = NE.makeSurvivor(); fl.spawns.push({ kind: 'town', role, x: x * T, name: sv.name, look: sv.look }); };
    npc('trader', 30); npc('doctor', W - 30); for (let i = 0; i < ri(3, 5); i++) npc('folk', ri(14, W - 14));
    fl.feetY = (fl.y0 + gv) * T; for (const r of rows) this.rows.push(r);
    for (const o of fl.objs) o.y = o.type === 'lamp' ? this.ceilY(fl, o.x) + 1 : this.groundY(fl, o.x);
    for (const sp of fl.spawns) sp.y = this.groundY(fl, sp.x); for (const d of fl.decor) d.y = this.groundY(fl, d.x);
    this.floors.push(fl); return fl;
  }
  container(ct, x, y, depth) {
    const C = NE.CONTAINERS[ct]; const o = { type: 'container', ct, x, y, label: C.name, act: 'search', items: null, searched: false, depth: depth || 0 };
    if (C.lock && chance(C.lock)) o.locked = ct === 'weaponchest' ? 'security' : 'lock';
    if (depth > 150 && chance(0.06 + depth / 6000)) o.trap = pick(['needle', 'grenade']);
    return o;
  }
  buildPOI(fl, poi, x0, x1) {
    const cx = (x0 + x1) / 2 * T; fl.poi = { kind: poi, x0: x0 * T, x1: x1 * T };
    const lamp = col => fl.objs.push({ type: 'lamp', x: cx, y: 0, on: true, col, flick: 0.05 });
    fl.decor.push({ k: 'beam', x: x0 * T + 4 }, { k: 'beam', x: x1 * T - 4 });
    if (poi === 'medic' || poi === 'triage') {
      fl.objs.push({ type: 'table', x: cx - 12, label: 'Field Cot (surgery)', act: 'table' });
      fl.objs.push(this.container('cabinet', cx + 14, 0, fl.depth)); fl.objs.push({ type: 'dispenser', x: cx + 26, label: 'Water Jug', act: 'drink', uses: ri(2, 4) });
      if (poi === 'triage') { const d = this.container('duffel', cx - 30, 0, fl.depth); d.triage = true; fl.objs.push(d); fl.decor.push({ k: 'tent', x: cx - 40 }); }
      lamp('#ffe0b0'); fl.medic = true;
    } else if (poi === 'camp') {
      fl.objs.push({ type: 'fire', x: cx, label: 'Campfire', act: 'fire' }); fl.objs.push({ type: 'bench', x: cx - 26, label: 'Workbench', act: 'craft' });
      const ch = this.container('locker', cx + 24, 0, fl.depth); ch.locked = 'lock'; fl.objs.push(ch); fl.decor.push({ k: 'tent', x: cx + 32 });
      for (let k = 0; k < ri(1, 2); k++) fl.spawns.push({ kind: 'enemy', type: fl.depth > 500 ? pick(['scav', 'gunner']) : 'scav', x: cx + rf(-30, 30), guard: true });
    } else if (poi === 'armory') {
      const w = this.container('weaponchest', cx - 10, 0, fl.depth); w.locked = 'security'; fl.objs.push(w);
      fl.objs.push(this.container('locker', cx + 14, 0, fl.depth)); lamp('#ffb070'); fl.decor.push({ k: 'minecart', x: cx + 26 });
    } else if (poi === 'lab') {
      fl.objs.push(this.container('stash', cx, 0, fl.depth)); fl.objs.push({ type: 'console', x: cx - 24 }); fl.objs.push({ type: 'rad', x: cx, r: 34 }); lamp('#90ffa0');
      fl.objs.push({ type: 'bench', x: cx + 24, label: 'Research Bench', act: 'craft' });
    }
  }
}
NE.World = World;

// ---------------- rendering ----------------
function makeTex(pal, kind) {
  const t = {}; const mk = fn => { const arr = []; for (let v = 0; v < 4; v++) { const c = document.createElement('canvas'); c.width = 8; c.height = 8; const x = c.getContext('2d'); fn(x, v); arr.push(c); } return arr; };
  t.solid = mk((x, v) => { x.fillStyle = pal.tile; x.fillRect(0, 0, 8, 8); x.fillStyle = pal.tile2; for (let i = 0; i < 9; i++) x.fillRect(Math.floor(NE.hash(i, v * 9 + 3) * 8), Math.floor(NE.hash(v + 7, i * 3) * 8), 1 + (i % 3 === 0 ? 1 : 0), 1); x.fillStyle = NE.shade(pal.tile, 1.18); for (let i = 0; i < 3; i++) x.fillRect(Math.floor(NE.hash(i + 40, v) * 8), Math.floor(NE.hash(v, i + 40) * 8), 1, 1); if (kind === 'crystal' && v === 3) { x.fillStyle = '#80c0ff'; x.fillRect(3, 3, 1, 2); } if (kind === 'magma' && v === 2) { x.fillStyle = '#a03010'; x.fillRect(1, 5, 4, 1); x.fillRect(4, 4, 1, 1); } });
  t.crumble = mk((x, v) => { x.fillStyle = NE.shade(pal.tile, 1.1); x.fillRect(0, 0, 8, 8); x.fillStyle = NE.shade(pal.tile, 0.7); for (let i = 0; i < 8; i++) x.fillRect(Math.floor(NE.hash(i, v + 50) * 8), Math.floor(NE.hash(v + 50, i) * 8), 1, 1); });
  t.ice = mk((x, v) => { x.fillStyle = '#9fd4ec'; x.fillRect(0, 0, 8, 8); x.fillStyle = '#d8f4ff'; x.fillRect(1 + v, 1, 2, 1); x.fillRect(5, 3 + (v % 2), 1, 2); x.fillStyle = '#6aa8c8'; x.fillRect(0, 7, 8, 1); });
  t.metal = mk(x => { x.fillStyle = '#4a3a2a'; x.fillRect(0, 0, 8, 8); x.fillStyle = '#6a5038'; x.fillRect(0, 0, 8, 1); x.fillRect(3, 0, 1, 8); });
  t.vent = mk(x => { x.fillStyle = '#2a1a14'; x.fillRect(0, 0, 8, 8); x.fillStyle = '#ff6020'; x.fillRect(3, 0, 2, 3); x.fillStyle = '#5a2a1a'; x.fillRect(1, 3, 6, 1); });
  // cave back wall: 96x96 tile of chunky, shaded rock blocks + biome detail (parallax-scrolled behind the tiles)
  const BS = 96; const b = document.createElement('canvas'); b.width = BS; b.height = BS; const bx = b.getContext('2d'); const h = (a, c) => NE.hash(a + kind.length * 31, c);
  bx.fillStyle = NE.shade(pal.back, 0.8); bx.fillRect(0, 0, BS, BS);
  const used = new Uint8Array(12 * 12);
  for (let gy = 0; gy < 12; gy++) for (let gx = 0; gx < 12; gx++) { if (used[gy * 12 + gx]) continue; const big = h(gx, gy) < 0.35 && gx < 11 && gy < 11 && !used[gy * 12 + gx + 1] && !used[(gy + 1) * 12 + gx]; const sz = big ? 2 : 1;
    for (let a = 0; a < sz; a++) for (let c = 0; c < sz; c++) used[(gy + c) * 12 + gx + a] = 1;
    const x = gx * 8, y = gy * 8, w = sz * 8; const sh = 0.82 + h(gx * 3, gy * 7) * 0.32; const base = h(gy, gx) < 0.5 ? pal.back : pal.back2;
    bx.fillStyle = NE.shade(base, sh); bx.fillRect(x, y, w - 1, w - 1);
    bx.fillStyle = NE.shade(base, sh * 1.16); bx.fillRect(x, y, w - 1, 1); bx.fillRect(x, y, 1, w - 1); // lit top-left edge
    bx.fillStyle = NE.shade(base, sh * 0.72); bx.fillRect(x + w - 1, y, 1, w); bx.fillRect(x, y + w - 1, w, 1); // shadowed seam
    for (let k = 0; k < 3 * sz; k++) { bx.fillStyle = NE.shade(base, sh * (k % 2 ? 0.86 : 1.08)); bx.fillRect(x + 1 + Math.floor(h(k, gx + gy * 12) * (w - 3)), y + 1 + Math.floor(h(gx + gy * 12, k) * (w - 3)), 1, 1); } }
  if (kind === 'grotto') { for (let k = 0; k < 7; k++) { const x = Math.floor(h(k, 1) * BS), L = 8 + Math.floor(h(1, k) * 30); for (let y = 0; y < L; y++) { bx.fillStyle = y % 5 === 0 ? '#3a5a2a' : '#2a4020'; bx.fillRect(x + Math.round(Math.sin(y * 0.4 + k) * 1.2), y, 1, 1); } }
    for (let k = 0; k < 14; k++) { bx.fillStyle = 'rgba(80,130,50,0.35)'; bx.fillRect(Math.floor(h(k, 5) * BS), Math.floor(h(5, k) * BS), 2 + (k % 3), 1); } }
  if (kind === 'desert') { for (const yy of [14, 15, 41, 66, 67, 88]) { bx.fillStyle = NE.shade(pal.back, yy % 2 ? 1.22 : 1.1); bx.fillRect(0, yy, BS, 1); } for (let k = 0; k < 6; k++) { bx.fillStyle = 'rgba(220,180,120,0.18)'; bx.fillRect(Math.floor(h(k, 8) * BS), Math.floor(h(8, k) * BS), 5, 2); } }
  if (kind === 'ice') { for (let k = 0; k < 5; k++) { let x = Math.floor(h(k, 3) * BS), y = Math.floor(h(3, k) * BS); bx.fillStyle = 'rgba(200,235,255,0.28)'; for (let q = 0; q < 14; q++) { bx.fillRect(x, y, 1, 1); x += h(q, k) < 0.5 ? 1 : 0; y += 1; } } for (let k = 0; k < 10; k++) { bx.fillStyle = 'rgba(230,245,255,0.4)'; bx.fillRect(Math.floor(h(k, 11) * BS), Math.floor(h(11, k) * BS), 1, 1); } }
  if (kind === 'crystal') { const vc = ['rgba(140,180,255,0.5)', 'rgba(190,140,255,0.5)', 'rgba(140,255,220,0.45)']; for (let k = 0; k < 6; k++) { let x = Math.floor(h(k, 4) * BS), y = Math.floor(h(4, k) * BS); bx.fillStyle = vc[k % 3]; for (let q = 0; q < 10; q++) { bx.fillRect(x, y, 1, 1); x += 1; y += h(q, k * 2) < 0.5 ? 1 : -1; } bx.fillStyle = '#ffffff'; bx.fillRect(x, y, 1, 1); } }
  if (kind === 'magma') { for (let k = 0; k < 6; k++) { let x = Math.floor(h(k, 6) * BS), y = Math.floor(h(6, k) * BS); for (let q = 0; q < 12; q++) { bx.fillStyle = q % 4 === 0 ? 'rgba(255,140,40,0.55)' : 'rgba(200,60,20,0.4)'; bx.fillRect(x, y, 1, 1); x += h(q, k) < 0.5 ? 1 : -1; y += 1; } } }
  if (kind === 'lobby') { for (let k = 0; k < 4; k++) { bx.fillStyle = 'rgba(255,200,120,0.08)'; bx.fillRect(0, k * 24 + 12, BS, 1); } }
  t.back = b; return t;
}
World.prototype.texFor = function (biome) { const k = biome.id; if (!this.tex[k]) this.tex[k] = makeTex(biome.pal, k); return this.tex[k]; };
// chipped rock shows cracks that spread as it takes damage, so you can see a wall giving way bit by bit
World.prototype.drawCracks = function (ctx, cx, cy) {
  for (const [k, d] of this.thp) { const i = k.indexOf(','); const tx = +k.slice(0, i), ty = +k.slice(i + 1); const px = tx * T, py = ty * T; if (px < cx - 8 || px > cx + NE.VW || py < cy - 8 || py > cy + NE.VH) continue;
    const t = this.get(tx, ty); if (!t) continue; const f = Math.min(1, d / this.tileHP(t)); const n = 1 + Math.floor(f * 6);
    ctx.fillStyle = 'rgba(0,0,0,' + (0.25 + f * 0.45) + ')'; for (let q = 0; q < n; q++) { let x = 3 + Math.floor(NE.hash(tx + q, ty) * 3), y = Math.floor(NE.hash(ty, tx + q) * 3); for (let s = 0; s < 3 + q % 3; s++) { ctx.fillRect(px + x, py + y, 1, 1); x += NE.hash(q, s + tx) < 0.5 ? -1 : 1; y += 1; if (x < 0 || x > 7 || y > 7) break; } }
    if (f > 0.5) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(px + 1, py + 6, 2, 1); ctx.fillRect(px + 5, py + 1, 1, 2); } } };
World.prototype.draw = function (ctx, cx, cy, time) {
  const VW = NE.VW, VH = NE.VH; const tx0 = Math.floor(cx / T) - 1, ty0 = Math.floor(cy / T) - 1, tx1 = tx0 + Math.ceil(VW / T) + 2, ty1 = ty0 + Math.ceil(VH / T) + 2;
  for (let ty = ty0; ty <= ty1; ty++) { const fl = this.floorOf(Math.max(0, ty)); if (!fl) continue; const tex = this.texFor(fl.biome); const pat = tex._pat || (tex._pat = ctx.createPattern(tex.back, 'repeat')); if (pat.setTransform) pat.setTransform(new DOMMatrix().translate(Math.round(cx * 0.3), Math.round(cy * 0.3))); ctx.fillStyle = pat; ctx.fillRect(tx0 * T, ty * T, (tx1 - tx0 + 1) * T, T); }
  for (const fl of this.visibleFloors(cy)) for (const d of fl.decor) NE.drawDecor(ctx, d, fl.biome.pal, time, fl);
  for (let ty = ty0; ty <= ty1; ty++) {
    const fl = this.floorOf(Math.max(0, ty)); if (!fl) continue; const tex = this.texFor(fl.biome); const pal = fl.biome.pal; const B = fl.biome.id;
    for (let tx = tx0; tx <= tx1; tx++) {
      const t = this.get(tx, ty); if (t === 0) continue; const px = tx * T, py = ty * T; const v = Math.floor(NE.hash(tx, ty) * 4);
      if (t === 1 || t === 10) {
        ctx.drawImage(t === 10 ? tex.ice[v] : tex.solid[v], px, py);
        const up = this.get(tx, ty - 1), dn = this.get(tx, ty + 1);
        if (!this.solid(up)) { // surface: biome top layer
          ctx.fillStyle = t === 10 ? '#e8f8ff' : pal.top; ctx.fillRect(px, py, 8, 2);
          if (B === 'grotto' || B === 'lobby') { ctx.fillStyle = NE.shade(pal.top, 1.3); for (let i = 0; i < 3; i++) { const gx = Math.floor(NE.hash(tx * 3 + i, ty) * 8); ctx.fillRect(px + gx, py - 1 - (i % 2), 1, 1 + (i % 2)); } }
          else if (B === 'ice') { ctx.fillStyle = '#ffffff'; ctx.fillRect(px + Math.floor(NE.hash(tx, ty) * 6), py - 1, 2, 1); }
          else if (B === 'crystal' && NE.hash(tx, ty + 5) < 0.25) { ctx.fillStyle = '#90d0ff'; ctx.fillRect(px + 3, py - 2, 1, 2); }
          else if (B === 'magma' && NE.hash(tx, ty + 9) < 0.3) { ctx.fillStyle = '#ff6a20'; ctx.fillRect(px + 2, py + 1, 3, 1); }
        }
        if (!this.solid(dn) && dn !== 3) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(px, py + 7, 8, 1); if (NE.hash(tx, ty) < 0.35) { ctx.fillStyle = B === 'ice' ? '#bfe6f8' : pal.tile2; ctx.fillRect(px + 3, py + 8, 2, 1); ctx.fillRect(px + 4, py + 9, 1, 1); } }
      }
      else if (t === 6) { const cr = this.crumble.get(tx + ',' + ty) || 0; ctx.drawImage(tex.crumble[v], px + (cr > 0 ? (Math.random() - 0.5) * cr * 2 : 0), py); if (!this.solid(this.get(tx, ty - 1))) { ctx.fillStyle = pal.top; ctx.fillRect(px, py, 8, 1); } }
      else if (t === 7) ctx.drawImage(tex.vent[0], px, py);
      else if (t === 8) ctx.drawImage(tex.metal[0], px, py);
      else if (t === 2) { ctx.fillStyle = pal.tile; ctx.fillRect(px, py, 8, 3); ctx.fillStyle = pal.top; ctx.fillRect(px, py, 8, 1); ctx.fillStyle = NE.shade(pal.tile, 0.6); ctx.fillRect(px, py + 3, 8, 1); if (NE.hash(tx, ty) < 0.3) ctx.fillRect(px + 3, py + 4, 2, 1); }
      else if (t === 3) { ctx.fillStyle = pal.ladder; const sw = Math.round(Math.sin(time * 1.5 + ty * 0.4) * 0.6); ctx.fillRect(px + 3 + sw, py, 2, 8); ctx.fillStyle = NE.shade(pal.ladder, 0.7); ctx.fillRect(px + 3 + sw, py + (ty % 2 ? 2 : 6), 2, 1); if (ty % 3 === 0) { ctx.fillStyle = NE.shade(pal.ladder, 1.2); ctx.fillRect(px + 2 + sw, py + 4, 4, 1); } }
      else if (t === 4) { // glass / crystal shards: bright, outlined, glinting so you can't miss them
        const cols = B === 'crystal' ? ['#b8ecff', '#e4b8ff', '#ffffff'] : ['#d8f0f8', '#a8d8e8', '#ffffff'];
        ctx.fillStyle = 'rgba(160,220,255,0.18)'; ctx.fillRect(px - 1, py + 3, 10, 5);
        const sp = [[1, 4, 4], [3, 2, 6], [5, 3, 5], [7, 5, 3]]; for (let i = 0; i < sp.length; i++) { const [sx, sy, h] = sp[i]; ctx.fillStyle = '#1a2a34'; ctx.fillRect(px + sx - 1, py + sy, 3, h); ctx.fillStyle = cols[i % 2]; ctx.fillRect(px + sx, py + sy, 1, h); ctx.fillStyle = cols[2]; ctx.fillRect(px + sx, py + sy, 1, 1); }
        const gl = (time * 2 + tx * 0.7) % 3; if (gl < 0.25) { ctx.fillStyle = '#ffffff'; ctx.fillRect(px + 3, py, 1, 3); ctx.fillRect(px + 2, py + 1, 3, 1); } }
    }
  }
};
World.prototype.drawWater = function (ctx, cx, cy, time) {
  const tx0 = Math.floor(cx / T) - 1, ty0 = Math.floor(cy / T) - 1, tx1 = tx0 + Math.ceil(NE.VW / T) + 2, ty1 = ty0 + Math.ceil(NE.VH / T) + 2;
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const t = this.get(tx, ty); if (t !== 5 && t !== 9) continue; const px = tx * T, py = ty * T; const top = this.get(tx, ty - 1) !== t; const fl = this.floorOf(ty); const icy = fl && fl.biome.id === 'ice';
    if (t === 9) { ctx.fillStyle = 'rgba(255,' + (90 + Math.floor(Math.sin(time * 3 + tx) * 30)) + ',20,0.9)'; ctx.fillRect(px, py, 8, 8); if (top) { ctx.fillStyle = '#ffd060'; ctx.fillRect(px, py + (Math.sin(time * 2 + tx) > 0 ? 1 : 0), 8, 1); } continue; }
    ctx.fillStyle = icy ? 'rgba(60,110,150,0.6)' : 'rgba(30,70,80,0.6)'; ctx.fillRect(px, py, 8, 8);
    if (top) { ctx.fillStyle = icy ? 'rgba(220,245,255,0.8)' : 'rgba(140,200,210,0.7)'; const w = Math.sin(time * 2 + tx * 0.9) > 0 ? 1 : 0; ctx.fillRect(px, py + w, 8, 1); }
  }
};
World.prototype.visibleFloors = function (cy) { if (this.lobby) return this.floors; const a = Math.floor(cy / T / NE.FH) - 1; return this.floors.slice(Math.max(0, a), a + 4); };

NE.drawDecor = function (ctx, d, pal, time, fl) {
  const c1 = NE.shade(pal.back, 1.7), c2 = NE.shade(pal.back, 2.3), c0 = NE.shade(pal.back, 0.6); const x = Math.round(d.x), y = Math.round(d.y);
  const ceil = fl && fl.c ? (fl.y0 + fl.c[NE.clamp(Math.floor(d.x / T), 0, fl.c.length - 1)]) * T : y - 60;
  switch (d.k) {
    case 'roots': case 'vines': { ctx.fillStyle = d.k === 'vines' ? '#3a5a26' : c1; const L = 10 + Math.floor(NE.hash(x, 1) * 18); for (let i = 0; i < L; i++) ctx.fillRect(x + Math.round(Math.sin(i * 0.5 + x) * 1.2), ceil + i, 1, 1); if (d.k === 'vines') { ctx.fillStyle = '#5a8a3a'; ctx.fillRect(x - 1, ceil + L, 3, 2); } break; }
    case 'moss': ctx.fillStyle = '#2e4a22'; ctx.fillRect(x, y - 3, 12, 3); ctx.fillStyle = '#4a7030'; ctx.fillRect(x + 2, y - 4, 7, 1); break;
    case 'boulder': ctx.fillStyle = c1; ctx.fillRect(x, y - 8, 14, 8); ctx.fillRect(x + 2, y - 11, 9, 3); ctx.fillStyle = c2; ctx.fillRect(x + 3, y - 10, 3, 1); break;
    case 'stalag': ctx.fillStyle = c1; for (let i = 0; i < 18; i++) { const w = Math.max(1, 5 - Math.floor(i / 4)); ctx.fillRect(x - Math.floor(w / 2), y - i, w, 1); } ctx.fillStyle = c0; for (let i = 0; i < 14; i++) { const w = Math.max(1, 4 - Math.floor(i / 4)); ctx.fillRect(x + 20 - Math.floor(w / 2), ceil + i, w, 1); } break;
    case 'pillar': ctx.fillStyle = c1; ctx.fillRect(x, ceil, 6, y - ceil); ctx.fillStyle = c0; ctx.fillRect(x + 4, ceil, 2, y - ceil); break;
    case 'pottery': ctx.fillStyle = '#8a5a30'; ctx.fillRect(x, y - 6, 5, 6); ctx.fillRect(x + 1, y - 7, 3, 1); ctx.fillStyle = '#6a4020'; ctx.fillRect(x, y - 4, 5, 1); ctx.fillStyle = '#7a4a28'; ctx.fillRect(x + 8, y - 4, 4, 4); break;
    // ---- v0.5 hub furniture (base camp is a modern field station dug into the rock)
    case 'sofa': { const R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); }; R(0, -9, 22, 4, '#3a4a5a'); R(0, -6, 22, 4, '#4a5e70'); R(-1, -8, 3, 6, '#33414e'); R(20, -8, 3, 6, '#33414e'); R(2, -5, 8, 1, '#5a7088'); R(12, -5, 8, 1, '#5a7088'); R(1, -2, 1, 2, '#1a1410'); R(20, -2, 1, 2, '#1a1410'); R(4, -11, 5, 3, '#c0603a'); break; }
    case 'desk': { const R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); }; R(0, -8, 18, 2, '#6a6e74'); R(1, -6, 1, 6, '#4a4e54'); R(16, -6, 1, 6, '#4a4e54'); R(10, -6, 6, 4, '#3a3e44'); R(3, -16, 9, 7, '#1a1e24'); R(4, -15, 7, 5, (Math.floor(G_t() * 2) % 2) ? '#2a6a8a' : '#2a7aa0'); R(5, -14, 3, 1, '#9ae0ff'); R(5, -12, 4, 1, '#6ac0e0'); R(7, -9, 1, 1, '#1a1e24'); R(13, -10, 3, 2, '#e8e2d0'); break; }
    case 'fridge': { const R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); }; R(0, -20, 9, 20, '#d8dcd8'); R(0, -20, 9, 1, '#f0f4f0'); R(0, -12, 9, 1, '#a0a4a0'); R(7, -18, 1, 4, '#8a8e8a'); R(7, -10, 1, 6, '#8a8e8a'); R(2, -17, 2, 2, '#e05040'); R(4, -16, 2, 2, '#40a0e0'); break; }
    case 'shelf': { const R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); }; R(0, -22, 14, 1, '#7a5a3a'); R(0, -14, 14, 1, '#7a5a3a'); R(0, -22, 1, 22, '#5a4028'); R(13, -22, 1, 22, '#5a4028'); const cols = ['#c04040', '#e0c050', '#5a9ad0', '#6ab060', '#d0d0c0']; for (let i = 0; i < 5; i++) { R(1 + i * 2.5, -26 + (i % 2), 2, 4 - (i % 2), cols[i]); R(2 + i * 2, -18, 2, 4, cols[(i + 2) % 5]); } R(2, -6, 10, 6, '#5a4a30'); R(2, -6, 10, 1, '#7a6a48'); break; }
    case 'plant': { const R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); }; R(1, -5, 6, 5, '#a0603a'); R(1, -5, 6, 1, '#c07a4a'); for (let i = 0; i < 6; i++) { const lx = i - 1, h = 4 + (i * 7) % 5; R(lx + 1, -5 - h, 1, h, i % 2 ? '#4a8a3a' : '#6ab04a'); } R(0, -9, 2, 1, '#6ab04a'); R(6, -10, 2, 1, '#4a8a3a'); break; }
    case 'rug': { ctx.fillStyle = '#7a3a2a'; ctx.fillRect(x, y - 1, 30, 1); ctx.fillStyle = '#c0803a'; for (let i = 0; i < 30; i += 3) ctx.fillRect(x + i, y - 1, 1, 1); break; }
    case 'neon': { const on = Math.sin(G_t() * 7) > -0.9; ctx.fillStyle = on ? '#ffd040' : '#6a5020'; const L = [[3, 0, 5, 1], [1, 1, 2, 1], [8, 1, 2, 1], [0, 2, 1, 4], [10, 2, 1, 4], [1, 6, 2, 1], [8, 6, 2, 1], [3, 7, 5, 1], [4, 3, 3, 1], [4, 5, 3, 1]]; for (const r of L) ctx.fillRect(x + r[0], y - 40 + r[1], r[2], r[3]); if (on) { ctx.fillStyle = 'rgba(255,208,64,0.12)'; ctx.fillRect(x - 3, y - 43, 17, 14); } break; }
    case 'genset': { const R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); }; R(0, -9, 16, 9, '#5a6a40'); R(0, -9, 16, 1, '#7a8a58'); for (let i = 0; i < 4; i++) R(2 + i * 3, -7, 2, 4, '#3a4428'); R(12, -12, 2, 3, '#3a3a3a'); if (Math.random() < 0.08) R(12, -14 - Math.random() * 3, 1, 1, '#8a8a8a'); R(14, -5, 1, 1, (Math.floor(G_t() * 3) % 2) ? '#40ff60' : '#106020'); break; }
    case 'table2': { const R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); }; R(0, -7, 14, 2, '#6a4a2e'); R(1, -5, 1, 5, '#4a3420'); R(12, -5, 1, 5, '#4a3420'); R(3, -9, 2, 2, '#e8e2d0'); R(8, -10, 2, 3, '#5a8a6a'); R(-4, -6, 3, 1, '#5a4030'); R(-4, -5, 1, 5, '#4a3420'); R(15, -6, 3, 1, '#5a4030'); R(17, -5, 1, 5, '#4a3420'); break; }
    case 'bones': ctx.fillStyle = '#c8c0a8'; ctx.fillRect(x, y - 1, 7, 1); ctx.fillRect(x + 1, y - 3, 3, 2); ctx.fillStyle = '#111'; ctx.fillRect(x + 2, y - 3, 1, 1); break;
    case 'ruin': ctx.fillStyle = c2; ctx.fillRect(x, y - 22, 5, 22); ctx.fillRect(x - 2, y - 24, 9, 2); ctx.fillStyle = c0; ctx.fillRect(x + 1, y - 18, 1, 14); break;
    case 'icicles': ctx.fillStyle = 'rgba(190,230,250,0.55)'; for (let i = 0; i < 5; i++) { const L = 3 + Math.floor(NE.hash(x + i, 2) * 8); ctx.fillRect(x + i * 3, ceil, 1, L); } break;
    case 'frozen': ctx.fillStyle = 'rgba(170,220,245,0.4)'; ctx.fillRect(x, y - 10, 12, 10); ctx.fillStyle = '#c8c0a8'; ctx.fillRect(x + 3, y - 6, 5, 1); ctx.fillRect(x + 4, y - 8, 2, 2); break;
    case 'cluster': { const cols = ['#5a8ad0', '#9a6ad0', '#5ad0b0']; const cc = cols[Math.floor(NE.hash(x, 3) * 3)]; ctx.fillStyle = cc; ctx.fillRect(x, y - 9, 2, 9); ctx.fillRect(x + 3, y - 13, 2, 13); ctx.fillRect(x + 6, y - 7, 2, 7); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x + 3, y - 12, 1, 4); break; }
    case 'geode': ctx.fillStyle = c1; ctx.fillRect(x, y - 30, 14, 12); ctx.fillStyle = 'rgba(160,120,255,' + (0.35 + 0.15 * Math.sin(time * 2 + x)) + ')'; ctx.fillRect(x + 3, y - 27, 8, 6); break;
    case 'obsidian': ctx.fillStyle = '#16121a'; ctx.fillRect(x, y - 12, 8, 12); ctx.fillRect(x + 2, y - 16, 3, 4); ctx.fillStyle = '#3a2a4a'; ctx.fillRect(x + 1, y - 10, 1, 6); break;
    case 'cracks': ctx.fillStyle = 'rgba(255,90,20,' + (0.35 + 0.2 * Math.sin(time * 2 + x)) + ')'; ctx.fillRect(x, y - 24, 1, 6); ctx.fillRect(x + 1, y - 18, 1, 5); ctx.fillRect(x - 1, y - 13, 1, 4); break;
    case 'tent': ctx.fillStyle = '#6a5a3a'; for (let i = 0; i < 12; i++) ctx.fillRect(x + 12 - i, y - i, i * 2 + 1, 1); ctx.fillStyle = '#2a2016'; ctx.fillRect(x + 11, y - 6, 3, 6); break;
    case 'beam': ctx.fillStyle = '#4a3420'; ctx.fillRect(x - 1, ceil, 3, y - ceil); ctx.fillRect(x - 6, ceil, 13, 2); break;
    case 'minecart': ctx.fillStyle = '#4a4440'; ctx.fillRect(x, y - 7, 12, 5); ctx.fillStyle = '#111'; ctx.fillRect(x + 1, y - 2, 3, 2); ctx.fillRect(x + 8, y - 2, 3, 2); ctx.fillStyle = '#8a7a6a'; ctx.fillRect(x + 2, y - 9, 8, 2); break;
    case 'shack': { const c = d.col || '#5a4636', w = 22 + Math.floor(NE.hash(x, 4) * 10), h = 18 + Math.floor(NE.hash(x, 5) * 8); ctx.fillStyle = NE.shade(c, 0.75); ctx.fillRect(x, y - h, w, h); ctx.fillStyle = c; for (let i = 0; i < w; i += 3) ctx.fillRect(x + i, y - h, 2, h); ctx.fillStyle = NE.shade(c, 0.55); for (let i = 0; i < 6; i++) ctx.fillRect(x - 2 + i, y - h - i, w + 4 - i * 2, 1); ctx.fillStyle = '#1a120c'; ctx.fillRect(x + 4, y - 10, 5, 10); const lit = Math.sin(time * 0.7 + x) > -0.6; ctx.fillStyle = lit ? '#ffcf70' : '#3a2a18'; ctx.fillRect(x + w - 9, y - h + 6, 4, 4); ctx.fillStyle = '#2a1a10'; ctx.fillRect(x + w - 7, y - h + 6, 1, 4); break; }
    case 'bunting': { const cols = ['#e05050', '#f0c040', '#50a0e0', '#60c060']; for (let i = 0; i < 40; i++) { const yy = ceil + 10 + Math.round(Math.sin(i / 40 * Math.PI) * 8); ctx.fillStyle = '#6a5a40'; ctx.fillRect(x + i * 3, yy, 3, 1); if (i % 2 === 0) { ctx.fillStyle = cols[(i / 2) % 4]; ctx.fillRect(x + i * 3, yy + 1, 2, 2); ctx.fillRect(x + i * 3, yy + 3, 1, 1); } } break; }
    case 'crates': ctx.fillStyle = '#4a3a28'; ctx.fillRect(x, y - 8, 8, 8); ctx.fillRect(x + 9, y - 8, 8, 8); ctx.fillRect(x + 4, y - 16, 8, 8); ctx.fillStyle = '#2a2016'; ctx.fillRect(x, y - 8, 8, 1); ctx.fillRect(x + 9, y - 8, 8, 1); ctx.fillRect(x + 4, y - 16, 8, 1); break;
  }
};
NE.lightPoly = function (world, x, y, r, a0, a1, n) { const pts = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; const dx = Math.cos(a), dy = Math.sin(a); const d = Math.min(r, world.ray(x, y, dx, dy, r) + 3); pts.push([x + dx * d, y + dy * d]); } return pts; };
})(window.NE);
