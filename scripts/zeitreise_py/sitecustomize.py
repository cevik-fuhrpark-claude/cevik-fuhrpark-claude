# [CLAUDE] Testhilfe für die UI-Zeitreise (scripts/ui-zeitreise.sh): verschiebt die Uhr der UI-Skripte auf CFP_FAKE_NOW.
# Wird nur über PYTHONPATH=scripts/zeitreise_py geladen. Wirkt auf
#  - Python: datetime.datetime.now/utcnow/today, datetime.date.today, time.time (erwartete Werte der Skripte)
#  - Browser: jede neue Seite/jeder neue Kontext bekommt die Playwright-Uhr ab CFP_FAKE_NOW (läuft normal weiter)
# Der Dev-Server bekommt dieselbe Zeit über scripts/zeitreise.mjs (restart-dev.sh liest CFP_FAKE_NOW).
import os, sys

_iso = os.environ.get('CFP_FAKE_NOW', '')
if _iso:
    import datetime as _dt, time as _time
    _target = _dt.datetime.fromisoformat(_iso.replace('Z', '+00:00')).timestamp()
    _off = _target - _time.time()
    _real_time = _time.time
    _time.time = lambda: _real_time() + _off

    _RealDT, _RealDate = _dt.datetime, _dt.date

    class _FakeDT(_RealDT):
        @classmethod
        def now(cls, tz=None):
            return _RealDT.fromtimestamp(_time.time(), tz)

        @classmethod
        def utcnow(cls):
            return _RealDT.fromtimestamp(_time.time(), _dt.timezone.utc).replace(tzinfo=None)

        @classmethod
        def today(cls):
            return _RealDT.fromtimestamp(_time.time())

    class _FakeDate(_RealDate):
        @classmethod
        def today(cls):
            return _RealDate.fromtimestamp(_time.time())

    _dt.datetime = _FakeDT
    _dt.date = _FakeDate

    try:
        from playwright.sync_api._generated import Browser as _Browser

        def _now_s():
            return _time.time()

        _orig_ctx = _Browser.new_context
        _orig_page = _Browser.new_page

        def _new_context(self, *a, **k):
            c = _orig_ctx(self, *a, **k)
            c.clock.install(time=_now_s())
            return c

        def _new_page(self, *a, **k):
            pg = _orig_page(self, *a, **k)
            pg.context.clock.install(time=_now_s())
            return pg

        _Browser.new_context = _new_context
        _Browser.new_page = _new_page
    except Exception as e:  # ohne Playwright (z. B. andere Python-Aufrufe) nichts tun
        sys.stderr.write(f'zeitreise_py: Playwright-Uhr nicht gesetzt ({e})\n')
