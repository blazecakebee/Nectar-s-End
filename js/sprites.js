// Nectar's End — hand-authored 8x8 pixel icons (palette-letter maps) + pixel drawing helpers
(function (NE) {
'use strict';
NE.PAL = { k: '#111111', w: '#e8e2d0', g: '#8a8f94', d: '#4a4f55', r: '#a0302a', R: '#e05040', b: '#6a4a2a', B: '#9a7040', y: '#e0c050', o: '#d08030', G: '#3a8a40', l: '#6ad0e0', u: '#3060a0', p: '#a060c0', s: '#d0a080', m: '#70e070', c: '#c0b8a0' };
const I = NE.ICONS = {
  rag: ['........', '..cccc..', '.cBcccc.', '.ccXBcc.', '.ccBccc.', '..cccBc.', '...ccc..', '........'],
  bandage: ['........', '..wwww..', '.wwggww.', '.wgkkgw.', '.wgkkgw.', '.wwggww.', '..wwww.w', '.......w'],
  tourniquet: ['........', '.kkkkkk.', 'k......k', 'k..yy..k', 'k..yy..k', 'k......k', '.kkkkkk.', '...rr...'],
  suture: ['.......g', '......g.', '.....g..', '....g...', '...g....', '..r.....', '.r.r..r.', 'r...rr..'],
  splint: ['.B....B.', '.B....B.', '.wwwwww.', '.B....B.', '.B....B.', '.wwwwww.', '.B....B.', '.B....B.'],
  forceps: ['g......g', '.g....g.', '..g..g..', '...gg...', '...gg...', '..k..k..', '.k....k.', '.k....k.'],
  antiseptic: ['...kk...', '...gg...', '..bbbb..', '.bbbbbb.', '.bwRwbb.', '.bwwwbb.', '.bbbbbb.', '..bbbb..'],
  alcohol: ['...kk...', '...GG...', '...GG...', '..GGGG..', '.GGGGGG.', '.GwwwwG.', '.GGGGGG.', '.GGGGGG.'],
  pills: ['..XXXX..', '..XXXX..', '.wwwwww.', '.wkkkkw.', '.wwwwww.', '.wXXXXw.', '.wwwwww.', '..wwww..'],
  syringe: ['.......k', '......g.', '.....gX.', '....gXg.', '...gXg..', '..ggg...', '.g.g....', 'g.......'],
  bloodbag: ['...gg...', '.wwwwww.', '.wRRRRw.', '.wRrrRw.', '.wRrrRw.', '.wRRRRw.', '..wwww..', '...gg...'],
  water: ['...uu...', '...ww...', '..wwww..', '..wXXw..', '..wXXw..', '..wXXw..', '..wXXw..', '..wwww..'],
  can: ['........', '..gggg..', '.gddddg.', '.gooXog.', '.gyyyyg.', '.gooXog.', '.gddddg.', '..gggg..'],
  chocolate: ['........', '.bbbbbb.', '.bBbBbb.', '.bbbbbb.', '.bBbBbb.', '.rrrrrr.', '.rwrrrr.', '........'],
  scrap: ['........', '...gg...', '..gdgd..', '.gddgdg.', '.dgdgg..', '..gdgg..', '...d....', '........'],
  tape: ['........', '..gggg..', '.gggggg.', '.gg..gg.', '.gg..gg.', '.gggggg.', '..gggg..', '........'],
  cloth: ['........', '.cccccc.', '.cwccwc.', '.cccccc.', '.cwccwc.', '.cccccc.', '........', '........'],
  pipe: ['......gg', '.....gdg', '....gdg.', '...gdg..', '..gdg...', '.gdg....', 'gdg.....', 'gg......'],
  knife: ['.......w', '......wg', '.....wg.', '....wg..', '...wg...', '..b.....', '.bb.....', 'b.......'],
  crowbar: ['.....rr.', '......rr', '......r.', '.....r..', '....r...', '...r....', 'rrr.....', 'r.......'],
  axe: ['...ggg..', '..gwggg.', '..gggggg', '...bggg.', '..b.....', '.b......', 'b.......', '........'],
  shiv: ['........', '......g.', '.....wg.', '....wg..', '...wg...', '..dd....', '.dd.....', '........'],
  pistol: ['........', '.dddddd.', '.dkkkkd.', '.dddd...', '..bb....', '..bb....', '........', '........'],
  rifle: ['........', '........', '.......d', 'bbdddddd', 'bbbkd...', 'bb..d...', '........', '........'],
  ammo: ['........', '.X..X..X', '.o..o..o', '.o..o..o', '.d..d..d', '.d..d..d', '........', '........'],
  flare: ['.....oyo', '....rro.', '...rr...', '..rr....', '.rr.....', 'rr......', '........', '........'],
  glowstick: ['......mm', '.....mm.', '....mm..', '...mm...', '..mm....', '.mm.....', '........', '........'],
  battery: ['...kk...', '..yyyy..', '..yyyy..', '..kkkk..', '..kkkk..', '..kkkk..', '..kkkk..', '........'],
  lockpick: ['........', '......gg', '.....g.g', '....g.gg', '...g....', '..g.....', '.bb.....', 'bb......'],
  keycard: ['........', '.wwwwww.', '.wuuuuw.', '.wwwwww.', '.wkkkww.', '.wwwwww.', '........', '........'],
  filter: ['........', '..dddd..', '.dggggd.', '.dgkkgd.', '.dgkkgd.', '.dggggd.', '..dddd..', '........'],
  respirator: ['........', '.dd..dd.', 'dkkddkkd', 'dkkddkkd', '.dddddd.', '..dggd..', '...dd...', '........'],
  vest: ['........', '.XX..XX.', '.XXXXXX.', '.XgXXgX.', '.XXXXXX.', '.XgXXgX.', '.XXXXXX.', '........'],
  helmet: ['........', '........', '..XXXX..', '.XXXXXX.', 'XXXXXXXX', 'X......X', '........', '........'],
  brick: ['........', '........', '.oooooo.', '.orrrro.', '.oooooo.', '........', '........', '........'],
  bottle: ['...gg...', '...ll...', '..llll..', '.l....l.', '.l....l.', '.l....l.', '.llllll.', '........'],
  molotov: ['...cc...', '...cG...', '..GGGG..', '.GoooGG.', '.GooooG.', '.GooooG.', '.GGGGGG.', '........'],
  trinket: ['........', '...yy...', '..y..y..', '..y..y..', '...yy...', '...ll...', '........', '........'],
  datashard: ['........', '...ll...', '..lull..', '.lluull.', '..lull..', '...ll...', '........', '........'],
  flashlight: ['........', '........', 'kkkkgyy.', 'kddddyyy', 'kkkkgyy.', '........', '........', '........'],
  // menu / perk icons
  heart: ['........', '.RR..RR.', 'RRRRRRRR', 'RRRRRRRR', '.RRRRRR.', '..RRRR..', '...RR...', '........'],
  backpack: ['..bbbb..', '.b....b.', 'BBBBBBBB', 'BbbbbbbB', 'BbyyyybB', 'BbbbbbbB', 'BbbbbbbB', '.BBBBBB.'],
  body: ['...ww...', '...ww...', '.wwwwww.', 'w.wwww.w', '..wwww..', '..w..w..', '..w..w..', '.ww..ww.'],
  hammer: ['.dddd...', '.ddddd..', '..gb....', '...b....', '....b...', '.....b..', '......b.', '.......b'],
  map: ['........', '.yyyyyy.', '.ybyyyy.', '.yybbyy.', '.yyyybb.', '.yyyyyy.', '........', '........'],
  book: ['........', '.rrrrrr.', '.rwwwwr.', '.rwkkwr.', '.rwwwwr.', '.rwkkwr.', '.rrrrrr.', '........'],
  gear: ['...gg...', '.g.gg.g.', '..gggg..', 'gggddggg', 'gggddggg', '..gggg..', '.g.gg.g.', '...gg...'],
  door: ['.dddddd.', '.dbbbbd.', '.dbbbbd.', '.dbbbyd.', '.dbbbbd.', '.dbbbbd.', '.dbbbbd.', '.dddddd.'],
  star: ['...yy...', '...yy...', 'yyyyyyyy', '.yyyyyy.', '..yyyy..', '.yy..yy.', '.y....y.', '........'],
  ecg: ['........', '........', '...m....', '..m.m...', 'mm...m.m', '......m.', '........', '........'],
  boot: ['...bb...', '...bb...', '...bb...', '...bb...', '...bbbb.', '..bbbbbb', '..kkkkkk', '........'],
  lungs: ['...ww...', '.r.ww.r.', 'rr.w..rr', 'rrr..rrr', 'rrr..rrr', 'rrr..rrr', '.rr..rr.', '........'],
  bolt: ['....yy..', '...yy...', '..yy....', '.yyyyy..', '...yy...', '..yy....', '.yy.....', 'y.......'],
  eye: ['........', '..wwww..', '.wwkkww.', 'wwkllkww', '.wwkkww.', '..wwww..', '........', '........'],
  shield: ['.gggggg.', '.gwwwwg.', '.gwwwwg.', '.gwwwwg.', '..gwwg..', '..gwwg..', '...gg...', '........'],
  drop: ['...R....', '...R....', '..RRR...', '.RRRRR..', '.RRwRR..', '..RRR...', '........', '........'],
  fist: ['........', '.ssss...', 'ssssss..', 'sskksss.', 'ssssss..', '.ssss...', '..ss....', '........'],
  pick: ['.gggggg.', 'g..b...g', '...b....', '...b....', '...b....', '...b....', '...b....', '........'],
  mind: ['..pppp..', '.p....p.', 'p..pp..p', 'p.p..p.p', 'p.p.p..p', 'p..p...p', '.p....p.', '..pppp..'],
  skull: ['..wwww..', '.wwwwww.', 'wkkwwkkw', 'wkkwwkkw', '.wwwwww.', '..wkwk..', '..wwww..', '........'],
  bone: ['ww......', 'www.....', '.www....', '..www...', '...www..', '....www.', '.....www', '......ww'],
  lock: ['..gggg..', '.g....g.', '.g....g.', 'yyyyyyyy', 'yyykkyyy', 'yyykkyyy', 'yyyyyyyy', '........'],
  you: ['..wwww..', '.wwwwww.', '.wwwwww.', '..wwww..', '...ww...', '.wwwwww.', 'wwwwwwww', 'wwwwwwww'],
  wardrobe: ['.dddddd.', '.dBBBBd.', '.dBdBBd.', '.dBBBBd.', '.dBdBBd.', '.dBBBBd.', '.dddddd.', '.d....d.'],
  coin: ['..yyyy..', '.yyooyy.', 'yyoyyoyy', 'yyoyyyyy', 'yyoyyoyy', '.yyooyy.', '..yyyy..', '........'],
  elevator: ['dddddddd', 'dgggggd.', 'dg.y..gd', 'dg.yy.gd', 'dg.y..gd', 'dgggggd.', 'dddddddd', '........'],
};
const cache = {};
NE.icon = function (key, col, scale) {
  scale = scale || 1; const ck = key + '|' + (col || '') + '|' + scale;
  if (cache[ck]) return cache[ck];
  const rows = I[key] || I.scrap; const c = document.createElement('canvas'); c.width = 8 * scale; c.height = 8 * scale;
  const x = c.getContext('2d');
  for (let j = 0; j < 8; j++) { const r = rows[j] || ''; for (let i = 0; i < 8; i++) { const ch = r[i]; if (!ch || ch === '.') continue; x.fillStyle = ch === 'X' ? (col || '#c0c0c0') : (NE.PAL[ch] || '#f0f'); x.fillRect(i * scale, j * scale, scale, scale); } }
  cache[ck] = c; return c;
};
const urlc = {};
NE.iconURL = function (key, col, scale) { const ck = key + '|' + (col || '') + '|' + (scale || 4); if (!urlc[ck]) urlc[ck] = NE.icon(key, col, scale || 4).toDataURL(); return urlc[ck]; };
NE.itemIconURL = function (id, scale) { const it = NE.ITEMS[id]; if (!it) return NE.iconURL('scrap'); return NE.iconURL(it.icon, it.col, scale || 4); };

// pixel line with thickness
NE.pline = function (ctx, x1, y1, x2, y2, w, col) {
  ctx.fillStyle = col; const dx = x2 - x1, dy = y2 - y1; const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)))); const o = (w - 1) / 2;
  for (let i = 0; i <= n; i++) { const t = i / n; ctx.fillRect(Math.round(x1 + dx * t - o), Math.round(y1 + dy * t - o), w, w); }
};
NE.shade = function (hex, f) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  r = NE.clamp(Math.round(r * f), 0, 255); g = NE.clamp(Math.round(g * f), 0, 255); b = NE.clamp(Math.round(b * f), 0, 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
};

