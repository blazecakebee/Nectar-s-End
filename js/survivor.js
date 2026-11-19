// Nectar's End — random human survivors, anatomy simulation, inventory, ragdoll drawing, fading-ink portrait
(function (NE) {
'use strict';
const { ri, rf, pick, clamp, chance, lerp } = NE;

NE.SKIN = ['#f3d5bb', '#e9c09c', '#d6a47b', '#b97f55', '#93603e', '#6a4128', '#4a2c1a'];
NE.HAIRC = ['#141010', '#2e1e14', '#5a3820', '#8a5a30', '#c49050', '#e0c080', '#8a8a86', '#d8d6d0', '#7a2e18', '#3a2a40'];

NE.SHIRTS = ['#6a4a3a', '#4a5a6a', '#7a6a4a', '#5a3a3a', '#3a4a3a', '#8a7a6a', '#5a5a5a', '#7a3a2a', '#2a3a5a', '#6a6a3a', '#7a5a6a', '#3a5a5a'];
NE.PANTS = ['#3a3a4a', '#4a3a2a', '#2a2a2a', '#5a5048', '#33404a', '#4a4a3a'];

NE.EYEC = ['#4a2e1a', '#6a4424', '#3a5a8a', '#4a7a4a', '#7a7a8a', '#2a2a2a', '#8a6a3a'];
NE.makeSurvivor = function () {
  const occ = pick(NE.OCCUPATIONS);
  const goods = NE.TRAITS.filter(t => t.good === true), bads = NE.TRAITS.filter(t => t.good === false), mixed = NE.TRAITS.filter(t => t.good === null);
  const traits = [pick(goods), pick(bads)]; if (chance(0.4)) traits.push(pick(mixed)); if (chance(0.25)) { const g2 = pick(goods); if (!traits.includes(g2)) traits.push(g2); }
  const age = ri(19, 63); const sex = chance(0.5) ? 'f' : 'm';
  let hairCol = ri(0, NE.HAIRC.length - 1); if (age > 50 && chance(0.6)) hairCol = chance(0.5) ? 6 : 7;
  let hair = pick(sex === 'f' ? NE.HAIR_F : NE.HAIR_M); if (sex === 'm' && age > 48 && chance(0.35)) hair = pick(['bald', 'buzz', 'crew']);
  const look = {
    sex, skin: ri(0, NE.SKIN.length - 1), hair, hairCol, facial: sex === 'm' ? pick(['none', 'none', 'stubble', 'beard', 'mustache', 'goatee']) : 'none',
    build: pick(['thin', 'avg', 'avg', 'broad']), scar: chance(0.25), jaw: ri(0, 2), nose: ri(0, 2), brow: ri(0, 2), eyes: ri(0, 2), eyeCol: ri(0, NE.EYEC.length - 1),
    shirt: pick(NE.SHIRTS), pants: pick(NE.PANTS), freckles: chance(0.2), glasses: chance(0.13), blush: chance(0.5), earring: sex === 'f' ? chance(0.4) : chance(0.12), seed: ri(1, 99999),
  };
  const first = pick(sex === 'f' ? NE.FIRST_F : NE.FIRST_M), last = pick(NE.LAST);
  return { first, last, name: first + ' ' + last, age, occ: occ.id, traits: traits.map(t => t.id), look, tears: 0 };
};

const ADD = new Set(['stamina', 'carry', 'painTol', 'slots', 'craft', 'clot']);
function applyMods(s, m) { if (!m) return; for (const k in m) { if (k === 'lungs') s.lungs = m[k]; else if (ADD.has(k)) s[k] += m[k]; else s[k] = (s[k] == null ? 1 : s[k]) * m[k]; } }
// climbing gait: each hand snaps up to a new hold (fast reach), then slides down relative to the body as you pull up;
// legs do the same half a cycle later. Running climbPh backwards plays it as a descent.
NE.climbLimbs = function (ph, wall) { const TAU = Math.PI * 2; const fr = t => ((t % 1) + 1) % 1;
  const limb = (t, lo, hi, x0, pull) => { if (t < 0.32) { const k = t / 0.32, e = k * k * (3 - 2 * k); return [x0 - Math.sin(k * Math.PI) * pull, lo + (hi - lo) * e, Math.sin(k * Math.PI)]; } const k = (t - 0.32) / 0.68; return [x0, hi + (lo - hi) * k, 0]; };
  const t = fr(ph / TAU); const hx = wall ? 3.3 : 0, fx = wall ? 2.8 : 0;
  const h1 = limb(t, -10.5, -17.2, hx, 1.6), h2 = limb(fr(t + 0.5), -10.5, -17.2, hx, 1.6);
  const f1 = limb(fr(t + 0.5), -0.3, -4.6, fx, 1.2), f2 = limb(t, -0.3, -4.6, fx, 1.2);
  return { h1, h2, f1, f2, k1: (f1[1] + 0.3) / -4.3 * 1.6, k2: (f2[1] + 0.3) / -4.3 * 1.6, bob: Math.cos(t * TAU * 2) * 0.45 }; };
NE.computeStats = function (meta, surv) {
  const s = { speed: 1, stamina: 0, staminaCost: 1, fall: 1, noise: 1, climb: 1, gas: 1, sight: 1, aim: 1, tox: 1, rad: 1, infect: 1, bleed: 1, painTol: 0, fracture: 1, hunger: 1, thirst: 1, cold: 1, melee: 1, carry: 0, slots: 0, stress: 1, barter: 1, treat: 1, search: 1, loot: 1, coldblood: false, medEff: 1, battery: 1, craft: 0, lungs: 100, heat: 1 };
  const P = (meta && meta.perks) || {}; const r = id => P[id] || 0;
  s.speed += r('movement') * 0.025; s.staminaCost -= r('movement') * 0.03;
  s.fall -= r('agility') * 0.07; s.noise -= r('agility') * 0.06; s.climb += r('agility') * 0.07;
  s.stamina += r('cardio') * 10; s.gas -= r('cardio') * 0.1;
  s.sight += r('eyesight') * 0.1; s.loot += r('eyesight') * 0.2;
  const tl = r('tolerance'); s.tox -= tl * 0.07; s.rad -= tl * 0.07; s.infect -= tl * 0.07; s.bleed -= tl * 0.04;
  s.treat -= r('medicine') * 0.07; s.medEff += r('medicine') * 0.07;
  const en = r('endurance'); s.painTol += en * 6; s.fracture -= en * 0.06; s.hunger -= en * 0.04; s.thirst -= en * 0.04; s.cold -= en * 0.05;
  s.melee += r('strength') * 0.05; s.carry += r('strength') * 2;
  s.search -= r('scavenger') * 0.08; s.loot += r('scavenger') * 0.15;
  const ps = r('psychology'); s.stress -= ps * 0.08; s.aim -= ps * 0.04; s.barter -= ps * 0.04;
  s.coldblood = r('coldblood') > 0;
  s.bleed -= r('clotting') * 0.05; s.clot = r('clotting') * 0.2; s.hpMul = 1 + r('vitality') * 0.05;
  s.parkour = 1 + r('parkour') * 0.08; s.runSpeed = 1 + r('sprinter') * 0.03; s.runCost = 1 - r('sprinter') * 0.05;
  s.pick = 1 + r('nimble') * 0.08; s.search -= r('nimble') * 0.04; s.battery *= 1 + r('lantern') * 0.15; s.lamp = 1 + r('lantern') * 0.07;
  s.stress -= r('composure') * 0.07; s.wake = 1 + r('composure') * 0.1; s.barter -= r('barter') * 0.05; s.post = 1 + r('barter') * 0.07;
  s.swing = 1 + r('brawler') * 0.06; s.slots += r('packmule') + r('organizer'); s.carry += r('packmule') * 1.5 + r('hauler') * 2; s.encTol = r('hauler') * 0.05; s.stackMul = 1 + r('organizer') * 0.15;
  // overlapping trees can't stack into near-immunity
  s.search = Math.max(0.6, s.search); s.stress = Math.max(0.5, s.stress); s.barter = Math.max(0.75, s.barter); s.treat = Math.max(0.6, s.treat); s.bleed = Math.max(0.55, s.bleed); s.staminaCost = Math.max(0.7, s.staminaCost);
  if (surv) {
    const occ = NE.OCCUPATIONS.find(o => o.id === surv.occ); if (occ) applyMods(s, occ.mods);
    for (const t of surv.traits) { const tr = NE.TRAITS.find(x => x.id === t); if (tr) applyMods(s, tr.mods); }
  }
  if (meta) {
    const of = NE.OUTFITS.find(o => o.id === meta.equipped.outfit); if (of) applyMods(s, of.mods);
    const bp = NE.BACKPACKS.find(o => o.id === meta.equipped.backpack) || NE.BACKPACKS[0];
    s.slots += bp.slots + 8; s.carry += bp.carry + 6; // +8 base slots, +6kg on every pack
    s.medHalf = bp.id === 'paramedic' || !!bp.medHalf; if (bp.mods) applyMods(s, bp.mods);
  }
  return s;
};

// ---------------- Inventory ----------------
class Inv {
  // Tarkov-style grid: COLS wide, rows from the pack's slot count (2 cells per slot). Every entry has gx, gy and rot.
  constructor(slots, carry) { this.items = []; this.slots = slots; this.carry = carry; this.medHalf = false; }
  get cols() { return 8; }
  get rows() { return Math.max(4, 4 + Math.floor((this.slots - 20) / 3)); } // starting rucksack 10x4 = 40 cells; each better pack adds a row or more
  dims(e, rot) { const s = NE.isize(e.id); return (rot != null ? rot : e.rot) ? [s[1], s[0]] : [s[0], s[1]]; }
  occupied(skip) { const C = this.cols, g = new Uint8Array(C * this.rows); for (const e of this.items) { if (e === skip || e.gx == null) continue; const [w, h] = this.dims(e); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = (e.gy + y) * C + e.gx + x; if (k < g.length) g[k] = 1; } } return g; }
  fits(x, y, w, h, skip, occ) { if (x < 0 || y < 0 || x + w > this.cols || y + h > this.rows) return false; occ = occ || this.occupied(skip); for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (occ[(y + yy) * this.cols + x + xx]) return false; return true; }
  findSpot(e, skip) { const occ = this.occupied(skip); for (const rot of [0, 1]) { const [w, h] = this.dims(e, rot); if (rot && w === h) continue; for (let y = 0; y <= this.rows - h; y++) for (let x = 0; x <= this.cols - w; x++) if (this.fits(x, y, w, h, skip, occ)) return { x, y, rot }; } return null; }
  place(e) { const s = this.findSpot(e); if (!s) return false; e.gx = s.x; e.gy = s.y; e.rot = s.rot; this.items.push(e); return true; }
  canFit(id) { return !!this.findSpot({ id }); }
  // re-pack everything (after loading an old save, or when the pack size changes); returns what no longer fits
  relayout() { const all = this.items.slice().sort((a, b) => { const A = NE.isize(a.id), B = NE.isize(b.id); return B[0] * B[1] - A[0] * A[1]; }); this.items = []; const out = []; for (const e of all) { e.gx = e.gy = null; e.rot = 0; if (!this.place(e)) out.push(e); } return out; }
  // keep saved positions when they're still valid, otherwise re-pack
  restore(list) { this.items = list || []; const C = this.cols; let ok = this.items.every(e => e.gx != null); if (ok) { const g = new Uint8Array(C * this.rows); for (const e of this.items) { const [w, h] = this.dims(e); if (e.gx + w > C || e.gy + h > this.rows) { ok = false; break; } for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = (e.gy + y) * C + e.gx + x; if (g[k]) ok = false; g[k] = 1; } } } return ok ? [] : this.relayout(); }
  occupiedOf(list) { const C = this.cols, g = new Uint8Array(C * this.rows); for (const e of list) { const [w, h] = this.dims(e); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) g[(e.gy + y) * C + e.gx + x] = 1; } return g; }
  move(e, x, y, rot) { const [w, h] = this.dims(e, rot); if (!this.fits(x, y, w, h, e)) return false; e.gx = x; e.gy = y; e.rot = rot; return true; }
  get usedCells() { let n = 0; for (const e of this.items) { const s = NE.isize(e.id); n += s[0] * s[1]; } return n; }
  weight() { let w = 0; for (const e of this.items) { const it = NE.ITEMS[e.id]; let x = it.stack ? it.w * e.n : it.w; if (this.medHalf && it.cat === 'med') x *= 0.5; w += x; } return w; }
  count(id) { let n = 0; for (const e of this.items) if (e.id === id) n += e.n; return n; }
  has(id) { return this.count(id) > 0; }
  find(id) { return this.items.find(e => e.id === id); }
  add(id, n, extra) {
    n = n == null ? 1 : n; const it = NE.ITEMS[id]; if (!it) return n;
    if (it.stack) { const cap = Math.round(it.stack * (this.stackMul || 1));
      for (const e of this.items) if (e.id === id && e.n < cap) { const k = Math.min(n, cap - e.n); e.n += k; n -= k; if (!n) return 0; }
      while (n > 0) { const k = Math.min(n, cap); if (!this.place({ id, n: k })) break; n -= k; }
      return n;
    }
    while (n > 0) { const e = { id, n: it.uses || 1 }; if (it.dur) e.dur = it.dur; if (it.gun) e.mag = 0; Object.assign(e, extra || {}); if (!this.place(e)) break; n--; }
    return n;
  }
  addEntry(e) { const it = NE.ITEMS[e.id]; if (it.stack) { const left = this.add(e.id, e.n); if (left) { e.n = left; return false; } return true; } e.gx = e.gy = null; return this.place(e); }
  consume(id, n) {
    n = n == null ? 1 : n; if (this.count(id) < n) return false;
    for (let i = this.items.length - 1; i >= 0 && n > 0; i--) { const e = this.items[i]; if (e.id !== id) continue; const k = Math.min(n, e.n); e.n -= k; n -= k; if (e.n <= 0) this.items.splice(i, 1); }
    return true;
  }
  remove(e) { const i = this.items.indexOf(e); if (i >= 0) this.items.splice(i, 1); }
}
NE.Inv = Inv;

// ---------------- Anatomy ----------------
const PARTS = NE.PARTS = ['head', 'torso', 'larm', 'rarm', 'lleg', 'rleg'];
NE.PART_NAMES = { head: 'Head', torso: 'Torso', larm: 'Left Arm', rarm: 'Right Arm', lleg: 'Left Leg', rleg: 'Right Leg' };
const PMAX = { head: 60, torso: 120, larm: 70, rarm: 70, lleg: 80, rleg: 80 };
const WT = NE.WOUNDS = {
  cut: { name: 'Cut', bleed: [0.25, 0.7], clot: 22, pain: 5 },
  lac: { name: 'Laceration', bleed: [0.9, 2.0], clot: 70, pain: 12 },
  punct: { name: 'Puncture', bleed: [0.6, 1.5], clot: 60, pain: 13 },
  art: { name: 'Arterial Bleed', bleed: [8, 12], clot: 0, pain: 16 },
  gsw: { name: 'Gunshot Wound', bleed: [1.4, 3], clot: 150, pain: 20 },
  bite: { name: 'Bite', bleed: [0.5, 1.4], clot: 55, pain: 12 },
  burn: { name: 'Burn', bleed: [0, 0], clot: 1, pain: 11 },
  bruise: { name: 'Bruise', bleed: [0, 0], clot: 1, pain: 4 },
};
const limb = p => p !== 'head' && p !== 'torso';

