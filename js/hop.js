// Nectar's End — tearing free of a host, taking a new one, and the gooey Vespa body
// • Hold [L] (any time, even downed): the Vespa strains, then tears out of the host (its own animation + sounds)
// • As a Vespa, press [P] near a living human: leap, latch, possess, and the run goes on in their body
// • NE.drawSlime: the shared slime-blob renderer (squash and stretch, pseudopods, drips, glossy highlight)
(function (NE) {
'use strict';
const G = NE.G, A = NE.Audio, T = NE.T; const { rf, ri, pick, chance, clamp, lerp } = NE;
const STR = 1.1, TEAR = 1.0, LEAP = 0.2, LATCH = 0.95, TAKE = 0.3;
const HOSTABLE = new Set(['feral', 'husk', 'trog', 'scav', 'gunner', 'specops', 'expedition', 'rival', 'drowned', 'skulker']);

// ---------- keys ----------
NE.BIND_DEFS.push(['rip', 'Leave: tear free of your host (hold)', ['KeyL', null]], ['hop', 'Possess: Vespa form takes a new host', ['KeyP', null]]);

// ---------- sounds (each action has its own) ----------
const SFX = {
  ripstrain(v) { A.tone(70 + v * 150, 0.22, 0.13, 'sawtooth', 55 + v * 110); A.noise(0.2, 260 + v * 500, 2.5, 0.16, 'lowpass'); if (Math.random() < 0.5) A.noise(0.05, 1800, 4, 0.08); },
  ripcancel() { A.noise(0.45, 700, 0.8, 0.28, 'bandpass'); A.tone(260, 0.4, 0.1, 'sine', 90); },
  riptear() { A.noise(0.55, 1400, 1.2, 0.55, 'bandpass'); A.noise(0.7, 180, 0.7, 0.7, 'lowpass'); A.tone(60, 0.5, 0.45, 'sawtooth', 28);
    setTimeout(() => A.noise(0.18, 3000, 2, 0.3, 'highpass'), 60); setTimeout(() => A.tone(95, 0.12, 0.3, 'square', 45), 120);
    setTimeout(() => { A.noise(0.5, 350, 2.5, 0.35, 'lowpass'); A.tone(150, 0.4, 0.1, 'sine', 70); }, 260); },
  slimesnap() { A.tone(950 + Math.random() * 300, 0.07, 0.1, 'triangle', 320); A.noise(0.04, 2400, 3, 0.12); },
  slimeleap() { A.tone(140, 0.2, 0.18, 'sine', 560); A.noise(0.2, 500, 1.4, 0.22, 'lowpass'); setTimeout(() => A.noise(0.1, 260, 2, 0.3, 'lowpass'), 150); },
  possess() { A.tone(210 + Math.random() * 60, 0.16, 0.08, 'triangle', 330); A.noise(0.1, 450 + Math.random() * 250, 3, 0.2, 'lowpass'); },
  takeover() { A.tone(55, 0.5, 0.5, 'sine', 30); [0, 4, 7, 12].forEach((k, i) => setTimeout(() => A.tone(330 * Math.pow(2, k / 12), 0.7, 0.07, 'sine', 330 * Math.pow(2, k / 12) * 1.01), 60 + i * 70)); A.noise(0.35, 600, 1.5, 0.35, 'bandpass'); },
  splat(v) { A.noise(0.12, 200, 1.5, 0.35 * v, 'lowpass'); A.tone(120, 0.1, 0.12 * v, 'sine', 55); },
  slimebubble() { A.tone(380 + Math.random() * 500, 0.07, 0.04, 'sine', 900 + Math.random() * 300); },
  hoperr() { A.tone(180, 0.14, 0.1, 'square', 120); },
};
const play0 = A.play; A.play = function (name, vol) { const f = SFX[name]; if (f) { if (!A.ctx) return; return f(vol == null ? 1 : vol); } return play0.apply(this, arguments); };

const evt = m => { if (G.net && G.net.on) G.net.send(Object.assign({ t: 'vx' }, m)); };
A.playAt = function (name, x, y, vol) { const p = G.player; const d = p ? Math.hypot(x - p.x, y - p.y) : 0; A.play(name, (vol == null ? 1 : vol) * clamp(1 - d / 420, 0.12, 1)); };

// ---------- the slime body ----------
// A wobbling glossy blob that squashes on landing and stretches in the air, with swaying pseudopods, drips and a puddle.
NE.drawSlime = function (ctx, o) {
  const C = NE.VC, f = o.facing || 1, w = o.w || 0, sy = o.sy || 1, sx = o.sx || 1;
  const a = 5.8 * sx, b = 5.5 * sy, X = Math.round(o.x), Y = Math.round(o.y), cy = Y - 0.5 - b;
  const px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); };
  const disc = (cx, cyy, r, c) => { const R = Math.ceil(r); ctx.fillStyle = c; for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) if (i * i + j * j <= r * r) ctx.fillRect(Math.round(cx) + i, Math.round(cyy) + j, 1, 1); };
  if (o.gnd !== false) { const pw = Math.round(a * 1.5 + Math.sin(w * 2) * 0.8); ctx.globalAlpha = 0.6; ctx.fillStyle = C.dark; ctx.fillRect(X - pw, Y - 1, pw * 2 + 1, 1); ctx.globalAlpha = 0.3; ctx.fillRect(X - pw - 2, Y, pw * 2 + 5, 1); ctx.globalAlpha = 1; }
  // sticky thread still joining it to where it jumped from
  if (o.thread && o.thread.k > 0) { const th = o.thread; ctx.globalAlpha = Math.min(1, th.k * 1.4); for (let s = 0; s <= 12; s++) { const t = s / 12; const x = lerp(th.x, o.x, t) + Math.sin(t * 6 + w * 4) * 0.6, y = lerp(th.y - 1, Y - 2, t) + Math.sin(t * Math.PI) * (2 + (1 - th.k) * 4); disc(x, y, 1.1 * (1 - Math.abs(t - 0.5) * 0.9) + 0.3, s % 2 ? C.dark : C.main); } ctx.globalAlpha = 1; }
  // pseudopods: thick, rounded, tapering — three that sway, one that reaches when lashing
  const arms = [[-0.9 * f, 0, 6.5], [0.15, -0.2, 7.5], [0.95 * f, 0.1, 6]];
  arms.forEach(([dx, ph, L], k) => {
    let len = L + 2.5 * Math.sin(w * 1.9 + k * 2.1); if (o.lash && k === 1) len += 4;
    let ang = -Math.PI / 2 + dx * 1.15 + Math.sin(w * 1.4 + k * 1.7) * 0.3, x = o.x + dx * a * 0.55, y = cy - b * 0.5; const seg = []; 
    for (let s = 0; s <= len; s += 1) { ang += Math.sin(w * 2.6 + k * 1.3 + s * 0.55) * 0.2 + dx * 0.06; x += Math.cos(ang); y += Math.sin(ang) * 0.95; seg.push([x, y, Math.max(0.8, 2.3 * (1 - s / len) + 0.6)]); }
    for (const [sx2, sy2, r] of seg) disc(sx2, sy2, r + 0.9, C.dark);
    for (const [sx2, sy2, r] of seg) disc(sx2, sy2, r, C.main);
    const t = seg[seg.length - 1]; disc(t[0] - 0.4, t[1] - 0.4, 0.9, C.light);
  });
  // body: dark rim, main mass, lighter core, glossy highlight, low belly shading
  const Rw = Math.ceil(a * 1.4) + 1, Hh = Math.ceil(b) + 2;
  for (let j = -Hh; j <= Hh; j++) {
    const py = Math.round(cy) + j; if (py > Y - 1) continue; const v = (py + 0.5 - cy) / b;
    for (let i = -Rw; i <= Rw; i++) {
      const skirt = v > 0.4 ? (v - 0.4) * 0.9 : 0, u = ((X + i + 0.5) - o.x) / (a * (1 + skirt));
      const th = Math.atan2(v, u), rr = 1 + 0.07 * Math.sin(3 * th + w * 2.3) + 0.05 * Math.sin(5 * th - w * 3.4) + 0.04 * Math.sin(2 * th + w * 1.7);
      const d = Math.hypot(u, v) / rr; if (d > 1) continue;
      let col = d > 0.82 ? C.dark : (v > 0.35 ? C.main : C.mid);
      if (d < 0.82 && d > 0.15 && Math.sin((u * 2.2 - v * 1.6) * 2 + w * 1.5) > 0.9) col = C.dark; // slow dark swirls under the skin
      const hu = u + 0.42, hv = v + 0.5, hh = hu * hu * 1.6 + hv * hv * 3; if (hh < 0.1 && d < 0.8) col = C.light; else if (hh < 0.2 && d < 0.82 && col !== C.dark) col = C.light === col ? col : C.mid;
      px(X + i, py, col);
    }
  }
  // spots of light slipping about inside, bubbles rising
  for (let k = 0; k < 3; k++) { const ph = (w * 0.3 + k * 0.34) % 1; const bx = Math.round(o.x + Math.sin(w * 0.8 + k * 2.4) * a * 0.5), by = Math.round(cy + b * 0.55 - ph * b * 1.3); px(bx, by, C.light); px(bx + 1, by, C.main); }
  // eyes: two narrow slanted slits, set low on the front of the mass
  const ey = Math.round(cy - b * 0.1), ex1 = X + Math.round(f * 2.6), ex2 = X + Math.round(f * 2.6 - f * 3.4);
  for (const ex of [ex1, ex2]) { px(ex, ey, '#fffbe0'); px(ex + f, ey - 1, '#fffbe0'); px(ex - f, ey + 1, C.dark); }
  // dripping while airborne
  if (o.gnd === false) for (let k = 0; k < 3; k++) { const ph = (w * 0.55 + k * 0.33) % 1, dx = X + Math.round((k - 1) * a * 0.6), len = 1 + Math.round(ph * 4); for (let s = 0; s <= len; s++) { px(dx, Y + s, s === len ? C.light : C.main); px(dx + 1, Y + s, C.dark); } }
  return { x1: ex1, x2: ex2, y: ey, f };
};
G.drawGoopGlow = (function (old) { return function (ctx) { const g = G.goop; const e = g && !(g.hop && g.hop.ph >= 1) && g._eye; if (!e) return old.apply(this, arguments); ctx.fillStyle = '#ffffff'; for (const ex of [e.x1, e.x2]) { ctx.fillRect(ex, e.y, 1, 1); ctx.fillRect(ex + e.f, e.y - 1, 1, 1); }
  G.domText('burst-t', Math.max(0, g.t).toFixed(1), 0.06, 'big' + (g.t < 3 && Math.sin(G.t * 12) > 0 ? ' hot' : '')); }; })(G.drawGoopGlow);

