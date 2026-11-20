// Nectar's End — pan & zoom hex skill web. Center "YOU" hub, five glowing category hexes, rank chains branching out.
(function (NE) {
'use strict';
NE.SKILL_CATS = [
  { id: 'endurance', name: 'Tolerance & Endurance', col: '#ef6a4c', icon: 'heart', ang: -90, perks: ['tolerance', 'medicine', 'endurance', 'clotting', 'vitality'] },
  { id: 'perception', name: 'Eyesight & Perception', col: '#ffd24a', icon: 'eye', ang: -45, perks: ['eyesight', 'lantern', 'scavenger', 'nimble'] },
  { id: 'strength', name: 'Strength & Conditioning', col: '#ff9a3c', icon: 'fist', ang: 0, perks: ['strength', 'brawler', 'packmule', 'hauler', 'organizer'] },
  { id: 'combat', name: 'Fighting & Firearms', col: '#e0504a', icon: 'pistol', ang: 45, perks: ['kickboxer', 'riposte', 'executioner', 'marksman', 'pistolwhip'] },
  { id: 'vespa', name: 'The Hive Within', col: '#ffc21a', icon: 'ui_vespa', ang: 90, perks: ['vlinger', 'vlash', 'vgullet', 'vsilk', 'vskitter', 'vharvest', 'vapex'] },
  { id: 'psyche', name: 'Psychology', col: '#d49af0', icon: 'mind', ang: 135, perks: ['psychology', 'composure', 'barter', 'psychonaut'] },
  { id: 'delving', name: 'Delving & Survival', col: '#6ad0a0', icon: 'pick', ang: 180, perks: ['rockbreaker', 'forager', 'fieldsurgeon', 'abysswalker', 'tinkerer'] },
  { id: 'agility', name: 'Agility & Movement', col: '#a6d46a', icon: 'boot', ang: -135, perks: ['movement', 'agility', 'cardio', 'parkour', 'sprinter', 'freeclimb', 'tumbler'] },
];
const R = 62, CD = R * 3.2, NR = 13;
class SkillTree {
  constructor(host, meta, opts) {
    this.host = host; this.meta = meta; this.ro = !!(opts && opts.readOnly); this.onChange = opts && opts.onChange;
    host.innerHTML = '<canvas class="st-cv"></canvas><div class="st-hint">Drag to look around • Scroll to zoom • Click a branch to open it, then a cell to pick an upgrade</div><div class="st-info"></div>';
    this.cv = host.querySelector('canvas'); this.info = host.querySelector('.st-info'); this.x = this.cv.getContext('2d');
    this.zoom = 1.35; this.px = 0; this.py = 30; this.hover = null; this.sel = null; this.build();
    const cv = this.cv; let drag = null;
    cv.addEventListener('mousedown', e => { drag = { x: e.clientX, y: e.clientY, px: this.px, py: this.py, moved: false }; });
    this._mm = e => { const r = cv.getBoundingClientRect(); this.mx = e.clientX - r.left; this.my = e.clientY - r.top; if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true; this.px = drag.px + dx; this.py = drag.py + dy; } this.hover = this.pickNode(); cv.style.cursor = drag && drag.moved ? 'grabbing' : this.hover ? 'pointer' : 'grab'; };
    this._mu = e => { if (drag && !drag.moved && e.target === cv) { if (this.hover) this.click(this.hover); else if (this.focus) this.setFocus(null); } if (drag && drag.moved) this.camT = null; drag = null; };
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
        const P = NE.PERKS.find(p => p.id === pid); const lat = (i - (n - 1) / 2) * 64; const sx = cx + ux * (R + 24) + vx * lat, sy = cy + uy * (R + 24) + vy * lat;
        for (let k = 0; k < P.max; k++) { const d = k * 31; this.nodes.push({ kind: 'perk', perk: P, rank: k, x: sx + ux * d, y: sy + uy * d, r: k === 0 ? NR + 2 : NR, cat: c, last: k === P.max - 1, ux, uy, li: i }); }
      });
    }
  }
  rank(id) { return this.meta.perks[id] || 0; }
  reqMet(P) { if (!P.req) return true; for (const k in P.req) if (this.rank(k) < P.req[k]) return false; return true; }
  pickNode() { const r = this.cv.getBoundingClientRect(); const wx = (this.mx - r.width / 2 - this.px) / this.zoom, wy = (this.my - r.height / 2 - this.py) / this.zoom; let best = null; for (const n of this.nodes) { if (n.kind === 'perk' && n.cat !== this.focus) continue; if (Math.hypot(n.x - wx, n.y - wy) < n.r * 0.92) best = n; } return best; }
  setFocus(cat) { this.focus = cat; this.sel = null; const W = this.cv.clientWidth || 800, H = this.cv.clientHeight || 500;
    if (!cat) { this.camT = { px: 0, py: 30, z: 1.35 }; this.renderInfo(); NE.Audio.play('uiback'); return; }
    const ns = this.nodes.filter(n => n.cat === cat); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const n of ns) { x0 = Math.min(x0, n.x - 60); y0 = Math.min(y0, n.y - 70); x1 = Math.max(x1, n.x + 60); y1 = Math.max(y1, n.y + 70); }
    const z = NE.clamp(Math.min(W / (x1 - x0), (H - 70) / (y1 - y0)), 0.6, 1.5); this.camT = { px: -(x0 + x1) / 2 * z, py: -(y0 + y1) / 2 * z - 20, z }; this.renderInfo(); NE.Audio.play('ui'); }
  click(n) {
    if (n.kind === 'cat') { this.setFocus(this.focus === n.cat ? null : n.cat); return; }
    this.sel = n; NE.Audio.play('click'); this.renderInfo();
  }
  canBuy(P, n) { const r = this.rank(P.id); const target = n.kind === 'perk' ? n.rank : 0; if (this.ro) return 'View only during a run — spend points at Base Camp.'; if (r > target) return 'owned'; if (r < target) return 'Unlock the earlier ranks first.'; if (r >= P.max) return 'owned'; if (!this.reqMet(P)) return 'Locked: needs Psychology 4 + Endurance 3.'; if (this.meta.points < 1) return 'No skill points. Descend deeper to earn Hive memory (XP).'; return true; }
  buy() {
    const n = this.sel; if (!n) return; const P = n.kind === 'perk' ? n.perk : NE.PERKS.find(p => p.id === 'coldblood'); if (this.canBuy(P, n) !== true) return NE.Audio.play('deny');
    const M = this.meta; M.points--; M.perks[P.id] = this.rank(P.id) + 1; NE.Audio.play('buy'); NE.UI.toast(P.name + ' ' + M.perks[P.id] + '/' + P.max); if (this.onChange) this.onChange();
    this.burst = { x: n.x, y: n.y, t: 0 };
    if (n.kind === 'perk') { const nx = this.nodes.find(m => m.kind === 'perk' && m.perk === P && m.rank === n.rank + 1); this.sel = nx || n; }
    this.renderInfo();
  }
  renderInfo() {
    const n = this.sel || this.hover; const M = this.meta; let h = '<b>THE VESPA</b> — ' + M.points + ' skill point' + (M.points === 1 ? '' : 's') + ' available. Level ' + M.level + ' (' + M.xp + '/' + NE.xpForLevel(M.level) + ' XP to next).' + (this.focus ? '' : '<br><span class="dim">Click a branch to open it.</span>');
    let P = null;
    if (n && n.kind === 'perk') { P = n.perk; const r = this.rank(P.id); h = '<b style="color:' + n.cat.col + '">' + P.name + '</b> — rank ' + (n.rank + 1) + ' of ' + P.max + ' <span class="dim">(you have ' + r + ')</span><br>' + P.desc; }
    else if (n && n.kind === 'cat') { const s = this.catStats(n.cat); h = '<b style="color:' + n.cat.col + '">' + n.cat.name + '</b> — ' + s.u + '/' + s.t + ' ranks filled. ' + (this.focus === n.cat ? 'Click again to close.' : 'Click to open this branch.'); }
    else if (n && n.kind === 'you') { P = NE.PERKS.find(p => p.id === 'coldblood'); h = '<b style="color:#ff6a50">ULTIMATE: Cold Blood</b> ' + this.rank('coldblood') + '/1 — ' + P.desc; }
    if (this.sel && P && (this.sel.kind === 'perk' || this.sel.kind === 'you')) { const ok = this.canBuy(P, this.sel);
      h += '<div class="st-acts">' + (ok === true ? '<button class="btn st-buy">Confirm upgrade — 1 point</button><button class="btn st-cancel">Cancel</button>' : ok === 'owned' ? '<span class="good">✓ Owned</span>' : '<span class="warn">' + ok + '</span>') + '</div>'; }
    this.info.innerHTML = h;
    const bb = this.info.querySelector('.st-buy'); if (bb) bb.onclick = () => this.buy(); const cb = this.info.querySelector('.st-cancel'); if (cb) cb.onclick = () => { this.sel = null; this.renderInfo(); };
  }
  catStats(c) { let u = 0, t = 0; for (const id of c.perks) { const P = NE.PERKS.find(p => p.id === id); u += this.rank(id); t += P.max; } return { u, t }; }
  hexPath(x, y, r) { const c = this.x; c.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i - Math.PI / 2; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (i) c.lineTo(px, py); else c.moveTo(px, py); } c.closePath(); }
  loop() {
    this.raf = requestAnimationFrame(() => this.loop()); const cv = this.cv, c = this.x; const dpr = window.devicePixelRatio || 1; const W = cv.clientWidth, H = cv.clientHeight; if (!W) return;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H); const t = performance.now() / 1000;
    if (this.camT) { const k = 0.12; this.px = NE.lerp(this.px, this.camT.px, k); this.py = NE.lerp(this.py, this.camT.py, k); this.zoom = NE.lerp(this.zoom, this.camT.z, k); if (Math.abs(this.px - this.camT.px) + Math.abs(this.py - this.camT.py) < 0.5) this.camT = null; }
    // cave backdrop: warm glow from the hive centre + faint honeycomb lattice
    const bg = c.createRadialGradient(W / 2 + this.px, H / 2 + this.py, 20, W / 2 + this.px, H / 2 + this.py, Math.max(W, H) * 0.7); bg.addColorStop(0, '#3a240e'); bg.addColorStop(0.45, '#1c1209'); bg.addColorStop(1, '#0c0805'); c.fillStyle = bg; c.fillRect(0, 0, W, H);
    const hs = 26 * this.zoom, hw = hs * Math.sqrt(3); c.strokeStyle = 'rgba(255,190,80,0.045)'; c.lineWidth = 1; const ox = (W / 2 + this.px) % hw, oy = (H / 2 + this.py) % (hs * 3);
    for (let y = -hs * 3 + oy; y < H + hs * 3; y += hs * 1.5) { const row = Math.round((y - oy) / (hs * 1.5)); for (let x = -hw + ox + (row & 1) * hw / 2; x < W + hw; x += hw) { c.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i - Math.PI / 2; const px = x + Math.cos(a) * hs, py = y + Math.sin(a) * hs; if (i) c.lineTo(px, py); else c.moveTo(px, py); } c.closePath(); c.stroke(); } }
    this.motes = this.motes || Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random(), s: 0.3 + Math.random() * 0.7, ph: Math.random() * 6 }));
    for (const m of this.motes) { m.y -= 0.0004 * m.s; if (m.y < 0) m.y = 1; c.globalAlpha = 0.25 + 0.35 * Math.sin(t * 2 + m.ph) ** 2; c.fillStyle = '#ffc850'; c.fillRect(m.x * W + Math.sin(t * 0.6 + m.ph) * 6, m.y * H, 2, 2); } c.globalAlpha = 1;
    c.translate(W / 2 + this.px, H / 2 + this.py); c.scale(this.zoom, this.zoom);
    const honey = (x, y, r) => { const g = c.createLinearGradient(x, y - r, x, y + r); g.addColorStop(0, '#ffe08a'); g.addColorStop(0.45, '#f5a92a'); g.addColorStop(1, '#a8600e'); return g; };
    const drip = (x, y, len, w) => { c.fillStyle = '#e8961e'; c.fillRect(x - w / 2, y, w, len); c.beginPath(); c.arc(x, y + len, w * 0.8, 0, 7); c.fill(); c.fillStyle = '#ffd77a'; c.fillRect(x - w / 2, y, 1, len * 0.7); };
    // honey trails between cells
    for (const n of this.nodes) if (n.kind === 'perk' && n.cat === this.focus) { const prev = n.rank === 0 ? this.nodes.find(m => m.kind === 'cat' && m.cat === n.cat) : this.nodes.find(m => m.kind === 'perk' && m.perk === n.perk && m.rank === n.rank - 1); const on = this.rank(n.perk.id) > n.rank;
      c.strokeStyle = on ? '#f0a428' : 'rgba(120,80,40,0.35)'; c.lineWidth = on ? 4 : 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(prev.x, prev.y); c.lineTo(n.x, n.y); c.stroke(); if (on) { c.strokeStyle = 'rgba(255,230,150,0.6)'; c.lineWidth = 1; c.stroke(); } }
    for (const n of this.nodes) if (n.kind === 'cat') { c.strokeStyle = this.focus && this.focus !== n.cat ? 'rgba(240,170,60,0.08)' : 'rgba(240,170,60,0.22)'; c.lineWidth = 6; c.beginPath(); c.moveTo(0, 0); c.lineTo(n.x, n.y); c.stroke(); }
    // perk cells (wax honeycomb)
    for (const n of this.nodes) {
      if (n.kind !== 'perk' || n.cat !== this.focus) continue; const P = n.perk, r = this.rank(P.id); const own = r > n.rank, next = r === n.rank && this.reqMet(P); const hov = this.hover === n; const rr = n.r * (hov ? 1.14 : 1);
      c.save(); this.hexPath(n.x, n.y, rr + 2.5); c.fillStyle = own ? '#5a3608' : '#2a1a0c'; c.fill(); this.hexPath(n.x, n.y, rr);
      if (own) { c.shadowColor = '#ffb030'; c.shadowBlur = 12; c.fillStyle = honey(n.x, n.y, rr); } else c.fillStyle = '#160e07';
      c.fill(); c.shadowBlur = 0;
      c.strokeStyle = own ? n.cat.col : next ? this.alpha('#ffc850', 0.5 + 0.5 * Math.sin(t * 4)) : 'rgba(150,100,50,0.45)'; c.lineWidth = own ? 2 : next ? 2.2 : 1.2; c.stroke(); c.restore();
      if (own) { this.hexPath(n.x, n.y, rr - 3); c.strokeStyle = 'rgba(255,240,190,0.45)'; c.lineWidth = 1; c.stroke(); if (n.rank % 2 === 0) drip(n.x + rr * 0.3, n.y + rr * 0.8, 3 + (n.rank % 3) * 2 + Math.sin(t + n.x) * 1, 2.4); }
      c.imageSmoothingEnabled = false; const ic = NE.icon(P.icon, null, 2); const sz = rr * 1.05; c.globalAlpha = own ? 1 : next ? 0.9 : 0.28; c.drawImage(ic, n.x - sz / 2, n.y - sz / 2, sz, sz); c.globalAlpha = 1;
      if (n.last) { const off = 28 + n.li * 22; const lx = n.x + n.ux * off, ly = n.y + n.uy * off; c.font = 'bold 11px "Pixelify Sans", monospace'; c.textAlign = 'center'; const w = Math.max(c.measureText(P.name).width, 30) + 12;
        c.fillStyle = 'rgba(14,9,5,0.85)'; c.strokeStyle = this.alpha(n.cat.col, 0.6); c.lineWidth = 1; c.beginPath(); c.roundRect ? c.roundRect(lx - w / 2, ly - 11, w, 25, 5) : c.rect(lx - w / 2, ly - 11, w, 25); c.fill(); c.stroke();
        c.fillStyle = '#f6e6c0'; c.fillText(P.name, lx, ly + 1); c.fillStyle = n.cat.col; c.font = '10px "Pixelify Sans", monospace'; c.fillText(r + ' / ' + P.max, lx, ly + 11); }
    }
    // category hexes: thick wax frames
    for (const n of this.nodes) {
      if (n.kind !== 'cat') continue; const cat = n.cat; const st = this.catStats(cat); const hov = this.hover === n; const fill = st.u / st.t; c.globalAlpha = this.focus && this.focus !== cat ? 0.32 : 1;
      c.save(); c.shadowColor = cat.col; c.shadowBlur = 14 + (hov ? 10 : 0); this.hexPath(n.x, n.y, n.r + 6); const rim = c.createLinearGradient(n.x, n.y - n.r, n.x, n.y + n.r); rim.addColorStop(0, '#e8a83a'); rim.addColorStop(1, '#7a4a12'); c.fillStyle = rim; c.fill(); c.restore();
      this.hexPath(n.x, n.y, n.r); c.fillStyle = '#1a1009'; c.fill();
      // honey level inside the cell shows how much of the branch you own
      if (fill > 0) { c.save(); this.hexPath(n.x, n.y, n.r); c.clip(); const top = n.y + n.r - fill * n.r * 2; const hg = c.createLinearGradient(0, top, 0, n.y + n.r); hg.addColorStop(0, 'rgba(255,190,70,0.55)'); hg.addColorStop(1, 'rgba(160,90,20,0.55)'); c.fillStyle = hg; c.beginPath(); c.moveTo(n.x - n.r, n.y + n.r); for (let x = -n.r; x <= n.r; x += 4) c.lineTo(n.x + x, top + Math.sin(t * 2 + x * 0.15) * 2); c.lineTo(n.x + n.r, n.y + n.r); c.fill(); c.restore(); }
      this.hexPath(n.x, n.y, n.r - 5); c.strokeStyle = this.alpha(cat.col, 0.7); c.lineWidth = 2; c.stroke();
      c.imageSmoothingEnabled = false; c.drawImage(NE.icon(cat.icon, null, 3), n.x - 13, n.y - 38, 26, 26);
      c.textAlign = 'center'; c.fillStyle = '#fff4dc'; c.font = 'bold 12px "Pixelify Sans", monospace'; const words = cat.name.split(' & ');
      if (words.length > 1) { c.fillText(words[0] + ' &', n.x, n.y - 1); c.fillText(words[1], n.x, n.y + 12); } else c.fillText(cat.name, n.x, n.y + 6);
      c.fillStyle = cat.col; c.font = 'bold 10px "Pixelify Sans", monospace'; c.fillText(st.u + ' / ' + st.t, n.x, n.y + 27); c.fillStyle = '#b8a07a'; c.font = '9px "Pixelify Sans", monospace'; c.fillText(this.focus === cat ? '▲ click to close' : cat.perks.length + ' skills • click', n.x, n.y + 38); c.globalAlpha = 1;
      if (this.focus === cat) { this.hexPath(n.x, n.y, n.r + 11); c.strokeStyle = this.alpha(cat.col, 0.5 + 0.3 * Math.sin(t * 3)); c.lineWidth = 2; c.stroke(); }
    }
    // the Vespa hub: striped gold/black rim with the ultimate inside
    const cb = NE.PERKS.find(p => p.id === 'coldblood'); const have = this.rank('coldblood'); const ready = !have && this.reqMet(cb);
    c.save(); c.shadowColor = '#ffc030'; c.shadowBlur = 24 + (ready ? 12 * Math.sin(t * 3) : 0); this.hexPath(0, 0, R + 8); c.fillStyle = '#ffc52a'; c.fill(); c.restore();
    c.save(); this.hexPath(0, 0, R + 8); c.clip(); c.fillStyle = '#20140a'; for (let k = -6; k <= 6; k++) { c.save(); c.translate(k * 18, 0); c.rotate(-0.5); c.fillRect(-4, -R * 2, 8, R * 4); c.restore(); } c.restore();
    this.hexPath(0, 0, R); const hub = c.createRadialGradient(0, -10, 4, 0, 0, R); hub.addColorStop(0, '#3a2408'); hub.addColorStop(1, '#140c05'); c.fillStyle = hub; c.fill(); c.strokeStyle = have ? '#ff5040' : '#ffc850'; c.lineWidth = 2; c.stroke();
    const eg = c.createRadialGradient(0, -30, 0, 0, -30, 14); eg.addColorStop(0, 'rgba(255,220,80,0.9)'); eg.addColorStop(1, 'rgba(255,200,60,0)'); c.fillStyle = eg; c.fillRect(-14, -44, 28, 28); c.fillStyle = '#fff4b0'; c.fillRect(-6, -32, 4, 3); c.fillRect(3, -32, 4, 3);
    c.textAlign = 'center'; c.fillStyle = '#fff4dc'; c.font = 'bold 14px "Pixelify Sans", monospace'; c.fillText('THE VESPA', 0, -8);
    c.fillStyle = '#ffc850'; c.font = 'bold 12px "Pixelify Sans", monospace'; c.fillText(this.meta.points + ' point' + (this.meta.points === 1 ? '' : 's'), 0, 8);
    c.fillStyle = have ? '#ff6a50' : ready ? '#ffe080' : '#8a7a62'; c.font = '9px "Pixelify Sans", monospace'; c.fillText(have ? 'COLD BLOOD awakened' : ready ? 'Click: Cold Blood' : 'Ultimate: Cold Blood (locked)', 0, 24);
    c.fillStyle = '#b8a07a'; c.fillText('Hive level ' + this.meta.level, 0, 37);
    if (this.sel && (this.sel.kind !== 'perk' || this.sel.cat === this.focus)) { const n = this.sel; this.hexPath(n.x, n.y, n.r + 6); c.setLineDash([4, 3]); c.lineDashOffset = -t * 20; c.strokeStyle = '#fff4c0'; c.lineWidth = 2; c.stroke(); c.setLineDash([]); }
    if (this.burst) { const b = this.burst; b.t += 1 / 60; if (b.t > 0.6) this.burst = null; else { c.globalAlpha = 1 - b.t / 0.6; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; const d = 10 + b.t * 70; c.fillStyle = '#ffd060'; c.fillRect(b.x + Math.cos(a) * d - 2, b.y + Math.sin(a) * d - 2, 4, 4); } c.globalAlpha = 1; } }
    if (this.hover !== this._lh) { this._lh = this.hover; if (!this.sel) this.renderInfo(); }
  }
  alpha(h, a) { const n = parseInt(h.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
}
NE.SkillTree = SkillTree;
})(window.NE);
