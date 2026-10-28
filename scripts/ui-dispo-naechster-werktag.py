# [CLAUDE] UI-Test (28.10.2026, Backlog 559/561, Blickwinkel „Disposition plant am Freitag den Montag“): Startseite der Disposition zeigt
# „Prüfung/Wartung fällig bis <nächster Werktag>“ mit Art und Wochentag (Anhänger mit Zugmaschine), der Terminplan markiert den nächsten
# Werktag, die Fahrzeugliste nennt die Art der nächsten Fälligkeit; Backlog 560: Ausdruck mit Druckkopf und Kennzeichen der Warnhinweise. DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler.
# Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os
from datetime import date, timedelta
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TITLE={'de':'Prüfung/Wartung fällig bis','uk':'Огляд/ТО до','en':'Inspection/maintenance due by'}
TACHO={'de':'Tachograph','uk':'Тахограф','en':'Tachograph'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'nw.inhaber','display_name':'NW Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'nw.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    for lang in ['de','uk','en']:
        u=api('POST','/api/users',{'username':'nw.dispo.'+lang,'display_name':'NW DISPO '+lang,'role':'dispatch','environment':'production','language':lang})
        c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    # heute (Berlin) und nächster Werktag laut App-Server: Fälligkeit heute + 1 Tag liegt immer im Zeitraum bis zum nächsten Werktag
    today=a.evaluate("() => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date())")
    d1=(date.fromisoformat(today)+timedelta(days=1)).isoformat()
    check(api('POST','/api/vehicles',{'plate':'NW-LK 559','vin':'WDB96340310559559','kind':'lkw','site':'Dortmund','trailer_plate':'NW-AH 559'})['s'] in (200,201),'Lkw')
    check(api('POST','/api/vehicles',{'plate':'NW-AH 559','vin':'WSM00000000559559','kind':'anhaenger','site':'Dortmund'})['s'] in (200,201),'Anhänger')
    r=api('POST','/api/vehicles/VIN:WDB96340310559559/maintenance',{'kind':'Tachograph','next_due_date':d1,'evidence':'Prüfbescheinigung'}); check(r['s']==201,f'Tachograph-Frist ({r["s"]} {r["d"]})')
    r=api('POST','/api/vehicles/VIN:WSM00000000559559/maintenance',{'kind':'UVV','next_due_date':today,'evidence':'UVV-Nachweis'}); check(r['s']==201,f'UVV-Frist Anhänger ({r["s"]})')
    dm1=(date.fromisoformat(today)-timedelta(days=1)).isoformat()
    check(api('POST','/api/vehicles',{'plate':'NW-UE 560','vin':'WDB96340310560560','kind':'lkw','site':'Dortmund'})['s'] in (200,201),'Lkw überfällig')
    r=api('POST','/api/vehicles/VIN:WDB96340310560560/maintenance',{'kind':'Tachograph','next_due_date':dm1,'evidence':'Prüfbescheinigung'}); check(r['s']==201,'überfällige Frist')
    # Backlog 564: zweite Frist im Zeitraum neben der überfälligen
    r=api('POST','/api/vehicles/VIN:WDB96340310560560/maintenance',{'kind':'Bremsen','next_due_date':d1,'evidence':'Bremsenprüfung'}); check(r['s']==201,'zweite Frist im Zeitraum')
    vs=api('GET','/api/vehicles')['d']['vehicles']; lk=[v for v in vs if v['plate']=='NW-LK 559'][0]
    check(lk.get('next_due_kind')=='Tachograph' and (lk.get('coupled') or {}).get('next_due_kind')=='UVV',f'API: Art ({lk.get("next_due_kind")}, gekoppelt {(lk.get("coupled") or {}).get("next_due_kind")})')
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'nw.dispo.'+lang,'password':PW}])
        q.goto(B+'/#/'); q.wait_for_selector('#dduesoon', state='attached', timeout=15000)
        hd=q.inner_text('#dduesoon'); rows=q.locator('[data-dduesoon]')
        check(TITLE[lang] in hd and rows.count()==3,f'{lang} {w}px: Gruppe mit 3 Fahrzeugen ({hd})')
        check('NW-UE 560' in ' '.join(rows.all_inner_texts()),f'{lang} {w}px: 564 Fahrzeug mit überfälliger und weiterer Frist')
        txt=' '.join(rows.all_inner_texts())
        check(TACHO[lang] in txt and 'NW-AH 559' in txt and q.locator('[data-dduecoupled]').count()==2,f'{lang} {w}px: Art und Gespann')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Startseite ohne Querscrollen')
        if SHOTS: q.locator('#dduesoon').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/nw_dispo_{lang}_{w}.png',full_page=True)
        check(q.locator('#dprint').is_visible() and not q.locator('[data-dprint=mover]').is_visible(),f'{lang} {w}px: Druckknopf, Drucklisten am Bildschirm verborgen')
        q.emulate_media(media='print')
        ph=q.locator('[data-dprinthead] .print-only'); pm=q.locator('[data-dprint=mover]')
        check(ph.is_visible() and pm.is_visible() and 'NW-UE 560' in pm.inner_text() and TACHO[lang] in pm.inner_text(),f'{lang} {w}px: Ausdruck mit Druckkopf und Kennzeichen ({pm.inner_text() if pm.count() else "-"})')
        check(q.locator('[data-dduesoon]').first.is_visible(),f'{lang} {w}px: Fristen-Gruppe im Ausdruck')
        if SHOTS and w==820: q.screenshot(path=f'{SHOTS}/nw_dispo_print_{lang}_{w}.png',full_page=True)
        q.emulate_media(media='screen')
        q.goto(B+'/#/vehicles'); q.wait_for_selector('#vl', state='attached', timeout=15000)
        vt=q.inner_text('#vl')
        check('('+TACHO[lang]+')' in vt,f'{lang} {w}px: Fahrzeugliste mit Art')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Liste ohne Querscrollen')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
