// [CLAUDE] Testhilfe: verschiebt die Uhr (Date/Date.now) des Node-Prozesses auf CFP_FAKE_NOW (ISO-Zeitpunkt).
// Nur für Tests: node --import ./scripts/zeitreise.mjs … – die Uhr läuft ab dem Zielzeitpunkt normal weiter.
const target = Date.parse(process.env.CFP_FAKE_NOW || '');
if (Number.isNaN(target)) throw new Error('CFP_FAKE_NOW fehlt oder ist kein gültiger Zeitpunkt (z. B. 2026-10-31T23:30:00Z).');
const R = Date;
const off = target - R.now();
class FakeDate extends R {
  constructor(...a) { if (a.length) super(...a); else super(R.now() + off); }
  static now() { return R.now() + off; }
}
globalThis.Date = FakeDate;
