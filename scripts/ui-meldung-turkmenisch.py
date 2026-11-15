# [CLAUDE] UI-Test (15.11.2026, Backlog 1512, Blickwinkel „Fahrer schreibt die Meldung auf Turkmenisch“):
# Meldeformular zeigt bei turkmenischen Stichwörtern (lateinisch, ohne Sonderzeichen, ältere kyrillische Schrift, Mischform „работать этмейәр“; Tabelle TK_KINDS im
# still nachgeladenen Modul app-sprachen.js) dieselben Hinweise wie bei den anderen Sprachen und keine weiteren (genau der erwartete Hinweis sichtbar);
# Reparaturvermerk, verneintes Schadensverb, „… däl“, „awariýasyz“, Stau ohne; „glušitelden gara tüsse çykýar“ zeigt den Motor-Hinweis statt Brand;
# „maşyn ot almaýar“ springt nicht an (kein Brand); Kontrollleuchte „ýandy“ kein Brand. Zusätzliche Hinweise aus dem Start-Modul (russische Lehnwörter)
# stehen in der Erwartung. DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[["tormoz işlemeýär", "brake"], ["tormoz tutmaýar", "brake"], ["tormoz işlänok", "brake"], ["tormoz islemeyar", "brake"], ["howa basyşy düşdi", "brake"], ["тормоз ишлемейәр", "brake"], ["el tormozy tutmaýar", "parkbrake"], ["ruçnik işlemeýär", "parkbrake"], ["maşyn öz-özünden ýöräp gitdi", "parkbrake"], ["teker ýaryldy", "flat"], ["tekeriň ýeli çykdy", "flat"], ["öňki sag teker deşildi", "flat"], ["teker yaryldy", "flat"], ["shina deshildi", "flat"], ["teker könelipdir", "tyre"], ["şina çişdi", "tyre"], ["rul agyr boldy", "steer"], ["rul aýlanmaýar", "steer"], ["maşyn saga çekýär", "steer"], ["ýag akýar", "leak"], ["motordan ýag damýar", "leak"], ["antifriz akýar", "leak"], ["solýarka akýar", "leak"], ["kabina ýanýar", "fire"], ["kabinadan tüsse çykýar", "fire"], ["maşyn ot aldy", "fire"], ["awariýa boldum", "acc"], ["awariýa düşdük", "acc"], ["diwara urdum", "acc"], ["bir maşyn bilen çaknyşdyk", "acc"], ["ýaralandym", "injury"], ["tiz kömek gerek", "injury"], ["elim kesildi", "injury"], ["maşyn ot almaýar", "nostart"], ["motor otlanmaýar", "nostart"], ["starter işlemeýär", "nostart"], ["motor zawod bolmaýar", "nostart"], ["motor gyzdy", "engine"], ["motor çekmeýär", "engine"], ["motoryň güýji ýok", "engine"], ["motor geň ses çykarýar", "engine"], ["glušitelden gara tüsse çykýar", "engine"], ["awariýa režimine geçdi", "engine"], ["aýna döwüldi", "mirror"], ["sag aýna döwüldi", "mirror"], ["zerkalo çykyp gitdi", "mirror"], ["fara ýanmaýar", "lights"], ["stop çyra ýanmaýar", "lights"], ["gabarit işlemeýär", "lights"], ["motor çyrasy ýandy", "warnlight"], ["panelde ýalňyşlyk çykdy", "warnlight"], ["abs çyrasy ýanýar", "warnlight"], ["öň aýna çatlady", "glass"], ["aýna çatlady", "glass"], ["aýna daş degdi", "glass"], ["lobowoý döwüldi", "glass"], ["penjire aşak düşmeýär", "window"], ["penjire ýokary galmaýar", "window"], ["steklopodýomnik işlemeýär", "window"], ["akkumulýator oturdy", "batt"], ["akkumulýatoryň zarýady ýok", "batt"], ["tahograf kartany okamaýar", "tacho"], ["sürüjiniň kartasy ýitdi", "tacho"], ["ýangyç kartasy işlemeýär", "fuelcard"], ["açar ýitdi", "lost"], ["açary ýitirdim", "lost"], ["tehpasport ýitdi", "lost"], ["pritsep aýryldy", "coupling"], ["sedelka ýapylmaýar", "coupling"], ["solýarka gutardy", "dryfuel"], ["ýangyç gutardy", "dryfuel"], ["holodilnik sowatmaýar", "reefer"], ["agregat işlemeýär", "reefer"], ["poduška ýaryldy", "susp"], ["pritsep bir tarapa gyşardy", "susp"], ["peredaça girmeýär", "gear"], ["scepleniýe ýandy", "gear"], ["peç gyzdyrmaýar", "climate"], ["kondisioner işlemeýär", "climate"], ["podogrew işlemeýär", "cabkit"], ["tent ýyrtyldy", "tarp"], ["tent deşildi", "tarp"], ["glušitel düşdi", "exhaust"], ["dwornik arassalamaýar", "visib"], ["aýna buglandy", "visib"], ["howpsuzlyk kemeri dakylmaýar", "seat"], ["oturgyç döwüldi", "seat"], ["tekeriň gaýkasy gowşady", "wheel"], ["tekeriň gaýkasy ýok", "wheel"], ["podşipnik gyzdy", "wheel"], ["palçyga batdym", "stuck"], ["gara batyp galdyk", "stuck"], ["nomer düşdi", "numplate"], ["döwlet belgisi ýitdi", "numplate"], ["datçik ýalňyşlyk berýär", "adas"], ["kamera işlemeýär", "adas"], ["kabinanyň gapysy ýapylmaýar", "door"], ["gidrobort işlemeýär", "door"], ["gulp döwüldi", "door"], ["masyn ot almayar", "nostart"], ["yag akyar", "leak"], ["kabina yanyar", "fire"], ["awariya boldum", "acc"], ["acar yitdi", "lost"], ["motor cyrasy yandy", "warnlight"], ["holodilnik sowatmayar", "reefer"], ["кабина янýар", "fire"], ["ýag акýар", "leak"], ["тормоз работать этмейәр", "brake"], ["dur, teker ýaryldy we rul agyr boldy", "flat,steer"], ["tormoz işlemeýär. motor gyzdy", "brake,engine"]]
NO=["tormoz bejerildi", "teker çalşyldy", "ýene işleýär", "hemme zat gowy", "problema ýok", "ýag akmaýar", "aýna döwük däl", "teker ýarylmady", "awariýasyz geldim", "probkada durun", "ýüki düşürdim", "ertir sagat sekizde barýaryn", "ýag guýdum", "hiç hili problema ýok", "tekerlere howa doldurdym", "fara ýanýar", "motor işleýär", "teker gowy", "kabinada çilim tüssesi", "motor çyrasy öçdi", "ýolda men", "dispetçere jaň etdim", "solýarka guýdum", "Aşgabatda men", "açary tapdym", "bejerildi", "hemme zat gowy", "indi işleýär", "garaşyp galdym", "gümrükde garaşýarys", "maşynyň ýanynda durun"]
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'tk.inhaber','display_name':'TK Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='tk.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM76' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nTK-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':user,'password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        for txt,want in CASES:
            q.fill('#d',txt); q.wait_for_timeout(100)
            shown=q.evaluate("[...document.querySelectorAll('.panel[role=status]')].filter(e=>!e.hidden&&e.id).map(e=>e.id)")
            check(sorted(shown)==want.split(','),f'{lang}/{w}: „{txt}“ → {want} (sichtbar: {shown})')
            if SHOTS and txt in ('tormoz işlemeýär','holodilnik sowatmaýar','açary ýitirdim'): q.locator('#'+want.split(',')[0]).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/tk-{CASES.index([txt,want])}-{lang}-{w}.png')
        for txt in NO:
            q.fill('#d',txt); q.wait_for_timeout(100)
            shown=q.evaluate("[...document.querySelectorAll('.panel[role=status]')].filter(e=>!e.hidden&&e.id).map(e=>e.id)")
            check(not shown,f'{lang}/{w}: „{txt}“ ohne Hinweis {shown}')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        q.fill('#d','')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
