// Nectar's End — pan & zoom hex skill web. Center "YOU" hub, five glowing category hexes, rank chains branching out.
(function (NE) {
'use strict';
NE.SKILL_CATS = [
  { id: 'endurance', name: 'Tolerance & Endurance', col: '#ff6a6a', icon: 'heart', ang: -90, perks: ['tolerance', 'medicine', 'endurance'] },
  { id: 'agility', name: 'Agility & Movement', col: '#6ad0ff', icon: 'boot', ang: -150, perks: ['movement', 'agility', 'cardio'] },
  { id: 'perception', name: 'Eyesight & Perception', col: '#f0d060', icon: 'eye', ang: -30, perks: ['eyesight', 'scavenger'] },
  { id: 'psyche', name: 'Psychology', col: '#b88aff', icon: 'mind', ang: 150, perks: ['psychology'] },
  { id: 'strength', name: 'Strength & Conditioning', col: '#ff9a50', icon: 'fist', ang: 30, perks: ['strength'] },
];
const R = 62, CD = R * 1.78, NR = 13;
class SkillTree {
  constructor(host, meta, opts) {
    this.host = host; this.meta = meta; this.ro = !!(opts && opts.readOnly); this.onChange = opts && opts.onChange;
    host.innerHTML = '<canvas class="st-cv"></canvas><div class="st-hint">Drag to look around • Scroll to zoom • Click a glowing node to unlock</div><div class="st-info"></div>';
    this.cv = host.querySelector('canvas'); this.info = host.querySelector('.st-info'); this.x = this.cv.getContext('2d');
    this.zoom = 0.75; this.px = 0; this.py = 10; this.hover = null; this.sel = null; this.build();
    const cv = this.cv; let drag = null;
    cv.addEventListener('mousedown', e => { drag = { x: e.clientX, y: e.clientY, px: this.px, py: this.py, moved: false }; });
    this._mm = e => { const r = cv.getBoundingClientRect(); this.mx = e.clientX - r.left; this.my = e.clientY - r.top; if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true; this.px = drag.px + dx; this.py = drag.py + dy; } this.hover = this.pickNode(); cv.style.cursor = drag && drag.moved ? 'grabbing' : this.hover ? 'pointer' : 'grab'; };
    this._mu = e => { if (drag && !drag.moved && this.hover) this.click(this.hover); drag = null; };
    window.addEventListener('mousemove', this._mm); window.addEventListener('mouseup', this._mu);
    cv.addEventListener('wheel', e => { e.preventDefault(); const z0 = this.zoom; this.zoom = NE.clamp(this.zoom * (e.deltaY < 0 ? 1.12 : 0.89), 0.4, 2.2); const r = cv.getBoundingClientRect(); const cx = e.clientX - r.left - r.width / 2 - this.px, cy = e.clientY - r.top - r.height / 2 - this.py; this.px -= cx * (this.zoom / z0 - 1); this.py -= cy * (this.zoom / z0 - 1); }, { passive: false });
    this.raf = requestAnimationFrame(() => this.loop());
    this.renderInfo();
  }
  destroy() { cancelAnimationFrame(this.raf); window.removeEventListener('mousemove', this._mm); window.removeEventListener('mouseup', this._mu); }
  build() {
    this.nodes = [{ kind: 'you', x: 0, y: 0, r: R }];
    for (const c of NE.SKILL_CATS) {
      const a = c.ang * Math.PI / 180; const cx = Math.cos(a) * CD, cy = Math.sin(a) * CD; this.nodes.push({ kind: 'cat', cat: c, x: cx, y: cy, r: R * 0.92 });
      const n = c.perks.length; const ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
      c.perks.forEach((pid, i) => {
        const P = NE.PERKS.find(p => p.id === pid); const lat = (i - (n - 1) / 2) * 56; const sx = cx + ux * (R + 24) + vx * lat, sy = cy + uy * (R + 24) + vy * lat;
        for (let k = 0; k < P.max; k++) { const d = k * 31; this.nodes.push({ kind: 'perk', perk: P, rank: k, x: sx + ux * d, y: sy + uy * d, r: k === 0 ? NR + 2 : NR, cat: c, last: k === P.max - 1, ux, uy, li: i }); }
      });
    }
  }
  rank(id) { return this.meta.perks[id] || 0; }
  reqMet(P) { if (!P.req) return true; for (const k in P.req) if (this.rank(k) < P.req[k]) return false; return true; }
  pickNode() { const r = this.cv.getBoundingClientRect(); const wx = (this.mx - r.width / 2 - this.px) / this.zoom, wy = (this.my - r.height / 2 - this.py) / this.zoom; let best = null; for (const n of this.nodes) { if (Math.hypot(n.x - wx, n.y - wy) < n.r * 0.92) best = n; } return best; }
  click(n) {
    this.sel = n; const M = this.meta;
    let P = n.kind === 'perk' ? n.perk : n.kind === 'you' ? NE.PERKS.find(p => p.id === 'coldblood') : null;
    if (P && !this.ro) {
      const r = this.rank(P.id); const target = n.kind === 'perk' ? n.rank : 0;
      if (target === r && r < P.max) {
        if (!this.reqMet(P)) { NE.Audio.play('deny'); NE.UI.toast('Locked: needs Psychology 4 + Endurance 3.'); }
        else if (M.points < 1) { NE.Audio.play('deny'); NE.UI.toast('No skill points. Earn Survival Data in runs.'); }
        else { M.points--; M.perks[P.id] = r + 1; NE.Audio.play('buy'); NE.UI.toast(P.name + ' ' + (r + 1) + '/' + P.max); if (this.onChange) this.onChange(); }
      }
    }
    this.renderInfo();
  }
  renderInfo() {
    const n = this.sel || this.hover; const M = this.meta; let h = '<b>YOU</b> — ' + M.points + ' skill point' + (M.points === 1 ? '' : 's') + ' available. Level ' + M.level + ' (' + M.xp + '/' + NE.xpForLevel(M.level) + ' XP to next).';
    if (n && n.kind === 'perk') { const P = n.perk, r = this.rank(P.id); h = '<b style="color:' + n.cat.col + '">' + P.name + '</b> ' + r + '/' + P.max + ' — ' + P.desc; }
    else if (n && n.kind === 'cat') { const s = this.catStats(n.cat); h = '<b style="color:' + n.cat.col + '">' + n.cat.name + '</b> — ' + s.u + '/' + s.t + ' unlocked, ' + s.u + ' pts spent.'; }
    else if (n && n.kind === 'you') { const P = NE.PERKS.find(p => p.id === 'coldblood'); h = '<b style="color:#ff4060">ULTIMATE: Cold Blood</b> ' + this.rank('coldblood') + '/1 — ' + P.desc; }
    this.info.innerHTML = h;
  }
  catStats(c) { let u = 0, t = 0; for (const id of c.perks) { const P = NE.PERKS.find(p => p.id === id); u += this.rank(id); t += P.max; } return { u, t }; }
  hexPath(x, y, r) { const c = this.x; c.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i - Math.PI / 2; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (i) c.lineTo(px, py); else c.moveTo(px, py); } c.closePath(); }
  loop() {
    this.raf = requestAnimationFrame(() => this.loop()); const cv = this.cv, c = this.x; const dpr = window.devicePixelRatio || 1; const W = cv.clientWidth, H = cv.clientHeight; if (!W) return;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    // grid of faint hex dots
    c.fillStyle = 'rgba(255,255,255,0.025)'; for (let y = 0; y < H; y += 22) for (let x = (y / 22 % 2) * 11; x < W; x += 22) c.fillRect(x, y, 1, 1);
    c.translate(W / 2 + this.px, H / 2 + this.py); c.scale(this.zoom, this.zoom); const t = performance.now() / 1000;
    // links
    for (const n of this.nodes) if (n.kind === 'perk') { const prev = n.rank === 0 ? this.nodes.find(m => m.kind === 'cat' && m.cat === n.cat) : this.nodes.find(m => m.kind === 'perk' && m.perk === n.perk && m.rank === n.rank - 1); const on = this.rank(n.perk.id) > n.rank; c.strokeStyle = on ? n.cat.col : 'rgba(255,255,255,0.12)'; c.lineWidth = on ? 2.5 : 1.5; c.beginPath(); c.moveTo(prev.x, prev.y); c.lineTo(n.x, n.y); c.stroke(); }
    for (const n of this.nodes) if (n.kind === 'cat') { c.strokeStyle = 'rgba(255,255,255,0.08)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(n.x, n.y); c.stroke(); }
    // perk nodes
    for (const n of this.nodes) {
      if (n.kind !== 'perk') continue; const P = n.perk, r = this.rank(P.id); const own = r > n.rank, next = r === n.rank && this.reqMet(P); const hov = this.hover === n;
      c.save(); this.hexPath(n.x, n.y, n.r * (hov ? 1.12 : 1)); c.fillStyle = own ? this.alpha(n.cat.col, 0.85) : '#141218'; c.fill();
      if (own || next) { c.shadowColor = n.cat.col; c.shadowBlur = own ? 10 : 6 + 6 * Math.sin(t * 4); }
      c.strokeStyle = own ? n.cat.col : next ? this.alpha(n.cat.col, 0.6 + 0.4 * Math.sin(t * 4)) : 'rgba(255,255,255,0.18)'; c.lineWidth = own ? 2.5 : 2; c.stroke(); c.restore();
      c.imageSmoothingEnabled = false; const ic = NE.icon(P.icon, null, 2); const s = n.r * 1.05; c.globalAlpha = own || next ? 1 : 0.35; c.drawImage(ic, n.x - s / 2, n.y - s / 2, s, s); c.globalAlpha = 1;
      if (n.last) { c.font = 'bold 11px "Pixelify Sans", monospace'; c.textAlign = 'center'; const off = 30 + (n.li % 2) * 26; const lx = n.x + n.ux * off, ly = n.y + n.uy * off; c.fillStyle = '#e8e2d0'; c.fillText(P.name, lx, ly); c.fillStyle = n.cat.col; c.font = '10px "Pixelify Sans", monospace'; c.fillText(r + ' / ' + P.max, lx, ly + 11); }
    }
    // category hexes
    for (const n of this.nodes) {
      if (n.kind !== 'cat') continue; const cat = n.cat; const s = this.catStats(cat); const hov = this.hover === n;
      c.save(); c.shadowColor = cat.col; c.shadowBlur = 18 + (hov ? 8 : 0); this.hexPath(n.x, n.y, n.r); c.fillStyle = '#16131a'; c.fill(); c.strokeStyle = cat.col; c.lineWidth = 4; c.stroke(); c.restore();
      this.hexPath(n.x, n.y, n.r - 7); c.strokeStyle = this.alpha(cat.col, 0.25); c.lineWidth = 1.5; c.stroke();
      c.imageSmoothingEnabled = false; c.drawImage(NE.icon(cat.icon, null, 3), n.x - 12, n.y - 36, 24, 24);
      c.textAlign = 'center'; c.fillStyle = '#fff'; c.font = 'bold 12px "Pixelify Sans", monospace'; const words = cat.name.split(' & ');
      if (words.length > 1) { c.fillText(words[0] + ' &', n.x, n.y - 1); c.fillText(words[1], n.x, n.y + 12); } else c.fillText(cat.name, n.x, n.y + 6);
      c.fillStyle = '#f0c040'; c.font = 'bold 10px "Pixelify Sans", monospace'; c.fillText(s.u + '/' + s.t + ' unlocked', n.x, n.y + 26); c.fillStyle = '#a09a90'; c.font = '9px "Pixelify Sans", monospace'; c.fillText(s.u + ' pts spent', n.x, n.y + 37);
    }
    // center YOU hub (Ultimate capstone)
    const cb = NE.PERKS.find(p => p.id === 'coldblood'); const have = this.rank('coldblood'); const ready = !have && this.reqMet(cb);
    c.save(); c.shadowColor = '#ffc840'; c.shadowBlur = 20 + (ready ? 10 * Math.sin(t * 3) : 0); this.hexPath(0, 0, R); c.fillStyle = '#18140e'; c.fill(); c.strokeStyle = have ? '#ff4060' : '#ffc840'; c.lineWidth = 4; c.stroke(); c.restore();
    this.hexPath(0, 0, R - 7); c.strokeStyle = 'rgba(255,200,64,0.25)'; c.lineWidth = 1.5; c.stroke();
    c.drawImage(NE.icon('you', null, 3), -10, -40, 20, 20);
    c.textAlign = 'center'; c.fillStyle = '#fff'; c.font = 'bold 16px "Pixelify Sans", monospace'; c.fillText('YOU [' + this.meta.points + ']', 0, -4);
    c.fillStyle = '#f0c040'; c.font = 'bold 9px "Pixelify Sans", monospace'; c.fillText('Ultimate ' + have + '/1', 0, 14);
    c.fillStyle = have ? '#ff4060' : ready ? '#ffe080' : '#7a746a'; c.font = '9px "Pixelify Sans", monospace'; c.fillText(have ? 'COLD BLOOD' : ready ? 'Click: Cold Blood' : 'Cold Blood (locked)', 0, 27);
    c.fillStyle = '#a09a90'; c.fillText('Lv ' + this.meta.level, 0, 39);
    if (this.hover !== this._lh) { this._lh = this.hover; if (!this.sel || this.hover) this.renderInfo(); }
  }
  alpha(h, a) { const n = parseInt(h.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
}
NE.SkillTree = SkillTree;
})(window.NE);
