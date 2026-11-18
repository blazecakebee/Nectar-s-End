// Nectar's End — procedural endless descent: floors, biomes, POIs, tiles, objects, lighting rays
(function (NE) {
'use strict';
const { ri, rf, pick, chance, clamp } = NE; const T = NE.T;
const TL = NE.TL = { AIR: 0, SOLID: 1, PLAT: 2, LADDER: 3, SHARDS: 4, WATER: 5, CRUMBLE: 6, VENT: 7, METAL: 8 };
NE.depthOfY = y => Math.max(0, (y - 10 * T) / T * NE.MPT);
NE.isExtFloor = f => { const d = f * NE.FH * NE.MPT, dp = (f - 1) * NE.FH * NE.MPT; return Math.floor(d / 250) > Math.floor(dp / 250); };
NE.LOBBY_PAL = { bg: '#100d0b', back: '#1e1915', back2: '#26201b', tile: '#3e3630', tile2: '#322b26', edge: '#6a5a4a', plat: '#5a4636', ladder: '#8a7a50', lamp: '#ffc070' };

class World {
  constructor(opts) {
    opts = opts || {}; this.W = opts.W || NE.WW; this.rows = []; this.floors = []; this.ladNext = []; this.lobby = !!opts.lobby; this.crumble = new Map(); this.tex = {};
  }
  get(x, y) { if (x < 0 || x >= this.W || y < 0) return 1; const r = this.rows[y]; return r ? r[x] : 1; }
  set(x, y, v) { const r = this.rows[y]; if (r && x >= 0 && x < this.W) r[x] = v; }
  solid(t) { return t === 1 || t === 6 || t === 7 || t === 8; }
  solidAt(px, py) { return this.solid(this.get(Math.floor(px / T), Math.floor(py / T))); }
  platformish(x, y) { const t = this.get(x, y); if (t === 2) return true; if (t === 3) { const u = this.get(x, y - 1); return u !== 3 && !this.solid(u); } return false; }
  isWater(px, py) { return this.get(Math.floor(px / T), Math.floor(py / T)) === 5; }
  floorOf(ty) { if (this.lobby) return this.floors[0]; return this.floors[Math.floor(ty / NE.FH)] || this.floors[this.floors.length - 1]; }
  biomeAtY(py) { const f = this.floorOf(Math.floor(py / T)); return f ? f.biome : NE.BIOMES[0]; }
  los(x0, y0, x1, y1) { const d = Math.hypot(x1 - x0, y1 - y0); const n = Math.ceil(d / 3); for (let i = 1; i < n; i++) { const t = i / n; if (this.solidAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false; } return true; }
  ray(x, y, dx, dy, max) { const st = 2; for (let d = 0; d < max; d += st) { const px = x + dx * d, py = y + dy * d; if (this.solidAt(px, py)) return d; } return max; }

  static lobbyWorld() {
    const w = new World({ W: 58, lobby: true }); const H = 17;
    for (let r = 0; r < H; r++) { const a = new Uint8Array(w.W); for (let x = 0; x < w.W; x++) a[x] = (r < 3 || r >= 13 || x < 2 || x >= w.W - 2) ? 1 : 0; w.rows.push(a); }
    for (let x = 49; x < 56; x++) for (let r = 3; r < 13; r++) if (x === 49 || x === 55) w.rows[r][x] = (r >= 9 ? 0 : 8);
    for (let x = 4; x < 9; x++) w.rows[9][x] = 2; // small shelf platform to jump on
    const fy = 13 * T;
    const fl = { f: 0, y0: 0, depth: 0, biome: { id: 'lobby', name: 'Staging Lobby', pal: NE.LOBBY_PAL, dark: 0.55, decor: [] }, objs: [], spawns: [], decor: [], seen: null, feetY: fy };
    fl.objs.push({ type: 'terminal', x: 12 * T, y: fy, label: 'Skill Terminal', act: 'skills' });
    fl.objs.push({ type: 'locker', x: 20 * T, y: fy, label: 'Gear Locker & Backpack Rack', act: 'wardrobe' });
    fl.objs.push({ type: 'quarter', x: 29 * T, y: fy, label: 'Quartermaster', act: 'shop' });
    fl.objs.push({ type: 'dossier', x: 38 * T, y: fy, label: 'Survivor Dossier', act: 'dossier' });
    fl.objs.push({ type: 'elevator', kind: 'descent', x: 52 * T, y: fy, label: 'Descent Elevator', act: 'descend' });
    for (const lx of [8, 18, 28, 38, 46]) fl.objs.push({ type: 'lamp', x: lx * T + 4, y: 3 * T + 1, on: true, col: '#ffc070', flick: chance(0.4) ? rf(0.2, 0.6) : 0 });
    fl.decor = [{ k: 'sign', x: 44 * T, y: 7 * T }, { k: 'crates', x: 5 * T, y: fy }, { k: 'pipes', x: 30 * T, y: 4 * T }];
    w.floors.push(fl); return w;
  }
  ensure(f, cb) { while (this.floors.length <= f) { const fl = this.genFloor(this.floors.length); if (cb) cb(fl); } }
  genFloor(f) {
    const W = this.W, FH = NE.FH, y0 = f * FH, depth = f * FH * NE.MPT, biome = NE.biomeAt(depth);
    const rows = []; for (let r = 0; r < FH; r++) { const a = new Uint8Array(W); a[0] = a[1] = a[W - 2] = a[W - 1] = 1; rows.push(a); }
    for (let x = 0; x < W; x++) { rows[FH - 2][x] = 1; rows[FH - 1][x] = 1; }
    const fl = { f, y0, depth, biome, objs: [], spawns: [], decor: [], ladIn: this.ladNext.slice(), ext: false, seen: new Uint8Array(W * FH), feetY: (y0 + FH - 2) * T, poi: null };
    const res = []; const free = (a, b) => a >= 3 && b <= W - 4 && !res.some(r => !(b < r[0] || a > r[1]));
    const tryX = (wd, pad) => { for (let k = 0; k < 40; k++) { const x = ri(3, W - 4 - wd); if (free(x - (pad || 0), x + wd + (pad || 0))) { res.push([x - (pad || 0), x + wd + (pad || 0)]); return x; } } return -1; };
    for (const lx of fl.ladIn) { for (let r = 0; r < FH - 2; r++) rows[r][lx] = 3; res.push([lx - 2, lx + 2]); }
    if (f === 0) { res.push([2, 15]); fl.objs.push({ type: 'elevator', kind: 'arrival', x: 8 * T, y: fl.feetY, label: 'Surface Elevator (extract)', act: 'extract' }); }
    if (f > 0 && NE.isExtFloor(f)) { fl.ext = true; res.push([W - 17, W - 3]); fl.objs.push({ type: 'elevator', kind: 'extract', x: (W - 9) * T, y: fl.feetY, label: 'Extraction Elevator', act: 'extract' }); fl.objs.push({ type: 'lamp', x: (W - 13) * T, y: y0 * T + 2, on: true, col: '#90ff90', flick: 0 }); }
    // down-ladders
    const lads = []; const nl = f === 0 ? 1 : ri(1, 2);
    for (let k = 0; k < nl; k++) { const x = tryX(0, 3); if (x > 0) { lads.push(x); rows[FH - 2][x] = 3; rows[FH - 1][x] = 3; } }
    if (!lads.length) { const x = 20; lads.push(x); rows[FH - 2][x] = 3; rows[FH - 1][x] = 3; }
    this.ladNext = lads;
    // holes
    const nh = f === 0 ? 0 : ri(0, 2);
    for (let k = 0; k < nh; k++) { const w = ri(2, 3); const x = tryX(w, 2); if (x > 0) for (let i = 0; i < w; i++) { rows[FH - 2][x + i] = 0; rows[FH - 1][x + i] = 0; } }
    // crumbling floor
    if ((biome.id === 'urban' || biome.id === 'flooded') && f > 0 && chance(0.45)) { const w = ri(3, 5); const x = tryX(w, 1); if (x > 0) for (let i = 0; i < w; i++) { rows[FH - 2][x + i] = 6; rows[FH - 1][x + i] = 0; } }
    // crawlspace with hidden stash
    if (f > 0 && chance(0.22)) { const w = ri(7, 11); const x = tryX(w, 1); if (x > 0) { for (let r = 0; r <= FH - 4; r++) for (let i = 0; i < w; i++) rows[r][x + i] = 1; fl.objs.push(this.container('stash', (x + w / 2) * T, fl.feetY)); fl.crawl = [x, x + w]; } }
    // POI room
    const poiW = { urban: [['medic', 2], ['camp', 2], ['armory', 1], ['none', 2]], quarantine: [['triage', 3], ['medic', 1], ['armory', 1], ['none', 1.5]], flooded: [['medic', 1.5], ['camp', 2], ['armory', 1], ['none', 2]], abyss: [['lab', 2], ['armory', 2], ['medic', 1.5], ['camp', 1], ['none', 1]] }[biome.id];
    const poi = f === 0 ? 'none' : NE.wpick(poiW);
    if (poi !== 'none') { const w = ri(11, 14); const x = tryX(w, 1); if (x > 0) this.buildPOI(fl, rows, poi, x, x + w); }
    // inner walls
    const nw = ri(0, 2);
    for (let k = 0; k < nw; k++) { const x = tryX(0, 3); if (x > 0) for (let r = 0; r <= FH - 6; r++) rows[r][x] = 1; }
    // platforms
    for (let k = 0; k < ri(1, 3); k++) { const len = ri(4, 9), x = ri(3, W - len - 3), row = chance(0.6) ? FH - 5 : FH - 8; for (let i = 0; i < len; i++) if (rows[row][x + i] === 0 && rows[row + 1][x + i] !== 3) rows[row][x + i] = 2; }
    // biome hazards
    if (biome.id === 'flooded') { const x = ri(4, 30), w = ri(25, 55); for (let i = x; i < Math.min(W - 2, x + w); i++) for (const r of [FH - 4, FH - 3]) if (rows[r][i] === 0) rows[r][i] = 5; }
    if (biome.id === 'urban' || biome.id === 'quarantine') for (let k = 0; k < ri(1, 3); k++) { const x = ri(4, W - 7); for (let i = 0; i < ri(2, 3); i++) if (rows[FH - 3][x + i] === 0 && rows[FH - 2][x + i] === 1) rows[FH - 3][x + i] = 4; }
    if ((biome.id === 'flooded' || biome.id === 'abyss') && f > 0) for (let k = 0; k < ri(1, 2); k++) { const x = tryX(0, 2); if (x > 0) { rows[FH - 2][x] = 7; fl.objs.push({ type: 'vent', x: (x + 0.5) * T, y: fl.feetY, t: rf(0, 6), period: rf(5, 9) }); } }
    if (biome.id === 'quarantine' && f > 0 && chance(0.55)) { const x = ri(8, W - 8); fl.objs.push({ type: 'gasleak', x: x * T, y: y0 * T + 4, t: 0 }); }
    if (biome.id === 'abyss' && f > 0 && chance(0.6)) { const x = ri(8, W - 8); fl.objs.push({ type: 'rad', x: x * T, y: fl.feetY - 20, r: rf(30, 50) }); fl.objs.push({ type: 'reactor', x: x * T, y: fl.feetY }); }
    // containers
    const ctab = { urban: [['crate', 3], ['locker', 2], ['duffel', 1]], quarantine: [['locker', 2], ['duffel', 2], ['crate', 1]], flooded: [['locker', 3], ['crate', 2], ['duffel', 1]], abyss: [['locker', 3], ['weaponchest', 1], ['duffel', 1]] }[biome.id];
    for (let k = 0; k < ri(1, 3) + (f === 0 ? 1 : 0); k++) { const x = tryX(1, 0); if (x > 0) fl.objs.push(this.container(NE.wpick(ctab), (x + 1) * T, fl.feetY, depth)); }
    // lamps
    for (let k = 0; k < ri(2, 4); k++) fl.objs.push({ type: 'lamp', x: ri(4, W - 4) * T, y: y0 * T + 2, on: chance(0.8), col: biome.pal.lamp, flick: chance(0.5) ? rf(0.1, 0.8) : 0 });
    // decor
    for (let k = 0; k < ri(3, 6); k++) fl.decor.push({ k: pick(biome.decor), x: ri(3, W - 6) * T, y: fl.feetY, s: rf(0, 1) });
    // spawns
    if (f > 0) {
      const n = clamp(Math.floor(rf(0.3, 1.6) + depth / 170), 0, 6);
      for (let k = 0; k < n; k++) fl.spawns.push({ kind: 'enemy', type: NE.wpick(biome.enemies), x: ri(6, W - 6) * T, y: fl.feetY });
      if (f >= 2 && chance(0.13)) fl.spawns.push({ kind: 'survivor', x: ri(10, W - 10) * T, y: fl.feetY });
      if (fl.ext && depth >= 480 && chance(0.75)) fl.spawns.push({ kind: 'trader', x: (W - 20) * T, y: fl.feetY });
      else if (depth > 300 && chance(0.05)) fl.spawns.push({ kind: 'trader', x: ri(10, W - 10) * T, y: fl.feetY });
      if (f >= 3 && chance(0.12)) fl.spawns.push({ kind: 'standoff', x: ri(15, W - 15) * T, y: fl.feetY });
    }
    for (let k = 0; k < ri(1, 3); k++) fl.spawns.push({ kind: 'prop', p: pick(['crate', 'barrel', 'brick', 'bottle', 'crate', 'debris']), x: ri(4, W - 4) * T, y: fl.feetY - 8 });
    for (const r of rows) this.rows.push(r);
    this.floors.push(fl); return fl;
  }
  container(ct, x, y, depth) {
    const C = NE.CONTAINERS[ct]; const o = { type: 'container', ct, x, y, label: C.name, act: 'search', items: null, searched: false, depth: depth || 0 };
    if (C.lock && chance(C.lock)) o.locked = ct === 'weaponchest' ? 'security' : 'lock';
    if (depth > 150 && chance(0.06 + depth / 6000)) o.trap = pick(['needle', 'grenade']);
    return o;
  }
  buildPOI(fl, rows, poi, x0, x1) {
    const FH = NE.FH, fy = fl.feetY, y0 = fl.y0;
    for (let r = 0; r <= FH - 6; r++) { rows[r][x0] = 1; rows[r][x1] = 1; }
    const cx = (x0 + x1) / 2 * T; fl.poi = { kind: poi, x0: x0 * T, x1: x1 * T };
    const lamp = (col) => fl.objs.push({ type: 'lamp', x: cx, y: y0 * T + 2, on: true, col, flick: 0.05 });
    if (poi === 'medic' || poi === 'triage') {
      fl.objs.push({ type: 'table', x: cx - 12, y: fy, label: 'Surgical Table', act: 'table' });
      fl.objs.push(this.container('cabinet', cx + 14, fy, fl.depth)); fl.objs.push({ type: 'dispenser', x: cx + 26, y: fy, label: 'Water Dispenser', act: 'drink', uses: ri(2, 4) });
      if (poi === 'triage') { fl.objs.push(this.container('duffel', cx - 30, fy, fl.depth)); fl.objs[fl.objs.length - 1].triage = true; fl.decor.push({ k: 'tarp', x: x0 * T + 6, y: fy }, { k: 'tarp', x: x1 * T - 14, y: fy }); }
      lamp(poi === 'triage' ? '#d0f0a0' : '#e0f0ff'); fl.medic = true;
    } else if (poi === 'camp') {
      fl.objs.push({ type: 'fire', x: cx, y: fy, label: 'Campfire', act: 'fire' }); fl.objs.push({ type: 'bench', x: cx - 26, y: fy, label: 'Workbench', act: 'craft' });
      const ch = this.container('locker', cx + 24, fy, fl.depth); ch.locked = 'lock'; fl.objs.push(ch);
      for (let k = 0; k < ri(1, 2); k++) fl.spawns.push({ kind: 'enemy', type: fl.depth > 500 ? pick(['scav', 'gunner']) : 'scav', x: cx + rf(-30, 30), y: fy, guard: true });
    } else if (poi === 'armory') {
      fl.objs.push(this.container('weaponchest', cx - 10, fy, fl.depth)); fl.objs[fl.objs.length - 1].locked = 'security';
      fl.objs.push(this.container('locker', cx + 14, fy, fl.depth)); lamp('#ff8060');
      fl.decor.push({ k: 'sign', x: cx - 4, y: (y0 + 3) * T, txt: 'SECURITY' });
    } else if (poi === 'lab') {
      fl.objs.push(this.container('stash', cx, fy, fl.depth)); fl.objs.push({ type: 'console', x: cx - 24, y: fy }); fl.objs.push({ type: 'rad', x: cx, y: fy - 16, r: 34 }); lamp('#90ffa0');
      fl.objs.push({ type: 'bench', x: cx + 24, y: fy, label: 'Lab Bench', act: 'craft' });
    }
  }
}
NE.World = World;

// ---------------- rendering ----------------
function makeTex(pal, kind) {
  const t = {}; const mk = (fn) => { const arr = []; for (let v = 0; v < 4; v++) { const c = document.createElement('canvas'); c.width = 8; c.height = 8; const x = c.getContext('2d'); fn(x, v); arr.push(c); } return arr; };
  t.solid = mk((x, v) => { x.fillStyle = pal.tile; x.fillRect(0, 0, 8, 8); x.fillStyle = pal.tile2; for (let i = 0; i < 7; i++) x.fillRect(Math.floor(NE.hash(i, v * 9) * 8), Math.floor(NE.hash(v, i * 3) * 8), 1 + (i % 2), 1); if (v === 2) { x.fillRect(0, 4, 8, 1); } if (v === 3) { x.fillStyle = NE.shade(pal.tile, 1.15); x.fillRect(2, 2, 3, 2); } });
  t.crumble = mk((x, v) => { x.fillStyle = NE.shade(pal.tile, 0.9); x.fillRect(0, 0, 8, 8); x.fillStyle = '#000'; x.fillRect(1, 2, 3, 1); x.fillRect(3, 3, 1, 2); x.fillRect(4, 5, 3, 1); x.fillRect(6, 1, 1, 3); });
  t.metal = mk((x) => { x.fillStyle = '#3a3c40'; x.fillRect(0, 0, 8, 8); x.fillStyle = '#5a5c62'; x.fillRect(0, 0, 8, 1); x.fillRect(1, 1, 1, 1); x.fillRect(6, 6, 1, 1); });
  t.vent = mk((x) => { x.fillStyle = '#2a2c30'; x.fillRect(0, 0, 8, 8); x.fillStyle = '#6a6c72'; for (let i = 1; i < 8; i += 2) x.fillRect(1, i, 6, 1); });
  // back wall pattern 16x16
  const b = document.createElement('canvas'); b.width = 16; b.height = 16; const bx = b.getContext('2d');
  bx.fillStyle = pal.back; bx.fillRect(0, 0, 16, 16); bx.fillStyle = pal.back2;
  if (kind === 'urban' || kind === 'lobby') { for (let r = 0; r < 4; r++) { bx.fillRect(0, r * 4, 16, 1); const o = r % 2 ? 0 : 4; bx.fillRect(o, r * 4, 1, 4); bx.fillRect(o + 8, r * 4, 1, 4); } }
  else if (kind === 'quarantine') { bx.fillRect(0, 0, 16, 1); bx.fillRect(0, 8, 16, 1); bx.fillRect(0, 0, 1, 16); bx.fillRect(8, 0, 1, 16); bx.fillStyle = NE.shade(pal.back, 1.15); bx.fillRect(2, 2, 2, 1); }
  else if (kind === 'flooded') { bx.fillRect(0, 0, 16, 1); bx.fillRect(0, 0, 1, 16); bx.fillStyle = NE.shade(pal.back, 1.4); bx.fillRect(2, 2, 1, 1); bx.fillRect(13, 2, 1, 1); bx.fillRect(2, 13, 1, 1); bx.fillRect(13, 13, 1, 1); }
  else { bx.fillRect(0, 12, 16, 1); bx.fillStyle = NE.shade(pal.back, 1.2); for (let i = 0; i < 6; i++) bx.fillRect(Math.floor(NE.hash(i, 5) * 16), Math.floor(NE.hash(5, i) * 12), 1, 1); }
  t.back = b; return t;
}
World.prototype.texFor = function (biome) { const k = biome.id; if (!this.tex[k]) this.tex[k] = makeTex(biome.pal, k); return this.tex[k]; };
World.prototype.draw = function (ctx, cx, cy, time) {
  const VW = NE.VW, VH = NE.VH; const tx0 = Math.floor(cx / T) - 1, ty0 = Math.floor(cy / T) - 1, tx1 = tx0 + Math.ceil(VW / T) + 2, ty1 = ty0 + Math.ceil(VH / T) + 2;
  // back walls per floor band
  let lastF = null;
  for (let ty = ty0; ty <= ty1; ty++) {
    const fl = this.floorOf(Math.max(0, ty)); if (!fl) continue; const tex = this.texFor(fl.biome);
    if (fl !== lastF) { lastF = fl; }
    const pat = tex._pat || (tex._pat = ctx.createPattern(tex.back, 'repeat'));
    ctx.save(); ctx.fillStyle = pat; ctx.fillRect(tx0 * T, ty * T, (tx1 - tx0 + 1) * T, T); ctx.restore();
  }
  // decor
  for (const fl of this.visibleFloors(cy)) for (const d of fl.decor) NE.drawDecor(ctx, d, fl.biome.pal, time);
  // tiles
  for (let ty = ty0; ty <= ty1; ty++) {
    const fl = this.floorOf(Math.max(0, ty)); if (!fl) continue; const tex = this.texFor(fl.biome); const pal = fl.biome.pal;
    for (let tx = tx0; tx <= tx1; tx++) {
      const t = this.get(tx, ty); if (t === 0) continue; const px = tx * T, py = ty * T; const v = Math.floor(NE.hash(tx, ty) * 4);
      if (t === 1) { ctx.drawImage(tex.solid[v], px, py); if (!this.solid(this.get(tx, ty - 1))) { ctx.fillStyle = pal.edge; ctx.fillRect(px, py, 8, 1); } if (!this.solid(this.get(tx, ty + 1))) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(px, py + 7, 8, 1); } }
      else if (t === 6) { const cr = this.crumble.get(tx + ',' + ty) || 0; ctx.drawImage(tex.crumble[v], px + (cr > 0 ? (Math.random() - 0.5) * cr * 2 : 0), py); }
      else if (t === 7) ctx.drawImage(tex.vent[0], px, py);
      else if (t === 8) ctx.drawImage(tex.metal[0], px, py);
      else if (t === 2) { ctx.fillStyle = pal.plat; ctx.fillRect(px, py, 8, 2); ctx.fillStyle = NE.shade(pal.plat, 0.6); ctx.fillRect(px, py + 2, 8, 1); if (tx % 3 === 0) ctx.fillRect(px + 1, py + 3, 1, 3); }
      else if (t === 3) { ctx.fillStyle = pal.ladder; ctx.fillRect(px + 1, py, 1, 8); ctx.fillRect(px + 6, py, 1, 8); ctx.fillRect(px + 1, py + 2, 6, 1); ctx.fillRect(px + 1, py + 6, 6, 1); }
      else if (t === 4) { ctx.fillStyle = '#9ab8c0'; for (let i = 0; i < 4; i++) { const sx = Math.floor(NE.hash(tx * 4 + i, ty) * 7); ctx.fillRect(px + sx, py + 7 - (i % 2), 1, 1 + (i % 2)); } if ((time * 3 + tx) % 4 < 0.3) { ctx.fillStyle = '#fff'; ctx.fillRect(px + 3, py + 6, 1, 1); } }
    }
  }
};
World.prototype.drawWater = function (ctx, cx, cy, time) {
  const tx0 = Math.floor(cx / T) - 1, ty0 = Math.floor(cy / T) - 1, tx1 = tx0 + Math.ceil(NE.VW / T) + 2, ty1 = ty0 + Math.ceil(NE.VH / T) + 2;
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    if (this.get(tx, ty) !== 5) continue; const px = tx * T, py = ty * T; const top = this.get(tx, ty - 1) !== 5;
    ctx.fillStyle = 'rgba(30,60,70,0.55)'; ctx.fillRect(px, py, 8, 8);
    if (top) { ctx.fillStyle = 'rgba(140,190,200,0.6)'; const w = Math.sin(time * 2 + tx * 0.9) > 0 ? 1 : 0; ctx.fillRect(px, py + w, 8, 1); }
  }
};
World.prototype.visibleFloors = function (cy) { if (this.lobby) return this.floors; const a = Math.floor(cy / T / NE.FH) - 1; return this.floors.slice(Math.max(0, a), a + 4); };

NE.drawDecor = function (ctx, d, pal, time) {
  const c1 = NE.shade(pal.back, 1.6), c2 = NE.shade(pal.back, 2.2), c0 = NE.shade(pal.back, 0.7); const x = Math.round(d.x), y = Math.round(d.y);
  switch (d.k) {
    case 'car': ctx.fillStyle = c1; ctx.fillRect(x, y - 7, 24, 5); ctx.fillRect(x + 5, y - 11, 13, 4); ctx.fillStyle = c0; ctx.fillRect(x + 7, y - 10, 4, 3); ctx.fillRect(x + 12, y - 10, 4, 3); ctx.fillStyle = '#111'; ctx.fillRect(x + 3, y - 2, 4, 2); ctx.fillRect(x + 17, y - 2, 4, 2); break;
    case 'window': ctx.fillStyle = c0; ctx.fillRect(x, y - 52, 12, 14); ctx.fillStyle = c1; ctx.fillRect(x, y - 52, 12, 1); ctx.fillRect(x + 5, y - 52, 1, 14); ctx.fillRect(x, y - 46, 12, 1); break;
    case 'sign': ctx.fillStyle = c1; ctx.fillRect(x, y, 22, 6); ctx.fillStyle = c2; ctx.fillRect(x + 2, y + 2, 18, 2); break;
    case 'rubble': ctx.fillStyle = c1; ctx.fillRect(x, y - 3, 10, 3); ctx.fillRect(x + 3, y - 5, 5, 2); ctx.fillStyle = c2; ctx.fillRect(x + 2, y - 3, 1, 1); break;
    case 'tarp': ctx.fillStyle = 'rgba(160,190,140,0.25)'; ctx.fillRect(x, y - 40, 8, 40); ctx.fillStyle = 'rgba(160,190,140,0.4)'; for (let i = 0; i < 40; i += 6) ctx.fillRect(x, y - 40 + i, 8, 1); break;
    case 'bio': ctx.fillStyle = '#6a6a20'; ctx.fillRect(x, y - 40, 9, 9); ctx.fillStyle = '#1a1a10'; ctx.fillRect(x + 4, y - 38, 1, 5); ctx.fillRect(x + 2, y - 36, 5, 1); break;
    case 'gurney': ctx.fillStyle = c2; ctx.fillRect(x, y - 6, 16, 2); ctx.fillStyle = c1; ctx.fillRect(x + 1, y - 4, 1, 4); ctx.fillRect(x + 14, y - 4, 1, 4); break;
    case 'pipes': ctx.fillStyle = c1; ctx.fillRect(x - 40, y - 60, 120, 3); ctx.fillStyle = c0; ctx.fillRect(x - 40, y - 57, 120, 1); ctx.fillStyle = c2; ctx.fillRect(x + 10, y - 61, 3, 5); break;
    case 'machine': ctx.fillStyle = c1; ctx.fillRect(x, y - 20, 18, 20); ctx.fillStyle = c0; ctx.fillRect(x + 2, y - 18, 14, 6); ctx.fillStyle = (time * 2 | 0) % 2 ? '#a03020' : c0; ctx.fillRect(x + 3, y - 10, 2, 2); break;
    case 'tank': ctx.fillStyle = c1; ctx.fillRect(x, y - 28, 14, 28); ctx.fillStyle = c2; ctx.fillRect(x + 2, y - 26, 1, 24); break;
    case 'reactor': ctx.fillStyle = c1; ctx.fillRect(x, y - 36, 20, 36); ctx.fillStyle = 'rgba(120,255,140,' + (0.2 + Math.sin(time * 2) * 0.1) + ')'; ctx.fillRect(x + 6, y - 30, 8, 24); break;
    case 'blast': ctx.fillStyle = c1; ctx.fillRect(x, y - 30, 22, 30); ctx.fillStyle = '#6a5a20'; for (let i = 0; i < 22; i += 4) ctx.fillRect(x + i, y - 30, 2, 2); ctx.fillStyle = c0; ctx.fillRect(x + 10, y - 30, 2, 30); break;
    case 'console': ctx.fillStyle = c1; ctx.fillRect(x, y - 10, 14, 10); ctx.fillStyle = '#2a6a3a'; ctx.fillRect(x + 2, y - 8, 10, 4); break;
    case 'crates': ctx.fillStyle = '#4a3a28'; ctx.fillRect(x, y - 8, 8, 8); ctx.fillRect(x + 9, y - 8, 8, 8); ctx.fillRect(x + 4, y - 16, 8, 8); ctx.fillStyle = '#2a2016'; ctx.fillRect(x, y - 8, 8, 1); ctx.fillRect(x + 9, y - 8, 8, 1); ctx.fillRect(x + 4, y - 16, 8, 1); break;
  }
};

// raycast light polygon (world coords)
NE.lightPoly = function (world, x, y, r, a0, a1, n) {
  const pts = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; const dx = Math.cos(a), dy = Math.sin(a); const d = Math.min(r, world.ray(x, y, dx, dy, r) + 3); pts.push([x + dx * d, y + dy * d]); }
  return pts;
};
})(window.NE);
