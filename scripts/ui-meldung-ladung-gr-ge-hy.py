# [CLAUDE] UI-Test (17.11.2026, Backlog 1562, Griechisch/Georgisch/Armenisch Stufe 2): Meldeformular zeigt bei verrutschter/gefallener Ladung
# („το φορτίο μετακινήθηκε“, „ტვირთი გადაადგილდა“, „բեռը տեղաշարժվել է“), gerissenem Ladungsgurt („ο ιμάντας του φορτίου κόπηκε“, „ტვირთის ღვედი გაწყდა“,
# „բեռի ամրակման գոտին կտրվել է“), Diebstahl („μου έκλεψαν το πετρέλαιο“, „საწვავი მოიპარეს“, „դիզելը գողացել են“) und Vandalismus („βανδαλισμός στο φορτηγό“,
# „ვიღაცამ დაკაწრა მანქანა“, „ինչ-որ մեկը քերծել է մեքենան“) den passenden Hinweis; Keilriemen, Sicherheitsgurt, umgekippter Lkw und Verneinung ohne.
# DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[["το φορτίο μετακινήθηκε", "load"], ["οι παλέτες έπεσαν", "load"], ["ο ιμάντας του φορτίου κόπηκε", "lashgear"], ["έσπασε η καστάνια", "lashgear"], ["μου έκλεψαν το πετρέλαιο", "theft"],
       ["βανδαλισμός στο φορτηγό", "vandal"], ["κάποιος γρατζούνισε το φορτηγό", "vandal"], ["κόπηκα στο χέρι", "injury"],
       ["ტვირთი გადაადგილდა", "load"], ["ტვირთის ღვედი გაწყდა", "lashgear"], ["საწვავი მოიპარეს", "theft"], ["ვიღაცამ დაკაწრა მანქანა", "vandal"],
       ["բեռը տեղաշարժվել է", "load"], ["բեռի ամրակման գոտին կտրվել է", "lashgear"], ["դիզելը գողացել են", "theft"], ["ինչ-որ մեկը քերծել է մեքենան", "vandal"]]
NO=["δεν μετακινήθηκε το φορτίο", "δεν έκλεψαν τίποτα", "ο ιμάντας του δυναμό κόπηκε", "η ζώνη ασφαλείας κόπηκε", "ძრავის ღვედი გაწყდა", "არაფერი მოუპარავთ", "ტვირთი არ დაცემულა",
    "բեռը չի տեղաշարժվել", "ոչինչ չեն գողացել", "գեներատորի գոտին կտրվել է", "բեռնատարը ընկել է"]
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'lgv.inhaber','display_name':'LGV Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='lgv.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM77' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nLG-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':user,'password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        for txt,want in CASES:
            q.fill('#d',txt); q.wait_for_timeout(100)
            shown=q.evaluate("[...document.querySelectorAll('.panel[role=status]')].filter(e=>!e.hidden&&e.id).map(e=>e.id)")
            check(','.join(sorted(shown))==want,f'{lang}/{w}: „{txt}“ → {want} (sichtbar: {shown})')
            if SHOTS and txt in ('το φορτίο μετακινήθηκε','ტვირთის ღვედი გაწყდა','դիզելը գողացել են'): q.locator('#'+want.split(',')[-1]).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/lgv-{CASES.index([txt,want])}-{lang}-{w}.png')
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
