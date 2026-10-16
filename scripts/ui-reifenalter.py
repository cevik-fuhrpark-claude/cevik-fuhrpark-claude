# [CLAUDE] UI-Test: Reifen-Altersgrenze aus Einstellungen in der richtigen Zahlform – bei 1 Jahr „Älter als 1 Jahr“ / „Старше 1 року“ /
# „Older than 1 year“ (vorher „1 Jahre“/„1 years“), Fahrzeugakte „älter als 1 Jahr“; Benutzerfilter neutral „Konten angezeigt: 1 von 2“;
# „0 Positionen gemessen“/„виміряно 0 позицій“ (vorher „0 Позиції“); Werkstattauslastung „4 тижні“ (vorher „4 тижнів“).
# DE/UK/EN bei 390/820/1366 px ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TAB={'de':'Älter als 1 Jahr','uk':'Старше 1 року','en':'Older than 1 year'}
AKTE={'de':'älter als 1 Jahr','uk':'старше 1 року','en':'older than 1 year'}
BAD={'de':['1 Jahre'],'uk':['1 років'],'en':['1 years']}
POS={'de':'0 Positionen gemessen','uk':'виміряно 0 позицій','en':'0 positions measured'}
WK={'de':['4 Wochen','13 Wochen'],'uk':['4 тижні','13 тижнів'],'en':['4 weeks','13 weeks']}
UF={'de':'Konten angezeigt: 1 von 2','uk':'Показано акаунтів: 1 з 2','en':'Accounts shown: 1 of 2'}
VIN='WDB96340310555123'; VID='VIN:'+VIN
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ra.inhaber','display_name':'RA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ra.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    check(api('PUT','/api/settings',{'tire_warn_age_years':1})['s']==200,'Einstellung Reifenalter 1 Jahr')
    api('POST','/api/vehicles',{'vin':VIN,'plate':'RA-AL 1','site':'Dortmund'})
    r=api('POST',f'/api/vehicles/{VID}/tires/events',{'event_type':'wechsel','position':'HA-L-aussen','size':'315/70 R22.5','dot':'0118'})
    check(r['s']==201,f'Reifen mit DOT 0118 erfasst {r["s"]}')
    # Konto mit Einladung (Status „eingeladen“) für den Benutzerfilter: 1 von 2
    api('POST','/api/users',{'username':'ra.fahrer','display_name':'RA Fahrer','role':'driver','environment':'test'})
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h}); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'ra.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/tires'); q.reload(); q.wait_for_selector(f'text={TAB[lang]}'); q.click(f'text={TAB[lang]}'); q.wait_for_selector('text=RA-AL 1'); q.wait_for_timeout(400)
        txt=q.inner_text('main') if q.locator('main').count() else q.inner_text('body')
        check(TAB[lang] in txt,f'{lang} {w}px Reifenübersicht: „{TAB[lang]}“')
        check(not any(b in txt for b in BAD[lang]),f'{lang} {w}px Reifenübersicht: keine falsche Zahlform')
        check(POS[lang] in txt,f'{lang} {w}px Reifenübersicht: „{POS[lang]}“')
        check(q.evaluate("()=>document.documentElement.scrollWidth<=window.innerWidth+1"),f'{lang} {w}px Reifen: kein Querscrollen')
        if SHOTS and w!=820: q.screenshot(path=f'{SHOTS}/reifenalter_{lang}_{w}.png')
        q.goto(B+f'/#/vehicles/{VID}'); q.wait_for_selector('#tires >> text=DOT'); q.wait_for_timeout(400)
        txt=q.inner_text('main') if q.locator('main').count() else q.inner_text('body')
        check(AKTE[lang] in txt,f'{lang} {w}px Reifenakte: „{AKTE[lang]}“')
        check(not any(b in txt for b in BAD[lang]),f'{lang} {w}px Reifenakte: keine falsche Zahlform')
        q.goto(B+'/#/users'); q.wait_for_selector('#ufilt'); q.select_option('#ufilt','invite'); q.wait_for_selector('#ufcount')
        check(q.inner_text('#ufcount').strip()==UF[lang],f'{lang} {w}px Benutzerfilter: „{q.inner_text("#ufcount").strip()}“')
        check(q.evaluate("()=>document.documentElement.scrollWidth<=window.innerWidth+1"),f'{lang} {w}px Benutzer: kein Querscrollen')
        q.select_option('#ufilt','all')
        q.goto(B+'/#/wsload'); q.wait_for_selector('[data-wl]'); q.wait_for_timeout(300)
        btn=[x.strip() for x in q.locator('[data-wl]').all_inner_texts()]
        check(all(x in btn for x in WK[lang]),f'{lang} {w}px Werkstattauslastung: {btn}')
        check(q.evaluate("()=>document.documentElement.scrollWidth<=window.innerWidth+1"),f'{lang} {w}px Auslastung: kein Querscrollen')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        c.close()
    br.close()
print('Reifenalter/Zahlformen: alles grün' if not fails else f'{len(fails)} Fehler'); raise SystemExit(1 if fails else 0)
