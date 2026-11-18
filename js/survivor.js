// Nectar's End — random human survivors, anatomy simulation, inventory, ragdoll drawing, fading-ink portrait
(function (NE) {
'use strict';
const { ri, rf, pick, clamp, chance, lerp } = NE;

NE.SKIN = ['#f3d5bb', '#e9c09c', '#d6a47b', '#b97f55', '#93603e', '#6a4128', '#4a2c1a'];
NE.HAIRC = ['#141010', '#2e1e14', '#5a3820', '#8a5a30', '#c49050', '#e0c080', '#8a8a86', '#d8d6d0', '#7a2e18', '#3a2a40'];
NE.HAIRS = ['bald', 'buzz', 'short', 'long', 'mohawk', 'pony', 'curly', 'side', 'bun', 'short', 'long'];
NE.SHIRTS = ['#6a4a3a', '#4a5a6a', '#7a6a4a', '#5a3a3a', '#3a4a3a', '#8a7a6a', '#5a5a5a', '#7a3a2a', '#2a3a5a', '#6a6a3a', '#7a5a6a', '#3a5a5a'];
NE.PANTS = ['#3a3a4a', '#4a3a2a', '#2a2a2a', '#5a5048', '#33404a', '#4a4a3a'];

NE.makeSurvivor = function () {
  const occ = pick(NE.OCCUPATIONS);
  const goods = NE.TRAITS.filter(t => t.good), bads = NE.TRAITS.filter(t => !t.good);
  const traits = [pick(goods), pick(bads)]; if (chance(0.25)) { const g2 = pick(goods); if (!traits.includes(g2)) traits.push(g2); }
  const age = ri(19, 63);
  let hairCol = ri(0, NE.HAIRC.length - 1); if (age > 50 && chance(0.6)) hairCol = chance(0.5) ? 6 : 7;
  const look = {
    skin: ri(0, NE.SKIN.length - 1), hair: pick(NE.HAIRS), hairCol, facial: pick(['none', 'none', 'none', 'stubble', 'beard', 'mustache']),
    build: pick(['thin', 'avg', 'avg', 'broad']), scar: chance(0.3), jaw: ri(0, 2), nose: ri(0, 2), brow: ri(0, 2), eyes: ri(0, 2),
    shirt: pick(NE.SHIRTS), pants: pick(NE.PANTS), freckles: chance(0.2), glasses: chance(0.15), seed: ri(1, 99999),
  };
  const first = pick(NE.FIRST), last = pick(NE.LAST);
  return { first, last, name: first + ' ' + last, age, occ: occ.id, traits: traits.map(t => t.id), look, tears: 0 };
};

const ADD = new Set(['stamina', 'carry', 'painTol', 'slots', 'craft']);
function applyMods(s, m) { if (!m) return; for (const k in m) { if (k === 'lungs') s.lungs = m[k]; else if (ADD.has(k)) s[k] += m[k]; else s[k] = (s[k] == null ? 1 : s[k]) * m[k]; } }
NE.computeStats = function (meta, surv) {
  const s = { speed: 1, stamina: 0, staminaCost: 1, fall: 1, noise: 1, climb: 1, gas: 1, sight: 1, aim: 1, tox: 1, rad: 1, infect: 1, bleed: 1, painTol: 0, fracture: 1, hunger: 1, thirst: 1, cold: 1, melee: 1, carry: 0, slots: 0, stress: 1, barter: 1, treat: 1, search: 1, loot: 1, coldblood: false, medEff: 1, battery: 1, craft: 0, lungs: 100 };
  const P = (meta && meta.perks) || {}; const r = id => P[id] || 0;
  s.speed += r('movement') * 0.04; s.staminaCost -= r('movement') * 0.05;
  s.fall -= r('agility') * 0.1; s.noise -= r('agility') * 0.08; s.climb += r('agility') * 0.1;
  s.stamina += r('cardio') * 12; s.gas -= r('cardio') * 0.12;
  s.sight += r('eyesight') * 0.15; s.loot += r('eyesight') * 0.3;
  const tl = r('tolerance'); s.tox -= tl * 0.1; s.rad -= tl * 0.1; s.infect -= tl * 0.1; s.bleed -= tl * 0.06;
  s.treat -= r('medicine') * 0.1; s.medEff += r('medicine') * 0.1;
  const en = r('endurance'); s.painTol += en * 8; s.fracture -= en * 0.08; s.hunger -= en * 0.06; s.thirst -= en * 0.06; s.cold -= en * 0.08;
  s.melee += r('strength') * 0.08; s.carry += r('strength') * 2.5;
  s.search -= r('scavenger') * 0.12; s.loot += r('scavenger') * 0.2;
  const ps = r('psychology'); s.stress -= ps * 0.12; s.aim -= ps * 0.06; s.barter -= ps * 0.06;
  s.coldblood = r('coldblood') > 0;
  if (surv) {
    const occ = NE.OCCUPATIONS.find(o => o.id === surv.occ); if (occ) applyMods(s, occ.mods);
    for (const t of surv.traits) { const tr = NE.TRAITS.find(x => x.id === t); if (tr) applyMods(s, tr.mods); }
  }
  if (meta) {
    const of = NE.OUTFITS.find(o => o.id === meta.equipped.outfit); if (of) applyMods(s, of.mods);
    const bp = NE.BACKPACKS.find(o => o.id === meta.equipped.backpack) || NE.BACKPACKS[0];
    s.slots += bp.slots; s.carry += bp.carry; s.medHalf = bp.id === 'paramedic';
  }
  return s;
};

// ---------------- Inventory ----------------
class Inv {
  constructor(slots, carry) { this.items = []; this.slots = slots; this.carry = carry; this.medHalf = false; }
  weight() { let w = 0; for (const e of this.items) { const it = NE.ITEMS[e.id]; let x = it.stack ? it.w * e.n : it.w; if (this.medHalf && it.cat === 'med') x *= 0.5; w += x; } return w; }
  count(id) { let n = 0; for (const e of this.items) if (e.id === id) n += e.n; return n; }
  has(id) { return this.count(id) > 0; }
  find(id) { return this.items.find(e => e.id === id); }
  add(id, n, extra) {
    n = n == null ? 1 : n; const it = NE.ITEMS[id]; if (!it) return n;
    if (it.stack) {
      for (const e of this.items) if (e.id === id && e.n < it.stack) { const k = Math.min(n, it.stack - e.n); e.n += k; n -= k; if (!n) return 0; }
      while (n > 0 && this.items.length < this.slots) { const k = Math.min(n, it.stack); this.items.push({ id, n: k }); n -= k; }
      return n;
    }
    while (n > 0 && this.items.length < this.slots) { const e = { id, n: it.uses || 1 }; if (it.dur) e.dur = it.dur; if (it.gun) e.mag = 0; Object.assign(e, extra || {}); this.items.push(e); n--; }
    return n;
  }
  addEntry(e) { const it = NE.ITEMS[e.id]; if (it.stack) return this.add(e.id, e.n) === 0; if (this.items.length >= this.slots) return false; this.items.push(e); return true; }
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
  cut: { name: 'Cut', bleed: [0.3, 0.9], clot: 40, pain: 5 },
  lac: { name: 'Laceration', bleed: [1.2, 2.8], clot: 120, pain: 12 },
  punct: { name: 'Puncture', bleed: [0.8, 2], clot: 100, pain: 13 },
  art: { name: 'Arterial Bleed', bleed: [8, 12], clot: 0, pain: 16 },
  gsw: { name: 'Gunshot Wound', bleed: [2, 4], clot: 180, pain: 20 },
  bite: { name: 'Bite', bleed: [0.8, 2], clot: 100, pain: 12 },
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
    this.drugs = { painkiller: 0, morphine: 0, antibiotic: 0, antirad: 0, adrenaline: 0, blood: 0 };
    this.uncon = false; this.dead = false; this.cause = ''; this.lastHit = ''; this.flags = {}; this.ev = [];
  }
  get stamMax() { return Math.max(30, (100 + this.s.stamina) * (0.4 + 0.6 * this.org.lungs / 100) * (this.blood > 3800 ? 1 : 0.7)); }
  get threshold() { return 60 + this.s.painTol + (this.s.coldblood ? 10 : 0); }
  bleedRate() {
    let tot = 0;
    for (const p of PARTS) { const P = this.parts[p]; for (const w of P.wounds) { if (w.closed) continue; tot += this.woundBleed(P, w, p); } }
    let m = this.s.bleed; if (this.s.coldblood && this.stress > 40) m *= 0.8; return tot * m;
  }
  woundBleed(P, w, p) {
    if (w.closed) return 0; let b = w.bleed;
    if (P.tq && limb(p)) return 0;
    if (P.bandage) b *= w.t === 'art' ? 0.55 : (1 - 0.85 * P.bandage.q * (1 - P.bandage.soak * 0.8));
    return b;
  }
  partBleed(p) { const P = this.parts[p]; let t = 0; for (const w of P.wounds) t += this.woundBleed(P, w, p); return t * this.s.bleed; }
  damage(part, amt, kind, src) {
    if (this.dead) return; const P = this.parts[part]; const s = this.s; this.lastHit = src || this.lastHit;
    P.hp = Math.max(0, P.hp - amt); this.painSpike += amt * 0.8; this.stress += amt * 0.6;
    const add = (t, dirty, extra) => { const W = WT[t]; const w = Object.assign({ t, bleed: rf(W.bleed[0], W.bleed[1]) * (0.6 + amt / 30), dirty: dirty || 0, inf: 0, closed: false, age: 0, bullet: false }, extra || {}); if (t === 'burn' || t === 'bruise') w.closed = true; P.wounds.push(w); if (P.wounds.length > 6) P.wounds.shift(); return w; };
    if (kind === 'sharp') { add(amt > 13 ? 'lac' : 'cut', 0.15); if (limb(part) && amt > 15 && chance(0.15)) { add('art', 0.1); this.ev.push('artery'); } else this.ev.push('bleed'); }
    else if (kind === 'bite') { add('bite', 0.65); this.ev.push('bleed'); }
    else if (kind === 'bullet') { add('gsw', 0.3, { bullet: chance(0.6) }); if (limb(part) && chance(0.22)) { add('art', 0.2); this.ev.push('artery'); } else this.ev.push('bleed'); if (limb(part) && chance(0.25 * s.fracture)) this.fracture(part); }
    else if (kind === 'frag') { add('punct', 0.4, { bullet: chance(0.5) }); this.ev.push('bleed'); }
    else if (kind === 'burn') { add('burn', 0.25); }
    else if (kind === 'glass') { add('cut', 0.3, { bleed: rf(0.4, 1) }); this.ev.push('bleed'); }
    else { // blunt / fall / crush
      add('bruise', 0); const fc = (kind === 'fall' ? 0.06 : 0.025) * amt * s.fracture * (part === 'torso' ? 0.4 : part === 'head' ? 0.3 : 1);
      if (amt > 6 && chance(fc)) this.fracture(part);
      if (amt > 16 && chance(0.3)) add('lac', 0.2);
    }
    // organ damage
    if (part === 'head') { if (amt > 10) this.org.brain -= amt * (kind === 'bullet' ? 0.9 : 0.35); if (chance(0.15)) this.org.eyes -= amt * 0.5; if (P.hp <= 0) this.org.brain -= 40; }
    if (part === 'torso') { if (chance(kind === 'bullet' ? 0.8 : 0.35)) { const o = pick(['lungs', 'heart', 'stomach', 'liver', 'lungs', 'liver']); this.org[o] -= amt * (kind === 'bullet' ? 0.7 : 0.3); } if (P.hp <= 0) this.org.heart -= 20; }
    for (const k in this.org) this.org[k] = Math.max(0, this.org[k]);
  }
  fracture(part) { const P = this.parts[part]; if (P.frac) return; P.frac = true; P.splint = false; P.fracT = 0; this.painSpike += 22; this.ev.push('fracture'); if (NE.Audio) NE.Audio.play('crack'); }
  legFactor() {
    let f = 1; let broken = 0;
    for (const p of ['lleg', 'rleg']) { const P = this.parts[p]; if (P.frac) { broken++; f *= P.splint ? 0.85 : 0.55; } f *= 0.6 + 0.4 * P.hp / P.max; }
    return { f, broken, crawl: broken === 2 && !(this.parts.lleg.splint && this.parts.rleg.splint) };
  }
  armFactor() { let f = 1; for (const p of ['larm', 'rarm']) { const P = this.parts[p]; if (P.frac) f *= P.splint ? 0.8 : 0.5; f *= 0.6 + 0.4 * P.hp / P.max; } return f; }
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
          if (W.clot > 0 && !(P.tq && limb(p))) { w.bleed *= Math.exp(-dt / (W.clot * s.bleed * (P.bandage ? 0.45 : 1) * (w.bullet ? 2.5 : 1))); if (w.bleed < 0.04 && !w.bullet) { w.closed = true; w.bleed = 0; } }
        } else { w.age += dt; if (w.age > (w.t === 'bruise' ? 50 : w.t === 'burn' ? 160 : w.sutured ? 90 : 140) && w.inf < 20) { P.wounds.splice(i, 1); continue; } }
        if (env.dirtyWater && !P.bandage) w.dirty = Math.min(1, w.dirty + dt * 0.02);
        const bandClean = P.bandage && !P.bandage.dirty ? 0.4 : 1;
        if (w.dirty > 0) w.inf += dt * 0.03 * w.dirty * s.infect * bandClean;
        if (this.drugs.antibiotic > 0) { w.inf = Math.max(0, w.inf - dt * 0.6); w.dirty = Math.max(0, w.dirty - dt * 0.01); }
        maxInf = Math.max(maxInf, w.inf);
        painW += W.pain * 0.7 * (w.closed ? 0.3 : 1) * (w.bullet ? 1.4 : 1);
      }
      if (P.frac) painW += P.splint ? 6 : 18;
      painW += (1 - P.hp / P.max) * 12;
      if (P.tq) painW += 10 + Math.min(20, P.tqT / 8);
      if (P.bandage && P.wounds.length === 0) P.bandage = null;
      if (P.wounds.every(w => w.closed) && !this.npc && this.hunger > 20 && this.thirst > 20) P.hp = Math.min(P.max, P.hp + dt * 0.12);
    }
    bleed *= s.bleed; if (s.coldblood && this.stress > 40) bleed *= 0.8;
    this.bleeding = bleed; this.blood -= bleed * dt;
    if (bleed < 0.05 && this.thirst > 15) this.blood = Math.min(5000, this.blood + dt * 0.6);
    if (this.drugs.blood > 0) this.blood = Math.min(5000, this.blood + dt * 8.5);
    this.infection = lerp(this.infection, maxInf, Math.min(1, dt)) ;
    // ----- drugs decay
    const dur = { painkiller: 120, morphine: 150, antibiotic: 200, antirad: 60, adrenaline: 40, blood: 118 };
    for (const k in this.drugs) if (this.drugs[k] > 0) this.drugs[k] = Math.max(0, this.drugs[k] - dt / dur[k]);
    // ----- pain
    this.painSpike *= Math.exp(-dt / 3);
    const relief = this.drugs.painkiller * 30 + this.drugs.morphine * 70 + this.drugs.adrenaline * 25;
    let tp = painW + this.painSpike + (this.infection > 50 ? 10 : 0) + (100 - this.org.stomach) * 0.08 - relief;
    this.pain = lerp(this.pain, Math.max(0, tp), Math.min(1, dt * 2.5));
    // ----- survival needs (player only)
    if (!this.npc) {
      const mv = env.sprint ? 1.6 : 1;
      this.hunger = Math.max(0, this.hunger - dt * 100 / 1300 * s.hunger * mv);
      this.thirst = Math.max(0, this.thirst - dt * 100 / 900 * s.thirst * mv * (this.temp > 38 ? 1.4 : 1));
      if (env.water) this.wet = 1; else this.wet = Math.max(0, this.wet - dt * (env.fire ? 0.08 : 0.008));
      let tt = 37 - (env.cold || 0) * 2.2 * s.cold - this.wet * 2.2 * s.cold * (env.cold ? 1 : 0.4);
      if (env.fire) tt = 37.4;
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
      if (this.thirst <= 0) this.org.stomach -= dt * 0.05; if (this.hunger <= 0) this.org.stomach -= dt * 0.03;
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
    tc -= this.drugs.morphine * 12 + this.gas * 18 * s.gas; tc += this.drugs.adrenaline * 45;
    this.cons = this.cons > tc ? Math.max(tc, this.cons - dt * 14) : Math.min(tc, this.cons + dt * 7);
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
    for (const p of PARTS) { const P = this.parts[p]; if (P.frac) c.push([(P.splint ? 'Splinted ' : 'Broken ') + NE.PART_NAMES[p].toLowerCase(), P.splint ? 'warn' : 'bad']); if (P.tq) c.push(['Tourniquet: ' + NE.PART_NAMES[p] + ' (' + Math.floor(P.tqT) + 's)', P.tqT > 150 ? 'bad' : 'warn']); if (P.wounds.some(w => w.bullet)) c.push(['Lodged fragment: ' + NE.PART_NAMES[p], 'warn']); }
    const bp = this.blood / 5000; if (bp < 0.6) c.push(['Hypovolemic shock', 'bad']); else if (bp < 0.8) c.push(['Blood loss', 'warn']);
    if (this.pain > this.threshold) c.push(['Agonizing pain', 'bad']); else if (this.pain > this.threshold * 0.6) c.push(['In pain', 'warn']);
    if (this.temp < 35) c.push(['Hypothermia', 'bad']); else if (this.temp < 36) c.push(['Cold', 'warn']); if (this.temp > 38.3) c.push(['Fever', 'warn']);
    if (this.infection > 70) c.push(['Sepsis', 'bad']); else if (this.infection > 30) c.push(['Infection', 'warn']);
    if (this.rad > 60) c.push(['Radiation sickness', 'bad']); else if (this.rad > 25) c.push(['Irradiated', 'warn']);
    if (this.tox > 30) c.push(['Nauseous', 'warn']); if (this.gas > 0) c.push(['Choking', 'bad']);
    if (this.hunger < 15) c.push(['Starving', 'bad']); else if (this.hunger < 35) c.push(['Hungry', 'warn']);
    if (this.thirst < 15) c.push(['Dehydrated', 'bad']); else if (this.thirst < 35) c.push(['Thirsty', 'warn']);
    if (this.org.brain < 70) c.push(['Concussed', 'warn']); if (this.org.eyes < 60) c.push(['Blurred vision', 'warn']); if (this.org.lungs < 60) c.push(['Damaged lungs', 'warn']);
    if (this.stress > 70) c.push(['Panicking', 'bad']); else if (this.stress > 45) c.push(['Stressed', 'warn']);
    for (const k in this.drugs) if (this.drugs[k] > 0) c.push([{ painkiller: 'Painkillers', morphine: 'Morphine', antibiotic: 'Antibiotics', antirad: 'Anti-Rad', adrenaline: 'Adrenaline', blood: 'Transfusion' }[k] + ' active', 'good']);
    if (!c.length) c.push(['Stable', 'good']);
    return c;
  }
}
NE.Anatomy = Anatomy;

