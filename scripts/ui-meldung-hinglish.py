# [CLAUDE] UI-Test (16.11.2026, Backlog 1538, Blickwinkel „Fahrer schreibt Hindi/Punjabi in lateinischen Buchstaben (Hinglish)“):
# Meldeformular zeigt bei Hinglish-Stichwörtern (Tabelle HI_KINDS im still nachgeladenen Modul app-sprachen.js) dieselben Hinweise wie bei den anderen
# Sprachen und keine weiteren (genau der erwartete Hinweis sichtbar, auch zusammen mit den englischen Mustern des Start-Moduls); Reparaturvermerk,
# Verneinung, Stau, „sab theek hai“ ohne; „light nahi jal rahi“ Licht statt Brand. DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[["brake kaam nahi kar raha hai", "brake"], ["brake nahi lag rahi", "brake"], ["brake fail ho gaya", "brake"], ["hand brake nahi chhut raha", "parkbrake"], ["tyre puncture ho gaya", "flat"], ["tyre phat gaya", "flat"], ["tyre mein hawa nahi hai", "flat"], ["tayar pancher ho gaya", "flat"], ["steering bahut bhari hai", "steer"], ["steering hil raha hai", "steer"], ["oil leak ho raha hai", "leak"], ["tel tapak raha hai", "leak"], ["diesel leak ho raha hai", "leak"], ["gaadi mein aag lag gayi", "fire"], ["engine se dhuan nikal raha hai", "fire"], ["accident ho gaya", "acc"], ["gaadi thok di", "acc"], ["deewar se takra gaya", "acc"], ["mujhe chot lagi hai", "injury"], ["engine start nahi ho raha", "nostart"], ["gaadi start nahi ho rahi", "nostart"], ["engine garam ho raha hai", "engine"], ["engine overheat ho gaya", "engine"], ["engine mein awaaz aa rahi hai", "engine"], ["mirror toot gaya", "mirror"], ["sheesha toot gaya", "glass"], ["light nahi jal rahi", "lights"], ["headlight kharab hai", "lights"], ["indicator kaam nahi kar raha", "lights"], ["check engine light jal rahi hai", "warnlight"], ["dashboard pe error aa raha hai", "warnlight"], ["windscreen mein crack aa gaya", "glass"], ["shisha phoot gaya", "glass"], ["battery down hai", "batt"], ["battery khatam ho gayi", "batt"], ["tachograph kaam nahi kar raha", "tacho"], ["driver card nahi padh raha", "tacho"], ["fuel card block ho gaya", "fuelcard"], ["chabi kho gayi", "lost"], ["trailer khul gaya", "coupling"], ["diesel khatam ho gaya", "dryfuel"], ["reefer thanda nahi kar raha", "reefer"], ["AC kaam nahi kar raha", "climate"], ["heater kaam nahi kar raha", "climate"], ["tarpaulin phat gaya", "tarp"], ["silencer gir gaya", "exhaust"], ["wiper kaam nahi kar raha", "visib"], ["seat belt nahi lag rahi", "seat"], ["darwaza band nahi ho raha", "door"], ["gaadi kichad mein phas gayi", "stuck"], ["number plate gir gayi", "numplate"], ["gear nahi lag raha", "gear"], ["clutch jal gaya", "gear"], ["brake kam nahi kardi", "brake"], ["brake thik se nahi lag rahi hai", "brake"], ["hava ka pressure kam ho raha hai", "brake"], ["air pressure gir raha hai", "brake"], ["handbrake jam ho gaya", "parkbrake"], ["gaadi apne aap chal padi", "parkbrake"], ["tyre phat gya", "flat"], ["tyre ghis gaya hai", "tyre"], ["pichhe ka tyre puncture ho gaya", "flat"], ["puncture ho gaya", "flat"], ["gaadi ek taraf khinch rahi hai", "steer"], ["coolant tapak raha hai", "leak"], ["adblue leak ho raha hai", "leak"], ["cabin se dhuan aa raha hai", "fire"], ["tyre jal raha hai", "fire"], ["truck ka accident ho gaya", "acc"], ["maine gaadi thok di", "acc"], ["mujhe chot lag gayi", "injury"], ["ambulance bulao", "injury"], ["engine band ho gaya", "nostart"], ["self nahi le raha", "nostart"], ["gaddi start nahi hundi", "nostart"], ["engine mein power nahi hai", "engine"], ["silencer se kala dhuan nikal raha hai", "engine"], ["turbo kharab hai", "engine"], ["side mirror toot gaya", "mirror"], ["mirror nikal gaya", "mirror"], ["windscreen pe patthar laga", "glass"], ["khidki upar nahi ho rahi", "window"], ["brake light nahi jal rahi", "lights"], ["indicator ka bulb fuse ho gaya", "lights"], ["abs ki light jal rahi hai", "warnlight"], ["battery down ho gayi", "batt"], ["battery charge nahi ho rahi", "batt"], ["tachograph mein error aa raha hai", "tacho"], ["card kho gaya", "tacho"], ["dkv card kaam nahi kar raha", "fuelcard"], ["kagaz kho gaye", "lost"], ["trailer lock nahi ho raha", "coupling"], ["fifth wheel lock nahi ho raha", "coupling"], ["diesel khatam ho gya", "dryfuel"], ["tank khali ho gaya", "dryfuel"], ["reefer unit kharab hai", "reefer"], ["reefer start nahi ho raha", "reefer"], ["ac thandi hawa nahi de raha", "climate"], ["heater garam nahi kar raha", "climate"], ["webasto kharab hai", "climate"], ["parda phat gaya", "tarp"], ["silencer toot gaya", "exhaust"], ["wiper nahi chal raha", "visib"], ["seat toot gayi", "seat"], ["seat belt lock nahi ho rahi", "seat"], ["darwaza khul nahi raha", "door"], ["pichhe ka gate band nahi ho raha", "door"], ["baraf mein phas gaye", "stuck"], ["number plate kho gayi", "numplate"], ["clutch slip kar raha hai", "gear"], ["gear box se awaaz aa rahi hai", "gear"], ["nut dheele ho gaye", "wheel"], ["bearing garam ho raha hai", "wheel"], ["air bag phat gaya", "susp"], ["kamani toot gayi", "susp"], ["camera kaam nahi kar raha", "adas"], ["sensor error aa raha hai", "adas"]]
NO=["sab theek hai", "sab kuch sahi hai", "koi problem nahi hai", "koi dikkat nahi", "brake theek hai", "brake thik kar diya", "tyre badal diya", "tyre change kar diya", "naya tyre lag gaya", "tel nahi tapak raha", "mirror toota nahi hai", "koi leak nahi hai", "aag nahi lagi", "light jala di", "maine light jalayi", "traffic mein phas gaya", "main ghar ja raha hu", "kal chhutti hai", "gaadi theek chal rahi hai", "engine thik hai ab", "ab sahi se chal raha hai", "light jal rahi hai", "mujhe bhookh lagi hai", "diesel bhar diya", "dhuan nahi aa raha", "gaadi saaf kar di", "seat aaram dayak hai"]
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'hi.inhaber','display_name':'HI Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='hi.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM76' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nHI-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
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
            if SHOTS and txt in ('brake kaam nahi kar raha','reefer thanda nahi kar raha','chabi kho gayi'): q.locator('#'+want).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/hi-{CASES.index([txt,want])}-{lang}-{w}.png')
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
