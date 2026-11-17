# [CLAUDE] UI-Test (17.11.2026, Backlog 1547, Blickwinkel „Fahrer aus Frankreich/Belgien schreibt Französisch“):
# Meldeformular zeigt bei „les freins ne marchent pas“, „le pneu est crevé“, „le moteur ne démarre pas“, „la cabine brûle“, „il perd de l'huile“,
# „j'ai eu un accident“, „le frigo ne refroidit pas“, „on m'a volé le gasoil“ u. a. den passenden Hinweis; Reparaturvermerk („déjà réparé“, „tout va bien“),
# Verneinung („il ne perd pas d'huile“, „il n'y a pas eu d'accident“, „pas de fuite“) und Alltagssätze ohne Hinweis. DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[["les freins ne marchent pas", "brake"], ["sans freins", "brake"], ["le frein à main ne se desserre pas", "parkbrake"], ["le pneu est crevé", "flat"], ["un pneu a éclaté", "flat"],
       ["le pneu est lisse", "tyre"], ["la direction est dure", "steer"], ["il perd de l'huile", "leak"], ["la cabine brûle", "fire"], ["j'ai eu un accident", "acc"], ["je me suis fait mal", "injury"],
       ["le moteur ne démarre pas", "nostart"], ["le moteur chauffe", "engine"], ["fumée noire à l'échappement", "engine"], ["le rétro est cassé", "mirror"], ["le pare-brise est fissuré", "glass"],
       ["les feux ne marchent pas", "lights"], ["le voyant moteur s'est allumé", "warnlight"], ["la batterie est à plat", "batt"], ["le chronotachygraphe affiche une erreur", "tacho"],
       ["la carte carburant est bloquée", "fuelcard"], ["j'ai perdu les clés", "lost"], ["la remorque s'est décrochée", "coupling"], ["je suis en panne de gasoil", "breakdown,dryfuel"], ["le frigo ne refroidit pas", "reefer"],
       ["la clim ne marche pas", "climate"], ["la bâche est déchirée", "tarp"], ["le pot d'échappement est tombé", "exhaust"], ["l'essuie-glace ne marche pas", "visib"], ["la ceinture ne s'attache pas", "seat"],
       ["la porte ne ferme pas", "door"], ["le camion est embourbé", "stuck"], ["la plaque est tombée", "numplate"], ["l'embrayage patine", "gear"], ["les écrous de roue sont desserrés", "wheel"],
       ["la suspension est affaissée", "susp"], ["le radar affiche une erreur", "adas"], ["on m'a volé le gasoil", "theft"], ["quelqu'un a rayé la porte", "vandal"], ["la vitre ne monte pas", "window"]]
NO=["le frein est déjà réparé", "les freins marchent à nouveau", "le pneu a été changé", "il ne perd pas d'huile", "pas de fuite", "il n'y a pas eu d'accident", "on ne m'a rien volé",
    "tout va bien", "je rentre au dépôt", "mon fils est à l'hôpital", "il y a beaucoup de bouchons sur l'autoroute", "je vais en direction de Lyon", "le chauffeur est malade", "il fait très froid aujourd'hui", "le rétro gauche va bien", "le ferry ne part pas"]
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fra.inhaber','display_name':'FRA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='fra.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM75' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nFR-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
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
            if SHOTS and txt in ('les freins ne marchent pas','la cabine brûle'): q.locator('#'+want.split(',')[-1]).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/fra-{CASES.index([txt,want])}-{lang}-{w}.png')
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
