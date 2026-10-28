# [CLAUDE] Messung Startzeit (Backlog 588, 28.10.2026): erster Aufruf ohne Cache bis zur sichtbaren Anmeldeseite,
# je Sprache (DE/UK/EN) unter Netzdrosselung (Chrome-Vorgaben „Slow 3G“ / „Fast 3G“) und CPU-Drosselung 4×.
# Kein Prüfskript (nicht in pruefen.sh): Messwerte schwanken; Ergebnisse in docs/BETRIEB.md („Startzeit“) festhalten.
# Aufruf: CFP_GZIP=1 PORT=8788 node --experimental-sqlite scripts/dev-server.mjs &  dann  CFP_URL=http://localhost:8788 python3 scripts/startzeit.py
# Optional: CFP_NETZE=slow3g,fast3g,ohne  CFP_LAEUFE=2
import os, time, json
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8788')
NETZE = {  # wie Chrome DevTools: Latenz ms, Durchsatz Byte/s
    'slow3g': {'latency': 2000, 'downloadThroughput': 50_000, 'uploadThroughput': 50_000},
    'fast3g': {'latency': 562.5, 'downloadThroughput': 180_000, 'uploadThroughput': 84_375},
    'ohne': None,
}
netze = [n for n in os.environ.get('CFP_NETZE', 'slow3g,fast3g').split(',') if n in NETZE]
laeufe = int(os.environ.get('CFP_LAEUFE', '1'))
erg = []
with sync_playwright() as p:
    br = p.chromium.launch()
    for netz in netze:
        for lang in ['de', 'uk', 'en']:
            for i in range(laeufe):
                c = br.new_context(viewport={'width': 390, 'height': 844}, locale={'de': 'de-DE', 'uk': 'uk-UA', 'en': 'en-GB'}[lang], service_workers='block')
                q = c.new_page()
                cdp = c.new_cdp_session(q)
                cdp.send('Network.enable')
                cdp.send('Network.setCacheDisabled', {'cacheDisabled': True})
                if NETZE[netz]: cdp.send('Network.emulateNetworkConditions', {'offline': False, **NETZE[netz]})
                cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
                gesamt = {'b': 0}
                cdp.on('Network.loadingFinished', lambda e: gesamt.__setitem__('b', gesamt['b'] + e.get('encodedDataLength', 0)))
                t0 = time.time()
                q.goto(B + '/', wait_until='commit', timeout=120000)
                fehl = False
                try:
                    q.wait_for_function("() => document.querySelector('input[type=password]') || document.getElementById('bootfail')", timeout=120000, polling=50)
                    fehl = q.locator('#bootfail').count() > 0
                except Exception:
                    fehl = True
                dt = time.time() - t0
                q.wait_for_timeout(300)
                erg.append({'netz': netz, 'sprache': lang, 'sek': round(dt, 1), 'kb': round(gesamt['b'] / 1024), 'startfehler': fehl})
                print(f"{netz:7} {lang}  {dt:5.1f} s  {gesamt['b'] / 1024:7.0f} KB übertragen{'  ✘ Startfehler/Zeitüberschreitung' if fehl else ''}", flush=True)
                c.close()
    br.close()
print(json.dumps(erg, ensure_ascii=False))
