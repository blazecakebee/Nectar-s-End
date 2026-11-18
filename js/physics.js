// Nectar's End — loose verlet physics: props, debris, thrown items, ragdolls
(function (NE) {
'use strict';
const T = NE.T;
class Body {
  constructor(kind) { this.kind = kind; this.pts = []; this.cons = []; this.tiles = true; this.collide = true; this.damp = 0.995; this.grav = 1; this.fric = 0.85; this.bounce = 0.25; this.remove = false; this.age = 0; }
  point(x, y, r, m) { const p = { x, y, ox: x, oy: y, r: r || 1.5, m: m || 1, body: this, hitT: 0 }; this.pts.push(p); return p; }
  link(a, b, stiff, len) { const pa = this.pts[a], pb = this.pts[b]; this.cons.push({ a: pa, b: pb, len: len != null ? len : Math.hypot(pa.x - pb.x, pa.y - pb.y), s: stiff == null ? 1 : stiff }); }
  setVel(vx, vy) { for (const p of this.pts) { p.ox = p.x - vx / 60; p.oy = p.y - vy / 60; } }
  center() { let x = 0, y = 0; for (const p of this.pts) { x += p.x; y += p.y; } return { x: x / this.pts.length, y: y / this.pts.length }; }
  vel() { let x = 0, y = 0; for (const p of this.pts) { x += p.x - p.ox; y += p.y - p.oy; } return { x: x / this.pts.length * 60, y: y / this.pts.length * 60 }; }
  speed() { const v = this.vel(); return Math.hypot(v.x, v.y); }
  move(dx, dy) { for (const p of this.pts) { p.x += dx; p.y += dy; p.ox += dx; p.oy += dy; } }
}
NE.PBody = Body;

class Phys {
  constructor(world) { this.world = world; this.bodies = []; }
  add(b) { this.bodies.push(b); return b; }
  box(kind, x, y, w, h, m, color) {
    const b = new Body(kind); b.w = w; b.h = h; b.color = color;
    const r = Math.min(w, h) * 0.3; NE.Phys.weigh(b, m);
    b.point(x - w / 2, y - h / 2, r, m); b.point(x + w / 2, y - h / 2, r, m); b.point(x + w / 2, y + h / 2, r, m); b.point(x - w / 2, y + h / 2, r, m);
    b.link(0, 1); b.link(1, 2); b.link(2, 3); b.link(3, 0); b.link(0, 2); b.link(1, 3);
    return this.add(b);
  }
  stick(kind, x, y, len, ang, r, m) {
    const b = new Body(kind); const dx = Math.cos(ang) * len / 2, dy = Math.sin(ang) * len / 2; NE.Phys.weigh(b, m);
    b.point(x - dx, y - dy, r, m); b.point(x + dx, y + dy, r, m); b.link(0, 1); return this.add(b);
  }
  step(dt) {
    const g = NE.GRAV * dt * dt; const W = this.world;
    for (const b of this.bodies) {
      b.age += dt;
      if (b.drive) b.drive(b, dt);
      for (const p of b.pts) {
        let vx = (p.x - p.ox) * b.damp, vy = (p.y - p.oy) * b.damp;
        const mx = 9; if (vx > mx) vx = mx; if (vx < -mx) vx = -mx; if (vy > mx) vy = mx; if (vy < -mx) vy = -mx;
        p.ox = p.x; p.oy = p.y; p.x += vx; p.y += vy + g * b.grav;
        if (p.water = W.isWater(p.x, p.y)) { p.ox = NE.lerp(p.ox, p.x, 0.08); p.oy = NE.lerp(p.oy, p.y, 0.08); p.y -= g * 0.6 * b.grav; }
      }
    }
    for (let it = 0; it < 3; it++) {
      for (const b of this.bodies) {
        for (const c of b.cons) {
          const dx = c.b.x - c.a.x, dy = c.b.y - c.a.y; const d = Math.hypot(dx, dy) || 0.0001;
          const diff = (d - c.len) / d * c.s; const ma = c.a.m, mb = c.b.m, tot = ma + mb;
          const fa = mb / tot, fb = ma / tot;
          c.a.x += dx * diff * fa; c.a.y += dy * diff * fa; c.b.x -= dx * diff * fb; c.b.y -= dy * diff * fb;
        }
        if (b.tiles) for (const p of b.pts) this.tileCollide(p, b);
      }
    }
    // body vs body (loose)
    const pts = []; for (const b of this.bodies) if (b.collide) for (const p of b.pts) pts.push(p);
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      for (let j = i + 1; j < pts.length; j++) {
        const b = pts[j]; if (a.body === b.body) continue;
        const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r; if (dx > rr || dx < -rr || dy > rr || dy < -rr) continue;
        const d = Math.hypot(dx, dy) || 0.001; if (d >= rr) continue;
        const push = (rr - d) / d * 0.5, tot = a.m + b.m;
        a.x -= dx * push * (b.m / tot) * 2; a.y -= dy * push * (b.m / tot) * 2; b.x += dx * push * (a.m / tot) * 2; b.y += dy * push * (a.m / tot) * 2;
      }
    }
    this.bodies = this.bodies.filter(b => !b.remove);
  }
  tileCollide(p, b) {
    const W = this.world, r = p.r;
    const x0 = Math.floor((p.x - r) / T), x1 = Math.floor((p.x + r) / T), y0 = Math.floor((p.y - r) / T), y1 = Math.floor((p.y + r) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const t = W.get(tx, ty); const solid = W.solid(t); const plat = !solid && W.platformish(tx, ty);
      if (!solid && !plat) continue;
      const rx = tx * T, ry = ty * T;
      if (plat) { if (p.oy + r > ry + 0.5 || p.y < p.oy) continue; }
      const cx = NE.clamp(p.x, rx, rx + T), cy = NE.clamp(p.y, ry, plat ? ry : ry + T);
      let dx = p.x - cx, dy = p.y - cy; let d = Math.hypot(dx, dy);
      if (d >= r) continue;
      let nx, ny;
      if (d < 0.0001) { // center inside tile: push up by default
        const dl = p.x - rx, dr = rx + T - p.x, du = p.y - ry, dd = ry + T - p.y; const m = Math.min(dl, dr, du, dd);
        if (m === du) { nx = 0; ny = -1; d = -du; } else if (m === dd) { nx = 0; ny = 1; d = -dd; } else if (m === dl) { nx = -1; ny = 0; d = -dl; } else { nx = 1; ny = 0; d = -dr; }
      } else { nx = dx / d; ny = dy / d; }
      const pen = r - d; p.x += nx * pen; p.y += ny * pen;
      const vx = p.x - p.ox, vy = p.y - p.oy; const vn = vx * nx + vy * ny;
      if (vn < 0) {
        const tx2 = vx - vn * nx, ty2 = vy - vn * ny;
        const nvx = tx2 * b.fric - nx * vn * b.bounce, nvy = ty2 * b.fric - ny * vn * b.bounce;
        if (b.onImpact && -vn > 2.5) b.onImpact(b, p, -vn * 60);
        p.ox = p.x - nvx; p.oy = p.y - nvy;
      }
    }
  }
  // push points out of an actor's AABB; actor velocity transfers. returns hard impacts
  pushActor(a) {
    const l = a.x - a.w / 2, r = a.x + a.w / 2, t = a.y - a.h, bt = a.y; const hits = [];
    for (const b of this.bodies) {
      if (!b.collide || b.owner === a || b.noActor) continue;
      for (const p of b.pts) {
        if (p.x + p.r < l || p.x - p.r > r || p.y + p.r < t || p.y - p.r > bt) continue;
        const vy = (p.y - p.oy) * 60, vx = (p.x - p.ox) * 60;
        const rv = Math.hypot(vx - a.vx, vy - a.vy); const toward = (a.x - p.x) * vx + (a.cy - p.y) * vy > 0;
        if (rv > 210 && toward && b.kind !== 'rag' && b.thrownBy !== a && b.dragBy !== a && b.age > 0.4) hits.push({ b, p, v: rv });
        const dl = p.x + p.r - l, dr = r - (p.x - p.r);
        // resting on the actor's head: sit there, ride along, never get launched
        if (p.y < t + 4 && vy >= 0) { p.y = t - p.r; p.oy = p.y; p.ox = NE.lerp(p.ox, p.x - a.vx / 60, 0.5); continue; }
        if (dl < dr) { p.x = l - p.r; p.ox = p.x - Math.min(0, a.vx) / 60 * 0.9 + 0.05; } else { p.x = r + p.r; p.ox = p.x - Math.max(0, a.vx) / 60 * 0.9 - 0.05; }
      }
    }
    return hits;
  }
  nearestPoint(x, y, maxD, filter) {
    let best = null, bd = maxD;
    for (const b of this.bodies) { if (filter && !filter(b)) continue; for (const p of b.pts) { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } } }
    return best;
  }
  impulse(x, y, rad, force) {
    for (const b of this.bodies) for (const p of b.pts) {
      const dx = p.x - x, dy = p.y - y; const d = Math.hypot(dx, dy); if (d > rad || d < 0.01) continue;
      const f = (1 - d / rad) * force / 60 / p.m; p.ox -= dx / d * f; p.oy -= dy / d * f;
    }
  }
}
// Heavier things fall faster, bounce less and slide less. m = mass per point.
Phys.weigh = function (b, m) { m = m || 1; b.mass = m; b.grav = 1.3 + Math.min(0.7, m * 0.14); b.damp = 0.993; b.bounce = m > 2 ? 0.08 : m > 1 ? 0.15 : 0.25; b.fric = m > 2 ? 0.62 : 0.78; };
NE.Phys = Phys;
})(window.NE);
