// Nectar's End — live update checker.
// Polls version.json; when it changes from the version this page booted with, shows a popup:
// "Update now" refreshes immediately; otherwise it auto-refreshes when the countdown ends.
// Mid-run, the countdown is longer and the refresh waits for a calm moment (no menu/modal open).
(function (NE) {
'use strict';
const U = NE.Update = { current: window.NE_BOOT_VERSION || null, pending: null, timer: null, left: 0, el: null };
const POLL_MS = 60000, AUTO_IDLE = 30, AUTO_RUN = 90;

U.check = function () {
  fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(v => {
    if (!v) return; const top = v.log && v.log[0]; v.version = v.version || (top && top.version); if (!v.version) return; if (!v.notes && top) v.notes = top.title; U.latest = v;
    if (!U.current) { U.current = v.version; return; }
    if (v.version !== U.current && (!U.pending || U.pending.version !== v.version)) U.show(v);
  }).catch(() => { });
};
U.show = function (v) {
  U.pending = v; const inRun = NE.G && (NE.G.state === 'run' || NE.G.state === 'dying');
  U.left = inRun ? AUTO_RUN : AUTO_IDLE;
  if (!U.el) { U.el = document.createElement('div'); U.el.id = 'update'; document.getElementById('game').appendChild(U.el); }
  U.el.innerHTML = '<div class="up-h">' + '<img class="pix" src="assets/logo.png"> NEW VERSION <b>v' + esc(v.version) + '</b></div>' +
    (v.notes ? '<div class="up-n">' + esc(v.notes) + '</div>' : '') +
    (inRun ? '<div class="up-w">Your run is saved automatically — you\'ll pick up right where you are.</div>' : '') +
    '<div class="up-c"><button class="btn" id="up-now">Update now</button><button class="btn" id="up-later">Later</button><button class="btn" id="up-log">What\'s new</button><span class="up-t"></span></div>';
  U.el.classList.remove('hide', 'mini');
  document.getElementById('up-now').onclick = U.apply;
  document.getElementById('up-later').onclick = () => { U.el.classList.add('mini'); };
  document.getElementById('up-log').onclick = () => { if (NE.UI) NE.UI.open('changelog', v); };
  if (NE.Audio) NE.Audio.play('chime');
  clearInterval(U.timer); U.timer = setInterval(U.tick, 1000); U.tick();
};
U.tick = function () {
  const ui = NE.UI; const busy = ui && (ui.modalOpen && ui.modalOpen());
  if (U.left > 0) U.left--;
  const t = U.el && U.el.querySelector('.up-t'); if (t) t.textContent = U.left > 0 ? 'Auto-updating in ' + U.left + 's' : busy ? 'Updating when you close this window…' : 'Updating…';
  if (U.left <= 0 && !busy) U.apply();
};
U.apply = function () {
  clearInterval(U.timer); try { if (NE.G && NE.G.autosave) NE.G.autosave(true); } catch (e) { }
  try { if (NE.G && NE.G.meta && NE.G.meta.run) sessionStorage.setItem('ne_resume', '1'); } catch (e) { }
  const url = location.pathname + '?v=' + encodeURIComponent(U.pending ? U.pending.version : Date.now()) + location.hash;
  location.replace(url);
};
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
setTimeout(U.check, 8000); setInterval(U.check, POLL_MS);
document.addEventListener('visibilitychange', () => { if (!document.hidden) U.check(); });
})(window.NE);
