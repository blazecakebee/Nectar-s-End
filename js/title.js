// Nectar's End — living title scene + the Vespa prologue cutscene
(function (NE) {
'use strict';
const { rf, pick, chance, clamp, lerp } = NE; const G = NE.G;

// ---------------- title scene ----------------
G.titleFx = { flies: [], drips: [], trail: [] };
function sil(ctx, col, base, amp, seedA, w, top) { ctx.fillStyle = col; for (let x = 0; x < w; x++) { const h = amp * (0.5 + 0.5 * Math.sin(x * 0.05 + seedA) * Math.sin(x * 0.013 + seedA * 2)) + NE.hash(x >> 2, seedA) * amp * 0.25; if (top) ctx.fillRect(x, 0, 1, Math.round(base + h)); else ctx.fillRect(x, Math.round(base - h), 1, 200); } }
G.drawTitle = function (dt) {
  const ctx = G.ctx, VW = NE.VW, VH = NE.VH, t = G.t, F = G.titleFx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
  const gr = ctx.createLinearGradient(0, 0, 0, VH); gr.addColorStop(0, '#120c1e'); gr.addColorStop(0.45, '#1d1328'); gr.addColorStop(1, '#2c1810'); ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH);
  // the deep glows gold — from the pit on the right
  const px = Math.round(VW * 0.72); const glow = ctx.createRadialGradient(px, VH + 10, 10, px, VH, 170); glow.addColorStop(0, 'rgba(255,170,50,0.55)'); glow.addColorStop(0.5, 'rgba(200,90,40,0.18)'); glow.addColorStop(1, 'rgba(120,40,60,0)'); ctx.fillStyle = glow; ctx.fillRect(0, 0, VW, VH);
  // far cave layers (coloured rims), stalactites
  sil(ctx, '#1f1733', 26, 30, 1.3, VW, true); sil(ctx, '#150f22', 14, 46, 2.1, VW, true);
  for (let i = 0; i < 18; i++) { const x = NE.hash(i, 31) * VW, y = 18 + NE.hash(i, 32) * 40; const c = ['#7affd8', '#b090ff', '#ff90c8'][i % 3]; ctx.globalAlpha = 0.35 + 0.3 * Math.sin(t * (0.6 + NE.hash(i, 33)) + i); ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), 1, 2); ctx.globalAlpha = 1; }
  sil(ctx, '#1a1222', VH - 18, 34, 4.2, VW, false); sil(ctx, '#0e0a12', VH - 6, 22, 5.7, VW, false);
  // the pit + winch lift on the right
  ctx.fillStyle = '#07050a'; for (let k = 0; k < VH - 120; k++) { const w = 64 + Math.sin(k * 0.21) * 4 + k * 0.3; ctx.fillRect(Math.round(px - w / 2), 120 + k, Math.round(w), 1); }
  for (let k = 0; k < VH - 120; k++) { const w = 64 + Math.sin(k * 0.21) * 4 + k * 0.3 - 6; ctx.fillStyle = 'rgba(255,160,60,' + (k / (VH - 120)) ** 1.6 * 0.32 + ')'; ctx.fillRect(Math.round(px - w / 2), 120 + k, Math.round(w), 1); }
  ctx.fillStyle = '#5a3a22'; ctx.fillRect(px - 40, 116, 80, 4); ctx.fillRect(px - 34, 116, 3, 14); ctx.fillRect(px + 31, 116, 3, 14); ctx.fillStyle = '#8a6040'; ctx.fillRect(px - 4, 112, 8, 6);
  const sw = Math.sin(t * 0.35) * 4; ctx.fillStyle = '#6a5038'; ctx.fillRect(px - 2, 118, 1, 60 + sw); ctx.fillRect(px + 2, 118, 1, 60 + sw);
  const cy = 176 + sw; ctx.fillStyle = '#211b16'; ctx.fillRect(px - 16, cy, 33, 24); ctx.fillStyle = '#4a3e30'; ctx.fillRect(px - 16, cy, 33, 2); for (let i = 0; i < 5; i++) ctx.fillRect(px - 14 + i * 7, cy + 2, 1, 22);
  const fl = Math.random() < 0.04 ? 0.3 : 1; ctx.fillStyle = 'rgba(255,190,90,' + fl + ')'; ctx.fillRect(px - 1, cy + 3, 3, 2);
  // bioluminescent mushrooms & vines
  for (let i = 0; i < 9; i++) { const x = Math.round(NE.hash(i, 7) * VW), base = VH - 10 - Math.round(NE.hash(i, 8) * 14); if (Math.abs(x - px) < 40) continue; const c = ['#5affc8', '#ff7ad0', '#ffd060'][i % 3]; const h = 3 + (i % 3);
    ctx.fillStyle = '#d8e8c8'; ctx.fillRect(x, base - h, 1, h); ctx.fillStyle = c; ctx.fillRect(x - 2, base - h - 2, 5, 2); ctx.fillRect(x - 1, base - h - 3, 3, 1);
    const g2 = ctx.createRadialGradient(x, base - h - 2, 0, x, base - h - 2, 16); g2.addColorStop(0, c + '55'); g2.addColorStop(1, c + '00'); ctx.fillStyle = g2; ctx.fillRect(x - 16, base - h - 18, 32, 32); }
  for (let i = 0; i < 7; i++) { const x = Math.round(NE.hash(i, 17) * VW); const L = 10 + Math.round(NE.hash(i, 18) * 26); for (let k = 0; k < L; k++) { ctx.fillStyle = '#2a4a2a'; ctx.fillRect(x + Math.round(Math.sin(k * 0.4 + t * 0.6 + i) * 1.5), 12 + k, 1, 1); } ctx.fillStyle = 'rgba(180,255,170,' + (0.5 + 0.4 * Math.sin(t * 2 + i)) + ')'; ctx.fillRect(x, 12 + L, 2, 2); }
  // fireflies
  if (F.flies.length < 26) F.flies.push({ x: rf(0, VW), y: rf(40, VH - 20), ph: rf(0, 6), c: pick(['#e8ff80', '#ffd060', '#90ffc0']) });
  for (const f of F.flies) { f.x += Math.sin(t * 0.7 + f.ph) * 6 * dt; f.y += Math.cos(t * 0.9 + f.ph) * 5 * dt; ctx.globalAlpha = 0.45 + 0.55 * Math.max(0, Math.sin(t * 2 + f.ph)); ctx.fillStyle = f.c; ctx.fillRect(Math.round(f.x), Math.round(f.y), 1, 1); }
  ctx.globalAlpha = 1;
  // logo + honey title (left third)
  if (!G.titleImg || (!G.titleImg.logo && NE.logoImg.complete && NE.logoImg.naturalWidth)) G.titleImg = NE.makeNectarTitle();
  const TI = G.titleImg; const lx = Math.round(Math.max(VW * 0.3, 140)); G.honeyDrops = G.honeyDrops || [];
  const lg = ctx.createRadialGradient(lx, 44, 4, lx, 44, 130); lg.addColorStop(0, 'rgba(255,180,50,0.22)'); lg.addColorStop(1, 'rgba(255,180,50,0)'); ctx.fillStyle = lg; ctx.fillRect(0, 0, VW, VH);
  const bob = Math.round(Math.sin(t * 1.2) * 1.5); const parts = [];
  if (TI.logo) parts.push({ h: TI.logo, x: Math.round(lx - TI.logo.img.width / 2), y: 4 + bob }); parts.push({ h: TI.title, x: Math.round(lx - TI.title.img.width / 2), y: TI.logo ? 54 : 26 });
  for (const P of parts) { ctx.drawImage(P.h.img, P.x, P.y); if (Math.random() < dt * 1.6 && P.h.tips.length) { const tp = pick(P.h.tips); G.honeyDrops.push({ x: P.x + tp.x, y: P.y + tp.y, vy: 0, l: 0 }); } }
  for (const d of G.honeyDrops) { d.l += dt; if (d.l > 0.6) { d.vy += 260 * dt; d.y += d.vy * dt; } ctx.fillStyle = '#e8902a'; ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, d.l > 0.6 ? 2 : 1); ctx.fillStyle = '#ffd070'; ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, 1); }
  G.honeyDrops = G.honeyDrops.filter(d => d.y < VH);
  // the Vespa: a striped wisp circling the logo, leaving a golden trail
  const wx = lx + Math.sin(t * 0.8) * 70 + Math.sin(t * 2.1) * 8, wy = 46 + Math.sin(t * 1.6) * 22; F.trail.push({ x: wx, y: wy, l: 1 }); if (F.trail.length > 40) F.trail.shift();
  for (const q of F.trail) { q.l -= dt * 1.4; ctx.globalAlpha = Math.max(0, q.l) * 0.7; ctx.fillStyle = '#ffd23a'; ctx.fillRect(Math.round(q.x), Math.round(q.y), 1, 1); } ctx.globalAlpha = 1;
  const wg = ctx.createRadialGradient(wx, wy, 0, wx, wy, 14); wg.addColorStop(0, 'rgba(255,210,60,0.55)'); wg.addColorStop(1, 'rgba(255,210,60,0)'); ctx.fillStyle = wg; ctx.fillRect(wx - 14, wy - 14, 28, 28);
  for (let i = -2; i <= 2; i++) { ctx.fillStyle = i % 2 ? '#3a2408' : '#ffd23a'; ctx.fillRect(Math.round(wx) + i, Math.round(wy) - 1, 1, 3); } ctx.fillStyle = '#fff6c0'; ctx.fillRect(Math.round(wx) + 2, Math.round(wy), 1, 1);
  ctx.fillStyle = 'rgba(220,240,255,0.5)'; const fl2 = Math.sin(t * 40) > 0 ? 1 : 0; ctx.fillRect(Math.round(wx) - 1, Math.round(wy) - 2 - fl2, 2, 1); ctx.fillRect(Math.round(wx) + 1, Math.round(wy) - 2 - (1 - fl2), 2, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let y = 0; y < VH; y += 2) ctx.fillRect(0, y, VW, 1);
};

