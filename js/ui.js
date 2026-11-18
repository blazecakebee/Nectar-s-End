// Nectar's End — DOM UI: title, HUD, fading-ink portrait, hex menu (M), tabs, lobby stations, dialogs
(function (NE) {
'use strict';
const $ = (s, r) => (r || document).querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ic = (id, sc) => '<img class="pix" src="' + NE.itemIconURL(id, sc || 4) + '">';
const icn = (k, col, sc) => '<img class="pix" src="' + NE.iconURL(k, col, sc || 4) + '">';
const fmtT = t => { t = Math.floor(t); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
const bar = (v, max, col, label) => '<div class="bar"><div class="bar-f" style="width:' + NE.clamp(v / max * 100, 0, 100) + '%;background:' + col + '"></div><span>' + label + '</span></div>';
const G = () => NE.G;

const UI = NE.UI = { panel: null, hexOpen: false, arg: null, toasts: [], tickT: 0, portT: 0 };

UI.init = function () {
  const root = $('#ui');
  root.innerHTML = `
  <div id="title-ui" class="hide">
    <div class="t-sub">a descent into the dark, one survivor at a time</div>
    <div class="t-menu">
      <button class="t-btn" data-a="play">PLAY</button>
      <button class="t-btn" data-a="settings">SETTINGS</button>
      <button class="t-btn small" data-a="cemetery">RUN ARCHIVE / CEMETERY</button>
    </div>
    <div class="t-foot"><span id="t-best"></span><span>v0.1 • click anywhere to enable sound</span></div>
  </div>
  <div id="hud" class="hide">
    <div id="depth"><div class="d-num">0000<small>m</small></div><div class="d-bio"></div><div class="d-gauge"><div class="d-fill"></div><div class="d-ticks"></div></div><div class="d-threat"></div></div>
    <div id="lobbybar" class="hide"></div>
    <div id="portrait"><canvas id="pcv"></canvas><div class="p-name"></div><div class="p-occ"></div><div class="p-cond"></div></div>
    <div id="vitals"></div>
    <div id="hotbar"></div>
    <div id="prompt" class="hide"></div>
    <div id="say" class="hide"></div>
    <div id="prog" class="hide"><div></div></div>
    <div id="toasts"></div>
    <div id="banner" class="hide"><b></b><span></span></div>
    <div id="slowmo" class="hide">TIME SLOWED</div>
  </div>
  <div id="hex" class="hide"></div>
  <div id="panel" class="hide"><div class="pn-head"><span class="pn-title"></span><button class="pn-x">✕</button></div><div class="pn-body"></div></div>
  <div id="modal" class="hide"></div>
  <div id="fade"></div>`;
  root.querySelectorAll('.t-btn').forEach(b => b.onclick = () => { NE.Audio.init(); NE.Audio.play('ui'); const a = b.dataset.a; if (a === 'play') UI.fade(() => G().toLobby()); else UI.open(a); });
  $('.pn-x').onclick = () => UI.close();
  UI.buildHex();
  UI.portrait = null;
};
UI.fade = function (cb) { const f = $('#fade'); f.classList.add('on'); setTimeout(() => { cb(); setTimeout(() => f.classList.remove('on'), 60); }, 380); };
UI.showTitle = function () { UI.closeAll(); $('#title-ui').classList.remove('hide'); $('#hud').classList.add('hide'); const M = G().meta; $('#t-best').textContent = M.runs ? 'Deepest: ' + Math.round(M.best.depth) + 'm • Runs: ' + M.runs + ' • Lv ' + M.level : 'No survivors yet.'; };
UI.showLobby = function () { UI.closeAll(); $('#title-ui').classList.add('hide'); $('#hud').classList.remove('hide'); $('#hud').classList.add('lobby'); $('#lobbybar').classList.remove('hide'); UI.portrait = new NE.Portrait($('#pcv'), G().meta.survivor); UI.hudStatic(); };
UI.showRun = function () { UI.closeAll(); $('#title-ui').classList.add('hide'); $('#hud').classList.remove('hide', 'lobby'); $('#lobbybar').classList.add('hide'); UI.portrait = new NE.Portrait($('#pcv'), G().meta.survivor || G().player.surv); UI.hudStatic(); };
UI.hideHUD = function () { $('#hud').classList.add('hide'); };
UI.hudStatic = function () { const p = G().player; if (!p) return; const s = p.surv; $('.p-name').textContent = s.name; $('.p-occ').textContent = NE.OCCUPATIONS.find(o => o.id === s.occ).name + ', ' + s.age; };

// ---------------- toasts / say / banner ----------------
UI.toast = function (m, cls) {
  const box = $('#toasts'); if (!box) return; const d = document.createElement('div'); d.className = 'toast ' + (cls || ''); d.textContent = m; box.appendChild(d);
  setTimeout(() => d.classList.add('out'), 3800); setTimeout(() => d.remove(), 4400); while (box.children.length > 6) box.firstChild.remove();
};
UI.say = function (t) { const s = $('#say'); s.textContent = t; s.classList.remove('hide'); s.style.opacity = 1; UI.sayT = 3.2; };
UI.banner = function (t, sub) { const b = $('#banner'); b.querySelector('b').textContent = t; b.querySelector('span').textContent = sub || ''; b.classList.remove('hide'); b.classList.remove('fadeout'); void b.offsetWidth; b.classList.add('show'); clearTimeout(UI._bt); UI._bt = setTimeout(() => { b.classList.add('fadeout'); }, 3500); };

// ---------------- per-frame ----------------
UI.toScreen = function (wx, wy) { const g = G(); const r = g.cv.getBoundingClientRect(); const pr = $('#game').getBoundingClientRect(); return { x: (wx - g.cam.x) / NE.VW * r.width + (r.left - pr.left), y: (wy - g.cam.y) / NE.VH * r.height + (r.top - pr.top) }; };
UI.tick = function (dt) {
  const g = G(); if (!(g.state === 'run' || g.state === 'lobby' || g.state === 'dying') || !g.player) return; const p = g.player;
  // say bubble follows head
  const s = $('#say'); if (UI.sayT > 0) { UI.sayT -= dt; const sp = UI.toScreen(p.x, p.y - p.h - 16); s.style.left = sp.x + 'px'; s.style.top = sp.y + 'px'; s.style.opacity = Math.min(1, UI.sayT); if (UI.sayT <= 0) s.classList.add('hide'); }
  // interaction prompt
  const pr = $('#prompt'); const tgt = !UI.panel && !UI.hexOpen && p.alive && !p.search && !p.treating ? g.interactTarget() : null;
  if (tgt) { const sp = UI.toScreen(tgt.x, (tgt.y || p.y) - (tgt.type === 'elevator' ? 40 : 20)); let lab = tgt.label || 'Interact'; if (tgt.type === 'container') lab = (tgt.searched ? 'Open ' : tgt.locked ? 'Breach ' : 'Search ') + lab + (tgt.locked ? ' 🔒' : ''); else if (tgt.isNPC) lab = (tgt.kind === 'trader' ? 'Trade with ' : 'Talk to ') + tgt.label; else if (tgt.type === 'elevator') lab = tgt.kind === 'descent' ? 'Enter Descent Elevator' : tgt.label; pr.innerHTML = '<b>[E]</b> ' + esc(lab); pr.style.left = sp.x + 'px'; pr.style.top = sp.y + 'px'; pr.classList.remove('hide'); } else pr.classList.add('hide');
  // progress bar
  const pg = $('#prog'); const act = p.treating || p.search; if (act) { const sp = UI.toScreen(p.x, p.y - p.h - 4); pg.style.left = sp.x + 'px'; pg.style.top = sp.y + 'px'; pg.firstChild.style.width = (act.t / act.dur * 100) + '%'; pg.dataset.l = p.treating ? (p.treating.op === 'removeTq' ? 'Loosening' : 'Treating ' + NE.PART_NAMES[p.treating.part]) : 'Searching'; pg.classList.remove('hide'); } else pg.classList.add('hide');
  $('#slowmo').classList.toggle('hide', !(UI.panel || UI.hexOpen) || g.state !== 'run');
  UI.portT -= dt; if (UI.portT <= 0 && UI.portrait) { UI.portT = 0.12; const A = p.anat; const life = g.state === 'lobby' ? 1 : p.alive ? Math.min(A.blood / 5000 * 1.15, (A.cons + 20) / 100, 1) : Math.max(0, 0.25 - (3.2 - (g.dieT || 0)) * 0.08); UI.portrait.draw({ life, expr: !p.alive ? 'dead' : A.uncon ? 'uncon' : A.pain > A.threshold * 0.7 ? 'pain' : 'neutral', bleeding: A.bleeding || 0, headWounds: A.parts.head.wounds.filter(w => !w.closed || w.t === 'gsw').length, headBandage: !!A.parts.head.bandage }); }
  UI.tickT -= dt; if (UI.tickT <= 0) { UI.tickT = 0.1; UI.hudUpdate(); if (UI.panel && UI.live[UI.panel]) UI.live[UI.panel](); }
  if (UI.panel === 'status' && UI.ecg) UI.drawECG(dt);
};
UI.hudUpdate = function () {
  const g = G(), p = g.player, A = p.anat;
  if (g.state === 'lobby') { const M = g.meta; $('#lobbybar').innerHTML = '<b>STAGING LOBBY</b><span>' + icn('coin', null, 2) + ' ' + M.scrap + ' scrap</span><span>' + icn('star', null, 2) + ' ' + M.points + ' skill pts</span><span>Lv ' + M.level + '</span><span class="dim">[E] use station • [M] menu • RMB drag objects</span>'; }
  const d = NE.depthOfY(p.y); const fl = g.world.lobby ? null : g.curFloor();
  $('.d-num').innerHTML = (g.world.lobby ? '0000' : String(Math.round(d)).padStart(4, '0')) + '<small>m</small>';
  $('.d-bio').textContent = fl ? fl.biome.name : 'Staging Lobby';
  const next = (Math.floor(d / 250) + 1) * 250; $('.d-fill').style.width = ((d % 250) / 250 * 100) + '%'; $('.d-ticks').textContent = fl ? '▸ ' + next + 'm extraction' : '';
  if (fl) { let thr = 1 + Math.floor(fl.depth / 300); if (g.env.threat) thr += 1; if (g.blackout > 0) thr += 1; thr = Math.min(5, thr); $('.d-threat').innerHTML = 'THREAT ' + '<i class="on">☠</i>'.repeat(thr) + '<i>☠</i>'.repeat(5 - thr); } else $('.d-threat').innerHTML = '';
  // portrait conditions (top 3)
  const cond = g.state === 'lobby' ? [] : A.conditions().filter(c => c[1] !== 'good').slice(0, 3); $('.p-cond').innerHTML = cond.map(c => '<span class="' + c[1] + '">' + esc(c[0]) + '</span>').join('');
  // vitals
  const bp = A.blood / 5000 * 100;
  $('#vitals').innerHTML = g.state === 'lobby' ? '' :
    '<div class="v-row"><span class="v-l">BLOOD</span>' + bar(A.blood, 5000, bp > 80 ? '#c03030' : bp > 60 ? '#e07020' : '#ff2020', Math.round(A.blood) + 'mL ' + (A.bleeding > 0.05 ? '▼' + A.bleeding.toFixed(1) + '/s' : '')) + '</div>' +
    '<div class="v-row"><span class="v-l">STAM</span>' + bar(A.stam, A.stamMax, '#50b060', Math.round(A.stam)) + '</div>' +
    '<div class="v-row"><span class="v-l">PAIN</span>' + bar(A.pain, A.threshold * 1.4, A.pain > A.threshold ? '#ff3030' : '#c0a040', Math.round(A.pain) + (A.pain > A.threshold ? ' !!' : '')) + '</div>' +
    '<div class="v-mini"><span>♥ ' + Math.round(A.bpm) + '</span><span>' + A.temp.toFixed(1) + '°C</span><span>🍖' + Math.round(A.hunger) + '</span><span>💧' + Math.round(A.thirst) + '</span>' + (A.rad > 5 ? '<span class="warn">☢' + Math.round(A.rad) + '</span>' : '') + (A.infection > 10 ? '<span class="warn">✚' + Math.round(A.infection) + '</span>' : '') + '</div>';
  // hotbar
  const w = p.equip.weapon, wd = p.weaponDef(); let ammo = ''; if (wd.gun) ammo = (w.jammed ? '<b class="bad">JAM</b> ' : '') + w.mag + '/' + wd.gun.mag + ' <span class="dim">(' + p.inv.count(wd.gun.ammo) + ')</span>';
  const th = g.throwSel(); const band = p.inv.count('bandage') + p.inv.count('cleanrag') + p.inv.count('rag');
  $('#hotbar').innerHTML = '<div class="hb">' + (w ? ic(w.id) : icn('fist')) + '<div><b>' + esc(wd.name) + '</b><small>' + (ammo || 'LMB attack • [1] swap') + '</small></div></div>' +
    '<div class="hb' + (p.light.on ? '' : ' off') + '">' + icn('flashlight') + '<div><b>[F] Light</b><small>' + Math.round(p.light.bat) + '%</small></div></div>' +
    (g.state === 'run' ? '<div class="hb">' + (th ? ic(th) : icn('bottle')) + '<div><b>[G] Throw</b><small>' + (th ? esc(NE.ITEMS[th].name) + ' ×' + p.inv.count(th) : 'none • [Q] cycle') + '</small></div></div>' +
    '<div class="hb">' + icn('bandage') + '<div><b>[B] Bandage</b><small>' + band + ' dressings</small></div></div>' : '') +
    (p.gear.face ? '<div class="hb">' + icn('respirator') + '<div><b>Filter</b><small>' + Math.round(p.filterT) + 's</small></div></div>' : '') +
    '<div class="hb key" onclick="NE.UI.openHex()">' + icn('gear') + '<div><b>[M] Menu</b><small>Tab inv • H health</small></div></div>';
};

// ---------------- hex menu ----------------
const HEX_ITEMS = [
  { id: 'status', name: 'Status', icon: 'ecg' }, { id: 'inventory', name: 'Inventory', icon: 'backpack' }, { id: 'health', name: 'Health', icon: 'body' },
  { id: 'craft', name: 'Crafting', icon: 'hammer' }, { id: 'map', name: 'Map', icon: 'map' }, { id: 'journal', name: 'Journal', icon: 'book' },
  { id: 'skills', name: 'Skills', icon: 'star' }, { id: 'settings', name: 'Settings', icon: 'gear' }, { id: 'quit', name: 'Abandon / Quit', icon: 'door' },
];
UI.buildHex = function () {
  const h = $('#hex'); const w = 92, hh = 104; // pointy-top hex cell
  const pos = [[0, -0.75], [0.5 * 1.0 + 0.5, -0.75 * 0], [0.5, 0.75], [-0.5, 0.75], [-1, 0], [-0.5, -0.75]];
  const ring = [[0.5, -0.75], [1, 0], [0.5, 0.75], [-0.5, 0.75], [-1, 0], [-0.5, -0.75]];
  let html = '<div class="hex-title">MENU</div><div class="hex-wrap">';
  html += '<div class="hx center" data-id="close" style="left:0;top:0"><div class="hx-in">' + '<span class="x">✕</span></div></div>';
  HEX_ITEMS.slice(0, 6).forEach((it, i) => { const p = ring[i]; html += '<div class="hx" data-id="' + it.id + '" style="left:' + p[0] * w + 'px;top:' + p[1] * hh + 'px"><div class="hx-in">' + icn(it.icon, null, 6) + '</div><div class="hx-lab">' + it.name + '</div></div>'; });
  const out = [[-1, 1.5], [0, 1.5], [1, 1.5]];
  HEX_ITEMS.slice(6).forEach((it, i) => { const p = out[i]; html += '<div class="hx small" data-id="' + it.id + '" style="left:' + p[0] * w + 'px;top:' + p[1] * hh + 'px"><div class="hx-in">' + icn(it.icon, null, 5) + '</div><div class="hx-lab">' + it.name + '</div></div>'; });
  html += '</div><div class="hex-tip">M / Esc to close • Tab Inventory • H Health • V Status • K Craft • N Map • J Journal</div>';
  h.innerHTML = html;
  h.querySelectorAll('.hx').forEach(el => { el.onclick = () => { NE.Audio.play('ui'); const id = el.dataset.id; if (id === 'close') return UI.closeHex(); if (id === 'quit') return UI.quitPrompt(); UI.closeHex(); UI.open(id); }; el.onmouseenter = () => NE.Audio.play('click', 0.4); });
  h.onclick = e => { if (e.target === h) UI.closeHex(); };
};
UI.openHex = function () { if (UI.panel) UI.close(); UI.hexOpen = true; $('#hex').classList.remove('hide'); NE.Audio.play('ui'); };
UI.closeHex = function () { UI.hexOpen = false; $('#hex').classList.add('hide'); };
UI.quitPrompt = function () {
  const g = G(); UI.closeHex();
  if (g.state === 'run') UI.dialog('Abandon this run?', 'Your survivor will be left for dead down here. You keep 40% of earned Survival Data.', [{ label: 'Abandon run', fn: () => { g.player.anat.cause = 'Abandoned'; g.endRun(false, 'Abandoned in the dark'); } }, { label: 'Quit to title (abandons run)', fn: () => { g.endRun(false, 'Abandoned in the dark'); setTimeout(() => { UI.closeAll(); g.toTitle(); }, 50); } }, { label: 'Keep going' }]);
  else UI.dialog('Leave the lobby?', 'Return to the title screen.', [{ label: 'Title screen', fn: () => UI.fade(() => g.toTitle()) }, { label: 'Stay' }]);
};

// ---------------- panels ----------------
const TITLES = { status: 'STATUS', inventory: 'INVENTORY', health: 'ANATOMY & TRIAGE', craft: 'CRAFTING', map: 'MAP', journal: 'JOURNAL', skills: 'SKILL WEB', settings: 'SETTINGS', wardrobe: 'GEAR LOCKER & BACKPACK RACK', shop: 'QUARTERMASTER', dossier: 'SURVIVOR DOSSIER', loot: 'LOOT', trade: 'MASKED TRADER', cemetery: 'RUN ARCHIVE — CEMETERY' };
UI.open = function (name, arg) {
  const g = G(); if (UI.hexOpen) UI.closeHex(); if (UI.tree) { UI.tree.destroy(); UI.tree = null; } UI.ecg = null;
  const runOnly = ['status', 'inventory', 'health', 'craft', 'map', 'journal']; if (runOnly.includes(name) && !g.player) return;
  UI.panel = name; UI.arg = arg; UI.sel = null; const P = $('#panel'); P.className = 'pn-' + name; P.classList.remove('hide');
  $('.pn-title').textContent = TITLES[name] || name.toUpperCase(); UI.render[name](P.querySelector('.pn-body'), arg); NE.Audio.play('ui');
};
UI.toggle = function (name) { if (UI.panel === name) UI.close(); else UI.open(name); };
UI.close = function () { if (!UI.panel) return; if (UI.tree) { UI.tree.destroy(); UI.tree = null; } UI.ecg = null; UI.panel = null; $('#panel').classList.add('hide'); NE.Audio.play('uiback'); if (G().state === 'lobby' || G().state === 'title') G().save(); };
UI.closeTop = function () { if (UI.modalOpen()) { if (UI._modalCancel) UI._modalCancel(); return true; } if (UI.panel) { UI.close(); return true; } if (UI.hexOpen) { UI.closeHex(); return true; } return false; };
UI.closeAll = function () { UI.closeModal(); UI.close(); UI.closeHex(); };
UI.refresh = function () { if (UI.panel && ['inventory', 'health', 'loot', 'craft', 'trade', 'wardrobe', 'shop', 'dossier'].includes(UI.panel)) UI.render[UI.panel]($('.pn-body'), UI.arg); };
UI.live = {};
UI.render = {};

// ----- STATUS -----
UI.render.status = function (b) {
  const p = G().player, A = p.anat, s = p.surv, R = G().run; const occ = NE.OCCUPATIONS.find(o => o.id === s.occ);
  const card = (l, v, sub, cls) => '<div class="st-card ' + (cls || '') + '"><small>' + l + '</small><b>' + v + '</b>' + (sub ? '<i>' + sub + '</i>' : '') + '</div>';
  const org = k => { const v = A.org[k]; return '<div class="org"><span>' + k.toUpperCase() + '</span>' + bar(v, 100, v > 70 ? '#40c060' : v > 35 ? '#d0a030' : '#e03030', Math.round(v) + '%') + '</div>'; };
  b.innerHTML = '<div class="crt"><div class="crt-l">' +
    '<div class="ecg-wrap"><canvas id="ecg" width="300" height="70"></canvas><div class="bpm">' + Math.round(A.bpm) + '<small>BPM</small></div></div>' +
    '<div class="st-grid">' + card('BLOOD', Math.round(A.blood) + 'mL', Math.round(A.blood / 50) + '% • ' + (A.bleeding > 0.05 ? '-' + A.bleeding.toFixed(2) + ' mL/s' : 'not bleeding'), A.blood < 3800 ? 'bad' : '') + card('PAIN', Math.round(A.pain), 'threshold ' + Math.round(A.threshold), A.pain > A.threshold ? 'bad' : '') + card('CONSCIOUS', Math.round(Math.max(0, A.cons)) + '%', A.uncon ? 'UNCONSCIOUS' : '', A.cons < 40 ? 'bad' : '') + card('TEMP', A.temp.toFixed(1) + '°C', A.wet > 0.3 ? 'wet' : '', A.temp < 35.5 || A.temp > 38.3 ? 'warn' : '') + card('STAMINA', Math.round(A.stam) + '/' + Math.round(A.stamMax)) + card('HUNGER', Math.round(A.hunger) + '%', '', A.hunger < 25 ? 'warn' : '') + card('THIRST', Math.round(A.thirst) + '%', '', A.thirst < 25 ? 'warn' : '') + card('INFECTION', Math.round(A.infection) + '%', '', A.infection > 30 ? 'warn' : '') + card('RADIATION', Math.round(A.rad), '', A.rad > 25 ? 'warn' : '') + card('TOXINS', Math.round(A.tox), '', A.tox > 30 ? 'warn' : '') + card('STRESS', Math.round(A.stress) + '%', '', A.stress > 60 ? 'warn' : '') + card('CARRY', p.inv.weight().toFixed(1) + '/' + p.inv.carry.toFixed(0) + 'kg', '', p.inv.weight() > p.inv.carry ? 'warn' : '') + '</div>' +
    '<h4>ORGANS</h4><div class="orgs">' + ['brain', 'eyes', 'lungs', 'heart', 'stomach', 'liver'].map(org).join('') + '</div></div>' +
    '<div class="crt-r"><h4>CONDITIONS</h4><div class="conds">' + A.conditions().map(c => '<span class="' + c[1] + '">' + esc(c[0]) + '</span>').join('') + '</div>' +
    '<h4>DOSSIER</h4><div class="dos"><b>' + esc(s.name) + '</b>, ' + s.age + '<br>' + occ.name + ' — <i>' + occ.desc + '</i><br>' + s.traits.map(t => { const T = NE.TRAITS.find(x => x.id === t); return '<span class="' + (T.good ? 'good' : 'bad') + '">' + T.name + '</span> <small>' + T.desc + '</small>'; }).join('<br>') + '</div>' +
    (R ? '<h4>THIS RUN</h4><div class="dos">Depth: ' + Math.round(NE.depthOfY(p.y)) + 'm • Deepest: ' + Math.round(R.maxDepth) + 'm<br>Time: ' + fmtT(R.t) + ' • Kills: ' + R.kills + ' • Survivors helped: ' + R.treated + '</div>' : '') + '</div></div>';
  UI.ecg = { c: $('#ecg').getContext('2d'), x: 0, ph: 0 };
};
UI.live.status = function () { if (!UI._stT || performance.now() - UI._stT > 1000) { UI._stT = performance.now(); const e = UI.ecg; UI.render.status($('.pn-body')); if (e) { UI.ecg.x = e.x; UI.ecg.ph = e.ph; } } };
UI.drawECG = function (dt) {
  const E = UI.ecg, c = E.c, A = G().player.anat; const sp = 90; const bps = A.bpm / 60; const n = Math.ceil(sp * dt);
  for (let i = 0; i < n; i++) {
    E.ph += bps / sp; if (E.ph >= 1) E.ph -= 1; const ph = E.ph; let y = 0;
    if (A.dead) y = 0; else if (ph < 0.08) y = Math.sin(ph / 0.08 * Math.PI) * -4; else if (ph > 0.14 && ph < 0.17) y = 6; else if (ph >= 0.17 && ph < 0.21) y = -28; else if (ph >= 0.21 && ph < 0.24) y = 10; else if (ph > 0.38 && ph < 0.5) y = Math.sin((ph - 0.38) / 0.12 * Math.PI) * -7;
    if (A.org.heart < 35 && !A.dead) y += (Math.random() - 0.5) * 10;
    c.fillStyle = '#041a0a'; c.fillRect(E.x, 0, 4, 70); c.fillStyle = A.blood < 3500 ? '#ff5040' : '#50ff80'; c.fillRect(E.x, 35 + y, 2, 2); if (E.ly != null) { const a = Math.min(E.ly, 35 + y), bb = Math.max(E.ly, 35 + y); c.fillRect(E.x, a, 2, bb - a + 1); } E.ly = 35 + y; E.x = (E.x + 1) % 300;
  }
};

// ----- INVENTORY -----
UI.render.inventory = function (b) {
  const g = G(), p = g.player, inv = p.inv; const wt = inv.weight();
  const eqSlot = (lab, e, slot) => '<div class="eq" data-slot="' + slot + '">' + (e ? ic(e.id) : '<div class="eq-empty"></div>') + '<div><small>' + lab + '</small><b>' + (e ? esc(NE.ITEMS[e.id].name) : '—') + '</b>' + (e && e.dur != null ? '<i>' + Math.round(e.dur) + '% dur</i>' : '') + (e && e.mag != null ? '<i>' + e.mag + ' in mag</i>' : '') + '</div></div>';
  let h = '<div class="inv"><div class="inv-eq"><h4>EQUIPPED</h4>' + eqSlot('WEAPON', p.equip.weapon, 'weapon') + eqSlot('HEAD', p.gear.head, 'head') + eqSlot('BODY', p.gear.body, 'body') + eqSlot('FACE', p.gear.face, 'face') +
    '<div class="eq">' + icn('flashlight') + '<div><small>FLASHLIGHT</small><b>' + Math.round(p.light.bat) + '% battery</b></div></div>' +
    '<h4>BACKPACK</h4><div class="dim">' + esc((NE.BACKPACKS.find(x => x.id === g.meta.equipped.backpack) || NE.BACKPACKS[0]).name) + '</div>' + bar(wt, inv.carry, wt > inv.carry ? '#e04040' : '#c0a040', wt.toFixed(1) + ' / ' + inv.carry.toFixed(1) + ' kg') + (wt > inv.carry ? '<div class="bad">Overencumbered — slow, no sprint.</div>' : '') + '</div>';
  h += '<div class="inv-grid">'; for (let i = 0; i < inv.slots; i++) { const e = inv.items[i]; h += '<div class="slot' + (e && UI.sel === e ? ' sel' : '') + (e && p.equip.weapon === e ? ' eqd' : '') + '" data-i="' + i + '">' + (e ? ic(e.id) + (e.n > 1 || NE.ITEMS[e.id].uses ? '<span class="cnt">' + (NE.ITEMS[e.id].uses ? e.n + 'u' : e.n) + '</span>' : '') : '') + '</div>'; } h += '</div>';
  h += '<div class="inv-det">' + UI.itemDetail(UI.sel) + '</div></div>';
  b.innerHTML = h;
  b.querySelectorAll('.slot').forEach(s => s.onclick = () => { const e = inv.items[+s.dataset.i]; UI.sel = e || null; NE.Audio.play('click'); UI.render.inventory(b); });
  b.querySelectorAll('.eq[data-slot]').forEach(s => s.onclick = () => { const sl = s.dataset.slot; if (sl === 'weapon') { p.equip.weapon = null; } else if (p.gear[sl]) { if (inv.addEntry(p.gear[sl])) { p.gear[sl] = null; } else g.toast('Backpack full.'); } UI.render.inventory(b); });
  b.querySelectorAll('[data-act]').forEach(btn => btn.onclick = () => UI.itemAct(btn.dataset.act, UI.sel));
};
UI.itemDetail = function (e) {
  if (!e) return '<div class="dim">Select an item.<br><br>Tip: weight slows you down. Medical items go on specific body parts — use the Health tab.</div>';
  const it = NE.ITEMS[e.id]; const p = G().player; let h = '<div class="det-h">' + ic(e.id, 6) + '<div><b>' + esc(it.name) + '</b><small>' + it.cat.toUpperCase() + ' • ' + (it.stack ? (it.w * e.n).toFixed(2) : it.w) + 'kg' + (it.uses ? ' • ' + e.n + ' uses' : '') + (e.dur != null ? ' • ' + Math.round(e.dur) + '% durability' : '') + '</small></div></div><p>' + esc(it.desc || '') + '</p>';
  if (it.melee) h += '<p class="dim">Damage ' + it.melee.dmg + ' ' + it.melee.kind + ' • reach ' + it.melee.reach + ' • stamina ' + it.melee.stam + '</p>';
  if (it.gun) h += '<p class="dim">Damage ' + it.gun.dmg + ' • mag ' + it.gun.mag + ' • ' + NE.ITEMS[it.gun.ammo].name + ' • jam ' + Math.round(it.gun.jam * 100) + '%</p>';
  const btn = (a, l) => '<button class="btn" data-act="' + a + '">' + l + '</button>';
  h += '<div class="acts">';
  if (it.cat === 'food') h += btn('use', it.thirst ? 'Drink' : 'Eat');
  if (it.med && it.med !== 'drug') h += btn('treat', 'Treat a body part...');
  if (it.med === 'drug') h += btn('use', 'Take');
  if (e.id === 'battery') h += btn('use', 'Recharge flashlight'); if (e.id === 'filter') h += btn('use', 'Load into respirator');
  if (it.cat === 'weapon') h += p.equip.weapon === e ? btn('unequip', 'Holster') : btn('equip', 'Hold');
  if (it.slot) h += btn('wear', 'Wear');
  if (it.throwable) h += btn('throwsel', 'Set as [G] throwable');
  if (G().state === 'run') h += btn('drop', 'Drop');
  return h + '</div>';
};
UI.itemAct = function (a, e) {
  const g = G(), p = g.player; if (!e) return; const it = NE.ITEMS[e.id];
  if (a === 'use') { NE.consume(p, e); if (!p.inv.items.includes(e)) UI.sel = null; }
  else if (a === 'treat') { UI.pendingItem = e; return UI.open('health'); }
  else if (a === 'equip') { p.equip.weapon = e; g.toast('Holding ' + it.name + '.'); }
  else if (a === 'unequip') p.equip.weapon = null;
  else if (a === 'wear') { const sl = it.slot; p.inv.remove(e); if (p.gear[sl]) p.inv.addEntry(p.gear[sl]); p.gear[sl] = e; if (sl === 'face' && p.filterT <= 0) g.toast('Respirator needs a filter to work.'); UI.sel = null; }
  else if (a === 'throwsel') { g.throwPref = e.id; g.toast('[G] throws ' + it.name + '.'); }
  else if (a === 'drop') { g.dropEntry(e); UI.sel = null; }
  NE.Audio.play('ui'); UI.refresh();
};

// ----- HEALTH (body diagram) -----
const BODY_SHAPES = { head: { x: 80, y: 30, r: 17 }, torso: { x: 58, y: 52, w: 44, h: 72 }, larm: { x1: 56, y1: 58, x2: 26, y2: 128 }, rarm: { x1: 104, y1: 58, x2: 134, y2: 128 }, lleg: { x1: 68, y1: 126, x2: 60, y2: 206 }, rleg: { x1: 92, y1: 126, x2: 100, y2: 206 } };
UI.render.health = function (b) {
  const p = G().player; UI.hpart = UI.hpart || 'torso';
  b.innerHTML = '<div class="hl"><div class="hl-body"><canvas id="bodycv" width="160" height="215"></canvas><div class="hl-vit"></div><div class="dim center">Click a body part. [B] = quick bandage worst bleed.' + (G().nearTable ? '<br><b class="good">Surgical table: faster, less painful.</b>' : '') + '</div></div><div class="hl-info"></div></div>';
  const cv = $('#bodycv'); cv.onmousemove = e => { const r = cv.getBoundingClientRect(); UI.hhover = UI.partAt((e.clientX - r.left) / r.width * 160, (e.clientY - r.top) / r.height * 215); };
  cv.onmouseleave = () => UI.hhover = null;
  cv.onclick = e => { const r = cv.getBoundingClientRect(); const pt = UI.partAt((e.clientX - r.left) / r.width * 160, (e.clientY - r.top) / r.height * 215); if (!pt) return; UI.hpart = pt; NE.Audio.play('click'); if (UI.pendingItem && p.inv.items.includes(UI.pendingItem)) { NE.startTreat(p, UI.pendingItem, pt); UI.pendingItem = null; } UI.healthInfo(); };
  UI.healthInfo(); UI.drawBody();
};
UI.partAt = function (x, y) {
  const S = BODY_SHAPES; if (Math.hypot(x - S.head.x, y - S.head.y) < S.head.r + 2) return 'head';
  if (x > S.torso.x && x < S.torso.x + S.torso.w && y > S.torso.y && y < S.torso.y + S.torso.h) return 'torso';
  for (const k of ['larm', 'rarm', 'lleg', 'rleg']) { const s = S[k]; const dx = s.x2 - s.x1, dy = s.y2 - s.y1; const t = NE.clamp(((x - s.x1) * dx + (y - s.y1) * dy) / (dx * dx + dy * dy), 0, 1); if (Math.hypot(x - (s.x1 + dx * t), y - (s.y1 + dy * t)) < 11) return k; }
  return null;
};
UI.drawBody = function () {
  const cv = $('#bodycv'); if (!cv) return; const c = cv.getContext('2d'); const A = G().player.anat; const S = BODY_SHAPES; const t = performance.now() / 1000;
  c.clearRect(0, 0, 160, 215);
  const fillFor = k => { const P = A.parts[k]; const hp = P.hp / P.max; const bl = A.partBleed(k); const r = Math.round(40 + (1 - hp) * 150 + (bl > 0.05 ? 40 * (0.5 + 0.5 * Math.sin(t * 6)) : 0)); return 'rgb(' + r + ',' + Math.round(20 + hp * 20) + ',' + Math.round(20 + hp * 20) + ')'; };
  const sel = k => UI.hpart === k ? '#ffe080' : UI.hhover === k ? '#ffffff' : '#d8d2c0';
  c.lineCap = 'round';
  for (const k of ['larm', 'rarm', 'lleg', 'rleg']) { const s = S[k]; c.strokeStyle = sel(k); c.lineWidth = 22; c.beginPath(); c.moveTo(s.x1, s.y1); c.lineTo(s.x2, s.y2); c.stroke(); c.strokeStyle = fillFor(k); c.lineWidth = 17; c.stroke(); }
  c.fillStyle = sel('torso'); c.fillRect(S.torso.x - 2.5, S.torso.y - 2.5, S.torso.w + 5, S.torso.h + 5); c.fillStyle = fillFor('torso'); c.fillRect(S.torso.x, S.torso.y, S.torso.w, S.torso.h);
  c.fillStyle = sel('head'); c.beginPath(); c.arc(S.head.x, S.head.y, S.head.r + 2.5, 0, 7); c.fill(); c.fillStyle = fillFor('head'); c.beginPath(); c.arc(S.head.x, S.head.y, S.head.r, 0, 7); c.fill();
  const center = k => k === 'head' ? [S.head.x, S.head.y] : k === 'torso' ? [S.torso.x + S.torso.w / 2, S.torso.y + S.torso.h / 2] : [(S[k].x1 + S[k].x2) / 2, (S[k].y1 + S[k].y2) / 2];
  c.imageSmoothingEnabled = false;
  for (const k of NE.PARTS) {
    const P = A.parts[k]; const [cx, cy] = center(k); let ox = -14;
    const mark = (icon, col) => { c.drawImage(NE.icon(icon, col, 2), cx + ox, cy - 8, 12, 12); ox += 11; };
    if (A.partBleed(k) > 0.05) mark('drop'); if (P.frac) mark('bone' in NE.ICONS ? 'bone' : 'splint'); if (P.bandage) { c.fillStyle = 'rgba(232,226,208,0.85)'; c.fillRect(cx - 8, cy + 6, 16, 3); } if (P.tq) { c.fillStyle = '#111'; c.fillRect(cx - 9, cy - 12, 18, 3); } if (P.splint) mark('splint'); if (P.wounds.some(w => w.bullet)) mark('ammo', '#d0d0d0');
  }
  const v = $('.hl-vit'); if (v) v.innerHTML = '<span>♥ ' + Math.round(A.bpm) + '</span><span class="' + (A.blood < 3800 ? 'bad' : '') + '">🩸 ' + Math.round(A.blood) + 'mL</span><span class="' + (A.pain > A.threshold ? 'bad' : '') + '">⚡ ' + Math.round(A.pain) + '</span><span>🌡 ' + A.temp.toFixed(1) + '</span>';
};
UI.live.health = function () { UI.drawBody(); UI._hiT = (UI._hiT || 0) + 1; if (UI._hiT % 8 === 0) UI.healthInfo(); };
UI.healthInfo = function () {
  const p = G().player, A = p.anat, k = UI.hpart, P = A.parts[k]; const el = $('.hl-info'); if (!el) return;
  let h = '<h3>' + NE.PART_NAMES[k] + ' <small>' + Math.round(P.hp) + '/' + Math.round(P.max) + ' HP</small></h3><div class="wounds">';
  if (!P.wounds.length && !P.frac) h += '<div class="dim">No injuries.</div>';
  for (const w of P.wounds) { const W = NE.WOUNDS[w.t]; const bl = A.woundBleed(P, w, k) * p.stats.bleed; h += '<div class="wd ' + (w.closed ? 'closed' : 'open') + '"><b>' + W.name + '</b> ' + (w.closed ? (w.sutured ? '<span class="good">stitched</span>' : '<span class="dim">closed</span>') : '<span class="bad">' + bl.toFixed(2) + ' mL/s</span>') + (w.bullet ? ' <span class="warn">fragment lodged</span>' : '') + (w.dirty > 0.2 ? ' <span class="warn">dirty</span>' : '') + (w.inf > 30 ? ' <span class="bad">infected</span>' : '') + '</div>'; }
  if (P.frac) h += '<div class="wd open"><b>Fracture</b> ' + (P.splint ? '<span class="good">splinted — healing</span>' : '<span class="bad">unsplinted</span>') + '</div>';
  if (P.bandage) h += '<div class="wd"><b>Dressing</b> ' + Math.round(P.bandage.q * 100) + '% quality, ' + Math.round(P.bandage.soak * 100) + '% soaked' + (P.bandage.dirty ? ' <span class="warn">dirty rag</span>' : '') + '</div>';
  if (P.tq) h += '<div class="wd open"><b>Tourniquet</b> on for ' + Math.round(P.tqT) + 's ' + (P.tqT > 150 ? '<span class="bad">— limb is dying!</span>' : '') + ' <button class="btn sm" data-rm="1">Remove</button></div>';
  h += '</div><h4>TREAT ' + NE.PART_NAMES[k].toUpperCase() + '</h4><div class="treats">';
  const meds = []; const seen = new Set(); for (const e of p.inv.items) { const it = NE.ITEMS[e.id]; if (it.cat !== 'med' || it.med === 'drug' || seen.has(e.id)) continue; seen.add(e.id); meds.push(e); }
  if (!meds.length) h += '<div class="dim">No medical supplies. Craft rags from clothes, search cabinets & duffels.</div>';
  meds.forEach((e, i) => { const ok = NE.canTreat(p, e.id, k); const it = NE.ITEMS[e.id]; h += '<button class="tr' + (ok === true ? '' : ' no') + (UI.pendingItem && UI.pendingItem.id === e.id ? ' pend' : '') + '" data-m="' + i + '" title="' + esc(ok === true ? it.desc : ok) + '">' + ic(e.id) + '<span>' + esc(it.name) + '<small>' + (ok === true ? (it.uses ? e.n + ' uses' : '×' + p.inv.count(e.id)) + ' • ' + NE.treatDuration(p, e).toFixed(1) + 's' : esc(ok)) + '</small></span></button>'; });
  h += '</div><h4>MEDICATION</h4><div class="treats">';
  const drugs = []; const s2 = new Set(); for (const e of p.inv.items) { const it = NE.ITEMS[e.id]; if (it.med === 'drug' && !s2.has(e.id)) { s2.add(e.id); drugs.push(e); } }
  if (!drugs.length) h += '<div class="dim">None.</div>';
  drugs.forEach((e, i) => { const it = NE.ITEMS[e.id]; h += '<button class="tr" data-d="' + i + '" title="' + esc(it.desc) + '">' + ic(e.id) + '<span>' + esc(it.name) + '<small>' + esc(it.desc) + '</small></span></button>'; });
  h += '</div>'; el.innerHTML = h;
  el.querySelectorAll('[data-m]').forEach(bn => bn.onclick = () => { NE.startTreat(p, meds[+bn.dataset.m], k); UI.pendingItem = null; setTimeout(UI.healthInfo, 50); });
  el.querySelectorAll('[data-d]').forEach(bn => bn.onclick = () => { NE.startTreat(p, drugs[+bn.dataset.d], 'torso'); });
  const rm = el.querySelector('[data-rm]'); if (rm) rm.onclick = () => NE.startTreat(p, null, k, 'removeTq');
};

// ----- CRAFT -----
UI.render.craft = function (b) {
  const g = G(), p = g.player, inv = p.inv; const mech = p.stats.craft > 0;
  const need = r => r.need.map(([id, n]) => [id, id === 'scrap' && mech ? Math.max(1, n - 1) : n]);
  let h = '<div class="craft-head">Stations nearby: ' + (g.station('workbench') ? '<b class="good">Workbench</b> ' : '<span class="dim">no workbench</span> ') + (g.station('fire') ? '<b class="good">Fire</b>' : '<span class="dim">no fire</span>') + '</div><div class="recipes">';
  for (const r of NE.RECIPES) {
    const nd = need(r); let can = nd.every(([id, n]) => inv.count(id) >= n); let why = '';
    if (r.station && !g.station(r.station)) { can = false; why = 'Needs ' + (r.station === 'fire' ? 'a fire' : 'a workbench'); }
    if (r.special === 'tear' && (p.surv.tears || 0) >= 4) { can = false; why = 'Nothing left to tear.'; }
    h += '<div class="rc' + (can ? '' : ' no') + '"><div class="rc-out">' + ic(r.out[0], 5) + '<b>' + esc(r.name) + '</b><small>→ ' + NE.ITEMS[r.out[0]].name + ' ×' + r.out[1] + '</small></div><div class="rc-in">' + (nd.length ? nd.map(([id, n]) => '<span class="' + (inv.count(id) >= n ? 'good' : 'bad') + '">' + ic(id, 3) + inv.count(id) + '/' + n + '</span>').join('') : '<span class="dim">' + esc(r.desc || '') + '</span>') + (why ? '<span class="warn">' + why + '</span>' : '') + '</div><button class="btn" data-r="' + r.id + '"' + (can ? '' : ' disabled') + '>Craft</button></div>';
  }
  b.innerHTML = h + '</div>';
  b.querySelectorAll('[data-r]').forEach(bn => bn.onclick = () => {
    const r = NE.RECIPES.find(x => x.id === bn.dataset.r); for (const [id, n] of need(r)) inv.consume(id, n);
    if (r.special === 'tear') { p.surv.tears = (p.surv.tears || 0) + 1; }
    const left = inv.add(r.out[0], r.out[1]); if (left) { g.dropEntry({ id: r.out[0], n: left }); g.toast('Backpack full — dropped it.'); }
    NE.Audio.play('rummage'); g.toast('Crafted ' + NE.ITEMS[r.out[0]].name + '.'); UI.render.craft(b);
  });
};

// ----- MAP -----
UI.render.map = function (b) { b.innerHTML = '<div class="map-wrap"><canvas id="mapcv"></canvas></div><div class="map-leg"><span><i style="background:#ffe080"></i>You</span><span><i style="background:#60ff80"></i>Extraction</span><span><i style="background:#ff5050"></i>Medic / Beacon</span><span><i style="background:#c890ff"></i>Trader</span><span><i style="background:#e0c050"></i>Ladder</span></div>'; UI.drawMap(); };
UI.live.map = function () { UI._mT = (UI._mT || 0) + 1; if (UI._mT % 5 === 0) UI.drawMap(); };
UI.drawMap = function () {
  const cv = $('#mapcv'); if (!cv) return; const g = G(), W = g.world, p = g.player; if (W.lobby) { cv.width = 200; cv.height = 40; const c = cv.getContext('2d'); c.fillStyle = '#ccc'; c.font = '10px monospace'; c.fillText('Staging lobby — no map.', 10, 24); return; }
  const S = 3, FH = NE.FH; const fi = g.floorIdx(p.y - 2); const f0 = Math.max(0, fi - 3), f1 = Math.min(W.floors.length - 1, fi + 4);
  cv.width = W.W * S + 60; cv.height = (f1 - f0 + 1) * FH * S; const c = cv.getContext('2d'); c.fillStyle = '#050505'; c.fillRect(0, 0, cv.width, cv.height);
  for (let f = f0; f <= f1; f++) {
    const fl = W.floors[f]; const pal = fl.biome.pal; const oy = (f - f0) * FH * S;
    for (let r = 0; r < FH; r++) for (let x = 0; x < W.W; x++) { if (!fl.seen[r * W.W + x]) continue; const t = W.get(x, fl.y0 + r); c.fillStyle = t === 0 || t === 4 ? NE.shade(pal.back, 1.3) : t === 5 ? '#2a5060' : t === 3 ? '#e0c050' : t === 2 ? pal.plat : pal.tile; c.fillRect(60 + x * S, oy + r * S, S, S); }
    c.fillStyle = '#8a857a'; c.font = '9px monospace'; c.fillText(Math.round(fl.depth) + 'm', 2, oy + 12); c.fillStyle = NE.shade(pal.lamp, 0.8); c.fillRect(0, oy, 2, FH * S);
    for (const o of fl.objs) { const seenO = fl.seen[Math.max(0, Math.floor(o.y / NE.T) - fl.y0 - 1) * W.W + Math.floor(o.x / NE.T)]; if (!seenO && !(o.type === 'beacon')) continue; let col = null; if (o.type === 'elevator') col = '#60ff80'; else if (o.type === 'table' || o.type === 'beacon' || (o.ct === 'cabinet')) col = '#ff5050'; else if (o.type === 'fire') col = '#ffa040'; if (col) { c.fillStyle = col; c.fillRect(60 + o.x / NE.T * S - 2, oy + (o.y / NE.T - fl.y0) * S - 5, 5, 5); } }
  }
  for (const a of g.actors) if (a.isNPC && a.kind === 'trader' && a.alive) { const fl = W.floors[g.floorIdx(a.y - 2)]; if (fl && fl.f >= f0 && fl.f <= f1 && fl.seen[Math.floor(a.y / NE.T - 1 - fl.y0) * W.W + Math.floor(a.x / NE.T)]) { c.fillStyle = '#c890ff'; c.fillRect(60 + a.x / NE.T * S - 2, ((a.y / NE.T) - f0 * FH) * S - 6, 4, 5); } }
  if ((performance.now() / 300 | 0) % 2) { c.fillStyle = '#ffe080'; c.fillRect(60 + p.x / NE.T * S - 2, (p.y / NE.T - f0 * FH) * S - 6, 4, 6); }
};

// ----- JOURNAL -----
UI.render.journal = function (b) {
  const R = G().run; if (!R) { b.innerHTML = '<div class="dim">The journal fills during a run.</div>'; return; }
  b.innerHTML = '<div class="journal">' + R.log.slice().reverse().map(e => '<div class="jl ' + (e.cls || '') + '"><small>' + fmtT(e.t) + '</small> ' + esc(e.m) + '</div>').join('') + '</div>';
};

// ----- SKILLS -----
UI.render.skills = function (b) {
  const g = G(); const ro = g.state === 'run'; b.innerHTML = '<div class="st-host"></div>' + (ro ? '<div class="dim center">View only during a run — spend points at the lobby Skill Terminal.</div>' : '<div class="st-foot"><button class="btn" id="respec">Respec all (20 scrap)</button></div>');
  UI.tree = new NE.SkillTree(b.querySelector('.st-host'), g.meta, { readOnly: ro, onChange: () => g.save() });
  const rs = $('#respec'); if (rs) rs.onclick = () => { const M = g.meta; if (M.scrap < 20) return UI.toast('Need 20 scrap.'); let n = 0; for (const k in M.perks) n += M.perks[k]; if (!n) return; M.scrap -= 20; M.points += n; M.perks = {}; g.save(); UI.toast('Refunded ' + n + ' points.'); UI.open('skills'); };
};

// ----- SETTINGS -----
UI.render.settings = function (b) {
  const M = G().meta, S = M.settings;
  const sl = (k, l, min, max, st) => '<label class="set"><span>' + l + '</span><input type="range" min="' + min + '" max="' + max + '" step="' + st + '" value="' + S[k] + '" data-k="' + k + '"><b>' + Math.round(S[k] * 100) + '%</b></label>';
  b.innerHTML = '<div class="settings"><div><h4>AUDIO</h4>' + sl('master', 'Master', 0, 1, 0.05) + sl('sfx', 'SFX', 0, 1, 0.05) + sl('amb', 'Ambient drone', 0, 1, 0.05) +
    '<h4>VISUALS</h4>' + sl('shake', 'Screen shake', 0, 1.5, 0.05) + '<label class="set"><span>Gore / trauma intensity</span><select data-k="gore"><option value="0">Low</option><option value="1">Normal</option><option value="2">High</option></select></label>' +
    '<label class="set"><span>Tips</span><input type="checkbox" data-k="tips"' + (S.tips ? ' checked' : '') + '></label>' +
    '<h4>SAVE DATA</h4><div class="acts"><button class="btn" id="exp">Export save</button><button class="btn" id="imp">Import save</button><button class="btn danger" id="rst">Reset all progress</button></div><input type="file" id="impf" accept=".json" class="hide"></div>' +
    '<div><h4>KEYBINDS</h4><table class="keys">' + [['A / D', 'Move'], ['W / S', 'Climb ladders'], ['Space', 'Jump (S+Space: drop through)'], ['Shift', 'Sprint'], ['Ctrl / C / S', 'Crouch / crawl'], ['LMB', 'Attack / shoot (aim at a limb!)'], ['RMB (hold)', 'Grab & drag physics objects'], ['E', 'Interact / search'], ['F', 'Flashlight'], ['R', 'Reload / clear jam'], ['G / Q', 'Throw / cycle throwable'], ['B', 'Quick-bandage worst bleed'], ['1', 'Cycle weapon'], ['M / Esc', 'Hex menu'], ['Tab / I', 'Inventory'], ['H', 'Health & triage'], ['V', 'Status'], ['K', 'Crafting'], ['N', 'Map'], ['J', 'Journal']].map(r => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>').join('') + '</table></div></div>';
  b.querySelector('select').value = S.gore;
  b.querySelectorAll('[data-k]').forEach(el => el.oninput = el.onchange = () => { const k = el.dataset.k; S[k] = el.type === 'checkbox' ? el.checked : +el.value; if (el.nextElementSibling && el.type === 'range') el.nextElementSibling.textContent = Math.round(S[k] * 100) + '%'; NE.Audio.applySettings(); G().save(); });
  $('#exp').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(M, null, 1)], { type: 'application/json' })); a.download = 'nectars-end-save.json'; a.click(); };
  $('#imp').onclick = () => $('#impf').click(); $('#impf').onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { try { const d = JSON.parse(t); localStorage.setItem(NE.Save.KEY, JSON.stringify(d)); location.reload(); } catch (er) { UI.toast('Bad save file.'); } }); };
  $('#rst').onclick = () => UI.dialog('Reset ALL progress?', 'Skill points, perks, unlocks, scrap and the cemetery will be erased.', [{ label: 'Erase everything', fn: () => { localStorage.removeItem(NE.Save.KEY); location.reload(); } }, { label: 'Cancel' }]);
};