class Anatomy {
  constructor(o) {
    o = o || {}; this.npc = !!o.npc; this.s = o.stats || NE.computeStats(null, null); this.hpMul = o.hpMul || 1;
    this.parts = {}; for (const p of PARTS) { const m = PMAX[p] * this.hpMul; this.parts[p] = { hp: m, max: m, wounds: [], frac: false, splint: false, fracT: 0, bandage: null, tq: false, tqT: 0 }; }
    this.org = { brain: 100, eyes: 100, lungs: this.s.lungs || 100, heart: 100, stomach: 100, liver: 100 };
    this.blood = 5000; this.pain = 0; this.painSpike = 0; this.cons = 100; this.stam = 100; this.hunger = 100; this.thirst = 100; this.temp = 37;
    this.infection = 0; this.rad = 0; this.tox = 0; this.wet = 0; this.stress = 0; this.bpm = 72; this.gas = 0;
    this.drugs = { painkiller: 0, morphine: 0, antibiotic: 0, antirad: 0, adrenaline: 0, blood: 0, herb: 0 };
    this.uncon = false; this.dead = false; this.cause = ''; this.lastHit = ''; this.flags = {}; this.ev = [];
  }
  get stamMax() { return Math.max(30, (100 + this.s.stamina) * (0.4 + 0.6 * this.org.lungs / 100) * (this.blood > 3800 ? 1 : 0.7)); }
  get threshold() { return 60 + this.s.painTol + (this.s.coldblood ? 10 : 0); }
  bleedRate() {
    let tot = 0;
    for (const p of PARTS) { const P = this.parts[p]; for (const w of P.wounds) { if (w.closed) continue; tot += this.woundBleed(P, w, p); } }
    let m = this.s.bleed; if (this.s.coldblood && this.stress > 40) m *= 0.8; return tot * m;
  }
  woundBleed(P, w, p) { if (P.prost) return 0;
    if (w.closed) return 0; let b = w.bleed;
    if (P.tq && limb(p)) return 0;
    if (P.bandage) b *= w.t === 'art' ? 0.55 : (1 - 0.85 * P.bandage.q * (1 - P.bandage.soak * 0.8));
    return b;
  }
  partBleed(p) { const P = this.parts[p]; let t = 0; for (const w of P.wounds) t += this.woundBleed(P, w, p); return t * this.s.bleed; }
  damage(part, amt, kind, src) {
    if (this.dead) return; const P = this.parts[part]; const s = this.s; this.lastHit = src || this.lastHit;
    if (P.severed && P.prost) { if (kind !== 'fall' && amt > 4 && NE.Audio && this === (NE.G.player && NE.G.player.anat)) NE.Audio.play(P.prost.kind === 'peg' ? 'thud' : 'metal', 0.5); return; } // prosthetics don't bleed or bruise
    P.hp = Math.max(0, P.hp - amt); this.painSpike += amt * 0.8; this.stress += amt * 0.6;
    const add = (t, dirty, extra) => { const W = WT[t]; const w = Object.assign({ t, bleed: rf(W.bleed[0], W.bleed[1]) * clamp(0.5 + amt / 55, 0.5, 1.7), dirty: dirty || 0, inf: 0, closed: false, age: 0, bullet: false }, extra || {}); if (t === 'burn' || t === 'bruise') w.closed = true; P.wounds.push(w); if (P.wounds.length > 6) P.wounds.shift(); return w; };
    if (kind === 'sharp') { add(amt > 22 ? 'lac' : 'cut', 0.15); if (limb(part) && amt > 28 && chance(0.12)) { add('art', 0.1); this.ev.push('artery'); } else this.ev.push('bleed'); }
    else if (kind === 'bite') { add('bite', 0.65); this.ev.push('bleed'); }
    else if (kind === 'bullet') { add(amt < 25 ? 'punct' : 'gsw', 0.3, { bullet: chance(0.6) }); if (limb(part) && chance(amt > 80 ? 0.3 : amt > 45 ? 0.1 : 0.03)) { add('art', 0.2); this.ev.push('artery'); } else this.ev.push('bleed'); if (limb(part) && chance(0.25 * s.fracture)) this.fracture(part); }
    else if (kind === 'frag') { add('punct', 0.4, { bullet: chance(0.5) }); this.ev.push('bleed'); }
    else if (kind === 'burn') { add('burn', 0.25); }
    else if (kind === 'glass') { add('cut', 0.3, { bleed: rf(0.4, 1) }); this.ev.push('bleed'); }
    else { // blunt / fall / crush
      add('bruise', 0); const fc = Math.min(kind === 'fall' ? 0.35 : 0.25, (kind === 'fall' ? 0.016 * Math.max(0, amt - 10) : 0.008 * Math.max(0, amt - 14))) * s.fracture * (part === 'torso' ? 0.35 : part === 'head' ? 0.25 : 1);
      if (amt > 8 && chance(fc)) this.fracture(part);
      else if (limb(part) && !P.disl && !P.severed && amt > 9 && chance(Math.min(0.1, 0.004 * (amt - 9)) * (kind === 'fall' ? 1.5 : 1) * s.fracture)) this.dislocate(part);
      if (amt > 16 && chance(0.3)) add('lac', 0.2);
    }
    // organ damage
    if (part === 'head') { if (amt > 10) this.org.brain -= amt * (kind === 'bullet' ? 0.9 : 0.35); if (chance(0.15)) this.org.eyes -= amt * 0.5; if (P.hp <= 0) this.org.brain -= 40; }
    if (part === 'torso') { if (chance(kind === 'bullet' ? 0.8 : 0.35)) { const o = pick(['lungs', 'heart', 'stomach', 'liver', 'lungs', 'liver']); this.org[o] -= amt * (kind === 'bullet' ? 0.7 : 0.3); } if (P.hp <= 0) this.org.heart -= 20; }
    for (const k in this.org) this.org[k] = Math.max(0, this.org[k]);
  }
  dislocate(part) { const P = this.parts[part]; if (!P || P.disl || P.severed || !limb(part)) return; P.disl = true; this.painSpike += 18; this.ev.push('disl'); if (NE.Audio) NE.Audio.play('pop'); }
  fracture(part) { const P = this.parts[part]; if (P.frac) return; P.frac = true; P.splint = false; P.fracT = 0; this.painSpike += 22; this.ev.push('fracture'); if (NE.Audio) NE.Audio.play('crack'); }
  legFactor() {
    let f = 1; let broken = 0;
    let gone = 0; for (const p of ['lleg', 'rleg']) { const P = this.parts[p]; if (P.severed) { if (P.prost) { f *= P.prost.eff; continue; } gone++; broken++; f *= 0.4; continue; } if (P.frac) { broken++; f *= P.splint ? 0.85 : 0.55; } if (P.disl) f *= 0.6; f *= 0.6 + 0.4 * P.hp / P.max; }
    return { f, broken, crawl: gone > 0 || (broken === 2 && !(this.parts.lleg.splint && this.parts.rleg.splint)) };
  }
  armFactor() { let f = 1; for (const p of ['larm', 'rarm']) { const P = this.parts[p]; if (P.severed) { f *= P.prost ? P.prost.eff : 0.45; continue; } if (P.frac) f *= P.splint ? 0.8 : 0.5; if (P.disl) f *= 0.55; f *= 0.6 + 0.4 * P.hp / P.max; } return f; }
  tremor() { let t = Math.max(0, this.pain - this.threshold * 0.6) / 60 + Math.max(0, 35.5 - this.temp) * 0.4 + (this.s.coldblood ? 0 : Math.max(0, this.stress - 55) / 80) + this.drugs.adrenaline * 0.2; return clamp(t, 0, 1.6); }
  update(dt, env) {
    if (this.dead) return; const s = this.s; env = env || {};
    // ----- wounds & bleeding
    let bleed = 0, painW = 0, maxInf = 0, open = 0;
    for (const p of PARTS) {
      const P = this.parts[p];
      if (P.tq) { P.tqT += dt; if (P.tqT > 150) { P.hp = Math.max(0, P.hp - dt * 0.4); } }
      if (P.frac) { P.fracT += dt; if (P.splint && P.fracT > 300) { P.frac = false; P.splint = false; } }
      for (let i = P.wounds.length - 1; i >= 0; i--) {
        const w = P.wounds[i]; const W = WT[w.t];
        if (!w.closed) {
          const b = this.woundBleed(P, w, p); bleed += b; open++;
          if (P.bandage) P.bandage.soak = Math.min(1, P.bandage.soak + b * dt / 450);
          if (W.clot > 0 && !(P.tq && limb(p))) { w.bleed *= Math.exp(-dt / (W.clot / Math.max(0.4, 1 + (s.clot || 0)) * s.bleed * (P.bandage ? 0.45 : 1) * (w.bullet ? 2.5 : 1) * (s.amber ? 0.33 : 1))); if (w.bleed < (w.t === 'gsw' ? 0.05 : 0.14) && !w.bullet) { w.closed = true; w.bleed = 0; } }
        } else { w.age += dt; if (w.age > (w.t === 'bruise' ? 50 : w.t === 'burn' ? 160 : w.sutured ? 90 : 140) && w.inf < 20) { P.wounds.splice(i, 1); continue; } }
        if (env.dirtyWater && !P.bandage) w.dirty = Math.min(1, w.dirty + dt * 0.02);
        const bandClean = P.bandage && !P.bandage.dirty ? 0.4 : 1;
        if (w.dirty > 0) w.inf += dt * 0.03 * w.dirty * s.infect * bandClean * (env.infectMul || 1) * (s.amber ? 0.3 : 1);
        if (this.drugs.herb > 0) w.inf = Math.max(0, w.inf - dt * 0.15);
        if (this.drugs.antibiotic > 0) { w.inf = Math.max(0, w.inf - dt * 0.6); w.dirty = Math.max(0, w.dirty - dt * 0.01); }
        maxInf = Math.max(maxInf, w.inf);
        painW += W.pain * 0.7 * (w.closed ? 0.3 : 1) * (w.bullet ? 1.4 : 1);
      }
      if (P.frac) painW += P.splint ? 6 : 18; if (P.disl) painW += 14; if (P.severed && P.prost && P.prost.fitT != null) { P.prost.fitT += dt; if (P.prost.fitT < 120) painW += 6 * (1 - P.prost.fitT / 120); }
      painW += (1 - P.hp / P.max) * 12;
      if (P.tq) painW += 10 + Math.min(20, P.tqT / 8);
      if (P.bandage && P.wounds.length === 0) P.bandage = null;
      if (P.wounds.every(w => w.closed) && !this.npc && this.hunger > 20 && this.thirst > 20) P.hp = Math.min(P.max, P.hp + dt * 0.12 * (s.regen ? 3 : 1));
    }
    bleed *= s.bleed * (env.bleedMul || 1); if (s.coldblood && this.stress > 40) bleed *= 0.8;
    this.bleeding = bleed; this.blood -= bleed * dt;
    if (bleed < 0.05 && this.thirst > 15) this.blood = Math.min(5000, this.blood + dt * 0.6 * (s.heart ? 4 : 1) * (1 + (s.clot || 0)));
    if (this.drugs.blood > 0) this.blood = Math.min(5000, this.blood + dt * 8.5);
    this.infection = lerp(this.infection, maxInf, Math.min(1, dt)) ;
    // ----- drugs decay
    const dur = { painkiller: 120, morphine: 150, antibiotic: 200, antirad: 60, adrenaline: 40, blood: 118, herb: 90 };
    for (const k in this.drugs) if (this.drugs[k] > 0) this.drugs[k] = Math.max(0, this.drugs[k] - dt / dur[k]);
    // ----- pain
    this.painSpike *= Math.exp(-dt / 3);
    const relief = this.drugs.herb * 14 + this.drugs.painkiller * 30 + this.drugs.morphine * 70 + this.drugs.adrenaline * 25;
    let tp = painW + this.painSpike + (this.infection > 50 ? 10 : 0) + (100 - this.org.stomach) * 0.08 - relief;
    this.pain = lerp(this.pain, Math.max(0, tp), Math.min(1, dt * 2.5));
    // ----- survival needs (player only)
    if (!this.npc) {
      const mv = env.sprint ? 1.6 : 1;
      this.hunger = Math.max(0, this.hunger - dt * 100 / 1650 * s.hunger * mv * (s.heart ? 1.3 : 1));
      this.thirst = Math.max(0, this.thirst - dt * 100 / 1150 * s.thirst * mv * (this.temp > 38 ? 1.4 : 1) * (1 + (env.thirstMul ? env.thirstMul - 1 : 0) * s.heat));
      if (env.water) this.wet = 1; else this.wet = Math.max(0, this.wet - dt * (env.fire ? 0.08 : 0.008));
      let tt = 37 - (env.cold || 0) * 2.2 * s.cold - this.wet * 2.2 * s.cold * (env.cold ? 1 : 0.4);
      tt += (env.heat || 0) * 1.3 * s.heat; if (env.fire) tt = Math.max(tt, 37.4);
      if (this.infection > 35) tt += (this.infection - 35) / 18;
      if (this.blood < 3500) tt -= 1;
      this.temp = lerp(this.temp, tt, Math.min(1, dt * 0.012));
      // toxins
      if (this.tox > 0) { this.tox = Math.max(0, this.tox - dt * 0.6 * (this.org.liver / 100 + 0.2)); if (this.tox > 30) { this.org.stomach -= dt * 0.15; this.vomitT = (this.vomitT || 0) - dt; if (this.vomitT <= 0 && chance(dt * 0.08)) { this.vomitT = 12; this.thirst = Math.max(0, this.thirst - 10); this.hunger = Math.max(0, this.hunger - 8); this.ev.push('vomit'); } } if (this.tox > 60) this.org.liver -= dt * 0.25; }
      // radiation
      if (env.rad) this.rad += env.rad * dt * s.rad;
      this.rad = Math.max(0, this.rad - dt * (0.04 + this.drugs.antirad * 3));
      if (this.rad > 40) { const k = pick(['liver', 'stomach', 'heart', 'brain']); this.org[k] -= dt * (this.rad - 40) * 0.006; if (chance(dt * 0.01)) this.ev.push('rad'); }
      // gas
      this.gas = env.gas || 0;
      if (this.gas > 0) { this.org.lungs -= dt * 1.0 * this.gas * s.gas; this.org.eyes -= dt * 0.35 * this.gas * s.gas; this.stam -= dt * 12 * this.gas; if (chance(dt * 0.3)) this.ev.push('gas'); } else if (this.org.lungs < (s.lungs || 100)) this.org.lungs += dt * 0.05;
      if (this.infection > 70) { this.org.heart -= dt * 0.08; this.org.liver -= dt * 0.12; }
      if (this.thirst <= 0) this.org.stomach -= dt * 0.09; if (this.hunger <= 0) this.org.stomach -= dt * 0.07;
      const st = (env.dark ? 6 : 0) + (env.threat ? 14 : 0) + Math.max(0, this.pain - this.threshold) * 0.4 + (this.blood < 3800 ? 8 : 0);
      this.stress = clamp(lerp(this.stress, st * s.stress * 3.5, dt * 0.06), 0, 100);
    } else { this.stress = Math.max(0, this.stress - dt * 2); }
    for (const k in this.org) this.org[k] = clamp(this.org[k], 0, 100);
    // ----- stamina regen handled by actor, clamp
    this.stam = clamp(this.stam, 0, this.stamMax);
    // ----- consciousness
    const bp = this.blood / 5000; let tc = 100;
    if (bp < 0.75) tc -= (0.75 - bp) * 280;
    if (this.pain > this.threshold) tc -= (this.pain - this.threshold) * 1.4;
    tc -= (100 - this.org.brain) * 0.8;
    if (this.temp < 34.5) tc -= (34.5 - this.temp) * 18; if (this.temp > 40) tc -= (this.temp - 40) * 20;
    if (this.thirst <= 0) tc -= 25; if (this.hunger <= 0) tc -= 12;
    tc -= this.drugs.morphine * 12 + this.gas * 18 * s.gas; tc += this.drugs.adrenaline * 45; if (this.secondWind > 0) { this.secondWind -= dt; tc += 60; }
    this.cons = this.cons > tc ? Math.max(tc, this.cons - dt * 14) : Math.min(tc, this.cons + dt * 7 * (s.wake || 1));
    this.cons = clamp(this.cons, -20, 100);
    if (!this.uncon && this.cons <= 0) { this.uncon = true; this.ev.push('uncon'); }
    else if (this.uncon && this.cons > 22) { this.uncon = false; this.ev.push('wake'); }
    // ----- heart rate
    const tgt = 68 + this.pain * 0.45 + Math.max(0, 4200 - this.blood) * 0.03 + (100 - this.stam / this.stamMax * 100) * 0.35 + this.stress * 0.25 + this.drugs.adrenaline * 40 - (s.coldblood ? 12 : 0) + (this.temp > 38 ? 15 : 0);
    this.bpm = lerp(this.bpm, this.org.heart < 30 ? tgt + Math.sin(performance.now() / 137) * 25 : tgt, dt * 0.8);
    // ----- death
    const die = c => { if (!this.dead) { this.dead = true; this.cause = c; } };
    if (this.blood < (this.npc ? 2400 : 1800)) die(this.lastHit && this.npc ? this.lastHit : 'Bled out');
    else if (this.org.brain <= 0) die(this.lastHit ? 'Head trauma (' + this.lastHit + ')' : 'Brain trauma');
    else if (this.org.heart <= 0) die(this.infection > 70 ? 'Sepsis' : 'Cardiac failure');
    else if (this.org.lungs <= 0) die('Asphyxiation');
    else if (this.org.liver <= 0 || this.org.stomach <= 0) die(this.rad > 60 ? 'Radiation sickness' : this.thirst <= 0 ? 'Dehydration' : this.hunger <= 0 ? 'Starvation' : 'Organ failure');
    else if (this.temp < 30.5) die('Hypothermia');
    else if (this.npc && (this.parts.head.hp <= 0 || this.parts.torso.hp <= 0 || this.cons <= 0)) die(this.lastHit || 'Killed');
  }
  conditions() {
    const c = []; const b = this.bleeding || 0;
    if (b > 4) c.push(['Severe bleeding', 'bad']); else if (b > 1.2) c.push(['Bleeding', 'bad']); else if (b > 0.05) c.push(['Light bleeding', 'warn']);
    for (const p of PARTS) { const P = this.parts[p]; if (P.severed && limb(p)) c.push([P.prost ? (P.prost.name + ' (' + Math.round(P.prost.eff * 100) + '%)') : 'Missing ' + NE.PART_NAMES[p].toLowerCase(), P.prost ? 'good' : 'bad']); if (P.disl) c.push(['Dislocated ' + NE.PART_NAMES[p].toLowerCase(), 'bad']); if (P.frac) c.push([(P.splint ? 'Splinted ' : 'Broken ') + NE.PART_NAMES[p].toLowerCase(), P.splint ? 'warn' : 'bad']); if (P.tq) c.push(['Tourniquet: ' + NE.PART_NAMES[p] + ' (' + Math.floor(P.tqT) + 's)', P.tqT > 150 ? 'bad' : 'warn']); if (P.wounds.some(w => w.bullet)) c.push(['Lodged fragment: ' + NE.PART_NAMES[p], 'warn']); }
    const bp = this.blood / 5000; if (bp < 0.6) c.push(['Hypovolemic shock', 'bad']); else if (bp < 0.8) c.push(['Blood loss', 'warn']);
    if (this.pain > this.threshold) c.push(['Agonizing pain', 'bad']); else if (this.pain > this.threshold * 0.6) c.push(['In pain', 'warn']);
    if (this.temp < 35) c.push(['Hypothermia', 'bad']); else if (this.temp < 36) c.push(['Cold', 'warn']); if (this.temp > 38.3) c.push([this.infection > 35 ? 'Fever' : 'Overheating', 'warn']);
    if (this.infection > 70) c.push(['Sepsis', 'bad']); else if (this.infection > 30) c.push(['Infection', 'warn']);
    if (this.rad > 60) c.push(['Radiation sickness', 'bad']); else if (this.rad > 25) c.push(['Irradiated', 'warn']);
    if (this.tox > 30) c.push(['Nauseous', 'warn']); if (this.gas > 0) c.push(['Choking', 'bad']);
    if (this.hunger < 15) c.push(['Starving', 'bad']); else if (this.hunger < 35) c.push(['Hungry', 'warn']);
    if (this.thirst < 15) c.push(['Dehydrated', 'bad']); else if (this.thirst < 35) c.push(['Thirsty', 'warn']);
    if (this.org.brain < 70) c.push(['Concussed', 'warn']); if (this.org.eyes < 60) c.push(['Blurred vision', 'warn']); if (this.org.lungs < 60) c.push(['Damaged lungs', 'warn']);
    if (this.stress > 70) c.push(['Panicking', 'bad']); else if (this.stress > 45) c.push(['Stressed', 'warn']);
    for (const k in this.drugs) if (this.drugs[k] > 0) c.push([{ painkiller: 'Painkillers', morphine: 'Morphine', antibiotic: 'Antibiotics', antirad: 'Anti-Rad', adrenaline: 'Adrenaline', blood: 'Transfusion', herb: 'Herb' }[k] + ' active', 'good']);
    if (!c.length) c.push(['Stable', 'good']);
    return c;
  }
}
NE.Anatomy = Anatomy;
// untreated problems: open (unbandaged) wounds, unsplinted fractures, lodged fragments
NE.injuryCount = A => { let n = 0; for (const p of PARTS) { const P = A.parts[p]; if (P.severed) continue; const open = P.wounds.filter(w => !w.closed && w.t !== 'burn' && w.t !== 'bruise').length; if (open && !P.bandage) n += open; if (P.frac && !P.splint) n++; n += P.wounds.filter(w => w.bullet).length; } return n; };

