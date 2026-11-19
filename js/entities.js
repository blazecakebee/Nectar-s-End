// Nectar's End — actors (player, enemies, NPCs), combat, treatment, containers, throwables
(function (NE) {
'use strict';
const { ri, rf, pick, chance, clamp, lerp } = NE; const T = NE.T; const G_net = () => NE.G.net && NE.G.net.on && NE.G.net.peer ? NE.G.net : null; const G_playing = g => !NE.UI || (!NE.UI.panel && !NE.UI.hexOpen && !(NE.UI.modalOpen && NE.UI.modalOpen()));
const RAGPART = (i, facing) => { const fr = facing > 0 ? 'r' : 'l', bk = facing > 0 ? 'l' : 'r'; return ['head', 'torso', 'torso', bk + 'arm', bk + 'arm', fr + 'arm', fr + 'arm', bk + 'leg', bk + 'leg', fr + 'leg', fr + 'leg'][i]; };
NE.RAGPART = RAGPART;
const FISTS = { id: 'fists', name: 'Fists', melee: { dmg: 5, kind: 'blunt', reach: 9, stam: 4, cd: 0.45 } };
const JAWS = { id: 'fists', name: 'Fists & Mandibles', melee: { dmg: 9, kind: 'bite', reach: 9, stam: 4, cd: 0.45 } };

class Actor {
  constructor(g, x, y, o) {
    o = o || {}; this.g = g; this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.w = 6; this.h = NE.HSTAND; this.facing = 1;
    this.onGround = false; this.crouch = false; this.crawl = false; this.climbing = false; this.sprint = false; this.walkPh = 0; this.climbPh = 0;
    this.swingT = 0; this.swingDur = 0.4; this.cd = 0; this.dropT = 0; this.alive = true; this.faction = o.faction || 'neutral';
    this.look = o.look; this.anat = new NE.Anatomy({ npc: !!o.npc, stats: o.stats, hpMul: o.hpMul }); this.rag = NE.makeRag(g.phys, x, y); this.rag.owner = this;
    this.rag.drive = (b, dt) => { if (this.alive && !this.anat.uncon && !this.rd && !this.netRd) NE.driveRag(b, this, dt); };
    this.gear = {}; this.stepT = 0; this.flash = 0;
  }
  get cx() { return this.x; } get cy() { return this.y - this.h / 2; }
  get headY() { return this.y - this.h + 2; }
  physicsMove(dt, c) {
    const W = this.g.world, A = this.anat; const st = this.stats || { speed: 1, climb: 1 };
    const legs = A.legFactor(); this.limp = legs.broken > 0 || legs.f < 0.7;
    // stance
    const HS = NE.HSTAND, HC = NE.HCROUCH, HK = NE.HCRAWL; let wantH = HS; const lowCeil = this.blockedAbove(HC);
    if (legs.crawl || A.uncon || c.prone) { this.crawl = true; this.crouch = true; wantH = HK; }
    else if (c.crouch || lowCeil) { this.crouch = true; this.crawl = lowCeil || this.blockedAbove(HS) && this.crawl; wantH = this.crawl ? HK : HC; }
    else { if (this.blockedAbove(HS)) { wantH = this.h; } else { this.crouch = false; this.crawl = false; } }
    if (this.blockedAbove(HC) && this.h <= HK) { wantH = HK; this.crawl = true; }
    this.autoCrawl = Math.max(0, (this.autoCrawl || 0) - dt); if (this.autoCrawl > 0 && !this.climbing) { this.crawl = true; this.crouch = true; }
    this.h = this.crawl ? HK : this.crouch ? Math.max(wantH, HC) : HS; if (this.crawl) this.h = HK;
    const inWater = W.isWater(this.x, this.y - 2); this.inWater = inWater;
    // ropes / ladders: grab with W (or S from above), jump off any time, Shift+S slides down fast
    const onLadder = this.ladderAt(); this.ladderCD = Math.max(0, (this.ladderCD || 0) - dt);
    const jumpPress = c.jump && !this._jh; this._jh = !!c.jump;
    if (!this.climbing && onLadder && this.ladderCD <= 0 && (c.up || (c.down && !this.onGroundSolid())) && !this.crawl && !A.uncon) { this.climbing = true; this.vx *= 0.3; }
    if (this.climbing && (!onLadder || A.uncon)) this.climbing = false;
    if (this.climbing && jumpPress) { this.climbing = false; this.ladderCD = 0.4; this.vy = c.down ? 40 : -150; this.vx = (c.mx || 0) * 95; this.onGround = false; A.stam -= 3; }
    let enc = 1; if (this.inv) { const r = this.inv.weight() / this.inv.carry; if (r > 1) enc = Math.max(0.35, 1 - (r - 1) * 1.3 * (1 - (st.encTol || 0))); }
    const bloodF = clamp(A.blood / 5000 / 0.75, 0.55, 1);
    this.sprint = !!c.sprint && !this.crouch && A.stam > 3 && legs.broken === 0 && enc > 0.8 && Math.abs(c.mx) > 0;
    let spd = (this.isPlayer || this.isRemote ? 42 : this.town ? 45 : 50) * st.speed * legs.f * bloodF * enc * (this.sprint ? (this.isPlayer ? 2.3 : 1.95) * (st.runSpeed || 1) : 1) * (this.crawl ? 0.38 : this.crouch ? 0.55 : 1) * (inWater ? 0.6 : 1) * (this.speedMul || 1) * this.gearSpd() * (A.hunger < 10 || A.thirst < 10 ? 0.85 : 1) * (this.guard ? 0.55 : 1);
    if (this.climbing) {
      const cs = 54 * (st.climb || 1) * A.armFactor() * bloodF; this.sliding = c.down && c.sprint;
      if (this.sliding) { this.vy = Math.min(210, Math.max(this.vy, 60) + 500 * dt); this.slideT = (this.slideT || 0) + dt; if (this.slideT > 0.09) { this.slideT = 0; if (this.isPlayer) NE.Audio.play('rope'); } }
      else this.vy = c.down ? cs * 1.5 : c.up ? -cs : 0;
      this.vx = lerp(this.vx, 0, 0.3);
      const lx = this.ladderX(); if (lx != null) this.x = lerp(this.x, lx, 0.3); if (this.vy) this.climbPh += dt * (this.sliding ? 2 : 9) * (this.vy < 0 || this.sliding ? 1 : -1);
      this.y += this.vy * dt; this.collideY(this.y - this.vy * dt, true); this.onGround = false; return { landed: 0 };
    }
    this.sliding = false;
    this.legsOut = legs.crawl;
    // ---- swimming: stroke upward from any depth, kick toward a ledge and haul out of flooded pits
    this.swimCD = Math.max(0, (this.swimCD || 0) - dt);
    if (inWater && (c.jump || c.up) && this.swimCD <= 0 && !A.uncon) {
      this.vy = Math.min(this.vy, -150 * (legs.f > 0.3 ? 1 : 0.75)); this.swimCD = 0.32; this.onGround = false; A.stam -= 1.5;
      if (this.isPlayer) NE.Audio.play('splash', 0.35); this.g.dust && this.g.dust(this.x, this.y - 6, 1);
      const ed = this.wallAt(); if (ed && !W.solid(W.get(Math.floor((this.x + ed * (this.w / 2 + 2)) / T), Math.floor((this.y - this.h - 4) / T)))) { this.vy = -205; this.vx = ed * 70; }
    }
    // ---- wall climb: hold W/up against rock to latch on and claw upward for up to 2s, then mantle a ledge
    if (this.onGround) this.climbBudget = 3.0 * (st.parkour || 1);
    this.wallClimb = false;
    if (this.isPlayer && c.up && !inWater && !this.crawl && !A.uncon && (this.climbBudget || 0) > 0 && A.armFactor() > 0.4 && A.stam > 2) {
      const wdc = this.wallAt(); if (wdc && (c.mx === wdc || !c.mx || this.onGround)) {
        this.wallClimb = true; this.facing = wdc; this.climbBudget -= dt; A.stam -= dt * 4; this.vy = -52 * (st.climb || 1) * A.armFactor(); this.vx = wdc * 10; this.onGround = false; this.climbPh += dt * 10;
        if (Math.random() < dt * 6) this.g.dust(this.x + wdc * 3, this.y - this.h * 0.7, 1);
        // top of the wall reached: mantle over the edge
        const hx = Math.floor((this.x + wdc * (this.w / 2 + 2)) / T), hy = Math.floor((this.y - this.h + 1) / T);
        if (!W.solid(W.get(hx, hy)) && !W.solid(W.get(hx, hy - 1))) { this.vy = -150; this.vx = wdc * 80; this.climbBudget = Math.max(this.climbBudget, 0.2); }
      }
    }
    const under = W.get(Math.floor(this.x / T), Math.floor((this.y + 1) / T)); this.onIce = this.onGround && under === 10;
    // ---- wall parkour (player): slide down walls, kick off them, sprint-boost up them
    this.wallLock = Math.max(0, (this.wallLock || 0) - dt); this.wallCoy = Math.max(0, (this.wallCoy || 0) - dt);
    if (this.onGround) { this.wallBoosts = 0; this.lastWall = 0; }
    const wd = this.isPlayer && !this.onGround && !this.climbing && !this.crawl && !A.uncon ? this.wallAt() : 0; if (wd) { this.wallDir = wd; this.wallCoy = 0.12; }
    this.wallSliding = false; this.wallDown = false;
    // ---- climb down a wall: hold S (and toward the wall) while beside rock in the air to clamber down hand under hand
    if (wd && !this.wallClimb && !inWater && c.down && (c.mx === wd || !c.mx) && A.armFactor() > 0.4 && A.stam > 1 && this.vy > -20) {
      this.wallDown = true; this.facing = wd; this.vy = 44 * (st.climb || 1) * A.armFactor(); this.vx = wd * 10; A.stam -= dt * 2; this.climbPh -= dt * 8;
      if (Math.random() < dt * 4) this.g.dust(this.x + wd * 3, this.y - this.h * 0.4, 1); }
    if (wd && !this.wallClimb && !this.wallDown && c.mx === wd && this.vy > 40 && A.armFactor() > 0.4) { this.vy = Math.min(this.vy, 70 / (st.parkour || 1)); this.wallSliding = true; if (Math.random() < dt * 12) this.g.dust(this.x + wd * 3, this.y - 6, 1); }
    if (this.isPlayer && jumpPress && !this.onGround && !this.climbing && this.wallCoy > 0 && A.stam > 4 && legs.broken < 2) {
      const d = this.wallDir; const boost = c.sprint && c.mx === d && (this.wallBoosts || 0) < 2 && this.lastWall !== -d;
      if (boost) { this.vy = -230 * (st.parkour || 1); this.vx = -d * 40; this.wallBoosts = (this.wallBoosts || 0) + 1; this.wallLock = 0.12; A.stam -= 7; NE.Audio.play('land', 0.35); }
      else { this.vy = -205 * (st.parkour || 1); this.vx = -d * 135 * (st.parkour || 1); this.wallLock = 0.22; this.facing = -d; A.stam -= 5 / (st.parkour || 1); NE.Audio.play('step', 0.8); }
      this.lastWall = d; this.wallCoy = 0; this.g.dust(this.x + d * 3, this.y - 4, 5); this.g.noise(this.x, this.y, 30);
    }
    this.knockT = Math.max(0, (this.knockT || 0) - dt); const tgt = this.knockT > 0 ? 0 : c.mx * spd * (this.onIce ? 1.1 : 1); const acc = this.knockT > 0 ? 160 : this.onIce ? 90 : this.onGround ? 950 : this.wallLock > 0 ? 50 : 300;
    if (this.vx < tgt) this.vx = Math.min(tgt, this.vx + acc * dt); else if (this.vx > tgt) this.vx = Math.max(tgt, this.vx - acc * dt);
    if (c.mx) this.facing = c.mx > 0 ? 1 : -1;
    if (c.jump && this.onGround && !this.crawl && legs.broken < 2 && A.stam > 4) { this.vy = -192 * (st.jump || 1) * (legs.broken ? 0.7 : 1) * (inWater ? 0.8 : 1); this.onGround = false; A.stam -= 6; if (c.down) { this.vy = 0; this.dropT = 0.25; } }
    if (c.drop && this.onGround) this.dropT = 0.25;
    this.dropT = Math.max(0, this.dropT - dt);
    this.vy += NE.GRAV * dt * (inWater ? 0.35 : 1); if (inWater) this.vy *= 0.94; if (this.vy > 430) this.vy = 430;
    if (this.glide && c.jump && !this.onGround && this.vy > 38 && A.stam > 2) { this.vy = 38; A.stam -= dt * 6; this.gliding = true; } else this.gliding = false;
    this.x += this.vx * dt; this.collideX();
    const prevY = this.y; const vyb = this.vy; this.y += this.vy * dt; const landed = this.collideY(prevY, false);
    if (Math.abs(this.vx) > 2 && this.onGround) { this.walkPh += dt * Math.abs(this.vx) * (this.sprint ? 0.24 : this.crawl ? 0.5 : 0.33); this.stepT += dt * Math.abs(this.vx); }
    this.landT = Math.max(0, (this.landT || 0) - dt); if (landed && vyb > 140) { this.landT = clamp(0.14 + (vyb - 140) / 900, 0.14, 0.45); this.landK = clamp(0.8 + (vyb - 140) / 250, 1, 1.9); } // harder landings buckle the knees deeper and longer
    return { landed: landed ? vyb : 0 };
  }
  fallHurt(res) { if (!res || res.landed <= 330) return; const v = res.landed, dmg = (v - 330) * 0.16 * 0.6; if (v >= 420) this.knockdown(0, -30, 1); this.hurt(pick(['lleg', 'rleg']), dmg, 'fall', 'Fall'); if (dmg > 14) this.hurt(pick(['lleg', 'rleg']), dmg * 0.6, 'fall', 'Fall'); if (v > 430) this.hurt('torso', dmg * 0.4, 'blunt', 'Fall'); NE.Audio.play('land', 0.7); this.g.dust(this.x, this.y, 4); }
  // ---- full-body ragdoll: hard falls, blasts, heavy blows and blackouts throw the body limp; it gets back up when it settles
  knockdown(vx, vy, dur) {
    if (!this.alive || this.town || this.isPuppet || this.isRemote) return;
    if (this.rd) { this.rd.t = Math.max(this.rd.t, dur || 0.8); for (const p of this.rag.pts) { p.ox -= (vx || 0) / 60; p.oy -= (vy || 0) / 60; } return; }
    this.rd = { t: dur || 0.9, safe: { x: this.x, y: this.y } }; this.guard = null; this.lungeNext = false; this.charge = null; this.windT = 0; this.exec = null; this.climbing = false; this.wallClimb = false; this.getUpT = 0; this.strk = null;
    if (this.treating) { this.treating = null; if (this.isPlayer) this.g.toast('Knocked down — treatment interrupted.'); } this.search = null;
    if (this.isPlayer && (vx * vx + vy * vy) > 150 * 150 && chance(0.1)) this.anat.dislocate(pick(['larm', 'rarm', 'larm', 'rarm', 'lleg', 'rleg'])); NE.ragLimp(this.rag, true); const ux = (this.vx + (vx || 0)) / 60, uy = (this.vy + (vy || 0)) / 60;
    for (const p of this.rag.pts) { p.ox = p.x - ux * (0.8 + Math.random() * 0.4); p.oy = p.y - uy * (0.8 + Math.random() * 0.4); }
    this.vx = this.vy = 0; NE.Audio.play('thud', 0.8); if (this.isPlayer) { this.g.shake(3); if (this.g.net && this.g.net.on) this.g.net.send({ t: 'rdn' }); }
  }
  ragTick(dt) {
    const R = this.rd; if (!R) return false; R.t -= dt; const P = this.rag.pts; const W = this.g.world;
    // safety net: a body that tunnels into rock or out of the map snaps back to the last good spot
    if (W && (W.solidAt(P[2].x, P[2].y) && W.solidAt(P[1].x, P[1].y) || P[2].x < T || P[2].x > (W.W - 1) * T)) { if (R.safe) { const dx = R.safe.x - P[2].x, dy = R.safe.y - 4 - P[2].y; this.rag.move(dx, dy); for (const p of P) { p.ox = p.x; p.oy = p.y; } } }
    else if (!W || !W.solidAt(P[2].x, P[2].y)) R.safe = { x: P[2].x, y: P[2].y + 4 };
    let lo = -1e9; for (const p of P) if (p.y > lo) lo = p.y; this.x = P[2].x; this.y = lo + 0.5; this.vx = this.vy = 0; this.onGround = true; this.crawl = true;
    const sp = this.rag.speed(); if (sp > 260 && this.isPlayer) this.g.shake(0.4);
    if (R.t <= 0 && sp < 40 && !this.anat.uncon && !this.anat.dead) this.getUp();
    return true;
  }
  getUp() {
    this.rd = null; NE.ragUnlimp(this.rag); this.getUpT = 0.6; this.crawl = false;
    const W = this.g.world; let k = 0; while (k++ < 4 && W.solidAt(this.x, this.y - 2)) this.y -= T; // never stand up inside rock
    NE.Audio.play('step', 0.7); if (this.isPlayer && this.g.net && this.g.net.on) this.g.net.send({ t: 'rup' });
  }
  gearSpd() { let k = 1; for (const sl in (this.gear || {})) { const it = this.gear[sl] && NE.ITEMS[this.gear[sl].id]; if (it && it.spd) k *= it.spd; } return k; }
  wallAt() { const W = this.g.world; for (const d of [1, -1]) { const xx = this.x + d * (this.w / 2 + 1.2); if (W.solid(W.get(Math.floor(xx / T), Math.floor((this.y - this.h * 0.55) / T))) && W.solid(W.get(Math.floor(xx / T), Math.floor((this.y - this.h + 2) / T)))) return d; } return 0; }
  onGroundSolid() { const W = this.g.world; return W.solid(W.get(Math.floor(this.x / T), Math.floor((this.y + 1) / T))); }
  ladderAt() { const W = this.g.world; const tx = Math.floor(this.x / T); for (const yy of [this.y - 2, this.y - this.h / 2, this.y + 2]) if (W.get(tx, Math.floor(yy / T)) === 3) return true; return false; }
  ladderX() { return (Math.floor(this.x / T) + 0.5) * T; }
  blockedAbove(h) { const W = this.g.world; const l = this.x - this.w / 2 + 0.5, r = this.x + this.w / 2 - 0.5; const ty = Math.floor((this.y - h) / T); for (const xx of [l, r]) if (W.solid(W.get(Math.floor(xx / T), ty))) return true; return false; }
  collideX() {
    const W = this.g.world; const t = this.y - this.h + 0.5, b = this.y - 0.5; const ty0 = Math.floor(t / T), ty1 = Math.floor(b / T);
    const dir = this.vx > 0 ? 1 : this.vx < 0 ? -1 : 0; if (!dir) return;
    const tx = Math.floor((this.x + dir * this.w / 2) / T);
    for (let ty = ty0; ty <= ty1; ty++) if (W.solid(W.get(tx, ty))) {
      if (ty === ty1 && this.tryStep(tx)) break;
      // low gap ahead (a crawlspace or hole): drop flat and squeeze in instead of bumping
      if (ty < ty1 && this.onGround && !this.climbing && !W.solid(W.get(tx, ty1)) && Math.floor((this.y - 6.5) / T) === ty1) { this.autoCrawl = 0.35; this.crawl = true; this.crouch = true; this.h = 7; break; }
      this.x = dir > 0 ? tx * T - this.w / 2 - 0.01 : (tx + 1) * T + this.w / 2 + 0.01; this.vx = 0; this.bumped = dir; break;
    }
  }
  // walk up 1-tile cave steps automatically
  tryStep(tx) {
    const W = this.g.world; if (!this.onGround || this.climbing) return false; const ty = Math.floor((this.y - 0.5) / T); if (!W.solid(W.get(tx, ty))) return false;
    const ny = ty * T; const r0 = Math.floor((ny - this.h + 0.5) / T);
    for (let r = r0; r < ty; r++) { if (W.solid(W.get(tx, r))) return false; for (const xx of [this.x - this.w / 2 + 0.2, this.x + this.w / 2 - 0.2]) if (W.solid(W.get(Math.floor(xx / T), r))) return false; }
    this.y = ny; this.stepped = 0.1; return true;
  }
  collideY(prevY, climbing) {
    const W = this.g.world; const tx0 = Math.floor((this.x - this.w / 2 + 0.2) / T), tx1 = Math.floor((this.x + this.w / 2 - 0.2) / T); let landed = false;
    if (this.y >= prevY) {
      const ty = Math.floor(this.y / T); this.onGround = false;
      for (let tx = tx0; tx <= tx1; tx++) {
        const t = W.get(tx, ty); const plat = !climbing && this.dropT <= 0 && W.platformish(tx, ty) && prevY <= ty * T + 0.6;
        if (W.solid(t) || plat) { this.y = ty * T; if (this.vy > 0) landed = true; this.vy = 0; this.onGround = true; break; }
      }
    } else {
      const ty = Math.floor((this.y - this.h) / T);
      for (let tx = tx0; tx <= tx1; tx++) if (W.solid(W.get(tx, ty))) { this.y = (ty + 1) * T + this.h; this.vy = 0; break; }
    }
    return landed;
  }
  hurt(part, dmg, kind, src, dir) {
    if (!this.alive) return; const A = this.anat;
    const g = this.gear; let armorSlot = part === 'head' ? 'head' : part === 'torso' ? 'body' : null;
    if (armorSlot && g[armorSlot] && kind !== 'burn') { const e = g[armorSlot], it = NE.ITEMS[e.id]; const base = it.res && it.res[kind] != null ? it.res[kind] : (it.res ? it.armor * 0.4 : it.armor); const ab = base * (0.3 + 0.7 * (e.dur || 0) / it.dur); dmg *= 1 - ab; e.dur = Math.max(0, (e.dur || 0) - dmg * 1.5); if (kind === 'bullet' && chance(ab)) kind = 'blunt'; if (kind === 'sharp' && chance(ab)) kind = 'blunt'; }
    if (this.abil && this.abil.includes('chitin') && (part === 'torso' || part === 'head')) dmg *= 0.75;
    if (this.abil && this.abil.includes('carapace') && part !== 'torso' && part !== 'head') dmg *= 0.75; if (this.abil && this.abil.includes('ember') && kind === 'burn') dmg *= 0.4;
    if (this.D && this.D.chitin && kind !== 'burn') dmg *= 1 - this.D.chitin * (kind === 'bullet' && (this._cal || 1) >= 3 ? 0.3 : 1);
    A.damage(part, dmg, kind, src); this.lastDir = dir; this.lastDmg = dmg;
    const ri2 = { head: 0, torso: 1 }[part]; const idx = ri2 != null ? ri2 : part.endsWith('arm') ? 6 : 10;
    const p = this.rag.pts[idx]; const dx = dir ? dir.x : (Math.random() - 0.5), dy = dir ? dir.y : -0.3;
    p.ox -= dx * dmg * 0.06; p.oy -= dy * dmg * 0.06; this.vx += dx * Math.min(80, dmg * 3);
    const gore = this.g.meta.settings.gore; const n = Math.round(dmg * 0.6 * (0.4 + gore * 0.6));
    if (kind !== 'burn' && kind !== 'blunt' || dmg > 10) this.g.blood(p.x, p.y, n, dx, dy);
    this.flash = 0.12; this.hurtT = 0.4;
    if (NE.Gore && kind !== 'burn' && kind !== 'fall' && (kind !== 'blunt' || dmg > 8)) NE.Gore.stain(this, part, p.x, p.y);
    if (NE.Gore) NE.Gore.afterHurt(this, part, dmg, kind, dir);
    if (this.onHurt) this.onHurt(src, dmg);
  }
  // nearest rag-point -> body part
  partNear(x, y) { let bi = 1, bd = 1e9; this.rag.pts.forEach((p, i) => { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; bi = i; } }); return RAGPART(bi, this.facing); }
  contains(x, y, pad) { pad = pad || 0; return x > this.x - this.w / 2 - pad && x < this.x + this.w / 2 + pad && y > this.y - this.h - pad && y < this.y + pad; }
  die(cause) {
    if (!this.alive) return; this.alive = false; this.limpRag = true; NE.ragLimp(this.rag); this.anat.dead = true; this.anat.cause = this.anat.cause || cause;
    const v = { x: this.vx, y: this.vy }; for (const p of this.rag.pts) { p.ox = p.x - v.x / 60; p.oy = p.y - v.y / 60; }
    const d = this.lastDir, k = Math.min(3.5, (this.lastDmg || 0) * 0.06); if (d) for (const p of this.rag.pts) { p.ox -= d.x * k * (0.6 + Math.random() * 0.8); p.oy -= (d.y * k - 0.6) * (0.6 + Math.random() * 0.8); }
    this.wdir = null;
  }
  draw(ctx) {
    const o = { facing: this.facing, anat: this.anat, dead: !this.alive, pack: this.packCol, weapon: this.weaponId(), aimDir: this.aimDir, shirt: this.shirt, pants: this.pants, skinCol: this.skinCol,
      arch: this.D ? this.type : null, vcol: this.vglow, vest: this.gear.body ? (NE.ITEMS[this.gear.body.id].col || '#3a3e36') : null, eyeGlow: this.D ? this.D.eyeGlow : null, blind: this.D && this.D.blind, helmet: this.gear.head ? (NE.ITEMS[this.gear.head.id].col || '#888') : null, helmId: this.gear.head ? this.gear.head.id : null, vestId: this.gear.body ? this.gear.body.id : null, acc: NE.accOf ? NE.accOf(this) : null, shoe: this.gear.feet ? NE.ITEMS[this.gear.feet.id].col : null, shoeSole: this.gear.feet && this.gear.feet.id === 'runshoes' ? '#f0f0f0' : null, glove: this.gear.hands ? NE.ITEMS[this.gear.hands.id].col : null, gloveStud: this.gear.hands && this.gear.hands.id === 'knucklegloves', mask: !!this.gear.face || this.masked, walkPh: this.walkPh, sev: NE.sevOf ? NE.sevOf(this) : this.sev, stains: this.stains, gutted: this.gutted, wdir: this.alive ? this.wdir : null, lantern: NE.hasLantern(this) ? (this.isPlayer ? (this.light.on ? 1 : 0.01) : this.isRemote ? (this.lightOn ? 1 : 0.01) : 1) : 0, vespa: !!this.vespa, infest: this.infest || 0, muts: this.muts };
    NE.drawHuman(ctx, this.rag, this.look, o);
    if (this.flash > 0 && this.alive) { ctx.fillStyle = 'rgba(255,60,40,0.5)'; for (const p of this.rag.pts) ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 2, 2); }
  }
  weaponId() { return null; }
}
NE.Actor = Actor;

