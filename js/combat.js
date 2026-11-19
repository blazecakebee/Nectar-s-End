// Nectar's End — physics combat & gore.
// Melee: the weapon follows the cursor (enemies: their target); damage comes from how fast the blade/head is actually moving.
// Bullets: real projectiles (travel time, drop, penetration, ricochet) that shove ragdolls and spray blood out the exit side.
// Gore: dismemberment into physics limbs, decapitation, spilled guts & organs, wound stains, spreading blood pools.
(function (NE) {
'use strict';
const { rf, pick, chance, clamp, lerp } = NE; const T = NE.T; const G = NE.G;
const C = NE.Combat = {};
const WLEN = C.WLEN = { fists: 1.5, claws: 2.5, knife: 4.5, shiv: 4, pipe: 9, crowbar: 10, axe: 11, pickaxe: 10, machete: 8, fireaxe: 12, sledge: 12, spear: 17, leadpipe: 10, baton: 8, cleaver: 5 };
const STRIKE = { knife: 'thrust', shiv: 'thrust', fists: 'thrust', claws: 'thrust', spear: 'thrust' };
// per-weapon swing feel: arc width, speed, thrust length
const PROF = C.PROF = { baton: { arc: 0.8, dur: 0.75 }, machete: { arc: 1.25, dur: 0.9 }, sledge: { arc: 1.45, dur: 1.55, ext: 1.2 }, fireaxe: { arc: 1.35, dur: 1.3 }, axe: { arc: 1.2, dur: 1.15 }, spear: { ext: 1.6, dur: 1.15 }, leadpipe: { arc: 1.05 }, cleaver: { arc: 0.9, dur: 0.8 }, knife: { ext: 0.9, dur: 0.85 }, fists: { arc: 0.9, dur: 0.85 } };
const gore = () => (G.meta && G.meta.settings ? G.meta.settings.gore : 1);
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

// ---------------- melee ----------------
C.weaponOf = function (a) {
  if (a.isPlayer) { const e = a.equip.weapon; if (e && NE.ITEMS[e.id].melee) return NE.ITEMS[e.id]; if (!e) return a.weaponDef(); return null; }
  if (a.D) { if (a.weapon && NE.ITEMS[a.weapon] && NE.ITEMS[a.weapon].melee) return NE.ITEMS[a.weapon]; if (!a.weapon) return { id: a.type === 'feral' ? 'claws' : 'fists', name: 'Claws', w: 0.3, melee: { dmg: a.D.dmg || 6, kind: a.D.kind || 'blunt', reach: a.D.reach || 9, stam: 3, cd: a.D.cd || 0.8 } }; }
  return null;
};
C.strike = function (a, w, heavy, force) {
  w = w || C.weaponOf(a); if (!w || a.strk) return false; const id = w.id || 'fists';
  let kind = STRIKE[id] || (w.melee.kind === 'sharp' && (w.w || 1) < 0.6 ? 'thrust' : 'swing'); if (heavy && id !== 'spear') kind = 'overhead'; if (force) kind = force;
  const pf = PROF[id] || {}; a.strk = { t: 0, dur: (kind === 'thrust' ? 0.16 : clamp(0.16 + (w.w || 1) * 0.06, 0.18, 0.4)) * (heavy ? 1.25 : 1) * (pf.dur || 1), kind, heavy: heavy || 0, arc: pf.arc || 1, ex: pf.ext || 1 }; a.hitSet = new Set();
  NE.Audio.play('swing', heavy ? 1.1 : 0.7); return true;
};
C.tick = function (a, dt, tx, ty, active) {
  const w = active ? C.weaponOf(a) : null; if (!w) { a.wdir = null; a.wext = 0; a.strk = null; return; }
  const sh = a.rag.pts[1]; const sx = sh.x, sy = sh.y + 1; const L = (WLEN[w.id] || 7) + (a.hReach || 0); const wt = w.w || 0.5;
  let target = Math.atan2(ty - sy, tx - sx); if (a.wa == null) a.wa = target;
  let ext = 0, off = 0, boost = 1; const S = a.strk;
  if (S) { S.t += dt; const k = clamp(S.t / S.dur, 0, 1);
    if (S.kind === 'thrust') { ext = Math.sin(k * Math.PI) * (S.poke || S.lunge ? 8 : 6) * S.ex; boost = 2.2; }
    else if (S.kind === 'overhead') { const up = Math.cos(target) >= 0 ? -1 : 1; off = up * lerp(2.6, -1.1, Math.min(1, k * 1.15)) * Math.min(1.25, S.arc); boost = 3.2 / Math.max(0.8, S.arc * 0.9); ext = Math.sin(k * Math.PI) * 2 * S.ex; }
    else { const up = Math.cos(target) >= 0 ? -1 : 1; off = up * lerp(1.9, -0.8, Math.min(1, k * 1.25)) * S.arc; boost = 2.6 * S.arc; }
    if (S.t >= S.dur) a.strk = null; }
  else if (a.charge) { const k = clamp(a.charge.t / 0.6, 0, 1); const up = Math.cos(target) >= 0 ? -1 : 1; const id2 = w.id || 'fists'; if (id2 === 'spear') ext = -3.5 * k; else { off = up * 2.6 * k; ext = -1.5 * k; } if (k >= 1 && Math.random() < 0.3) G.addP(a.wtip ? a.wtip.x : a.x, a.wtip ? a.wtip.y : a.y, rf(-10, 10), rf(-20, 0), 0.25, '#ffe8a0', 'spark', 0); }
  const maxRate = 30 / (1 + wt * 0.45) * boost * (a.isPlayer && a.stats.swing ? a.stats.swing : 1); const d = angDiff(a.wa, target + off); const step = clamp(d, -maxRate * dt, maxRate * dt);
  a.wav = step / Math.max(dt, 1e-4); a.wa += step; a.wext = lerp(a.wext || 0, ext, Math.min(1, dt * 30));
  const dx = Math.cos(a.wa), dy = Math.sin(a.wa); a.wdir = { x: dx, y: dy };
  const reach = 9 + a.wext; const hx = sx + dx * reach, hy = sy + dy * reach, tipx = hx + dx * L, tipy = hy + dy * L;
  const prev = a.wtip; a.wtip = { hx, hy, x: tipx, y: tipy };
  if (a.isPlayer && Math.abs(a.wav) > 7 && !S) a.anat.stam -= dt * Math.abs(a.wav) * 0.12 * (0.6 + wt * 0.5);
  if (!prev || dt <= 0) return;
  const tv = Math.hypot(tipx - prev.x, tipy - prev.y) / dt; // tip speed, px/s
  if (tv < 55 || (a.charge && !S)) return; // raising the weapon for a wind-up never hurts anyone
  if (!S && !a.isPlayer && a.target && a.target.anat && a.target.anat.uncon) return; // enemies only hit a downed body with the finisher
  C.sweep(a, w, prev, a.wtip, tv, dt, !!S);
};
C.sweep = function (a, w, p0, p1, tv, dt, striking) {
  const m = w.melee; const now = G.t; a.hitCD = a.hitCD || new Map();
  const svx = (p1.x - p0.x) / dt, svy = (p1.y - p0.y) / dt; const sl = Math.hypot(svx, svy) || 1; const vd = { x: svx / sl, y: svy / sl };
  const samples = [];
  for (let i = 0; i <= 4; i++) { const f = i / 4; for (const g of [0.5, 1]) { const ax = lerp(p0.hx, p0.x, f), ay = lerp(p0.hy, p0.y, f), bx = lerp(p1.hx, p1.x, f), by = lerp(p1.hy, p1.y, f); samples.push({ x: lerp(ax, bx, g), y: lerp(ay, by, g), f }); } }
  for (const t of G.actors) {
    if (t === a || t.hidden) continue; if (Math.abs(t.x - a.x) > 30 || Math.abs(t.y - a.y) > 30) continue;
    if (a.isPlayer && (t.isRemote || t.town)) continue; if (a.D && !t.alive && false) continue;
    if (a.D && t.alive && !a.isHostileTo(t)) continue;
    if (t.alive) {
      if ((a.hitCD.get(t) || 0) > now) continue;
      let hit = null; for (const s of samples) if (t.contains(s.x, s.y, 1.2)) { if (!hit || s.f > hit.f) hit = s; }
      if (!hit) continue; a.hitCD.set(t, now + 0.24);
      // ---- defense: dodging, parrying and blocking (the answer to just trading blows)
      if (t.dashIF > 0) { if (t.isPlayer) G.toast('Dodged!'); continue; }
      const front = Math.sign(a.x - t.x) === t.facing || Math.abs(a.x - t.x) < 2; const hvy = a.strk && a.strk.heavy > 1;
      if (t.guard && front && t.alive && !t.rd) {
        const since = G.t - t.guard.t0;
        const bw = t.abil && t.abil.includes('bulwark'); if (since < (bw ? 0.42 : 0.3) * (NE.Combat.parryWin ? NE.Combat.parryWin(t) : 1) && !(hvy && (w.w || 0) >= 3)) { // perfect parry
          NE.Audio.play('parry'); G.slowmo = Math.max(G.slowmo || 0, 0.22); for (let i = 0; i < 10; i++) G.addP(hit.x, hit.y, rf(-80, 80), rf(-80, 20), 0.35, '#fff6c0', 'spark', 0.4);
          a.strk = null; a.charge = null; a.windT = 0; if (a.D) { a.stagger = 1.3; a.vx -= Math.sign(t.x - a.x) * 140; } else { a.cd = Math.max(a.cd || 0, 0.9); a.vx -= Math.sign(t.x - a.x) * 120; a.knockT = 0.3; }
          if (t.isPlayer) { G.toast('PARRY!'); t.anat.stam = Math.min(t.anat.stamMax, t.anat.stam + 8); t.cd = 0; } else if (a.isPlayer) G.toast('Parried!');
          continue; }
        // block: absorbs most of it but costs stamina; heavy blows break a guard
        const dm0 = m.dmg * (a.isPlayer ? a.stats.melee * 1.2 : 1) * (hvy ? a.strk.heavy : 1); const cost = (5 + dm0 * 0.7) * (bw ? 0.5 : 1);
        if (t.isPlayer) t.anat.stam -= cost; else t.guardHP = (t.guardHP == null ? 30 : t.guardHP) - cost;
        const broke = hvy || (t.isPlayer ? t.anat.stam <= 0 : t.guardHP <= 0);
        NE.Audio.play('block'); G.shake(1.2); for (let i = 0; i < 4; i++) G.addP(hit.x, hit.y, rf(-40, 40), rf(-50, 10), 0.25, '#ffe0a0', 'spark', 0.4);
        t.vx += Math.sign(t.x - a.x) * (broke ? 160 : 70); if (a.strk && m.kind === 'blunt') { a.strk = null; a.wa -= Math.sign(a.wav || 1) * 0.6; }
        if (broke) { t.guard = null; t.guardHP = null; if (t.isPlayer) { G.toast('Guard broken!'); t.hurtT = 0.6; t.cd = Math.max(t.cd || 0, 0.7); } else t.stagger = 1.1; NE.Audio.play('crack', 0.6); if (hvy) t.hurt(t.partNear(hit.x, hit.y), m.dmg * 0.35, m.kind === 'sharp' ? 'blunt' : m.kind, a.isPlayer ? a.surv.first : (a.D ? a.D.name : 'Someone'), vd); }
        else if (a.isPlayer) G.toast('Blocked');
        continue; }
      const spd = tv * (0.35 + 0.65 * hit.f); const cap = a.isPlayer ? 2.1 : 1.15;
      let dmg = m.dmg * clamp((spd - 40) / 150, 0.25, cap) * (a.isPlayer ? a.stats.melee * 1.2 : 1) * a.anat.armFactor();
      if (a.strk && a.strk.kind === 'thrust' && m.kind === 'sharp') dmg *= 1.25; const hv = a.strk && a.strk.heavy ? a.strk.heavy : 1; dmg *= hv; if (a.abil && a.abil.includes('sting')) dmg *= 1.4;
      if (a.strk && a.strk.poke) dmg *= 0.7; if (a.strk && a.strk.lunge) dmg *= 1.3;
      const punish = !t.isPlayer && (t.backT > 0 || t.stagger > 0 || t.rd || t.getUpT > 0); if (punish && a.isPlayer) dmg *= 1.3; // hit them while they recover
      const part = t.partNear(hit.x, hit.y); const kind = m.kind === 'sharp' && a.strk && a.strk.kind === 'thrust' ? 'sharp' : m.kind;
      t.hurt(part, dmg, kind, a.isPlayer ? a.surv.first : (a.D ? a.D.name : 'Someone'), vd); t.lastBy = a; if (NE.tryImpale) NE.tryImpale(a, t, w, part, dmg, kind);
      if (a.isPlayer && a.abil && a.abil.includes('rot') && t.alive && chance(0.3)) { t.stagger = Math.max(t.stagger || 0, 0.6); if (t.anat) t.anat.tox = (t.anat.tox || 0) + 10; G.addP(t.x, t.y - t.h + 3, 0, -10, 0.8, '#8ab040', 'glow', 0); }
      if (t.isPlayer && t.abil && t.abil.includes('thorns') && a.alive && a.hurt) a.hurt(pick(['larm', 'rarm']), 5, 'sharp', 'Spined hide', { x: -vd.x, y: -vd.y });
      if (!t.isPlayer && (dmg > 6 || (a.strk && a.strk.poke))) { t.stagger = Math.max(t.stagger || 0, a.strk && a.strk.poke ? 0.35 : clamp(dmg / 45, 0.12, 0.7) * (m.stun || 1) * (hv > 1 ? 1.4 : 1)); }
      else if (t.isPlayer && dmg > 14) { t.stagger = 0; t.hurtT = 0.5; }
      if (a.abil && a.abil.includes('sting') && t.alive && t.anat) t.anat.tox = (t.anat.tox || 0) + 15;
      const push = Math.min(a.isPlayer ? 260 * hv : 160 * hv, spd * (a.isPlayer ? 0.6 : 0.35) * hv) * (0.55 + (w.w || 0.5) * 0.4) * (a.isPlayer && a.stats.swing ? a.stats.swing : 1) * (m.stun ? 1.2 : 1);
      const dirx = Math.sign(t.x - a.x) || Math.sign(vd.x) || 1; t.vx += dirx * push; t.vy += Math.min(-30, vd.y * push * 0.4 - (a.isPlayer ? 40 : 0)); t.onGround = false; if (a.isPlayer) t.knockT = clamp(push / 500, 0.12, 0.45);
      // impact: brief hit-stop on every solid blow, and the big ones throw bodies off their feet
      if (a.isPlayer || t.isPlayer) G.slowmo = Math.max(G.slowmo || 0, Math.min(hv > 1 ? 0.2 : 0.13, (hv > 1 ? 0.09 : 0.035) + dmg / 350)); if (a.isPlayer && hv > 1) { G.shake(Math.min(5, 1.5 + dmg / 15)); for (let i = 0; i < 6; i++) G.addP(hit.x, hit.y, dirx * rf(40, 120), rf(-60, 10), 0.25, '#fff0c0', 'spark', 0.3); NE.Audio.play('thud', 0.7); } if (dmg > 18) NE.Audio.play('crack', clamp(dmg / 60, 0.3, 0.9));
      const flat = t.alive && ((hv > 1 && ((w.w || 0) >= 2 || (m.stun || 0) >= 1.6)) || (a.strk && a.strk.lunge && ((w.w || 0) >= 1.5 || chance(0.3))) || dmg > 40);
      if (flat && (!t.isPlayer || dmg > 22)) t.knockdown(dirx * push * 0.9, -110 - push * 0.2, t.isPlayer ? 0.55 : 0.9 + hv * 0.25);
      const rp = t.rag.pts[NE.RAGIDX(part, t.facing)]; if (rp) { rp.ox -= vd.x * spd * 0.012; rp.oy -= vd.y * spd * 0.012; }
      NE.Audio.play(kind === 'sharp' || kind === 'bite' ? 'slash' : 'hit', clamp(spd / 200, 0.4, 1.2)); if (a.isPlayer || t.isPlayer) G.shake(clamp(dmg / 12, 0.8, hv > 1 ? 5 : 3)); if (hv > 1) { G.slowmo = 0.12; for (let i = 0; i < 6; i++) G.addP(hit.x, hit.y, rf(-60, 60), rf(-60, 10), 0.3, '#fff0c0', 'spark', 0.5); }
      if (kind === 'sharp' || dmg > 12) C.spray(hit.x, hit.y, vd.x, vd.y, Math.round(dmg * 0.8));
      if (t.alive && hv > 1 && w.heavyw && kind === 'sharp' && part !== 'torso' && chance(0.35 * (gore() ? 1 : 0))) NE.Gore.sever(t, part, vd);
      if (t.onAggro && a.isPlayer) t.onAggro(a); else if (t.onAggro) t.onAggro(a);
      if (m.kind === 'blunt' && a.strk) { a.strk = null; a.wa -= Math.sign(a.wav || 1) * 0.5; } // heavy things bounce off
      if (a.isPlayer) a.anat.stam -= m.stam * 0.4 * a.stats.staminaCost;
    } else if (t.rag && !t.gone) { // hacking at corpses
      for (const s of samples) { let hitP = -1; t.rag.pts.forEach((q, i) => { if (hitP < 0 && Math.hypot(q.x - s.x, q.y - s.y) < 2.5) hitP = i; }); if (hitP < 0) continue;
        if ((a.hitCD.get(t) || 0) > now) break; a.hitCD.set(t, now + 0.2); const q = t.rag.pts[hitP]; q.ox -= vd.x * tv * 0.02; q.oy -= vd.y * tv * 0.02; C.spray(q.x, q.y, vd.x, vd.y, 6);
        NE.Audio.play(m.kind === 'sharp' ? 'slash' : 'thud', 0.6); if (m.kind === 'sharp' && tv > 140 && chance(0.35)) NE.Gore.hitCorpse(t, NE.RAGPART(hitP, t.facing), 30, 'sharp', vd); break; }
    }
  }
  G.phys.impulse(p1.x, p1.y, 4, Math.min(400, tv * 1.2));
};
NE.RAGIDX = (part, facing) => { const fr = facing > 0 ? 'r' : 'l'; if (part === 'head') return 0; if (part === 'torso') return 1; const front = part[0] === fr; if (part.endsWith('arm')) return front ? 6 : 4; return front ? 10 : 8; };

// ---------------- blood ----------------
C.spray = function (x, y, dx, dy, n) {
  const k = 0.4 + gore() * 0.45; n = Math.round(n * k);
  for (let i = 0; i < n; i++) { const sp = rf(40, 160); const a = Math.atan2(dy, dx) + rf(-0.55, 0.55); G.addP(x, y, Math.cos(a) * sp + rf(-15, 15), Math.sin(a) * sp - rf(0, 40), rf(0.5, 1.3), pick(['#8a1010', '#6a0808', '#a81818', '#b02020']), 'blood'); }
  if (gore() >= 1) for (let i = 0; i < n / 6; i++) G.addP(x, y, dx * rf(60, 200), dy * rf(60, 200) - rf(10, 50), rf(0.6, 1.2), '#5a0606', 'blood');
};

// ---------------- bullets ----------------
G.bullets = [];
C.CAL = { gun: 1, smg: 1, shotgun: 1.5, magnum: 2, rifle: 3, big: 4 };
C.fire = function (sh, ox, oy, dx, dy, range, dmg, snd, visual) {
  const cal = C.CAL[snd] || 1; const heavy = cal >= 3; const V = 1000 + cal * 160;
  G.bullets.push({ x: ox, y: oy, vx: dx * V, vy: dy * V, life: range / V * 1.4, dmg, sh, heavy, cal, pen: cal >= 4 ? 3 : cal >= 3 ? 2 : 1, visual, hit: new Set(), px: ox, py: oy, name: sh ? (sh.isPlayer ? sh.surv.first : sh.D ? sh.D.name : 'Gunfire') : 'Gunfire' });
};
C.updateBullets = function (dt) {
  const W = G.world; if (!W) return;
  for (const b of G.bullets) {
    b.px = b.x; b.py = b.y; const steps = Math.ceil(Math.hypot(b.vx, b.vy) * dt / 2.5);
    for (let s = 0; s < steps && b.life > 0; s++) {
      const sd = dt / steps; b.vy += 140 * sd; const nx = b.x + b.vx * sd, ny = b.y + b.vy * sd;
      const sp = Math.hypot(b.vx, b.vy), ux = b.vx / sp, uy = b.vy / sp;
      if (W.solidAt(nx, ny)) {
        const hxs = W.solidAt(nx, b.y), hys = W.solidAt(b.x, ny); const nrm = hys && !hxs ? { x: 0, y: -Math.sign(b.vy) } : hxs && !hys ? { x: -Math.sign(b.vx), y: 0 } : { x: -ux, y: -uy };
        const dot = Math.abs(ux * nrm.x + uy * nrm.y);
        G.sparks(b.x, b.y, 4); G.dust(b.x, b.y, 2);
        if (dot < 0.4 && chance(0.55) && !b.ric) { b.ric = true; if (nrm.y) b.vy = -b.vy * 0.6; else b.vx = -b.vx * 0.6; b.dmg *= 0.5; NE.Audio.play('click', 0.5); continue; }
        if (W.get(Math.floor(nx / T), Math.floor(ny / T)) === 6 && !b.visual) W.damageTile(Math.floor(nx / T), Math.floor(ny / T), 1);
        b.life = 0; break;
      }
      b.x = nx; b.y = ny;
      // living actors
      if (!b.visual) for (const a of G.actors) {
        if (a === b.sh || b.hit.has(a) || !a.alive || a.hidden) continue; const sh = b.sh;
        if (sh && ((sh.isPlayer && (a.isRemote || a.town)) || (sh.isRemote && a.isPlayer))) continue;
        if (!a.contains(b.x, b.y, 0.5)) continue; b.hit.add(a);
        const part = a.partNear(b.x, b.y); const dmg = b.dmg * (part === 'head' ? 1.5 : 1);
        a._cal = b.cal; a.hurt(part, dmg, 'bullet', b.name, { x: ux, y: uy }); a._cal = 0; a.lastBy = sh; if (a.onAggro && sh) a.onAggro(sh);
        const rp = a.rag.pts[NE.RAGIDX(part, a.facing)]; if (rp) { rp.ox -= ux * dmg * 0.09 * b.cal; rp.oy -= uy * dmg * 0.09 * b.cal; } a.vx += ux * dmg * 1.1 * b.cal; if (!a.isPlayer && b.cal >= 2) a.stagger = Math.max(a.stagger || 0, 0.15 * b.cal);
        C.spray(b.x, b.y, ux, uy, Math.round(dmg * 0.7)); C.spray(b.x, b.y, -ux * 0.4, -uy * 0.4 - 0.3, Math.round(dmg * 0.15));
        if (a.isPlayer) G.shake(3);
        b.pen--; b.dmg *= b.cal >= 4 ? 0.75 : b.heavy ? 0.55 : 0.4; if (b.pen <= 0 || b.dmg < 9 || (part === 'torso' && a.gear && a.gear.body && b.cal < 3)) { b.life = 0; } break;
      }
      if (b.life <= 0) break;
      // corpses & physics props get shoved
      for (const a of G.actors) { if (a.alive || !a.rag || b.hit.has(a)) continue; if (Math.abs(a.x - b.x) > 20 || Math.abs(a.y - b.y) > 24) continue; const pi = a.rag.pts.findIndex(q => Math.hypot(q.x - b.x, q.y - b.y) < 2.4); if (pi < 0) continue; b.hit.add(a);
        const q = a.rag.pts[pi]; q.ox -= ux * b.dmg * 0.12; q.oy -= uy * b.dmg * 0.12; C.spray(b.x, b.y, ux, uy, 8); if (!b.visual) NE.Gore.hitCorpse(a, NE.RAGPART(pi, a.facing), b.dmg, 'bullet', { x: ux, y: uy }); b.dmg *= 0.6; }
      for (const body of G.phys.bodies) { if (body.kind === 'rag' || body.age < 0.05) continue; for (const q of body.pts) if (Math.abs(q.x - b.x) < q.r + 1 && Math.abs(q.y - b.y) < q.r + 1) { const m = body.mass || 1; q.ox -= ux * b.dmg * 0.08 / m; q.oy -= uy * b.dmg * 0.08 / m; if (body.kind === 'bottle' || body.kind === 'molotov') body.remove = true; if (body.kind === 'gut' || body.kind === 'organ' || body.kind === 'limb' || body.kind === 'head') C.spray(b.x, b.y, ux, uy, 4); if (m > 2) b.life = 0; break; } if (b.life <= 0) break; }
    }
    b.life -= dt;
  }
  G.bullets = G.bullets.filter(b => b.life > 0);
};
C.drawBullets = function (ctx) {
  for (const b of G.bullets) { const sp = Math.hypot(b.vx, b.vy); const tl = b.heavy ? 14 : 10; const ux = b.vx / sp, uy = b.vy / sp;
    NE.pline(ctx, b.x - ux * tl, b.y - uy * tl, b.x - ux * 3, b.y - uy * 3, 1, 'rgba(255,220,140,0.45)'); NE.pline(ctx, b.x - ux * 3, b.y - uy * 3, b.x, b.y, 1, '#fff2c0'); }
};

// ---------------- gore ----------------
const Gore = NE.Gore = {};
G.pools = [];
const ORGANS = [['Heart', '#7a121c', 3, 3], ['Lung', '#c86a78', 4, 3], ['Liver', '#5a1410', 5, 3], ['Kidney', '#7a2a24', 3, 2], ['Stomach', '#c88a80', 4, 3]];
Gore.poolAt = function (x, y, grow, max) {
  const W = G.world; if (!W) return; let gy = y; for (let k = 0; k < 40; k++) { if (W.solidAt(x, gy + 1)) break; gy += 1; } if (!W.solidAt(x, gy + 1)) return;
  let p = G.pools.find(q => Math.abs(q.x - x) < q.r + 3 && Math.abs(q.y - gy) < 3);
  if (!p) { p = { x, y: gy + 1, r: 1, max: max || 14 }; G.pools.push(p); if (G.pools.length > 120) G.pools.shift(); }
  p.r = Math.min(p.max, p.r + grow);
};
Gore.drawPools = function (ctx) {
  for (const p of G.pools) { const r = Math.round(p.r); if (r < 1) continue; ctx.fillStyle = '#4a0606'; ctx.fillRect(Math.round(p.x - r), Math.round(p.y) - 1, r * 2, 1); ctx.fillRect(Math.round(p.x - r + 1), Math.round(p.y), Math.max(1, r * 2 - 2), 1); ctx.fillStyle = '#7a0c0c'; ctx.fillRect(Math.round(p.x - r + 1), Math.round(p.y) - 1, Math.max(1, r * 2 - 2), 1);
    if (r > 4) { ctx.fillStyle = '#3e0505'; ctx.fillRect(Math.round(p.x - r * 0.7), Math.round(p.y) - 2, Math.round(r * 1.4), 1); ctx.fillStyle = 'rgba(255,120,120,0.35)'; ctx.fillRect(Math.round(p.x - r * 0.3), Math.round(p.y) - 2, 2, 1); } }
};
Gore.stain = function (a, part, x, y) {
  if (!a.rag) return; a.stains = a.stains || []; const i = NE.RAGIDX(part, a.facing); const q = a.rag.pts[i]; if (!q) return;
  for (let k = 0; k < 2 + gore(); k++) a.stains.push({ i, dx: clamp(Math.round(x - q.x + rf(-1.5, 1.5)), -2, 2), dy: clamp(Math.round(y - q.y + rf(-1.5, 2)), -2, 3), c: pick(['#7a0c0c', '#5a0808', '#8a1010']) });
  if (a.stains.length > 70) a.stains.splice(0, a.stains.length - 70);
};
const LIMB = { arm: { root: 1, idx: (fr, front) => front ? [5, 6] : [3, 4] }, leg: { root: 2, idx: (fr, front) => front ? [9, 10] : [7, 8] } };
Gore.sever = function (a, part, dir, remote) {
  if (!a.rag || gore() === 0) return false; a.sev = a.sev || {}; if (a.sev[part]) return false; a.sev[part] = G.t;
  dir = dir || { x: rf(-1, 1), y: -0.6 }; const P = a.rag.pts; const fr = a.facing > 0 ? 'r' : 'l';
  const look = a.look || {}; const skin = a.skinCol || NE.SKIN[look.skin] || '#d0a080';
  let body;
  if (part === 'head') {
    body = new NE.PBody('head'); const q = P[0]; body.point(q.x, q.y, 3, 0.8); body.look = look; body.skin = skin; body.vespa = !!a.vespa; body.facing = a.facing; body.setVel(dir.x * 110 + rf(-30, 30), -rf(90, 160)); body.spin = rf(-1, 1);
  } else {
    const kind = part.endsWith('arm') ? 'arm' : 'leg'; const front = part[0] === fr; const [i1, i2] = LIMB[kind].idx(fr, front); const r = P[LIMB[kind].root];
    body = new NE.PBody('limb'); body.point(r.x, r.y, 1.4, 0.6); body.point(P[i1].x, P[i1].y, 1.4, 0.6); body.point(P[i2].x, P[i2].y, 1.4, 0.6); body.link(0, 1); body.link(1, 2);
    body.cols = kind === 'arm' ? [a.shirt || look.shirt, skin] : [a.pants || look.pants, a.pants || look.pants]; body.limb = kind; body.setVel(dir.x * 120 + rf(-40, 40), -rf(60, 140));
  }
  body.tiles = true; body.collide = true; body.noActor = true; body.damp = 0.99; body.fric = 0.7; body.bounce = 0.2; body.grav = 1.4; body.mass = 0.8; body.bleedT = 8; body.age = 0;
  body.onImpact = (bb, pt, v) => { if (v > 60) { C.spray(pt.x, pt.y, 0, -1, 3); NE.Audio.play('squelch', 0.25); } };
  G.phys.add(body); Gore.cap();
  const A = a.anat; if (A && A.parts[part]) { const Pp = A.parts[part]; Pp.hp = 0; Pp.severed = true; Pp.frac = false; Pp.wounds.push({ t: 'art', bleed: part === 'head' ? 30 : 9, dirty: 0.3, inf: 0, closed: false, age: 0, bullet: false }); }
  if (part === 'head' && A) { A.org.brain = 0; A.cause = 'Decapitated'; }
  NE.Audio.play('squelch', 1); NE.Audio.play('crack', 0.7); const jx = part === 'head' ? P[0].x : P[part.endsWith('arm') ? 1 : 2].x, jy = part === 'head' ? P[0].y + 2 : P[part.endsWith('arm') ? 1 : 2].y;
  C.spray(jx, jy, dir.x, dir.y - 0.4, 26); for (let i = 0; i < 3; i++) G.addP(jx, jy, rf(-40, 40), rf(-70, -20), rf(0.5, 1), '#e8e0d0', 'spark', 1);
  if (a.isPlayer) { G.shake(5); G.log({ head: 'Your head—', larm: 'Your left arm is gone.', rarm: 'Your right arm is gone.', lleg: 'Your left leg is gone.', rleg: 'Your right leg is gone.' }[part], 'bad'); }
  if (!remote && G.net && G.net.on) G.net.send({ t: 'sev', id: a.isPlayer ? 'peer' : a.nid, part, dx: dir.x, dy: dir.y });
  return true;
};
Gore.guts = function (a, dir, remote) {
  if (!a.rag || a.gutted || gore() === 0) return; a.gutted = G.t; const P = a.rag.pts; const ox = lerp(P[1].x, P[2].x, 0.6), oy = lerp(P[1].y, P[2].y, 0.6);
  dir = dir || { x: a.facing, y: 0 };
  const n = gore() === 2 ? 14 : 9; const g = new NE.PBody('gut'); for (let i = 0; i < n; i++) g.point(ox + dir.x * i * 0.6, oy + i * 0.2, 1, 0.25); for (let i = 0; i < n - 1; i++) g.link(i, i + 1, 0.9, 1.6);
  g.tiles = true; g.collide = false; g.noActor = true; g.damp = 0.985; g.fric = 0.5; g.bounce = 0.05; g.grav = 1.2; g.mass = 0.25; g.bleedT = 10; g.anchor = a; g.anchorT = 2.5;
  g.pts.forEach((q, i) => { q.ox = q.x - (dir.x * rf(0.5, 1.6) + rf(-0.4, 0.4)) * (i / n); q.oy = q.y - rf(-0.6, 0.3); }); G.phys.add(g);
  for (let k = 0; k < (gore() === 2 ? 3 : 1); k++) { const O = pick(ORGANS); const o = G.phys.box('organ', ox, oy, O[2], O[3], 0.5, O[1]); o.organ = O[0]; o.tiles = true; o.noActor = true; o.bounce = 0.1; o.fric = 0.5; o.bleedT = 6; o.setVel(dir.x * rf(40, 110) + rf(-30, 30), -rf(40, 110)); o.onImpact = (bb, pt, v) => { if (v > 50) { C.spray(pt.x, pt.y, 0, -1, 2); NE.Audio.play('squelch', 0.2); } }; }
  C.spray(ox, oy, dir.x, dir.y, 30); NE.Audio.play('squelch', 1); Gore.cap();
  const A = a.anat; if (A) { A.org.stomach = Math.max(0, A.org.stomach - 60); A.org.liver = Math.max(0, A.org.liver - 30); A.parts.torso.wounds.push({ t: 'lac', bleed: 8, dirty: 0.5, inf: 0, closed: false, age: 0, bullet: false }); A.painSpike += 40; }
  if (a.isPlayer) G.log('Your insides are on the outside.', 'bad');
  if (!remote && G.net && G.net.on) G.net.send({ t: 'gut', id: a.isPlayer ? 'peer' : a.nid, dx: dir.x, dy: dir.y });
};
Gore.cap = function () { const gb = G.phys.bodies.filter(b => b.kind === 'limb' || b.kind === 'gut' || b.kind === 'organ' || b.kind === 'head'); if (gb.length > 60) for (const b of gb.slice(0, gb.length - 60)) b.remove = true; };
// called after damage is applied to a living actor
Gore.afterHurt = function (a, part, dmg, kind, dir) {
  const gl = gore(); if (gl === 0 || !a.anat || a.isRemote || a.isPuppet) return; const P = a.anat.parts[part]; if (!P || P.severed) return; const m = gl === 2 ? 1 : 0.55; const cal = kind === 'bullet' ? (a._cal || 1) : 0;
  if (P.hp > 0) { // high calibre / blasts rip limbs off a still-healthy body
    if (part !== 'torso' && ((cal >= 4 && dmg >= 70 && chance(0.6 * m + 0.2)) || (cal >= 3 && dmg >= 75 && chance(0.3 * m)) || (kind === 'frag' && dmg >= 30 && chance(0.4 * m)))) Gore.sever(a, part, dir);
    else if (part === 'torso' && cal >= 4 && dmg >= 90 && chance(0.5 * m)) Gore.guts(a, dir);
    return; }
  if (part === 'head') { if ((kind === 'sharp' && dmg >= 22) || (kind === 'frag' && dmg >= 14) || (kind === 'bullet' && dmg >= 60)) if (chance(0.5 * m + 0.15)) Gore.sever(a, 'head', dir); return; }
  if (part === 'torso') { if (dmg >= 18 && (kind === 'sharp' || kind === 'frag' || kind === 'bullet') && chance(0.45 * m)) Gore.guts(a, dir); return; }
  let p = 0; if (kind === 'sharp' && dmg >= 15) p = 0.6; else if (kind === 'frag' && dmg >= 10) p = 0.55; else if (kind === 'bullet' && dmg >= 45) p = 0.2 + cal * 0.15; else if (kind === 'blunt' && dmg >= 26) p = 0.15;
  if (p && chance(p * m)) Gore.sever(a, part, dir);
};
Gore.hitCorpse = function (a, part, dmg, kind, dir) {
  const gl = gore(); if (gl === 0) return; const m = gl === 2 ? 1 : 0.5;
  if (part === 'torso') { if (dmg >= 16 && chance(0.25 * m)) Gore.guts(a, dir); return; }
  if (chance((kind === 'sharp' ? 0.35 : kind === 'frag' ? 0.5 : 0.18) * m * Math.min(1.5, dmg / 30))) Gore.sever(a, part, dir);
};
Gore.blast = function (a, k, x, y) { // explosion tearing someone apart
  const gl = gore(); if (gl === 0 || !a.rag || a.isRemote || a.isPuppet) return; const dir = { x: Math.sign(a.x - x) || 1, y: -0.6 };
  const n = k > 0.7 ? (gl === 2 ? 3 : 2) : k > 0.45 ? 1 : 0; const parts = ['larm', 'rarm', 'lleg', 'rleg', 'head']; for (let i = 0; i < n; i++) if (chance(gl === 2 ? 0.75 : 0.5)) Gore.sever(a, pick(parts), dir);
  if (k > 0.6 && chance(gl === 2 ? 0.6 : 0.3)) Gore.guts(a, dir);
};
// per-frame gore: stump spurts, gut anchoring, bleeding corpses & pools, stains on limbs
Gore.tick = function (dt) {
  for (const a of G.actors) {
    if (!a.rag || Math.abs(a.y - (G.player ? G.player.y : a.y)) > 260) continue; const P = a.rag.pts;
    if (a.sev) for (const part in a.sev) { const age = G.t - a.sev[part]; if (age > (a.alive ? 30 : 9)) continue; const pulse = Math.sin(G.t * 9) > 0.3; if (!pulse || Math.random() > dt * 40) continue; const j = part === 'head' ? P[1] : P[part.endsWith('arm') ? 1 : 2]; const sx = part.endsWith('arm') ? (part[0] === (a.facing > 0 ? 'r' : 'l') ? 1 : -1) * a.facing : 0; G.addP(j.x + sx, j.y - (part === 'head' ? 2 : 0), sx * rf(20, 60) + rf(-15, 15), -rf(20, 70) * (part === 'head' ? 1.4 : 1), rf(0.4, 0.9), pick(['#a01818', '#8a1010']), 'blood'); }
    if (!a.alive && a.anat && a.anat.blood > 600) { a.deadT = (a.deadT || 0) + dt; if (a.deadT < 30) { const bleed = (a.sev ? Object.keys(a.sev).length * 2 : 0) + (a.gutted ? 3 : 0) + 1; a.anat.blood -= dt * bleed * 15; if (Math.random() < dt * 3) Gore.poolAt(P[2].x + rf(-2, 2), P[2].y, 0.25 * bleed, 10 + bleed * 2); } }
    else if (a.alive && a.anat && a.anat.bleeding > 2 && a.onGround && Math.random() < dt * 0.8) Gore.poolAt(a.x + rf(-2, 2), a.y - 1, 0.6, 5);
  }
  for (const b of G.phys.bodies) {
    if (b.bleedT > 0) { b.bleedT -= dt; if (Math.random() < dt * 6) { const q = b.kind === 'limb' ? b.pts[0] : pick(b.pts); G.addP(q.x, q.y, rf(-8, 8), rf(-20, 0), 0.6, '#8a1010', 'blood'); } if (b.age > 0.6 && Math.random() < dt * 1.5) { const q = b.pts[0]; Gore.poolAt(q.x, q.y, 0.4, 5); } }
    if (b.kind === 'gut' && b.anchor && b.anchorT > 0) { b.anchorT -= dt; const A = b.anchor.rag.pts; const q = b.pts[0]; q.x = lerp(A[1].x, A[2].x, 0.6); q.y = lerp(A[1].y, A[2].y, 0.6); }
  }
};
Gore.drawBody = function (ctx, b) {
  const P = b.pts; const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  if (b.kind === 'limb') { const [c1, c2] = b.cols; NE.pline(ctx, P[0].x, P[0].y, P[1].x, P[1].y, 3, NE.shade(c1, 0.55)); NE.pline(ctx, P[0].x, P[0].y, P[1].x, P[1].y, 2, c1); NE.pline(ctx, P[1].x, P[1].y, P[2].x, P[2].y, 3, NE.shade(c2, 0.55)); NE.pline(ctx, P[1].x, P[1].y, P[2].x, P[2].y, 2, c2);
    if (b.limb === 'leg') R(P[2].x - 1, P[2].y - 1, 3, 2, '#221c18'); else R(P[2].x - 1, P[2].y - 1, 2, 2, c2);
    R(P[0].x - 1, P[0].y - 1, 3, 3, '#7a0a0a'); R(P[0].x, P[0].y, 1, 1, '#ece6d6'); return true; }
  if (b.kind === 'head') { const q = P[0]; const x = Math.round(q.x) - 3, y = Math.round(q.y) - 3; const sk = b.skin; R(x - 1, y, 8, 6, NE.shade(sk, 0.55)); R(x, y - 1, 6, 8, NE.shade(sk, 0.55)); R(x, y, 6, 6, sk); R(x, y + 5, 6, 1, '#7a0a0a'); R(x + 2, y + 6, 2, 1, '#ece6d6');
    const hc = NE.HAIRC[(b.look || {}).hairCol] || '#222'; NE.drawHair6(ctx, (b.look || {}).hair, x, y, b.facing || 1, hc, NE.shade(hc, 0.55)); const ex = (b.facing || 1) > 0 ? x + 4 : x + 1; R(ex, y + 2, 1, 1, '#2a1010'); return true; }
  if (b.kind === 'gut') { for (let i = 0; i < P.length - 1; i++) NE.pline(ctx, P[i].x, P[i].y, P[i + 1].x, P[i + 1].y, 3, '#7a2e3a'); for (let i = 0; i < P.length - 1; i++) NE.pline(ctx, P[i].x, P[i].y, P[i + 1].x, P[i + 1].y, 2, i % 2 ? '#c8707e' : '#b85e6e'); for (let i = 1; i < P.length; i += 3) R(P[i].x, P[i].y - 1, 1, 1, '#f0b0b8'); return true; }
  if (b.kind === 'organ') { const c = b.pts.reduce((s, q) => ({ x: s.x + q.x / 4, y: s.y + q.y / 4 }), { x: 0, y: 0 }); const w = b.w, h = b.h; R(c.x - w / 2 - 0.5, c.y - h / 2, w + 1, h, NE.shade(b.color, 0.6)); R(c.x - w / 2, c.y - h / 2, w, h, b.color); R(c.x - w / 2 + 1, c.y - h / 2, 1, 1, NE.shade(b.color, 1.5)); return true; }
  return false;
};
// stains & stumps on a living/dead human, drawn by drawHuman
Gore.drawOn = function (ctx, rag, o) {
  const p = rag.pts; if (o.stains) for (const s of o.stains) { const q = p[s.i]; if (!q) continue; ctx.fillStyle = s.c; ctx.fillRect(Math.round(q.x) + s.dx * (o.facing || 1), Math.round(q.y) + s.dy, 1, 1); }
  if (o.gutted) { const x = Math.round(lerp(p[1].x, p[2].x, 0.6)), y = Math.round(lerp(p[1].y, p[2].y, 0.6)); ctx.fillStyle = '#5a0606'; ctx.fillRect(x - 2, y - 1, 4, 3); ctx.fillStyle = '#c8707e'; ctx.fillRect(x - 1, y, 2, 1); ctx.fillStyle = '#ece6d6'; ctx.fillRect(x - 2, y - 1, 1, 1); }
};
})(window.NE);