// squash and stretch, landing splats, trail of slime
function squash(g, dt, wasG, pvy) {
  g._sq = g._sq || 0;
  if (g.onGround && !wasG && pvy > 100) { g._sq = -Math.min(0.42, pvy / 650); A.play('splat', clamp(pvy / 300, 0.3, 1)); for (let i = 0; i < 6; i++) G.addP(g.x, g.y - 1, rf(-45, 45), rf(-50, -10), rf(0.3, 0.6), pick([NE.VC.main, NE.VC.dark]), 'goo'); }
  const tgt = g.onGround ? (Math.abs(g.vx) > 20 ? -0.06 : 0) : clamp(Math.abs(g.vy) / 800, 0, 0.42);
  g._sq += (tgt - g._sq) * Math.min(1, dt * 11); const br = Math.sin(g.wob * 3) * 0.035;
  g.sy = 1 + g._sq + br; g.sx = 1 / Math.sqrt(Math.max(0.5, 1 + g._sq)) - br * 0.5;
  if (g.onGround) { g._gx = g.x; g._gy = g.y; g._air = 0; } else g._air = (g._air || 0) + dt;
  if (g.onGround && Math.abs(g.vx) > 25 && Math.random() < dt * 14) G.addP(g.x - Math.sign(g.vx) * 3, g.y - 1, 0, -4, 0.5, NE.VC.dark, 'goo', 0.2);
  if (Math.random() < dt * 1.6) A.play('slimebubble');
}