// ================= PLAYER =================
class Player extends Actor {
  constructor(g, x, y, surv, meta) {
    const stats = NE.computeStats(meta, surv); if (surv.variant) NE.applyVariant(stats, surv.variant);
    super(g, x, y, { faction: 'player', look: surv.look, stats, hpMul: stats.hpMul });
    this.surv = surv; this.stats = stats; this.isPlayer = true;
    this.inv = new NE.Inv(stats.slots, stats.carry); this.inv.medHalf = stats.medHalf; this.inv.stackMul = stats.stackMul || 1;
    this.equip = { weapon: null }; this.light = { on: true, bat: 100 }; this.filterT = 0; this.treating = null; this.search = null;
    const of = NE.OUTFITS.find(o => o.id === meta.equipped.outfit) || NE.OUTFITS[0];
    this.shirt = of.random ? surv.look.shirt : of.shirt; this.pants = of.random ? surv.look.pants : of.pants;
    const bp = NE.BACKPACKS.find(b => b.id === meta.equipped.backpack) || NE.BACKPACKS[0]; this.packCol = bp.col;
    this.anat.org.lungs = stats.lungs || 100; this.vespa = true; this.abil = []; this.muts = {}; this.infest = 0;
  }
  setAbilities(list) { this.abil = list.slice(); this.muts = NE.mutsOf(list); const s = this.stats; if (!this._st0) this._st0 = { bleed: s.bleed, cold: s.cold, noise: s.noise, fall: s.fall }; Object.assign(s, this._st0); const has = id => list.includes(id); if (has('honeyblood')) s.bleed *= 0.65; if (has('frost')) s.cold *= 0.4; if (has('phantom')) s.noise *= 0.6; if (has('leap')) s.fall *= 0.7; s.jump = has('leap') ? 1.22 : 1; s.regen = has('regen'); s.heart = list.includes('heart'); s.amber = list.includes('amber'); s.mand = list.includes('mand'); this.glide = list.includes('wings'); }
  weaponId() { return this.equip.weapon ? this.equip.weapon.id : null; }
  weaponDef() { const e = this.equip.weapon; return e ? NE.ITEMS[e.id] : this.stats.mand ? JAWS : FISTS; }
  get gunOut() { const w = this.equip.weapon; return !!(w && NE.ITEMS[w.id].gun) && !this.climbing && !this.wallClimb && !this.wallDown && !this.crawl; }
  get twoHand() { const w = this.equip.weapon; return !!(w && NE.ITEMS[w.id].twoHand); }
  update(dt, input) {
    const g = this.g, A = this.anat, st = this.stats;
    this.cd = Math.max(0, this.cd - dt); this.swingT = Math.max(0, this.swingT - dt); this.flash = Math.max(0, this.flash - dt); this.hurtT = Math.max(0, (this.hurtT || 0) - dt);
    if (A.uncon && !this.rd) this.knockdown(0, 0, 0.6);
    this.dashT = Math.max(0, (this.dashT || 0) - dt); this.dashIF = Math.max(0, (this.dashIF || 0) - dt); this.dashCD = Math.max(0, (this.dashCD || 0) - dt); this.lungeCD = Math.max(0, (this.lungeCD || 0) - dt);
    if (this.dashT > 0 && Math.random() < dt * 40) g.ghost(this);
    if (this.ragTick(dt)) { this.charge = null; this.guard = null; if (this.treating) this.treating = null; return; }
    if (this.guard && (A.stam <= 0 || this.weaponDef().gun)) { this.guard = null; }
    let c = input; if (this.getUpT > 0) c = { mx: 0 };
    if (A.uncon || this.treating || this.search) c = { mx: 0 };
    if ((this.treating || this.search) && (input.mx || input.jump || input.up)) { if (this.treating) { g.toast('Treatment interrupted.'); this.treating = null; } if (this.search) { this.search = null; } c = input; }
    const res = this.physicsMove(dt, c);
    if (res.landed > 330) {
      const v = res.landed; const dmg = (v - 330) * 0.16 * 0.6 * st.fall * (this.glide ? 0.4 : 1); NE.Audio.play('land', 1);
      this.hurt(pick(['lleg', 'rleg']), dmg, 'fall', 'Fall'); if (dmg > 14) this.hurt(pick(['lleg', 'rleg']), dmg * 0.5, 'fall', 'Fall'); if (v > 430) this.hurt('torso', dmg * 0.4, 'blunt', 'Fall');
      g.shake(Math.min(4, dmg / 6)); g.dust(this.x, this.y, 6); if (v >= 420 && !this.glide) this.knockdown(this.facing * 30, -40, 0.9);
    } else if (res.landed > 120) { NE.Audio.play('land', 0.5); }
    if (this.stepT > (this.sprint ? 22 : 16)) { this.stepT = 0; if (this.onGround) { if (this.sprint) g.dust(this.x - this.facing * 2, this.y, 2); NE.Audio.play('step', this.sprint ? 1 : this.crouch ? 0.3 : 0.6); if (this.inWater) NE.Audio.play('splash', 0.4); g.noise(this.x, this.y, (this.sprint ? 90 : this.crouch ? 12 : 40) * st.noise); } }
    // stamina
    if (this.guard) A.stam += dt * 4; else if (this.sprint) A.stam -= dt * 8.5 * st.staminaCost * (st.runCost || 1); else if (this.swingT <= 0) A.stam += dt * 17 * (A.hunger > 10 ? 1 : 0.5) * (A.blood > 3800 ? 1 : 0.6);
    // aim
    const dx = g.mouse.wx - this.x, dy = g.mouse.wy - (this.y - this.h + 4); const L = Math.hypot(dx, dy) || 1; this.aimDir = { x: dx / L, y: dy / L };
    if (!c.mx && !this.climbing && !A.uncon) this.facing = dx >= 0 ? 1 : -1;
    if (this.charge) { this.charge.t += dt; A.stam -= dt * 3; if (!g.mouse.l || A.uncon || this.climbing) this.release(); }
    { const wq = this.weaponDef(); if (wq.gun && wq.gun.auto && g.mouse.l && this.cd <= 0 && G_playing(g)) this.attack(); }
    { const w = this.weaponDef(); const ok = !w.gun && !this.climbing && !this.wallClimb && !this.wallDown && !this.crawl && !this.treating && !this.search && !A.uncon && !(A.parts.larm.severed && A.parts.rarm.severed); const gx = this.guard ? this.x + this.facing * 14 : g.mouse.wx, gy = this.guard ? this.y - this.h - 6 : g.mouse.wy; NE.Combat.tick(this, dt, gx, gy, ok); }
    // waist lantern (oil)
    if (this.light.on) { this.light.bat = Math.max(0, this.light.bat - dt * 100 / (360 * st.battery)); if (this.light.bat <= 0) { this.light.on = false; g.toast('Your lantern sputters out.'); } }
    if (this.gear.face && g.env.gas > 0 && this.filterT > 0) this.filterT = Math.max(0, this.filterT - dt);
    // pending melee hit
    if (this.pendingHit) { this.pendingHit.t -= dt; if (this.pendingHit.t <= 0) { this.resolveMelee(this.pendingHit.w); this.pendingHit = null; } }
    // out of breath: bent double and panting until stamina comes back
    { const r = A.stam / A.stamMax; if (!this.exhausted && r < 0.1) { this.exhausted = true; this.pantT = 0; NE.Audio.play('gasp', 0.6); } else if (this.exhausted && r > 0.4) this.exhausted = false; if (this.exhausted) { this.pantT = (this.pantT || 0) - dt; if (this.pantT <= 0) { this.pantT = 0.75; NE.Audio.play('pant', 0.45); } } }
    // treatment: sounds that match what your hands are doing
    if (this.treating) { const tr = this.treating; const it = tr.entry && NE.ITEMS[tr.entry.id]; const kind = tr.op || (it ? it.med : ''); tr.sfx = (tr.sfx || 0) - dt;
      if (tr.sfx <= 0) { const S = { bandage: ['bandage', 0.7], tq: ['cinch', 0.9], suture: ['cloth', 0.5], splint: ['cloth', 0.8], clean: ['cloth', 0.6], forceps: ['cloth', 1.1], dig: ['squelch', 1.0], amputate: ['saw', 0.32], reset: ['gasp', 1.4], fit: ['metal', 1.2], unfit: ['metal', 1.2] }[kind]; if (S) { NE.Audio.play(S[0], 0.5); tr.sfx = S[1]; if (kind === 'amputate' && chance(0.25)) NE.Audio.play('pain', 0.6); } else tr.sfx = 9; } }
    // treatment progress
    if (this.treating) { this.treating.t += dt * (this.isPlayer && this.g.timeScale > 0 && this.g.timeScale < 1 && !this.g.slowmo ? 1 / this.g.timeScale : 1); /* menus slow the world, never your hands */ if (this.treating.peer && G_net()) { G_net().treatProg(this.treating); } if (this.treating.t >= this.treating.dur) { const tr = this.treating; this.treating = null; if (tr.peer) { if (G_net()) G_net().treatDone(tr); } else NE.applyTreatment(this, tr.entry, tr.part, tr.op); } }
    if (this.search) { this.search.t += dt; const so = this.search.obj; if (so && so.x != null && Math.abs(so.x - this.x) > 1) this.facing = so.x > this.x ? 1 : -1; if (Math.random() < dt * 6) NE.Audio.play('rummage'); if (Math.random() < dt * 3 && so) g.dust(so.x + rf(-3, 3), (so.y || this.y) - rf(2, 8), 1); if (this.search.t >= this.search.dur) { const s = this.search; this.search = null; g.finishSearch(s.obj); } }
  }
  // Q: a quick low dash with a brief window where melee passes through you
  dash(mx) {
    const g = this.g, A = this.anat; if ((this.dashCD || 0) > 0 || this.rd || A.uncon || this.climbing || this.crawl || this.treating || this.search) return;
    const lf = A.legFactor().f; if (lf < 0.3) return g.toast('Your legs can\'t manage it.'); if (A.stam < 12) { NE.Audio.play('deny'); return g.say(pick(['Too winded...', 'Can\'t...', 'Need air.']), 1); }
    const dir = mx ? Math.sign(mx) : this.facing; this.vx = dir * 200 * lf * this.gearSpd(); if (this.onGround) this.vy = Math.min(this.vy, -35); this.knockT = 0.3; this.dashT = 0.55; this.dashDur = 0.55; this.dashIF = 0.32; this.dashCD = 0.75; this.dashAt = g.t; this.dashDir = dir;
    A.stam -= 14 * this.stats.staminaCost; this.guard = null; this.charge = null; NE.Audio.play('dash'); setTimeout(() => NE.Audio.play('thud', 0.35), 140); g.dust(this.x - dir * 3, this.y, 4); g.noise(this.x, this.y, 40);
  }
  // lunge: hold LMB to a full wind-up, then press RMB — throw your whole weight into a lunging strike (long cooldown)
  lunge() {
    const g = this.g, A = this.anat; const w = this.weaponDef(); if (w.gun || !this.charge || this.charge.t < 0.82 || this.rd || A.uncon || this.climbing || this.crawl) return false;
    if ((this.lungeCD || 0) > 0) { g.toast('Lunge recovering (' + this.lungeCD.toFixed(1) + 's)'); NE.Audio.play('deny'); return true; }
    if (A.stam < w.melee.stam + 6) { g.say('Too winded to lunge...', 1); return true; }
    const thr = w.melee.kind === 'sharp' && ((w.w || 1) < 1.2 || w.id === 'spear'); this.charge = null;
    if (NE.Combat.strike(this, w, 1.3, thr ? 'thrust' : null)) { this.strk.lunge = true; this.vx += this.facing * 125 * A.legFactor().f; if (this.onGround) this.vy = Math.min(this.vy, -20); this.knockT = 0.14; this.cd = w.melee.cd * 1.5 + 0.2; this.lungeCD = 2.6; A.stam -= (w.melee.stam * 1.1 + 8) * this.stats.staminaCost; NE.Audio.play('lunge'); g.dust(this.x, this.y, 4); }
    return true;
  }
  // RMB tap: a fast extended-arm jab that interrupts wind-ups
  poke() {
    const g = this.g, A = this.anat; const w = this.weaponDef(); if (w.gun || this.cd > 0 || this.strk || this.rd || A.uncon || this.climbing || this.crawl) return;
    if (A.stam < 4) return; if (NE.Combat.strike(this, w, 0, 'thrust')) { this.strk.poke = true; this.strk.dur *= 0.8; this.cd = 0.32; A.stam -= Math.max(3, w.melee.stam * 0.35) * this.stats.staminaCost; NE.Audio.play('whoosh', 0.6); }
  }
  attack() {
    const g = this.g, A = this.anat; if (A.uncon || this.treating || this.search || this.climbing || this.rd) return;
    const w = this.weaponDef(); const e = this.equip.weapon;
    if (w.gun) return this.shoot(e, w);
    const m = w.melee; if (this.cd > 0) return;
    if (A.parts.larm.severed && A.parts.rarm.severed) return;
    if (A.stam < m.stam * 0.4) { g.say(pick(NE.MONO.lowstam || ['Need to catch my breath...']), 1); return; }
    const dg = w.dig || 0.3 + (w.w || 0.3) * 0.15; // anything can chip away at rock — tools just do it much faster
    if (g.tryDig && g.tryDig(this, w.dig ? w : Object.assign({}, w, { dig: dg }))) { const af = A.armFactor(); this.swingDur = m.cd / Math.max(0.5, af); this.swingT = this.swingDur; this.cd = this.swingDur; A.stam -= m.stam * 0.6 * this.stats.staminaCost; NE.Audio.play('swing'); return; }
    if (w.twoHand && (A.parts.larm.frac && !A.parts.larm.splint || A.parts.rarm.frac && !A.parts.rarm.splint)) { g.toast('Can\'t swing that with a broken arm.'); return; }
    if (this.strk) return;
    this.charge = { t: 0, w }; // hold to wind up a heavy attack, release to strike
  }
  release() {
    const ch = this.charge; this.charge = null; if (!ch || this.strk || !this.alive) return; const w = ch.w, m = w.melee, A = this.anat; const af = A.armFactor();
    const heavy = ch.t >= 0.32 ? 1 + Math.min(1, (ch.t - 0.32) / 0.5) * 1.1 : 0;
    if (NE.Combat.strike(this, w, heavy)) { this.cd = m.cd * (heavy ? 0.9 : 0.55) / Math.max(0.5, af); A.stam -= m.stam * (heavy ? 1.4 : 0.6) * this.stats.staminaCost; if (heavy) { NE.Audio.play('swing', 1.2); this.g.shake(1.5); } }
  }
  resolveMelee(w) {
    const g = this.g, m = w.melee; const af = this.anat.armFactor(); let best = null, bd = 1e9;
    for (const a of g.actors) { if (a === this || !a.alive) continue; const dx = a.x - this.x; if (dx * this.facing < -3) continue; if (Math.abs(dx) > m.reach + a.w / 2 + 2) continue; if (a.y - a.h > this.y + 2 || a.y < this.y - this.h - 2) continue; const d = Math.abs(dx); if (d < bd) { bd = d; best = a; } }
    // whack physics props
    g.phys.impulse(this.x + this.facing * m.reach * 0.7, this.y - this.h * 0.6, m.reach * 0.8, 160 * (w.twoHand ? 1.6 : 1));
    if (!best) return;
    let part = best.partNear(g.mouse.wx, g.mouse.wy); if (Math.hypot(g.mouse.wx - best.x, g.mouse.wy - best.cy) > 26) part = NE.wpick([['torso', 5], ['head', 1.5], [this.facing > 0 ? 'larm' : 'rarm', 1], ['lleg', 1], ['rleg', 1]]);
    let dmg = m.dmg * this.stats.melee * 1.2 * af * rf(0.85, 1.15) * (this.sprint ? 1.15 : 1); if (best.crawl && part === 'head') dmg *= 1.2;
    const sting = this.abil && this.abil.includes('sting'); if (sting) dmg *= 1.4;
    best.hurt(part, dmg, m.kind, this.surv.first, { x: this.facing, y: -0.2 });
    if (sting && best.alive) { best.hurt(part, 3, 'sharp', this.surv.first); if (best.anat) best.anat.tox = (best.anat.tox || 0) + 20; } NE.Audio.play(m.kind === 'sharp' ? 'slash' : 'hit'); g.shake(1.2); g.noise(this.x, this.y, 60);
    if (best.onAggro) best.onAggro(this);
  }
  shoot(e, w) {
    const g = this.g, gun = w.gun, A = this.anat; if (this.cd > 0) return;
    if (e.jammed) { NE.Audio.play('click'); g.toast('Jammed! [R] to clear.'); this.cd = 0.3; return; }
    if (!e.mag) { NE.Audio.play('click'); if (!this._emptyTold) { g.toast('Out of ammo — pistol-whipping! [R] to reload.'); this._emptyTold = 1; } return this.gunButt(w); }
    if (w.twoHand && (A.parts.larm.frac && !A.parts.larm.splint || A.parts.rarm.frac && !A.parts.rarm.splint)) { g.toast('Can\'t steady a rifle with a broken arm.'); return; }
    if (chance(gun.jam * (1 + A.tremor()))) { e.jammed = true; NE.Audio.play('jam'); g.toast('*click* — JAMMED.'); this.cd = 0.3; return; }
    e.mag--; this.cd = gun.cd * 0.75;
    const af = A.armFactor(); let spread = (gun.spread + A.tremor() * 0.1 + (1 - af) * 0.18 + (A.org.eyes < 60 ? 0.05 : 0)) * this.stats.aim * (this.crouch ? 0.7 : 1) * (this.sprint ? 1.8 : 1);
    const cal = gun.cal || 1; const ox = this.rag.pts[6].x, oy = this.rag.pts[6].y; let dx = 0, dy = 0;
    for (let k = 0; k < (gun.pellets || 1); k++) { const ang = Math.atan2(this.aimDir.y, this.aimDir.x) + rf(-spread, spread) * (k ? 1.6 : 1); dx = Math.cos(ang); dy = Math.sin(ang);
      g.fireRay(this, ox, oy, dx, dy, gun.range, gun.dmg * 1.2 * rf(0.9, 1.1), gun.snd || 'gun', k > 0); }
    // recoil scales with caliber: a shove back and a camera kick
    this.aimKick = 0.1 + cal * 0.07; this.vx -= dx * cal * cal * 9 * (this.crouch ? 0.4 : 1); g.shake(0.8 + cal * 1.1);
    this._emptyTold = 0;
  }
  gunButt(w) { // pistol-whip / rifle-butt when the gun is dry
    const g = this.g; if (this.cd > 0) return; const A = this.anat; this.cd = w.twoHand ? 0.7 : 0.5; this.swingDur = this.swingT = 0.28; A.stam -= 5;
    NE.Audio.play('swing', 0.8); let best = null, bd = 1e9;
    for (const a of g.actors) { if (a === this || !a.alive || a.isRemote || a.town) continue; const dx = a.x - this.x; if (dx * this.facing < -2 || Math.abs(dx) > 17 + (w.twoHand ? 4 : 0) || Math.abs(a.y - this.y) > 16) continue; if (Math.abs(dx) < bd) { bd = Math.abs(dx); best = a; } }
    if (!best) return; const part = Math.hypot(g.mouse.wx - best.x, g.mouse.wy - best.cy) < 26 ? best.partNear(g.mouse.wx, g.mouse.wy) : 'torso';
    const dmg = (w.twoHand ? 17 : 13) * 1.2 * this.stats.melee * A.armFactor(); best.hurt(part, dmg, 'blunt', this.surv.first, { x: this.facing, y: -0.2 }); best.lastBy = this;
    best.vx += this.facing * 90; best.stagger = Math.max(best.stagger || 0, 0.5); NE.Audio.play('hit', 1); g.shake(1.6); if (best.onAggro) best.onAggro(this);
  }
  reload() {
    const e = this.equip.weapon; if (!e) return; const w = NE.ITEMS[e.id]; if (!w.gun) return; const g = this.g;
    if (e.jammed) { e.jammed = false; NE.Audio.play('reload'); g.toast('Cleared the jam.'); this.cd = 0.6; return; }
    const need = w.gun.mag - e.mag; const have = this.inv.count(w.gun.ammo); if (!need) return; if (!have) { g.toast('No ' + NE.ITEMS[w.gun.ammo].name + '.'); return; }
    const k = Math.min(need, have); this.inv.consume(w.gun.ammo, k); e.mag += k; NE.Audio.play('reload'); this.cd = 0.75 / Math.max(0.5, this.anat.armFactor());
  }
}
NE.Player = Player;

