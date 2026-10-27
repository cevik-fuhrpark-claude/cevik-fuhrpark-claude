# [CLAUDE] UI-Test (27.10.2026, Backlog 427, Blickwinkel „Fahrer ruft nachts an: Lkw springt nicht an – wer hat Bereitschaft?“):
# Rufnummern mit eingetragener Erreichbarkeit → „Panne & Notfall“ zeigt „jetzt erreichbar“/„jetzt nicht besetzt“, sortiert gerade nicht
# besetzte Nummern nach unten und warnt, wenn alle Nummern eines Abschnitts laut Eintrag nicht besetzt sind. Pflegeformular: Wochentage,
# von/bis, „nicht an Feiertagen“. Zeitunabhängig: „erreichbar“ = alle Wochentage ganztags, „nicht besetzt“ = nur ein Wochentag, der
# weder heute noch gestern ist (deutsche Zeit). Backlog 428: aufklappbare „Angaben für den Pannendienst“ (FIN, Reifengröße). DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Braucht den Dev-Server (scripts/dev-server.mjs). Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
OPEN={'de':'jetzt erreichbar','uk':'зараз доступний','en':'reachable now'}
CLOSED={'de':'jetzt nicht besetzt','uk':'зараз не обслуговується','en':'not staffed now'}
LEG={'de':'Erreichbar','uk':'Доступний','en':'Reachable'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
noscroll='()=>document.documentElement.scrollWidth<=innerWidth+1'
today=datetime.datetime.now(ZoneInfo('Europe/Berlin')).isoweekday(); yest=7 if today==1 else today-1
other=next(str(d) for d in range(1,8) if d not in (today,yest))
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'nb.inhaber','display_name':'NB Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'nb.inhaber','password':PW})['s']!=200:
        ok=False
        for un in ['ab.inhaber','ws.inhaber','ft.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: ok=True; break
        check(ok,'Anmeldung Inhaber')
    R=os.getpid()%100000
    vins=[]; ids=[]
    for i in range(2):
        vin=f'WDB98{R:05d}N{i:04d}00'; vins.append(vin)
        check(api('POST','/api/vehicles',{'plate':f'NB-R {R%900}{i}','vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,'Fahrzeug angelegt')
    check(api('POST',f'/api/vehicles/VIN:{vins[0]}/tires/specs',{'axle':'antriebsachse','size':'315/80 R22.5'})['s']==200,'Reifengröße eingetragen')
    BD={'de':'Angaben für den Pannendienst','uk':'Дані для аварійної служби','en':'Details for the breakdown service'}
    def add(b):
        r=api('POST','/api/emergency/contacts',b); check(r['s']==201,f'Rufnummer angelegt {r["s"]} {r["d"]}'); ids.append(r['d']['id']); return r['d']['id']
    # Fahrzeug 1: Büro (nicht besetzt) zuerst angelegt, Bereitschaft (erreichbar) danach → Anzeige: Bereitschaft oben
    office=add({'kind':'dispo','label':f'Büro {R}','phone':f'0231 {R} 1','scope':'vehicle','vehicle_id':'VIN:'+vins[0],'hours_days':other,'hours_from':'06:00','hours_to':'18:00','hours_no_holidays':True})
    oncall=add({'kind':'werkstatt','label':f'Bereitschaft {R}','phone':f'0231 {R} 2','scope':'vehicle','vehicle_id':'VIN:'+vins[0],'hours_days':'1234567'})
    add({'kind':'dispo','label':f'Nur Büro {R}','phone':f'0231 {R} 3','scope':'vehicle','vehicle_id':'VIN:'+vins[1],'hours_days':other})
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); m=ctx.new_page(); errs=[]; m.on('pageerror',lambda e: errs.append(str(e)))
        m.goto(B); m.context.add_cookies(a.context.cookies()); m.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        m.goto(B+'/#/emergency?v=VIN:'+vins[0]); m.reload(); m.wait_for_selector('[data-emopen]',timeout=15000)
        rows=m.locator('.emrow[data-emopen]')
        labels=[rows.nth(i).inner_text() for i in range(rows.count())]
        check(len(labels)==2 and f'Bereitschaft {R}' in labels[0] and f'Büro {R}' in labels[1],f'{lang} {w}px: erreichbare Nummer oben, nicht besetzte unten')
        check(OPEN[lang] in labels[0] and CLOSED[lang] in labels[1],f'{lang} {w}px: Chips „erreichbar/nicht besetzt“')
        check(LEG[lang] in labels[1] and '06:00–18:00' in labels[1],f'{lang} {w}px: Zeiten angezeigt')
        m.click('[data-embd] summary'); bd=m.inner_text('[data-embd]')
        check(BD[lang] in bd and vins[0] in bd and '315/80 R22.5' in bd,f'{lang} {w}px: Angaben für den Pannendienst (Backlog 428)')
        check(m.locator('[data-emallclosed]').count()==0,f'{lang} {w}px: kein Hinweis „alle nicht besetzt“, solange eine erreichbar ist')
        check(m.evaluate(noscroll),f'{lang} {w}px: Panne & Notfall ohne Querscrollen')
        if SHOTS: m.screenshot(path=f'{SHOTS}/notfall_bereitschaft_{lang}_{w}.png')
        m.goto(B+'/#/emergency?v=VIN:'+vins[1]); m.wait_for_selector('[data-emallclosed]',timeout=15000)
        check(m.locator('[data-emallclosed]').count()==1 and '112' in m.inner_text('[data-emallclosed]'),f'{lang} {w}px: Hinweis „gerade keine Nummer besetzt“ mit 112')
        # Pflegeformular: Bürozeiten ändern
        m.goto(B+'/#/emergency/edit'); m.wait_for_selector(f'[data-emedit="{office}"]',timeout=15000)
        m.click(f'[data-emedit="{office}"]'); m.wait_for_selector('#emhrs',timeout=5000)
        check(m.locator('[data-emwd]:checked').count()==1 and m.is_checked('#emnohol') and m.input_value('#emfrom')=='06:00',f'{lang} {w}px: Formular übernimmt Zeiten')
        check(m.evaluate(noscroll),f'{lang} {w}px: Pflegeformular ohne Querscrollen')
        if SHOTS: m.locator('#emhrs').scroll_into_view_if_needed(); m.screenshot(path=f'{SHOTS}/notfall_formular_{lang}_{w}.png')
        m.fill('#emfrom','07:30'); m.fill('#emto','16:00'); m.click('#emf button.btn:not(.secondary)')
        m.wait_for_function(f'() => !document.querySelector("#emcancel")',timeout=15000)
        hrs=next(c for c in api('GET','/api/emergency/contacts')['d']['contacts'] if c['id']==office)['hours']
        check(hrs=={'days':other,'from':'07:30','to':'16:00','no_holidays':True},f'{lang} {w}px: gespeichert {hrs}')
        api('PATCH',f'/api/emergency/contacts/{office}',{'hours_from':'06:00','hours_to':'18:00'})
        check(not errs,f'{lang} {w}px: ohne Skriptfehler {errs[:1]}')
        ctx.close()
    for i in ids: api('POST',f'/api/emergency/contacts/{i}/archive')
    api('PATCH','/api/me',{'language':'de'})
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