// ---------- host hopping ----------
const BAL = () => NE.BAL || { graftRipLock: 25, graftShock: 28, hopHpFloor: 0.2, hopBloodFloor: 0.5 };
function canHost(a) { if (!a || !a.alive || a.isPlayer || a.isRemote || a.town || a.gone || a.hidden || !a.rag || !a.look) return false; if (a.isPuppet) return a.isNPCp ? a.kind === 'survivor' : HOSTABLE.has(a.type); return a.isNPC ? a.kind === 'survivor' : (a.type && HOSTABLE.has(a.type)); }
const gu0 = G.goopUpdate;
G.goopUpdate = function (dt) {
  const g = G.goop; if (!g) return gu0.apply(this, arguments);
  const wasG = g.onGround, pvy = g.vy;
  if (g.hop) { hopUpdate(g, dt); g.wob += dt; return; }
  const r = gu0.apply(this, arguments); if (!G.goop || G.goop !== g) return r;
  squash(g, dt, wasG, pvy);
  // find someone to take, press [F]
  let best = null, bd = 22; if (!g.sw) for (const a of G.actors) { if (!canHost(a)) continue; const d = Math.hypot(a.x - g.x, a.cy - (g.y - 3)); if (d < bd) { bd = d; best = a; } }
  g.hopTarget = best; const f = !NE.UI.modalOpen() && (G.kd('hop') || g._hopReq); g._hopReq = false;
  if (f && !g._hf) { if (best) tryHop(g, best); else if (!g.sw) { G.toast('No one close enough to take. Get right up to a living human.'); A.play('hoperr'); } }
  g._hf = f; return r;
};
function tryHop(g, a) {
  g.hop = { a, ph: 0, t: 0, x0: g.x, y0: g.y - 3, tw: 0, sn: 0 }; g.hook = null; g.tgt = null; g.hopTarget = null; g.swTarget = null;
  a.stagger = Math.max(a.stagger || 0, 3); A.play('slimeleap'); G.shake(2); evt({ e: 'hl', x: g.x, y: g.y, id: a.nid != null ? a.nid : null });
}
function hopAbort(g, why) { g.hop = null; g.vy = -90; g.vx = 0; A.play('slimesnap'); G.toast(why); for (let i = 0; i < 10; i++) G.addP(g.x, g.y - 3, rf(-50, 50), rf(-60, 0), rf(0.4, 0.8), NE.VC.main, 'goo'); }
function hopUpdate(g, dt) {
  const H = g.hop, a = H.a; H.t += dt;
  if (!canHost(a) && !(H.ph === 2 && a.alive)) return hopAbort(g, 'They died before the Vespa could take them.');
  if (H.ph === 0) {
    const k = clamp(H.t / LEAP, 0, 1), e = k * k * (3 - 2 * k), tx = a.x, ty = a.cy - 4;
    g.x = lerp(H.x0, tx, e); g.y = lerp(H.y0, ty, e) + 3 - Math.sin(k * Math.PI) * 8; g.facing = tx > H.x0 ? 1 : -1; g.vx = g.vy = 0; g.onGround = false; g.sx = 0.72; g.sy = 1.4;
    if (Math.random() < dt * 60) G.addP(g.x, g.y - 3, rf(-15, 15), rf(-10, 20), 0.4, pick([NE.VC.main, NE.VC.dark, NE.VC.light]), 'goo', 0.3);
    if (k >= 1) { H.ph = 1; H.t = 0; A.play('latch'); A.play('squelch', 1); G.shake(3); evt({ e: 'hh', x: a.x, y: a.cy }); }
  } else if (H.ph === 1) {
    const k = clamp(H.t / LATCH, 0, 1); H.k = k; const hd = a.rag.pts[0];
    a.stagger = Math.max(a.stagger || 0, 0.4); a.vx = 0; g.facing = a.facing; g.x = hd.x; g.y = hd.y + 5; g.vx = g.vy = 0; g.sx = 1.15; g.sy = 0.8; g.onGround = true;
    H.tw -= dt; if (H.tw <= 0) { H.tw = rf(0.05, 0.12); const q = pick(a.rag.pts); q.ox -= rf(-1, 1) * (60 + k * 100) / 60; q.oy -= rf(-1, 0.3) * (60 + k * 100) / 60; G.shake(0.5 + k * 1.5); }
    H.sn -= dt; if (H.sn <= 0) { H.sn = 0.13; A.play('possess'); }
    if (Math.random() < dt * (8 + k * 20)) G.addP(hd.x + rf(-3, 3), hd.y + rf(0, 5), rf(-20, 20), rf(-10, 25), rf(0.3, 0.6), pick([NE.VC.main, NE.VC.light, NE.VC.dark]), 'goo');
    if (k >= 1) { H.ph = 2; H.t = 0; A.play('takeover'); G.flashT = Math.max(G.flashT || 0, 0.8); G.slowmo = Math.max(G.slowmo || 0, 0.25); G.shake(7); G.burstFx = { x: a.x, y: a.cy, t: 0.45, col: NE.VC.main }; }
  } else if (H.t >= TAKE) { takeHost(g, a); }
}
G.dropGoopHopIfAny = function () { if (G.goop) G.goop.hop = null; };