// ---------------- Ragdoll ----------------
// 0 head,1 chest,2 pelvis,3 bElbow,4 bHand,5 fElbow,6 fHand,7 bKnee,8 bFoot,9 fKnee,10 fFoot
const BASE = [[0.5, -14], [0, -11], [0, -6.5], [-1, -8.5], [-1.5, -5.5], [1, -8.5], [1.5, -5.5], [-0.5, -3.3], [-1, 0], [0.5, -3.3], [1, 0]];
const LINKS = [[0, 1], [1, 2], [1, 3], [3, 4], [1, 5], [5, 6], [2, 7], [7, 8], [2, 9], [9, 10], [0, 2, 0.4], [1, 7, 0.15], [1, 9, 0.15]];
NE.makeRag = function (phys, x, y) {
  const b = new NE.PBody('rag'); b.tiles = false; b.collide = false; b.noActor = true; b.damp = 0.97; b.fric = 0.6; b.bounce = 0.1;
  for (let i = 0; i < BASE.length; i++) b.point(x + BASE[i][0], y + BASE[i][1], i === 0 ? 2.2 : 1.4, i < 3 ? 1.6 : 1);
  for (const l of LINKS) b.link(l[0], l[1], l[2] == null ? 1 : l[2]);
  phys.add(b); return b;
};
NE.ragPose = function (a) {
  const f = a.facing; const P = BASE.map(p => [p[0], p[1]]); const ph = a.walkPh || 0; const s = Math.sin(ph), c = Math.cos(ph);
  const mv = Math.min(1, Math.abs(a.vx) / 40);
  if (a.crawl) {
    const o = [[6, -2.5], [3, -2.6], [-2, -2], [4.5, -1], [6 + s * 1.5, 0], [3, -1], [5 - s * 1.5, 0], [-4, -1.2], [-7 + s, -1.6], [-4, -1.2], [-7 - s, -1.6]];
    for (let i = 0; i < 11; i++) { P[i][0] = o[i][0]; P[i][1] = o[i][1]; }
  } else if (a.climbing) {
    const al = Math.sin((a.climbPh || 0));
    P[3] = [-1.5, -12]; P[4] = [-1.5, -15 + al * 1.5]; P[5] = [1.5, -12]; P[6] = [1.5, -15 - al * 1.5];
    P[7] = [-1, -4 + al]; P[8] = [-1, -0.5 + al]; P[9] = [1, -4 - al]; P[10] = [1, -0.5 - al]; P[0] = [0, -14];
  } else if (a.crouch) {
    P[0] = [1.2, -10]; P[1] = [0.6, -7.5]; P[2] = [-0.5, -4]; P[7] = [1.5, -3]; P[8] = [-1, 0]; P[9] = [2.5, -2.6]; P[10] = [1.5, 0];
    P[3] = [0, -5]; P[4] = [1, -3]; P[5] = [1.5, -5]; P[6] = [2.5, -3];
    if (mv > 0.1) { P[8][0] += s * 1.5; P[10][0] -= s * 1.5; }
  } else if (!a.onGround) {
    P[7] = [0.5, -4.5]; P[8] = [-0.5, -1.5]; P[9] = [1.5, -4]; P[10] = [1, -1]; P[3] = [-2, -10]; P[4] = [-3, -11.5]; P[5] = [2, -10]; P[6] = [3, -11.5];
  } else if (mv > 0.05) {
    const amp = a.sprint ? 1.5 : 1;
    P[10][0] += s * 3 * amp; P[10][1] -= Math.max(0, c) * 1.6 * amp; P[8][0] -= s * 3 * amp; P[8][1] -= Math.max(0, -c) * 1.6 * amp;
    P[9][0] += s * 1.5 * amp + 0.6; P[7][0] -= s * 1.5 * amp - 0.6;
    P[6][0] -= s * 2 * amp; P[4][0] += s * 2 * amp; P[5][0] -= s * amp; P[3][0] += s * amp;
    if (a.sprint) { P[0][0] += 1.5; P[1][0] += 1; }
    P[0][1] += Math.abs(c) * 0.4; P[1][1] += Math.abs(c) * 0.4; P[2][1] += Math.abs(c) * 0.3;
  } else { const br = Math.sin(performance.now() / 600) * 0.3; P[0][1] += br; P[1][1] += br * 0.6; }
  if (a.limp) { P[2][1] += 0.6; P[0][0] -= 0.4; }
  // convert to world with facing
  const out = P.map(p => [a.x + p[0] * f, a.y + p[1]]);
  // arms: aim / swing / treat
  const ch = out[1];
  if (!a.crawl && !a.climbing) {
    if (a.aimDir && a.gunOut) { const d = a.aimDir; out[6] = [ch[0] + d.x * 6, ch[1] + d.y * 6]; out[5] = [ch[0] + d.x * 3, ch[1] + d.y * 3 + 1]; if (a.twoHand) { out[4] = [ch[0] + d.x * 4.5, ch[1] + d.y * 4.5 + 0.5]; out[3] = [ch[0] + d.x * 2, ch[1] + 1.5]; } }
    else if (a.swingT > 0) { const t = 1 - a.swingT / a.swingDur; const ang = lerp(-1.9, 0.8, Math.min(1, t * 1.6)); const dx = Math.cos(ang) * f, dy = Math.sin(ang); out[6] = [ch[0] + dx * 6, ch[1] + dy * 6]; out[5] = [ch[0] + dx * 3, ch[1] + dy * 3]; }
    else if (a.treating) { const k = Math.sin(performance.now() / 120); out[6] = [ch[0] + f * 2, ch[1] + 3 + k]; out[4] = [ch[0] + f * 1, ch[1] + 3 - k]; }
    else if (a.holdT > 0) { out[6] = [ch[0] + f * 4, ch[1] - 1]; }
  }
  return out;
};
NE.driveRag = function (rag, a, dt) {
  if (a.limpRag) return; const tgt = NE.ragPose(a); const ks = [0.55, 0.65, 0.75, 0.35, 0.3, 0.45, 0.4, 0.5, 0.55, 0.5, 0.55];
  const vx = a.vx / 60, vy = a.vy / 60;
  for (let i = 0; i < rag.pts.length; i++) { const p = rag.pts[i], k = ks[i]; p.x = lerp(p.x, tgt[i][0], k); p.y = lerp(p.y, tgt[i][1], k); p.ox = lerp(p.ox, tgt[i][0] - vx, k); p.oy = lerp(p.oy, tgt[i][1] - vy, k); }
};
NE.ragLimp = function (rag) { rag.tiles = true; rag.collide = true; rag.noActor = false; rag.damp = 0.985; for (const c of rag.cons) if (c.s < 1) c.s = 0.02; };