// ----- LOOT -----
UI.render.loot = function (b, o) {
  const g = G(), p = g.player; const items = o.items || [];
  let h = '<div class="loot"><div><h4>' + esc(o.label || 'Container') + '</h4><div class="lst">';
  if (!items.length) h += '<div class="dim">Empty.</div>';
  items.forEach((e, i) => { const it = NE.ITEMS[e.id]; h += '<div class="li" data-t="' + i + '">' + ic(e.id) + '<span>' + esc(it.name) + (e.n > 1 || it.uses ? ' <small>' + (it.uses ? e.n + ' uses' : '×' + e.n) + '</small>' : '') + (e.dur != null ? ' <small>' + Math.round(e.dur) + '%</small>' : '') + '</span><b>TAKE</b></div>'; });
  h += '</div>' + (items.length ? '<button class="btn" id="takeall">Take all</button>' : '') + '</div><div><h4>YOUR PACK ' + p.inv.items.length + '/' + p.inv.slots + ' • ' + p.inv.weight().toFixed(1) + '/' + p.inv.carry.toFixed(0) + 'kg</h4><div class="lst">';
  p.inv.items.forEach((e, i) => { const it = NE.ITEMS[e.id]; h += '<div class="li mine" data-s="' + i + '">' + ic(e.id) + '<span>' + esc(it.name) + (e.n > 1 ? ' <small>×' + e.n + '</small>' : '') + '</span><b>STASH</b></div>'; });
  b.innerHTML = h + '</div></div></div>';
  const take = i => { const e = items[i]; if (!p.inv.addEntry(e)) { const it = NE.ITEMS[e.id]; if (it.stack) { const left = p.inv.add(e.id, e.n); if (left === e.n) { g.toast('Backpack full.'); NE.Audio.play('deny'); return false; } e.n = left; if (left) return false; } else { g.toast('Backpack full.'); NE.Audio.play('deny'); return false; } } items.splice(i, 1); return true; };
  b.querySelectorAll('[data-t]').forEach(el => el.onclick = () => { if (take(+el.dataset.t)) NE.Audio.play('rummage'); UI.render.loot(b, o); });
  b.querySelectorAll('[data-s]').forEach(el => el.onclick = () => { const e = p.inv.items[+el.dataset.s]; if (p.equip.weapon === e) p.equip.weapon = null; p.inv.remove(e); items.push(e); UI.render.loot(b, o); });
  const ta = $('#takeall'); if (ta) ta.onclick = () => { for (let i = items.length - 1; i >= 0; i--) take(i); NE.Audio.play('rummage'); UI.render.loot(b, o); };
};

