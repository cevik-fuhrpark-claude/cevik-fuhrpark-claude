# [CLAUDE] UI-Test (15.11.2026, Backlog 1507, Blickwinkel „Fahrer schreibt die Meldung auf Aserbaidschanisch“):
# Meldeformular zeigt bei aserbaidschanischen Stichwörtern (auch ohne Sonderzeichen; Tabelle AZ_KINDS im still nachgeladenen Modul app-sprachen.js) dieselben Hinweise
# wie bei den anderen Sprachen und keine weiteren (genau der erwartete Hinweis sichtbar); Reparaturvermerk, verneintes Verb, „… deyil“, Stau, „hava vurdum“ ohne;
# „egzozdan qara tüstü çıxır“ zeigt den Motor-Hinweis statt Brand. DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[["əyləc işləmir", "brake"], ["əyləclər tutmur", "brake"], ["eylec islemir", "brake"], ["əyləc zəifdir", "brake"], ["Əyləc yaxşı tutmur", "brake"], ["tormoz işləmir", "brake"], ["hava təzyiqi düşür", "brake"], ["əl əyləci tutmur", "parkbrake"], ["maşın öz-özünə getdi", "parkbrake"], ["təkər partladı", "flat"], ["şin deşildi", "flat"], ["arxa təkər yatıb", "flat"], ["təkərin havası çıxdı", "flat"], ["sol ön təkər deşilib", "flat"], ["şin partlayıb", "flat"], ["təkər yeyilib", "tyre"], ["şin şişib", "tyre"], ["sükan ağırdır", "steer"], ["maşın sağa çəkir", "steer"], ["yük maşını sola çəkir", "steer"], ["yağ axır", "leak"], ["mühərrikdən yağ axır", "leak"], ["antifriz damcılayır", "leak"], ["dizel axır", "leak"], ["radiatordan antifriz axır", "leak"], ["kabina yanır", "fire"], ["kabinədən tüstü çıxır", "fire"], ["yanğın var", "fire"], ["qəzaya düşdüm", "acc"], ["qəza oldu", "acc"], ["maşına vurdum", "acc"], ["yaralandım", "injury"], ["təcili yardım çağırın", "injury"], ["mühərrik işə düşmür", "nostart"], ["maşın işə düşmür", "nostart"], ["motor işə düşmür", "nostart"], ["starter işləmir", "nostart"], ["mühərrik qızıb", "engine"], ["mühərrik çox qızır", "engine"], ["mühərrik dartmır", "engine"], ["mühərrikdən qəribə səs gəlir", "engine"], ["egzozdan qara tüstü çıxır", "engine"], ["qəza rejiminə keçdi", "engine"], ["güzgü sındı", "mirror"], ["sağ güzgü qopub", "mirror"], ["fara yanmır", "lights"], ["stop işığı yanmır", "lights"], ["sağ fara sınıb", "lights"], ["lampa yanmır", "lights"], ["mühərrik lampası yanır", "warnlight"], ["abs lampası yanır", "warnlight"], ["paneldə xəta çıxdı", "warnlight"], ["ön şüşə çatladı", "glass"], ["ön şüşədə çat var", "glass"], ["şüşə sındı", "glass"], ["şüşəyə daş dəydi", "glass"], ["pəncərə qalxmır", "window"], ["akkumulyator oturub", "batt"], ["akkumulyator boşalıb", "batt"], ["taxoqraf kartı oxumur", "tacho"], ["sürücü kartı itdi", "tacho"], ["yanacaq kartı işləmir", "fuelcard"], ["açarı itirdim", "lost"], ["açar itib", "lost"], ["qoşqu qoşulmur", "coupling"], ["solyarka qurtardı", "dryfuel"], ["soyuducu soyutmur", "reefer"], ["aqreqat işləmir", "reefer"], ["yastıq partladı", "susp"], ["sürət girmir", "gear"], ["debriyaj sürüşür", "gear"], ["kondisioner işləmir", "climate"], ["peç qızdırmır", "climate"], ["oturacaq qızdırıcısı işləmir", "cabkit"], ["güzgünün qızdırıcısı işləmir", "cabkit"], ["tent cırılıb", "tarp"], ["qoşqunun tenti cırılıb", "tarp"], ["egzoz düşüb", "exhaust"], ["dvornik işləmir", "visib"], ["kəmər bağlanmır", "seat"], ["qayka boşalıb", "wheel"], ["palçığa batıb qaldım", "stuck"], ["maşın palçığa batıb qaldı", "stuck"], ["nömrə düşüb", "numplate"], ["kamera işləmir", "adas"], ["qapı bağlanmır", "door"], ["qapı açılmır", "door"], ["gözlə, təkər partladı və sükan ağırdır", "flat,steer"], ["əyləc işləmir. mühərrik qızıb", "brake,engine"]]
NO=["əyləc düzəldildi", "təkər dəyişdirildi", "yenə işləyir", "hər şey qaydasındadır", "problem yoxdur", "yağ axmır", "şüşə sınıq deyil", "təkər partlamayıb", "qəzasız çatdım", "tıxacda qaldım", "yükü təhvil verdim", "sabah saat səkkizdə çatacağam", "yanacaq doldurdum", "heç bir problem yoxdur", "təkərlərə hava vurdum", "fara yanır", "mühərrik işləyir", "təkər yaxşıdır", "kabinədə siqaret tüstüsü", "mühərrik lampası söndü"]
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'az.inhaber','display_name':'AZ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='az.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM76' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nAZ-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':user,'password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        for txt,want in CASES:
            q.fill('#d',txt); q.wait_for_timeout(100)
            shown=q.evaluate("[...document.querySelectorAll('.panel[role=status]')].filter(e=>!e.hidden&&e.id).map(e=>e.id)")
            check(sorted(shown)==want.split(','),f'{lang}/{w}: „{txt}“ → {want} (sichtbar: {shown})')
            if SHOTS and txt in ('əyləc işləmir','soyuducu soyutmur','açarı itirdim'): q.locator('#'+want.split(',')[0]).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/az-{CASES.index([txt,want])}-{lang}-{w}.png')
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
