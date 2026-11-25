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
  p.anat.blood = Math.min(NE.BLOOD, p.anat.blood + 480); p.anat.pain *= 0.4; p.anat.stam = p.anat.stamMax; p.anat.infection *= 0.5; for (const k of NE.PARTS) p.anat.parts[k].hp = Math.min(p.anat.parts[k].max, p.anat.parts[k].hp + 25);
  G.flashT = 1.2; NE.Audio.play('nectar'); NE.Audio.play('respawn', 0.6); G.shake(3); G.sayCD = 0; G.say(pick(NE.MONO.nectar)); G.nectarFx = { t: 0, col: p.vglow || '#ffd040' }; G.slowmo = 0.9;
  for (let i = 0; i < 40; i++) G.addP(p.x, p.cy, rf(-60, 60), rf(-80, 20), rf(0.6, 1.6), pick(['#ffd040', '#fff0a0', '#ffb020']), 'glow', 0.1);
  if (!left.length) { G.meta.xp += 120; NE.UI.banner('THE VESPA IS SATED', 'Every gift already awakened. +120 XP.'); G.log('The nectar heals the host completely.', 'good'); return; }
  const A = pick(left); R.abil.push(A.id); p.setAbilities(R.abil); p.infest = G.infestLevel();
  NE.UI.banner(A.strain ? 'STRAIN GIFT AWAKENED' : 'THE VESPA STIRS', A.name + ' — ' + A.desc); G.log('Awakened: ' + A.name + '. ' + A.desc, 'good'); G.log('The host\'s body shifts. Something new grows.', 'sys');
  G.autosave();
};
G.hivePulse = function (p) {
  if (!p.abil || !p.abil.includes('pulse')) return; if (p.pulseCD > 0) return G.toast('Hive Pulse recharging (' + Math.ceil(p.pulseCD) + 's)');
  p.pulseCD = 28; NE.Audio.play('pulse'); G.shake(4); G.pulseFx = { x: p.x, y: p.cy, t: 0 };
  for (const a of G.actors) { if (a === p || !a.alive || a.town || a.isRemote) continue; const d = NE.dist(a.x, a.cy, p.x, p.cy); if (d > 70) continue; const k = 1 - d / 70; a.vx += Math.sign(a.x - p.x) * 220 * k; a.vy -= 120 * k; a.anat.painSpike += 40 * k; if (a.D) { a.state = 'flee'; a.target = p; } if (a.isPuppet && G.net) { G.net.send({ t: 'push', id: a.nid, vx: Math.sign(a.x - p.x) * 220 * k, vy: -120 * k, fl: 1 }); a._kbx = a._kby = 0; } }
  G.phys.impulse(p.x, p.cy, 70, 700);
};

// ---------- death: the Vespa bursts out for 10 seconds ----------
// the Vespa wears its strain's colour
NE.VC = { main: '#ffc21a', mid: '#ffd84a', dark: '#d08a10', light: '#fff0a0', stripe: '#3a2408', rgba: 'rgba(255,200,40,' };
NE.setVespaColours = function (c) { c = c || '#ffc21a'; const h = c.replace('#', ''); const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16); const mix = (k, w) => '#' + [r, g, b].map(v => Math.round(Math.min(255, v * k + 255 * w))).map(v => v.toString(16).padStart(2, '0')).join('');
  NE.VC = { main: c, mid: mix(1, 0.18), dark: mix(0.68, 0), light: mix(0.6, 0.45), stripe: mix(0.22, 0), rgba: 'rgba(' + r + ',' + g + ',' + b + ',' }; };
