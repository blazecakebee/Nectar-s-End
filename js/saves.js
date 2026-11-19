// Nectar's End — save slots + full run serialization (autosaves on a timer, on tab close and on reload)
(function (NE) {
'use strict';
const SLOTS = 3;
const S = NE.Save = {
  KEY: 'nectars_end_v2', OLD: 'nectars_end_save_v1',
  defProfile() { return { v: 2, xp: 0, level: 1, points: 2, perks: {}, scrap: 25, unlocked: { backpacks: ['canvas'], outfits: ['rags'] }, equipped: { backpack: 'canvas', outfit: 'rags' }, starter: [], cemetery: [], best: { depth: 0, time: 0, kills: 0 }, runs: 0, survivor: null, rerolled: false, nectars: 0, run: null, started: false, created: Date.now(), updated: Date.now() }; },
  defSettings() { return { master: 0.8, sfx: 0.8, music: 0.5, shake: 1, gore: 1, tips: true, theme: 'honey' }; },
  fix(p) { const d = S.defProfile(); const m = Object.assign(d, p || {}); m.unlocked = Object.assign(S.defProfile().unlocked, (p && p.unlocked) || {}); m.equipped = Object.assign(S.defProfile().equipped, (p && p.equipped) || {}); m.best = Object.assign(S.defProfile().best, (p && p.best) || {}); return m; },
  load() {
    let st = null; try { st = JSON.parse(localStorage.getItem(S.KEY)); } catch (e) { }
    if (!st) { st = { slot: 0, slots: [null, null, null], settings: S.defSettings(), seenVersion: null, seenPrologue: false };
      try { const old = JSON.parse(localStorage.getItem(S.OLD)); if (old) { st.settings = Object.assign(S.defSettings(), old.settings || {}); delete old.settings; st.seenVersion = old.seenVersion || null; old.started = true; st.slots[0] = S.fix(old); st.seenPrologue = true; } } catch (e) { } }
    st.settings = Object.assign(S.defSettings(), st.settings || {}); st.slots = (st.slots || []).slice(0, SLOTS); while (st.slots.length < SLOTS) st.slots.push(null);
    st.slots = st.slots.map(p => p ? S.fix(p) : null); if (!(st.slot >= 0 && st.slot < SLOTS)) st.slot = 0; return st;
  },
  boot(G) { G.store = S.load(); S.activate(G, G.store.slot); },
  activate(G, i) { const st = G.store; st.slot = i; G.meta = st.slots[i] || S.defProfile(); G.meta.settings = st.settings; },
  write(G) {
    const st = G.store; if (!st) return; if (G.meta && G.meta.started) { G.meta.updated = Date.now(); st.slots[st.slot] = G.meta; }
    const out = Object.assign({}, st, { slots: st.slots.map(p => { if (!p) return null; const c = Object.assign({}, p); delete c.settings; return c; }) });
    try { localStorage.setItem(S.KEY, JSON.stringify(out)); } catch (e) { console.warn('save failed', e); }
  },
  remove(G, i) { G.store.slots[i] = null; if (G.store.slot === i) S.activate(G, i); S.write(G); },
  // ------- run instance -------
  anat(A) { const o = {}; for (const k in A) if (k !== 's' && k !== 'ev') o[k] = A[k]; return o; },
  rle(arr) { let out = '', cur = arr[0], n = 0; for (let i = 0; i <= arr.length; i++) { if (i < arr.length && arr[i] === cur && n < 4000) n++; else { out += cur + ':' + n + ','; cur = arr[i]; n = 1; } } return out; },
  unrle(str, arr) { let i = 0; for (const part of str.split(',')) { if (!part) continue; const [v, n] = part.split(':'); arr.fill(+v, i, i + +n); i += +n; } },
  serializeRun(G) {
    const W = G.world, p = G.player, R = G.run; if (!W || W.lobby || !p || !R) return null;
    const floors = W.floors.map(fl => { const o = {}; fl.objs.forEach((ob, i) => { if (ob.type === 'container') o[i] = { s: ob.searched ? 1 : 0, it: ob.items || null, l: ob.locked || null, tr: ob.trap || null }; else if (ob.type === 'dead') o[i] = 'x'; else if (ob.type === 'dispenser') o[i] = { u: ob.uses }; }); return { o, seen: S.rle(fl.seen) }; });
    const actors = G.actors.filter(a => a.alive && !a.isPlayer && !a.isPuppet && !a.isRemote && !a.town).map(a => ({ k: a.isNPC ? 'npc' : 'enemy', type: a.type, kind: a.kind, x: a.x, y: a.y, hostile: a.hostile, post: a.post, weapon: a.weapon, ammo: a.ammo, gear: a.gear, look: a.look, name: a.name, stock: a.stock, treated: a.treated, faction: a.faction, anat: S.anat(a.anat) }));
    const dyn = G.dyn.filter(o => o.type === 'container').map(o => ({ ct: o.ct, x: o.x, y: o.y, label: o.label, items: o.items, searched: o.searched }));
    const inv = p.inv.items; const run = Object.assign({}, R, { log: R.log.slice(-150) });
    return { v: 2, seed: W.seed, floors: W.floors.length, mods: [...W.mods], fl: floors, actors, dyn, run, t: Date.now(),
      player: { x: p.x, y: p.y, facing: p.facing, anat: S.anat(p.anat), inv, eqW: inv.indexOf(p.equip.weapon), gear: p.gear, light: p.light, filterT: p.filterT },
      coop: G.net && G.net.on ? { role: G.net.role, code: G.net.code, partner: G.net.peerSurv ? G.net.peerSurv.name : null } : null };
  },
  restoreRun(G, d) {
    const W = G.world, p = G.player;
    d.fl.forEach((fs, f) => { const fl = W.floors[f]; if (!fl) return; if (fs.seen) S.unrle(fs.seen, fl.seen); for (const i in fs.o) { const ob = fl.objs[i], st = fs.o[i]; if (!ob) continue; if (st === 'x') { ob.type = 'dead'; ob.act = null; continue; } if (st.u != null) { ob.uses = st.u; continue; } ob.searched = !!st.s; ob.items = st.it; ob.locked = st.l; ob.trap = st.tr; } });
    for (const a of d.actors) {
      let e; if (a.k === 'enemy') { e = new NE.Enemy(G, a.x, a.y, a.type, 0); e.weapon = a.weapon; e.ammo = a.ammo; e.gear = a.gear || {}; e.hostile = a.hostile; e.post = a.post; e.faction = a.faction || e.faction; }
      else { e = new NE.NPC(G, a.x, a.y, a.kind); e.name = a.name; e.stock = a.stock; e.treated = a.treated; if (a.kind === 'survivor' && a.treated) e.sitting = false; }
      if (a.look) { e.look = a.look; } Object.assign(e.anat, a.anat); G.actors.push(e);
    }
    for (const o of d.dyn) G.dyn.push({ type: 'container', ct: o.ct, x: o.x, y: o.y, label: o.label, act: 'search', items: o.items, searched: o.searched });
    const P = d.player; p.x = P.x; p.y = P.y; p.facing = P.facing; Object.assign(p.anat, P.anat); const eqE = P.eqW >= 0 ? (P.inv || [])[P.eqW] : null; const spill = p.inv.restore(P.inv || []); p.equip.weapon = eqE && p.inv.items.includes(eqE) ? eqE : null; if (spill.length) G.dyn.push({ type: 'container', ct: 'bag', x: P.x, y: P.y, label: 'Overflow Bag', act: 'search', items: spill, searched: true }); p.gear = P.gear || {}; p.light = P.light || p.light; p.filterT = P.filterT || 0;
    for (const q of p.rag.pts) { q.x += p.x - 12 * NE.T; q.y += p.y - W.floors[0].feetY; q.ox = q.x; q.oy = q.y; }
  },
};
// G-level helpers
const G = () => NE.G;
NE.autosave = function (force) {
  const g = G(); if (!g || !g.meta || !g.meta.started) return;
  if (g.state === 'run' && g.player && g.player.alive && !g.goop) { const r = S.serializeRun(g); if (r) g.meta.run = r; }
  else if (g.state === 'lobby') g.meta.run = null;
  S.write(g);
};
})(window.NE);