// Nectar / honey treatment: takes a white-on-transparent canvas, crisps it to pixels, adds drips + honey shading.
NE.logoImg = new Image(); NE.logoImg.src = 'assets/logo.png';
NE.makeHoney = function (src, dripChance, seed) {
  const w = src.width, h = src.height, pad = 14; const c = document.createElement('canvas'); c.width = w + 2; c.height = h + pad; const x = c.getContext('2d');
  const sd = src.getContext('2d').getImageData(0, 0, w, h).data; const M = new Uint8Array((w + 2) * (h + pad));
  const at = (i, j) => (i < 0 || j < 0 || i >= w + 2 || j >= h + pad) ? 0 : M[j * (w + 2) + i];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (sd[(j * w + i) * 4 + 3] > 110) M[j * (w + 2) + i + 1] = 1;
  const tips = [];
  for (let i = 1; i < w + 1; i++) for (let j = h - 1; j >= 0; j--) {
    if (!at(i, j) || at(i, j + 1)) continue; const r = NE.hash(i * 7 + seed, j);
    if (r < dripChance) { const len = 2 + Math.floor(NE.hash(i, j + seed) * NE.hash(j, i) * 11); const wide = NE.hash(i + 3, j) < 0.3;
      for (let k = 1; k <= len; k++) { M[(j + k) * (w + 2) + i] = 1; if (wide && k < len - 1) M[(j + k) * (w + 2) + i + 1] = 1; }
      M[(j + len + 1) * (w + 2) + i] = 1; M[(j + len) * (w + 2) + i - 1] = 1; M[(j + len) * (w + 2) + i + 1] = 1; tips.push({ x: i, y: j + len + 2 }); }
    else if (r < dripChance * 2.2) { M[(j + 1) * (w + 2) + i] = 1; }
  }
  const img = x.createImageData(w + 2, h + pad); const d = img.data;
  for (let j = 0; j < h + pad; j++) for (let i = 0; i < w + 2; i++) {
    const k = (j * (w + 2) + i) * 4;
    if (!at(i, j)) { if (at(i - 1, j) || at(i + 1, j) || at(i, j - 1) || at(i, j + 1)) { d[k] = 34; d[k + 1] = 16; d[k + 2] = 6; d[k + 3] = 230; } continue; }
    const t = Math.min(1, j / h); let r = 255, g = Math.round(214 - t * 110), b = Math.round(90 - t * 70);
    if (!at(i, j - 1)) { r = 255; g = 244; b = 170; } else if (!at(i, j - 2) && NE.hash(i, j) < 0.5) { g = Math.min(255, g + 25); b += 30; }
    if (!at(i, j + 1)) { r = 150; g = 70; b = 12; } else if (!at(i + 1, j)) { r = Math.round(r * 0.82); g = Math.round(g * 0.78); b = Math.round(b * 0.7); }
    if (j >= h) { r = 235; g = 140; b = 30; if (!at(i, j + 1)) { r = 160; g = 80; b = 14; } if (!at(i - 1, j) && at(i + 1, j)) { g = 190; b = 80; } }
    d[k] = r; d[k + 1] = g; d[k + 2] = b; d[k + 3] = 255;
  }
  x.putImageData(img, 0, 0); return { img: c, tips };
};
NE.makeNectarTitle = function () {
  const tw = 250, th = 34; const t = document.createElement('canvas'); t.width = tw; t.height = th; const x = t.getContext('2d');
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = 'bold ' + Math.floor(th * 0.84) + 'px "Pixelify Sans", "VT323", monospace'; x.fillText("NECTAR'S END", tw / 2, th / 2 + 1);
  const title = NE.makeHoney(t, 0.07, 11);
  let logo = null; const L = NE.logoImg;
  if (L.complete && L.naturalWidth) { const lw = 50, lh = Math.round(50 * L.naturalHeight / L.naturalWidth); const lc = document.createElement('canvas'); lc.width = lw; lc.height = lh; const lx = lc.getContext('2d'); lx.imageSmoothingEnabled = true; lx.drawImage(L, 0, 0, lw, lh); logo = NE.makeHoney(lc, 0.09, 5); }
  return { title, logo };
};
// Weathered pixel title: renders text small, then erodes it with noise for a stark, eroded look.
NE.makeTitle = function (text, w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.fillStyle = '#e8e2d0'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = 'bold ' + Math.floor(h * 0.78) + 'px "Pixelify Sans", "VT323", monospace';
  x.fillText(text, w / 2, h / 2 + 1);
  const d = x.getImageData(0, 0, w, h); const p = d.data;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = (j * w + i) * 4; if (p[k + 3] < 128) { p[k + 3] = 0; continue; }
    p[k + 3] = 255; const n = NE.hash(i, j), n2 = NE.hash(i >> 2, j >> 2);
    if (n2 < 0.12 || n < 0.07) p[k + 3] = 0;               // chips
    else if (j > h * 0.62 && n < 0.25) p[k + 3] = 0;        // corroded bottom
    else { const v = 0.8 + n * 0.2; p[k] *= v; p[k + 1] *= v * 0.97; p[k + 2] *= v * 0.92; }
  }
  x.putImageData(d, 0, 0); return c;
};
})(window.NE);