// draw a humanoid from ragdoll points
NE.drawHuman = function (ctx, rag, look, o) {
  o = o || {}; const p = rag.pts; const f = o.facing || 1;
  const skin = o.skinCol || NE.SKIN[look.skin] || '#d0a080'; const hair = NE.HAIRC[look.hairCol] || '#222';
  const shirt = o.shirt || look.shirt, pants = o.pants || look.pants; const dark = o.dim ? 0.6 : 1;
  const sh = c => NE.shade(c, 0.7 * dark), N = c => dark < 1 ? NE.shade(c, dark) : c;
  const anat = o.anat; const fr = f > 0 ? 'r' : 'l', bk = f > 0 ? 'l' : 'r';
  const partMark = (part, x1, y1, x2, y2) => {
    if (!anat) return; const P = anat.parts[part]; const mx = Math.round((x1 + x2) / 2), my = Math.round((y1 + y2) / 2);
    if (P.wounds.some(w => !w.closed) || P.hp < P.max * 0.5) { ctx.fillStyle = '#8a1010'; ctx.fillRect(mx, my, 1, 1); if (P.hp < P.max * 0.5) ctx.fillRect(Math.round(x2), Math.round(y2) - 1, 1, 1); }
    if (P.bandage) { ctx.fillStyle = P.bandage.soak > 0.5 ? '#c08080' : '#e8e2d0'; ctx.fillRect(mx - 1, my, 2, 1); }
    if (P.splint) { ctx.fillStyle = '#8a7a5a'; ctx.fillRect(mx, my - 1, 1, 2); }
    if (P.tq) { ctx.fillStyle = '#111'; ctx.fillRect(Math.round(x1 + (x2 - x1) * 0.3), Math.round(y1 + (y2 - y1) * 0.3), 2, 1); }
  };
  const limbDraw = (a, b, c, col1, col2, part, back) => { NE.pline(ctx, p[a].x, p[a].y, p[b].x, p[b].y, 2, back ? sh(col1) : N(col1)); NE.pline(ctx, p[b].x, p[b].y, p[c].x, p[c].y, 2, back ? sh(col2) : N(col2)); partMark(part, p[a].x, p[a].y, p[c].x, p[c].y); };
  // back limbs
  limbDraw(2, 7, 8, pants, pants, bk + 'leg', true);
  ctx.fillStyle = '#1a1612'; ctx.fillRect(Math.round(p[8].x) - 1, Math.round(p[8].y) - 1, 2, 1);
  limbDraw(1, 3, 4, shirt, skin, bk + 'arm', true);
  // backpack
  if (o.pack) { const dx = p[2].x - p[1].x, dy = p[2].y - p[1].y; const L = Math.hypot(dx, dy) || 1; const nx = -dy / L * -f, ny = dx / L * -f; const bx = p[1].x + dx * 0.15 + nx * 2.2, by = p[1].y + dy * 0.15 + ny * 2.2; NE.pline(ctx, bx, by, bx + dx * 0.6, by + dy * 0.6, 3, N(o.pack[0])); ctx.fillStyle = N(o.pack[1]); ctx.fillRect(Math.round(bx + dx * 0.3) - 1, Math.round(by + dy * 0.3), 2, 1); }
  // torso
  NE.pline(ctx, p[1].x, p[1].y, p[2].x, p[2].y, 3, N(o.vest ? '#3a3e36' : shirt));
  if (o.vest) { ctx.fillStyle = '#5a6050'; ctx.fillRect(Math.round(p[1].x) - 1, Math.round(p[1].y) + 1, 3, 1); }
  partMark('torso', p[1].x, p[1].y, p[2].x, p[2].y);
  // front leg
  limbDraw(2, 9, 10, pants, pants, fr + 'leg', false);
  ctx.fillStyle = '#1a1612'; ctx.fillRect(Math.round(p[10].x) - 1, Math.round(p[10].y) - 1, 2, 1);
  // head
  const hx = Math.round(p[0].x), hy = Math.round(p[0].y);
  ctx.fillStyle = N(skin); ctx.fillRect(hx - 2, hy - 2, 5, 5); ctx.fillRect(hx - 1, hy + 3, 3, 1);
  const hs = look.hair; ctx.fillStyle = N(hair);
  if (hs !== 'bald') {
    if (hs === 'buzz') ctx.fillRect(hx - 2, hy - 2, 5, 1);
    else { ctx.fillRect(hx - 2, hy - 3, 5, 2); ctx.fillRect(hx - 2 - (f > 0 ? 1 : -4) , hy - 2, 1, 2); ctx.fillRect(f > 0 ? hx - 2 : hx + 2, hy - 2, 1, 3); }
    if (hs === 'long') ctx.fillRect(f > 0 ? hx - 3 : hx + 3, hy - 2, 1, 6);
    if (hs === 'mohawk') { ctx.clearRect(hx - 2, hy - 3, 1, 1); ctx.fillRect(hx - 1, hy - 4, 3, 1); }
    if (hs === 'pony' || hs === 'bun') ctx.fillRect(f > 0 ? hx - 4 : hx + 4, hy - (hs === 'bun' ? 3 : 1), 1, hs === 'bun' ? 2 : 3);
    if (hs === 'curly') { ctx.fillRect(hx - 3, hy - 3, 7, 2); ctx.fillRect(hx - 3, hy - 1, 1, 2); }
  }
  if (look.facial === 'beard') { ctx.fillStyle = N(hair); ctx.fillRect(hx - 1, hy + 1, 3, 2); }
  if (o.helmet) { ctx.fillStyle = N(o.helmet); ctx.fillRect(hx - 3, hy - 3, 7, 2); }
  ctx.fillStyle = o.dead ? '#3a2a2a' : '#111'; ctx.fillRect(hx + (f > 0 ? 1 : -1), hy, 1, 1);
  if (o.glasses || look.glasses) { ctx.fillStyle = '#9ad'; ctx.fillRect(hx + (f > 0 ? 1 : -1), hy, 1, 1); }
  if (o.mask) { ctx.fillStyle = '#2a2e30'; ctx.fillRect(hx + (f > 0 ? 0 : -2), hy + 1, 3, 2); }
  partMark('head', p[0].x, p[0].y - 1, p[0].x, p[0].y + 1);
  if (anat && anat.parts.head.bandage) { ctx.fillStyle = '#e8e2d0'; ctx.fillRect(hx - 2, hy - 2, 5, 1); }
  // front arm
  limbDraw(1, 5, 6, shirt, skin, fr + 'arm', false);
  // weapon
  if (o.weapon) {
    const it = NE.ITEMS[o.weapon]; const hxw = p[6].x, hyw = p[6].y;
    if (it && it.gun) { const d = o.aimDir || { x: f, y: 0 }; const L = it.id === 'rifle' ? 8 : 4; NE.pline(ctx, hxw, hyw, hxw + d.x * L, hyw + d.y * L, 1, '#2a2a2e'); if (it.id === 'rifle') NE.pline(ctx, hxw - d.x * 2, hyw - d.y * 2 + 1, hxw, hyw, 1, '#5a3a20'); }
    else if (it && it.melee) {
      let dx = p[6].x - p[5].x, dy = p[6].y - p[5].y; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
      const len = { pipe: 7, knife: 3, shiv: 3, crowbar: 7, axe: 8 }[it.id] || 5; const col = { pipe: '#8a8f94', knife: '#d0d0d0', shiv: '#a0a0a0', crowbar: '#a0302a', axe: '#6a4a2a' }[it.id];
      NE.pline(ctx, hxw, hyw, hxw + dx * len, hyw + dy * len, 1, col);
      if (it.id === 'axe') { ctx.fillStyle = '#c0c4c8'; ctx.fillRect(Math.round(hxw + dx * len) - 1, Math.round(hyw + dy * len) - 1, 2, 3); }
    }
  }
};

