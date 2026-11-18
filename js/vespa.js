// Nectar's End — the Vespa: eye glow & trail, relic nectar abilities, hive pulse, death burst, co-op re-hosting, town rest, ambient life
(function (NE) {
'use strict';
const { ri, rf, pick, chance, clamp, lerp } = NE; const T = NE.T;
const G = NE.G;
const GOLD = '#ffd23a';

// ---------- glowing eyes + fading trail ----------
G.eyePos = function (a) { const h = a.rag.pts[0]; return { x: Math.round(h.x) + (a.facing > 0 ? 1 : -1), y: Math.round(h.y) }; };
G.trail = function (a, dt) {
  if (!a.alive || !a.vespa) return; const e = G.eyePos(a); const ink = a.infest || 0.2;
  if (!a._le) a._le = e; const moved = Math.hypot(e.x - a._le.x, e.y - a._le.y);
  if (moved > 0.6 || Math.random() < dt * 2) { G.addP(e.x, e.y, rf(-2, 2), rf(-3, 1), 0.25 + ink * 0.9, ink > 0.6 ? '#ffb020' : GOLD, 'glow', 0); a._le = e; }
};
G.vespaTick = function (p, dt) {
  G.trail(p, dt); if (G.net && G.net.peer) G.trail(G.net.peer, dt);
  p.pulseCD = Math.max(0, (p.pulseCD || 0) - dt);
  if (p.stats.heart) p.anat.bpm = Math.max(p.anat.bpm, 88);
  G.flashT = Math.max(0, (G.flashT || 0) - dt);
};
G.drawGlow = function (ctx) {
  for (const q of G.parts) { if (q.kind !== 'glow') continue; const k = q.life / q.max; ctx.globalAlpha = k * 0.85; ctx.fillStyle = q.col; ctx.fillRect(Math.round(q.x), Math.round(q.y), 1, 1); if (k > 0.75) { ctx.globalAlpha = k * 0.25; ctx.fillRect(Math.round(q.x) - 1, Math.round(q.y), 3, 1); } }
  ctx.globalAlpha = 1;
  // the Vespa's eyes cut through any darkness
  const eyes = a => { if (!a || !a.alive || !a.vespa) return; const e = G.eyePos(a); ctx.fillStyle = 'rgba(255,200,40,0.35)'; ctx.fillRect(e.x - 1, e.y - 1, 3, 3); ctx.fillStyle = '#fff1a0'; ctx.fillRect(e.x, e.y, 1, 1); };
  eyes(G.player); if (G.net && G.net.peer) eyes(G.net.peer);
  if (G.player && G.player.abil && G.player.abil.includes('eyes')) for (const a of G.actors) if (a.alive && !a.vespa && !a.town && a.D && Math.abs(a.y - G.player.y) < 200) { const e = G.eyePos(a); ctx.fillStyle = 'rgba(255,60,40,' + (0.6 + 0.3 * Math.sin(G.t * 5 + a.x)) + ')'; ctx.fillRect(e.x, e.y, 1, 1); }
  for (const q of G.amb) if (q.glow) { ctx.globalAlpha = q.a * (0.55 + 0.45 * Math.sin(G.t * q.tw + q.ph)); ctx.fillStyle = q.col; ctx.fillRect(Math.round(q.x), Math.round(q.y), 1, 1); }
  ctx.globalAlpha = 1;
  if (G.wisp) G.drawWisp(ctx);
  if (G.goop) G.drawGoopGlow(ctx);
};

// ---------- ambient life (fireflies, sand motes, snow, crystal glints, embers, town dust) ----------
G.ambient = function (dt) {
  const W = G.world; if (!W) return; const F = G.focus(); const fl = W.lobby ? W.floors[0] : W.floorOf(Math.floor((F.y - 2) / T)); if (!fl) return;
  const kind = W.lobby ? 'camp' : fl.town ? 'town' : fl.biome.id; const want = Math.round(NE.VW / 8);
  const spawn = () => { const x = G.cam.x + rf(0, NE.VW), y = G.cam.y + rf(0, NE.VH); const q = { x, y, vx: 0, vy: 0, a: 1, tw: rf(1, 4), ph: rf(0, 6), glow: true, k: kind };
    if (kind === 'grotto' || kind === 'camp') { q.col = pick(['#c8ff70', '#9affb0', '#fff090']); q.vx = rf(-6, 6); q.vy = rf(-4, 4); q.a = 0.9; }
    else if (kind === 'desert') { q.col = '#e8c890'; q.glow = false; q.vx = rf(10, 22); q.vy = rf(-2, 3); q.a = 0.45; }
    else if (kind === 'ice') { q.col = '#ffffff'; q.glow = false; q.vx = rf(-3, 3); q.vy = rf(8, 16); q.a = 0.65; }
    else if (kind === 'crystal') { q.col = pick(['#b0e0ff', '#e0b0ff', '#a0ffe0']); q.vx = rf(-2, 2); q.vy = rf(-3, 0); q.tw = rf(3, 8); }
    else if (kind === 'magma') { q.col = pick(['#ff8020', '#ffc040', '#ff5010']); q.vx = rf(-4, 4); q.vy = rf(-18, -8); }
    else { q.col = pick(['#ffd890', '#ffb060']); q.vx = rf(-3, 3); q.vy = rf(-3, 1); q.a = 0.7; }
    return q; };
  if (G.amb.length && G.amb[0].k !== kind) G.amb = [];
  while (G.amb.length < want) G.amb.push(spawn());
  for (const q of G.amb) { q.x += (q.vx + Math.sin(G.t * 0.7 + q.ph) * 3) * dt; q.y += (q.vy + Math.cos(G.t * 0.9 + q.ph) * 2) * dt; if (q.x < G.cam.x - 10 || q.x > G.cam.x + NE.VW + 10 || q.y < G.cam.y - 10 || q.y > G.cam.y + NE.VH + 10 || W.solidAt(q.x, q.y)) Object.assign(q, spawn()); }
};
G.drawAmbient = function (ctx) { for (const q of G.amb) if (!q.glow) { ctx.globalAlpha = q.a; ctx.fillStyle = q.col; ctx.fillRect(Math.round(q.x), Math.round(q.y), 1, 1); } ctx.globalAlpha = 1; };

// ---------- relic flowers & nectar ----------
G.harvestRelic = function (o) { const p = G.player; p.search = { obj: o, t: 0, dur: 2.2, relic: true }; NE.Audio.play('chime'); G.say(pick(NE.MONO.relic), 0.6); };
G.finishRelic = function (o) {
  const p = G.player; o.type = 'dead'; o.act = null; for (let i = 0; i < 26; i++) G.addP(o.x, o.y - 10, rf(-40, 40), rf(-70, 0), rf(0.6, 1.4), pick(['#ffd040', '#fff0a0', '#ffb020']), 'glow', 0.2);
  if (G.net && G.net.on) G.net.send({ t: 'objdead', x: o.x, y: o.y });
  const left = p.inv.add('nectar', 1); if (left) G.dropEntry({ id: 'nectar', n: 1 });
  NE.UI.dialog('Relic Nectar', 'Thick, golden, warm as blood. The Vespa inside ' + p.surv.first + ' <b>screams</b> for it.', [{ label: 'Drink it now', fn: () => { const e = p.inv.find('nectar'); if (e) NE.consume(p, e); } }, { label: 'Save it for later', hint: 'Drink it from your inventory any time' }]);
};
G.drinkNectar = function (p) {
  const R = G.run; if (!R) return; R.abil = R.abil || []; G.meta.nectars = (G.meta.nectars || 0) + 1;
  const left = NE.ABILITIES.filter(a => !R.abil.includes(a.id));
  p.anat.blood = Math.min(5000, p.anat.blood + 600); p.anat.pain *= 0.4; p.anat.stam = p.anat.stamMax; p.anat.infection *= 0.5; for (const k of NE.PARTS) p.anat.parts[k].hp = Math.min(p.anat.parts[k].max, p.anat.parts[k].hp + 25);
  G.flashT = 1.2; NE.Audio.play('nectar'); G.shake(3); G.sayCD = 0; G.say(pick(NE.MONO.nectar));
  for (let i = 0; i < 40; i++) G.addP(p.x, p.cy, rf(-60, 60), rf(-80, 20), rf(0.6, 1.6), pick(['#ffd040', '#fff0a0', '#ffb020']), 'glow', 0.1);
  if (!left.length) { G.meta.xp += 120; NE.UI.banner('THE VESPA IS SATED', 'Every gift already awakened. +120 XP.'); G.log('The nectar heals the host completely.', 'good'); return; }
  const A = pick(left); R.abil.push(A.id); p.setAbilities(R.abil); p.infest = G.infestLevel();
  NE.UI.banner('THE VESPA STIRS', A.name + ' — ' + A.desc); G.log('Awakened: ' + A.name + '. ' + A.desc, 'good'); G.log('The host\'s body shifts. Something new grows.', 'sys');
  G.autosave();
};
G.hivePulse = function (p) {
  if (!p.abil || !p.abil.includes('pulse')) return; if (p.pulseCD > 0) return G.toast('Hive Pulse recharging (' + Math.ceil(p.pulseCD) + 's)');
  p.pulseCD = 20; NE.Audio.play('pulse'); G.shake(4); G.pulseFx = { x: p.x, y: p.cy, t: 0 };
  for (const a of G.actors) { if (a === p || !a.alive || a.town || a.isRemote) continue; const d = NE.dist(a.x, a.cy, p.x, p.cy); if (d > 70) continue; const k = 1 - d / 70; a.vx += Math.sign(a.x - p.x) * 220 * k; a.vy -= 120 * k; a.anat.painSpike += 40 * k; if (a.D) { a.state = 'flee'; a.target = p; } if (a.isPuppet && G.net) G.net.send({ t: 'push', id: a.nid, vx: Math.sign(a.x - p.x) * 220 * k, vy: -120 * k }); }
  G.phys.impulse(p.x, p.cy, 70, 700);
};

// ---------- death: the Vespa bursts out for 10 seconds ----------
G.startBurst = function (p) {
  G.state = 'burst'; const g = Object.create(NE.Actor.prototype); Object.assign(g, { g: G, x: p.x, y: p.y - 1, vx: 0, vy: -140, w: 7, h: 6, onGround: false, dropT: 0, climbing: false, t: 10, cd: 0, lashT: 0, tgt: null, kills: 0, facing: p.facing, wob: 0 });
  G.goop = g; G.sayCD = 0; G.say(pick(NE.MONO.burst)); NE.Audio.play('burst'); G.shake(6); NE.Audio.music('burst');
  for (let i = 0; i < 50; i++) G.addP(p.x, p.cy, rf(-90, 90), rf(-120, 10), rf(0.6, 1.5), pick(['#ffc21a', '#e09010', '#ffe070']), 'goo');
  NE.UI.banner('THE VESPA ERUPTS', 'Ten seconds. Take them with you. [LMB] lash  •  climb walls');
  for (const a of G.actors) if (a.alive && a.D && NE.dist(a.x, a.y, p.x, p.y) < 90 && chance(0.5)) { a.state = 'flee'; a.target = p; }
  if (G.net && G.net.on) G.net.send({ t: 'burst' });
};
G.goopUpdate = function (dt) {
  const g = G.goop; const K = G.keys; const block = NE.UI.modalOpen();
  const L = !block && (K.KeyA || K.ArrowLeft), Rr = !block && (K.KeyD || K.ArrowRight), U = !block && (K.KeyW || K.ArrowUp || K.Space);
  const mx = (Rr ? 1 : 0) - (L ? 1 : 0); if (mx) g.facing = mx;
  g.vx = lerp(g.vx, mx * 105, Math.min(1, dt * 9));
  if (U && g.onGround) { g.vy = -250; g.onGround = false; NE.Audio.play('squelch', 0.6); }
  g.vy += NE.GRAV * dt; if (g.vy > 400) g.vy = 400;
  g.bumped = 0; g.x += g.vx * dt; g.collideX();
  if (g.bumped && mx === g.bumped && U) g.vy = -90; // sticky goo climbs walls
  const py = g.y; g.y += g.vy * dt; g.collideY(py, false);
  g.t -= dt; g.cd = Math.max(0, g.cd - dt); g.lashT = Math.max(0, g.lashT - dt); g.wob += dt;
  if (Math.random() < dt * 14) G.addP(g.x + rf(-3, 3), g.y - 2, rf(-15, 15), rf(-20, 5), rf(0.4, 0.9), pick(['#ffc21a', '#d08a10']), 'goo');
  if (G.mouse.l && g.cd <= 0) G.goopLash();
  if (g.t <= 0) { G.goop = null; G.state = 'dying'; G.dieT = 2.4; NE.Audio.play('death'); for (let i = 0; i < 30; i++) G.addP(g.x, g.y - 3, rf(-50, 50), rf(-70, 0), rf(0.6, 1.2), '#a07010', 'goo'); G.log('The Vespa dissolves into the rock.' + (g.kills ? ' It took ' + g.kills + ' with it.' : ''), 'bad'); if (G.net && G.net.on) G.net.send({ t: 'burstend' }); }
};
G.goopLash = function () {
  const g = G.goop; if (!g || g.cd > 0) return; g.cd = 0.32; g.lashT = 0.18; const m = G.mouse; let dx = m.wx - g.x, dy = m.wy - (g.y - 3); const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L; const reach = 38;
  g.tgt = { x: g.x + dx * reach, y: g.y - 3 + dy * reach }; NE.Audio.play('slash'); NE.Audio.play('squelch', 0.5);
  for (const a of G.actors) {
    if (!a.alive || a.isPlayer || a.isRemote) continue; const px = a.x - g.x, py = a.cy - (g.y - 3); const along = px * dx + py * dy; if (along < -2 || along > reach + 3) continue; const perp = Math.abs(px * dy - py * dx); if (perp > 7) continue;
    const part = pick(['torso', 'torso', 'head', 'larm', 'rarm', 'lleg', 'rleg']); const wasAlive = a.alive;
    a.hurt(part, rf(30, 44), 'sharp', 'The Vespa', { x: dx, y: dy }); a.vx += dx * 160; a.vy -= 60; if (a.onAggro) a.onAggro(G.player);
    for (let i = 0; i < 8; i++) G.addP(a.x, a.cy, dx * rf(20, 70), rf(-50, 10), 0.8, '#d8a020', 'goo');
    if (a.anat.dead && wasAlive) g.kills++; G.shake(2);
  }
  G.phys.impulse(g.tgt.x, g.tgt.y, 14, 300);
};
const goopCol = ['#ffc21a', '#ffd84a', '#e8a010'];
G.drawGoop = function (ctx) {
  const g = G.goop; const x = Math.round(g.x), y = Math.round(g.y); const w = g.wob;
  // tendrils
  for (let i = 0; i < 6; i++) { const base = -Math.PI / 2 + (i - 2.5) * 0.55 + Math.sin(w * 3 + i) * 0.25; const len = 7 + Math.sin(w * 5 + i * 2) * 3; let px = x, py = y - 3; for (let k = 1; k <= len; k++) { const a = base + Math.sin(w * 6 + i + k * 0.5) * 0.4; px += Math.cos(a); py += Math.sin(a); ctx.fillStyle = k > len - 2 ? '#fff0a0' : goopCol[(i + k) % 3]; ctx.fillRect(Math.round(px), Math.round(py), 1, 1); } }
  if (g.lashT > 0 && g.tgt) { const k = g.lashT / 0.18; const tx = lerp(g.tgt.x, x, 1 - k), ty = lerp(g.tgt.y, y - 3, 1 - k); NE.pline(ctx, x, y - 3, tx, ty, 2, '#ffc21a'); NE.pline(ctx, x, y - 3, tx, ty, 1, '#fff0a0'); }
  // body: pulsing blob with bee stripes
  const r = 4 + Math.sin(w * 7) * 0.6;
  for (let j = -6; j <= 0; j++) for (let i = -5; i <= 5; i++) { const d = (i / (r + 1)) ** 2 + ((j + 3) / 3.4) ** 2; if (d > 1) continue; ctx.fillStyle = (Math.floor((i + 8 + Math.sin(w * 4)) / 2.5) % 2) ? '#3a2408' : goopCol[(i + j + 12) % 3]; ctx.fillRect(x + i, y + j, 1, 1); }
  ctx.fillStyle = '#fff6c0'; ctx.fillRect(x + g.facing * 2, y - 4, 1, 1); ctx.fillRect(x + g.facing * 2 - 2, y - 4, 1, 1);
};
G.drawGoopGlow = function (ctx) {
  const g = G.goop; ctx.fillStyle = '#fff1a0'; ctx.fillRect(Math.round(g.x) + g.facing * 2, Math.round(g.y) - 4, 1, 1); ctx.fillRect(Math.round(g.x) + g.facing * 2 - 2, Math.round(g.y) - 4, 1, 1);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.font = 'bold 16px "Pixelify Sans", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = g.t < 3 ? (Math.sin(G.t * 12) > 0 ? '#ff6040' : '#ffd040') : '#ffd040'; ctx.fillText(Math.max(0, g.t).toFixed(1), NE.VW / 2, 30); ctx.restore();
};

// ---------- co-op: the Vespa drifts to a new host near your partner ----------
G.startWisp = function () {
  const p = G.player; G.state = 'run'; G.wisp = { x: p.x, y: p.y - 6, t: 40 };
  G.dyn.push({ type: 'container', ct: 'corpse', actor: p, x: p.x, y: p.y, label: p.surv.name + ' (your old host)', act: 'search', items: p.inv.items.slice(), searched: true });
  p.inv.items = []; const M = G.meta; const s = M.survivor; M.cemetery.unshift({ name: s.name, occ: NE.OCCUPATIONS.find(o => o.id === s.occ).name, age: s.age, depth: Math.round(NE.depthOfY(p.y)), cause: p.anat.cause, time: Math.round(G.run.t), kills: G.run.kills, extracted: false, date: new Date().toLocaleDateString(), look: s.look, abil: (G.run.abil || []).slice() });
  G.log('Your host is gone. The Vespa drifts toward your partner, looking for new flesh (40s).', 'sys'); NE.UI.banner('HOST LOST', 'Drift to your partner. A new host will be found.'); G.musicFor();
};
G.wispUpdate = function (dt) {
  const w = G.wisp, q = G.net && G.net.peer; w.t -= dt; const tx = q ? q.x - 10 : w.x, ty = q ? q.y - 16 : w.y;
  w.x = lerp(w.x, tx, Math.min(1, dt * 1.5)); w.y = lerp(w.y, ty + Math.sin(G.t * 2) * 4, Math.min(1, dt * 1.5)); G.addP(w.x, w.y, rf(-4, 4), rf(-4, 4), 0.8, pick([GOLD, '#ffb020']), 'glow', 0);
  if (w.t <= 0 || (q && !q.alive && w.t < 35)) G.rehost();
};
G.drawWisp = function (ctx) { const w = G.wisp; const x = Math.round(w.x), y = Math.round(w.y); for (let i = -2; i <= 2; i++) { ctx.fillStyle = i % 2 ? '#3a2408' : GOLD; ctx.fillRect(x + i, y - 1, 1, 3); } ctx.fillStyle = 'rgba(255,220,80,0.4)'; ctx.fillRect(x - 3, y - 2, 7, 5); ctx.fillStyle = '#fff6c0'; ctx.fillRect(x + 1, y, 1, 1); };
G.rehost = function () {
  const w = G.wisp; G.wisp = null; const old = G.player; const M = G.meta; M.survivor = NE.makeSurvivor(); const s = M.survivor;
  const np = new NE.Player(G, w.x, w.y, s, M); G.actors = G.actors.filter(a => a !== old); old.isPlayer = false; G.actors.unshift(np); G.player = np;
  np.setAbilities(G.run.abil || []); np.infest = G.infestLevel(); np.inv.add('rag', 2); np.inv.add('water', 1);
  // drop into a safe spot
  const W = G.world; let tries = 0; while (W.solidAt(np.x, np.y - 4) && tries++ < 30) np.y -= T;
  for (const q of np.rag.pts) { q.x += 0; q.ox = q.x; q.oy = q.y; }
  NE.UI.showRun(); NE.UI.banner('NEW HOST', s.name + ', ' + s.age + ' — wandered too close.'); G.log('The Vespa takes ' + s.name + '. Their eyes turn gold.', 'good'); NE.Audio.play('nectar');
  if (G.net && G.net.on) G.net.sendHello(); G.musicFor(); G.autosave();
};

// ---------- town: rest at the inn ----------
G.rest = function () {
  const p = G.player, A = p.anat; if (G.env.threat) return G.toast('You can\'t rest with enemies nearby.');
  NE.UI.fade(() => {
    A.stam = A.stamMax; A.stress = 0; A.pain *= 0.3; A.hunger = Math.max(0, A.hunger - 12); A.thirst = Math.max(0, A.thirst - 15); A.cons = 100; A.uncon = false;
    for (const k of NE.PARTS) { const P = A.parts[k]; P.hp = Math.min(P.max, P.hp + P.max * 0.4); for (const w of P.wounds) if (!w.closed && w.bleed < 0.6 && !w.bullet && w.t !== 'art') { w.closed = true; w.bleed = 0; } }
    G.run.t += 90; G.autosave(); G.toast('You sleep a few hours. Progress saved.'); NE.Audio.play('ding');
  });
};
})(window.NE);