// ----- TRADE -----
UI.render.trade = function (b, npc) {
  const g = G(), p = g.player; const val = g.tradeValue(p.inv); const mul = p.stats.barter;
  let h = '<div class="trade"><p class="dim">The masked figure taps a ledger. "Scrap, trinkets, tape, rounds. No credit."</p><p>Your trade goods are worth <b class="good">' + val + '</b>.</p><div class="lst">';
  (npc.stock || []).forEach((s, i) => { const it = NE.ITEMS[s.id]; const pr = Math.ceil(s.price * mul); h += '<div class="li"' + (val >= pr ? ' data-b="' + i + '"' : '') + '>' + ic(s.id) + '<span>' + esc(it.name) + (s.n > 1 ? ' ×' + s.n : '') + '<small>' + esc(it.desc || '') + '</small></span><b class="' + (val >= pr ? 'good' : 'bad') + '">' + pr + '</b></div>'; });
  if (!npc.stock || !npc.stock.length) h += '<div class="dim">"Sold out. Keep moving."</div>';
  b.innerHTML = h + '</div></div>';
  b.querySelectorAll('[data-b]').forEach(el => el.onclick = () => { const s = npc.stock[+el.dataset.b]; const pr = Math.ceil(s.price * mul); if (g.tradeValue(p.inv) < pr) return; g.payValue(p.inv, pr); const left = p.inv.add(s.id, s.n); if (left) g.dropEntry({ id: s.id, n: left }); npc.stock.splice(+el.dataset.b, 1); NE.Audio.play('buy'); g.toast('Bought ' + NE.ITEMS[s.id].name + '.'); UI.render.trade(b, npc); });
};