// ================= ENEMY =================
class Enemy extends Actor {
  constructor(g, x, y, type, depth) {
    const D = NE.ENEMIES[type]; const look = NE.makeSurvivor().look;
    super(g, x, y, { faction: D.faction, look, npc: true, hpMul: D.hpMul });
    this.type = type; this.D = D; this.depth = depth || 0; this.state = 'idle'; this.target = null; this.thinkT = rf(0, 0.3); this.atkT = 0; this.wander = rf(-1, 1) > 0 ? 1 : -1; this.wanderT = rf(1, 4); this.homeX = x; this.lostT = 0; this.hostile = true;
    this.shirt = D.shirt; this.pants = D.pants; if (D.skin) { this.skinCol = NE.shade(D.skin, rf(0.85, 1.1)); } if (type === 'feral' || type === 'husk') this.look.hair = pick(['bald', 'buzz', 'long', 'shaggy']); if (D.bare) { this.look.hair = type === 'trog' ? pick(['bald', 'long', 'shaggy']) : 'bald'; this.shirt = NE.shade(D.skin, 0.85); } if (type === 'husk') this.gear.head = { id: 'helmet', n: 1, dur: 30 }; this.hunch = type === 'trog' || type === 'stalker' || type === 'burrower' || type === 'feral';
    this.speedMul = rf(0.82, 0.95) * D.speed / 42;
    this.weapon = D.weapon ? pick(D.weapon) : null; if (this.weapon && depth > 400 && type === 'scav' && chance(0.3)) this.weapon = 'axe';
    if (type === 'scav' && depth > 200 && chance(0.15)) { this.weapon = 'pistol'; }
    this.ammo = this.weapon && NE.ITEMS[this.weapon].gun ? ri(4, 10) : 0;
    for (const [id, p] of (D.gear || [])) if (chance(p)) { const it = NE.ITEMS[id]; this.gear[it.slot] = { id, n: 1, dur: it.dur }; }
    if (type === 'scav' && chance(0.15 + depth / 2000)) this.gear.head = { id: 'helmet', n: 1, dur: 60 };
    this.stats = { speed: 1, climb: 1 };
  }
  weaponId() { return this.weapon; }
  get gunOut() { return this.weapon && NE.ITEMS[this.weapon].gun && (this.state === 'chase' || this.state === 'aim'); }
  get twoHand() { return !!(this.weapon && NE.ITEMS[this.weapon].twoHand); }
  inTown(o) { const W = this.g.world; if (!W || W.lobby) return false; const fl = W.floorOf(Math.floor((o.y - 2) / T)); return !!(fl && fl.town); }
  isHostileTo(a) { if (!a.alive || a === this || a.hidden || a.isPuppet) return false; if (this.inTown(a)) return false; /* towns are safe havens */ if (a.isPlayer || a.isRemote) return this.hostile; if (a.town) return false; if (!a.faction || a.faction === 'neutral') return false; return a.faction !== this.faction; }
  onAggro(src) { if (!this.alive) return; if (src && src.isPlayer && !this.hostile) { this.hostile = true; this.g.standoffBreak(this); } if (src && this.isHostileTo(src)) { this.target = src; this.state = 'chase'; this.lastSeen = { x: src.x, y: src.y }; } }
  onHurt(src) { const a = this.g.actors.find(x => (x.isPlayer || x.isRemote) && x.surv && x.surv.first === src) || this.g.actors.find(x => x.D && x.D.name === src); if (a) this.onAggro(a); }
  canSee(a) {
    const d = NE.dist(this.x, this.cy, a.x, a.cy); let range = this.D.sight * (this.g.blackout > 0 ? 1.25 : 1);
    if (a.isPlayer) { range *= (a.light.on ? 1.35 : 0.65) * (a.crouch ? 0.6 : 1) * (this.g.lightAt(a.x, a.cy) ? 1.3 : 1); }
    if (d > range) return false; if ((a.x - this.x) * this.facing < -20 && d > 26 && this.state === 'idle') return false;
    return this.g.world.los(this.x, this.y - this.h + 3, a.x, a.y - a.h + 3);
  }
  update(dt) {
    const g = this.g, A = this.anat;
    this.cd = Math.max(0, this.cd - dt); this.swingT = Math.max(0, this.swingT - dt); this.flash = Math.max(0, this.flash - dt);
    A.update(dt, {}); if (A.dead) { g.onEnemyDeath(this, A.cause); return; }
    if (this.inTown(this)) { this.gone = true; return; } // hostiles never set foot in a town
    if (this.target && this.inTown(this.target)) { this.target = null; this.state = 'idle'; this.exec = null; this.windT = 0; this.charge = null; }
    if (A.uncon && !this.rd) this.knockdown(0, 0, 0.6);
    if (this.ragTick(dt)) return;
    if (this.getUpT > 0) { this.physicsMove(dt, { mx: 0 }); NE.Combat.tick(this, dt, this.x + this.facing * 10, this.y, false); return; }
    // staggered: reeling from a hit, can't act
    if (this.stagger > 0) { this.stagger -= dt; this.windT = 0; this.charge = null; this.exec = null; this.guard = null; this.lungeNext = false; this.fallHurt(this.physicsMove(dt, { mx: 0 })); NE.Combat.tick(this, dt, this.x + this.facing * 10, this.y, false); return; }
    this.thinkT -= dt;
    if (this.thinkT <= 0) {
      this.thinkT = 0.25;
      let best = null, bd = 1e9; for (const a of g.actors) { if (!this.isHostileTo(a)) continue; const d = NE.dist(this.x, this.y, a.x, a.y); if (d < bd && this.canSee(a)) { bd = d; best = a; } }
      if (best && (this.state === 'idle' || this.state === 'search') && best.abil && best.abil.includes('royal') && ['feral', 'trog', 'husk'].includes(this.type) && chance(0.4)) { this.state = 'flee'; this.target = best; NE.Audio.play('growl', 0.4); best = null; }
      if (best) { if (this.state === 'idle' || this.state === 'search') { if (best.isPlayer) { g.say(pick(NE.MONO.spotted), 0.4); } NE.Audio.play(this.type === 'feral' ? 'growl' : 'shout', 0.6); } this.target = best; this.state = this.state === 'aim' ? 'aim' : 'chase'; this.lastSeen = { x: best.x, y: best.y }; this.lostT = 0; }
      else if (this.target) { this.lostT += 0.25; if (this.lostT > 4) { this.target = null; this.state = 'search'; this.searchT = 5; } }
      const thr = A.threshold; if ((A.pain > thr * 1.1 || A.blood < 3100) && this.type !== 'feral' && this.state !== 'flee' && chance(0.5)) { this.state = 'flee'; NE.Audio.play('shout'); }
      if (this.type === 'feral' && chance(0.04)) NE.Audio.play('growl', 0.4);
      const hr = this.D.hears || 1;
      for (const n of g.noises) if (NE.dist(n.x, n.y, this.x, this.y) < n.r * hr && Math.abs(n.y - this.y) < 50 * hr) {
        if (this.D.blind || hr > 1.5) { const src = g.actors.find(a => this.isHostileTo(a) && NE.dist(a.x, a.y, n.x, n.y) < 30); if (src) { if (this.state !== 'chase') NE.Audio.play('growl', 0.5); this.target = src; this.state = 'chase'; this.lastSeen = { x: n.x, y: n.y }; this.lostT = 0; continue; } }
        if (!this.target) { this.state = 'search'; this.lastSeen = { x: n.x, y: n.y }; this.searchT = 5; } }
    }
    let c = { mx: 0 }; const t = this.target; const isGun = this.weapon && NE.ITEMS[this.weapon].gun;
    if (!isGun) { const tt = t && t.alive && (this.state === 'chase') ? t : null; const gx = this.guard ? this.x + this.facing * 14 : tt ? tt.x : this.x + this.facing * 20, gy = this.guard ? this.y - this.h - 6 : tt ? tt.cy : this.y + 2; NE.Combat.tick(this, dt, gx, gy, !A.uncon && !this.climbing && !this.crawl); }
    if (this.state === 'idle') { if (!this.post) { this.wanderT -= dt; if (this.wanderT <= 0) { this.wander = chance(0.3) ? 0 : chance(0.5) ? 1 : -1; this.wanderT = rf(1.5, 4); } c.mx = this.wander * 0.35; if (this.bumped) { this.wander *= -1; this.bumped = 0; } } }
    else if (this.state === 'search') { this.searchT -= dt; const dx = this.lastSeen.x - this.x; if (Math.abs(dx) > 6) c.mx = Math.sign(dx) * 0.6; if (this.searchT <= 0) this.state = 'idle'; }
    else if (this.state === 'flee') { const src = t || g.player; c.mx = src ? -Math.sign(src.x - this.x) : 0; c.sprint = true; if (A.pain < A.threshold * 0.7 && A.blood > 3500) this.state = t ? 'chase' : 'idle'; }
    else if ((this.state === 'chase' || this.state === 'aim') && t) {
      if (!t.alive) { this.target = null; this.state = 'idle'; this.exec = null; }
      else {
        const dx = t.x - this.x, dy = t.y - this.y, d = Math.abs(dx); this.facing = dx >= 0 ? 1 : -1;
        const L = Math.hypot(dx, t.cy - this.cy) || 1; this.aimDir = { x: dx / L, y: (t.cy - this.cy) / L };
        if (isGun) {
          const see = g.world.los(this.x, this.y - this.h * 0.8, t.x, t.y - t.h + 4);
          if (this.state === 'aim') { this.atkT -= dt; if (!see) this.state = 'chase'; else if (this.atkT <= 0) { this.fireGun(t); this.state = 'chase'; this.atkT = 0; } }
          else { if (see && d < 190 && this.cd <= 0 && this.ammo > 0) { this.state = 'aim'; this.atkT = rf(0.42, 0.7) * (this.type === 'specops' ? 0.75 : 1); } else if (this.ammo <= 0) { c.mx = Math.sign(dx); } else if (d > 120 || !see) c.mx = Math.sign(dx) * 0.8; else if (d < 50) c.mx = -Math.sign(dx) * 0.6; }
        } else {
          const mw = NE.Combat.weaponOf(this); const reach = 9.5 + (NE.Combat.WLEN[this.weapon || (this.D.reach > 12 ? 'claws' : 'fists')] || 2) + (this.D.reach > 12 ? 3 : 0);
          const ko = t.anat && t.anat.uncon && !t.anat.dead;
          if (ko && d < reach + 4 && Math.abs(dy) < 14 && mw) { // knockout finisher: one decisive blow on a helpless body
            if (!this.exec) { this.exec = { t: 0 }; this.charge = { t: 0 }; if (t.isPlayer) g.log(this.D.name + ' stands over you, weapon raised...', 'bad'); NE.Audio.play('shout', 0.7); }
            this.exec.t += dt; this.charge.t += dt;
            if (this.exec.t > 4) { this.exec = null; this.charge = null; NE.Combat.strike(this, mw, 1.6); const k = mw.melee.kind === 'blunt' ? 'blunt' : 'sharp'; t.hurt('head', 220, k, this.D.name, { x: this.facing, y: 0.6 }); if (t.anat && !t.anat.dead) { t.anat.org.brain = 0; t.anat.cause = 'Executed by ' + this.D.name; } g.shake(5); NE.Audio.play('crack', 1); this.cd = 1.2; }
          } else if (this.guard) { // holding a guard: shuffle back, wait for an opening
            this.guardT -= dt; c.mx = d < reach ? -Math.sign(dx) * 0.35 : 0; if (this.guardT <= 0 || ko) { this.guard = null; this.cd = Math.min(this.cd, 0.15); }
          } else if (this.windT > 0) { // readable wind-up before every swing
            this.windT -= dt; if (this.charge) this.charge.t += dt; c.mx = this.lungeNext ? 0 : 0;
            if (this.windT <= 0) { const heavy = this.heavyNext ? 1.35 : 0; this.charge = null; const lg = this.lungeNext; this.lungeNext = false; if (lg) { this.vx = Math.sign(dx) * 150; this.knockT = 0.2; NE.Audio.play('lunge', 0.7); } NE.Combat.strike(this, mw, heavy, lg && mw.melee.kind === 'sharp' ? 'thrust' : null); if (lg && this.strk) this.strk.lunge = true; this.cd = (mw.melee.cd || 0.8) * 1.15 + rf(0.45, 0.9); this.backT = rf(0.45, 0.9); if (this.type === 'feral' || this.D.bare) NE.Audio.play('growl', 0.5); }
          } else if (this.backT > 0) { this.backT -= dt; c.mx = -Math.sign(dx) * 0.55; if (d > reach + 18) this.backT = 0; }
          else if (this.cd > 0 && d < reach + 6) { c.mx = d < reach ? -Math.sign(dx) * 0.4 : 0; } // circle at the edge of reach while recovering
          else if (this.D.block && mw && t.isPlayer && d < reach + 14 && (t.charge || (t.strk && !t.strk.poke)) && !this.guardCD && chance(this.D.block * dt * 6)) { this.guard = { t0: g.t }; this.guardT = rf(0.5, 1.1); this.guardHP = 22 + this.D.block * 30; this.guardCD = 1; setTimeout(() => { this.guardCD = 0; }, 2200); }
          else if (this.D.lunge && d > reach + 4 && d < reach + 24 && Math.abs(dy) < 10 && this.cd <= 0 && mw && chance(dt * 1.6)) { this.lungeNext = true; this.heavyNext = false; this.windT = 0.42; this.charge = { t: 0 }; }
          else if (d < reach + 2 && Math.abs(dy) < 14 && this.cd <= 0 && mw && !(t.isPlayer && g.actors.some(o => o !== this && o.D && o.windT > 0 && o.target === t && Math.abs(o.x - t.x) < 30))) { this.exec = null; this.heavyNext = (mw.w || 0) > 2 || chance(0.2); this.windT = (0.28 + (mw.w || 0.3) * 0.07 + (this.heavyNext ? 0.25 : 0)) * (t.abil && t.abil.includes('hive') ? 1.35 : 1); this.charge = { t: 0 }; }
          else if (d > reach - 3) { this.exec = null; c.mx = Math.sign(dx); c.sprint = d > 30 && this.type !== 'scav' && this.type !== 'husk'; }
          if (dy > 20 && d < 30 && this.onGround) c.drop = true;
        }
      }
    } else if (!t && this.state !== 'flee') this.state = 'idle';
    if (this.D.digs && t && this.state === 'chase') { const W = g.world; const ddx = Math.sign(t.x - this.x) || this.facing; const tx = Math.floor((this.x + ddx * (this.w / 2 + 2)) / NE.T); this.digT = (this.digT || 0) - dt;
      if (this.digT <= 0) for (const yy of [this.y - 3, this.y - this.h * 0.5, this.y - this.h + 2]) { const ty = Math.floor(yy / NE.T); if (W.solid(W.get(tx, ty)) && W.diggable(tx, ty)) { W.damageTile(tx, ty, 2.5); this.digT = 0.5; g.dust((tx + 0.5) * NE.T, (ty + 0.5) * NE.T, 3); NE.Audio.play('dig', 0.5); break; } }
      if (t.y > this.y + 20 && this.digT <= 0) { const ty = Math.floor((this.y + 2) / NE.T), tx2 = Math.floor(this.x / NE.T); if (W.diggable(tx2, ty)) { W.damageTile(tx2, ty, 2.5); this.digT = 0.6; } } }
    if (this.bumped && this.onGround && c.mx && Math.sign(c.mx) === this.bumped) { c.jump = true; } this.bumped = 0;
    const res = this.physicsMove(dt, c); this.fallHurt(res);
    if (this.stepT > 18) { this.stepT = 0; }
  }
  meleeHit(t) {
    const D = this.D; let dmg, kind;
    if (this.weapon) { const m = NE.ITEMS[this.weapon].melee; dmg = m.dmg * rf(0.75, 1.05); kind = m.kind; } else { dmg = D.dmg * rf(0.8, 1.2); kind = D.kind; }
    dmg *= this.anat.armFactor();
    const part = NE.wpick([['torso', 4.5], ['head', 1.3], ['larm', 1.2], ['rarm', 1.2], ['lleg', 1], ['rleg', 1]]);
    t.hurt(part, dmg, kind, D.name, { x: this.facing, y: -0.1 }); NE.Audio.play(kind === 'sharp' || kind === 'bite' ? 'slash' : 'hit'); if (t.isPlayer) this.g.shake(2);
    if (t.onAggro) t.onAggro(this);
    if (kind === 'bite' && t.isPlayer && chance(0.3)) { t.anat.parts[part].wounds.forEach(w => w.dirty = Math.min(1, w.dirty + 0.3)); }
  }
  fireGun(t) {
    const g = this.g; if (this.ammo <= 0) return; this.ammo--; const w = NE.ITEMS[this.weapon];
    const d = NE.dist(this.x, this.y, t.x, t.y); let acc = 0.11 + d / 2200 + (t.crouch ? 0.04 : 0) + Math.abs(t.vx) / 1500 + (this.anat.armFactor() < 0.8 ? 0.08 : 0); if (this.type === 'specops') acc *= 0.6;
    const ang = Math.atan2(t.cy - this.rag.pts[6].y, t.x - this.rag.pts[6].x) + rf(-acc, acc);
    for (let k = 0; k < (w.gun.pellets || 1); k++) { const a2 = ang + (k ? rf(-w.gun.spread, w.gun.spread) * 1.5 : 0); g.fireRay(this, this.rag.pts[6].x, this.rag.pts[6].y, Math.cos(a2), Math.sin(a2), w.gun.range, w.gun.dmg * rf(0.55, 0.75), w.gun.snd || 'gun', k > 0); }
    this.cd = w.gun.cd + rf(0.3, 0.7);
  }
  dropLoot() {
    const items = [];
    if (this.weapon) { const e = { id: this.weapon, n: 1 }; if (NE.ITEMS[this.weapon].gun) e.mag = Math.min(this.ammo, NE.ITEMS[this.weapon].gun.mag); items.push(e); }
    for (const s in this.gear) { const e = this.gear[s]; if (e && e.dur > 3) items.push(e); }
    for (const [id, p] of this.D.loot) if (chance(p * 0.3)) { const it = NE.ITEMS[id]; items.push({ id, n: it.stack ? (it.cat === 'ammo' ? ri(2, 8) : ri(1, 2)) : (it.uses || 1) }); }
    if (this.weapon && NE.ITEMS[this.weapon].gun && this.ammo > 0) items.push({ id: NE.ITEMS[this.weapon].gun.ammo, n: this.ammo });
    // fights pay: silver on every body (more from tougher foes and deeper down), and a chance of supplies
    const th = NE.THREAT[this.type] || 1, dp = this.depth || 0; items.push({ id: 'silver', n: Math.max(1, Math.round((ri(2, 4) + dp / 120) * th)) });
    if (chance(0.35 + th * 0.08)) { const it = NE.wpick([['bandage', 3], ['rag', 3], ['painkillers', 2], ['water', 2], ['ration', 2], ['battery', 2], ['tape', 2], ['ammo9', 1.5], ['antiseptic', 1], ['splint', 1], ['trinket', 1.5]]); const D2 = NE.ITEMS[it]; items.push({ id: it, n: D2.stack ? (D2.cat === 'ammo' ? ri(4, 10) : 1) : (D2.uses || 1) }); }
    if (th >= 1.9 && chance(0.15)) items.push({ id: 'nectar', n: 1 });
    return items;
  }
}
NE.Enemy = Enemy;

