# [CLAUDE] UI-Test (16.11.2026, Backlog 1539, Blickwinkel „Fahrer verneint Unfall, Brand oder Diebstahl in seiner Sprache“):
# „nu a fost niciun accident, oglinda e spartă“, „nije bilo nesreće“, „nebyla to nehoda“, „нямаше катастрофа“, „nuk ka aksident“, „kaza olmadı“, „yangın yok“,
# „нямаше пожар“, „accident nahi hua“ zeigen keinen Unfall-/Brand-Hinweis mehr (FK_NEG in app-sprachen.js, COLLOQ im Start-Modul), der übrige Satz
# (Spiegel, Reifen) weiter seinen Hinweis; bejahte Sätze unverändert; Hinglish Diebstahl/Sitzheizung. DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[["nu a fost niciun accident, oglinda e sparta", "mirror"], ["fara accident, oglinda e sparta", "mirror"], ["nije bilo nesreće, samo je retrovizor razbijen", "mirror"], ["nebyla to nehoda, jen zrcátko je rozbité", "mirror"], ["žádná nehoda, zrcátko rozbité", "mirror"], ["нямаше катастрофа, само огледалото е счупено", "mirror"], ["nebija avārijas, tikai spogulis saplīsis", "mirror"], ["nebuvo avarijos, tik veidrodis sudužo", "mirror"], ["nuk ka aksident, vetëm pasqyra është thyer", "mirror"], ["ei olnud õnnetust, ainult peegel on katki", "mirror"], ["kaza olmadı, sadece ayna kırık", "mirror"], ["nie było wypadku ale opona pękła", "flat"], ["accident nahi hua, sirf mirror tut gaya", "mirror"], ["koi accident nahi hua bas tyre puncture hai", "flat"], ["am avut un accident", "acc"], ["kaza yaptım", "acc"], ["yangın çıktı", "fire"], ["imao sam nesreću", "acc"], ["měl jsem nehodu", "acc"], ["имах катастрофа", "acc"], ["accident ho gaya", "acc"], ["aag lag gayi", "fire"], ["diesel chori ho gaya", "theft"], ["gadi chori ho gayi", "theft"], ["seat heater kaam nahi kar raha", "cabkit"], ["seat garam nahi ho rahi", "cabkit"], ["mirror heater kaam nahi kar raha", "cabkit"], ["heater kaam nahi kar raha", "climate"]]
NO=["accident nahi hua", "koi accident nahi hua", "nem volt baleset", "yangın yok", "нямаше пожар", "hırsızlık yok", "nie było kradzieży", "nu a fost furat nimic", "nem lopták el semmit", "koi chori nahi hui", "aag nahi lagi", "kein Feuer, kein Rauch", "не было ДТП"]
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'vn.inhaber','display_name':'VN Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='vn.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM76' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nVN-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':user,'password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        for txt,want in CASES:
            q.fill('#d',txt); q.wait_for_timeout(100)
            shown=q.evaluate("[...document.querySelectorAll('.panel[role=status]')].filter(e=>!e.hidden&&e.id).map(e=>e.id)")
            check(shown==[want],f'{lang}/{w}: „{txt}“ → {want} (sichtbar: {shown})')
            if SHOTS and txt in ('nu a fost niciun accident, oglinda e sparta','diesel chori ho gaya'): q.locator('#'+want).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/vn-{CASES.index([txt,want])}-{lang}-{w}.png')
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
