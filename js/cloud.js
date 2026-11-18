// Nectar's End — Google account cloud saves.
// Signs in with Google Identity Services (OAuth token client, no backend) and keeps the whole save file
// (all slots + settings) in the player's private Google Drive "appDataFolder" — a hidden folder only this game can see.
(function (NE) {
'use strict';
const CLIENT_ID = '495350861856-rklf5i2sk1jo0kb296bfbdb49e07ug88.apps.googleusercontent.com';
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata openid email profile';
const FILE = 'nectars_end_save.json';
const LS = 'ne_cloud'; // remembers who signed in last (no tokens stored)
const C = NE.Cloud = { token: null, exp: 0, user: null, fileId: null, status: 'off', last: 0, busy: false, err: '' };
try { const m = JSON.parse(localStorage.getItem(LS) || 'null'); if (m) { C.user = m.user; C.last = m.last || 0; C.status = 'idle'; } } catch (e) { }
const remember = () => { try { localStorage.setItem(LS, JSON.stringify({ user: C.user, last: C.last })); } catch (e) { } };
const valid = () => C.token && Date.now() < C.exp - 30000;
const set = (st, err) => { C.status = st; C.err = err || ''; if (NE.UI && NE.UI.cloudRefresh) NE.UI.cloudRefresh(); };

// load the Google script only when needed
let gisP = null;
function gis() {
  if (window.google && google.accounts && google.accounts.oauth2) return Promise.resolve();
  if (gisP) return gisP;
  gisP = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = () => res(); s.onerror = () => { gisP = null; rej(new Error('Could not reach Google. Check your connection.')); }; document.head.appendChild(s); });
  return gisP;
}
// ask Google for an access token (opens the account picker the first time; must come from a click)
function getToken(interactive) {
  return gis().then(() => new Promise((res, rej) => {
    const tc = google.accounts.oauth2.initTokenClient({ client_id: CLIENT_ID, scope: SCOPE, callback: r => { if (r.error) return rej(new Error(r.error_description || r.error)); C.token = r.access_token; C.exp = Date.now() + (r.expires_in || 3600) * 1000; res(C.token); }, error_callback: e => rej(new Error(e && e.type === 'popup_closed' ? 'Sign-in window was closed.' : 'Sign-in was blocked or cancelled.')) });
    tc.requestAccessToken({ prompt: interactive ? (C.user ? '' : 'consent') : '', hint: C.user ? C.user.email : undefined });
  }));
}
async function api(url, opt) {
  opt = opt || {}; opt.headers = Object.assign({ Authorization: 'Bearer ' + C.token }, opt.headers || {});
  const r = await fetch(url, opt); if (r.status === 401) { C.token = null; throw new Error('Google session expired — click the cloud button to reconnect.'); }
  if (!r.ok) throw new Error('Google Drive error ' + r.status); return r;
}
async function findFile() {
  if (C.fileId) return C.fileId;
  const r = await api('https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,modifiedTime)&q=' + encodeURIComponent("name='" + FILE + "'"));
  const j = await r.json(); const f = j.files && j.files[0]; if (f) { C.fileId = f.id; C.remoteTime = Date.parse(f.modifiedTime); } return C.fileId;
}
const localData = () => localStorage.getItem(NE.Save.KEY) || '{}';
function stamp(raw) { try { const d = JSON.parse(raw); let t = 0; for (const p of d.slots || []) if (p && p.updated > t) t = p.updated; return t; } catch (e) { return 0; } }

C.upload = async function () {
  if (!valid()) throw new Error('Not connected.'); const body = localData(); await findFile();
  if (C.fileId) await api('https://www.googleapis.com/upload/drive/v3/files/' + C.fileId + '?uploadType=media', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body });
  else {
    const meta = { name: FILE, parents: ['appDataFolder'], mimeType: 'application/json' }; const bnd = 'ne' + Math.random().toString(36).slice(2);
    const multipart = '--' + bnd + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(meta) + '\r\n--' + bnd + '\r\nContent-Type: application/json\r\n\r\n' + body + '\r\n--' + bnd + '--';
    const r = await api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + bnd }, body: multipart }); C.fileId = (await r.json()).id;
  }
  C.last = Date.now(); remember(); set('synced');
};
C.download = async function () { if (!valid()) throw new Error('Not connected.'); if (!(await findFile())) return null; const r = await api('https://www.googleapis.com/drive/v3/files/' + C.fileId + '?alt=media'); return r.text(); };
C.useCloud = function (raw) { try { JSON.parse(raw); } catch (e) { return NE.UI.toast('Cloud save is damaged.'); } localStorage.setItem(NE.Save.KEY, raw); C.last = Date.now(); remember(); location.reload(); };