// ---------------- Ragdoll ----------------
// 0 head,1 chest,2 pelvis,3 bElbow,4 bHand,5 fElbow,6 fHand,7 bKnee,8 bFoot,9 fKnee,10 fFoot
const BASE = [[0.5, -14], [0, -11], [0, -6.5], [-1, -8.2], [-1.6, -4.6], [1, -8.2], [1.6, -4.6], [-0.5, -3.3], [-1, 0], [0.5, -3.3], [1, 0]]; // arms reach a little lower: longer limbs, more swing
const LINKS = [[0, 1], [1, 2], [1, 3], [3, 4], [1, 5], [5, 6], [2, 7], [7, 8], [2, 9], [9, 10], [0, 2, 0.4], [1, 7, 0.15], [1, 9, 0.15]];
NE.RKX = 1.15; NE.RKY = 1.45; NE.HSTAND = 23; NE.HCROUCH = 17; NE.HCRAWL = 7;
NE.makeRag = function (phys, x, y) {
  const b = new NE.PBody('rag'); b.tiles = false; b.collide = false; b.noActor = true; b.damp = 0.97; b.fric = 0.6; b.bounce = 0.1;
  for (let i = 0; i < BASE.length; i++) b.point(x + BASE[i][0] * NE.RKX, y + BASE[i][1] * NE.RKY, i === 0 ? 3 : 1.6, i < 3 ? 1.6 : 1);
  for (const l of LINKS) b.link(l[0], l[1], l[2] == null ? 1 : l[2]);
  for (const c of b.cons) c.s0 = c.s;
  phys.add(b); return b;
};
NE.ragPose = function (a) {
  const f = a.facing; const P = BASE.map(p => [p[0], p[1]]); const ph = a.walkPh || 0; const s = Math.sin(ph), c = Math.cos(ph);
  const mv = Math.min(1, Math.abs(a.vx) / 55);
  if (a.crawl) {
    // continuous arm-over-arm drag: each hand reaches forward (lifted), plants, then hauls the body past it
    const arm = q => { const t = ((q % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2); const reach = t < 0.35; const k = reach ? t / 0.35 : (t - 0.35) / 0.65;
      const hx = reach ? lerp(1.5, 8.5, k) : lerp(8.5, 1.5, k); const hy = reach ? -Math.sin(k * Math.PI) * 2.2 : 0; return [[(hx + 3) * 0.5 + 1.5, -1.6 + hy * 0.4], [hx, hy]]; };
    const idle = mv < 0.05; const A1 = arm(ph), A2 = arm(ph + Math.PI); const heave = idle ? 0 : Math.sin(ph * 2) * 0.35;
    const dead = a.legsOut; // broken / severed legs trail limp behind
    const o = [[6.2 + heave, -2.6], [3 + heave, -2.4], [-2, -1.7], A2[0], idle ? [6, 0] : A2[1], A1[0], idle ? [5, 0] : A1[1],
      [-4.2, -1.1], dead ? [-8.2, -0.6] : [-7.4 + s * 0.8, -1.4 - Math.max(0, s) * 0.6], [-4, -1.2], dead ? [-8, -0.4] : [-7.4 - s * 0.8, -1.4 - Math.max(0, -s) * 0.6]];
    for (let i = 0; i < 11; i++) { P[i][0] = o[i][0]; P[i][1] = o[i][1]; }
  } else if (a.climbing) { // ladder/rope: hand over hand, one knee up while the other leg pushes (reverses going down)
    if (a.sliding) { P[0] = [0, -14.5]; P[1] = [0, -11.5]; P[3] = [-1, -14]; P[4] = [-0.8, -17]; P[5] = [1, -14]; P[6] = [0.8, -16.5]; P[7] = [-1.5, -4]; P[8] = [-0.5, -1]; P[9] = [1.5, -4]; P[10] = [0.5, -1]; }
    else { const L = NE.climbLimbs(a.climbPh || 0, 0); P[0] = [0.3, -14 + L.bob]; P[1] = [0.2, -11 + L.bob]; P[2] = [0, -6.5 + L.bob];
      P[3] = [-1.6, L.h1[1] * 0.5 - 6]; P[4] = [-1, L.h1[1]]; P[5] = [1.6, L.h2[1] * 0.5 - 6]; P[6] = [1, L.h2[1]];
      P[7] = [-1.4 + L.k1, (L.f1[1] - 6.5) / 2 - L.k1 * 0.6]; P[8] = [-0.8, L.f1[1]]; P[9] = [1.4 + L.k2, (L.f2[1] - 6.5) / 2 - L.k2 * 0.6]; P[10] = [0.8, L.f2[1]]; }
  } else if (a.crouch && !a.wallDown && !a.wallClimb) {
    P[0] = [1.2, -10]; P[1] = [0.6, -7.5]; P[2] = [-0.5, -4]; P[7] = [1.5, -3]; P[8] = [-1, 0]; P[9] = [2.5, -2.6]; P[10] = [1.5, 0];
    P[3] = [0, -5]; P[4] = [1, -3]; P[5] = [1.5, -5]; P[6] = [2.5, -3];
    if (mv > 0.1) { P[8][0] += s * 1.5; P[10][0] -= s * 1.5; }
  } else if (a.wallClimb || a.wallDown) { // crawling up (or down) the rock face: reach, grab, pull; knees frog up to find footholds
    const L = NE.climbLimbs(a.climbPh || 0, 1); P[0] = [1.9, -14.2 + L.bob]; P[1] = [1.3, -11.2 + L.bob]; P[2] = [0.5, -6.6 + L.bob];
    P[4] = [L.h1[0], L.h1[1]]; P[3] = [(L.h1[0] + 1.3) / 2 - 1.3, (L.h1[1] - 11) / 2 + 0.8]; P[6] = [L.h2[0], L.h2[1]]; P[5] = [(L.h2[0] + 1.3) / 2 - 1.3, (L.h2[1] - 11) / 2 + 0.8];
    P[8] = [L.f1[0], L.f1[1]]; P[7] = [2.2 + L.k1 * 0.6, (L.f1[1] - 6.6) / 2 - L.k1 * 0.8]; P[10] = [L.f2[0], L.f2[1]]; P[9] = [2.2 + L.k2 * 0.6, (L.f2[1] - 6.6) / 2 - L.k2 * 0.8];
  } else if (a.wallSliding) {
    P[3] = [1.5, -12]; P[4] = [2.5, -14]; P[5] = [2, -11]; P[6] = [3, -13.5]; P[7] = [1.5, -4.5]; P[8] = [2.5, -2]; P[9] = [0.5, -4]; P[10] = [0, -1]; P[0] = [-0.5, -14];
  } else if (a.inWater && !a.onGround) { // swimming: body tilts into the stroke, arms windmill, legs flutter-kick
    const sp = performance.now() / 160 * (Math.abs(a.vx) > 10 || a.vy < -20 ? 1.6 : 0.8); const sa = Math.sin(sp), ca = Math.cos(sp); const up = a.vy < -30;
    P[0] = [2.6, up ? -13.6 : -12.4]; P[1] = [1.6, -10.4]; P[2] = [-1.2, -6.6];
    P[5] = [2 + ca * 2.4, -10.5 + sa * 2.2]; P[6] = [3.6 + ca * 4.4, -10.8 + sa * 4.2]; P[3] = [2 - ca * 2.4, -10.5 - sa * 2.2]; P[4] = [3.6 - ca * 4.4, -10.8 - sa * 4.2];
    const k = Math.sin(sp * 2.2); P[7] = [-2.6, -4 + k * 0.8]; P[8] = [-5, -2.6 + k * 1.6]; P[9] = [-2.2, -4 - k * 0.8]; P[10] = [-4.6, -2.4 - k * 1.6];
  } else if (!a.onGround) {
    P[7] = [0.5, -4.5]; P[8] = [-0.5, -1.5]; P[9] = [1.5, -4]; P[10] = [1, -1]; P[3] = [-2, -10]; P[4] = [-3, -11.5]; P[5] = [2, -10]; P[6] = [3, -11.5];
  } else if (a.getUpT > 0.25) { // pushing up off the ground
    const k = (a.getUpT - 0.25) / 0.35; P[0] = [2.5 * k + 1, -10 + 5 * k]; P[1] = [1.5 * k + 0.6, -7.5 + 4 * k]; P[2] = [-0.5, -4 + 2 * k]; P[7] = [1.5, -3]; P[8] = [-1.2, 0]; P[9] = [2.5, -2.4]; P[10] = [1.5, 0]; P[3] = [1.5, -4 + 3 * k]; P[4] = [3, -0.5]; P[5] = [2.5, -4 + 3 * k]; P[6] = [4, 0];
  } else if (a.landT > 0) {
    const k = Math.min(1, a.landT / 0.14) * (a.landK || 1); P[0] = [0.8, -14 + 3 * k]; P[1] = [0.4, -11 + 2.6 * k]; P[2] = [-0.3, -6.5 + 2 * k]; P[7] = [0.8, -3.5 + k]; P[9] = [2, -3.3 + k]; P[8] = [-1.4, 0]; P[10] = [1.6, 0]; P[3] = [-1.5, -8]; P[4] = [-2.2, -5.5 + k]; P[5] = [1.6, -8]; P[6] = [2.4, -5.5 + k];
  } else if (a.dashT > 0) { // dash: dive forward, tuck and roll across the ground, come up on your feet
    const pr = 1 - a.dashT / (a.dashDur || 0.32);
    if (pr < 0.14) { const k = pr / 0.14; P[0] = [2 + 2.5 * k, -13 + 4 * k]; P[1] = [1.4 + 2 * k, -10 + 3.4 * k]; P[2] = [0, -6]; P[7] = [-1.5, -3.6]; P[8] = [-4.5, -0.6]; P[9] = [2.6, -3.8]; P[10] = [3.2, 0]; P[3] = [3, -7]; P[4] = [5.5, -5]; P[5] = [3.5, -7]; P[6] = [6, -5]; }
    else if (pr > 0.86) { const k = (pr - 0.86) / 0.14; P[0] = [1.8, -9 - 4 * k]; P[1] = [1.2, -7 - 3 * k]; P[2] = [-0.3, -4 - 2 * k]; P[7] = [1.5, -3]; P[8] = [-1, 0]; P[9] = [2.6, -2.6]; P[10] = [1.6, 0]; P[3] = [0.5, -5]; P[4] = [2, -3]; P[5] = [1.5, -5]; P[6] = [3, -3]; }
    else { const th = (pr - 0.14) / 0.72 * Math.PI * 2, c = Math.cos(th), sn = Math.sin(th); const cx = 0, cy = -3.6; // tucked ball spinning forward
      const B = [[1.2, -2.6], [0.6, -1.2], [-1.2, 1], [1.8, 0.2], [2.4, 1.6], [2, -0.6], [2.6, 0.8], [1, 1.8], [-1, 2.4], [1.6, 1.4], [-0.6, 2.6]];
      for (let i = 0; i < 11; i++) { const [x, y] = B[i]; P[i] = [cx + x * c - y * sn, cy + x * sn + y * c]; } }
  } else if (a.search && a.onGround) { // kneel at the container and dig through it
    const t = performance.now() / 1000, r1 = Math.sin(t * 7), r2 = Math.sin(t * 7 + 2.1);
    P[0] = [2.4 + r1 * 0.3, -10.2]; P[1] = [1.4, -7.8]; P[2] = [-0.6, -4.2]; P[7] = [1.6, -3]; P[8] = [-1.4, 0]; P[9] = [2.8, -2.4]; P[10] = [2.2, 0];
    P[5] = [3.2, -6.4]; P[6] = [5.2 + r1 * 1.2, -4.6 + Math.max(0, r1) * 1.6]; P[3] = [2.8, -6.6]; P[4] = [4.6 + r2 * 1.2, -4.8 + Math.max(0, r2) * 1.6];
  } else if (a.treating && (a.treating.part === 'lleg' || a.treating.part === 'rleg')) { // sit down to work on a leg: injured leg stretched out
    P[0] = [2.2, -9]; P[1] = [1.2, -6.6]; P[2] = [-0.8, -2.2]; const inj = (a.treating.part[0] === (f > 0 ? 'r' : 'l')) ? 9 : 7, oth = inj === 9 ? 7 : 9;
    P[inj] = [2.4, -1.4]; P[inj + 1] = [5.6, -0.4]; P[oth] = [2.2, -4]; P[oth + 1] = [2.8, 0];
    P[3] = [2, -4.5]; P[4] = [3.5, -2.5]; P[5] = [2.5, -4.5]; P[6] = [4, -2.5];
  } else if (a.exhausted && mv < 0.3) { // out of breath: bent over, hands on knees, shoulders heaving
    const h = Math.sin(performance.now() / 190) * 0.55; P[0] = [3.6, -10.8 + h]; P[1] = [2.4, -8.8 + h * 0.8]; P[2] = [0, -6.2]; P[7] = [0.6, -3.4]; P[8] = [-1, 0]; P[9] = [1.8, -3.3]; P[10] = [1.4, 0];
    P[3] = [2.2, -6.6 + h * 0.5]; P[4] = [1.4, -3.8]; P[5] = [3, -6.6 + h * 0.5]; P[6] = [2.4, -3.7];
  } else if (mv > 0.05) {
    // walk / run cycle: feet plant & lift, knees bend forward, arms counter-swing, body bobs; running leans in and pumps the arms
    const run = a.sprint && mv > 0.55; const amp = Math.min(1, mv * 1.4); const S = (run ? 5.2 : 3.8) * amp, Lf = (run ? 3 : 1.7) * amp;
    const leg = q => { const fx = Math.sin(q) * S; const sw = Math.max(0, Math.cos(q)); const fy = -sw * Lf; return [[fx * 0.45 + 0.7 + sw * (run ? 2 : 1.1), -3.5 + sw * Lf * 0.3], [fx, fy]]; };
    const F = leg(ph), B = leg(ph + Math.PI); P[9] = F[0]; P[10] = F[1]; P[7] = B[0]; P[8] = B[1];
    const bob = -Math.abs(Math.cos(ph)) * (run ? 0.8 : 0.5) + (run ? 0.5 : 0); const lean = run ? 2 : 0.45;
    P[0] = [0.5 + lean, -14 + bob]; P[1] = [lean * 0.7, -11 + bob]; P[2] = [0, -6.5 + bob * 0.6];
    const as = Math.sin(ph) * (run ? 2.8 : 2) * amp; const sx = lean * 0.7;
    if (run) { P[5] = [sx - as * 0.6 + 0.4, -9 + bob]; P[6] = [sx - as + 1.6, -7.8 + bob - Math.max(0, -as) * 0.6]; P[3] = [sx + as * 0.6 + 0.4, -9 + bob]; P[4] = [sx + as + 1.6, -7.8 + bob - Math.max(0, as) * 0.6]; }
    else { P[5] = [-as * 0.45 + 0.3, -8.5 + bob]; P[6] = [-as + 0.4, -5.6 + bob]; P[3] = [as * 0.45 - 0.3, -8.5 + bob]; P[4] = [as - 0.4, -5.6 + bob]; }
  } else { const br = Math.sin(performance.now() / 600) * 0.3; P[0][1] += br; P[1][1] += br * 0.6; }
  if (a.limp) { P[2][1] += 0.6; P[0][0] -= 0.4; }
  if (a.hunch && !a.crawl && !a.climbing) { P[0][0] += 2.2; P[0][1] += 2.2; P[1][0] += 1.3; P[1][1] += 1.2; P[3][0] += 1; P[5][0] += 1.5; P[4][1] += 1.5; P[6][1] += 1.5; }
  // convert to world with facing
  const out = P.map(p => [a.x + p[0] * f * NE.RKX, a.y + p[1] * NE.RKY]);
  // arms: aim / swing / treat
  const ch = out[1];
  if (!a.crawl && !a.climbing && a.treating && !a.dead) NE.treatArms(a, out, f);
  else if (!a.crawl && !a.climbing && !a.wallClimb && !a.wallDown && !(a.search && a.onGround) && !(a.dashT > 0)) {
    if (a.aimDir && a.gunOut) { const d = a.aimDir; out[6] = [ch[0] + d.x * 8, ch[1] + 1 + d.y * 8]; out[5] = [ch[0] + d.x * 4, ch[1] + d.y * 4 + 2]; if (a.twoHand) { out[4] = [ch[0] + d.x * 6, ch[1] + d.y * 6 + 1.5]; out[3] = [ch[0] + d.x * 2.5, ch[1] + 2.5]; } }
    else if (a.wdir) { const d = a.wdir, e = a.wext || 0; out[6] = [ch[0] + d.x * (9 + e), ch[1] + 1 + d.y * (9 + e)]; out[5] = [ch[0] + d.x * (4.6 + e * 0.5) - f * 0.3, ch[1] + 2 + d.y * (4.6 + e * 0.5)]; if (a.twoHand) { out[4] = [ch[0] + d.x * (7 + e), ch[1] + 1.5 + d.y * (7 + e)]; out[3] = [ch[0] + d.x * 3.2, ch[1] + 2.5 + d.y * 3.2]; } else if (a.guard) { out[4] = [ch[0] + f * 3.5, ch[1] - 1]; out[3] = [ch[0] + f * 1.5, ch[1] + 2.5]; } else { out[4] = [ch[0] + f * 3, ch[1] + 2.2]; out[3] = [ch[0] + f * 1, ch[1] + 3.5]; } } // off hand stays up in a fighting stance
    else if (a.swingT > 0) { const t = 1 - a.swingT / a.swingDur; const ang = lerp(-1.9, 0.8, Math.min(1, t * 1.6)); const dx = Math.cos(ang) * f, dy = Math.sin(ang); out[6] = [ch[0] + dx * 8.5, ch[1] + 1 + dy * 8.5]; out[5] = [ch[0] + dx * 4.2, ch[1] + 1 + dy * 4.2]; }
    else if (a.holdT > 0) { out[6] = [ch[0] + f * 4, ch[1] - 1]; }
  }
  if (a.aimDir && !a.crawl && !a.climbing && !a.wallClimb && !a.wallDown && !a.dead && !(a.dashT > 0)) { out[0][0] += a.aimDir.x * 0.5; out[0][1] += a.aimDir.y * 0.7; } // head follows where you look
  return out;
};
// self-treatment animations: hands go to the wound and move the way the job demands
NE.treatArms = function (a, out, f) {
  const tr = a.treating, now = performance.now() / 1000, prog = tr.dur ? tr.t / tr.dur : 0; const ch = out[1]; const fr = f > 0 ? 'r' : 'l';
  const it = tr.entry && NE.ITEMS[tr.entry.id]; const kind = tr.op || (it ? it.med : 'bandage'); const part = tr.part || 'torso';
  let tx, ty; // the spot being worked on
  if (part === 'head') { tx = out[0][0] + f; ty = out[0][1]; }
  else if (part === 'torso') { tx = ch[0] + f * 1.5; ty = ch[1] + 3; }
  else if (part.endsWith('leg')) { const i = part[0] === fr ? 9 : 7; tx = (out[i][0] + out[i + 1][0]) / 2; ty = (out[i][1] + out[i + 1][1]) / 2 - 0.5; }
  else { const front = part[0] === fr; const e = front ? 5 : 3, h = front ? 6 : 4; out[e] = [ch[0] + f * 2.5, ch[1] + 3]; out[h] = [ch[0] + f * 5.5, ch[1] + 3.5]; tx = ch[0] + f * 4; ty = ch[1] + 3.2;
    const o = front ? 4 : 6, oe = front ? 3 : 5; const m = NE.treatMotion(kind, now, prog); out[o] = [tx + m[0] * f, ty - 1 + m[1]]; out[oe] = [(ch[0] + out[o][0]) / 2, (ch[1] + out[o][1]) / 2 + 1]; return; }
  if (kind === 'drug') { const pill = it && it.drug !== 'blood' && it.drug !== 'adrenaline' && it.drug !== 'morphine'; if (pill) { tx = out[0][0] + f * 1.5; ty = out[0][1] + 2; } else { tx = ch[0] + f * 3.5; ty = ch[1] + 3.5; } }
  const m = NE.treatMotion(kind, now, prog);
  out[6] = [tx + m[0] * f, ty + m[1]]; out[4] = [tx - m[0] * f * 0.6 - f * 0.8, ty - m[1] * 0.6 + 0.5];
  out[5] = [(ch[0] + out[6][0]) / 2 + f * 0.4, (ch[1] + out[6][1]) / 2 + 1]; out[3] = [(ch[0] + out[4][0]) / 2, (ch[1] + out[4][1]) / 2 + 1];
};
NE.treatMotion = function (kind, t, prog) {
  switch (kind) {
    case 'bandage': return [Math.cos(t * 9) * 1.6, Math.sin(t * 9) * 1.6]; // wrapping round and round
    case 'tq': { const c = Math.max(0, Math.sin(t * 5)); return [c * 2.5, -c * 1.5]; } // haul on the strap
    case 'suture': return [Math.sin(t * 14) * 0.6, -Math.abs(Math.sin(t * 7)) * 2]; // needle in, needle out
    case 'splint': return [Math.sin(t * 4) * 1, Math.cos(t * 8) * 0.8];
    case 'forceps': case 'dig': return [Math.sin(t * 3) * 0.4, -Math.max(0, Math.sin(t * 2.2)) * 2.5];
    case 'clean': return [Math.sin(t * 11) * 1.4, 0];
    case 'reset': { const j = prog > 0.82 ? -3 : Math.sin(t * 3) * 0.4; return [j, prog > 0.82 ? 1.5 : 0]; } // brace... then yank
    case 'amputate': return [Math.sin(t * 13) * 3.2, Math.abs(Math.cos(t * 13)) * 0.5]; // sawing
    case 'fit': case 'unfit': return [Math.sin(t * 6) * 0.8, Math.cos(t * 3) * 1];
    case 'drug': return [0, Math.sin(t * 2) * 0.3];
    default: return [Math.sin(t * 8) * 1, 0];
  }
};
const KS_ROLL = [0.85, 0.85, 0.85, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8];
NE.driveRag = function (rag, a, dt) {
  if (a.limpRag) return; const tgt = NE.ragPose(a); const ks0 = [0.55, 0.65, 0.75, 0.35, 0.3, 0.45, 0.4, 0.5, 0.55, 0.5, 0.55];
  if (a.getUpT > 0) a.getUpT = Math.max(0, a.getUpT - dt); const gu = a.getUpT > 0 ? lerp(1, 0.07, a.getUpT / 0.6) : 1; const ks = a.dashT > 0 ? KS_ROLL : gu < 1 ? ks0.map(k => k * gu) : ks0; // muscles re-engage gradually after a knockdown
  const vx = a.vx / 60, vy = a.vy / 60;
  for (let i = 0; i < rag.pts.length; i++) { const p = rag.pts[i], k = ks[i]; p.x = lerp(p.x, tgt[i][0], k); p.y = lerp(p.y, tgt[i][1], k); p.ox = lerp(p.ox, tgt[i][0] - vx, k); p.oy = lerp(p.oy, tgt[i][1] - vy, k); }
};
NE.ragLimp = function (rag, alive) { rag.tiles = true; rag.collide = true; rag.noActor = !!alive; rag.damp = 0.985; for (const c of rag.cons) if ((c.s0 != null ? c.s0 : c.s) < 1) c.s = alive ? 0.05 : 0.02; };
// back to a muscle-driven puppet after a knockdown
NE.ragUnlimp = function (rag) { rag.tiles = false; rag.collide = false; rag.noActor = true; rag.damp = 0.97; for (const c of rag.cons) if (c.s0 != null) c.s = c.s0; };

// waist lantern: hangs from the front hip, sways with movement
NE.hasLantern = a => !!a && (a.isPlayer || a.isRemote || a.town || (a.D && a.type !== 'feral') || a.kind === 'trader' || a.kind === 'survivor');
NE.lanternPos = function (a) { const p = a.rag.pts; const f = a.facing || 1; const sw = Math.sin((a.walkPh || 0) * 1.0) * (Math.abs(a.vx) > 5 ? 1.2 : 0.3) - (a.vx || 0) * 0.012; return { x: p[2].x + f * 3 + sw, y: p[2].y + 4.5 }; };
// draw a humanoid from ragdoll points
NE.drawHuman = function (ctx, rag, look, o) {
  o = o || {}; const p = rag.pts; const f = o.facing || 1;
  const skin = o.skinCol || NE.SKIN[look.skin] || '#d0a080'; const hair = NE.HAIRC[look.hairCol] || '#222';
  const shirt = o.shirt || look.shirt, pants = o.pants || look.pants; const dark = o.dim ? 0.6 : 1;
  const N = c => dark < 1 ? NE.shade(c, dark) : c, OL = c => NE.shade(c, 0.55 * dark), BK = c => NE.shade(c, 0.72 * dark);
  const anat = o.anat; const fr = f > 0 ? 'r' : 'l', bk = f > 0 ? 'l' : 'r'; const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const partMark = (part, x1, y1, x2, y2) => {
    if (!anat) return; const P = anat.parts[part]; const mx = Math.round((x1 + x2) / 2), my = Math.round((y1 + y2) / 2);
    if (P.wounds.some(w => !w.closed) || P.hp < P.max * 0.5) { R(mx, my, 1, 2, '#8a1010'); if (P.hp < P.max * 0.5) R(x2, y2 - 1, 1, 1, '#6a0c0c'); }
    if (P.bandage) R(mx - 1, my, 3, 1, P.bandage.soak > 0.5 ? '#c08080' : '#ece6d6');
    if (P.splint) R(mx, my - 2, 1, 4, '#8a7a5a');
    if (P.tq) R(x1 + (x2 - x1) * 0.3 - 1, y1 + (y2 - y1) * 0.3, 3, 1, '#111');
  };
  // limb = 1px dark outline edge + 2px fill (People Playground-ish slim segments)
  const BT = NE.bodyOf ? NE.bodyOf(look) : 'lean'; const THK = BT === 'lean' ? 0 : 1; // muscle and fat bodies carry thicker upper arms and thighs
  const seg = (a, b, col, back, w) => { w = w || 0; NE.pline(ctx, a.x, a.y, b.x, b.y, 3 + w, OL(back ? BK(col) : col)); NE.pline(ctx, a.x, a.y, b.x, b.y, 2 + w, back ? BK(col) : N(col)); };
  const sv = o.sev || {}; const stump = (q, dx) => { R(q.x - 1 + (dx || 0), q.y - 1, 3, 3, '#6a0808'); R(q.x + (dx || 0), q.y, 1, 1, '#ece6d6'); };
  const limb = (i0, i1, i2, c1, c2, part, back) => { const PR = anat && anat.parts[part] && anat.parts[part].severed && anat.parts[part].prost;
    if (PR) { NE.drawProsthetic(ctx, p[i0], p[i1], p[i2], PR, part.endsWith('arm'), back, c1, seg, OL); return; }
    if (sv[part]) return; seg(p[i0], p[i1], c1, back, THK); seg(p[i1], p[i2], c2, back, BT === 'muscle' && part.endsWith('arm') ? 0.5 : 0); partMark(part, p[i0].x, p[i0].y, p[i2].x, p[i2].y); };
  const foot = (q, back) => { const c = o.shoe ? (back ? NE.shade(o.shoe, 0.6) : N(o.shoe)) : back ? '#141210' : '#221c18'; if (o.shoeSole) R(q.x - (f > 0 ? 1 : 2), q.y, 4, 1, o.shoeSole); R(q.x - (f > 0 ? 1 : 2), q.y - 1, 4, 2, c); R(q.x + (f > 0 ? 2 : -3), q.y, 1, 1, c); };
  const hand = (q, back) => { R(q.x - 1, q.y - 1, 2, 2, o.glove ? (back ? NE.shade(o.glove, 0.6) : N(o.glove)) : back ? BK(skin) : N(skin)); if (o.glove && o.gloveStud) R(q.x, q.y - 1, 1, 1, '#c0c4ca'); };
  // back leg + back arm
  limb(2, 7, 8, pants, pants, bk + 'leg', true); if (!sv[bk + 'leg']) foot(p[8], true);
  limb(1, 3, 4, shirt, skin, bk + 'arm', true); if (!sv[bk + 'arm']) hand(p[4], true); else if (anat && anat.parts[bk + 'arm'].prost) { if (anat.parts[bk + 'arm'].prost.kind === 'saw') NE.drawSawBlade(ctx, p[4].x, p[4].y, '#5a5e64'); else R(p[4].x - 1, p[4].y - 1, 2, 2, '#3a3430'); }
  // backpack (on the back side of the torso)
  if (o.pack) NE.drawPack(ctx, p, f, o.pack, N, OL);
  // torso: 5px with outline, belt, collar
  const tc = o.vest ? (typeof o.vest === 'string' ? o.vest : '#3a3e36') : shirt, FEM = look.sex === 'f';
  if (FEM) { // feminine silhouette: bust, cinched waist, wider hips — follows the torso so every shirt/armour inherits it
    const lx = (t) => p[1].x + (p[2].x - p[1].x) * t, ly = (t) => p[1].y + (p[2].y - p[1].y) * t;
    NE.pline(ctx, p[1].x, p[1].y, p[2].x, p[2].y, 5, OL(tc)); NE.pline(ctx, p[1].x, p[1].y, p[2].x, p[2].y, 4, N(tc));
    NE.pline(ctx, lx(0.12), ly(0.12), lx(0.4), ly(0.4), 6, OL(tc)); NE.pline(ctx, lx(0.12), ly(0.12), lx(0.38), ly(0.38), 5, N(tc));
    R(lx(0.3) + f * 2, ly(0.3), 1, 2, OL(tc)); R(lx(0.28) + (f > 0 ? 1 : -1), ly(0.26), 1, 2, N(tc)); R(lx(0.3) + f * 1, ly(0.42), 1, 1, NE.shade(tc, 0.75 * dark));
    NE.pline(ctx, lx(0.82), ly(0.82), p[2].x, p[2].y + 1, 7, OL(pants)); NE.pline(ctx, lx(0.84), ly(0.84), p[2].x, p[2].y + 1, 6, N(pants));
  } else { NE.pline(ctx, p[1].x, p[1].y, p[2].x, p[2].y, 6, OL(tc)); NE.pline(ctx, p[1].x, p[1].y, p[2].x, p[2].y, 5, N(tc)); }
  { // body type silhouette on top of the base torso (works for men and women, under any vest)
    const lx = (t) => p[1].x + (p[2].x - p[1].x) * t, ly = (t) => p[1].y + (p[2].y - p[1].y) * t; const W0 = FEM ? 0 : 1;
    if (BT === 'muscle') { NE.pline(ctx, lx(0.02), ly(0.02), lx(0.55), ly(0.55), 8 + W0, OL(tc)); NE.pline(ctx, lx(0.04), ly(0.04), lx(0.52), ly(0.52), 7 + W0, N(tc)); NE.pline(ctx, lx(0.15) + f * 1.5, ly(0.15), lx(0.4) + f * 1.5, ly(0.4), 6, N(tc)); R(lx(0.42) + f * 3, ly(0.42), 1, 1, OL(tc)); R(lx(0.3) + f * (2 + W0), ly(0.3), 1, 2, NE.shade(tc, 0.8 * dark)); R(lx(0.08) - 3 - W0, ly(0.08), 7 + W0 * 2, 1, NE.shade(tc, 1.15 * dark)); }
    else if (BT === 'fat') { const bx = f * (FEM ? 2.6 : 2.8); const W0 = 1; NE.pline(ctx, p[1].x, p[1].y + 1, p[2].x, p[2].y, 8 + W0, OL(tc)); NE.pline(ctx, p[1].x, p[1].y + 1, p[2].x, p[2].y, 7 + W0, N(tc));
      NE.pline(ctx, lx(0.36) + bx, ly(0.36), lx(0.84) + bx, ly(0.84), 8 + W0, OL(tc)); NE.pline(ctx, lx(0.38) + bx, ly(0.38), lx(0.82) + bx, ly(0.82), 7 + W0, N(tc)); R(lx(0.95) - 3, ly(0.95), 7, 1, OL(tc));
      R(lx(0.85) + bx - 2, ly(0.85), 5, 1, NE.shade(tc, 0.7 * dark)); R(lx(0.55) + bx + f * 2, ly(0.5), 1, 2, NE.shade(tc, 1.15 * dark));
      if (FEM) { NE.pline(ctx, lx(0.82), ly(0.82), p[2].x, p[2].y + 1, 8, OL(pants)); NE.pline(ctx, lx(0.84), ly(0.84), p[2].x, p[2].y + 1, 7, N(pants)); } }
  }
  NE.pline(ctx, p[1].x + f * 1.5, p[1].y + 1, p[2].x + f * 1.5, p[2].y - 1, 1, NE.shade(tc, 1.12 * dark));
  R(p[2].x - 2, p[2].y - 1, 5, 2, N(pants)); R(p[2].x - 2, p[2].y - 2, 5, 1, '#2a2018');
  if (o.vestId && NE.drawBodyGear) NE.drawBodyGear(ctx, p, f, o.vestId, N, OL, dark); else if (o.vest) { const vl = NE.shade(tc, 1.35); R(p[1].x - 2, p[1].y + 2, 5, 1, vl); R(p[1].x - 2, p[1].y + 5, 5, 1, vl); }
  if (o.acc && NE.drawAccessories) NE.drawAccessories(ctx, p, f, o.acc, N, OL);
  partMark('torso', p[1].x, p[1].y, p[2].x, p[2].y);
  const npr = k => !(anat && anat.parts[k] && anat.parts[k].prost); if ((sv[bk + 'leg'] && npr(bk + 'leg')) || (sv[fr + 'leg'] && npr(fr + 'leg'))) stump(p[2], 0); if (sv[bk + 'arm'] && npr(bk + 'arm')) stump(p[1], -f);
  // front leg
  limb(2, 9, 10, pants, pants, fr + 'leg', false); if (!sv[fr + 'leg']) foot(p[10], false);
  // head: 6x6 with a dark rim, neck, nose, mouth
  const hx = Math.round(p[0].x), hy = Math.round(p[0].y); const X0 = hx - 3, Y0 = hy - 3;
  if (sv.head) { const n = p[1]; R(n.x - 2, n.y - 3, 4, 3, '#6a0808'); R(n.x, n.y - 3, 1, 1, '#ece6d6'); }
  if (!sv.head) {
  R(hx - 1, hy + 3, 2, 2, BK(skin));
  if (BT === 'fat') { R(hx - 2 + (f > 0 ? 1 : 0), hy + 3, 4, 2, BK(skin)); R(hx - 1 + f, hy + 3, 2, 1, N(skin)); } else if (BT === 'muscle' && !FEM) R(hx - 2, hy + 3, 4, 2, BK(skin));
  R(X0 - 1, Y0, 8, 6, OL(skin)); R(X0, Y0 - 1, 6, 8, OL(skin)); R(X0, Y0, 6, 6, N(skin)); R(f > 0 ? X0 : X0 + 5, Y0 + 1, 1, 4, BK(skin));
  R(f > 0 ? X0 + 6 : X0 - 1, hy, 1, 1, N(skin)); // nose
  if (!o.mask) R(f > 0 ? X0 + 4 : X0 + 1, hy + 2, 1, 1, NE.shade(skin, 0.6 * dark));
  if (look.facial === 'beard') { R(f > 0 ? X0 + 1 : X0, hy + 1, 5, 2, N(hair)); } else if (look.facial === 'goatee') R(f > 0 ? X0 + 4 : X0 + 1, hy + 2, 1, 2, N(hair)); else if (look.facial === 'mustache') R(f > 0 ? X0 + 3 : X0 + 1, hy + 1, 2, 1, N(hair));
  NE.drawHair6(ctx, look.hair, X0, Y0, f, N(hair), OL(hair));
  if (o.helmId && NE.drawHeadGear) NE.drawHeadGear(ctx, X0, Y0, f, o.helmId, N, OL, 0); else if (o.helmet) { R(X0 - 1, Y0 - 2, 8, 3, N(o.helmet)); R(X0 - 1, Y0 - 2, 8, 1, NE.shade(o.helmet, 1.25)); R(f > 0 ? X0 + 5 : X0 - 2, Y0, 3, 1, OL(o.helmet)); }
  const ex = f > 0 ? X0 + 4 : X0 + 1, ey = hy - 1;
  if (o.blind && !o.dead) { R(ex - (f > 0 ? 1 : 0), ey, 2, 1, NE.shade(skin, 0.75)); }
  else if (o.eyeGlow && !o.dead) { ctx.fillStyle = o.eyeGlow + '55'; ctx.fillRect(ex - 1, ey - 1, 3, 3); R(ex, ey, 1, 1, o.eyeGlow); }
  else if (o.vespa && !o.dead) { ctx.fillStyle = (o.vcol || '#ffd23a') + '5a'; ctx.fillRect(ex - 1, ey - 1, 3, 3); R(ex, ey, 1, 1, o.vcol || '#ffd23a'); if ((o.infest || 0) > 0.5) R(ex, ey + 1, 1, 1, 'rgba(255,200,40,0.7)'); }
  else { R(ex, ey, 1, 1, o.dead ? '#3a2a2a' : '#141010'); if ((o.glasses || look.glasses)) R(ex - (f > 0 ? 1 : 0), ey, 2, 1, '#9ad'); }
  if (o.helmId && NE.drawHeadGear) NE.drawHeadGear(ctx, X0, Y0, f, o.helmId, N, OL, 1); if (o.acc && o.acc.charm === 'nightgoggles' && !o.helmId) { R(X0, Y0 + 1, 6, 1, '#2a2a2a'); R(f > 0 ? X0 + 3 : X0 + 1, Y0, 2, 2, '#5ad070'); }
  R(ex - (f > 0 ? 1 : 0), ey - 1, 2, 1, NE.shade(hair, 0.85 * dark)); // brow
  if (o.mask) { R(f > 0 ? X0 + 2 : X0 - 1, hy + 1, 5, 2, '#2a2e30'); R(f > 0 ? X0 + 5 : X0 - 1, hy + 1, 1, 2, '#4a5054'); }
  partMark('head', p[0].x, p[0].y - 1, p[0].x, p[0].y + 1);
  if (anat && anat.parts.head.bandage) R(X0, Y0 + 1, 6, 1, '#ece6d6');
  }
  if (NE.Gore) NE.Gore.drawOn(ctx, rag, o);
  // waist lantern
  if (o.lantern) { const sw = Math.sin((o.walkPh || 0)) * 0.7; const lx = Math.round(p[2].x + f * 3 + sw), ly = Math.round(p[2].y + 1); const lit = o.lantern > 0.5 && !o.dead;
    R(lx, ly, 1, 1, '#3a2a1a'); R(lx - 1, ly + 1, 3, 1, '#2a1e14'); R(lx - 1, ly + 5, 3, 1, '#2a1e14'); R(lx - 1, ly + 2, 3, 3, lit ? (Math.random() < 0.08 ? '#ffd890' : '#ffb84a') : '#4a3e30'); if (lit) R(lx, ly + 3, 1, 1, '#fff4c8'); }
  // archetype features: chitin shells, claws, fungus, nectar veins
  if (o.arch && !o.dead) { const ar = o.arch, ch = p[1], pe = p[2];
    if (ar === 'burrower') { for (let k = 0; k < 3; k++) { const t = 0.15 + k * 0.3, sx = ch.x + (pe.x - ch.x) * t - f * 2.5, sy = ch.y + (pe.y - ch.y) * t; R(sx - 2, sy - 1, 4, 2, '#3a2a14'); R(sx - 2, sy - 1, 4, 1, '#7a5a2a'); } }
    if (ar === 'husk') { R(ch.x - f * 2, ch.y - 1, 2, 1, '#d8d0a0'); R(ch.x - f * 1, ch.y - 2, 1, 1, '#f0e8c0'); R(pe.x + f, pe.y - 2, 1, 1, '#d8d0a0'); }
    if (ar === 'feral') { R(p[3].x, p[3].y, 1, 1, '#ffb020'); R(p[5].x, p[5].y + 1, 1, 1, '#ffb020'); } }
  // front arm
  limb(1, 5, 6, shirt, skin, fr + 'arm', false); { const PRa = anat && anat.parts[fr + 'arm'].severed && anat.parts[fr + 'arm'].prost; if (sv[fr + 'arm'] && !PRa) { stump(p[1], f); return; } if (PRa && PRa.kind === 'saw') NE.drawSawBlade(ctx, p[6].x, p[6].y, PRa.col); else if (PRa) R(p[6].x - 1, p[6].y - 1, 2, 2, PRa.kind === 'peg' ? '#5a4a3a' : NE.shade(PRa.col, 0.8)); else hand(p[6], false); }
  if ((o.arch === 'stalker' || o.arch === 'trog') && !o.dead) { const q = p[6], L = o.arch === 'stalker' ? 4 : 2; for (let k = -1; k <= 1; k++) NE.pline(ctx, q.x, q.y, q.x + f * L, q.y + k * 1.5 + 1, 1, '#e8e2d0'); }
  if (o.arch === 'burrower' && !o.dead) { const hx2 = Math.round(p[0].x), hy2 = Math.round(p[0].y); R(hx2 + f * 3, hy2 + 2, 2, 1, '#2a1a0a'); R(hx2 + f * 4, hy2 + 3, 1, 1, '#2a1a0a'); }
  // weapon: a little pixel model per item, rotated pixel-perfect around the hand
  if (o.weapon) {
    const it = NE.ITEMS[o.weapon]; const hxw = p[6].x, hyw = p[6].y;
    if (it && it.gun) { const d = o.aimDir || { x: f, y: 0 }; NE.drawWeapon(ctx, it.id, hxw, hyw, d.x, d.y, f); }
    else if (it && it.melee) { let dx = p[6].x - p[5].x, dy = p[6].y - p[5].y; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L; if (o.wdir) { dx = o.wdir.x; dy = o.wdir.y; } NE.drawWeapon(ctx, it.id, hxw, hyw, dx, dy, f); }
  }
};
// ---- weapon models: rows run across the weapon (middle row = the handle line), columns run from the butt to the tip.
// g = column the hand grips. Palette: w/W wood, m/M metal, h shine, b edge, k black, r red, g grip tape, f/F flint, y brass
const WPAL = { w: '#8a6038', W: '#5a3a1e', m: '#b0b4ba', M: '#6e737a', h: '#f2f6fa', b: '#dde2e8', k: '#3a3d44', r: '#a02820', g: '#3a3028', f: '#8a8070', F: '#5a5248', y: '#c09040', s: '#7a8088', S: '#4a5058' };
NE.WMODELS = {
  pipe: { g: 1, r: ['         mM ', '        mmhm', '        mmMm', 'WwwwwwwwwMmm', '        mMm ', '         mM ', '          M '] },
  knife: { g: 1, r: ['    hbbb  ', 'kkkMmmmmmh', '   M      '] },
  shiv: { g: 1, r: ['   fff  ', 'ggWffffF', '   ff   '] },
  crowbar: { g: 1, r: ['k           ', 'rrrrrrrrrrrk', '          kk', '         k  '] },
  axe: { g: 1, r: ['           mm  ', '          mhmmm', 'WwwwwwwwwwwMm  ', '          mM   ', '          m    '] },
  pickaxe: { g: 1, r: ['        mm   ', '         mm  ', 'WwwwwwwwwwMM ', '         mm  ', '        mm   '] },
  machete: { g: 1, r: ['    hbbbbbbb ', 'kkkMmmmmmmmmh', '    mmmmmmmm '] },
  fireaxe: { g: 1, r: ['          mmmm', '          mhmm', 'rrrrrrrrrrrMm ', '          Mm  ', '           M  '] },
  sledge: { g: 1, r: ['          MMMM', '          mmmm', 'WwwwwwwwwwmhmM', '          mmmm', '          MMMM'] },
  spear: { g: 5, r: ['                    hm  ', 'WwwwwwwwwwwwwwwwwwwyMmmmh', '                    mm  '] },
  leadpipe: { g: 1, r: ['         SS ', 'ssssshsssSSs', '         SS '] },
  baton: { g: 2, r: ['  k       ', 'kkkkkkkkkkk', '          '] },
  cleaver: { g: 1, r: ['    hbbbbb', 'WWWMmmmmmb', '    mmmmmb', '    MMMMMb'] },
  pistol: { g: 1, c: 1, r: ['kkkkkkk', 'kMMMMMh', 'kk     ', 'k      '] },
  revolver: { g: 1, c: 1, r: [' mmmmmmmm', 'mmMMmmmmh', 'WW       ', 'W        '] },
  smg: { g: 4, c: 1, r: ['   kkkkkkk  ', 'kkkkMMMMMMMh', 'k   kk k    ', '     k k    '] },
  rifle: { g: 5, c: 1, r: ['     kkkkkkkkk    ', 'wwwwwkMMMMMMMMMMMh', 'ww   kk  kk       ', '         k        '] },
  shotgun: { g: 5, c: 1, r: ['       kkkkkkkkkk  ', 'wwwwwkkMMMMMMMMMMMh', 'ww    k  wwwww     '] },
  hunting: { g: 6, c: 2, r: ['       MkkM          ', '     kkkkkkkkkkkk     ', 'wwwwwwMMMMMMMMMMMMMMh', 'ww    kk             '] },
};
// puffy backpack on the back of the torso: rounded stuffed body, bedroll on top, side pocket, shoulder strap. Bigger packs bulge more.
const PSZ = {}; NE.packSize = col => { const k = col[0] + col[1]; if (PSZ[k] == null) { const b = (NE.BACKPACKS || []).find(x => x.col[0] === col[0] && x.col[1] === col[1]); PSZ[k] = b ? NE.clamp((b.slots - 12) / 14, 0, 1) : 0.35; } return PSZ[k]; };
NE.drawPack = function (ctx, p, f, col, tone, OL) { tone = tone || (c => c);
  const sz = NE.packSize(col); const ax = p[1].x, ay = p[1].y; let dx = p[2].x - ax, dy = p[2].y - ay; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L; const bx = -dy * f, by = dx * f; // b points out of the back
  const len = L * (0.82 + 0.3 * sz), u0 = -1.4 - sz; const W = u => (3.1 + sz * 2.3) * (0.62 + 0.45 * Math.sin(Math.PI * NE.clamp((u - u0) / (len - u0), 0, 1))); // bulging profile
  const c0 = tone(col[0]), c1 = tone(col[1]), dark = NE.shade(c0, 0.62), mid = NE.shade(c0, 0.85), hi = NE.shade(c0, 1.22), ol = OL ? OL(col[0]) : NE.shade(c0, 0.35); const px = new Map();
  const put = (u, v, c, pri) => { const x = Math.round(ax + dx * u + bx * v), y = Math.round(ay + dy * u + by * v); const k = x * 4096 + y; const o = px.get(k); if (!o || o[1] <= pri) px.set(k, [c, pri, x, y]); };
  for (let u = u0 - 1; u <= len + 1; u += 0.45) { const w = W(u); for (let v = 0.6; v <= 1.6 + w + 1; v += 0.45) put(u, v, ol, 0); } // outline halo
  for (let u = u0; u <= len; u += 0.45) { const w = W(u); for (let v = 1.3; v <= 1.6 + w; v += 0.45) { const t = (v - 1.3) / (w + 0.3); const top = (u - u0) / (len - u0); put(u, v, t > 0.78 ? dark : top < 0.22 ? hi : t < 0.3 ? hi : mid, 1); } }
  // drawstring top + bedroll across the top
  for (let v = 1; v <= 2 + W(u0) + 0.5; v += 0.45) { put(u0 - 1.1, v, NE.shade(c1, 0.6), 2); put(u0 - 0.4, v, c1, 2); }
  // front pocket bulge low on the bag, with a stitched flap
  const pu0 = len * 0.52, pu1 = len * 0.88; for (let u = pu0; u <= pu1; u += 0.45) { const w = W(u); for (let v = w + 0.9; v <= w + 2.2; v += 0.45) put(u, v, v > w + 1.8 ? dark : mid, 3); put(u, w + 1.1, NE.shade(c1, 0.9), 4); }
  for (let u = pu0 - 0.5; u <= pu1 + 0.5; u += 0.45) put(u, W(u) + 2.6, ol, 0.5);
  // strap: over the shoulder, down the chest
  for (let u = u0; u <= len * 0.55; u += 0.45) put(u, 0.7, NE.shade(c1, 0.75), 5);
  for (const [, [c, , x, y]] of px) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); }
  // buckle glint
  ctx.fillStyle = '#d8c890'; ctx.fillRect(Math.round(ax + dx * (pu0 + 0.5) + bx * (W(pu0) + 1.4)), Math.round(ay + dy * (pu0 + 0.5) + by * (W(pu0) + 1.4)), 1, 1);
};
// prosthetic limbs: each kind has its own build, not just a recolour
NE.drawProsthetic = function (ctx, a, b, c, PR, arm, back, sleeve, seg, OL) {
  const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w, h); }; const pc = PR.col || '#8a8e94'; const dk = back ? 0.7 : 1; const sh = k => NE.shade(pc, k * dk);
  const line = (p0, p1, w, col) => NE.pline(ctx, p0.x, p0.y, p1.x, p1.y, w, col); const t = performance.now() / 1000;
  if (PR.kind === 'peg') {
    seg(a, b, sleeve, back); // the real upper limb in its sleeve
    if (arm) { line(b, c, 2, OL ? OL(pc) : '#1a1410'); line(b, c, 1, sh(1)); R(b.x - 1, b.y - 1, 2, 2, '#3a2a1a'); const dx = c.x - b.x, dy = c.y - b.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L; // steel hook
      R(c.x, c.y, 1, 1, '#c8ccd2'); R(c.x + ux, c.y + uy, 1, 1, '#c8ccd2'); R(c.x + ux - uy, c.y + uy + ux, 1, 1, '#a8acb2'); R(c.x - uy * 2, c.y + ux * 2, 1, 1, '#d8dce0'); }
    else { line(b, c, 3, OL ? OL(pc) : '#1a1410'); line(b, c, 2, sh(1)); R(b.x - 1.5, b.y - 1, 3, 2, '#3a2a1a'); R(b.x - 1.5, b.y + 1, 3, 1, '#6a5a40'); R(c.x - 1, c.y - 1, 2, 2, '#6a6e74'); } // wooden peg, leather strap, iron ferrule
    return; }
  if (PR.kind === 'metal') {
    if (arm) { line(a, b, 3, OL ? OL(pc) : '#14161a'); line(a, b, 2, sh(1)); line(b, c, 2, OL ? OL(pc) : '#14161a'); line(b, c, 1, sh(0.8)); R(b.x - 1, b.y - 1, 2, 2, '#2a2c30'); R(b.x, b.y, 1, 1, sh(1.5)); R((a.x + b.x) / 2, (a.y + b.y) / 2, 1, 1, sh(1.6)); // plated upper arm, piston forearm, rivets
      R(c.x - 1, c.y, 1, 1, sh(1.3)); R(c.x + 1, c.y, 1, 1, sh(1.3)); R(c.x, c.y + 1, 1, 1, sh(1.1)); } // three-prong claw
    else { const off = 1; NE.pline(ctx, a.x - off, a.y, b.x - off, b.y, 1, sh(0.8)); NE.pline(ctx, a.x + off, a.y, b.x + off, b.y, 1, sh(1)); R(b.x - 1, b.y - 1, 3, 3, '#24262a'); R(b.x, b.y, 1, 1, sh(1.6)); // twin-strut thigh, bolted knee
      line(b, c, 1, sh(1.1)); const mx = (b.x + c.x) / 2, my = (b.y + c.y) / 2; R(mx - 1, my - 1, 1, 1, '#c09040'); R(mx, my, 1, 1, '#c09040'); R(c.x - 1, c.y, 4, 1, '#3a3c40'); R(c.x - 1, c.y - 1, 2, 1, sh(1.2)); } // pipe shin, spring, foot plate
    return; }
  if (PR.kind === 'art') { const glow = 0.5 + 0.5 * Math.sin(t * 3 + a.x); line(a, b, 3, OL ? OL(pc) : '#1a1206'); line(a, b, 2, sh(1)); line(b, c, 2, OL ? OL(pc) : '#1a1206'); line(b, c, 2, sh(1.15));
    R(b.x - 1, b.y - 1, 2, 2, 'rgba(255,' + Math.round(180 + glow * 60) + ',60,1)'); R((a.x + b.x) / 2, (a.y + b.y) / 2, 1, 1, '#ffe890'); if (arm) R(c.x - 1, c.y - 1, 2, 2, '#e0b040'); else R(c.x - 1, c.y, 4, 1, '#a07820'); if (glow > 0.8 && Math.random() < 0.05 && NE.G.addP) NE.G.addP(b.x, b.y, 0, -6, 0.4, '#ffd060', 'glow', 0); return; }
  if (PR.kind === 'saw') { seg(a, b, sleeve, back); line(b, c, 2, OL ? OL(pc) : '#14161a'); line(b, c, 1, sh(0.9)); R(b.x - 1, b.y - 1, 2, 2, '#2a2c30'); return; }
  seg(a, b, pc, back); seg(b, c, pc, back);
};
// spinning circular saw on a prosthetic arm: teeth rotate around a 5px disc
NE.drawSawBlade = function (ctx, x, y, col) { x = Math.round(x); y = Math.round(y); const a0 = performance.now() / 45;
  ctx.fillStyle = NE.shade(col, 0.6); ctx.fillRect(x - 2, y - 1, 5, 3); ctx.fillRect(x - 1, y - 2, 3, 5); ctx.fillStyle = col; ctx.fillRect(x - 1, y - 1, 3, 3); ctx.fillStyle = '#2a2a2a'; ctx.fillRect(x, y, 1, 1);
  ctx.fillStyle = '#e8ecf0'; for (let i = 0; i < 4; i++) { const a = a0 + i * Math.PI / 2; ctx.fillRect(Math.round(x + Math.cos(a) * 3), Math.round(y + Math.sin(a) * 3), 1, 1); } };
