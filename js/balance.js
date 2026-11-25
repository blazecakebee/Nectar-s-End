// Nectar's End — 0.10.2 difficulty pass. Everything that scales how hard the game bites lives in NE.BAL so it is easy to tune.
// (The constants that live inside older files — regen, hunger, armour, ability numbers, spawn counts — were edited in place.)
(function (NE) {
'use strict';
const G = NE.G, { rf, ri, pick, chance, clamp } = NE;
const BAL = NE.BAL = {
  inMul: 1.3,          // damage enemies deal to players
  inDepth: 1 / 1500,   // ...plus this much per metre of depth (capped below)
  inDepthMax: 0.45,
  outMul: 0.88,        // damage players deal to enemies (was 1.2x on top of weapon stats)
  hpDepth: 1 / 1200,   // enemies gain this much effective health per metre of depth
  hpDepthMax: 0.8,
  eliteHp: 1.5, eliteBase: 0.05, eliteDepth: 1 / 4000, eliteMax: 0.22, eliteFrom: 150,
  lootDrop: 0.12,      // chance each non-gun, non-ammo item in a container is simply not there
  ammoMul: 0.75,
  priceMul: 1.25,
  sightMul: 1.08, hearMul: 1.1,
  hunterEvery: [110, 45], hunterFrom: 60, // seconds between hunters (shortens with depth), and the depth they start at
  vespaMelee: 2.2, vespaGun: 0.9, vespaCap: 5, // seconds of Vespa time lost per second while enemies are on it
  graftRipLock: 25,    // seconds after taking a host before you can tear free again
  graftShock: 28,      // pain and stress dumped on a fresh host
  hopHpFloor: 0.2, hopBloodFloor: 0.5,
};
const depthOf = y => { try { return Math.max(0, NE.depthOfY(y)); } catch (e) { return 0; } };

// ---------- damage in and out ----------
let enemyNames = null; const isEnemySrc = s => { if (!enemyNames || enemyNames.size < 5) { enemyNames = new Set(); for (const k in NE.ENEMIES) enemyNames.add(NE.ENEMIES[k].name); } return enemyNames.has(s); };
const isPlayerSrc = s => { const p = G.player, q = G.net && G.net.peerSurv; return s === 'The Vespa' || (p && p.surv && s === p.surv.first) || (q && s === q.first); };
const hurt0 = NE.Actor.prototype.hurt;
NE.Actor.prototype.hurt = function (part, dmg, kind, src, dir) {
  if (this.alive && typeof src === 'string' && dmg > 0 && kind !== 'fall' && kind !== 'burn') {
    if (this.isPlayer) { if (isEnemySrc(src)) dmg *= BAL.inMul * (1 + Math.min(BAL.inDepthMax, depthOf(this.y) * BAL.inDepth)) * (src === this._lastElite ? 1.15 : 1); }
    else if (this.D && !this.isPuppet) {
      if (isPlayerSrc(src) && src !== 'The Vespa') dmg *= BAL.outMul;
      dmg /= (1 + Math.min(BAL.hpDepthMax, (this.depth || 0) * BAL.hpDepth)) * (this.elite ? BAL.eliteHp : 1);
    }
  }
  return hurt0.call(this, part, dmg, kind, src, dir);
};

// ---------- the player's own stats: no more stacking into a god ----------
const cs0 = NE.computeStats; NE.computeStats = function () { const s = cs0.apply(this, arguments); s.speed = Math.min(1.4, s.speed); s.melee = Math.min(1.6, s.melee); s.loot = Math.min(1.5, s.loot); s.fall *= 1.1; s.infect *= 1.1; s.bleed *= 1.08; s.staminaCost *= 1.06; return s; };

// ---------- the world pushes back: loot, prices, senses ----------
const gl0 = G.genLoot; G.genLoot = function (o) { const items = gl0.apply(this, arguments); const out = []; for (const e of items) { const it = NE.ITEMS[e.id]; if (it && it.cat === 'ammo') e.n = Math.max(3, Math.round(e.n * BAL.ammoMul)); else if (it && !it.gun && NE.chance(BAL.lootDrop)) continue; out.push(e); } if (!out.length && items.length) out.push(items[0]); return out; };
for (const k in NE.PRICE) NE.PRICE[k] = Math.round(NE.PRICE[k] * BAL.priceMul * 10) / 10;
for (const k in NE.ENEMIES) { const D = NE.ENEMIES[k]; if (D.sight) D.sight = Math.round(D.sight * BAL.sightMul); if (D.hears) D.hears = Math.round(D.hears * BAL.hearMul * 100) / 100; }

// ---------- elites: tougher, faster, red-eyed, and they carry more ----------
function makeElite(a) { a.elite = true; a.speedMul *= 1.12; a.D = Object.assign({}, a.D, { eyeGlow: '#ff3a2a', sight: Math.round((a.D.sight || 80) * 1.12), block: Math.min(0.6, (a.D.block || 0) + 0.15) }); }
const sf0 = G.spawnFloor; G.spawnFloor = function (fl, restoring) { const n0 = G.actors.length; const r = sf0.apply(this, arguments);
  if (!restoring && !(G.net && G.net.on && G.net.role === 'guest') && !fl.town) { const p = clamp(BAL.eliteBase + fl.depth * BAL.eliteDepth, 0, BAL.eliteMax); for (const a of G.actors.slice(n0)) if (a.D && a.alive && !a.elite && !a.post && fl.depth >= BAL.eliteFrom && NE.chance(p)) makeElite(a); }
  return r; };
const dl0 = NE.Enemy.prototype.dropLoot; NE.Enemy.prototype.dropLoot = function () { const l = dl0.apply(this, arguments); if (this.elite) { l.push({ id: pick(['bandage', 'painkillers', 'scrap', 'battery', 'ration', 'water']), n: 1 }); if (chance(0.5)) l.push({ id: 'trinket', n: 1 }); } return l; };

// ---------- hunters: something is always tracking you below the first levels ----------
let hunT = rf(40, 70);
function hunters(dt) {
  if (G.state !== 'run' || !G.world || G.world.lobby || !G.player || !G.player.alive || G.infest || G.emerge) return;
  if (G.net && G.net.on && G.net.role === 'guest') return;
  const d = depthOf(G.player.y); if (d < BAL.hunterFrom) return;
  if (hunT > BAL.hunterEvery[0] * 1.3) hunT = BAL.hunterEvery[0];
  hunT -= dt; if (hunT > 0) return;
  hunT = clamp(BAL.hunterEvery[0] - d / 10, BAL.hunterEvery[1], BAL.hunterEvery[0]) * rf(0.8, 1.25);
  const alive = G.actors.filter(a => a.hunter && a.alive && !a.gone).length; if (alive >= (d < 400 ? 1 : 2)) return;
  const tg = G.net && G.net.on && G.net.peer && G.net.peer.alive && chance(0.5) ? G.net.peer : G.player; const W = G.world; const fl = W.floors[G.floorIdx(tg.y - 2)]; if (!fl || fl.town) return;
  const tbl = fl.depth < 120 ? [['scav', 5], ['gunner', 1]] : fl.biome.enemies;
  for (let tries = 0; tries < 10; tries++) {
    const x = tg.x + (chance(0.5) ? 1 : -1) * rf(150, 260); if (x < 40 || x > (W.W - 5) * NE.T) continue; const y = W.groundY(fl, x);
    if (Math.abs(y - tg.y) > 60 || W.solidAt(x, y - 8) || W.solidAt(x, y - 16) || !W.solidAt(x, y + 2) || (Math.abs(x - tg.x) < 215 && W.los(x, y - 8, tg.x, tg.y - 8))) continue; // out of sight, or at least off the screen
    const e = new NE.Enemy(G, x, y - 1, NE.wpick(tbl), fl.depth); e.hunter = true; e.state = 'search'; e.lastSeen = { x: tg.x, y: tg.y }; e.searchT = 14; e.hostile = true; G.actors.push(e);
    if (fl.depth >= BAL.eliteFrom && chance(0.25)) makeElite(e);
    if (tg === G.player) { G.log('Something is tracking you.', 'warn'); NE.Audio.play('growl', 0.35); }
    return;
  }
}

// ---------- the bare Vespa can be cut apart ----------
function vespaDrain(g, dt) {
  let loss = 0; const gy = g.y - 3;
  for (const a of G.actors) {
    if (!a.alive || a.isPlayer || a.isRemote || a.town || a.gone || a.hidden || !(a.D || a.type) || (a.stagger || 0) > 0.2) continue;
    if (a.state === 'flee' || a.hostile === false || a.isNPCp || a.kind === 'survivor' || a.kind === 'trader') continue; // the host is gone, so anyone awake and close goes for the bare Vespa
    const dx = a.x - g.x, dy = a.cy - gy, d = Math.hypot(dx, dy); const wp = a.weapon && NE.ITEMS[a.weapon]; const gun = wp && wp.gun;
    if (!gun && d < 18) loss += BAL.vespaMelee * (a.elite ? 1.3 : 1); else if (gun && d < 170 && Math.abs(dy) < 60 && G.world.los(a.x, a.y - 10, g.x, gy)) loss += BAL.vespaGun * (a.elite ? 1.3 : 1);
  }
  if (loss <= 0) { g.hurtT = Math.max(0, (g.hurtT || 0) - dt); return; }
  loss = Math.min(BAL.vespaCap, loss); g.t -= loss * dt; g.hurtT = 0.15;
  if (Math.random() < dt * 18) G.addP(g.x + rf(-3, 3), gy + rf(-2, 2), rf(-30, 30), rf(-40, 0), rf(0.3, 0.6), NE.VC.dark, 'goo');
  if (!g._hurtSnd || G.t - g._hurtSnd > 0.35) { g._hurtSnd = G.t; NE.Audio.play('splat', 0.7); G.shake(1); }
  if (!g._hurtToast) { g._hurtToast = true; G.toast('Without a host you are soft. They are cutting you apart!'); }
}
const gu0 = G.goopUpdate; G.goopUpdate = function (dt) { const g = G.goop; if (g && !g.hop) vespaDrain(g, dt); return gu0.apply(this, arguments); };

// ---------- per-frame ----------
const tick0 = NE.UI.tick; NE.UI.tick = function (dt) { const r = tick0.apply(this, arguments); try { hunters(dt); } catch (e) { console.error('hunters', e); } return r; };
const cw0 = G.clearWorld; G.clearWorld = function () { hunT = rf(40, 70); return cw0.apply(this, arguments); };

// ---------- drawing: elite marks, and the Vespa flinching ----------
const gl1 = G.drawGlow; G.drawGlow = function (ctx) { const r = gl1.apply(this, arguments); const p = G.player; if (!p) return r;
  for (const a of G.actors) { if (!a.elite || !a.alive || a.hidden || Math.abs(a.y - p.y) > 120 || Math.abs(a.x - p.x) > 260) continue; const x = Math.round(a.x), y = Math.round(a.y - a.h) - 5; ctx.fillStyle = '#ff3a2a'; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); ctx.fillStyle = '#ffd0c0'; ctx.fillRect(x, y, 1, 1); }
  const g = G.goop; if (g && g.hurtT > 0 && !g.hop) { ctx.globalAlpha = 0.45; ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(g.x) - 5, Math.round(g.y) - 9, 11, 9); ctx.globalAlpha = 1; }
  return r; };
})(window.NE);
