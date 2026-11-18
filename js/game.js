// Nectar's End — game state machine, loop, input, camera, lighting, hazards, events, runs
(function (NE) {
'use strict';
const { ri, rf, pick, chance, clamp, lerp } = NE; const T = NE.T, VH = NE.VH, LS = 3; let VW = NE.VW;

NE.xpForLevel = l => 80 + l * 45;

const G = NE.G = {
  state: 'title', keys: {}, mouse: { x: 0, y: 0, wx: 0, wy: 0, l: false, r: false }, t: 0, timeScale: 1, cam: { x: 0, y: 0, shake: 0 },
  actors: [], amb: [], parts: [], tracers: [], noises: [], gas: [], fires: [], dyn: [], lights: [], env: {}, blackout: 0, sayCD: 0, monoT: {},
};

G.init = function () {
  G.cv = document.getElementById('cv'); G.ctx = G.cv.getContext('2d'); G.ctx.imageSmoothingEnabled = false;
  G.lc = document.createElement('canvas'); G.lc.width = Math.ceil(VW / LS) + 1; G.lc.height = Math.ceil(VH / LS) + 1; G.lx = G.lc.getContext('2d');
  NE.Save.boot(G);
  let live = false; try { live = sessionStorage.getItem('ne_live') === '1' || sessionStorage.getItem('ne_resume') === '1'; sessionStorage.removeItem('ne_resume'); } catch (e) { }
  window.addEventListener('resize', G.resize); G.resize();
  G.bindInput(); NE.UI.init(); NE.UI.applyTheme(); G.toTitle();
  window.addEventListener('beforeunload', () => G.autosave(true));
  if (live && G.meta.started) setTimeout(() => G.continueGame(), 50); document.addEventListener('visibilitychange', () => { if (document.hidden) G.autosave(true); });
  let last = performance.now();
  const loop = ts => { const dt = Math.min(0.05, (ts - last) / 1000); last = ts; try { G.frame(dt); } catch (e) { console.error(e); } requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { G.titleImg = null; });
};
G.resize = function () {
  // Ultrawide-aware: keep 225px of world height, widen the view to the screen's aspect (16:10 .. 32:9).
  const asp = clamp(window.innerWidth / window.innerHeight, 16 / 10, 32 / 9);
  VW = NE.VW = Math.round(VH * asp); if (G.cv.width !== VW) { G.cv.width = VW; G.ctx.imageSmoothingEnabled = false; }
  G.lc.width = Math.ceil(VW / LS) + 1; G.lc.height = Math.ceil(VH / LS) + 1;
  const s = Math.min(window.innerWidth / VW, window.innerHeight / VH); G.scale = s;
  const el = document.getElementById('game'); el.style.width = Math.floor(VW * s) + 'px'; el.style.height = Math.floor(VH * s) + 'px';
  document.documentElement.style.setProperty('--s', s);
};
G.save = () => NE.Save.write(G);
G.autosave = f => NE.autosave(f);

// ---------------- input ----------------
G.bindInput = function () {
  const K = G.keys;
  window.addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT')) return;
    if (['Tab', 'Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    if (!K[e.code]) G.onKey(e.code); K[e.code] = true;
  });
  window.addEventListener('keyup', e => { K[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in K) K[k] = false; G.mouse.l = G.mouse.r = false; });
  const cv = G.cv;
  const pos = e => { const r = cv.getBoundingClientRect(); G.mouse.x = (e.clientX - r.left) / r.width * VW; G.mouse.y = (e.clientY - r.top) / r.height * VH; };
  window.addEventListener('mousemove', pos);
  cv.addEventListener('mousedown', e => { pos(e); NE.Audio.init(); if (G.state === 'prologue') return NE.Prologue.next(); if (e.button === 0) { G.mouse.l = true; G.onClick(); } if (e.button === 2) { G.mouse.r = true; G.startGrab(); } });
  window.addEventListener('mouseup', e => { if (e.button === 0) G.mouse.l = false; if (e.button === 2) { G.mouse.r = false; G.releaseGrab(); } });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('contextmenu', e => { if (G.state === 'run' || G.state === 'lobby' || G.state === 'burst') e.preventDefault(); });
};
G.playing = () => (G.state === 'run' || G.state === 'lobby' || G.state === 'burst') && G.player;
G.onKey = function (code) {
  NE.Audio.init();
  if (G.state === 'prologue') { if (code === 'Escape') NE.Prologue.finish(); else if (code === 'Space' || code === 'Enter') NE.Prologue.next(); return; }
  const UI = NE.UI; const p = G.player; const run = G.state === 'run';
  if (code === 'Escape') { if (UI.closeTop()) return; if (G.playing()) UI.openHex(); return; }
  if (!G.playing()) return;
  if (UI.modalOpen()) return;
  if (code === 'KeyM') { if (UI.hexOpen) UI.closeHex(); else UI.openHex(); return; }
  if (code === 'Tab' || code === 'KeyI') return UI.toggle('inventory');
  if (code === 'KeyH') return UI.toggle('health');
  if (code === 'KeyJ') return UI.toggle('journal');
  if (code === 'KeyK') return UI.toggle('craft');
  if (code === 'KeyN') return UI.toggle('map');
  if (code === 'KeyV') return UI.toggle('status');
  if (UI.panel) return;
  if (G.goop) return;
  if (p.anat.uncon || !p.alive) return;
  if (code === 'KeyE') G.interact();
  if (code === 'KeyF') { if (p.light.bat > 0) { p.light.on = !p.light.on; NE.Audio.play('click'); } else G.toast('Battery dead. Use a battery.'); }
  if (code === 'KeyR') p.reload();
  if (code === 'KeyB' && run) NE.quickBandage(p);
  if (code === 'KeyG' && run) { const id = G.throwSel(); if (id) NE.throwItem(G, p, id); else G.toast('Nothing to throw.'); }
  if (code === 'KeyQ') G.cycleThrow();
  if (code === 'Digit1') G.cycleWeapon();
  if (code === 'KeyX' && run) G.hivePulse(p);
};
G.throwSel = function () { const p = G.player; const ids = ['flare', 'glowstick', 'molotov', 'bottle', 'brick']; if (G.throwPref && p.inv.has(G.throwPref)) return G.throwPref; return ids.find(i => p.inv.has(i)); };
G.cycleThrow = function () { const p = G.player; const ids = ['flare', 'glowstick', 'molotov', 'bottle', 'brick'].filter(i => p.inv.has(i)); if (!ids.length) return G.toast('No throwables.'); const i = (ids.indexOf(G.throwSel()) + 1) % ids.length; G.throwPref = ids[i]; G.toast('Throw: ' + NE.ITEMS[ids[i]].name + ' [G]'); };
G.cycleWeapon = function () { const p = G.player; const ws = p.inv.items.filter(e => NE.ITEMS[e.id].cat === 'weapon'); const cur = p.equip.weapon; const all = [null, ...ws]; const i = (all.indexOf(cur) + 1) % all.length; p.equip.weapon = all[i]; G.toast('Holding: ' + (all[i] ? NE.ITEMS[all[i].id].name : 'fists')); NE.Audio.play('ui'); };
G.onClick = function () { if (!G.playing() || NE.UI.panel || NE.UI.hexOpen || NE.UI.modalOpen()) return; if (G.goop) return G.goopLash(); if (G.player.alive) G.player.attack(); };
G.startGrab = function () {
  if (!G.playing() || NE.UI.panel) return; const p = G.player; const m = G.mouse;
  if (NE.dist(m.wx, m.wy, p.x, p.cy) > 40) return;
  G.grab = G.phys.nearestPoint(m.wx, m.wy, 9, b => b.owner !== p && !(b.owner && b.owner.alive)); if (G.grab) G.grab.body.dragBy = p;
};
G.releaseGrab = function () { const gp = G.grab; if (!gp) return; const b = gp.body; G.grab = null; const v = b.vel(); const sp = Math.hypot(v.x, v.y); const cap = 230 / Math.sqrt(Math.max(0.5, b.mass || 1)); if (sp > cap) { const k = cap / sp; for (const q of b.pts) { q.ox = q.x - (q.x - q.ox) * k; q.oy = q.y - (q.y - q.oy) * k; } } b.dragT = G.t + 0.6; setTimeout(() => { if (b.dragT <= G.t) b.dragBy = null; }, 700); };
G.ctl = function () {
  const K = G.keys; const p = G.player; const block = NE.UI.panel || NE.UI.hexOpen || NE.UI.modalOpen();
  if (block) return { mx: 0 };
  const L = K.KeyA || K.ArrowLeft, R = K.KeyD || K.ArrowRight, U = K.KeyW || K.ArrowUp, D = K.KeyS || K.ArrowDown;
  return { mx: (R ? 1 : 0) - (L ? 1 : 0), up: U, down: D, jump: K.Space, sprint: K.ShiftLeft || K.ShiftRight, crouch: K.ControlLeft || K.KeyC || (D && !p.climbing && !p.ladderAt()), drop: D && K.Space };
};

// ---------------- helpers ----------------
G.toast = m => NE.UI.toast(m);
G.log = function (m, cls) { if (G.run) G.run.log.push({ t: G.run.t, m, cls }); NE.UI.toast(m, cls); };
G.say = function (text, prob) { if (prob != null && Math.random() > prob) return; if (G.sayCD > 0) return; G.sayCD = 4; NE.UI.say(text); if (G.run) G.run.log.push({ t: G.run.t, m: '"' + text + '"', cls: 'mono' }); };
G.shake = a => { G.cam.shake = Math.max(G.cam.shake, a * G.meta.settings.shake); };
G.noise = (x, y, r) => { G.noises.push({ x, y, r, t: 0.3 }); };
G.addP = (x, y, vx, vy, life, col, kind, grav) => { if (G.parts.length > 900) return; G.parts.push({ x, y, vx, vy, life, max: life, col, kind, grav: grav == null ? 1 : grav }); };
G.blood = function (x, y, n, dx, dy) { for (let i = 0; i < n; i++) G.addP(x, y, (dx || 0) * rf(20, 80) + rf(-35, 35), (dy || 0) * rf(10, 50) - rf(10, 60), rf(0.6, 1.4), pick(['#8a1010', '#6a0c0c', '#a01818']), 'blood'); };
G.sparks = function (x, y, n, col) { for (let i = 0; i < n; i++) G.addP(x, y, rf(-90, 90), rf(-110, 20), rf(0.15, 0.4), col || pick(['#ffd080', '#ffa040', '#fff']), 'spark'); };
G.dust = function (x, y, n) { for (let i = 0; i < n; i++) G.addP(x + rf(-4, 4), y - 1, rf(-30, 30), rf(-25, -5), rf(0.4, 0.9), 'rgba(150,140,120,0.6)', 'dust', 0.1); };
G.addFire = function (x, y, r, t) { G.fires.push({ x, y, r, t }); NE.Audio.play('fire'); };
G.lightAt = function (x, y) { for (const l of G.lights) if (!l.player && NE.dist(l.x, l.y, x, y) < l.r * 0.7) return true; return false; };
G.floorIdx = y => Math.floor(y / T / NE.FH);
G.curFloor = () => G.world.floors[clamp(G.floorIdx(G.player.y - 2), 0, G.world.floors.length - 1)];
G.decal = function (x, y, col) {
  if (!G.world || G.world.lobby) return; const fl = G.world.floors[G.floorIdx(y)]; if (!fl) return;
  if (!fl.dc) { fl.dc = document.createElement('canvas'); fl.dc.width = G.world.W * T; fl.dc.height = NE.FH * T; }
  const x2 = fl.dc.getContext('2d'); x2.fillStyle = col; x2.fillRect(Math.round(x), Math.round(y - fl.y0 * T), 1, 1);
};

// ---------------- states ----------------
G.clearWorld = function () { G.actors = []; G.parts = []; G.tracers = []; G.noises = []; G.gas = []; G.fires = []; G.dyn = []; G.lights = []; G.amb = []; G.blackout = 0; G.grab = null; G.player = null; G.goop = null; G.wisp = null; };
G.toTitle = function () { G.autosave(); try { sessionStorage.removeItem('ne_live'); } catch (e) { } G.clearWorld(); G.state = 'title'; G.world = null; if (G.net) G.net.close(); NE.UI.showTitle(); NE.Audio.music('title'); };
G.toLobby = function () {
  G.clearWorld(); G.state = 'lobby'; G.run = null; G.meta.started = true; G.meta.run = null; try { sessionStorage.setItem('ne_live', '1'); } catch (e) { }
  if (!G.meta.survivor) { G.meta.survivor = NE.makeSurvivor(); G.meta.rerolled = false; }
  G.save();
  G.world = NE.World.lobbyWorld(); G.phys = new NE.Phys(G.world);
  const fl = G.world.floors[0]; G.player = new NE.Player(G, 6 * T, fl.feetY, G.meta.survivor, G.meta); G.actors.push(G.player); G.player.infest = G.infestLevel();
  for (let i = 0; i < 3; i++) G.phys.box('crate', (24 + i * 1.2) * T, fl.feetY - 6 - i * 9, 7, 7, 3, '#6a5034');
  G.phys.stick('bottle', 33 * T, fl.feetY - 4, 4, 0, 1.2, 0.5);
  G.cam.x = 0; G.cam.y = fl.feetY - VH * 0.6; NE.UI.showLobby(); NE.Audio.music('camp');
  if (G.net && G.net.on) G.net.enterLobby();
  if (G.meta.settings.tips && G.meta.runs === 0) setTimeout(() => G.toast('Walk to the stations and press [E]. The winch lift on the right lowers you into the caves.'), 800);
};
G.descend = function (seed) {
  NE.UI.closeAll(); G.state = 'descent'; G.descT = 0; G.descSeed = seed; NE.Audio.play('elevator'); NE.UI.hideHUD(); NE.Audio.music(null);
  if (G.net && G.net.on && G.net.role === 'host') G.net.send({ t: 'descend', seed: G.descSeed });
};
G.continueGame = function () {
  const M = G.meta; try { sessionStorage.setItem('ne_live', '1'); } catch (e) { }
  const r = M.run; if (r && r.coop && !G.net) NE.startNet(r.coop.role, r.coop.code);
  if (r && G.net && G.net.role === 'guest') { G.clearWorld(); G.state = 'wait'; NE.UI.waitDialog(); return; }
  if (r) { try { G.descSeed = null; return G.startRun(r); } catch (e) { console.error('restore failed', e); M.run = null; G.toast('Your saved run could not be restored. Back at Base Camp.'); } }
  G.toLobby();
};
G.newRunState = () => ({ t: 0, kills: 0, maxDepth: 0, milestone: 0, specops: false, triage: false, treated: 0, log: [], biome: null, floors: 1, abil: [], towns: [], sent: 0 });
G.startRun = function (restore) {
  G.clearWorld(); G.state = 'run';
  const surv = G.meta.survivor;
  const seed = restore ? restore.seed : G.descSeed != null ? G.descSeed : (Math.random() * 1e9) | 0; G.descSeed = null;
  G.world = new NE.World({ seed }); G.phys = new NE.Phys(G.world); G.world.onMod = (x, y, v) => { if (G.net && G.net.on) G.net.send({ t: 'tile', x, y, v }); };
  if (restore) { for (const [k, v] of restore.mods || []) G.world.mods.set(k, v); }
  G.run = restore ? restore.run : G.newRunState(); if (!restore) G.meta.runs++;
  G.world.ensure(restore ? Math.max(3, restore.floors) : 3, fl => G.spawnFloor(fl, !!restore));
  const f0 = G.world.floors[0]; G.player = new NE.Player(G, 12 * T, f0.feetY, surv, G.meta); G.actors.unshift(G.player);
  const p = G.player; const inv = p.inv;
  if (restore) NE.Save.restoreRun(G, restore);
  else {
    inv.add('rag', 2); inv.add('water', 1);
    const occ = NE.OCCUPATIONS.find(o => o.id === surv.occ); for (const id of occ.kit) { if (id === 'ammo9') inv.add('ammo9', ri(6, 12)); else if (id === 'pistol') inv.add('pistol', 1, { mag: ri(3, 6) }); else inv.add(id, 1); }
    for (const id of G.meta.starter) inv.add(id, 1); G.meta.starter = [];
    const w = inv.items.find(e => NE.ITEMS[e.id].cat === 'weapon'); if (w) p.equip.weapon = w;
    const resp = inv.find('respirator'); if (resp) { p.gear.face = resp; inv.remove(resp); p.filterT = 30; }
    if (G.net && G.net.on && G.net.role === 'guest') p.x += 14;
  }
  p.setAbilities(G.run.abil || []); p.infest = G.infestLevel();
  G.eventT = rf(45, 70); G.sayCD = 0;
  G.cam.x = p.x - VW / 2; G.cam.y = p.y - VH * 0.55;
  NE.UI.showRun(); NE.Audio.play('ding'); G.musicFor();
  if (!restore) { setTimeout(() => G.say(pick(NE.MONO.start)), 600); G.log('Lowered to 0m — ' + f0.biome.name + '.', 'sys'); G.log('Perk: ' + f0.biome.perk, 'good'); G.log('Danger: ' + f0.biome.challenge, 'bad'); G.log('A town waits every 250m. There is no way back up.', 'sys'); }
  else G.toast('Welcome back, ' + surv.first + '. ' + Math.round(NE.depthOfY(p.y)) + 'm.');
  if (G.net && G.net.on) G.net.enterRun(); G.autosave();
};
G.spawnFloor = function (fl, restoring) {
  const guest = G.net && G.net.on && G.net.role === 'guest';
  for (const s of fl.spawns) {
    if (s.kind === 'town') { const n = new NE.NPC(G, s.x, s.y, 'town'); n.setRole(s.role, s.name, s.look); if (s.role === 'trader') n.stock = NE.withSeed(G.world.seed + fl.f, () => G.traderStock(fl.depth + 200)); if (s.role === 'doctor') n.stock = NE.withSeed(G.world.seed + fl.f * 3, () => G.traderStock(fl.depth, true)); G.actors.push(n); continue; }
    if (s.kind === 'prop') { const pal = fl.biome.pal; if (s.p === 'crate') G.phys.box('crate', s.x, s.y, 7, 7, 3, '#6a5034'); else if (s.p === 'barrel') G.phys.box('barrel', s.x, s.y - 2, 6, 9, 4.5, pick(['#5a6a4a', '#7a3a2a', '#3a4a6a'])); else if (s.p === 'debris') G.phys.box('debris', s.x, s.y, rf(4, 7), rf(3, 5), 3, pal.tile); else { const b = G.phys.stick(s.p, s.x, s.y, 4, 0, 1.2, s.p === 'brick' ? 2 : 0.5); b.item = s.p; } continue; }
    if (restoring || guest) continue; // enemies come from the save file / the co-op host
    if (s.kind === 'enemy') { const e = new NE.Enemy(G, s.x, s.y, s.type, fl.depth); e.guard = !!s.guard; G.actors.push(e); }
    else if (s.kind === 'survivor' || s.kind === 'trader') { const n = new NE.NPC(G, s.x, s.y, s.kind); if (s.kind === 'trader') n.stock = G.traderStock(fl.depth); G.actors.push(n); }
    else if (s.kind === 'standoff') { const grp = []; for (let i = 0; i < 2; i++) { const e = new NE.Enemy(G, s.x + i * 12, s.y, fl.depth > 400 ? pick(['scav', 'gunner']) : 'scav', fl.depth); e.hostile = false; e.guard = true; e.facing = -1; grp.push(e); G.actors.push(e); } fl.objs.push({ type: 'standoff', x: s.x, y: s.y, grp, done: false }); }
  }
};
G.inTown = () => { const fl = G.world && !G.world.lobby && G.player ? G.curFloor() : null; return fl && fl.town ? fl : null; };
G.musicFor = function () { if (G.state === 'burst') return NE.Audio.music('burst'); if (G.state !== 'run') return; const fl = G.curFloor(); NE.Audio.music(fl.town ? 'town' : fl.biome.id); };
G.infestLevel = function () { const M = G.meta; const ab = G.run ? (G.run.abil || []).length : 0; const d = G.run ? G.run.maxDepth : 0; return clamp(0.12 + (M.level - 1) * 0.025 + (M.nectars || 0) * 0.04 + ab * 0.1 + d / 3500, 0, 1); };

// ---------------- frame ----------------
G.frame = function (dt) {
  G.t += dt; G.sayCD = Math.max(0, G.sayCD - dt);
  if (G.state === 'title') { G.drawTitle(dt); }
  else if (G.state === 'prologue') { NE.Prologue.frame(dt); }
  else if (G.state === 'descent') { G.drawDescent(dt); }
  else if (G.state === 'wait') { G.drawWait(dt); }
  else if (G.state === 'lobby' || G.state === 'run' || G.state === 'dying' || G.state === 'burst') {
    const UI = NE.UI; let ts = 1; if (UI.panel || UI.hexOpen) ts = UI.panel === 'settings' ? 0 : 0.2; if (UI.modalOpen()) ts = 0;
    if (G.net && G.net.on && G.state !== 'lobby') ts = Math.max(ts, UI.modalOpen() || UI.panel ? 1 : ts); // co-op never pauses
    if (G.player && G.player.anat.uncon && G.state === 'run' && !(G.net && G.net.on)) ts = 2.5;
    if (G.state === 'dying') ts = 0.35;
    G.timeScale = ts; const sdt = dt * ts;
    if (sdt > 0) G.update(sdt, dt);
    G.render(dt);
    if (G.state === 'dying') { G.dieT -= dt; if (G.dieT <= 0) G.afterDeath(); }
    G.saveT = (G.saveT || 0) - dt; if (G.saveT <= 0) { G.saveT = 12; G.autosave(); }
  }
  if (G.net) G.net.tick(dt);
  NE.UI.tick(dt);
};
G.update = function (dt, rdt) {
  const p = G.player, W = G.world, run = G.state === 'run' || G.state === 'dying' || G.state === 'burst';
  G.mouse.wx = G.mouse.x + G.cam.x; G.mouse.wy = G.mouse.y + G.cam.y;
  const focus = G.focus();
  if (run) { const fi = G.floorIdx(focus.y); W.ensure(fi + 3, fl => G.spawnFloor(fl)); if (G.net && G.net.peer && G.net.role === 'host') W.ensure(G.floorIdx(G.net.peer.y) + 3, fl => G.spawnFloor(fl)); G.run.t += dt; }
  // player
  const env = G.env = G.computeEnv(p);
  if (p.alive) {
    p.update(dt, G.state === 'dying' ? { mx: 0 } : G.ctl());
    if (run) { p.anat.update(dt, env); G.handleAnatEvents(p); G.vespaTick(p, dt); if (G.state === 'run' && p.anat.dead) G.playerDeath(); }
    p.rag.tiles = p.anat.uncon; if (p.anat.uncon) p.rag.collide = false;
    if (run && p.alive) G.hazards(p, dt);
  }
  if (G.goop) G.goopUpdate(dt);
  if (G.wisp) G.wispUpdate(dt);
  // others (only near a player)
  const near = a => Math.abs(a.y - focus.y) < 260 || (G.net && G.net.peer && Math.abs(a.y - G.net.peer.y) < 260);
  for (const a of G.actors) { if (!a.alive || !near(a)) continue; if (W.isLava && W.isLava(a.x, a.y - 2) && !a.isPuppet) { a.inFire = 0.3; a.vy = Math.min(a.vy, -40); } if (a === p) continue; a.update(dt); if (a.burnAcc != null && !a.isPuppet) G.burnTick(a, dt); }
  G.actors = G.actors.filter(a => !a.gone || (a.rag.remove = true, false));
  // physics
  G.physAcc = (G.physAcc || 0) + dt; let n = 0;
  while (G.physAcc >= 1 / 60 && n < 4) {
    G.physAcc -= 1 / 60; n++;
    if (G.grab && p.alive) { const gp = G.grab; const m = G.mouse; let tx = m.wx, ty = m.wy; const dx = tx - p.x, dy = ty - p.cy, d = Math.hypot(dx, dy); if (d > 36) { tx = p.x + dx / d * 36; ty = p.cy + dy / d * 36; } const mm = gp.body.mass || 1; const k = clamp(0.4 / mm, 0.06, 0.4); if (mm > 2.5 && ty < p.y - 10) ty = lerp(ty, p.y - 4, 0.6); gp.x = lerp(gp.x, tx, k); gp.y = lerp(gp.y, ty, k); if (NE.dist(gp.x, gp.y, p.x, p.cy) > 60) G.releaseGrab(); }
    G.phys.step(1 / 60);
    for (const a of G.actors) { if (!a.alive || !near(a)) continue; const hits = G.phys.pushActor(a); for (const h of hits) G.propHit(a, h); }
  }
  if (G.physAcc > 0.1) G.physAcc = 0;
  // thrown light bodies + lifetimes + dynamite fuses
  for (const b of G.phys.bodies) {
    if (b.life > 0) { b.life -= dt; if (b.item === 'flare' && Math.random() < dt * 30) G.addP(b.pts[1].x, b.pts[1].y, rf(-10, 10), rf(-30, -5), 0.3, pick(['#ff4030', '#ffa040']), 'spark', -0.2); }
    if (b.fuse > 0) { b.fuse -= dt; if (Math.random() < dt * 40) G.addP(b.pts[1].x, b.pts[1].y, rf(-15, 15), rf(-40, -5), 0.25, pick(['#ffe080', '#ff8020']), 'spark', -0.2); if (b.fuse <= 0) { b.remove = true; const c = b.center(); G.explode(c.x, c.y, 1.4, b.remote); } }
    if (b.kind === 'debris' && b.age > 40) b.remove = true;
  }
  // particles
  for (const q of G.parts) {
    q.life -= dt; q.vy += 300 * dt * q.grav; q.x += q.vx * dt; q.y += q.vy * dt;
    if (q.kind === 'blood' && W.solidAt(q.x, q.y)) { G.decal(q.x, q.y - 1, q.col); q.life = 0; }
    if (q.kind === 'spark' && W.solidAt(q.x, q.y)) { q.vy *= -0.3; q.vx *= 0.5; }
    if (q.kind === 'goo' && W.solidAt(q.x, q.y)) { G.decal(q.x, q.y - 1, '#d8a020'); q.life = 0; }
  }
  G.parts = G.parts.filter(q => q.life > 0);
  G.tracers = G.tracers.filter(t => (t.t -= rdt) > 0);
  G.noises = G.noises.filter(n => (n.t -= dt) > 0);
  // gas clouds
  for (const c of G.gas) { c.x += c.vx * dt; c.r = Math.min(c.max || 38, c.r + dt * 3); c.life -= dt; c.d = Math.min(c.d, c.life / 8); const fl = W.floors[G.floorIdx(c.y)]; if (fl) c.y = clamp(c.y + dt * 3, fl.y0 * T + 10, fl.feetY - 8); }
  G.gas = G.gas.filter(c => c.life > 0);
  // fires
  for (const f of G.fires) { f.t -= dt; if (Math.random() < dt * 25) G.addP(f.x + rf(-f.r, f.r) * 0.7, f.y - 1, rf(-8, 8), rf(-50, -20), rf(0.3, 0.7), pick(['#ff6020', '#ffb040', '#ffe080']), 'spark', -0.3); for (const a of G.actors) if (a.alive && !a.isPuppet && Math.abs(a.x - f.x) < f.r && Math.abs(a.y - f.y) < 10) { a.burnAcc = (a.burnAcc || 0); a.inFire = 0.2; } }
  G.fires = G.fires.filter(f => f.t > 0);
  for (const a of G.actors) if (a.inFire > 0 && !a.isPuppet) { a.inFire -= dt; G.burnTick(a, dt); }
  // objects
  G.updateObjects(dt);
  if (run) { G.events(dt); if (p.alive) { G.depthTrack(p); G.markSeen(p, dt); } }
  G.ambient(dt);
  G.blackout = Math.max(0, G.blackout - dt);
  G.camera(rdt);
};
G.focus = function () { return G.goop || (G.wisp ? G.wisp : G.player); };
G.burnTick = function (a, dt) { if (!(a.inFire > 0)) return; a.burnAcc = (a.burnAcc || 0) + dt; if (a.burnAcc > 0.45) { a.burnAcc = 0; a.hurt(pick(['lleg', 'rleg', 'torso', 'larm', 'rarm']), rf(3, 5), 'burn', 'Fire'); if (a.isPlayer) G.say('HOT—', 0.3); } };
G.propHit = function (a, h) {
  if (!a.alive || a.isPuppet) return; const b = h.b; if (b.hitCD > G.t) return; b.hitCD = G.t + 0.5;
  const m = b.mass || b.pts[0].m || 1; const dragged = b.dragBy && b.dragT > G.t - 0.6 || (G.grab && G.grab.body === b);
  let dmg = (h.v - 210) / 45 * Math.min(2.2, 0.35 + m * 0.4); if (b.kind === 'debris') dmg *= 1.3; if (dragged) dmg *= 0.3;
  dmg = Math.min(dmg, dragged ? 4 : b.kind === 'debris' ? 14 : 9); if (dmg < 1.5) return;
  const part = h.p.y < a.y - a.h + 5 ? 'head' : pick(['torso', 'larm', 'rarm']);
  a.hurt(part, dmg, 'blunt', b.kind === 'debris' ? 'Falling rock' : 'Thrown ' + (b.item || b.kind), { x: Math.sign(h.p.x - h.p.ox) || 0, y: 0.5 }); NE.Audio.play('thud');
  if (b.thrownBy && a.onAggro) a.onAggro(b.thrownBy);
};
G.computeEnv = function (p) {
  const W = G.world; const env = {}; if (G.state === 'lobby') return env;
  const b = W.biomeAtY(p.y - 4); env.cold = b.cold || 0; env.heat = b.heat || 0; env.bleedMul = b.bleed || 1; env.infectMul = b.infect || 1; env.thirstMul = b.thirst || 1; env.water = (W.isWater(p.x, p.y - 3) || W.isWater(p.x, p.y - 8)) && !W.isLava(p.x, p.y - 3);
  env.dirtyWater = env.water && b.id !== 'ice';
  let gas = 0; for (const c of G.gas) { const d = NE.dist(c.x, c.y, p.x, p.cy); if (d < c.r) gas += c.d * (1 - d / c.r) * 1.4; }
  if (p.gear.face && p.filterT > 0) gas *= 0.04; env.gas = Math.min(1, gas);
  let rad = 0; let fire = false; let table = false;
  for (const o of G.nearObjs()) { if (o.type === 'rad') { const d = NE.dist(o.x, o.y, p.x, p.cy); if (d < o.r) rad += (1 - d / o.r) * 1.6; } if (o.type === 'fire' && NE.dist(o.x, o.y, p.x, p.y) < 30) fire = true; if (o.type === 'table' && NE.dist(o.x, o.y, p.x, p.y) < 22) table = true; }
  env.rad = rad; env.fire = fire; G.nearTable = table; env.table = table;
  if (rad > 0 && Math.random() < rad * 0.5) NE.Audio.play('geiger', Math.min(1, rad));
  env.dark = !p.light.on && !G.lightAt(p.x, p.cy);
  env.threat = G.actors.some(a => a.alive && a.target === p && NE.dist(a.x, a.y, p.x, p.y) < 140);
  const tf = G.inTown(); if (tf) { env.town = true; env.dark = false; }
  env.sprint = p.sprint;
  return env;
};
G.handleAnatEvents = function (p) {
  const A = p.anat;
  for (const e of A.ev) {
    if (e === 'bleed') G.say(pick(NE.MONO.bleed), 0.5);
    else if (e === 'artery') { G.sayCD = 0; G.say(pick(NE.MONO.artery)); G.log('Arterial bleeding! Tourniquet it.', 'bad'); }
    else if (e === 'fracture') { G.sayCD = 0; G.say(pick(NE.MONO.fracture)); G.shake(3); G.log('Bone fractured.', 'bad'); }
    else if (e === 'uncon') { G.log('You black out...', 'bad'); NE.Audio.play('death'); }
    else if (e === 'wake') { G.say(pick(NE.MONO.wake)); }
    else if (e === 'vomit') { G.toast('You vomit.'); for (let i = 0; i < 10; i++) G.addP(p.x + p.facing * 2, p.y - 12, p.facing * rf(10, 40), rf(-10, 20), 0.8, '#8a8a40', 'blood'); }
    else if (e === 'gas') G.say(pick(NE.MONO.gas), 0.5);
    else if (e === 'rad') G.say(pick(NE.MONO.rad), 0.6);
  }
  A.ev.length = 0;
  const per = (k, cond, lines, every) => { G.monoT[k] = (G.monoT[k] || 0) - 1 / 60; if (cond && G.monoT[k] <= 0) { G.monoT[k] = every; G.say(pick(lines), 0.7); } };
  per('lb', A.blood < 3600, NE.MONO.lowblood, 30); per('hu', A.hunger < 20, NE.MONO.hungry, 60); per('th', A.thirst < 20, NE.MONO.thirsty, 60);
  per('co', A.temp < 35.6, NE.MONO.cold, 40); per('ht', A.temp > 38.4 && A.infection < 35, NE.MONO.heat, 45); per('pa', A.pain > A.threshold, NE.MONO.pain, 15); per('in', A.infection > 40, NE.MONO.infection, 60); per('dk', G.env.dark, NE.MONO.dark, 90);
  if (A.bleeding > 0.4 && Math.random() < A.bleeding * 0.02) { G.addP(p.x + rf(-2, 2), p.y - rf(4, 10), rf(-5, 5), 0, 1, '#7a0e0e', 'blood'); }
  if (A.blood < 3200 && Math.random() < 0.016) NE.Audio.play('heart', clamp((3800 - A.blood) / 1500, 0.3, 1));
  if (A.stam < 15 && Math.random() < 0.02) NE.Audio.play('breath', 0.8);
};
G.hazards = function (p, dt) {
  const W = G.world; const tx = Math.floor(p.x / T), ty = Math.floor((p.y - 1) / T);
  // glass shards
  if (W.get(tx, ty) === TLs() && Math.abs(p.vx) > 22 && p.onGround) { if (Math.random() < dt * (p.sprint ? 2.5 : 1.2)) { p.hurt(p.crawl ? pick(['larm', 'rarm', 'torso']) : pick(['lleg', 'rleg']), rf(3, 6), 'glass', 'Glass shards'); NE.Audio.play('glass'); G.say('Glass—!', 0.5); } }
  // crumbling floor
  const fy = Math.floor((p.y + 1) / T); for (const xx of [p.x - 2, p.x + 2]) { const cx = Math.floor(xx / T); if (p.onGround && W.get(cx, fy) === 6) { const k = cx + ',' + fy; const v = (W.crumble.get(k) || 0) + dt; W.crumble.set(k, v); if (v > 0.7) { W.setMod(cx, fy, 0); W.crumble.delete(k); NE.Audio.play('crack'); G.dust(cx * T + 4, fy * T, 8); G.phys.box('debris', cx * T + 4, fy * T + 4, 5, 4, 2, W.biomeAtY(fy * T).pal.tile); } } }
};
function TLs() { return 4; }
G.nearObjs = function () {
  const W = G.world; if (!W) return []; if (W.lobby) return W.floors[0].objs;
  const fi = G.floorIdx(G.player ? G.player.y - 2 : 0); const out = []; for (let f = fi - 1; f <= fi + 1; f++) { const fl = W.floors[f]; if (fl) for (const o of fl.objs) out.push(o); }
  for (const o of G.dyn) out.push(o); return out;
};
G.updateObjects = function (dt) {
  const p = G.player;
  for (const o of G.nearObjs()) {
    if (o.type === 'vent') { o.t += dt; const ph = o.t % o.period; o.active = ph < 1.4; if (o.active) { if (Math.random() < dt * 40) G.addP(o.x + rf(-2, 2), o.y - 2, rf(-6, 6), rf(-90, -50), rf(0.4, 0.8), 'rgba(220,230,235,0.5)', 'steam', -0.15); if (ph < dt * 1.5) NE.Audio.play('hiss', NE.dist(o.x, o.y, p.x, p.y) < 150 ? 0.8 : 0.1); for (const a of G.actors) if (a.alive && Math.abs(a.x - o.x) < 6 && a.y <= o.y + 1 && a.y > o.y - 44) { a.inFire = 0.15; a.vy -= 20; } } }
    else if (o.type === 'icicle' && o.armed) { if (Math.abs(p.x - o.x) < 7 && p.y > o.y && p.y - o.y < 110) { o.armed = false; o.dropT = 0.45; NE.Audio.play('crack'); } }
    else if (o.type === 'icicle' && o.dropT > 0) { o.dropT -= dt; if (o.dropT <= 0) { o.type = 'dead'; const b = G.phys.stick('debris', o.x, o.y + 4, 6, Math.PI / 2, 1.5, 2.5); b.kind = 'debris'; b.color = '#cfeeff'; b.setVel(0, 60); } }
    else if (o.type === 'gasleak') { o.t -= dt; if (o.t <= 0) { o.t = rf(2.5, 4); G.gas.push({ spore: !!o.spore, x: o.x + rf(-6, 6), y: o.y + 8, r: 8, d: o.spore ? 0.4 : 0.55, vx: rf(-5, 5), life: 28, max: 34 }); } if (Math.random() < dt * 4) G.addP(o.x, o.y, rf(-10, 10), rf(5, 20), 0.6, o.spore ? 'rgba(200,210,120,0.6)' : 'rgba(160,200,90,0.5)', 'steam', 0); }
    else if (o.type === 'ember' && Math.random() < dt * 3) G.addP(o.x + rf(-3, 3), o.y - 2, rf(-5, 5), rf(-40, -15), rf(0.6, 1.2), pick(['#ff6020', '#ffa040']), 'spark', -0.2);
    else if (o.type === 'lamp' && o.flick) { o.flk = Math.random() < o.flick * 0.08 ? rf(0, 0.3) : Math.min(1, (o.flk || 1) + dt * 4); }
    else if (o.type === 'beacon') { o.t = (o.t || 0) + dt; if (o.t % 4 < dt) { if (NE.dist(o.x, o.y, p.x, p.y) < 260) NE.Audio.play('chime'); } if (NE.dist(o.x, o.y, p.x, p.y) < 22 && !o.done) G.triggerBeacon(o); }
    else if (o.type === 'standoff' && !o.done && G.state === 'run') { if (o.grp.every(e => !e.alive)) o.done = true; else if (NE.dist(o.x, o.y, p.x, p.y) < 70 && Math.abs(o.y - p.y) < 14) { o.done = true; NE.UI.standoff(o); } }
    else if (o.type === 'fire' && Math.random() < dt * 14) G.addP(o.x + rf(-3, 3), o.y - 2, rf(-6, 6), rf(-40, -20), rf(0.3, 0.6), pick(['#ff6020', '#ffb040', '#ffe080']), 'spark', -0.3);
  }
  
};

// ---------------- combat ray ----------------
G.fireRay = function (sh, ox, oy, dx, dy, range, dmg, snd) {
  NE.Audio.play(snd); G.noise(ox, oy, 260); G.muzzle = { x: ox, y: oy, t: 0.06 };
  const W = G.world; let ex = ox + dx * range, ey = oy + dy * range; const name = sh.isPlayer ? sh.surv.first : sh.D ? sh.D.name : 'Gunfire';
  for (let d = 2; d < range; d += 2) {
    const px = ox + dx * d, py = oy + dy * d;
    if (W.solidAt(px, py)) { ex = px; ey = py; G.sparks(px - dx * 2, py - dy * 2, 5); break; }
    let hit = null; for (const a of G.actors) { if (a === sh || !a.alive || (sh.isPlayer && (a.isRemote || a.town)) || (sh.isRemote && a.isPlayer)) continue; if (a.contains(px, py, 0.5)) { hit = a; break; } }
    if (hit) { const part = hit.partNear(px, py); hit.hurt(part, dmg * (part === 'head' ? 1.5 : 1), 'bullet', name, { x: dx, y: dy }); if (hit.onAggro) hit.onAggro(sh); ex = px; ey = py; if (hit.isPlayer) G.shake(3); break; }
  }
  G.phys.impulse(ex, ey, 6, 220);
  G.tracers.push({ x1: ox, y1: oy, x2: ex, y2: ey, t: 0.05 });
  if (G.net && G.net.on && !sh.isPuppet) G.net.send({ t: 'shot', x1: ox, y1: oy, x2: ex, y2: ey, snd });
};
G.explode = function (x, y, power, remote) {
  power = power || 1; NE.Audio.play('boom'); G.shake(6 * power); G.phys.impulse(x, y, 60 * power, 900); G.sparks(x, y, 30); G.dust(x, y, 26); G.noise(x, y, 300);
  for (let i = 0; i < 14; i++) G.addP(x, y, rf(-60, 60), rf(-60, 20), rf(0.5, 1.2), pick(['#ffd060', '#ff8020', '#fff0b0']), 'spark', 0.3);
  // blow the rock apart (each side does this; the result is identical)
  const W = G.world; if (W && !W.lobby) { const R = 2.6 * power, tx0 = Math.floor(x / T), ty0 = Math.floor(y / T); for (let ty = Math.floor(ty0 - R); ty <= ty0 + R; ty++) for (let tx = Math.floor(tx0 - R); tx <= tx0 + R; tx++) { const d = Math.hypot(tx + 0.5 - x / T, ty + 0.5 - y / T); if (d > R) continue; const t = W.get(tx, ty); if (!W.diggable(tx, ty)) continue; if (W.damageTile(tx, ty, (R - d + 1) * 6) === 'broke' && chance(0.35)) { const db = G.phys.box('debris', tx * T + 4, ty * T + 4, rf(3, 5), rf(3, 4), 2.5, W.biomeAtY(ty * T).pal.tile); db.setVel((tx * T - x) * 4, (ty * T - y) * 4 - 60); db.noActor = true; setTimeout(() => db.noActor = false, 600); } } }
  for (const a of G.actors) { if (!a.alive || a.isPuppet || a.isRemote) continue; const d = NE.dist(a.x, a.cy, x, y); const rr = 45 * power; if (d < rr) { const k = 1 - d / rr; for (let i = 0; i < 3; i++) a.hurt(pick(NE.PARTS), 14 * k + 4, 'frag', 'Explosion', { x: (a.x - x) / (d || 1), y: -0.5 }); a.vy -= 120 * k; a.vx += (a.x - x) / (d || 1) * 120 * k; } }
  if (G.goop && NE.dist(G.goop.x, G.goop.y, x, y) < 40) G.goop.vy -= 150;
};
// mining: pickaxe / ice axe / rock hammer chip at the rock under the cursor
G.tryDig = function (pl, w) {
  const W = G.world; if (W.lobby) return false; const m = G.mouse; const hx = pl.x, hy = pl.y - pl.h * 0.6;
  let dx = m.wx - hx, dy = m.wy - hy; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
  let tx = -1, ty = -1; for (let d = 2; d <= 15; d += 1) { const px = hx + dx * d, py = hy + dy * d; if (W.solidAt(px, py) || W.get(Math.floor(px / T), Math.floor(py / T)) === 4) { tx = Math.floor(px / T); ty = Math.floor(py / T); break; } }
  if (tx < 0) return false; if (G.actors.some(a => a !== pl && a.alive && !a.town && NE.dist(a.x, a.cy, hx, hy) < 16 && (a.x - hx) * dx > 0)) return false;
  if (!W.diggable(tx, ty)) { G.toast('Too hard to break.'); NE.Audio.play('deny'); return true; }
  const t = W.get(tx, ty); const res = W.damageTile(tx, ty, w.dig * (pl.stats.melee || 1));
  const cx = tx * T + 4, cy = ty * T + 4; const col = t === 10 ? '#cfeeff' : W.biomeAtY(cy).pal.tile;
  for (let i = 0; i < 6; i++) G.addP(cx - dx * 4, cy - dy * 4, rf(-50, 50) - dx * 30, rf(-60, 10), rf(0.3, 0.7), i % 2 ? col : NE.shade(col, 1.4), 'spark', 1); G.noise(cx, cy, 70);
  if (res === 'broke') { NE.Audio.play('crack'); G.dust(cx, cy + 3, 8); if (chance(0.25)) { const left = pl.inv.add('brick', 1); if (!left) G.toast('+1 Rock'); } if (t === 4) G.toast('Shattered the crystal shards.'); }
  else NE.Audio.play('hit', 0.6);
  return true;
};

// ---------------- interaction ----------------
G.interactTarget = function () {
  const p = G.player; let best = null, bd = 16;
  for (const o of G.nearObjs()) { if (!o.act) continue; if (o.type === 'forage') o.label = 'Forage ' + NE.ITEMS[o.item].name; if (o.type === 'container' && o.actor && o.actor.rag) { const c = o.actor.rag.pts[2]; o.x = c.x; o.y = c.y + 3; } const dx = Math.abs(o.x - p.x), dy = Math.abs(o.y - p.y); if (dy > 14) continue; const r = o.type === 'elevator' ? 24 : 14; if (dx < r && dx < bd + (o.type === 'elevator' ? 10 : 0)) { bd = dx; best = o; } }
  for (const a of G.actors) { if (!a.isNPC || !a.alive || a.leaving || a.isPuppet) continue; const dx = Math.abs(a.x - p.x); if (dx < 14 && Math.abs(a.y - p.y) < 14 && dx < bd) { bd = dx; best = a; } }
  return best;
};
G.interact = function () {
  const p = G.player; const o = G.interactTarget(); if (!o) return; const UI = NE.UI;
  switch (o.act) {
    case 'skills': return UI.open('skills');
    case 'wardrobe': return UI.open('wardrobe');
    case 'shop': return UI.open('shop');
    case 'dossier': return UI.open('dossier');
    case 'descend': return UI.liftPrompt();
    case 'arrival': return G.toast('The lift only goes down. Up is not an option anymore.');
    case 'post': return UI.deepPost();
    case 'rest': return G.rest();
    case 'doctor': return UI.doctor(o);
    case 'chat': { const line = NE.withSeed(NE.hash(o.x | 0, (G.t * 3) | 0) * 1e9, () => pick(NE.TOWN_LINES)); o.sayT = 3; o.line = line; G.toast(o.name + ': "' + line + '"'); NE.Audio.play('ui'); return; }
    case 'harvest': return G.harvestRelic(o);
    case 'table': G.toast('Surgical table: treatments are faster and hurt less here.'); return UI.open('health');
    case 'drink': if (o.uses > 0) { o.uses--; p.anat.thirst = Math.min(100, p.anat.thirst + 40); G.toast('Clean water. (' + o.uses + ' left)'); NE.Audio.play('splash'); } else G.toast('Dispenser is dry.'); return;
    case 'fire': G.toast('Warmth. You can boil water here.'); return UI.open('craft');
    case 'craft': return UI.open('craft');
    case 'talk': return UI.survivor(o);
    case 'trade': return UI.open('trade', o);
    case 'search': return G.beginSearch(o);
    case 'pick': { const left = p.inv.add(o.item, 1); if (left) return G.toast('Backpack full.'); o.type = 'dead'; o.act = null; NE.Audio.play('rummage'); G.toast('Foraged: ' + NE.ITEMS[o.item].name + '.'); return; }
  }
};
G.station = function (kind) { const p = G.player; for (const o of G.nearObjs()) { if (NE.dist(o.x, o.y, p.x, p.y) > 34) continue; if (kind === 'fire' && o.type === 'fire') return true; if (kind === 'workbench' && o.type === 'bench') return true; } return false; };
G.beginSearch = function (o) {
  const p = G.player; const C = NE.CONTAINERS[o.ct];
  if (o.searched) return NE.UI.open('loot', o);
  let dur = C.search * p.stats.search; o.breach = null;
  if (o.locked) {
    const sec = o.locked === 'security'; const hasCrow = p.inv.has('crowbar');
    const tool = sec ? (p.inv.has('keycard') ? 'keycard' : hasCrow ? 'crowbar' : p.inv.has('lockpick') ? 'lockpick' : null) : (p.inv.has('lockpick') ? 'lockpick' : hasCrow ? 'crowbar' : null);
    if (!tool) { NE.Audio.play('deny'); return G.toast('Locked. Needs ' + (sec ? 'a keycard, crowbar or lockpick.' : 'a lockpick or crowbar.')); }
    o.breach = tool; dur += tool === 'keycard' ? 0.6 : 1.6; G.toast(tool === 'crowbar' ? 'Prying it open...' : tool === 'keycard' ? 'Swiping keycard...' : 'Picking the lock...');
  }
  NE.Audio.play('open_' + (C.sound || 'wood')); p.search = { obj: o, t: 0, dur };
};
G.finishSearch = function (o) {
  if (o.type === 'relic') return G.finishRelic(o);
  const p = G.player; const sec = o.locked === 'security';
  if (o.breach) {
    const tool = o.breach; o.breach = null; let ok;
    if (tool === 'keycard') { ok = true; p.inv.consume('keycard'); }
    else if (tool === 'crowbar') { ok = chance(sec ? 0.55 : 0.9); G.noise(p.x, p.y, 140); NE.Audio.play('hit'); }
    else { ok = chance(sec ? 0.35 : 0.75); if (chance(0.3)) { p.inv.consume('lockpick'); G.toast('The lockpick snapped.'); } }
    if (!ok) { NE.Audio.play('deny'); return G.toast('Couldn\'t get it open. Try again.'); }
    o.locked = null; NE.Audio.play('open_metal');
  }
  if (o.trap) { const tr = o.trap; o.trap = null; if (tr === 'needle') { p.hurt(pick(['larm', 'rarm']), 6, 'frag', 'Needle trap'); p.anat.tox += 25; G.log('A needle trap! Something was on it...', 'bad'); } else { G.log('Tripwire—!', 'bad'); G.explode(o.x, o.y - 4); } }
  if (!o.items) o.items = NE.withSeed((G.world.seed ^ Math.imul(o.x | 0, 7919) ^ Math.imul(o.y | 0, 104729)) >>> 0, () => G.genLoot(o));
  o.searched = true; if (G.net && G.net.on) G.net.syncContainer(o); if (o.triage && !G.run.triage) { G.run.triage = true; G.log('Searched a Quarantine Triage Tent.', 'good'); }
  NE.UI.open('loot', o);
};
G.genLoot = function (o) {
  const C = NE.CONTAINERS[o.ct]; const items = []; const depth = o.depth || 0; let n = ri(C.n[0], C.n[1]) + (depth > 500 && chance(0.5) ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const tab = NE.LOOT[NE.wpick(C.tables)]; const list = tab.filter(e => !e[2] || e[2] <= depth).map(e => [e[0], e[1] * (e[2] ? 1 + depth / 1200 : 1)]); const id = NE.wpick(list); const it = NE.ITEMS[id];
    const e = { id, n: it.stack ? (it.cat === 'ammo' ? ri(4, 12) : id === 'scrap' ? ri(1, 3) : 1) : (it.uses || 1) }; if (it.dur) e.dur = Math.round(it.dur * rf(0.4, 1)); if (it.gun) e.mag = ri(0, 3);
    items.push(e);
  }
  return items;
};
G.dropEntry = function (e) { const p = G.player; p.inv.remove(e); if (p.equip.weapon === e) p.equip.weapon = null; const near = G.dyn.find(o => o.ct === 'bag' && NE.dist(o.x, o.y, p.x, p.y) < 12); if (near) near.items.push(e); else G.dyn.push({ type: 'container', ct: 'bag', x: p.x, y: p.y, label: 'Dropped Bag', act: 'search', items: [e], searched: true }); };
G.onEnemyDeath = function (e, cause) {
  if (!e.alive) return; e.die(cause);
  const byPlayer = G.player && e.anat.lastHit === G.player.surv.first;
  if (byPlayer && G.run) { G.run.kills++; if (e.type === 'specops') G.run.specops = true; G.say(pick(NE.MONO.kill), 0.6); }
  const items = e.dropLoot ? e.dropLoot() : (e.kind === 'trader' ? (e.stock || []).map(s => ({ id: s.id, n: s.n })) : [{ id: 'rag', n: 1 }, { id: 'trinket', n: 1 }]);
  e.gear = {};
  G.dyn.push({ type: 'container', ct: 'corpse', actor: e, x: e.x, y: e.y, label: (e.D ? e.D.name : e.name || 'Body') + ' (body)', act: 'search', items, searched: false, depth: 0 });
};
G.standoffBreak = function (e) { for (const o of G.nearObjs()) if (o.type === 'standoff' && o.grp.includes(e)) { o.done = true; for (const x of o.grp) { x.hostile = true; x.guard = false; } } };

// ---------------- traders ----------------
NE.PRICE = { pickaxe: 28, dynamite: 22, nectar: 140, bandage: 8, suture: 16, morphine: 30, bloodbag: 40, antibiotics: 22, antirad: 24, adrenaline: 26, painkillers: 12, water: 8, ration: 10, splint: 10, tourniquet: 12, forceps: 14, ammo9: 1.5, ammo762: 3, pistol: 60, rifle: 120, keycard: 30, respirator: 30, filter: 10, platevest: 90, milhelmet: 60, battery: 6, flare: 6, antiseptic: 10, lockpick: 6, axe: 30, crowbar: 18 };
G.traderStock = function (depth, med) {
  if (med) { const pool = ['bandage', 'bandage', 'suture', 'splint', 'antiseptic', 'antibiotics', 'painkillers', 'morphine', 'bloodbag', 'tourniquet', 'forceps', 'antirad']; const out = []; const used = new Set(); for (let i = 0; i < 6; i++) { const id = pick(pool); if (used.has(id)) continue; used.add(id); const it = NE.ITEMS[id]; out.push({ id, n: it.uses || 1, price: Math.ceil(NE.PRICE[id] * 0.9) }); } return out; }
  const pool = ['pickaxe', 'dynamite', 'bandage', 'suture', 'morphine', 'bloodbag', 'antibiotics', 'painkillers', 'water', 'ration', 'splint', 'tourniquet', 'forceps', 'ammo9', 'battery', 'filter', 'antiseptic', 'keycard', 'lockpick'];
  if (depth > 700) pool.push('ammo762', 'antirad', 'adrenaline', 'rifle', 'platevest', 'milhelmet'); else pool.push('pistol', 'respirator', 'crowbar', 'axe');
  const out = []; const used = new Set(); for (let i = 0; i < 6; i++) { const id = pick(pool); if (used.has(id)) continue; used.add(id); const it = NE.ITEMS[id]; out.push({ id, n: it.stack ? (it.cat === 'ammo' ? 10 : 1) : (it.uses || 1), price: Math.ceil(NE.PRICE[id] * (it.cat === 'ammo' ? 10 : 1)) }); }
  return out;
};
G.tradeValue = function (inv) { let v = 0; for (const e of inv.items) { const it = NE.ITEMS[e.id]; if (it.value && e.id !== 'datashard') v += it.value * e.n; } return v; };
G.payValue = function (inv, price) {
  for (const id of ['trinket', 'scrap', 'tape', 'ammo762', 'ammo9']) { while (price > 0 && inv.count(id) > 0) { inv.consume(id, 1); price -= NE.ITEMS[id].value; } }
  return price <= 0;
};

// ---------------- events ----------------
G.events = function (dt) {
  if (G.state !== 'run') return; G.eventT -= dt; if (G.eventT > 0) return; G.eventT = rf(65, 125);
  const p = G.player, fl = G.curFloor(); const b = fl.biome; if (fl.f === 0 || fl.town || !p.alive) { G.eventT = 20; return; }
  const guest = G.net && G.net.on && G.net.role === 'guest';
  const ev = NE.wpick([['cavein', b.id === 'desert' ? 4.5 : 3], ['blackout', 2], ['gas', b.id === 'grotto' ? 0.8 : 0.6], ['beacon', guest ? 0 : 2.2], ['ambush', guest ? 0 : 1.8 + fl.depth / 500]]);
  if (ev === 'cavein') {
    G.log('The ceiling groans... CAVE-IN!', 'bad'); NE.Audio.play('rumble'); G.shake(5); G.shakeT = 1.6;
    const n = ri(6, 10); for (let i = 0; i < n; i++) { const x = clamp(p.x + rf(-60, 60), 3 * T, (G.world.W - 3) * T); setTimeout(() => { if (G.state !== 'run') return; const d = G.phys.box('debris', x, G.world.ceilY(fl, x) + 5, rf(3, 7), rf(3, 6), 2.5, b.pal.tile); d.setVel(rf(-20, 20), rf(30, 80)); G.dust(x, G.world.ceilY(fl, x) + 6, 5); }, i * 110 + rf(0, 300)); }
  } else if (ev === 'blackout') { G.blackout = rf(28, 45); G.log('A cold draft snuffs every lantern. Total darkness.', 'bad'); NE.Audio.play('hiss', 0.6); }
  else if (ev === 'gas') { G.log(b.id === 'grotto' ? 'A fungal bloom bursts — SPORES!' : 'A pocket of cave gas vents — GAS!', 'bad'); NE.Audio.play('hiss', 1); const side = chance(0.5) ? 4 : G.world.W - 4; for (let i = 0; i < 6; i++) G.gas.push({ spore: b.id === 'grotto', x: side * T + (side < 10 ? i : -i) * 9, y: G.world.groundY(fl, side * T) - 10, r: 12, d: 0.8, vx: side < 10 ? 9 : -9, life: rf(35, 50), max: 40 }); }
  else if (ev === 'beacon') {
    const tf = G.world.floors[fl.f + ri(1, 2)]; if (!tf) return; const x = ri(6, G.world.W - 6) * T;
    tf.objs.push({ type: 'beacon', x, y: G.world.groundY(tf, x), trap: chance(0.35), t: 0, label: 'Distress Beacon' }); NE.Audio.play('chime');
    G.log('A flare-beacon\'s chirp echoes from below (~' + Math.round(tf.depth) + 'm).', 'sys');
  } else if (ev === 'ambush') {
    const x = p.x > G.world.W * T / 2 ? 5 * T : (G.world.W - 5) * T; const k = ri(1, 2) + (fl.depth > 500 ? 1 : 0);
    for (let i = 0; i < k; i++) { const e = new NE.Enemy(G, x + i * 10, G.world.groundY(fl, x + i * 10), NE.wpick(b.enemies), fl.depth); e.target = p; e.state = 'chase'; e.lastSeen = { x: p.x, y: p.y }; G.actors.push(e); }
    G.log('Footsteps. Lots of them. Coming this way.', 'bad');
  }
};
G.triggerBeacon = function (o) {
  o.done = true; o.type = 'dead';
  if (o.trap) { G.log('It\'s a TRAP — the beacon was bait!', 'bad'); for (let i = 0; i < ri(2, 3); i++) { const e = new NE.Enemy(G, o.x + rf(-50, 50), o.y, pick(['scav', 'scav', 'gunner']), 300); e.target = G.player; e.state = 'chase'; e.lastSeen = { x: o.x, y: o.y }; G.actors.push(e); } }
  else { G.log('A sealed supply pod. Untouched.', 'good'); const fl = G.world.floors[G.floorIdx(o.y - 2)]; const c = G.world.container('pod', o.x, o.y, fl.depth + 200); c.trap = null; c.locked = null; fl.objs.push(c); G.dust(o.x, o.y, 10); }
};
G.depthTrack = function (p) {
  const d = NE.depthOfY(p.y); const R = G.run; if (d > R.maxDepth) R.maxDepth = d;
  const fl = G.curFloor(); const key = fl ? (fl.town ? 'town:' + fl.f : fl.biome.id) : null;
  if (fl && R.biome !== key) {
    if (fl.town) { NE.UI.banner(fl.town.name, Math.round(fl.depth) + 'm — a town. Rest, trade and send your finds topside.'); if (!R.towns.includes(fl.f)) { R.towns.push(fl.f); G.log('Reached the town of ' + fl.town.name + ' (' + Math.round(fl.depth) + 'm).', 'good'); G.say(pick(NE.MONO.town), 0.9); G.autosave(); } }
    else if (R.biome && !String(R.biome).startsWith('town') && R.biome !== fl.biome.id || (R.biome && String(R.biome).startsWith('town') && R.lastBiome !== fl.biome.id)) { NE.UI.banner(fl.biome.name, Math.round(fl.depth) + 'm — ' + fl.biome.challenge); G.log('Entered ' + fl.biome.name + '.', 'sys'); G.log('Perk: ' + fl.biome.perk, 'good'); G.log('Danger: ' + fl.biome.challenge, 'bad'); G.say(pick(NE.MONO.biome), 0.8); }
    R.biome = key; if (!fl.town) R.lastBiome = fl.biome.id; G.musicFor();
  }
  const m = Math.floor(R.maxDepth / 250); if (m > R.milestone) { R.milestone = m; if (m > 0) G.log('MILESTONE: ' + m * 250 + 'm. The Hive is pleased.', 'good'); }
  if (fl && fl.medic && !fl.medicSaid && Math.abs(p.x - (fl.poi.x0 + fl.poi.x1) / 2) < 70) { fl.medicSaid = true; G.say(NE.MONO.medic[0]); }
  if (fl) { R.floors = Math.max(R.floors, fl.f + 1); for (const o of fl.objs) if (o.type === 'relic' && !o.seen && NE.dist(o.x, o.y, p.x, p.y) < 90) { o.seen = true; G.say(pick(NE.MONO.relic), 1); } }
  p.infest = G.infestLevel();
};
G.markSeen = function (p, dt) {
  G.seenT = (G.seenT || 0) - dt; if (G.seenT > 0) return; G.seenT = 0.25; const W = G.world; const ptx = Math.floor(p.x / T), pty = Math.floor(p.y / T); const R = Math.round(12 * p.stats.sight * (p.light.on ? 1.2 : 0.7));
  for (let ty = pty - R; ty <= pty + R; ty++) { const fl = W.floors[Math.floor(ty / NE.FH)]; if (!fl) continue; for (let tx = ptx - R; tx <= ptx + R; tx++) { if (tx < 0 || tx >= W.W) continue; if ((tx - ptx) ** 2 + (ty - pty) ** 2 > R * R) continue; fl.seen[(ty - fl.y0) * W.W + tx] = 1; } }
};
G.playerDeath = function () {
  const p = G.player; p.die(p.anat.cause); NE.UI.closeAll(); G.releaseGrab();
  G.log('Your host died. ' + p.anat.cause + '.', 'bad'); NE.Audio.play('death');
  G.startBurst(p); // the Vespa erupts from the corpse for 10 seconds
};
G.afterDeath = function () {
  const p = G.player; if (G.net && G.net.on && G.net.peer && G.net.peer.alive) return G.startWisp();
  G.endRun(false, p.anat.cause);
};
G.endRun = function (extracted, cause) {
  const R = G.run, p = G.player, M = G.meta; if (!R) return; G.state = 'runend'; G.goop = null; G.wisp = null;
  const depth = Math.round(R.maxDepth);
  let xp = depth * 0.6 + R.kills * 10 + R.treated * 25 + R.milestone * 40 + (R.towns || []).length * 30 + (R.abil || []).length * 25;
  xp = Math.round(xp);
  M.xp += xp; let lv = 0; while (M.xp >= NE.xpForLevel(M.level)) { M.xp -= NE.xpForLevel(M.level); M.level++; M.points++; lv++; }
  const unlocks = [];
  const un = (kind, list) => { for (const o of list) { if (!o.unlock || M.unlocked[kind].includes(o.id)) continue; const u = o.unlock; let ok = false; if (u.type === 'depth') ok = depth >= u.v; if (u.type === 'triage') ok = R.triage; if (u.type === 'specops') ok = R.specops; if (ok) { M.unlocked[kind].push(o.id); unlocks.push(o.name); } } };
  un('backpacks', NE.BACKPACKS); un('outfits', NE.OUTFITS);
  M.best.depth = Math.max(M.best.depth, depth); M.best.time = Math.max(M.best.time, R.t); M.best.kills = Math.max(M.best.kills || 0, R.kills);
  const s = M.survivor; M.cemetery.unshift({ name: s.name, occ: NE.OCCUPATIONS.find(o => o.id === s.occ).name, age: s.age, depth, cause, time: Math.round(R.t), kills: R.kills, extracted: false, date: new Date().toLocaleDateString(), look: s.look, abil: (R.abil || []).slice() });
  if (M.cemetery.length > 60) M.cemetery.length = 60;
  M.survivor = null; M.run = null; G.save();
  if (G.net && G.net.on) G.net.send({ t: 'gone' });
  NE.UI.runEnd({ extracted: false, cause, depth, time: R.t, kills: R.kills, xp, scrap: R.sent || 0, shards: 0, levels: lv, unlocks, name: s.name, treated: R.treated, towns: (R.towns || []).length, abil: R.abil || [] });
};

// ---------------- camera ----------------
G.camera = function (dt) {
  const p = G.player, W = G.world; const F = G.focus(); const look = F === p && p.aimDir ? p.aimDir.x * 22 : 0;
  let tx = F.x - VW / 2 + look, ty = F.y - VH * 0.58 + (F === p && p.aimDir ? p.aimDir.y * 12 : 0);
  const maxX = W.W * T - VW; tx = maxX < 0 ? maxX / 2 : clamp(tx, 0, maxX); if (W.lobby) { const maxY = W.rows.length * T - VH; ty = maxY < 0 ? maxY / 2 : clamp(ty, 0, maxY); } else ty = Math.max(-20, ty);
  G.cam.x = lerp(G.cam.x, tx, Math.min(1, dt * 7)); G.cam.y = lerp(G.cam.y, ty, Math.min(1, dt * 7));
  G.shakeT = Math.max(0, (G.shakeT || 0) - dt); if (G.shakeT > 0) G.cam.shake = Math.max(G.cam.shake, 2.5 * G.meta.settings.shake);
  G.cam.shake = Math.max(0, G.cam.shake - dt * 8);
};

// ---------------- rendering ----------------
G.render = function (dt) {
  const ctx = G.ctx, W = G.world, p = G.player; const F = G.focus(); const fl = W.floorOf(Math.floor((F.y - 2) / T)); const pal = fl.biome.pal;
  const tr = p.anat.tremor(); const sh = G.cam.shake + (G.state === 'run' ? tr * 0.6 : 0);
  const cx = Math.round(G.cam.x + rf(-sh, sh)), cy = Math.round(G.cam.y + rf(-sh, sh));
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, VW, VH);
  ctx.translate(-cx, -cy);
  W.draw(ctx, cx, cy, G.t);
  for (const f of W.visibleFloors(cy)) if (f.dc) ctx.drawImage(f.dc, 0, f.y0 * T);
  for (const o of G.nearObjs()) G.drawObj(ctx, o);
  for (const b of G.phys.bodies) if (b.kind !== 'rag') G.drawBody(ctx, b);
  for (const a of G.actors) if (!a.alive) a.draw(ctx);
  for (const a of G.actors) if (a.alive && a !== p && Math.abs(a.y - F.y) < 260) a.draw(ctx);
  if (p.alive || !G.goop) p.draw(ctx);
  if (G.goop) G.drawGoop(ctx);
  for (const q of G.parts) { if (q.kind === 'glow') continue; ctx.fillStyle = q.col; ctx.globalAlpha = q.kind === 'steam' || q.kind === 'dust' ? Math.min(1, q.life / q.max * 1.5) : 1; ctx.fillRect(Math.round(q.x), Math.round(q.y), 1, 1); }
  ctx.globalAlpha = 1; G.drawAmbient(ctx);
  W.drawWater(ctx, cx, cy, G.t);
  for (const c of G.gas) { ctx.fillStyle = c.spore ? 'rgba(200,200,110,' + (c.d * 0.24) + ')' : 'rgba(150,190,70,' + (c.d * 0.22) + ')'; for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28 + G.t * 0.2; const rr = c.r * (0.4 + 0.6 * NE.hash(i, c.x | 0)); ctx.fillRect(Math.round(c.x + Math.cos(a) * rr * 0.6) - 3, Math.round(c.y + Math.sin(a) * rr * 0.3) - 2, 6, 4); } }
  for (const f of G.fires) { ctx.fillStyle = 'rgba(255,120,30,0.5)'; ctx.fillRect(Math.round(f.x - f.r), Math.round(f.y - 2), Math.round(f.r * 2), 2); }
  for (const t of G.tracers) NE.pline(ctx, t.x1, t.y1, t.x2, t.y2, 1, 'rgba(255,230,160,0.9)');
  // gunner laser telegraph
  for (const a of G.actors) if (a.alive && a.state === 'aim' && a.target) { ctx.globalAlpha = 0.25 + 0.25 * Math.sin(G.t * 30); NE.pline(ctx, a.rag.pts[6].x, a.rag.pts[6].y, a.target.x, a.target.cy, 1, '#ff2020'); ctx.globalAlpha = 1; }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  G.drawLighting(cx, cy, fl);
  // after-light overlays
  ctx.translate(-cx, -cy);
  for (const a of G.actors) if (a.alive && a.state === 'aim' && a.target) { ctx.globalAlpha = 0.35; ctx.fillStyle = '#ff3030'; ctx.fillRect(Math.round(a.target.x), Math.round(a.target.cy), 1, 1); ctx.globalAlpha = 1; }
  if (G.grab) { ctx.fillStyle = '#e8e2d0'; ctx.fillRect(Math.round(G.grab.x) - 1, Math.round(G.grab.y) - 1, 3, 3); }
  G.drawGlow(ctx);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  G.drawFX(dt);
  // crosshair
  if ((p.alive || G.goop) && !NE.UI.panel) { const m = G.mouse; ctx.fillStyle = p.gunOut ? '#e8e2d0' : 'rgba(232,226,208,0.6)'; const g = p.gunOut ? 2 + Math.round(p.anat.tremor() * 4) : 1; ctx.fillRect(Math.round(m.x) - g - 2, Math.round(m.y), 2, 1); ctx.fillRect(Math.round(m.x) + g + 1, Math.round(m.y), 2, 1); ctx.fillRect(Math.round(m.x), Math.round(m.y) - g - 2, 1, 2); ctx.fillRect(Math.round(m.x), Math.round(m.y) + g + 1, 1, 2); }
};
G.drawBody = function (ctx, b) {
  const P = b.pts;
  if (P.length === 4) { ctx.fillStyle = b.color || '#666'; ctx.beginPath(); ctx.moveTo(P[0].x, P[0].y); for (let i = 1; i < 4; i++) ctx.lineTo(P[i].x, P[i].y); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke(); if (b.kind === 'crate') NE.pline(ctx, P[0].x, P[0].y, P[2].x, P[2].y, 1, 'rgba(0,0,0,0.35)'); if (b.kind === 'barrel') NE.pline(ctx, (P[0].x + P[3].x) / 2, (P[0].y + P[3].y) / 2, (P[1].x + P[2].x) / 2, (P[1].y + P[2].y) / 2, 1, 'rgba(0,0,0,0.35)'); }
  else if (P.length === 2) { const col = b.color || { flare: '#d03020', glowstick: '#e0a040', bottle: '#6a9a8a', molotov: '#3a8a40', brick: '#8a8070' }[b.kind] || '#999'; NE.pline(ctx, P[0].x, P[0].y, P[1].x, P[1].y, 1, col); if (b.kind === 'flare' && b.life > 0) { ctx.fillStyle = '#ffe0a0'; ctx.fillRect(Math.round(P[1].x), Math.round(P[1].y), 1, 1); } if (b.kind === 'molotov') { ctx.fillStyle = '#ffa040'; ctx.fillRect(Math.round(P[1].x), Math.round(P[1].y) - 1, 1, 1); } }
};
G.drawObj = function (ctx, o) {
  const x = Math.round(o.x), y = Math.round(o.y); const t = G.t;
  switch (o.type) {
    case 'container': {
      const C = NE.CONTAINERS[o.ct]; if (o.ct === 'corpse') break; const c = C.col || '#666'; const op = o.searched;
      if (o.ct === 'crate') { ctx.fillStyle = c; ctx.fillRect(x - 5, y - 8, 10, 8); ctx.fillStyle = NE.shade(c, 0.6); ctx.fillRect(x - 5, y - 8, 10, 1); ctx.fillRect(x - 5, y - 4, 10, 1); if (op) { ctx.fillStyle = '#1a1410'; ctx.fillRect(x - 4, y - 9, 8, 1); } }
      else if (o.ct === 'locker' || o.ct === 'cabinet') { const h = o.ct === 'cabinet' ? 9 : 15; const yy = o.ct === 'cabinet' ? y - 18 : y - h; ctx.fillStyle = c; ctx.fillRect(x - 4, yy, 8, h); ctx.fillStyle = NE.shade(c, 0.6); ctx.fillRect(x, yy, 1, h); if (o.ct === 'cabinet') { ctx.fillStyle = '#c02020'; ctx.fillRect(x - 2, yy + 3, 1, 3); ctx.fillRect(x - 3, yy + 4, 3, 1); } if (op) { ctx.fillStyle = '#111'; ctx.fillRect(x + 1, yy + 1, 3, h - 2); } }
      else if (o.ct === 'duffel' || o.ct === 'bag') { ctx.fillStyle = c; ctx.fillRect(x - 4, y - 4, 9, 4); ctx.fillRect(x - 3, y - 5, 7, 1); if (o.ct === 'duffel') { ctx.fillStyle = '#e8e2d0'; ctx.fillRect(x, y - 3, 1, 2); } }
      else if (o.ct === 'weaponchest') { ctx.fillStyle = c; ctx.fillRect(x - 7, y - 7, 14, 7); ctx.fillStyle = '#6a7060'; ctx.fillRect(x - 7, y - 7, 14, 1); ctx.fillStyle = o.locked ? '#e0c050' : '#555'; ctx.fillRect(x - 1, y - 5, 2, 2); }
      else if (o.ct === 'stash') { ctx.fillStyle = c; ctx.fillRect(x - 3, y - 4, 7, 4); }
      else if (o.ct === 'pod') { ctx.fillStyle = c; ctx.fillRect(x - 5, y - 12, 10, 12); ctx.fillStyle = '#c03020'; ctx.fillRect(x - 5, y - 8, 10, 2); ctx.fillStyle = (t * 2 | 0) % 2 ? '#ff4030' : '#601810'; ctx.fillRect(x - 1, y - 13, 2, 1); }
      if (o.locked && o.ct !== 'weaponchest') { ctx.fillStyle = '#e0c050'; ctx.fillRect(x - 1, y - 6, 2, 2); }
      if (!o.searched && G.player && G.state === 'run') { const r = 40 * G.player.stats.loot; if (NE.dist(x, y, G.player.x, G.player.y) < r) { ctx.fillStyle = 'rgba(232,226,208,' + (0.4 + 0.3 * Math.sin(t * 4)) + ')'; ctx.fillRect(x, y - 16 - (o.ct === 'cabinet' ? 6 : 0), 1, 1); } }
      break;
    }
    case 'lamp': { const on = o.on && G.blackout <= 0; ctx.fillStyle = '#5a4a30'; ctx.fillRect(x, y - 1, 1, 4); ctx.fillStyle = '#2a2420'; ctx.fillRect(x - 1, y + 3, 3, 1); ctx.fillRect(x - 1, y + 7, 3, 1); ctx.fillStyle = on && (o.flk == null || o.flk > 0.5) ? o.col : '#3a3430'; ctx.fillRect(x - 1, y + 4, 3, 3); break; }
    case 'table': ctx.fillStyle = '#9aa4a8'; ctx.fillRect(x - 9, y - 6, 18, 2); ctx.fillStyle = '#5a6468'; ctx.fillRect(x - 8, y - 4, 1, 4); ctx.fillRect(x + 7, y - 4, 1, 4); ctx.fillStyle = '#e0e8ff'; ctx.fillRect(x - 3, y - 14, 6, 1); break;
    case 'dispenser': ctx.fillStyle = '#6a8aa0'; ctx.fillRect(x - 3, y - 14, 6, 6); ctx.fillStyle = '#d0d8e0'; ctx.fillRect(x - 3, y - 8, 6, 8); ctx.fillStyle = '#3a6ab0'; ctx.fillRect(x - 1, y - 6, 2, 1); break;
    case 'fire': { ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x - 5, y - 2, 10, 2); const f = Math.sin(t * 20) > 0 ? 1 : 0; ctx.fillStyle = '#ff6020'; ctx.fillRect(x - 3, y - 5 - f, 6, 3 + f); ctx.fillStyle = '#ffd060'; ctx.fillRect(x - 1, y - 6 + f, 2, 3); break; }
    case 'bench': ctx.fillStyle = '#5a4030'; ctx.fillRect(x - 8, y - 7, 16, 2); ctx.fillRect(x - 7, y - 5, 1, 5); ctx.fillRect(x + 6, y - 5, 1, 5); ctx.fillStyle = '#8a8f94'; ctx.fillRect(x - 4, y - 9, 3, 2); ctx.fillRect(x + 2, y - 8, 4, 1); break;
    case 'console': ctx.fillStyle = '#2a2e30'; ctx.fillRect(x - 6, y - 10, 12, 10); ctx.fillStyle = (t * 3 | 0) % 2 ? '#40ff70' : '#209040'; ctx.fillRect(x - 4, y - 8, 8, 3); break;
    case 'reactor': ctx.fillStyle = '#2a3a2e'; ctx.fillRect(x - 6, y - 22, 12, 22); ctx.fillStyle = 'rgba(120,255,140,' + (0.5 + 0.3 * Math.sin(t * 3)) + ')'; ctx.fillRect(x - 2, y - 18, 4, 14); break;
    case 'rad': ctx.fillStyle = '#c0b020'; ctx.fillRect(x - 3, y - 26, 7, 7); ctx.fillStyle = '#111'; ctx.fillRect(x, y - 25, 1, 2); ctx.fillRect(x - 2, y - 22, 2, 1); ctx.fillRect(x + 1, y - 22, 2, 1); break;
    case 'vent': break;
    case 'icicle': { ctx.fillStyle = '#cfeeff'; const sh = o.dropT > 0 ? Math.round(rf(-1, 1)) : 0; ctx.fillRect(x - 1 + sh, y - 1, 3, 3); ctx.fillRect(x + sh, y + 2, 1, 4); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1 + sh, y - 1, 1, 2); break; }
    case 'glowshroom': { const p2 = 0.7 + 0.3 * Math.sin(t * 2 + x); ctx.fillStyle = '#d8e8c8'; ctx.fillRect(x, y - 3, 1, 3); ctx.fillRect(x + 3, y - 2, 1, 2); ctx.fillStyle = 'rgba(90,255,200,' + p2 + ')'; ctx.fillRect(x - 1, y - 5, 3, 2); ctx.fillRect(x + 2, y - 3, 3, 1); break; }
    case 'crystal': { ctx.fillStyle = o.col; if (o.ceil) { ctx.fillRect(x - 1, y - 1, 3, 3); ctx.fillRect(x, y + 2, 1, 4); ctx.fillRect(x + 2, y, 1, 3); } else { ctx.fillRect(x, y - 7, 2, 7); ctx.fillRect(x - 2, y - 4, 2, 4); ctx.fillRect(x + 2, y - 5, 2, 5); } ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(x, o.ceil ? y : y - 6, 1, 2); break; }
    case 'ember': ctx.fillStyle = '#ff7020'; ctx.fillRect(x - 2, y - 1, 5, 1); ctx.fillStyle = '#ffd060'; ctx.fillRect(x, y - 2, 1, 1); break;
    case 'forage': { const ic = NE.icon(NE.ITEMS[o.item].icon, null, 2); ctx.drawImage(ic, x - 4, y - 8, 8, 8); if (G.player && NE.dist(x, y, G.player.x, G.player.y) < 50) { ctx.fillStyle = 'rgba(232,226,208,' + (0.4 + 0.3 * Math.sin(t * 4)) + ')'; ctx.fillRect(x, y - 11, 1, 1); } break; }
    case 'gasleak': ctx.fillStyle = '#4a5a3a'; ctx.fillRect(x - 3, y - 4, 6, 3); break;
    case 'beacon': { ctx.fillStyle = '#3a3a3a'; ctx.fillRect(x - 2, y - 6, 4, 6); ctx.fillStyle = (t * 2 | 0) % 2 ? '#ff3020' : '#501010'; ctx.fillRect(x - 1, y - 8, 2, 2); ctx.fillStyle = '#888'; ctx.fillRect(x, y - 12, 1, 4); break; }
    case 'elevator': G.drawElevator(ctx, o, x, y); break;
    case 'relic': { const pul = 0.6 + 0.4 * Math.sin(t * 2.4 + x); ctx.fillStyle = '#3a6a2a'; ctx.fillRect(x, y - 9, 1, 9); ctx.fillRect(x - 2, y - 5, 2, 1); ctx.fillRect(x + 1, y - 4, 2, 1);
      const pc = ['#ffcf40', '#ffa830', '#ffe070'][o.hue || 0]; ctx.fillStyle = pc; ctx.fillRect(x - 2, y - 13, 5, 3); ctx.fillRect(x - 1, y - 14, 3, 5); ctx.fillStyle = '#fff6c0'; ctx.fillRect(x, y - 12, 1, 1);
      ctx.fillStyle = 'rgba(255,200,60,' + pul * 0.9 + ')'; if ((t * 3 + x) % 2 < 1) ctx.fillRect(x + Math.round(Math.sin(t * 3) * 3), y - 16 - Math.round((t * 6) % 6), 1, 1); break; }
    case 'post': { ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x - 1, y - 30, 3, 30); ctx.fillRect(x - 8, y - 30, 17, 2); ctx.fillStyle = '#6a5038'; ctx.fillRect(x - 6, y - 12, 13, 12); ctx.fillStyle = '#8a6a48'; ctx.fillRect(x - 6, y - 12, 13, 1); ctx.fillStyle = '#c0a060'; ctx.fillRect(x - 7, y - 28, 1, 16 - Math.round(Math.sin(t) * 2)); ctx.fillStyle = '#ffcf70'; ctx.fillRect(x - 2, y - 9, 5, 3); ctx.fillStyle = '#5a4030'; ctx.fillRect(x + 6, y - 28, 1, 10 + Math.round(Math.sin(t * 0.8) * 3)); break; }
    case 'bed': ctx.fillStyle = '#5a3a24'; ctx.fillRect(x - 9, y - 5, 18, 3); ctx.fillRect(x - 9, y - 2, 1, 2); ctx.fillRect(x + 8, y - 2, 1, 2); ctx.fillStyle = '#a04848'; ctx.fillRect(x - 6, y - 7, 14, 2); ctx.fillStyle = '#e8e2d0'; ctx.fillRect(x - 9, y - 8, 4, 3); break;
    case 'sign': ctx.fillStyle = '#4a3420'; ctx.fillRect(x, y - 16, 2, 16); ctx.fillStyle = '#7a5a38'; ctx.fillRect(x - 10, y - 18, 22, 7); ctx.fillStyle = '#ffd890'; ctx.fillRect(x - 8, y - 16, 18, 1); ctx.fillRect(x - 6, y - 14, 14, 1); break;
    case 'terminal': ctx.fillStyle = '#2a2e30'; ctx.fillRect(x - 6, y - 16, 12, 16); ctx.fillStyle = (t * 2 | 0) % 3 ? '#40e070' : '#20a050'; ctx.fillRect(x - 4, y - 14, 8, 6); ctx.fillStyle = '#1a1e20'; ctx.fillRect(x - 5, y - 6, 10, 2); ctx.fillStyle = '#e0c050'; ctx.fillRect(x - 1, y - 12, 2, 2); break;
    case 'locker': ctx.fillStyle = '#4a5058'; for (let i = -1; i <= 1; i++) { ctx.fillRect(x + i * 7 - 3, y - 18, 6, 18); } ctx.fillStyle = '#2a2e34'; for (let i = -1; i <= 1; i++) ctx.fillRect(x + i * 7, y - 16, 1, 6); ctx.fillStyle = '#6b5a40'; ctx.fillRect(x + 12, y - 12, 5, 7); ctx.fillStyle = '#b03030'; ctx.fillRect(x + 18, y - 12, 5, 7); break;
    case 'quarter': ctx.fillStyle = '#4a3a28'; ctx.fillRect(x - 12, y - 8, 24, 8); ctx.fillStyle = '#6a5034'; ctx.fillRect(x - 12, y - 8, 24, 1); ctx.fillStyle = '#3a3e44'; ctx.fillRect(x - 6, y - 20, 12, 12); ctx.fillStyle = '#e0c050'; ctx.fillRect(x - 4, y - 18, 8, 2); ctx.fillStyle = '#9aa'; ctx.fillRect(x - 4, y - 14, 3, 3); ctx.fillRect(x + 1, y - 14, 3, 3); break;
    case 'dossier': ctx.fillStyle = '#5a4a36'; ctx.fillRect(x - 9, y - 26, 18, 14); ctx.fillStyle = '#d8cba8'; ctx.fillRect(x - 7, y - 24, 6, 8); ctx.fillRect(x + 1, y - 23, 6, 4); ctx.fillStyle = '#b03030'; ctx.fillRect(x - 5, y - 25, 1, 1); ctx.fillStyle = '#3a2e22'; ctx.fillRect(x - 1, y - 12, 2, 12); break;
  }
};
G.drawElevator = function (ctx, o, x, y) {
  const w = 30, h = 34; ctx.fillStyle = '#1a1c1e'; ctx.fillRect(x - w / 2, y - h, w, h); ctx.fillStyle = '#3a3e44';
  ctx.fillRect(x - w / 2, y - h, w, 2); ctx.fillRect(x - w / 2, y - h, 2, h); ctx.fillRect(x + w / 2 - 2, y - h, 2, h);
  for (let i = 0; i < 6; i++) ctx.fillRect(x - w / 2 + 3 + i * 5, y - h + 3, 1, h - 3);
  ctx.fillStyle = '#6a5a20'; for (let i = 0; i < w; i += 4) ctx.fillRect(x - w / 2 + i, y - 2, 2, 2);
  ctx.fillStyle = o.kind === 'descent' ? '#ffb040' : '#60ff80'; ctx.fillRect(x - 2, y - h - 4, 4, 2);
  ctx.fillStyle = '#8a8f94'; ctx.fillRect(x + w / 2 + 2, y - 16, 2, 8); ctx.fillStyle = '#c03020'; ctx.fillRect(x + w / 2 + 1, y - 18, 4, 2);
  ctx.fillStyle = '#555'; ctx.fillRect(x - 1, y - h - 40, 1, 36); ctx.fillRect(x + 3, y - h - 40, 1, 36);
};
G.drawLighting = function (cx, cy, fl) {
  const p = G.player, W = G.world, lx = G.lx, ctx = G.ctx; const lights = []; const st = p.stats; const sight = st.sight * (p.anat.org.eyes < 50 ? 0.8 : 1);
  let dark = fl.biome.dark + Math.min(0.04, fl.depth / 25000); if (fl.town) dark = 0.5; if (G.blackout > 0) dark = 0.985; if (W.lobby) dark = 0.45;
  if (G.goop) lights.push({ x: G.goop.x, y: G.goop.y - 4, r: 70, i: 0.85, col: '#ffc020', player: true });
  if (G.wisp) lights.push({ x: G.wisp.x, y: G.wisp.y, r: 40, i: 0.7, col: '#ffd040', player: true });
  if (G.net && G.net.peer && G.net.peer.alive && !G.net.peer.hidden) { const q = G.net.peer; lights.push({ x: q.x, y: q.cy, r: 28, i: 0.55, player: true }); if (q.lightOn && q.aimDir) { const a = Math.atan2(q.aimDir.y, q.aimDir.x); lights.push({ x: q.x, y: q.y - q.h + 4, r: 100, i: 0.85, cone: [a - 0.42, a + 0.42], player: true }); } }
  if (p.alive) {
    lights.push({ x: p.x, y: p.cy, r: (p.abil && p.abil.includes('eyes') ? 62 : 24) * sight, i: 0.6, player: true });
    if (p.light.on) { const fk = p.light.bat < 15 ? (Math.random() < 0.15 ? 0.2 : 1) : 1; const a = Math.atan2(p.aimDir.y, p.aimDir.x); lights.push({ x: p.x + p.facing, y: p.y - p.h + 4, r: 115 * sight * fk * (0.6 + 0.4 * Math.min(1, p.light.bat / 40)), i: 0.95, cone: [a - 0.42, a + 0.42], player: true }); }
  } else if (!G.goop && !G.wisp) lights.push({ x: p.x, y: p.cy, r: 30, i: 0.4, player: true });
  for (const o of G.nearObjs()) {
    if (o.type === 'lamp' && o.on && G.blackout <= 0) lights.push({ x: o.x, y: o.y + 6, r: 58, i: 0.75 * (o.flk == null ? 1 : o.flk), col: o.col });
    else if (o.type === 'glowshroom') lights.push({ x: o.x, y: o.y - 4, r: 28, i: 0.55, col: '#5affc8' });
    else if (o.type === 'crystal') lights.push({ x: o.x, y: o.y + (o.ceil ? 2 : -4), r: 44, i: 0.6, col: o.col });
    else if (o.type === 'ember') lights.push({ x: o.x, y: o.y - 2, r: 30, i: 0.55, col: '#ff7030' });
    else if (o.type === 'fire') lights.push({ x: o.x, y: o.y - 4, r: 55, i: 0.85 + Math.sin(G.t * 13) * 0.05, col: '#ff8030' });
    else if (o.type === 'reactor' || o.type === 'rad') lights.push({ x: o.x, y: o.y - 10, r: o.type === 'rad' ? o.r : 30, i: 0.35, col: '#80ff90' });
    else if (o.type === 'console' || o.type === 'terminal') lights.push({ x: o.x, y: o.y - 10, r: 22, i: 0.5, col: '#40ff70' });
    else if (o.type === 'elevator') lights.push({ x: o.x, y: o.y - 34, r: 50, i: 0.6, col: o.kind === 'descent' ? '#ffb040' : '#60ff80' });
    else if (o.type === 'beacon' && o.type !== 'dead') lights.push({ x: o.x, y: o.y - 8, r: 18 + 14 * Math.abs(Math.sin(G.t * 2)), i: 0.7, col: '#ff3020' });
    else if (o.type === 'container' && o.ct === 'pod') lights.push({ x: o.x, y: o.y - 12, r: 20, i: 0.5, col: '#ff4030' });
    else if (o.type === 'relic') lights.push({ x: o.x, y: o.y - 6, r: 48 + Math.sin(G.t * 2) * 6, i: 0.8, col: '#ffcf40' });
    else if (o.type === 'post') lights.push({ x: o.x, y: o.y - 22, r: 36, i: 0.6, col: '#ffcf70' });
  }
  for (const f of G.fires) lights.push({ x: f.x, y: f.y - 4, r: 50, i: 0.85, col: '#ff8030' });
  { const tx0 = Math.floor(cx / T), ty0 = Math.floor(cy / T); for (let ty = ty0; ty < ty0 + Math.ceil(VH / T) + 1; ty++) for (let tx = tx0; tx < tx0 + Math.ceil(VW / T) + 1; tx += 2) if (W.get(tx, ty) === 9 && W.get(tx, ty - 1) !== 9) lights.push({ x: tx * T + 4, y: ty * T - 2, r: 40, i: 0.65, col: '#ff5a10' }); }
  for (const b of G.phys.bodies) { if (b.life > 0 && b.item === 'flare') lights.push({ x: b.pts[1].x, y: b.pts[1].y, r: 75, i: 0.9, col: '#ff3020' }); if (b.life > 0 && b.item === 'glowstick') lights.push({ x: b.pts[0].x, y: b.pts[0].y, r: 34, i: 0.7, col: '#60ff70' }); }
  if (G.muzzle && (G.muzzle.t -= 1 / 60) > 0) lights.push({ x: G.muzzle.x, y: G.muzzle.y, r: 70, i: 0.9, col: '#ffd080' });
  G.lights = lights;
  lx.globalCompositeOperation = 'source-over'; lx.clearRect(0, 0, G.lc.width, G.lc.height); lx.fillStyle = 'rgba(0,0,0,' + dark + ')'; lx.fillRect(0, 0, G.lc.width, G.lc.height);
  lx.globalCompositeOperation = 'destination-out';
  for (const l of lights) {
    if (l.x < cx - l.r - 10 || l.x > cx + VW + l.r + 10 || l.y < cy - l.r - 10 || l.y > cy + VH + l.r + 10) continue;
    const sx = (l.x - cx) / LS, sy = (l.y - cy) / LS; const gr = lx.createRadialGradient(sx, sy, 0, sx, sy, l.r / LS);
    gr.addColorStop(0, 'rgba(0,0,0,' + l.i + ')'); gr.addColorStop(0.55, 'rgba(0,0,0,' + (l.i * 0.6) + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)'); lx.fillStyle = gr;
    const a0 = l.cone ? l.cone[0] : 0, a1 = l.cone ? l.cone[1] : Math.PI * 2; const poly = NE.lightPoly(W, l.x, l.y, l.r, a0, a1, l.cone ? 26 : 36);
    lx.beginPath(); if (l.cone) lx.moveTo(sx, sy); poly.forEach((q, i) => { const qx = (q[0] - cx) / LS, qy = (q[1] - cy) / LS; if (i === 0 && !l.cone) lx.moveTo(qx, qy); else lx.lineTo(qx, qy); }); lx.closePath(); lx.fill();
  }
  lx.globalCompositeOperation = 'source-over';
  ctx.imageSmoothingEnabled = false; ctx.drawImage(G.lc, 0, 0, G.lc.width * LS, G.lc.height * LS);
  ctx.globalCompositeOperation = 'lighter';
  for (const l of lights) { if (!l.col) continue; const sx = l.x - cx, sy = l.y - cy; if (sx < -l.r || sx > VW + l.r || sy < -l.r || sy > VH + l.r) continue; const gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, l.r * 0.8); gr.addColorStop(0, hexA(l.col, 0.16 * l.i)); gr.addColorStop(1, hexA(l.col, 0)); ctx.fillStyle = gr; ctx.fillRect(sx - l.r, sy - l.r, l.r * 2, l.r * 2); }
  ctx.globalCompositeOperation = 'source-over';
};
function hexA(h, a) { const n = parseInt(h.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
G.drawFX = function () {
  const ctx = G.ctx, p = G.player, A = p.anat; if (G.state === 'lobby') return;
  if (G.flashT > 0) { ctx.fillStyle = 'rgba(255,200,50,' + Math.min(0.55, G.flashT * 0.45) + ')'; ctx.fillRect(0, 0, VW, VH); }
  if (G.pulseFx) { const f = G.pulseFx; f.t += 1 / 60; if (f.t > 0.5) G.pulseFx = null; else { ctx.strokeStyle = 'rgba(255,210,60,' + (1 - f.t * 2) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x - G.cam.x, f.y - G.cam.y, f.t * 160, 0, 7); ctx.stroke(); } }
  if (G.goop || G.wisp) { const k = G.goop ? 0.12 + 0.06 * Math.sin(G.t * 8) : 0.18; const gr = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.3, VW / 2, VH / 2, VH * 0.9); gr.addColorStop(0, 'rgba(255,190,30,0)'); gr.addColorStop(1, 'rgba(255,170,20,' + (k * 2) + ')'); ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH); return; }
  const bp = A.blood / 5000;
  if (bp < 0.8) { const k = clamp((0.8 - bp) / 0.35, 0, 1); const gr = ctx.createRadialGradient(VW / 2, VH / 2, VH * (0.5 - k * 0.3), VW / 2, VH / 2, VH * 0.85); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,' + (0.5 + k * 0.45) + ')'); ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH); }
  const pk = clamp((A.pain - A.threshold * 0.5) / A.threshold, 0, 1); if (pk > 0) { const gr = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.3, VW / 2, VH / 2, VH * 0.8); gr.addColorStop(0, 'rgba(120,0,0,0)'); gr.addColorStop(1, 'rgba(140,10,10,' + (pk * 0.45 + Math.sin(G.t * 6) * 0.05 * pk) + ')'); ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH); }
  if (p.hurtT > 0) { ctx.fillStyle = 'rgba(160,20,20,' + p.hurtT * 0.4 + ')'; ctx.fillRect(0, 0, VW, VH); }
  if (A.gas > 0) { ctx.fillStyle = 'rgba(120,160,40,' + A.gas * 0.18 + ')'; ctx.fillRect(0, 0, VW, VH); }
  if (A.temp < 35.5) { ctx.fillStyle = 'rgba(140,180,220,' + Math.min(0.2, (35.5 - A.temp) * 0.06) + ')'; ctx.fillRect(0, 0, VW, VH); }
  const c = A.cons; if (c < 45 || A.uncon) { ctx.fillStyle = 'rgba(0,0,0,' + (A.uncon ? 0.93 : (45 - c) / 45 * 0.6 * (0.8 + 0.2 * Math.sin(G.t * 2))) + ')'; ctx.fillRect(0, 0, VW, VH); }
  if (G.state === 'dying') { ctx.fillStyle = 'rgba(0,0,0,' + clamp(1 - G.dieT / 3.2, 0, 0.9) + ')'; ctx.fillRect(0, 0, VW, VH); }
};