// ================= NEUTRAL NPC (wounded survivor / trader) =================
class NPC extends Actor {
  constructor(g, x, y, kind) {
    const look = NE.makeSurvivor().look; super(g, x, y, { faction: 'neutral', look, npc: true }); this.kind = kind; this.isNPC = true;
    const s = NE.makeSurvivor(); this.name = s.name; this.shirt = look.shirt; this.pants = look.pants;
    if (kind === 'survivor') { this.anat.damage(pick(['lleg', 'rleg', 'torso']), 18, 'sharp'); this.anat.parts.lleg.frac = true; this.label = 'Wounded Survivor'; this.act = 'talk'; this.sitting = true; }
    else if (kind === 'trader') { this.masked = true; this.label = 'Masked Trader'; this.act = 'trade'; this.packCol = ['#3a3028', '#c09040']; this.weapon = 'rifle'; this.gear.body = { id: 'platevest', n: 1, dur: 150 }; }
    else if (kind === 'town') { this.town = true; this.homeX = x; this.wanderT = rf(0, 3); this.wander = 0; this.speedMul = 0.7; }
  }
  setRole(role, name, look) { this.role = role; if (name) this.name = name; if (look) { this.look = look; this.shirt = look.shirt; this.pants = look.pants; }
    this.label = { trader: 'Trader ' + this.name.split(' ')[0], doctor: 'Doc ' + this.name.split(' ')[1], folk: this.name }[role]; this.act = { trader: 'trade', doctor: 'doctor', folk: 'chat' }[role];
    if (role === 'doctor') { this.shirt = '#d8d4c8'; } if (role === 'trader') this.packCol = ['#5a4030', '#c09040']; }
  weaponId() { return this.kind === 'trader' ? null : null; }
  update(dt) {
    const A = this.anat; const g = this.g; const pl = g.player, pr = g.net && g.net.on && g.net.peer;
    // wounded survivors hold on until someone actually finds them (then the clock starts)
    if (!this.met && !this.town) { const near = q => q && q.alive !== false && Math.abs(q.x - this.x) < 150 && Math.abs(q.y - this.y) < 60; if (near(pl) || near(pr)) this.met = true; else if (this.kind === 'survivor') { if (g.player) this.facing = g.player.x > this.x ? 1 : -1; return; } }
    if (this.kind === 'survivor' && !this.treated) { for (const p of NE.PARTS) for (const w of A.parts[p].wounds) if (!w.closed) w.bleed = Math.max(w.bleed, 0.3); }
    A.update(dt, {}); if (A.dead) { this.g.onEnemyDeath(this, 'Bled out'); return; }
    const c = { mx: 0, crouch: this.sitting };
    if (this.town) { this.wanderT -= dt; if (this.wanderT <= 0) { this.wanderT = rf(2, 6); this.wander = this.role === 'folk' && chance(0.6) ? (chance(0.5) ? 1 : -1) : 0; } if (Math.abs(this.x - this.homeX) > 40) this.wander = Math.sign(this.homeX - this.x); c.mx = this.wander * 0.4; if (this.bumped) { this.wander *= -1; this.bumped = 0; } this.fallHurt(this.physicsMove(dt, c)); if (!c.mx && this.g.player) this.facing = this.g.player.x > this.x ? 1 : -1; else if (c.mx) this.facing = Math.sign(c.mx); return; }
    if (this.leaving) { c.mx = this.leaving; c.crouch = false; this.sitting = false; this.leaveT -= dt; if (this.leaveT <= 0) this.gone = true; }
    if (this.g.player) this.facing = this.g.player.x > this.x ? 1 : -1;
    this.fallHurt(this.physicsMove(dt, c));
  }
}
NE.NPC = NPC;