NE.drawWeapon = function (ctx, id, hx, hy, dx, dy, f) {
  const W = NE.WMODELS[id]; if (!W) { NE.pline(ctx, hx, hy, hx + dx * 7, hy + dy * 7, 2, '#888'); return; }
  const rows = W.r, c = W.c != null ? W.c : Math.floor(rows.length / 2), cols = Math.max(...rows.map(r => r.length));
  const nx = -dy * f, ny = dx * f; // across the weapon; flipped with facing so the 'top' rows stay on top
  const reach = Math.max(cols - W.g, W.g) + rows.length; const x0 = Math.floor(hx - reach), x1 = Math.ceil(hx + reach), y0 = Math.floor(hy - reach), y1 = Math.ceil(hy + reach);
  for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) { const ox = px + 0.5 - hx, oy = py + 0.5 - hy; const u = Math.round(ox * dx + oy * dy) + W.g, v = Math.round(ox * nx + oy * ny) + c;
    if (v < 0 || v >= rows.length || u < 0) continue; const ch = rows[v][u]; if (!ch || ch === ' ') continue; ctx.fillStyle = WPAL[ch] || '#888'; ctx.fillRect(px, py, 1, 1); }
};
// hair on the 6x6 in-world head (X0,Y0 = top-left), from the same recipes as the portraits
NE.drawHair6 = function (ctx, hs, X0, Y0, f, c, d) {
  const H = (NE.HAIRSTYLES || {})[hs] || {}; const R = (x, y, w, h, col) => { ctx.fillStyle = col || c; ctx.fillRect(x, y, w, h); };
  const bx = f > 0 ? X0 : X0 + 5, out = f > 0 ? X0 - 1 : X0 + 6, front = f > 0 ? X0 + 5 : X0;
  if (H.cap === 0) return;
  if (H.cap === 'buzz') { R(X0, Y0, 6, 1, d); R(X0, Y0 - 1, 6, 1, d); R(bx, Y0 + 1, 1, 2, d); return; }
  if (H.cap === 'mohawk') { R(X0 + 2, Y0 - 3, 2, 3); R(X0, Y0, 6, 1, d); return; }
  const v = H.vol || 0;
  if (v > 4) { R(X0 - 1, Y0 - 3, 8, 4); R(X0 - 2, Y0 - 2, 10, 2); R(out, Y0 + 1, 1, 3); R(X0, Y0 - 3, 6, 1, NE.shade(c, 1.3)); return; }
  R(X0, Y0 - 1, 6, 2); R(X0 + 1, Y0 - 2, 4, 1); R(X0 - 1, Y0 - 1, 1, 3); R(X0 + 6, Y0 - 1, 1, 3); R(bx, Y0 + 1, 1, 3); R(front, Y0 + 1, 1, 1);
  R(X0 + 1, Y0 - 2, 2, 1, NE.shade(c, 1.35)); R(X0 + (f > 0 ? 1 : 4), Y0, 1, 1, d); R(X0 + 3, Y0 - 1, 1, 1, NE.shade(c, 0.8));
  if (H.shave) R(front - (f > 0 ? 2 : 0), Y0, 3, 1, d);
  if (v >= 2 || H.spikes) { for (let i = 0; i < 6; i += 2) R(X0 + i, Y0 - 3, 1, 1); R(out, Y0 - 1, 1, 2); }
  if (H.bang === 'up') { R(front - f, Y0 - 3, 2, 1); R(front, Y0 - 2, 1, 1); }
  if (H.bang === 'blunt' || H.bang === 'long' || H.bang === 'swept' || H.bang === 'jag' || H.bang === 'parted') R(front - (f > 0 ? 1 : 0), Y0 + 1, 2, H.bang === 'long' ? 2 : 1);
  if (H.bang === 'curl') { R(X0 - 1, Y0 - 1, 1, 3); R(X0 + 6, Y0 - 1, 1, 3); R(X0, Y0 - 3, 6, 1); }
  if (H.side) R(out + (f > 0 ? 1 : -1), Y0 + 1, 1, H.side > 1 ? 6 : 4);
  if (H.back) { const L = Math.max(2, Math.round((H.back - 18) / 3.2)); R(out, Y0, 1, L, H.dread ? d : c); R(bx, Y0 + 1, 1, Math.min(L, 5)); if (H.dread) for (let k = 1; k < L; k += 2) R(out, Y0 + k, 1, 1, c); }
  if (H.tail === 'pony' || H.tail === 'low' || H.tail === 'high') { const ty = H.tail === 'high' ? Y0 - 1 : H.tail === 'low' ? Y0 + 3 : Y0 + 1; R(out, ty, 1, 2); R(out - f, ty + 1, 1, 5); R(out - f, ty + 1, 1, 1, '#c05070'); }
  if (H.tail === 'twin') { R(X0 - 1, Y0 + 1, 1, 6); R(X0 + 6, Y0 + 1, 1, 6); R(X0 - 2, Y0 + 3, 1, 3); R(X0 + 7, Y0 + 3, 1, 3); }
  if (H.tail === 'braid') { R(out, Y0 + 1, 1, 3); for (let k = 0; k < 5; k++) R(out - (k % 2 ? f : 0), Y0 + 4 + k, 1, 1, k % 2 ? d : c); }
  if (H.bun === 'top') { if (hs === 'manbun') R(bx - f, Y0 - 3, 2, 2); else R(X0 + 2, Y0 - 4, 3, 2); }
  if (H.bun === 'double') { R(X0 - 1, Y0 - 3, 2, 2); R(X0 + 5, Y0 - 3, 2, 2); }
};
NE.drawTinyHair = function (ctx, hs, hx, hy, f, c, d) {
  const R = (x, y, w, h, col) => { ctx.fillStyle = col || c; ctx.fillRect(x, y, w, h); }; const bk = f > 0 ? hx - 3 : hx + 3; const H = (NE.HAIRSTYLES || {})[hs] || {};
  if (H.cap === 0) return; if (H.cap === 'buzz') { R(hx - 2, hy - 2, 5, 1, d); return; } if (H.cap === 'mohawk') { R(hx - 1, hy - 4, 3, 2); R(hx - 2, hy - 2, 5, 1, d); return; }
  const v = H.vol || 0; if (v > 4) { R(hx - 3, hy - 4, 7, 3); R(hx - 3, hy - 1, 1, 3); R(hx + 3, hy - 1, 1, 2); return; }
  R(hx - 2, hy - 3, 5, 2); R(f > 0 ? hx - 2 : hx + 2, hy - 1, 1, 2);
  if (v >= 2 || H.spikes) { R(hx - 3, hy - 3, 1, 2); R(hx + 3, hy - 3, 1, 1); R(hx, hy - 4, 1, 1); }
  if (H.bang === 'up') R(hx + f, hy - 4, 2, 1);
  if (H.back) R(bk, hy - 2, 1, H.back > 40 ? 7 : H.back > 34 ? 5 : 4, H.dread ? d : c);
  if (H.tail === 'pony' || H.tail === 'low') { R(bk, hy - 2, 1, 2); R(bk - f, hy - 1 + (H.tail === 'low' ? 1 : 0), 1, 4); }
  if (H.tail === 'high') { R(bk - f, hy - 4, 1, 1); R(bk - f * 2, hy - 3, 1, 4); }
  if (H.tail === 'braid') { R(bk, hy - 2, 1, 3); R(bk, hy + 1, 1, 4, d); }
  if (H.tail === 'twin') { R(hx - 3, hy - 2, 1, 5); R(hx + 3, hy - 2, 1, 5); }
  if (H.bun === 'top') R(hx - 1, hy - 5, 2, 2); if (H.bun === 'double') { R(hx - 3, hy - 4, 2, 2); R(hx + 2, hy - 4, 2, 2); }
  if (H.side || H.bang === 'swept' || H.bang === 'long') R(hx + f * 2, hy - 1, 1, H.bang === 'long' ? 2 : 1);
};
// Vespa mutations on the in-world sprite (from Relic Nectar abilities)
NE.drawMutations = function (ctx, p, m, f, hx, hy) {
  const G = '#ffc52a', D = '#c08010';
  if (m.veins) { ctx.fillStyle = G; ctx.fillRect(Math.round(p[1].x), Math.round(p[1].y) - 1, 1, 1); }
  if (m.plates) { ctx.fillStyle = D; ctx.fillRect(Math.round(p[1].x) - f, Math.round(p[1].y), 2, 1); }
  if (m.antennae) { ctx.fillStyle = D; ctx.fillRect(hx - 1, hy - 5, 1, 2); ctx.fillRect(hx + 1, hy - 5, 1, 2); ctx.fillStyle = G; ctx.fillRect(hx - 2, hy - 6, 1, 1); ctx.fillRect(hx + 2, hy - 6, 1, 1); }
  if (m.mandibles) { ctx.fillStyle = D; ctx.fillRect(hx + f * 2, hy + 3, 1, 1); ctx.fillRect(hx - f, hy + 3, 1, 1); }
  if (m.wings) { ctx.fillStyle = 'rgba(255,230,150,0.55)'; const bx = Math.round(p[1].x) - f * 2, by = Math.round(p[1].y); ctx.fillRect(bx - (f > 0 ? 2 : 0), by - 2, 3, 2); ctx.fillRect(bx - (f > 0 ? 3 : -1), by - 3, 2, 1); }
  if (m.stinger) { ctx.fillStyle = G; ctx.fillRect(Math.round(p[6].x) + f, Math.round(p[6].y), 1, 1); }
  if (m.amber) { ctx.fillStyle = G; ctx.fillRect(Math.round(p[2].x), Math.round(p[2].y) - 1, 1, 1); }
};
NE.mutsOf = function (abil) { const m = {}; for (const id of abil || []) { const A = NE.ABILITIES.find(a => a.id === id); if (A) m[A.mut] = true; } return m; };