// ---------------- descent scene (title lives in title.js) ----------------
G.drawWait = function (dt) { const ctx = G.ctx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#050403'; ctx.fillRect(0, 0, VW, VH); ctx.fillStyle = '#e0c050'; ctx.font = '8px monospace'; ctx.textAlign = 'center'; ctx.fillText('Waiting for your partner\'s world...', VW / 2, VH / 2); ctx.textAlign = 'left'; };
G.drawDescent = function (dt) {
  const ctx = G.ctx; G.descT += dt; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#050403'; ctx.fillRect(0, 0, VW, VH); ctx.translate(Math.round((VW - 400) / 2), 0);
  const sp = Math.min(1, G.descT / 1.2) * (G.descT > 3.6 ? Math.max(0, 1 - (G.descT - 3.6) * 2) : 1); G.descOff = (G.descOff || 0) + dt * 260 * sp;
  for (let i = 0; i < 20; i++) { const y = ((i * 24 - G.descOff) % 480 + 480) % 480 - 20; ctx.fillStyle = '#1a1612'; ctx.fillRect(130, y, 140, 3); ctx.fillStyle = 'rgba(255,170,80,0.15)'; ctx.fillRect(140, y + 10, 2, 2); }
  ctx.fillStyle = '#100d0b'; ctx.fillRect(160, 60, 80, 110); ctx.fillStyle = '#3a342e'; ctx.fillRect(160, 60, 80, 2); ctx.fillRect(160, 168, 80, 2); for (let i = 0; i < 9; i++) ctx.fillRect(162 + i * 9, 62, 1, 106);
  const sw = Math.sin(G.descT * 3) * 3; ctx.fillStyle = '#ffb050'; ctx.fillRect(199 + Math.round(sw), 66, 3, 1);
  const s = G.meta.survivor; if (s) { ctx.fillStyle = NE.SKIN[s.look.skin]; ctx.fillRect(198, 140, 5, 5); ctx.fillStyle = s.look.shirt; ctx.fillRect(198, 146, 5, 10); ctx.fillStyle = s.look.pants; ctx.fillRect(198, 156, 2, 12); ctx.fillRect(201, 156, 2, 12); ctx.fillStyle = NE.HAIRC[s.look.hairCol]; if (s.look.hair !== 'bald') ctx.fillRect(198, 139, 5, 2); ctx.fillStyle = '#ffd23a'; ctx.fillRect(201, 142, 1, 1); ctx.fillStyle = 'rgba(255,210,58,0.35)'; ctx.fillRect(200, 141, 3, 3); }
  if (G.net && G.net.on && G.net.peerSurv) { const q = G.net.peerSurv.look; ctx.fillStyle = NE.SKIN[q.skin]; ctx.fillRect(210, 140, 5, 5); ctx.fillStyle = q.shirt; ctx.fillRect(210, 146, 5, 10); ctx.fillStyle = q.pants; ctx.fillRect(210, 156, 2, 12); ctx.fillRect(213, 156, 2, 12); ctx.fillStyle = '#ffd23a'; ctx.fillRect(213, 142, 1, 1); }
  const depth = Math.min(0, -0) + Math.round(G.descT * 3); ctx.fillStyle = '#e8e2d0'; ctx.font = '8px monospace'; ctx.fillText('LOWERING...', 165, 190); ctx.fillStyle = '#e0c050'; ctx.fillText('[' + '▮'.repeat(Math.min(10, Math.floor(G.descT * 2.5))) + ' '.repeat(Math.max(0, 10 - Math.floor(G.descT * 2.5))) + ']', 160, 202);
  G.cam.shake = 1.5 * sp; if (G.descT > 4.2) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, (G.descT - 4.2) * 3) + ')'; ctx.fillRect(0, 0, VW, VH); }
  if (G.descT > 4.6) { if (G.net && G.net.on && G.net.role === 'guest' && G.descSeed == null) { G.state = 'wait'; return; } G.startRun(); }
};
NE.bootGame = () => NE.atlasReady.then(() => G.init());
})(window.NE);
