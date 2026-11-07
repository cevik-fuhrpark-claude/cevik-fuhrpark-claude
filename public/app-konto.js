// [CLAUDE] AUTOMATISCH ERZEUGT durch scripts/build-app.mjs aus public/app.js – nicht von Hand bearbeiten (Code in app.js ändern, dann npm run build)
import { $, S, SEND_TIMEOUT_MS, afterLogin, api, bindLang, bindPwShow, deviceId, ensureLang, esc, fmtDT, langSelect, lostDup, lostMark, pwField, qrSvg, render, resetUserState, t, toast, viewLogin } from './app-main.js';

// Zweiter Schritt: Code aus der Authenticator-App oder Ersatzcode (Passwort bleibt nicht im Speicher der Seite)
async function viewLoginCode(challenge) {
  render(`<div class="center"><form id="f2" class="narrow panel">
    <h1>${esc(t('tf_title'))}</h1><p class="small">${esc(t('tf_login_hint'))}</p>
    <label for="tc">${esc(t('tf_code_or_rc'))}</label><input id="tc" autocomplete="one-time-code" inputmode="text" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="14" required>
    <div class="actions"><button class="btn block">${esc(t('tf_confirm'))}</button></div>
    <p class="small"><a href="#/login" id="tback">${esc(t('tf_back'))}</a></p>
  </form></div>`);
  const inp = $('#tc'); inp.focus();
  $('#tback').onclick = (e) => { e.preventDefault(); viewLogin(); };
  $('#f2').onsubmit = async (e) => {
    e.preventDefault();
    try {
      const r = await api('POST', '/api/login/totp', { challenge, code: inp.value.trim(), device_id: deviceId() });
      if (r.recovery_left !== undefined) toast(t('tf_rc_used').replace('{n}', r.recovery_left));
      afterLogin();
    } catch (err) {
      toast(err.message, true);
      if (err.code === 'totp_expired' || err.code === 'locked') viewLogin(); else { inp.value = ''; inp.focus(); }
    }
  };
}
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
    try { const r = await api('POST', '/api/invite/accept', { token, password: $('#p').value, device_id: deviceId() }); resetUserState(); /* evtl. im Tab angemeldete andere Person: Sprache ging sonst verloren (user_mismatch), Ansichtszustand wurde vererbt (20.10.2026) */ if (r.second_factor) { await viewLoginCode(r.challenge); return; } await api('PATCH', '/api/me', { language: S.lang }).catch(() => {}); S.me = null; location.hash = '#/'; }
    catch (err) { toast(err.message, true); }
  };
}
// Mein Konto → Zwei-Faktor-Anmeldung: Status, Einrichten (QR + Schlüssel), Ersatzcodes einmalig, neue Ersatzcodes, Ausschalten
const rcBlock = (codes, extra = '') => `<div class="panel good" id="rcbox"><h3>${esc(t('tf_rc_title'))}</h3><p class="small">${esc(t('tf_rc_hint'))}${extra ? ' ' + esc(extra) : ''}</p>
  <ul class="rclist" style="font-family:monospace;font-size:1.1em;columns:2;list-style:none;padding:0">${codes.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
  <div class="actions noprint"><button type="button" class="btn secondary" id="rccp">${esc(t('copy'))}</button></div></div>`;