// the swap: a new Player body built from the person the Vespa took
function takeHost(g, a) {
  const old = G.player, M = G.meta, R = G.run, oldS = old.surv; const W = G.world;
  // the old host stays behind as a lootable body
  const items = old.inv.items.slice(); old.inv.items = []; old.isPlayer = false; old.vespa = false;
  const nkey = 'oh' + ((Math.random() * 1e9) | 0).toString(36); G.dyn.push({ type: 'container', ct: 'corpse', actor: old, x: old.x, y: old.y, label: oldS.name + ' (your old host)', act: 'search', items, searched: true, nkey });
  const tnid = a.nid != null ? a.nid : null; evt({ e: 'take', id: tnid, x: a.x, y: a.cy, items, nkey });
  M.cemetery.unshift({ name: oldS.name, occ: NE.OCCUPATIONS.find(o => o.id === oldS.occ).name, age: oldS.age, depth: Math.round(NE.depthOfY(old.y)), cause: old.anat.cause || 'Abandoned by the Vespa', time: Math.round(R.t), kills: R.kills, extracted: false, date: new Date().toLocaleDateString(), look: oldS.look, abil: (R.abil || []).slice() });
  if (M.cemetery.length > 60) M.cemetery.length = 60;
  // who they are now
  const s = NE.makeSurvivor(); const look = Object.assign({}, a.look); s.look = look;
  if ((a.isNPC || a.isNPCp) && a.name) { const parts = String(a.name).split(' '); s.first = parts[0]; s.last = parts.slice(1).join(' ') || s.last; } else s.first = pick(look.sex === 'f' ? NE.FIRST_F : NE.FIRST_M);
  s.name = s.first + ' ' + s.last; s.variant = oldS.variant; s.tears = oldS.tears || 0;
  const v = NE.variantOf(s.variant); look.veye = v.eye; look.vglow = v.glow; M.survivor = s;
  const np = new NE.Player(G, a.x, a.y, s, M); np.vglow = v.glow; np.facing = a.facing || 1;
  if (a.shirt) np.shirt = a.shirt; if (a.pants) np.pants = a.pants; if (a.skinCol) np.skinCol = a.skinCol; np.gear = Object.assign({}, a.gear);
  // their things
  const inv = np.inv; inv.add('rag', 1);
  if (a.weapon && NE.ITEMS[a.weapon]) { const IT = NE.ITEMS[a.weapon]; inv.add(a.weapon, 1, IT.gun ? { mag: Math.min(a.ammo || 0, IT.gun.mag || 6) } : undefined); const w = inv.items.find(e => e.id === a.weapon); if (w) np.equip.weapon = w; if (IT.gun && IT.gun.ammo) inv.add(IT.gun.ammo, ri(2, 6)); }
  if (a.D && a.D.loot) for (let i = 0; i < 2; i++) { try { const id = NE.wpick(a.D.loot); if (id && NE.ITEMS[id]) inv.add(id, 1); } catch (e) { } } else { inv.add('water', 1); }
  // their body: wounds come along, the Vespa knits the worst of it shut
  const A0 = a.anat, A1 = np.anat;
  for (const k of NE.PARTS) { const P0 = A0.parts[k], P1 = A1.parts[k]; const fr = P0.max ? P0.hp / P0.max : 1; P1.hp = Math.max(1, P1.max * Math.max(P0.severed ? 0.4 : fr, BAL().hopHpFloor)); P1.wounds = P0.wounds.map(wd => Object.assign({}, wd)); P1.frac = P0.frac; P1.fracT = P0.fracT; P1.bandage = P0.bandage; }
  A1.blood = Math.max(A0.blood, NE.BLOOD * BAL().hopBloodFloor); A1.painSpike = Math.max(A1.painSpike || 0, BAL().graftShock); A1.stress = Math.max(A1.stress || 0, BAL().graftShock); A1.stam = Math.min(A1.stam, A1.stamMax * 0.5); G.ripLock = G.t + BAL().graftRipLock; A1.infection = A0.infection || 0; A1.tox = A0.tox || 0;
  // remove them from the world, put the Vespa in
  a.hidden = true; a.gone = true; if (a.isPuppet && G.net) G.net.puppets.delete(a.nid); if (a.rag) a.rag.remove = true; G.dyn = G.dyn.filter(o => o.actor !== a); G.actors = G.actors.filter(x => x !== a);
  G.actors.unshift(np); G.player = np; G.goop = null; G.state = 'run'; G.domText('burst-t', null); G.domText('rip-t', null);
  np.setAbilities(R.abil || []); np.infest = G.infestLevel(); np.rag.tiles = false;
  NE.UI.showRun && NE.UI.showRun(); NE.UI.banner('NEW HOST', s.name + ', ' + s.age + ' — ' + NE.OCCUPATIONS.find(o => o.id === s.occ).name + '. The graft is raw: pain, shock, and no tearing free for ' + BAL().graftRipLock + 's.');
  G.log('The Vespa takes ' + s.name + '. ' + oldS.first + ' is left behind.', 'good');
  for (let i = 0; i < 34; i++) G.addP(np.x, np.cy, rf(-70, 70), rf(-90, 10), rf(0.4, 1.1), pick([v.glow, '#fff6c0', NE.VC.main]), 'glow', 0.2);
  if (G.net && G.net.on && G.net.sendHello) G.net.sendHello(); G.musicFor(); G.autosave();
}

