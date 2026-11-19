// Nectar's End — the Vespa: eye glow & trail, relic nectar abilities, hive pulse, death burst, co-op re-hosting, town rest, ambient life
(function (NE) {
'use strict';
const { ri, rf, pick, chance, clamp, lerp } = NE; const T = NE.T;
const G = NE.G;
const GOLD = '#ffd23a';

// ---------- glowing eyes + fading trail ----------
G.eyePos = function (a) { const h = a.rag.pts[0]; const hx = Math.round(h.x), hy = Math.round(h.y); return { x: a.facing > 0 ? hx + 1 : hx - 2, y: hy - 1 }; };
G.trail = function (a, dt) {
  if (!a.alive || !a.vespa) return; const e = G.eyePos(a); const ink = a.infest || 0.2;
  if (!a._le) a._le = e; const moved = Math.hypot(e.x - a._le.x, e.y - a._le.y);
  if (moved > 0.6 || Math.random() < dt * 2) { G.addP(e.x, e.y, rf(-2, 2), rf(-3, 1), 0.25 + ink * 0.9, a.vglow || (ink > 0.6 ? '#ffb020' : GOLD), 'glow', 0); a._le = e; }
};
G.vespaTick = function (p, dt) {
  G.trail(p, dt); if (G.net && G.net.peer) G.trail(G.net.peer, dt);
  p.pulseCD = Math.max(0, (p.pulseCD || 0) - dt);
  if (p.stats.heart) p.anat.bpm = Math.max(p.anat.bpm, 88);
  if (p.abil && p.abil.includes('swarm') && p.alive) { p.swarmT = (p.swarmT == null ? 4 : p.swarmT) - dt; if (p.swarmT <= 0) { const e = G.actors.filter(a => a.alive && a.D && NE.dist(a.x, a.y, p.x, p.y) < 80).sort((a, b) => NE.dist(a.x, a.y, p.x, p.y) - NE.dist(b.x, b.y, p.x, p.y))[0];
      if (e) { p.swarmT = 10; G.drones = G.drones || []; G.drones.push({ x: p.x, y: p.cy, tg: e, t: 0 }); NE.Audio.play('latch', 0.4); } else p.swarmT = 1; } }
  if (G.drones) { for (const d of G.drones) { d.t += dt; const e = d.tg; if (!e || !e.alive) { d.dead = true; continue; } const dx = e.x - d.x, dy = e.cy - d.y, L = Math.hypot(dx, dy); d.x += dx / L * 160 * dt + Math.sin(d.t * 30) * 0.6; d.y += dy / L * 160 * dt + Math.cos(d.t * 25) * 0.6; G.addP(d.x, d.y, 0, 0, 0.25, p.vglow || '#ffd040', 'glow', 0);
      if (L < 5) { d.dead = true; e.hurt(pick(['head', 'torso', 'larm', 'rarm']), 7, 'sharp', 'Drone swarm', { x: dx / L, y: dy / L }); e.stagger = Math.max(e.stagger || 0, 0.3); NE.Audio.play('slash', 0.4); if (e.onAggro) e.onAggro(p); } if (d.t > 3) d.dead = true; } G.drones = G.drones.filter(d => !d.dead); }
  if (G.nectarFx) { const F = G.nectarFx; F.t += dt; if (F.t > 1.6) G.nectarFx = null; else if (p.alive) { const e = G.eyePos(p); for (let i = 0; i < 3; i++) { const a = rf(0, Math.PI * 2), r = 28 * (1 - F.t / 1.6) + rf(0, 6); G.addP(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, -Math.cos(a) * r * 2.2, -Math.sin(a) * r * 2.2, 0.35, pick([F.col, '#fff6c0', '#ffd040']), 'glow', 0); } p.crouch = F.t < 1.2; } }
  // relic flowers hum louder as you get close
  { G.relicHum = (G.relicHum || 0) - dt; if (G.relicHum <= 0 && G.world && !G.world.lobby && p.alive) { G.relicHum = 1.4; const fl = G.curFloor(); let best = 1e9; for (const f of [fl, G.world.floors[fl.f + 1], G.world.floors[fl.f - 1]]) if (f) for (const o of f.objs) if (o.type === 'relic') best = Math.min(best, NE.dist(o.x, o.y, p.x, p.y)); if (best < 160) { NE.Audio.play('relichum', clamp(1 - best / 160, 0.08, 1)); G.relicHum = 0.9 + best / 160 * 1.6; } } }
  G.flashT = Math.max(0, (G.flashT || 0) - dt); if (G.burstFx) { G.burstFx.t -= dt; if (G.burstFx.t <= 0) G.burstFx = null; }
};
G.drawGlow = function (ctx) {
  for (const q of G.parts) { if (q.kind !== 'glow') continue; const k = q.life / q.max; ctx.globalAlpha = k * 0.85; ctx.fillStyle = q.col; ctx.fillRect(Math.round(q.x), Math.round(q.y), 1, 1); if (k > 0.75) { ctx.globalAlpha = k * 0.25; ctx.fillRect(Math.round(q.x) - 1, Math.round(q.y), 3, 1); } }
  ctx.globalAlpha = 1;
  // the Vespa's eyes cut through any darkness
  const eyes = a => { if (!a || !a.alive || !a.vespa) return; const e = G.eyePos(a); ctx.fillStyle = (a.vglow || '#ffc828') + '5a'; ctx.fillRect(e.x - 1, e.y - 1, 3, 3); ctx.fillStyle = a.vglow ? NE.shade(a.vglow, 1.3) : '#fff1a0'; ctx.fillRect(e.x, e.y, 1, 1); };
  eyes(G.player); if (G.net && G.net.peer) eyes(G.net.peer);
  if (G.player && G.player.abil && G.player.abil.includes('eyes')) for (const a of G.actors) if (a.alive && !a.vespa && !a.town && a.D && Math.abs(a.y - G.player.y) < 200) { const e = G.eyePos(a); ctx.fillStyle = 'rgba(255,60,40,' + (0.6 + 0.3 * Math.sin(G.t * 5 + a.x)) + ')'; ctx.fillRect(e.x, e.y, 1, 1); }
  for (const q of G.amb) if (q.glow) { ctx.globalAlpha = q.a * (0.55 + 0.45 * Math.sin(G.t * q.tw + q.ph)); ctx.fillStyle = q.col; ctx.fillRect(Math.round(q.x), Math.round(q.y), 1, 1); }
  ctx.globalAlpha = 1;
  if (G.wisp && !G.minion) G.drawWisp(ctx);
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
G.mutateVariant = function (p, src) {
  const sec = NE.VARIANTS.filter(v => v.tier === 'secret'); const v = src === 'jelly' && chance(0.5) ? NE.variantOf(pick(['violet', 'onyx', 'tempest', 'nurse', 'solar', 'abyssal', 'phoenix'])) : pick(sec);
  p.surv.variant = v.id; p.surv.look.veye = v.eye; p.surv.look.vglow = v.glow; p.vglow = v.glow; const ns = NE.computeStats(G.meta, p.surv); NE.applyVariant(ns, v.id); Object.assign(p.stats, ns);
  G.flashT = 1.4; G.burstFx = { x: p.x, y: p.cy, t: 0.8, col: v.glow }; NE.Audio.play('nectar'); NE.Audio.play('screech', 0.5); if (p.portrait) p.portrait.dirty = true;
  const T2 = NE.VTIERS.find(t => t.id === v.tier); NE.UI.banner('THE BROOD SHIFTS', v.name + ' (' + T2.name + ') — ' + v.desc); G.log('Your Vespa mutates into ' + v.name + ' [' + T2.name + ']: ' + v.desc, 'good');
};
G.finishRelic = function (o) {
  const p = G.player; if (chance(0.07)) setTimeout(() => G.mutateVariant(p, 'relic'), 600); o.type = 'dead'; o.act = null; for (let i = 0; i < 26; i++) G.addP(o.x, o.y - 10, rf(-40, 40), rf(-70, 0), rf(0.6, 1.4), pick(['#ffd040', '#fff0a0', '#ffb020']), 'glow', 0.2);
  if (G.net && G.net.on) G.net.send({ t: 'objdead', x: o.x, y: o.y });
  const left = p.inv.add('nectar', 1); if (left) G.dropEntry({ id: 'nectar', n: 1 });
  NE.UI.dialog('Relic Nectar', 'Thick, golden, warm as blood. The Vespa inside ' + p.surv.first + ' <b>screams</b> for it.', [{ label: 'Drink it now', fn: () => { const e = p.inv.find('nectar'); if (e) NE.consume(p, e); } }, { label: 'Save it for later', hint: 'Drink it from your inventory any time' }]);
};
G.drinkNectar = function (p) {
  const R = G.run; if (!R) return; R.abil = R.abil || []; G.meta.nectars = (G.meta.nectars || 0) + 1;
  const pow = NE.variantOf(p.surv.variant).pow || []; const left = NE.ABILITIES.filter(a => (!a.strain || pow.includes(a.id)) && !R.abil.includes(a.id));
  p.anat.blood = Math.min(5000, p.anat.blood + 600); p.anat.pain *= 0.4; p.anat.stam = p.anat.stamMax; p.anat.infection *= 0.5; for (const k of NE.PARTS) p.anat.parts[k].hp = Math.min(p.anat.parts[k].max, p.anat.parts[k].hp + 25);
  G.flashT = 1.2; NE.Audio.play('nectar'); NE.Audio.play('respawn', 0.6); G.shake(3); G.sayCD = 0; G.say(pick(NE.MONO.nectar)); G.nectarFx = { t: 0, col: p.vglow || '#ffd040' }; G.slowmo = 0.9;
  for (let i = 0; i < 40; i++) G.addP(p.x, p.cy, rf(-60, 60), rf(-80, 20), rf(0.6, 1.6), pick(['#ffd040', '#fff0a0', '#ffb020']), 'glow', 0.1);
  if (!left.length) { G.meta.xp += 120; NE.UI.banner('THE VESPA IS SATED', 'Every gift already awakened. +120 XP.'); G.log('The nectar heals the host completely.', 'good'); return; }
  const A = pick(left); R.abil.push(A.id); p.setAbilities(R.abil); p.infest = G.infestLevel();
  NE.UI.banner(A.strain ? 'STRAIN GIFT AWAKENED' : 'THE VESPA STIRS', A.name + ' — ' + A.desc); G.log('Awakened: ' + A.name + '. ' + A.desc, 'good'); G.log('The host\'s body shifts. Something new grows.', 'sys');
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
  G.goop = g; G.sayCD = 0; G.say(pick(NE.MONO.burst)); NE.Audio.play('screech'); NE.Audio.play('burst'); G.shake(9); NE.Audio.music('burst');
  // rupture: blinding light, a ring of gore and glowing ichor
  const vc = p.vglow || '#ffc21a'; G.flashT = 1.1; G.burstFx = { x: p.x, y: p.cy, t: 1, col: vc }; G.slowmo = 0.35;
  for (let i = 0; i < 70; i++) { const a = i / 70 * Math.PI * 2; const sp = rf(80, 220); G.addP(p.x, p.cy, Math.cos(a) * sp, Math.sin(a) * sp - 40, rf(0.6, 1.5), pick([vc, '#ffc21a', '#e09010', '#fff6c0']), i % 3 ? 'goo' : 'glow', i % 3 ? undefined : 0); }
  if (NE.Combat) NE.Combat.spray(p.x, p.cy, 0, -1, 30);
  NE.UI.banner('THE VESPA ERUPTS', 'Ten seconds. [LMB] lash  •  [E] SWALLOW someone close for big points  •  climb walls');
  for (const a of G.actors) if (a.alive && a.D && NE.dist(a.x, a.y, p.x, p.y) < 90 && chance(0.5)) { a.state = 'flee'; a.target = p; }
  if (G.net && G.net.on) G.net.send({ t: 'burst' });
};
G.goopUpdate = function (dt) {
  const g = G.goop; const K = G.keys; const block = NE.UI.modalOpen();
  const L = !block && G.kd('left'), Rr = !block && G.kd('right'), U = !block && (G.kd('up') || G.kd('jump'));
  const mx = (Rr ? 1 : 0) - (L ? 1 : 0); if (mx) g.facing = mx;
  g.vx = lerp(g.vx, mx * 105, Math.min(1, dt * 9));
  if (U && g.onGround) { g.vy = -250; g.onGround = false; NE.Audio.play('squelch', 0.6); }
  g.vy += NE.GRAV * dt; if (g.vy > 400) g.vy = 400;
  g.bumped = 0; g.x += g.vx * dt; g.collideX();
  if (g.bumped && mx === g.bumped && U) g.vy = -90; // sticky goo climbs walls
  const py = g.y; g.y += g.vy * dt; g.collideY(py, false);
  g.t -= dt; g.cd = Math.max(0, g.cd - dt); g.lashT = Math.max(0, g.lashT - dt); g.wob += dt;
  if (Math.random() < dt * 14) G.addP(g.x + rf(-3, 3), g.y - 2, rf(-15, 15), rf(-20, 5), rf(0.4, 0.9), pick(['#ffc21a', '#d08a10']), 'goo');
  // swallow: press [E] on anyone close — the Vespa engulfs them whole for big points (the weaker they are, the faster it goes)
  g.sw = g.sw || null; const eKey = !block && G.kd('interact');
  if (!g.sw) { let best = null, bd = 16; for (const a of G.actors) { if (!a.alive || a.isPlayer || a.isRemote || a.town || a.gone) continue; const d = Math.hypot(a.x - g.x, a.cy - (g.y - 3)); if (d < bd) { bd = d; best = a; } }
    g.swTarget = best; if (best && eKey && !g._eh) { const A = best.anat; const hpk = (A.parts.torso.hp / A.parts.torso.max + A.parts.head.hp / A.parts.head.max) / 2; g.sw = { a: best, t: 0, dur: clamp(0.5 + hpk * 0.9 * (best.D && best.D.hpMul || 1), 0.45, 1.6) }; best.stagger = 3; if (best.onAggro) best.onAggro(G.player); NE.Audio.play('latch'); NE.Audio.play('squelch', 1); G.shake(2); } }
  g._eh = eKey;
  if (g.sw) { const S = g.sw, a = S.a; if (!a.alive && !a.anat.dead) { g.sw = null; } else { S.t += dt; a.stagger = Math.max(a.stagger || 0, 0.4); a.vx = lerp(a.vx, (g.x - a.x) * 8, 0.3); g.vx *= 0.5; g.facing = a.x > g.x ? 1 : -1;
      if (Math.random() < dt * 30) G.addP(a.x + rf(-3, 3), a.cy + rf(-6, 6), rf(-20, 20), rf(-30, 10), 0.5, G.player.vglow || '#ffc21a', 'goo'); g.lashT = 0.1; g.tgt = { x: a.x + rf(-2, 2), y: a.cy + rf(-4, 4) };
      if (S.t >= S.dur) { const pts = Math.round(40 * (NE.THREAT[a.type] || 1)); g.sw = null; g.eaten = (g.eaten || 0) + 1; g.kills++; G.run.vkills = (G.run.vkills || 0) + 1; G.run.swallowXP = (G.run.swallowXP || 0) + pts; G.run.killXP = (G.run.killXP || 0) + pts;
        if (a.isPuppet) { a.hurt('head', 900, 'sharp', 'The Vespa'); a.hurt('torso', 900, 'sharp', 'The Vespa'); } else if (a.alive) { a.anat.cause = 'Swallowed by the Vespa'; G.onEnemyDeath ? (a.D ? G.onEnemyDeath(a, 'Swallowed by the Vespa') : a.die('Swallowed by the Vespa')) : a.die('Swallowed'); }
        a.hidden = true; a.gone = true; if (a.rag) { a.rag.remove = true; } G.dyn = G.dyn.filter(o => o.actor !== a); NE.Audio.play('gobble'); NE.Audio.play('gulp', 0.8); G.shake(4); G.slowmo = 0.2;
        for (let i = 0; i < 24; i++) G.addP(g.x, g.y - 3, rf(-70, 70), rf(-90, 10), rf(0.4, 0.9), pick(['#ffc21a', '#d08a10', '#7a0c0c']), 'goo');
        g.t = Math.min(14, g.t + 1.5); G.toast('SWALLOWED! +' + pts + ' XP  (+1.5s)'); } } }
  if (G.mouse.l && g.cd <= 0 && !g.sw) G.goopLash();
  if (g.t <= 0) { G.domText('burst-t', null); G.goop = null; G.state = 'dying'; G.dieT = 2.4; NE.Audio.play('retract'); NE.Audio.play('death'); G.burstFx = { x: g.x, y: g.y - 3, t: 0.5, col: '#a07010' }; for (let i = 0; i < 30; i++) G.addP(g.x, g.y - 3, rf(-50, 50), rf(-70, 0), rf(0.6, 1.2), '#a07010', 'goo'); G.log('The Vespa dissolves into the rock.' + (g.kills ? ' It took ' + g.kills + ' with it.' : ''), 'bad'); if (G.net && G.net.on) G.net.send({ t: 'burstend' }); }
};
G.goopLash = function () {
  const g = G.goop; if (!g || g.cd > 0) return; g.cd = 0.32; g.lashT = 0.18; const m = G.mouse; let dx = m.wx - g.x, dy = m.wy - (g.y - 3); const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L; const reach = 38;
  g.tgt = { x: g.x + dx * reach, y: g.y - 3 + dy * reach }; NE.Audio.play('slash'); NE.Audio.play('squelch', 0.5);
  for (const a of G.actors) {
    if (!a.alive || a.isPlayer || a.isRemote) continue; const px = a.x - g.x, py = a.cy - (g.y - 3); const along = px * dx + py * dy; if (along < -2 || along > reach + 3) continue; const perp = Math.abs(px * dy - py * dx); if (perp > 7) continue;
    const part = pick(['torso', 'torso', 'head', 'larm', 'rarm', 'lleg', 'rleg']); const wasAlive = a.alive;
    a.hurt(part, rf(30, 44), 'sharp', 'The Vespa', { x: dx, y: dy }); a.vx += dx * 160; a.vy -= 60; if (a.onAggro) a.onAggro(G.player);
    for (let i = 0; i < 8; i++) G.addP(a.x, a.cy, dx * rf(20, 70), rf(-50, 10), 0.8, '#d8a020', 'goo');
    if (a.anat.dead && wasAlive) { g.kills++; G.run.vkills = (G.run.vkills || 0) + 1; G.toast('+35 XP — Vespa kill'); } G.shake(2);
  }
  G.phys.impulse(g.tgt.x, g.tgt.y, 14, 300);
};
const goopCol = ['#ffc21a', '#ffd84a', '#e8a010'];
G.drawGoop = function (ctx) {
  { const g0 = G.goop, a = g0 && !g0.sw && g0.swTarget; if (a && a.alive) { const k = 0.5 + 0.5 * Math.sin(G.t * 10); ctx.strokeStyle = 'rgba(255,200,40,' + (0.4 + k * 0.5) + ')'; ctx.lineWidth = 1; ctx.strokeRect(Math.round(a.x) - 5.5, Math.round(a.y - a.h) - 2.5, 11, a.h + 3); ctx.fillStyle = '#ffd23a'; ctx.fillRect(Math.round(a.x) - 1, Math.round(a.y - a.h) - 7 - Math.round(k), 3, 3); ctx.fillStyle = '#2a1a04'; ctx.fillRect(Math.round(a.x), Math.round(a.y - a.h) - 6 - Math.round(k), 1, 1); } }
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
  G.domText('burst-t', Math.max(0, g.t).toFixed(1), 0.06, 'big' + (g.t < 3 && Math.sin(G.t * 12) > 0 ? ' hot' : ''));
};

// ---------- run intro: the Vespa finds its host ----------
// A spark of hive-light falls down the shaft, circles the dazed caver, and pours in through the eyes.
G.startInfest = function () {
  const p = G.player; if (!p) return; const v = NE.variantOf(p.surv.variant); setTimeout(() => { if (G.infest) NE.UI.hideHUD(); }, 0);
  G.infest = { t: 0, x: p.x + 60, y: p.y - 120, col: v.glow, v, trail: [], done: false };
  p.vespa = false; p.anat.stam = Math.min(p.anat.stam, 40); NE.Audio.play('chime', 0.6);
};
G.hideCine = function () { const el = document.getElementById('cine'); if (el) el.classList.add('hide'); };
G.skipInfest = function () { const I = G.infest; if (!I || I.t > 4.6) return; I.t = 4.6; };
G.infestUpdate = function (dt) {
  const I = G.infest, p = G.player; I.t += dt; const t = I.t; const hx = p.rag.pts[0].x, hy = p.rag.pts[0].y;
  p.crouch = t < 4.2; p.facing = 1;
  let tx, ty;
  if (t < 1.6) { const k = t / 1.6; tx = p.x + 60 - k * 40 + Math.sin(t * 5) * 10; ty = p.y - 120 + k * 90; } // drifting down the shaft
  else if (t < 3.4) { const a = (t - 1.6) * 5.2; const r = 22 - (t - 1.6) * 8; tx = hx + Math.cos(a) * r; ty = hy - 4 + Math.sin(a) * r * 0.6; } // circling, tasting
  else if (t < 3.9) { const k = (t - 3.4) / 0.5; tx = lerp(I.x, hx + 1, k * k); ty = lerp(I.y, hy - 1, k * k); if (!I.dove) { I.dove = 1; NE.Audio.play('screech', 0.55); } } // the dive
  else { tx = hx + 1; ty = hy - 1; if (!I.inside) { I.inside = 1; NE.Audio.play('squelch', 1); NE.Audio.play('respawn'); G.shake(5); G.flashT = 0.7; p.vespa = true; p.vglow = I.v.glow; for (let i = 0; i < 40; i++) G.addP(hx, hy, rf(-70, 70), rf(-90, 20), rf(0.4, 1.1), pick([I.col, '#fff6c0', '#ffd23a']), 'glow', 0.2); } }
  I.x = lerp(I.x, tx, Math.min(1, dt * (t < 3.4 ? 6 : 14))); I.y = lerp(I.y, ty, Math.min(1, dt * (t < 3.4 ? 6 : 14)));
  if (t < 4) { I.trail.push({ x: I.x, y: I.y, a: 1 }); if (I.trail.length > 26) I.trail.shift(); if (Math.random() < dt * 30) G.addP(I.x, I.y, rf(-8, 8), rf(-8, 8), 0.6, I.col, 'glow', 0); }
  for (const q of I.trail) q.a -= dt * 2;
  // host convulses as it takes hold
  if (t > 3.9 && t < 5.2) { for (const q of p.rag.pts) { q.x += rf(-0.6, 0.6); q.y += rf(-0.4, 0.4); } if (Math.random() < dt * 8) NE.Combat && NE.Combat.spray(hx, hy + 2, rf(-1, 1), -0.3, 2); }
  if (t > 5.4 && !I.done) { I.done = true; G.infest = null; G.hideCine(); p.crouch = false; NE.UI.showHUD && NE.UI.showHUD(); const T2 = NE.VTIERS.find(x => x.id === I.v.tier);
    NE.UI.banner(p.surv.first.toUpperCase() + ' IS TAKEN', I.v.name + ' · ' + T2.name + ' strain — ' + I.v.desc); G.log('Vespa strain: ' + I.v.name + ' [' + T2.name + '] — ' + I.v.desc, 'good'); }
};
G.drawInfest = function (ctx) {
  const I = G.infest; if (!I) return; const t = I.t;
  for (const q of I.trail) if (q.a > 0) { ctx.globalAlpha = q.a * 0.6; ctx.fillStyle = I.col; ctx.fillRect(Math.round(q.x), Math.round(q.y), 1, 1); }
  ctx.globalAlpha = 1;
  if (t < 4) { const x = Math.round(I.x), y = Math.round(I.y), pul = Math.sin(t * 12) > 0;
    ctx.fillStyle = I.col + '44'; ctx.fillRect(x - 3, y - 3, 7, 7); ctx.fillStyle = I.col + '88'; ctx.fillRect(x - 2, y - 1, 5, 3); ctx.fillRect(x - 1, y - 2, 3, 5);
    ctx.fillStyle = pul ? '#fff6c0' : I.col; ctx.fillRect(x - 1, y - 1, 3, 3); ctx.fillStyle = '#3a2408'; ctx.fillRect(x - 1, y, 3, 1); // tiny striped spark
    ctx.fillStyle = 'rgba(255,240,180,0.7)'; ctx.fillRect(x - 3 + (pul ? 0 : 1), y - 3, 2, 1); ctx.fillRect(x + 2 - (pul ? 0 : 1), y - 3, 2, 1); } // flickering wings
  // letterbox + caption
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); const k = Math.min(1, t * 2, Math.max(0, (5.4 - t) * 2)); const bar = Math.round(22 * k);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, NE.VW, bar); ctx.fillRect(0, NE.VH - bar, NE.VW, bar);
  ctx.restore(); ctx.globalAlpha = 1;
  // captions are crisp DOM text, not tiny canvas text scaled up
  const cap = t < 1.6 ? 'Something small and bright falls down the shaft...' : t < 3.4 ? 'It circles the caver. Tasting. Choosing.' : t < 4.4 ? 'It pours in through the eyes.' : 'The eyes open.';
  let el = document.getElementById('cine'); if (!el) { el = document.createElement('div'); el.id = 'cine'; el.innerHTML = '<div class="cine-cap"></div><div class="cine-skip">click / space to skip</div>'; document.getElementById('ui').appendChild(el); }
  el.style.opacity = k; el.classList.remove('hide'); const c = el.firstChild; if (c.textContent !== cap) c.textContent = cap;
};

// ---------- co-op: the Vespa drifts to a new host near your partner ----------
G.startWisp = function () {
  const p = G.player; G.state = 'run'; G.wisp = { x: p.x, y: p.y - 6, t: 40 };
  G.dyn.push({ type: 'container', ct: 'corpse', actor: p, x: p.x, y: p.y, label: p.surv.name + ' (your old host)', act: 'search', items: p.inv.items.slice(), searched: true });
  p.inv.items = []; const M = G.meta; const s = M.survivor; M.cemetery.unshift({ name: s.name, occ: NE.OCCUPATIONS.find(o => o.id === s.occ).name, age: s.age, depth: Math.round(NE.depthOfY(p.y)), cause: p.anat.cause, time: Math.round(G.run.t), kills: G.run.kills, extracted: false, date: new Date().toLocaleDateString(), look: s.look, abil: (G.run.abil || []).slice() });
  G.log('Your host is gone. The Vespa drifts toward your partner, looking for new flesh (40s). Your partner can raise your old body as a weak brood minion for you to steer.', 'sys'); NE.UI.banner('HOST LOST', 'Drift to your partner. They can raise your corpse as a minion for you.'); G.musicFor();
};
G.wispUpdate = function (dt) {
  const w = G.wisp, q = G.net && G.net.peer; w.t -= dt; const tx = q ? q.x - 10 : w.x, ty = q ? q.y - 16 : w.y;
  if (G.minion) { G.minionUpdate(dt); if (w.t <= 0) { G.minion = null; G.rehost(); } return; }
  w.x = lerp(w.x, tx, Math.min(1, dt * 1.5)); w.y = lerp(w.y, ty + Math.sin(G.t * 2) * 4, Math.min(1, dt * 1.5)); G.addP(w.x, w.y, rf(-4, 4), rf(-4, 4), 0.8, pick([GOLD, '#ffb020']), 'glow', 0);
  if (w.t <= 0 || (q && !q.alive && w.t < 35)) { G.minion = null; G.rehost(); }
};
G.drawWisp = function (ctx) { const w = G.wisp; const x = Math.round(w.x), y = Math.round(w.y); for (let i = -2; i <= 2; i++) { ctx.fillStyle = i % 2 ? '#3a2408' : GOLD; ctx.fillRect(x + i, y - 1, 1, 3); } ctx.fillStyle = 'rgba(255,220,80,0.4)'; ctx.fillRect(x - 3, y - 2, 7, 5); ctx.fillStyle = '#fff6c0'; ctx.fillRect(x + 1, y, 1, 1); };
G.rehost = function () {
  const w = G.wisp; G.wisp = null; const old = G.player; const M = G.meta; M.survivor = NE.makeSurvivor(); const s = M.survivor;
  const np = new NE.Player(G, w.x, w.y, s, M); G.actors = G.actors.filter(a => a !== old); old.isPlayer = false; G.actors.unshift(np); G.player = np;
  np.setAbilities(G.run.abil || []); np.infest = G.infestLevel(); np.inv.add('rag', 2); np.inv.add('water', 1);
  // drop into a safe spot
  const W = G.world; let tries = 0; while (W.solidAt(np.x, np.y - 4) && tries++ < 30) np.y -= T;
  for (const q of np.rag.pts) { q.x += 0; q.ox = q.x; q.oy = q.y; }
  NE.UI.showRun(); NE.UI.banner('NEW HOST', s.name + ', ' + s.age + ' — wandered too close.'); G.log('The Vespa takes ' + s.name + '. Their eyes turn gold.', 'good'); NE.Audio.play('respawn'); G.flashT = 0.6; for (let i = 0; i < 30; i++) G.addP(np.x, np.cy, rf(-60, 60), rf(-80, 10), rf(0.4, 1), pick(['#ffd23a', '#fff6c0', '#ffb020']), 'glow', 0.2);
  if (G.net && G.net.on) G.net.sendHello(); G.musicFor(); G.autosave();
};

// ---------- co-op: while your Vespa waits for a new host, it can spit out a weak brood minion you steer to help your partner ----------
G.spawnMinion = function (sx, sy) {
  const w = G.wisp; if (!w || G.minion) return; w.t = Math.max(w.t, 30); const m = Object.create(NE.Actor.prototype); Object.assign(m, { g: G, x: sx != null ? sx : w.x, y: sy != null ? sy : w.y + 4, vx: 0, vy: 0, w: 6, h: 5, onGround: false, dropT: 0, climbing: false, hp: 30, cd: 0, bite: 0, facing: 1, ph: 0, hitT: 0 });
  const W = G.world; let k = 0; while (W.solidAt(m.x, m.y - 2) && k++ < 20) m.y -= T;
  G.minion = m; NE.Audio.play('squelch', 0.9); NE.Audio.play('latch', 0.6); for (let i = 0; i < 16; i++) G.addP(m.x, m.y - 3, rf(-40, 40), rf(-60, 0), 0.6, pick(['#ffc21a', '#d08a10']), 'goo');
};
G.minionUpdate = function (dt) {
  const m = G.minion, w = G.wisp; if (!w) { G.minion = null; return; } const block = NE.UI.modalOpen();
  const L = !block && G.kd('left'), Rr = !block && G.kd('right'), U = !block && (G.kd('up') || G.kd('jump')); const mx = (Rr ? 1 : 0) - (L ? 1 : 0); if (mx) m.facing = mx;
  m.vx = lerp(m.vx, mx * 82, Math.min(1, dt * 10)); if (U && m.onGround) { m.vy = -205; m.onGround = false; NE.Audio.play('squelch', 0.4); }
  m.vy += NE.GRAV * dt; if (m.vy > 380) m.vy = 380; m.bumped = 0; m.x += m.vx * dt; m.collideX(); if (m.bumped && mx === m.bumped && U) m.vy = -80;
  const py = m.y; m.y += m.vy * dt; m.collideY(py, false); m.cd = Math.max(0, m.cd - dt); m.bite = Math.max(0, m.bite - dt); m.hitT = Math.max(0, m.hitT - dt); m.ph += dt * (Math.abs(m.vx) > 5 ? 14 : 3);
  if (G.mouse.l && m.cd <= 0) { m.cd = 0.45; m.bite = 0.15; NE.Audio.play('slash', 0.5);
    for (const a of G.actors) { if (!a.alive || a.isPlayer || a.isRemote || a.town || a.isNPC && !a.D) continue; if (Math.abs(a.x - m.x) > 13 || (a.x - m.x) * m.facing < -3 || a.y < m.y - 14 || a.y - a.h > m.y + 2) continue;
      const part = pick(['lleg', 'rleg', 'lleg', 'rleg', 'torso']); const was = a.alive; a.hurt(part, rf(6, 10), 'bite', 'Brood minion', { x: m.facing, y: -0.2 }); a.stagger = Math.max(a.stagger || 0, 0.25); if (a.onAggro && G.net && G.net.peer) a.onAggro(G.net.peer);
      NE.Combat && NE.Combat.spray(a.x, a.y - 4, m.facing, -0.3, 4); if (was && a.anat.dead) { G.run.vkills = (G.run.vkills || 0) + 1; G.toast('+35 XP — minion kill'); } break; } }
  // enemies swat at it
  for (const a of G.actors) { if (!a.alive || !a.D || a.stagger > 0 || NE.dist(a.x, a.y, m.x, m.y) > 14) continue; a.mSwat = (a.mSwat || rf(0.3, 0.9)) - dt; if (a.mSwat <= 0) { a.mSwat = rf(1.1, 1.6); a.facing = Math.sign(m.x - a.x) || 1; NE.Combat && NE.Combat.strike(a); m.hp -= rf(5, 9); m.hitT = 0.15; m.vx += a.facing * 120; m.vy -= 80; NE.Audio.play('hit', 0.6); for (let i = 0; i < 5; i++) G.addP(m.x, m.y - 3, rf(-40, 40), rf(-50, 0), 0.5, '#d8a020', 'goo'); } }
  if (Math.random() < dt * 6) G.addP(m.x + rf(-2, 2), m.y - 1, rf(-8, 8), rf(-10, 0), 0.4, '#ffc21a', 'goo');
  w.x = m.x; w.y = m.y - 3;
  if (m.hp <= 0) { G.minion = null; NE.Audio.play('squelch', 1); for (let i = 0; i < 20; i++) G.addP(m.x, m.y - 3, rf(-60, 60), rf(-80, 0), 0.8, pick(['#ffc21a', '#a07010']), 'goo'); G.toast('Your minion bursts. Your partner can raise your body again.'); }
};
G.drawMinionAt = function (ctx, x, y, f, ph, hit) { x = Math.round(x); y = Math.round(y);
  for (let i = -3; i <= 3; i++) { const hgt = 3 - Math.abs(i) * 0.6 + Math.sin(ph + i) * 0.4; for (let j = 0; j < hgt; j++) { ctx.fillStyle = hit ? '#ffffff' : ((i + 4) % 2 ? '#3a2408' : '#ffc21a'); ctx.fillRect(x + i, y - 1 - j, 1, 1); } }
  ctx.fillStyle = '#fff6c0'; ctx.fillRect(x + f * 2, y - 3, 1, 1); ctx.fillStyle = '#d08a10'; for (let k = 0; k < 3; k++) ctx.fillRect(x - 2 + k * 2 + Math.round(Math.sin(ph * 2 + k)), y, 1, 1); ctx.fillRect(x + f * 4, y - 2, 1, 1); };
G.drawMinion = function (ctx) { const m = G.minion; if (!m) return; G.drawMinionAt(ctx, m.x, m.y, m.facing, m.ph, m.hitT > 0); if (m.bite > 0) { ctx.fillStyle = '#fff0a0'; ctx.fillRect(Math.round(m.x + m.facing * 6), Math.round(m.y - 3), 2, 1); } };

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