// ----- LOBBY: WARDROBE / SHOP / DOSSIER -----
UI.previewHuman = function (canvas, surv, bpId, ofId) {
  const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false; c.clearRect(0, 0, canvas.width, canvas.height);
  const sc = 6; const off = document.createElement('canvas'); off.width = 24; off.height = 22; const ox = off.getContext('2d');
  const fake = { x: 12, y: 20, facing: 1, vx: 0, onGround: true, walkPh: 0 }; const pts = NE.ragPose(fake).map(q => ({ x: q[0], y: q[1] }));
  const of = NE.OUTFITS.find(o => o.id === ofId) || NE.OUTFITS[0]; const bp = NE.BACKPACKS.find(o => o.id === bpId) || NE.BACKPACKS[0];
  NE.drawHuman(ox, { pts }, surv.look, { facing: 1, pack: bp.col, shirt: of.random ? surv.look.shirt : of.shirt, pants: of.random ? surv.look.pants : of.pants });
  c.drawImage(off, 0, 0, 24 * sc, 22 * sc);
};
UI.render.wardrobe = function (b) {
  const g = G(), M = g.meta; const surv = M.survivor;
  const row = (kind, list, eqKey) => list.map(o => { const un = M.unlocked[kind].includes(o.id); const eq = M.equipped[eqKey] === o.id; return '<div class="wr' + (eq ? ' eq' : '') + (un ? '' : ' locked') + '" data-k="' + kind + '" data-id="' + o.id + '">' + (kind === 'backpacks' ? '<i class="sw" style="background:linear-gradient(90deg,' + o.col[0] + ' 60%,' + o.col[1] + ' 60%)"></i>' : '<i class="sw" style="background:' + (o.random ? 'repeating-linear-gradient(45deg,#6a4a3a,#6a4a3a 4px,#4a5a6a 4px,#4a5a6a 8px)' : o.shirt) + '"></i>') + '<span><b>' + esc(o.name) + '</b><small>' + (kind === 'backpacks' ? o.slots + ' slots • ' + o.carry + 'kg • ' : '') + esc(o.desc || '') + '</small>' + (un ? '' : '<small class="warn">🔒 ' + esc(o.unlock ? o.unlock.text : '') + (o.price ? ' — or buy at Quartermaster (' + o.price + ')' : '') + '</small>') + '</span>' + (eq ? '<b class="good">WORN</b>' : un ? '<b>EQUIP</b>' : '') + '</div>'; }).join('');
  b.innerHTML = '<div class="ward"><div class="ward-prev"><canvas id="prevcv" width="144" height="132"></canvas><div class="dim center">' + esc(surv.name) + '</div></div><div class="ward-l"><h4>BACKPACKS</h4>' + row('backpacks', NE.BACKPACKS, 'backpack') + '<h4>OUTFITS</h4>' + row('outfits', NE.OUTFITS, 'outfit') + '</div></div>';
  UI.previewHuman($('#prevcv'), surv, M.equipped.backpack, M.equipped.outfit);
  b.querySelectorAll('.wr').forEach(el => el.onclick = () => { const k = el.dataset.k, id = el.dataset.id; if (!M.unlocked[k].includes(id)) { NE.Audio.play('deny'); return; } M.equipped[k === 'backpacks' ? 'backpack' : 'outfit'] = id; g.save(); NE.Audio.play('buy'); g.player.packCol = (NE.BACKPACKS.find(x => x.id === M.equipped.backpack)).col; const of = NE.OUTFITS.find(x => x.id === M.equipped.outfit); g.player.shirt = of.random ? surv.look.shirt : of.shirt; g.player.pants = of.random ? surv.look.pants : of.pants; UI.render.wardrobe(b); });
};
UI.render.shop = function (b) {
  const g = G(), M = g.meta;
  let h = '<div class="shop"><div class="shop-h">' + icn('coin', null, 3) + ' <b>' + M.scrap + '</b> scrap <span class="dim">— bring scrap, trinkets & tape back alive to earn more.</span></div><div class="shop-c"><div><h4>SKINS</h4>';
  const skins = [...NE.BACKPACKS.map(o => ['backpacks', o]), ...NE.OUTFITS.map(o => ['outfits', o])].filter(([k, o]) => o.price && !M.unlocked[k].includes(o.id));
  if (!skins.length) h += '<div class="dim">You own everything for sale.</div>';
  skins.forEach(([k, o]) => { h += '<div class="li' + (M.scrap >= o.price ? '' : ' no') + '" data-sk="' + k + '|' + o.id + '"><i class="sw" style="background:' + (k === 'backpacks' ? o.col[0] : o.shirt) + '"></i><span>' + esc(o.name) + '<small>' + (k === 'backpacks' ? 'Backpack • ' + o.slots + ' slots, ' + o.carry + 'kg' : 'Outfit • ' + esc(o.desc || '')) + '</small></span><b>' + o.price + '</b></div>'; });
  h += '</div><div><h4>STARTER SUPPLIES <small>(next run, ' + M.starter.length + '/4)</small></h4>';
  NE.SHOP_ITEMS.forEach(([id, pr]) => { h += '<div class="li' + (M.scrap >= pr && M.starter.length < 4 ? '' : ' no') + '" data-it="' + id + '|' + pr + '">' + ic(id) + '<span>' + esc(NE.ITEMS[id].name) + '<small>' + esc(NE.ITEMS[id].desc || '') + '</small></span><b>' + pr + '</b></div>'; });
  if (M.starter.length) h += '<div class="dim">Packed: ' + M.starter.map(i => NE.ITEMS[i].name).join(', ') + '</div>';
  b.innerHTML = h + '</div></div></div>';
  b.querySelectorAll('[data-sk]').forEach(el => el.onclick = () => { const [k, id] = el.dataset.sk.split('|'); const o = (k === 'backpacks' ? NE.BACKPACKS : NE.OUTFITS).find(x => x.id === id); if (M.scrap < o.price) return NE.Audio.play('deny'); M.scrap -= o.price; M.unlocked[k].push(id); g.save(); NE.Audio.play('buy'); UI.toast('Unlocked ' + o.name + '. Equip it at the Gear Locker.'); UI.render.shop(b); });
  b.querySelectorAll('[data-it]').forEach(el => el.onclick = () => { const [id, pr] = el.dataset.it.split('|'); if (M.scrap < +pr || M.starter.length >= 4) return NE.Audio.play('deny'); M.scrap -= +pr; M.starter.push(id); g.save(); NE.Audio.play('buy'); UI.render.shop(b); });
};
UI.render.dossier = function (b) {
  const g = G(), M = g.meta, s = M.survivor; const occ = NE.OCCUPATIONS.find(o => o.id === s.occ);
  b.innerHTML = '<div class="dossier"><div class="dos-card"><canvas id="doscv"></canvas><div class="p-name">' + esc(s.name) + '</div><div class="dim">' + occ.name + ', age ' + s.age + '</div></div><div><h4>OCCUPATION</h4><p><b>' + occ.name + '</b> — ' + occ.desc + '<br><small class="dim">Starts with: ' + occ.kit.map(i => NE.ITEMS[i].name).join(', ') + '</small></p><h4>TRAITS</h4>' + s.traits.map(t => { const T = NE.TRAITS.find(x => x.id === t); return '<p><b class="' + (T.good ? 'good' : 'bad') + '">' + T.name + '</b> — ' + T.desc + '</p>'; }).join('') +
    '<h4>APPEARANCE</h4><p class="dim">Build: ' + s.look.build + ' • Hair: ' + s.look.hair + (s.look.facial !== 'none' ? ' • ' + s.look.facial : '') + (s.look.scar ? ' • scarred' : '') + (s.look.glasses ? ' • glasses' : '') + '</p>' +
    '<p class="dim">Every descent is a new, random person. When they die, they go to the cemetery.</p><button class="btn" id="reroll">' + (M.rerolled ? 'Request a different survivor (10 scrap)' : 'Request a different survivor (free once)') + '</button></div></div>';
  const pc = new NE.Portrait($('#doscv'), s); pc.draw({ life: 1, expr: 'neutral', bleeding: 0, headWounds: 0 });
  $('#reroll').onclick = () => { if (M.rerolled) { if (M.scrap < 10) return NE.Audio.play('deny'); M.scrap -= 10; } M.rerolled = true; M.survivor = NE.makeSurvivor(); g.save(); UI.closeAll(); g.toLobby(); UI.open('dossier'); };
};
UI.render.cemetery = function (b) {
  const M = G().meta; if (!M.cemetery.length) { b.innerHTML = '<div class="dim center">No graves yet. Go and make some.</div>'; return; }
  b.innerHTML = '<div class="cem"><div class="cem-best">Deepest: <b>' + Math.round(M.best.depth) + 'm</b> • Longest: <b>' + fmtT(M.best.time) + '</b> • Runs: <b>' + M.runs + '</b></div>' + M.cemetery.map((c, i) => '<div class="grave ' + (c.extracted ? 'ok' : '') + '"><canvas data-g="' + i + '"></canvas><div><b>' + esc(c.name) + '</b> <small>' + esc(c.occ) + ', ' + c.age + '</small><br><span class="' + (c.extracted ? 'good' : 'bad') + '">' + esc(c.cause) + '</span> at <b>' + c.depth + 'm</b> <small class="dim">• ' + fmtT(c.time) + ' • ' + c.kills + ' kills • ' + c.date + '</small></div></div>').join('') + '</div>';
  b.querySelectorAll('canvas[data-g]').forEach(cv => { const c = M.cemetery[+cv.dataset.g]; if (!c.look) return; const pr = new NE.Portrait(cv, { look: c.look, age: c.age }); pr.draw({ life: c.extracted ? 1 : 0.55, expr: c.extracted ? 'neutral' : 'dead', bleeding: 0, headWounds: 0 }); });
};

