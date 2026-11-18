// Nectar's End — procedural Web Audio: ambient drone, foley, combat, heartbeat
(function (NE) {
'use strict';
const A = NE.Audio = { ctx: null, master: null, sfx: null, amb: null, noiseBuf: null, drone: null, lastStep: 0 };
A.init = function () {
  if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
  try { A.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  const c = A.ctx;
  A.master = c.createGain(); A.master.connect(c.destination);
  A.sfx = c.createGain(); A.sfx.connect(A.master);
  A.amb = c.createGain(); A.amb.connect(A.master);
  const len = c.sampleRate * 2; A.noiseBuf = c.createBuffer(1, len, c.sampleRate);
  const d = A.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  A.applySettings();
  A.startDrone();
};
A.applySettings = function () {
  if (!A.ctx || !NE.G || !NE.G.meta) return; const s = NE.G.meta.settings;
  A.master.gain.value = s.master; A.sfx.gain.value = s.sfx; A.amb.gain.value = s.amb;
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
    case 'death': A.tone(80, 2.5, 0.4, 'sine', 30); A.noise(2.5, 200, 0.4, 0.2, 'lowpass'); break;
    case 'growl': A.tone(90 + Math.random() * 40, 0.4, 0.12 * vol, 'sawtooth', 60); A.noise(0.4, 300, 2, 0.1 * vol); break;
    case 'shout': A.tone(180 + Math.random() * 60, 0.25, 0.08 * vol, 'square', 140); break;
    case 'splash': A.noise(0.3, 1500, 0.5, 0.2 * vol); break;
    case 'boom': A.noise(1.2, 90, 0.5, 1.2, 'lowpass'); A.tone(50, 0.8, 0.6, 'sine', 25); break;
  }
};
A.startDrone = function () {
  const c = A.ctx; const g = c.createGain(); g.gain.value = 0.0; g.connect(A.amb);
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300; lp.connect(g);
  const o1 = c.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 48;
  const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = 48 * 1.498;
  const o3 = c.createOscillator(); o3.type = 'triangle'; o3.frequency.value = 24.2;
  const lfo = c.createOscillator(); lfo.frequency.value = 0.07; const lg = c.createGain(); lg.gain.value = 120; lfo.connect(lg); lg.connect(lp.frequency);
  const ns = c.createBufferSource(); ns.buffer = A.noiseBuf; ns.loop = true; const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 400; nf.Q.value = 0.4; const ng = c.createGain(); ng.gain.value = 0.05;
  ns.connect(nf); nf.connect(ng); ng.connect(g);
  [o1, o2, o3].forEach(o => { const og = c.createGain(); og.gain.value = 0.12; o.connect(og); og.connect(lp); o.start(); });
  lfo.start(); ns.start();
  A.drone = { g, o1, o2, o3, lp };
  g.gain.linearRampToValueAtTime(0.5, c.currentTime + 3);
};
A.setDrone = function (freq, bright) {
  if (!A.drone) return; const t = A.ctx.currentTime;
  A.drone.o1.frequency.linearRampToValueAtTime(freq, t + 4);
  A.drone.o2.frequency.linearRampToValueAtTime(freq * 1.498, t + 4);
  A.drone.o3.frequency.linearRampToValueAtTime(freq / 2 + 0.2, t + 4);
  A.drone.lp.frequency.linearRampToValueAtTime(bright || 300, t + 4);
};
})(window.NE);
