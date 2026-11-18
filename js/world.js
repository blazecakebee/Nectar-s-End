// Nectar's End — procedural endless CAVE descent: organic bands, ropes, pits, stalactites, five cave biomes
(function (NE) {
'use strict';
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
    for (let x = 4; x < 9; x++) w.rows[9][x] = 2;
    for (let x = 49; x <= 55; x++) for (let r = 0; r < 13; r++) w.rows[r][x] = (x === 49 || x === 55) ? (r < 9 ? 8 : 0) : 0; // lift shaft up to the surface
    for (let x = 49; x <= 55; x++) c[x] = 0;
    const fy = 13 * T;
    const fl = { f: 0, y0: 0, depth: 0, g, c, biome: { id: 'lobby', name: 'Base Camp', pal: NE.LOBBY_PAL, dark: 0.55, decor: [] }, objs: [], spawns: [], decor: [], seen: null, feetY: fy };
    fl.objs.push({ type: 'terminal', x: 12 * T, y: fy, label: 'Survey Table — Skills', act: 'skills' });
    fl.objs.push({ type: 'locker', x: 20 * T, y: fy, label: 'Gear Rack & Backpacks', act: 'wardrobe' });
    fl.objs.push({ type: 'quarter', x: 29 * T, y: fy, label: 'Quartermaster', act: 'shop' });
    fl.objs.push({ type: 'dossier', x: 38 * T, y: fy, label: 'Diver Dossier', act: 'dossier' });
    fl.objs.push({ type: 'fire', x: 44 * T, y: fy, label: 'Campfire' });
    fl.objs.push({ type: 'elevator', kind: 'descent', x: 52 * T, y: fy, label: 'Descent Winch Lift', act: 'descend' });
    for (const lx of [8, 18, 28, 37]) fl.objs.push({ type: 'lamp', x: lx * T + 4, y: c[lx] * T + 1, on: true, col: '#ffc070', flick: chance(0.4) ? rf(0.2, 0.6) : 0 });
    fl.decor = [{ k: 'tent', x: 3 * T, y: fy }, { k: 'crates', x: 33 * T, y: fy }, { k: 'roots', x: 24 * T, y: 4 * T }, { k: 'roots', x: 15 * T, y: 4 * T }];
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
      c[x] = clamp(1 + Math.round(nC(x) * 1.6 * chamber + 0.3), 0, 4);
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
    const poiW = { grotto: [['medic', 2], ['camp', 2], ['triage', 1.2], ['armory', 1], ['none', 2]], desert: [['triage', 2], ['camp', 2], ['armory', 1.5], ['medic', 1], ['none', 1.5]], ice: [['medic', 2], ['camp', 2], ['armory', 1.5], ['none', 2]], crystal: [['lab', 3], ['armory', 1.5], ['medic', 1.2], ['none', 1]], magma: [['lab', 1.5], ['armory', 2], ['camp', 1.5], ['medic', 1], ['none', 1]] }[B];
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
    if (crawl) { const gv = FH - 4; for (let x = crawl[0]; x <= crawl[1]; x++) for (let r = 0; r < gv; r++) rows[r][x] = r === gv - 1 ? 0 : 1; fl.objs.push(this.container('stash', ((crawl[0] + crawl[1]) / 2) * T, 0, depth)); fl.crawl = crawl; }
    // ropes down (narrow shafts)
    const lads = []; for (let k = 0; k < (f === 0 ? 1 : ri(1, 2)); k++) { const x = tryX(0, 3); if (x > 0) { lads.push(x); for (let r = g[x]; r < FH; r++) rows[r][x] = 3; } }
    if (!lads.length) { const x = 24; lads.push(x); for (let r = g[x]; r < FH; r++) rows[r][x] = 3; }
    this.ladNext = lads;
    // open pits (risky shortcut drops)
    const pits = []; for (let k = 0; k < (f === 0 ? 0 : ri(0, 2)); k++) { const w = ri(2, 3); const x = tryX(w, 2); if (x > 0) { pits.push([x, x + w - 1]); for (let i = 0; i < w; i++) for (let r = g[x + i]; r < FH; r++) rows[r][x + i] = 0; } }
    this.pitNext = pits;
    // stalactites & stalagmites & pillars
    for (let k = 0; k < ri(4, 9); k++) { const x = ri(5, W - 6); if (!free(x, x)) continue; const len = ri(1, 3); for (let r = c[x]; r < Math.min(g[x] - 4, c[x] + len); r++) rows[r][x] = 1; if (len > 1 && rows[c[x]][x + 1] === 0) rows[c[x]][x + 1] = 1; }
    for (let k = 0; k < ri(2, 5); k++) { const x = ri(5, W - 6); if (!free(x - 1, x + 1)) continue; if (g[x] > c[x] + 6 && rows[g[x] - 1][x] === 0) rows[g[x] - 1][x] = 1; }
    for (let k = 0; k < ri(0, 2); k++) { const x = tryX(1, 2); if (x > 0) for (let r = c[x]; r < g[x] - 4; r++) { rows[r][x] = 1; if (r < g[x] - 6) rows[r][x + 1] = 1; } }
    // rock ledges (one-way)
    for (let k = 0; k < ri(1, 3); k++) { const len = ri(4, 8), x = ri(5, W - len - 5); const row = Math.min(...g.slice(x, x + len)) - ri(3, 4); if (row < 2) continue; for (let i = 0; i < len; i++) if (rows[row][x + i] === 0 && rows[row + 1][x + i] !== 3) rows[row][x + i] = 2; }
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
    const forage = { grotto: [['mushroom', 3], ['herb', 2]], desert: [['cactus', 3], ['herb', 1]], ice: [['mushroom', 1]], crystal: [['datashard', 1], ['mushroom', 1]], magma: [['datashard', 1]] }[B];
    for (let k = 0; k < (B === 'grotto' ? ri(2, 4) : B === 'desert' ? ri(1, 3) : ri(0, 1)); k++) { const x = tryX(0, 0); if (x > 0) fl.objs.push({ type: 'forage', item: NE.wpick(forage), x: (x + 0.5) * T, label: '', act: 'pick' }); }
    // POI contents
    if (poiX > 0) this.buildPOI(fl, poi, poiX, poiX + poiW2);
    // containers
    const ctab = { grotto: [['crate', 3], ['locker', 1], ['duffel', 1]], desert: [['crate', 2], ['locker', 1], ['urn', 3]], ice: [['locker', 2], ['crate', 2], ['duffel', 1]], crystal: [['locker', 2], ['weaponchest', 1], ['duffel', 1]], magma: [['locker', 2], ['weaponchest', 1.5], ['crate', 1]] }[B];
    for (let k = 0; k < ri(1, 3) + (f === 0 ? 1 : 0); k++) { const x = tryX(1, 0); if (x > 0) { if (g[x + 1] !== g[x]) g[x + 1] = g[x]; fl.objs.push(this.container(NE.wpick(ctab), (x + 1) * T, 0, depth)); } }
    // old expedition lanterns
    for (let k = 0; k < ri(2, 4); k++) fl.objs.push({ type: 'lamp', x: ri(5, W - 6) * T + 4, y: 0, on: chance(0.75), col: biome.pal.lamp, flick: chance(0.5) ? rf(0.1, 0.8) : 0 });
    // background decor
    for (let k = 0; k < ri(4, 8); k++) fl.decor.push({ k: pick(biome.decor), x: ri(4, W - 6) * T, y: 0, s: rf(0, 1) });
    // spawns
    if (f > 0) {
      const n = clamp(Math.floor(rf(0.3, 1.6) + depth / 170), 0, 6);
      for (let k = 0; k < n; k++) fl.spawns.push({ kind: 'enemy', type: NE.wpick(biome.enemies), x: ri(8, W - 8) * T });
      if (f >= 2 && chance(0.13)) fl.spawns.push({ kind: 'survivor', x: ri(10, W - 10) * T });
      if (depth > 300 && chance(0.05)) fl.spawns.push({ kind: 'trader', x: ri(10, W - 10) * T });
      if (f >= 3 && chance(0.12)) fl.spawns.push({ kind: 'standoff', x: ri(15, W - 15) * T });
    }
    for (let k = 0; k < ri(1, 3); k++) fl.spawns.push({ kind: 'prop', p: pick(['crate', 'barrel', 'brick', 'bottle', 'debris', 'debris']), x: ri(6, W - 6) * T, dy: -8 });
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
    const lx = ri(0, 1) ? 9 : W - 10; for (let r = gv; r < FH; r++) rows[r][lx] = 3; this.ladNext = [lx]; this.pitNext = [];
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
  // cave back wall 24x24
  const b = document.createElement('canvas'); b.width = 24; b.height = 24; const bx = b.getContext('2d');
  bx.fillStyle = pal.back; bx.fillRect(0, 0, 24, 24);
  for (let i = 0; i < 26; i++) { const px = Math.floor(NE.hash(i, 9) * 24), py = Math.floor(NE.hash(9, i) * 24), s = 1 + Math.floor(NE.hash(i, i) * 3); bx.fillStyle = i % 3 ? pal.back2 : NE.shade(pal.back, 0.75); bx.fillRect(px, py, s, Math.max(1, s - 1)); }
  if (kind === 'crystal') { bx.fillStyle = 'rgba(140,180,255,0.35)'; bx.fillRect(5, 6, 1, 2); bx.fillRect(17, 15, 1, 2); }
  if (kind === 'ice') { bx.fillStyle = 'rgba(200,230,255,0.18)'; bx.fillRect(2, 2, 6, 1); bx.fillRect(13, 14, 7, 1); }
  if (kind === 'desert') { bx.fillStyle = NE.shade(pal.back, 1.15); bx.fillRect(0, 8, 24, 1); bx.fillRect(0, 19, 24, 1); }
  t.back = b; return t;
}
World.prototype.texFor = function (biome) { const k = biome.id; if (!this.tex[k]) this.tex[k] = makeTex(biome.pal, k); return this.tex[k]; };
World.prototype.draw = function (ctx, cx, cy, time) {
  const VW = NE.VW, VH = NE.VH; const tx0 = Math.floor(cx / T) - 1, ty0 = Math.floor(cy / T) - 1, tx1 = tx0 + Math.ceil(VW / T) + 2, ty1 = ty0 + Math.ceil(VH / T) + 2;
  for (let ty = ty0; ty <= ty1; ty++) { const fl = this.floorOf(Math.max(0, ty)); if (!fl) continue; const tex = this.texFor(fl.biome); const pat = tex._pat || (tex._pat = ctx.createPattern(tex.back, 'repeat')); ctx.fillStyle = pat; ctx.fillRect(tx0 * T, ty * T, (tx1 - tx0 + 1) * T, T); }
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