// ---------------- modal dialogs ----------------
UI.modalOpen = () => !$('#modal').classList.contains('hide');
UI.closeModal = function () { $('#modal').classList.add('hide'); $('#modal').innerHTML = ''; UI._modalCancel = null; };
UI.dialog = function (title, text, choices, opts) {
  const m = $('#modal'); m.innerHTML = '<div class="dlg ' + ((opts && opts.cls) || '') + '"><h3>' + esc(title) + '</h3><p>' + text + '</p><div class="dlg-c">' + choices.map((c, i) => '<button class="btn' + (c.disabled ? ' no' : '') + '" data-c="' + i + '"' + (c.disabled ? ' disabled' : '') + '>' + esc(c.label) + (c.hint ? '<small>' + esc(c.hint) + '</small>' : '') + '</button>').join('') + '</div></div>';
  m.classList.remove('hide'); NE.Audio.play('ui');
  const last = choices[choices.length - 1]; UI._modalCancel = () => { UI.closeModal(); if (last && !last.fn) return; };
  m.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { const c = choices[+b.dataset.c]; UI.closeModal(); if (c.fn) c.fn(); });
};
UI.confirm = (t, x, ok, fn) => UI.dialog(t, esc(x), [{ label: ok, fn }, { label: 'Not yet' }]);
UI.survivor = function (npc) {
  const g = G(), p = g.player; const band = ['bandage', 'cleanrag', 'rag'].find(i => p.inv.has(i));
  if (npc.treated) return g.toast('"Thank you... I won\'t forget it."');
  UI.dialog('A wounded survivor', '<i>' + esc(npc.name) + ' is slumped against the wall, pressing a soaked hand to the wound. "Please... I\'m bleeding out. Do you have anything?"</i>', [
    { label: 'Treat them', hint: band ? 'Uses one ' + NE.ITEMS[band].name : 'You have nothing to bandage with', disabled: !band, fn: () => { p.inv.consume(band); npc.treated = true; for (const pt of NE.PARTS) npc.anat.parts[pt].wounds.forEach(w => { w.closed = true; w.bleed = 0; }); g.run.treated++; p.anat.stress = Math.max(0, p.anat.stress - 15); const rw = NE.wpick([['intel', 2], ['item', 3], ['keycard', 1]]); if (rw === 'intel') { const fi = g.floorIdx(p.y); g.world.ensure(fi + 3, f => g.spawnFloor(f)); for (let f = fi + 1; f <= fi + 2; f++) g.world.floors[f].seen.fill(1); g.log('"' + 'The next two levels — I mapped them. Take it."' + ' (Map revealed)', 'good'); } else if (rw === 'keycard') { p.inv.add('keycard') ? g.dropEntry({ id: 'keycard', n: 1 }) : 0; g.log('"Here — a keycard. Opens the armories."', 'good'); } else { const id = pick2(['morphine', 'bloodbag', 'antibiotics', 'ammo9', 'suture', 'datashard']); const left = p.inv.add(id, id === 'ammo9' ? 8 : 1); if (left) g.dropEntry({ id, n: left }); g.log('They press something into your hand: ' + NE.ITEMS[id].name + '.', 'good'); } npc.leaving = npc.x > p.x ? 1 : -1; npc.leaveT = 8; } },
    { label: 'Rob them', hint: 'Quick loot. Heavy on the conscience.', fn: () => { for (const id of ['water', 'trinket', 'painkillers']) if (Math.random() < 0.7) { const l = p.inv.add(id, 1); if (l) g.dropEntry({ id, n: 1 }); } p.anat.stress = Math.min(100, p.anat.stress + 35); g.log('You took everything. They didn\'t fight back.', 'bad'); g.say('...I had to.'); npc.treated = true; } },
    { label: 'Leave them' },
  ]);
};
function pick2(a) { return a[Math.floor(Math.random() * a.length)]; }
UI.standoff = function (o) {
  const g = G(), p = g.player; const psy = g.meta.perks.psychology || 0; const chanceTalk = Math.min(0.9, 0.3 + psy * 0.15 + (p.stats.stress < 1 ? 0.1 : 0));
  UI.dialog('Standoff', '<i>Two figures step out of the dark, weapons up. "That\'s far enough. Drop your meds and walk away, and nobody bleeds."</i>', [
    { label: 'Hand over your meds', hint: 'They take every medical item.', fn: () => { const meds = p.inv.items.filter(e => NE.ITEMS[e.id].cat === 'med'); meds.forEach(e => p.inv.remove(e)); g.log('You hand over ' + meds.length + ' medical items. They let you pass.', 'bad'); o.grp.forEach(e => { e.faction = 'neutral'; e.hostile = false; e.leaving = true; }); } },
    { label: 'Talk them down', hint: Math.round(chanceTalk * 100) + '% (Psychology)', fn: () => { if (Math.random() < chanceTalk) { g.log('"...Fine. Go. Don\'t come back this way."', 'good'); o.grp.forEach(e => { e.faction = 'neutral'; e.hostile = false; }); } else { g.log('"Wrong answer."', 'bad'); o.grp.forEach(e => { e.hostile = true; e.guard = false; e.onAggro(p); }); } } },
    { label: 'Fight', hint: 'You get the first move.', fn: () => { o.grp.forEach(e => { e.hostile = true; e.guard = false; e.cd = 1.2; e.onAggro(p); }); } },
  ]);
};
UI.runEnd = function (d) {
  UI.closeAll(); $('#hud').classList.add('hide');
  const m = $('#modal'); m.innerHTML = '<div class="dlg end ' + (d.extracted ? 'ok' : 'dead') + '"><h2>' + (d.extracted ? 'EXTRACTED' : 'DECEASED') + '</h2><canvas id="endcv"></canvas><h3>' + esc(d.name) + '</h3><p class="' + (d.extracted ? 'good' : 'bad') + '">' + esc(d.extracted ? 'Made it out alive.' : d.cause) + '</p>' +
    '<div class="end-g"><span>Max depth<b>' + d.depth + 'm</b></span><span>Time<b>' + fmtT(d.time) + '</b></span><span>Kills<b>' + d.kills + '</b></span><span>Survivors helped<b>' + d.treated + '</b></span><span>Survival Data<b>+' + d.xp + ' XP</b></span><span>Scrap<b>+' + d.scrap + '</b></span></div>' +
    (d.levels ? '<p class="good">Level up! +' + d.levels + ' skill point' + (d.levels > 1 ? 's' : '') + '.</p>' : '') + (d.unlocks.length ? '<p class="good">Unlocked: ' + d.unlocks.map(esc).join(', ') + '</p>' : '') + (!d.extracted ? '<p class="dim">They were added to the cemetery. A new survivor waits topside.</p>' : '') +
    '<div class="dlg-c"><button class="btn" id="e-lobby">Return to Lobby</button><button class="btn" id="e-title">Title Screen</button></div></div>';
  m.classList.remove('hide');
  const s = G().meta.cemetery[0]; if (s) { const pr = new NE.Portrait($('#endcv'), { look: s.look, age: s.age }); let life = 1; const anim = () => { if (!$('#endcv')) return; life = d.extracted ? 1 : Math.max(0.35, life - 0.01); pr.draw({ life, expr: d.extracted ? 'neutral' : 'dead', bleeding: d.extracted ? 0 : 2, headWounds: 0 }); if (!d.extracted && life > 0.36) requestAnimationFrame(anim); }; anim(); }
  UI._modalCancel = () => { };
  $('#e-lobby').onclick = () => { UI.closeModal(); UI.fade(() => G().toLobby()); };
  $('#e-title').onclick = () => { UI.closeModal(); UI.fade(() => G().toTitle()); };
};
})(window.NE);
