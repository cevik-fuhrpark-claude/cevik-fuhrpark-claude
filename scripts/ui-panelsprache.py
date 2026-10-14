# [CLAUDE] UI-Test: Management-Panel und Fahrzeugakte („Offene Agentenbefunde“) zeigen Meldungstexte der Agentenbefunde in der App-Sprache DE/UK/EN (Vorlagen
# public/finding-messages.js), bei 390/820/1366 px ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh).
# Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
# UVV zuletzt 10.01.2025, Intervall 12 Monate → überfällig (Prüfart-Wert „UVV“ bleibt wörtlich)
EXP={'de':['PS-ANL 1: UVV seit','Tag(en) überfällig (fällig 2026-01-10)'],
     'uk':['PS-ANL 1: UVV прострочено на','дн. (строк 2026-01-10)'],
     'en':['PS-ANL 1: UVV overdue for','day(s) (due 2026-01-10)']}
UNCL={'de':'PS-ANL 1: HU-Frist ungeklärt – ','uk':'PS-ANL 1: строк HU не з’ясовано – ','en':'PS-ANL 1: HU deadline unclear – '}
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
    api('POST','/api/vehicles',{'vin':'WDB96340310888001','plate':'PS-ANL 1','site':'Dortmund'})
    r=api('POST','/api/vehicles/VIN:WDB96340310888001/maintenance',{'kind':'UVV','last_done_date':'2025-01-10','interval_months':12,'evidence':'UI-Test Panel'})
    check(r['s'] in (200,201),'Prüftermin angelegt '+str(r['s']))
    # HU belegt, aber ohne zulässige Gesamtmasse → HU-Frist ungeklärt (Hinweis „Fahrzeugklasse fehlt“)
    r=api('POST','/api/vehicles/VIN:WDB96340310888001/maintenance',{'kind':'HU','last_done_date':'2026-03-15','interval_months':12,'evidence':'UI-Test HU-Bericht'})
    check(r['s'] in (200,201),'HU angelegt '+str(r['s']))
    # Zweites Fahrzeug mit kritischem, noch nicht bewertetem Vorgang → kritischer Agentenbefund („Heute zu tun“ der Leitung)
    api('POST','/api/vehicles',{'vin':'WDB96340310888002','plate':'PS-ANL 2','site':'Dortmund'})
    r=api('POST','/api/cases',{'vehicle_id':'VIN:WDB96340310888002','description':'UI-Test: Bremsleitung undicht','priority':'kritisch','driveability':'nicht_fahrbereit','request_key':'ps-krit-1'})
    check(r['s'] in (200,201),'kritischer Vorgang angelegt '+str(r['s']))
    check(api('POST','/api/agent/run')['s']==200,'Agent gelaufen')
    v2=[v for v in api('GET','/api/vehicles')['d']['vehicles'] if v['plate']=='PS-ANL 2'][0]
    check(v2['agent_findings_critical']>=1,f"PS-ANL 2 hat kritische Agentenbefunde ({v2['agent_findings_critical']})")
    vid=api('GET','/api/vehicles/VIN:WDB96340310888001')['d']['vehicle']['id']
    for lang in ['uk','en','de']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'ps.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/master'); q.wait_for_function("()=>document.body.innerText.includes('PS-ANL 1')")
        txt=q.inner_text('body')
        for e in EXP[lang]: check(e in txt,f'{lang} {w}px: {e}')
        if lang!='de': check('überfällig (fällig' not in txt,f'{lang} {w}px: kein deutscher Meldungstext')
        # HU/SP „Frist ungeklärt“: Hinweistext aus der Fahrzeugakten-Übersetzung (hn_<code>), nicht der deutsche Servertext
        check(UNCL[lang] in txt,f'{lang} {w}px: {UNCL[lang]}')
        if lang!='de': check('ungeklärt –' not in txt and 'Gesamtmasse' not in txt,f'{lang} {w}px: HU/SP-Hinweis übersetzt')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        if SHOTS:
            q.get_by_text('PS-ANL 1').first.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/panel_{lang}_{w}.png')
        # CSV der Agentenbefunde in der App-Sprache (Browser erzeugt die Datei)
        if w==1366:
            with q.expect_download() as dl: q.click('#afcsv')
            csv=open(dl.value.path(),encoding='utf-8-sig').read()
            check(EXP[lang][0] in csv and UNCL[lang] in csv,f'CSV {lang}: Meldungen in der App-Sprache')
            check(dl.value.suggested_filename.startswith('fuhrpark-agentenbefunde_production_'),'CSV-Dateiname '+dl.value.suggested_filename)
        # Fahrzeugakte: dieselben Befunde des Fahrzeugs im aufklappbaren Abschnitt „Offene Agentenbefunde“
        # Befund ohne Vorgang, aber mit Fahrzeug: Link zur Fahrzeugakte
        check(q.locator(f'a[data-afv][href="#/vehicles/{vid}"]').count()>=1,f'{lang} {w}px: Link Befund → Fahrzeugakte')
        q.goto(B+'/#/vehicles/'+vid); q.wait_for_selector('#vaf summary')
        # Druck/PDF: zugeklappte „Offene Agentenbefunde“ werden mitgedruckt und danach wieder zugeklappt
        if w==390:
            check(not q.eval_on_selector('#vaf','e=>e.open'),f'Akte {lang}: ohne kritische Befunde zugeklappt')
            q.evaluate("()=>window.dispatchEvent(new Event('beforeprint'))"); q.emulate_media(media='print')
            check(q.is_visible('#vaf') and q.eval_on_selector('#vaf','e=>e.open') and EXP[lang][0] in q.inner_text('#vaf'),f'Akte {lang}: Agentenbefunde im Ausdruck')
            q.emulate_media(media='screen'); q.evaluate("()=>window.dispatchEvent(new Event('afterprint'))")
            check(not q.eval_on_selector('#vaf','e=>e.open'),f'Akte {lang}: nach dem Druck wieder zugeklappt')
        q.click('#vaf summary'); vt=q.inner_text('#vaf')
        for e in EXP[lang]+[UNCL[lang]]: check(e in vt,f'Akte {lang} {w}px: {e}')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'Akte {lang} {w}px: kein Querscrollen')
        check(not errs,f'Akte {lang} {w}px: keine Skriptfehler {errs}')
        if SHOTS: q.locator('#vaf').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/akte_{lang}_{w}.png')
        # Akte → Management-Panel: Suche ist auf das Kennzeichen eingegrenzt
        q.click('#vafm'); q.wait_for_selector('#afq')
        check(q.input_value('#afq')=='PS-ANL 1',f'Akte → Panel {lang} {w}px: Suche auf Kennzeichen')
        q.fill('#afq','')
        # Startseite „Heute zu tun“: Gruppe „Fahrzeuge mit kritischen Agentenbefunden“ → gefilterte, nach Befunden sortierte Fahrzeugliste
        TODO={'de':'Fahrzeuge mit kritischen Agentenbefunden','uk':'Транспорт із критичними висновками агента','en':'Vehicles with critical agent findings'}
        q.goto(B+'/#/'); q.wait_for_selector('#todovfind')
        grp=q.locator('details.panel',has=q.locator('#todovfind')); gt=grp.inner_text()
        check(TODO[lang] in gt and 'PS-ANL 2' in gt and 'PS-ANL 1' not in gt,f'Start {lang} {w}px: Gruppe kritische Agentenbefunde nur mit PS-ANL 2')
        check(grp.evaluate('e=>e.open'),f'Start {lang} {w}px: Gruppe aufgeklappt (kritisch)')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'Start {lang} {w}px: kein Querscrollen')
        if SHOTS: grp.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/start_{lang}_{w}.png')
        q.click('#todovfind'); q.wait_for_selector('[data-av="with_findings"]:not(.secondary)')
        check(q.evaluate('()=>location.hash')=='#/vehicles',f'Start → Liste {lang} {w}px: Adresse ohne Parameter')
        check(q.eval_on_selector('#vsort','e=>e.value')=='findings' and 'PS-ANL 2' in q.inner_text('#vl a.row >> nth=0'),f'Start → Liste {lang} {w}px: kritische zuerst')
        check(not errs,f'Start {lang} {w}px: keine Skriptfehler {errs}')
        q.select_option('#vsort','plate'); q.click('[data-av="all"]')
        # Fahrzeugliste: Chip „N× Agentenbefund offen“ und Filter „Mit Agentenbefunden“ (nur Leitung)
        VF={'de':['Agentenbefund offen','Mit Agentenbefunden'],'uk':['Відкриті висновки агента','З висновками агента'],'en':['agent finding open','With agent findings']}
        q.goto(B+'/#/vehicles'); q.wait_for_selector('[data-af]')
        check(VF[lang][0] in q.inner_text('[data-af]'),f'Liste {lang} {w}px: Chip {VF[lang][0]}')
        q.click('[data-av="with_findings"]'); q.wait_for_selector('[data-av="with_findings"]:not(.secondary)')
        rows=q.locator('#vl a.row').count(); check(rows>=1 and rows==q.locator('#vl [data-af]').count(),f'Liste {lang} {w}px: Filter zeigt nur Fahrzeuge mit Befunden ({rows})')
        check(VF[lang][1] in q.inner_text('body'),f'Liste {lang} {w}px: Filterknopf {VF[lang][1]}')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'Liste {lang} {w}px: kein Querscrollen')
        check(not errs,f'Liste {lang} {w}px: keine Skriptfehler {errs}')
        if SHOTS: q.screenshot(path=f'{SHOTS}/liste_{lang}_{w}.png')
        q.click('[data-av="all"]')
        q.select_option('#vsort','findings'); q.wait_for_selector('#vsort')
        check(q.eval_on_selector('#vsort','e=>e.value')=='findings' and q.locator('#vl [data-af]').count()>=1,f'Liste {lang} {w}px: Sortierung Agentenbefunde')
        q.select_option('#vsort','plate')
        c.close()
    br.close()
print('Panel-Sprache: alles grün' if not fails else f'FEHLER: {len(fails)}')
raise SystemExit(1 if fails else 0)