G.startBurst = function (p) { NE.setVespaColours(p.vglow);
  G.state = 'burst'; const g = Object.create(NE.Actor.prototype); Object.assign(g, { g: G, x: p.x, y: p.y - 1, vx: 0, vy: -140, w: 7, h: 6, onGround: false, dropT: 0, climbing: false, t: 10, cd: 0, lashT: 0, tgt: null, kills: 0, facing: p.facing, wob: 0 });
  g.t += (p.stats && p.stats.vTime) || 0; G.goop = g; G.sayCD = 0; G.say(pick(NE.MONO.burst)); NE.Audio.play('screech'); NE.Audio.play('burst'); G.shake(9); NE.Audio.music('burst');
  // rupture: blinding light, a ring of gore and glowing ichor
  const vc = p.vglow || NE.VC.main; G.flashT = 1.1; G.burstFx = { x: p.x, y: p.cy, t: 1, col: vc }; G.slowmo = 0.35;
  for (let i = 0; i < 70; i++) { const a = i / 70 * Math.PI * 2; const sp = rf(80, 220); G.addP(p.x, p.cy, Math.cos(a) * sp, Math.sin(a) * sp - 40, rf(0.6, 1.5), pick([vc, NE.VC.main, NE.VC.dark, NE.VC.light]), i % 3 ? 'goo' : 'glow', i % 3 ? undefined : 0); }
  if (NE.Combat) NE.Combat.spray(p.x, p.cy, 0, -1, 30);
  NE.UI.banner('THE VESPA ERUPTS', 'Ten seconds. [P] POSSESS a new host  •  [LMB] lash  •  [RMB] grapple  •  [E] swallow  •  climb walls');
  for (const a of G.actors) if (a.alive && a.D && NE.dist(a.x, a.y, p.x, p.y) < 90 && chance(0.5)) { a.state = 'flee'; a.target = p; }
  if (G.net && G.net.on) G.net.send({ t: 'burst' });
};
G.goopUpdate = function (dt) {
  const g = G.goop; const K = G.keys; const block = NE.UI.modalOpen();
  const L = !block && G.kd('left'), Rr = !block && G.kd('right'), U = !block && (G.kd('up') || G.kd('jump'));
  const mx = (Rr ? 1 : 0) - (L ? 1 : 0); if (mx) g.facing = mx;
  g.vx = lerp(g.vx, mx * 105 * (G.player.stats.vSpeed || 1), Math.min(1, dt * 9));
  if (U && g.onGround) { g.vy = -250 * (G.player.stats.vJump || 1); g.onGround = false; NE.Audio.play('squelch', 0.6); }
  g.vy += NE.GRAV * dt; if (g.vy > 400) g.vy = 400;
  g.bumped = 0; g.x += g.vx * dt; g.collideX();
  if (g.bumped && mx === g.bumped && U) g.vy = -90; // sticky goo climbs walls
  const py = g.y; g.y += g.vy * dt; g.collideY(py, false);
  g.t -= dt; g.cd = Math.max(0, g.cd - dt); g.lashT = Math.max(0, g.lashT - dt); g.wob += dt;
  if (Math.random() < dt * 14) G.addP(g.x + rf(-3, 3), g.y - 2, rf(-15, 15), rf(-20, 5), rf(0.4, 0.9), pick([NE.VC.main, NE.VC.dark]), 'goo');
  // swallow: press [E] on anyone close — the Vespa engulfs them whole for big points (the weaker they are, the faster it goes)
  g.sw = g.sw || null; const eKey = !block && G.kd('interact');
  if (!g.sw) { let best = null, bd = 16; for (const a of G.actors) { if (!a.alive || a.isPlayer || a.isRemote || a.town || a.gone) continue; const d = Math.hypot(a.x - g.x, a.cy - (g.y - 3)); if (d < bd) { bd = d; best = a; } }
    g.swTarget = best; if (best && eKey && !g._eh) { const A = best.anat; const hpk = (A.parts.torso.hp / A.parts.torso.max + A.parts.head.hp / A.parts.head.max) / 2; g.sw = { a: best, t: 0, dur: clamp(0.5 + hpk * 0.9 * (best.D && best.D.hpMul || 1), 0.45, 1.6) / (G.player.stats.vSwallow || 1) }; best.stagger = 3; if (best.onAggro) best.onAggro(G.player); NE.Audio.play('latch'); NE.Audio.play('squelch', 1); G.shake(2); } }
  g._eh = eKey;
  if (g.sw) { const S = g.sw, a = S.a; if (!a.alive && !a.anat.dead) { g.sw = null; } else { S.t += dt; a.stagger = Math.max(a.stagger || 0, 0.4); a.vx = lerp(a.vx, (g.x - a.x) * 8, 0.3); g.vx *= 0.5; g.facing = a.x > g.x ? 1 : -1;
      if (Math.random() < dt * 30) G.addP(a.x + rf(-3, 3), a.cy + rf(-6, 6), rf(-20, 20), rf(-30, 10), 0.5, G.player.vglow || NE.VC.main, 'goo'); g.lashT = 0.1; g.tgt = { x: a.x + rf(-2, 2), y: a.cy + rf(-4, 4) };
      if (S.t >= S.dur) { const pts = Math.round(40 * (NE.THREAT[a.type] || 1) * (G.player.stats.vXP || 1)); g.sw = null; g.eaten = (g.eaten || 0) + 1; g.kills++; G.run.vkills = (G.run.vkills || 0) + 1; G.run.swallowXP = (G.run.swallowXP || 0) + pts; G.run.killXP = (G.run.killXP || 0) + pts;
        if (a.isPuppet) { a.hurt('head', 900, 'sharp', 'The Vespa'); a.hurt('torso', 900, 'sharp', 'The Vespa'); } else if (a.alive) { a.anat.cause = 'Swallowed by the Vespa'; G.onEnemyDeath ? (a.D ? G.onEnemyDeath(a, 'Swallowed by the Vespa') : a.die('Swallowed by the Vespa')) : a.die('Swallowed'); }
        a.hidden = true; a.gone = true; if (a.rag) { a.rag.remove = true; } G.dyn = G.dyn.filter(o => o.actor !== a); NE.Audio.play('gobble'); NE.Audio.play('gulp', 0.8); G.shake(4); G.slowmo = 0.2;
        for (let i = 0; i < 24; i++) G.addP(g.x, g.y - 3, rf(-70, 70), rf(-90, 10), rf(0.4, 0.9), pick([NE.VC.main, NE.VC.dark, '#7a0c0c']), 'goo');
        { const st = G.player.stats, add = 1.5 + (st.vSwallowT || 0) + (st.vApex ? 3 : 0); g.t = Math.min(st.vApex ? 30 : 14 + (st.vTime || 0), g.t + add); G.toast('SWALLOWED! +' + pts + ' XP  (+' + add.toFixed(1) + 's)'); } } } }
  if (G.mouse.l && g.cd <= 0 && !g.sw) G.goopLash();
  if (g.t <= 0) { G.domText('burst-t', null); G.goop = null; G.state = 'dying'; G.dieT = 2.4; NE.Audio.play('retract'); NE.Audio.play('death'); G.burstFx = { x: g.x, y: g.y - 3, t: 0.5, col: NE.VC.dark }; for (let i = 0; i < 30; i++) G.addP(g.x, g.y - 3, rf(-50, 50), rf(-70, 0), rf(0.6, 1.2), NE.VC.dark, 'goo'); G.log('The Vespa dissolves into the rock.' + (g.kills ? ' It took ' + g.kills + ' with it.' : ''), 'bad'); if (G.net && G.net.on) G.net.send({ t: 'burstend' }); }
};
G.goopLash = function () {
  const g = G.goop; if (!g || g.cd > 0) return; g.cd = 0.32; g.lashT = 0.18; const m = G.mouse; let dx = m.wx - g.x, dy = m.wy - (g.y - 3); const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L; const reach = 38;
  g.tgt = { x: g.x + dx * reach, y: g.y - 3 + dy * reach }; NE.Audio.play('slash'); NE.Audio.play('squelch', 0.5);
  for (const a of G.actors) {
    if (!a.alive || a.isPlayer || a.isRemote) continue; const px = a.x - g.x, py = a.cy - (g.y - 3); const along = px * dx + py * dy; if (along < -2 || along > reach + 3) continue; const perp = Math.abs(px * dy - py * dx); if (perp > 7) continue;
    const part = pick(['torso', 'torso', 'head', 'larm', 'rarm', 'lleg', 'rleg']); const wasAlive = a.alive;
    a.hurt(part, rf(46, 64) * (G.player.stats.vLash || 1), 'sharp', 'The Vespa', { x: dx, y: dy });
    // the tendril can coil round a neck and tear the head clean off
    if (a.anat && a.anat.parts.head && !a.anat.parts.head.severed && !a.gone && chance((part === 'head' ? 0.45 : 0.14) + (G.player.stats.vDecap || 0))) { NE.Gore.sever(a, 'head', { x: dx, y: -0.6 }); if (a.anat) a.anat.cause = 'Head torn off by the Vespa'; if (a.alive && a.die) { if (a.D && G.onEnemyDeath) G.onEnemyDeath(a, 'Head torn off by the Vespa'); else a.die('Head torn off by the Vespa'); } NE.Audio.play('crack', 1); NE.Audio.play('squelch', 1); G.shake(4); G.slowmo = Math.max(G.slowmo || 0, 0.15); G.toast('DECAPITATED'); } a.vx += dx * 160; a.vy -= 60; if (a.onAggro) a.onAggro(G.player);
    for (let i = 0; i < 8; i++) G.addP(a.x, a.cy, dx * rf(20, 70), rf(-50, 10), 0.8, NE.VC.main, 'goo');
    if (a.anat.dead && wasAlive) { g.kills++; G.run.vkills = (G.run.vkills || 0) + 1; const st = G.player.stats; const xp = Math.round(35 * (st.vXP || 1)); if (st.vXP > 1) G.run.killXP = (G.run.killXP || 0) + (xp - 35); if (st.vApex) g.t = Math.min(30, g.t + 3); G.toast('+' + xp + ' XP — Vespa kill' + (st.vApex ? '  (+3s)' : '')); } G.shake(2);
  }
  G.phys.impulse(g.tgt.x, g.tgt.y, 14, 300);
};
const goopColF = () => [NE.VC.main, NE.VC.mid, NE.VC.dark];
G.drawGoop = function (ctx) {
  { const g0 = G.goop, a = g0 && !g0.sw && g0.swTarget; if (a && a.alive) { const k = 0.5 + 0.5 * Math.sin(G.t * 10); ctx.strokeStyle = NE.VC.rgba + (0.4 + k * 0.5) + ')'; ctx.lineWidth = 1; ctx.strokeRect(Math.round(a.x) - 5.5, Math.round(a.y - a.h) - 2.5, 11, a.h + 3); ctx.fillStyle = NE.VC.main; ctx.fillRect(Math.round(a.x) - 1, Math.round(a.y - a.h) - 7 - Math.round(k), 3, 3); ctx.fillStyle = '#2a1a04'; ctx.fillRect(Math.round(a.x), Math.round(a.y - a.h) - 6 - Math.round(k), 1, 1); } }
  const g = G.goop; const x = Math.round(g.x), y = Math.round(g.y); const w = g.wob;
  if (g.hop && g.hop.ph >= 1) return; // already inside them
  g._eye = NE.drawSlime(ctx, { x: g.x, y: g.y, facing: g.facing, w: g.wob, sx: g.sx || 1, sy: g.sy || 1, gnd: g.onGround, lash: g.lashT > 0, thread: g._gx != null && !g.onGround && g._air < 0.35 ? { x: g._gx, y: g._gy, k: 1 - g._air / 0.35 } : null });
  if (g.lashT > 0 && g.tgt) { const k = g.lashT / 0.18; const tx = lerp(g.tgt.x, x, 1 - k), ty = lerp(g.tgt.y, y - 4, 1 - k); NE.pline(ctx, x, y - 4, tx, ty, 3, NE.VC.dark); NE.pline(ctx, x, y - 4, tx, ty, 2, NE.VC.main); NE.pline(ctx, x, y - 4, tx, ty, 1, NE.VC.light); ctx.fillStyle = NE.VC.main; ctx.fillRect(Math.round(tx) - 1, Math.round(ty) - 1, 3, 3); ctx.fillStyle = NE.VC.light; ctx.fillRect(Math.round(tx), Math.round(ty) - 1, 1, 1); }
};
G.drawGoopGlow = function (ctx) {
  const g = G.goop; ctx.fillStyle = NE.VC.light; ctx.fillRect(Math.round(g.x) + g.facing * 2, Math.round(g.y) - 4, 1, 1); ctx.fillRect(Math.round(g.x) + g.facing * 2 - 2, Math.round(g.y) - 4, 1, 1);
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
  const p = G.player; G.state = 'run'; G.wisp = { x: p.x, y: p.y - 6, t: 1e9 }; G.minionSpent = false; G.domText && G.domText('strug', null);
  G.dyn.push({ type: 'container', ct: 'corpse', actor: p, x: p.x, y: p.y, label: p.surv.name + ' (your old host)', act: 'search', items: p.inv.items.slice(), searched: true });
  p.inv.items = []; const M = G.meta; const s = M.survivor; M.cemetery.unshift({ name: s.name, occ: NE.OCCUPATIONS.find(o => o.id === s.occ).name, age: s.age, depth: Math.round(NE.depthOfY(p.y)), cause: p.anat.cause, time: Math.round(G.run.t), kills: G.run.kills, extracted: false, date: new Date().toLocaleDateString(), look: s.look, abil: (G.run.abil || []).slice() });
  G.log('Your host is dead — there is no coming back in a new body. Your Vespa clings on, watching your partner. They can raise your corpse ONCE as a weak brood minion for you to steer. If it dies, you\'re out for the rest of the run.', 'sys'); NE.UI.banner('HOST LOST', 'Spectating. Your partner can raise your corpse as a brood minion — your last chance to help.'); G.musicFor();
};
G.wispUpdate = function (dt) {
  const w = G.wisp, q = G.net && G.net.peer; w.t -= dt; const tx = q ? q.x - 10 : w.x, ty = q ? q.y - 16 : w.y;
  if (q && !q.alive && !q.goop && !q.wisp) { G.wisp = null; G.minion = null; return G.endRun(false, G.player.anat.cause || 'The whole party fell'); }
  if (G.minion) { G.minionUpdate(dt); return; }
  if (G.minionSpent && q) { w.x = q.x; w.y = q.y - 16; return; }
  w.x = lerp(w.x, tx, Math.min(1, dt * 1.5)); w.y = lerp(w.y, ty + Math.sin(G.t * 2) * 4, Math.min(1, dt * 1.5)); G.addP(w.x, w.y, rf(-4, 4), rf(-4, 4), 0.8, pick([GOLD, '#ffb020']), 'glow', 0);

};
G.drawWisp = function (ctx) { const w = G.wisp; if (G.minionSpent) return; const x = Math.round(w.x), y = Math.round(w.y); for (let i = -2; i <= 2; i++) { ctx.fillStyle = i % 2 ? '#3a2408' : GOLD; ctx.fillRect(x + i, y - 1, 1, 3); } ctx.fillStyle = 'rgba(255,220,80,0.4)'; ctx.fillRect(x - 3, y - 2, 7, 5); ctx.fillStyle = '#fff6c0'; ctx.fillRect(x + 1, y, 1, 1); };
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
  const w = G.wisp; if (!w || G.minion || G.minionSpent) return; const m = Object.create(NE.Actor.prototype); Object.assign(m, { g: G, x: sx != null ? sx : w.x, y: sy != null ? sy : w.y + 4, vx: 0, vy: 0, w: 6, h: 5, onGround: false, dropT: 0, climbing: false, hp: 30, cd: 0, bite: 0, facing: 1, ph: 0, hitT: 0 });
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
  // mend: [E] next to your partner closes their worst wound (20s cooldown)
  m.mendCD = Math.max(0, (m.mendCD || 0) - dt); { const q = G.net && G.net.peer; const near = q && q.alive && Math.abs(q.x - m.x) < 16 && Math.abs(q.y - m.y) < 18; m.canMend = near && m.mendCD <= 0; const e = !block && G.kd('interact');
    if (e && !m._e && near) { if (m.mendCD > 0) G.toast('Mend recovering (' + Math.ceil(m.mendCD) + 's)'); else { m.mendCD = 20; G.net.send({ t: 'mend' }); NE.Audio.play('squelch', 0.6); NE.Audio.play('bandage', 0.6); for (let i = 0; i < 12; i++) G.addP(q.x, q.cy, rf(-20, 20), rf(-30, 0), 0.6, pick(['#ffc21a', '#fff0a0']), 'goo'); G.toast('You seal your partner\'s worst wound with goop.'); } } m._e = e; }
  if (m.hp <= 0) { G.minion = null; G.minionSpent = true; NE.Audio.play('squelch', 1); for (let i = 0; i < 20; i++) G.addP(m.x, m.y - 3, rf(-60, 60), rf(-80, 0), 0.8, pick(['#ffc21a', '#a07010']), 'goo'); G.log('Your minion bursts apart. Your Vespa is spent — you\'re out for the rest of this run.', 'bad'); NE.UI.banner('SPENT', 'Your minion died. Spectating your partner.'); }
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