// ================= TREATMENT =================
NE.treatDuration = function (pl, entry, op) {
  const it = entry ? NE.ITEMS[entry.id] : null; const base = op === 'removeTq' ? 1.5 : { bandage: 3, tq: 2, suture: 7, splint: 5, forceps: 5, clean: 2.5, drug: it && it.drug === 'blood' ? 5 : 1.5 }[it.med] || 2;
  return base * pl.stats.treat * (pl.g.nearTable ? 0.6 : 1) / Math.sqrt(Math.max(0.3, pl.anat.armFactor()));
};
NE.canTreat = function (pl, id, part) {
  const it = NE.ITEMS[id], A = pl.anat, P = A.parts[part]; const limb = part !== 'head' && part !== 'torso';
  switch (it.med) {
    case 'bandage': return P.wounds.some(w => !w.closed) || P.wounds.some(w => w.t === 'burn') ? true : 'No open wounds here.';
    case 'tq': return !limb ? 'Tourniquets only go on limbs.' : P.tq ? 'Already has a tourniquet.' : true;
    case 'suture': return P.wounds.some(w => !w.closed && !w.bullet) ? true : P.wounds.some(w => w.bullet) ? 'Remove the fragment first (forceps or a blade).' : 'Nothing to stitch.';
    case 'splint': return P.frac ? (P.splint ? 'Already splinted.' : true) : 'No fracture here.';
    case 'forceps': return P.wounds.some(w => w.bullet) ? true : 'Nothing lodged here.';
    case 'clean': return P.wounds.length ? true : 'No wounds to clean.';
    case 'drug': return true;
  }
  return 'Can\'t use that here.';
};
NE.applyTreatment = function (pl, entry, part, op) {
  const g = pl.g, A = pl.anat, P = A.parts[part]; const table = g.nearTable; const st = pl.stats;
  const blackout = (spike) => { A.painSpike += spike * (table ? 0.35 : 1); if (!st.coldblood && !table && A.pain + spike > A.threshold + 30 && chance(0.55)) { A.cons -= 50; g.say('Everything goes white—', 1); } };
  if (op === 'dig') { const w = P.wounds.find(x => x.bullet); if (!w || !pl.inv.items.includes(entry)) return; const ch = NE.DIG_TOOLS[entry.id] || 0.6;
    blackout(46); A.painSpike += 10; w.dirty = Math.min(1, w.dirty + (entry.id === 'scrap' ? 0.5 : 0.3));
    if (chance(ch)) { for (const w2 of P.wounds) if (w2.bullet) { w2.bullet = false; w2.bleed += 0.7; } g.toast('You dig the fragment out with the ' + NE.ITEMS[entry.id].name.toLowerCase() + '. It bleeds — dress it.'); NE.Audio.play('pain'); }
    else { w.bleed += 0.6; g.toast('Your hand slips — the fragment is still in there.'); NE.Audio.play('pain'); }
    if (entry.id === 'lockpick' && chance(0.3)) { entry.n--; if (entry.n <= 0) pl.inv.remove(entry); g.toast('The lockpick snapped.'); } if (entry.id === 'scrap') { entry.n--; if (entry.n <= 0) pl.inv.remove(entry); }
    return; }
  if (op === 'reset') { if (!P.disl) return; const ok = chance(clamp(0.62 * st.medEff * (table ? 1.25 : 1) + (A.drugs.morphine > 0 ? 0.15 : 0), 0.3, 0.95)); blackout(38);
    if (ok) { P.disl = false; NE.Audio.play('pop'); NE.Audio.play('pain'); g.shake(2); g.toast('CLUNK. The joint slams back into place.'); g.say(pick(['Fuck— okay. Okay.', 'Better. God.', 'That\'s... in.']), 0.6); }
    else { A.painSpike += 18; NE.Audio.play('pain'); g.toast('It grinds and slips back out. Try again.'); } NE.UI.refresh(); return; }
  if (op === 'amputate') { if (!entry || !pl.inv.items.includes(entry) || P.severed) return; blackout(75); A.painSpike += 40; A.stress = Math.min(100, A.stress + 30); NE.amputate(pl, part); g.shake(5); NE.UI.refresh(); return; }
  if (op === 'fit') { if (!entry || !pl.inv.items.includes(entry) || !P.severed || P.prost) return; const pd = NE.ITEMS[entry.id].prost;
    P.prost = { id: entry.id, name: NE.ITEMS[entry.id].name, eff: pd.eff, kind: pd.kind, col: NE.ITEMS[entry.id].col, fitT: 0 }; for (const w of P.wounds) { w.closed = true; w.bleed = 0; w.inf = 0; } P.wounds = []; P.tq = false; P.bandage = null; entry.n--; if (entry.n <= 0) pl.inv.remove(entry); A.painSpike += 14; NE.Audio.play('metal', 0.7);
    g.toast('Strapped on the ' + P.prost.name.toLowerCase() + ' (' + Math.round(pd.eff * 100) + '% function).'); NE.UI.refresh(); return; }
  if (op === 'unfit') { if (!P.prost) return; const id = P.prost.id; P.prost = null; pl.inv.add(id, 1); g.toast('Unstrapped the prosthetic.'); NE.UI.refresh(); return; }
  if (op === 'removeTq') { P.tq = false; P.tqT = 0; pl.inv.add('tourniquet', 1); g.toast('Tourniquet removed.'); return; }
  if (!pl.inv.items.includes(entry)) { g.toast('Item missing.'); return; }
  const it = NE.ITEMS[entry.id]; const ok = NE.canTreat(pl, entry.id, part); if (ok !== true) { g.toast(ok); return; }
  const use = () => { entry.n--; if (entry.n <= 0) pl.inv.remove(entry); };
  switch (it.med) {
    case 'bandage': { P.bandage = { q: Math.min(1, it.q * st.medEff), soak: 0, dirty: !!it.dirty }; if (it.dirty) P.wounds.forEach(w => w.dirty = Math.min(1, w.dirty + it.dirty));
      // pressure: minor bleeds stop outright, worse ones are cut down hard (arterial bleeds still need a tourniquet)
      let stopped = 0; for (const w of P.wounds) { if (w.closed || w.t === 'art') continue; w.bleed *= 1 - 0.55 * P.bandage.q; if (w.bleed < 0.55 && !w.bullet) { w.closed = true; w.bleed = 0; stopped++; } }
      use(); g.toast('Bandaged ' + NE.PART_NAMES[part].toLowerCase() + (stopped ? ' — bleeding stopped.' : ' — bleeding slowed.') + (it.dirty ? ' (dirty: watch for infection)' : '')); break; }
    case 'tq': P.tq = true; P.tqT = 0; A.painSpike += 15; use(); g.toast('Tourniquet tightened. Don\'t leave it on too long.'); break;
    case 'suture': {
      const art = P.wounds.some(w => !w.closed && w.t === 'art');
      if (art && !P.tq) { g.toast('The artery sprays — clamp it with a tourniquet first.'); A.painSpike += 15; return; }
      let n = 0; for (const w of P.wounds) if (!w.closed && !w.bullet) { w.closed = true; w.bleed = 0; w.sutured = true; w.age = 0; n++; }
      use(); blackout(35); g.toast('Stitched ' + n + ' wound' + (n > 1 ? 's' : '') + '.'); break;
    }
    case 'splint': P.splint = true; use(); A.painSpike += 12; g.toast('Splinted. It\'ll knit in time.'); break;
    case 'forceps': for (const w of P.wounds) if (w.bullet) { w.bullet = false; w.bleed += 0.6; } use(); blackout(32); g.toast('Pulled out the fragment.'); NE.Audio.play('pain'); break;
    case 'clean': for (const w of P.wounds) { w.dirty = 0; w.inf *= 0.5; } use(); A.painSpike += entry.id === 'alcohol' ? 22 : 12; g.toast('Disinfected. It stings like hell.'); break;
    case 'drug': {
      const d = it.drug; A.drugs[d] = 1; use();
      if (d === 'adrenaline') { A.stam = A.stamMax; A.cons = Math.max(A.cons, 40); if (A.uncon) A.uncon = false; }
      g.toast({ painkiller: 'Swallowed painkillers.', morphine: 'Morphine. Warm and distant.', antibiotic: 'Took antibiotics.', antirad: 'Took anti-rad.', adrenaline: 'ADRENALINE.', blood: 'Transfusing...', herb: 'Chewed a bitter herb. The pain dulls.' }[d]); break;
    }
  }
  if (chance(0.3)) g.say(pick(NE.MONO.treat), 0.3);
  NE.UI.refresh();
};
// improvised extraction: any blade or tool can dig a fragment out (slower, hurts more, dirtier, can slip)
NE.DIG_TOOLS = { knife: 0.88, cleaver: 0.85, shiv: 0.8, machete: 0.75, lockpick: 0.8, crowbar: 0.6, spear: 0.7, pickaxe: 0.55, axe: 0.55, fireaxe: 0.5, scrap: 0.6 };
// self-amputation: off it comes. Clears the limb's wounds and infection, leaves a stump that bleeds hard unless a tourniquet is on.
NE.AMP_TOOLS = { saw: 8, fireaxe: 5, axe: 5.5, cleaver: 7, machete: 7.5, sledge: 0, knife: 14, shiv: 18 };
NE.amputate = function (a, part, dir) {
  const A = a.anat, P = A.parts[part]; if (!P || P.severed) return; const tq = P.tq; P.wounds = []; P.frac = false; P.splint = false; P.disl = false; P.bandage = null;
  const ok = NE.Gore.sever(a, part, dir || { x: -a.facing * 0.3, y: 0.4 });
  if (!ok) { P.hp = 0; P.severed = true; a.sev = a.sev || {}; a.sev[part] = a.g.t; P.wounds.push({ t: 'art', bleed: 9, dirty: 0.3, inf: 0, closed: false, age: 0, bullet: false }); NE.Audio.play('squelch'); }
  P.tq = tq; if (P.wounds.length) P.wounds[P.wounds.length - 1].dirty = 0.15; A.ev.push('amputated');
};
NE.OP_DUR = { reset: 2.6, fit: 8, unfit: 2.5 };
NE.startTreat = function (pl, entry, part, op) {
  const g = pl.g; if (pl.anat.uncon) return;
  if (op === 'reset' || op === 'fit' || op === 'unfit' || op === 'amputate') { const P = pl.anat.parts[part];
    if (op === 'reset' && !P.disl) return; if ((op === 'fit' && (!P.severed || P.prost)) || (op === 'unfit' && !P.prost)) return; if (op === 'amputate' && (P.severed || !entry || !NE.AMP_TOOLS[entry.id])) return;
    const base = op === 'amputate' ? NE.AMP_TOOLS[entry.id] : NE.OP_DUR[op]; pl.treating = { entry, part, op, t: 0, dur: base * pl.stats.treat * (g.nearTable ? 0.7 : 1) / Math.sqrt(Math.max(0.3, pl.anat.armFactor())) };
    NE.Audio.play(op === 'reset' ? 'gasp' : 'open_cloth', 0.6); if (op === 'amputate') g.say(pick(['Don\'t think. Just do it.', 'Bite down. Go.', 'It\'s rotten anyway...']), 0.8); return; }
  if (op === 'dig') { if (!pl.anat.parts[part].wounds.some(w => w.bullet)) return g.toast('Nothing lodged here.'); pl.treating = { entry, part, op, t: 0, dur: 6 * pl.stats.treat * (g.nearTable ? 0.6 : 1) / Math.sqrt(Math.max(0.3, pl.anat.armFactor())) }; NE.Audio.play('open_cloth'); return; }
  if (op !== 'removeTq') { const ok = NE.canTreat(pl, entry.id, part); if (ok !== true) { g.toast(ok); NE.Audio.play('deny'); return; } }
  pl.treating = { entry, part, op, t: 0, dur: NE.treatDuration(pl, entry, op) }; NE.Audio.play('open_cloth');
};
NE.quickBandage = function (pl) {
  const A = pl.anat; let bp = null, bb = 0.05; for (const p of NE.PARTS) { const b = A.partBleed(p); if (b > bb) { bb = b; bp = p; } }
  if (!bp) { pl.g.toast('Not bleeding.'); return; }
  const P = A.parts[bp]; const limb = bp !== 'head' && bp !== 'torso';
  if (limb && P.wounds.some(w => w.t === 'art' && !w.closed) && !P.tq) { const e = pl.inv.find('tourniquet'); if (e) return NE.startTreat(pl, e, bp); }
  for (const id of ['bandage', 'cleanrag', 'rag']) { const e = pl.inv.find(id); if (e) return NE.startTreat(pl, e, bp); }
  pl.g.toast('Nothing to bandage with. Tear your clothes (Crafting).');
};
NE.consume = function (pl, entry) {
  const g = pl.g, A = pl.anat, it = NE.ITEMS[entry.id];
  if (entry.id === 'royaljelly') { entry.n--; if (entry.n <= 0) pl.inv.remove(entry); g.mutateVariant && g.mutateVariant(pl, 'jelly'); return true; }
  if (it.cat === 'food') {
    const fm = pl.stats.mand ? 2 : 1; if (it.hunger) A.hunger = Math.min(100, A.hunger + it.hunger * fm); if (it.thirst) A.thirst = Math.min(100, A.thirst + it.thirst);
    if (it.tox) A.tox += it.tox * pl.stats.tox; if (it.stress) A.stress = Math.max(0, A.stress + it.stress);
    entry.n--; if (entry.n <= 0) pl.inv.remove(entry); if (entry.id === 'water' || entry.id === 'dirtywater') { if (chance(0.5)) pl.inv.add('bottle', 1); }
    g.toast((it.thirst ? 'Drank ' : 'Ate ') + it.name.toLowerCase() + '.'); NE.Audio.play('ui'); return true;
  }
  if (entry.id === 'nectar') { entry.n--; if (entry.n <= 0) pl.inv.remove(entry); g.drinkNectar(pl); return true; }
  if (entry.id === 'battery') { pl.light.bat = 100; entry.n--; if (entry.n <= 0) pl.inv.remove(entry); g.toast('Lantern refilled.'); NE.Audio.play('splash', 0.4); return true; }
  if (entry.id === 'filter') { if (!pl.gear.face) { g.toast('Equip a respirator first.'); return false; } pl.filterT += 90; entry.n--; if (entry.n <= 0) pl.inv.remove(entry); g.toast('Filter screwed in (+90s).'); return true; }
  if (it.med === 'drug') { NE.startTreat(pl, entry, 'torso'); return true; }
  return false;
};

