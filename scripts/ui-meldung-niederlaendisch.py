# [CLAUDE] UI-Test (17.11.2026, Backlog 1548, Blickwinkel „Fahrer aus den Niederlanden/Belgien schreibt Niederländisch/Flämisch“):
# Meldeformular zeigt bei „de remmen werken niet“, „de band is lek“, „de motor start niet“, „de cabine staat in brand“, „hij verliest olie“,
# „ik heb een ongeluk gehad“, „de frigo koelt niet“, „ze hebben de diesel gestolen“ u. a. den passenden Hinweis; Reparaturvermerk („al gerepareerd“, „alles in orde“),
# Verneinung („hij verliest geen olie“, „er was geen ongeluk“, „geen lekkage“) und Alltagssätze ohne Hinweis. DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[["de remmen werken niet", "brake"], ["zonder remmen", "brake"], ["de handrem gaat niet los", "parkbrake"], ["de band is lek", "flat"], ["ik heb een lekke band", "flat"],
       ["de band is kaal", "tyre"], ["het stuur is zwaar", "steer"], ["hij verliest olie", "leak"], ["de cabine staat in brand", "fire"], ["ik heb een ongeluk gehad", "acc"], ["ik heb me pijn gedaan", "injury"],
       ["de motor start niet", "nostart"], ["de motor wordt te warm", "engine"], ["zwarte rook uit de uitlaat", "engine"], ["de spiegel is kapot", "mirror"], ["de voorruit is gebarsten", "glass"],
       ["de lichten werken niet", "lights"], ["het motorlampje brandt", "warnlight"], ["de accu is leeg", "batt"], ["de tachograaf geeft een foutmelding", "tacho"],
       ["de tankkaart is geblokkeerd", "fuelcard"], ["ik ben de sleutels kwijt", "lost"], ["de oplegger is losgeraakt", "coupling"], ["ik sta zonder diesel", "dryfuel"], ["de frigo koelt niet", "reefer"],
       ["de airco werkt niet", "climate"], ["het zeil is gescheurd", "tarp"], ["de uitlaat is eraf gevallen", "exhaust"], ["de ruitenwisser werkt niet", "visib"], ["de gordel klikt niet vast", "seat"],
       ["de deur gaat niet dicht", "door"], ["de vrachtwagen zit vast in de modder", "stuck"], ["de kentekenplaat is eraf gevallen", "numplate"], ["de koppeling slipt", "gear"], ["de wielmoeren zitten los", "wheel"],
       ["de vering is ingezakt", "susp"], ["de radar geeft een foutmelding", "adas"], ["ze hebben de diesel gestolen", "theft"], ["iemand heeft de deur bekrast", "vandal"], ["het raam gaat niet omhoog", "window"]]
NO=["de rem is al gerepareerd", "de remmen werken weer", "de band is vervangen", "hij verliest geen olie", "geen lekkage", "er was geen ongeluk", "er is niets gestolen",
    "alles in orde", "ik rij terug naar het depot", "mijn zoon ligt in het ziekenhuis", "er staat veel file op de snelweg", "ik rij richting Antwerpen", "de chauffeur is ziek", "het is erg koud vandaag", "de linker spiegel is goed", "de veerboot vertrekt niet", "ik stuur je een foto", "geen brand"]
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'nld.inhaber','display_name':'NLD Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='nld.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM75' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nNL-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
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
            if SHOTS and txt in ('de remmen werken niet','de cabine staat in brand'): q.locator('#'+want.split(',')[-1]).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/nld-{CASES.index([txt,want])}-{lang}-{w}.png')
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