// ---------- Vespa grapple: right-click fires a tendril into any wall; hold to swing and reel in, let go to fling ----------
(function () { const G = NE.G, T = NE.T;
  const upG = G.goopUpdate; G.goopUpdate = function (dt) { const g = G.goop; const r0 = upG.apply(this, arguments); if (!G.goop || G.goop !== g) return r0;
    const W = G.world, R = G.mouse.r && !NE.UI.modalOpen();
    if (R && !g._rh && !g.hook) { const ox = g.x, oy = g.y - 3; let dx = G.mouse.wx - ox, dy = G.mouse.wy - oy; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
      const reach = 130 * (G.player.stats.vSilk || 1); for (let d = 4; d <= reach; d += 2) { const x = ox + dx * d, y = oy + dy * d; if (W.solid(W.get(Math.floor(x / T), Math.floor(y / T)))) { g.hook = { x, y, len: d }; NE.Audio.play('latch'); NE.Audio.play('squelch', 0.6); for (let i = 0; i < 6; i++) G.addP(x, y, NE.rf(-30, 30), NE.rf(-30, 10), 0.5, NE.VC.main, 'goo'); break; } }
      if (!g.hook) { g.miss = { x: ox + dx * reach, y: oy + dy * reach, t: 0.15 }; NE.Audio.play('whoosh', 0.5); } }
    g._rh = R; if (g.miss) { g.miss.t -= dt; if (g.miss.t <= 0) g.miss = null; }
    if (g.hook && !R) { g.hook = null; g.vy = Math.min(g.vy, g.vy * 1.1); } // let go: keep the swing's momentum
    if (g.hook) { const H = g.hook; H.len = Math.max(8, H.len - dt * 80 * (G.player.stats.vSilk || 1)); const cx = g.x, cy = g.y - 3; let ex = cx - H.x, ey = cy - H.y; const d = Math.hypot(ex, ey) || 1;
      if (d > H.len) { ex /= d; ey /= d; const vr = g.vx * ex + g.vy * ey; if (vr > 0) { g.vx -= vr * ex; g.vy -= vr * ey; } const mx = H.x + ex * H.len - cx, my = H.y + ey * H.len - cy;
        g.x += mx; g.collideX(); const py = g.y; g.y += my; g.collideY(py, false); }
      g.vx += (G.kd('right') ? 1 : 0) * 160 * dt - (G.kd('left') ? 1 : 0) * 160 * dt; // pump the swing
      if (H.len > 130 * (G.player.stats.vSilk || 1)) g.hook = null; }
    return r0; };
  const drG = G.drawGoop; G.drawGoop = function (ctx) { const r = drG.apply(this, arguments); const g = G.goop; if (!g) return r; const x = Math.round(g.x), y = Math.round(g.y) - 3;
    const H = g.hook || g.miss; if (H) { const wob = Math.sin(G.t * 30) * (g.hook ? 0.4 : 1.2); NE.pline(ctx, x, y, H.x + wob, H.y, 2, NE.VC.dark); NE.pline(ctx, x, y, H.x, H.y, 1, NE.VC.light); if (g.hook) { ctx.fillStyle = NE.VC.light; ctx.fillRect(Math.round(H.x) - 1, Math.round(H.y) - 1, 2, 2); } }
    return r; };
})();

