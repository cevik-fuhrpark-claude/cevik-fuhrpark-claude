# [CLAUDE] UI-Test (17.11.2026, Backlog 1550, Blickwinkel „Ausländischer Fahrer meldet: Reifen kaputt“):
# Meldeformular zeigt bei „de band is kapot“, „le pneu est cassé“, „la llanta está rota“, „o pneu está estragado“, „il pneumatico è rotto“, „lastik bozuk“, „opona jest zepsuta“,
# „cauciucul e stricat“, „guma je pokvarena“, „a gumi tönkrement“, „pneumatika je rozbitá“ den Reifenpanne-Hinweis (wie „Reifen kaputt“ auf Deutsch), bei „beschädigt“
# („le pneu est abîmé“, „la goma está dañada“, „de band is beschadigd“) den Reifenschaden-Hinweis; Verneinung, „muss erneuert werden“, Ersatzrad, Wischergummi und Knopf („gumb“) ohne.
# Stufe 2 (Backlog 1552): Bulgarisch, Litauisch, Lettisch, Albanisch, Estnisch, Hinglish, Tagalog.
# Stufe 3 (Backlog 1553): Russisch/Ukrainisch („шина сломалась/зламалась“, „резина порвана“), Serbisch kyrillisch, Mazedonisch.
# Stufe 4 (Backlog 1555): Ukrainisch „опона зламалася“, Belarussisch, Kasachisch, Kirgisisch, Usbekisch, Tadschikisch, Aserbaidschanisch.
# Stufe 5 (Backlog 1561): Griechisch „χάλασε το λάστιχο“, Georgisch „საბურავი გაფუჭდა“, Armenisch „անվադողը փչացել է“ (Reifenpanne) bzw. „κατεστραμμένο/დაზიანებულია/վնասվել“ (Reifenschaden).
# DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[["de band is kapot", "flat"], ["de banden zijn stuk", "flat"], ["de band is beschadigd", "tyre"], ["le pneu est cassé", "flat"], ["mon pneu est foutu", "flat"], ["le pneu est abîmé", "tyre"],
       ["la llanta está rota", "flat"], ["se rompió la goma", "flat"], ["la goma está dañada", "tyre"], ["o pneu está estragado", "flat"], ["o pneu está danificado", "tyre"],
       ["il pneumatico è rotto", "flat"], ["la gomma è danneggiata", "tyre"], ["lastik bozuk", "flat"], ["lastik hasarlı", "tyre"], ["opona jest zepsuta", "flat"], ["cauciucul e stricat", "flat"],
       ["guma je pokvarena", "flat"], ["a gumi tönkrement", "flat"], ["pneumatika je rozbitá", "flat"], ["il carico si è ribaltato e la gomma è rotta", "flat,load"],
       ["гумата е счупена", "flat"], ["padanga sugedusi", "flat"], ["padanga sugadinta", "tyre"], ["riepa ir salūzusi", "flat"], ["riepa ir sabojāta", "tyre"], ["goma është prishur", "flat"],
       ["kumm on rikkis", "flat"], ["tyre kharab ho gaya", "flat"], ["tyre damage ho gaya", "tyre"], ["sira ang gulong", "flat"],
       ["шина сломалась", "flat"], ["шина зламалась", "flat"], ["резина порвана", "flat"], ["гума се покварила", "flat"], ["гумата е расипана", "flat"], ["гумата е оштетена", "tyre"],
       ["опона зламалася", "flat"], ["шына зламалася", "flat"], ["шина бұзылды", "flat"], ["шина бузулду", "flat"], ["shina buzildi", "flat"], ["шина вайрон шуд", "flat"], ["şin xarab oldu", "flat"],
       ["χάλασε το λάστιχο", "flat"], ["το λάστιχο είναι κατεστραμμένο", "tyre"], ["საბურავი გაფუჭდა", "flat"], ["საბურავი დაზიანებულია", "tyre"], ["անվադողը փչացել է", "flat"], ["անվադողը վնասվել է", "tyre"]]
NO=["de band is niet kapot", "le pneu n'est pas cassé", "la llanta no está rota", "de band moet vervangen worden", "il faut changer le pneu", "de reserveband is kapot", "la rueda de repuesto está rota",
    "gumb je pokvaren", "de radio is kapot", "o pneu sobresselente está estragado",
    "гумата не е счупена", "резервната гума е счупена", "riepa nav salūzusi", "goma nuk është prishur", "stepney tyre kharab hai", "hindi sira ang gulong", "шина не сломана", "колесо сломалось", "запасная шина сломана", "гумата не е расипана", "опона не зламана", "дөңгелек бұзылды", "shina buzilmadi", "ehtiyat şin xarab oldu", "δεν χάλασε το λάστιχο", "το εφεδρικό λάστιχο χάλασε", "საბურავი არ გაფუჭებულა", "ბორბალი გაფუჭდა", "անվադողը չի փչացել", "անիվը փչացել է"]
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'rkf.inhaber','display_name':'RKF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='rkf.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM75' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nRK-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
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
            if SHOTS and txt in ('le pneu est cassé','la goma está dañada','sira ang gulong','шина зламалась','шина бұзылды','საბურავი გაფუჭდა'): q.locator('#'+want.split(',')[-1]).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/rkf-{CASES.index([txt,want])}-{lang}-{w}.png')
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
