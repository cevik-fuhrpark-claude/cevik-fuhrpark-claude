# [CLAUDE] UI-Test (06.11.2026, Backlog 1076, Blickwinkel „Disposition bucht einen Lkw ein, der morgen zur HU muss“): „Prüfung/Wartung fällig bis …“
# nennt je Frist den Planungsstand – Prüftermin mit „morgen“, Termin nach dem Fristende (Warnung), „kein Prüftermin geplant“;
# Backlog 1078: Fahrzeugliste nennt beim Lkw den Prüftermin des gekoppelten Anhängers morgen.
# DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os
from datetime import date, timedelta
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TM={'de':'(morgen)','uk':'(завтра)','en':'(tomorrow)'}
LATE={'de':'nach dem Fristende','uk':'пізніша за кінцевий термін','en':'after the deadline'}
NOPLAN={'de':'kein Prüftermin geplant','uk':'дату перевірки не заплановано','en':'no inspection date planned'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ps.inhaber','display_name':'PS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ps.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    for lang in ['de','uk','en']:
        u=api('POST','/api/users',{'username':'ps.dispo.'+lang,'display_name':'PS DISPO '+lang,'role':'dispatch','environment':'production','language':lang})
        c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    today=a.evaluate("() => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date())")
    d1=(date.fromisoformat(today)+timedelta(days=1)).isoformat(); d6=(date.fromisoformat(today)+timedelta(days=6)).isoformat()
    ids={}
    for pl,vin,kind,due in [('PS-HU 1','WDB96340310761001','Tachograph',d1),('PS-NP 2','WDB96340310761002','UVV',today),('PS-LT 3','WDB96340310761003','Bremsen',d1)]:
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s'] in (200,201),'Lkw '+pl)
        r=api('POST',f'/api/vehicles/VIN:{vin}/maintenance',{'kind':kind,'next_due_date':due,'evidence':'Nachweis (UI-Test)'}); check(r['s']==201,f'Frist {pl} ({r["s"]})'); ids[pl]=r['d']['id']
    check(api('POST',f'/api/maintenance/{ids["PS-HU 1"]}/plan',{'planned_date':d1})['s']==200,'Termin morgen')
    check(api('POST',f'/api/maintenance/{ids["PS-LT 3"]}/plan',{'planned_date':d6})['s']==200,'Termin nach dem Fristende')
    check(api('POST','/api/vehicles',{'plate':'PS-ZM 4','vin':'WDB96340310761004','kind':'lkw','site':'Dortmund','trailer_plate':'PS-AH 4'})['s'] in (200,201),'Gespann Lkw')
    check(api('POST','/api/vehicles',{'plate':'PS-AH 4','vin':'WSM00000000761004','kind':'anhaenger','site':'Dortmund'})['s'] in (200,201),'Gespann Anhänger')
    r=api('POST','/api/vehicles/VIN:WSM00000000761004/maintenance',{'kind':'UVV','next_due_date':(date.fromisoformat(today)+timedelta(days=20)).isoformat(),'evidence':'UVV-Nachweis'}); check(r['s']==201,'UVV Anhänger')
    check(api('POST',f'/api/maintenance/{r["d"]["id"]}/plan',{'planned_date':d1})['s']==200,'Anhänger Prüftermin morgen')
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ps.dispo.'+lang,'password':PW}])
        q.goto(B+'/#/'); q.wait_for_selector('#dduesoon', state='attached', timeout=15000)
        row=lambda pl: ' '.join(t for t in q.locator('[data-dduesoon]').all_inner_texts() if pl in t)
        check(q.locator('[data-dplan]').count()==1 and TM[lang] in row('PS-HU 1'),f'{lang} {w}px: Termin morgen ({row("PS-HU 1")})')
        check(NOPLAN[lang] in row('PS-NP 2'),f'{lang} {w}px: kein Termin ({row("PS-NP 2")})')
        check(LATE[lang] in row('PS-LT 3') and q.locator('[data-dplate]').count()==1,f'{lang} {w}px: Termin nach Fristende ({row("PS-LT 3")})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen')
        if SHOTS: q.locator('#dduesoon').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/ps_{lang}_{w}.png')
        q.goto(B+'/#/vehicles'); q.wait_for_selector('#vl', state='attached', timeout=15000)
        cp=q.locator('#vl .row', has_text='PS-ZM 4').locator('[data-cpinsp]')
        check(cp.count()==1 and 'PS-AH 4' in cp.inner_text() and TM[lang] in cp.inner_text(),f'{lang} {w}px: Lkw-Zeile nennt Anhänger-Prüftermin morgen ({cp.inner_text() if cp.count() else "-"})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Liste ohne Querscrollen')
        if SHOTS: cp.first.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/ps_vl_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