// ---------------- prologue cutscene ----------------
const P = NE.Prologue = { i: 0, t: 0, typed: 0, done: null };
P.start = function (done) { const g = G; g.state = 'prologue'; P.i = 0; P.t = 0; P.typed = 0; P.done = done; P.stars = []; for (let i = 0; i < 140; i++) P.stars.push({ x: Math.random(), y: Math.random(), z: Math.random() }); P.host = NE.makeSurvivor(); NE.UI.showPrologue(true); NE.Audio.music('prologue'); P.port = null; };
P.next = function () { const sc = NE.LORE.scenes[P.i]; if (P.typed < sc.t.length) { P.typed = sc.t.length; return; } P.i++; P.t = 0; P.typed = 0; if (P.i >= NE.LORE.scenes.length) P.finish(); };
P.finish = function () { NE.UI.showPrologue(false); G.store.seenPrologue = true; NE.Save.write(G); const d = P.done; P.done = null; if (d) d(); else G.toTitle(); };
function human(ctx, x, y, look, lying) {
  const sk = NE.SKIN[look.skin], hc = NE.HAIRC[look.hairCol];
  if (lying) { ctx.fillStyle = look.pants; ctx.fillRect(x, y - 2, 6, 2); ctx.fillStyle = look.shirt; ctx.fillRect(x + 6, y - 3, 5, 3); ctx.fillStyle = sk; ctx.fillRect(x + 11, y - 3, 3, 3); ctx.fillStyle = hc; ctx.fillRect(x + 13, y - 3, 2, 3); return; }
  ctx.fillStyle = look.pants; ctx.fillRect(x - 2, y - 6, 2, 6); ctx.fillRect(x + 1, y - 6, 2, 6); ctx.fillStyle = look.shirt; ctx.fillRect(x - 2, y - 12, 5, 6); ctx.fillStyle = sk; ctx.fillRect(x - 2, y - 17, 5, 5); ctx.fillStyle = hc; ctx.fillRect(x - 2, y - 18, 5, 2);
}
P.frame = function (dt) {
  const ctx = G.ctx, VW = NE.VW, VH = NE.VH; const sc = NE.LORE.scenes[P.i]; if (!sc) return; P.t += dt; P.typed = Math.min(sc.t.length, P.typed + dt * 34); const t = P.t, T = G.t;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#05040a'; ctx.fillRect(0, 0, VW, VH);
  const stars = sp => { for (const s of P.stars) { const x = ((s.x * VW - T * sp * (0.2 + s.z)) % VW + VW) % VW; ctx.globalAlpha = 0.3 + s.z * 0.7 * (0.7 + 0.3 * Math.sin(T * 3 + s.x * 50)); ctx.fillStyle = s.z > 0.8 ? '#fff6d0' : '#a8b8ff'; ctx.fillRect(Math.round(x), Math.round(s.y * VH), 1, 1); } ctx.globalAlpha = 1; };
  const cx = VW / 2, cy = VH / 2 - 14;
  const hex = (x, y, r, col) => { ctx.fillStyle = col; for (let j = -r; j <= r; j++) { const w = Math.round(r * 1.15 - Math.abs(j) * 0.58); ctx.fillRect(Math.round(x - w), Math.round(y + j), w * 2 + 1, 1); } };
  const wisp = (x, y, s) => { s = s || 1; const g = ctx.createRadialGradient(x, y, 0, x, y, 12 * s); g.addColorStop(0, 'rgba(255,210,60,0.6)'); g.addColorStop(1, 'rgba(255,210,60,0)'); ctx.fillStyle = g; ctx.fillRect(x - 12 * s, y - 12 * s, 24 * s, 24 * s); for (let i = -2; i <= 2; i++) { ctx.fillStyle = i % 2 ? '#3a2408' : '#ffd23a'; ctx.fillRect(Math.round(x) + i, Math.round(y) - 1, 1, 3); } };
  switch (sc.k) {
    case 'hive': case 'hive2': { stars(4); const pul = 0.75 + 0.25 * Math.sin(T * 1.5); for (let ring = 0; ring < 4; ring++) for (let k = 0; k < Math.max(1, ring * 6); k++) { const a = k / Math.max(1, ring * 6) * Math.PI * 2 + ring * 0.3; const x = cx + Math.cos(a) * ring * 13, y = cy + Math.sin(a) * ring * 11; const c = NE.hash(ring, k) > 0.3 ? 'rgba(255,' + (170 + ring * 15) + ',40,' + (pul - ring * 0.12) + ')' : 'rgba(120,70,20,0.8)'; hex(x, y, 6, c); }
      const gg = ctx.createRadialGradient(cx, cy, 5, cx, cy, 90); gg.addColorStop(0, 'rgba(255,200,60,0.35)'); gg.addColorStop(1, 'rgba(255,200,60,0)'); ctx.fillStyle = gg; ctx.fillRect(0, 0, VW, VH);
      const n = sc.k === 'hive2' ? 14 : 8; for (let i = 0; i < n; i++) { const a = T * (0.4 + i * 0.05) + i; const r = sc.k === 'hive2' ? 60 + ((t * 30 + i * 20) % 200) : 58 + Math.sin(T + i) * 6; wisp(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.6, 0.5); } break; }
    case 'travel': { stars(60); const x = cx + Math.sin(T * 0.7) * 30, y = cy + Math.sin(T * 1.1) * 12; for (let k = 1; k < 40; k++) { ctx.globalAlpha = 1 - k / 40; ctx.fillStyle = '#ffd23a'; ctx.fillRect(Math.round(x - k * 3), Math.round(y + Math.sin(T * 1.1 - k * 0.05) * 3), 1, 1); } ctx.globalAlpha = 1; wisp(x, y, 1.2); break; }
    case 'earth': { stars(2); const r = 48; for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { if (i * i + j * j > r * r) continue; const lon = (i / r + T * 0.05) * 3, lat = j / r * 3; const land = Math.sin(lon * 2.1) * Math.cos(lat * 1.7) + Math.sin(lon * 3.7 + lat) * 0.5 > 0.35; const cloud = Math.sin(lon * 2.3 + T * 0.25 + Math.sin(lat * 3.1) * 1.5) * Math.cos(lat * 2.2 - lon * 0.7) > 0.62; const sh = clamp(1 - (i + j * 0.3) / r * 0.6, 0.35, 1.1); ctx.fillStyle = cloud ? NE.shade('#e8eef8', sh) : land ? NE.shade('#3a7a3a', sh) : NE.shade('#2a5aa8', sh); ctx.fillRect(cx + 40 + i, cy + 10 + j, 1, 1); }
      const p = clamp(t / 5, 0, 1); const x = lerp(20, cx + 30, p), y = lerp(10, cy - 10, p); for (let k = 1; k < 30; k++) { ctx.globalAlpha = (1 - k / 30) * 0.8; ctx.fillStyle = '#ffb020'; ctx.fillRect(Math.round(x - k * 2), Math.round(y - k * 1.2), 1, 1); } ctx.globalAlpha = 1; if (p < 1) wisp(x, y, 1); break; }
    case 'forest': case 'host': { const sky = ctx.createLinearGradient(0, 0, 0, VH); sky.addColorStop(0, '#0a1024'); sky.addColorStop(1, '#1a1a28'); ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, VH); stars(0.5); ctx.fillStyle = '#e8e4c8'; ctx.fillRect(VW - 60, 22, 9, 9); ctx.fillRect(VW - 61, 24, 11, 5);
      for (let i = 0; i < Math.ceil(VW / 14) + 1; i++) { const x = i * 14 + (NE.hash(i, 3) * 6 | 0), h = 50 + NE.hash(i, 4) * 50; ctx.fillStyle = '#0a1210'; for (let k = 0; k < h; k++) { const w = Math.round(1 + k / h * 7); ctx.fillRect(x - w, VH - 40 - h + k, w * 2 + 1, 1); } }
      ctx.fillStyle = '#0d120e'; ctx.fillRect(0, VH - 40, VW, 40);
      const fx = cx - 30; ctx.fillStyle = '#3a2a1a'; ctx.fillRect(fx - 4, VH - 42, 9, 2); const fz = Math.sin(T * 20) > 0 ? 1 : 0; ctx.fillStyle = '#ff7020'; ctx.fillRect(fx - 2, VH - 46 - fz, 5, 4 + fz); ctx.fillStyle = '#ffd060'; ctx.fillRect(fx, VH - 47 + fz, 1, 3);
      const fg = ctx.createRadialGradient(fx, VH - 44, 0, fx, VH - 44, 50); fg.addColorStop(0, 'rgba(255,140,50,0.35)'); fg.addColorStop(1, 'rgba(255,140,50,0)'); ctx.fillStyle = fg; ctx.fillRect(fx - 50, VH - 94, 100, 100);
      const hx = cx - 12, hy = VH - 40; ctx.save(); ctx.translate(hx, hy); ctx.scale(2, 2); human(ctx, 0, 0, P.host.look, true); ctx.restore();
      if (sc.k === 'forest') { const x = lerp(VW - 40, cx + 30, clamp(t / 5, 0, 1)), y = 60 + Math.sin(T * 2) * 10 + clamp(t / 5, 0, 1) * 60; wisp(x, y, 1); }
      else { const p = clamp(t / 3, 0, 1); wisp(lerp(cx + 30, hx + 24, p), lerp(120, hy - 4, p), 1 - p * 0.5); if (t > 3) { const k = clamp((t - 3) / 2.5, 0, 1); for (let i = 0; i < 80 * k; i++) { ctx.fillStyle = i % 3 ? '#ffc21a' : '#d08a10'; ctx.fillRect(hx + Math.round(NE.hash(i, 1) * 30), hy - 7 + Math.round(NE.hash(i, 2) * 7), 1, 1); } } }
      break; }
    case 'eyes': { if (!P.port) { P.pc = document.createElement('canvas'); P.port = new NE.Portrait(P.pc, P.host); } const glow = clamp(t / 2, 0, 1); P.port.draw({ life: 1, expr: 'neutral', vespa: glow > 0.5, infest: glow * 0.5 }); const s = 3; ctx.drawImage(P.pc, Math.round(cx - 24 * s), Math.round(cy - 28 * s + 20), 48 * s, 56 * s);
      const g = ctx.createRadialGradient(cx, cy + 4, 0, cx, cy + 4, 70); g.addColorStop(0, 'rgba(255,200,40,' + glow * 0.25 + ')'); g.addColorStop(1, 'rgba(255,200,40,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH); break; }
    case 'pit': { const gr = ctx.createLinearGradient(0, 0, 0, VH); gr.addColorStop(0, '#1a1420'); gr.addColorStop(1, '#050304'); ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH); ctx.fillStyle = '#2a2018'; ctx.fillRect(0, 110, cx - 40, VH); ctx.fillRect(cx + 40, 110, VW, VH);
      for (let k = 0; k < VH - 110; k++) { ctx.fillStyle = 'rgba(255,170,60,' + (k / (VH - 110)) * 0.12 + ')'; ctx.fillRect(cx - 40, 110 + k, 80, 1); }
      ctx.save(); ctx.translate(cx - 54, 110); ctx.scale(2, 2); human(ctx, 0, 0, P.host.look, false); ctx.fillStyle = '#ffd23a'; ctx.fillRect(1, -15, 1, 1); ctx.restore(); const eg = ctx.createRadialGradient(cx - 52, 80, 0, cx - 52, 80, 10); eg.addColorStop(0, 'rgba(255,210,60,0.7)'); eg.addColorStop(1, 'rgba(255,210,60,0)'); ctx.fillStyle = eg; ctx.fillRect(cx - 62, 70, 20, 20); break; }
    case 'flower': { ctx.fillStyle = '#07060a'; ctx.fillRect(0, 0, VW, VH); const x = cx, y = cy + 40; const g = ctx.createRadialGradient(x, y - 20, 0, x, y - 20, 90); g.addColorStop(0, 'rgba(255,200,60,0.45)'); g.addColorStop(1, 'rgba(255,200,60,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#3a6a2a'; ctx.fillRect(x, y - 30, 2, 30); ctx.fillRect(x - 6, y - 14, 6, 2); ctx.fillRect(x + 2, y - 10, 6, 2); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + T * 0.2; ctx.fillStyle = k % 2 ? '#ffcf40' : '#ffa830'; ctx.fillRect(Math.round(x + Math.cos(a) * 6) - 2, Math.round(y - 38 + Math.sin(a) * 6) - 2, 5, 5); } ctx.fillStyle = '#fff6c0'; ctx.fillRect(x - 1, y - 40, 4, 4);
      const dp = (t * 1.2) % 1; ctx.fillStyle = '#ffb020'; ctx.fillRect(x, Math.round(y - 32 + dp * 30), 1, 2); break; }
    case 'end': { const a = clamp(t / 2, 0, 1); ctx.globalAlpha = a; if (!G.titleImg) G.titleImg = NE.makeNectarTitle(); const TI = G.titleImg; if (TI.logo) ctx.drawImage(TI.logo.img, Math.round(cx - TI.logo.img.width / 2), 34); ctx.drawImage(TI.title.img, Math.round(cx - TI.title.img.width / 2), TI.logo ? 84 : 60); ctx.globalAlpha = 1; break; }
  }
  // caption
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, VH - 38, VW, 38);
  NE.UI.prologueText(sc.t.slice(0, Math.floor(P.typed)), P.i, NE.LORE.scenes.length);
  if (P.t > Math.max(5.5, sc.t.length / 20 + 3)) P.next();
};
})(window.NE);