// ---------------- Anime pixel portrait (coloured, blinking; the only Vespa tell is the gold eyes) ----------------
const PW = 48, PH = 56;
function hexRGB(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
// hairstyle recipes: bang type, volume, side locks, back length, extras
const HP = NE.HAIRSTYLES = {
  bald: { cap: 0 }, buzz: { cap: 'buzz' }, mohawk: { cap: 'mohawk' }, fade: { bang: 'short', vol: 0, shave: 1 },
  crew: { bang: 'short', vol: 0 }, short: { bang: 'jag', vol: 1 }, quiff: { bang: 'up', vol: 1 }, slick: { bang: 'none', vol: 0 }, messy: { bang: 'jag', vol: 2, spikes: 1 },
  spiky: { bang: 'jag', vol: 2, spikes: 2 }, curly: { bang: 'curl', vol: 3 }, afro: { bang: 'curl', vol: 6 }, undercut: { bang: 'swept', vol: 1, shave: 1 }, side: { bang: 'swept', vol: 1, side: 1 },
  curtain: { bang: 'curtain', vol: 1, side: 1 }, shaggy: { bang: 'jag', vol: 2, side: 1, back: 33 }, wolf: { bang: 'jag', vol: 2, side: 1, back: 38 }, lowtail: { bang: 'parted', vol: 1, side: 1, tail: 'low' },
  manbun: { bang: 'short', vol: 0, bun: 'top' }, dreads: { bang: 'jag', vol: 2, back: 42, dread: 1 }, long: { bang: 'parted', vol: 1, side: 1, back: 46 },
  pixie: { bang: 'swept', vol: 1 }, bob: { bang: 'blunt', vol: 2, side: 1, back: 36, flat: 1 }, wavy: { bang: 'parted', vol: 2, side: 1, back: 48, wave: 1 }, hime: { bang: 'blunt', vol: 1, side: 2, back: 48, flat: 1 },
  longbangs: { bang: 'long', vol: 1, side: 1, back: 42 }, pony: { bang: 'jag', vol: 1, side: 1, tail: 'pony' }, ponyhigh: { bang: 'parted', vol: 1, side: 1, tail: 'high' }, twintails: { bang: 'blunt', vol: 1, side: 1, tail: 'twin' },
  bun: { bang: 'jag', vol: 1, side: 1, bun: 'top' }, spacebuns: { bang: 'blunt', vol: 1, side: 1, bun: 'double' }, braid: { bang: 'parted', vol: 1, side: 1, tail: 'braid' }, shaved: { bang: 'swept', vol: 1, shave: 1, back: 30 },
  // v0.5 additions — male
  pompadour: { bang: 'up', vol: 2 }, sidepart: { bang: 'parted', vol: 1 }, crop: { bang: 'blunt', vol: 0 }, mullet: { bang: 'jag', vol: 1, side: 1, back: 40 },
  topknot: { bang: 'short', vol: 0, bun: 'top', shave: 1 }, emo: { bang: 'swept', vol: 2, side: 2 }, spikytall: { bang: 'jag', vol: 3, spikes: 1.6 }, slickback: { bang: 'none', vol: 1, ahoge: 1 },
  // female
  lob: { bang: 'parted', vol: 2, side: 2, back: 40 }, shag: { bang: 'curtain', vol: 2, side: 1, back: 42 }, layered: { bang: 'swept', vol: 2, side: 2, back: 50 }, halfup: { bang: 'parted', vol: 1, side: 1, back: 44, bun: 'top' },
  sidebraid: { bang: 'swept', vol: 1, side: 1, tail: 'braid' }, bangsbob: { bang: 'blunt', vol: 2, side: 2, back: 34, flat: 1 }, longcurl: { bang: 'curl', vol: 3, side: 1, back: 50, wave: 1 }, pigtails: { bang: 'jag', vol: 1, side: 1, tail: 'twin' },
  // unisex
  locs: { bang: 'jag', vol: 2, back: 46, dread: 1, side: 1 }, bowl: { bang: 'blunt', vol: 2 }, tousled: { bang: 'jag', vol: 2, side: 1 }, ahoge: { bang: 'parted', vol: 1, side: 1, ahoge: 1 },
};
NE.HAIR_M = ['bald', 'buzz', 'fade', 'crew', 'short', 'quiff', 'slick', 'messy', 'spiky', 'curly', 'afro', 'mohawk', 'undercut', 'side', 'curtain', 'shaggy', 'wolf', 'lowtail', 'manbun', 'dreads', 'long', 'pompadour', 'sidepart', 'crop', 'mullet', 'topknot', 'emo', 'spikytall', 'slickback', 'locs', 'bowl', 'tousled', 'ahoge'];
NE.HAIR_F = ['pixie', 'bob', 'long', 'wavy', 'hime', 'longbangs', 'pony', 'ponyhigh', 'twintails', 'bun', 'spacebuns', 'braid', 'side', 'curtain', 'curly', 'afro', 'wolf', 'shaggy', 'shaved', 'dreads', 'buzz', 'lob', 'shag', 'layered', 'halfup', 'sidebraid', 'bangsbob', 'longcurl', 'pigtails', 'locs', 'bowl', 'tousled', 'ahoge'];
function buildPortrait(look, o) {
  const c = document.createElement('canvas'); c.width = PW; c.height = PH; const x = c.getContext('2d');
  const sk = NE.SKIN[look.skin] || '#d0a080', skS = NE.shade(sk, 0.84), skD = NE.shade(sk, 0.7), skH = NE.shade(sk, 1.07);
  const hc = NE.HAIRC[look.hairCol] || '#222', hS = NE.shade(hc, 0.66), hD = NE.shade(hc, 0.5), hH = NE.shade(hc, 1.55);
  const shirt = o.shirt || look.shirt, shS = NE.shade(shirt, 0.72), shH = NE.shade(shirt, 1.18);
  const F = look.sex === 'f'; const H = HP[look.hair] || HP.short; const cx = 24;
  const R = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  const ell = (ex, ey, rx, ry, col, clip) => { x.fillStyle = col; for (let j = Math.floor(ey - ry); j <= Math.ceil(ey + ry); j++) for (let i = Math.floor(ex - rx); i <= Math.ceil(ex + rx); i++) { const d = ((i + 0.5 - ex) / rx) ** 2 + ((j + 0.5 - ey) / ry) ** 2; if (d <= 1 && (!clip || clip(i, j))) x.fillRect(i, j, 1, 1); } };
  const rnd = (i, j) => NE.hash(i + look.seed, j * 13 + 7);
  const wide = { lean: 10.2, muscle: 11.4, fat: 12.3 }[NE.bodyOf ? NE.bodyOf(look) : ''] || { thin: 10, avg: 10.5, broad: 11.5 }[look.build] || 10.5; const jawK = [0.5, 0.6, 0.72][look.jaw] - (F ? 0.06 : 0);
  const headW = y => { if (y < 28) { const t = (y - 27) / 15; return wide * Math.sqrt(Math.max(0, 1 - t * t)); } const t = (y - 28) / 12; return wide * (1 - (1 - jawK) * t * 1.05) * Math.sqrt(Math.max(0, 1 - Math.pow(t, 4))); };
  const vol = H.vol || 0;
  // ---- back hair (behind head & shoulders)
  if (H.back) { const by = H.back, bw = wide + 3 + vol * 0.5; for (let j = 12; j <= by; j++) { const t = (j - 12) / (by - 12); let w = bw * (j < 24 ? 0.9 + (j - 12) * 0.01 : 1 - Math.max(0, t - 0.6) * 0.3); if (H.wave) w += Math.sin(j * 0.5) * 1.6;
      for (let i = Math.round(cx - w); i <= Math.round(cx + w); i++) { const end = by - (H.flat ? 0 : Math.floor(rnd(i, 77) * 5)); if (j > end) continue; if (H.dread && j > 28 && i % 3 === 0) continue; if (H.shave && i > cx) continue; const e = i < cx - w + 2 || i > cx + w - 2; R(i, j, 1, 1, e ? hS : (i * 3 + 40) % 11 === 0 && j > 20 ? hS : hc); } } }
  if (H.tail === 'pony' || H.tail === 'low' || H.tail === 'high') { const y0 = H.tail === 'high' ? 8 : H.tail === 'low' ? 24 : 14; for (let j = y0; j < y0 + 30; j++) { const px = cx + 12 + Math.sin(j * 0.16) * 2 + (H.tail === 'high' ? (j - y0) * 0.15 : 0); const w = 4 - Math.max(0, (j - y0 - 20) * 0.25); R(Math.round(px), j, Math.max(1, Math.round(w)), 1, j % 6 === 0 ? hS : hc); } R(cx + 11, y0 - 1, 3, 2, '#c05070'); }
  if (H.tail === 'twin') for (const sd of [-1, 1]) { for (let j = 15; j < 50; j++) { const w = 4 + Math.sin(j * 0.15) * 1.3 - Math.max(0, (j - 42) * 0.4); const px = cx + sd * (17 + (j - 15) * 0.1); R(Math.round(px - w / 2), j, Math.max(1, Math.round(w)), 1, j % 6 === 0 ? hS : hc); } R(Math.round(cx + sd * 17) - 1, 14, 3, 2, '#e05080'); }
  if (H.bun === 'top') ell(cx + (F ? 0 : 5), 7, F ? 5 : 3.5, F ? 4.5 : 3.5, hc); if (H.bun === 'double') { ell(cx - 10, 9, 4, 4, hc); ell(cx + 10, 9, 4, 4, hc); }
  if (H.bang === 'curl' && vol > 4) ell(cx, 20, 17, 15, hc);
  // ---- shoulders, neck, collar + a small accessory
  const sw = F ? 17 : 20; for (let j = 46; j < PH; j++) { const w = sw + (j - 46) * 0.6; R(Math.round(cx - w), j, Math.round(w * 2), 1, shirt); }
  for (let j = 46; j < PH; j++) { R(Math.round(cx - sw - (j - 46) * 0.6), j, 3, 1, shS); R(Math.round(cx + sw + (j - 46) * 0.6) - 3, j, 3, 1, shH); }
  R(cx - 4, 38, 8, 9, skS); R(cx - 4, 39, 8, 2, skD);
  for (let i = -6; i <= 6; i++) R(cx + i, 46 + Math.round((6 - Math.abs(i)) * 0.4), 1, 1, shH);
  // (no random neck accessories — they read as stray pixels)
  // ---- face
  for (let j = 13; j <= 40; j++) { const w = headW(j); if (w <= 0) continue; const a = Math.round(cx - w), b = Math.round(cx + w); for (let i = a; i <= b; i++) R(i, j, 1, 1, i > b - 2 ? skS : sk); }
  for (const sd of [-1, 1]) ell(cx + sd * (wide + 0.3), 29, 1.6, 2.8, sd > 0 ? skS : sk);
  // (no earring pixel)
  // (clean face: no jaw stripe)
  // ---- eyes (gold = the Vespa)
  const eyeY = 26, gold = o.vespa; const iris = gold ? (look.veye || '#ffcc2a') : NE.EYEC[look.eyeCol || 0], irisD = gold ? NE.shade(look.veye || '#ffcc2a', 0.5) : NE.shade(iris, 0.55), irisL = gold ? NE.shade(look.veye || '#ffcc2a', 1.5) : NE.shade(iris, 1.5);
  const closed = o.blink || o.expr === 'uncon' || o.expr === 'dead'; const eh = look.eyes === 2 ? 5 : 6;
  for (const sd of [-1, 1]) {
    const ex = sd < 0 ? cx - 9 : cx + 3;
    if (closed) { R(ex, eyeY + 3, 6, 1, '#2a1a14'); R(sd < 0 ? ex : ex + 5, eyeY + 2, 1, 1, '#2a1a14'); if (F) R(sd < 0 ? ex - 1 : ex + 6, eyeY + 2, 1, 1, '#2a1a14'); continue; }
    const top = o.expr === 'pain' ? eyeY + 2 : eyeY; const h = o.expr === 'pain' ? eh - 2 : eh;
    R(ex, top + 1, 6, h - 1, '#f8f4ee');
    const ix = ex + 1; R(ix, top + 1, 4, h - 1, iris); R(ix, top + 1, 4, 2, irisD); R(ix, top + h - 2, 4, 1, irisL);
    R(ix + 1, top + 2, 2, Math.max(1, h - 4), gold ? '#5a2800' : '#140c0a');
    R(ix, top + 2, 2, 2, '#ffffff'); R(ix + 3, top + h - 2, 1, 1, 'rgba(255,255,255,0.75)');
    R(ex - 1, top, 8, 1, '#1e1210'); R(ex, top - 1, 6, 1, F ? '#1e1210' : 'rgba(0,0,0,0)'); R(sd < 0 ? ex - 1 : ex + 6, top + 1, 1, 1, '#1e1210');
    if (gold) { x.globalAlpha = 0.28; R(ex - 1, top + 1, 8, h, look.vglow || '#ffe060'); x.globalAlpha = 1; R(ix, top + 2, 2, 2, '#ffffff'); }
    if (look.glasses) { x.strokeStyle = '#2a2a30'; x.lineWidth = 1; x.strokeRect(ex - 1.5, top - 0.5, 9, h + 2); }
  }
  if (look.glasses) R(cx - 2, eyeY + 1, 5, 1, '#2a2a30');
  const bc = NE.shade(hc, 0.85), by = eyeY - 3 - (look.brow === 2 ? 1 : 0);
  for (const sd of [-1, 1]) { const ex = sd < 0 ? cx - 9 : cx + 3; const pain = o.expr === 'pain'; for (let k = 0; k < 5; k++) { const yy = by + (pain ? (sd < 0 ? (k > 2 ? -1 : 0) : (k < 2 ? -1 : 0)) : ((sd < 0 ? k === 0 : k === 4) ? 1 : 0)); R(ex + k + (sd < 0 ? 1 : 0), yy, 1, look.brow === 1 && !F ? 2 : 1, bc); } }
  // blush, nose, mouth
  if (F && o.expr !== 'dead') { x.globalAlpha = 0.6; R(cx - 10, 33, 3, 2, '#ff8a9a'); R(cx + 7, 33, 3, 2, '#ff8a9a'); x.globalAlpha = 1; }
  R(cx, 33, 1, 1, skD);
  const my = 36;
  if (o.expr === 'pain') { R(cx - 3, my, 6, 2, '#5a1a1a'); R(cx - 2, my, 4, 1, '#f0ece0'); }
  else if (o.expr === 'dead') R(cx - 2, my + 1, 4, 1, '#5a3030');
  else { R(cx - 2, my, 4, 1, F ? '#b4505a' : NE.shade(sk, 0.55)); if (F) R(cx - 1, my + 1, 2, 1, '#e07888'); }
  // (no stubble speckle — reads as dirt)
  if (look.facial === 'beard') for (let j = 32; j <= 42; j++) for (let i = cx - 11; i <= cx + 11; i++) { if (Math.abs(i - cx) > headW(j) + (j > 39 ? 1 : 0)) continue; if (j === my && Math.abs(i - cx) < 3) continue; if (j < 34 && Math.abs(i - cx) < 7) continue; R(i, j, 1, 1, Math.abs(i - cx) > headW(j) - 1.5 ? hS : hc); }
  if (look.facial === 'mustache' || look.facial === 'goatee') { R(cx - 3, my - 1, 6, 1, hc); if (look.facial === 'goatee') R(cx - 1, my + 2, 2, 3, hc); }
  // (no freckles)
  // (no scar lines)
  // (no age lines)
  // ---- hair cap, highlight, bangs, side locks
  if (H.cap === 'buzz') for (let j = 11; j < 29; j++) for (let i = cx - 12; i <= cx + 12; i++) if (((i - cx) / 12) ** 2 + ((j - 21) / 10) ** 2 <= 1 && (j < 21 || Math.abs(i - cx) > headW(j) - 2.5) && rnd(i, j) < 0.82) R(i, j, 1, 1, rnd(j, i) < 0.3 ? hD : hS);
  if (H.cap === 'mohawk') { for (let j = 3; j < 19; j++) R(cx - 3, j, 6, 1, j < 6 ? hH : hc); for (let j = 13; j < 23; j++) for (let i = cx - 12; i <= cx + 12; i++) if (Math.abs(i - cx) > 3 && ((i - cx) / 12) ** 2 + ((j - 22) / 9) ** 2 <= 1 && rnd(i, j) < 0.4) R(i, j, 1, 1, hS); }
  if (H.cap === 0) R(cx - 6, 15, 4, 1, skH);
  if (H.cap === undefined) {
    const rx = wide + 2 + vol * 0.6, ry = 11.5 + vol * 0.4;
    // full scalp + temples down past the ears, so no style ever reads as a hood
    const capClip = (i, j) => { const ax = Math.abs(i - cx); const lim = ax > 7 ? 29 + (H.side ? 2 : 0) : ax > 4 ? 22 : 20; if (j > 21 && ax < headW(j) + 0.5) return false; return j <= lim && !(H.shave && i > cx + 3 && j > 16); };
    ell(cx, 23, rx, ry + 1, hc, capClip);
    // strand texture: darker strand grooves following the scalp curve + lighter strands, so hair never looks flat
    for (let j = Math.floor(23 - ry - 1); j <= 31; j++) for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) {
      const d = ((i + 0.5 - cx) / rx) ** 2 + ((j + 0.5 - 23) / (ry + 1)) ** 2; if (d > 1 || !capClip(i, j)) continue;
      const lane = Math.round((i - cx) * (1 + (23 - j) * 0.03)); const k = ((lane % 4) + 4) % 4;
      if (d > 0.82) R(i, j, 1, 1, hS); else if (k === 0 && rnd(i, j) < 0.75) R(i, j, 1, 1, NE.shade(hc, 0.8)); else if (k === 2 && rnd(j, i) < 0.3) R(i, j, 1, 1, NE.shade(hc, 1.12));
    }
    // temple / sideburn locks (cover the side of the head down to the ear on both sides)
    // temple locks sit on the OUTSIDE of the face edge only — smooth, never stepping inward over the cheeks
    for (const sd of [-1, 1]) for (let j = 20; j <= (F ? 31 : 28); j++) { const ex = Math.round(cx + sd * (headW(j) + 1)); R(ex, j, 1, 1, hc); R(ex + sd, j, 1, 1, hS); }
    if (H.shave) for (let j = 15; j < 27; j++) for (let i = cx + 5; i <= cx + 12; i++) if (rnd(i, j) < 0.45 && Math.abs(i - cx) <= headW(j) + 1) R(i, j, 1, 1, hS);
    if (H.spikes) for (let k = 0; k < 7; k++) { const sx = cx - 13 + k * 4.3; const sh = 3 + Math.round(rnd(k, 2) * 3) * H.spikes; for (let q = 0; q < sh; q++) R(Math.round(sx + q * 0.3), 12 - q + Math.round(Math.abs(k - 3) * 0.6), 2, 1, q === sh - 1 ? hH : hc); }
    if (H.bang === 'up') { ell(cx + 2, 10, 8, 5, hc); for (let i = cx - 3; i < cx + 7; i++) R(i, 7 + Math.round(rnd(i, 1)), 1, 1, hH); }
    // shiny highlight band (the anime "halo")
    for (let i = cx - 8; i <= cx + 6; i++) { const yy = Math.round(15 - vol * 0.3 + Math.pow((i - cx + 1) / 8, 2) * 2.5); if (rnd(i, 3) < 0.85) R(i, yy, 1, 1, hH); if (i % 3 === 0) R(i, yy + 1, 1, 1, NE.shade(hc, 1.25)); }
    const fr = (i, len, col) => { for (let j = 14; j < len; j++) R(i, j, 1, 1, col || hc); R(i, len, 1, 1, hS); if (Math.abs(i - cx) < headW(len + 1) - 1) R(i, len + 1, 1, 1, skS); };
    const lo = cx - 10, hi = cx + 10;
    switch (H.bang) {
      case 'short': for (let i = lo + 2; i <= hi - 2; i++) fr(i, 17 + Math.round(rnd(i, 9))); break;
      case 'jag': for (let i = lo; i <= hi; i++) fr(i, 18 + Math.round(((i - lo) % 4 === 1 ? 3 : (i - lo) % 4 === 2 ? 2 : 0) + rnd(i, 9))); break;
      case 'blunt': for (let i = lo; i <= hi; i++) fr(i, 20); break;
      case 'long': for (let i = lo; i <= hi; i++) fr(i, 22 + Math.round(((i - lo) % 3 === 1 ? 1 : 0))); break;
      case 'parted': for (let i = lo; i <= hi; i++) { if (Math.abs(i - cx - 1) < 1) continue; fr(i, 17 + Math.round(Math.abs(i - cx) * 0.35 + rnd(i, 9))); } break;
      case 'curtain': for (let i = lo; i <= hi; i++) { if (Math.abs(i - cx) < 3) continue; fr(i, 16 + Math.round(Math.abs(i - cx) * 0.5)); } break;
      case 'swept': for (let i = lo; i <= hi; i++) fr(i, 16 + Math.round(Math.max(0, hi - i) * 0.45 + rnd(i, 5))); break;
      case 'curl': for (let k = 0; k < 10; k++) ell(cx - 10 + k * 2.3, 18 + rnd(k, 4) * 2, 1.9, 1.9, k % 2 ? hc : hS); break;
    }
    if (H.side) for (const sd of [-1, 1]) { const len = H.side > 1 ? 41 : 33 + Math.round(rnd(sd, 6) * 3); for (let j = 17; j < len; j++) { const xx = Math.round(cx + sd * (headW(Math.min(j, 30)) + 0.5)) - (sd > 0 ? 2 : 0); const w = j > len - 4 ? 2 : 3; R(xx + (sd > 0 ? 0 : 3 - w), j, w, 1, j % 5 === 0 ? hS : hc); } }
    if (H.tail === 'braid') for (let j = 27; j < 52; j++) { const px = cx + 12 + Math.round(Math.sin(j * 0.55) * 1.2); R(px, j, 3, 1, (j % 3) ? hc : hS); }
    if (H.ahoge) { R(cx + 1, 8, 1, 3, hc); R(cx + 2, 7, 1, 2, hc); R(cx + 3, 6, 1, 1, hH); }
  }
  // ---- two-tone outline (dark rim + soft coloured halo), like a sticker
  const id = x.getImageData(0, 0, PW, PH), d = id.data; const ring = (from, col, alpha) => { const out = new Uint8Array(PW * PH); for (let j = 0; j < PH; j++) for (let i = 0; i < PW; i++) { if (d[(j * PW + i) * 4 + 3] > 40) continue; for (const [a2, b2] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + a2, jj = j + b2; if (ii >= 0 && jj >= 0 && ii < PW && jj < PH && d[(jj * PW + ii) * 4 + 3] >= from) { out[j * PW + i] = 1; break; } } } for (let k = 0; k < PW * PH; k++) if (out[k]) { d[k * 4] = col[0]; d[k * 4 + 1] = col[1]; d[k * 4 + 2] = col[2]; d[k * 4 + 3] = alpha; } };
  ring(120, [24, 14, 12], 255); const hr = hexRGB(NE.shade(hc, 0.9)); ring(250, [Math.min(255, hr[0] + 30), Math.min(255, hr[1] + 30), Math.min(255, hr[2] + 40)], 150);
  x.putImageData(id, 0, 0);
  return c;
}
class Portrait {
  constructor(canvas, surv, opts) { this.c = canvas; this.c.width = PW; this.c.height = PH; this.x = canvas.getContext('2d'); this.surv = surv; this.cache = {}; this.drips = []; this.blots = []; this.nextBlink = performance.now() + 1500 + Math.random() * 2500; this.blinkEnd = 0; this.opts = opts || {}; }
  img(o) { const k = [o.expr, o.blink ? 1 : 0, o.vespa ? 1 : 0, o.shirt || ''].join('|'); if (!this.cache[k]) this.cache[k] = buildPortrait(this.surv.look, Object.assign({ age: this.surv.age }, o)); return this.cache[k]; }
  draw(st) {
    const x = this.x, now = performance.now(); x.clearRect(0, 0, PW, PH);
    if (now > this.nextBlink) { this.blinkEnd = now + 130; this.nextBlink = now + 2200 + Math.random() * 3800; if (Math.random() < 0.2) this.nextBlink = now + 300; }
    const expr = st.expr || 'neutral'; const blink = now < this.blinkEnd && expr !== 'dead' && expr !== 'uncon';
    const vespa = st.vespa != null ? st.vespa : this.opts.vespa !== false;
    const im = this.img({ expr, blink, vespa, shirt: st.shirt });
    const life = NE.clamp(st.life == null ? 1 : st.life, 0, 1);
    // breathing bob + damage tint
    const bob = expr === 'dead' ? 0 : Math.round(Math.sin(now / 700) * 0.6 + 0.4);
    x.filter = life < 0.98 ? 'saturate(' + (0.35 + life * 0.65) + ') brightness(' + (0.6 + life * 0.4) + ')' : 'none';
    x.drawImage(im, 0, bob); x.filter = 'none';
    if (st.headBandage) { x.fillStyle = '#ece6d6'; x.fillRect(12, 16 + bob, 24, 3); x.fillStyle = '#c8bfa8'; x.fillRect(12, 18 + bob, 24, 1); x.fillStyle = '#b03030'; x.fillRect(27, 17 + bob, 2, 1); }
    while (this.blots.length < (st.headWounds || 0)) this.blots.push({ x: 14 + Math.random() * 20, y: 14 + Math.random() * 20, r: 1 + Math.random() * 1.5 });
    if (this.blots.length > (st.headWounds || 0) + 2) this.blots.length = st.headWounds || 0;
    x.fillStyle = '#9a1a14'; for (const b of this.blots) { x.fillRect(Math.round(b.x), Math.round(b.y) + bob, Math.ceil(b.r), Math.ceil(b.r)); x.fillRect(Math.round(b.x), Math.round(b.y + b.r) + bob, 1, 3); }
    if (st.bleeding > 0.1 && Math.random() < Math.min(0.4, st.bleeding * 0.05)) this.drips.push({ x: 12 + Math.random() * 24, y: 30 + Math.random() * 8, l: 0, v: 0.2 + Math.random() * 0.4 });
    x.fillStyle = 'rgba(150,20,14,0.85)'; for (const dr of this.drips) { dr.l += dr.v; x.fillRect(Math.round(dr.x), Math.round(dr.y), 1, Math.round(dr.l)); }
    this.drips = this.drips.filter(dr => dr.y + dr.l < PH + 4); if (this.drips.length > 30) this.drips.shift();
    if (life < 0.5) { x.fillStyle = 'rgba(80,0,0,' + (0.5 - life) * 0.6 + ')'; x.fillRect(0, 0, PW, PH); }
  }
}
NE.Portrait = Portrait;
})(window.NE);
