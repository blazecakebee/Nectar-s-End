// Nectar's End — online co-op over WebRTC (PeerJS). Host owns enemies & the world seed; each player owns their own body.
// Both sides keep their own save, so a refresh just reconnects: the host reopens the same room code, the guest retries until it's back.
(function (NE) {
'use strict';
const { clamp, lerp } = NE; const T = NE.T;
const G = NE.G;
const PREFIX = 'nectars-end-room-';
const peerOpts = () => { const q = new URLSearchParams(location.search).get('peer'); if (!q) return { debug: 1 }; const [host, port] = q.split(':'); return { host, port: +port || 9000, path: '/', secure: false, debug: 1 }; };
NE.makeCode = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += A[Math.floor(Math.random() * A.length)]; return s; };

// ---------- the partner, as seen locally ----------
class RemotePlayer extends NE.Actor {
  constructor(g, x, y, hello) { super(g, x, y, { faction: 'player', look: hello.surv.look }); this.isRemote = true; this.vespa = true; this.light = { on: true, bat: 100 }; this.setHello(hello); this.tgt = { x, y }; this.stats = { speed: 1, climb: 1 }; }
  setHello(h) { if (h.surv && h.surv.variant) this.vglow = NE.variantOf(h.surv.variant).glow; this.surv = h.surv; this.look = h.surv.look; this.shirt = h.shirt; this.pants = h.pants; this.packCol = h.pack; this.name = h.surv.name; }
  apply(s) { this.tgt = { x: s.x, y: s.y }; this.vx = s.vx; this.vy = s.vy; this.facing = s.f; this.h = s.h; this.crouch = !!s.cr; this.crawl = !!s.cw; this.climbing = !!s.cl; this.onGround = !!s.og; this.aimDir = { x: s.ax, y: s.ay }; this.w2 = s.w; this.lightOn = !!s.lt; this.light.on = !!s.lt; this.infest = s.inf || 0; this.muts = s.mu ? NE.mutsOf(s.mu.split(',')) : {}; this.swingT = s.sw ? 0.2 : 0; this.swingDur = 0.4; this.goop = s.gp || null; this.wisp = s.ws || null; this.minion = !!s.mn;
    if (!s.al && this.alive) { this.die('Lost'); } else if (s.al && !this.alive) { this.alive = true; this.limpRag = false; this.anat.dead = false; this.rag.tiles = false; this.rag.collide = false; this.rag.noActor = true; for (const c of this.rag.cons) if (c.s < 1) c.s = 0.4; } }
  weaponId() { return this.w2 || null; }
  get gunOut() { return !!(this.w2 && NE.ITEMS[this.w2] && NE.ITEMS[this.w2].gun) && !this.climbing && !this.crawl; }
  get twoHand() { return !!(this.w2 && NE.ITEMS[this.w2] && NE.ITEMS[this.w2].twoHand); }
  update(dt) { const d = Math.hypot(this.tgt.x - this.x, this.tgt.y - this.y); if (d > 60) { this.x = this.tgt.x; this.y = this.tgt.y; } else { this.x = lerp(this.x, this.tgt.x, Math.min(1, dt * 14)); this.y = lerp(this.y, this.tgt.y, Math.min(1, dt * 14)); } if (Math.abs(this.vx) > 2 && this.onGround) this.walkPh += dt * Math.abs(this.vx) * 0.32; if (this.climbing && this.vy) this.climbPh += dt * 8; this.flash = Math.max(0, this.flash - dt); }
  hurt(part, dmg, kind, src, dir) { if (!this.alive) return; G.net.send({ t: 'hurt', part, dmg, kind, src, dir }); this.flash = 0.12; const p = this.rag.pts[1]; if (kind !== 'blunt' && kind !== 'burn') G.blood(p.x, p.y, Math.round(dmg * 0.4), dir ? dir.x : 0, dir ? dir.y : -0.3); }
  draw(ctx) { if (this.hidden) return; if (this.goop || this.wisp) { if (!this.alive) super.draw(ctx); return G.net.drawRemoteForm(ctx, this); } super.draw(ctx); }
}
// ---------- host-owned enemies/NPCs, mirrored on the guest ----------
class Puppet extends NE.Actor {
  constructor(g, d) { super(g, d.x, d.y, { faction: d.faction || 'scav', look: d.look, npc: true }); this.isPuppet = true; this.nid = d.id; this.setDef(d); this.tgt = { x: d.x, y: d.y }; this.seen = G.t; }
  setDef(d) { this.type = d.type; this.D = NE.ENEMIES[d.type] || null; this.look = d.look; this.shirt = d.shirt; this.pants = d.pants; this.skinCol = d.skinCol; this.weapon = d.weapon; this.gear = d.gear || {}; this.name = d.name; this.masked = d.masked; this.packCol = d.pack; this.isNPCp = d.k === 'npc'; this.label = d.label; }
  weaponId() { return this.weapon; }
  get gunOut() { return this.weapon && NE.ITEMS[this.weapon] && NE.ITEMS[this.weapon].gun && (this.state === 'chase' || this.state === 'aim'); }
  get twoHand() { return this.weapon === 'rifle'; }
  update(dt) { this.x = lerp(this.x, this.tgt.x, Math.min(1, dt * 12)); this.y = lerp(this.y, this.tgt.y, Math.min(1, dt * 12)); if (Math.abs(this.vx) > 2 && this.onGround) this.walkPh += dt * Math.abs(this.vx) * 0.32; this.flash = Math.max(0, this.flash - dt); this.swingT = Math.max(0, this.swingT - dt); }
  hurt(part, dmg, kind, src, dir) { if (!this.alive) return; G.net.send({ t: 'hit', id: this.nid, part, dmg, kind, src, dir }); this.flash = 0.12; const p = this.rag.pts[1]; if (kind !== 'blunt' || dmg > 10) G.blood(p.x, p.y, Math.round(dmg * 0.5), dir ? dir.x : 0, dir ? dir.y : -0.3); if (this.D && this.state !== 'chase') this.state = 'chase'; }
}
NE.RemotePlayer = RemotePlayer; NE.Puppet = Puppet;

class Net {
  constructor(role, code) { this.role = role; this.code = code; this.on = false; this.peer = null; this.peerSurv = null; this.conn = null; this.P = null; this.st = 'starting'; this.acc = 0; this.eacc = 0; this.nextId = 1; this.known = new Set(); this.puppets = new Map(); this.retry = 0; this.closed = false; }
  status(s) { this.st = s; if (NE.UI.netStatus) NE.UI.netStatus(s); }
  // ----- connection -----
  start() {
    if (!window.Peer) { this.status('Co-op library failed to load.'); return; }
    if (this.role === 'host') this.openHost(); else this.openGuest();
  }
  openHost() {
    if (this.closed) return; this.status('Opening room ' + this.code + '...');
    const P = this.P = new window.Peer(PREFIX + this.code, peerOpts());
    P.on('open', () => this.status('Room ' + this.code + ' is open. Waiting for your partner...'));
    P.on('connection', c => { if (this.conn && this.conn.open) { c.on('open', () => { c.send({ t: 'full' }); setTimeout(() => c.close(), 300); }); return; } this.bind(c); });
    P.on('error', e => { if (e.type === 'unavailable-id') { this.status('Reclaiming room ' + this.code + '... (this can take a few seconds after a refresh)'); P.destroy(); setTimeout(() => this.openHost(), 3000); } else if (e.type !== 'peer-unavailable') this.status('Connection problem: ' + e.type + '. Retrying...'); });
    P.on('disconnected', () => { if (!this.closed && !P.destroyed) setTimeout(() => { try { P.reconnect(); } catch (er) { } }, 1500); });
  }
  openGuest() {
    if (this.closed) return; this.status('Connecting to room ' + this.code + '...');
    const P = this.P = new window.Peer(undefined, peerOpts());
    P.on('open', () => this.dial());
    P.on('error', e => { if (e.type === 'peer-unavailable') { this.status('Room ' + this.code + ' not found yet. Retrying...'); setTimeout(() => this.dial(), 3000); } else this.status('Connection problem: ' + e.type + '. Retrying...'); });
    P.on('disconnected', () => { if (!this.closed && !P.destroyed) setTimeout(() => { try { P.reconnect(); } catch (er) { } }, 1500); });
  }
  dial() { if (this.closed || (this.conn && this.conn.open) || !this.P || this.P.destroyed) return; const c = this.P.connect(PREFIX + this.code, { reliable: true, serialization: 'json' }); this.bind(c); setTimeout(() => { if (!this.on && !this.closed) this.dial(); }, 6000); }
  bind(c) {
    this.conn = c;
    c.on('open', () => { this.on = true; this.known.clear(); this.status('Connected.'); this.sendHello(); NE.Audio.play('chime'); });
    c.on('data', d => { try { this.handle(d); } catch (e) { console.error('net', e); } });
    c.on('close', () => this.lost());
    c.on('error', () => this.lost());
  }
  lost() {
    if (!this.on) return; this.on = false; this.conn = null; const name = this.peerSurv ? this.peerSurv.first : 'Your partner';
    if (this.peer) { this.peer.alive = false; G.actors = G.actors.filter(a => a !== this.peer); this.peer = null; }
    for (const [, p] of this.puppets) G.actors = G.actors.filter(a => a !== p); this.puppets.clear();
    if (this.closed) return;
    if (G.toast) G.toast(name + ' disconnected. ' + (this.role === 'host' ? 'They can rejoin with code ' + this.code + '.' : 'Reconnecting...'));
    if (this.role === 'guest') { this.status('Lost the host. Reconnecting...'); setTimeout(() => this.dial(), 2000); } else this.status('Room ' + this.code + ' is open. Waiting for your partner...');
  }
  close() { this.closed = true; this.on = false; try { if (this.conn) this.conn.close(); } catch (e) { } try { if (this.P) this.P.destroy(); } catch (e) { } if (this.peer) G.actors = G.actors.filter(a => a !== this.peer); this.peer = null; for (const [, p] of this.puppets) G.actors = G.actors.filter(a => a !== p); this.puppets.clear(); if (G.net === this) G.net = null; }
  send(m) { if (this.on && this.conn && this.conn.open) { try { this.conn.send(m); } catch (e) { } } }
  sendHello() { const p = G.player, M = G.meta; const s = M.survivor || (p && p.surv); if (!s) return; this.send({ t: 'hello', surv: s, shirt: p ? p.shirt : s.look.shirt, pants: p ? p.pants : s.look.pants, pack: p ? p.packCol : null, state: G.state, ver: (window.NE_VERSION_INFO || {}).version, seed: G.world && !G.world.lobby ? G.world.seed : null }); }
  // ----- per frame -----
  tick(dt) {
    if (!this.on) return; const p = G.player; this.acc += dt; this.eacc += dt;
    if (this.acc > 0.05 && p && (G.state === 'run' || G.state === 'lobby' || G.state === 'burst' || G.state === 'dying')) { this.acc = 0; const gp = G.goop, ws = G.wisp;
      this.send({ t: 'p', mn: G.minion ? 1 : 0, x: gp ? gp.x : ws ? ws.x : p.x, y: gp ? gp.y : ws ? ws.y : p.y, vx: p.vx, vy: p.vy, f: p.facing, h: p.h, cr: p.crouch ? 1 : 0, cw: p.crawl ? 1 : 0, cl: p.climbing ? 1 : 0, og: p.onGround ? 1 : 0, ax: p.aimDir ? +p.aimDir.x.toFixed(2) : 1, ay: p.aimDir ? +p.aimDir.y.toFixed(2) : 0, w: p.weaponId ? p.weaponId() : null, lt: p.light && p.light.on ? 1 : 0, al: p.alive ? 1 : 0, inf: +(p.infest || 0).toFixed(2), mu: (p.abil || []).join(','), sw: p.swingT > 0 ? 1 : 0, gp: gp ? 1 : 0, ws: ws ? 1 : 0, lobby: G.state === 'lobby' ? 1 : 0 }); }
    if (this.role === 'host' && this.eacc > 0.1 && G.state !== 'lobby' && G.world && this.peer) { this.eacc = 0; this.sendEnemies(); }
    this.pacc = (this.pacc || 0) + dt; if (this.pacc > 0.08 && G.phys && this.peer && G.state === 'run') { this.pacc = 0; this.sendProps(); }
    this.macc = (this.macc || 0) + dt; if (this.macc > 0.5 && p && p.anat && this.peer) { this.macc = 0; this.sendMed(); }
    if (this.role === 'guest') for (const [id, pp] of this.puppets) if (pp.alive && G.t - pp.seen > 2) { G.actors = G.actors.filter(a => a !== pp); this.puppets.delete(id); }
  }
  // ---- physics props: whoever is handling a prop streams it; the host streams everything nobody is touching
  sendProps() {
    const l = []; const p = G.player, q = this.peer;
    // corpses you're dragging (ragdolls) stream too, keyed by who they belong to
    for (const b of G.phys.bodies) { const o = b.owner; if (!o || o.alive || b.remove) continue; const held = G.grab && G.grab.body === b; if (held) b.ownT = G.t + 1; if (!held && !((b.ownT || 0) > G.t)) continue;
      const key = o.isPlayer ? 'P:' + this.role : o.isRemote ? 'P:' + (this.role === 'host' ? 'guest' : 'host') : o.nid ? 'A:' + o.nid : null; if (!key) continue;
      const pts = []; for (const pt of b.pts) pts.push(Math.round(pt.x * 10) / 10, Math.round(pt.y * 10) / 10); l.push([key, pts, held ? 1 : 0]); }
    for (const b of G.phys.bodies) { if (!b.nid || b.remove) continue;
      const mine = (G.grab && G.grab.body === b) || (b.ownT || 0) > G.t; if (mine) b.ownT = Math.max(b.ownT || 0, G.t + (G.grab && G.grab.body === b ? 0.3 : 0));
      const remote = (b.remoteT || 0) > G.t - 0.5; if (remote && !mine) continue; if (!mine && this.role !== 'host') continue;
      const v = b.vel ? b.vel() : { x: 0, y: 0 }; const moving = Math.abs(v.x) + Math.abs(v.y) > 3 || mine; if (!moving && b._still) continue; b._still = !moving;
      if (p && Math.abs(b.pts[0].y - p.y) > 260 && (!q || Math.abs(b.pts[0].y - q.y) > 260)) continue;
      const pts = []; for (const pt of b.pts) pts.push(Math.round(pt.x * 10) / 10, Math.round(pt.y * 10) / 10);
      l.push([b.nid, pts, G.grab && G.grab.body === b ? 1 : 0]); if (l.length > 40) break; }
    if (l.length) this.send({ t: 'pp', l });
  }
  onProps(l) {
    this.propMap = new Map(); for (const b of G.phys.bodies) if (b.nid && !b.remove) this.propMap.set(b.nid, b);
    const ragOf = id => { if (id[0] === 'P') { const a = id.slice(2) === this.role ? G.player : this.peer; return a && !a.alive ? a.rag : null; } if (id[0] === 'A') { const n = +id.slice(2); const a = this.role === 'guest' ? this.puppets.get(n) : G.actors.find(x => x.nid === n); return a && !a.alive ? a.rag : null; } return null; };
    for (const [id, pts, drag] of l) { const b = id[1] === ':' ? ragOf(id) : this.propMap.get(id); if (!b || (G.grab && G.grab.body === b)) continue; b.remoteT = G.t; b.ownT = 0; b.dragBy = drag ? this.peer : null; if (drag) b.dragT = G.t;
      for (let i = 0; i < b.pts.length && i * 2 + 1 < pts.length; i++) { const pt = b.pts[i]; const nx = pts[i * 2], ny = pts[i * 2 + 1]; const dx = nx - pt.x, dy = ny - pt.y; const far = Math.abs(dx) + Math.abs(dy) > 6; pt.ox = far ? nx : nx - dx * 0.5; pt.oy = far ? ny : ny - dy * 0.5; pt.x = nx; pt.y = ny; } }
  }
  // ---- partner medical summary (so you can triage them) + treatment over the wire
  sendMed() { const A = G.player.anat; const parts = {}; for (const k of NE.PARTS) { const P = A.parts[k]; parts[k] = [P.wounds.filter(w => !w.closed).length, Math.round(A.partBleed(k) * 10) / 10, P.frac ? 1 : 0, P.splint ? 1 : 0, P.bandage ? 1 : 0, P.tq ? 1 : 0, P.wounds.filter(w => w.bullet).length, P.severed ? 1 : 0]; }
    let hp = 0, hm = 0; for (const k of NE.PARTS) { const P = A.parts[k]; hp += P.severed ? 0 : P.hp; hm += P.max; } const p = G.player;
    this.send({ t: 'med', u: A.uncon ? 1 : 0, b: Math.round(A.blood), pain: Math.round(A.pain), parts, hp: Math.round(hp / hm * 100), st: Math.round(A.stam / A.stamMax * 100), bl: Math.round((A.bleeding || 0) * 10) / 10, th: A.threshold, al: p.alive ? 1 : 0, cond: A.conditions().filter(c => c[1] === 'bad').slice(0, 3).map(c => c[0]) }); }
  treatProg(tr) { if (tr.op === 'raise') return; tr._s = (tr._s || 0) + 1; if (tr._s % 6 === 0) this.send({ t: 'tprog', k: tr.t / tr.dur, part: tr.part, by: G.player.surv.first }); }
  treatDone(tr) { const p = G.player;
    if (tr.op === 'raise') { p.anat.blood -= 250; G.addP && [...Array(14)].forEach(() => G.addP(tr.x, tr.y, NE.rf(-40, 40), NE.rf(-60, 0), 0.6, '#ffc21a', 'goo')); NE.Audio.play('squelch', 1); this.send({ t: 'raise', x: tr.x, y: tr.y, by: p.surv.first }); G.toast('The corpse twitches. It\'s theirs to steer now.'); return; }
    if (tr.op === 'revive') { this.send({ t: 'revive', by: p.surv.first }); G.toast('You haul ' + (this.peerSurv ? this.peerSurv.first : 'them') + ' back to their senses.'); return; }
    if (!p.inv.items.includes(tr.entry)) return G.toast('Item missing.'); tr.entry.n--; if (tr.entry.n <= 0) p.inv.remove(tr.entry);
    this.send({ t: 'treat', id: tr.entry.id, part: tr.part, by: p.surv.first }); G.toast('Treated their ' + NE.PART_NAMES[tr.part].toLowerCase() + '.'); G.run && G.run.treated++; }
  sendEnemies() {
    const p = G.player, q = this.peer; const near = a => (p && Math.abs(a.y - p.y) < 300) || (q && Math.abs(a.y - q.y) < 300);
    const list = []; const inRange = new Set();
    for (const a of G.actors) {
      if (a.isPlayer || a.isRemote || a.town || !near(a)) continue; if (!a.nid) a.nid = this.nextId++; inRange.add(a.nid);
      if (!this.known.has(a.nid)) { this.known.add(a.nid); this.send({ t: 'en', id: a.nid, k: a.isNPC ? 'npc' : 'enemy', type: a.type, x: a.x, y: a.y, faction: a.faction, look: a.look, shirt: a.shirt, pants: a.pants, skinCol: a.skinCol, weapon: a.weapon, gear: a.gear, name: a.name, label: a.label, masked: a.masked, pack: a.packCol, alive: a.alive }); }
      if (!a.alive && a._sentDead) continue; if (!a.alive) a._sentDead = true;
      list.push([a.nid, Math.round(a.x * 10) / 10, Math.round(a.y * 10) / 10, Math.round(a.vx), a.facing, (a.crouch ? 1 : 0) | (a.crawl ? 2 : 0) | (a.climbing ? 4 : 0) | (a.onGround ? 8 : 0) | (a.alive ? 16 : 0) | (a.swingT > 0 ? 32 : 0) | (a.rd ? 64 : 0), a.state === 'aim' ? 1 : a.state === 'chase' ? 2 : 0, a.h]);
    }
    for (const id of this.known) if (!inRange.has(id)) this.known.delete(id);
    this.send({ t: 'e', l: list });
  }
  syncContainer(o) { const k = this.keyOf(o); if (k) this.send({ t: 'cont', k, s: o.searched ? 1 : 0, it: o.items, l: o.locked || null }); }
  keyOf(o) { if (o.nkey) return o.nkey; const W = G.world; if (!W) return null; for (const fl of W.floors) { const i = fl.objs.indexOf(o); if (i >= 0) return 'f' + fl.f + ':' + i; } return null; }
  findKey(k) { if (k[0] === 'f') { const [f, i] = k.slice(1).split(':').map(Number); const fl = G.world.floors[f]; return fl ? fl.objs[i] : null; } return G.dyn.find(o => o.nkey === k); }
  // ----- receiving -----
  handle(m) {
    switch (m.t) {
      case 'full': this.status('That room already has two players.'); this.closed = true; return;
      case 'hello': {
        this.peerSurv = m.surv; if (m.ver && window.NE_VERSION_INFO && m.ver !== window.NE_VERSION_INFO.version) G.toast('Your partner is on v' + m.ver + ' — refresh both games if things act strange.');
        if (this.peer) { this.peer.setHello(m); } else if (G.player && G.world) { this.spawnPeer(m); }
        this._hello = m; G.toast((m.surv.first) + ' joined. Their eyes glow gold too.');
        if (this.role === 'host') this.sendSync(); if (NE.UI.panel === 'coop') NE.UI.open('coop'); return; }
      case 'sync': return this.onSync(m);
      case 'p': { if (!this.peer && this._hello && G.player && G.world) this.spawnPeer(this._hello); if (this.peer) { const sameWorld = (m.lobby ? 1 : 0) === (G.state === 'lobby' ? 1 : 0); this.peer.hidden = !sameWorld; if (sameWorld) this.peer.apply(m); } return; }
      case 'descend': if (this.role === 'guest') { if (G.state === 'lobby') { G.descSeed = m.seed; G.descend(m.seed); } else if (G.state === 'wait' || G.state === 'descent') { G.descSeed = m.seed; if (G.state === 'wait') G.startRun(); } } return;
      case 'e': return this.onEnemies(m.l);
      case 'en': { if (this.role !== 'guest') return; let pp = this.puppets.get(m.id); if (pp) { pp.setDef(m); pp.seen = G.t; return; } pp = new Puppet(G, m); if (m.alive === false) pp.die('—'); this.puppets.set(m.id, pp); G.actors.push(pp); return; }
      case 'edie': { const pp = this.puppets.get(m.id); if (pp) { pp.die(m.cause); const o = { type: 'container', ct: 'corpse', actor: pp, x: pp.x, y: pp.y, label: m.label, act: 'search', items: m.items, searched: false, nkey: 'd' + m.id }; G.dyn.push(o); } return; }
      case 'hit': { if (this.role !== 'host') return; const e = G.actors.find(a => a.nid === m.id); if (e && e.alive) { e.hurt(m.part, m.dmg, m.kind, m.src, m.dir); if (e.onAggro && this.peer) e.onAggro(this.peer); if (e.anat.dead && e.alive) { e.anat.lastHit = m.src; } } return; }
      case 'push': { const e = G.actors.find(a => a.nid === m.id); if (e) { e.vx += m.vx; e.vy += m.vy; if (e.D) { e.state = 'flee'; } } return; }
      case 'hurt': { const p = G.player; if (p && p.alive) { p.hurt(m.part, m.dmg, m.kind, m.src, m.dir); if (m.kind === 'bullet') G.shake(3); } return; }
      case 'pp': if (G.phys) this.onProps(m.l); return;
      case 'bag': { if (!G.world || G.state !== 'run') return; let o = G.dyn.find(d => d.nkey === m.k); if (o) { o.items = m.it; return; } G.dyn.push({ type: 'container', ct: 'bag', x: m.x, y: m.y, label: 'Dropped Bag', act: 'search', items: m.it, searched: true, nkey: m.k }); return; }
      case 'med': this.peerMed = m; return;
      case 'rdn': if (this.peer && this.peer.alive && !this.peer.netRd) { this.peer.netRd = true; NE.ragLimp(this.peer.rag, true); } return;
      case 'rup': if (this.peer && this.peer.netRd) { this.peer.netRd = false; NE.ragUnlimp(this.peer.rag); this.peer.getUpT = 0.6; } return;
      case 'ev': if (G.world && G.state === 'run') G.applyEvent(m.d, m.d.tg === this.role ? G.player : null); return;
      case 'raise': if (G.wisp && !G.minion) { G.spawnMinion(m.x, m.y); G.toast(m.by + ' raised your old body as a brood minion. [A/D] move · [Space] hop · [LMB] bite.'); } return;
      case 'tprog': G.peerTreat = { k: m.k, part: m.part, by: m.by, t: G.t }; return;
      case 'treat': { const p = G.player; if (!p || !p.alive) return; const e = { id: m.id, n: 1 }; p.inv.items.push(e); const before = G.toast; let msg = ''; G.toast = s => { msg = s; }; try { NE.applyTreatment(p, e, m.part); } finally { G.toast = before; } p.inv.remove(e); G.peerTreat = null; G.toast(m.by + ' treated your ' + NE.PART_NAMES[m.part].toLowerCase() + (msg ? ': ' + msg : '.')); return; }
      case 'revive': { const p = G.player; if (!p || !p.alive) return; const A = p.anat; A.cons = Math.max(A.cons, 55); A.uncon = false; A.painSpike = Math.max(0, A.painSpike - 20); A.stress = Math.max(0, A.stress - 20); G.peerTreat = null; G.toast(m.by + ' pulled you back up.'); return; }
      case 'tile': if (G.world && !G.world.lobby) { G.world.setMod(m.x, m.y, m.v, true); } return;
      case 'cont': { if (!G.world) return; const o = this.findKey(m.k); if (o) { o.searched = !!m.s; o.items = m.it; o.locked = m.l; if (NE.UI.panel === 'loot' && NE.UI.arg === o) NE.UI.refresh(); } return; }
      case 'objdead': { if (!G.world) return; for (const fl of G.world.floors) for (const o of fl.objs) if ((o.type === 'relic' || o.type === 'forage') && Math.abs(o.x - m.x) < 2 && Math.abs(o.y - m.y) < 2) { o.type = 'dead'; o.act = null; } return; }
      case 'shot': { G.tracers.push({ x1: m.x1, y1: m.y1, x2: m.x2, y2: m.y2, t: 0.05 }); G.muzzle = { x: m.x1, y: m.y1, t: 0.06 }; const p = G.player; const d = p ? NE.dist(m.x1, m.y1, p.x, p.y) : 0; NE.Audio.play(m.snd, clamp(1 - d / 400, 0.15, 1)); G.sparks(m.x2, m.y2, 3); return; }
      case 'bul': { const p = G.player; const d = p ? NE.dist(m.x, m.y, p.x, p.y) : 0; if (!m.q) { G.muzzle = { x: m.x, y: m.y, t: 0.06 }; NE.Audio.play(m.snd, clamp(1 - d / 400, 0.15, 1)); } NE.Combat.fire(null, m.x, m.y, m.dx, m.dy, m.range, 0, m.snd, true); return; }
      case 'sev': case 'gut': { const t = m.id === 'peer' ? this.peer : (this.role === 'guest' ? this.puppets.get(m.id) : G.actors.find(a => a.nid === m.id)); if (!t) return; if (m.t === 'sev') NE.Gore.sever(t, m.part, { x: m.dx, y: m.dy }, true); else NE.Gore.guts(t, { x: m.dx, y: m.dy }, true); return; }
      case 'throw': { if (!G.phys) return; const P = G.phys; let b; if (m.id === 'brick') b = P.box('brick', m.x, m.y, 4, 3, 2, '#7a7068'); else { b = P.stick(NE.ITEMS[m.id].throwable, m.x, m.y, 4, Math.atan2(m.vy, m.vx), 1.2, m.id === 'dynamite' ? 0.8 : 0.6); if (m.id === 'dynamite') { b.fuse = 2.5; b.color = '#c02020'; } } b.item = m.id; b.remote = true; b.noActor = true; b.setVel(m.vx, m.vy); b.life = m.id === 'flare' ? 40 : m.id === 'glowstick' ? 150 : 0;
        if (m.id === 'bottle' || m.id === 'molotov') b.onImpact = (bb, pt, v) => { if (v > 110 && !bb.remove) { bb.remove = true; NE.Audio.play('glass'); if (m.id === 'molotov') G.addFire(pt.x, pt.y, 16, 9); } }; return; }
      case 'burst': if (this.peer) { G.toast((this.peerSurv ? this.peerSurv.first : 'Your partner') + '\'s host died — their Vespa is erupting!'); } return;
      case 'burstend': return;
      case 'gone': if (this.peer) { G.toast('Your partner\'s run is over.'); this.peer.alive = false; G.actors = G.actors.filter(a => a !== this.peer); this.peer = null; } return;
    }
  }
  spawnPeer(h) { if (!G.player) return; const p = G.player; this.peer = new RemotePlayer(G, p.x + 10, p.y, h); this.peer.surv = h.surv; G.actors.push(this.peer); }
  enterLobby() { if (this._hello) { if (this.peer) G.actors = G.actors.filter(a => a !== this.peer); this.peer = null; this.spawnPeer(this._hello); } this.sendHello(); }
  enterRun() { if (this.peer) G.actors = G.actors.filter(a => a !== this.peer); this.peer = null; if (this._hello) this.spawnPeer(this._hello); this.sendHello(); if (this.role === 'host') this.sendSync(); }
  sendSync() {
    if (G.state !== 'run' && G.state !== 'burst' && G.state !== 'dying') { this.send({ t: 'sync', lobby: 1 }); return; }
    const W = G.world; const cont = {}; W.floors.forEach(fl => fl.objs.forEach((o, i) => { if (o.type === 'container' && (o.searched || o.items || !o.locked)) cont['f' + fl.f + ':' + i] = { s: o.searched ? 1 : 0, it: o.items, l: o.locked || null }; }));
    const dead = []; W.floors.forEach(fl => fl.objs.forEach(o => { if (o.type === 'dead' && o.x != null) dead.push([o.x, o.y]); }));
    const p = G.player; this.send({ t: 'sync', seed: W.seed, mods: [...W.mods], floors: W.floors.length, cont, dead, runT: G.run.t, x: p.x, y: p.y });
  }
  onSync(m) {
    if (this.role !== 'guest') return; if (m.lobby) { if (G.state === 'wait') { NE.UI.closeModal(); G.toLobby(); } return; }
    const saved = G.meta.run && G.meta.run.seed === m.seed ? G.meta.run : null;
    const already = G.world && !G.world.lobby && G.world.seed === m.seed && (G.state === 'run' || G.state === 'burst' || G.state === 'dying');
    if (!already) {
      NE.UI.closeModal(); G.descSeed = m.seed;
      if (saved) { saved.mods = m.mods; saved.actors = []; G.startRun(saved); } else { G.startRun(); const p = G.player; p.x = m.x + 12; p.y = m.y; for (const q of p.rag.pts) { q.x += m.x + 12 - 12 * T; q.y += m.y - G.world.floors[0].feetY; q.ox = q.x; q.oy = q.y; } G.world.ensure(G.floorIdx(p.y) + 3, fl => G.spawnFloor(fl)); }
    }
    const W = G.world; for (const [k, v] of m.mods) { const i = k.indexOf(','); W.setMod(+k.slice(0, i), +k.slice(i + 1), v, true); }
    W.ensure(Math.max(m.floors, G.floorIdx(G.player.y) + 3), fl => G.spawnFloor(fl));
    for (const k in m.cont) { const o = this.findKey(k), c = m.cont[k]; if (o) { o.searched = !!c.s; o.items = c.it; o.locked = c.l; } }
    for (const [x, y] of m.dead) for (const fl of W.floors) for (const o of fl.objs) if (Math.abs(o.x - x) < 1 && Math.abs(o.y - y) < 1) { o.type = 'dead'; o.act = null; }
    G.run.t = Math.max(G.run.t, m.runT || 0);
  }
  onEnemies(list) {
    if (this.role !== 'guest' || !G.world || G.world.lobby) return;
    for (const r of list) { const pp = this.puppets.get(r[0]); if (!pp) continue; pp.seen = G.t; pp.tgt = { x: r[1], y: r[2] }; pp.vx = r[3]; pp.facing = r[4]; const fl = r[5]; pp.crouch = !!(fl & 1); pp.crawl = !!(fl & 2); pp.climbing = !!(fl & 4); pp.onGround = !!(fl & 8); if (fl & 32) { pp.swingT = 0.25; pp.swingDur = 0.3; } if ((fl & 64) && !pp.netRd && pp.alive) { pp.netRd = true; NE.ragLimp(pp.rag, true); } else if (!(fl & 64) && pp.netRd) { pp.netRd = false; NE.ragUnlimp(pp.rag); pp.getUpT = 0.6; } pp.state = r[6] === 1 ? 'aim' : r[6] === 2 ? 'chase' : 'idle'; pp.h = r[7]; if (pp.state !== 'idle' && G.player) { const t = G.player; const L = Math.hypot(t.x - pp.x, t.cy - pp.cy) || 1; pp.aimDir = { x: (t.x - pp.x) / L, y: (t.cy - pp.cy) / L }; } if (!(fl & 16) && pp.alive) pp.die('—'); }
  }
  drawRemoteForm(ctx, a) {
    const x = Math.round(a.x), y = Math.round(a.y);
    if (a.minion) { G.drawMinionAt(ctx, a.x, a.y, a.facing || 1, G.t * 10, a.flash > 0); return; }
    if (a.goop) { for (let j = -5; j <= 0; j++) for (let i = -5; i <= 5; i++) { if ((i / 5) ** 2 + ((j + 3) / 3.2) ** 2 > 1) continue; ctx.fillStyle = (Math.floor((i + 8 + Math.sin(G.t * 4)) / 2.5) % 2) ? '#3a2408' : '#ffc21a'; ctx.fillRect(x + i, y + j, 1, 1); } for (let k = 0; k < 5; k++) { const ang = -Math.PI / 2 + (k - 2) * 0.6 + Math.sin(G.t * 5 + k) * 0.4; NE.pline(ctx, x, y - 3, x + Math.cos(ang) * 8, y - 3 + Math.sin(ang) * 8, 1, '#ffd84a'); } }
    else if (a.wisp) { for (let i = -2; i <= 2; i++) { ctx.fillStyle = i % 2 ? '#3a2408' : '#ffd23a'; ctx.fillRect(x + i, y - 1, 1, 3); } }
  }
}
NE.Net = Net;
NE.startNet = function (role, code) { if (G.net) G.net.close(); const n = new Net(role, code || NE.makeCode()); G.net = n; n.start(); return n; };
// host: forward enemy deaths (with their loot) so the guest sees the same corpse
const _death = () => { const orig = G.onEnemyDeath; G.onEnemyDeath = function (e, cause) { const was = e.alive; orig.call(G, e, cause); if (was && G.net && G.net.on && G.net.role === 'host' && e.nid) { const o = G.dyn[G.dyn.length - 1]; if (o && o.actor === e) { o.nkey = 'd' + e.nid; G.net.send({ t: 'edie', id: e.nid, cause, label: o.label, items: o.items }); } } }; };
_death();
})(window.NE);