// ---------- tearing free ----------
G.rip = null;
function ripOK() { const p = G.player; return G.state === 'run' && p && p.alive && !G.goop && !G.emerge && !G.infest && !G.wisp && !NE.UI.modalOpen(); }
function ripCancel(msg) { G.rip = null; G.domText('rip-t', null); A.play('ripcancel'); evt({ e: 'rc', x: G.player.x, y: G.player.y }); if (msg) G.toast(msg); }
function startTear(R, p) {
  R.ph = 1; R.t = 0; NE.UI.closeAll(); G.releaseGrab(); p.charge = null;
  const cause = 'Torn open from within by the Vespa'; p.anat.cause = cause; p.die(cause); p.anat.damage('torso', 120, 'sharp'); p.anat.lastHit = 'The Vespa';
  G.state = 'burst'; G.slowmo = Math.max(G.slowmo || 0, 0.2); G.flashT = Math.max(G.flashT || 0, 0.45); G.shake(8); A.play('riptear'); evt({ e: 'rt', x: p.x, y: p.cy });
  const P = p.rag.pts; for (const q of P) { q.ox -= (p.facing * -1) * rf(0.4, 1.2); q.oy += rf(0.2, 1.0); }
  R.strands = [...Array(7)].map((_, i) => ({ s: 0.12 + i * 0.12, off: rf(-1.6, 1.6), snap: 0.42 + i * 0.07, done: false }));
  G.log('You tear yourself out of ' + p.surv.name + '.', 'bad'); G.domText('rip-t', null);
}
function finishTear(R, p) {
  const P = p.rag.pts, m = { x: (P[1].x + P[2].x) / 2, y: (P[1].y + P[2].y) / 2 }; NE.setVespaColours(p.vglow);
  const g = Object.create(NE.Actor.prototype); let x = m.x + p.facing * 10, y = m.y - 12; if (G.world.solidAt(x, y)) { x = p.x; y = p.y - 8; }
  Object.assign(g, { g: G, x, y: y + 4, vx: p.facing * 30, vy: -70, w: 7, h: 6, onGround: false, dropT: 0, climbing: false, t: 10, cd: 0, lashT: 0, tgt: null, kills: 0, facing: p.facing, wob: 0, ripped: true });
  g.t = 8 + ((p.stats && p.stats.vTime) || 0); if (NE.vperk(p) === 'burst') g.t = Math.max(g.t, 16); G.goop = g; G.rip = null; G.sayCD = 0;
  G.say(pick(['Free. Free. FREE.', 'The meat was getting heavy.', 'Out. Find another.']), 1); NE.Audio.music('burst');
  NE.UI.banner('TORN FREE', 'Eight seconds to take a new host.  [' + NE.keyLabel('hop') + '] POSSESS someone close  •  [LMB] lash  •  [RMB] grapple  •  [E] swallow');
  G.burstFx = { x: m.x, y: m.y, t: 0.35, col: p.vglow || NE.VC.main }; for (const a of G.actors) if (a.alive && a.D && NE.dist(a.x, a.y, p.x, p.y) < 70 && chance(0.4)) { a.state = 'flee'; a.target = p; }
  if (G.net && G.net.on) G.net.send({ t: 'burst', rip: 1 });
}
function ripTick(dt) {
  const p = G.player; let R = G.rip;
  if (!R) { const held = G.kd('rip'); if (held && !G._ripHeld) { G._ripHeld = true; if (ripOK()) { if (G.t < (G.ripLock || 0)) { G.toast('The graft is still knitting (' + Math.ceil(G.ripLock - G.t) + 's). You cannot tear free yet.'); A.play('hoperr'); } else { G.rip = { ph: 0, t: 0, snd: 0, tw: 0 }; evt({ e: 'rs', x: p.x, y: p.cy }); G.toast('Tearing free of ' + p.surv.first + '... hold [' + NE.keyLabel('rip') + ']'); } } } if (!held) G._ripHeld = false; return; }
  const P = p.rag.pts, torso = { x: (P[1].x + P[2].x) / 2, y: (P[1].y + P[2].y) / 2 };
  R.t += dt;
  if (R.ph === 0) {
    const k = clamp(R.t / STR, 0, 1); G.mouse.l = false;
    if (!G.kd('rip') || !p.alive || G.state !== 'run' || NE.UI.modalOpen()) return ripCancel('You hold on. The Vespa settles back.');
    R.snd -= dt; if (R.snd <= 0) { R.snd = 0.2 - k * 0.1; A.play('ripstrain', k); if (k > 0.3) A.play('heart', 0.4 + k * 0.5); p.flash = 0.08; }
    R.tw -= dt; if (R.tw <= 0) { R.tw = rf(0.05, 0.14); const q = pick(P); q.ox -= rf(-1, 1) * (30 + k * 120) / 60; q.oy -= rf(-1.4, 0.3) * (30 + k * 120) / 60; G.shake(0.3 + k * 2); }
    if (k > 0.25 && Math.random() < dt * (5 + k * 20)) G.addP(torso.x + rf(-2, 2), torso.y + rf(-2, 2), rf(-20, 20), rf(-40, -5), rf(0.4, 0.8), pick([NE.VC.main, NE.VC.dark, NE.VC.light]), 'goo');
    if (R.t >= STR) startTear(R, p);
  } else {
    const k = clamp(R.t / TEAR, 0, 1);
    if (Math.random() < dt * 45) { const a = rf(-Math.PI, 0); G.addP(torso.x, torso.y, Math.cos(a) * rf(20, 90), Math.sin(a) * rf(20, 90) - 20, rf(0.4, 0.9), pick([NE.VC.main, NE.VC.dark, '#7a0c0c', '#5a0606']), pick(['goo', 'blood', 'goo'])); }
    for (const st of R.strands) if (!st.done && k > st.snap) { st.done = true; A.play('slimesnap'); G.addP(torso.x + rf(-3, 3), torso.y + rf(-3, 3), rf(-25, 25), rf(-10, 30), 0.6, NE.VC.main, 'goo'); }
    if (R.t >= TEAR) finishTear(R, p);
  }
}
const tick0 = NE.UI.tick; NE.UI.tick = function (dt) { const r = tick0.apply(this, arguments); ripTick(dt); return r; };
// a body taken mid-frame is already in the actor list: the main loop must not tick it without controls
const pu0 = NE.Player.prototype.update; NE.Player.prototype.update = function (dt, c) { if (c === undefined && this.isPlayer) return; return pu0.apply(this, arguments); };
// frozen while straining
const ctl0 = G.ctl; G.ctl = function () { const c = ctl0.apply(this, arguments); if (G.rip) { c.mx = 0; c.up = false; c.down = false; c.jump = false; c.sprint = false; c.drop = false; c.crouch = false; } return c; };
const oc0 = G.onClick; G.onClick = function () { if (G.rip) return; return oc0.apply(this, arguments); };
const ok0 = G.onKey; G.onKey = function (code) { if (G.goop && G.actionOf(code) === 'hop') G.goop._hopReq = true; if (G.rip && code !== 'Escape' && G.actionOf(code) !== 'rip') return; return ok0.apply(this, arguments); };
const cw0 = G.clearWorld; G.clearWorld = function () { G.ripLock = 0; G.rip = null; G._ripHeld = false; G.domText('rip-t', null); return cw0.apply(this, arguments); };
const sr0 = G.startRun; G.startRun = function (restore) { const r = sr0.apply(this, arguments); if (!restore) setTimeout(() => { if (G.state === 'run') G.log('Hold [' + NE.keyLabel('rip') + '] to tear yourself out of your host. As a Vespa, [' + NE.keyLabel('hop') + '] takes a new one.', 'sys'); }, 7200); return r; };

