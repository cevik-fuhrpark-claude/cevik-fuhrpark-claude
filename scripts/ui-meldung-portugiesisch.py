# [CLAUDE] UI-Test (17.11.2026, Backlog 1545, Blickwinkel „Fahrer aus Portugal/Brasilien schreibt Portugiesisch“):
# Meldeformular zeigt bei „os travões não funcionam“, „o pneu está furado“, „o motor não pega“, „a cabine está a arder“, „está a perder óleo“,
# „tive um acidente“, „o frio não arrefece“, „roubaram o gasóleo“ u. a. den passenden Hinweis; Reparaturvermerk („já está arranjado“, „funciona bem“),
# Verneinung („não perde óleo“, „não houve acidente“, „sem fugas“) und Alltagssätze ohne Hinweis. DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[["os travões não funcionam", "brake"], ["sem travões", "brake"], ["o freio de mão está preso", "parkbrake"], ["o pneu está furado", "flat"], ["estourou o pneu da carreta", "flat"],
       ["o pneu está careca", "tyre"], ["a direção está dura", "steer"], ["está a perder óleo", "leak"], ["a cabine está a arder", "fire"], ["tive um acidente", "acc"], ["me machuquei", "injury"],
       ["o motor não pega", "nostart"], ["o motor está a aquecer", "engine"], ["sai fumo preto do escape", "engine"], ["o espelho está partido", "mirror"], ["o para-brisas está rachado", "glass"],
       ["as luzes não funcionam", "lights"], ["acendeu a luz do motor", "warnlight"], ["a bateria está descarregada", "batt"], ["o tacógrafo dá erro", "tacho"],
       ["o cartão de combustível está bloqueado", "fuelcard"], ["perdi as chaves", "lost"], ["o reboque soltou-se", "coupling"], ["fiquei sem gasóleo", "dryfuel"], ["o frio não arrefece", "reefer"],
       ["o ar condicionado não funciona", "climate"], ["a lona está rasgada", "tarp"], ["o tubo de escape caiu", "exhaust"], ["as palhetas não limpam", "visib"], ["o cinto não prende", "seat"],
       ["a porta não fecha", "door"], ["o caminhão está atolado na lama", "stuck"], ["a matrícula caiu", "numplate"], ["a embraiagem patina", "gear"], ["as porcas da roda estão soltas", "wheel"],
       ["o balão da suspensão rebentou", "susp"], ["o radar dá erro", "adas"], ["roubaram o gasóleo", "theft"], ["alguém riscou a porta", "vandal"], ["o vidro da porta não sobe", "window"]]
NO=["já está arranjado o travão", "os travões já funcionam bem", "o pneu foi trocado", "não perde óleo", "sem fugas", "não houve acidente", "não roubaram nada",
    "tudo bem", "já vou para a base", "o meu filho está no hospital", "há muito trânsito na autoestrada", "vou em direção a Lisboa", "o motorista está doente", "faz muito frio hoje"]
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'por.inhaber','display_name':'POR Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='por.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM75' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nPT-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
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
            if SHOTS and txt in ('os travões não funcionam','a cabine está a arder'): q.locator('#'+want.split(',')[-1]).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/por-{CASES.index([txt,want])}-{lang}-{w}.png')
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