// ---------------- Fading-ink portrait ----------------
const PW = 36, PH = 44;
function buildFace(look, expr, age) {
  const c = document.createElement('canvas'); c.width = PW; c.height = PH; const x = c.getContext('2d');
  const A = new Float32Array(PW * PH); const set = (i, j, a) => { i = Math.round(i); j = Math.round(j); if (i < 0 || j < 0 || i >= PW || j >= PH) return; const k = j * PW + i; A[k] = Math.max(A[k], a == null ? 1 : a); };
  const cx = 18, cy = 19, rx = { thin: 8, avg: 9, broad: 10 }[look.build] || 9, ry = 11;
  const jawK = [0.78, 0.86, 0.95][look.jaw];
  const inHead = (i, j) => { const dy = (j - cy) / ry; const rxx = rx * (dy > 0 ? 1 - (1 - jawK) * dy * 1.2 : 1); return ((i - cx) / rxx) ** 2 + dy * dy <= 1; };
  // head outline
  for (let a = 0; a < Math.PI * 2; a += 0.03) { const sy = Math.sin(a); const rxx = rx * (sy > 0 ? 1 - (1 - jawK) * sy * 1.2 : 1); set(cx + Math.cos(a) * rxx, cy + sy * ry, 0.95); }
  // skin tone hatch (darker skin = denser cross-hatching)
  const ti = look.skin; const edge = 0.55 - ti * 0.12;
  for (let j = cy - ry; j <= cy + ry; j++) for (let i = cx - rx; i <= cx + rx; i++) {
    if (!inHead(i, j)) continue; const side = (i - cx) / rx;
    if (side > edge && (i + j) % 3 === 0) set(i, j, 0.45 + ti * 0.05);
    if (ti >= 3 && (i - j + 99) % 4 === 0) set(i, j, 0.25 + ti * 0.04);
    if (ti >= 5 && (i + j) % 2 === 0) set(i, j, 0.3);
  }
  // ears
  for (let j = -1; j <= 2; j++) { set(cx - rx - 1, cy + j); set(cx + rx + 1, cy + j); }
  // neck + shoulders
  for (let j = cy + ry - 1; j < 38; j++) { set(cx - 4, j); set(cx + 4, j); }
  for (let i = 0; i <= 16; i++) { const t = i / 16; set(cx - 4 - t * 14, 37 + Math.sin(t * 1.4) * 5); set(cx + 4 + t * 14, 37 + Math.sin(t * 1.4) * 5); }
  for (let i = -3; i <= 3; i++) set(cx + i, 39 + Math.abs(i) * 0.3, 0.6);
  // eyes
  const ey = cy;
  for (const s of [-1, 1]) {
    const ex = cx + s * 4;
    if (expr === 'dead' || expr === 'uncon') { set(ex - 1, ey + 0.5); set(ex, ey + 1); set(ex + 1, ey + 0.5); }
    else if (expr === 'pain') { set(ex - 1, ey); set(ex, ey); set(ex + 1, ey); set(ex + s, ey - 1); }
    else { set(ex - 1, ey); set(ex + 1, ey); set(ex, ey - 1, 0.7); set(ex, ey, 1); if (look.eyes === 1) set(ex, ey + 1, 0.5); }
    // brows
    const by = ey - 3 - (look.brow === 2 ? 1 : 0);
    for (let k = -1; k <= 1; k++) { let yy = by; if (expr === 'pain') yy = by + (k * s < 0 ? -1 : 0) ; set(ex + k, yy, look.brow === 1 ? 1 : 0.85); if (look.brow === 1) set(ex + k, yy - 1, 0.5); }
    if (look.glasses) { for (let a = 0; a < 6.3; a += 0.4) set(ex + Math.cos(a) * 2.2, ey + Math.sin(a) * 1.8, 0.7); }
    if (age > 45) { set(ex + s * 3, ey + 1, 0.5); set(ex + s * 3, ey - 1, 0.4); }
  }
  if (look.glasses) set(cx, ey - 0.5, 0.7);
  // nose
  const nl = [4, 5, 6][look.nose];
  for (let j = 0; j < nl; j++) set(cx - (j > nl - 2 ? 1 : 0), ey + 1 + j, 0.75);
  set(cx + 1, ey + nl, 0.7); set(cx - 1, ey + nl, 0.7);
  // mouth
  const my = cy + 7 + (look.nose === 2 ? 1 : 0);
  if (expr === 'pain') { for (let i = -3; i <= 3; i++) set(cx + i, my + (i % 2 ? 0 : 1)); set(cx - 3, my - 1, 0.6); set(cx + 3, my - 1, 0.6); }
  else if (expr === 'dead') { for (let i = -2; i <= 2; i++) set(cx + i, my + 0.5, 0.8); }
  else { for (let i = -2; i <= 2; i++) set(cx + i, my, 0.9); set(cx, my + 2, 0.35); }
  // facial hair
  const hd = look.hairCol <= 3 || look.hairCol === 8 || look.hairCol === 9 ? 1 : look.hairCol <= 5 ? 0.6 : 0.4;
  if (look.facial === 'stubble') for (let j = my - 2; j <= cy + ry; j++) for (let i = cx - rx; i <= cx + rx; i++) if (inHead(i, j) && NE.hash(i + look.seed, j) < 0.28 && Math.abs(j - my) > 0) set(i, j, 0.5);
  if (look.facial === 'beard') for (let j = my - 2; j <= cy + ry + 2; j++) for (let i = cx - rx; i <= cx + rx; i++) if ((inHead(i, j) || j > cy + ry - 2 && Math.abs(i - cx) < rx * 0.6) && Math.abs(i - cx) > 0 && j !== my && (i + j) % (hd > 0.8 ? 1 : 2) === 0) set(i, j, 0.8 * hd + 0.2);
  if (look.facial === 'mustache') for (let i = -3; i <= 3; i++) { set(cx + i, my - 2, 0.9); if (Math.abs(i) < 3) set(cx + i, my - 1, 0.7); }
  if (look.freckles) for (let k = 0; k < 8; k++) set(cx + (NE.hash(k, look.seed) - 0.5) * 12, ey + 2 + NE.hash(look.seed, k) * 3, 0.5);
  if (look.scar) { for (let k = 0; k < 6; k++) if (k !== 3) set(cx + 3 + k, ey + 2 + k * 0.8, 0.9); }
  // hair
  const hs = look.hair; const top = cy - ry;
  const hfill = (i, j) => { const pat = hd > 0.8 ? 1 : hd > 0.5 ? ((i + j) % 2 === 0) : ((i * 3 + j) % 4 === 0); if (pat) set(i, j, 0.55 + hd * 0.45); };
  const capH = { buzz: 3, short: 6, side: 6, pony: 6, bun: 6, curly: 7, long: 6, mohawk: 0, bald: 0 }[hs] || 0;
  for (let j = top - 3; j <= top + capH; j++) for (let i = cx - rx - 2; i <= cx + rx + 2; i++) {
    const dy = (j - cy) / (ry + 1.5), dx = (i - cx) / (rx + 1.5); const out = dx * dx + dy * dy <= 1;
    if (!out) continue;
    if (hs === 'buzz') { if (NE.hash(i, j + look.seed) < 0.55) set(i, j, 0.6); continue; }
    if (hs === 'side' && j > top + 3 && i < cx - 2) continue;
    if (hs === 'curly') { if (NE.hash(i >> 1, j >> 1) < 0.85) hfill(i, j); continue; }
    if (j <= top + capH) hfill(i, j);
  }
  if (hs === 'side') for (let i = cx - 2; i < cx + rx; i++) set(i, top + 6 + (i - cx) * 0.3, 0.9);
  if (hs === 'long') for (let j = top + 4; j < cy + 14; j++) for (const s of [-1, 1]) for (let k = 0; k < 3; k++) hfill(cx + s * (rx + k), j);
  if (hs === 'mohawk') for (let j = top - 5; j < top + 6; j++) for (let i = -2; i <= 2; i++) hfill(cx + i, j);
  if (hs === 'pony') for (let j = top + 2; j < top + 14; j++) for (let k = 0; k < 2; k++) hfill(cx + rx + 2 + k + (j - top) * 0.1, j);
  if (hs === 'bun') for (let a = 0; a < 6.3; a += 0.2) for (let r = 0; r < 3; r++) set(cx + Math.cos(a) * r, top - 4 + Math.sin(a) * r, 0.8 * hd + 0.2);
  if (hs === 'bald') { set(cx - 3, top + 3, 0.4); set(cx - 2, top + 2, 0.4); }
  return A;
}
class Portrait {
  constructor(canvas, surv) { this.c = canvas; this.c.width = PW; this.c.height = PH; this.x = canvas.getContext('2d'); this.surv = surv; this.faces = {}; this.drips = []; this.blots = []; this.tick = 0; }
  face(expr) { if (!this.faces[expr]) this.faces[expr] = buildFace(this.surv.look, expr, this.surv.age); return this.faces[expr]; }
  draw(st) {
    // st: life(0..1), expr, bleeding, headWounds, headBandage, t
    const x = this.x; x.clearRect(0, 0, PW, PH); this.tick++;
    const A = this.face(st.expr || 'neutral'); const img = x.createImageData(PW, PH); const d = img.data; const life = NE.clamp(st.life, 0, 1);
    const seed = this.surv.look.seed; const jitter = Math.floor(this.tick / 6);
    for (let j = 0; j < PH; j++) for (let i = 0; i < PW; i++) {
      const a = A[j * PW + i]; if (a <= 0) continue;
      const n = NE.hash(i + seed, j * 7), n2 = NE.hash(i + jitter, j + seed);
      if (n > life * 1.08 + 0.06 - n2 * 0.06) continue;
      const k = (j * PW + i) * 4; const fade = 0.5 + 0.5 * life; d[k] = 29; d[k + 1] = 19; d[k + 2] = 12; d[k + 3] = Math.floor(255 * a * fade);
    }
    // ink runs downward when badly hurt (life low): smear random pixels down
    if (life < 0.7) { for (let s = 0; s < (0.7 - life) * 60; s++) { const i = Math.floor(NE.hash(s, seed) * PW), j0 = Math.floor(NE.hash(seed, s) * PH * 0.8); const len = Math.floor((0.7 - life) * 10 * NE.hash(s, s)); for (let j = j0; j < Math.min(PH, j0 + len); j++) { const k = (j * PW + i) * 4; d[k] = 29; d[k + 1] = 19; d[k + 2] = 12; d[k + 3] = Math.max(d[k + 3], 70); } } }
    x.putImageData(img, 0, 0);
    // bandage strip
    if (st.headBandage) { x.fillStyle = 'rgba(232,226,208,0.95)'; x.fillRect(8, 11, 21, 3); x.fillStyle = 'rgba(29,19,12,0.6)'; x.fillRect(8, 11, 21, 1); x.fillRect(8, 13, 21, 1); }
    // blood ink blots for head wounds
    while (this.blots.length < st.headWounds) this.blots.push({ x: 10 + Math.random() * 16, y: 10 + Math.random() * 18, r: 1 + Math.random() * 1.5 });
    if (this.blots.length > st.headWounds + 2) this.blots.length = st.headWounds;
    x.fillStyle = 'rgba(110,20,14,0.85)'; for (const b of this.blots) { x.fillRect(Math.round(b.x), Math.round(b.y), Math.ceil(b.r), Math.ceil(b.r)); x.fillRect(Math.round(b.x), Math.round(b.y + b.r), 1, 2); }
    // drips while bleeding
    if (st.bleeding > 0.1 && Math.random() < Math.min(0.4, st.bleeding * 0.05)) this.drips.push({ x: 6 + Math.random() * 24, y: 26 + Math.random() * 8, l: 0, v: 0.2 + Math.random() * 0.4 });
    x.fillStyle = 'rgba(110,20,14,0.8)';
    for (const dr of this.drips) { dr.l += dr.v; x.fillRect(Math.round(dr.x), Math.round(dr.y), 1, Math.round(dr.l)); }
    this.drips = this.drips.filter(dr => dr.y + dr.l < PH + 4); if (this.drips.length > 30) this.drips.shift();
  }
}
NE.Portrait = Portrait;
})(window.NE);
