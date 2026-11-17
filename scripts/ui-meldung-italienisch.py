# [CLAUDE] UI-Test (17.11.2026, Backlog 1546, Blickwinkel „Fahrer aus Italien schreibt Italienisch“):
# Meldeformular zeigt bei „i freni non funzionano“, „la gomma è bucata“, „il motore non parte“, „la cabina sta bruciando“, „perde olio“,
# „ho avuto un incidente“, „il frigo non raffredda“, „hanno rubato il gasolio“ u. a. den passenden Hinweis; Reparaturvermerk („è già riparato“, „funziona bene“),
# Verneinung („non perde olio“, „non c'è stato nessun incidente“, „senza perdite“) und Alltagssätze ohne Hinweis. DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[["i freni non funzionano", "brake"], ["senza freni", "brake"], ["il freno a mano non si sblocca", "parkbrake"], ["la gomma è bucata", "flat"], ["è scoppiata una gomma", "flat"],
       ["la gomma è liscia", "tyre"], ["lo sterzo è duro", "steer"], ["perde olio", "leak"], ["la cabina sta bruciando", "fire"], ["ho avuto un incidente", "acc"], ["mi sono fatto male", "injury"],
       ["il motore non parte", "nostart"], ["il motore si surriscalda", "engine"], ["esce fumo nero dallo scarico", "engine"], ["lo specchio è rotto", "mirror"], ["il parabrezza è crepato", "glass"],
       ["le luci non funzionano", "lights"], ["si è accesa la spia del motore", "warnlight"], ["la batteria è scarica", "batt"], ["il tachigrafo dà errore", "tacho"],
       ["la carta carburante è bloccata", "fuelcard"], ["ho perso le chiavi", "lost"], ["il rimorchio si è sganciato", "coupling"], ["sono rimasto senza gasolio", "dryfuel"], ["il frigo non raffredda", "reefer"],
       ["l'aria condizionata non funziona", "climate"], ["il telone è strappato", "tarp"], ["il tubo di scarico è caduto", "exhaust"], ["il tergicristallo non funziona", "visib"], ["la cintura non si aggancia", "seat"],
       ["la porta non si chiude", "door"], ["il camion è impantanato nel fango", "stuck"], ["la targa è caduta", "numplate"], ["la frizione slitta", "gear"], ["i bulloni della ruota sono allentati", "wheel"],
       ["il soffietto della sospensione è scoppiato", "susp"], ["il radar dà errore", "adas"], ["hanno rubato il gasolio", "theft"], ["qualcuno ha rigato la porta", "vandal"], ["il finestrino non sale", "window"]]
NO=["è già riparato il freno", "i freni funzionano di nuovo bene", "la gomma è stata cambiata", "non perde olio", "senza perdite", "non c'è stato nessun incidente", "non mi hanno rubato niente",
    "tutto a posto", "vado in sede", "mio figlio è in ospedale", "c'è molto traffico in autostrada", "vado in direzione Milano", "l'autista è malato", "fa molto freddo oggi", "lo specchio sinistro va bene", "il traghetto non parte"]
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ita.inhaber','display_name':'ITA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='ita.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM75' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nIT-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
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
            if SHOTS and txt in ('i freni non funzionano','la cabina sta bruciando'): q.locator('#'+want.split(',')[-1]).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/ita-{CASES.index([txt,want])}-{lang}-{w}.png')
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