// ---------- drawing the rip and the hop ----------
const ease = k => k * k * (3 - 2 * k);
function glyph(ctx, ch, x, y, col) { const rows = ({ E: ['111', '100', '110', '100', '111'], F: ['111', '100', '110', '100', '100'], P: ['110', '101', '110', '100', '100'], L: ['100', '100', '100', '100', '111'], '?': ['110', '001', '010', '000', '010'] }[ch] || ['111', '101', '101', '101', '111']); for (const [dx, dy, c] of [[1, 1, '#000'], [0, 0, col]]) { ctx.fillStyle = c; rows.forEach((row, j) => { for (let i = 0; i < 3; i++) if (row[i] === '1') ctx.fillRect(x + i + dx, y + j + dy, 1, 1); }); } }
function drawRip(ctx, R) {
  const p = R.p || G.player, P = p.rag.pts, C = NE.VC, f = p.facing; const px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); };
  const m = { x: (P[1].x + P[2].x) / 2, y: (P[1].y + P[2].y) / 2 }; let dx = P[1].x - P[2].x, dy = P[1].y - P[2].y; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L; const nx = -dy, ny = dx;
  if (R.ph === 0) {
    const k = clamp(R.t / STR, 0, 1), half = L / 2 * (0.25 + 0.75 * k), pulse = 0.6 + 0.4 * Math.sin(G.t * (8 + k * 24));
    // a seam opens down the chest
    for (let s = -half; s <= half; s += 0.7) { const j = Math.sin(s * 1.7 + G.t * 8) * 0.8; px(m.x + dx * s + nx * j, m.y + dy * s + ny * j, Math.abs(s) < half * 0.4 ? C.light : C.main); }
    // lumps of slime moving under the skin
    ctx.globalAlpha = 0.45 + 0.4 * pulse; for (let i = 0; i < 3; i++) { const t = ((G.t * 1.3 + i * 0.33) % 1) - 0.5, x = m.x + dx * t * L * 0.8 + nx * Math.sin(G.t * 5 + i) * 1.4, y = m.y + dy * t * L * 0.8 + ny * Math.sin(G.t * 5 + i) * 1.4; ctx.fillStyle = C.main; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2); px(x, y - 1, C.light); } ctx.globalAlpha = 1;
    // slime drools from the mouth, the eyes go gold
    const hd = P[0]; for (let s = 0; s < 2; s++) { const len = 1 + k * 5 + Math.sin(G.t * 6 + s) * 0.8; for (let i = 0; i < len; i++) px(hd.x + f * 1.5 + s, hd.y + 2 + i, i > len - 1.5 ? C.light : C.main); }
    ctx.globalAlpha = k; px(hd.x + f * 1.5 - 1, hd.y - 0.5, C.light); px(hd.x + f * 1.5 + 1, hd.y - 0.5, C.light); ctx.globalAlpha = 1;
    // progress
    const bx = Math.round(hd.x) - 9, by = Math.round(hd.y) - 11; ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(bx - 1, by - 1, 20, 4); ctx.fillStyle = C.dark; ctx.fillRect(bx, by, 18, 2); ctx.fillStyle = k > 0.8 ? C.light : C.main; ctx.fillRect(bx, by, Math.round(18 * k), 2);
  } else {
    const k = clamp(R.t / TEAR, 0, 1), e = ease(k);
    // the gash
    const gw = 1 + e * 2; for (let s = -L / 2; s <= L / 2; s += 0.6) { const j = Math.sin(s * 1.9) * 0.9; for (let w = 0; w < gw; w++) px(m.x + dx * s + nx * (j + w - gw / 2), m.y + dy * s + ny * (j + w - gw / 2), w === 0 || w >= gw - 1 ? '#3a0606' : C.dark); px(m.x + dx * s + nx * (j - gw / 2 - 1), m.y + dy * s + ny * (j - gw / 2 - 1), C.main); }
    // the slime heaves out, trailing strands that stretch and snap
    const bx = m.x + f * 10 * e, by = m.y - 16 * e + Math.sin(e * Math.PI) * -3; const sz = 0.35 + 0.65 * e;
    for (const st of R.strands) { if (st.done) continue; const ax = m.x + dx * (st.s - 0.5) * L + nx * st.off, ay = m.y + dy * (st.s - 0.5) * L + ny * st.off, sag = Math.max(0, 6 - Math.hypot(bx - ax, by - ay) * 0.25) * (1 - 0.5 * e);
      for (let t = 0; t <= 1; t += 0.08) { px(lerp(ax, bx, t), lerp(ay, by + 2, t) + Math.sin(t * Math.PI) * sag, (Math.round(t * 12)) % 3 ? C.main : C.light); } }
    NE.drawSlime(ctx, { x: bx, y: by + 4, facing: f, w: G.t * 3, sx: sz * 1.15, sy: sz * (0.7 + 0.5 * e), gnd: false });
    ctx.globalAlpha = Math.max(0, 1 - k * 1.2); ctx.fillStyle = '#fff6c0'; ctx.fillRect(Math.round(m.x) - 2, Math.round(m.y) - 1, 5, 3); ctx.globalAlpha = 1;
  }
}
function drawLatch(ctx, a, k) {
  const C = NE.VC; const px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); };
  const hd = a.rag.pts[0], r = 1.6 + k * 3.2, hx = Math.round(hd.x), hy = Math.round(hd.y);
  for (let j = -5; j <= 5; j++) for (let i = -5; i <= 5; i++) { const d = Math.hypot(i, j * 1.1); if (d > r) continue; ctx.fillStyle = d > r - 1 ? C.dark : (i < 0 && j < 0 && d < r * 0.6 ? C.light : C.main); ctx.fillRect(hx + i, hy + j, 1, 1); }
  for (let s = 0; s < 3; s++) { const len = k * (5 + s * 2); for (let i = 0; i < len; i++) px(hx + (s - 1) * 2, hy + 4 + i, i > len - 1.5 ? C.light : C.main); }
  if (k > 0.45 && Math.sin(G.t * 40) > -0.3) { px(hx - 1, hy - 0.5, C.light); px(hx + 1, hy - 0.5, C.light); }
}
function drawHopFx(ctx) {
  const g = G.goop; if (!g) return; const C = NE.VC; const px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); };
  if (g.hop) {
    const H = g.hop, a = H.a;
    if (H.ph === 0) { NE.pline(ctx, H.x0, H.y0, g.x, g.y - 3, 3, C.dark); NE.pline(ctx, H.x0, H.y0, g.x, g.y - 3, 2, C.main); NE.pline(ctx, H.x0, H.y0, g.x, g.y - 3, 1, C.light); return; }
    drawLatch(ctx, a, H.ph === 1 ? H.k : 1);
    return;
  }
  const a = g.hopTarget; if (a && canHost(a) && !g.sw) {
    const x = Math.round(a.x), top = Math.round(a.y - a.h) - 3, pul = 0.6 + 0.4 * Math.sin(G.t * 9); ctx.globalAlpha = 0.55 + pul * 0.45;
    glyph(ctx, (NE.keyLabel('hop') || '?').slice(-1).toUpperCase(), x + 8, top + 4, '#ffe070'); ctx.globalAlpha = 1;
  }
}
const gl0 = G.drawGlow; G.drawGlow = function (ctx) { const r = gl0.apply(this, arguments); if (G.rip) drawRip(ctx, G.rip.p ? G.rip : Object.assign(G.rip, { p: G.player })); drawHopFx(ctx); return r; };

