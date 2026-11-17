# [CLAUDE] UI-Test (17.11.2026, Backlog 1549, Blickwinkel „Ausländischer Fahrer meldet verrutschte Ladung oder gerissene Spanngurte“):
# Meldeformular zeigt bei „yük kaydı“, „ładunek się przesunął“, „marfa s-a răsturnat“, „la carga se ha movido“, „a carga tombou“, „il carico si è ribaltato“,
# „le chargement a bougé“, „de lading is omgevallen“ den Ladungs-Hinweis (kein Unfall), bei „spanzet koptu“, „pasy są zerwane“, „las cinchas están rotas“, „les sangles sont cassées“,
# „de spanbanden zijn kapot“ u. a. den Hinweis Ladungssicherungsmittel; Verneinung („la carga no se ha movido“), Nachsichern („de lading is opnieuw vastgezet“) und fremde Bedeutungen
# („la carga de la batería“, „la cinghia del motore“, „pas bezpieczeństwa“) ohne. DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[["yük kaydı", "load"], ["paletler devrildi", "load"], ["spanzet koptu", "lashgear"], ["ładunek się przesunął", "load"], ["pasy są zerwane", "lashgear"], ["marfa s-a răsturnat", "load"],
       ["chingile sunt rupte", "lashgear"], ["la carga se ha movido", "load"], ["las cinchas están rotas", "lashgear"], ["a carga tombou", "load"], ["as cintas estão partidas", "lashgear"],
       ["il carico si è ribaltato", "load"], ["mancano le cinghie", "lashgear"], ["le chargement s'est renversé", "load"], ["il manque deux sangles", "lashgear"], ["de lading is omgevallen", "load"],
       ["de spanbanden zijn kapot", "lashgear"], ["le pneu est crevé et le chargement a bougé", "flat,load"],
       ["teret se pomaknuo", "load"], ["elszakadt a heveder", "lashgear"], ["náklad se posunul", "load"], ["popruh praskl", "lashgear"]]
NO=["la carga no se ha movido", "de lading is niet verschoven", "yük kaymadı", "ładunek się nie przesunął", "il carico non si è spostato", "le chargement n'a pas bougé",
    "de lading is opnieuw vastgezet", "les sangles ne sont pas cassées", "pas bezpieczeństwa jest zerwany", "kayış koptu", "teret se nije pomaknuo", "a rakomány nem csúszott el", "náklad se neposunul"]
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ldg.inhaber','display_name':'LDG Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='ldg.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM75' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nLD-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
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
            if SHOTS and txt in ('il carico si è ribaltato','de spanbanden zijn kapot'): q.locator('#'+want.split(',')[-1]).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/ldg-{CASES.index([txt,want])}-{lang}-{w}.png')
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
