# [CLAUDE] UI-Test (16.11.2026, Backlog 1533, Blickwinkel „Fahrer schreibt die Meldung auf Armenisch“):
# Meldeformular zeigt bei armenischen Stichwörtern (Tabelle HY_KINDS im still nachgeladenen Modul app-sprachen.js) dieselben Hinweise wie bei den anderen
# Sprachen und keine weiteren (genau der erwartete Hinweis sichtbar); Reparaturvermerk, Verneinung, Feuerlöscher, Stau, „Ամեն ինչ կարգին է“ ohne;
# „Խլացուցիչից սև ծուխ է գալիս“ zeigt den Motor-Hinweis statt Brand. DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[["Արգելակները չեն աշխատում", "brake"], ["ԱՐԳԵԼԱԿՆԵՐԸ ՉԵՆ ԱՇԽԱՏՈՒՄ", "brake"], ["Արգելակը թույլ է բռնում", "brake"], ["Տորմուզը չի աշխատում", "brake"], ["Օդի ճնշումը ընկնում է", "brake"], ["Ձեռքի արգելակը չի բռնում", "parkbrake"], ["Ռուչնիկը չի աշխատում", "parkbrake"], ["Անիվը պայթեց", "flat"], ["Անվադողը ծակվել է", "flat"], ["Անիվը իջել է", "flat"], ["Պայթեց անվադողը", "flat"], ["Անվադողը մաշված է", "tyre"], ["Շարժիչը չի միանում", "nostart"], ["Մեքենան չի վառվում", "nostart"], ["Մոտորը անջատվեց", "nostart"], ["Շարժիչը տաքանում է", "engine"], ["Շարժիչը գերտաքացել է", "engine"], ["Շարժիչը աղմկում է", "engine"], ["Խլացուցիչից սև ծուխ է գալիս", "engine"], ["Կաբինան վառվում է", "fire"], ["Կաբինայից ծուխ է գալիս", "fire"], ["Կրակ է բռնկվել", "fire"], ["Յուղը հոսում է", "leak"], ["Դիզելը կաթում է", "leak"], ["Անտիֆրիզի արտահոսք կա", "leak"], ["Վթարի ենթարկվեցի", "acc"], ["Բախվեցի սյանը", "acc"], ["Ավարիա եղավ", "acc"], ["Վարորդը վիրավորվել է", "injury"], ["Վթարի ենթարկվեցի, վարորդը վիրավորվել է", "acc"], ["Չեկը վառվեց", "warnlight"], ["Շարժիչի լամպը վառվեց", "warnlight"], ["Վահանակին սխալ է գրում", "warnlight"], ["Դիմապակին ճաքեց", "glass"], ["Քար դիպավ դիմապակուն", "glass"], ["Հայելին կոտրվեց", "mirror"], ["Լույսերը չեն վառվում", "lights"], ["Լամպը այրվել է", "lights"], ["Ֆարը չի աշխատում", "lights"], ["Ակումուլյատորը նստել է", "batt"], ["Տախոգրաֆը չի կարդում քարտը", "tacho"], ["Վարորդի քարտը կորցրել եմ", "tacho"], ["Վառելիքի քարտը չի աշխատում", "fuelcard"], ["Բանալին կորցրել եմ", "lost"], ["Փաստաթղթերը կորել են", "lost"], ["Կցորդը չի միանում", "coupling"], ["Կիսակցորդը չի ամրանում", "coupling"], ["Վառելիքը վերջացավ", "dryfuel"], ["Բաքը դատարկ է", "dryfuel"], ["Սառնարանը չի սառեցնում", "reefer"], ["Ռեֆը չի աշխատում", "reefer"], ["Պնևմոբարձը օդ է թողնում", "susp"], ["Ռեսորը կոտրվել է", "susp"], ["Փոխանցումը չի մտնում", "gear"], ["Կցորդիչը բուքսավորում է", "gear"], ["Կարոբկան փչացել է", "gear"], ["Ջեռուցումը չի աշխատում", "climate"], ["Կոնդիցիոները չի միանում", "climate"], ["Ավտոնոմկան չի վառվում", "climate"], ["Նստատեղի տաքացումը չի աշխատում", "cabkit"], ["Տենտը պատռվեց", "tarp"], ["Խլացուցիչը ընկավ", "exhaust"], ["Մաքրիչները չեն աշխատում", "visib"], ["Ամրագոտին չի կապվում", "seat"], ["Նստատեղը կոտրվեց", "seat"], ["Անիվի պտուտակները թուլացել են", "wheel"], ["Ցեխի մեջ խրվեցի", "stuck"], ["Մեքենան բուքսավորում է", "stuck"], ["Համարանիշը ընկավ", "numplate"], ["Տեսախցիկը չի աշխատում", "adas"], ["Դուռը չի փակվում", "door"], ["Գիդրոբորտը չի աշխատում", "door"], ["Պատուհանը չի իջնում", "window"], ["Ղեկը ծանր է պտտվում", "steer"], ["Աջ է քաշում", "steer"], ["Դռները չեն փակվում", "door"], ["Սեդլոն չի բացվում", "coupling"], ["Մոտորը թակում է", "engine"], ["Ձախ է տանում", "steer"], ["Մեքենան չի միանում", "nostart"]]
NO=["Ամեն ինչ կարգին է", "Արգելակները վերանորոգեցին", "Անիվը փոխեցինք", "Նորից աշխատում է", "Արգելակները նորմալ աշխատում են", "Կրակմարիչը չկա", "Կաբինան վնասված է", "Անիվը չի պայթել", "Հայելին կոտրված չէ", "Յուղը չի հոսում", "Խնդիր չկա", "Խցանման մեջ մնացի", "Վթարային լույսերը միացրի", "Չեմ բախվել", "Լույսերը միացրի", "Արգելակը սարքեցին", "Ապակին կոտրված չէ", "Ծխում եմ", "Շարժիչը աշխատում է"]
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'hy.inhaber','display_name':'HY Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='hy.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM76' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nHY-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
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
            if SHOTS and txt in ('Արգելակները չեն աշխատում','Սառնարանը չի սառեցնում','Բանալին կորցրել եմ'): q.locator('#'+want).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/hy-{CASES.index([txt,want])}-{lang}-{w}.png')
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