function wireRc(codes) {
  const cp = $('#rccp'); if (cp) cp.onclick = async () => { try { await navigator.clipboard.writeText(codes.join('\n')); toast(t('copied')); } catch { toast(codes.join(' ')); } };
}
// Chip „2FA“ in der Überschrift folgt dem Zustand (vorher erst nach erneutem Öffnen von „Mehr“, 19.10.2026)
function tfChip() { const c = $('#tfchip'); if (c) c.hidden = !S.me.totp_enabled; }
async function loadTotp() {
  const box = $('#tfabox'); if (!box) return;
  const st = await api('GET', '/api/me/totp');
  S.me.totp_enabled = st.enabled; tfChip();
  if (!box.isConnected) return; // Ansicht inzwischen gewechselt
  if (!st.enabled) {
    box.innerHTML = `<p class="small">${esc(t('tf_intro'))}</p><p><span class="chip">${esc(t('tf_off'))}</span></p>
      <form id="tfs"><label for="tfpw">${esc(t('tf_pw'))}</label><input id="tfpw" type="password" autocomplete="current-password" required><div class="actions"><button class="btn secondary">${esc(t('tf_start'))}</button></div></form><div id="tfstep"></div>`;
    $('#tfs').onsubmit = async (e) => {
      e.preventDefault();
      try {
        const r = await api('POST', '/api/me/totp/setup', { password: $('#tfpw').value }, { timeoutMs: SEND_TIMEOUT_MS }); // Backlog 805k: Wiederholung erzeugt nur einen neuen, noch nicht genutzten Schlüssel
        $('#tfpw').value = ''; $('#tfs').hidden = true;
        const key = r.secret.replace(/(.{4})/g, '$1 ').trim();
        $('#tfstep').innerHTML = `<p class="small">${esc(t('tf_scan'))}</p><div class="qr">${(() => { try { return qrSvg(r.uri, { label: t('tf_title') }); } catch { return ''; } })()}</div>
          <p class="small">${esc(t('tf_key'))}: <code style="word-break:break-all">${esc(key)}</code></p>
          <form id="tfe"><label for="tfc">${esc(t('tf_code'))}</label><input id="tfc" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9 ]{6,7}" maxlength="7" required><div class="actions"><button class="btn">${esc(t('tf_enable'))}</button><button type="button" class="btn secondary" id="tfx">${esc(t('tf_cancel'))}</button></div></form>`;
        $('#tfx').onclick = () => loadTotp();
        $('#tfe').onsubmit = async (ev) => {
          ev.preventDefault();
          try {
            const x = await api('POST', '/api/me/totp/enable', { code: $('#tfc').value.trim() }, { timeoutMs: SEND_TIMEOUT_MS });
            S.me.totp_enabled = true; tfChip();
            box.innerHTML = rcBlock(x.recovery_codes, t('tf_others_ended')) + `<div class="actions"><button type="button" class="btn" id="tfdone">OK</button></div>`;
            wireRc(x.recovery_codes);
            $('#tfdone').onclick = () => loadTotp();
          } catch (err) {
            // Backlog 805k (Funkloch): eingeschaltet, aber die Antwort mit den Ersatzcodes ging verloren → Hinweis, neue Ersatzcodes zu erzeugen
            if (lostDup(ev.target, {}, err, ['totp_already'])) { S.me.totp_enabled = true; tfChip(); toast(t('tf_saved_before_rc'), true); loadTotp(); return; }
            lostMark(ev.target, {}, err); toast(err.message, true);
          }
        };
      } catch (err) { toast(err.message, true); }
    };
    return;
  }
  box.innerHTML = `<p><span class="chip ok">${esc(t('tf_on').replace('{d}', fmtDT(st.enabled_at)))}</span> <span class="small ${st.recovery_left <= 2 ? '' : 'muted'}">${esc(t('tf_rc_left').replace('{n}', st.recovery_left))}</span></p>
    <details><summary>${esc(t('tf_rc_new'))}</summary><form id="tfr"><p class="small muted">${esc(t('tf_rc_new_hint'))}</p><label for="tfrc">${esc(t('tf_code'))}</label><input id="tfrc" inputmode="numeric" autocomplete="one-time-code" maxlength="7" required><div class="actions"><button class="btn secondary">${esc(t('tf_rc_new'))}</button></div></form></details>
    <details id="tfmv"><summary>${esc(t('tf_move'))}</summary><form id="tfm"><p class="small muted">${esc(t('tf_move_hint'))}</p><label for="tfmpw">${esc(t('tf_pw'))}</label><input id="tfmpw" type="password" autocomplete="current-password" required><label for="tfmc">${esc(t('tf_code_or_rc'))}</label><input id="tfmc" autocomplete="one-time-code" autocapitalize="none" maxlength="14" required><div class="actions"><button class="btn secondary">${esc(t('tf_move'))}</button></div></form><div id="tfmstep"></div></details>
    <details><summary>${esc(t('tf_disable'))}</summary><form id="tfd"><label for="tfdpw">${esc(t('tf_pw'))}</label><input id="tfdpw" type="password" autocomplete="current-password" required><label for="tfdc">${esc(t('tf_code_or_rc'))}</label><input id="tfdc" autocomplete="one-time-code" autocapitalize="none" maxlength="14" required><div class="actions"><button class="btn danger">${esc(t('tf_disable'))}</button></div></form></details>
    <div id="tfout"></div>`;
  $('#tfr').onsubmit = async (e) => {
    e.preventDefault();
    try { const x = await api('POST', '/api/me/totp/recovery-codes', { code: $('#tfrc').value.trim() }, { timeoutMs: SEND_TIMEOUT_MS }); $('#tfout').innerHTML = rcBlock(x.recovery_codes); wireRc(x.recovery_codes); $('#tfrc').value = ''; }
    catch (err) { toast(err.message, true); }
  };
  // Backlog 1022: Authenticator-App auf ein neues Handy übertragen (2FA bleibt eingeschaltet)
  $('#tfm').onsubmit = async (e) => {
    e.preventDefault();
    try {
      const r = await api('POST', '/api/me/totp/move', { password: $('#tfmpw').value, code: $('#tfmc').value.trim() }, { timeoutMs: SEND_TIMEOUT_MS }); // Wiederholung erzeugt nur einen neuen, noch nicht genutzten Schlüssel
      $('#tfmpw').value = ''; $('#tfmc').value = ''; $('#tfm').hidden = true;
      const key = r.secret.replace(/(.{4})/g, '$1 ').trim();
      $('#tfmstep').innerHTML = `${r.recovery_left !== undefined ? `<p class="small" role="note">${esc(t('tf_move_rc_used').replace('{n}', r.recovery_left))}</p>` : ''}<p class="small">${esc(t('tf_move_scan'))}</p><div class="qr">${(() => { try { return qrSvg(r.uri, { label: t('tf_title') }); } catch { return ''; } })()}</div>
        <p class="small">${esc(t('tf_key'))}: <code style="word-break:break-all">${esc(key)}</code></p>
        <form id="tfmf"><label for="tfmn">${esc(t('tf_code'))}</label><input id="tfmn" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9 ]{6,7}" maxlength="7" required><div class="actions"><button class="btn">${esc(t('tf_move_finish'))}</button><button type="button" class="btn secondary" id="tfmx">${esc(t('tf_cancel'))}</button></div></form>`;
      $('#tfmx').onclick = () => loadTotp();
      $('#tfmf').onsubmit = async (ev) => {
        ev.preventDefault();
        try {
          await api('POST', '/api/me/totp/move/finish', { code: $('#tfmn').value.trim() }, { timeoutMs: SEND_TIMEOUT_MS });
          box.innerHTML = `<div class="panel ok small" role="status" id="tfmok">${esc(t('tf_move_done'))} <a href="#/more?o=sess" id="tfmkd">${esc(t('kd_title'))} ›</a></div><div class="actions"><button type="button" class="btn" id="tfdone">OK</button></div>`; // altes Handy dort „Vergessen“
          $('#tfdone').onclick = () => loadTotp();
        } catch (err) {
          // Funkloch: übertragen, aber die Antwort ging verloren → Wiederholung meldet totp_no_move
          if (lostDup(ev.target, {}, err, ['totp_no_move'])) { toast(t('saved_before')); loadTotp(); return; }
          lostMark(ev.target, {}, err); toast(err.message, true);
        }
      };
    } catch (err) { toast(err.message, true); }
  };
  $('#tfd').onsubmit = async (e) => {
    e.preventDefault();
    const tfd = e.target; try { await api('POST', '/api/me/totp/disable', { password: $('#tfdpw').value, code: $('#tfdc').value.trim() }, { timeoutMs: SEND_TIMEOUT_MS }); S.me.totp_enabled = false; tfChip(); toast('✓'); loadTotp(); }
    catch (err) { /* Backlog 805k (Funkloch): Wiederholung → totp_off */ if (lostDup(tfd, {}, err, ['totp_off'])) { S.me.totp_enabled = false; tfChip(); toast(t('saved_before')); loadTotp(); return; } lostMark(tfd, {}, err); toast(err.message, true); }
  };
}

export { loadTotp, viewInvite, viewLoginCode, viewSetup };
