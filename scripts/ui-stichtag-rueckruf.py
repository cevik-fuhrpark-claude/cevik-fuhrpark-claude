# [CLAUDE] UI-Test (23.10.2026, Teilagenten geteiltes Werkstatt-Konto / Rückrufaktion / Monatswechsel):
# (1) Kennzahlen zeigen den Stichtag-Hinweis („Stand …: Status zum Abrufzeitpunkt“), (2) Kostenbericht nennt „heute hinterlegter Stundensatz“,
# (3) Rückruf-Import am ruhenden Fahrzeug zeigt den Hinweis in der Vorschau. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Braucht den Dev-Server (scripts/dev-server.mjs). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
VIN='WDB96340310777762'; VID='VIN:'+VIN
KPI={'de':'zum Abrufzeitpunkt','uk':'на момент запиту','en':'as at retrieval'}
RATE={'de':'heute hinterlegten Stundensatz','uk':'сьогоднішньою погодинною ставкою','en':'hourly rate stored today'}
DOR={'de':'Fahrzeug ruhend','uk':'відкликання не з’являється','en':'Vehicle dormant'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'sr.inhaber','display_name':'SR Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'sr.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    api('POST','/api/vehicles',{'plate':'SR-UI 1','vin':VIN,'site':'Dortmund'})
    api('PUT','/api/settings',{'workshop_hourly_rate_net':90})
    check(api('POST',f'/api/vehicles/{VID}/evaluation',{'excluded':True,'reason':'UI-Test ruhend'})['s']==200,'Fahrzeug ruhend')
    pre=api('POST','/api/maintenance/recalls/import?dry_run=1',f'FIN;Referenz\n{VIN};ÄB-UI-1','text/csv')
    check(pre['s']==200 and pre['d']['rows'][0].get('dormant') is True,f"Vorschau meldet ruhend ({pre['s']})")
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'sr.inhaber','password':PW},None])
        q.goto(B+'/#/kpi'); q.wait_for_selector('#kf2',timeout=15000); q.wait_for_timeout(300)
        t=q.inner_text('#app'); check(KPI[lang] in t,f'{lang}/{w}: Kennzahlen mit Stichtag-Hinweis')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Kennzahlen ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/sr_kpi_{lang}_{w}.png')
        q.goto(B+'/#/costs'); q.wait_for_timeout(1200)
        t=q.inner_text('#app'); check(RATE[lang] in t,f'{lang}/{w}: Kostenbericht nennt Stundensatz von heute')
        if SHOTS: q.screenshot(path=f'{SHOTS}/sr_kosten_{lang}_{w}.png', full_page=True)
        # Rückruf-Import-Vorschau: Hinweis übersetzt
        from_ui=q.evaluate("""async (vin) => { const { translateImportReason } = await import('/i18n.js'); const r = await fetch('/api/maintenance/recalls/import?dry_run=1', { method: 'POST', headers: { 'content-type': 'text/csv', 'x-cfp': '1' }, body: 'FIN;Referenz\\n' + vin + ';ÄB-UI-1' }); const d = await r.json(); return translateImportReason(document.documentElement.lang || 'de', d.rows[0].note); }""",VIN)
        check(DOR[lang] in (from_ui or ''),f'{lang}/{w}: Rückruf-Hinweis übersetzt ({(from_ui or "")[:50]})')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+'; '.join(fails) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
