// Nectar's End — procedural Web Audio: generative music per area, foley, combat, heartbeat
(function (NE) {
'use strict';
const A = NE.Audio = { ctx: null, master: null, sfx: null, mus: null, noiseBuf: null, lastStep: 0, track: null, want: null };
A.init = function () {
  if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
  try { A.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  const c = A.ctx;
  A.master = c.createGain(); A.master.connect(c.destination);
  A.sfx = c.createGain(); A.sfx.connect(A.master);
  A.mus = c.createGain(); A.mus.connect(A.master);
  const len = c.sampleRate * 2; A.noiseBuf = c.createBuffer(1, len, c.sampleRate);
  const d = A.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  A.applySettings(); A.initMusic();
};
A.applySettings = function () {
  if (!A.ctx || !NE.G || !NE.G.meta) return; const s = NE.G.meta.settings;
  A.master.gain.value = s.master; A.sfx.gain.value = s.sfx; A.mus.gain.value = s.music == null ? 0.5 : s.music;
};
function env(g, t, a, peak, rel) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + rel); }
A.noise = function (dur, freq, q, vol, type, dest) {
  if (!A.ctx) return; const c = A.ctx, t = c.currentTime;
  const s = c.createBufferSource(); s.buffer = A.noiseBuf; s.playbackRate.value = 0.5 + Math.random();
  const f = c.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
  const g = c.createGain(); env(g, t, 0.005, vol, dur);
  s.connect(f); f.connect(g); g.connect(dest || A.sfx); s.start(t, Math.random()); s.stop(t + dur + 0.1);
};
A.tone = function (freq, dur, vol, type, slide, dest) {
  if (!A.ctx) return; const c = A.ctx, t = c.currentTime;
  const o = c.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
  const g = c.createGain(); env(g, t, 0.005, vol, dur);
  o.connect(g); g.connect(dest || A.sfx); o.start(t); o.stop(t + dur + 0.1);
};
A.play = function (name, vol) {
  if (!A.ctx) return; vol = vol == null ? 1 : vol;
  switch (name) {
    case 'step': A.noise(0.06, 400 + Math.random() * 300, 1.2, 0.12 * vol); break;
    case 'land': A.noise(0.15, 160, 0.8, 0.35 * vol, 'lowpass'); break;
    case 'swing': A.noise(0.12, 1800, 2, 0.08 * vol, 'highpass'); break;
    case 'hit': A.noise(0.12, 220, 1, 0.5 * vol, 'lowpass'); A.tone(110, 0.08, 0.15 * vol, 'square', 60); break;
    case 'slash': A.noise(0.1, 2600, 3, 0.25 * vol); A.noise(0.09, 400, 1, 0.3 * vol, 'lowpass'); break;
    case 'gun': A.noise(0.25, 900, 0.5, 0.9 * vol, 'lowpass'); A.tone(90, 0.18, 0.4 * vol, 'square', 40); break;
    case 'smg': A.noise(0.12, 1100, 0.5, 0.6 * vol, 'lowpass'); A.tone(110, 0.08, 0.3 * vol, 'square', 50); break;
    case 'shotgun': A.noise(0.5, 500, 0.5, 1.0 * vol, 'lowpass'); A.tone(55, 0.35, 0.5 * vol, 'sawtooth', 25); A.noise(0.08, 3000, 0.3, 0.3 * vol, 'highpass'); break;
    case 'magnum': A.noise(0.35, 700, 0.5, 1.0 * vol, 'lowpass'); A.tone(70, 0.25, 0.5 * vol, 'square', 30); break;
    case 'big': A.noise(0.8, 380, 0.5, 1.0 * vol, 'lowpass'); A.tone(40, 0.6, 0.7 * vol, 'sawtooth', 18); A.noise(0.12, 2500, 0.3, 0.5 * vol, 'highpass'); break;
    case 'rifle': A.noise(0.4, 600, 0.5, 1.0 * vol, 'lowpass'); A.tone(60, 0.3, 0.5 * vol, 'sawtooth', 30); break;
    case 'click': A.tone(1600, 0.03, 0.15 * vol, 'square'); break;
    case 'jam': A.tone(500, 0.05, 0.2, 'square'); A.tone(300, 0.07, 0.2, 'square'); break;
    case 'reload': A.noise(0.05, 3000, 4, 0.2); setTimeout(() => A.noise(0.06, 2000, 4, 0.25), 180); break;
    case 'ui': A.tone(660, 0.05, 0.08 * vol, 'triangle'); break;
    case 'uiback': A.tone(440, 0.06, 0.08 * vol, 'triangle', 300); break;
    case 'open_wood': A.noise(0.3, 300, 2, 0.3); A.tone(180, 0.2, 0.08, 'sawtooth', 120); break;
    case 'open_metal': A.tone(240, 0.35, 0.12, 'sawtooth', 200); A.noise(0.2, 2500, 6, 0.15); break;
    case 'open_cloth': A.noise(0.35, 1200, 0.7, 0.18); break;
    case 'rummage': A.noise(0.08, 900 + Math.random() * 900, 1, 0.08); break;
    case 'pain': A.tone(220, 0.25, 0.08, 'sawtooth', 160); break;
    case 'crack': A.noise(0.06, 3000, 1, 0.5); A.tone(80, 0.1, 0.3, 'square', 40); break;
    case 'heart': A.tone(55, 0.12, 0.35 * vol, 'sine', 40); setTimeout(() => A.tone(50, 0.1, 0.25 * vol, 'sine', 38), 160); break;
    case 'breath': A.noise(0.5, 900, 0.6, 0.06 * vol); break;
    case 'glass': for (let i = 0; i < 4; i++) setTimeout(() => A.tone(2000 + Math.random() * 3000, 0.08, 0.08, 'triangle'), i * 25); A.noise(0.15, 4000, 2, 0.2); break;
    case 'thud': A.noise(0.18, 120, 0.7, 0.4 * vol, 'lowpass'); break;
    case 'rumble': A.noise(2.2, 70, 0.5, 0.9 * vol, 'lowpass'); break;
    case 'chime': A.tone(880, 0.6, 0.12, 'sine'); setTimeout(() => A.tone(1320, 0.8, 0.1, 'sine'), 200); break;
    case 'geiger': A.noise(0.012, 3000, 1, 0.25 * vol, 'highpass'); break;
    case 'hiss': A.noise(0.8, 5000, 0.5, 0.18 * vol, 'highpass'); break;
    case 'fire': A.noise(0.3, 600, 0.6, 0.06 * vol); break;
    case 'elevator': A.noise(3, 90, 0.8, 0.6, 'lowpass'); A.tone(48, 3, 0.15, 'sawtooth', 44); break;
    case 'ding': A.tone(1046, 1.2, 0.12, 'sine'); break;
    case 'buy': A.tone(880, 0.06, 0.1, 'square'); setTimeout(() => A.tone(1320, 0.1, 0.1, 'square'), 70); break;
    case 'deny': A.tone(160, 0.15, 0.12, 'square'); break;
    case 'rope': A.noise(0.09, 1500 + Math.random() * 500, 1.5, 0.08 * vol); break;
    case 'squelch': A.noise(0.18, 300 + Math.random() * 200, 3, 0.35 * vol, 'lowpass'); A.tone(140, 0.15, 0.08 * vol, 'sine', 70); break;
    // respawn: a wet gasp of new breath, a rising hive-shimmer and the first heartbeats of the new host
    case 'respawn': A.noise(0.5, 700, 1.2, 0.35, 'bandpass'); A.tone(220, 0.9, 0.12, 'sine', 880); A.tone(330, 1.1, 0.08, 'triangle', 1320); A.tone(660, 1.3, 0.05, 'sine', 1760); setTimeout(() => { A.tone(60, 0.18, 0.5, 'sine', 40); }, 650); setTimeout(() => { A.tone(55, 0.18, 0.45, 'sine', 38); }, 900); setTimeout(() => { A.tone(60, 0.18, 0.4, 'sine', 40); }, 1500); break;
    case 'relichum': A.tone(523, 0.9, 0.05 * vol, 'sine', 528); A.tone(784, 0.9, 0.035 * vol, 'sine', 790); A.tone(1046, 0.6, 0.02 * vol, 'triangle', 1050); break;
    case 'screech': A.tone(1400, 0.7, 0.12, 'sawtooth', 2600); A.tone(900, 0.5, 0.1, 'square', 300); A.noise(0.25, 4000, 0.4, 0.4, 'highpass'); A.noise(0.6, 220, 1.5, 0.6, 'lowpass'); A.tone(55, 0.8, 0.35, 'sawtooth', 25); break;
    case 'retract': A.noise(0.7, 500, 2, 0.35, 'lowpass'); A.tone(300, 0.8, 0.12, 'sine', 60); A.tone(160, 0.5, 0.1, 'triangle', 40); break;
    case 'latch': A.noise(0.12, 900, 2, 0.4, 'bandpass'); A.tone(220, 0.1, 0.12, 'square', 120); break;
    case 'burst': A.noise(0.9, 260, 1.5, 0.7, 'lowpass'); A.tone(70, 0.9, 0.3, 'sawtooth', 30); A.tone(420, 0.6, 0.06, 'square', 900); break;
    case 'pulse': A.tone(180, 0.6, 0.25, 'sawtooth', 900); A.tone(90, 0.7, 0.3, 'sine', 40); A.noise(0.5, 1200, 0.5, 0.2); break;
    case 'nectar': [0, 4, 7, 12, 16].forEach((k, i) => setTimeout(() => A.tone(523 * Math.pow(2, k / 12), 0.9, 0.08, 'sine'), i * 90)); A.tone(130, 1.4, 0.12, 'triangle', 260); break;
    case 'death': A.tone(80, 2.5, 0.4, 'sine', 30); A.noise(2.5, 200, 0.4, 0.2, 'lowpass'); break;
    case 'growl': A.tone(90 + Math.random() * 40, 0.4, 0.12 * vol, 'sawtooth', 60); A.noise(0.4, 300, 2, 0.1 * vol); break;
    case 'shout': A.tone(180 + Math.random() * 60, 0.25, 0.08 * vol, 'square', 140); break;
    case 'splash': A.noise(0.3, 1500, 0.5, 0.2 * vol); break;
    case 'boom': A.noise(1.2, 90, 0.5, 1.2, 'lowpass'); A.tone(50, 0.8, 0.6, 'sine', 25); break;
  }
};
// ---------------- generative music ----------------
const SC = { minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], major: [0, 2, 4, 5, 7, 9, 11], phryg: [0, 1, 4, 5, 7, 8, 10], lydian: [0, 2, 4, 6, 7, 9, 11], locrian: [0, 1, 3, 5, 6, 8, 10], harm: [0, 2, 3, 5, 7, 8, 11] };
const TR = {
  title:    { bpm: 66, root: 45, sc: 'minor', prog: [0, 5, 2, 6], pad: 'triangle', padV: 0.05, arp: ['bell', 2, 2, 0.75], lead: ['bell', 0.12, 3], bass: 8 },
  prologue: { bpm: 58, root: 50, sc: 'lydian', prog: [0, 4, 5, 3], pad: 'sine', padV: 0.06, arp: ['bell', 4, 2, 0.6], lead: ['bell', 0.1, 3] },
  camp:     { bpm: 84, root: 43, sc: 'major', prog: [0, 4, 5, 3], pad: 'triangle', padV: 0.03, arp: ['pluck', 2, 1, 0.9], lead: ['pluck', 0.12, 2], bass: 4, hat: 0.25 },
  grotto:   { bpm: 76, root: 50, sc: 'dorian', prog: [0, 3, 6, 4], pad: 'triangle', padV: 0.035, arp: ['marimba', 2, 1, 0.55], lead: ['bell', 0.06, 3], bass: 8, drip: true },
  desert:   { bpm: 92, root: 40, sc: 'phryg', prog: [0, 1, 0, 6], pad: 'sawtooth', padV: 0.014, arp: ['oud', 2, 1, 0.5], lead: ['oud', 0.18, 2], bass: 4, drum: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0] },
  ice:      { bpm: 58, root: 42, sc: 'minor', prog: [0, 5, 3, 4], pad: 'sine', padV: 0.06, arp: ['glass', 4, 3, 0.6], lead: ['glass', 0.07, 3], bass: 16 },
  crystal:  { bpm: 100, root: 47, sc: 'lydian', prog: [0, 1, 5, 4], pad: 'triangle', padV: 0.03, arp: ['glass', 1, 2, 0.55], lead: ['bell', 0.1, 3], bass: 8, hat: 0.3 },
  magma:    { bpm: 80, root: 36, sc: 'locrian', prog: [0, 1, 0, 4], pad: 'sawtooth', padV: 0.018, arp: ['pluck', 4, 1, 0.35], bass: 2, drum: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0], low: true },
  town:     { bpm: 96, root: 48, sc: 'major', prog: [0, 5, 3, 4], pad: 'triangle', padV: 0.025, arp: ['box', 2, 2, 0.8], lead: ['box', 0.22, 3], bass: 4, hat: 0.2 },
  burst:    { bpm: 150, root: 40, sc: 'harm', prog: [0, 0, 5, 4], pad: 'sawtooth', padV: 0.02, arp: ['square', 1, 1, 0.8], bass: 2, drum: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1], hat: 0.8 },
};
const mf = m => 440 * Math.pow(2, (m - 69) / 12);
A.initMusic = function () {
  const c = A.ctx; const len = c.sampleRate * 2.6; const ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
  A.rev = c.createConvolver(); A.rev.buffer = ir; const rg = c.createGain(); rg.gain.value = 0.55; A.rev.connect(rg); rg.connect(A.mus);
  A.dly = c.createDelay(1); A.dly.delayTime.value = 0.36; const fb = c.createGain(); fb.gain.value = 0.32; A.dly.connect(fb); fb.connect(A.dly); const dg = c.createGain(); dg.gain.value = 0.25; A.dly.connect(dg); dg.connect(A.mus);
  A.step = 0; A.nextT = c.currentTime + 0.1; A.mrand = NE.mulberry(1234);
  setInterval(A.schedule, 60); if (A.want !== undefined) { const w = A.want; A.want = undefined; A.music(w); }
};
A.music = function (name) {
  if (!A.ctx) { A.want = name; return; } if (A.track && A.track.name === name) return;
  const c = A.ctx, t = c.currentTime;
  if (A.track) { const old = A.track; old.g.gain.cancelScheduledValues(t); old.g.gain.setValueAtTime(old.g.gain.value, t); old.g.gain.linearRampToValueAtTime(0.0001, t + 2.2); setTimeout(() => old.g.disconnect(), 2600); }
  if (!name || !TR[name]) { A.track = null; return; }
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(1, t + 2.5); g.connect(A.mus); const send = c.createGain(); send.gain.value = 0.6; g.connect(send); send.connect(A.rev); const ds = c.createGain(); ds.gain.value = 0.35; g.connect(ds); ds.connect(A.dly);
  A.track = { name, def: TR[name], g, lead: 0 }; A.step = 0; A.nextT = Math.max(A.nextT, t + 0.05); A.mrand = NE.mulberry((Math.random() * 1e9) | 0);
};
function voice(type, f, t, dur, vol, dest, opt) {
  const c = A.ctx; const o = c.createOscillator(); o.type = type; o.frequency.value = f; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
  const at = (opt && opt.a) || 0.005; g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), t + at); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = o; if (opt && opt.lp) { const f2 = c.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = opt.lp; o.connect(f2); node = f2; }
  if (opt && opt.det) o.detune.value = opt.det;
  node.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
}
function inst(name, m, t, d, dest, v) {
  const f = mf(m); v = v || 1;
  switch (name) {
    case 'bell': voice('sine', f, t, 2.2, 0.07 * v, dest); voice('sine', f * 2.76, t, 0.9, 0.018 * v, dest); break;
    case 'glass': voice('sine', f * 2, t, 2.8, 0.045 * v, dest); voice('triangle', f * 4.01, t, 1.2, 0.012 * v, dest); break;
    case 'box': voice('sine', f * 2, t, 0.9, 0.06 * v, dest); voice('sine', f * 6, t, 0.25, 0.012 * v, dest); break;
    case 'pluck': voice('triangle', f, t, 0.5, 0.07 * v, dest, { lp: 1800 }); voice('square', f, t, 0.12, 0.012 * v, dest, { lp: 1400 }); break;
    case 'marimba': voice('sine', f, t, 0.45, 0.09 * v, dest); voice('sine', f * 4, t, 0.08, 0.02 * v, dest); break;
    case 'oud': voice('sawtooth', f, t, 0.55, 0.045 * v, dest, { lp: 1300 }); voice('sawtooth', f, t, 0.55, 0.02 * v, dest, { lp: 900, det: 9 }); break;
    case 'square': voice('square', f, t, 0.14, 0.03 * v, dest, { lp: 1600 }); break;
    case 'bass': voice('triangle', f, t, d, 0.11 * v, dest, { lp: 600 }); voice('sine', f / 2, t, d, 0.05 * v, dest); break;
  }
}
A.schedule = function () {
  const c = A.ctx, T = A.track; if (!c || !T) { if (c) A.nextT = c.currentTime + 0.05; return; }
  const D = T.def, sp = 60 / D.bpm / 4, R = A.mrand, scl = SC[D.sc];
  const deg = d => D.root + scl[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
  while (A.nextT < c.currentTime + 0.25) {
    const s = A.step, t = A.nextT, bar = (s >> 4) % D.prog.length, ch = D.prog[bar], dest = T.g;
    if (s % 16 === 0) for (const k of [0, 2, 4]) { voice(D.pad, mf(deg(ch + k) + 12), t, sp * 16 + 0.6, D.padV, dest, { a: 0.6, lp: 1400, det: (R() - 0.5) * 14 }); voice(D.pad, mf(deg(ch + k) + 12), t, sp * 16 + 0.6, D.padV * 0.6, dest, { a: 0.8, lp: 1100, det: 9 }); }
    if (D.bass && s % D.bass === 0) inst('bass', deg(ch) - (D.low ? 0 : 0), t, sp * Math.min(D.bass, 8) * 0.95, dest, D.low ? 1.4 : 1);
    if (D.arp && s % D.arp[1] === 0 && R() < D.arp[3]) { const i = (s / D.arp[1]) % 3; inst(D.arp[0], deg(ch + [0, 2, 4][i] + 7 * D.arp[2]) - 12, t, sp, dest, 0.9); }
    if (D.lead && s % 2 === 0 && R() < D.lead[1]) { T.lead = Math.max(-3, Math.min(9, T.lead + Math.round((R() - 0.5) * 4))); inst(D.lead[0], deg(ch + T.lead + 7 * (D.lead[2] - 1)), t, sp * 2, dest, 1.1); }
    if (D.drum && D.drum[s % 16]) { const o = c.createOscillator(); o.frequency.setValueAtTime(D.low ? 70 : 120, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.2); const g = c.createGain(); g.gain.setValueAtTime(D.low ? 0.32 : 0.18, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.35); }
    if (D.hat && s % 2 === 1 && R() < D.hat) { const sN = c.createBufferSource(); sN.buffer = A.noiseBuf; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000; const g = c.createGain(); g.gain.setValueAtTime(0.03, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); sN.connect(f); f.connect(g); g.connect(dest); sN.start(t, R()); sN.stop(t + 0.08); }
    if (D.drip && R() < 0.035) voice('sine', mf(deg(ch + 14 + Math.floor(R() * 5))), t, 0.25, 0.05, dest);
    A.step++; A.nextT += sp;
  }
};
})(window.NE);