// ---------- co-op: your partner sees all of it ----------
// what we broadcast every packet (the partner's copy of us draws the rip seam, the slime's squash and the latch from this)
NE.hopState = function () {
  const o = {}, R = G.rip; if (R) o.rg = [R.ph, +clamp(R.t / (R.ph ? TEAR : STR), 0, 1).toFixed(2)];
  const g = G.goop; if (g) { o.gx = [g.facing || 1, +(g.sx || 1).toFixed(2), +(g.sy || 1).toFixed(2), g.onGround ? 1 : 0, g.hurtT > 0 ? 1 : 0]; if (g.lashT > 0 && g.tgt) o.gl = [Math.round(g.tgt.x), Math.round(g.tgt.y)]; if (g.hop && g.hop.ph >= 1) o.hp = [g.hop.ph, +(g.hop.k || 0).toFixed(2), g.hop.a.nid != null ? g.hop.a.nid : -1]; }
  return o;
};
const actorByNid = id => { const n = G.net; if (!n || id == null || id < 0) return null; return n.role === 'guest' ? n.puppets.get(id) : G.actors.find(a => a.nid === id); };
// ...and what we do with theirs
NE.hopApply = function (peer, s) {
  peer.rg = s.rg || null; peer.gx = s.gx || null; peer.gl = s.gl || null; peer.hpf = s.hp || null;
  if (peer.rg) { peer.rgT = (peer.rgT || 0) - 0.05; if (peer.rg[0] === 0 && peer.rgT <= 0) { peer.rgT = 0.22 - peer.rg[1] * 0.1; A.playAt('ripstrain', peer.x, peer.y, 0.3 + peer.rg[1] * 0.7); G.shake(0.3 * clamp(1 - Math.hypot(peer.x - G.player.x, peer.y - G.player.y) / 200, 0, 1)); } }
  if (peer.hpf && peer.hpf[0] >= 1 && G.net && G.net.role === 'host') { const t = actorByNid(peer.hpf[2]); if (t && t.alive) t.stagger = Math.max(t.stagger || 0, 0.4); } // the victim freezes while they are being taken
};
function cloneCorpse(peer, items, nkey) {
  const c = new NE.Actor(G, peer.x, peer.y, { faction: 'neutral', look: peer.look, npc: true }); c.shirt = peer.shirt; c.pants = peer.pants; c.skinCol = peer.skinCol; c.name = peer.name;
  peer.rag.pts.forEach((q, i) => { const r = c.rag.pts[i]; if (r) { r.x = q.x; r.y = q.y; r.ox = q.x; r.oy = q.y; } }); c.die('Abandoned by the Vespa'); G.actors.push(c);
  G.dyn.push({ type: 'container', ct: 'corpse', actor: c, x: peer.x, y: peer.y, label: (peer.name || 'Host') + ' (old host)', act: 'search', items: items || [], searched: true, nkey: nkey || ('oh' + ((Math.random() * 1e9) | 0).toString(36)) });
}
NE.hopNet = function (net, m) {
  const peer = net.peer, nm = net.peerSurv ? net.peerSurv.first : 'Your partner';
  switch (m.e) {
    case 'rs': A.playAt('ripstrain', m.x, m.y, 0.8); if (peer) G.toast(nm + ' is straining against their host...'); break;
    case 'rc': A.playAt('ripcancel', m.x, m.y, 1); break;
    case 'rt': A.playAt('riptear', m.x, m.y, 1); G.shake(5 * clamp(1 - Math.hypot(m.x - G.player.x, m.y - G.player.y) / 260, 0, 1)); G.flashT = Math.max(G.flashT || 0, 0.15); break;
    case 'hl': A.playAt('slimeleap', m.x, m.y, 1); if (net.role === 'host' && m.id != null) { const t = actorByNid(m.id); if (t && t.alive) t.stagger = Math.max(t.stagger || 0, 2); } break;
    case 'hh': A.playAt('latch', m.x, m.y, 1); A.playAt('squelch', m.x, m.y, 0.8); break;
    case 'take': {
      A.playAt('takeover', m.x, m.y, 1); G.shake(6 * clamp(1 - Math.hypot(m.x - G.player.x, m.y - G.player.y) / 260, 0, 1)); G.flashT = Math.max(G.flashT || 0, 0.25);
      for (let i = 0; i < 24; i++) G.addP(m.x, m.y, rf(-70, 70), rf(-90, 10), rf(0.4, 1.0), pick([NE.VC.main, '#fff6c0', NE.VC.dark]), i % 3 ? 'goo' : 'glow', i % 3 ? undefined : 0.2);
      if (m.id != null && m.id >= 0) { if (net.role === 'guest') { const pp = net.puppets.get(m.id); if (pp) { pp.hidden = true; pp.gone = true; G.actors = G.actors.filter(a => a !== pp); net.puppets.delete(m.id); } } else { const e = G.actors.find(a => a.nid === m.id); if (e) { e.hidden = true; e.gone = true; if (e.rag) e.rag.remove = true; G.dyn = G.dyn.filter(o => o.actor !== e); } } }
      if (peer && !peer.alive) cloneCorpse(peer, m.items, m.nkey); G.toast(nm + ' takes a new host.'); break; }
  }
};
// the partner's slime: their colours, their squash, their lash, and the blob on a head when they are latched on
NE.drawRemoteSlime = function (ctx, a) {
  const save = NE.VC; NE.setVespaColours(a.vglow);
  try {
    if (a.hpf && a.hpf[0] >= 1) { const t = actorByNid(a.hpf[2]); if (t && t.rag) { drawLatch(ctx, t, a.hpf[0] === 1 ? a.hpf[1] : 1); return; } }
    const gx = a.gx || [a.facing || 1, 1, 1, 1, 0]; const C = NE.VC;
    if (a.gl) { const x = Math.round(a.x), y = Math.round(a.y) - 4; NE.pline(ctx, x, y, a.gl[0], a.gl[1], 3, C.dark); NE.pline(ctx, x, y, a.gl[0], a.gl[1], 2, C.main); NE.pline(ctx, x, y, a.gl[0], a.gl[1], 1, C.light); }
    NE.drawSlime(ctx, { x: a.x, y: a.y, facing: gx[0], w: G.t * 3 + 7, sx: gx[1], sy: gx[2], gnd: !!gx[3], lash: !!a.gl });
    if (gx[4]) { ctx.globalAlpha = 0.45; ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(a.x) - 5, Math.round(a.y) - 9, 11, 9); ctx.globalAlpha = 1; }
  } finally { NE.VC = save; }
};
const rgl = G.drawGlow; G.drawGlow = function (ctx) { const r = rgl.apply(this, arguments); const q = G.net && G.net.peer; if (q && q.rg && q.rag && !q.hidden && !q.goop) { const save = NE.VC; NE.setVespaColours(q.vglow); try { const k = q.rg[1], ph = q.rg[0]; const st = [...Array(7)].map((_, i) => ({ s: 0.12 + i * 0.12, off: ((i * 37) % 7 - 3) * 0.5, snap: 0.42 + i * 0.07, done: ph === 1 && k > 0.42 + i * 0.07 })); drawRip(ctx, { p: q, ph, t: k * (ph ? TEAR : STR), strands: st }); } finally { NE.VC = save; } } return r; };
})(window.NE);
