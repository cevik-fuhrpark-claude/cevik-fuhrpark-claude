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
import { parseHours, durationIn, H_UNIT as H_U, parseQty, qtyIn, unitCanon, moneyIn, moneyForeign, kmIn, unitIn, tireSizeSame, tireSizeFmt } from './hours.js';
import { reachableNow, dayRanges, coverageGaps, windowsOf, MORE_MAX, nextOpen, tzDiff, nextOpenLocal, holidayGaps, phoneIn } from './emhours.js';

// [CLAUDE] Backlog 794: Lookbehind-Ausdrücke auch in Safari/iOS < 16.4 (eingesetzt von scripts/build-app.mjs, Erklärung dort)
function lbRx(src, flags, testOnly) {
  if (lbRx.ok === undefined) { try { lbRx.ok = !!new RegExp('(?<=a)b'); } catch (e) { lbRx.ok = false; } }
  return new RegExp(lbRx.ok ? src : lbFallback(src, !!testOnly), flags);
}
function lbFallback(src, exact) {
  const classEnd = (i) => { for (let j = i + 1; j < src.length; j++) { if (src[j] === '\\') j++; else if (src[j] === ']') return j + 1; } return src.length; };
  const groupEnd = (i) => { let d = 0; for (let j = i; j < src.length; j++) { const c = src[j]; if (c === '\\') j++; else if (c === '[') j = classEnd(j) - 1; else if (c === '(') d++; else if (c === ')' && --d === 0) return j + 1; } return src.length; };
  const negOne = (x) => { const m = /^\[(\^?)((?:\\.|[^\]\\])*)\]$/.exec(x); if (m) return m[1] ? '[' + m[2] + ']' : '[^' + m[2] + ']';
    if (/^\\[wdsWDS]$/.test(x)) return '\\' + (x[1] === x[1].toLowerCase() ? x[1].toUpperCase() : x[1].toLowerCase());
    if (x.length === 1 && !/[\\^$.|?*+()[\]{}/]/.test(x)) return '[^' + (x === '-' ? '\\-' : x) + ']';
    return null; };
  let out = ''; const st = [true]; let at = true;
  for (let i = 0; i < src.length;) {
    const c = src[i];
    if (c === '\\') { out += src.slice(i, i + 2); i += 2; at = false; continue; }
    if (c === '[') { const e = classEnd(i); out += src.slice(i, e); i = e; at = false; continue; }
    if (c === '(' && (src.startsWith('(?<=', i) || src.startsWith('(?<!', i))) {
      const e = groupEnd(i), inner = src.slice(i + 4, e - 1);
      if (exact && at) {
        if (src[i + 3] === '=') { out += '(?:' + lbFallback(inner, false) + ')'; at = false; }
        else { const one = negOne(inner); if (one) { out += '(?:^|' + one + ')'; at = false; } }
      }
      i = e; continue;
    }
    if (c === '(') { const look = src.startsWith('(?=', i) || src.startsWith('(?!', i); const h = look || src.startsWith('(?:', i) ? 3 : src.startsWith('(?<', i) ? src.indexOf('>', i) + 1 - i : 1;
      st.push(at && !look); out += src.slice(i, i + h); i += h; at = at && !look; continue; }
    if (c === ')') { st.pop(); out += c; i++; at = false; continue; }
    if (c === '|') { out += c; i++; at = st[st.length - 1]; continue; }
    if (c === '^') { out += c; i++; continue; }
    out += c; i++; at = false;
  }
  return out;
}

// Sprache: gespeicherte Wahl, sonst Gerätesprache (Ukrainisch/Englisch), sonst Deutsch
// Backlog 381: alle bevorzugten Sprachen des Geräts in Reihenfolge prüfen (z. B. ru-RU, uk-UA → uk; vorher nur die erste → Deutsch)
const deviceLang = () => { let ls = []; try { ls = [...(navigator.languages || []), navigator.language || '']; } catch { ls = [navigator.language || '']; } for (const x of ls) { const l = String(x || '').toLowerCase(); if (l.startsWith('uk')) return 'uk'; if (l.startsWith('en')) return 'en'; if (l.startsWith('de')) return 'de'; } return 'de'; };
// Sortierwahl je Gerät/Tab merken (nur erlaubte Werte, sonst Standard; Speicher kann fehlen oder werfen)
const sortPref = (key, allowed, def, set) => { const k = 'cfp_sort_' + key; if (set !== undefined) { try { sessionStorage.setItem(k, set); } catch {} return set; } let v = ''; try { v = sessionStorage.getItem(k) || ''; } catch {} return allowed.includes(v) ? v : def; };
const CASE_SORTS = ['priority', 'oldest', 'updated'], VEH_SORTS = ['plate', 'next_due', 'km_due', 'check_oldest', 'km_desc', 'findings'];
let lastActivity = Date.now(), lastApiAt = 0, idleBusy = false; // Leerlauf-Abmeldung (siehe noteActivity)
// CSV-Datei lesen; gemischte Zeichenkodierung → Meldung in der App-Sprache (unbehandelte Ablehnung mit status → Toast)
const readCsvFile = async (f) => { try { return await readCsvRaw(f); } catch (e) { if (e && (e.code === 'csv_mixed_encoding' || e.code === 'csv_unknown_encoding')) e.message = t(e.code); throw e; } };
// Anfrageschlüssel je Formularinhalt: gleicher Inhalt (Wiederholung nach verlorener Antwort) = gleicher Schlüssel, geänderter Inhalt = neue Buchung
// (21.10.2026: Lager – nach „Keine Verbindung“ korrigierte Buchung wurde als Wiederholung still verworfen)
// Backlog 793: uid() statt randomUUID – randomUUID fehlt in Android-WebView/Chrome < 92 und iOS < 15.4 (Buchung scheiterte dort mit Skriptfehler)
const rkFor = (form, b) => { const sig = JSON.stringify(b); if (!form.dataset.rk || form.dataset.rkSig !== sig) { form.dataset.rk = uid(); form.dataset.rkSig = sig; } return form.dataset.rk; };

const lostMark = (form, b, err) => { if (err && err.offline) form.dataset.lostSig = JSON.stringify(b); };
const lostDup = (form, b, err, codes) => !!err && codes.includes(err.code) && form.dataset.lostSig === JSON.stringify(b);
// Backlog 805j: Antwort „unverändert“/„nicht gefunden“ auf die Wiederholung derselben Eingabe nach verlorener Antwort = erste Speicherung kam an
const lostIs = (el, b) => !!el && el.dataset.lostSig === JSON.stringify(b);
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
  if (el.dataset.txt !== txt) { el.dataset.txt = txt; el.textContent = txt; } // Backlog 896: Vergleich nicht über textContent (Browser-Übersetzung ändert ihn → ständiges Neusetzen)
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
// Backlog 793 (Blickwinkel „Fahrer mit älterem Handy/Browser“): Ohne crypto.randomUUID (Chrome < 92, iOS < 15.4) eine UUID v4 aus
// crypto.getRandomValues – nur Hexziffern und Bindestriche. Vorher „Zeit + Math.random()“ mit Punkt: das Lager lehnte solche Schlüssel ab
// (`request_key: ungültiger Wert`), zufällig war er auch nicht kryptografisch.
const uid = () => { if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join(''); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`; };
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
// Backlog 806 (Blickwinkel „Handy steht auf ukrainischer Zeit“): Uhrzeit-Eingaben gelten als deutsche Zeit. Steht das Gerät auf einer
// anderen Zeitzone (z. B. Kyjiw, +1:00), sieht die Person dort eine andere Uhrzeit als in Deutschland – Hinweis mit Unterschied und
// aktueller deutscher Uhrzeit (Serverzeit-korrigiert). Gleiche Zeitzone oder ohne Intl-Unterstützung: kein Hinweis.
const berlinOffMin = (ms) => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return Math.round((Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour) % 24, Number(p.minute)) - Math.floor(ms / 60000) * 60000) / 60000); };
const tzDiffMin = (ms = Date.now()) => { try { const d = -new Date(ms).getTimezoneOffset() - berlinOffMin(ms); return Number.isFinite(d) ? d : 0; } catch { return 0; } };
const tzDiffText = (d) => { const a = Math.abs(d); return `${d > 0 ? '+' : '−'}${Math.floor(a / 60)}:${String(a % 60).padStart(2, '0')}`; };
const tzNote = () => { const d = tzDiffMin(); return d ? `<p class="small alert" data-tzdiff role="note" style="margin:2px 0 8px">${esc(t('tz_device_diff').replace('{d}', tzDiffText(d)).replace('{now}', fmtHM(new Date(nowMs()).toISOString())))}</p>` : ''; };
// Eingabe Tag + optionale Uhrzeit (deutsche Zeit wie die Tatzeit bei Bußgeldern); cur = gespeicherter Wert
const occurredFields = (cur, named = false) => { const dt = cur && cur.length > 10 ? berlinLocalDT(cur) : ''; const dv = cur ? (dt ? dt.slice(0, 10) : cur) : ''; const tv = dt ? dt.slice(11, 16) : '';
  return `<div class="grid2" data-occ><div><label for="occd">${esc(t('occ_date'))}<span class="hint">${esc(t('occ_date_hint'))}</span></label><input type="date" id="occd"${named ? ' name="occ_date"' : ''} max="${bDate()}" value="${esc(dv)}"><div class="occq noprint" data-occq role="group" aria-label="${esc(t('occ_q_label'))}">${[0, 1, 2].map((n) => `<button type="button" class="btn secondary small" data-occd="${n}" title="${esc(fmtD(bDate(-n)))}">${esc(t('occ_q_' + n))}</button>`).join('')}</div><p class="small noprint" data-occdesc hidden></p></div><div><label for="occt">${esc(t('occ_time'))}<span class="hint">${esc(t('occ_time_hint'))}</span></label><input type="time" id="occt"${named ? ' name="occ_time"' : ''} step="60" value="${esc(tv)}"></div></div>${tzNote()}`; };
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
// Backlog 890: optional eigener Text (Fertig-/Liefertermin sind keine Termine mit der Werkstatt)
function offDayWatch(els, key = 'plan_offday_hint') { for (const el of els) { if (!el || el.dataset.offW) continue; el.dataset.offW = '1'; const h = document.createElement('p'); h.className = 'small muted'; h.dataset.offday = ''; h.hidden = true; el.after(h); const upd = () => { const v = el.value; const x = holName(v) || (isWeekendD(v) ? t('due_weekend') : ''); h.hidden = !x; if (x) h.textContent = t(key).replace('{d}', () => x); }; el.addEventListener('input', upd); el.addEventListener('change', upd); upd(); } }

const dqDetail = (i) => dqDetailText(i, t, fmtD, mk, { km: (n) => fmtKm(n), src: (v) => odoSrc(v), pos: (p) => posL(p), mm: (n) => fmtMm(n), ax: (v) => t('axle_' + v) });
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

// Backlog 898: Nummern (Vertrags-, Schaden-, Personal-, Bußgeld-, Rückrufnummer) nicht von der Browser-Übersetzung verändern lassen
const noTr = (s) => `<span translate="no">${esc(s)}</span>`;

function plate(p, opts = {}) {
  const txt = esc(p || '—');
  return `<span class="plate${opts.big ? ' big' : ''}${opts.locked ? ' locked' : ''}" translate="no" aria-label="${esc(t('plate_label'))} ${txt}"><span class="eu">D</span><span class="num">${txt}</span></span>`;
}

// ---------- API ----------
// Backlog 797 (Blickwinkel „Fahrer im Funkloch mit älterem Handy“): AbortSignal.timeout fehlt in Chrome/Android-WebView < 103 und iOS < 16 –
// dort hatte der Foto-Upload gar kein Zeitlimit und „Lade Foto 2/5“ hing im Funkloch ohne Ende. Rückfall: AbortController + setTimeout.
function timeoutSignal(ms) {
  try { if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) return AbortSignal.timeout(ms); } catch {}
  if (typeof AbortController === 'undefined') return undefined;
  const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal;
}
// Backlog 800: Zeitlimit für Anmeldestatus/Stammdaten beim App-Start und die Fahrzeugauswahl (kleine Antworten; Slow 3G ≈ 2–4 s);
// nach einem Offline-Start kürzer (OFFLINE_GET_TIMEOUT_MS), damit die Meldung im Funkloch nicht zweimal so lange wartet
const START_TIMEOUT_MS = 15000, OFFLINE_GET_TIMEOUT_MS = 8000;
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
  // Backlog 800: nach einem Offline-Start wegen Zeitüberschreitung hat jede Abfrage ein Zeitlimit (sonst hing z. B. die Fahrzeugauswahl)
  if (method === 'GET' && S.offlineStart && !extra.bg) extra = { ...extra, timeoutMs: Math.min(extra.timeoutMs || OFFLINE_GET_TIMEOUT_MS, OFFLINE_GET_TIMEOUT_MS) };
  const sig = extra.timeoutMs ? timeoutSignal(extra.timeoutMs) : undefined;
  let t0 = Date.now();
  // Backlog 596/598: Vorabrufe aus boot.js (/api/me, dann /api/meta) – nur als erste API-Anfragen in genau dieser Reihenfolge übernommen;
  // jede abweichende Anfrage verwirft alle (nie eine veraltete Antwort, z. B. 401 von vor der Anmeldung)
  const preQ = window.__cfpPre, pre = preQ && preQ.shift();
  const usePre = !!pre && method === 'GET' && path === pre[0];
  if (!usePre || !preQ.length) window.__cfpPre = null;
  if (usePre) t0 = window.__cfpMeT0 || t0;
  // Backlog 800: Vorabruf aus boot.js hat kein eigenes Zeitlimit – mit timeoutMs gegen eine Frist laufen lassen (sonst hing der Start ohne Ende)
  const preWait = (pr) => (!extra.timeoutMs ? pr : Promise.race([pr, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), extra.timeoutMs))]));
  try { res = usePre ? await preWait(pre[1]) : await fetch(path, { method, headers, body: b, credentials: 'same-origin', ...(sig ? { signal: sig } : {}) }); }
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
// Prüfung/Wartung überfällig: frühester Termin vor heute oder km-Fälligkeit überschritten (gespeicherte Werte, nur Anzeige; ruhende nicht)
const vOverdue = (v) => !v.eval_excluded && ((v.next_due && v.next_due < bDate()) || (v.km_remaining !== null && v.km_remaining !== undefined && v.km_remaining < 0));
// Backlog 979/981 („Gespann ohne Meldungen“, Fahrzeugliste und Dispo-Startseite): Lkw und gekoppelter Anhänger beide ohne offene Meldung, nicht ruhend,
// ohne überfällige Prüfung/Wartung, ohne nicht bestandene HU/SP und ohne offene Nachprüfung – nur Anzeige gespeicherter Werte, keine Freigabe
const comboSideOk = (x) => !!x && !x.eval_excluded && x.availability === 'einsatzbereit_lt_system' && !x.failed_inspection && !x.reinspection_open && !vOverdue(x);
const comboClearV = (v) => v.kind === 'lkw' && !!v.coupled && v.coupled.kind === 'anhaenger' && comboSideOk(v) && comboSideOk(v.coupled);
// Suchschlüssel: Trennzeichen wie bei Kennzeichen-Zuordnungen weglassen (Leerzeichen, Bindestrich, Punkt, Schrägstrich, Unterstrich, Gedankenstriche)
// NFC (zerlegte Umlaute) und kyrillische Buchstaben, die wie lateinische aussehen (ukrainische Tastatur: „SZ-YС 5513“ mit С kyrillisch),
// wie der Server (normPlate) – vorher fanden Fahrzeugliste, Fahrzeugauswahl und globale Suche nichts (22.10.2026). Beide Seiten gleich umgesetzt.
const SK_CYR = { 'а': 'a', 'в': 'b', 'е': 'e', 'к': 'k', 'м': 'm', 'н': 'h', 'о': 'o', 'р': 'p', 'с': 'c', 'т': 't', 'у': 'y', 'х': 'x', 'і': 'i' };
const searchKey = (x) => String(x || '').normalize('NFC').toLowerCase().replace(/[\s\-./_\u2010-\u2014\u202a-\u202e\u2066-\u2069]/g, '').replace(/[авекмнорстухі]/g, (c) => SK_CYR[c]);
// Kennzeichen mit Länderkennung aus ausländischen Schreiben („D SZ-YC 5501“, „SZYC5501 (D)“) – gleiche Regel wie plateNoCountry im Server (Backlog 902)
const plateNoCountry = (p) => { const x = String(p || '').trim(); const y = x.replace(/^\(?(?:D|DE|DEU)\)?[\s\-–:/.]+(?=\S)/i, '').replace(/(\S)[\s\-–/,]+\(?(?:D|DE|DEU)\)?$/i, '$1').replace(/(\S)\((?:D|DE|DEU)\)$/i, '$1').trim(); return y !== x && searchKey(y).length >= 4 ? y : null; };
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
    ${S.me.role !== 'driver' ? `<a href="#/search" class="tbicon" aria-label="${esc(t('search_title'))}" aria-keyshortcuts="/" title="${esc(t('search_title'))} (/)" style="color:#fff">${ICON.search}</a>` : ''}
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
        // Backlog 800 (Blickwinkel „Fahrer im Funkloch – Netz angezeigt, aber keine Antwort“): ohne Zeitlimit blieb der Start bei „Lädt…“
        // stehen, obwohl ein Offline-Start mit Postausgang möglich wäre. Jetzt START_TIMEOUT_MS → wie Netzabbruch (Offline-Start).
        const r = await api('GET', '/api/me', undefined, { timeoutMs: START_TIMEOUT_MS }); S.me = r.user; markSession(r.user.id); lastActivity = Date.now(); h = idleResume(r.user.id, h); S.lang = r.user.language || S.lang; S.offlineStart = false;
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
        if (!cached) { const st = await api('GET', '/api/setup/status', undefined, { timeoutMs: START_TIMEOUT_MS }).catch(() => ({})); if (!st.needs_setup && /^#\/((new|check|v)\/VIN:[A-Z0-9]+|cases\/[\w-]+|fines\/[\w-]+|vehicles\/(VIN|VIN%3A)[:A-Z0-9]+|more\?o=sess|push)$/.test(h)) { try { sessionStorage.setItem('cfp_after_login', h); } catch {} } location.hash = st.needs_setup ? '#/setup' : '#/login'; return; }
        S.me = cached.me; S.meta = cached.meta; S.lang = S.me.language || S.lang; S.offlineStart = true;
      }
      await ensureLang(S.lang); // Kontosprache (Backlog 588)
      if (S.me.role === 'owner') S.viewEnv = localStorage.getItem('cfp_env') || null;
      // Push angetippt bei geschlossener App: Umgebung aus „?env=“ übernehmen (Inhaber), danach aus der Adresse entfernen
      { const pe = new URLSearchParams(location.search).get('env'); if (pe) { pushEnv(pe); history.replaceState(history.state, '', location.pathname + location.hash); } }
      if (!S.offlineStart) {
        // Backlog 800: Stammdaten ebenfalls mit Zeitlimit; ohne Antwort die zuletzt gespeicherten desselben Kontos (sonst „Lädt…“ ohne Ende)
        try { S.meta = await api('GET', '/api/meta', undefined, { timeoutMs: START_TIMEOUT_MS }); }
        catch (err) { const c = err.offline ? offlineSession() : null; if (!c || c.me.id !== S.me.id) throw err; S.meta = c.meta; }
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
// Backlog 1002 (Blickwinkel „Fuhrparkleitung am PC, Telefon am Ohr – Kennzeichen schnell nachschlagen“): Taste „/“ öffnet von jeder Seite
// die globale Suche (bzw. setzt den Cursor ins Suchfeld der Suche/Hilfe) – nicht in Eingabefeldern, nicht mit Strg/Alt/Cmd, nicht für Fahrer
// (keine globale Suche; in der Hilfe springt „/“ auch für Fahrer ins Hilfe-Suchfeld).
function slashTarget(key, mods, editable, role, hash) {
  if (key !== '/' || mods || editable) return null;
  const h = String(hash || '');
  if (h.startsWith('#/help')) return 'hq';
  if (!role || role === 'driver') return null;
  return h.startsWith('#/search') ? 'gq' : 'nav';
}
document.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.isComposing) return;
  const el = e.target; const editable = !!(el && (el.isContentEditable || (el.closest && el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]'))));
  const tg = slashTarget(e.key, e.ctrlKey || e.metaKey || e.altKey, editable, S.me && S.me.role, location.hash);
  if (!tg) return;
  if (tg === 'nav') { e.preventDefault(); location.hash = '#/search'; return; }
  const inp = document.getElementById(tg); if (!inp) return;
  e.preventDefault(); inp.focus(); try { inp.select(); } catch { /* ältere Browser */ }
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
// Zahlen einfügen (Backlog 897): Werte aus Rechnung/PDF, Nachricht oder der App-Anzeige kommen mit Einheit und geschützten
// Leerzeichen („1.234,56 €“, „EUR 99,90“, „123.456 km“, UK-Anzeige „123 456 км“ mit U+00A0) – das Muster der km-Felder wies sie
// ab („Format stimmt nicht“). Beim Einfügen in Zahlenfelder (inputmode numeric/decimal) Einheit und Leerzeichen entfernen; sonst
// unverändert einfügen. Keine Umdeutung von Punkt/Komma – das bewertet weiterhin der Server.
// Backlog 972: in ganzzahligen Feldern (inputmode numeric, z. B. km-Stand) auch die Bezeichnung vorne („km-Stand: 123.456“, „Пробіг 123 456“).
const pasteNum = (raw, numeric = false) => {
  let s = String(raw || '').trim(); if (!s || s.length > 40) return null;
  if (numeric) s = s.replace(/^(km[-\s]?stand|kilometerstand|kilometer|tachostand|tacho|km|км|пробіг|пробег|odometer(?:\s+reading)?|mileage)\s*[:.=]?\s*(?=\d)/i, '');
  s = s.replace(/^(€|eur)\s*/i, '').replace(/\s*(€|eur|km|км)\.?$/i, '').replace(/[\s    '’]/g, '');
  return /^-?\d[\d.,]*$/.test(s) ? s : null;
};
document.addEventListener('paste', (e) => {
  const el = e.target; if (!el || el.tagName !== 'INPUT' || !/^(numeric|decimal)$/.test(el.getAttribute('inputmode') || '') || el.readOnly || el.disabled) return;
  const raw = e.clipboardData ? e.clipboardData.getData('text') : ''; const v = pasteNum(raw, el.getAttribute('inputmode') === 'numeric');
  if (v === null || v === String(raw).trim()) return;
  e.preventDefault();
  try { el.setRangeText(v, el.selectionStart ?? el.value.length, el.selectionEnd ?? el.value.length, 'end'); } catch { el.value = v; }
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
// Backlog 984: Beträge mit ausgeschriebener Währung aus Diktat/Nachricht („120 Euro 50“, „120,50 Euro“, „50 Cent“, „120 євро“) werden beim Verlassen
// eines Betragsfelds in Ziffern umgeschrieben (sichtbar vor dem Speichern; der Server liest dieselben Formen über `moneyIn`). Nur Betragsfelder.
const MONEY_FIELD = /^(amount_eur|amount_net|appraisal_net|deductible_net|reimbursed_net|monthly_rate_net|unit_price_net)$/;
document.addEventListener('change', (e) => {
  const el = e.target; if (!el || el.tagName !== 'INPUT' || el.readOnly || el.disabled) return;
  if (!(MONEY_FIELD.test(el.name || '') || el.id === 'ie_price' || /^rcp\d+$/.test(el.id || ''))) return;
  // Backlog 1001: fremde Währung („1.250 zł“, „PLN 1250“) gleich am Feld melden (der Server weist sie ebenso ab) – nie umrechnen
  const fx = moneyForeign(el.value); if (fx) { el.setCustomValidity(t('money_fx').replace('{c}', () => fx)); el.dataset.cfpFx = '1'; el.reportValidity(); return; }
  const w = moneyIn(el.value); if (w === null) return;
  const v = /^\d+\.\d{2}$/.test(w) ? decIn(w) : w; if (v === el.value) return;
  el.value = v; el.dispatchEvent(new Event('input', { bubbles: true }));
}, true);
document.addEventListener('input', (e) => { const el = e.target; if (el && el.dataset && el.dataset.cfpFx) { delete el.dataset.cfpFx; el.setCustomValidity(''); } }, true);
// Backlog 985: km-Stand diktiert mit ausgeschriebener Einheit/Bezeichnung („123.456 Kilometer“, „Kilometerstand 123 456“, „123 456 кілометрів“) –
// das Muster der km-Felder meldete sonst „Format stimmt nicht“, maxlength 12 schnitt „123.456 Kilometer“ ab (jetzt 40). Beim Verlassen eines km-Felds nur Einheit/Bezeichnung entfernen (Ziffern unverändert).
const KM_FIELD = /^(km|odometer_km|done_km|due_km|last_done_km|next_due_km)$/;
document.addEventListener('change', (e) => {
  const el = e.target; if (!el || el.tagName !== 'INPUT' || el.readOnly || el.disabled || el.getAttribute('inputmode') !== 'numeric') return;
  if (!(KM_FIELD.test(el.name || '') || /^(km|kfkm|extkmv|tfkm)$/.test(el.id || ''))) return;
  const v = kmIn(el.value); if (v === null || v === el.value) return;
  el.value = v; el.dispatchEvent(new Event('input', { bubbles: true }));
}, true);
// Backlog 986: Profiltiefe/Luftdruck mit Einheit bzw. Bezeichnung („6,5 mm“, „Profil 6,5 Millimeter“, „8,5 bar“, „тиск 9 бар“) – beim Verlassen
// des Felds nur Einheit/Bezeichnung entfernen (Ziffern unverändert, keine Umrechnung; der Server liest dieselben Formen über `unitIn`).
const UNIT_FIELD = { tread_mm: 'mm', pressure_bar: 'bar', interval_months: 'months', interval_km: 'km' }; // Backlog 987: Wartungsintervalle („alle 12 Monate“, „100.000 km“)
document.addEventListener('change', (e) => {
  const el = e.target; if (!el || el.tagName !== 'INPUT' || el.readOnly || el.disabled) return;
  const k = UNIT_FIELD[el.name || ''] || (el.id === 'mci' ? 'months' : null); if (!k) return;
  const v = unitIn(el.value, k); if (v === null || v === el.value) return;
  el.value = v; el.dispatchEvent(new Event('input', { bubbles: true }));
}, true);
// Backlog 988: Reifengröße aus Rechnung/Diktat („315 70 R 22,5“, „315/70r22,5 154/150 l“, „315/70 Р22,5“) beim Verlassen in die Schreibweise
// der App („315/70 R22.5 154/150L“) – nur wenn eindeutig erkennbar (sonst unverändert, z. B. mit „M+S“ oder Marke); Vergleich mit `tireSizeSame`.
document.addEventListener('change', (e) => {
  const el = e.target; if (!el || el.tagName !== 'INPUT' || el.readOnly || el.disabled || !el.hasAttribute('data-tiresize')) return;
  const v = tireSizeFmt(el.value); if (v === null || v === el.value) return;
  el.value = v; el.dispatchEvent(new Event('input', { bubbles: true }));
}, true);
// Datum einfügen (Backlog 975, Blickwinkel „Leitung überträgt ein Datum aus Rechnung, E-Mail oder Bescheid per Kopieren/Einfügen“):
// Datumsfelder (input type=date) nehmen am PC Eingefügtes nicht an – „04.11.2026“, „Rechnungsdatum: 04.11.2026“, „4. November 2026“,
// „04/11/2026“ (EN-Anzeige der App), „04 листопада 2026“ wurden still verworfen. Genau ein Datum im Text → übernehmen;
// keins, mehrere verschiedene oder ein ungültiger Kalendertag (31.02.) → eigene Meldung, nichts eingetragen. Schrägstrich wie die
// App-Anzeige Tag/Monat/Jahr; nur wenn die zweite Zahl > 12 ist, eindeutig Monat/Tag/Jahr (US). Zweistellige Jahre: 20xx, wenn
// höchstens 20 Jahre in der Zukunft, sonst 19xx (Erstzulassung „01.05.98“). Zeitstempel mit Zone („…T23:30:00Z“) → Berliner Tag.
const PD_MON = { jan: 1, jän: 1, feb: 2, mär: 3, mar: 3, mrz: 3, apr: 4, mai: 5, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, dez: 12, dec: 12,
  січ: 1, лют: 2, бер: 3, кві: 4, тра: 5, чер: 6, лип: 7, сер: 8, вер: 9, жов: 10, лис: 11, гру: 12,
  янв: 1, фев: 2, мая: 5, май: 5, июн: 6, июл: 7, авг: 8, сен: 9, окт: 10, ноя: 11, дек: 12, апр: 4 };
const PD_FULL = ['januar', 'january', 'jänner', 'februar', 'february', 'märz', 'march', 'april', 'juni', 'june', 'juli', 'july', 'august', 'sept', 'september', 'oktober', 'october', 'november', 'dezember', 'december'];
const pasteDate = (raw, year, toBerlin) => {
  let s = String(raw || '').replace(/[   ]/g, ' ').trim().toLowerCase(); if (!s || s.length > 120) return null;
  const found = []; const cut = (m) => { s = s.slice(0, m.index) + ' '.repeat(m[0].length) + s.slice(m.index + m[0].length); };
  const yr = (y) => { if (y.length === 4) return Number(y); const n = 2000 + Number(y); return n <= year + 20 ? n : n - 100; };
  const mon = (w) => { const k = w.replace(/\.$/, ''); if (k.length < 3 || k.length > 12) return 0;
    if (/^[a-zäöü]+$/.test(k) && k.length > 3 && !PD_FULL.includes(k)) return 0; // „Augsburg“, „Mail“ sind keine Monate
    return PD_MON[k.slice(0, 3)] || 0; };
  let m;
  const iso = /(^|[^\d])(\d{4})-(\d{2})-(\d{2})(t\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(z|[+-]\d{2}:?\d{2}))?(?!\d)/;
  while ((m = iso.exec(s))) {
    if (m[5] && toBerlin) { const b = toBerlin(m[0].slice(m[1].length).toUpperCase()); if (b) { const [y, mo, d] = b.split('-'); found.push([Number(y), Number(mo), Number(d)]); cut(m); continue; } }
    found.push([Number(m[2]), Number(m[3]), Number(m[4])]); cut(m);
  }
  const numRx = /(^|[^\d])(\d{1,2})\s*([./-])\s*(\d{1,2})\s*\3\s*(\d{4}|\d{2})(?!\d)/;
  while ((m = numRx.exec(s))) {
    let d = Number(m[2]); let mo = Number(m[4]); if (m[3] === '/' && mo > 12 && d <= 12) [d, mo] = [mo, d];
    found.push([yr(m[5]), mo, d]); cut(m);
  }
  const nameRx = /(^|[^\d])(\d{1,2})(?:st|nd|rd|th)?\.?\s*(?:de\s+)?([a-zäöüа-яёіїєґ]{3,12}\.?),?\s*(\d{4})(?!\d)/;
  while ((m = nameRx.exec(s))) { const mo = mon(m[3]); if (!mo) { cut(m); continue; } found.push([Number(m[4]), mo, Number(m[2])]); cut(m); }
  const enRx = /(^|[^a-z])([a-z]{3,9}\.?)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})(?!\d)/;
  while ((m = enRx.exec(s))) { const mo = mon(m[2]); if (!mo) { cut(m); continue; } found.push([Number(m[4]), mo, Number(m[3])]); cut(m); }
  if (!found.length) return { e: /(^|[^\d.\/])(0?[1-9]|1[0-2])\s*[./-]\s*(\d{4})(?!\d)/.test(s) ? 'month' : 'none' }; // Backlog 976: nur Monat/Jahr (HU-Plakette „11/2027“) – Tag nicht raten
  const fmt = ([y, mo, d]) => `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const uniq = [...new Set(found.map(fmt))];
  if (uniq.length > 1) return { e: 'many' };
  const [y, mo, d] = found[0]; const x = new Date(Date.UTC(y, mo - 1, d));
  if (mo < 1 || mo > 12 || d < 1 || y < 1900 || x.getUTCMonth() !== mo - 1 || x.getUTCDate() !== d) return { e: 'invalid', x: uniq[0] };
  return { d: uniq[0] };
};
// Backlog 978 (Blickwinkel „Leitung überträgt die Tatzeit aus dem Bußgeldbescheid bzw. der Fahrer die Uhrzeit aus einer Nachricht“):
// Uhrzeit aus eingefügtem Text – „14:32“, „14:32 Uhr“, „14.32 Uhr“, „14 Uhr“, „14h30“, „2:32 PM“, „12 am“, nur „14.32“ als ganzer Text.
// Sekunden werden abgeschnitten (Felder minutengenau). Zonen-Versatz („+01:00“) ist keine Uhrzeit. Keine, mehrere verschiedene oder
// ungültige Uhrzeit (25:10, 13 pm) → Fehlerart; nie geraten (z. B. „abends“).
const pasteTime = (raw) => {
  let s = ' ' + String(raw || '').replace(/[   ]/g, ' ').trim().toLowerCase() + ' '; if (s.length > 122) return null;
  const found = []; let bad = false; const cut = (m) => { s = s.slice(0, m.index) + ' '.repeat(m[0].length) + s.slice(m.index + m[0].length); };
  const put = (h, mi, ap) => { if (ap) { if (h < 1 || h > 12) { bad = true; return; } h = (h % 12) + (ap[0] === 'p' ? 12 : 0); } if (h > 23 || mi > 59) { bad = true; return; } found.push(`${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`); };
  const AP = '\\s*(a\\.?\\s?m\\.?|p\\.?\\s?m\\.?)(?![a-z])';
  const rxs = [
    [new RegExp(`(^|[^\\d:+\\-])(\\d{1,2})[:.](\\d{2})(?::\\d{2}(?:\\.\\d+)?)?${AP}`), (m) => put(Number(m[2]), Number(m[3]), m[4])],
    [new RegExp(`(^|[^\\d:.+\\-])(\\d{1,2})${AP}`), (m) => put(Number(m[2]), 0, m[3])],
    [/(^|[^\d:+\-])(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(?![\d:])/, (m) => put(Number(m[2]), Number(m[3]))],
    [/(^|[^\d:.])(\d{1,2})\.(\d{2})\s*(?:uhr|h)(?![a-z])/, (m) => put(Number(m[2]), Number(m[3]))],
    [/(^|[^\d:.])(\d{1,2})\s*(?:uhr|h)\s*(\d{2})?(?![\d.a-z])/, (m) => put(Number(m[2]), m[3] ? Number(m[3]) : 0)],
  ];
  for (const [rx, f] of rxs) { let m; while ((m = rx.exec(s))) { f(m); cut(m); } }
  if (!found.length && !bad) { const m = s.trim().match(/^(\d{1,2})\.(\d{2})$/); if (m) put(Number(m[1]), Number(m[2])); }
  const uniq = [...new Set(found)];
  if (uniq.length > 1) return { e: 'many' };
  if (bad) return { e: 'invalid' };
  return uniq.length ? { t: uniq[0] } : { e: 'none' };
};
// Zeitstempel mit Zone („2026-11-04T13:32:00Z“, „…+01:00“) → Berliner Ortszeit „JJJJ-MM-TT HH:MM“, damit Tag und Uhrzeit zusammenpassen
const pasteZoned = (raw, toBerlinDT) => String(raw || '').replace(/(\d{4})-(\d{2})-(\d{2})[tT ](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(z|[+-]\d{2}:?\d{2})(?![\d])/gi, (z) => { const b = toBerlinDT(z.toUpperCase().replace(' ', 'T')); return b ? b.replace('T', ' ') : z; });
const pdErr = (e) => t(e === 'many' ? 'pd_many' : e === 'invalid' ? 'pd_invalid' : e === 'month' ? 'pd_month' : 'pd_none');
const ptErr = (e) => t(e === 'many' ? 'pt_many' : e === 'invalid' ? 'pt_invalid' : 'pt_none');
const pasteSet = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
document.addEventListener('paste', (e) => {
  const el = e.target; if (!el || el.tagName !== 'INPUT' || !['date', 'time', 'datetime-local'].includes(el.type) || el.readOnly || el.disabled) return;
  const raw0 = e.clipboardData ? e.clipboardData.getData('text') : ''; if (!String(raw0).trim()) return;
  const raw = pasteZoned(raw0, berlinLocalDT);
  if (el.type === 'time') {
    const r = pasteTime(raw); if (!r) return;
    e.preventDefault(); if (!r.t) { toast(ptErr(r.e), true); return; }
    pasteSet(el, r.t); if (!el.checkValidity()) el.reportValidity(); return;
  }
  const r = pasteDate(raw, Number(bDate().slice(0, 4)));
  if (!r) return;
  e.preventDefault();
  if (el.type === 'datetime-local') {
    // Tatzeit: Tag und Uhrzeit gehören zusammen – fehlt eins, nichts eintragen (keine geratene Uhrzeit, kein „heute“)
    const tr = pasteTime(raw.replace(/(^|[^\d])\d{4}-\d{2}-\d{2}(?=t|\s|$)/gi, '$1 ').replace(/(^|[^\d])\d{1,2}\s*[./-]\s*\d{1,2}\s*[./-]\s*\d{2,4}(?!\d)/g, '$1 ')) || { e: 'none' };
    if (!r.d) { toast(r.e === 'none' && tr.t ? t('pdt_nodate') : pdErr(r.e), true); return; }
    if (!tr.t) { toast(tr.e === 'none' ? t('pdt_notime') : ptErr(tr.e), true); return; }
    pasteSet(el, `${r.d}T${tr.t}`); if (!el.checkValidity()) el.reportValidity(); return;
  }
  if (!r.d) { toast(pdErr(r.e), true); return; }
  pasteSet(el, r.d);
  // Schadenzeitpunkt (Tag + Uhrzeit nebeneinander): steht im Text genau eine Uhrzeit, auch das Uhrzeitfeld füllen (sonst unverändert)
  const tf = el.closest('[data-occ]') && el.closest('[data-occ]').querySelector('input[type=time]');
  if (tf && !tf.disabled) { const tr = pasteTime(raw.replace(/(^|[^\d])\d{4}-\d{2}-\d{2}(?=t|\s|$)/gi, '$1 ').replace(/(^|[^\d])\d{1,2}\s*[./-]\s*\d{1,2}\s*[./-]\s*\d{2,4}(?!\d)/g, '$1 ')); if (tr && tr.t) pasteSet(tf, tr.t); }
  if (!el.checkValidity()) el.reportValidity();
});
// Backlog 980 (Blickwinkel „Leitung überträgt die FIN aus Zulassungsbescheinigung, Rechnung oder E-Mail“): Eingefügtes
// „FIN: WDB…“, „Fahrgestellnummer WDB…“, „WDB 963 403 1L 123456“ oder eine Rechnungszeile mit Kennzeichen/km wurde abgeschnitten
// (maxlength 25) bzw. vom Server abgewiesen („FINWDB…“ = 20 Zeichen). Bezeichnung entfernen (gleiche Regel wie `normalizeVin` im
// Server), genau eine 17-stellige FIN übernehmen; mehrere verschiedene → Meldung, nichts eingetragen. I/O/Q werden nie ersetzt
// (nur Hinweis „meist 1 bzw. 0“) – die FIN bleibt so, wie sie im Beleg steht.
const VIN_LBL = /^\s*(?:(?:fin|vin)(?:[-\s.]*(?:nr|nummer|code|no|number|код))?|fahrgestell(?:[-\s.]*(?:nummer|nr))?|fahrzeug[-\s.]*ident(?:ifizierungs|ifikations)?[-\s.]*(?:nummer|nr)|vehicle\s+identification\s+(?:number|no)|chassis(?:[-\s.]*(?:no|number|nr|nummer))?|ідентифікаційний\s+номер(?:\s+транспортного\s+засобу)?|номер\s+(?:шасі|кузова))\.?\s*(?:\(\s*e\s*\)\s*)?[:#=]\s*|^\s*(?:fahrgestell(?:[-\s.]*(?:nummer|nr))?|fahrzeug[-\s.]*ident(?:ifizierungs|ifikations)?[-\s.]*(?:nummer|nr)|vehicle\s+identification\s+(?:number|no)|vin[-\s]?код|ідентифікаційний\s+номер(?:\s+транспортного\s+засобу)?)\.?\s*(?:\(\s*e\s*\)\s*)?/i;
const vinKey = (x) => { let c = String(x || '').normalize('NFKC').replace(/^\s*VIN:/i, '').replace(VIN_LBL, '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (c.length === 20 && /^(FIN|VIN)/.test(c)) c = c.slice(3); return c; };
const vinOf = (raw) => {
  const s = String(raw || '').normalize('NFKC').replace(/[   ]/g, ' ').trim(); if (!s || s.length > 300) return null;
  const all = vinKey(s); if (all.length === 17) return { v: all };
  const ok = (k) => k.length === 17 && /\d/.test(k) && /[A-Z]/.test(k); const found = new Set();
  for (const line of s.split(/[\r\n;,|\t]+/)) {
    const c = vinKey(line); if (ok(c)) { found.add(c); continue; }
    for (const w of line.split(/\s+/)) { const k = vinKey(w); if (ok(k)) found.add(k); }
  }
  if (found.size > 1) return { e: 'many' };
  return found.size ? { v: [...found][0] } : { e: 'none', c: all };
};
const vinCheck = (el) => {
  const box = el.form && el.form.querySelector('#vinchk'); if (!box) return;
  const c = vinKey(el.value); const msg = !c ? '' : /[IOQ]/.test(c) ? t('vin_ioq') : c.length !== 17 ? t('vin_len').replace('{n}', c.length) : '';
  box.textContent = msg; box.hidden = !msg; const w = /[IOQ]/.test(c); box.classList.toggle('panel', w); box.classList.toggle('warn', w); box.classList.toggle('muted', !w);
};
document.addEventListener('paste', (e) => {
  const el = e.target; if (!el || el.tagName !== 'INPUT' || el.name !== 'vin' || el.type === 'hidden' || el.readOnly || el.disabled) return;
  const raw = e.clipboardData ? e.clipboardData.getData('text') : ''; const r = vinOf(raw); if (!r) return;
  if (r.v && r.v === String(raw).trim()) return; // schon sauber – normal einfügen
  e.preventDefault();
  if (r.e === 'many') { toast(t('pv_many'), true); return; }
  if (r.e === 'none') { if (!r.c || r.c.length > 25) { toast(t('pv_none'), true); return; } pasteSet(el, r.c); vinCheck(el); return; }
  pasteSet(el, r.v); vinCheck(el);
});
document.addEventListener('input', (e) => { const el = e.target; if (el && el.tagName === 'INPUT' && el.name === 'vin' && el.type !== 'hidden') vinCheck(el); });
// Backlog 977: Schadenzeitpunkt – Schnellwahl Heute/Gestern/Vorgestern (Fahrer am Handy, Kalender ist mühsam) und Hinweis,
// wenn die Beschreibung „gestern“/„vorgestern“ nennt (nur Vorschlag mit Knopf, nie automatisch; Uhrzeit wird nie geraten)
const occDescWord = (txt) => {
  let s = ' ' + String(txt || '').toLowerCase().split(/[^\p{L}]+/u).filter(Boolean).join(' ') + ' ';
  const two = [' vorgestern ', ' day before yesterday ', ' позавчора ', ' позавчера '].find((w) => s.includes(w));
  if (two) s = s.split(two).join(' ');
  const one = [' gestern ', ' yesterday ', ' вчора ', ' вчера '].find((w) => s.includes(w));
  if (two && one) return null; // beides genannt → kein Vorschlag
  return two ? { n: 2, w: two.trim() } : one ? { n: 1, w: one.trim() } : null;
};
const occSet = (box, n) => { const el = box && $('#occd', box); if (!el) return; el.value = bDate(-n); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
const occDescUpd = (form) => {
  const box = form && $('[data-occ]', form); const h = form && $('[data-occdesc]', form); const d = form && $('#d', form); const el = box && $('#occd', box);
  if (!h || !d || !el) return;
  const m = el.value ? null : occDescWord(d.value);
  h.hidden = !m; if (!m) { h.textContent = ''; return; }
  h.innerHTML = `ℹ️ ${esc(tfill('occ_desc_hint', { w: m.w, d: fmtD(bDate(-m.n)) }))} <button type="button" class="btn secondary small" data-occd="${m.n}">${esc(t('occ_desc_take'))}</button>`;
};
const occQuickClick = (e) => {
  const b = e.target && e.target.closest ? e.target.closest('[data-occd]') : null; if (!b) return;
  e.preventDefault(); const form = b.closest('form'); const box = form ? $('[data-occ]', form) : b.closest('[data-occ]');
  occSet(box, Number(b.dataset.occd)); if (form) occDescUpd(form);
};
document.addEventListener('click', occQuickClick);
document.addEventListener('input', (e) => { const el = e.target; if (!el || !(el.id === 'd' || el.id === 'occd')) return; const form = el.closest('form'); if (form && $('[data-occ]', form)) occDescUpd(form); });
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
// keepFor (Backlog 868, Leerlauf-Abmeldung): Formularentwürfe dieses Kontos (Schlüssel enthalten die Konto-ID) und der Rückweg bleiben im Tab;
// sie gelten nur nach erneuter Anmeldung derselben Person (idleResume), jede andere Anmeldung löscht sie
function resetUserState(keepFor = null) {
  for (const k of Object.keys(S)) if (!KEEP_STATE.includes(k)) delete S[k];
  S.me = null; S.viewEnv = null; S.unread = 0;
  const keep = (k) => k === 'cfp_after_login' || (keepFor && (k === IDLE_KEY || (k.startsWith('cfp_fd_') && k.includes('_' + keepFor + '_'))));
  try { for (const k of Object.keys(sessionStorage)) if (k.startsWith('cfp_') && !keep(k)) sessionStorage.removeItem(k); } catch {}
}
// Backlog 868 (Blickwinkel „Werkstatt-Tablet: Mechaniker wird mitten in der Reparatur zu einem Notfall gerufen“, Folge aus 867): Leerlauf-
// Abmeldung (Einstellung des Inhabers) löschte halb ausgefüllte Formulare – Kontrolle nach Reparatur (18 Punkte), Arbeitszeit, Meldung. Jetzt:
// offenes Aktionsformular mit Eingaben als Entwurf sichern, Entwürfe dieses Kontos und die Seite merken; nach erneuter Anmeldung derselben
// Person zurück auf die Seite (Entwurf wird dort wie nach einem Netzabbruch wiederhergestellt). Andere Person: alles gelöscht, nichts gezeigt.
const IDLE_KEY = 'cfp_idle_resume';
function idleKeep() {
  if (!S.me) return null;
  try {
    if (S.openAct && $('#af') && viewDirty()) actDraftSave(S.openAct.caseId, S.openAct.action);
    const id = S.me.id; const has = Object.keys(sessionStorage).some((k) => k.startsWith('cfp_fd_') && k.includes('_' + id + '_'));
    if (!has) return null;
    sessionStorage.setItem(IDLE_KEY, JSON.stringify({ u: id, page: location.hash || '#/', at: new Date().toISOString() }));
    return id;
  } catch { return null; }
}
function idleResume(userId, h) {
  let x = null; try { x = JSON.parse(sessionStorage.getItem(IDLE_KEY) || 'null'); sessionStorage.removeItem(IDLE_KEY); } catch {}
  if (!x || x.u !== userId) {
    // andere Person (oder kein Rückweg): Entwürfe fremder Konten in diesem Tab entfernen
    try { for (const k of Object.keys(sessionStorage)) if (k.startsWith('cfp_fd_') && !k.includes('_' + userId + '_')) sessionStorage.removeItem(k); } catch {}
    return h;
  }
  const page = String(x.page || '').replace(/%3A/gi, ':');
  if (!/^#\/(cases|inspect|new|check)\b/.test(page) || !['#/', '#', ''].includes(h) || Date.now() - Date.parse(x.at) > FORM_DRAFT_MS) return h;
  try { history.replaceState(history.state, '', location.pathname + location.search + x.page); } catch { return h; }
  setTimeout(() => toast(t('idle_resumed')), 300);
  return page;
}
// Anmeldung über Tabs hinweg (21.10.2026): Abmelden oder Anmeldung einer anderen Person in einem Tab → andere Tabs laden neu, statt
// weiter die Ansicht (und das Menü) der vorherigen Person zu zeigen (geteiltes Tablet). Gleiche Person erneut angemeldet: kein Ereignis.
const SESSION_MARK = 'cfp_session_user';
function markSession(id) { try { if (localStorage.getItem(SESSION_MARK) !== id) localStorage.setItem(SESSION_MARK, id); } catch {} }
window.addEventListener('storage', (e) => {
  // Tab steht auf der Anmeldeseite, in einem anderen Tab hat sich jemand angemeldet: Sitzung übernehmen statt zweiter Anmeldung (22.10.2026)
  // Backlog 789: früher location.reload() – die Adresse blieb „#/login“, nach dem Neuladen stand wieder das Anmeldeformular da; jetzt wie nach eigener Anmeldung weiter
  if (e.key === SESSION_MARK && !S.me && e.newValue && /^#\/login/.test(location.hash || '')) { afterLogin(); return; }
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
  const kept = idleKeep(); // Backlog 868: Entwürfe dieses Kontos für die erneute Anmeldung behalten
  clearOfflineData(); resetUserState(kept); markSession(''); idleBusy = false;
  location.hash = '#/login'; toast(t(kept ? 'idle_signed_out_kept' : 'idle_signed_out'));
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
// Backlog 800: Offline-Start wegen Zeitüberschreitung (Gerät meldet Netz, „online“ kommt also nie): alle 30 s im Hintergrund prüfen, ob
// der Server wieder antwortet; erst dann wie bei „online“ weiter (Seite nur ohne Eingaben neu aufbauen, sonst Sitzung/Stammdaten auffrischen)
let offlineProbeBusy = false;
setInterval(async () => {
  if (!S.offlineStart || offlineProbeBusy || navigator.onLine === false || document.visibilityState === 'hidden') return;
  offlineProbeBusy = true;
  try {
    const r = await api('GET', '/api/me', undefined, { bg: true, keepDirty: true, timeoutMs: START_TIMEOUT_MS });
    if (!S.offlineStart) return;
    if (S.me && r.user && r.user.id !== S.me.id) { toast(t('err_user_mismatch'), true); setTimeout(() => location.reload(), 2500); return; }
    if (!viewDirty()) { S.offlineStart = false; S.me = null; route(); return; }
    S.me = r.user; S.offlineStart = false;
    S.meta = await api('GET', '/api/meta', undefined, { bg: true, timeoutMs: START_TIMEOUT_MS }); saveOfflineSession(); refreshUnread(true); flushOutbox();
  } catch { /* weiter offline */ } finally { offlineProbeBusy = false; }
}, 30000);
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
  bindLang(); bindPwShow(); loginSessionNote();
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    try {
      // Backlog 534: Benutzernamen sind lateinisch ohne Leerzeichen – Leerzeichen (Autokorrektur „y. cevik“) entfernen, kyrillische Eingabe
      // (fremde Tastatur) nicht senden, sondern Hinweis zeigen: jeder Fehlversuch zählt sonst zur Sperre
      const un = $('#u').value.replace(/\s+/g, ''); const ul = $('#ulatin');
      if (/[\u0400-\u04FF]/.test(un)) { ul.hidden = false; $('#u').focus(); return; }
      ul.hidden = true;
      // Backlog 801 (Blickwinkel „Funkloch“): ohne Antwort blieb „Anmelden“ ohne Ende gesperrt – Zeitlimit wie beim Senden, danach „Keine Verbindung“
      // (erneute Anmeldung ist unschädlich; Einladungslink/Zwei-Faktor-Code bewusst ohne, dort wäre die Wiederholung nicht gleichwertig)
      const r = await api('POST', '/api/login', { username: un, password: $('#p').value, device_id: deviceId() }, { timeoutMs: SEND_TIMEOUT_MS });
      if (r.second_factor) { viewLoginCode(r.challenge); return; }
      afterLogin();
    } catch (err) { toast(err.message, true); }
  };
}
// Backlog 789 (Blickwinkel „Werkstatt-Tablet mit fremder Sprache (UK) und Fotos“): Anmeldeseite neu geladen, obwohl die Sitzung noch gilt
// (Adresse „#/login“ nach abgelaufener Sitzung in einem Tab und Anmeldung in einem anderen, Lesezeichen) – Hinweis „bereits angemeldet als …“
// mit „Weiter zur App“; das Formular bleibt für eine andere Person (Schichtwechsel). Nur wenn dieser Browser eine Sitzung kennt (SESSION_MARK),
// Abfrage ohne den 401-Ablauf von api() (der leert sonst Offline-Daten).
async function loginSessionNote() {
  let mark = ''; try { mark = localStorage.getItem(SESSION_MARK) || ''; } catch {}
  if (!mark) return;
  let u = null; try { const r = await fetch('/api/me', { credentials: 'same-origin', headers: { 'x-cfp': '1' } }); if (r.ok) u = (await r.json()).user; } catch {}
  const f = $('#f'); if (!u || !f || !/^#\/login/.test(location.hash || '') || $('#already')) return;
  f.insertAdjacentHTML('afterbegin', `<div class="panel good" id="already" role="status"><p>${esc(t('login_already').replace('{name}', u.display_name || u.username))}</p><div class="actions"><a class="btn block" href="#/" id="alreadygo">${esc(t('login_continue'))}</a></div></div>`);
  $('#alreadygo').onclick = (e) => { e.preventDefault(); afterLogin(); };
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
  return `<label for="lang">${esc(t('language'))}</label><select id="lang"><option value="de" lang="de"${S.lang === 'de' ? ' selected' : ''}>Deutsch</option><option value="uk" lang="uk"${S.lang === 'uk' ? ' selected' : ''}>Українська</option><option value="en" lang="en"${S.lang === 'en' ? ' selected' : ''}>English</option></select><p class="small muted" id="langmt">${esc(t('lang_browser_hint'))}</p>`;
}
function bindLang(save = false) {
  const l = $('#lang');
  // Sprache auch in der Offline-Sitzung merken (18.10.2026: Offline-Start kam sonst in der alten Sprache)
  if (l) l.onchange = async () => { S.lang = l.value; try { localStorage.setItem('cfp_lang', l.value); } catch {} if (save) { if (S.me) { S.me.language = l.value; saveOfflineSession(); } await api('PATCH', '/api/me', { language: l.value }).then(() => { try { localStorage.removeItem('cfp_lang_pending'); } catch {} }).catch((err) => { if (err.offline && S.me) try { localStorage.setItem('cfp_lang_pending', `${S.me.id}:${l.value}`); } catch {} }); } route(); };
}
async function viewSetup(...a) { return (await lazyModule('konto')).viewSetup(...a); }
async function viewInvite(...a) { return (await lazyModule('konto')).viewInvite(...a); }

// ---------- Übersicht ----------

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
  const pMine = early(api('GET', '/api/cases?' + caseFilterQ('mine') + '&limit=500'));
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
  // Backlog 866 (Blickwinkel „Neuer Mechaniker, erste Woche: welche Aufträge sind meine?“): Aufträge in Arbeit, an denen dieses Konto etwas
  // erfasst hat, direkt vor den Arbeitsschritten. Nur wenn auch andere an Aufträgen arbeiten – an einem gemeinsamen Werkstattkonto wäre es
  // sonst dieselbe Liste noch einmal. Fällt die Abfrage aus, bleibt die Tafel wie bisher.
  let mineIds = null; try { mineIds = new Set((await pMine).cases.map((c) => c.id)); } catch {}
  const WORKING = (c) => ['in_reparatur', 'wartet_teile', 'abschlusskontrolle'].includes(c.status) || (c.status === 'werkstatt_freigegeben' && c.workshop_ack_at);
  const mineL = mineIds ? open.filter((c) => WORKING(c) && mineIds.has(c.id)) : [];
  if (mineL.length && mineL.length < open.filter(WORKING).length) { const i = lanes.findIndex(([k]) => k === 'ws_to_ack'); lanes.splice(i, 0, ['ws_mine', mineL]); }
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
  let html = wsFlow() + shown.map(([k, l]) => `${dupNote(k)}<h2>${esc(t(k))} <span class="chip">${l.length}</span></h2>${k === 'ws_planned_today' && l.length > 1 ? `<p class="small muted" id="wsdayorder">${esc(t('day_order_hint'))}</p>` : ''}${k === 'ws_mine' ? `<p class="small muted" id="wsminehint">${esc(t('ws_mine_hint'))} <a href="${esc(hj('#/cases?f=mine'))}">${esc(t('show_in_list'))} ›</a></p>` : ''}${caseList(l, '', STEP_KEYS.includes(k) ? alsoAbove : null)}${k === 'ws_repeat' ? `<p class="small"><a href="${esc(hj('#/cases?f=repeat'))}">${esc(t('show_in_list'))} ›</a></p>` : ''}`).join('') || `<p class="muted">${esc(t('no_cases'))}</p>`;
  try {
    const ov = await pOv;
    // ≤ 14 Tage nach Datum oder nach km fällig/überschritten (Warnschwelle aus den Einstellungen) – gleiche Status wie die Prüftermin-Übersicht
    const kmDueNow = (r) => ['ueberfaellig', 'faellig'].includes(r.km_status);
    const soon = ov.rows.filter((r) => (r.days !== null && r.days <= 14) || kmDueNow(r));
    if (soon.length) html += `<h2>${esc(t('inspections_due'))} (≤ ${esc(nDays(14))}${soon.some(kmDueNow) ? ' ' + esc(t('ws_due_km_suffix')) : ''})</h2><div class="list">${soon.map((r) => `<a class="row ${r.status === 'ueberfaellig' ? 'p-kritisch' : 'p-mittel'}" href="#/vehicles/${encodeURIComponent(r.vehicle_id)}">${plate(r.plate)}<span class="title">${esc(mkR(r))}${r.days !== null && r.days <= 14 ? ' · ' + fmtD(r.next_due_date) : ''}${kmDueNow(r) ? ` · ${esc(t('due_at_km'))} ${fmtKm(r.next_due_km)} (${r.km_remaining < 0 ? esc(t('km_over')) + ' ' + fmtKm(-r.km_remaining) : esc(t('km_left')) + ' ' + fmtKm(r.km_remaining)})` : ''}</span><span class="chip ${r.status === 'ueberfaellig' ? 'kritisch' : 'mittel'}">${esc(t('ms_' + r.status))}${kmUnclearDateDue(r) ? ' · ' + esc(t('ms_' + r.date_status)) : ''}</span>${r.km_unclear ? `<span class="sub km-unclear">${esc(t('km_unclear_drop').replace('{d}', fmtD(r.km_drop_at)))}</span>` : ''}</a>`).join('')}</div><p class="small" style="margin-top:8px"><a href="#/plan?s=mdue">${esc(t('wplan'))}: ${esc(t('wplan_mdue'))} ›</a> <span class="muted">${esc(t('ws_mdue_link_hint'))}</span></p>`;
    // Prüfung mit erheblichen/gefährlichen Mängeln bzw. verkehrsunsicher, noch kein Auftrag: nur zur Info – die Fuhrparkleitung entscheidet
    const dw = ov.defects_without_case || [];
    if (dw.length) html += `<h2>${esc(t('ws_defects_pending'))} <span class="chip">${dw.length}</span></h2><p class="small muted">${esc(t('ws_defects_hint'))}</p><div class="list">${dw.map((x) => `<a class="row p-kritisch" href="#/vehicles/${encodeURIComponent(x.vehicle_id)}">${plate(x.plate)}<span class="title">${esc(mk(x.kind))} · ${fmtD(x.done_date)}</span><span class="chip kritisch">${esc(t('res_' + x.result))}</span></a>`).join('')}</div>`;
    // Backlog 885 (Folge aus 884): HU/SP/Tachograph erfasst, aber kein Prüfbericht in der Akte – die Werkstatt darf ihn hochladen (Knopf oben in der Akte)
    const rm = ov.report_missing || [];
    if (rm.length) html += `<h2 id="wsnr">${esc(t('todo_report_missing'))} <span class="chip">${rm.length}${(ov.lists_truncated || []).includes('report_missing') ? '+' : ''}</span></h2><p class="small muted">${esc(t('ws_nr_hint'))}</p><div class="list">${rm.map((x) => `<a class="row" href="#/vehicles/${encodeURIComponent(x.vehicle_id)}">${plate(x.plate)}<span class="title">${esc(mk(x.kind))} · ${fmtD(x.done_date)}</span><span class="chip">${esc(t('nr_go'))} ›</span></a>`).join('')}</div>`;
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
      // Backlog 968: Tafel der Disposition in eigener Gruppe „dispo“ (nur für diese Rolle geladen) – Reserve im Start-Modul
      if (S.me.role === 'dispatch') html += await dispoHome(cases);
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
async function dispoHome(...a) { return (await lazyModule('dispo')).dispoHome(...a); }















// Werkstatt-Startseite: Winterreifen-Arbeitsvorrat (gleiche Daten wie Disposition, Standort wie Reifen – Flotte); Sprung in die passenden Reiter
async function wsWinter(vsite = '') {
  const r = await api('GET', '/api/tires/winter' + (vsite ? '?site=' + encodeURIComponent(vsite) : '')).catch(() => null);
  if (!r || (!r.totals.nicht_erfuellt && !r.totals.unbekannt)) return '';
  // Liste mit demselben Standort wie die Zahlen (22.10.2026: Zahl für den Standard-Standort, Link auf alle Standorte – Liste zeigte mehr)
  const wl = (h) => `${h}&vs=${encodeURIComponent(vsite || '*')}`;
  const rows = r.noncompliant.map((x) => `<a class="row p-mittel" href="#/vehicles/${encodeURIComponent(x.vehicle_id)}?sec=tires">${plate(x.plate)}<span class="title" style="white-space:normal">${esc(t('winter_bad').replace('{p}', x.noncompliant.map(posL).join(', ')))}</span><span class="chip mittel">${esc(t('ws_nicht_erfuellt'))}</span>${x.missing.length || x.open_order || x.closed_order ? `<span class="sub wrap">${[x.missing.length && esc(t('winter_missing').replace('{p}', x.missing.map(posL).join(', '))), x.open_order && woApptTxt(x.open_order), x.closed_order && `⚠ ${esc(t('wo_closed_short').replace('{no}', x.closed_order.case_no))}`].filter(Boolean).join(' · ')}</span>` : ''}</a>`).join('');
  return `<section id="wswinter"><h2>${esc(t('ws_winter'))}${r.totals.nicht_erfuellt ? ` <span class="chip">${r.totals.nicht_erfuellt}</span>` : ''}</h2><p class="small muted">${esc(t('ws_winter_hint'))}</p>${rows ? `<div class="list">${rows}</div><p class="small noprint"><a href="${wl('#/tires?f=winter_bad')}" id="wswbad">${esc(t('ws_winter_show'))} ›</a></p>` : ''}${r.noncompliant.some((x) => x.closed_order) ? `<p class="small noprint"><a href="${wl('#/tires?f=winter_closed')}" id="wswclosed">${esc(t('tires_winter_closed'))} ›</a></p>` : ''}${r.totals.unbekannt ? `<p class="small noprint"><a href="${wl('#/tires?f=winter_unknown')}" id="wswunk">${esc(t('ws_winter_unknown').replace('{n}', r.totals.unbekannt))} ›</a></p>` : ''}</section>`;
}



// Kennzeichnung „Winterreifen“ für Aufträge aus der Fahrzeugakte → Reifen (Beschreibung ist deutsch, das Etikett übersetzt)
function woTag(i) { return i.tire_order === 'winter' ? `<span class="chip mittel wotag">❄ ${esc(t('wo_tag'))}</span> ` : ''; }

// Unterzeile: Auftrag/Werkstatt und weitere geplante Tage desselben Fahrzeugs (Fahrzeug fällt dann mehrfach aus – Hinweis zum Zusammenlegen)
// Gespann (laut Stammliste) und „ruhend“ je Termin: Zugmaschine fällt mit dem Anhänger aus bzw. ruhendes Fahrzeug nicht einplanen (23.10.2026)
const planVehTag = (i) => [i.coupled ? `<span data-pcoupled>🔗 ${esc(t('vk_' + i.coupled.kind))} ${esc(i.coupled.plate)}</span>` : '', i.eval_excluded ? `<span class="chip" data-pdormant>${esc(t('eval_excluded'))}</span>` : ''].filter(Boolean).join(' ');




async function fleetTodo(...a) { return (await lazyModule('leitung')).fleetTodo(...a); }

 // todo_repeat hat bereits einen eigenen Link

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
// Backlog 867 (Blickwinkel „Werkstatt-Tablet: Mechaniker wird mitten in der Reparatur zu einem Notfall gerufen“): Arbeitsstand für die Übergabe
// mit Zeitpunkt und Person (Name aus dem Verlauf bzw. der Liste) – nur in Reparatur/„wartet auf Teile“, sonst vom Server entfernt
const WST_ST = ['in_reparatur', 'wartet_teile'];
// Backlog 871 (Blickwinkel „Fahrer fragt: wann ist mein Lkw fertig?“): voraussichtliche Fertigstellung laut Werkstatt – nur solange
// freigegeben/in Reparatur/wartet auf Teile; vorbei = „überschritten“ (keine Rechnung, nur die Angabe der Werkstatt)
const RDY_ST = ['werkstatt_freigegeben', 'in_reparatur', 'wartet_teile'];
const rdyOf = (c) => (c && c.ready_expected_on && (!c.status || RDY_ST.includes(c.status)) ? c.ready_expected_on : null);
// Backlog 875: wie oft „voraussichtlich fertig“ seit dem letzten Werkstattwechsel nach hinten verschoben wurde, und die erste Angabe (Verlauf, chronologisch)
const rdyMoves = (d) => { if (!d || !Array.isArray(d.events)) return null; let n = 0, first = null; for (const e of d.events) { if (e.action === 'reassign_workshop') { n = 0; first = null; } else if (e.action === 'set_ready_date' && e.payload) { const f = e.payload.from, to = e.payload.to; if (!first) first = f || to || null; if (f && to && to > f) n++; } } return n && first ? { n, first } : null; };
const rdyTxt = (d, label = 'rdy_title') => `${esc(t(label))} <b>${fmtD(d)}</b>${d === bDate() ? ' (' + esc(t('today')) + ')' : ''}${d < bDate() ? ` <span class="chip mittel" data-rdypast>${esc(t('rdy_passed'))}</span>` : ''}`;
function workStateInfo(c, d) {
  if (!c.work_state_note || !WST_ST.includes(c.status)) return '';
  const ev = d && Array.isArray(d.events) ? d.events.filter((e) => e.action === 'set_work_state' && e.note).pop() : null;
  const who = (ev && ev.actor_name) || c.work_state_by_name || '';
  return `<dt>${esc(t('wst_title'))}</dt><dd id="wstate"><span style="white-space:pre-wrap"${langAttr(c.work_state_note)}>${esc(c.work_state_note)}</span>${c.work_state_at ? `<br><span class="small muted" data-wstat>${esc(t('vl_as_of'))} ${fmtDT(c.work_state_at)}${who ? ' · ' + esc(who) : ''}</span>` : ''}</dd>`;
}
// Backlog 880 (Blickwinkel „Werkstatt wartet auf Teile, der Lkw fährt so lange weiter“): Fahrzeug darf laut Leitung bis zur Teilelieferung fahren
const pdrOn = (c) => c.status === 'wartet_teile' && !!c.parts_drive_at && !c.safety_lock;
const pdrList = (c) => (pdrOn(c) ? ` · <b data-pdr style="white-space:nowrap">🚚 ${esc(t('pdr_short'))}</b>` : '');
function pdrInfo(c, d) {
  if (!pdrOn(c)) return '';
  const ev = d && Array.isArray(d.events) ? d.events.filter((e) => e.action === 'set_parts_drive' && e.payload && e.payload.on).pop() : null;
  const who = S.me.role !== 'driver' && ev && ev.actor_name ? ev.actor_name : '';
  return `<dt>${esc(t('pdr_title'))}</dt><dd id="pdrive"><b>🚚 ${esc(t('pdr_yes'))}</b> <span class="small muted" data-pdrat>(${esc(t('vl_as_of'))} ${fmtDT(c.parts_drive_at)}${who ? ' · ' + esc(who) : ''})</span><br><span class="small muted">${esc(t('pdr_back_hint'))}</span></dd>`;
}
const workStateList = (c) => (c.work_state_note && WST_ST.includes(c.status) ? ` · <span data-wstate>⏸ <b>${esc(t('wst_short'))}</b>: ${ltxt(clipTxt(c.work_state_note, 60))}${c.work_state_by_name ? ` (${esc(c.work_state_by_name)})` : ''}</span>` : '');
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
// Backlog 888: Kostenstand vor der technischen Freigabe (nur wer Teile/Fremdleistungen sieht) – '' = nichts zu melden.
// Fremdleistung „ersetzt eigene Arbeit/Teile“ → Teile zählen nicht (wie computeCosts im Server).
function relCostOpen(d) {
  if (!d || !Array.isArray(d.parts) || !Array.isArray(d.external_costs)) return '';
  const ext = d.external_costs; // ohne Stunden/Fremdleistung keine Abschlusskontrolle (Server `work_missing`) – „gar nichts gebucht“ kommt hier nicht vor
  const parts = ext.some((e) => e.covers_work_and_parts) ? [] : d.parts;
  const noVal = (x, k) => x[k] === null || x[k] === undefined || x.valuation === 'unvalued';
  const est = parts.filter((p) => !noVal(p, 'unit_price_net') && p.valuation === 'estimate').length + ext.filter((e) => !noVal(e, 'amount_net') && e.valuation === 'estimate').length;
  const unv = parts.filter((p) => noVal(p, 'unit_price_net')).length + ext.filter((e) => noVal(e, 'amount_net')).length;
  if (!est && !unv) return '';
  return t('rel_cost_open').replace('{x}', [est ? t('rel_cost_est').replace('{n}', est) : '', unv ? t('rel_cost_unv').replace('{n}', unv) : ''].filter(Boolean).join(' · '));
}
// Backlog 550 (Blickwinkel „neue Fuhrparkleiterin“): Texte mit Verweis auf „Einstellungen“ – wer sie nicht öffnen kann (nur Inhaber), liest „(Einstellungen, nur Inhaber)“
const ownerT = (k) => t(S.me && S.me.role !== 'owner' ? k + '_mgr' : k);
function caseList(list, empty, extra) {
  if (!list.length) return `<p class="muted">${esc(empty || t('no_cases'))}</p>`;
  return `<div class="list">${list.map((c) => { const xh = extra ? extra(c) : ''; return `<a class="row p-${esc(c.priority)}" href="#/cases/${esc(c.id)}">
    ${plate(c.plate, { locked: c.safety_lock })}
    <span class="title">${woTag(c)}${ltxt(cDesc(c.description))}</span>
    <span class="chip ${esc(c.status === 'fahrzeug_freigegeben' ? 'ok' : c.priority)}">${esc(stTxt(c))}</span>
    <span class="sub${c.status === 'wartet_teile' || c.access === 'preview' || c.appraisal_wait_on || xh || rdyOf(c) || (c.work_state_note && WST_ST.includes(c.status)) ? ' wrap' : ''}">${xh}${esc(c.case_no)} · ${esc(t('prio_' + c.priority))}${c.safety_lock ? ' · ' + esc(t('locked')) : ''}${c.open_items > 0 ? ` · <span data-oi>${esc(t('open_items'))}: ${Number(c.open_items)}</span>` : ''}${c.file_count ? ` · <span data-fc title="${esc(t('files'))}">📎 ${Number(c.file_count)}</span>` : ''}${c.access === 'preview' ? ' · ' + esc(t('preview_hint')) : ''}${c.appraisal_wait_on ? ` · <b data-apwlist>🔍 ${esc(t('apw_short'))} ${fmtD(c.appraisal_wait_on)}${c.appraisal_wait_on === bDate() ? ' (' + esc(t('today')) + ')' : ''}</b>` : ''}${c.tow_service && OPEN_CASE_ST.includes(c.status) ? ` · <b class="towtag">${esc(t('vl_towed_chip'))}</b>` : ''}${['gemeldet', 'werkstatt_freigegeben'].includes(c.status) && c.reported_driveability === 'nicht_fahrbereit' && !c.tow_service ? ` · <b data-notdrv>${esc(t('cl_not_drivable'))}</b>${c.location_note && !c.vehicle_location ? ` <span data-locnote>📍 ${esc(clipTxt(c.location_note, 60))}</span>` : ''}` : ''}${hoMissing(c).length ? ` · <b class="hotag">${esc(hoMissing(c).join(', '))}</b>` : ''}${c.planned_date && ['werkstatt_freigegeben', 'in_reparatur', 'wartet_teile'].includes(c.status) ? ` · <b>${esc(t('planned'))} ${fmtD(c.planned_date)}</b>${c.planned_note ? ` <span data-plannote>(${esc(clipTxt(c.planned_note, 60))})</span>` : ''}` : ''} · ${fmtDT(c.updated_at)}${recentRepeat(c) ? ` · <b>${esc(t('act_repeat_finding'))} ${fmtDT(c.last_repeat_at)}</b>` : ''}${partsEta(c)}${partsWaitList(c)}${workStateList(c)}${c.ready_expected_on && rdyOf(c) ? ` · <span data-rdyl>${rdyTxt(c.ready_expected_on)}</span>` : ''}${pdrList(c)}${c.cost_over_limit_at ? ` · <span class="chip mittel">${esc(t('cost_approval_pending'))}</span>` : ''}${qChip(c)}${c.maintenance_event_id ? ` · <b>${esc(t('md_case'))}</b>` : ''}${c.duplicate_of_no ? ` · ${esc(t('dup_of'))} ${esc(c.duplicate_of_no)}` : ''}${c.followup_on && !['fahrzeug_freigegeben', 'abgelehnt'].includes(c.status) ? ` · <span class="chip${c.followup_on <= bDate() ? ' mittel' : ''}">${esc(t('followup'))} ${fmtD(c.followup_on)}</span>` : ''}</span></a>`; }).join('')}</div>`;
}

// Filter der Vorgangsliste: offen/abgeschlossen/alle bzw. „Mangel erneut festgestellt“ (offen, letzte 3 Tage)
// „kritisch“/„gesperrt“: Sprung aus den Zählern der Startseite (Backlog 238, Blickwinkel „Inhaber nach dem Urlaub“) – gleiche Regel wie der Zähler
const caseFilterQ = (f) => (f === 'q_open' ? 'status=open&question=open' : f === 'q_answered' ? 'status=open&question=answered' : f === 'unreceived' ? 'status=open&unreceived=1' : f === 'limited' ? 'status=open&limited=1' : f === 'open_items' ? 'status=fahrzeug_freigegeben&open_items=1' : f === 'mine' ? 'status=open&mine=1' : f === 'paused' ? 'status=open&paused=1' : f === 'ready_overdue' ? 'status=open&ready_overdue=1' : f === 'cost_approval' ? 'status=open&cost_approval=1' : f === 'critical' ? 'status=open&priority=kritisch' : f === 'locked' ? 'status=open&locked=1' : f === 'repeat' ? 'status=open&repeat_days=3' : f === 'warranty' ? 'status=open&warranty=1' : f === 'stale' ? 'status=open&stale=1' : f === 'followup' ? 'status=open&followup=1' : `status=${f === 'all' ? '' : f}`);
const CF_LABEL = { unreceived: 'todo_receive', limited: 'dispo_limited_new', open_items: 'filter_open_items', repeat: 'filter_repeat', warranty: 'filter_warranty', stale: 'filter_stale', followup: 'filter_followup', critical: 'prio_kritisch', locked: 'locked_cases', cost_approval: 'todo_cost_approval', q_open: 'q_open', q_answered: 'q_answered', mine: 'filter_mine', paused: 'todo_paused', ready_overdue: 'todo_ready_overdue' };
async function viewCases() {
  const hf = new URLSearchParams(location.hash.split('?')[1] || '').get('f');
  if (hf) try { sessionStorage.setItem('cfp_cf', hf); } catch {}
  // Sprung aus einem Zähler (#/cases?f=…): früherer Suchbegriff gilt nicht (Zahl und Liste passten sonst nicht, 22.10.2026)
  if (hf) S.caseQ = '';
  let f = hf || sessionStorage.getItem('cfp_cf') || 'open';
  if (!['open', 'closed', 'all', 'repeat', 'warranty', 'stale', 'followup', 'critical', 'locked', 'cost_approval', 'unreceived', 'limited', 'open_items', 'q_open', 'q_answered', 'mine', 'paused', 'ready_overdue'].includes(f) || (['repeat', 'warranty', 'stale', 'critical', 'locked', 'cost_approval', 'unreceived', 'limited', 'open_items', 'mine', 'paused', 'ready_overdue'].includes(f) && S.me.role === 'driver') || (f === 'followup' && ['driver', 'workshop'].includes(S.me.role))) f = 'open';
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
    <div class="seg-tabs noprint">${['open', 'closed', 'all', ...(S.me.role === 'driver' ? [] : ['repeat', 'warranty', ...(res.stale_days || f === 'stale' ? ['stale'] : []), ...(S.me.role === 'workshop' ? ['mine'] : ['followup']), ...(['critical', 'locked', 'cost_approval', 'unreceived', 'limited', 'open_items', 'paused', 'ready_overdue'].includes(f) || (f === 'mine' && S.me.role !== 'workshop') ? [f] : [])])].map((k) => `<a href="#/cases" data-f="${k}" class="${k === f ? 'on' : ''}"${k === f ? ' aria-current="true"' : ''}>${esc(t(k === 'unreceived' && !isMgr() ? 'dispo_unreceived' : CF_LABEL[k] || k))}</a>`).join('')}</div>${f === 'stale' ? `<p class="small muted">${esc(res.stale_days ? t('filter_stale_hint').replace('{n}', nDays(res.stale_days)) : ownerT('filter_stale_off'))}</p>` : ''}
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
// Backlog 798 (Blickwinkel „Fahrer im Funkloch“): Meldung/Abfahrtskontrolle (kleine JSON-Anfrage) ohne Antwort nach 60 s wie Netzabbruch
// behandeln – vorher stand „Senden“ im Funkloch ohne Ende, die Meldung kam nicht in den Postausgang. Doppelt angelegt wird nichts:
// derselbe request_key liefert beim Nachsenden „duplicate“ (Server), falls die erste Anfrage doch angekommen war.
const SEND_TIMEOUT_MS = 60000;
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
  const done = new Set(); const failedNow = new Map(); const photoPending = new Map(); const heldNow = new Map(); let kept = 0;
  const key = outboxKey(); // Schlüssel festhalten: endet die Anmeldung mitten im Senden, wird der Stand trotzdem gespeichert (19.10.2026)
  try {
    for (const item of list) {
      if (!S.me) { kept++; break; } // Anmeldung beendet: nichts mehr ohne Konto senden
      if (item.hold && item.photo_target && !unmetered()) continue; // Backlog 807: Fotos bewusst zurückgehalten – erst im WLAN bzw. auf Wunsch
      if (PHOTO_UPLOADING.has(item.body.request_key) || busy.has('cfp_photo_' + item.body.request_key)) { kept++; continue; } // lädt gerade im Vordergrund hoch (uploadPhotosSafe, auch in anderem Tab)
      try {
        // Meldung/Kontrolle schon angekommen, nur die Fotos fehlen noch (Netz brach beim Hochladen ab): nur Fotos nachreichen
        let r = item.photo_target ? { id: item.photo_target, followups: [{ id: item.photo_target }], case_no: item.case_no } : null;
        // Abfahrtskontrolle mit dem Zeitpunkt der Durchführung (nicht des Sendens) – km-Stand wird zeitlich richtig eingeordnet
        // mit der Gerätezeit beim Senden: der Server rechnet eine falsch gehende Geräteuhr heraus (22.10.2026)
        const sendBody = item.path === '/api/inspections' && item.saved_at ? { ...item.body, performed_at: item.saved_at, client_now: new Date().toISOString() } : item.body;
        const ox = { asUser: item.user_id || S.me.id, env: item.env, keepDirty: true };
        if (!r) r = await api('POST', item.path || '/api/cases', sendBody, { ...ox, timeoutMs: SEND_TIMEOUT_MS });
        let failed = 0; let skippedTxt = '';
        // Backlog 807: offline gespeicherte Meldung mit zurückgehaltenen Fotos – nur die Meldung senden, Fotos bleiben mit Ziel-Vorgang auf dem Gerät
        if (item.photos && item.hold && !unmetered()) {
          heldNow.set(item.body.request_key, { target: photoTarget(item, r), case_no: r.case_no });
          toast(`${t('report_sent')}: ${r.case_no} · ${tn('photos_held', item.photos)}${r.urgent_push_recipients === 0 ? ' · ⚠ ' + t('no_push_reach') : ''}`, r.urgent_push_recipients === 0);
          continue;
        }
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
        toast(item.path === '/api/inspections' ? `${t('check_saved')}${skippedTxt ? ' · ' + skippedTxt : ''}${failed ? ' · ' + tn('photos_failed', failed) : ''}${kmWarn(r)}${cplNote(r)}${lockedWarn(r)}` : `${t('report_sent')}: ${r.case_no}${failed ? ' · ' + tn('photos_failed', failed) : ''}${r.urgent_push_recipients === 0 ? ' · ⚠ ' + t('no_push_reach') : ''}`, !!failed || !!r.km_rejected || !!r.km_equals_truck || !!r.vehicle_locked || !!r.coupled_locked || r.urgent_push_recipients === 0);
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
      : photoPending.has(x.body.request_key) ? { ...x, photo_target: photoPending.get(x.body.request_key).target || null, case_no: photoPending.get(x.body.request_key).case_no || null }
      : heldNow.has(x.body.request_key) ? { ...x, photo_target: heldNow.get(x.body.request_key).target || null, case_no: heldNow.get(x.body.request_key).case_no || null } : x)), key); } catch {}
    flushing = false;
  }
  if (failedNow.size || done.size || heldNow.size) refreshOutbox();
  // gesendete Meldungen sofort in der Startseite zeigen (18.10.2026: erschienen erst nach dem Neuladen) – nur ohne Eingaben
  if (done.size && /^#\/?$/.test(location.hash || '#/') && !viewDirty()) route();
  if (kept && S.me && !S.outboxRetry) S.outboxRetry = setTimeout(() => { S.outboxRetry = null; if (navigator.onLine) flushOutbox(); }, 60000);
}
window.addEventListener('online', () => flushOutbox());
// Backlog 807: Verbindung ohne Volumenkosten (WLAN/Kabel) – nur wo der Browser die Art meldet (Android/Chrome; iPhone nicht: dort „Fotos jetzt senden“)
function unmetered() { try { const c = navigator.connection; return !!(c && (c.type === 'wifi' || c.type === 'ethernet')); } catch { return false; } }
try { if (navigator.connection && navigator.connection.addEventListener) navigator.connection.addEventListener('change', () => { if (unmetered() && outboxGet().some((x) => x.hold && !x.failed)) flushOutbox(); }); } catch {}
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
  const all = outboxGet(); const n = all.filter((x) => !x.failed && !x.photo_target).length; const np = all.filter((x) => !x.failed && x.photo_target && !x.hold).length;
  const held = all.filter((x) => !x.failed && x.photo_target && x.hold); const nh = held.reduce((a, x) => a + (Number(x.photos) || 0), 0); const bad = [...all.filter((x) => x.failed), ...otherEnvOutbox()];
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
  // Backlog 807: bewusst zurückgehaltene Fotos – eigener, ruhiger Hinweis mit „jetzt senden“ (kein Fehler, keine Wartezeit auf Verbindung)
  if (nh) html += `<div class="panel" id="outbox_held" role="status" data-outboxheld><p>${esc(tn('outbox_photos_held', nh))} ${held.map((x) => (x.case_no ? `<a href="#/cases/${esc(x.photo_target)}" translate="no">${esc(x.case_no)}</a>` : '')).filter(Boolean).join(', ')}</p><p class="small muted">${esc(t('outbox_photos_held_hint'))}</p><div class="actions"><button type="button" class="btn secondary" data-obx-release>${esc(t('photos_send_now'))}</button><button type="button" class="btn secondary" data-obx-held-del>${esc(t('photos_held_discard'))}</button></div></div>`;
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
  // Backlog 807: zurückgehaltene Fotos jetzt senden (alle bzw. die eines Vorgangs) oder bewusst verwerfen
  for (const b of document.querySelectorAll('[data-obx-release]')) b.onclick = async () => {
    const cid = b.dataset.obxRelease || '';
    outboxSet(outboxGet().map((x) => (x.hold && x.photo_target && (!cid || x.photo_target === cid) ? { ...x, hold: undefined } : x)));
    refreshOutbox(); if (navigator.onLine === false) { toast(t('photos_send_offline')); return; }
    await flushOutbox();
    if (cid && location.hash === '#/cases/' + cid && !viewDirty()) route();
  };
  for (const b of document.querySelectorAll('[data-obx-held-del]')) b.onclick = async () => {
    if (!confirm(t('photos_held_discard_confirm'))) return;
    // nach Schlüssel (outboxGet liefert bei jedem Aufruf neue Objekte)
    const gone = new Set(outboxGet().filter((x) => x.hold && x.photo_target && !x.failed).map((x) => x.body.request_key));
    outboxSet(outboxGet().filter((x) => !gone.has(x.body.request_key)));
    for (const k of gone) await photosDel(k).catch(() => {});
    refreshOutbox();
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
  try { const vs = (await api('GET', '/api/vehicles', undefined, { timeoutMs: START_TIMEOUT_MS })).vehicles; try { localStorage.setItem(vkey + '_at', String(Date.now())); localStorage.setItem(vkey, JSON.stringify(vs.map((v) => ({ id: v.id, plate: v.plate, kind: v.kind, site: v.site, assigned: v.assigned, availability: v.availability, coupled: v.coupled || null, last_check_at: v.last_check_at || null, last_check_result: v.last_check_result || null })))); } catch {} return vs; }
  catch (err) { if (!err.offline) throw err; let vs = null; try { vs = JSON.parse(localStorage.getItem(vkey) || 'null'); } catch {} if (!vs) throw err; return vs; }
}
// Netz bricht beim Foto-Upload des direkten Sendens ab: restliche Fotos auf dem Gerät speichern und über den Postausgang nachreichen
// (Meldung ist schon angelegt – Eintrag nur mit Fotoziel; 18.10.2026: Fotos gingen sonst verloren). Rückgabe: Anzahl gespeicherter Fotos.
async function photosLater(path, body, r, target, files, who = outboxWho(), hold = false) {
  try {
    if (!who) return 0;
    const list = []; for (const f of files) list.push({ blob: await prepareUpload(f), name: f.name });
    await photosPut(body.request_key, list);
    outboxAdd(path, body, list.length, who);
    outboxSet(outboxGet(who.key).map((x) => (x.body.request_key === body.request_key ? { ...x, photo_target: target, case_no: r.case_no || null, ...(hold ? { hold: true } : {}) } : x)), who.key);
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
const ACC_HINT = lbRx(String.raw`(?<![a-zäöüß-])(?:bin|sind|ist|hinten|leicht|voll)\s+(?:\S+\s+)?aufgefahren(?![a-zäöüß])(?!\s+auf\s+(?:die|den|das)\s+(?:autobahn|bahn|f(?:ä|ae)hre|zug|rampe|ladefl(?:ä|ae)che|anh(?:ä|ae)nger|auflieger))|(?<![a-zäöüß-])im\s+stau\s+(?:\S+\s+)?aufgefahren|(?<![a-zäöüß-])(?:mir|uns|ihm)\s+(?:\S+\s+){0,2}?(?:hinten\s+)?(?:rein|drauf|hinein|herein|drauf|in\s+die\s+seite|ins\s+heck)\s*gefahren(?![a-zäöüß])|(?<![a-zäöüß-])(?:auto|pkw|wagen|fahrzeug|transporter|bus|motorrad|sprinter|kleinwagen)(?:s)?\s+(?:\S+\s+)?gestreift(?![a-zäöüß])|(?<![a-zäöüß-])(?:zusammengesto(?:ß|ss)en|zusammensto(?:ß|ss)|zusammengekracht|kollidiert|kollision)(?![a-zäöüß])|(?<![a-z-])(?:hit|rammed|bumped)\s+(?:me|us|my\s+(?:truck|lorry|trailer|cab|unit)|the\s+(?:truck|lorry|trailer))\s+(?:from\s+behind|in\s+the\s+(?:back|rear|side)|on\s+the\s+side)(?![a-z])|(?<![a-z-])(?:drove|ran|reversed|backed|crashed|went)\s+into\s+(?:me|us|my\s+(?:truck|lorry|trailer|cab)|the\s+back\s+of\s+(?:me|us|my\s+\S+))(?![a-z])|(?<![a-z-])collided(?![a-z])|(?<![а-яіїєґё])(?:в|у)\s+(?:мене|нас|меня)\s+(?:\S+\s+)?(?:врізал|врезал|в['’]?їхал|въехал)\S*|(?<![а-яіїєґё])(?:врізал|врезал|в['’]?їхал|въехал)\S*\s+(?:в|у)\s+(?:мене|нас|меня)(?![а-яіїєґё])|unfall|accident|(?<![a-zäöüß-])(?:(?:fahr)?radfahrer(?:in|innen)?|radler(?:in)?|fu(?:ß|ss)g(?:ä|ae)nger(?:in|innen)?|motorradfahrer(?:in)?|rollerfahrer(?:in)?|e-?scooter(?:fahrer(?:in)?)?)(?![a-zäöüß])\s+(?:\S+\s+){0,4}?(?:(?:ü|ue)bersehen|erfasst|gestreift|touchiert|ber(?:ü|ue)hrt|gest(?:ü|ue)rzt|umgefahren|angefahren|abgefahren|zusammengesto(?:ß|ss)en|gerammt|verletzt)(?![a-zäöüß])|(?<![a-z-])(?:(?:hit|struck|knocked\s+(?:down|over)|clipped|ran\s+over|run\s+over|collided\s+with)\s+(?:\S+\s+){0,2}?(?:cyclists?|pedestrians?|motorcyclists?|(?:e-?)?scooter\s+riders?)|(?:cyclists?|pedestrians?|motorcyclists?)\s+(?:\S+\s+){0,3}?(?:was\s+|got\s+)?(?:hit|struck|knocked\s+(?:down|over)|clipped|injured|run\s+over))(?![a-z])|(?<![а-яіїєґ])(?:збив|збила|зачепив|зачепила|сбил|сбила|задел|задела|наїхав|наїхала|наехал|наехала)\s+(?:\S+\s+){0,2}?(?:велосипедист|пішоход|пішохід|пешеход|мотоцикліст|мотоциклист)\S*|rangierschaden|(?<![a-zäöüß])beim\s+(?:rangieren|zurücksetzen|rückwärtsfahren)\s+(?:\S+\s+){0,5}?(?:angefahren|gesto(?:ß|ss)en|touchiert|besch(?:ä|ae)digt|gerammt|gestreift)(?![a-zäöüß])|(?<![a-z])(?:while|when)\s+(?:manoeuvring|maneuvering|reversing|backing\s+up)\s+(?:\S+\s+){0,5}?(?:hit|struck|damaged|scraped)(?![a-z])|(?:під\s+час|при)\s+(?:маневрування|маневрировании|задньому\s+ходу)\s+(?:\S+\s+){0,5}?(?:зачепи|вдари|пошкоди|ударил|задел|повредил)\S*|дтп|авар(?:ія|ії|ію|ією|ия|ии|ию|ией)(?![а-яіїєґ])|(?<![a-zäöüß-])(?:in\s+den|im)\s+(?:stra(?:ß|ss)en)?graben\s+(?:\S+\s+)?(?:gerutscht|gefahren|geraten|abgerutscht|gelandet|gekippt)|(?<![a-zäöüß-])(?:lkw|fahrzeug|sattelzug|zug|auflieger|anh(?:ä|ae|a)nger|gespann|zugmaschine|wagen)\s+(?:\S+\s+){0,3}?(?:eingeknickt|umgekippt|umgest(?:ü|ue|u)rzt|auf\s+die\s+seite\s+gekippt)(?![a-zäöüß])|von\s+der\s+fahrbahn\s+abgekommen|(?<![a-zäöüß])(?:von\s+der\s+(?:stra(?:ß|ss)e|autobahn|landstra(?:ß|ss)e|fahrbahn)|ins\s+feld|in\s+die\s+b(?:ö|oe)schung)\s+(?:\S+\s+)?(?:abgekommen|abgerutscht|gerutscht|abgedriftet)|(?<![a-zäöüß])(?:kam|kamen|kommt)\s+(?:\S+\s+){0,3}?von\s+der\s+(?:stra(?:ß|ss)e|autobahn|landstra(?:ß|ss)e|fahrbahn)\s+ab(?![a-zäöüß])|(?<![a-zäöüß])b(?:ö|oe)schung\s+(?:hinunter|hinab|runter|herunter)(?:gerutscht|gefahren|gest(?:ü|ue)rzt|gekippt)?(?![a-zäöüß])|(?<![a-zäöüß-])(?:lkw|fahrzeug|sattelzug|zug|auflieger|anh(?:ä|ae|a)nger|gespann|zugmaschine|wagen)\s+(?:\S+\s+){0,2}?(?:liegt|lag|landete)\s+auf\s+der\s+seite(?![a-zäöüß])|(?<![a-z])(?:left|went\s+off|ran\s+off|veered\s+off|came\s+off)\s+the\s+(?:road|carriageway|motorway|highway)|(?<![a-z])(?:truck|lorry|trailer|vehicle|rig)\s+(?:\S+\s+){0,2}?(?:is|was|lying|ended\s+up)\s+(?:\S+\s+)?on\s+its\s+side|(?:з['’]їхав|з['’]їхала|съехал\S*|вилетів|вилетіла|вылетел\S*)\s+(?:\S+\s+)?(?:з|с|із)\s+(?:дороги|траси|трассы|шосе|шоссе|автобану)|(?<![а-яіїєґ])(?:лежить|лежит)\s+на\s+(?:боці|боку)|(?<![a-z])(?:jack-?knif\S*|overturned|rolled\s+over|in\s+(?:a|the)\s+ditch|slid\s+off\s+the\s+road)|(?:з['’]їхав|з['’]їхала|съехал\S*)\s+(?:\S+\s+)?(?:в|у)\s+кювет|(?<![а-яіїєґ])(?:вантажівк\S*|фур\S*|тягач\S*|причіп|напівпричіп|грузовик\S*)\s+(?:\S+\s+)?(?:перекину\S*|перевернул\S*|склав\S*|склал\S*|сложил\S*)|zusammensto(?:ß|ss)|(?<![a-zäöüß])kollision|(?<![a-zäöüß])(?:pkw|auto|kleinwagen|transporter|motorrad|radfahrer\S*|fu(?:ß|ss)g(?:ä|ae|a)nger\S*)\s+(?:\S+\s+){0,2}?(?:angefahren|gerammt|touchiert)(?![a-zäöüß])|auf\s+(?:\S+\s+){0,2}?(?:pkw|auto|lkw|fahrzeug|wagen|vordermann|stauende|transporter|bus)\s+aufgefahren|(?<![a-z])(?:collision|collided|rear-ended|crash(?:ed)?\s+into|hit\s+(?:a|another|the)\s+(?:car|vehicle|truck|lorry|van))|зіткн\S*|столкн\S*|(?:є|е)вропротокол\S*|(?:наїхав|наїхала|наехал\S*|зачепив|зачепила|зацепил\S*|врізав\S*|врізал\S*|врезал\S*)\s+(?:\S+\s+){0,2}?(?:машин\S*|авто\S*|легков\S*|вантажівк\S*|фур\S*|грузовик\S*|автобус\S*)|(?<![a-zäöüß-])(?<!(?:nicht|nie|kein)\s+)(?:angeeckt|angedotzt|gegengefahren|dagegengefahren|gegengeknallt|dagegengeknallt|gegengesetzt|dagegengesetzt)(?![a-zäöüß])|(?<![a-zäöüß-])(?<!(?:nicht|nie)\s+)dagegen\s+(?:gefahren|geknallt|gesetzt|gesto(?:ß|ss)en)(?![a-zäöüß])|(?<![a-zäöüß-])(?:delle|beule|macke|kratzer|schramme)n?\s+(?:\S+\s+){0,3}?(?:reingefahren|reingesetzt|reingehauen|reingemacht)(?![a-zäöüß])|(?<![a-zäöüß-])blechschaden|(?<![a-zäöüß-])(?:lkw|bus|reisebus|sattelzug|gespann)\s+(?:\S+\s+){0,2}?(?:touchiert|gerammt|gestreift)(?![a-zäöüß])|(?<![a-zäöüß-])(?:an|am)\s+(?:\S+\s+){0,2}?(?:pkw|auto|lkw|fahrzeug|wagen|transporter|bus|sprinter)\s+h(?:ä|ae)ngen\s*geblieben|(?<![a-zäöüß-])(?:hab|habe|hat|haben)\s+(?:\S+\s+)?(?:was|etwas|jemand(?:en)?)\s+angefahren(?![a-zäöüß])`, 'i');
// + Kraftstoffdiebstahl per Diktat: ukr./russ. „злили/слили (…) пальне/паливо/дизель/солярку/топливо“, engl. „siphoned“ (Backlog 230; „злили масло“ = Ölwechsel nicht)
const THEFT_HINT = lbRx(String.raw`(?:(?<![а-яіїєґё])пломб\S*\s+(?:\S+\s+)?(?:зірван\S*|зірвали|злама[внл]\S*|зламали|сорван\S*|сорвали|сломан\S*|сломали)|(?<![а-яіїєґё])(?:зірвали|сорвали|зламали|сломали)\s+пломб\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![а-яіїєґё])(?:(?:вантажівк|машин|кабін|кабин|фур|причіп|причеп|прицеп|авто|нас|мене|меня)\S*\s+(?:\S+\s+)?(?<!не\s)(?:обікрали|обокрали|пограбували|ограбили)|(?<!не\s)(?:обікрали|обокрали|пограбували|ограбили)\s+(?:\S+\s+)?(?:вантажівк|машин|кабін|кабин|фур|причіп|причеп|прицеп|авто|нас|мене|меня))(?![а-яіїєґё])|diebstahl|planenschlitz\S*|(?<![a-zäöüß-])(?:tank|tanks|diesel|kraftstoff|sprit|adblue)\s+(?:\S+\s+){0,3}?(?:leer\s?gesaugt|nachts\s+(?:\S+\s+)?(?:abgepumpt|abgesaugt)|(?:abgepumpt|abgesaugt)\s+(?:\S+\s+)?(?:über|ueber)\s+nacht)|(?<![a-zäöüß-])(?:diesel|kraftstoff|sprit|adblue)\s+(?:fehlt|fehlen)\s+(?:\S+\s+)?(?:im|aus\s+dem)\s+tank(?![a-zäöüß])|(?<![a-zäöüß-])weniger\s+(?:diesel\s+|kraftstoff\s+|sprit\s+)?im\s+tank\s+(?:\S+\s+){0,2}?(?:als\s+abends|als\s+gestern|über\s+nacht|ueber\s+nacht|seit\s+gestern)|(?<![a-z-])(?:fuel|diesel|tank)\s+(?:\S+\s+){0,2}?drained\s+(?:\S+\s+){0,2}?(?:overnight|at\s+night|while\s+parked)|\bdieb|gestohlen|geklaut|entwendet|abgezapft|(?<![a-zäöüß])einbruch|aufgebrochen|theft|stolen|\bsteal|break-in|broken into|burglar|крадіж|в(?:и)?крал|в(?:и)?крад|украл|украд|siphon|(?<![а-яіїєґ])(?:з|с)лил[иао]?\s+(?:\S+\s+)?(?:пальн|палив|дизел|солярк|топлив|бензин)|(?<![a-zäöüß])(?:ladung|ware|paletten?|kartons?)\s+(?:\S+\s+){0,2}?(?:fehl(?:t|en)|weg)(?![a-zäöüß])|(?<![a-z])(?:cargo|load|goods|pallets?)\s+(?:\S+\s+){0,2}?(?:missing|gone)(?![a-z])|(?<![а-яіїєґ])(?:вантаж|груз|товар|палет)\S*\s+(?:\S+\s+){0,2}?(?:немає|нема|зник|пропа|нет(?![а-яіїєґ]))|(?<![а-яіїєґ])(?:немає|нема|нет|зник\S*|пропал\S*)\s+(?:\S+\s+){0,2}?(?:вантаж|груз|товар|палет)`, 'i', 1); // Backlog 630: fehlende Ladung
// Backlog 653 (Blickwinkel „Parkschaden – Unfallgegner unbekannt (Unfallflucht)“): Unfallflucht/Fahrerflucht/Parkschaden in der Beschreibung →
// eigene Schritte (Polizei auch ohne Verletzte, Fahrzeug stehen lassen, Spuren fotografieren, Zeugen/Kameras der Polizei nennen) statt der
// allgemeinen Unfall-Hinweise – reine Information, keine Frist. Dieselben Wortstämme wie die Datenqualität (`src/quality.js` HITRUN_WORDS_*).
// „falsch geparkt“, „Fluchtweg“, „утечка/витік“ (Leck), „bin weitergefahren“ lösen nichts aus
// Backlog 659 (30.10.2026, Blickwinkel „Vandalismus über Nacht – Reifen zerstochen, Graffiti“): mutwillige Beschädigung in der Beschreibung →
// Schritte (rundum prüfen, ob fahrbereit; Anzeige wegen Sachbeschädigung; Fotos vor Reinigung/Reparatur; Ort/Zeitraum/Zeugen) – reine Information,
// keine Frist; nicht zusätzlich zu Diebstahl/Unfallflucht (diese nennen die Anzeige schon). „Plane aufgeschlitzt“ allein (meist Ladungsdiebstahl),
// „zerkratzt beim Rangieren“, „Reifen platt“, „absichtlich langsam gefahren“ lösen nichts aus
const VANDAL_HINT = lbRx(String.raw`(?<![a-zäöüß])vandal|sachbesch(?:ä|ae)digung|mutwillig|(?:absichtlich|vorsätzlich|vorsaetzlich)\s+(?:\S+\s+){0,2}?(?:besch(?:ä|ae)digt|zerkratzt|zerstochen|zerst(?:ö|oe)rt|eingeschlagen|aufgeschlitzt|beschmiert)|graffiti|grafitti|beschmiert|besprayt|bespr(?:ü|ue)ht|zerstochen|aufgestochen|(?:reifen|ventil)\S*\s+(?:\S+\s+){0,3}?(?:aufgeschlitzt|zerschnitten|abgeschraubt|abgedreht)(?![a-zäöüß])|(?<![a-z])(?:slashed|spray-?painted|deliberately\s+damaged|malicious(?:ly)?\s+damaged?|criminal\s+damage)(?![a-z])|вандал|графіт|граффит|графит|навмисн\S*\s+(?:\S+\s+)?пошкод|умышленн\S*\s+(?:\S+\s+)?повред|(?:порізал|прорізал|проткнул|порезал|прорезал)\S*\s+(?:\S+\s+)?(?:шин|колес|колiс|скат)|розмалюв|разрисов`, 'i', 1);
// Backlog 662 (30.10.2026, Blickwinkel „Marder hat Kabel/Schläuche angefressen“): Marder/Nager bzw. angefressene/durchgebissene Kabel oder Schläuche →
// Schritte (Motor aus, ohne Werkzeug nachsehen, bei Kühlmittelverlust/Warnleuchte/durchgebissenem Kabel „nicht fahrbereit“; Fotos, nicht selbst flicken;
// Abstellort notieren) – reine Information, keine Frist. „Bremsscheibe angefressen“ (Rost/Festfressen) und „Kabel defekt“ lösen nichts aus
const MARTEN_HINT = lbRx(String.raw`marder|(?<![a-z])(?:martens?|rodents?)(?![a-z])|chewed\s+(?:\S+\s+){0,3}?(?:cables?|wires?|wiring|hoses?|lines?)|(?:cables?|wires?|wiring|hoses?)\s+(?:\S+\s+){0,2}?(?:chewed|bitten\s+through)|(?<![a-zäöüß])nager(?![a-zäöüß])|angeknabbert|zerbissen|durchgebissen|(?:kabel|leitung|schl(?:ä|ae|a)uch|d(?:ä|ae|a)mmmatte|d(?:ä|ae|a)mmung|isolierung)\S*\s+(?:\S+\s+){0,3}?(?:angefressen|abgebissen|angebissen)|куниц|гризун|грызун|(?:погриз|перегриз|прогриз|погрыз|перегрыз|прогрыз)`, 'i', 1);
// Backlog 665 (30.10.2026, Blickwinkel „Unwetter: Ast/Baum auf dem Lkw, Hagel, Hochwasser auf dem Hof“): Sturm/Unwetter/Hagel/umgestürzter Baum/Hochwasser →
// Schritte (im Wasser gestanden → Motor nicht starten, „nicht fahrbereit“; Baum/Leitungen: Abstand, Feuerwehr; Fotos vor dem Wegräumen; mehrere Fahrzeuge →
// Sammelmeldung der Leitung) – reine Information, keine Frist. „Ansturm“, „Sturmhaube“, „Ast(-)loch“, „Bastelei“, „Wasser im Fahrerhaus“ (Dichtung) lösen nichts aus
const STORM_HINT = lbRx(String.raw`unwetter|orkan|(?<![a-zäöüß])sturm(?:schaden|schäden|schaeden|b(?:ö|oe)e|b(?:ö|oe)en|tief)?(?![a-zäöüß])|(?<![a-zäöüß])hagel(?:schaden|schäden|schaeden|schlag|k(?:ö|oe)rner|sturm)?(?![a-zäöüß])|(?<![a-zäöüß])(?:baum|bäume|baeume|ast|äste|aeste)\s+(?:\S+\s+){0,4}?(?:(?:herunter|runter|drauf|um)?gefallen|gest(?:ü|ue)rzt|umgest(?:ü|ue)rzt|umgekippt|gekracht|abgebrochen)(?![a-zäöüß])|umgest(?:ü|ue)rzte[nrs]?\s+baum|hochwasser|(?:(?:ü|ue)berflutet|(?:ü|ue)berschwemm|starkregen)|(?<![a-z])(?:storms?|stormy|hail(?:storm|stones?)?|flood(?:ed|ing|water|waters)?|fallen\s+(?:tree|branch))(?![a-z])|(?<![a-z])(?:tree|branch)\s+(?:\S+\s+){0,3}?(?:fell|fallen|came\s+down)(?![a-z])|(?<![а-яіїєґ])(?:бур[яіюі]|бурею|шторм|ураган|град(?:ом|у|ини|ина)?|злив[аи])(?![а-яіїєґ])|повін|паводк|паводок|затоплен|затопил|підтопл|подтопл|(?:дерев|гілк|гілл|ветк)\S*\s+(?:\S+\s+){0,3}?(?:впал|упал|звалил|повалил)|(?:впал|упал|повалил)\S*\s+(?:\S+\s+)?(?:дерев|гілк|ветк)|(?<![a-zäöüß-])(?:durch|ins)\s+(?:\S+\s+)?(?:wasser|hochwasser|(?:ü|ue)berflutete\S*|(?:ü|ue)berschwemmte\S*)\s+(?:\S+\s+)?(?:gefahren|durchgefahren)|(?<![a-zäöüß-])wasser\s+(?:\S+\s+)?angesaugt|(?<![a-z])(?:drove|driven|driving)\s+through\s+(?:deep\s+|flood\s+)?(?:water|flood\S*)`, 'i', 1);
// Backlog 668 (30.10.2026, Blickwinkel „Lkw bleibt an Brücke/Unterführung/Tankstellendach hängen – Durchfahrtshöhe“): Anprall an Brücke, Unterführung,
// Parkhaus-/Tankstellendach, Höhenbegrenzung → Schritte (sichern, bei Brücke immer Polizei, Brückenschild; nicht weiterfahren/zurücksetzen solange verkeilt,
// „nicht fahrbereit“; Fremdeigentum → nicht ohne Meldung wegfahren; Fotos mit Höhenschild) – reine Information, keine Frist. „Wechselbrücke“, „Kippbrücke“,
// „Ladebrücke“, „Brückentag“, „Bridgestone“, „задній/ведучий міст“ (Achse) lösen nichts aus
const BRIDGE_HINT = lbRx(String.raw`br(?:ü|ue)ckenanprall|br(?:ü|ue)ckenanfahrschaden|durchfahrtsh(?:ö|oe)he|einfahrtsh(?:ö|oe)he|(?<![a-zäöüß])zu\s+hoch\s+f(?:ü|ue)r\s+(?:die|das|den)\s+(?:\S+\s+)?(?:br(?:ü|ue)cke|unterf(?:ü|ue)hrung|einfahrt|durchfahrt|parkhaus|halle)|(?<![a-zäöüß])(?:(?:eisenbahn|bahn|autobahn|fu(?:ß|ss)g(?:ä|ae)nger|stra(?:ß|ss)en|beton|stahl)?br(?:ü|ue)cke|unterf(?:ü|ue)hrung|parkhaus(?:einfahrt)?|tiefgarage(?:neinfahrt)?|tankstellendach|tankstellen(?:ü|ue)berdachung|(?:ü|ue)berdachung|vordach|h(?:ö|oe)henbegrenzung|h(?:ö|oe)henbalken|torbogen)(?:n|en|s)?(?![a-zäöüß])\s+(?:\S+\s+){0,4}?(?:angefahren|gerammt|touchiert|gestreift|erwischt|mitgenommen|h(?:ä|ae)ngen\s*geblieben|h(?:ä|ae)ngengeblieben|stecken\s*geblieben|steckengeblieben|steckt\s+fest|feststeckt|eingeklemmt|verkeilt|dagegen|zu\s+niedrig|aufgerissen|abgerissen)(?![a-zäöüß])|(?<![a-zäöüß])(?:gegen|unter|in)\s+(?:die|der|das|den|dem|eine|einer|ein|einem)?\s*(?<![a-zäöüß])(?:(?:eisenbahn|bahn|autobahn|fu(?:ß|ss)g(?:ä|ae)nger|stra(?:ß|ss)en|beton|stahl)?br(?:ü|ue)cke|unterf(?:ü|ue)hrung|parkhaus(?:einfahrt)?|tiefgarage(?:neinfahrt)?|tankstellendach|tankstellen(?:ü|ue)berdachung|(?:ü|ue)berdachung|vordach|h(?:ö|oe)henbegrenzung|h(?:ö|oe)henbalken|torbogen)(?:n|en|s)?(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:gefahren|geknallt|gekracht|geprallt|gesto(?:ß|ss)en|gerauscht|geraten)(?![a-zäöüß])|(?<![a-z])(?:bridge\s+strike|low\s+bridge|height\s+(?:barrier|restriction|limit|bar)s?)(?![a-z])|(?<![a-z])(?:hit|struck|scraped|clipped|crashed\s+into|drove\s+into|ran\s+into|went\s+into|stuck\s+under|wedged\s+under|got\s+stuck\s+under)\s+(?:\S+\s+){0,3}?(?:bridge|underpass|overpass|flyover|canopy|car\s+park\s+entrance)(?![a-z])|(?<![a-z])(?:bridge|underpass|overpass|canopy)\s+(?:\S+\s+){0,2}?(?:was\s+|got\s+)?(?:hit|struck|clipped|damaged)(?![a-z])|too\s+(?:tall|high)\s+for\s+the\s+(?:bridge|underpass|entrance|car\s+park)|(?:вріза\S*|зачепи\S*|застряг\S*|вдари\S*|в['’]?їха\S*|въеха\S*|ударил\S*|зацепил\S*|застрял\S*|врезал\S*)\s+(?:\S+\s+){0,3}?(?:(?<!(?:задн|передн|ведуч|задні|передні|задний|передний|ведучий|ведущий)\S*\s+)(?:міст|мосту|мостом|мості|мост|моста|мосте)(?![а-яіїєґ])|шляхопровід|шляхопровод|путепровод|естакад|эстакад|навіс\S*\s+(?:азс|заправ)|навес\S*\s+(?:азс|заправ))|(?:обмежен|ограничен)\S*\s+(?:\S+\s+)?(?:висот|высот)|(?:під|под)\s+(?:мостом|мост|шляхопровод\S*|путепровод\S*)\s+(?:\S+\s+)?(?:застряг|застрял|зачепи|зацепи)`, 'i', 1);
// Backlog 671 (30.10.2026, Blickwinkel „Lkw steht nicht mehr da – vom Ordnungsamt/der Polizei abgeschleppt, umgesetzt oder mit Parkkralle“): behördliches
// Abschleppen/Umsetzen, Verwahrplatz, Park-/Radkralle → Schritte (erst bei der Polizei nachfragen, sonst wie Diebstahl; Kralle nicht selbst entfernen,
// Zettel/Bescheid fotografieren; Abholung/Bezahlung nur nach Absprache, Fahrzeug bei Abholung rundum prüfen) – reine Information, keine Frist, keine Kosten.
// Abschleppen nach Panne („in die Werkstatt abgeschleppt“), „Schlauchschelle“/„hose clamp“, „Ladung umgesetzt“ lösen nichts aus
const TOW_HINT = lbRx(String.raw`(?<![a-zäöüß])(?:verwahr(?:platz|stelle|gelände|gelaende|hof)|abschlepphof|park(?:kralle)|radkralle|reifenkralle)(?![a-zäöüß])|(?<![a-zäöüß])(?:ordnungsamt|polizei|stadt|beh(?:ö|oe)rde|gemeinde|kommune|politie|police)\S*\s+(?:\S+\s+){0,5}?(?:abgeschleppt|weggeschleppt|umgesetzt|abschleppen\s+lassen|kralle)(?![a-zäöüß])|(?<![a-zäöüß])(?:abgeschleppt|weggeschleppt|umgesetzt)\s+(?:\S+\s+){0,5}?(?:ordnungsamt|polizei|beh(?:ö|oe)rde|halteverbot|parkverbot|verwahr)|(?<![a-zäöüß])(?:im|aus\s+dem|wegen)\s+(?:absoluten\s+)?(?:halte|park)verbot(?:s)?\s+(?:\S+\s+){0,3}?(?:abgeschleppt|weggeschleppt|umgesetzt)|(?<![a-z])(?:impound(?:ed)?|wheel[\s-]+clamp(?:ed)?|clamped|(?:police|council|authorities|city)\s+(?:\S+\s+){0,3}?towed|towed\s+(?:away\s+)?by\s+(?:the\s+)?(?:police|council|authorities|city)|towed\s+(?:away\s+)?from\s+(?:a\s+|the\s+)?no[\s-]+parking)(?![a-z])|штрафмайданчик|штраф\S*\s+(?:майданчик|стоянк)|штрафстоянк|(?:поліці|полиці|полиц|муніципал)\S*\s+(?:\S+\s+){0,3}?(?:евакуювал|эвакуировал|забрал|забрала|забрали|евакуатор)\S*|(?:блокуван|блокиратор|блокувальник)\S*\s+(?:\S+\s+)?колес`, 'i', 1);
// Backlog 674 (30.10.2026, Blickwinkel „Personen im Laderaum entdeckt – blinde Passagiere am Rastplatz/Hafen“): versteckte Personen im Auflieger/
// Laderaum → Schritte (nicht allein öffnen, Polizei, bei Lebensgefahr 112; nicht weiterbewegen, Siegel/Plane nicht verändern; letzte Kontrolle/Abstellort,
// Fotos nur ohne Gefahr; Leitung) – reine Information, keine Frist. „Klopfen/Geräusche im Anhänger“, „Ladung verrutscht“, „Personen verletzt“ lösen nichts aus
const STOW_HINT = lbRx(String.raw`blinde[nr]?\s+passagier|(?<![a-zäöüß])(?:personen|menschen|leute|migranten|fl(?:ü|ue)chtlinge|jemand)\s+(?:\S+\s+){0,3}?(?:im|in\s+(?:der|dem|den)|unter\s+(?:der|dem)|zwischen\s+der)\s+(?:\S+\s+)?(?:laderaum|ladefl(?:ä|ae)che|auflieger|anh(?:ä|ae)nger|k(?:ü|ue)hlauflieger|koffer(?:aufbau)?|container|aufbau|plane|ladung)(?![a-zäöüß])|(?<![a-zäöüß])(?:personen|menschen|leute|migranten|fl(?:ü|ue)chtlinge|jemand)\s+(?:\S+\s+){0,4}?(?:versteckt|eingestiegen|reingeklettert|hineingeklettert|rausgesprungen|herausgesprungen|herausgekommen)(?![a-zäöüß])|versteckte\s+(?:personen|menschen)|(?<![a-z])(?:stowaways?|clandestines?|clandestine\s+entrants?)(?![a-z])|(?<![a-z])(?:people|persons|migrants|someone|somebody|refugees)\s+(?:\S+\s+){0,3}?(?:hiding|hidden|found|inside|climbed\s+into|got\s+into)\s+(?:\S+\s+){0,3}?(?:trailer|load|lorry|truck|container|cargo|curtain)|(?<![а-яіїєґ])(?:люди|людей|мігрант\S*|мигрант\S*|біженц\S*|беженц\S*|нелегал\S*)\s+(?:\S+\s+){0,3}?(?:в|у|під|под)\s+(?:\S+\s+)?(?:причеп\S*|причіп\S*|напівпричеп\S*|полуприцеп\S*|прицеп\S*|кузов\S*|вантаж\S*|груз\S*|контейнер\S*)|(?:сховал\S*|спрятал\S*|ховал\S*|прятал\S*)\s+(?:\S+\s+){0,3}?(?:в|у|під|под)\s+(?:\S+\s+)?(?:причеп\S*|причіп\S*|напівпричеп\S*|полуприцеп\S*|прицеп\S*|кузов\S*|вантаж\S*|груз\S*|контейнер\S*)`, 'i', 1);
// [CLAUDE] Backlog 678 (30.10.2026, Blickwinkel „Eis/Schnee auf dem Aufliegerdach“): Eis/Schnee auf dem Dach von Lkw/Auflieger/Plane bzw. Eisplatte →
// Schritte (nicht so losfahren, nicht ungesichert aufs Dach, Räumanlage/Leitung fragen, sonst „nicht fahrbereit“; hat sich etwas gelöst und getroffen → anhalten,
// Polizei, bei Verletzten 112; Leitung) – reine Information, keine Frist. „Schnee auf der Straße“, „Frontscheibe vereist“, „Eis im Laderaum“, „Dachluke undicht“ nicht.
const ROOFICE_HINT = lbRx(String.raw`(?<![a-zäöüß])(?:eis(?:platten?|schicht|brocken|schollen?|st(?:ü|ue)cke?|panzer)?|schnee(?:schicht|last|brett|haufen|massen|decke)?)(?![a-zäöüß])\s+(?:\S+\s+){0,4}?(?:auf|vom|von|am)\s+(?:\S+\s+){0,2}?(?:(?:auflieger|anh(?:ä|ae)nger|planen|koffer|kabinen|fahrerhaus|lkw|container)?dach|aufliegerdach|plane|planendach|auflieger|anh(?:ä|ae)nger|aufbau|koffer)(?:es|s)?(?![a-zäöüß])|(?<![a-zäöüß])(?:(?:auflieger|anh(?:ä|ae)nger|planen|koffer|kabinen|fahrerhaus|lkw|container)?dach|plane)(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:vereist|zugefroren|eingeschneit|schneebedeckt|voller\s+(?:eis|schnee)|voll\s+(?:eis|schnee)|mit\s+(?:\S+\s+)?(?:eis|schnee))(?![a-zäöüß])|(?<![a-zäöüß])(?:dacheis|dachschnee|eisplatten?)(?![a-zäöüß])|(?<![a-z])(?:ice|snow)(?:\s+(?:sheets?|slabs?|chunks?|layer|load))?\s+(?:\S+\s+){0,4}?(?:on|off|from)\s+(?:the\s+)?(?:\S+\s+)?(?:roof|top|tarp|tarpaulin|curtain)(?![a-z])|(?<![a-z])roof\s+(?:\S+\s+){0,2}?(?:covered|full|caked)\s+(?:with|of|in)\s+(?:ice|snow)|(?<![a-z])(?:icy|frozen|snow-covered|snowy)\s+(?:\S+\s+)?roof(?![a-z])|(?<![а-яіїєґё])(?:лід|льоду|лед|льда|крижан\S*|крижин\S*|льдин\S*|наледь|сніг\S*|снег\S*)\s+(?:\S+\s+){0,3}?(?:на|з|із|зі|с|со)\s+(?:\S+\s+)?(?:дах\S*|крыш\S*|тент\S*)|(?<![а-яіїєґё])(?:дах\S*|крыш\S*|тент\S*)\s+(?:\S+\s+){0,3}?(?:в|у|під|под)\s+(?:сніг\S*|снег\S*|льод\S*|льд\S*|лід|лед)|(?<![а-яіїєґё])(?:дах\S*|крыш\S*|тент\S*)\s+(?:\S+\s+){0,2}?(?:обмерз\S*|обледен\S*|замерз\S*|засипан\S*|засыпан\S*)`, 'i', 1);
const HITRUN_HINT = lbRx(String.raw`fahrerflucht|unfallflucht|parkschaden|(?<![a-zäöüß])verursacher\S*\s+(?:\S+\s+){0,2}?(?:unbekannt|abgehauen|weggefahren|gefl(?:ü|ue)chtet|geflohen)(?![a-zäöüß])|(?<![a-zäöüß])(?:angefahren|touchiert|gerammt|gestreift|zerkratzt|eingedellt|besch(?:ä|ae)digt)[,;]?\s+(?:\S+\s+){0,6}?(?:abgehauen|davongefahren|gefl(?:ü|ue)chtet|geflohen|ohne\s+(?:anzuhalten|sich\s+zu\s+melden|(?:einen\s+)?zettel|(?:eine\s+)?nachricht))(?![a-zäöüß])|hit[\s-]+and[\s-]+run|(?:fled|left)\s+the\s+scene|(?:drove|driven|took)\s+off\s+without\s+(?:stopping|leaving)|(?:damaged|hit|struck|scraped|dented)\s+(?:\S+\s+){0,2}?while\s+parked|(?<![а-яіїєґ])(?:втік|втекл|втеч[аіуе]|скрылс|скрылась|скрылись)|(?:поїхав|поїхала|поїхали|уехал\S*|зник\S*|исчез\S*)\s+з?с?\s*(?:місця|места)\s+(?:дтп|аварії|аварии|пригоди|происшествия)`, 'i', 1);
// Backlog 291 (Blickwinkel „Steinschlag in der Windschutzscheibe“): Glasschaden in der Beschreibung → Hinweise (Fotos mit Größenvergleich,
// Lage im Sichtfeld, Weiterfahrt klären, früh melden). „Bremsscheibe“, „Scheibenwischer“, „Spiegel“ lösen nichts aus; reine Information, keine Frist
const GLASS_HINT = lbRx(String.raw`(?:(?<![а-яіїєґё])(?:скол|тріщин\S*|трещин\S*)\s+(?:\S+\s+)?на\s+лобов\S*|(?<![а-яіїєґё])лобов\S*\s+(?:\S+\s+)?(?:тріснул\S*|трісн\S*|треснул\S*|розбит\S*|разбит\S*|пошкоджен\S*))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|windschutzscheibe(?!\S*\s+(?:\S+\s+)?(?:wischer|scheibenwischer|wischwasser|waschanlage|wasserd(?:ü|ue)sen?|beschlagen|wipers?|washers?|wiper\s+blades?|fogg?ed|fogging|misted|misting|steamed\s+up)(?![a-zäöüß]))|frontscheibe(?!\S*\s+(?:\S+\s+)?(?:wischer|scheibenwischer|wischwasser|waschanlage|wasserd(?:ü|ue)sen?|beschlagen|wipers?|washers?|wiper\s+blades?|fogg?ed|fogging|misted|misting|steamed\s+up)(?![a-zäöüß]))|seitenscheibe(?!n?\s+(?:geht|gehen|l(?:ä|ae|a)sst|f(?:ä|ae|a)hrt|schlie(?:ß|ss)t|bleibt|rutscht|kommt)\s)|heckscheibe|steinschlag|glasbruch|glasschaden|(?<![a-zäöüß])(?<!brems[\s-]?)scheibe\s+(?:\S+\s+){0,3}?(?:gerissen|gesprungen|eingeschlagen|kaputt|gebrochen|(?:einen\s+)?riss|(?:einen\s+|ein\s+)?(?:stern|sternchen|sprung)(?![a-zäöüß]))|(?:riss|stern|sternchen|sprung)\s+in\s+der\s+(?:\S+\s+)?scheibe(?![a-zäöüß])|windshield(?!\S*\s+(?:\S+\s+)?(?:wischer|scheibenwischer|wischwasser|waschanlage|wasserd(?:ü|ue)sen?|beschlagen|wipers?|washers?|wiper\s+blades?|fogg?ed|fogging|misted|misting|steamed\s+up)(?![a-zäöüß]))|windscreen(?!\S*\s+(?:\S+\s+)?(?:wischer|scheibenwischer|wischwasser|waschanlage|wasserd(?:ü|ue)sen?|beschlagen|wipers?|washers?|wiper\s+blades?|fogg?ed|fogging|misted|misting|steamed\s+up)(?![a-zäöüß]))|(?:stone|rock)\s+chip|(?:cracked|broken|smashed|chipped)\s+(?:side\s+)?(?:window|glass)|(?<!mirror\s)(?:window|glass)\s+(?:is\s+)?(?:cracked|broken|smashed|chipped)|лобов\S*\s+(?:скл|стекл)|скл[оаіу]\S*\s+(?:\S+\s+)?(?:тріснул|розбит|пошкоджен)|стекл\S*\s+(?:\S+\s+)?(?:треснул|разбит)|(?:тріщин|трещин|скол)\S*\s+(?:\S+\s+)?(?:на\s+)?(?:скл|стекл)|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?:бокове|бічне|заднє|боковое|заднее)\s+(?:скло|стекло)\s+(?:\S+\s+)?(?:розбил\S*|разбил\S*|розбит\S*|разбит\S*|вибил\S*|выбил\S*|трісну\S*|тресну\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?:розбил\S*|разбил\S*|вибил\S*|выбил\S*)\s+(?:\S+\s+)?(?:бокове|бічне|заднє|боковое|заднее)\s+(?:скло|стекло)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))`, 'i', 1);
// Backlog 293 (Blickwinkel „Wildunfall nachts auf der Landstraße“): Wildunfall → eigene Schritte (sichern, Polizei auch ohne Verletzte,
// Wildunfallbescheinigung, Tier nicht mitnehmen) statt der allgemeinen Unfall-Hinweise; „Drehzahl“, „Dashboard“, „солений“ lösen nichts aus
const WILD_HINT = lbRx(String.raw`wildunfall|wildwechsel|wildschwein|(?<![a-zäöüß])(?:reh|rehe|rehbock|hirsch|wild|fuchs|dachs)(?![a-zäöüß])|\bdeer\b|\bboars?\b|\bmoose\b|\belk\b|animal\s+(?:collision|strike)|hit\s+an?\s+animal|(?<![а-яіїєґ])(?:косул|олен|кабан|лос[ьяюе](?:м)?(?![а-яіїєґ])|дик\S*\s+(?:твар|живот))`, 'i', 1);
// Backlog 294 (Blickwinkel „Fahrer verliert unterwegs Fahrzeugschlüssel oder Fahrzeugschein“): Hinweise (Fahrzeug sichern, Leitung/Disposition
// anrufen statt eigenmächtig Schlüsseldienst, Zulassungsbescheinigung Teil I mitführen, Diebstahlverdacht → Polizei) – reine Information, keine Frist.
// „Schraubenschlüssel“/„Drehmomentschlüssel“, „Frachtpapiere“, „Papierrolle“, „keyboard“ lösen nichts aus
const LOST_HINT = lbRx(String.raw`(?<![a-zäöüß])(?:(?:fahrzeug|lkw|auto|wagen|ersatz)?schl(?:ü|ue|u)ssel\S*|fahrzeugschein|zulassungsbescheinigung|fahrzeugpapiere|papiere)\s+(?:\S+\s+){0,4}?(?:verloren|verlegt|weg(?![a-zäöüß])|fehl(?:t|en)(?![a-zäöüß])|vergessen|abhanden|liegen\s*gelassen|eingeschlossen|nicht\s+(?:mehr\s+)?(?:auffindbar|auffinden|da|gefunden|zu\s+finden))|(?:verloren|verlegt|vergessen|eingeschlossen|finde)\S*\s+(?:\S+\s+){0,3}?(?:schl(?:ü|ue|u)ssel|fahrzeugschein|zulassungsbescheinigung|fahrzeugpapiere)|schl(?:ü|ue|u)sselverlust|(?:lost|misplaced|can['’]?t\s+find|cannot\s+find|locked)\s+(?:\S+\s+){0,2}?(?:keys?|registration|vehicle\s+documents|vehicle\s+papers)\b|\b(?:keys?|registration\s+(?:certificate|document)s?|vehicle\s+(?:documents|papers))\s+(?:\S+\s+){0,3}?(?:lost|missing|gone|locked\s+in)\b|(?<![а-яіїєґ])(?:ключ\S*|техпаспорт\S*|свідоцтв\S*\s+про\s+реєстрац\S*)\s+(?:\S+\s+){0,3}?(?:загуб|втрат|зник|забу|потер|пропа|нема|не\s+можу\s+знайти|не\s+могу\s+найти)|(?:загуби|загуба|втрати|забу|забы|потеря|потерял)\S*\s+(?:\S+\s+){0,3}?(?:ключ|техпаспорт|свідоцтв)|(?<![a-zäöüß-])(?:schl(?:ü|ue)ssel)\s+(?:\S+\s+){0,4}?(?:eingeschlossen|eingesperrt|weggeschlossen)|(?<![a-zäöüß-])(?:mich|uns)?\s*ausgesperrt(?![a-zäöüß])|(?<![a-z])(?:keys?\s+(?:\S+\s+){0,3}?locked\s+(?:in|inside)|locked\s+(?:myself\s+)?out)(?![a-z])|(?<![a-zäöüß-])(?:abgeschlossen|zugefallen|zugesperrt|verriegelt),?\s+(?:\S+\s+){0,3}?schl(?:ü|ue)ssel,?\s+(?:\S+\s+)?(?:drin|drinnen|innen|steckt|liegt\s+(?:\S+\s+)?(?:drin|im\s+(?:lkw|fahrerhaus|f(?:ü|ue)hrerhaus)))(?![a-zäöüß])|(?<![a-zäöüß-])schl(?:ü|ue)ssel\s+(?:\S+\s+){0,2}?(?:drin|drinnen|steckt\s+innen)\s+(?:\S+\s+){0,3}?(?:abgeschlossen|zugefallen|zugesperrt|verriegelt)(?![a-zäöüß])|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|found|gefunden|знайшли|нашли|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-z-])(?:vehicle\s+)?registration\s+(?:document|certificate|papers?|card)?\s*(?:is\s+|was\s+)?(?:missing|lost|gone|not\s+(?:in\s+the\s+(?:truck|cab|vehicle)|there))(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|found|gefunden|знайшли|нашли|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|found|gefunden|знайшли|нашли|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?:свідоцтв\S*\s+(?:про\s+)?реєстраці\S*|свидетельств\S*\s+(?:о\s+)?регистраци\S*)\s+(?:\S+\s+)?(?:загуби\S*|втрати\S*|потеря\S*|нема\S*|немає|відсутн\S*|отсутств\S*|пропа\S*|зник\S*)|(?<![а-яіїєґё])(?:загуби\S*|втрати\S*|потеря\S*|нема\S*|немає|відсутн\S*|отсутств\S*)\s+(?:\S+\s+)?(?:свідоцтв\S*\s+(?:про\s+)?реєстраці\S*|свидетельств\S*\s+(?:о\s+)?регистраци\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|found|gefunden|знайшли|нашли|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))`, 'i', 1);
// Backlog 296 (Blickwinkel „Reifenpanne auf der Autobahn“): Reifenpanne/-platzer → Hinweise (sicher anhalten, Warnblinker/Warnweste/
// Warndreieck, hinter die Leitplanke, nicht selbst auf dem Seitenstreifen wechseln – Leitung/Disposition veranlasst Reifen- bzw. Pannendienst,
// Standort und Reifenposition notieren + Foto, „nicht fahrbereit“) – reine Information, keine Frist, keine Entfernungsangabe.
// „Batterie platt“, „Reifendruck prüfen“, „Reifen abgefahren“, „Bodenplatte“, „flatbed“ lösen nichts aus
// Backlog 580 (Blickwinkel „Diktat/Tippfehler“): vorn ergänzt – Schreibweisen ohne Umlaut, getrennt geschrieben, Tippfehler, Umschrift
const FLAT_HINT = lbRx(String.raw`(?<![a-zäöüß-])keine\s+luft\s+(?:mehr\s+)?(?:im|in\s+dem|auf\s+dem)\s+(?:\S+\s+)?reifen(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung|da)|fixed|repaired|replaced))|reifen[sn]?\s+(?:\S+\s+){0,3}?(?:plat(?![a-zäöüß])|schlaff(?![a-zäöüß])|kaput(?![a-zäöüß])|geplatz|geplazt|(?:keine?|ohne)\s+luft|luft\s+(?:ist\s+)?(?:raus|weg))|(?:hab\S*|hat)\s+(?:\S+\s+)?(?:einen|['’]?nen|['’]?n)\s+platten|(?<![a-zäöüß])reifen[sn]?\s+hat\s+platten|(?<![a-zäöüß])platten\s+(?:am|an\s+der|hinten|vorne?|links|rechts)(?![a-zäöüß])|(?<![a-z])(?:koleso|kolesa|shina)\s+(?:\S+\s+)?(?:probit|spust|lopnu)\S*|reifenpanne|reifenplatzer|plattfu(?:ß|ss)|(?<![a-zäöüß])(?:platte[rmn]?|geplatzte[rmn]?)\s+(?:\S+\s+)?reifen|reifen[sn]?\s+(?:\S+\s+){0,3}?(?:platt(?![a-zäöüß])|geplatzt|zerfetzt|explodiert|kaputt|defekt|aufgeschlitzt|eingeschnitten)|(?<![a-zäöüß])reifen[sn]?\s+(?:\S+\s+){0,3}?(?:durch|wegen|von)\s+(?:\S+\s+){1,3}?platt(?![a-zäöüß])|flat\s+(?:tyre|tire)|(?:tyre|tire)s?\s+(?:\S+\s+){0,2}?(?:burst|blew|blown|exploded|flat(?![a-z]))|blow-?out|punctur|(?:пробив|пробила|пробили|пробило|пробил|проколов|прокололо|проколол|проколола|спустил[оаи]?|спустив|лопнул[аои]?|лопнув)\s+(?:\S+\s+){0,2}?(?:колес|шин)|(?:колес|шин)\S*\s+(?:\S+\s+){0,2}?(?:лопнул|лопнув|пробит|спущен|спустил|розірв|порвал)|прокол\S*\s+(?:\S+\s+)?(?:колес|шин)|(?<![а-яіїєґё])пробит[аоіи]?\s+(?:\S+\s+)?(?:колес|шин)`, 'i', 1);
// Backlog 297 (Blickwinkel „Ladungssicherung bei Polizeikontrolle bemängelt“): Beanstandung bei einer Straßenkontrolle → Hinweise
// (Anordnungen befolgen, Leitung/Disposition anrufen, Mängelbericht/Verwarnung fotografieren, Anhörungsbogen/Bußgeldbescheid an die Leitung,
// „nicht fahrbereit“ solange die Weiterfahrt untersagt ist) – reine Information, keine Frist, kein Betrag. „Abfahrtskontrolle: Licht bemängelt“,
// „22,5 Zoll“, „Bag“ im Wort, „Öl kontrolliert“,
// „Polizei hat Anzeige/Unfall aufgenommen“, „Поліція склала протокол ДТП“ lösen nichts aus
const ROADCHK_HINT = lbRx(String.raw`(?:(?<![a-z])(?:police|roadside\s+(?:check|inspection)|dvsa|bag|balm)\S*\s+(?:\S+\s+){0,6}?(?:defects?|faults?)\s+(?:were\s+)?(?:found|noted|recorded)|(?<![a-z])(?:police|roadside\s+(?:check|inspection)|dvsa|bag|balm)\S*\s+(?:\S+\s+){0,3}?found\s+(?:\S+\s+){0,2}?(?:defects?|faults?)|(?<![а-яіїєґё])(?:поліці\S*|поліц\S*|полиц\S*|bag\S*|balm\S*|дорожн\S*\s+контрол\S*)\s+(?:\S+\s+){0,8}?(?:недолік\S*|несправн\S*|неисправн\S*|недостат\S*|замечан\S*|зауважен\S*))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![a-zäöüß])(?:polizei\S*|bag(?![a-zäöüß])\S*|balm(?![a-zäöüß])\S*|verkehrskontrolle|stra(?:ß|ss)enkontrolle|zollkontrolle|kontrolle\s+(?:durch|von|der)\s+(?:die\s+|der\s+|dem\s+)?(?:polizei|bag|balm))\s+(?:\S+\s+){0,8}?(?:bem(?:ä|ae|a)ngelt|beanstandet|m(?:ä|ae|a)ngelbericht|(?<!(?:ohne|keine|keinerlei)\s+)m(?:ä|ae|a)ngel(?![a-zäöüß])|verwarn|bußgeld|bussgeld|weiterfahrt|stillgelegt|stilllegung|untersagt|festgehalten|plakette|entstempel)|weiterfahrt\s+(?:\S+\s+){0,2}?(?:untersagt|verboten)|m(?:ä|ae|a)ngelbericht|ladungssicherung\S*\s+(?:\S+\s+){0,3}?(?:bem(?:ä|ae|a)ngelt|beanstandet)|(?:bem(?:ä|ae|a)ngelt|beanstandet)\S*\s+(?:\S+\s+){0,3}?ladungssicherung|(?<![a-z])(?:police|roadside\s+(?:check|inspection)|dvsa|bag(?![a-z])|balm)\S*\s+(?:\S+\s+){0,8}?(?:fined|fine|ticket|defect\s+notice|prohibit|not\s+allowed\s+to\s+(?:drive|continue)|flagged|grounded|impounded|immobili[sz]ed|out\s+of\s+service|failed\s+(?:the\s+)?(?:inspection|check))|prohibition\s+notice|load\s+securing\s+(?:\S+\s+){0,2}?(?:criticised|criticized|objected)|(?:поліці|поліц|полиц|контрол)\S*\s+(?:\S+\s+){0,8}?(?:о?штраф|заборон|запрет|кріплення\s+вантаж|крепление\s+груз)|(?<![a-zäöüß])(?:(?:wir|ich)\s+(?:wurden|wurde|sind|bin)\s+(?:\S+\s+){0,3}?(?:kontrolliert|angehalten)|(?:wurden|wurde)\s+(?:wir|ich)\s+(?:\S+\s+){0,3}?(?:kontrolliert|angehalten)|(?:raus|heraus)(?:gezogen|gewunken)|rausgeholt)\S*\s+(?:\S+\s+){0,8}?(?:bem(?:ä|ae|a)ngelt|beanstandet|verwarn|bußgeld|bussgeld|weiterfahrt|stillgelegt|untersagt|festgehalten)|(?<![a-zäöüß])kontrolle\s+(?:(?:auf|an)\s+(?:der|dem)|am|an)\s+(?:a\s?\d+|autobahn|bundesstra(?:ß|ss)e|b\s?\d+|rast\S*|parkplatz|grenze)\S*\s+(?:\S+\s+){0,8}?(?:bem(?:ä|ae|a)ngelt|beanstandet|verwarn|bußgeld|bussgeld|weiterfahrt|stillgelegt|untersagt|festgehalten)|(?<![\d,.]\s?)(?<![a-zäöüß])zoll(?:beamt\S*)?(?![a-zäöüß])\s+(?:\S+\s+){0,8}?(?:bem(?:ä|ae|a)ngelt|beanstandet|verwarn|bußgeld|bussgeld|weiterfahrt|stillgelegt|untersagt|festgehalten)|(?:grounded|impounded|immobili[sz]ed)\s+(?:\S+\s+){0,2}?by\s+(?:the\s+)?(?:police|dvsa|balm|bag)`, 'i', 1);
// Backlog 298 (Blickwinkel „Lkw springt morgens bei Kälte nicht an“): Startprobleme/leere Batterie → Hinweise (nicht dauerhaft weiter
// starten, Starthilfe nur unterwiesen und nur von gleicher Bordspannung – sonst Leitung/Disposition, Beobachtung + Foto vom Display, Kühlware/
// Liefertermin am Telefon nennen, „nicht fahrbereit“) – reine Information, keine Frist, keine Volt-/Zeitangabe. „Navi startet nicht“, „App startet
// nicht“, „Standheizung startet nicht“, „Handy-Akku leer“, „додаток не запускається“ lösen nichts aus
// Backlog 352: auch Zündschloss/Lenkradschloss klemmt („Schlüssel klemmt im Zündschloss“, „Zündschloss defekt“, „key stuck in the ignition“, „замок запалювання заклинило“)
const NOSTART_HINT = lbRx(String.raw`(?<![a-zäöüß-])(?<!(?:kein|keine|ohne)\s)wegfahrsperre(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|freigeschaltet|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung|frei)|fixed|repaired|replaced|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))|(?<![a-z-])immobili[sz]er(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|freigeschaltet|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung|frei)|fixed|repaired|replaced|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))|(?<![а-яіїєґё])(?:іммобілайзер|иммобилайзер)\S*|(?<!(?:stand|park)?(?:heizung|klima(?:anlage|ger(?:ä|ae)t)?|k(?:ü|ue)hl(?:aggregat|maschine|ger(?:ä|ae)t|ung)|aggregat|reefer|thermo\s?king|carrier)(?:es|s)?\s+(?:\S+\s+){0,2})springt\s+(?:\S+\s+){0,2}?nicht\s+(?:mehr\s+)?an(?![a-zäöüß])|(?:motor|lkw|fahrzeug|wagen|zugmaschine|sattelzug)\s+(?:\S+\s+){0,2}?(?:startet|startete)\s+nicht|(?<!(?:stand|park)?(?:heizung|klima(?:anlage|ger(?:ä|ae)t)?|k(?:ü|ue)hl(?:aggregat|maschine|ger(?:ä|ae)t|ung)|aggregat|reefer|thermo\s?king|carrier)(?:es|s)?\s+(?:\S+\s+){0,2})l(?:ä|ae|a)sst\s+sich\s+nicht\s+(?:mehr\s+)?starten|anlasser\s+(?:\S+\s+){0,2}?(?:dreht|macht|klackt)\s+nicht|anlasser\s+(?:\S+\s+){0,2}?(?:defekt|kaputt|ausgefallen|geht\s+nicht|funktioniert\s+nicht)|batterie\S*\s+(?:(?!nicht\s|kein\S*\s)\S+\s+){0,3}?(?:leer|platt|tot|kaputt|defekt|schwach)(?![a-zäöüß])|batterie\S*\s+(?:(?:ist|sind|war|waren|wieder|komplett|v(?:ö|oe)llig|ganz|total|(?:ü|ue)ber\s+nacht)\s+){0,2}(?:tief)?entladen(?![a-zäöüß])|starthilfe|(?<![a-z])(?:engine|truck|lorry|vehicle|it)\s+(?:won['’]?t|will\s+not|does\s*n[o']?t|did\s*n[o']?t|cannot|can['’]?t)\s+start|(?:flat|dead|weak)\s+battery|battery\s+(?:(?!not\s|isn['’]?t\s)\S+\s+){0,2}?(?:flat|dead|weak)(?![a-z])|jump[- ]?start|не\s+заводит|(?:двигун|мотор|машин|вантажівк|тягач|грузовик)\S*\s+(?:\S+\s+)?не\s+запуска|акумулятор\S*\s+(?:\S+\s+){0,2}?(?:розряд|сів|сіла|слаб)|аккумулятор\S*\s+(?:\S+\s+){0,2}?(?:разряж|сел|слаб)|(?:сів|сел|слабк\S*|слаб(?:ый|ий))\s+(?:акумулятор|аккумулятор)|(?:розрядив|разрядил)\S*\s+(?:\S+\s+)?(?:акумулятор|аккумулятор)|(?<![a-zäöüß-])(?:z(?:ü|ue|u)ndschloss|z(?:ü|ue|u)ndschl(?:ö|oe|o)sser|lenkradschloss|lenkradsperre)\S*\s+(?:\S+\s+){0,3}?(?:defekt|kaputt|klemmt|blockiert|geht\s+nicht|gehen\s+nicht|dreht\s+(?:sich\s+)?nicht|l(?:ä|ae|a)sst\s+sich\s+nicht\s+(?:mehr\s+)?drehen|rastet\s+nicht)|(?<![a-zäöüß-])schl(?:ü|ue|u)ssel\s+(?:\S+\s+){0,4}?(?:im|ins|in\s+(?:das|der|dem))\s+(?:z(?:ü|ue|u)ndschloss|z(?:ü|ue|u)ndung|lenkradschloss)|(?<![a-zäöüß-])schl(?:ü|ue|u)ssel\s+(?:\S+\s+){0,2}?(?:klemmt|steckt\s+fest|dreht\s+(?:sich\s+)?nicht|l(?:ä|ae|a)sst\s+sich\s+nicht\s+(?:mehr\s+)?drehen)\s+(?:\S+\s+)?(?:im|in\s+der)\s+(?:z(?:ü|ue|u)ndschloss|z(?:ü|ue|u)ndung|lenkradschloss)|(?<![a-z-])(?:ignition(?:\s+(?:lock|switch|barrel))?|steering\s+lock)\s+(?:\S+\s+){0,2}?(?:stuck|jammed|broken|faulty|not\s+working|won['’]?t\s+turn|doesn['’]?t\s+turn|locked)(?![a-z])|(?<![a-z-])key\s+(?:\S+\s+){0,2}?(?:stuck|jammed|won['’]?t\s+turn|doesn['’]?t\s+turn|will\s+not\s+turn)\s+(?:\S+\s+)?in\s+(?:the\s+)?ignition|(?<![а-яіїєґ])(?:замок|замка|замку)\s+(?:запалюван|зажиган)\S*\s+(?:\S+\s+){0,2}?(?:не\s+працю\S*|не\s+работа\S*|заклин\S*|злама[вл]\S*|сломал\S*|не\s+поверта\S*|не\s+повора\S*)|(?<![а-яіїєґ])ключ\S*\s+(?:\S+\s+){0,3}?(?:в|у)\s+(?:замку\s+)?(?:запалюван|зажиган)\S*|(?<!(?:stand|park)?(?:heizung|klima(?:anlage|ger(?:ä|ae)t)?|k(?:ü|ue)hl(?:aggregat|maschine|ger(?:ä|ae)t|ung)|aggregat|reefer|thermo\s?king|carrier)(?:es|s)?\s+(?:\S+\s+){0,2})(?<![a-zäöüß-])(?:springt|startet|springen|starten)\s+(?:\S+\s+){0,2}?(?:schlecht|schwer|nur\s+schwer|erst\s+nach\s+(?:\S+\s+){0,2}?versuch\S*)\s*(?:an(?![a-zäöüß]))?|(?<![a-z])(?:hard|difficult)\s+to\s+start|(?<![a-z])(?:starts|starting)\s+(?:very\s+)?(?:badly|poorly)|(?:^|[.;!,:]\s*)(?:won['’]?t|will\s+not|does\s*n['’]?t|doesn['’]?t)\s+start(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?<![a-zäöüß-])z(?:ü|ue|u)ndschl(?:ü|ue|u)ssel\s+(?:\S+\s+){0,2}?(?:steckt\s+(?:\S+\s+)?fest|klemmt|l(?:ä|ae|a)(?:ss|ß)t\s+sich\s+nicht\s+(?:mehr\s+)?(?:drehen|abziehen|rausziehen|herausziehen)|geht\s+nicht\s+(?:mehr\s+)?(?:raus|heraus))(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|found|gefunden|знайшли|нашли|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-z-])starter(?:\s+motor)?\s+(?:\S+\s+)?(?:not\s+turning|won['’]?t\s+turn|doesn['’]?t\s+turn|just\s+clicks|only\s+clicks|clicking|broken|faulty|failed|dead|not\s+working|doesn['’]?t\s+work|isn['’]?t\s+working)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|found|gefunden|знайшли|нашли|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|found|gefunden|знайшли|нашли|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])стартер\S*\s+(?:\S+\s+)?(?:не\s+крути\S*|не\s+крутит|тільки\s+клаца\S*|только\s+щелка\S*|клаца\S*|щелка\S*|злама[внл]\S*|сломал\S*|сломан\S*|несправн\S*|неисправ\S*|не\s+працю\S*|не\s+работа\S*|вийшов\s+з\s+ладу|вышел\s+из\s+строя)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|found|gefunden|знайшли|нашли|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?:(?<![a-zäöüß])orgel(?:t|n)(?![a-zäöüß])|(?<![a-zäöüß])(?:will|wollte|mag)\s+nicht\s+(?:mehr\s+)?(?:anspringen|starten)|(?<![a-zäöüß])geht\s+(?:\S+\s+)?(?:beim|nach\s+dem)\s+(?:starten|anlassen|start)\s+(?:\S+\s+){0,2}?aus(?![a-zäöüß])|(?<![a-zäöüß])motor\s+(?:\S+\s+)?kommt\s+nicht(?=\s*(?:$|[.,;!?]))|(?<![a-zäöüß])keinen\s+mucks|(?<![a-zäöüß])(?:schl(?:ü|ue|u)ssel|z(?:ü|ue|u)ndung)[^\s.,;!?]*\s+(?:[^\s.,;!?]+\s+){0,5}?(?:passiert|tut\s+sich)\s+(?:gar\s+)?nichts|(?<![a-zäöüß])z(?:ü|ue|u)ndung\s+an,?\s+(?:aber\s+)?(?:es\s+)?(?:tut\s+sich|passiert)\s+(?:gar\s+)?nichts|(?<![a-z])(?:cranks?|turns\s+over)\s+(?:\S+\s+){0,2}?(?:won['’]?t|doesn['’]?t|does\s+not|will\s+not)\s+(?:fire|start|catch)|(?<![а-яіїєґё])(?:двигун|мотор|двигатель)\S*\s+(?:\S+\s+)?не\s+запуска\S*|(?<![а-яіїєґё])не\s+запуска\S*\s+(?:\S+\s+)?(?:двигун|мотор|двигатель))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|springt\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|starts\s+again|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))`, 'i', 1);
// Backlog 299 (Blickwinkel „Motorwarnleuchte rot während der Fahrt“): Warnleuchte/Warnmeldung im Kombiinstrument → Hinweise (rot: sicher
// anhalten, Motor aus, Leitung anrufen; gelb/orange: Weiterfahrt mit der Leitung klären; Foto vom Display; Rauch/Brandgeruch: Fahrzeug
// verlassen, Notruf; Auswahl „Kann das Fahrzeug fahren?“) – reine Information, keine Frist. „Rückleuchte“, „rote Rückleuchte“, „Warnweste“,
// „Warnblinker“, „Warndreieck“ lösen nichts aus
// Backlog 342 (Fehlersuche): auch einzelne Leuchten im Display („Öldruckleuchte an“, „ABS-Leuchte“, „AdBlue-Leuchte“, „Symbol leuchtet rot“, „STOP leuchtet“,
// „Fehlermeldung im Display“, „oil pressure light on“, „red light on the dashboard“); Brems-/Rück-/Stoppleuchten außen, „brake light“, rote Ampel nicht
// Backlog 347: auch „Display zeigt Fehler/Warnung“, „Fehler im Display“, „Im Display steht …“, „display shows an error“, „на дисплеї помилка“; „Display kaputt“ (Kombiinstrument-Hinweis) nicht
// Backlog 580 (Blickwinkel „Diktat/Tippfehler“): vorn ergänzt – Schreibweisen ohne Umlaut, getrennt geschrieben, Tippfehler, Umschrift
const WARNLIGHT_HINT = lbRx(String.raw`(?:(?<![a-zäöüß-])(?<!(?:kein|keine|ohne)\s)(?:(?:motor)?(?:ö|oe)l-?warnung|batterie-?warnung|lade-?warnung)(?![a-zäöüß])(?!\s+(?:ist\s+)?(?:weg|aus|erloschen|wieder\s+aus))|(?<![a-zäöüß-])(?:ö|oe)lkanne\s+(?:\S+\s+){0,2}?(?:leuchtet|blinkt|brennt|an(?![a-zäöüß])|geht\s+an|ging\s+an|kommt)|(?<![a-z])(?<!no\s)(?:battery|oil)\s+warning(?![a-z])(?!\s+(?:is\s+|has\s+)?(?:gone|off|out|cleared))|(?<![a-z])low\s+oil\s+pressure|(?<![а-яіїєґё])(?:низьк\S*\s+тиск\S*\s+масла|тиск\S*\s+масла\s+(?:\S+\s+)?(?:низьк\S*|пада\S*|впав)|низк\S*\s+давлени\S*\s+масла|давлени\S*\s+масла\s+(?:\S+\s+)?(?:низк\S*|пада\S*|упал\S*)))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![a-zäöüß-])ladekontrolle\s+(?:\S+\s+){0,2}?(?:leuchtet|brennt|blinkt|(?:geht|ist)\s+an(?=\s*(?:$|[.,;!?]))|an(?=\s*(?:$|[.,;!?])))|(?<![a-zäöüß-])(?:motor)?(?:ö|oe)ldruck(?:anzeige)?(?![a-zäöüß])\s+(?:(?:ist|war|geht|seit|heute|schon|wieder|deutlich|sehr|viel|zu|plötzlich|ploetzlich|auf|der|die|laut|display|anzeige|bei|im|leerlauf)[,;]?\s+){0,4}(?:niedrig|zu\s+(?:niedrig|gering)|gering|f(?:ä|ae)llt|sinkt|weg(?![a-zäöüß])|null|auf\s+null|warnung|zu\s+wenig|schwankt)(?![a-zäöüß])|(?<![a-zäöüß-])(?:motor)?(?:ö|oe)ldruck-?(?:warnung|meldung|fehler)|(?<![a-z])(?:low\s+oil\s+pressure|oil\s+pressure\s+(?:\S+\s+)?(?:low|warning|dropp\S*|falling|alarm))(?![a-z])|(?<![а-яіїєґ])(?:низьк\S*|малий|упав|впав|падає)\s+тиск\S*\s+(?:олив|мастил)\S*|(?<![а-яіїєґ])тиск\S*\s+(?:олив|мастил)\S*\s+(?:\S+\s+)?(?:низьк\S*|впав|упав|падає)|(?<![а-яіїєґ])давлени\S*\s+масл\S*\s+(?:\S+\s+)?(?:низк\S*|упал\S*|пада\S*)|(?<![а-яіїєґ])(?:низк\S*|упал\S*)\s+давлени\S*\s+масл\S*|(?:warn|kontroll)[\s-]+(?:leuchte|lampe)|(?:warn|kontroll)leuchte|(?:warn|kontroll)lampe|motorkontroll|warnmeldung|(?<![a-zäöüß])rote[snr]?\s+(?:\S+\s+)?(?:leuchte|lampe|symbol|warnung|warnsymbol)(?![a-zäöüß])|warning\s+(?:light|lamp|message)|check\s+engine|engine\s+(?:warning\s+|management\s+)?light|dashboard\s+(?:\S+\s+)?(?:light|warning)|red\s+(?:\S+\s+)?(?:warning|symbol)|(?:контрольн|попереджувальн|сигнальн)\S*\s+(?:ламп|індикатор|индикатор)|(?:горить|горит|загорів|загорілас|загорівс|загорел)\S*\s+(?:\S+\s+){0,2}?(?:лампа|лампочка|індикатор|индикатор|значок|чек|датчик)|(?:лампа|лампочка|індикатор|индикатор|значок|датчик)\S*\s+(?:\S+\s+){0,2}?(?:горить|горит|загорів|загорілас|загорел)|(?<![a-zäöüß])(?:(?:öldruck|oeldruck|öl|oel|batterie|lade|abs|ebs|asr|esp|adblue|harnstoff|motor|kühlmittel|kuehlmittel|kühlwasser|kuehlwasser|bremsdruck|druckluft|vorratsdruck|bremsbelag|bremsverschlei(?:ß|ss)|vorglüh|vorglueh|glüh|airbag|reifendruck|getriebe|feststellbrems|retarder))(?:-|\s+)?(?:warn)?(?:leuchte|lampe|symbol)(?:n)?(?![a-zäöüß])|(?<![a-zäöüß])(?:symbol|warnzeichen|zeichen|anzeige)\s+(?:\S+\s+){0,2}?(?:leuchtet|blinkt|brennt)\s+(?:\S+\s+)?(?:rot|gelb|orange)(?![a-zäöüß])|(?<![a-zäöüß])(?:leuchte|lampe)\s+(?:\S+\s+){0,2}?(?:leuchtet|blinkt|brennt)\s+(?:\S+\s+)?(?:rot|gelb|orange)\s+(?:\S+\s+)?(?:im|am|auf)\s+(?:dem\s+)?(?:display|kombiinstrument|armaturenbrett|bildschirm)|(?<![a-zäöüß])stopp?\s+(?:\S+\s+)?(?:leuchtet|blinkt|erscheint|im\s+display)|(?<![a-zäöüß])(?:fehler|warnung|st(?:ö|oe|o)rung)(?:meldung|code)?\S*\s+(?:\S+\s+)?(?:im|auf\s+dem|am)\s+(?:display|bildschirm|kombiinstrument|armaturenbrett)|(?<![a-z])(?:oil\s+pressure|oil|battery|charging|abs|ebs|adblue|def|coolant|air\s+pressure|airbag|glow\s+plug|tyre\s+pressure|tire\s+pressure)\s+(?:warning\s+)?(?:light|lamp|symbol|icon)s?(?![a-z])|(?<![a-z])(?:brake|stop)\s+warning\s+(?:light|lamp|symbol|icon)s?(?![a-z])|(?<![a-z])red\s+(?:\S+\s+)?(?:light|lamp|icon)\s+(?:\S+\s+)?(?:on|in)\s+(?:the\s+)?(?:dash\S*|display|instrument\S*)|(?<![a-z])error\s+(?:message|code)s?\s+(?:\S+\s+)?(?:on|in)\s+(?:the\s+)?(?:dash\S*|display|instrument\S*)|(?<![a-zäöüß])(?:display|bildschirm|kombiinstrument)\S*\s+(?:\S+\s+)?(?:zeigt|meldet|bringt)\s+(?:\S+\s+){0,2}?(?:fehler\S*|warnung\S*|st(?:ö|oe|o)rung\S*)|(?<![a-zäöüß])(?:im|auf\s+dem|am)\s+(?:display|bildschirm|kombiinstrument)\s+(?:\S+\s+)?(?:steht|kommt|erscheint|blinkt)\s+(?:\S+\s+){0,2}?(?:fehler\S*|warnung\S*|st(?:ö|oe|o)rung\S*)|(?<![a-z])(?:display|dash(?:board)?|instrument\s+cluster)\s+(?:\S+\s+)?(?:shows|showing|says|displays)\s+(?:an?\s+)?(?:\S+\s+)?(?:error|warning|fault)|(?<![а-яіїєґ])(?:на\s+)?(?:дисплеї|дисплее|екрані|экране|панелі|панели)\s+(?:\S+\s+){0,2}?(?:помилк\S*|ошибк\S*|попереджен\S*|предупрежден\S*)|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?:горить|горит|світиться|светится|загорів\S*|загорел\S*)\s+(?:лампа\s+|значок\s+|індикатор\s+|индикатор\s+)?(?:abs|ebs|asr)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))`, 'i', 1);
// Backlog 300 (Blickwinkel „Fahrer bemerkt Ölspur/Leck unter dem Lkw“): auslaufende Betriebsflüssigkeit → Hinweise (nicht losfahren bzw.
// sicher anhalten, Motor aus, Leitung/Disposition; Kraftstoffgeruch/heiße Teile: kein Feuer, Abstand, bei Rauch Notruf; nicht in Gully/Erdreich
// laufen lassen, Ölspur auf der Straße melden; Foto + Tropfstelle/Farbe/Geruch notieren; „nicht fahrbereit“) – reine Information, keine Frist.
// „Öl kontrolliert“, „Ölwechsel fällig“, „Öl nachgefüllt“, „Warnlampe Öldruck“, „Dach undicht“, „Druckluftleitung undicht“, „Reifen verliert Luft“,
// „roof leaks“, „air leak“, „oil change due“, „Заміна масла“, „Тече дах“ lösen nichts aus
// Backlog 338 (Fehlersuche): auch „Tank/Kühler tropft“, „Unter dem Lkw ist eine Pfütze“, „Бак протікає/тече“, „Протекает бак“, „Під машиною калюжа“; „Бак повний“, „Luftleitung tropft“ nicht
// Backlog 349: auch Kraftstoffgeruch („Dieselgeruch im Fahrerhaus“, „riecht nach Diesel“, „smells of diesel“, „пахне дизелем“) – Schritte nennen Dieselgeruch bereits
// Backlog 580 (Blickwinkel „Diktat/Tippfehler“): vorn ergänzt – Schreibweisen ohne Umlaut, getrennt geschrieben, Tippfehler, Umschrift
// Backlog 746: auch „запах палива“, „пахне паливом“ (ukrainisch Genitiv/Instrumental von „паливо“)
const LEAK_HINT = lbRx(String.raw`(?<![a-zäöüß])(?:oel|ol|öl|diesel|k(?:ue|u)hlwasser|k(?:ue|u)hlmittel)\s+(?:\S+\s+){0,3}?(?:l(?:ae|a)uft\s+aus|tropft|tropfen|verlust(?![a-zäöüß])|leckt?(?![a-zäöüß]))|(?<![a-zäöüß])(?:oel|öl)leck|öl(?:spur|fleck|lache|pfütze|pfuetze|verlust)|(?:öl|diesel|kraftstoff|sprit|kühlwasser|kühlmittel|kühlflüssigkeit|frostschutz\S*|hydraulik\S*|adblue|bremsflüssigkeit|flüssigkeit)\s+(?:\S+\s+){0,3}?(?:tropft|tropfen|läuft\s+aus|ausgelaufen|ausläuft|leckt|tritt\s+aus|austritt|ausgetreten)|(?:tropft|leckt)\s+(?:\S+\s+){0,3}?(?:öl|diesel|kraftstoff|kühlwasser|kühlmittel|hydrauliköl|flüssigkeit)|läuft\s+(?:\S+\s+){0,2}?(?:öl|diesel|kraftstoff|kühlwasser|kühlmittel|flüssigkeit)\S*\s+aus(?![a-zäöüß])|verlier\S*\s+(?:\S+\s+){0,2}?(?:öl|diesel|kraftstoff|kühlwasser|kühlmittel|hydrauliköl|flüssigkeit)|(?:tank|kühler|(?<!luft)schlauch|(?<!luft)leitung|ölwanne|dichtung)\S*\s+(?:\S+\s+){0,2}?(?:undicht|leckt|leck(?![a-zäöüß])|tropft|tropfen)|(?:lache|pfütze|fleck)\s+(?:\S+\s+){0,2}?unter\s+(?:dem|der|den)\s+(?:\S+\s+)?(?:lkw|fahrzeug|wagen|motor|zugmaschine|auflieger|anhänger|getriebe)|(?<![a-z])(?:oil|fuel|diesel|coolant|antifreeze|hydraulic(?:\s+(?:oil|fluid))?|brake\s+fluid|adblue|fluid)\s+(?:\S+\s+){0,2}?(?:leak|leaking|leaks|leaked|dripping|drips|spill|spilled|spilling|running\s+out|escaping)|leak(?:s|ing|ed)?\s+(?:\S+\s+){0,2}?(?:oil|fuel|diesel|coolant|antifreeze|hydraulic|fluid)|losing\s+(?:\S+\s+)?(?:oil|coolant|fuel|diesel|fluid)|(?:puddle|pool|stain)\s+(?:of\s+\S+\s+)?under\s+(?:the\s+)?(?:truck|lorry|vehicle|engine|trailer|tractor)|oil\s+(?:slick|trail)|(?:теч|протіка|підтіка|протека|подтека|капа|капл)\S*\s+(?:\S+\s+){0,2}?(?:олив|масл|пальн|палив|дизел|антифриз|тосол|охолодж|охлажд|топлив|солярк)|(?:олив|масл|пальн|палив|дизел|антифриз|тосол|охолодж|охлажд|топлив|солярк)\S*\s+(?:\S+\s+){0,2}?(?:тече|теч[еёу]т|протіка|підтіка|протека|подтека|капа)|(?:витік|витоку|витікає|утечк)\S*\s+(?:\S+\s+)?(?:олив|масл|пальн|палив|дизел|антифриз|тосол|охолодж|охлажд|топлив)|(?:калюж|луж)\S*\s+(?:\S+\s+){0,2}?(?:під|под)\s+(?:\S+\s+)?(?:вантажівк|машин|авто|тягач|грузовик|двигун|мотор|причіп|прицеп)|unter\s+(?:dem|der|den)\s+(?:lkw|fahrzeug|wagen|motor|zugmaschine|auflieger|anhänger|getriebe)\S*\s+(?:\S+\s+){0,3}?(?:lache|pfütze|pfuetze|ölfleck|fleck)|(?<![а-яіїєґ])(?:бак|радіатор|радиатор|картер|мастил)\S*\s+(?:\S+\s+){0,2}?(?:тече|теч[еёу]т|протіка|підтіка|протека|подтека|капа)|(?:тече|теч[еёу]т|протіка|підтіка|протека|подтека)\S*\s+(?:\S+\s+)?(?:бак|радіатор|радиатор|картер)|(?:під|под)\s+(?:\S+\s+)?(?:вантажівк|машин|авто|тягач|грузовик|двигун|мотор|причіп|прицеп)\S*\s+(?:\S+\s+)?(?:калюж|луж)|(?<![a-zäöüß-])(?:diesel|kraftstoff|sprit)geruch|(?<![a-zäöüß-])riecht\s+(?:\S+\s+){0,2}?nach\s+(?:diesel|kraftstoff|sprit|treibstoff)|(?<![a-z-])(?:smell\S*|smells|smelling)\s+(?:\S+\s+){0,2}?(?:of\s+)?(?:diesel|fuel)(?![a-z])|(?<![а-яіїєґ])(?:пахне|пахнет|запах\S*)\s+(?:\S+\s+)?(?:дизел|пальн|палив|солярк|топлив)\S*|(?<![a-zäöüß-])(?:kühler|kuehler|kühlwasser|kuehlwasser|kühlmittel|kuehlmittel|wasser|hydraulik|öl|oel|diesel|kraftstoff)schl(?:ä|ae|a)uch(?:e|es|s)?\s+(?:\S+\s+){0,2}?(?:geplatzt|geborsten|gerissen|abgerissen|abgesprungen|porös|poroes)(?![a-zäöüß])|(?<![a-z-])(?:coolant|radiator|hydraulic|fuel|oil)\s+(?:hose|pipe|line)s?\s+(?:\S+\s+)?(?:burst|split|ruptured|blew|came\s+off)(?![a-z])|(?<![а-яіїєґ])(?:патруб\S*|шланг\S*\s+(?:радіатор|радиатор|охолодж|охлажд|гідравл|гидравл|пальн|палив|топлив|олив|масл)\S*)\s+(?:\S+\s+)?(?:лопну|прорва|порва|розірва|зірва|сорва)\S*|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|found|gefunden|знайшли|нашли|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-z-])radiator\s+(?:\S+\s+){0,2}?(?:leak\S*|dripping|losing\s+(?:coolant|water))(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|found|gefunden|знайшли|нашли|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|found|gefunden|знайшли|нашли|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-z-])(?:diesel|fuel)\s+(?:smell|odou?r|fumes)\s+(?:\S+\s+){0,2}?(?:in|inside)\s+(?:the\s+)?cab(?:in)?(?![a-z])|(?<![a-z-])(?:smell\S*|stink\S*)\s+(?:of\s+)?(?:diesel|fuel)\s+(?:\S+\s+)?(?:in|inside)\s+(?:the\s+)?cab(?:in)?(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|found|gefunden|знайшли|нашли|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|found|gefunden|знайшли|нашли|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-zäöüß-])(?:(?:ö|oe)lwanne|getriebewanne)\s+(?:\S+\s+){0,2}?(?:aufgerissen|gerissen|durchgeschlagen|durchschlagen|leck(?![a-zäöüß])|hat\s+(?:ein\s+)?loch)(?![a-zäöüß])|(?<![a-z-])(?:oil\s+)?sump\s+(?:\S+\s+){0,2}?(?:cracked|holed|punctured|split|leak\S*)(?![a-z])|(?<![а-яіїєґё])(?:пробив\S*|пробил\S*|пробит\S*|трісну\S*|тресну\S*)\s+(?:\S+\s+)?(?:масля\S*\s+)?(?:піддон\S*|поддон\S*|картер\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|found|gefunden|знайшли|нашли|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-zäöüß-])(?:k(?:ü|ue)hlwasser|k(?:ü|ue)hlfl(?:ü|ue)ssigkeit|k(?:ü|ue)hlmittel)\s+(?:\S+\s+)?(?:verliert|verloren|l(?:ä|ae)uft\s+aus|tropft)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?:втрача\S*|тер[яе]\S*|йде|уходит)\s+(?:\S+\s+)?(?:охолоджувальн\S*|охлаждающ\S*)\s+(?:рідин\S*|жидкост\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?:охолоджувальн\S*|охлаждающ\S*)\s+(?:рідин\S*|жидкост\S*)\s+(?:\S+\s+)?(?:тече|теч[её]т|витіка\S*|вытека\S*|йде|уходит)(?![а-яіїєґё])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?<![a-zäöüß])(?:öl|oel|diesel|kraftstoff|k(?:ü|ue|u)hlwasser|k(?:ü|ue|u)hlmittel|hydraulik\S*|adblue|fl(?:ü|ue)ssigkeit)\s+(?:\S+\s+){0,3}?(?:l(?:ä|ae|a)uft|kommt|spritzt|sprüht)\s+(?:\S+\s+)?raus(?![a-zäöüß])|(?<![a-zäöüß])(?:sifft|siffen|suppt|suppen|schwitzt|schwitzen)\s+(?:\S+\s+){0,2}?(?:öl|oel|diesel|k(?:ü|ue|u)hlwasser|k(?:ü|ue|u)hlmittel|hydraulik\S*)|(?<![a-zäöüß])(?:motor|getriebe|achse|hinterachse|differential|ölwanne|zylinderkopf|turbo\S*|retarder|kompressor|lenkgetriebe|hydraulik|kippzylinder|hubzylinder)\S*\s+(?:\S+\s+){0,2}?(?:sifft|suppt|schwitzt)(?![a-zäöüß])|(?<![a-zäöüß-])(?:(?:diesel|kraftstoff|adblue|hydraulik(?:(?:ö|oe)l)?|(?:ö|oe)l)-?)?tank(?:s)?(?![a-zäöüß])\s+(?:\S+\s+){0,2}?(?:l(?:ä|ae)uft\s+(?:\S+\s+)?aus|ist\s+ausgelaufen)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![a-zäöüß-])(?:(?:motor|hydraulik|getriebe)?(?:ö|oe)l|diesel|kraftstoff|sprit)\s+verliert(?![a-zäöüß])(?!\s+(?:\S+\s+)?(?:nicht|kein))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|abgedichtet|fixed|repaired|replaced))`, 'i', 1);
// Backlog 301 (Blickwinkel „Auflieger beim Kunden beschädigt (Rampe, Stapler)“): Schaden an der Laderampe bzw. durch einen Stapler →
// Hinweise (vor Ort mit dem Verantwortlichen ansehen und auf Lieferschein/Frachtbrief vermerken und gegenzeichnen lassen, Firma/Tor/Uhrzeit
// notieren und Kontakt an die Leitung, Fotos, Leitung anrufen und kein Schuldanerkenntnis unterschreiben, „nicht fahrbereit“ wenn Licht/
// Bremsen/Reifen/Türen/Ladungssicherung betroffen) – reine Information, keine Frist. „Mitnahmestapler defekt“, „Stapler-Halterung lose“,
// „Kunde hat angerufen“, „Ladebordwand defekt“, „forklift mount loose“, „customer complained“, „Клієнт телефонував“ lösen nichts aus
const CUSTDMG_HINT = lbRx(String.raw`(?:(?<![а-яіїєґё])(?:клієнт|клиент)\S*\s+(?:\S+\s+){0,2}?(?:пошкодив|пошкодила|пошкодили|повредил\S*|вдарив|ударил\S*|зачепив|зацепил\S*)\s+(?:\S+\s+)?(?:машин|вантажівк|авто|причіп|причеп|прицеп|тент|дзеркал|зеркал|двер|бампер|кабін|кабин|фур)\S*|(?<![a-zäöüß])kunde(?:n)?\s+(?:hat|haben)\s+(?:\S+\s+)?(?:lkw|fahrzeug|auflieger|anh(?:ä|ae)nger|plane|t(?:ü|ue)r|spiegel|sto(?:ß|ss)stange|zugmaschine|wagen|aufbau|koffer|kabine|fahrerhaus)\S*\s+(?:\S+\s+)?(?:besch(?:ä|ae|a)digt|angefahren|gerammt|eingedr(?:ü|ue)ckt)|(?<![a-z])customer\S*\s+(?:\S+\s+){0,2}?(?:damaged|dented|hit|reversed\s+into|backed\s+into)\s+(?:\S+\s+)?(?:truck|lorry|trailer|vehicle|cab|curtain|tarp|door|bumper|mirror))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?:stapler|hubwagen|flurförder)\S*\s+(?:\S+\s+){0,6}?(?:besch(?:ä|ae|a)digt|angefahren|gerammt|eingedrückt|aufgeschlitzt|aufgerissen|durchstoßen|getroffen|reingefahren|hineingefahren)|(?:besch(?:ä|ae|a)digt|angefahren|gerammt|eingedrückt|aufgeschlitzt|aufgerissen)\s+(?:\S+\s+){0,3}?(?:vom|von\s+(?:einem|dem)|durch\s+(?:einen|den))\s+(?:\S+\s+)?(?:gabel)?(?:stapler|hubwagen)|(?:beim|bei\s+(?:dem|einem))\s+kunden\s+(?:\S+\s+){0,6}?(?:besch(?:ä|ae|a)digt|angefahren|gerammt|eingedrückt|aufgeschlitzt)|(?:besch(?:ä|ae|a)digt|angefahren|gerammt|eingedrückt)\s+(?:\S+\s+){0,3}?(?:beim|bei\s+(?:dem|einem))\s+kunden|(?:an\s+der|an\s+die|gegen\s+die)\s+(?:lade)?rampe\s+(?:\S+\s+){0,3}?(?:gestoßen|angefahren|besch(?:ä|ae|a)digt|eingeklemmt|geknallt|gefahren)|(?:lade)?rampe\s+(?:\S+\s+){0,3}?(?:besch(?:ä|ae|a)digt|angefahren)|forklift\S*\s+(?:\S+\s+){0,6}?(?:damaged|hit|struck|pierced|punctured|ripped|dented|crashed)|(?:damaged|hit|struck|pierced|dented|ripped)\s+(?:\S+\s+){0,3}?by\s+(?:a\s+|the\s+)?(?:forklift|pallet\s+truck)|(?:at|by)\s+(?:the\s+)?customer\S*\s+(?:\S+\s+){0,6}?(?:damaged|hit|dented|struck)|(?:damaged|dented)\s+(?:\S+\s+){0,3}?at\s+(?:the\s+)?customer|(?:loading\s+)?(?:dock|ramp)\s+(?:\S+\s+){0,3}?(?:damaged|hit|dented)|(?:hit|reversed\s+into|backed\s+into)\s+(?:the\s+)?(?:loading\s+)?(?:dock|ramp)|(?:навантажувач|погрузчик|штабелер)\S*\s+(?:\S+\s+){0,6}?(?:пошкод|вдари|пробив|пробил|повред|удари|зачепив|зацепил)|(?:пошкод|повред)\S*\s+(?:\S+\s+){0,3}?(?:навантажувач|погрузчик)|(?:у|в)\s+клієнт\S*\s+(?:\S+\s+){0,6}?пошкод|(?:у|в)\s+клиент\S*\s+(?:\S+\s+){0,6}?повре(?:д|жд)|рамп\S*\s+(?:\S+\s+){0,3}?(?:пошкод|повред|вдари|удари)|(?<![a-zäöüß-])(?:roll|hallen|hof|werks?|sektional|kipp|schiebe|lager|rampen)?(?:tor|tore|schranke|rollladen)(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:auf|gegen)\s+(?:den|das|die|unseren?|meinen?)\s+(?:\S+\s+)?(?:lkw|auflieger|anh(?:ä|ae)nger|fahrerhaus|plane|aufbau|dach|koffer|kabine|zugmaschine|wagen|spiegel|fahrzeug)\S*\s+(?:\S+\s+){0,2}?(?:gefallen|gest(?:ü|ue)rzt|(?:he)?runter(?:gekommen|gegangen|gefahren|gefallen|gerauscht)|zugefallen|geknallt|geschlagen|gekracht|gedonnert|geprallt)(?![a-zäöüß])|(?<![a-z-])(?:gate|barrier|roller\s+shutter|shutter|roll-?up\s+door|loading\s+bay\s+door)s?\s+(?:\S+\s+){0,2}?(?:came\s+down|fell|dropped|closed|slammed|crashed)\s+(?:on(?:to)?|against|in(?:to)?)\s+(?:the\s+|my\s+|our\s+)?(?:truck|lorry|trailer|cab|curtain|roof|vehicle)(?![a-z])|(?<![а-яіїєґё])(?:ворот\S*|шлагбаум\S*|ролет\S*|роллет\S*)\s+(?:\S+\s+){0,2}?(?:впал\S*|упал\S*|опусти\S*|опусти\S*|вдари\S*|удари\S*|закри\S*|закры\S*)\s+(?:на|по|об)\s+(?:\S+\s+)?(?:машин|вантажівк|авто|причіп|причеп|прицеп|тент|кабін|кабин|фур|дах|крыш)\S*`, 'i', 1);
// [CLAUDE] Backlog 682 (30.10.2026, Blickwinkel „Ladungsschaden beim Kunden reklamiert“): Transport-/Ladungsschaden, Ware beschädigt/angetaut/abgelehnt,
// Empfänger reklamiert bzw. verweigert die Annahme, „unter Vorbehalt“ quittiert → Schritte (Vermerk auf Frachtbrief/Lieferschein, Fotos vor dem Entladen,
// Temperaturausdruck, Ware nicht eigenmächtig entsorgen/zurückfahren, Ursache am Fahrzeug beschreiben; Leitung) – reine Information, keine Frist.
// „Kunde hat angerufen“, „Ladung verrutscht“, „Rampe beim Kunden beschädigt“, „вантажівка пошкоджена“ (Lkw) nicht
const CARGO_HINT = lbRx(String.raw`(?<![a-zäöüß])(?:transport|ladungs|waren|fracht|bruch|n(?:ä|ae)sse)schaden|(?<![a-zäöüß])(?:kunde|kundin|empf(?:ä|ae)nger|warenannahme|wareneingang)\s+(?:\S+\s+){0,4}?(?:reklamiert|reklamation|beanstandet|verweigert\s+(?:\S+\s+)?annahme|nimmt\s+(?:\S+\s+){0,2}?nicht\s+an|lehnt\s+(?:\S+\s+){0,2}?ab|hat\s+(?:\S+\s+){0,2}?abgelehnt|will\s+(?:\S+\s+){0,2}?nicht\s+annehmen)(?![a-zäöüß])|annahme\s+(?:\S+\s+)?verweigert|(?<![a-zäöüß])(?:ware|waren|ladung|lieferung|paletten?|g(?:ü|ue)ter|kartons?|fracht|packst(?:ü|ue)cke?|kühlware|tiefkühlware)\s+(?:\S+\s+){0,3}?(?:besch(?:ä|ae|a)digt|zerbrochen|zerdr(?:ü|ue)ckt|eingedr(?:ü|ue)ckt|verdorben|aufgetaut|angetaut|reklamiert|abgelehnt|nicht\s+angenommen|zur(?:ü|ue)ckgewiesen)(?![a-zäöüß])|(?:unter\s+vorbehalt|vorbehalt)\s+(?:\S+\s+){0,3}?(?:frachtbrief|cmr|lieferschein)|(?<![a-z])(?:cargo|goods|freight|load|shipment|pallets?)\s+(?:\S+\s+){0,3}?(?:damaged|broken|crushed|spoiled|thawed|rejected|refused)(?![a-z])|(?<![a-z])damaged\s+(?:\S+\s+)?(?:cargo|goods|freight|pallets?|shipment)|(?<![a-z])(?:customer|consignee|receiver)\s+(?:\S+\s+){0,3}?(?:rejected|refused|complained)|(?<![a-z])(?:cargo|freight)\s+claim|(?<![а-яіїєґё])(?:пошкоджен\S*|поврежден\S*|зіпсован\S*|испорчен\S*|бит\S*)\s+(?:\S+\s+)?(?:вантаж(?!івк)\S*|груз(?!овик)\S*|товар\S*)|(?<![а-яіїєґё])(?:вантаж(?!івк)\S*|груз(?!овик)\S*|товар\S*)\s+(?:\S+\s+){0,2}?(?:пошкоджен\S*|поврежден\S*|зіпсован\S*|испорчен\S*)|(?<![а-яіїєґё])(?:клієнт\S*|одержувач\S*|клиент\S*|получател\S*)\s+(?:\S+\s+){0,3}?(?:відмови\S*|отказа\S*|не\s+прийня\S*|не\s+принял\S*|рекламаці\S*|рекламаци\S*)`, 'i', 1);
// [CLAUDE] Backlog 685 (30.10.2026, Blickwinkel „Kennzeichen verloren, gestohlen oder unleserlich“): Kennzeichen/Nummernschild abgefallen, weg, gestohlen,
// abgeschraubt, verbogen/unleserlich, „kein Kennzeichen mehr dran“ → Schritte (Mangel am Fahrzeug, Leitung entscheidet über Weiterfahrt; gestohlen → Polizei, Aktenzeichen;
// unterwegs verloren → Ort notieren, nicht auf der Fahrbahn suchen, Fotos; Ersatz klärt die Leitung über die Zulassungsstelle, kein Schild eigenmächtig nachmachen) –
// reine Information, keine Frist. „Kennzeichen SZ-YC 5501, Spiegel kaputt“, „Kennzeichenbeleuchtung defekt“, „Kennzeichenhalter lose“, „number plate light broken“ nicht.
const NUMPLATE_HINT = lbRx(String.raw`(?<![a-zäöüß])(?:(?:hintere|vordere)[snrm]?\s+)?(?:kfz-)?(?:kennzeichen(?:schild|tafel)?|nummernschild)(?:s|e|er|n|en)?\s+(?:(?:ist|sind|wurde|wurden|war|hinten|vorne|vorn|am|an|der|die|das|dem|den|vom|von|beim|bei|lkw|auflieger|aufliegers|anh(?:ä|ae)nger|anh(?:ä|ae)ngers|trailer|zugmaschine|sattelzug|komplett|ganz|unterwegs|w(?:ä|ae)hrend|fahrt|auf|autobahn|leider|heute|nacht|wohl|vermutlich|irgendwo|schon|total|stark|teilweise|mir|uns|beide|beiden|einfach|plötzlich|halb|mehr|über|in|letzter|letzte|seit|gestern)\s+){0,4}(?:verloren|abgefallen|runtergefallen|heruntergefallen|weg(?![a-zäöüß])|fehl(?:t|en)|gestohlen|geklaut|entwendet|abgeschraubt|abmontiert|abgerissen|abgebrochen|unleserlich|nicht\s+(?:mehr\s+)?(?:lesbar|da|dran)|verbogen|zerbrochen|gebrochen|gerissen|besch(?:ä|ae|a)digt|kaputt|zerkratzt)(?![a-zäöüß])|(?<![a-zäöüß])(?:verlorene|gestohlene|geklaute|fehlende|abgefallene|unleserliche|besch(?:ä|ae|a)digte|kaputte|verbogene|zerbrochene|abgeschraubte)[snrm]?\s+(?:(?:hintere|vordere)[snrm]?\s+)?(?:kfz-)?(?:kennzeichen(?:schild|tafel)?|nummernschild)(?:s|e|er|n|en)?(?![a-zäöüß])|(?<![a-zäöüß])kein(?:e|en)?\s+(?:(?:hinteres|vorderes)\s+)?(?:kfz-)?(?:kennzeichen(?:schild|tafel)?|nummernschild)(?:s|e|er|n|en)?\s+(?:mehr\s+)?(?:dran|am|an|drauf|vorhanden)(?![a-zäöüß])|(?:kennzeichen|nummernschild)(?:diebstahl|verlust)|(?<![a-z])(?:(?:rear|front)\s+)?(?:number|licen[cs]e|registration|reg)\s+plates?\s+(?:(?:is|are|was|were|has|have|been|got|on|the|rear|front|trailer|truck|our|my|both|just|completely|somehow|during|drive|while|driving)\s+){0,4}(?:lost|missing|gone|stolen|fell\s+off|came\s+off|fallen\s+off|come\s+off|broken|cracked|damaged|unreadable|illegible|bent|snapped)(?![a-z])|(?<![a-z])(?:lost|stole|took|missing|broken|damaged|stolen)\s+(?:the\s+|a\s+|my\s+|our\s+|both\s+)?(?:(?:rear|front|trailer)\s+)?(?:number|licen[cs]e|registration|reg)\s+plates?(?![a-z])|(?<![а-яіїєґё])(?:номерн\S*\s+знак\S*|номерн\S*\s+табличк\S*)\s+(?:\S+\s+){0,2}?(?:загуби\S*|загубл\S*|втрати\S*|втрачен\S*|потеря\S*|потерял\S*|відпа\S*|отпа\S*|відвали\S*|отвали\S*|вкрал\S*|вкрад\S*|украл\S*|украд\S*|зняли|сняли|відкрути\S*|открути\S*|немає|нема|нет(?![а-яіїєґё])|зник\S*|пропа\S*|злама[вл]\S*|сломал\S*|пошкоджен\S*|поврежден\S*|не\s+чита\S*|нечитаб\S*)|(?<![а-яіїєґё])(?:номер(?:и|а)?)\s+(?:загуби\S*|загубл\S*|втрати\S*|втрачен\S*|потеря\S*|потерял\S*|відпа\S*|отпа\S*|відвали\S*|отвали\S*|вкрал\S*|вкрад\S*|украл\S*|украд\S*|зняли|сняли|відкрути\S*|открути\S*|немає|нема|нет(?![а-яіїєґё])|зник\S*|пропа\S*|злама[вл]\S*|сломал\S*|пошкоджен\S*|поврежден\S*|не\s+чита\S*|нечитаб\S*)|(?<![а-яіїєґё])(?:загуби\S*|втрати\S*|потерял\S*|вкрали|украли|зняли|сняли|немає|нема|нет)\s+(?:\S+\s+){0,1}?(?:(?:номерн\S*\s+знак\S*|номерн\S*\s+табличк\S*)|(?:номер(?:и|а)?))(?![а-яіїєґё])(?!\s+(?:телефон|заявк|рахун|сч(?:е|[её])т|замовл|заказ|рейс|документ|договор|догов|накладн)\S*)`, 'i', 1);
// Backlog 685: erkennt die Meldung ein Kennzeichen, zählt „Kennzeichen abgefallen“ nicht zusätzlich als loses Teil (#loose) – andere lose Teile in derselben Meldung schon
const NUMPLATE_WORDS = lbRx(String.raw`(?<![a-zäöüß])(?:kfz-)?(?:kennzeichen|nummernschild)(?:schild|tafel)?(?:s|e|er|n|en)?(?![a-zäöüß])|(?<![a-z])(?:number|licen[cs]e|registration|reg)\s+plates?(?![a-z])|(?<![а-яіїєґё])номерн\S*\s+(?:знак|табличк)\S*|(?<![а-яіїєґё])номер(?:и|а)?(?![а-яіїєґё])`, 'gi');
// [CLAUDE] Backlog 688 (30.10.2026, Blickwinkel „Partikelfilter (DPF) voll – Regeneration nötig oder bricht ab“): Partikelfilter-/DPF-Anzeige, Filter voll/verstopft,
// Regeneration läuft nicht/bricht ab, Standregeneration → Schritte (Anweisung im Display/Betriebsanleitung, Leitung entscheidet; Standregeneration nur im Freien, nicht in der Halle
// oder über trockenem Gras – Abgase sehr heiß; Fotos/seit wann/Kurzstrecke; Auswahl „Kann das Fahrzeug fahren?“) – reine Information, keine Frist.
// „Partikelfilter laut Rechnung getauscht“, „DPF gereinigt“, „Partikelfilter regeneriert, alles ok“, „Luftfilter voll“ nicht.
const PFILTER_HINT = lbRx(String.raw`(?<![a-zäöüß])(?:(?:diesel|ru(?:ß|ss))?partikelfilter|dpf|abgasnachbehandlung|abgasreinigung)(?:-|\s+)(?:(?:ist|sind|wurde|war|der|die|das|dem|den|im|am|beim|lkw|komplett|ganz|wohl|vermutlich|schon|wieder|st(?:ä|ae)ndig|dauernd|immer|seit|heute|gestern|leuchte|anzeige|symbol|lampe|meldet|meldung|zeigt|sagt|laut|display|muss|soll|sollte|m(?:ü|ue)sste|-)\s+){0,4}(?:voll|verstopft|zu(?![a-zäöüß])|beladen|leuchte\S*|warn\S*|symbol|fehler\S*|st(?:ö|oe)rung|defekt|regenerier(?!t(?![a-zäöüß]))\S*|regeneriert\s+(?:werden|nicht)|regeneration\S*|freibrenn\S*|brennt\s+(?:\S+\s+)?nicht\s+frei|an(?![a-zäöüß])|blinkt)(?![a-zäöüß])(?!\s+(?:\S+\s+)?(?:gereinigt|getauscht|erneuert|ersetzt|erledigt|behoben|repariert|erfolgreich|ok(?![a-zäöüß])|in\s+ordnung|cleaned|replaced|fixed|done))|(?<![a-zäöüß])(?:stand|park|zwangs)[\s-]?regeneration\S*|(?<![a-zäöüß])(?:regeneration|freibrennen)\s+(?:(?:des|vom|von|dem|der|filters?|partikelfilters?|dpf|l(?:ä|ae)uft|klappt|geht|ist|wird|wurde|immer|wieder|st(?:ä|ae)ndig|dauernd)\s+){0,3}(?:nicht|abgebrochen|bricht|fehlgeschlagen|n(?:ö|oe)tig|erforderlich|angefordert|startet\s+nicht|unm(?:ö|oe)glich)(?![a-zäöüß])|(?<![a-z])(?:dpf|(?:diesel\s+)?particulate\s+filter)\s+(?:(?:is|light|warning|lamp|symbol|on|the|keeps|says|always|again)\s+){0,3}(?:full|blocked|clogged|light|warning|fault|on|regen\S*|needs?)(?![a-z])(?!\s+(?:\S+\s+)?(?:gereinigt|getauscht|erneuert|ersetzt|erledigt|behoben|repariert|erfolgreich|ok(?![a-zäöüß])|in\s+ordnung|cleaned|replaced|fixed|done))|(?<![a-z])(?:parked|forced|manual|stationary)\s+regen(?:eration)?(?![a-z])|(?<![a-z])regen(?:eration)?\s+(?:(?:is|keeps|won['’]?t|will|not|does|doesn['’]?t|keeps)\s+){0,2}(?:fail\S*|stopping|abort\S*|start|work\S*|required|needed)(?![a-z])|(?<![а-яіїєґё])(?:сажов\S*|сажев\S*)\s+фільтр\S*|(?<![а-яіїєґё])(?:сажов\S*|сажев\S*)\s+фильтр\S*|(?<![а-яіїєґё])(?:фільтр|фильтр)\S*\s+(?:твердих\s+частинок|твердых\s+частиц)|(?<![а-яіїєґё])(?:дпф|сажовик\S*)|(?<![а-яіїєґё])регенерац\S*\s+(?:\S+\s+){0,2}?(?:не\s+проход\S*|не\s+запуска\S*|не\s+працю\S*|не\s+работа\S*|не\s+відбува\S*|не\s+происход\S*|перерива\S*|прерыва\S*|потрібн\S*|нужн\S*)`, 'i', 1);
// [CLAUDE] Backlog 690 (30.10.2026, Blickwinkel „Fahrer rutscht beim Absteigen aus – Trittstufe oder Haltegriff defekt“): Trittstufe/Aufstieg/Haltegriff/Leiter lose,
// abgebrochen, glatt/vereist; beim Absteigen ausgerutscht/gestürzt → Schritte (nicht benutzen bzw. nur mit festem Halt, Leitung entscheidet; Verletzung: Erste Hilfe/112, Vorgesetzte
// direkt informieren – Angaben zur Verletzung NICHT in die Meldung (Datensparsamkeit: Fahrzeugvorgang ist für Werkstatt sichtbar); Fotos/welche Stufe) – reine Information, keine Frist.
// „Trittstufe wieder befestigt“, „Stufe im Lager“, „Leitung informiert“, „Griff der Ladebordwand“ nicht. „Trittstufe abgerissen“ zählt nicht zusätzlich als loses Teil (STEP_WORDS).
const STEP_HINT = lbRx(String.raw`(?<![a-zäöüß-])(?:aufstiegstritt|einstiegstritt|aufstiegsstufe|trittstufe|trittbrett|tritt|stufe|aufstieg|einstieg|einstiegsstufe|aufstiegsleiter|leiter|haltegriff|griffstange|einstiegsgriff|handlauf|griff)(?:e|en|n|s|es)?\s+(?:(?:ist|sind|wurde|war|der|die|das|am|an|beim|vom|fahrerseite|beifahrerseite|links|rechts|unten|oben|untere|obere|fahrerhaus|kabine|lkw|auflieger|anh(?:ä|ae)nger|komplett|ganz|total|sehr|extrem|stark|wieder|schon|seit|heute|gestern|morgens)\s+){0,3}(?:lose|locker|wackelt|wackeln|wackelig|abgebrochen|gebrochen|gerissen|verbogen|defekt|kaputt|fehlt|fehlen|abgerissen|glatt|rutschig|vereist|gl(?:ä|ae)tte|eingerissen)(?![a-zäöüß])(?!\s+(?:\S+\s+)?(?:wieder\s+fest|befestigt|repariert|getauscht|ersetzt|behoben|fixed|repaired))|(?<![a-zäöüß])(?:beim|bei[mn]?)\s+(?:ab|aus|ein|auf|runter|herunter|hoch)steigen\s+(?:\S+\s+){0,4}?(?:ausgerutscht|abgerutscht|weggerutscht|gest(?:ü|ue)rzt|gefallen|hingefallen|runtergefallen|heruntergefallen|abgest(?:ü|ue)rzt|umgeknickt)(?![a-zäöüß])|(?<![a-zäöüß])(?:aus|von)\s+(?:der|dem)\s+(?:kabine|fahrerhaus|lkw|auflieger|ladefl(?:ä|ae)che|stufe|trittstufe)\s+(?:\S+\s+){0,2}?(?:gest(?:ü|ue)rzt|gefallen|abgerutscht|ausgerutscht|abgest(?:ü|ue)rzt)(?![a-zäöüß])|(?<![a-z])(?<!next\s)(?<!first\s)(?<!last\s)(?:cab\s+)?(?:steps?|grab\s+handles?|handrails?|access\s+ladder|ladder)\s+(?:(?:is|are|on|the|driver['’]?s?|side|loose|very|completely)\s+){0,3}(?:loose|broken|bent|missing|wobbly|slippery|icy|cracked)(?![a-z])|(?<![a-z])(?:slipped|fell|fallen)\s+(?:\S+\s+){0,3}?(?:(?:getting|climbing|stepping)\s+(?:out|down|in|up)|(?:from|off)\s+(?:the\s+)?(?:cab|step|steps|truck|trailer|ladder))(?![a-z])|(?<![а-яіїєґё])(?:сходин\S*|підніжк\S*|подножк\S*|поручн\S*|поручен\S*|ручк\S*\s+(?:кабін|кабин)\S*)\s+(?:\S+\s+){0,2}?(?:злама[внл]\S*|сломан\S*|сломал\S*|відлама\S*|отлома\S*|відірва\S*|оторва\S*|хитає\S*|шатает\S*|болтає\S*|болтает\S*|розхита\S*|расшата\S*|слизьк\S*|скользк\S*|обледен\S*|відсутн\S*|отсутств\S*|погнут\S*|зігнут\S*)|(?<![а-яіїєґё])(?:посковзну\S*|поскользну\S*|впав|упал|упала|впала|зірвав\S*|сорвал\S*)\s+(?:\S+\s+){0,3}?(?:з\s+кабін\S*|с\s+кабин\S*|з\s+підніжк\S*|с\s+подножк\S*|виходячи|выходя|злазячи|слезая)`, 'i');
const STEP_WORDS = lbRx(String.raw`(?<![a-zäöüß-])(?:aufstiegstritt|einstiegstritt|aufstiegsstufe|trittstufe|trittbrett|tritt|stufe|aufstieg|einstieg|einstiegsstufe|aufstiegsleiter|leiter|haltegriff|griffstange|einstiegsgriff|handlauf|griff)(?:e|en|n|s|es)?(?![a-zäöüß])|(?<![a-z])(?:cab\s+)?(?:steps?|grab\s+handles?|handrails?|access\s+ladder|ladder)(?![a-z])|(?<![а-яіїєґё])(?:сходин|підніжк|подножк|поручн|поручен)\S*`, 'gi');
// [CLAUDE] Backlog 731 (30.10.2026, Blickwinkel „Jemand verletzt sich bei der Arbeit am Fahrzeug – Be-/Entladen, Kuppeln, Plane, Ladebordwand“): Arbeits-/Betriebsunfall,
// „verletzt“, Quetschung/Schnittwunde, Körperteil eingeklemmt/gequetscht, Person von Ladefläche/Auflieger gestürzt; EN/UK/RU → eigene Schritte (Erste Hilfe/Notruf,
// Gefahrenstelle sichern, Vorgesetzte direkt informieren, Verletzte fahren nicht weiter; KEINE Angaben zur Verletzung/Gesundheit/Namen in die Meldung – Werkstatt sieht sie;
// nur Fahrzeug-/Ausrüstungsmangel mit Fotos; Auswahl „Weiß nicht“) – reine Information, keine Frist. Verneinungen („niemand verletzt“, „keine Verletzten“, „no one injured“,
// „ніхто не травмувався“), Reifen-/Lack-„Verletzung“, „Verletzungsgefahr“, „Palette vom Auflieger gefallen“ lösen nichts aus. Ein Verkehrsunfall mit Verletzten bleibt bei den
// Unfall-Schritten (INJURY_WORDS wird vor ACC_HINT entfernt: „Arbeitsunfall“ ist kein Verkehrsunfall); Sturz beim Absteigen bleibt bei Trittstufe (STEP_HINT).
const INJURY_HINT = lbRx(String.raw`(?<![a-zäöüß-])(?:arbeits|betriebs)unf(?:ä|ae|a)ll\S*|(?<![a-z])(?:work(?:place)?|industrial|occupational)\s+(?:accident|injury)|(?<![a-z])accident\s+at\s+work|(?<![а-яіїєґё])(?:нещасн\S*\s+випад\S*|несчастн\S*\s+случа\S*|виробнич\S*\s+травм\S*|производствен\S*\s+травм\S*)|(?<![^.;!?\n]*(?:reifen|flanke|lauffl|karkasse|lack|tyre|tire|шин|покришк|покрышк)[^.;!?\n]*)(?![^.;!?\n]*(?:reifen|flanke|lauffl|karkasse|lack|tyre|tire|шин|покришк|покрышк))(?<!(?:niemand|keiner|keine|kein|nicht|nichts|ohne|nobody|no\s+one|noone|not|no|never|without|ніхто\s+не|никто\s+не|не|без)\s+(?:\S+\s+){0,2})(?<![a-zäöüß-])(?:verletzt|verletzte|verletzten|verletzter|verletzung|verletzungen|quetschung|schnittwunde|platzwunde|prellung|verstaucht|umgeknickt)(?![a-zäöüß])|(?<![^.;!?\n]*(?:reifen|flanke|lauffl|karkasse|lack|tyre|tire|шин|покришк|покрышк)[^.;!?\n]*)(?![^.;!?\n]*(?:reifen|flanke|lauffl|karkasse|lack|tyre|tire|шин|покришк|покрышк))(?<!(?:niemand|keiner|keine|kein|nicht|nichts|ohne|nobody|no\s+one|noone|not|no|never|without|ніхто\s+не|никто\s+не|не|без)\s+(?:\S+\s+){0,2})(?<![a-z])(?:injured|injury|injuries|hurt\s+(?:my|his|her|their|him|himself|herself|myself|themselves)|bleeding|sprained)(?![a-z])|(?<!(?:niemand|keiner|keine|kein|nicht|nichts|ohne|nobody|no\s+one|noone|not|no|never|without|ніхто\s+не|никто\s+не|не|без)\s+(?:\S+\s+){0,2})(?<![а-яіїєґё])(?:травм\S*|травмув\S*|травмир\S*|поранив\S*|поранен\S*|поранил\S*|ранен\S*|забив\S*\s+(?:руку|ногу|голов\S*|палець|палец)|ушиб\S*)|(?<![a-zäöüß-])(?:finger|fingern|hand|h(?:ä|ae)nde|fu(?:ß|ss)|f(?:ü|ue)(?:ß|ss)e|arm|arme|bein|beine|kopf|knie|zeh|zehe|zehen|daumen|auge|augen|schulter|handgelenk|kn(?:ö|oe)chel|gesicht)\s+(?:\S+\s+){0,4}?(?:eingeklemmt|geklemmt|eingequetscht|gequetscht|geschnitten|aufgeschnitten|gebrochen|verbrannt|ver(?:ä|ae)tzt|verdreht|gesto(?:ß|ss)en|angeschlagen)(?![a-zäöüß])|(?<![a-z])(?<!(?:landing|support|trailer|table|seat|chair|stand)\s)(?:finger|fingers|hand|hands|foot|feet|arm|arms|leg|legs|head|knee|back|toe|toes|thumb|eye|eyes|shoulder|wrist|ankle|face)\s+(?:\S+\s+){0,3}?(?:trapped|crushed|caught|jammed|cut|broken|burned|burnt|pinched)(?![a-z])|(?<![a-z])(?:trapped|crushed|jammed|cut|pinched|broke)\s+(?:my|his|her|their|a)\s+(?:finger|fingers|hand|hands|foot|feet|arm|arms|leg|legs|head|knee|back|toe|toes|thumb|eye|eyes|shoulder|wrist|ankle|face)(?![a-z])|(?<![а-яіїєґё])(?:защеми\S*|прищеми\S*|затисну\S*|зажал\S*|зажало|порізав\S*|порезал\S*|придави\S*|придавил\S*)\s+(?:\S+\s+){0,2}?(?:пал\S*|рук\S*|ног\S*|кист\S*|ступн\S*)|(?<![a-zäöüß-])(?:ich|bin|fahrer|fahrerin|kollege|kollegin|er|sie|jemand|person|mitarbeiter|mitarbeiterin|beifahrer|beifahrerin|lagerist|staplerfahrer)\s+(?:\S+\s+){0,5}?(?:gest(?:ü|ue)rzt|hingefallen|runtergefallen|heruntergefallen|abgest(?:ü|ue)rzt|abgerutscht|ausgerutscht|gefallen)(?![a-zäöüß])|(?<![a-z])(?:i|driver|colleague|he|she|someone|worker|co-driver)\s+(?:\S+\s+){0,3}?(?:fell|has\s+fallen|slipped)\s+(?:off|from)\s+(?:the\s+)?(?:trailer|truck|deck|bed|tail\s*lift|loading\s+dock|ramp|platform|load)(?![a-z])|(?<![а-яіїєґё])(?:впав|впала|упав|упала|упал|зірвав\S*|сорвал\S*)\s+(?:\S+\s+){0,2}?(?:з|с|зі|со)\s+(?:причеп\S*|прицеп\S*|кузов\S*|платформ\S*|рамп\S*|гідроборт\S*|гидроборт\S*|напівпричеп\S*|полуприцеп\S*|даху|крыши|тенту|тента|вантаж\S*|груз\S*)`, 'i', 1);
const INJURY_WORDS = lbRx(String.raw`(?<![a-zäöüß-])(?:arbeits|betriebs)unf(?:ä|ae|a)ll\S*|(?<![a-zäöüß-])unfall\s+(?:beim|bei\s+der|bei\s+dem|w(?:ä|ae)hrend\s+(?:der|des|dem))\s+(?:\S+\s+)?(?:arbeit|(?:ab|be|ent|auf|um|ver)?laden|ladung|(?:ab|an|auf)?kuppeln|(?:ab|auf)?planen|sichern|zurren)\S*|(?<![a-z])(?:work(?:place)?|industrial|occupational)\s+accident|(?<![a-z])accident\s+(?:at\s+work|while\s+(?:un)?loading|during\s+(?:un)?loading)`, 'gi');
// [CLAUDE] Backlog 735 (30.10.2026, Blickwinkel „Schranke, Poller, Laterne, Zaun, Verkehrsschild oder Leitplanke angefahren – fremde Sache beschädigt“):
// eigene Schritte (anhalten und sichern, Gefahr durch den Gegenstand melden, nicht ohne Meldung weiterfahren – Eigentümer/Betreiber bzw. Polizei,
// Zettel reicht nicht, Fotos/Ort/Ansprechstelle, kein Schuldanerkenntnis, Auswahl „Kann das Fahrzeug fahren?“) statt der allgemeinen Unfall-Hinweise;
// Wildunfall, Unfallflucht, Brückenanprall und Schaden beim Kunden gehen vor. „Rolltor“, „Seitenwand“, „Kennzeichenschild“, „Mast vom Kran“,
// „Schranke geht nicht auf“, „Schranke ist auf den Auflieger gefallen“, Bordstein, Verneinungen lösen nichts aus – reine Information, keine Frist.
const FIXOBJ_HINT = lbRx(String.raw`(?<![a-zäöüß-])(?<!(?:kein|keine|keinen|ohne)\s+)(?:schranke|poller|(?:stra(?:ß|ss)en)?laterne|laternen(?:pfahl|mast)|(?:licht|strom|beleuchtungs|ampel)mast|leitpfosten|absperrpfosten|pfosten|pfahl|z(?:a|ä|ae)un|(?:verkehrs|stra(?:ß|ss)en|park)?schild|schilder|verkehrszeichen|(?:leit|schutz)planke|(?:baustellen)?absperrung|bake|ampel|(?:zapf|tank)s(?:ä|ae)ule|(?:hof|hallen|einfahrts|garagen|werks|firmen|grundst(?:ü|ue)cks|sektional|lager|rampen|kipp)?tor|toreinfahrt|(?:b(?:ü|ue)ro|hallen|lager|werkstatt|eingangs|haus|glas)t(?:ü|ue)r|mauer|(?:haus|hallen|geb(?:ä|ae)ude)wand|hausecke|geb(?:ä|ae)ude|vordach|carport|(?:strom|verteiler|schalt)kasten|hydrant|briefkasten|fahrradst(?:ä|ae)nder|park(?:schein)?automat|wartenh(?:ä|ae)uschen|wareh(?:ä|ae)uschen|blumenk(?:ü|ue)bel)(?:n|en|e|s|es|er)?(?![a-zäöüß])(?!\s+(?:hat|ist|fiel|fällt|faellt|ging|kam|war)(?![a-zäöüß]))\s+(?:(?!nicht\s|kein)\S+\s+){0,3}?(?:angefahren|umgefahren|weggefahren|abgefahren|gestreift|touchiert|gerammt|mitgenommen|erwischt|umgeknickt|umgerissen|abgerissen|eingedr(?:ü|ue)ckt|verbogen|besch(?:ä|ae|a)digt|kaputt\s?gefahren|demoliert)(?![a-zäöüß])|(?<![a-zäöüß-])(?:gegen|in|an)\s+(?:den|die|das|einen|eine|ein|dem|der)?\s*(?:\S+\s+)?(?:schranke|poller|(?:stra(?:ß|ss)en)?laterne|laternen(?:pfahl|mast)|(?:licht|strom|beleuchtungs|ampel)mast|leitpfosten|absperrpfosten|pfosten|pfahl|z(?:a|ä|ae)un|(?:verkehrs|stra(?:ß|ss)en|park)?schild|schilder|verkehrszeichen|(?:leit|schutz)planke|(?:baustellen)?absperrung|bake|ampel|(?:zapf|tank)s(?:ä|ae)ule|(?:hof|hallen|einfahrts|garagen|werks|firmen|grundst(?:ü|ue)cks|sektional|lager|rampen|kipp)?tor|toreinfahrt|(?:b(?:ü|ue)ro|hallen|lager|werkstatt|eingangs|haus|glas)t(?:ü|ue)r|mauer|(?:haus|hallen|geb(?:ä|ae)ude)wand|hausecke|geb(?:ä|ae)ude|vordach|carport|(?:strom|verteiler|schalt)kasten|hydrant|briefkasten|fahrradst(?:ä|ae)nder|park(?:schein)?automat|wartenh(?:ä|ae)uschen|wareh(?:ä|ae)uschen|blumenk(?:ü|ue)bel)(?:n|en|e|s|es|er)?(?![a-zäöüß])\s+(?:(?!nicht\s)\S+\s+){0,2}?(?:gefahren|gesto(?:ß|ss)en|geknallt|geprallt|gerutscht|gerollt|gesetzt|zur(?:ü|ue)ckgesetzt|gekracht)(?![a-zäöüß])|(?<![a-zäöüß-])(?:habe|hab|haben|hat)\s+(?:(?!nicht\s|kein)\S+\s+){0,4}?(?:eine?n?|die|den|das)\s+(?:\S+\s+)?(?:schranke|poller|(?:stra(?:ß|ss)en)?laterne|laternen(?:pfahl|mast)|(?:licht|strom|beleuchtungs|ampel)mast|leitpfosten|absperrpfosten|pfosten|pfahl|z(?:a|ä|ae)un|(?:verkehrs|stra(?:ß|ss)en|park)?schild|schilder|verkehrszeichen|(?:leit|schutz)planke|(?:baustellen)?absperrung|bake|ampel|(?:zapf|tank)s(?:ä|ae)ule|(?:hof|hallen|einfahrts|garagen|werks|firmen|grundst(?:ü|ue)cks|sektional|lager|rampen|kipp)?tor|toreinfahrt|(?:b(?:ü|ue)ro|hallen|lager|werkstatt|eingangs|haus|glas)t(?:ü|ue)r|mauer|(?:haus|hallen|geb(?:ä|ae)ude)wand|hausecke|geb(?:ä|ae)ude|vordach|carport|(?:strom|verteiler|schalt)kasten|hydrant|briefkasten|fahrradst(?:ä|ae)nder|park(?:schein)?automat|wartenh(?:ä|ae)uschen|wareh(?:ä|ae)uschen|blumenk(?:ü|ue)bel)(?:n|en|e|s|es|er)?(?![a-zäöüß])\s+(?:\S+\s+){0,1}?(?:angefahren|umgefahren|weggefahren|abgefahren|gestreift|touchiert|gerammt|mitgenommen|erwischt|umgeknickt|umgerissen|abgerissen|eingedr(?:ü|ue)ckt|verbogen|besch(?:ä|ae|a)digt|kaputt\s?gefahren|demoliert)(?![a-zäöüß])|(?<![a-z-])(?:hit|struck|clipped|knocked\s+(?:down|over)|ran\s+(?:into|over)|reversed\s+into|backed\s+into|drove\s+into|crashed\s+into|bumped\s+into|scraped|damaged|took\s+out)\s+(?:a|an|the|some|someone['’]?s|their|his|her)?\s*(?:\S+\s+)?(?:barriers?|barrier\s+(?:arm|gate)|bollards?|lamp\s?posts?|street\s?lights?|street\s?lamps?|light\s+poles?|(?:sign\s?)?posts?|poles?|fences?|(?:road|traffic|street)\s+signs?|signs?|guard\s?rails?|crash\s+barriers?|traffic\s+lights?|(?:fuel|petrol|diesel|gas)\s+pumps?|gates?|walls?|bus\s+shelters?|hydrants?|bins?|(?:warehouse|office|shop|garage|loading\s+bay|dock|building)\s+doors?)(?![a-z])|(?<![а-яіїєґ])(?:врізав(?:ся)?|врізалас[яь]|врезал(?:ся|ась)|зачепив|зачепила|задел|задела|збив|збила|сбил|сбила|пошкодив|пошкодила|повредил|повредила|наїхав\s+на|наїхала\s+на|наехал\s+на|наехала\s+на|в['’ʼ]?їха(?:в|ла)\s+[ву]|въехал[аи]?\s+в|(?:здав|здала|сдал|сдала)\s+назад\s+[ву]|задом\s+[ву])\s+(?:\S+\s+)?(?:шлагбаум|стовп|стовпчик|столб|ліхтар|фонар|паркан|огорож|огради|забор|дорожн\S*\s+знак|знак|відбійник|отбойник|світлофор|светофор|(?:паливн|заправн|топливн)\S*\s+колонк|колонк|ворот|стін|стен|будинк|здани)\S*|(?<![a-z-])(?:barriers?|bollards?|fences?|gates?|walls?|(?:warehouse|office|shop|garage|loading\s+bay|dock|building)\s+doors?|lamp\s?posts?|posts?|signs?)\s+(?:was\s+|were\s+|got\s+)?(?:hit|struck|clipped|damaged|scraped|knocked\s+(?:down|over))\s+by\s+(?:the\s+|my\s+|our\s+|a\s+)?(?:truck|lorry|trailer|cab|mirror|vehicle|tail\s*-?lift)(?![a-z])|(?<![a-zäöüß-])(?:bin|sind)\s+(?:(?:r(?:ü|ue)ckw(?:ä|ae)rts|beim\s+rangieren|beim\s+zur(?:ü|ue)cksetzen|leicht|voll|seitlich|mit\s+dem\s+\S+)\s+)?gegen\s+(?:den|die|das|einen|eine|ein|dem|der)?\s*(?:poller|schranke|laterne|pfosten|pfahl|zaun|schild|tor|mauer|wand|ampel|leitplanke|bake|s(?:ä|ae)ule|rampe)(?:n|en|e|s|es)?(?![a-zäöüß])(?!\s+[a-zäöüß0-9])`, 'i', 1);
// Backlog 302 (Blickwinkel „Rauch oder Brandgeruch aus dem Motorraum“): Rauch/Brand/Schmorgeruch am Fahrzeug → Hinweise (sicher anhalten,
// Motor aus, alle raus, Abstand, Notruf; löschen nur ohne Gefahr und unterwiesen, Haube/Kabine nicht weit öffnen, Gefahrgut-Papiere für die
// Feuerwehr; danach Leitung, Stelle/Farbe/Geruch notieren; „Kritisch“ + „nicht fahrbereit“) – reine Information, keine Frist, keine Nummer.
// „Feuerlöscher abgelaufen“, „Rauchen verboten“, „Nichtraucher“, „Abblendlicht brennt nicht“, „Motorkontrollleuchte brennt“, „Rauch aus dem
// Auspuff“, „fire extinguisher missing“, „no smoking“, „Загорівся індикатор двигуна“, „Фара не горить“ lösen nichts aus
// Backlog 351: „aus dem Auspuff kommt Rauch“ → Motor-Hinweis, nicht Brand; ukrainisch „з вихлопної труби дим“ ebenso
// Backlog 349: auch „riecht verbrannt/verschmort“, „riecht nach Gas“, „Gasgeruch“, „smells burnt“, „пахне гаром“
// Backlog 582: Umschrift „pozhar“, „dym iz motora“
const FIRE_HINT = lbRx(String.raw`(?<![a-z])pozh[ae]r(?:a|u|e|om)?(?![a-z])|(?<![a-z])dym\s+(?:iz|z)\s+|(?<![a-zäöüß])(?<!auspuff\s+(?:kommt|kommen|steigt|steigen|qualmt\s+es|raucht\s+es)\s+(?:\S+\s+){0,2}?)(?:rauch(?:entwicklung|wolke)?|raucht|qualm|qualmt)(?![a-zäöüß])(?!\s+(?:\S+\s+){0,3}?(?:auspuff|abgas))|brandgeruch|schmorgeruch|verschmort|(?:fahrzeug|kabel|motor|reifen|bremsen)brand|(?<![a-zäöüß])in\s+brand|(?<![a-zäöüß])flammen?(?![a-zäöüß])|(?<![a-zäöüß])feuer(?![a-zäöüß])|(?<![a-zäöüß])es\s+brennt|(?<![a-zäöüß])(?:motor|motorraum|reifen|rad|bremse|bremsen|kabine|fahrerhaus|fahrzeug|lkw|auflieger|anhänger|ladung|kabel|kühlaggregat)\s+brennt(?!\s+nicht)|(?<![a-z])smoke(?![a-z])(?!\s+(?:\S+\s+){0,3}?(?:exhaust|detector))|(?:engine|brakes?|wheel|tyre|tire|cab|truck|trailer)\s+(?:is\s+|was\s+)?smoking|burning\s+smell|smell\s+of\s+burning|on\s+fire|caught\s+fire|(?<![a-z])fire(?![a-z])(?!\s+extinguisher)|(?<![a-z])flames?(?![a-z])|(?<![а-яіїєґ])(?<!(?:вихлоп|выхлоп|глушник|глушител|труб)[а-яіїєґ]*\s+)(?:дим|диму|димом|дым|дыма|дымом|димить|дымит|димит|дымится)(?![а-яіїєґ])(?!\s+(?:\S+\s+)?(?:з|із|из)\s+(?:\S+\s+)?(?:вихлоп|выхлоп|глушник|глушител))|запах\S*\s+(?:\S+\s+)?(?:гар|горіл|горел|пален)|пожеж|пожар|(?:горить|горит|палає)\s+(?:двигун|мотор|колес|шин|кабін|кабин|авто|машин|вантажівк|причіп|прицеп|проводк)|(?:двигун|мотор|колесо|шина|кабіна|кабина|машина|вантажівка|проводка)\S*\s+(?:горить|горит|загорів|загорілас|загорел|палає)|(?<![a-zäöüß-])riecht\s+(?:\S+\s+){0,2}?(?:verbrannt|verschmort|angebrannt|nach\s+(?:verbranntem|verschmortem|gas|rauch))|(?<![a-zäöüß-])gasgeruch|(?<![a-z-])smells?\s+(?:\S+\s+)?(?:burnt|burned|of\s+gas)|(?<![а-яіїєґ])(?:пахне|пахнет)\s+(?:\S+\s+)?(?:гар\S*|горіл\S*|горел\S*|газ\S*)|(?<![a-zäöüß-])(?:bremse|bremsen|rad|r(?:ä|ae)der|reifen|nabe|trommel|trommeln)\s+(?:\S+\s+){0,2}?(?:rauchen|qualmen)(?![a-zäöüß])|(?<![a-zäöüß-])(?:stinkt|stinken|riecht|riechen)\s+(?:\S+\s+){0,2}?(?:verbrannt\S*|verschmort\S*|angebrannt\S*)|(?<![a-zäöüß-])verschmort(?:er|en|es)?\s+geruch`, 'i', 1);
// Backlog 303 (Blickwinkel „Kühlaggregat des Kühlaufliegers fällt unterwegs aus“): Störung am Kühlgerät → Hinweise (sofort Leitung/
// Disposition, Türen geschlossen halten; Display mit Ist-/Solltemperatur und Fehlercode fotografieren, Uhrzeit, Temperaturausdruck aufbewahren;
// nur unterwiesene einfache Prüfungen, nichts am Kältekreislauf öffnen; Ware und Liefertermin notieren – Umladen entscheidet die Disposition;
// Fahrbereitschaft „Eingeschränkt“, sonst „nicht fahrbereit“/„Weiß nicht“) – reine Information, keine Frist, keine Temperaturgrenze.
// „Kühlwasser läuft aus“, „Motortemperatur zu hoch“, „Klimaanlage kühlt nicht“, „Kühlaggregat Wartung fällig“, „Kühlschrank in der Kabine
// defekt“, „cab fridge broken“, „engine cooling fan broken“, „Кондиціонер не працює“, „Охолоджувальна рідина тече“ lösen nichts aus
const REEFER_HINT = lbRx(String.raw`(?<![a-zäöüß-])(?:(?:k(?:ü|ue)hl)?aggregat(?:s|es)?|k(?:ü|ue)hlger(?:ä|ae)t(?:s|es)?|k(?:ü|ue)hlmaschine|thermo\s?king|carrier)(?![a-zäöüß])\s+(?:[^\s.;!?,]+\s+){0,2}?(?:batterie|akku|tank|diesel)(?:s|n)?\s+(?:ist\s+|sind\s+)?(?:leer|alle|platt|tot)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced))|(?<![a-zäöüß-])(?:batterie|akku|tank)(?:s|n)?\s+(?:vom|von\s+der|von\s+dem|des|am)\s+(?:k(?:ü|ue)hl)?(?:aggregat(?:s|es)?|ger(?:ä|ae)t(?:s|es)?)\s+(?:ist\s+)?(?:leer|alle|platt|tot)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced))|(?<![a-zäöüß-])(?:k(?:ü|ue)hl)?aggregat(?:e)?tank(?:s)?\s+(?:ist\s+)?(?:leer|alle)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced))|(?<![a-zäöüß-])(?:k(?:ü|ue)hl)?aggregat\s+hat\s+(?:keinen\s+(?:diesel|sprit|kraftstoff)|keine\s+batterie)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced))|(?<![a-zäöüß-])(?:k(?:ü|ue)hlung|k(?:ü|ue)hlaggregat|aggregat|k(?:ü|ue)hlger(?:ä|ae)t|k(?:ü|ue)hlmaschine|thermo\s?king|carrier)(?![a-zäöüß])\s+(?:\S+\s+){0,2}?(?:spinnt|zickt|piept|spielt\s+verr(?:ü|ue)ckt|macht\s+(?:\S+\s+)?(?:faxen|zicken|was\s+es\s+will)|zeigt\s+(?:\S+\s+)?(?:alarm|fehler\S*|st(?:ö|oe)rung))(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced))|(?:(?<![a-z])(?:trailer|reefer|box|load|cargo)\s+temp(?:erature)?\s+(?:is\s+)?(?:too\s+high|too\s+warm|high|rising|out\s+of\s+range)|(?<![a-z])carrier\s+(?:unit\s+)?(?:fault|error|alarm|not\s+working)|(?<![а-яіїєґё])температур\S*\s+(?:в|у)\s+(?:причеп\S*|прицеп\S*|напівпричеп\S*|полуприцеп\S*|рефрижератор\S*|холодильник\S*)\s+(?:\S+\s+)?(?:висок\S*|высок\S*|піднял\S*|поднял\S*|росте|растет|завелик\S*))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![a-zäöüß-])k(?:ü|ue)hl(?:auflieger|sattelauflieger|koffer|kofferaufbau|aufbau|anh(?:ä|ae)nger|trailer)(?:s|n)?(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:k(?:ü|ue)hlt\s+(?:\S+\s+)?nicht|wird\s+(?:\S+\s+)?nicht\s+(?:kalt|k(?:ü|ue)hl)|st(?:ö|oe)rung|alarm|ausgefallen|aggregat\s+(?:\S+\s+)?(?:aus|defekt|ausgefallen))(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?:k(?:ü|ue|u)hl(?:aggregat|ger(?:ä|ae|a)t|maschine|anlage)|k(?:ä|ae|a)lte(?:aggregat|maschine|anlage)|thermo\s*king|frigoblock|(?<![a-zäöüß])k(?:ü|ue|u)hlung|temperatur(?:schreiber|rekorder|recorder|drucker)|thermo(?:schreiber|drucker)|datenlogger|thermogra(?:ph|f))\S*\s+(?:\S+\s+){0,4}?(?:ausgefallen|f(?:ä|ae|a)llt\s+aus|aus(?![a-zäöüß])|defekt|kaput|alarm|st(?:ö|oe|o)rung|fehler|k(?:ü|ue|u)hlt\s+nicht|springt\s+nicht|startet\s+nicht|geht\s+nicht|l(?:ä|ae|a)uft\s+nicht|ausgegangen|zeigt\s+nichts|druckt\s+nicht)|(?:störung|ausfall|alarm)\s+(?:\S+\s+)?(?:kühlaggregat|kühlgerät|kühlmaschine|kälteaggregat|kühlung)|(?:laderaum|k(?:ü|ue|u)hlraum|k(?:ü|ue|u)hlkoffer|k(?:ü|ue|u)hlauflieger|k(?:ü|ue|u)hlware|tiefk(?:ü|ue|u)hlware)\S*\s+(?:\S+\s+){0,3}?(?:zu\s+warm|wird\s+warm|taut|aufgetaut)|temperatur\s+(?:im|in\s+der|in\s+dem|des)\s+(?:laderaum|k(?:ü|ue|u)hlraum|k(?:ü|ue|u)hlkoffer|auflieger|koffer)\S*\s+(?:\S+\s+)?(?:steigt|zu\s+hoch)|(?:reefer|fridge\s+unit|refrigeration(?:\s+unit)?|chiller|(?<!engine\s)cooling\s+unit|thermo\s*king|carrier\s+transicold|temperature\s+(?:recorder|printer)|thermo\s+printer|data\s*logger)\s+(?:\S+\s+){0,3}?(?:failed|failure|fault|broken|down|not\s+working|not\s+printing|stopped|alarm|won['’]?t\s+start|not\s+cooling|cut(?:s|ting)?\s+out|shut(?:s|ting)?\s+(?:down|off))|(?:trailer|load|cargo)\s+(?:is\s+)?(?:getting\s+)?(?:too\s+)?warm|temperature\s+(?:\S+\s+)?rising\s+in\s+the\s+(?:trailer|load|box)|(?:холодильн|рефрижератор|реф(?![а-яіїєґ])|термописа|терморег[іи]стратор|ре[єе]стратор\s+температур|регистратор\s+температур|охолоджувальн\S*\s+установк|холодильная\s+установк)\S*\s+(?:\S+\s+){0,4}?(?:не\s+працю|не\s+работа|зламав|сломал|вийш\S*\s+з\s+ладу|выш\S*\s+из\s+строя|вимкну|выключ|(?<!не\s|(?:кабін|кабин)\S*\s+(?:\S+\s+){0,2})(?:вимика|відключа|отключа|выключа)\S*ся|не\s+охолоджу|не\s+охлажда|помилк|ошибк|аварі|авари|не\s+запуска|не\s+заводит)|(?<![а-яіїєґё])(?:холодильн|рефрижератор|реф(?![а-яіїєґё]))\S*\s+(?:\S+\s+){0,3}?(?:не\s+холод|не\s+мороз|не\s+морож|не\s+трима\S*\s+температур|не\s+держ\S*\s+температур)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![a-zäöüß])(?:ware|ladung)\s+(?:\S+\s+){0,2}?(?<!nicht\s)(?<!nie\s)zu\s+warm(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![a-zäöüß-])temperaturalarm(?![a-zäöüß])(?!\s+(?:\S+\s+)?(?:quittiert|weg|aus))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))`, 'i', 1);
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
const BRAKE_HINT = lbRx(String.raw`(?<![a-zäöüß-])(?:keine|kaum|kaum\s+noch|kaum\s+mehr|wenig|keine\s+richtige|fast\s+keine)\s+bremswirkung(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung|da)|fixed|repaired|replaced))|(?<![a-zäöüß-])kein(?:en)?\s+(?:luft)?druck\s+(?:mehr\s+)?(?:auf|in|an)\s+(?:der|den)\s+bremse(?:n)?(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung|da)|fixed|repaired|replaced))|(?<![a-zäöüß-])keine\s+luft\s+(?:mehr\s+)?(?:im|in\s+den|in\s+der)\s+(?:kessel|vorratsbeh(?:ä|ae)lter|druckluftbeh(?:ä|ae)lter|bremskreis|bremsanlage|druckluftanlage)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung|da)|fixed|repaired|replaced))|(?<![a-zäöüß-])(?:es\s+)?zischt\s+(?:\S+\s+)?(?:hinten|vorne|unten|unterm\s+(?:lkw|auflieger|anh(?:ä|ae)nger)|st(?:ä|ae)ndig|dauernd|die\s+ganze\s+zeit)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced))|(?<![a-zäöüß-])(?:druck)?luft\s+(?:\S+\s+)?entweicht(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced))|(?:(?<![a-z])brake\s+(?:pads?|linings?|shoes?)\s+(?:\S+\s+){0,2}?(?:worn|wear\s+warning|down\s+to\s+(?:the\s+)?metal|metal\s+on\s+metal|gone|finished)|(?<![a-z])brake\s+discs?\s+(?:\S+\s+)?(?:cracked|scored|warped|worn)|(?<![a-zäöüß-])brems(?:bel(?:ag|(?:ä|ae)ge)|backen|kl(?:ö|oe)tze)\s+(?:\S+\s+)?(?:verschlissen|abgefahren|runter|unten|durch|am\s+ende|fertig)(?![a-zäöüß])|(?<![a-zäöüß-])bremsen\s+(?:sind\s+)?(?:\S+\s+)?(?:verschlissen|abgefahren)|(?<![а-яіїєґё])(?:(?:гальмівн|тормозн)\S*\s+)?колодк\S*\s+(?:\S+\s+)?(?:стерл\S*|стерт\S*|зношен\S*|изношен\S*|закінчил\S*|закончил\S*)|(?<![а-яіїєґё])(?:гальмівн|тормозн)\S*\s+диск\S*\s+(?:\S+\s+)?(?:трісну\S*|тресну\S*|трісн\S*|лопну\S*|зношен\S*|изношен\S*))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![a-zäöüß-])(?:rad|r(?:ä|ae)der|achse)\s+(?:\S+\s+)?blockier\S*(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![a-z])(?:wheels?|axle)\s+(?:is\s+|are\s+|keeps\s+)?(?:locked|locking|locks\s+up)(?:\s+up)?(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![а-яіїєґё])(?:колес\S*|вісь|ось)\s+(?:\S+\s+)?(?:заклинил\S*|заклинило|заблоку\S*|заблокир\S*|блоку\S*|блокир\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![а-яіїєґё])(?:ретардер\S*|інтардер\S*|интардер\S*|гальмо[\s-]+ретардер\S*|моторн\S*\s+гальм\S*|моторн\S*\s+тормоз\S*)\s+(?:\S+\s+){0,2}?(?:не\s+(?:працю|работа|гальму|тормоз|вмика|включа)|злама[вл]|сломал|відмовив|отказал|вийшов\s+з\s+ладу)\S*(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?<![a-zäöüß-])(?<!(?:hydraulik|hydraulikpumpe|kipper|kran|ladekran|ladebordwand|hebeb(?:ü|ue)hne|pumpe)\s+(?:\S+\s+){0,3})(?:baut|bauen)\s+(?:\S+\s+){0,2}?(?:keine[nr]?|kaum|nicht\s+genug|zu\s+wenig|nur\s+langsam)\s+(?:luft|luftdruck|druck|bremsdruck|vorratsdruck)\s+(?:mehr\s+)?auf(?![a-zäöüß])|(?<![a-zäöüß-])keine\s+luft\s+(?:mehr\s+)?(?:im\s+(?:system|kessel|luftkessel|bremssystem)|in\s+(?:den|der)\s+(?:kesseln|luftkesseln|bremsanlage))(?![a-zäöüß])|(?<![а-яіїєґё])не\s+(?:набирає|качає|набирает|качает)\s+(?:повітря|воздух|тиск|давление)|(?<![a-zäöüß])bremst\s+(?:(?:der|die|das|er|sie|es|seit|heute|gestern|bergab|beim|im|auf|nur|noch|fast|irgendwie|wieder|richtig|gar|ganz|sehr|zu|immer|schon|mehr)[,;]?\s+){0,3}(?:nicht|kaum|schlecht|schwach|schw(?:ä|ae|a)cher|ungleichm(?:ä|ae|a)(?:ß|ss)ig|einseitig)(?![a-zäöüß])(?!\s+(?:\S+\s+)?(?:rechtzeitig|ab(?![a-zäöüß])))|(?<![a-z])(?:(?:is|was|are)n['’]?t|not|barely|hardly)\s+braking(?![a-z])|(?<![a-z])(?:won['’]?t|doesn['’]?t|don['’]?t|does\s+not|will\s+not)\s+brake(?![a-z])(?!\s+(?:in\s+time|early))|(?<![a-z])brakes?\s+(?:badly|poorly|weakly)(?![a-z])|(?<![а-яіїєґ])(?:не|погано|слабо|ледве|плохо|еле)\s+(?:гальму(?:є|ють)|тормоз(?:ит|ят))(?![а-яіїєґ])|(?<![a-zäöüß])(?:(?:anh(?:ä|ae|a)nger|auflieger|trailer)[- ]?)?(?:ebs|abs)(?:-?(?:stecker|kabel|steckdose|leitung|system|anlage))?(?:-|(?![a-zäöüß])\s+(?:\S+\s+){0,2}?)(?:warnung|fehler\S*|st(?:ö|oe)rung|defekt|kaputt|ausgefallen|fault|warning|failure)(?![a-zäöüß])(?!\s+(?:\S+\s+)?(?:behoben|repariert|gel(?:ö|oe)scht|cleared|fixed))|(?<![a-zäöüß])brems(?:e|en)\s+(?:\S+\s+){0,2}?(?:quie?tsch\S*|kaput(?![a-zäöüß])|funktionier\S*\s+nicht|geht\s+(?:(?:tief|ganz|fast|komplett|bis)\s+){0,2}?(?:durch|zum\s+boden))|(?<![a-zäöüß])brems[\s-]*(?:belag|bel(?:ä|ae|a)ge|scheiben?|pedal)\S*\s+(?:\S+\s+){0,2}?(?:abgefahren|runter|gerissen|hat\s+(?:einen\s+)?riss|geht\s+(?:(?:tief|ganz|fast|komplett|bis)\s+){0,2}?(?:durch|zum\s+boden)|kaput\S*|defekt)|(?<![a-z])tormoz\S*\s+(?:\S+\s+){0,2}?(?:ne\s+(?:rabota|derzh)|slab|skrip|ploh)|(?<![a-zäöüß])(?:bremsen?|bremsscheibe\S*|bremsbel(?:ä|ae|a)g\S*|bremstrommel\S*|feststellbremse|handbremse|betriebsbremse|motorbremse|dauerbremse|retarder|intarder|bremspedal|bremswirkung|bremsdruck|vorratsdruck|druckluft|bremsleitung\S*)\s+(?:\S+\s+){0,3}?(?:zieht|ziehen|quietsch\S*|schleif\S*|rubbel\S*|greift|greifen|weich|fest(?![a-zäöüß])|festgegangen|eingefroren|festgefroren|angefroren|zugefroren|friert\s+(?:\S+\s+)?fest|blockier\S*|heiß|heiss|stinkt|klemmt|löst\s+nicht|zisch\S*|verliert|fällt|schwach|nachl(?:ä|ae|a)(?:ss|ß)t|l(?:ä|ae|a)(?:ss|ß)t\s+nach|vibrier\S*|pulsier\S*|ungleichmäßig|einseitig|kein\s+druck|zu\s+wenig|niedrig|defekt|kaputt|ausgefallen|f(?:ä|ae|a)llt\s+aus|funktioniert\s+nicht|geht\s+nicht(?![a-zäöüß])|ohne\s+funktion|fehler\S*|st(?:ö|oe|o)rung)|zieht\s+(?:\S+\s+){0,3}?beim\s+bremsen|beim\s+bremsen\s+(?:\S+\s+){0,3}?(?:quietsch|schleif|rubbel|vibrier|zieht|ruckelt|geräusch|schlägt)|(?<![a-zäöüß])(?<!(?:reifen|rdks|tpms)\S*\s+(?:\S+\s+){0,2})(?:druck|luft)verlust(?!\s+(?:\S+\s+)?(?:am\s+|im\s+)?reifen)|(?:luft|druckluft)\s+(?:\S+\s+){0,2}?zisch|(?<![a-zäöüß-])zisch\S*\s+(?:\S+\s+){0,3}?(?:luft|brems|druckluft|bremsluft)leitung|(?<![a-z])air\s+(?:leak(?:s|ing)?|is\s+leaking|hissing)(?![a-z])(?![^.;!?]*(?:tyre|tire|wheel|conditioning|con(?![a-z])))|(?<![a-z])hissing\s+(?:\S+\s+){0,2}?air(?![a-z])|(?<![а-яіїєґ])(?:шипить\s+(?:\S+\s+)?повітря|повітря\s+(?:\S+\s+)?шипить|шипит\s+(?:\S+\s+)?воздух|воздух\s+(?:\S+\s+)?шипит)(?![^.;!?]*(?:шин|колес|кондиц))|druckluftleitung\S*\s+(?:\S+\s+){0,2}?(?:undicht|leck|zisch\S*|geplatzt|abgerissen)|(?<![a-z])(?:brakes?(?![a-z])(?!\s+(?:lights?|lamps?))|brake\s+(?:pedal|pads?|discs?|drums?|pressure|lines?)|handbrake|parking\s+brake|air\s+(?:pressure|line|system|tanks?|reservoirs?)|retarder|intarder)\s+(?:\S+\s+){0,3}?(?:pull\S*|squeal\S*|squeak\S*|grind\S*|judder\S*|spongy|soft|stuck|seiz\S*|lock\S*|hot|smell\S*|hiss\S*|losing|lost|low|weak|fad\S*|vibrat\S*|not\s+working|failing|failed|drops?|dropping|faulty|fault|failure|broken|(?:doesn|isn|don|aren)['’]?t\s+work(?:ing)?)|pulls?\s+(?:\S+\s+){0,3}?when\s+braking|when\s+braking\s+(?:\S+\s+){0,3}?(?:squeal|grind|judder|vibrat|noise|pull)|(?:гальм|тормоз)\S*\s+(?:\S+\s+){0,3}?(?:примерз|замерз|змерз|тягн|тяне|тянет|тянут|вед[еу]|скрип|свист|скрегоч|скреж|м['’]?як|мягк|клин|заклин|гаряч|горяч|не\s+трима|не\s+держ|не\s+працю|не\s+работа|слаб|вібру|вибри|пахн|запах)|(?:тягне|веде|тянет|ведет)\s+(?:\S+\s+){0,2}?(?:при\s+гальмуванні|при\s+торможении)|(?:тиск|давлен)\S*\s+(?:\S+\s+){0,2}?(?:повітр|воздух)\S*\s+(?:\S+\s+)?(?:пада|низьк|низк)|(?:повітр|воздух)\S*\s+(?:\S+\s+)?(?:шипить|шипит|свистить|травить|травит)|(?<![a-zäöüß])(?:luftdruck|bremsdruck|vorratsdruck|systemdruck|druck)\s+(?:\S+\s+){0,2}?baut\s+sich\s+(?:\S+\s+)?nicht\s+(?:mehr\s+|richtig\s+)?auf|(?<![a-zäöüß])(?<!(?:k(?:ü|ue|u)hlaggregat\S*|aggregat\S*|klima|klimaanlage|k(?:ü|ue|u)hlung|kühlauflieger\S*)\s)(?:druckluft|luft)?kompressor(?![^.,;]*(?:k(?:ü|ue|u)hl|klima|aggregat))\s+(?:\S+\s+){0,2}?(?:l(?:ä|ae|a)uft\s+(?:\S+\s+)?(?:dauernd|st(?:ä|ae|a)ndig|durch|ununterbrochen|permanent)|pumpt\s+(?:\S+\s+)?nicht|f(?:ö|oe|o)rdert\s+(?:\S+\s+)?nicht)|(?<![a-zäöüß])(?:druckluft|luft)kompressor\s+(?:\S+\s+){0,2}?(?:defekt|kaputt|ausgefallen|geht\s+nicht)|(?<![a-z])air\s+pressure\s+(?:\S+\s+)?(?:not\s+building|won['’]?t\s+build|doesn['’]?t\s+build|isn['’]?t\s+building)|(?<![a-z])(?<!(?:reefer|fridge|unit|a\/c|ac|aircon|conditioning)\s)(?:air\s+)?compressor(?![^.,;]*(?:reefer|fridge|a\/c|air\s*con|cool))\s+(?:\S+\s+){0,2}?(?:running\s+(?:constantly|continuously|non-?stop|all\s+the\s+time)|not\s+pumping)|(?<![a-z])air\s+compressor\s+(?:\S+\s+){0,2}?(?:broken|faulty|failed|not\s+working)|(?:тиск|давлен)\S*\s+(?:\S+\s+){0,2}?(?:не\s+набира\S*|не\s+накачу\S*|не\s+підніма\S*|не\s+поднима\S*)|(?<![а-яіїєґ])(?:компресор|компрессор)\S*(?![^.,;]*(?:холод|кондиц|рефриж))\s+(?:\S+\s+){0,2}?(?:працює\s+постійно|постійно\s+працює|постоянно\s+работает|работает\s+постоянно|не\s+кача\S*|не\s+накачу\S*)|(?<![a-zäöüß-])(?:lufttrockner|lufttrockenpatrone|lufttrocknerpatrone|druckregler|vierkreisschutzventil|mehrkreisschutzventil)\s+(?:\S+\s+){0,3}?(?:bl(?:ä|ae|a)st\s+(?:\S+\s+)?ab|zisch\S*|undicht|defekt|kaputt|ausgefallen|vereist|eingefroren)(?![a-zäöüß])|(?<![a-z-])air\s+dryer\s+(?:\S+\s+){0,2}?(?:keeps\s+)?(?:purging|blowing(?:\s+off)?|hissing|leaking|faulty|broken|frozen)(?![a-z])|(?<![а-яіїєґ])(?:осушувач|осушител)\S*\s+(?:повітря\s+|воздуха\s+)?(?:\S+\s+)?(?:скида\S*|сбрасыва\S*|шипить|шипит|не\s+працю\S*|не\s+работа\S*|замерз\S*)|(?<![a-zäöüß-])(?:luft|druckluft|bremsluft|brems|versorgungs|kupplungs)schl(?:ä|ae|a)uch(?:e|es|s)?\s+(?:\S+\s+){0,3}?(?:undicht|leck(?![a-zäöüß])|zisch\S*|geplatzt|geborsten|gerissen|abgerissen|abgesprungen|porös|poroes|defekt|kaputt)|(?<![a-zäöüß-])(?:luft|brems)leitung(?:en)?\s+(?:\S+\s+){0,2}?(?:undicht|leck(?![a-zäöüß])|zisch\S*|geplatzt|gerissen|abgerissen)|(?<![a-z-])(?:air|brake|suzie|susie)\s+(?:hoses?|lines?|coils?)\s+(?:\S+\s+)?(?:burst|split|leak\S*|hiss\S*|ruptured|torn|came\s+off|ripped)(?![a-z])|(?<![а-яіїєґ])(?:повітрян|воздушн|гальмівн|тормозн)\S*\s+(?:шланг|магістрал|трубк)\S*\s+(?:\S+\s+)?(?:лопну|прорва|порва|розірва|зірва|сорва|трав|шипит|шипить|пропуска)\S*|(?<![a-zäöüß-])(?:luftkessel|druckluftkessel|luftbeh(?:ä|ae|a)lter|druckluftbeh(?:ä|ae|a)lter|drucklufttank|lufttank|druckluftanlage|luftanlage)(?:s|n)?\s+(?:\S+\s+){0,3}?(?:eingefroren|zugefroren|festgefroren|vereist|vol(?:l|ler)\s+wasser|undicht|zisch\S*)|(?<![a-zäöüß-])(?:kondens)?wasser\s+(?:\S+\s+)?im\s+(?:drucklufttank|lufttank|luftkessel|druckluftkessel|luftbeh(?:ä|ae|a)lter|druckluftbeh(?:ä|ae|a)lter|druckluftsystem|bremssystem)|(?<![a-z-])(?:brakes?|air\s+(?:tanks?|reservoirs?|lines?|system))\s+(?:\S+\s+){0,2}?frozen(?![a-z])|(?<![a-zäöüß-])(?:druckluft\S*|luftanlage|kompressor|luftpresser|bremsdruck|vorratsdruck|luftdruck|druck|luft)\s+(?:\S+\s+){0,3}?(?:baut|bauen|baute)\s+(?:sich\s+)?(?:\S+\s+){0,2}?(?:kein(?:en)?|nicht|kaum|nur\s+(?:sehr\s+)?langsam|zu\s+langsam)\s+(?:\S+\s+){0,2}?auf(?![a-zäöüß])|(?<![a-zäöüß-])(?:baut|bauen|baute)\s+(?:sich\s+)?(?:kein(?:en)?|nicht\s+genug|zu\s+wenig)\s+(?:luft|brems|vorrats)druck\s+(?:mehr\s+)?auf(?![a-zäöüß])|(?<![a-zäöüß-])kein(?:en)?\s+(?:luft|brems|vorrats)?druck(?:aufbau)?\s+(?:\S+\s+){0,2}?(?:im|in\s+der|am)\s+(?:druckluft\S*|luftkessel\S*|bremssystem|luftanlage)|(?<![a-z])(?:air(?:\s+pressure)?|pressure|compressor)\s+(?:\S+\s+){0,3}?(?:won['’]?t|doesn['’]?t|does\s+not|not|isn['’]?t|is\s+not|never)\s+(?:\S+\s+)?build(?:ing)?(?:\s+up)?|not\s+building\s+(?:up\s+)?(?:air\s+)?pressure|(?:тиск|давлен)\S*\s+(?:\S+\s+){0,2}?не\s+(?:набира|накачу|піднім|подніма)|(?<![a-zäöüß-])(?:betriebs)?bremse(?:n)?(?![^.;!?]*(?:repariert|getauscht|erneuert|behoben|gewechselt|wieder\s+in\s+ordnung|fixed|repaired|replaced|відремонт\S*|замінен\S*|отремонт\S*|заменен\S*))\s+(?:(?:sind|ist|waren|war|vorne|hinten|links|rechts|am|vom|auflieger|anh(?:ä|ae|a)nger|wohl|komplett|total|stark|extrem|sehr|nach|der|bergab(?:fahrt)?|im|gef(?:ä|ae)lle)\s+){0,3}(?:(?:ü|ue)berhitzt|gl(?:ü|ue)ht|gl(?:ü|ue)hen|riecht|riechen|stinkt|stinken|l(?:ä|ae)sst\s+(?:\S+\s+)?nach|lassen\s+(?:\S+\s+)?nach|fading)(?![a-zäöüß])|(?<![a-z])brakes?\s+(?:(?:are|is|were|was|very|really|on\s+the\s+trailer)\s+){0,2}(?:overheat\S*|glowing|fading|smell\S*|hot)(?![a-z])|(?<![а-яіїєґё])(?:гальм\S*|тормоз\S*)\s+(?:\S+\s+)?(?:перегрі\S*|перегре\S*|смерд\S*|воня\S*)|(?<![a-zäöüß-])zisch\S*\s+(?:\S+\s+){0,2}?(?:am|beim|vom|unter\s+dem|unterm|hinter\s+dem|hinten\s+am)\s+(?:anh(?:ä|ae|a)nger|auflieger|h(?:ä|ae)nger|trailer)(?![a-zäöüß])(?![^.;!?]*(?:reifen|rad(?![a-zäöüß])|ventil))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?<![a-z])hissing\s+(?:noise\s+|sound\s+)?(?:at|from|under|on|behind)\s+(?:the\s+)?trailer(?![a-z])(?![^.;!?]*(?:tyre|tire|wheel|valve))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-z-])brake\s+pedal\s+(?:\S+\s+){0,2}?(?:(?:goes|went|drops|dropped|falls|fell)\s+(?:\S+\s+){0,5}?floor|sinks|sinking|sank)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])педал\S*\s+(?:гальм\S*|тормоз\S*)\s+(?:\S+\s+)?(?:провалю\S*|проваливает\S*|провалил\S*|йде\s+в\s+підлогу|уходит\s+в\s+пол)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-z-])(?:parking\s+brake|handbrake|hand\s+brake|spring\s+brake)s?\s+(?:\S+\s+){0,2}?(?:won['’]?t|will\s+not|doesn['’]?t|does\s+not|can['’]?t|cannot)\s+release(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?:ручник|стоянков\S*\s+(?:гальм|тормоз)\S*)\s+(?:\S+\s+)?не\s+(?:відпуска\S*|отпуска\S*|знімає\S*|снимает\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?:помилк\S*|ошибк\S*)\s+(?:\S+\s+)?(?:ebs|abs)\s+(?:\S+\s+)?(?:причеп\S*|напівпричеп\S*|полуприцеп\S*|прицеп\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-zäöüß-])kupplungsk(?:ö|oe|o)pf(?:e)?\s+(?:\S+\s+){0,2}?(?:undicht|zisch\S*|verliert\s+(?:\S+\s+)?luft|defekt|kaputt|abgebrochen|abgerissen)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-z-])(?:(?:red|yellow)\s+(?:air\s+|brake\s+)?(?:line|hose|suzie|susie)s?|palm\s+couplings?|glad\s*-?hands?)\s+(?:\S+\s+){0,3}?(?:leak\S*|hiss\S*|broken|torn|ripped|split|damaged|faulty)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?<!(?:колес|шин|покришк|резин|балон|балл)\S*\s+(?:\S+\s+)?)(?:травить|травит|травлять|травят)\s+(?:\S+\s+)?(?:повітря|воздух)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?<![a-zäöüß-])(?:bremse|bremsen|bremspedal|betriebsbremse)(?![a-zäöüß])\s+(?:(?:geht|gehen|ist|sind|wird|wirkt|l(?:ä|ae)sst\s+sich|lassen\s+sich|seit\s+\S+|jetzt|heute|immer|total|sehr|extrem|richtig|ganz|irgendwie|etwas|bisschen|ein\s+bisschen)\s+){0,3}(?:schwer(?:g(?:ä|ae)ngig)?(?![a-zäöüß])(?!\s+(?:zu|auf)(?![a-zäöüß]))|h(?:ä|ae)ngt|h(?:ä|ae)ngen|f(?:ü|ue)hl(?:t|en)\s+sich\s+(?:\S+\s+)?(?:komisch|seltsam|anders|merkw(?:ü|ue)rdig|schwammig|weich|hart)\s+an)(?![a-zäöüß])(?!\s+(?:(?:mehr|so|gar|wirklich)\s+)?(?:nicht|nie|kaum)(?![a-zäöüß]))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|adjusted|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|відрегул\S*|отрегулир\S*))|(?<![a-zäöüß-])bremsweg(?:e|s)?(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:l(?:ä|ae)nger|zu\s+lang|sehr\s+lang|verl(?:ä|ae)ngert)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|adjusted|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|відрегул\S*|отрегулир\S*))|(?<![a-zäöüß-])(?:l(?:ä|ae)ngere[rnms]?|verl(?:ä|ae)ngerte[rnms]?)\s+bremsweg(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|adjusted|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|відрегул\S*|отрегулир\S*))|(?<![a-z-])brakes?\s+(?:(?:is|are|keep|keeps|seem|seems|feel|feels|feeling|a\s+bit|very|really|quite)\s+){0,2}(?:sticking|stick|dragging|grabbing|grab|binding|stiff|heavy|hard\s+to\s+press|(?:weird|strange|odd|funny|off)(?![a-z]))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|adjusted|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|відрегул\S*|отрегулир\S*))|(?<![a-z-])(?:longer|increased)\s+(?:braking|stopping)\s+distance|(?<![a-z-])(?:braking|stopping)\s+distance\s+(?:\S+\s+){0,2}?(?:longer|increased|too\s+long)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|adjusted|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|відрегул\S*|отрегулир\S*))|(?<![а-яіїєґё])(?:гальм\S*|тормоз\S*)\s+(?:\S+\s+)?(?:заїда\S*|заеда\S*|прихоплю\S*|прихватыва\S*|клин\S*|туг\S*|важк\S*|тяжел\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|adjusted|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|відрегул\S*|отрегулир\S*))|(?<![а-яіїєґё])(?:гальмівн\S*|тормозн\S*)\s+(?:шлях|путь)\s+(?:\S+\s+)?(?:довш\S*|збільши\S*|длинн\S*|увеличи\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|adjusted|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|відрегул\S*|отрегулир\S*))|(?<![a-zäöüß-])(?:riss|risse)\s+in\s+(?:der|den)\s+(?:\S+\s+)?bremsscheibe\S*(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*))|(?<![a-zäöüß-])bremsscheibe(?:n)?(?![a-zäöüß])\s+(?:(?:ist|sind|vorne|vorn|hinten|links|rechts|schon|ganz|total|stark|komplett)\s+){0,2}(?:blau(?:\s+angelaufen)?|verschlissen|abgenutzt|runter|riefig|eingelaufen|verzogen)(?![a-zäöüß])(?!\s+(?:mehr\s+)?nicht)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*))|(?<![a-zäöüß-])(?:brems)?bel(?:ä|ae)ge(?![a-zäöüß])\s+(?:(?:sind|ist|vorne|vorn|hinten|links|rechts|schon|ganz|total|komplett|fast)\s+){0,2}(?:durch|runter|unten|abgefahren|verschlissen|alle)(?=\s*(?:$|[.,;!?\n]))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*))|(?<![а-яіїєґё])(?:тріщин\S*|трещин\S*)\s+(?:\S+\s+)?(?:гальмівн\S*|тормозн\S*)\s+диск\S*(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*))|(?<![а-яіїєґё])(?:гальмівн\S*|тормозн\S*)\s+(?:диск\S*|колодк\S*)\s+(?:\S+\s+)?(?:зношен\S*|стерт\S*|стерл\S*|изношен\S*|тріснув\S*|тріснул\S*|треснул\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*))|(?<![а-яіїєґё])(?:замерзл\S*|замерз(?![а-яіїєґё])|примерзл\S*|змерзл\S*|замерзли|примерзли|змерзли|замерзн\S*)\s+(?:\S+\s+)?(?:гальм\S*|тормоз\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|замінив\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))`, 'i', 1);
// Backlog 305 (Blickwinkel „Plane des Aufliegers gerissen, Ladung nass“): Schaden an Plane/Aufbau oder nasse Ladung → Hinweise (anhalten,
// Ladung/Sicherung prüfen, nicht auf Dach oder Ladung klettern; Leitung/Disposition klärt mit dem Kunden; Fotos + Stelle/seit wann/Ladung nass;
// beim Kunden auf nasse Ware hinweisen und auf Lieferschein/Frachtbrief vermerken lassen; Fahrbereitschaft je nach Ladung) – reine Information,
// keine Frist. „Werkstatttermin planen“, „Reparatur planen, Spiegel kaputt“, „Dach undicht, Wasser tropft ins Fahrerhaus“, „Planenspanner fehlt“,
// „Ladung verrutscht“, „roof leaks into the cab“, „sheet metal damaged“, „Штора в кабіні порвана“ lösen nichts aus
// Backlog 634: Beschreibung nennt den Auflieger/Anhänger bzw. die Plane (nicht „Anhängerkupplung“/„Aufliegerkupplung“ – die sitzt an der Zugmaschine)
// Backlog 640 (Blickwinkel „Fremder Auflieger vom Kunden“): fremder/Kunden-Auflieger genannt → kein Hinweis auf den eigenen gekoppelten Auflieger
const FOREIGN_TRAILER = /kunde|kundin|fremd|customer|client|third[\s-]party|клієнт|замовник|чуж|заказчик|клиент/i;
const TRAILER_DMG = lbRx(String.raw`(?<![a-zäöüß])(?:auflieger|anhänger|anhaenger|sattelauflieger)(?!kupplung)|(?<![a-zäöüß])plane(?![a-zäöüß])|(?<![a-z])(?:trailer|curtain|tarp(?:aulin)?)(?!\s*(?:hitch|coupling))(?![a-z])|(?<![а-яіїєґ])(?:напівпричеп|полуприцеп|причіп|причеп|прицеп(?!н)|тент)`, 'i', 1);
const TARP_HINT = lbRx(String.raw`(?<![a-z-])curtain\s+(?:buckles?|straps?|poles?|rails?|ratchets?|tensioners?)\s+(?:(?:is|are|has|have|been)\s+){0,2}(?:broken|broke|snapped|missing|ripped|bent|torn|gone)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|sorted|no\s+longer))|(?:(?<![a-zäöüß])(?:plane|seitenplane|dachplane|schiebeplane|planenaufbau|planenverdeck|schiebeverdeck|verdeck)(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:klemm(?:t|en)|geht\s+nicht\s+(?:auf|zu)(?![a-zäöüß])|l(?:ä|ae|a)(?:ss|ß)t\s+sich\s+nicht\s+(?:\S+\s+)?(?:(?:ö|oe)ffnen|schlie(?:ß|ss)en|schieben|zuziehen)|gerissen|eingerissen|zerrissen|aufgerissen|kaputt|besch(?:ä|ae|a)digt|löchrig|hat\s+(?:ein\s+)?loch|flattert|lose|aufgeschlitzt|aufgeschnitten|zerschnitten|eingeschnitten|weggeflogen|undicht|h(?:ä|ae|a)ngt\s+(?:\S+\s+)?raus)|(?:loch|riss)\s+in\s+der\s+(?:\S+\s+)?plane(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|fixed|repaired|replaced|patched|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))|(?:ladung|ware|paletten?)\s+(?:\S+\s+){0,2}?(?:nass|durchnässt|feucht)(?![a-zäöüß])|wasser\s+(?:\S+\s+){0,2}?(?:im|in\s+den)\s+(?:laderaum|auflieger|anhänger|koffer)|(?<![a-z])(?:curtain|tarp(?:aulin)?|canvas|trailer\s+roof)\s+(?:\S+\s+){0,3}?(?:torn|ripped|tear|hole|flap(?:s|ping)|loose|damaged|slashed|cut|leaking|leaks)|(?:hole|tear|rip)\s+in\s+the\s+(?:curtain|tarp|trailer\s+roof)|(?:load|goods|cargo|pallets?)\s+(?:\S+\s+){0,2}?(?:wet|soaked|damp)(?![a-z])|water\s+(?:in|inside)\s+the\s+trailer|(?<![а-яіїєґ])тент\S*\s+(?:\S+\s+){0,3}?(?:порван|порвав|порвал|розірв|дірк|дыр|пошкод|поврежд|розрізан|розрізал|порізан|порізал|порезан|порезал|разрез|теліпа|болта|протіка|протека)|(?:вантаж|груз|товар|палет)\S*\s+(?:\S+\s+){0,2}?(?:мокр|намок|промок|вологий|сыр)|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-z-])(?:tarp(?:aulin)?|curtain\s*side|sliding\s+roof)s?\s+(?:\S+\s+){0,2}?(?:won['’]?t|will\s+not|doesn['’]?t|does\s+not|can['’]?t|cannot)\s+(?:\S+\s+)?(?:close|shut|open|lock|tension)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])тент\S*\s+(?:\S+\s+)?не\s+(?:закрива\S*|зачиня\S*|відкрива\S*|открыва\S*|натягу\S*|натяги\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-zäöüß-])(?:planenrahmen|planengestell|planenspriegel|spriegel)\s+(?:\S+\s+){0,2}?(?:verbogen|gebrochen|abgebrochen|eingedr(?:ü|ue)ckt|abgerissen|lose)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-zäöüß-])(?:loch|l(?:ö|oe)cher)\s+(?:\S+\s+){0,2}?(?:dachplane|plane|planendach)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-zäöüß-])(?:dachplane|plane|planendach)\s+(?:\S+\s+)?(?:hat\s+(?:ein\s+|mehrere\s+)?)?(?:loch|l(?:ö|oe)cher)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-z-])holes?\s+in\s+(?:the\s+)?(?:trailer(?:['’]s)?\s+roof|roof\s+of\s+the\s+trailer|tarp|curtain)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?:дірк\S*|дыр\S*)\s+(?:\S+\s+)?(?:в|у|на)\s+(?:тент\S*|дах\S*\s+(?:напів)?причеп\S*|крыш\S*\s+(?:полу)?прицеп\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не)))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*|усунул\S*|устранил\S*|полагодил\S*|починил\S*))|(?<![a-zäöüß-])(?:koffer(?:aufbau|dach|t(?:ü|ue)r|t(?:ü|ue)ren)?|aufbau|(?:auflieger|anh(?:ä|ae)nger|koffer)dach|dach\s+(?:vom|des)\s+(?:auflieger|anh(?:ä|ae)nger|koffer|aufbau)\S*)(?![a-zäöüß])\s+(?:(?:ist|sind|oben|hinten|vorne|wieder|total|komplett)\s+){0,2}(?:undicht|leckt|tropft)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|abgedichtet|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|patched|sealed|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))|(?<![a-zäöüß-])(?:regnet|tropft|l(?:ä|ae)uft\s+wasser)\s+(?:es\s+)?(?:in\s+den|ins|in\s+die|in\s+das)\s+(?:auflieger|anh(?:ä|ae)nger|koffer|aufbau|laderaum)\S*(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|abgedichtet|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|patched|sealed|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))|(?<![a-zäöüß-])(?:spriegel|dachspriegel|planenseil|planenseile|zollseil|zollschnur|planenspanner|planengurt|planengurte)(?![a-zäöüß])\s+(?:(?:ist|sind|hinten|vorne|links|rechts|komplett)\s+){0,2}(?:gerissen|kaputt|gebrochen|abgebrochen|verbogen|abgerissen|lose)(?![a-zäöüß])(?!\s+(?:mehr\s+)?nicht)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|abgedichtet|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|patched|sealed|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))|(?<![a-z-])curtains?\s+(?:\S+\s+)?(?:won['’]?t|will\s+not|doesn['’]?t|does\s+not|can['’]?t)\s+(?:close|shut|slide|lock|open)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|abgedichtet|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|patched|sealed|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))|(?<![a-z-])(?:water|rain)\s+(?:\S+\s+){0,2}?(?:coming|getting|leaking|dripping|gets|comes)\s+(?:in(?:to)?|inside)\s+(?:the\s+)?(?:trailer|box|body|load\s+area)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|abgedichtet|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|patched|sealed|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))|(?<![a-z-])(?:trailer|box\s+body|box)\s+(?:roof\s+)?(?:is\s+)?(?:leaking|leaks)(?![a-z])|(?<![a-z-])roof\s+(?:is\s+)?(?:leaking|leaks)\s+(?:in|on|of)\s+(?:the\s+)?(?:trailer|box)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|abgedichtet|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|patched|sealed|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))`, 'i', 1);
// Backlog 307 (Blickwinkel „Ladung verrutscht während der Fahrt“): Ladung/Paletten verrutscht, umgefallen, verloren bzw. Spanngurt gerissen – Anhalten,
// vorsichtig öffnen, Leitung klärt mit Versender/Kunden, Fotos, Fahrbereitschaft; „Ladung nass“ (Plane), „Ladungssicherung bemängelt“ (Kontrolle),
// Sicherheitsgurt und ukr. „вантажівка“ (Lkw) lösen nichts aus
const LOAD_HINT = lbRx(String.raw`(?<![a-zäöüß])(?:ladung|ware|waren|paletten?|kisten?|fracht|gitterboxen?|kartons?)\s+(?:\S+\s+){0,3}?(?:verrutscht|verschoben|umgefallen|umgekippt|gekippt|ins\s+rutschen|rutscht|eingestürzt|zusammengebrochen|heruntergefallen|runtergefallen|herausgefallen|rausgefallen|verloren|lose(?![a-zäöüß]))|(?:verrutscht|verschoben|umgefallen|umgekippt|heruntergefallen|verloren)e[nmrs]?\s+(?:\S+\s+)?(?:ladung|ware|paletten?|fracht|kisten?)|(?:(?:spann|zurr|lade|ratschen|rad|reifen)gurt|spannkette|zurrkette|radkette)\S*\s+(?:\S+\s+){0,2}?(?:gerissen|abgerissen|lose|gel(?:ö|oe|o)st|locker|kaputt|defekt)(?![a-zäöüß])|(?<![a-z])(?:load|cargo|freight|goods|pallets?|boxes|crates?)\s+(?:\S+\s+){0,3}?(?:shifted|shifting|slid|sliding|fell|fallen|toppled|collapsed|tipped|came\s+loose|has\s+moved|moved\s+(?:forward|backwards?|sideways))|(?:shifted|fallen|toppled|collapsed)\s+(?:load|cargo|pallets?|goods)|lost\s+(?:part\s+of\s+)?(?:the\s+|my\s+|its\s+)?(?:load|cargo)|(?:ratchet|lashing|cargo|load)\s+straps?\s+(?:\S+\s+)?(?:broke|broken|snapped|came\s+loose|loose)|(?<![а-яіїєґ])(?:вантаж(?:у|ем|і)?|груз(?:а|ом|у)?|палет\S*|паллет\S*|піддон\S*|поддон\S*|товар(?:и|ы)?)(?![а-яіїєґ])\s+(?:\S+\s+){0,3}?(?:зсунув|зсунул|змісти|зміщ|посунув|сдвинул|смести|смещ|переверну|переверн|впав|впал|упал|упав|завали|розсипа|рассыпа|випав|выпал)|(?:зсунув|зсунул|змісти|сдвинул|смести)\S*\s+(?:\S+\s+)?(?:вантаж|груз)(?![а-яіїєґ])|(?<![a-zäöüß-])(?:pkw|autos?|neuwagen|gebrauchtwagen|kundenfahrzeug(?:e)?|kundenwagen|geladene[nsm]?\s+(?:fahrzeug(?:e)?|wagen|pkw|autos?))(?![a-zäöüß])\s+(?:\S+\s+){0,4}?(?:verrutscht|verschoben|hat\s+sich\s+(?:\S+\s+)?gel(?:ö|oe|o)st|haben\s+sich\s+(?:\S+\s+)?gel(?:ö|oe|o)st|losgerissen|ist\s+lose|sind\s+lose|heruntergerollt|runtergerollt|weggerollt|nach\s+vorne\s+gerollt)(?![a-zäöüß])|(?<![a-z-])(?:cars?|vehicles?)\s+(?:on\s+(?:the\s+)?(?:upper\s+|lower\s+|top\s+)?(?:deck|trailer|ramp)\s+)(?:\S+\s+){0,2}?(?:shifted|moved|slid|came\s+loose|rolled)(?![a-z])|(?<![a-z-])(?:wheel|tyre|tire)\s+(?:straps?|chains?)\s+(?:\S+\s+)?(?:broke|broken|snapped|came\s+loose|loose)(?![a-z])|(?<![а-яіїєґ])(?:авто|автомобіл\S*|автомобил\S*|машин[аиу])\s+(?:на\s+(?:верхньому\s+|нижньому\s+)?(?:ярус\S*|платформ\S*)\s+)?(?:\S+\s+){0,2}?(?:зсунул\S*|змістил\S*|сдвинул\S*|сместил\S*|відірвал\S*|оторвал\S*|скотил\S*)|(?<![а-яіїєґ])(?:лашинг\S*|ремен\S*\s+кріплен\S*|кріпильн\S*\s+ремен\S*|стяжк\S*|ланцюг\S*\s+кріплен\S*)\s+(?:\S+\s+)?(?:порвал\S*|порвав\S*|розірвал\S*|лопнув|лопнул\S*|злама[вл]\S*)|(?<![a-zäöüß-])(?:verliert|verlor|verloren\s+hat)\s+(?:\S+\s+){0,2}?ladung(?![a-zäöüß])|(?<![a-zäöüß-])ladung\s+(?:\S+\s+){0,2}?(?:f(?:ä|ae)llt|fiel)\s+(?:\S+\s+)?(?:runter|herunter|raus|heraus|auf\s+die\s+(?:fahrbahn|stra(?:ß|ss)e))|(?<![a-z])(?:losing|lost|dropped|shed)\s+(?:part\s+of\s+)?(?:the\s+|its\s+|some\s+)?(?:load|cargo)(?![a-z])`, 'i');
// [CLAUDE] Backlog 692 (30.10.2026, Blickwinkel „Vor dem Laden: Zurrgurte, Kantenschutz oder Antirutschmatten fehlen bzw. sind beschädigt“): Ladungssicherungsmittel fehlen,
// zu wenige, eingerissen/ausgefranst, Ratsche/Sperrbalken defekt → Schritte (nicht ohne ausreichende Sicherung laden/losfahren, Leitung klärt Ersatz; beschädigte Gurte aussortieren;
// was/wie viele fehlen, Fotos; Auswahl „Kann das Fahrzeug fahren?“) – reine Information, keine Frist, keine Mengen. Verrutschte Ladung bleibt bei LOAD_HINT.
// „Sicherheitsgurt defekt“ (Sitz), „Gurte nachbestellt“, „Zurrgurte wieder da“, „Kantenschutz nötig“ nicht.
const LASHGEAR_HINT = lbRx(String.raw`(?<![а-яіїєґё])(?:стяжн\S*|такелажн\S*|кріпильн\S*|крепежн\S*)\s+(?:ремін\S*|ремен\S*|стрічк\S*|лент\S*)\s+(?:\S+\s+)?(?:порва\S*|розірва\S*|лопну\S*|злама[вл]\S*|сломал\S*|пошкодж\S*|поврежд\S*|зношен\S*|изношен\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![a-zäöüß])(?:(?:zurr|spann|ratschen|lade|ladungs)gurt(?:e|en|s)?|gurte|rungen?|steckrungen?|einstecklatten|kantensch(?:ü|ue|u)tz(?:e|er)?|kantenschoner|ecksch(?:ü|ue|u)tz(?:e|er)?|antirutschmatten?|rutschhemmende\s+matten|ladungssicherungsmittel|sicherungsmittel|ladungssicherung|sperrbalken|sperrstangen?|klemmbretter|klemmbalken|ladungssicherungsnetze?|zurrketten?|(?:spann|zurr)?ratschen?|zurrpunkte?|zurr(?:ö|oe)sen?)(?![a-zäöüß])\s+(?:(?:sind|ist|wurden|wurde|nicht|nur|noch|keine|kein|mehr|im|am|auf|dem|der|den|lkw|auflieger|fahrzeug|alle|zwei|drei|einige|mehrere|komplett|total|stark|teilweise|schon|wieder|seit|heute|gestern|an\s+bord)[,;]?\s+){0,3}(?:fehl(?:t|en)|zu\s+wenig(?:e)?|nicht\s+(?:mehr\s+)?(?:da|vorhanden|an\s+bord|genug|ausreichend)|weg(?![a-zäöüß])|verschwunden|kaputt|defekt|besch(?:ä|ae|a)digt|eingerissen|angerissen|eingeschnitten|ausgefranst|durchgescheuert|verschlissen|abgenutzt|verbogen|klemm(?:t|en)|ausgerissen|abgerissen|gebrochen|ohne\s+etikett|etikett\s+fehlt)(?![a-zäöüß])(?!\s+(?:\S+\s+)?(?:wieder\s+da|ersetzt|nachbestellt|nachgef(?:ü|ue)llt|aufgef(?:ü|ue)llt|erledigt|ok(?![a-zäöüß])|in\s+ordnung|gefunden))|(?<![a-zäöüß])(?:keine|kein|zu\s+wenig(?:e)?|fehlende|besch(?:ä|ae|a)digte|kaputte|eingerissene)\s+(?:\S+\s+)?(?:(?:zurr|spann|ratschen|lade|ladungs)gurt(?:e|en|s)?|gurte|rungen?|steckrungen?|einstecklatten|kantensch(?:ü|ue|u)tz(?:e|er)?|kantenschoner|ecksch(?:ü|ue|u)tz(?:e|er)?|antirutschmatten?|rutschhemmende\s+matten|ladungssicherungsmittel|sicherungsmittel|ladungssicherung|sperrbalken|sperrstangen?|klemmbretter|klemmbalken|ladungssicherungsnetze?|zurrketten?|(?:spann|zurr)?ratschen?|zurrpunkte?|zurr(?:ö|oe)sen?)(?![a-zäöüß])(?!\s+(?:\S+\s+)?(?:n(?:ö|oe)tig|erforderlich|vorgeschrieben))|(?<![a-z])(?:lashing\s+straps?|ratchet\s+straps?|straps|edge\s+protectors?|corner\s+protectors?|anti[\s-]?slip\s+mats?|load\s+bars?|lashing\s+(?:chains?|equipment)|load\s+securing\s+equipment)\s+(?:(?:are|is|on|the|board|not|all|some|two|three|several|completely|badly)\s+){0,3}(?:missing|gone|damaged|torn|frayed|cut|broken|worn|not\s+enough|insufficient)(?![a-z])|(?<![a-z])(?:no|not\s+enough|missing|damaged|torn|frayed|broken)\s+(?:\S+\s+)?(?:lashing\s+straps?|ratchet\s+straps?|straps|edge\s+protectors?|anti[\s-]?slip\s+mats?|load\s+bars?)(?![a-z])|(?<![а-яіїєґё])(?:ремен\S*\s+(?:кріплен|креплен)\S*|стяжн\S*\s+ремен\S*|стяжк\S*|кутник\S*|уголк\S*|антиковзк\S*|антискольз\S*|розпірн\S*|распорн\S*|засоб\S*\s+кріплен\S*|средств\S*\s+креплен\S*)\s+(?:\S+\s+){0,2}?(?:немає|нема|нет(?![а-яіїєґё])|бракує|не\s+вистачає|не\s+хватает|відсутн\S*|отсутств\S*|порван\S*|розірван\S*|зношен\S*|пошкоджен\S*|поврежден\S*|злама[внл]\S*|сломан\S*)|(?<![а-яіїєґё])(?:немає|нема|нет|бракує|не\s+вистачає|не\s+хватает)\s+(?:\S+\s+)?(?:(?:ремен|ремн)(?!\S*\s+(?:безпек|безопасн))\S*|стяжок|стяжк\S*|кутник\S*|уголк\S*|антиковзк\S*|антискольз\S*|розпірн\S*|распорн\S*)|(?<![a-zäöüß-])zurrschiene(?:n)?(?![a-zäöüß])\s+(?:(?:ist|sind|hinten|vorne|links|rechts|an\s+der\s+seite)\s+){0,2}(?:lose|locker|abgerissen|ausgerissen|gebrochen|verbogen|kaputt|defekt)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|abgedichtet|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|patched|sealed|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))`, 'i', 1);
// [CLAUDE] Backlog 694 (30.10.2026, Blickwinkel „Konturmarkierung, Rückstrahler oder Warntafel abgerissen/fehlt“): Reflexstreifen (Konturmarkierung), Rückstrahler,
// rot-weiße Warntafeln/Heckmarkierung fehlen, abgerissen, lose, beschädigt oder verschmutzt → Schritte (Mangel, Leitung entscheidet; reinigen, lose Teile nur gefahrlos
// abnehmen; was/wo, Fotos; Auswahl „Kann das Fahrzeug fahren?“) – reine Information, keine Frist. Scheinwerfer-Reflektor, Warnweste/„світловідбивний жилет“,
// „Konturmarkierung erneuert“, „Warntafel nötig“ nicht. Leuchten bleiben bei LIGHTS_HINT.
// Backlog 696: Umwelt-/HU-Plakette fehlt, abgefallen oder unleserlich – eigene Schritte; die Fundstelle zählt nicht zusätzlich als Kennzeichen-, Scheiben- oder loses Teil
const STICKER_HINT = lbRx(String.raw`(?<![a-zäöüß])(?:(?:umwelt|feinstaub|hu|t(?:ü|ue|u)v|pr(?:ü|ue)f)-?\s?)?plakette(?:n)?(?![a-zäöüß])\s+(?:(?:ist|sind|wurde|wurden|am|an|auf|in|der|die|das|dem|den|hinten|vorne|kennzeichen|nummernschild|scheibe|windschutzscheibe|frontscheibe|lkw|zugmaschine|anh(?:ä|ae)nger|auflieger|komplett|ganz|teilweise|halb|fast|stark|schon|seit|heute|gestern|nach|waschanlage|scheibentausch|einfach|leider|nicht|mehr|wieder)[,;]?\s+){0,4}(?:fehl(?:t|en)|weg(?![a-zäöüß])|abgefallen|abgel(?:ö|oe)st|l(?:ö|oe)s(?:t|en)\s+sich|lose(?![a-zäöüß])|abgerissen|abgekratzt|abgerubbelt|unleserlich|(?:nicht|kaum)\s+(?:mehr\s+)?(?:lesbar|leserlich|erkennbar|zu\s+lesen|zu\s+erkennen|vorhanden|da(?![a-zäöüß]))|verblasst|ausgeblichen|besch(?:ä|ae|a)digt|kaputt|zerkratzt|zerrissen|eingerissen|gestohlen|geklaut|entwendet)(?![a-zäöüß])(?![,;.]?\s+(?:\S+\s+)?(?:wieder\s+(?:da|dran|drauf|angebracht)|ersetzt|erneuert|neu(?![a-zäöüß])|geklebt|angebracht|erledigt|ok(?![a-zäöüß])|in\s+ordnung|bestellt|beantragt))|(?<![a-zäöüß])(?:fehlende[nmrs]?|abgefallene[nmrs]?|unleserliche[nmrs]?|besch(?:ä|ae|a)digte[nmrs]?|kaputte[nmrs]?|verblasste[nmrs]?|keine|kein|ohne)\s+(?:\S+\s+)?(?:(?:umwelt|feinstaub|hu|t(?:ü|ue|u)v|pr(?:ü|ue)f)-?\s?)?plakette(?:n)?(?![a-zäöüß])(?!\s+(?:\S+\s+)?(?:n(?:ö|oe)tig|erforderlich|vorgeschrieben|bestellt|beantragt|ersetzt|erneuert|angebracht|geklebt))|(?<![a-z])(?:(?:emissions?|environmental|low[- ]emission(?:\s+zone)?|clean[- ]air(?:\s+zone)?|green|inspection|mot|roadworthiness|t(?:ü|u)v|hu)\s+(?:stickers?|badges?|vignettes?|discs?))\s+(?:(?:is|are|on|the|windscreen|windshield|plate|number|rear|front|has|have|completely|partly|now|already|just)\s+){0,3}(?:missing|gone|fell\s+off|fallen\s+off|came\s+off|come\s+off|peeling(?:\s+off)?|torn(?:\s+off)?|scratched\s+off|damaged|unreadable|illegible|faded|stolen|not\s+(?:readable|legible|visible|there))(?![a-z])(?!\s+(?:\S+\s+)?(?:replaced|renewed|ordered|fixed|ok(?![a-z])))|(?<![a-z])(?:missing|no|damaged|illegible|unreadable|faded|torn|stolen)\s+(?:(?:emissions?|environmental|low[- ]emission(?:\s+zone)?|clean[- ]air(?:\s+zone)?|green|inspection|mot|roadworthiness|t(?:ü|u)v|hu)\s+(?:stickers?|badges?|vignettes?|discs?))(?![a-z])(?!\s+(?:\S+\s+)?(?:needed|required|ordered))|(?<![а-яіїєґё])(?:плакетк\S*|(?:екологічн|экологическ|зелен)\S*\s+(?:наклейк|стикер|значок|плакетк)\S*|наклейк\S*\s+(?:про\s+|о\s+)?(?:техогляд|техосмотр|то(?![а-яіїєґё])|hu|t(?:ü|u)v)\S*)\s+(?:\S+\s+){0,3}?(?:немає|нема(?![а-яіїєґё])|нет(?![а-яіїєґё])|відсутн|отсутств|відклеї|відклеє|отклеи|отклее|відпа|отпа|відірва|оторва|пошкоджен|поврежден|не\s+читає|не\s+читае|нечитаб|нечитаем|не\s+видно|вицві|выцве|вкра|укра)|(?<![а-яіїєґё])(?:немає|нема|нет|без|бракує|відсутн\S*|отсутств\S*|пошкоджен\S*|поврежден\S*)\s+(?:\S+\s+)?(?:плакетк|(?:екологічн|экологическ|зелен)\S*\s+(?:наклейк|стикер|значок|плакетк)|наклейк\S*\s+(?:про\s+|о\s+)?(?:техогляд|техосмотр|то(?![а-яіїєґё])))\S*`, 'i');
const STICKER_SPANS = new RegExp(STICKER_HINT.source, 'gi');
const noSticker = (s) => String(s || '').replace(STICKER_SPANS, ' ');
// Backlog 698: Fahrerhaus-Ausstattung (Kühlschrank, Liege, Sonnenblende, Vorhang, Steckdose, Innenlicht, Ablagen, Radio) defekt – eigene Schritte; die Fundstelle zählt nicht zusätzlich als Kühlaufbau, Beleuchtung oder Plane
const CABKIT_HINT = lbRx(String.raw`(?<![а-яіїєґё])(?:козир|козыр)\S*\s+(?:\S+\s+)?(?:зламав\S*|злама[внл]\S*|відірва\S*|сломал\S*|сломан\S*|оторва\S*|відвали\S*|отвали\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![a-zäöüß-])(?:k(?:ü|ue)hlschrank|wechselrichter|spannungswandler|k(?:ü|ue)hlbox|(?:schlaf|ober|unter)?liege(?![a-zäöüß])|koje|bett(?![a-zäöüß])|matratze|lattenrost|liegen-?(?:halte)?netz|halte-?netz|sonnenblende(?:n)?|sonnenschutz(?:rollo)?|rollo(?:s)?|vorh(?:a|ä|ae)ng(?:e)?|gardine(?:n)?|verdunkelung|(?<!(?:anh(?:ä|ae)nger|auflieger|ebs|abs|pol(?:ige)?|polig)[- ]?)steckdose(?![a-zäöüß])(?!\s+(?:\S+\s+){0,2}(?:anh(?:ä|ae)nger|auflieger|trailer|ebs|abs))|zigarettenanz(?:ü|ue)nder|usb(?:-?(?:anschluss|buchse|port|steckdose))?|ladebuchse|(?:innen|lese|kabinen|fahrerhaus)(?:beleuchtung|licht|leuchte|lampe)|leselampe|ablage(?:fach|f(?:ä|ae)cher|klappe)?|staufach|staukasten|stauklappe|handschuhfach|becherhalter|handyhalter(?:ung)?|telefonhalter(?:ung)?|getr(?:ä|ae)nkehalter|radio|funkger(?:ä|ae)t(?:e)?|cb-?funk(?:ger(?:ä|ae)t)?|sitzheizung)(?![a-zäöüß])\s+(?:(?:ist|sind|im|in|lkw|truck|der|die|das|dem|den|fahrerhaus|kabine|oben|unten|obere|untere|fahrerseite|beifahrerseite|links|rechts|seit|heute|gestern|schon|wieder|komplett|ganz|mehr|leider|auch|total|nur|noch|seit|tagen|wochen)[,;]?\s+){0,4}(?:defekt|kaputt|abgerissen|ausgerissen|runtergerissen|geht\s+nicht|funktioniert\s+nicht|ohne\s+(?:funktion|strom)|k(?:ü|ue)hlt\s+nicht|abgebrochen|gebrochen|gerissen|eingerissen|zerrissen|lose(?![a-zäöüß])|locker(?![a-zäöüß])|h(?:ä|ae)lt\s+nicht|klemmt|l(?:ä|ae|a)ss(?:t|en)\s+sich\s+nicht|rastet\s+nicht|fehl(?:t|en)|wackelt|h(?:ä|ae)ngt\s+(?:herunter|runter|schief)|durchgelegen|f(?:ä|ae)llt\s+(?:runter|herunter|ab)|abgefallen)(?![a-zäöüß])(?![,;.]?\s+(?:\S+\s+)?(?:repariert|ersetzt|getauscht|erneuert|erledigt|wieder\s+(?:ok|in\s+ordnung|ganz|fest)|ok(?![a-zäöüß])))|(?<![a-z])(?:(?:cab\s+)?fridge|bunk(?:\s+bed)?|sleeper\s+bunk|mattress|sun\s*visor|(?:cab|bunk|window|sleeper)\s+curtains?|(?:cab|interior|reading)\s+lights?|(?:power|12v|24v)\s+(?:socket|outlet)|cab\s+socket|usb\s+(?:port|socket|charger)|cigarette\s+lighter|storage\s+(?:compartment|locker|box)|glove\s*box|cup\s+holder|radio|cb\s+radio|two-way\s+radio|seat\s+heat(?:ing|er)|heated\s+seat|bunk\s+(?:net|restraint))\s+(?:(?:is|are|in|the|cab|upper|lower|top|bottom|has|have|now|still|completely|keeps|on|passenger|driver|side)\s+){0,3}(?:broken|not\s+working|doesn['’]?t\s+work|does\s+not\s+work|won['’]?t\s+(?:close|lock|latch|stay|work|cool)|not\s+cooling|missing|torn|ripped|loose|stuck|faulty|damaged|no\s+power|dead|fell\s+off|falling\s+(?:down|off)|hanging\s+(?:down|off))(?![a-z])(?!\s+(?:\S+\s+)?(?:fixed|repaired|replaced|ok(?![a-z])))|(?<![а-яіїєґё])(?:холодильник\S*\s+(?:в|у)\s+кабін\S*|холодильник\S*\s+в\s+кабин\S*|спальн\S*\s+(?:місц|мест|полиц|поличк)\S*|спальник\S*|ліжк\S*|кроват\S*|матрац\S*|матрас\S*|(?:сонцезахисн|солнцезащитн)\S*\s+козир\S*|козирок\S*|козырек\S*|шторк\S*|штор[аиуы]?(?![а-яіїєґё])|розетк\S*\s+(?:в|у)\s+кабін\S*|розетк\S*\s+в\s+кабин\S*|прикурювач\S*|прикуриват\S*|usb\S*|освітлен\S*\s+(?:салону|кабіни)|освещени\S*\s+(?:салона|кабины)|підсвітк\S*\s+кабіни|подсветк\S*\s+кабины|бардачок\S*|бардачк\S*|рундук\S*|радіо|радио|магнітол\S*|магнитол\S*|раці[яїю]|раци[яию]|підігрів\S*\s+сидін\S*|подогрев\S*\s+сиден\S*)\s+(?:\S+\s+){0,3}?(?:не\s+працю|не\s+работа|не\s+холод|зламан|сломан|поламан|відірван|оторван|порван|розірван|не\s+закрива|не\s+закрыва|не\s+фіксу|не\s+фиксир|бракує|немає|нет(?![а-яіїєґё])|відпа|отпа|теліпа|болта|без\s+(?:живлення|питания)|не\s+заряджа|не\s+заряжа)|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?:ліжко|ліжка|кровать|кровати|спальне\s+місце|спальное\s+место)\s+(?:в\s+(?:кабіні|кабине)\s+)?(?:\S+\s+)?(?:злама\S*|слома\S*|трісну\S*|тресну\S*|провали\S*|відірва\S*|оторва\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-z-])(?:cab\s+)?fridge(?:\s+in\s+the\s+(?:cab|truck|sleeper))?\s+(?:(?:keeps|keep|always|constantly|randomly|sometimes|now|still|just|on\s+its\s+own)\s+){0,2}(?:cuts?\s+out|cutting\s+out|switch(?:es|ing)?\s+off|shuts?\s+(?:off|down)|shutting\s+(?:off|down)|turns?\s+off|turning\s+off)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-zäöüß-])k(?:ü|ue)hlschrank(?![a-zäöüß])\s+(?:(?:im|in\s+der)\s+(?:fahrerhaus|kabine|lkw)\s+)?(?:geht|schaltet\s+sich|f(?:ä|ae)llt)\s+(?:(?:st(?:ä|ae)ndig|immer(?:\s+wieder)?|dauernd|oft|einfach|von\s+selbst|zwischendurch|nachts|manchmal|pl(?:ö|oe)tzlich|selbst(?:st(?:ä|ae)ndig)?|w(?:ä|ae)hrend\s+der\s+fahrt|jetzt|seit\s+\S+)\s+){0,3}(?:aus|ab)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])холодильник\S*\s+(?:в|у)\s+(?:кабін|кабин)\S*\s+(?:(?:постійно|постоянно|весь\s+час|все\s+время|сам|сама|сам\s+по\s+собі|сам\s+по\s+себе|часто|періодично|периодически|іноді|иногда|раз\s+у\s+раз|то\s+и\s+дело)\s+){0,2}(?:вимика\S*|вимкну\S*|відключа\S*|відключи\S*|отключа\S*|отключи\S*|выключа\S*|выключи\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))`, 'i');
const CABKIT_SPANS = new RegExp(CABKIT_HINT.source, 'gi');
const noCabkit = (s) => String(s || '').replace(CABKIT_SPANS, ' ');
// Backlog 919: Motor/Batterie/Tank eines Zusatzgeräts (Kühlaggregat, Standheizung) ist nicht der Lkw – für Motor-/Start-/Tank-Hinweise ausblenden
const AUX_UNIT = lbRx(String.raw`(?<![a-zäöüß-])(?:(?:k(?:ü|ue)hl)?aggregat(?:s|es)?|k(?:ü|ue)hlger(?:ä|ae)t(?:s|es)?|k(?:ü|ue)hlmaschine|thermo\s?king|carrier|standheizung|stromaggregat|generator)(?![a-zäöüß])\s+(?:[^\s.;!?,]+\s+){0,2}?(?:motor|dieselmotor|diesel|batterie|akku|tank|kraftstoff)(?:s|es|n|en)?(?![a-zäöüß])|(?<![a-zäöüß-])(?:motor|dieselmotor|batterie|akku|tank)(?:s|es|n)?\s+(?:vom|von\s+der|von\s+dem|des|der|am|im|f(?:ü|ue)r\s+(?:das|die|den))\s+(?:k(?:ü|ue)hl)?(?:aggregat(?:s|es)?|ger(?:ä|ae)t(?:s|es)?|maschine)|(?<![a-zäöüß-])(?:k(?:ü|ue)hl)?aggregat(?:e)?tank(?:s)?(?![a-zäöüß])|(?<![a-zäöüß-])(?:(?:funk)?schl(?:ü|ue)ssel|fernbedienung|taschenlampe|funkger(?:ä|ae)t|handy|tablet|(?:hand)?scanner)(?:s)?\s+(?:(?:hat|ist|die|der|vom|von|im)\s+)?(?:batterie|akku)(?:n)?(?![a-zäöüß])|(?<![a-zäöüß-])(?:batterie|akku)(?:n)?\s+(?:vom|von\s+der|von\s+dem|im|in\s+der|der|des)\s+(?:(?:funk)?schl(?:ü|ue)ssel|fernbedienung|taschenlampe|funkger(?:ä|ae)t|handy|tablet|(?:hand)?scanner)(?:s)?(?![a-zäöüß])`, 'gi');
// Backlog 922: Flurförderzeuge (Stapler, Hubwagen, Ameise …) sind nicht der Lkw – ihr Teilsatz bis zum Komma/Satzende zählt nicht für Lkw-Motor/-Start/-Reifen-Hinweise
const EQUIP_SPAN = lbRx(String.raw`(?<![a-zäöüß-])(?:(?:mitnahme|gabel|elektro)?stapler|(?:elektro|hand)?hubwagen|ameise|sackkarre|rollwagen|rollcontainer)(?:s|n)?(?![a-zäöüß])[^.;!?,\n]*`, 'gi');
const noAux = (s) => String(s || '').replace(EQUIP_SPAN, ' ◇ ').replace(AUX_UNIT, (m) => m.replace(/(?:dieselmotor|motor|diesel|batterie|akku|tank|kraftstoff)/gi, '◇'));
// Backlog 761: Die *_HINT-Muster blenden ihren Hinweis bei einem Reparaturvermerk im selben Satz aus („…, repariert“). Bei einem
// wiederkehrenden oder nicht behobenen Mangel („wieder, obwohl repariert“, „nach Reparatur wieder“, „nicht repariert“, „again after being
// fixed“, „not been replaced“, „знову, хоча відремонтували“, „не відремонтували“, „опять, хотя отремонтировали“) verschwand dadurch sogar
// der Bremsen-/Lenkungshinweis. recurFix neutralisiert die Reparaturwörter nur in solchen Sätzen (bzw. direkt nach einer Verneinung);
// echte Reparaturvermerke („…, repariert“, „funktioniert wieder“, „working again“, „знову працює“) bleiben unverändert.
const FIX_WORD = lbRx(String.raw`(?<![a-zäöüß])(?:repariert|erneuert|(?:aus)?getauscht|ersetzt|behoben|(?:aus)?gewechselt|instandgesetzt|eingestellt|befestigt|gereinigt|freigeschaltet|fixed|repaired|replaced)(?![a-zäöüß])|(?<=(?<![a-zäöüß])(?:funktioniert|geht|läuft|laeuft|k(?:ü|ue)hlt|heizt|startet|schlie(?:ß|ss)t|(?:ö|oe)ffnet|l(?:ä|ae)dt|reagiert)\s+)(?:schon\s+|immer\s+)?wieder\s+(?=nicht(?![a-zäöüß]))|(?<![а-яіїєґё])(?:відремонт|отремонт|замінил|замінен|заменил|заменен|усунул|усунен|устранил|устранен|поміня|поменя|полагод|почини)[а-яіїєґё']*`, 'gi');
const RECUR_MARK = lbRx(String.raw`(?<![a-zäöüß])(?:obwohl|trotz|trotzdem|dennoch|erneut|nochmal|noch\s+mal|schon\s+wieder|immer\s+noch|weiterhin|wieder\s+(?:kaputt|defekt|undicht|da|los|lose|locker|aufgetreten|nicht|das\s+gleiche|dasselbe|gleich)|nach\s+(?:der\s+|dem\s+|einer\s+)?(?:reparatur|tausch|wechsel)\S*\s+(?:\S+\s+){0,3}?wieder(?!\s+(?:ok|okay|in\s+ordnung|gut|funktionsf\S*|fahrbereit|dicht|heil|fest|frei))|although|though|despite|still(?!\s+(?:fine|ok|okay|good|works?|working))|(?<!(?<!(?:not|n['’]t)\s+)(?:works?|working|fine|ok|okay|good|running|normal)\s+)again)(?![a-zäöüß])|(?<![а-яіїєґё])(?:хоча|хоч|попри|досі|хотя|несмотря|вс[её]\s+ещ[её]|все\s+ещ[её]|все\s+еще|(?<!(?:працює|работает)\s+)(?:знову|знов|опять|снова)(?!\s+(?:працює|работает)))(?![а-яіїєґё])`, 'i', 1);
const FIX_NEG = lbRx(String.raw`(?:(?<![a-zäöüß])(?:nicht|nie|kein\S*|not|never)|n['’]t|(?<![а-яіїєґё])(?:не|ни))\s+(?:[a-zäöüßа-яіїєґё'’]+\s+){0,2}$`, 'i');
// Backlog 764: geplante/geforderte Reparatur („muss getauscht werden“, „wird morgen repariert“, „needs to be replaced“, „will be fixed“,
// „треба замінити“, „нужно отремонтировать“) ist kein Reparaturvermerk – Infinitive (-ти/-ть) und Modalverben davor bzw. „werden/lassen“ danach.
const FIX_PLAN = lbRx(String.raw`(?:(?<![a-zäöüß])(?:muss|m(?:ü|ue)ssen|soll(?:te|en)?|wird|bitte)|(?<![a-z])(?:be|needs?|must|should|will))\s+(?:[a-zäöüß]+\s+){0,2}$`, 'i');
const FIX_PLAN_AFTER = /^\s+(?:werden|lassen)(?![a-zäöüß])/i;
// Backlog 769: EN „stopped/quit/ceased working“ wird wie „not working“ gelesen (Fenster, Navi, Spiegel, Sitz, Maut, Zentralverriegelung … kannten nur „not working“).
const STOP_WORK = lbRx(String.raw`(?<![a-z])(?:stopp(?:ed|s)|quit(?:s|ted)?|ceased?)\s+(?:working|functioning)(?![a-z])`, 'gi');
// Backlog 772: UK/RU mit vorangestelltem Prädikat („не працює кондиціонер“, „не работает автономка“, „не працюють двірники“) – der Gegenstand (1–4 Wörter bis
// Satzzeichen/Präposition/Bindewort) wird hinter einem Trenner (⁘, kein Satzende) zusätzlich in Normalstellung angehängt („… ⁘ кондиціонер не працює“).
const PRED_FIRST = lbRx(String.raw`(?<![а-яіїєґё])(не\s+(?:працю[а-яіїєґ]*|работа[а-яё]*|функціону[а-яіїєґ]*|функциониру[а-яё]*))((?:\s+[^\s.,;!?:()]+){1,4}?)(?=\s*(?:$|[.,;!?:()\n])|\s+(?:і|й|та|и|а|але|но|бо|тому|потому|після|после|з|із|зі|с|со|вже|уже|ще|еще|ещ[её]|в|у|на|при|під|под|від|от|до|коли|когда|хоча|хотя|знову|снова|опять)(?![а-яіїєґё]))`, 'gi');
// Backlog 773: Werkstatt-/Formularsprache „ohne Funktion“, „keine Funktion“, „funktionslos“, „tut (es) nicht (mehr)“, „ohne/kein Bild“, „Klimaanlage: geht nicht“,
// EN „inoperative“, „out of order“, „no function“, „not functioning“, „does nothing“, „u/s“, UK/RU „не функціонує/функционирует“ werden wie „funktioniert nicht“/„not working“/„не працює“ gelesen
const NO_FUNC = lbRx(String.raw`(?<![a-zäöüß])(?:(?:ohne|keine)\s+funktion|funktionslos|(?:ohne|kein)\s+bild|tut\s+(?:es\s+|er\s+|sie\s+)?nicht(?:\s+mehr)?(?!\s+weh))(?![a-zäöüß])|(?<![a-z])(?:inoperative|out\s+of\s+order|no\s+function|not\s+functioning|does\s+nothing|u\/s)(?![a-z])|(?<![а-яіїєґё])не\s+(?:функціону[а-яіїєґ]*|функциониру[а-яё]*)`, 'gi');
// Backlog 775: zeitweise Ausfälle – „geht manchmal/ab und zu/zeitweise nicht“, „fällt sporadisch aus“, „funktioniert nur zeitweise“, „spinnt“, EN „works intermittently“,
// „playing/acting up“, „glitchy“, UK/RU „глючить/барахлить“, „працює через раз“ werden wie „(geht) nicht“/„fällt aus“/„not working“/„не працює“ gelesen
const INTERMIT = [
  [lbRx(String.raw`(?<![a-zäöüß])(geht|funktioniert|l(?:ä|ae)uft|k(?:ü|ue)hlt|heizt|startet|schlie(?:ß|ss)t|(?:ö|oe)ffnet|reagiert|l(?:ä|ae)dt)\s+(?:manchmal|ab\s+und\s+(?:zu|an)|zeitweise|zeitweilig|sporadisch|gelegentlich|teilweise|hin\s+und\s+wieder|(?:immer\s+)?öfter|oft|h(?:ä|ae)ufig|mal)\s+nicht(?![a-zäöüß])`, 'gi'), '$1 nicht'],
  [lbRx(String.raw`(?<![a-zäöüß])f(ä|ae)llt\s+(?:manchmal|ab\s+und\s+(?:zu|an)|zeitweise|zeitweilig|sporadisch|gelegentlich|hin\s+und\s+wieder|(?:immer\s+)?öfter|oft|h(?:ä|ae)ufig|immer\s+wieder|st(?:ä|ae)ndig|dauernd|(?:schon\s+)?wieder|jetzt|komplett|ganz|total|einfach|auch)\s+aus(?![a-zäöüß])`, 'gi'), 'f$1llt aus'], // Backlog 777: auch „fällt wieder/schon wieder/komplett aus“
  [lbRx(String.raw`(?<![a-zäöüß])(?:funktioniert|geht|l(?:ä|ae)uft|arbeitet)\s+nur\s+(?:noch\s+)?(?:manchmal|zeitweise|zeitweilig|sporadisch|gelegentlich|teilweise|ab\s+und\s+zu|sehr\s+selten|selten)(?![a-zäöüß])|(?<![a-zäöüß])spinnt(?![a-zäöüß])`, 'gi'), 'funktioniert nicht'],
  [lbRx(String.raw`(?<![a-z])(?:(?:works?|working|is|are)\s+(?:only\s+)?intermittent(?:ly)?|intermittent(?:ly)?(?=\s*(?:$|[.,;!?]))|playing\s+up|acting\s+up|glitch(?:y|ing))(?![a-z])`, 'gi'), 'not working'],
  [lbRx(String.raw`(?<![а-яіїєґё])(?:глюч(?:ить|ать|ит|ат)|глюка[а-яіїєґ]*|барахл(?:ить|ять|ит|ят)|працю(?:є|ють)\s+через\s+раз)(?![а-яіїєґё])`, 'gi'), 'не працює'],
  [lbRx(String.raw`(?<![а-яіїєґё])работа(?:ет|ют)\s+через\s+раз(?![а-яіїєґё])`, 'gi'), 'не работает'],
];
// Backlog 776: Umgangssprache/Tippfehler beim schnellen Tippen – „geht net/ned/nich“, „funzt nicht“, „get nicht“, „funktionirt“, „kaput“, „defeckt/defekd“, „is kaputt“,
// „hinüber/im Eimer/im Arsch“, EN „not workin“, „dont/don't work“, „aint working“ werden in die Normalform gebracht (nur nach den passenden Verben, „cargo net“ bleibt)
const DIALECT = { bremsn: 'bremsen', reifn: 'reifen', spiagl: 'spiegel', spiegl: 'spiegel', scheibn: 'scheibe', wischa: 'wischer', ziagt: 'zieht', karrn: 'karre', hod: 'hat', hob: 'hab', plattn: 'platten', lampn: 'lampe', liacht: 'licht' };
const COLLOQ = [
  // Backlog 966 (Blickwinkel „Fahrer schreibt Mundart – bairisch/Ruhrpott“): Mundartformen in die Schriftform, bevor die übrigen Regeln greifen
  // („de bremsn ziagt noch links“, „da reifn is platt“, „da spiagl is ab“, „karre springt nich an“, „springt ned o“, „bremsn san hi“, „hänger hängt schief“)
  [lbRx(String.raw`(?<![a-zäöüß])(?:bremsn|reifn|spiagl|spiegl|scheibn|wischa|ziagt|karrn|hod|hob|plattn|lampn|liacht)(?![a-zäöüß])`, 'gi'), (m) => DIALECT[m.toLowerCase()]],
  [lbRx(String.raw`(?<![a-zäöüß])san(?=\s+(?:\S+\s+)?(?:hi|hin|kaputt|defekt|platt|leer|runter|durch|abgefahren|ab|lose|locker)(?![a-zäöüß]))`, 'gi'), 'sind'],
  [lbRx(String.raw`(?<![a-zäöüß])(?:h(?:ä|ae)nger)(?![a-zäöüß])`, 'gi'), 'anhänger'],
  [lbRx(String.raw`(?<![a-zäöüß])(nicht|net|ned|nich|nit)\s+o(?![a-zäöüß])`, 'gi'), '$1 an'],
  [lbRx(String.raw`(?<![a-zäöüß])(hab|habe|hat|haben)\s+an\s+(?=platten(?![a-zäöüß]))`, 'gi'), '$1 einen '],
  [lbRx(String.raw`(?<![a-zäöüß])(springt|springen|zieht|ziehen|bremst|schaltet|lenkt|l(?:ä|ae)dt)(\s+(?:\S+\s+)?)(?:net|ned|nich|nit)(?![a-zäöüß])`, 'gi'), '$1$2nicht'],
  [lbRx(String.raw`(?<![a-zäöüß])is(?=\s+(?:\S+\s+)?(?:hi|hin|platt|leer|runter|durch|lose|locker|ab|abgerissen|abgefahren|undicht|gerissen|gebrochen|verbogen)(?![a-zäöüß]))`, 'gi'), 'ist'],
  [lbRx(String.raw`(?<![a-zäöüß])(ist|sind)(\s+(?:\S+\s+)?)hi(?![a-zäöüß])`, 'gi'), '$1$2hin'],
  [lbRx(String.raw`(?<![a-zäöüß])(?:luft)\s+(?:ist\s+)?(?:\S+\s+)?raus\s+(?:aus\s+)?(?:dem\s+|den\s+|einem\s+)?(?:\S+\s+)?reifen(?![a-zäöüß])`, 'gi'), 'reifen ist platt'],
  [lbRx(String.raw`(?<![a-zäöüß])(reifen|profil)\s+(ist|sind)(\s+(?:\S+\s+)?)runter(?![a-zäöüß])(?!\s*(?:vom|von|gefallen|gekommen))`, 'gi'), '$1 $2$3durch'],
  [lbRx(String.raw`(?<![a-zäöüß])(kupplung|turbo|lader|radlager|kopfdichtung|zylinderkopfdichtung)\s+(?:ist|sind)\s+(?:\S+\s+)?durch(?![a-zäöüß])(?!\s*(?:den|die|das|dem|der|einen|eine|gerostet|gescheuert|gebrochen))`, 'gi'), '$1 ist kaputt'],
  [lbRx(String.raw`(?<![a-zäöüß])(auspuff|endtopf|sto(?:ß|ss)stange|kotfl(?:ü|ue)gel|spritzlappen|schmutzf(?:ä|ae)nger|seitenverkleidung|verkleidung|radkappe|spoiler|windleitblech)\s+(ist|sind)(\s+(?:\S+\s+)?)ab(?![a-zäöüß])(?!\s*(?:jetzt|sofort|morgen|heute|montag))`, 'gi'), '$1 $2$3abgerissen'],
  [lbRx(String.raw`(?<![a-zäöüß])(?:funzt|funtzt|funktionirt|funktionier|funkioniert|funktoniert|funktionert|funkzioniert)(?![a-zäöüß])`, 'gi'), 'funktioniert'],
  [lbRx(String.raw`(?<![a-zäöüß])get(?=\s+(?:nicht|net|ned|nich|nit|mehr\s+nicht)(?![a-zäöüß]))`, 'gi'), 'geht'],
  [lbRx(String.raw`(?<![a-zäöüß])(geht|funktioniert|l(?:ä|ae)uft|k(?:ü|ue)hlt|heizt|startet|schlie(?:ß|ss)t|(?:ö|oe)ffnet|reagiert|tut|ist|sind)(\s+(?:\S+\s+)?)(?:net|ned|nich|nit)(?![a-zäöüß])`, 'gi'), '$1$2nicht'],
  [lbRx(String.raw`(?<![a-zäöüß])kaput(?![a-zäöüßt])`, 'gi'), 'kaputt'],
  [lbRx(String.raw`(?<![a-zäöüß])(?:defeckt|defekd|deffekt|defeckd|defekkt)(?![a-zäöüß])`, 'gi'), 'defekt'],
  [lbRx(String.raw`(?<![a-zäöüß])is(?=\s+(?:\S+\s+)?(?:kaputt|defekt|hinüber)(?![a-zäöüß]))`, 'gi'), 'ist'],
  [lbRx(String.raw`(?<![a-zäöüß])(?:ist|sind)\s+(?:\S+\s+)?(?:hin(?:ü|ue)ber|im\s+eimer|im\s+arsch|hin(?![a-zäöüß])(?!\s*(?:und|zum|zur|zu|nach|gefahren|gegangen|gelaufen|her|gebracht|gestellt|geschickt|unterwegs)(?![a-zäöüß])))(?![a-zäöüß])|(?<![a-zäöüß])(?:im\s+eimer|im\s+arsch)(?![a-zäöüß])`, 'gi'), 'ist kaputt'],
  [lbRx(String.raw`(?<![a-z])workin(?![a-z'’g])`, 'gi'), 'working'],
  // Backlog 966: britische Umgangssprache – „brakes are shot“, „clutch is knackered“, „heater's knackered“, „clutch has gone“
  [/(?:\s+(?:is|are)|['’]s|['’]re)(\s+(?:completely\s+|totally\s+|absolutely\s+|well\s+|just\s+)?)(?:knackered|shot|bust|busted|buggered|goosed|done\s+for)(?![a-z])/gi, ' is$1broken'],
  [lbRx(String.raw`(?<![a-z])(clutch|brakes?|gearbox|alternator|starter(?:\s+motor)?|turbo|heater|wipers?|wiper\s+motor|mirror|wing\s+mirror|headlights?|bulb|fan\s+belt|aircon|air\s+con)\s+(?:has|have|['’]s)\s+(?:just\s+|completely\s+)?gone(?![a-z])(?!\s+(?:in|to|for|back|off|on|through|down|up|out))`, 'gi'), '$1 is broken'],
  [lbRx(String.raw`(?<![a-z])(?:dont|don['’]t)\s+work(?![a-z])`, 'gi'), "doesn't work"],
  [lbRx(String.raw`(?<![a-z])ain['’]?t\s+working(?![a-z])`, 'gi'), 'not working'],
  // Backlog 929: Stau/Sperrung wegen eines fremden Unfalls ist kein eigener Unfall
  [lbRx(String.raw`(?<![a-zäöüß])(stau|sperrung|vollsperrung|umleitung|versp(?:ä|ae)tung|wartezeit)([a-zäöüß]*\s+(?:\S+\s+){0,3}?)(?:wegen|durch|nach)\s+(?:einem\s+|eines\s+|einen\s+|dem\s+|des\s+)?(?:\S+\s+)?unfall(?:s|es)?(?![a-zäöüß])`, 'gi'), '$1$2'],
  [lbRx(String.raw`(?<![a-zäöüß])(?:wegen|durch)\s+(?:eines\s+|einem\s+|einen\s+|des\s+|dem\s+)?(?:\S+\s+)?unfall(?:s|es)?\s+(?=(?:\S+\s+){0,3}?(?:stau|gesperrt|sperrung|vollsperrung|umleitung)(?![a-zäöüß]))`, 'gi'), ' '],
  [lbRx(String.raw`(?<![a-z])(traffic|stuck|delay(?:ed)?|queue|queuing|closed|closure|diversion|diverted)(\s+(?:\S+\s+){0,4}?)(?:due\s+to|because\s+of|after)\s+(?:an?\s+|the\s+)?(?:\S+\s+)?(?:accident|crash|collision)(?![a-z])`, 'gi'), '$1$2'],
  [lbRx(String.raw`(?<![а-яіїєґё])(затор|пробк[а-яіїєґё]*|затримк[а-яіїєґё]*|перекри[а-яіїєґё]*|об['’]?їзд|объезд)(\s+(?:\S+\s+)?)через\s+(?:дтп|аварі[юї]|аварию)`, 'gi'), '$1$2'],
  // Backlog 923: verneinte Befunde („Reifen nicht platt“, „kein Reifenschaden“, „no damage“, „без пошкоджень“) lösen keinen Hinweis aus
  [lbRx(String.raw`(?<![a-zäöüß])(?:(?:ist|sind|war|waren)\s+)?nicht\s+(?:defekt|kaputt|platt|besch(?:ä|ae)digt|undicht|gerissen|gebrochen|verbogen|gesprungen|abgefahren|abgerissen|abgebrochen|verrutscht|verschoben|umgefallen|eingedr(?:ü|ue)ckt|zerkratzt|verkratzt|geplatzt|ausgelaufen)(?![a-zäöüß])(?!\s+(?:gegangen|gemacht|geworden))`, 'gi'), ' ok'],
  [lbRx(String.raw`(?<![a-zäöüß])(?:kein|keine|keinen|keinerlei)\s+[a-zäöüß-]*(?:schaden|sch(?:ä|ae)den|leck|defekt|fehler|warnleuchte|warnlampe|kontrollleuchte|problem|probleme|befund|riss|risse|steinschlag|steinschl(?:ä|ae)ge)(?![a-zäöüß])|(?<![a-zäöüß])keine\s+ladung\s+(?:\S+\s+)?(?:verloren|verrutscht|besch(?:ä|ae)digt|(?:her)?untergefallen|runtergefallen)(?![a-zäöüß])|(?<![a-zäöüß])(?:rutscht|rutschen|quietscht|quietschen|raucht|rauchen|qualmt|tropft|tropfen|leckt|wackelt|vibriert|klappert|stinkt|sifft|schleift|knackt|klopft|rattert|ruckelt)\s+nicht(?:\s+mehr)?(?![a-zäöüß])(?!\s+(?:mehr\s+)?(?:rein|raus|ein|hinein|heraus|runter|hoch|durch)(?![a-zäöüß]))`, 'gi'), ' ok'],
  [lbRx(String.raw`(?<![a-zäöüß])(?:kein|keine|keinen|keinerlei)\s+[a-zäöüß-]*(?:unfall|unf(?:ä|ae)lle|diebstahl|einbruch|feuer|brand|rauch|qualm|marder|marderbiss|verlust)(?![a-zäöüß])(?!\s+mehr)|(?<![a-zäöüß])nichts\s+(?:wurde\s+|ist\s+)?(?:gestohlen|geklaut|entwendet|weggekommen)(?![a-zäöüß])`, 'gi'), ' ok'],
  [lbRx(String.raw`(?<![a-z])(?:no|not\s+an?)\s+(?:accident|crash|collision|theft|break-?in|fire|smoke|leak)(?![a-z])|(?<![a-z])nothing\s+(?:was\s+|got\s+)?(?:stolen|taken|missing)(?![a-z])`, 'gi'), ' ok'],
  [lbRx(String.raw`(?<![а-яіїєґё])(?:без|не\s+було|не\s+было|немає|нема|нет)\s+(?:дтп|аварі[ії]|аварии|крадіжки|кражи|пожежі|пожара|диму|дыма)(?![а-яіїєґё])|(?<![а-яіїєґё])нічого\s+не\s+(?:вкрали|украли|зникло|пропало)`, 'gi'), ' ok'],
  [lbRx(String.raw`(?<![a-z])(?:no|not\s+any)\s+(?:visible\s+)?(?:damage|leaks?|warning\s+lights?|faults?|defects?|problems?|issues?)(?![a-z])|(?<![a-z])(?:(?:is|are|was|were)\s+)?not\s+(?:damaged|broken|flat|leaking|cracked|bent)(?![a-z])`, 'gi'), ' ok'],
  [lbRx(String.raw`(?<![а-яіїєґё])не\s+(?:скрип|скрегоч|скрежещ|дим|дым|тече|течё|тек|капа|стука|стуч|гуд|вібру|вибрир|смерд|воня|трясе|трясё)[а-яіїєґё]*(?:\s+більше|\s+больше)?`, 'gi'), ' ok'],
  [lbRx(String.raw`(?<![a-z])(?:(?:is|are)\s+)?not\s+(?:squeaking|squealing|grinding|smoking|knocking|rattling|vibrating|dripping|juddering|shaking)(?:\s+any\s*more)?(?![a-z])`, 'gi'), ' ok'],
  [lbRx(String.raw`(?<![а-яіїєґё])не\s+(?:пошкоджен|зламан|повреждён|поврежден|сломан|спущен|пробит|розбит|разбит)[а-яіїєґё]*|(?<![а-яіїєґё])(?:немає|нема|нет|без)\s+(?:пошкоджен|поврежден|несправност|неисправност|витоку|утечки|течі)[а-яіїєґё]*`, 'gi'), ' ok'],
  // Backlog 947: verneinte Schwergängigkeit bzw. verneinter längerer Bremsweg („Bremse geht nicht schwer“, „Lenkung ist nicht mehr schwergängig“,
  // „Bremsweg ist nicht länger geworden“, „brake isn't stiff“) lösen keinen Hinweis aus; „Bremse geht nicht“ und „funktioniert nicht länger“ bleiben Befunde
  [lbRx(String.raw`(?<![a-zäöüß])(?:geht|gehen|ist|sind|l(?:ä|ae)sst\s+sich|lassen\s+sich|wird|wirkt)\s+nicht\s+(?:mehr\s+|so\s+|besonders\s+|zu\s+)?schwer(?:g(?:ä|ae)ngig)?(?![a-zäöüß])(?!\s+(?:zu|auf)(?![a-zäöüß]))`, 'gi'), ' ok'],
  [lbRx(String.raw`(?<![a-zäöüß-])(bremsweg(?:e|s)?)(?![a-zäöüß])\s+(?:(?:ist|sind|wird|wurde|scheint)\s+)?(?:auch\s+)?nicht\s+(?:mehr\s+)?(?:l(?:ä|ae)nger|zu\s+lang|verl(?:ä|ae)ngert)(?![a-zäöüß])(?:\s+geworden)?`, 'gi'), '$1 ok'],
  [lbRx(String.raw`(?<![a-z])(?:is|are|isn['’]t|aren['’]t)\s+(?:not\s+)?(?:stiff|heavy|sticking)(?![a-z])|(?<![a-z])(?:stopping|braking)\s+distance\s+(?:is\s+|has\s+)?(?:not|n['’]t|isn['’]t|hasn['’]t)\s+(?:got\s+|gotten\s+|become\s+)?(?:longer|increased)(?![a-z])`, 'gi'), (m) => (/not|n['’]t/i.test(m) ? ' ok' : m)],
];
const noFunc = (s) => INTERMIT.reduce((a, [re, to]) => a.replace(re, to), COLLOQ.reduce((a, [re, to]) => a.replace(re, to), s)).replace(lbRx(String.raw`(?<=[a-zäöüß])\s*:\s+(?=[a-zäöüß])`, 'gi'), ' ').replace(NO_FUNC, (m) => (/^[a-zäöüß]/i.test(m) ? (/^(?:ohne|kein|funktionslos|tut)/i.test(m) ? 'funktioniert nicht' : 'not working') : (/функциониру/i.test(m) ? 'не работает' : 'не працює')));
// Backlog 932 (Blickwinkel „Gebäude statt Lkw“): Tür/Tor/Licht/Fenster/Heizung/Klima/Steckdose von Büro, Halle, Lager, Werkstatt, Toilette, Hof …
// („Tür vom Büro geht nicht zu“, „im Büro ist das Licht kaputt“, „office door won't close“, „двері в офісі не зачиняються“) sind nicht der Lkw –
// der Teilsatz wird vor allen Hinweisen ausgeblendet. Zusammensetzungen („Bürotür“, „Hallentor“) erkannten die Muster ohnehin nicht. Ort vor dem Gegenstand
// nur bei eindeutigen Räumen (nicht Halle/Hof/Werkstatt: „in der Halle ging die Tür nicht zu“ kann der Lkw sein).
const PLACE_SPAN = lbRx(String.raw`(?<![a-zäöüß-])(?:t(?:ü|ue)r(?:e|en)?|tor(?:e)?|licht(?:er)?|lampe(?:n)?|beleuchtung|fenster|heizung|heizk(?:ö|oe)rper|klima(?:anlage)?|steckdose(?:n)?)(?![a-zäöüß])\s+(?:vom|von\s+(?:der|dem|unserer|unserem)|im|in\s+(?:der|dem|unserer|unserem)|zum|zur|ins|der|des|am|an\s+der|beim|bei\s+der|auf\s+(?:der|dem))\s+(?:b(?:ü|ue)ro(?:s|container|raum)?|(?:lager|werk|fahrzeug)?halle|lager(?:raum)?|werkstatt|toilette|wc|klo|pforte|empfang|umkleide(?:raum)?|aufenthaltsraum(?:es)?|sozialraum(?:es)?|pausenraum(?:es)?|kantine|(?:firmen|b(?:ü|ue)ro)?geb(?:ä|ae)ude(?:s)?|(?:betriebs|firmen)?hof(?:es)?|gel(?:ä|ae)nde(?:s)?|depot(?:s)?|einfahrt|waschhalle|waschanlage)(?![a-zäöüß])[^.;!?,\n]*|(?<![a-zäöüß-])(?:vom|von\s+(?:der|dem|unserer|unserem)|im|in\s+(?:der|dem|unserer|unserem)|zum|zur|ins|der|des|am|an\s+der|beim|bei\s+der|auf\s+(?:der|dem))\s+(?:b(?:ü|ue)ro(?:s|container|raum)?|toilette|wc|klo|pforte|umkleide(?:raum)?|aufenthaltsraum(?:es)?|sozialraum(?:es)?|pausenraum(?:es)?|kantine|(?:firmen|b(?:ü|ue)ro)?geb(?:ä|ae)ude(?:s)?)(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:t(?:ü|ue)r(?:e|en)?|tor(?:e)?|licht(?:er)?|lampe(?:n)?|beleuchtung|fenster|heizung|heizk(?:ö|oe)rper|klima(?:anlage)?|steckdose(?:n)?)(?![a-zäöüß])[^.;!?,\n]*|(?<![a-z-])(?:office|warehouse|depot|yard|building|toilet|bathroom|restroom|washroom|canteen|break\s*room|locker\s*room|gatehouse|reception|shed|wash\s*bay)\s+(?:doors?|gates?|lights?|lamps?|lighting|windows?|heating|heaters?|radiators?|air\s*-?con|socket|sockets)(?![a-z])[^.;!?,\n]*|(?<![a-z-])(?:doors?|gates?|lights?|lamps?|lighting|windows?|heating|heaters?|radiators?|air\s*-?con|socket|sockets)\s+(?:in|of|to|at|on|for)\s+(?:the\s+|our\s+)?(?:office|warehouse|depot|yard|building|toilet|bathroom|restroom|washroom|canteen|break\s*room|locker\s*room|gatehouse|reception|shed|wash\s*bay)(?![a-z])[^.;!?,\n]*|(?<![a-z-])(?:in|at)\s+(?:the\s+|our\s+)?(?:office|toilet|bathroom|restroom|washroom|canteen|break\s*room|locker\s*room|gatehouse|reception)(?![a-z])\s+(?:\S+\s+){0,3}?(?:doors?|gates?|lights?|lamps?|lighting|windows?|heating|heaters?|radiators?|air\s*-?con|socket|sockets)(?![a-z])[^.;!?,\n]*|(?<![а-яіїєґё])(?:двер\S*|ворот\S*|світл\S*|свет(?:а|у)?|ламп\S*|вікн\S*|вікно|окн\S*|окно|опаленн\S*|отоплени\S*|розетк\S*)\s+(?:(?:в|у|на|до|в\s+нашому|у\s+нашому)\s+)?(?:офіс\S*|офис\S*|склад\S*|цех\S*|ангар\S*|туалет\S*|будівл\S*|здани\S*|приміщенн\S*|помещени\S*|роздягальн\S*|раздевалк\S*|їдальн\S*|столов\S*|прохідн\S*|проходн\S*)[^.;!?,\n]*|(?<![а-яіїєґё])(?:в|у)\s+(?:офіс\S*|офис\S*|склад\S*|цех\S*|ангар\S*|туалет\S*|будівл\S*|здани\S*|приміщенн\S*|помещени\S*|роздягальн\S*|раздевалк\S*|їдальн\S*|столов\S*|прохідн\S*|проходн\S*)\s+(?:\S+\s+){0,3}?(?:двер\S*|ворот\S*|світл\S*|свет(?:а|у)?|ламп\S*|вікн\S*|вікно|окн\S*|окно|опаленн\S*|отоплени\S*|розетк\S*)[^.;!?,\n]*`, 'gi');
// Zusammenstoß/Schaden („Tor vom Hof angefahren“, „office door hit by the trailer“) oder der Lkw im selben Teilsatz: Teilsatz bleibt (Unfall-/Lkw-Hinweise).
const PLACE_KEEP = lbRx(String.raw`(?<![a-zäöüß])(?:an(?:ge)?fahren|angefahren|touchiert|gerammt|gestreift|gegen|dagegen|rein\s*gefahren|reingefahren|hineingefahren|reingesetzt|zusammengesto(?:ß|ss)en|besch(?:ä|ae)digt|eingedr(?:ü|ue)ckt|eingedellt|kollidiert|unfall\S*|r(?:ü|ue)ckw(?:ä|ae)rts|rangier\S*|lkw\S*|lastwagen|zugmaschine|sattelzug|auflieger|anh(?:ä|ae)nger|fahrerhaus|kabine)(?![a-zäöüß])|(?<![a-z])(?:hit|hitting|reversed|reversing|backed|backing|crashed|collided|scraped|clipped|bumped|damaged|accident|truck|lorry|trailer|cab|tractor\s+unit)(?![a-z])|(?<![а-яіїєґё])(?:врізав\S*|врезал\S*|зачепи\S*|зацепи\S*|наїха\S*|наеха\S*|в['’]їха\S*|въеха\S*|пошкод\S*|повред\S*|дтп|вантажівк\S*|грузовик\S*|фур\S*|тягач\S*|причеп\S*|прицеп\S*|кабін\S*|кабин\S*)`, 'i');
// Backlog 934 (Blickwinkel „Fahrer kommt später – eigenes Auto streikt“): ausdrücklich private Fahrzeuge und Zweiräder („Privatauto springt nicht an“,
// „mein eigenes Auto hat einen Platten“, „Fahrrad Reifen platt“, „my own car won't start“, „моя особиста машина не заводиться“) sind nicht der Lkw.
// „Mein Auto/mein Wagen“ allein bleibt (Fahrer nennen so auch den Lkw); Zusammenstoß oder Lkw im Teilsatz bleibt wie bei PLACE_KEEP.
const OWNCAR_SPAN = lbRx(String.raw`(?<![a-zäöüß-])(?:privat(?:auto|wagen|fahrzeug|-?pkw)s?|private[nrms]?\s+(?:auto|pkw|wagen)s?|(?:mein|meinem|meinen)\s+(?:privat|eigen)(?:e|en|er|es)?\s+(?:auto|pkw|wagen)s?|(?:mein|meinem)\s+(?:privat(?:auto|wagen|-?pkw))|fahrrads?|e-?bikes?|motorrads?|motorroller|mofa)(?![a-zäöüß])[^.;!?,\n]*|(?<![a-z-])(?:my\s+(?:own|private|personal)\s+(?:car|vehicle)|(?:own|private|personal)\s+car|(?:my\s+)?(?:bike|bicycle|e-?bike|motorbike|scooter))(?![a-z])[^.;!?,\n]*|(?<![а-яіїєґё])(?:(?:мо[яєї]|моя|мій|мою)\s+)?(?:власн\S*|особист\S*|личн\S*|приватн\S*|частн\S*)\s+(?:машин\S*|авто\S*|легков\S*)[^.;!?,\n]*|(?<![а-яіїєґё])(?:велосипед\S*|мопед\S*|мотоцикл\S*|скутер\S*)[^.;!?,\n]*`, 'gi');
const noPlace = (s) => String(s || '').split(/([.;!?,\n]+)/).map((part) => (PLACE_KEEP.test(part) ? part : part.replace(PLACE_SPAN, ' ◇ ').replace(OWNCAR_SPAN, ' ◇ '))).join('');
// Backlog 957 (Blickwinkel „zwei Schäden in einer Meldung“): DE Verbzweitstellung nach Adverb („außerdem verliert der Reifen Luft“, „zusätzlich klemmt die Tür“,
// „seit gestern zieht die Lenkung nach links“) – der Gegenstand (Artikel + ggf. Adjektiv + Wort) wird hinter einem Trenner (⁘) zusätzlich in Normalstellung angehängt („… ⁘der Reifen verliert Luft“).
const V2_INV = lbRx(String.raw`(?<![a-zäöüß])((?:au(?:ß|ss)erdem|zus(?:ä|ae)tzlich|dazu|dann|danach|jetzt|nun|auch|leider|pl(?:ö|oe)tzlich|manchmal|st(?:ä|ae)ndig|immer\s+wieder|wieder|seit\s+[a-zäöüß0-9.]+|(?:heute|gestern|vorgestern)(?:\s+(?:morgen|fr(?:ü|ue)h|mittag|abend|nacht))?|morgens|abends|nachts|unterwegs|beim\s+[a-zäöüß]+|nach\s+der\s+[a-zäöüß]+|nach\s+dem\s+[a-zäöüß]+))\s+(?!(?:der|die|das|den|dem|ein|eine|mein|meine|unser|unsere|er|sie|es|ich|wir|man)(?![a-zäöüß]))([a-zäöüß]+(?:t|en))\s+((?:der|die|das|mein|meine|unser|unsere)\s+(?:(?:link|recht|vorder|hinter|neu|alt|ober|unter|mittler|erst|zweit|dritt|(?:ä|ae)u(?:ß|ss)er|inner|gro(?:ß|ss)|klein)e[nrs]?\s+)?(?!(?:hinten|vorne|vorn|links|rechts|oben|unten|nicht|nie|kein\S*|mehr|immer|wieder|schon|auch|noch|sehr|ganz|so|zu|beim|im|am|an|auf|in|nach|bei|seit|und|oder|aber|seit)(?![a-zäöüß]))[a-zäöüß-]{3,})(?![a-zäöüß-])`, 'gi');
// Backlog 958 (Fund aus 957): „Tür klemmt nicht mehr“, „Plane flattert nicht mehr“, „Getriebe hakt nicht mehr“, „Kühlung fällt nicht mehr aus“, „Reifen verliert keine Luft mehr“
// sind Erledigt-Vermerke – Störungsverb + „nicht mehr“ (nicht „geht/funktioniert/schließt/leuchtet/zieht nicht mehr“ = neue Störung, nicht „… nicht mehr richtig“) wird durch „◦ ⁂ behoben“ ersetzt
// (das Störungswort fällt weg; ⁂ trennt, damit FIX_NEG/FIX_PLAN den Vermerk nicht als verneint/geplant lesen).
const NO_MORE = lbRx(String.raw`(?<![a-zäöüß])(?:(?:klemm|quietsch|h(?:ä|ae)ng|wackel|ruckel|flacker|flatter|rutsch|qualm|hak|schmier|tropf|leck|klapper|vibrier|rauch|stink|zisch|pfeif|schleif|knack|knarz|brumm|dr(?:ö|oe)hn|ratter|spinn|ruck)(?:t|en)\s+(?:(?:jetzt|seitdem|seither|zum\s+gl(?:ü|ue)ck)\s+)?nicht\s+mehr(?!\s+(?:richtig|gut|ordentlich|sauber|ganz|vollst(?:ä|ae)ndig|zu(?![a-zäöüß])|auf(?![a-zäöüß])))|f(?:ä|ae)ll(?:t|en)\s+(?:(?:jetzt|seitdem|seither)\s+)?nicht\s+mehr\s+aus|verlier(?:t|en)\s+(?:(?:jetzt|seitdem|seither)\s+)?(?:keine|kein)\s+(?:[a-zäöüß]+\s+)?mehr)(?![a-zäöüß])`, 'gi');
// Backlog 959: Erledigt-Vermerk „nicht mehr“ auch in EN/UK/RU („brakes no longer squeak“, „door doesn't stick anymore“, „wiper stopped smearing“,
// „гальма більше не скриплять“, „тормоза больше не скрипят“, „перестали скрипіти“) und Ziehen zur Seite („Lenkung zieht nicht mehr nach links“,
// „steering no longer pulls to the left“, „кермо більше не тягне вліво“). Ohne Richtung bleibt „zieht/тягне nicht mehr“ Leistungsverlust; „works/працює/вимикається“ bewusst nicht.
const NO_MORE_X = lbRx(String.raw`(?<![a-zäöüß])(?:lenkung\s+zieh(?:t|en)\s+(?:(?:jetzt|seitdem|seither)\s+)?nicht\s+mehr(?!\s+(?:richtig|gut|ganz))|zieh(?:t|en)\s+(?:(?:jetzt|seitdem|seither)\s+)?nicht\s+mehr\s+(?:nach\s+(?:links|rechts)|zur\s+seite|einseitig|schief))(?![a-zäöüß])|(?<![a-z])(?:no\s+longer|(?:has\s+|have\s+)?stopped|(?:does|do|is|are|did)(?:\s+not|n['’]t))\s+(?:(?:squeak|squeal|stick|smear|flicker|flap|leak|drip|rattl|vibrat|shak|judder|grind|hiss|knock|smok|stink|jerk|slip|whin|whistl|buzz|clunk)[a-z]{0,4}|cut(?:s|ting)?\s+out|los(?:e|es|ing)\s+air|pull(?:s|ing)?\s+(?:to\s+(?:the\s+)?(?:left|right|one\s+side)|left|right|sideways))(?:\s+any\s*more)?(?![a-z])|(?<![а-яіїєґё])(?:(?:більше|вже|уже|больше)\s+не|перестал[аои]?|перестав(?:ла|ли|ло)?)\s+(?:(?:заїда|заеда|скрип|тек|теч|капа|мига|мерехт|мерца|стука|стуча|вібру|вибриру|гуд|шип|спуска|смика|дерга|димит|дымит|смерд|воня|гримі|гриміт|гремет|гремит|торохт|тарахт|деренч|дребезж|буксу|проковзу|проскальзыва|замерз|примерз|змерз)[а-яіїєґё]*|(?:тягн|тягну|тян|тянут)[а-яіїєґё]*\s+(?:вліво|вправо|ліворуч|праворуч|убік|в\s+бік|влево|вправо|в\s+сторону|налево|направо))(?:\s+більше|\s+больше)?(?![а-яіїєґё])|(?<![а-яіїєґё])не\s+(?:заїда|заеда|скрип|тече|течу|теч[её]|капа|мига|мерехт|мерца|стука|стуча|вібру|вибриру|шип|спуска)[а-яіїєґё]*\s+(?:більше|больше)(?![а-яіїєґё])`, 'gi');
// Backlog 964: russ. „ё“ wird oft als „е“ geschrieben (und umgekehrt) – Muster kennen meist nur „е“; vor der Prüfung angleichen
// Backlog 965 (Blickwinkel „Fahrer diktiert per Sprachnachricht – lange Sätze ohne Satzzeichen“): ein Reparaturvermerk zu einem ANDEREN Bauteil im selben
// Satz („lenkung zieht nach rechts das radio wurde gewechselt“, „колесо спускає а двірники замінили“, „steering pulls right and the radio was replaced“)
// unterdrückte über die Prüfung „(?![^.;!?]*repariert…)“ die Hinweise zu Lenkung/Reifen/Bremse. clauseCut setzt vor einem solchen Nebensatz
// (Bindewort/Artikel + Bauteil, höchstens 6 Wörter vor dem Vermerk) eine Satzgrenze – nicht, wenn das Bauteil vorher schon genannt ist
// (gleicher Wortstamm, 4 Zeichen: „bremse … und die bremsen wurden repariert“) oder wenn Person/Werkstatt bzw. ein Fürwort folgt („und der mechaniker hat sie repariert“).
const CLAUSE_FIXW = lbRx(String.raw`(?<![a-zäöüß])(?:repariert|erneuert|(?:aus)?getauscht|ersetzt|(?:aus)?gewechselt|instand\s*gesetzt|fixed|repaired|replaced|changed)(?![a-zäöüß])|(?<![а-яіїєґ])(?:відремонт|отремонт|замінил|замінен|заменил|заменен|поміня|поменя|полагод|почини)[а-яіїєґ']*`, 'gi');
const CLAUSE_HEAD = lbRx(String.raw`(?<![a-zäöüßа-яіїєґ'])(?:(?:und|and|а|и|і|та|й|also|dann|then)\s+(?:(?:der|die|das|den|dem|the|my|our|their|a|an)\s+)?|(?:der|die|das|den|dem|the|my|our|their)\s+)([a-zäöüßа-яіїєґ'-]{3,})(?![a-zäöüßа-яіїєґ'])`, 'gi');
const CLAUSE_SKIP = /^(?:wurde|wurden|ist|sind|war|waren|hat|haben|hatte|wird|werden|was|were|has|have|had|got|been|is|are|it|they|them|he|she|we|you|es|er|sie|wir|ihr|man|ich|auch|schon|gestern|heute|letzte|letzten|last|yesterday|today|also|then|dann|noch|still|аж|вже|уже|ще|еще|вчора|вчера|сьогодні|сегодня|його|її|их|його|ее|його|він|вона|вони|он|она|они|це|это|мені|мне|нам|mechaniker|monteur|werkstatt|kollege|kollegen|chef|mechanic|mechanics|garage|workshop|fitter|механік|механики|механік|механик|майстер|мастер|сто|сервіс|сервис)$/i;
// zwischen Bauteil und Vermerk kein Komma/Gegensatz/Rückbezug („hole in the tarp again, although it was fixed“ bleibt ein Satz)
const CLAUSE_GAP = lbRx(String.raw`[,:]|(?<![a-zäöüßа-яіїєґ'])(?:obwohl|aber|weil|trotz|nachdem|seit|wieder|although|though|but|because|after|since|again|хоча|хотя|але|но|бо|потому|після|после|знову|опять|снова)(?![a-zäöüßа-яіїєґ'])`, 'i', 1);
const clauseCut = (s) => String(s || '').split(/([.;!?\n]+)/).map((part) => {
  const cuts = [];
  for (const f of part.matchAll(CLAUSE_FIXW)) {
    const before = part.slice(0, f.index); const win = before.split(/\s+/).slice(-7).join(' '); const winAt = before.length - win.length;
    let head = null; for (const h of win.matchAll(CLAUSE_HEAD)) if (!CLAUSE_SKIP.test(h[1]) && !CLAUSE_GAP.test(win.slice(h.index + h[0].length))) { head = h; break; }
    if (!head) continue;
    const at = winAt + head.index, prev = part.slice(0, at);
    if (prev.trim().split(/\s+/).length < 2 || /,\s*$/.test(prev)) continue;
    const stem = head[1].toLowerCase().slice(0, 4);
    if (prev.toLowerCase().split(/[^a-zäöüßа-яіїєґ'-]+/).some((w) => w.startsWith(stem))) continue;
    cuts.push(at);
  }
  return [...new Set(cuts)].sort((a, b) => b - a).reduce((p, at) => p.slice(0, at).replace(/\s+$/, '') + '. ' + p.slice(at), part);
}).join(""); // doppelte Anführungszeichen: Tests schneiden bis zum ersten join mit einfachen Anführungszeichen nach FIX_WORD (Ende von recurFix)
const recurFix = (s) => noFunc(noPlace(clauseCut(String(s || '').replace(/ё/g, 'е').replace(/Ё/g, 'Е'))).replace(STOP_WORK, 'not working')).replace(PRED_FIRST, (m, v, subj) => m + ' ⁘' + subj + ' ' + v).replace(V2_INV, (m, adv, v, subj) => m + ' ⁘' + subj + ' ' + v).replace(NO_MORE, '◦ ⁂ behoben').replace(NO_MORE_X, '◦ ⁂ behoben').split(/([.;!?\n]+)/).map((part) => {
  const all = RECUR_MARK.test(part);
  return part.replace(FIX_WORD, (w, off) => (all || FIX_NEG.test(part.slice(0, off)) || FIX_PLAN.test(part.slice(0, off)) || FIX_PLAN_AFTER.test(part.slice(off + w.length)) || /(?:ти|ть|тися|ться)$/i.test(w) ? (/^\S*wieder/i.test(w) || /^(?:schon|immer)\s/i.test(w) ? '' : '◦') : w));
}).join('');
// Backlog 764: Reparaturvermerk zentral für ältere Hinweise zu Geräten/Ausstattung (Warnleuchte, DPF, Startprobleme, Armaturen, Telematik, Sitz,
// Fenster, Fahrerhaus-Ausstattung/-Nässe/-Schloss, Tankdeckel, Elektrik, Batterie, Spiegel, Getriebe, Abgas, Maut, Türen, Sicht, Aufstieg):
// noFixed blendet im Satz alles vor dem letzten echten Reparaturvermerk aus („…, repariert“, „funktioniert wieder“, „working again“, „замінили“).
// Läuft nach recurFix (wiederkehrende/nicht behobene Mängel sind dort schon neutralisiert); „muss getauscht werden“, „needs to be replaced“,
// „треба замінити“ zählen nicht als Reparatur. Bremse, Lenkung, Reifen/Rad, Kupplung, Feuer, Lecks und Versicherungs-/Ereignis-Hinweise bewusst nicht.
const FIXED_NOTE = lbRx(String.raw`(?<![a-zäöüß])(?<!(?<![a-z])be\s+)(?:repariert|erneuert|(?:aus)?getauscht|ersetzt|behoben|(?:aus)?gewechselt|instand\s*gesetzt|gereinigt|befestigt|(?:funktioniert|geht|l(?:ä|ae)uft)\s+wieder(?!\s+(?:nicht|an|aus|auf|zu|ab|los|kaputt)(?![a-zäöüß]))|wieder\s+(?:ok|okay|in\s+ordnung)|fixed|repaired|replaced|(?<!(?:not|never|n['’]t|stopp?(?:ed|s)?|quit(?:s|ted)?|ceased?)\s+)(?:works?|working)\s+again)(?![a-zäöüß])(?!\s+(?:werden|wird|lassen))|(?<![а-яіїєґё])(?:відремонтува(?:в|ла|ли|но)|відремонтован[а-яіїєґё]*|замін(?:ив|или|ила|ено|ений|ена|ені)|поміня(?:в|ла|ли|но)|полагоди(?:в|ла|ли)|отремонтирова(?:л|ла|ли|но)|отремонтирован[а-яё]*|замен(?:ил|или|ила|ено|[её]н|ен|ена|ены)|поменя(?:л|ла|ли|но)|почини(?:л|ла|ли)|усун(?:ув|ули|уто|ено)|устран(?:ил|или|ено|[её]н|ен))(?![а-яіїєґё])|(?<![а-яіїєґё])(?:знову|знов|снова|опять)\s+(?:працює|работает)(?![а-яіїєґё])`, 'gi');
// Backlog 766: Vermerk vor dem Befund mit Gegensatz („Fensterheber getauscht, aber geht nicht“, „power window fixed but not working“,
// „замінили, але не працює“) heißt: Mangel besteht weiter – dann bleibt der Satz unverändert (Hinweis erscheint).
const FIX_BUT = lbRx(String.raw`(?<![a-zäöüß])(?:aber|jedoch|doch|allerdings|but|however|yet)(?![a-zäöüß])|(?<![а-яіїєґё])(?:але|проте|однак|но|однако)(?![а-яіїєґё])`, 'i');
const FIX_BUT_NEG = lbRx(String.raw`(?<![a-zäöüß])(?:nicht|nie|kein\S*|not|never|no\s+longer|defekt|kaputt|broken|faulty)(?![a-zäöüß])|n['’]t(?![a-z])|(?<![а-яіїєґё])(?:не|ні|нет|злама[внл]\S*|сломан\S*)(?![а-яіїєґё])`, 'i', 1); // Backlog 774: auch „aber defekt/kaputt“
// Backlog 768: „geht wieder an/aus/auf“ (Warnleuchte geht wieder an, Standheizung geht wieder aus) und „stopped working again“ sind kein Reparaturvermerk.
// Nur Abholung/Abrechnung offen („getauscht, aber noch nicht abgeholt“, „fixed but not picked up yet“) ist kein fortbestehender Mangel.
const FIX_BUT_ADMIN = lbRx(String.raw`(?<![a-zäöüß])(?:abgeholt|bezahlt|abgerechnet|berechnet|picked\s+up|collected|invoiced|paid)(?![a-zäöüß])|(?<![а-яіїєґё])(?:забра|оплат|заплат)[а-яіїєґё]*`, 'i', 1);
// Backlog 774: Gegenstand und Befund durch den Vermerk getrennt („Fensterheber repariert, geht aber nicht“, „Klima repariert, kühlt aber nicht“, „air con fixed but still not cold“,
// „Fensterheber repariert, aber geht immer noch nicht“ – dort hat recurFix den Vermerk schon zu ◦ neutralisiert): hinter einem Trenner ⁘ wird zusätzlich
// „Gegenstand + Befund“ ohne Vermerk, Gegensatzwort und Füllwörter (immer noch/trotzdem/still/все одно …) angehängt.
const FIX_FILL = lbRx(String.raw`(?<![a-zäöüß])(?:immer\s+noch|noch\s+immer|trotzdem|dennoch|weiterhin|(?:immer\s+|schon\s+)?wieder|manchmal|ab\s+und\s+zu|zeitweise|sporadisch|gelegentlich|(?:immer\s+)?öfter|oft|h(?:ä|ae)ufig|st(?:ä|ae)ndig|dauernd|still|anyway|anyhow|again|sometimes|occasionally)(?![a-zäöüß])|(?<![а-яіїєґё])(?:все\s+одно|вс[её]\s+равно|все\s+равно|досі|до\s+сих\s+пор|й\s+далі|ще|еще|ещ[её]|знову|знов|снова|опять)(?![а-яіїєґё])`, 'gi');
// Backlog 777: Ausfall nach dem Gegensatzwort ohne Verneinung („Klima repariert, fällt aber wieder aus“, „…, spinnt aber“, „air con fixed but keeps cutting out“,
// „кондиціонер полагодили, але знову вимикається“) – geprüft werden die zwei Wörter vor dem Gegensatzwort und alles danach (nicht der ganze Rest,
// damit „Termin fällt aus, aber …“ weiter vorn nichts auslöst)
const FIX_BUT_FAIL = lbRx(String.raw`(?<![a-zäöüß])(?:f(?:ä|ae|a)llt\s+(?:\S+\s+){0,3}?aus|ausgefallen|spinnt|hakt|klemmt|ruckelt|langsam|(?:geht|funktioniert|klappt|l(?:ä|ae)uft|k(?:ü|ue)hlt|heizt|startet)\s+(?:\S+\s+)?nicht)(?![a-zäöüß])|(?<![a-z])(?:cuts?\s+(?:out|off)|cutting\s+(?:out|off)|fail(?:s|ed|ing)?|stopped|died|dies|playing\s+up|not\s+working|slow|sluggish|stuck)(?![a-z])|(?<![а-яіїєґё])(?:повільн[а-яіїєґ]*|медленн[а-яё]*|заїда[а-яіїєґ]*|заеда[а-яё]*|вимика[а-яіїєґ]*ся|відключа[а-яіїєґ]*ся|відмовля[а-яіїєґ]*|відмовив|отключа[а-яё]*ся|выключа[а-яё]*ся|отказыва[а-яё]*|вийшов\s+з\s+ладу|вышел\s+из\s+строя|не\s+працю[а-яіїєґ]*|не\s+работа[а-яё]*)`, 'i', 1);
const FIX_BUT_G = new RegExp(FIX_BUT.source, 'gi');
const noFixed = (s) => String(s || '').split(/([.;!?\n]+)/).map((part) => { let end = -1, start = -1, neutral = false; for (const m of part.matchAll(FIXED_NOTE)) { start = m.index; end = m.index + m[0].length; } if (end < 0) { const ci = part.lastIndexOf('◦'); if (ci < 0) return part; start = ci; end = ci + 1; neutral = true; } const rest = part.slice(end), but = rest.match(FIX_BUT), after = but ? rest.slice(but.index + but[0].length) : ''; if (but && (FIX_BUT_NEG.test(after) || FIX_BUT_FAIL.test(rest.slice(0, but.index).split(/[,:]/).pop().trim().split(/\s+/).slice(-2).join(' ') + ' ' + after)) && !FIX_BUT_ADMIN.test(rest)) return part + ' ⁘ ' + (part.slice(0, start) + ' ' + rest.replace(FIX_BUT_G, ' ').replace(FIX_FILL, ' ')).replace(/[,:]/g, ' ').replace(/\s+/g, ' ').trim(); if (neutral) return part; return ' '.repeat(end) + rest; }).join('');
// Backlog 700: Wasser im Fahrerhaus (Dachluke/Fahrerhaus undicht, Fußraum nass, Dachluke schließt nicht, Schimmel) – eigene Schritte
const CABLEAK_HINT = lbRx(String.raw`(?<![a-zäöüß-])(?:fahrer|beifahrer)t(?:ü|ue)r(?:en|e)?(?![a-zäöüß])\s+(?:(?:ist|sind|wird|seit|bei|regen|wieder|unten|oben)[,;]?\s+){0,3}(?:undicht|leckt|zieht\s+wasser)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced))|(?<![a-zäöüß-])(?:t(?:ü|ue)r)?dichtung\s+(?:an\s+der\s+|der\s+)?(?:fahrer|beifahrer)t(?:ü|ue)r\s+(?:(?:ist|sind)\s+)?(?:undicht|kaputt|defekt|rissig|l(?:ö|oe)st\s+sich|h(?:ä|ae)ngt\s+raus|lose)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced))|(?<![a-zäöüß-])wasser\s+(?:steht\s+)?(?:im|in\s+der)\s+(?:fahrerhaus|f(?:ü|ue)hrerhaus|schlafkabine|kabine|fu(?:ß|ss)raum)(?![a-zäöüß])|(?<![a-zäöüß-])wasser\s+(?:\S+\s+){0,2}?(?:l(?:ä|ae|a)uft|tropft|kommt|steht|dringt|sammelt\s+sich|l(?:ä|ae|a)uft\s+rein)\s+(?:\S+\s+){0,3}?(?:ins|in\s+(?:das|die|den)|im|in\s+der|unter\s+(?:dem|den))\s+(?:fahrerhaus|f(?:ü|ue)hrerhaus|kabine|fu(?:ß|ss)raum|lkw)(?![a-zäöüß])|(?<![a-zäöüß-])(?:fahrerhaus|f(?:ü|ue)hrerhaus|schlafkabine|kabine|dachluke|dachfenster|schiebedach|dachl(?:ü|ue)fter|dachhaube|hochdach|fahrerhausdach|kabinendach)(?![a-zäöüß])\s+(?:(?:ist|sind|wird|seit|heute|gestern|bei|regen|wieder|stark|komplett|leicht|oben|vorne|hinten|links|rechts)[,;]?\s+){0,3}(?:undicht|leckt|tropft|nass(?![a-zäöüß]))|(?<![a-zäöüß-])(?:es\s+)?regnet\s+(?:es\s+)?(?:\S+\s+){0,2}?(?:rein|herein|durch(?![a-zäöüß])|ins\s+(?:fahrerhaus|f(?:ü|ue)hrerhaus)|in\s+die\s+kabine)(?![a-zäöüß])|(?<![a-zäöüß-])(?:fu(?:ß|ss)raum|fu(?:ß|ss)matte(?:n)?|teppich|boden\s+im\s+fahrerhaus|matratze|liege|bettzeug)\s+(?:(?:ist|sind|im|in\s+der|fahrerhaus|kabine|schon|wieder|komplett|ganz|st(?:ä|ae)ndig|immer)[,;]?\s+){0,3}(?:nass|feucht|unter\s+wasser|durchn(?:ä|ae)sst|klatschnass)(?![a-zäöüß])(?!\s+(?:gereinigt|gewischt|geputzt|gemacht|gesaugt))|(?<![a-zäöüß-])(?:dachluke|dachfenster|schiebedach|dachl(?:ü|ue)fter|dachhaube)\s+(?:(?:ist|l(?:ä|ae|a)sst|sich|geht|schlie(?:ß|ss)t|mehr|nicht|richtig|ganz)\s+){0,4}(?:klemmt|nicht\s+(?:mehr\s+)?(?:zu|schlie(?:ß|ss)en|dicht)|kaputt|defekt|gebrochen|gerissen|undicht)(?![a-zäöüß])|(?<![a-zäöüß-])schimmel\s+(?:im|in\s+der|am|an\s+der)\s+(?:fahrerhaus|kabine|liege|matratze|decke|dachhimmel)|(?<![a-z])water\s+(?:is\s+)?(?:leaking|leaks|coming|getting|dripping|running|pooling)\s+(?:in(?:to)?|onto)\s+(?:the\s+)?(?:cab|footwell|bunk)(?![a-z])|(?<![a-z])(?:cab|roof\s+hatch|sun\s*roof|roof\s+vent|roof\s+light)\s+(?:is\s+)?(?:leaking|leaks|leaky|letting\s+(?:water|rain)\s+in)(?![a-z])|(?<![a-z])rain\s+(?:is\s+)?(?:getting|coming|leaking)\s+(?:in(?:to)?)\s+(?:the\s+)?cab(?![a-z])|(?<![a-z])(?:wet|soaked|damp)\s+(?:footwell|cab\s+floor|floor\s+mats?|mattress|bunk)(?![a-z])|(?<![a-z])roof\s+hatch\s+(?:won['’]?t\s+close|doesn['’]?t\s+close|stuck|broken)(?![a-z])|(?<![a-z])mou?ld\s+in\s+(?:the\s+)?cab(?![a-z])|(?<![а-яіїєґё])вод\S*\s+(?:\S+\s+){0,2}?(?:тече|капає|капает|потрапляє|попадает|протікає|протекает|затікає|затекает|стоїть|стоит)\s+(?:\S+\s+){0,2}?(?:в|у)\s+кабін\S*|(?<![а-яіїєґё])вод\S*\s+(?:\S+\s+){0,2}?(?:тече|капає|капает|попадает|протекает|затекает|стоит)\s+(?:\S+\s+){0,2}?в\s+кабин\S*|(?<![а-яіїєґё])(?:кабін\S*|кабин\S*|люк\S*|дах\S*\s+кабіни|крыш\S*\s+кабины)\s+(?:\S+\s+){0,2}?(?:протікає|протекает|тече(?![а-яіїєґё])|течет|не\s+закрива|не\s+закрыва)|(?<![а-яіїєґё])(?:мокр\S*|сир\S*|вологий|вологі|влажн\S*)\s+(?:килимок|килимки|коврик\S*|підлог\S*|пол(?![а-яіїєґё])|матрац\S*|матрас\S*)|(?<![а-яіїєґё])(?:пліснява|плесень|цвіль)\s+(?:в|у)\s+кабін\S*|(?<![а-яіїєґё])плесень\s+в\s+кабин\S*|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?:тече|течет|протіка\S*|протека\S*|затіка\S*|затека\S*)\s+(?:\S+\s+)?вод\S*\s+(?:в|у)\s+(?:кабін\S*|кабин\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-z-])water\s+(?:\S+\s+)?(?:in|into)\s+(?:the\s+)?(?:cab|cabin|footwell|bunk)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])вод\S*\s+(?:\S+\s+)?(?:в|у)\s+(?:кабін\S*|кабин\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?<![а-яіїєґё])(?:в|у)\s+(?:кабін\S*|кабин\S*)\s+(?:\S+\s+)?(?:тече|теч[её]т|капає|капает|протіка\S*|протека\S*|затіка\S*|затека\S*|мокро|сиро|сыро|калюж\S*|лужа)(?![а-яіїєґё])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?<![а-яіїєґё])(?:кабін\S*|кабин\S*|люк\S*)\s+(?:\S+\s+)?теч[её]т(?![а-яіїєґё])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?<![a-z-])(?:rain|water)\s+(?:is\s+|keeps\s+)?(?:getting|coming|leaking|dripping)\s+in\s+(?:through|via|from|around)\s+(?:the\s+)?(?:roof\s+hatch|sun\s*roof|roof\s+vent|roof\s+light|cab\s+roof|door\s+seals?)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?<![a-z-])(?:cab\s+)?roof\s+(?:is\s+)?(?:leaking|leaks|leaky|dripping|drips)\s+(?:in(?:to)?|on(?:to)?)\s+(?:the\s+|my\s+)?(?:cab|bunk|bed|seat|footwell|dashboard)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?<![a-z-])cab\s+roof\s+(?:is\s+)?(?:leaking|leaks|leaky)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?<![^.;!?]*(?:laderaum|ladefl(?:ä|ae)che|koffer|plane|aufbau|auflieger|anh(?:ä|ae)nger|ladung|ware|container|k(?:ü|ue)hlraum|cargo|load(?![a-z])|trailer|box\s+body|curtain|вантаж\S*|кузов\S*|причіп\S*|прицеп\S*|напівпричіп\S*|полуприцеп\S*|тент\S*|фургон\S*)[^.;!?]*)(?<![a-z-])(?:rain\s*)?water\s+(?:is\s+|keeps\s+)?(?:getting|coming|leaking|dripping)\s+in(?![a-z])(?=[^.;!?]*(?:when\s+it\s+rains|in\s+the\s+rain|from\s+above|from\s+the\s+roof))(?![^.;!?]*(?:laderaum|ladefl(?:ä|ae)che|koffer|plane|aufbau|auflieger|anh(?:ä|ae)nger|ladung|ware|container|k(?:ü|ue)hlraum|cargo|load(?![a-z])|trailer|box\s+body|curtain|вантаж\S*|кузов\S*|причіп\S*|прицеп\S*|напівпричіп\S*|полуприцеп\S*|тент\S*|фургон\S*))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?<![^.;!?]*(?:laderaum|ladefl(?:ä|ae)che|koffer|plane|aufbau|auflieger|anh(?:ä|ae)nger|ladung|ware|container|k(?:ü|ue)hlraum|cargo|load(?![a-z])|trailer|box\s+body|curtain|вантаж\S*|кузов\S*|причіп\S*|прицеп\S*|напівпричіп\S*|полуприцеп\S*|тент\S*|фургон\S*)[^.;!?]*)(?<![a-zäöüß-])(?:(?:regen)?wasser\s+(?:\S+\s+){0,2}?(?:l(?:ä|ae|a)uft|kommt|tropft|dringt|sickert)|es\s+tropft)\s+(?:(?:bei|beim|von|oben|regen|immer|st(?:ä|ae)ndig|wieder|dauernd|seit|heute|gestern|vorne|hinten|links|rechts|innen)[,;]?\s+){0,3}(?:rein|herein)(?![a-zäöüß])(?![^.;!?]*(?:laderaum|ladefl(?:ä|ae)che|koffer|plane|aufbau|auflieger|anh(?:ä|ae)nger|ladung|ware|container|k(?:ü|ue)hlraum|cargo|load(?![a-z])|trailer|box\s+body|curtain|вантаж\S*|кузов\S*|причіп\S*|прицеп\S*|напівпричіп\S*|полуприцеп\S*|тент\S*|фургон\S*))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?<![^.;!?]*(?:laderaum|ladefl(?:ä|ae)che|koffer|plane|aufbau|auflieger|anh(?:ä|ae)nger|ladung|ware|container|k(?:ü|ue)hlraum|cargo|load(?![a-z])|trailer|box\s+body|curtain|вантаж\S*|кузов\S*|причіп\S*|прицеп\S*|напівпричіп\S*|полуприцеп\S*|тент\S*|фургон\S*)[^.;!?]*)(?<![a-zäöüß-])bei(?:m)?\s+regen\s+(?:(?:immer|st(?:ä|ae)ndig|wieder|dauernd|oben|vorne|hinten)\s+)?(?:kommt|l(?:ä|ae|a)uft|tropft|dringt|sickert)\s+(?:(?:immer|st(?:ä|ae)ndig|wieder|dauernd)\s+)?(?:(?:das\s+)?(?:regen)?wasser|es)\s+(?:(?:immer|st(?:ä|ae)ndig|wieder|dauernd|oben|von\s+oben)\s+)?(?:rein|herein)(?![a-zäöüß])(?![^.;!?]*(?:laderaum|ladefl(?:ä|ae)che|koffer|plane|aufbau|auflieger|anh(?:ä|ae)nger|ladung|ware|container|k(?:ü|ue)hlraum|cargo|load(?![a-z])|trailer|box\s+body|curtain|вантаж\S*|кузов\S*|причіп\S*|прицеп\S*|напівпричіп\S*|полуприцеп\S*|тент\S*|фургон\S*))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))`, 'i', 1);
// Backlog 702: Telematik-/Ortungsgerät, Navi oder Bordtablet defekt – eigene Schritte (nicht ins Gerät eingreifen; Tachograph hat eigene Schritte)
const TELEM_HINT = lbRx(String.raw`(?<![a-zäöüß-])(?:navi(?:gationsger(?:ä|ae)t|gationssystem|gation|ger(?:ä|ae)t)?|telematik(?:-?(?:box|ger(?:ä|ae)t|einheit|modul))?|ortung(?:sger(?:ä|ae)t|ssystem)?|gps(?:-?(?:ger(?:ä|ae)t|ortung|tracker|empfang|signal))?|tracker|bordtablet|fahrertablet|yellow-?fox(?:-?(?:ger(?:ä|ae)t|box|tablet))?|webfleet(?:-?(?:ger(?:ä|ae)t|box|tablet))?)(?![a-zäöüß])\s+(?:(?:ist|im|in|der|die|das|dem|den|lkw|fahrzeug|seit|heute|gestern|schon|wieder|komplett|ganz|st(?:ä|ae)ndig|immer|dauernd|mehr|auch)[,;]?\s+){0,4}(?:defekt|kaputt|geht\s+nicht|funktioniert\s+nicht|ausgefallen|f(?:ä|ae)llt\s+(?:st(?:ä|ae)ndig\s+|immer\s+)?aus|ohne\s+(?:funktion|signal|empfang)|kein(?:e|en)?\s+(?:signal|verbindung|empfang|position|daten)|startet\s+nicht|bleibt\s+schwarz|h(?:ä|ae)ngt\s+sich\s+auf|friert\s+ein|eingefroren|zeigt\s+nichts|sendet\s+nicht|meldet\s+sich\s+nicht|offline|reagiert\s+nicht|geht\s+(?:st(?:ä|ae)ndig\s+|immer\s+)?aus)(?![a-zäöüß])(?![,;.]?\s+(?:\S+\s+)?(?:repariert|getauscht|ersetzt|erledigt|wieder\s+(?:ok|da|in\s+ordnung)|ok(?![a-zäöüß])))|(?<![a-zäöüß-])(?:kein(?:e|en)?|ohne)\s+(?:gps(?:-?(?:signal|empfang))?|ortung|navi|telematik)(?![a-zäöüß])(?!\s+(?:\S+\s+)?(?:n(?:ö|oe)tig|erforderlich|vorhanden|eingebaut|verbaut))|(?<![a-z])(?:sat\s*-?nav|navigation(?:\s+(?:system|unit|device))?|gps(?:\s+(?:unit|device|tracker))?|tracker|tracking\s+(?:device|unit|box)|telematics(?:\s+(?:unit|box|device))?|on-?board\s+tablet|driver\s+tablet)\s+(?:(?:is|has|in|the|truck|still|keeps|completely|now|not)\s+){0,3}(?:not\s+working|broken|dead|faulty|offline|frozen|no\s+signal|lost\s+signal|not\s+tracking|not\s+sending|won['’]?t\s+(?:turn\s+on|start|work)|doesn['’]?t\s+work|does\s+not\s+work|keeps\s+(?:crashing|freezing|turning\s+off)|black\s+screen)(?![a-z])(?!\s+(?:\S+\s+)?(?:fixed|replaced|ok(?![a-z])))|(?<![а-яіїєґё])(?:навігатор\S*|навигатор\S*|навігаці\S*|навигаци\S*|gps|телематик\S*|трекер\S*|бортов\S*\s+планшет\S*|планшет\S*\s+водія|yellowfox|webfleet)\s+(?:\S+\s+){0,2}?(?:не\s+працю|не\s+работа|злама[внл]|сломан|поламан|немає\s+сигнал|нема\s+сигнал|нет\s+сигнал|не\s+вмика|не\s+включа|завис|не\s+показу|не\s+показыва|офлайн|не\s+відправля|не\s+отправля)|(?<![а-яіїєґё])(?:немає|нема|нет)\s+(?:gps|сигналу\s+gps|сигнала\s+gps|навігатор|навигатор)\S*|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-zäöüß-])(?:navi|navigationsger(?:ä|ae)t|navigation|navigationssystem)\s+(?:\S+\s+){0,2}?spinnt(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))`, 'i', 1);
// Backlog 704: Motorölstand zu niedrig, Öl nachgefüllt oder hoher Ölverbrauch – eigene Schritte (Sorte nur laut Betriebsanleitung, keine Mengenvorgabe)
const OILLEVEL_HINT = lbRx(String.raw`(?<![a-zäöüß-])(?:motor)?(?:ö|oe)l(?:stand|pegel)?(?![a-zäöüß])\s+(?:(?:ist|war|liegt|steht|seit|heute|schon|wieder|deutlich|sehr|viel|zu|knapp|unter|am|auf|der|dem|beim|laut|peilstab|display|anzeige|bei|kontrolle)[,;]?\s+){0,4}(?:niedrig|zu\s+(?:niedrig|gering|wenig)|gering|unter\s+(?:min(?:imum)?|der\s+min|dem\s+min)|am\s+min(?:imum)?|auf\s+min(?:imum)?|sinkt|f(?:ä|ae)llt|nachgef(?:ü|ue)llt|nachf(?:ü|ue)llen|nachgekippt|aufgef(?:ü|ue)llt|muss\s+nachgef(?:ü|ue)llt|fehlt)(?![a-zäöüß])(?!\s+(?:\S+\s+)?(?:beim\s+(?:service|(?:ö|oe)lwechsel)|in\s+ordnung|ok(?![a-zäöüß])))|(?<![a-zäöüß-])(?:zu\s+)?wenig\s+(?:motor)?(?:ö|oe)l(?![a-zäöüß])|(?<![a-zäöüß-])(?:motor)?(?:ö|oe)lverbrauch\s+(?:ist\s+)?(?:\S+\s+)?(?:hoch|zu\s+hoch|sehr\s+hoch|stark|gestiegen)(?![a-zäöüß])|(?<![a-zäöüß-])(?:braucht|verbraucht|frisst|verbrennt)\s+(?:\S+\s+){0,2}?(?:motor)?(?:ö|oe)l(?![a-zäöüß])|(?<![a-z])(?:engine\s+)?oil\s+level\s+(?:is\s+|was\s+)?(?:\S+\s+)?(?:low|too\s+low|below\s+(?:the\s+)?min(?:imum)?|at\s+(?:the\s+)?min(?:imum)?|dropping)(?![a-z])|(?<![a-z])low\s+(?:engine\s+)?oil(?:\s+level)?(?![a-z])(?!\s+pressure)|(?<![a-z])(?:topped\s+up|top\s+up|added|refilled)\s+(?:the\s+)?(?:engine\s+)?oil(?![a-z])|(?<![a-z])(?:using|burning|consuming|uses|burns)\s+(?:a\s+lot\s+of\s+|too\s+much\s+|lots\s+of\s+)?(?:engine\s+)?oil(?![a-z])|(?<![а-яіїєґё])рів(?:ень|ня)\s+(?:моторн\S*\s+)?олив\S*\s+(?:\S+\s+){0,2}?(?:низьк|нижче|менше|на\s+мінімум|падає)|(?<![а-яіїєґё])уров(?:ень|ня)\s+(?:моторн\S*\s+)?масл\S*\s+(?:\S+\s+){0,2}?(?:низк|ниже|меньше|на\s+минимум|падает)|(?<![а-яіїєґё])мало\s+(?:моторн\S*\s+)?(?:олив|масл)\S*|(?<![а-яіїєґё])(?:долив\S*|долил\S*)\s+(?:\S+\s+)?(?:олив|масл)\S*|(?<![а-яіїєґё])(?:жере|жрет|їсть|ест)\s+(?:олив|масл)\S*|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?:низьк\S*|низк\S*)\s+рів(?:ень|ня)\s+(?:моторн\S*\s+)?масла|(?<![а-яіїєґё])низк\S*\s+уров\S*\s+(?:моторн\S*\s+)?масла|(?<![а-яіїєґё])(?:рівень|уровень)\s+(?:моторн\S*\s+)?масла\s+(?:\S+\s+)?(?:низьк\S*|низк\S*|мало)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))`, 'i', 1);
// Backlog 707 (Blickwinkel „Feststellbremse hält nicht – Lkw rollt weg“): Feststell-/Hand-/Parkbremse hält nicht, greift nicht, lässt sich nicht
// einlegen; Lkw/Auflieger weggerollt, rollt trotz Feststellbremse; EN/UK/RU → eigene Schritte (sichern mit Unterlegkeilen, nie vor/hinter ein rollendes
// Fahrzeug, Leitung anrufen, nicht weiterfahren; Verletzte → Notruf, Schaden → Unfall-Schritte). Die Fundstelle wird vor der Bremsen-Prüfung
// entfernt (noParkbrake), weil deren Schritt „Feststellbremse einlegen“ hier nicht hilft. „Feststellbremse löst nicht“, „Handbremse defekt“,
// „Lkw rollt am Berg zurück“, „Palette rollt weg“ lösen nichts aus
const PARKBRAKE_HINT = lbRx(String.raw`(?<![a-zäöüß-])(?:(?:auflieger|anh(?:ä|ae|a)nger|trailer)-?)?(?:feststell|hand|park|halte|federspeicher|auflieger|anh(?:ä|ae|a)nger)[\s-]?bremse(?:n)?(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:h(?:ä|ae|a)lt\S*\s+(?:\S+\s+){0,3}?nicht(?![a-zäöüß])(?!\s+(?:mehr\s+)?(?:auf|fest))|h(?:ä|ae|a)lt\S*\s+(?:\S+\s+){0,2}?nicht\s+mehr(?![a-zäöüß])(?!\s+(?:auf|fest))|greift\s+(?:\S+\s+)?nicht|zieht\s+(?:\S+\s+)?nicht(?:\s+an)?(?![a-zäöüß])|l(?:ä|ae|a)(?:ss|ß)t\s+sich\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:einlegen|anziehen|ziehen|aktivieren|bet(?:ä|ae)tigen))|(?<![a-zäöüß-])(?:lkw|fahrzeug|auflieger|anh(?:ä|ae|a)nger|zugmaschine|sattelzug|sattelauflieger|wagen|auto|truck|er)\s+(?:\S+\s+){0,4}?(?:(?:rollt|rollte|rollen|rollten|ist|sind|war|waren)\s+(?:\S+\s+){0,3}?(?:weg|los|davon)(?![a-zäöüß])|weggerollt|losgerollt|davongerollt|ins\s+rollen\s+gekommen)|(?<![a-zäöüß-])(?:rollt|rollte|rollen|rollten|weggerollt|losgerollt)\s+(?:\S+\s+){0,3}?trotz\s+(?:\S+\s+)?(?:feststell|hand|park)[\s-]?bremse|(?<![a-z])(?:parking|park|hand|spring|trailer)[\s-]?brakes?\s+(?:\S+\s+){0,3}?(?:(?:won|doesn|does\s+not|did\s+not|didn|isn|is\s+not|not|no\s+longer|wont|doesnt|isnt)['’]?t?\s+(?:\S+\s+)?hold(?:ing)?|not\s+holding|fails?\s+to\s+hold|won['’]?t\s+(?:engage|apply))|(?<![a-z])(?:truck|lorry|vehicle|trailer|rig|tractor|it)\s+(?:\S+\s+){0,3}?(?:rolled|rolls|rolling|started\s+rolling|started\s+to\s+roll)\s+(?:\S+\s+){0,2}?away|(?:стоянков|ручн)\S*\s+(?:гальм|тормоз)\S*\s+(?:\S+\s+){0,2}?не\s+(?:трима|держ)|ручник\S*\s+(?:\S+\s+){0,2}?не\s+(?:трима|держ)|(?<![а-яіїєґ])(?:авто|машин|вантажівк|фур|причіп|причеп|напівпричіп|полуприцеп|тягач|грузовик)\S*\s+(?:\S+\s+){0,3}?(?:відкоти|откати|покоти|покати|скоти)\S*`, 'i');
// Backlog 729 (Blickwinkel „Gaspedal klemmt/hängt, Fußmatte unter dem Pedal, Lkw beschleunigt von selbst“): Gas-/Fahrpedal bzw. Pedal klemmt,
// hängt, kommt nicht zurück, lose, abgebrochen, reagiert nicht; „Gas hängt“; Fußmatte unter/hinter einem Pedal bzw. klemmt/rutscht;
// „beschleunigt von selbst“, „geht nicht vom Gas“, Drehzahl bleibt hoch; EN/UK/RU → eigene Schritte. Brems-/Kupplungspedal haben eigene Schritte;
// „repariert“, „Fußmatte fehlt“, „Gas geben“, „beschleunigt schlecht“, „Drehzahlmesser“ nicht.
const PEDAL_HINT = lbRx(String.raw`(?<![a-zäöüß-])(?:gas|fahr)pedal(?:s|e)?(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|befestigt|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*))\s+(?:\S+\s+){0,3}?(?:klemmt|hakt|h(?:ä|ae|a)ngt|bleibt\s+(?:\S+\s+)?(?:h(?:ä|ae|a)ngen|unten|stecken)|kommt\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:zur(?:ü|ue)ck|hoch|raus)|geht\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:zur(?:ü|ue)ck|hoch)|federt\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?zur(?:ü|ue)ck|locker|lose|wackelt|abgebrochen|gebrochen|kaputt|defekt|reagiert\s+(?:\S+\s+)?nicht|ohne\s+funktion|funktioniert\s+(?:\S+\s+)?nicht|ohne\s+wirkung|spinnt|schwerg(?:ä|ae|a)ngig|geht\s+schwer)(?![a-zäöüß])|(?<![a-zäöüß-])pedal(?:e)?(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|befestigt|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*))\s+(?:\S+\s+){0,2}?(?:klemmt|hakt|h(?:ä|ae|a)ngt|bleibt\s+(?:\S+\s+)?(?:h(?:ä|ae|a)ngen|stecken)|kommt\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?zur(?:ü|ue)ck|locker|lose|wackelt|abgebrochen)(?![a-zäöüß])|(?<![a-zäöüß-])gas(?![a-zäöüß])\s+(?:h(?:ä|ae|a)ngt|klemmt|bleibt\s+(?:\S+\s+)?(?:h(?:ä|ae|a)ngen|stehen))(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|befestigt|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*))|(?<![a-zäöüß-])(?:fu(?:ß|ss)matte|gummimatte|matte)(?:n)?(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|befestigt|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*))\s+(?:\S+\s+){0,4}?(?:unter|hinter|an|am|vor|(?:ü|ue)ber)\s+(?:\S+\s+)?(?:gas|brems|kupplungs|fahr)?pedal\S*|(?<![a-zäöüß-])(?:fu(?:ß|ss)matte|gummimatte)(?:n)?(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|befestigt|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*))\s+(?:\S+\s+){0,3}?(?:klemmt|blockiert|verrutscht|rutscht)(?![a-zäöüß])|(?<![a-zäöüß-])(?:beschleunigt|gibt\s+gas)\s+(?:\S+\s+)?(?:von\s+selbst|von\s+allein\S*|allein\S*|selbstst(?:ä|ae|a)ndig|ungewollt|ohne\s+(?:mein\s+)?zutun)(?![a-zäöüß])|(?<![a-zäöüß-])(?:geht|ging|kommt|kam)\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?vom\s+gas(?![a-zäöüß])|(?<![a-zäöüß-])drehzahl\s+(?:\S+\s+){0,2}?(?:bleibt\s+(?:\S+\s+)?(?:hoch|oben)|geht\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:runter|herunter|zur(?:ü|ue)ck)|f(?:ä|ae|a)llt\s+(?:\S+\s+)?nicht)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|befestigt|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*))|(?<![a-z-])(?:accelerator|gas|throttle)(?:\s+pedal)?(?![a-z])(?![^.;!?]*(?:fixed|repaired|replaced))\s+(?:\S+\s+){0,2}?(?:stuck|sticking|sticks|jammed|loose|broken|not\s+returning|doesn['’]?t\s+(?:come\s+back|return)|won['’]?t\s+(?:come\s+back|return)|unresponsive|not\s+responding)(?![a-z])|(?<![a-z-])(?:floor\s+)?mats?\s+(?:\S+\s+){0,3}?(?:under|behind|jammed\s+(?:under|behind)|stuck\s+(?:under|behind))\s+(?:the\s+)?(?:accelerator|gas|brake|clutch)?\s*pedals?(?![a-z])|(?<![a-z-])(?:accelerat\S*|speed(?:s|ing)?\s+up)\s+(?:\S+\s+)?(?:by\s+itself|on\s+its\s+own)(?![a-z])|(?<![a-z-])revs?\s+(?:\S+\s+){0,2}?(?:stay\S*\s+high|won['’]?t\s+(?:drop|come\s+down)|not\s+dropping)(?![a-z])|(?<![а-яіїєґё])педал\S*\s+(?:газу|газа|акселератор\S*)\s+(?:\S+\s+){0,2}?(?:заїда\S*|заеда\S*|залипа\S*|застря\S*|не\s+поверта\S*|не\s+возвраща\S*|злама[вл]\S*|сломал\S*|бовта\S*|болта\S*|не\s+працю\S*|не\s+работа\S*)(?![^.;!?]*(?:відремонт\S*|отремонт\S*|замінил\S*|замінил\S*|замінен\S*|заменил\S*|заменил\S*|заменен\S*|усунул\S*|устранил\S*|полагодил\S*|починил\S*|закріпил\S*|закрепил\S*|відрегулю\S*|отрегулир\S*|прибрал\S*|убрал\S*))|(?<![а-яіїєґё])(?:килимок|килимк\S*|коврик\S*)\s+(?:\S+\s+){0,3}?(?:під|за|под)\s+(?:\S+\s+)?педал\S*(?![^.;!?]*(?:відремонт\S*|отремонт\S*|замінил\S*|замінил\S*|замінен\S*|заменил\S*|заменил\S*|заменен\S*|усунул\S*|устранил\S*|полагодил\S*|починил\S*|закріпил\S*|закрепил\S*|відрегулю\S*|отрегулир\S*|прибрал\S*|убрал\S*))|(?<![а-яіїєґё])(?:розганя\S*|разгоня\S*)\s+(?:\S+\s+)?(?:сам\S*)`, 'i', 1);
const PARKBRAKE_SPANS = new RegExp(PARKBRAKE_HINT.source, 'gi');
const noParkbrake = (s) => String(s || '').replace(PARKBRAKE_SPANS, ' ');
// Backlog 711 (Blickwinkel „Mäuse, Bettwanzen oder Ungeziefer im Fahrerhaus“): Tiere/Kot/Befall mit Ort im Fahrerhaus (Kabine, Koje, Liege,
// Matratze, Staufach, Kühlschrank) bzw. Bettwanzen allein; EN/UK/RU → eigene Schritte (nichts selbst bekämpfen, Leitung organisiert Reinigung,
// Kot nicht trocken auffegen/aussaugen, lüften; Bettzeug nicht mitnehmen; angefressene Kabel → Marder-Schritte). „keine Mäuse“, „Ungeziefer
// in der Ladung“, „Ameisen auf dem Parkplatz“, „Fliegengitter kaputt“, „insects on the windscreen“ lösen nichts aus
const PEST_HINT = lbRx(String.raw`(?<![a-zäöüß-])(?<!(?:keine|kein|keinerlei|ohne)\s+)(?:m(?:ä|ae)use|ratten|ratte|ungeziefer|kakerlaken|wanzen)\s+(?:\S+\s+)?im\s+(?:lkw|fahrzeug|auflieger|anh(?:ä|ae)nger)(?![a-zäöüß])|(?<![a-zäöüß-])(?:bettwanze(?:n)?|bettwanzenbefall|bettwanzenbisse)(?![a-zäöüß])|(?<![a-zäöüß-])(?<!(?:keine|kein|keinerlei|ohne|no)\s+)(?:m(?:ä|ae)use(?:kot|dreck|köttel|koettel)?|maus(?:kot|dreck)|mausk(?:ö|oe)ttel|ratten(?:kot)?|ratte|ungeziefer|ungezieferbefall|wanzen|kakerlake(?:n)?|schaben|ameisen|fl(?:ö|oe)he|milben|maden|insekten|fliegen|wespen|wespennest)(?![a-zäöüß])\s+(?:\S+\s+){0,4}?(?:im|in\s+(?:der|dem|die|den|meiner|meinem)|unter\s+(?:der|dem)|hinter\s+(?:der|dem)|auf\s+(?:der|dem))\s+(?:\S+\s+)?(?:fahrerhaus\S*|f(?:ü|ue)hrerhaus\S*|kabine|fahrerkabine|schlafkabine|koje|liege|bett|matratze|bettzeug|schlafsack|staufach|staufächern|staufaechern|k(?:ü|ue)hlbox|k(?:ü|ue)hlschrank)(?![a-zäöüß])|(?<![a-zäöüß-])(?:fahrerhaus|f(?:ü|ue)hrerhaus|kabine|fahrerkabine|schlafkabine|koje|liege|matratze|bettzeug)(?![a-zäöüß])\s+(?:\S+\s+){0,4}?(?<!(?:keine|kein|keinerlei|ohne|no)\s+)(?:m(?:ä|ae)use(?:kot)?|mausk(?:ö|oe)ttel|ratten|ungeziefer|wanzen|kakerlaken|schaben|ameisen|fl(?:ö|oe)he|milben|maden)(?![a-zäöüß])|(?<![a-z-])(?:bed\s?bugs?|mouse\s+droppings|rat\s+droppings)(?![a-z])|(?<![a-z-])(?<!(?:keine|kein|keinerlei|ohne|no)\s+)(?:mice|mouse|rats?|cockroach(?:es)?|roaches|vermin|pests|ants|fleas|mites|maggots|insects|wasps?)\s+(?:\S+\s+){0,3}?in\s+(?:the\s+|my\s+)?(?:cab|cabin|bunk|sleeper(?:\s+cab)?|bed|mattress|bedding|storage\s+box(?:es)?|fridge)(?![a-z])|(?<![а-яіїєґ])(?:клоп\S*|блох\S*)|(?<![а-яіїєґ])(?:миш\S*|мыш\S*|щур\S*|пацюк\S*|крыс\S*|тарган\S*|таракан\S*|мурах\S*|муравь\S*|кліщ\S*|комах\S*|насеком\S*|паразит\S*)\s+(?:\S+\s+){0,3}?(?:в|у|на|під|под)\s+(?:\S+\s+)?(?:кабін\S*|кабин\S*|ліжк\S*|койк\S*|спальн\S*|матрац\S*|матрас\S*)`, 'i', 1);
// Backlog 727 (Blickwinkel „Wespen-, Hornissen- oder Bienennest am Fahrzeug, Stich“): Nest/Schwarm allein bzw. Tiere mit Ort am/im Fahrzeug
// (Spiegel, Plane, Aufbau, Staukasten, Tankdeckel, Fahrerhaus …) oder Stich; EN/UK/RU → eigene Schritte (Abstand, nicht selbst entfernen,
// Leitung entscheidet, Stich mit Atemnot/Schwellung → Notruf). „entfernt“, „ist weg“, „keine Wespen“, Insekten auf der Scheibe, „оси“ (Achsen) nicht.
const NEST_HINT = lbRx(String.raw`(?<![a-zäöüß-])(?<!(?:kein|keine|keinerlei|ohne)\s+)(?:wespen|hornissen|bienen)[-]?(?:nest|nester|schwarm|volk)(?![a-zäöüß])(?![^.;!?]*(?:entfernt|beseitigt|weggemacht|umgesiedelt|(?:ist|sind|war|waren)\s+weg(?![a-zäöüß])|removed|gone|видал\S*|прибра\S*|удал\S*|убра\S*))|(?<![a-zäöüß-])(?<!(?:kein|keine|keinerlei|ohne)\s+)nest\s+(?:von\s+|mit\s+)?(?:wespen|hornissen|bienen)(?![a-zäöüß])(?![^.;!?]*(?:entfernt|beseitigt|weggemacht|umgesiedelt|(?:ist|sind|war|waren)\s+weg(?![a-zäöüß])|removed|gone|видал\S*|прибра\S*|удал\S*|убра\S*))|(?<![a-zäöüß-])(?<!(?:kein|keine|keinerlei|ohne)\s+)(?:wespe|wespen|hornisse|hornissen|biene|bienen)(?![a-zäöüß])(?![^.;!?]*(?:entfernt|beseitigt|weggemacht|umgesiedelt|(?:ist|sind|war|waren)\s+weg(?![a-zäöüß])|removed|gone|видал\S*|прибра\S*|удал\S*|убра\S*))\s+(?:\S+\s+){0,4}?(?:am|im|an\s+(?:der|dem|den)|in\s+(?:der|dem|den)|unter\s+(?:der|dem|den)|hinter\s+(?:der|dem|den)|auf\s+(?:der|dem)|aus\s+(?:der|dem|den))\s+(?:\S+\s+)?(?:(?:au(?:ß|ss)en|seiten|rampen|weitwinkel|front)?spiegel|spiegelgeh(?:ä|ae|a)use|aufbau|kofferaufbau|koffer|plane|stoßstange|sto(?:ß|ss)f(?:ä|ae|a)nger|k(?:ü|ue)hlergrill|grill|radkasten|kotfl(?:ü|ue)gel|staukasten|staufach|werkzeugkasten|batteriekasten|tankdeckel|tank|t(?:ü|ue)r|t(?:ü|ue)rrahmen|anh(?:ä|ae|a)nger|auflieger|dach|spoiler|windabweiser|rahmen|fahrerhaus|f(?:ü|ue)hrerhaus|kabine|fahrerkabine|lkw|fahrzeug|zugmaschine|trittstufe|einstieg|l(?:ü|ue)ftung|l(?:ü|ue)ftungsgitter|kabinendach)(?:s|es|n|en)?(?![a-zäöüß])|(?<![a-zäöüß-])(?:wespe|wespen|hornisse|hornissen|biene|bienen)(?![a-zäöüß])\s+(?:\S+\s+){0,3}?gestochen(?![a-zäöüß])|(?<![a-zäöüß-])gestochen\s+(?:\S+\s+){0,3}?(?:wespe|wespen|hornisse|hornissen|biene|bienen)(?:n)?(?![a-zäöüß])|(?<![a-z-])(?<!no\s+)(?:wasp|wasps|hornet|hornets|bee|bees)(?:['’]s?)?\s+(?:nest|nests|swarm|hive)(?![a-z])(?![^.;!?]*(?:entfernt|beseitigt|weggemacht|umgesiedelt|(?:ist|sind|war|waren)\s+weg(?![a-zäöüß])|removed|gone|видал\S*|прибра\S*|удал\S*|убра\S*))|(?<![a-z-])(?:nest|swarm)\s+of\s+(?:wasps|hornets|bees)(?![a-z])(?![^.;!?]*(?:entfernt|beseitigt|weggemacht|umgesiedelt|(?:ist|sind|war|waren)\s+weg(?![a-zäöüß])|removed|gone|видал\S*|прибра\S*|удал\S*|убра\S*))|(?<![a-z-])(?<!no\s+)(?:wasps?|hornets?|bees)(?![a-z])(?![^.;!?]*(?:entfernt|beseitigt|weggemacht|umgesiedelt|(?:ist|sind|war|waren)\s+weg(?![a-zäöüß])|removed|gone|видал\S*|прибра\S*|удал\S*|убра\S*))\s+(?:\S+\s+){0,3}?(?:in|on|under|behind|inside|around|from)\s+(?:the\s+|my\s+)?(?:(?:side|wing|door)\s+)?(?:mirrors?|cab|cabin|trailer|body|tarp|bumper|grille|toolbox|tool\s+box|fuel\s+cap|tank|door|roof|vent|truck|vehicle)(?![a-z])|(?<![a-z-])stung\s+(?:\S+\s+){0,2}?by\s+(?:a\s+)?(?:wasps?|hornets?|bees?)(?![a-z])|(?<![а-яіїєґё])(?:гнізд|гнезд)\S*\s+(?:\S+\s+)?(?:ос|шершн\S*|бджіл|бджол\S*|пчел\S*)(?![а-яіїєґё])(?![^.;!?]*(?:entfernt|beseitigt|weggemacht|umgesiedelt|(?:ist|sind|war|waren)\s+weg(?![a-zäöüß])|removed|gone|видал\S*|прибра\S*|удал\S*|убра\S*))|(?<![а-яіїєґё])(?:осин|шершнев|бджолин|пчелин)\S*\s+(?:гнізд|гнезд|рі|ро)\S*|(?<![а-яіїєґё])(?:рій|рой)\s+(?:бджіл|бджол\S*|пчел\S*|ос|шершн\S*)(?![а-яіїєґё])|(?<![а-яіїєґё])(?:оса|оси(?=\s+(?:в|у)\s)|шершн\S*|бджол\S*|бджіл|пчел\S*)\s+(?:\S+\s+){0,3}?(?:в|у|на|під|под|за|із|з|из)\s+(?:\S+\s+)?(?:дзеркал\S*|зеркал\S*|кабін\S*|кабин\S*|причеп\S*|прицеп\S*|кузов\S*|бампер\S*|ящик\S*|тент\S*|двер\S*)|(?<![а-яіїєґё])(?:вжалил\S*|ужалил\S*|вкусил\S*|покусал\S*)\s+(?:\S+\s+){0,2}?(?:оса|оси|шершн\S*|бджол\S*|пчел\S*)`, 'i', 1);
// Wespen-/Hornissenwörter, damit „Wespen im Fahrerhaus“ nicht zusätzlich die Ungeziefer-Schritte zeigt (Mäuse daneben bleiben erkannt)
const NEST_WORDS = lbRx(String.raw`(?<![a-zäöüß-])(?:wespe|wespen|wespennest|hornisse|hornissen|hornissennest)(?![a-zäöüß])|(?<![a-z-])(?:wasps?)(?![a-z])`, 'gi');
const CONTOUR_HINT = lbRx(String.raw`(?<![a-zäöüß-])(?:kontur(?:markierung|markierungsstreifen|streifen|folie)(?:en)?|warnmarkierung(?:en)?|reflex(?:streifen|folie|folien)|reflektor(?:streifen|folie|folien|en)?|r(?:ü|ue|u)ckstrahler(?:n|s)?|seitenr(?:ü|ue|u)ckstrahler(?:n|s)?|katzenaugen?|(?:park-?)?warntafel(?:n)?|heckmarkierung(?:en|stafel|stafeln)?|markierungstafel(?:n)?)(?![a-zäöüß])\s+(?:(?:sind|ist|wurde|wurden|am|an|auf|der|die|das|dem|den|hinten|seitlich|links|rechts|heck|seite|lkw|auflieger|anh(?:ä|ae)nger|zugmaschine|komplett|teilweise|stark|total|ganz|schon|seit|heute|gestern|halb|mehrere|einige|alle|zwei|beide|wieder|fast|sehr)[,;]?\s+){0,3}(?:fehl(?:t|en)|weg(?![a-zäöüß])|abgerissen|abgefallen|abgel(?:ö|oe)st|l(?:ö|oe)s(?:t|en)\s+sich|lose(?![a-zäöüß])|locker(?![a-zäöüß])|h(?:ä|ae)ng(?:t|en)\s+(?:herunter|runter|lose|ab|schief)|besch(?:ä|ae|a)digt|kaputt|defekt|zerbrochen|gebrochen|verbogen|eingerissen|zerkratzt|verschmutzt|verdreckt|dreckig|verblasst|abgeschabt|abgefahren|flatter(?:t|n)|nicht\s+(?:mehr\s+)?(?:zu\s+sehen|erkennbar|sichtbar|vorhanden|da(?![a-zäöüß])))(?![a-zäöüß])(?![,;.]?\s+(?:\S+\s+)?(?:wieder\s+(?:da|dran|fest|angebracht)|ersetzt|erneuert|repariert|geklebt|angebracht|gereinigt|sauber|befestigt|getauscht|erledigt|ok(?![a-zäöüß])|in\s+ordnung|nachbestellt|bestellt))|(?<![a-zäöüß-])(?:fehlende[nmrs]?|abgerissene[nmrs]?|abgefallene[nmrs]?|besch(?:ä|ae|a)digte[nmrs]?|kaputte[nmrs]?|lose[nmrs]?|verschmutzte[nmrs]?|verdreckte[nmrs]?|keine|kein)\s+(?:\S+\s+)?(?:kontur(?:markierung|markierungsstreifen|streifen|folie)(?:en)?|warnmarkierung(?:en)?|reflex(?:streifen|folie|folien)|reflektor(?:streifen|folie|folien|en)?|r(?:ü|ue|u)ckstrahler(?:n|s)?|seitenr(?:ü|ue|u)ckstrahler(?:n|s)?|katzenaugen?|(?:park-?)?warntafel(?:n)?|heckmarkierung(?:en|stafel|stafeln)?|markierungstafel(?:n)?)(?![a-zäöüß])(?!\s+(?:\S+\s+)?(?:n(?:ö|oe)tig|erforderlich|vorgeschrieben|angebracht|bestellt|ersetzt|erneuert))|(?<![a-z])(?<!(?:headlight|headlamp|lamp|light)\s)(?:conspicuity\s+(?:tape|markings?|strips?)|reflective\s+(?:tape|strips?|markings?)|reflector\s+(?:tape|strips?)|reflectors?|rear\s+marker\s+(?:boards?|plates?)|marker\s+boards?|warning\s+(?:boards?|plates?))\s+(?:(?:is|are|on|the|rear|side|left|right|trailer|truck|partly|completely|badly|half|all|some|now)\s+){0,3}(?:missing|gone|torn\s+off|ripped\s+off|came\s+off|fell\s+off|peeling|coming\s+off|loose|hanging\s+(?:off|down)|damaged|broken|cracked|dirty|faded|not\s+visible)(?![a-z])(?!\s+(?:\S+\s+)?(?:replaced|fixed|repaired|cleaned|ok(?![a-z])))|(?<![a-z])(?:missing|damaged|broken|torn|dirty|faded|no)\s+(?:(?!headlight|headlamp|lamp|light)[a-z]+\s+)?(?:conspicuity\s+(?:tape|markings?|strips?)|reflective\s+(?:tape|strips?|markings?)|reflector\s+(?:tape|strips?)|reflectors?|rear\s+marker\s+(?:boards?|plates?)|marker\s+boards?|warning\s+(?:boards?|plates?))(?![a-z])|(?<![а-яіїєґё])(?:світловідбивн|светоотражающ|световозвращающ|катафот|світлоповертач|контурн\S*\s+(?:маркуван|маркировк))(?!\S*\s+(?:жилет|желет))\S*\s+(?:\S+\s+){0,3}?(?:немає|нема(?![а-яіїєґё])|нет(?![а-яіїєґё])|відсутн|отсутств|відірван|відірвал|оторван|оторвал|відклеї|відклеє|отклеи|отклее|відпа|отпа|пошкоджен|поврежден|злама[внл]|сломан|брудн|грязн|не\s+видно|звиса|теліпа)(?![^.;!?]*(?:відремонт\S*|отремонт\S*|замінил\S*|замінен\S*|заменил\S*|заменен\S*|усунул\S*|устранил\S*|полагодил\S*|починил\S*|приклеї\S*|приклеи\S*|наклеї\S*|наклеи\S*|почистил\S*|очистил\S*|помил\S*|помыл\S*|закріпил\S*|закрепил\S*|замовил\S*|заказал\S*))|(?<![а-яіїєґё])(?:немає|нема|нет|бракує|відсутн\S*|відірван\S*|оторван\S*|пошкоджен\S*|поврежден\S*|брудн\S*|грязн\S*)\s+(?:\S+\s+)?(?:світловідбивн|светоотражающ|световозвращающ|катафот|світлоповертач|контурн\S*\s+(?:маркуван|маркировк))(?!\S*\s+(?:жилет|желет))\S*(?![^.;!?]*(?:відремонт\S*|отремонт\S*|замінил\S*|замінен\S*|заменил\S*|заменен\S*|усунул\S*|устранил\S*|полагодил\S*|починил\S*|приклеї\S*|приклеи\S*|наклеї\S*|наклеи\S*|почистил\S*|очистил\S*|помил\S*|помыл\S*|закріпил\S*|закрепил\S*|замовил\S*|заказал\S*))`, 'i', 1);
// Backlog 308 (Blickwinkel „Spiegel abgefahren“): Haupt-/Weitwinkel-/Rampen-/Frontspiegel abgefahren, gebrochen, fehlt, hängt – ohne Spiegel nicht
// weiterfahren, Fremdschaden wie Unfall, Leitung, Fotos, Fahrbereitschaft; „Ölspiegel“, „Spiegelei“, „Spiegel in Ordnung“ lösen nichts aus
const MIRROR_HINT = lbRx(String.raw`(?<![a-z-])(?:wing\s+|side\s+)?mirrors?\s+(?:won['’]?t|doesn['’]?t|does\s+not|will\s+not)\s+fold\s+(?:out|in|back)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))|(?<![а-яіїєґё])(?:дзеркал\S*|зеркал\S*)\s+(?:\S+\s+)?не\s+(?:складається|розкладається|складывается|раскладывается)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))|(?<![a-zäöüß-])(?:au(?:ß|ss)en|haupt|weitwinkel|rampen|fahrer|beifahrer|r(?:ü|ue)ck)?spiegel(?:s)?(?![a-zäöüß])\s+(?:\S+\s+){0,2}?(?:klappt|klappen|f(?:ä|ae)hrt|fahren)\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:richtig\s+)?(?:aus|ein|an|zur(?:ü|ue)ck)(?:klappen|fahren)?(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced))|(?<![a-zäöüß-])spiegelgl(?:a|ä)s(?:er)?\s+(?:(?:ist|sind|einfach|komplett|links|rechts)\s+){0,2}(?:raus(?:gefallen|gesprungen|geflogen)?|herausgefallen|lose|locker|weg|abgefallen)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced))|(?<![а-яіїєґё])(?:дзеркал\S*|зеркал\S*)\s+(?:\S+\s+)?(?:збили|збив|збила|сбили|сбил|відбили|отбили|зламали|сломали)(?![а-яіїєґё])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![a-zäöüß])(?:außen|aussen|haupt|weitwinkel|rampen|front|seiten|bordstein|anfahr|r(?:ü|ue|u)ck)?spiegel(?:glas|halter|arm|kopf|gehäuse)?\s+(?:\S+\s+){0,3}?(?:abgefahren|abgerissen|abgebrochen|abgeknickt|ab(?![a-zäöüß])|kaputt|defekt|gebrochen|zerbrochen|gesprungen|gerissen|besch(?:ä|ae|a)digt|fehlt|weg(?![a-zäöüß])|lose|locker|h(?:ä|ae|a)ngt|wackelt|verstellt\S*|l(?:ä|ae|a)(?:ss|ß)t\s+sich\s+nicht)|(?:abgefahren|abgerissen|abgebrochen|kaputt|zerbrochen|gesprungen|besch(?:ä|ae|a)digt)e[nmrs]?\s+(?:\S+\s+)?(?:außen|aussen|haupt|weitwinkel|rampen|front|seiten)?spiegel|spiegel\s+(?:\S+\s+){0,3}?(?:touchiert|gestreift|angefahren|mitgenommen)|(?<![a-z])(?:(?:wing|side|door|wide[- ]angle|kerb|curb|front|main|class\s+(?:ii|iv|v|vi))\s+)?mirrors?\s+(?:\S+\s+){0,3}?(?:broken|broke|smashed|cracked|knocked\s+off|ripped\s+off|torn\s+off|snapped|missing|hanging|loose|damaged|gone|bent|won['’]?t\s+adjust)|(?:broken|smashed|cracked|damaged|missing|bent)\s+(?:\S+\s+)?mirrors?|(?:hit|clipped|knocked|caught)\s+(?:\S+\s+){0,2}?mirrors?|(?<![а-яіїєґ])дзеркал\S*\s+(?:\S+\s+){0,3}?(?:збит|злама[внл]|злама[вл]|розбит|відірв|тріснул|тріснуло|пошкод|нема|відпал|бовта|теліпа|не\s+регулю)|(?<![а-яіїєґ])зеркал\S*\s+(?:\S+\s+){0,3}?(?:сбит|сломан|сломал|разбит|оторв|треснул|поврежд|нет(?![а-яіїєґ])|отвал|болта|не\s+регулир)|(?:збив|збили|зламав|розбив|відірвав|зачепив|сбил|сломал|разбил|оторвал|зацепил)\S*\s+(?:\S+\s+)?(?:дзеркал|зеркал)|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-zäöüß-])spiegelverstellung\s+(?:\S+\s+){0,2}?(?:geht\s+nicht|funktioniert\s+nicht|defekt|kaputt|ausgefallen)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-z-])mirror\s+adjust(?:ment|er)?\s+(?:\S+\s+){0,2}?(?:not\s+working|doesn['’]?t\s+work|broken|faulty)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|found|gefunden|знайшли|нашли|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?:дзеркал\S*|зеркал\S*)\s+(?:\S+\s+)?(?:хитає\S*|хитаєт\S*|теліпа\S*|болта\S*|шата\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|found|gefunden|знайшли|нашли|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))`, 'i', 1);
// Backlog 309 (Blickwinkel „Auflieger lässt sich nicht sicher kuppeln oder hat sich gelöst“): Sattelkupplung/Königszapfen/Anhängerkupplung rastet nicht
// ein, Auflieger lässt sich nicht (an)kuppeln, hat sich unterwegs gelöst – nicht losfahren, Stelle sichern, gegen Wegrollen sichern, Leitung, Fotos, Fahrbereitschaft.
// „Kupplung rutscht“ (Pkw-/Lkw-Kupplung), „Auflieger angekuppelt“, „Sattelkupplung abgeschmiert“, „сідельний тягач“ (Zugmaschine) lösen nichts aus
const COUPLING_HINT = lbRx(String.raw`(?:(?<![a-zäöüß])(?:kann|k(?:ö|oe)nnen|krieg(?:e|en)?|bekomm(?:e|en)?)\s+(?:\S+\s+){0,3}?nicht\s+(?:mehr\s+)?(?:ab|an|auf)(?:kuppeln|satteln)(?![a-zäöüß])|(?<![a-zäöüß])(?:anh(?:ä|ae|a)nger|auflieger|trailer)\s+(?:geht|ging)\s+nicht\s+(?:mehr\s+)?(?:ab|los)(?![a-zäöüß])|(?<![a-zäöüß-])k(?:ö|oe)nigszapfen\s+(?:\S+\s+){0,2}?(?:verschlissen|ausgeschlagen|besch(?:ä|ae|a)digt|verbogen|lose|locker|abgenutzt|kaputt|defekt)(?![a-zäöüß])|(?<![a-z])king\s?-?pin\s+(?:\S+\s+){0,2}?(?:worn|damaged|bent|loose|broken)|(?<![а-яіїєґё])(?:шкворн\S*|шкворень)\s+(?:\S+\s+)?(?:знош\S*|изнош\S*|пошкодж\S*|поврежд\S*|зігнут\S*|погнут\S*|розбит\S*|разбит\S*))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![а-яіїєґё])(?:опор[иаы]|опорн\S*\s+(?:стійк|стойк|ноги|ног|пристр|устройств)\S*)\s+(?:(?:напівпричепа|полуприцепа|причепа|прицепа)\s+)?(?:\S+\s+){0,2}?(?:не\s+(?:крутя|крутит|опуска|підніма|поднима|кручу)|заклин|заїда|заеда|злама[вл]|сломал|погнул)\S*(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?<![a-zäöüß])(?:sattelkupplung|königszapfen|koenigszapfen|zugmaul|zughaken|anhängerkupplung|anhaengerkupplung|kupplungsverriegelung|st(?:ü|ue|u)tzwinde|st(?:ü|ue|u)tzf(?:ü|ue|u)(?:ß|ss)e?|st(?:ü|ue|u)tzbeine|kurbelst(?:ü|ue|u)tze|st(?:ü|ue|u)tzkurbel|kurbel(?![a-zäöüß])|st(?:ü|ue|u)tzen(?![a-zäöüß]))\S*\s+(?:\S+\s+){0,3}?(?:rastet\s+nicht|nicht\s+(?:\S+\s+)?(?:eingerastet|verriegelt|geschlossen|zu(?![a-zäöüß]))|verriegelt\s+nicht|schlie(?:ß|ss)t\s+nicht|schlie(?:ß|ss)t\s+schwer|hakt|klemm(?:t|en)|defekt|kaputt|gebrochen|ausgeschlagen|lose(?![a-zäöüß])|locker|offen|l(?:ä|ae|a)(?:ss|ß)t\s+sich\s+nicht|lassen\s+sich\s+nicht|abgebrochen|verbogen|geht\s+nicht|gehen\s+nicht)|(?<![a-zäöüß])(?:auflieger|anhänger|anhaenger|trailer)\s+(?:\S+\s+){0,3}?(?:l(?:ä|ae|a)(?:ss|ß)t\s+sich\s+nicht\s+(?:\S+\s+)?(?:an|ab|auf|ein)?(?:kuppeln|satteln)|nicht\s+(?:richtig\s+|sicher\s+)?(?:angekuppelt|gekuppelt|eingerastet|verriegelt|aufgesattelt)|hat\s+sich\s+(?:\S+\s+){0,3}?(?:gel(?:ö|oe|o)st|abgekuppelt|losgerissen)|losgerissen|abgesackt)|(?<![a-zäöüß])(?:an|ab|auf)?(?:kuppeln|satteln)\s+(?:\S+\s+){0,2}?(?:geht|klappt|funktioniert)\s+nicht|(?<![a-z])(?:fifth[- ]wheel|king[- ]?pin|coupling\s+(?:jaws?|lock)|landing\s+(?:legs?|gear))\s+(?:\S+\s+){0,3}?(?:won['’]?t|will\s+not|doesn['’]?t|does\s+not|not\s+(?:locked|closed|closing|engaged)|stuck|jammed|broken|damaged|open|loose|faulty)|(?<![a-z])trailer\s+(?:\S+\s+){0,3}?(?:won['’]?t|will\s+not|doesn['’]?t|does\s+not|cannot|can['’]?t)\s+(?:\S+\s+)?(?:couple|uncouple|hook\s+up|lock)|(?<![a-z])trailer\s+(?:\S+\s+){0,2}?(?:came|come|has\s+come|became)\s+(?:loose|uncoupled|unhitched|detached|off)|(?:can['’]?t|cannot|could\s+not|couldn['’]?t)\s+(?:\S+\s+)?(?:couple|uncouple|hitch|unhitch)\s+(?:\S+\s+)?trailer|(?<![а-яіїєґ])(?:(?:сідл[оауі]|седл[оау])(?!\s+(?:водія|водителя))|сідельн\S*\s+(?:пристр|зчіп)\S*|шкворн\S*|шкворень|опорн\S*\s+(?:стійк|ног|лап)\S*|седельн\S*\s+(?:устройств|сцеп)\S*|опорн\S*\s+стойк\S*)\s+(?:\S+\s+){0,3}?(?:не\s+(?:\S+\s+)?(?:закрива|зачіпа|фіксу|защіпа|закрыва|цепля|фиксир|защелк)|злама[внл]|пошкодж|заклин|відкрит|розбовта|слома|поврежд|открыт|разболта)|(?<![а-яіїєґ])(?:напівпричіп|напівпричеп|причіп|причеп|полуприцеп|прицеп)\S*\s+(?:\S+\s+){0,3}?(?:не\s+(?:\S+\s+)?(?:зчіплю|зчеплю|чіпля|зачіпа|причепи|сцепля|цепля|прицеп)|відчепив|від'єднав|відірвав|отцепил|оторвал)|(?<![а-яіїєґ])(?:опор\S*|стійк\S*)\s+(?:напівпричеп\S*|причеп\S*|полуприцеп\S*)\s+(?:\S+\s+)?(?:не\s+опуска\S*|не\s+підніма\S*|не\s+поднима\S*|не\s+крут\S*|заклин\S*|злама\S*|слома\S*)|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-zäöüß-])(?:anh(?:ä|ae)nger|auflieger)\s+(?:hat\s+sich\s+)?(?:\S+\s+){0,2}?(?:abgekoppelt|losgerissen|gel(?:ö|oe)st|ausgeh(?:ä|ae)ngt)\s+(?:\S+\s+){0,2}?(?:beim\s+fahren|w(?:ä|ae)hrend\s+der\s+fahrt|in\s+der\s+fahrt|unterwegs|von\s+selbst|selbstst(?:ä|ae)ndig)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-zäöüß-])(?:anh(?:ä|ae)nger|auflieger)\s+hat\s+sich\s+(?:\S+\s+)?(?:abgekoppelt|losgerissen|ausgeh(?:ä|ae)ngt)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?:(?<![a-zäöüß])(?:auflieger|anh(?:ä|ae|a)nger|zapfen|k(?:ö|oe)nigszapfen)\S*\s+(?:\S+\s+)?(?:rastet|rastete|rasten)\s+(?:\S+\s+)?nicht\s+(?:richtig\s+)?ein(?![a-zäöüß])|(?<![a-zäöüß])kupplung\s+(?:vom|am|des|zum|f(?:ü|ue)r\s+den)\s+(?:auflieger|anh(?:ä|ae|a)nger|trailer)\S*\s+(?:\S+\s+){0,2}?(?:geht\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:auf|zu)|schlie(?:ß|ss)t\s+nicht|(?:ö|oe)ffnet\s+nicht|klemmt|h(?:ä|ae)ngt|kaputt|defekt|gebrochen|ausgeschlagen|lose|locker)(?![a-zäöüß]))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced))`, 'i', 1);
// Backlog 310 (Blickwinkel „Beleuchtung am Lkw/Auflieger ausgefallen“): Scheinwerfer/Rück-/Bremslicht/Blinker/Leuchte ausgefallen, defekt, flackert –
// anhalten bei Dunkelheit, Stecker/Kabel nur gefahrlos, Leitung, Fotos, Fahrbereitschaft. Warn-/Kontrollleuchten („Warnleuchte leuchtet“, „warning light
// not working“), „Licht im Kühlraum“-Fragen ohne Defektwort, „Licht an“, „Lichtmaschine“ lösen nichts aus
// Backlog 343 (Fehlersuche): auch Stoppleuchte/Stopplicht, Warnblinker/Warnblinkanlage (auch „аварійка/аварийка не працює“), Umriss-/Kennzeichenleuchte und
// schnell blinkender Blinker (Lampe ausgefallen); „Warnblinker an“, „аварійка увімкнена“ nicht
// Backlog 349: auch Licht, das während der Fahrt/plötzlich/immer wieder ausgeht; „Licht geht aus, wenn ich abschließe“ nicht
const LIGHTS_HINT = lbRx(String.raw`(?<![a-zäöüß-])kein(?:e|en)?\s+(?:licht|bremslicht|blinker|r(?:ü|ue)cklicht|abblendlicht|fernlicht|scheinwerfer|beleuchtung|r(?:ü|ue)ckfahrlicht)(?![a-zäöüß])(?!\s+(?:\S+\s+)?(?:n(?:ö|oe)tig|notwendig|n(?:ö|oe)tig))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung|da)|fixed|repaired|replaced))|(?<![a-z-])(?:indicator|headlight|head\s+light|tail\s*light|rear\s+light|brake\s+light|side\s+(?:marker|light)|marker\s+light|fog\s+light|reverse\s+light|reversing\s+light|number\s+plate\s+light)s?\s+(?:bulbs?\s+)?(?:(?:is|are|has|have|on\s+the\s+\S+|left|right|front|rear|nearside|offside)\s+){0,2}(?:gone|out|blown|packed\s+(?:in|up)|given\s+up)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|sorted|no\s+longer))|(?:(?<![a-zäöüß-])(?:nebelscheinwerfer|nebelleuchte|nebellicht|kennzeichenbeleuchtung|kennzeichenleuchte)(?:n)?\s+(?:\S+\s+)?(?:aus(?=\s*(?:$|[.,;!?]))|defekt|kaputt|geht\s+nicht|gehen\s+nicht|ausgefallen|funktioniert\s+nicht|brennt\s+nicht|leuchtet\s+nicht|gebrochen)|(?<![а-яіїєґё])(?:протитуманк\S*|противотуманк\S*|підсвітк\S*\s+номер\S*|подсветк\S*\s+номер\S*|(?:ліхтар\S*|фар\S*|фонар\S*|габарит\S*)\s+(?:\S+\s+)?(?:причеп\S*|прицеп\S*))\s+(?:\S+\s+)?(?:не\s+(?:працю\S*|горить|горять|світ\S*|работа\S*|горит|горят|свет\S*)|розбит\S*|разбит\S*|злама[внл]\S*|сломан\S*))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![a-zäöüß])(?:stoppleuchte|stopplicht|warnblinker|warnblinkanlage|warnblinklicht|umrissleuchte|kennzeichenleuchte|blinkleuchte|rundumkennleuchte|rundumleuchte|rundumlicht|blitzleuchte|arbeitsscheinwerfer|arbeitsleuchte|arbeitslicht|zusatzscheinwerfer|scheinwerfer|abblendlicht|fernlicht|r(?:ü|ue|u)cklicht|ruecklicht|bremslicht|blinker|rückleuchte|bremsleuchte|schlussleuchte|schlusslicht|beleuchtung|licht|lichter|leuchte|lampe|begrenzungsleuchte|positionsleuchte|seitenmarkierungsleuchte|nebelschlussleuchte|kennzeichenbeleuchtung|rückfahrscheinwerfer)(?:n|s|e)?(?!\s+(?:geht|gehen|funktioniert|funktionieren|ok|i\.?\s?o\.?|in\s+ordnung)\s*[,;])\s+(?:\S+\s+){0,6}?(?:ausgefallen|fällt\s+aus|fallen\s+aus|geht\s+nicht|gehen\s+nicht|funktioniert\s+nicht|funktionieren\s+nicht|brennt\s+nicht|brennen\s+nicht|leuchtet\s+nicht|defekt|kaputt|flackert|flackern|zerbrochen|gebrochen|durchgebrannt|blinkt\s+(?:\S+\s+){0,2}?schnell(?:er)?(?![a-zäöüß])|(?:geht|gehen|ging|gingen)\s+(?:\S+\s+){0,3}?(?:fahrt|pl(?:ö|oe|o)tzlich|immer|zwischendurch|zeitweise|manchmal)\S*\s+(?:\S+\s+)?aus(?![a-zäöüß]))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|working\s+again|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*))|(?:defekte?[nmrs]?|kaputte?[nmrs]?|ausgefallene?[nmrs]?|zerbrochene?[nmrs]?)\s+(?:\S+\s+)?(?:rundumkennleuchte|rundumleuchte|rundumlicht|blitzleuchte|arbeitsscheinwerfer|arbeitsleuchte|arbeitslicht|zusatzscheinwerfer|scheinwerfer|abblendlicht|r(?:ü|ue|u)cklicht|ruecklicht|bremslicht|blinker|rückleuchte|bremsleuchte|schlussleuchte|beleuchtung|leuchte|lampe)|(?<![a-z])(?<!(?:warning|engine|dash|dashboard|check|reefer|indicator)\s)(?:(?:rotating\s+|amber\s+|warning\s+)?beacons?|work\s*lights?|spot\s*lights?|head\s*lights?|head\s*lamps?|dipped\s+beam|tail\s*lights?|rear\s+lights?|brake\s+lights?|stop\s+lights?|indicators?|turn\s+signals?|blinkers?|side\s*lights?|marker\s+lights?|lights?|lamps?|bulbs?)\s+(?:\S+\s+){0,3}?(?:out(?![a-z])|not\s+working|no\s+longer\s+works?|stopped\s+working|doesn['’]?t\s+work|don['’]?t\s+work|isn['’]?t\s+working|aren['’]?t\s+working|failed|broken|flicker(?:s|ing)|dead|smashed|blown)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|working\s+again|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*))|(?<![а-яіїєґ])(?:аварійк\S*|аварийк\S*|маячок|маячк\S*|мигалк\S*|проблисков\S*|фар[аиуі]?|габарит\S*|стоп[- ]?сигнал\S*|поворотник\S*|ліхтар\S*|фонар\S*|світло|освітлення|свет|освещение|лампочк\S*|лампа)(?![а-яіїєґ])\s+(?:\S+\s+){0,3}?(?:не\s+(?:\S+\s+)?(?:працю|світ|горить|горит|работа|свет|блима|мига)|згорі|згоріл|перегор|розбит|разбит|злама[внл]|сломал|сломан|блима|мигает|мерехт)(?![^.;!?]*(?:відремонт\S*|замінил\S*|замінен\S*|поміня\S*|полагод\S*|отремонт\S*|заменил\S*|заменен\S*|поменя\S*|почини\S*|більше\s+не|больше\s+не))|(?<![а-яіїєґ])не\s+(?:працю|світ|горить|горит|работа|свет)\S*\s+(?:\S+\s+)?(?:аварійк\S*|аварийк\S*|маячок|маячк\S*|мигалк\S*|фар[аиуі]?|габарит\S*|стоп[- ]?сигнал\S*|поворотник\S*|ліхтар\S*|фонар\S*|світло|свет|лампочк\S*|лампа)(?![а-яіїєґ])(?![^.;!?]*(?:відремонт\S*|замінил\S*|замінен\S*|поміня\S*|полагод\S*|отремонт\S*|заменил\S*|заменен\S*|поменя\S*|почини\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-zäöüß-])(?:begrenzungsleuchte|begrenzungslicht|umrissleuchte|seitenmarkierungsleuchte|positionsleuchte)n?\s+(?:\S+\s+)?(?:fehlt|fehlen|ab|abgerissen|abgebrochen)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-z-])(?:marker|side\s+marker|clearance|position)\s+lights?\s+(?:\S+\s+)?(?:missing|broken\s+off|knocked\s+off|smashed)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?:скло|стекло)\s+(?:\S+\s+)?(?:фари|фар|ліхтаря|фонаря)\s+(?:\S+\s+)?(?:розбит\S*|разбит\S*|трісну\S*|тресну\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?<![a-zäöüß-])(?:r(?:ü|ue|u)cklicht|r(?:ü|ue|u)ckleuchte|bremslicht|bremsleuchte|stoppleuchte|stopplicht|blinker|blinkleuchte|schlussleuchte|schlusslicht|scheinwerfer|abblendlicht|fernlicht|begrenzungsleuchte|positionsleuchte|seitenmarkierungsleuchte|umrissleuchte)(?:n|s|e)?\s+(?:\S+\s+){0,4}?aus(?=\s*(?:$|[.,;!?]))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung|an)|fixed|repaired|replaced|working\s+again))|(?<![a-zäöüß-])(?:scheinwerfer|abblendlicht)\S*\s+(?:\S+\s+){0,3}?(?:(?:falsch|schief)\s+eingestellt|zu\s+(?:hoch|tief)\s+eingestellt|verstellt|blendet|blenden)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung|an)|fixed|repaired|replaced|working\s+again))|(?<![a-z])head\s*(?:lights?|lamps?)\s+(?:\S+\s+){0,3}?(?:misaligned|out\s+of\s+alignment|aimed\s+too\s+(?:high|low)|dazzl\S*|blinding)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung|an)|fixed|repaired|replaced|working\s+again))|(?<![a-zäöüß-])(?:(?:gl(?:ü|ue)h)?birne|birnchen|gl(?:ü|ue)hlampe|leuchtmittel|lampe|leuchte|blinkerbirne|r(?:ü|ue)cklicht|bremslicht)(?:n)?(?![a-zäöüß])\s+(?:(?:vorne|vorn|hinten|links|rechts|oben|unten|am|an|der|dem|vom|auflieger|anh(?:ä|ae)nger|ist|sind|schon|wieder|mal)\s+){0,4}(?:durch|durchgebrannt)(?=\s*(?:$|[.,;!?\n]))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced))|(?<![a-zäöüß-])(?:scheinwerfer|r(?:ü|ue)cklicht|r(?:ü|ue)ckleuchte)(?:n)?(?![a-zäöüß])\s+(?:(?:vorne|vorn|hinten|links|rechts|ist|sind|innen|total|komplett|stark)\s+){0,3}(?:beschlagen|voll\s+wasser|voller\s+wasser|l(?:ä|ae)uft\s+voll)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced))|(?<![a-zäöüß-])(?:wasser|feuchtigkeit|kondenswasser)\s+(?:im|in\s+der|in\s+den)\s+(?:scheinwerfer|r(?:ü|ue)cklicht|r(?:ü|ue)ckleuchte)n?(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced))`, 'i');
// Backlog 295 (Blickwinkel „Falsch getankt – AdBlue im Dieseltank“): Fehlbetankung → Hinweise (Motor nicht starten/sofort abstellen, nicht
// weiterfahren, Leitung veranlasst Abpumpen/Abschleppen, Menge laut Tankbeleg + Foto, „nicht fahrbereit“) – reine Information, keine Frist, keine Literangabe.
// „AdBlue nachgefüllt“, „AdBlue-Warnung“, „Diesel getankt“, „falsch geparkt“, „Заправив AdBlue“ lösen nichts aus
// Backlog 311 (Blickwinkel „Tür/Ladebordwand/Hecktür schließt nicht“): Heck-/Seiten-/Fahrertür schließt nicht, klemmt, springt auf, Ladebordwand
// fährt nicht hoch/hängt herunter, Türverriegelung defekt – nicht losfahren, unterwegs anhalten und sichern (nichts mit Gewalt schließen, nicht in den
// Schwenkbereich treten), Leitung, Fotos, Fahrbereitschaft. „Tür eingedrückt“ (Schaden), „Tür aufgebrochen“ (Diebstahl), „Rolltor beim Kunden klemmt“,
// „Türdichtung undicht“, „door dented“, „Двері пошкоджені“ lösen nichts aus
const DOOR_HINT = lbRx(String.raw`(?<![a-zäöüß-])(?:ladebordwand|lbw|hebeb(?:ü|ue)hne|hubladeb(?:ü|ue)hne|ladeb(?:ü|ue)hne)(?![a-zäöüß])\s+(?:\S+\s+){0,2}?(?:spinnt|zickt|spielt\s+verr(?:ü|ue)ckt|macht\s+(?:gar\s+)?(?:nix|nichts|keinen\s+mucks)|bleibt\s+(?:\S+\s+)?(?:h(?:ä|ae)ngen|stecken|stehen)|reagiert\s+nicht|f(?:ä|ae)hrt\s+(?:gar\s+)?nicht(?:\s+mehr)?(?=\s*(?:$|[.,;!?])))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced))|(?<![a-zäöüß-])lbw(?![a-zäöüß])\s+(?:(?:ist|geht|hinten|wieder|schon)\s+){0,2}(?:defekt|kaputt|ausgefallen|nicht(?=\s*(?:$|[.,;!?]))|(?:geht|f(?:ä|ae)hrt)\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:ganz\s+)?(?:hoch|runter|zu|auf|ein)(?![a-zäöüß]))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced))|(?<![a-zäöüß-])(?:fahrer|beifahrer|heck|seiten|schiebe|lade|koffer)?(?:tür|tuer)(?:en|e)?(?![a-zäöüß])\s+(?:\S+\s+){0,2}?(?:geht|gehen|l(?:ä|ae|a)(?:ss|ß)t\s+sich|lassen\s+sich)\s+(?:nur\s+)?(?:noch\s+)?(?:ganz\s+|sehr\s+|total\s+|extrem\s+|richtig\s+)?schwer\s+(?:zu|auf|schlie(?:ß|ss)en|(?:ö|oe)ffnen)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced))|(?<![а-яіїєґё])(?:двер\S*|ролет\S*|роллет\S*)\s+(?:\S+\s+)?(?:не\s+(?:замика\S*|запира\S*)|заклинил\S*|заклинило|(?<!не\s)(?:заїда|заеда)\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![a-zäöüß-])(?:ladebordwand|hebeb(?:ü|ue)hne)\s+(?:\S+\s+)?h(?:ä|ae)ngt\s+(?:\S+\s+)?schief(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![a-zäöüß])(?:(?:heck|lade|seiten|schiebe|flügel|fluegel|fahrer|beifahrer|koffer|kühl|kuehl|auflieger|anhänger)?(?:tür|tuer|tur)(?:en|e)?|palettenk(?:a|ä|ae)sten(?:klappe|deckel|schloss|tür)?|ladebordwand|hebebühne|hubladebühne|ladebühne|ladeklappe|bordwand|bordwände|heckklappe|türverriegelung|türschloss|türverschluss|drehstangenverschluss)\s+(?:\S+\s+){0,3}?(?:(?:schlie(?:ß|ss)t|schliesst|schließen|schliessen|rastet|rasten|verriegelt)\s+(?:\S+\s+)?nicht(?![a-zäöüß])|(?:geht|gehen|l(?:ä|ae|a)(?:ss|ß)t\s+sich|lassen\s+sich|ist|sind|fährt|fahren|klappt|klappen)\s+(?:\S+\s+)?nicht\s+(?:mehr\s+|richtig\s+|ganz\s+)?(?:zu(?![a-zäöüß])|auf(?![a-zäöüß])|schließen|schliessen|öffnen|verriegeln|abschließen|hoch(?![a-zäöüß])|runter|herunter|ein(?![a-zäöüß])|ein(?:klappen|fahren)|hochklappen|hochfahren|geschlossen|verriegelt|eingerastet))|(?<![a-zäöüß])(?:(?:heck|lade|seiten|schiebe|flügel|fahrer|beifahrer|koffer|kühl|auflieger|anhänger)?(?:tür|tuer|tur)(?:en|e)?|palettenk(?:a|ä|ae)sten(?:klappe|deckel|schloss|tür)?|ladebordwand|hebebühne|hubladebühne|ladebühne|ladeklappe|bordwand|heckklappe)\s+(?:\S+\s+){0,3}?(?:klemmt|klemmen|steht\s+(?:\S+\s+)?offen|stehen\s+(?:\S+\s+)?offen|springt\s+(?:\S+\s+){0,3}?auf|springen\s+(?:\S+\s+){0,3}?auf|h(?:ä|ae|a)ngt\s+(?:\S+\s+)?(?:herunter|runter|herab)|nicht\s+(?:richtig\s+|ganz\s+|mehr\s+)?(?:zu(?![a-zäöüß])|geschlossen|verriegelt|eingerastet|abschließbar))|(?<![a-zäöüß])(?:(?:heck|lade|seiten|schiebe|flügel|fluegel|fahrer|beifahrer|koffer|kühl|kuehl|auflieger|anhänger)?(?:tür|tuer|tur)(?:en|e)?(?![a-zäöüß])|palettenk(?:a|ä|ae)sten(?:klappe|deckel|schloss|tür)?|ladebordwand|hebebühne|hubladebühne|ladebühne|türverriegelung|türschloss|türverschluss|drehstangenverschluss)\S*\s+(?:\S+\s+){0,2}?(?:defekt|kaputt|ausgefallen|gebrochen)|(?<![a-z])(?:(?:rear|back|side|cargo|trailer|cab|driver['’]?s?|passenger|barn)\s+)?(?:pallet\s+(?:box|chest)|doors?|tail\s*-?lift|lift\s*-?gate|tail\s*-?gate|door\s+(?:lock|latch)|latch)\s+(?:\S+\s+){0,3}?(?:(?:won['’]?t|will\s+not|doesn['’]?t|does\s+not|can['’]?t|cannot|can\s+not)\s+(?:\S+\s+)?(?:close|shut|lock|latch|open|go\s+(?:up|down)|fold|raise|lower)|(?:is|are)?\s*not\s+(?:closing|locking|latching|closed|locked|shut|opening)|stuck|stick(?:s|ing)|jam(?:s|med)|(?:keeps\s+)?(?:flying|swinging|popping|came|coming)\s+open|hanging\s+down|broken|faulty)|(?<![а-яіїєґ])(?:ящик\S*\s+для\s+(?:піддон|палет)\S*|двер\S*|дверцят\S*|гідроборт\S*|гидроборт\S*|борт(?![а-яіїєґ])|задній\s+борт|замок\s+двер\S*)\s+(?:\S+\s+){0,3}?(?:не\s+(?:\S+\s+)?(?:закрива|зачиня|закри|зачин|відкрива|відчиня|откры|закры|опуска|підійма|підніма|поднима|працю|работа|фіксу|фиксир)|заклин\S*|заїло|заело|відчинил\S*\s+на\s+ходу|відкрил\S*\s+на\s+ходу|открыл\S*\s+на\s+ходу)|(?<![a-zäöüß-])(?:ladebordwand|hebebühne|hubladebühne|ladebühne)\s+(?:\S+\s+){0,3}?(?:geht\s+(?:\S+\s+)?nicht(?![a-zäöüß])|funktioniert\s+(?:\S+\s+)?nicht|senkt\s+sich\s+(?:\S+\s+)?(?:ab|von\s+selbst)|sackt\s+(?:\S+\s+)?ab)(?!\s+(?:\S+\s+)?(?:wieder|behoben|repariert))|(?<![a-z-])(?:tail\s*-?lift|lift\s*-?gate)\s+(?:\S+\s+){0,3}?(?:not\s+working|isn['’]?t\s+working|doesn['’]?t\s+work|dead|failed|dropping|drops|sinking|keeps\s+(?:dropping|sinking))(?![a-z])|(?<![a-zäöüß-])(?:ladebordwand|hebebühne|hubladebühne|ladebühne)\s+(?:\S+\s+){0,3}?(?:fehler\S*|st(?:ö|oe|o)rung|piept|warnton|blinkt|ohne\s+funktion|reagiert\s+(?:\S+\s+)?nicht)(?![a-zäöüß])(?!\s+(?:\S+\s+)?(?:behoben|beseitigt|repariert|weg(?![a-zäöüß])|quittiert|gel(?:ö|oe)scht))|(?<![a-z-])tail\s?lift\s+(?:\S+\s+){0,3}?(?:fault\S*|error\S*|beep\S*|not\s+working|broken|stuck)|(?<![a-zäöüß-])(?:rolltor|rollt(?:ü|ue)r|rollladen|rolltore|rollt(?:ü|ue)ren)(?![a-zäöüß])(?![^.;!?]*(?:kunde\S*|halle|lager\S*|rampe|firma|depot|customer|warehouse))(?![^.;!?]*(?:repariert|getauscht|erneuert|behoben|gewechselt|wieder\s+in\s+ordnung|fixed|repaired|replaced|відремонт\S*|замінен\S*|отремонт\S*|заменен\S*))\s+(?:\S+\s+){0,3}?(?:klemmt|klemmen|h(?:ä|ae|a)ngt|defekt|kaputt|(?:geht|gehen|l(?:ä|ae)sst\s+sich)\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:auf|zu|hoch|runter|(?:ö|oe)ffnen|schlie(?:ß|ss)en))(?![a-zäöüß])|(?<![a-z])(?:roller\s+shutter|roll-?up\s+door)s?\s+(?:\S+\s+){0,2}?(?:stuck|jammed|broken|won['’]?t\s+(?:open|close))|(?<![a-zäöüß-])(?:ladebordwand|lbw|hebeb(?:ü|ue)hne|hubladeb(?:ü|ue)hne|ladeb(?:ü|ue)hne)\s+(?:(?:ist|hinten|links|rechts|halb|unten|jetzt|wieder|schon\s+wieder)\s+){0,2}h(?:ä|ae)ngt(?:\s+(?:runter|herunter|unten|durch|fest|halb\s+(?:runter|offen)))?(?=\s*(?:$|[.,;!?]))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))`, 'i', 1);
// Backlog 312 (Blickwinkel „Lkw festgefahren oder kommt bei Glätte nicht weiter“): festgefahren, steckt im Schnee/Schlamm fest, Räder drehen durch,
// kommt die Steigung nicht hoch – nicht mit Gewalt freifahren, Stelle sichern, Schneeketten nur unterwiesen und abseits des Verkehrs, Leitung entscheidet über
// Bergung, Fotos/Ort, Fahrbereitschaft. „Radmutter sitzt fest“, „Schlüssel steckt“, „Tür klemmt“, „door got stuck“, „Kupplung rutscht“ lösen nichts aus
const STUCK_HINT = lbRx(String.raw`festgefahren|steckengeblieben|stecken\s+geblieben|(?<![a-zäöüß])eingesunken|(?<![a-zäöüß])(?:lkw|fahrzeug|auflieger|anhänger|anhaenger|zugmaschine|sattelzug|zug|wagen|ich|wir)\s+(?:\S+\s+){0,4}?(?:steckt|stecke|stecken|sitzt|sitze|sitzen|h(?:ä|ae|a)ngt|hänge|h(?:ä|ae|a)ngen)\s+(?:\S+\s+){0,3}?fest(?![a-zäöüß])|(?<![a-zäöüß])(?:im|in\s+der|in\s+den|auf\s+der)\s+(?:schlamm|matsch|schnee|graben|sand|acker|wiese|böschung|baustelle)\s+(?:\S+\s+){0,2}?(?:fest(?![a-zäöüß])|eingesunken|stecken)|(?<![a-zäöüß])(?:räder|reifen|antriebsräder)\s+(?:\S+\s+){0,2}?drehen\s+(?:\S+\s+)?durch|(?<![a-zäöüß])(?:komme|kommt|kommen|schaffe|schafft|schaffen)\s+(?:\S+\s+){0,4}?(?:berg|steigung|hang|rampe|auffahrt|anstieg)\s+(?:\S+\s+){0,3}?nicht\s+(?:mehr\s+)?(?:hoch|rauf|hinauf)(?![a-zäöüß])|(?<![a-z])(?:stuck|bogged\s+down|sunk)\s+in\s+(?:the\s+)?(?:snow|mud|ditch|sand|ice|field|verge|soft\s+ground)|(?<![a-z])(?:truck|lorry|vehicle|trailer|tractor|rig|we|we['’]?re|i['’]?m|i\s+am)\s+(?:is\s+|are\s+|am\s+|got\s+|get\s+|have\s+got\s+)?(?:stuck|bogged\s+down)(?![a-z])|(?<![a-z])wheels?\s+(?:are\s+|keep\s+)?spinning|(?<![a-z])can['’]?t\s+(?:get|make\s+it)\s+up\s+the\s+(?:hill|ramp|slope|incline)|(?<![а-яіїєґ])(?<!(?:ключ|ключі|карт|картк|карточк)\S*\s+(?:\S+\s+)?)(?:застря\S*(?!\s+(?:\S+\s+)?(?:в|у)\s+(?:замку|замке|запалюван|зажиган|тахограф))|(?<!(?:зчеплення|сцеплени[ея])\s+(?:\S+\s+)?)(?:забукс|буксу)[^\s.,;:!?]*(?![^\s.,;:!?])(?!\s+(?:\S+\s+)?(?:зчеплення|сцеплени))|грузов\S*\s+сів\S*)|не\s+(?:можу|може|можемо|могу|может)\s+(?:\S+\s+)?(?:виїхати|выехать|піднятися|подняться|заїхати|заехать)\s+(?:\S+\s+){0,2}?(?:на\s+)?(?:гор\S*|підйом\S*|подъем\S*|пандус\S*|снігу|снегу|бруд\S*|гряз\S*|багн\S*)|(?<![a-zäöüß-])(?:im|in\s+den|in\s+einen|im\s+stra(?:ß|ss)en)\s*graben(?![a-zäöüß])|(?<![a-zäöüß-])(?:ins|im|vom)\s+bankett\s+(?:\S+\s+)?(?:abgerutscht|gerutscht|eingesunken|eingesackt|festgefahren|steckt)|(?<![a-z])(?:in|into)\s+(?:a|the)\s+ditch(?![a-z])|(?<![а-яіїєґё])(?:у|в)\s+кювет\S*`, 'i', 1);
const FUEL_HINT = lbRx(String.raw`falsch\s+(?:\S+\s+){0,2}?(?:getankt|betankt)|falsche[nmrs]?\s+(?:kraftstoff|sprit|treibstoff)|fehlbetank|(?:adblue|harnstoff|adblau)\S*\s+(?:\S+\s+){0,3}?(?:in\s+den|in|im|ins|statt|anstatt)\s+(?:\S+\s+)?(?:diesel|kraftstoff)|benzin\S*\s+(?:\S+\s+){0,3}?(?:in\s+den|im|ins)\s+(?:\S+\s+)?(?:diesel|kraftstoff|tank)|diesel\s+(?:\S+\s+){0,3}?(?:in\s+den|in|im|ins|statt|anstatt)\s+(?:\S+\s+)?(?:adblue|harnstoff)|(?:benzin|super(?:\s+e10)?)\s+(?:statt|anstatt)\s+diesel|benzin\s+getankt|wrong\s+fuel|mis-?fuel|(?:filled|fuelled|fueled)\s+(?:\S+\s+){0,2}?with\s+(?:petrol|gasoline)|(?:adblue|def|petrol|gasoline)\s+(?:\S+\s+){0,2}?in(?:to)?\s+(?:the\s+)?(?:diesel|fuel)[\s-]?tank|adblue\s+(?:\S+\s+)?instead\s+of\s+diesel|diesel\s+(?:\S+\s+){0,2}?in(?:to)?\s+(?:the\s+)?(?:adblue|def)[\s-]?tank|(?:залив|залил|заправи|заправил)\S*\s+(?:\S+\s+){0,3}?(?:не\s+т[еоу]|неправильн|бензин)|неправильн\S*\s+(?:пальн|палив|топлив)|(?:adblue|адбл(?:ю|у)\S*|бензин\S*|сечовин\S*|мочевин\S*)\s+(?:\S+\s+){0,2}?(?:в|у)\s+(?:дизельн\S*|паливн\S*|топливн\S*)\s+бак|(?:дизель|дизпалив|солярк|соляр)\S*\s+(?:\S+\s+){0,2}?(?:в|у)\s+(?:бак\s+)?(?:для\s+)?(?:adblue|адбл(?:ю|у)\S*|сечовин\S*|мочевин\S*)|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-z])put\s+(?:\S+\s+)?(?:petrol|gasoline)\s+in(?:to)?(?![a-z])(?![^.;!?]*(?:generator|jerry|mower|\bcar\b|\bcan\b))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))`, 'i', 1);
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
const ADAS_HINT = lbRx(String.raw`(?<![a-zäöüß])(?:(?:notbrems|abbiege|spurhalte|spurverlassens|spur|spurwechsel|totwinkel|toter-winkel|brems|abstands|fahr|fahrer)assistent(?:en|s)?|notbremssystem|notbremsassistenz|abbiegeassistenz|spurhalteassistenz|tempomat|abstandstempomat|abstandsregeltempomat|abstandsregelung|assistenzsystem(?:e|en)?|assistent(?:en)?|(?:rückfahr|rueckfahr|seiten|front|spiegelersatz)?kamera(?:s)?|kamerasystem|kamera-monitor-system|kameramonitor(?:e|en)?|kamerabildschirm(?:e)?|spiegelersatzsystem|radarsensor(?:en)?|abstandssensor(?:en)?)(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:ausgefallen|fällt\s+aus|faellt\s+aus|spinnt|spinnen|geht\s+nicht|gehen\s+nicht|funktioniert\s+nicht|funktionieren\s+nicht|defekt|kaputt|fehler\S*|störung|gestört|nicht\s+verfügbar|nicht\s+verfuegbar|ohne\s+funktion|zeigt\s+nichts|zeigt\s+kein\s+bild|bild\s+(?:ist\s+)?schwarz|schwarz(?![a-zäöüß])|beschlagen|verschmutzt|verdreckt|zugeschneit|vereist|flackert|unscharf|bremst\s+(?:\S+\s+)?(?:grundlos|ohne\s+grund|einfach\s+so)|hat\s+(?:\S+\s+)?(?:grundlos|ohne\s+grund)\s+gebremst|löst\s+(?:\S+\s+)?(?:grundlos|ständig)\s+aus|(?:piept|piepst|warnt)\s+(?:\S+\s+)?(?:st(?:ä|ae)ndig|dauernd|ununterbrochen|grundlos|ohne\s+grund))|(?<![a-zäöüß])(?:fehler\S*|störung|ausfall|warnung)\s+(?:\S+\s+){0,2}?(?:des\s+|der\s+|vom\s+|am\s+|im\s+|beim\s+)?(?:notbrems|abbiege|spurhalte|abstands|totwinkel)\S*|phantombremsung|fehlauslösung\s+(?:\S+\s+){0,2}?(?:notbrems|bremsassist)\S*|(?<![a-zäöüß])(?:lkw|fahrzeug|zugmaschine|er)\s+(?:\S+\s+){0,2}?(?:bremst|bremste|hat)\s+(?:\S+\s+){0,2}?(?:grundlos|ohne\s+grund)\s*(?:gebremst|voll|stark)?|(?<![a-z])(?:emergency\s+brak(?:e|ing)(?:\s+(?:assist|system))?|aebs|blind\s+spot\s+(?:assist|system|camera|sensor|warning)|turn(?:ing)?\s+assist(?:ant)?|lane\s+(?:keep(?:ing)?|departure)\s+(?:assist|warning|system)|adaptive\s+cruise(?:\s+control)?|cruise\s+control|driver\s+assist(?:ance)?(?:\s+systems?)?|(?:rear(?:view)?|reversing|side|mirror|front)\s+cameras?|camera\s+(?:system|monitor)|radar\s+sensors?)\s+(?:\S+\s+){0,3}?(?:not\s+working|doesn['’]?t\s+work|isn['’]?t\s+working|failed|fault|error|unavailable|disabled|broken|black|blank|fogged(?:\s+up)?|misted(?:\s+up)?|dirty|blurry|flickering|out(?![a-z]))|phantom\s+brak(?:e|ing)|brak(?:ed|es|ing)\s+(?:\S+\s+){0,2}?for\s+no\s+reason|(?<![а-яіїєґ])(?:асистент\S*|ассистент\S*|круїз\S*|круиз\S*|систем\S*\s+(?:екстрен\S*|аварійн\S*|экстренн\S*)\s+гальмуван\S*|камер\S*|радар\S*)\s+(?:\S+\s+){0,3}?(?:не\s+працю\S*|не\s+работа\S*|помилк\S*|ошибк\S*|вийшл\S*\s+з\s+ладу|вийшов\s+з\s+ладу|злама[вл]\S*|сломал\S*|не\s+показу\S*|не\s+показыва\S*|запітніл\S*|запотел\S*|брудн\S*|забрудн\S*|грязн\S*|мерехт\S*)|(?<![а-яіїєґ])(?:гальму\S*|тормоз\S*)\s+(?:\S+\s+){0,2}?(?:без\s+причини|без\s+причины)|(?<![a-zäöüß])(?:rückfahrwarner|rueckfahrwarner|rückfahrwarneinrichtung|rückfahrwarnsystem|rückfahrpiepser|rückwärtswarner|rückfahrwarnsignal|rueckfahrwarnsignal|rückfahrwarnton|rückfahrsignal|rückfahrpieper)\s+(?:\S+\s+){0,3}?(?:piept\s+nicht|ist\s+stumm|stumm(?![a-zäöüß])|ausgefallen|geht\s+nicht|funktioniert\s+nicht|defekt|kaputt)|(?<![a-z])(?:reversing|reverse|back-?up)\s+(?:alarm|beeper|buzzer)s?\s+(?:\S+\s+){0,3}?(?:not\s+working|doesn['’]?t\s+work|isn['’]?t\s+working|silent|failed|broken|dead)(?![a-z])|(?<![а-яіїєґ])(?:сигнал\S*|зумер\S*|пищалк\S*)\s+(?:заднього|заднего)\s+ход\S*\s+(?:\S+\s+){0,2}?(?:не\s+працю\S*|не\s+работа\S*|мовчить|молчит|злама[внл]\S*|сломан\S*)|(?<![a-zäöüß])tempomat\S*\s+(?:\S+\s+){0,3}?(?:schaltet\s+sich\s+(?:\S+\s+)?(?:ab|aus)(?![a-zäöüß])|l(?:ä|ae|a)sst\s+sich\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:ein|aus|ab)schalten|beschleunigt\s+(?:\S+\s+)?(?:von\s+selbst|allein|grundlos))|(?<![a-z])cruise\s+control\s+(?:\S+\s+){0,2}?(?:won['’]?t|doesn['’]?t|does\s+not|will\s+not)\s+(?:turn|switch)\s+(?:on|off)|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-z-])(?:lane\s+(?:assist|keeping(?:\s+assist)?|departure(?:\s+warning)?)|emergency\s+brak(?:e|ing)(?:\s+assist(?:ant)?)?|aebs|collision\s+warning|adaptive\s+cruise(?:\s+control)?|acc(?![a-z]))\s+(?:\S+\s+){0,3}?(?:faulty|fault|not\s+working|broken|error|failed|activat\S*\s+(?:for\s+no\s+reason|by\s+itself|on\s+its\s+own)|brak\S*\s+for\s+no\s+reason|keeps\s+(?:beeping|braking|activating))(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?:автоматичн\S*|екстрен\S*|аварійн\S*)\s+гальмуванн\S*\s+(?:\S+\s+)?(?:спрацьову\S*|спрацював\S*|спрацювало)|(?<![а-яіїєґё])(?:автоматическ\S*|экстренн\S*)\s+торможени\S*\s+(?:\S+\s+)?(?:срабатыва\S*|сработал\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))`, 'i', 1);
// Backlog 581 (Diktat/Tippfehler): „Lenkung schwer/locker/lose/spielt“, „ziet“, „blokiert“, Umschrift „rul tugoy“
const STEER_HINT = lbRx(String.raw`(?<![a-zäöüß-])kein(?:e|en)?\s+(?:servo|lenkhilfe|servolenkung|servounterst(?:ü|ue)tzung)(?![a-zäöüß])(?:\s+mehr)?(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung|da)|fixed|repaired|replaced))|(?:(?:(?<![a-zäöüß-])spurstange(?:nkopf|nköpfe|nkoepfe|n)?\s+(?:\S+\s+)?(?:verbogen|ausgeschlagen|gebrochen|krumm|locker|hat\s+spiel)(?![a-zäöüß])|(?<![a-z])(?:tie|track|steering)\s?rods?(?:\s+ends?)?\s+(?:\S+\s+)?(?:bent|worn|loose|broken|has\s+play)|(?<![a-z])drag\s+link\s+(?:\S+\s+)?(?:bent|worn|loose|broken)|(?<![а-яіїєґё])(?:рульов\S*|рулев\S*)\s+(?:тяг\S*|наконечник\S*)\s+(?:\S+\s+)?(?:погнут\S*|зігнут\S*|зношен\S*|изношен\S*|люфт\S*|злама[внл]\S*|сломан\S*|розбит\S*|разбит\S*))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![а-яіїєґё])люфт\S*\s+(?:в\s+|у\s+)?(?:керм\S*|рул\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![a-zäöüß-])(?:lkw|fahrzeug|zugmaschine|sattelzug|gespann|wagen|lenkung)\s+(?:[^\s.,;!?]+\s+){0,3}?(?:schwimmt|schwammig|wandert)(?![a-zäöüß])(?!\s+(?:in\s+die|ins|zur|zum|nach|in\s+den)\s)(?!\s+(?:im|ins|in\s+(?:der|dem|den))\s+(?:wasser|hochwasser|graben|see|fluss|bach|pf(?:ü|ue)tze))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|freigeschaltet|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung|frei)|fixed|repaired|replaced|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))|(?<![a-z-])(?:truck|lorry|vehicle|rig|steering)\s+(?:\S+\s+){0,2}?(?:wanders|wandering|is\s+floaty|feels\s+floaty|feels\s+vague|is\s+vague)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|freigeschaltet|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung|frei)|fixed|repaired|replaced|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))|(?<![а-яіїєґё])(?:кермо|руль)\s+(?:\S+\s+)?(?:гуляє|гуляет|гуляют|гуляють)|(?<![a-zäöüß])(?:lenkung|lenkrad|servolenkung)\s+(?:\S+\s+){0,2}?(?:schwer(?![a-zäöüß])|locker(?![a-zäöüß])|lose(?![a-zäöüß])|spielt|ziet|blokier\S*)|(?<![a-z])(?:rul|rulya)\s+(?:\S+\s+)?(?:tug\S*|tyazh\S*|ne\s+krut\S*|lyuft\S*)|(?<![a-zäöüß])(?:servolenkung|lenkung|lenkhilfe|lenkrad(?:es|s)?|lenkgetriebe|lenkachse|spurstange)(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:zieht|zog|ausgeschlagen|schwerg(?:ä|ae|a)ngig|geht\s+(?:\S+\s+)?schwer|ist\s+(?:\S+\s+)?schwer|sehr\s+schwer|hat\s+(?:\S+\s+)?spiel|spiel(?![a-zäöüß])|wackelt|flattert|vibriert|zittert|blockiert|klemmt|hakt|ausgefallen|f(?:ä|ae|a)llt\s+aus|defekt|kaputt|fehler\S*|st(?:ö|oe|o)rung|steht\s+schief|schief(?![a-zäöüß])|reagiert\s+(?:\S+\s+)?(?:nicht|kaum|verz(?:ö|oe|o)gert))|(?<![a-zäöüß])(?:fehler\S*|st(?:ö|oe|o)rung|ausfall|warnung|warnmeldung)\s+(?:\S+\s+){0,2}?(?:der\s+|an\s+der\s+|im\s+)?(?:servolenkung|lenkung|lenkhilfe|lenkgetriebe)(?![a-zäöüß])|(?<![a-zäöüß])(?:lkw|fahrzeug|zugmaschine|auflieger|er|wagen)\s+(?:\S+\s+){0,2}?(?:zieht|zog)\s+(?:\S+\s+){0,3}?nach\s+(?:links|rechts)(?![a-zäöüß])|(?<![a-z])(?:power\s+)?steering(?:\s+wheel)?\s+(?:\S+\s+){0,3}?(?:pulls|pulling|pulled|heavy|stiff|hard|has\s+(?:\S+\s+){0,3}?play|play(?![a-z])|loose|wobbl\S*|vibrat\S*|shak\S*|locked|locks|jam\S*|failed|fail(?:s|ure)|fault|error|not\s+working|doesn['’]?t\s+work|isn['’]?t\s+working|crooked|off[-\s]cent(?:er|re))|(?<![a-z])(?:truck|vehicle|lorry|it)\s+(?:\S+\s+){0,2}?pull(?:s|ing|ed)?\s+(?:\S+\s+){0,2}?to\s+the\s+(?:left|right)(?![a-z])|(?<![а-яіїєґ])(?:керм\S*|рульов\S*|руль|руля|рулев\S*|підсилювач\S*\s+керма|гидроусилител\S*|гідропідсилювач\S*)\s+(?:\S+\s+){0,3}?(?:туг\S*|важк\S*|тяжел\S*|тягне|тянет|люфт\S*|вібру\S*|вибриру\S*|трясет\S*|трясе\S*|заклин\S*|клин\S*|не\s+працю\S*|не\s+работа\S*|помилк\S*|ошибк\S*|відмов\S*|отказа\S*|вийш\S*\s+з\s+ладу|криво)|(?<![а-яіїєґ])(?:тягне|тягнe|тянет|веде|ведет)\s+(?:\S+\s+){0,2}?(?:вправо|вліво|влево|праворуч|ліворуч)|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?:кермо|руль)\s+(?:\S+\s+)?(?:б['’ʼ]?є|бьет|б['’ʼ]?ється|трясе|трясеться|трясется)(?![а-яіїєґё])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не)))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*|усунул\S*|устранил\S*|полагодил\S*|починил\S*))|(?:(?<![a-zäöüß])(?:lkw|fahrzeug|zugmaschine|wagen|sattelzug|er)\s+(?:\S+\s+)?(?:l(?:ä|ae|a)uft|f(?:ä|ae|a)hrt)\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?gerade(?:aus)?(?![a-zäöüß])(?!\s+(?:gut|rund|toll|super|so|besonders|ruhig|sauber))|(?<![a-zäöüß])lenk(?:ung|rad|getriebe|säule|saeule)\S*\s+(?:\S+\s+){0,3}?(?:knackt|knacken|knarzt|knarrt|klackt|klopft|quietscht)(?![a-zäöüß])|(?<![a-zäöüß-])(?:servo|servolenkung|lenkhilfe|lenkunterst(?:ü|ue)tzung)\S*\s+(?:\S+\s+){0,2}?(?:ausgefallen|f(?:ä|ae|a)llt\s+aus|defekt|kaputt|geht\s+nicht|funktioniert\s+nicht|weg)(?![a-zäöüß])|(?<![a-z])power\s+steering\s+(?:\S+\s+){0,2}?(?:failed|failure|not\s+working|gone|broken))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|vermessen|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))|(?<![a-zäöüß-])(?:lenkrad|lenks(?:ä|ae)ule)(?![a-zäöüß])\s+(?:(?:mehr|richtig|ganz|immer|jetzt|beim\s+fahren)\s+)?(?:(?:rastet|arretiert|verriegelt)\s+(?:\S+\s+)?nicht(?:\s+mehr)?(?:\s+(?:richtig|ganz))?\s+ein|(?:l(?:ä|ae)sst|lassen)\s+sich\s+(?:\S+\s+)?nicht(?:\s+mehr)?\s+(?:verstellen|arretieren|feststellen|einrasten|fixieren)|h(?:ä|ae)lt\s+(?:die\s+(?:position|einstellung|stellung)\s+)?nicht)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|adjusted|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))|(?<![a-zäöüß-])lenks(?:ä|ae)ule(?![a-zäöüß])\s+(?:\S+\s+)?(?:wackelt|locker|hat\s+spiel|klappert)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|adjusted|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))|(?<![a-zäöüß-])(?:lenkrad|lenks(?:ä|ae)ulen)(?:verstellung|arretierung|einstellung|verriegelung)(?![a-zäöüß])\s+(?:\S+\s+){0,2}?(?:kaputt|defekt|geht\s+nicht|funktioniert\s+nicht|h(?:ä|ae)lt\s+nicht|rastet\s+nicht|klemmt|ausgefallen)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|adjusted|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))|(?<![a-z-])steering\s+(?:wheel|column)\s+(?:(?:height\s+|tilt\s+|position\s+)?adjust(?:ment|er)?\s+)?(?:\S+\s+)?(?:won['’]?t|will\s+not|doesn['’]?t|does\s+not|not)\s+(?:lock|adjust|stay|hold)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|adjusted|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))|(?<![a-z-])steering\s+(?:wheel|column)\s+(?:height\s+|tilt\s+)?adjust(?:ment|er)\s+(?:\S+\s+)?(?:broken|faulty|stuck|not\s+working)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|adjusted|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))|(?<![а-яіїєґё])(?:кермо|кермов\S*\s+колонк\S*|руль|рулев\S*\s+колонк\S*)\s+(?:\S+\s+)?не\s+(?:регулю\S*|фіксу\S*|фиксиру\S*|регулиру\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|adjusted|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))|(?<![a-zäöüß-])lenkrad(?![a-zäöüß])\s+(?:(?:dreht|drehte|bewegt)\s+sich\s+(?:\S+\s+)?(?:nicht|kaum)(?![a-zäöüß])|(?:l(?:ä|ae)sst|lie(?:ß|ss))\s+sich\s+(?:\S+\s+)?(?:nicht|kaum|nur\s+schwer)(?:\s+mehr)?\s+(?:drehen|bewegen|einschlagen))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|adjusted|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))|(?<![a-z-])steering(?:\s+wheel)?\s+(?:won['’]?t|will\s+not|doesn['’]?t|does\s+not|can['’]?t|cannot)\s+(?:\S+\s+)?(?:turn|move)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|adjusted|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))|(?<![а-яіїєґё])(?:кермо|руль)\s+(?:\S+\s+)?не\s+(?:крути\S*|поверта\S*|поворачива\S*|руха\S*|двига\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|adjusted|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))`, 'i', 1);
// Backlog 344 (Fehlersuche): auch Keil-/Rippenriemen gerissen/quietscht, Lichtmaschine lädt nicht, Batterie wird nicht geladen, Wasserpumpe/Kühlerlüfter
// ausgefallen (DE/EN/UK/RU); „Spanngurt gerissen“, „Riemen gerissen“ allein (Ladung), „Lüfter im Fahrerhaus“, „Batterie leer“ nicht
// Backlog 346 (Fehlersuche, sicherheitskritisch): auch „Motor geht während der Fahrt aus“, „Motor stirbt ab“, „Motor ruckelt/stottert/setzt aus“, „springt an und
// geht wieder aus“, „engine cuts out/stalls“, „двигун глухне“; „Motor aus“, „Motor ausgemacht“, „Motor geht nicht an“ (Starthilfe) nicht
// Backlog 351: auch ukrainisch/russisch ohne Farbwort („дим з вихлопної труби“, „з вихлопної труби дим“, „глушник димить“)
// Backlog 349 (Fehlersuche): auch farbiger/starker Rauch aus dem Auspuff („schwarzer Rauch aus dem Auspuff“, „smoke from the exhaust“, „чорний дим з вихлопної“) – Motorproblem;
// Rauch aus Motorraum/Fahrerhaus bleibt beim Brand-Hinweis
// Backlog 750 (Sonde 30.10.2026 23:15): „AdBlue ist alle/ausgegangen“, „kein AdBlue mehr“, „out of AdBlue“, „закінчився AdBlue“ → Motor-Schritte (nicht „AdBlue alle 2 Wochen“).
// Backlog 770 (Sonde AdBlue-Defekt): „AdBlue-Fehler/-Warnung“ (zusammengeschrieben), „AdBlue-Pumpe/-System/-Sensor defekt, funktioniert nicht“, „AdBlue system not working / pump faulty“,
// „AdBlue error“, „система AdBlue не працює“, „насос AdBlue зламався“ → Motor-Schritte (AdBlue-Warnung führt zu Notlauf); „ohne/kein Fehler“ und Reparaturvermerk danach nicht
const ENGINE_HINT = lbRx(String.raw`(?<![a-zäöüß-])motor\s+geht\s+(?:immer\s+(?:wieder\s+)?|st(?:ä|ae)ndig\s+|einfach\s+|pl(?:ö|oe)tzlich\s+|dauernd\s+|(?:beim|im)\s+\S+\s+)?aus(?![a-zäöüß])(?![^.;!?]*(?:abstell\S*|normal|wie\s+immer|gewollt|automatisch|start[-\s]?stopp|z(?:ü|ue)ndung|ausschalt\S*|abschalt\S*|ausmach\S*))(?<!automatisch\s+aus)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![а-яіїєґё])(?:помилк\S*|ошибк\S*)\s+(?:\S+\s+)?(?:ad[\s-]?blue|адблю\S*|адблу\S*|сечовин\S*|мочевин\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![a-zäöüß-])(?:motor|dieselmotor)(?![a-zäöüß])\s+(?:[^\s.,;!?]+\s+){0,3}?(?:klopft|nagelt|h(?:ä|ae)mmert)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?<![a-zäöüß-])motorklopfen(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?<![a-z-])engine\s+(?:(?:is|keeps|has\s+started|started|now|really|loud(?:ly)?)\s+){0,3}knock(?:s|ing)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?<![a-z-])knock(?:ing)?\s+(?:noise\s+|sound\s+)?(?:from|in)\s+(?:the\s+)?engine(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?<![а-яіїєґё])(?:двигун\S*|двигател\S*|двигатель|мотор\S*)\s+(?:\S+\s+){0,2}?(?:стукає|стукотить|стукоче|стучит|тарахтить|тарахтит)(?![а-яіїєґё])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?<![а-яіїєґё])(?:турбін\S*|турбин\S*)\s+(?:\S+\s+){0,2}?(?:свистить|свистит|виє|воет|гуде|гудит|не\s+працює|не\s+работает|злама[вл]\S*|сломал\S*|димить|дымит)(?![а-яіїєґё])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?<![a-zäöüß-])(?:(?:motor|visco-?|visko|k(?:ü|ue)hler)?l(?:ü|ue)fter)(?![a-zäöüß])(?!\s+(?:im|in\s+der|der|vom|von\s+der|f(?:ü|ue)r\s+(?:das|die))\s+(?:fahrerhaus|kabine|heizung|klima\S*|standheizung|schlafkabine|l(?:ü|ue)ftung))\s+(?:\S+\s+){0,3}?(?:st(?:ä|ae)ndig|dauernd|permanent|ununterbrochen|durchgehend|(?:die\s+)?ganze\s+zeit|immer\s+(?:an|voll|mit))(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|freigeschaltet|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung|frei)|fixed|repaired|replaced|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))|(?<![a-z-])(?<!(?:cab|heater|blower|cabin)\s)(?:(?:engine|radiator|cooling|viscous|visco)\s+)?fan\s+(?:\S+\s+){0,2}?(?:keeps\s+running|runs\s+(?:constantly|all\s+the\s+time|non-?stop|permanently)|always\s+on|stuck\s+on)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|freigeschaltet|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung|frei)|fixed|repaired|replaced|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))|(?<![а-яіїєґё])вентилятор(?!\s+(?:в|у)\s+(?:кабіні|кабине|салоні|салоне))\s+(?:\S+\s+){0,2}?(?:постійно|весь\s+час|не\s+вимикається|постоянно|вс(?:е|[её])\s+время|не\s+выключается)|(?<![a-zäöüß-])wasserpumpe\s+(?:\S+\s+){0,2}?(?:undicht|leckt|tropft|verliert)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|freigeschaltet|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung|frei)|fixed|repaired|replaced|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))|(?<![a-z-])water\s+pump\s+(?:\S+\s+){0,2}?(?:leak\S*|broken|failed|faulty|dripping)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|freigeschaltet|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung|frei)|fixed|repaired|replaced|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))|(?<![a-zäöüß-])ad[\s-]?blue\s+(?:(?:ist|war|komplett|ganz|schon|jetzt|seit|heute|gestern|morgens?|unterwegs)\s+){0,3}(?:alle(?=\s*(?:$|[.,;!?]))|ausgegangen|aufgebraucht|leergefahren|leer\s+gefahren)|(?<![a-zäöüß-])(?:kein|keinen)\s+ad[\s-]?blue\s+mehr(?![a-zäöüß])|(?<![a-z-])(?:ran\s+out\s+of|out\s+of)\s+ad[\s-]?blue(?![a-z])|(?<![a-z-])no\s+ad[\s-]?blue\s+left(?![a-z])|(?<![а-яіїєґ])(?:закінчи|скінчи|кончи|закончи)\S*\s+(?:\S+\s+)?ad[\s-]?blue|(?<![a-z])ad[\s-]?blue\s+(?:\S+\s+)?(?:закінчи|скінчи|кончи|закончи)\S*|(?<![a-zäöüß])(?:motor|lkw|fahrzeug|zugmaschine|er)\s+(?:\S+\s+){0,3}?(?:(?:ist|geht|läuft|laeuft)\s+(?:\S+\s+)?(?:im\s+|in\s+den\s+)?notlauf|notlauf|(?:verliert|reduziert|drosselt)\s+(?:\S+\s+){0,2}?(?:leistung|kraft)|hat\s+(?:\S+\s+){0,2}?(?:keine|kaum|wenig|weniger)\s+(?:\S+\s+)?(?:leistung|kraft)|zieht\s+(?:nicht\s+(?:mehr|richtig)|(?:nur\s+)?(?:schlecht|kaum)(?:\s+noch)?)(?![a-zäöüß])|(?:ist\s+)?(?:(?:ü|ue|u)berhitzt|ueberhitzt)|wird\s+(?:\S+\s+)?(?:zu\s+)?heiß|wird\s+(?:\S+\s+)?(?:zu\s+)?heiss|kocht)|(?<![a-zäöüß])(?:notlauf(?:programm|modus)?|leistungsreduzierung|leistungsverlust|leistungsabfall|motorleistung\s+(?:\S+\s+)?reduziert|motor(?:temperatur|(?:ü|ue|u)berhitzung|ueberhitzung)|kühlwasser\S*|kuehlwasser\S*|kühlmittel\S*|kuehlmittel\S*|wassertemperatur)(?![a-zäöüß])(?:\s+(?:\S+\s+){0,3}?(?:rot|hoch|zu\s+hoch|kocht|warnung|leer|verloren|läuft\s+aus|laeuft\s+aus|spritzt|(?:ü|ue|u)berhitzt|ueberhitzt|aktiv|zeigt)|(?=\s|$|[.,;!?]))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))|(?<![a-zäöüß])ad[\s-]?blue\S*\s+(?:\S+\s+){0,3}?(?<!(?:ohne|kein|keine|keinen|no|any)\s+)(?:warnung|warnleuchte|fehler\S*|störung|leer|reduziert|drosselt|leuchtet)|(?<![a-zäöüß-])ad-?blue-?(?:fehler\S*|st(?:ö|oe)rung\S*|warnung|warnleuchte|warnmeldung|fehlermeldung)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))|(?<![a-zäöüß-])ad[\s-]?blue[\s-]?(?:system|anlage|pumpe|f(?:ö|oe)rderpumpe|dosier(?:ventil|modul|einheit|pumpe|ung)|heizung|sensor|qualit(?:ä|ae)tssensor|einspritzung|einspritzd(?:ü|ue)se|d(?:ü|ue)se|modul|steuerger(?:ä|ae)t)(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?<!(?:ohne|kein|keine|keinen|no|any)\s+)(?:defekt|kaputt|ausgefallen|(?:funktioniert|geht|arbeitet)\s+(?:\S+\s+)?nicht|fehler\S*|st(?:ö|oe)rung)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))|(?<![a-z-])ad[\s-]?blue\s+(?:(?:system|pump|dosing\s+(?:unit|module|valve|pump)|doser|heater|sensor|quality\s+sensor|injector|nozzle|module)\s+(?:\S+\s+){0,2}?(?<!(?:ohne|kein|keine|keinen|no|any)\s+)(?:not\s+working|isn['’]?t\s+working|doesn['’]?t\s+work|does\s+not\s+work|failed|faulty|broken|defective|defect|error|malfunction\S*)|error|malfunction\S*)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))|(?<![a-zа-яіїєґё-])(?:(?:систем\S*|насос\S*|помп\S*|дозатор\S*|датчик\S*)\s+)?(?:ad[\s-]?blue|адблю\S*|адблу\S*|сечовин\S*|мочевин\S*)(?:\s+(?:систем\S*|насос\S*|помп\S*|дозатор\S*|датчик\S*))?\s+(?:\S+\s+)?(?:не\s+працю\S*|не\s+работа\S*|злама\S*|слома\S*|несправн\S*|неисправ\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))|(?<![a-z])(?:(?:engine\s+|coolant\s+)?temp(?:erature)?\s+(?:gauge|needle)(?![^.,;]*(?:reefer|fridge|trailer\s+unit|thermo\s*king|carrier))\s+(?:\S+\s+){0,3}?(?:in\s+the\s+red|red(?![a-z])|too\s+high|rising|climbing|going\s+up)|limp\s+(?:home\s+)?mode|loss\s+of\s+power|no\s+longer\s+pull(?:s|ing)?(?!\s+(?:to\s+)?(?:the\s+)?(?:left|right|one\s+side|sideways))|loses\s+power|losing\s+power|lost\s+power|no\s+power|reduced\s+(?:engine\s+)?power|power\s+(?:is\s+)?reduced|engine\s+(?:\S+\s+)?(?:overheat\S*|derate\S*|too\s+hot)|(?<!brakes?\s+(?:are\s+|is\s+|keep\s+|keeps\s+)?)overheat(?:s|ed|ing)(?!\s+(?:\S+\s+)?brakes?)|coolant\s+(?:\S+\s+){0,2}?(?:warning|temperature|temp|low|leak\S*|boil\S*)|ad[\s-]?blue\s+(?:\S+\s+){0,2}?(?:warning|fault|empty|light))(?![a-z])|(?<![а-яіїєґ])(?:аварійн\S*\s+режим|аварийн\S*\s+режим|втрат\S*\s+потужност\S*|потер\S*\s+мощност\S*|(?:немає|нема|нет)\s+(?:\S+\s+)?(?:потужност\S*|тяги|мощности)|(?:не|погано|слабо|ледве)\s+тягне(?![а-яіїєґ])|(?:не|плохо|слабо|еле)\s+тянет(?![а-яіїєґ])|(?<!(?:гальм|тормоз)\S*\s+)перегр\S*(?!\s+(?:\S+\s+)?(?:гальм|тормоз))|охолоджувальн\S*\s+рідин\S*|охлаждающ\S*\s+жидкост\S*|антифриз\S*|адблю\S*\s+(?:\S+\s+)?(?:помилк\S*|ошибк\S*|попередж\S*|предупрежд\S*))|(?<![a-zäöüß-])(?:keilriemen|keilrippenriemen|rippenriemen|antriebsriemen|lichtmaschinenriemen|l(?:ü|ue|u)fterriemen|lichtmaschine|wasserpumpe|k(?:ü|ue|u)hlerl(?:ü|ue|u)fter|motorl(?:ü|ue|u)fter|visco-?l(?:ü|ue|u)fter|viskol(?:ü|ue|u)fter)(?:s|n)?(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:gerissen|abgesprungen|runtergesprungen|quietscht|quietschen|pfeift|rutscht|kaputt|defekt|ausgefallen|f(?:ä|ae|a)llt\s+aus|l(?:ä|ae|a)dt\s+nicht|l(?:ä|ae|a)uft\s+nicht|dreht\s+(?:sich\s+)?nicht|funktioniert\s+nicht|geht\s+nicht)|(?<![a-zäöüß-])batterie\S*\s+(?:\S+\s+){0,2}?(?:wird\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?geladen|l(?:ä|ae|a)dt\s+nicht)|(?<![a-z-])(?:fan|alternator|serpentine|drive|v-?|poly-?v)\s*belt\s+(?:\S+\s+){0,2}?(?:snapped|broken|broke|squealing|squeaking|slipping|came\s+off|failed)(?![a-z])|(?<![a-z-])alternator\s+(?:\S+\s+){0,2}?(?:not\s+charging|isn['’]?t\s+charging|failed|dead|broken|faulty|not\s+working|doesn['’]?t\s+work|isn['’]?t\s+working)|(?<![a-z-])water\s+pump\s+(?:\S+\s+)?(?:failed|broken|faulty)|(?<![a-z-])(?:radiator|cooling|engine)\s+fan\s+(?:\S+\s+)?(?:not\s+working|failed|broken|doesn['’]?t\s+work)|(?<![а-яіїєґ])(?:(?:ремін\S*|ремен\S*|ремн\S*|пас)\s+(?:генератор\S*|вентилятор\S*|привод\S*|помп\S*|грм)|(?:приводн\S*|поліклинов\S*|поликлинов\S*|клинов\S*)\s+(?:ремін\S*|ремен\S*|ремн\S*|пас\S*))\s+(?:\S+\s+){0,2}?(?:порва|обірва|обрив|оборва|злеті|злетів|слетел|свист|пищ)\S*|(?<![а-яіїєґ])генератор\S*(?!\s+(?:холодильн|рефриж|установк|агрегат)\S*)\s+(?:\S+\s+)?(?:не\s+заряджа\S*|не\s+заряжа\S*|не\s+да[её]\s+заряд\S*|злама[внл]\S*|сломал\S*|сломан\S*|несправн\S*|неисправ\S*|не\s+працю\S*|не\s+работа\S*|вийшов\s+з\s+ладу|вышел\s+из\s+строя)|(?<![а-яіїєґ])(?:помп\S*|водян\S*\s+насос\S*)\s+(?:\S+\s+)?(?:злама[внл]\S*|сломал\S*|сломан\S*|не\s+працю\S*|не\s+работа\S*)|(?<![a-zäöüß-])(?:motor|lkw)\s+(?:[^\s,.;!?]+\s+){0,2}?(?:geht|ging)\s+(?!nicht)(?:[^\s,.;!?]+\s+){0,4}?aus(?![a-zäöüß])(?=[^.;!?]*?(?:fahrt|fahren|fahre|fuhr|rollen|ampel|kreuzung|autobahn|stra(?:ß|ss)e|unterwegs|leerlauf|anfahren|bremsen|berg|immer|st(?:ä|ae|a)ndig|pl(?:ö|oe|o)tzlich|einfach|selbst|zwischendurch|mehrmals|grundlos))|(?<![a-zäöüß-])(?:motor|lkw)\s+(?:[^\s,.;!?]+\s+){0,2}?(?:geht|ging)\s+(?!nicht)(?:[^\s,.;!?]+\s+){0,3}?(?:fahrt|fahren|fahre|fuhr|rollen|ampel|kreuzung|autobahn|stra(?:ß|ss)e|unterwegs|leerlauf|anfahren|bremsen|berg|immer|st(?:ä|ae|a)ndig|pl(?:ö|oe|o)tzlich|einfach|selbst|zwischendurch|mehrmals|grundlos)\S*\s+(?:[^\s,.;!?]+\s+){0,2}?aus(?![a-zäöüß])|(?<![a-zäöüß-])(?:fahrt|fahren|fahre|fuhr|rollen|ampel|kreuzung|autobahn|stra(?:ß|ss)e|unterwegs|leerlauf|anfahren|bremsen|berg|immer|st(?:ä|ae|a)ndig|pl(?:ö|oe|o)tzlich|einfach|selbst|zwischendurch|mehrmals|grundlos)\S*\s+(?:[^\s,.;!?]+\s+){0,3}?(?:geht|ging)\s+(?:der\s+|mir\s+(?:der\s+)?)?(?:motor|lkw)\s+(?:[^\s,.;!?]+\s+){0,2}?aus(?![a-zäöüß])|(?<![a-zäöüß-])(?:motor|lkw)\s+(?:\S+\s+){0,3}?(?:stirbt|starb)\s+(?:\S+\s+)?ab|(?<![a-zäöüß-])(?:motor|lkw)\s+(?:\S+\s+){0,3}?(?:ruckelt|stottert|setzt\s+aus|nimmt\s+kein\s+gas|geht\s+in\s+die\s+knie)|(?<![a-zäöüß-])springt\s+an\s+und\s+geht\s+(?:\S+\s+)?(?:wieder\s+)?aus|(?<![a-z-])engine\s+(?:\S+\s+){0,2}?(?:cuts?\s+out|cutting\s+out|stalls?|stalled|stalling|dies|died|shuts?\s+(?:itself\s+)?(?:off|down)|shut\s+down|keeps\s+cutting\s+out|misfir\S*|sputter\S*|stutter\S*)|(?<![а-яіїєґ])(?:двигун\S*|мотор\S*|двигател\S*)\s+(?:\S+\s+){0,2}?(?:глухне|заглух\S*|глохне|глохнет|заглох\S*|вимика\S*\s+(?:\S+\s+)?під\s+час\s+руху|смика\S*|дерга\S*|троїть|троит)|(?<![a-zäöüß-])(?:rauch|qualm|dampf)\s+(?:\S+\s+)?aus\s+(?:dem\s+)?auspuff|(?<![a-zäöüß-])(?:aus\s+dem\s+)?auspuff\s+(?:kommt|kommen|steigt|steigen|qualmt\s+es|raucht\s+es)\s+(?:\S+\s+){0,2}?(?:rauch|qualm|dampf)(?![a-zäöüß])|(?<![a-zäöüß-])(?:schwarze[nmrs]?|wei(?:ß|ss)e[nmrs]?|blaue[nmrs]?|graue[nmrs]?)\s+(?:rauch|qualm)(?=[^.;!?]*auspuff)|(?<![a-zäöüß-])auspuff\s+(?:\S+\s+)?(?:qualmt|raucht)\s+(?:\S+\s+)?(?:schwarz|wei(?:ß|ss)|blau|grau|stark)|(?<![a-z-])(?:black|white|blue|grey|gray)\s+smoke(?=[^.;!?]*exhaust)|(?<![a-z-])smoke\s+(?:\S+\s+)?(?:from|out\s+of)\s+(?:the\s+)?exhaust|(?<![а-яіїєґ])(?:чорн|біл|син|черн|бел)\S*\s+(?:дим|дым)\S*\s+(?:\S+\s+){0,2}?(?:вихлоп|выхлоп|глушник|глушител)|(?<![а-яіїєґ])(?:дим|диму|дым|дыма)(?![а-яіїєґ])\s+(?:\S+\s+)?(?:з|із|из)\s+(?:\S+\s+)?(?:вихлоп|выхлоп|глушник|глушител)|(?<![а-яіїєґ])(?:вихлоп|выхлоп|глушник|глушител)\S*\s+(?:\S+\s+){0,2}?(?:дим|дым|димить|дымит|димит|дымится)(?![а-яіїєґ])|(?<![a-zäöüß-])(?:motortemperatur|temperatur|kühlwasser|kuehlwasser)?(?:anzeige|nadel)(?<=(?:temperatur|kühlwasser|kuehlwasser)(?:anzeige|nadel))(?![a-zäöüß])(?![^.,;]*(?:k(?:ü|ue|u)hl(?:aggregat|ger(?:ä|ae|a)t|raum|koffer|auflieger|maschine)|au(?:ß|ss)en|thermo\s*king|carrier))\s+(?:\S+\s+){0,3}?(?:im\s+roten|rot(?![a-zäöüß])|geht\s+(?:\S+\s+)?hoch|steigt|zu\s+hoch|blinkt)|(?<![a-zäöüß-])(?:turbolader|turbo)(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:pfeift|heult|defekt|kaputt|ausgefallen|qualmt|verliert\s+(?:\S+\s+)?(?:ö|oe)l)|(?<![a-z-])turbo(?:charger)?\s+(?:\S+\s+){0,3}?(?:whistl\S*|whin\S*|failed|broken|faulty|not\s+working)|(?<![a-z-])(?:engine|coolant)\s+temp(?:erature)?\s+(?:(?:is|was|gets|getting|goes|going|too|very|really|quite|always|reading)\s+){0,3}(?:high|hot)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?<![а-яіїєґё])(?:температур\S*\s+(?:двигун\S*|двигател\S*|мотор\S*|охолоджувальн\S*\s+рідин\S*|охлаждающ\S*\s+жидкост\S*|антифриз\S*|тосол\S*)\s+(?:\S+\s+){0,2}?(?:висок\S*|высок\S*|зашкалю\S*)|(?:висок\S*|высок\S*)\s+температур\S*\s+(?:двигун\S*|двигател\S*|мотор\S*|антифриз\S*))(?![а-яіїєґё])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|found|gefunden|знайшли|нашли|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-z-])(?:fan\s+|alternator\s+|drive\s+|v\s*-?\s*|poly\s*-?v\s+|serpentine\s+)?(?<!(?:seat|safety|lap|tie|ratchet|lashing|load|cargo|conveyor|tool|utility)[\s-])belt\s+(?:\S+\s+)?(?:snapped|broke|broken|came\s+off|has\s+come\s+off|torn)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|found|gefunden|знайшли|нашли|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|found|gefunden|знайшли|нашли|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-z-])(?:truck|lorry|engine|it)\s+(?:won['’]?t|will\s+not|doesn['’]?t|does\s+not)\s+(?:accelerate|rev(?:\s+up)?|respond\s+to\s+(?:the\s+)?(?:throttle|accelerator|gas))(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|found|gefunden|знайшли|нашли|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|found|gefunden|знайшли|нашли|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])не\s+(?:реагу\S*|реагиру\S*)\s+на\s+(?:педаль\s+)?газ(?![а-яіїєґё])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|found|gefunden|знайшли|нашли|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-z-])(?:losing|leaking|lost|loses)\s+(?:\S+\s+)?(?:coolant|antifreeze)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-z-])coolant\s+(?:level\s+)?(?:keeps\s+)?(?:dropping|disappearing|going\s+down)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?<!(?:schnee|gl(?:ä|ae)tte|glatteis|eis|matsch|schlamm)[^.;!?]*)(?<![a-zäöüß])(?:kommt|kam|komme)\s+(?:\S+\s+){0,3}?(?:berg|steigung|anstieg|auffahrt)\S*\s+(?:\S+\s+)?(?:nicht|kaum)\s+(?:(?:mehr|noch)\s+)?(?:hoch|rauf|hinauf)(?![a-zäöüß])(?![^.;!?]*(?:schnee|glatt|eis(?![a-zäöüß])|matsch|schlamm|drehen\s+durch|repariert|behoben|fixed|repaired))|(?<!(?:schnee|gl(?:ä|ae)tte|glatteis|eis|matsch|schlamm)[^.;!?]*)(?<![a-zäöüß])(?:kriecht|krieche|schleicht)\s+(?:\S+\s+){0,3}?(?:berg|steigung|anstieg)(?![^.;!?]*(?:schnee|glatt|eis(?![a-zäöüß])|matsch|schlamm|drehen\s+durch|repariert|behoben|fixed|repaired))|(?<![a-zäöüß])(?:raucht|qualmt|dampft)\s+(?:\S+\s+){0,2}?aus\s+(?:dem\s+)?auspuff|(?<![a-zäöüß])(?:motor|lkw|fahrzeug|zugmaschine|er)\s+(?:\S+\s+)?zieht\s+(?:gar\s+)?nicht(?:\s+(?:mehr|richtig|gut|am\s+berg|bergauf))?(?=\s*(?:$|[.,;!?]))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![a-zäöüß])(?:keine|kaum|wenig)\s+(?:kraft|leistung|power|zug)\s+(?:mehr\s+)?(?:am\s+berg|bergauf|beim\s+(?:anfahren|beschleunigen))(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![a-zäöüß])(?<!kein\s)(?<!keine\s)(?:pfeifen|heulen|pfeifton|qualm|rauch)\s+(?:vom|am|aus\s+dem)\s+turbo(?:lader)?(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![a-z])(?<!no\s)(?:whistl\S*|whin\S*|noise|smoke)\s+(?:coming\s+)?(?:from|at)\s+the\s+turbo(?:charger)?(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![а-яіїєґё])свист\s+турбін\S*(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![a-z])(?:truck|lorry|engine|it)\s+(?:won['’]?t|doesn['’]?t|does\s+not|will\s+not)\s+pull(?=\s*(?:$|[.,;!?]|\s+(?:uphill|up\s+hills?|anymore|properly)))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![a-z])(?:has\s+)?no\s+(?:pull|power)\s+(?:uphill|up\s+hills?|on\s+hills?)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![a-z-])(?<!(?:reefer|fridge|unit|heater)\s)engine\s+(?:is\s+|keeps\s+|has\s+been\s+)?(?:running|runs|getting|gets|got|going|goes)\s+(?:very\s+|too\s+|really\s+|a\s+bit\s+)?hot(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?<![a-z-])engine\s+temp(?:erature)?\s+(?:is\s+|keeps\s+)?(?:rising|climbing|going\s+up|high|too\s+high|in\s+the\s+red)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?<![а-яіїєґё])температур\S*\s+(?:двигуна|двигателя|мотора|охолоджувальної\s+рідини|охлаждающей\s+жидкости|антифриз[ау]|тосол[ау])\s+(?:\S+\s+)?(?:росте|раст[её]т|піднімається|поднимается|підвищ\S*|повыш\S*|висока|высокая|зашкалю\S*|зашкалива\S*)(?![а-яіїєґё])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?<![a-z-])(?<!(?:seat|safety|lap|ratchet|load|lashing|cargo)[\s-])(?:(?:fan|alternator|drive|serpentine|ribbed|v|aux(?:iliary)?)[\s-])?belts?\s+(?:is\s+|are\s+|keeps\s+)?(?:squeal\S*|squeak\S*|screech\S*|chirp\S*|whin\S*)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|замінив\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?<![a-z-])(?:fan|alternator|drive|serpentine|ribbed|v)[\s-]belts?\s+(?:is\s+|has\s+)?(?:snapped|broke(?:n)?|came\s+off|slipping|torn|cracked|worn)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|замінив\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?<![а-яіїєґё])(?:ремін\S*|ремен\S*|ремн\S*)(?!\s+(?:безпек|безопасн|кріплен|креплен|стяжн))(?:\s+(?:генератор\S*|вентилятор\S*|приводн\S*|поліклинов\S*|поликлинов\S*|ГРМ))?\s+(?:\S+\s+)?(?:свист\S*|скрип\S*|верещ\S*|пищ\S*)(?![а-яіїєґё])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|замінив\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))`, 'i', 1);
// Backlog 751 (Sonde 30.10.2026 23:15): „Anhänger hängt rechts tiefer“, „Auflieger hängt auf einer Seite“, „ist hinten abgesackt“, „sits lower on one side“, „причіп перекошений“ → Federung (nicht „steht schief/tiefer“ – Parken am Hang, Backlog 318, „завалился на бок“).
const SUSP_HINT = lbRx(String.raw`(?:(?<![a-zäöüß-])federbein\S*\s+(?:\S+\s+)?(?:gebrochen|defekt|kaputt|undicht|verbogen)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![а-яіїєґё])(?:піднімн\S*|підйомн\S*|подъемн\S*|подъ[её]мн\S*)\s+(?:вісь|ось)\s+(?:\S+\s+)?не\s+(?:підніма\S*|опуска\S*|поднима\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![a-zäöüß-])(?:feder|blatt|achs)?federbruch(?![a-zäöüß])|(?<![a-zäöüß-])(?:die\s+)?(?:feder|federn|federblatt|federbl(?:ä|ae)tter)\s+(?:(?:ist|sind|hinten|vorne|links|rechts|an\s+der\s+\S+|am\s+\S+)[,;]?\s+){0,3}(?:gebrochen|durchgebrochen|abgebrochen)(?![a-zäöüß])(?![,;]?\s+(?:\S+\s+)?(?:getauscht|ersetzt|erneuert|repariert))|(?<![a-z])(?:broken|snapped|cracked)\s+(?:leaf\s+|road\s+|suspension\s+)?springs?(?![a-z])|(?<![a-z])(?:leaf\s+|suspension\s+)?springs?\s+(?:is\s+|has\s+)?(?:broken|snapped|cracked)(?![a-z])|(?<![a-zäöüß])(?:luftfederung|luftfeder(?:n)?|luftbalg|luftbälge|luftbaelge|luftsack|luftsäcke|federbalg|federbälge|niveauregulierung|niveauregelung|fahrwerk|federung|blattfeder(?:n)?|liftachse(?:n)?|hubachse(?:n)?|achslift)(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:geplatzt|gerissen|defekt|spinnt|geht\s+nicht|funktioniert\s+nicht|kaputt|undicht|verliert\s+(?:\S+\s+)?luft|zischt|ausgefallen|f(?:ä|ae|a)llt\s+aus|gebrochen|fehler\S*|st(?:ö|oe|o)rung|senkt\s+sich|sackt\s+(?:\S+\s+)?ab|l(?:ä|ae|a)sst\s+(?:\S+\s+)?ab|hebt\s+nicht|geht\s+nicht\s+hoch|senkt\s+(?:sich\s+)?nicht(?![a-zäöüß])|bleibt\s+(?:\S+\s+)?(?:oben|unten)(?![a-zäöüß])|geht\s+nicht\s+(?:mehr\s+)?(?:runter|herunter|ab)(?![a-zäöüß])|l(?:ä|ae|a)sst\s+sich\s+nicht\s+(?:mehr\s+)?(?:absenken|senken|heben|anheben)|funktioniert\s+nicht)|(?<![a-zäöüß])(?:lkw|fahrzeug|zugmaschine|auflieger|anh(?:ä|ae|a)nger|trailer|kabine|fahrerhaus)\s+(?:\S+\s+){0,2}?steht\s+(?:(?:hinten|vorne|vorn|links|rechts|total|ganz|sehr|etwas|leicht|richtig|so|zu)\s+){0,2}(?:schief|tief)(?![a-zäöüß])(?![^.;!?,]*(?:hang|gef(?:ä|ae)lle|absch(?:ü|ue)ssig|bordstein|gel(?:ä|ae)nde|parkplatz|rampe|boden|untergrund|schr(?:ä|ae)g))|(?<![a-zäöüß])(?:lkw|fahrzeug|zugmaschine|auflieger|anh(?:ä|ae|a)nger|trailer|er|kabine|fahrerhaus)\s+(?:\S+\s+){0,3}?(?:h(?:ä|ae|a)ngt|liegt|sitzt|ist)\s+(?:\S+\s+){0,2}?schief(?![a-zäöüß])|(?<![a-zäöüß])(?:lkw|fahrzeug|zugmaschine|auflieger|anh(?:ä|ae|a)nger|trailer|kabine|fahrerhaus)\s+(?:\S+\s+){0,2}?(?:h(?:ä|ae|a)ngt|liegt|sitzt)\s+(?:\S+\s+){0,1}?(?:(?:links|rechts|hinten|vorne?)\s+(?:(?:links|rechts)\s+)?(?:tiefer|runter|herunter|durch)|(?:auf\s+einer\s+seite|einseitig)(?:\s+(?:tiefer|runter|herunter|durch)|(?=\s*(?:$|[.,;!?]))))(?![a-zäöüß])|(?<![a-zäöüß])(?:lkw|fahrzeug|zugmaschine|auflieger|anh(?:ä|ae|a)nger|trailer|kabine|fahrerhaus)\s+(?:\S+\s+){0,3}?(?:ist|sind)\s+(?:\S+\s+){0,2}?(?:abgesackt|abgesunken|eingesackt)(?![a-zäöüß])|(?<![a-zäöüß])(?:lkw|fahrzeug|zugmaschine|auflieger|anh(?:ä|ae|a)nger|trailer|er|kabine|fahrerhaus)\s+(?:\S+\s+){0,3}?(?:senkt\s+sich\s+(?:\S+\s+){0,2}?ab|sackt\s+(?:\S+\s+){0,2}?ab|sinkt\s+ab|liegt\s+(?:\S+\s+){0,2}?auf\s+(?:den\s+)?(?:puffern|anschlag))|(?<![a-z])(?:air\s+(?:suspension|bag|bags|bellows|spring|springs)|suspension|leaf\s+springs?|ride\s+height)\s+(?:\S+\s+){0,3}?(?:burst|failed|failure|fault|broken|leak\S*|loses\s+air|losing\s+air|down|collapsed|not\s+working|error)(?![a-z])|(?<![a-z])(?:truck|trailer|vehicle|cab|it)\s+(?:\S+\s+){0,3}?(?:is\s+)?(?:leaning|sagging|sinking|tilted|lopsided)(?![a-z])|(?<![a-z])(?:truck|trailer|vehicle|cab|it)\s+(?:\S+\s+){0,2}?(?:sits|is|hangs|rides|sitting|hanging)\s+(?:much\s+|a\s+lot\s+)?low(?:er)?\s+(?:on\s+(?:one|the\s+(?:left|right|driver|passenger)(?:['’]?s)?)\s+side|on\s+the\s+(?:left|right)|at\s+the\s+(?:back|rear|front))(?![a-z])|(?<![а-яіїєґ])(?:пневмоподуш\S*|подушк\S*|пневмопідвіск\S*|пневмоподвеск\S*|підвіск\S*|подвеск\S*|ресор\S*|рессор\S*)\s+(?:\S+\s+){0,3}?(?:лопну\S*|луснул\S*|порва\S*|пробит\S*|не\s+працю\S*|не\s+работа\S*|спуска\S*|травить|тріснул\S*|злама[вл]\S*|сломал\S*|сломан\S*|злама[внл]\S*)|(?<![а-яіїєґ])(?:вантажівк\S*|причіп\S*|напівпричіп\S*|прицеп\S*|грузовик\S*)\s+(?:\S+\s+){0,2}?(?:просі\S*|просел\S*|перекос\S*|перекош\S*|нахил\S*|криво)|(?<![a-z-])lift(?:ing)?\s+axles?\s+(?:\S+\s+)?(?:stuck|jammed|faulty|broken|not\s+working|won['’]?t\s+(?:lift|lower|go\s+(?:up|down))|doesn['’]?t\s+(?:lift|lower|go\s+(?:up|down)))|(?<![а-яіїєґ])(?:підйомн|подъемн|піднімальн)\S*\s+(?:вісь|осі|ось)\s+(?:\S+\s+)?(?:не\s+підніма\S*|не\s+поднима\S*|не\s+опуска\S*|заклин\S*|не\s+працю\S*|не\s+работа\S*)|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-z-])air\s+(?:suspension|bags?|bellows)\s+(?:\S+\s+){0,2}?(?:dropping|drops|dropped|sinking|sinks|sank|going\s+down|deflat\S*|leaking|burst)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?:пневмопідвіск\S*|пневмоподвеск\S*|подушк\S*\s+підвіск\S*|подушк\S*\s+подвеск\S*)\s+(?:\S+\s+)?(?:опуска\S*|спуска\S*|сіда\S*|сада\S*|пада\S*|трав\S*|лопну\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?:лопну\S*|трісну\S*|тресну\S*|злама\S*|слома\S*)\s+(?:ресор\S*|рессор\S*|пружин\S*)(?![а-яіїєґё])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?:ресор\S*|рессор\S*)\s+(?:\S+\s+)?(?:лопну\S*|трісну\S*|тресну\S*|злама\S*|слома\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-zäöüß-])sto(?:ß|ss)d(?:ä|ae)mpfer\s+(?:\S+\s+){0,2}?(?:undicht|leck|ausgelaufen|defekt|kaputt|gebrochen|abgerissen|(?:verliert|schwitzt)\s+(?:\S+\s+)?(?:ö|oe)l)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-z-])(?:shock\s+absorbers?|shocks|dampers?)\s+(?:\S+\s+){0,2}?(?:leak\S*|broken|blown|gone|worn\s+out)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])амортизатор\S*\s+(?:\S+\s+)?(?:тече|течет|потік|потек|злама\S*|слома\S*|відірва\S*|оторва\S*)(?![а-яіїєґё])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-zäöüß-])(?:luftfederung|luftfeder|niveauregulierung|fahrh(?:ö|oe)he)\s+(?:\S+\s+){0,2}?(?:zu\s+(?:tief|niedrig|hoch)|ganz\s+unten)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-z-])(?:air\s+suspension|ride\s+height)\s+(?:\S+\s+){0,2}?(?:too\s+(?:low|high)|right\s+down|all\s+the\s+way\s+down)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?:машин\S*|вантажівк\S*|причіп|причеп\S*|напівпричіп|грузовик\S*|прицеп\S*|фур\S*)\s+(?:\S+\s+)?(?:кренить|кренит|хилить|накренил\S*|завалю\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])крен\s+на\s+(?:один|одну)\s+(?:бік|бок|сторону)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не)))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*|усунул\S*|устранил\S*|полагодил\S*|починил\S*))|(?<![a-zäöüß])(?:lkw|fahrzeug|zugmaschine|auflieger|anh(?:ä|ae|a)nger|trailer|kabine|fahrerhaus)\s+steht\s+(?![^.;!?,]*(?:hang|gef(?:ä|ae)lle|absch(?:ü|ue)ssig|bordstein|gel(?:ä|ae)nde|parkplatz|rampe|boden|untergrund|schr(?:ä|ae)g))(?:seit\s+(?:\S+\s+){1,3}?|(?:heute|gestern)\s+(?:(?:morgen|fr(?:ü|ue)h|abend)\s+)?|(?:jetzt|pl(?:ö|oe)tzlich|wieder|schon|immer\s+noch|noch\s+immer)\s+|auf\s+einmal\s+)(?:(?:hinten|vorne|vorn|links|rechts|total|ganz|sehr|etwas|leicht|richtig|so|zu)\s+){0,2}(?:schief|tief)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))`, 'i', 1);
// Backlog 745: „Gangschaltung/Schalthebel hakt/klemmt“, „Gänge lassen sich schwer schalten“, „can't get into reverse“, „задня не вмикається“
const GEAR_HINT = lbRx(String.raw`(?<![а-яіїєґё])(?:вибива\S*|выбива\S*)\s+(?:\S+\s+)?передач\S*(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|полагодил\S*|починил\S*))|(?<![а-яіїєґё])передач\S*\s+(?:\S+\s+)?(?:вилітає|вилетіла|вылетает|вылетела|вискакує|выскакивает)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|полагодил\S*|починил\S*))|(?<![a-z-])(?:jump(?:s|ing|ed)?|pop(?:s|ping|ped)?|slip(?:s|ping|ped)?)\s+out\s+of\s+(?:gear|\d+(?:st|nd|rd|th))(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|sorted|no\s+longer))|(?:(?<![a-z])clutch\s+(?:won['’]?t|will\s+not|doesn['’]?t|does\s+not|not)\s+(?:disengag\S*|releas\S*)|(?<![а-яіїєґё])не\s+(?:включа\S*|вмика\S*)\s+(?:\S+\s+)?(?:передач\S*|скорост\S*))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![a-zäöüß-])kupplung(?:spedal)?\s+(?:(?:ist|geht|wird|l(?:ä|ae)sst\s+sich|sehr|total|extrem|so|zu|ganz|richtig|heute|immer|seit\s+\S+|mittlerweile|inzwischen|auf\s+einmal|pl(?:ö|oe)tzlich)\s+){0,3}(?:schwer|hart|stramm|schwerg(?:ä|ae)ngig)(?![a-zäöüß])(?!\s+(?:besch(?:ä|ae)digt|verletzt|kaputt|verbogen))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|freigeschaltet|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung|frei)|fixed|repaired|replaced|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))|(?<![a-z-])clutch(?:\s+pedal)?\s+(?:(?:is|feels|has\s+become|got|very|really|so|too|suddenly)\s+){0,3}(?:heavy|stiff|hard\s+to\s+(?:press|push))(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|freigeschaltet|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung|frei)|fixed|repaired|replaced|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))|(?<![а-яіїєґё])зчеплення\s+(?:\S+\s+){0,2}?(?:туге|важке|важко\s+вичавлюється)|(?<![а-яіїєґё])сцепление\s+(?:\S+\s+){0,2}?(?:тугое|тяж(?:е|[её])лое|тяжело\s+выжимается)|(?<![a-zäöüß])(?:getriebe|schaltgetriebe|automatikgetriebe|getriebesteuerung|schaltung|gangschaltung|schalthebel|ganghebel|g(?:ä|ae|a)nge|gang|r(?:ü|ue|u)ckw(?:ä|ae|a)rtsgang|vorw(?:ä|ae|a)rtsgang|kupplungspedal|kupplungsautomat|kupplungssteller)(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:schaltet\s+(?:\S+\s+)?(?:nicht|nicht\s+mehr|falsch|ständig)|geht\s+(?:\S+\s+)?schwer(?![a-zäöüß])|schwerg(?:ä|ae|a)ngig|bleibt\s+(?:\S+\s+)?unten|kommt\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:hoch|zur(?:ü|ue|u)ck)|geht\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:rein|herein|hinein|raus|heraus)|geht\s+nicht(?![a-zäöüß])|geht\s+nicht\s+mehr|l(?:ä|ae|a)ss(?:t|en)\s+sich\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:einlegen|schalten|treten)|l(?:ä|ae|a)ss(?:t|en)\s+sich\s+(?:\S+\s+)?(?:nur\s+)?schwer\s+(?:einlegen|schalten)|springt\s+(?:\S+\s+)?(?:raus|heraus)|hakt|klemmt|klemmen|kracht|knirscht|rutscht|fehler\S*|st(?:ö|oe|o)rung|defekt|kaputt|ausgefallen|f(?:ä|ae|a)llt\s+aus|bleibt\s+(?:\S+\s+)?(?:unten|stecken|h(?:ä|ae|a)ngen)|kommt\s+nicht\s+(?:mehr\s+)?(?:hoch|zur(?:ü|ue|u)ck))|(?<![a-zäöüß])(?:kupplung)(?![a-zäöüß])\s+(?:\S+\s+){0,2}?(?:rutscht|riecht|stinkt|trennt\s+nicht|greift\s+(?:\S+\s+)?(?:nicht|spät|spaet)|pedal\S*)|(?<![a-zäöüß])(?:getriebefehler|getriebest(?:ö|oe|o)rung|getriebeschaden|kein\s+gang|keinen\s+gang|neutralstellung|bleibt\s+(?:\S+\s+){0,2}?im\s+gang\s+h(?:ä|ae|a)ngen)(?![a-zäöüß])|(?<![a-z])(?<!landing\s)(?:gearbox|transmission|gear\s*shift|gears?|reverse\s+gear|clutch(?:\s+pedal)?)\s+(?:\S+\s+){0,3}?(?:fault|failure|failed|error|slipping|slips|stuck|won['’]?t\s+(?:engage|shift|go\s+in)|not\s+(?:engaging|shifting|working)|doesn['’]?t\s+(?:engage|shift|work)|grinding|jumps\s+out|broken)(?![a-z])|(?<![a-z])(?:can['’]?t|cannot|unable\s+to)\s+(?:\S+\s+)?(?:engage|select|shift\s+into|get\s+(?:it\s+)?into)\s+(?:a\s+|any\s+|the\s+)?(?:gear|reverse)(?![a-z])|(?<![а-яіїєґ])(?:коробк\S*|кпп|передач\S*|зчепленн\S*|сцеплени\S*|задн\S*\s+(?:хід|ход))\s+(?:\S+\s+){0,3}?(?:не\s+перемика\S*|не\s+переключа\S*|не\s+вмика\S*|не\s+включа\S*|буксу\S*|пробукс\S*|помилк\S*|ошибк\S*|не\s+працю\S*|не\s+работа\S*|заклин\S*|вилітає|вылетает|злама[вл]\S*|сломал\S*)|(?<![а-яіїєґ])(?:буксу|пробукс)\S*\s+(?:\S+\s+)?(?:зчепленн|сцеплени)\S*|(?<![а-яіїєґ])задн(?:я|яя|юю)\s+не\s+(?:вмика|включа)\S*|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-zäöüß-])getriebe(?![a-zäöüß])\s+(?:\S+\s+){0,2}?(?:heult|jault|pfeift|singt|brummt|knackt|kracht|macht\s+(?:(?:komische|laute|starke|seltsame)\s+)?ger(?:ä|ae)usche?)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-z-])(?:gearbox|transmission)\s+(?:\S+\s+){0,2}?(?:whin\S*|howl\S*|nois\S*|grind\S*|crunch\S*)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?:коробк\S*|кпп)(?:\s+передач)?\s+(?:\S+\s+){0,2}?(?:гуде|гудит|виє|воет|скрегоче|скрежещет|хрусти\S*|шумить|шумит)(?![а-яіїєґё])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])не\s+(?:перемика\S*|переключа\S*)\s+(?:\S+\s+)?(?:передач\S*|скорост\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?:передач\S*|скорост\S*)\s+не\s+(?:перемика\S*|переключа\S*|включа\S*|вмика\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?<![a-zäöüß-])kupplung(?:spedal)?(?![a-zäöüß])\s+(?:(?:kommt|greift|packt|fasst)\s+)(?:(?:erst|sehr|ganz|total|viel|zu|jetzt|immer|schon|extrem|richtig)\s+){0,3}(?:sp(?:ä|ae)t|oben|hoch)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|nachgestellt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|adjusted|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|відрегул\S*|отрегулир\S*))|(?<![a-z-])clutch\s+(?:pedal\s+)?(?:(?:is|has\s+started|started|now|really)\s+)?(?:bites|biting|engages|engaging|catches|catching|grabs|grabbing|takes\s+up)\s+(?:(?:very|really|too|quite|right|at|the|way)\s+){0,3}(?:high|late|top)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|nachgestellt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|adjusted|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|відрегул\S*|отрегулир\S*))|(?<![a-z-])clutch\s+pedal\s+(?:\S+\s+)?(?:stays|stuck|staying|remains)\s+(?:down|on\s+the\s+floor)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|nachgestellt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|adjusted|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|відрегул\S*|отрегулир\S*))|(?<![а-яіїєґё])(?:зчепленн\S*|сцеплени\S*)\s+(?:\S+\s+)?(?:бере|хапає|хватает|берет|схоплю\S*|схватыва\S*)\s+(?:\S+\s+)?(?:пізно|поздно|високо|высоко|вгорі|вверху)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|nachgestellt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|adjusted|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|відрегул\S*|отрегулир\S*))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-z-])(?<!landing\s)(?:gearbox|transmission|gear\s*(?:lever|stick|shift(?:er)?)|gearstick|gears)\s+(?:(?:keeps|keep|always|constantly|sometimes|often|now|still|is|are|has\s+been|have\s+been)\s+){0,2}(?:sticks|sticking|stick(?=\s*(?:$|[,.;!?]|in|when|while|between))|jams|jamming|jammed)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-z-])(?:gear\s*(?:lever|stick|shift(?:er)?)|gearstick)\s+(?:(?:is|feels|has\s+become|got|very|really|so|too|completely)\s+){0,2}(?:loose|wobbly|wobbles|wobbling)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-zäöüß-])(?:schalthebel|ganghebel|schaltknauf)(?![a-zäöüß])\s+(?:(?:ist|sehr|total|ganz|stark|etwas|zu)\s+){0,2}(?:locker|lose|wackelt|wackelig|abgebrochen)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?:коробк\S*(?:\s+передач)?|кпп|важіл\S*\s+(?:кпп|перемикання\s+передач|коробки)|важел\S*\s+(?:кпп|перемикання)|рычаг\S*\s+(?:кпп|переключения\s+передач|коробки))\s+(?:(?:постійно|постоянно|іноді|иногда|часто|весь\s+час|все\s+время)\s+)?(?:заїда\S*|заеда\S*|теліпа\S*|болта\S*|хита\S*|шата\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?<![a-zäöüß-])(?<!(?:auflieger|anh(?:ä|ae)nger|sattel|trailer)\S*\s+(?:\S+\s+){0,3})kupplung(?![a-zäöüß])\s+(?:(?:ist|sind|wohl|vermutlich|schon|jetzt|komplett|total|ganz|einfach|pl(?:ö|oe)tzlich)\s+){0,3}(?:kaputt|defekt|ausgefallen|geht\s+nicht|funktioniert\s+nicht)(?![a-zäöüß])(?![^.;!?]*(?:auflieger|anh(?:ä|ae)nger|sattel|k(?:ö|oe)nigszapfen|trailer|ab(?:ge)?kuppel|an(?:ge)?kuppel|auf(?:ge)?sattel|ab(?:ge)?sattel|repariert|erneuert|getauscht|ersetzt|behoben|gewechselt))`, 'i', 1);
// Backlog 344: „ремінь безпеки порвався/обірвався“ erkannt; Antriebsriemen („ремень генератора порвался“) gehört zum Motor-Hinweis, nicht hierher
const SEAT_HINT = lbRx(String.raw`(?<![a-zäöüß-])(?:sicherheits)?gurt(?![a-zäöüß])\s+(?:\S+\s+)?(?:klemmt|hakt|rollt\s+(?:\S+\s+)?nicht|rastet\s+(?:\S+\s+)?nicht)(?![^.;!?]*(?:ratsche|ladung|palette))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![a-zäöüß])(?:sicherheitsgurt(?:e|es)?|gurtschloss|gurtstraffer|gurtaufroller|fahrergurt|beifahrergurt|anschnallgurt|fahrersitz(?:es)?|beifahrersitz(?:es)?|sitzverstellung|sitzfederung|luftsitz|sitzkonsole|sitz(?:es)?)(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:defekt|kaputt|klemmt|blockiert|gerissen|eingerissen|ausgefranst|gebrochen|wackelt|locker|lose(?![a-zäöüß])|h(?:ä|ae|a)lt\s+nicht|rastet\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?ein|rollt\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:auf|zur(?:ü|ue|u)ck)|l(?:ä|ae|a)sst\s+sich\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:anlegen|einstecken|herausziehen|rausziehen|verstellen|feststellen|arretieren|schlie(?:ß|ss)en|(?:ö|oe|o)ffnen)|senkt\s+sich|verliert\s+(?:\S+\s+)?luft|sackt\s+(?:\S+\s+)?ab|verstellt\s+sich|geht\s+nicht(?![a-zäöüß])|funktioniert\s+nicht|ausgefallen)|(?<![a-zäöüß])(?:gurt)(?![a-zäöüß])\s+(?:\S+\s+){0,2}?(?:rastet\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?ein|rollt\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:auf|zur(?:ü|ue|u)ck)|l(?:ä|ae|a)sst\s+sich\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:anlegen|einstecken|herausziehen|rausziehen))|(?<![a-z])(?:seat\s*belts?|safety\s+belts?|belt\s+buckle|(?:driver['’]?s?\s+|passenger\s+)?seat)\s+(?:\S+\s+){0,3}?(?:losing\s+air|broken|faulty|stuck|jammed|torn|frayed|loose|wobbl\S*|won['’]?t\s+(?:latch|lock|buckle|retract|adjust|click)|doesn['’]?t\s+(?:latch|lock|retract|adjust|work)|not\s+(?:latching|locking|retracting|working)|keeps\s+(?:sinking|dropping|moving))(?![a-z])|(?<![а-яіїєґ])(?:ремін\S*\s+безпеки|ремен\S*\s+безопасности|(?<!(?:стяжн|вантажн|кріпильн|такелажн|багажн)\S*\s+)ремінь(?!\s+(?:генератор|вентилятор|привод|помп|грм|кріплен|креплен|вантаж|груз|стяжн))|(?<!(?:стяжн|грузов|крепежн|такелажн|багажн)\S*\s+)ремень(?!\s+(?:генератор|вентилятор|привод|помп|грм|кріплен|креплен|вантаж|груз|стяжн))|сидінн\S*|сидень\S*|сидень|сиденье|сиденья|крісл\S*|кресл\S*)\s+(?:\S+\s+){0,3}?(?:не\s+(?:\S+\s+)?(?:застіба\S*|застеги\S*|фіксу\S*|фиксир\S*|регулю\S*|регулиру\S*|працю\S*|работа\S*|змотує\S*|сматыва\S*)|злама[внл]\S*|сломан\S*|злама[вл]\S*|сломал\S*|порван\S*|порвал\S*|порвав\S*|обірва\S*|оборва\S*|розірв\S*|заклин\S*|заїда\S*|заеда\S*|хитає\S*|шатает\S*|провалю\S*|опуска\S*)|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-z-])(?:driver['’]?s?\s+)?seat\s+(?:\S+\s+)?(?:won['’]?t|will\s+not|doesn['’]?t|does\s+not)\s+(?:go\s+)?(?:up|down|move|adjust|raise|lower)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?:сидіння|сиденье|крісло|кресло)\s+(?:\S+\s+)?не\s+(?:піднімає\S*|підіймає\S*|опускає\S*|регулю\S*|поднимает\S*|опускает\S*|регулиру\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))`, 'i', 1);
// Backlog 351: auch Kilometerzähler/km-Anzeige („Kilometerzähler geht nicht“, „km-Zähler zählt nicht mehr“, „odometer not working“, „одометр не працює“)
// Backlog 771 (Sonde Hupe UK/RU): „гудок не работает/сломался“, „сигнал зламався“, „не працює сигнал/клаксон“ (umgestellt) → Armaturen-/Hupen-Schritte; „(не працює) сигнал поворотника (не працює)“, „стоп-сигнал“ nicht
const DASH_HINT = lbRx(String.raw`(?:(?<![a-zäöüß-])kilometerz(?:ä|ae)hler\s+(?:\S+\s+)?(?:steht(?!\s+(?:bei|auf)\s)|bleibt\s+stehen|z(?:ä|ae)hlt\s+nicht|geht\s+nicht|defekt|kaputt|spinnt)(?![a-zäöüß])|(?<![а-яіїєґё])(?:датчик|покажчик|указатель)\S*\s+(?:рівня\s+|уровня\s+)?(?:палива|пального|топлива)\s+(?:\S+\s+)?(?:не\s+працю\S*|не\s+работа\S*|бреше|врет|злама[внл]\S*|сломан\S*|показу\S*\s+неправильн\S*|показыва\S*\s+неправильн\S*))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![a-zäöüß-])(?<!(?:handy|tablet|navi|navigations|telefon|smartphone|radio|kamera)[\s-]?)(?:tankanzeige|tankuhr|kraftstoffanzeige|f(?:ü|ue)llstandsanzeige|kombiinstrument(?:e)?|instrumententafel|instrumentenbrett|armaturenbrett|armaturen|cockpit|display(?:s)?|bildschirm|tachoanzeige|kilometerz(?:ä|ae|a)hler|kilometeranzeige|km-z(?:ä|ae|a)hler|km-anzeige|kilometerstandsanzeige|geschwindigkeitsanzeige|tachonadel|tachometer(?:nadel|anzeige)?|drehzahlmesser|druckanzeige|druckanzeigen|manometer|hupe|signalhorn|horn)(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:ausgefallen|f(?:ä|ae|a)llt\s+(?:\S+\s+)?aus|schwarz|dunkel|zeigt\s+(?:\S+\s+)?(?:nichts|nix|kein\S*)|geht\s+nicht(?![a-zäöüß])|geht\s+nicht\s+mehr|geht\s+(?:\S+\s+)?aus|funktioniert\s+(?:\S+\s+)?nicht|defekt|kaputt|flackert|tot(?![a-zäöüß])|ohne\s+funktion|spinnt|bleibt\s+(?:\S+\s+)?(?:stehen|h(?:ä|ae|a)ngen|bei\s+null)|z(?:ä|ae|a)hlt\s+nicht(?:\s+mehr)?(?![a-zäöüß])|wird\s+nicht\s+(?:mehr\s+)?angezeigt)|(?<![a-z-])(?<!(?:phone|tablet|sat-?nav|radio)[\s-]?)(?:fuel\s+gauge|dashboard|dash|odometer|odo|mileage\s+counter|instrument\s+(?:cluster|panel)|display|screen|speedometer|speedo|pressure\s+gauges?|gauges?|horn)\s+(?:\S+\s+){0,3}?(?:dead|blank|black|went\s+out|is\s+out|not\s+working|isn['’]?t\s+working|doesn['’]?t\s+work|stopped\s+working|failed|faulty|broken|flicker\S*|shows\s+nothing|stuck\s+(?:at\s+)?(?:zero|0)|not\s+counting|stopped\s+counting)(?![a-z])|(?<![а-яіїєґ])(?:панел\S*\s+прилад\S*|приладов\S*\s+панел\S*|приборн\S*\s+панел\S*|дисплей\S*|екран\S*|экран\S*|спідометр\S*|спидометр\S*|одометр\S*|лічильник\S*\s+кілометр\S*|счетчик\S*\s+километр\S*|клаксон\S*|гудок|гудк[а-яіїєґ]*|(?<!стоп[- ]?)сигнал(?![а-яіїєґ])(?!\s+(?:поворот\S*|аварі\S*|авари\S*|габарит\S*)))\s+(?:\S+\s+){0,3}?(?:не\s+працю\S*|не\s+работа\S*|не\s+показу\S*|не\s+показыва\S*|згас\S*|погас\S*|чорн\S*|черн\S*|злама\S*|слома\S*|не\s+раху\S*|не\s+счита\S*)|(?<![а-яіїєґ])не\s+(?:працю\S*|работа\S*)\s+(?:звуков\S*\s+)?(?:клаксон\S*|гудок|гудк[а-яіїєґ]*|сигнал(?![а-яіїєґ])(?!\s+(?:\S+\s+)?(?:поворот\S*|стоп\S*|аварі\S*|авари\S*|задн\S*|заднь\S*|габарит\S*)))|(?<![a-zäöüß-])(?:hupe|signalhorn)\s+(?:\S+\s+){0,3}?(?:(?:h(?:ä|ae|a)ngt|klemmt)(?!\s+nicht)|h(?:ö|oe|o)rt\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?auf|geht\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?aus|l(?:ä|ae|a)sst\s+sich\s+nicht\s+(?:mehr\s+)?abstellen)(?![a-zäöüß])|(?<![a-zäöüß])hupt\s+(?:\S+\s+){0,2}?(?:von\s+selbst|allein|alleine|dauernd|st(?:ä|ae|a)ndig|ununterbrochen|ohne\s+grund)(?![a-zäöüß])|(?<![a-z-])horn\s+(?:\S+\s+){0,3}?(?:stuck|jammed|keeps\s+(?:sounding|honking|going\s+off|blaring)|sounds\s+(?:by\s+itself|on\s+its\s+own|constantly)|goes\s+off\s+(?:by\s+itself|on\s+its\s+own)|won['’]?t\s+stop|will\s+not\s+stop|does\s?n['’]?t\s+stop)(?![a-z])|(?<![а-яіїєґ])(?:клаксон\S*|гудок|гудк[а-яіїєґ]*|(?<!стоп[- ]?)сигнал(?![а-яіїєґ]))\s+(?:\S+\s+){0,3}?(?:заїло|заїв|заело|заклинило|залип\S*|сам\S*\s+(?:\S+\s+)?(?:гуд|сигнал|спрацьов|срабатыва|бібика|бибика)\S*|не\s+вимика\S*|не\s+выключа\S*|не\s+замовка\S*|не\s+замолка\S*|постійно\s+гуд\S*|постоянно\s+гуд\S*|гудить\s+постійно)|(?<![a-zäöüß-])(?:tankanzeige|tankuhr|kraftstoffanzeige|f(?:ü|ue)llstandsanzeige)(?![a-zäöüß])\s+(?:\S+\s+){0,2}?(?:zeigt\s+(?:\S+\s+){0,2}?falsch\S*|falsch(?![a-zäöüß])|springt)|(?<![a-z-])fuel\s+gauge\s+(?:\S+\s+){0,2}?(?:wrong|incorrect|inaccurate|jump\S*)|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-zäöüß-])(?:display|bildschirm|monitor)\s+(?:\S+\s+){0,2}?(?:h(?:ä|ae)ngt(?:\s+sich\s+auf)?|eingefroren|friert\s+(?:\S+\s+)?ein|bleibt\s+schwarz)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-z-])(?:dashboard\s+|dash\s+)?(?:screen|display)\s+(?:\S+\s+){0,2}?(?:frozen|freezes|freezing|keeps\s+freezing|stuck|hangs)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?:екран\S*|экран\S*|дисплей\S*|монітор\S*|монитор\S*)\s+(?:\S+\s+)?(?:завис\S*|зависа\S*|завіс\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))`, 'i', 1);
// Backlog 314 (Blickwinkel „Teil hängt herunter, schleift oder wurde unterwegs verloren“): Kotflügel/Unterfahrschutz/Auspuff/Verkleidung lose
// oder verloren → Hinweise (sicher anhalten, nicht mit losem Teil weiterfahren; verlorenes Teil auf der Fahrbahn: nicht selbst holen, Notruf; sichern nur
// abseits des Verkehrs, Leitung entscheidet; Fotos/Seite/Ort; Auswahl „Kann das Fahrzeug fahren?“) – reine Information, keine Frist. „Ersatzteil fehlt“,
// „Teile bestellt“, „Spiegel abgefahren“, „Plane abgerissen“, „Ladung verloren“, „Schlüssel verloren“, „Bremse schleift“, „parts missing“ lösen nichts aus.
// Backlog 744: Radlauf/Radlaufverkleidung/Radhausschale, „wheel arch (liner)“, „broke/broken/snapped off“, „підкрилок/подкрылок“, „відламалося/отломался“;
// „Kotflügel gebrochen“/„mudguard broken“ (ohne lose/ab) bleiben bewusst allgemein
const LOOSE_HINT = lbRx(String.raw`(?:(?<![a-z])side\s+skirts?\s+(?:\S+\s+)?(?:loose|hanging|dragging|ripped\s+off|torn\s+off|came\s+off|fell\s+off)|(?<![a-z])(?:roof\s+|cab\s+)?spoiler\s+(?:\S+\s+)?(?:ripped\s+off|torn\s+off|came\s+off|fell\s+off|loose|hanging)|(?<![а-яіїєґё])(?:спойлер|обтікач|обтекател)\S*\s+(?:\S+\s+)?(?:відірва\S*|оторва\S*|відвали\S*|отвали\S*|теля\S*|бовта\S*|звиса\S*))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![а-яіїєґё])(?:бічн\S*|боков\S*)\s+(?:захист\S*|защит\S*)\s+(?:\S+\s+)?(?:відірва\S*|оторва\S*|відвали\S*|отвали\S*|звиса\S*|свиса\S*|теля\S*|бовта\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![a-zäöüß])(?:kühlergrill|kuehlergrill|frontgrill|grill|frontschürze|frontschuerze|frontklappe|frontmaske|kotfl(?:ü|ue|u)gel|schmutzf(?:ä|ae|a)nger|spritzschutz|spritzlappen|unterfahrschutz|seitenschutz|seitenverkleidung|verkleidung|sto(?:ß|ss)stange|sto(?:ß|ss)f(?:ä|ae|a)nger|auspuff|auspuffrohr|endtopf|trittstufe|trittbrett|staukasten|werkzeugkasten|palettenkasten|reserveradhalter|ersatzradhalter|ersatzrad|reserverad|radkappe|radzierblende|dachspoiler|seitenspoiler|frontspoiler|spoiler|windleitblech|windabweiser|radlauf|radlaufverkleidung|radlaufabdeckung|radhausschale|radhausverkleidung|kennzeichenhalter|kennzeichen|teil|teile|abdeckung|blech)(?:e|en|n|s|es)?\s+(?:\S+\s+){0,3}?(?:(?:h(?:ä|ae|a)ngt|h(?:ä|ae|a)ngen)\s+(?:\S+\s+)?(?:herunter|runter|herab|lose|schief)(?![a-zäöüß])|(?:h(?:ä|ae|a)ngt|h(?:ä|ae|a)ngen)(?=\s*(?:$|[.,;!?\n]))|(?:ist|sind)\s+(?:\S+\s+)?lose(?![a-zäöüß])|abgerissen|abgefallen|verloren|weggeflogen|abgebrochen|schleift|schleifen|klappert|klappern|wackelt|wackeln|losgerissen|lose(?![a-zäöüß])|locker(?![a-zäöüß]))|(?<![a-zäöüß-])(?:schmutzf(?:ä|ae|a)nger|spritzschutz|spritzlappen|kotfl(?:ü|ue|u)gel|radkappe|radlauf|radlaufabdeckung|radhausschale)(?:e|en|n|s|es)?\s+(?:\S+\s+){0,2}?(?:fehlt|fehlen)(?![a-zäöüß])|(?<![a-z-])(?:mud\s*flaps?|mudguards?|splash\s+guards?|hub\s*caps?)\s+(?:\S+\s+){0,2}?missing(?![a-z])|(?<![а-яіїєґ])(?:бризковик|бризговик|брызговик)\S*\s+(?:\S+\s+)?(?:відсутн|отсутств|нема)\S*|(?<![a-zäöüß])(?:verliert|verlor|verloren|lose[rsn]?|herunterh(?:ä|ae|a)ngende[rsnm]?|abgerissene[rsnm]?|abgefallene[rsnm]?)\s+(?:\S+\s+){0,2}?(?:kotfl(?:ü|ue|u)gel|schmutzf(?:ä|ae|a)nger|unterfahrschutz|seitenschutz|seitenverkleidung|verkleidung|sto(?:ß|ss)stange|sto(?:ß|ss)f(?:ä|ae|a)nger|auspuff|auspuffrohr|endtopf|trittstufe|trittbrett|staukasten|werkzeugkasten|palettenkasten|reserveradhalter|ersatzrad|reserverad|radkappe|radzierblende|dachspoiler|seitenspoiler|frontspoiler|spoiler|windleitblech|windabweiser|radlauf|radlaufverkleidung|radlaufabdeckung|radhausschale|radhausverkleidung|kennzeichenhalter|kennzeichen|teil|teile|abdeckung|blech)(?:e|en|n|s|es)?(?![a-zäöüß])|(?<![a-z])(?:grilles?|mudguards?|mud\s*flaps?|fenders?|bumpers?|side\s+guards?|underrun\s+(?:guard|bar)s?|exhaust(?:\s+pipe)?|panels?|trim|steps?|spare\s+wheel(?:\s+carrier)?|wheel\s+arch(?:es)?(?:\s+(?:liners?|trims?|covers?))?|parts?|covers?|number\s+plates?|licen[cs]e\s+plates?)\s+(?:\S+\s+){0,3}?(?:hanging|hangs|loose|came\s+off|come\s+off|fell\s+off|falling\s+off|dragging|ripped\s+off|torn\s+off|broke\s+off|broken\s+off|snapped\s+off|rattling|flapping)(?![a-z])|(?<![a-z])(?:lost|dropped)\s+(?:a\s+|the\s+|some\s+|my\s+)?(?:part|parts|mudguard|mud\s*flap|bumper|panel|exhaust|spare\s+wheel|number\s+plate)(?![a-z])|(?<![а-яіїєґ])(?:решітк|решетк|крил|підкрил|подкрыл|бризковик|бризговик|брызговик|бампер|відбійник|глушник|глушител|кожух|обшивк|детал|запаск|номерн)\S*\s+(?:\S+\s+){0,3}?(?:відірва|оторва|відлама|отлома|відпа|отпа|відвали|отвали|звиса|висить|висит|бовтає|болтает|загуби|потерял|втрати|тягнеться|волочит|теліпа)\S*|(?<![а-яіїєґ])(?:відірва|оторва|відпа|отпа|відвали|отвали|звиса|висить|висит|бовтає|болтает|теліпа)\S*\s+(?:\S+\s+)?(?:решітк|решетк|крил|бризковик|бризговик|брызговик|бампер|відбійник|глушник|глушител|кожух|обшивк|запаск|номерн)\S*|(?<![а-яіїєґ])(?:загубив|загубила|втратив|втратила|потерял|потеряла)\s+(?:\S+\s+){0,2}?(?:крил|бризковик|бризговик|брызговик|бампер|глушник|глушител|детал|запаск|номер)\S*|(?<![a-zäöüß-])(?:trittstufe|trittbrett|aufstiegstritt|einstiegstritt|aufstiegsstufe|einstiegsstufe|aufstiegshilfe|haltegriff|einstiegsgriff|griffstange)(?:n|e|en|s|es)?\s+(?:\S+\s+){0,3}?(?:lose|locker|wackelt|abgebrochen|abgerissen|gebrochen|kaputt|defekt|fehlt)(?![a-zäöüß])(?!\s+(?:\S+\s+)?(?:wieder|repariert|behoben))|(?<![a-z-])(?:(?:cab|entry|access|boarding|ladder)\s+steps?|grab\s+(?:handles?|rails?)|handrails?|hand\s+rails?)\s+(?:\S+\s+){0,2}?(?:loose|broken|snapped|missing|cracked|wobbly|came\s+off)(?![a-z])|(?<![а-яіїєґ])(?:сходинк|підніжк|подножк|поручн|поручен|поручень)\S*\s+(?:\S+\s+)?(?:відлама|отлома|злама|слома|розхита|шата|відпа|отпа|відірва|оторва)\S*|(?<![a-zäöüß-])schneeketten?\s+(?:\S+\s+){0,3}?(?:gerissen|abgesprungen|abgerutscht|abgefallen|verloren|schl(?:ä|ae|a)gt|schleift|kaputt)(?![a-zäöüß])|(?<![a-z-])snow\s+chains?\s+(?:\S+\s+){0,2}?(?:broke|broken|snapped|came\s+off|fell\s+off|lost|slipped\s+off)(?![a-z])|(?<![а-яіїєґ])(?:ланцюг|цеп)\S*\s+(?:протиковзанн|противоскольжен|на\s+колес)\S*\s+(?:\S+\s+)?(?:порва|розірва|злете|зіскоч|соскоч|загуби|потеря|злама|слома)\S*`, 'i', 1);
// Backlog 313 (Blickwinkel „Heizung/Gebläse/Scheibenwischer fällt aus, Scheibe beschlägt oder vereist“): eingeschränkte Sicht im Winter → Hinweise
// (nicht mit Guckloch weiterfahren, sicher anhalten; Scheiben frei machen ohne heißes Wasser; Leitung entscheidet; was genau ausfällt + Foto;
// Auswahl „Kann das Fahrzeug fahren?“) – reine Information, keine Frist, keine Temperaturangabe. „Standheizung startet nicht“, „Sitzheizung defekt“,
// „Heizungsrohr beim Kunden kaputt“, „Bremsscheibe vereist“, „Scheinwerfer beschlagen“, „parking heater not working“, „engine fan broken“ lösen nichts aus
const VISIB_HINT = lbRx(String.raw`(?<![a-z-])(?:wipers?|wiper\s+motor|washers?|screen\s*wash)\s+(?:(?:has|have|just|completely)\s+){0,2}(?:packed\s+(?:in|up)|gave\s+up|given\s+up|stopped\s+working|not\s+(?:squirting|spraying))(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|sorted|no\s+longer))|(?<![a-zäöüß])(?:fahrerhaus|kabinen|front|scheiben|frontscheiben|spiegel)?(?:heizung|lüftung|lueftung|gebläse|geblaese|defroster)(?:en)?(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:ausgefallen|fällt\s+aus|faellt\s+aus|geht\s+nicht|funktioniert\s+nicht|defekt|kaputt|bläst\s+nicht|blaest\s+nicht|heizt\s+nicht|wird\s+nicht\s+(?:mehr\s+)?warm|bleibt\s+kalt|bl(?:ä|ae)st\s+(?:nur\s+)?kalt)|(?<![a-zäöüß])(?:windschutzscheibe|frontscheibe|seitenscheibe|heckscheibe|scheibe|scheiben|fenster)n?\s+(?:\S+\s+){0,3}?(?:beschlagen|beschl(?:ä|ae|a)gt|beschlagt|vereist|vereisen|zugefroren|friert\s+(?:\S+\s+)?zu|frieren\s+(?:\S+\s+)?zu)(?![a-zäöüß])|(?:beschlagene|vereiste|zugefrorene)[nmrs]?\s+(?:\S+\s+)?(?:windschutzscheibe|frontscheibe|seitenscheibe|scheibe|scheiben|fenster)|(?<![a-zäöüß])(?:scheiben)?wischer(?:n|blätter|blaetter|blatt|blattes|gummi|gummis|motor|arm)?\s+(?:\S+\s+){0,3}?(?:gerissen|eingerissen|lose|locker|ausgefallen|fällt\s+aus|faellt\s+aus|fallen\s+aus|geht\s+nicht|gehen\s+nicht|funktioniert\s+nicht|funktionieren\s+nicht|defekt|kaputt|bleibt\s+stehen|bleiben\s+stehen|wischt\s+nicht|wischen\s+nicht|schmiert|schmieren|quietscht|quietschen|rattert|rattern|(?:zieht|ziehen|macht|machen|hinterl(?:ä|ae|a)sst|hinterlassen)\s+(?:\S+\s+)?streifen|festgefroren|eingefroren|abgebrochen)|(?<![a-zäöüß])(?:wischwasser|waschwasser|scheibenwaschanlage|scheibenwaschwasser|scheibenreiniger|waschanlage\s+der\s+scheibe)\s+(?:\S+\s+){0,3}?(?:leer|gefroren|eingefroren|geht\s+nicht|kommt\s+nicht|funktioniert\s+nicht|defekt|kaputt)|(?<![a-z])(?<!(?:parking|night|seat|engine|cooling|radiator|reefer|fridge)\s)(?:(?:cab\s+)?(?:heater|heating|blower|fan|defroster|demister|de-mister)|heated\s+(?:wing\s+|side\s+|door\s+)?mirrors?|mirror\s+heat(?:ing|er)s?)\s+(?:\S+\s+){0,3}?(?:not\s+working|doesn['’]?t\s+work|isn['’]?t\s+working|broken|failed|stopped|dead|out(?![a-z]))|(?<![a-z])(?:windscreen|windshield|windows?|glass)\s+(?:\S+\s+){0,3}?(?:fogged|fogging|fogs|misted|misting|mists|steamed|steaming|iced|icing|icy|frozen|frosted)(?![a-z])|(?:fogged|misted|steamed|iced|frozen|frosted)[\s-]+(?:up\s+)?(?:windscreen|windshield|windows?)|(?<![a-z])(?:windscreen\s+|windshield\s+)?(?:wipers?|wiper\s+blades?|washer\s+fluid|washers?|screen\s*wash)\s+(?:\S+\s+){0,3}?(?:not\s+working|doesn['’]?t\s+work|don['’]?t\s+work|isn['’]?t\s+working|aren['’]?t\s+working|broken|failed|stopped|frozen|empty|dead|squeak\S*|squeal\S*|streak\S*|smear\S*|leav\S*\s+(?:\S+\s+)?streaks)|(?<![а-яіїєґ])(?:пічк|печк|обігрів|обогрев|опаленн|отоплени|обдув|підігрів\S*\s+дзеркал|подогрев\S*\s+зеркал)\S*\s+(?:\S+\s+){0,3}?(?:не\s+працю\S*|не\s+работа\S*|злама[внл]\S*|сломал\S*|сломан\S*|несправн\S*|неисправ\S*|не\s+гріє|не\s+греет|не\s+дме|не\s+дует)|(?<![а-яіїєґ])(?:скл[оаіу]|стекл[оаеу]|лобов\S*)\S*\s+(?:\S+\s+){0,3}?(?:запотіл\S*|запотел\S*|запотіва\S*|запотева\S*|пітні\S*|замерзл\S*|обмерзл\S*|заледені\S*|обледене\S*)|(?<![а-яіїєґ])(?:двірник|дворник|склоочисник|стеклоочистител|омивач|омыват|незамерзайк)\S*\s+(?:\S+\s+){0,3}?(?:не\s+працю\S*|не\s+работа\S*|злама[вл]\S*|сломал\S*|замерз\S*|закінчил\S*|закончил\S*|скрип\S*|скрегоч\S*|маж\S*|розмазу\S*|размазыва\S*)|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-z])(?<!(?:parking|night|seat|engine)\s)(?:cab\s+)?heater\s+(?:\S+\s+){0,2}?(?:blow(?:s|ing)?\s+(?:only\s+)?cold|only\s+blows\s+cold)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?:пічк|печк|обігрів|обогрев)\S*\s+(?:\S+\s+)?(?:дує|дует)\s+(?:\S+\s+)?холодн\S*(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-zäöüß-])(?:scheiben)?(?:wasch|wisch)(?:anlage|d(?:ü|ue)sen?|wasserpumpe)\s+(?:\S+\s+){0,2}?(?:spritzt|spr(?:ü|ue)ht|pumpt|geht|funktioniert)\s+(?:\S+\s+)?nicht(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-zäöüß-])(?:wasch|wisch)d(?:ü|ue)sen?\s+(?:\S+\s+)?(?:verstopft|eingefroren|zugefroren)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-z-])(?:screen\s*)?wash(?:er)?\s+(?:jets?\s+|pump\s+|nozzles?\s+)?(?:not\s+spraying|won['’]?t\s+spray|blocked|frozen|not\s+working)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?<![а-яіїєґё])(?:вікн\S*|окн\S*)\s+(?:\S+\s+)?(?:запотіва\S*|запотева\S*|запотіл\S*|запотел\S*|пітні\S*|потіють|потеют)(?![а-яіїєґё])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?<![a-z-])(?:windows?|side\s+windows?|glass)\s+(?:keeps?\s+|are\s+|is\s+|always\s+)?(?:steam\S*|fog\S*|mist\S*)\s+up(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))`, 'i', 1);
// Backlog 325 (Blickwinkel „Auspuff laut/undicht, Abgase im Fahrerhaus“): Hinweise (Abgasgeruch: Fenster auf, anhalten, Motor/Standheizung aus,
// frische Luft, bei Unwohlsein Notruf; Leitung entscheidet, an der heißen Abgasanlage nichts selbst; Fotos/Geruch/seit wann; Auswahl „Kann das Fahrzeug
// fahren?“) – reine Information, keine Frist. „Auspuff abgerissen“ bleibt beim Hinweis „Teil hängt/verloren“, „Auspuff qualmt“ beim Brand-Hinweis;
// „Auspuff laut Rechnung getauscht“, „Abgasuntersuchung“, „exhaust brake noisy“ lösen nichts aus
const EXHAUST_HINT = lbRx(String.raw`(?<![а-яіїєґё])(?:глушник\S*|глушител\S*|вихлоп\S*|выхлоп\S*)\s+(?:\S+\s+)?(?:гуркоч\S*|гуркотить|гучно|громко|реве|ревет|гуде|гудит|тарахт\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![a-z-])exhaust\s+(?:smell|fumes|gas(?:es)?|odou?r)\s+(?:\S+\s+){0,2}?(?:in|inside|into)\s+(?:the\s+)?(?:cab|cabin)(?![a-z])|(?<![a-zäöüß])(?:auspuff|auspuffanlage|auspuffrohr|abgasanlage|abgasrohr|endtopf|schalld(?:ä|ae|a)mpfer|abgaskr(?:ü|ue|u)mmer|kr(?:ü|ue|u)mmer)(?:s|es)?(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:(?:sehr\s+)?laut(?:er)?(?=\s*(?:$|[.,!;]|geworden|und|als|beim|bei|seit|wie|w(?:ä|ae|a)hrend))|dr(?:ö|oe|o)hnt|knattert|zischt|pfeift|undicht|leck(?![a-zäöüß])|hat\s+(?:\S+\s+)?loch|durchgerostet|gerissen|rissig|bl(?:ä|ae|a)st\s+ab)|(?<![a-zäöüß])(?:abgase?|abgasgeruch|abgasgestank|auspuffgase?)\s+(?:\S+\s+){0,3}?(?:im|in\s+der|in\s+die|ins)\s+(?:fahrerhaus|f(?:ü|ue|u)hrerhaus|kabine|cockpit)(?![a-zäöüß])|(?<![a-zäöüß])(?:riecht|riechts|stinkt|roch)\s+(?:\S+\s+){0,4}?nach\s+(?:abgas(?:en)?|auspuff(?:gasen)?)(?![a-zäöüß])|(?<![a-z])(?:exhaust(?:\s+(?:pipe|system|manifold))?|muffler|silencer)(?!\s+brake)\s+(?:\S+\s+){0,3}?(?:(?:very\s+)?loud|noisy|blowing|leak\S*|has\s+(?:a\s+)?hole|holed|roar\S*|cracked|rusted\s+through|hiss\S*)(?![a-z])|(?<![a-z])(?:exhaust\s+)?fumes\s+(?:\S+\s+){0,3}?(?:in|into|inside)\s+(?:the\s+)?(?:cab|cabin)(?![a-z])|(?<![a-z])(?:smell\S*|stink\S*|reek\S*)\s+(?:\S+\s+){0,3}?(?:of\s+)?exhaust(?![a-z])|(?<![а-яіїєґ])(?:вихлоп\S*|выхлоп\S*|глушник\S*|глушител\S*)\s+(?:\S+\s+){0,3}?(?:гучн\S*|громк\S*|гуде\S*|гудит|реве\S*|ревет|тріснув\S*|треснул\S*|дірк\S*|дыр\S*|пропуска\S*|прогорі\S*|прогорел\S*)|(?<![а-яіїєґ])(?:запах\S*|смердить|воняє|воняет|пахне|пахнет)\s+(?:\S+\s+){0,3}?(?:вихлоп\S*|выхлоп\S*)|(?<![а-яіїєґ])(?:вихлопн\S*\s+газ\S*|выхлопн\S*\s+газ\S*)\s+(?:\S+\s+){0,2}?(?:в|у)\s+(?:кабін\S*|кабин\S*)`, 'i', 1);
// Backlog 326 (Blickwinkel „Fahrerhaus lässt sich nicht kippen oder ist nicht verriegelt“): Hinweise (nicht verriegelt: nicht losfahren/anhalten;
// halb gekippt: nicht darunter greifen, Gefahrenbereich frei; Leitung entscheidet, Kipppumpe/Verriegelung nicht selbst; Fotos/Stellung/Öl; Auswahl „Kann
// das Fahrzeug fahren?“) – reine Information, keine Frist. „Kippbrücke geht nicht hoch“, „Kipper kippt nicht“, „Fahrerhaustür lässt sich nicht verriegeln“,
// „cab door won't lock“ lösen nichts aus
const CABTILT_HINT = lbRx(String.raw`(?<![a-zäöüß])(?:fahrerhaus|f(?:ü|ue|u)hrerhaus|fahrerkabine|kabine)(?:es|s)?(?![a-zäöüß])(?!\s+(?:\S+\s+)?(?:t(?:ü|ue|u)r|t(?:ü|ue|u)re|t(?:ü|ue|u)ren|fenster|heizung|licht|beleuchtung|schloss|schl(?:ü|ue|u)ssel)(?![a-zäöüß]))\s+(?:\S+\s+){0,3}?(?:l(?:ä|ae|a)sst\s+sich\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:kippen|ankippen|hochkippen|zur(?:ü|ue|u)ckkippen|herunterlassen|runterlassen|absenken|verriegeln)|kippt\s+(?:\S+\s+)?nicht|geht\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:hoch|runter|nach\s+unten|zur(?:ü|ue|u)ck)(?![a-zäöüß])|nicht\s+(?:richtig\s+|ganz\s+)?verriegelt|unverriegelt|rastet\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?ein|bleibt\s+(?:\S+\s+)?(?:halb\s+)?(?:oben|gekippt|hochgekippt|in\s+der\s+luft))|(?<![a-zäöüß])(?:kippvorrichtung|kipppumpe|kippzylinder|fahrerhauskippung|fahrerhausverriegelung|kabinenverriegelung|kabinenkippung|kipphydraulik)(?:en)?(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:defekt|kaputt|undicht|klemmt|geht\s+nicht|funktioniert\s+(?:\S+\s+)?nicht|ausgefallen|fehler\S*|st(?:ö|oe|o)rung|offen(?![a-zäöüß])|verliert\s+(?:\S+\s+)?(?:(?:ö|oe|o)l|druck))|(?<![a-z])(?:cab|cabin)(?![a-z])(?!\s+(?:\S+\s+)?(?:doors?|windows?|lights?|heater|heating|keys?|locks?)(?![a-z]))\s+(?:\S+\s+){0,3}?(?:won['’]?t\s+(?:tilt|lower|go\s+(?:back\s+)?(?:up|down)|lock|latch)|will\s+not\s+(?:tilt|lower|lock|latch)|doesn['’]?t\s+(?:tilt|lower|lock|latch)|not\s+(?:tilting|locked|latched|lowering)|unlocked|unlatched|stuck\s+(?:half[-\s]?)?(?:up|tilted|raised|open))|(?<![a-z])(?:cab[-\s]?tilt(?:ing)?\s+(?:pump|mechanism|system|cylinder|ram)|cab\s+(?:lock|latch|locking))\s+(?:\S+\s+){0,3}?(?:broken|faulty|failed|fault|leak\S*|not\s+working|doesn['’]?t\s+work|open|stuck|error)(?![a-z])|(?<![а-яіїєґ])(?:кабін\S*|кабин\S*)\s+(?:\S+\s+){0,3}?(?:не\s+(?:\S+\s+)?(?:перекида\S*|опрокид\S*|відкида\S*|откидыва\S*|підійма\S*|поднима\S*|опуска\S*|фіксу\S*|фиксир\S*)|не\s+зафіксован\S*|не\s+зафиксирован\S*|застрягл\S*|застряла|зависл\S*)|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?:кабін\S*|кабин\S*)\s+не\s+(?:піднімається|поднимается|відкидається|откидывается|опускається|опускается)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))`, 'i', 1);
// Backlog 327 (Blickwinkel „Diesel versulzt oder AdBlue eingefroren“, Wintereinbruch): Hinweise (sicher abstellen, nicht dauernd neu starten;
// kein offenes Feuer/Heißluft, keine Zusätze ohne Freigabe; Leitung entscheidet; Tankort/AdBlue-Warnung/Standzeit notieren; Auswahl „Kann das Fahrzeug
// fahren?“) – reine Information, keine Frist, keine Temperaturangabe. „Diesel getankt“, „Scheibe eingefroren“, „Wischwasser gefroren“, „Tiefkühlware
// gefroren“, „Diesel ausgelaufen“ lösen nichts aus
const GELFUEL_HINT = lbRx(String.raw`(?<![a-zäöüß-])(?:diesel|dieselkraftstoff|kraftstoff|sprit|treibstoff|adblue|ad-blue|harnstoff|harnstoffl(?:ö|oe|o)sung|kraftstofffilter|dieselfilter|kraftstoffleitung(?:en)?|dieselleitung(?:en)?|adblue-leitung(?:en)?|adblue-tank|adbluetank)(?![a-zäöüß-])\s+(?:\S+\s+){0,3}?(?:versulzt|eingefroren|gefroren|zugefroren|geliert|ausgeflockt|eingedickt|flockt\s+(?:\S+\s+)?aus|friert\s+(?:\S+\s+)?ein|friert(?![a-zäöüß])|dick\s+geworden|wird\s+(?:\S+\s+)?dick)(?![a-zäöüß])|(?<![a-zäöüß])(?:versulzt|eingefroren|gefroren|zugefroren|geliert|ausgeflockt|eingedickt)(?:e|er|es|en|em)?\s+(?:\S+\s+)?(?:diesel|dieselkraftstoff|kraftstoff|adblue|ad-blue|harnstoff|kraftstofffilter|dieselfilter|kraftstoffleitung(?:en)?|dieselleitung(?:en)?)(?![a-zäöüß])|(?<![a-z])(?:diesel|fuel|adblue|ad\s*blue|diesel\s+exhaust\s+fluid|fuel\s+filter|fuel\s+lines?)\s+(?:\S+\s+){0,3}?(?:gelled|gelling|gelled\s+up|gel(?![a-z])|waxed|waxing|frozen|froze|freezing|turned\s+to\s+gel)(?![a-z])|(?<![a-z])(?:frozen|gelled|waxed)\s+(?:up\s+)?(?:diesel|fuel|adblue|ad\s*blue|fuel\s+filter|fuel\s+lines?)(?![a-z])|(?<![а-яіїєґ])(?:дизел\S*|солярк\S*|паливо|палива|пальне|пального|топливо|топлива|adblue|адблю|сечовин\S*|мочевин\S*|(?:паливн|топливн)\S*\s+(?:фільтр|фильтр)\S*)\s+(?:\S+\s+){0,3}?(?:замерз\S*|застиг\S*|загус\S*|загуст\S*|парафін\S*|парафин\S*|кристаліз\S*|кристаллиз\S*)`, 'i', 1);
// Backlog 747 (Blickwinkel „Kraftstoff ausgegangen, Tank leergefahren“): Fahrzeug bleibt ohne Diesel liegen → eigene Schritte (absichern,
// nicht dauernd starten, Kraftstoffanlage ggf. entlüften, Leitung anrufen, nur nach Freigabe mit Kanister nachfüllen, auffällig schneller Verbrauch →
// Diebstahl/Leck, Standort/letztes Tanken notieren, Auswahl „Kann das Fahrzeug fahren?“) – keine Zahl, keine Frist. „Wassertank/AdBlue-Tank leer“,
// „Tank leer gemacht“, „Diesel getankt“, „Dieselgeruch“, „Tankanzeige“ allein, „out of fuel card“, „leer gefahren“ (Leerfahrt ohne Ladung) lösen nichts aus.
const DRYFUEL_HINT = lbRx(String.raw`(?<![a-zäöüß-])(?<!(?:adblue|ad-blue|harnstoff|wasser|wischwasser)\s)(?:tank|tanks|dieseltank|kraftstofftank|haupttank)\s+(?:(?:ist|war|komplett|ganz|v(?:ö|oe)llig|total|leider|jetzt|schon|fast)\s+){0,2}(?:leer(?![a-zäöüß])(?!\s+(?:gemacht|gepumpt|ger(?:ä|ae)umt|abgelassen))|leer\s?gefahren|trocken\s?gefahren)|(?<![a-zäöüß-])(?:tank|dieseltank|kraftstofftank)\s+(?:\S+\s+){1,3}?(?:leer|trocken)\s?gefahren(?![a-zäöüß])|(?<![a-zäöüß-])(?:diesel|kraftstoff|sprit)\s+(?:(?:komplett|ganz|v(?:ö|oe)llig)\s+)?(?:leer|trocken)\s?gefahren(?![a-zäöüß])|(?<![a-zäöüß-])(?:kein|keinen|ohne)\s+(?:diesel|kraftstoff|sprit|treibstoff|benzin)\s+mehr(?![a-zäöüß])|(?<![a-zäöüß-])ohne\s+(?:diesel|kraftstoff|sprit|treibstoff)\s+(?:\S+\s+){0,2}?(?:liegen\s?geblieben|stehen\s?geblieben)|(?<![a-zäöüß-])(?:diesel|kraftstoff|sprit|treibstoff)\s+(?:ist\s+|war\s+)?(?:alle|ausgegangen|zu\s+ende|aufgebraucht)(?![a-zäöüß])(?!\s+getankt)|(?<![a-z])(?:ran|run|running|runs)\s+out\s+of\s+(?:fuel|diesel|petrol|gas)(?![a-z])|(?<![a-z])out\s+of\s+(?:fuel|diesel)(?![a-z])(?!\s+cards?)|(?<![a-z])(?:ran|run|running)\s+(?:\S+\s+)?dry(?![a-z])|(?<![a-z])(?:fuel|diesel)\s+tank\s+(?:is\s+|was\s+)?(?:empty|dry)(?![a-z])|(?<![a-z])no\s+(?:fuel|diesel)\s+left(?![a-z])|(?<![а-яіїєґ])(?:скінчил\S*|закінчил\S*|кончил\S*|закончил\S*)\s+(?:\S+\s+)?(?:пальне|паливо|солярк\S*|дизел\S*|топливо|бензин)(?![а-яіїєґ])|(?<![а-яіїєґ])(?:пальне|паливо|солярк\S*|дизел\S*|топливо)\s+(?:\S+\s+)?(?:скінчил\S*|закінчил\S*|кончил\S*|закончил\S*)|(?<![а-яіїєґ])(?:немає|нема|нет)\s+(?:\S+\s+)?(?:пального|палива|солярки|дизеля|топлива)(?![а-яіїєґ])|(?<![а-яіїєґ])(?:паливний\s+|топливный\s+)?бак\s+(?:\S+\s+)?(?:порожн\S*|пуст\S*)`, 'i', 1);
// Backlog 328 (Blickwinkel „Warndreieck, Verbandkasten, Feuerlöscher oder Unterlegkeil fehlt bzw. abgelaufen“): Hinweise (vor Abfahrt Leitung
// anrufen, sie entscheidet über Ersatz/Stehenbleiben; Gefahrgut nur mit vollständiger Ausrüstung; nichts unbemerkt aus anderem Fahrzeug nehmen; was fehlt/
// Prüfdatum/Foto; Auswahl „Kann das Fahrzeug fahren?“) – reine Information, keine Frist, keine Vorschrift mit Paragraf. „Warnleuchte leuchtet“ (Kontroll-
// leuchte), „Warndreieck aufgestellt“, „Verbandskasten geprüft“ lösen nichts aus
const SAFETYKIT_HINT = lbRx(String.raw`(?<![a-zäöüß-])(?:warndreieck|warnweste(?:n)?|verbandkasten|verbandskasten|verbandk(?:ä|ae|a)sten|erste-hilfe-kasten|feuerl(?:ö|oe|o)scher|unterlegkeil(?:e)?|radkeil(?:e)?|bordwerkzeug|wagenheber)(?:s|es)?(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:fehlt|fehlen|weg(?![a-zäöüß])|verschwunden|verloren|liegen\s+gelassen|liegengelassen|nicht\s+(?:mehr\s+)?(?:da|vorhanden|an\s+bord|im\s+fahrzeug|im\s+lkw)(?![a-zäöüß])|abgelaufen|leer(?![a-zäöüß])|benutzt|ausgel(?:ö|oe|o)st|kaputt|defekt|besch(?:ä|ae|a)digt|unvollst(?:ä|ae|a)ndig)|(?<![a-zäöüß-])(?:warnleuchte|warnlampe)\s+(?:\S+\s+){0,2}?(?:fehlt|weg(?![a-zäöüß])|nicht\s+(?:mehr\s+)?(?:da|vorhanden|an\s+bord)(?![a-zäöüß]))|(?<![a-zäöüß])(?:kein|keine|keinen)\s+(?:warndreieck|warnweste|verband\S*kasten|erste-hilfe-kasten|feuerl(?:ö|oe|o)scher|unterlegkeil\S*|radkeil\S*)(?![a-zäöüß])|(?<![a-z])(?:warning\s+triangle|hi-?vis(?:\s+(?:vest|jacket))?|high[-\s]visibility\s+(?:vest|jacket)|safety\s+vest|first[-\s]aid\s+kit|fire\s+extinguisher|wheel\s+chocks?|chocks)\s+(?:\S+\s+){0,3}?(?:missing|gone|lost|left\s+behind|not\s+(?:there|on\s+board|in\s+the\s+(?:cab|truck|vehicle))|expired|out\s+of\s+date|empty|used|discharged|damaged|broken|incomplete)(?![a-z])|(?<![a-z])(?:no|missing)\s+(?:warning\s+triangle|first[-\s]aid\s+kit|fire\s+extinguisher|wheel\s+chocks?|hi-?vis\s+(?:vest|jacket))(?![a-z])|(?<![а-яіїєґ])(?:знак\S*\s+аварійн\S*\s+зупинк\S*|аварійн\S*\s+знак\S*|аварийн\S*\s+знак\S*|знак\S*\s+аварийн\S*|аптечк\S*|вогнегасник\S*|огнетушител\S*|жилет\S*|противідкатн\S*|противооткатн\S*)\s+(?:\S+\s+){0,3}?(?:нема\S*|відсутн\S*|отсутств\S*|прострочен\S*|просрочен\S*|порожн\S*|пуст\S*|злама[внл]\S*|сломан\S*|пошкоджен\S*|поврежден\S*|використан\S*|использован\S*)|(?<![а-яіїєґ])(?:немає|нема|нет)\s+(?:\S+\s+)?(?:аптечк\S*|вогнегасник\S*|огнетушител\S*|аварійн\S*\s+знак\S*|знак\S*\s+аварій\S*|аварийн\S*\s+знак\S*|жилет\S*|противідкатн\S*|противооткатн\S*)`, 'i', 1);
// Backlog 580 (Blickwinkel „Diktat/Tippfehler“): vorn ergänzt – Schreibweisen ohne Umlaut, getrennt geschrieben, Tippfehler, Umschrift
const WHEEL_HINT = lbRx(String.raw`(?<![a-zäöüß-])(?:(?:auflieger|anh(?:ä|ae|a)nger|vorder|hinter)?reifen|felge)\s+(?:\S+\s+)?eier(?:t|n)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced))|(?<![a-zäöüß-])(?:(?:anh(?:ä|ae|a)nger|auflieger|vorder|hinter|lenk|antriebs|zwillings)?(?:reifen|achse)|achsen)(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:hei(?:ß|ss)|qualm(?:t|en)|rauch(?:t|en)|gl(?:ü|ue|u)h(?:t|en))(?![a-zäöüß])|(?<![a-z])(?:tyres?|tires?|axles?|hubs?)\s+(?:\S+\s+){0,2}?(?:(?:running|getting|very|too)\s+)?(?:hot|smoking|smoke|burning)(?![a-z])|(?<![a-zäöüß-])rad\s*mut+ern?\s+(?:\S+\s+){0,3}?(?:locker(?![a-zäöüß])|locka(?![a-zäöüß])|lose(?![a-zäöüß])|abgefallen|gelockert|fehlt|fehlen)|(?<![a-zäöüß-])rader\s+(?:\S+\s+){0,2}?(?:wackelt|wackeln|eiert|eiern)|(?<![a-zäöüß-])(?:radmutter|radmuttern|radbolzen|radschraube|radschrauben|radmutternindikator(?:en)?)\s+(?:\S+\s+){0,3}?(?:locker(?![a-zäöüß])|lose(?![a-zäöüß])|hat\s+sich\s+gel(?:ö|oe|o)st|haben\s+sich\s+gel(?:ö|oe|o)st|fehlt|fehlen|abgerissen|abgebrochen|abgeschert|verloren|weg(?![a-zäöüß])|verdreht|lockern\s+sich|lockert\s+sich)|(?<![a-zäöüß])(?:lockere|lose|fehlende|abgerissene|abgescherte)[rnsm]?\s+(?:\S+\s+)?(?:radmutter|radbolzen|radschraube)\S*|(?<![a-zäöüß-])(?:vorder|hinter|zwillings|anh(?:ä|ae|a)nger|auflieger)?(?:rad|r(?:ä|ae|a)der)\s+(?:\S+\s+){0,2}?(?:wackelt|wackeln|eiert|eiern|locker(?![a-zäöüß])|hat\s+spiel|abgefallen|abgerissen|verloren|weggeflogen|(?:ist\s+)?(?:ab(?=\s*(?:$|[.,;!?)\n]|(?:am|an|vom|von|beim|bei|auf|w(?:ä|ae)hrend|unterwegs|hinten|vorne?|links|rechts)(?![a-zäöüß])))|weg(?=\s*(?:$|[.,;!?)\n])))|hei(?:ß|ss)(?![a-zäöüß])|qualmt|raucht|gl(?:ü|ue|u)ht)|(?<![a-zäöüß-])(?:radlager|radnabe|radnaben)\s+(?:\S+\s+){0,3}?(?:hei(?:ß|ss)|qualmt|raucht|gl(?:ü|ue|u)ht|defekt|kaputt|brummt|mahlt|heult|ger(?:ä|ae|a)usch|hat\s+spiel|locker(?![a-zäöüß])|wackelt)|(?<![a-zäöüß-])felge[n]?\s+(?:\S+\s+){0,2}?(?:gerissen|gebrochen|verbogen|hat\s+(?:einen\s+)?riss)|(?<![a-zäöüß])riss\s+in\s+der\s+felge|(?<![a-z])(?:wheel\s+(?:nut|stud|bolt)s?|lug\s+(?:nut|bolt)s?)\s+(?:\S+\s+){0,3}?(?:loose|missing|sheared|broken|gone|came\s+(?:off|loose)|backing\s+off)(?![a-z])|(?<![a-z])(?:loose|missing|sheared|broken)\s+(?:wheel\s+(?:nut|stud|bolt)|lug\s+(?:nut|bolt))s?|(?<![a-z])(?<!steering\s)(?<!spare\s)wheels?\s+(?:\S+\s+){0,2}?(?:wobbl\S*|is\s+loose|came\s+off|fell\s+off|come\s+off|coming\s+off|(?:is\s+|got\s+)?(?:very\s+)?hot(?![a-z])|smoking)|(?<![a-z])(?:lost|losing)\s+a\s+wheel|(?<![a-z])(?:wheel\s+)?(?:bearing|hub)s?\s+(?:\S+\s+){0,3}?(?:hot|smoking|noisy|(?<!no\s)noises?|(?<!no\s)making\s+(?:a\s+)?noise|grinding|humming|rumbling|droning|failed|gone|broken|has\s+play)(?![a-z])|(?<![a-z])(?:cracked|broken)\s+(?:wheel\s+)?rims?|(?<![a-z])rims?\s+(?:\S+\s+)?(?:cracked|broken|bent)(?![a-z])|(?<![а-яіїєґ])(?:колісн\S*|колесн\S*)\s+(?:гайк\S*|болт\S*|шпильк\S*)\s+(?:\S+\s+){0,2}?(?:ослаб\S*|відкрут\S*|открут\S*|розкрут\S*|раскрут\S*|нема\S*|відсутн\S*|отсутств\S*|злама\S*|слома\S*|відірв\S*|оторв\S*)|(?<![а-яіїєґ])(?:гайк\S*|болт\S*|шпильк\S*)\s+(?:на\s+)?колес\S*\s+(?:\S+\s+){0,2}?(?:ослаб\S*|відкрут\S*|открут\S*|розкрут\S*|раскрут\S*|нема\S*|відсутн\S*|отсутств\S*|злама\S*|слома\S*|відірв\S*|оторв\S*)|(?<![а-яіїєґ])колес\S*\s+(?:\S+\s+){0,2}?(?:хита\S*|болта\S*|шата\S*|розхита\S*|расшата\S*|відпал\S*|відвал\S*|відлеті\S*|отлете\S*|отлет\S*|отвал\S*|злетіл\S*|слетел\S*|гаряч\S*|горяч\S*|дими\S*|дымит\S*)|(?<![а-яіїєґ])(?:відпал\S*|відвал\S*|відлеті\S*|отлете\S*|отлет\S*|отвал\S*|загуби\S*|потеря\S*|злетіл\S*|слетел\S*)\s+(?:\S+\s+)?колес\S*|(?<![а-яіїєґ])(?:маточин\S*|ступиц\S*|підшипник\S*|подшипник\S*)\s+(?:\S+\s+){0,3}?(?:гаряч\S*|горяч\S*|гріє\S*|греет\S*|гуд\S*|дими\S*|дымит\S*|злама\S*|слома\S*|люфт\S*)|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?<!(?:гальмівн|тормозн)\S*\s+)(?:колісн\S*\s+)?диск\S*(?:\s+колес\S*)?\s+(?:\S+\s+)?(?:трісну\S*|тресну\S*|трісн\S*|лопну\S*|погну\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])не\s+(?:вистачає|хватает)\s+(?:\S+\s+){0,2}?(?:гайк|гайок|болт)\S*\s+(?:\S+\s+)?(?:на\s+)?(?:колес|диск)\S*(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?:на\s+)?колес\S*\s+не\s+(?:вистачає|хватает)\s+(?:\S+\s+)?(?:гайк|гайок|болт)\S*(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))`, 'i', 1);
const TOLL_HINT = lbRx(String.raw`(?<![a-zäöüß-])(?:maut[\s-]?ger(?:ä|ae|a)t|mautbox|maut[- ]box|maut-obu|obu|on-?board-?unit|toll\s*collect(?:-?box|-?ger(?:ä|ae|a)t)?|go-?box)(?:e|en|s|es)?\s+(?:\S+\s+){0,3}?(?:defekt|kaputt|ausgefallen|geht\s+nicht|funktioniert\s+nicht|zeigt\s+(?:\S+\s+)?(?:rot|fehler\S*|st(?:ö|oe|o)rung)|leuchtet\s+rot|blinkt\s+rot|rot(?![a-zäöüß])|fehler\S*|st(?:ö|oe|o)rung|piept|bleibt\s+dunkel|dunkel(?![a-zäöüß])|aus(?![a-zäöüß])|tot(?![a-zäöüß])|fehlt|weg(?![a-zäöüß])|abgefallen|reagiert\s+nicht|bucht\s+nicht|startet\s+nicht)|(?<![a-zäöüß])(?:mautst(?:ö|oe|o)rung|mautfehler)|(?<![a-zäöüß])maut\s+(?:\S+\s+){0,2}?nicht\s+(?:ab)?gebucht|(?<![a-zäöüß])(?:kein|keine)\s+maut\s+(?:\S+\s+)?gebucht|(?<![a-z])(?:toll\s+(?:box|unit|device|obu)|obu|on-?board\s+unit)s?\s+(?:\S+\s+){0,3}?(?:not\s+working|doesn['’]?t\s+work|isn['’]?t\s+working|broken|faulty|failed|dead|error|red(?![a-z])|beeping|missing|off(?![a-z])|won['’]?t\s+(?:book|switch\s+on|start))|(?<![a-z])toll\s+(?:\S+\s+)?(?:not\s+booked|error)(?![a-z])|(?<![a-z])obu\s+(?:\S+\s+){0,2}?(?:не\s+працю\S*|не\s+работа\S*|злама[внл]\S*|сломан\S*|несправн\S*|неисправ\S*|червон\S*|красн\S*|помилк\S*|ошибк\S*|пищ\S*|пікає|вимкн\S*|выключ\S*|нема\S*|відсутн\S*|отсутств\S*)|(?<![а-яіїєґ])(?:пристр\S*|блок\S*|коробк\S*|устройств\S*|бокс\S*)\s+(?:\S+\s+)?(?:мит\S*|оплат\S*\s+(?:дорог|проїзд|проезд)\S*|сплат\S*\s+мит\S*)\s+(?:\S+\s+){0,2}?(?:не\s+працю\S*|не\s+работа\S*|злама[внл]\S*|сломан\S*|несправн\S*|неисправ\S*|червон\S*|красн\S*|помилк\S*|ошибк\S*|пищ\S*|пікає|вимкн\S*|выключ\S*|нема\S*|відсутн\S*|отсутств\S*)|(?<![а-яіїєґ])(?:бортов\S*\s+(?:пристр|блок|устройств)\S*|толл?\s*колл?ект\S*|toll\s*collect\S*)\s+(?:\S+\s+){0,2}?(?:не\s+працю\S*|не\s+работа\S*|злама[внл]\S*|сломан\S*|несправн\S*|неисправ\S*|червон\S*|красн\S*|помилк\S*|ошибк\S*|пищ\S*|пікає|вимкн\S*|выключ\S*|нема\S*|відсутн\S*|отсутств\S*)`, 'i', 1);
// Backlog 334 (Blickwinkel „Standheizung oder Klimaanlage im Fahrerhaus ausgefallen – Ruhezeit im Lkw“): Hinweise (vor der Pause/Ruhezeit Leitung
// anrufen, sie klärt Verbleib/Unterkunft/Planung; nicht den Motor im Stand laufen lassen, keine Gas-/Heizgeräte im Fahrerhaus, bei Abgasgeruch/Rauch
// Gerät aus und raus; Gerät nicht öffnen, keine Sicherungen überbrücken; Anzeige/Fehlercode/Foto; Auswahl „Kann das Fahrzeug fahren?“) – reine Information,
// keine Frist, keine Temperaturangabe. „Standheizung eingeschaltet/läuft“, „Klimaanlage gewartet“, „Sitzheizung defekt“, „Kühlaggregat ausgefallen“ lösen nichts aus
const CLIMATE_HINT = lbRx(String.raw`(?<![a-z-])(?:aircon|air\s*con|a\/c|night\s+heater|parking\s+heater|cab\s+heater|heater)\s+(?:(?:has|have|just|completely)\s+){0,2}(?:packed\s+(?:in|up)|gave\s+up|given\s+up|blowing\s+cold)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|sorted|no\s+longer))|(?<![a-zäöüß-])(?:standheizung|standklima(?:anlage)?|standk(?:ü|ue|u)hlung|parkk(?:ü|ue|u)hlung|klimaanlage|klimaautomatik|klimakompressor|klima(?![a-zäöüß-])|dieselheizung|luftheizung|webasto|eberspächer|eberspaecher)(?:en|s)?(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:ausgefallen|f(?:ä|ae|a)llt\s+aus|geht\s+(?:\S+\s+){0,2}?(?:nicht|aus)(?![a-zäöüß])|funktioniert\s+nicht|defekt|kaputt|startet\s+nicht|springt\s+nicht\s+an|springt\s+(?:nur\s+)?(?:schlecht|schwer)\s+an|l(?:ä|ae|a)sst\s+sich\s+nicht\s+(?:mehr\s+)?(?:starten|einschalten|anschalten)|heizt\s+nicht|k(?:ü|ue|u)hlt\s+nicht|wird\s+nicht\s+(?:mehr\s+)?(?:warm|kalt|k(?:ü|ue|u)hl)|bleibt\s+(?:kalt|warm|aus)|bl(?:ä|ae|a)st\s+(?:nur\s+)?(?:nicht|warm|kalt)|zeigt\s+(?:\S+\s+)?(?:fehler\S*|st(?:ö|oe|o)rung)|fehler\S*|st(?:ö|oe|o)rung|qualmt|raucht|stinkt|piept|blinkt|schaltet\s+(?:sich\s+)?(?:\S+\s+)?ab|reagiert\s+nicht)|(?<![a-z-])(?:(?:parking|night|cab|auxiliary|diesel|bunk)\s+(?:heater|heating|cooler|air\s*con(?:ditioning|ditioner)?)|air\s*con(?:ditioning|ditioner)?|aircon|a\/c|ac|climate\s+control)(?![a-z])\s+(?:\S+\s+){0,3}?(?:not\s+(?:working|heating|cooling|starting)|doesn['’]?t\s+(?:work|heat|cool|start)|does\s+not\s+(?:work|heat|cool|start)|will\s+not\s+(?:start|turn\s+on|switch\s+on|work)|isn['’]?t\s+(?:working|heating|cooling)|won['’]?t\s+(?:start|turn\s+on|switch\s+on|work)|broken|faulty|failed|dead|error|fault(?![a-z])|blowing\s+(?:warm|hot|cold)|smoking|stopped\s+working|keeps\s+(?:cutting|switching)\s+(?:out|off)|cuts\s+(?:out|off)|switches\s+(?:itself\s+)?off\s+by\s+itself)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|working\s+again|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*))|(?<![а-яіїєґ])(?:кондиц\S*|кондиціон\S*|автономк\S*|вебасто|webasto|(?:автономн\S*|стоянков\S*|додатков\S*|дополнительн\S*)\s+(?:обігрівач\S*|опаленн\S*|отоплен\S*|отопител\S*|пічк\S*|печк\S*))\s+(?:\S+\s+){0,2}?(?:не\s+працю\S*|не\s+работа\S*|злама[внл]\S*|сломал\S*|сломан\S*|несправн\S*|неисправ\S*|не\s+гріє|не\s+греет|не\s+охолоджу\S*|не\s+холод\S*|не\s+охлажда\S*|не\s+запуска\S*|не\s+заводит\S*|не\s+вмика\S*|не\s+включа\S*|вимика[а-яіїєґ]*ся|відключа[а-яіїєґ]*ся|отключа[а-яё]*ся|выключа[а-яё]*ся|помилк\S*|ошибк\S*|дими\S*|дымит\S*|вийшов\s+з\s+ладу|вышел\s+из\s+строя)|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-z-])(?:air\s*-?con(?:ditioning)?|a\/c|aircon)\s+(?:\S+\s+){0,2}?(?:smell\S*|stink\S*)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])кондиціонер\S*\s+(?:\S+\s+)?(?:смерд\S*|воня\S*|тхне)|(?<![а-яіїєґё])кондиционер\S*\s+(?:\S+\s+)?(?:воня\S*|смерд\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-z-])(?:air\s*con|a\/c|aircon|air\s+conditioning)\s+(?:\S+\s+)?(?:not|isn['’]?t|no\s+longer)\s+(?:\S+\s+)?(?:cold|cool|cooling)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))`, 'i', 1);
// Backlog 335 (Blickwinkel „Fensterheber defekt – Seitenscheibe geht nicht mehr zu“): Hinweise (Leitung anrufen, vor allem vor Pause/Ruhezeit/Abstellen –
// Fahrerhaus nicht sicher verschließbar; Schlüssel/Papiere/Wertsachen nicht im offenen Fahrerhaus; nicht mit Gewalt hochdrücken, Verkleidung nicht abbauen,
// Behelf nur nach Absprache ohne Sicht zu verdecken; Seite/Stellung/Foto; Auswahl „Kann das Fahrzeug fahren?“) – reine Information, keine Frist.
// Eingeschlagene/gerissene Scheiben bleiben beim Glas-Hinweis; „Scheibe beschlägt“, „Fenster kaputt“, „broken window“ lösen ihn nicht aus
const WINDOW_HINT = lbRx(String.raw`(?<![a-zäöüß-])(?:fensterheber(?:motor|schalter)?|elektrische[nrs]?\s+fensterheber)(?:n|s)?(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:ausgefallen|f(?:ä|ae|a)llt\s+aus|geht\s+nicht|funktioniert\s+nicht|defekt|kaputt|klemmt|hakt|ruckelt|h(?:ä|ae|a)ngt|reagiert\s+nicht|ger(?:ä|ae|a)usch\S*|knackt|rattert|abgebrochen|gerissen|(?:sehr\s+|zu\s+|extrem\s+|ganz\s+|nur\s+noch\s+|nur\s+)?langsam(?![a-zäöüß])|bleibt\s+(?:\S+\s+)?(?:stehen|h(?:ä|ae|a)ngen))|(?<![a-zäöüß-])(?:seiten|fahrer|beifahrer|t(?:ü|ue|u)r|schiebe|kabinen|fahrerhaus)?(?:fenster|scheibe)(?:n)?(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:klemm(?:t|en)(?![a-zäöüß])|hakt(?![a-zäöüß])|(?:geht|gehen|f(?:ä|ae|a)hrt|fahren|l(?:ä|ae|a)uft|laufen|kommt|schlie(?:ß|ss)t)\s+(?:\S+\s+){0,2}?langsam(?![a-zäöüß])|(?:geht|gehen|f(?:ä|ae|a)hrt|fahren|l(?:ä|ae|a)sst\s+sich|lassen\s+sich|kommt|kommen)\s+(?:\S+\s+)?nicht\s+(?:mehr\s+|richtig\s+|ganz\s+)?(?:zu|hoch|rauf|nach\s+oben|runter|herunter|nach\s+unten|auf|schlie(?:ß|ss)en|(?:ö|oe|o)ffnen)(?![a-zäöüß])|(?:schlie(?:ß|ss)t|schlie(?:ß|ss)en)\s+(?:\S+\s+)?nicht(?![a-zäöüß])|bleibt\s+(?:\S+\s+)?(?:offen|unten|halb\s+offen|einen\s+spalt\s+offen)|bleiben\s+(?:\S+\s+)?(?:offen|unten)|rutscht\s+(?:\S+\s+)?(?:runter|herunter|nach\s+unten|ab)|rutschen\s+(?:\S+\s+)?(?:runter|herunter|nach\s+unten)|ist\s+aus\s+der\s+f(?:ü|ue|u)hrung|aus\s+der\s+f(?:ü|ue|u)hrung\s+gesprungen|in\s+die\s+t(?:ü|ue|u)r\s+gefallen)|(?<![a-z-])(?:(?:power|electric|side|driver['’]?s?|passenger['’]?s?|cab|door)\s+)?window(?:\s+(?:regulator|motor|switch|winder))?s?(?![a-z])\s+(?:\S+\s+){0,3}?(?:won['’]?t|doesn['’]?t|does\s+not|will\s+not|can['’]?t|cannot|isn['’]?t|is\s+not)\s+(?:\S+\s+)?(?:close|closing|shut|go(?:ing)?\s+(?:up|down)|wind\s+(?:up|down)|open|work|working)|(?<![a-z-])window\S*\s+(?:\S+\s+){0,2}?(?:stuck\s+(?:open|down|half)|(?:goes|going|moves?|moving|winds?|winding|closes|closing|opens|opening)\s+(?:up\s+|down\s+)?(?:very\s+|really\s+|too\s+)?slow(?:ly)?(?![a-z])|(?:is\s+|are\s+)?(?:very\s+|really\s+|too\s+)?(?:slow|sluggish)(?=\s*(?:$|[.,;!?]|to\s+(?:close|open|go)))|keeps\s+(?:sliding|dropping|falling)\s+down|(?:slid|dropped|fell)\s+(?:down\s+)?into\s+the\s+door)|(?<![a-z-])(?:window\s+(?:regulator|motor|switch|winder)|power\s+window)s?\s+(?:\S+\s+){0,2}?(?:broken|faulty|failed|dead|not\s+working|stuck|slow|sluggish|jerky)|(?<![а-яіїєґ])(?:склопідйомник\S*|стеклопод(?:ъ|ь)[её]мник\S*)\s+(?:\S+\s+){0,2}?(?:не\s+працю\S*|не\s+работа\S*|злама[внл]\S*|сломал\S*|сломан\S*|несправн\S*|неисправ\S*|заклин\S*|заїда\S*|заеда\S*|повільн\S*|медленн\S*|туго)|(?<![а-яіїєґ])(?:вікн\S*|бічн\S*\s+скл\S*|скло|склом|стекло|окн\S*|окошк\S*)\s+(?:\S+\s+){0,2}?(?:не\s+закрива\S*|не\s+закрыва\S*|не\s+підніма\S*|не\s+зачиня\S*|не\s+піднима\S*|не\s+поднима\S*|не\s+опуска\S*|застряг\S*|застрял\S*|залишається\s+відкрит\S*|остается\s+открыт\S*|оста[её]тся\s+открыт\S*|сповза\S*|сполза\S*|(?:дуже\s+|очень\s+)?(?:повільно|медленно)\s+(?:підніма|опуска|закрива|зачиня|поднима|закрыва)\S*|заїда\S*|заеда\S*)`, 'i', 1);
// Backlog 337 (Blickwinkel „Tankdeckel oder AdBlue-Deckel verloren, klemmt oder schließt nicht“): Hinweise (vor der Weiterfahrt Leitung anrufen –
// austretender Kraftstoff macht die Fahrbahn rutschig, Schmutz/Wasser im Tank; kein Behelf mit Lappen/Folie/Klebeband, nicht randvoll tanken, Ersatz klärt die
// Leitung; auslaufend → Leck-, aufgebrochen/abgezapft → Diebstahl-Schritte; Diesel/AdBlue, Seite, Zustand, Ort/Zeit, Foto; Auswahl „Kann das Fahrzeug fahren?“) –
// reine Information, keine Frist. „Tankdeckel aufgebrochen“ bleibt beim Diebstahl-Hinweis, „Tankanzeige defekt“, „Tankkarte verloren“, „Tankdeckel geöffnet“ lösen nichts aus
const FUELCAP_HINT = lbRx(String.raw`(?<![а-яіїєґё])лючок\s+(?:\S+\s+)?(?:бак\S*|бензобак\S*|паливн\S*|топливн\S*|adblue|адблю)\S*\s+(?:\S+\s+)?(?:не\s+(?:відкрива\S*|закрива\S*|открыва\S*|закрыва\S*)|злама[внл]\S*|сломан\S*|відірва\S*|оторва\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))|(?<![a-zäöüß-])(?:(?:(?:diesel|adblue|harnstoff|kraftstoff)-?)?tank(?:deckel|verschlu(?:ss|ß)|klappe|schloss)|(?:diesel|adblue|harnstoff|kraftstoff)[\s-]?deckel|deckel\s+(?:vom|von\s+dem|des|am)\s+(?:(?:diesel|adblue|harnstoff|kraftstoff)-?)?(?:tank\S*|diesel|adblue))(?:dichtung|s|es|n)?(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:verloren|fehlt|fehlen|weg(?![a-zäöüß])|abgefallen|abgerissen|abgebrochen|kaputt|defekt|klemmt|klemmen|(?:h(?:ä|ae|a)ngt|sitzt)\s+fest|(?:geht|gehen)\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:auf|zu|ab|drauf|ran)(?![a-zäöüß])|(?:schlie(?:ß|ss)t|schlie(?:ß|ss)en|passt|h(?:ä|ae|a)lt|rastet|dichtet)\s+(?:\S+\s+)?nicht(?![a-zäöüß])|l(?:ä|ae|a)sst\s+sich\s+(?:\S+\s+){0,2}?nicht\s+(?:mehr\s+)?(?:(?:ö|oe|o)ffnen|schlie(?:ß|ss)en|abschrauben|aufschrauben|zuschrauben|zudrehen|aufdrehen|aufmachen|zumachen|abnehmen|abschlie(?:ß|ss)en)|liegen\s+(?:ge)?lassen|vergessen|steht\s+offen|offen\s+gelassen)|(?<![a-zäöüß-])(?:ohne|kein(?:en)?)\s+(?:\S+\s+)?(?:(?:(?:diesel|adblue|harnstoff|kraftstoff)-?)?tank(?:deckel|verschlu(?:ss|ß)|klappe|schloss)|(?:diesel|adblue|harnstoff|kraftstoff)[\s-]?deckel|deckel\s+(?:vom|von\s+dem|des|am)\s+(?:(?:diesel|adblue|harnstoff|kraftstoff)-?)?(?:tank\S*|diesel|adblue))(?![a-zäöüß])|(?<![a-z-])(?:(?:fuel|diesel|tank|adblue|def|gas|petrol)\s+(?:tank\s+)?(?:filler\s+)?(?:cap|lid|flap)s?)(?![a-z])\s+(?:\S+\s+){0,2}?(?:missing|lost|gone|stuck|jammed|broken|(?:fell|came)\s+off|left\s+(?:\S+\s+){0,2}?(?:at|behind)|(?:won['’]?t|doesn['’]?t|does\s+not|will\s+not|can['’]?t|cannot)\s+(?:be\s+)?(?:open|opened|close|closed|shut|lock|locked|come\s+off|removed|screw\S*|fit|seal))(?![a-z])|(?<![a-z-])(?:lost|missing|no|without|lose)\s+(?:the\s+|a\s+|my\s+)?(?:(?:fuel|diesel|tank|adblue|def|gas|petrol)\s+(?:tank\s+)?(?:filler\s+)?(?:cap|lid|flap)s?)(?![a-z])|(?<![a-z-])(?:can['’]?t|cannot|unable\s+to)\s+(?:open|close|shut|remove|get\s+off|unscrew)\s+(?:the\s+)?(?:(?:fuel|diesel|tank|adblue|def|gas|petrol)\s+(?:tank\s+)?(?:filler\s+)?(?:cap|lid|flap)s?)(?![a-z])|(?<![а-яіїєґ])(?:(?:кришк\S*|крышк\S*)\s+(?:\S+\s+)?(?:бак\S*|паливн\S*|топливн\S*|adblue|адблю))\s+(?:\S+\s+){0,2}?(?:загуб\S*|втрат\S*|втрач\S*|нема\S*|відсутн\S*|потер\S*|нет(?![а-яіїєґ])|отсутств\S*|не\s+відкрива\S*|не\s+закрива\S*|не\s+открыва\S*|не\s+закрыва\S*|не\s+відкруч\S*|не\s+откруч\S*|не\s+знима\S*|застря\S*|заклин\S*|злама[внл]\S*|сломал\S*|сломан\S*|відпал\S*|отпал\S*|залиши\S*|забу\S*|остави\S*)|(?<![а-яіїєґ])(?:загуби\S*|втрати\S*|потерял\S*|немає|нема(?![а-яіїєґ])|нет(?![а-яіїєґ])|без)\s+(?:\S+\s+)?(?:(?:кришк\S*|крышк\S*)\s+(?:\S+\s+)?(?:бак\S*|паливн\S*|топливн\S*|adblue|адблю))`, 'i', 1);
// Backlog 340 (Blickwinkel „Tankkarte verloren, gestohlen oder an der Kasse abgelehnt“): Hinweise (sofort Leitung anrufen, damit die Karte gesperrt
// werden kann; PIN nie bei der Karte, nie Kartennummer/PIN in die Meldung; bei Diebstahl die Diebstahl-Schritte, Tanken bis dahin klärt die Leitung;
// abgelehnt: nicht mehrfach mit falscher PIN; wann/wo zuletzt, Tankstelle/Meldung am Terminal; Auswahl „Kann das Fahrzeug fahren?“) – reine Information, keine Frist.
// „mit Tankkarte getankt“, „neue Tankkarte erhalten“, „Tankkarte liegt im Handschuhfach“, „Fahrerkarte verloren“ (Fahrtenschreiber) lösen nichts aus
const FUELCARD_HINT = lbRx(String.raw`(?<![a-zäöüß-])(?:(?:tank|kraftstoff|diesel|flotten|dkv|uta)-?karte(?:n)?|(?:dkv|uta)\s+karte(?:n)?)(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:verloren|weg(?![a-zäöüß])|fehlt|gestohlen|geklaut|abhanden\s+gekommen|nicht\s+(?:mehr\s+)?(?:da|auffindbar|zu\s+finden)(?![a-zäöüß])|gesperrt|abgelehnt|funktioniert\s+nicht|geht\s+nicht|wird\s+(?:\S+\s+)?nicht\s+(?:angenommen|gelesen|akzeptiert|erkannt)|defekt|kaputt|gebrochen|abgelaufen|liegen\s+(?:ge)?lassen|vergessen)|(?<![a-zäöüß-])pin\s+(?:\S+\s+){0,2}?(?:(?:tank|kraftstoff|diesel|flotten|dkv|uta)-?karte(?:n)?|(?:dkv|uta)\s+karte(?:n)?)(?![a-zäöüß])\s+(?:\S+\s+)?(?:vergessen|falsch|gesperrt)|(?<![a-z-])(?:(?:fuel|diesel|petrol|gas|fleet)\s+cards?)(?![a-z])\s+(?:\S+\s+){0,2}?(?:lost|missing|stolen|gone|declined|rejected|blocked|expired|broken|not\s+working|(?:doesn['’]?t|won['’]?t|isn['’]?t|does\s+not|will\s+not|is\s+not)\s+(?:work|working|accepted|read)|left\s+(?:\S+\s+){0,2}?(?:at|behind))(?![a-z])|(?<![a-z-])(?:lost|stole|missing|forgot|forgotten|left)\s+(?:the\s+|my\s+|a\s+|our\s+)?(?:(?:fuel|diesel|petrol|gas|fleet)\s+cards?)(?![a-z])|(?<![а-яіїєґ])(?:(?:паливн\S*|топливн\S*|заправн\S*)\s+карт\S*)\s+(?:\S+\s+){0,2}?(?:загуб\S*|втрат\S*|втрач\S*|вкра\S*|украл\S*|украд\S*|потер\S*|заблок\S*|не\s+працю\S*|не\s+работа\S*|не\s+прийма\S*|не\s+принима\S*|не\s+чита\S*|відхил\S*|отклон\S*|нема\S*|нет(?![а-яіїєґ])|забу\S*|залиши\S*|остави\S*)|(?<![а-яіїєґ])(?:загуби\S*|втрати\S*|потерял\S*|вкрали|украли|забу\S*|залиши\S*|остави\S*)\s+(?:\S+\s+)?(?:(?:паливн\S*|топливн\S*|заправн\S*)\s+карт\S*)`, 'i', 1);
// Backlog 341 (Blickwinkel „Unterfahrschutz oder Seitenschutz verbogen – z. B. beim Rangieren“): Hinweise (Leitung informieren, auch ohne fremden
// Schaden; Anstoß an fremdem Eigentum/Fahrzeug → Unfall-Schritte; hängt/schleift etwas → Schritte für lose Teile; nicht selbst zurückbiegen oder abschrauben;
// Lage/Seite, wie stark, Foto mit Kennzeichen; Auswahl „Kann das Fahrzeug fahren?“) – reine Information, keine Frist, keine Rechtsnorm.
// „Unterfahrschutz abgerissen/hängt herunter“ bleibt beim Hinweis für lose Teile; „Stoßstange verbogen“, „Unterfahrschutz geprüft“, „Seitenschutz montiert“ lösen nichts aus
const UNDERRUN_HINT = lbRx(String.raw`(?<![a-zäöüß-])(?:(?:heck|front|seiten)?unterfahrschutz(?:es)?|seitenschutz(?:vorrichtung)?(?:es|en)?|seitliche[nrs]?\s+schutzvorrichtung(?:en)?|rammschutz(?:es)?)(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:verbogen|eingedr(?:ü|ue|u)ckt|besch(?:ä|ae|a)digt|verzogen|krumm|deformiert|angefahren|abgeknickt|geknickt|gebrochen|gerissen|eingerissen|kaputt|defekt|schief|verschoben|fehlt|ist\s+weg)(?![a-zäöüß])|(?<![a-zäöüß-])(?:verbogene[nrs]?|eingedr(?:ü|ue|u)ckte[nrs]?|besch(?:ä|ae|a)digte[nrs]?|krumme[nrs]?)\s+(?:\S+\s+)?(?:(?:heck|front|seiten)?unterfahrschutz(?:es)?|seitenschutz(?:vorrichtung)?(?:es|en)?|seitliche[nrs]?\s+schutzvorrichtung(?:en)?|rammschutz(?:es)?)(?![a-zäöüß])|(?<![a-z-])(?:(?:(?:rear|front|side)\s+)?underrun\s+(?:bar|protection|guard|protector)s?|side\s+guards?|side\s+(?:impact\s+)?protection\s+(?:bar|rail)s?)(?![a-z])\s+(?:\S+\s+){0,2}?(?:bent|damaged|dented|broken|cracked|crooked|missing|pushed\s+in|knocked\s+in|deformed)(?![a-z])|(?<![a-z-])(?:bent|damaged|dented|broken)\s+(?:the\s+)?(?:(?:(?:rear|front|side)\s+)?underrun\s+(?:bar|protection|guard|protector)s?|side\s+guards?|side\s+(?:impact\s+)?protection\s+(?:bar|rail)s?)(?![a-z])|(?<![а-яіїєґ])(?:(?:(?:протипідкатн|противоподкатн|противопідкатн|підкатн|подкатн|відбійн|отбойн)\S*|(?:бічн|бокова|бокової|боков)\S*\s+(?:захист\S*|защит\S*|огорож\S*|ограждени\S*))(?:\s+(?:брус\S*|балк\S*|рам\S*))?)\s+(?:\S+\s+){0,2}?(?:погну\S*|зігну\S*|согну\S*|вигну\S*|пошкоджен\S*|поврежд\S*|злама[внл]\S*|сломан\S*|деформ\S*|вм['’]?ят\S*|відсутн\S*|нема\S*|нет(?![а-яіїєґ]))|(?<![а-яіїєґ])(?:погнут\S*|зігнут\S*|пошкоджен\S*|поврежд\S*|деформ\S*)\s+(?:\S+\s+)?(?:(?:(?:протипідкатн|противоподкатн|противопідкатн|підкатн|подкатн|відбійн|отбойн)\S*|(?:бічн|бокова|бокової|боков)\S*\s+(?:захист\S*|защит\S*|огорож\S*|ограждени\S*))(?:\s+(?:брус\S*|балк\S*|рам\S*))?)`, 'i', 1);
// Backlog 345 (Blickwinkel „Reifen beschädigt, verliert Luft oder ist abgefahren – noch nicht platt“): Hinweise (Beule/tiefer Schnitt/Gewebe sichtbar/
// Lauffläche löst sich/schneller Luftverlust → sicher anhalten, nicht weiterfahren, Reifenpanne-Schritte; Fremdkörper nicht herausziehen; Leitung entscheidet
// über Weiterfahrt/Reifendienst; welcher Reifen, Foto; Auswahl „Kann das Fahrzeug fahren?“) – keine Profiltiefe, keine Frist. „Reifen platt/geplatzt“ bleibt
// beim Reifenpanne-Hinweis; „Reifen gewechselt“, „Reifendruck geprüft“, „Winterreifen montiert“, „neue Reifen bestellt“ lösen nichts aus
const TYRE_HINT = lbRx(String.raw`(?<![a-zäöüß-])(?:reifen)?profil(?:tiefe)?(?![a-zäöüß])\s+(?:(?:ist|hat|vorne|hinten|links|rechts|am\s+\S+)\s+){0,2}(?:nur\s+noch|unter|weniger\s+als|kaum\s+noch|bis\s+auf)\s+(?:ca\.?\s+|etwa\s+)?\d+(?:[,.]\d+)?\s?mm(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|fixed|repaired|replaced))|(?<![a-zäöüß-])reifen[sn]?\s+(?:(?:ist|sind|vorne|hinten|links|rechts)\s+){0,2}(?:nur\s+noch|unter|weniger\s+als)\s+\d+(?:[,.]\d+)?\s?mm(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|fixed|repaired|replaced))|(?<![a-zäöüß-])reifen[sn]?\s+(?:\S+\s+){0,3}?(?:bis\s+auf\s+(?:die\s+)?(?:karkasse|stahlg(?:ü|ue)rtel|gewebe|drähte|draehte)|(?:ist|sind)\s+(?:komplett\s+|total\s+|ganz\s+)?(?:durch|glatt|runter)(?=\s*(?:$|[.,;!?])))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|fixed|repaired|replaced))|(?<![a-z-])tread\s+(?:is\s+)?(?:down\s+to|below|under|only)\s+\d+(?:\.\d+)?\s?mm(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|fixed|repaired|replaced))|(?<![a-z-])tread\s+(?:is\s+|has\s+)?(?:worn\s+(?:down|away|out)|gone)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|fixed|repaired|replaced))|(?<![а-яіїєґё])протектор\S*\s+(?:\S+\s+)?(?:стерся|стерт\S*|стерлися|зношен\S*|зносився|изношен\S*|износился)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|fixed|repaired|replaced|замінил\S*|заменил\S*))|(?<![а-яіїєґё])(?:зачепив|зачепила|зачепили|наїхав|наїхала|наїхали|зацепил|зацепила|зацепили|заехал|заехала|наехал|наехала)\s+(?:\S+\s+)?(?:на\s+)?бордюр\S*(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|полагодил\S*|починил\S*))|(?<![a-z-])kerbed\s+(?:the\s+|a\s+)?(?:\S+\s+)?(?:tyres?|tires?|wheels?)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|sorted|no\s+longer))|(?<![a-z-])(?:hit|clipped|caught|mounted|clouted)\s+(?:a|the)\s+kerb(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|sorted|no\s+longer))|(?<![a-zäöüß-])(?:reifen)?profil(?![a-zäöüß])\s+(?:(?:ist|sind|am|vorne|hinten|links|rechts|fast|so\s+gut\s+wie|komplett|ganz|schon|total)\s+){0,3}(?:runter|weg|unten|durch|am\s+ende)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced))|(?<![a-zäöüß-])(?:kaum|fast\s+kein|so\s+gut\s+wie\s+kein|wenig)\s+(?:noch\s+|mehr\s+)?profil(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced))|(?<![a-zäöüß-])reifen[sn]?\s+(?:\S+\s+){0,2}?(?:ohne\s+profil|hat\s+(?:(?:n|['’]n|ein|einen)\s+)?ei(?![a-zäöüß]))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced))|(?<![а-яіїєґё])(?:лис(?:а|і|ая|ые)\s+(?:резин\S*|шин\S*)|(?:резин\S*|шин\S*)\s+(?:зовсім\s+|совсем\s+)?лис(?:а|і|ая|ые))(?![а-яіїєґё])|(?<![a-zäöüß-])(?:rdks|reifendruckkontroll\S*|reifendruck(?:überwachung|ueberwachung)\S*|tpms|(?:tyre|tire)\s+pressure\s+monitor\S*)(?![a-zäöüß-])\s+(?:\S+\s+){0,3}?(?:warn\S*|meldet\s+(?:\S+\s+){0,2}?(?:druckverlust|warnung|zu\s+wenig|niedrig\S*)|leuchtet|alarm\S*|druckverlust|piept|alert\S*|light|warning)|(?<![a-zäöüß-])(?:(?:zwillings|vorder|hinter|antriebs|lenk|auflieger|anh(?:ä|ae|a)nger)?reifen[sn]?|lauffl(?:ä|ae|a)che|reifenflanke|seitenwand|reifenprofil|profil)(?![a-zäöüß])\s+(?:\S+\s+){0,4}?(?:verlier\S*\s+(?:\S+\s+)?luft|beule|blase|ausbeulung|schnitt|eingeschnitten|eingerissen|rissig|risse(?![a-zäöüß])|riss(?![a-zäöüß])|abgefahren|blank(?![a-zäöüß])|(?:kein|zu\s+wenig|wenig|kaum)\s+profil|zu\s+wenig(?![a-zäöüß])|(?:zu\s+)?(?:gering|niedrig)(?![a-zäöüß])|l(?:ö|oe|o)s(?:t|en)\s+sich|besch(?:ä|ae|a)digt|aufgerissen|(?:draht|gewebe|stahl\S*|karkasse)\s+(?:\S+\s+)?(?:schaut|guckt|sichtbar|zu\s+sehen|kommt\s+raus)|scheuer\S*|ber(?:ü|ue|u)hren\s+sich|(?:hat|mit)\s+(?:einen\s+|eine\s+|einem\s+)?(?:nagel|schraube|fremdk(?:ö|oe|o)rper))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|fixed|repaired|replaced))|(?<![a-zäöüß-])(?:reifenschaden|reifensch(?:ä|ae|a)den|reifenbeule|reifenriss|reifendruckwarnung|reifendruck-warnung|luftverlust\s+(?:\S+\s+)?(?:am|im)\s+(?:\S+\s+)?reifen\S*)|(?<![a-zäöüß-])(?:nagel|schraube|fremdk(?:ö|oe|o)rper|glasscherbe|beule|blase|schnitt|riss)\s+(?:\S+\s+){0,2}?(?:im|in\s+der|in\s+dem|am|an\s+der)\s+(?:\S+\s+)?(?:reifen|lauffl(?:ä|ae|a)che|seitenwand|flanke|reifenflanke)\S*|(?<![a-zäöüß-])reifendruck\s+(?:\S+\s+){0,2}?(?:zu\s+)?(?:niedrig|gering|f(?:ä|ae|a)llt|sinkt|warnung|warnt)|(?<![a-zäöüß-])(?:scheuert|scheuern|schleift|schleifen)\s+(?:\S+\s+)?(?:am|an\s+den|an\s+dem|an\s+der)\s+(?:\S+\s+)?reifen\S*|(?<![a-z-])(?:tyre|tire)s?\s+(?:\S+\s+){0,2}?(?:bulge|bulging|cut(?![a-z])|cracked|cracks|worn|bald|los(?:ing|es)\s+air|leak(?:ing|s)\s+air|going\s+down|(?:is\s+)?low\s+on\s+air|damaged|tread\s+(?:\S+\s+)?(?:coming\s+off|separating|low|worn)|sidewall\s+damage\S*|rubbing)(?![a-z])|(?<![a-z-])(?:nail|screw|bolt|bulge|cut|glass)\s+in\s+(?:the\s+|a\s+)?(?:\S+\s+)?(?:tyre|tire)s?(?![a-z])|(?<![a-z-])(?:bald|worn|damaged|bulging)\s+(?:\S+\s+)?(?:tyre|tire)s?(?![a-z])|(?<![a-z-])(?:tyre|tire)\s+pressure\s+(?:\S+\s+)?(?:warning|low|light|dropping)|(?<![а-яіїєґ])(?:шин\S*|колес\S*|покришк\S*|покрышк\S*|протектор\S*)\s+(?:\S+\s+){0,2}?(?:зношен\S*|изношен\S*|лис\S*|лыс\S*|гриж\S*|грыж\S*|поріз\S*|порез\S*|тріщин\S*|трещин\S*|пошкоджен\S*|поврежд\S*|трав\S*\s+(?:\S+\s+)?повітр\S*|трав\S*\s+(?:\S+\s+)?воздух\S*|втрача\S*\s+тиск|теря\S*\s+давлен\S*|відшаров\S*|отслаива\S*)|(?<![а-яіїєґ])(?:гриж\S*|грыж\S*|цвях\S*|гвозд\S*|саморіз\S*|саморез\S*|шуруп\S*|поріз\S*|порез\S*)\s+(?:\S+\s+)?(?:на|в|у)\s+(?:\S+\s+)?(?:шин\S*|колес\S*|покришк\S*|покрышк\S*|протектор\S*)|(?<![а-яіїєґ])(?:низьк\S*|низк\S*)\s+тиск\S*\s+(?:\S+\s+)?(?:в|у)\s+(?:\S+\s+)?шин\S*|(?<![а-яіїєґ])(?:низьк\S*|низк\S*)\s+(?:тиск|давлени)\S*\s+(?:\S+\s+)?(?:в|у)\s+(?:\S+\s+)?(?:шин|колес)\S*|(?<![а-яіїєґ])(?:тиск|давлени)\S*\s+(?:в|у)\s+(?:\S+\s+)?(?:шин|колес)\S*\s+(?:\S+\s+)?(?:низьк\S*|низк\S*|мал\S*|впав|упал\S*|пада\S*)|(?<![a-z])(?<!no\s)low\s+(?:tyre|tire)\s+pressure(?![a-z])|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?:колесо|колеса|шина|шини|шины)\s+(?:\S+\s+)?(?:спуска\S*|трав\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-z-])(?:wheel|tyre|tire)\s+(?:is\s+|keeps\s+)?(?:losing|loses|leaking|leaks)\s+(?:\S+\s+)?air(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?<![a-zäöüß-])(?:reifenventil\S*|ventil(?:kappe)?\s+(?:am|vom|des)\s+(?:\S+\s+)?(?:reifen|pneu|zwillingsreifen|vorderreifen|hinterreifen|aufliegerreifen|anh(?:ä|ae)ngerreifen)\S*)\s+(?:(?:ist|vorne|hinten|links|rechts)\s+){0,2}(?:abgerissen|abgebrochen|undicht|kaputt|defekt|verbogen|zischt)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|fixed|repaired|replaced|changed|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*))|(?<![a-zäöüß-])(?:karkasse|stahlg(?:ü|ue)rtel|stahlcord|cord|gewebe(?:lage)?)(?![a-zäöüß])\s+(?:(?:ist|sind|schon|schaut|kommt|guckt|liegt)\s+){0,2}(?:sichtbar|zu\s+sehen|frei|raus|heraus|durch)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|fixed|repaired|replaced|changed|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*))|(?<![a-zäöüß-])(?:stahl|draht|dr(?:ä|ae)hte|gewebe)\s+(?:schaut|schauen|kommt|kommen|guckt|gucken|steht|stehen|ist|sind)\s+(?:\S+\s+){0,2}?(?:raus|heraus|vor|sichtbar)\s+(?:\S+\s+)?(?:am|aus\s+dem|im|beim)\s+(?:\S+\s+)?(?:reifen|pneu|zwillingsreifen|vorderreifen|hinterreifen|aufliegerreifen|anh(?:ä|ae)ngerreifen)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|fixed|repaired|replaced|changed|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*))|(?<![a-zäöüß-])(?:reifen|pneu|zwillingsreifen|vorderreifen|hinterreifen|aufliegerreifen|anh(?:ä|ae)ngerreifen)(?:n)?(?![a-zäöüß])\s+(?:(?:ist|sind|vorne|hinten|links|rechts|schon|total|ganz|sehr|stark|alle|alt\s+und)\s+){0,3}(?:por(?:ö|oe)s|rissig|ausgeh(?:ä|ae)rtet|br(?:ü|ue)chig)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|fixed|repaired|replaced|changed|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*))|(?<![a-zäöüß-])reifen(?:druck)?(?:warnung|warnmeldung|kontrolle|fehler)\s+(?:\S+\s+){0,2}?(?:im|auf\s+dem|am)\s+(?:display|bildschirm|tacho|armaturenbrett)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|fixed|repaired|replaced|changed|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*))|(?<![a-z-])(?:bulge|bubble|lump|cut|gash)\s+(?:on|in)\s+(?:the\s+)?(?:\S+\s+)?(?:tyre|tire)(?:wall)?s?(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|fixed|repaired|replaced|changed|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*))|(?<![a-z-])(?:wire|wires|steel|cord|belt|canvas|ply)\s+(?:is\s+|are\s+)?(?:showing|visible|exposed|sticking\s+out|coming\s+through)\s+(?:on|in|from|through)\s+(?:the\s+)?(?:\S+\s+)?(?:tyre|tire)s?(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|fixed|repaired|replaced|changed|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*))|(?<![a-z-])(?:tyre|tire)s?\s+(?:\S+\s+)?(?:valve|valve\s+stem)\s+(?:\S+\s+)?(?:broken|snapped|leaking|ripped\s+off|missing)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|fixed|repaired|replaced|changed|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*))|(?<![а-яіїєґё])(?:корд\S*|металокорд\S*)\s+(?:\S+\s+)?(?:видно|видн\S*|вилі\S*|вылез\S*|стирчить|торчит)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|fixed|repaired|replaced|changed|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*))|(?<![а-яіїєґё])(?:видно|видн\S*)\s+(?:\S+\s+)?корд\S*(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|fixed|repaired|replaced|changed|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*))|(?<![a-zäöüß-])(?:reifen|pneu|zwillingsreifen|vorderreifen|hinterreifen|aufliegerreifen|anh(?:ä|ae)ngerreifen)(?:n)?(?![a-zäöüß])\s+(?:(?:ist|sind|wirkt|wirken|fühlt\s+sich|fuehlt\s+sich|vorne|hinten|links|rechts|schon|etwas|ganz|sehr|so|zu|total)\s+){0,4}(?:weich|zischt|zischen|pfeift)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|nicht\s+mehr|fixed|repaired|replaced|changed|no\s+longer|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*|більше\s+не|больше\s+не))|(?<![a-zäöüß-])(?:reifen|pneu|zwillingsreifen|vorderreifen|hinterreifen|aufliegerreifen|anh(?:ä|ae)ngerreifen)(?:n)?(?![a-zäöüß])[^.;!?]{0,40}?(?:muss|m(?:ü|ue)ssen|st(?:ä|ae)ndig|immer\s+wieder|t(?:ä|ae)glich|jeden\s+(?:tag|morgen))(?:(?!nicht|kein)[^.;!?]){0,30}?(?:nach|auf)(?:gepumpt|pumpen)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|nicht\s+mehr|fixed|repaired|replaced|changed|no\s+longer|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*|більше\s+не|больше\s+не))|(?<![a-zäöüß-])(?<!nicht\s)(?<!nicht\s(?:mehr|so)\s)(?:muss|m(?:ü|ue)ssen|st(?:ä|ae)ndig|immer\s+wieder|t(?:ä|ae)glich|jeden\s+(?:tag|morgen))\s+(?:(?!nicht|kein)\S+\s+){0,3}?luft\s+(?:\S+\s+){0,3}?nach(?:f(?:ü|ue)llen|pumpen|gef(?:ü|ue)llt|gepumpt)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|nicht\s+mehr|fixed|repaired|replaced|changed|no\s+longer|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*|більше\s+не|больше\s+не))|(?<![a-z-])(?:tyre|tire)s?\s+(?:\S+\s+){0,2}?(?:is|are|feels?|looks?|seems?|going)\s+(?:a\s+bit\s+|very\s+|quite\s+|really\s+|a\s+little\s+)?soft(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|nicht\s+mehr|fixed|repaired|replaced|changed|no\s+longer|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*|більше\s+не|больше\s+не))|(?<![a-z-])(?:tyre|tire)s?\s+(?:\S+\s+){0,2}?(?:keeps?\s+)?(?:needing|needs)\s+(?:more\s+)?air(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|nicht\s+mehr|fixed|repaired|replaced|changed|no\s+longer|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*|більше\s+не|больше\s+не))|(?<![a-z-])(?:keep|have\s+to\s+keep|keep\s+having\s+to)\s+(?:pumping\s+up|inflating|topping\s+up)\s+(?:the\s+)?(?:\S+\s+)?(?:tyre|tire)s?(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|nicht\s+mehr|fixed|repaired|replaced|changed|no\s+longer|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*|більше\s+не|больше\s+не))|(?<![a-z-])(?:tyre|tire)s?\s+(?:is\s+|are\s+)?hissing(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|nicht\s+mehr|fixed|repaired|replaced|changed|no\s+longer|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*|більше\s+не|больше\s+не))|(?<![a-z-])hissing\s+(?:noise\s+|sound\s+)?(?:from|at)\s+(?:the\s+)?(?:\S+\s+)?(?:tyre|tire|wheel)s?(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|nicht\s+mehr|fixed|repaired|replaced|changed|no\s+longer|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*|більше\s+не|больше\s+не))|(?<![а-яіїєґё])(?:повільно\s+|потихеньку\s+|медленно\s+)?спуска\S*\s+(?:\S+\s+)?(?:колесо|колеса|шина|шину|шини|шины)(?![а-яіїєґё])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|nicht\s+mehr|fixed|repaired|replaced|changed|no\s+longer|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*|більше\s+не|больше\s+не))|(?<![а-яіїєґё])(?:колесо|колеса|шина|шини|шины)\s+(?:\S+\s+)?(?:шипить|шипит|свистить|свистит)(?![а-яіїєґё])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|nicht\s+mehr|fixed|repaired|replaced|changed|no\s+longer|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?:датчик\S*|сенсор\S*|індикатор\S*|индикатор\S*|лампочк\S*|значок\S*)\s+(?:тиску|давлени\S*)\s+(?:(?:в|у)\s+)?(?:шин\S*|колес\S*|колiс\S*|коліс\S*)\s+(?:\S+\s+)?(?:гори\S*|світит\S*|светит\S*|мига\S*|блима\S*|загор\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?:гори\S*|світит\S*|светит\S*|мига\S*|блима\S*|загор\S*)\s+(?:датчик\S*|сенсор\S*|індикатор\S*|индикатор\S*|лампочк\S*|значок\S*)\s+(?:тиску|давлени\S*)\s+(?:(?:в|у)\s+)?(?:шин\S*|колес\S*|колiс\S*|коліс\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))`, 'i', 1);
// Backlog 348 (Blickwinkel „Fahrerhaus lässt sich nicht abschließen – Zentralverriegelung oder Schlüssel defekt“): Hinweise (Leitung anrufen, vor allem vor
// Pause/Ruhezeit/Abstellen; Fahrerhaus nicht offen unbeaufsichtigt, Schlüssel/Papiere/Tankkarte/Wertsachen nicht darin; Schloss/Schlüssel nicht mit Gewalt, abgebrochenes
// Stück nicht selbst herausholen; welche Tür, was genau, Foto; Auswahl „Kann das Fahrzeug fahren?“) – reine Information, keine Frist.
// „Schlüssel verloren“ bleibt beim Schlüssel-/Papiere-Hinweis; „Schlüssel abgegeben“, „Zentralverriegelung geht wieder“, „Tür abgeschlossen“ lösen nichts aus
const CABLOCK_HINT = lbRx(String.raw`(?<![a-zäöüß-])(?:funk)?schl(?:ü|ue)ssel(?:s)?\s+(?:(?:hat|ist|die|der)\s+)?(?:batterie|akku)\s+(?:ist\s+)?(?:leer|alle|platt)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced))|(?<![a-zäöüß-])(?:batterie|akku)\s+(?:vom|im|des)\s+(?:funk)?schl(?:ü|ue)ssel(?:s)?\s+(?:ist\s+)?(?:leer|alle|platt)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced))|(?<![a-z-])central\s+locking\s+(?:is\s+)?(?:playing\s+up|acting\s+up|has\s+a\s+mind\s+of\s+its\s+own)(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))|(?<![a-zäöüß-])zentralverriegelung\s+(?:\S+\s+){0,2}?(?:spinnt|spackt|zickt|macht\s+(?:\S+\s+){0,2}?(?:was\s+sie\s+will|faxen|probleme|zicken)|spielt\s+verr(?:ü|ue)ckt|geht\s+mal\s+und\s+mal\s+nicht|(?:schlie(?:ß|ss)t|verriegelt)\s+von\s+selbst)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced))|(?<![a-zäöüß-])t(?:ü|ue|u)rschl(?:oss|(?:ö|oe)sser)\s+(?:\S+\s+){0,2}?(?:hakt|haken|geht\s+(?:nur\s+)?(?:noch\s+)?(?:ganz\s+|sehr\s+)?schwer|schwerg(?:ä|ae)ngig)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced))|(?<![a-zäöüß-])(?:lkw|fahrzeug|fahrerhaus|kabine|zugmaschine)\s+(?:geht|ging)\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?auf(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced))|(?<![a-zäöüß-])(?:krieg|kriege|kriegen|bekomme|bekommen)\s+(?:ich\s+|wir\s+)?(?:den|das)\s+(?:lkw|fahrzeug|fahrerhaus)\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:auf|zu)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced))|(?<![a-zäöüß-])(?:zentralverriegelung|funkschl(?:ü|ue|u)ssel|funkfernbedienung|schl(?:ü|ue|u)sselfernbedienung|(?:fahrzeug|lkw|t(?:ü|ue|u)r)?schl(?:ü|ue|u)ssel|t(?:ü|ue|u)rschloss|t(?:ü|ue|u)rschl(?:ö|oe|o)sser|t(?:ü|ue|u)rverriegelung)(?:s|n)?(?![a-zäöüß])(?![^.;!?]*(?:z(?:ü|ue|u)ndschloss|z(?:ü|ue|u)ndung|lenkradschloss|lenkradsperre))\s+(?:\S+\s+){0,3}?(?:eingefroren|zugefroren|festgefroren|defekt|kaputt|ausgefallen|geht\s+nicht|gehen\s+nicht|funktioniert\s+nicht|reagiert\s+nicht|klemmt|abgebrochen|gebrochen|dreht\s+(?:sich\s+)?nicht|l(?:ä|ae|a)sst\s+sich\s+nicht\s+(?:mehr\s+)?drehen|(?:schlie(?:ß|ss)t|sperrt|verriegelt)\s+(?:\S+\s+)?nicht(?:\s+mehr)?\s+(?:ab|zu)?(?![a-zäöüß])|verriegelt\s+nicht)|(?<![a-zäöüß-])(?:lkw|fahrzeug|fahrerhaus|kabine|zugmaschine|wagen)\s+(?:\S+\s+){0,2}?(?:l(?:ä|ae|a)sst\s+sich|kann\s+(?:ich|man))\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:\S+\s+)?(?:abschlie(?:ß|ss)en|abschlie(?:ß|ss)t|verriegeln|zusperren|absperren)|(?<![a-zäöüß-])schl(?:ü|ue|u)ssel\s+(?:\S+\s+)?(?:im|in\s+der|in\s+dem)\s+(?:t(?:ü|ue|u)r)?schloss\s+(?:\S+\s+)?abgebrochen|(?<![a-z-])(?:central\s+locking|key\s+fob|remote\s+key|door\s+locks?|cab\s+locks?)(?![a-z])\s+(?:\S+\s+){0,2}?(?:not\s+working|doesn['’]?t\s+work|isn['’]?t\s+working|broken|broke|failed|dead|stuck|jammed|snapped|won['’]?t\s+(?:lock|turn|work))(?![a-z])|(?<![a-z-])(?:cab|truck|lorry|vehicle|tractor\s+unit)\s+(?:(?!doors?\s)\S+\s+)?(?:won['’]?t|doesn['’]?t|does\s+not|can['’]?t|cannot|will\s+not)\s+(?:be\s+)?lock(?:ed)?(?![a-z])|(?<![a-z-])key\s+(?:\S+\s+)?(?:snapped|broke\s+off|broken\s+off)\s+(?:\S+\s+)?in\s+(?:the\s+)?(?:\S+\s+)?lock|(?<![а-яіїєґ])(?:центральн\S*\s+замок\S*|брелок\S*|брелк\S*|ключ\S*|замок\s+двер\S*|замк\S*\s+двер\S*|дверн\S*\s+замок\S*)(?![^.;!?]*(?:запалюван|зажиган))\s+(?:\S+\s+){0,2}?(?:застряг\S*|застрял\S*|не\s+працю\S*|не\s+работа\S*|не\s+спрацьову\S*|не\s+срабатыва\S*|зламав\S*|злама[внл]\S*|сломал\S*|сломан\S*|заклин\S*|не\s+поверта\S*|не\s+повора\S*)|(?<![а-яіїєґ])(?:кабін\S*|кабин\S*|машин\S*|вантажівк\S*|грузовик\S*)\s+(?:\S+\s+)?не\s+(?:\S+\s+)?(?:зачиня\S*|закрива\S*|закрыва\S*|запира\S*)\s+на\s+ключ|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-z-])key\s+(?:has\s+|got\s+|is\s+)?(?:broken|broke|snapped)(?:\s+off)?(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![a-z-])(?:broke|snapped)\s+(?:the|my)\s+key(?![a-z])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))`, 'i', 1);
// Backlog 350 (Blickwinkel „Lkw vibriert, schaukelt oder flattert“): Hinweise (vorsichtig verringern, sicher anhalten; von außen ansehen ohne unter das Fahrzeug
// zu greifen – Rad/Reifen/Ladung/Kupplung, Verweis auf Rad- und Reifen-Schritte; Leitung entscheidet, nicht selbst schrauben; ab welcher Geschwindigkeit/Situation, wo
// spürbar, kürzlich Reifenwechsel, Foto; Auswahl „Kann das Fahrzeug fahren?“) – reine Information, keine Frist. „Handy vibriert“, „Sitz vibriert“ (Spurhalteassistent) nicht
const VIBR_HINT = lbRx(String.raw`(?<![a-zäöüß-])(?:lkw|auflieger|anh(?:ä|ae|a)nger|fahrzeug|zugmaschine)\s+(?:\S+\s+){0,2}?eier(?:t|n)(?![a-zäöüß])(?!\s+(?:\S+\s+)?(?:rum|herum)(?![a-zäöüß]))(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced))|(?<![a-zäöüß-])(?<!(?:handy|telefon|smartphone|tablet|sitz|fahrersitz|uhr|phone|seat|телефон|сидіння|сиденье)\s+)(?:vibriert|vibrieren|vibration(?:en)?|schaukelt|schaukeln|aufschaukeln|schaukelt\s+sich\s+auf|flattert|(?:lenkrad)?flattern|rüttelt|ruettelt|rütteln|unwucht|schwingt\s+(?:\S+\s+)?auf|zittert)(?![a-zäöüß])(?!\s+(?:\S+\s+)?(?:nicht\s+mehr|weg(?![a-zäöüß])|behoben|gone|fixed|stopped|no\s+longer))|(?<![a-z-])(?<!(?:handy|telefon|smartphone|tablet|sitz|fahrersitz|uhr|phone|seat|телефон|сидіння|сиденье)\s+)(?:vibrates|vibrating|vibration|vibrations|shakes|shaking|shudders|shuddering|judders|juddering|sways|swaying|wheel\s+imbalance|out\s+of\s+balance)(?![a-z])(?!\s+(?:\S+\s+)?(?:nicht\s+mehr|weg(?![a-zäöüß])|behoben|gone|fixed|stopped|no\s+longer))|(?<![а-яіїєґ])(?<!(?:handy|telefon|smartphone|tablet|sitz|fahrersitz|uhr|phone|seat|телефон|сидіння|сиденье)\s+)(?:вібру\S*|вібрац\S*|трясе|трусить|тряс[её]т|трясет|вибриру\S*|вибрац\S*|розгойду\S*|раскачива\S*|хитає|качає)(?![а-яіїєґ])|(?<![a-zäöüß-])(?:kardanwelle|kardan|gelenkwelle|antriebswelle|mittellager)(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:schl(?:ä|ae|a)gt|klappert|klopft|wackelt|hat\s+spiel|defekt|kaputt|ausgeschlagen)|(?<![a-z-])(?:prop(?:eller)?\s+shaft|drive\s?shaft|driveline)\s+(?:\S+\s+){0,3}?(?:knock\S*|rattl\S*|vibrat\S*|play|loose|broken|damaged)`, 'i', 1);
// Backlog 354 (Blickwinkel „Autotransporter: Ladeetage, Auffahrrampe oder Hydraulik gestört“): Hinweise (Bedienung stoppen, nicht unter angehobene
// Etage/Rampe treten; nicht weiter be-/entladen, Ölaustritt → Leck-Schritte; Leitung entscheidet, nur unterwiesene Bedienschritte; welche Etage/was passiert/Fotos;
// Auswahl „Kann das Fahrzeug fahren?“) – reine Information, keine Frist. „Laderampe angefahren“, „Hydraulik geprüft“, „Etage repariert“ nicht.
const DECK_HINT = lbRx(String.raw`(?<![a-zäöüß-])(?:(?:lade|ober|unter)?etage(?:n)?|lade(?:ebene|deck)(?:n|s)?|ober(?:deck|ebene)|unter(?:deck|ebene)|auffahr(?:rampe|schiene)(?:n)?|rampe(?:n)?\s+hydraulisch|hydraulische(?:n)?\s+(?:rampe|etage|anlage)(?:n)?|hydraulik(?:schlauch|schl(?:ä|ae|a)uche|zylinder|pumpe|anlage|aggregat|leitung)?|hubzylinder)(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:geht\s+(?:\S+\s+)?nicht(?:\s+mehr)?(?![a-zäöüß])|gehen\s+(?:\S+\s+)?nicht(?![a-zäöüß])|f(?:ä|ae|a)hrt\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:hoch|runter|herunter|rauf|aus|ein)|l(?:ä|ae|a)sst\s+sich\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:\S+\s+)?(?:hochfahren|herunterfahren|runterfahren|absenken|senken|heben|anheben|bewegen|ausfahren|einfahren|verriegeln|sichern)|senkt\s+sich\s+(?:\S+\s+)?(?:ab|von\s+selbst|allein)|sackt\s+(?:\S+\s+)?ab|klemmt|h(?:ä|ae|a)ngt\s+fest|blockiert|undicht|leckt|tropft|verliert\s+(?:\S+\s+)?(?:öl|oel|druck)|geplatzt|gerissen|abgerissen|verbogen|defekt|kaputt|ausgefallen|f(?:ä|ae|a)llt\s+aus|funktioniert\s+(?:\S+\s+)?nicht)(?![a-zäöüß])(?!\s+(?:\S+\s+)?(?:nicht\s+mehr|wieder|behoben|repariert|gepr(?:ü|ue|u)ft|fixed|repaired|checked))|(?<![a-z-])(?:(?:upper|lower|top|bottom|loading|car)\s+decks?|decks?|loading\s+ramps?|ramps?|hydraulics|hydraulic\s+(?:system|hose|pump|cylinder|ram|ramp|deck|line)s?)(?![a-z])\s+(?:\S+\s+){0,3}?(?:not\s+working|doesn['’]?t\s+work|isn['’]?t\s+working|won['’]?t\s+(?:lift|lower|go\s+up|go\s+down|move|lock|rise)|will\s+not\s+(?:lift|lower|move|rise)|stuck|jammed|leaking|leaks|burst|failed|broken|dropping|drops|sinking|sinks|keeps\s+(?:dropping|sinking|lowering))(?![a-z])(?!\s+(?:\S+\s+)?(?:nicht\s+mehr|wieder|behoben|repariert|gepr(?:ü|ue|u)ft|fixed|repaired|checked))|(?<![а-яіїєґ])(?:гідравлі\S*|гидравли\S*|аппарел\S*|рамп[аиуі]\S*|верхн\S*\s+(?:ярус|поверх|площадк|платформ)\S*|нижн\S*\s+(?:ярус|поверх|площадк|платформ)\S*|ярус\S*|гідрошланг\S*|гидрошланг\S*)\s+(?:\S+\s+){0,3}?(?:не\s+працю\S*|не\s+работа\S*|тече|теч[её]т|течет|протіка\S*|протека\S*|заклини\S*|заїло|заело|не\s+підніма\S*|не\s+поднима\S*|не\s+опуска\S*|сам\S*\s+опуска\S*|опуска\S*\s+сам\S*|просіда\S*|проседа\S*|злама[вл]\S*|сломал\S*|лопнув|лопнул\S*|порвал\S*|прорвал\S*)`, 'i', 1);
const FLOOR_HINT = lbRx(String.raw`(?<![a-zäöüß-])(?<!(?:kein|keine|keinen|ohne)\s+)(?:(?:lade|laderaum|auflieger|anh(?:ä|ae)nger|koffer|aufbau|holz|siebdruck)boden|ladefl(?:ä|ae)che|bodenplatten?|bodenbretter|bodenbrett|(?:seiten)?bordw(?:a|ä|ae)nd(?:e)?|seitenw(?:a|ä|ae)nd(?:e)?|stirnw(?:a|ä|ae)nd(?:e)?|r(?:ü|ue)ckw(?:a|ä|ae)nd(?:e)?|(?:koffer|aufbau)w(?:a|ä|ae)nd(?:e)?|(?:auflieger|anh(?:ä|ae)nger|koffer|aufbau)dach|(?:mittel|eck|steck)?runge(?:n)?|boden\s+(?:im|vom|des|der|in\s+(?:der|dem|den))\s+(?:\S+\s+)?(?:auflieger|anh(?:ä|ae)nger|laderaum|koffer|trailer|aufbau|k(?:ü|ue)hlkoffer|k(?:ü|ue)hlauflieger)|dach\s+(?:vom|des)\s+(?:\S+\s+)?(?:auflieger|anh(?:ä|ae)nger|koffer|aufbau))(?:s|es|n)?(?![a-zäöüß])\s+(?:(?!nicht\s|kein)\S+\s+){0,3}?(?:gebrochen|durchgebrochen|eingebrochen|angebrochen|abgebrochen|gerissen|eingerissen|aufgerissen|kaputt|defekt|besch(?:ä|ae|a)digt|verbogen|eingedr(?:ü|ue)ckt|eingebeult|verbeult|zerbeult|verzogen|abgerissen|morsch|verfault|durchgefault|durchgerostet|aufgeplatzt|durchgetreten|zersplittert|gesplittert|l(?:ö|oe)chrig|gibt\s+nach|hat\s+(?:\S+\s+)?(?:loch|l(?:ö|oe)cher|riss|risse))(?![a-zäöüß])(?![,;.]?\s+(?:\S+\s+)?(?:repariert|getauscht|ersetzt|erneuert|behoben|geschwei(?:ß|ss)t|in\s+ordnung|fixed|repaired|replaced))|(?<![a-zäöüß-])(?:loch|l(?:ö|oe)cher|riss|risse|bruch)\s+(?:im|in\s+(?:der|den|dem))\s+(?:\S+\s+)?(?:(?:lade|laderaum|auflieger|anh(?:ä|ae)nger|koffer|aufbau|holz|siebdruck)boden|ladefl(?:ä|ae)che|bodenplatten?|bodenbretter|bodenbrett|(?:seiten)?bordw(?:a|ä|ae)nd(?:e)?|seitenw(?:a|ä|ae)nd(?:e)?|stirnw(?:a|ä|ae)nd(?:e)?|r(?:ü|ue)ckw(?:a|ä|ae)nd(?:e)?|(?:koffer|aufbau)w(?:a|ä|ae)nd(?:e)?|(?:auflieger|anh(?:ä|ae)nger|koffer|aufbau)dach|(?:mittel|eck|steck)?runge(?:n)?|boden\s+(?:im|vom|des|der|in\s+(?:der|dem|den))\s+(?:\S+\s+)?(?:auflieger|anh(?:ä|ae)nger|laderaum|koffer|trailer|aufbau|k(?:ü|ue)hlkoffer|k(?:ü|ue)hlauflieger)|dach\s+(?:vom|des)\s+(?:\S+\s+)?(?:auflieger|anh(?:ä|ae)nger|koffer|aufbau))(?![a-zäöüß])|(?<![a-zäöüß-])(?:besch(?:ä|ae|a)digte|kaputte|gebrochene|verbogene|eingedr(?:ü|ue)ckte|morsche|durchgebrochene)(?:n|r|s)?\s+(?:(?:lade|laderaum|auflieger|anh(?:ä|ae)nger|koffer|aufbau|holz|siebdruck)boden|ladefl(?:ä|ae)che|bodenplatten?|bodenbretter|bodenbrett|(?:seiten)?bordw(?:a|ä|ae)nd(?:e)?|seitenw(?:a|ä|ae)nd(?:e)?|stirnw(?:a|ä|ae)nd(?:e)?|r(?:ü|ue)ckw(?:a|ä|ae)nd(?:e)?|(?:koffer|aufbau)w(?:a|ä|ae)nd(?:e)?|(?:auflieger|anh(?:ä|ae)nger|koffer|aufbau)dach|(?:mittel|eck|steck)?runge(?:n)?|boden\s+(?:im|vom|des|der|in\s+(?:der|dem|den))\s+(?:\S+\s+)?(?:auflieger|anh(?:ä|ae)nger|laderaum|koffer|trailer|aufbau|k(?:ü|ue)hlkoffer|k(?:ü|ue)hlauflieger)|dach\s+(?:vom|des)\s+(?:\S+\s+)?(?:auflieger|anh(?:ä|ae)nger|koffer|aufbau))(?![a-zäöüß])(?![,;.]?\s+(?:\S+\s+)?(?:repariert|getauscht|ersetzt|erneuert|behoben|geschwei(?:ß|ss)t|in\s+ordnung|fixed|repaired|replaced))|(?<![a-z-])(?:(?:trailer|load(?:ing)?|cargo|box|body|wooden)\s+floor|floor\s?boards?|floor\s+(?:of|in)\s+the\s+(?:trailer|box|body|load\s+space|truck)|side\s?(?:boards?|walls?|panels?)|drop\s?sides?|tail\s?boards?|headboards?|bulkheads?|front\s+walls?|stanchions?|trailer\s+(?:walls?|sides?|body))(?![a-z])\s+(?:(?!not\s)\S+\s+){0,3}?(?:broken|cracked|damaged|bent|dented|holed|rotten|torn|split|smashed|punctured|caved\s+in|gave\s+way|giving\s+way|has\s+(?:a\s+)?holes?)(?![a-z])(?![,;.]?\s+(?:\S+\s+)?(?:repariert|getauscht|ersetzt|erneuert|behoben|geschwei(?:ß|ss)t|in\s+ordnung|fixed|repaired|replaced))|(?<![a-z-])(?:hole|holes|crack|cracks)\s+in\s+the\s+(?:\S+\s+)?(?:floor|side\s?wall|side\s?board|headboard|bulkhead)(?![a-z])(?!\s+mat)|(?<![a-z-])(?:broken|cracked|damaged|bent|rotten|dented)\s+(?:(?:trailer|load(?:ing)?|cargo|box|body|wooden)\s+floor|floor\s?boards?|floor\s+(?:of|in)\s+the\s+(?:trailer|box|body|load\s+space|truck)|side\s?(?:boards?|walls?|panels?)|drop\s?sides?|tail\s?boards?|headboards?|bulkheads?|front\s+walls?|stanchions?|trailer\s+(?:walls?|sides?|body))(?![a-z])|(?<![а-яіїєґё])(?:(?:підлог\S*|пол(?:ы|а|у)?)\s+(?:(?:в|у)\s+)?(?:причеп|напівпричеп|полуприцеп|прицеп|кузов|фургон|трейлер)\S*|борт(?:ик)?(?:а|и|ы|у)?(?![а-яіїєґё])|стінк\S*\s+(?:причеп|напівпричеп|кузов|фургон)\S*|стенк\S*\s+(?:прицеп|полуприцеп|кузов|фургон)\S*)\s+(?:\S+\s+){0,3}?(?:злама[внл]|сломан|проломлен|пробит|пошкоджен|поврежден|погнут|вигнут|прогнил|гнил|тріснул|треснул|дірк|дыр|продавлен|вм['’ʼ]?ят|прогнув|прогнул|провалил|провалив)\S*(?![^.;!?]*(?:відремонт\S*|отремонт\S*|замінил\S*|замінен\S*|заменил\S*|заменен\S*|усунул\S*|устранил\S*|полагодил\S*|починил\S*|зварил\S*|заварил\S*))|(?<![a-zäöüß-])(?:runge|rungen|einstecklatte|einstecklatten|einsteckbretter|einsteckbrett)(?![a-zäöüß])\s+(?:(?:hinten|vorne|vorn|links|rechts|ist|sind|eine|einer|komplett|ganz|schon)\s+){0,2}(?:gebrochen|abgebrochen|kaputt|gesplittert)(?![a-zäöüß])(?!\s+(?:mehr\s+)?nicht)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|abgedichtet|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|patched|sealed|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))|(?<![a-zäöüß-])(?:loch|l(?:ö|oe)cher|riss)\s+im\s+(?:lade)?boden(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|abgedichtet|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|patched|sealed|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))`, 'i', 1);
// Backlog 716: Zentralschmieranlage leer/Fehler oder Sattelkupplung trocken – eigene Schritte (Fett nur laut Betriebsanleitung, keine Sorte/Menge/Intervalle)
const GREASE_HINT = lbRx(String.raw`(?<![a-zäöüß-])(?:zentralschmier(?:ung|anlage|pumpe|system)|zentralschmierungsanlage|schmieranlage|schmierpumpe|schmiersystem|fettpumpe|fettbeh(?:ä|ae)lter|fettvorrat)(?![a-zäöüß])(?![^.;!?]*(?:beim\s+service|in\s+der\s+werkstatt|behoben|repariert))\s+(?:\S+\s+){0,3}?(?:leer|fast\s+leer|fehler\S*|st(?:ö|oe)rung|defekt|kaputt|ausgefallen|geht\s+nicht|funktioniert\s+nicht|f(?:ö|oe)rdert\s+nicht|pumpt\s+nicht|warnung|blinkt|leuchtet|nachf(?:ü|ue)llen|nachgef(?:ü|ue)llt|aufgef(?:ü|ue)llt)(?![a-zäöüß])|(?<![a-zäöüß-])(?:sattelplatte|sattelkupplung|k(?:ö|oe)nigszapfen)\S*\s+(?:\S+\s+){0,3}?(?:trocken|nicht\s+(?:\S+\s+)?(?:gefettet|geschmiert|abgeschmiert)|ungefettet|ohne\s+fett|muss\s+(?:\S+\s+)?(?:gefettet|abgeschmiert)\s+werden)(?![a-zäöüß])|(?<![a-z])(?:central\s+lubrication(?:\s+system)?|auto[\s-]?lube|grease\s+(?:pump|reservoir|system)|lubrication\s+(?:pump|system))\s+(?:\S+\s+){0,3}?(?:empty|low|fault|error|warning|failed|failure|not\s+working|broken)(?![a-z])|(?<![a-z])fifth[\s-]wheel(?:\s+plate)?\s+(?:\S+\s+){0,2}?(?:dry|not\s+greased|needs\s+greas\S*|without\s+grease)(?![a-z])|(?<![а-яіїєґ])(?:(?:централізован|центральн)\S*\s+(?:змащ|смаз)\S*|(?:систем|насос)\S*\s+(?:змащ|смаз)\S*)\s+(?:\S+\s+){0,3}?(?:порожн\S*|пуст\S*|помилк\S*|ошибк\S*|несправн\S*|не\s+працю\S*|не\s+работ\S*|злама[вл]\S*|сломал\S*)(?![^.;!?]*(?:відремонт\S*|отремонт\S*|замінил\S*|замінен\S*|заменил\S*|заменен\S*|усунул\S*|устранил\S*|полагодил\S*|починил\S*))|(?<![а-яіїєґ])(?:плит\S*\s+)?(?:сідл\S*|седл\S*)\s+(?:\S+\s+){0,3}?(?:сух\S*|не\s+змащ\S*|без\s+мастил\S*|не\s+смаз\S*)(?![^.;!?]*(?:відремонт\S*|отремонт\S*|замінил\S*|замінен\S*|заменил\S*|заменен\S*|усунул\S*|устранил\S*|полагодил\S*|починил\S*))`, 'i', 1);
// Backlog 718: Kabel blank/durchgescheuert/verschmort, Kurzschluss, Sicherung fliegt raus, Anhängerkabel beschädigt – eigene Schritte (nichts anfassen/flicken/überbrücken)
const ELEC_HINT = lbRx(String.raw`(?<![a-zäöüß-])(?:(?:strom|batterie|masse|plus|anh(?:ä|ae|a)nger|auflieger|spiral|verbindungs|licht|lampen|elektro|(?:abs|ebs)[\s-]?)?kabel(?:baum|b(?:ä|ae)ume|strang|str(?:ä|ae)nge|n|s)?|verkabelung|elektrik|spirale|wendel(?:kabel)?|batteriepol(?:e)?|polklemme(?:n)?|(?:anh(?:ä|ae|a)nger|auflieger)(?:stecker|steckdose)|(?:stecker|steckdose)\s+(?:(?:am|vom|zum|des|der)\s+)?(?:anh(?:ä|ae|a)nger|auflieger)\S*)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|angefressen|angebissen|abgebissen|angeknabbert))\s+(?:\S+\s+){0,3}?(?:blank|liegt\s+(?:\S+\s+)?frei|durchgescheuert|aufgescheuert|angescheuert|gescheuert|scheuert|schmort|schmoren|angeschmort|verschmort|geschmolzen|eingeklemmt|gequetscht|abgerissen|gerissen|lose|locker|h(?:ä|ae)ngt\s+(?:\S+\s+)?(?:herunter|runter|lose)|korrodiert|oxidiert|defekt|kaputt|spinnt|funkt|wackelkontakt|kurzschluss)(?![a-zäöüß])|(?<![a-zäöüß-])(?:kurzschluss|kabelbrand|schmorstelle)(?![a-zäöüß])(?![^.;!?]*(?:behoben|repariert))|(?<![a-zäöüß-])sicherung(?:en)?(?![a-zäöüß])\s+(?:\S+\s+){0,3}?(?:fliegt|fliegen|knallt|brennt\s+(?:\S+\s+)?durch|brennen\s+(?:\S+\s+)?durch|springt\s+(?:\S+\s+)?(?:raus|heraus)|l(?:ö|oe)st\s+(?:\S+\s+)?aus|durchgebrannt)(?![a-zäöüß])|(?<![a-z])(?:exposed|bare|chafed|frayed|melted|loose|damaged)\s+(?:\S+\s+)?(?:wires?|wiring|cables?|harness)(?![a-z])|(?<![a-z])(?:wires?|wiring|cables?|(?:wiring\s+)?harness|trailer\s+(?:cable|lead|plug|socket|connector)s?|suzie|susie)\s+(?:\S+\s+){0,2}?(?:exposed|bare|chafed|frayed|melt\S*|burnt|torn|ripped|damaged|broken|hanging\s+(?:down|loose))(?![a-z])|(?<![a-z])fuses?\s+(?:\S+\s+){0,2}?(?:keeps?\s+blowing|blow(?:s|ing)|blown)(?![a-z])|(?<![a-z])short\s+circuit|(?<![а-яіїєґ])(?:кабел\S*|провод\S*|проводк\S*|джгут\S*|спірал\S*|розетк\S*\s+причеп\S*)\s+(?:\S+\s+){0,3}?(?:оголен\S*|оголив\S*|перетерт\S*|протерт\S*|розплавив\S*|оплавив\S*|оплавлен\S*|обірван\S*|обірвав\S*|відірван\S*|відірвав\S*|звиса\S*|пошкоджен\S*|плавиться)|(?<![а-яіїєґ])запобіжник\S*\s+(?:\S+\s+){0,2}?(?:вибива\S*|перегора\S*|згорів|згора\S*)|(?<![а-яіїєґ])(?:коротк\S*\s+замикан\S*|замикання)|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?:роз['’]?єм\S*|розетк\S*|разъ[её]м\S*|штекер\S*|вилк\S*)\s+(?:\S+\s+)?(?:причеп\S*|напівпричеп\S*|прицеп\S*|полуприцеп\S*)\s+(?:\S+\s+)?(?:злама\S*|слома\S*|не\s+працю\S*|не\s+работа\S*|згорі\S*|сгоре\S*|обірва\S*|оборва\S*|розбит\S*|разбит\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))|(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|found|gefunden|знайшли|нашли|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))(?<![а-яіїєґё])(?:дріт|дроти|провід|проводи|провод\S*|кабел\S*|джгут\S*|жгут\S*)\s+(?:\S+\s+)?(?:перетер\S*|протер\S*|обгорі\S*|обгоре\S*|оплави\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|found|gefunden|знайшли|нашли|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))`, 'i', 1);
// Backlog 720: Batterie ausgelaufen/gast/aufgebläht, Batteriekasten-Deckel fehlt/lose, Batterietrennschalter defekt – eigene Schritte (Säure ätzend, Gase, keine Funken;
// Leitung entscheidet). Leere Batterie → Startprobleme, lose Kabel/korrodierte Pole → Elektrik. „Batterie getauscht“, „Hauptschalter repariert“ nicht.
const BATT_HINT = lbRx(String.raw`(?<![a-zäöüß-])(?:(?:starter|lkw-?|fahrzeug|anh(?:ä|ae|a)nger)?batterie(?:n)?)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|gereinigt|fixed|repaired|replaced|відремонт\S*|замінен\S*|отремонт\S*|заменен\S*))\s+(?:\S+\s+){0,3}?(?:ausgelaufen|l(?:ä|ae|a)uft\s+aus|undicht|leckt|tropft|s(?:ä|ae|a)ure|gast|zischt|stinkt|riecht|aufgebl(?:ä|ae|a)ht|bl(?:ä|ae|a)ht\s+(?:\S+\s+)?auf|gew(?:ö|oe|o)lbt|ausgebeult|sehr\s+hei(?:ß|ss)|hei(?:ß|ss)|kocht|blubbert|gerissen|gebrochen|geplatzt|explodiert)(?![a-zäöüß])|(?<![a-zäöüß-])(?:batteries(?:ä|ae|a)ure|s(?:ä|ae|a)ure\s+(?:aus|an|von)\s+(?:der\s+)?batterie)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|gereinigt|fixed|repaired|replaced|відремонт\S*|замінен\S*|отремонт\S*|заменен\S*))|(?<![a-zäöüß-])(?:batterie(?:kasten|k(?:ä|ae|a)sten|fach|deckel|kastendeckel|abdeckung|halter(?:ung)?))(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|gereinigt|fixed|repaired|replaced|відремонт\S*|замінен\S*|отремонт\S*|заменен\S*))\s+(?:\S+\s+){0,3}?(?:fehlt|fehlen|weg(?![a-zäöüß])|verloren|offen|steht\s+offen|lose|locker|klappert|kaputt|defekt|gebrochen|abgebrochen|abgerissen|gerissen|geht\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?zu|schlie(?:ß|ss)t\s+nicht|h(?:ä|ae|a)lt\s+nicht)(?![a-zäöüß])|(?<![a-zäöüß-])(?:batterie(?:haupt|trenn)?schalter|batterietrenner|hauptschalter|trennschalter)(?![a-zäöüß])(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|gereinigt|fixed|repaired|replaced|відремонт\S*|замінен\S*|отремонт\S*|заменен\S*))\s+(?:\S+\s+){0,3}?(?:defekt|kaputt|klemmt|abgebrochen|geht\s+(?:\S+\s+)?nicht|funktioniert\s+(?:\S+\s+)?nicht|schaltet\s+(?:\S+\s+)?nicht|l(?:ä|ae|a)sst\s+sich\s+(?:\S+\s+)?nicht\s+(?:mehr\s+)?(?:\S+\s+)?(?:einschalten|ausschalten|drehen|bet(?:ä|ae|a)tigen|umlegen|schalten))(?![a-zäöüß])|(?<![a-z])(?:truck\s+)?batter(?:y|ies)(?![a-z])(?![^.;!?]*(?:fixed|repaired|replaced))\s+(?:\S+\s+){0,2}?(?:leak\S*|acid|swollen|swelling|bulging|hissing|gassing|smells?|smelling|stinks?|cracked|boiling|(?:very\s+)?hot|overheat\S*)(?![a-z])(?![^.;!?]*(?:fixed|repaired|replaced))|(?<![a-z])battery\s+acid(?![a-z])|(?<![a-z])battery\s+(?:box|cover|lid|compartment)s?\s+(?:\S+\s+){0,2}?(?:missing|gone|lost|open|loose|broken|cracked|won['’]?t\s+close)(?![a-z])|(?<![a-z])(?:battery\s+)?(?:isolator|master|main|disconnect|cut-?off)\s+switch\s+(?:\S+\s+){0,2}?(?:broken|faulty|stuck|not\s+working|doesn['’]?t\s+work|won['’]?t\s+(?:turn|switch|move))(?![a-z])|(?<![а-яіїєґ])(?:акумулятор|аккумулятор|акб)\S*\s+(?:\S+\s+){0,3}?(?:тече|протіка\S*|протека\S*|потік|протік|потек|протек|потекл\S*|протекл\S*|кислот\S*|здув\S*|роздув\S*|вздул\S*|раздул\S*|шипить|шипит|смердить|воняє|воняет|пахне|пахнет|тріснув|тріснул\S*|треснул\S*|кипить|кипит|гаряч\S*|горяч\S*)|(?<![а-яіїєґ])кислот\S*\s+(?:з\s+|из\s+)?(?:акумулятор|аккумулятор)\S*|(?<![а-яіїєґ])(?:кришк\S*|ящик\S*|короб\S*)\s+(?:\S+\s+)?(?:акумулятор|аккумулятор|акб)\S*\s+(?:\S+\s+){0,2}?(?:немає|нема|нет|відсутн\S*|отсутств\S*|відкрит\S*|открыт\S*|злама[внл]\S*|сломан\S*|загуб\S*|потерял\S*|не\s+закрива\S*|бовта\S*|болта\S*)|(?<![а-яіїєґ])(?:вимикач\S*|выключател\S*)\s+(?:маси|массы|акумулятор\S*|аккумулятор\S*|акб)\s+(?:\S+\s+){0,2}?(?:не\s+працю\S*|не\s+работа\S*|злама[внл]\S*|сломан\S*|несправн\S*|неисправ\S*|заїло|заело|не\s+вмика\S*|не\s+включа\S*|не\s+вимика\S*|не\s+выключа\S*)`, 'i', 1);
const SPARE_HINT = lbRx(String.raw`(?<![a-zäöüß-])(?:ersatzrad|reserverad|ersatzreifen|reservereifen)(?:es|s)?(?![a-zäöüß])(?![^.;!?]*(?:wieder\s+da|wieder\s+vorhanden|gefunden|repariert|ersetzt|erneuert|getauscht|gewechselt|behoben|montiert|aufgezogen|fixed|repaired|replaced|found|fitted|відремонт\S*|замінил\S*|замінен\S*|знайшл\S*|отремонт\S*|заменил\S*|заменен\S*|нашл\S*))\s+(?:\S+\s+){0,3}?(?:fehlt|fehlen|weg(?![a-zäöüß])|nicht\s+(?:mehr\s+)?(?:da|vorhanden|an\s+bord|dabei)(?![a-zäöüß])|platt|luftleer|ohne\s+luft|hat\s+keine\s+luft|kaputt|defekt|besch(?:ä|ae|a)digt|abgefahren|por(?:ö|oe)s|rissig|unbrauchbar|klemmt|passt\s+nicht)(?![a-zäöüß])|(?<![a-zäöüß-])(?:kein|keinen|ohne)\s+(?:ersatzrad|reserverad|ersatzreifen|reservereifen)(?:es|s)?(?![a-zäöüß])(?![^.;!?]*(?:wieder\s+da|wieder\s+vorhanden|gefunden|repariert|ersetzt|erneuert|getauscht|gewechselt|behoben|montiert|aufgezogen|fixed|repaired|replaced|found|fitted|відремонт\S*|замінил\S*|замінен\S*|знайшл\S*|отремонт\S*|заменил\S*|заменен\S*|нашл\S*))|(?<![a-zäöüß-])(?:ersatzrad|reserverad)(?:halter|halterung|winde|korb|tr(?:ä|ae|a)ger)(?:s|n)?(?![a-zäöüß])(?![^.;!?]*(?:wieder\s+da|wieder\s+vorhanden|gefunden|repariert|ersetzt|erneuert|getauscht|gewechselt|behoben|montiert|aufgezogen|fixed|repaired|replaced|found|fitted|відремонт\S*|замінил\S*|замінен\S*|знайшл\S*|отремонт\S*|заменил\S*|заменен\S*|нашл\S*))\s+(?:\S+\s+){0,3}?(?:klemmt|hakt|eingerostet|festgerostet|fest(?![a-zäöüß])|kaputt|defekt|geht\s+nicht\s+(?:auf|runter|herunter|ab)|l(?:ä|ae|a)(?:ss|ß)t\s+sich\s+nicht\s+(?:\S+\s+)?(?:(?:ö|oe)ffnen|ablassen|herunterlassen|l(?:ö|oe)sen|kurbeln))(?![a-zäöüß])|(?<![a-z-])spare\s+(?:wheel|tyre|tire)s?(?:\s+(?:carrier|winch|cradle))?(?![^.;!?]*(?:wieder\s+da|wieder\s+vorhanden|gefunden|repariert|ersetzt|erneuert|getauscht|gewechselt|behoben|montiert|aufgezogen|fixed|repaired|replaced|found|fitted|відремонт\S*|замінил\S*|замінен\S*|знайшл\S*|отремонт\S*|заменил\S*|заменен\S*|нашл\S*))\s+(?:\S+\s+){0,2}?(?:missing|gone|flat|damaged|unusable|stuck|jammed|seized|not\s+there|won['’]?t\s+(?:come\s+)?(?:down|off|open))(?![a-z])|(?<![a-z-])(?:no|without(?:\s+a)?)\s+spare\s+(?:wheel|tyre|tire)(?![a-z])(?![^.;!?]*(?:wieder\s+da|wieder\s+vorhanden|gefunden|repariert|ersetzt|erneuert|getauscht|gewechselt|behoben|montiert|aufgezogen|fixed|repaired|replaced|found|fitted|відремонт\S*|замінил\S*|замінен\S*|знайшл\S*|отремонт\S*|заменил\S*|заменен\S*|нашл\S*))|(?<![а-яіїєґ])(?:запасн\S*\s+колес\S*|запаск\S*)(?![^.;!?]*(?:wieder\s+da|wieder\s+vorhanden|gefunden|repariert|ersetzt|erneuert|getauscht|gewechselt|behoben|montiert|aufgezogen|fixed|repaired|replaced|found|fitted|відремонт\S*|замінил\S*|замінен\S*|знайшл\S*|отремонт\S*|заменил\S*|заменен\S*|нашл\S*))\s+(?:\S+\s+){0,2}?(?:відсутн|нема|спущ|пробит|пошкодж|злама[внл]|заклин|отсутств|поврежд|слома|нет(?![а-яіїєґ]))\S*|(?<![а-яіїєґ])(?:немає|нема|без|нет)\s+(?:запасн\S*\s+колес\S*|запаск\S*)(?![^.;!?]*(?:wieder\s+da|wieder\s+vorhanden|gefunden|repariert|ersetzt|erneuert|getauscht|gewechselt|behoben|montiert|aufgezogen|fixed|repaired|replaced|found|fitted|відремонт\S*|замінил\S*|замінен\S*|знайшл\S*|отремонт\S*|заменил\S*|заменен\S*|нашл\S*))`, 'i', 1);
const HINT_ORDER = ['fire', 'acc', 'wild', 'hitrun', 'vandal', 'storm', 'bridge', 'fixobj', 'stow', 'roofice', 'trlr', 'exhaust', 'flat', 'tyre', 'wheel', 'brake', 'parkbrake', 'pedal', 'steer', 'vibr', 'coupling', 'grease', 'cabtilt', 'susp', 'step', 'injury', 'loose', 'underrun', 'load', 'lashgear', 'deck', 'floor', 'leak', 'pfilter', 'warnlight', 'marten', 'gelfuel', 'elec', 'batt', 'engine', 'oillevel', 'gear', 'dash', 'telem', 'adas', 'seat', 'cabkit', 'mirror', 'lights', 'contour', 'visib', 'climate', 'door', 'window', 'cableak', 'cablock', 'pest', 'nest', 'stuck', 'safetykit', 'spare', 'roadchk', 'theft', 'tow', 'reefer', 'fuel', 'fuelcap', 'dryfuel', 'nostart', 'tarp', 'custdmg', 'cargo', 'glass', 'lost', 'numplate', 'sticker', 'fuelcard', 'toll', 'tacho'];
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
  // Backlog 825: Mangel bei der Kontrolle des fest gekoppelten Fahrzeugs gemeldet (Backlog 824) – dessen Kennzeichen nennen
  const via = si.via ? ` · <span data-srcvia>${esc(t('srci_via').replace('{v}', `${t(si.via.kind === 'anhaenger' ? 'trailer' : 'truck')} ${si.via.plate}`))}</span>` : '';
  let h = `<dt>${esc(t('srci_lbl'))}</dt><dd data-srcinsp>${esc(t('srci_val').replace('{d}', fmtDT(si.performed_at)))}${late}${via}${km}</dd>`;
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
 
const tfill = (k, o) => Object.entries(o).reduce((a, [x, y]) => a.split(`{${x}}`).join(String(y)), t(k));
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
    <div id="dryfuel" class="panel" hidden role="status"><b>${esc(t('dryfuel_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('dryfuel_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
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
    <div id="phlater_w" hidden><label class="check" style="margin-top:6px"><input type="checkbox" id="phlater"> ${esc(t('photos_later_opt'))}</label><p class="small muted" style="margin:2px 0 0">${esc(t('photos_later_hint'))}</p></div>
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
  const hints = () => { const dv = recurFix($('#d').value); const dsk = noSticker(dv); const dck = noCabkit(dv); $('#trlr').hidden = !trailerHint(); const dfx = noFixed(dv); const wild = WILD_HINT.test(dv); $('#wild').hidden = !wild; const hitrun = !wild && HITRUN_HINT.test(dv); $('#hitrun').hidden = !hitrun; const bridge = !wild && !hitrun && BRIDGE_HINT.test(dv); $('#bridge').hidden = !bridge; const injhit = INJURY_HINT.test(dv); const accReal = ACC_HINT.test(injhit ? dv.replace(INJURY_WORDS, ' ') : dv); $('#acc').hidden = wild || hitrun || bridge || !accReal; $('#tacho').hidden = !TACHO_HINT.test(dv); const theft = THEFT_HINT.test(dv); $('#theft').hidden = !theft; $('#vandal').hidden = theft || hitrun || !VANDAL_HINT.test(dv); $('#tow').hidden = !TOW_HINT.test(dv); $('#stow').hidden = !STOW_HINT.test(dv); $('#roofice').hidden = !ROOFICE_HINT.test(dv); $('#glass').hidden = !GLASS_HINT.test(dsk); $('#lost').hidden = !LOST_HINT.test(dv); $('#numplate').hidden = !NUMPLATE_HINT.test(dsk); $('#sticker').hidden = !STICKER_HINT.test(dv); $('#fuel').hidden = !FUEL_HINT.test(dv); fuelDrv(); $('#flat').hidden = !FLAT_HINT.test(noAux(dv)); $('#roadchk').hidden = !ROADCHK_HINT.test(dv); $('#nostart').hidden = !NOSTART_HINT.test(noAux(dfx)); $('#pfilter').hidden = !PFILTER_HINT.test(dfx); $('#warnlight').hidden = !WARNLIGHT_HINT.test(dfx); $('#leak').hidden = !LEAK_HINT.test(dv); $('#marten').hidden = !MARTEN_HINT.test(dv); $('#storm').hidden = !STORM_HINT.test(dv); $('#custdmg').hidden = !CUSTDMG_HINT.test(dv); { const fixobj = !wild && !hitrun && !bridge && $('#custdmg').hidden && FIXOBJ_HINT.test(dv); $('#fixobj').hidden = !fixobj; $('#acc').hidden ||= fixobj; } $('#cargo').hidden = !CARGO_HINT.test(dv); $('#fire').hidden = !FIRE_HINT.test(dv); $('#reefer').hidden = !REEFER_HINT.test(dck); $('#brake').hidden = !BRAKE_HINT.test(noParkbrake(dv)); $('#parkbrake').hidden = !PARKBRAKE_HINT.test(dv); $('#pedal').hidden = !PEDAL_HINT.test(dv); { const nest = NEST_HINT.test(dv); $('#nest').hidden = !nest; $('#pest').hidden = !PEST_HINT.test(nest ? dv.replace(NEST_WORDS, ' ') : dv); } $('#tarp').hidden = !TARP_HINT.test(dck); $('#load').hidden = !LOAD_HINT.test(dv); $('#lashgear').hidden = !LASHGEAR_HINT.test(dv); $('#contour').hidden = !CONTOUR_HINT.test(dv); $('#mirror').hidden = !MIRROR_HINT.test(dfx); $('#coupling').hidden = !COUPLING_HINT.test(dv); $('#lights').hidden = !LIGHTS_HINT.test(dck); $('#door').hidden = !DOOR_HINT.test(dfx); $('#stuck').hidden = !STUCK_HINT.test(dv); $('#visib').hidden = !VISIB_HINT.test(dfx); $('#step').hidden = !STEP_HINT.test(dfx); $('#injury').hidden = !injhit || wild || hitrun || bridge || accReal || !$('#step').hidden || !$('#stow').hidden; { let dl = dsk; if (!$('#numplate').hidden) dl = dl.replace(NUMPLATE_WORDS, ' '); if (!$('#step').hidden) dl = dl.replace(STEP_WORDS, ' '); $('#loose').hidden = !LOOSE_HINT.test(dl); } $('#adas').hidden = !ADAS_HINT.test(dv); $('#steer').hidden = !STEER_HINT.test(dv); $('#engine').hidden = !ENGINE_HINT.test(noAux(dv)); $('#oillevel').hidden = !OILLEVEL_HINT.test(dv); $('#grease').hidden = !GREASE_HINT.test(dv); $('#elec').hidden = !ELEC_HINT.test(dfx); $('#batt').hidden = !BATT_HINT.test(noAux(dfx)); $('#susp').hidden = !SUSP_HINT.test(dv); $('#gear').hidden = !GEAR_HINT.test(dfx); $('#seat').hidden = !SEAT_HINT.test(dfx); $('#cabkit').hidden = !CABKIT_HINT.test(dfx); $('#dash').hidden = !DASH_HINT.test(dfx); $('#telem').hidden = !TELEM_HINT.test(dfx); $('#exhaust').hidden = !EXHAUST_HINT.test(dfx); $('#cabtilt').hidden = !CABTILT_HINT.test(dv); $('#gelfuel').hidden = !GELFUEL_HINT.test(dv); $('#dryfuel').hidden = !DRYFUEL_HINT.test(noAux(dv)); $('#safetykit').hidden = !SAFETYKIT_HINT.test(dv); $('#spare').hidden = !SPARE_HINT.test(dv); $('#wheel').hidden = !WHEEL_HINT.test(noAux(dv)); $('#toll').hidden = !TOLL_HINT.test(dfx); $('#climate').hidden = !CLIMATE_HINT.test(dfx); $('#window').hidden = !WINDOW_HINT.test(dfx); $('#cableak').hidden = !CABLEAK_HINT.test(dfx); $('#fuelcap').hidden = !FUELCAP_HINT.test(dfx); $('#fuelcard').hidden = !FUELCARD_HINT.test(dv); $('#underrun').hidden = !UNDERRUN_HINT.test(dv); $('#tyre').hidden = !TYRE_HINT.test(noAux(dv)); $('#cablock').hidden = !CABLOCK_HINT.test(dfx); $('#vibr').hidden = !VIBR_HINT.test(dv); $('#deck').hidden = !DECK_HINT.test(dv); $('#floor').hidden = !FLOOR_HINT.test(dv); groupHints(hintOpen); };
  // Backlog 651: Fehlbetankung erkannt, aber „Weiß nicht“/„fahrbereit“ gewählt – Warnzeile (nicht blockierend; die Sperre setzt nur „nicht fahrbereit“)
  const fuelDrv = () => { const w = $('#fueldrv'); if (!w) return; const d = $('input[name=drv]:checked'); const bad = !$('#fuel').hidden && !!d && ['unbekannt', 'fahrbereit'].includes(d.value);
    w.hidden = !bad; w.textContent = bad ? '⚠️ ' + t('fuel_drv_warn').replace('{a}', t('drv_' + d.value)).replace('{b}', t('drv_nicht_fahrbereit')) : ''; };
  const hintOpen = new Set();
  // Spracheingabe (Diktat) meldet sich je nach Gerät nur mit „change“ statt „input“ (Backlog 228) – beide prüfen
  $('#d').addEventListener('input', hints); $('#d').addEventListener('change', hints);
  $$('input[name=drv]').forEach((x) => x.addEventListener('change', fuelDrv));
  $$('input[name=veh]').forEach((x) => x.addEventListener('change', hints)); // Backlog 634: Hinweis hängt auch vom gewählten Fahrzeug ab
  photoLimitWatch($('#ph'));
  // Backlog 807: Auswahl „Fotos später senden“ nur mit gewählten Fotos zeigen (nicht im Entwurf gemerkt – Fotos werden nicht wiederhergestellt)
  $('#ph').addEventListener('change', () => { const w = $('#phlater_w'); if (w) w.hidden = !($('#ph').files || []).length; if (w && w.hidden) $('#phlater').checked = false; });
  const draft = bindFormDraft('new', $('#f'), 'veh', preId, ['vq', 'phlater']);
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
    // Backlog 807 (Blickwinkel „Fahrer im Ausland, Roaming teuer“): Fotos auf dem Gerät zurückhalten – Meldung (Text) geht sofort, die Leitung
    // sieht am Vorgang „N Fotos folgen“; gesendet wird im WLAN automatisch (wo der Browser es erkennt) oder per „Fotos jetzt senden“
    const hold = !!(photoFiles.length && $('#phlater') && $('#phlater').checked);
    const body = { vehicle_id: veh.value, description: $('#d').value, priority: $('input[name=prio]:checked').value,
      driveability: $('input[name=drv]:checked').value, workshop_site: $('#w').value || null, location_note: $('#l').value || null, request_key: key, ...(occ ? { occurred_at: occ } : {}), ...(hold ? { photos_later: photoFiles.length } : {}) };
    try {
      const r = await api('POST', '/api/cases', body, { timeoutMs: SEND_TIMEOUT_MS });
      draft.clear();
      const files = photoFiles;
      // Backlog 283 (Teilagent „Sonntag 03:00“): kritisch/nicht fahrbereit – auch mit Netz die Bitte zum Anruf samt „Panne & Notfall“ zeigen
      // (vorher nur beim Offline-Speichern; nachts liest niemand die Meldung sofort)
      // Backlog 540 (Blickwinkel „Reifenplatzer nachts, schwaches Netz“): das Panel sofort nach dem Anlegen zeigen, nicht erst nach allen Fotos
      // (bis zu 2 Min. je Foto) – der Foto-Stand läuft in einer eigenen Zeile darin weiter
      const crit = body.priority === 'kritisch' || body.driveability === 'nicht_fahrbereit';
      let ph = sb;
      if (crit && sb.isConnected) {
        render(`<h1>${esc(t('report_damage'))}</h1><div class="panel alert" role="alert" data-sentcritical><p><b>${esc(t('report_sent'))}: ${esc(r.case_no)}</b></p>${files.length ? `<p class="small" id="phstate" data-phstate role="status">${hold ? esc(tn('photos_held', files.length)) : `${esc(t('uploading'))} 1/${files.length}`}</p>` : ''}${r.urgent_push_recipients === 0 ? `<p data-nopush><b>⚠ ${esc(t('no_push_reach'))}</b></p>` : ''}${callBox(body.vehicle_id)}<p><a class="btn" href="#/cases/${esc(r.id)}">${esc(t('open_report'))} ›</a></p></div>`, 'new');
        ph = $('#phstate') || null;
      }
      if (hold) {
        const held = await photosLater('/api/cases', body, r, r.id, files, who, true);
        toast(`${t('report_sent')}: ${r.case_no} · ${held === files.length ? tn('photos_held', held) : t('photos_held_fail')}`, held !== files.length);
        if (ph && ph.isConnected && ph !== sb && held !== files.length) ph.textContent = t('photos_held_fail');
        if (crit && !sb.isConnected) return;
        if (sb.isConnected) location.hash = '#/cases/' + r.id;
        return;
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
        if (hold && stored && who) outboxSet(outboxGet(who.key).map((x) => (x.body.request_key === key ? { ...x, hold: true } : x)), who.key);
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
    return `<li><span class="chip ${esc(k.priority)}">${esc(t('prio_' + k.priority))}</span> ${k.id ? `<a href="#/cases/${esc(k.id)}">${txt}</a>` : txt} <span class="muted">· ${esc(t('st_' + k.status))} · ${fmtD(k.created_at)}${k.planned_date ? ' · ' + esc(t('planned_ws_short')) + ' ' + fmtD(k.planned_date) : ''}${k.parts_expected_date ? ' · ' + esc(t('parts_eta')) + ' ' + fmtD(k.parts_expected_date) : ''}${rdyOf(k) ? ` · <span data-kdrdy>${rdyTxt(k.ready_expected_on)}</span>` : ''}${k.workshop_site ? ` · <span data-kdws>${esc(wsName(k.workshop_site))}</span>` : ''}</span>${k.parts_drive ? ` <span class="chip ok" style="white-space:nowrap" data-kdpdr>🚚 ${esc(t('pdr_short'))}</span>` : ''}${k.driveability && !k.safety_lock && !k.parts_drive ? ` <span class="chip mittel" style="white-space:nowrap" data-kddrv>${esc(t(k.driveability === 'eingeschraenkt' ? 'dispo_upcoming_limited' : 'kd_drv_not'))}</span>` : ''}${k.vehicle_location || k.tow_service ? `<br><span data-kdloc>📍 ${esc(t('vl_title'))}: ${k.vehicle_location ? esc(k.vehicle_location) : `<span class="muted">${esc(t('vl_unknown'))}</span>`}${k.tow_service ? ` · <span class="chip mittel">${esc(t('vl_towed_chip'))}</span> ${esc(k.tow_service)}${k.towed_on ? ' · ' + fmtD(k.towed_on) : ''}` : ''}${vlAt(k)}</span>` : ''}</li>`; }).join('')}</ul></details>`;
}

// ---------- Vorgang ----------
// Backlog 629: Vorgang bei der externen Werkstatt (EXTERN, kein Werkstattkonto) in Reparatur, Leitung darf zur Abschlusskontrolle geben
const isQualityRelease = (c, A) => c.status === 'in_reparatur' && c.workshop_site === 'EXTERN' && ['owner', 'fleet'].includes(S.me.role) && (A || []).includes('request_quality_check');
// Backlog 788: Verlauf in der Vergangenheitsform (hev_<Aktion>), sonst Knopf-Beschriftung act_<Aktion>; unbekannt = leer
const evLabel = (a) => (t('hev_' + a) !== 'hev_' + a ? t('hev_' + a) : t('act_' + a) !== 'act_' + a ? t('act_' + a) : '');
// Backlog 903 (Blickwinkel „Versicherer schickt einen Gutachter – Lkw steht schon in der Werkstatt“): geplante Besichtigung aus dem Versicherungsfall
// (Server liefert nur das Datum, nur an offenen Vorgängen und nur für Leitung, Werkstatt, Disposition)
function apwBox(c) {
  if (!c.appraisal_wait_on) return '';
  const k = S.me.role === 'workshop' ? 'apw_hint_ws' : isMgr() ? 'apw_hint_mgr' : 'apw_hint_dispo';
  return `<div class="panel warn" role="note" data-apwcase><b>🔍 ${esc(t('apw_title'))} ${fmtD(c.appraisal_wait_on)}${c.appraisal_wait_on === bDate() ? ' (' + esc(t('today')) + ')' : ''}</b> – ${esc(t(k))}</div>`;
}
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
    <h1 style="margin-top:12px" data-title="${esc(c.case_no)} · ${esc(d.vehicle.plate)}"><span translate="no">${esc(c.case_no)}</span></h1>
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
    ${apwBox(c)}
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
      ${rdyOf(c) ? `<dt>${esc(t('rdy_title'))}</dt><dd id="rdy"><b>${fmtD(c.ready_expected_on)}</b>${c.ready_expected_on === bDate() ? ' (' + esc(t('today')) + ')' : ''}${c.ready_expected_on < bDate() ? ` <span class="chip mittel" data-rdypast>${esc(t('rdy_passed'))}</span>` : ''} <span class="small muted">${esc(t('rdy_by_ws'))}</span>${((m) => (m ? ` <span class="small" data-rdymoves>· ${esc(tn('rdy_moved', m.n))} (${esc(t('rdy_first'))} ${fmtD(m.first)})</span>` : ''))(rdyMoves(d))}</dd>` : ''}
      ${c.status === 'wartet_teile' ? `<dt>${esc(t('parts_eta'))}</dt><dd>${c.parts_expected_date ? partsEta(c, '', false) : `<span class="muted">${esc(t('parts_eta_none'))}</span>`}</dd>` : ''}${pdrInfo(c, d)}
      ${c.status === 'wartet_teile' && d.parts_wait ? partsWaitRows(d.parts_wait) : ''}
      ${c.status !== 'gemeldet' ? `<dt>${esc(t('workshop_ack'))}</dt><dd>${c.workshop_ack_at ? fmtDT(c.workshop_ack_at) : esc(t('not_yet'))}</dd>` : ''}
      ${c.location_note ? `<dt>${esc(t('location_shown'))}</dt><dd>${esc(c.location_note)}</dd>` : ''}
      ${workStateInfo(c, d)}${vehLocInfo(c)}${handoverInfo(c)}${pickupInfo(c)}
      ${d.parent ? `<dt>${esc(t('parent'))}</dt><dd>${d.parent.id ? `<a href="#/cases/${esc(d.parent.id)}" translate="no">${esc(d.parent.case_no)}</a>` : esc(d.parent.case_no)}</dd>` : ''}
      ${d.duplicate_of ? `<dt>${esc(t('dup_of'))}</dt><dd>${S.me.role === 'driver' || !d.duplicate_of.id ? noTr(d.duplicate_of.case_no) : `<a href="#/cases/${esc(d.duplicate_of.id)}" translate="no">${esc(d.duplicate_of.case_no)}</a>`}</dd>` : ''}${d.duplicates && d.duplicates.length ? `<dt>${esc(t('duplicates'))}</dt><dd>${d.duplicates.map((x) => `<span style="white-space:nowrap" data-dupat><a href="#/cases/${esc(x.id)}" translate="no">${esc(x.case_no)}</a>${x.created_at ? ` <span class="small muted">(${esc(t('reported_at_short'))} ${fmtDT(x.created_at)})</span>` : ''}</span>`).join(', ')}</dd>` : ''}
      ${!['driver'].includes(S.me.role) ? `<dt>${esc(t('vehicle_file'))}</dt><dd><a href="#/vehicles/${esc(d.vehicle.id)}">${esc(d.vehicle.plate)}</a></dd>` : ''}
      ${!['driver'].includes(S.me.role) && d.vehicle.vin ? `<dt>${esc(t('vin'))}</dt><dd translate="no" data-cvin>${esc(d.vehicle.vin)}</dd>${d.vehicle.manufacturer || d.vehicle.model ? `<dt>${esc(t('manufacturer'))}</dt><dd>${esc([d.vehicle.manufacturer, d.vehicle.model].filter(Boolean).join(' '))}</dd>` : ''}${d.vehicle.kind !== 'anhaenger' && d.vehicle.trailer_plate ? `<dt>${esc(t('trailer'))}</dt><dd>${esc(d.vehicle.trailer_plate)}</dd>` : ''}` : ''}
    </dl>${vehInfo(d.vehicle_info, c, A)}</section>`;

  // Aktionen
  const main = A.filter((a) => !['comment', 'upload', 'inspection', 'resolve_open_item', 'resolve_released_item'].includes(a));
  if (main.length || A.includes('inspection')) {
    html += `<div class="actions">${A.includes('inspection') ? `<a class="btn" href="#/inspect/${esc(c.id)}">${esc(t('act_inspection'))}</a>` : ''}${main.map((a) => `<button class="btn ${['reject', 'set_safety_lock', 'withdraw_order'].includes(a) ? 'danger' : ['technical_release', 'quality_release'].includes(a) ? 'go' : ['record_work', 'add_part', 'add_open_item', 'add_external_cost', 'change_priority', 'reassign_workshop', 'correct_vehicle', 'lift_safety_lock', 'return_for_rework', 'set_planned_date', 'set_parts_eta', 'set_followup', 'set_vehicle_location', 'set_handover', 'set_occurred_at', 'set_work_state', 'set_ready_date', 'set_parts_drive'].includes(a) ? 'secondary' : ''}" data-act="${esc(a)}">${esc(t('act_' + a))}</button>`).join('')}</div><div id="actform"></div>`;
  } else html += `<div id="actform"></div>`;

  // Dateien
  // Je Datei: wann und von wem (Rolle, Name nach denselben Regeln wie im Verlauf) – Schadensfoto des Fahrers vs. Reparaturfoto der Werkstatt (Backlog 223)
  // Backlog 807: beim Melden angekündigte Fotos (auf dem Gerät zurückgehalten, z. B. Roaming) – Hinweis bis alle eingegangen sind bzw. der Vorgang endet
  const pl = d.photos_later; const plHere = c.reporter_id === S.me.id && outboxGet().some((x) => x.hold && x.photo_target === c.id && !x.failed);
  const plBox = pl && pl.received < pl.announced && !['fahrzeug_freigegeben', 'abgelehnt'].includes(c.status)
    ? `<div class="panel small" role="note" data-photoslater><p style="margin:0">📷 ${esc(t('photos_later_case').replace('{n}', pl.announced).replace('{x}', pl.received))}</p>${plHere ? `<div class="actions"><button type="button" class="btn secondary" data-obx-release="${esc(c.id)}">${esc(t('photos_send_now'))}</button></div>` : ''}</div>` : '';
  html += `<h2>${esc(t('files'))}</h2>${plBox}<div class="thumbs">${d.files.map((f) => {
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
    html += `<h2>${esc(t('open_items'))}</h2><div class="list">${d.open_items.map((o) => `<div class="row note ${o.safety_relevant && o.status === 'offen' ? 'p-kritisch' : ''}"><span class="chip ${o.status === 'offen' ? (o.safety_relevant ? 'kritisch' : 'mittel') : 'ok'}">${esc(t('oi_' + o.status))}</span><span class="title" style="white-space:normal"${langAttr(o.description)}>${esc(o.description)}${oiFileLink(o, d)}</span>${o.status === 'offen' && (A.includes('resolve_open_item') || isMgr()) ? `<span style="display:flex;gap:6px;flex-wrap:wrap">${A.includes('resolve_open_item') ? `<button class="btn secondary" data-resolve="${esc(o.id)}">${esc(t('done'))}</button>` : ''}${isMgr() ? `<button class="btn secondary" data-oifu="${esc(o.id)}" data-safety="${o.safety_relevant ? 1 : 0}">${esc(t('oi_to_case'))}</button>` : ''}</span>` : '<span></span>'}<span class="sub" style="white-space:normal">${o.safety_relevant ? esc(t('safety_relevant')) + ' · ' : ''}${esc((pnm(o.created_by_name, o.created_by_name_hidden) || t('role_' + o.created_by_name_role)))} · ${fmtDT(o.created_at)}${o.resolution_note ? ' · ' + (/^Folgeauftrag \S{1,40}$/.test(o.resolution_note) ? esc(t('oi_followup_ref').replace('{v}', () => o.resolution_note.slice(13))) : rriNote(o.resolution_note) ? esc(rriNote(o.resolution_note)) : ltxt(o.resolution_note)) : ''}</span></div>`).join('')}</div>`;
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
    ? `<section class="panel"><h3>${esc(t('claim_title'))}</h3><p class="small muted">${esc(t('claim_dup_hint'))}${d.duplicate_of.id ? ` <a href="#/cases/${esc(d.duplicate_of.id)}" translate="no">${esc(d.duplicate_of.case_no)}</a>` : ''}</p></section>`
    : (await claimSection(d.claim, d.insurance_contracts, d.files || [], c.description, c, (d.vehicle_info && d.vehicle_info.coupled) || [])).replace('</h3>', () => `</h3>${claimNamedIn(d.opponent_in_claims)}`);
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
  html += `<h2>${esc(t('history'))}</h2><ol class="timeline">${d.events.map((e) => `<li><time>${fmtDT(e.created_at)}</time> · <b>${esc(e.action === 'comment' && e.payload && e.payload.question ? t('act_question') : evLabel(e.action) ? evLabel(e.action) : e.action === 'create' ? t('report_sent') : e.action)}</b>${e.actor_name || e.actor_name_hidden ? ' · ' + esc(pnm(e.actor_name, e.actor_name_hidden)) : ''}${e.to_status && e.from_status !== e.to_status ? ` → ${esc(t('st_' + e.to_status))}` : ''}${e.note ? `<div style="white-space:pre-wrap"${langAttr(evNote(e))}>${esc(evNote(e))}</div>` : ''}${e.action === 'cost_limit_exceeded' && e.payload ? `<div class="small muted">${esc(t('costs'))} ${eur(e.payload.total_net)} > ${esc(t((e.payload.approved_net || 0) > (e.payload.limit_net || 0) ? 'cost_approved_upto' : 'cost_limit'))} ${eur(Math.max(e.payload.limit_net, e.payload.approved_net || 0))}</div>` : ''}${e.action === 'correct_vehicle' && e.payload && e.payload.inspection_id ? `<div class="small muted cvinsp">${esc(cvInspText(e.payload))}</div>` : ''}${e.action === 'file_added' && e.payload && e.payload.filename ? `<div class="small muted" data-fileev>📎 ${esc(e.payload.filename)}</div>` : ''}${e.action === 'approve_costs' && e.payload ? `<div class="small muted">${esc(t('cost_approved_upto'))} ${eur(e.payload.approved_net)}</div>` : ''}${e.action === 'parts_partial' && e.payload && 'to' in e.payload ? `<div class="small muted" data-ppev>${esc(t('pp_eta'))}: ${e.payload.from ? fmtD(e.payload.from) : '–'} → ${e.payload.to ? fmtD(e.payload.to) : '–'}</div>` : ''}${e.action === 'set_parts_eta' && e.payload ? `<div class="small muted">${e.payload.from ? fmtD(e.payload.from) : '–'} → ${e.payload.to ? fmtD(e.payload.to) : '–'}</div>` : evFromTo(e)}${e.payload && e.payload.planned_to ? `<div class="small muted">${esc(t('planned'))}: ${e.payload.planned_from ? fmtD(e.payload.planned_from) + ' → ' : ''}${fmtD(e.payload.planned_to)}</div>` : ''}${e.payload && e.payload.parts_expected_date ? `<div class="small muted">${esc(t('parts_eta'))} ${fmtD(e.payload.parts_expected_date)}</div>` : ''}${e.payload && e.payload.pickup_for_driver ? `<div class="small muted" data-puev>${esc(t('pu_ev_driver'))}${e.payload.pickup_valid_until ? ' · ' + esc(t('pu_valid_until')) + ' ' + fmtD(e.payload.pickup_valid_until) : ''}</div>` : ''}${e.payload && e.payload.pickup_replaced ? `<div class="small muted" data-pureplev>${esc(tn('pu_ev_replaced', e.payload.pickup_replaced))}</div>` : ''}${e.payload && e.payload.winter_open_confirmed ? `<div class="small muted wqev">❄ ${esc(t('wq_ev_open'))}${[...(e.payload.noncompliant || []), ...(e.payload.missing || [])].length ? ': ' + esc([...(e.payload.noncompliant || []), ...(e.payload.missing || [])].join(', ')) : ''}</div>` : ''}</li>`).join('')}</ol>`;
  if (A.includes('comment')) html += `<form id="cf"><label for="ct">${esc(t('act_comment'))}</label><textarea id="ct" required minlength="3"></textarea>${S.me.role !== 'driver' ? `<fieldset style="border:0;padding:0;margin:8px 0"><legend class="small muted">${esc(t('notify_only'))}</legend><div style="display:flex;gap:14px;flex-wrap:wrap">${[['fleet', t('nt_fleet_owner')], ['workshop', t('role_workshop')], ['reporter', t('reported_by')]].filter(([k]) => k !== 'workshop' || (c.status !== 'abgelehnt' && (c.workshop_site || c.suggested_workshop_site))).map(([k, l]) => { const off = k === 'reporter' && d.reporter_unreachable; return `<label class="small${off ? ' muted' : ''}" style="display:flex;gap:6px;align-items:center;min-height:44px"><input type="checkbox" data-nt="${k}"${off ? ' disabled' : ''}> ${esc(l)}${off ? ` <span style="white-space:nowrap">(${esc(t(d.reporter_unreachable === 'inactive' ? 'reporter_off_inactive' : 'reporter_off_other'))})</span>` : ''}</label>`; }).join('')}</div>${isMgr() && !d.reporter_unreachable && c.reporter_id && c.reporter_id !== S.me.id && OPEN_CASE_ST.includes(c.status) ? `<label class="small" style="display:flex;gap:6px;align-items:center;min-height:44px"><input type="checkbox" data-q> ${esc(t('q_ask'))}</label>` : ''}</fieldset>` : ''}<div class="actions"><button class="btn secondary">${esc(t('save'))}</button></div></form>`;
  render(html, 'cases', { defer: true });
  $('#cprt').onclick = () => window.print();

  // Befehlskennung je Inhalt: wiederholtes Absenden desselben Eintrags nach verlorener Antwort (Funkloch) nutzt dieselbe command_id –
  // der Server meldet dann „duplicate“ statt doppelt zu buchen (20.10.2026: 2 × 1,5 h Arbeitszeit, doppelte Lagerentnahme); nach Erfolg verworfen
  // opts.formAction: Formular, aus dem der Befehl kommt (kombinierter Knopf, Backlog 629); opts.next(r): Folgeschritt statt Neuladen
  // Backlog 799 (Blickwinkel „Werkstatt-Tablet im Funkloch der Halle“): Zeitlimit wie Meldungen (SEND_TIMEOUT_MS) – ohne Antwort blieb der
  // Knopf ohne Ende gesperrt; jetzt gilt es als Netzabbruch (Eingaben bleiben, gleiche command_id beim erneuten Speichern → „duplicate“)
  const cmd = async (action, note, payload = {}, opts = {}) => {
    const fAct = opts.formAction || action;
    const key = JSON.stringify([c.id, action, note ?? null, payload]);
    // nur kurz nach dem Fehlschlag wiederverwenden: am geteilten Tablet bucht später ein anderer Mechaniker evtl. denselben Inhalt (23.10.2026)
    const commandId = S.pendCmd && S.pendCmd.key === key && Date.now() - S.pendCmd.at < 10 * 60000 ? S.pendCmd.id : uid(); S.pendCmd = { key, id: commandId, at: Date.now() };
    try { const r = await api('POST', `/api/cases/${c.id}/commands`, { action, command_id: commandId, expected_version: c.version, note, payload }, { timeoutMs: SEND_TIMEOUT_MS }); if (S.cmdOffline && S.cmdOffline.key === key) S.cmdOffline = null; S.pendCmd = null; if (r && r.no_workshop_user) toast(t('no_ws_user_warn'), true); else if (r && r.external_workshop) toast(t('ext_ws_hint')); else if (r && r.no_recipients) toast(t('no_recipients_warn'), true); else if (r && r.km_rejected && !r.duplicate) toast('✓ · ⚠ ' + (r.km_rejected.next_km !== undefined ? t('ev_km_greater').replace('{km}', fmtNum(r.km_rejected.km)).replace('{next}', fmtNum(r.km_rejected.next_km)) : t('ev_km_smaller').replace('{km}', fmtNum(r.km_rejected.km)).replace('{prev}', fmtNum(r.km_rejected.previous_km))), true); else if (r && r.km_test_only && !r.duplicate) toast('✓ · ' + t('ext_km_test_toast')); else toast(r && r.duplicate ? t('cmd_duplicate') : '✓'); if (S.openAct && S.openAct.action === fAct) S.openAct = null; actDraft(c.id).clear(); if (opts.next) return opts.next(r); viewCase(c.id); }
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
  // Backlog 882: bekannte Restarbeit eines freigegebenen Vorgangs hier mit erledigen
  $$('[data-relres]').forEach((b) => (b.onclick = () => actionForm('resolve_released_item', c, cmd, { open_item_id: b.dataset.relres }, d)));
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
        const r = await api('POST', `/api/cases/${encodeURIComponent(c.id)}/open-items/${encodeURIComponent(b.dataset.oifu)}/followup`, { priority: $('#oifp').value, note: $('#oifn').value.trim() || undefined }, { timeoutMs: SEND_TIMEOUT_MS }); // Backlog 805f: Wiederholung → derselbe Folgeauftrag
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
  // Backlog 811: Versicherungsfall gleichzeitig bearbeitet → neu laden, eigene Änderungen bleiben im Formular (vorher verwarf das Neuladen die Eingaben)
  if (S.clLost && S.clLost.id === c.id) { const L = S.clLost; S.clLost = null; if ($('#clf')) conflictKeep($('#clf'), L, 'cllost'); }
  const clf = $('#clf'); if (clf) clf.onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(clf)); for (const k of Object.keys(b)) if (b[k] === '') b[k] = null; try { const r = await api('PUT', `/api/cases/${c.id}/claim`, b, { timeoutMs: SEND_TIMEOUT_MS }); /* Backlog 804: Wiederholung → version_conflict, nie doppelt */ if (r && r.warning && r.warning.code === 'contract_not_valid_at_occurrence') toast(t('claim_contract_invalid').replace('{d}', fmtD(r.warning.day)).replace('{p}', `${r.warning.start_date ? fmtD(r.warning.start_date) : '…'}–${r.warning.end_date ? fmtD(r.warning.end_date) : '…'}`), true); else toast('✓'); viewCase(c.id); } catch (err) { if (err.code === 'version_conflict') { S.clLost = { id: c.id, ...conflictMine(clf) }; viewCase(c.id); return; } toast(err.message, true); } };
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
    let later = 0, darkN = 0, blurN = 0;
    for (const [i, file] of take.entries()) {
      prog.textContent = ` ${t('uploading')} ${i + 1}/${take.length}`;
      try {
        const blob = await prepareUpload(file);
        // Backlog 603 (Blickwinkel „Werkstatt-Tablet UK mit Fotos“): Format/Größe vor dem Hochladen prüfen – sonst lud ein 20-MB-Scan
        // erst komplett hoch (bei langsamem WLAN Zeitüberschreitung → Postausgang → später erneut abgelehnt) bzw. HEIC kam als „zu groß“ zurück
        const rej = uploadReject(blob, file.name); if (rej) { errs.push(`${file.name}: ${rej}`); continue; }
        const r = await api('POST', `/api/cases/${c.id}/files`, blob, { timeoutMs: PHOTO_TIMEOUT_MS, ...ox, headers: { 'x-filename': encodeURIComponent(file.name), 'content-type': blob.type || 'application/octet-stream' } });
        if (r && r.duplicate) dupes.push(file.name); // gleiche Datei schon am Vorgang – Server legt keine zweite an
        else { const q = await photoCheck(blob); if (q.dark) darkN++; else if (q.blurry) blurN++; } // Backlog 863/864
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
    if (darkN) errs.push(tn('photos_dark_added', darkN));
    if (blurN) errs.push(tn('photos_blurry_added', blurN));
    const hints = (darkN ? 1 : 0) + (blurN ? 1 : 0);
    if (errs.length) toast(errs.join(' · '), errs.length > hints); else if (take.length && !later) toast('✓');
  };
}

// ---------- Versicherungsfälle (je Vorgang; nur Inhaber/Fuhrparkleitung) ----------

const CLAIM_CLS = { gemeldet: 'mittel', in_pruefung: 'mittel', reguliert: 'ok', abgelehnt: 'kritisch', zurueckgezogen: '' };
const claimChip = (st) => `<span class="chip ${CLAIM_CLS[st]}">${esc(t('cls_' + st))}</span>`;


// Backlog 853: dieses Fahrzeug ist in offenen Versicherungsfällen anderer eigener Fahrzeuge als Unfallgegner genannt (Rückverweis)
const claimNamedIn = (list) => (list && list.length ? `<p class="small" data-conamed>ℹ️ ${esc(t('co_named_in'))} ${list.map((x) => `<a href="#/cases/${esc(x.case_id)}" style="white-space:nowrap" translate="no">${esc(x.case_no)}</a> (${plate(x.plate)})`).join(', ')}</p>` : '');

async function claimSection(...a) { return (await lazyModule('schaden')).claimSection(...a); }
async function viewClaims(...a) { return (await lazyModule('verwaltung')).viewClaims(...a); }

// Verlauf der Auslesungen (Fahrerakte, Fahrzeugakte): stornierte durchgestrichen mit Begründung; Leitung kann stornieren (18.10.2026)
const tachoHistList = (list, canCancel) => `<ul class="small tachohist">${list.map((o) => `<li${o.cancelled_at ? ' class="muted"' : ''}>${o.cancelled_at ? '<s>' : ''}${fmtD(o.downloaded_on)} · ${esc(o.evidence)}${o.note ? ' – ' + esc(o.note === 'Import' ? t('odo_src_import') : o.note) : ''}${o.cancelled_at ? '</s>' : ''}${o.created_by_name ? ` <span class="muted">(${esc(o.created_by_name)})</span>` : ''}${o.cancelled_at ? ` <span class="chip">${esc(t('tacho_cancelled'))}</span> ${esc(o.cancel_reason || '')}` : canCancel ? ` <button type="button" class="btn secondary small" data-tcancel="${esc(o.id)}">${esc(t('tacho_cancel'))}</button>` : ''}</li>`).join('')}</ul>${canCancel && list.some((o) => !o.cancelled_at) ? `<p class="small muted noprint">${esc(t('tacho_cancel_hint'))}</p>` : ''}`;
const bindTachoCancel = (root, reload) => $$('[data-tcancel]', root).forEach((b) => (b.onclick = async () => { const reason = prompt(t('tacho_cancel_reason')); if (!reason) return; try { await api('POST', `/api/tacho/downloads/${b.dataset.tcancel}/cancel`, { reason }, { timeoutMs: SEND_TIMEOUT_MS }); /* Backlog 805g: Wiederholung = duplicate */ toast('✓'); reload(); } catch (err) { toast(err.message, true); } }));

// Werkstatt „EXTERN“ hat einen festen deutschen Namen aus dem Schema – in der App-Sprache anzeigen (22.10.2026, Fund Druck UK/EN)
const wsLabel = (w) => (w && w.code === 'EXTERN' ? t('ws_extern') : (w && w.name) || '') + (w && w.active === false ? ` (${t('ws_closed')})` : '');
// alle Werkstätten inkl. geschlossener (Namen, Filter) – Auswahl für Neues bleibt S.meta.workshops (nur aktive), Backlog 192
const wsFilterOk = () => S.me && ['owner', 'fleet', 'dispatch', 'viewer'].includes(S.me.role);
const wsAll = () => (S.meta && (S.meta.workshops_all || S.meta.workshops)) || [];
const wsName = (code) => wsLabel(wsAll().find((w) => w.code === code)) || code || '–';
// Lieferant einer Lagerentnahme wird als „Lager <Werkstattcode>“ gespeichert (src/cases.js) – Anzeige mit Werkstattnamen in der App-Sprache (19.10.2026)
// Backlog 856 (Blickwinkel „Werkstatt-Nacharbeit“): wer den früheren Auftrag erledigt hat (Werkstatt, Fremdfirmen) – nur Information
const viBy = (o) => { const a = [o.workshop_site ? t('vi_done_ws').replace('{ws}', wsName(o.workshop_site)) : '', o.ext_suppliers && o.ext_suppliers.length ? t('vi_done_ext').replace('{list}', o.ext_suppliers.join(', ')) : ''].filter(Boolean); return a.length ? `<br><span class="small muted" data-viby>${esc(a.join(' · '))}</span>` : ''; };
// Backlog 857: Fremdleistung erfassen – gleiche Firma hat an diesem Fahrzeug in den 90 Tagen vor der Meldung schon gearbeitet (Nacharbeit/Gewährleistung prüfen)
const extPrevSame = (vi, name) => { const k = String(name || '').trim().toLowerCase(); if (!k || !vi) return []; const seen = new Set(); return [...(vi.previous_same_item || []), ...(vi.recent_closed || [])].filter((o) => o.id && (o.ext_suppliers || []).some((x) => String(x).trim().toLowerCase() === k) && !seen.has(o.id) && seen.add(o.id)); };
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
  // Backlog 863: Hinweis bei sehr dunklen Fotos (nur Hinweis, Senden bleibt möglich); spätere Auswahl überholt eine laufende Prüfung
  const dark = document.createElement('p'); dark.className = 'panel warn small'; dark.setAttribute('role', 'status'); dark.hidden = true; dark.dataset.photodark = '';
  note.insertAdjacentElement('afterend', dark);
  // Backlog 864: Hinweis bei stark verwackelten/unscharfen Fotos (eigene Zeile, nur Hinweis)
  const blur = document.createElement('p'); blur.className = 'panel warn small'; blur.setAttribute('role', 'status'); blur.hidden = true; blur.dataset.photoblur = '';
  dark.insertAdjacentElement('afterend', blur);
  let run = 0;
  input.onchange = async () => {
    const n = (input.files || []).length;
    note.hidden = n <= PHOTO_MAX;
    note.textContent = n > PHOTO_MAX ? t('photos_over_max').replace('{n}', n).replace('{max}', PHOTO_MAX) : '';
    const my = ++run; dark.hidden = true; dark.textContent = ''; blur.hidden = true; blur.textContent = '';
    let d = 0, b = 0; for (const f of [...(input.files || [])].slice(0, PHOTO_MAX)) { const q = await photoCheck(f); if (q.dark) d++; else if (q.blurry) b++; }
    if (my !== run || !dark.isConnected) return;
    dark.hidden = !d; dark.textContent = d ? tn('photos_dark', d) : '';
    blur.hidden = !b; blur.textContent = b ? tn('photos_blurry', b) : '';
  };
}
// Backlog 863 (Blickwinkel „Fahrer meldet nachts einen Schaden, Foto zu dunkel“): mittlere Helligkeit (Luma nach Rec. 709, 0–255) eines auf
// 32×32 verkleinerten Bildes; durchsichtige Pixel zählen nicht. Unter PHOTO_DARK_LUMA gilt das Foto als „sehr dunkel“ (technischer Schwellwert,
// keine fachliche Vorgabe; nur Hinweis). Nicht lesbare Bilder gelten nie als dunkel.
const PHOTO_DARK_LUMA = 40;
const lumaMean = (px) => { let s = 0, n = 0; for (let i = 0; i + 3 < px.length; i += 4) { if (px[i + 3] < 128) continue; s += 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]; n++; } return n ? s / n : 255; };
// Backlog 864 (Blickwinkel „Fahrer meldet einen Schaden, Foto verwackelt/unscharf“): Laplace-Filter (4er-Nachbarschaft) auf der Helligkeit eines
// auf höchstens PHOTO_BLUR_SIDE px verkleinerten Bildes; gezählt werden deutliche Kantenpunkte (|Laplace| > PHOTO_BLUR_EDGE). Weniger als
// PHOTO_BLUR_MIN_EDGES solcher Punkte = „stark unscharf“ – ein kleiner scharfer Kratzer auf glatter Plane reicht schon, um nicht als unscharf
// zu gelten. Fast einfarbige Bilder (Kontrast unter PHOTO_BLUR_MIN_SD) werden nicht beurteilt. Technische Schwellwerte (an Beispielbildern mit
// künstlicher Unschärfe abgeglichen, nur deutliches Verwackeln), keine fachliche Vorgabe; nur Hinweis.
const PHOTO_BLUR_SIDE = 256, PHOTO_BLUR_EDGE = 16, PHOTO_BLUR_MIN_EDGES = 20, PHOTO_BLUR_MIN_SD = 8;
const photoSharpness = (px, w, h) => {
  if (w < 3 || h < 3) return null;
  const y = new Float32Array(w * h); let s = 0, s2 = 0;
  for (let i = 0; i < w * h; i++) { const v = 0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]; y[i] = v; s += v; s2 += v * v; }
  const n = w * h, mean = s / n, sd = Math.sqrt(Math.max(0, s2 / n - mean * mean));
  let edges = 0;
  for (let r = 1; r < h - 1; r++) for (let c = 1; c < w - 1; c++) { const i = r * w + c; if (Math.abs(4 * y[i] - y[i - 1] - y[i + 1] - y[i - w] - y[i + w]) > PHOTO_BLUR_EDGE) edges++; }
  return { edges, sd };
};
const isBlurry = (q) => !!q && q.sd >= PHOTO_BLUR_MIN_SD && q.edges < PHOTO_BLUR_MIN_EDGES;
// Ein Dekodieren je Foto für beide Prüfungen; nicht lesbare Bilder gelten weder als dunkel noch als unscharf
async function photoCheck(file) {
  const none = { dark: false, blurry: false };
  if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type || '')) return none;
  try {
    const bmp = await decodeImage(file);
    try {
      const cv = document.createElement('canvas'); cv.width = 32; cv.height = 32; const cx = cv.getContext('2d'); cx.drawImage(bmp.src, 0, 0, 32, 32);
      if (lumaMean(cx.getImageData(0, 0, 32, 32).data) < PHOTO_DARK_LUMA) return { dark: true, blurry: false };
      if (!bmp.w || !bmp.h) return none;
      const sc = Math.min(1, PHOTO_BLUR_SIDE / Math.max(bmp.w, bmp.h)); const w = Math.max(1, Math.round(bmp.w * sc)), h = Math.max(1, Math.round(bmp.h * sc));
      const cb = document.createElement('canvas'); cb.width = w; cb.height = h; const xb = cb.getContext('2d'); xb.imageSmoothingQuality = 'high'; xb.drawImage(bmp.src, 0, 0, w, h);
      return { dark: false, blurry: isBlurry(photoSharpness(xb.getImageData(0, 0, w, h).data, w, h)) };
    } finally { bmp.done(); }
  } catch { return none; }
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
// Backlog 795 (Blickwinkel „Fahrer mit älterem Handy/Browser“): createImageBitmap fehlt in iOS/Safari < 15 – dort blieb das Foto unverkleinert
// (Handyfoto oft > 5 MB → „Datei zu groß“). Rückfall: Bild über <img> dekodieren (berücksichtigt die Drehung laut EXIF wie createImageBitmap).
async function decodeImage(file) {
  if (typeof createImageBitmap === 'function') { try { const b = await createImageBitmap(file); return { src: b, w: b.width, h: b.height, done: () => {} }; } catch { /* weiter mit <img> */ } }
  const url = URL.createObjectURL(file); const img = new Image();
  try { img.src = url; await img.decode(); } catch (e) { URL.revokeObjectURL(url); throw e; }
  return { src: img, w: img.naturalWidth, h: img.naturalHeight, done: () => URL.revokeObjectURL(url) };
}
async function prepareUpload(file) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  try {
    const bmp = await decodeImage(file);
    try {
      if (!bmp.w || !bmp.h) return file;
      const scale = Math.min(1, 1600 / Math.max(bmp.w, bmp.h));
      const cv = document.createElement('canvas');
      cv.width = Math.round(bmp.w * scale); cv.height = Math.round(bmp.h * scale);
      cv.getContext('2d').drawImage(bmp.src, 0, 0, cv.width, cv.height);
      return await new Promise((res) => cv.toBlob((b) => res(b || file), 'image/jpeg', 0.82));
    } finally { bmp.done(); }
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
  const needsNote = ['change_priority', 'set_safety_lock', 'lift_safety_lock', 'approve_repair', 'reassign_workshop', 'correct_vehicle', 'reject', 'withdraw_order', 'wait_parts', 'parts_partial', 'resolve_open_item', 'resolve_released_item', 'request_quality_check', 'return_for_rework', 'technical_release', 'approve_costs', 'quality_release'];
  const qrel = action === 'quality_release'; // Backlog 629: beide Schritte in einem Formular
  const isQc = action === 'request_quality_check' || qrel; const isRel = action === 'technical_release' || qrel;
  const wsOpts = S.meta.workshops.map((w) => `<option value="${esc(w.code)}"${(c.workshop_site || c.suggested_workshop_site) === w.code ? ' selected' : ''}>${esc(wsLabel(w))}</option>`).join('');
  const prioOpts = (sel) => ['niedrig', 'mittel', 'kritisch'].map((p) => `<option value="${p}"${p === sel ? ' selected' : ''}>${esc(t('prio_' + p))}</option>`).join('');
  switch (action) {
    // Backlog 882: welche Restarbeit aus welchem Vorgang – Vermerk erscheint dort als „Erledigt in Vorgang …“
    case 'resolve_released_item': {
      const o = (((d && d.vehicle_info) || {}).released_items || []).find((x) => x.id === preset.open_item_id);
      if (o) f.push(`<p class="small" data-rrihint><b${langAttr(o.description)}>${esc(clipTxt(o.description, 200))}</b><br><span class="muted">${esc(t('rri_hint').replace('{v}', () => o.case_no))}</span></p>`);
      break;
    }
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
    case 'set_parts_drive': f.push(`<input type="hidden" name="on" value="${c.parts_drive_at ? '0' : '1'}"><p class="small muted" id="pdrhint">${esc(t(c.parts_drive_at ? 'pdr_off_hint' : 'pdr_on_hint'))}</p>${!c.parts_drive_at && d && Array.isArray(d.open_items) && d.open_items.some((o) => o.status === 'offen' && o.safety_relevant) ? `<p class="panel warn small" id="pdrsafety">${esc(t('err_safety_items_open'))}</p>` : ''}`); break;
    case 'set_work_state': f.push(`<p class="small muted" id="wsthint">${esc(t('wst_hint'))}</p>`); break;
    case 'set_ready_date': { const mn = c.status === 'werkstatt_freigegeben' && c.planned_date && c.planned_date > bDate() ? c.planned_date : bDate(); const cur = c.ready_expected_on || '';
      f.push(`<p class="small muted" id="rdyhint">${esc(t('rdy_hint'))}</p><label for="rdyd">${esc(t('rdy_title'))}<span class="hint">${esc(t('planned_clear_hint'))}</span></label><input type="date" id="rdyd" name="ready_expected_on" min="${esc(cur && cur < mn ? cur : mn)}" value="${esc(cur)}">`); break; }
    case 'set_planned_date': f.push(`<label>${esc(t('planned'))}<span class="hint">${esc(t('planned_clear_hint'))}</span></label><input type="date" name="planned_date" value="${esc(c.planned_date || '')}"><label for="plnote">${esc(t('plan_note_lbl'))}<span class="hint">${esc(t('plan_note_hint'))}</span></label><input id="plnote" name="planned_note" maxlength="200" autocomplete="off" value="${esc(c.planned_note || '')}">`); break;
    case 'record_work': f.push(`<label for="whours">${esc(t('hours'))}</label><input id="whours" name="hours" inputmode="decimal" required placeholder="${esc(t('wh_ph'))}" aria-describedby="whconv"><p class="small muted" id="whconv" data-whconv aria-live="polite" hidden></p><label>${esc(t('activity'))}</label><input name="description" required list="worksugg" autocomplete="off"><datalist id="worksugg"></datalist><p class="small" id="whdesc" data-whdesc aria-live="polite" style="margin-top:6px" hidden></p><label>${esc(t('date'))}</label><input type="date" name="work_date" value="${bDate()}" max="${bDate()}" min="${workDateMin(c.created_at)}"><p class="small" id="wdprev" data-wdprev hidden></p><p class="small muted" id="workday" data-workday aria-live="polite"></p><details id="wdweek" class="small"><summary>${esc(t('wd_week'))}</summary><div id="wdweekb"></div></details>`); break;
    case 'add_part': f.push(`<div id="stocksel"></div><div id="freepart">`); f.push(`<label>${esc(t('part_name'))}</label><input name="name" required list="partsugg" autocomplete="off"><datalist id="partsugg"></datalist><p class="small" id="pqname" data-pqname aria-live="polite" style="margin-top:6px" hidden></p><label>${esc(t('part_number'))}</label><input name="part_number"><label for="pqty">${esc(t('qty'))}</label><input id="pqty" name="quantity" inputmode="decimal" value="1" aria-describedby="pqconv"><p class="small muted" id="pqconv" data-pqconv aria-live="polite" hidden></p><label>${esc(t('price_net'))}</label><input name="unit_price_net" inputmode="decimal"><label class="check"><input type="checkbox" name="estimate"> ${esc(t('estimate'))}</label><label>${esc(t('supplier'))}<span class="hint" data-psuphint>${esc(t('part_supplier_hint'))}</span></label><input name="supplier" maxlength="120"></div><label>${esc(t('warranty_until'))}<span class="hint">${esc(t('warranty_hint'))}</span></label><input type="date" name="warranty_until" style="max-width:220px">${partFileSelect(d)}`); break;
    case 'add_open_item': f.push(`<label>${esc(t('open_items'))}</label><input name="description" required><label class="check"><input type="checkbox" name="safety_relevant"> ${esc(t('safety_relevant'))}</label>${oiFileSelect(d)}`); break;
    case 'add_external_cost': f.push(`<label>${esc(t('supplier'))}</label><input name="supplier" required><p class="panel small" id="xsprev" role="note" hidden></p><label>${esc(t('invoice_no'))}</label><input name="invoice_no"><label>${esc(t('amount_net'))}<span class="hint">${esc(t('ext_amount_hint'))}</span></label><input name="amount_net" inputmode="decimal"><label class="check"><input type="checkbox" name="estimate"> ${esc(t('estimate'))}</label><label class="check"><input type="checkbox" name="covers_work_and_parts"> ${esc(t('covers_all'))}</label><label>${esc(t('warranty_until'))}<span class="hint">${esc(t('warranty_hint'))}</span></label><input type="date" name="warranty_until" style="max-width:220px"><div id="extkm"><label for="extkmv">${esc(t('ext_km_label'))}<span class="hint">${esc(t('ext_km_hint'))}</span></label><input id="extkmv" name="odometer_km" inputmode="numeric" pattern=" *[0-9][0-9 .]*" maxlength="40" style="max-width:220px"><div id="extkmd" aria-live="polite"></div><label for="extkmo">${esc(t('ext_km_on'))}</label><input type="date" id="extkmo" name="odometer_on" max="${bDate()}" style="max-width:220px"></div>${extFileSelect(d)}`); break;
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
    // Backlog 879: ältere Abholhinweise für Fahrer werden mit dieser Freigabe archiviert – vorher ankündigen (Datum des alten Hinweises)
    const puOld = isRel && d && d.vehicle_info && Array.isArray(d.vehicle_info.notes) ? d.vehicle_info.notes.filter((n) => n.pickup) : [];
    if (puOld.length) f.push(`<p class="panel small" id="pu_repl">${esc(t('pu_replaced_hint').replace('{d}', puOld.map((n) => fmtD(n.created_at)).join(', ')))}</p>`);
    if (isRel) f.push(`<label class="check"><input type="checkbox" name="pickup_for_driver" id="pu_drv"> ${esc(t('pu_for_driver'))}</label><div id="pu_until_box" hidden><label for="pu_until">${esc(t('pu_valid_until'))}<span class="hint">${esc(t('pu_valid_until_hint'))}</span></label><input type="date" id="pu_until" name="pickup_valid_until" min="${esc(bDate())}"></div>`);
  }
  if (isRel && c.cost_over_limit_at) f.push(`<p class="panel warn small" id="relcost">${esc(t('err_cost_approval_open'))}</p>`);
  // Backlog 888 (Blickwinkel „Rechnung der Fremdwerkstatt kommt erst nach der Freigabe“): nach der Freigabe lassen sich keine Fremdleistungen und
  // Teile mehr buchen – vorher nennen, was noch nicht belegt ist (nur Hinweis, kein Server-Stopp; Arbeitszeit ohne Satz zählt nicht: Satz folgt aus den Einstellungen)
  if (isRel) { const rc = relCostOpen(d); if (rc) f.push(`<p class="panel warn small" id="relcostopen" role="note">${esc(rc)}</p>`); }
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
  const noteLabel = action === 'set_work_state' ? t('wst_title') : action === 'parts_partial' ? t('pp_note') : action === 'approve_repair' ? t('scope') : isRel ? t('evidence') : needsNote.includes(action) ? t('reason') : t('note');
  f.push(`<label>${esc(noteLabel)}${action === 'set_parts_eta' ? `<span class="hint">${esc(t('parts_eta_note_hint'))}</span>` : action === 'parts_partial' ? `<span class="hint">${esc(t('pp_note_hint'))}</span>` : ''}</label><textarea name="note"${needsNote.includes(action) ? ' required minlength="3"' : ''}${['set_followup', 'set_handover'].includes(action) ? ' maxlength="300"' : action === 'set_work_state' ? ' maxlength="500" rows="4" placeholder="' + esc(t('wst_ph')) + '"' : ''}>${action === 'set_followup' ? esc(c.followup_note || '') : action === 'set_work_state' ? esc(c.work_state_note || '') : ''}</textarea>${action === 'set_work_state' ? `<p class="small muted" id="wstclear">${esc(t('wst_clear_hint'))}</p>` : ''}`);
  if (action === 'add_part') api('GET', '/api/part-suggestions').then((r) => {
    const dl = $('#partsugg'); if (!dl) return;
    dl.innerHTML = r.suggestions.map((x) => `<option value="${esc(x.name)}">${esc(x.part_number || '')}</option>`).join('');
    const nm = $('#af input[name=name]'); const pn = $('#af input[name=part_number]');
    if (nm && pn) nm.addEventListener('change', () => { const hit = r.suggestions.find((x) => x.name === nm.value); if (hit && hit.part_number && !pn.value) pn.value = hit.part_number; });
  }).catch(() => {});
  if (action === 'record_work') api('GET', '/api/work-suggestions').then((r) => { const dl = $('#worksugg'); if (dl) dl.innerHTML = r.suggestions.map((x) => `<option value="${esc(x)}">`).join(''); }).catch(() => {});
  // Backlog 451 (Blickwinkel „Mechaniker bucht Arbeitszeit auf den falschen Auftrag“): Buchungen lassen sich (noch) nicht ändern – Auftrag und
  // Fahrzeug stehen deshalb direkt im Formular (am Tablet ist der Kopf des Vorgangs nach dem Öffnen des Formulars weggescrollt)
  // Backlog 886 (Blickwinkel „Fremdwerkstatt-Rechnung mit anderem Kennzeichen/FIN oder unpassendem km-Stand“): Teil/Fremdleistung nennen
  // zusätzlich FIN und – bei Fremdleistungen – den letzten km-Stand, damit der Abgleich mit dem Beleg vor der (nicht änderbaren) Buchung gelingt.
  const bkVin = d && d.vehicle && d.vehicle.vin; const bkKm = action === 'add_external_cost' && d && d.vehicle_info && d.vehicle_info.last_km;
  const bkDoc = ['add_part', 'add_external_cost'].includes(action) ? `${bkVin ? `<br><span id="bkvin">${esc(t('vin'))}: <span translate="no">${esc(bkVin)}</span></span>` : ''}${bkKm ? `<br><span class="muted" id="bkkm">${esc(t('irv_last_km').replace('{km}', fmtNum(bkKm.km)).replace('{d}', fmtD(bkKm.measured_at)))}</span>` : ''}${action === 'add_external_cost' ? `<br><span class="muted" id="bkdoc">${esc(t('bk_doc'))}</span>` : ''}` : '';
  const bkFor = ['record_work', 'add_part', 'add_external_cost'].includes(action) ? `<p class="panel small" id="afcase"><b>${esc(t('bk_for'))}: ${esc(c.case_no || '')} · ${esc((d && d.vehicle && d.vehicle.plate) || c.plate || '')}</b>${c.description ? `<br><span class="muted">${ltxt(clipTxt(c.description, 80))}</span>` : ''}${bkDoc}<br><span class="muted">${esc(t('bk_check'))}</span></p>` : '';
  // Backlog 903: geplante Gutachter-Besichtigung direkt im Formular der Arbeitsschritte (am Tablet ist der Kopf weggescrollt)
  const apwF = ['start_repair', 'record_work', 'add_part', 'add_external_cost'].includes(action) && c.appraisal_wait_on ? `<p class="panel warn small" data-apwform>🔍 <b>${esc(t('apw_title'))} ${fmtD(c.appraisal_wait_on)}</b> – ${esc(t('apw_hint_ws'))}</p>` : '';
  box.innerHTML = `<form class="panel" id="af"><h3>${esc(t('act_' + action))}</h3>${apwF}${bkFor}${f.join('')}<div class="actions"><button class="btn">${esc(t('save'))}</button><button type="button" class="btn secondary" id="ac">${esc(t('cancel'))}</button></div></form>`;
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
  { const xs = $('#af input[name=supplier]'), xp = $('#xsprev'); if (xs && xp) { const upd = () => { const m = extPrevSame(d && d.vehicle_info, xs.value); xp.hidden = !m.length; xp.innerHTML = m.length ? `${esc(t('ext_prev_same').replace('{s}', xs.value.trim()))} ${m.map((o) => `<a href="#/cases/${esc(o.id)}" translate="no">${esc(o.case_no)}</a> (${fmtD(o.closed_at)})`).join(', ')}` : ''; }; xs.addEventListener('input', upd); xs.addEventListener('change', upd); upd(); } }
  // Backlog 887: km laut Rechnung – Differenz zum letzten Stand beim Tippen; kleiner (Rechnung von heute bzw. ohne Datum) → Warnung, eine Stelle zu viel → Hinweis
  if (action === 'add_external_cost') { const ki = $('#extkmv'), ko = $('#extkmo'), kb = $('#extkmd'), lk = d && d.vehicle_info && d.vehicle_info.last_km; if (ki && kb && lk) { const upd = () => {
    const v = ki.value; const k = /^ *[0-9][0-9 .]*$/.test(v) ? Number(v.replace(/[ .]/g, '')) : null; const past = ko && ko.value && ko.value < bDate();
    kb.innerHTML = k === null || !Number.isFinite(k) || past ? '' : k < lk.km ? `<p class="panel warn small" role="alert" id="extkmlow" style="margin:4px 0 0">⚠️ ${esc(t('ext_km_lower').replace('{prev}', fmtNum(lk.km)))}</p>` : `<p class="small muted" id="extkmdiff" style="margin:4px 0 0">${esc(t('irv_km_diff').replace('{n}', fmtNum(k - lk.km)))}</p>${kmDigitsWarn(k, lk.km, 'id="extkmdigits"')}`;
  }; ki.addEventListener('input', upd); if (ko) ko.addEventListener('change', upd); } }
  if ($('#dupsel')) $('#dupsel').onchange = () => { const ta = $('#af textarea[name=note]'); const o = $('#dupsel').selectedOptions[0]; if (ta && !ta.value && $('#dupsel').value) ta.value = `${t('dup_of')} ${o.textContent.split(' · ')[0]}`; };
  offDayWatch($$('#af input[name=planned_date]'));
  // Backlog 890 (Blickwinkel „Werkstatt-Betriebsruhe zwischen den Jahren“): Fertig-/Teile-Liefertermin am Wochenende/Feiertag – nur Hinweis
  offDayWatch($$('#af input[name=ready_expected_on], #af input[name=parts_expected_date]'), 'date_offday_hint');
  if (action === 'record_work') { workDayWatch(c); hoursWatch(); }
  if (action === 'add_part') partQtyWatch();
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
    if (action === 'set_ready_date') p.ready_expected_on = String(fd.get('ready_expected_on') || ''); // leer = entfernen (Backlog 871)
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
          if (cur.case.status === 'abschlusskontrolle') { await api('POST', `/api/cases/${c.id}/commands`, { action: 'technical_release', command_id: uid(), expected_version: cur.case.version, note, payload: rel }, { timeoutMs: SEND_TIMEOUT_MS }); toast('✓'); } // Backlog 805f: Wiederholung über den Knopf „Technisch freigeben“
        } catch (err) { toast(t('qrel_step2_failed').replace('{msg}', err.message).replace('{b}', t('act_technical_release')), true); }
        await viewCase(c.id);
      } });
    }
    return cmd(action, fd.get('note') || null, p); // Promise zurück: zentrale Sperre bis zum Ende (Doppelklick)
  };
  return stockP;
}

// Backlog 973 (Blickwinkel „Mechaniker erfasst Arbeitszeit in Stunden und Minuten“): Der Server versteht „1:30“, „1 h 30“, „90 min“, „1,5 h“.
// Unter dem Feld steht die Umrechnung in Stunden und Minuten – wer „1,30“ für eineinhalb Stunden tippt, sieht „= 1 Std. 18 Min.“.
// Nur Anzeige: gesendet wird der getippte Text, der Server bewertet ihn (gleiche Muster wie `hoursNum` in src/util.js).
// Backlog 982: Zahlwörter/Brüche aus Diktat („zweieinhalb Stunden“, „half an hour“, „півтори години“) über `parseHours` (public/hours.js, auch am Server).
const hoursOf = (raw) => {
  const s = String(raw || '').trim().replace(/[\s\u00a0]+/g, ' '); if (!s || s.length > 60) return null;
  const p = parseHours(s); if (p && p.minutesOver) return null; if (typeof p === 'number') return Math.round(p * 60);
  const d = s.replace(new RegExp(`(\\d)\\s*${H_U}\\.?$`, 'i'), '$1');
  return /^\d{1,2}([.,]\d+)?$/.test(d) ? Math.round(Number(d.replace(',', '.')) * 60) : null;
};
const hoursText = (min) => { const h = Math.floor(min / 60); const m = min % 60; return !h ? t('wh_m').replace('{m}', m) : !m ? t('wh_h').replace('{h}', h) : t('wh_hm').replace('{h}', h).replace('{m}', m); };
function hoursWatch() {
  const inp = $('#whours'); const out = $('#whconv'); if (!inp || !out) return;
  const show = () => { const min = hoursOf(inp.value); const ok = min !== null && min > 0 && min <= 1440; out.textContent = ok ? hoursText(min) : ''; out.hidden = !ok; };
  inp.addEventListener('input', show); show();
  // Backlog 982 (Blickwinkel „Werkstatt-Tablet: Mechaniker diktiert den Arbeitsbericht“): Steht die Dauer im diktierten Tätigkeitstext
  // („Bremsbeläge vorne getauscht, zweieinhalb Stunden“) und ist das Stundenfeld leer, bietet ein Knopf an, sie zu übernehmen:
  // Stundenfeld = erkannter Text (der Server bewertet ihn), Tätigkeit ohne die Dauer. Nichts geschieht ohne Tippen.
  const desc = $('#af input[name=description]'); const box = $('#whdesc'); if (!desc || !box) return;
  const offer = () => {
    const d = inp.value.trim() ? null : durationIn(desc.value);
    if (!d) { box.hidden = true; box.textContent = ''; return; }
    box.innerHTML = `<button type="button" class="btn secondary small" data-whtake>⏱ ${esc(t('wh_take').replace('{d}', d.part).replace('{h}', hoursText(Math.round(d.hours * 60)).replace(/^=\s*/, '')))}</button>`;
    box.hidden = false;
    box.querySelector('[data-whtake]').onclick = () => {
      inp.value = d.part; desc.value = d.rest; box.hidden = true; box.textContent = '';
      inp.dispatchEvent(new Event('input', { bubbles: true })); desc.dispatchEvent(new Event('input', { bubbles: true }));
      desc.focus();
    };
  };
  desc.addEventListener('input', offer); inp.addEventListener('input', offer); offer();
}

// Backlog 983 (Blickwinkel „Werkstatt-Tablet: Mechaniker diktiert Teile und Mengen“): Menge als Zahlwort/Bruch („zwei“, „vier Liter“,
// „anderthalb Liter“, „дві штуки“) – unter dem Feld steht, was der Server daraus liest („= 2“, „= 4 l“). Steht die Menge im diktierten
// Teilenamen („zwei Bremsscheiben vorne“, „Motoröl 10W-40, 5 l“) und ist das Mengenfeld unverändert (1), bietet ein Knopf an, sie zu
// übernehmen: Mengenfeld = erkannter Text (der Server bewertet ihn), Name ohne die Menge. Nichts geschieht ohne Tippen.
const qtyLabel = (n, unit) => `= ${fmtNum(n)}${unit ? ' ' + unitL(unitCanon(unit) || unit) : ''}`;
function partQtyWatch() {
  const inp = $('#pqty'); const out = $('#pqconv'); if (!inp || !out) return;
  // Ziffer + bekannte Einheit („2 litres“, „5 l“): Zahl wie getippt (Dezimalzeichen je Sprache bewertet der Server), Einheit in App-Schreibweise
  const show = () => {
    const v = inp.value.trim(); const w = parseQty(v); const m = w ? null : v.match(/^(\d{1,6}(?:[.,]\d{1,3})?)\s*([^\s\d]{1,12}?)\.?$/);
    const txt = w && w.n > 0 && (w.unit === null || unitCanon(w.unit)) ? qtyLabel(w.n, w.unit) : m && unitCanon(m[2]) && !/^[x×]$/i.test(m[2]) ? `= ${m[1]} ${unitL(unitCanon(m[2]))}` : '';
    out.textContent = txt; out.hidden = !txt;
  };
  inp.addEventListener('input', show); show();
  const nm = $('#af input[name=name]'); const box = $('#pqname'); if (!nm || !box) return;
  const offer = () => {
    const q = nm.disabled || !['', '1'].includes(inp.value.trim()) ? null : qtyIn(nm.value);
    if (!q || !(q.n > 0) || (q.n === 1 && !q.unit)) { box.hidden = true; box.textContent = ''; return; }
    box.innerHTML = `<button type="button" class="btn secondary small" data-pqtake>🔢 ${esc(t('pq_take').replace('{d}', q.part).replace('{q}', qtyLabel(q.n, q.unit).replace(/^=\s*/, '')))}</button>`;
    box.hidden = false;
    box.querySelector('[data-pqtake]').onclick = () => {
      inp.value = q.part; nm.value = q.rest; box.hidden = true; box.textContent = '';
      inp.dispatchEvent(new Event('input', { bubbles: true })); nm.dispatchEvent(new Event('input', { bubbles: true }));
      nm.focus();
    };
  };
  nm.addEventListener('input', offer); inp.addEventListener('input', offer); offer();
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
  // Backlog 835 (Blickwinkel „Mechaniker trägt am nächsten Morgen die Stunden vom Vortag nach“): Das Datum steht auf heute – wer die
  // Arbeit des letzten Arbeitstags (Mo → Fr, Feiertage übersprungen) nachträgt, vergaß das Umstellen leicht. Für die Werkstatt ein Hinweis,
  // wenn am letzten Arbeitstag mit diesem Konto nichts erfasst ist, mit Knopf, der das Datum setzt (nur Hinweis, nichts wird vorgegeben).
  const pv = $('#wdprev');
  if (pv && S.me && S.me.role === 'workshop') {
    let pd = bDate(-1); for (let i = 0; i < 7 && (isWeekendD(pd) || holName(pd)); i++) pd = bDate(-2 - i);
    // 03.11.2026: kommt die Antwort erst, nachdem schon getippt wurde (langsames Netz in der Halle), keinen Knopf mehr einschieben –
    // er verschob „Speichern“ nach unten, ein Tipp darauf setzte dann still das Datum auf den Vortag statt zu speichern
    let typed = false; if (inp.form) inp.form.addEventListener('input', () => { typed = true; }, { once: true });
    if (pd >= (inp.min || '')) api('GET', '/api/work-day?date=' + encodeURIComponent(pd)).then((r) => {
      if (!document.body.contains(pv) || r.hours || typed) return;
      pv.innerHTML = `${esc(t('wd_prev_none').replace('{d}', fmtDue(pd)))} <button type="button" class="btn secondary" data-wdprevgo style="white-space:nowrap">${esc(t('wd_prev_go').replace('{d}', fmtD(pd)))}</button>`;
      pv.hidden = false;
      const b = pv.querySelector('[data-wdprevgo]');
      const sync = () => { pv.hidden = inp.value === pd; };
      b.onclick = () => { inp.value = pd; inp.dispatchEvent(new Event('change')); };
      inp.addEventListener('change', sync); inp.addEventListener('input', sync); sync();
    }).catch(() => {});
  }
  inp.addEventListener('change', loadWeek);
  inp.addEventListener('change', load); inp.addEventListener('input', load);
  setTimeout(load, 0); // nach einer Entwurfs-Wiederherstellung den dann gesetzten Tag lesen
}

// ---------- Kontrollen ----------
// Backlog 824: `cpl` = Abfahrtskontrolle – je Mangel Auswahl „betrifft gewähltes / gekoppeltes Fahrzeug“ (Text/Sichtbarkeit setzt cplUpdate)
function checklistHtml(cpl = false) {
  return S.meta.checklist.map((i) => `<div class="checkitem" data-key="${esc(i.key)}"><span id="cl_${esc(i.key)}">${esc(checkLabel(i.key))}</span>
    <span class="seg" role="radiogroup" aria-labelledby="cl_${esc(i.key)}"><label><input type="radio" name="${esc(i.key)}" value="ok" required>${esc(t('ok'))}</label><label class="bad"><input type="radio" name="${esc(i.key)}" value="mangel">${esc(t('defect'))}</label><label><input type="radio" name="${esc(i.key)}" value="na">${esc(t('na'))}</label></span>
    <div class="detail" hidden><input name="${esc(i.key)}__note" minlength="3" maxlength="1000" placeholder="${esc(t('defect_note'))}"><label class="check"><input type="checkbox" name="${esc(i.key)}__safety"> ${esc(t('safety_relevant'))}</label><p class="small muted" data-safetyhint>${esc(t('check_safety_locks'))}</p>${cpl ? `<div class="cplwrap" hidden><label for="cpl_${esc(i.key)}" class="small" style="white-space:nowrap">${esc(t('cpl_which'))}</label><select id="cpl_${esc(i.key)}" name="${esc(i.key)}__on"><option value="">–</option><option value="coupled">–</option></select></div>` : ''}</div></div>`).join('');
}
// Auswahl „Mangel betrifft“ an das gewählte Fahrzeug anpassen: nur mit fest gekoppeltem Fahrzeug sichtbar, sonst zurück auf das gewählte
function cplUpdate(form, sv) {
  const c = sv && sv.coupled;
  // anderes gekoppeltes Fahrzeug (z. B. von der Zugmaschine auf deren Anhänger umgestellt): „gekoppelt“ hieße jetzt das andere – zurücksetzen
  const cid = c ? c.id : '';
  if (form.dataset.cpl !== undefined && form.dataset.cpl !== cid) $$('.cplwrap select', form).forEach((x) => (x.value = ''));
  form.dataset.cpl = cid;
  const nm = (k, p) => `${t(k === 'anhaenger' ? 'trailer' : 'truck')} ${p}`;
  $$('.cplwrap', form).forEach((w) => {
    const sel = $('select', w);
    if (!c) { w.hidden = true; sel.value = ''; return; }
    w.hidden = false; sel.options[0].textContent = nm(sv.kind, sv.plate); sel.options[1].textContent = nm(c.kind, c.plate);
  });
}
// Telematik-km nicht übernommen: kleiner als davor erfasster bzw. größer als später erfasster Stand (src/telematics.js kmRejection)
const tmKmRej = (dir, km, at) => dir === 'above' ? t('tm_km_rejected_next').replace('{km}', fmtKm(km)).replace('{date}', at ? fmtD(at) : '–') : t('tm_km_rejected').replace('{km}', fmtKm(km));
const kmWarn = (r) => (r.km_rejected && r.km_rejected.next_km !== undefined ? ' · ' + t('km_not_taken_next').replace('{km}', fmtNum(r.km_rejected.km)).replace('{next}', fmtNum(r.km_rejected.next_km)) : r.km_rejected && r.km_rejected.previous_km === undefined ? ' · ' + t('km_not_taken_other').replace('{km}', fmtNum(r.km_rejected.km)) : r.km_rejected ? ' · ' + t('km_not_taken').replace('{km}', fmtNum(r.km_rejected.km)).replace('{prev}', fmtNum(r.km_rejected.previous_km)) : r.km_test_only ? ' · ' + t('km_test_only') : '') + (r.km_equals_truck ? ' · ' + t('km_eq_truck_saved').replace('{p}', r.km_equals_truck.plate) : ''); // Backlog 834
// Backlog 824: Antwort der Abfahrtskontrolle – Mängel am gekoppelten Fahrzeug bzw. gekoppeltes Fahrzeug nicht mehr vorhanden
const cplNote = (r) => (r && r.coupled_defects ? ' · ' + tn('cpl_reported', r.coupled_defects.n).replace('{v}', `${t(r.coupled_defects.kind === 'anhaenger' ? 'trailer' : 'truck')} ${r.coupled_defects.plate}`) : '') + (r && r.coupled_missing ? ' · ' + t('cpl_missing') : '');
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
  // nach einer Abmeldung (Leerlauf) können Ereignisse des alten Formulars nachlaufen (change beim Entfernen) – dann ohne Entwurf (Backlog 868)
  if (!S.me) return { load: () => null, save() {}, clear() {}, restore() {} };
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
  return S.meta.checklist.map((i) => ({ key: i.key, result: fd.get(i.key), note: fd.get(i.key + '__note') || null, safety_relevant: !!fd.get(i.key + '__safety'), ...(fd.get(i.key) === 'mangel' && fd.get(i.key + '__on') === 'coupled' ? { on_coupled: true } : {}) }));
}
async function viewInspection(caseId) {
  const d = await api('GET', '/api/cases/' + caseId);
  // Backlog 826 (Blickwinkel „Werkstatt-Tablet: Kontrolle nach Reparatur für den falschen Vorgang begonnen“): Kennzeichen stand nur klein neben der
  // Auftragsnummer – wer auf dem Tablet den falschen Auftrag antippte, speicherte die 18 Punkte und den km-Stand des Lkw vor sich am anderen
  // Fahrzeug (Kontrolle/Abschluss am falschen Auftrag, km eines anderen Lkw in der Akte). Jetzt großes Kennzeichen mit Fahrzeugart/Hersteller/
  // Auftrag, letzter erfasster km-Stand mit Differenz während der Eingabe; kleiner als zuletzt erfasst → Hinweis und Bestätigung vor dem Speichern.
  // Backlog 831 (Folge aus 826/829, Blickwinkel „Werkstatt schließt Reparatur am Anhänger mit km der Zugmaschine ab“): am km-Feld fehlte der
  // Anhänger-Hinweis – der Stand der Zugmaschine landete über die Kontrolle in der Akte des Anhängers. Jetzt Hinweis „nur Achskilometerzähler“.
  const veh = d.vehicle || {}; const lastKm = d.vehicle_info && d.vehicle_info.last_km ? d.vehicle_info.last_km : null;
  const vDesc = [veh.kind ? t('vk_' + veh.kind) : '', [veh.manufacturer, veh.model].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
  const cRaw = String(d.case.description || ''); const cDesc = cRaw.length > 90 ? cRaw.slice(0, 90).replace(/\s+\S*$/, '') + ' …' : cRaw; // an Wortgrenze kürzen
  render(`<p><a class="backlink" href="#/cases/${esc(caseId)}">‹ ${esc(t('back'))}</a></p><h1 data-title="${esc(d.case.case_no)} · ${esc(d.vehicle.plate)} · ${esc(t('inspection'))}">${esc(t('inspection'))}</h1>
    <section class="panel" id="irv" data-plate="${esc(veh.plate || '')}"><p style="margin:0 0 6px">${plate(veh.plate, { big: true })}</p>${vDesc ? `<p class="small" style="margin:0" id="irvveh">${esc(vDesc)}</p>` : ''}<p class="small" style="margin:4px 0 0"><b translate="no">${esc(d.case.case_no)}</b>${cDesc ? ' · ' + esc(cDesc) : ''}</p><p class="small muted" style="margin:6px 0 0">${esc(t('irv_plate_hint'))}</p></section>
    <form id="f">${checklistHtml()}<label for="km">${esc(t('km'))}${veh.kind === 'anhaenger' ? `<span class="hint" id="irvkmtr">${esc(t('mdone_kmtr'))}</span>` : ''}${lastKm ? `<span class="hint" id="kmlast">${esc(t('irv_last_km').replace('{km}', fmtNum(lastKm.km)).replace('{d}', fmtD(lastKm.measured_at)))}</span>` : ''}</label><input id="km" name="km" inputmode="numeric" pattern=" *[0-9][0-9 .]*" maxlength="40"><div id="kmd" aria-live="polite"></div><label for="n">${esc(t('note'))}</label><textarea id="n" name="n"></textarea><input type="hidden" name="rk" value="${esc(uid())}">
    <div class="actions"><button class="btn block" id="isb">${esc(t('irv_submit').replace('{plate}', veh.plate || ''))}</button></div></form>`, 'cases');
  const form = $('#f'); bindChecklist(form);
  // km-Eingabe wie der Server (Leerzeichen/Punkte als Tausendertrennung); ungültig → keine Anzeige, der Server meldet den Fehler
  const kmVal = () => { const v = $('#km').value; return /^ *[0-9][0-9 .]*$/.test(v) ? Number(v.replace(/[ .]/g, '')) : null; };
  const kmLower = () => { const k = kmVal(); return !!(lastKm && k !== null && Number.isFinite(k) && k < lastKm.km); };
  const kmInfo = () => {
    const box = $('#kmd'); if (!box) return; const k = kmVal();
    if (!lastKm || k === null || !Number.isFinite(k)) { box.innerHTML = ''; return; }
    if (k < lastKm.km) {
      const was = $('#kmok') && $('#kmok').checked;
      box.innerHTML = `<div class="panel warn" role="alert" id="kmlow"><p class="small" style="margin:0 0 6px">${esc(t('irv_km_lower').replace('{prev}', fmtNum(lastKm.km)).replace('{d}', fmtD(lastKm.measured_at)).replace('{plate}', veh.plate || ''))}</p><label style="display:flex;gap:8px;align-items:flex-start;font-weight:normal"><input type="checkbox" id="kmok"${was ? ' checked' : ''} style="width:auto;margin-top:3px"><span>${esc(t('irv_km_lower_ok').replace('{plate}', veh.plate || ''))}</span></label></div>`;
    } else box.innerHTML = `<p class="small muted" id="kmdiff" style="margin:4px 0 0">${esc(t('irv_km_diff').replace('{n}', fmtNum(k - lastKm.km)))}</p>${kmDigitsWarn(k, lastKm.km, 'id="kmdigits"')}`; // Backlog 837
  };
  $('#km').addEventListener('input', kmInfo);
  // Entwurf je Vorgang (Backlog 186, Werkstatt-Tablet in der Halle): Netzabbruch/Neuladen/Seitenwechsel verlieren die 18 Punkte nicht; die
  // Anfragekennung steht im Entwurf (verstecktes Feld) – kam die erste Sendung doch an, liefert der Server dieselbe Kontrolle statt einer zweiten.
  // Die Bestätigung „km-Stand stimmt“ gehört nicht in den Entwurf (Backlog 826) – nach dem Wiederherstellen erneut bewusst bestätigen
  const draft = bindFormDraft('insp_' + caseId, form, '', null, ['kmok']);
  kmInfo();
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (kmLower() && !($('#kmok') && $('#kmok').checked)) { toast(t('irv_km_confirm'), true); const cb = $('#kmok'); if (cb) { cb.focus(); cb.closest('.panel').scrollIntoView({ block: 'center' }); } return; }
    const key = form.rk.value || uid();
    try {
      const r = await api('POST', '/api/inspections', { kind: 'nach_reparatur', case_id: caseId, request_key: key, checklist_version: S.meta.checklist_version || undefined, items: collectChecklist(form), odometer_km: $('#km').value || null, note: $('#n').value || null }, { timeoutMs: SEND_TIMEOUT_MS }); // Backlog 799
      draft.clear();
      toast(`${t('check_saved')}${r.followups.length ? ' · ' + r.followups.map((f) => f.case_no).join(', ') : ''}${kmWarn(r)}`, !!r.km_rejected || !!r.km_equals_truck);
      location.hash = '#/cases/' + caseId;
    } catch (err) { if (err.offline) draft.save(); toast(err.offline ? `${err.message} ${t('form_draft_kept')}` : err.message, true); }
  };
}
async function viewDepartureCheck(preId) {
  if (!mayCheck()) { render(`<h1>${esc(t('departure_check'))}</h1><p class="muted">${esc(t('no_permission_view'))}</p>`, 'check'); return; }
  const vs = await vehiclesCached();
  if (!vs.length) { render(`<h1>${esc(t('departure_check'))}</h1>${outboxBanner()}${noVehiclesNote()}`, 'check'); return; }
  render(`<h1>${esc(t('departure_check'))}</h1>${outboxBanner()}${helpLink('check')}<form id="f"><label for="v">${esc(t('vehicle'))}</label><select id="v" required><option value="">–</option>${vs.map((v) => `<option value="${esc(v.id)}"${v.assigned && vs.filter((x) => x.assigned).length === 1 ? ' selected' : ''}>${esc(v.plate)}${v.kind === 'anhaenger' ? ' (' + esc(t('vk_anhaenger')) + ')' : ''}${v.availability === 'gesperrt' ? ' – ' + esc(t('locked')) : ''}</option>`).join('')}</select><div id="known"></div>
    ${checklistHtml(true)}${tachoPanel()}${glassPanel(true)}<label for="km">${esc(t('km'))}<span class="hint" id="kmtr" hidden>${esc(t('kmtr_hint'))}</span></label><p class="small muted" id="dckmlast" hidden style="margin:0 0 4px"></p><input id="km" inputmode="numeric" pattern=" *[0-9][0-9 .]*" maxlength="40"><div id="dckmd" aria-live="polite"></div>
    <label for="ph">${esc(t('photos_now'))}<span class="hint">${esc(t('check_photos_hint'))}</span></label><input type="file" id="ph" accept="image/jpeg,image/png,image/webp" multiple>
    <div class="actions"><button class="btn block" id="sb">${esc(t('submit_inspection'))}</button></div></form><p class="small"><a href="#/check/paper">${esc(t('paper_form'))}</a> – ${esc(t('paper_hint'))}</p><p class="small" id="dcdmg">${esc(t('dc_damage_hint'))} <a id="dcdmglink" href="#/new">${esc(t('report_damage'))} ›</a></p>`, 'check');
  const form = $('#f'); bindChecklist(form);
  // Backlog 646: Schaden außerhalb der Prüfpunkte (Delle, Kratzer, Plane – auch vorgefunden) → Meldung mit dem gewählten Fahrzeug
  const dmgLink = () => { const a = $('#dcdmglink'); if (a) a.href = /^VIN:[A-Z0-9]+$/.test($('#v').value) ? '#/new/' + $('#v').value : '#/new'; };
  $('#v').addEventListener('change', dmgLink);
  // Backlog 824: Mangel am fest gekoppelten Fahrzeug (Anhänger bzw. Zugmaschine) dort als Folgeauftrag – vor bindFormDraft (Optionen für den Entwurf)
  const cplSync = () => cplUpdate(form, vs.find((x) => x.id === $('#v').value));
  $('#v').addEventListener('change', cplSync);
  if (preId) { if (vs.some((v) => v.id === preId)) $('#v').value = preId; else toast(t('qr_vehicle_unknown'), true); }
  // Backlog 827 (Blickwinkel „Anhänger ohne eigene Zugmaschine – Fremd-Zugmaschine holt ihn ab“): beim Anhänger wurde der km-Stand der
  // Zugmaschine eingetragen und landete in der Akte des Anhängers (Leasing-/Wartungs-km). Hinweis am km-Feld: nur Achskilometerzähler des Anhängers
  const kmTr = () => { const v = vs.find((x) => x.id === $('#v').value); $('#kmtr').hidden = !(v && v.kind === 'anhaenger'); };
  $('#v').addEventListener('change', kmTr);
  const dcKm = () => departureKmInfo(vs); $('#v').addEventListener('change', dcKm); $('#km').addEventListener('input', dcKm); // Backlog 836
  dmgLink(); cplSync(); kmTr(); dcKm();
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
  // Backlog 823 (Blickwinkel „Fahrer wechselt mitten in der Abfahrtskontrolle das Fahrzeug“): Antworten, km-Stand und Fotos blieben beim
  // Umstellen der Auswahl stehen und wurden still dem neuen Fahrzeug zugeschrieben (Mängel/Sperre am falschen Lkw, km-Stand des anderen
  // Fahrzeugs). Jetzt Rückfrage unter der Auswahl: neu prüfen (leert alles) oder übernehmen (vorher falsch gewählt); Senden erst danach.
  let dcVeh = $('#v').value, dcFrom = null; // zuletzt gewähltes Fahrzeug bzw. Fahrzeug, für das die Antworten eingetragen wurden
  const dcHasInput = () => $$('input[type=radio]:checked', form).length > 0 || !!$('#km').value.trim() || !!($('#ph').files && $('#ph').files.length);
  const dcPlate = (id) => { const v = vs.find((x) => x.id === id); return v ? v.plate : id; };
  const dcClose = () => { dcFrom = null; const b = $('#dcsw'); if (b) b.remove(); };
  // erst nach Entwurf/QR-Vorauswahl gebunden – deren Auswahl löst keine Rückfrage aus
  $('#v').addEventListener('change', () => {
    const nv = $('#v').value;
    if (dcFrom && (nv === dcFrom || !nv)) { if (nv) { dcClose(); dcVeh = nv; } return; }
    if (!dcFrom && dcVeh && nv && nv !== dcVeh && dcHasInput()) dcFrom = dcVeh;
    if (nv) dcVeh = nv;
    if (!dcFrom || !nv) return;
    let box = $('#dcsw');
    if (!box) { box = document.createElement('div'); box.id = 'dcsw'; box.className = 'panel alert'; box.setAttribute('role', 'alert'); $('#known').insertAdjacentElement('beforebegin', box); }
    box.innerHTML = `<p><b>${esc(t('dcsw_title').replace('{from}', dcPlate(dcFrom)).replace('{to}', dcPlate(nv)))}</b></p><p class="small">${esc(t('dcsw_hint'))}</p><div class="actions"><button type="button" class="btn" id="dcswnew">${esc(t('dcsw_new'))}</button><button type="button" class="btn secondary" id="dcswkeep">${esc(t('dcsw_keep'))}</button></div>`;
    $('#dcswnew').onclick = () => {
      $$('.checkitem', form).forEach((row) => { $$('input[type=radio]', row).forEach((r) => (r.checked = false)); const det = $('.detail', row); det.hidden = true; $$('input', det).forEach((x) => { if (x.type === 'checkbox') x.checked = false; else { x.value = ''; x.required = false; } }); $$('select', det).forEach((x) => (x.value = '')); row.classList.remove('missing'); });
      $('#km').value = ''; $('#ph').value = ''; $('#km').dispatchEvent(new Event('input', { bubbles: true })); $('#ph').dispatchEvent(new Event('change', { bubbles: true }));
      dcClose(); tachoCheck(); draft.save(); toast(t('dcsw_cleared'));
      const first = $('.checkitem input[type=radio]', form); if (first) first.focus();
    };
    $('#dcswkeep').onclick = () => { dcClose(); draft.save(); $('#v').focus(); };
  });
  const key = uid();
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (dcFrom && $('#dcsw')) { $('#dcsw').scrollIntoView({ block: 'center' }); toast(t('dcsw_decide'), true); return; }
    const sb = $('#sb'); // festhalten – Seitenwechsel während des Hochladens (siehe Meldung)
    const who = outboxWho();
    // km-Stand wie der Server prüfen (0–5.000.000, ganze Zahl, Tausenderpunkt erlaubt) – sonst scheiterte die Kontrolle offline dauerhaft im Postausgang (20.10.2026)
    if ($('#km').value.trim() && !kmInputOk($('#km').value)) { $('#km').focus(); toast(t('km_invalid'), true); return; }
    const body = { kind: 'abfahrt', vehicle_id: $('#v').value, request_key: key, items: collectChecklist(form), odometer_km: $('#km').value || null, checklist_version: S.meta.checklist_version || undefined }; // Fassung der Prüfliste (Postausgang über einen App-Wechsel)
    const files = [...($('#ph').files || [])].slice(0, PHOTO_MAX);
    const hasDefect = body.items.some((i) => i.result === 'mangel');
    try {
      sb.disabled = true;
      const r = await api('POST', '/api/inspections', body, { timeoutMs: SEND_TIMEOUT_MS });
      draft.clear();
      // Fotos gehören zum Mangel: an den (ersten) Folgeauftrag hängen; ohne Mangel wird nichts hochgeladen
      let failed = 0;
      // Ziel: erster eigener Folgeauftrag; ein Wiederholungsvermerk an einem fremden Vorgang ist für Fahrer nicht sichtbar (17.10.2026)
      const fTarget = (r.followups.find((f) => f && f.id && (!f.repeat || f.own)) || (S.me.role !== 'driver' ? r.followups.find((f) => f && f.id) : null) || {}).id;
      let later = 0;
      if (files.length && fTarget) ({ failed, later } = await uploadPhotosSafe('/api/inspections', body, r, fTarget, files, sb, who));
      const lockedPage = sb.isConnected && (r.vehicle_locked || r.coupled_locked);
      // Ergebnisseite „gesperrt“ nennt „gespeichert“ und die Sperre selbst – Einblendung nur noch für Foto-/km-Hinweise (verdeckte sonst die Überschrift)
      const extra = `${files.length && !fTarget ? ' · ' + photosSkippedText(r) : ''}${failed ? ' · ' + tn('photos_failed', failed) : ''}${later ? ' · ' + tn('photos_stored', later) : ''}${kmWarn(r)}${cplNote(r)}`;
      if (!lockedPage) toast(`${t('check_saved')}${extra}${lockedWarn(r)}`, !!failed || !!r.km_rejected || !!r.km_equals_truck || !!r.vehicle_locked || !!r.coupled_locked);
      else if (extra) toast(extra.slice(3), !!failed || !!r.km_rejected || !!r.km_equals_truck);
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

// Backlog 836 (Blickwinkel „Fahrer tippt bei der Abfahrtskontrolle eine Ziffer zu viel“): ein Tippfehler nach oben wurde still übernommen und
// ließ danach jeden richtigen Stand als „kleiner als zuletzt“ scheitern. Letzter Stand des gewählten Fahrzeugs + Differenz beim Tippen;
// mehr Stellen als der letzte Stand → Hinweis „Ziffern prüfen“ (keine km-Grenze, nichts gesperrt – Grenze ist offene Frage „km-Sprung nach oben“)
function departureKmInfo(vs) {
  const v = vs.find((x) => x.id === $('#v').value); const last = v && Number.isFinite(v.last_km) ? v.last_km : null;
  const hint = $('#dckmlast'); const box = $('#dckmd'); if (!hint || !box) return;
  hint.hidden = last === null; hint.textContent = last === null ? '' : t('irv_last_km').replace('{km}', fmtNum(last)).replace('{d}', fmtD(v.last_km_at));
  const raw = $('#km').value; const k = kmInputOk(raw) && raw.trim() ? Number(raw.replace(/[\s\u00a0.]/g, '')) : null;
  if (last === null || k === null) { box.innerHTML = ''; return; }
  if (k < last) { box.innerHTML = `<p class="panel warn small" role="alert" id="dckmlow" style="margin:4px 0 0">⚠️ ${esc(t('dc_km_lower').replace('{prev}', fmtNum(last)).replace('{d}', fmtD(v.last_km_at)))}</p>`; return; }
  box.innerHTML = `<p class="small muted" id="dckmdiff" style="margin:4px 0 0">${esc(t('irv_km_diff').replace('{n}', fmtNum(k - last)))}</p>${kmDigitsWarn(k, last, 'id="dckmdigits"')}`;
}
// Backlog 837 (Folge aus 836): mehr Stellen als der letzte Stand → Hinweis „Ziffern prüfen“ in allen km-Feldern mit bekanntem letztem Stand (keine km-Grenze)
function kmDigitsWarn(k, last, attr, key = 'dc_km_digits') { return Number.isFinite(k) && Number.isFinite(last) && last > 0 && String(Math.trunc(k)).length > String(Math.trunc(last)).length ? `<p class="panel warn small" role="alert" ${attr} style="margin:4px 0 0">⚠️ ${esc(t(key).replace('{km}', fmtNum(k)).replace('{prev}', fmtNum(last)))}</p>` : ''; }
function kmInputOk(v) { const x = String(v).replace(/[\s\u00a0]/g, ''); if (!/^\d+$/.test(x) && !/^[1-9]\d{0,2}(\.\d{3})+$/.test(x)) return false; const n = Number(x.replace(/\./g, '')); return n >= 0 && n <= 5000000; }

async function viewCheckPaper(...a) { return (await lazyModule('fahrzeug')).viewCheckPaper(...a); }

// ---------- Fahrzeuge ----------
// Abfahrtskontrolle bzw. Schadensmeldung nur für Rollen, die der Server zulässt (src/cases.js) – vorher bekamen Lesezugriff/Disposition
// die Links und erst beim Senden 403 (18.10.2026)
const mayCheck = () => ['driver', 'fleet', 'owner', 'workshop'].includes(S.me && S.me.role);
const mayReport = () => !!(S.me && S.me.role !== 'viewer');


// Direktsprung mit Filter (z. B. „Heute zu tun“ → #/vehicles?f=with_findings): Filter übernehmen, Adresse ohne Parameter
// ersetzen (sonst setzt jeder Neuaufbau den Filter zurück); „Mit Agentenbefunden“ sortiert dabei nur für diese Sitzung nach Befunden
// Startseiten-Leiste → gefilterte Fahrzeugliste (feste Ziele, damit der Routen-Wächter sie prüfen kann)
const FB_HREF = { gesperrt: '#/vehicles?f=gesperrt', werkstatt: '#/vehicles?f=werkstatt', meldung_offen: '#/vehicles?f=meldung_offen', einsatzbereit_lt_system: '#/vehicles?f=einsatzbereit_lt_system' };

async function viewVehicles(...a) { return (await lazyModule('fahrzeug')).viewVehicles(...a); }
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


function departureLockBox(sv, kv) {
  const locked = (kv && kv.locked) || (sv && sv.availability === 'gesperrt');
  const c = (kv && kv.coupled) || (sv && sv.coupled && sv.coupled.availability === 'gesperrt' ? { ...sv.coupled, locked: true } : null);
  // Backlog 508: heute (Berlin) liegt für das Fahrzeug schon eine Kontrolle vor – z. B. auf dem zweiten Gerät erfasst; nur Hinweis, keine Sperre, kein Name
  const today = sv && sv.last_check_at && BERLIN_FMT.format(new Date(sv.last_check_at)) === bDate() ? `<p class="panel small" role="status" data-dctoday style="margin:0 0 8px">${esc(t('dc_today_done').replace('{t}', fmtDT(sv.last_check_at)).replace('{r}', t(sv.last_check_result === 'maengel' ? 'dc_today_def' : 'dc_today_ok')))}</p>` : '';
  return (sv ? outboxVehAlert(sv.id) : '') + today + (locked ? `<div class="alert" role="alert" style="margin-bottom:8px"><b>${esc(t('scan_locked'))}</b></div>` : '') + coupledAlert(c) + (kv ? drvNotes(kv.notes) + knownDefects(kv.known_defects) + relItems(kv.open_items_after_release) + coupledDefects(kv.coupled) : '');
}
const lockedWarn = (r) => (r && r.vehicle_locked ? ` · ${t('locked')} – ${t('do_not_drive')}` : '') + (r && r.coupled_locked ? ` · ${coupledLockedText(r.coupled_locked)}` : ''); // gekoppeltes Gespann gesperrt (23.10.2026)
const coupledAlert = (c) => (c && c.locked ? `<div class="alert" role="alert" style="margin-bottom:8px">${esc(coupledLockedText(c))}</div>` : '');

// Fälligkeit nach Kilometern: belegter Wert (due_km) oder letzte Durchführung in km + Intervall (gleiche Regel wie Server)
// Reifenpositionen: gespeichert als Kürzel (VA-L, HA-L-aussen, AH1-R, Reserve …); Deutsch zeigt das Kürzel, UK/EN Klartext (19.10.2026)
const posL = (code) => posWord(code, S.lang); // gemeinsame Übersetzung mit den Agentenbefunden (public/finding-messages.js)
const fmtKm = (n) => fmtNum(n) + (S.lang === 'uk' ? ' км' : ' km'); // UK-Texte nutzen „км“ (19.10.2026)
// ebenso mm/bar (20.10.2026: UK zeigte „2,8 mm“ neben „< 1,6 мм“)
const fmtMm = (n) => fmtNum(n) + (S.lang === 'uk' ? ' мм' : ' mm');



// Backlog 841: km-Fälligkeit fällig/überfällig mit einer letzten Ablesung, die mehr Stellen hat als die vorherige (Server: km_digits_prev)
const kmDigHtml = (m) => (m && m.km_digits_prev ? ` <span class="chip mittel" style="white-space:normal" data-kmdigits>⚠️ ${esc(t('km_due_digits').replace('{prev}', fmtKm(m.km_digits_prev)))}</span>` : '');

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
    // Backlog 844: „km bei Übernahme“ mit weniger Stellen als der km-Stand vor Vertragsbeginn – gefahrene km/Überschreitung vermutlich zu hoch
    if (s.km.start_digits_prev) out.push(`<span class="chip mittel" style="white-space:normal" data-ctstartdigits>⚠️ ${esc(t('ct_start_digits').replace('{prev}', fmtKm(s.km.start_digits_prev)))}</span>`);
  }
  // letzte Ablesung zum Stichtag/bis „Beendet am“ auch ohne berechenbare Kontingent-Zeile (Backlog 241: ohne Kontingent, nach Tachotausch,
  // „km bei Übernahme“ fehlt) – der Stand für die Meldung an den Leasinggeber, mit Herkunft; nie geschätzt
  // Backlog 601: auch bei Kontingent-Zeile – der km-Stand ist die Zahl, die der Leasinggeber abfragt (vorher nur in der CSV)
  if (c.reading) out.push(`<span data-ctread>${esc(t('km'))}: ${fmtKm(c.reading.km)} <span class="small muted">(${esc(t('ct_km_read'))} ${fmtD(c.reading.measured_at)}${c.reading.source ? ' · ' + esc(odoSrc(c.reading.source)) : ''})</span></span>`);
  // Backlog 840: letzte Ablesung mit mehr Stellen als die vorherige (ohne Begründung) – vor der Meldung an den Leasinggeber prüfen
  if (c.reading && c.reading.digits_prev) out.push(`<span class="chip mittel" style="white-space:normal" data-ctdigits>⚠️ ${esc(t('ct_km_digits').replace('{prev}', fmtKm(c.reading.digits_prev)))}</span>`);
  // Backlog 512: Leasing/Miete eines Lkw ohne Kontingent und ohne jede Ablesung (bis Stichtag) – gleiche Regel wie die CSV (`noReading`)
  if (c.no_reading) out.push(`<span class="muted" data-ctnoread>${esc(t('ct_km_noread'))}</span>`);
  if (c.monthly_rate_net !== null) out.push(`${esc(t('ct_rate'))}: ${eur(c.monthly_rate_net)}`);
  if (!noEvidence) out.push(`<span class="small muted">${esc(t('evidence'))}: ${esc(c.evidence)}${c.note ? ' · ' + esc(c.note) : ''}</span>`);
  if (c.ended_on) out.push(`<span class="small">${esc(t('ct_ended_on'))} ${fmtD(c.ended_on)}${c.end_note ? ' · ' + esc(c.end_note) : ''}</span>`);
  return out;
}
// Backlog 808/809: Konflikt beim Speichern eines Stammdaten-Formulars – Werte lesen (dflt = Stand beim Rendern) und nach dem Neuladen nur die
// selbst geänderten Felder ins frische Formular setzen; Felder, die die andere Person geändert hat, markieren (.ct-other), gleiches Feld → Warnung
// Backlog 812: Felder ohne `name` (z. B. Wochentage der Notfallnummer) nehmen über `data-cv` teil; `data-cvl` = Anzeigename im Konflikthinweis
const cvEl = (fm, k) => fm.elements.namedItem(k) || fm.querySelector(`[data-cv="${CSS.escape(k)}"]`);
function formVals(fm, dflt) { const o = {}; for (const el of fm.elements) { const nm = el.name || (el.dataset && el.dataset.cv); if (!nm || el.type === 'hidden') continue; o[nm] = el.type === 'checkbox' ? (dflt ? el.defaultChecked : el.checked) : el.tagName === 'SELECT' ? (dflt ? ([...el.options].find((x) => x.defaultSelected) || el.options[0] || {}).value || '' : el.value) : (dflt ? el.defaultValue : el.value); } return o; }
function conflictKeep(fm, L, hid, dev = false) { // dev (Backlog 822): Konflikt vom eigenen zweiten Gerät/Fenster (Einstellungen, nur Inhaber)
  const dp = fm.closest('details'); const now = formVals(fm, true);
  // eigene, inzwischen gespeicherte Änderung (verlorene Antwort) bzw. andere Person setzte denselben Wert → nichts zu entscheiden
  if (Object.keys(L.mine).every((k) => !(k in now) || now[k] === L.mine[k]) && Object.keys(L.seen).every((k) => !(k in now) || now[k] === L.seen[k] || now[k] === L.mine[k])) { toast(t('saved_before')); return false; }
  const other = Object.keys(L.seen).filter((k) => k in now && now[k] !== L.seen[k] && now[k] !== L.mine[k]); const names = [];
  for (const k of other) { const el = cvEl(fm, k); if (!el) continue; el.classList.add('ct-other'); el.setAttribute('aria-describedby', hid); if (el.dataset.cvl) { names.push(el.dataset.cvl); continue; } const lb = el.type === 'checkbox' ? el.closest('label') : el.previousElementSibling; if (lb && lb.tagName === 'LABEL') names.push((el.type === 'checkbox' ? lb.textContent : (lb.firstChild && lb.firstChild.textContent) || lb.textContent).trim()); }
  const both = []; for (const [k, v] of Object.entries(L.mine)) { const el = cvEl(fm, k); if (!el) continue; if (el.type === 'checkbox') el.checked = !!v; else el.value = v; if (other.includes(k) && now[k] !== v) both.push(k); }
  if (dp) dp.open = true;
  fm.insertAdjacentHTML('afterbegin', `<div class="panel warn small" role="status" id="${esc(hid)}" data-ctlost>${esc(t(dev ? 'ctd_kept' : 'case_conflict_kept'))}${names.length ? `<br>${esc(t(dev ? 'ctd_other_fields' : 'ct_other_fields'))}: <b>${esc(names.join(', '))}</b>` : ''}${both.length ? `<br>⚠️ ${esc(t(dev ? 'ctd_both_fields' : 'ct_both_fields'))}` : ''}</div>`);
  const hn = fm.querySelector('[data-ctlost]'); if (hn) hn.scrollIntoView({ block: 'center' }); return true;
}
const conflictMine = (fm) => { const seen = formVals(fm, true), cur = formVals(fm, false); const mine = {}; for (const k of Object.keys(cur)) if (cur[k] !== seen[k]) mine[k] = cur[k]; return { seen, mine }; };





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
// Backlog 876: Angaben zu Schlüssel/Fahrzeugschein der bisherigen Werkstatt werden beim Wechsel zurückgesetzt – vorher ankündigen
const hoText = (x) => `${t('ho_keys')}: ${t(x.keys ? 'ho_' + x.keys : 'ho_none')} · ${t('ho_papers')}: ${t(x.papers ? 'ho_' + x.papers : 'ho_none')}`;
const rwsDrop = (c) => (c.planned_date ? `<p class="small muted" data-rwsdrop>${esc(t('rws_drop_plan').replace('{d}', fmtD(c.planned_date)))}</p>` : c.workshop_ack_at ? `<p class="small muted" data-rwsdrop>${esc(t('rws_drop_ack'))}</p>` : '')
  + (c.handover_keys || c.handover_papers ? `<p class="small muted" data-rwsho>${esc(t('rws_drop_ho').replace('{v}', () => hoText({ keys: c.handover_keys, papers: c.handover_papers })))}</p>` : '');
// Backlog 521: offener Winterauftrag mit Termin bzw. „ohne Termin“ (Winterlisten der Reifen-Flotte, Werkstatt-Startseite, Disposition)
const woApptTxt = (o) => `🔧 ${esc(t('mo_open'))} ${esc(o.case_no)} · ${o.planned_date ? `${esc(t('planned_appt'))} ${fmtD(o.planned_date)}` : esc(t('ms_ohne_termin'))}`;
// Backlog 862 (Blickwinkel „Werkstatt-Tablet: Mechaniker sucht ein Teil per Teilenummer“): Teilenummern ohne Leerzeichen, Bindestrich, Punkt
// und Schrägstrich vergleichen (wie pnKey in src/partsusage.js) – „A0004201220“ findet „A 000 420 12 20“; Name/Lagerort wie bisher (helpNorm)
const pnCompact = (x) => String(x || '').toLowerCase().replace(/[\s\-./]/g, '');
const stockHit = (i, q) => { const h = helpNorm(q); if (!h) return true; if ([i.name, i.part_number, i.location].some((x) => helpNorm(x).includes(h))) return true; const c = pnCompact(q); return c.length >= 3 && pnCompact(i.part_number).includes(c); };
const stockOpt = (i) => `<option value="${esc(i.id)}">${esc(i.name)}${i.part_number ? ' · ' + esc(i.part_number) : ''} (${fmtNum(i.on_hand)} ${esc(unitL(i.unit))})</option>`;
const STOCK_Q_MIN = 8; // ab so vielen Artikeln steht über der Artikelauswahl ein Suchfeld (lange Auswahllisten am Tablet)
const stockQHtml = (id) => `<input type="search" id="${id}" class="stockq" data-stockq placeholder="${esc(t('stock_q_ph'))}" aria-label="${esc(t('stock_q_ph'))}" autocomplete="off" enterkeyhint="search" style="margin-bottom:4px"><p class="small muted" data-stockqn role="status" aria-live="polite" hidden></p>`;
// Suchfeld filtert die Auswahl (Optionen neu aufbauen – option.hidden wirkt in iOS Safari nicht); die gewählte Position bleibt immer erhalten,
// genau ein Treffer wird bei leerer Auswahl vorgewählt (onchange wie bei Handauswahl)
function stockPick(inp, sel, list, first) {
  const info = inp.nextElementSibling;
  inp.oninput = () => {
    const cur = sel.value; const all = list(); const q = inp.value.trim(); const hits = all.filter((i) => i.id === cur || stockHit(i, q));
    sel.innerHTML = first + hits.map(stockOpt).join('');
    const n = hits.filter((i) => i.id !== cur || stockHit(i, q)).length;
    if (cur && hits.some((i) => i.id === cur)) sel.value = cur; else if (!cur && q && n === 1) sel.value = hits[0].id; else sel.value = '';
    if (info) { info.hidden = !q; info.textContent = n ? tn('stock_q_hits', n) : t('stock_q_none'); }
    if (sel.value !== cur && sel.onchange) sel.onchange();
  };
}
async function loadStockSelect(c) {
  const el = $('#stocksel'); if (!el) return;
  let items = [];
  let siteItems = [];
  try { siteItems = (await api('GET', `/api/stock?site=${encodeURIComponent(c.workshop_site || '')}`)).items.filter((i) => i.site === c.workshop_site); items = siteItems.filter((i) => i.on_hand > 0); } catch { return; }
  // Backlog 515 (Blickwinkel „Werkstatt Bayern vertritt Dortmund“): angeboten wird nur das Lager der zuständigen Werkstatt – Name nennen; geführtes
  // Lager ohne Bestand → kurzer Hinweis statt still fehlender Auswahl
  if (!items.length) { if (siteItems.length && c.workshop_site) el.innerHTML = `<p class="small muted" data-stocknone>${esc(t('stock_none_ws').replace('{ws}', wsName(c.workshop_site)))}</p>`; return; }
  const first = `<option value="">${esc(t('without_stock'))}</option>`;
  el.innerHTML = `<label for="stocksi">${esc(t('from_stock'))}: ${esc(wsName(c.workshop_site))}</label>${items.length >= STOCK_Q_MIN ? stockQHtml('stockq') : ''}<select name="stock_item_id" id="stocksi">${first}${items.map(stockOpt).join('')}</select><p class="small muted" id="stockpricehint" hidden>${esc(t('stock_out_price_hint'))}</p>`;
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
    const raw = qf ? String(qf.value).trim() : ''; const pw = parseQty(raw); const q = pw ? pw.n : Number(raw.replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.')); // Backlog 983: „zwei“
    const over = !!it && raw !== '' && Number.isFinite(q) && q > it.on_hand + 1e-9;
    if (!over) { if (h) h.remove(); return; }
    if (!h) { h = document.createElement('p'); h.id = 'stockqty'; h.className = 'small panel warn'; h.setAttribute('role', 'status'); qf.after(h); }
    h.textContent = t('stock_qty_over').replace('{q}', fmtNum(it.on_hand)).replace('{u}', unitL(it.unit)).replace(/\.\.(?=\s|$)/g, '.');
  };
  if (qf) qf.addEventListener('input', qtyCheck);
  const sq = $('#stockq', el); if (sq) stockPick(sq, sel, () => items.filter((i) => i.on_hand > 0), first); // leer gebuchte Artikel (Backlog 232) fallen beim Filtern weg
  // Backlog 990 (Blickwinkel „Mechaniker tippt die Teilenummer vom Karton ab, statt den Artikel aus dem Lager zu wählen“): frei erfasste
  // Teilenummer eines vorrätigen Artikels (auch anders geschrieben, „A 000 420 12 20“) → Hinweis mit Knopf „aus dem Lager entnehmen“;
  // sonst bleibt der Lagerbestand stehen, obwohl das Teil verbaut ist (Buchbestand ≠ Regal, Bestellvorschlag zu spät)
  const fpn = $('#freepart [name=part_number]');
  if (fpn) {
    const box = document.createElement('p'); box.className = 'small panel'; box.id = 'pninstock'; box.setAttribute('role', 'status'); box.hidden = true; fpn.after(box);
    const pnCheck = () => {
      const c = pnCompact(fpn.value); const hits = !sel.value && !fpn.disabled && c.length >= 3 ? items.filter((i) => i.on_hand > 0 && pnCompact(i.part_number) === c) : [];
      box.hidden = !hits.length; if (!hits.length) { box.textContent = ''; return; }
      box.innerHTML = `📦 ${esc(t('stock_pn_instock'))}<br>${hits.slice(0, 3).map((i) => `<button type="button" class="btn secondary small" data-pnpick="${esc(i.id)}" style="margin-top:4px">${esc(i.name)}${i.part_number ? ' · ' + esc(i.part_number) : ''} (${fmtNum(i.on_hand)} ${esc(unitL(i.unit))})</button>`).join(' ')}${hits.length > 3 ? ` +${hits.length - 3}` : ''}`;
      box.querySelectorAll('[data-pnpick]').forEach((b) => { b.onclick = () => {
        if (sq && ![...sel.options].some((o) => o.value === b.dataset.pnpick)) { sq.value = ''; sq.dispatchEvent(new Event('input', { bubbles: true })); }
        sel.value = b.dataset.pnpick; sel.onchange(); box.hidden = true; box.textContent = ''; sel.focus();
      }; });
    };
    fpn.addEventListener('input', pnCheck); sel.addEventListener('change', pnCheck); pnCheck();
  }
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
    o.disabled = true; if (it) it.on_hand = 0;
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
  const li = data.matches.map((m) => `<li><a href="#/cases/${esc(m.case_id)}" translate="no">${esc(m.case_no)}</a>${m.same_case ? ` (${esc(t('dup_invoice_this_case'))})` : ''} · ${esc(m.supplier || '–')} · ${esc(eur(m.amount_net))} · ${esc(fmtD(m.booked_at))}</li>`).join('');
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
  if (v === 'fremdleistung') return t('odo_src_ext'); // Backlog 887: km laut Rechnung einer Fremdleistung
  return v;
}
function evFromTo(e) {
  // Backlog 887: km-Stand laut Rechnung der Fremdleistung – übernommen, nicht übernommen (Rücksprung) oder nur Testumgebung
  if (e.action === 'add_external_cost' && e.payload && e.payload.odometer_km !== undefined && Number.isFinite(Number(e.payload.odometer_km))) {
    const p = e.payload; const k = p.km_rejected; const kmN = Number(p.odometer_km);
    const txt = k ? '⚠ ' + (k.next_km !== undefined ? t('ev_km_greater').replace('{km}', fmtNum(kmN)).replace('{next}', fmtNum(Number(k.next_km))) : t('ev_km_smaller').replace('{km}', fmtNum(kmN)).replace('{prev}', fmtNum(Number(k.previous_km))))
      : (p.km_test_only ? t('ext_km_ev_test') : t('ext_km_ev')).replace('{km}', fmtNum(kmN)).replace('{d}', p.odometer_on ? fmtD(p.odometer_on) : fmtD(e.created_at));
    return `<div class="small${k ? '' : ' muted'}"${k ? ' style="color:var(--mid)"' : ''} data-ev-extkm${k ? '="rejected"' : ''}>${esc(txt)}</div>`;
  }
  if (e.action === 'set_parts_drive' && e.payload) return `<div class="small muted" data-ev-pdr>${esc(t(e.payload.cleared ? 'pdr_ev_off' : 'pdr_ev_on'))}</div>`;
  if (e.payload && e.payload.parts_drive_ended) return `<div class="small muted" data-ev-pdrend>${esc(t('pdr_ev_ended'))}</div>` + evFromTo({ ...e, payload: (({ parts_drive_ended: _x, ...r }) => r)(e.payload) });
  if (e.action === 'set_work_state' && e.payload && e.payload.cleared) return `<div class="small muted" data-ev-wstclear>${esc(t('wst_cleared'))}</div>`;
  const p = e.payload; if (!p || typeof p !== 'object' || !('from' in p) || !('to' in p)) return '';
  // Backlog 876: beim Werkstattwechsel zurückgesetzte Angaben zu Schlüssel/Fahrzeugschein der bisherigen Werkstatt
  if (e.action === 'reassign_workshop' && p.handover_before && typeof p.handover_before === 'object') return `<div class="small muted">${esc(wsName(p.from))} → ${esc(wsName(p.to))}</div><div class="small muted" data-ev-horeset>${esc(t('ev_ho_reset').replace('{v}', () => hoText(p.handover_before)))}</div>`;
  if (e.action === 'parts_partial') return ''; // eigene Zeile „Rest erwartet am“ (Backlog 449)
  const oneSide = ['set_followup', 'set_planned_date', 'set_vehicle_location', 'set_handover', 'set_occurred_at'].includes(e.action) || /^\d{4}-\d{2}-\d{2}$/.test(String(p.from || p.to || ''));
  if (!(p.from && p.to) && !oneSide) return '';
  if (!p.from && !p.to) return '';
  const v = (x) => { if (x === null || x === undefined || x === '') return '–';
    if (e.action === 'change_priority') return t('prio_' + x);
    if (e.action === 'reassign_workshop') return wsName(x);
    if (e.action === 'set_vehicle_location' && typeof x === 'object') return [x.location, x.service, x.on ? fmtD(x.on) : null].filter(Boolean).join(' · ') || '–';
    if (e.action === 'set_occurred_at') return fmtOccurred(x);
    if (e.action === 'set_handover' && typeof x === 'object') return hoText(x);
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
// Backlog 882: Vermerk „Vorgang <Nr>: …“ (im späteren Auftrag mit erledigt) in der Oberflächensprache; sonst null
function rriNote(n) { const m = String(n || '').match(/^Vorgang (\S{1,40}): ([\s\S]*)$/); return m ? t('rri_done_in').replace('{v}', () => m[1]) + ': ' + m[2] : null; }
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
  // Backlog 882: Restarbeit eines freigegebenen Vorgangs im laufenden Auftrag mit erledigt (Verlauf in beiden Vorgängen)
  if (e.action === 'resolve_released_item' && typeof p.from_case_no === 'string') return t('rri_ev').replace('{v}', () => p.from_case_no).replace('{d}', () => String(p.description || '')) + (n ? ' · ' + n : '');
  if (e.action === 'resolve_open_item' && typeof p.done_in_case_no === 'string') return rriNote(n) || n;
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
function vehInfo(vi, c, A = []) {
  const prev = (vi && vi.previous_same_item) || [];
  const vn = (vi && vi.notes) || [];
  const wr = (vi && vi.warranties) || [];
  const ls = (vi && vi.lease_contracts) || []; // Backlog 290: nur Leitung
  // Backlog 467: in den 90 Tagen vor der Meldung abgeschlossene Vorgänge (ohne die schon unter „Gleicher Prüfpunkt“ genannten)
  const rc = ((vi && vi.recent_closed) || []).filter((o) => !prev.some((p) => p.id === o.id));
  const cpl = (vi && vi.coupled) || []; // Backlog 633: fest gekoppeltes Fahrzeug mit offenen Vorgängen
  const ri = (vi && vi.released_items) || []; // Backlog 881: offene Restarbeiten freigegebener Vorgänge desselben Fahrzeugs
  if (!vi || (!cpl.length && !ri.length && !vi.other_open_total && !vi.inspections_due.length && !vi.last_km && !prev.length && !vn.length && !wr.length && !ls.length && !rc.length)) return '';
  const today = bDate();
  const parts = [];
  if (vi.other_open_total) parts.push(`<dt>${esc(t('vi_other_cases'))}</dt><dd>${vi.other_open_cases.map((o) => `<a href="#/cases/${esc(o.id)}" translate="no">${esc(o.case_no)}</a> <span class="chip ${esc(o.priority)}">${esc(t('st_' + o.status))}</span>${o.safety_lock ? ` <span class="chip kritisch">${esc(t('locked'))}</span>` : ''}${o.description ? `<br><span class="small" data-ocdesc>${ltxt(clipTxt(cDesc(o.description), 90))}${o.created_at ? ` <span class="muted">· ${fmtDT(o.created_at)}</span>` : ''}</span>` : ''}`).join('<br>')}${vi.other_open_total > vi.other_open_cases.length ? `<br><span class="small muted">+${vi.other_open_total - vi.other_open_cases.length}</span>` : ''}</dd>`);
  for (const g of cpl) parts.unshift(`<dt>${esc(t('vi_coupled').replace('{p}', g.plate).replace('{k}', t(g.kind === 'anhaenger' ? 'trailer' : 'truck')))}</dt><dd data-vicoupled>${S.me.role !== 'workshop' ? `<a href="#/vehicles/${esc(g.vehicle_id)}">${esc(t('vehicle_file'))} ›</a>` : ''}${g.open_cases.length ? g.open_cases.map((o) => `<br><a href="#/cases/${esc(o.id)}" translate="no">${esc(o.case_no)}</a> <span class="chip ${esc(o.priority)}">${esc(t('st_' + o.status))}</span>${o.safety_lock ? ` <span class="chip kritisch">${esc(t('locked'))}</span>` : ''}${o.claim ? ` <span class="chip" data-vicclaim>${esc(t('claim_title'))}: ${esc(o.claim.insurer || '')}${o.claim.claim_no ? ' · ' + noTr(o.claim.claim_no) : ''}</span>` : ''}${o.description ? `<br><span class="small"${langAttr(o.description)}>${ltxt(clipTxt(cDesc(o.description), 80))}</span>` : ''}`).join('') : `<br><span class="small muted">${esc(t('vi_coupled_none'))}</span>`}</dd>`);
  if (vi.coupled_truncated) parts.unshift(`<dd class="small muted" data-vicoupledmore>${esc(t('vi_coupled_more'))}</dd>`);
  if (vi.inspections_due.length) parts.push(`<dt>${esc(t('vi_due').replace('{days}', nDays(vi.inspections_due_days || 30)))}${vi.inspections_due.some((m) => m.recall_ref) ? ' · ' + esc(t('vi_recalls')) : ''}</dt><dd>${vi.inspections_due.map((m) => `${esc(mkR(m))} ${m.next_due_date ? fmtD(m.next_due_date) : esc(t('vi_recall_open'))}${m.next_due_date && m.next_due_date < today ? ` <span class="chip kritisch">${esc(t('ms_ueberfaellig'))}</span>` : ''}${m.recall_ref ? ` <span class="small muted">(${noTr(m.recall_ref)})</span>` : ''}`).join('<br>')}${(vi.inspections_due_total || 0) > vi.inspections_due.length ? `<br><span class="small muted" id="vidmore">+${vi.inspections_due_total - vi.inspections_due.length} · <a class="noprint" href="#/vehicles/${encodeURIComponent(c.vehicle_id)}">${esc(t('vi_due_all'))} ›</a></span>` : ''}</dd>`);
  if (rc.length) parts.push(`<dt>${esc(t('vi_recent_closed'))}</dt><dd data-virecent>${rc.map((o) => `${o.id ? `<a href="#/cases/${esc(o.id)}" translate="no">${esc(o.case_no)}</a>` : `<b>${esc(o.case_no)}</b>`} <span class="chip">${esc(o.kind === 'released' ? t('st_fahrzeug_freigegeben') : t('vi_kind_' + o.kind))}</span> <span class="small muted">${fmtD(o.closed_at)}</span>${o.description ? `<br><span class="small">${ltxt(clipTxt(cDesc(o.description), 90))}</span>` : ''}${viBy(o)}${o.note ? `<br><span class="small muted">${esc(t('vi_close_note'))}: ${ltxt(clipTxt(o.note, 160))}</span>` : ''}`).join('<br>')}${vi.recent_closed_truncated ? `<br><span class="small muted">${esc(t('vi_recent_more'))} · <a class="noprint" href="#/vehicles/${encodeURIComponent(c.vehicle_id)}">${esc(t('vehicle_file'))} ›</a></span>` : ''}<div class="small muted">${esc(t('vi_recent_closed_hint'))}</div></dd>`);
  if (ri.length) parts.unshift(`<dt>${esc(t('vi_rel_items'))}</dt><dd data-virelitems>${ri.map((o) => `<span${langAttr(o.description)}>${esc(clipTxt(o.description, 160))}</span>${o.safety_relevant ? ` <span class="chip kritisch">${esc(t('safety_relevant'))}</span>` : ''}<br><span class="small muted">${o.case_id ? `<a href="#/cases/${esc(o.case_id)}" translate="no">${esc(o.case_no)}</a>` : esc(o.case_no)}${o.closed_at ? ' · ' + esc(t('st_fahrzeug_freigegeben')) + ' ' + fmtD(o.closed_at) : ''}</span>${A.includes('resolve_released_item') && o.id ? ` <button type="button" class="btn secondary noprint" data-relres="${esc(o.id)}">${esc(t('rri_btn'))}</button>` : ''}`).join('<br>')}${vi.released_items_truncated ? `<br><span class="small muted">${esc(t('vi_rel_items_more'))}${S.me.role !== 'workshop' ? ` · <a class="noprint" href="#/vehicles/${encodeURIComponent(c.vehicle_id)}">${esc(t('vehicle_file'))} ›</a>` : ''}</span>` : ''}<div class="small muted">${esc(t('vi_rel_items_hint'))}</div></dd>`);
  if (prev.length) parts.unshift(`<dt>${esc(t('vi_prev_same'))}</dt><dd>${prev.map((o) => `<a href="#/cases/${esc(o.id)}" translate="no">${esc(o.case_no)}</a> · ${esc(t('st_fahrzeug_freigegeben'))} ${fmtD(o.closed_at)}${viBy(o)}`).join('<br>')}<div class="small muted">${esc(t('vi_prev_same_hint'))}</div></dd>`);
  if (wr.length) parts.unshift(`<dt>${esc(t('vi_warranty'))}</dt><dd>${wr.map((w) => `<a href="#/cases/${esc(w.case_id)}" translate="no">${esc(w.case_no)}</a> · ${esc(w.item)}${w.item_kind === 'part' && w.supplier ? ` <span class="small muted">(${esc(supplierLabel(w.supplier))})</span>` : ''} · ${esc(t('warranty_until_d').replace('{d}', fmtD(w.warranty_until)))}`).join('<br>')}${vi.warranties_truncated ? `<div class="small" role="note" data-warrmore>${esc(t('warr_more').replace('{n}', vi.warranties_max))}</div>` : ''}<div class="small muted">${esc(t('vi_warranty_hint'))}</div></dd>`);
  // Backlog 414: Wartungs-/Full-Service-Verträge getrennt mit eigenem Hinweis (Leistungsumfang laut Vertrag)
  const svc = ls.filter((l) => l.kind === 'wartung'), lsl = ls.filter((l) => l.kind !== 'wartung');
  if (svc.length) parts.unshift(`<dt>${esc(t('vi_service'))}</dt><dd data-viservice>${svc.map((l) => `${esc(l.partner)}${l.contract_no ? ' · ' + noTr(l.contract_no) : ''}${l.end_date ? ` <span class="small muted">${esc(t('vi_lease_until').replace('{d}', fmtD(l.end_date)))}</span>` : ''}`).join('<br>')}<div class="small muted">${esc(t('vi_service_hint'))}</div></dd>`);
  if (lsl.length) parts.unshift(`<dt>${esc(t('vi_lease'))}</dt><dd data-vilease>${lsl.map((l) => `${esc(t('ck_' + l.kind))} · ${esc(l.partner)}${l.contract_no ? ' · ' + noTr(l.contract_no) : ''}${l.end_date ? ` <span class="small muted">${esc(t('vi_lease_until').replace('{d}', fmtD(l.end_date)))}</span>` : ''}`).join('<br>')}<div class="small muted">${esc(t('vi_lease_hint'))}</div></dd>`);
  if (vn.length) parts.unshift(`<dt>${esc(t('vnotes'))}</dt><dd>${vn.map((n) => `<b>ⓘ ${esc(n.text)}</b>${n.valid_until ? ` <span class="small muted">${esc(t('vnote_until').replace('{d}', fmtD(n.valid_until)))}</span>` : ''}`).join('<br>')}</dd>`);
  if (vi.last_km) parts.push(`<dt>${esc(t('km'))}</dt><dd>${fmtKm(vi.last_km.km)} <span class="small muted">(${fmtD(vi.last_km.measured_at)})</span></dd>`);
  return `<details class="small vinfo" style="margin-top:8px"${ri.length || cpl.some((g) => g.open_cases.length) || vi.other_open_total || prev.length || rc.length || vn.length || wr.length || ls.length || vi.inspections_due.some((m) => m.recall_ref || (m.next_due_date && m.next_due_date < today)) ? ' open' : ''}><summary><b>${esc(t('vi_title'))}</b></summary><dl class="kv">${parts.join('')}</dl></details>`;
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


async function viewDriverGuide(...a) { return (await lazyModule('verwaltung')).viewDriverGuide(...a); }

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
        <div><label for="qto">${esc(t('quiet_to'))}</label><input id="qto" type="time" step="60" required value="${esc(q ? q.to : '')}"></div>${tzNote() ? `<div style="grid-column:1/-1">${tzNote()}</div>` : ''}
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
    $$('[data-ack]', root).forEach((b) => (b.onclick = async () => { try { await api('POST', `/api/notifications/${b.dataset.ack}/ack`, undefined, { timeoutMs: SEND_TIMEOUT_MS }); /* Backlog 805g: wiederholbar */ await refreshUnread(); again(); } catch (err) { toast(err.message, true); } }));
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
  let vehicles = null; let fineList = null; let fineTrunc = false; let stockList = null; let ctList = null; let timer = null; let seq = 0;
  // Bußgelder nur Inhaber/Fuhrparkleitung/Lesezugriff, Lager nur Inhaber/Fuhrparkleitung/Werkstatt (eigenes Lager) – wie die Server-Rechte
  const canFines = ['owner', 'fleet', 'viewer'].includes(S.me.role); const canStock = ['owner', 'fleet', 'workshop'].includes(S.me.role);
  const norm = searchKey;
  const run = async () => {
    const q = $('#gq').value.trim(); S.lastSearch = q; const my = ++seq; const box = $('#gr');
    if (q.length < 2) { box.innerHTML = `<p class="muted small">${esc(t('search_hint'))}</p>${matchMedia('(hover: hover) and (pointer: fine)').matches ? `<p class="muted small" data-kbd>${esc(t('search_kbd'))}</p>` : ''}`; return; }
    try {
      // Inhaber/Leitung: auch außer Betrieb genommene Fahrzeuge (Weg zur Akte, z. B. verkauft) – Vorgänge dazu fand die Suche schon (19.10.2026)
      if (!vehicles) {
        const [va, vi] = await Promise.all([api('GET', '/api/vehicles'), isMgr() ? api('GET', '/api/vehicles?inactive=1') : null]);
        vehicles = va.vehicles.concat(vi ? vi.vehicles.map((v) => ({ ...v, __inactive: true })) : []);
      }
      const n = norm(q);
      // Treffer je Bereich höchstens 10 (Vorgänge 20) – Gesamtzahl und Hinweis „Suche genauer eingeben“ statt stillem Abschneiden
      const vHit = (k) => vehicles.filter((v) => [v.plate, v.vin, v.trailer_plate, v.truck_plate, v.manufacturer, v.model].some((x) => norm(x).includes(k)) || (v.former_plates || []).some((x) => norm(x).includes(k))); // früheres Kennzeichen (Backlog 256)
      const ncq = plateNoCountry(q); let vAll = vHit(n); if (!vAll.length && ncq) vAll = vHit(norm(ncq)); if (!vAll.length) { const fv = vinOf(q); if (fv && fv.v) vAll = vHit(norm(fv.v)); } /* eingefügte „FIN: …“ (Backlog 980) */ const vs = vAll.slice(0, 10); // Länderkennung aus ausländischem Schreiben (Backlog 902)
      const cr = await api('GET', '/api/cases?status=&limit=20&q=' + encodeURIComponent(q)); const cs = cr.cases;
      // Suche nur in den 500 jüngsten Schreiben – Hinweis statt stillem Abschneiden (20.10.2026)
      if (canFines && !fineList) { const fr = await api('GET', '/api/fines'); fineList = fr.fines; fineTrunc = !!fr.truncated; }
      if (canStock && !stockList) stockList = (await api('GET', '/api/stock')).items;
      // Backlog 899 (Blickwinkel „Leasinggesellschaft/Versicherer ruft an und nennt nur die Vertrags- bzw. Schadennummer“): Verträge
      // (Nummer/Partner, Schreibweise ohne Leerzeichen/Bindestrich/Punkt egal) und Versicherungsfälle (Server-Suche wie die Liste) – nur Inhaber/Leitung
      if (isMgr() && !ctList) ctList = (await api('GET', '/api/contracts?filter=alle')).contracts;
      const clr = isMgr() ? await api('GET', '/api/claims?filter=alle&q=' + encodeURIComponent(q.slice(0, 60))) : null;
      await loadHelp(S.lang).catch(() => {}); // Hilfe-Schritte (Backlog 597); fehlt das Paket (offline ohne Cache), ohne Hilfe-Treffer
      if (my !== seq) return;
      const lq = q.toLowerCase(); const hq = helpNorm(q); // Lager, Behörde, Vertragspartner: Umlaute/ue/ss gleich (Backlog 995)
      const refQ = q.toUpperCase().replace(/[ ./-]/g, '').replace(/^(AZ|AKTENZEICHEN):?/, ''); const fAll = canFines ? fineList.filter((f) => [f.plate, f.plate_in_letter].some((x) => norm(x).includes(n)) || [f.fine_no, f.reference, f.authority].some((x) => String(x || '').toLowerCase().includes(lq)) || (hq.length >= 3 && helpNorm(f.authority).includes(hq)) || (refQ.length >= 4 && String(f.reference || '').toUpperCase().replace(/[ ./-]/g, '').includes(refQ))) : []; /* Backlog 993: Aktenzeichen ohne Leerzeichen/Punkte/Striche */ const fs = fAll.slice(0, 10);
      // Backlog 995 (Blickwinkel „Kollegin mit ukrainischer/englischer Tastatur sucht „Munchen“, „Dusseldorf“, „Strasse“): Behörde des
      // Bußgelds und Vertragspartner wie Lager und Hilfe mit `helpNorm` (ü = ue = u, ß = ss) – vorher fand nur die genaue Schreibweise mit Umlaut.
      const sAll = canStock && hq ? stockList.filter((i) => stockHit(i, q)) : []; // Backlog 862: Teilenummer auch ohne Leerzeichen/Bindestrich
      const ss = sAll.slice(0, 10);
      const nk = (x) => norm(x).replace(/[\s\-./]/g, ''); const nq = nk(q);
      const kAll = ctList && nq ? ctList.filter((c) => (c.contract_no && nk(c.contract_no).includes(nq)) || norm(c.partner).includes(n) || (hq.length >= 3 && helpNorm(c.partner).includes(hq))) : []; const ks = kAll.slice(0, 10);
      const clAll = clr ? clr.claims : []; const cls = clAll.slice(0, 10);
      const more = (shown, all) => (all > shown ? `<p class="small muted" data-more>${esc(t('search_more').replace('{n}', shown).replace('{m}', all))}</p>` : '');
      // Hilfe-Abschnitte der eigenen Rolle (gleiche Suche wie auf der Hilfeseite)
      const hs = !helpLoaded(S.lang) ? [] : (helpMatches(helpSections(S.me.role).map((h) => ({ name: h, title: t(`help_${h}_t`), steps: t(`help_${h}_s`).split('|') })), q) || []).sort((a, b) => b.title_hit - a.title_hit).slice(0, 5);
      box.innerHTML = `<h2>${esc(t('nav_vehicles'))} <span class="chip">${vAll.length}</span></h2>${more(vs.length, vAll.length)}${vs.length ? `<div class="list">${vs.map((v) => `<a class="row" href="#/vehicles/${encodeURIComponent(v.id)}">${plate(v.plate, { locked: v.availability === 'gesperrt' })}<span class="title">${v.kind === 'anhaenger' ? `<span class="chip">${esc(t('vk_anhaenger'))}</span> ` : ''}${esc(v.manufacturer || '')} ${esc(v.site || '')}</span><span class="chip">${esc(v.__inactive ? t('inactive_vehicles') : t('av_' + v.availability))}</span><span class="sub">${esc(v.vin || '')}${((x) => (x ? ` · <b data-formerhit>${esc(t('former_plate_hit').replace('{p}', x))}</b>` : ''))((v.former_plates || []).find((x) => norm(x).includes(n) && !norm(v.plate).includes(n)))}</span></a>`).join('')}</div>` : noneP()}
        <h2>${esc(t('nav_cases'))} <span class="chip">${cs.length}${cr.truncated ? '+' : ''}</span></h2>${cr.truncated ? `<p class="small muted" data-more>${esc(t('search_more_cases').replace('{n}', cs.length))} <a href="#/cases" id="gcases">${esc(t('search_all_cases'))}</a></p>` : ''}${caseList(cs, '–')}`
        + (canFines && fineTrunc ? `<p class="small muted" id="gftrunc">${esc(t('fines'))}: ${esc(t('fines_truncated'))}</p>` : '')
        + (fs.length ? `<h2>${esc(t('fines'))} <span class="chip">${fAll.length}</span></h2>${more(fs.length, fAll.length)}<div class="list" id="gfines">${fs.map((f) => `<a class="row" href="#/fines/${esc(f.id)}">${plate(f.plate || f.plate_in_letter)}<span class="title">${esc(t('fk_' + f.kind))}</span><span class="chip">${esc(t('fs_' + f.status))}</span><span class="sub">${noTr(f.fine_no)}${f.reference ? ' · ' + noTr(f.reference) : ''}${f.authority ? ' · ' + esc(f.authority) : ''}</span></a>`).join('')}</div>` : '')
        + (ks.length ? `<h2>${esc(t('ct_title'))} <span class="chip">${kAll.length}</span></h2>${more(ks.length, kAll.length)}<div class="list" id="gcontracts">${ks.map((c) => `<a class="row" href="#/vehicles/${encodeURIComponent(c.vehicle_id)}">${plate(c.plate)}<span class="title">${esc(t('ck_' + c.kind))} · ${esc(c.partner)}${c.contract_no ? ' · ' + noTr(c.contract_no) : ''}</span>${ctChip(c.status)}</a>`).join('')}</div>` : '')
        + (cls.length ? `<h2>${esc(t('claims'))} <span class="chip">${clAll.length}</span></h2>${more(cls.length, clAll.length)}<div class="list" id="gclaims">${cls.map((c) => `<a class="row" href="#/cases/${encodeURIComponent(c.case_id)}">${plate(c.plate)}<span class="title">${esc(c.insurer)}${c.claim_no ? ' · ' + noTr(c.claim_no) : ''}${c.opponent_claim_no ? ` · ${esc(t('co_claim_no'))} ${noTr(c.opponent_claim_no)}` : ''}</span><span class="chip">${esc(t('cls_' + c.status))}</span><span class="sub"><span translate="no">${esc(c.case_no)}</span> · ${esc(t('claim_reported'))} ${fmtD(c.reported_on)}</span></a>`).join('')}</div>` : '')
        + (ss.length ? `<h2>${esc(t('stock'))} <span class="chip">${sAll.length}</span></h2>${more(ss.length, sAll.length)}<div class="list" id="gstock">${ss.map((i) => `<a class="row ${i.below_min ? 'p-mittel' : ''}" href="#/stock/${esc(i.id)}"><span class="chip">${esc(wsName(i.site))}</span><span class="title">${esc(i.name)}</span><b>${fmtNum(i.on_hand)} ${esc(unitL(i.unit))}</b><span class="sub">${[i.part_number && esc(i.part_number), i.location && esc(i.location), i.below_min && esc(t('below_min'))].filter(Boolean).join(' · ')}</span></a>`).join('')}</div>` : '')
        + (hs.length ? `<h2>${esc(t('help'))} <span class="chip">${hs.length}</span></h2><div class="list" id="ghelp">${hs.map((h) => `<a class="row" href="#/help?s=${h.name}&q=${encodeURIComponent(q)}"><span>?</span><span class="title">${esc(t(`help_${h.name}_t`))}</span><span></span></a>`).join('')}</div>` : '');
      const gc = $('#gcases'); if (gc) gc.onclick = () => { S.caseQ = q; try { sessionStorage.setItem('cfp_cf', 'all'); } catch {} };
      announceHits(vAll.length + cs.length + fAll.length + kAll.length + clAll.length + sAll.length + hs.length);
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
  const parts = ['report', 'accident', 'wild', 'tachofault', 'theft', 'glass', 'lost', 'fuel', 'flat', 'roadchk', 'nostart', 'tow', 'warnlight', 'leak', 'stow', 'custdmg', 'hitrun', 'vandal', 'marten', 'storm', 'bridge', 'fire', 'reefer', 'brake', 'parkbrake', 'pedal', 'injury', 'fixobj', 'tarp', 'load', 'mirror', 'coupling', 'grease', 'elec', 'batt', 'lights', 'door', 'stuck', 'visib', 'loose', 'adas', 'steer', 'engine', 'susp', 'gear', 'seat', 'dash', 'exhaust', 'cabtilt', 'pest', 'nest', 'gelfuel', 'dryfuel', 'safetykit', 'spare', 'wheel', 'toll', 'climate', 'window', 'fuelcap', 'fuelcard', 'underrun', 'floor', 'tyre', 'cablock', 'vibr', 'deck', 'roofice', 'cargo', 'numplate', 'pfilter', 'step', 'lashgear', 'contour', 'sticker', 'cabkit', 'cableak', 'telem', 'oillevel', 'prio', ...(r === 'dispatch' ? [] : ['check']), 'push', 'offline', 'login2fa'];
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
        await api('PATCH', '/api/me', { home_site: hs.value }, { timeoutMs: SEND_TIMEOUT_MS }); // Backlog 805k: Wiederholung unverändert
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
    $$('[data-sid]', box).forEach((b) => (b.onclick = async () => { try { await api('DELETE', `/api/me/sessions/${b.dataset.sid}`, undefined, { timeoutMs: SEND_TIMEOUT_MS }); toast('✓'); await loadSessions(); } catch (err) { /* Backlog 805k (Funkloch): Wiederholung → 404 */ if (lostDup(b, {}, err, ['not_found'])) { toast(t('saved_before')); await loadSessions(); return; } lostMark(b, {}, err); toast(err.message, true); } }));
    const all = $('#sessall', box); if (all) all.onclick = async () => { try { const r = await api('POST', '/api/me/sessions/revoke-others', undefined, { timeoutMs: SEND_TIMEOUT_MS }); toast(t('sessions_ended_n').replace('{n}', r.revoked) + (r.push_devices ? ' · ' + t('push_revoked_n').replace('{n}', r.push_devices) : '')); await loadSessions(); } catch (err) { toast(err.message, true); } };
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
  $('#pw').onsubmit = async (e) => { e.preventDefault(); try { const r = await api('POST', '/api/me/password', Object.fromEntries(new FormData(e.target)), { timeoutMs: SEND_TIMEOUT_MS });
    // Passwörter nicht im offenen Formular stehen lassen; der Server meldet andere Geräte ab (19.10.2026)
    // Backlog 805k (Funkloch): Wiederholung nach verlorener Antwort – neues Passwort gilt schon → duplicate statt „Altes Passwort falsch“
    e.target.reset(); const dd = e.target.closest('details'); if (dd) dd.open = false; toast(r && r.duplicate ? t('saved_before') : '✓ ' + t('pw_changed_others')); } catch (err) { toast(err.message, true); } };
}




async function loadTotp(...a) { return (await lazyModule('konto', 1)).loadTotp(...a); }





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
// Backlog 953: quiet = Aufruf schreibt in die bestehende Seite (INPLACE in scripts/build-app.mjs) – kein seitenfüllender Ladehinweis.
function lazyModule(g, quiet) {
  if (!LAZY_MODULES[g]) LAZY_MODULES[g] = import(`./app-${g}.js${LAZY_TRY[g] ? `?r=${LAZY_TRY[g]}` : ''}`).then((m) => { LAZY_READY[g] = true; return m; }).catch((e) => { delete LAZY_MODULES[g]; LAZY_TRY[g] = (LAZY_TRY[g] || 0) + 1; console.error(e); throw new Error(t('lazy_load_failed')); });
  if (!LAZY_READY[g] && !quiet) { const gen = S.routeGen, h = location.hash, p = LAZY_MODULES[g]; setTimeout(() => { if (!LAZY_READY[g] && LAZY_MODULES[g] === p && S.routeGen === gen && location.hash === h) render(`<p class="muted">${esc(t('loading'))}</p>`); }, LAZY_HINT_MS); }
  return LAZY_MODULES[g];
}

export { $, $$, BERLIN_DT_FMT, BERLIN_FMT, BRIDGE_HINT, CARGO_HINT, CT_KINDS, DEFECT_RESULTS, FUEL_HINT, GLASS_HINT, HITRUN_HINT, MARTEN_HINT, MORE_MAX, NUMPLATE_HINT, OPEN_CASE_ST, PHOTO_TIMEOUT_MS, ROOFICE_HINT, S, SEND_TIMEOUT_MS, STATES, STOCK_Q_MIN, STORM_HINT, STOW_HINT, STRINGS, THEFT_HINT, TM_PROV, TOW_HINT, TST, VANDAL_HINT, VEH_SORTS, WILD_HINT, WST_ST, afLink, agentFindingsCsv, announceHits, api, auditActionLabel, auditDetailText, bDate, berlinLocalDT, bindLang, bindPwShow, bindTachoCancel, cDesc, caseList, checkLabel, claimChip, clipTxt, comboClearV, conflictKeep, conflictMine, coverageGaps, ctChip, ctLines, ctRet, dataQualityCsv, dateOpts, decIn, defectItemsCsv, defectVehiclesCsv, deviceId, download, downloadChecked, dqDetail, dur, emHoursText, ensureLang, envFn, esc, eur, eur3, eurIst, fMsg, fcLabel, federalHoliday, fileUrl, filterUsers, fmtD, fmtDT, fmtDue, fmtHM, fmtKm, fmtMm, fmtMonth, fmtNum, formVals, helpLink, helpNorm, hj, hoMissing, holName, holidayGaps, huNote, inviteExpired, isMgr, isUnusedUser, isWeekendD, kmDigHtml, kmDigitsWarn, kmFcHint, kmFcHtml, kmInputOk, kmUnclearDateDue, langAttr, langLoaded, langSelect, locOf, lostDup, lostIs, lostMark, ltxt, mEv, mY, maintOrderHtml, markInvalid, mayReport, mk, mkR, nDays, noSticker, noTr, noVehiclesNote, noneP, nowMs, occurredFields, occurredValue, odoSrc, offDayWatch, ownerT, partsEta, partsWaitDays, phoneIn, planVehTag, plate, plateCmp, pnCompact, pnm, posL, prepareUpload, printHead, printStamp, provL, pwField, qrSvg, rc2, rdyOf, rdyTxt, readCsvFile, reasonText, recentRepeat, recurFix, render, resetUserState, rkFor, rwsDrop, searchKey, siteKeyUi, siteSelect, sortPref, sortUsers, stackTables, stockHit, stockNoteText, stockOpt, stockPick, stockQHtml, supplierLabel, t, tachoHistList, telAbroad, telHref, tfill, tireAge, tireSizeSame, tlHash, tmAge, tmKmRej, tn, toast, translateLockReason, translateNextAction, tzNote, uiLoc, uid, unitIn, unitL, usersCsv, vOverdue, vehiclesCached, viewLoginCode, vlAt, vsDef, warrChip, woApptTxt, woTag, wsAll, wsForSite, wsLabel, wsName, wsOptions };
