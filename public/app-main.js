// [CLAUDE] AUTOMATISCH ERZEUGT durch scripts/build-app.mjs aus public/app.js – nicht von Hand bearbeiten (Code in app.js ändern, dann npm run build)
// [CLAUDE] Cevik Fuhrpark – Oberfläche (ohne Framework, mobil zuerst)
import { caseDescText, stockNoteText } from './check-labels.js';
import { STRINGS, PLURALS, CHECK_LABELS, translateValidation, deLimitText, translateImportReason, translateNextAction, translateLockReason, auditActionLabel, auditDetailText, loadLang, langLoaded, loadHelp, helpLoaded } from './i18n-core.js';
// Backlog 588: Texte je Sprache als eigenes Paket (scripts/build-i18n.mjs aus i18n.js); geladen wird nur das der aktiven Sprache
import { findingMessage, posWord } from './finding-messages.js';
import { svg as qrSvg } from './qr.js';
import { dataQualityCsv, dqDetailText, defectItemsCsv, defectVehiclesCsv, agentFindingsCsv, usersCsv, sortUsers, filterUsers, isUnusedUser, inviteExpired, readCsvFile as readCsvRaw } from './csv.js';
import { helpMatches, helpNorm } from './help.js';
import { BUILD_VERSION } from './build-version.js';
import { federalHoliday, STATES } from './holidays.js';
import { reachableNow, dayRanges, coverageGaps, windowsOf, MORE_MAX, nextOpen, tzDiff, nextOpenLocal, holidayGaps } from './emhours.js';

// Sprache: gespeicherte Wahl, sonst Gerätesprache (Ukrainisch/Englisch), sonst Deutsch
// Backlog 381: alle bevorzugten Sprachen des Geräts in Reihenfolge prüfen (z. B. ru-RU, uk-UA → uk; vorher nur die erste → Deutsch)
const deviceLang = () => { let ls = []; try { ls = [...(navigator.languages || []), navigator.language || '']; } catch { ls = [navigator.language || '']; } for (const x of ls) { const l = String(x || '').toLowerCase(); if (l.startsWith('uk')) return 'uk'; if (l.startsWith('en')) return 'en'; if (l.startsWith('de')) return 'de'; } return 'de'; };
// Sortierwahl je Gerät/Tab merken (nur erlaubte Werte, sonst Standard; Speicher kann fehlen oder werfen)
const sortPref = (key, allowed, def, set) => { const k = 'cfp_sort_' + key; if (set !== undefined) { try { sessionStorage.setItem(k, set); } catch {} return set; } let v = ''; try { v = sessionStorage.getItem(k) || ''; } catch {} return allowed.includes(v) ? v : def; };
const CASE_SORTS = ['priority', 'oldest', 'updated'], VEH_SORTS = ['plate', 'next_due', 'km_due', 'check_oldest', 'km_desc', 'findings'];
let lastActivity = Date.now(), lastApiAt = 0, idleBusy = false; // Leerlauf-Abmeldung (siehe noteActivity)
// CSV-Datei lesen; gemischte Zeichenkodierung → Meldung in der App-Sprache (unbehandelte Ablehnung mit status → Toast)
const readCsvFile = async (f) => { try { return await readCsvRaw(f); } catch (e) { if (e && (e.code === 'csv_mixed_encoding' || e.code === 'csv_unknown_encoding')) e.message = t(e.code); throw e; } };

const S = { me: null, meta: null, lang: (() => { try { return localStorage.getItem('cfp_lang') || deviceLang(); } catch { return deviceLang(); } })(), viewEnv: null, unread: 0 };
// Sprachpaket vor dem ersten Bild (Backlog 588): route() wartet darauf. Bewusst ohne Top-Level-await – sonst liefen der Rest dieses
// Moduls (u. a. die hashchange-Anmeldung) erst nach dem Paket, und das Ereignis „load“ käme vor der fertigen App (UI-Test rot).
// Fehlt das Paket (offline gewählte Sprache, nicht im Cache), gilt eine andere Sprache; fehlen alle, meldet der Start-Wächter den Ladefehler.
if (!['de', 'uk', 'en'].includes(S.lang)) S.lang = 'de';
window.__cfpLoading = true; // Start-Wächter: Module da, Sprachpaket lädt noch (langsame Verbindung ≠ Ladefehler)
const langReady = loadLang(S.lang).catch(async (e) => {
  for (const l of ['de', 'uk', 'en']) if (l !== S.lang) { try { await loadLang(l); S.lang = l; return; } catch { /* nächste */ } }
  window.__cfpLoading = false; window.dispatchEvent(new Event('error')); throw e;
});
langReady.then(() => { window.__cfpBooted = true; }, () => {}); // Module und Sprachpaket geladen – Start-Wächter (boot.js) bleibt still
// Sprache gewechselt (Auswahl, Konto, Einladung): Paket nachladen; scheitert das (offline ohne Cache), bleibt die bisherige Sprache
const ensureLang = async (l) => { if (langLoaded(l)) return true; try { await loadLang(l); return true; } catch { if (S.lang === l) S.lang = ['de', 'uk', 'en'].find(langLoaded) || 'de'; return false; } };
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
// Name einer Person; für Lesezugriff ausgeblendete Fahrernamen (Server setzt <feld>_hidden) als Hinweistext
const pnm = (name, hidden) => (hidden ? t('name_hidden_driver') : name);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// [CLAUDE] Kalenderdatum in Berlin wie der Server („heute“, Fristen, Monate) – nicht UTC (nachts bis 2 Uhr Vortag) und nicht Gerätezeitzone
const BERLIN_FMT = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' });
// Zeitpunkt (UTC) → Berliner Ortszeit für <input type="datetime-local"> (JJJJ-MM-TTTHH:MM), z. B. Tatzeit ändern (23.10.2026)
const BERLIN_DT_FMT = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const berlinLocalDT = (iso) => { const d = new Date(iso || ''); return Number.isNaN(d.getTime()) ? '' : BERLIN_DT_FMT.format(d).replace(' ', 'T'); };
// Kalendertage addieren (18.10.2026: vorher 24-h-Blöcke – nachts nach der Herbst-Umstellung war bDate(7) ein Tag zu früh)
// [CLAUDE] Uhr des Geräts weicht ab (22.10.2026, Fund „falsch gehende Geräteuhr“): Abweichung zur Serverzeit aus dem Date-Kopf
// jeder API-Antwort (Service Worker speichert /api/ nie zwischen). Unter 2 Min. gilt sie als 0 (Übertragungszeit, Sekundenauflösung).
// „Heute“ (Datumsvorbelegungen, Fälligkeiten, „Heute zu tun“), „Agent veraltet“ und Altersangaben rechnen mit der Serverzeit.
let clockSkew = 0;
const nowMs = () => Date.now() + clockSkew;
function clockSample(hdr, t0, t1) {
  const s = Date.parse(hdr || ''); if (!Number.isFinite(s) || t1 - t0 > 10000) return; // langsame Antwort: ungenau
  const d = s + 500 - (t0 + t1) / 2; const nv = Math.abs(d) > 120000 ? Math.round(d) : 0;
  const was = Math.abs(clockSkew) > 300000; clockSkew = nv; if (was !== (Math.abs(nv) > 300000) || was) clockWarn();
}
// Hinweis ab 5 Min. Abweichung (Fehlbedienung sichtbar machen; Daten bleiben richtig, weil Server bzw. Korrektur rechnen)
function clockText() {
  const m = Math.round(Math.abs(clockSkew) / 60000); if (m < 5) return '';
  const span = m >= 90 ? (m >= 2880 ? t('clock_days').replace('{n}', Math.round(m / 1440)) : t('clock_hours').replace('{n}', Math.round(m / 60))) : t('clock_minutes').replace('{n}', m);
  return t(clockSkew > 0 ? 'clock_behind' : 'clock_ahead').replace('{d}', span);
}
function clockWarn() {
  if (typeof document === 'undefined') return;
  const txt = clockText(); let el = document.querySelector('.clockband');
  if (!txt || !S.me) { if (el) el.remove(); return; }
  if (!el) { const at = document.querySelector('.testband') || document.querySelector('.topbar'); if (!at) return; el = document.createElement('div'); el.className = 'clockband'; el.setAttribute('role', 'status'); at.after(el); }
  if (el.textContent !== txt) el.textContent = txt;
}

const bDate = (days = 0) => { const t = BERLIN_FMT.format(new Date(nowMs())); if (!days) return t; const [y, m, d] = t.split('-').map(Number); const x = new Date(Date.UTC(y, m - 1, d + days)); return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`; };
// frühestes Arbeitsdatum wie im Server: 12 Monate vor dem Meldetag (29.02. → 28.02.)
const workDateMin = (iso) => { const d = BERLIN_FMT.format(new Date(iso)); const y = `${Number(d.slice(0, 4)) - 1}${d.slice(4)}`; return y.endsWith('-02-29') ? y.slice(0, 8) + '28' : y; };

const t = (k) => (STRINGS[S.lang] && STRINGS[S.lang][k]) || STRINGS.de[k] || k;
// Leere Liste: Text statt nacktem „–“ (Teilagent „Erster Tag der Fuhrparkleitung“, 22.10.2026)
const noneP = () => `<p class="muted" data-none>${esc(t('no_entries'))}</p>`;
// Prüf-/Wartungsarten: gespeichert wird der deutsche Name (Server, CSV, Agent); angezeigt in der App-Sprache. HU/SP/UVV sind Fachkürzel.
const MK_KEYS = { Tachograph: 'tacho', 'Ölwechsel': 'oil', Inspektion: 'service', Bremsen: 'brakes', Reifen: 'tires', 'Hydraulik/Aufbau': 'hydraulics', 'Feuerlöscher': 'extinguisher', Verbandkasten: 'firstaid', Ladungssicherung: 'loadsec', Ladebordwand: 'taillift', Ladekran: 'crane', 'Kühlgerät': 'reefer', 'ATP-Bescheinigung': 'atp', Temperaturschreiber: 'templog', 'Rückruf': 'recall', Sonstiges: 'other' };
// Backlog 577: Prüfart mit Titel („Sonstiges – Ladebordwand Prüfbuch“); ohne Titel nur die Art
const mkR = (r) => mk(r.kind) + (r && r.title ? ' – ' + r.title : '');
const mk = (k) => (MK_KEYS[k] ? t('mk_' + MK_KEYS[k]) : k);
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
// Zeitpunkte immer in Berliner Zeit wie Server, Fristen und CSV (ein Gerät auf Kyjiwer Zeit zeigte sonst eine Stunde mehr –
// z. B. Tatzeit im Bußgeld ≠ Schreiben). Formatierer je Sprache einmal erzeugt (Listen mit Hunderten Zeitstempeln).
const DT_FMT = {};
// Zahlen, Beträge und Datumsangaben im Format der Oberflächensprache (Eingabefelder akzeptieren weiter Komma und Punkt)
const locOf = (l) => (l === 'uk' ? 'uk-UA' : l === 'en' ? 'en-GB' : 'de-DE');
const uiLoc = () => locOf(S.lang);
const fmtNum = (x, o) => Number(x).toLocaleString(uiLoc(), o);
// Einheit „Stk“ (Standard) in der Oberflächensprache anzeigen; gespeichert bleibt „Stk“, freie Einheiten unverändert.
const unitL = (u) => (/^(stk\.?|stück|pcs\.?|шт\.?)$/i.test(String(u ?? '').trim()) ? t('unit_pcs') : (u ?? ''));
// Cent-Rundung wie der Server (`roundCents` in src/util.js): kaufmännisch, symmetrisch, ohne Gleitkommafehler (1,015 → 1,02)
const rc2 = (n) => { const x = Number(n); return Number.isFinite(x) ? Math.sign(x) * Math.round(Number((Math.abs(x) * 100).toFixed(6))) / 100 + 0 : x; };
// „3 Tage“ / „1 Tag“ / „3 дні“ / „5 днів“ / „1 day“ – Pluralform der Oberflächensprache (Intl.PluralRules), Zahl im Sprachformat
const nDays = (n) => { let k = 'other'; try { k = new Intl.PluralRules(uiLoc()).select(Number(n)); } catch { /* alte Browser */ } return `${fmtNum(n)} ${t('days_' + k) !== 'days_' + k ? t('days_' + k) : t('days')}`; };
// Zähltext in der Pluralform der Oberflächensprache („1 Hinweis“ / „3 Hinweise“, „3 заявки“ / „5 заявок“); Zahl im Sprachformat.
// Varianten in PLURALS (i18n.js); fehlt Sprache/Form, gilt der Grundtext. Weitere Platzhalter ersetzt der Aufrufer.
const tn = (k, n) => { let c = 'other'; try { c = new Intl.PluralRules(uiLoc()).select(Number(n)); } catch { /* alte Browser */ } const p = (PLURALS[S.lang] || {})[k]; return ((p && (p[c] || p.other || p.many)) || t(k)).replace('{n}', fmtNum(n)); };
// Monat „JJJJ-MM“ als „Oktober 2026“ in der Oberflächensprache (ohne Tag – zweistellige Vorgabe betrifft nur Tagesdaten)
// Zahl als Vorbelegung eines Eingabefelds: Dezimalkomma in DE/UK, Punkt in EN (19.10.2026: EN-Felder kamen mit Komma)
const decIn = (x) => (S.lang === 'en' ? String(x) : String(x).replace('.', ','));
const fmtMonth = (ym) => new Intl.DateTimeFormat(uiLoc(), { year: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(ym + '-15T12:00:00Z'));
// Datum immer zweistellig (TT.MM.JJJJ bzw. TT/MM/JJJJ): „de-DE“ ohne Vorgabe schreibt „1.1.2027“ – fiel erst an Tagen/Monaten < 10 auf
// (Zeitreise der Oberfläche 15.10.2026). Gleiche Optionen für den Fahrer-Aushang (`dateOpts`).
const dateOpts = (timeZone) => ({ day: '2-digit', month: '2-digit', year: 'numeric', timeZone });
// Zeitstempel mit vierstelligem Jahr wie Kalenderdaten und Protokoll-Details (21.10.2026: DE/UK druckten „21.10.26, 14:27“)
const dtFmt = (kind) => { const loc = uiLoc(); const k = kind + loc; return DT_FMT[k] || (DT_FMT[k] = new Intl.DateTimeFormat(loc, kind === 'dt' ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Berlin' } : dateOpts(kind === 'd' ? 'Europe/Berlin' : 'UTC'))); };
// Ziel beim Tippen auf einen Hinweis – gleiche Regel wie im Service Worker (Push-Klick): Vorgang, Bezug (Fahrzeugakte/Bußgeld), Anmelde-Hinweis → Meine Anmeldungen
// Link eines Agentenbefunds: Vorgang, sonst bei Bußgeldbefunden das Schreiben (subject_key = Bußgeld-ID; vorher kein Link bzw. nur zur Fahrzeugakte, 20.10.2026)
// 20.10.2026: Fahrerbefunde (Nachweise, Führerscheinkontrolle, Fahrerkarte; Betreff „<Fahrer-ID>|…“) → Fahrerakte, Lagerbefunde → Artikel (vorher ohne Link)
const AF_DRIVER = /^(DRIVER_DOC_|LICENSE_CHECK_|TACHO_CARD_)/;
const afLink = (caseId, code, subj) => { const c = String(code || ''); const d = (h, attr) => `<a href="${h}"${attr}>${esc(t('details'))}</a>`;
  if (caseId) return d(`#/cases/${esc(caseId)}`, '');
  if (!subj) return '';
  if (c.startsWith('FINE_')) return d(`#/fines/${encodeURIComponent(subj)}`, ' data-afine');
  const did = String(subj).split('|')[0];
  if (AF_DRIVER.test(c) && isMgr()) return d(`#/drivers/${encodeURIComponent(did)}`, ' data-adriver');
  if (c.startsWith('STOCK_')) return d(`#/stock/${encodeURIComponent(subj)}`, ' data-astock');
  return ''; };
const notifHref = (x) => { const m = /^(vehicle|fine):(.+)$/.exec(x.ref || ''); return x.case_id ? '#/cases/' + encodeURIComponent(x.case_id) : m ? (m[1] === 'vehicle' ? '#/vehicles/' + encodeURIComponent(m[2]) : '#/fines/' + encodeURIComponent(m[2])) : x.kind === 'new_login' ? '#/more?o=sess' : S.me.role === 'driver' ? '#/' : isMgr() ? '#/master' : '#/'; };
// Standort-Schlüssel wie der Server (siteKey): Leerraum vereinheitlicht, Groß-/Kleinschreibung egal (23.10.2026)
const siteKeyUi = (x) => (x && String(x).trim() ? String(x).normalize('NFC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('de') : 'ohne');
// HH:MM ist in DE/UK/EN gleich (24 h) – ein fester Formatierer genügt
const HM_FMT = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
// nur Uhrzeit (Berlin) – Bildunterschriften der Vorgangsdateien: Datum und Uhrzeit in zwei Zeilen, damit die Uhrzeit nicht abgeschnitten wird
const fmtHM = (iso) => { const d = new Date(iso || ''); return Number.isNaN(d.getTime()) ? '' : HM_FMT.format(d); };
const fmtDT = (iso) => { if (!iso) return '–'; const d = new Date(iso); return Number.isNaN(d.getTime()) ? '–' : dtFmt('dt').format(d); };
// Kalenderdatum „JJJJ-MM-TT“ bleibt dieser Tag; Zeitstempel → Berliner Kalendertag
const fmtD = (iso) => { if (!iso) return '–'; const d = new Date(iso.length === 10 ? iso + 'T12:00:00Z' : iso); return Number.isNaN(d.getTime()) ? '–' : dtFmt(iso.length === 10 ? 'd10' : 'd').format(d); };
// Schadenzeitpunkt laut Meldung (Backlog 285): „JJJJ-MM-TT“ = Tag ohne Uhrzeit, sonst Zeitpunkt (deutsche Zeit)
const fmtOccurred = (x) => (!x ? '–' : x.length === 10 ? fmtD(x) : fmtDT(x));
// Eingabe Tag + optionale Uhrzeit (deutsche Zeit wie die Tatzeit bei Bußgeldern); cur = gespeicherter Wert
const occurredFields = (cur, named = false) => { const dt = cur && cur.length > 10 ? berlinLocalDT(cur) : ''; const dv = cur ? (dt ? dt.slice(0, 10) : cur) : ''; const tv = dt ? dt.slice(11, 16) : '';
  return `<div class="grid2" data-occ><div><label for="occd">${esc(t('occ_date'))}<span class="hint">${esc(t('occ_date_hint'))}</span></label><input type="date" id="occd"${named ? ' name="occ_date"' : ''} max="${bDate()}" value="${esc(dv)}"></div><div><label for="occt">${esc(t('occ_time'))}<span class="hint">${esc(t('occ_time_hint'))}</span></label><input type="time" id="occt"${named ? ' name="occ_time"' : ''} step="60" value="${esc(tv)}"></div></div>`; };
// Wert für den Server: '' (leer), Tag oder Tag + Uhrzeit; Uhrzeit ohne Tag → undefined (Formularfehler)
const occurredValue = (dv, tv) => (!dv ? (tv ? undefined : '') : tv ? `${dv}T${tv}` : dv);
// Antwortfrist mit Wochentag; Samstag/Sonntag markiert (Frist bleibt der Tag laut Schreiben – nur Hinweis, dass davor kein Arbeitstag folgt)
const isWeekendD = (iso) => !!iso && iso.length === 10 && [0, 6].includes(new Date(iso + 'T12:00:00Z').getUTCDay());
// Erfassungstag einer Kostenposition (Teil/Fremdleistung) – danach zählt sie im Kostenbericht (Backlog 188: Dezember-Rechnung am 02.01. erfasst = Januar)
const bookedAt = (iso) => (iso ? `<br><span class="small muted" title="${esc(t('cost_booked_hint'))}">${esc(t('cost_booked'))} ${fmtD(iso)}</span>` : '');

// bundesweiter gesetzlicher Feiertag (Backlog 267, public/holidays.js): Name in der Oberflächensprache oder ''
const holName = (iso) => { const h = federalHoliday(iso); return h ? t('hol_' + h) : ''; };
const fmtDue = (iso) => { if (!iso || iso.length !== 10) return fmtD(iso); const d = new Date(iso + 'T12:00:00Z'); if (Number.isNaN(d.getTime())) return '–'; const k = 'wd' + uiLoc(); const wd = (DT_FMT[k] || (DT_FMT[k] = new Intl.DateTimeFormat(uiLoc(), { weekday: 'short', timeZone: 'UTC' }))).format(d); return `${wd} ${fmtD(iso)}${holName(iso) ? ' (' + holName(iso) + ')' : isWeekendD(iso) ? ' (' + t('due_weekend') + ')' : ''}`; };

// Eingabe der Antwortfrist: Hinweis, wenn der Tag auf ein Wochenende fällt (Frist wird nicht verschoben)
// Werkstatttermin von Hand gewählt (Backlog 269): Hinweis bei Wochenende/bundesweitem Feiertag – nichts wird verschoben
function offDayWatch(els) { for (const el of els) { if (!el || el.dataset.offW) continue; el.dataset.offW = '1'; const h = document.createElement('p'); h.className = 'small muted'; h.dataset.offday = ''; h.hidden = true; el.after(h); const upd = () => { const v = el.value; const x = holName(v) || (isWeekendD(v) ? t('due_weekend') : ''); h.hidden = !x; if (x) h.textContent = t('plan_offday_hint').replace('{d}', () => x); }; el.addEventListener('input', upd); el.addEventListener('change', upd); upd(); } }

const dqDetail = (i) => dqDetailText(i, t, fmtD, mk, { km: (n) => fmtKm(n), src: (v) => odoSrc(v) });
const hrs = (n) => (n === null || n === undefined ? '–' : fmtNum(Math.round(n * 100) / 100, { maximumFractionDigits: 2 }));
const EUR_FMT = {};
const eur = (n) => { if (n === null || n === undefined) return '–'; const l = uiLoc(); return (EUR_FMT[l] || (EUR_FMT[l] = new Intl.NumberFormat(l, { style: 'currency', currency: 'EUR', currencyDisplay: 'narrowSymbol' }))).format(n); };
// Ist-Kosten: ohne belegte Position, aber mit unbewerteten Positionen ist „0 €“ keine Aussage → „–“ (unbewertet ≠ 0 €)
const EUR3_FMT = {};
// Stückpreis mit bis zu 3 Nachkommastellen im Währungsformat der Sprache (EN „€45.90“, DE „45,90 €“) – 20.10.2026
const eur3 = (n) => { if (n === null || n === undefined) return '–'; const l = uiLoc(); return (EUR3_FMT[l] || (EUR3_FMT[l] = new Intl.NumberFormat(l, { style: 'currency', currency: 'EUR', currencyDisplay: 'narrowSymbol', minimumFractionDigits: 2, maximumFractionDigits: 3 }))).format(n); };
const eurIst = (o) => (o && o.valued_items === 0 && o.unvalued_items > 0 ? '–' : eur(o.actual_net));
// Datei-Links: Inhaber mit umgeschalteter Ansicht (Test/Betrieb) braucht die Umgebung als Parameter, da Links keine Header senden
const fileUrl = (id) => `/api/files/${encodeURIComponent(id)}${S.viewEnv && S.me && S.me.role === 'owner' ? '?env=' + encodeURIComponent(S.viewEnv) : ''}`;
const isMgr = () => S.me && ['owner', 'fleet'].includes(S.me.role);

function plate(p, opts = {}) {
  const txt = esc(p || '—');
  return `<span class="plate${opts.big ? ' big' : ''}${opts.locked ? ' locked' : ''}" aria-label="${esc(t('plate_label'))} ${txt}"><span class="eu">D</span><span class="num">${txt}</span></span>`;
}

// ---------- API ----------
async function api(method, path, body, extra = {}) {
  const headers = { 'x-cfp': '1', ...(extra.headers || {}), ...(extra.bg ? { 'x-cfp-bg': '1' } : {}) };
  // Zahlen werden nach der hier angezeigten Sprache gelesen (geteiltes Konto: andere Geräte können eine andere Sprache zeigen, 23.10.2026)
  if (S.lang && !headers['x-cfp-lang']) headers['x-cfp-lang'] = S.lang;
  // Hinweisliste/Zähler: Gerätekennung (nur gehasht verglichen), damit der Anmelde-Hinweis dieses Geräts nicht als ungelesen zählt (Backlog 226)
  if (method === 'GET' && path.startsWith('/api/notifications') && !headers['x-cfp-device']) { try { headers['x-cfp-device'] = deviceId(); } catch { /* ohne Kennung wie bisher */ } }
  if (S.viewEnv && S.me && S.me.role === 'owner') headers['x-cfp-env'] = S.viewEnv;
  // Postausgang: Umgebung, in der die Meldung erfasst wurde (Inhaber kann die Ansicht inzwischen gewechselt haben – 18.10.2026)
  if (extra.env && S.me && S.me.role === 'owner') headers['x-cfp-env'] = extra.env;
  // Änderungen nur für die Person, die das Formular/den Postausgang erstellt hat (anderer Tab, andere Anmeldung → 409 user_mismatch)
  // Postausgang einer bestimmten Person: Kennung auch dann mitsenden, wenn S.me inzwischen zurückgesetzt ist (Härtung 22.10.2026)
  if (method !== 'GET' && ((S.me && S.me.id) || extra.asUser) && !path.startsWith('/api/logout')) {
    headers['x-cfp-user'] = extra.asUser || S.me.id;
    // Umgebung, für die Formular/Postausgang gilt – Server weist bei inzwischen geänderter Kontoumgebung ab (env_mismatch, 21.10.2026)
    if (S.me && S.me.role !== 'owner' && (extra.env || S.me.environment)) headers['x-cfp-env-of'] = extra.env || S.me.environment;
  }
  let b = body;
  if (body !== undefined && !(body instanceof Blob) && !(body instanceof ArrayBuffer) && typeof body !== 'string') { b = JSON.stringify(body); headers['content-type'] = 'application/json'; }
  let res;
  if (!extra.bg) lastApiAt = Date.now(); // Hintergrund-Abfragen (Zahl am Glockensymbol) zählen nicht als Bedienung – auch serverseitig nicht (x-cfp-bg)
  // timeoutMs: Zeitlimit (Foto-Uploads) – ohne Antwort gilt die Anfrage als Netzabbruch (21.10.2026: „Lade Foto 2/5“ hing ohne Ende,
  // nach Neuladen fehlten die restlichen Fotos still); dann greift der Postausgang für die restlichen Fotos
  const sig = extra.timeoutMs && typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(extra.timeoutMs) : undefined;
  let t0 = Date.now();
  // Backlog 596/598: Vorabrufe aus boot.js (/api/me, dann /api/meta) – nur als erste API-Anfragen in genau dieser Reihenfolge übernommen;
  // jede abweichende Anfrage verwirft alle (nie eine veraltete Antwort, z. B. 401 von vor der Anmeldung)
  const preQ = window.__cfpPre, pre = preQ && preQ.shift();
  const usePre = !!pre && method === 'GET' && path === pre[0];
  if (!usePre || !preQ.length) window.__cfpPre = null;
  if (usePre) t0 = window.__cfpMeT0 || t0;
  try { res = usePre ? await pre[1] : await fetch(path, { method, headers, body: b, credentials: 'same-origin', ...(sig ? { signal: sig } : {}) }); }
  catch { const e = new Error(t('offline')); e.offline = true; throw e; }
  try { clockSample(res.headers.get('date'), t0, Date.now()); } catch {}
  // Hintergrund-Aufruf (Glocke, Postausgang, Netz wieder da) mit 401, während die Person etwas eingibt: nicht zur Anmeldung springen –
  // die Eingaben blieben sonst verloren; Hinweis einmal, beim Absenden sichert der 401-Weg sie im Postausgang (22.10.2026)
  if (res.status === 401 && (extra.bg || extra.keepDirty) && viewDirty()) {
    if (!S.authLostShown) { S.authLostShown = true; toast(t('session_lost_dirty'), true); }
    const e = new Error(t('err_unauthenticated')); e.status = 401; throw e;
  }
  // Sitzung am Server beendet (z. B. „alle anderen Anmeldungen beenden“, Ablauf): Offline-Daten der Person wie beim Abmelden entfernen
  // (22.10.2026: Fahrzeug-/Notfall-Zwischenspeicher blieben auf dem geteilten Tablet stehen)
  // Backlog 492 (Blickwinkel „QR-Aufkleber auf dem Hof scannen“): Sitzung bei offener App abgelaufen – das gescannte Fahrzeug (nur QR-Ziele, keine
  // Vorgänge der vorherigen Person auf geteilten Tablets) nach der Anmeldung wieder öffnen wie beim App-Start
  if (res.status === 401 && !path.startsWith('/api/login') && !path.startsWith('/api/invite') && !path.startsWith('/api/setup')) { const h0 = (location.hash || '').replace(/%3A/gi, ':'); resetUserState(); clearOfflineData(); markSession(''); if (/^#\/(new|check|v)\/VIN:[A-Z0-9]+$/.test(h0)) { try { sessionStorage.setItem('cfp_after_login', h0); } catch {} } location.hash = '#/login'; const e = new Error(t('err_unauthenticated')); e.status = 401; throw e; }
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : await res.blob();
  // Exporte mit Zeilengrenze melden die Begrenzung per Header (z. B. Vorgangs-CSV)
  if (data instanceof Blob && res.headers.get('x-cfp-truncated')) data.cfpTruncated = Number(res.headers.get('x-cfp-truncated')) || true;
  if (!res.ok) {
    // Häufige Fehler in der gewählten Sprache (Server-Texte sind deutsch): erst Code (err_*), sonst bekannter Text (Prüf- und Konfliktmeldungen); unbekannt: Server-Text
    const code = data && data.error;
    let tr = srvText(code, data && data.message);
    // Berechtigungsgrund statt nur „Keine Berechtigung“ (Server liefert denied/status, 21.10.2026) – auch Deutsch ohne Status-Codes
    if (code === 'forbidden' && data && typeof data.denied === 'string') { const fx = forbiddenText(data); if (fx) tr = fx; }
    // Lagerbestand: verfügbare Menge auch in UK/EN nennen (Server liefert sie als Zahl, 19.10.2026)
    if (code === 'insufficient_stock' && tr && data && typeof data.available === 'number') tr = t('err_insufficient_stock_q').replace('{q}', fmtNum(data.available)).replace('{u}', unitL(data.unit)) + (data.no_stock_hint ? ' ' + t('stock_no_stock_hint') : '');
    const e = new Error(tr || (data && data.message) || `${t('error')} ${res.status}`); e.code = code; e.status = res.status; e.data = data instanceof Blob ? null : data;
    // inzwischen andere Person angemeldet (anderer Tab): Stand neu laden – Eingaben/Postausgang bleiben auf dem Gerät erhalten
    if (code === 'user_mismatch' || code === 'env_mismatch') setTimeout(() => location.reload(), 2500);
    throw e;
  }
  // Fahrzeugstamm/Zuordnungen geändert → Offline-Fahrzeugliste auf diesem Gerät gleich auffrischen (20.10.2026)
  if (method !== 'GET' && VEH_CHANGE_RE.test(path)) setTimeout(() => vehCacheRefresh(true), 0);
  return data;
}
const VEH_CHANGE_RE = /^\/api\/(vehicles(\/import|\/[^/?]+\/(active|drivers))?|assignments\/[^/?]+)(\?|$)/;
// Server-Meldung (deutsch) in der aktuellen Oberflächensprache: erst Code (err_*), sonst bekannter Text; unbekannt → null
// 403 mit Grund aus dem Server (denied): Aktion/Status in der Oberflächensprache; unbekannter Grund → null
function forbiddenText(d) {
  const lb = (k, v) => { if (typeof v !== 'string' || !/^[a-z_]{1,40}$/.test(v)) return '–'; const x = t(k + v); return x === k + v ? '–' : x; }; // unbekannter Code → kein Rohcode
  const st = (k) => lb(k, d.status);
  if (d.denied === 'action_not_allowed') return t('err_action_not_allowed').replace('{a}', () => lb('act_', d.action)).replace('{s}', () => st('st_'));
  if (d.denied === 'inspection_not_allowed') return t('err_inspection_not_allowed').replace('{r}', () => t('st_in_reparatur')).replace('{s}', () => st('st_'));
  if (d.denied === 'fine_action_not_allowed') return t('err_fine_action_not_allowed').replace('{s}', () => st('fs_'));
  return null;
}
function srvText(code, msg) {
  if (code === 'validation' && S.lang === 'de') return deLimitText(msg); // Zahlgrenzen im deutschen Format („0,01“, „100.000“)
  // Höchstzahl Fahrzeugdokumente (z. B. gleichzeitiger Upload): Zahl nennen statt nur „Zu viele Dateien“ (19.10.2026)
  { const m = code === 'too_many' && /^Maximal (\d+) Dokumente je Fahrzeug/.exec(msg || ''); if (m && S.lang !== 'de') return t('docs_full').replace('{max}', m[1]); }
  // 403 mit eigener Begründung (z. B. „Nur der Inhaber darf …“): erst die bekannte Begründung, dann allgemein „Keine Berechtigung“ (21.10.2026)
  if (code === 'forbidden' && S.lang !== 'de') return translateValidation(S.lang, msg) || (STRINGS[S.lang] && STRINGS[S.lang].err_forbidden) || null;
  return (code && S.lang !== 'de' && ((STRINGS[S.lang] && STRINGS[S.lang]['err_' + code]) || translateValidation(S.lang, msg))) || null;
}

// [CLAUDE] Zeilenhinweise der Import-Vorschauen in der App-Sprache (Server liefert Deutsch)
const reasonText = (r) => { const x = translateImportReason(S.lang, r); return typeof x === 'string' ? x.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (d, y, m, dd) => (isCalDay(+y, +m, +dd) ? fmtD(d) : d)) : x; }; // ISO-Datum im Sprachformat (19.10.2026); ungültiges Datum (2026-02-30) bleibt wie in der Datei (vorher als 02.03.2026 angezeigt)
const isCalDay = (y, m, d) => { const x = new Date(Date.UTC(y, m - 1, d)); return m >= 1 && m <= 12 && x.getUTCFullYear() === y && x.getUTCMonth() === m - 1 && x.getUTCDate() === d; };


// Ansage nur für Screenreader (dauerhafte Live-Region wie bei toast, ohne sichtbaren Hinweis) – z. B. Trefferzahl nach einer Suche (22.10.2026)
function announce(msg) {
  let live = document.getElementById('live');
  if (!live) { live = document.createElement('div'); live.id = 'live'; live.className = 'sr-only'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); document.body.appendChild(live); }
  live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 50);
}
const announceHits = (n) => announce(n ? tn('search_hits_n', n) : t('search_no_hits'));
function toast(msg, err = false) {
  if (msg === '✓') msg = '✓ ' + t('saved_ok'); // nur „✓“ war für Screenreader/Ungeübte nichtssagend (21.10.2026)
  // dauerhafte Live-Region: eine erst mit dem Text eingefügte role=status wird von Screenreadern oft nicht angesagt
  let live = document.getElementById('live');
  if (!live) { live = document.createElement('div'); live.id = 'live'; live.className = 'sr-only'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); document.body.appendChild(live); }
  if (!err) { live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 50); }
  const el = document.createElement('div');
  el.className = 'toast' + (err ? ' err' : ''); el.dataset.at = String(Date.now());
  if (err) el.setAttribute('role', 'alert'); else el.setAttribute('aria-hidden', 'true'); // Erfolg sagt die Live-Region an (nicht doppelt)
  el.textContent = msg;
  // Fehler: nur einer gleichzeitig (keine übereinanderliegenden Meldungen), Anzeigedauer nach Textlänge (6–20 s, WCAG 2.2.1),
  // pausiert solange Finger/Maus darauf liegt, Antippen schließt
  if (err) document.querySelectorAll('.toast.err').forEach((x) => x.remove());
  const ms = err ? Math.min(20000, Math.max(6000, 2500 + String(msg).length * 60)) : 3000;
  let timer = setTimeout(() => el.remove(), ms);
  if (err) {
    el.title = t('tap_to_close');
    el.addEventListener('click', () => el.remove());
    el.addEventListener('pointerenter', () => clearTimeout(timer));
    el.addEventListener('pointerleave', () => { clearTimeout(timer); timer = setTimeout(() => el.remove(), 4000); });
  }
  document.body.appendChild(el);
}

// Fehlende/ungültige Angabe am Feld selbst kenntlich machen (Backlog 110, 21.10.2026): aria-invalid + aria-describedby auf einen
// sichtbaren Hinweis unter dem Feld/der Gruppe – der Toast verschwindet wieder, der Hinweis bleibt bis zur nächsten Eingabe
// Kennzeichen: deutsche Reihenfolge mit Ziffern als Zahl („SZ-YC 9“ < „SZ-YC 10“), wie der Server (plateCmp, 21.10.2026)
const plateCmp = (a, b) => String(a || '').localeCompare(String(b || ''), 'de', { numeric: true });
// Suchschlüssel: Trennzeichen wie bei Kennzeichen-Zuordnungen weglassen (Leerzeichen, Bindestrich, Punkt, Schrägstrich, Unterstrich, Gedankenstriche)
// NFC (zerlegte Umlaute) und kyrillische Buchstaben, die wie lateinische aussehen (ukrainische Tastatur: „SZ-YС 5513“ mit С kyrillisch),
// wie der Server (normPlate) – vorher fanden Fahrzeugliste, Fahrzeugauswahl und globale Suche nichts (22.10.2026). Beide Seiten gleich umgesetzt.
const SK_CYR = { 'а': 'a', 'в': 'b', 'е': 'e', 'к': 'k', 'м': 'm', 'н': 'h', 'о': 'o', 'р': 'p', 'с': 'c', 'т': 't', 'у': 'y', 'х': 'x', 'і': 'i' };
const searchKey = (x) => String(x || '').normalize('NFC').toLowerCase().replace(/[\s\-./_\u2010-\u2014\u202a-\u202e\u2066-\u2069]/g, '').replace(/[авекмнорстухі]/g, (c) => SK_CYR[c]);
function markInvalid(el, msg, after = el) {
  if (!el) return;
  const id = 'err_' + String(el.id || el.getAttribute('aria-labelledby') || el.getAttribute('name') || 'feld').replace(/[^\w-]/g, '_');
  let p = document.getElementById(id);
  if (!p) { p = document.createElement('p'); p.id = id; p.className = 'small fielderr'; after.insertAdjacentElement('afterend', p); }
  p.textContent = msg;
  el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', id);
  const clear = () => { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); p.remove(); el.removeEventListener('input', clear); el.removeEventListener('change', clear); };
  el.addEventListener('input', clear); el.addEventListener('change', clear);
}

// ---------- Rahmen ----------
const ICON = {
  home: '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  cases: '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/></svg>',
  plus: '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>',
  truck: '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 6h11v10H2zM13 9h4l4 4v3h-8z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>',
  bell: '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4"/></svg>',
  more: '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  search: '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  chart: '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
};

// Tab-Beschriftungen mit weichen Trennstellen (22.10.2026, Teilagent „kleine Handys“): ohne Trennwörterbuch brach der Browser mitten im Wort
// ohne Strich um („Managemen|t“, „Abfahrtskont|rolle“, „Повідоми|ти“); U+00AD trennt nur, wenn es nötig ist
const TAB_SHY = { Abfahrtskontrolle: 'Abfahrts\u00ADkontrolle', Kontrolle: 'Kon\u00ADtrolle', Management: 'Manage\u00ADment', 'Übersicht': 'Über\u00ADsicht', 'Vorgänge': 'Vor\u00ADgänge', Fahrzeuge: 'Fahr\u00ADzeuge',
  Overview: 'Over\u00ADview', Vehicles: 'Vehi\u00ADcles', 'Повідомити': 'Пові\u00ADдомити', 'Транспорт': 'Тран\u00ADспорт', 'Керівництво': 'Керів\u00ADництво', 'Перевірка': 'Пере\u00ADвірка', 'виїздом': 'ви\u00ADїздом', 'Заявки': 'Заяв\u00ADки' };
const tabShy = (label) => String(label).split(' ').map((w) => TAB_SHY[w] || w).join(' ');
function frame(content, active) {
  const env = S.me ? (S.viewEnv && S.me.role === 'owner' ? S.viewEnv : S.me.environment) : null;
  const tabs = [];
  tabs.push(['#/', 'home', t('nav_home'), 'home']);
  tabs.push(['#/cases', 'cases', t('nav_cases'), 'cases']);
  if (S.me.role !== 'viewer') tabs.push(['#/new', 'plus', t('nav_new'), 'new']);
  if (isMgr()) tabs.push(['#/master', 'chart', t('nav_master'), 'master']);
  else if (S.me.role !== 'driver') tabs.push(['#/vehicles', 'truck', t('nav_vehicles'), 'vehicles']);
  else tabs.push(['#/check', 'truck', t('nav_check_tab'), 'check', t('nav_check')]); // kurze Tab-Beschriftung (UK „Перевірка перед виїздом“ passte am 320-px-Handy nicht in 2 Zeilen, 23.10.2026)
  tabs.push(['#/more', 'more', t('nav_more'), 'more']);
  return `<a class="skip" href="#main">${esc(t('skip_to_content'))}</a>
  <header class="topbar">
    <div class="brand">CEVIK <span class="bn">${esc(t('app'))}</span> <small>[CLAUDE]</small></div>
    <div class="spacer"></div>
    ${S.me.role === 'owner' ? `<select id="envsel" aria-label="${esc(t('env_switch'))}"><option value="production"${env === 'production' ? ' selected' : ''}>${esc(t('env_prod'))}</option><option value="test"${env === 'test' ? ' selected' : ''}>${esc(t('env_testname'))}</option></select>` : ''}
    ${S.me.role !== 'driver' ? `<a href="#/search" class="tbicon" aria-label="${esc(t('search_title'))}" style="color:#fff">${ICON.search}</a>` : ''}
    <a href="#/inbox" class="tbicon" aria-label="${esc(bellLabel())}" style="position:relative;color:#fff">${ICON.bell}${S.unread ? `<span class="badge" aria-hidden="true" style="position:absolute;top:2px;right:0">${S.unread}</span>` : ''}</a>
  </header>
  ${env === 'test' ? `<div class="testband">${esc(t('env_test'))}</div>` : ''}
  ${clockText() ? `<div class="clockband" role="status">${esc(clockText())}</div>` : ''}
  <nav class="tabbar" aria-label="${esc(t('navigation'))}">${tabs.map(([href, icon, label, key, full]) => `<a href="${href}"${full && full !== label ? ` aria-label="${esc(full)}"` : ''} class="${key === active ? 'active' : ''}${key === 'new' ? ' report' : ''}"${key === active ? ' aria-current="page"' : ''}>${key === 'new' ? `<span class="dot">${ICON[icon]}</span>` : ICON[icon]}<span>${esc(tabShy(label))}</span></a>`).join('')}</nav>
  <main id="main" tabindex="-1">${content}</main>`;
}

function render(html, active, { defer = false } = {}) {
  // Dieselbe Seite wird neu aufgebaut (z. B. km-Stand in der Fahrzeugakte gespeichert): Eingaben in anderen Formularen, aufgeklappte
  // Bereiche und die Scrollposition bleiben erhalten. Ladehinweis zwischendurch („Lädt …“) zählt nicht als fertiger Aufbau.
  const same = !!(S.me && S.lastHash && (location.hash || '#/').replace(/%3A/gi, ':') === S.lastHash);
  const interim = html === `<p class="muted">${esc(t('loading'))}</p>`;
  if (same) keepCapture(); else { S.keep = null; S.actSince = []; }
  // Sprache des Dokuments = Oberflächensprache (Vorlesefunktion, Silbentrennung) – auch nach Anmeldung/Sprachwechsel, nicht nur beim Start
  if (document.documentElement.lang !== S.lang) document.documentElement.lang = S.lang;
  document.getElementById('app').innerHTML = S.me ? frame(html, active) : `<main>${html}</main>`;
  const sk = $('.skip'); if (sk) sk.onclick = (e) => { e.preventDefault(); $('#main').focus(); };
  const es = $('#envsel');
  if (es) es.onchange = () => { S.viewEnv = es.value; try { localStorage.setItem('cfp_env', es.value); } catch {} S.unread = 0; refreshUnread();
    // Detailseiten gehören zu einer Umgebung (Vorgang, Kontrolle, Bußgeld, Fahrerakte) – nach dem Umschalten auf die passende Liste statt „nicht gefunden“ (23.10.2026)
    const m = location.hash.match(/^#\/(cases|inspect|fines|drivers)\/[^?]+/);
    if (m) { location.hash = m[1] === 'fines' ? '#/fines' : m[1] === 'drivers' ? '#/drivers' : '#/cases'; return; }
    route(); };
  stackTables(document.getElementById('app'));
  markToggles(document.getElementById('app'));
  bindOutbox();
  if (same && interim) return;
  pageTitle();
  S.renderSame = same;
  // defer: Seite baut nach render() noch dynamische Teile auf (z. B. offenes Aktionsformular im Vorgang) – Wiederherstellen dann per finishRender()
  if (same && S.keep) { if (defer) S.pendingRestore = true; else keepRestore(); } else window.scrollTo(0, 0);
  if (!interim && S.restoreScroll != null) { const y = S.restoreScroll; S.restoreScroll = null; requestAnimationFrame(() => window.scrollTo(0, y)); }
}
function finishRender() { if (S.pendingRestore) { S.pendingRestore = false; if (S.keep) keepRestore(); } }

// Fenstertitel = Seitenüberschrift + App-Name (z. B. „Fahrzeuge – CEVIK Fuhrpark“): Browser-Reiter, Verlauf, Vorlesefunktion beim Seitenwechsel
// und Dateiname bei „Drucken / PDF“ (vorher hieß jede PDF „CEVIK Fuhrpark.pdf“). Ladehinweis ändert den Titel nicht.
function pageTitle() {
  const app = `CEVIK ${t('app')}`;
  const h = document.querySelector('#app h1');
  // Detailseiten mit allgemeiner Überschrift („Fahrzeugakte“) geben über data-title den genauen Gegenstand an (Kennzeichen, Vorgangsnummer)
  const head = h ? (h.dataset.title || h.textContent).replace(/\s+/g, ' ').trim().slice(0, 80) : '';
  const title = head && head !== app ? `${head} – ${app}` : app;
  if (document.title !== title) document.title = title;
}

// Filterknöpfe (gelb = aktiv, „secondary“ = inaktiv): Zustand auch für Screenreader (aria-pressed), sofern nicht schon als Tab/Schalter ausgezeichnet
const TOGGLE_ATTRS = ['av', 'clf', 'cf', 'qk', 'tt', 'tf', 'af', 'wl', 'dq', 'ud', 'mf', 'vk'];
function markToggles(root) {
  for (const b of root.querySelectorAll(TOGGLE_ATTRS.map((a) => `button.btn[data-${a}]`).join(','))) {
    if (b.hasAttribute('aria-pressed') || b.hasAttribute('aria-selected')) continue;
    b.setAttribute('aria-pressed', String(!b.classList.contains('secondary')));
  }
}

// Tabellen mit Klasse „stack“ werden auf dem Handy als Karten dargestellt: Spaltenüberschrift je Zelle als data-label
const STACK_CV_MIN = 100;
function stackTables(root) {
  for (const tb of root.querySelectorAll('table.stack')) {
    const heads = [...tb.querySelectorAll('thead th')].map((th) => th.textContent.trim());
    for (const tr of tb.querySelectorAll('tbody tr')) [...tr.children].forEach((td, i) => { if (heads[i] && !td.dataset.label && !(td.colSpan > 1)) td.dataset.label = heads[i]; }); // Zeilen über die ganze Breite (colspan) ohne Spaltenüberschrift (19.10.2026)
    // Lange Kartenlisten am Handy (z. B. Lagerjournal mit 1 000 Buchungen): Karten außerhalb des Bildschirms erst beim Scrollen layouten (22.10.2026)
    tb.classList.toggle('bigstack', tb.tBodies.length > 0 && tb.tBodies[0].rows.length > STACK_CV_MIN);
  }
}

// Barrierefreiheit: Beschriftungen, die als vorangehendes <label> ohne for-Bezug geschrieben sind, programmatisch verknüpfen;
// Felder ohne Beschriftung erhalten den Platzhalter als zugänglichen Namen. Läuft nach jeder DOM-Änderung in #app.
let fieldSeq = 0;
function labelFix(root) {
  for (const el of root.querySelectorAll('input:not([type=hidden]),select,textarea')) {
    if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.closest('label')) continue;
    if (el.id && root.querySelector(`label[for="${CSS.escape(el.id)}"]`)) continue;
    const prev = el.previousElementSibling;
    if (prev && prev.tagName === 'LABEL' && !prev.htmlFor) { if (!el.id) el.id = `f${++fieldSeq}`; prev.htmlFor = el.id; continue; }
    if (el.placeholder) el.setAttribute('aria-label', el.placeholder);
  }
}
{
  let queued = false;
  const app = document.getElementById('app');
  if (app && typeof MutationObserver !== 'undefined') new MutationObserver(() => { if (queued) return; queued = true; queueMicrotask(() => { queued = false; labelFix(app); }); }).observe(app, { childList: true, subtree: true });
}

// ---------- Router ----------
const routes = [
  [/^#\/login$/, viewLogin], [/^#\/setup$/, viewSetup], [/^#\/invite\/(.+)$/, viewInvite],
  [/^#\/?$/, viewHome], [/^#\/cases(?:\?f=\w+)?$/, viewCases], [/^#\/cases\/([\w-]+)$/, viewCase], [/^#\/new$/, viewNew], [/^#\/new\/multi$/, viewNewMulti], [/^#\/new\/(VIN:[A-Z0-9]+)$/, viewNew], [/^#\/vehicles\/qr$/, viewQrSheet], [/^#\/v\/(VIN:[A-Z0-9]+)$/, viewScan], [/^#\/check\/(VIN:[A-Z0-9]+)$/, viewDepartureCheck], [/^#\/vehicles\/qr\/(VIN:[A-Z0-9]+)$/, viewQrSheet],
  [/^#\/vehicles(?:\?f=\w+)?$/, viewVehicles], [/^#\/vehicles\/(VIN:[A-Z0-9]+)$/, viewVehicle], [/^#\/vehicles\/(VIN:[A-Z0-9]+)\?ev=([\w-]+)$/, viewVehicle], [/^#\/vehicles\/(VIN:[A-Z0-9]+)\?sec=tires$/, (vid) => viewVehicle(vid, null, 'tires')], [/^#\/vehicles\/(VIN:[A-Z0-9]+)\?sec=wo$/, (vid) => viewVehicle(vid, null, 'wo')], [/^#\/vehicles\/(VIN:[A-Z0-9]+\?done=[\w-]+)$/, (x) => viewVehicle(x.split('?done=')[0], null, 'done:' + x.split('?done=')[1])], [/^#\/vehicles\/(VIN:[A-Z0-9]+)\/timeline(?:\?f=(\w+))?$/, viewTimeline], [/^#\/inbox$/, viewInbox], [/^#\/push$/, () => { location.replace(notifHref({})); }],
  [/^#\/master(?:\?(q|sev)=([^&]*))?$/, viewMaster], [/^#\/plan(?:\?s=(mdue))?$/, (sec) => viewPlan(sec)], [/^#\/users$/, viewUsers], [/^#\/settings(?:\?s=([a-z_]+))?$/, (sec) => viewSettings(sec)], [/^#\/more(?:\?o=(sess))?$/, (o) => viewMore(o)],
  [/^#\/check$/, viewDepartureCheck], [/^#\/check\/paper$/, viewCheckPaper], [/^#\/guide(?:\?l=(de|uk|en))?$/, (l) => viewDriverGuide(l)], [/^#\/stock$/, viewStock], [/^#\/stock\/reorder$/, viewReorder], [/^#\/stock\/journal$/, viewStockJournal], [/^#\/stock\/usage$/, viewPartsUsage], [/^#\/stock\/receipt$/, viewStockReceipt], [/^#\/stock\/count$/, viewStockCount], [/^#\/stock\/asof$/, viewStockAsOf], [/^#\/fines$/, viewFines], [/^#\/drivers$/, viewDrivers], [/^#\/tacho$/, viewTacho], [/^#\/tacho\/history$/, viewTachoHistory], [/^#\/contracts$/, viewContracts], [/^#\/claims$/, viewClaims], [/^#\/drivers\/records$/, viewDriverRecords], [/^#\/drivers\/([\w-]+)$/, viewDriver], [/^#\/costs$/, viewCosts], [/^#\/kpi$/, viewKpi], [/^#\/defects$/, viewDefects], [/^#\/audit(?:\?u=([\w-]+))?$/, (u) => viewAudit(false, u)], [/^#\/audit\?v=(VIN:[A-Z0-9]+)$/, (v) => viewAudit(false, undefined, v)], [/^#\/usage$/, viewUsage], [/^#\/readiness$/, viewReadiness], [/^#\/quality(?:\?f=(\w+))?$/, viewQuality], [/^#\/wsload$/, viewWsLoad], [/^#\/telematics$/, viewTelematics], [/^#\/help(?:\?s=([\w-]+))?(?:[?&]q=([^&#]*))?$/, viewHelp], [/^#\/search$/, viewSearch], [/^#\/emergency(?:\?v=(VIN:[A-Z0-9]+)(?:&from=file)?)?$/, viewEmergency], [/^#\/emergency\/edit$/, viewEmergencyEdit], [/^#\/tires(?:\?f=\w+)?$/, viewFleetTires], [/^#\/maintenance(?:\?f=(gaps|due|noplan|all))?$/, viewMaint], [/^#\/maintenance\/multi$/, viewMaintMulti], [/^#\/fines\/([\w-]+)$/, viewFine], [/^#\/stock\/([\w-]+)$/, viewStockItem], [/^#\/inspect\/([\w-]+)$/, viewInspection],
];
// `vs` aus Startseiten-Sprüngen (hj): Standortfilter der Zielliste setzen ('*' = alle), dann ohne `vs` weiter (Routen-Muster bleiben streng)
const VS_KEYS = { cases: 'caseVsite', vehicles: 'vehSite', plan: 'planVsite', tires: 'tireSite', quality: 'dqSite', maintenance: 'maintSite', tacho: 'tachoSite' };
function applySiteJump(h) {
  const m = h.match(/^#\/(\w+)\?(.*)$/); if (!m) return h;
  const p = new URLSearchParams(m[2]); if (!p.has('vs')) return h;
  const v = String(p.get('vs') || '').slice(0, 80); p.delete('vs');
  const k = VS_KEYS[m[1]]; if (k && S.me && S.me.role !== 'driver') S[k] = v === '*' ? '' : v;
  const q = p.toString(); const nh = h.slice(0, h.indexOf('?')) + (q ? '?' + q : '');
  try { history.replaceState(history.state, '', nh); } catch {}
  return nh;
}
const routeArg = (x) => { if (x === undefined) return undefined; try { return decodeURIComponent(x); } catch { return x; } };

async function route() {
  // Links mit encodeURIComponent(Fahrzeug-ID) enthalten „VIN%3A…“ – vor dem Abgleich mit den Routen auf „VIN:“ zurückführen
  let h = (location.hash || '#/').replace(/%3A/gi, ':');
  // anderer Seite: ältere Fehlermeldung der vorherigen Seite entfernen (23.10.2026: Meldungshinweis verdeckte „Panne & Notfall“);
  // eben erst gezeigte (Fehler, der zum Seitenwechsel geführt hat) bleiben
  { const base = h.split('?')[0]; if (S.toastPage && S.toastPage !== base) document.querySelectorAll('.toast.err').forEach((x) => { if (Date.now() - Number(x.dataset.at || 0) > 1500) x.remove(); }); S.toastPage = base; }
  const pub = /^#\/(login|setup|invite\/)/.test(h);
  // Seitenwechsel während eine Seite noch lädt (langsames Netz, schnelles Tippen): die ältere Seite darf die neuere nicht überschreiben
  const gen = S.routeGen = (S.routeGen || 0) + 1;
  try { await langReady; } catch { return; } // erstes Sprachpaket (Backlog 588); fehlt jede Sprache: Start-Wächter zeigt den Ladefehler
  await ensureLang(S.lang); // Sprachauswahl auf Anmelde-/Einrichtungsseite (Backlog 588)
  try {
    if (!S.me && !pub) {
      try {
        const r = await api('GET', '/api/me'); S.me = r.user; markSession(r.user.id); lastActivity = Date.now(); S.lang = r.user.language || S.lang; S.offlineStart = false;
        // Backlog 225: Kontosprache für die Anmeldeseite nach Abmeldung/Neustart merken (eigenes Handy); geteilte Werkstatt-Tablets ausgenommen (Backlog 82)
        if (r.user.language && r.user.role !== 'workshop') { try { if (!localStorage.getItem('cfp_lang_pending')) localStorage.setItem('cfp_lang', r.user.language); } catch {} }
        // offline gewählte Sprache jetzt speichern (18.10.2026: ging beim nächsten Start mit Netz verloren)
        let pl = null; try { pl = localStorage.getItem('cfp_lang_pending'); } catch {}
        const m = pl && pl.match(/^(.+):(de|uk|en)$/);
        if (m && m[1] === S.me.id) { if (m[2] !== S.lang) { S.lang = S.me.language = m[2]; await api('PATCH', '/api/me', { language: m[2] }).catch(() => {}); } try { localStorage.removeItem('cfp_lang_pending'); } catch {} }
      }
      catch (err) {
        // Funkloch beim App-Start: mit zuletzt gespeichertem Konto weiterarbeiten (Meldungen gehen in den Offline-Ausgang)
        const cached = err.offline ? offlineSession() : null;
        if (!cached) { const st = await api('GET', '/api/setup/status').catch(() => ({})); if (!st.needs_setup && /^#\/((new|check|v)\/VIN:[A-Z0-9]+|cases\/[\w-]+|fines\/[\w-]+|vehicles\/(VIN|VIN%3A)[:A-Z0-9]+|more\?o=sess|push)$/.test(h)) { try { sessionStorage.setItem('cfp_after_login', h); } catch {} } location.hash = st.needs_setup ? '#/setup' : '#/login'; return; }
        S.me = cached.me; S.meta = cached.meta; S.lang = S.me.language || S.lang; S.offlineStart = true;
      }
      await ensureLang(S.lang); // Kontosprache (Backlog 588)
      if (S.me.role === 'owner') S.viewEnv = localStorage.getItem('cfp_env') || null;
      // Push angetippt bei geschlossener App: Umgebung aus „?env=“ übernehmen (Inhaber), danach aus der Adresse entfernen
      { const pe = new URLSearchParams(location.search).get('env'); if (pe) { pushEnv(pe); history.replaceState(history.state, '', location.pathname + location.hash); } }
      if (!S.offlineStart) {
        S.meta = await api('GET', '/api/meta');
        saveOfflineSession();
        refreshUnread();
        pushRebind();
      }
    }
    h = applySiteJump(h);
    for (const [re, fn] of routes) {
      const m = h.match(re);
      if (!m) continue;
      // Optionale Gruppen ohne Treffer bleiben undefined (decodeURIComponent(undefined) ergäbe die Zeichenkette „undefined“), kaputte %-Folgen roh
      await fn(...m.slice(1).map(routeArg));
      // Inzwischen wurde eine neuere Seite aufgerufen: war sie schon fertig, hat diese (ältere) Seite sie überschrieben → neu aufbauen.
      // Läuft die neuere noch, kann sie ihre Seite schon gezeigt haben und lädt nur noch Teile nach (Fahrzeugakte: Notizen, Reifen) –
      // dann baut sie nach ihrem Ende neu auf (29.10.2026, Backlog 594: nachgeladenes Modul machte die Reihenfolge sichtbar).
      if (gen !== S.routeGen) { if ((S.routeDone || 0) > gen) route(); else S.routeStale = S.routeGen; return; }
      S.routeDone = gen;
      if (S.routeStale === gen) { S.routeStale = 0; route(); return; }
      // Screenreader/Tastatur: nach Seitenwechsel Fokus auf die Überschrift (nicht bei Neuaufbau derselben Seite)
      // – außer die Ansicht hat selbst ein Feld fokussiert (z. B. Direktsprung ?ev= zum Formular „Prüfergebnis nachtragen“)
      const ae = document.activeElement;
      if (S.lastHash && S.lastHash !== h && !(ae && ae !== document.body && ae.matches('input, select, textarea, [data-keepfocus]') && ae.closest('#main, main'))) { const h1 = document.querySelector('#main h1, main h1'); if (h1) { h1.tabIndex = -1; h1.focus({ preventScroll: true }); } }
      S.lastHash = h;
      if (S.me && navigator.onLine !== false) flushOutbox();
      return;
    }
    location.hash = '#/';
  } catch (e) {
    if (gen !== S.routeGen) return; // Fehler einer überholten Seite nicht über die aktuelle legen
    // Überschrift + Ansage für Bildschirmleser, Fokus auf die Überschrift; bei fehlender Berechtigung/unbekanntem Eintrag „Zur Übersicht“ statt „Erneut versuchen“ (22.10.2026)
    const gone = e && (e.status === 403 || e.status === 404);
    render(`<h1 tabindex="-1" id="errh">${esc(t('page_unavailable'))}</h1><div class="panel alert" role="alert"><p>${esc(e.message)}</p>${gone ? `<a class="btn" href="#/" id="rlhome">${esc(t('to_overview'))}</a>` : `<button class="btn" id="rl">${esc(t('retry'))}</button>`}</div>`);
    const rl = document.getElementById('rl'); if (rl) rl.onclick = () => location.reload();
    const eh = document.getElementById('errh'); if (eh) eh.focus({ preventScroll: true });
  }
}
// Zurück-Taste: Scrollposition je Verlaufseintrag merken und wiederherstellen (23.10.2026: Inhaber am Handy landete nach „Zurück“ aus einem
// Vorgang wieder oben in der langen Master-Liste). Eintrag bekommt eine Nummer im history.state; neue Einträge beginnen oben.
const NAV_SCROLL = new Map(); let navCur = null; let navSeq = Date.now();
function navMark(initial = false) {
  if (!initial && navCur !== null) NAV_SCROLL.set(navCur, window.scrollY);
  const st = history.state && history.state.cfpNav;
  if (st) { navCur = st; S.restoreScroll = initial ? null : (NAV_SCROLL.has(st) ? NAV_SCROLL.get(st) : null); return; }
  navCur = ++navSeq; S.restoreScroll = null;
  try { history.replaceState({ ...(history.state && typeof history.state === 'object' ? history.state : {}), cfpNav: navCur }, ''); } catch { /* z. B. eingeschränkte Vorschau */ }
}
navMark(true);
window.addEventListener('hashchange', () => navMark());
window.addEventListener('hashchange', route);
// Tastatur: Escape schließt ein aufgeklapptes Aktionsformular am Vorgang bzw. „Erledigt“ in der Fahrzeugakte, Fokus zurück auf den Auslöser (22.10.2026)
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || e.defaultPrevented || !e.target || !e.target.closest) return;
  if (e.target.closest('#af')) { const c = document.getElementById('ac'); if (c) { e.preventDefault(); c.click(); } return; }
  const fm = e.target.closest('form[data-mdone]');
  if (fm) { e.preventDefault(); fm.hidden = true; const b = document.querySelector(`button[data-done="${CSS.escape(fm.dataset.mdone)}"]`); if (b) { b.setAttribute('aria-expanded', 'false'); b.focus(); } }
});
// Neuaufbau derselben Seite nach einer Aktion: merken, welcher Bereich die Aktion ausgelöst hat (Formular bzw. Abschnitt des Knopfs) –
// dessen Felder wurden gerade gesendet und werden danach nicht wiederhergestellt (siehe keepCapture). Aufruf aus den Sperren unten.
function noteAction(el) {
  const scope = el && el.closest && (el.closest('form') || el.closest('details, section, .panel, .row, .actions, li, tr') || el);
  if (scope) S.actSince = [...(S.actSince || []).slice(-19), scope];
}
// Doppeltes Absenden verhindern (Doppelklick, zweimal Enter, langsames Netz): Alle Formulare der App setzen den Handler als Eigenschaft (onsubmit).
// Ein Zuhörer in der Einfangphase führt diesen Handler selbst aus und sperrt das Formular, bis er fertig ist – ein zweites Absenden in
// der Zwischenzeit wird verworfen (sonst z. B. Fahrer, Artikel, Bußgeld, Vertrag oder Lagerbewegung doppelt angelegt). Knöpfe werden
// nicht deaktiviert (das steuern einzelne Handler selbst), nur per aria-busy als „wird gesendet“ dargestellt.
document.addEventListener('submit', (e) => {
  const form = e.target, h = form && form.onsubmit;
  if (typeof noteAction === 'function') noteAction(form);
  if (typeof h !== 'function') return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (form.cfpBusy) return;
  form.cfpBusy = true; form.setAttribute('aria-busy', 'true');
  let p; try { p = h.call(form, e); } catch (err) { p = Promise.reject(err); }
  Promise.resolve(p).catch((err) => { if (!onUnhandledApiError(err)) throw err; }).finally(() => { form.cfpBusy = false; form.removeAttribute('aria-busy'); });
}, true);
// Dasselbe für Knöpfe/Links mit asynchronem Klick-Handler (`el.onclick = async …`, z. B. Quittieren, Ausbuchen, Entscheidung,
// Bestandsbuchung): Vor dem ersten Klick wird der Handler umhüllt; liefert er ein Promise, sind weitere Klicks bis zum Ende wirkungslos.
// Synchrone Handler (Navigation, Aufklappen) bleiben unverändert.
document.addEventListener('click', (e) => {
  const el = e.target && e.target.closest ? e.target.closest('button, a, [role="button"]') : null;
  if (el && typeof noteAction === 'function') noteAction(el);
  const h = el && el.onclick;
  if (typeof h !== 'function' || h.cfpGuard) return;
  const g = function (ev) {
    if (el.cfpBusy) { ev.preventDefault(); return false; }
    const r = h.call(this, ev);
    if (r && typeof r.then === 'function') {
      el.cfpBusy = true; el.setAttribute('aria-busy', 'true');
      Promise.resolve(r).catch((err) => { if (!onUnhandledApiError(err)) throw err; }).finally(() => { el.cfpBusy = false; el.removeAttribute('aria-busy'); });
    }
    return r;
  };
  g.cfpGuard = true; el.onclick = g;
}, true);
// Sicherheitsnetz: Lädt eine Ansicht nach einer Aktion neu (z. B. `viewVehicle(id)` außerhalb von route()) und bricht dabei das Netz
// ab, ging der Fehler bisher still verloren – die Seite blieb veraltet stehen. Jetzt: Meldung (nur Fehler der eigenen API, nicht 401 –
// dort leitet api() schon zur Anmeldung um; gleiche Meldung höchstens einmal je 3 s).
let lastRejectMsg = '', lastRejectAt = 0;
function onUnhandledApiError(err) {
  if (!err || !(err.offline || err.status) || err.status === 401) return false;
  const now = Date.now();
  if (err.message === lastRejectMsg && now - lastRejectAt < 3000) return true;
  lastRejectMsg = err.message; lastRejectAt = now;
  toast(err.message, true);
  return true;
}
window.addEventListener('unhandledrejection', (e) => { if (onUnhandledApiError(e.reason)) e.preventDefault(); });

// Offline-Start: nur Anzeige-Daten des Kontos (keine Zugangsdaten – die Anmeldung bleibt im HttpOnly-Cookie); beim Abmelden gelöscht
const OFFLINE_KEY = 'cfp_offline_session';
function saveOfflineSession() {
  try {
    const { id, username, display_name, role, environment, workshop_site, language } = S.me;
    localStorage.setItem(OFFLINE_KEY, JSON.stringify({ me: { id, username, display_name, role, environment, workshop_site, language }, meta: S.meta, saved_at: new Date().toISOString() }));
  } catch {}
}
function offlineSession() { try { const x = JSON.parse(localStorage.getItem(OFFLINE_KEY) || 'null'); return x && x.me && x.meta ? x : null; } catch { return null; } }
// Ansichtszustand der vorherigen Person verwerfen (geteilte Werkstatt-Tablets): Suchtexte, Filter, Sortierung, Zwischenspeicher.
// Bleibt: Sprache, App-Version, Stammdaten-Meta (wird bei der nächsten Anmeldung ohnehin neu geladen; laufende Ansichten
// lesen sie evtl. noch nach einem 401) und das Sprungziel nach der Anmeldung.
const KEEP_STATE = ['lang', 'appVersion', 'meta'];
function resetUserState() {
  for (const k of Object.keys(S)) if (!KEEP_STATE.includes(k)) delete S[k];
  S.me = null; S.viewEnv = null; S.unread = 0;
  try { for (const k of Object.keys(sessionStorage)) if (k.startsWith('cfp_') && k !== 'cfp_after_login') sessionStorage.removeItem(k); } catch {}
}
// Anmeldung über Tabs hinweg (21.10.2026): Abmelden oder Anmeldung einer anderen Person in einem Tab → andere Tabs laden neu, statt
// weiter die Ansicht (und das Menü) der vorherigen Person zu zeigen (geteiltes Tablet). Gleiche Person erneut angemeldet: kein Ereignis.
const SESSION_MARK = 'cfp_session_user';
function markSession(id) { try { if (localStorage.getItem(SESSION_MARK) !== id) localStorage.setItem(SESSION_MARK, id); } catch {} }
window.addEventListener('storage', (e) => {
  // Tab steht auf der Anmeldeseite, in einem anderen Tab hat sich jemand angemeldet: Sitzung übernehmen statt zweiter Anmeldung (22.10.2026)
  if (e.key === SESSION_MARK && !S.me && e.newValue && /^#\/login/.test(location.hash || '')) { location.reload(); return; }
  if (e.key !== SESSION_MARK || !S.me || S.offlineStart) return;
  if ((e.newValue || '') !== S.me.id) { resetUserState(); location.reload(); }
});
function clearOfflineData() {
  try { for (const k of Object.keys(localStorage)) if (k === OFFLINE_KEY || k.startsWith('cfp_veh_') || k.startsWith('cfp_myveh_') || k.startsWith('cfp_emerg_') || k.startsWith('cfp_inv_')) localStorage.removeItem(k); } catch {}
}
// Leerlauf-Abmeldung auch in der App (Einstellung des Inhabers, Wert kommt vom Server mit /api/me): Der Server meldet erst beim
// nächsten Aufruf ab – bis dahin stünde auf einem geteilten Tablet die Ansicht der vorherigen Person. Die App leert den Bildschirm
// nach derselben Zeit ohne Bedienung selbst. Umgekehrt hält Bedienung ohne Serveraufruf (z. B. langes Tippen) die Anmeldung wach.
const idleLimitMs = () => { const m = S.me ? Number(S.me.idle_logout_min) : 0; return m > 0 ? m * 60000 : 0; };
// Mehrere Tabs teilen sich die Sitzung: Bedienung in einem Tab hält auch die anderen wach (sonst meldet ein ungenutzter zweiter Tab
// nach Ablauf die gemeinsame Sitzung ab, während im ersten gearbeitet wird). Gedrosselt gespiegelt in localStorage.
let sharedActivityAt = 0;
function syncActivity() {
  try { const v = Number(localStorage.getItem('cfp_last_activity')) || 0; if (v > lastActivity && v <= Date.now() + 5000) lastActivity = v; } catch {}
}
function shareActivity(now) {
  if (now - sharedActivityAt < 5000) return; sharedActivityAt = now;
  try { localStorage.setItem('cfp_last_activity', String(now)); } catch {}
}
function noteActivity(ev) {
  const ms = idleLimitMs(), now = Date.now();
  if (ms) syncActivity();
  if (ms && now - lastActivity > ms) { checkIdle(); return; } // abgelaufen: nicht mehr verlängern
  lastActivity = now; if (ms) shareActivity(now); if (ms && !(ev && ev.target && ev.target.closest && ev.target.closest('#idlebar'))) idleWarn(null); // Leiste selbst: Knopf soll klickbar bleiben
  if (ms && !S.offlineStart && navigator.onLine !== false && now - lastApiAt > Math.min(60000, ms / 3)) api('GET', '/api/me', undefined, { keepDirty: true }).catch(() => {});
}
// Vorwarnung 60 s vor der Abmeldung mit „Angemeldet bleiben“ (WCAG 2.2.1: Zeitbegrenzung ankündigen und verlängern lassen)
function idleWarn(left) {
  let bar = document.getElementById('idlebar');
  if (left === null) { if (bar) bar.remove(); return; }
  if (!bar) {
    // Ansage einmal beim Einblenden (sr-only); der sichtbare Sekundenzähler ist aria-hidden – sonst alle 5 s neue Ansage (22.10.2026)
    bar = document.createElement('div'); bar.id = 'idlebar'; bar.className = 'update-bar'; bar.setAttribute('role', 'alert');
    bar.innerHTML = `<span class="sr-only">${esc(t('idle_warn').replace('{s}', Math.max(1, Math.ceil(left / 1000))))}</span><span aria-hidden="true"></span><button type="button" class="btn">${esc(t('idle_stay'))}</button>`;
    bar.querySelector('button').onclick = () => { lastActivity = Date.now(); idleWarn(null); noteActivity(); };
    document.body.appendChild(bar);
  }
  bar.querySelector('span[aria-hidden]').textContent = t('idle_warn').replace('{s}', Math.max(1, Math.ceil(left / 1000)));
}
async function checkIdle() {
  const ms = idleLimitMs();
  if (ms) syncActivity();
  const left = ms ? ms - (Date.now() - lastActivity) : Infinity;
  idleWarn(left > 0 && left <= 60000 && !idleBusy ? left : null);
  if (!ms || idleBusy || left > 0) return;
  idleBusy = true;
  try { if (!S.offlineStart && navigator.onLine !== false) await api('POST', '/api/logout', { push_endpoint: await pushOffForLogout() }).catch(() => {}); } catch {}
  clearOfflineData(); resetUserState(); markSession(''); idleBusy = false;
  location.hash = '#/login'; toast(t('idle_signed_out'));
}
['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => window.addEventListener(ev, noteActivity, { passive: true, capture: true }));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkIdle(); });
setInterval(checkIdle, 5000); // nur Zeitvergleich, ohne Serveraufruf
// Netz wieder da nach Offline-Start: Seite nur neu aufbauen, wenn nichts eingegeben ist – sonst (z. B. halb ausgefüllte Schadensmeldung im Funkloch)
// Sitzung und Stammdaten im Hintergrund auffrischen, die Eingaben bleiben stehen
window.addEventListener('online', async () => {
  if (!S.offlineStart) return;
  if (!viewDirty()) { S.offlineStart = false; S.me = null; route(); return; }
  try {
    const r = await api('GET', '/api/me', undefined, { keepDirty: true });
    // inzwischen andere Person angemeldet (anderer Tab): nichts unter fremdem Konto senden – neu laden, Postausgang bleibt beim Ersteller (19.10.2026)
    if (S.me && r.user && r.user.id !== S.me.id) { toast(t('err_user_mismatch'), true); setTimeout(() => location.reload(), 2500); return; }
    S.me = r.user; S.offlineStart = false;
    S.meta = await api('GET', '/api/meta'); saveOfflineSession(); refreshUnread(true); flushOutbox();
  } catch {}
});
// Hat die Person in der aktuellen Ansicht etwas eingegeben oder ausgewählt? (vorsichtig: im Zweifel ja)
function viewDirty() {
  const m = document.getElementById('main') || document.querySelector('main'); if (!m) return false;
  return [...m.querySelectorAll('input, textarea, select')].some((el) => {
    if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') return false;
    if (el.type === 'file') return !!el.value;
    if (el.type === 'checkbox' || el.type === 'radio') return el.checked !== el.defaultChecked;
    if (el.tagName === 'SELECT') { const d = [...el.options].findIndex((o) => o.defaultSelected); return el.selectedIndex !== (d < 0 ? (el.multiple ? -1 : 0) : d); }
    return el.value !== el.defaultValue;
  });
}

// ---------- Neuaufbau derselben Seite ohne Verlust fremder Eingaben ----------
// Bisher baute jede Aktion die Seite komplett neu auf: Wer in der Fahrzeugakte einen km-Stand tippte und zwischendurch eine Wartung
// speicherte, verlor die km-Eingabe, aufgeklappte Bereiche klappten zu, die Seite sprang nach oben.
// Regeln: Felder des Bereichs, der die Aktion ausgelöst hat (gesendetes Formular, Abschnitt des Knopfs), werden nie zurückgeschrieben
// (sonst stünde z. B. ein gesendeter Kommentar erneut da). Ein Formular wird nur wiederhergestellt, wenn sich seine Vorgabewerte nicht
// geändert haben (sonst hat die Aktion die Daten dahinter geändert, z. B. anderer Eintrag zum Bearbeiten geladen) – dann gilt der neue Stand.
// Dateiauswahl und Passwörter werden nie übernommen. Umgebungswechsel Test/Betrieb verwirft alles.
const KEEP_SKIP_TYPES = ['hidden', 'submit', 'button', 'reset', 'image', 'file', 'password'];
const fieldDefault = (el) => (el.type === 'checkbox' || el.type === 'radio') ? String(el.defaultChecked) : el.tagName === 'SELECT' ? [...el.options].map((o) => (o.defaultSelected ? 1 : 0)).join('') + ':' + [...el.options].map((o) => o.value).join('\u0001') : el.defaultValue;
const fieldValue = (el) => (el.type === 'checkbox' || el.type === 'radio') ? el.checked : el.tagName === 'SELECT' ? [...el.options].filter((o) => o.selected).map((o) => o.value) : el.value;
function fieldDirty(el) {
  if (el.type === 'checkbox' || el.type === 'radio') return el.checked !== el.defaultChecked;
  if (el.tagName === 'SELECT') { const d = [...el.options].findIndex((o) => o.defaultSelected); return el.selectedIndex !== (d < 0 ? (el.multiple ? -1 : 0) : d); }
  return el.value !== el.defaultValue;
}
function keepScan(root) {
  const groups = {}, details = new Map(), formKey = new Map(), occ = {};
  let fi = 0;
  const once = (k) => { occ[k] = (occ[k] || 0) + 1; return occ[k] > 1 ? `${k}~${occ[k]}` : k; };
  for (const el of root.querySelectorAll('input, textarea, select')) {
    if (KEEP_SKIP_TYPES.includes(el.type)) continue;
    const f = el.closest('form');
    if (f && !formKey.has(f)) formKey.set(f, once('F:' + (f.id || [...f.attributes].filter((a) => a.name.startsWith('data-')).map((a) => `${a.name}=${a.value}`).join('&') || `#${fi++}`)));
    const fk = once(`${f ? formKey.get(f) : ''}|${el.name || el.id || ''}|${el.tagName}:${el.type}`);
    const gk = f ? formKey.get(f) : 'E:' + fk;
    const g = groups[gk] || (groups[gk] = { sig: [], els: {} });
    g.sig.push(fieldDefault(el)); g.els[fk] = el;
  }
  for (const g of Object.values(groups)) g.sig = g.sig.join('\u0002');
  for (const d of root.querySelectorAll('details')) { const s = d.querySelector('summary'); details.set(once('D:' + (d.id || (s ? s.textContent.trim().slice(0, 80) : ''))), d); }
  return { groups, details };
}
function keepCapture() {
  if (S.keep) return; // Ladehinweis dazwischen: es gilt der Stand vor dem Ladehinweis
  const m = document.getElementById('main');
  if (!m) return;
  const skip = (S.actSince || []).filter(Boolean);
  const { groups, details } = keepScan(m);
  const keep = { env: S.viewEnv || null, y: window.scrollY || 0, groups: {}, open: [] };
  for (const [gk, g] of Object.entries(groups)) {
    const fields = {};
    for (const [fk, el] of Object.entries(g.els)) if (fieldDirty(el) && !skip.some((c) => c === el || (c.contains && c.contains(el)))) fields[fk] = fieldValue(el);
    if (Object.keys(fields).length) keep.groups[gk] = { sig: g.sig, fields };
  }
  for (const [k, d] of details) if (d.open) keep.open.push(k);
  // Tastatur: fokussiertes Element merken (22.10.2026: nach Kommentar senden/Filter wählen fiel der Fokus auf body, nächster Tab sprang an den Seitenanfang)
  const ae = document.activeElement, app = document.getElementById('app');
  keep.focus = ae && ae !== document.body && app && app.contains(ae) ? focusKey(ae) : null;
  S.keep = keep;
}
// Wiederfindbarer Schlüssel eines Bedienelements: id, sonst Formular + Elementart + data-/name-/href-Attribute (+ Text zur Unterscheidung)
function focusKey(el) {
  const attrSel = (x, f = (a) => a.name.startsWith('data-')) => [...x.attributes].filter(f).map((a) => `[${a.name}="${CSS.escape(a.value)}"]`).join('');
  if (el.id) return { sel: '#' + CSS.escape(el.id), text: '' };
  const f = el.closest('form');
  const fsel = f ? (f.id ? 'form#' + CSS.escape(f.id) + ' ' : (attrSel(f) ? 'form' + attrSel(f) + ' ' : '')) : '';
  return { sel: fsel + el.tagName.toLowerCase() + attrSel(el, (a) => a.name.startsWith('data-') || a.name === 'name' || (el.tagName === 'A' && a.name === 'href')), text: (el.textContent || '').trim().slice(0, 80) };
}
function focusRestore(k) {
  if (!k) return;
  let el = null;
  try { const c = [...document.querySelectorAll(k.sel)]; el = c.find((x) => (x.textContent || '').trim().slice(0, 80) === k.text) || (c.length === 1 ? c[0] : null); } catch { el = null; }
  // Element gibt es nicht mehr (z. B. gesendetes Aktionsformular): Überschrift der Seite statt body
  if (!el || el.hidden || !el.getClientRects().length) { el = document.querySelector('#main h1'); if (el) el.tabIndex = -1; }
  if (el) el.focus({ preventScroll: true });
}
function keepRestore() {
  const k = S.keep; S.keep = null; S.actSince = [];
  if (k.env !== (S.viewEnv || null)) { window.scrollTo(0, 0); return; }
  const m = document.getElementById('main');
  if (!m) return;
  const { groups, details } = keepScan(m);
  const changed = [];
  for (const [gk, g] of Object.entries(k.groups)) {
    const ng = groups[gk];
    if (!ng || ng.sig !== g.sig) continue;
    for (const [fk, v] of Object.entries(g.fields)) {
      const el = ng.els[fk];
      if (!el) continue;
      if (el.type === 'checkbox' || el.type === 'radio') { if (el.checked === v) continue; el.checked = v; }
      else if (el.tagName === 'SELECT') { if (!v.every((x) => [...el.options].some((o) => o.value === x))) continue; [...el.options].forEach((o) => { o.selected = v.includes(o.value); }); }
      else { if (el.value === v) continue; el.value = v; }
      changed.push(el);
      for (let d = el.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true;
    }
  }
  for (const key of k.open) { const d = details.get(key); if (d) d.open = true; }
  if (k.focus && (document.activeElement === document.body || !document.activeElement)) focusRestore(k.focus);
  window.scrollTo(0, k.y);
  // Abhängige Anzeigen (z. B. ein-/ausgeblendete Felder) erst nach dem Binden der Handler durch die Ansicht aktualisieren
  setTimeout(() => {
    for (const el of changed) { if (!el.isConnected) continue; el.dispatchEvent(new Event('input', { bubbles: true })); if (el.closest('form')) el.dispatchEvent(new Event('change', { bubbles: true })); }
    if (Math.abs((window.scrollY || 0) - k.y) > 2) window.scrollTo(0, k.y);
  }, 0);
}

// Antwort aus der vorherigen Umgebung (Wechsel während der Abfrage) nicht übernehmen (20.10.2026)
async function refreshUnread(bg = false) {
  const ev = S.viewEnv;
  const tray = await trayNotifications();
  try { const n = await api('GET', '/api/notifications?count=1' + (tray.length ? '&tray=' + tray.map((x) => x.data.id).join(',') : ''), undefined, { bg });
    // Backlog 507: auf einem anderen Gerät (oder in der App) gelesene/quittierte Mitteilungen aus der Leiste dieses Geräts entfernen – auch dringende (requireInteraction)
    if (tray.length && Array.isArray(n.tray_unread)) { const keep = new Set(n.tray_unread); for (const x of tray) if (!keep.has(x.data.id)) { try { x.close(); } catch { /* bereits geschlossen */ } } }
    if (S.viewEnv !== ev) return; S.unread = n.unread; lastUnreadAt = Date.now(); paintBadge(); } catch {}
}
// angezeigte Mitteilungen dieses Geräts mit Hinweis-Kennung (höchstens 50); ohne Service Worker/Mitteilungen leer
async function trayNotifications() {
  try { if (!('serviceWorker' in navigator)) return []; const reg = await navigator.serviceWorker.getRegistration(); if (!reg || !reg.getNotifications) return [];
    return (await reg.getNotifications()).filter((x) => x.data && typeof x.data.id === 'string' && /^[\w-]{1,64}$/.test(x.data.id)).slice(0, 50); } catch { return []; }
}
// Name des Glockensymbols mit Anzahl ungelesener Hinweise („Hinweise: 3“)
function bellLabel() { return t('notifications') + (S.unread ? ': ' + S.unread : ''); }
// Zahl am Glockensymbol an Ort und Stelle aktualisieren – ohne die Seite neu aufzubauen (halb ausgefüllte Formulare bleiben erhalten)
function paintBadge() {
  const a = document.querySelector('.topbar a[href="#/inbox"]'); if (!a) return;
  let b = a.querySelector('.badge');
  a.setAttribute('aria-label', bellLabel()); // Zahl auch für Screenreader (21.10.2026: nur „Hinweise“)
  if (!S.unread) { if (b) b.remove(); return; }
  if (!b) { b = document.createElement('span'); b.className = 'badge'; b.setAttribute('aria-hidden', 'true'); b.style.cssText = 'position:absolute;top:2px;right:0'; a.appendChild(b); }
  b.textContent = S.unread;
}
// Ohne Push (z. B. nicht erlaubt) bliebe die Zahl stehen: beim Zurückkehren in die App und alle 2 Min. (nur sichtbar, angemeldet, online) nachfragen
let lastUnreadAt = 0;
function pollUnread() {
  if (!S.me || S.offlineStart || navigator.onLine === false || document.visibilityState !== 'visible' || Date.now() - lastUnreadAt < 30000) return;
  lastUnreadAt = Date.now(); refreshUnread(true);
}
document.addEventListener('visibilitychange', pollUnread);
setInterval(pollUnread, 120000);

// ---------- Öffentliche Ansichten ----------
// Anmeldeseite: unversendete Meldungen auf diesem Gerät (Anmeldung beendet, z. B. Leerlauf/Passwortwechsel) – nur Name und Anzahl,
// damit die Person sich hier anmeldet und sie gesendet werden (18.10.2026: lagen sonst ohne Hinweis im Gerät)
function orphanOutboxNote() {
  // Backlog 532 (Blickwinkel „Neuer Fahrer mit Leihhandy“): vom Server abgelehnte Meldungen getrennt nennen – erneutes Anmelden sendet sie
  // nicht von selbst, die Person muss sie prüfen (Text kopieren, erneut senden oder verwerfen)
  const by = new Map(); const bad = new Map();
  try { for (const k of Object.keys(localStorage)) if (k.startsWith('cfp_outbox_')) for (const x of JSON.parse(localStorage.getItem(k) || '[]')) { const n = x.user_name; if (!n) continue; const m = x.failed ? bad : by; m.set(n, (m.get(n) || 0) + 1); } } catch {}
  const lines = [...[...by].map(([n, c]) => tn('outbox_orphan', c).replaceAll('{name}', n)), ...[...bad].map(([n, c]) => tn('outbox_orphan_failed', c).replaceAll('{name}', n))];
  return lines.length ? `<p class="small alert" id="orphan_outbox" role="note">${lines.map(esc).join('<br>')}</p>` : '';
}
// Backlog 535: Passwortfeld mit Knopf „Passwort anzeigen“ (Einladung und Anmeldung) – auf fremder Handytastatur vertippt man sich leicht,
// und ein verbrauchter Einladungslink mit falsch getipptem Passwort kostet am ersten Arbeitstag eine neue Einladung
const pwField = (ac, extra = '') => `<div class="pwrow" style="display:flex;gap:6px;align-items:center"><input id="p" type="password" autocomplete="${ac}"${extra} required style="flex:1;min-width:0"><button type="button" class="btn secondary small" id="pwshow" aria-pressed="false" aria-controls="p" style="white-space:nowrap">${esc(t('pw_show'))}</button></div>`;
function bindPwShow() {
  const b = $('#pwshow'); if (!b) return;
  b.onclick = () => { const p = $('#p'); const show = p.type === 'password'; p.type = show ? 'text' : 'password'; b.setAttribute('aria-pressed', String(show)); b.textContent = t(show ? 'pw_hide' : 'pw_show'); };
}
function viewLogin() {
  render(`<div class="center"><form id="f" class="narrow panel">
    <h1>CEVIK ${esc(t('app'))}</h1><p class="muted small">[CLAUDE]</p>
    <label for="u">${esc(t('username'))}</label><input id="u" autocomplete="username" required autocapitalize="none" autocorrect="off" spellcheck="false"><p class="small alert" id="ulatin" role="alert" hidden>${esc(t('login_latin_hint'))}</p>
    <label for="p">${esc(t('password'))}</label>${pwField('current-password')}
    <div class="actions"><button class="btn block">${esc(t('login'))}</button></div>${orphanOutboxNote()}
    <details class="small" style="margin-top:8px"><summary>${esc(t('forgot_pw'))}</summary><p class="muted">${esc(t('forgot_pw_hint'))}</p></details>
    ${langSelect()}
  </form></div>`);
  bindLang(); bindPwShow();
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    try {
      // Backlog 534: Benutzernamen sind lateinisch ohne Leerzeichen – Leerzeichen (Autokorrektur „y. cevik“) entfernen, kyrillische Eingabe
      // (fremde Tastatur) nicht senden, sondern Hinweis zeigen: jeder Fehlversuch zählt sonst zur Sperre
      const un = $('#u').value.replace(/\s+/g, ''); const ul = $('#ulatin');
      if (/[\u0400-\u04FF]/.test(un)) { ul.hidden = false; $('#u').focus(); return; }
      ul.hidden = true;
      const r = await api('POST', '/api/login', { username: un, password: $('#p').value, device_id: deviceId() });
      if (r.second_factor) { viewLoginCode(r.challenge); return; }
      afterLogin();
    } catch (err) { toast(err.message, true); }
  };
}
// Gerätekennung für den Anmelde-Hinweis bei neuem Gerät: zufällig, nur in diesem Browser, bleibt beim Abmelden erhalten (keine Zugangsdaten)
function deviceId() {
  try {
    let d = localStorage.getItem('cfp_device');
    if (!/^[0-9a-f]{32}$/.test(d || '')) { d = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join(''); localStorage.setItem('cfp_device', d); }
    return d;
  } catch { return undefined; }
}
function afterLogin() { S.me = null; let next = '#/'; try { next = sessionStorage.getItem('cfp_after_login') || '#/'; sessionStorage.removeItem('cfp_after_login'); } catch {} location.hash = next; route(); }
// Zweiter Schritt: Code aus der Authenticator-App oder Ersatzcode (Passwort bleibt nicht im Speicher der Seite)
function viewLoginCode(challenge) {
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
function langSelect() {
  return `<label for="lang">${esc(t('language'))}</label><select id="lang"><option value="de" lang="de"${S.lang === 'de' ? ' selected' : ''}>Deutsch</option><option value="uk" lang="uk"${S.lang === 'uk' ? ' selected' : ''}>Українська</option><option value="en" lang="en"${S.lang === 'en' ? ' selected' : ''}>English</option></select>`;
}
function bindLang(save = false) {
  const l = $('#lang');
  // Sprache auch in der Offline-Sitzung merken (18.10.2026: Offline-Start kam sonst in der alten Sprache)
  if (l) l.onchange = async () => { S.lang = l.value; try { localStorage.setItem('cfp_lang', l.value); } catch {} if (save) { if (S.me) { S.me.language = l.value; saveOfflineSession(); } await api('PATCH', '/api/me', { language: l.value }).then(() => { try { localStorage.removeItem('cfp_lang_pending'); } catch {} }).catch((err) => { if (err.offline && S.me) try { localStorage.setItem('cfp_lang_pending', `${S.me.id}:${l.value}`); } catch {} }); } route(); };
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
    try { const r = await api('POST', '/api/invite/accept', { token, password: $('#p').value, device_id: deviceId() }); resetUserState(); /* evtl. im Tab angemeldete andere Person: Sprache ging sonst verloren (user_mismatch), Ansichtszustand wurde vererbt (20.10.2026) */ if (r.second_factor) { viewLoginCode(r.challenge); return; } await api('PATCH', '/api/me', { language: S.lang }).catch(() => {}); S.me = null; location.hash = '#/'; }
    catch (err) { toast(err.message, true); }
  };
}

// ---------- Übersicht ----------
// Teile-Liefertermin laut Werkstatt (nur bei „wartet auf Teile“); überschritten = markiert
// „Rückkehr: ungeklärt“ (Disposition): der Werkstatttermin ist der Beginn, nicht die Fertigstellung – ein Datum zählt nur, solange es noch
// bevorsteht; in Reparatur bzw. Termin/Liefertermin heute oder vorbei → ungeklärt (Blickwinkel „Disposition, erster Tag“, 26.10.2026)
const dispoReturnKnown = (c) => {
  if (c.status === 'abschlusskontrolle') return true;
  if (c.status === 'in_reparatur') return false;
  const d = c.status === 'wartet_teile' ? c.parts_expected_date : c.planned_date;
  return !!d && d > bDate();
};
// Backlog 378: worauf gewartet wird, Verschiebungen des Liefertermins (z. B. Teile falsch geliefert) und letzter Vermerk dazu – vorher nur im Verlauf
// Backlog 449: Teillieferung(en) – Anzahl, wann/wer zuletzt und der ursprüngliche Vermerk (der aktuelle steht unter „Wartet noch auf“)
const partsPartialRow = (pw) => (pw.partial_count ? `<dt>${esc(t('pp_label'))}</dt><dd id="pwpartial"><span class="chip mittel">${esc(t('pp_count').replace('{n}', pw.partial_count))}</span> <span class="small">${esc(t('pp_last'))} ${fmtDT(pw.last_partial_at)}${pw.last_partial_by ? ' · ' + esc(pw.last_partial_by) : ''}</span>${pw.original_note ? `<br><span class="small muted">${esc(t('pp_orig'))}: ${esc(pw.original_note)}</span>` : ''}</dd>` : '');
const partsWaitRows = (pw) => `${pw.note ? `<dt>${esc(t(pw.partial_count ? 'parts_wait_still' : 'parts_wait_for'))}</dt><dd id="pwnote">${esc(pw.note)} <span class="muted small">· ${esc(t('parts_wait_since'))} ${fmtDT(pw.since)}</span></dd>` : ''}${pw.postponed || pw.last_change_note ? `<dt>${esc(t('parts_eta_changes'))}</dt><dd id="pwmoves">${pw.postponed ? `<span class="chip mittel">${esc(tn('parts_postponed', pw.postponed))}</span>${pw.first_eta ? ` <span class="small">${esc(t('parts_first_eta'))} ${fmtD(pw.first_eta)}</span>` : ''}` : ''}${pw.last_change_note ? `${pw.postponed ? '<br>' : ''}<span class="small">${esc(t('parts_last_change'))} (${fmtDT(pw.last_change_at)}): ${esc(pw.last_change_note)}</span>` : ''}</dd>` : ''}` + partsPartialRow(pw);
// Backlog 446 (Blickwinkel „Auftrag wartet seit 3 Wochen auf Teile – wer fasst nach?“): in Listen worauf gewartet wird, die Wartezeit
// in Kalendertagen (Berliner Tage seit Beginn des Status) und „kein Liefertermin angegeben“ – vorher nur im Vorgang zu sehen
const partsWaitDays = (c) => (c.status_since ? Math.max(0, Math.round((Date.parse(bDate()) - Date.parse(BERLIN_FMT.format(new Date(c.status_since)))) / 864e5)) : null);
const partsWaitList = (c) => {
  if (c.status !== 'wartet_teile') return '';
  const d = partsWaitDays(c);
  return `${c.parts_wait_note ? ` · <span data-pwnote>${esc(t('parts_wait_for'))}: ${ltxt(clipTxt(c.parts_wait_note, 60))}</span>` : ''}${d ? ` · <b data-pwdays>${esc(t('parts_wait_days').replace('{d}', nDays(d)))}</b>` : ''}${c.parts_expected_date ? '' : ` <span class="chip mittel" data-pwnoeta>${esc(t('parts_eta_none'))}</span>`}`;
};
const partsEta = (c, sep = ' · ', label = true) => c.status === 'wartet_teile' && c.parts_expected_date ? `${sep}<b>${label ? esc(t('parts_eta')) + ' ' : ''}${fmtD(c.parts_expected_date)}</b>${c.parts_expected_date < bDate() ? ` <span class="chip kritisch">${esc(t('parts_eta_passed'))}</span>` : ''}` : '';
// Backlog 453 (Blickwinkel „Neue Werkstatt-Aushilfe, erster Tag am Tablet (UK)“): Kurzablauf eines Auftrags oben auf der Werkstatt-Startseite –
// Schrittnamen sind die Knopf-Beschriftungen der App (gleiche Schlüssel), aufgeklappt bis die Person „Ausblenden“ tippt (je Konto im Browser gemerkt,
// danach zugeklappt erreichbar). Nur Oberfläche, keine Daten.
const wsFlowKey = () => 'cfp_wsflow_' + (S.me ? S.me.id : '');
function wsFlow() {
  let hidden = false; try { hidden = localStorage.getItem(wsFlowKey()) === '1'; } catch {}
  const q = (k) => t('act_' + k);
  const steps = [t('wsf_1').replace('{a}', () => q('acknowledge')), t('wsf_2').replace('{a}', () => q('start_repair')), t('wsf_3').replace('{a}', () => q('record_work')).replace('{b}', () => q('add_part')),
    t('wsf_4').replace('{a}', () => q('wait_parts')).replace('{b}', () => q('resume_repair')), t('wsf_5').replace('{a}', () => q('inspection')).replace('{b}', () => q('request_quality_check')), t('wsf_6')];
  return `<details class="panel noprint" id="wsflow"${hidden ? '' : ' open'}><summary><b>${esc(t('wsf_title'))}</b></summary><ol style="margin:8px 0 4px;padding-left:1.4em">${steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>${hidden ? '' : `<div class="actions"><button type="button" class="btn secondary" id="wsflowhide">${esc(t('wsf_hide'))}</button></div>`}</details>`;
}
function bindWsFlow() {
  const b = $('#wsflowhide'); if (!b) return;
  b.onclick = () => { try { localStorage.setItem(wsFlowKey(), '1'); } catch {} const d = $('#wsflow'); if (d) d.open = false; b.closest('.actions').remove(); };
}
// Backlog 457 (Blickwinkel „Leitung gibt fünf Aufträge für denselben Tag frei – sieht die Werkstatt die Tagesreihenfolge?“): feste Reihenfolge
// je Tag wie im Werkstattplan (PLAN_DAY_ORDER in src/reports.js) – gesperrt/kritisch, mittel, niedrig; gleiche Dringlichkeit: ältere Meldung zuerst.
// Vorher nach letzter Änderung (sprang nach jedem Kommentar). Eine Uhrzeit vereinbart die Leitung im „Hinweis zum Termin“.
const dayRank = (c) => (c.priority === 'kritisch' || c.safety_lock ? 0 : c.priority === 'mittel' ? 1 : 2);
const dayOrder = (a, b) => dayRank(a) - dayRank(b) || String(a.created_at).localeCompare(String(b.created_at)) || String(a.id).localeCompare(String(b.id));
// Werkstatt-Tagesübersicht: Aufträge des eigenen Standorts nach Arbeitsschritt, dazu Prüftermine der nächsten 14 Tage
// Promise früh starten, aber erst beim await auswerten: ohne angehängten Fehlerzweig gälte eine Ablehnung, die vor dem await eintritt, als unbehandelt
const early = (p) => { p.catch(() => {}); return p; };
async function workshopBoard() {
  // Nur Arbeitsvorrat: eigene Meldungen an Fahrzeugen anderer Werkstätten (Zugriff „lesen“) erschienen sonst unter
  // „Neu – bitte übernehmen“, ließen sich aber nicht übernehmen (19.10.2026); sie stehen weiter in „Vorgänge“
  // Backlog 600: alle Abfragen der Tafel gleichzeitig starten (vorher fünf nacheinander); Ergebnisse in derselben Reihenfolge eingebaut
  const pOpen = api('GET', '/api/cases?status=open&limit=500'), pOv = early(api('GET', '/api/maintenance')), pNr = early(api('GET', '/api/me/inspections-without-result'));
  const pRi = early(api('GET', '/api/cases?' + caseFilterQ('open_items') + '&limit=200')), pWin = early(wsWinter(vsDef('tireSite')));
  const open = (await pOpen).cases.filter((c) => c.access !== 'read');
  const lanes = [
    ['ws_to_ack', open.filter((c) => c.status === 'werkstatt_freigegeben' && !c.workshop_ack_at)],
    ['ws_to_start', open.filter((c) => c.status === 'werkstatt_freigegeben' && c.workshop_ack_at)],
    ['st_in_reparatur', open.filter((c) => c.status === 'in_reparatur')],
    // längste Wartezeit zuerst – bei diesem Auftrag zuerst beim Lieferanten nachfassen (Backlog 446)
    ['st_wartet_teile', open.filter((c) => c.status === 'wartet_teile').sort((a, b) => String(a.status_since || a.updated_at).localeCompare(String(b.status_since || b.updated_at)))],
    ['st_abschlusskontrolle', open.filter((c) => c.status === 'abschlusskontrolle')],
    ['ws_preview', open.filter((c) => c.status === 'gemeldet')],
  ];
  // Mangel bei der Abfahrtskontrolle erneut festgestellt (letzte 3 Tage) – zuerst, damit die Werkstatt ihn vorzieht
  // Heute geplant und Termin überschritten (nicht begonnen) – oben, nur gespeicherte Termine
  const today = bDate();
  const passed = open.filter((c) => c.status === 'werkstatt_freigegeben' && c.planned_date && c.planned_date < today).sort((a, b) => a.planned_date.localeCompare(b.planned_date) || dayOrder(a, b));
  const todayL = open.filter((c) => ['werkstatt_freigegeben', 'in_reparatur', 'wartet_teile'].includes(c.status) && c.planned_date === today).sort(dayOrder);
  if (todayL.length) lanes.unshift(['ws_planned_today', todayL]);
  // Mängelbeseitigung aus Prüfung (HU/SP/UVV mit erheblichen Mängeln) – Nachprüfung folgt, daher hervorgehoben
  const fromInsp = open.filter((c) => c.maintenance_event_id && ['werkstatt_freigegeben', 'in_reparatur', 'wartet_teile'].includes(c.status));
  if (fromInsp.length) lanes.unshift(['ws_from_inspection', fromInsp]);
  // Teile heute/morgen erwartet (oder Liefertermin überschritten) – Wareneingang prüfen, dann „Reparatur fortsetzen“
  // Kosten über der Freigabegrenze: vor größeren weiteren Arbeiten Freigabe der Fuhrparkleitung abwarten
  const costWait = open.filter((c) => c.cost_over_limit_at);
  if (costWait.length) lanes.unshift(['cost_approval_pending', costWait]);
  const partsDue = open.filter((c) => c.status === 'wartet_teile' && c.parts_expected_date && c.parts_expected_date <= bDate(1)).sort((a, b) => a.parts_expected_date.localeCompare(b.parts_expected_date) || dayOrder(a, b)); // Backlog 525: überschrittene zuerst
  if (partsDue.length) lanes.unshift(['ws_parts_due', partsDue]);
  if (passed.length) lanes.unshift(['todo_plan_passed', passed]);
  // wie die verlinkte Liste (repeat_days=3) inkl. Vorab-Info („gemeldet“ mit Vorschlag dieser Werkstatt) – vorher zählte die Startseite n, die Liste n+1 (20.10.2026)
  const rep = open.filter((c) => recentRepeat(c));
  if (rep.length) lanes.unshift(['ws_repeat', rep]);
  // Backlog 454 (Blickwinkel „derselbe Auftrag steht in ‚Heute geplant‘ und ‚Neu – bitte übernehmen‘“): hervorgehobene Abschnitte oben bleiben,
  // im Arbeitsschritt unten trägt der Auftrag „steht auch oben: …“ und ein Satz nennt die Gesamtzahl – sonst wirkte ein Auftrag wie zwei
  const STEP_KEYS = ['ws_to_ack', 'ws_to_start', 'st_in_reparatur', 'st_wartet_teile', 'st_abschlusskontrolle', 'ws_preview'];
  const shown = lanes.filter(([, l]) => l.length);
  const above = new Map();
  for (const [k, l] of shown) if (!STEP_KEYS.includes(k)) for (const c of l) { if (!above.has(c.id)) above.set(c.id, []); above.get(c.id).push(t(k)); }
  const total = new Set(shown.flatMap(([, l]) => l.map((c) => c.id))).size;
  const alsoAbove = (c) => (above.has(c.id) ? `<b data-alsoabove>↑ ${esc(t('ws_also_above'))}: ${esc(above.get(c.id).join(' · '))}</b> · ` : '');
  let noteDone = false;
  const dupNote = (k) => { if (noteDone || !above.size || !STEP_KEYS.includes(k)) return ''; noteDone = true; return `<p class="small muted" id="wsdupnote">${esc(tn('ws_dup_note', total))}</p>`; };
  let html = wsFlow() + shown.map(([k, l]) => `${dupNote(k)}<h2>${esc(t(k))} <span class="chip">${l.length}</span></h2>${k === 'ws_planned_today' && l.length > 1 ? `<p class="small muted" id="wsdayorder">${esc(t('day_order_hint'))}</p>` : ''}${caseList(l, '', STEP_KEYS.includes(k) ? alsoAbove : null)}${k === 'ws_repeat' ? `<p class="small"><a href="${esc(hj('#/cases?f=repeat'))}">${esc(t('show_in_list'))} ›</a></p>` : ''}`).join('') || `<p class="muted">${esc(t('no_cases'))}</p>`;
  try {
    const ov = await pOv;
    // ≤ 14 Tage nach Datum oder nach km fällig/überschritten (Warnschwelle aus den Einstellungen) – gleiche Status wie die Prüftermin-Übersicht
    const kmDueNow = (r) => ['ueberfaellig', 'faellig'].includes(r.km_status);
    const soon = ov.rows.filter((r) => (r.days !== null && r.days <= 14) || kmDueNow(r));
    if (soon.length) html += `<h2>${esc(t('inspections_due'))} (≤ ${esc(nDays(14))}${soon.some(kmDueNow) ? ' ' + esc(t('ws_due_km_suffix')) : ''})</h2><div class="list">${soon.map((r) => `<a class="row ${r.status === 'ueberfaellig' ? 'p-kritisch' : 'p-mittel'}" href="#/vehicles/${encodeURIComponent(r.vehicle_id)}">${plate(r.plate)}<span class="title">${esc(mkR(r))}${r.days !== null && r.days <= 14 ? ' · ' + fmtD(r.next_due_date) : ''}${kmDueNow(r) ? ` · ${esc(t('due_at_km'))} ${fmtKm(r.next_due_km)} (${r.km_remaining < 0 ? esc(t('km_over')) + ' ' + fmtKm(-r.km_remaining) : esc(t('km_left')) + ' ' + fmtKm(r.km_remaining)})` : ''}</span><span class="chip ${r.status === 'ueberfaellig' ? 'kritisch' : 'mittel'}">${esc(t('ms_' + r.status))}${kmUnclearDateDue(r) ? ' · ' + esc(t('ms_' + r.date_status)) : ''}</span>${r.km_unclear ? `<span class="sub km-unclear">${esc(t('km_unclear_drop').replace('{d}', fmtD(r.km_drop_at)))}</span>` : ''}</a>`).join('')}</div><p class="small" style="margin-top:8px"><a href="#/plan?s=mdue">${esc(t('wplan'))}: ${esc(t('wplan_mdue'))} ›</a> <span class="muted">${esc(t('ws_mdue_link_hint'))}</span></p>`;
    // Prüfung mit erheblichen/gefährlichen Mängeln bzw. verkehrsunsicher, noch kein Auftrag: nur zur Info – die Fuhrparkleitung entscheidet
    const dw = ov.defects_without_case || [];
    if (dw.length) html += `<h2>${esc(t('ws_defects_pending'))} <span class="chip">${dw.length}</span></h2><p class="small muted">${esc(t('ws_defects_hint'))}</p><div class="list">${dw.map((x) => `<a class="row p-kritisch" href="#/vehicles/${encodeURIComponent(x.vehicle_id)}">${plate(x.plate)}<span class="title">${esc(mk(x.kind))} · ${fmtD(x.done_date)}</span><span class="chip kritisch">${esc(t('res_' + x.result))}</span></a>`).join('')}</div>`;
  } catch {}
  // selbst erfasste Pflichtprüfungen ohne Ergebnis (≤ 180 Tage, neueste ihrer Art) – Sprung direkt zum Formular in der Fahrzeugakte
  try {
    const nr = (await pNr).items;
    if (nr.length) html += `<h2>${esc(t('res_missing_mine'))} <span class="chip">${nr.length}</span></h2><p class="small muted">${esc(t('res_missing_hint'))}</p><div class="list">${nr.map((r) => `<a class="row" href="#/vehicles/${encodeURIComponent(r.vehicle_id)}?ev=${encodeURIComponent(r.id)}">${plate(r.plate)}<span class="title">${esc(mk(r.kind))} · ${fmtD(r.done_date)}</span><span class="chip">${esc(t('res_add_go'))} ›</span></a>`).join('')}</div>`;
  } catch {}
  // Backlog 487: freigegebene Aufträge mit offenen Restarbeiten (nicht sicherheitsrelevant) – Arbeitsvorrat für ruhige Stunden/Wochenabschluss
  try {
    const ri = (await pRi).cases;
    if (ri.length) html += `<h2 id="wsoi">${esc(t('filter_open_items'))} <span class="chip">${ri.length}</span></h2><p class="small muted">${esc(t('ws_open_items_hint'))}</p>${caseList(ri.slice(0, 10))}<p class="small"><a href="${esc(hj('#/cases?f=open_items'))}">${esc(t('show_in_list'))} ›</a></p>`;
  } catch {}
  // Winterreifen: Lkw ohne Alpine-Symbol laut Erfassung als Arbeitsvorrat (umrüsten bzw. Erfassung nachholen) – nur Information, keine Sperre
  html += await pWin;
  return html + `<p class="navlinks"><a href="${esc(hj('#/cases'))}">${esc(t('all'))}</a> <a href="#/plan">${esc(t('wplan'))} ›</a></p>${helpLink('ws')}`;
}
// Sprünge von der Startseite: Zielliste mit dem Standort, für den der Zähler gilt (Backlog 102) – Leitung zählt flottenweit („alle“),
// Disposition je nach Umschalter Standard-Standort oder alle; Werkstatt „alle“ (seit 21.10.2026), Fahrer ohne Zusatz. Ziel liest `vs` in route() (applySiteJump).
function hj(href) {
  const r = S.me && S.me.role; let s = null;
  // Werkstatt: Zähler der Startseite gelten standortübergreifend (Aufträge bei ihr, auch fremder Fahrzeugstandorte) – mit Standard-Standort
  // zeigte die Liste sonst weniger als der Zähler (21.10.2026)
  if (r === 'owner' || r === 'fleet' || r === 'workshop') s = '*';
  else if (r === 'dispatch') s = S.me.home_site && !S.dispoAll ? S.me.home_site : '*';
  return s === null ? href : href + (href.includes('?') ? '&' : '?') + 'vs=' + encodeURIComponent(s);
}
async function viewHome() {
  render(`<p class="muted">${esc(t('loading'))}</p>`, 'home');
  // Werkstatt/Leitung/Disposition: Fahrzeugliste für „Schaden melden“/Abfahrtskontrolle ohne Netz ebenfalls vorhalten (19.10.2026: offline
  // nach dem Anmelden nur „Keine Verbindung“) – einmal je Anmeldung im Hintergrund, Fahrer siehe unten
  if (S.me.role !== 'driver' && mayReport() && navigator.onLine) vehCacheRefresh();
  let d, cases;
  // Backlog 600: Teile der Startseite, die nicht von Zählern/Vorgängen abhängen, gleich mit anfordern (vorher erst danach – Werkstatt
  // bis zu 7 Abfragen nacheinander, Fahrer 3). Fehler bleiben erhalten (early: erst beim await wirksam, vorher keine unbehandelte Ablehnung).
  const mvP = S.me.role === 'driver' ? early(api('GET', '/api/me/vehicles')) : null;
  const boardP = S.me.role === 'workshop' ? early(workshopBoard()) : S.me.role !== 'driver' && isMgr() ? early(fleetTodo()) : null;
  try {
    // Disposition mit Standard-Standort: Standort schon serverseitig filtern – sonst verdrängen neuere Vorgänge anderer Standorte die eigenen aus den 8 (19.10.2026)
    const dsite = S.me.role === 'dispatch' && S.me.home_site && !S.dispoAll ? '&vsite=' + encodeURIComponent(S.me.home_site) : '';
    // Zähler (Offen/Kritisch/Gesperrt) und Fahrzeugleiste ebenfalls je Standort (vorher flottenweit über der Standort-Tafel)
    // Backlog 600: gleichzeitig statt nacheinander (je eine Latenz weniger; Slow 3G ≈ 2 s)
    [d, cases] = await Promise.all([api('GET', '/api/dashboard' + (dsite ? '?' + dsite.slice(1) : '')), api('GET', '/api/cases?status=open&limit=8' + dsite).then((r) => r.cases)]);
  } catch (err) {
    if (!err.offline || S.me.role !== 'driver') throw err;
    d = {}; cases = null; // Fahrer ohne Netz: Startseite mit zuletzt gespeicherten Fahrzeugdaten
  }
  let html = `<h1>${esc(t('welcome'))}, ${esc(S.me.display_name)}</h1>${outboxBanner()}`;
  if (S.me.role === 'driver') {
    html += `<a class="btn block" href="#/new" style="margin:8px 0 12px">${esc(t('report_damage'))}</a><a class="btn secondary block" href="#/check">${esc(t('departure_check'))}</a><a class="btn secondary block" href="#/emergency" id="emhome" style="margin-top:8px">☎ ${esc(t('em_title'))}</a><p style="margin-top:8px"><a href="#/help">${esc(t('help'))} ›</a></p><section class="panel" id="pushnudge" hidden></section>`;
    const mvKey = `cfp_myveh_${S.me.id}_${S.me.environment}`;
    let mv = null; let mvOffline = false;
    try { mv = (await mvP).vehicles; try { localStorage.setItem(mvKey, JSON.stringify({ at: new Date().toISOString(), vehicles: mv })); } catch {}
      // Fahrzeugliste für „Schaden melden“/„Abfahrtskontrolle“ ohne Netz vorhalten (18.10.2026: ohne vorheriges Öffnen dieser Seiten offline unbenutzbar)
      vehCacheRefresh();
      // Rufnummern „Panne & Notfall“ ebenso vorhalten (20.10.2026: ohne vorheriges Öffnen mit Netz unterwegs leer)
      api('GET', '/api/emergency').then((d) => { try { localStorage.setItem(`cfp_emerg_${S.me.id}_${S.me.environment}_`, JSON.stringify({ at: new Date().toISOString(), d })); } catch {} }).catch(() => {}); }
    catch { try { const c = JSON.parse(localStorage.getItem(mvKey) || 'null'); if (c) { mv = c.vehicles; mvOffline = c.at; } } catch {} }
    if (mvOffline || cases === null) html += `<div class="panel alert">${esc(t('offline_view'))}${mvOffline ? ` (${esc(t('as_of'))} ${fmtDT(mvOffline)})` : ''}</div>`;
    if (mv && mv.length) html += `<h2>${esc(t('my_vehicle'))}</h2>${mv.map((v) => { const ob = outboxVeh(v.id); const obc = v.coupled && v.coupled.id ? outboxVeh(v.coupled.id) : { n: 0, crit: false }; const obCrit = ob.crit || obc.crit; const obN = ob.n + obc.n; return `<section class="panel ${v.locked || v.coupled?.locked || obCrit ? 'alert' : ''}"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${plate(v.plate, { locked: v.locked })}${coupledLockedChip(v.coupled)}${v.locked ? `<span class="chip kritisch">${esc(t('locked'))} – ${esc(t('do_not_drive'))}</span>` : v.open_cases_total ? `<span class="chip mittel">${esc(tn('open_reports_n', v.open_cases_total))}</span>` : obN || v.coupled?.locked || v.coupled?.open_cases_total ? '' : `<span class="chip ok">${esc(t('no_open_reports'))}</span>`}${v.coupled && !v.coupled.locked && v.coupled.open_cases_total ? `<span class="chip mittel" data-coupledopen>${esc(v.coupled.plate)}: ${esc(tn('open_reports_n', v.coupled.open_cases_total))}</span>` : ''}${obN ? `<span class="chip ${obCrit ? 'kritisch' : 'mittel'}" data-outboxveh>${esc(tn('outbox_veh_pending', obN))}</span>` : ''}</div>${obCrit ? `<p role="alert" data-outboxcrit><b>⚠ ${esc(t('outbox_veh_crit'))}</b></p>` : ''}
      ${drvNotes(v.notes)}
      ${v.eval_excluded ? `<p class="small" role="note" data-drvresting><b>⚠ ${esc(t('drv_resting'))}</b></p>` : ''}
      ${v.winter ? `<p class="small" role="note" data-drvwinter><b>❄ ${esc(t('drv_winter').replace('{p}', v.winter.noncompliant.map(posL).join(', ')))}</b></p>` : ''}
      <dl class="kv" style="margin-top:8px">${v.trailer_plate ? `<dt>${esc(t('trailer'))}</dt><dd>${esc(v.trailer_plate)}</dd>` : ''}<dt>${esc(t('km'))}</dt><dd>${v.last_km ? `${fmtKm(v.last_km.km)} <span class="small muted">(${fmtD(v.last_km.measured_at)})</span>` : '–'}</dd>${myPlanned(v)}${drvInspRows(v)}${(v.km_due || []).map((r) => `<dt>${esc(mk(r.kind))}</dt><dd>${esc(t('due_at_km'))} ${fmtKm(r.next_due_km)}${r.km_remaining < 0 ? ` <span class="chip kritisch">${esc(t('drv_overdue'))}</span>` : ` <span class="small">(${esc(t('km_left'))} ${fmtKm(r.km_remaining)})</span>`}${r.planned_date ? ` <span class="small">· ${esc(t('planned'))} ${fmtD(r.planned_date)}${r.planned_date === bDate() ? ' (' + esc(t('today')) + ')' : ''}</span>` : ''}</dd>`).join('')}</dl>${knownDefects(v.known_defects)}${relItems(v.open_items_after_release)}${drvCoupled(v.coupled)}</section>`; }).join('')}`;
    // Fahrer ohne zugeordnetes Fahrzeug (Erstnutzung, Rundgang Schritt 3): sagen, was fehlt (22.10.2026: Startseite zeigte nur die Knöpfe)
    else if (mv && !mvOffline) html += `<div class="panel" role="note" data-novehicle>${esc(t('drv_no_vehicle'))}</div>`;
    // Backlog 463: offene Rückfragen der Fuhrparkleitung zu eigenen Meldungen zuerst
    const qo = (cases || []).filter((c) => c.q_state === 'open');
    if (qo.length) html += `<section class="panel warn" role="note" id="qhome"><h2 style="margin-top:0">${esc(t('q_drv_title'))}</h2><p class="small">${esc(t('q_drv_hint'))}</p>${caseList(qo)}</section>`;
    if (cases) html += `<h2>${esc(t('nav_cases'))}</h2>${caseList(cases, t('no_cases_driver'))}`;
  } else {
    // Disposition mit Standard-Standort: Standortzeile vor den Zählern, damit klar ist, wofür die Zahlen gelten
    // Backlog 560: Druckkopf der Dispo-Startseite (Zeitpunkt, Person, Standort der Tafel)
    if (S.me.role === 'dispatch') { const hp = S.me.home_site && !S.dispoAll ? S.me.home_site : ''; html += `<div data-dprinthead>${printHead([t('dispo_print_title'), `${t('kpi_vsite')}: ${hp ? (hp === 'ohne' ? t('cs_nosite') : hp) : t('filter_all')}`])}</div>`; }
    if (S.me.role === 'dispatch' && S.me.home_site) { const hs0 = !S.dispoAll ? S.me.home_site : ''; html += `<p class="small muted noprint" id="dsitebar">${esc(t('kpi_vsite'))}: <b>${esc(hs0 ? (hs0 === 'ohne' ? t('cs_nosite') : hs0) : t('filter_all'))}</b> · <a href="#/" id="dsitetoggle">${esc(hs0 ? t('dispo_all_sites') : t('dispo_my_site'))}</a></p>`; }
    if (d.vehicles) {
      const v = d.vehicles; const tot = Math.max(v.total, 1);
      const seg = [['gesperrt', v.gesperrt, 'var(--stop)'], ['werkstatt', v.werkstatt, 'var(--mid)'], ['meldung_offen', v.meldung_offen, 'var(--signal)'], ['einsatzbereit_lt_system', v.einsatzbereit, 'var(--go)']];
      html += `<section class="panel"><h2 style="margin-top:0">${esc(t('vehicles'))}: ${v.total}</h2>
        <div class="fleetbar" role="img" aria-label="${esc(t('fleet_state'))}">${seg.map(([, n, c]) => `<span style="width:${(n / tot) * 100}%;background:${c}"></span>`).join('')}</div>
        <div class="legend">${seg.map(([k, n, c]) => `<a href="${hj(FB_HREF[k])}" data-fbk="${k}"><i style="background:${c}"></i>${esc(t('av_' + k))}: <b>${n}</b></a>`).join('')}${v.ruhend ? `<a class="muted" id="fbdormant" href="${hj('#/vehicles?f=dormant')}">${esc(t('eval_excluded'))}: <b>${v.ruhend}</b></a>` : ''}</div></section>`;
    }
    // Zähler führen zur passenden Liste (Backlog 238: „2 kritisch“ war nicht anklickbar, die Vorgangsliste kannte keinen solchen Filter)
    html += `<div class="stats"><a class="statlink" id="stopen" href="${hj('#/cases?f=open')}"><b>${d.open_cases}${d.open_cases_truncated ? '+' : ''}</b>${esc(t('open'))}</a><a class="statlink" id="stcrit" href="${hj('#/cases?f=critical')}"><b style="color:var(--stop)">${d.critical}</b>${esc(t('prio_kritisch'))}</a><a class="statlink" id="stlock" href="${hj('#/cases?f=locked')}"><b>${d.locked}</b>${esc(t('locked_cases'))}</a>
      ${S.me.role === 'workshop' ? `<div><b>${d.inbox}</b>${esc(t('act_acknowledge'))}</div><div><b>${d.in_progress}</b>${esc(t('st_in_reparatur'))}</div><div><b>${d.waiting_parts ?? 0}</b>${esc(t('st_wartet_teile'))}</div>` : ''}</div>`;
    if (d.findings && d.findings.length) {
      const n = d.findings.filter((f) => ['kritisch', 'handeln'].includes(f.severity)).reduce((s, f) => s + f.n, 0);
      if (n) html += `<a class="panel alert" style="display:block;text-decoration:none" href="#/master?sev=act" id="homefind"><b>${esc(t('not_clear'))}</b> · ${esc(t('findings'))} (${esc(t('asev_act'))}): ${fmtNum(n)}</a>`;
    }
    if (S.me.role === 'workshop') html += await boardP;
    else {
      if (isMgr()) html += await boardP;
      if (S.me.role === 'dispatch') {
        // Standard-Standort aus „Mein Konto“: Tafel nur für diesen Standort – sichtbar vermerkt und jederzeit auf „alle“ umschaltbar
        const hs = S.me.home_site && !S.dispoAll ? S.me.home_site : '';
        const hq = hs ? encodeURIComponent(hs) : '';
        const [dcs, dmo, dvs] = await Promise.all([cases === null ? [] : api('GET', '/api/cases?status=open&limit=500' + (hq ? '&vsite=' + hq : '')).then((r) => r.cases).catch(() => []), cases === null ? null : api('GET', '/api/maintenance' + (hq ? '?site=' + hq : '')).catch(() => null),
          cases === null ? [] : api('GET', '/api/vehicles').then((r) => r.vehicles).catch(() => [])]);
        html += dispoBoard(dcs, dmo && dmo.defects_without_case ? dmo.defects_without_case : [], new Map(dvs.filter((v) => v.coupled).map((v) => [v.id, v.coupled])), new Set(dvs.filter((v) => v.eval_excluded).map((v) => v.id)));
        if (cases !== null) html += await dispoBack(dcs, hq);
        // Neue Meldungen, deren Eingang die Leitung noch nicht bestätigt hat (gleiche Regel wie Filter `unreceived`; Standort wie die Tafel) –
        // vorher sah die Disposition „was ist neu?“ nur über die nach Dringlichkeit sortierte Liste (Blickwinkel „Disposition, erster Tag“, 26.10.2026)
        const nu = dcs.filter((c) => c.status === 'gemeldet' && !c.fleet_received_at).length;
        if (nu) html += `<p class="noprint"><a href="${hj('#/cases?f=unreceived')}" id="dunrec" data-site="${esc(hs)}"><b>${esc(t('dispo_unreceived'))} (${nu})</b></a></p>`;
        // Backlog 474: eingeschränkt fahrbereit gemeldet, noch ohne Werkstattauftrag und ohne Sperre (gleiche Regel wie Filter `limited`) –
        // stand vorher in keinem Abschnitt der Tafel; nur Hinweis, ob das Fahrzeug eingeplant wird, entscheidet die Disposition
        const nlL = dcs.filter((c) => c.status === 'gemeldet' && !c.safety_lock && c.reported_driveability === 'eingeschraenkt'); const nl = nlL.length;
        if (nl) html += `<p class="noprint"><a href="${hj('#/cases?f=limited')}" id="dlimited"><b>${esc(t('dispo_limited_new'))} (${nl})</b></a></p>${dispoPrintLine('limited', t('dispo_limited_new'), nlL.map((c) => c.plate))}`;
        // Fahrzeuge mit aktiven Hinweisen (z. B. „Ladebordwand nur manuell“) – Link auf die gefilterte Fahrzeugliste; Standortregel wie oben
        // Backlog 475: gleiche Standortregel wie Server/Fahrzeugliste (siteKeyUi: NFC, Leerraum vereinheitlicht) – vorher zählte z. B. „Nürnberg  Süd“
        // (doppeltes Leerzeichen) hier nicht mit, die verlinkte Liste zeigte es aber
        const nk = siteKeyUi;
        const wn = dvs.filter((v) => v.notes_active > 0 && (!hs || nk(v.site) === nk(hs === 'ohne' ? null : hs))).length;
        if (wn) html += `<p class="noprint"><a href="${hj('#/vehicles?f=with_notes')}" id="dnotes">${esc(t('vnotes_with_veh'))} (${wn})</a></p>`;
        // Prüfung/Wartung überfällig (gleiche Regel wie der Filter der Fahrzeugliste, ohne ruhende) – vorher nur in der Liste sichtbar (23.10.2026)
        const moL = dvs.filter((v) => !v.eval_excluded && (!hs || nk(v.site) === nk(hs === 'ohne' ? null : hs)) && ((v.next_due && v.next_due < bDate()) || (v.km_remaining !== null && v.km_remaining !== undefined && v.km_remaining < 0))); const mo = moL.length;
        if (mo) html += `<p class="noprint"><a class="panel alert" style="display:block;text-decoration:none" href="${hj('#/vehicles?f=maint_overdue')}" id="dmover"><b>${esc(t('av_maint_overdue'))} (${mo})</b></a></p>${dispoPrintLine('mover', t('av_maint_overdue'), moL.map((v) => v.plate + (v.next_due && v.next_due < bDate() ? ` (${v.next_due_kind ? mk(v.next_due_kind) + ' ' : ''}${fmtD(v.next_due)})` : '')), true)}`;
        html += dispoDueSoon(dvs, (v) => !hs || nk(v.site) === nk(hs === 'ohne' ? null : hs), dmo && Array.isArray(dmo.rows) ? dmo.rows : null);
        // Gespann gesperrt (gekoppeltes Fahrzeug gesperrt, eigenes nicht; ohne ruhende) – gleiche Regel wie der Filter der Fahrzeugliste (Backlog 209,
        // Teilagent „Panne – Ersatzfahrzeug“: Lkw mit gesperrtem Anhänger zählte grün und war nur über den Anhänger erkennbar)
        const clL = dvs.filter((v) => !v.eval_excluded && v.availability !== 'gesperrt' && v.coupled && v.coupled.availability === 'gesperrt' && (!hs || nk(v.site) === nk(hs === 'ohne' ? null : hs))); const cl = clL.length;
        if (cl) html += `<p class="noprint"><a class="panel alert" style="display:block;text-decoration:none" href="${hj('#/vehicles?f=coupled_locked')}" id="dcoupled"><b>${esc(t('av_coupled_locked'))} (${cl})</b></a></p>${dispoPrintLine('coupled', t('av_coupled_locked'), clL.map((v) => `${v.plate} (🔗 ${t('vk_' + v.coupled.kind)} ${v.coupled.plate})`), true)}`;
        if (cases !== null) html += await dispoWinter(hs);
        html += `<p class="noprint"><button type="button" class="btn secondary" id="dprint">${esc(t('print'))}</button></p>`;
        html += helpLink('dispo');
      }
      if (S.me.role === 'dispatch' && cases !== null) html += await dispoPlanned(S.me.home_site && !S.dispoAll ? S.me.home_site : '');
      // Disposition mit Standard-Standort: offene Vorgänge ebenfalls nur dieses Standorts (gleiche Regel wie Server: getrimmt, ohne Groß-/Kleinschreibung)
      const dk = siteKeyUi;
      const shown = S.me.role === 'dispatch' && S.me.home_site && !S.dispoAll && cases ? cases.filter((c) => dk(c.vehicle_site) === dk(S.me.home_site === 'ohne' ? null : S.me.home_site)) : cases;
      html += `<h2>${esc(t('open'))}</h2>${caseList(shown)}<p class="navlinks"><a href="${hj('#/cases')}">${esc(t('all'))}</a></p>`;
      if (S.me.role === 'viewer') html += helpLink('viewer');
    }
  }
  render(html, 'home');
  bindWsFlow();
  pushNudge().catch(() => {});
  const trb = $('#todoretry'); if (trb) trb.onclick = async () => { await viewHome(); };
  // Liste mit demselben Standort wie die gezählte Tafel (Standard-Standort bzw. „alle“)
  const dunr = $('#dunrec'); if (dunr) dunr.onclick = () => { S.caseVsite = dunr.dataset.site; };
  const dtg = $('#dsitetoggle'); if (dtg) dtg.onclick = (e) => { e.preventDefault(); S.dispoAll = !S.dispoAll; route(); };
  const dpr = $('#dprint'); if (dpr) dpr.onclick = () => window.print();
}
// Backlog 560: Warnhinweise der Dispo-Tafel im Ausdruck mit Kennzeichen (am Bildschirm nur Zähler mit Link auf die Liste)
function dispoPrintLine(key, label, items, alert = false) {
  if (!items.length) return '';
  const sorted = [...items].sort(plateCmp);
  return `<div class="print-only panel small${alert ? ' alert' : ''}" data-dprint="${esc(key)}"><b>${esc(label)} (${items.length})</b>: ${sorted.map(esc).join(', ')}</div>`;
}

// Disposition: nicht einplanbare Fahrzeuge (gesperrt / in Werkstatt / wartet auf Teile) mit Status und „seit“ – nur gespeicherte Angaben
// Prüfung mit gefährlichen Mängeln bzw. verkehrsunsicher, zu der noch kein Vorgang existiert (sonst greift die Sperre/der Auftrag oben)
const DISPO_DEFECTS = ['gefaehrliche_maengel', 'verkehrsunsicher'];
function dispoBoard(cs, defects = [], coupled = new Map(), dormant = new Set()) {
  const insp = defects.filter((x) => DISPO_DEFECTS.includes(x.result)).sort((a, b) => (a.result === 'verkehrsunsicher' ? -1 : 0) - (b.result === 'verkehrsunsicher' ? -1 : 0) || plateCmp(a.plate, b.plate));
  const inspHtml = insp.length ? `<h2>${esc(t('dispo_insp_defects'))}</h2><div class="list">${insp.map((x) => `<a class="row p-kritisch" href="#/vehicles/${encodeURIComponent(x.vehicle_id)}">${plate(x.plate)}<span class="title" style="white-space:normal">${esc(t('res_' + x.result))}${x.result === 'verkehrsunsicher' ? ' – ' + esc(t('do_not_drive')) : ''}</span><span class="chip kritisch">${esc(mk(x.kind))} ${fmtD(x.done_date)}</span><span class="sub wrap" data-inspsub>${esc(t('dispo_insp_hint'))}${coupled.has(x.vehicle_id) ? ` · <b data-inspcoupled>${esc(t(coupled.get(x.vehicle_id).kind === 'anhaenger' ? 'trailer' : 'truck'))} ${esc(coupled.get(x.vehicle_id).plate)}</b>` : ''}</span></a>`).join('')}</div>` : '';
  return inspHtml + dispoCases(cs, !!insp.length, coupled, dormant);
}
// Backlog 458 (Blickwinkel „Disposition fragt am Nachmittag: welcher Lkw ist morgen früh wieder da?“): Fahrzeuge, deren Vorgang heute oder gestern
// technisch freigegeben wurde und die kein anderer offener Vorgang blockiert – mit Freigabezeit, Werkstatt und „Abholung nach der Reparatur“.
// Vorher verschwand ein Fahrzeug nach der Freigabe still aus „Nicht einplanen“ (nur ein Push), wo es abzuholen ist, stand nur im Vorgang.
const DISPO_BLOCK_ST = ['werkstatt_freigegeben', 'in_reparatur', 'wartet_teile', 'abschlusskontrolle'];
const DISPO_BACK_LIMIT = 200;
function lastWorkdayBefore(iso) {
  // reine Kalenderrechnung (UTC-Mittag als Anker, Jahr/Monat/Tag ohne toISOString – Wächter für Berliner Kalendertage)
  const ymd = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  let d = new Date(Date.parse(iso + 'T12:00:00Z'));
  for (let i = 0; i < 10; i++) { d = new Date(d.getTime() - 86400000); const wd = d.getUTCDay(); if (wd !== 0 && wd !== 6 && !federalHoliday(ymd(d))) return ymd(d); }
  return ymd(new Date(Date.parse(iso + 'T12:00:00Z') - 86400000));
}
// Backlog 559: nächster Werktag nach `iso` (Sa/So und bundesweite Feiertage übersprungen) – wie lastWorkdayBefore
function nextWorkdayAfter(iso) {
  const ymd = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  let d = new Date(Date.parse(iso + 'T12:00:00Z'));
  for (let i = 0; i < 10; i++) { d = new Date(d.getTime() + 86400000); const wd = d.getUTCDay(); if (wd !== 0 && wd !== 6 && !federalHoliday(ymd(d))) return ymd(d); }
  return ymd(new Date(Date.parse(iso + 'T12:00:00Z') + 86400000));
}
// Backlog 559 (Blickwinkel „Disposition Freitag → Montag“): Prüf-/Wartungsfristen von heute bis zum nächsten Werktag (Wochenende/Feiertage
// dazwischen eingeschlossen) als eigene Gruppe – Anhänger mit Zugmaschine; Überfälliges steht weiter in „Prüfung/Wartung überfällig“
function dispoDueSoon(dvs, inSite, mrows = null) {
  const today = bDate(); const nwd = nextWorkdayAfter(today);
  const byV = new Map(dvs.map((v) => [v.id, v])); const g = new Map();
  // Backlog 564: alle Fristen des Zeitraums je Fahrzeug aus der Prüfterminliste (auch neben einer schon überfälligen Frist); ohne Liste nur `next_due`
  const put = (v, kind, due) => { if (!v || v.eval_excluded || !inSite(v) || !due || due < today || due > nwd) return; const x = g.get(v.id) || { v, d: [] }; x.d.push({ kind, due }); g.set(v.id, x); };
  if (Array.isArray(mrows)) for (const r of mrows) { if (!['erledigt', 'nicht_pflichtig'].includes(r.status)) put(byV.get(r.vehicle_id), r.kind, r.next_due_date); }
  else for (const v of dvs) put(v, v.next_due_kind, v.next_due);
  const list = [...g.values()].map((x) => ({ ...x, d: x.d.sort((a, b) => a.due.localeCompare(b.due) || String(a.kind).localeCompare(String(b.kind))) }))
    .sort((a, b) => a.d[0].due.localeCompare(b.d[0].due) || plateCmp(a.v.plate, b.v.plate));
  if (!list.length) return '';
  const dueTxt = (d) => (d === today ? t('today') : fmtDue(d));
  return `<h2 id="dduesoon">${esc(t('dispo_due_soon').replace('{d}', fmtDue(nwd)))} <span class="chip mittel">${list.length}</span></h2><p class="small muted">${esc(t('dispo_due_soon_hint'))}</p><div class="list">${list.map(({ v, d }) => `<a class="row p-mittel" href="#/vehicles/${encodeURIComponent(v.id)}" data-dduesoon>${plate(v.plate)}<span class="title" style="white-space:normal">${d.length > 1 ? d.map((x) => `${esc(x.kind ? mk(x.kind) : t('next_due'))} (${esc(dueTxt(x.due))})`).join(' · ') : esc(d[0].kind ? mk(d[0].kind) : t('next_due'))}</span><span class="chip mittel" style="white-space:nowrap">${esc(dueTxt(d[0].due))}</span>${v.coupled ? `<span class="sub wrap" data-dduecoupled>🔗 ${esc(t('vk_' + v.coupled.kind))} ${esc(v.coupled.plate)}</span>` : ''}</a>`).join('')}</div>`;
}
async function dispoBack(open, hq = '') {
  let rows;
  try { rows = (await api('GET', `/api/cases?status=fahrzeug_freigegeben&sort=updated&limit=${DISPO_BACK_LIMIT}${hq ? '&vsite=' + hq : ''}`)).cases; } catch { return ''; }
  // Backlog 556 (Blickwinkel „Disposition plant am Freitag den Montag“): seit dem letzten Werktag vor heute (Sa/So und bundesweite Feiertage
  // übersprungen) – vorher „gestern“: am Sonntag/Montag fehlten die Freitags-Freigaben samt Abholvermerk
  const from = lastWorkdayBefore(bDate());
  const blocked = new Set(open.filter((c) => c.safety_lock || DISPO_BLOCK_ST.includes(c.status)).map((c) => c.vehicle_id));
  const byV = new Map();
  for (const c of rows) {
    if (!c.closed_at || BERLIN_FMT.format(new Date(c.closed_at)) < from || blocked.has(c.vehicle_id)) continue;
    const cur = byV.get(c.vehicle_id); if (!cur || c.closed_at > cur.closed_at) byV.set(c.vehicle_id, c);
  }
  // updated_at ≥ closed_at: mit voller Seite und letzter Zeile noch im Zeitraum könnten ältere Änderungen fehlen – dann „+“ statt still kürzen
  const more = rows.length >= DISPO_BACK_LIMIT && rows.length && BERLIN_FMT.format(new Date(rows[rows.length - 1].updated_at)) >= from;
  const list = [...byV.values()].sort((a, b) => String(b.closed_at).localeCompare(String(a.closed_at)));
  if (!list.length) return '';
  return `<h2 id="dback">${esc(from === bDate(-1) ? t('dispo_back') : t('dispo_back_since').replace('{d}', fmtD(from)))} <span class="chip ok">${list.length}${more ? '+' : ''}</span></h2><p class="small muted">${esc(t('dispo_back_hint'))}</p><div class="list">${list.map((c) => `<a class="row p-niedrig" href="#/cases/${esc(c.id)}" data-dback>${plate(c.plate)}<span class="title" style="white-space:normal">${ltxt(clipTxt(cDesc(c.description), 80))}</span><span class="chip ok" style="white-space:nowrap">${esc(t('dispo_back_at'))} ${fmtDT(c.closed_at)}</span><span class="sub wrap">${esc(c.case_no)}${c.workshop_site ? ' · ' + esc(wsName(c.workshop_site)) : ''}${c.pickup_note ? ` · <b data-dbpickup>${esc(t('pu_title'))}:</b> <span${langAttr(c.pickup_note)}>${esc(clipTxt(c.pickup_note, 120))}</span>` : ''}</span></a>`).join('')}</div>`;
}
// Backlog 459 (Blickwinkel „Lkw hat nächste Woche einen Werkstatttermin – darf die Disposition ihn bis dahin einplanen?“): ein erteilter
// Werkstattauftrag mit Termin nach heute, noch nicht begonnen, ohne Sperre, ohne eingetragenen Standort/Abschleppung und nicht „nicht
// fahrbereit“ gemeldet, blockiert das Fahrzeug bis zum Vortag nicht. Vorher stand es ab der Freigabe in „Nicht einplanen“ (Disposition
// suchte unnötig Ersatz). Fahrzeugleiste/`availability` bleiben unverändert („In Werkstatt“, offene Frage an den Auftraggeber).
function dispoUpcoming(c, today) {
  return c.status === 'werkstatt_freigegeben' && !c.safety_lock && !!c.planned_date && c.planned_date > today && !c.vehicle_location && !c.tow_service && c.reported_driveability !== 'nicht_fahrbereit';
}
function dispoDayBefore(d) { const [y, m, dd] = String(d).split('-').map(Number); const x = new Date(Date.UTC(y, m - 1, dd - 1)); return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`; }
function dispoCases(cs, hasOther = false, coupled = new Map(), dormant = new Set()) {
  const byV = new Map(); const upc = new Map(); const today0 = bDate();
  const rank = (c) => (c.safety_lock ? 3 : c.status === 'wartet_teile' ? 2 : dispoUpcoming(c, today0) ? 0 : ['werkstatt_freigegeben', 'in_reparatur', 'abschlusskontrolle'].includes(c.status) ? 1 : 0);
  for (const c of cs) if (dispoUpcoming(c, today0)) { const u = upc.get(c.vehicle_id); if (!u || c.planned_date < u.planned_date) upc.set(c.vehicle_id, c); }
  // gleicher Rang: der früher begonnene Vorgang (Fahrzeug ist seit der ältesten Sperre nicht einplanbar – vorher zeigte „seit“ die jüngste, 21.10.2026)
  const since = (r, c) => String(r === 3 ? c.lock_since || c.created_at : c.status_since || c.updated_at || '');
  for (const c of cs) { const r = rank(c); if (!r) continue; const cur = byV.get(c.vehicle_id); if (!cur || r > cur.r || (r === cur.r && since(r, c) < since(cur.r, cur.c))) byV.set(c.vehicle_id, { r, c }); }
  const list = [...byV.values()].sort((a, b) => b.r - a.r || plateCmp(a.c.plate, b.c.plate));
  const up = [...upc.values()].filter((c) => !byV.has(c.vehicle_id)).sort((a, b) => String(a.planned_date).localeCompare(String(b.planned_date)) || plateCmp(a.plate, b.plate));
  const upHtml = up.length ? `<h2 id="dupc">${esc(t('dispo_upcoming'))} <span class="chip">${up.length}</span></h2><p class="small muted">${esc(t('dispo_upcoming_hint').replace('{w}', t('av_werkstatt')))}</p><div class="list">${up.map((c) => `<a class="row p-niedrig" href="#/cases/${esc(c.id)}" data-dupc>${plate(c.plate)}<span class="title" style="white-space:normal">${esc(t('dispo_upcoming_on').replace('{d}', fmtDue(c.planned_date)))}</span><span class="chip ok" style="white-space:nowrap" data-dupcuntil>${esc(t('dispo_upcoming_until').replace('{d}', fmtD(dispoDayBefore(c.planned_date))))}</span>${dormant.has(c.vehicle_id) ? ` <span class="chip" data-dormant>${esc(t('eval_excluded'))}</span>` : ''}<span class="sub wrap">${esc(c.case_no)}${c.workshop_site ? ' · ' + esc(wsName(c.workshop_site)) : ''}${coupled.has(c.vehicle_id) ? ` · <b>${esc(t(coupled.get(c.vehicle_id).kind === 'anhaenger' ? 'trailer' : 'truck'))} ${esc(coupled.get(c.vehicle_id).plate)}</b>` : ''}${c.reported_driveability === 'eingeschraenkt' ? ` · <b data-dupclim>${esc(t('dispo_upcoming_limited'))}</b>` : ''}${c.planned_note ? ` · <span data-plannote>${esc(clipTxt(c.planned_note, 80))}</span>` : ''} · ${ltxt(clipTxt(cDesc(c.description), 80))}</span></a>`).join('')}</div>` : '';
  if (!list.length) return (hasOther ? '' : `<section class="panel good"><b>${esc(t('dispo_all_ok'))}</b></section>`) + upHtml;
  // Unterzeile umbrechen (24.10.2026, Blickwinkel „Disposition plant die Woche“: am Tablet fielen „Teile erwartet am …“/„Rückkehr: ungeklärt“ ins „…“)
  return `<h2>${esc(t('dispo_not_plannable'))}</h2><div class="list">${list.map(({ r, c }) => `<a class="row ${r === 3 ? 'p-kritisch' : 'p-mittel'}" href="#/cases/${esc(c.id)}">${plate(c.plate, { locked: c.safety_lock })}<span class="title" style="white-space:normal">${esc(r === 3 ? t('locked') + ' – ' + t('do_not_drive') : t('st_' + c.status))}</span><span class="chip ${r === 3 ? 'kritisch' : 'mittel'}">${esc(t('since'))} ${fmtDT(r === 3 ? c.lock_since || c.created_at : c.status_since || c.updated_at)}</span>${dormant.has(c.vehicle_id) ? ` <span class="chip" data-dormant>${esc(t('eval_excluded'))}</span>` : ''}<span class="sub wrap" data-dnpsub>${esc(c.case_no)}${r === 3 && c.safety_lock_reason ? ` · <span data-lockreason>${esc(translateLockReason(S.lang, c.safety_lock_reason))}</span>` : ''}${coupled.has(c.vehicle_id) ? ` · <b>${esc(t(coupled.get(c.vehicle_id).kind === 'anhaenger' ? 'trailer' : 'truck'))} ${esc(coupled.get(c.vehicle_id).plate)}</b>` : ''}${c.workshop_site ? ' · ' + esc(wsName(c.workshop_site)) : ''}${r !== 3 && c.reported_driveability === 'eingeschraenkt' ? ` · <b data-dupclim>${esc(t('dispo_upcoming_limited'))}</b>` : ''}${hoMissing(c).length ? ` · <b data-hodispo>${esc(hoMissing(c).join(', '))}</b>` : ''}${c.tow_service || c.vehicle_location ? ` · <span data-vloc>${c.tow_service ? `<b>${esc(t('vl_towed_chip'))}</b>` : ''}${c.tow_service && c.vehicle_location ? ': ' : ''}${esc(c.vehicle_location || '')}${vlAt(c)}</span>` : ''}${c.planned_date && c.status !== 'abschlusskontrolle' ? ' · ' + esc(t('planned_ws_short')) + ' ' + fmtD(c.planned_date) + (c.planned_note ? ` <span data-plannote>(${esc(clipTxt(c.planned_note, 80))})</span>` : '') : ''}${partsEta(c)}${!dispoReturnKnown(c) ? ` · <b data-retunk>${esc(t('dispo_return_unknown'))}</b>` : ''}</span></a>`).join('')}</div>` + upHtml;
}

// Werkstatt-Startseite: Winterreifen-Arbeitsvorrat (gleiche Daten wie Disposition, Standort wie Reifen – Flotte); Sprung in die passenden Reiter
async function wsWinter(vsite = '') {
  const r = await api('GET', '/api/tires/winter' + (vsite ? '?site=' + encodeURIComponent(vsite) : '')).catch(() => null);
  if (!r || (!r.totals.nicht_erfuellt && !r.totals.unbekannt)) return '';
  // Liste mit demselben Standort wie die Zahlen (22.10.2026: Zahl für den Standard-Standort, Link auf alle Standorte – Liste zeigte mehr)
  const wl = (h) => `${h}&vs=${encodeURIComponent(vsite || '*')}`;
  const rows = r.noncompliant.map((x) => `<a class="row p-mittel" href="#/vehicles/${encodeURIComponent(x.vehicle_id)}?sec=tires">${plate(x.plate)}<span class="title" style="white-space:normal">${esc(t('winter_bad').replace('{p}', x.noncompliant.map(posL).join(', ')))}</span><span class="chip mittel">${esc(t('ws_nicht_erfuellt'))}</span>${x.missing.length || x.open_order || x.closed_order ? `<span class="sub wrap">${[x.missing.length && esc(t('winter_missing').replace('{p}', x.missing.map(posL).join(', '))), x.open_order && woApptTxt(x.open_order), x.closed_order && `⚠ ${esc(t('wo_closed_short').replace('{no}', x.closed_order.case_no))}`].filter(Boolean).join(' · ')}</span>` : ''}</a>`).join('');
  return `<section id="wswinter"><h2>${esc(t('ws_winter'))}${r.totals.nicht_erfuellt ? ` <span class="chip">${r.totals.nicht_erfuellt}</span>` : ''}</h2><p class="small muted">${esc(t('ws_winter_hint'))}</p>${rows ? `<div class="list">${rows}</div><p class="small noprint"><a href="${wl('#/tires?f=winter_bad')}" id="wswbad">${esc(t('ws_winter_show'))} ›</a></p>` : ''}${r.noncompliant.some((x) => x.closed_order) ? `<p class="small noprint"><a href="${wl('#/tires?f=winter_closed')}" id="wswclosed">${esc(t('tires_winter_closed'))} ›</a></p>` : ''}${r.totals.unbekannt ? `<p class="small noprint"><a href="${wl('#/tires?f=winter_unknown')}" id="wswunk">${esc(t('ws_winter_unknown').replace('{n}', r.totals.unbekannt))} ›</a></p>` : ''}</section>`;
}

// Disposition: Lkw ohne ausreichende Winterkennzeichnung (laut Erfasstem) – nur Information, keine Sperre (situative Pflicht bei Glätte)
async function dispoWinter(vsite = '') {
  const r = await api('GET', '/api/tires/winter' + (vsite ? '?site=' + encodeURIComponent(vsite) : '')).catch(() => null);
  if (!r || (!r.totals.nicht_erfuellt && !r.totals.unbekannt)) return '';
  const rows = r.noncompliant.map((x) => `<a class="row p-mittel" href="#/vehicles/${encodeURIComponent(x.vehicle_id)}?sec=tires">${plate(x.plate)}<span class="title" style="white-space:normal">${esc(t('winter_bad').replace('{p}', x.noncompliant.map(posL).join(', ')))}</span><span class="chip mittel">${esc(t('ws_nicht_erfuellt'))}</span>${x.missing.length || x.open_order || x.closed_order ? `<span class="sub wrap">${[x.missing.length && esc(t('winter_missing').replace('{p}', x.missing.map(posL).join(', '))), x.open_order && woApptTxt(x.open_order), x.closed_order && `⚠ ${esc(t('wo_closed_short').replace('{no}', x.closed_order.case_no))}`].filter(Boolean).join(' · ')}</span>` : ''}</a>`).join('');
  // nur unvollständig erfasst (keine Lkw „nicht erfüllt“): neutrale Überschrift statt „nicht wintertauglich“ (23.10.2026)
  return `<section id="dwinter"><h2>${esc(t(r.totals.nicht_erfuellt ? 'dispo_winter' : 'dispo_winter_incomplete'))}</h2>${rows ? `<div class="list">${rows}</div>` : ''}${r.totals.unbekannt ? `<p class="small">${esc(t('dispo_winter_unknown').replace('{n}', r.totals.unbekannt))}</p>` : ''}<p class="small muted">${esc(t('dispo_winter_hint'))}</p></section>`;
}

// Kennzeichnung „Winterreifen“ für Aufträge aus der Fahrzeugakte → Reifen (Beschreibung ist deutsch, das Etikett übersetzt)
function woTag(i) { return i.tire_order === 'winter' ? `<span class="chip mittel wotag">❄ ${esc(t('wo_tag'))}</span> ` : ''; }

// Unterzeile: Auftrag/Werkstatt und weitere geplante Tage desselben Fahrzeugs (Fahrzeug fällt dann mehrfach aus – Hinweis zum Zusammenlegen)
// Gespann (laut Stammliste) und „ruhend“ je Termin: Zugmaschine fällt mit dem Anhänger aus bzw. ruhendes Fahrzeug nicht einplanen (23.10.2026)
const planVehTag = (i) => [i.coupled ? `<span data-pcoupled>🔗 ${esc(t('vk_' + i.coupled.kind))} ${esc(i.coupled.plate)}</span>` : '', i.eval_excluded ? `<span class="chip" data-pdormant>${esc(t('eval_excluded'))}</span>` : ''].filter(Boolean).join(' ');
function dispoSub(i) {
  const parts = i.type === 'case' ? [esc(i.case_no), esc(wsName(i.workshop_site))] : [];
  // Hinweis zum Termin (Migration 0093): „nur vormittags“ o. ä. – die Disposition sieht, ob das Fahrzeug den ganzen Tag fehlt
  // Backlog 473: „laut Meldung eingeschränkt fahrbereit“ auch im Terminplan (Überführungsfahrt am Termintag; vorher nur bis zum Vortag sichtbar)
  if (i.type === 'case' && i.reported_driveability === 'eingeschraenkt' && !i.safety_lock) parts.push(`<b data-dupclim>${esc(t('dispo_upcoming_limited'))}</b>`);
  if (i.type === 'case' && i.planned_note) parts.push(`<b data-plannote>📝 ${esc(clipTxt(i.planned_note, 120))}</b>`);
  if (planVehTag(i)) parts.push(planVehTag(i));
  if (i.other_dates && i.other_dates.length) parts.push(`<b>${esc(t('plan_other_dates'))}: ${i.other_dates.map(fmtD).join(', ')}</b>`);
  // Backlog 477: umbrechen statt „…“ (Hinweis zum Termin, „eingeschränkt fahrbereit“ entscheiden, ob der Lkw heute ganz ausfällt)
  return parts.length ? `<span class="sub wrap">${parts.join(' · ')}</span>` : '';
}

// Disposition: geplante Werkstatt- und Prüftermine der nächsten 7 Tage (aus dem Werkstattplan, nur gespeicherte Termine)
async function dispoPlanned(vsite = '') {
  const r = await api('GET', '/api/workshop/plan?days=7' + (vsite ? '&vsite=' + encodeURIComponent(vsite) : '')).catch(() => null);
  if (!r || !r.days.length) return '';
  const rows = r.days.flatMap((d) => d.items.map((i) => `<a class="row ${i.type === 'case' ? 'p-' + esc(i.priority) : ''}" href="${i.type === 'case' ? '#/cases/' + esc(i.id) : '#/vehicles/' + encodeURIComponent(i.vehicle_id)}">${plate(i.plate, { locked: !!i.safety_lock })}<span class="title" style="white-space:normal">${i.type === 'case' ? woTag(i) + esc(t('planned_ws_short')) + ' · ' + esc(t('st_' + i.status)) : esc(t('planned_inspection')) + ': ' + esc(mk(i.kind))}</span><span class="chip${d.date === r.today ? ' ok' : ''}" style="white-space:nowrap">${d.date === r.today ? esc(t('today')) : esc(fmtDue(d.date))}${d.date !== r.today && d.date === nextWorkdayAfter(r.today) ? ` <b data-pnwd style="white-space:normal">· ${esc(t('next_workday'))}</b>` : ''}</span>${dispoSub(i)}</a>`));
  return `<h2>${esc(t('dispo_planned'))}</h2><p class="small muted">${esc(t('dispo_planned_hint'))}</p><div class="list">${rows.join('')}</div><p><a href="${hj('#/plan')}">${esc(t('wplan'))}</a></p>`;
}

// Fuhrparkleitung: „Heute zu tun“ – nur aus gespeicherten Daten, mit direkten Links
async function fleetTodo() {
  // Teilausfall (Funkloch, Zeitüberschreitung) zählen: vorher still „leer“ → grünes „Nichts Dringendes offen“ trotz offener Kostenfreigaben (23.10.2026)
  let failed = 0; const soft = (d) => () => { failed++; return d; };
  const [cs, ov, fs, tc, dr, ct, cl, wi, af] = await Promise.all([
    api('GET', '/api/cases?status=open&limit=500').then((r) => r.cases).catch(soft([])),
    api('GET', '/api/maintenance').catch(soft(null)),
    api('GET', '/api/fines?status=open').then((r) => Object.assign(r.fines, { warn_days: r.warn_days })).catch(soft([])),
    isMgr() ? api('GET', '/api/tacho').catch(soft(null)) : null,
    isMgr() ? api('GET', '/api/drivers').then((r) => r.drivers).catch(soft([])) : [],
    isMgr() ? api('GET', '/api/contracts?filter=aktiv').then((r) => r.contracts).catch(soft([])) : [],
    isMgr() ? api('GET', '/api/claims?filter=nachfassen').then((r) => r.claims).catch(soft([])) : [],
    // Lkw ohne Alpine-Symbol laut Erfassung – Entscheidung zur Umrüstung liegt bei der Fuhrparkleitung (nur Information, keine Sperre)
    isMgr() ? api('GET', '/api/tires/winter').then((r) => r.noncompliant).catch(soft([])) : [],
    // Fahrzeuge mit kritischen offenen Agentenbefunden (Felder nur für Inhaber/Fuhrparkleitung, Umgebung der Person)
    isMgr() ? api('GET', '/api/vehicles').then((r) => r.vehicles.filter((v) => v.agent_findings_critical > 0)).catch(soft([])) : [],
  ]);
  af.sort((a, b) => b.agent_findings_critical - a.agent_findings_critical || b.agent_findings_open - a.agent_findings_open || plateCmp(a.plate, b.plate));
  const today = bDate();
  const in7 = bDate(7);
  // Wartende zuerst (Backlog 239, Blickwinkel „Inhaber nach dem Urlaub“): die Liste kommt nach Dringlichkeit und *neueste* zuerst –
  // bei mehr als 8 Einträgen fielen gerade die am längsten wartenden Kostenfreigaben/Meldungen ins „+N“
  const asc = (f) => (a, b) => String(f(a) || '9').localeCompare(String(f(b) || '9'));
  const PR = { kritisch: 0, mittel: 1, niedrig: 2 };
  const groups = [
    // gesperrte zuerst (wie die Vorgangsliste, Backlog 193/278 – gesperrte Meldung mit „niedrig“ stand sonst hinten), Zeile nennt die Sperre
    ['todo_receive', cs.filter((c) => c.status === 'gemeldet' && !c.fleet_received_at).sort((a, b) => (b.safety_lock ? 1 : 0) - (a.safety_lock ? 1 : 0) || (PR[a.priority] ?? 3) - (PR[b.priority] ?? 3) || asc((c) => c.created_at)(a, b)), (c) => `#/cases/${c.id}`, (c) => `${c.case_no} · ${c.plate}${c.safety_lock ? ' · ' + t('locked') : ''}`, 'kritisch'],
    // Backlog 463: Antwort des Melders auf eine Rückfrage eingegangen, älteste Rückfrage zuerst
    ['todo_q_answered', cs.filter((c) => c.q_state === 'answered').sort(asc((c) => c.q_at)), (c) => `#/cases/${c.id}`, (c) => `${c.case_no} · ${c.plate} · ${t('q_asked_at')} ${fmtD(c.q_at)}`, 'mittel'],
    // Backlog 522 (Blickwinkel „Leitung im Urlaub, Inhaber vertritt“): Werkstatt meldet fehlenden Schlüssel/Fahrzeugschein – Leitung klärt (vorher nur Push/Vorgang)
    ['todo_handover', cs.filter((c) => hoMissing(c).length).sort(asc((c) => c.status_since || c.updated_at)), (c) => `#/cases/${c.id}`, (c) => `${c.case_no} · ${c.plate} · ${hoMissing(c).join(', ')}${c.workshop_site ? ' · ' + wsName(c.workshop_site) : ''}`, 'mittel'],
    ['todo_vfind_crit', af, (v) => `#/vehicles/${encodeURIComponent(v.id)}`, (v) => `${v.plate} · ${t('vfind_crit').replace('{n}', v.agent_findings_critical)} · ${t('vfind_n').replace('{n}', v.agent_findings_open)}`, 'kritisch'],
    ['todo_followup', cs.filter((c) => c.followup_on && c.followup_on <= today).sort(asc((c) => c.followup_on)), (c) => `#/cases/${c.id}`, (c) => `${c.case_no} · ${c.plate} · ${fmtD(c.followup_on)}${c.followup_note ? ' · ' + c.followup_note : ''}`, 'mittel'],
    ['todo_repeat', cs.filter(recentRepeat), (c) => `#/cases/${c.id}`, (c) => `${c.case_no} · ${c.plate} · ${fmtD(c.last_repeat_at)}`, 'mittel'],
    ['todo_cost_approval', cs.filter((c) => c.cost_over_limit_at).sort(asc((c) => c.cost_over_limit_at)), (c) => `#/cases/${c.id}`, (c) => `${c.case_no} · ${c.plate}${c.workshop_site ? ' · ' + wsName(c.workshop_site) : ''} · ${fmtD(c.cost_over_limit_at)}`, 'mittel'],
    ['todo_qc', cs.filter((c) => c.status === 'abschlusskontrolle').sort(asc((c) => c.status_since || c.updated_at)), (c) => `#/cases/${c.id}`, (c) => `${c.case_no} · ${c.plate}`, 'mittel'],
    ['todo_plan_passed', cs.filter((c) => c.status === 'werkstatt_freigegeben' && c.planned_date && c.planned_date < today).sort(asc((c) => c.planned_date)), (c) => `#/cases/${c.id}`, (c) => `${c.case_no} · ${c.plate} · ${fmtD(c.planned_date)}${c.workshop_site ? ' · ' + wsName(c.workshop_site) : ''}`, 'mittel'],
    ['todo_parts_passed', cs.filter((c) => c.status === 'wartet_teile' && c.parts_expected_date && c.parts_expected_date < today).sort(asc((c) => c.parts_expected_date)), (c) => `#/cases/${c.id}`, (c) => `${c.case_no} · ${c.plate} · ${t('parts_eta')} ${fmtD(c.parts_expected_date)}${c.workshop_site ? ' · ' + wsName(c.workshop_site) : ''}`, 'mittel'],
    ['todo_parts', cs.filter((c) => c.status === 'wartet_teile' && !(c.parts_expected_date && c.parts_expected_date < today)).sort(asc((c) => c.status_since || c.updated_at)), (c) => `#/cases/${c.id}`, (c) => { const d = partsWaitDays(c); return `${c.case_no} · ${c.plate}${c.parts_expected_date ? ' · ' + t('parts_eta') + ' ' + fmtD(c.parts_expected_date) : ' · ' + t('parts_eta_none')}${d ? ' · ' + t('parts_wait_days').replace('{d}', nDays(d)) : ''}${c.workshop_site ? ' · ' + wsName(c.workshop_site) : ''}`; }, ''], // Backlog 447: Wartezeit, fehlender Termin und Werkstatt – wen die Leitung anruft
    ['todo_defects_no_case', ov && ov.defects_without_case ? ov.defects_without_case : [], (x) => `#/vehicles/${encodeURIComponent(x.vehicle_id)}`, (x) => `${x.plate} · ${mk(x.kind)} ${fmtD(x.done_date)} · ${t('res_' + x.result)}`, 'kritisch'],
    ['todo_reinspection', ov && ov.reinspection_pending ? ov.reinspection_pending : [], (x) => `#/vehicles/${encodeURIComponent(x.vehicle_id)}`, (x) => `${x.plate} · ${mk(x.kind)} ${fmtD(x.done_date)} · ${t('res_' + x.result)} · ${x.case_no} ${t('released_short')} ${fmtD(x.closed_at)}`, 'mittel'],
    ['todo_result_missing', ov && ov.result_missing ? ov.result_missing : [], (x) => `#/vehicles/${encodeURIComponent(x.vehicle_id)}?ev=${encodeURIComponent(x.id)}`, (x) => `${x.plate} · ${mk(x.kind)} ${fmtD(x.done_date)}`, ''],
    ['todo_maint_unrecorded', ov ? ov.rows.filter((r) => r.unrecorded_order) : [], (r) => `#/vehicles/${encodeURIComponent(r.vehicle_id)}`, (r) => `${r.plate} · ${mk(r.kind)} · ${r.unrecorded_order.case_no} ${t('released_short')} ${fmtD(r.unrecorded_order.closed_at)}`, 'mittel'],
    ['todo_inspections', ov ? ov.rows.filter((r) => r.status === 'ueberfaellig' || (r.next_due_date && r.next_due_date <= in7 && r.date_status !== 'erledigt')) : [], (r) => `#/vehicles/${encodeURIComponent(r.vehicle_id)}`, (r) => `${r.plate} · ${mkR(r)} · ${r.km_status === 'ueberfaellig' ? `${t('due_at_km')} ${fmtKm(r.next_due_km)} (${t('km_over')} ${fmtKm(-r.km_remaining)})` : r.next_due_date ? fmtD(r.next_due_date) : (r.next_due_km ? fmtKm(r.next_due_km) : '')} · ${r.planned_date && r.planned_date >= today ? t('planned') + ' ' + fmtD(r.planned_date) : t('no_planned_date')}`, 'mittel'],
    ['todo_tacho', tc ? [...tc.drivers.map((x) => ({ ...x, label: x.display_name, href: '#/drivers/' + x.id })), ...tc.vehicles.map((x) => ({ ...x, label: x.plate, href: '#/vehicles/' + encodeURIComponent(x.id) }))].filter((x) => x.status === 'ueberfaellig' || x.status === 'bald')
      // Fahrer und Fahrzeuge gemeinsam nach Dringlichkeit, dann Frist – ein überfälliger Massenspeicher stand sonst hinter acht „bald fälligen“ Fahrerkarten im „+N“ (23.10.2026)
      .sort((a, b) => (a.status === 'ueberfaellig' ? 0 : 1) - (b.status === 'ueberfaellig' ? 0 : 1) || String(a.due || '9').localeCompare(String(b.due || '9'))) : [], (x) => x.href, (x) => `${x.label} · ${fmtD(x.due)}${x.status === 'ueberfaellig' ? ' !' : ''}`, 'mittel'],
    ['todo_driver_docs', dr.filter((d) => (d.status.overall_docs || d.status.overall) === 'kritisch'), /* Auslesung steht unter todo_tacho */ (d) => `#/drivers/${d.id}`, (d) => `${d.display_name} · ${[...d.status.items.filter((i) => i.status === 'abgelaufen').map((i) => t('dk2_' + i.kind) + (i.title ? ' ' + i.title : '')), d.status.check.status === 'mangel' ? t('license_check') : ''].filter(Boolean).join(', ')}`, 'kritisch'],
    ['todo_contracts', ct.filter((c) => (c.status.end && (c.status.end.status === 'abgelaufen' || c.end_date <= in7)) || (c.status.notice && c.status.notice.by >= today && c.status.notice.by <= in7)), (c) => `#/vehicles/${encodeURIComponent(c.vehicle_id)}`,
      (c) => `${c.plate} · ${t('ck_' + c.kind)} · ${c.status.notice && c.status.notice.by >= today && c.status.notice.by <= in7 ? t('ct_notice_by') + ' ' + fmtD(c.status.notice.by) : t('ct_end') + ' ' + fmtD(c.end_date)}${c.end_date < today ? ' !' : ''}`, 'mittel'],
    ['todo_claims', cl, (c) => `#/cases/${c.case_id}`, (c) => `${c.case_no} · ${c.plate} · ${c.insurer} · ${tn('claim_days_open', c.days_open)}`, ''],
    ['todo_winter', wi, (x) => `#/vehicles/${encodeURIComponent(x.vehicle_id)}?sec=tires`, (x) => `${x.plate} · ${t('winter_bad').replace('{p}', x.noncompliant.map(posL).join(', '))}${x.open_order ? ` · 🔧 ${t('mo_open')} ${x.open_order.case_no}` : ''}${x.closed_order ? ` · ⚠ ${t('wo_closed_short').replace('{no}', x.closed_order.case_no)}` : ''}`, ''],
    ['todo_fines', fs.filter((f) => f.response_due && f.response_due <= (Number.isInteger(fs.warn_days) ? bDate(fs.warn_days) : in7) && ['eingegangen', 'fahrer_ermittelt', 'fahrer_informiert'].includes(f.status)), (f) => `#/fines/${f.id}`, (f) => `${f.fine_no} · ${f.plate || f.plate_in_letter} · ${fmtDue(f.response_due)}${f.response_due < today ? ' !' : ''}`, 'mittel'],
  ].filter(([, list]) => list.length);
  const failNote = failed ? `<section class="panel alert" role="alert" data-todofail><b>${esc(t('todo_partial_fail'))}</b> <button type="button" class="btn secondary" id="todoretry">${esc(t('retry'))}</button></section>` : '';
  if (failed && !groups.length) return failNote;
  // Erstnutzung/Lücken (22.10.2026): „Nichts Dringendes offen“ stand grün auch ohne Fahrzeuge bzw. mit Pflichtprüfungen ohne Termin
  if (!groups.length && ov && ov.totals && ov.totals.vehicles === 0) return `<section class="panel" role="note" data-novehicles><b>${esc(t('todo_none'))}</b><p class="small">${esc(t('todo_no_vehicles'))} <a href="#/vehicles">${esc(t('nav_vehicles'))} ›</a></p></section>`;
  if (!groups.length && ov && ov.gaps && ov.gaps.length) return `<section class="panel" role="note" data-todogaps><b>${esc(t('todo_none'))}</b><p class="small">${esc(tn('todo_gaps_hint', ov.gaps.length))} <a href="#/maintenance?f=gaps">${esc(t('maintenance'))} ›</a></p></section>`;
  if (!groups.length) return `<section class="panel good"><b>${esc(t('todo_none'))}</b></section>`;
  return `${failNote}<h2>${esc(t('todo_today'))}</h2>${groups.map(([k, list, href, label, cls]) => `<details class="panel"${cls === 'kritisch' ? ' open' : ''}><summary><b>${esc(t(k))}</b> <span class="chip ${cls}">${list.length}${(ov && ov.lists_truncated || []).includes(TODO_TRUNC[k]) ? '+' : ''}</span></summary><div class="list" style="margin-top:8px">${list.slice(0, 8).map((x) => `<a class="row" href="${href(x)}"><span class="title" style="white-space:normal">${esc(label(x))}</span></a>`).join('')}</div>${list.length > 8 ? `<p class="small muted" data-todomore="${k}">+${list.length - 8}${TODO_LIST[k] ? ` · <a href="${hj(TODO_LIST[k])}">${esc(t('show_in_list'))} ›</a>` : ''}</p>` : ''}${k === 'todo_vfind_crit' ? `<p class="small"><a href="${hj('#/vehicles?f=with_findings_crit')}" id="todovfind">${esc(t('show_in_vlist'))} ›</a> · <a href="#/master">${esc(t('nav_master'))} ›</a></p>` : ''}${k === 'todo_repeat' ? `<p class="small"><a href="${hj('#/cases?f=repeat')}">${esc(t('show_in_list'))} ›</a></p>` : ''}${k === 'todo_tacho' ? `<p class="small"><a href="${hj('#/tacho')}" id="todotacho">${esc(t('tacho'))} ›</a></p>` : ''}${k === 'todo_plan_passed' ? `<p class="small"><a href="${hj('#/plan')}">${esc(t('wplan'))} ›</a></p>` : ''}${k === 'todo_inspections' ? `<p class="small"><a href="${hj('#/plan?s=mdue')}">${esc(t('wplan'))}: ${esc(t('wplan_mdue'))} ›</a></p>` : ''}${k === 'todo_winter' ? `<p class="small"><a href="${hj('#/tires?f=winter_bad')}" id="todowinter">${esc(t('ws_winter_show'))} ›</a></p>${list.some((x) => x.closed_order) ? `<p class="small"><a href="${hj('#/tires?f=winter_closed')}" id="todowclosed">${esc(t('tires_winter_closed'))} ›</a></p>` : ''}` : ''}${k === 'todo_result_missing' ? `<p class="small"><a href="${hj('#/quality?f=inspection_no_result')}">${esc(t('show_in_dq'))} ›</a></p>` : ''}</details>`).join('')}`;
}

// „+N“ in „Heute zu tun“ verlinkt die vollständige, gleich gefilterte Vorgangsliste (Backlog 239)
const TODO_LIST = { todo_receive: '#/cases?f=unreceived', todo_followup: '#/cases?f=followup', todo_cost_approval: '#/cases?f=cost_approval', todo_q_answered: '#/cases?f=q_answered' }; // todo_repeat hat bereits einen eigenen Link
// Listen der Prüftermin-Übersicht, die der Server bei 200 kappt (`lists_truncated`) → Zähler „200+“
const TODO_TRUNC = { todo_defects_no_case: 'defects_without_case', todo_reinspection: 'reinspection_pending', todo_result_missing: 'result_missing' };
// wie der Listenfilter repeat_days=3 (Server: ab Berliner Mitternacht vor zwei Tagen) – 20.10.2026: vorher 72 h ab jetzt, Startseite zählte Vorgänge, die die verlinkte Liste nicht zeigt
const recentRepeat = (c) => !!c.last_repeat_at && BERLIN_FMT.format(new Date(c.last_repeat_at)) >= bDate(-2);
// Standort des Fahrzeugs / Abschleppung (Migration 0079, Teilagent „Fahrzeug wird abgeschleppt“): wo es jetzt steht und wer es
// abgeschleppt hat – für Disposition (verfügbar?) und Werkstatt (Abholung) auf einen Blick; nur Angaben laut Meldung/Beleg
const OPEN_CASE_ST = ['gemeldet', 'werkstatt_freigegeben', 'in_reparatur', 'wartet_teile', 'abschlusskontrolle'];
// Schlüssel/Fahrzeugschein bei der Werkstatt (Backlog 423, Migration 0087): nur Angaben laut Werkstatt/Leitung
const hoMissing = (c) => OPEN_CASE_ST.includes(c.status) ? [c.handover_keys === 'fehlt' && t('ho_keys_missing'), c.handover_papers === 'fehlt' && t('ho_papers_missing')].filter(Boolean) : [];
const hoVal = (v) => (v === 'fehlt' ? `<span class="chip mittel">${esc(t('ho_fehlt'))}</span>` : esc(t(v === 'da' ? 'ho_da' : 'ho_none')));
function handoverInfo(c) {
  if (!c.handover_keys && !c.handover_papers) return '';
  return `<dt>${esc(t('ho_title'))}</dt><dd id="handover"><span style="white-space:nowrap">${esc(t('ho_keys'))}:</span> ${hoVal(c.handover_keys)}<br><span style="white-space:nowrap">${esc(t('ho_papers'))}:</span> ${hoVal(c.handover_papers)}</dd>`;
}
// Abholvermerk nach der Reparatur (Backlog 425, Migration 0088): wo Fahrzeug/Schlüssel/Fahrzeugschein zur Abholung liegen – laut Werkstatt/Leitung
function pickupInfo(c) {
  if (!c.pickup_note) return '';
  return `<dt>${esc(t('pu_title'))}</dt><dd id="pickup" style="white-space:pre-wrap"${langAttr(c.pickup_note)}>${esc(c.pickup_note)}</dd>`;
}
// „Stand …“ der Standortangabe (Migration 0094) – ältere Angaben können überholt sein (z. B. Lkw ist von der Fremdfirma zurück)
const vlAt = (c) => (c.vehicle_location_at ? ` <span class="small muted" data-vlat>(${esc(t('vl_as_of'))} ${fmtDT(c.vehicle_location_at)})</span>` : '');
function vehLocInfo(c) {
  if (!c.vehicle_location && !c.tow_service) return '';
  const tow = c.tow_service ? `<span class="chip mittel">${esc(t('vl_towed_chip'))}</span> ${esc(c.tow_service)}${c.towed_on ? ' · ' + fmtD(c.towed_on) : ''}` : '';
  return `<dt>${esc(t('vl_title'))}</dt><dd id="vehloc">${c.vehicle_location ? esc(c.vehicle_location) : `<span class="muted">${esc(t('vl_unknown'))}</span>`}${tow ? `<br>${tow}` : ''}${vlAt(c)}</dd>`;
}
// extra(c): optionaler Zusatz vorn in der Unterzeile (z. B. „steht auch oben“ auf der Werkstatt-Startseite, Backlog 454) – Zeile bricht dann um
// Backlog 463: Rückfrage an den Melder – Stand aus der Schnittstelle (q_state open/answered), nie geschätzt
function qChip(c) { return c.q_state ? ` · <span class="chip ${c.q_state === 'open' ? 'mittel' : 'ok'}" data-qchip="${esc(c.q_state)}">${esc(t(c.q_state === 'open' ? 'q_open' : 'q_answered'))}</span>` : ''; }
function qBanner(c) {
  if (!c.q_state) return '';
  if (S.me.role === 'driver' || c.reporter_id === S.me.id) return c.q_state === 'open' ? `<div class="panel warn" role="note" data-qbanner="open"><b>${esc(t('q_drv_title'))}</b><br>${esc(t('q_drv_hint'))} <a href="#cf" data-qjump>${esc(t('q_drv_jump'))}</a></div>` : '';
  return `<div class="panel ${c.q_state === 'open' ? '' : 'good'}" role="note" data-qbanner="${esc(c.q_state)}"><b>${esc(t(c.q_state === 'open' ? 'q_open' : 'q_answered'))}</b> · ${esc(t('q_asked_at'))} ${fmtDT(c.q_at)}${c.q_state === 'answered' ? ` – ${esc(t('q_answered_hint'))}` : ''}</div>`;
}
// Backlog 468: Werkstattauftrag „Ohne Reparatur beendet“ (Status abgelehnt mit Werkstatt, keine Dublette – wie Kennzahl `withdrawn`) nicht als „Abgelehnt“
// anzeigen – der Fahrer las „abgelehnt“ und meldete eine wiederkehrende Störung nicht erneut (Blickwinkel „Sporadische Störung“)
const isWithdrawn = (c) => c.status === 'abgelehnt' && !!c.workshop_site && !c.duplicate_of;
const stTxt = (c) => (isWithdrawn(c) ? t('vi_kind_withdrawn') : t('st_' + c.status));
// Backlog 550 (Blickwinkel „neue Fuhrparkleiterin“): Texte mit Verweis auf „Einstellungen“ – wer sie nicht öffnen kann (nur Inhaber), liest „(Einstellungen, nur Inhaber)“
const ownerT = (k) => t(S.me && S.me.role !== 'owner' ? k + '_mgr' : k);
function caseList(list, empty, extra) {
  if (!list.length) return `<p class="muted">${esc(empty || t('no_cases'))}</p>`;
  return `<div class="list">${list.map((c) => { const xh = extra ? extra(c) : ''; return `<a class="row p-${esc(c.priority)}" href="#/cases/${esc(c.id)}">
    ${plate(c.plate, { locked: c.safety_lock })}
    <span class="title">${woTag(c)}${ltxt(cDesc(c.description))}</span>
    <span class="chip ${esc(c.status === 'fahrzeug_freigegeben' ? 'ok' : c.priority)}">${esc(stTxt(c))}</span>
    <span class="sub${c.status === 'wartet_teile' || c.access === 'preview' || xh ? ' wrap' : ''}">${xh}${esc(c.case_no)} · ${esc(t('prio_' + c.priority))}${c.safety_lock ? ' · ' + esc(t('locked')) : ''}${c.open_items > 0 ? ` · <span data-oi>${esc(t('open_items'))}: ${Number(c.open_items)}</span>` : ''}${c.file_count ? ` · <span data-fc title="${esc(t('files'))}">📎 ${Number(c.file_count)}</span>` : ''}${c.access === 'preview' ? ' · ' + esc(t('preview_hint')) : ''}${c.tow_service && OPEN_CASE_ST.includes(c.status) ? ` · <b class="towtag">${esc(t('vl_towed_chip'))}</b>` : ''}${['gemeldet', 'werkstatt_freigegeben'].includes(c.status) && c.reported_driveability === 'nicht_fahrbereit' && !c.tow_service ? ` · <b data-notdrv>${esc(t('cl_not_drivable'))}</b>${c.location_note && !c.vehicle_location ? ` <span data-locnote>📍 ${esc(clipTxt(c.location_note, 60))}</span>` : ''}` : ''}${hoMissing(c).length ? ` · <b class="hotag">${esc(hoMissing(c).join(', '))}</b>` : ''}${c.planned_date && ['werkstatt_freigegeben', 'in_reparatur', 'wartet_teile'].includes(c.status) ? ` · <b>${esc(t('planned'))} ${fmtD(c.planned_date)}</b>${c.planned_note ? ` <span data-plannote>(${esc(clipTxt(c.planned_note, 60))})</span>` : ''}` : ''} · ${fmtDT(c.updated_at)}${recentRepeat(c) ? ` · <b>${esc(t('act_repeat_finding'))} ${fmtDT(c.last_repeat_at)}</b>` : ''}${partsEta(c)}${partsWaitList(c)}${c.cost_over_limit_at ? ` · <span class="chip mittel">${esc(t('cost_approval_pending'))}</span>` : ''}${qChip(c)}${c.maintenance_event_id ? ` · <b>${esc(t('md_case'))}</b>` : ''}${c.duplicate_of_no ? ` · ${esc(t('dup_of'))} ${esc(c.duplicate_of_no)}` : ''}${c.followup_on && !['fahrzeug_freigegeben', 'abgelehnt'].includes(c.status) ? ` · <span class="chip${c.followup_on <= bDate() ? ' mittel' : ''}">${esc(t('followup'))} ${fmtD(c.followup_on)}</span>` : ''}</span></a>`; }).join('')}</div>`;
}

// Filter der Vorgangsliste: offen/abgeschlossen/alle bzw. „Mangel erneut festgestellt“ (offen, letzte 3 Tage)
// „kritisch“/„gesperrt“: Sprung aus den Zählern der Startseite (Backlog 238, Blickwinkel „Inhaber nach dem Urlaub“) – gleiche Regel wie der Zähler
const caseFilterQ = (f) => (f === 'q_open' ? 'status=open&question=open' : f === 'q_answered' ? 'status=open&question=answered' : f === 'unreceived' ? 'status=open&unreceived=1' : f === 'limited' ? 'status=open&limited=1' : f === 'open_items' ? 'status=fahrzeug_freigegeben&open_items=1' : f === 'cost_approval' ? 'status=open&cost_approval=1' : f === 'critical' ? 'status=open&priority=kritisch' : f === 'locked' ? 'status=open&locked=1' : f === 'repeat' ? 'status=open&repeat_days=3' : f === 'warranty' ? 'status=open&warranty=1' : f === 'stale' ? 'status=open&stale=1' : f === 'followup' ? 'status=open&followup=1' : `status=${f === 'all' ? '' : f}`);
const CF_LABEL = { unreceived: 'todo_receive', limited: 'dispo_limited_new', open_items: 'filter_open_items', repeat: 'filter_repeat', warranty: 'filter_warranty', stale: 'filter_stale', followup: 'filter_followup', critical: 'prio_kritisch', locked: 'locked_cases', cost_approval: 'todo_cost_approval', q_open: 'q_open', q_answered: 'q_answered' };
async function viewCases() {
  const hf = new URLSearchParams(location.hash.split('?')[1] || '').get('f');
  if (hf) try { sessionStorage.setItem('cfp_cf', hf); } catch {}
  // Sprung aus einem Zähler (#/cases?f=…): früherer Suchbegriff gilt nicht (Zahl und Liste passten sonst nicht, 22.10.2026)
  if (hf) S.caseQ = '';
  let f = hf || sessionStorage.getItem('cfp_cf') || 'open';
  if (!['open', 'closed', 'all', 'repeat', 'warranty', 'stale', 'followup', 'critical', 'locked', 'cost_approval', 'unreceived', 'limited', 'open_items', 'q_open', 'q_answered'].includes(f) || (['repeat', 'warranty', 'stale', 'critical', 'locked', 'cost_approval', 'unreceived', 'limited', 'open_items'].includes(f) && S.me.role === 'driver') || (f === 'followup' && ['driver', 'workshop'].includes(S.me.role))) f = 'open';
  const q = S.caseQ || '';
  const vq = () => (vsDef('caseVsite') && S.me.role !== 'driver' ? '&vsite=' + encodeURIComponent(vsDef('caseVsite')) : '') + (S.caseWs && wsFilterOk() ? '&ws=' + encodeURIComponent(S.caseWs) : '');
  const lq = () => (S.caseLimit ? '&limit=' + S.caseLimit : '') + sq();
  if (!S.caseSort) S.caseSort = sortPref('cases', CASE_SORTS, 'priority');
  const sq = () => (S.caseSort && S.caseSort !== 'priority' && f !== 'followup' ? '&sort=' + S.caseSort : '');
  // Liste ist begrenzt (Server: 200, „weitere laden“ bis 500) – sonst fehlten ältere Vorgänge ohne Hinweis
  const trunc = (r) => (r.truncated ? `<p class="small muted">${esc(t('list_truncated').replace('{n}', r.limit))}${r.limit < 500 ? ` <button type="button" class="btn secondary" id="cmore">${esc(t('cases_upto500'))}</button>` : ''}</p>` : '');
  const bindMore = () => { const b = $('#cmore'); if (b) b.onclick = () => { S.caseLimit = 500; viewCases(); }; };
  const res = await api('GET', `/api/cases?${caseFilterQ(f)}${q.length >= 2 ? '&q=' + encodeURIComponent(q) : ''}${vq()}${lq()}`);
  // Ausdruck: gewählte Auswahl, Suche, Standort, Sortierung und Anzahl im Kopf (wie Prüftermine)
  const fLabel = t(f === 'unreceived' && !isMgr() ? 'dispo_unreceived' : CF_LABEL[f] || f); // Backlog 483: Druckkopf wie der Reiter (Disposition bestätigt nicht)
  const cPrint = (l, qq) => printHead([`${t('print_filter')}: ${fLabel}`, qq && qq.length >= 2 ? `${t('print_search')}: „${qq}“` : '',
    res.site ? `${t('kpi_vsite')}: ${res.site === 'ohne' ? t('cs_nosite') : res.site}` : '', S.caseWs && wsFilterOk() ? `${t('workshop')}: ${wsName(S.caseWs)}` : '', f !== 'followup' && S.me.role !== 'driver' ? `${t('sort_by')}: ${t('csort_' + (S.caseSort || 'priority'))}` : '', t('print_count').replace('{n}', l.length)]);
  const list = f === 'followup' ? res.cases.slice().sort((x, y) => (x.followup_on < y.followup_on ? -1 : x.followup_on > y.followup_on ? 1 : 0)) : res.cases;
  const vsel = S.me.role !== 'driver' && ((res.site_options || []).length > 1 || res.site) ? `<div class="noprint" style="margin-bottom:12px">${siteSelect('cvsite', '', res.site_options, res.site, t('kpi_vsite'), t('filter_all'))}</div>` : '';
  // Werkstatt-Filter (Backlog 264): Leitung/Disposition/Lesezugriff, auch geschlossene Werkstätten wählbar
  const wsel = wsFilterOk() && wsAll().length > 1 ? `<div class="noprint" style="margin-bottom:12px"><label for="cws">${esc(t('workshop'))}</label><select id="cws"><option value="">${esc(t('filter_all'))}</option>${wsAll().map((w) => `<option value="${esc(w.code)}"${S.caseWs === w.code ? ' selected' : ''}>${esc(wsLabel(w))}</option>`).join('')}</select></div>` : '';
  render(`<h1>${esc(t('nav_cases'))}</h1>
    <input id="cq" class="noprint" type="search" value="${esc(q)}" placeholder="${esc(t(isMgr() ? 'case_search_mgr' : S.me.role === 'workshop' ? 'case_search_ws' : 'case_search'))}" aria-label="${esc(t(isMgr() ? 'case_search_mgr' : S.me.role === 'workshop' ? 'case_search_ws' : 'case_search'))}" style="margin-bottom:12px" autocomplete="off">${vsel}${wsel}
    <div class="seg-tabs noprint">${['open', 'closed', 'all', ...(S.me.role === 'driver' ? [] : ['repeat', 'warranty', ...(res.stale_days || f === 'stale' ? ['stale'] : []), ...(S.me.role === 'workshop' ? [] : ['followup']), ...(['critical', 'locked', 'cost_approval', 'unreceived', 'limited', 'open_items'].includes(f) ? [f] : [])])].map((k) => `<a href="#/cases" data-f="${k}" class="${k === f ? 'on' : ''}"${k === f ? ' aria-current="true"' : ''}>${esc(t(k === 'unreceived' && !isMgr() ? 'dispo_unreceived' : CF_LABEL[k] || k))}</a>`).join('')}</div>${f === 'stale' ? `<p class="small muted">${esc(res.stale_days ? t('filter_stale_hint').replace('{n}', nDays(res.stale_days)) : ownerT('filter_stale_off'))}</p>` : ''}
    ${f !== 'followup' ? `<select id="csort" class="noprint" aria-label="${esc(t('sort_by'))}" style="max-width:420px;margin-bottom:12px">${CASE_SORTS.map((k) => `<option value="${k}"${(S.caseSort || 'priority') === k ? ' selected' : ''}>${esc(t('sort_by'))}: ${esc(t('csort_' + k))}</option>`).join('')}</select>` : ''}
    <div id="cl">${cPrint(list, q)}${caseList(list)}${trunc(res)}</div>
    <div class="actions">${S.me.role !== 'driver' ? `<button type="button" class="btn secondary" id="ccsv">${esc(t('export_csv'))}</button>${f === 'followup' ? `<button type="button" class="btn secondary" id="cics">${esc(t('followup_ics'))}</button>` : ''}` : ''}<button type="button" class="btn secondary" id="cprl">${esc(t('print'))}</button></div>`, 'cases');
  $('#cprl').onclick = () => window.print();
  const ci = $('#cics'); if (ci) ci.onclick = async () => { try { download(await api('GET', `/api/cases?format=ics${vq()}`), `fuhrpark-wiedervorlagen_${envFn()}_${bDate()}.ics`); } catch (err) { toast(err.message, true); } };
  const cc = $('#ccsv'); if (cc) cc.onclick = async () => { try { const blob = await api('GET', `/api/cases?format=csv&${caseFilterQ(f)}${(S.caseQ || '').length >= 2 ? '&q=' + encodeURIComponent(S.caseQ) : ''}${vq()}${sq()}`); download(blob, `fuhrpark-vorgaenge_${envFn()}_${bDate()}.csv`); if (blob.cfpTruncated) toast(t('csv_truncated').replace('{n}', blob.cfpTruncated), true); } catch (err) { toast(err.message, true); } };
  // Reiter: ein Filter aus dem Link (#/cases?f=…) hätte sonst Vorrang und der Klick bliebe ohne Wirkung (19.10.2026)
  $$('.seg-tabs a').forEach((a) => (a.onclick = (e) => { e.preventDefault(); sessionStorage.setItem('cfp_cf', a.dataset.f); S.caseLimit = null; if (location.hash.includes('?')) history.replaceState(history.state, '', '#/cases'); viewCases(); }));
  const cvs = $('#cvsite'); if (cvs) cvs.onchange = () => { S.caseVsite = cvs.value; S.caseLimit = null; viewCases(); };
  const cws = $('#cws'); if (cws) cws.onchange = () => { S.caseWs = cws.value || null; S.caseLimit = null; viewCases(); };
  const cso = $('#csort'); if (cso) cso.onchange = () => { S.caseSort = sortPref('cases', CASE_SORTS, 'priority', CASE_SORTS.includes(cso.value) ? cso.value : 'priority'); viewCases(); };
  bindMore();
  let timer = null;
  const cq = $('#cq');
  cq.oninput = () => { clearTimeout(timer); timer = setTimeout(async () => {
    S.caseQ = cq.value.trim();
    try { const r = await api('GET', `/api/cases?${caseFilterQ(f)}${S.caseQ.length >= 2 ? '&q=' + encodeURIComponent(S.caseQ) : ''}${vq()}${lq()}`); const l2 = f === 'followup' ? r.cases.slice().sort((x, y) => (x.followup_on < y.followup_on ? -1 : x.followup_on > y.followup_on ? 1 : 0)) : r.cases; $('#cl').innerHTML = cPrint(l2, S.caseQ) + caseList(l2) + trunc(r); bindMore(); announceHits(l2.length); } catch (err) { toast(err.message, true); }
  }, 300); };
}

// Ausdruckvermerk: Zeitpunkt, Person – in der Testumgebung zusätzlich deutlich „TESTMODUS“ (22.10.2026: ein Test-Ausdruck sah wie ein echter aus;
// das violette Band druckt ohne Hintergrundgrafiken nur hellgrau)
function printStamp() {
  const env = S.me ? (S.viewEnv && S.me.role === 'owner' ? S.viewEnv : S.me.environment) : null;
  return `${esc(t('printed_at'))}: ${fmtDT(new Date(nowMs()).toISOString())} · ${esc(S.me.display_name)}${env === 'test' ? ` · <b class="print-test">${esc(t('env_test'))}</b>` : ''}`;
}
// Kopfzeile für Ausdrucke von Listen: Zeitpunkt, Person, gewählte Auswahl (leere Teile entfallen)
function printHead(parts) {
  return `<p class="print-only small">${printStamp()}${parts.filter(Boolean).map((x) => ' · ' + esc(x)).join('')} · CEVIK ${esc(t('app'))} [CLAUDE]</p>`;
}

// ---------- Offline-Ausgang für Schadensmeldungen (Funkloch) ----------
// Meldungen werden nur auf diesem Gerät für genau diesen Benutzer/diese Umgebung zwischengespeichert und mit demselben
// request_key gesendet, sobald wieder Verbindung besteht – der Server legt sie dadurch höchstens einmal an.
const outboxKey = () => `cfp_outbox_${S.me.id}_${S.me.environment}`;
function outboxGet(key) { try { return JSON.parse(localStorage.getItem(key || outboxKey()) || '[]'); } catch { return []; } }
function outboxSet(list, key) { try { localStorage.setItem(key || outboxKey(), JSON.stringify(list)); } catch {} }
// Fotos für den Offline-Ausgang in IndexedDB (Blobs; localStorage wäre zu klein)
function idb() { return new Promise((res, rej) => { const r = indexedDB.open('cfp_outbox', 1); r.onupgradeneeded = () => r.result.createObjectStore('photos'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function idbDo(mode, fn) { const db = await idb(); return new Promise((res, rej) => { const tx = db.transaction('photos', mode); const st = tx.objectStore('photos'); const out = fn(st); tx.oncomplete = () => res(out && 'result' in out ? out.result : undefined); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error || new Error('abort')); }); } // abort: z. B. Speicher voll (QuotaExceededError) – sonst hing das Absenden ohne Ende, Meldung verloren (22.10.2026)
const photosPut = (key, list) => idbDo('readwrite', (st) => st.put(list, key));
const photosGet = (key) => idbDo('readonly', (st) => st.get(key));
const photosDel = (key) => idbDo('readwrite', (st) => st.delete(key));
// vorübergehende Fehler beim Foto-Upload (Netz, Anmeldung beendet, andere Person, 429, 5xx): Fotos bleiben zum Nachreichen erhalten –
// vorher galten 401/429/5xx als endgültig, die Fotos wurden gelöscht (20.10.2026)
const photoRetry = (err) => !!(err && (err.offline || err.status === 401 || err.status === 429 || err.status >= 500 || err.code === 'user_mismatch' || err.code === 'env_mismatch'));
// Zeitlimit je Foto (verkleinert meist < 1 MB; 2 Minuten reichen auch bei sehr langsamem Netz)
const PHOTO_TIMEOUT_MS = 120000;
async function uploadCasePhotos(caseId, list, ox = {}) {
  let failed = 0;
  for (const p of list) { try { await api('POST', `/api/cases/${caseId}/files`, p.blob, { timeoutMs: PHOTO_TIMEOUT_MS, ...ox, headers: { 'x-filename': encodeURIComponent(p.name), 'content-type': p.blob.type || 'application/octet-stream' } }); } catch (err) { if (photoRetry(err)) throw err; failed++; } }
  return failed;
}
let flushing = false;
// Postausgang senden (17.10.2026): nur erfolgreich gesendete bzw. vom Server abgewiesene Einträge entfernen – während des Sendens neu
// gespeicherte Meldungen bleiben (vorher überschrieb das Ende des Sendens die Liste); Netzabbruch, 429 und 5xx bleiben zur Wiederholung.
// Fotos einer Abfahrtskontrolle gehören an den ersten eigenen Folgeauftrag (nicht an die Kontrolle; Wiederholungsvermerk = fremder Vorgang).
// Gleiche Regel wie online (18.10.2026): Leitung/Werkstatt hängen Fotos auch an den Vorgang „erneut festgestellt“, Fahrer nicht (fremder Vorgang)
const photoTarget = (item, r) => (item.path === '/api/inspections' ? ((r.followups || []).find((f) => f && f.id && (!f.repeat || f.own)) || (S.me && S.me.role !== 'driver' ? (r.followups || []).find((f) => f && f.id) : null) || {}).id : r.id);
// Kontrolle ohne Ziel für Fotos: kein Mangel oder Mangel schon gemeldet (Wiederholung) – zutreffender Text
const photosSkippedText = (r) => ((r && r.followups || []).some((f) => f && f.repeat) ? t('check_photos_repeat') : t('check_photos_skipped'));
// Mehrere Tabs/Fenster (22.10.2026, Fund „mehrere Tabs“): Postausgang und Foto-Sicherung liegen gemeinsam im Gerät – ohne Absprache
// sendeten zwei Tabs dieselben Einträge und Fotos parallel (Server verhindert Dubletten, aber doppelte Datenmenge am Handy).
// Web Locks: nur ein Tab sendet den Postausgang; Einträge, deren Fotos ein anderer Tab gerade hochlädt, werden übersprungen.
// Ohne Web Locks (alte Browser) bleibt es wie bisher.
const LOCKS = typeof navigator !== 'undefined' && navigator.locks && typeof navigator.locks.request === 'function' ? navigator.locks : null;
async function flushOutbox() {
  if (!S.me || flushing) return;
  if (!outboxGet().some((x) => !x.failed)) return;
  if (!LOCKS) return flushOutboxRun();
  return LOCKS.request('cfp_outbox', { ifAvailable: true }, async (lock) => { if (lock && S.me && !flushing) await flushOutboxRun(); });
}
async function flushOutboxRun() {
  const list = outboxGet().filter((x) => !x.failed); if (!list.length) return;
  // erst nach dem Lesen der Liste abfragen: uploadPhotosSafe hält die Sperre schon, bevor es den Eintrag anlegt
  let busy = new Set();
  if (LOCKS && LOCKS.query) { try { busy = new Set(((await LOCKS.query()).held || []).map((l) => l.name)); } catch {} }
  flushing = true;
  const done = new Set(); const failedNow = new Map(); const photoPending = new Map(); let kept = 0;
  const key = outboxKey(); // Schlüssel festhalten: endet die Anmeldung mitten im Senden, wird der Stand trotzdem gespeichert (19.10.2026)
  try {
    for (const item of list) {
      if (!S.me) { kept++; break; } // Anmeldung beendet: nichts mehr ohne Konto senden
      if (PHOTO_UPLOADING.has(item.body.request_key) || busy.has('cfp_photo_' + item.body.request_key)) { kept++; continue; } // lädt gerade im Vordergrund hoch (uploadPhotosSafe, auch in anderem Tab)
      try {
        // Meldung/Kontrolle schon angekommen, nur die Fotos fehlen noch (Netz brach beim Hochladen ab): nur Fotos nachreichen
        let r = item.photo_target ? { id: item.photo_target, followups: [{ id: item.photo_target }], case_no: item.case_no } : null;
        // Abfahrtskontrolle mit dem Zeitpunkt der Durchführung (nicht des Sendens) – km-Stand wird zeitlich richtig eingeordnet
        // mit der Gerätezeit beim Senden: der Server rechnet eine falsch gehende Geräteuhr heraus (22.10.2026)
        const sendBody = item.path === '/api/inspections' && item.saved_at ? { ...item.body, performed_at: item.saved_at, client_now: new Date().toISOString() } : item.body;
        const ox = { asUser: item.user_id || S.me.id, env: item.env, keepDirty: true };
        if (!r) r = await api('POST', item.path || '/api/cases', sendBody, ox);
        let failed = 0; let skippedTxt = '';
        if (item.photos) {
          const ph = await photosGet(item.body.request_key).catch(() => null);
          const target = photoTarget(item, r);
          // Netzabbruch beim Foto-Upload: Eintrag behalten und Fotos später nachreichen (vorher gingen sie verloren, 17.10.2026);
          // der Server erkennt bereits hochgeladene Fotos am Inhalt (keine Dubletten)
          if (ph && ph.length && !target) skippedTxt = photosSkippedText(r); // Kontrolle ohne Ziel: bewusst nicht übertragen (nicht „fehlgeschlagen“)
          try { if (ph && ph.length && target) failed = await uploadCasePhotos(target, ph, ox); }
          catch (err) {
            if (photoRetry(err)) { photoPending.set(item.body.request_key, { target, case_no: r.case_no }); kept++; if (err.status === 401 || err.code === 'user_mismatch' || err.code === 'env_mismatch') break; continue; }
            throw err;
          }
          await photosDel(item.body.request_key).catch(() => {});
        }
        done.add(item.body.request_key);
        toast(item.path === '/api/inspections' ? `${t('check_saved')}${skippedTxt ? ' · ' + skippedTxt : ''}${failed ? ' · ' + tn('photos_failed', failed) : ''}${kmWarn(r)}${lockedWarn(r)}` : `${t('report_sent')}: ${r.case_no}${failed ? ' · ' + tn('photos_failed', failed) : ''}${r.urgent_push_recipients === 0 ? ' · ⚠ ' + t('no_push_reach') : ''}`, !!failed || !!r.km_rejected || !!r.vehicle_locked || !!r.coupled_locked || r.urgent_push_recipients === 0);
        // Backlog 539: später gesendete dringende Meldung, die niemand per Push erreicht – Warnung wie beim Senden mit Netz (vorher nur „gesendet“)
      }
      catch (err) {
        if (err.offline || err.status === 429 || err.status >= 500) { kept++; continue; }
        if (err.code === 'user_mismatch' || err.code === 'env_mismatch') { kept++; break; } // andere Person/Umgebung: nichts senden, Eintrag bleibt
        if (err.status === 401) { kept++; break; } // Anmeldung abgelaufen/beendet: kein „abgelehnt“ – nach dem Anmelden wird gesendet (19.10.2026)
        // Vom Server abgewiesen (z. B. Fahrzeug inzwischen außer Betrieb): nicht still verwerfen, sondern als „nicht gesendet“
        // auf dem Gerät behalten – Text zum Kopieren, erneut senden oder bewusst verwerfen (17.10.2026). Fotos bleiben bis dahin.
        // Code und Server-Text mit speichern: der Grund wird bei der Anzeige in der dann gewählten Sprache übersetzt (19.10.2026)
        failedNow.set(item.body.request_key, { status: err.status || 0, message: String(err.message || ''), code: err.code || null, raw: (err.data && err.data.message) || null, at: new Date().toISOString() });
        toast(`${t('outbox_failed')}: ${err.message}`, true);
      }
    }
  } finally {
    try { outboxSet(outboxGet(key).filter((x) => !done.has(x.body.request_key)).map((x) => (failedNow.has(x.body.request_key) ? { ...x, failed: failedNow.get(x.body.request_key) }
      : photoPending.has(x.body.request_key) ? { ...x, photo_target: photoPending.get(x.body.request_key).target || null, case_no: photoPending.get(x.body.request_key).case_no || null } : x)), key); } catch {}
    flushing = false;
  }
  if (failedNow.size || done.size) refreshOutbox();
  // gesendete Meldungen sofort in der Startseite zeigen (18.10.2026: erschienen erst nach dem Neuladen) – nur ohne Eingaben
  if (done.size && /^#\/?$/.test(location.hash || '#/') && !viewDirty()) route();
  if (kept && S.me && !S.outboxRetry) S.outboxRetry = setTimeout(() => { S.outboxRetry = null; if (navigator.onLine) flushOutbox(); }, 60000);
}
window.addEventListener('online', () => flushOutbox());
// Hinweis „wartet auf Verbindung“ und Liste der vom Server abgewiesenen Meldungen (Text zum Kopieren, erneut senden, verwerfen)
function outboxText(x) {
  const b = x.body || {};
  if (x.path === '/api/inspections') return (b.items || []).filter((i) => i.result === 'mangel').map((i) => `${checkLabel(i.key)}: ${i.note || ''}`).join('\n') || t('outbox_check_ok');
  return b.description || '';
}
function outboxPlate(id, x) {
  if (x && x.plate) return x.plate; // beim Speichern gemerkt (Fahrzeugliste fehlt nach Abmelden bzw. außer Betrieb genommen – 19.10.2026)
  try { const vs = JSON.parse(localStorage.getItem(`cfp_veh_${S.me.id}_${envFn()}`) || '[]'); const v = vs.find((x) => x.id === id); if (v) return v.plate; } catch {}
  return String(id || '').replace(/^VIN:/, '');
}
// Einträge derselben Person aus der anderen Umgebung (Konto inzwischen Test ↔ Betrieb umgestellt): nie in die neue Umgebung senden,
// aber sichtbar lassen – Text zum Kopieren und Verwerfen (19.10.2026: lagen vorher unsichtbar und unlöschbar auf dem Gerät)
function otherEnvOutbox() {
  const out = []; const pre = `cfp_outbox_${S.me.id}_`;
  try { for (const k of Object.keys(localStorage)) if (k.startsWith(pre) && k !== outboxKey()) for (const x of JSON.parse(localStorage.getItem(k) || '[]')) out.push({ ...x, failed: { code: 'env_changed', message: t('outbox_env_changed') }, envKey: k }); } catch {}
  return out;
}
function outboxBanner() {
  if (!S.me) return '';
  const all = outboxGet(); const n = all.filter((x) => !x.failed && !x.photo_target).length; const np = all.filter((x) => !x.failed && x.photo_target).length; const bad = [...all.filter((x) => x.failed), ...otherEnvOutbox()];
  let html = '';
  if (bad.length) {
    html += `<div class="panel alert" id="outbox_failed" role="alert"><h2>${esc(tn('outbox_failed_n', bad.length))}</h2><p class="small">${esc(tn('outbox_failed_hint', bad.length))}</p>${bad.map((x) => {
      const k = esc(x.body.request_key);
      return `<div class="obx-item"><p><b>${esc(x.path === '/api/inspections' ? t('departure_check') : t('report_damage'))}</b> · ${esc(outboxPlate(x.body.vehicle_id, x))} · ${esc(t('outbox_saved_at'))} ${fmtDT(x.saved_at)}</p>
        <p class="small">${esc(t('outbox_reason'))}: ${esc(x.envKey ? t('outbox_env_changed') : (x.failed.raw ? srvText(x.failed.code, x.failed.raw) || x.failed.raw : x.failed.message) || '')}</p>
        <label for="obx_${k}">${esc(t('outbox_text'))}</label><textarea id="obx_${k}" readonly rows="3">${esc(outboxText(x))}</textarea>
        <div class="actions">${x.envKey ? `<button type="button" class="btn secondary" data-obx-del-env="${esc(x.envKey)}" data-rk="${k}">${esc(t('outbox_discard'))}</button>` : `<button type="button" class="btn secondary" data-obx-retry="${k}">${esc(t('outbox_retry'))}</button><button type="button" class="btn secondary" data-obx-del="${k}">${esc(t('outbox_discard'))}</button>`}</div></div>`;
    }).join('')}</div>`;
  }
  // Meldung schon angelegt, nur Fotos fehlen: eigener Text (sah sonst wie eine ungesendete Meldung aus → Doppelmeldung, 20.10.2026)
  if (n || np) html += `<div class="panel alert" id="outbox" role="status">${[n ? esc(tn('outbox_pending', n)) : '', np ? esc(tn('outbox_photos_pending', np)) : ''].filter(Boolean).join('<br>')}</div>`;
  return html ? `<div id="outbox_area">${html}</div>` : '';
}
// Nach dem Senden: Hinweisbereich der aktuellen Seite aktualisieren, ohne die Seite neu aufzubauen (Eingaben bleiben)
function refreshOutbox() {
  const area = document.getElementById('outbox_area'); const html = outboxBanner();
  if (area) { if (html) area.outerHTML = html; else area.remove(); }
  else if (html && document.getElementById('outbox_slot')) document.getElementById('outbox_slot').innerHTML = html;
  bindOutbox();
}
function bindOutbox() {
  for (const b of document.querySelectorAll('[data-obx-del]')) b.onclick = async () => {
    const key = b.dataset.obxDel;
    if (!confirm(t('outbox_discard_confirm'))) return;
    outboxSet(outboxGet().filter((x) => x.body.request_key !== key)); await photosDel(key).catch(() => {});
    refreshOutbox();
  };
  for (const b of document.querySelectorAll('[data-obx-del-env]')) b.onclick = async () => {
    if (!confirm(t('outbox_discard_confirm'))) return;
    const k = b.dataset.obxDelEnv; const rk = b.dataset.rk;
    if (!S.me || !k.startsWith(`cfp_outbox_${S.me.id}_`)) return; // nur eigene Einträge
    const rest = outboxGet(k).filter((x) => x.body.request_key !== rk);
    try { if (rest.length) localStorage.setItem(k, JSON.stringify(rest)); else localStorage.removeItem(k); } catch {}
    await photosDel(rk).catch(() => {}); refreshOutbox();
  };
  for (const b of document.querySelectorAll('[data-obx-retry]')) b.onclick = async () => {
    const key = b.dataset.obxRetry;
    outboxSet(outboxGet().map((x) => (x.body.request_key === key ? { ...x, failed: undefined } : x)));
    refreshOutbox(); await flushOutbox();
  };
}


function vehCacheRefresh(force = false) {
  if (!S.me || !navigator.onLine) return;
  try {
    const vkey = `cfp_veh_${S.me.id}_${envFn()}`;
    const at = Number(localStorage.getItem(vkey + '_at')) || 0;
    if (!force && localStorage.getItem(vkey) && Date.now() - at < 300000) return;
  } catch {}
  vehiclesCached().catch(() => {});
}
async function vehiclesCached() {
  const vkey = `cfp_veh_${S.me.id}_${envFn()}`;
  try { const vs = (await api('GET', '/api/vehicles')).vehicles; try { localStorage.setItem(vkey + '_at', String(Date.now())); localStorage.setItem(vkey, JSON.stringify(vs.map((v) => ({ id: v.id, plate: v.plate, kind: v.kind, site: v.site, assigned: v.assigned, availability: v.availability, coupled: v.coupled || null, last_check_at: v.last_check_at || null, last_check_result: v.last_check_result || null })))); } catch {} return vs; }
  catch (err) { if (!err.offline) throw err; let vs = null; try { vs = JSON.parse(localStorage.getItem(vkey) || 'null'); } catch {} if (!vs) throw err; return vs; }
}
// Netz bricht beim Foto-Upload des direkten Sendens ab: restliche Fotos auf dem Gerät speichern und über den Postausgang nachreichen
// (Meldung ist schon angelegt – Eintrag nur mit Fotoziel; 18.10.2026: Fotos gingen sonst verloren). Rückgabe: Anzahl gespeicherter Fotos.
async function photosLater(path, body, r, target, files, who = outboxWho()) {
  try {
    if (!who) return 0;
    const list = []; for (const f of files) list.push({ blob: await prepareUpload(f), name: f.name });
    await photosPut(body.request_key, list);
    outboxAdd(path, body, list.length, who);
    outboxSet(outboxGet(who.key).map((x) => (x.body.request_key === body.request_key ? { ...x, photo_target: target, case_no: r.case_no || null } : x)), who.key);
    return list.length;
  } catch { return 0; }
}
// Fotos einer gerade angelegten Meldung/Kontrolle: zuerst auf dem Gerät sichern (Postausgang mit Ziel-Vorgang), dann einzeln hochladen;
// erst wenn alle angekommen sind, wird die Sicherung gelöscht. Wird die App während des Hochladens beendet (Handy gesperrt, Speicher),
// reicht der Postausgang die Fotos beim nächsten Start nach – der Server erkennt schon hochgeladene am Inhalt (Backlog 113, 21.10.2026).
// Solange hier hochgeladen wird, überspringt flushOutbox diesen Eintrag (keine parallelen Uploads derselben Fotos).
const PHOTO_UPLOADING = new Set();
// who: beim Absenden festgehaltene Person/Umgebung (outboxWho) – Inhaber schaltet während des Hochladens auf die andere Umgebung um
// (oder tippt einen Push der anderen Umgebung an): Fotos gingen sonst mit der neuen Umgebung an den Vorgang (404), die Sicherung wurde
// gelöscht und die Fotos waren verloren (22.10.2026, Teilagent „Umschalten Test/Betrieb“)
async function uploadPhotosSafe(path, body, r, target, files, sb, who = outboxWho()) {
  // Sperre je Meldung über alle Tabs (flushOutbox eines anderen Tabs überspringt den Eintrag, solange hier hochgeladen wird)
  if (LOCKS) return LOCKS.request('cfp_photo_' + body.request_key, () => uploadPhotosSafeRun(path, body, r, target, files, sb, who));
  return uploadPhotosSafeRun(path, body, r, target, files, sb, who);
}
async function uploadPhotosSafeRun(path, body, r, target, files, sb, who) {
  const key = body.request_key; let failed = 0; let later = 0; let list = null; let backed = false;
  const ox = who ? { env: who.env } : {};
  try { list = []; for (const f of files) list.push({ blob: await prepareUpload(f), name: f.name }); } catch { list = null; }
  if (list) {
    try {
      if (!who) throw new Error('no user');
      await photosPut(key, list); outboxAdd(path, body, list.length, who);
      outboxSet(outboxGet(who.key).map((x) => (x.body.request_key === key ? { ...x, photo_target: target, case_no: r.case_no || null } : x)), who.key);
      backed = true;
    } catch { backed = false; }
  }
  PHOTO_UPLOADING.add(key);
  try {
    for (const [i, file] of files.entries()) {
      if (sb) sb.textContent = `${t('uploading')} ${i + 1}/${files.length}`;
      try { failed += await uploadCasePhotos(target, [list ? list[i] : { blob: await prepareUpload(file), name: file.name }], ox); } catch (err) {
        if (photoRetry(err)) { later = backed ? files.length - i : await photosLater(path, body, r, target, files.slice(i), who); break; }
        failed++;
      }
    }
  } finally { PHOTO_UPLOADING.delete(key); }
  if (backed && !later) { outboxSet(outboxGet(who.key).filter((x) => x.body.request_key !== key), who.key); await photosDel(key).catch(() => {}); }
  return { failed, later };
}
// Abmelden mit unversendeten Meldungen: vorher senden versuchen, sonst ausdrücklich bestätigen (sie bleiben auf dem Gerät für diese Person – 18.10.2026)
async function logoutOutboxOk() {
  if (outboxGet().some((x) => !x.failed) && navigator.onLine !== false) await flushOutbox().catch(() => {});
  const pend = outboxGet().filter((x) => !x.failed).length;
  if (pend && !confirm(tn('logout_outbox_confirm', pend))) return false;
  // Backlog 532: abgelehnte Meldungen (auch aus der anderen Umgebung) liegen nur auf diesem Gerät – vor dem Abmelden ausdrücklich nachfragen
  const bad = outboxGet().filter((x) => x.failed).length + otherEnvOutbox().length;
  if (bad && !confirm(tn('logout_failed_confirm', bad))) return false;
  // Backlog 479: ungesicherte Formularentwürfe (Arbeitszeit/Teil nach Netzabbruch, Meldung, Kontrolle) und Inventurzählungen dieser Person
  // werden beim Abmelden gelöscht (gewollt: geteiltes Gerät) – vorher ohne Rückfrage
  const dr = logoutDraftCount();
  return !dr || confirm(tn('logout_drafts_confirm', dr));
}
function logoutDraftCount() {
  if (!S.me) return 0;
  const mid = `_${S.me.id}_`; let n = 0;
  try { for (const k of Object.keys(sessionStorage)) if (k.startsWith('cfp_fd_') && k.includes(mid)) { const x = JSON.parse(sessionStorage.getItem(k) || 'null'); if (x && x.v && Object.keys(x.v).length && Date.now() - Date.parse(x.at) < FORM_DRAFT_MS) n++; } } catch {}
  try { for (const k of Object.keys(localStorage)) if (k.startsWith(`cfp_inv_${S.me.id}_`)) { const x = JSON.parse(localStorage.getItem(k) || 'null'); if (x && x.counts && Date.now() - Date.parse(x.at) < 14 * 86400000) n++; } } catch {}
  return n;
}
// who: beim Absenden festgehaltene Person (outboxWho) – nach 401 ist S.me schon zurückgesetzt (Anmeldung in anderem Tab beendet, 21.10.2026)
const outboxWho = () => (S.me ? { id: S.me.id, name: S.me.display_name, env: S.me.role === 'owner' && S.viewEnv ? S.viewEnv : S.me.environment, key: outboxKey() } : null);
// Offline gespeicherte kritische Meldung/Kontrolle: „bitte anrufen“ mit direktem Weg zu den Rufnummern und 112 (23.10.2026, Teilagent
// „Unfall nachts“: vorher nur Text und „Zurück“); Notfallseite kommt offline aus dem Zwischenspeicher
const callBox = (vid) => `<p><b>${esc(t('outbox_call'))}</b></p><div class="actions" data-callbox><a class="btn secondary" href="${vid ? `#/emergency?v=${esc(vid)}` : '#/emergency'}">☎ ${esc(t('em_title'))}</a><a class="btn danger" href="tel:112">${esc(t('em_112_btn'))}</a></div>`;
// Noch nicht gesendete Einträge je Fahrzeug (Backlog 200, 23.10.2026, Teilagent „Unfall nachts“): offline gemeldetes „kritisch“/„nicht
// fahrbereit“ bzw. ein sicherheitsrelevanter Mangel der Kontrolle wirkt auf diesem Gerät sofort – vorher zeigte die Startseite grün
// „keine offenen Meldungen“ und die Abfahrtskontrolle bot das Fahrzeug ohne Hinweis an. Nur Anzeige; der Server entscheidet nach dem Senden.
const outboxCrit = (x) => (x.path === '/api/inspections' ? (x.body.items || []).some((i) => i && i.result === 'mangel' && i.safety_relevant) : x.body.priority === 'kritisch' || x.body.driveability === 'nicht_fahrbereit');
function outboxVeh(id) {
  const out = { n: 0, crit: false }; if (!id || !S.me) return out;
  for (const x of outboxGet()) { if (!x || !x.body || x.body.vehicle_id !== id) continue; if (x.path === '/api/cases' || (x.path === '/api/inspections' && (x.body.items || []).some((i) => i && i.result === 'mangel'))) out.n++; if (outboxCrit(x)) out.crit = true; }
  return out;
}
const outboxVehAlert = (id) => (outboxVeh(id).crit ? `<div class="alert" role="alert" style="margin-bottom:8px" data-outboxcrit><b>⚠ ${esc(t('outbox_veh_crit'))}</b></div>` : '');
function outboxAdd(path, body, photos = 0, who = outboxWho()) { if (!who) return; const list = outboxGet(who.key); const pl = S.me ? outboxPlate(body.vehicle_id) : null; if (!list.some((x) => x.body.request_key === body.request_key)) list.push({ path, body, photos, ...(pl && pl !== String(body.vehicle_id || '').replace(/^VIN:/, '') ? { plate: pl } : {}), saved_at: new Date().toISOString(), user_id: who.id, user_name: who.name, env: who.env }); outboxSet(list, who.key); }

// ---------- Neue Meldung ----------
// Kein Fahrzeug wählbar (Erstnutzung bzw. offline ohne Zwischenspeicher): Hinweis statt leerer Auswahl (22.10.2026)
const noVehiclesNote = () => `<div class="panel" role="note" data-novehicles><p>${esc(t(isMgr() ? 'no_vehicles_mgr' : 'no_vehicles_ask'))}</p>${isMgr() ? `<p><a class="btn" href="#/vehicles">${esc(t('nav_vehicles'))} ›</a></p>` : ''}</div>`;
// Hinweis-Panel „Fahrtenschreiber gestört“ (Meldeformular und Abfahrtskontrolle)
const tachoPanel = () => `<div id="tacho" class="panel" hidden role="status"><b>${esc(t('tacho_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('tacho_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
// Hinweis-Panel „Glasschaden“ (Meldeformular; Abfahrtskontrolle mit eigenem 3. Schritt ohne „Fahrbereitschaft unten“, Backlog 292)
const glassPanel = (check = false) => { const st = t('glass_hint_steps').split('|'); if (check) st[2] = t('glass_hint_step_check'); return `<div id="glass" class="panel" hidden role="status"><b>${esc(t('glass_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${st.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`; };
// Beschreibung nennt Fahrtenschreiber/Fahrerkarte: Pflichten laut VO (EU) 165/2014 Art. 29/35/37 (Vermerk, Reparatur, Ersatzkarte) –
// reine Information, keine Frist im System (Backlog 212, 23.10.2026; auch Mängel der Abfahrtskontrolle, Backlog 216; „Tachometer“ ist kein Fahrtenschreiber)
// Diebstahl/Einbruch in der Beschreibung (Meldeformular, Backlog 214; Versicherungsfall-Hinweis, Backlog 221)
// Beschreibung nennt einen Unfall: kurze Hinweise für vollständige Unterlagen (Fotos, Unfallstelle, Fuhrparkleitung informieren).
// Dieselben Wörter wie die Datenqualität „Unfall ohne Versicherungsfall“ (`src/quality.js` ACC_CYR): ukr. nur Formen des Substantivs „аварія“
// (+ russ. „авария“) – „аварійна сигналізація“/„аварийка“ (Warnblinkanlage) ist kein Unfall (Backlog 228, 24.10.2026; vorher /авар/)
const TACHO_WORK = /getriebe|tachogeber|impulsgeber|kitas|fahrtenschreiber|tachograph|gearbox|transmission|коробк\S*\s+передач|кпп|тахограф|тахогенератор|датчик\s+швидкост|датчик\s+скорост|bo[iî]te\s+de\s+vitesses?|(?:chrono)?tachygraphe|capteur\s+de\s+vitesse/i; // Backlog 628: französische Rechnungstexte (Panne in Frankreich)
// Backlog 677 (30.10.2026, Blickwinkel „Radfahrer beim Rechtsabbiegen übersehen“): Zusammenstoß mit Radfahrer/Fußgänger/Motorrad/E-Scooter ohne das Wort
// „Unfall“ (übersehen, erfasst, gestreift, umgefahren …; EN hit/knocked down a cyclist; UK/RU збив/зачепив пішохода) → allgemeine Unfall-Hinweise
// Backlog 681 (30.10.2026, Blickwinkel „Glätte – Lkw von der Straße abgekommen“): „von der Straße/Autobahn abgekommen“, „kam von der Fahrbahn ab“, „Böschung hinunter“,
// „Lkw liegt auf der Seite“ (EN left/went off the road, on its side; UK/RU з'їхав з дороги, лежить на боці) → allgemeine Unfall-Hinweise; „Ladung liegt auf der Seite“ nicht
const ACC_HINT = /unfall|accident|(?<![a-zäöüß-])(?:(?:fahr)?radfahrer(?:in|innen)?|radler(?:in)?|fu(?:ß|ss)g(?:ä|ae)nger(?:in|innen)?|motorradfahrer(?:in)?|rollerfahrer(?:in)?|e-?scooter(?:fahrer(?:in)?)?)(?![a-zäöüß])\s+(?:\S+\s+){0,4}?(?:(?:ü|ue)bersehen|erfasst|gestreift|touchiert|ber(?:ü|ue)hrt|gest(?:ü|ue)rzt|umgefahren|angefahren|abgefahren|zusammengesto(?:ß|ss)en|gerammt|verletzt)(?![a-zäöüß])|(?<![a-z-])(?:(?:hit|struck|knocked\s+(?:down|over)|clipped|ran\s+over|run\s+over|collided\s+with)\s+(?:\S+\s+){0,2}?(?:cyclists?|pedestrians?|motorcyclists?|(?:e-?)?scooter\s+riders?)|(?:cyclists?|pedestrians?|motorcyclists?)\s+(?:\S+\s+){0,3}?(?:was\s+|got\s+)?(?:hit|struck|knocked\s+(?:down|over)|clipped|injured|run\s+over))(?![a-z])|(?<![а-яіїєґ])(?:збив|збила|зачепив|зачепила|сбил|сбила|задел|задела|наїхав|наїхала|наехал|наехала)\s+(?:\S+\s+){0,2}?(?:велосипедист|пішоход|пішохід|пешеход|мотоцикліст|мотоциклист)\S*|rangierschaden|(?<![a-zäöüß])beim\s+(?:rangieren|zurücksetzen|rückwärtsfahren)\s+(?:\S+\s+){0,5}?(?:angefahren|gesto(?:ß|ss)en|touchiert|besch(?:ä|ae)digt|gerammt|gestreift)(?![a-zäöüß])|(?<![a-z])(?:while|when)\s+(?:manoeuvring|maneuvering|reversing|backing\s+up)\s+(?:\S+\s+){0,5}?(?:hit|struck|damaged|scraped)(?![a-z])|(?:під\s+час|при)\s+(?:маневрування|маневрировании|задньому\s+ходу)\s+(?:\S+\s+){0,5}?(?:зачепи|вдари|пошкоди|ударил|задел|повредил)\S*|дтп|авар(?:ія|ії|ію|ією|ия|ии|ию|ией)(?![а-яіїєґ])|(?<![a-zäöüß-])(?:in\s+den|im)\s+(?:stra(?:ß|ss)en)?graben\s+(?:\S+\s+)?(?:gerutscht|gefahren|geraten|abgerutscht|gelandet|gekippt)|(?<![a-zäöüß-])(?:lkw|fahrzeug|sattelzug|zug|auflieger|anh(?:ä|ae|a)nger|gespann|zugmaschine|wagen)\s+(?:\S+\s+){0,3}?(?:eingeknickt|umgekippt|umgest(?:ü|ue|u)rzt|auf\s+die\s+seite\s+gekippt)(?![a-zäöüß])|von\s+der\s+fahrbahn\s+abgekommen|(?<![a-zäöüß])(?:von\s+der\s+(?:stra(?:ß|ss)e|autobahn|landstra(?:ß|ss)e|fahrbahn)|ins\s+feld|in\s+die\s+b(?:ö|oe)schung)\s+(?:\S+\s+)?(?:abgekommen|abgerutscht|gerutscht|abgedriftet)|(?<![a-zäöüß])(?:kam|kamen|kommt)\s+(?:\S+\s+){0,3}?von\s+der\s+(?:stra(?:ß|ss)e|autobahn|landstra(?:ß|ss)e|fahrbahn)\s+ab(?![a-zäöüß])|(?<![a-zäöüß])b(?:ö|oe)schung\s+(?:hinunter|hinab|runter|herunter)(?:gerutscht|gefahren|gest(?:ü|ue)rzt|gekippt)?(?![a-zäöüß])|(?<![a-zäöüß-])(?:lkw|fahrzeug|sattelzug|zug|auflieger|anh(?:ä|ae|a)nger|gespann|zugmaschine|wagen)\s+(?:\S+\s+){0,2}?(?:liegt|lag|landete)\s+auf\s+der\s+seite(?![a-zäöüß])|(?<![a-z])(?:left|went\s+off|ran\s+off|veered\s+off|came\s+off)\s+the\s+(?:road|carriageway|motorway|highway)|(?<![a-z])(?:truck|lorry|trailer|vehicle|rig)\s+(?:\S+\s+){0,2}?(?:is|was|lying|ended\s+up)\s+(?:\S+\s+)?on\s+its\s+side|(?:з['’]їхав|з['’]їхала|съехал\S*|вилетів|вилетіла|вылетел\S*)\s+(?:\S+\s+)?(?:з|с|із)\s+(?:дороги|траси|трассы|шосе|шоссе|автобану)|(?<![а-яіїєґ])(?:лежить|лежит)\s+на\s+(?:боці|боку)|(?<![a-z])(?:jack-?knif\S*|overturned|rolled\s+over|in\s+(?:a|the)\s+ditch|slid\s+off\s+the\s+road)|(?:з['’]їхав|з['’]їхала|съехал\S*)\s+(?:\S+\s+)?(?:в|у)\s+кювет|(?<![а-яіїєґ])(?:вантажівк\S*|фур\S*|тягач\S*|причіп|напівпричіп|грузовик\S*)\s+(?:\S+\s+)?(?:перекину\S*|перевернул\S*|склав\S*|склал\S*|сложил\S*)|zusammensto(?:ß|ss)|(?<![a-zäöüß])kollision|(?<![a-zäöüß])(?:pkw|auto|kleinwagen|transporter|motorrad|radfahrer\S*|fu(?:ß|ss)g(?:ä|ae|a)nger\S*)\s+(?:\S+\s+){0,2}?(?:angefahren|gerammt|touchiert)(?![a-zäöüß])|auf\s+(?:\S+\s+){0,2}?(?:pkw|auto|lkw|fahrzeug|wagen|vordermann|stauende|transporter|bus)\s+aufgefahren|(?<![a-z])(?:collision|collided|rear-ended|crash(?:ed)?\s+into|hit\s+(?:a|another|the)\s+(?:car|vehicle|truck|lorry|van))|зіткн\S*|столкн\S*|(?:є|е)вропротокол\S*|(?:наїхав|наїхала|наехал\S*|зачепив|зачепила|зацепил\S*|врізав\S*|врізал\S*|врезал\S*)\s+(?:\S+\s+){0,2}?(?:машин\S*|авто\S*|легков\S*|вантажівк\S*|фур\S*|грузовик\S*|автобус\S*)/i;
// + Kraftstoffdiebstahl per Diktat: ukr./russ. „злили/слили (…) пальне/паливо/дизель/солярку/топливо“, engl. „siphoned“ (Backlog 230; „злили масло“ = Ölwechsel nicht)
const THEFT_HINT = /diebstahl|planenschlitz\S*|(?<![a-zäöüß-])(?:tank|tanks|diesel|kraftstoff|sprit|adblue)\s+(?:\S+\s+){0,3}?(?:leer\s?gesaugt|nachts\s+(?:\S+\s+)?(?:abgepumpt|abgesaugt)|(?:abgepumpt|abgesaugt)\s+(?:\S+\s+)?(?:über|ueber)\s+nacht)|(?<![a-zäöüß-])(?:diesel|kraftstoff|sprit|adblue)\s+(?:fehlt|fehlen)\s+(?:\S+\s+)?(?:im|aus\s+dem)\s+tank(?![a-zäöüß])|(?<![a-zäöüß-])weniger\s+(?:diesel\s+|kraftstoff\s+|sprit\s+)?im\s+tank\s+(?:\S+\s+){0,2}?(?:als\s+abends|als\s+gestern|über\s+nacht|ueber\s+nacht|seit\s+gestern)|(?<![a-z-])(?:fuel|diesel|tank)\s+(?:\S+\s+){0,2}?drained\s+(?:\S+\s+){0,2}?(?:overnight|at\s+night|while\s+parked)|\bdieb|gestohlen|geklaut|entwendet|abgezapft|(?<![a-zäöüß])einbruch|aufgebrochen|theft|stolen|\bsteal|break-in|broken into|burglar|крадіж|в(?:и)?крал|в(?:и)?крад|украл|украд|siphon|(?<![а-яіїєґ])(?:з|с)лил[иао]?\s+(?:\S+\s+)?(?:пальн|палив|дизел|солярк|топлив|бензин)|(?<![a-zäöüß])(?:ladung|ware|paletten?|kartons?)\s+(?:\S+\s+){0,2}?(?:fehl(?:t|en)|weg)(?![a-zäöüß])|(?<![a-z])(?:cargo|load|goods|pallets?)\s+(?:\S+\s+){0,2}?(?:missing|gone)(?![a-z])|(?<![а-яіїєґ])(?:вантаж|груз|товар|палет)\S*\s+(?:\S+\s+){0,2}?(?:немає|нема|зник|пропа|нет(?![а-яіїєґ]))|(?<![а-яіїєґ])(?:немає|нема|нет|зник\S*|пропал\S*)\s+(?:\S+\s+){0,2}?(?:вантаж|груз|товар|палет)/i; // Backlog 630: fehlende Ladung
// Backlog 653 (Blickwinkel „Parkschaden – Unfallgegner unbekannt (Unfallflucht)“): Unfallflucht/Fahrerflucht/Parkschaden in der Beschreibung →
// eigene Schritte (Polizei auch ohne Verletzte, Fahrzeug stehen lassen, Spuren fotografieren, Zeugen/Kameras der Polizei nennen) statt der
// allgemeinen Unfall-Hinweise – reine Information, keine Frist. Dieselben Wortstämme wie die Datenqualität (`src/quality.js` HITRUN_WORDS_*).
// „falsch geparkt“, „Fluchtweg“, „утечка/витік“ (Leck), „bin weitergefahren“ lösen nichts aus
// Backlog 659 (30.10.2026, Blickwinkel „Vandalismus über Nacht – Reifen zerstochen, Graffiti“): mutwillige Beschädigung in der Beschreibung →
// Schritte (rundum prüfen, ob fahrbereit; Anzeige wegen Sachbeschädigung; Fotos vor Reinigung/Reparatur; Ort/Zeitraum/Zeugen) – reine Information,
// keine Frist; nicht zusätzlich zu Diebstahl/Unfallflucht (diese nennen die Anzeige schon). „Plane aufgeschlitzt“ allein (meist Ladungsdiebstahl),
// „zerkratzt beim Rangieren“, „Reifen platt“, „absichtlich langsam gefahren“ lösen nichts aus
const VANDAL_HINT = /(?<![a-zäöüß])vandal|sachbesch(?:ä|ae)digung|mutwillig|(?:absichtlich|vorsätzlich|vorsaetzlich)\s+(?:\S+\s+){0,2}?(?:besch(?:ä|ae)digt|zerkratzt|zerstochen|zerst(?:ö|oe)rt|eingeschlagen|aufgeschlitzt|beschmiert)|graffiti|grafitti|beschmiert|besprayt|bespr(?:ü|ue)ht|zerstochen|aufgestochen|(?:reifen|ventil)\S*\s+(?:\S+\s+){0,3}?(?:aufgeschlitzt|zerschnitten|abgeschraubt|abgedreht)(?![a-zäöüß])|(?<![a-z])(?:slashed|spray-?painted|deliberately\s+damaged|malicious(?:ly)?\s+damaged?|criminal\s+damage)(?![a-z])|вандал|графіт|граффит|графит|навмисн\S*\s+(?:\S+\s+)?пошкод|умышленн\S*\s+(?:\S+\s+)?повред|(?:порізал|прорізал|проткнул|порезал|прорезал)\S*\s+(?:\S+\s+)?(?:шин|колес|колiс|скат)|розмалюв|разрисов/i;
// Backlog 662 (30.10.2026, Blickwinkel „Marder hat Kabel/Schläuche angefressen“): Marder/Nager bzw. angefressene/durchgebissene Kabel oder Schläuche →
// Schritte (Motor aus, ohne Werkzeug nachsehen, bei Kühlmittelverlust/Warnleuchte/durchgebissenem Kabel „nicht fahrbereit“; Fotos, nicht selbst flicken;
// Abstellort notieren) – reine Information, keine Frist. „Bremsscheibe angefressen“ (Rost/Festfressen) und „Kabel defekt“ lösen nichts aus
const MARTEN_HINT = /marder|(?<![a-z])(?:martens?|rodents?)(?![a-z])|chewed\s+(?:\S+\s+){0,3}?(?:cables?|wires?|wiring|hoses?|lines?)|(?:cables?|wires?|wiring|hoses?)\s+(?:\S+\s+){0,2}?(?:chewed|bitten\s+through)|(?<![a-zäöüß])nager(?![a-zäöüß])|angeknabbert|zerbissen|durchgebissen|(?:kabel|leitung|schl(?:ä|ae|a)uch|d(?:ä|ae|a)mmmatte|d(?:ä|ae|a)mmung|isolierung)\S*\s+(?:\S+\s+){0,3}?(?:angefressen|abgebissen|angebissen)|куниц|гризун|грызун|(?:погриз|перегриз|прогриз|погрыз|перегрыз|прогрыз)/i;
// Backlog 665 (30.10.2026, Blickwinkel „Unwetter: Ast/Baum auf dem Lkw, Hagel, Hochwasser auf dem Hof“): Sturm/Unwetter/Hagel/umgestürzter Baum/Hochwasser →
// Schritte (im Wasser gestanden → Motor nicht starten, „nicht fahrbereit“; Baum/Leitungen: Abstand, Feuerwehr; Fotos vor dem Wegräumen; mehrere Fahrzeuge →
// Sammelmeldung der Leitung) – reine Information, keine Frist. „Ansturm“, „Sturmhaube“, „Ast(-)loch“, „Bastelei“, „Wasser im Fahrerhaus“ (Dichtung) lösen nichts aus
const STORM_HINT = /unwetter|orkan|(?<![a-zäöüß])sturm(?:schaden|schäden|schaeden|b(?:ö|oe)e|b(?:ö|oe)en|tief)?(?![a-zäöüß])|(?<![a-zäöüß])hagel(?:schaden|schäden|schaeden|schlag|k(?:ö|oe)rner|sturm)?(?![a-zäöüß])|(?<![a-zäöüß])(?:baum|bäume|baeume|ast|äste|aeste)\s+(?:\S+\s+){0,4}?(?:(?:herunter|runter|drauf|um)?gefallen|gest(?:ü|ue)rzt|umgest(?:ü|ue)rzt|umgekippt|gekracht|abgebrochen)(?![a-zäöüß])|umgest(?:ü|ue)rzte[nrs]?\s+baum|hochwasser|(?:(?:ü|ue)berflutet|(?:ü|ue)berschwemm|starkregen)|(?<![a-z])(?:storms?|stormy|hail(?:storm|stones?)?|flood(?:ed|ing|water|waters)?|fallen\s+(?:tree|branch))(?![a-z])|(?<![a-z])(?:tree|branch)\s+(?:\S+\s+){0,3}?(?:fell|fallen|came\s+down)(?![a-z])|(?<![а-яіїєґ])(?:бур[яіюі]|бурею|шторм|ураган|град(?:ом|у|ини|ина)?|злив[аи])(?![а-яіїєґ])|повін|паводк|паводок|затоплен|затопил|підтопл|подтопл|(?:дерев|гілк|гілл|ветк)\S*\s+(?:\S+\s+){0,3}?(?:впал|упал|звалил|повалил)|(?:впал|упал|повалил)\S*\s+(?:\S+\s+)?(?:дерев|гілк|ветк)|(?<![a-zäöüß-])(?:durch|ins)\s+(?:\S+\s+)?(?:wasser|hochwasser|(?:ü|ue)berflutete\S*|(?:ü|ue)berschwemmte\S*)\s+(?:\S+\s+)?(?:gefahren|durchgefahren)|(?<![a-zäöüß-])wasser\s+(?:\S+\s+)?angesaugt|(?<![a-z])(?:drove|driven|driving)\s+through\s+(?:deep\s+|flood\s+)?(?:water|flood\S*)/i;
// Backlog 668 (30.10.2026, Blickwinkel „Lkw bleibt an Brücke/Unterführung/Tankstellendach hängen – Durchfahrtshöhe“): Anprall an Brücke, Unterführung,
// Parkhaus-/Tankstellendach, Höhenbegrenzung → Schritte (sichern, bei Brücke immer Polizei, Brückenschild; nicht weiterfahren/zurücksetzen solange verkeilt,
// „nicht fahrbereit“; Fremdeigentum → nicht ohne Meldung wegfahren; Fotos mit Höhenschild) – reine Information, keine Frist. „Wechselbrücke“, „Kippbrücke“,
// „Ladebrücke“, „Brückentag“, „Bridgestone“, „задній/ведучий міст“ (Achse) lösen nichts aus
const BRIDGE_HINT = /br(?:ü|ue)ckenanprall|br(?:ü|ue)ckenanfahrschaden|durchfahrtsh(?:ö|oe)he|einfahrtsh(?:ö|oe)he|(?<![a-zäöüß])zu\s+hoch\s+f(?:ü|ue)r\s+(?:die|das|den)\s+(?:\S+\s+)?(?:br(?:ü|ue)cke|unterf(?:ü|ue)hrung|einfahrt|durchfahrt|parkhaus|halle)|(?<![a-zäöüß])(?:(?:eisenbahn|bahn|autobahn|fu(?:ß|ss)g(?:ä|ae)nger|stra(?:ß|ss)en|beton|stahl)?br(?:ü|ue)cke|unterf(?:ü|ue)hrung|parkhaus(?:einfahrt)?|tiefgarage(?:neinfahrt)?|tankstellendach|tankstellen(?:ü|ue)berdachung|(?:ü|ue)berdachung|vordach|h(?:ö|oe)henbegrenzung|h(?:ö|oe)henbalken|torbogen)(?:n|en|s)?(?![a-zäöüß])\s+(?:\S+\s+){0,4}?(?:angefahren|gerammt|touchiert|gestreift|erwischt|mitgenommen|h(?:ä|ae)ngen\s*geblieben|h(?:ä|ae)ngengeblieben|stecken\s*geblieben|steckengeblieben|steckt\s+fest|feststeckt|eingeklemmt|verkeilt|dagegen|zu\s+niedrig|aufgerissen|abgerissen)(?![a-zäöüß])|(?<![a-zäöüß])(?:gegen|unter|in)\s+(?:die|der|das|den|dem|eine|einer|ein|einem)?\s*(?<![a-zäöüß])(?:(?:eisenbahn|bahn|autobahn|fu(?:ß|ss)g(?:ä|ae)nger|stra(?:ß|ss)en|beton|stahl)?br(?:ü|ue)cke|unterf(?:ü|ue)hrung|parkhaus(?:einfahrt)?|tiefgarage(?:neinfahrt)?|tankstellendach|tankstellen(?:ü|ue)berdachung|(?:ü|ue)berdachung|vordach|h(?:ö|oe)henbegrenzung|h(?:ö|oe)henbalken|torbogen)(?:n|en|s)?(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:gefahren|geknallt|gekracht|geprallt|gesto(?:ß|ss)en|gerauscht|geraten)(?![a-zäöüß])|(?<![a-z])(?:bridge\s+strike|low\s+bridge|height\s+(?:barrier|restriction|limit|bar)s?)(?![a-z])|(?<![a-z])(?:hit|struck|scraped|clipped|crashed\s+into|drove\s+into|ran\s+into|went\s+into|stuck\s+under|wedged\s+under|got\s+stuck\s+under)\s+(?:\S+\s+){0,3}?(?:bridge|underpass|overpass|flyover|canopy|car\s+park\s+entrance)(?![a-z])|(?<![a-z])(?:bridge|underpass|overpass|canopy)\s+(?:\S+\s+){0,2}?(?:was\s+|got\s+)?(?:hit|struck|clipped|damaged)(?![a-z])|too\s+(?:tall|high)\s+for\s+the\s+(?:bridge|underpass|entrance|car\s+park)|(?:вріза\S*|зачепи\S*|застряг\S*|вдари\S*|в['’]?їха\S*|въеха\S*|ударил\S*|зацепил\S*|застрял\S*|врезал\S*)\s+(?:\S+\s+){0,3}?(?:(?<!(?:задн|передн|ведуч|задні|передні|задний|передний|ведучий|ведущий)\S*\s+)(?:міст|мосту|мостом|мості|мост|моста|мосте)(?![а-яіїєґ])|шляхопровід|шляхопровод|путепровод|естакад|эстакад|навіс\S*\s+(?:азс|заправ)|навес\S*\s+(?:азс|заправ))|(?:обмежен|ограничен)\S*\s+(?:\S+\s+)?(?:висот|высот)|(?:під|под)\s+(?:мостом|мост|шляхопровод\S*|путепровод\S*)\s+(?:\S+\s+)?(?:застряг|застрял|зачепи|зацепи)/i;
// Backlog 671 (30.10.2026, Blickwinkel „Lkw steht nicht mehr da – vom Ordnungsamt/der Polizei abgeschleppt, umgesetzt oder mit Parkkralle“): behördliches
// Abschleppen/Umsetzen, Verwahrplatz, Park-/Radkralle → Schritte (erst bei der Polizei nachfragen, sonst wie Diebstahl; Kralle nicht selbst entfernen,
// Zettel/Bescheid fotografieren; Abholung/Bezahlung nur nach Absprache, Fahrzeug bei Abholung rundum prüfen) – reine Information, keine Frist, keine Kosten.
// Abschleppen nach Panne („in die Werkstatt abgeschleppt“), „Schlauchschelle“/„hose clamp“, „Ladung umgesetzt“ lösen nichts aus
const TOW_HINT = /(?<![a-zäöüß])(?:verwahr(?:platz|stelle|gelände|gelaende|hof)|abschlepphof|park(?:kralle)|radkralle|reifenkralle)(?![a-zäöüß])|(?<![a-zäöüß])(?:ordnungsamt|polizei|stadt|beh(?:ö|oe)rde|gemeinde|kommune|politie|police)\S*\s+(?:\S+\s+){0,5}?(?:abgeschleppt|weggeschleppt|umgesetzt|abschleppen\s+lassen|kralle)(?![a-zäöüß])|(?<![a-zäöüß])(?:abgeschleppt|weggeschleppt|umgesetzt)\s+(?:\S+\s+){0,5}?(?:ordnungsamt|polizei|beh(?:ö|oe)rde|halteverbot|parkverbot|verwahr)|(?<![a-zäöüß])(?:im|aus\s+dem|wegen)\s+(?:absoluten\s+)?(?:halte|park)verbot(?:s)?\s+(?:\S+\s+){0,3}?(?:abgeschleppt|weggeschleppt|umgesetzt)|(?<![a-z])(?:impound(?:ed)?|wheel[\s-]+clamp(?:ed)?|clamped|(?:police|council|authorities|city)\s+(?:\S+\s+){0,3}?towed|towed\s+(?:away\s+)?by\s+(?:the\s+)?(?:police|council|authorities|city)|towed\s+(?:away\s+)?from\s+(?:a\s+|the\s+)?no[\s-]+parking)(?![a-z])|штрафмайданчик|штраф\S*\s+(?:майданчик|стоянк)|штрафстоянк|(?:поліці|полиці|полиц|муніципал)\S*\s+(?:\S+\s+){0,3}?(?:евакуювал|эвакуировал|забрал|забрала|забрали|евакуатор)\S*|(?:блокуван|блокиратор|блокувальник)\S*\s+(?:\S+\s+)?колес/i;
// Backlog 674 (30.10.2026, Blickwinkel „Personen im Laderaum entdeckt – blinde Passagiere am Rastplatz/Hafen“): versteckte Personen im Auflieger/
// Laderaum → Schritte (nicht allein öffnen, Polizei, bei Lebensgefahr 112; nicht weiterbewegen, Siegel/Plane nicht verändern; letzte Kontrolle/Abstellort,
// Fotos nur ohne Gefahr; Leitung) – reine Information, keine Frist. „Klopfen/Geräusche im Anhänger“, „Ladung verrutscht“, „Personen verletzt“ lösen nichts aus
const STOW_HINT = /blinde[nr]?\s+passagier|(?<![a-zäöüß])(?:personen|menschen|leute|migranten|fl(?:ü|ue)chtlinge|jemand)\s+(?:\S+\s+){0,3}?(?:im|in\s+(?:der|dem|den)|unter\s+(?:der|dem)|zwischen\s+der)\s+(?:\S+\s+)?(?:laderaum|ladefl(?:ä|ae)che|auflieger|anh(?:ä|ae)nger|k(?:ü|ue)hlauflieger|koffer(?:aufbau)?|container|aufbau|plane|ladung)(?![a-zäöüß])|(?<![a-zäöüß])(?:personen|menschen|leute|migranten|fl(?:ü|ue)chtlinge|jemand)\s+(?:\S+\s+){0,4}?(?:versteckt|eingestiegen|reingeklettert|hineingeklettert|rausgesprungen|herausgesprungen|herausgekommen)(?![a-zäöüß])|versteckte\s+(?:personen|menschen)|(?<![a-z])(?:stowaways?|clandestines?|clandestine\s+entrants?)(?![a-z])|(?<![a-z])(?:people|persons|migrants|someone|somebody|refugees)\s+(?:\S+\s+){0,3}?(?:hiding|hidden|found|inside|climbed\s+into|got\s+into)\s+(?:\S+\s+){0,3}?(?:trailer|load|lorry|truck|container|cargo|curtain)|(?<![а-яіїєґ])(?:люди|людей|мігрант\S*|мигрант\S*|біженц\S*|беженц\S*|нелегал\S*)\s+(?:\S+\s+){0,3}?(?:в|у|під|под)\s+(?:\S+\s+)?(?:причеп\S*|причіп\S*|напівпричеп\S*|полуприцеп\S*|прицеп\S*|кузов\S*|вантаж\S*|груз\S*|контейнер\S*)|(?:сховал\S*|спрятал\S*|ховал\S*|прятал\S*)\s+(?:\S+\s+){0,3}?(?:в|у|під|под)\s+(?:\S+\s+)?(?:причеп\S*|причіп\S*|напівпричеп\S*|полуприцеп\S*|прицеп\S*|кузов\S*|вантаж\S*|груз\S*|контейнер\S*)/i;
// [CLAUDE] Backlog 678 (30.10.2026, Blickwinkel „Eis/Schnee auf dem Aufliegerdach“): Eis/Schnee auf dem Dach von Lkw/Auflieger/Plane bzw. Eisplatte →
// Schritte (nicht so losfahren, nicht ungesichert aufs Dach, Räumanlage/Leitung fragen, sonst „nicht fahrbereit“; hat sich etwas gelöst und getroffen → anhalten,
// Polizei, bei Verletzten 112; Leitung) – reine Information, keine Frist. „Schnee auf der Straße“, „Frontscheibe vereist“, „Eis im Laderaum“, „Dachluke undicht“ nicht.
const ROOFICE_HINT = /(?<![a-zäöüß])(?:eis(?:platten?|schicht|brocken|schollen?|st(?:ü|ue)cke?|panzer)?|schnee(?:schicht|last|brett|haufen|massen|decke)?)(?![a-zäöüß])\s+(?:\S+\s+){0,4}?(?:auf|vom|von|am)\s+(?:\S+\s+){0,2}?(?:(?:auflieger|anh(?:ä|ae)nger|planen|koffer|kabinen|fahrerhaus|lkw|container)?dach|aufliegerdach|plane|planendach|auflieger|anh(?:ä|ae)nger|aufbau|koffer)(?:es|s)?(?![a-zäöüß])|(?<![a-zäöüß])(?:(?:auflieger|anh(?:ä|ae)nger|planen|koffer|kabinen|fahrerhaus|lkw|container)?dach|plane)(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:vereist|zugefroren|eingeschneit|schneebedeckt|voller\s+(?:eis|schnee)|voll\s+(?:eis|schnee)|mit\s+(?:\S+\s+)?(?:eis|schnee))(?![a-zäöüß])|(?<![a-zäöüß])(?:dacheis|dachschnee|eisplatten?)(?![a-zäöüß])|(?<![a-z])(?:ice|snow)(?:\s+(?:sheets?|slabs?|chunks?|layer|load))?\s+(?:\S+\s+){0,4}?(?:on|off|from)\s+(?:the\s+)?(?:\S+\s+)?(?:roof|top|tarp|tarpaulin|curtain)(?![a-z])|(?<![a-z])roof\s+(?:\S+\s+){0,2}?(?:covered|full|caked)\s+(?:with|of|in)\s+(?:ice|snow)|(?<![a-z])(?:icy|frozen|snow-covered|snowy)\s+(?:\S+\s+)?roof(?![a-z])|(?<![а-яіїєґё])(?:лід|льоду|лед|льда|крижан\S*|крижин\S*|льдин\S*|наледь|сніг\S*|снег\S*)\s+(?:\S+\s+){0,3}?(?:на|з|із|зі|с|со)\s+(?:\S+\s+)?(?:дах\S*|крыш\S*|тент\S*)|(?<![а-яіїєґё])(?:дах\S*|крыш\S*|тент\S*)\s+(?:\S+\s+){0,3}?(?:в|у|під|под)\s+(?:сніг\S*|снег\S*|льод\S*|льд\S*|лід|лед)|(?<![а-яіїєґё])(?:дах\S*|крыш\S*|тент\S*)\s+(?:\S+\s+){0,2}?(?:обмерз\S*|обледен\S*|замерз\S*|засипан\S*|засыпан\S*)/i;
const HITRUN_HINT = /fahrerflucht|unfallflucht|parkschaden|(?<![a-zäöüß])verursacher\S*\s+(?:\S+\s+){0,2}?(?:unbekannt|abgehauen|weggefahren|gefl(?:ü|ue)chtet|geflohen)(?![a-zäöüß])|(?<![a-zäöüß])(?:angefahren|touchiert|gerammt|gestreift|zerkratzt|eingedellt|besch(?:ä|ae)digt)[,;]?\s+(?:\S+\s+){0,6}?(?:abgehauen|davongefahren|gefl(?:ü|ue)chtet|geflohen|ohne\s+(?:anzuhalten|sich\s+zu\s+melden|(?:einen\s+)?zettel|(?:eine\s+)?nachricht))(?![a-zäöüß])|hit[\s-]+and[\s-]+run|(?:fled|left)\s+the\s+scene|(?:drove|driven|took)\s+off\s+without\s+(?:stopping|leaving)|(?:damaged|hit|struck|scraped|dented)\s+(?:\S+\s+){0,2}?while\s+parked|(?<![а-яіїєґ])(?:втік|втекл|втеч[аіуе]|скрылс|скрылась|скрылись)|(?:поїхав|поїхала|поїхали|уехал\S*|зник\S*|исчез\S*)\s+з?с?\s*(?:місця|места)\s+(?:дтп|аварії|аварии|пригоди|происшествия)/i;
// Backlog 291 (Blickwinkel „Steinschlag in der Windschutzscheibe“): Glasschaden in der Beschreibung → Hinweise (Fotos mit Größenvergleich,
// Lage im Sichtfeld, Weiterfahrt klären, früh melden). „Bremsscheibe“, „Scheibenwischer“, „Spiegel“ lösen nichts aus; reine Information, keine Frist
const GLASS_HINT = /windschutzscheibe|frontscheibe|seitenscheibe(?!n?\s+(?:geht|gehen|l(?:ä|ae|a)sst|f(?:ä|ae|a)hrt|schlie(?:ß|ss)t|bleibt|rutscht|kommt)\s)|heckscheibe|steinschlag|glasbruch|glasschaden|(?<![a-zäöüß])(?<!brems[\s-]?)scheibe\s+(?:\S+\s+){0,3}?(?:gerissen|gesprungen|eingeschlagen|kaputt|gebrochen|(?:einen\s+)?riss)|riss\s+in\s+der\s+scheibe|windshield|windscreen|(?:stone|rock)\s+chip|(?:cracked|broken|smashed|chipped)\s+(?:side\s+)?(?:window|glass)|(?<!mirror\s)(?:window|glass)\s+(?:is\s+)?(?:cracked|broken|smashed|chipped)|лобов\S*\s+(?:скл|стекл)|скл[оаіу]\S*\s+(?:\S+\s+)?(?:тріснул|розбит|пошкоджен)|стекл\S*\s+(?:\S+\s+)?(?:треснул|разбит)|(?:тріщин|трещин|скол)\S*\s+(?:\S+\s+)?(?:на\s+)?(?:скл|стекл)/i;
// Backlog 293 (Blickwinkel „Wildunfall nachts auf der Landstraße“): Wildunfall → eigene Schritte (sichern, Polizei auch ohne Verletzte,
// Wildunfallbescheinigung, Tier nicht mitnehmen) statt der allgemeinen Unfall-Hinweise; „Drehzahl“, „Dashboard“, „солений“ lösen nichts aus
const WILD_HINT = /wildunfall|wildwechsel|wildschwein|(?<![a-zäöüß])(?:reh|rehe|rehbock|hirsch|wild|fuchs|dachs)(?![a-zäöüß])|\bdeer\b|\bboars?\b|\bmoose\b|\belk\b|animal\s+(?:collision|strike)|hit\s+an?\s+animal|(?<![а-яіїєґ])(?:косул|олен|кабан|лос[ьяюе](?:м)?(?![а-яіїєґ])|дик\S*\s+(?:твар|живот))/i;
// Backlog 294 (Blickwinkel „Fahrer verliert unterwegs Fahrzeugschlüssel oder Fahrzeugschein“): Hinweise (Fahrzeug sichern, Leitung/Disposition
// anrufen statt eigenmächtig Schlüsseldienst, Zulassungsbescheinigung Teil I mitführen, Diebstahlverdacht → Polizei) – reine Information, keine Frist.
// „Schraubenschlüssel“/„Drehmomentschlüssel“, „Frachtpapiere“, „Papierrolle“, „keyboard“ lösen nichts aus
const LOST_HINT = /(?<![a-zäöüß])(?:(?:fahrzeug|lkw|auto|wagen|ersatz)?schl(?:ü|ue|u)ssel\S*|fahrzeugschein|zulassungsbescheinigung|fahrzeugpapiere|papiere)\s+(?:\S+\s+){0,4}?(?:verloren|verlegt|weg(?![a-zäöüß])|fehl(?:t|en)(?![a-zäöüß])|vergessen|abhanden|liegen\s*gelassen|eingeschlossen|nicht\s+(?:mehr\s+)?(?:auffindbar|auffinden|da|gefunden|zu\s+finden))|(?:verloren|verlegt|vergessen|eingeschlossen|finde)\S*\s+(?:\S+\s+){0,3}?(?:schl(?:ü|ue|u)ssel|fahrzeugschein|zulassungsbescheinigung|fahrzeugpapiere)|schl(?:ü|ue|u)sselverlust|(?:lost|misplaced|can['’]?t\s+find|cannot\s+find|locked)\s+(?:\S+\s+){0,2}?(?:keys?|registration|vehicle\s+documents|vehicle\s+papers)\b|\b(?:keys?|registration\s+(?:certificate|document)s?|vehicle\s+(?:documents|papers))\s+(?:\S+\s+){0,3}?(?:lost|missing|gone|locked\s+in)\b|(?<![а-яіїєґ])(?:ключ\S*|техпаспорт\S*|свідоцтв\S*\s+про\s+реєстрац\S*)\s+(?:\S+\s+){0,3}?(?:загуб|втрат|зник|забу|потер|пропа|нема|не\s+можу\s+знайти|не\s+могу\s+найти)|(?:загуби|загуба|втрати|забу|забы|потеря|потерял)\S*\s+(?:\S+\s+){0,3}?(?:ключ|техпаспорт|свідоцтв)|(?<![a-zäöüß-])(?:schl(?:ü|ue)ssel)\s+(?:\S+\s+){0,4}?(?:eingeschlossen|eingesperrt|weggeschlossen)|(?<![a-zäöüß-])(?:mich|uns)?\s*ausgesperrt(?![a-zäöüß])|(?<![a-z])(?:keys?\s+(?:\S+\s+){0,3}?locked\s+(?:in|inside)|locked\s+(?:myself\s+)?out)(?![a-z])|(?<![a-zäöüß-])(?:abgeschlossen|zugefallen|zugesperrt|verriegelt),?\s+(?:\S+\s+){0,3}?schl(?:ü|ue)ssel,?\s+(?:\S+\s+)?(?:drin|drinnen|innen|steckt|liegt\s+(?:\S+\s+)?(?:drin|im\s+(?:lkw|fahrerhaus|f(?:ü|ue)hrerhaus)))(?![a-zäöüß])|(?<![a-zäöüß-])schl(?:ü|ue)ssel\s+(?:\S+\s+){0,2}?(?:drin|drinnen|steckt\s+innen)\s+(?:\S+\s+){0,3}?(?:abgeschlossen|zugefallen|zugesperrt|verriegelt)(?![a-zäöüß])/i;
// Backlog 296 (Blickwinkel „Reifenpanne auf der Autobahn“): Reifenpanne/-platzer → Hinweise (sicher anhalten, Warnblinker/Warnweste/
// Warndreieck, hinter die Leitplanke, nicht selbst auf dem Seitenstreifen wechseln – Leitung/Disposition veranlasst Reifen- bzw. Pannendienst,
// Standort und Reifenposition notieren + Foto, „nicht fahrbereit“) – reine Information, keine Frist, keine Entfernungsangabe.
// „Batterie platt“, „Reifendruck prüfen“, „Reifen abgefahren“, „Bodenplatte“, „flatbed“ lösen nichts aus
// Backlog 580 (Blickwinkel „Diktat/Tippfehler“): vorn ergänzt – Schreibweisen ohne Umlaut, getrennt geschrieben, Tippfehler, Umschrift
const FLAT_HINT = /reifen[sn]?\s+(?:\S+\s+){0,3}?(?:plat(?![a-zäöüß])|kaput(?![a-zäöüß])|geplatz|geplazt|(?:keine?|ohne)\s+luft|luft\s+(?:ist\s+)?(?:raus|weg))|(?:hab\S*|hat)\s+(?:\S+\s+)?einen\s+platten|(?<![a-z])(?:koleso|kolesa|shina)\s+(?:\S+\s+)?(?:probit|spust|lopnu)\S*|reifenpanne|reifenplatzer|plattfu(?:ß|ss)|(?<![a-zäöüß])(?:platte[rmn]?|geplatzte[rmn]?)\s+(?:\S+\s+)?reifen|reifen[sn]?\s+(?:\S+\s+){0,3}?(?:platt(?![a-zäöüß])|geplatzt|zerfetzt|explodiert|kaputt|defekt|aufgeschlitzt|eingeschnitten)|flat\s+(?:tyre|tire)|(?:tyre|tire)s?\s+(?:\S+\s+){0,2}?(?:burst|blew|blown|exploded|flat(?![a-z]))|blow-?out|punctur|(?:пробив|пробила|пробили|пробил|проколов|проколол|проколола|спустил[оаи]?|спустив|лопнул[аои]?|лопнув)\s+(?:\S+\s+){0,2}?(?:колес|шин)|(?:колес|шин)\S*\s+(?:\S+\s+){0,2}?(?:лопнул|лопнув|пробит|спущен|спустил|розірв|порвал)|прокол\S*\s+(?:\S+\s+)?(?:колес|шин)/i;
// Backlog 297 (Blickwinkel „Ladungssicherung bei Polizeikontrolle bemängelt“): Beanstandung bei einer Straßenkontrolle → Hinweise
// (Anordnungen befolgen, Leitung/Disposition anrufen, Mängelbericht/Verwarnung fotografieren, Anhörungsbogen/Bußgeldbescheid an die Leitung,
// „nicht fahrbereit“ solange die Weiterfahrt untersagt ist) – reine Information, keine Frist, kein Betrag. „Abfahrtskontrolle: Licht bemängelt“,
// „22,5 Zoll“, „Bag“ im Wort, „Öl kontrolliert“,
// „Polizei hat Anzeige/Unfall aufgenommen“, „Поліція склала протокол ДТП“ lösen nichts aus
const ROADCHK_HINT = /(?<![a-zäöüß])(?:polizei\S*|bag(?![a-zäöüß])\S*|balm(?![a-zäöüß])\S*|verkehrskontrolle|stra(?:ß|ss)enkontrolle|zollkontrolle|kontrolle\s+(?:durch|von|der)\s+(?:die\s+|der\s+|dem\s+)?(?:polizei|bag|balm))\s+(?:\S+\s+){0,8}?(?:bem(?:ä|ae|a)ngelt|beanstandet|m(?:ä|ae|a)ngelbericht|m(?:ä|ae|a)ngel(?![a-zäöüß])|verwarn|bußgeld|bussgeld|weiterfahrt|stillgelegt|untersagt|festgehalten)|weiterfahrt\s+(?:\S+\s+){0,2}?(?:untersagt|verboten)|m(?:ä|ae|a)ngelbericht|ladungssicherung\S*\s+(?:\S+\s+){0,3}?(?:bem(?:ä|ae|a)ngelt|beanstandet)|(?:bem(?:ä|ae|a)ngelt|beanstandet)\S*\s+(?:\S+\s+){0,3}?ladungssicherung|(?:police|roadside\s+(?:check|inspection)|dvsa|bag|balm)\s+(?:\S+\s+){0,8}?(?:fined|fine|ticket|defect\s+notice|prohibit|not\s+allowed\s+to\s+(?:drive|continue))|prohibition\s+notice|load\s+securing\s+(?:\S+\s+){0,2}?(?:criticised|criticized|objected)|(?:поліці|поліц|полиц|контрол)\S*\s+(?:\S+\s+){0,8}?(?:о?штраф|заборон|запрет|кріплення\s+вантаж|крепление\s+груз)/i;
// Backlog 298 (Blickwinkel „Lkw springt morgens bei Kälte nicht an“): Startprobleme/leere Batterie → Hinweise (nicht dauerhaft weiter
// starten, Starthilfe nur unterwiesen und nur von gleicher Bordspannung – sonst Leitung/Disposition, Beobachtung + Foto vom Display, Kühlware/
// Liefertermin am Telefon nennen, „nicht fahrbereit“) – reine Information, keine Frist, keine Volt-/Zeitangabe. „Navi startet nicht“, „App startet
// nicht“, „Standheizung startet nicht“, „Handy-Akku leer“, „додаток не запускається“ lösen nichts aus
// Backlog 352: auch Zündschloss/Lenkradschloss klemmt („Schlüssel klemmt im Zündschloss“, „Zündschloss defekt“, „key stuck in the ignition“, „замок запалювання заклинило“)
const NOSTART_HINT = /springt\s+(?:\S+\s+){0,2}?nicht\s+(?:mehr\s+)?an(?![a-zäöüß])|(?:motor|lkw|fahrzeug|wagen|zugmaschine|sattelzug)\s+(?:\S+\s+){0,2}?(?:startet|startete)\s+nicht|l(?:ä|ae|a)sst\s+sich\s+nicht\s+(?:mehr\s+)?starten|anlasser\s+(?:\S+\s+){0,2}?(?:dreht|macht|klackt)\s+nicht|anlasser\s+(?:\S+\s+){0,2}?(?:defekt|kaputt)|batterie\S*\s+(?:\S+\s+){0,3}?(?:leer|platt|tot|kaputt|defekt)(?![a-zäöüß])|starthilfe|(?:engine|truck|lorry|vehicle|it)\s+(?:won['’]?t|will\s+not|does\s*n[o']?t|did\s*n[o']?t|cannot|can['’]?t)\s+start|(?:flat|dead)\s+battery|battery\s+(?:\S+\s+){0,2}?(?:flat|dead)(?![a-z])|jump[- ]?start|не\s+заводит|(?:двигун|мотор|машин|вантажівк|тягач|грузовик)\S*\s+(?:\S+\s+)?не\s+запуска|акумулятор\S*\s+(?:\S+\s+){0,2}?(?:розряд|сів|сіла)|аккумулятор\S*\s+(?:\S+\s+){0,2}?(?:разряж|сел)|(?:сів|сел)\s+(?:акумулятор|аккумулятор)|(?:розрядив|разрядил)\S*\s+(?:\S+\s+)?(?:акумулятор|аккумулятор)|(?<![a-zäöüß-])(?:z(?:ü|ue|u)ndschloss|z(?:ü|ue|u)ndschl(?:ö|oe|o)sser|lenkradschloss|lenkradsperre)\S*\s+(?:\S+\s+){0,3}?(?:defekt|kaputt|klemmt|blockiert|geht\s+nicht|gehen\s+nicht|dreht\s+(?:sich\s+)?nicht|l(?:ä|ae|a)sst\s+sich\s+nicht\s+(?:mehr\s+)?drehen|rastet\s+nicht)|(?<![a-zäöüß-])schl(?:ü|ue|u)ssel\s+(?:\S+\s+){0,4}?(?:im|ins|in\s+(?:das|der|dem))\s+(?:z(?:ü|ue|u)ndschloss|z(?:ü|ue|u)ndung|lenkradschloss)|(?<![a-zäöüß-])schl(?:ü|ue|u)ssel\s+(?:\S+\s+){0,2}?(?:klemmt|steckt\s+fest|dreht\s+(?:sich\s+)?nicht|l(?:ä|ae|a)sst\s+sich\s+nicht\s+(?:mehr\s+)?drehen)\s+(?:\S+\s+)?(?:im|in\s+der)\s+(?:z(?:ü|ue|u)ndschloss|z(?:ü|ue|u)ndung|lenkradschloss)|(?<![a-z-])(?:ignition(?:\s+(?:lock|switch|barrel))?|steering\s+lock)\s+(?:\S+\s+){0,2}?(?:stuck|jammed|broken|faulty|not\s+working|won['’]?t\s+turn|doesn['’]?t\s+turn|locked)(?![a-z])|(?<![a-z-])key\s+(?:\S+\s+){0,2}?(?:stuck|jammed|won['’]?t\s+turn|doesn['’]?t\s+turn|will\s+not\s+turn)\s+(?:\S+\s+)?in\s+(?:the\s+)?ignition|(?<![а-яіїєґ])(?:замок|замка|замку)\s+(?:запалюван|зажиган)\S*\s+(?:\S+\s+){0,2}?(?:не\s+працю\S*|не\s+работа\S*|заклин\S*|зламал\S*|сломал\S*|не\s+поверта\S*|не\s+повора\S*)|(?<![а-яіїєґ])ключ\S*\s+(?:\S+\s+){0,3}?(?:в|у)\s+(?:замку\s+)?(?:запалюван|зажиган)\S*|(?<![a-zäöüß-])(?:springt|startet|springen|starten)\s+(?:\S+\s+){0,2}?(?:schlecht|schwer|nur\s+schwer|erst\s+nach\s+(?:\S+\s+){0,2}?versuch\S*)\s*(?:an(?![a-zäöüß]))?|(?<![a-z])(?:hard|difficult)\s+to\s+start|(?<![a-z])(?:starts|starting)\s+(?:very\s+)?(?:badly|poorly)/i;
// Backlog 299 (Blickwinkel „Motorwarnleuchte rot während der Fahrt“): Warnleuchte/Warnmeldung im Kombiinstrument → Hinweise (rot: sicher
// anhalten, Motor aus, Leitung anrufen; gelb/orange: Weiterfahrt mit der Leitung klären; Foto vom Display; Rauch/Brandgeruch: Fahrzeug
// verlassen, Notruf; Auswahl „Kann das Fahrzeug fahren?“) – reine Information, keine Frist. „Rückleuchte“, „rote Rückleuchte“, „Warnweste“,
// „Warnblinker“, „Warndreieck“ lösen nichts aus
// Backlog 342 (Fehlersuche): auch einzelne Leuchten im Display („Öldruckleuchte an“, „ABS-Leuchte“, „AdBlue-Leuchte“, „Symbol leuchtet rot“, „STOP leuchtet“,
// „Fehlermeldung im Display“, „oil pressure light on“, „red light on the dashboard“); Brems-/Rück-/Stoppleuchten außen, „brake light“, rote Ampel nicht
// Backlog 347: auch „Display zeigt Fehler/Warnung“, „Fehler im Display“, „Im Display steht …“, „display shows an error“, „на дисплеї помилка“; „Display kaputt“ (Kombiinstrument-Hinweis) nicht
// Backlog 580 (Blickwinkel „Diktat/Tippfehler“): vorn ergänzt – Schreibweisen ohne Umlaut, getrennt geschrieben, Tippfehler, Umschrift
const WARNLIGHT_HINT = /(?<![a-zäöüß-])(?:motor)?(?:ö|oe)ldruck(?:anzeige)?(?![a-zäöüß])\s+(?:(?:ist|war|geht|seit|heute|schon|wieder|deutlich|sehr|viel|zu|plötzlich|ploetzlich|auf|der|die|laut|display|anzeige|bei|im|leerlauf)[,;]?\s+){0,4}(?:niedrig|zu\s+(?:niedrig|gering)|gering|f(?:ä|ae)llt|sinkt|weg(?![a-zäöüß])|null|auf\s+null|warnung|zu\s+wenig|schwankt)(?![a-zäöüß])|(?<![a-zäöüß-])(?:motor)?(?:ö|oe)ldruck-?(?:warnung|meldung|fehler)|(?<![a-z])(?:low\s+oil\s+pressure|oil\s+pressure\s+(?:\S+\s+)?(?:low|warning|dropp\S*|falling|alarm))(?![a-z])|(?<![а-яіїєґ])(?:низьк\S*|малий|упав|впав|падає)\s+тиск\S*\s+(?:олив|мастил)\S*|(?<![а-яіїєґ])тиск\S*\s+(?:олив|мастил)\S*\s+(?:\S+\s+)?(?:низьк\S*|впав|упав|падає)|(?<![а-яіїєґ])давлени\S*\s+масл\S*\s+(?:\S+\s+)?(?:низк\S*|упал\S*|пада\S*)|(?<![а-яіїєґ])(?:низк\S*|упал\S*)\s+давлени\S*\s+масл\S*|(?:warn|kontroll)[\s-]+(?:leuchte|lampe)|(?:warn|kontroll)leuchte|(?:warn|kontroll)lampe|motorkontroll|warnmeldung|(?<![a-zäöüß])rote[snr]?\s+(?:\S+\s+)?(?:leuchte|lampe|symbol|warnung|warnsymbol)(?![a-zäöüß])|warning\s+(?:light|lamp|message)|check\s+engine|engine\s+(?:warning\s+|management\s+)?light|dashboard\s+(?:\S+\s+)?(?:light|warning)|red\s+(?:\S+\s+)?(?:warning|symbol)|(?:контрольн|попереджувальн|сигнальн)\S*\s+(?:ламп|індикатор|индикатор)|(?:горить|горит|загорів|загорілас|загорівс|загорел)\S*\s+(?:\S+\s+){0,2}?(?:лампа|лампочка|індикатор|индикатор|значок|чек)|(?:лампа|лампочка|індикатор|индикатор|значок)\S*\s+(?:\S+\s+){0,2}?(?:горить|горит|загорів|загорілас|загорел)|(?<![a-zäöüß])(?:(?:öldruck|oeldruck|öl|oel|batterie|lade|abs|ebs|asr|esp|adblue|harnstoff|motor|kühlmittel|kuehlmittel|kühlwasser|kuehlwasser|bremsdruck|druckluft|vorratsdruck|bremsbelag|bremsverschlei(?:ß|ss)|vorglüh|vorglueh|glüh|airbag|reifendruck|getriebe|feststellbrems|retarder))(?:-|\s+)?(?:warn)?(?:leuchte|lampe|symbol)(?:n)?(?![a-zäöüß])|(?<![a-zäöüß])(?:symbol|warnzeichen|zeichen|anzeige)\s+(?:\S+\s+){0,2}?(?:leuchtet|blinkt|brennt)\s+(?:\S+\s+)?(?:rot|gelb|orange)(?![a-zäöüß])|(?<![a-zäöüß])(?:leuchte|lampe)\s+(?:\S+\s+){0,2}?(?:leuchtet|blinkt|brennt)\s+(?:\S+\s+)?(?:rot|gelb|orange)\s+(?:\S+\s+)?(?:im|am|auf)\s+(?:dem\s+)?(?:display|kombiinstrument|armaturenbrett|bildschirm)|(?<![a-zäöüß])stopp?\s+(?:\S+\s+)?(?:leuchtet|blinkt|erscheint|im\s+display)|(?<![a-zäöüß])(?:fehler|warnung|st(?:ö|oe|o)rung)(?:meldung|code)?\S*\s+(?:\S+\s+)?(?:im|auf\s+dem|am)\s+(?:display|bildschirm|kombiinstrument|armaturenbrett)|(?<![a-z])(?:oil\s+pressure|oil|battery|charging|abs|ebs|adblue|def|coolant|air\s+pressure|airbag|glow\s+plug|tyre\s+pressure|tire\s+pressure)\s+(?:warning\s+)?(?:light|lamp|symbol|icon)s?(?![a-z])|(?<![a-z])(?:brake|stop)\s+warning\s+(?:light|lamp|symbol|icon)s?(?![a-z])|(?<![a-z])red\s+(?:\S+\s+)?(?:light|lamp|icon)\s+(?:\S+\s+)?(?:on|in)\s+(?:the\s+)?(?:dash\S*|display|instrument\S*)|(?<![a-z])error\s+(?:message|code)s?\s+(?:\S+\s+)?(?:on|in)\s+(?:the\s+)?(?:dash\S*|display|instrument\S*)|(?<![a-zäöüß])(?:display|bildschirm|kombiinstrument)\S*\s+(?:\S+\s+)?(?:zeigt|meldet|bringt)\s+(?:\S+\s+){0,2}?(?:fehler\S*|warnung\S*|st(?:ö|oe|o)rung\S*)|(?<![a-zäöüß])(?:im|auf\s+dem|am)\s+(?:display|bildschirm|kombiinstrument)\s+(?:\S+\s+)?(?:steht|kommt|erscheint|blinkt)\s+(?:\S+\s+){0,2}?(?:fehler\S*|warnung\S*|st(?:ö|oe|o)rung\S*)|(?<![a-z])(?:display|dash(?:board)?|instrument\s+cluster)\s+(?:\S+\s+)?(?:shows|showing|says|displays)\s+(?:an?\s+)?(?:\S+\s+)?(?:error|warning|fault)|(?<![а-яіїєґ])(?:на\s+)?(?:дисплеї|дисплее|екрані|экране|панелі|панели)\s+(?:\S+\s+){0,2}?(?:помилк\S*|ошибк\S*|попереджен\S*|предупрежден\S*)/i;
// Backlog 300 (Blickwinkel „Fahrer bemerkt Ölspur/Leck unter dem Lkw“): auslaufende Betriebsflüssigkeit → Hinweise (nicht losfahren bzw.
// sicher anhalten, Motor aus, Leitung/Disposition; Kraftstoffgeruch/heiße Teile: kein Feuer, Abstand, bei Rauch Notruf; nicht in Gully/Erdreich
// laufen lassen, Ölspur auf der Straße melden; Foto + Tropfstelle/Farbe/Geruch notieren; „nicht fahrbereit“) – reine Information, keine Frist.
// „Öl kontrolliert“, „Ölwechsel fällig“, „Öl nachgefüllt“, „Warnlampe Öldruck“, „Dach undicht“, „Druckluftleitung undicht“, „Reifen verliert Luft“,
// „roof leaks“, „air leak“, „oil change due“, „Заміна масла“, „Тече дах“ lösen nichts aus
// Backlog 338 (Fehlersuche): auch „Tank/Kühler tropft“, „Unter dem Lkw ist eine Pfütze“, „Бак протікає/тече“, „Протекает бак“, „Під машиною калюжа“; „Бак повний“, „Luftleitung tropft“ nicht
// Backlog 349: auch Kraftstoffgeruch („Dieselgeruch im Fahrerhaus“, „riecht nach Diesel“, „smells of diesel“, „пахне дизелем“) – Schritte nennen Dieselgeruch bereits
// Backlog 580 (Blickwinkel „Diktat/Tippfehler“): vorn ergänzt – Schreibweisen ohne Umlaut, getrennt geschrieben, Tippfehler, Umschrift
const LEAK_HINT = /(?<![a-zäöüß])(?:oel|ol|öl|diesel|k(?:ue|u)hlwasser|k(?:ue|u)hlmittel)\s+(?:\S+\s+){0,3}?(?:l(?:ae|a)uft\s+aus|tropft|tropfen|verlust(?![a-zäöüß])|leckt?(?![a-zäöüß]))|(?<![a-zäöüß])(?:oel|öl)leck|öl(?:spur|fleck|lache|pfütze|pfuetze|verlust)|(?:öl|diesel|kraftstoff|sprit|kühlwasser|kühlmittel|kühlflüssigkeit|frostschutz\S*|hydraulik\S*|adblue|bremsflüssigkeit|flüssigkeit)\s+(?:\S+\s+){0,3}?(?:tropft|tropfen|läuft\s+aus|ausgelaufen|ausläuft|leckt|tritt\s+aus|austritt|ausgetreten)|(?:tropft|leckt)\s+(?:\S+\s+){0,3}?(?:öl|diesel|kraftstoff|kühlwasser|kühlmittel|hydrauliköl|flüssigkeit)|läuft\s+(?:\S+\s+){0,2}?(?:öl|diesel|kraftstoff|kühlwasser|kühlmittel|flüssigkeit)\S*\s+aus(?![a-zäöüß])|verlier\S*\s+(?:\S+\s+){0,2}?(?:öl|diesel|kraftstoff|kühlwasser|kühlmittel|hydrauliköl|flüssigkeit)|(?:tank|kühler|(?<!luft)schlauch|(?<!luft)leitung|ölwanne|dichtung)\S*\s+(?:\S+\s+){0,2}?(?:undicht|leckt|leck(?![a-zäöüß])|tropft|tropfen)|(?:lache|pfütze|fleck)\s+(?:\S+\s+){0,2}?unter\s+(?:dem|der|den)\s+(?:\S+\s+)?(?:lkw|fahrzeug|wagen|motor|zugmaschine|auflieger|anhänger|getriebe)|(?<![a-z])(?:oil|fuel|diesel|coolant|antifreeze|hydraulic(?:\s+(?:oil|fluid))?|brake\s+fluid|adblue|fluid)\s+(?:\S+\s+){0,2}?(?:leak|leaking|leaks|leaked|dripping|drips|spill|spilled|spilling|running\s+out|escaping)|leak(?:s|ing|ed)?\s+(?:\S+\s+){0,2}?(?:oil|fuel|diesel|coolant|antifreeze|hydraulic|fluid)|losing\s+(?:\S+\s+)?(?:oil|coolant|fuel|diesel|fluid)|(?:puddle|pool|stain)\s+(?:of\s+\S+\s+)?under\s+(?:the\s+)?(?:truck|lorry|vehicle|engine|trailer|tractor)|oil\s+(?:slick|trail)|(?:теч|протіка|підтіка|протека|подтека|капа|капл)\S*\s+(?:\S+\s+){0,2}?(?:олив|масл|пальн|палив|дизел|антифриз|тосол|охолодж|охлажд|топлив|солярк)|(?:олив|масл|пальн|палив|дизел|антифриз|тосол|охолодж|охлажд|топлив|солярк)\S*\s+(?:\S+\s+){0,2}?(?:тече|теч[еёу]т|протіка|підтіка|протека|подтека|капа)|(?:витік|витоку|витікає|утечк)\S*\s+(?:\S+\s+)?(?:олив|масл|пальн|палив|дизел|антифриз|тосол|охолодж|охлажд|топлив)|(?:калюж|луж)\S*\s+(?:\S+\s+){0,2}?(?:під|под)\s+(?:\S+\s+)?(?:вантажівк|машин|авто|тягач|грузовик|двигун|мотор|причіп|прицеп)|unter\s+(?:dem|der|den)\s+(?:lkw|fahrzeug|wagen|motor|zugmaschine|auflieger|anhänger|getriebe)\S*\s+(?:\S+\s+){0,3}?(?:lache|pfütze|pfuetze|ölfleck|fleck)|(?<![а-яіїєґ])(?:бак|радіатор|радиатор|картер|мастил)\S*\s+(?:\S+\s+){0,2}?(?:тече|теч[еёу]т|протіка|підтіка|протека|подтека|капа)|(?:тече|теч[еёу]т|протіка|підтіка|протека|подтека)\S*\s+(?:\S+\s+)?(?:бак|радіатор|радиатор|картер)|(?:під|под)\s+(?:\S+\s+)?(?:вантажівк|машин|авто|тягач|грузовик|двигун|мотор|причіп|прицеп)\S*\s+(?:\S+\s+)?(?:калюж|луж)|(?<![a-zäöüß-])(?:diesel|kraftstoff|sprit)geruch|(?<![a-zäöüß-])riecht\s+(?:\S+\s+){0,2}?nach\s+(?:diesel|kraftstoff|sprit|treibstoff)|(?<![a-z-])(?:smell\S*|smells|smelling)\s+(?:\S+\s+){0,2}?(?:of\s+)?(?:diesel|fuel)(?![a-z])|(?<![а-яіїєґ])(?:пахне|пахнет|запах\S*)\s+(?:\S+\s+)?(?:дизел|пальн|солярк|топлив)\S*|(?<![a-zäöüß-])(?:kühler|kuehler|kühlwasser|kuehlwasser|kühlmittel|kuehlmittel|wasser|hydraulik|öl|oel|diesel|kraftstoff)schl(?:ä|ae|a)uch(?:e|es|s)?\s+(?:\S+\s+){0,2}?(?:geplatzt|geborsten|gerissen|abgerissen|abgesprungen|porös|poroes)(?![a-zäöüß])|(?<![a-z-])(?:coolant|radiator|hydraulic|fuel|oil)\s+(?:hose|pipe|line)s?\s+(?:\S+\s+)?(?:burst|split|ruptured|blew|came\s+off)(?![a-z])|(?<![а-яіїєґ])(?:патруб\S*|шланг\S*\s+(?:радіатор|радиатор|охолодж|охлажд|гідравл|гидравл|пальн|палив|топлив|олив|масл)\S*)\s+(?:\S+\s+)?(?:лопну|прорва|порва|розірва|зірва|сорва)\S*/i;
// Backlog 301 (Blickwinkel „Auflieger beim Kunden beschädigt (Rampe, Stapler)“): Schaden an der Laderampe bzw. durch einen Stapler →
// Hinweise (vor Ort mit dem Verantwortlichen ansehen und auf Lieferschein/Frachtbrief vermerken und gegenzeichnen lassen, Firma/Tor/Uhrzeit
// notieren und Kontakt an die Leitung, Fotos, Leitung anrufen und kein Schuldanerkenntnis unterschreiben, „nicht fahrbereit“ wenn Licht/
// Bremsen/Reifen/Türen/Ladungssicherung betroffen) – reine Information, keine Frist. „Mitnahmestapler defekt“, „Stapler-Halterung lose“,
// „Kunde hat angerufen“, „Ladebordwand defekt“, „forklift mount loose“, „customer complained“, „Клієнт телефонував“ lösen nichts aus
const CUSTDMG_HINT = /(?:stapler|hubwagen|flurförder)\S*\s+(?:\S+\s+){0,6}?(?:besch(?:ä|ae|a)digt|angefahren|gerammt|eingedrückt|aufgeschlitzt|aufgerissen|durchstoßen|getroffen|reingefahren|hineingefahren)|(?:besch(?:ä|ae|a)digt|angefahren|gerammt|eingedrückt|aufgeschlitzt|aufgerissen)\s+(?:\S+\s+){0,3}?(?:vom|von\s+(?:einem|dem)|durch\s+(?:einen|den))\s+(?:\S+\s+)?(?:gabel)?(?:stapler|hubwagen)|(?:beim|bei\s+(?:dem|einem))\s+kunden\s+(?:\S+\s+){0,6}?(?:besch(?:ä|ae|a)digt|angefahren|gerammt|eingedrückt|aufgeschlitzt)|(?:besch(?:ä|ae|a)digt|angefahren|gerammt|eingedrückt)\s+(?:\S+\s+){0,3}?(?:beim|bei\s+(?:dem|einem))\s+kunden|(?:an\s+der|an\s+die|gegen\s+die)\s+(?:lade)?rampe\s+(?:\S+\s+){0,3}?(?:gestoßen|angefahren|besch(?:ä|ae|a)digt|eingeklemmt|geknallt|gefahren)|(?:lade)?rampe\s+(?:\S+\s+){0,3}?(?:besch(?:ä|ae|a)digt|angefahren)|forklift\S*\s+(?:\S+\s+){0,6}?(?:damaged|hit|struck|pierced|punctured|ripped|dented|crashed)|(?:damaged|hit|struck|pierced|dented|ripped)\s+(?:\S+\s+){0,3}?by\s+(?:a\s+|the\s+)?(?:forklift|pallet\s+truck)|(?:at|by)\s+(?:the\s+)?customer\S*\s+(?:\S+\s+){0,6}?(?:damaged|hit|dented|struck)|(?:damaged|dented)\s+(?:\S+\s+){0,3}?at\s+(?:the\s+)?customer|(?:loading\s+)?(?:dock|ramp)\s+(?:\S+\s+){0,3}?(?:damaged|hit|dented)|(?:hit|reversed\s+into|backed\s+into)\s+(?:the\s+)?(?:loading\s+)?(?:dock|ramp)|(?:навантажувач|погрузчик|штабелер)\S*\s+(?:\S+\s+){0,6}?(?:пошкод|вдари|пробив|пробил|повред|удари|зачепив|зацепил)|(?:пошкод|повред)\S*\s+(?:\S+\s+){0,3}?(?:навантажувач|погрузчик)|(?:у|в)\s+клієнт\S*\s+(?:\S+\s+){0,6}?пошкод|(?:у|в)\s+клиент\S*\s+(?:\S+\s+){0,6}?повре(?:д|жд)|рамп\S*\s+(?:\S+\s+){0,3}?(?:пошкод|повред|вдари|удари)/i;
// [CLAUDE] Backlog 682 (30.10.2026, Blickwinkel „Ladungsschaden beim Kunden reklamiert“): Transport-/Ladungsschaden, Ware beschädigt/angetaut/abgelehnt,
// Empfänger reklamiert bzw. verweigert die Annahme, „unter Vorbehalt“ quittiert → Schritte (Vermerk auf Frachtbrief/Lieferschein, Fotos vor dem Entladen,
// Temperaturausdruck, Ware nicht eigenmächtig entsorgen/zurückfahren, Ursache am Fahrzeug beschreiben; Leitung) – reine Information, keine Frist.
// „Kunde hat angerufen“, „Ladung verrutscht“, „Rampe beim Kunden beschädigt“, „вантажівка пошкоджена“ (Lkw) nicht
const CARGO_HINT = /(?<![a-zäöüß])(?:transport|ladungs|waren|fracht|bruch|n(?:ä|ae)sse)schaden|(?<![a-zäöüß])(?:kunde|kundin|empf(?:ä|ae)nger|warenannahme|wareneingang)\s+(?:\S+\s+){0,4}?(?:reklamiert|reklamation|beanstandet|verweigert\s+(?:\S+\s+)?annahme|nimmt\s+(?:\S+\s+){0,2}?nicht\s+an|lehnt\s+(?:\S+\s+){0,2}?ab|hat\s+(?:\S+\s+){0,2}?abgelehnt|will\s+(?:\S+\s+){0,2}?nicht\s+annehmen)(?![a-zäöüß])|annahme\s+(?:\S+\s+)?verweigert|(?<![a-zäöüß])(?:ware|waren|ladung|lieferung|paletten?|g(?:ü|ue)ter|kartons?|fracht|packst(?:ü|ue)cke?|kühlware|tiefkühlware)\s+(?:\S+\s+){0,3}?(?:besch(?:ä|ae|a)digt|zerbrochen|zerdr(?:ü|ue)ckt|eingedr(?:ü|ue)ckt|verdorben|aufgetaut|angetaut|reklamiert|abgelehnt|nicht\s+angenommen|zur(?:ü|ue)ckgewiesen)(?![a-zäöüß])|(?:unter\s+vorbehalt|vorbehalt)\s+(?:\S+\s+){0,3}?(?:frachtbrief|cmr|lieferschein)|(?<![a-z])(?:cargo|goods|freight|load|shipment|pallets?)\s+(?:\S+\s+){0,3}?(?:damaged|broken|crushed|spoiled|thawed|rejected|refused)(?![a-z])|(?<![a-z])damaged\s+(?:\S+\s+)?(?:cargo|goods|freight|pallets?|shipment)|(?<![a-z])(?:customer|consignee|receiver)\s+(?:\S+\s+){0,3}?(?:rejected|refused|complained)|(?<![a-z])(?:cargo|freight)\s+claim|(?<![а-яіїєґё])(?:пошкоджен\S*|поврежден\S*|зіпсован\S*|испорчен\S*|бит\S*)\s+(?:\S+\s+)?(?:вантаж(?!івк)\S*|груз(?!овик)\S*|товар\S*)|(?<![а-яіїєґё])(?:вантаж(?!івк)\S*|груз(?!овик)\S*|товар\S*)\s+(?:\S+\s+){0,2}?(?:пошкоджен\S*|поврежден\S*|зіпсован\S*|испорчен\S*)|(?<![а-яіїєґё])(?:клієнт\S*|одержувач\S*|клиент\S*|получател\S*)\s+(?:\S+\s+){0,3}?(?:відмови\S*|отказа\S*|не\s+прийня\S*|не\s+принял\S*|рекламаці\S*|рекламаци\S*)/i;
// [CLAUDE] Backlog 685 (30.10.2026, Blickwinkel „Kennzeichen verloren, gestohlen oder unleserlich“): Kennzeichen/Nummernschild abgefallen, weg, gestohlen,
// abgeschraubt, verbogen/unleserlich, „kein Kennzeichen mehr dran“ → Schritte (Mangel am Fahrzeug, Leitung entscheidet über Weiterfahrt; gestohlen → Polizei, Aktenzeichen;
// unterwegs verloren → Ort notieren, nicht auf der Fahrbahn suchen, Fotos; Ersatz klärt die Leitung über die Zulassungsstelle, kein Schild eigenmächtig nachmachen) –
// reine Information, keine Frist. „Kennzeichen SZ-YC 5501, Spiegel kaputt“, „Kennzeichenbeleuchtung defekt“, „Kennzeichenhalter lose“, „number plate light broken“ nicht.
const NUMPLATE_HINT = /(?<![a-zäöüß])(?:(?:hintere|vordere)[snrm]?\s+)?(?:kfz-)?(?:kennzeichen(?:schild|tafel)?|nummernschild)(?:s|e|er|n|en)?\s+(?:(?:ist|sind|wurde|wurden|war|hinten|vorne|vorn|am|an|der|die|das|dem|den|vom|von|beim|bei|lkw|auflieger|aufliegers|anh(?:ä|ae)nger|anh(?:ä|ae)ngers|trailer|zugmaschine|sattelzug|komplett|ganz|unterwegs|w(?:ä|ae)hrend|fahrt|auf|autobahn|leider|heute|nacht|wohl|vermutlich|irgendwo|schon|total|stark|teilweise|mir|uns|beide|beiden|einfach|plötzlich|halb|mehr|über|in|letzter|letzte|seit|gestern)\s+){0,4}(?:verloren|abgefallen|runtergefallen|heruntergefallen|weg(?![a-zäöüß])|fehl(?:t|en)|gestohlen|geklaut|entwendet|abgeschraubt|abmontiert|abgerissen|abgebrochen|unleserlich|nicht\s+(?:mehr\s+)?(?:lesbar|da|dran)|verbogen|zerbrochen|gebrochen|gerissen|besch(?:ä|ae|a)digt|kaputt|zerkratzt)(?![a-zäöüß])|(?<![a-zäöüß])(?:verlorene|gestohlene|geklaute|fehlende|abgefallene|unleserliche|besch(?:ä|ae|a)digte|kaputte|verbogene|zerbrochene|abgeschraubte)[snrm]?\s+(?:(?:hintere|vordere)[snrm]?\s+)?(?:kfz-)?(?:kennzeichen(?:schild|tafel)?|nummernschild)(?:s|e|er|n|en)?(?![a-zäöüß])|(?<![a-zäöüß])kein(?:e|en)?\s+(?:(?:hinteres|vorderes)\s+)?(?:kfz-)?(?:kennzeichen(?:schild|tafel)?|nummernschild)(?:s|e|er|n|en)?\s+(?:mehr\s+)?(?:dran|am|an|drauf|vorhanden)(?![a-zäöüß])|(?:kennzeichen|nummernschild)(?:diebstahl|verlust)|(?<![a-z])(?:(?:rear|front)\s+)?(?:number|licen[cs]e|registration|reg)\s+plates?\s+(?:(?:is|are|was|were|has|have|been|got|on|the|rear|front|trailer|truck|our|my|both|just|completely|somehow|during|drive|while|driving)\s+){0,4}(?:lost|missing|gone|stolen|fell\s+off|came\s+off|fallen\s+off|come\s+off|broken|cracked|damaged|unreadable|illegible|bent|snapped)(?![a-z])|(?<![a-z])(?:lost|stole|took|missing|broken|damaged|stolen)\s+(?:the\s+|a\s+|my\s+|our\s+|both\s+)?(?:(?:rear|front|trailer)\s+)?(?:number|licen[cs]e|registration|reg)\s+plates?(?![a-z])|(?<![а-яіїєґё])(?:номерн\S*\s+знак\S*|номерн\S*\s+табличк\S*)\s+(?:\S+\s+){0,2}?(?:загуби\S*|загубл\S*|втрати\S*|втрачен\S*|потеря\S*|потерял\S*|відпа\S*|отпа\S*|відвали\S*|отвали\S*|вкрал\S*|вкрад\S*|украл\S*|украд\S*|зняли|сняли|відкрути\S*|открути\S*|немає|нема|нет(?![а-яіїєґё])|зник\S*|пропа\S*|зламал\S*|сломал\S*|пошкоджен\S*|поврежден\S*|не\s+чита\S*|нечитаб\S*)|(?<![а-яіїєґё])(?:номер(?:и|а)?)\s+(?:загуби\S*|загубл\S*|втрати\S*|втрачен\S*|потеря\S*|потерял\S*|відпа\S*|отпа\S*|відвали\S*|отвали\S*|вкрал\S*|вкрад\S*|украл\S*|украд\S*|зняли|сняли|відкрути\S*|открути\S*|немає|нема|нет(?![а-яіїєґё])|зник\S*|пропа\S*|зламал\S*|сломал\S*|пошкоджен\S*|поврежден\S*|не\s+чита\S*|нечитаб\S*)|(?<![а-яіїєґё])(?:загуби\S*|втрати\S*|потерял\S*|вкрали|украли|зняли|сняли|немає|нема|нет)\s+(?:\S+\s+){0,1}?(?:(?:номерн\S*\s+знак\S*|номерн\S*\s+табличк\S*)|(?:номер(?:и|а)?))(?![а-яіїєґё])(?!\s+(?:телефон|заявк|рахун|сч(?:е|ё)т|замовл|заказ|рейс|документ|договор|догов|накладн)\S*)/i;
// Backlog 685: erkennt die Meldung ein Kennzeichen, zählt „Kennzeichen abgefallen“ nicht zusätzlich als loses Teil (#loose) – andere lose Teile in derselben Meldung schon
const NUMPLATE_WORDS = /(?<![a-zäöüß])(?:kfz-)?(?:kennzeichen|nummernschild)(?:schild|tafel)?(?:s|e|er|n|en)?(?![a-zäöüß])|(?<![a-z])(?:number|licen[cs]e|registration|reg)\s+plates?(?![a-z])|(?<![а-яіїєґё])номерн\S*\s+(?:знак|табличк)\S*|(?<![а-яіїєґё])номер(?:и|а)?(?![а-яіїєґё])/gi;
// [CLAUDE] Backlog 688 (30.10.2026, Blickwinkel „Partikelfilter (DPF) voll – Regeneration nötig oder bricht ab“): Partikelfilter-/DPF-Anzeige, Filter voll/verstopft,
// Regeneration läuft nicht/bricht ab, Standregeneration → Schritte (Anweisung im Display/Betriebsanleitung, Leitung entscheidet; Standregeneration nur im Freien, nicht in der Halle
// oder über trockenem Gras – Abgase sehr heiß; Fotos/seit wann/Kurzstrecke; Auswahl „Kann das Fahrzeug fahren?“) – reine Information, keine Frist.
// „Partikelfilter laut Rechnung getauscht“, „DPF gereinigt“, „Partikelfilter regeneriert, alles ok“, „Luftfilter voll“ nicht.
const PFILTER_HINT = /(?<![a-zäöüß])(?:(?:diesel|ru(?:ß|ss))?partikelfilter|dpf|abgasnachbehandlung|abgasreinigung)(?:-|\s+)(?:(?:ist|sind|wurde|war|der|die|das|dem|den|im|am|beim|lkw|komplett|ganz|wohl|vermutlich|schon|wieder|st(?:ä|ae)ndig|dauernd|immer|seit|heute|gestern|leuchte|anzeige|symbol|lampe|meldet|meldung|zeigt|sagt|laut|display|muss|soll|sollte|m(?:ü|ue)sste|-)\s+){0,4}(?:voll|verstopft|zu(?![a-zäöüß])|beladen|leuchte\S*|warn\S*|symbol|fehler\S*|st(?:ö|oe)rung|defekt|regenerier(?!t(?![a-zäöüß]))\S*|regeneriert\s+(?:werden|nicht)|regeneration\S*|freibrenn\S*|brennt\s+(?:\S+\s+)?nicht\s+frei|an(?![a-zäöüß])|blinkt)(?![a-zäöüß])(?!\s+(?:\S+\s+)?(?:gereinigt|getauscht|erneuert|ersetzt|erledigt|behoben|repariert|erfolgreich|ok(?![a-zäöüß])|in\s+ordnung|cleaned|replaced|fixed|done))|(?<![a-zäöüß])(?:stand|park|zwangs)[\s-]?regeneration\S*|(?<![a-zäöüß])(?:regeneration|freibrennen)\s+(?:(?:des|vom|von|dem|der|filters?|partikelfilters?|dpf|l(?:ä|ae)uft|klappt|geht|ist|wird|wurde|immer|wieder|st(?:ä|ae)ndig|dauernd)\s+){0,3}(?:nicht|abgebrochen|bricht|fehlgeschlagen|n(?:ö|oe)tig|erforderlich|angefordert|startet\s+nicht|unm(?:ö|oe)glich)(?![a-zäöüß])|(?<![a-z])(?:dpf|(?:diesel\s+)?particulate\s+filter)\s+(?:(?:is|light|warning|lamp|symbol|on|the|keeps|says|always|again)\s+){0,3}(?:full|blocked|clogged|light|warning|fault|on|regen\S*|needs?)(?![a-z])(?!\s+(?:\S+\s+)?(?:gereinigt|getauscht|erneuert|ersetzt|erledigt|behoben|repariert|erfolgreich|ok(?![a-zäöüß])|in\s+ordnung|cleaned|replaced|fixed|done))|(?<![a-z])(?:parked|forced|manual|stationary)\s+regen(?:eration)?(?![a-z])|(?<![a-z])regen(?:eration)?\s+(?:(?:is|keeps|won['’]?t|will|not|does|doesn['’]?t|keeps)\s+){0,2}(?:fail\S*|stopping|abort\S*|start|work\S*|required|needed)(?![a-z])|(?<![а-яіїєґё])(?:сажов\S*|сажев\S*)\s+фільтр\S*|(?<![а-яіїєґё])(?:сажов\S*|сажев\S*)\s+фильтр\S*|(?<![а-яіїєґё])(?:фільтр|фильтр)\S*\s+(?:твердих\s+частинок|твердых\s+частиц)|(?<![а-яіїєґё])(?:дпф|сажовик\S*)|(?<![а-яіїєґё])регенерац\S*\s+(?:\S+\s+){0,2}?(?:не\s+проход\S*|не\s+запуска\S*|не\s+працю\S*|не\s+работа\S*|не\s+відбува\S*|не\s+происход\S*|перерива\S*|прерыва\S*|потрібн\S*|нужн\S*)/i;
// [CLAUDE] Backlog 690 (30.10.2026, Blickwinkel „Fahrer rutscht beim Absteigen aus – Trittstufe oder Haltegriff defekt“): Trittstufe/Aufstieg/Haltegriff/Leiter lose,
// abgebrochen, glatt/vereist; beim Absteigen ausgerutscht/gestürzt → Schritte (nicht benutzen bzw. nur mit festem Halt, Leitung entscheidet; Verletzung: Erste Hilfe/112, Vorgesetzte
// direkt informieren – Angaben zur Verletzung NICHT in die Meldung (Datensparsamkeit: Fahrzeugvorgang ist für Werkstatt sichtbar); Fotos/welche Stufe) – reine Information, keine Frist.
// „Trittstufe wieder befestigt“, „Stufe im Lager“, „Leitung informiert“, „Griff der Ladebordwand“ nicht. „Trittstufe abgerissen“ zählt nicht zusätzlich als loses Teil (STEP_WORDS).
const STEP_HINT = /(?<![a-zäöüß-])(?:aufstiegstritt|einstiegstritt|aufstiegsstufe|trittstufe|trittbrett|tritt|stufe|aufstieg|einstieg|einstiegsstufe|aufstiegsleiter|leiter|haltegriff|griffstange|einstiegsgriff|handlauf|griff)(?:e|en|n|s|es)?\s+(?:(?:ist|sind|wurde|war|der|die|das|am|an|beim|vom|fahrerseite|beifahrerseite|links|rechts|unten|oben|untere|obere|fahrerhaus|kabine|lkw|auflieger|anh(?:ä|ae)nger|komplett|ganz|total|sehr|extrem|stark|wieder|schon|seit|heute|gestern|morgens)\s+){0,3}(?:lose|locker|wackelt|wackeln|wackelig|abgebrochen|gebrochen|gerissen|verbogen|defekt|kaputt|fehlt|fehlen|abgerissen|glatt|rutschig|vereist|gl(?:ä|ae)tte|eingerissen)(?![a-zäöüß])(?!\s+(?:\S+\s+)?(?:wieder\s+fest|befestigt|repariert|getauscht|ersetzt|behoben|fixed|repaired))|(?<![a-zäöüß])(?:beim|bei[mn]?)\s+(?:ab|aus|ein|auf|runter|herunter|hoch)steigen\s+(?:\S+\s+){0,4}?(?:ausgerutscht|abgerutscht|weggerutscht|gest(?:ü|ue)rzt|gefallen|hingefallen|runtergefallen|heruntergefallen|abgest(?:ü|ue)rzt|umgeknickt)(?![a-zäöüß])|(?<![a-zäöüß])(?:aus|von)\s+(?:der|dem)\s+(?:kabine|fahrerhaus|lkw|auflieger|ladefl(?:ä|ae)che|stufe|trittstufe)\s+(?:\S+\s+){0,2}?(?:gest(?:ü|ue)rzt|gefallen|abgerutscht|ausgerutscht|abgest(?:ü|ue)rzt)(?![a-zäöüß])|(?<![a-z])(?<!next\s)(?<!first\s)(?<!last\s)(?:cab\s+)?(?:steps?|grab\s+handles?|handrails?|access\s+ladder|ladder)\s+(?:(?:is|are|on|the|driver['’]?s?|side|loose|very|completely)\s+){0,3}(?:loose|broken|bent|missing|wobbly|slippery|icy|cracked)(?![a-z])|(?<![a-z])(?:slipped|fell|fallen)\s+(?:\S+\s+){0,3}?(?:(?:getting|climbing|stepping)\s+(?:out|down|in|up)|(?:from|off)\s+(?:the\s+)?(?:cab|step|steps|truck|trailer|ladder))(?![a-z])|(?<![а-яіїєґё])(?:сходин\S*|підніжк\S*|подножк\S*|поручн\S*|поручен\S*|ручк\S*\s+(?:кабін|кабин)\S*)\s+(?:\S+\s+){0,2}?(?:зламан\S*|зламал\S*|сломан\S*|сломал\S*|відлама\S*|отлома\S*|відірва\S*|оторва\S*|хитає\S*|шатает\S*|болтає\S*|болтает\S*|розхита\S*|расшата\S*|слизьк\S*|скользк\S*|обледен\S*|відсутн\S*|отсутств\S*|погнут\S*|зігнут\S*)|(?<![а-яіїєґё])(?:посковзну\S*|поскользну\S*|впав|упал|упала|впала|зірвав\S*|сорвал\S*)\s+(?:\S+\s+){0,3}?(?:з\s+кабін\S*|с\s+кабин\S*|з\s+підніжк\S*|с\s+подножк\S*|виходячи|выходя|злазячи|слезая)/i;
const STEP_WORDS = /(?<![a-zäöüß-])(?:aufstiegstritt|einstiegstritt|aufstiegsstufe|trittstufe|trittbrett|tritt|stufe|aufstieg|einstieg|einstiegsstufe|aufstiegsleiter|leiter|haltegriff|griffstange|einstiegsgriff|handlauf|griff)(?:e|en|n|s|es)?(?![a-zäöüß])|(?<![a-z])(?:cab\s+)?(?:steps?|grab\s+handles?|handrails?|access\s+ladder|ladder)(?![a-z])|(?<![а-яіїєґё])(?:сходин|підніжк|подножк|поручн|поручен)\S*/gi;
// [CLAUDE] Backlog 731 (30.10.2026, Blickwinkel „Jemand verletzt sich bei der Arbeit am Fahrzeug – Be-/Entladen, Kuppeln, Plane, Ladebordwand“): Arbeits-/Betriebsunfall,
// „verletzt“, Quetschung/Schnittwunde, Körperteil eingeklemmt/gequetscht, Person von Ladefläche/Auflieger gestürzt; EN/UK/RU → eigene Schritte (Erste Hilfe/Notruf,
// Gefahrenstelle sichern, Vorgesetzte direkt informieren, Verletzte fahren nicht weiter; KEINE Angaben zur Verletzung/Gesundheit/Namen in die Meldung – Werkstatt sieht sie;
// nur Fahrzeug-/Ausrüstungsmangel mit Fotos; Auswahl „Weiß nicht“) – reine Information, keine Frist. Verneinungen („niemand verletzt“, „keine Verletzten“, „no one injured“,
// „ніхто не травмувався“), Reifen-/Lack-„Verletzung“, „Verletzungsgefahr“, „Palette vom Auflieger gefallen“ lösen nichts aus. Ein Verkehrsunfall mit Verletzten bleibt bei den
// Unfall-Schritten (INJURY_WORDS wird vor ACC_HINT entfernt: „Arbeitsunfall“ ist kein Verkehrsunfall); Sturz beim Absteigen bleibt bei Trittstufe (STEP_HINT).
const INJURY_HINT = /(?<![a-zäöüß-])(?:arbeits|betriebs)unf(?:ä|ae|a)ll\S*|(?<![a-z])(?:work(?:place)?|industrial|occupational)\s+(?:accident|injury)|(?<![a-z])accident\s+at\s+work|(?<![а-яіїєґё])(?:нещасн\S*\s+випад\S*|несчастн\S*\s+случа\S*|виробнич\S*\s+травм\S*|производствен\S*\s+травм\S*)|(?<![^.;!?\n]*(?:reifen|flanke|lauffl|karkasse|lack|tyre|tire|шин|покришк|покрышк)[^.;!?\n]*)(?![^.;!?\n]*(?:reifen|flanke|lauffl|karkasse|lack|tyre|tire|шин|покришк|покрышк))(?<!(?:niemand|keiner|keine|kein|nicht|nichts|ohne|nobody|no\s+one|noone|not|no|never|without|ніхто\s+не|никто\s+не|не|без)\s+(?:\S+\s+){0,2})(?<![a-zäöüß-])(?:verletzt|verletzte|verletzten|verletzter|verletzung|verletzungen|quetschung|schnittwunde|platzwunde|prellung|verstaucht|umgeknickt)(?![a-zäöüß])|(?<![^.;!?\n]*(?:reifen|flanke|lauffl|karkasse|lack|tyre|tire|шин|покришк|покрышк)[^.;!?\n]*)(?![^.;!?\n]*(?:reifen|flanke|lauffl|karkasse|lack|tyre|tire|шин|покришк|покрышк))(?<!(?:niemand|keiner|keine|kein|nicht|nichts|ohne|nobody|no\s+one|noone|not|no|never|without|ніхто\s+не|никто\s+не|не|без)\s+(?:\S+\s+){0,2})(?<![a-z])(?:injured|injury|injuries|hurt\s+(?:my|his|her|their|him|himself|herself|myself|themselves)|bleeding|sprained)(?![a-z])|(?<!(?:niemand|keiner|keine|kein|nicht|nichts|ohne|nobody|no\s+one|noone|not|no|never|without|ніхто\s+не|никто\s+не|не|без)\s+(?:\S+\s+){0,2})(?<![а-яіїєґё])(?:травм\S*|травмув\S*|травмир\S*|поранив\S*|поранен\S*|поранил\S*|ранен\S*|забив\S*\s+(?:руку|ногу|голов\S*|палець|палец)|ушиб\S*)|(?<![a-zäöüß-])(?:finger|fingern|hand|h(?:ä|ae)nde|fu(?:ß|ss)|f(?:ü|ue)(?:ß|ss)e|arm|arme|bein|beine|kopf|knie|zeh|zehe|zehen|daumen|auge|augen|schulter|handgelenk|kn(?:ö|oe)chel|gesicht)\s+(?:\S+\s+){0,4}?(?:eingeklemmt|geklemmt|eingequetscht|gequetscht|geschnitten|aufgeschnitten|gebrochen|verbrannt|ver(?:ä|ae)tzt|verdreht|gesto(?:ß|ss)en|angeschlagen)(?![a-zäöüß])|(?<![a-z])(?:finger|fingers|hand|hands|foot|feet|arm|arms|leg|legs|head|knee|back|toe|toes|thumb|eye|eyes|shoulder|wrist|ankle|face)\s+(?:\S+\s+){0,3}?(?:trapped|crushed|caught|jammed|cut|broken|burned|burnt|pinched)(?![a-z])|(?<![a-z])(?:trapped|crushed|jammed|cut|pinched|broke)\s+(?:my|his|her|their|a)\s+(?:finger|fingers|hand|hands|foot|feet|arm|arms|leg|legs|head|knee|back|toe|toes|thumb|eye|eyes|shoulder|wrist|ankle|face)(?![a-z])|(?<![а-яіїєґё])(?:защеми\S*|прищеми\S*|затисну\S*|зажал\S*|зажало|порізав\S*|порезал\S*|придави\S*|придавил\S*)\s+(?:\S+\s+){0,2}?(?:пал\S*|рук\S*|ног\S*|кист\S*|ступн\S*)|(?<![a-zäöüß-])(?:ich|bin|fahrer|fahrerin|kollege|kollegin|er|sie|jemand|person|mitarbeiter|mitarbeiterin|beifahrer|beifahrerin|lagerist|staplerfahrer)\s+(?:\S+\s+){0,5}?(?:gest(?:ü|ue)rzt|hingefallen|runtergefallen|heruntergefallen|abgest(?:ü|ue)rzt|abgerutscht|ausgerutscht|gefallen)(?![a-zäöüß])|(?<![a-z])(?:i|driver|colleague|he|she|someone|worker|co-driver)\s+(?:\S+\s+){0,3}?(?:fell|has\s+fallen|slipped)\s+(?:off|from)\s+(?:the\s+)?(?:trailer|truck|deck|bed|tail\s*lift|loading\s+dock|ramp|platform|load)(?![a-z])|(?<![а-яіїєґё])(?:впав|впала|упав|упала|упал|зірвав\S*|сорвал\S*)\s+(?:\S+\s+){0,2}?(?:з|с|зі|со)\s+(?:причеп\S*|прицеп\S*|кузов\S*|платформ\S*|рамп\S*|гідроборт\S*|гидроборт\S*|напівпричеп\S*|полуприцеп\S*|даху|крыши|тенту|тента|вантаж\S*|груз\S*)/i;
const INJURY_WORDS = /(?<![a-zäöüß-])(?:arbeits|betriebs)unf(?:ä|ae|a)ll\S*|(?<![a-zäöüß-])unfall\s+(?:beim|bei\s+der|bei\s+dem|w(?:ä|ae)hrend\s+(?:der|des|dem))\s+(?:\S+\s+)?(?:arbeit|(?:ab|be|ent|auf|um|ver)?laden|ladung|(?:ab|an|auf)?kuppeln|(?:ab|auf)?planen|sichern|zurren)\S*|(?<![a-z])(?:work(?:place)?|industrial|occupational)\s+accident|(?<![a-z])accident\s+(?:at\s+work|while\s+(?:un)?loading|during\s+(?:un)?loading)/gi;
// [CLAUDE] Backlog 735 (30.10.2026, Blickwinkel „Schranke, Poller, Laterne, Zaun, Verkehrsschild oder Leitplanke angefahren – fremde Sache beschädigt“):
// eigene Schritte (anhalten und sichern, Gefahr durch den Gegenstand melden, nicht ohne Meldung weiterfahren – Eigentümer/Betreiber bzw. Polizei,
// Zettel reicht nicht, Fotos/Ort/Ansprechstelle, kein Schuldanerkenntnis, Auswahl „Kann das Fahrzeug fahren?“) statt der allgemeinen Unfall-Hinweise;
// Wildunfall, Unfallflucht, Brückenanprall und Schaden beim Kunden gehen vor. „Rolltor“, „Seitenwand“, „Kennzeichenschild“, „Mast vom Kran“,
// „Schranke geht nicht auf“, „Schranke ist auf den Auflieger gefallen“, Bordstein, Verneinungen lösen nichts aus – reine Information, keine Frist.
const FIXOBJ_HINT = /(?<![a-zäöüß-])(?<!(?:kein|keine|keinen|ohne)\s+)(?:schranke|poller|(?:stra(?:ß|ss)en)?laterne|laternen(?:pfahl|mast)|(?:licht|strom|beleuchtungs|ampel)mast|leitpfosten|absperrpfosten|pfosten|pfahl|z(?:a|ä|ae)un|(?:verkehrs|stra(?:ß|ss)en|park)?schild|schilder|verkehrszeichen|(?:leit|schutz)planke|(?:baustellen)?absperrung|bake|ampel|(?:zapf|tank)s(?:ä|ae)ule|(?:hof|hallen|einfahrts|garagen|werks|firmen|grundst(?:ü|ue)cks)?tor|toreinfahrt|mauer|(?:haus|hallen|geb(?:ä|ae)ude)wand|hausecke|geb(?:ä|ae)ude|vordach|carport|(?:strom|verteiler|schalt)kasten|hydrant|briefkasten|fahrradst(?:ä|ae)nder|park(?:schein)?automat|wartenh(?:ä|ae)uschen|wareh(?:ä|ae)uschen|blumenk(?:ü|ue)bel)(?:n|en|e|s|es|er)?(?![a-zäöüß])(?!\s+(?:hat|ist|fiel|fällt|faellt|ging|kam|war)(?![a-zäöüß]))\s+(?:(?!nicht\s|kein)\S+\s+){0,3}?(?:angefahren|umgefahren|weggefahren|abgefahren|gestreift|touchiert|gerammt|mitgenommen|erwischt|umgeknickt|umgerissen|abgerissen|eingedr(?:ü|ue)ckt|verbogen|besch(?:ä|ae|a)digt|kaputt\s?gefahren|demoliert)(?![a-zäöüß])|(?<![a-zäöüß-])(?:gegen|in|an)\s+(?:den|die|das|einen|eine|ein|dem|der)?\s*(?:\S+\s+)?(?:schranke|poller|(?:stra(?:ß|ss)en)?laterne|laternen(?:pfahl|mast)|(?:licht|strom|beleuchtungs|ampel)mast|leitpfosten|absperrpfosten|pfosten|pfahl|z(?:a|ä|ae)un|(?:verkehrs|stra(?:ß|ss)en|park)?schild|schilder|verkehrszeichen|(?:leit|schutz)planke|(?:baustellen)?absperrung|bake|ampel|(?:zapf|tank)s(?:ä|ae)ule|(?:hof|hallen|einfahrts|garagen|werks|firmen|grundst(?:ü|ue)cks)?tor|toreinfahrt|mauer|(?:haus|hallen|geb(?:ä|ae)ude)wand|hausecke|geb(?:ä|ae)ude|vordach|carport|(?:strom|verteiler|schalt)kasten|hydrant|briefkasten|fahrradst(?:ä|ae)nder|park(?:schein)?automat|wartenh(?:ä|ae)uschen|wareh(?:ä|ae)uschen|blumenk(?:ü|ue)bel)(?:n|en|e|s|es|er)?(?![a-zäöüß])\s+(?:(?!nicht\s)\S+\s+){0,2}?(?:gefahren|gesto(?:ß|ss)en|geknallt|geprallt|gerutscht|gerollt|gesetzt|zur(?:ü|ue)ckgesetzt|gekracht)(?![a-zäöüß])|(?<![a-zäöüß-])(?:habe|hab|haben|hat)\s+(?:(?!nicht\s|kein)\S+\s+){0,4}?(?:eine?n?|die|den|das)\s+(?:\S+\s+)?(?:schranke|poller|(?:stra(?:ß|ss)en)?laterne|laternen(?:pfahl|mast)|(?:licht|strom|beleuchtungs|ampel)mast|leitpfosten|absperrpfosten|pfosten|pfahl|z(?:a|ä|ae)un|(?:verkehrs|stra(?:ß|ss)en|park)?schild|schilder|verkehrszeichen|(?:leit|schutz)planke|(?:baustellen)?absperrung|bake|ampel|(?:zapf|tank)s(?:ä|ae)ule|(?:hof|hallen|einfahrts|garagen|werks|firmen|grundst(?:ü|ue)cks)?tor|toreinfahrt|mauer|(?:haus|hallen|geb(?:ä|ae)ude)wand|hausecke|geb(?:ä|ae)ude|vordach|carport|(?:strom|verteiler|schalt)kasten|hydrant|briefkasten|fahrradst(?:ä|ae)nder|park(?:schein)?automat|wartenh(?:ä|ae)uschen|wareh(?:ä|ae)uschen|blumenk(?:ü|ue)bel)(?:n|en|e|s|es|er)?(?![a-zäöüß])\s+(?:\S+\s+){0,1}?(?:angefahren|umgefahren|weggefahren|abgefahren|gestreift|touchiert|gerammt|mitgenommen|erwischt|umgeknickt|umgerissen|abgerissen|eingedr(?:ü|ue)ckt|verbogen|besch(?:ä|ae|a)digt|kaputt\s?gefahren|demoliert)(?![a-zäöüß])|(?<![a-z-])(?:hit|struck|clipped|knocked\s+(?:down|over)|ran\s+(?:into|over)|reversed\s+into|backed\s+into|drove\s+into|crashed\s+into|bumped\s+into|scraped|damaged|took\s+out)\s+(?:a|an|the|some|someone['’]?s|their|his|her)?\s*(?:\S+\s+)?(?:barriers?|barrier\s+(?:arm|gate)|bollards?|lamp\s?posts?|street\s?lights?|street\s?lamps?|light\s+poles?|(?:sign\s?)?posts?|poles?|fences?|(?:road|traffic|street)\s+signs?|signs?|guard\s?rails?|crash\s+barriers?|traffic\s+lights?|(?:fuel|petrol|diesel|gas)\s+pumps?|gates?|walls?|bus\s+shelters?|hydrants?|bins?)(?![a-z])|(?<![а-яіїєґ])(?:врізав(?:ся)?|врізалас[яь]|врезал(?:ся|ась)|зачепив|зачепила|задел|задела|збив|збила|сбил|сбила|пошкодив|пошкодила|повредил|повредила|наїхав\s+на|наїхала\s+на|наехал\s+на|наехала\s+на|в['’ʼ]?їхав\s+в|въехал\s+в)\s+(?:\S+\s+)?(?:шлагбаум|стовп|стовпчик|столб|ліхтар|фонар|паркан|огорож|огради|забор|дорожн\S*\s+знак|знак|відбійник|отбойник|світлофор|светофор|(?:паливн|заправн|топливн)\S*\s+колонк|колонк|ворот|стін|стен|будинк|здани)\S*/i;
// Backlog 302 (Blickwinkel „Rauch oder Brandgeruch aus dem Motorraum“): Rauch/Brand/Schmorgeruch am Fahrzeug → Hinweise (sicher anhalten,
// Motor aus, alle raus, Abstand, Notruf; löschen nur ohne Gefahr und unterwiesen, Haube/Kabine nicht weit öffnen, Gefahrgut-Papiere für die
// Feuerwehr; danach Leitung, Stelle/Farbe/Geruch notieren; „Kritisch“ + „nicht fahrbereit“) – reine Information, keine Frist, keine Nummer.
// „Feuerlöscher abgelaufen“, „Rauchen verboten“, „Nichtraucher“, „Abblendlicht brennt nicht“, „Motorkontrollleuchte brennt“, „Rauch aus dem
// Auspuff“, „fire extinguisher missing“, „no smoking“, „Загорівся індикатор двигуна“, „Фара не горить“ lösen nichts aus
// Backlog 351: „aus dem Auspuff kommt Rauch“ → Motor-Hinweis, nicht Brand; ukrainisch „з вихлопної труби дим“ ebenso
// Backlog 349: auch „riecht verbrannt/verschmort“, „riecht nach Gas“, „Gasgeruch“, „smells burnt“, „пахне гаром“
// Backlog 582: Umschrift „pozhar“, „dym iz motora“
const FIRE_HINT = /(?<![a-z])pozh[ae]r(?:a|u|e|om)?(?![a-z])|(?<![a-z])dym\s+(?:iz|z)\s+|(?<![a-zäöüß])(?<!auspuff\s+(?:kommt|kommen|steigt|steigen|qualmt\s+es|raucht\s+es)\s+(?:\S+\s+){0,2}?)(?:rauch(?:entwicklung|wolke)?|raucht|qualm|qualmt)(?![a-zäöüß])(?!\s+(?:\S+\s+){0,3}?(?:auspuff|abgas))|brandgeruch|schmorgeruch|verschmort|(?:fahrzeug|kabel|motor|reifen|bremsen)brand|(?<![a-zäöüß])in\s+brand|(?<![a-zäöüß])flammen?(?![a-zäöüß])|(?<![a-zäöüß])feuer(?![a-zäöüß])|(?<![a-zäöüß])es\s+brennt|(?<![a-zäöüß])(?:motor|motorraum|reifen|rad|bremse|bremsen|kabine|fahrerhaus|fahrzeug|lkw|auflieger|anhänger|ladung|kabel|kühlaggregat)\s+brennt(?!\s+nicht)|(?<![a-z])smoke(?![a-z])(?!\s+(?:\S+\s+){0,3}?(?:exhaust|detector))|(?:engine|brakes?|wheel|tyre|tire|cab|truck|trailer)\s+(?:is\s+|was\s+)?smoking|burning\s+smell|smell\s+of\s+burning|on\s+fire|caught\s+fire|(?<![a-z])fire(?![a-z])(?!\s+extinguisher)|(?<![a-z])flames?(?![a-z])|(?<![а-яіїєґ])(?<!(?:вихлоп|выхлоп|глушник|глушител|труб)[а-яіїєґ]*\s+)(?:дим|диму|димом|дым|дыма|дымом|димить|дымит|димит|дымится)(?![а-яіїєґ])(?!\s+(?:\S+\s+)?(?:з|із|из)\s+(?:\S+\s+)?(?:вихлоп|выхлоп|глушник|глушител))|запах\S*\s+(?:\S+\s+)?(?:гар|горіл|горел|пален)|пожеж|пожар|(?:горить|горит|палає)\s+(?:двигун|мотор|колес|шин|кабін|кабин|авто|машин|вантажівк|причіп|прицеп|проводк)|(?:двигун|мотор|колесо|шина|кабіна|кабина|машина|вантажівка|проводка)\S*\s+(?:горить|горит|загорів|загорілас|загорел|палає)|(?<![a-zäöüß-])riecht\s+(?:\S+\s+){0,2}?(?:verbrannt|verschmort|angebrannt|nach\s+(?:verbranntem|verschmortem|gas|rauch))|(?<![a-zäöüß-])gasgeruch|(?<![a-z-])smells?\s+(?:\S+\s+)?(?:burnt|burned|of\s+gas)|(?<![а-яіїєґ])(?:пахне|пахнет)\s+(?:\S+\s+)?(?:гар\S*|горіл\S*|горел\S*|газ\S*)|(?<![a-zäöüß-])(?:bremse|bremsen|rad|r(?:ä|ae)der|reifen|nabe|trommel|trommeln)\s+(?:\S+\s+){0,2}?(?:rauchen|qualmen)(?![a-zäöüß])|(?<![a-zäöüß-])(?:stinkt|stinken|riecht|riechen)\s+(?:\S+\s+){0,2}?(?:verbrannt\S*|verschmort\S*|angebrannt\S*)|(?<![a-zäöüß-])verschmort(?:er|en|es)?\s+geruch/i;
// Backlog 303 (Blickwinkel „Kühlaggregat des Kühlaufliegers fällt unterwegs aus“): Störung am Kühlgerät → Hinweise (sofort Leitung/
// Disposition, Türen geschlossen halten; Display mit Ist-/Solltemperatur und Fehlercode fotografieren, Uhrzeit, Temperaturausdruck aufbewahren;
// nur unterwiesene einfache Prüfungen, nichts am Kältekreislauf öffnen; Ware und Liefertermin notieren – Umladen entscheidet die Disposition;
// Fahrbereitschaft „Eingeschränkt“, sonst „nicht fahrbereit“/„Weiß nicht“) – reine Information, keine Frist, keine Temperaturgrenze.
// „Kühlwasser läuft aus“, „Motortemperatur zu hoch“, „Klimaanlage kühlt nicht“, „Kühlaggregat Wartung fällig“, „Kühlschrank in der Kabine
// defekt“, „cab fridge broken“, „engine cooling fan broken“, „Кондиціонер не працює“, „Охолоджувальна рідина тече“ lösen nichts aus
const REEFER_HINT = /(?:k(?:ü|ue|u)hl(?:aggregat|ger(?:ä|ae|a)t|maschine|anlage)|k(?:ä|ae|a)lte(?:aggregat|maschine|anlage)|thermo\s*king|frigoblock|(?<![a-zäöüß])k(?:ü|ue|u)hlung|temperatur(?:schreiber|rekorder|recorder|drucker)|thermo(?:schreiber|drucker)|datenlogger|thermogra(?:ph|f))\S*\s+(?:\S+\s+){0,4}?(?:ausgefallen|f(?:ä|ae|a)llt\s+aus|aus(?![a-zäöüß])|defekt|kaput|alarm|st(?:ö|oe|o)rung|fehler|k(?:ü|ue|u)hlt\s+nicht|springt\s+nicht|startet\s+nicht|geht\s+nicht|l(?:ä|ae|a)uft\s+nicht|ausgegangen|zeigt\s+nichts|druckt\s+nicht)|(?:störung|ausfall|alarm)\s+(?:\S+\s+)?(?:kühlaggregat|kühlgerät|kühlmaschine|kälteaggregat|kühlung)|(?:laderaum|k(?:ü|ue|u)hlraum|k(?:ü|ue|u)hlkoffer|k(?:ü|ue|u)hlauflieger|k(?:ü|ue|u)hlware|tiefk(?:ü|ue|u)hlware)\S*\s+(?:\S+\s+){0,3}?(?:zu\s+warm|wird\s+warm|taut|aufgetaut)|temperatur\s+(?:im|in\s+der|in\s+dem|des)\s+(?:laderaum|k(?:ü|ue|u)hlraum|k(?:ü|ue|u)hlkoffer|auflieger|koffer)\S*\s+(?:\S+\s+)?(?:steigt|zu\s+hoch)|(?:reefer|fridge\s+unit|refrigeration(?:\s+unit)?|chiller|(?<!engine\s)cooling\s+unit|thermo\s*king|carrier\s+transicold|temperature\s+(?:recorder|printer)|thermo\s+printer|data\s*logger)\s+(?:\S+\s+){0,3}?(?:failed|failure|fault|broken|down|not\s+working|not\s+printing|stopped|alarm|won['’]?t\s+start|not\s+cooling)|(?:trailer|load|cargo)\s+(?:is\s+)?(?:getting\s+)?(?:too\s+)?warm|temperature\s+(?:\S+\s+)?rising\s+in\s+the\s+(?:trailer|load|box)|(?:холодильн|рефрижератор|реф(?![а-яіїєґ])|термописа|терморег[іи]стратор|ре[єе]стратор\s+температур|регистратор\s+температур|охолоджувальн\S*\s+установк|холодильная\s+установк)\S*\s+(?:\S+\s+){0,4}?(?:не\s+працю|не\s+работа|зламав|сломал|вийш\S*\s+з\s+ладу|выш\S*\s+из\s+строя|вимкну|выключ|не\s+охолоджу|не\s+охлажда|помилк|ошибк|аварі|авари|не\s+запуска|не\s+заводит)/i;
// Backlog 585 (Folge aus 580, Blickwinkel „Diktat/Tippfehler“): in allen Hinweis-Mustern gilt neben ä/ae, ö/oe, ü/ue auch der blanke Vokal
// („hangt“, „Kotflugel“, „uberhitzt“, „Tur“, „Schlussel“, „bemangelt“), dazu Rückspiegel, „Kotflügel lose/locker“, Polizei/BAG „Mängel“
// Backlog 586 (Folge aus 585, Stichprobe Ukrainisch/Russisch): „Не працює задній ліхтар“ (Verb zuerst), „Мастило тече“, „Сідло не закривається“,
// „Бортовий пристрій червоний“/„Toll Collect червоний“, „Поліція оштрафувала“, „Висить/Відірвався бризковик“
// Backlog 584 (Blickwinkel „Kühlauflieger“, Folge aus 583): auch ohne Umlaut/Tippfehler („Kuehlaggregat ausgefallen“, „Kuhlung kaput“),
// Temperaturschreiber/Datenlogger/Thermograph defekt bzw. zeigt/druckt nichts, „Temperatur im Laderaum steigt“, „temperature recorder broken“;
// „Temperaturschreiber geprüft“, „Kühlaggregat Wartung fällig“, „Temperatur im Laderaum ok“ lösen weiterhin nichts aus
// Backlog 304 (Blickwinkel „Bremsen ziehen schief, quietschen oder verlieren Druck“): Auffälligkeit an Bremse/Druckluft → Hinweise
// (Druckverlust/zischende Luft/weiches Pedal/schwache Bremswirkung: anhalten, Feststellbremse, Leitung – nicht weiterfahren; Schiefziehen/Geräusche:
// Weiterfahrt mit der Leitung klären; heiße Bremse nicht anfassen, nicht mit Wasser kühlen; Rad/Achse/Situation/Druckanzeige notieren + Foto;
// „nicht fahrbereit“ bzw. „Eingeschränkt“/„Weiß nicht“) – reine Information, keine Frist, kein Druckwert. „Bremsen neu gemacht“,
// „Bremsenprüfung fällig“, „Bremslicht defekt“, „Reifendruck niedrig“, „brake light out“, „brake check due“, „Стоп-сигнал не горить“ lösen nichts aus
// Backlog 580 (Blickwinkel „Diktat/Tippfehler“): vorn ergänzt – Schreibweisen ohne Umlaut, getrennt geschrieben, Tippfehler, Umschrift
// Backlog 709: Druckluft baut keinen bzw. nur langsam Druck auf („Kompressor baut keinen Druck auf“, „air pressure won’t build“, „тиск не набирається“) → Bremsen-Schritte
const BRAKE_HINT = /(?<![a-zäöüß])bremst\s+(?:(?:der|die|das|er|sie|es|seit|heute|gestern|bergab|beim|im|auf|nur|noch|fast|irgendwie|wieder|richtig|gar|ganz|sehr|zu|immer|schon|mehr)[,;]?\s+){0,3}(?:nicht|kaum|schlecht|schwach|schw(?:ä|ae|a)cher|ungleichm(?:ä|ae|a)(?:ß|ss)ig|einseitig)(?![a-zäöüß])(?!\s+(?:\S+\s+)?(?:rechtzeitig|ab(?![a-zäöüß])))|(?<![a-z])(?:(?:is|was|are)n['’]?t|not|barely|hardly)\s+braking(?![a-z])|(?<![a-z])(?:won['’]?t|doesn['’]?t|don['’]?t|does\s+not|will\s+not)\s+brake(?![a-z])(?!\s+(?:in\s+time|early))|(?<![a-z])brakes?\s+(?:badly|poorly|weakly)(?![a-z])|(?<![а-яіїєґ])(?:не|погано|слабо|ледве|плохо|еле)\s+(?:гальму(?:є|ють)|тормоз(?:ит|ят))(?![а-яіїєґ])|(?<![a-zäöüß])(?:(?:anh(?:ä|ae|a)nger|auflieger|trailer)[- ]?)?(?:ebs|abs)(?:-?(?:stecker|kabel|steckdose|leitung|system|anlage))?(?:-|(?![a-zäöüß])\s+(?:\S+\s+){0,2}?)(?:warnung|fehler\S*|st(?:ö|oe)rung|defekt|kaputt|ausgefallen|fault|warning|failure)(?![a-zäöüß])(?!\s+(?:\S+\s+)?(?:behoben|repariert|gel(?:ö|oe)scht|cleared|fixed))|(?<![a-zäöüß])brems(?:e|en)\s+(?:\S+\s+){0,2}?(?:quie?tsch\S*|kaput(?![a-zäöüß])|funktionier\S*\s+nicht|geht\s+(?:bis\s+)?(?:durch|zum\s+boden))|(?<![a-zäöüß])brems[\s-]*(?:belag|bel(?:ä|ae|a)ge|scheiben?|pedal)\S*\s+(?:\S+\s+){0,2}?(?:abgefahren|runter|gerissen|hat\s+(?:einen\s+)?riss|geht\s+(?:bis\s+)?(?:durch|zum\s+boden)|kaput\S*|defekt)|(?<![a-z])tormoz\S*\s+(?:\S+\s+){0,2}?(?:ne\s+(?:rabota|derzh)|slab|skrip|ploh)|(?<![a-zäöüß])(?:bremsen?|bremsscheibe\S*|bremsbel(?:ä|ae|a)g\S*|bremstrommel\S*|feststellbremse|handbremse|betriebsbremse|motorbremse|dauerbremse|retarder|intarder|bremspedal|bremswirkung|bremsdruck|vorratsdruck|druckluft|bremsleitung\S*)\s+(?:\S+\s+){0,3}?(?:zieht|quietsch\S*|schleif\S*|rubbel\S*|greift|greifen|weich|fest(?![a-zäöüß])|festgegangen|eingefroren|festgefroren|angefroren|zugefroren|friert\s+(?:\S+\s+)?fest|blockier\S*|heiß|heiss|stinkt|klemmt|löst\s+nicht|zisch\S*|verliert|fällt|schwach|nachl(?:ä|ae|a)(?:ss|ß)t|l(?:ä|ae|a)(?:ss|ß)t\s+nach|vibrier\S*|pulsier\S*|ungleichmäßig|einseitig|kein\s+druck|zu\s+wenig|niedrig|defekt|kaputt|ausgefallen|f(?:ä|ae|a)llt\s+aus|funktioniert\s+nicht|geht\s+nicht(?![a-zäöüß])|ohne\s+funktion|fehler\S*|st(?:ö|oe|o)rung)|zieht\s+(?:\S+\s+){0,3}?beim\s+bremsen|beim\s+bremsen\s+(?:\S+\s+){0,3}?(?:quietsch|schleif|rubbel|vibrier|zieht|ruckelt|geräusch|schlägt)|(?<![a-zäöüß])(?<!(?:reifen|rdks|tpms)\S*\s+(?:\S+\s+){0,2})(?:druck|luft)verlust(?!\s+(?:\S+\s+)?(?:am\s+|im\s+)?reifen)|(?:luft|druckluft)\s+(?:\S+\s+){0,2}?zisch|druckluftleitung\S*\s+(?:\S+\s+){0,2}?(?:undicht|leck|zisch\S*|geplatzt|abgerissen)|(?<![a-z])(?:brakes?(?![a-z])(?!\s+(?:lights?|lamps?))|brake\s+(?:pedal|pads?|discs?|drums?|pressure|lines?)|handbrake|parking\s+brake|air\s+(?:pressure|line|system|tanks?|reservoirs?)|retarder|intarder)\s+(?:\S+\s+){0,3}?(?:pull\S*|squeal\S*|squeak\S*|grind\S*|judder\S*|spongy|soft|stuck|seiz\S*|lock\S*|hot|smell\S*|hiss\S*|losing|lost|low|weak|fad\S*|vibrat\S*|not\s+working|failing|failed|drops?|dropping|faulty|fault|failure|broken|(?:doesn|isn|don|aren)['’]?t\s+work(?:ing)?)|pulls?\s+(?:\S+\s+){0,3}?when\s+braking|when\s+braking\s+(?:\S+\s+){0,3}?(?:squeal|grind|judder|vibrat|noise|pull)|(?:гальм|тормоз)\S*\s+(?:\S+\s+){0,3}?(?:примерз|замерз|змерз|тягн|тяне|тянет|вед[еу]|скрип|свист|скрегоч|скреж|м['’]?як|мягк|клин|заклин|гаряч|горяч|не\s+трима|не\s+держ|не\s+працю|не\s+работа|слаб|вібру|вибри|пахн|запах)|(?:тягне|веде|тянет|ведет)\s+(?:\S+\s+){0,2}?(?:при\s+гальмуванні|при\s+торможении)|(?:тиск|давлен)\S*\s+(?:\S+\s+){0,2}?(?:повітр|воздух)\S*\s+(?:\S+\s+)?(?:пада|низьк|низк)|(?:повітр|воздух)\S*\s+(?:\S+\s+)?(?:шипить|шипит|свистить|травить|травит)|(?<![a-zäöüß])(?:luftdruck|bremsdruck|vorratsdruck|systemdruck|druck)\s+(?:\S+\s+){0,2}?baut\s+sich\s+(?:\S+\s+)?nicht\s+(?:mehr\s+|richtig\s+)?auf|(?<![a-zäöüß])(?<!(?:k(?:ü|ue|u)hlaggregat\S*|aggregat\S*|klima|klimaanlage|k(?:ü|ue|u)hlung|kühlauflieger\S*)\s)(?:druckluft|luft)?kompressor(?![^.,;]*(?:k(?:ü|ue|u)hl|klima|aggregat))\s+(?:\S+\s+){0,2}?(?:l(?:ä|ae|a)uft\s+(?:\S+\s+)?(?:dauernd|st(?:ä|ae|a)ndig|durch|ununterbrochen|permanent)|pumpt\s+(?:\S+\s+)?nicht|f(?:ö|oe|o)rdert\s+(?:\S+\s+)?nicht)|(?<![a-zäöüß])(?:druckluft|luft)kompressor\s+(?:\S+\s+){0,2}?(?:defekt|kaputt|ausgefallen|geht\s+nicht)|(?<![a-z])air\s+pressure\s+(?:\S+\s+)?(?:not\s+building|won['’]?t\s+build|doesn['’]?t\s+build|isn['’]?t\s+building)|(?<![a-z])(?<!(?:reefer|fridge|unit|a\/c|ac|aircon|conditioning)\s)(?:air\s+)?compressor(?![^.,;]*(?:reefer|fridge|a\/c|air\s*con|cool))\s+(?:\S+\s+){0,2}?(?:running\s+(?:constantly|continuously|non-?stop|all\s+the\s+time)|not\s+pumping)|(?<![a-z])air\s+compressor\s+(?:\S+\s+){0,2}?(?:broken|faulty|failed|not\s+working)|(?:тиск|давлен)\S*\s+(?:\S+\s+){0,2}?(?:не\s+набира\S*|не\s+накачу\S*|не\s+підніма\S*|не\s+поднима\S*)|(?<![а-яіїєґ])(?:компресор|компрессор)\S*(?![^.,;]*(?:холод|кондиц|рефриж))\s+(?:\S+\s+){0,2}?(?:працює\s+постійно|постійно\s+працює|постоянно\s+работает|работает\s+постоянно|не\s+кача\S*|не\s+накачу\S*)|(?<![a-zäöüß-])(?:lufttrockner|lufttrockenpatrone|lufttrocknerpatrone|druckregler|vierkreisschutzventil|mehrkreisschutzventil)\s+(?:\S+\s+){0,3}?(?:bl(?:ä|ae|a)st\s+(?:\S+\s+)?ab|zisch\S*|undicht|defekt|kaputt|ausgefallen|vereist|eingefroren)(?![a-zäöüß])|(?<![a-z-])air\s+dryer\s+(?:\S+\s+){0,2}?(?:keeps\s+)?(?:purging|blowing(?:\s+off)?|hissing|leaking|faulty|broken|frozen)(?![a-z])|(?<![а-яіїєґ])(?:осушувач|осушител)\S*\s+(?:повітря\s+|воздуха\s+)?(?:\S+\s+)?(?:скида\S*|сбрасыва\S*|шипить|шипит|не\s+працю\S*|не\s+работа\S*|замерз\S*)|(?<![a-zäöüß-])(?:luft|druckluft|bremsluft|brems|versorgungs|kupplungs)schl(?:ä|ae|a)uch(?:e|es|s)?\s+(?:\S+\s+){0,3}?(?:undicht|leck(?![a-zäöüß])|zisch\S*|geplatzt|geborsten|gerissen|abgerissen|abgesprungen|porös|poroes|defekt|kaputt)|(?<![a-zäöüß-])(?:luft|brems)leitung(?:en)?\s+(?:\S+\s+){0,2}?(?:undicht|leck(?![a-zäöüß])|zisch\S*|geplatzt|gerissen|abgerissen)|(?<![a-z-])(?:air|brake|suzie|susie)\s+(?:hoses?|lines?|coils?)\s+(?:\S+\s+)?(?:burst|split|leak\S*|hiss\S*|ruptured|torn|came\s+off|ripped)(?![a-z])|(?<![а-яіїєґ])(?:повітрян|воздушн|гальмівн|тормозн)\S*\s+(?:шланг|магістрал|трубк)\S*\s+(?:\S+\s+)?(?:лопну|прорва|порва|розірва|зірва|сорва|трав|шипит|шипить|пропуска)\S*|(?<![a-zäöüß-])(?:luftkessel|druckluftkessel|luftbeh(?:ä|ae|a)lter|druckluftbeh(?:ä|ae|a)lter|drucklufttank|lufttank|druckluftanlage|luftanlage)(?:s|n)?\s+(?:\S+\s+){0,3}?(?:eingefroren|zugefroren|festgefroren|vereist|vol(?:l|ler)\s+wasser|undicht|zisch\S*)|(?<![a-zäöüß-])(?:kondens)?wasser\s+(?:\S+\s+)?im\s+(?:drucklufttank|lufttank|luftkessel|druckluftkessel|luftbeh(?:ä|ae|a)lter|druckluftbeh(?:ä|ae|a)lter|druckluftsystem|bremssystem)|(?<![a-z-])(?:brakes?|air\s+(?:tanks?|reservoirs?|lines?|system))\s+(?:\S+\s+){0,2}?frozen(?![a-z])|(?<![a-zäöüß-])(?:druckluft\S*|luftanlage|kompressor|luftpresser|bremsdruck|vorratsdruck|luftdruck|druck|luft)\s+(?:\S+\s+){0,3}?(?:baut|bauen|baute)\s+(?:sich\s+)?(?:\S+\s+){0,2}?(?:kein(?:en)?|nicht|kaum|nur\s+(?:sehr\s+)?langsam|zu\s+langsam)\s+(?:\S+\s+){0,2}?auf(?![a-zäöüß])|(?<![a-zäöüß-])(?:baut|bauen|baute)\s+(?:sich\s+)?(?:kein(?:en)?|nicht\s+genug|zu\s+wenig)\s+(?:luft|brems|vorrats)druck\s+(?:mehr\s+)?auf(?![a-zäöüß])|(?<![a-zäöüß-])kein(?:en)?\s+(?:luft|brems|vorrats)?druck(?:aufbau)?\s+(?:\S+\s+){0,2}?(?:im|in\s+der|am)\s+(?:druckluft\S*|luftkessel\S*|bremssystem|luftanlage)|(?<![a-z])(?:air(?:\s+pressure)?|pressure|compressor)\s+(?:\S+\s+){0,3}?(?:won['’]?t|doesn['’]?t|does\s+not|not|isn['’]?t|is\s+not|never)\s+(?:\S+\s+)?build(?:ing)?(?:\s+up)?|not\s+building\s+(?:up\s+)?(?:air\s+)?pressure|(?:тиск|давлен)\S*\s+(?:\S+\s+){0,2}?не\s+(?:набира|накачу|піднім|подніма)|(?<![a-zäöüß-])(?:betriebs)?bremse(?:n)?(?![^.;!?]*(?:repariert|getauscht|erneuert|behoben|gewechselt|wieder\s+in\s+ordnung|fixed|repaired|replaced|відремонт\S*|замінен\S*|отремонт\S*|заменен\S*))\s+(?:(?:sind|ist|waren|war|vorne|hinten|links|rechts|am|vom|auflieger|anh(?:ä|ae|a)nger|wohl|komplett|total|stark|extrem|sehr|nach|der|bergab(?:fahrt)?|im|gef(?:ä|ae)lle)\s+){0,3}(?:(?:ü|ue)berhitzt|gl(?:ü|ue)ht|gl(?:ü|ue)hen|riecht|riechen|stinkt|stinken|l(?:ä|ae)sst\s+(?:\S+\s+)?nach|lassen\s+(?:\S+\s+)?nach|fading)(?![a-zäöüß])|(?<![a-z])brakes?\s+(?:(?:are|is|were|was|very|really|on\s+the\s+trailer)\s+){0,2}(?:overheat\S*|glowing|fading|smell\S*|hot)(?![a-z])|(?<![а-яіїєґё])(?:гальм\S*|тормоз\S*)\s+(?:\S+\s+)?(?:перегрі\S*|перегре\S*|смерд\S*|воня\S*)/i;
// Backlog 305 (Blickwinkel „Plane des Aufliegers gerissen, Ladung nass“): Schaden an Plane/Aufbau oder nasse Ladung → Hinweise (anhalten,
// Ladung/Sicherung prüfen, nicht auf Dach oder Ladung klettern; Leitung/Disposition klärt mit dem Kunden; Fotos + Stelle/seit wann/Ladung nass;
// beim Kunden auf nasse Ware hinweisen und auf Lieferschein/Frachtbrief vermerken lassen; Fahrbereitschaft je nach Ladung) – reine Information,
// keine Frist. „Werkstatttermin planen“, „Reparatur planen, Spiegel kaputt“, „Dach undicht, Wasser tropft ins Fahrerhaus“, „Planenspanner fehlt“,
// „Ladung verrutscht“, „roof leaks into the cab“, „sheet metal damaged“, „Штора в кабіні порвана“ lösen nichts aus
// Backlog 634: Beschreibung nennt den Auflieger/Anhänger bzw. die Plane (nicht „Anhängerkupplung“/„Aufliegerkupplung“ – die sitzt an der Zugmaschine)
// Backlog 640 (Blickwinkel „Fremder Auflieger vom Kunden“): fremder/Kunden-Auflieger genannt → kein Hinweis auf den eigenen gekoppelten Auflieger
const FOREIGN_TRAILER = /kunde|kundin|fremd|customer|client|third[\s-]party|клієнт|замовник|чуж|заказчик|клиент/i;
const TRAILER_DMG = /(?<![a-zäöüß])(?:auflieger|anhänger|anhaenger|sattelauflieger)(?!kupplung)|(?<![a-zäöüß])plane(?![a-zäöüß])|(?<![a-z])(?:trailer|curtain|tarp(?:aulin)?)(?!\s*(?:hitch|coupling))(?![a-z])|(?<![а-яіїєґ])(?:напівпричеп|полуприцеп|причіп|причеп|прицеп(?!н)|тент)/i;
const TARP_HINT = /(?<![a-zäöüß])(?:plane|seitenplane|dachplane|schiebeplane|planenaufbau|planenverdeck|schiebeverdeck|verdeck)(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:klemm(?:t|en)|geht\s+nicht\s+(?:auf|zu)(?![a-zäöüß])|l(?:ä|ae|a)(?:ss|ß)t\s+sich\s+nicht\s+(?:\S+\s+)?(?:(?:ö|oe)ffnen|schlie(?:ß|ss)en|schieben|zuziehen)|gerissen|eingerissen|zerrissen|aufgerissen|kaputt|besch(?:ä|ae|a)digt|löchrig|hat\s+(?:ein\s+)?loch|flattert|lose|aufgeschlitzt|aufgeschnitten|zerschnitten|eingeschnitten|weggeflogen|undicht|h(?:ä|ae|a)ngt\s+(?:\S+\s+)?raus)|(?:loch|riss)\s+in\s+der\s+(?:\S+\s+)?plane|(?:ladung|ware|paletten?)\s+(?:\S+\s+){0,2}?(?:nass|durchnässt|feucht)(?![a-zäöüß])|wasser\s+(?:\S+\s+){0,2}?(?:im|in\s+den)\s+(?:laderaum|auflieger|anhänger|koffer)|(?<![a-z])(?:curtain|tarp(?:aulin)?|canvas|trailer\s+roof)\s+(?:\S+\s+){0,3}?(?:torn|ripped|tear|hole|flapping|loose|damaged|slashed|cut|leaking|leaks)|(?:hole|tear|rip)\s+in\s+the\s+(?:curtain|tarp|trailer\s+roof)|(?:load|goods|cargo|pallets?)\s+(?:\S+\s+){0,2}?(?:wet|soaked|damp)(?![a-z])|water\s+(?:in|inside)\s+the\s+trailer|(?<![а-яіїєґ])тент\S*\s+(?:\S+\s+){0,3}?(?:порван|порвав|порвал|розірв|дірк|дыр|пошкод|поврежд|розрізан|розрізал|порізан|порізал|порезан|порезал|разрез|теліпа|болта|протіка|протека)|(?:вантаж|груз|товар|палет)\S*\s+(?:\S+\s+){0,2}?(?:мокр|намок|промок|вологий|сыр)/i;
// Backlog 307 (Blickwinkel „Ladung verrutscht während der Fahrt“): Ladung/Paletten verrutscht, umgefallen, verloren bzw. Spanngurt gerissen – Anhalten,
// vorsichtig öffnen, Leitung klärt mit Versender/Kunden, Fotos, Fahrbereitschaft; „Ladung nass“ (Plane), „Ladungssicherung bemängelt“ (Kontrolle),
// Sicherheitsgurt und ukr. „вантажівка“ (Lkw) lösen nichts aus
const LOAD_HINT = /(?<![a-zäöüß])(?:ladung|ware|waren|paletten?|kisten?|fracht|gitterboxen?|kartons?)\s+(?:\S+\s+){0,3}?(?:verrutscht|verschoben|umgefallen|umgekippt|gekippt|ins\s+rutschen|rutscht|eingestürzt|zusammengebrochen|heruntergefallen|runtergefallen|herausgefallen|rausgefallen|verloren|lose(?![a-zäöüß]))|(?:verrutscht|verschoben|umgefallen|umgekippt|heruntergefallen|verloren)e[nmrs]?\s+(?:\S+\s+)?(?:ladung|ware|paletten?|fracht|kisten?)|(?:(?:spann|zurr|lade|ratschen|rad|reifen)gurt|spannkette|zurrkette|radkette)\S*\s+(?:\S+\s+){0,2}?(?:gerissen|abgerissen|lose|gel(?:ö|oe|o)st|locker|kaputt|defekt)(?![a-zäöüß])|(?<![a-z])(?:load|cargo|freight|goods|pallets?|boxes|crates?)\s+(?:\S+\s+){0,3}?(?:shifted|shifting|slid|sliding|fell|fallen|toppled|collapsed|tipped|came\s+loose|has\s+moved|moved\s+(?:forward|backwards?|sideways))|(?:shifted|fallen|toppled|collapsed)\s+(?:load|cargo|pallets?|goods)|lost\s+(?:part\s+of\s+)?(?:the\s+|my\s+|its\s+)?(?:load|cargo)|(?:ratchet|lashing|cargo|load)\s+straps?\s+(?:\S+\s+)?(?:broke|broken|snapped|came\s+loose|loose)|(?<![а-яіїєґ])(?:вантаж(?:у|ем|і)?|груз(?:а|ом|у)?|палет\S*|паллет\S*|піддон\S*|поддон\S*|товар(?:и|ы)?)(?![а-яіїєґ])\s+(?:\S+\s+){0,3}?(?:зсунув|зсунул|змісти|зміщ|посунув|сдвинул|смести|смещ|переверну|переверн|впав|впал|упал|упав|завали|розсипа|рассыпа|випав|выпал)|(?:зсунув|зсунул|змісти|сдвинул|смести)\S*\s+(?:\S+\s+)?(?:вантаж|груз)(?![а-яіїєґ])|(?<![a-zäöüß-])(?:pkw|autos?|neuwagen|gebrauchtwagen|kundenfahrzeug(?:e)?|kundenwagen|geladene[nsm]?\s+(?:fahrzeug(?:e)?|wagen|pkw|autos?))(?![a-zäöüß])\s+(?:\S+\s+){0,4}?(?:verrutscht|verschoben|hat\s+sich\s+(?:\S+\s+)?gel(?:ö|oe|o)st|haben\s+sich\s+(?:\S+\s+)?gel(?:ö|oe|o)st|losgerissen|ist\s+lose|sind\s+lose|heruntergerollt|runtergerollt|weggerollt|nach\s+vorne\s+gerollt)(?![a-zäöüß])|(?<![a-z-])(?:cars?|vehicles?)\s+(?:on\s+(?:the\s+)?(?:upper\s+|lower\s+|top\s+)?(?:deck|trailer|ramp)\s+)(?:\S+\s+){0,2}?(?:shifted|moved|slid|came\s+loose|rolled)(?![a-z])|(?<![a-z-])(?:wheel|tyre|tire)\s+(?:straps?|chains?)\s+(?:\S+\s+)?(?:broke|broken|snapped|came\s+loose|loose)(?![a-z])|(?<![а-яіїєґ])(?:авто|автомобіл\S*|автомобил\S*|машин[аиу])\s+(?:на\s+(?:верхньому\s+|нижньому\s+)?(?:ярус\S*|платформ\S*)\s+)?(?:\S+\s+){0,2}?(?:зсунул\S*|змістил\S*|сдвинул\S*|сместил\S*|відірвал\S*|оторвал\S*|скотил\S*)|(?<![а-яіїєґ])(?:лашинг\S*|ремен\S*\s+кріплен\S*|кріпильн\S*\s+ремен\S*|стяжк\S*|ланцюг\S*\s+кріплен\S*)\s+(?:\S+\s+)?(?:порвал\S*|порвав\S*|розірвал\S*|лопнув|лопнул\S*|зламал\S*)|(?<![a-zäöüß-])(?:verliert|verlor|verloren\s+hat)\s+(?:\S+\s+){0,2}?ladung(?![a-zäöüß])|(?<![a-zäöüß-])ladung\s+(?:\S+\s+){0,2}?(?:f(?:ä|ae)llt|fiel)\s+(?:\S+\s+)?(?:runter|herunter|raus|heraus|auf\s+die\s+(?:fahrbahn|stra(?:ß|ss)e))|(?<![a-z])(?:losing|lost|dropped|shed)\s+(?:part\s+of\s+)?(?:the\s+|its\s+|some\s+)?(?:load|cargo)(?![a-z])/i;
// [CLAUDE] Backlog 692 (30.10.2026, Blickwinkel „Vor dem Laden: Zurrgurte, Kantenschutz oder Antirutschmatten fehlen bzw. sind beschädigt“): Ladungssicherungsmittel fehlen,
// zu wenige, eingerissen/ausgefranst, Ratsche/Sperrbalken defekt → Schritte (nicht ohne ausreichende Sicherung laden/losfahren, Leitung klärt Ersatz; beschädigte Gurte aussortieren;
// was/wie viele fehlen, Fotos; Auswahl „Kann das Fahrzeug fahren?“) – reine Information, keine Frist, keine Mengen. Verrutschte Ladung bleibt bei LOAD_HINT.
// „Sicherheitsgurt defekt“ (Sitz), „Gurte nachbestellt“, „Zurrgurte wieder da“, „Kantenschutz nötig“ nicht.
const LASHGEAR_HINT = /(?<![a-zäöüß])(?:(?:zurr|spann|ratschen|lade|ladungs)gurt(?:e|en|s)?|gurte|rungen|steckrungen|einstecklatten|kantensch(?:ü|ue|u)tz(?:e|er)?|kantenschoner|ecksch(?:ü|ue|u)tz(?:e|er)?|antirutschmatten?|rutschhemmende\s+matten|ladungssicherungsmittel|sicherungsmittel|ladungssicherung|sperrbalken|sperrstangen?|klemmbretter|klemmbalken|ladungssicherungsnetze?|zurrketten?|(?:spann|zurr)?ratschen?|zurrpunkte?|zurr(?:ö|oe)sen?)(?![a-zäöüß])\s+(?:(?:sind|ist|wurden|wurde|nicht|nur|noch|keine|kein|mehr|im|am|auf|dem|der|den|lkw|auflieger|fahrzeug|alle|zwei|drei|einige|mehrere|komplett|total|stark|teilweise|schon|wieder|seit|heute|gestern|an\s+bord)[,;]?\s+){0,3}(?:fehl(?:t|en)|zu\s+wenig(?:e)?|nicht\s+(?:mehr\s+)?(?:da|vorhanden|an\s+bord|genug|ausreichend)|weg(?![a-zäöüß])|verschwunden|kaputt|defekt|besch(?:ä|ae|a)digt|eingerissen|angerissen|eingeschnitten|ausgefranst|durchgescheuert|verschlissen|abgenutzt|verbogen|klemm(?:t|en)|ausgerissen|abgerissen|gebrochen|ohne\s+etikett|etikett\s+fehlt)(?![a-zäöüß])(?!\s+(?:\S+\s+)?(?:wieder\s+da|ersetzt|nachbestellt|nachgef(?:ü|ue)llt|aufgef(?:ü|ue)llt|erledigt|ok(?![a-zäöüß])|in\s+ordnung|gefunden))|(?<![a-zäöüß])(?:keine|kein|zu\s+wenig(?:e)?|fehlende|besch(?:ä|ae|a)digte|kaputte|eingerissene)\s+(?:\S+\s+)?(?:(?:zurr|spann|ratschen|lade|ladungs)gurt(?:e|en|s)?|gurte|rungen|steckrungen|einstecklatten|kantensch(?:ü|ue|u)tz(?:e|er)?|kantenschoner|ecksch(?:ü|ue|u)tz(?:e|er)?|antirutschmatten?|rutschhemmende\s+matten|ladungssicherungsmittel|sicherungsmittel|ladungssicherung|sperrbalken|sperrstangen?|klemmbretter|klemmbalken|ladungssicherungsnetze?|zurrketten?|(?:spann|zurr)?ratschen?|zurrpunkte?|zurr(?:ö|oe)sen?)(?![a-zäöüß])(?!\s+(?:\S+\s+)?(?:n(?:ö|oe)tig|erforderlich|vorgeschrieben))|(?<![a-z])(?:lashing\s+straps?|ratchet\s+straps?|straps|edge\s+protectors?|corner\s+protectors?|anti[\s-]?slip\s+mats?|load\s+bars?|lashing\s+(?:chains?|equipment)|load\s+securing\s+equipment)\s+(?:(?:are|is|on|the|board|not|all|some|two|three|several|completely|badly)\s+){0,3}(?:missing|gone|damaged|torn|frayed|cut|broken|worn|not\s+enough|insufficient)(?![a-z])|(?<![a-z])(?:no|not\s+enough|missing|damaged|torn|frayed|broken)\s+(?:\S+\s+)?(?:lashing\s+straps?|ratchet\s+straps?|straps|edge\s+protectors?|anti[\s-]?slip\s+mats?|load\s+bars?)(?![a-z])|(?<![а-яіїєґё])(?:ремен\S*\s+(?:кріплен|креплен)\S*|стяжн\S*\s+ремен\S*|стяжк\S*|кутник\S*|уголк\S*|антиковзк\S*|антискольз\S*|розпірн\S*|распорн\S*|засоб\S*\s+кріплен\S*|средств\S*\s+креплен\S*)\s+(?:\S+\s+){0,2}?(?:немає|нема|нет(?![а-яіїєґё])|бракує|не\s+вистачає|не\s+хватает|відсутн\S*|отсутств\S*|порван\S*|розірван\S*|зношен\S*|пошкоджен\S*|поврежден\S*|зламан\S*|сломан\S*)|(?<![а-яіїєґё])(?:немає|нема|нет|бракує|не\s+вистачає|не\s+хватает)\s+(?:\S+\s+)?(?:(?:ремен|ремн)(?!\S*\s+(?:безпек|безопасн))\S*|стяжок|стяжк\S*|кутник\S*|уголк\S*|антиковзк\S*|антискольз\S*|розпірн\S*|распорн\S*)/i;
// [CLAUDE] Backlog 694 (30.10.2026, Blickwinkel „Konturmarkierung, Rückstrahler oder Warntafel abgerissen/fehlt“): Reflexstreifen (Konturmarkierung), Rückstrahler,
// rot-weiße Warntafeln/Heckmarkierung fehlen, abgerissen, lose, beschädigt oder verschmutzt → Schritte (Mangel, Leitung entscheidet; reinigen, lose Teile nur gefahrlos
// abnehmen; was/wo, Fotos; Auswahl „Kann das Fahrzeug fahren?“) – reine Information, keine Frist. Scheinwerfer-Reflektor, Warnweste/„світловідбивний жилет“,
// „Konturmarkierung erneuert“, „Warntafel nötig“ nicht. Leuchten bleiben bei LIGHTS_HINT.
// Backlog 696: Umwelt-/HU-Plakette fehlt, abgefallen oder unleserlich – eigene Schritte; die Fundstelle zählt nicht zusätzlich als Kennzeichen-, Scheiben- oder loses Teil
const STICKER_HINT = /(?<![a-zäöüß])(?:(?:umwelt|feinstaub|hu|t(?:ü|ue|u)v|pr(?:ü|ue)f)-?\s?)?plakette(?:n)?(?![a-zäöüß])\s+(?:(?:ist|sind|wurde|wurden|am|an|auf|in|der|die|das|dem|den|hinten|vorne|kennzeichen|nummernschild|scheibe|windschutzscheibe|frontscheibe|lkw|zugmaschine|anh(?:ä|ae)nger|auflieger|komplett|ganz|teilweise|halb|fast|stark|schon|seit|heute|gestern|nach|waschanlage|scheibentausch|einfach|leider|nicht|mehr|wieder)[,;]?\s+){0,4}(?:fehl(?:t|en)|weg(?![a-zäöüß])|abgefallen|abgel(?:ö|oe)st|l(?:ö|oe)s(?:t|en)\s+sich|lose(?![a-zäöüß])|abgerissen|abgekratzt|abgerubbelt|unleserlich|(?:nicht|kaum)\s+(?:mehr\s+)?(?:lesbar|leserlich|erkennbar|zu\s+lesen|zu\s+erkennen|vorhanden|da(?![a-zäöüß]))|verblasst|ausgeblichen|besch(?:ä|ae|a)digt|kaputt|zerkratzt|zerrissen|eingerissen|gestohlen|geklaut|entwendet)(?![a-zäöüß])(?![,;.]?\s+(?:\S+\s+)?(?:wieder\s+(?:da|dran|drauf|angebracht)|ersetzt|erneuert|neu(?![a-zäöüß])|geklebt|angebracht|erledigt|ok(?![a-zäöüß])|in\s+ordnung|bestellt|beantragt))|(?<![a-zäöüß])(?:fehlende[nmrs]?|abgefallene[nmrs]?|unleserliche[nmrs]?|besch(?:ä|ae|a)digte[nmrs]?|kaputte[nmrs]?|verblasste[nmrs]?|keine|kein|ohne)\s+(?:\S+\s+)?(?:(?:umwelt|feinstaub|hu|t(?:ü|ue|u)v|pr(?:ü|ue)f)-?\s?)?plakette(?:n)?(?![a-zäöüß])(?!\s+(?:\S+\s+)?(?:n(?:ö|oe)tig|erforderlich|vorgeschrieben|bestellt|beantragt|ersetzt|erneuert|angebracht|geklebt))|(?<![a-z])(?:(?:emissions?|environmental|low[- ]emission(?:\s+zone)?|clean[- ]air(?:\s+zone)?|green|inspection|mot|roadworthiness|t(?:ü|u)v|hu)\s+(?:stickers?|badges?|vignettes?|discs?))\s+(?:(?:is|are|on|the|windscreen|windshield|plate|number|rear|front|has|have|completely|partly|now|already|just)\s+){0,3}(?:missing|gone|fell\s+off|fallen\s+off|came\s+off|come\s+off|peeling(?:\s+off)?|torn(?:\s+off)?|scratched\s+off|damaged|unreadable|illegible|faded|stolen|not\s+(?:readable|legible|visible|there))(?![a-z])(?!\s+(?:\S+\s+)?(?:replaced|renewed|ordered|fixed|ok(?![a-z])))|(?<![a-z])(?:missing|no|damaged|illegible|unreadable|faded|torn|stolen)\s+(?:(?:emissions?|environmental|low[- ]emission(?:\s+zone)?|clean[- ]air(?:\s+zone)?|green|inspection|mot|roadworthiness|t(?:ü|u)v|hu)\s+(?:stickers?|badges?|vignettes?|discs?))(?![a-z])(?!\s+(?:\S+\s+)?(?:needed|required|ordered))|(?<![а-яіїєґё])(?:плакетк\S*|(?:екологічн|экологическ|зелен)\S*\s+(?:наклейк|стикер|значок|плакетк)\S*|наклейк\S*\s+(?:про\s+|о\s+)?(?:техогляд|техосмотр|то(?![а-яіїєґё])|hu|t(?:ü|u)v)\S*)\s+(?:\S+\s+){0,3}?(?:немає|нема(?![а-яіїєґё])|нет(?![а-яіїєґё])|відсутн|отсутств|відклеї|відклеє|отклеи|отклее|відпа|отпа|відірва|оторва|пошкоджен|поврежден|не\s+читає|не\s+читае|нечитаб|нечитаем|не\s+видно|вицві|выцве|вкра|укра)|(?<![а-яіїєґё])(?:немає|нема|нет|без|бракує|відсутн\S*|отсутств\S*|пошкоджен\S*|поврежден\S*)\s+(?:\S+\s+)?(?:плакетк|(?:екологічн|экологическ|зелен)\S*\s+(?:наклейк|стикер|значок|плакетк)|наклейк\S*\s+(?:про\s+|о\s+)?(?:техогляд|техосмотр|то(?![а-яіїєґё])))\S*/i;
const STICKER_SPANS = new RegExp(STICKER_HINT.source, 'gi');
const noSticker = (s) => String(s || '').replace(STICKER_SPANS, ' ');
// Backlog 698: Fahrerhaus-Ausstattung (Kühlschrank, Liege, Sonnenblende, Vorhang, Steckdose, Innenlicht, Ablagen, Radio) defekt – eigene Schritte; die Fundstelle zählt nicht zusätzlich als Kühlaufbau, Beleuchtung oder Plane
const CABKIT_HINT = /(?<![a-zäöüß-])(?:k(?:ü|ue)hlschrank|wechselrichter|spannungswandler|k(?:ü|ue)hlbox|(?:schlaf|ober|unter)?liege(?![a-zäöüß])|koje|bett(?![a-zäöüß])|matratze|lattenrost|liegen-?(?:halte)?netz|halte-?netz|sonnenblende(?:n)?|sonnenschutz(?:rollo)?|rollo(?:s)?|vorh(?:a|ä|ae)ng(?:e)?|gardine(?:n)?|verdunkelung|(?<!(?:anh(?:ä|ae)nger|auflieger|ebs|abs|pol(?:ige)?|polig)[- ]?)steckdose(?![a-zäöüß])(?!\s+(?:\S+\s+){0,2}(?:anh(?:ä|ae)nger|auflieger|trailer|ebs|abs))|zigarettenanz(?:ü|ue)nder|usb(?:-?(?:anschluss|buchse|port|steckdose))?|ladebuchse|(?:innen|lese|kabinen|fahrerhaus)(?:beleuchtung|licht|leuchte|lampe)|leselampe|ablage(?:fach|f(?:ä|ae)cher|klappe)?|staufach|staukasten|stauklappe|handschuhfach|becherhalter|getr(?:ä|ae)nkehalter|radio|funkger(?:ä|ae)t(?:e)?|cb-?funk(?:ger(?:ä|ae)t)?|sitzheizung)(?![a-zäöüß])\s+(?:(?:ist|sind|im|in|der|die|das|dem|den|fahrerhaus|kabine|oben|unten|obere|untere|fahrerseite|beifahrerseite|links|rechts|seit|heute|gestern|schon|wieder|komplett|ganz|mehr|leider|auch|total|nur|noch|seit|tagen|wochen)[,;]?\s+){0,4}(?:defekt|kaputt|geht\s+nicht|funktioniert\s+nicht|ohne\s+(?:funktion|strom)|k(?:ü|ue)hlt\s+nicht|abgebrochen|gebrochen|gerissen|eingerissen|zerrissen|lose(?![a-zäöüß])|locker(?![a-zäöüß])|h(?:ä|ae)lt\s+nicht|klemmt|l(?:ä|ae|a)ss(?:t|en)\s+sich\s+nicht|rastet\s+nicht|fehl(?:t|en)|wackelt|h(?:ä|ae)ngt\s+(?:herunter|runter|schief)|durchgelegen|f(?:ä|ae)llt\s+(?:runter|herunter|ab)|abgefallen)(?![a-zäöüß])(?![,;.]?\s+(?:\S+\s+)?(?:repariert|ersetzt|getauscht|erneuert|erledigt|wieder\s+(?:ok|in\s+ordnung|ganz|fest)|ok(?![a-zäöüß])))|(?<![a-z])(?:(?:cab\s+)?fridge|bunk(?:\s+bed)?|sleeper\s+bunk|mattress|sun\s*visor|(?:cab|bunk|window|sleeper)\s+curtains?|(?:cab|interior|reading)\s+lights?|(?:power|12v|24v)\s+(?:socket|outlet)|cab\s+socket|usb\s+(?:port|socket|charger)|cigarette\s+lighter|storage\s+(?:compartment|locker|box)|glove\s*box|cup\s+holder|radio|cb\s+radio|two-way\s+radio|seat\s+heat(?:ing|er)|heated\s+seat|bunk\s+(?:net|restraint))\s+(?:(?:is|are|in|the|cab|upper|lower|top|bottom|has|have|now|still|completely|keeps|on|passenger|driver|side)\s+){0,3}(?:broken|not\s+working|doesn['’]?t\s+work|does\s+not\s+work|won['’]?t\s+(?:close|lock|latch|stay|work|cool)|not\s+cooling|missing|torn|ripped|loose|stuck|faulty|damaged|no\s+power|dead|fell\s+off|falling\s+(?:down|off)|hanging\s+(?:down|off))(?![a-z])(?!\s+(?:\S+\s+)?(?:fixed|repaired|replaced|ok(?![a-z])))|(?<![а-яіїєґё])(?:холодильник\S*\s+(?:в|у)\s+кабін\S*|холодильник\S*\s+в\s+кабин\S*|спальн\S*\s+(?:місц|мест|полиц|поличк)\S*|спальник\S*|ліжк\S*|кроват\S*|матрац\S*|матрас\S*|(?:сонцезахисн|солнцезащитн)\S*\s+козир\S*|козирок\S*|козырек\S*|шторк\S*|штор[аиуы]?(?![а-яіїєґё])|розетк\S*\s+(?:в|у)\s+кабін\S*|розетк\S*\s+в\s+кабин\S*|прикурювач\S*|прикуриват\S*|usb\S*|освітлен\S*\s+(?:салону|кабіни)|освещени\S*\s+(?:салона|кабины)|підсвітк\S*\s+кабіни|подсветк\S*\s+кабины|бардачок\S*|бардачк\S*|рундук\S*|радіо|радио|магнітол\S*|магнитол\S*|раці[яїю]|раци[яию]|підігрів\S*\s+сидін\S*|подогрев\S*\s+сиден\S*)\s+(?:\S+\s+){0,3}?(?:не\s+працю|не\s+работа|не\s+холод|зламан|сломан|поламан|відірван|оторван|порван|розірван|не\s+закрива|не\s+закрыва|не\s+фіксу|не\s+фиксир|бракує|немає|нет(?![а-яіїєґё])|відпа|отпа|теліпа|болта|без\s+(?:живлення|питания)|не\s+заряджа|не\s+заряжа)/i;
const CABKIT_SPANS = new RegExp(CABKIT_HINT.source, 'gi');
const noCabkit = (s) => String(s || '').replace(CABKIT_SPANS, ' ');
// Backlog 700: Wasser im Fahrerhaus (Dachluke/Fahrerhaus undicht, Fußraum nass, Dachluke schließt nicht, Schimmel) – eigene Schritte
const CABLEAK_HINT = /(?<![a-zäöüß-])wasser\s+(?:steht\s+)?(?:im|in\s+der)\s+(?:fahrerhaus|f(?:ü|ue)hrerhaus|schlafkabine|kabine|fu(?:ß|ss)raum)(?![a-zäöüß])|(?<![a-zäöüß-])wasser\s+(?:\S+\s+){0,2}?(?:l(?:ä|ae|a)uft|tropft|kommt|steht|dringt|sammelt\s+sich|l(?:ä|ae|a)uft\s+rein)\s+(?:\S+\s+){0,3}?(?:ins|in\s+(?:das|die|den)|im|in\s+der|unter\s+(?:dem|den))\s+(?:fahrerhaus|f(?:ü|ue)hrerhaus|kabine|fu(?:ß|ss)raum|lkw)(?![a-zäöüß])|(?<![a-zäöüß-])(?:fahrerhaus|f(?:ü|ue)hrerhaus|schlafkabine|kabine|dachluke|dachfenster|schiebedach|dachl(?:ü|ue)fter|dachhaube|hochdach|fahrerhausdach|kabinendach)(?![a-zäöüß])\s+(?:(?:ist|sind|wird|seit|heute|gestern|bei|regen|wieder|stark|komplett|leicht|oben|vorne|hinten|links|rechts)[,;]?\s+){0,3}(?:undicht|leckt|tropft|nass(?![a-zäöüß]))|(?<![a-zäöüß-])(?:es\s+)?regnet\s+(?:es\s+)?(?:\S+\s+){0,2}?(?:rein|herein|durch(?![a-zäöüß])|ins\s+(?:fahrerhaus|f(?:ü|ue)hrerhaus)|in\s+die\s+kabine)(?![a-zäöüß])|(?<![a-zäöüß-])(?:fu(?:ß|ss)raum|fu(?:ß|ss)matte(?:n)?|teppich|boden\s+im\s+fahrerhaus|matratze|liege|bettzeug)\s+(?:(?:ist|sind|im|in\s+der|fahrerhaus|kabine|schon|wieder|komplett|ganz|st(?:ä|ae)ndig|immer)[,;]?\s+){0,3}(?:nass|feucht|unter\s+wasser|durchn(?:ä|ae)sst|klatschnass)(?![a-zäöüß])(?!\s+(?:gereinigt|gewischt|geputzt|gemacht|gesaugt))|(?<![a-zäöüß-])(?:dachluke|dachfenster|schiebedach|dachl(?:ü|ue)fter|dachhaube)\s+(?:(?:ist|l(?:ä|ae|a)sst|sich|geht|schlie(?:ß|ss)t|mehr|nicht|richtig|ganz)\s+){0,4}(?:klemmt|nicht\s+(?:mehr\s+)?(?:zu|schlie(?:ß|ss)en|dicht)|kaputt|defekt|gebrochen|gerissen|undicht)(?![a-zäöüß])|(?<![a-zäöüß-])schimmel\s+(?:im|in\s+der|am|an\s+der)\s+(?:fahrerhaus|kabine|liege|matratze|decke|dachhimmel)|(?<![a-z])water\s+(?:is\s+)?(?:leaking|leaks|coming|getting|dripping|running|pooling)\s+(?:in(?:to)?|onto)\s+(?:the\s+)?(?:cab|footwell|bunk)(?![a-z])|(?<![a-z])(?:cab|roof\s+hatch|sun\s*roof|roof\s+vent|roof\s+light)\s+(?:is\s+)?(?:leaking|leaks|leaky|letting\s+(?:water|rain)\s+in)(?![a-z])|(?<![a-z])rain\s+(?:is\s+)?(?:getting|coming|leaking)\s+(?:in(?:to)?)\s+(?:the\s+)?cab(?![a-z])|(?<![a-z])(?:wet|soaked|damp)\s+(?:footwell|cab\s+floor|floor\s+mats?|mattress|bunk)(?![a-z])|(?<![a-z])roof\s+hatch\s+(?:won['’]?t\s+close|doesn['’]?t\s+close|stuck|broken)(?![a-z])|(?<![a-z])mou?ld\s+in\s+(?:the\s+)?cab(?![a-z])|(?<![а-яіїєґё])вод\S*\s+(?:\S+\s+){0,2}?(?:тече|капає|капает|потрапляє|попадает|протікає|протекает|затікає|затекает|стоїть|стоит)\s+(?:\S+\s+){0,2}?(?:в|у)\s+кабін\S*|(?<![а-яіїєґё])вод\S*\s+(?:\S+\s+){0,2}?(?:тече|капає|капает|попадает|протекает|затекает|стоит)\s+(?:\S+\s+){0,2}?в\s+кабин\S*|(?<![а-яіїєґё])(?:кабін\S*|кабин\S*|люк\S*|дах\S*\s+кабіни|крыш\S*\s+кабины)\s+(?:\S+\s+){0,2}?(?:протікає|протекает|тече(?![а-яіїєґё])|течет|не\s+закрива|не\s+закрыва)|(?<![а-яіїєґё])(?:мокр\S*|сир\S*|вологий|вологі|влажн\S*)\s+(?:килимок|килимки|коврик\S*|підлог\S*|пол(?![а-яіїєґё])|матрац\S*|матрас\S*)|(?<![а-яіїєґё])(?:пліснява|плесень|цвіль)\s+(?:в|у)\s+кабін\S*|(?<![а-яіїєґё])плесень\s+в\s+кабин\S*/i;
// Backlog 702: Telematik-/Ortungsgerät, Navi oder Bordtablet defekt – eigene Schritte (nicht ins Gerät eingreifen; Tachograph hat eigene Schritte)
const TELEM_HINT = /(?<![a-zäöüß-])(?:navi(?:gationsger(?:ä|ae)t|gationssystem|gation|ger(?:ä|ae)t)?|telematik(?:-?(?:box|ger(?:ä|ae)t|einheit|modul))?|ortung(?:sger(?:ä|ae)t|ssystem)?|gps(?:-?(?:ger(?:ä|ae)t|ortung|tracker|empfang|signal))?|tracker|bordtablet|fahrertablet|yellow-?fox(?:-?(?:ger(?:ä|ae)t|box|tablet))?|webfleet(?:-?(?:ger(?:ä|ae)t|box|tablet))?)(?![a-zäöüß])\s+(?:(?:ist|im|in|der|die|das|dem|den|lkw|fahrzeug|seit|heute|gestern|schon|wieder|komplett|ganz|st(?:ä|ae)ndig|immer|dauernd|mehr|auch)[,;]?\s+){0,4}(?:defekt|kaputt|geht\s+nicht|funktioniert\s+nicht|ausgefallen|f(?:ä|ae)llt\s+(?:st(?:ä|ae)ndig\s+|immer\s+)?aus|ohne\s+(?:funktion|signal|empfang)|kein(?:e|en)?\s+(?:signal|verbindung|empfang|position|daten)|startet\s+nicht|bleibt\s+schwarz|h(?:ä|ae)ngt\s+sich\s+auf|friert\s+ein|eingefroren|zeigt\s+nichts|sendet\s+nicht|meldet\s+sich\s+nicht|offline|reagiert\s+nicht|geht\s+(?:st(?:ä|ae)ndig\s+|immer\s+)?aus)(?![a-zäöüß])(?![,;.]?\s+(?:\S+\s+)?(?:repariert|getauscht|ersetzt|erledigt|wieder\s+(?:ok|da|in\s+ordnung)|ok(?![a-zäöüß])))|(?<![a-zäöüß-])(?:kein(?:e|en)?|ohne)\s+(?:gps(?:-?(?:signal|empfang))?|ortung|navi|telematik)(?![a-zäöüß])(?!\s+(?:\S+\s+)?(?:n(?:ö|oe)tig|erforderlich|vorhanden|eingebaut|verbaut))|(?<![a-z])(?:sat\s*-?nav|navigation\s+(?:system|unit|device)|gps(?:\s+(?:unit|device|tracker))?|tracker|tracking\s+(?:device|unit|box)|telematics(?:\s+(?:unit|box|device))?|on-?board\s+tablet|driver\s+tablet)\s+(?:(?:is|has|in|the|truck|still|keeps|completely|now|not)\s+){0,3}(?:not\s+working|broken|dead|faulty|offline|frozen|no\s+signal|lost\s+signal|not\s+tracking|not\s+sending|won['’]?t\s+(?:turn\s+on|start|work)|doesn['’]?t\s+work|does\s+not\s+work|keeps\s+(?:crashing|freezing|turning\s+off)|black\s+screen)(?![a-z])(?!\s+(?:\S+\s+)?(?:fixed|replaced|ok(?![a-z])))|(?<![а-яіїєґё])(?:навігатор\S*|навигатор\S*|gps|телематик\S*|трекер\S*|бортов\S*\s+планшет\S*|планшет\S*\s+водія|yellowfox|webfleet)\s+(?:\S+\s+){0,2}?(?:не\s+працю|не\s+работа|зламан|сломан|поламан|немає\s+сигнал|нема\s+сигнал|нет\s+сигнал|не\s+вмика|не\s+включа|завис|не\s+показу|не\s+показыва|офлайн|не\s+відправля|не\s+отправля)|(?<![а-яіїєґё])(?:немає|нема|нет)\s+(?:gps|сигналу\s+gps|сигнала\s+gps|навігатор|навигатор)\S*/i;
// Backlog 704: Motorölstand zu niedrig, Öl nachgefüllt oder hoher Ölverbrauch – eigene Schritte (Sorte nur laut Betriebsanleitung, keine Mengenvorgabe)
const OILLEVEL_HINT = /(?<![a-zäöüß-])(?:motor)?(?:ö|oe)l(?:stand|pegel)?(?![a-zäöüß])\s+(?:(?:ist|war|liegt|steht|seit|heute|schon|wieder|deutlich|sehr|viel|zu|knapp|unter|am|auf|der|dem|beim|laut|peilstab|display|anzeige|bei|kontrolle)[,;]?\s+){0,4}(?:niedrig|zu\s+(?:niedrig|gering|wenig)|gering|unter\s+(?:min(?:imum)?|der\s+min|dem\s+min)|am\s+min(?:imum)?|auf\s+min(?:imum)?|sinkt|f(?:ä|ae)llt|nachgef(?:ü|ue)llt|nachf(?:ü|ue)llen|nachgekippt|aufgef(?:ü|ue)llt|muss\s+nachgef(?:ü|ue)llt|fehlt)(?![a-zäöüß])(?!\s+(?:\S+\s+)?(?:beim\s+(?:service|(?:ö|oe)lwechsel)|in\s+ordnung|ok(?![a-zäöüß])))|(?<![a-zäöüß-])(?:zu\s+)?wenig\s+(?:motor)?(?:ö|oe)l(?![a-zäöüß])|(?<![a-zäöüß-])(?:motor)?(?:ö|oe)lverbrauch\s+(?:ist\s+)?(?:\S+\s+)?(?:hoch|zu\s+hoch|sehr\s+hoch|stark|gestiegen)(?![a-zäöüß])|(?<![a-zäöüß-])(?:braucht|verbraucht|frisst|verbrennt)\s+(?:\S+\s+){0,2}?(?:motor)?(?:ö|oe)l(?![a-zäöüß])|(?<![a-z])(?:engine\s+)?oil\s+level\s+(?:is\s+|was\s+)?(?:\S+\s+)?(?:low|too\s+low|below\s+(?:the\s+)?min(?:imum)?|at\s+(?:the\s+)?min(?:imum)?|dropping)(?![a-z])|(?<![a-z])low\s+(?:engine\s+)?oil(?:\s+level)?(?![a-z])(?!\s+pressure)|(?<![a-z])(?:topped\s+up|top\s+up|added|refilled)\s+(?:the\s+)?(?:engine\s+)?oil(?![a-z])|(?<![a-z])(?:using|burning|consuming|uses|burns)\s+(?:a\s+lot\s+of\s+|too\s+much\s+|lots\s+of\s+)?(?:engine\s+)?oil(?![a-z])|(?<![а-яіїєґё])рів(?:ень|ня)\s+(?:моторн\S*\s+)?олив\S*\s+(?:\S+\s+){0,2}?(?:низьк|нижче|менше|на\s+мінімум|падає)|(?<![а-яіїєґё])уров(?:ень|ня)\s+(?:моторн\S*\s+)?масл\S*\s+(?:\S+\s+){0,2}?(?:низк|ниже|меньше|на\s+минимум|падает)|(?<![а-яіїєґё])мало\s+(?:моторн\S*\s+)?(?:олив|масл)\S*|(?<![а-яіїєґё])(?:долив\S*|долил\S*)\s+(?:\S+\s+)?(?:олив|масл)\S*|(?<![а-яіїєґё])(?:жере|жрет|їсть|ест)\s+(?:олив|масл)\S*/i;
// Backlog 707 (Blickwinkel „Feststellbremse hält nicht – Lkw rollt weg“): Feststell-/Hand-/Parkbremse hält nicht, greift nicht, lässt sich nicht
// einlegen; Lkw/Auflieger weggerollt, rollt trotz Feststellbremse; EN/UK/RU → eigene Schritte (sichern mit Unterlegkeilen, nie vor/hinter ein rollendes
// Fahrzeug, Leitung anrufen, nicht weiterfahren; Verletzte → Notruf, Schaden → Unfall-Schritte). Die Fundstelle wird vor der Bremsen-Prüfung
// entfernt (noParkbrake), weil deren Schritt „Feststellbremse einlegen“ hier nicht hilft. „Feststellbremse löst nicht“, „Handbremse defekt“,
// „Lkw rollt am Berg zurück“, „Palette rollt weg“ lösen nichts aus
const PARKBRAKE_HINT = /(?<![a-zäöüß-])(?:(?:auflieger|anh(?:ä|ae|a)nger|trailer)-?)?(?:feststell|hand|park|halte|federspeicher|auflieger|anh(?:ä|ae|a)nger)[\s-]?bremse(?:n)?(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:h(?:ä|ae|a)lt\S*\s+(?:\S+\s+){0,3}?nicht(?![a-zäöüß])(?!\s+(?:mehr\s+)?(?:auf|fest))|h(?:ä|ae|a)lt\S*\s+(?:\S+\s+){0,2}?nicht\s+mehr(?![a-zäöüß])(?!\s+(?:auf|fest))|greift\s+(?:\S+\s+)?nicht|zieht\s+(?:\S+\s+)?nicht(?:\s+an)?(?![a-zäöüß])|l(?:ä|ae|a)(?:ss|ß)t\s+sich\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:einlegen|anziehen|ziehen|aktivieren|bet(?:ä|ae)tigen))|(?<![a-zäöüß-])(?:lkw|fahrzeug|auflieger|anh(?:ä|ae|a)nger|zugmaschine|sattelzug|sattelauflieger|wagen|auto|truck|er)\s+(?:\S+\s+){0,4}?(?:(?:rollt|rollte|rollen|rollten|ist|sind|war|waren)\s+(?:\S+\s+){0,3}?(?:weg|los|davon)(?![a-zäöüß])|weggerollt|losgerollt|davongerollt|ins\s+rollen\s+gekommen)|(?<![a-zäöüß-])(?:rollt|rollte|rollen|rollten|weggerollt|losgerollt)\s+(?:\S+\s+){0,3}?trotz\s+(?:\S+\s+)?(?:feststell|hand|park)[\s-]?bremse|(?<![a-z])(?:parking|park|hand|spring|trailer)[\s-]?brakes?\s+(?:\S+\s+){0,3}?(?:(?:won|doesn|does\s+not|did\s+not|didn|isn|is\s+not|not|no\s+longer|wont|doesnt|isnt)['’]?t?\s+(?:\S+\s+)?hold(?:ing)?|not\s+holding|fails?\s+to\s+hold|won['’]?t\s+(?:engage|apply))|(?<![a-z])(?:truck|lorry|vehicle|trailer|rig|tractor|it)\s+(?:\S+\s+){0,3}?(?:rolled|rolls|rolling|started\s+rolling|started\s+to\s+roll)\s+(?:\S+\s+){0,2}?away|(?:стоянков|ручн)\S*\s+(?:гальм|тормоз)\S*\s+(?:\S+\s+){0,2}?не\s+(?:трима|держ)|ручник\S*\s+(?:\S+\s+){0,2}?не\s+(?:трима|держ)|(?<![а-яіїєґ])(?:авто|машин|вантажівк|фур|причіп|причеп|напівпричіп|полуприцеп|тягач|грузовик)\S*\s+(?:\S+\s+){0,3}?(?:відкоти|откати|покоти|покати|скоти)\S*/i;
// Backlog 729 (Blickwinkel „Gaspedal klemmt/hängt, Fußmatte unter dem Pedal, Lkw beschleunigt von selbst“): Gas-/Fahrpedal bzw. Pedal klemmt,
// hängt, kommt nicht zurück, lose, abgebrochen, reagiert nicht; „Gas hängt“; Fußmatte unter/hinter einem Pedal bzw. klemmt/rutscht;
// „beschleunigt von selbst“, „geht nicht vom Gas“, Drehzahl bleibt hoch; EN/UK/RU → eigene Schritte. Brems-/Kupplungspedal haben eigene Schritte;
// „repariert“, „Fußmatte fehlt“, „Gas geben“, „beschleunigt schlecht“, „Drehzahlmesser“ nicht.
const PEDAL_HINT = /(?<![a-zäöüß-])(?:gas|fahr)pedal(?:s|e)?(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|befestigt|fixed|repaired|replaced|відремонт\S*|замінен\S*|отремонт\S*|заменен\S*))\s+(?:\S+\s+){0,3}?(?:klemmt|hakt|h(?:ä|ae|a)ngt|bleibt\s+(?:\S+\s+)?(?:h(?:ä|ae|a)ngen|unten|stecken)|kommt\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:zur(?:ü|ue)ck|hoch|raus)|geht\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:zur(?:ü|ue)ck|hoch)|federt\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?zur(?:ü|ue)ck|locker|lose|wackelt|abgebrochen|gebrochen|kaputt|defekt|reagiert\s+(?:\S+\s+)?nicht|ohne\s+funktion|funktioniert\s+(?:\S+\s+)?nicht|ohne\s+wirkung|spinnt|schwerg(?:ä|ae|a)ngig|geht\s+schwer)(?![a-zäöüß])|(?<![a-zäöüß-])pedal(?:e)?(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|befestigt|fixed|repaired|replaced|відремонт\S*|замінен\S*|отремонт\S*|заменен\S*))\s+(?:\S+\s+){0,2}?(?:klemmt|hakt|h(?:ä|ae|a)ngt|bleibt\s+(?:\S+\s+)?(?:h(?:ä|ae|a)ngen|stecken)|kommt\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?zur(?:ü|ue)ck|locker|lose|wackelt|abgebrochen)(?![a-zäöüß])|(?<![a-zäöüß-])gas(?![a-zäöüß])\s+(?:h(?:ä|ae|a)ngt|klemmt|bleibt\s+(?:\S+\s+)?(?:h(?:ä|ae|a)ngen|stehen))(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|befestigt|fixed|repaired|replaced|відремонт\S*|замінен\S*|отремонт\S*|заменен\S*))|(?<![a-zäöüß-])(?:fu(?:ß|ss)matte|gummimatte|matte)(?:n)?(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|befestigt|fixed|repaired|replaced|відремонт\S*|замінен\S*|отремонт\S*|заменен\S*))\s+(?:\S+\s+){0,4}?(?:unter|hinter|an|am|vor|(?:ü|ue)ber)\s+(?:\S+\s+)?(?:gas|brems|kupplungs|fahr)?pedal\S*|(?<![a-zäöüß-])(?:fu(?:ß|ss)matte|gummimatte)(?:n)?(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|befestigt|fixed|repaired|replaced|відремонт\S*|замінен\S*|отремонт\S*|заменен\S*))\s+(?:\S+\s+){0,3}?(?:klemmt|blockiert|verrutscht|rutscht)(?![a-zäöüß])|(?<![a-zäöüß-])(?:beschleunigt|gibt\s+gas)\s+(?:\S+\s+)?(?:von\s+selbst|von\s+allein\S*|allein\S*|selbstst(?:ä|ae|a)ndig|ungewollt|ohne\s+(?:mein\s+)?zutun)(?![a-zäöüß])|(?<![a-zäöüß-])(?:geht|ging|kommt|kam)\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?vom\s+gas(?![a-zäöüß])|(?<![a-zäöüß-])drehzahl\s+(?:\S+\s+){0,2}?(?:bleibt\s+(?:\S+\s+)?(?:hoch|oben)|geht\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:runter|herunter|zur(?:ü|ue)ck)|f(?:ä|ae|a)llt\s+(?:\S+\s+)?nicht)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|befestigt|fixed|repaired|replaced|відремонт\S*|замінен\S*|отремонт\S*|заменен\S*))|(?<![a-z-])(?:accelerator|gas|throttle)(?:\s+pedal)?(?![a-z])(?![^.;!?]*(?:fixed|repaired|replaced))\s+(?:\S+\s+){0,2}?(?:stuck|sticking|sticks|jammed|loose|broken|not\s+returning|doesn['’]?t\s+(?:come\s+back|return)|won['’]?t\s+(?:come\s+back|return)|unresponsive|not\s+responding)(?![a-z])|(?<![a-z-])(?:floor\s+)?mats?\s+(?:\S+\s+){0,3}?(?:under|behind|jammed\s+(?:under|behind)|stuck\s+(?:under|behind))\s+(?:the\s+)?(?:accelerator|gas|brake|clutch)?\s*pedals?(?![a-z])|(?<![a-z-])(?:accelerat\S*|speed(?:s|ing)?\s+up)\s+(?:\S+\s+)?(?:by\s+itself|on\s+its\s+own)(?![a-z])|(?<![a-z-])revs?\s+(?:\S+\s+){0,2}?(?:stay\S*\s+high|won['’]?t\s+(?:drop|come\s+down)|not\s+dropping)(?![a-z])|(?<![а-яіїєґё])педал\S*\s+(?:газу|газа|акселератор\S*)\s+(?:\S+\s+){0,2}?(?:заїда\S*|заеда\S*|залипа\S*|застря\S*|не\s+поверта\S*|не\s+возвраща\S*|зламал\S*|сломал\S*|бовта\S*|болта\S*|не\s+працю\S*|не\s+работа\S*)|(?<![а-яіїєґё])(?:килимок|килимк\S*|коврик\S*)\s+(?:\S+\s+){0,3}?(?:під|за|под)\s+(?:\S+\s+)?педал\S*|(?<![а-яіїєґё])(?:розганя\S*|разгоня\S*)\s+(?:\S+\s+)?(?:сам\S*)/i;
const PARKBRAKE_SPANS = new RegExp(PARKBRAKE_HINT.source, 'gi');
const noParkbrake = (s) => String(s || '').replace(PARKBRAKE_SPANS, ' ');
// Backlog 711 (Blickwinkel „Mäuse, Bettwanzen oder Ungeziefer im Fahrerhaus“): Tiere/Kot/Befall mit Ort im Fahrerhaus (Kabine, Koje, Liege,
// Matratze, Staufach, Kühlschrank) bzw. Bettwanzen allein; EN/UK/RU → eigene Schritte (nichts selbst bekämpfen, Leitung organisiert Reinigung,
// Kot nicht trocken auffegen/aussaugen, lüften; Bettzeug nicht mitnehmen; angefressene Kabel → Marder-Schritte). „keine Mäuse“, „Ungeziefer
// in der Ladung“, „Ameisen auf dem Parkplatz“, „Fliegengitter kaputt“, „insects on the windscreen“ lösen nichts aus
const PEST_HINT = /(?<![a-zäöüß-])(?:bettwanze(?:n)?|bettwanzenbefall|bettwanzenbisse)(?![a-zäöüß])|(?<![a-zäöüß-])(?<!(?:keine|kein|keinerlei|ohne|no)\s+)(?:m(?:ä|ae)use(?:kot|dreck|köttel|koettel)?|maus(?:kot|dreck)|mausk(?:ö|oe)ttel|ratten(?:kot)?|ratte|ungeziefer|ungezieferbefall|wanzen|kakerlake(?:n)?|schaben|ameisen|fl(?:ö|oe)he|milben|maden|insekten|fliegen|wespen|wespennest)(?![a-zäöüß])\s+(?:\S+\s+){0,4}?(?:im|in\s+(?:der|dem|die|den|meiner|meinem)|unter\s+(?:der|dem)|hinter\s+(?:der|dem)|auf\s+(?:der|dem))\s+(?:\S+\s+)?(?:fahrerhaus\S*|f(?:ü|ue)hrerhaus\S*|kabine|fahrerkabine|schlafkabine|koje|liege|bett|matratze|bettzeug|schlafsack|staufach|staufächern|staufaechern|k(?:ü|ue)hlbox|k(?:ü|ue)hlschrank)(?![a-zäöüß])|(?<![a-zäöüß-])(?:fahrerhaus|f(?:ü|ue)hrerhaus|kabine|fahrerkabine|schlafkabine|koje|liege|matratze|bettzeug)(?![a-zäöüß])\s+(?:\S+\s+){0,4}?(?<!(?:keine|kein|keinerlei|ohne|no)\s+)(?:m(?:ä|ae)use(?:kot)?|mausk(?:ö|oe)ttel|ratten|ungeziefer|wanzen|kakerlaken|schaben|ameisen|fl(?:ö|oe)he|milben|maden)(?![a-zäöüß])|(?<![a-z-])(?:bed\s?bugs?|mouse\s+droppings|rat\s+droppings)(?![a-z])|(?<![a-z-])(?<!(?:keine|kein|keinerlei|ohne|no)\s+)(?:mice|mouse|rats?|cockroach(?:es)?|roaches|vermin|pests|ants|fleas|mites|maggots|insects|wasps?)\s+(?:\S+\s+){0,3}?in\s+(?:the\s+|my\s+)?(?:cab|cabin|bunk|sleeper(?:\s+cab)?|bed|mattress|bedding|storage\s+box(?:es)?|fridge)(?![a-z])|(?<![а-яіїєґ])(?:клоп\S*|блох\S*)|(?<![а-яіїєґ])(?:миш\S*|мыш\S*|щур\S*|пацюк\S*|крыс\S*|тарган\S*|таракан\S*|мурах\S*|муравь\S*|кліщ\S*|комах\S*|насеком\S*|паразит\S*)\s+(?:\S+\s+){0,3}?(?:в|у|на|під|под)\s+(?:\S+\s+)?(?:кабін\S*|кабин\S*|ліжк\S*|койк\S*|спальн\S*|матрац\S*|матрас\S*)/i;
// Backlog 727 (Blickwinkel „Wespen-, Hornissen- oder Bienennest am Fahrzeug, Stich“): Nest/Schwarm allein bzw. Tiere mit Ort am/im Fahrzeug
// (Spiegel, Plane, Aufbau, Staukasten, Tankdeckel, Fahrerhaus …) oder Stich; EN/UK/RU → eigene Schritte (Abstand, nicht selbst entfernen,
// Leitung entscheidet, Stich mit Atemnot/Schwellung → Notruf). „entfernt“, „ist weg“, „keine Wespen“, Insekten auf der Scheibe, „оси“ (Achsen) nicht.
const NEST_HINT = /(?<![a-zäöüß-])(?<!(?:kein|keine|keinerlei|ohne)\s+)(?:wespen|hornissen|bienen)[-]?(?:nest|nester|schwarm|volk)(?![a-zäöüß])(?![^.;!?]*(?:entfernt|beseitigt|weggemacht|umgesiedelt|(?:ist|sind|war|waren)\s+weg(?![a-zäöüß])|removed|gone|видал\S*|прибра\S*|удал\S*|убра\S*))|(?<![a-zäöüß-])(?<!(?:kein|keine|keinerlei|ohne)\s+)nest\s+(?:von\s+|mit\s+)?(?:wespen|hornissen|bienen)(?![a-zäöüß])(?![^.;!?]*(?:entfernt|beseitigt|weggemacht|umgesiedelt|(?:ist|sind|war|waren)\s+weg(?![a-zäöüß])|removed|gone|видал\S*|прибра\S*|удал\S*|убра\S*))|(?<![a-zäöüß-])(?<!(?:kein|keine|keinerlei|ohne)\s+)(?:wespe|wespen|hornisse|hornissen|biene|bienen)(?![a-zäöüß])(?![^.;!?]*(?:entfernt|beseitigt|weggemacht|umgesiedelt|(?:ist|sind|war|waren)\s+weg(?![a-zäöüß])|removed|gone|видал\S*|прибра\S*|удал\S*|убра\S*))\s+(?:\S+\s+){0,4}?(?:am|im|an\s+(?:der|dem|den)|in\s+(?:der|dem|den)|unter\s+(?:der|dem|den)|hinter\s+(?:der|dem|den)|auf\s+(?:der|dem)|aus\s+(?:der|dem|den))\s+(?:\S+\s+)?(?:(?:au(?:ß|ss)en|seiten|rampen|weitwinkel|front)?spiegel|spiegelgeh(?:ä|ae|a)use|aufbau|kofferaufbau|koffer|plane|stoßstange|sto(?:ß|ss)f(?:ä|ae|a)nger|k(?:ü|ue)hlergrill|grill|radkasten|kotfl(?:ü|ue)gel|staukasten|staufach|werkzeugkasten|batteriekasten|tankdeckel|tank|t(?:ü|ue)r|t(?:ü|ue)rrahmen|anh(?:ä|ae|a)nger|auflieger|dach|spoiler|windabweiser|rahmen|fahrerhaus|f(?:ü|ue)hrerhaus|kabine|fahrerkabine|lkw|fahrzeug|zugmaschine|trittstufe|einstieg|l(?:ü|ue)ftung|l(?:ü|ue)ftungsgitter|kabinendach)(?:s|es|n|en)?(?![a-zäöüß])|(?<![a-zäöüß-])(?:wespe|wespen|hornisse|hornissen|biene|bienen)(?![a-zäöüß])\s+(?:\S+\s+){0,3}?gestochen(?![a-zäöüß])|(?<![a-zäöüß-])gestochen\s+(?:\S+\s+){0,3}?(?:wespe|wespen|hornisse|hornissen|biene|bienen)(?:n)?(?![a-zäöüß])|(?<![a-z-])(?<!no\s+)(?:wasp|wasps|hornet|hornets|bee|bees)(?:['’]s?)?\s+(?:nest|nests|swarm|hive)(?![a-z])(?![^.;!?]*(?:entfernt|beseitigt|weggemacht|umgesiedelt|(?:ist|sind|war|waren)\s+weg(?![a-zäöüß])|removed|gone|видал\S*|прибра\S*|удал\S*|убра\S*))|(?<![a-z-])(?:nest|swarm)\s+of\s+(?:wasps|hornets|bees)(?![a-z])(?![^.;!?]*(?:entfernt|beseitigt|weggemacht|umgesiedelt|(?:ist|sind|war|waren)\s+weg(?![a-zäöüß])|removed|gone|видал\S*|прибра\S*|удал\S*|убра\S*))|(?<![a-z-])(?<!no\s+)(?:wasps?|hornets?|bees)(?![a-z])(?![^.;!?]*(?:entfernt|beseitigt|weggemacht|umgesiedelt|(?:ist|sind|war|waren)\s+weg(?![a-zäöüß])|removed|gone|видал\S*|прибра\S*|удал\S*|убра\S*))\s+(?:\S+\s+){0,3}?(?:in|on|under|behind|inside|around|from)\s+(?:the\s+|my\s+)?(?:(?:side|wing|door)\s+)?(?:mirrors?|cab|cabin|trailer|body|tarp|bumper|grille|toolbox|tool\s+box|fuel\s+cap|tank|door|roof|vent|truck|vehicle)(?![a-z])|(?<![a-z-])stung\s+(?:\S+\s+){0,2}?by\s+(?:a\s+)?(?:wasps?|hornets?|bees?)(?![a-z])|(?<![а-яіїєґё])(?:гнізд|гнезд)\S*\s+(?:\S+\s+)?(?:ос|шершн\S*|бджіл|бджол\S*|пчел\S*)(?![а-яіїєґё])(?![^.;!?]*(?:entfernt|beseitigt|weggemacht|umgesiedelt|(?:ist|sind|war|waren)\s+weg(?![a-zäöüß])|removed|gone|видал\S*|прибра\S*|удал\S*|убра\S*))|(?<![а-яіїєґё])(?:осин|шершнев|бджолин|пчелин)\S*\s+(?:гнізд|гнезд|рі|ро)\S*|(?<![а-яіїєґё])(?:рій|рой)\s+(?:бджіл|бджол\S*|пчел\S*|ос|шершн\S*)(?![а-яіїєґё])|(?<![а-яіїєґё])(?:оса|оси(?=\s+(?:в|у)\s)|шершн\S*|бджол\S*|бджіл|пчел\S*)\s+(?:\S+\s+){0,3}?(?:в|у|на|під|под|за|із|з|из)\s+(?:\S+\s+)?(?:дзеркал\S*|зеркал\S*|кабін\S*|кабин\S*|причеп\S*|прицеп\S*|кузов\S*|бампер\S*|ящик\S*|тент\S*|двер\S*)|(?<![а-яіїєґё])(?:вжалил\S*|ужалил\S*|вкусил\S*|покусал\S*)\s+(?:\S+\s+){0,2}?(?:оса|оси|шершн\S*|бджол\S*|пчел\S*)/i;
// Wespen-/Hornissenwörter, damit „Wespen im Fahrerhaus“ nicht zusätzlich die Ungeziefer-Schritte zeigt (Mäuse daneben bleiben erkannt)
const NEST_WORDS = /(?<![a-zäöüß-])(?:wespe|wespen|wespennest|hornisse|hornissen|hornissennest)(?![a-zäöüß])|(?<![a-z-])(?:wasps?)(?![a-z])/gi;
const CONTOUR_HINT = /(?<![a-zäöüß-])(?:kontur(?:markierung|markierungsstreifen|streifen|folie)(?:en)?|warnmarkierung(?:en)?|reflex(?:streifen|folie|folien)|reflektor(?:streifen|folie|folien|en)?|r(?:ü|ue|u)ckstrahler(?:n|s)?|seitenr(?:ü|ue|u)ckstrahler(?:n|s)?|katzenaugen?|(?:park-?)?warntafel(?:n)?|heckmarkierung(?:en|stafel|stafeln)?|markierungstafel(?:n)?)(?![a-zäöüß])\s+(?:(?:sind|ist|wurde|wurden|am|an|auf|der|die|das|dem|den|hinten|seitlich|links|rechts|heck|seite|lkw|auflieger|anh(?:ä|ae)nger|zugmaschine|komplett|teilweise|stark|total|ganz|schon|seit|heute|gestern|halb|mehrere|einige|alle|zwei|beide|wieder|fast|sehr)[,;]?\s+){0,3}(?:fehl(?:t|en)|weg(?![a-zäöüß])|abgerissen|abgefallen|abgel(?:ö|oe)st|l(?:ö|oe)s(?:t|en)\s+sich|lose(?![a-zäöüß])|locker(?![a-zäöüß])|h(?:ä|ae)ng(?:t|en)\s+(?:herunter|runter|lose|ab|schief)|besch(?:ä|ae|a)digt|kaputt|defekt|zerbrochen|gebrochen|verbogen|eingerissen|zerkratzt|verschmutzt|verdreckt|dreckig|verblasst|abgeschabt|abgefahren|flatter(?:t|n)|nicht\s+(?:mehr\s+)?(?:zu\s+sehen|erkennbar|sichtbar|vorhanden|da(?![a-zäöüß])))(?![a-zäöüß])(?![,;.]?\s+(?:\S+\s+)?(?:wieder\s+(?:da|dran|fest|angebracht)|ersetzt|erneuert|repariert|geklebt|angebracht|gereinigt|sauber|befestigt|getauscht|erledigt|ok(?![a-zäöüß])|in\s+ordnung|nachbestellt|bestellt))|(?<![a-zäöüß-])(?:fehlende[nmrs]?|abgerissene[nmrs]?|abgefallene[nmrs]?|besch(?:ä|ae|a)digte[nmrs]?|kaputte[nmrs]?|lose[nmrs]?|verschmutzte[nmrs]?|verdreckte[nmrs]?|keine|kein)\s+(?:\S+\s+)?(?:kontur(?:markierung|markierungsstreifen|streifen|folie)(?:en)?|warnmarkierung(?:en)?|reflex(?:streifen|folie|folien)|reflektor(?:streifen|folie|folien|en)?|r(?:ü|ue|u)ckstrahler(?:n|s)?|seitenr(?:ü|ue|u)ckstrahler(?:n|s)?|katzenaugen?|(?:park-?)?warntafel(?:n)?|heckmarkierung(?:en|stafel|stafeln)?|markierungstafel(?:n)?)(?![a-zäöüß])(?!\s+(?:\S+\s+)?(?:n(?:ö|oe)tig|erforderlich|vorgeschrieben|angebracht|bestellt|ersetzt|erneuert))|(?<![a-z])(?<!(?:headlight|headlamp|lamp|light)\s)(?:conspicuity\s+(?:tape|markings?|strips?)|reflective\s+(?:tape|strips?|markings?)|reflector\s+(?:tape|strips?)|reflectors?|rear\s+marker\s+(?:boards?|plates?)|marker\s+boards?|warning\s+(?:boards?|plates?))\s+(?:(?:is|are|on|the|rear|side|left|right|trailer|truck|partly|completely|badly|half|all|some|now)\s+){0,3}(?:missing|gone|torn\s+off|ripped\s+off|came\s+off|fell\s+off|peeling|coming\s+off|loose|hanging\s+(?:off|down)|damaged|broken|cracked|dirty|faded|not\s+visible)(?![a-z])(?!\s+(?:\S+\s+)?(?:replaced|fixed|repaired|cleaned|ok(?![a-z])))|(?<![a-z])(?:missing|damaged|broken|torn|dirty|faded|no)\s+(?:(?!headlight|headlamp|lamp|light)[a-z]+\s+)?(?:conspicuity\s+(?:tape|markings?|strips?)|reflective\s+(?:tape|strips?|markings?)|reflector\s+(?:tape|strips?)|reflectors?|rear\s+marker\s+(?:boards?|plates?)|marker\s+boards?|warning\s+(?:boards?|plates?))(?![a-z])|(?<![а-яіїєґё])(?:світловідбивн|светоотражающ|световозвращающ|катафот|світлоповертач|контурн\S*\s+(?:маркуван|маркировк))(?!\S*\s+(?:жилет|желет))\S*\s+(?:\S+\s+){0,3}?(?:немає|нема(?![а-яіїєґё])|нет(?![а-яіїєґё])|відсутн|отсутств|відірван|відірвал|оторван|оторвал|відклеї|відклеє|отклеи|отклее|відпа|отпа|пошкоджен|поврежден|зламан|сломан|брудн|грязн|не\s+видно|звиса|теліпа)|(?<![а-яіїєґё])(?:немає|нема|нет|бракує|відсутн\S*|відірван\S*|оторван\S*|пошкоджен\S*|поврежден\S*|брудн\S*|грязн\S*)\s+(?:\S+\s+)?(?:світловідбивн|светоотражающ|световозвращающ|катафот|світлоповертач|контурн\S*\s+(?:маркуван|маркировк))(?!\S*\s+(?:жилет|желет))\S*/i;
// Backlog 308 (Blickwinkel „Spiegel abgefahren“): Haupt-/Weitwinkel-/Rampen-/Frontspiegel abgefahren, gebrochen, fehlt, hängt – ohne Spiegel nicht
// weiterfahren, Fremdschaden wie Unfall, Leitung, Fotos, Fahrbereitschaft; „Ölspiegel“, „Spiegelei“, „Spiegel in Ordnung“ lösen nichts aus
const MIRROR_HINT = /(?<![a-zäöüß])(?:außen|aussen|haupt|weitwinkel|rampen|front|seiten|bordstein|anfahr|r(?:ü|ue|u)ck)?spiegel(?:glas|halter|arm|kopf|gehäuse)?\s+(?:\S+\s+){0,3}?(?:abgefahren|abgerissen|abgebrochen|abgeknickt|ab(?![a-zäöüß])|kaputt|defekt|gebrochen|zerbrochen|gesprungen|gerissen|besch(?:ä|ae|a)digt|fehlt|weg(?![a-zäöüß])|lose|locker|h(?:ä|ae|a)ngt|wackelt|verstellt\S*|l(?:ä|ae|a)(?:ss|ß)t\s+sich\s+nicht)|(?:abgefahren|abgerissen|abgebrochen|kaputt|zerbrochen|gesprungen|besch(?:ä|ae|a)digt)e[nmrs]?\s+(?:\S+\s+)?(?:außen|aussen|haupt|weitwinkel|rampen|front|seiten)?spiegel|spiegel\s+(?:\S+\s+){0,3}?(?:touchiert|gestreift|angefahren|mitgenommen)|(?<![a-z])(?:(?:wing|side|door|wide[- ]angle|kerb|curb|front|main|class\s+(?:ii|iv|v|vi))\s+)?mirrors?\s+(?:\S+\s+){0,3}?(?:broken|broke|smashed|cracked|knocked\s+off|ripped\s+off|torn\s+off|snapped|missing|hanging|loose|damaged|gone|bent|won['’]?t\s+adjust)|(?:broken|smashed|cracked|damaged|missing|bent)\s+(?:\S+\s+)?mirrors?|(?:hit|clipped|knocked|caught)\s+(?:\S+\s+){0,2}?mirrors?|(?<![а-яіїєґ])дзеркал\S*\s+(?:\S+\s+){0,3}?(?:збит|зламан|зламал|розбит|відірв|тріснул|тріснуло|пошкод|нема|відпал|бовта|теліпа|не\s+регулю)|(?<![а-яіїєґ])зеркал\S*\s+(?:\S+\s+){0,3}?(?:сбит|сломан|сломал|разбит|оторв|треснул|поврежд|нет(?![а-яіїєґ])|отвал|болта|не\s+регулир)|(?:збив|збили|зламав|розбив|відірвав|зачепив|сбил|сломал|разбил|оторвал|зацепил)\S*\s+(?:\S+\s+)?(?:дзеркал|зеркал)/i;
// Backlog 309 (Blickwinkel „Auflieger lässt sich nicht sicher kuppeln oder hat sich gelöst“): Sattelkupplung/Königszapfen/Anhängerkupplung rastet nicht
// ein, Auflieger lässt sich nicht (an)kuppeln, hat sich unterwegs gelöst – nicht losfahren, Stelle sichern, gegen Wegrollen sichern, Leitung, Fotos, Fahrbereitschaft.
// „Kupplung rutscht“ (Pkw-/Lkw-Kupplung), „Auflieger angekuppelt“, „Sattelkupplung abgeschmiert“, „сідельний тягач“ (Zugmaschine) lösen nichts aus
const COUPLING_HINT = /(?<![a-zäöüß])(?:sattelkupplung|königszapfen|koenigszapfen|zugmaul|anhängerkupplung|anhaengerkupplung|kupplungsverriegelung|st(?:ü|ue|u)tzwinde|st(?:ü|ue|u)tzf(?:ü|ue|u)(?:ß|ss)e?|st(?:ü|ue|u)tzbeine|kurbelst(?:ü|ue|u)tze|st(?:ü|ue|u)tzen(?![a-zäöüß]))\S*\s+(?:\S+\s+){0,3}?(?:rastet\s+nicht|nicht\s+(?:\S+\s+)?(?:eingerastet|verriegelt|geschlossen|zu(?![a-zäöüß]))|verriegelt\s+nicht|schlie(?:ß|ss)t\s+nicht|schlie(?:ß|ss)t\s+schwer|hakt|klemm(?:t|en)|defekt|kaputt|gebrochen|ausgeschlagen|lose(?![a-zäöüß])|locker|offen|l(?:ä|ae|a)(?:ss|ß)t\s+sich\s+nicht|lassen\s+sich\s+nicht|abgebrochen|verbogen|geht\s+nicht|gehen\s+nicht)|(?<![a-zäöüß])(?:auflieger|anhänger|anhaenger|trailer)\s+(?:\S+\s+){0,3}?(?:l(?:ä|ae|a)(?:ss|ß)t\s+sich\s+nicht\s+(?:\S+\s+)?(?:an|ab|auf|ein)?(?:kuppeln|satteln)|nicht\s+(?:richtig\s+|sicher\s+)?(?:angekuppelt|gekuppelt|eingerastet|verriegelt|aufgesattelt)|hat\s+sich\s+(?:\S+\s+){0,3}?(?:gel(?:ö|oe|o)st|abgekuppelt|losgerissen)|losgerissen|abgesackt)|(?<![a-zäöüß])(?:an|ab|auf)?(?:kuppeln|satteln)\s+(?:\S+\s+){0,2}?(?:geht|klappt|funktioniert)\s+nicht|(?<![a-z])(?:fifth[- ]wheel|king[- ]?pin|coupling\s+(?:jaws?|lock)|landing\s+(?:legs?|gear))\s+(?:\S+\s+){0,3}?(?:won['’]?t|will\s+not|doesn['’]?t|does\s+not|not\s+(?:locked|closed|closing|engaged)|stuck|jammed|broken|damaged|open|loose|faulty)|(?<![a-z])trailer\s+(?:\S+\s+){0,3}?(?:won['’]?t|will\s+not|doesn['’]?t|does\s+not|cannot|can['’]?t)\s+(?:\S+\s+)?(?:couple|uncouple|hook\s+up|lock)|(?<![a-z])trailer\s+(?:\S+\s+){0,2}?(?:came|come|has\s+come|became)\s+(?:loose|uncoupled|unhitched|detached|off)|(?:can['’]?t|cannot|could\s+not|couldn['’]?t)\s+(?:\S+\s+)?(?:couple|uncouple|hitch|unhitch)\s+(?:\S+\s+)?trailer|(?<![а-яіїєґ])(?:(?:сідл[оауі]|седл[оау])(?!\s+(?:водія|водителя))|сідельн\S*\s+(?:пристр|зчіп)\S*|шкворн\S*|шкворень|опорн\S*\s+(?:стійк|ног|лап)\S*|седельн\S*\s+(?:устройств|сцеп)\S*|опорн\S*\s+стойк\S*)\s+(?:\S+\s+){0,3}?(?:не\s+(?:\S+\s+)?(?:закрива|зачіпа|фіксу|защіпа|закрыва|цепля|фиксир|защелк)|зламан|пошкодж|заклин|відкрит|розбовта|слома|поврежд|открыт|разболта)|(?<![а-яіїєґ])(?:напівпричіп|напівпричеп|причіп|причеп|полуприцеп|прицеп)\S*\s+(?:\S+\s+){0,3}?(?:не\s+(?:\S+\s+)?(?:зчіплю|зчеплю|чіпля|зачіпа|причепи|сцепля|цепля|прицеп)|відчепив|від'єднав|відірвав|отцепил|оторвал)|(?<![а-яіїєґ])(?:опор\S*|стійк\S*)\s+(?:напівпричеп\S*|причеп\S*|полуприцеп\S*)\s+(?:\S+\s+)?(?:не\s+опуска\S*|не\s+підніма\S*|не\s+поднима\S*|не\s+крут\S*|заклин\S*|злама\S*|слома\S*)/i;
// Backlog 310 (Blickwinkel „Beleuchtung am Lkw/Auflieger ausgefallen“): Scheinwerfer/Rück-/Bremslicht/Blinker/Leuchte ausgefallen, defekt, flackert –
// anhalten bei Dunkelheit, Stecker/Kabel nur gefahrlos, Leitung, Fotos, Fahrbereitschaft. Warn-/Kontrollleuchten („Warnleuchte leuchtet“, „warning light
// not working“), „Licht im Kühlraum“-Fragen ohne Defektwort, „Licht an“, „Lichtmaschine“ lösen nichts aus
// Backlog 343 (Fehlersuche): auch Stoppleuchte/Stopplicht, Warnblinker/Warnblinkanlage (auch „аварійка/аварийка не працює“), Umriss-/Kennzeichenleuchte und
// schnell blinkender Blinker (Lampe ausgefallen); „Warnblinker an“, „аварійка увімкнена“ nicht
// Backlog 349: auch Licht, das während der Fahrt/plötzlich/immer wieder ausgeht; „Licht geht aus, wenn ich abschließe“ nicht
const LIGHTS_HINT = /(?<![a-zäöüß])(?:stoppleuchte|stopplicht|warnblinker|warnblinkanlage|warnblinklicht|umrissleuchte|kennzeichenleuchte|blinkleuchte|rundumkennleuchte|rundumleuchte|rundumlicht|blitzleuchte|arbeitsscheinwerfer|arbeitsleuchte|arbeitslicht|zusatzscheinwerfer|scheinwerfer|abblendlicht|fernlicht|r(?:ü|ue|u)cklicht|ruecklicht|bremslicht|blinker|rückleuchte|bremsleuchte|schlussleuchte|schlusslicht|beleuchtung|licht|lichter|leuchte|lampe|begrenzungsleuchte|positionsleuchte|seitenmarkierungsleuchte|nebelschlussleuchte|kennzeichenbeleuchtung|rückfahrscheinwerfer)(?:n|s|e)?\s+(?:\S+\s+){0,6}?(?:ausgefallen|fällt\s+aus|fallen\s+aus|geht\s+nicht|gehen\s+nicht|funktioniert\s+nicht|funktionieren\s+nicht|brennt\s+nicht|brennen\s+nicht|leuchtet\s+nicht|defekt|kaputt|flackert|flackern|zerbrochen|gebrochen|durchgebrannt|blinkt\s+(?:\S+\s+){0,2}?schnell(?:er)?(?![a-zäöüß])|(?:geht|gehen|ging|gingen)\s+(?:\S+\s+){0,3}?(?:fahrt|pl(?:ö|oe|o)tzlich|immer|zwischendurch|zeitweise|manchmal)\S*\s+(?:\S+\s+)?aus(?![a-zäöüß]))|(?:defekte?[nmrs]?|kaputte?[nmrs]?|ausgefallene?[nmrs]?|zerbrochene?[nmrs]?)\s+(?:\S+\s+)?(?:rundumkennleuchte|rundumleuchte|rundumlicht|blitzleuchte|arbeitsscheinwerfer|arbeitsleuchte|arbeitslicht|zusatzscheinwerfer|scheinwerfer|abblendlicht|r(?:ü|ue|u)cklicht|ruecklicht|bremslicht|blinker|rückleuchte|bremsleuchte|schlussleuchte|beleuchtung|leuchte|lampe)|(?<![a-z])(?<!(?:warning|engine|dash|dashboard|check|reefer|indicator)\s)(?:(?:rotating\s+|amber\s+|warning\s+)?beacons?|work\s*lights?|spot\s*lights?|head\s*lights?|head\s*lamps?|dipped\s+beam|tail\s*lights?|rear\s+lights?|brake\s+lights?|stop\s+lights?|indicators?|turn\s+signals?|blinkers?|side\s*lights?|marker\s+lights?|lights?|lamps?|bulbs?)\s+(?:\S+\s+){0,3}?(?:out(?![a-z])|not\s+working|doesn['’]?t\s+work|don['’]?t\s+work|isn['’]?t\s+working|aren['’]?t\s+working|failed|broken|flickering|dead|smashed|blown)|(?<![а-яіїєґ])(?:аварійк\S*|аварийк\S*|маячок|маячк\S*|мигалк\S*|проблисков\S*|фар[аиуі]?|габарит\S*|стоп-?сигнал\S*|поворотник\S*|ліхтар\S*|фонар\S*|світло|освітлення|свет|освещение|лампочк\S*|лампа)(?![а-яіїєґ])\s+(?:\S+\s+){0,3}?(?:не\s+(?:\S+\s+)?(?:працю|світ|горить|горит|работа|свет|блима|мига)|згорі|згоріл|перегор|розбит|разбит|блима|мигает|мерехт)|(?<![а-яіїєґ])не\s+(?:працю|світ|горить|горит|работа|свет)\S*\s+(?:\S+\s+)?(?:аварійк\S*|аварийк\S*|маячок|маячк\S*|мигалк\S*|фар[аиуі]?|габарит\S*|стоп-?сигнал\S*|поворотник\S*|ліхтар\S*|фонар\S*|світло|свет|лампочк\S*|лампа)(?![а-яіїєґ])/i;
// Backlog 295 (Blickwinkel „Falsch getankt – AdBlue im Dieseltank“): Fehlbetankung → Hinweise (Motor nicht starten/sofort abstellen, nicht
// weiterfahren, Leitung veranlasst Abpumpen/Abschleppen, Menge laut Tankbeleg + Foto, „nicht fahrbereit“) – reine Information, keine Frist, keine Literangabe.
// „AdBlue nachgefüllt“, „AdBlue-Warnung“, „Diesel getankt“, „falsch geparkt“, „Заправив AdBlue“ lösen nichts aus
// Backlog 311 (Blickwinkel „Tür/Ladebordwand/Hecktür schließt nicht“): Heck-/Seiten-/Fahrertür schließt nicht, klemmt, springt auf, Ladebordwand
// fährt nicht hoch/hängt herunter, Türverriegelung defekt – nicht losfahren, unterwegs anhalten und sichern (nichts mit Gewalt schließen, nicht in den
// Schwenkbereich treten), Leitung, Fotos, Fahrbereitschaft. „Tür eingedrückt“ (Schaden), „Tür aufgebrochen“ (Diebstahl), „Rolltor beim Kunden klemmt“,
// „Türdichtung undicht“, „door dented“, „Двері пошкоджені“ lösen nichts aus
const DOOR_HINT = /(?<![a-zäöüß])(?:(?:heck|lade|seiten|schiebe|flügel|fluegel|fahrer|beifahrer|koffer|kühl|kuehl|auflieger|anhänger)?(?:tür|tuer|tur)(?:en|e)?|palettenk(?:a|ä|ae)sten(?:klappe|deckel|schloss|tür)?|ladebordwand|hebebühne|hubladebühne|ladebühne|ladeklappe|bordwand|bordwände|heckklappe|türverriegelung|türschloss|türverschluss|drehstangenverschluss)\s+(?:\S+\s+){0,3}?(?:(?:schlie(?:ß|ss)t|schliesst|schließen|schliessen|rastet|rasten|verriegelt)\s+(?:\S+\s+)?nicht(?![a-zäöüß])|(?:geht|gehen|l(?:ä|ae|a)(?:ss|ß)t\s+sich|lassen\s+sich|ist|sind|fährt|fahren|klappt|klappen)\s+(?:\S+\s+)?nicht\s+(?:mehr\s+|richtig\s+|ganz\s+)?(?:zu(?![a-zäöüß])|auf(?![a-zäöüß])|schließen|schliessen|öffnen|verriegeln|abschließen|hoch(?![a-zäöüß])|runter|herunter|ein(?![a-zäöüß])|ein(?:klappen|fahren)|hochklappen|hochfahren|geschlossen|verriegelt|eingerastet))|(?<![a-zäöüß])(?:(?:heck|lade|seiten|schiebe|flügel|fahrer|beifahrer|koffer|kühl|auflieger|anhänger)?(?:tür|tuer|tur)(?:en|e)?|palettenk(?:a|ä|ae)sten(?:klappe|deckel|schloss|tür)?|ladebordwand|hebebühne|hubladebühne|ladebühne|ladeklappe|bordwand|heckklappe)\s+(?:\S+\s+){0,3}?(?:klemmt|klemmen|steht\s+(?:\S+\s+)?offen|stehen\s+(?:\S+\s+)?offen|springt\s+(?:\S+\s+){0,3}?auf|springen\s+(?:\S+\s+){0,3}?auf|h(?:ä|ae|a)ngt\s+(?:\S+\s+)?(?:herunter|runter|herab)|nicht\s+(?:richtig\s+|ganz\s+|mehr\s+)?(?:zu(?![a-zäöüß])|geschlossen|verriegelt|eingerastet|abschließbar))|(?<![a-zäöüß])(?:(?:heck|lade|seiten|schiebe|flügel|fluegel|fahrer|beifahrer|koffer|kühl|kuehl|auflieger|anhänger)?(?:tür|tuer|tur)(?:en|e)?(?![a-zäöüß])|palettenk(?:a|ä|ae)sten(?:klappe|deckel|schloss|tür)?|ladebordwand|hebebühne|hubladebühne|ladebühne|türverriegelung|türschloss|türverschluss|drehstangenverschluss)\S*\s+(?:\S+\s+){0,2}?(?:defekt|kaputt|ausgefallen|gebrochen)|(?<![a-z])(?:(?:rear|back|side|cargo|trailer|cab|driver['’]?s?|passenger|barn)\s+)?(?:pallet\s+(?:box|chest)|doors?|tail\s*-?lift|lift\s*-?gate|tail\s*-?gate|door\s+(?:lock|latch)|latch)\s+(?:\S+\s+){0,3}?(?:(?:won['’]?t|will\s+not|doesn['’]?t|does\s+not|can['’]?t|cannot|can\s+not)\s+(?:\S+\s+)?(?:close|shut|lock|latch|open|go\s+(?:up|down)|fold|raise|lower)|(?:is|are)?\s*not\s+(?:closing|locking|latching|closed|locked|shut|opening)|stuck|jammed|(?:keeps\s+)?(?:flying|swinging|popping|came|coming)\s+open|hanging\s+down|broken|faulty)|(?<![а-яіїєґ])(?:ящик\S*\s+для\s+(?:піддон|палет)\S*|двер\S*|дверцят\S*|гідроборт\S*|гидроборт\S*|борт(?![а-яіїєґ])|задній\s+борт|замок\s+двер\S*)\s+(?:\S+\s+){0,3}?(?:не\s+(?:\S+\s+)?(?:закрива|зачиня|закри|зачин|відкрива|відчиня|откры|закры|опуска|підійма|підніма|поднима|працю|работа|фіксу|фиксир)|заклин\S*|заїло|заело|відчинил\S*\s+на\s+ходу|відкрил\S*\s+на\s+ходу|открыл\S*\s+на\s+ходу)|(?<![a-zäöüß-])(?:ladebordwand|hebebühne|hubladebühne|ladebühne)\s+(?:\S+\s+){0,3}?(?:geht\s+(?:\S+\s+)?nicht(?![a-zäöüß])|funktioniert\s+(?:\S+\s+)?nicht|senkt\s+sich\s+(?:\S+\s+)?(?:ab|von\s+selbst)|sackt\s+(?:\S+\s+)?ab)(?!\s+(?:\S+\s+)?(?:wieder|behoben|repariert))|(?<![a-z-])(?:tail\s*-?lift|lift\s*-?gate)\s+(?:\S+\s+){0,3}?(?:not\s+working|isn['’]?t\s+working|doesn['’]?t\s+work|dead|failed|dropping|drops|sinking|keeps\s+(?:dropping|sinking))(?![a-z])|(?<![a-zäöüß-])(?:ladebordwand|hebebühne|hubladebühne|ladebühne)\s+(?:\S+\s+){0,3}?(?:fehler\S*|st(?:ö|oe|o)rung|piept|warnton|blinkt|ohne\s+funktion|reagiert\s+(?:\S+\s+)?nicht)(?![a-zäöüß])(?!\s+(?:\S+\s+)?(?:behoben|beseitigt|repariert|weg(?![a-zäöüß])|quittiert|gel(?:ö|oe)scht))|(?<![a-z-])tail\s?lift\s+(?:\S+\s+){0,3}?(?:fault\S*|error\S*|beep\S*|not\s+working|broken|stuck)|(?<![a-zäöüß-])(?:rolltor|rollt(?:ü|ue)r|rollladen|rolltore|rollt(?:ü|ue)ren)(?![a-zäöüß])(?![^.;!?]*(?:kunde\S*|halle|lager\S*|rampe|firma|depot|customer|warehouse))(?![^.;!?]*(?:repariert|getauscht|erneuert|behoben|gewechselt|wieder\s+in\s+ordnung|fixed|repaired|replaced|відремонт\S*|замінен\S*|отремонт\S*|заменен\S*))\s+(?:\S+\s+){0,3}?(?:klemmt|klemmen|h(?:ä|ae|a)ngt|defekt|kaputt|(?:geht|gehen|l(?:ä|ae)sst\s+sich)\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:auf|zu|hoch|runter|(?:ö|oe)ffnen|schlie(?:ß|ss)en))(?![a-zäöüß])|(?<![a-z])(?:roller\s+shutter|roll-?up\s+door)s?\s+(?:\S+\s+){0,2}?(?:stuck|jammed|broken|won['’]?t\s+(?:open|close))/i;
// Backlog 312 (Blickwinkel „Lkw festgefahren oder kommt bei Glätte nicht weiter“): festgefahren, steckt im Schnee/Schlamm fest, Räder drehen durch,
// kommt die Steigung nicht hoch – nicht mit Gewalt freifahren, Stelle sichern, Schneeketten nur unterwiesen und abseits des Verkehrs, Leitung entscheidet über
// Bergung, Fotos/Ort, Fahrbereitschaft. „Radmutter sitzt fest“, „Schlüssel steckt“, „Tür klemmt“, „door got stuck“, „Kupplung rutscht“ lösen nichts aus
const STUCK_HINT = /festgefahren|steckengeblieben|stecken\s+geblieben|(?<![a-zäöüß])eingesunken|(?<![a-zäöüß])(?:lkw|fahrzeug|auflieger|anhänger|anhaenger|zugmaschine|sattelzug|zug|wagen|ich|wir)\s+(?:\S+\s+){0,4}?(?:steckt|stecke|stecken|sitzt|sitze|sitzen|h(?:ä|ae|a)ngt|hänge|h(?:ä|ae|a)ngen)\s+(?:\S+\s+){0,3}?fest(?![a-zäöüß])|(?<![a-zäöüß])(?:im|in\s+der|in\s+den|auf\s+der)\s+(?:schlamm|matsch|schnee|graben|sand|acker|wiese|böschung|baustelle)\s+(?:\S+\s+){0,2}?(?:fest(?![a-zäöüß])|eingesunken|stecken)|(?<![a-zäöüß])(?:räder|reifen|antriebsräder)\s+(?:\S+\s+){0,2}?drehen\s+(?:\S+\s+)?durch|(?<![a-zäöüß])(?:komme|kommt|kommen|schaffe|schafft|schaffen)\s+(?:\S+\s+){0,4}?(?:berg|steigung|hang|rampe|auffahrt|anstieg)\s+(?:\S+\s+){0,3}?nicht\s+(?:mehr\s+)?(?:hoch|rauf|hinauf)(?![a-zäöüß])|(?<![a-z])(?:stuck|bogged\s+down|sunk)\s+in\s+(?:the\s+)?(?:snow|mud|ditch|sand|ice|field|verge|soft\s+ground)|(?<![a-z])(?:truck|lorry|vehicle|trailer|tractor|rig|we|we['’]?re|i['’]?m|i\s+am)\s+(?:is\s+|are\s+|am\s+|got\s+|get\s+|have\s+got\s+)?(?:stuck|bogged\s+down)(?![a-z])|(?<![a-z])wheels?\s+(?:are\s+|keep\s+)?spinning|(?<![a-z])can['’]?t\s+(?:get|make\s+it)\s+up\s+the\s+(?:hill|ramp|slope|incline)|(?<![а-яіїєґ])(?<!(?:ключ|ключі)\S*\s+(?:\S+\s+)?)(?:застря\S*(?!\s+(?:\S+\s+)?(?:в|у)\s+(?:замку|замке|запалюван|зажиган))|(?<!(?:зчеплення|сцеплени[ея])\s+(?:\S+\s+)?)(?:забукс|буксу)[^\s.,;:!?]*(?![^\s.,;:!?])(?!\s+(?:\S+\s+)?(?:зчеплення|сцеплени))|грузов\S*\s+сів\S*)|не\s+(?:можу|може|можемо|могу|может)\s+(?:\S+\s+)?(?:виїхати|выехать|піднятися|подняться|заїхати|заехать)\s+(?:\S+\s+){0,2}?(?:на\s+)?(?:гор\S*|підйом\S*|подъем\S*|пандус\S*|снігу|снегу|бруд\S*|гряз\S*|багн\S*)|(?<![a-zäöüß-])(?:im|in\s+den|in\s+einen|im\s+stra(?:ß|ss)en)\s*graben(?![a-zäöüß])|(?<![a-zäöüß-])(?:ins|im|vom)\s+bankett\s+(?:\S+\s+)?(?:abgerutscht|gerutscht|eingesunken|eingesackt|festgefahren|steckt)|(?<![a-z])(?:in|into)\s+(?:a|the)\s+ditch(?![a-z])|(?<![а-яіїєґё])(?:у|в)\s+кювет\S*/i;
const FUEL_HINT = /falsch\s+(?:\S+\s+){0,2}?(?:getankt|betankt)|falsche[nmrs]?\s+(?:kraftstoff|sprit|treibstoff)|fehlbetank|(?:adblue|harnstoff|adblau)\S*\s+(?:\S+\s+){0,3}?(?:in\s+den|in|im|ins|statt|anstatt)\s+(?:\S+\s+)?(?:diesel|kraftstoff)|benzin\S*\s+(?:\S+\s+){0,3}?(?:in\s+den|im|ins)\s+(?:\S+\s+)?(?:diesel|kraftstoff|tank)|diesel\s+(?:\S+\s+){0,3}?(?:in\s+den|in|im|ins|statt|anstatt)\s+(?:\S+\s+)?(?:adblue|harnstoff)|(?:benzin|super(?:\s+e10)?)\s+(?:statt|anstatt)\s+diesel|benzin\s+getankt|wrong\s+fuel|mis-?fuel|(?:filled|fuelled|fueled)\s+(?:\S+\s+){0,2}?with\s+(?:petrol|gasoline)|(?:adblue|def|petrol|gasoline)\s+(?:\S+\s+){0,2}?in(?:to)?\s+(?:the\s+)?(?:diesel|fuel)[\s-]?tank|adblue\s+(?:\S+\s+)?instead\s+of\s+diesel|diesel\s+(?:\S+\s+){0,2}?in(?:to)?\s+(?:the\s+)?(?:adblue|def)[\s-]?tank|(?:залив|залил|заправи|заправил)\S*\s+(?:\S+\s+){0,3}?(?:не\s+т[еоу]|неправильн|бензин)|неправильн\S*\s+(?:пальн|палив|топлив)|(?:adblue|адбл(?:ю|у)\S*|бензин\S*|сечовин\S*|мочевин\S*)\s+(?:\S+\s+){0,2}?(?:в|у)\s+(?:дизельн\S*|паливн\S*|топливн\S*)\s+бак|(?:дизель|дизпалив|солярк|соляр)\S*\s+(?:\S+\s+){0,2}?(?:в|у)\s+(?:бак\s+)?(?:для\s+)?(?:adblue|адбл(?:ю|у)\S*|сечовин\S*|мочевин\S*)/i;
// + russ. „карта водителя“ (Backlog 230)
// Backlog 569: dieselbe Erkennung blendet im Vorgang für die Leitung den Hinweis „Gerät → Werkstatt, Karte → Ersatzkarte in der Fahrerakte“ ein (Link zur Akte des Melders)
// Backlog 568 (Blickwinkel „Fahrerkarte defekt/verloren“): + „водійська картка“, „тахокарта“, „карта водія“, „Fahrer-Karte“, „driver’s card“ (nicht „Tankkarte“)
const TACHO_HINT = /fahrtenschreiber|fahrtschreiber|tachogra(?:ph|f)|kontrollger(?:ä|ae|a)t|fahrer-?karte|driver(?:['’]?s)? ?card|tacho(?!meter)|тахограф|тахокарт|водійськ\S*\s+картк|картк\S*\s+водія|карт[аиуі]\s+водія|карт\S* водител/i;
// Backlog 285: „N Tage später gemeldet“ (Berliner Kalendertage zwischen Schadentag und Meldung) und Fahrer laut Zuordnung/Kontrolle (nur Leitung)
// Backlog 306: Passen mehrere Hinweise zur Beschreibung (z. B. „Unfall, Reifen geplatzt, Öl läuft aus“), stand bisher eine lange Kette
// gleichrangiger Kästen über der Dringlichkeit. Jetzt: Reihenfolge nach Gefahr für Leib und Leben/Verkehr, der wichtigste Hinweis offen,
// die weiteren nur mit Titel und „Schritte anzeigen“; von Hand Aufgeklapptes bleibt beim Weitertippen offen. Ein einzelner Hinweis bleibt unverändert.
// Backlog 315 (Blickwinkel „Fahrerassistenzsystem fällt aus oder bremst grundlos“): Notbrems-/Abbiege-/Spurhalteassistent, Kamera/Spiegelersatz
// gestört oder Phantombremsung → Hinweise (nicht mehr darauf verlassen, Abstand/Schulterblick; rote Warnung oder ungewohnte Bremse: anhalten; Leitung
// entscheidet, nichts selbst abschalten; Display-Foto, welches System, dauernd/zeitweise, Sensor verschmutzt/vereist?; Auswahl „Kann das Fahrzeug fahren?“) –
// reine Information, keine Frist, keine Rechtsnorm. „Navi kaputt“, „Dashcam“, „Reifendrucksensor“, „Kühlaggregat-Fühler“, „Bremse quietscht“, „Spiegel abgefahren“ lösen nichts aus
// Backlog 339 (Fehlersuche): auch der einfache Tempomat („Tempomat geht nicht/schaltet sich ab/lässt sich nicht ausschalten“, „cruise control not working“, „круїз-контроль не працює“); „Tempomat eingestellt“ nicht
const ADAS_HINT = /(?<![a-zäöüß])(?:(?:notbrems|abbiege|spurhalte|spurverlassens|spur|spurwechsel|totwinkel|toter-winkel|brems|abstands|fahr|fahrer)assistent(?:en|s)?|notbremssystem|notbremsassistenz|abbiegeassistenz|spurhalteassistenz|tempomat|abstandstempomat|abstandsregeltempomat|abstandsregelung|assistenzsystem(?:e|en)?|assistent(?:en)?|(?:rückfahr|rueckfahr|seiten|front|spiegelersatz)?kamera(?:s)?|kamerasystem|kamera-monitor-system|kameramonitor(?:e|en)?|kamerabildschirm(?:e)?|spiegelersatzsystem|radarsensor(?:en)?|abstandssensor(?:en)?)(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:ausgefallen|fällt\s+aus|faellt\s+aus|spinnt|spinnen|geht\s+nicht|gehen\s+nicht|funktioniert\s+nicht|funktionieren\s+nicht|defekt|kaputt|fehler\S*|störung|gestört|nicht\s+verfügbar|nicht\s+verfuegbar|ohne\s+funktion|zeigt\s+nichts|zeigt\s+kein\s+bild|bild\s+(?:ist\s+)?schwarz|schwarz(?![a-zäöüß])|beschlagen|verschmutzt|verdreckt|zugeschneit|vereist|flackert|unscharf|bremst\s+(?:\S+\s+)?(?:grundlos|ohne\s+grund|einfach\s+so)|hat\s+(?:\S+\s+)?(?:grundlos|ohne\s+grund)\s+gebremst|löst\s+(?:\S+\s+)?(?:grundlos|ständig)\s+aus|(?:piept|piepst|warnt)\s+(?:\S+\s+)?(?:st(?:ä|ae)ndig|dauernd|ununterbrochen|grundlos|ohne\s+grund))|(?<![a-zäöüß])(?:fehler\S*|störung|ausfall|warnung)\s+(?:\S+\s+){0,2}?(?:des\s+|der\s+|vom\s+|am\s+|im\s+|beim\s+)?(?:notbrems|abbiege|spurhalte|abstands|totwinkel)\S*|phantombremsung|fehlauslösung\s+(?:\S+\s+){0,2}?(?:notbrems|bremsassist)\S*|(?<![a-zäöüß])(?:lkw|fahrzeug|zugmaschine|er)\s+(?:\S+\s+){0,2}?(?:bremst|bremste|hat)\s+(?:\S+\s+){0,2}?(?:grundlos|ohne\s+grund)\s*(?:gebremst|voll|stark)?|(?<![a-z])(?:emergency\s+brak(?:e|ing)(?:\s+(?:assist|system))?|aebs|blind\s+spot\s+(?:assist|system|camera|sensor|warning)|turn(?:ing)?\s+assist(?:ant)?|lane\s+(?:keep(?:ing)?|departure)\s+(?:assist|warning|system)|adaptive\s+cruise(?:\s+control)?|cruise\s+control|driver\s+assist(?:ance)?(?:\s+systems?)?|(?:rear(?:view)?|reversing|side|mirror|front)\s+cameras?|camera\s+(?:system|monitor)|radar\s+sensors?)\s+(?:\S+\s+){0,3}?(?:not\s+working|doesn['’]?t\s+work|isn['’]?t\s+working|failed|fault|error|unavailable|disabled|broken|black|blank|fogged(?:\s+up)?|misted(?:\s+up)?|dirty|blurry|flickering|out(?![a-z]))|phantom\s+brak(?:e|ing)|brak(?:ed|es|ing)\s+(?:\S+\s+){0,2}?for\s+no\s+reason|(?<![а-яіїєґ])(?:асистент\S*|ассистент\S*|круїз\S*|круиз\S*|систем\S*\s+(?:екстрен\S*|аварійн\S*|экстренн\S*)\s+гальмуван\S*|камер\S*|радар\S*)\s+(?:\S+\s+){0,3}?(?:не\s+працю\S*|не\s+работа\S*|помилк\S*|ошибк\S*|вийшл\S*\s+з\s+ладу|вийшов\s+з\s+ладу|зламал\S*|сломал\S*|не\s+показу\S*|не\s+показыва\S*|запітніл\S*|запотел\S*|брудн\S*|забрудн\S*|грязн\S*|мерехт\S*)|(?<![а-яіїєґ])(?:гальму\S*|тормоз\S*)\s+(?:\S+\s+){0,2}?(?:без\s+причини|без\s+причины)|(?<![a-zäöüß])(?:rückfahrwarner|rueckfahrwarner|rückfahrwarneinrichtung|rückfahrwarnsystem|rückfahrpiepser|rückwärtswarner|rückfahrwarnsignal|rueckfahrwarnsignal|rückfahrwarnton|rückfahrsignal|rückfahrpieper)\s+(?:\S+\s+){0,3}?(?:piept\s+nicht|ist\s+stumm|stumm(?![a-zäöüß])|ausgefallen|geht\s+nicht|funktioniert\s+nicht|defekt|kaputt)|(?<![a-z])(?:reversing|reverse|back-?up)\s+(?:alarm|beeper|buzzer)s?\s+(?:\S+\s+){0,3}?(?:not\s+working|doesn['’]?t\s+work|isn['’]?t\s+working|silent|failed|broken|dead)(?![a-z])|(?<![а-яіїєґ])(?:сигнал\S*|зумер\S*|пищалк\S*)\s+(?:заднього|заднего)\s+ход\S*\s+(?:\S+\s+){0,2}?(?:не\s+працю\S*|не\s+работа\S*|мовчить|молчит|зламан\S*|сломан\S*)|(?<![a-zäöüß])tempomat\S*\s+(?:\S+\s+){0,3}?(?:schaltet\s+sich\s+(?:\S+\s+)?(?:ab|aus)(?![a-zäöüß])|l(?:ä|ae|a)sst\s+sich\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:ein|aus|ab)schalten|beschleunigt\s+(?:\S+\s+)?(?:von\s+selbst|allein|grundlos))|(?<![a-z])cruise\s+control\s+(?:\S+\s+){0,2}?(?:won['’]?t|doesn['’]?t|does\s+not|will\s+not)\s+(?:turn|switch)\s+(?:on|off)/i;
// Backlog 581 (Diktat/Tippfehler): „Lenkung schwer/locker/lose/spielt“, „ziet“, „blokiert“, Umschrift „rul tugoy“
const STEER_HINT = /(?<![a-zäöüß])(?:lenkung|lenkrad|servolenkung)\s+(?:\S+\s+){0,2}?(?:schwer(?![a-zäöüß])|locker(?![a-zäöüß])|lose(?![a-zäöüß])|spielt|ziet|blokier\S*)|(?<![a-z])(?:rul|rulya)\s+(?:\S+\s+)?(?:tug\S*|tyazh\S*|ne\s+krut\S*|lyuft\S*)|(?<![a-zäöüß])(?:servolenkung|lenkung|lenkhilfe|lenkrad(?:es|s)?|lenkgetriebe|lenkachse|spurstange)(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:zieht|zog|schwerg(?:ä|ae|a)ngig|geht\s+(?:\S+\s+)?schwer|ist\s+(?:\S+\s+)?schwer|sehr\s+schwer|hat\s+(?:\S+\s+)?spiel|spiel(?![a-zäöüß])|wackelt|flattert|vibriert|zittert|blockiert|klemmt|hakt|ausgefallen|f(?:ä|ae|a)llt\s+aus|defekt|kaputt|fehler\S*|st(?:ö|oe|o)rung|steht\s+schief|schief(?![a-zäöüß])|reagiert\s+(?:\S+\s+)?(?:nicht|kaum|verz(?:ö|oe|o)gert))|(?<![a-zäöüß])(?:fehler\S*|st(?:ö|oe|o)rung|ausfall|warnung|warnmeldung)\s+(?:\S+\s+){0,2}?(?:der\s+|an\s+der\s+|im\s+)?(?:servolenkung|lenkung|lenkhilfe|lenkgetriebe)(?![a-zäöüß])|(?<![a-zäöüß])(?:lkw|fahrzeug|zugmaschine|auflieger|er|wagen)\s+(?:\S+\s+){0,2}?(?:zieht|zog)\s+(?:\S+\s+){0,3}?nach\s+(?:links|rechts)(?![a-zäöüß])|(?<![a-z])(?:power\s+)?steering(?:\s+wheel)?\s+(?:\S+\s+){0,3}?(?:pulls|pulling|pulled|heavy|stiff|hard|has\s+(?:\S+\s+){0,3}?play|play(?![a-z])|loose|wobbl\S*|vibrat\S*|shak\S*|locked|locks|jam\S*|failed|fail(?:s|ure)|fault|error|not\s+working|doesn['’]?t\s+work|isn['’]?t\s+working|crooked|off[-\s]cent(?:er|re))|(?<![a-z])(?:truck|vehicle|lorry|it)\s+(?:\S+\s+){0,2}?pull(?:s|ing|ed)?\s+(?:\S+\s+){0,2}?to\s+the\s+(?:left|right)(?![a-z])|(?<![а-яіїєґ])(?:керм\S*|рульов\S*|руль|руля|рулев\S*|підсилювач\S*\s+керма|гидроусилител\S*|гідропідсилювач\S*)\s+(?:\S+\s+){0,3}?(?:туг\S*|важк\S*|тяжел\S*|тягне|тянет|люфт\S*|вібру\S*|вибриру\S*|трясет\S*|трясе\S*|заклин\S*|клин\S*|не\s+працю\S*|не\s+работа\S*|помилк\S*|ошибк\S*|відмов\S*|отказа\S*|вийш\S*\s+з\s+ладу|криво)|(?<![а-яіїєґ])(?:тягне|тягнe|тянет|веде|ведет)\s+(?:\S+\s+){0,2}?(?:вправо|вліво|влево|праворуч|ліворуч)/i;
// Backlog 344 (Fehlersuche): auch Keil-/Rippenriemen gerissen/quietscht, Lichtmaschine lädt nicht, Batterie wird nicht geladen, Wasserpumpe/Kühlerlüfter
// ausgefallen (DE/EN/UK/RU); „Spanngurt gerissen“, „Riemen gerissen“ allein (Ladung), „Lüfter im Fahrerhaus“, „Batterie leer“ nicht
// Backlog 346 (Fehlersuche, sicherheitskritisch): auch „Motor geht während der Fahrt aus“, „Motor stirbt ab“, „Motor ruckelt/stottert/setzt aus“, „springt an und
// geht wieder aus“, „engine cuts out/stalls“, „двигун глухне“; „Motor aus“, „Motor ausgemacht“, „Motor geht nicht an“ (Starthilfe) nicht
// Backlog 351: auch ukrainisch/russisch ohne Farbwort („дим з вихлопної труби“, „з вихлопної труби дим“, „глушник димить“)
// Backlog 349 (Fehlersuche): auch farbiger/starker Rauch aus dem Auspuff („schwarzer Rauch aus dem Auspuff“, „smoke from the exhaust“, „чорний дим з вихлопної“) – Motorproblem;
// Rauch aus Motorraum/Fahrerhaus bleibt beim Brand-Hinweis
const ENGINE_HINT = /(?<![a-zäöüß])(?:motor|lkw|fahrzeug|zugmaschine|er)\s+(?:\S+\s+){0,3}?(?:(?:ist|geht|läuft|laeuft)\s+(?:\S+\s+)?(?:im\s+|in\s+den\s+)?notlauf|notlauf|(?:verliert|reduziert|drosselt)\s+(?:\S+\s+){0,2}?(?:leistung|kraft)|hat\s+(?:\S+\s+){0,2}?(?:keine|kaum|wenig|weniger)\s+(?:\S+\s+)?(?:leistung|kraft)|zieht\s+(?:nicht\s+(?:mehr|richtig)|(?:nur\s+)?(?:schlecht|kaum)(?:\s+noch)?)(?![a-zäöüß])|(?:ist\s+)?(?:(?:ü|ue|u)berhitzt|ueberhitzt)|wird\s+(?:\S+\s+)?(?:zu\s+)?heiß|wird\s+(?:\S+\s+)?(?:zu\s+)?heiss|kocht)|(?<![a-zäöüß])(?:notlauf(?:programm|modus)?|leistungsreduzierung|leistungsverlust|leistungsabfall|motorleistung\s+(?:\S+\s+)?reduziert|motor(?:temperatur|(?:ü|ue|u)berhitzung|ueberhitzung)|kühlwasser\S*|kuehlwasser\S*|kühlmittel\S*|kuehlmittel\S*|wassertemperatur)(?![a-zäöüß])(?:\s+(?:\S+\s+){0,3}?(?:rot|hoch|zu\s+hoch|kocht|warnung|leer|verloren|läuft\s+aus|laeuft\s+aus|spritzt|(?:ü|ue|u)berhitzt|ueberhitzt|aktiv|zeigt)|(?=\s|$|[.,;!?]))|(?<![a-zäöüß])ad[\s-]?blue\S*\s+(?:\S+\s+){0,3}?(?:warnung|warnleuchte|fehler\S*|störung|leer|reduziert|drosselt|leuchtet)|(?<![a-z])(?:limp\s+(?:home\s+)?mode|loss\s+of\s+power|loses\s+power|losing\s+power|lost\s+power|no\s+power|reduced\s+(?:engine\s+)?power|power\s+(?:is\s+)?reduced|engine\s+(?:\S+\s+)?(?:overheat\S*|derate\S*|too\s+hot)|overheat(?:s|ed|ing)|coolant\s+(?:\S+\s+){0,2}?(?:warning|temperature|temp|low|leak\S*|boil\S*)|ad[\s-]?blue\s+(?:\S+\s+){0,2}?(?:warning|fault|empty|light))(?![a-z])|(?<![а-яіїєґ])(?:аварійн\S*\s+режим|аварийн\S*\s+режим|втрат\S*\s+потужност\S*|потер\S*\s+мощност\S*|(?:немає|нема|нет)\s+(?:\S+\s+)?(?:потужност\S*|тяги|мощности)|(?:не|погано|слабо|ледве)\s+тягне(?![а-яіїєґ])|(?:не|плохо|слабо|еле)\s+тянет(?![а-яіїєґ])|перегр\S*|охолоджувальн\S*\s+рідин\S*|охлаждающ\S*\s+жидкост\S*|антифриз\S*|адблю\S*\s+(?:\S+\s+)?(?:помилк\S*|ошибк\S*|попередж\S*|предупрежд\S*))|(?<![a-zäöüß-])(?:keilriemen|keilrippenriemen|rippenriemen|antriebsriemen|lichtmaschinenriemen|l(?:ü|ue|u)fterriemen|lichtmaschine|wasserpumpe|k(?:ü|ue|u)hlerl(?:ü|ue|u)fter|motorl(?:ü|ue|u)fter|visco-?l(?:ü|ue|u)fter|viskol(?:ü|ue|u)fter)(?:s|n)?(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:gerissen|abgesprungen|runtergesprungen|quietscht|quietschen|pfeift|rutscht|kaputt|defekt|ausgefallen|f(?:ä|ae|a)llt\s+aus|l(?:ä|ae|a)dt\s+nicht|l(?:ä|ae|a)uft\s+nicht|dreht\s+(?:sich\s+)?nicht|funktioniert\s+nicht|geht\s+nicht)|(?<![a-zäöüß-])batterie\S*\s+(?:\S+\s+){0,2}?(?:wird\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?geladen|l(?:ä|ae|a)dt\s+nicht)|(?<![a-z-])(?:fan|alternator|serpentine|drive|v-?|poly-?v)\s*belt\s+(?:\S+\s+){0,2}?(?:snapped|broken|broke|squealing|squeaking|slipping|came\s+off|failed)(?![a-z])|(?<![a-z-])alternator\s+(?:\S+\s+){0,2}?(?:not\s+charging|isn['’]?t\s+charging|failed|dead|broken|faulty)|(?<![a-z-])water\s+pump\s+(?:\S+\s+)?(?:failed|broken|faulty)|(?<![a-z-])(?:radiator|cooling|engine)\s+fan\s+(?:\S+\s+)?(?:not\s+working|failed|broken|doesn['’]?t\s+work)|(?<![а-яіїєґ])(?:(?:ремін\S*|ремен\S*|ремн\S*|пас)\s+(?:генератор\S*|вентилятор\S*|привод\S*|помп\S*|грм)|(?:приводн\S*|поліклинов\S*|поликлинов\S*|клинов\S*)\s+(?:ремін\S*|ремен\S*|ремн\S*|пас\S*))\s+(?:\S+\s+){0,2}?(?:порва|обірва|обрив|оборва|злеті|злетів|слетел|свист|пищ)\S*|(?<![а-яіїєґ])генератор\S*\s+(?:\S+\s+)?(?:не\s+заряджа\S*|не\s+заряжа\S*|не\s+да[её]\s+заряд\S*)|(?<![а-яіїєґ])(?:помп\S*|водян\S*\s+насос\S*)\s+(?:\S+\s+)?(?:зламал\S*|зламан\S*|сломал\S*|сломан\S*|не\s+працю\S*|не\s+работа\S*)|(?<![a-zäöüß-])(?:motor|lkw)\s+(?:[^\s,.;!?]+\s+){0,2}?(?:geht|ging)\s+(?!nicht)(?:[^\s,.;!?]+\s+){0,4}?aus(?![a-zäöüß])(?=[^.;!?]*?(?:fahrt|fahren|fahre|fuhr|rollen|ampel|kreuzung|autobahn|stra(?:ß|ss)e|unterwegs|leerlauf|anfahren|bremsen|berg|immer|st(?:ä|ae|a)ndig|pl(?:ö|oe|o)tzlich|einfach|selbst|zwischendurch|mehrmals|grundlos))|(?<![a-zäöüß-])(?:motor|lkw)\s+(?:[^\s,.;!?]+\s+){0,2}?(?:geht|ging)\s+(?!nicht)(?:[^\s,.;!?]+\s+){0,3}?(?:fahrt|fahren|fahre|fuhr|rollen|ampel|kreuzung|autobahn|stra(?:ß|ss)e|unterwegs|leerlauf|anfahren|bremsen|berg|immer|st(?:ä|ae|a)ndig|pl(?:ö|oe|o)tzlich|einfach|selbst|zwischendurch|mehrmals|grundlos)\S*\s+(?:[^\s,.;!?]+\s+){0,2}?aus(?![a-zäöüß])|(?<![a-zäöüß-])(?:fahrt|fahren|fahre|fuhr|rollen|ampel|kreuzung|autobahn|stra(?:ß|ss)e|unterwegs|leerlauf|anfahren|bremsen|berg|immer|st(?:ä|ae|a)ndig|pl(?:ö|oe|o)tzlich|einfach|selbst|zwischendurch|mehrmals|grundlos)\S*\s+(?:[^\s,.;!?]+\s+){0,3}?(?:geht|ging)\s+(?:der\s+|mir\s+(?:der\s+)?)?(?:motor|lkw)\s+(?:[^\s,.;!?]+\s+){0,2}?aus(?![a-zäöüß])|(?<![a-zäöüß-])(?:motor|lkw)\s+(?:\S+\s+){0,3}?(?:stirbt|starb)\s+(?:\S+\s+)?ab|(?<![a-zäöüß-])(?:motor|lkw)\s+(?:\S+\s+){0,3}?(?:ruckelt|stottert|setzt\s+aus|nimmt\s+kein\s+gas|geht\s+in\s+die\s+knie)|(?<![a-zäöüß-])springt\s+an\s+und\s+geht\s+(?:\S+\s+)?(?:wieder\s+)?aus|(?<![a-z-])engine\s+(?:\S+\s+){0,2}?(?:cuts?\s+out|cutting\s+out|stalls?|stalled|stalling|dies|died|shuts?\s+(?:itself\s+)?(?:off|down)|shut\s+down|keeps\s+cutting\s+out|misfir\S*|sputter\S*|stutter\S*)|(?<![а-яіїєґ])(?:двигун\S*|мотор\S*|двигател\S*)\s+(?:\S+\s+){0,2}?(?:глухне|заглух\S*|глохне|глохнет|заглох\S*|вимика\S*\s+(?:\S+\s+)?під\s+час\s+руху|смика\S*|дерга\S*|троїть|троит)|(?<![a-zäöüß-])(?:rauch|qualm|dampf)\s+(?:\S+\s+)?aus\s+(?:dem\s+)?auspuff|(?<![a-zäöüß-])(?:aus\s+dem\s+)?auspuff\s+(?:kommt|kommen|steigt|steigen|qualmt\s+es|raucht\s+es)\s+(?:\S+\s+){0,2}?(?:rauch|qualm|dampf)(?![a-zäöüß])|(?<![a-zäöüß-])(?:schwarze[nmrs]?|wei(?:ß|ss)e[nmrs]?|blaue[nmrs]?|graue[nmrs]?)\s+(?:rauch|qualm)(?=[^.;!?]*auspuff)|(?<![a-zäöüß-])auspuff\s+(?:\S+\s+)?(?:qualmt|raucht)\s+(?:\S+\s+)?(?:schwarz|wei(?:ß|ss)|blau|grau|stark)|(?<![a-z-])(?:black|white|blue|grey|gray)\s+smoke(?=[^.;!?]*exhaust)|(?<![a-z-])smoke\s+(?:\S+\s+)?(?:from|out\s+of)\s+(?:the\s+)?exhaust|(?<![а-яіїєґ])(?:чорн|біл|син|черн|бел)\S*\s+(?:дим|дым)\S*\s+(?:\S+\s+){0,2}?(?:вихлоп|выхлоп|глушник|глушител)|(?<![а-яіїєґ])(?:дим|диму|дым|дыма)(?![а-яіїєґ])\s+(?:\S+\s+)?(?:з|із|из)\s+(?:\S+\s+)?(?:вихлоп|выхлоп|глушник|глушител)|(?<![а-яіїєґ])(?:вихлоп|выхлоп|глушник|глушител)\S*\s+(?:\S+\s+){0,2}?(?:дим|дым|димить|дымит|димит|дымится)(?![а-яіїєґ])|(?<![a-zäöüß-])(?:motortemperatur|temperatur|kühlwasser|kuehlwasser)?(?:anzeige|nadel)(?<=(?:temperatur|kühlwasser|kuehlwasser)(?:anzeige|nadel))(?![a-zäöüß])(?![^.,;]*(?:k(?:ü|ue|u)hl(?:aggregat|ger(?:ä|ae|a)t|raum|koffer|auflieger|maschine)|au(?:ß|ss)en|thermo\s*king|carrier))\s+(?:\S+\s+){0,3}?(?:im\s+roten|rot(?![a-zäöüß])|geht\s+(?:\S+\s+)?hoch|steigt|zu\s+hoch|blinkt)|(?<![a-zäöüß-])(?:turbolader|turbo)(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:pfeift|heult|defekt|kaputt|ausgefallen|qualmt|verliert\s+(?:\S+\s+)?(?:ö|oe)l)|(?<![a-z-])turbo(?:charger)?\s+(?:\S+\s+){0,3}?(?:whistl\S*|whin\S*|failed|broken|faulty|not\s+working)/i;
const SUSP_HINT = /(?<![a-zäöüß-])(?:feder|blatt|achs)?federbruch(?![a-zäöüß])|(?<![a-zäöüß-])(?:die\s+)?(?:feder|federn|federblatt|federbl(?:ä|ae)tter)\s+(?:(?:ist|sind|hinten|vorne|links|rechts|an\s+der\s+\S+|am\s+\S+)[,;]?\s+){0,3}(?:gebrochen|durchgebrochen|abgebrochen)(?![a-zäöüß])(?![,;]?\s+(?:\S+\s+)?(?:getauscht|ersetzt|erneuert|repariert))|(?<![a-z])(?:broken|snapped|cracked)\s+(?:leaf\s+|road\s+|suspension\s+)?springs?(?![a-z])|(?<![a-z])(?:leaf\s+|suspension\s+)?springs?\s+(?:is\s+|has\s+)?(?:broken|snapped|cracked)(?![a-z])|(?<![a-zäöüß])(?:luftfederung|luftfeder(?:n)?|luftbalg|luftbälge|luftbaelge|luftsack|luftsäcke|federbalg|federbälge|niveauregulierung|niveauregelung|fahrwerk|federung|blattfeder(?:n)?|liftachse(?:n)?|hubachse(?:n)?)(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:geplatzt|gerissen|defekt|spinnt|geht\s+nicht|funktioniert\s+nicht|kaputt|undicht|verliert\s+(?:\S+\s+)?luft|zischt|ausgefallen|f(?:ä|ae|a)llt\s+aus|gebrochen|fehler\S*|st(?:ö|oe|o)rung|senkt\s+sich|sackt\s+(?:\S+\s+)?ab|l(?:ä|ae|a)sst\s+(?:\S+\s+)?ab|hebt\s+nicht|geht\s+nicht\s+hoch|senkt\s+(?:sich\s+)?nicht(?![a-zäöüß])|bleibt\s+(?:\S+\s+)?(?:oben|unten)(?![a-zäöüß])|geht\s+nicht\s+(?:mehr\s+)?(?:runter|herunter|ab)(?![a-zäöüß])|l(?:ä|ae|a)sst\s+sich\s+nicht\s+(?:mehr\s+)?(?:absenken|senken|heben|anheben)|funktioniert\s+nicht)|(?<![a-zäöüß])(?:lkw|fahrzeug|zugmaschine|auflieger|anh(?:ä|ae|a)nger|trailer|er|kabine|fahrerhaus)\s+(?:\S+\s+){0,3}?(?:h(?:ä|ae|a)ngt|liegt|sitzt|ist)\s+(?:\S+\s+){0,2}?schief(?![a-zäöüß])|(?<![a-zäöüß])(?:lkw|fahrzeug|zugmaschine|auflieger|anh(?:ä|ae|a)nger|trailer|er|kabine|fahrerhaus)\s+(?:\S+\s+){0,3}?(?:senkt\s+sich\s+(?:\S+\s+){0,2}?ab|sackt\s+(?:\S+\s+){0,2}?ab|sinkt\s+ab|liegt\s+(?:\S+\s+){0,2}?auf\s+(?:den\s+)?(?:puffern|anschlag))|(?<![a-z])(?:air\s+(?:suspension|bag|bags|bellows|spring|springs)|suspension|leaf\s+springs?|ride\s+height)\s+(?:\S+\s+){0,3}?(?:burst|failed|failure|fault|broken|leak\S*|loses\s+air|losing\s+air|down|collapsed|not\s+working|error)(?![a-z])|(?<![a-z])(?:truck|trailer|vehicle|cab|it)\s+(?:\S+\s+){0,3}?(?:is\s+)?(?:leaning|sagging|sinking|tilted|lopsided)(?![a-z])|(?<![а-яіїєґ])(?:пневмоподуш\S*|подушк\S*|пневмопідвіск\S*|пневмоподвеск\S*|підвіск\S*|подвеск\S*|ресор\S*|рессор\S*)\s+(?:\S+\s+){0,3}?(?:лопну\S*|луснул\S*|порва\S*|пробит\S*|не\s+працю\S*|не\s+работа\S*|спуска\S*|травить|тріснул\S*|зламал\S*|сломал\S*|сломан\S*|зламан\S*)|(?<![а-яіїєґ])(?:вантажівк\S*|причіп\S*|напівпричіп\S*|прицеп\S*|грузовик\S*)\s+(?:\S+\s+){0,2}?(?:просі\S*|просел\S*|перекос\S*|нахил\S*|криво)|(?<![a-z-])lift(?:ing)?\s+axles?\s+(?:\S+\s+)?(?:stuck|jammed|faulty|broken|not\s+working|won['’]?t\s+(?:lift|lower|go\s+(?:up|down))|doesn['’]?t\s+(?:lift|lower|go\s+(?:up|down)))|(?<![а-яіїєґ])(?:підйомн|подъемн|піднімальн)\S*\s+(?:вісь|осі|ось)\s+(?:\S+\s+)?(?:не\s+підніма\S*|не\s+поднима\S*|не\s+опуска\S*|заклин\S*|не\s+працю\S*|не\s+работа\S*)/i;
// Backlog 745: „Gangschaltung/Schalthebel hakt/klemmt“, „Gänge lassen sich schwer schalten“, „can't get into reverse“, „задня не вмикається“
const GEAR_HINT = /(?<![a-zäöüß])(?:getriebe|schaltgetriebe|automatikgetriebe|getriebesteuerung|schaltung|gangschaltung|schalthebel|ganghebel|g(?:ä|ae|a)nge|gang|r(?:ü|ue|u)ckw(?:ä|ae|a)rtsgang|vorw(?:ä|ae|a)rtsgang|kupplungspedal|kupplungsautomat|kupplungssteller)(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:schaltet\s+(?:\S+\s+)?(?:nicht|nicht\s+mehr|falsch|ständig)|geht\s+(?:\S+\s+)?schwer(?![a-zäöüß])|schwerg(?:ä|ae|a)ngig|bleibt\s+(?:\S+\s+)?unten|kommt\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:hoch|zur(?:ü|ue|u)ck)|geht\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:rein|herein|hinein|raus|heraus)|geht\s+nicht(?![a-zäöüß])|geht\s+nicht\s+mehr|l(?:ä|ae|a)ss(?:t|en)\s+sich\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:einlegen|schalten|treten)|l(?:ä|ae|a)ss(?:t|en)\s+sich\s+(?:\S+\s+)?(?:nur\s+)?schwer\s+(?:einlegen|schalten)|springt\s+(?:\S+\s+)?(?:raus|heraus)|hakt|klemmt|klemmen|kracht|knirscht|rutscht|fehler\S*|st(?:ö|oe|o)rung|defekt|kaputt|ausgefallen|f(?:ä|ae|a)llt\s+aus|bleibt\s+(?:\S+\s+)?(?:unten|stecken|h(?:ä|ae|a)ngen)|kommt\s+nicht\s+(?:mehr\s+)?(?:hoch|zur(?:ü|ue|u)ck))|(?<![a-zäöüß])(?:kupplung)(?![a-zäöüß])\s+(?:\S+\s+){0,2}?(?:rutscht|riecht|stinkt|trennt\s+nicht|greift\s+(?:\S+\s+)?(?:nicht|spät|spaet)|pedal\S*)|(?<![a-zäöüß])(?:getriebefehler|getriebest(?:ö|oe|o)rung|getriebeschaden|kein\s+gang|keinen\s+gang|neutralstellung|bleibt\s+(?:\S+\s+){0,2}?im\s+gang\s+h(?:ä|ae|a)ngen)(?![a-zäöüß])|(?<![a-z])(?:gearbox|transmission|gear\s*shift|gears?|reverse\s+gear|clutch(?:\s+pedal)?)\s+(?:\S+\s+){0,3}?(?:fault|failure|failed|error|slipping|slips|stuck|won['’]?t\s+(?:engage|shift|go\s+in)|not\s+(?:engaging|shifting|working)|doesn['’]?t\s+(?:engage|shift|work)|grinding|jumps\s+out|broken)(?![a-z])|(?<![a-z])(?:can['’]?t|cannot|unable\s+to)\s+(?:\S+\s+)?(?:engage|select|shift\s+into|get\s+(?:it\s+)?into)\s+(?:a\s+|any\s+|the\s+)?(?:gear|reverse)(?![a-z])|(?<![а-яіїєґ])(?:коробк\S*|кпп|передач\S*|зчепленн\S*|сцеплени\S*|задн\S*\s+(?:хід|ход))\s+(?:\S+\s+){0,3}?(?:не\s+перемика\S*|не\s+переключа\S*|не\s+вмика\S*|не\s+включа\S*|буксу\S*|пробукс\S*|помилк\S*|ошибк\S*|не\s+працю\S*|не\s+работа\S*|заклин\S*|вилітає|вылетает|зламал\S*|сломал\S*)|(?<![а-яіїєґ])(?:буксу|пробукс)\S*\s+(?:\S+\s+)?(?:зчепленн|сцеплени)\S*|(?<![а-яіїєґ])задн(?:я|яя|юю)\s+не\s+(?:вмика|включа)\S*/i;
// Backlog 344: „ремінь безпеки порвався/обірвався“ erkannt; Antriebsriemen („ремень генератора порвался“) gehört zum Motor-Hinweis, nicht hierher
const SEAT_HINT = /(?<![a-zäöüß])(?:sicherheitsgurt(?:e|es)?|gurtschloss|gurtstraffer|gurtaufroller|fahrergurt|beifahrergurt|anschnallgurt|fahrersitz(?:es)?|beifahrersitz(?:es)?|sitzverstellung|sitzfederung|luftsitz|sitzkonsole|sitz(?:es)?)(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:defekt|kaputt|klemmt|blockiert|gerissen|eingerissen|ausgefranst|gebrochen|wackelt|locker|lose(?![a-zäöüß])|h(?:ä|ae|a)lt\s+nicht|rastet\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?ein|rollt\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:auf|zur(?:ü|ue|u)ck)|l(?:ä|ae|a)sst\s+sich\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:anlegen|einstecken|herausziehen|rausziehen|verstellen|feststellen|arretieren|schlie(?:ß|ss)en|(?:ö|oe|o)ffnen)|senkt\s+sich|verliert\s+(?:\S+\s+)?luft|sackt\s+(?:\S+\s+)?ab|verstellt\s+sich|geht\s+nicht(?![a-zäöüß])|funktioniert\s+nicht|ausgefallen)|(?<![a-zäöüß])(?:gurt)(?![a-zäöüß])\s+(?:\S+\s+){0,2}?(?:rastet\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?ein|rollt\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:auf|zur(?:ü|ue|u)ck)|l(?:ä|ae|a)sst\s+sich\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:anlegen|einstecken|herausziehen|rausziehen))|(?<![a-z])(?:seat\s*belts?|safety\s+belts?|belt\s+buckle|(?:driver['’]?s?\s+|passenger\s+)?seat)\s+(?:\S+\s+){0,3}?(?:losing\s+air|broken|faulty|stuck|jammed|torn|frayed|loose|wobbl\S*|won['’]?t\s+(?:latch|lock|buckle|retract|adjust|click)|doesn['’]?t\s+(?:latch|lock|retract|adjust|work)|not\s+(?:latching|locking|retracting|working)|keeps\s+(?:sinking|dropping|moving))(?![a-z])|(?<![а-яіїєґ])(?:ремін\S*\s+безпеки|ремен\S*\s+безопасности|ремінь(?!\s+(?:генератор|вентилятор|привод|помп|грм|кріплен|креплен|вантаж|груз|стяжн))|ремень(?!\s+(?:генератор|вентилятор|привод|помп|грм|кріплен|креплен|вантаж|груз|стяжн))|сидінн\S*|сидень\S*|сидень|сиденье|сиденья|крісл\S*|кресл\S*)\s+(?:\S+\s+){0,3}?(?:не\s+(?:\S+\s+)?(?:застіба\S*|застеги\S*|фіксу\S*|фиксир\S*|регулю\S*|регулиру\S*|працю\S*|работа\S*|змотує\S*|сматыва\S*)|зламан\S*|сломан\S*|зламал\S*|сломал\S*|порван\S*|порвал\S*|порвав\S*|обірва\S*|оборва\S*|розірв\S*|заклин\S*|хитає\S*|шатает\S*|провалю\S*|опуска\S*)/i;
// Backlog 351: auch Kilometerzähler/km-Anzeige („Kilometerzähler geht nicht“, „km-Zähler zählt nicht mehr“, „odometer not working“, „одометр не працює“)
const DASH_HINT = /(?<![a-zäöüß-])(?<!(?:handy|tablet|navi|navigations|telefon|smartphone|radio|kamera)[\s-]?)(?:tankanzeige|tankuhr|kraftstoffanzeige|f(?:ü|ue)llstandsanzeige|kombiinstrument(?:e)?|instrumententafel|instrumentenbrett|armaturenbrett|armaturen|cockpit|display(?:s)?|bildschirm|tachoanzeige|kilometerz(?:ä|ae|a)hler|kilometeranzeige|km-z(?:ä|ae|a)hler|km-anzeige|kilometerstandsanzeige|geschwindigkeitsanzeige|tachonadel|tachometer(?:nadel|anzeige)?|drehzahlmesser|druckanzeige|druckanzeigen|manometer|hupe|signalhorn|horn)(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:ausgefallen|f(?:ä|ae|a)llt\s+(?:\S+\s+)?aus|schwarz|dunkel|zeigt\s+(?:\S+\s+)?(?:nichts|nix|kein\S*)|geht\s+nicht(?![a-zäöüß])|geht\s+nicht\s+mehr|geht\s+(?:\S+\s+)?aus|funktioniert\s+(?:\S+\s+)?nicht|defekt|kaputt|flackert|tot(?![a-zäöüß])|ohne\s+funktion|spinnt|bleibt\s+(?:\S+\s+)?(?:stehen|h(?:ä|ae|a)ngen|bei\s+null)|z(?:ä|ae|a)hlt\s+nicht(?:\s+mehr)?(?![a-zäöüß])|wird\s+nicht\s+(?:mehr\s+)?angezeigt)|(?<![a-z-])(?<!(?:phone|tablet|sat-?nav|radio)[\s-]?)(?:fuel\s+gauge|dashboard|dash|odometer|odo|mileage\s+counter|instrument\s+(?:cluster|panel)|display|screen|speedometer|speedo|pressure\s+gauges?|gauges?|horn)\s+(?:\S+\s+){0,3}?(?:dead|blank|black|went\s+out|is\s+out|not\s+working|isn['’]?t\s+working|doesn['’]?t\s+work|stopped\s+working|failed|faulty|broken|flicker\S*|shows\s+nothing|stuck\s+(?:at\s+)?(?:zero|0)|not\s+counting|stopped\s+counting)(?![a-z])|(?<![а-яіїєґ])(?:панел\S*\s+прилад\S*|приладов\S*\s+панел\S*|приборн\S*\s+панел\S*|дисплей\S*|екран\S*|экран\S*|спідометр\S*|спидометр\S*|одометр\S*|лічильник\S*\s+кілометр\S*|счетчик\S*\s+километр\S*|клаксон\S*|сигнал(?![а-яіїєґ]))\s+(?:\S+\s+){0,3}?(?:не\s+працю\S*|не\s+работа\S*|не\s+показу\S*|не\s+показыва\S*|згас\S*|погас\S*|чорн\S*|черн\S*|зламал\S*|сломал\S*|не\s+раху\S*|не\s+счита\S*)|(?<![a-zäöüß-])(?:hupe|signalhorn)\s+(?:\S+\s+){0,3}?(?:(?:h(?:ä|ae|a)ngt|klemmt)(?!\s+nicht)|h(?:ö|oe|o)rt\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?auf|geht\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?aus|l(?:ä|ae|a)sst\s+sich\s+nicht\s+(?:mehr\s+)?abstellen)(?![a-zäöüß])|(?<![a-zäöüß])hupt\s+(?:\S+\s+){0,2}?(?:von\s+selbst|allein|alleine|dauernd|st(?:ä|ae|a)ndig|ununterbrochen|ohne\s+grund)(?![a-zäöüß])|(?<![a-z-])horn\s+(?:\S+\s+){0,3}?(?:stuck|jammed|keeps\s+(?:sounding|honking|going\s+off|blaring)|sounds\s+(?:by\s+itself|on\s+its\s+own|constantly)|goes\s+off\s+(?:by\s+itself|on\s+its\s+own)|won['’]?t\s+stop|will\s+not\s+stop|does\s?n['’]?t\s+stop)(?![a-z])|(?<![а-яіїєґ])(?:клаксон\S*|сигнал(?![а-яіїєґ]))\s+(?:\S+\s+){0,3}?(?:заїло|заїв|заело|заклинило|залип\S*|сам\S*\s+(?:\S+\s+)?(?:гуд|сигнал|спрацьов|срабатыва|бібика|бибика)\S*|не\s+вимика\S*|не\s+выключа\S*|не\s+замовка\S*|не\s+замолка\S*|постійно\s+гуд\S*|постоянно\s+гуд\S*|гудить\s+постійно)|(?<![a-zäöüß-])(?:tankanzeige|tankuhr|kraftstoffanzeige|f(?:ü|ue)llstandsanzeige)(?![a-zäöüß])\s+(?:\S+\s+){0,2}?(?:zeigt\s+(?:\S+\s+){0,2}?falsch\S*|falsch(?![a-zäöüß])|springt)|(?<![a-z-])fuel\s+gauge\s+(?:\S+\s+){0,2}?(?:wrong|incorrect|inaccurate|jump\S*)/i;
// Backlog 314 (Blickwinkel „Teil hängt herunter, schleift oder wurde unterwegs verloren“): Kotflügel/Unterfahrschutz/Auspuff/Verkleidung lose
// oder verloren → Hinweise (sicher anhalten, nicht mit losem Teil weiterfahren; verlorenes Teil auf der Fahrbahn: nicht selbst holen, Notruf; sichern nur
// abseits des Verkehrs, Leitung entscheidet; Fotos/Seite/Ort; Auswahl „Kann das Fahrzeug fahren?“) – reine Information, keine Frist. „Ersatzteil fehlt“,
// „Teile bestellt“, „Spiegel abgefahren“, „Plane abgerissen“, „Ladung verloren“, „Schlüssel verloren“, „Bremse schleift“, „parts missing“ lösen nichts aus.
// Backlog 744: Radlauf/Radlaufverkleidung/Radhausschale, „wheel arch (liner)“, „broke/broken/snapped off“, „підкрилок/подкрылок“, „відламалося/отломался“;
// „Kotflügel gebrochen“/„mudguard broken“ (ohne lose/ab) bleiben bewusst allgemein
const LOOSE_HINT = /(?<![a-zäöüß])(?:kühlergrill|kuehlergrill|frontgrill|grill|frontschürze|frontschuerze|frontklappe|frontmaske|kotfl(?:ü|ue|u)gel|schmutzf(?:ä|ae|a)nger|spritzschutz|spritzlappen|unterfahrschutz|seitenschutz|seitenverkleidung|verkleidung|sto(?:ß|ss)stange|sto(?:ß|ss)f(?:ä|ae|a)nger|auspuff|auspuffrohr|endtopf|trittstufe|trittbrett|staukasten|werkzeugkasten|palettenkasten|reserveradhalter|ersatzradhalter|ersatzrad|reserverad|radkappe|radzierblende|dachspoiler|seitenspoiler|frontspoiler|spoiler|windleitblech|windabweiser|radlauf|radlaufverkleidung|radlaufabdeckung|radhausschale|radhausverkleidung|kennzeichenhalter|kennzeichen|teil|teile|abdeckung|blech)(?:e|en|n|s|es)?\s+(?:\S+\s+){0,3}?(?:(?:h(?:ä|ae|a)ngt|h(?:ä|ae|a)ngen)\s+(?:\S+\s+)?(?:herunter|runter|herab|lose|schief)(?![a-zäöüß])|(?:ist|sind)\s+(?:\S+\s+)?lose(?![a-zäöüß])|abgerissen|abgefallen|verloren|weggeflogen|abgebrochen|schleift|schleifen|klappert|klappern|wackelt|wackeln|losgerissen|lose(?![a-zäöüß])|locker(?![a-zäöüß]))|(?<![a-zäöüß-])(?:schmutzf(?:ä|ae|a)nger|spritzschutz|spritzlappen|kotfl(?:ü|ue|u)gel|radkappe|radlauf|radlaufabdeckung|radhausschale)(?:e|en|n|s|es)?\s+(?:\S+\s+){0,2}?(?:fehlt|fehlen)(?![a-zäöüß])|(?<![a-z-])(?:mud\s*flaps?|mudguards?|splash\s+guards?|hub\s*caps?)\s+(?:\S+\s+){0,2}?missing(?![a-z])|(?<![а-яіїєґ])(?:бризковик|брызговик)\S*\s+(?:\S+\s+)?(?:відсутн|отсутств|нема)\S*|(?<![a-zäöüß])(?:verliert|verlor|verloren|lose[rsn]?|herunterh(?:ä|ae|a)ngende[rsnm]?|abgerissene[rsnm]?|abgefallene[rsnm]?)\s+(?:\S+\s+){0,2}?(?:kotfl(?:ü|ue|u)gel|schmutzf(?:ä|ae|a)nger|unterfahrschutz|seitenschutz|seitenverkleidung|verkleidung|sto(?:ß|ss)stange|sto(?:ß|ss)f(?:ä|ae|a)nger|auspuff|auspuffrohr|endtopf|trittstufe|trittbrett|staukasten|werkzeugkasten|palettenkasten|reserveradhalter|ersatzrad|reserverad|radkappe|radzierblende|dachspoiler|seitenspoiler|frontspoiler|spoiler|windleitblech|windabweiser|radlauf|radlaufverkleidung|radlaufabdeckung|radhausschale|radhausverkleidung|kennzeichenhalter|kennzeichen|teil|teile|abdeckung|blech)(?:e|en|n|s|es)?(?![a-zäöüß])|(?<![a-z])(?:grilles?|mudguards?|mud\s*flaps?|fenders?|bumpers?|side\s+guards?|underrun\s+(?:guard|bar)s?|exhaust(?:\s+pipe)?|panels?|trim|steps?|spare\s+wheel(?:\s+carrier)?|wheel\s+arch(?:es)?(?:\s+(?:liners?|trims?|covers?))?|parts?|covers?|number\s+plates?|licen[cs]e\s+plates?)\s+(?:\S+\s+){0,3}?(?:hanging|hangs|loose|came\s+off|come\s+off|fell\s+off|falling\s+off|dragging|ripped\s+off|torn\s+off|broke\s+off|broken\s+off|snapped\s+off|rattling|flapping)(?![a-z])|(?<![a-z])(?:lost|dropped)\s+(?:a\s+|the\s+|some\s+|my\s+)?(?:part|parts|mudguard|mud\s*flap|bumper|panel|exhaust|spare\s+wheel|number\s+plate)(?![a-z])|(?<![а-яіїєґ])(?:решітк|решетк|крил|підкрил|подкрыл|бризковик|брызговик|бампер|відбійник|глушник|глушител|кожух|обшивк|детал|запаск|номерн)\S*\s+(?:\S+\s+){0,3}?(?:відірва|оторва|відлама|отлома|відпа|отпа|відвали|отвали|звиса|висить|висит|бовтає|болтает|загуби|потерял|втрати|тягнеться|волочит|теліпа)\S*|(?<![а-яіїєґ])(?:відірва|оторва|відпа|отпа|відвали|отвали|звиса|висить|висит|бовтає|болтает|теліпа)\S*\s+(?:\S+\s+)?(?:решітк|решетк|крил|бризковик|брызговик|бампер|відбійник|глушник|глушител|кожух|обшивк|запаск|номерн)\S*|(?<![а-яіїєґ])(?:загубив|загубила|втратив|втратила|потерял|потеряла)\s+(?:\S+\s+){0,2}?(?:крил|бризковик|брызговик|бампер|глушник|глушител|детал|запаск|номер)\S*|(?<![a-zäöüß-])(?:trittstufe|trittbrett|aufstiegstritt|einstiegstritt|aufstiegsstufe|einstiegsstufe|aufstiegshilfe|haltegriff|einstiegsgriff|griffstange)(?:n|e|en|s|es)?\s+(?:\S+\s+){0,3}?(?:lose|locker|wackelt|abgebrochen|abgerissen|gebrochen|kaputt|defekt|fehlt)(?![a-zäöüß])(?!\s+(?:\S+\s+)?(?:wieder|repariert|behoben))|(?<![a-z-])(?:(?:cab|entry|access|boarding|ladder)\s+steps?|grab\s+(?:handles?|rails?)|handrails?|hand\s+rails?)\s+(?:\S+\s+){0,2}?(?:loose|broken|snapped|missing|cracked|wobbly|came\s+off)(?![a-z])|(?<![а-яіїєґ])(?:сходинк|підніжк|подножк|поручн|поручен|поручень)\S*\s+(?:\S+\s+)?(?:відлама|отлома|злама|слома|розхита|шата|відпа|отпа|відірва|оторва)\S*|(?<![a-zäöüß-])schneeketten?\s+(?:\S+\s+){0,3}?(?:gerissen|abgesprungen|abgerutscht|abgefallen|verloren|schl(?:ä|ae|a)gt|schleift|kaputt)(?![a-zäöüß])|(?<![a-z-])snow\s+chains?\s+(?:\S+\s+){0,2}?(?:broke|broken|snapped|came\s+off|fell\s+off|lost|slipped\s+off)(?![a-z])|(?<![а-яіїєґ])(?:ланцюг|цеп)\S*\s+(?:протиковзанн|противоскольжен|на\s+колес)\S*\s+(?:\S+\s+)?(?:порва|розірва|злете|зіскоч|соскоч|загуби|потеря|злама|слома)\S*/i;
// Backlog 313 (Blickwinkel „Heizung/Gebläse/Scheibenwischer fällt aus, Scheibe beschlägt oder vereist“): eingeschränkte Sicht im Winter → Hinweise
// (nicht mit Guckloch weiterfahren, sicher anhalten; Scheiben frei machen ohne heißes Wasser; Leitung entscheidet; was genau ausfällt + Foto;
// Auswahl „Kann das Fahrzeug fahren?“) – reine Information, keine Frist, keine Temperaturangabe. „Standheizung startet nicht“, „Sitzheizung defekt“,
// „Heizungsrohr beim Kunden kaputt“, „Bremsscheibe vereist“, „Scheinwerfer beschlagen“, „parking heater not working“, „engine fan broken“ lösen nichts aus
const VISIB_HINT = /(?<![a-zäöüß])(?:fahrerhaus|kabinen|front|scheiben|frontscheiben|spiegel)?(?:heizung|lüftung|lueftung|gebläse|geblaese|defroster)(?:en)?(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:ausgefallen|fällt\s+aus|faellt\s+aus|geht\s+nicht|funktioniert\s+nicht|defekt|kaputt|bläst\s+nicht|blaest\s+nicht|heizt\s+nicht|wird\s+nicht\s+(?:mehr\s+)?warm|bleibt\s+kalt)|(?<![a-zäöüß])(?:windschutzscheibe|frontscheibe|seitenscheibe|heckscheibe|scheibe|scheiben|fenster)n?\s+(?:\S+\s+){0,3}?(?:beschlagen|beschl(?:ä|ae|a)gt|beschlagt|vereist|vereisen|zugefroren|friert\s+(?:\S+\s+)?zu|frieren\s+(?:\S+\s+)?zu)(?![a-zäöüß])|(?:beschlagene|vereiste|zugefrorene)[nmrs]?\s+(?:\S+\s+)?(?:windschutzscheibe|frontscheibe|seitenscheibe|scheibe|scheiben|fenster)|(?<![a-zäöüß])(?:scheiben)?wischer(?:n|blätter|blaetter|blatt|blattes|gummi|gummis|motor|arm)?\s+(?:\S+\s+){0,3}?(?:gerissen|eingerissen|lose|locker|ausgefallen|fällt\s+aus|faellt\s+aus|fallen\s+aus|geht\s+nicht|gehen\s+nicht|funktioniert\s+nicht|funktionieren\s+nicht|defekt|kaputt|bleibt\s+stehen|bleiben\s+stehen|wischt\s+nicht|wischen\s+nicht|schmiert|schmieren|festgefroren|eingefroren|abgebrochen)|(?<![a-zäöüß])(?:wischwasser|waschwasser|scheibenwaschanlage|scheibenwaschwasser|scheibenreiniger|waschanlage\s+der\s+scheibe)\s+(?:\S+\s+){0,3}?(?:leer|gefroren|eingefroren|geht\s+nicht|kommt\s+nicht|funktioniert\s+nicht|defekt|kaputt)|(?<![a-z])(?<!(?:parking|night|seat|engine|cooling|radiator|reefer|fridge)\s)(?:cab\s+)?(?:heater|heating|blower|fan|defroster|demister|de-mister)\s+(?:\S+\s+){0,3}?(?:not\s+working|doesn['’]?t\s+work|isn['’]?t\s+working|broken|failed|stopped|dead|out(?![a-z]))|(?<![a-z])(?:windscreen|windshield|windows?|glass)\s+(?:\S+\s+){0,3}?(?:fogged|fogging|fogs|misted|misting|mists|steamed|steaming|iced|icing|icy|frozen|frosted)(?![a-z])|(?:fogged|misted|steamed|iced|frozen|frosted)[\s-]+(?:up\s+)?(?:windscreen|windshield|windows?)|(?<![a-z])(?:windscreen\s+|windshield\s+)?(?:wipers?|wiper\s+blades?|washer\s+fluid|washers?|screen\s*wash)\s+(?:\S+\s+){0,3}?(?:not\s+working|doesn['’]?t\s+work|don['’]?t\s+work|isn['’]?t\s+working|aren['’]?t\s+working|broken|failed|stopped|frozen|empty|dead)|(?<![а-яіїєґ])(?:пічк|печк|обігрів|обогрев|опаленн|отоплени|обдув)\S*\s+(?:\S+\s+){0,3}?(?:не\s+працю\S*|не\s+работа\S*|зламал\S*|сломал\S*|не\s+гріє|не\s+греет|не\s+дме|не\s+дует)|(?<![а-яіїєґ])(?:скл[оаіу]|стекл[оаеу]|лобов\S*)\S*\s+(?:\S+\s+){0,3}?(?:запотіл\S*|запотел\S*|запотіва\S*|запотева\S*|пітні\S*|замерзл\S*|обмерзл\S*|заледені\S*|обледене\S*)|(?<![а-яіїєґ])(?:двірник|дворник|склоочисник|стеклоочистител|омивач|омыват|незамерзайк)\S*\s+(?:\S+\s+){0,3}?(?:не\s+працю\S*|не\s+работа\S*|зламал\S*|сломал\S*|замерз\S*|закінчил\S*|закончил\S*)/i;
// Backlog 325 (Blickwinkel „Auspuff laut/undicht, Abgase im Fahrerhaus“): Hinweise (Abgasgeruch: Fenster auf, anhalten, Motor/Standheizung aus,
// frische Luft, bei Unwohlsein Notruf; Leitung entscheidet, an der heißen Abgasanlage nichts selbst; Fotos/Geruch/seit wann; Auswahl „Kann das Fahrzeug
// fahren?“) – reine Information, keine Frist. „Auspuff abgerissen“ bleibt beim Hinweis „Teil hängt/verloren“, „Auspuff qualmt“ beim Brand-Hinweis;
// „Auspuff laut Rechnung getauscht“, „Abgasuntersuchung“, „exhaust brake noisy“ lösen nichts aus
const EXHAUST_HINT = /(?<![a-zäöüß])(?:auspuff|auspuffanlage|auspuffrohr|abgasanlage|abgasrohr|endtopf|schalld(?:ä|ae|a)mpfer|abgaskr(?:ü|ue|u)mmer|kr(?:ü|ue|u)mmer)(?:s|es)?(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:(?:sehr\s+)?laut(?:er)?(?=\s*(?:$|[.,!;]|geworden|und|als|beim|bei|seit|wie|w(?:ä|ae|a)hrend))|dr(?:ö|oe|o)hnt|knattert|zischt|pfeift|undicht|leck(?![a-zäöüß])|hat\s+(?:\S+\s+)?loch|durchgerostet|gerissen|rissig|bl(?:ä|ae|a)st\s+ab)|(?<![a-zäöüß])(?:abgase?|abgasgeruch|abgasgestank|auspuffgase?)\s+(?:\S+\s+){0,3}?(?:im|in\s+der|in\s+die|ins)\s+(?:fahrerhaus|f(?:ü|ue|u)hrerhaus|kabine|cockpit)(?![a-zäöüß])|(?<![a-zäöüß])(?:riecht|riechts|stinkt|roch)\s+(?:\S+\s+){0,4}?nach\s+(?:abgas(?:en)?|auspuff(?:gasen)?)(?![a-zäöüß])|(?<![a-z])(?:exhaust(?:\s+(?:pipe|system|manifold))?|muffler|silencer)(?!\s+brake)\s+(?:\S+\s+){0,3}?(?:(?:very\s+)?loud|noisy|blowing|leak\S*|has\s+(?:a\s+)?hole|holed|roar\S*|cracked|rusted\s+through|hiss\S*)(?![a-z])|(?<![a-z])(?:exhaust\s+)?fumes\s+(?:\S+\s+){0,3}?(?:in|into|inside)\s+(?:the\s+)?(?:cab|cabin)(?![a-z])|(?<![a-z])(?:smell\S*|stink\S*|reek\S*)\s+(?:\S+\s+){0,3}?(?:of\s+)?exhaust(?![a-z])|(?<![а-яіїєґ])(?:вихлоп\S*|выхлоп\S*|глушник\S*|глушител\S*)\s+(?:\S+\s+){0,3}?(?:гучн\S*|громк\S*|гуде\S*|гудит|реве\S*|ревет|тріснув\S*|треснул\S*|дірк\S*|дыр\S*|пропуска\S*|прогорі\S*|прогорел\S*)|(?<![а-яіїєґ])(?:запах\S*|смердить|воняє|воняет|пахне|пахнет)\s+(?:\S+\s+){0,3}?(?:вихлоп\S*|выхлоп\S*)|(?<![а-яіїєґ])(?:вихлопн\S*\s+газ\S*|выхлопн\S*\s+газ\S*)\s+(?:\S+\s+){0,2}?(?:в|у)\s+(?:кабін\S*|кабин\S*)/i;
// Backlog 326 (Blickwinkel „Fahrerhaus lässt sich nicht kippen oder ist nicht verriegelt“): Hinweise (nicht verriegelt: nicht losfahren/anhalten;
// halb gekippt: nicht darunter greifen, Gefahrenbereich frei; Leitung entscheidet, Kipppumpe/Verriegelung nicht selbst; Fotos/Stellung/Öl; Auswahl „Kann
// das Fahrzeug fahren?“) – reine Information, keine Frist. „Kippbrücke geht nicht hoch“, „Kipper kippt nicht“, „Fahrerhaustür lässt sich nicht verriegeln“,
// „cab door won't lock“ lösen nichts aus
const CABTILT_HINT = /(?<![a-zäöüß])(?:fahrerhaus|f(?:ü|ue|u)hrerhaus|fahrerkabine|kabine)(?:es|s)?(?![a-zäöüß])(?!\s+(?:\S+\s+)?(?:t(?:ü|ue|u)r|t(?:ü|ue|u)re|t(?:ü|ue|u)ren|fenster|heizung|licht|beleuchtung|schloss|schl(?:ü|ue|u)ssel)(?![a-zäöüß]))\s+(?:\S+\s+){0,3}?(?:l(?:ä|ae|a)sst\s+sich\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:kippen|ankippen|hochkippen|zur(?:ü|ue|u)ckkippen|herunterlassen|runterlassen|absenken|verriegeln)|kippt\s+(?:\S+\s+)?nicht|geht\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:hoch|runter|nach\s+unten|zur(?:ü|ue|u)ck)(?![a-zäöüß])|nicht\s+(?:richtig\s+|ganz\s+)?verriegelt|unverriegelt|rastet\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?ein|bleibt\s+(?:\S+\s+)?(?:halb\s+)?(?:oben|gekippt|hochgekippt|in\s+der\s+luft))|(?<![a-zäöüß])(?:kippvorrichtung|kipppumpe|kippzylinder|fahrerhauskippung|fahrerhausverriegelung|kabinenverriegelung|kabinenkippung|kipphydraulik)(?:en)?(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:defekt|kaputt|undicht|klemmt|geht\s+nicht|funktioniert\s+(?:\S+\s+)?nicht|ausgefallen|fehler\S*|st(?:ö|oe|o)rung|offen(?![a-zäöüß])|verliert\s+(?:\S+\s+)?(?:(?:ö|oe|o)l|druck))|(?<![a-z])(?:cab|cabin)(?![a-z])(?!\s+(?:\S+\s+)?(?:doors?|windows?|lights?|heater|heating|keys?|locks?)(?![a-z]))\s+(?:\S+\s+){0,3}?(?:won['’]?t\s+(?:tilt|lower|go\s+(?:back\s+)?(?:up|down)|lock|latch)|will\s+not\s+(?:tilt|lower|lock|latch)|doesn['’]?t\s+(?:tilt|lower|lock|latch)|not\s+(?:tilting|locked|latched|lowering)|unlocked|unlatched|stuck\s+(?:half[-\s]?)?(?:up|tilted|raised|open))|(?<![a-z])(?:cab[-\s]?tilt(?:ing)?\s+(?:pump|mechanism|system|cylinder|ram)|cab\s+(?:lock|latch|locking))\s+(?:\S+\s+){0,3}?(?:broken|faulty|failed|fault|leak\S*|not\s+working|doesn['’]?t\s+work|open|stuck|error)(?![a-z])|(?<![а-яіїєґ])(?:кабін\S*|кабин\S*)\s+(?:\S+\s+){0,3}?(?:не\s+(?:\S+\s+)?(?:перекида\S*|опрокид\S*|відкида\S*|откидыва\S*|підійма\S*|поднима\S*|опуска\S*|фіксу\S*|фиксир\S*)|не\s+зафіксован\S*|не\s+зафиксирован\S*|застрягл\S*|застряла|зависл\S*)/i;
// Backlog 327 (Blickwinkel „Diesel versulzt oder AdBlue eingefroren“, Wintereinbruch): Hinweise (sicher abstellen, nicht dauernd neu starten;
// kein offenes Feuer/Heißluft, keine Zusätze ohne Freigabe; Leitung entscheidet; Tankort/AdBlue-Warnung/Standzeit notieren; Auswahl „Kann das Fahrzeug
// fahren?“) – reine Information, keine Frist, keine Temperaturangabe. „Diesel getankt“, „Scheibe eingefroren“, „Wischwasser gefroren“, „Tiefkühlware
// gefroren“, „Diesel ausgelaufen“ lösen nichts aus
const GELFUEL_HINT = /(?<![a-zäöüß-])(?:diesel|dieselkraftstoff|kraftstoff|sprit|treibstoff|adblue|ad-blue|harnstoff|harnstoffl(?:ö|oe|o)sung|kraftstofffilter|dieselfilter|kraftstoffleitung(?:en)?|dieselleitung(?:en)?|adblue-leitung(?:en)?|adblue-tank|adbluetank)(?![a-zäöüß-])\s+(?:\S+\s+){0,3}?(?:versulzt|eingefroren|gefroren|zugefroren|geliert|ausgeflockt|eingedickt|flockt\s+(?:\S+\s+)?aus|friert\s+(?:\S+\s+)?ein|friert(?![a-zäöüß])|dick\s+geworden|wird\s+(?:\S+\s+)?dick)(?![a-zäöüß])|(?<![a-zäöüß])(?:versulzt|eingefroren|gefroren|zugefroren|geliert|ausgeflockt|eingedickt)(?:e|er|es|en|em)?\s+(?:\S+\s+)?(?:diesel|dieselkraftstoff|kraftstoff|adblue|ad-blue|harnstoff|kraftstofffilter|dieselfilter|kraftstoffleitung(?:en)?|dieselleitung(?:en)?)(?![a-zäöüß])|(?<![a-z])(?:diesel|fuel|adblue|ad\s*blue|diesel\s+exhaust\s+fluid|fuel\s+filter|fuel\s+lines?)\s+(?:\S+\s+){0,3}?(?:gelled|gelling|gelled\s+up|gel(?![a-z])|waxed|waxing|frozen|froze|freezing|turned\s+to\s+gel)(?![a-z])|(?<![a-z])(?:frozen|gelled|waxed)\s+(?:up\s+)?(?:diesel|fuel|adblue|ad\s*blue|fuel\s+filter|fuel\s+lines?)(?![a-z])|(?<![а-яіїєґ])(?:дизел\S*|солярк\S*|паливо|палива|пальне|пального|топливо|топлива|adblue|адблю|сечовин\S*|мочевин\S*|(?:паливн|топливн)\S*\s+(?:фільтр|фильтр)\S*)\s+(?:\S+\s+){0,3}?(?:замерз\S*|застиг\S*|загус\S*|загуст\S*|парафін\S*|парафин\S*|кристаліз\S*|кристаллиз\S*)/i;
// Backlog 328 (Blickwinkel „Warndreieck, Verbandkasten, Feuerlöscher oder Unterlegkeil fehlt bzw. abgelaufen“): Hinweise (vor Abfahrt Leitung
// anrufen, sie entscheidet über Ersatz/Stehenbleiben; Gefahrgut nur mit vollständiger Ausrüstung; nichts unbemerkt aus anderem Fahrzeug nehmen; was fehlt/
// Prüfdatum/Foto; Auswahl „Kann das Fahrzeug fahren?“) – reine Information, keine Frist, keine Vorschrift mit Paragraf. „Warnleuchte leuchtet“ (Kontroll-
// leuchte), „Warndreieck aufgestellt“, „Verbandskasten geprüft“ lösen nichts aus
const SAFETYKIT_HINT = /(?<![a-zäöüß-])(?:warndreieck|warnweste(?:n)?|verbandkasten|verbandskasten|verbandk(?:ä|ae|a)sten|erste-hilfe-kasten|feuerl(?:ö|oe|o)scher|unterlegkeil(?:e)?|radkeil(?:e)?|bordwerkzeug|wagenheber)(?:s|es)?(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:fehlt|fehlen|weg(?![a-zäöüß])|verschwunden|verloren|liegen\s+gelassen|liegengelassen|nicht\s+(?:mehr\s+)?(?:da|vorhanden|an\s+bord|im\s+fahrzeug|im\s+lkw)(?![a-zäöüß])|abgelaufen|leer(?![a-zäöüß])|benutzt|ausgel(?:ö|oe|o)st|kaputt|defekt|besch(?:ä|ae|a)digt|unvollst(?:ä|ae|a)ndig)|(?<![a-zäöüß-])(?:warnleuchte|warnlampe)\s+(?:\S+\s+){0,2}?(?:fehlt|weg(?![a-zäöüß])|nicht\s+(?:mehr\s+)?(?:da|vorhanden|an\s+bord)(?![a-zäöüß]))|(?<![a-zäöüß])(?:kein|keine|keinen)\s+(?:warndreieck|warnweste|verband\S*kasten|erste-hilfe-kasten|feuerl(?:ö|oe|o)scher|unterlegkeil\S*|radkeil\S*)(?![a-zäöüß])|(?<![a-z])(?:warning\s+triangle|hi-?vis(?:\s+(?:vest|jacket))?|high[-\s]visibility\s+(?:vest|jacket)|safety\s+vest|first[-\s]aid\s+kit|fire\s+extinguisher|wheel\s+chocks?|chocks)\s+(?:\S+\s+){0,3}?(?:missing|gone|lost|left\s+behind|not\s+(?:there|on\s+board|in\s+the\s+(?:cab|truck|vehicle))|expired|out\s+of\s+date|empty|used|discharged|damaged|broken|incomplete)(?![a-z])|(?<![a-z])(?:no|missing)\s+(?:warning\s+triangle|first[-\s]aid\s+kit|fire\s+extinguisher|wheel\s+chocks?|hi-?vis\s+(?:vest|jacket))(?![a-z])|(?<![а-яіїєґ])(?:знак\S*\s+аварійн\S*\s+зупинк\S*|аварійн\S*\s+знак\S*|аварийн\S*\s+знак\S*|знак\S*\s+аварийн\S*|аптечк\S*|вогнегасник\S*|огнетушител\S*|жилет\S*|противідкатн\S*|противооткатн\S*)\s+(?:\S+\s+){0,3}?(?:нема\S*|відсутн\S*|отсутств\S*|прострочен\S*|просрочен\S*|порожн\S*|пуст\S*|зламан\S*|сломан\S*|пошкоджен\S*|поврежден\S*|використан\S*|использован\S*)|(?<![а-яіїєґ])(?:немає|нема|нет)\s+(?:\S+\s+)?(?:аптечк\S*|вогнегасник\S*|огнетушител\S*|аварійн\S*\s+знак\S*|знак\S*\s+аварій\S*|аварийн\S*\s+знак\S*|жилет\S*|противідкатн\S*|противооткатн\S*)/i;
// Backlog 580 (Blickwinkel „Diktat/Tippfehler“): vorn ergänzt – Schreibweisen ohne Umlaut, getrennt geschrieben, Tippfehler, Umschrift
const WHEEL_HINT = /(?<![a-zäöüß-])(?:(?:anh(?:ä|ae|a)nger|auflieger|vorder|hinter|lenk|antriebs|zwillings)?(?:reifen|achse)|achsen)(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:hei(?:ß|ss)|qualm(?:t|en)|rauch(?:t|en)|gl(?:ü|ue|u)h(?:t|en))(?![a-zäöüß])|(?<![a-z])(?:tyres?|tires?|axles?|hubs?)\s+(?:\S+\s+){0,2}?(?:(?:running|getting|very|too)\s+)?(?:hot|smoking|smoke|burning)(?![a-z])|(?<![a-zäöüß-])rad\s*mut+ern?\s+(?:\S+\s+){0,3}?(?:locker(?![a-zäöüß])|locka(?![a-zäöüß])|lose(?![a-zäöüß])|abgefallen|gelockert|fehlt|fehlen)|(?<![a-zäöüß-])rader\s+(?:\S+\s+){0,2}?(?:wackelt|wackeln|eiert|eiern)|(?<![a-zäöüß-])(?:radmutter|radmuttern|radbolzen|radschraube|radschrauben|radmutternindikator(?:en)?)\s+(?:\S+\s+){0,3}?(?:locker(?![a-zäöüß])|lose(?![a-zäöüß])|hat\s+sich\s+gel(?:ö|oe|o)st|haben\s+sich\s+gel(?:ö|oe|o)st|fehlt|fehlen|abgerissen|abgebrochen|abgeschert|verloren|weg(?![a-zäöüß])|verdreht|lockern\s+sich|lockert\s+sich)|(?<![a-zäöüß])(?:lockere|lose|fehlende|abgerissene|abgescherte)[rnsm]?\s+(?:\S+\s+)?(?:radmutter|radbolzen|radschraube)\S*|(?<![a-zäöüß-])(?:vorder|hinter|zwillings|anh(?:ä|ae|a)nger|auflieger)?(?:rad|r(?:ä|ae|a)der)\s+(?:\S+\s+){0,2}?(?:wackelt|wackeln|eiert|eiern|locker(?![a-zäöüß])|hat\s+spiel|abgefallen|abgerissen|verloren|weggeflogen|hei(?:ß|ss)(?![a-zäöüß])|qualmt|raucht|gl(?:ü|ue|u)ht)|(?<![a-zäöüß-])(?:radlager|radnabe|radnaben)\s+(?:\S+\s+){0,3}?(?:hei(?:ß|ss)|qualmt|raucht|gl(?:ü|ue|u)ht|defekt|kaputt|brummt|mahlt|heult|ger(?:ä|ae|a)usch|hat\s+spiel|locker(?![a-zäöüß])|wackelt)|(?<![a-zäöüß-])felge[n]?\s+(?:\S+\s+){0,2}?(?:gerissen|gebrochen|verbogen|hat\s+(?:einen\s+)?riss)|(?<![a-zäöüß])riss\s+in\s+der\s+felge|(?<![a-z])(?:wheel\s+(?:nut|stud|bolt)s?|lug\s+(?:nut|bolt)s?)\s+(?:\S+\s+){0,3}?(?:loose|missing|sheared|broken|gone|came\s+(?:off|loose)|backing\s+off)(?![a-z])|(?<![a-z])(?:loose|missing|sheared|broken)\s+(?:wheel\s+(?:nut|stud|bolt)|lug\s+(?:nut|bolt))s?|(?<![a-z])(?<!steering\s)(?<!spare\s)wheels?\s+(?:\S+\s+){0,2}?(?:wobbl\S*|is\s+loose|came\s+off|fell\s+off|come\s+off|coming\s+off|(?:is\s+|got\s+)?(?:very\s+)?hot(?![a-z])|smoking)|(?<![a-z])(?:lost|losing)\s+a\s+wheel|(?<![a-z])(?:wheel\s+)?(?:bearing|hub)s?\s+(?:\S+\s+){0,3}?(?:hot|smoking|noisy|grinding|humming|failed|gone|broken|has\s+play)(?![a-z])|(?<![a-z])(?:cracked|broken)\s+(?:wheel\s+)?rims?|(?<![a-z])rims?\s+(?:\S+\s+)?(?:cracked|broken|bent)(?![a-z])|(?<![а-яіїєґ])(?:колісн\S*|колесн\S*)\s+(?:гайк\S*|болт\S*|шпильк\S*)\s+(?:\S+\s+){0,2}?(?:ослаб\S*|відкрут\S*|открут\S*|розкрут\S*|раскрут\S*|нема\S*|відсутн\S*|отсутств\S*|злама\S*|слома\S*|відірв\S*|оторв\S*)|(?<![а-яіїєґ])(?:гайк\S*|болт\S*|шпильк\S*)\s+(?:на\s+)?колес\S*\s+(?:\S+\s+){0,2}?(?:ослаб\S*|відкрут\S*|открут\S*|розкрут\S*|раскрут\S*|нема\S*|відсутн\S*|отсутств\S*|злама\S*|слома\S*|відірв\S*|оторв\S*)|(?<![а-яіїєґ])колес\S*\s+(?:\S+\s+){0,2}?(?:хита\S*|болта\S*|шата\S*|відпал\S*|отвал\S*|злетіл\S*|слетел\S*|гаряч\S*|горяч\S*|дими\S*|дымит\S*)|(?<![а-яіїєґ])(?:відпал\S*|отвал\S*|загуби\S*|потеря\S*|злетіл\S*|слетел\S*)\s+(?:\S+\s+)?колес\S*|(?<![а-яіїєґ])(?:маточин\S*|ступиц\S*|підшипник\S*|подшипник\S*)\s+(?:\S+\s+){0,3}?(?:гаряч\S*|горяч\S*|гріє\S*|греет\S*|гуд\S*|дими\S*|дымит\S*|злама\S*|слома\S*|люфт\S*)/i;
const TOLL_HINT = /(?<![a-zäöüß-])(?:mautger(?:ä|ae|a)t|mautbox|maut[- ]box|maut-obu|obu|on-?board-?unit|toll\s*collect(?:-?box|-?ger(?:ä|ae|a)t)?|go-?box)(?:e|en|s|es)?\s+(?:\S+\s+){0,3}?(?:defekt|kaputt|ausgefallen|geht\s+nicht|funktioniert\s+nicht|zeigt\s+(?:\S+\s+)?(?:rot|fehler\S*|st(?:ö|oe|o)rung)|leuchtet\s+rot|blinkt\s+rot|rot(?![a-zäöüß])|fehler\S*|st(?:ö|oe|o)rung|piept|bleibt\s+dunkel|dunkel(?![a-zäöüß])|aus(?![a-zäöüß])|tot(?![a-zäöüß])|fehlt|weg(?![a-zäöüß])|abgefallen|reagiert\s+nicht|bucht\s+nicht|startet\s+nicht)|(?<![a-zäöüß])(?:mautst(?:ö|oe|o)rung|mautfehler)|(?<![a-zäöüß])maut\s+(?:\S+\s+){0,2}?nicht\s+(?:ab)?gebucht|(?<![a-zäöüß])(?:kein|keine)\s+maut\s+(?:\S+\s+)?gebucht|(?<![a-z])(?:toll\s+(?:box|unit|device|obu)|obu|on-?board\s+unit)s?\s+(?:\S+\s+){0,3}?(?:not\s+working|doesn['’]?t\s+work|isn['’]?t\s+working|broken|faulty|failed|dead|error|red(?![a-z])|beeping|missing|off(?![a-z])|won['’]?t\s+(?:book|switch\s+on|start))|(?<![a-z])toll\s+(?:\S+\s+)?(?:not\s+booked|error)(?![a-z])|(?<![a-z])obu\s+(?:\S+\s+){0,2}?(?:не\s+працю\S*|не\s+работа\S*|зламан\S*|сломан\S*|несправн\S*|неисправ\S*|червон\S*|красн\S*|помилк\S*|ошибк\S*|пищ\S*|пікає|вимкн\S*|выключ\S*|нема\S*|відсутн\S*|отсутств\S*)|(?<![а-яіїєґ])(?:пристр\S*|блок\S*|коробк\S*|устройств\S*|бокс\S*)\s+(?:\S+\s+)?(?:мит\S*|оплат\S*\s+(?:дорог|проїзд|проезд)\S*|сплат\S*\s+мит\S*)\s+(?:\S+\s+){0,2}?(?:не\s+працю\S*|не\s+работа\S*|зламан\S*|сломан\S*|несправн\S*|неисправ\S*|червон\S*|красн\S*|помилк\S*|ошибк\S*|пищ\S*|пікає|вимкн\S*|выключ\S*|нема\S*|відсутн\S*|отсутств\S*)|(?<![а-яіїєґ])(?:бортов\S*\s+(?:пристр|блок|устройств)\S*|толл?\s*колл?ект\S*|toll\s*collect\S*)\s+(?:\S+\s+){0,2}?(?:не\s+працю\S*|не\s+работа\S*|зламан\S*|сломан\S*|несправн\S*|неисправ\S*|червон\S*|красн\S*|помилк\S*|ошибк\S*|пищ\S*|пікає|вимкн\S*|выключ\S*|нема\S*|відсутн\S*|отсутств\S*)/i;
// Backlog 334 (Blickwinkel „Standheizung oder Klimaanlage im Fahrerhaus ausgefallen – Ruhezeit im Lkw“): Hinweise (vor der Pause/Ruhezeit Leitung
// anrufen, sie klärt Verbleib/Unterkunft/Planung; nicht den Motor im Stand laufen lassen, keine Gas-/Heizgeräte im Fahrerhaus, bei Abgasgeruch/Rauch
// Gerät aus und raus; Gerät nicht öffnen, keine Sicherungen überbrücken; Anzeige/Fehlercode/Foto; Auswahl „Kann das Fahrzeug fahren?“) – reine Information,
// keine Frist, keine Temperaturangabe. „Standheizung eingeschaltet/läuft“, „Klimaanlage gewartet“, „Sitzheizung defekt“, „Kühlaggregat ausgefallen“ lösen nichts aus
const CLIMATE_HINT = /(?<![a-zäöüß-])(?:standheizung|standklima(?:anlage)?|standk(?:ü|ue|u)hlung|parkk(?:ü|ue|u)hlung|klimaanlage|klimaautomatik|klimakompressor|klima(?![a-zäöüß-])|dieselheizung|luftheizung|webasto|eberspächer|eberspaecher)(?:en|s)?(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:ausgefallen|f(?:ä|ae|a)llt\s+aus|geht\s+(?:\S+\s+){0,2}?(?:nicht|aus)(?![a-zäöüß])|funktioniert\s+nicht|defekt|kaputt|startet\s+nicht|springt\s+nicht\s+an|heizt\s+nicht|k(?:ü|ue|u)hlt\s+nicht|wird\s+nicht\s+(?:mehr\s+)?(?:warm|kalt|k(?:ü|ue|u)hl)|bleibt\s+(?:kalt|warm|aus)|bl(?:ä|ae|a)st\s+(?:nur\s+)?(?:nicht|warm|kalt)|zeigt\s+(?:\S+\s+)?(?:fehler\S*|st(?:ö|oe|o)rung)|fehler\S*|st(?:ö|oe|o)rung|qualmt|raucht|stinkt|piept|blinkt|schaltet\s+(?:sich\s+)?(?:\S+\s+)?ab|reagiert\s+nicht)|(?<![a-z-])(?:(?:parking|night|cab|auxiliary|diesel|bunk)\s+(?:heater|heating|cooler|air\s*con(?:ditioning|ditioner)?)|air\s*con(?:ditioning|ditioner)?|aircon|a\/c|ac|climate\s+control)(?![a-z])\s+(?:\S+\s+){0,3}?(?:not\s+(?:working|heating|cooling|starting)|doesn['’]?t\s+(?:work|heat|cool|start)|isn['’]?t\s+(?:working|heating|cooling)|won['’]?t\s+(?:start|turn\s+on|switch\s+on|work)|broken|faulty|failed|dead|error|fault(?![a-z])|blowing\s+(?:warm|hot|cold)|smoking|stopped\s+working|keeps\s+(?:cutting|switching)\s+(?:out|off))|(?<![а-яіїєґ])(?:кондиц\S*|кондиціон\S*|автономк\S*|вебасто|webasto|(?:автономн\S*|стоянков\S*|додатков\S*|дополнительн\S*)\s+(?:обігрівач\S*|опаленн\S*|отоплен\S*|отопител\S*|пічк\S*|печк\S*))\s+(?:\S+\s+){0,2}?(?:не\s+працю\S*|не\s+работа\S*|зламал\S*|зламан\S*|сломал\S*|сломан\S*|несправн\S*|неисправ\S*|не\s+гріє|не\s+греет|не\s+охолоджу\S*|не\s+холод\S*|не\s+охлажда\S*|не\s+запуска\S*|не\s+заводит\S*|не\s+вмика\S*|не\s+включа\S*|помилк\S*|ошибк\S*|дими\S*|дымит\S*|вийшов\s+з\s+ладу|вышел\s+из\s+строя)/i;
// Backlog 335 (Blickwinkel „Fensterheber defekt – Seitenscheibe geht nicht mehr zu“): Hinweise (Leitung anrufen, vor allem vor Pause/Ruhezeit/Abstellen –
// Fahrerhaus nicht sicher verschließbar; Schlüssel/Papiere/Wertsachen nicht im offenen Fahrerhaus; nicht mit Gewalt hochdrücken, Verkleidung nicht abbauen,
// Behelf nur nach Absprache ohne Sicht zu verdecken; Seite/Stellung/Foto; Auswahl „Kann das Fahrzeug fahren?“) – reine Information, keine Frist.
// Eingeschlagene/gerissene Scheiben bleiben beim Glas-Hinweis; „Scheibe beschlägt“, „Fenster kaputt“, „broken window“ lösen ihn nicht aus
const WINDOW_HINT = /(?<![a-zäöüß-])(?:fensterheber(?:motor|schalter)?|elektrische[nrs]?\s+fensterheber)(?:n|s)?(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:ausgefallen|f(?:ä|ae|a)llt\s+aus|geht\s+nicht|funktioniert\s+nicht|defekt|kaputt|klemmt|h(?:ä|ae|a)ngt|reagiert\s+nicht|ger(?:ä|ae|a)usch\S*|knackt|rattert|abgebrochen|gerissen)|(?<![a-zäöüß-])(?:seiten|fahrer|beifahrer|t(?:ü|ue|u)r|schiebe|kabinen|fahrerhaus)?(?:fenster|scheibe)(?:n)?(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:klemm(?:t|en)(?![a-zäöüß])|(?:geht|gehen|f(?:ä|ae|a)hrt|fahren|l(?:ä|ae|a)sst\s+sich|lassen\s+sich|kommt|kommen)\s+(?:\S+\s+)?nicht\s+(?:mehr\s+|richtig\s+|ganz\s+)?(?:zu|hoch|rauf|nach\s+oben|runter|herunter|nach\s+unten|auf|schlie(?:ß|ss)en|(?:ö|oe|o)ffnen)(?![a-zäöüß])|(?:schlie(?:ß|ss)t|schlie(?:ß|ss)en)\s+(?:\S+\s+)?nicht(?![a-zäöüß])|bleibt\s+(?:\S+\s+)?(?:offen|unten|halb\s+offen|einen\s+spalt\s+offen)|bleiben\s+(?:\S+\s+)?(?:offen|unten)|rutscht\s+(?:\S+\s+)?(?:runter|herunter|nach\s+unten|ab)|rutschen\s+(?:\S+\s+)?(?:runter|herunter|nach\s+unten)|ist\s+aus\s+der\s+f(?:ü|ue|u)hrung|aus\s+der\s+f(?:ü|ue|u)hrung\s+gesprungen|in\s+die\s+t(?:ü|ue|u)r\s+gefallen)|(?<![a-z-])(?:(?:power|electric|side|driver['’]?s?|passenger['’]?s?|cab|door)\s+)?window(?:\s+(?:regulator|motor|switch|winder))?s?(?![a-z])\s+(?:\S+\s+){0,3}?(?:won['’]?t|doesn['’]?t|does\s+not|will\s+not|can['’]?t|cannot|isn['’]?t|is\s+not)\s+(?:\S+\s+)?(?:close|closing|shut|go(?:ing)?\s+(?:up|down)|wind\s+(?:up|down)|open|work|working)|(?<![a-z-])window\S*\s+(?:\S+\s+){0,2}?(?:stuck\s+(?:open|down|half)|keeps\s+(?:sliding|dropping|falling)\s+down|(?:slid|dropped|fell)\s+(?:down\s+)?into\s+the\s+door)|(?<![a-z-])(?:window\s+(?:regulator|motor|switch|winder)|power\s+window)s?\s+(?:\S+\s+){0,2}?(?:broken|faulty|failed|dead|not\s+working|stuck)|(?<![а-яіїєґ])(?:склопідйомник\S*|стеклопод(?:ъ|ь)[её]мник\S*)\s+(?:\S+\s+){0,2}?(?:не\s+працю\S*|не\s+работа\S*|зламал\S*|зламан\S*|сломал\S*|сломан\S*|несправн\S*|неисправ\S*|заклин\S*)|(?<![а-яіїєґ])(?:вікн\S*|бічн\S*\s+скл\S*|скло|склом|стекло|окн\S*|окошк\S*)\s+(?:\S+\s+){0,2}?(?:не\s+закрива\S*|не\s+закрыва\S*|не\s+підніма\S*|не\s+зачиня\S*|не\s+піднима\S*|не\s+поднима\S*|не\s+опуска\S*|застряг\S*|застрял\S*|залишається\s+відкрит\S*|остается\s+открыт\S*|остаётся\s+открыт\S*|сповза\S*|сполза\S*)/i;
// Backlog 337 (Blickwinkel „Tankdeckel oder AdBlue-Deckel verloren, klemmt oder schließt nicht“): Hinweise (vor der Weiterfahrt Leitung anrufen –
// austretender Kraftstoff macht die Fahrbahn rutschig, Schmutz/Wasser im Tank; kein Behelf mit Lappen/Folie/Klebeband, nicht randvoll tanken, Ersatz klärt die
// Leitung; auslaufend → Leck-, aufgebrochen/abgezapft → Diebstahl-Schritte; Diesel/AdBlue, Seite, Zustand, Ort/Zeit, Foto; Auswahl „Kann das Fahrzeug fahren?“) –
// reine Information, keine Frist. „Tankdeckel aufgebrochen“ bleibt beim Diebstahl-Hinweis, „Tankanzeige defekt“, „Tankkarte verloren“, „Tankdeckel geöffnet“ lösen nichts aus
const FUELCAP_HINT = /(?<![a-zäöüß-])(?:(?:(?:diesel|adblue|harnstoff|kraftstoff)-?)?tank(?:deckel|verschlu(?:ss|ß)|klappe|schloss)|(?:diesel|adblue|harnstoff|kraftstoff)-?deckel|deckel\s+(?:vom|von\s+dem|des|am)\s+(?:(?:diesel|adblue|harnstoff|kraftstoff)-?)?(?:tank\S*|diesel|adblue))(?:dichtung|s|es|n)?(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:verloren|fehlt|fehlen|weg(?![a-zäöüß])|abgefallen|abgerissen|abgebrochen|kaputt|defekt|klemmt|klemmen|(?:h(?:ä|ae|a)ngt|sitzt)\s+fest|(?:geht|gehen)\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:auf|zu|ab|drauf|ran)(?![a-zäöüß])|(?:schlie(?:ß|ss)t|schlie(?:ß|ss)en|passt|h(?:ä|ae|a)lt|rastet|dichtet)\s+(?:\S+\s+)?nicht(?![a-zäöüß])|l(?:ä|ae|a)sst\s+sich\s+(?:\S+\s+){0,2}?nicht\s+(?:mehr\s+)?(?:(?:ö|oe|o)ffnen|schlie(?:ß|ss)en|abschrauben|aufschrauben|zuschrauben|zudrehen|aufdrehen|aufmachen|zumachen|abnehmen|abschlie(?:ß|ss)en)|liegen\s+(?:ge)?lassen|vergessen|steht\s+offen|offen\s+gelassen)|(?<![a-zäöüß-])(?:ohne|kein(?:en)?)\s+(?:\S+\s+)?(?:(?:(?:diesel|adblue|harnstoff|kraftstoff)-?)?tank(?:deckel|verschlu(?:ss|ß)|klappe|schloss)|(?:diesel|adblue|harnstoff|kraftstoff)-?deckel|deckel\s+(?:vom|von\s+dem|des|am)\s+(?:(?:diesel|adblue|harnstoff|kraftstoff)-?)?(?:tank\S*|diesel|adblue))(?![a-zäöüß])|(?<![a-z-])(?:(?:fuel|diesel|tank|adblue|def|gas|petrol)\s+(?:tank\s+)?(?:filler\s+)?(?:cap|lid|flap)s?)(?![a-z])\s+(?:\S+\s+){0,2}?(?:missing|lost|gone|stuck|jammed|broken|(?:fell|came)\s+off|left\s+(?:\S+\s+){0,2}?(?:at|behind)|(?:won['’]?t|doesn['’]?t|does\s+not|will\s+not|can['’]?t|cannot)\s+(?:be\s+)?(?:open|opened|close|closed|shut|lock|locked|come\s+off|removed|screw\S*|fit|seal))(?![a-z])|(?<![a-z-])(?:lost|missing|no|without|lose)\s+(?:the\s+|a\s+|my\s+)?(?:(?:fuel|diesel|tank|adblue|def|gas|petrol)\s+(?:tank\s+)?(?:filler\s+)?(?:cap|lid|flap)s?)(?![a-z])|(?<![a-z-])(?:can['’]?t|cannot|unable\s+to)\s+(?:open|close|shut|remove|get\s+off|unscrew)\s+(?:the\s+)?(?:(?:fuel|diesel|tank|adblue|def|gas|petrol)\s+(?:tank\s+)?(?:filler\s+)?(?:cap|lid|flap)s?)(?![a-z])|(?<![а-яіїєґ])(?:(?:кришк\S*|крышк\S*)\s+(?:\S+\s+)?(?:бак\S*|паливн\S*|топливн\S*|adblue|адблю))\s+(?:\S+\s+){0,2}?(?:загуб\S*|втрат\S*|втрач\S*|нема\S*|відсутн\S*|потер\S*|нет(?![а-яіїєґ])|отсутств\S*|не\s+відкрива\S*|не\s+закрива\S*|не\s+открыва\S*|не\s+закрыва\S*|не\s+відкруч\S*|не\s+откруч\S*|не\s+знима\S*|застря\S*|заклин\S*|зламал\S*|зламан\S*|сломал\S*|сломан\S*|відпал\S*|отпал\S*|залиши\S*|забу\S*|остави\S*)|(?<![а-яіїєґ])(?:загуби\S*|втрати\S*|потерял\S*|немає|нема(?![а-яіїєґ])|нет(?![а-яіїєґ])|без)\s+(?:\S+\s+)?(?:(?:кришк\S*|крышк\S*)\s+(?:\S+\s+)?(?:бак\S*|паливн\S*|топливн\S*|adblue|адблю))/i;
// Backlog 340 (Blickwinkel „Tankkarte verloren, gestohlen oder an der Kasse abgelehnt“): Hinweise (sofort Leitung anrufen, damit die Karte gesperrt
// werden kann; PIN nie bei der Karte, nie Kartennummer/PIN in die Meldung; bei Diebstahl die Diebstahl-Schritte, Tanken bis dahin klärt die Leitung;
// abgelehnt: nicht mehrfach mit falscher PIN; wann/wo zuletzt, Tankstelle/Meldung am Terminal; Auswahl „Kann das Fahrzeug fahren?“) – reine Information, keine Frist.
// „mit Tankkarte getankt“, „neue Tankkarte erhalten“, „Tankkarte liegt im Handschuhfach“, „Fahrerkarte verloren“ (Fahrtenschreiber) lösen nichts aus
const FUELCARD_HINT = /(?<![a-zäöüß-])(?:(?:tank|kraftstoff|diesel|flotten|dkv|uta)-?karte(?:n)?|(?:dkv|uta)\s+karte(?:n)?)(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:verloren|weg(?![a-zäöüß])|fehlt|gestohlen|geklaut|abhanden\s+gekommen|nicht\s+(?:mehr\s+)?(?:da|auffindbar|zu\s+finden)(?![a-zäöüß])|gesperrt|abgelehnt|funktioniert\s+nicht|geht\s+nicht|wird\s+(?:\S+\s+)?nicht\s+(?:angenommen|gelesen|akzeptiert|erkannt)|defekt|kaputt|gebrochen|abgelaufen|liegen\s+(?:ge)?lassen|vergessen)|(?<![a-zäöüß-])pin\s+(?:\S+\s+){0,2}?(?:(?:tank|kraftstoff|diesel|flotten|dkv|uta)-?karte(?:n)?|(?:dkv|uta)\s+karte(?:n)?)(?![a-zäöüß])\s+(?:\S+\s+)?(?:vergessen|falsch|gesperrt)|(?<![a-z-])(?:(?:fuel|diesel|petrol|gas|fleet)\s+cards?)(?![a-z])\s+(?:\S+\s+){0,2}?(?:lost|missing|stolen|gone|declined|rejected|blocked|expired|broken|not\s+working|(?:doesn['’]?t|won['’]?t|isn['’]?t|does\s+not|will\s+not|is\s+not)\s+(?:work|working|accepted|read)|left\s+(?:\S+\s+){0,2}?(?:at|behind))(?![a-z])|(?<![a-z-])(?:lost|stole|missing|forgot|forgotten|left)\s+(?:the\s+|my\s+|a\s+|our\s+)?(?:(?:fuel|diesel|petrol|gas|fleet)\s+cards?)(?![a-z])|(?<![а-яіїєґ])(?:(?:паливн\S*|топливн\S*|заправн\S*)\s+карт\S*)\s+(?:\S+\s+){0,2}?(?:загуб\S*|втрат\S*|втрач\S*|вкра\S*|украл\S*|украд\S*|потер\S*|заблок\S*|не\s+працю\S*|не\s+работа\S*|не\s+прийма\S*|не\s+принима\S*|не\s+чита\S*|відхил\S*|отклон\S*|нема\S*|нет(?![а-яіїєґ])|забу\S*|залиши\S*|остави\S*)|(?<![а-яіїєґ])(?:загуби\S*|втрати\S*|потерял\S*|вкрали|украли|забу\S*|залиши\S*|остави\S*)\s+(?:\S+\s+)?(?:(?:паливн\S*|топливн\S*|заправн\S*)\s+карт\S*)/i;
// Backlog 341 (Blickwinkel „Unterfahrschutz oder Seitenschutz verbogen – z. B. beim Rangieren“): Hinweise (Leitung informieren, auch ohne fremden
// Schaden; Anstoß an fremdem Eigentum/Fahrzeug → Unfall-Schritte; hängt/schleift etwas → Schritte für lose Teile; nicht selbst zurückbiegen oder abschrauben;
// Lage/Seite, wie stark, Foto mit Kennzeichen; Auswahl „Kann das Fahrzeug fahren?“) – reine Information, keine Frist, keine Rechtsnorm.
// „Unterfahrschutz abgerissen/hängt herunter“ bleibt beim Hinweis für lose Teile; „Stoßstange verbogen“, „Unterfahrschutz geprüft“, „Seitenschutz montiert“ lösen nichts aus
const UNDERRUN_HINT = /(?<![a-zäöüß-])(?:(?:heck|front|seiten)?unterfahrschutz(?:es)?|seitenschutz(?:vorrichtung)?(?:es|en)?|seitliche[nrs]?\s+schutzvorrichtung(?:en)?|rammschutz(?:es)?)(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:verbogen|eingedr(?:ü|ue|u)ckt|besch(?:ä|ae|a)digt|verzogen|krumm|deformiert|angefahren|abgeknickt|geknickt|gebrochen|gerissen|eingerissen|kaputt|defekt|schief|verschoben|fehlt|ist\s+weg)(?![a-zäöüß])|(?<![a-zäöüß-])(?:verbogene[nrs]?|eingedr(?:ü|ue|u)ckte[nrs]?|besch(?:ä|ae|a)digte[nrs]?|krumme[nrs]?)\s+(?:\S+\s+)?(?:(?:heck|front|seiten)?unterfahrschutz(?:es)?|seitenschutz(?:vorrichtung)?(?:es|en)?|seitliche[nrs]?\s+schutzvorrichtung(?:en)?|rammschutz(?:es)?)(?![a-zäöüß])|(?<![a-z-])(?:(?:(?:rear|front|side)\s+)?underrun\s+(?:bar|protection|guard|protector)s?|side\s+guards?|side\s+(?:impact\s+)?protection\s+(?:bar|rail)s?)(?![a-z])\s+(?:\S+\s+){0,2}?(?:bent|damaged|dented|broken|cracked|crooked|missing|pushed\s+in|knocked\s+in|deformed)(?![a-z])|(?<![a-z-])(?:bent|damaged|dented|broken)\s+(?:the\s+)?(?:(?:(?:rear|front|side)\s+)?underrun\s+(?:bar|protection|guard|protector)s?|side\s+guards?|side\s+(?:impact\s+)?protection\s+(?:bar|rail)s?)(?![a-z])|(?<![а-яіїєґ])(?:(?:(?:протипідкатн|противоподкатн|противопідкатн|підкатн|подкатн|відбійн|отбойн)\S*|(?:бічн|бокова|бокової|боков)\S*\s+(?:захист\S*|защит\S*|огорож\S*|ограждени\S*))(?:\s+(?:брус\S*|балк\S*|рам\S*))?)\s+(?:\S+\s+){0,2}?(?:погну\S*|зігну\S*|согну\S*|вигну\S*|пошкоджен\S*|поврежд\S*|зламан\S*|сломан\S*|деформ\S*|вм['’]?ят\S*|відсутн\S*|нема\S*|нет(?![а-яіїєґ]))|(?<![а-яіїєґ])(?:погнут\S*|зігнут\S*|пошкоджен\S*|поврежд\S*|деформ\S*)\s+(?:\S+\s+)?(?:(?:(?:протипідкатн|противоподкатн|противопідкатн|підкатн|подкатн|відбійн|отбойн)\S*|(?:бічн|бокова|бокової|боков)\S*\s+(?:захист\S*|защит\S*|огорож\S*|ограждени\S*))(?:\s+(?:брус\S*|балк\S*|рам\S*))?)/i;
// Backlog 345 (Blickwinkel „Reifen beschädigt, verliert Luft oder ist abgefahren – noch nicht platt“): Hinweise (Beule/tiefer Schnitt/Gewebe sichtbar/
// Lauffläche löst sich/schneller Luftverlust → sicher anhalten, nicht weiterfahren, Reifenpanne-Schritte; Fremdkörper nicht herausziehen; Leitung entscheidet
// über Weiterfahrt/Reifendienst; welcher Reifen, Foto; Auswahl „Kann das Fahrzeug fahren?“) – keine Profiltiefe, keine Frist. „Reifen platt/geplatzt“ bleibt
// beim Reifenpanne-Hinweis; „Reifen gewechselt“, „Reifendruck geprüft“, „Winterreifen montiert“, „neue Reifen bestellt“ lösen nichts aus
const TYRE_HINT = /(?<![a-zäöüß-])(?:rdks|reifendruckkontroll\S*|reifendruck(?:überwachung|ueberwachung)\S*|tpms|(?:tyre|tire)\s+pressure\s+monitor\S*)(?![a-zäöüß-])\s+(?:\S+\s+){0,3}?(?:warn\S*|meldet\s+(?:\S+\s+){0,2}?(?:druckverlust|warnung|zu\s+wenig|niedrig\S*)|leuchtet|alarm\S*|druckverlust|piept|alert\S*|light|warning)|(?<![a-zäöüß-])(?:(?:zwillings|vorder|hinter|antriebs|lenk|auflieger|anh(?:ä|ae|a)nger)?reifen[sn]?|lauffl(?:ä|ae|a)che|reifenflanke|seitenwand|reifenprofil|profil)(?![a-zäöüß])\s+(?:\S+\s+){0,4}?(?:verlier\S*\s+(?:\S+\s+)?luft|beule|blase|ausbeulung|schnitt|eingeschnitten|eingerissen|rissig|risse(?![a-zäöüß])|riss(?![a-zäöüß])|abgefahren|blank(?![a-zäöüß])|(?:kein|zu\s+wenig|wenig|kaum)\s+profil|zu\s+wenig(?![a-zäöüß])|(?:zu\s+)?(?:gering|niedrig)(?![a-zäöüß])|l(?:ö|oe|o)s(?:t|en)\s+sich|besch(?:ä|ae|a)digt|aufgerissen|(?:draht|gewebe|stahl\S*|karkasse)\s+(?:\S+\s+)?(?:schaut|guckt|sichtbar|zu\s+sehen|kommt\s+raus)|scheuer\S*|ber(?:ü|ue|u)hren\s+sich|(?:hat|mit)\s+(?:einen\s+|eine\s+|einem\s+)?(?:nagel|schraube|fremdk(?:ö|oe|o)rper))|(?<![a-zäöüß-])(?:reifenschaden|reifensch(?:ä|ae|a)den|reifenbeule|reifenriss|reifendruckwarnung|reifendruck-warnung|luftverlust\s+(?:\S+\s+)?(?:am|im)\s+(?:\S+\s+)?reifen\S*)|(?<![a-zäöüß-])(?:nagel|schraube|fremdk(?:ö|oe|o)rper|glasscherbe|beule|blase|schnitt|riss)\s+(?:\S+\s+){0,2}?(?:im|in\s+der|in\s+dem|am|an\s+der)\s+(?:\S+\s+)?(?:reifen|lauffl(?:ä|ae|a)che|seitenwand|flanke|reifenflanke)\S*|(?<![a-zäöüß-])reifendruck\s+(?:\S+\s+){0,2}?(?:zu\s+)?(?:niedrig|gering|f(?:ä|ae|a)llt|sinkt|warnung|warnt)|(?<![a-zäöüß-])(?:scheuert|scheuern|schleift|schleifen)\s+(?:\S+\s+)?(?:am|an\s+den|an\s+dem|an\s+der)\s+(?:\S+\s+)?reifen\S*|(?<![a-z-])(?:tyre|tire)s?\s+(?:\S+\s+){0,2}?(?:bulge|bulging|cut(?![a-z])|cracked|cracks|worn|bald|losing\s+air|leaking\s+air|going\s+down|(?:is\s+)?low\s+on\s+air|damaged|tread\s+(?:\S+\s+)?(?:coming\s+off|separating|low|worn)|sidewall\s+damage\S*|rubbing)(?![a-z])|(?<![a-z-])(?:nail|screw|bolt|bulge|cut|glass)\s+in\s+(?:the\s+|a\s+)?(?:\S+\s+)?(?:tyre|tire)s?(?![a-z])|(?<![a-z-])(?:bald|worn|damaged|bulging)\s+(?:\S+\s+)?(?:tyre|tire)s?(?![a-z])|(?<![a-z-])(?:tyre|tire)\s+pressure\s+(?:\S+\s+)?(?:warning|low|light|dropping)|(?<![а-яіїєґ])(?:шин\S*|колес\S*|покришк\S*|покрышк\S*|протектор\S*)\s+(?:\S+\s+){0,2}?(?:зношен\S*|изношен\S*|лис\S*|лыс\S*|гриж\S*|грыж\S*|поріз\S*|порез\S*|тріщин\S*|трещин\S*|пошкоджен\S*|поврежд\S*|трав\S*\s+(?:\S+\s+)?повітр\S*|трав\S*\s+(?:\S+\s+)?воздух\S*|втрача\S*\s+тиск|теря\S*\s+давлен\S*|відшаров\S*|отслаива\S*)|(?<![а-яіїєґ])(?:гриж\S*|грыж\S*|цвях\S*|гвозд\S*|саморіз\S*|саморез\S*|шуруп\S*|поріз\S*|порез\S*)\s+(?:\S+\s+)?(?:на|в|у)\s+(?:\S+\s+)?(?:шин\S*|колес\S*|покришк\S*|покрышк\S*|протектор\S*)|(?<![а-яіїєґ])(?:низьк\S*|низк\S*)\s+тиск\S*\s+(?:\S+\s+)?(?:в|у)\s+(?:\S+\s+)?шин\S*/i;
// Backlog 348 (Blickwinkel „Fahrerhaus lässt sich nicht abschließen – Zentralverriegelung oder Schlüssel defekt“): Hinweise (Leitung anrufen, vor allem vor
// Pause/Ruhezeit/Abstellen; Fahrerhaus nicht offen unbeaufsichtigt, Schlüssel/Papiere/Tankkarte/Wertsachen nicht darin; Schloss/Schlüssel nicht mit Gewalt, abgebrochenes
// Stück nicht selbst herausholen; welche Tür, was genau, Foto; Auswahl „Kann das Fahrzeug fahren?“) – reine Information, keine Frist.
// „Schlüssel verloren“ bleibt beim Schlüssel-/Papiere-Hinweis; „Schlüssel abgegeben“, „Zentralverriegelung geht wieder“, „Tür abgeschlossen“ lösen nichts aus
const CABLOCK_HINT = /(?<![a-zäöüß-])(?:zentralverriegelung|funkschl(?:ü|ue|u)ssel|funkfernbedienung|schl(?:ü|ue|u)sselfernbedienung|(?:fahrzeug|lkw|t(?:ü|ue|u)r)?schl(?:ü|ue|u)ssel|t(?:ü|ue|u)rschloss|t(?:ü|ue|u)rschl(?:ö|oe|o)sser|t(?:ü|ue|u)rverriegelung)(?:s|n)?(?![a-zäöüß])(?![^.;!?]*(?:z(?:ü|ue|u)ndschloss|z(?:ü|ue|u)ndung|lenkradschloss|lenkradsperre))\s+(?:\S+\s+){0,3}?(?:eingefroren|zugefroren|festgefroren|defekt|kaputt|ausgefallen|geht\s+nicht|gehen\s+nicht|funktioniert\s+nicht|reagiert\s+nicht|klemmt|abgebrochen|gebrochen|dreht\s+(?:sich\s+)?nicht|l(?:ä|ae|a)sst\s+sich\s+nicht\s+(?:mehr\s+)?drehen|(?:schlie(?:ß|ss)t|sperrt|verriegelt)\s+(?:\S+\s+)?nicht(?:\s+mehr)?\s+(?:ab|zu)?(?![a-zäöüß])|verriegelt\s+nicht)|(?<![a-zäöüß-])(?:lkw|fahrzeug|fahrerhaus|kabine|zugmaschine|wagen)\s+(?:\S+\s+){0,2}?(?:l(?:ä|ae|a)sst\s+sich|kann\s+(?:ich|man))\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:\S+\s+)?(?:abschlie(?:ß|ss)en|abschlie(?:ß|ss)t|verriegeln|zusperren|absperren)|(?<![a-zäöüß-])schl(?:ü|ue|u)ssel\s+(?:\S+\s+)?(?:im|in\s+der|in\s+dem)\s+(?:t(?:ü|ue|u)r)?schloss\s+(?:\S+\s+)?abgebrochen|(?<![a-z-])(?:central\s+locking|key\s+fob|remote\s+key|door\s+locks?|cab\s+locks?)(?![a-z])\s+(?:\S+\s+){0,2}?(?:not\s+working|doesn['’]?t\s+work|isn['’]?t\s+working|broken|broke|failed|dead|stuck|jammed|snapped|won['’]?t\s+(?:lock|turn|work))(?![a-z])|(?<![a-z-])(?:cab|truck|lorry|vehicle|tractor\s+unit)\s+(?:(?!doors?\s)\S+\s+)?(?:won['’]?t|doesn['’]?t|does\s+not|can['’]?t|cannot|will\s+not)\s+(?:be\s+)?lock(?:ed)?(?![a-z])|(?<![a-z-])key\s+(?:\S+\s+)?(?:snapped|broke\s+off|broken\s+off)\s+(?:\S+\s+)?in\s+(?:the\s+)?(?:\S+\s+)?lock|(?<![а-яіїєґ])(?:центральн\S*\s+замок\S*|брелок\S*|брелк\S*|ключ\S*|замок\s+двер\S*|замк\S*\s+двер\S*|дверн\S*\s+замок\S*)(?![^.;!?]*(?:запалюван|зажиган))\s+(?:\S+\s+){0,2}?(?:застряг\S*|застрял\S*|не\s+працю\S*|не\s+работа\S*|не\s+спрацьову\S*|не\s+срабатыва\S*|зламав\S*|зламал\S*|зламан\S*|сломал\S*|сломан\S*|заклин\S*|не\s+поверта\S*|не\s+повора\S*)|(?<![а-яіїєґ])(?:кабін\S*|кабин\S*|машин\S*|вантажівк\S*|грузовик\S*)\s+(?:\S+\s+)?не\s+(?:\S+\s+)?(?:зачиня\S*|закрива\S*|закрыва\S*|запира\S*)\s+на\s+ключ/i;
// Backlog 350 (Blickwinkel „Lkw vibriert, schaukelt oder flattert“): Hinweise (vorsichtig verringern, sicher anhalten; von außen ansehen ohne unter das Fahrzeug
// zu greifen – Rad/Reifen/Ladung/Kupplung, Verweis auf Rad- und Reifen-Schritte; Leitung entscheidet, nicht selbst schrauben; ab welcher Geschwindigkeit/Situation, wo
// spürbar, kürzlich Reifenwechsel, Foto; Auswahl „Kann das Fahrzeug fahren?“) – reine Information, keine Frist. „Handy vibriert“, „Sitz vibriert“ (Spurhalteassistent) nicht
const VIBR_HINT = /(?<![a-zäöüß-])(?<!(?:handy|telefon|smartphone|tablet|sitz|fahrersitz|uhr|phone|seat|телефон|сидіння|сиденье)\s+)(?:vibriert|vibrieren|vibration(?:en)?|schaukelt|schaukeln|aufschaukeln|schaukelt\s+sich\s+auf|flattert|(?:lenkrad)?flattern|rüttelt|ruettelt|rütteln|unwucht|schwingt\s+(?:\S+\s+)?auf|zittert)(?![a-zäöüß])(?!\s+(?:\S+\s+)?(?:nicht\s+mehr|weg(?![a-zäöüß])|behoben|gone|fixed|stopped|no\s+longer))|(?<![a-z-])(?<!(?:handy|telefon|smartphone|tablet|sitz|fahrersitz|uhr|phone|seat|телефон|сидіння|сиденье)\s+)(?:vibrates|vibrating|vibration|vibrations|shakes|shaking|shudders|shuddering|judders|juddering|sways|swaying|wheel\s+imbalance|out\s+of\s+balance)(?![a-z])(?!\s+(?:\S+\s+)?(?:nicht\s+mehr|weg(?![a-zäöüß])|behoben|gone|fixed|stopped|no\s+longer))|(?<![а-яіїєґ])(?<!(?:handy|telefon|smartphone|tablet|sitz|fahrersitz|uhr|phone|seat|телефон|сидіння|сиденье)\s+)(?:вібру\S*|вібрац\S*|трясе|трусить|трясёт|трясет|вибриру\S*|вибрац\S*|розгойду\S*|раскачива\S*|хитає|качає)(?![а-яіїєґ])|(?<![a-zäöüß-])(?:kardanwelle|kardan|gelenkwelle|antriebswelle|mittellager)(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:schl(?:ä|ae|a)gt|klappert|klopft|wackelt|hat\s+spiel|defekt|kaputt|ausgeschlagen)|(?<![a-z-])(?:prop(?:eller)?\s+shaft|drive\s?shaft|driveline)\s+(?:\S+\s+){0,3}?(?:knock\S*|rattl\S*|vibrat\S*|play|loose|broken|damaged)/i;
// Backlog 354 (Blickwinkel „Autotransporter: Ladeetage, Auffahrrampe oder Hydraulik gestört“): Hinweise (Bedienung stoppen, nicht unter angehobene
// Etage/Rampe treten; nicht weiter be-/entladen, Ölaustritt → Leck-Schritte; Leitung entscheidet, nur unterwiesene Bedienschritte; welche Etage/was passiert/Fotos;
// Auswahl „Kann das Fahrzeug fahren?“) – reine Information, keine Frist. „Laderampe angefahren“, „Hydraulik geprüft“, „Etage repariert“ nicht.
const DECK_HINT = /(?<![a-zäöüß-])(?:(?:lade|ober|unter)?etage(?:n)?|lade(?:ebene|deck)(?:n|s)?|ober(?:deck|ebene)|unter(?:deck|ebene)|auffahr(?:rampe|schiene)(?:n)?|rampe(?:n)?\s+hydraulisch|hydraulische(?:n)?\s+(?:rampe|etage|anlage)(?:n)?|hydraulik(?:schlauch|schl(?:ä|ae|a)uche|zylinder|pumpe|anlage|aggregat|leitung)?|hubzylinder)(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:geht\s+(?:\S+\s+)?nicht(?:\s+mehr)?(?![a-zäöüß])|gehen\s+(?:\S+\s+)?nicht(?![a-zäöüß])|f(?:ä|ae|a)hrt\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:hoch|runter|herunter|rauf|aus|ein)|l(?:ä|ae|a)sst\s+sich\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:\S+\s+)?(?:hochfahren|herunterfahren|runterfahren|absenken|senken|heben|anheben|bewegen|ausfahren|einfahren|verriegeln|sichern)|senkt\s+sich\s+(?:\S+\s+)?(?:ab|von\s+selbst|allein)|sackt\s+(?:\S+\s+)?ab|klemmt|h(?:ä|ae|a)ngt\s+fest|blockiert|undicht|leckt|tropft|verliert\s+(?:\S+\s+)?(?:öl|oel|druck)|geplatzt|gerissen|abgerissen|verbogen|defekt|kaputt|ausgefallen|f(?:ä|ae|a)llt\s+aus|funktioniert\s+(?:\S+\s+)?nicht)(?![a-zäöüß])(?!\s+(?:\S+\s+)?(?:nicht\s+mehr|wieder|behoben|repariert|gepr(?:ü|ue|u)ft|fixed|repaired|checked))|(?<![a-z-])(?:(?:upper|lower|top|bottom|loading|car)\s+decks?|decks?|loading\s+ramps?|ramps?|hydraulics|hydraulic\s+(?:system|hose|pump|cylinder|ram|ramp|deck|line)s?)(?![a-z])\s+(?:\S+\s+){0,3}?(?:not\s+working|doesn['’]?t\s+work|isn['’]?t\s+working|won['’]?t\s+(?:lift|lower|go\s+up|go\s+down|move|lock|rise)|will\s+not\s+(?:lift|lower|move|rise)|stuck|jammed|leaking|leaks|burst|failed|broken|dropping|drops|sinking|sinks|keeps\s+(?:dropping|sinking|lowering))(?![a-z])(?!\s+(?:\S+\s+)?(?:nicht\s+mehr|wieder|behoben|repariert|gepr(?:ü|ue|u)ft|fixed|repaired|checked))|(?<![а-яіїєґ])(?:гідравлі\S*|гидравли\S*|аппарел\S*|рамп[аиуі]\S*|верхн\S*\s+(?:ярус|поверх|площадк|платформ)\S*|нижн\S*\s+(?:ярус|поверх|площадк|платформ)\S*|ярус\S*|гідрошланг\S*|гидрошланг\S*)\s+(?:\S+\s+){0,3}?(?:не\s+працю\S*|не\s+работа\S*|тече|течёт|течет|протіка\S*|протека\S*|заклини\S*|заїло|заело|не\s+підніма\S*|не\s+поднима\S*|не\s+опуска\S*|сам\S*\s+опуска\S*|опуска\S*\s+сам\S*|просіда\S*|проседа\S*|зламал\S*|сломал\S*|лопнув|лопнул\S*|порвал\S*|прорвал\S*)/i;
const FLOOR_HINT = /(?<![a-zäöüß-])(?<!(?:kein|keine|keinen|ohne)\s+)(?:(?:lade|laderaum|auflieger|anh(?:ä|ae)nger|koffer|aufbau|holz|siebdruck)boden|ladefl(?:ä|ae)che|bodenplatten?|bodenbretter|bodenbrett|(?:seiten)?bordw(?:a|ä|ae)nd(?:e)?|seitenw(?:a|ä|ae)nd(?:e)?|stirnw(?:a|ä|ae)nd(?:e)?|r(?:ü|ue)ckw(?:a|ä|ae)nd(?:e)?|(?:koffer|aufbau)w(?:a|ä|ae)nd(?:e)?|(?:auflieger|anh(?:ä|ae)nger|koffer|aufbau)dach|(?:mittel|eck|steck)?runge(?:n)?|boden\s+(?:im|vom|des|der|in\s+(?:der|dem|den))\s+(?:\S+\s+)?(?:auflieger|anh(?:ä|ae)nger|laderaum|koffer|trailer|aufbau|k(?:ü|ue)hlkoffer|k(?:ü|ue)hlauflieger)|dach\s+(?:vom|des)\s+(?:\S+\s+)?(?:auflieger|anh(?:ä|ae)nger|koffer|aufbau))(?:s|es|n)?(?![a-zäöüß])\s+(?:(?!nicht\s|kein)\S+\s+){0,3}?(?:gebrochen|durchgebrochen|eingebrochen|angebrochen|abgebrochen|gerissen|eingerissen|aufgerissen|kaputt|defekt|besch(?:ä|ae|a)digt|verbogen|eingedr(?:ü|ue)ckt|eingebeult|verbeult|zerbeult|verzogen|abgerissen|morsch|verfault|durchgefault|durchgerostet|aufgeplatzt|durchgetreten|zersplittert|gesplittert|l(?:ö|oe)chrig|gibt\s+nach|hat\s+(?:\S+\s+)?(?:loch|l(?:ö|oe)cher|riss|risse))(?![a-zäöüß])(?![,;.]?\s+(?:\S+\s+)?(?:repariert|getauscht|ersetzt|erneuert|behoben|geschwei(?:ß|ss)t|in\s+ordnung|fixed|repaired|replaced))|(?<![a-zäöüß-])(?:loch|l(?:ö|oe)cher|riss|risse|bruch)\s+(?:im|in\s+(?:der|den|dem))\s+(?:\S+\s+)?(?:(?:lade|laderaum|auflieger|anh(?:ä|ae)nger|koffer|aufbau|holz|siebdruck)boden|ladefl(?:ä|ae)che|bodenplatten?|bodenbretter|bodenbrett|(?:seiten)?bordw(?:a|ä|ae)nd(?:e)?|seitenw(?:a|ä|ae)nd(?:e)?|stirnw(?:a|ä|ae)nd(?:e)?|r(?:ü|ue)ckw(?:a|ä|ae)nd(?:e)?|(?:koffer|aufbau)w(?:a|ä|ae)nd(?:e)?|(?:auflieger|anh(?:ä|ae)nger|koffer|aufbau)dach|(?:mittel|eck|steck)?runge(?:n)?|boden\s+(?:im|vom|des|der|in\s+(?:der|dem|den))\s+(?:\S+\s+)?(?:auflieger|anh(?:ä|ae)nger|laderaum|koffer|trailer|aufbau|k(?:ü|ue)hlkoffer|k(?:ü|ue)hlauflieger)|dach\s+(?:vom|des)\s+(?:\S+\s+)?(?:auflieger|anh(?:ä|ae)nger|koffer|aufbau))(?![a-zäöüß])|(?<![a-zäöüß-])(?:besch(?:ä|ae|a)digte|kaputte|gebrochene|verbogene|eingedr(?:ü|ue)ckte|morsche|durchgebrochene)(?:n|r|s)?\s+(?:(?:lade|laderaum|auflieger|anh(?:ä|ae)nger|koffer|aufbau|holz|siebdruck)boden|ladefl(?:ä|ae)che|bodenplatten?|bodenbretter|bodenbrett|(?:seiten)?bordw(?:a|ä|ae)nd(?:e)?|seitenw(?:a|ä|ae)nd(?:e)?|stirnw(?:a|ä|ae)nd(?:e)?|r(?:ü|ue)ckw(?:a|ä|ae)nd(?:e)?|(?:koffer|aufbau)w(?:a|ä|ae)nd(?:e)?|(?:auflieger|anh(?:ä|ae)nger|koffer|aufbau)dach|(?:mittel|eck|steck)?runge(?:n)?|boden\s+(?:im|vom|des|der|in\s+(?:der|dem|den))\s+(?:\S+\s+)?(?:auflieger|anh(?:ä|ae)nger|laderaum|koffer|trailer|aufbau|k(?:ü|ue)hlkoffer|k(?:ü|ue)hlauflieger)|dach\s+(?:vom|des)\s+(?:\S+\s+)?(?:auflieger|anh(?:ä|ae)nger|koffer|aufbau))(?![a-zäöüß])(?![,;.]?\s+(?:\S+\s+)?(?:repariert|getauscht|ersetzt|erneuert|behoben|geschwei(?:ß|ss)t|in\s+ordnung|fixed|repaired|replaced))|(?<![a-z-])(?:(?:trailer|load(?:ing)?|cargo|box|body|wooden)\s+floor|floor\s?boards?|floor\s+(?:of|in)\s+the\s+(?:trailer|box|body|load\s+space|truck)|side\s?(?:boards?|walls?|panels?)|drop\s?sides?|tail\s?boards?|headboards?|bulkheads?|front\s+walls?|stanchions?|trailer\s+(?:walls?|sides?|body))(?![a-z])\s+(?:(?!not\s)\S+\s+){0,3}?(?:broken|cracked|damaged|bent|dented|holed|rotten|torn|split|smashed|punctured|caved\s+in|gave\s+way|giving\s+way|has\s+(?:a\s+)?holes?)(?![a-z])(?![,;.]?\s+(?:\S+\s+)?(?:repariert|getauscht|ersetzt|erneuert|behoben|geschwei(?:ß|ss)t|in\s+ordnung|fixed|repaired|replaced))|(?<![a-z-])(?:hole|holes|crack|cracks)\s+in\s+the\s+(?:\S+\s+)?(?:floor|side\s?wall|side\s?board|headboard|bulkhead)(?![a-z])(?!\s+mat)|(?<![a-z-])(?:broken|cracked|damaged|bent|rotten|dented)\s+(?:(?:trailer|load(?:ing)?|cargo|box|body|wooden)\s+floor|floor\s?boards?|floor\s+(?:of|in)\s+the\s+(?:trailer|box|body|load\s+space|truck)|side\s?(?:boards?|walls?|panels?)|drop\s?sides?|tail\s?boards?|headboards?|bulkheads?|front\s+walls?|stanchions?|trailer\s+(?:walls?|sides?|body))(?![a-z])|(?<![а-яіїєґё])(?:(?:підлог\S*|пол(?:ы|а|у)?)\s+(?:(?:в|у)\s+)?(?:причеп|напівпричеп|полуприцеп|прицеп|кузов|фургон|трейлер)\S*|борт(?:ик)?(?:а|и|ы|у)?(?![а-яіїєґё])|стінк\S*\s+(?:причеп|напівпричеп|кузов|фургон)\S*|стенк\S*\s+(?:прицеп|полуприцеп|кузов|фургон)\S*)\s+(?:\S+\s+){0,3}?(?:зламан|сломан|проломлен|пробит|пошкоджен|поврежден|погнут|вигнут|прогнил|гнил|тріснул|треснул|дірк|дыр|продавлен|вм['’ʼ]?ят|прогнув|прогнул|провалил|провалив)\S*/i;
// Backlog 716: Zentralschmieranlage leer/Fehler oder Sattelkupplung trocken – eigene Schritte (Fett nur laut Betriebsanleitung, keine Sorte/Menge/Intervalle)
const GREASE_HINT = /(?<![a-zäöüß-])(?:zentralschmier(?:ung|anlage|pumpe|system)|zentralschmierungsanlage|schmieranlage|schmierpumpe|schmiersystem|fettpumpe|fettbeh(?:ä|ae)lter|fettvorrat)(?![a-zäöüß])(?![^.;!?]*(?:beim\s+service|in\s+der\s+werkstatt|behoben|repariert))\s+(?:\S+\s+){0,3}?(?:leer|fast\s+leer|fehler\S*|st(?:ö|oe)rung|defekt|kaputt|ausgefallen|geht\s+nicht|funktioniert\s+nicht|f(?:ö|oe)rdert\s+nicht|pumpt\s+nicht|warnung|blinkt|leuchtet|nachf(?:ü|ue)llen|nachgef(?:ü|ue)llt|aufgef(?:ü|ue)llt)(?![a-zäöüß])|(?<![a-zäöüß-])(?:sattelplatte|sattelkupplung|k(?:ö|oe)nigszapfen)\S*\s+(?:\S+\s+){0,3}?(?:trocken|nicht\s+(?:\S+\s+)?(?:gefettet|geschmiert|abgeschmiert)|ungefettet|ohne\s+fett|muss\s+(?:\S+\s+)?(?:gefettet|abgeschmiert)\s+werden)(?![a-zäöüß])|(?<![a-z])(?:central\s+lubrication(?:\s+system)?|auto[\s-]?lube|grease\s+(?:pump|reservoir|system)|lubrication\s+(?:pump|system))\s+(?:\S+\s+){0,3}?(?:empty|low|fault|error|warning|failed|failure|not\s+working|broken)(?![a-z])|(?<![a-z])fifth[\s-]wheel(?:\s+plate)?\s+(?:\S+\s+){0,2}?(?:dry|not\s+greased|needs\s+greas\S*|without\s+grease)(?![a-z])|(?<![а-яіїєґ])(?:(?:централізован|центральн)\S*\s+(?:змащ|смаз)\S*|(?:систем|насос)\S*\s+(?:змащ|смаз)\S*)\s+(?:\S+\s+){0,3}?(?:порожн\S*|пуст\S*|помилк\S*|ошибк\S*|несправн\S*|не\s+працю\S*|не\s+работ\S*|зламал\S*|сломал\S*)|(?<![а-яіїєґ])(?:плит\S*\s+)?(?:сідл\S*|седл\S*)\s+(?:\S+\s+){0,3}?(?:сух\S*|не\s+змащ\S*|без\s+мастил\S*|не\s+смаз\S*)/i;
// Backlog 718: Kabel blank/durchgescheuert/verschmort, Kurzschluss, Sicherung fliegt raus, Anhängerkabel beschädigt – eigene Schritte (nichts anfassen/flicken/überbrücken)
const ELEC_HINT = /(?<![a-zäöüß-])(?:(?:strom|batterie|masse|plus|anh(?:ä|ae|a)nger|auflieger|spiral|verbindungs)?kabel(?:baum|b(?:ä|ae)ume|strang|str(?:ä|ae)nge|n|s)?|verkabelung|elektrik|spirale|wendel(?:kabel)?|batteriepol(?:e)?|polklemme(?:n)?|(?:anh(?:ä|ae|a)nger|auflieger)(?:stecker|steckdose)|(?:stecker|steckdose)\s+(?:(?:am|vom|zum|des|der)\s+)?(?:anh(?:ä|ae|a)nger|auflieger)\S*)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|angefressen|angebissen|abgebissen|angeknabbert))\s+(?:\S+\s+){0,3}?(?:blank|liegt\s+(?:\S+\s+)?frei|durchgescheuert|aufgescheuert|angescheuert|gescheuert|scheuert|schmort|schmoren|angeschmort|verschmort|geschmolzen|eingeklemmt|gequetscht|abgerissen|gerissen|lose|locker|h(?:ä|ae)ngt\s+(?:\S+\s+)?(?:herunter|runter|lose)|korrodiert|oxidiert|defekt|kaputt|spinnt|funkt|wackelkontakt|kurzschluss)(?![a-zäöüß])|(?<![a-zäöüß-])(?:kurzschluss|kabelbrand|schmorstelle)(?![a-zäöüß])(?![^.;!?]*(?:behoben|repariert))|(?<![a-zäöüß-])sicherung(?:en)?(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:fliegt|fliegen|knallt|brennt\s+(?:\S+\s+)?durch|brennen\s+(?:\S+\s+)?durch|springt\s+(?:\S+\s+)?(?:raus|heraus)|l(?:ö|oe)st\s+(?:\S+\s+)?aus|durchgebrannt)(?![a-zäöüß])|(?<![a-z])(?:exposed|bare|chafed|frayed|melted|loose|damaged)\s+(?:\S+\s+)?(?:wires?|wiring|cables?|harness)(?![a-z])|(?<![a-z])(?:wires?|wiring|cables?|(?:wiring\s+)?harness|trailer\s+(?:cable|lead|plug|socket|connector)s?|suzie|susie)\s+(?:\S+\s+){0,2}?(?:exposed|bare|chafed|frayed|melt\S*|burnt|torn|ripped|damaged|broken|hanging\s+(?:down|loose))(?![a-z])|(?<![a-z])fuses?\s+(?:\S+\s+){0,2}?(?:keeps?\s+blowing|blow(?:s|ing)|blown)(?![a-z])|(?<![a-z])short\s+circuit|(?<![а-яіїєґ])(?:кабел\S*|провод\S*|проводк\S*|джгут\S*|спірал\S*|розетк\S*\s+причеп\S*)\s+(?:\S+\s+){0,3}?(?:оголен\S*|оголив\S*|перетерт\S*|протерт\S*|розплавив\S*|оплавив\S*|оплавлен\S*|обірван\S*|обірвав\S*|відірван\S*|відірвав\S*|звиса\S*|пошкоджен\S*|плавиться)|(?<![а-яіїєґ])запобіжник\S*\s+(?:\S+\s+){0,2}?(?:вибива\S*|перегора\S*|згорів|згора\S*)|(?<![а-яіїєґ])(?:коротк\S*\s+замикан\S*|замикання)/i;
// Backlog 720: Batterie ausgelaufen/gast/aufgebläht, Batteriekasten-Deckel fehlt/lose, Batterietrennschalter defekt – eigene Schritte (Säure ätzend, Gase, keine Funken;
// Leitung entscheidet). Leere Batterie → Startprobleme, lose Kabel/korrodierte Pole → Elektrik. „Batterie getauscht“, „Hauptschalter repariert“ nicht.
const BATT_HINT = /(?<![a-zäöüß-])(?:(?:starter|lkw-?|fahrzeug|anh(?:ä|ae|a)nger)?batterie(?:n)?)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|gereinigt|fixed|repaired|replaced|відремонт\S*|замінен\S*|отремонт\S*|заменен\S*))\s+(?:\S+\s+){0,3}?(?:ausgelaufen|l(?:ä|ae|a)uft\s+aus|undicht|leckt|tropft|s(?:ä|ae|a)ure|gast|zischt|stinkt|riecht|aufgebl(?:ä|ae|a)ht|bl(?:ä|ae|a)ht\s+(?:\S+\s+)?auf|gew(?:ö|oe|o)lbt|ausgebeult|sehr\s+hei(?:ß|ss)|hei(?:ß|ss)|kocht|blubbert|gerissen|gebrochen|geplatzt|explodiert)(?![a-zäöüß])|(?<![a-zäöüß-])(?:batteries(?:ä|ae|a)ure|s(?:ä|ae|a)ure\s+(?:aus|an|von)\s+(?:der\s+)?batterie)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|gereinigt|fixed|repaired|replaced|відремонт\S*|замінен\S*|отремонт\S*|заменен\S*))|(?<![a-zäöüß-])(?:batterie(?:kasten|k(?:ä|ae|a)sten|fach|deckel|kastendeckel|abdeckung|halter(?:ung)?))(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|gereinigt|fixed|repaired|replaced|відремонт\S*|замінен\S*|отремонт\S*|заменен\S*))\s+(?:\S+\s+){0,3}?(?:fehlt|fehlen|weg(?![a-zäöüß])|verloren|offen|steht\s+offen|lose|locker|klappert|kaputt|defekt|gebrochen|abgebrochen|abgerissen|gerissen|geht\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?zu|schlie(?:ß|ss)t\s+nicht|h(?:ä|ae|a)lt\s+nicht)(?![a-zäöüß])|(?<![a-zäöüß-])(?:batterie(?:haupt|trenn)?schalter|batterietrenner|hauptschalter|trennschalter)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|gereinigt|fixed|repaired|replaced|відремонт\S*|замінен\S*|отремонт\S*|заменен\S*))\s+(?:\S+\s+){0,3}?(?:defekt|kaputt|klemmt|abgebrochen|geht\s+(?:\S+\s+)?nicht|funktioniert\s+(?:\S+\s+)?nicht|schaltet\s+(?:\S+\s+)?nicht|l(?:ä|ae|a)sst\s+sich\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:\S+\s+)?(?:einschalten|ausschalten|drehen|bet(?:ä|ae|a)tigen|umlegen|schalten))(?![a-zäöüß])|(?<![a-z])(?:truck\s+)?batter(?:y|ies)(?![a-z])(?![^.;!?]*(?:fixed|repaired|replaced))\s+(?:\S+\s+){0,2}?(?:leak\S*|acid|swollen|swelling|bulging|hissing|gassing|smells?|smelling|stinks?|cracked|boiling|(?:very\s+)?hot|overheat\S*)(?![a-z])(?![^.;!?]*(?:fixed|repaired|replaced))|(?<![a-z])battery\s+acid(?![a-z])|(?<![a-z])battery\s+(?:box|cover|lid|compartment)s?\s+(?:\S+\s+){0,2}?(?:missing|gone|lost|open|loose|broken|cracked|won['’]?t\s+close)(?![a-z])|(?<![a-z])(?:battery\s+)?(?:isolator|master|main|disconnect|cut-?off)\s+switch\s+(?:\S+\s+){0,2}?(?:broken|faulty|stuck|not\s+working|doesn['’]?t\s+work|won['’]?t\s+(?:turn|switch|move))(?![a-z])|(?<![а-яіїєґ])(?:акумулятор|аккумулятор|акб)\S*\s+(?:\S+\s+){0,3}?(?:тече|протіка\S*|протека\S*|кислот\S*|здув\S*|роздув\S*|вздул\S*|раздул\S*|шипить|шипит|смердить|воняє|воняет|пахне|пахнет|тріснув|тріснул\S*|треснул\S*|кипить|кипит|гаряч\S*|горяч\S*)|(?<![а-яіїєґ])кислот\S*\s+(?:з\s+|из\s+)?(?:акумулятор|аккумулятор)\S*|(?<![а-яіїєґ])(?:кришк\S*|ящик\S*|короб\S*)\s+(?:\S+\s+)?(?:акумулятор|аккумулятор|акб)\S*\s+(?:\S+\s+){0,2}?(?:немає|нема|нет|відсутн\S*|отсутств\S*|відкрит\S*|открыт\S*|зламан\S*|сломан\S*|загуб\S*|потерял\S*|не\s+закрива\S*|бовта\S*|болта\S*)|(?<![а-яіїєґ])(?:вимикач\S*|выключател\S*)\s+(?:маси|массы|акумулятор\S*|аккумулятор\S*|акб)\s+(?:\S+\s+){0,2}?(?:не\s+працю\S*|не\s+работа\S*|зламан\S*|сломан\S*|несправн\S*|неисправ\S*|заїло|заело|не\s+вмика\S*|не\s+включа\S*|не\s+вимика\S*|не\s+выключа\S*)/i;
const SPARE_HINT = /(?<![a-zäöüß-])(?:ersatzrad|reserverad|ersatzreifen|reservereifen)(?:es|s)?(?![a-zäöüß])(?![^.;!?]*(?:wieder\s+da|wieder\s+vorhanden|gefunden|repariert|ersetzt|erneuert|getauscht|gewechselt|behoben|montiert|aufgezogen|fixed|repaired|replaced|found|fitted|відремонт\S*|замінен\S*|знайшл\S*|отремонт\S*|заменен\S*|нашл\S*))\s+(?:\S+\s+){0,3}?(?:fehlt|fehlen|weg(?![a-zäöüß])|nicht\s+(?:mehr\s+)?(?:da|vorhanden|an\s+bord|dabei)(?![a-zäöüß])|platt|luftleer|ohne\s+luft|hat\s+keine\s+luft|kaputt|defekt|besch(?:ä|ae|a)digt|abgefahren|por(?:ö|oe)s|rissig|unbrauchbar|klemmt|passt\s+nicht)(?![a-zäöüß])|(?<![a-zäöüß-])(?:kein|keinen|ohne)\s+(?:ersatzrad|reserverad|ersatzreifen|reservereifen)(?:es|s)?(?![a-zäöüß])(?![^.;!?]*(?:wieder\s+da|wieder\s+vorhanden|gefunden|repariert|ersetzt|erneuert|getauscht|gewechselt|behoben|montiert|aufgezogen|fixed|repaired|replaced|found|fitted|відремонт\S*|замінен\S*|знайшл\S*|отремонт\S*|заменен\S*|нашл\S*))|(?<![a-zäöüß-])(?:ersatzrad|reserverad)(?:halter|halterung|winde|korb|tr(?:ä|ae|a)ger)(?:s|n)?(?![a-zäöüß])(?![^.;!?]*(?:wieder\s+da|wieder\s+vorhanden|gefunden|repariert|ersetzt|erneuert|getauscht|gewechselt|behoben|montiert|aufgezogen|fixed|repaired|replaced|found|fitted|відремонт\S*|замінен\S*|знайшл\S*|отремонт\S*|заменен\S*|нашл\S*))\s+(?:\S+\s+){0,3}?(?:klemmt|hakt|eingerostet|festgerostet|fest(?![a-zäöüß])|kaputt|defekt|geht\s+nicht\s+(?:auf|runter|herunter|ab)|l(?:ä|ae|a)(?:ss|ß)t\s+sich\s+nicht\s+(?:\S+\s+)?(?:(?:ö|oe)ffnen|ablassen|herunterlassen|l(?:ö|oe)sen|kurbeln))(?![a-zäöüß])|(?<![a-z-])spare\s+(?:wheel|tyre|tire)s?(?:\s+(?:carrier|winch|cradle))?(?![^.;!?]*(?:wieder\s+da|wieder\s+vorhanden|gefunden|repariert|ersetzt|erneuert|getauscht|gewechselt|behoben|montiert|aufgezogen|fixed|repaired|replaced|found|fitted|відремонт\S*|замінен\S*|знайшл\S*|отремонт\S*|заменен\S*|нашл\S*))\s+(?:\S+\s+){0,2}?(?:missing|gone|flat|damaged|unusable|stuck|jammed|seized|not\s+there|won['’]?t\s+(?:come\s+)?(?:down|off|open))(?![a-z])|(?<![a-z-])(?:no|without(?:\s+a)?)\s+spare\s+(?:wheel|tyre|tire)(?![a-z])(?![^.;!?]*(?:wieder\s+da|wieder\s+vorhanden|gefunden|repariert|ersetzt|erneuert|getauscht|gewechselt|behoben|montiert|aufgezogen|fixed|repaired|replaced|found|fitted|відремонт\S*|замінен\S*|знайшл\S*|отремонт\S*|заменен\S*|нашл\S*))|(?<![а-яіїєґ])(?:запасн\S*\s+колес\S*|запаск\S*)(?![^.;!?]*(?:wieder\s+da|wieder\s+vorhanden|gefunden|repariert|ersetzt|erneuert|getauscht|gewechselt|behoben|montiert|aufgezogen|fixed|repaired|replaced|found|fitted|відремонт\S*|замінен\S*|знайшл\S*|отремонт\S*|заменен\S*|нашл\S*))\s+(?:\S+\s+){0,2}?(?:відсутн|нема|спущ|пробит|пошкодж|зламан|заклин|отсутств|поврежд|слома|нет(?![а-яіїєґ]))\S*|(?<![а-яіїєґ])(?:немає|нема|без|нет)\s+(?:запасн\S*\s+колес\S*|запаск\S*)(?![^.;!?]*(?:wieder\s+da|wieder\s+vorhanden|gefunden|repariert|ersetzt|erneuert|getauscht|gewechselt|behoben|montiert|aufgezogen|fixed|repaired|replaced|found|fitted|відремонт\S*|замінен\S*|знайшл\S*|отремонт\S*|заменен\S*|нашл\S*))/i;
const HINT_ORDER = ['fire', 'acc', 'wild', 'hitrun', 'vandal', 'storm', 'bridge', 'fixobj', 'stow', 'roofice', 'trlr', 'exhaust', 'flat', 'tyre', 'wheel', 'brake', 'parkbrake', 'pedal', 'steer', 'vibr', 'coupling', 'grease', 'cabtilt', 'susp', 'step', 'injury', 'loose', 'underrun', 'load', 'lashgear', 'deck', 'floor', 'leak', 'pfilter', 'warnlight', 'marten', 'gelfuel', 'elec', 'batt', 'engine', 'oillevel', 'gear', 'dash', 'telem', 'adas', 'seat', 'cabkit', 'mirror', 'lights', 'contour', 'visib', 'climate', 'door', 'window', 'cableak', 'cablock', 'pest', 'nest', 'stuck', 'safetykit', 'spare', 'roadchk', 'theft', 'tow', 'reefer', 'fuel', 'fuelcap', 'nostart', 'tarp', 'custdmg', 'cargo', 'glass', 'lost', 'numplate', 'sticker', 'fuelcard', 'toll', 'tacho'];
function groupHints(opened) {
  const sum = $('#hintsum'); if (!sum) return;
  const all = HINT_ORDER.map((id) => $('#' + id)).filter(Boolean);
  const vis = all.filter((p) => !p.hidden); const many = vis.length > 1;
  // nur umstellen, wenn die Reihenfolge abweicht – ein Verschieben zwischen Maus-/Fingerdruck und Loslassen (Feld verliert den Fokus → „change“) verschluckt sonst den Klick
  let prev = sum; if (vis.some((p) => { const ok = prev.nextElementSibling === p; prev = p; return !ok; })) sum.after(...vis);
  sum.hidden = !many; sum.textContent = many ? t('hint_group') : '';
  for (const p of all) {
    const pos = vis.indexOf(p); const fold = many && pos > 0 && !opened.has(p.id);
    const ul = p.querySelector('ul'); if (ul) ul.hidden = fold;
    let b = p.querySelector('[data-hintfold]');
    if (!many || pos < 1) { if (b) b.remove(); continue; }
    if (!b) {
      b = document.createElement('button'); b.type = 'button'; b.className = 'btn secondary small'; b.dataset.hintfold = '';
      b.style.cssText = 'display:block;margin-top:6px;white-space:nowrap'; p.append(b);
      b.onclick = () => { if (opened.has(p.id)) opened.delete(p.id); else opened.add(p.id); groupHints(opened); };
    }
    b.textContent = t(fold ? 'hint_show' : 'hint_hide'); b.setAttribute('aria-expanded', String(!fold));
  }
}
// Backlog 643/647: Ursprungskontrolle eines Mangels aus der Abfahrtskontrolle (Durchführung, nachgereicht, km); Leitung: Prüfpunkt zuletzt ohne Befund
function srcInsp(si) {
  if (!si) return '';
  const late = si.received_at ? ` <span class="small muted">(${esc(t('insp_received_late').replace('{d}', fmtDT(si.received_at)))})</span>` : '';
  const km = si.odometer_km !== null && si.odometer_km !== undefined ? ` · ${esc(t('km'))} ${fmtKm(si.odometer_km)}` : '';
  let h = `<dt>${esc(t('srci_lbl'))}</dt><dd data-srcinsp>${esc(t('srci_val').replace('{d}', fmtDT(si.performed_at)))}${late}${km}</dd>`;
  if ('last_ok_at' in si) h += `<dt>${esc(t('srci_lastok'))}</dt><dd data-lastok>${si.last_ok_at ? esc(t('srci_val').replace('{d}', fmtDT(si.last_ok_at))) : `<span class="muted">${esc(t('srci_lastok_none'))}</span>`}<br><span class="small muted">${esc(t('srci_window'))}</span></dd>`;
  return h;
}
function occLate(c) {
  const a = c.occurred_at.length === 10 ? c.occurred_at : BERLIN_FMT.format(new Date(c.occurred_at)); const b = BERLIN_FMT.format(new Date(c.created_at));
  const n = Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000);
  return n >= 1 ? ` <span class="chip${n >= 3 ? ' mittel' : ''}" data-occlate>${esc(t('occ_late').replace('{d}', nDays(n)))}</span>` : '';
}
// Backlog 421 (Blickwinkel „Fahrer tauscht unterwegs den Lkw mit einem Kollegen“): Fahrer mit zugeordnetem Fahrzeug wählt beim Melden bzw. in der
// Abfahrtskontrolle ein anderes (nicht das eigene, nicht dessen fest gekoppelten Anhänger/Zugmaschine) – Hinweis „Kennzeichen prüfen“; ein Tausch ist
// erlaubt, die Leitung sieht ihn im Vorgang (reporter_assignment). Springer ohne Zuordnung: kein Hinweis. Nur Information, nichts gesperrt.
function notMineHint(vs, id) {
  if (!S.me || S.me.role !== 'driver' || !id) return '';
  const mine = vs.filter((v) => v.assigned); const v = vs.find((x) => x.id === id);
  if (!mine.length || !v || v.assigned || (v.coupled && mine.some((m) => m.id === v.coupled.id))) return '';
  return `<div class="panel warn small" data-notmine role="status">${esc(t('notmine_hint').replace('{p}', mine.map((m) => m.plate).join(', ')))}</div>`;
}
function repAssign(a, vid) {
  if (!a) return '';
  return `<dt>${esc(t('rep_assign'))}</dt><dd data-repassign><span class="chip mittel">${esc(t('rep_assign_not'))}</span><ul class="small" style="margin:4px 0 0;padding-left:18px"><li>${a.own_plates.length ? esc(t('rep_assign_own').replace('{p}', a.own_plates.join(', '))) : esc(t('rep_assign_none'))}</li>${a.vehicle_drivers.length ? `<li>${esc(t('rep_assign_drv').replace('{n}', a.vehicle_drivers.join(', ')))}</li>` : ''}</ul><p class="small muted" style="margin:2px 0 0">${esc(t('rep_assign_hint'))} <a href="#/vehicles/${esc(vid)}" class="noprint">${esc(t('vehicle_file'))} ›</a></p></dd>`;
}
function occDrivers(o) {
  if (!o) return '';
  const row = (x) => `<li>${esc(x.display_name)} · ${x.basis === 'kontrolle' ? `${esc(t('occ_drv_check'))} ${fmtDT(x.at)}` : `${esc(t('occ_drv_assign'))} ${fmtD(x.at)} – ${x.until ? fmtD(x.until) : esc(t('occ_drv_open'))}`}${x.via_plate ? ` (${esc(t('occ_drv_via'))} ${esc(x.via_plate)})` : ''}</li>`;
  return `<dt>${esc(t('occ_drivers'))}</dt><dd data-occdrivers>${o.drivers.length ? `<ul class="small" style="margin:0;padding-left:18px">${o.drivers.map(row).join('')}</ul>` : `<span class="muted">${esc(t('occ_drv_none'))}</span>`}<p class="small muted" style="margin:2px 0 0">${esc(t(o.day_only ? 'occ_drv_hint_day' : 'occ_drv_hint'))}${o.truncated ? ' ' + esc(t('occ_drv_more')) : ''}</p></dd>`;
}
 

async function viewNewMulti(...a) { return (await lazyModule('verwaltung')).viewNewMulti(...a); }
async function viewNew(preId) {
  if (!mayReport()) { render(`<h1>${esc(t('report_damage'))}</h1><p class="muted">${esc(t('no_permission_view'))}</p>`, 'new'); return; }
  const vs = await vehiclesCached();
  if (!vs.length) { render(`<h1>${esc(t('report_damage'))}</h1>${outboxBanner()}${noVehiclesNote()}`, 'new'); return; }
  const mine = vs.filter((v) => v.assigned);
  const others = vs.filter((v) => !v.assigned);
  const pick = (arr) => `<div class="vehpick">${arr.map((v) => `<label><input type="radio" name="veh" value="${esc(v.id)}" required>${plate(v.plate, { locked: v.availability === 'gesperrt' })}<span class="small muted">${v.kind === 'anhaenger' ? esc(t('vk_anhaenger')) + ' · ' : ''}${esc(v.site || '')}</span></label>`).join('')}</div>`;
  const ws = S.meta.workshops;
  render(`<h1>${esc(t('report_damage'))}</h1>${outboxBanner()}${helpLink('report')}${['owner', 'fleet'].includes(S.me.role) ? `<p class="small"><a href="#/new/multi" id="tomulti">${esc(t('multi_link'))}</a></p>` : ''}<form id="f" novalidate>
    <label for="vq">${esc(t('choose_vehicle'))}</label><input id="vq" placeholder="SZ-…" autocomplete="off" style="margin-bottom:8px">
    ${mine.length ? `<h3>${esc(t('my_vehicles'))}</h3>${pick(mine)}<details><summary>${esc(t('other_vehicles'))}</summary>${pick(others)}</details>` : pick(vs)}
    <div id="known"></div><label for="d">${esc(t('what_wrong'))}<span class="hint">${esc(t('what_wrong_hint'))}</span></label><textarea id="d" required minlength="5" maxlength="4000"></textarea>
    <p id="hintsum" class="small muted" hidden role="status" style="margin:6px 0"></p>
    <div id="acc" class="panel" hidden role="status"><b>${esc(t('acc_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('acc_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    ${tachoPanel()}
    <div id="theft" class="panel" hidden role="status"><b>${esc(t('theft_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('theft_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="tow" class="panel" hidden role="status"><b>${esc(t('tow_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('tow_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="stow" class="panel" hidden role="status"><b>${esc(t('stow_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('stow_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="cargo" class="panel" hidden role="status"><b>${esc(t('cargo_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('cargo_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="roofice" class="panel" hidden role="status"><b>${esc(t('roofice_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('roofice_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="hitrun" class="panel" hidden role="status"><b>${esc(t('hitrun_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('hitrun_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="vandal" class="panel" hidden role="status"><b>${esc(t('vandal_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('vandal_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="marten" class="panel" hidden role="status"><b>${esc(t('marten_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('marten_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="storm" class="panel" hidden role="status"><b>${esc(t('storm_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('storm_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="bridge" class="panel" hidden role="status"><b>${esc(t('bridge_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('bridge_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="fixobj" class="panel" hidden role="status"><b>${esc(t('fixobj_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('fixobj_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    ${glassPanel()}
    <div id="wild" class="panel" hidden role="status"><b>${esc(t('wild_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('wild_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="fuel" class="panel" hidden role="status"><b>${esc(t('fuel_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('fuel_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul><p id="fueldrv" class="small" hidden style="margin:6px 0 0"></p></div>
    <div id="flat" class="panel" hidden role="status"><b>${esc(t('flat_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('flat_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="roadchk" class="panel" hidden role="status"><b>${esc(t('roadchk_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('roadchk_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="nostart" class="panel" hidden role="status"><b>${esc(t('nostart_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('nostart_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="pfilter" class="panel" hidden role="status"><b>${esc(t('pfilter_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('pfilter_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="warnlight" class="panel" hidden role="status"><b>${esc(t('warnlight_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('warnlight_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="leak" class="panel" hidden role="status"><b>${esc(t('leak_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('leak_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="custdmg" class="panel" hidden role="status"><b>${esc(t('custdmg_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('custdmg_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="fire" class="panel" hidden role="status"><b>${esc(t('fire_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('fire_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="reefer" class="panel" hidden role="status"><b>${esc(t('reefer_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('reefer_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="brake" class="panel" hidden role="status"><b>${esc(t('brake_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('brake_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="parkbrake" class="panel" hidden role="status"><b>${esc(t('parkbrake_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('parkbrake_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="pedal" class="panel" hidden role="status"><b>${esc(t('pedal_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('pedal_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="injury" class="panel" hidden role="status"><b>${esc(t('injury_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('injury_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="trlr" class="panel" hidden role="status"></div>
    <div id="tarp" class="panel" hidden role="status"><b>${esc(t('tarp_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('tarp_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="load" class="panel" hidden role="status"><b>${esc(t('load_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('load_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="mirror" class="panel" hidden role="status"><b>${esc(t('mirror_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('mirror_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="coupling" class="panel" hidden role="status"><b>${esc(t('coupling_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('coupling_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="grease" class="panel" hidden role="status"><b>${esc(t('grease_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('grease_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="lights" class="panel" hidden role="status"><b>${esc(t('lights_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('lights_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="contour" class="panel" hidden role="status"><b>${esc(t('contour_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('contour_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="door" class="panel" hidden role="status"><b>${esc(t('door_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('door_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="stuck" class="panel" hidden role="status"><b>${esc(t('stuck_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('stuck_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="visib" class="panel" hidden role="status"><b>${esc(t('visib_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('visib_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="step" class="panel" hidden role="status"><b>${esc(t('step_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('step_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="loose" class="panel" hidden role="status"><b>${esc(t('loose_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('loose_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="adas" class="panel" hidden role="status"><b>${esc(t('adas_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('adas_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="steer" class="panel" hidden role="status"><b>${esc(t('steer_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('steer_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="engine" class="panel" hidden role="status"><b>${esc(t('engine_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('engine_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="oillevel" class="panel" hidden role="status"><b>${esc(t('oillevel_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('oillevel_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="susp" class="panel" hidden role="status"><b>${esc(t('susp_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('susp_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="gear" class="panel" hidden role="status"><b>${esc(t('gear_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('gear_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="seat" class="panel" hidden role="status"><b>${esc(t('seat_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('seat_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="cabkit" class="panel" hidden role="status"><b>${esc(t('cabkit_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('cabkit_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="dash" class="panel" hidden role="status"><b>${esc(t('dash_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('dash_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="telem" class="panel" hidden role="status"><b>${esc(t('telem_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('telem_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="exhaust" class="panel" hidden role="status"><b>${esc(t('exhaust_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('exhaust_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="cabtilt" class="panel" hidden role="status"><b>${esc(t('cabtilt_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('cabtilt_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="gelfuel" class="panel" hidden role="status"><b>${esc(t('gelfuel_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('gelfuel_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="elec" class="panel" hidden role="status"><b>${esc(t('elec_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('elec_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="batt" class="panel" hidden role="status"><b>${esc(t('batt_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('batt_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="safetykit" class="panel" hidden role="status"><b>${esc(t('safetykit_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('safetykit_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="spare" class="panel" hidden role="status"><b>${esc(t('spare_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('spare_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="wheel" class="panel" hidden role="status"><b>${esc(t('wheel_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('wheel_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="toll" class="panel" hidden role="status"><b>${esc(t('toll_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('toll_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="climate" class="panel" hidden role="status"><b>${esc(t('climate_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('climate_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="window" class="panel" hidden role="status"><b>${esc(t('window_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('window_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="cableak" class="panel" hidden role="status"><b>${esc(t('cableak_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('cableak_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="pest" class="panel" hidden role="status"><b>${esc(t('pest_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('pest_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="nest" class="panel" hidden role="status"><b>${esc(t('nest_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('nest_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="fuelcap" class="panel" hidden role="status"><b>${esc(t('fuelcap_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('fuelcap_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="fuelcard" class="panel" hidden role="status"><b>${esc(t('fuelcard_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('fuelcard_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="underrun" class="panel" hidden role="status"><b>${esc(t('underrun_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('underrun_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="tyre" class="panel" hidden role="status"><b>${esc(t('tyre_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('tyre_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="cablock" class="panel" hidden role="status"><b>${esc(t('cablock_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('cablock_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="vibr" class="panel" hidden role="status"><b>${esc(t('vibr_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('vibr_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="lashgear" class="panel" hidden role="status"><b>${esc(t('lashgear_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('lashgear_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="floor" class="panel" hidden role="status"><b>${esc(t('floor_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('floor_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="deck" class="panel" hidden role="status"><b>${esc(t('deck_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('deck_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="lost" class="panel" hidden role="status"><b>${esc(t('lost_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('lost_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="numplate" class="panel" hidden role="status"><b>${esc(t('numplate_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('numplate_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="sticker" class="panel" hidden role="status"><b>${esc(t('sticker_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('sticker_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <label id="lbl_prio">${esc(t('urgency'))}</label><div class="choices" role="radiogroup" aria-labelledby="lbl_prio">${['niedrig', 'mittel', 'kritisch'].map((p, i) => `<label class="choice c-${p}"><input type="radio" name="prio" value="${p}"${i === 0 ? ' checked' : ''}><span><b>${esc(t('prio_' + p))}</b><span class="small muted">${esc(t('prio_' + p + '_d'))}</span></span></label>`).join('')}</div>
    <label id="lbl_drv">${esc(t('driveable'))}</label><div class="choices" role="radiogroup" aria-labelledby="lbl_drv">${['fahrbereit', 'eingeschraenkt', 'nicht_fahrbereit', 'unbekannt'].map((p) => `<label class="choice${p === 'nicht_fahrbereit' ? ' c-kritisch' : ''}"><input type="radio" name="drv" value="${p}"${p === 'unbekannt' ? ' checked' : ''}><b>${esc(t('drv_' + p))}</b></label>`).join('')}</div>
    <label for="w">${esc(t('workshop'))}</label><select id="w"><option value="">–</option>${ws.map((w) => `<option value="${esc(w.code)}">${esc(wsLabel(w))}</option>`).join('')}</select>
    <label for="l">${esc(t('location'))}</label><input id="l" maxlength="300">
    ${occurredFields(null)}
    <label for="ph">${esc(t('photos_now'))}<span class="hint">${esc(t('photos_now_hint'))}</span></label><input type="file" id="ph" accept="image/jpeg,image/png,image/webp" multiple>
    <div class="actions"><button class="btn block" id="sb">${esc(t('send_report'))}</button></div></form>`, 'new');
  // Genau ein zugeordnetes Fahrzeug: vorauswählen (Fahrer kann jederzeit ein anderes wählen)
  if (mine.length === 1) { const r = $(`input[name=veh][value="${CSS.escape(mine[0].id)}"]`); if (r) r.checked = true; }
  // Aufruf über Fahrzeug-QR-Aufkleber: dieses Fahrzeug vorauswählen
  if (preId) { const r = $(`input[name=veh][value="${CSS.escape(preId)}"]`); if (r) { r.checked = true; const det = r.closest('details'); if (det) det.open = true; r.closest('label').scrollIntoView({ block: 'center' }); } else toast(t('qr_vehicle_unknown'), true); }
  // Bekannte Mängel des gewählten (eigenen) Fahrzeugs anzeigen, damit nichts doppelt gemeldet wird
  if (S.me.role === 'driver' && mine.length) {
    let known = null;
    const showKnown = () => { const sel = $('input[name=veh]:checked'); const box = $('#known'); if (!box) return; const v = known && sel && known.find((x) => x.id === sel.value);
      // gekoppelter Auflieger/Zugmaschine gewählt (Backlog 437): dessen bekannte Mängel und Sperre wie in der Abfahrtskontrolle – sonst meldete
      // Fahrer B bei der Übernahme denselben Schaden wie Fahrer A beim Abstellen
      const cv = !v && known && sel ? coupledKnown(known, sel.value) : null;
      box.innerHTML = notMineHint(vs, sel && sel.value) + (v ? coupledAlert(v.coupled) + drvNotes(v.notes) + knownDefects(v.known_defects) + relItems(v.open_items_after_release) + coupledDefects(v.coupled) : cv ? `${cv.locked ? `<div class="alert" role="alert" style="margin-bottom:8px" data-cplocked><b>${esc(t('scan_locked'))}</b></div>` : ''}${drvNotes(cv.notes)}${knownDefects(cv.known_defects)}${relItems(cv.open_items_after_release)}` : ''); };
    showKnown();
    api('GET', '/api/me/vehicles').then((r) => { known = r.vehicles; showKnown(); }).catch(() => { known = myVehCached(); showKnown(); });
    $$('input[name=veh]').forEach((r) => r.addEventListener('change', showKnown));
  }
  // Backlog 270 (Teilagent „Fahrer ruft die Disposition an“): Disposition/Leitung/Werkstatt sehen beim Melden die offenen Vorgänge des gewählten
  // Fahrzeugs – nachts entstand sonst leicht eine Doppelmeldung (Hinweis vorher nur für Fahrer); nur Vorgänge, die die Rolle ohnehin sieht
  if (S.me.role !== 'driver') {
    let seq = 0;
    const showOpen = async () => {
      const sel = $('input[name=veh]:checked'); const box = $('#known'); if (!box) return; const my = ++seq;
      if (!sel) { box.innerHTML = ''; return; }
      try {
        const r = await api('GET', `/api/cases?status=open&limit=50&vehicle_id=${encodeURIComponent(sel.value)}`);
        if (my !== seq) return;
        box.innerHTML = knownDefects((r.cases || []).map((c) => ({ id: c.id, description: c.description || '', priority: c.priority, status: c.status, created_at: c.created_at, check_item: c.check_item, planned_date: c.planned_date, parts_expected_date: c.parts_expected_date })));
      } catch { if (my === seq) box.innerHTML = ''; }
    };
    $$('input[name=veh]').forEach((r) => r.addEventListener('change', showOpen));
    if ($('input[name=veh]:checked')) showOpen();
  }
  // Beschreibung nennt Diebstahl/Einbruch: Polizei, Spuren, Liste des Fehlenden, Fuhrparkleitung (Backlog 214, 23.10.2026) – reine Information,
  // keine Frist; „Leistungseinbruch“ und ukr. „вкрай“/„зламано“ (kaputt) lösen nichts aus
  // Backlog 634 (Blickwinkel „Diebstahl auf dem Rastplatz“): Lkw mit gekoppeltem Auflieger gewählt, Beschreibung nennt Auflieger/Plane →
  // Hinweis, den Auflieger zusätzlich zu melden (Kosten/Versicherungsfall gehören an dessen Vorgang); nur Hinweis, kein Link (Entwurf bliebe sonst hängen)
  const trailerHint = () => {
    const box = $('#trlr'); if (!box) return false;
    const r = $('input[name=veh]:checked'); const v = r && vs.find((x) => x.id === r.value);
    const show = !!(v && v.kind !== 'anhaenger' && v.trailer_plate && TRAILER_DMG.test($('#d').value) && !FOREIGN_TRAILER.test($('#d').value));
    if (show) { const html = `<b>${esc(t('trlr_title').replace('{p}', v.trailer_plate))}</b><p class="small" style="margin:6px 0 0">${esc(t('trlr_text').replaceAll('{p}', v.trailer_plate))}</p>`; if (box.innerHTML !== html) box.innerHTML = html; }
    return show;
  };
  const hints = () => { const dsk = noSticker($('#d').value); const dck = noCabkit($('#d').value); $('#trlr').hidden = !trailerHint(); const wild = WILD_HINT.test($('#d').value); $('#wild').hidden = !wild; const hitrun = !wild && HITRUN_HINT.test($('#d').value); $('#hitrun').hidden = !hitrun; const bridge = !wild && !hitrun && BRIDGE_HINT.test($('#d').value); $('#bridge').hidden = !bridge; const injhit = INJURY_HINT.test($('#d').value); const accReal = ACC_HINT.test(injhit ? $('#d').value.replace(INJURY_WORDS, ' ') : $('#d').value); $('#acc').hidden = wild || hitrun || bridge || !accReal; $('#tacho').hidden = !TACHO_HINT.test($('#d').value); const theft = THEFT_HINT.test($('#d').value); $('#theft').hidden = !theft; $('#vandal').hidden = theft || hitrun || !VANDAL_HINT.test($('#d').value); $('#tow').hidden = !TOW_HINT.test($('#d').value); $('#stow').hidden = !STOW_HINT.test($('#d').value); $('#roofice').hidden = !ROOFICE_HINT.test($('#d').value); $('#glass').hidden = !GLASS_HINT.test(dsk); $('#lost').hidden = !LOST_HINT.test($('#d').value); $('#numplate').hidden = !NUMPLATE_HINT.test(dsk); $('#sticker').hidden = !STICKER_HINT.test($('#d').value); $('#fuel').hidden = !FUEL_HINT.test($('#d').value); fuelDrv(); $('#flat').hidden = !FLAT_HINT.test($('#d').value); $('#roadchk').hidden = !ROADCHK_HINT.test($('#d').value); $('#nostart').hidden = !NOSTART_HINT.test($('#d').value); $('#pfilter').hidden = !PFILTER_HINT.test($('#d').value); $('#warnlight').hidden = !WARNLIGHT_HINT.test($('#d').value); $('#leak').hidden = !LEAK_HINT.test($('#d').value); $('#marten').hidden = !MARTEN_HINT.test($('#d').value); $('#storm').hidden = !STORM_HINT.test($('#d').value); $('#custdmg').hidden = !CUSTDMG_HINT.test($('#d').value); { const fixobj = !wild && !hitrun && !bridge && $('#custdmg').hidden && FIXOBJ_HINT.test($('#d').value); $('#fixobj').hidden = !fixobj; $('#acc').hidden ||= fixobj; } $('#cargo').hidden = !CARGO_HINT.test($('#d').value); $('#fire').hidden = !FIRE_HINT.test($('#d').value); $('#reefer').hidden = !REEFER_HINT.test(dck); $('#brake').hidden = !BRAKE_HINT.test(noParkbrake($('#d').value)); $('#parkbrake').hidden = !PARKBRAKE_HINT.test($('#d').value); $('#pedal').hidden = !PEDAL_HINT.test($('#d').value); { const nest = NEST_HINT.test($('#d').value); $('#nest').hidden = !nest; $('#pest').hidden = !PEST_HINT.test(nest ? $('#d').value.replace(NEST_WORDS, ' ') : $('#d').value); } $('#tarp').hidden = !TARP_HINT.test(dck); $('#load').hidden = !LOAD_HINT.test($('#d').value); $('#lashgear').hidden = !LASHGEAR_HINT.test($('#d').value); $('#contour').hidden = !CONTOUR_HINT.test($('#d').value); $('#mirror').hidden = !MIRROR_HINT.test($('#d').value); $('#coupling').hidden = !COUPLING_HINT.test($('#d').value); $('#lights').hidden = !LIGHTS_HINT.test(dck); $('#door').hidden = !DOOR_HINT.test($('#d').value); $('#stuck').hidden = !STUCK_HINT.test($('#d').value); $('#visib').hidden = !VISIB_HINT.test($('#d').value); $('#step').hidden = !STEP_HINT.test($('#d').value); $('#injury').hidden = !injhit || wild || hitrun || bridge || accReal || !$('#step').hidden || !$('#stow').hidden; { let dl = dsk; if (!$('#numplate').hidden) dl = dl.replace(NUMPLATE_WORDS, ' '); if (!$('#step').hidden) dl = dl.replace(STEP_WORDS, ' '); $('#loose').hidden = !LOOSE_HINT.test(dl); } $('#adas').hidden = !ADAS_HINT.test($('#d').value); $('#steer').hidden = !STEER_HINT.test($('#d').value); $('#engine').hidden = !ENGINE_HINT.test($('#d').value); $('#oillevel').hidden = !OILLEVEL_HINT.test($('#d').value); $('#grease').hidden = !GREASE_HINT.test($('#d').value); $('#elec').hidden = !ELEC_HINT.test($('#d').value); $('#batt').hidden = !BATT_HINT.test($('#d').value); $('#susp').hidden = !SUSP_HINT.test($('#d').value); $('#gear').hidden = !GEAR_HINT.test($('#d').value); $('#seat').hidden = !SEAT_HINT.test($('#d').value); $('#cabkit').hidden = !CABKIT_HINT.test($('#d').value); $('#dash').hidden = !DASH_HINT.test($('#d').value); $('#telem').hidden = !TELEM_HINT.test($('#d').value); $('#exhaust').hidden = !EXHAUST_HINT.test($('#d').value); $('#cabtilt').hidden = !CABTILT_HINT.test($('#d').value); $('#gelfuel').hidden = !GELFUEL_HINT.test($('#d').value); $('#safetykit').hidden = !SAFETYKIT_HINT.test($('#d').value); $('#spare').hidden = !SPARE_HINT.test($('#d').value); $('#wheel').hidden = !WHEEL_HINT.test($('#d').value); $('#toll').hidden = !TOLL_HINT.test($('#d').value); $('#climate').hidden = !CLIMATE_HINT.test($('#d').value); $('#window').hidden = !WINDOW_HINT.test($('#d').value); $('#cableak').hidden = !CABLEAK_HINT.test($('#d').value); $('#fuelcap').hidden = !FUELCAP_HINT.test($('#d').value); $('#fuelcard').hidden = !FUELCARD_HINT.test($('#d').value); $('#underrun').hidden = !UNDERRUN_HINT.test($('#d').value); $('#tyre').hidden = !TYRE_HINT.test($('#d').value); $('#cablock').hidden = !CABLOCK_HINT.test($('#d').value); $('#vibr').hidden = !VIBR_HINT.test($('#d').value); $('#deck').hidden = !DECK_HINT.test($('#d').value); $('#floor').hidden = !FLOOR_HINT.test($('#d').value); groupHints(hintOpen); };
  // Backlog 651: Fehlbetankung erkannt, aber „Weiß nicht“/„fahrbereit“ gewählt – Warnzeile (nicht blockierend; die Sperre setzt nur „nicht fahrbereit“)
  const fuelDrv = () => { const w = $('#fueldrv'); if (!w) return; const d = $('input[name=drv]:checked'); const bad = !$('#fuel').hidden && !!d && ['unbekannt', 'fahrbereit'].includes(d.value);
    w.hidden = !bad; w.textContent = bad ? '⚠️ ' + t('fuel_drv_warn').replace('{a}', t('drv_' + d.value)).replace('{b}', t('drv_nicht_fahrbereit')) : ''; };
  const hintOpen = new Set();
  // Spracheingabe (Diktat) meldet sich je nach Gerät nur mit „change“ statt „input“ (Backlog 228) – beide prüfen
  $('#d').addEventListener('input', hints); $('#d').addEventListener('change', hints);
  $$('input[name=drv]').forEach((x) => x.addEventListener('change', fuelDrv));
  $$('input[name=veh]').forEach((x) => x.addEventListener('change', hints)); // Backlog 634: Hinweis hängt auch vom gewählten Fahrzeug ab
  photoLimitWatch($('#ph'));
  const draft = bindFormDraft('new', $('#f'), 'veh', preId, ['vq']);
  const key = uid();
  // Suchfeld: Enter („Los“ am Handy) filtert nur – sendet nicht ab; ein ausgeblendetes gewähltes Fahrzeug wird abgewählt (19.10.2026:
  // Meldung ging sonst an das vorausgewählte, durch den Filter verdeckte Fahrzeug)
  $('#vq').onkeydown = (e) => { if (e.key === 'Enter') e.preventDefault(); };
  $('#vq').oninput = () => { const q = searchKey($('#vq').value); $$('.vehpick label').forEach((l) => { l.hidden = !!q && !searchKey(l.textContent).includes(q); const r = $('input', l); if (l.hidden && r && r.checked) r.checked = false; }); if (q) $$('details').forEach((d) => (d.open = true)); };
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    // Knopf/Fotos beim Absenden festhalten: wechselt der Fahrer während des Hochladens die Seite, laufen die Fotos weiter, ohne dass die
    // neue Seite überschrieben oder verlassen wird (21.10.2026: Abfahrtskontrolle war nach dem Sprung zum Vorgang leer)
    const sb = $('#sb');
    const veh = $('input[name=veh]:checked');
    // Prüfung in der App-Sprache (Browser-Meldungen wären in der Gerätesprache)
    if (!veh) { toast(t('choose_vehicle'), true); const vp = $('.vehpick'); if (vp) { vp.setAttribute('role', 'radiogroup'); markInvalid(vp, t('choose_vehicle')); } $('#vq').focus(); return; }
    if ($('#d').value.trim().length < 5) { toast(t('desc_too_short'), true); markInvalid($('#d'), t('desc_too_short')); $('#d').focus(); return; }
    const occ = occurredValue($('#occd').value, $('#occt').value);
    if (occ === undefined) { toast(t('occ_need_date'), true); markInvalid($('#occd'), t('occ_need_date')); $('#occd').focus(); return; }
    if (occ && occ.slice(0, 10) > bDate()) { toast(t('occ_future'), true); markInvalid($('#occd'), t('occ_future')); $('#occd').focus(); return; }
    sb.disabled = true;
    const who = outboxWho();
    const photoFiles = [...($('#ph').files || [])].slice(0, PHOTO_MAX);
    const body = { vehicle_id: veh.value, description: $('#d').value, priority: $('input[name=prio]:checked').value,
      driveability: $('input[name=drv]:checked').value, workshop_site: $('#w').value || null, location_note: $('#l').value || null, request_key: key, ...(occ ? { occurred_at: occ } : {}) };
    try {
      const r = await api('POST', '/api/cases', body);
      draft.clear();
      const files = photoFiles;
      // Backlog 283 (Teilagent „Sonntag 03:00“): kritisch/nicht fahrbereit – auch mit Netz die Bitte zum Anruf samt „Panne & Notfall“ zeigen
      // (vorher nur beim Offline-Speichern; nachts liest niemand die Meldung sofort)
      // Backlog 540 (Blickwinkel „Reifenplatzer nachts, schwaches Netz“): das Panel sofort nach dem Anlegen zeigen, nicht erst nach allen Fotos
      // (bis zu 2 Min. je Foto) – der Foto-Stand läuft in einer eigenen Zeile darin weiter
      const crit = body.priority === 'kritisch' || body.driveability === 'nicht_fahrbereit';
      let ph = sb;
      if (crit && sb.isConnected) {
        render(`<h1>${esc(t('report_damage'))}</h1><div class="panel alert" role="alert" data-sentcritical><p><b>${esc(t('report_sent'))}: ${esc(r.case_no)}</b></p>${files.length ? `<p class="small" id="phstate" data-phstate role="status">${esc(t('uploading'))} 1/${files.length}</p>` : ''}${r.urgent_push_recipients === 0 ? `<p data-nopush><b>⚠ ${esc(t('no_push_reach'))}</b></p>` : ''}${callBox(body.vehicle_id)}<p><a class="btn" href="#/cases/${esc(r.id)}">${esc(t('open_report'))} ›</a></p></div>`, 'new');
        ph = $('#phstate') || null;
      }
      const { failed, later } = files.length ? await uploadPhotosSafe('/api/cases', body, r, r.id, files, ph, who) : { failed: 0, later: 0 };
      toast(`${t('report_sent')}: ${r.case_no}${failed ? ' · ' + tn('photos_failed', failed) : ''}${later ? ' · ' + tn('photos_stored', later) : ''}`, !!failed);
      if (crit) {
        if (ph && ph.isConnected && ph !== sb) ph.textContent = failed || later ? [failed ? tn('photos_failed', failed) : '', later ? tn('photos_stored', later) : ''].filter(Boolean).join(' · ') : t('photos_done');
        if (!sb.isConnected) return;
      }
      if (sb.isConnected) location.hash = '#/cases/' + r.id;
    } catch (err) {
      // Netzabbruch, Anmeldung inzwischen beendet (401) oder andere Person angemeldet (user_mismatch): Meldung für die Person sichern,
      // die sie erfasst hat – sie wird nach deren Anmeldung gesendet (21.10.2026: Formular und Eingaben gingen bei 401/user_mismatch verloren)
      if (err.offline || err.status === 401 || err.code === 'user_mismatch' || err.code === 'env_mismatch') {
        const files = photoFiles;
        let stored = 0;
        if (files.length) { try { const list = []; for (const f of files) list.push({ blob: await prepareUpload(f), name: f.name }); await photosPut(key, list); stored = list.length; } catch {} }
        outboxAdd('/api/cases', body, stored, who);
        draft.clear();
        if (!err.offline || !sb.isConnected) { toast(t(err.offline ? 'outbox_saved' : 'outbox_saved_login')); return; }
        render(`<h1>${esc(t('report_damage'))}</h1><div class="panel alert" role="alert"><p><b>${esc(t('outbox_saved'))}</b></p>${files.length && !stored ? `<p>${esc(t('photos_offline'))}</p>` : stored ? `<p>${esc(tn('photos_stored', stored))}</p>` : ''}${body.priority === 'kritisch' || body.driveability === 'nicht_fahrbereit' ? callBox(body.vehicle_id) : ''}</div><div id="outbox_slot"></div><div class="actions"><a class="btn secondary" href="#/">${esc(t('back'))}</a></div>`, 'new');
        return;
      }
      toast(err.message, true); sb.disabled = false;
    }
  };
}

// Geplanter Werkstatttermin/Prüftermin am eigenen Fahrzeug (nur gespeicherte Termine, ab heute)
function myPlanned(v) {
  let h = '';
  if (v.planned_workshop_date) h += `<dt>${esc(t('planned_ws_short'))}</dt><dd><b>${fmtD(v.planned_workshop_date)}</b>${v.planned_workshop_date === bDate() ? ' (' + esc(t('today')) + ')' : ''} ${(v.planned_workshop_sites || []).length ? ` · <span data-plannedws>${v.planned_workshop_sites.map((w) => esc(wsName(w))).join(', ')}</span>` : ''} <span class="small muted">${esc(t('my_ws_hint'))}</span>${v.planned_workshop_note ? `<br><span data-plannote>${esc(t('plan_note_lbl'))}: ${esc(v.planned_workshop_note)}</span>` : ''}</dd>`;
  const pi = v.planned_inspection;
  if (pi && ![...(v.next_inspections || []), ...(v.km_due || [])].some((r) => r.kind === pi.kind && r.planned_date)) h += `<dt>${esc(mk(pi.kind))}</dt><dd>${esc(t('planned'))} ${fmtD(pi.planned_date)}${pi.planned_date === bDate() ? ' (' + esc(t('today')) + ')' : ''}</dd>`;
  return h;
}

// „Mein Fahrzeug“ aus dem Zwischenspeicher der Startseite (ohne Netz: Sperre/Anhänger-Sperre/bekannte Mängel weiter sichtbar, 20.10.2026)
function myVehCached() { try { const c = JSON.parse(localStorage.getItem(`cfp_myveh_${S.me.id}_${S.me.environment}`) || 'null'); return c && Array.isArray(c.vehicles) ? c.vehicles : null; } catch { return null; } }

// Bekannte (offene) Mängel am eigenen Fahrzeug – Fahrer sieht, was schon gemeldet ist (ohne Namen); eigene Meldungen verlinkt
// Prüftermine auf der Fahrer-Startseite: mit Datum (überfällig rot) und HU/SP mit ungeklärter Frist ohne Datum (Backlog 202, Teilagent
// „Straßenkontrolle“: ungeklärte Fristen fehlten still – Regel „fehlend = ungeklärt“)
function drvInspRows(v) {
  // Backlog 380: HU/SP ausgeschrieben (Fahrer am ersten Tag verstand die Kürzel nicht) und bei „ungeklärt“, wer es klärt
  const dk = (k) => (k === 'HU' ? t('hu_long') : k === 'SP' ? t('sp_long') : mk(k));
  return (v.next_inspections || []).map((r) => `<dt>${esc(dk(r.kind))}</dt><dd>${fmtD(r.next_due_date)}${r.next_due_date < bDate() ? ` <span class="chip kritisch">${esc(t('drv_overdue'))}</span>` : ''}${r.planned_date ? ` <span class="small">· ${esc(t('planned'))} ${fmtD(r.planned_date)}${r.planned_date === bDate() ? ' (' + esc(t('today')) + ')' : ''}</span>` : ''}</dd>`).join('')
    + (v.inspections_unclear || []).map((k) => `<dt>${esc(dk(k))}</dt><dd><span class="chip mittel" data-unclear>${esc(t('ms_ungeklaert'))}</span> <span class="small muted" data-unclearwho>${esc(t('drv_unclear_fleet'))}</span></dd>`).join('');
}
// Gekoppelter Anhänger bzw. Zugmaschine: HU/SP-/Prüftermine und bekannte Mängel (Backlog 202) – Sperre steht schon oben im Kopf der Karte
// Backlog 481 (Blickwinkel „Springer holt den Lkw eines kranken Kollegen“): Hinweise für Fahrer auch in Abfahrtskontrolle und Meldeformular –
// wer über den QR-Aufkleber kommt, sieht die Startseite „Mein Fahrzeug“ nie (abgelaufene Hinweise nicht, auch offline aus dem Zwischenspeicher)
function drvNotes(notes) {
  const list = (notes || []).filter((n) => !n.valid_until || n.valid_until >= bDate());
  return list.length ? `<div class="vnotes-drv" role="note">${list.map((n) => `<p><b>ⓘ ${n.plate ? esc(n.plate) + ': ' : ''}${esc(n.text)}</b> <span class="small muted">${fmtD(n.created_at)}${n.valid_until ? ' · ' + esc(t('vnote_until').replace('{d}', fmtD(n.valid_until))) : ''}</span></p>`).join('')}</div>` : '';
}
// Backlog 482 (gleicher Blickwinkel): bekannte Mängel/Restarbeiten des gekoppelten Anhängers bzw. der Zugmaschine in Abfahrtskontrolle und Meldeformular,
// wenn das eigene Fahrzeug gewählt ist – sonst wird ein bekannter Anhängermangel (Prüfpunkt „Kupplung/Anhänger“) erneut gemeldet. Ohne Prüftermine (die stehen auf der Startseite).
function coupledDefects(c) {
  if (!c || (!(c.known_defects || []).length && !(c.open_items_after_release || []).length)) return '';
  return `<div class="drv-coupled" data-coupled><p style="margin:10px 0 0"><b>${esc(t(c.kind === 'anhaenger' ? 'trailer' : 'truck'))} ${esc(c.plate)}</b></p>${knownDefects(c.known_defects)}${relItems(c.open_items_after_release)}</div>`;
}
function drvCoupled(c) {
  if (!c || (!(c.next_inspections || []).length && !(c.inspections_unclear || []).length && !(c.known_defects || []).length && !(c.open_items_after_release || []).length)) return '';
  const rows = drvInspRows(c);
  return `<div class="drv-coupled" data-coupled><p style="margin:10px 0 0"><b>${esc(t(c.kind === 'anhaenger' ? 'trailer' : 'truck'))} ${esc(c.plate)}</b></p>${rows ? `<dl class="kv" style="margin-top:4px">${rows}</dl>` : ''}${knownDefects(c.known_defects)}${relItems(c.open_items_after_release)}</div>`;
}
// Backlog 464: offene Restarbeiten nach der technischen Freigabe (nicht sicherheitsrelevant) – Fahrer weiß, was noch nachgearbeitet wird
function relItems(list) {
  if (!list || !list.length) return '';
  return `<div class="small" role="note" data-relitems><b>${esc(t('rel_items_title'))} (${list.length})</b><ul style="margin:4px 0">${list.map((o) => `<li${langAttr(o.description)}>${esc(o.description)} <span class="muted">· ${esc(o.case_no)}${o.closed_at ? ' · ' + esc(t('st_fahrzeug_freigegeben')) + ' ' + fmtD(o.closed_at) : ''}</span></li>`).join('')}</ul><span class="muted">${esc(t('rel_items_hint'))}</span></div>`;
}
function knownDefects(list) {
  if (!list || !list.length) return '';
  return `<details class="known"${list.length <= 3 ? ' open' : ''}><summary>${esc(t('known_defects'))} (${list.length})</summary><ul class="small">${list.map((k) => {
    // Prüfpunkt in der Oberflächensprache, Mangeltext mit eigener Sprache (lang=, Backlog 229)
    const txt = `${k.check_item ? esc(checkLabel(k.check_item)) + ': ' : ''}${ltxt(k.description.replace(/^\[Kontrolle [^\]]*\]\s*[a-z_]+:\s*/, ''))}`;
    return `<li><span class="chip ${esc(k.priority)}">${esc(t('prio_' + k.priority))}</span> ${k.id ? `<a href="#/cases/${esc(k.id)}">${txt}</a>` : txt} <span class="muted">· ${esc(t('st_' + k.status))} · ${fmtD(k.created_at)}${k.planned_date ? ' · ' + esc(t('planned_ws_short')) + ' ' + fmtD(k.planned_date) : ''}${k.parts_expected_date ? ' · ' + esc(t('parts_eta')) + ' ' + fmtD(k.parts_expected_date) : ''}${k.workshop_site ? ` · <span data-kdws>${esc(wsName(k.workshop_site))}</span>` : ''}</span>${k.driveability && !k.safety_lock ? ` <span class="chip mittel" style="white-space:nowrap" data-kddrv>${esc(t(k.driveability === 'eingeschraenkt' ? 'dispo_upcoming_limited' : 'kd_drv_not'))}</span>` : ''}${k.vehicle_location || k.tow_service ? `<br><span data-kdloc>📍 ${esc(t('vl_title'))}: ${k.vehicle_location ? esc(k.vehicle_location) : `<span class="muted">${esc(t('vl_unknown'))}</span>`}${k.tow_service ? ` · <span class="chip mittel">${esc(t('vl_towed_chip'))}</span> ${esc(k.tow_service)}${k.towed_on ? ' · ' + fmtD(k.towed_on) : ''}` : ''}${vlAt(k)}</span>` : ''}</li>`; }).join('')}</ul></details>`;
}

// ---------- Vorgang ----------
// Backlog 629: Vorgang bei der externen Werkstatt (EXTERN, kein Werkstattkonto) in Reparatur, Leitung darf zur Abschlusskontrolle geben
const isQualityRelease = (c, A) => c.status === 'in_reparatur' && c.workshop_site === 'EXTERN' && ['owner', 'fleet'].includes(S.me.role) && (A || []).includes('request_quality_check');
async function viewCase(id) {
  const d = await api('GET', '/api/cases/' + id);
  const c = d.case;
  // Backlog 629: externe Werkstatt ohne Konto – Leitung führt Abschlusskontrolle und Freigabe selbst aus; kombinierter Knopf (nur Oberfläche,
  // zwei Befehle nacheinander, Server-Prüfungen unverändert)
  const A = isQualityRelease(c, d.allowed_actions) ? d.allowed_actions.flatMap((a) => (a === 'request_quality_check' ? [a, 'quality_release'] : [a])) : d.allowed_actions;
  const prioLine = c.reported_priority !== c.priority ? ` <span class="muted small">(${esc(t('reported_prio'))}: ${esc(t('prio_' + c.reported_priority))})</span>` : '';
  // Sichten nach einer Meldungswelle (Backlog 280): Leitung springt zur nächsten nicht bestätigten Meldung (gesperrte/kritische zuerst)
  let html = `<p class="noprint" style="display:flex;gap:12px;flex-wrap:wrap;align-items:center"><a class="backlink" href="#/cases">‹ ${esc(t('back'))}</a>${isMgr() ? `<button type="button" class="btn secondary" id="nextunrec" style="margin-left:auto">${esc(t('next_unreceived'))} ›</button>` : ''}</p>
    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">${plate(d.vehicle.plate, { big: true, locked: c.safety_lock })}<span class="chip ${c.status === 'fahrzeug_freigegeben' ? 'ok' : esc(c.priority)}">${esc(stTxt(c))}</span>${c.environment === 'test' ? '<span class="chip test">TEST</span>' : ''}</div>
    <h1 style="margin-top:12px" data-title="${esc(c.case_no)} · ${esc(d.vehicle.plate)}">${esc(c.case_no)}</h1>
    <p class="print-only small">${printStamp()} · CEVIK ${esc(t('app'))} [CLAUDE]</p>
    <div class="actions noprint"><button type="button" class="btn secondary" id="cprt">${esc(t('print'))}</button></div>
    ${c.safety_lock ? `<div class="panel alert"><b>${esc(t('locked'))}</b> – ${esc(translateLockReason(S.lang, c.safety_lock_reason || ''))}</div>` : ''}
    ${isWithdrawn(c) && (S.me.role === 'driver' || c.reporter_id === S.me.id) ? `<div class="panel" role="note" data-wdagain>${esc(t('wd_again_hint'))}</div>` : ''}
    ${d.access === 'preview' ? `<div class="panel">${esc(t('preview_hint'))}</div>` : ''}
    ${d.maintenance_event ? (() => { const me = d.maintenance_event; const ri = me.reinspection; const good = ri && !DEFECT_RESULTS.includes(ri.result); return `<div class="panel ${good ? 'good' : ''}"><b>${esc(t('md_case'))}: ${esc(mk(me.kind))} ${fmtD(me.done_date)}</b> · ${esc(t('res_' + me.result))} – ${ri ? `${esc(t('reinsp_done'))} ${fmtD(ri.done_date)}${ri.result ? ' · ' + esc(t('res_' + ri.result)) : ''} (${esc(ri.evidence)})` : `${c.status === 'fahrzeug_freigegeben' ? `<span class="chip mittel">${esc(t('todo_reinspection'))}</span> ` : ''}${esc(t('md_case_hint'))}`} <a class="noprint" href="#/vehicles/${esc(c.vehicle_id)}">${esc(t('vehicle_file'))} ›</a></div>`; })() : ''}
    ${d.maintenance_rule ? `<div class="panel ${d.maintenance_rule.done_since_order ? 'good' : ''}"><b>${esc(t('mo_case'))}: ${esc(mk(d.maintenance_rule.kind))}</b> – ${d.maintenance_rule.done_since_order ? `${esc(t('mo_done'))} ${fmtD(d.maintenance_rule.last_done_date)}` : esc(t('mo_case_hint'))} <a class="noprint" href="#/vehicles/${esc(c.vehicle_id)}">${esc(t('vehicle_file'))} ›</a></div>` : ''}
    ${d.tire_winter ? (() => { const w = d.tire_winter; const good = w.status === 'erfuellt'; return `<div class="panel ${good ? 'good' : ''}" id="cwinter"><b>${esc(t('wo_case'))}</b> <span class="chip ${good ? 'ok' : w.status === 'nicht_erfuellt' ? 'kritisch' : 'mittel'}">${esc(t('ws_' + w.status))}</span>${w.noncompliant.length ? ` – ${esc(t('winter_bad').replace('{p}', w.noncompliant.map(posL).join(', ')))}` : ''}${w.missing.length ? ` – ${esc(t('winter_missing').replace('{p}', w.missing.map(posL).join(', ')))}` : ''}${good ? '' : `<p class="small" id="cwhint">${esc(t(['fahrzeug_freigegeben', 'abgelehnt'].includes(c.status) ? 'wo_case_hint_closed' : 'wo_case_hint'))}</p>`}${!good && !['fahrzeug_freigegeben', 'abgelehnt'].includes(c.status) && ['owner', 'fleet', 'workshop'].includes(S.me.role) ? ` <span class="noprint"><a href="#/vehicles/${esc(c.vehicle_id)}?sec=wo" id="cwrec">❄ ${esc(t('wo_rec'))} ›</a> ·</span>` : ''} <a class="noprint" href="#/vehicles/${esc(c.vehicle_id)}">${esc(t('vehicle_file'))} ›</a></div>`; })() : ''}
    ${qBanner(c)}
    ${isMgr() && TACHO_HINT.test(cDesc(c.description) || '') ? `<div class="panel" data-tachocard><b>${esc(t('tcard_mgr_t'))}</b> ${esc(t('tcard_mgr_s'))} <a class="noprint" href="${d.reporter_driver_id ? '#/drivers/' + esc(d.reporter_driver_id) : '#/drivers'}">${esc(t(d.reporter_driver_id ? 'tcard_mgr_link' : 'drivers'))} ›</a></div>` : ''}
    ${c.cost_over_limit_at ? `<div class="panel warn"><b>${esc(t('cost_approval_pending'))}</b>${isMgr() || S.me.role === 'workshop' ? ` – ${esc(t(isMgr() ? 'cost_approval_hint_mgr' : 'cost_approval_hint_ws'))}` : ''} <span class="small muted">(${fmtDT(c.cost_over_limit_at)})</span></div>` : ''}
    <section class="panel"><p style="white-space:pre-wrap;font-size:1.05rem"${langAttr(cDesc(c.description))}>${esc(cDesc(c.description))}</p>
    <dl class="kv">
      <dt>${esc(t('urgency'))}</dt><dd><span class="chip ${esc(c.priority)}">${esc(t('prio_' + c.priority))}</span>${prioLine}</dd>
      <dt>${esc(t('driveable'))}</dt><dd>${c.origin === 'kontrolle' && c.reported_driveability === 'unbekannt' ? `<span data-drvcheck>${esc(t('drv_not_asked_check'))}${S.me.role === 'driver' && OPEN_CASE_ST.includes(c.status) ? ' – ' + esc(t('check_defect_clarify')) : ''}</span>` : esc(t('drv_' + c.reported_driveability))}</dd>
      ${d.reporter_name || d.reporter_name_hidden ? `<dt>${esc(t('reported_by'))}</dt><dd>${esc(pnm(d.reporter_name, d.reporter_name_hidden))} · ${fmtDT(c.created_at)}</dd>` : `<dt>${esc(t('date'))}</dt><dd>${fmtDT(c.created_at)}</dd>`}${repAssign(d.reporter_assignment, c.vehicle_id)}
      ${srcInsp(d.source_inspection)}
      ${c.occurred_at ? `<dt>${esc(t('occurred'))}</dt><dd data-occurred>${fmtOccurred(c.occurred_at)}${occLate(c)}</dd>${occDrivers(d.occurred_drivers)}` : ''}
      <dt>${esc(t('received'))}</dt><dd>${c.fleet_received_at ? fmtDT(c.fleet_received_at) : esc(t('not_yet'))}${c.fleet_received_at && d.received_by ? ` · ${esc(d.received_by.name)}${d.received_by.current ? '' : ` <span class="chip mittel" data-recvgone>${esc(t('recv_gone'))}</span>`}` : ''}</dd>
      <dt>${esc(t('workshop'))}</dt><dd>${esc(wsName(c.workshop_site || c.suggested_workshop_site))}${c.planned_date ? ' · ' + esc(t('planned')) + ' ' + fmtD(c.planned_date) : ''}${c.planned_date && c.planned_note ? `<br><span class="small" data-plannote>${esc(t('plan_note_lbl'))}: ${esc(c.planned_note)}</span>` : ''}</dd>${c.followup_on && !['fahrzeug_freigegeben', 'abgelehnt'].includes(c.status) ? `<dt>${esc(t('followup'))}</dt><dd><span class="chip${c.followup_on <= bDate() ? ' mittel' : ''}">${fmtD(c.followup_on)}</span>${c.followup_note ? ' ' + esc(c.followup_note) : ''}</dd>` : ''}
      ${c.status === 'wartet_teile' ? `<dt>${esc(t('parts_eta'))}</dt><dd>${c.parts_expected_date ? partsEta(c, '', false) : `<span class="muted">${esc(t('parts_eta_none'))}</span>`}</dd>` : ''}
      ${c.status === 'wartet_teile' && d.parts_wait ? partsWaitRows(d.parts_wait) : ''}
      ${c.status !== 'gemeldet' ? `<dt>${esc(t('workshop_ack'))}</dt><dd>${c.workshop_ack_at ? fmtDT(c.workshop_ack_at) : esc(t('not_yet'))}</dd>` : ''}
      ${c.location_note ? `<dt>${esc(t('location_shown'))}</dt><dd>${esc(c.location_note)}</dd>` : ''}
      ${vehLocInfo(c)}${handoverInfo(c)}${pickupInfo(c)}
      ${d.parent ? `<dt>${esc(t('parent'))}</dt><dd>${d.parent.id ? `<a href="#/cases/${esc(d.parent.id)}">${esc(d.parent.case_no)}</a>` : esc(d.parent.case_no)}</dd>` : ''}
      ${d.duplicate_of ? `<dt>${esc(t('dup_of'))}</dt><dd>${S.me.role === 'driver' || !d.duplicate_of.id ? esc(d.duplicate_of.case_no) : `<a href="#/cases/${esc(d.duplicate_of.id)}">${esc(d.duplicate_of.case_no)}</a>`}</dd>` : ''}${d.duplicates && d.duplicates.length ? `<dt>${esc(t('duplicates'))}</dt><dd>${d.duplicates.map((x) => `<span style="white-space:nowrap" data-dupat><a href="#/cases/${esc(x.id)}">${esc(x.case_no)}</a>${x.created_at ? ` <span class="small muted">(${esc(t('reported_at_short'))} ${fmtDT(x.created_at)})</span>` : ''}</span>`).join(', ')}</dd>` : ''}
      ${!['driver'].includes(S.me.role) ? `<dt>${esc(t('vehicle_file'))}</dt><dd><a href="#/vehicles/${esc(d.vehicle.id)}">${esc(d.vehicle.plate)}</a></dd>` : ''}
      ${!['driver'].includes(S.me.role) && d.vehicle.vin ? `<dt>${esc(t('vin'))}</dt><dd translate="no" data-cvin>${esc(d.vehicle.vin)}</dd>${d.vehicle.manufacturer || d.vehicle.model ? `<dt>${esc(t('manufacturer'))}</dt><dd>${esc([d.vehicle.manufacturer, d.vehicle.model].filter(Boolean).join(' '))}</dd>` : ''}${d.vehicle.kind !== 'anhaenger' && d.vehicle.trailer_plate ? `<dt>${esc(t('trailer'))}</dt><dd>${esc(d.vehicle.trailer_plate)}</dd>` : ''}` : ''}
    </dl>${vehInfo(d.vehicle_info, c)}</section>`;

  // Aktionen
  const main = A.filter((a) => !['comment', 'upload', 'inspection', 'resolve_open_item'].includes(a));
  if (main.length || A.includes('inspection')) {
    html += `<div class="actions">${A.includes('inspection') ? `<a class="btn" href="#/inspect/${esc(c.id)}">${esc(t('act_inspection'))}</a>` : ''}${main.map((a) => `<button class="btn ${['reject', 'set_safety_lock', 'withdraw_order'].includes(a) ? 'danger' : ['technical_release', 'quality_release'].includes(a) ? 'go' : ['record_work', 'add_part', 'add_open_item', 'add_external_cost', 'change_priority', 'reassign_workshop', 'correct_vehicle', 'lift_safety_lock', 'return_for_rework', 'set_planned_date', 'set_parts_eta', 'set_followup', 'set_vehicle_location', 'set_handover', 'set_occurred_at'].includes(a) ? 'secondary' : ''}" data-act="${esc(a)}">${esc(t('act_' + a))}</button>`).join('')}</div><div id="actform"></div>`;
  } else html += `<div id="actform"></div>`;

  // Dateien
  // Je Datei: wann und von wem (Rolle, Name nach denselben Regeln wie im Verlauf) – Schadensfoto des Fahrers vs. Reparaturfoto der Werkstatt (Backlog 223)
  html += `<h2>${esc(t('files'))}</h2><div class="thumbs">${d.files.map((f) => {
    const role = f.uploader_role ? t('role_' + f.uploader_role) : '';
    const name = f.uploaded_by_name_hidden ? t('name_hidden_driver') : (f.uploaded_by_name || '');
    const info = [fmtDT(f.created_at), role, name && name !== role ? name : ''].filter(Boolean);
    const link = f.content_type.startsWith('image/') ? `<a href="${fileUrl(f.id)}" target="_blank" rel="noopener"><img loading="lazy" src="${fileUrl(f.id)}" alt="${esc([f.filename, ...info].join(' · '))}"></a>` : `<a href="${fileUrl(f.id)}" target="_blank" rel="noopener" aria-label="${esc(['PDF', f.filename, ...info].join(' · '))}">PDF<br>${esc(f.filename.slice(0, 14))}</a>`;
    return `<figure class="thumb" data-fileinfo title="${esc(info.join(' · '))}">${link}<figcaption class="small muted"><span>${esc(fmtD(f.created_at))} ${esc(fmtHM(f.created_at))}</span>${role ? `<span data-uprole="${esc(f.uploader_role)}">${esc(role)}</span>` : ''}${name && name !== role ? `<span>${esc(name)}</span>` : ''}</figcaption></figure>`;
  }).join('')}</div>`;
  const canUpload = A.includes('upload') || (c.reporter_id === S.me.id && !['fahrzeug_freigegeben', 'abgelehnt'].includes(c.status));
  // Höchstzahl je Vorgang (wie Server MAX_FILES): voll → Hinweis statt Knopf; sonst freie Plätze nennen, wenn weniger als die Hälfte frei
  const filesFree = Math.max(0, PHOTO_MAX - d.files.length);
  if (canUpload && filesFree) html += `<label class="btn secondary noprint" style="margin-top:8px;display:inline-flex">${esc(t('add_photos'))}<input id="file" type="file" accept="image/*,application/pdf" multiple hidden></label>${filesFree < PHOTO_MAX / 2 ? ` <span class="small muted" id="filesfree">${esc(t('files_free').replace('{n}', filesFree).replace('{max}', PHOTO_MAX))}</span>` : ''}`;
  else if (canUpload) html += `<p class="small muted" id="filesfull">${esc(t('files_full').replace('{max}', PHOTO_MAX))}</p>`;

  // Restarbeiten
  if (d.open_items.length) {
    html += `<h2>${esc(t('open_items'))}</h2><div class="list">${d.open_items.map((o) => `<div class="row note ${o.safety_relevant && o.status === 'offen' ? 'p-kritisch' : ''}"><span class="chip ${o.status === 'offen' ? (o.safety_relevant ? 'kritisch' : 'mittel') : 'ok'}">${esc(t('oi_' + o.status))}</span><span class="title" style="white-space:normal"${langAttr(o.description)}>${esc(o.description)}${oiFileLink(o, d)}</span>${o.status === 'offen' && (A.includes('resolve_open_item') || isMgr()) ? `<span style="display:flex;gap:6px;flex-wrap:wrap">${A.includes('resolve_open_item') ? `<button class="btn secondary" data-resolve="${esc(o.id)}">${esc(t('done'))}</button>` : ''}${isMgr() ? `<button class="btn secondary" data-oifu="${esc(o.id)}" data-safety="${o.safety_relevant ? 1 : 0}">${esc(t('oi_to_case'))}</button>` : ''}</span>` : '<span></span>'}<span class="sub" style="white-space:normal">${o.safety_relevant ? esc(t('safety_relevant')) + ' · ' : ''}${esc((pnm(o.created_by_name, o.created_by_name_hidden) || t('role_' + o.created_by_name_role)))} · ${fmtDT(o.created_at)}${o.resolution_note ? ' · ' + (/^Folgeauftrag \S{1,40}$/.test(o.resolution_note) ? esc(t('oi_followup_ref').replace('{v}', () => o.resolution_note.slice(13))) : ltxt(o.resolution_note)) : ''}</span></div>`).join('')}</div>`;
  }
  if (d.followups.length) html += `<h2>${esc(t('followups'))}</h2><div class="list">${d.followups.map((f) => `<a class="row note p-${esc(f.priority)}" href="#/cases/${esc(f.id)}"><span class="chip">${esc(f.case_no)}</span><span class="title" style="white-space:normal"${langAttr(cDesc(f.description))}>${esc(cDesc(f.description))}</span><span class="chip">${esc(t('st_' + f.status))}</span></a>`).join('')}</div>`;
  if (d.inspections.length) html += `<h2>${esc(t('inspections'))}</h2>${d.inspections.map((i) => `<details class="panel cinsp"><summary>${fmtDT(i.created_at)} · ${esc((pnm(i.performed_by_name, i.performed_by_name_hidden) || t('role_' + i.performed_by_name_role)))} · <span class="chip ${i.result === 'ok' ? 'ok' : 'kritisch'}">${i.result === 'ok' ? 'OK' : esc(t('defect'))}</span>${i.odometer_km ? ' · ' + fmtKm(i.odometer_km) : ''}</summary><table>${i.items.map((it) => `<tr><td>${esc(checkLabel(it.key))}</td><td><span class="chip ${it.result === 'mangel' ? 'kritisch' : it.result === 'ok' ? 'ok' : ''}">${esc(t(it.result === 'mangel' ? 'defect' : it.result))}</span>${it.note ? ' ' + esc(it.note) : ''}${it.followup_case_no ? (it.followup_case_id ? ` → <a href="#/cases/${esc(it.followup_case_id)}">${esc(it.followup_case_no)}</a>` : ` → ${esc(it.followup_case_no)}`) : ''}</td></tr>`).join('')}</table></details>`).join('')}`;

  // Arbeiten, Teile, Kosten
  if (d.work) {
    html += `<h2>${esc(t('work'))} & ${esc(t('parts'))}</h2><div class="scroll"><table><thead><tr><th>${esc(t('date'))}</th><th>${esc(t('activity'))}</th><th>${esc(t('hours'))}</th></tr></thead><tbody>${d.work.map((w) => `<tr><td>${fmtD(w.work_date)}</td><td>${esc(w.description)}<br><span class="small muted">${esc(w.user_name)}</span></td><td>${hrs(w.hours)}</td></tr>`).join('') || `<tr><td colspan="3" class="muted">–</td></tr>`}</tbody></table>
      <table style="margin-top:8px"><thead><tr><th>${esc(t('part_name'))}</th><th>${esc(t('qty'))}</th><th>€</th></tr></thead><tbody>${d.parts.map((p) => `<tr><td><span${langAttr(p.name)}>${esc(p.name)}</span>${p.part_number ? ` <span class="small muted pn">${esc(p.part_number)}</span>${['owner', 'fleet', 'workshop'].includes(S.me.role) && p.part_number.trim().length >= 3 ? ` <a class="small noprint" href="#/stock/usage" data-puq="${esc(p.part_number)}">${esc(t('ptu_more'))}</a>` : ''}` : ''}${bookedAt(p.created_at)}${p.warranty_until ? '<br>' : ''}${warrChip(p.warranty_until)}${partFileLink(p, d)}</td><td>${fmtNum(p.quantity)} ${esc(unitL(p.unit))}</td><td>${p.unit_price_net === null ? `<span class="chip mittel">${esc(t('unvalued'))}</span>` : eur(rc2(Number(p.quantity) * p.unit_price_net)) + (Number(p.quantity) !== 1 ? ` <span class="small muted">(${esc(t('per_unit'))} ${eur3(p.unit_price_net)})</span>` : '') + (p.valuation === 'estimate' ? ' (' + esc(t('estimate')) + ')' : '')}</td></tr>`).join('') || `<tr><td colspan="3" class="muted">–</td></tr>`}</tbody></table></div>`;
  }
  if (d.costs) {
    const k = d.costs;
    html += `<section class="panel ${k.complete ? '' : ''}"><h3>${esc(t('costs'))}</h3><dl class="kv"><dt>${esc(t('actual_cost'))}</dt><dd>${eurIst(k)}</dd><dt>${esc(t('estimate'))}</dt><dd>${eur(k.estimate_net)}</dd><dt>${esc(t('unvalued'))}</dt><dd>${k.unvalued_items ? `<span class="chip mittel">${k.unvalued_items}</span>` : '0'}</dd><dt>${esc(t('hours'))}</dt><dd>${hrs(k.hours)}${k.hourly_rate_net === null ? ` <span class="small muted">(${esc(t('hourly_rate'))}: –)</span>` : ''}</dd>${d.cost_limit ? `<dt>${esc(t('cost_limit'))}</dt><dd>${d.cost_limit.limit_net !== null ? eur(d.cost_limit.limit_net) : '–'}${d.cost_limit.approved_net !== null ? ` · ${esc(t('cost_approved_upto'))} ${eur(d.cost_limit.approved_net)}` : ''}${d.cost_limit.over_since ? ` <span class="chip mittel">${esc(t('cost_approval_pending'))}</span>` : ''}</dd>` : ''}</dl>
      ${d.external_costs && d.external_costs.length ? `<table>${d.external_costs.map((x) => `<tr><td style="overflow-wrap:anywhere">${esc(x.supplier)} ${esc(x.invoice_no || '')}${bookedAt(x.created_at)}${warrChip(x.warranty_until)}${x.covers_work_and_parts ? `<br><span class="small muted">${esc(t('covers_all'))}</span>` : ''}${x.note ? `<br><span class="small muted" data-extnote>${esc(x.note)}</span>` : ''}${extFileLink(x)}</td><td>${x.amount_net === null ? esc(t('unvalued')) : eur(x.amount_net) + (x.valuation === 'estimate' ? ' (' + esc(t('estimate')) + ')' : '')}</td></tr>`).join('')}</table>` : ''}${k.external_replaces_own ? `<p class="small muted">${esc(t('ext_replaces_note'))}</p>` : ''}</section>`;
  }

  // Als Dublette abgelehnt ohne eigenen Fall: kein Formular (Server lehnt ab), Hinweis auf den Ursprungsvorgang (20.10.2026)
  if (d.insurance_contracts) html += d.duplicate_of && !d.claim
    ? `<section class="panel"><h3>${esc(t('claim_title'))}</h3><p class="small muted">${esc(t('claim_dup_hint'))}${d.duplicate_of.id ? ` <a href="#/cases/${esc(d.duplicate_of.id)}">${esc(d.duplicate_of.case_no)}</a>` : ''}</p></section>`
    : claimSection(d.claim, d.insurance_contracts, d.files || [], c.description, c, (d.vehicle_info && d.vehicle_info.coupled) || []);
  // Dauer je Status (aus dem Verlauf: gespeicherte Statuswechsel, aktueller Status bis jetzt)
  {
    const spans = []; let cur = 'gemeldet'; let since = c.created_at;
    for (const e of d.events) if (e.to_status && e.to_status !== cur) { spans.push([cur, Date.parse(e.created_at) - Date.parse(since)]); cur = e.to_status; since = e.created_at; }
    const closed = ['fahrzeug_freigegeben', 'abgelehnt'].includes(cur);
    if (!closed) spans.push([cur, nowMs() - Date.parse(since)]);
    const sum = {}; for (const [st, ms] of spans) sum[st] = (sum[st] || 0) + Math.max(0, ms);
    const dur = (ms) => { const h = ms / 3600000; return h < 1 ? `${Math.round(ms / 60000)} ${t('min_short')}` : h < 48 ? `${fmtNum(Math.round(h * 10) / 10)} ${t('h_short')}` : `${nDays(Math.round((h / 24) * 10) / 10)}`; };
    if (Object.keys(sum).length > 1 || closed) html += `<h2>${esc(t('time_per_status'))}</h2><dl class="kv">${Object.entries(sum).map(([st, ms]) => `<dt>${esc(t('st_' + st))}${!closed && st === cur ? ` (${esc(t('current'))})` : ''}</dt><dd>${dur(ms)}</dd>`).join('')}</dl>`;
  }
  // Verlauf + Kommentar
  html += `<h2>${esc(t('history'))}</h2><ol class="timeline">${d.events.map((e) => `<li><time>${fmtDT(e.created_at)}</time> · <b>${esc(e.action === 'comment' && e.payload && e.payload.question ? t('act_question') : t('act_' + e.action) !== 'act_' + e.action ? t('act_' + e.action) : e.action === 'create' ? t('report_sent') : e.action)}</b>${e.actor_name || e.actor_name_hidden ? ' · ' + esc(pnm(e.actor_name, e.actor_name_hidden)) : ''}${e.to_status && e.from_status !== e.to_status ? ` → ${esc(t('st_' + e.to_status))}` : ''}${e.note ? `<div style="white-space:pre-wrap"${langAttr(evNote(e))}>${esc(evNote(e))}</div>` : ''}${e.action === 'cost_limit_exceeded' && e.payload ? `<div class="small muted">${esc(t('costs'))} ${eur(e.payload.total_net)} > ${esc(t((e.payload.approved_net || 0) > (e.payload.limit_net || 0) ? 'cost_approved_upto' : 'cost_limit'))} ${eur(Math.max(e.payload.limit_net, e.payload.approved_net || 0))}</div>` : ''}${e.action === 'correct_vehicle' && e.payload && e.payload.inspection_id ? `<div class="small muted cvinsp">${esc(cvInspText(e.payload))}</div>` : ''}${e.action === 'file_added' && e.payload && e.payload.filename ? `<div class="small muted" data-fileev>📎 ${esc(e.payload.filename)}</div>` : ''}${e.action === 'approve_costs' && e.payload ? `<div class="small muted">${esc(t('cost_approved_upto'))} ${eur(e.payload.approved_net)}</div>` : ''}${e.action === 'parts_partial' && e.payload && 'to' in e.payload ? `<div class="small muted" data-ppev>${esc(t('pp_eta'))}: ${e.payload.from ? fmtD(e.payload.from) : '–'} → ${e.payload.to ? fmtD(e.payload.to) : '–'}</div>` : ''}${e.action === 'set_parts_eta' && e.payload ? `<div class="small muted">${e.payload.from ? fmtD(e.payload.from) : '–'} → ${e.payload.to ? fmtD(e.payload.to) : '–'}</div>` : evFromTo(e)}${e.payload && e.payload.planned_to ? `<div class="small muted">${esc(t('planned'))}: ${e.payload.planned_from ? fmtD(e.payload.planned_from) + ' → ' : ''}${fmtD(e.payload.planned_to)}</div>` : ''}${e.payload && e.payload.parts_expected_date ? `<div class="small muted">${esc(t('parts_eta'))} ${fmtD(e.payload.parts_expected_date)}</div>` : ''}${e.payload && e.payload.pickup_for_driver ? `<div class="small muted" data-puev>${esc(t('pu_ev_driver'))}${e.payload.pickup_valid_until ? ' · ' + esc(t('pu_valid_until')) + ' ' + fmtD(e.payload.pickup_valid_until) : ''}</div>` : ''}${e.payload && e.payload.winter_open_confirmed ? `<div class="small muted wqev">❄ ${esc(t('wq_ev_open'))}${[...(e.payload.noncompliant || []), ...(e.payload.missing || [])].length ? ': ' + esc([...(e.payload.noncompliant || []), ...(e.payload.missing || [])].join(', ')) : ''}</div>` : ''}</li>`).join('')}</ol>`;
  if (A.includes('comment')) html += `<form id="cf"><label for="ct">${esc(t('act_comment'))}</label><textarea id="ct" required minlength="3"></textarea>${S.me.role !== 'driver' ? `<fieldset style="border:0;padding:0;margin:8px 0"><legend class="small muted">${esc(t('notify_only'))}</legend><div style="display:flex;gap:14px;flex-wrap:wrap">${[['fleet', t('nt_fleet_owner')], ['workshop', t('role_workshop')], ['reporter', t('reported_by')]].filter(([k]) => k !== 'workshop' || (c.status !== 'abgelehnt' && (c.workshop_site || c.suggested_workshop_site))).map(([k, l]) => { const off = k === 'reporter' && d.reporter_unreachable; return `<label class="small${off ? ' muted' : ''}" style="display:flex;gap:6px;align-items:center;min-height:44px"><input type="checkbox" data-nt="${k}"${off ? ' disabled' : ''}> ${esc(l)}${off ? ` <span style="white-space:nowrap">(${esc(t(d.reporter_unreachable === 'inactive' ? 'reporter_off_inactive' : 'reporter_off_other'))})</span>` : ''}</label>`; }).join('')}</div>${isMgr() && !d.reporter_unreachable && c.reporter_id && c.reporter_id !== S.me.id && OPEN_CASE_ST.includes(c.status) ? `<label class="small" style="display:flex;gap:6px;align-items:center;min-height:44px"><input type="checkbox" data-q> ${esc(t('q_ask'))}</label>` : ''}</fieldset>` : ''}<div class="actions"><button class="btn secondary">${esc(t('save'))}</button></div></form>`;
  render(html, 'cases', { defer: true });
  $('#cprt').onclick = () => window.print();

  // Befehlskennung je Inhalt: wiederholtes Absenden desselben Eintrags nach verlorener Antwort (Funkloch) nutzt dieselbe command_id –
  // der Server meldet dann „duplicate“ statt doppelt zu buchen (20.10.2026: 2 × 1,5 h Arbeitszeit, doppelte Lagerentnahme); nach Erfolg verworfen
  // opts.formAction: Formular, aus dem der Befehl kommt (kombinierter Knopf, Backlog 629); opts.next(r): Folgeschritt statt Neuladen
  const cmd = async (action, note, payload = {}, opts = {}) => {
    const fAct = opts.formAction || action;
    const key = JSON.stringify([c.id, action, note ?? null, payload]);
    // nur kurz nach dem Fehlschlag wiederverwenden: am geteilten Tablet bucht später ein anderer Mechaniker evtl. denselben Inhalt (23.10.2026)
    const commandId = S.pendCmd && S.pendCmd.key === key && Date.now() - S.pendCmd.at < 10 * 60000 ? S.pendCmd.id : uid(); S.pendCmd = { key, id: commandId, at: Date.now() };
    try { const r = await api('POST', `/api/cases/${c.id}/commands`, { action, command_id: commandId, expected_version: c.version, note, payload }); if (S.cmdOffline && S.cmdOffline.key === key) S.cmdOffline = null; S.pendCmd = null; if (r && r.no_workshop_user) toast(t('no_ws_user_warn'), true); else if (r && r.external_workshop) toast(t('ext_ws_hint')); else if (r && r.no_recipients) toast(t('no_recipients_warn'), true); else toast(r && r.duplicate ? t('cmd_duplicate') : '✓'); if (S.openAct && S.openAct.action === fAct) S.openAct = null; actDraft(c.id).clear(); if (opts.next) return opts.next(r); viewCase(c.id); }
    // Konflikt: Befehl wurde NICHT ausgeführt – Eingaben (z. B. Kommentartext) beim Neuladen behalten (17.10.2026: Text war nach 409 weg)
    // cost_approval_open: Server hat die Kostengrenze eben markiert (Version +1) – neu laden, damit „Kosten freigeben“ erscheint (20.10.2026)
    // Schichtwechsel 22.10.2026: allgemeines „bitte neu laden“ führte zum Neuladen im Browser – dann waren die Eingaben weg. Die App lädt selbst
    // und behält das Formular; ist die Aktion danach nicht mehr erlaubt (z. B. inzwischen freigegeben), bleiben die Eingaben als Hinweis stehen
    // Netzabbruch: Formular bleibt offen (Hinweis „nicht gespeichert“); derselbe Inhalt war unterwegs → spätere Versionsabweisung kann die eigene,
    // doch angekommene Buchung sein (nach 10 Min. neue Kennung) – dann nicht „jemand anderes“ melden, sondern zuerst den Verlauf prüfen lassen
    // (Backlog 186, Werkstatt-Tablet in der Halle: sonst doppelte Arbeitszeit)
    catch (err) {
      if (err.offline) { S.cmdOffline = { key, at: Date.now() }; actDraftSave(c.id, fAct); }
      const maybeMine = err.code === 'version_conflict' && S.cmdOffline && S.cmdOffline.key === key;
      const generic = err.code === 'version_conflict' && action !== 'approve_costs';
      if (!generic) toast(err.offline ? `${err.message} ${t('cmd_offline_kept')}` : err.message, true);
      if (err.code === 'version_conflict') {
        S.actSince = []; S.lostAct = { caseId: c.id, action, note, payload }; try { await viewCase(c.id); } catch {}
        const lost = $('#lostact'); if (lost) lost.scrollIntoView({ block: 'center' }); else if (generic) toast(t(maybeMine ? 'cmd_maybe_saved' : 'case_conflict_kept'), true);
        if (maybeMine) { S.cmdOffline = null; actDraft(c.id).clear(); }
      } else if (err.code === 'cost_approval_open') viewCase(c.id);
      else if (err.code === 'insufficient_stock' && action === 'add_part' && payload.stock_item_id) stockShortfall(payload.stock_item_id, err.data);
      else if (err.code === 'duplicate_invoice' && action === 'add_external_cost') dupInvoiceHint(err.data);
    }
  };
  const nu = $('#nextunrec'); if (nu) nu.onclick = async () => {
    try {
      const r = await api('GET', '/api/cases?status=open&unreceived=1&limit=50');
      const nx = (r.cases || []).find((x) => x.id !== c.id);
      if (nx) location.hash = `#/cases/${encodeURIComponent(nx.id)}`; else toast(t('next_unreceived_none'));
    } catch (err) { toast(err.message, true); }
  };
  $$('[data-act]').forEach((b) => (b.onclick = () => actionForm(b.dataset.act, c, cmd, {}, d)));
  // Backlog 633: Polizeiangaben aus dem Versicherungsfall des gekoppelten Fahrzeugs übernehmen (nur Vorbelegung, gespeichert wird erst mit „Speichern“)
  $$('[data-cppull]').forEach((b) => (b.onclick = () => {
    const f = b.closest('form'); if (!f) return;
    const map = { police_station: b.dataset.st, police_ref: b.dataset.ref, police_reported_on: b.dataset.on };
    if (Object.entries(map).some(([k, v]) => f.elements[k] && f.elements[k].value && f.elements[k].value !== v) && !confirm(t('cp_pull_confirm'))) return;
    for (const [k, v] of Object.entries(map)) if (f.elements[k]) { f.elements[k].value = v || ''; f.elements[k].dispatchEvent(new Event('input', { bubbles: true })); }
    toast(t('cp_pulled'));
  }));
  $$('[data-resolve]').forEach((b) => (b.onclick = () => actionForm('resolve_open_item', c, cmd, { open_item_id: b.dataset.resolve })));
  // Restarbeit → Folgeauftrag (Backlog 260): kleines Formular unter der Zeile, Dringlichkeit vorbelegt wie bei Kontroll-Mängeln
  $$('[data-oifu]').forEach((b) => (b.onclick = () => {
    const old = $('#oiff'); if (old) old.remove();
    const row = b.closest('.row'); const safety = b.dataset.safety === '1';
    const f = document.createElement('form'); f.id = 'oiff'; f.className = 'panel';
    f.innerHTML = `<p class="small muted">${esc(t(safety ? 'oi_to_case_hint_safety' : 'oi_to_case_hint'))}</p><label for="oifp">${esc(t('urgency'))}</label><select id="oifp" name="priority">${['niedrig', 'mittel', 'kritisch'].map((p) => `<option value="${p}"${p === (safety ? 'kritisch' : 'mittel') ? ' selected' : ''}>${esc(t('prio_' + p))}</option>`).join('')}</select><label for="oifn">${esc(t('note'))}</label><textarea id="oifn" name="note" rows="2" maxlength="1000"></textarea><div class="actions"><button class="btn">${esc(t('oi_to_case'))}</button><button type="button" class="btn secondary" id="oifx">${esc(t('cancel'))}</button></div>`;
    row.after(f);
    $('#oifx').onclick = () => f.remove();
    f.onsubmit = async (e) => {
      e.preventDefault();
      try {
        const r = await api('POST', `/api/cases/${encodeURIComponent(c.id)}/open-items/${encodeURIComponent(b.dataset.oifu)}/followup`, { priority: $('#oifp').value, note: $('#oifn').value.trim() || undefined });
        toast(t('oi_to_case_done').replace('{v}', () => r.case_no));
        location.hash = `#/cases/${encodeURIComponent(r.id)}`;
      } catch (err) { toast(err.message, true); }
    };
  }));
  // Neuaufbau derselben Seite (z. B. nach einem Kommentar): ein offenes, nicht abgeschicktes Aktionsformular bleibt offen samt Eingaben
  // (17.10.2026: „Teil erfassen“ halb ausgefüllt war danach weg); nur solange die Aktion noch erlaubt ist
  if (S.openAct && (S.openAct.caseId !== c.id || !S.renderSame || !A.includes(S.openAct.action))) S.openAct = null;
  // Backlog 187: nach Netzabbruch gesichertes Aktionsformular dieses Vorgangs (anderer Vorgang geöffnet, Neuladen, Sprachwechsel) wieder öffnen;
  // ist die Aktion inzwischen nicht mehr erlaubt (z. B. freigegeben), die Eingaben als Hinweis zeigen statt still zu verwerfen
  let actDr = null;
  if (!S.openAct && !(S.lostAct && S.lostAct.caseId === c.id)) {
    const ad = actDraft(c.id); const x = ad.load();
    if (x && x.action && A.includes(x.action)) { S.openAct = { caseId: c.id, action: x.action, preset: x.preset || {} }; actDr = x; }
    else if (x && x.action) { const { note = null, ...payload } = x.v; S.lostAct = { caseId: c.id, action: x.action, note, payload }; ad.clear(); }
  }
  // Abgewiesene Eingaben, deren Aktion nicht mehr erlaubt ist: nicht still verwerfen (Arbeitszeit nach Freigabe ging verloren, 22.10.2026)
  if (S.lostAct && (S.lostAct.caseId !== c.id || A.includes(S.lostAct.action))) S.lostAct = null;
  if (S.lostAct && $('#actform')) showLostInputs(c);
  // Lagerauswahl („Teil erfassen“) wird nachgeladen – erst danach Eingaben wiederherstellen, sonst passt die Formular-Signatur nicht (19.10.2026)
  if (S.openAct) { try { await actionForm(S.openAct.action, c, cmd, S.openAct.preset, d, { restore: true }); } catch { /* Lagerliste nicht ladbar: Formular ohne Lager */ } }
  if (actDr && $('#af')) restoreActDraft(c, actDr);
  finishRender();
  const clf = $('#clf'); if (clf) clf.onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(clf)); for (const k of Object.keys(b)) if (b[k] === '') b[k] = null; try { const r = await api('PUT', `/api/cases/${c.id}/claim`, b); if (r && r.warning && r.warning.code === 'contract_not_valid_at_occurrence') toast(t('claim_contract_invalid').replace('{d}', fmtD(r.warning.day)).replace('{p}', `${r.warning.start_date ? fmtD(r.warning.start_date) : '…'}–${r.warning.end_date ? fmtD(r.warning.end_date) : '…'}`), true); else toast('✓'); viewCase(c.id); } catch (err) { toast(err.message, true); if (err.code === 'version_conflict') viewCase(c.id); } };
  const cf = $('#cf'); if (cf) cf.onsubmit = (e) => { e.preventDefault(); const q = !!($('[data-q]', cf) || {}).checked; const notify = $$('[data-nt]', cf).filter((x) => x.checked).map((x) => x.dataset.nt); if (q && !notify.includes('reporter')) notify.push('reporter'); return cmd('comment', $('#ct').value, { ...(notify.length ? { notify } : {}), ...(q ? { question: true } : {}) }); };
  // Rückfrage (Backlog 463) geht immer an „Gemeldet von“: Häkchen mitsetzen
  const qbox = cf && $('[data-q]', cf); if (qbox) qbox.onchange = () => { const r = $('[data-nt="reporter"]', cf); if (qbox.checked && r) r.checked = true; };
  // Mehr gewählt als noch frei: nur die ersten freien hochladen, der Rest wird vorher genannt (kein Serverfehler je Datei);
  // Fehler gesammelt in einer Meldung nach dem Neuaufbau (sonst überdeckt eine Meldung die andere)
  const fi = $('#file'); if (fi) fi.onchange = async () => {
    const all = [...fi.files]; const take = all.slice(0, filesFree); const skipped = all.slice(filesFree); const errs = []; const dupes = [];
    // Fortschritt sichtbar; bei Netzabbruch die restlichen Fotos in den Postausgang (21.10.2026: 16 s ohne Anzeige, danach „Keine Verbindung“
    // für Fotos, die schon am Server lagen, und der Rest war verloren)
    const prog = document.createElement('span'); prog.className = 'small muted'; prog.setAttribute('role', 'status'); fi.after(prog); fi.disabled = true;
    // Umgebung beim Start festhalten (Inhaber schaltet währenddessen um: Rest ging sonst an die andere Umgebung – 22.10.2026)
    const who = outboxWho(); const ox = who ? { env: who.env } : {}; const hash0 = location.hash;
    let later = 0;
    for (const [i, file] of take.entries()) {
      prog.textContent = ` ${t('uploading')} ${i + 1}/${take.length}`;
      try {
        const blob = await prepareUpload(file);
        // Backlog 603 (Blickwinkel „Werkstatt-Tablet UK mit Fotos“): Format/Größe vor dem Hochladen prüfen – sonst lud ein 20-MB-Scan
        // erst komplett hoch (bei langsamem WLAN Zeitüberschreitung → Postausgang → später erneut abgelehnt) bzw. HEIC kam als „zu groß“ zurück
        const rej = uploadReject(blob, file.name); if (rej) { errs.push(`${file.name}: ${rej}`); continue; }
        const r = await api('POST', `/api/cases/${c.id}/files`, blob, { timeoutMs: PHOTO_TIMEOUT_MS, ...ox, headers: { 'x-filename': encodeURIComponent(file.name), 'content-type': blob.type || 'application/octet-stream' } });
        if (r && r.duplicate) dupes.push(file.name); // gleiche Datei schon am Vorgang – Server legt keine zweite an
      }
      catch (err) {
        // Höchstzahl inzwischen erreicht (zweites Gerät): einmal mit Zahl melden, restliche Dateien nicht einzeln versuchen
        if (err.code === 'too_many') { errs.push(t('files_full').replace('{max}', PHOTO_MAX)); break; }
        if (photoRetry(err)) { later = await photosLater('/api/cases', { request_key: uid() }, c, c.id, take.slice(i), who); if (!later) errs.push(`${file.name}: ${err.message}`); break; }
        errs.push(`${file.name}: ${err.message}`);
      }
    }
    prog.remove(); fi.disabled = false;
    if (later) toast(tn('photos_stored', later));
    // nur neu aufbauen, wenn Seite und Umgebung noch dieselben sind (sonst überschrieb der Vorgang die inzwischen gewählte Ansicht)
    if (location.hash === hash0 && (!who || (outboxWho() || {}).env === who.env)) await viewCase(c.id).catch(() => {});
    if (skipped.length) errs.unshift(tn('files_skipped', skipped.length).replace('{max}', PHOTO_MAX).replace('{names}', skipped.map((f) => f.name).join(', ')));
    if (dupes.length) errs.push(`${t('file_dup')}: ${dupes.join(', ')}`);
    if (errs.length) toast(errs.join(' · '), true); else if (take.length && !later) toast('✓');
  };
}

// ---------- Versicherungsfälle (je Vorgang; nur Inhaber/Fuhrparkleitung) ----------
const CLAIM_ST = ['gemeldet', 'in_pruefung', 'reguliert', 'abgelehnt', 'zurueckgezogen'];
const CLAIM_CLS = { gemeldet: 'mittel', in_pruefung: 'mittel', reguliert: 'ok', abgelehnt: 'kritisch', zurueckgezogen: '' };
const claimChip = (st) => `<span class="chip ${CLAIM_CLS[st]}">${esc(t('cls_' + st))}</span>`;
// Gutachter-Angaben im Versicherungsfall (Teilagent „Versicherungsschaden mit Gutachter“, 23.10.2026): nur was eingetragen ist
function claimAppraisalInfo(cl) {
  if (!cl || !(cl.appraiser || cl.appraisal_on || cl.appraisal_received_on || cl.appraisal_net !== null && cl.appraisal_net !== undefined)) return '';
  const rows = [];
  if (cl.appraiser) rows.push(`<dt>${esc(t('ca_appraiser'))}</dt><dd>${esc(cl.appraiser)}</dd>`);
  if (cl.appraisal_on) rows.push(`<dt>${esc(t('ca_on'))}</dt><dd>${fmtD(cl.appraisal_on)}${cl.appraisal_on === bDate() && !cl.appraisal_received_on ? ` <span class="chip mittel">${esc(t('today'))}</span>` : ''}</dd>`);
  rows.push(`<dt>${esc(t('ca_received'))}</dt><dd>${cl.appraisal_received_on ? fmtD(cl.appraisal_received_on) : cl.appraisal_pending ? `<span class="chip mittel">${esc(t('ca_pending'))}</span>` : '–'}</dd>`);
  if (cl.appraisal_net !== null && cl.appraisal_net !== undefined) rows.push(`<dt>${esc(t('ca_net'))}</dt><dd>${eur(cl.appraisal_net)}</dd>`);
  return `<h4 style="margin:.4rem 0 .2rem">${esc(t('ca_title'))}</h4><dl class="kv">${rows.join('')}</dl>`;
}
// Unfallgegner im Versicherungsfall (Teilagent „Unfall mit fremdem Fahrzeug“, 24.10.2026): nur was eingetragen ist
function claimOpponentInfo(cl) {
  if (!cl || !(cl.opponent_plate || cl.opponent_insurer || cl.opponent_claim_no)) return '';
  const rows = [];
  if (cl.opponent_plate) rows.push(`<dt>${esc(t('co_plate'))}</dt><dd><b data-coplate>${esc(cl.opponent_plate)}</b></dd>`); // Backlog 391: ohne „D“-Länderband – Gegner oft ausländisch
  if (cl.opponent_insurer) rows.push(`<dt>${esc(t('co_insurer'))}</dt><dd>${esc(cl.opponent_insurer)}</dd>`);
  if (cl.opponent_claim_no) rows.push(`<dt>${esc(t('co_claim_no'))}</dt><dd>${esc(cl.opponent_claim_no)}</dd>`);
  return `<h4 style="margin:.4rem 0 .2rem">${esc(t('co_title'))}</h4><dl class="kv">${rows.join('')}</dl>`;
}
// Polizeiliche Anzeige im Versicherungsfall (Teilagent „Kraftstoffdiebstahl am Rastplatz“, 24.10.2026): nur was eingetragen ist
function claimPoliceInfo(cl) {
  if (!cl || !(cl.police_station || cl.police_ref || cl.police_reported_on)) return '';
  const rows = [];
  if (cl.police_station) rows.push(`<dt>${esc(t('cp_station'))}</dt><dd>${esc(cl.police_station)}</dd>`);
  if (cl.police_ref) rows.push(`<dt>${esc(t('cp_ref'))}</dt><dd>${esc(cl.police_ref)}</dd>`);
  if (cl.police_reported_on) rows.push(`<dt>${esc(t('cp_on'))}</dt><dd>${fmtD(cl.police_reported_on)}</dd>`);
  return `<h4 style="margin:.4rem 0 .2rem">${esc(t('cp_title'))}</h4><dl class="kv">${rows.join('')}</dl>`;
}
function claimSection(cl, contracts, files = [], desc = '', c = null, coupled = []) {
  // Backlog 633: Versicherungsfälle offener Vorgänge am gekoppelten Fahrzeug – Polizeiangaben übernehmen, gleiche Schadennummer als Hinweis
  const cpc = coupled.flatMap((g) => g.open_cases.filter((o) => o.claim).map((o) => ({ ...o.claim, case_no: o.case_no, plate: g.plate })));
  const cpPull = cpc.filter((x) => x.police_station || x.police_ref || x.police_reported_on);
  const sameNo = cl && cl.claim_no ? cpc.filter((x) => x.claim_no && x.claim_no.trim().toUpperCase() === cl.claim_no.trim().toUpperCase()) : [];
  // Backlog 621 (Blickwinkel „Versichererwechsel zum 01.01.“): Laufzeit je Vertrag in der Auswahl; neuer Fall: genau ein am Schadentag gültiger Vertrag vorausgewählt
  const occDay = c ? (c.occurred_at ? (String(c.occurred_at).length === 10 ? c.occurred_at : BERLIN_FMT.format(new Date(c.occurred_at))) : c.created_at ? BERLIN_FMT.format(new Date(c.created_at)) : null) : null;
  const kEnd = (k) => k.ended_on || k.end_date || null;
  const validAt = (k, d) => !!d && (!k.start_date || k.start_date <= d) && (!kEnd(k) || kEnd(k) >= d);
  const kPeriod = (k) => (k.start_date || kEnd(k) ? ` (${k.start_date ? fmtD(k.start_date) : '…'}–${kEnd(k) ? fmtD(kEnd(k)) : '…'})` : '');
  const validK = contracts.filter((k) => validAt(k, occDay));
  const preK = validK.length === 1 ? validK[0].id : null;
  // Backlog 287: offener Versicherungsfall ohne Schadenzeitpunkt am Vorgang (wie Datenqualität `claim_no_occurred`) – Hinweis mit Knopfname
  const noOcc = !!(cl && c && (c.origin === 'meldung' || (c.origin === 'kontrolle' && c.check_item && !c.parent_case_id)) && !c.occurred_at && ['gemeldet', 'in_pruefung'].includes(cl.status));
  // Meldung nennt Diebstahl/Einbruch, aber kein Aktenzeichen erfasst (Backlog 221): nur Hinweis, keine Frist, kein Befund
  const theftNoRef = THEFT_HINT.test(desc || '') && !(cl && cl.police_ref);
  // Backlog 654: Meldung nennt Unfallflucht/Parkschaden, kein Aktenzeichen – Anzeige eintragen, Unfallgegner bleibt leer (nur Hinweis, keine Frist)
  const hitrunNoRef = !theftNoRef && HITRUN_HINT.test(desc || '') && !(cl && cl.police_ref);
  // Backlog 660: Meldung nennt Vandalismus/mutwillige Beschädigung, kein Aktenzeichen – Anzeige eintragen, Deckung laut Vertrag prüfen (nur Hinweis, keine Frist)
  const vandalNoRef = !theftNoRef && !hitrunNoRef && VANDAL_HINT.test(desc || '') && !(cl && cl.police_ref);
  // Backlog 669: Anprall an Brücke/Unterführung/Dach ohne Aktenzeichen – Hinweis an die Leitung (Anzeige eintragen, Forderung des Eigentümers und eigener Schaden laut Vertrag; nichts angenommen)
  const bridgeNoRef = !theftNoRef && !hitrunNoRef && !vandalNoRef && BRIDGE_HINT.test(desc || '') && !(cl && cl.police_ref);
  // Backlog 675: Personen im Laderaum ohne Aktenzeichen – Hinweis an die Leitung (Anzeige eintragen, Plane/Siegel/Ladung laut Vertrag klären; nichts angenommen)
  const stowNoRef = !theftNoRef && !hitrunNoRef && !vandalNoRef && !bridgeNoRef && STOW_HINT.test(desc || '') && !(cl && cl.police_ref);
  // Backlog 291: Glasschaden ohne Versicherungsfall – Hinweis an die Leitung, Versicherungsschutz laut Vertrag zu prüfen (nichts angenommen)
  const glassNoClaim = !cl && GLASS_HINT.test(noSticker(desc));
  // Backlog 663: Marderschaden ohne Versicherungsfall – Hinweis an die Leitung, Deckung (auch Folgeschäden) laut Vertrag prüfen (nichts angenommen)
  const martenNoClaim = !cl && MARTEN_HINT.test(desc || '');
  // Backlog 666: Unwetterschaden ohne Versicherungsfall – Hinweis an die Leitung, Deckung laut Vertrag prüfen (nichts angenommen)
  const stormNoClaim = !cl && STORM_HINT.test(desc || '');
  // Backlog 680: Eis/Schnee vom Fahrzeugdach ohne Versicherungsfall – Hinweis an die Leitung, Haftpflicht laut Vertrag klären, falls Dritte getroffen (nichts angenommen)
  const rooficeNoClaim = !cl && ROOFICE_HINT.test(desc || '');
  // Backlog 684: Ladungsschaden/Reklamation des Empfängers ohne Versicherungsfall – Hinweis an die Leitung (laut Vertrag mit Kunde/Versicherer, Ursache am Fahrzeug festhalten; nichts angenommen)
  const cargoNoClaim = !cl && CARGO_HINT.test(desc || '');
  // Backlog 687: Kennzeichen verloren/gestohlen/unleserlich – Hinweis an die Leitung (Ersatz über die Zulassungsstelle; neues Kennzeichen in den Stammdaten, das bisherige bleibt suchbar). Unabhängig vom Versicherungsfall
  const numplateHint = NUMPLATE_HINT.test(noSticker(desc));
  // Backlog 652: Fehlbetankung ohne Versicherungsfall – Hinweis an die Leitung (Fremdleistungen erfassen, Versicherungsschutz laut Vertrag prüfen; nichts angenommen)
  const fuelNoClaim = !cl && FUEL_HINT.test(desc || '');
  // Backlog 672: behördlich abgeschleppt/umgesetzt bzw. Parkkralle – Hinweis an die Leitung (Kosten als Fremdleistung mit Beleg, Schreiben unter Bußgelder; nichts angenommen)
  const towHint = TOW_HINT.test(desc || '');
  // Backlog 293: Wildunfall – Versicherer verlangt meist die Wildunfallbescheinigung (Hinweis, auch mit Versicherungsfall ohne Beleg-Datei)
  const wildHint = WILD_HINT.test(desc || '') && !(cl && cl.file_id);
  const v = (k) => (cl && cl[k] !== null && cl[k] !== undefined ? esc(String(cl[k])) : '');
  const money = (k) => (cl && cl[k] !== null && cl[k] !== undefined ? esc(decIn(cl[k])) : ''); // EN mit Punkt wie Bußgeld-Formular (19.10.2026)
  const info = cl ? `<p style="margin-top:0">${claimChip(cl.status)} ${esc(cl.insurer)}${cl.claim_no ? ` · ${esc(t('claim_no'))} ${esc(cl.claim_no)}` : ''}</p>
    <dl class="kv"><dt>${esc(t('claim_reported'))}</dt><dd>${fmtD(cl.reported_on)}${cl.days_open !== null ? ` · ${esc(tn('claim_days_open', cl.days_open))}` : ''}</dd>${cl.deductible_net !== null ? `<dt>${esc(t('claim_deductible'))}</dt><dd>${eur(cl.deductible_net)}</dd>` : ''}${cl.reimbursed_net !== null ? `<dt>${esc(t('claim_reimbursed'))}</dt><dd>${eur(cl.reimbursed_net)} · ${fmtD(cl.reimbursed_on)}</dd>` : ''}</dl>
    ${sameNo.map((x) => `<p class="small" data-claimsameno>ℹ️ ${esc(t('claim_same_no').replace('{c}', x.case_no).replace('{p}', x.plate))}</p>`).join('')}${claimAppraisalInfo(cl)}${claimOpponentInfo(cl)}${claimPoliceInfo(cl)}<p class="small muted">${esc(t('evidence'))}: ${esc(cl.evidence)}${cl.note ? ' · ' + esc(cl.note) : ''}</p>${cl.file_id && cl.file_name ? `<p class="small">📎 ${esc(t('claim_file'))}: <a href="${fileUrl(cl.file_id)}" target="_blank" rel="noopener">${esc(cl.file_name)}</a></p>` : ''}` : `<p class="muted small" style="margin-top:0">${esc(t('claim_none'))}</p>`;
  return `<section class="panel"><h3 style="margin-top:0">${esc(t('claim_title'))}</h3>${theftNoRef ? `<p class="small" id="cptheft">⚠️ ${esc(t('cp_theft_hint'))}</p>` : ''}${hitrunNoRef ? `<p class="small" data-claimhitrun>⚠️ ${esc(t('cp_hitrun_hint'))}</p>` : ''}${vandalNoRef ? `<p class="small" data-claimvandal>⚠️ ${esc(t('cp_vandal_hint'))}</p>` : ''}${bridgeNoRef ? `<p class="small" data-claimbridge>⚠️ ${esc(t('cp_bridge_hint'))}</p>` : ''}${stowNoRef ? `<p class="small" data-claimstow>⚠️ ${esc(t('cp_stow_hint'))}</p>` : ''}${glassNoClaim ? `<p class="small" data-claimglass>ℹ️ ${esc(t('claim_glass_hint').replace('{b}', t('claim_add')))}</p>` : ''}${martenNoClaim ? `<p class="small" data-claimmarten>ℹ️ ${esc(t('claim_marten_hint').replace('{b}', t('claim_add')))}</p>` : ''}${stormNoClaim ? `<p class="small" data-claimstorm>ℹ️ ${esc(t('claim_storm_hint').replace('{b}', t('claim_add')))}</p>` : ''}${cargoNoClaim ? `<p class="small" data-claimcargo>ℹ️ ${esc(t('claim_cargo_hint'))}</p>` : ''}${numplateHint ? `<p class="small" data-claimnumplate>ℹ️ ${esc(t('claim_numplate_hint').replace('{p}', t('cp_title')).replace('{e}', t('edit_master')).replace('{f}', t('former_plates')))}</p>` : ''}${rooficeNoClaim ? `<p class="small" data-claimroofice>ℹ️ ${esc(t('claim_roofice_hint').replace('{b}', t('claim_add')))}</p>` : ''}${fuelNoClaim ? `<p class="small" data-claimfuel>ℹ️ ${esc(t('claim_fuel_hint').replace('{b}', t('claim_add')))}</p>` : ''}${towHint ? `<p class="small" data-claimtow>ℹ️ ${esc(t('claim_tow_hint').replace('{f}', t('fines')))}</p>` : ''}${wildHint ? `<p class="small" data-claimwild>ℹ️ ${esc(t('claim_wild_hint'))}</p>` : ''}${noOcc ? `<p class="small" data-claimnoocc>⚠️ ${esc(t('claim_no_occ_hint').replace('{b}', t('act_set_occurred_at')))}</p>` : ''}${info}<details class="noprint"><summary>${esc(t(cl ? 'claim_edit' : 'claim_add'))}</summary><form id="clf"><input type="hidden" name="expected_updated_at" value="${cl ? esc(cl.updated_at || '') : ''}">
    <p class="small muted">${esc(t('claim_hint'))}</p>
    <label>${esc(t('claim_contract'))}</label><select name="contract_id"><option value="">${esc(t('claim_no_contract'))}</option>${contracts.map((k) => `<option value="${esc(k.id)}"${(cl ? cl.contract_id === k.id : preK === k.id) ? ' selected' : ''}>${esc(k.partner)}${k.contract_no ? ' · ' + esc(k.contract_no) : ''}${kPeriod(k)}${k.ended_on ? ` (${esc(t('cs_beendet'))})` : ''}</option>`).join('')}</select>${!cl && preK ? `<p class="small muted" data-claimprek>${esc(t('claim_contract_pre').replace('{d}', fmtD(occDay)))}</p>` : ''}
    <label>${esc(t('claim_insurer'))}<span class="hint">${esc(t('claim_insurer_hint'))}</span></label><input name="insurer" maxlength="120" value="${v('insurer')}">
    <label>${esc(t('claim_no'))}</label><input name="claim_no" maxlength="60" value="${v('claim_no')}">
    <label>${esc(t('claim_reported'))}</label><input type="date" name="reported_on" required max="${bDate()}" value="${cl ? v('reported_on') : ''}">
    <label>${esc(t('status_label'))}</label><select name="status">${CLAIM_ST.map((x) => `<option value="${x}"${(cl ? cl.status : 'gemeldet') === x ? ' selected' : ''}>${esc(t('cls_' + x))}</option>`).join('')}</select>
    <label>${esc(t('claim_deductible'))}</label><input name="deductible_net" inputmode="decimal" value="${money('deductible_net')}">
    <label>${esc(t('claim_reimbursed'))}</label><input name="reimbursed_net" inputmode="decimal" value="${money('reimbursed_net')}">
    <label>${esc(t('claim_reimbursed_on'))}</label><input type="date" name="reimbursed_on" max="${bDate()}" value="${v('reimbursed_on')}">
    <label>${esc(t('evidence'))}</label><input name="evidence" required maxlength="300" value="${v('evidence')}"><label>${esc(t('note'))}</label><input name="note" maxlength="1000" value="${v('note')}">
    <fieldset class="panel" style="margin:.6rem 0"><legend>${esc(t('ca_title'))}</legend><p class="small muted" style="margin-top:0">${esc(t('ca_hint'))}</p>
    <label>${esc(t('ca_appraiser'))}</label><input name="appraiser" maxlength="120" value="${v('appraiser')}">
    <label>${esc(t('ca_on'))}<span class="hint">${esc(t('ca_on_hint'))}</span></label><input type="date" name="appraisal_on" max="${bDate(366)}" value="${v('appraisal_on')}">
    <label>${esc(t('ca_received'))}</label><input type="date" name="appraisal_received_on" max="${bDate()}" value="${v('appraisal_received_on')}">
    <label>${esc(t('ca_net'))}<span class="hint">${esc(t('ca_net_hint'))}</span></label><input name="appraisal_net" inputmode="decimal" value="${money('appraisal_net')}"></fieldset>
    <fieldset class="panel" style="margin:.6rem 0"><legend>${esc(t('co_title'))}</legend><p class="small muted" style="margin-top:0">${esc(t('co_hint'))}</p>
    <label>${esc(t('co_plate'))}</label><input name="opponent_plate" maxlength="20" value="${v('opponent_plate')}">
    <label>${esc(t('co_insurer'))}</label><input name="opponent_insurer" maxlength="120" value="${v('opponent_insurer')}">
    <label>${esc(t('co_claim_no'))}</label><input name="opponent_claim_no" maxlength="60" value="${v('opponent_claim_no')}"></fieldset>
    <fieldset class="panel" style="margin:.6rem 0"><legend>${esc(t('cp_title'))}</legend><p class="small muted" style="margin-top:0">${esc(t('cp_hint'))}</p>${cpPull.map((x, i) => `<button type="button" class="btn secondary" data-cppull="${i}" data-st="${esc(x.police_station || '')}" data-ref="${esc(x.police_ref || '')}" data-on="${esc(x.police_reported_on || '')}">${esc(t('cp_pull').replace('{c}', `${x.case_no} (${x.plate})`))}</button>`).join(' ')}
    <label>${esc(t('cp_station'))}</label><input name="police_station" maxlength="120" value="${v('police_station')}">
    <label>${esc(t('cp_ref'))}</label><input name="police_ref" maxlength="60" value="${v('police_ref')}">
    <label>${esc(t('cp_on'))}</label><input type="date" name="police_reported_on" max="${bDate()}" value="${v('police_reported_on')}"></fieldset>
    <label>${esc(t('claim_file'))}<span class="hint">${esc(t('claim_file_hint'))}</span></label><select name="file_id"><option value="">–</option>${files.map((f) => `<option value="${esc(f.id)}"${cl && cl.file_id === f.id ? ' selected' : ''}>${esc(f.filename)}</option>`).join('')}${cl && cl.file_id && cl.file_name && !files.some((f) => f.id === cl.file_id) ? `<option value="${esc(cl.file_id)}" selected>${esc(cl.file_name)}</option>` : ''}</select>
    <div class="actions"><button class="btn secondary">${esc(t('save'))}</button></div></form></details></section>`;
}
async function viewClaims(...a) { return (await lazyModule('verwaltung')).viewClaims(...a); }

// Verlauf der Auslesungen (Fahrerakte, Fahrzeugakte): stornierte durchgestrichen mit Begründung; Leitung kann stornieren (18.10.2026)
const tachoHistList = (list, canCancel) => `<ul class="small tachohist">${list.map((o) => `<li${o.cancelled_at ? ' class="muted"' : ''}>${o.cancelled_at ? '<s>' : ''}${fmtD(o.downloaded_on)} · ${esc(o.evidence)}${o.note ? ' – ' + esc(o.note === 'Import' ? t('odo_src_import') : o.note) : ''}${o.cancelled_at ? '</s>' : ''}${o.created_by_name ? ` <span class="muted">(${esc(o.created_by_name)})</span>` : ''}${o.cancelled_at ? ` <span class="chip">${esc(t('tacho_cancelled'))}</span> ${esc(o.cancel_reason || '')}` : canCancel ? ` <button type="button" class="btn secondary small" data-tcancel="${esc(o.id)}">${esc(t('tacho_cancel'))}</button>` : ''}</li>`).join('')}</ul>${canCancel && list.some((o) => !o.cancelled_at) ? `<p class="small muted noprint">${esc(t('tacho_cancel_hint'))}</p>` : ''}`;
const bindTachoCancel = (root, reload) => $$('[data-tcancel]', root).forEach((b) => (b.onclick = async () => { const reason = prompt(t('tacho_cancel_reason')); if (!reason) return; try { await api('POST', `/api/tacho/downloads/${b.dataset.tcancel}/cancel`, { reason }); toast('✓'); reload(); } catch (err) { toast(err.message, true); } }));

// Werkstatt „EXTERN“ hat einen festen deutschen Namen aus dem Schema – in der App-Sprache anzeigen (22.10.2026, Fund Druck UK/EN)
const wsLabel = (w) => (w && w.code === 'EXTERN' ? t('ws_extern') : (w && w.name) || '') + (w && w.active === false ? ` (${t('ws_closed')})` : '');
// alle Werkstätten inkl. geschlossener (Namen, Filter) – Auswahl für Neues bleibt S.meta.workshops (nur aktive), Backlog 192
const wsFilterOk = () => S.me && ['owner', 'fleet', 'dispatch', 'viewer'].includes(S.me.role);
const wsAll = () => (S.meta && (S.meta.workshops_all || S.meta.workshops)) || [];
const wsName = (code) => wsLabel(wsAll().find((w) => w.code === code)) || code || '–';
// Lieferant einer Lagerentnahme wird als „Lager <Werkstattcode>“ gespeichert (src/cases.js) – Anzeige mit Werkstattnamen in der App-Sprache (19.10.2026)
const supplierLabel = (x) => { const m = /^Lager (\S+)$/.exec(String(x || '')); return m && wsAll().some((w) => w.code === m[1]) ? t('part_from_stock').replace('{ws}', wsName(m[1])) : x; };
const checkLabel = (k) => (CHECK_LABELS[S.lang] || CHECK_LABELS.de)[k] || k;
// Vorgangstext: aus Kontrollen erzeugte Vorgänge zeigen den Prüfpunkt in der Oberflächensprache statt des Schlüssels
// … und Aufträge aus Prüftermin/Prüfmangel/Rückruf/Winterreifen mit Rahmen, Prüfart und Prüfergebnis in der Oberflächensprache (Freitexte unverändert)
const cDesc = (s) => caseDescText(s, S.lang, { kind: mk, res: (c) => (c ? t('res_' + c) : null) });
// Sprache eines Freitexts (Meldung, Verlaufsvermerk) für lang= (Backlog 228, 24.10.2026): ein ukrainisch diktierter Text in der deutschen
// Oberfläche wurde vom Screenreader mit deutscher Stimme gelesen und von der Browser-Übersetzung als Deutsch behandelt.
// Mehr kyrillische als lateinische Buchstaben → „uk“ (nur ы/э/ъ/ё ohne і/ї/є/ґ → „ru“); lateinischer Text in der ukrainischen Oberfläche → lang="" (unbestimmt,
// Deutsch/Englisch nicht sicher unterscheidbar). Entspricht die Sprache der Oberfläche: kein Attribut.
const freeLang = (s) => {
  const x = String(s || ''); const cy = (x.match(/[Ѐ-ӿ]/g) || []).length; const la = (x.match(/[a-zäöüß]/gi) || []).length;
  if (!cy && !la) return null;
  const l = cy > la ? (/[ыэъё]/i.test(x) && !/[іїєґ]/i.test(x) ? 'ru' : 'uk') : (S.lang === 'uk' ? '' : S.lang);
  return l === S.lang ? null : l;
};
const langAttr = (s) => { const l = freeLang(s); return l === null ? '' : ` lang="${l}"`; };
// Freitext escapen und – nur wenn er nicht in der Oberflächensprache steht – in <span lang> einschließen
const ltxt = (s) => { const a = langAttr(s); return a ? `<span${a}>${esc(s)}</span>` : esc(s); };

// Bilder vor dem Hochladen verkleinern (max. 1600 px, JPEG) – spart Datenvolumen unterwegs
// Mehr als 10 Fotos gewählt: nur die ersten 10 werden angehängt (Server-Grenze je Vorgang) – sofort sichtbar sagen statt still weglassen
const PHOTO_MAX = 10;
function photoLimitWatch(input) {
  if (!input) return;
  const note = document.createElement('p'); note.className = 'panel warn small'; note.setAttribute('role', 'status'); note.hidden = true; note.dataset.photomax = '';
  input.insertAdjacentElement('afterend', note);
  input.onchange = () => {
    const n = (input.files || []).length;
    note.hidden = n <= PHOTO_MAX;
    note.textContent = n > PHOTO_MAX ? t('photos_over_max').replace('{n}', n).replace('{max}', PHOTO_MAX) : '';
  };
}
// Backlog 603: wie der Server (src/cases.js MAX_FILE_BYTES, erlaubte Typen) – Ablehnung schon im Browser, mit Hinweis bei HEIC/HEIF
const UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
function uploadReject(blob, name = '') {
  const tp = String(blob.type || '').toLowerCase();
  if (/heic|heif/.test(tp) || /\.(heic|heif)$/i.test(name) && !UPLOAD_TYPES.includes(tp)) return t('file_heic_hint');
  if (tp && !UPLOAD_TYPES.includes(tp)) return t('err_type');
  if (blob.size > UPLOAD_MAX_BYTES) return t('err_too_large');
  return '';
}
async function prepareUpload(file) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const cv = document.createElement('canvas');
    cv.width = Math.round(bmp.width * scale); cv.height = Math.round(bmp.height * scale);
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
    return await new Promise((res) => cv.toBlob((b) => res(b || file), 'image/jpeg', 0.82));
  } catch { return file; }
}

// Ablehnen als Dublette: alle offenen Vorgänge desselben Fahrzeugs (neueste Meldung zuerst, ohne diesen und ohne Dubletten) –
// Auswahl bleibt erhalten; schlägt das Nachladen fehl, bleiben die 5 neuesten mit Hinweis auf die Fahrzeugakte
async function loadDupOptions(c) {
  const hint = () => $('#dupmore');
  try {
    const r = await api('GET', `/api/cases?vehicle_id=${encodeURIComponent(c.vehicle_id)}&status=open&sort=oldest&limit=500`);
    const sel = $('#dupsel'); if (!sel || !hint()) return;
    const list = (r.cases || []).filter((o) => o.id !== c.id && !o.duplicate_of).reverse();
    const keep = sel.value;
    sel.innerHTML = `<option value="">${esc(t('dup_none'))}</option>${list.map((o) => `<option value="${esc(o.id)}">${esc(o.case_no)} · ${esc(t('st_' + o.status))}</option>`).join('')}`;
    if (list.some((o) => o.id === keep)) sel.value = keep;
    hint().textContent = r.truncated ? t('dup_more_fail') : tn('dup_all', list.length);
  } catch { if (hint()) hint().textContent = t('dup_more_fail'); }
}

// Beleg einer Fremdleistung (Backlog 224): Auswahl aus den Dateien dieses Vorgangs, Link in der Kostenliste und bei der Kostenfreigabe
const extFileLink = (x) => (x.file_id && x.file_name ? `<br><span class="small" data-extfile>📎 ${esc(t('ext_file'))}: <a href="${fileUrl(x.file_id)}" target="_blank" rel="noopener">${esc(x.file_name)}</a></span>` : '');
// Foto/PDF zur Restarbeit (Backlog 261): Auswahl aus den Dateien des Vorgangs (vorher hochladen), neueste zuerst
const oiFileLink = (o, d) => { const f = o.file_id && ((d && d.files) || []).find((x) => x.id === o.file_id); return f ? `<br><span class="small" data-oifile>📎 <a href="${fileUrl(f.id)}" target="_blank" rel="noopener">${esc(f.content_type === 'application/pdf' ? 'PDF' : t('ext_photo'))} · ${esc(f.filename)}</a></span>` : ''; };
function oiFileSelect(d) {
  const files = (d && d.files) || [];
  if (!files.length) return `<p class="small muted" id="oifile-none">${esc(t('oi_file_none'))}</p>`;
  return `<label for="oifile">${esc(t('oi_file'))}<span class="hint">${esc(t('oi_file_hint'))}</span></label><select id="oifile" name="file_id"><option value="">–</option>${files.slice().reverse().map((f) => `<option value="${esc(f.id)}">${esc(f.content_type === 'application/pdf' ? 'PDF' : t('ext_photo'))} · ${esc(f.filename)} · ${fmtDT(f.created_at)}</option>`).join('')}</select>`;
}
// Foto/PDF zum Teil (Backlog 426): Typenschild/Teilenummer – Datei dieses Vorgangs, vorher unter „Fotos & Dokumente“ hochgeladen
function partFileSelect(d) {
  const files = (d && d.files) || [];
  if (!files.length) return `<p class="small muted" id="partfile-none">${esc(t('pt_file_none'))}</p>`;
  return `<label for="partfile">${esc(t('pt_file'))}<span class="hint">${esc(t('oi_file_hint'))}</span></label><select id="partfile" name="file_id"><option value="">–</option>${files.slice().reverse().map((f) => `<option value="${esc(f.id)}">${esc(f.content_type === 'application/pdf' ? 'PDF' : t('ext_photo'))} · ${esc(f.filename)} · ${fmtDT(f.created_at)}</option>`).join('')}</select>`;
}
const partFileLink = (p, d) => { const f = p.file_id && ((d && d.files) || []).find((x) => x.id === p.file_id); return f ? `<br><span class="small" data-partfile>📎 <a href="${fileUrl(f.id)}" target="_blank" rel="noopener">${esc(f.content_type === 'application/pdf' ? 'PDF' : t('ext_photo'))} · ${esc(f.filename)}</a></span>` : ''; };
function extFileSelect(d) {
  const files = (d && d.files) || [];
  if (!files.length) return `<p class="small muted" id="extfile-none">${esc(t('ext_file_none'))}</p>`;
  return `<label for="extfile">${esc(t('ext_file'))}<span class="hint">${esc(t('ext_file_hint'))}</span></label><select id="extfile" name="file_id"><option value="">–</option>${files.slice().reverse().map((f) => `<option value="${esc(f.id)}">${esc(f.content_type === 'application/pdf' ? 'PDF' : t('ext_photo'))} · ${esc(f.filename)} · ${fmtDT(f.created_at)}</option>`).join('')}</select>`;
}
function extDocList(d) {
  const xs = ((d && d.external_costs) || []).filter((x) => x.file_id && x.file_name);
  if (!xs.length) return '';
  return `<div id="extdocs"><p class="small" style="margin-bottom:2px"><strong>${esc(t('ext_docs'))}</strong></p><ul class="small" style="margin-top:0">${xs.map((x) => `<li>${esc(x.supplier)}${x.amount_net === null ? '' : ' · ' + eur(x.amount_net) + (x.valuation === 'estimate' ? ' (' + esc(t('estimate')) + ')' : '')}: <a href="${fileUrl(x.file_id)}" target="_blank" rel="noopener">${esc(x.file_name)}</a></li>`).join('')}</ul></div>`;
}
const LOST_LABELS = { hours: 'hours', description: 'activity', work_date: 'date', name: 'part_name', part_number: 'part_number', quantity: 'qty', unit_price_net: 'price_net', supplier: 'supplier', invoice_no: 'invoice_no', amount_net: 'amount_net', parts_expected_date: 'parts_eta', planned_date: 'planned', followup_on: 'followup', priority: 'new_priority', workshop_site: 'workshop' };
function showLostInputs(c) {
  const la = S.lostAct; const box = $('#actform'); if (!la || !box) return;
  const rows = Object.entries(la.payload || {}).filter(([k, v]) => v !== null && v !== '' && typeof v !== 'object' && typeof v !== 'boolean' && !/^(confirm|command|stock_item_id|file_id)/.test(k)).map(([k, v]) => [t(LOST_LABELS[k] || k), /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? fmtD(String(v)) : String(v)]);
  if (la.note) rows.push([t('note'), la.note]);
  box.innerHTML = `<div class="panel warn" id="lostact" role="alert"><h3>${esc(t('act_' + la.action))}</h3><p>${esc(t('case_conflict_lost').replace('{st}', t('st_' + c.status)))}</p>${rows.length ? `<dl class="kv">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd style="white-space:pre-wrap;user-select:text">${esc(v)}</dd>`).join('')}</dl>` : ''}<div class="actions"><button type="button" class="btn secondary" id="lostok">${esc(t('case_conflict_dismiss'))}</button></div></div>`;
  $('#lostok').onclick = () => { S.lostAct = null; S.openAct = null; actDraft(c.id).clear(); box.innerHTML = ''; };
}

function actionForm(action, c, cmd, preset = {}, d = null, { restore = false } = {}) {
  const box = $('#actform');
  S.openAct = { caseId: c.id, action, preset };
  const f = [];
  const needsNote = ['change_priority', 'set_safety_lock', 'lift_safety_lock', 'approve_repair', 'reassign_workshop', 'correct_vehicle', 'reject', 'withdraw_order', 'wait_parts', 'parts_partial', 'resolve_open_item', 'request_quality_check', 'return_for_rework', 'technical_release', 'approve_costs', 'quality_release'];
  const qrel = action === 'quality_release'; // Backlog 629: beide Schritte in einem Formular
  const isQc = action === 'request_quality_check' || qrel; const isRel = action === 'technical_release' || qrel;
  const wsOpts = S.meta.workshops.map((w) => `<option value="${esc(w.code)}"${(c.workshop_site || c.suggested_workshop_site) === w.code ? ' selected' : ''}>${esc(wsLabel(w))}</option>`).join('');
  const prioOpts = (sel) => ['niedrig', 'mittel', 'kritisch'].map((p) => `<option value="${p}"${p === sel ? ' selected' : ''}>${esc(t('prio_' + p))}</option>`).join('');
  switch (action) {
    case 'change_priority': f.push(`<label>${esc(t('new_priority'))}</label><select name="priority">${prioOpts(c.priority)}</select>`); break;
    case 'approve_repair': f.push(`<label>${esc(t('workshop'))}</label><select name="workshop_site">${wsOpts}</select><label>${esc(t('urgency'))}</label><select name="priority">${prioOpts(c.priority)}</select><label>${esc(t('planned'))}</label><input type="date" name="planned_date">`); break;
    // Backlog 513/514: ohne die bisherige Werkstatt (Server lehnt „unverändert“ ab, wie im Werkstattplan) und Hinweis, dass Termin/Übernahme entfallen
    case 'reassign_workshop': f.push(`<label>${esc(t('workshop'))}</label><select name="workshop_site" required><option value="">${esc(t('rws_choose'))}</option>${S.meta.workshops.filter((w) => w.code !== c.workshop_site).map((w) => `<option value="${esc(w.code)}">${esc(wsLabel(w))}</option>`).join('')}</select>${rwsDrop(c)}`); break;
    // Meldung am falschen Fahrzeug (Backlog 254): Auswahl wird nachgeladen (aktive Fahrzeuge ohne das bisherige)
    case 'correct_vehicle': f.push(`<p class="small muted" id="cvhint">${esc(t(c.origin === 'kontrolle' && c.check_item ? 'cv_hint_insp' : 'cv_hint'))}${c.safety_lock ? ' ' + esc(t('cv_hint_lock')) : ''}</p><label for="cvveh">${esc(t('cv_new_vehicle'))}</label><select id="cvveh" name="vehicle_id" required><option value="">${esc(t('loading'))}</option></select>`); break;
    case 'reject': {
      // Kurzinfo liefert nur die 5 neuesten anderen offenen Vorgänge; gibt es mehr, wird die vollständige Liste nachgeladen (unten)
      const vi = (d && d.vehicle_info) || {}; const oc = vi.other_open_cases || []; const more = Math.max(0, (vi.other_open_total || 0) - oc.length);
      if (oc.length) f.push(`<label for="dupsel">${esc(t('dup_select'))}<span class="hint">${esc(t('dup_hint'))}</span></label><select id="dupsel" name="duplicate_of"><option value="">${esc(t('dup_none'))}</option>${oc.map((o) => `<option value="${esc(o.id)}">${esc(o.case_no)} · ${esc(t('st_' + o.status))}</option>`).join('')}</select>${more ? `<p class="small muted" id="dupmore">${esc(tn('dup_loading', more))}</p>` : ''}`);
      // Backlog 437: Dublette nur zum selben Fahrzeug – bei Meldung am anderen Gespannteil zuerst das Fahrzeug korrigieren
      f.push(`<p class="small muted" data-dupcoupled>${esc(t('dup_coupled_hint').replace('{a}', t('act_correct_vehicle')))}</p>`);
      break;
    }
    case 'approve_costs': f.push(`<p class="small muted">${esc(t('cost_approve_hint'))}</p>${extDocList(d)}`); break;
    case 'acknowledge': f.push(`<label>${esc(t('planned'))}</label><input type="date" name="planned_date">`); break;
    case 'wait_parts': f.push(`<label>${esc(t('parts_eta'))}<span class="hint">${esc(t('parts_eta_hint'))}</span></label><input type="date" name="parts_expected_date" min="${bDate()}">`); break;
    case 'parts_partial': { const cur = c.parts_expected_date || ''; const mn = cur && cur < bDate() ? cur : bDate();
      f.push(`<p class="small muted" id="pphint">${esc(t('pp_hint'))}</p><label for="ppeta">${esc(t('pp_eta'))}<span class="hint">${esc(t('pp_eta_hint'))}</span></label><input type="date" id="ppeta" name="parts_expected_date" min="${esc(mn)}" value="${esc(cur)}">`); break; }
    case 'set_parts_eta': f.push(`<label>${esc(t('parts_eta'))}<span class="hint">${esc(t('parts_eta_hint'))} (${esc(t('planned_clear_hint'))})</span></label><input type="date" name="parts_expected_date" min="${bDate()}" value="${esc(c.parts_expected_date || '')}">`); break;
    case 'set_followup': f.push(`<p class="small muted">${esc(t('followup_hint'))}</p><label>${esc(t('followup'))}<span class="hint">${esc(t('planned_clear_hint'))}</span></label><input type="date" name="followup_on" min="${c.followup_on && c.followup_on < bDate() ? esc(c.followup_on) : bDate()}" value="${esc(c.followup_on || '')}">`); break;
    case 'set_vehicle_location': f.push(`<p class="small muted" id="vlhint">${esc(t('vl_hint'))}</p><label>${esc(t('vl_title'))}<span class="hint">${esc(t('vl_location_hint'))}</span></label><input name="vehicle_location" maxlength="300" autocomplete="off" value="${esc(c.vehicle_location || '')}"${c.location_note && !c.vehicle_location ? ` placeholder="${esc(clipTxt(c.location_note, 80))}"` : ''}>${c.location_note ? `<p class="small muted" data-vlreported>${esc(t('location_shown'))}: ${esc(c.location_note)}</p>` : ''}<label>${esc(t('vl_service'))}</label><input name="tow_service" maxlength="120" autocomplete="off" value="${esc(c.tow_service || '')}"><label>${esc(t('vl_on'))}</label><input type="date" name="towed_on" max="${bDate()}" value="${esc(c.towed_on || '')}"><p class="small muted">${esc(t('vl_clear_hint'))}</p>`); break;
    case 'set_handover': f.push(`<p class="small muted" id="hohint">${esc(t('ho_hint'))}</p><label for="ho_keys">${esc(t('ho_keys'))}</label><select id="ho_keys" name="keys">${['', 'da', 'fehlt'].map((v) => `<option value="${v}"${(c.handover_keys || '') === v ? ' selected' : ''}>${esc(t(v ? 'ho_' + v : 'ho_none'))}</option>`).join('')}</select><label for="ho_papers">${esc(t('ho_papers'))}</label><select id="ho_papers" name="papers">${['', 'da', 'fehlt'].map((v) => `<option value="${v}"${(c.handover_papers || '') === v ? ' selected' : ''}>${esc(t(v ? 'ho_' + v : 'ho_none'))}</option>`).join('')}</select>`); break;
    case 'set_occurred_at': f.push(`<p class="small muted">${esc(t('occ_set_hint'))}</p>${occurredFields(c.occurred_at, true)}`); break;
    case 'set_planned_date': f.push(`<label>${esc(t('planned'))}<span class="hint">${esc(t('planned_clear_hint'))}</span></label><input type="date" name="planned_date" value="${esc(c.planned_date || '')}"><label for="plnote">${esc(t('plan_note_lbl'))}<span class="hint">${esc(t('plan_note_hint'))}</span></label><input id="plnote" name="planned_note" maxlength="200" autocomplete="off" value="${esc(c.planned_note || '')}">`); break;
    case 'record_work': f.push(`<label>${esc(t('hours'))}</label><input name="hours" inputmode="decimal" required><label>${esc(t('activity'))}</label><input name="description" required list="worksugg" autocomplete="off"><datalist id="worksugg"></datalist><label>${esc(t('date'))}</label><input type="date" name="work_date" value="${bDate()}" max="${bDate()}" min="${workDateMin(c.created_at)}"><p class="small muted" id="workday" data-workday aria-live="polite"></p><details id="wdweek" class="small"><summary>${esc(t('wd_week'))}</summary><div id="wdweekb"></div></details>`); break;
    case 'add_part': f.push(`<div id="stocksel"></div><div id="freepart">`); f.push(`<label>${esc(t('part_name'))}</label><input name="name" required list="partsugg" autocomplete="off"><datalist id="partsugg"></datalist><label>${esc(t('part_number'))}</label><input name="part_number"><label>${esc(t('qty'))}</label><input name="quantity" inputmode="decimal" value="1"><label>${esc(t('price_net'))}</label><input name="unit_price_net" inputmode="decimal"><label class="check"><input type="checkbox" name="estimate"> ${esc(t('estimate'))}</label><label>${esc(t('supplier'))}<span class="hint" data-psuphint>${esc(t('part_supplier_hint'))}</span></label><input name="supplier" maxlength="120"></div><label>${esc(t('warranty_until'))}<span class="hint">${esc(t('warranty_hint'))}</span></label><input type="date" name="warranty_until" style="max-width:220px">${partFileSelect(d)}`); break;
    case 'add_open_item': f.push(`<label>${esc(t('open_items'))}</label><input name="description" required><label class="check"><input type="checkbox" name="safety_relevant"> ${esc(t('safety_relevant'))}</label>${oiFileSelect(d)}`); break;
    case 'add_external_cost': f.push(`<label>${esc(t('supplier'))}</label><input name="supplier" required><label>${esc(t('invoice_no'))}</label><input name="invoice_no"><label>${esc(t('amount_net'))}<span class="hint">${esc(t('ext_amount_hint'))}</span></label><input name="amount_net" inputmode="decimal"><label class="check"><input type="checkbox" name="estimate"> ${esc(t('estimate'))}</label><label class="check"><input type="checkbox" name="covers_work_and_parts"> ${esc(t('covers_all'))}</label><label>${esc(t('warranty_until'))}<span class="hint">${esc(t('warranty_hint'))}</span></label><input type="date" name="warranty_until" style="max-width:220px">${extFileSelect(d)}`); break;
  }
  // Backlog 395 (Blickwinkel „Getriebetausch – Fahrtenschreiber“): Arbeiten/Teile/Fremdleistungen/Beschreibung nennen Getriebe, Tachogeber oder
  // Fahrtenschreiber → Hinweis § 57b StVZO vor Abschlusskontrolle/Freigabe (reine Information, keine Frist, kein Prüftermin angelegt)
  if (qrel) f.push(`<p class="panel small" id="qrelhint">${esc(t('qrel_hint').replace('{a}', t('act_request_quality_check')).replace('{b}', t('act_technical_release')))}</p>`);
  if ((isQc || isRel) && d && TACHO_WORK.test([c.description, ...(d.parts || []).map((x) => x.name), ...(d.work || []).map((x) => x.description), ...(d.external_costs || []).map((x) => `${x.supplier || ''} ${x.note || ''}`)].join(' | '))) f.push(`<p class="panel small" data-tachowork>${esc(t('tacho_work_hint'))}</p>`);
  // Winterreifen-Auftrag: Lage noch nicht erfüllt → Hinweis + ausdrückliche Bestätigung (Server verlangt sie ebenfalls)
  if (isQc && d && d.tire_winter && !['erfuellt', 'nicht_pflichtig'].includes(d.tire_winter.status)) f.push(`<p class="panel small" id="wqopen">${esc(t('wq_open_hint'))}</p><label class="check"><input type="checkbox" name="confirm_winter_open" required> ${esc(t('wq_open_confirm'))}</label>`);
  // Nacharbeit nach der letzten Kontrolle nach Reparatur → neue Kontrolle nötig (Server prüft ebenso); offene Kostenfreigabe sperrt die Freigabe
  if (isQc && d && Array.isArray(d.inspections) && Array.isArray(d.events)) {
    const li = d.inspections.filter((i) => i.kind === 'nach_reparatur').map((i) => i.created_at).sort().pop();
    const rw = d.events.filter((e) => e.action === 'return_for_rework').map((e) => e.created_at).sort().pop();
    if (li && rw && li <= rw) f.push(`<p class="panel warn small" id="rwinsp">${esc(t('err_inspection_after_rework_missing'))}</p>`);
  }
  // Backlog 424: Schlüssel/Fahrzeugschein noch als „fehlt“ eingetragen – freigegebenes Fahrzeug stünde ohne Schlüssel da (kein Server-Stopp, nur Hinweis)
  if ((isQc || isRel) && hoMissing(c).length) f.push(`<p class="panel warn small" id="relho">${esc(t('ho_release_warn').replace('{x}', hoMissing(c).join(', ')))}</p>`);
  if (isQc || isRel) {
    // Backlog 629: ohne Abholvermerk mit dem eingetragenen Standort vorbelegen (externe Werkstatt – Fahrzeug steht dort)
    const puPre = !c.pickup_note && qrel && c.vehicle_location ? c.vehicle_location.slice(0, 300) : '';
    f.push(`<label for="pu_note">${esc(t('pu_title'))}<span class="hint">${esc(t('pu_hint'))}</span></label><textarea id="pu_note" name="pickup_note" maxlength="300" rows="2">${esc(c.pickup_note || puPre)}</textarea>${puPre ? `<p class="small muted" id="qrelpu">${esc(t('qrel_pu_prefill'))}</p>` : ''}`);
    if (isRel) f.push(`<label class="check"><input type="checkbox" name="pickup_for_driver" id="pu_drv"> ${esc(t('pu_for_driver'))}</label><div id="pu_until_box" hidden><label for="pu_until">${esc(t('pu_valid_until'))}<span class="hint">${esc(t('pu_valid_until_hint'))}</span></label><input type="date" id="pu_until" name="pickup_valid_until" min="${esc(bDate())}"></div>`);
  }
  if (isRel && c.cost_over_limit_at) f.push(`<p class="panel warn small" id="relcost">${esc(t('err_cost_approval_open'))}</p>`);
  // 21.10.2026: Server weist in diesen Zuständen immer ab – Hinweis vor dem Absenden (wie Kostenfreigabe)
  if (action === 'reject' && c.safety_lock) f.push(`<p class="panel warn small" id="rejlock">${esc(t('err_safety_lock_active'))}</p>`);
  if (action === 'withdraw_order') {
    f.push(`<p class="small muted" id="wdhint">${esc(t('withdraw_hint'))}</p>`);
    if (c.safety_lock) f.push(`<p class="panel warn small" id="wdlock">${esc(t('err_withdraw_locked'))}</p>`);
    const oi = d && Array.isArray(d.open_items) ? d.open_items.filter((o) => o.status === 'offen') : [];
    if (oi.some((o) => o.safety_relevant)) f.push(`<p class="panel warn small" id="wdsafety">${esc(t('err_safety_items_open'))}</p>`);
    else if (oi.length) f.push(`<p class="small" id="wdleft">${esc(t('withdraw_left').replace('{n}', oi.length))}</p>`);
  }
  if ((isRel || action === 'lift_safety_lock') && d && Array.isArray(d.open_items) && d.open_items.some((o) => o.status === 'offen' && o.safety_relevant)) f.push(`<p class="panel warn small" id="relsafety">${esc(t('err_safety_items_open'))}</p>`);
  if (isRel || action === 'lift_safety_lock') f.push(`<label class="check"><input type="checkbox" name="confirm" required> ${esc(t('confirm'))}</label>`);
  const noteLabel = action === 'parts_partial' ? t('pp_note') : action === 'approve_repair' ? t('scope') : isRel ? t('evidence') : needsNote.includes(action) ? t('reason') : t('note');
  f.push(`<label>${esc(noteLabel)}${action === 'set_parts_eta' ? `<span class="hint">${esc(t('parts_eta_note_hint'))}</span>` : action === 'parts_partial' ? `<span class="hint">${esc(t('pp_note_hint'))}</span>` : ''}</label><textarea name="note"${needsNote.includes(action) ? ' required minlength="3"' : ''}${['set_followup', 'set_handover'].includes(action) ? ' maxlength="300"' : ''}>${action === 'set_followup' ? esc(c.followup_note || '') : ''}</textarea>`);
  if (action === 'add_part') api('GET', '/api/part-suggestions').then((r) => {
    const dl = $('#partsugg'); if (!dl) return;
    dl.innerHTML = r.suggestions.map((x) => `<option value="${esc(x.name)}">${esc(x.part_number || '')}</option>`).join('');
    const nm = $('#af input[name=name]'); const pn = $('#af input[name=part_number]');
    if (nm && pn) nm.addEventListener('change', () => { const hit = r.suggestions.find((x) => x.name === nm.value); if (hit && hit.part_number && !pn.value) pn.value = hit.part_number; });
  }).catch(() => {});
  if (action === 'record_work') api('GET', '/api/work-suggestions').then((r) => { const dl = $('#worksugg'); if (dl) dl.innerHTML = r.suggestions.map((x) => `<option value="${esc(x)}">`).join(''); }).catch(() => {});
  // Backlog 451 (Blickwinkel „Mechaniker bucht Arbeitszeit auf den falschen Auftrag“): Buchungen lassen sich (noch) nicht ändern – Auftrag und
  // Fahrzeug stehen deshalb direkt im Formular (am Tablet ist der Kopf des Vorgangs nach dem Öffnen des Formulars weggescrollt)
  const bkFor = ['record_work', 'add_part', 'add_external_cost'].includes(action) ? `<p class="panel small" id="afcase"><b>${esc(t('bk_for'))}: ${esc(c.case_no || '')} · ${esc((d && d.vehicle && d.vehicle.plate) || c.plate || '')}</b>${c.description ? `<br><span class="muted">${ltxt(clipTxt(c.description, 80))}</span>` : ''}<br><span class="muted">${esc(t('bk_check'))}</span></p>` : '';
  box.innerHTML = `<form class="panel" id="af"><h3>${esc(t('act_' + action))}</h3>${bkFor}${f.join('')}<div class="actions"><button class="btn">${esc(t('save'))}</button><button type="button" class="btn secondary" id="ac">${esc(t('cancel'))}</button></div></form>`;
  if (!restore) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  // Tastatur/Screenreader: Fokus ins Formular, „Abbrechen“ gibt ihn an den auslösenden Knopf zurück (21.10.2026: blieb auf dem Knopf bzw. fiel auf body)
  if (!restore) { const h3 = box.querySelector('#af h3'); if (h3) { h3.tabIndex = -1; h3.focus({ preventScroll: true }); } } // Überschrift statt Feld: keine Bildschirmtastatur am Tablet
  $('#ac').onclick = () => { box.innerHTML = ''; S.openAct = null; actDraft(c.id).clear(); const ab = document.querySelector(`button[data-act="${action}"]`); if (ab) ab.focus(); };
  // Wiedervorlage: ein inzwischen vergangenes Datum bleibt nur unverändert zulässig – nach einer Änderung gilt „ab heute“ wie am Server
  // (vorher bot das Feld alle Tage ab dem alten Datum an, der Server wies sie mit „liegt in der Vergangenheit“ ab, 21.10.2026)
  if ($('#pu_drv')) $('#pu_drv').onchange = () => { $('#pu_until_box').hidden = !$('#pu_drv').checked; };
  if (action === 'set_followup') { const fi = $('#af input[name=followup_on]'); if (fi) fi.onchange = () => { fi.min = fi.value === (c.followup_on || '') ? fi.min : bDate(); }; }
  if (action === 'reject' && $('#dupmore')) loadDupOptions(c);
  if (action === 'correct_vehicle') api('GET', '/api/vehicles').then((r) => {
    const sel = $('#cvveh'); if (!sel) return;
    const vs = (r.vehicles || []).filter((v) => v.active !== 0 && v.id !== c.vehicle_id).sort((x, y) => plateCmp(x.plate, y.plate));
    sel.innerHTML = `<option value="">${esc(t('cv_choose'))}</option>` + vs.map((v) => `<option value="${esc(v.id)}">${esc(v.plate)}${v.kind === 'anhaenger' ? ' · ' + esc(t('trailer')) : ''}${v.site ? ' · ' + esc(v.site) : ''}</option>`).join('');
  }).catch(() => {});
  // Gibt es für diese Aktion schon einen Entwurf (nach Netzabbruch), halten weitere Eingaben ihn aktuell (Backlog 187)
  const afUpd = (e) => { if (!e.isTrusted) return; const x = actDraft(c.id).load(); if (x && x.action === action) actDraftSave(c.id, action); };
  $('#af').addEventListener('input', afUpd); $('#af').addEventListener('change', afUpd);
  const stockP = action === 'add_part' ? loadStockSelect(c) : null; // Promise erst am Ende zurückgeben – die Handler unten müssen gesetzt werden
  if ($('#dupsel')) $('#dupsel').onchange = () => { const ta = $('#af textarea[name=note]'); const o = $('#dupsel').selectedOptions[0]; if (ta && !ta.value && $('#dupsel').value) ta.value = `${t('dup_of')} ${o.textContent.split(' · ')[0]}`; };
  offDayWatch($$('#af input[name=planned_date]'));
  if (action === 'record_work') workDayWatch(c);
  $('#af').onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const p = { ...preset };
    for (const [k, v] of fd.entries()) if (k !== 'note' && v !== '') p[k] = v;
    for (const k of ['confirm', 'confirm_winter_open', 'confirm_duplicate_invoice', 'safety_relevant', 'covers_work_and_parts', 'pickup_for_driver']) if (k in p) p[k] = true;
    if (!p.pickup_for_driver) delete p.pickup_valid_until;
    if (p.estimate) { p.valuation = 'estimate'; delete p.estimate; }
    // Hinweis zum Termin (Migration 0093): leer = entfernen (leere Felder werden sonst nicht gesendet); ohne Termin immer leer
    if (action === 'set_planned_date') p.planned_note = p.planned_date ? String(fd.get('planned_note') || '').trim() : '';
    if (action === 'set_occurred_at') {
      const occ = occurredValue(fd.get('occ_date') || '', fd.get('occ_time') || ''); delete p.occ_date; delete p.occ_time;
      if (occ === undefined) { toast(t('occ_need_date'), true); markInvalid($('#occd'), t('occ_need_date')); return; }
      p.occurred_at = occ;
    }
    // Zahlen unverändert senden – der Server liest deutsche Schreibweise („4,750“, „1.234,50“); vorher wurde „4,750“ zu „4.750“ und abgewiesen (18.10.2026)
    for (const k of ['hours', 'quantity', 'unit_price_net', 'amount_net']) if (k in p) p[k] = String(p[k]).trim();
    if (p.stock_item_id) { delete p.name; delete p.part_number; delete p.supplier; if (!fd.get('unit_price_net')) delete p.unit_price_net; } else delete p.stock_item_id;
    // Arbeitsdatum vor dem laufenden Monat: Buchung ändert einen vergangenen Monat im Kostenbericht (Backlog 189, Jahresabschluss)
    if (action === 'record_work' && p.work_date && p.work_date < bDate().slice(0, 7) + '-01' && !confirm(t('work_past_month_confirm').replace('{m}', fmtMonth(p.work_date.slice(0, 7))))) return;
    if (qrel) {
      // Backlog 629: erst „Zur Abschlusskontrolle“ (Abholvermerk, Winterreifen-Bestätigung), dann „Technisch freigeben“ mit der neuen Version;
      // scheitert der zweite Schritt (z. B. Kostenfreigabe nötig), steht der Vorgang in der Abschlusskontrolle und die Meldung nennt den Grund
      const note = fd.get('note') || null;
      const q = {}; if (p.pickup_note) q.pickup_note = p.pickup_note; if (p.confirm_winter_open) q.confirm_winter_open = true;
      const rel = { confirm: true }; if (p.pickup_for_driver) { rel.pickup_for_driver = true; if (p.pickup_valid_until) rel.pickup_valid_until = p.pickup_valid_until; }
      return cmd('request_quality_check', note, q, { formAction: action, next: async () => {
        try {
          const cur = await api('GET', '/api/cases/' + c.id);
          if (cur.case.status === 'abschlusskontrolle') { await api('POST', `/api/cases/${c.id}/commands`, { action: 'technical_release', command_id: uid(), expected_version: cur.case.version, note, payload: rel }); toast('✓'); }
        } catch (err) { toast(t('qrel_step2_failed').replace('{msg}', err.message).replace('{b}', t('act_technical_release')), true); }
        await viewCase(c.id);
      } });
    }
    return cmd(action, fd.get('note') || null, p); // Promise zurück: zentrale Sperre bis zum Ende (Doppelklick)
  };
  return stockP;
}

// Eigene Arbeitszeit am gewählten Tag über alle Aufträge (Backlog 419): Mechaniker mit zwei Aufträgen am selben Tag sieht, was schon gebucht ist,
// wie viel bis zur 24-h-Grenze bleibt und ob für diesen Auftrag an dem Tag schon etwas erfasst ist (Doppelbuchung nach Funkloch/Schichtwechsel)
function workDayWatch(c) {
  const inp = $('#af input[name=work_date]'); const box = $('#workday'); if (!inp || !box) return;
  let seq = 0;
  const load = () => {
    const d = inp.value; const my = ++seq;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { box.textContent = ''; return; }
    api('GET', '/api/work-day?date=' + encodeURIComponent(d)).then((r) => {
      if (my !== seq || !document.body.contains(box)) return;
      const h = (x) => fmtNum(x, { maximumFractionDigits: 2 });
      if (!r.hours) { box.innerHTML = esc(t('wd_none').replace('{d}', fmtD(r.date))); return; }
      const list = r.cases.map((x) => `${x.case_id === c.id ? `<b data-wdthis>${esc(x.case_no)} (${esc(t('wd_this'))})</b>` : esc(x.case_no)}${x.plate ? ' · ' + esc(x.plate) : ''}: <span style="white-space:nowrap">${esc(h(x.hours))} ${esc(t('wd_h'))}</span>`).join('; ');
      const same = r.cases.some((x) => x.case_id === c.id);
      box.innerHTML = `${esc(t('wd_sum').replace('{d}', fmtD(r.date)).replace('{h}', h(r.hours)))}${list ? ' – ' + list : ''}${r.other_environment_hours ? ' · ' + esc(t('wd_other_env').replace('{h}', h(r.other_environment_hours))) : ''}. ${esc(t('wd_left').replace('{h}', h(r.remaining)).replace('{max}', h(r.limit)))}${same ? `<br><b data-wdsame>⚠ ${esc(t('wd_same_case'))}</b>` : ''}`;
    }).catch(() => { if (my === seq) box.textContent = ''; });
  };
  // Backlog 488: eigene Woche (Mo–So des gewählten Tages) – nur beim Aufklappen geladen, Tage ohne Buchung nur angezeigt
  const wk = $('#wdweek'); let wseq = 0;
  const loadWeek = () => {
    const wb = $('#wdweekb'); if (!wk || !wk.open || !wb) return; const d = /^\d{4}-\d{2}-\d{2}$/.test(inp.value) ? inp.value : bDate(); const my = ++wseq;
    api('GET', '/api/work-day?week=1&date=' + encodeURIComponent(d)).then((r) => {
      if (my !== wseq || !document.body.contains(wb)) return;
      const h = (x) => fmtNum(x, { maximumFractionDigits: 2 });
      wb.innerHTML = `<p style="margin:6px 0">${esc(t('wd_week_sum').replace('{a}', fmtD(r.from)).replace('{b}', fmtD(r.to)).replace('{h}', h(r.hours)))}</p><ul data-wdweek style="margin:4px 0;padding-left:18px">${r.days.map((x) => `<li${x.date === d ? ' data-wdday' : ''}>${x.date === d ? '<b>' : ''}${esc(fmtDue(x.date))}${x.date === d ? '</b>' : ''}: ${x.hours ? `<span style="white-space:nowrap">${esc(h(x.hours))} ${esc(t('wd_h'))}</span>${x.cases.length ? ' – ' + x.cases.map((k) => `${esc(k.case_no)}${k.plate ? ' · ' + esc(k.plate) : ''}: ${esc(h(k.hours))} ${esc(t('wd_h'))}`).join('; ') : ''}${x.other_environment_hours ? ' · ' + esc(t('wd_other_env').replace('{h}', h(x.other_environment_hours))) : ''}` : '–'}</li>`).join('')}</ul>`;
    }).catch(() => { if (my === wseq) wb.textContent = ''; });
  };
  if (wk) wk.addEventListener('toggle', loadWeek);
  inp.addEventListener('change', loadWeek);
  inp.addEventListener('change', load); inp.addEventListener('input', load);
  setTimeout(load, 0); // nach einer Entwurfs-Wiederherstellung den dann gesetzten Tag lesen
}

// ---------- Kontrollen ----------
function checklistHtml() {
  return S.meta.checklist.map((i) => `<div class="checkitem" data-key="${esc(i.key)}"><span id="cl_${esc(i.key)}">${esc(checkLabel(i.key))}</span>
    <span class="seg" role="radiogroup" aria-labelledby="cl_${esc(i.key)}"><label><input type="radio" name="${esc(i.key)}" value="ok" required>${esc(t('ok'))}</label><label class="bad"><input type="radio" name="${esc(i.key)}" value="mangel">${esc(t('defect'))}</label><label><input type="radio" name="${esc(i.key)}" value="na">${esc(t('na'))}</label></span>
    <div class="detail" hidden><input name="${esc(i.key)}__note" minlength="3" maxlength="1000" placeholder="${esc(t('defect_note'))}"><label class="check"><input type="checkbox" name="${esc(i.key)}__safety"> ${esc(t('safety_relevant'))}</label><p class="small muted" data-safetyhint>${esc(t('check_safety_locks'))}</p></div></div>`).join('');
}
// Telematik-km nicht übernommen: kleiner als davor erfasster bzw. größer als später erfasster Stand (src/telematics.js kmRejection)
const tmKmRej = (dir, km, at) => dir === 'above' ? t('tm_km_rejected_next').replace('{km}', fmtKm(km)).replace('{date}', at ? fmtD(at) : '–') : t('tm_km_rejected').replace('{km}', fmtKm(km));
const kmWarn = (r) => (r.km_rejected && r.km_rejected.next_km !== undefined ? ' · ' + t('km_not_taken_next').replace('{km}', fmtNum(r.km_rejected.km)).replace('{next}', fmtNum(r.km_rejected.next_km)) : r.km_rejected && r.km_rejected.previous_km === undefined ? ' · ' + t('km_not_taken_other').replace('{km}', fmtNum(r.km_rejected.km)) : r.km_rejected ? ' · ' + t('km_not_taken').replace('{km}', fmtNum(r.km_rejected.km)).replace('{prev}', fmtNum(r.km_rejected.previous_km)) : r.km_test_only ? ' · ' + t('km_test_only') : '');
function bindChecklist(form) {
  $$('.checkitem', form).forEach((row) => {
    $$('input[type=radio]', row).forEach((r) => (r.onchange = () => { row.classList.remove('missing'); document.querySelectorAll('.toast.err').forEach((x) => x.remove()); /* jede Antwort entfernt die Meldung – sonst blieb „Noch 18 …“ nach 17 Antworten stehen (19.10.2026); beim Speichern wird neu gezählt */ /* Meldung „Noch n Prüfpunkte …“ mit veralteter Zahl lag über „Speichern“ (19.10.2026) */ const bad = r.value === 'mangel' && r.checked; $('.detail', row).hidden = !bad; $('.detail input', row).required = bad; }));
  });
  // Unbeantwortete Punkte in der App-Sprache melden (statt Browser-Hinweis am unsichtbaren Radio in der Gerätesprache)
  let shown = false;
  form.addEventListener('invalid', (e) => {
    const row = e.target.closest('.checkitem');
    // Mangelbeschreibung (Pflicht, ≥ 3 Zeichen wie der Server) und km-Stand ebenfalls in der App-Sprache statt Browser-/Server-Text
    if ((row && e.target.name && e.target.name.endsWith('__note')) || e.target.id === 'km') {
      e.preventDefault();
      if (shown) return;
      shown = true; setTimeout(() => (shown = false), 0);
      e.target.scrollIntoView({ block: 'center' }); e.target.focus({ preventScroll: true });
      toast(t(e.target.id === 'km' ? 'km_invalid' : 'defect_note_missing'), true);
      markInvalid(e.target, t(e.target.id === 'km' ? 'km_invalid' : 'defect_note_missing'));
      return;
    }
    if (!row || e.target.type !== 'radio') return;
    e.preventDefault();
    row.classList.add('missing');
    // jede offene Gruppe aria-invalid; sichtbarer Hinweistext nur unter der ersten (sonst 18 gleiche Zeilen)
    const seg = $('.seg', row);
    if (seg && !seg.hasAttribute('aria-invalid')) { seg.setAttribute('aria-invalid', 'true'); seg.addEventListener('change', () => seg.removeAttribute('aria-invalid'), { once: true }); }
    if (shown) return;
    shown = true; setTimeout(() => (shown = false), 0);
    if (seg) markInvalid(seg, t('check_answer_missing'), row);
    const open = $$('.checkitem', form).filter((r) => !$('input[type=radio]:checked', r)).length;
    row.scrollIntoView({ block: 'center' });
    $('input[type=radio]', row).focus({ preventScroll: true });
    toast(tn('check_missing', open), true);
  }, true);
}
// Formularentwurf (Abfahrtskontrolle/Meldung) im Sitzungsspeicher dieses Fensters – je Person/Umgebung/Seite, höchstens 12 h (Backlog 183):
// Sprachwechsel unter „Mehr“ oder der Hilfe-Link mitten in der Kontrolle verloren sonst alle Eingaben. Gesichert wird erst nach einer
// Eingabe; Fotos nicht (nur ihre Anzahl für den Hinweis), Suchfeld nicht. Gelöscht nach Senden/Postausgang, „Entwurf verwerfen“ und beim
// Abmelden (resetUserState löscht alle cfp_-Schlüssel des Sitzungsspeichers).
const FORM_DRAFT_MS = 12 * 3600000;
// Aktionsformular eines Vorgangs („Teil erfassen“, „Arbeitszeit“ …) nach Netzabbruch je Person/Umgebung/Vorgang sichern (Backlog 187):
// vorher verworfen, sobald ein anderer Vorgang geöffnet oder die Seite neu geladen wurde. Mit gesichert wird die Befehlskennung –
// kam die erste Sendung doch an, meldet der Server beim erneuten Speichern „bereits gespeichert“ statt doppelt zu buchen.
const actDraft = (caseId) => formDraft('act_' + caseId, $('#af'));
function actDraftSave(caseId, action) {
  const af = $('#af'); if (!af || !S.openAct || S.openAct.caseId !== caseId || S.openAct.action !== action) return;
  formDraft('act_' + caseId, af).save({ action, preset: S.openAct.preset || {}, cmd: S.pendCmd || null });
}
function restoreActDraft(c, x) {
  const af = $('#af'); const ad = formDraft('act_' + c.id, af);
  ad.restore(x);
  // Befehlskennung nur so lange wiederverwenden wie im Formular selbst (10 Min.) – danach bucht evtl. ein anderer Mechaniker denselben Inhalt
  if (x.cmd && x.cmd.key && Date.now() - x.cmd.at < 10 * 60000) { S.pendCmd = x.cmd; S.cmdOffline = { key: x.cmd.key, at: x.cmd.at }; }
  const box = document.createElement('div'); box.className = 'panel'; box.id = 'adraft'; box.setAttribute('role', 'status'); box.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:center';
  box.innerHTML = `<span class="small" style="flex:1 1 200px">${esc(t('form_draft_restored').replace('{d}', fmtDT(x.at)))} ${esc(t('act_draft_check'))}</span><button type="button" class="btn secondary" id="adx">${esc(t('inventory_draft_discard'))}</button>`;
  af.querySelector('h3').insertAdjacentElement('afterend', box);
  $('#adx').onclick = () => { if (!confirm(t('form_draft_discard_confirm'))) return; ad.clear(); S.openAct = null; S.pendCmd = null; $('#actform').innerHTML = ''; };
  $('#actform').scrollIntoView({ block: 'start' });
}
function formDraft(page, form, skip = []) {
  const key = `cfp_fd_${page}_${S.me.id}_${S.viewEnv && S.me.role === 'owner' ? S.viewEnv : S.me.environment}`;
  const fields = () => [...form.elements].filter((x) => (x.name || x.id) && !['file', 'button', 'submit', 'search'].includes(x.type) && !skip.includes(x.id));
  const fk = (x) => x.name || x.id;
  const d = {
    load() { try { const x = JSON.parse(sessionStorage.getItem(key) || 'null'); return x && x.v && typeof x.v === 'object' && Date.now() - Date.parse(x.at) < FORM_DRAFT_MS ? x : null; } catch { return null; } },
    save(extra = {}) {
      try {
        const v = {};
        for (const x of fields()) { if (x.type === 'radio') { if (x.checked) v[fk(x)] = x.value; } else if (x.type === 'checkbox') { if (x.checked) v[fk(x)] = true; } else if (x.value !== '') v[fk(x)] = x.value; }
        const ph = $('input[type=file]', form); const photos = ph && ph.files ? ph.files.length : 0;
        sessionStorage.setItem(key, JSON.stringify({ ...extra, at: new Date().toISOString(), v, photos }));
      } catch { /* ohne Sitzungsspeicher: kein Entwurf */ }
    },
    clear() { try { sessionStorage.removeItem(key); } catch {} },
    // Werte in Dokumentreihenfolge setzen und wie eine Eingabe melden (Mängel-Details aufklappen, bekannte Mängel/Unfallhinweis zeigen)
    restore(x) {
      for (const el of fields()) {
        const k = fk(el); if (!(k in x.v)) continue;
        if (el.type === 'radio') { if (el.value !== x.v[k] || el.checked) continue; el.checked = true; const det = el.closest('details'); if (det) det.open = true; el.dispatchEvent(new Event('change', { bubbles: true })); }
        else if (el.type === 'checkbox') { el.checked = x.v[k] === true; }
        else if (el.tagName === 'SELECT') { if ([...el.options].some((o) => o.value === x.v[k])) { el.value = x.v[k]; el.dispatchEvent(new Event('change', { bubbles: true })); } }
        else { el.value = String(x.v[k]); el.dispatchEvent(new Event('input', { bubbles: true })); }
      }
    },
  };
  return d;
}
// Entwurf wiederherstellen (vor einer QR-Vorauswahl: zeigt der Aufkleber ein anderes Fahrzeug als der Entwurf, bleibt das Formular leer –
// Antworten gehören nie an ein anderes Fahrzeug) und Hinweis mit „Entwurf verwerfen“ zeigen; jede Eingabe sichert den Entwurf
function bindFormDraft(page, form, vehField, preId, skip) {
  const d = formDraft(page, form, skip);
  const x = d.load();
  if (x && !(preId && x.v[vehField] && x.v[vehField] !== preId)) {
    d.restore(x);
    const box = document.createElement('div'); box.className = 'panel'; box.id = 'fdraft'; box.setAttribute('role', 'status'); box.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:center';
    box.innerHTML = `<span class="small" style="flex:1 1 200px">${esc(t('form_draft_restored').replace('{d}', fmtDT(x.at)))}${x.photos ? ' ' + esc(t('form_draft_photos')) : ''}</span><button type="button" class="btn secondary" id="fdx">${esc(t('inventory_draft_discard'))}</button>`;
    form.prepend(box);
    $('#fdx').onclick = () => { if (!confirm(t('form_draft_discard_confirm'))) return; d.clear(); route(); };
  }
  const save = (e) => { if (e.isTrusted) d.save(); };
  form.addEventListener('input', save); form.addEventListener('change', save);
  return d;
}
function collectChecklist(form) {
  const fd = new FormData(form);
  return S.meta.checklist.map((i) => ({ key: i.key, result: fd.get(i.key), note: fd.get(i.key + '__note') || null, safety_relevant: !!fd.get(i.key + '__safety') }));
}
async function viewInspection(caseId) {
  const d = await api('GET', '/api/cases/' + caseId);
  render(`<p><a class="backlink" href="#/cases/${esc(caseId)}">‹ ${esc(t('back'))}</a></p><h1 data-title="${esc(d.case.case_no)} · ${esc(d.vehicle.plate)} · ${esc(t('inspection'))}">${esc(t('inspection'))}</h1><p>${plate(d.vehicle.plate)} ${esc(d.case.case_no)}</p>
    <form id="f">${checklistHtml()}<label for="km">${esc(t('km'))}</label><input id="km" name="km" inputmode="numeric" pattern=" *[0-9][0-9 .]*" maxlength="12"><label for="n">${esc(t('note'))}</label><textarea id="n" name="n"></textarea><input type="hidden" name="rk" value="${esc(uid())}">
    <div class="actions"><button class="btn block">${esc(t('submit_inspection'))}</button></div></form>`, 'cases');
  const form = $('#f'); bindChecklist(form);
  // Entwurf je Vorgang (Backlog 186, Werkstatt-Tablet in der Halle): Netzabbruch/Neuladen/Seitenwechsel verlieren die 18 Punkte nicht; die
  // Anfragekennung steht im Entwurf (verstecktes Feld) – kam die erste Sendung doch an, liefert der Server dieselbe Kontrolle statt einer zweiten
  const draft = bindFormDraft('insp_' + caseId, form, '', null);
  form.onsubmit = async (e) => {
    e.preventDefault();
    const key = form.rk.value || uid();
    try {
      const r = await api('POST', '/api/inspections', { kind: 'nach_reparatur', case_id: caseId, request_key: key, checklist_version: S.meta.checklist_version || undefined, items: collectChecklist(form), odometer_km: $('#km').value || null, note: $('#n').value || null });
      draft.clear();
      toast(`${t('check_saved')}${r.followups.length ? ' · ' + r.followups.map((f) => f.case_no).join(', ') : ''}${kmWarn(r)}`, !!r.km_rejected);
      location.hash = '#/cases/' + caseId;
    } catch (err) { if (err.offline) draft.save(); toast(err.offline ? `${err.message} ${t('form_draft_kept')}` : err.message, true); }
  };
}
async function viewDepartureCheck(preId) {
  if (!mayCheck()) { render(`<h1>${esc(t('departure_check'))}</h1><p class="muted">${esc(t('no_permission_view'))}</p>`, 'check'); return; }
  const vs = await vehiclesCached();
  if (!vs.length) { render(`<h1>${esc(t('departure_check'))}</h1>${outboxBanner()}${noVehiclesNote()}`, 'check'); return; }
  render(`<h1>${esc(t('departure_check'))}</h1>${outboxBanner()}${helpLink('check')}<form id="f"><label for="v">${esc(t('vehicle'))}</label><select id="v" required><option value="">–</option>${vs.map((v) => `<option value="${esc(v.id)}"${v.assigned && vs.filter((x) => x.assigned).length === 1 ? ' selected' : ''}>${esc(v.plate)}${v.kind === 'anhaenger' ? ' (' + esc(t('vk_anhaenger')) + ')' : ''}${v.availability === 'gesperrt' ? ' – ' + esc(t('locked')) : ''}</option>`).join('')}</select><div id="known"></div>
    ${checklistHtml()}${tachoPanel()}${glassPanel(true)}<label for="km">${esc(t('km'))}</label><input id="km" inputmode="numeric" pattern=" *[0-9][0-9 .]*" maxlength="12">
    <label for="ph">${esc(t('photos_now'))}<span class="hint">${esc(t('check_photos_hint'))}</span></label><input type="file" id="ph" accept="image/jpeg,image/png,image/webp" multiple>
    <div class="actions"><button class="btn block" id="sb">${esc(t('submit_inspection'))}</button></div></form><p class="small"><a href="#/check/paper">${esc(t('paper_form'))}</a> – ${esc(t('paper_hint'))}</p><p class="small" id="dcdmg">${esc(t('dc_damage_hint'))} <a id="dcdmglink" href="#/new">${esc(t('report_damage'))} ›</a></p>`, 'check');
  const form = $('#f'); bindChecklist(form);
  // Backlog 646: Schaden außerhalb der Prüfpunkte (Delle, Kratzer, Plane – auch vorgefunden) → Meldung mit dem gewählten Fahrzeug
  const dmgLink = () => { const a = $('#dcdmglink'); if (a) a.href = /^VIN:[A-Z0-9]+$/.test($('#v').value) ? '#/new/' + $('#v').value : '#/new'; };
  $('#v').addEventListener('change', dmgLink);
  if (preId) { if (vs.some((v) => v.id === preId)) $('#v').value = preId; else toast(t('qr_vehicle_unknown'), true); }
  dmgLink();
  // Mangel nennt Fahrtenschreiber/Fahrerkarte (z. B. „Kontrollleuchten: Tacho-Fehler“): dieselben Pflichten wie im Meldeformular (Backlog 216);
  // Listener vor bindFormDraft – wiederhergestellte Entwürfe melden input/change
  // Backlog 292: Mangel nennt einen Glasschaden (z. B. „Spiegel, Scheiben, Wischer: Steinschlag“) → Glasschaden-Hinweis wie im Meldeformular
  const tachoCheck = () => { const ms = collectChecklist(form).filter((i) => i.result === 'mangel'); $('#tacho').hidden = !ms.some((i) => TACHO_HINT.test(i.note || '')); $('#glass').hidden = !ms.some((i) => GLASS_HINT.test(i.note || '')); };
  form.addEventListener('input', tachoCheck); form.addEventListener('change', tachoCheck);
  // Sperre des gewählten Fahrzeugs (und des gekoppelten) immer zeigen – auch für Springer an einem nicht zugeordneten Lkw
  // (Fahrzeugliste liefert `availability`), bekannte Mängel nur für zugeordnete Fahrzeuge des Fahrers (23.10.2026)
  let known = null;
  const showKnown = () => { const box = $('#known'); if (!box) return; const id = $('#v').value; box.innerHTML = notMineHint(vs, id) + departureLockBox(vs.find((x) => x.id === id), known && (known.find((x) => x.id === id) || coupledKnown(known, id))); };
  showKnown();
  $('#v').addEventListener('change', showKnown);
  if (S.me.role === 'driver') api('GET', '/api/me/vehicles').then((r) => { known = r.vehicles; showKnown(); }).catch(() => { known = myVehCached(); showKnown(); });
  photoLimitWatch($('#ph'));
  const draft = bindFormDraft('check', form, 'v', preId);
  tachoCheck();
  const key = uid();
  form.onsubmit = async (e) => {
    e.preventDefault();
    const sb = $('#sb'); // festhalten – Seitenwechsel während des Hochladens (siehe Meldung)
    const who = outboxWho();
    // km-Stand wie der Server prüfen (0–5.000.000, ganze Zahl, Tausenderpunkt erlaubt) – sonst scheiterte die Kontrolle offline dauerhaft im Postausgang (20.10.2026)
    if ($('#km').value.trim() && !kmInputOk($('#km').value)) { $('#km').focus(); toast(t('km_invalid'), true); return; }
    const body = { kind: 'abfahrt', vehicle_id: $('#v').value, request_key: key, items: collectChecklist(form), odometer_km: $('#km').value || null, checklist_version: S.meta.checklist_version || undefined }; // Fassung der Prüfliste (Postausgang über einen App-Wechsel)
    const files = [...($('#ph').files || [])].slice(0, PHOTO_MAX);
    const hasDefect = body.items.some((i) => i.result === 'mangel');
    try {
      sb.disabled = true;
      const r = await api('POST', '/api/inspections', body);
      draft.clear();
      // Fotos gehören zum Mangel: an den (ersten) Folgeauftrag hängen; ohne Mangel wird nichts hochgeladen
      let failed = 0;
      // Ziel: erster eigener Folgeauftrag; ein Wiederholungsvermerk an einem fremden Vorgang ist für Fahrer nicht sichtbar (17.10.2026)
      const fTarget = (r.followups.find((f) => f && f.id && (!f.repeat || f.own)) || (S.me.role !== 'driver' ? r.followups.find((f) => f && f.id) : null) || {}).id;
      let later = 0;
      if (files.length && fTarget) ({ failed, later } = await uploadPhotosSafe('/api/inspections', body, r, fTarget, files, sb, who));
      const lockedPage = sb.isConnected && (r.vehicle_locked || r.coupled_locked);
      // Ergebnisseite „gesperrt“ nennt „gespeichert“ und die Sperre selbst – Einblendung nur noch für Foto-/km-Hinweise (verdeckte sonst die Überschrift)
      const extra = `${files.length && !fTarget ? ' · ' + photosSkippedText(r) : ''}${failed ? ' · ' + tn('photos_failed', failed) : ''}${later ? ' · ' + tn('photos_stored', later) : ''}${kmWarn(r)}`;
      if (!lockedPage) toast(`${t('check_saved')}${extra}${lockedWarn(r)}`, !!failed || !!r.km_rejected || !!r.vehicle_locked || !!r.coupled_locked);
      else if (extra) toast(extra.slice(3), !!failed || !!r.km_rejected);
      // Fahrzeug/Gespann gesperrt (Backlog 252, 25.10.2026): stehende rote Ergebnisseite mit Anruf-Knopf statt nur einer Einblendung,
      // die von selbst verschwindet – wie im Offline-Zweig; Folgeauftrag bleibt über den Knopf erreichbar
      if (lockedPage) {
        render(`<h1>${esc(t('departure_check'))}</h1><div class="panel alert" role="alert" data-lockedresult><p><b>${esc(t('check_saved'))}</b></p>${r.vehicle_locked ? `<p><b>⚠ ${esc(t('locked'))} – ${esc(t('do_not_drive'))}</b></p>` : ''}${r.coupled_locked ? `<p><b>⚠ ${esc(coupledLockedText(r.coupled_locked))}</b></p>` : ''}${callBox(body.vehicle_id)}</div><div class="actions">${fTarget ? `<a class="btn secondary" href="#/cases/${esc(fTarget)}">${esc(t('locked_open_followup'))}</a>` : ''}<a class="btn secondary" href="#/">${esc(t('back'))}</a></div>`);
        return;
      }
      // Backlog 379 (Blickwinkel „Neuer Fahrer, erster Arbeitstag“): Fahrer mit gemeldetem Mangel landete direkt im Auftrag mit
      // „Kann das Fahrzeug fahren? – Weiß nicht“ und ohne Antwort auf „Darf ich losfahren?“ – jetzt stehende Ergebnisseite mit Nummern,
      // Hinweis „vor der Abfahrt klären“ und Weg zu den Notfallkontakten (die App entscheidet die Fahrbereitschaft nicht)
      const mine = (r.followups || []).filter((f) => f && f.id && (!f.repeat || f.own));
      if (sb.isConnected && S.me.role === 'driver' && mine.length) {
        render(`<h1>${esc(t('departure_check'))}</h1><div class="panel" role="status" data-defectresult><p><b>${esc(t('check_saved'))}</b></p><p>${esc(tn('check_defects_reported', mine.length))}: ${mine.map((f) => `<a href="#/cases/${esc(f.id)}">${esc(f.case_no || '')}</a>`).join(', ')}</p><p><b>${esc(t('check_defect_clarify'))}</b></p><div class="actions"><a class="btn secondary" href="#/emergency?v=${esc(body.vehicle_id)}">☎ ${esc(t('em_title'))}</a></div></div><div class="actions"><a class="btn secondary" href="#/cases/${esc(mine[0].id)}">${esc(t('locked_open_followup'))}</a><a class="btn secondary" href="#/">${esc(t('back'))}</a></div>`);
        return;
      }
      if (sb.isConnected) location.hash = fTarget ? '#/cases/' + fTarget : '#/';
    } catch (err) {
      sb.disabled = false;
      if (err.offline || err.status === 401 || err.code === 'user_mismatch' || err.code === 'env_mismatch') { // wie Meldung (21.10.2026)
        let stored = 0;
        if (files.length && hasDefect) { try { const list = []; for (const f of files) list.push({ blob: await prepareUpload(f), name: f.name }); await photosPut(key, list); stored = list.length; } catch {} }
        outboxAdd('/api/inspections', body, stored, who);
        draft.clear();
        if (!err.offline || !sb.isConnected) { toast(t(err.offline ? 'outbox_saved' : 'outbox_saved_login')); return; }
        const critical = body.items.some((i) => i.result === 'mangel' && i.safety_relevant);
        render(`<h1>${esc(t('departure_check'))}</h1><div class="panel alert" role="alert"><p><b>${esc(t('outbox_saved'))}</b></p>${critical ? callBox(body.vehicle_id) : ''}${files.length && !hasDefect ? `<p class="small">${esc(t('check_photos_skipped'))}</p>` : files.length && !stored ? `<p>${esc(t('photos_offline'))}</p>` : stored ? `<p>${esc(tn('photos_stored', stored))}</p>` : ''}</div><div id="outbox_slot"></div><div class="actions"><a class="btn secondary" href="#/">${esc(t('back'))}</a></div>`, 'check');
        return;
      }
      toast(err.message, true);
    }
  };
}

function kmInputOk(v) { const x = String(v).replace(/[\s\u00a0]/g, ''); if (!/^\d+$/.test(x) && !/^[1-9]\d{0,2}(\.\d{3})+$/.test(x)) return false; const n = Number(x.replace(/\./g, '')); return n >= 0 && n <= 5000000; }

// Papiervordruck der Abfahrtskontrolle (Notfall: Handy leer/defekt) – gleiche Prüfpunkte wie in der App
function viewCheckPaper() {
  const line = (l) => `<div class="paper-field"><span>${esc(l)}</span><i></i></div>`;
  render(`<p class="noprint"><a class="backlink" href="#/check">‹ ${esc(t('back'))}</a></p><h1>${esc(t('departure_check'))} – ${esc(t('paper_form'))}</h1>
    <p class="small noprint">${esc(t('paper_hint'))}</p><div class="actions noprint"><button type="button" class="btn" id="pprt">${esc(t('print'))}</button></div>
    <div class="paper-head">${[t('plate_label'), t('date'), t('km'), t('driver_name')].map(line).join('')}</div>
    <div class="scroll"><table class="paper"><thead><tr><th>${esc(t('check_item'))}</th><th style="white-space:nowrap">${esc(t('ok'))}</th><th style="white-space:nowrap">${esc(t('defect'))}</th><th style="white-space:nowrap">${esc(t('na'))}</th><th>${esc(t('defect_note'))}</th></tr></thead>
    <tbody>${S.meta.checklist.map((i) => `<tr><td>${esc(checkLabel(i.key))}</td><td class="box">☐</td><td class="box">☐</td><td class="box">☐</td><td></td></tr>`).join('')}</tbody></table></div>
    <p class="small">☐ ${esc(t('safety_relevant'))} – ${esc(t('outbox_call'))}</p>
    <div class="paper-head">${line(t('signature'))}</div>
    <p class="small muted">${esc(t('paper_footer'))} · CEVIK ${esc(t('app'))} [CLAUDE]</p>`, 'check');
  $('#pprt').onclick = () => window.print();
}

// ---------- Fahrzeuge ----------
// Abfahrtskontrolle bzw. Schadensmeldung nur für Rollen, die der Server zulässt (src/cases.js) – vorher bekamen Lesezugriff/Disposition
// die Links und erst beim Senden 403 (18.10.2026)
const mayCheck = () => ['driver', 'fleet', 'owner', 'workshop'].includes(S.me && S.me.role);
const mayReport = () => !!(S.me && S.me.role !== 'viewer');
function vehicleForm(v = {}) {
  const f = (name, label, val, extra = '') => `<label>${esc(label)}</label><input name="${name}" value="${esc(val ?? '')}" ${extra}>`;
  return `${v.trailer_vin ? `<input type="hidden" name="trailer_vin" value="${esc(v.trailer_vin)}">` : ''}${v.vin ? `<input type="hidden" name="vin" value="${esc(v.vin)}">` : f('vin', t('vin'), '', 'required minlength="17" maxlength="25" autocapitalize="characters" aria-describedby="vinhint"') + `<p class="small muted" id="vinhint">${esc(t('vin_hint_new'))}</p>`}
    ${f('plate', t('plate_label'), v.plate, 'required maxlength="20" autocapitalize="characters"')}
    <label>${esc(t('vehicle_kind'))}</label><select name="kind">${['lkw', 'anhaenger'].map((k) => `<option value="${k}"${(v.kind || 'lkw') === k ? ' selected' : ''}>${esc(t('vk_' + k))}</option>`).join('')}</select>
    ${f('site', t('site'), v.site, 'maxlength="60"')}${f('manufacturer', t('manufacturer'), v.manufacturer, 'maxlength="60"')}${f('model', t('model_label'), v.model, 'maxlength="60"')}${f('build_year', t('year'), v.build_year, 'inputmode="numeric" maxlength="4"')}
    ${f('trailer_plate', t('trailer') + ' (' + t('plate_label') + ')', v.trailer_plate, 'maxlength="20" autocapitalize="characters"')}${f('master_status', t('master_status'), v.master_status, 'maxlength="40"')}
    ${f('source', t('evidence'), v.vin ? '' : '', 'maxlength="200"')}`;
}
async function saveVehicleForm(form, edit = false) {
  const b = Object.fromEntries(new FormData(form));
  for (const k in b) if (b[k] === '') delete b[k];
  // Bearbeiten nimmt ein außer Betrieb genommenes Fahrzeug nicht wieder in Betrieb; Anlegen überschreibt nie ein Fahrzeug in Betrieb (409 vin_exists, 20.10.2026)
  if (edit) b.keep_active = true; else b.create_only = true;
  const r = await api('POST', '/api/vehicles', b);
  // Hinweis, wenn dasselbe Kennzeichen schon an einem anderen Fahrzeug steht (gespeichert wird trotzdem – Mensch entscheidet)
  const d = r && r.duplicate_plates;
  if (d && d.length) {
    const lst = d.slice(0, 3).map((x) => String(x.id).replace(/^VIN:/, '') + (!x.active ? ' (' + t('inactive_vehicles') + ')' : x.eval_excluded ? ' (' + t('eval_excluded') + ')' : '')).join(', ') + (d.length > 3 ? ` +${d.length - 3}` : '');
    setTimeout(() => toast(t('dup_plate_warn').replace('{p}', String(b.plate || '').toUpperCase()).replace('{list}', lst), true), 400);
  }
  // Anhänger umgekennzeichnet: Zugmaschinen tragen noch das alte Anhänger-Kennzeichen → Gespann gelöst, bis dort nachgetragen
  const tr = r && r.trailer_of_trucks;
  if (tr && tr.length) setTimeout(() => toast(t('trailer_renamed_warn').replace('{old}', r.trailer_plate_old).replace('{list}', tr.map((x) => x.plate).join(', ')), true), d && d.length ? 6000 : 400);
  // Standort geändert: was beim bisherigen Standort bleibt (offene Aufträge, geplante Prüftermine, gekoppeltes Fahrzeug) – reine Information (22.10.2026)
  if (r && r.site_changed) {
    const sh = [r.open_workshop_cases ? tn('veh_site_ws_open', r.open_workshop_cases).replace('{list}', (r.open_workshop_sites || []).join(', ')) : '',
      r.planned_appointments ? tn('veh_site_planned', r.planned_appointments) : '',
      ...(r.coupled_other_site || []).map((x) => t('veh_site_coupled').replace('{p}', x.plate).replace('{site}', x.site || t('cs_nosite'))),
      (r.drivers_other_site || []).length ? t('veh_site_drivers').replace('{list}', () => r.drivers_other_site.map((x) => `${x.name} (${x.site})`).join(', ')) : ''].filter(Boolean);
    if (sh.length) setTimeout(() => toast(sh.join(' · '), true), (d && d.length ? 6000 : 400) + (tr && tr.length ? 6000 : 0));
  }
  return r;
}
// Direktsprung mit Filter (z. B. „Heute zu tun“ → #/vehicles?f=with_findings): Filter übernehmen, Adresse ohne Parameter
// ersetzen (sonst setzt jeder Neuaufbau den Filter zurück); „Mit Agentenbefunden“ sortiert dabei nur für diese Sitzung nach Befunden
// Startseiten-Leiste → gefilterte Fahrzeugliste (feste Ziele, damit der Routen-Wächter sie prüfen kann)
const FB_HREF = { gesperrt: '#/vehicles?f=gesperrt', werkstatt: '#/vehicles?f=werkstatt', meldung_offen: '#/vehicles?f=meldung_offen', einsatzbereit_lt_system: '#/vehicles?f=einsatzbereit_lt_system' };
const VEH_AV_LINK = ['gesperrt', 'werkstatt', 'meldung_offen', 'einsatzbereit_lt_system', 'coupled_locked', 'with_notes', 'maint_overdue', 'recall_open', 'with_findings', 'with_findings_crit', 'dormant'];
async function viewVehicles() {
  const hf = new URLSearchParams(location.hash.split('?')[1] || '').get('f');
  if (hf !== null) {
    // Sprung aus einem Zähler: übrige Filter zurücksetzen (Art, außer Betrieb) – sonst zeigte die Liste weniger/andere Fahrzeuge als die Zahl (22.10.2026)
    if (VEH_AV_LINK.includes(hf) && (!hf.startsWith('with_findings') || isMgr())) { S.vehAvail = hf; S.vehKind = 'all'; S.vehInactive = false; if (hf.startsWith('with_findings')) S.vehSort = 'findings'; }
    try { history.replaceState(history.state, '', '#/vehicles'); } catch {}
  }
  const inact = !!S.vehInactive && isMgr();
  const vs = (await api('GET', '/api/vehicles' + (inact ? '?inactive=1' : ''))).vehicles;
  const f = S.vehKind || 'all';
  const av = S.vehAvail || 'all';
  const site = vsDef('vehSite') || '';
  // Schreibweisen desselben Standorts (Dortmund/DORTMUND) als ein Eintrag – wie Kostenbericht und Datenqualität; angezeigt die häufigste
  // ohne Standort = 'ohne' (wie Startseite/Server; 20.10.2026: Standard-Standort „ohne Standort“ ergab eine leere Liste)
  const sk = siteKeyUi;
  const siteCnt = new Map(); for (const v of vs) if (v.site && String(v.site).trim()) { const m = siteCnt.get(sk(v.site)) || new Map(); const raw = String(v.site).trim(); m.set(raw, (m.get(raw) || 0) + 1); siteCnt.set(sk(v.site), m); }
  const sites = [...siteCnt.values()].map((m) => [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'de'))[0][0]).sort((a, b) => a.localeCompare(b, 'de'));
  const base = vs.filter((v) => (!site || sk(v.site) === sk(site)) && (f === 'all' || v.kind === f));
  // „Gespann gesperrt“: eigenes Fahrzeug nicht gesperrt, aber gekoppelter Anhänger/Lkw gesperrt (nur Information, Kopplung laut Stammliste)
  const cLocked = (v) => !v.eval_excluded && v.availability !== 'gesperrt' && v.coupled && v.coupled.availability === 'gesperrt'; // ruhende nicht (wie die übrigen Verfügbarkeits-Knöpfe, 23.10.2026)
  const nCL = base.filter(cLocked).length;
  const nN = base.filter((v) => v.notes_active > 0).length; // aktive Hinweise zum Fahrzeug (nicht für Fahrer)
  // Prüfung/Wartung überfällig: frühester Termin vor heute oder km-Fälligkeit überschritten (gespeicherte Werte, nur Anzeige)
  const mOver = (v) => !v.eval_excluded && ((v.next_due && v.next_due < bDate()) || (v.km_remaining !== null && v.km_remaining !== undefined && v.km_remaining < 0)); // ruhende nicht (wie Übersicht/Agent, Entscheidung 10.10.2026)
  const nMO = base.filter(mOver).length;
  const nRC = base.filter((v) => v.open_recalls > 0).length; // offene Herstellerrückrufe (noch nicht durchgeführt)
  const nAF = base.filter((v) => v.agent_findings_open > 0).length; const nAFC = base.filter((v) => v.agent_findings_critical > 0).length; // offene Agentenbefunde (nur Inhaber/Fuhrparkleitung bekommen das Feld)
  const shown = base.filter((v) => av === 'all' || (av === 'coupled_locked' ? cLocked(v) : av === 'with_notes' ? v.notes_active > 0 : av === 'maint_overdue' ? mOver(v) : av === 'recall_open' ? v.open_recalls > 0 : av === 'with_findings' ? v.agent_findings_open > 0 : av === 'with_findings_crit' ? v.agent_findings_critical > 0 : av === 'dormant' ? !!v.eval_excluded : v.availability === av && !v.eval_excluded));
  const nDo = base.filter((v) => v.eval_excluded).length; // ruhende eigener Knopf; Verfügbarkeits-Knöpfe ohne sie wie die Startseite (23.10.2026, Teilagent „Disposition“)
  // Sortierung (nur Anzeige, gespeicherte Werte; fehlende Werte zuletzt bzw. bei „Abfahrtskontrolle“ zuerst – nie kontrolliert ist am ältesten)
  const so = S.vehSort || (S.vehSort = sortPref('vehicles', VEH_SORTS, 'plate'));
  const cmpStr = (a, b) => (a === b ? 0 : !a ? 1 : !b ? -1 : a < b ? -1 : 1);
  const SORTS = { plate: (a, b) => plateCmp(a.plate, b.plate), next_due: (a, b) => cmpStr(a.next_due, b.next_due),
    check_oldest: (a, b) => (a.last_check_at || '') < (b.last_check_at || '') ? -1 : (a.last_check_at || '') > (b.last_check_at || '') ? 1 : 0,
    km_desc: (a, b) => (b.last_km ?? -1) - (a.last_km ?? -1),
    // wenigste Rest-km zuerst (überschritten = negativ); ohne km-Fälligkeit oder ohne km-Stand ans Ende
    km_due: (a, b) => (a.km_remaining ?? Infinity) - (b.km_remaining ?? Infinity) || 0,
    // meiste offene Agentenbefunde zuerst (kritische vor allen anderen) – Felder gibt es nur für Inhaber/Fuhrparkleitung
    findings: (a, b) => (b.agent_findings_critical || 0) - (a.agent_findings_critical || 0) || (b.agent_findings_open || 0) - (a.agent_findings_open || 0) };
  if (S.me.role !== 'driver' && SORTS[so]) shown.sort((a, b) => SORTS[so](a, b) || plateCmp(a.plate, b.plate));
  // Art-Reiter zählen innerhalb des gewählten Standorts (wie Verfügbarkeits-Knöpfe und Liste) – 20.10.2026
  const bySite = vs.filter((v) => !site || sk(v.site) === sk(site));
  const anyT = vs.some((v) => v.kind === 'anhaenger');
  const nT = bySite.filter((v) => v.kind === 'anhaenger').length;
  const AV = ['gesperrt', 'werkstatt', 'meldung_offen', 'einsatzbereit_lt_system'];
  render(`<h1>${esc(t('vehicles'))}${inact ? ` · ${esc(t('inactive_vehicles'))}` : ''}</h1>${isMgr() ? `<details class="panel"><summary>${esc(t('new_vehicle'))}</summary><form id="nvf">${vehicleForm()}<div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>
    <p class="noprint"><label style="display:inline-flex;gap:8px;align-items:center;margin:0"><input type="checkbox" id="inact" ${inact ? 'checked' : ''} style="width:auto"> ${esc(t('inactive_vehicles'))}</label></p>` : ''}<input id="q" class="noprint" type="search" autocomplete="off" placeholder="${esc(S.me.role === 'driver' ? 'SZ-…' : t('veh_search_ph'))}" aria-label="${esc(t('search_label'))}" style="margin-bottom:12px"><div id="vprl"></div>
    ${anyT ? `<div class="actions" role="group" aria-label="${esc(t('kind'))}" style="margin-top:0">${[['all', t('filter_all'), bySite.length], ['lkw', t('vk_lkw'), bySite.length - nT], ['anhaenger', t('vk_anhaenger'), nT]].map(([k, l, n]) => `<button type="button" class="btn ${f === k ? '' : 'secondary'}" data-vk="${k}">${esc(l)} (${n})</button>`).join('')}</div>` : ''}
    ${S.me.role !== 'driver' ? `<div class="actions" style="flex-wrap:wrap;margin-top:0">${sites.length + (vs.some((v) => !(v.site && String(v.site).trim())) ? 1 : 0) > 1 || site ? `<select id="vsite" aria-label="${esc(t('site'))}" style="max-width:220px"><option value="">${esc(t('site'))}: ${esc(t('filter_all'))}</option>${sites.map((x) => `<option${sk(x) === sk(site) ? ' selected' : ''}>${esc(x)}</option>`).join('')}${site && site !== 'ohne' && !sites.some((x) => sk(x) === sk(site)) ? `<option selected>${esc(site)}</option>` : ''}${vs.some((v) => !(v.site && String(v.site).trim())) || site === 'ohne' ? `<option value="ohne"${site === 'ohne' ? ' selected' : ''}>${esc(t('cs_nosite'))}</option>` : ''}</select>` : ''}
      ${[['all', t('filter_all'), base.length], ...AV.map((k) => [k, t('av_' + k), base.filter((v) => v.availability === k && !v.eval_excluded).length]), ...(nDo || av === 'dormant' ? [['dormant', t('eval_excluded'), nDo]] : []), ...(nCL || av === 'coupled_locked' ? [['coupled_locked', t('av_coupled_locked'), nCL]] : []), ...(nN || av === 'with_notes' ? [['with_notes', t('vnotes_with'), nN]] : []), ...(nMO || av === 'maint_overdue' ? [['maint_overdue', t('av_maint_overdue'), nMO]] : []), ...(nRC || av === 'recall_open' ? [['recall_open', t('av_recall_open'), nRC]] : []), ...(nAF || av === 'with_findings' ? [['with_findings', t('av_with_findings'), nAF]] : []), ...(av === 'with_findings_crit' ? [['with_findings_crit', t('av_with_findings_crit'), nAFC]] : [])].map(([k, l, n]) => `<button type="button" class="btn ${av === k ? '' : 'secondary'}" data-av="${k}">${esc(l)} (${n})</button>`).join('')}</div>` : ''}
    ${S.me.role !== 'driver' ? `<div class="actions" style="margin-top:0;flex-wrap:wrap"><select id="vsort" aria-label="${esc(t('sort_by'))}" style="flex:1 1 100%;max-width:420px">${VEH_SORTS.filter((k) => k !== 'findings' || isMgr()).map((k) => `<option value="${k}"${so === k ? ' selected' : ''}>${esc(t('sort_by'))}: ${esc(t('vsort_' + k))}</option>`).join('')}</select><button type="button" class="btn secondary" id="vcsv">${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="vprt">${esc(t('print'))}</button>${isMgr() ? `<a class="btn secondary" href="#/vehicles/qr">${esc(t('qr_sheet'))}</a>` : ''}</div>` : ''}
    <p id="vnohit" class="muted small" hidden>${esc(t('search_no_hits'))}</p><div class="list" id="vl">${shown.map((v) => `<a class="row ${v.availability === 'gesperrt' ? 'p-kritisch' : v.availability === 'werkstatt' ? 'p-mittel' : ''}" href="#/vehicles/${esc(v.id)}" data-s="${esc((v.plate + ' ' + (v.site || '') + ' ' + (v.vin || '') + ' ' + (v.trailer_plate || '') + ' ' + (v.truck_plate || '') + ' ' + (v.manufacturer || '') + ' ' + (v.model || '') + ' ' + (v.former_plates || []).join(' ')).toLowerCase())}">${plate(v.plate, { locked: v.availability === 'gesperrt' })}<span class="title">${v.kind === 'anhaenger' ? `<span class="chip">${esc(t('vk_anhaenger'))}</span> ` : ''}${v.eval_excluded ? `<span class="chip">${esc(t('eval_excluded'))}</span> ` : ''}${esc([v.manufacturer, v.model, v.build_year].filter(Boolean).join(' '))}</span><span class="chip ${v.availability === 'gesperrt' ? 'gesperrt' : ''}">${esc(t('av_' + v.availability))}</span><span class="sub">${coupledChip(v.coupled)}${v.failed_inspection ? `<b class="chip kritisch">${esc(t('insp_failed_chip'))}: ${esc(mk(v.failed_inspection.kind))} – ${esc(t('res_' + v.failed_inspection.result))}</b><br>` : v.reinspection_open ? `<span class="chip mittel" data-reinsp title="${esc(t('reinsp_open_title'))}">${esc(t('reinsp_open_chip'))}: ${esc(mk(v.reinspection_open.kind))} ${fmtD(v.reinspection_open.done_date)} – ${esc(t('res_' + v.reinspection_open.result))}</span><br>` : ''}${[v.site && esc(v.site), v.trailer_plate && esc(t('trailer')) + ' ' + esc(v.trailer_plate), v.truck_plate && esc(t('truck')) + ' ' + esc(v.truck_plate), v.next_due && (v.next_due < bDate() ? `<b class="chip kritisch" data-overdue>${esc(t('overdue'))}: ${esc(t('next_due'))} ${fmtD(v.next_due)}${v.next_due_kind ? ' (' + esc(mk(v.next_due_kind)) + ')' : ''}</b>` : esc(t('next_due')) + ' ' + fmtD(v.next_due) + (v.next_due_kind ? ' (' + esc(mk(v.next_due_kind)) + ')' : '')), v.next_due_km !== null && v.next_due_km !== undefined && (v.km_unclear ? `${esc(mk(v.next_due_km_kind))} ${esc(t('due_at_km'))} ${fmtKm(v.next_due_km)} <span class="chip mittel km-unclear" title="${esc(t('km_unclear_drop').replace('{d}', fmtD(v.km_drop_at)))}">${esc(t('ms_ungeklaert'))}</span>` : v.km_remaining !== null && v.km_remaining < 0 ? `<b class="chip kritisch">${esc(mk(v.next_due_km_kind))} ${esc(t('km_over'))} ${fmtKm(-v.km_remaining)}</b>` : `${esc(mk(v.next_due_km_kind))} ${esc(t('due_at_km'))} ${fmtKm(v.next_due_km)}`), v.last_km != null && fmtKm(v.last_km), v.last_check_at && esc(t('departure_check')) + ' ' + fmtD(v.last_check_at) + (v.last_check_result === 'maengel' ? ' (' + esc(t('defect')) + ')' : ''), v.planned_workshop_date && esc(t('planned_ws_short')) + ' ' + fmtD(v.planned_workshop_date) + todayMark(v.planned_workshop_date), v.planned_inspection_date && esc(t('planned_inspection')) + (v.planned_inspection_kind ? ' ' + esc(String(v.planned_inspection_kind).split(', ').map(mk).join(', ')) : '') + ' ' + fmtD(v.planned_inspection_date) + todayMark(v.planned_inspection_date), v.parts_expected_date && esc(t('parts_eta')) + ' ' + fmtD(v.parts_expected_date), v.notes_active && `<span class="chip">${esc(tn('vnotes_n', v.notes_active))}</span>`, v.open_recalls > 0 && `<span class="chip mittel">${esc(t('recall_open_n').replace('{n}', v.open_recalls))}</span>`, v.agent_findings_open > 0 && `<span class="chip ${v.agent_findings_critical > 0 ? 'kritisch' : 'mittel'}" data-af="${v.agent_findings_open}">${esc(t('vfind_n').replace('{n}', v.agent_findings_open))}${v.agent_findings_critical > 0 ? ' · ' + esc(t('vfind_crit').replace('{n}', v.agent_findings_critical)) : ''}</span>`].filter(Boolean).join(' · ')}</span></a>`).join('')}</div>${shown.length ? '' : `<p class="muted" data-vlempty>${esc(t(vs.length ? 'no_vehicles_filter' : (isMgr() ? 'no_vehicles_mgr' : 'no_vehicles_list')))}</p>`}`, 'vehicles');
  $$('[data-vk]').forEach((b) => (b.onclick = () => { S.vehKind = b.dataset.vk; viewVehicles(); }));
  $$('[data-av]').forEach((b) => (b.onclick = () => { S.vehAvail = b.dataset.av; viewVehicles(); }));
  // CSV = angezeigte Auswahl in angezeigter Reihenfolge (Filter, Suche, Sortierung); ungefiltert der ganze Bestand (20.10.2026)
  const vcsv = $('#vcsv'); if (vcsv) vcsv.onclick = async () => { try {
    const vis = $$('#vl a').filter((a) => !a.hidden).map((a) => decodeURIComponent(a.getAttribute('href').split('/').pop()));
    const sel = vis.length < vs.length || S.vehSort && S.vehSort !== 'plate' ? '&ids=' + encodeURIComponent(vis.join(',')) : '';
    download(await api('GET', '/api/vehicles?format=csv' + (inact ? '&inactive=1' : '') + sel), `fuhrpark-fahrzeuge_${envFn()}${inact ? '_ausser-betrieb' : ''}_${bDate()}.csv`); } catch (err) { toast(err.message, true); } };
  const vsite = $('#vsite'); if (vsite) vsite.onchange = () => { S.vehSite = vsite.value; viewVehicles(); };
  const vsort = $('#vsort'); if (vsort) vsort.onchange = () => { S.vehSort = sortPref('vehicles', VEH_SORTS, 'plate', VEH_SORTS.includes(vsort.value) ? vsort.value : 'plate'); viewVehicles(); };
  const ia = $('#inact'); if (ia) ia.onchange = () => { S.vehInactive = ia.checked; viewVehicles(); };
  const nvf = $('#nvf'); if (nvf) nvf.onsubmit = async (e) => { e.preventDefault(); try { const r = await saveVehicleForm(nvf); toast('✓'); location.hash = '#/vehicles/' + encodeURIComponent(r.id); } catch (err) { toast(err.message, true); } };
  // Ausdruck: gewählte Auswahl (Art, Verfügbarkeit, Standort, außer Betrieb), Suche, Sortierung und Anzahl sichtbarer Fahrzeuge
  const avLabel = av === 'all' ? '' : av === 'coupled_locked' ? t('av_coupled_locked') : av === 'with_notes' ? t('vnotes_with') : av === 'maint_overdue' ? t('av_maint_overdue') : av === 'recall_open' ? t('av_recall_open') : av === 'dormant' ? t('eval_excluded') : t('av_' + av); // Backlog 483: „ruhend“ wie der Knopf (vorher „av_dormant“ im Druckkopf)
  const vPrint = () => { const qq = $('#q').value.trim(); $('#vprl').innerHTML = printHead([
    `${t('print_filter')}: ${[inact ? t('inactive_vehicles') : '', f !== 'all' ? t('vk_' + f) : '', avLabel, site ? `${t('site')} ${site === 'ohne' ? t('cs_nosite') : site}` : ''].filter(Boolean).join(', ') || t('filter_all')}`,
    qq ? `${t('print_search')}: „${qq}“` : '', S.me.role !== 'driver' ? `${t('sort_by')}: ${t('vsort_' + so)}` : '', t('print_count').replace('{n}', $$('#vl a').filter((a) => !a.hidden).length)]); };
  vPrint();
  const vprt = $('#vprt'); if (vprt) vprt.onclick = () => window.print();
  let vAnn = null;
  $('#q').oninput = () => { const q = searchKey($('#q').value); $$('#vl a').forEach((a) => (a.hidden = q && !searchKey(a.dataset.s).includes(q))); vPrint();
    // Trefferzahl für Screenreader (Liste wird nur ausgeblendet), entprellt; sichtbar „keine Treffer“ bei leerer Liste
    const n = $$('#vl a').filter((a) => !a.hidden).length; const nh = $('#vnohit'); if (nh) nh.hidden = !(q && !n);
    clearTimeout(vAnn); vAnn = setTimeout(() => announceHits(n), 400); };
}
// Gespann (feste Kopplung laut Stammliste): Sperre/Werkstatt des gekoppelten Fahrzeugs anzeigen – nur Information
const coupledLockedText = (c) => `${t(c.kind === 'anhaenger' ? 'trailer' : 'truck')} ${c.plate}: ${t('locked')} – ${t('do_not_drive')}`;
function coupledLockedChip(c) {
  if (!c || !c.locked) return '';
  return `<span class="chip kritisch">${esc(coupledLockedText(c))}</span>`;
}
// Melde-/Kontrollformular: gesperrter Anhänger bzw. gesperrtes Zugfahrzeug des gewählten eigenen Fahrzeugs
// Abfahrtskontrolle: Sperre des gewählten Fahrzeugs (Liste oder „Meine Fahrzeuge“) + gekoppeltes Fahrzeug + bekannte Mängel (23.10.2026)
// Gekoppeltes Fahrzeug eines eigenen Fahrzeugs (z. B. Anhänger ohne eigene Zuordnung): Sperre und bekannte Mängel aus „Mein Fahrzeug“ (Backlog 202)
function coupledKnown(known, id) { const p = known.find((x) => x.coupled && x.coupled.id === id); return p ? { locked: p.coupled.locked, known_defects: p.coupled.known_defects || [], open_items_after_release: p.coupled.open_items_after_release || [], notes: p.notes || [] } : null; }

// „(heute)“ hinter einem geplanten Termin in Listen (Backlog 209: Prüftermin heute in der Fahrzeugliste nicht erkennbar – Ersatzsuche)
// Backlog 484 (Blickwinkel „Disposition plant abends den nächsten Tag“): Termin morgen ebenso markieren (Berliner Datum)
const todayMark = (d) => (d && d === bDate() ? ` <b data-today>(${esc(t('today'))})</b>` : d && d === bDate(1) ? ` <b data-tomorrow>(${esc(t('tomorrow'))})</b>` : '');
function departureLockBox(sv, kv) {
  const locked = (kv && kv.locked) || (sv && sv.availability === 'gesperrt');
  const c = (kv && kv.coupled) || (sv && sv.coupled && sv.coupled.availability === 'gesperrt' ? { ...sv.coupled, locked: true } : null);
  // Backlog 508: heute (Berlin) liegt für das Fahrzeug schon eine Kontrolle vor – z. B. auf dem zweiten Gerät erfasst; nur Hinweis, keine Sperre, kein Name
  const today = sv && sv.last_check_at && BERLIN_FMT.format(new Date(sv.last_check_at)) === bDate() ? `<p class="panel small" role="status" data-dctoday style="margin:0 0 8px">${esc(t('dc_today_done').replace('{t}', fmtDT(sv.last_check_at)).replace('{r}', t(sv.last_check_result === 'maengel' ? 'dc_today_def' : 'dc_today_ok')))}</p>` : '';
  return (sv ? outboxVehAlert(sv.id) : '') + today + (locked ? `<div class="alert" role="alert" style="margin-bottom:8px"><b>${esc(t('scan_locked'))}</b></div>` : '') + coupledAlert(c) + (kv ? drvNotes(kv.notes) + knownDefects(kv.known_defects) + relItems(kv.open_items_after_release) + coupledDefects(kv.coupled) : '');
}
const lockedWarn = (r) => (r && r.vehicle_locked ? ` · ${t('locked')} – ${t('do_not_drive')}` : '') + (r && r.coupled_locked ? ` · ${coupledLockedText(r.coupled_locked)}` : ''); // gekoppeltes Gespann gesperrt (23.10.2026)
const coupledAlert = (c) => (c && c.locked ? `<div class="alert" role="alert" style="margin-bottom:8px">${esc(coupledLockedText(c))}</div>` : '');
function coupledChip(c) {
  if (!c) return '';
  const who = `${esc(t(c.kind === 'anhaenger' ? 'trailer' : 'truck'))} ${esc(c.plate)}`;
  let h = '';
  if (['gesperrt', 'werkstatt', 'meldung_offen'].includes(c.availability)) h += `<span class="chip ${c.availability === 'gesperrt' ? 'kritisch' : 'mittel'}" data-cav>${who}: ${esc(t('av_' + c.availability))}</span> `;
  // Prüfstand des gekoppelten Fahrzeugs (gleiche Regel wie „Prüfung/Wartung überfällig“; ruhende nicht) – sonst wählt die Disposition ein Gespann mit überfälligem Anhänger
  if (c.failed_inspection) h += `<b class="chip kritisch" data-cfail>${who}: ${esc(t('insp_failed_chip'))}</b> `;
  else if (c.reinspection_open && !c.eval_excluded) h += `<span class="chip mittel" data-creinsp title="${esc(t('reinsp_open_title'))}">${who}: ${esc(t('reinsp_open_chip'))}</span> `; // Backlog 618
  if (!c.eval_excluded && ((c.next_due && c.next_due < bDate()) || (c.km_remaining !== null && c.km_remaining !== undefined && c.km_remaining < 0))) h += `<b class="chip kritisch" data-cover>${who}: ${esc(t('av_maint_overdue'))}</b> `;
  return h;
}
// Fälligkeit nach Kilometern: belegter Wert (due_km) oder letzte Durchführung in km + Intervall (gleiche Regel wie Server)
// Reifenpositionen: gespeichert als Kürzel (VA-L, HA-L-aussen, AH1-R, Reserve …); Deutsch zeigt das Kürzel, UK/EN Klartext (19.10.2026)
const posL = (code) => posWord(code, S.lang); // gemeinsame Übersetzung mit den Agentenbefunden (public/finding-messages.js)
const fmtKm = (n) => fmtNum(n) + (S.lang === 'uk' ? ' км' : ' km'); // UK-Texte nutzen „км“ (19.10.2026)
// ebenso mm/bar (20.10.2026: UK zeigte „2,8 mm“ neben „< 1,6 мм“)
const fmtMm = (n) => fmtNum(n) + (S.lang === 'uk' ? ' мм' : ' mm');




// Prognose der km-Fälligkeit (Server: aus gespeicherten km-Ständen, nur Planungshilfe) – Begründung als Tooltip und für Screenreader
const kmFcHint = (fc) => t('km_forecast_hint').replace('{from}', fmtD(fc.from)).replace('{to}', fmtD(fc.to)).replace('{kpd}', fmtNum(fc.km_per_day));
// Listen: Begründung als Tooltip und für Screenreader; Fahrzeugakte (short): Begründung steht sichtbar in der Nachweiszeile darunter
const kmFcHtml = (fc, short = false) => `<span class="km-fc" title="${esc(kmFcHint(fc))}">${esc(t('km_forecast').replace('{d}', fmtD(fc.date)))}${short ? '' : `<span class="sr-only"> – ${esc(kmFcHint(fc))}</span>`}</span>`;


const mY = (d) => (d ? `${d.slice(5, 7)}/${d.slice(0, 4)}` : '–');

// HU/SP-Hinweis in der App-Sprache (Server liefert deutschen Text + Code mit Werten; Deutsch = Servertext)
function huNote(x, i) {
  const c = (x.note_codes || [])[i];
  if (!c || S.lang === 'de') return x.notes[i];
  const k = 'hn_' + c.code; const s = t(k);
  return s === k ? x.notes[i] : s.replace(/\{(\w+)\}/g, (m, n) => (n in (c.p || {}) ? isoDay(c.p[n]) : m));
}



// Werkstatt zum Fahrzeugstandort (22.10.2026, Teilagent Standortschlüssel): Name enthält den Standort oder Code = Standort in Umschrift
// (München/Muenchen/MÜNCHEN → MUENCHEN, NFC); ohne Treffer leer – vorher wählte der Browser still die erste Werkstatt (Dortmund)
const wsTranslit = (x) => String(x || '').normalize('NFC').trim().toLocaleLowerCase('de').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
function wsForSite(site) {
  const k = wsTranslit(site); if (!k) return '';
  // über den Namen nur bei genau einem Treffer (23.10.2026: „Hamburg“ wählte bei Hamburg-Nord/-Süd einfach die erste, „e“ jede)
  const byName = S.meta.workshops.filter((x) => wsTranslit(x.name).includes(k));
  const w = S.meta.workshops.find((x) => wsTranslit(x.code) === k) || (byName.length === 1 ? byName[0] : null);
  return w ? w.code : '';
}
const wsOptions = (site) => `${site ? '' : '<option value="" selected>–</option>'}${S.meta.workshops.map((w) => `<option value="${esc(w.code)}"${w.code === site ? ' selected' : ''}>${esc(wsLabel(w))}</option>`).join('')}`;
// Werkstattauftrag aus Prüftermin (nur Leitung): offener Auftrag als Link, sonst Formular
function maintOrderHtml(rid, kind, orders, v) {
  if (!isMgr() || !rid) return '';
  const o = orders && orders.get(rid);
  if (o) return `<p class="small">🔧 <a href="#/cases/${esc(o.id)}">${esc(t('mo_open'))} ${esc(o.case_no)}</a> · ${esc(t('st_' + o.status))}</p>`;
  const site = wsForSite(v && v.site);
  return `<details class="noprint"><summary>${esc(t('mo_create'))}</summary><form data-mord="${esc(rid)}"><label>${esc(t('workshop'))} (${esc(mk(kind))})</label><select name="workshop_site">${wsOptions(site)}</select><label>${esc(t('urgency'))}</label><select name="priority"><option value="niedrig">${esc(t('prio_niedrig'))}</option><option value="mittel">${esc(t('prio_mittel'))}</option></select><label>${esc(t('note'))}</label><input name="note" maxlength="300"><p class="small muted">${esc(t('mo_hint'))}</p>${v && v.svc && v.svc.length ? `<p class="small" role="note" data-mosvc>⚠ ${esc(t('mo_svc_hint').replace('{list}', () => v.svc.map((c) => c.partner + (c.contract_no ? ' (' + c.contract_no + ')' : '')).join(', ')))}</p>` : ''}<div class="actions"><button class="btn secondary">${esc(t('mo_create'))}</button></div></form></details>`;
}
const DEFECT_RESULTS = ['erhebliche_maengel', 'gefaehrliche_maengel', 'verkehrsunsicher'];





 // wie Server NOTES_MAX_ACTIVE (src/vnotes.js)


async function viewVehicle(...a) { return (await lazyModule('fahrzeug')).viewVehicle(...a); }


// ---------- Fahrzeugverträge (Leasing/Miete/…; nur Inhaber/Fuhrparkleitung) ----------
const CT_KINDS = ['leasing', 'miete', 'finanzierung', 'versicherung', 'wartung', 'sonstiges'];
const CT_CLS = { handeln: 'kritisch', hinweis: 'mittel', ok: 'ok', beendet: '' };
const ctChip = (s) => `<span class="chip ${CT_CLS[s.overall]}">${esc(t('cs_' + s.overall))}</span>`;
// noEvidence: ohne Nachweis-Zeile (Übersicht) – „Beendet am … · Grund“ bleibt (18.10.2026: slice(0, -1) schnitt bei beendeten Verträgen genau diese ab)
function ctLines(c, { noEvidence = false } = {}) {
  const s = c.status; const out = [];
  if (c.start_date || c.end_date) out.push(`${c.start_date ? `${esc(t('ct_start'))}: ${fmtD(c.start_date)} · ` : ''}${esc(t('ct_end'))}: ${c.end_date ? `<b>${fmtD(c.end_date)}</b>` : '–'}${s.end && s.end.status === 'abgelaufen' ? ` <span class="chip kritisch" style="white-space:normal">${esc(t('ct_overdue'))}</span>` : s.end && s.end.status === 'laeuft_aus' ? ` <span class="chip mittel">${esc(t('cs_hinweis'))}</span>` : ''}`);
  if (s.notice) out.push(`${esc(t('ct_notice_by'))}: <b>${fmtD(s.notice.by)}</b> · ${esc(t('ct_notice'))}: ${esc(String(c.notice_months))}${s.notice.status === 'bald' ? ` <span class="chip mittel">${esc(t('cs_hinweis'))}</span>` : s.notice.status === 'verstrichen' ? ` <span class="chip">${esc(t('ct_notice_passed'))}</span>` : ''}`);
  if (s.km) {
    if (s.km.driven !== undefined) out.push(`${esc(t('ct_km_allow'))}: ${fmtKm(c.km_allowance)} · ${esc(t('ct_driven'))}: ${fmtKm(s.km.driven)}${s.km.measured_at ? ` <span class="small muted" data-ct-read>(${esc(t('ct_km_read'))} ${fmtD(s.km.measured_at)})</span>` : ''} · ${esc(t('ct_left'))}: ${fmtKm(Math.max(0, s.km.remaining))}${s.km.status === 'ueber' ? ` <span class="chip kritisch">${esc(t('ct_km_over'))}</span> · ${esc(t('ct_km_excess'))}: <b>${fmtKm(-s.km.remaining)}</b>` : ''}${s.km.forecast_driven ? `<br>${esc(t('ct_forecast'))}: <span class="chip ${s.km.status === 'prognose_ueber' ? 'mittel' : ''}">≈ ${fmtKm(s.km.forecast_driven)}</span> <span class="small muted">(${esc(t('ct_forecast_hint'))})</span>` : ''}`);
    else if (s.km.status === 'zaehler') out.push(`${esc(t('ct_km_allow'))}: ${fmtKm(c.km_allowance)} · <span class="chip mittel" style="white-space:normal">${esc(t('ct_km_counter_drop').replace('{d}', fmtD(s.km.drop_at)))}</span>`);
    else if (s.km.status === 'unter_start') out.push(`${esc(t('ct_km_allow'))}: ${fmtKm(c.km_allowance)} · <span class="chip mittel" style="white-space:normal" data-ct-below>${esc(t('ct_km_below').replace('{km}', fmtKm(s.km.current_km)).replace('{start}', fmtKm(s.km.start_km)))}</span>`);
    else out.push(`${esc(t('ct_km_allow'))}: ${fmtKm(c.km_allowance)} · <span class="muted">${esc(t('ct_km_none'))}</span>`);
  }
  // letzte Ablesung zum Stichtag/bis „Beendet am“ auch ohne berechenbare Kontingent-Zeile (Backlog 241: ohne Kontingent, nach Tachotausch,
  // „km bei Übernahme“ fehlt) – der Stand für die Meldung an den Leasinggeber, mit Herkunft; nie geschätzt
  // Backlog 601: auch bei Kontingent-Zeile – der km-Stand ist die Zahl, die der Leasinggeber abfragt (vorher nur in der CSV)
  if (c.reading) out.push(`<span data-ctread>${esc(t('km'))}: ${fmtKm(c.reading.km)} <span class="small muted">(${esc(t('ct_km_read'))} ${fmtD(c.reading.measured_at)}${c.reading.source ? ' · ' + esc(odoSrc(c.reading.source)) : ''})</span></span>`);
  // Backlog 512: Leasing/Miete eines Lkw ohne Kontingent und ohne jede Ablesung (bis Stichtag) – gleiche Regel wie die CSV (`noReading`)
  if (c.no_reading) out.push(`<span class="muted" data-ctnoread>${esc(t('ct_km_noread'))}</span>`);
  if (c.monthly_rate_net !== null) out.push(`${esc(t('ct_rate'))}: ${eur(c.monthly_rate_net)}`);
  if (!noEvidence) out.push(`<span class="small muted">${esc(t('evidence'))}: ${esc(c.evidence)}${c.note ? ' · ' + esc(c.note) : ''}</span>`);
  if (c.ended_on) out.push(`<span class="small">${esc(t('ct_ended_on'))} ${fmtD(c.ended_on)}${c.end_note ? ' · ' + esc(c.end_note) : ''}</span>`);
  return out;
}





// Backlog 288 (Leasingrückgabe): offene Vorgänge/Restarbeiten am Fahrzeug, wenn Leasing/Miete bald endet bzw. abgelaufen ist
function ctRet(rc) {
  if (!rc) return '';
  const parts = [rc.open_cases ? t('ct_ret_open').replace('{n}', rc.open_cases) : '', rc.open_items ? t('ct_ret_items').replace('{n}', rc.open_items) : ''].filter(Boolean);
  return `<span class="sub" data-ct-ret style="white-space:normal"><span class="chip ${parts.length ? 'mittel' : 'ok'}" style="white-space:normal">${esc(t('ct_ret'))}: ${esc(parts.length ? parts.join(' · ') : t('ct_ret_clear'))}</span></span>`;
}



async function viewContracts(...a) { return (await lazyModule('verwaltung')).viewContracts(...a); }

// Reifenalter in Monaten → „6 J. 9 Mon.“ bzw. „9 Mon.“
const tireAge = (m) => (m === null || m === undefined ? '' : m >= 12 ? t('tire_age_years').replace('{y}', Math.floor(m / 12)).replace('{m}', m % 12) : t('tire_age_months').replace('{n}', m));



// Backlog 514: beim Werkstattwechsel entfallen Termin und Übernahme der bisherigen Werkstatt (Server: planned_date/workshop_ack_at = null)
const rwsDrop = (c) => (c.planned_date ? `<p class="small muted" data-rwsdrop>${esc(t('rws_drop_plan').replace('{d}', fmtD(c.planned_date)))}</p>` : c.workshop_ack_at ? `<p class="small muted" data-rwsdrop>${esc(t('rws_drop_ack'))}</p>` : '');
// Backlog 521: offener Winterauftrag mit Termin bzw. „ohne Termin“ (Winterlisten der Reifen-Flotte, Werkstatt-Startseite, Disposition)
const woApptTxt = (o) => `🔧 ${esc(t('mo_open'))} ${esc(o.case_no)} · ${o.planned_date ? `${esc(t('planned_appt'))} ${fmtD(o.planned_date)}` : esc(t('ms_ohne_termin'))}`;
async function loadStockSelect(c) {
  const el = $('#stocksel'); if (!el) return;
  let items = [];
  let siteItems = [];
  try { siteItems = (await api('GET', `/api/stock?site=${encodeURIComponent(c.workshop_site || '')}`)).items.filter((i) => i.site === c.workshop_site); items = siteItems.filter((i) => i.on_hand > 0); } catch { return; }
  // Backlog 515 (Blickwinkel „Werkstatt Bayern vertritt Dortmund“): angeboten wird nur das Lager der zuständigen Werkstatt – Name nennen; geführtes
  // Lager ohne Bestand → kurzer Hinweis statt still fehlender Auswahl
  if (!items.length) { if (siteItems.length && c.workshop_site) el.innerHTML = `<p class="small muted" data-stocknone>${esc(t('stock_none_ws').replace('{ws}', wsName(c.workshop_site)))}</p>`; return; }
  el.innerHTML = `<label>${esc(t('from_stock'))}: ${esc(wsName(c.workshop_site))}</label><select name="stock_item_id"><option value="">${esc(t('without_stock'))}</option>${items.map((i) => `<option value="${esc(i.id)}">${esc(i.name)}${i.part_number ? ' · ' + esc(i.part_number) : ''} (${fmtNum(i.on_hand)} ${esc(unitL(i.unit))})</option>`).join('')}</select><p class="small muted" id="stockpricehint" hidden>${esc(t('stock_out_price_hint'))}</p>`;
  const sel = $('select', el); el._items = items;
  sel.onchange = () => {
    const fp = $('#freepart'); fp.querySelector('[name=name]').required = !sel.value; $$('[name=name],[name=part_number],[name=supplier]', fp).forEach((x) => { x.disabled = !!sel.value; });
    // Lagerartikel mit Preis: der Server bucht den Artikelpreis – Preisfeld sperren und Hinweis zeigen (19.10.2026: Eingabe wurde still ersetzt)
    const it = items.find((i) => i.id === sel.value); const fixed = !!it && it.unit_price_net !== null && it.unit_price_net !== undefined;
    const pr = el.closest('form') && el.closest('form').querySelector('[name=unit_price_net]');
    if (pr) { pr.disabled = fixed; if (fixed) pr.value = ''; }
    // … und „Schätzung“ ebenso (fester Artikelpreis ist kein Schätzwert, 22.10.2026)
    const es = el.closest('form') && el.closest('form').querySelector('[name=estimate]');
    if (es) { es.disabled = fixed; if (fixed) es.checked = false; }
    $('#stockpricehint').hidden = !fixed;
    qtyCheck();
  };
  // Menge über dem angezeigten Bestand: Hinweis schon vor dem Speichern (Backlog 234; der Server prüft weiterhin verbindlich)
  const qf = el.closest('form') && el.closest('form').querySelector('[name=quantity]');
  const qtyCheck = () => {
    let h = $('#stockqty'); const it = items.find((i) => i.id === sel.value);
    const raw = qf ? String(qf.value).trim() : ''; const q = Number(raw.replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.'));
    const over = !!it && raw !== '' && Number.isFinite(q) && q > it.on_hand + 1e-9;
    if (!over) { if (h) h.remove(); return; }
    if (!h) { h = document.createElement('p'); h.id = 'stockqty'; h.className = 'small panel warn'; h.setAttribute('role', 'status'); qf.after(h); }
    h.textContent = t('stock_qty_over').replace('{q}', fmtNum(it.on_hand)).replace('{u}', unitL(it.unit)).replace(/\.\.(?=\s|$)/g, '.');
  };
  if (qf) qf.addEventListener('input', qtyCheck);
}

// Zwei Aufträge greifen auf denselben Lagerartikel (Backlog 232): die Auswahl zeigte nach der Abweisung weiter den Bestand vom Öffnen
// („(1 Stk)“). Jetzt Menge aus der Serverantwort, Hinweis am Feld; ist nichts mehr da, Artikel gesperrt und Name/Teilenummer ins Freitextteil.
function stockShortfall(itemId, data) {
  const el = $('#stocksel'); const sel = el && $('select', el);
  if (!sel || !data || typeof data.available !== 'number') return;
  const o = [...sel.options].find((x) => x.value === itemId); if (!o) return;
  const q = fmtNum(data.available), u = unitL(data.unit);
  o.textContent = o.textContent.replace(/ \([^()]*\)$/, '') + ` (${q} ${u})`;
  let h = $('#stockshort'); if (!h) { h = document.createElement('p'); h.id = 'stockshort'; h.className = 'small panel warn'; h.setAttribute('role', 'status'); sel.after(h); }
  h.textContent = t('stock_short_inline').replace('{q}', q).replace('{u}', u).replace(/\.\.(?=\s|$)/g, '.'); // „шт..“ (Einheit mit Punkt am Satzende)
  const it = (el._items || []).find((i) => i.id === itemId);
  if (data.available <= 0) {
    o.disabled = true;
    if (sel.value === itemId) {
      sel.value = ''; sel.onchange();
      const fp = $('#freepart');
      if (fp && it) { const n = fp.querySelector('[name=name]'), pn = fp.querySelector('[name=part_number]'); if (n && !n.value) n.value = it.name; if (pn && !pn.value && it.part_number) pn.value = it.part_number; }
      h.textContent += ' ' + t('stock_short_out');
    }
  } else if (it) it.on_hand = data.available;
  if (sel.onchange) sel.onchange();
  sel.focus();
}

// Fremdleistung mit bereits gebuchter Rechnungsnummer (Backlog 233): Fundstellen im Formular, Häkchen zum ausdrücklichen Bestätigen
function dupInvoiceHint(data) {
  const f = $('#af'); const inv = f && f.querySelector('[name=invoice_no]'); if (!inv || !data || !Array.isArray(data.matches)) return;
  const li = data.matches.map((m) => `<li><a href="#/cases/${esc(m.case_id)}">${esc(m.case_no)}</a>${m.same_case ? ` (${esc(t('dup_invoice_this_case'))})` : ''} · ${esc(m.supplier || '–')} · ${esc(eur(m.amount_net))} · ${esc(fmtD(m.booked_at))}</li>`).join('');
  let h = $('#dupinv'); if (!h) { h = document.createElement('div'); h.id = 'dupinv'; h.className = 'panel warn small'; h.setAttribute('role', 'status'); inv.after(h); }
  h.innerHTML = `<p>${esc(t('dup_invoice_hint').replace('{no}', data.invoice_no || inv.value))}</p><ul>${li}</ul><label class="check"><input type="checkbox" name="confirm_duplicate_invoice"> ${esc(t('dup_invoice_confirm'))}</label>`;
  // andere Nummer eingetippt → Bestätigung gilt nicht mehr
  inv.oninput = () => { const x = $('#dupinv'); if (x) x.remove(); inv.oninput = null; };
  h.querySelector('input').focus();
}

async function viewStock(...a) { return (await lazyModule('lager')).viewStock(...a); }

async function viewStockCount(...a) { return (await lazyModule('lager')).viewStockCount(...a); }

async function viewReorder(...a) { return (await lazyModule('lager')).viewReorder(...a); }

async function viewStockAsOf(...a) { return (await lazyModule('lager')).viewStockAsOf(...a); }

async function viewStockJournal(...a) { return (await lazyModule('lager')).viewStockJournal(...a); }

async function viewStockReceipt(...a) { return (await lazyModule('lager')).viewStockReceipt(...a); }


// Backlog 443: „Wo noch verbaut?“ an einer Teilenummer im Vorgang – belegt die Suche der Teile-Verwendung vor (vor dem Seitenwechsel)
document.addEventListener('click', (e) => { const a = e.target && e.target.closest ? e.target.closest('a[data-puq]') : null; if (!a) return; try { sessionStorage.setItem('cfp_pu_q', a.dataset.puq); sessionStorage.setItem('cfp_pu_from', ''); sessionStorage.setItem('cfp_pu_to', ''); } catch { /* ohne Sitzungsspeicher: leeres Suchfeld */ } });
async function viewPartsUsage(...a) { return (await lazyModule('lager')).viewPartsUsage(...a); }

async function viewStockItem(...a) { return (await lazyModule('lager')).viewStockItem(...a); }


async function viewFines(...a) { return (await lazyModule('verwaltung')).viewFines(...a); }





async function viewFine(...a) { return (await lazyModule('verwaltung')).viewFine(...a); }



// Umgebung im Dateinamen von Exporten (Test-Export hieß sonst wie ein Betriebsexport; 20.10.2026)
// Inhaber: Ansicht auf die Umgebung eines angetippten Pushs umstellen (Test-Vorgang in der Betriebsansicht → 404, 21.10.2026); true = gewechselt
function pushEnv(ev) {
  if (!S.me || S.me.role !== 'owner' || !['test', 'production'].includes(ev)) return false;
  const cur = S.viewEnv || S.me.environment; if (cur === ev) return false;
  S.viewEnv = ev; try { localStorage.setItem('cfp_env', ev); } catch { /* ohne Speicher nur für diese Sitzung */ }
  const es = document.getElementById('envsel'); if (es) es.value = ev;
  S.unread = 0; refreshUnread(); return true;
}
function envFn() { return (S.me && S.me.role === 'owner' && S.viewEnv) || (S.me && S.me.environment) || ''; }
// Werkstatt: Vorgänge/Werkstattplan nie nach Fahrzeugstandort vorfiltern – die Aufträge sind schon die der eigenen Werkstatt; ein versetzter Lkw
// (Stammdaten-Standort geändert) verschwand sonst mit laufendem Auftrag aus Liste und Plan, während die Startseite ihn zählte (22.10.2026)
const WS_NO_VSDEF = new Set(['caseVsite', 'planVsite']);
function vsDef(k) { return S[k] !== undefined ? S[k] : (S.me && S.me.role !== 'driver' && !(S.me.role === 'workshop' && WS_NO_VSDEF.has(k)) && S.me.home_site) || ''; }
function siteSelect(id, name, options, cur, label = t('site'), allLabel = t('all')) {
  return `<label for="${id}">${esc(label)}</label><select id="${id}"${name ? ` name="${name}"` : ''}><option value="">${esc(allLabel)}</option>${[...new Set([...(options || []), ...(cur ? [cur] : [])])].map((x) => `<option value="${esc(x)}"${x === cur ? ' selected' : ''}>${esc(x === 'ohne' ? t('cs_nosite') : x)}</option>`).join('')}</select>`;
}
// ---------- Kosten je Fahrzeug/Monat ----------
// Fehler beim Einschalten von Push: Browsermeldungen (englisch, z. B. „Registration failed - permission denied“) als übersetzter Hinweis
// mit Handlungsweg, Originaltext klein dahinter (23.10.2026, Teilagent „Disposition erster Tag“); Serverfehler (mit status) unverändert
function pushErrText(err) {
  if (!err || err.status || err.offline || err.code) return err && err.message ? err.message : String(err || '');
  const k = err.name === 'NotAllowedError' ? 'push_err_denied' : err.name === 'AbortError' || err.name === 'NetworkError' ? 'push_err_service' : err.name === 'InvalidStateError' ? 'push_err_state' : 'push_err_other';
  return `${t(k)}${err.message ? ` (${err.message})` : ''}`;
}
async function viewCosts(...a) { return (await lazyModule('verwaltung')).viewCosts(...a); }

// ---------- Fahrerakte (personenbezogen: nur Inhaber/Fuhrparkleitung, Fahrer nur eigene Akte) ----------

async function viewDriverRecords(...a) { return (await lazyModule('verwaltung')).viewDriverRecords(...a); }






async function viewDrivers(...a) { return (await lazyModule('verwaltung')).viewDrivers(...a); }
async function viewDriver(...a) { return (await lazyModule('verwaltung')).viewDriver(...a); }

// Vom Server erzeugte Verlaufsvermerke (Kontrolle, erneut festgestellt) in der Oberflächensprache (17.10.2026: blieben deutsch);
// Freitext unverändert. Muster wie in src/cases.js (createInspection).
// Verlauf „alt → neu“ in der App-Sprache: Priorität übersetzt, Werkstattname statt Code, Datum im Sprachformat; Wiedervorlage/Termin auch
// beim ersten Setzen bzw. Entfernen (19.10.2026: „mittel → niedrig“, „DORTMUND → MUENCHEN“, ISO-Datum; Wiedervorlage ohne Inhalt)
// Herkunft eines km-Stands lesbar (19.10.2026: Zeitleiste zeigte „manuell:fleet“)
function odoSrc(s) {
  const v = String(s || ''); if (!v) return '';
  if (v.startsWith('manuell:')) return `${t('odo_src_manual')} (${t('role_' + v.slice(8))})`;
  // Server speichert „kontrolle:<art>“ und „telematik:<anbieter>“ (19.10.2026: Zeitleiste zeigte den Code)
  if (v === 'kontrolle' || v === 'kontrolle:abfahrt') return t('departure_check');
  if (v === 'kontrolle:nach_reparatur') return t('inspection');
  if (v.startsWith('telematik:')) return `${t('area_telematics')} (${provL(v.slice(10))})`;
  if (v === 'import') return t('odo_src_import');
  if (v.startsWith('wartung:')) return mk(v.slice(8));
  return v;
}
function evFromTo(e) {
  const p = e.payload; if (!p || typeof p !== 'object' || !('from' in p) || !('to' in p)) return '';
  if (e.action === 'parts_partial') return ''; // eigene Zeile „Rest erwartet am“ (Backlog 449)
  const oneSide = ['set_followup', 'set_planned_date', 'set_vehicle_location', 'set_handover', 'set_occurred_at'].includes(e.action) || /^\d{4}-\d{2}-\d{2}$/.test(String(p.from || p.to || ''));
  if (!(p.from && p.to) && !oneSide) return '';
  if (!p.from && !p.to) return '';
  const v = (x) => { if (x === null || x === undefined || x === '') return '–';
    if (e.action === 'change_priority') return t('prio_' + x);
    if (e.action === 'reassign_workshop') return wsName(x);
    if (e.action === 'set_vehicle_location' && typeof x === 'object') return [x.location, x.service, x.on ? fmtD(x.on) : null].filter(Boolean).join(' · ') || '–';
    if (e.action === 'set_occurred_at') return fmtOccurred(x);
    if (e.action === 'set_handover' && typeof x === 'object') return `${t('ho_keys')}: ${t(x.keys ? 'ho_' + x.keys : 'ho_none')} · ${t('ho_papers')}: ${t(x.papers ? 'ho_' + x.papers : 'ho_none')}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(x))) return fmtD(x);
    return String(x); };
  // Hinweis zum Termin geändert (Migration 0093): eigene Zeile; reine Hinweisänderung (gleicher Termin) ohne „Termin → Termin“
  const pn = e.action === 'set_planned_date' && 'note_to' in p ? `<div class="small muted" data-ev-plannote>${esc(t('ev_plan_note'))}: ${esc(v(p.note_from))} → ${esc(v(p.note_to))}</div>` : '';
  if (pn && p.from === p.to) return pn;
  return `<div class="small muted">${esc(v(p.from))} → ${esc(v(p.to))}</div>${pn}`;
}
// Fahrzeug korrigiert mit ganzer Abfahrtskontrolle (Backlog 255): weitere Mängel und Verbleib des km-Stands
function cvInspText(p) {
  const parts = [t('cv_ev_insp')];
  if (Array.isArray(p.moved_cases) && p.moved_cases.length) parts.push(t('cv_ev_cases').replace('{l}', () => p.moved_cases.join(', ')));
  if (typeof p.with_case_no === 'string') parts.push(t('cv_ev_with').replace('{v}', () => p.with_case_no));
  if (p.km && Number.isFinite(Number(p.km.km))) parts.push(t(p.km.moved ? 'cv_ev_km_moved' : 'cv_ev_km_kept').replace('{km}', () => fmtNum(Number(p.km.km))));
  return parts.join(' · ');
}
function evNote(e) {
  const n = String(e.note || '');
  const p = e.payload || {};
  // Backlog 89 (18.10.2026): neue Einträge tragen Code + Werte im payload; Textmuster nur noch für ältere Einträge
  if (e.action === 'repeat_finding' && (p.code === 'repeat_departure_check' || p.code === 'repeat_repair_check') && typeof p.defect_note === 'string') return p.defect_note;
  if (e.action === 'inspection' && (p.code === 'inspection_defects' || p.code === 'inspection_ok')) {
    const k = p.km_rejected;
    const km = k && Number.isFinite(Number(k.km)) ? ' · ' + (k.next_km !== undefined ? t('ev_km_greater').replace('{km}', fmtNum(Number(k.km))).replace('{next}', fmtNum(Number(k.next_km))) : t('ev_km_smaller').replace('{km}', fmtNum(Number(k.km))).replace('{prev}', fmtNum(Number(k.previous_km)))) : '';
    return (p.code === 'inspection_defects' ? tn('ev_defects', Number(p.defects) || 0) : t('ev_no_defects')) + km;
  }
  // Abfahrtskontrolle trotz Sicherheitssperre (Backlog 252): Durchführungszeit und km-Stand in der Oberflächensprache
  if (e.action === 'checked_while_locked' && p.code === 'departure_check_while_locked') {
    const when = p.performed_at ? fmtDT(p.performed_at) : fmtDT(e.created_at);
    return Number.isFinite(Number(p.km)) && p.km !== null && p.km !== undefined ? t('ev_checked_locked_km').replace('{t}', when).replace('{km}', fmtNum(Number(p.km))) : t('ev_checked_locked').replace('{t}', when);
  }
  if (e.action === 'open_item_to_case' && typeof p.case_no === 'string') return t('oi_followup_ref').replace('{v}', () => p.case_no);
  // Kontrolle an das richtige Fahrzeug umgehängt (Backlog 255): Hinweis an Vorgängen des falschen Fahrzeugs
  if (e.action === 'inspection_moved' && p.code === 'inspection_moved' && typeof p.to === 'string') return t('ev_insp_moved').replace('{p}', () => p.to);
  if (e.action === 'repeat_finding') return n.replace(/^Erneut festgestellt \(Abfahrtskontrolle\): /, '');
  // Freigabe-Vermerk der Aufträge aus Prüftermin/Prüfmangel/Winterreifen (src/cases.js): Rahmen in der Oberflächensprache, Vermerk unverändert
  if (e.action === 'approve_repair') {
    let a;
    if ((a = n.match(/^Auftrag aus Prüftermin ([^:]{1,40}?)(?:: ([\s\S]*))?$/))) return t('ev_order_maint').replace('{k}', mk(a[1])) + (a[2] ? ': ' + a[2] : '');
    if ((a = n.match(/^Mängelbeseitigung aus ([^:]{1,40}?) vom (\d{2})\.(\d{2})\.(\d{4})(?:: ([\s\S]*))?$/))) return t('ev_order_defects').replace('{k}', mk(a[1])).replace('{d}', fmtD(`${a[4]}-${a[3]}-${a[2]}`)) + (a[5] ? ': ' + a[5] : '');
    if ((a = n.match(/^Auftrag Winterreifen(?:: ([\s\S]*))?$/))) return t('ev_order_winter') + (a[1] ? ': ' + a[1] : '');
  }
  if (e.action !== 'inspection') return n;
  const m = n.match(/^(?:(\d+) Mangel\/Mängel festgestellt|Kontrolle ohne Mängel)(?: · km-Stand (\d+) (?:größer als später erfasst \((\d+)\)|kleiner als zuletzt erfasst \((\d+)\)) – nicht in die Fahrzeugakte übernommen)?$/);
  if (!m) return n;
  const head = m[1] ? tn('ev_defects', Number(m[1])) : t('ev_no_defects');
  const km = m[2] ? ' · ' + (m[3] ? t('ev_km_greater').replace('{km}', fmtNum(Number(m[2]))).replace('{next}', fmtNum(Number(m[3]))) : t('ev_km_smaller').replace('{km}', fmtNum(Number(m[2]))).replace('{prev}', fmtNum(Number(m[4])))) : '';
  return head + km;
}
// Gewährleistung an Teil/Fremdleistung: „Gewährleistung bis …“ (abgelaufen gedämpft)
function warrChip(d) { return d ? ` <span class="chip${d >= bDate() ? ' ok' : ''}">${esc(t('warranty_until_d').replace('{d}', fmtD(d)))}</span>` : ''; }
// Kurzinfo zum Fahrzeug im Vorgang: weitere offene Vorgänge, bald fällige Prüfungen, letzter km-Stand (nur gespeicherte Daten)
function vehInfo(vi, c) {
  const prev = (vi && vi.previous_same_item) || [];
  const vn = (vi && vi.notes) || [];
  const wr = (vi && vi.warranties) || [];
  const ls = (vi && vi.lease_contracts) || []; // Backlog 290: nur Leitung
  // Backlog 467: in den 90 Tagen vor der Meldung abgeschlossene Vorgänge (ohne die schon unter „Gleicher Prüfpunkt“ genannten)
  const rc = ((vi && vi.recent_closed) || []).filter((o) => !prev.some((p) => p.id === o.id));
  const cpl = (vi && vi.coupled) || []; // Backlog 633: fest gekoppeltes Fahrzeug mit offenen Vorgängen
  if (!vi || (!cpl.length && !vi.other_open_total && !vi.inspections_due.length && !vi.last_km && !prev.length && !vn.length && !wr.length && !ls.length && !rc.length)) return '';
  const today = bDate();
  const parts = [];
  if (vi.other_open_total) parts.push(`<dt>${esc(t('vi_other_cases'))}</dt><dd>${vi.other_open_cases.map((o) => `<a href="#/cases/${esc(o.id)}">${esc(o.case_no)}</a> <span class="chip ${esc(o.priority)}">${esc(t('st_' + o.status))}</span>${o.safety_lock ? ` <span class="chip kritisch">${esc(t('locked'))}</span>` : ''}${o.description ? `<br><span class="small" data-ocdesc>${ltxt(clipTxt(cDesc(o.description), 90))}${o.created_at ? ` <span class="muted">· ${fmtDT(o.created_at)}</span>` : ''}</span>` : ''}`).join('<br>')}${vi.other_open_total > vi.other_open_cases.length ? `<br><span class="small muted">+${vi.other_open_total - vi.other_open_cases.length}</span>` : ''}</dd>`);
  for (const g of cpl) parts.unshift(`<dt>${esc(t('vi_coupled').replace('{p}', g.plate).replace('{k}', t(g.kind === 'anhaenger' ? 'trailer' : 'truck')))}</dt><dd data-vicoupled>${S.me.role !== 'workshop' ? `<a href="#/vehicles/${esc(g.vehicle_id)}">${esc(t('vehicle_file'))} ›</a>` : ''}${g.open_cases.length ? g.open_cases.map((o) => `<br><a href="#/cases/${esc(o.id)}">${esc(o.case_no)}</a> <span class="chip ${esc(o.priority)}">${esc(t('st_' + o.status))}</span>${o.safety_lock ? ` <span class="chip kritisch">${esc(t('locked'))}</span>` : ''}${o.claim ? ` <span class="chip" data-vicclaim>${esc(t('claim_title'))}: ${esc(o.claim.insurer || '')}${o.claim.claim_no ? ' · ' + esc(o.claim.claim_no) : ''}</span>` : ''}${o.description ? `<br><span class="small"${langAttr(o.description)}>${ltxt(clipTxt(cDesc(o.description), 80))}</span>` : ''}`).join('') : `<br><span class="small muted">${esc(t('vi_coupled_none'))}</span>`}</dd>`);
  if (vi.coupled_truncated) parts.unshift(`<dd class="small muted" data-vicoupledmore>${esc(t('vi_coupled_more'))}</dd>`);
  if (vi.inspections_due.length) parts.push(`<dt>${esc(t('vi_due').replace('{days}', nDays(vi.inspections_due_days || 30)))}${vi.inspections_due.some((m) => m.recall_ref) ? ' · ' + esc(t('vi_recalls')) : ''}</dt><dd>${vi.inspections_due.map((m) => `${esc(mkR(m))} ${m.next_due_date ? fmtD(m.next_due_date) : esc(t('vi_recall_open'))}${m.next_due_date && m.next_due_date < today ? ` <span class="chip kritisch">${esc(t('ms_ueberfaellig'))}</span>` : ''}${m.recall_ref ? ` <span class="small muted">(${esc(m.recall_ref)})</span>` : ''}`).join('<br>')}${(vi.inspections_due_total || 0) > vi.inspections_due.length ? `<br><span class="small muted" id="vidmore">+${vi.inspections_due_total - vi.inspections_due.length} · <a class="noprint" href="#/vehicles/${encodeURIComponent(c.vehicle_id)}">${esc(t('vi_due_all'))} ›</a></span>` : ''}</dd>`);
  if (rc.length) parts.push(`<dt>${esc(t('vi_recent_closed'))}</dt><dd data-virecent>${rc.map((o) => `${o.id ? `<a href="#/cases/${esc(o.id)}">${esc(o.case_no)}</a>` : `<b>${esc(o.case_no)}</b>`} <span class="chip">${esc(o.kind === 'released' ? t('st_fahrzeug_freigegeben') : t('vi_kind_' + o.kind))}</span> <span class="small muted">${fmtD(o.closed_at)}</span>${o.description ? `<br><span class="small">${ltxt(clipTxt(cDesc(o.description), 90))}</span>` : ''}${o.note ? `<br><span class="small muted">${esc(t('vi_close_note'))}: ${ltxt(clipTxt(o.note, 160))}</span>` : ''}`).join('<br>')}${vi.recent_closed_truncated ? `<br><span class="small muted">${esc(t('vi_recent_more'))} · <a class="noprint" href="#/vehicles/${encodeURIComponent(c.vehicle_id)}">${esc(t('vehicle_file'))} ›</a></span>` : ''}<div class="small muted">${esc(t('vi_recent_closed_hint'))}</div></dd>`);
  if (prev.length) parts.unshift(`<dt>${esc(t('vi_prev_same'))}</dt><dd>${prev.map((o) => `<a href="#/cases/${esc(o.id)}">${esc(o.case_no)}</a> · ${esc(t('st_fahrzeug_freigegeben'))} ${fmtD(o.closed_at)}`).join('<br>')}<div class="small muted">${esc(t('vi_prev_same_hint'))}</div></dd>`);
  if (wr.length) parts.unshift(`<dt>${esc(t('vi_warranty'))}</dt><dd>${wr.map((w) => `<a href="#/cases/${esc(w.case_id)}">${esc(w.case_no)}</a> · ${esc(w.item)}${w.item_kind === 'part' && w.supplier ? ` <span class="small muted">(${esc(supplierLabel(w.supplier))})</span>` : ''} · ${esc(t('warranty_until_d').replace('{d}', fmtD(w.warranty_until)))}`).join('<br>')}${vi.warranties_truncated ? `<div class="small" role="note" data-warrmore>${esc(t('warr_more').replace('{n}', vi.warranties_max))}</div>` : ''}<div class="small muted">${esc(t('vi_warranty_hint'))}</div></dd>`);
  // Backlog 414: Wartungs-/Full-Service-Verträge getrennt mit eigenem Hinweis (Leistungsumfang laut Vertrag)
  const svc = ls.filter((l) => l.kind === 'wartung'), lsl = ls.filter((l) => l.kind !== 'wartung');
  if (svc.length) parts.unshift(`<dt>${esc(t('vi_service'))}</dt><dd data-viservice>${svc.map((l) => `${esc(l.partner)}${l.contract_no ? ' · ' + esc(l.contract_no) : ''}${l.end_date ? ` <span class="small muted">${esc(t('vi_lease_until').replace('{d}', fmtD(l.end_date)))}</span>` : ''}`).join('<br>')}<div class="small muted">${esc(t('vi_service_hint'))}</div></dd>`);
  if (lsl.length) parts.unshift(`<dt>${esc(t('vi_lease'))}</dt><dd data-vilease>${lsl.map((l) => `${esc(t('ck_' + l.kind))} · ${esc(l.partner)}${l.contract_no ? ' · ' + esc(l.contract_no) : ''}${l.end_date ? ` <span class="small muted">${esc(t('vi_lease_until').replace('{d}', fmtD(l.end_date)))}</span>` : ''}`).join('<br>')}<div class="small muted">${esc(t('vi_lease_hint'))}</div></dd>`);
  if (vn.length) parts.unshift(`<dt>${esc(t('vnotes'))}</dt><dd>${vn.map((n) => `<b>ⓘ ${esc(n.text)}</b>${n.valid_until ? ` <span class="small muted">${esc(t('vnote_until').replace('{d}', fmtD(n.valid_until)))}</span>` : ''}`).join('<br>')}</dd>`);
  if (vi.last_km) parts.push(`<dt>${esc(t('km'))}</dt><dd>${fmtKm(vi.last_km.km)} <span class="small muted">(${fmtD(vi.last_km.measured_at)})</span></dd>`);
  return `<details class="small vinfo" style="margin-top:8px"${cpl.some((g) => g.open_cases.length) || vi.other_open_total || prev.length || rc.length || vn.length || wr.length || ls.length || vi.inspections_due.some((m) => m.recall_ref || (m.next_due_date && m.next_due_date < today)) ? ' open' : ''}><summary><b>${esc(t('vi_title'))}</b></summary><dl class="kv">${parts.join('')}</dl></details>`;
}

// Nach Scan des Fahrzeug-Aufklebers: Auswahl „Schaden melden“ / „Abfahrtskontrolle“ für dieses Fahrzeug
async function viewScan(id) {
  const vs = await vehiclesCached();
  const v = vs.find((x) => x.id === id);
  // Backlog 493: außer Betrieb genommenes Fahrzeug (nicht in der Liste) – Rollen mit Fahrzeugakte dorthin (zeigt „außer Betrieb“);
  // sonst wie bisher, Lesezugriff ohne Melderecht zur Startseite statt auf „keine Berechtigung“
  if (!v) {
    if (S.me.role !== 'driver' && /^VIN:[A-Z0-9]+$/.test(id)) { try { await api('GET', '/api/vehicles/' + encodeURIComponent(id)); location.hash = '#/vehicles/' + id; return; } catch (e) { if (e && e.status === 401) return; } }
    toast(t('qr_vehicle_unknown'), true); location.hash = mayReport() ? '#/new' : '#/'; return;
  }
  render(`<div>${plate(v.plate, { big: true, locked: v.availability === 'gesperrt' })}</div><h1 style="margin-top:12px">${esc(t('scan_title'))}</h1>
    ${v.availability === 'gesperrt' ? `<div class="panel alert" role="alert"><b>${esc(t('scan_locked'))}</b></div>` : ''}
    ${v.coupled && v.coupled.availability === 'gesperrt' ? `<div class="panel alert" role="alert"><b>${esc(coupledLockedText(v.coupled))}</b></div>` : ''}
    ${['werkstatt', 'meldung_offen'].includes(v.availability) ? `<p data-scanav>${S.me.role !== 'driver' ? `<a href="#/vehicles/${esc(v.id)}" class="chip mittel" style="display:inline-block;min-height:24px;padding:4px 10px">${esc(t('av_' + v.availability))}</a>` : `<span class="chip mittel">${esc(t('av_' + v.availability))}</span>`}</p>` : ''}
    <div class="list">${mayReport() ? `<a class="row" href="#/new/${esc(v.id)}"><span>⚠</span><span class="title">${esc(t('report_damage'))}</span><span></span></a>` : ''}
    ${mayCheck() ? `<a class="row" href="#/check/${esc(v.id)}"><span>✓</span><span class="title">${esc(t('departure_check'))}</span><span></span></a>` : ''}
    <a class="row" href="#/emergency?v=${esc(v.id)}"><span>☎</span><span class="title">${esc(t('em_title'))}</span><span></span></a>
    ${S.me.role !== 'driver' ? `<a class="row" href="#/vehicles/${esc(v.id)}"><span>${ICON.truck}</span><span class="title">${esc(t('vehicle_file'))}</span><span></span></a>` : ''}</div>`, 'new');
}

// ---------- Panne & Notfall: Rufnummern für unterwegs (vom Betrieb eingetragen; fest nur Notruf 112) ----------
// „+49 (0)231 …“ → tel:+49231… (die (0) wird international nicht gewählt; vorher wählte der Link +490231…, 18.10.2026)
const telHref = (p) => 'tel:' + String(p).trim().replace(/^((?:\+|00)[\d\s]*?)\s*\(0\)/, '$1').replace(/[^\d+]/g, '');
// Fahrer im Ausland (Backlog 217, 24.10.2026): Nummer im deutschen Inlandsformat („0231 …“, „(0231) …“; nicht „00…“, keine Kurzwahl)
// wählt ein Handy im Ausland nicht → zusätzlich „+49 …“ anbieten. Annahme deutsche Nummer (wie phoneKey im Server); der Link selbst bleibt unverändert.
const telAbroad = (p) => { const s = String(p).trim(); if (!/^\(?0[1-9]/.test(s)) return null; const label = '+49 ' + s.replace(/^\(0([^)]*)\)\s*/, '$1 ').replace(/^0/, '').trim(); return { label, href: telHref(label) }; };

// Erreichbarkeit laut Eintrag (Backlog 427): „Mo–Fr 06:00–18:00“, „Sa, So ganztags“, „Fr 18:00–06:00 (bis zum Folgetag)“, „nicht an Feiertagen“
const emWinText = (w) => `${dayRanges(w.days).map(([a, b]) => (a === b ? t('em_wd_' + a) : `${t('em_wd_' + a)}${b === a + 1 ? ', ' : '–'}${t('em_wd_' + b)}`)).join(', ')} ${w.from ? `${w.from}–${w.to}${w.to <= w.from ? ` (${t('em_overnight')})` : ''}` : t('em_allday')}`;
// Backlog 430: mehrere Zeitspannen mit „; “ (z. B. „Fr, So 18:00–06:00 (bis zum Folgetag); Sa, So ganztags“)
const emHoursText = (h) => (!h ? '' : `${windowsOf(h).map(emWinText).join('; ')}${h.no_holidays ? ` · ${t('em_no_hol_short')}${h.holiday_state ? ` (${t('em_hol_state_short').replace('{x}', t('st_' + h.holiday_state))})` : ''}` : ''}`);
// Backlog 432: „wieder ab 06:00“ / „wieder ab morgen 06:00“ / „wieder ab Mo 06:00“ (laut Eintrag, deutsche Zeit)
const emNextText = (h, now) => { const n = nextOpen(h, now); if (!n) return ''; const when = n.in_days === 0 ? n.hm : n.in_days === 1 ? `${t('em_tomorrow')} ${n.hm}` : `${t('em_wd_' + n.wd)} ${n.in_days > 6 ? fmtD(n.day) + ' ' : ''}${n.hm}`; const loc = nextOpenLocal(n, undefined, now); const locTxt = loc ? ` <span style="white-space:nowrap">(${esc(t('em_next_local').replace('{x}', `${loc.day !== n.day ? t('em_wd_' + (((new Date(loc.day + 'T12:00:00Z').getUTCDay() + 6) % 7) + 1)) + ' ' : ''}${loc.hm}`))})</span>` : ''; return ` <span class="small muted emnext" data-emnext="${esc(n.day + ' ' + n.hm)}"${loc ? ` data-emnextlocal="${esc(loc.day + ' ' + loc.hm)}"` : ''}><span style="white-space:nowrap">${esc(t('em_next_open').replace('{x}', when))}</span>${locTxt}</span>`; };
// Backlog 433: Gerät in anderer Zeitzone (Fahrer im Ausland) → Hinweis, dass die Zeiten deutsche Zeit sind, mit beiden Uhrzeiten
const emTzNote = (contacts, now = new Date()) => { if (!contacts.some((c) => c.hours)) return ''; const z = tzDiff(now); return z ? `<p class="panel small" data-emtz role="note">🕒 ${esc(t('em_tz_note').replace('{b}', z.berlin).replace('{l}', z.local))}</p>` : ''; };
// erreichbare bzw. ohne Zeiten zuerst, laut Eintrag gerade nicht erreichbare danach (Reihenfolge sonst wie vom Server)
const emSortNow = (list, now) => list.map((c, i) => ({ c, i, r: reachableNow(c.hours, now) })).sort((a, b) => (a.r === false) - (b.r === false) || a.i - b.i);
function emRows(list, now = new Date()) {
  const rows = emSortNow(list, now);
  const allClosed = rows.length && rows.every((x) => x.r === false);
  return `${allClosed ? `<p class="panel warn small" data-emallclosed role="note">${esc(t('em_all_closed'))}</p>` : ''}<div class="list">${rows.map(({ c, r }) => `<div class="row emrow${r === false ? ' emclosed' : ''}"${r === null ? '' : ` data-emopen="${r ? 1 : 0}"`}><span aria-hidden="true">☎</span><span class="title"><b>${esc(c.label)}</b> <span class="chip">${esc(t('em_kind_' + c.kind))}</span>${r === null ? '' : ` <span class="chip ${r ? 'ok' : 'muted'}">${esc(t(r ? 'em_open_now' : 'em_closed_now'))}</span>`}${r === false ? emNextText(c.hours, now) : ''}${c.hours ? `<br><span class="small emhours">${esc(t('em_hours_short'))}: ${esc(emHoursText(c.hours))}</span>` : ''}${c.note ? `<br><span class="small">${esc(c.note)}</span>` : ''}${(() => { const a = telAbroad(c.phone); return a ? `<br><span class="small muted emabroad">${esc(t('em_abroad'))}: <a href="${esc(a.href)}" aria-label="${esc(t('em_abroad_call').replace('{x}', c.label))}">${esc(a.label)}</a></span>` : ''; })()}</span><a class="btn" href="${esc(telHref(c.phone))}" aria-label="${esc(t('em_call_x').replace('{x}', c.label))}">${esc(c.phone)}</a></div>`).join('')}</div>`;
}
// Backlog 428: „Angaben für den Pannendienst“ je Fahrzeug – nur Werte aus dem Fahrzeugstamm/Reifengrößen (fehlend = Zeile entfällt), aufklappbar
function emBreakdownInfo(v) {
  const rows = [];
  if (v.vin) rows.push(`<dt>${esc(t('em_bd_vin'))}</dt><dd class="embdvin" translate="no">${esc(v.vin)}</dd>`);
  if (v.manufacturer || v.model) rows.push(`<dt>${esc(t('em_bd_make'))}</dt><dd>${esc([v.manufacturer, v.model].filter(Boolean).join(' '))}${v.kind ? ` <span class="small muted">· ${esc(t('vk_' + v.kind))}</span>` : ''}</dd>`);
  if (v.tires && v.tires.length) rows.push(`<dt>${esc(t('em_bd_tires'))}</dt><dd>${v.tires.map((x) => `${esc(t('axle_' + x.axle))}: <b translate="no">${esc(x.size)}</b>${x.verified ? '' : ` <span class="small muted">(${esc(t('em_bd_unverified'))})</span>`}`).join('<br>')}</dd>`);
  if (!rows.length) return '';
  return `<details class="panel small" data-embd style="margin:0 0 10px"><summary><b>${esc(t('em_bd_title'))}</b></summary><p class="muted" style="margin:6px 0">${esc(t('em_bd_hint'))}</p><dl class="kv">${rows.join('')}</dl></details>`;
}
async function viewEmergency(vid) {
  render(`<p class="muted">${esc(t('loading'))}</p>`, 'more');
  const key = `cfp_emerg_${S.me.id}_${S.me.role === 'owner' && S.viewEnv ? S.viewEnv : S.me.environment}_${vid || ''}`; // Ansicht Test/Betrieb des Inhabers getrennt (18.10.2026)
  let d = null; let cachedAt = null;
  try { d = await api('GET', '/api/emergency' + (vid ? `?vehicle_id=${encodeURIComponent(vid)}` : '')); try { localStorage.setItem(key, JSON.stringify({ at: new Date().toISOString(), d })); } catch {} }
  catch (err) {
    if (!err.offline) throw err;
    try {
      let c = JSON.parse(localStorage.getItem(key) || 'null');
      // nach QR-Scan ohne Netz (20.10.2026): auf den allgemeinen Stand zurückfallen – Fahrzeugnummern nur, wenn das gescannte Fahrzeug darin vorkommt
      if (!c && vid) { const g = JSON.parse(localStorage.getItem(key.slice(0, -vid.length)) || 'null'); if (g && g.d) c = { at: g.at, d: { ...g.d, vehicles: (g.d.vehicles || []).some((v) => v.id === vid) ? g.d.vehicles : [] } }; }
      if (c) { d = c.d; cachedAt = c.at; }
    } catch {}
  }
  const fromFile = /[?&]from=file\b/.test(location.hash); // aus der Fahrzeugakte geöffnet → zurück zur Akte (20.10.2026)
  let html = `<p class="noprint"><a class="backlink" href="${vid ? (fromFile ? `#/vehicles/${encodeURIComponent(vid)}` : `#/v/${esc(vid)}`) : '#/'}">‹ ${esc(t('back'))}</a></p><h1>${esc(t('em_title'))}</h1>
    <section class="panel alert" role="note"><p style="margin-top:0"><b>${esc(t('em_112'))}</b></p><a class="btn danger block" href="tel:112" id="em112">${esc(t('em_112_btn'))}</a></section>`;
  if (!d) html += `<div class="panel alert">${esc(t('offline_view'))}</div><p class="muted">${esc(t('em_offline_none'))}</p>`;
  else {
    if (cachedAt) html += `<div class="panel alert">${esc(t('offline_view'))} (${esc(t('as_of'))} ${fmtDT(cachedAt)})</div>`;
    html += emTzNote([...d.general, ...d.vehicles.flatMap((v) => v.contacts)]);
    for (const v of d.vehicles) { const bd = emBreakdownInfo(v); if (v.contacts.length || bd) html += `<h2>${plate(v.plate)}${v.contacts.length ? ` <span class="small muted">${esc(t('em_for_vehicle'))}</span>` : ''}</h2>${bd}${v.contacts.length ? emRows(v.contacts) : ''}`; }
    if (d.general.length) html += `<h2>${esc(t('em_general'))}</h2>${emRows(d.general)}`;
    if (!d.general.length && !d.vehicles.some((v) => v.contacts.length)) html += `<p class="muted" id="emnone">${esc(t(d.can_edit ? 'em_none_mgr' : 'em_none'))}</p>`;
    if (d.can_edit && !cachedAt) html += `<div class="actions noprint"><a class="btn secondary" href="#/emergency/edit">${esc(t('em_manage'))}</a></div>`;
  }
  html += `<p style="margin-top:16px">${mayReport() ? `<a href="${vid ? `#/new/${esc(vid)}` : '#/new'}">${esc(t('report_damage'))} ›</a> · ` : ''}<a href="#/help?s=accident">${esc(t('help_accident_t'))} ›</a></p>`;
  render(html, 'more');
}


async function viewEmergencyEdit(...a) { return (await lazyModule('verwaltung')).viewEmergencyEdit(...a); }

// ---------- QR-Aufkleber je Fahrzeug: Scan öffnet „Schaden melden“ mit vorausgewähltem Fahrzeug ----------
async function viewQrSheet(...a) { return (await lazyModule('verwaltung')).viewQrSheet(...a); }

// ---------- Kurzanleitung für Fahrer (Aushang): druckbar in DE/UK/EN, Knopfnamen aus denselben Texten wie die App ----------
// {key} = App-Text in der Sprache des Aushangs (fett), {=key} = ohne Hervorhebung. Keine Namen, keine Telefonnummern (Linien zum Ausfüllen).
const GUIDE_SECTIONS = ['access', 'install', 'report', 'check', 'crit', 'offline', 'status'];
function guideFill(lang, s) {
  const get = (k) => (STRINGS[lang] && STRINGS[lang][k]) || STRINGS.de[k] || k;
  return String(s).split(/(\{=?\w+\})/).map((p) => { const m = p.match(/^\{(=?)(\w+)\}$/); return m ? (m[1] ? esc(get(m[2])) : `<b>${esc(get(m[2]))}</b>`) : esc(p); }).join('');
}
function viewDriverGuide(l) {
  const g = ['de', 'uk', 'en'].includes(l) ? l : S.guideLang || S.lang || 'de';
  if (!langLoaded(g)) { ensureLang(g).then((ok) => viewDriverGuide(ok ? g : S.lang)); return; } // Aushang in anderer Sprache: Paket nachladen (Backlog 588; ohne Netz/Cache: Oberflächensprache)
  S.guideLang = g;
  const gt = (k) => (STRINGS[g] && STRINGS[g][k]) || STRINGS.de[k] || k;
  const addr = `${location.origin}/`;
  const field = (k) => `<div class="paper-field"><span>${esc(gt(k))}</span><i></i></div>`;
  const sec = (k, i) => {
    const parts = gt('g_' + k).split('|');
    const body = parts.length > 1 ? `<ol>${parts.map((x) => `<li>${guideFill(g, x)}</li>`).join('')}</ol>` : `<p>${guideFill(g, parts[0])}</p>`;
    return `<section class="guide-sec${k === 'crit' ? ' alert' : ''}"><h2>${i + 1}. ${esc(gt('g_' + k + '_t'))}</h2>${body}${k === 'crit' ? `<div class="paper-head">${field('g_phone_dispo')}${field('g_phone_fleet')}</div>` : ''}</section>`;
  };
  render(`<div class="noprint">${isMgr() ? `<p><a class="backlink" href="#/more">‹ ${esc(t('back'))}</a></p>` : ''}<h1 data-title="${esc(t('guide'))} – ${esc({ de: 'Deutsch', uk: 'Українська', en: 'English' }[g] || g)}">${esc(t('guide'))}</h1><p class="small muted">${esc(t('guide_hint'))}</p>
    <p class="small" id="glabel">${esc(t('guide_lang'))}</p><div class="actions" role="group" aria-labelledby="glabel" style="flex-wrap:wrap">${[['de', 'Deutsch', '#/guide?l=de'], ['uk', 'Українська', '#/guide?l=uk'], ['en', 'English', '#/guide?l=en']].map(([k, n, href]) => `<a class="btn ${k === g ? '' : 'secondary'}" href="${href}" lang="${k}"${k === g ? ' aria-current="true"' : ''}>${n}</a>`).join('')}</div>
    <div class="actions"><button type="button" class="btn" id="gprt">${esc(t('print'))}</button></div></div>
    <article class="guide" lang="${g}"><h1>${esc(gt('g_title'))}</h1>
    <div class="guide-top"><div class="qr">${(() => { try { return qrSvg(addr, { label: gt('g_addr') }); } catch { return ''; } })()}</div><div><p class="small"><b>${esc(gt('g_addr'))}</b></p><p class="guide-addr">${esc(addr)}</p></div></div>
    ${GUIDE_SECTIONS.map(sec).join('')}
    <p class="small muted">${esc(gt('g_printed'))}: ${esc(new Intl.DateTimeFormat(locOf(g), dateOpts('UTC')).format(new Date(bDate() + 'T12:00:00Z')))} · CEVIK ${esc(gt("app"))} [CLAUDE]</p></article>`, 'more');
  $('#gprt').onclick = () => window.print();
}

// ---------- Auslese-Fristen Fahrerkarte / Massenspeicher ----------
const TST = { ueberfaellig: 'kritisch', bald: 'mittel', keine: '', ok: 'ok' };
async function viewTachoHistory(...a) { return (await lazyModule('verwaltung')).viewTachoHistory(...a); }

async function viewTacho(...a) { return (await lazyModule('verwaltung')).viewTacho(...a); }

// ---------- Hinweise & Push ----------
// Zeile der Hinweisliste (auch für „Ältere laden“)
const nRow = (x) => `<div class="row note ${x.urgent ? 'p-kritisch' : ''}" style="${x.opened_at || x.acknowledged_at || x.own_device ? 'opacity:.7' : ''}"${x.own_device ? ' data-owndev' : ''}><span class="chip ${x.urgent ? 'kritisch' : ''}">${fmtDT(x.created_at)}</span><a class="title" style="white-space:normal" href="${esc(notifHref(x))}" data-open="${esc(x.id)}">${esc(x.title)}${x.own_device ? ` <span class="chip ok">${esc(t('nl_own_device'))}</span>` : ''}</a>${x.acknowledged_at ? '<span class="chip ok">✓</span>' : `<button class="btn secondary" data-ack="${esc(x.id)}">${esc(t('ack'))}</button>`}<span class="sub" style="white-space:normal">${x.coupled_locked ? `<b class="chip kritisch" data-ncoupled>${esc(t('notif_coupled_locked').replace('{v}', `${t(x.coupled_locked.kind === 'anhaenger' ? 'trailer' : 'truck')} ${x.coupled_locked.plate}`))}</b> ` : ''}${esc(x.body)} · Push: ${esc(x.push_status === 'pending' && x.push_hold_until && Date.parse(x.push_hold_until) > Date.now() ? t('pst_held').replace('{t}', fmtDT(x.push_hold_until)) : x.push_status === 'pending' && x.push_hold_until && x.push_hold_until >= '0001' && (x.opened_at || x.acknowledged_at) ? t('pst_held_opened') : t('pst_' + x.push_status) === 'pst_' + x.push_status ? x.push_status : t('pst_' + x.push_status))}</span></div>`;
async function viewInbox() {
  // Filter: alle / ungelesen (weder geöffnet noch quittiert) / dringend – serverseitig, Zähler über ALLE Hinweise (nicht nur die neuesten 100)
  const NF = { all: () => true, unread: (x) => !x.opened_at && !x.acknowledged_at, urgent: (x) => !!x.urgent };
  // Gewählter Filter gilt für die App-Sitzung; ohne Wahl: „Ungelesen“, solange es ungelesene gibt, sonst „Alle“
  // ohne Wahl gleich „Ungelesen“ anfragen (vorher erst „Alle“ geladen und verworfen – doppelte Abfrage bei jedem Quittieren, 23.10.2026)
  let n = await api('GET', '/api/notifications?filter=' + (NF[S.inboxF] ? S.inboxF : 'unread'));
  const nf = NF[S.inboxF] ? S.inboxF : n.counts.unread ? 'unread' : 'all';
  if (nf !== n.filter) n = await api('GET', '/api/notifications' + (nf === 'all' ? '' : '?filter=' + nf));
  S.unread = n.counts.unread;
  const shown = n.notifications;
  render(`<h1>${esc(t('notifications'))}</h1>${n.quiet ? `<p class="small muted" id="qinfo">${esc(t('quiet_on').replace('{f}', n.quiet.from).replace('{t}', n.quiet.to))} – ${esc(t('quiet_short'))}</p>` : ''}<section class="panel" id="push"></section>
    <details class="panel" id="np"><summary>${esc(t('push_prefs'))}</summary><p class="small muted">${esc(t('push_prefs_hint'))}</p><div id="npl"></div></details>
    ${n.counts.all ? `<div class="actions"><button class="btn secondary" id="ra">${esc(t('mark_read'))}</button></div>
    <div class="seg-tabs" id="nfil">${Object.keys(NF).map((k) => `<a href="#/inbox" data-nf="${k}" class="${k === nf ? 'on' : ''}"${k === nf ? ' aria-current="true"' : ''}>${esc(t(k === 'all' ? 'all' : 'nf_' + k))} (${n.counts[k]})</a>`).join('')}</div>` : ''}
    ${n.truncated ? `<p class="small panel" id="ntrunc">${esc(t('nf_truncated').replace('{max}', n.max).replace('{n}', n.counts[nf]))}</p>` : ''}
    <div class="list" id="nlist">${shown.map((x) => nRow(x)).join('') || `<p class="muted">${esc(t(n.counts.all ? 'nf_none' : 'no_notifications'))}</p>`}</div>
    ${n.truncated ? `<div class="actions"><button type="button" class="btn secondary" id="nmore">${esc(t('nf_more'))}</button></div>` : ''}`, '');
  
  pushPanel($('#push'));
  const np = $('#np');
  np.ontoggle = async () => {
    if (!np.open || np.dataset.loaded) return;
    try {
      const pr = await api('GET', '/api/me/notify-prefs'); np.dataset.loaded = '1';
      const q = pr.quiet;
      $('#npl').innerHTML = pr.kinds.map((k) => `<label style="display:flex;gap:8px;align-items:center;margin:6px 0"><input type="checkbox" data-pk="${esc(k)}"${pr.muted.includes(k) ? '' : ' checked'}> ${esc(t('pk_' + k))}</label>`).join('') + (pr.kinds.length ? '' : `<p class="small muted" id="npnone">${esc(t('push_kinds_none'))}</p>`)
        + `<h3 style="margin-top:14px">${esc(t('quiet_title'))}</h3><p class="small muted">${esc(t('quiet_hint'))}</p>
        <p id="qst"><b>${esc(q ? t('quiet_on').replace('{f}', q.from).replace('{t}', q.to) : t('quiet_none'))}</b></p>
        <form id="qf" class="grid2"><div><label for="qfrom">${esc(t('quiet_from'))}</label><input id="qfrom" type="time" step="60" required value="${esc(q ? q.from : '')}"></div>
        <div><label for="qto">${esc(t('quiet_to'))}</label><input id="qto" type="time" step="60" required value="${esc(q ? q.to : '')}"></div>
        <div class="actions" style="grid-column:1/-1"><button class="btn secondary">${esc(t('quiet_save'))}</button>${q ? `<button type="button" class="btn secondary" id="qoff">${esc(t('quiet_off'))}</button>` : ''}</div></form>`;
      const qsave = async (quiet) => {
        try { await api('PUT', '/api/me/notify-prefs', { quiet }); toast('✓'); await viewInbox(); const d = $('#np'); if (d) d.open = true; } catch (err) { toast(err.message, true); }
      };
      $('#qf').onsubmit = (e) => { e.preventDefault(); return qsave({ from: $('#qfrom').value.slice(0, 5), to: $('#qto').value.slice(0, 5) }); };
      const qoff = $('#qoff'); if (qoff) qoff.onclick = () => qsave(null);
      $$('[data-pk]', np).forEach((cb) => (cb.onchange = async () => {
        const muted = $$('[data-pk]', np).filter((x) => !x.checked).map((x) => x.dataset.pk);
        try { await api('PUT', '/api/me/notify-prefs', { muted }); toast('✓'); } catch (err) { toast(err.message, true); }
      }));
    } catch (err) { toast(err.message, true); }
  };
  // Nach Quittieren/„Alle gelesen“/Filterwechsel: aufgeklappter Bereich „Push für diese Hinweise“ bleibt offen; Fehler (z. B. kein Netz) als Meldung statt stillem Abbruch
  const again = async () => { const o = np.open; await viewInbox(); const d = $('#np'); if (d && o) d.open = true; };
  const bindRows = (root) => {
    $$('[data-ack]', root).forEach((b) => (b.onclick = async () => { try { await api('POST', `/api/notifications/${b.dataset.ack}/ack`); await refreshUnread(); again(); } catch (err) { toast(err.message, true); } }));
    $$('[data-open]', root).forEach((a) => a.addEventListener('click', () => api('POST', `/api/notifications/${a.dataset.open}/opened`).then(() => refreshUnread(true)).catch(() => {}))); // Zähler gleich nachziehen (19.10.2026: blieb bis zum nächsten Öffnen stehen)
  };
  bindRows(document);
  // „Ältere laden“: nächste Seite nach dem letzten angezeigten Hinweis anhängen (23.10.2026 – vorher nach 100 nicht erreichbar)
  let last = shown.length ? shown[shown.length - 1].id : null;
  const more = $('#nmore');
  if (more) more.onclick = async () => {
    try {
      const m = await api('GET', `/api/notifications?${nf === 'all' ? '' : 'filter=' + nf + '&'}before=${encodeURIComponent(last)}`);
      const box = document.createElement('div'); box.innerHTML = m.notifications.map((x) => nRow(x)).join(''); bindRows(box);
      $('#nlist').append(...box.children);
      if (m.notifications.length) last = m.notifications[m.notifications.length - 1].id;
      if (!m.truncated) more.parentElement.remove();
    } catch (err) { toast(err.message, true); }
  };
  const ra = $('#ra'); if (ra) ra.onclick = async () => { try { await api('POST', '/api/notifications/read-all', n.as_of ? { before: n.as_of } : {}); S.unread = 0; paintBadge(); refreshUnread(true); again(); } catch (err) { toast(err.message, true); } };
  $$('[data-nf]').forEach((a) => (a.onclick = (e) => { e.preventDefault(); S.inboxF = a.dataset.nf; again().catch((err) => toast(err.message, true)); }));
}

// Push bei geöffneten Hinweisen: Liste nur neu aufbauen, wenn nichts eingegeben und „Push für diese Hinweise“ zugeklappt ist –
// sonst gingen Ruhezeit-Eingaben bzw. der aufgeklappte Bereich verloren; stattdessen Hinweis mit Knopf „Liste aktualisieren“
function inboxPush() {
  if (!S.me || !/^#\/inbox/.test(location.hash)) return;
  const np = $('#np');
  if (!viewDirty() && !(np && np.open)) { route(); return; }
  if ($('#nnew')) return;
  const h = $('#main h1') || document.querySelector('main h1'); if (!h) return;
  h.insertAdjacentHTML('afterend', `<p class="panel small" id="nnew" role="status">${esc(t('nf_new'))} <button type="button" class="btn secondary" id="nnewb">${esc(t('nf_reload'))}</button></p>`);
  $('#nnewb').onclick = () => route();
}

// Backlog 227 (Teilagent „Fahrer wechselt sein Handy“): Fahrer-Startseite – einmaliger, ausblendbarer Hinweis, wenn dieses Gerät keine Push-Hinweise
// erhält (kein Abo, Berechtigung nicht verweigert); nutzt dasselbe Push-Feld wie „Hinweise“. Ausblenden je Konto und Gerät (nur Bequemlichkeit).
async function pushNudge() {
  const el = $('#pushnudge'); if (!el || !S.me || S.me.role !== 'driver') return;
  const k = 'cfp_pushnudge_off_' + S.me.id; let off = false; try { off = localStorage.getItem(k) === '1'; } catch {}
  if (off || !('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined' || Notification.permission === 'denied') return;
  try { const reg = await navigator.serviceWorker.getRegistration(); if (!reg || !reg.pushManager || await reg.pushManager.getSubscription()) return; } catch { return; }
  if (!document.body.contains(el)) return;
  el.hidden = false;
  el.innerHTML = `<p class="small" style="margin-top:0">${esc(t('push_nudge'))}</p><div id="pushnudgep"></div><div class="actions"><button type="button" class="btn secondary" id="pushnudgeoff">${esc(t('push_nudge_off'))}</button></div>`;
  $('#pushnudgeoff').onclick = () => { try { localStorage.setItem(k, '1'); } catch {} el.remove(); };
  await pushPanel($('#pushnudgep'));
}

async function pushPanel(el) {
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const ios = /iPhone|iPad/.test(navigator.userAgent) && !window.navigator.standalone;
  if (!supported) { el.innerHTML = `<h3>${esc(t('push_title'))}</h3><p class="muted">${esc(ios ? t('push_ios') : t('push_unsupported'))}</p>`; return; }
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  el.innerHTML = `<h3>${esc(t('push_title'))}</h3><p>${sub ? `<span class="chip ok">${esc(t('push_on'))}</span>` : `<span class="chip">${esc(t('push_off'))}</span>`}${Notification.permission === 'denied' ? ` <span class="chip kritisch">${esc(t('push_denied'))}</span>` : ''}</p>
    <div class="actions">${sub ? `<button class="btn secondary" id="pt">${esc(t('push_test'))}</button>` : `<button class="btn" id="pe">${esc(t('push_enable'))}</button>`}</div>`;
  const pe = $('#pe', el);
  if (pe) pe.onclick = async () => {
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { toast(t('push_denied'), true); return; }
      const key = S.meta.vapid_public_key;
      const raw = Uint8Array.from(atob(key.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((key.length + 3) % 4)), (c) => c.charCodeAt(0));
      const s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: raw });
      const j = s.toJSON();
      await api('POST', '/api/push/subscribe', { endpoint: j.endpoint, keys: j.keys, device_label: deviceLabel() });
      pushPanel(el);
    } catch (err) { toast(pushErrText(err), true); }
  };
  const pt = $('#pt', el);
  if (pt) pt.onclick = async () => { pt.disabled = true; try {
      // Test genau an dieses Gerät (eigenes Abo), sonst an alle Geräte der Person (20.10.2026)
      let ep = null; try { const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null; const sub = reg && reg.pushManager ? await reg.pushManager.getSubscription() : null; ep = sub ? sub.endpoint : null; } catch { /* ohne Abo: alle Geräte */ }
      const r = await api('POST', '/api/push/test', ep ? { endpoint: ep } : undefined);
      // Rohtext des Push-Dienstes nicht anzeigen (deutsch/technisch); Ruhezeit und abgemeldetes Gerät mit eigener Meldung (19.10.2026)
      const st = r.hold_until ? t('pst_held').replace('{t}', fmtDT(r.hold_until)) : r.device_gone ? t('pst_gone') : t('pst_' + r.push_status) === 'pst_' + r.push_status ? r.push_status : t('pst_' + r.push_status);
      toast(`Push: ${st}`, r.push_status !== 'accepted' && !r.hold_until); } catch (err) { toast(err.message, true); } finally { pt.disabled = false; } };
}
// Vorhandenes Push-Abo dieses Browsers der aktuellen Anmeldung zuordnen (Migration 0059) – einmal je App-Start, still;
// endet die Anmeldung (Passwortwechsel, „andere Anmeldungen beenden“), meldet der Server das Gerät ab
async function pushRebind() {
  try {
    if (!('serviceWorker' in navigator) || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker.getRegistration(); const sub = reg && reg.pushManager ? await reg.pushManager.getSubscription() : null;
    if (!sub) return;
    const j = sub.toJSON(); await api('POST', '/api/push/subscribe', { endpoint: j.endpoint, keys: j.keys, device_label: deviceLabel() });
  } catch {}
}
// Backlog 509: Android-Tablet getrennt vom Handy (wie `deviceFromUa`); iPadOS meldet sich als „Macintosh“ – mit Touch als iPad
const deviceLabel = () => { const ua = navigator.userAgent; return /Android/.test(ua) ? (/Mobile/.test(ua) ? 'Android' : 'Android-Tablet') : /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'iPad' : /Windows/.test(ua) ? 'Windows-PC' : /Mac/.test(ua) ? 'Mac' : t('device'); };

// ---------- Management ----------

// Kurzbezeichnung des Befundcodes in der Oberflächensprache (Meldungstext selbst kommt deutsch vom Server)
// Meldungstext eines Agentenbefunds in der App-Sprache (Vorlagen public/finding-messages.js); HU/SP-Hinweis „Frist ungeklärt“
// nutzt dieselben Übersetzungen wie die Fahrzeugakte (hn_<code>), sonst bleibt der deutsche Hinweistext.
// Hinweis-Werte: ISO-Kalendertag (z. B. Datum der HU) im Datumsformat der Sprache, sonst unverändert (19.10.2026)
const isoDay = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? fmtD(v) : String(v));
function fMsg(stored, fallback) {
  let o = stored;
  if (typeof o === 'string') { try { o = JSON.parse(o); } catch { return fallback; } }
  if (o && o.k === 'INSPECTION_UNCLEAR' && o.a && o.a.nc && S.lang !== 'de') {
    const k = 'hn_' + o.a.nc.code; const s = t(k);
    if (s !== k) o = { ...o, a: { ...o.a, note: s.replace(/\{(\w+)\}/g, (m, n) => (n in (o.a.nc.p || {}) ? isoDay(o.a.nc.p[n]) : m)) } };
  }
  // feste Wertelisten in der App-Sprache wie Prüftabelle/Reifen/Lager der Akte (vorher z. B. EN „Ölwechsel overdue“, „Stk“, Code „DORTMUND“)
  if (o && o.a && typeof o.a === 'object') {
    const a = { ...o.a };
    if (typeof a.kind === 'string') a.kind = mk(a.kind);
    if (typeof a.reason === 'string') a.reason = translateLockReason(S.lang, a.reason); // automatischer Sperrgrund (20.10.2026: blieb in UK/EN deutsch)
    if (typeof a.pos === 'string') a.pos = posL(a.pos);
    if ('unit' in a && a.unit != null) a.unit = unitL(a.unit);
    if (typeof a.site === 'string' && a.site && S.meta && S.meta.workshops) a.site = wsName(a.site);
    o = { ...o, a };
  }
  return findingMessage(o, fallback, S.lang);
}


const fcLabel = (code) => (code && (STRINGS[S.lang]['fc_' + code] || STRINGS.de['fc_' + code]) ? `<b style="display:block">${esc(t('fc_' + code))}</b>` : '');

async function viewMaster(...a) { return (await lazyModule('verwaltung')).viewMaster(...a); }

// ---------- Prüftermine (Fuhrpark gesamt) ----------
// Druck/PDF: Prüfhistorie der Fahrzeugakte („Bisherige Durchführungen“) und „Offene Agentenbefunde“ immer mitdrucken, danach wieder zuklappen
const PRINT_OPEN = '#mhist, #vaf, #tirehistd, #ddhist, #dthist, #dlchist, #vthist, details.cinsp, details.vinfo'; // Kontrollen/„Zum Fahrzeug“/Auslesungen im Druck vollständig (20.10.2026)
window.addEventListener('beforeprint', () => { for (const d of document.querySelectorAll(PRINT_OPEN)) if (!d.open) { d.open = true; d.dataset.printOpened = '1'; } });
window.addEventListener('afterprint', () => { for (const d of document.querySelectorAll(PRINT_OPEN)) if (d.dataset.printOpened) { d.open = false; delete d.dataset.printOpened; } });
// Abmelden: Push-Abo dieses Browsers beenden (Server: Gerät abmelden; Browser: Abo löschen) – sonst kamen Pushs der abgemeldeten Person
// weiter auf dem Gerät an (geteilte Werkstatt-Tablets), und die nächste Person sah „Push an“ ohne eigenes Abo (17.10.2026)
async function pushOffForLogout() {
  try {
    if (!('serviceWorker' in navigator)) return null;
    const reg = await navigator.serviceWorker.getRegistration();
    // Backlog 478 (Blickwinkel „geteiltes Werkstatt-Tablet“): angezeigte Mitteilungen der abgemeldeten Person schließen – sonst standen
    // „Vorgangsnummer · Kennzeichen“ oder „Neue Anmeldung …“ weiter in der Leiste/auf dem Sperrbildschirm und öffneten unter dem nächsten Konto
    try { if (reg && reg.getNotifications) for (const n of await reg.getNotifications()) n.close(); } catch { /* ohne Mitteilungen */ }
    const sub = reg && reg.pushManager ? await reg.pushManager.getSubscription() : null;
    if (!sub) return null;
    const ep = sub.endpoint; sub.unsubscribe().catch(() => {}); return ep;
  } catch { return null; }
}
// Download mit Hinweis, wenn der Server die Datei begrenzt hat (Header x-cfp-truncated)
function downloadChecked(blob, name) { download(blob, name); if (blob.cfpTruncated) toast(t('export_truncated').replace('{n}', blob.cfpTruncated), true); }
function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
// Gespeicherter Standard-Nachweis der Fahrerzuordnung (Server, deutsch) in der App-Sprache anzeigen; eigene Nachweise bleiben wörtlich
// Rückruf erledigt: gespeicherter Zusatz „ · Durchführung: …“ in der App-Sprache (19.10.2026)
const mEv = (e) => (e === 'Frist nach StVZO Anlage VIII berechnet (aus der Fahrzeugakte angelegt)' ? t('ev_husp_rule') : String(e || '')) // automatischer Nachweistext (HUSP_RULE_EVIDENCE) je Sprache (21.10.2026)
  .replace(' · Durchführung: ', ' · ' + t('ev_done_label') + ': ').replace(/\(Plakette ([^():]+): fällig bis Monatsende\)/, (_, m) => t('ev_plaque_month').replace('{m}', m)); // Import-Zusatz je Sprache (20.10.2026)






// „ungeklärt“ (km-Zähler gesunken bzw. HU/SP-Frist ungeklärt) überdeckt im Gesamtstatus eine Datumsfälligkeit – die bleibt einzuplanen (Server: date_status)
const kmUnclearDateDue = (r) => r.status === 'ungeklaert' && ['ueberfaellig', 'faellig'].includes(r.date_status);

async function viewMaintMulti(...a) { return (await lazyModule('verwaltung')).viewMaintMulti(...a); }
async function viewMaint(...a) { return (await lazyModule('verwaltung')).viewMaint(...a); }

// ---------- Kennzahlen Instandhaltung ----------


 // wie Server MAX_VEHICLE_DOCS (src/vehicles.js)
const dur = (h) => (h === null || h === undefined ? '–' : h < 48 ? `${fmtNum(h)} ${t('h_short')}` : `${nDays(Math.round(h / 2.4) / 10)}`);
async function viewKpi(...a) { return (await lazyModule('verwaltung')).viewKpi(...a); }

// ---------- Protokoll (Inhaber) ----------
async function viewAudit(...a) { return (await lazyModule('verwaltung')).viewAudit(...a); }

// ---------- Zeitleiste der Fahrzeugakte ----------


const tlHash = (id, f) => '#/vehicles/' + id + '/timeline' + (f ? '?f=' + f : '');
async function viewTimeline(...a) { return (await lazyModule('verwaltung')).viewTimeline(...a); }

// ---------- Werkstatt-Auslastung (je Standort und Kalenderwoche, ohne Personenbezug) ----------
// ---------- Werkstattplan (geplante Termine je Tag) ----------
// Werkstattplan: Server liefert bis 300 Zeichen (Übersetzung erkennt Systemtexte nur vollständig), gekürzt wird nach der Übersetzung (19.10.2026)
const clipTxt = (x, n) => { const a = [...String(x || '')]; return a.length > n ? a.slice(0, n - 1).join('') + '…' : a.join(''); };
async function viewPlan(...a) { return (await lazyModule('verwaltung')).viewPlan(...a); }

async function viewWsLoad(...a) { return (await lazyModule('verwaltung')).viewWsLoad(...a); }

// ---------- Telematik-Prüffälle und Zuordnungen ----------
// Letzter Stand je Fahrzeug: ohne Daten zuerst, dann ältester; nur Alter anzeigen, keine Bewertung (kein Grenzwert vorgegeben)
function tmAge(iso) {
  const h = Math.floor((nowMs() - new Date(iso).getTime()) / 3600000);
  if (!(h >= 0)) return '';
  return h >= 48 ? t('tm_age_d').replace('{n}', Math.floor(h / 24)) : t('tm_age_h').replace('{n}', h);
}

const TM_PROV = { webfleet: 'Webfleet', yellowfox: 'YellowFox' };
const provL = (p) => TM_PROV[p] || p; // Anbieter wie in der Kopfzeile („YellowFox“ statt „yellowfox“, 19.10.2026)
async function viewTelematics(...a) { return (await lazyModule('verwaltung')).viewTelematics(...a); }

// ---------- Datenqualität (Inhaber/Fuhrparkleitung) ----------
async function viewQuality(...a) { return (await lazyModule('verwaltung')).viewQuality(...a); }

// ---------- Nutzungsstatistik (Inhaber, ohne Personenbezug) ----------

async function viewReadiness(...a) { return (await lazyModule('verwaltung')).viewReadiness(...a); }

async function viewUsage(...a) { return (await lazyModule('verwaltung')).viewUsage(...a); }

// ---------- Suche (Kennzeichen/FIN/Anhänger und Vorgänge) ----------
async function viewSearch() {
  if (S.me.role === 'driver') { location.hash = '#/'; return; }
  render(`<h1>${esc(t('search_title'))}</h1><input id="gq" type="search" autocomplete="off" aria-label="${esc(t('search_title'))}" placeholder="${esc(t('search_ph'))}" value="${esc(S.lastSearch || '')}"><div id="gr"></div>`, '');
  let vehicles = null; let fineList = null; let fineTrunc = false; let stockList = null; let timer = null; let seq = 0;
  // Bußgelder nur Inhaber/Fuhrparkleitung/Lesezugriff, Lager nur Inhaber/Fuhrparkleitung/Werkstatt (eigenes Lager) – wie die Server-Rechte
  const canFines = ['owner', 'fleet', 'viewer'].includes(S.me.role); const canStock = ['owner', 'fleet', 'workshop'].includes(S.me.role);
  const norm = searchKey;
  const run = async () => {
    const q = $('#gq').value.trim(); S.lastSearch = q; const my = ++seq; const box = $('#gr');
    if (q.length < 2) { box.innerHTML = `<p class="muted small">${esc(t('search_hint'))}</p>`; return; }
    try {
      // Inhaber/Leitung: auch außer Betrieb genommene Fahrzeuge (Weg zur Akte, z. B. verkauft) – Vorgänge dazu fand die Suche schon (19.10.2026)
      if (!vehicles) {
        const [va, vi] = await Promise.all([api('GET', '/api/vehicles'), isMgr() ? api('GET', '/api/vehicles?inactive=1') : null]);
        vehicles = va.vehicles.concat(vi ? vi.vehicles.map((v) => ({ ...v, __inactive: true })) : []);
      }
      const n = norm(q);
      // Treffer je Bereich höchstens 10 (Vorgänge 20) – Gesamtzahl und Hinweis „Suche genauer eingeben“ statt stillem Abschneiden
      const vAll = vehicles.filter((v) => [v.plate, v.vin, v.trailer_plate, v.truck_plate, v.manufacturer, v.model].some((x) => norm(x).includes(n)) || (v.former_plates || []).some((x) => norm(x).includes(n))); const vs = vAll.slice(0, 10); // früheres Kennzeichen (Backlog 256)
      const cr = await api('GET', '/api/cases?status=&limit=20&q=' + encodeURIComponent(q)); const cs = cr.cases;
      // Suche nur in den 500 jüngsten Schreiben – Hinweis statt stillem Abschneiden (20.10.2026)
      if (canFines && !fineList) { const fr = await api('GET', '/api/fines'); fineList = fr.fines; fineTrunc = !!fr.truncated; }
      if (canStock && !stockList) stockList = (await api('GET', '/api/stock')).items;
      await loadHelp(S.lang).catch(() => {}); // Hilfe-Schritte (Backlog 597); fehlt das Paket (offline ohne Cache), ohne Hilfe-Treffer
      if (my !== seq) return;
      const lq = q.toLowerCase();
      const fAll = canFines ? fineList.filter((f) => [f.plate, f.plate_in_letter].some((x) => norm(x).includes(n)) || [f.fine_no, f.reference, f.authority].some((x) => String(x || '').toLowerCase().includes(lq))) : []; const fs = fAll.slice(0, 10);
      const hq = helpNorm(q); // Lager: Umlaute/ue gleich (wie Lagerliste und Hilfe)
      const sAll = canStock ? stockList.filter((i) => [i.name, i.part_number, i.location].some((x) => helpNorm(x).includes(hq))) : []; const ss = sAll.slice(0, 10);
      const more = (shown, all) => (all > shown ? `<p class="small muted" data-more>${esc(t('search_more').replace('{n}', shown).replace('{m}', all))}</p>` : '');
      // Hilfe-Abschnitte der eigenen Rolle (gleiche Suche wie auf der Hilfeseite)
      const hs = !helpLoaded(S.lang) ? [] : (helpMatches(helpSections(S.me.role).map((h) => ({ name: h, title: t(`help_${h}_t`), steps: t(`help_${h}_s`).split('|') })), q) || []).sort((a, b) => b.title_hit - a.title_hit).slice(0, 5);
      box.innerHTML = `<h2>${esc(t('nav_vehicles'))} <span class="chip">${vAll.length}</span></h2>${more(vs.length, vAll.length)}${vs.length ? `<div class="list">${vs.map((v) => `<a class="row" href="#/vehicles/${encodeURIComponent(v.id)}">${plate(v.plate, { locked: v.availability === 'gesperrt' })}<span class="title">${v.kind === 'anhaenger' ? `<span class="chip">${esc(t('vk_anhaenger'))}</span> ` : ''}${esc(v.manufacturer || '')} ${esc(v.site || '')}</span><span class="chip">${esc(v.__inactive ? t('inactive_vehicles') : t('av_' + v.availability))}</span><span class="sub">${esc(v.vin || '')}${((x) => (x ? ` · <b data-formerhit>${esc(t('former_plate_hit').replace('{p}', x))}</b>` : ''))((v.former_plates || []).find((x) => norm(x).includes(n) && !norm(v.plate).includes(n)))}</span></a>`).join('')}</div>` : noneP()}
        <h2>${esc(t('nav_cases'))} <span class="chip">${cs.length}${cr.truncated ? '+' : ''}</span></h2>${cr.truncated ? `<p class="small muted" data-more>${esc(t('search_more_cases').replace('{n}', cs.length))} <a href="#/cases" id="gcases">${esc(t('search_all_cases'))}</a></p>` : ''}${caseList(cs, '–')}`
        + (canFines && fineTrunc ? `<p class="small muted" id="gftrunc">${esc(t('fines'))}: ${esc(t('fines_truncated'))}</p>` : '')
        + (fs.length ? `<h2>${esc(t('fines'))} <span class="chip">${fAll.length}</span></h2>${more(fs.length, fAll.length)}<div class="list" id="gfines">${fs.map((f) => `<a class="row" href="#/fines/${esc(f.id)}">${plate(f.plate || f.plate_in_letter)}<span class="title">${esc(t('fk_' + f.kind))}</span><span class="chip">${esc(t('fs_' + f.status))}</span><span class="sub">${esc(f.fine_no)}${f.reference ? ' · ' + esc(f.reference) : ''}${f.authority ? ' · ' + esc(f.authority) : ''}</span></a>`).join('')}</div>` : '')
        + (ss.length ? `<h2>${esc(t('stock'))} <span class="chip">${sAll.length}</span></h2>${more(ss.length, sAll.length)}<div class="list" id="gstock">${ss.map((i) => `<a class="row ${i.below_min ? 'p-mittel' : ''}" href="#/stock/${esc(i.id)}"><span class="chip">${esc(wsName(i.site))}</span><span class="title">${esc(i.name)}</span><b>${fmtNum(i.on_hand)} ${esc(unitL(i.unit))}</b><span class="sub">${[i.part_number && esc(i.part_number), i.location && esc(i.location), i.below_min && esc(t('below_min'))].filter(Boolean).join(' · ')}</span></a>`).join('')}</div>` : '')
        + (hs.length ? `<h2>${esc(t('help'))} <span class="chip">${hs.length}</span></h2><div class="list" id="ghelp">${hs.map((h) => `<a class="row" href="#/help?s=${h.name}&q=${encodeURIComponent(q)}"><span>?</span><span class="title">${esc(t(`help_${h.name}_t`))}</span><span></span></a>`).join('')}</div>` : '');
      const gc = $('#gcases'); if (gc) gc.onclick = () => { S.caseQ = q; try { sessionStorage.setItem('cfp_cf', 'all'); } catch {} };
      announceHits(vAll.length + cs.length + fAll.length + sAll.length + hs.length);
    } catch (err) { if (my === seq) box.innerHTML = `<div class="panel alert" role="alert">${esc(err.message)}</div>`; }
  };
  $('#gq').oninput = () => { clearTimeout(timer); timer = setTimeout(run, 300); };
  $('#gq').focus();
  run();
}

// ---------- Hilfe (Schritt für Schritt, DE/UK/EN) ----------
// want = Abschnitt (?s=), q = Suchbegriff (&q=, z. B. aus der globalen Suche – Treffer bleiben markiert)
async function viewHelp(want, q) {
  // Hilfe-Schritte als eigenes Paket (Backlog 597): erst hier laden; Fehler → Fehlerseite mit „Erneut versuchen“ (route)
  try { await loadHelp(S.lang); } catch (e) { console.error(e); throw new Error(t('lazy_load_failed')); }
  const sec = (n) => `<section class="panel helpsec" id="help-${n}"><h2 style="margin-top:0">${esc(t(`help_${n}_t`))}</h2><ol>${t(`help_${n}_s`).split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ol></section>`;
  const parts = helpSections(S.me.role);
  render(`<h1>${esc(t('help'))}</h1><div class="panel"><label for="hq">${esc(t('help_search'))}</label><input id="hq" type="search" autocomplete="off">${helpToc(parts)}</div>`
    + parts.map(sec).join('') + `<p class="small muted">${esc(t('app_version'))}: ${esc(S.appVersion || '–')}</p>`, 'more');
  if (q) $('#hq').value = q.slice(0, 100);
  const run = helpWire(parts, want);
  let timer;
  // Suchbegriff in die Adresse übernehmen (ohne neuen Verlaufseintrag, ohne Neuaufbau): „Zurück“ aus einem Treffer behält ihn
  const keepQ = () => { const v = $('#hq').value.trim().slice(0, 100); try { history.replaceState(history.state, '', helpHash(v)); } catch { /* z. B. eingeschränkte Vorschau */ } };
  $('#hq').oninput = () => { clearTimeout(timer); timer = setTimeout(() => { run(); keepQ(); }, 150); };
}
const helpHash = (q) => '#/help' + (q ? '?q=' + encodeURIComponent(q) : '');

// Hilfe-Abschnitte je Rolle (Reihenfolge = Anzeige)
function helpSections(r) {
  // Lesezugriff meldet nichts und macht keine Kontrollen; Mängelstatistik nur Inhaber/Fuhrparkleitung (Server) – nur Kennzahlen und Benachrichtigungen
  if (r === 'viewer') return ['viewer', 'kpi', 'costs', 'exports', 'push', 'login2fa'];
  // Disposition führt keine Abfahrtskontrolle durch (Server 403, kein Menüpunkt) – Abschnitt nicht anbieten (20.10.2026)
  const parts = ['report', 'accident', 'wild', 'tachofault', 'theft', 'glass', 'lost', 'fuel', 'flat', 'roadchk', 'nostart', 'tow', 'warnlight', 'leak', 'stow', 'custdmg', 'hitrun', 'vandal', 'marten', 'storm', 'bridge', 'fire', 'reefer', 'brake', 'parkbrake', 'pedal', 'injury', 'fixobj', 'tarp', 'load', 'mirror', 'coupling', 'grease', 'elec', 'batt', 'lights', 'door', 'stuck', 'visib', 'loose', 'adas', 'steer', 'engine', 'susp', 'gear', 'seat', 'dash', 'exhaust', 'cabtilt', 'pest', 'nest', 'gelfuel', 'safetykit', 'spare', 'wheel', 'toll', 'climate', 'window', 'fuelcap', 'fuelcard', 'underrun', 'floor', 'tyre', 'cablock', 'vibr', 'deck', 'roofice', 'cargo', 'numplate', 'pfilter', 'step', 'lashgear', 'contour', 'sticker', 'cabkit', 'cableak', 'telem', 'oillevel', 'prio', ...(r === 'dispatch' ? [] : ['check']), 'push', 'offline', 'login2fa'];
  if (r === 'workshop') parts.unshift('ws', 'costlimit', 'stock');
  if (r === 'workshop') parts.splice(parts.indexOf('stock') + 1, 0, 'tires');
  // Backlog 551: „Übernahme als neue Fuhrparkleitung“ – Wegweiser zu vorhandenen Ansichten (Inhaber/Fuhrparkleitung)
  if (['owner', 'fleet'].includes(r)) parts.unshift('fleet', 'handover', 'release', 'costlimit', 'dates', 'defects', 'kpi', 'costs', 'drivers', 'leaver', 'contracts', 'claims', 'fines', 'tires', 'stock');
  if (r === 'owner') parts.splice(parts.indexOf('stock') + 1, 0, 'privacy', 'settings');
  // Benutzer, Zugänge & Protokoll: Benutzerverwaltung hat Inhaber und Fuhrparkleitung (Protokoll nur Inhaber – im Text vermerkt)
  if (['owner', 'fleet'].includes(r)) parts.splice(parts.indexOf('stock') + 1, 0, 'access');
  // Ausdrucke & Exporte: Rollen mit CSV-/Kalender-/Druck-Funktionen (Disposition: CSV Vorgänge/Prüftermine/Fahrzeuge, Kalender Wiedervorlagen/
  // Prüftermine/Werkstattplan – 20.10.2026 ergänzt; Fahrer nur Vorgangsliste drucken – dort genügt der Knopf)
  if (['owner', 'fleet', 'workshop'].includes(r)) parts.splice(parts.indexOf('stock') + 1, 0, 'exports');
  if (r === 'dispatch') parts.splice(parts.indexOf('push'), 0, 'exports');
  if (r === 'dispatch') parts.unshift('dispo');
  if (r === 'driver') parts.unshift('myveh', 'myfines');
  return parts;
}

// Link „Hilfe zu dieser Seite“ – nur wenn die Rolle den Abschnitt sieht
const helpLink = (n) => (S.me && helpSections(S.me.role).includes(n) ? `<p class="small noprint navlinks" style="margin:0 0 4px"><a href="#/help?s=${n}">${esc(t('help_page'))} ›</a></p>` : '');

// Hilfe: Trefferzeile + Inhaltsverzeichnis (Sprungmarken als Knöpfe – die Raute gehört dem Router)
function helpToc(parts) {
  return `<p id="hres" class="small muted" aria-live="polite" style="margin:6px 0 0"></p>
    <details id="htoc"${innerWidth >= 700 ? " open" : ""}><summary>${esc(t('help_toc'))} (${parts.length})</summary><ul class="helptoc">${parts.map((n) => `<li data-hn="${n}"><button type="button" class="linkbtn" data-hgo="${n}">${esc(t(`help_${n}_t`))}</button></li>`).join('')}</ul></details>`;
}

function helpWire(parts, want) {
  const sections = parts.map((n) => ({ name: n, title: t(`help_${n}_t`), steps: t(`help_${n}_s`).split('|') }));
  const go = (n) => {
    const el = document.getElementById(`help-${n}`); if (!el) return;
    const h = el.querySelector('h2'); h.tabIndex = -1; h.dataset.keepfocus = '1';
    el.scrollIntoView({ block: 'start' }); h.focus({ preventScroll: true });
    el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1600);
  };
  $$('[data-hgo]').forEach((b) => (b.onclick = () => go(b.dataset.hgo)));
  const run = () => {
    const res = helpMatches(sections, document.getElementById('hq').value);
    for (const s of sections) {
      const m = res && res.find((x) => x.name === s.name);
      const el = document.getElementById(`help-${s.name}`);
      el.hidden = !!res && !m;
      $$('li', el).forEach((li, i) => li.classList.toggle('hit', !!m && m.steps.includes(i)));
      const tl = $(`[data-hn="${s.name}"]`); if (tl) tl.hidden = el.hidden;
    }
    $('#hres').textContent = !res ? '' : res.length === 1 ? t('help_hits1') : res.length ? tn('help_hits', res.length) : t('help_none');
  };
  if (document.getElementById('hq').value) run(); // vorbelegter Suchbegriff: erst filtern, dann zum Abschnitt springen
  if (want && parts.includes(want)) go(want);
  return run;
}

// ---------- Mängelstatistik der Kontrollen ----------
async function viewDefects(...a) { return (await lazyModule('verwaltung')).viewDefects(...a); }

// ---------- Reifen über die Flotte ----------



async function viewFleetTires(...a) { return (await lazyModule('verwaltung')).viewFleetTires(...a); }

// ---------- Mehr / Benutzer / Einstellungen ----------
function viewMore(open) {
  render(`<h1>${esc(t('nav_more'))}</h1><div class="list morelist">
    ${S.me.role !== 'driver' ? `<a class="row" href="#/vehicles"><span>${ICON.truck}</span><span class="title">${esc(t('vehicles'))}</span><span></span></a>` : ''}
    ${mayCheck() ? `<a class="row" href="#/check"><span>✓</span><span class="title">${esc(t('departure_check'))}</span><span></span></a>` : ''}
    <a class="row" href="#/inbox"><span>${ICON.bell}</span><span class="title">${esc(t('notifications'))}</span><span></span></a>
    <a class="row" href="#/help"><span>?</span><span class="title">${esc(t('help'))}</span><span></span></a>
    <a class="row" href="#/emergency"><span>☎</span><span class="title">${esc(t('em_title'))}</span><span></span></a>
    ${isMgr() || S.me.role === 'dispatch' || S.me.role === 'workshop' ? `<a class="row" href="#/guide"><span>▤</span><span class="title">${esc(t('guide'))}</span><span></span></a>` : ''}
    ${isMgr() ? `<a class="row" href="#/drivers"><span>🪪</span><span class="title">${esc(t('drivers'))}</span><span></span></a>` : S.me.role === 'driver' ? `<a class="row" href="#/drivers"><span>🪪</span><span class="title">${esc(t('my_driver_file'))}</span><span></span></a>` : ''}
    ${isMgr() ? `<a class="row" href="#/contracts"><span>📄</span><span class="title">${esc(t('ct_title'))}</span><span></span></a>` : ''}
    ${isMgr() ? `<a class="row" href="#/claims"><span>🛡️</span><span class="title">${esc(t('claims'))}</span><span></span></a>` : ''}
    ${isMgr() ? `<a class="row" href="#/tacho"><span>⏏</span><span class="title">${esc(t('tacho'))}</span><span></span></a>` : ''}
    ${['owner', 'fleet', 'viewer'].includes(S.me.role) ? `<a class="row" href="#/fines"><span>§</span><span class="title">${esc(t('fines'))}</span><span></span></a>` : S.me.role === 'driver' ? `<a class="row" href="#/fines"><span>§</span><span class="title">${esc(t('my_fines'))}</span><span></span></a>` : ''}
    ${['owner', 'fleet', 'workshop', 'viewer'].includes(S.me.role) ? `<a class="row" href="#/tires"><span>◎</span><span class="title">${esc(t('fleet_tires'))}</span><span></span></a>` : ''}
    ${S.me.role !== 'driver' ? `<a class="row" href="#/maintenance"><span>📅</span><span class="title">${esc(t('inspections_due'))}</span><span></span></a>` : ''}
    ${['owner', 'fleet', 'viewer', 'workshop', 'dispatch'].includes(S.me.role) ? `<a class="row" href="#/plan"><span>🗓</span><span class="title">${esc(t('wplan'))}</span><span></span></a>` : ''}
    ${['owner', 'fleet', 'viewer', 'workshop'].includes(S.me.role) ? `<a class="row" href="#/wsload"><span>⚒</span><span class="title">${esc(t('ws_load'))}</span><span></span></a>` : ''}
    ${isMgr() ? `<a class="row" href="#/defects"><span>⚠</span><span class="title">${esc(t('defect_stats'))}</span><span></span></a>` : ''}
    ${['owner', 'fleet', 'viewer'].includes(S.me.role) ? `<a class="row" href="#/kpi"><span>⏱</span><span class="title">${esc(t('kpi'))}</span><span></span></a>` : ''}
    ${['owner', 'fleet', 'viewer'].includes(S.me.role) ? `<a class="row" href="#/costs"><span>€</span><span class="title">${esc(t('costs_report'))}</span><span></span></a>` : ''}
    ${['owner', 'fleet', 'workshop'].includes(S.me.role) ? `<a class="row" href="#/stock"><span>▦</span><span class="title">${esc(t('stock'))}</span><span></span></a>` : ''}
    ${isMgr() ? `<a class="row" href="#/users"><span>👤</span><span class="title">${esc(t('users'))}</span><span></span></a>` : ''}
    ${isMgr() ? `<a class="row" href="#/telematics"><span>⌖</span><span class="title">${esc(t('telematics'))}</span><span></span></a>` : ''}
    ${isMgr() ? `<a class="row" href="#/quality"><span>✓</span><span class="title">${esc(t('dq'))}</span><span></span></a>` : ''}
    ${S.me.role === 'owner' ? `<a class="row" href="#/readiness"><span>☑</span><span class="title">${esc(t('rd_title'))}</span><span></span></a>` : ''}
    ${S.me.role === 'owner' ? `<a class="row" href="#/usage"><span>📊</span><span class="title">${esc(t('usage'))}</span><span></span></a>` : ''}
    ${S.me.role === 'owner' ? `<a class="row" href="#/audit"><span>🔒</span><span class="title">${esc(t('audit'))}</span><span></span></a>` : ''}
    ${S.me.role === 'owner' ? `<a class="row" href="#/settings"><span>⚙</span><span class="title">${esc(t('settings'))}</span><span></span></a>` : ''}
  </div>
  <h2>${esc(t('nav_profile'))}</h2><section class="panel"><p><b>${esc(S.me.display_name)}</b> · ${esc(S.me.username)} · ${esc(t('role_' + S.me.role))}${S.me.environment === 'test' ? ' · <span class="chip test">TEST</span>' : ''}</p>${langSelect()}
  ${S.me.role !== 'driver' ? `<div id="hsbox"><label for="homesite">${esc(t('home_site'))}</label><select id="homesite"><option value="">${esc(t('filter_all'))}</option>${S.me.home_site ? `<option selected>${esc(S.me.home_site)}</option>` : ''}</select><p class="small muted">${esc(t(S.me.role === 'workshop' ? 'home_site_hint_ws' : S.me.role === 'dispatch' ? 'home_site_hint_dispo' : 'home_site_hint'))}</p></div>` : ''}
  <details><summary>${esc(t('change_password'))}</summary><form id="pw"><label>${esc(t('old_password'))}</label><input type="password" name="old_password" required autocomplete="current-password"><label>${esc(t('new_password'))}<span class="hint">${esc(t('pw_rule'))}</span></label><input type="password" name="new_password" required minlength="10" maxlength="200" autocomplete="new-password"><div class="actions"><button class="btn secondary">${esc(t('save'))}</button></div></form></details>
  <details id="tfa"><summary>${esc(t('tf_title'))} <span class="chip ok" id="tfchip"${S.me.totp_enabled ? '' : ' hidden'}>${esc(t('tf_chip'))}</span></summary><div id="tfabox"><p class="muted">${esc(t('loading'))}</p></div></details>
  <details id="sess"><summary>${esc(t('my_sessions'))}</summary><p class="small muted">${esc(t('new_login_hint'))}</p><div id="sesslist" class="list"><p class="muted">${esc(t('loading'))}</p></div><h3>${esc(t('kd_title'))}</h3><p class="small muted">${esc(t('kd_hint'))}</p><div id="kdlist" class="list"></div></details>
  <div class="actions"><button class="btn secondary" id="lo">${esc(t('logout'))}</button></div></section>`, 'more');
  bindLang(true);
  const hs = $('#homesite');
  if (hs) {
    api('GET', '/api/sites').then((r) => {
      // gespeicherter Standort in anderer Schreibweise („Hamburg“ ↔ „HAMBURG“): vorhandene Option wählen statt doppelt anzeigen (23.10.2026)
      const cur0 = S.me.home_site || ''; const cur = (cur0 && r.sites.find((x) => siteKeyUi(x) === siteKeyUi(cur0))) || cur0;
      hs.innerHTML = `<option value="">${esc(t('filter_all'))}</option>` + [...new Set([...r.sites, ...(cur ? [cur] : [])])].map((x) => `<option value="${esc(x)}"${x === cur ? ' selected' : ''}>${esc(x === 'ohne' ? t('cs_nosite') : x)}</option>`).join('');
    }).catch(() => {});
    hs.onchange = async () => {
      try {
        await api('PATCH', '/api/me', { home_site: hs.value });
        S.me.home_site = hs.value || null;
        // neue Voreinstellung gilt sofort für alle Standortfilter dieser Sitzung
        for (const k of ['costSite', 'defSite', 'fineSite', 'maintSite', 'tireSite', 'vehSite', 'caseVsite', 'kpiVsite', 'planVsite', 'dqSite', 'claimSite', 'ctSite', 'drvSite', 'tachoSite']) delete S[k];
        toast('✓');
      } catch (err) { toast(err.message, true); }
    };
  }
  const sess = $('#sess');
  const loadSessions = async () => {
    const box = $('#sesslist'); if (!box) return;
    const sr = await api('GET', '/api/me/sessions'); const list = sr.sessions; const orphan = sr.orphan_push_devices || 0;
    box.innerHTML = list.map((x) => `<div class="row"><span>${x.current ? '●' : '○'}</span><span class="title">${esc(x.device === 'Unbekanntes Gerät' ? t('unknown_device_l') : x.device)}${x.current ? ` <span class="chip ok">${esc(t('this_device'))}</span>` : ''}</span>${x.current ? '<span></span>' : `<button type="button" class="btn secondary" data-sid="${esc(x.id)}">${esc(t('sign_out_device'))}</button>`}<span class="sub" style="white-space:normal">${esc(t('last_active'))}: ${fmtDT(x.last_seen)} · ${esc(t('signed_in_at'))}: ${fmtDT(x.created_at)}</span></div>`).join('')
      // Backlog 225: Push-Geräte ohne lebende Anmeldung (altes/verlorenes Handy) – Hinweis und Knopf auch, wenn nur „dieses Gerät“ angemeldet ist
      + (orphan > 0 ? `<p class="small" id="sessorphan">⚠ ${esc(t('sess_orphan_push').replace('{n}', orphan))}</p>` : '')
      + (list.length > 1 || orphan > 0 ? `<div class="actions"><button type="button" class="btn secondary" id="sessall">${esc(t('sign_out_others'))}</button></div>` : '');
    $$('[data-sid]', box).forEach((b) => (b.onclick = async () => { try { await api('DELETE', `/api/me/sessions/${b.dataset.sid}`); toast('✓'); await loadSessions(); } catch (err) { toast(err.message, true); } }));
    const all = $('#sessall', box); if (all) all.onclick = async () => { try { const r = await api('POST', '/api/me/sessions/revoke-others'); toast(t('sessions_ended_n').replace('{n}', r.revoked) + (r.push_devices ? ' · ' + t('push_revoked_n').replace('{n}', r.push_devices) : '')); await loadSessions(); } catch (err) { toast(err.message, true); } };
    await loadKnown();
  };
  // Bekannte Geräte: „dieses Gerät“ über die Gerätekennung (Header, wird serverseitig nur gehasht verglichen); dieses Gerät kann nicht vergessen werden
  const loadKnown = async () => {
    const box = $('#kdlist'); if (!box) return;
    const list = (await api('GET', '/api/me/known-devices', undefined, { headers: { 'x-cfp-device': deviceId() } })).devices;
    const dev = (x) => (x.device === 'Unbekanntes Gerät' ? t('unknown_device_l') : x.device);
    box.innerHTML = list.length ? list.map((x) => `<div class="row"><span>${x.current ? '●' : '○'}</span><span class="title">${esc(dev(x))}${x.current ? ` <span class="chip ok">${esc(t('this_device'))}</span>` : ''}</span>${x.current ? '<span></span>' : `<button type="button" class="btn secondary" data-kd="${esc(x.id)}" data-dev="${esc(dev(x))}">${esc(t('kd_forget'))}</button>`}<span class="sub" style="white-space:normal">${esc(t('kd_last'))}: ${fmtDT(x.last_seen)} · ${esc(t('kd_first'))}: ${fmtDT(x.first_seen)}</span></div>`).join('')
      : `<p class="muted">${esc(t('kd_none'))}</p>`;
    $$('[data-kd]', box).forEach((b) => (b.onclick = async () => { if (!confirm(t('kd_forget_confirm').replace('{d}', b.dataset.dev))) return; try { await api('DELETE', `/api/me/known-devices/${b.dataset.kd}`, undefined, { headers: { 'x-cfp-device': deviceId() } }); toast('✓'); await loadKnown(); } catch (err) { toast(err.message, true); } }));
  };
  sess.ontoggle = () => { if (sess.open) loadSessions().catch((err) => toast(err.message, true)); };
  // Sprung aus dem Hinweis „Neue Anmeldung auf einem anderen Gerät“: Geräteliste gleich öffnen
  if (open === 'sess') { sess.open = true; sess.scrollIntoView({ block: 'start' }); }
  const tfa = $('#tfa');
  tfa.ontoggle = () => { if (tfa.open) loadTotp().catch((err) => toast(err.message, true)); };
  // Abmelden ohne Netz: Meldung statt stillem Abbruch (Sitzung bliebe sonst unbemerkt bestehen – geteilte Tablets); bereits abgelaufen (401): trotzdem aufräumen
  // Backlog 533: ohne Verbindung stehender Hinweis (#lo_off) statt kurzer Einblendung, damit das Gerät nicht angemeldet weitergegeben wird
  $('#lo').onclick = async () => { if (!(await logoutOutboxOk())) return; try { await api('POST', '/api/logout', { push_endpoint: await pushOffForLogout() }); } catch (err) { if (err.status !== 401) { if (err.offline) { const box = $('#lo_off') || Object.assign(document.createElement('p'), { id: 'lo_off', className: 'small alert' }); box.setAttribute('role', 'alert'); box.textContent = t('logout_offline'); $('#lo').closest('.actions').after(box); return; } toast(err.message, true); return; } } clearOfflineData(); resetUserState(); markSession(''); location.hash = '#/login'; };
  $('#pw').onsubmit = async (e) => { e.preventDefault(); try { await api('POST', '/api/me/password', Object.fromEntries(new FormData(e.target)));
    // Passwörter nicht im offenen Formular stehen lassen; der Server meldet andere Geräte ab (19.10.2026)
    e.target.reset(); const dd = e.target.closest('details'); if (dd) dd.open = false; toast('✓ ' + t('pw_changed_others')); } catch (err) { toast(err.message, true); } };
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
        const r = await api('POST', '/api/me/totp/setup', { password: $('#tfpw').value });
        $('#tfpw').value = ''; $('#tfs').hidden = true;
        const key = r.secret.replace(/(.{4})/g, '$1 ').trim();
        $('#tfstep').innerHTML = `<p class="small">${esc(t('tf_scan'))}</p><div class="qr">${(() => { try { return qrSvg(r.uri, { label: t('tf_title') }); } catch { return ''; } })()}</div>
          <p class="small">${esc(t('tf_key'))}: <code style="word-break:break-all">${esc(key)}</code></p>
          <form id="tfe"><label for="tfc">${esc(t('tf_code'))}</label><input id="tfc" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9 ]{6,7}" maxlength="7" required><div class="actions"><button class="btn">${esc(t('tf_enable'))}</button><button type="button" class="btn secondary" id="tfx">${esc(t('tf_cancel'))}</button></div></form>`;
        $('#tfx').onclick = () => loadTotp();
        $('#tfe').onsubmit = async (ev) => {
          ev.preventDefault();
          try {
            const x = await api('POST', '/api/me/totp/enable', { code: $('#tfc').value.trim() });
            S.me.totp_enabled = true; tfChip();
            box.innerHTML = rcBlock(x.recovery_codes, t('tf_others_ended')) + `<div class="actions"><button type="button" class="btn" id="tfdone">OK</button></div>`;
            wireRc(x.recovery_codes);
            $('#tfdone').onclick = () => loadTotp();
          } catch (err) { toast(err.message, true); }
        };
      } catch (err) { toast(err.message, true); }
    };
    return;
  }
  box.innerHTML = `<p><span class="chip ok">${esc(t('tf_on').replace('{d}', fmtDT(st.enabled_at)))}</span> <span class="small ${st.recovery_left <= 2 ? '' : 'muted'}">${esc(t('tf_rc_left').replace('{n}', st.recovery_left))}</span></p>
    <details><summary>${esc(t('tf_rc_new'))}</summary><form id="tfr"><p class="small muted">${esc(t('tf_rc_new_hint'))}</p><label for="tfrc">${esc(t('tf_code'))}</label><input id="tfrc" inputmode="numeric" autocomplete="one-time-code" maxlength="7" required><div class="actions"><button class="btn secondary">${esc(t('tf_rc_new'))}</button></div></form></details>
    <details><summary>${esc(t('tf_disable'))}</summary><form id="tfd"><label for="tfdpw">${esc(t('tf_pw'))}</label><input id="tfdpw" type="password" autocomplete="current-password" required><label for="tfdc">${esc(t('tf_code_or_rc'))}</label><input id="tfdc" autocomplete="one-time-code" autocapitalize="none" maxlength="14" required><div class="actions"><button class="btn danger">${esc(t('tf_disable'))}</button></div></form></details>
    <div id="tfout"></div>`;
  $('#tfr').onsubmit = async (e) => {
    e.preventDefault();
    try { const x = await api('POST', '/api/me/totp/recovery-codes', { code: $('#tfrc').value.trim() }); $('#tfout').innerHTML = rcBlock(x.recovery_codes); wireRc(x.recovery_codes); $('#tfrc').value = ''; }
    catch (err) { toast(err.message, true); }
  };
  $('#tfd').onsubmit = async (e) => {
    e.preventDefault();
    try { await api('POST', '/api/me/totp/disable', { password: $('#tfdpw').value, code: $('#tfdc').value.trim() }); S.me.totp_enabled = false; tfChip(); toast('✓'); loadTotp(); }
    catch (err) { toast(err.message, true); }
  };
}





async function viewUsers(...a) { return (await lazyModule('verwaltung')).viewUsers(...a); }

async function viewSettings(...a) { return (await lazyModule('verwaltung')).viewSettings(...a); }

// ---------- Aktualisierung: neue App-Fassung erkennen ----------
// Lange geöffnete Apps (Werkstatt-Tablet, Handy im Hintergrund) laden neue Fassungen sonst erst beim nächsten Neustart.
// Kein automatisches Neuladen – ein halb ausgefülltes Formular darf nicht verloren gehen; die Person entscheidet.
async function fetchVersion() {
  try { const r = await fetch('/version.json', { cache: 'no-store' }); if (!r.ok) return null; return (await r.json()).version || null; } catch { return null; }
}
async function checkVersion() {
  // eigene Fassung aus dem geladenen Code, nicht aus der ersten erreichbaren version.json (Offline-Start + Deployment, 22.10.2026)
  if (!S.appVersion && BUILD_VERSION) S.appVersion = BUILD_VERSION;
  const v = await fetchVersion();
  if (!v) return;
  if (!S.appVersion) { S.appVersion = v; return; }
  if (v === S.appVersion || document.getElementById('upd')) return;
  const el = document.createElement('div');
  el.id = 'upd'; el.className = 'update-bar'; el.setAttribute('role', 'status');
  el.innerHTML = `<span>${esc(t('update_available'))}</span><button type="button" class="btn">${esc(t('update_now'))}</button><button type="button" class="btn secondary" aria-label="${esc(t('later'))}">×</button>`;
  const [now, later] = el.querySelectorAll('button');
  // halb ausgefülltes Formular: erst nachfragen (20.10.2026: „Neu laden“ verwarf Eingaben ungefragt)
  now.onclick = () => { if (viewDirty() && !confirm(t('update_unsaved'))) return; location.reload(); };
  later.onclick = () => el.remove();
  document.body.appendChild(el);
}
checkVersion();
// Enter in einem Mangel-Vermerk der Prüfliste (Abfahrtskontrolle, Kontrolle nach Reparatur) sendet nicht die ganze Kontrolle ab –
// Fotos/km fehlten sonst (19.10.2026, wie Enter im Fahrzeug-Suchfeld)
document.addEventListener('keydown', (e) => { const el = e.target; if (e.key === 'Enter' && el && el.tagName === 'INPUT' && /__note$/.test(el.name || '')) e.preventDefault(); }, true);
// Browser-Prüfhinweise (Pflichtfeld, Mindestlänge, Format, Bereich) in der App-Sprache statt in der Gerätesprache.
// Eigene Meldungen (setCustomValidity, z. B. „mehrdeutig“) bleiben unangetastet; nach der nächsten Eingabe wird neu geprüft.
function nativeValidityText(el) {
  const v = el.validity; if (!v || v.valid || v.customError) return '';
  const isDate = el.type === 'date' || el.type === 'month';
  const lim = (x) => (isDate && /^\d{4}-\d{2}-\d{2}$/.test(x) ? fmtD(x) : x);
  if (v.valueMissing) return t(el.type === 'checkbox' ? 'v_check' : el.type === 'file' ? 'v_file' : el.type === 'radio' || el.tagName === 'SELECT' ? 'v_choose' : 'v_required');
  if (v.tooShort) return tn('v_too_short', el.minLength).replace('{c}', el.value.length);
  if (v.tooLong) return tn('v_too_long', el.maxLength);
  if (v.badInput) return t('v_bad');
  if (v.typeMismatch) return t(el.type === 'email' ? 'v_type_email' : 'v_type');
  if (v.patternMismatch) return t('v_pattern');
  if (v.rangeUnderflow) return t(isDate ? 'v_min_date' : 'v_min').replace('{n}', () => lim(el.min));
  if (v.rangeOverflow) return t(isDate ? 'v_max_date' : 'v_max').replace('{n}', () => lim(el.max));
  if (v.stepMismatch) return t('v_step').replace('{n}', () => el.step);
  return '';
}
document.addEventListener('invalid', (e) => {
  const el = e.target; if (!el || typeof el.setCustomValidity !== 'function') return;
  const msg = nativeValidityText(el); if (!msg) return;
  el.setCustomValidity(msg); el.dataset.cfpNv = '1';
}, true);
// Jede Eingabe im selben Formular hebt alle so gesetzten Hinweise auf (Radiogruppen, per Skript ausgeblendete Pflichtfelder) – beim nächsten Absenden prüft der Browser neu
const clearNativeValidity = (e) => {
  const el = e.target; if (!el || !el.dataset) return;
  const scope = el.form || (el.closest && el.closest('form'));
  for (const x of scope ? scope.querySelectorAll('[data-cfp-nv]') : el.dataset.cfpNv ? [el] : []) { delete x.dataset.cfpNv; x.setCustomValidity(''); }
};
// Erfassungsphase: läuft vor den Feld-Prüfungen unten (sonst würde z. B. „mehrdeutig“ wieder gelöscht)
document.addEventListener('input', clearNativeValidity, true);
document.addEventListener('change', clearNativeValidity, true);
// Zahlenfelder (Preise, Mengen, Stunden): „2.000“ ist mehrdeutig (2 oder 2000?) – der Server weist es ab; hier schon am Feld in der App-Sprache melden
const AMBIG_RE = /^-?[1-9]\d{0,2}(\.\d{3})+$/;
// EN-Oberfläche: Punkt = Dezimaltrennzeichen („2.125“ = 2,125) – der Server liest dort ebenso (pointDec, 19.10.2026)
const AMBIG_NUM = { test: (x) => S.lang !== 'en' && AMBIG_RE.test(x) };
document.addEventListener('input', (e) => { const el = e.target; if (el instanceof HTMLInputElement && el.inputMode === 'decimal') el.setCustomValidity(AMBIG_NUM.test(el.value.trim()) ? t('num_ambiguous') : ''); });
document.addEventListener('change', (e) => { const el = e.target; if (el instanceof HTMLInputElement && el.inputMode === 'decimal' && AMBIG_NUM.test(el.value.trim())) el.reportValidity(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkVersion(); });
setInterval(checkVersion, 30 * 60 * 1000);

// ---------- Start ----------
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
  // Push-Klick auf die schon offene Ansicht: neu aufbauen (gleicher Hash löst kein hashchange aus; 18.10.2026), Eingaben bleiben unangetastet
  navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.type === 'navigate') {
    // abgemeldet (Leerlauf) bei offenem Fenster: Umgebung für die Anmeldung in der Adresse merken – wie beim Kaltstart „?env=“ (23.10.2026: Test-Vorgang → „nicht gefunden“)
    if (!S.me && ['test', 'production'].includes(e.data.env)) history.replaceState(history.state, '', location.pathname + '?env=' + e.data.env + location.hash);
    if (pushEnv(e.data.env)) { if (location.hash === e.data.hash) route(); else location.hash = e.data.hash; return; } if (location.hash === e.data.hash) { if (!viewDirty()) route(); } else location.hash = e.data.hash; } if (e.data && e.data.type === 'push') refreshUnread(true).then(inboxPush); });
}
document.documentElement.lang = S.lang;
route();

// Ausgelagerte Bereiche (Backlog 593): einmal laden; Fehler (z. B. offline ohne Cache) → beim nächsten Aufruf erneut versuchen.
// Backlog 595: dauert das erste Laden länger als 300 ms (langsames Netz), zeigt die Seite „Lädt…“ statt still die vorige Seite –
// nur solange noch dieselbe Seite aufgerufen ist (kein Überschreiben einer inzwischen geöffneten anderen Seite).
// Erneuter Versuch nach einem Fehler mit „?r=N“: der Browser merkt sich ein fehlgeschlagenes import() je Adresse und lieferte sonst
// bis zum Neuladen immer wieder denselben Fehler (UI-Test 29.10.2026); die App-Hülle im Service Worker findet die Datei trotzdem (ignoreSearch).
const LAZY_MODULES = {}, LAZY_READY = {}, LAZY_TRY = {}, LAZY_HINT_MS = 300;
function lazyModule(g) {
  if (!LAZY_MODULES[g]) LAZY_MODULES[g] = import(`./app-${g}.js${LAZY_TRY[g] ? `?r=${LAZY_TRY[g]}` : ''}`).then((m) => { LAZY_READY[g] = true; return m; }).catch((e) => { delete LAZY_MODULES[g]; LAZY_TRY[g] = (LAZY_TRY[g] || 0) + 1; console.error(e); throw new Error(t('lazy_load_failed')); });
  if (!LAZY_READY[g]) { const gen = S.routeGen, h = location.hash, p = LAZY_MODULES[g]; setTimeout(() => { if (!LAZY_READY[g] && LAZY_MODULES[g] === p && S.routeGen === gen && location.hash === h) render(`<p class="muted">${esc(t('loading'))}</p>`); }, LAZY_HINT_MS); }
  return LAZY_MODULES[g];
}

export { $, $$, BERLIN_DT_FMT, BERLIN_FMT, CT_KINDS, DEFECT_RESULTS, MORE_MAX, OPEN_CASE_ST, S, STATES, TM_PROV, TST, afLink, agentFindingsCsv, api, auditActionLabel, auditDetailText, bDate, berlinLocalDT, bindTachoCancel, cDesc, caseList, checkLabel, claimChip, clipTxt, coverageGaps, ctChip, ctLines, ctRet, dataQualityCsv, decIn, defectItemsCsv, defectVehiclesCsv, download, downloadChecked, dqDetail, dur, emHoursText, envFn, esc, eur, eur3, eurIst, fMsg, fcLabel, federalHoliday, fileUrl, filterUsers, fmtD, fmtDT, fmtDue, fmtHM, fmtKm, fmtMm, fmtMonth, fmtNum, helpLink, helpNorm, hj, hoMissing, holName, holidayGaps, huNote, inviteExpired, isMgr, isUnusedUser, isWeekendD, kmFcHint, kmFcHtml, kmUnclearDateDue, langAttr, ltxt, mEv, mY, maintOrderHtml, markInvalid, mayReport, mk, mkR, nDays, noVehiclesNote, noneP, nowMs, occurredFields, occurredValue, odoSrc, offDayWatch, ownerT, partsEta, partsWaitDays, planVehTag, plate, plateCmp, pnm, posL, prepareUpload, printHead, printStamp, provL, qrSvg, rc2, readCsvFile, reasonText, render, rwsDrop, saveVehicleForm, searchKey, siteKeyUi, siteSelect, sortPref, sortUsers, stackTables, stockNoteText, supplierLabel, t, tachoHistList, telAbroad, telHref, tireAge, tlHash, tmAge, tmKmRej, tn, toast, translateNextAction, uiLoc, uid, unitL, usersCsv, vehicleForm, vehiclesCached, vlAt, vsDef, warrChip, woApptTxt, woTag, wsAll, wsForSite, wsLabel, wsName, wsOptions };
