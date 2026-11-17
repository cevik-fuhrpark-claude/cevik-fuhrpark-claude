# [CLAUDE] UI-Test (17.11.2026, Backlog 1557, Blickwinkel „Fahrer schreibt die Meldung auf Kurdisch (Kurmancî)“):
# Meldeformular zeigt bei „fren naxebite“, „lastîk teqiya“, „motor dest pê nake“, „kabîn dişewite“, „rûn diherike“, „min qeza kir“,
# „derî venabe“, „mazot hat dizîn“, „frîgo sar nake“ u. a. den passenden Hinweis; Reparaturvermerk („hat çêkirin“, „baş e“),
# Verneinung („qeza tune“, „rûn naherike“) und Rad/Ersatzrad ohne Hinweis. Stufe 2 (Backlog 1558): 19 weitere Hinweisarten, Keilriemen ohne Hinweis. DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[["fren naxebite", "brake"], ["frena kamyonê naxebite", "brake"], ["fren a dest nagire", "parkbrake"], ["lastîk teqiya", "flat"], ["bayê tekerê çû", "flat"],
       ["sukan giran e", "steer"], ["rûn diherike", "leak"], ["kabîn dişewite", "fire"], ["agir ket kamyonê", "fire"], ["min qeza kir", "acc"], ["ez birîndar bûm", "injury"],
       ["motor dest pê nake", "nostart"], ["motor naxebite", "engine"], ["egzoz dûman reş derdikeve", "engine"], ["neynik şikest", "mirror"], ["cama pêş şikest", "glass"],
       ["çira naxebite", "lights"], ["lamba sor vêket", "warnlight"], ["akû vala ye", "batt"], ["mazot hat dizîn", "theft"], ["derî venabe", "door"], ["klîma naxebite", "climate"],
       ["frîgo sar nake", "reefer"], ["kamyon xera bû", "breakdown"], ["mazot qediya", "dryfuel"], ["fren naxebite û rûn diherike", "brake,leak"],
       # Stufe 2 (Backlog 1558)
       ["lastîk hatiye birîn", "tyre"], ["takograf naxebite", "tacho"], ["karta şofêr nayê xwendin", "tacho"], ["dorse girê nabe", "coupling"], ["bijon sist bûne", "wheel"],
       ["vites nakeve", "gear"], ["egzoz qetiya", "exhaust"], ["pencere venabe", "window"], ["branda qetiya", "tarp"], ["balon teqiya", "susp"], ["kemera ewlehiyê nagire", "seat"],
       ["mifte winda bû", "lost"], ["plaka ket", "numplate"], ["silecek naxebite", "visib"], ["kamyon di heriyê de asê ma", "stuck"], ["karta mazotê naxebite", "fuelcard"],
       ["radar naxebite", "adas"], ["kesekî lastîk kun kir", "vandal"], ["bar şemitî", "load"], ["qayîşa barê qetiya", "lashgear"]]
NO=["fren hat çêkirin", "fren baş e", "lastîk hate guhertin", "motor careke din dixebite", "qeza tune", "agir tune", "rûn naherike", "neynik ne şikestiye",
    "ez birîndar nebûm", "teker xera bû", "tekera yedek teqiya",
    "qayîşa motorê qetiya", "mifte winda nebû", "qayîş ne qetiya", "bar şemitî min ji nû ve girê da", "takograf hat çêkirin"]
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'kur.inhaber','display_name':'KUR Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='kur.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM75' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nKU-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
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
            if SHOTS and txt in ('fren naxebite','kabîn dişewite','qayîşa barê qetiya'): q.locator('#'+want.split(',')[-1]).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/kur-{CASES.index([txt,want])}-{lang}-{w}.png')
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
