# [CLAUDE] UI-Test (27.10.2026, Backlog 430, Blickwinkel „Wochenend-Bereitschaft Fr 18:00 – Mo 06:00“): eine Rufnummer mit zwei Zeitspannen
# (Fr, So 18:00–06:00 + Sa, So ganztags) – „Panne & Notfall“ und Pflegeliste zeigen beide Zeitspannen; das Formular übernimmt sie
# (Bereich „Weitere Zeitspanne“ aufgeklappt), eine zweite weitere Zeitspanne lässt sich ergänzen und wird gespeichert; unvollständige
# Zeitspanne (Uhrzeit ohne Wochentage) → verständliche Meldung, nichts gespeichert. Backlog 431: Bundesland für landesweite Feiertage wählen. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Braucht den Dev-Server (scripts/dev-server.mjs). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TXT={'de':('Fr, So 18:00–06:00','Sa, So ganztags','Weitere Zeitspanne','bitte die Wochentage'),
     'uk':('Пт, Нд 18:00–06:00','Сб, Нд цілодобово','Додатковий проміжок','оберіть дні тижня'),
     'en':('Fri, Sun 18:00–06:00','Sat, Sun all day','Further time span','choose the weekdays')}
STN={'de':'Nordrhein-Westfalen','uk':'Північний Рейн-Вестфалія','en':'North Rhine-Westphalia'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
noscroll='()=>document.documentElement.scrollWidth<=innerWidth+1'
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'nw.inhaber','display_name':'NW Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'nw.inhaber','password':PW})['s']!=200:
        ok=False
        for un in ['nb.inhaber','ab.inhaber','ws.inhaber','ft.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: ok=True; break
        check(ok,'Anmeldung Inhaber')
    R=os.getpid()%100000
    vin=f'WDB97{R:05d}N000100'
    check(api('POST','/api/vehicles',{'plate':f'NW-R {R%900}1','vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,'Fahrzeug angelegt')
    WE=[{'days':'67','from':None,'to':None}]
    r=api('POST','/api/emergency/contacts',{'kind':'werkstatt','label':f'WE-Bereitschaft {R}','phone':f'0231 {R} 7','scope':'vehicle','vehicle_id':'VIN:'+vin,'hours_days':'57','hours_from':'18:00','hours_to':'06:00','hours_more':WE})
    check(r['s']==201,f'Rufnummer mit zwei Zeitspannen angelegt {r["s"]} {r["d"]}'); cid=r['d']['id']
    for lang in ['de','uk','en']:
      a1,a2,mt,err_txt=TXT[lang]
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); m=ctx.new_page(); errs=[]; m.on('pageerror',lambda e: errs.append(str(e)))
        m.goto(B); m.context.add_cookies(a.context.cookies()); m.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        m.goto(B+'/#/emergency?v=VIN:'+vin); m.reload(); m.wait_for_selector('.emrow .emhours',timeout=15000)
        row=next((x for x in m.locator('.emrow').all_inner_texts() if f'WE-Bereitschaft {R}' in x),'')
        check(a1 in row and a2 in row,f'{lang} {w}px: Panne & Notfall zeigt beide Zeitspannen')
        check(m.evaluate(noscroll),f'{lang} {w}px: Panne & Notfall ohne Querscrollen')
        if SHOTS: m.screenshot(path=f'{SHOTS}/notfall_wochenende_{lang}_{w}.png')
        m.goto(B+'/#/emergency/edit'); m.wait_for_selector(f'[data-emedit="{cid}"]',timeout=15000)
        li=next((x for x in m.locator('.emman').all_inner_texts() if f'WE-Bereitschaft {R}' in x),'')
        check(a1 in li and a2 in li,f'{lang} {w}px: Pflegeliste zeigt beide Zeitspannen')
        m.click(f'[data-emedit="{cid}"]'); m.wait_for_selector('#emmore',timeout=5000)
        check(m.evaluate('()=>document.querySelector("#emmore").open') and mt in m.inner_text('#emmore summary'),f'{lang} {w}px: „{mt}“ aufgeklappt')
        w0='[data-emmore="0"]'; w1='[data-emmore="1"]'
        check(m.locator(f'{w0} [data-emmwd]:checked').count()==2 and m.is_checked(f'{w0} [data-emmwd="6"]') and m.input_value(f'{w0} [data-emmfrom]')=='',f'{lang} {w}px: Formular übernimmt weitere Zeitspanne')
        check(m.evaluate(noscroll),f'{lang} {w}px: Formular ohne Querscrollen')
        if SHOTS: m.locator('#emmore').scroll_into_view_if_needed(); m.screenshot(path=f'{SHOTS}/notfall_wochenende_formular_{lang}_{w}.png')
        # unvollständig: Uhrzeit ohne Wochentage → Meldung, nichts gespeichert
        m.fill(f'{w1} [data-emmfrom]','08:00'); m.fill(f'{w1} [data-emmto]','12:00'); m.click('#emf button.btn:not(.secondary)')
        m.wait_for_timeout(700)
        check(err_txt in m.inner_text('body'),f'{lang} {w}px: Meldung „Wochentage wählen“')
        cur=next(c for c in api('GET','/api/emergency/contacts')['d']['contacts'] if c['id']==cid)['hours']
        check(cur.get('more')==WE,f'{lang} {w}px: nichts gespeichert {cur}')
        # zweite weitere Zeitspanne Mo 00:00–06:00 ergänzen
        m.fill(f'{w1} [data-emmfrom]','00:00'); m.fill(f'{w1} [data-emmto]','06:00'); m.check(f'{w1} [data-emmwd="1"]')
        m.click('#emf button.btn:not(.secondary)'); m.wait_for_function('() => !document.querySelector("#emcancel")',timeout=15000)
        cur=next(c for c in api('GET','/api/emergency/contacts')['d']['contacts'] if c['id']==cid)['hours']
        check(cur.get('more')==WE+[{'days':'1','from':'00:00','to':'06:00'}] and cur['days']=='57',f'{lang} {w}px: zweite weitere Zeitspanne gespeichert {cur}')
        # Backlog 431: Bundesland für landesweite Feiertage (Auswahl erst mit „nicht an Feiertagen“)
        m.click(f'[data-emedit="{cid}"]'); m.wait_for_selector('#emstate',timeout=5000)
        check(m.is_disabled('#emstate'),f'{lang} {w}px: Bundesland ohne „nicht an Feiertagen“ gesperrt')
        m.check('#emnohol'); m.select_option('#emstate','NW'); m.click('#emf button.btn:not(.secondary)'); m.wait_for_function('() => !document.querySelector("#emcancel")',timeout=15000)
        cur=next(c for c in api('GET','/api/emergency/contacts')['d']['contacts'] if c['id']==cid)['hours']
        check(cur.get('holiday_state')=='NW' and cur['no_holidays'],f'{lang} {w}px: Bundesland gespeichert {cur}')
        li=next((x for x in m.locator('.emman').all_inner_texts() if f'WE-Bereitschaft {R}' in x),'')
        check(STN[lang] in li,f'{lang} {w}px: Pflegeliste nennt das Bundesland')
        if SHOTS: m.screenshot(path=f'{SHOTS}/notfall_bundesland_{lang}_{w}.png')
        api('PATCH',f'/api/emergency/contacts/{cid}',{'hours_more':WE,'hours_no_holidays':False})
        check(not errs,f'{lang} {w}px: ohne Skriptfehler {errs[:1]}')
        ctx.close()
    api('POST',f'/api/emergency/contacts/{cid}/archive')
    api('PATCH','/api/me',{'language':'de'})
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