// ---------- death: the Vespa claws its way out of the host before it erupts ----------
// stirring (twitches, a heartbeat, light moving under the skin) -> bulging (convulsions, glowing cracks spreading over the chest)
// -> tendrils (feelers push out of the wounds, the body arches, two eyes open in the gap) -> rupture (the original burst)
(function () { const G = NE.G, rf = NE.rf, pick = NE.pick, clamp = NE.clamp;
  const sb0 = G.startBurst; const DUR = 3.2;
  G.startBurst = function (p) { if (!p || !p.rag || G.emerge) return sb0.apply(this, arguments);
    NE.setVespaColours(p.vglow); G.state = 'burst'; G.emerge = { p, t: 0, beats: 0, twT: 0, cracks: [...Array(6)].map((_, i) => ({ a: -Math.PI / 2 + (i - 2.5) * 0.62 + rf(-0.2, 0.2), segs: [...Array(6)].map(() => rf(-0.7, 0.7)) })), stage: 0 };
    G.say(pick(['Something is moving...', 'No— not yet—', 'It\'s waking up inside me.']), 2); };
  const tickE = NE.UI.tick; NE.UI.tick = function (dt) { const r = tickE.apply(this, arguments); const E = G.emerge; if (!E) return r; const p = E.p; E.t += dt; const k = E.t / DUR; const P = p.rag.pts; const torso = { x: (P[1].x + P[2].x) / 2, y: (P[1].y + P[2].y) / 2 };
    const kick = (q, s) => { q.ox -= rf(-s, s) / 60; q.oy -= rf(-s * 1.4, s * 0.3) / 60; };
    // heartbeat that speeds up
    const beatEvery = k < 0.3 ? 0.55 : k < 0.6 ? 0.32 : 0.18; E.bT = (E.bT || 0) - dt; if (E.bT <= 0 && k < 0.92) { E.bT = beatEvery; NE.Audio.play('heart', 0.4 + k * 0.7); E.pulse = 1; }
    E.pulse = Math.max(0, (E.pulse || 0) - dt * 4);
    // twitches, then full convulsions
    E.twT -= dt; if (E.twT <= 0) { E.twT = k < 0.3 ? rf(0.2, 0.45) : rf(0.06, 0.16); const n = k < 0.3 ? 1 : k < 0.6 ? 2 : 3; for (let i = 0; i < n; i++) kick(pick(P), 40 + k * 140); if (k > 0.35) { P[1].oy += 0.8 + k; P[2].oy += 0.5; } G.shake(0.3 + k * 2.2); }
    if (k > 0.33 && E.stage < 1) { E.stage = 1; NE.Audio.play('crack', 0.8); NE.Audio.play('squelch', 0.7); G.say(pick(['AAGH—', 'It\'s tearing—', 'Get out get OUT—']), 1.5); }
    if (k > 0.62 && E.stage < 2) { E.stage = 2; NE.Audio.play('squelch', 1); NE.Audio.play('screech', 0.35); }
    if (k > 0.62) { P[1].oy += dt * 60 * 0.9; } // the chest arches up as something pushes from inside
    if (k > 0.35 && Math.random() < dt * (6 + k * 26)) G.addP(torso.x + rf(-3, 3), torso.y + rf(-3, 2), rf(-30, 30), rf(-60, -5), rf(0.4, 0.9), pick([NE.VC.main, NE.VC.dark, '#7a0c0c', '#5a0606']), pick(['goo', 'blood']));
    G.burstFx = { x: torso.x, y: torso.y, t: 0.12 + k * 0.35 + (E.pulse || 0) * 0.12, col: p.vglow || NE.VC.main };
    if (k > 0.9) G.flashT = Math.max(G.flashT || 0, (k - 0.9) * 6);
    if (E.t >= DUR) { G.emerge = null; G.state = 'dying'; sb0.call(G, p); if (NE._burstPerk) NE._burstPerk(); }
    return r; };
  const glowE = G.drawGlow; G.drawGlow = function (ctx) { const r = glowE.apply(this, arguments); const E = G.emerge; if (!E) return r; const p = E.p, P = p.rag.pts, k = E.t / DUR; const C = NE.VC;
    const tx = (P[1].x + P[2].x) / 2, ty = (P[1].y + P[2].y) / 2; const ang = Math.atan2(P[1].y - P[2].y, P[1].x - P[2].x); const px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); };
    // light moving under the skin
    const lk = clamp(k * 1.6, 0, 1) * (0.55 + 0.45 * (E.pulse || 0)); for (let i = 0; i < 5; i++) { const t = (G.t * 1.7 + i * 0.37) % 1; const x = P[2].x + (P[1].x - P[2].x) * t + Math.sin(G.t * 5 + i) * 1.2, y = P[2].y + (P[1].y - P[2].y) * t + Math.cos(G.t * 4 + i) * 1.2; ctx.globalAlpha = 0.35 * lk; ctx.fillStyle = C.main; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2); }
    ctx.globalAlpha = 1;
    // glowing cracks spreading over the chest
    if (k > 0.33) { const ck = clamp((k - 0.33) / 0.35, 0, 1); for (const c of E.cracks) { let x = tx, y = ty, a = c.a + ang + Math.PI / 2; const n = Math.round(ck * 6); for (let s = 0; s < n; s++) { a += c.segs[s] * 0.6; x += Math.cos(a) * 1.1; y += Math.sin(a) * 1.1; px(x, y, s < 2 ? C.light : C.main); if (E.pulse > 0.5 && s < 3) px(x + 1, y, C.light); } } }
    // feelers push out of the wounds and taste the air; two eyes open in the gap
    if (k > 0.62) { const fk = clamp((k - 0.62) / 0.3, 0, 1); for (let i = 0; i < 6; i++) { const base = ang + Math.PI / 2 + (i - 2.5) * 0.45; const len = 2 + fk * (5 + i % 3 * 2) + Math.sin(G.t * 9 + i) * 1.2; let x = tx, y = ty; for (let s = 1; s <= len; s++) { const a = base + Math.sin(G.t * 8 + i * 1.7 + s * 0.6) * 0.5; x += Math.cos(a); y += Math.sin(a); px(x, y, s > len - 1.5 ? C.light : (i + s) % 2 ? C.main : C.dark); } }
      ctx.globalAlpha = clamp((k - 0.62) * 3, 0, 1); ctx.fillStyle = C.dark; ctx.fillRect(Math.round(tx) - 2, Math.round(ty) - 1, 5, 3); ctx.globalAlpha = 1;
      if (k > 0.75) { const bl = Math.sin(G.t * 3) > 0.92 ? 0 : 1; if (bl) { px(tx - 1, ty, C.light); px(tx + 1, ty, C.light); } } }
    return r; };
})();
(function () { const G = NE.G; const cw = G.clearWorld; G.clearWorld = function () { G.emerge = null; return cw.apply(this, arguments); }; })();