// sign in (from a click), then reconcile local vs cloud
C.signIn = async function () {
  if (C.busy) return; C.busy = true; set('working');
  try {
    await getToken(true);
    const u = await (await api('https://www.googleapis.com/oauth2/v3/userinfo')).json(); C.user = { name: u.given_name || u.name || 'Player', email: u.email, pic: u.picture }; remember();
    const raw = await C.download(); const loc = localData();
    if (!raw) { await C.upload(); NE.UI.toast('Signed in as ' + C.user.email + '. Your saves are now backed up to Google.'); }
    else if (raw === loc) { set('synced'); NE.UI.toast('Signed in. Cloud save is up to date.'); }
    else {
      const tc = stamp(raw), tl = stamp(loc); const when = t => t ? new Date(t).toLocaleString() : 'unknown';
      NE.UI.dialog('Cloud save found', 'Your Google account already has a Nectar\'s End save.<br><br><b>Cloud:</b> last played ' + when(tc) + '<br><b>This device:</b> last played ' + when(tl), [
        { label: 'Load the cloud save', hint: 'Replaces the saves on this device', fn: () => C.useCloud(raw) },
        { label: 'Keep this device\'s save', hint: 'Overwrites the cloud copy', fn: () => C.upload().catch(e => set('error', e.message)) },
        { label: 'Decide later' }]);
      set('idle');
    }
  } catch (e) { set(C.user ? 'idle' : 'off', e.message); NE.UI.toast(e.message); }
  C.busy = false;
};
C.signOut = function () { try { if (C.token && window.google) google.accounts.oauth2.revoke(C.token, () => { }); } catch (e) { } C.token = null; C.user = null; C.fileId = null; C.last = 0; localStorage.removeItem(LS); set('off'); NE.UI.toast('Signed out. Saves stay on this device.'); };
C.syncNow = async function () { if (C.busy) return; C.busy = true; set('working'); try { if (!valid()) await getToken(true); await C.upload(); NE.UI.toast('Saved to Google.'); } catch (e) { set('error', e.message); NE.UI.toast(e.message); } C.busy = false; };
C.pull = async function () { if (C.busy) return; C.busy = true; set('working'); try { if (!valid()) await getToken(true); const raw = await C.download(); C.busy = false; if (!raw) { set('idle'); return NE.UI.toast('No cloud save yet.'); } NE.UI.confirm('Load cloud save?', 'This replaces the saves on this device with your Google copy.', 'Load it', () => C.useCloud(raw)); set('idle'); } catch (e) { C.busy = false; set('error', e.message); NE.UI.toast(e.message); } };

// auto-backup: every local save is mirrored to Drive (throttled) while the Google session is live
let pend = null;
C.queue = function () { if (!C.user || !valid() || pend) return; pend = setTimeout(() => { pend = null; if (!C.busy && valid()) C.upload().catch(e => set('error', e.message)); }, 20000); };
const w0 = NE.Save.write; NE.Save.write = function (G) { w0.call(NE.Save, G); C.queue(); };
window.addEventListener('beforeunload', () => { if (pend && valid()) { clearTimeout(pend); C.upload().catch(() => { }); } });

C.label = function () {
  if (C.status === 'working') return ['SYNCING…', 'talking to Google'];
  if (!C.user) return ['SIGN IN WITH GOOGLE', 'back up your saves to the cloud'];
  const ago = C.last ? Math.max(0, Math.round((Date.now() - C.last) / 60000)) : -1;
  const sub = C.status === 'error' ? C.err : !valid() ? C.user.email + ' • click to reconnect' : C.user.email + (ago >= 0 ? ' • synced ' + (ago < 1 ? 'just now' : ago + 'm ago') : '');
  return ['CLOUD SAVE · ' + C.user.name.toUpperCase(), sub];
};
})(window.NE);
