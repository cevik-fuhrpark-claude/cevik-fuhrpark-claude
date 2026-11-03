// [CLAUDE] AUTOMATISCH ERZEUGT durch scripts/build-app.mjs aus public/app.js – nicht von Hand bearbeiten (Code in app.js ändern, dann npm run build)
import { $, S, api, bindLang, bindPwShow, deviceId, ensureLang, esc, langSelect, pwField, render, resetUserState, t, toast, viewLoginCode } from './app-main.js';

async function viewSetup() {
  const st = await api('GET', '/api/setup/status');
  if (!st.needs_setup) { location.hash = '#/login'; return; }
  render(`<div class="center"><form id="f" class="narrow panel"><h1>${esc(t('setup'))}</h1>
    <label for="c">${esc(t('setup_code'))}</label><input id="c" required autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false">
    <label for="u">${esc(t('username'))}<span class="hint">${esc(t('username_rule'))}</span></label><input id="u" required autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="y.cevik">
    <label for="n">${esc(t('display_name'))}</label><input id="n" required>
    <div class="actions"><button class="btn block">${esc(t('create_owner'))}</button></div><p class="small muted">${esc(t('setup_next'))}</p></form></div>`);
  $('#u').oninput = () => { const el = $('#u'); const v = el.value.toLowerCase().replace(/\s+/g, '.').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9._-]/g, ''); if (v !== el.value) el.value = v; };
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    try { const r = await api('POST', '/api/setup', { setup_code: $('#c').value.trim(), username: $('#u').value.trim().toLowerCase(), display_name: $('#n').value.trim() }); location.hash = '#/invite/' + r.invite_token; }
    catch (err) { toast(err.message, true); }
  };
}
async function viewInvite(token) {
  let info;
  try { info = await api('GET', '/api/invite/' + encodeURIComponent(token)); }
  // benutzte/abgelaufene Einladung: Weg zur Anmeldung und wen man ansprechen kann, Sprachauswahl (20.10.2026: vorher Sackgasse)
  catch (e) { render(`<div class="center"><div class="panel narrow alert" id="invbad"><p>${esc(e.message)}</p><p class="small">${esc(t('forgot_pw_hint'))}</p><div class="actions"><a class="btn block" href="#/login">${esc(t('login'))}</a></div>${langSelect()}</div></div>`); bindLang(); return; }
  // Backlog 381: Sprache, die die Leitung beim Anlegen gewählt hat, gilt auf der Einladungsseite (umstellbar unten)
  if (info.language && ['de', 'uk', 'en'].includes(info.language) && info.language !== S.lang) { S.lang = info.language; try { localStorage.setItem('cfp_lang', info.language); } catch {} }
  await ensureLang(S.lang);
  render(`<div class="center"><form id="f" class="narrow panel" novalidate><h1>${esc(t('welcome'))}, ${esc(info.display_name)}</h1>
    <p class="muted">${esc(t('username'))}: <b>${esc(info.username)}</b> · ${esc(t('role_' + info.role))}${info.environment === 'test' ? ' · <span class="chip test">TEST</span>' : ''}</p>
    <label for="p">${esc(t('new_password'))}<span class="hint">${esc(t('pw_rule'))}</span></label>${pwField('new-password', ' minlength="10"')}
    <div class="actions"><button class="btn block">${esc(t('set_password'))}</button></div>${langSelect()}</form></div>`);
  bindLang(); bindPwShow();
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    try { const r = await api('POST', '/api/invite/accept', { token, password: $('#p').value, device_id: deviceId() }); resetUserState(); /* evtl. im Tab angemeldete andere Person: Sprache ging sonst verloren (user_mismatch), Ansichtszustand wurde vererbt (20.10.2026) */ if (r.second_factor) { viewLoginCode(r.challenge); return; } await api('PATCH', '/api/me', { language: S.lang }).catch(() => {}); S.me = null; location.hash = '#/'; }
    catch (err) { toast(err.message, true); }
  };
}

export { viewInvite, viewSetup };