// ================= THROWABLES =================
NE.throwItem = function (g, pl, id) {
  const e = pl.inv.find(id); if (!e) return; const it = NE.ITEMS[id];
  const ox = pl.x + pl.facing * 3, oy = pl.y - pl.h + 4; const d = pl.aimDir; const pow = 260 * Math.max(0.5, pl.anat.armFactor());
  let b; const P = g.phys;
  if (id === 'brick') { b = P.box('brick', ox, oy, 4, 3, 2, '#7a7068'); }
  else if (id === 'dynamite') { b = P.stick('dynamite', ox, oy, 4, Math.atan2(d.y, d.x), 1.2, 0.8); b.fuse = 2.5; b.color = '#c02020'; }
  else { b = P.stick(it.throwable, ox, oy, 4, Math.atan2(d.y, d.x), 1.2, 0.6); }
  b.thrownBy = pl; b.item = id; b.setVel(d.x * pow + pl.vx, d.y * pow - 40 + pl.vy * 0.5); b.life = id === 'flare' ? 40 : id === 'glowstick' ? 150 : 0; if (g.net && g.net.on) g.net.send({ t: 'throw', id, x: ox, y: oy, vx: d.x * pow + pl.vx, vy: d.y * pow - 40 + pl.vy * 0.5 });
  if (id === 'bottle' || id === 'molotov') b.onImpact = (bb, p, v) => { if (v > 110 && !bb.remove) { bb.remove = true; NE.Audio.play('glass'); g.noise(p.x, p.y, 130); g.sparks(p.x, p.y, 6, '#9ad'); if (id === 'molotov') g.addFire(p.x, p.y, 16, 9); } };
  else b.onImpact = (bb, p, v) => { if (v > 120) { NE.Audio.play('thud', 0.5); g.noise(p.x, p.y, 70); } };
  e.n--; if (e.n <= 0) pl.inv.remove(e); NE.Audio.play('swing'); pl.swingT = 0.25; pl.swingDur = 0.25;
};
})(window.NE);
