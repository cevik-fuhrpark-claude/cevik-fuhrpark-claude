# [CLAUDE] UI-Test (15.11.2026, Backlog 1503, Blickwinkel „Fahrer schreibt die Meldung auf Arabisch“):
# Meldeformular zeigt bei arabischen Stichwörtern (Tabelle AR_KINDS im still nachgeladenen Modul app-sprachen.js) dieselben Hinweise wie bei den anderen
# Sprachen und keine weiteren (genau der erwartete Hinweis sichtbar); Reparaturvermerk, Verneinung, Feuerlöscher, Stau, „كل شي تمام“ ohne;
# „طالع دخان أسود من الشكمان“ zeigt den Motor-Hinweis statt Brand; Meldetext rechtsbündig (dir=auto). DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[["الفرامل لا تعمل", "brake"], ["الفرامل ما بتمسك", "brake"], ["البريك ضعيف", "brake"], ["ضغط الهوا عم ينزل", "brake"], ["المكابح لا تعمل", "brake"], ["فرامل اليد ما بتمسك", "parkbrake"], ["الهاند بريك خربان", "parkbrake"], ["الدولاب بنشر", "flat"], ["انفجر الإطار", "flat"], ["الكاوتش مثقوب", "flat"], ["صار معي بنشر", "flat"], ["الإطار مشقوق من الجنب", "tyre"], ["المقود ثقيل", "steer"], ["الشاحنة تسحب لليمين", "steer"], ["في تسريب زيت تحت المحرك", "leak"], ["المازوت عم ينقط", "leak"], ["الزيت بيخر", "leak"], ["الكبينة عم تحترق", "fire"], ["طالع دخان من المحرك", "fire"], ["الكبينة ولعت", "fire"], ["صار معي حادث", "acc"], ["صدمت سيارة وانا راجع لورا", "acc"], ["السائق مصاب", "injury"], ["صار حادث والسائق مصاب", "acc"], ["المحرك ما بيدور", "nostart"], ["الموتور ما عم يشتغل", "nostart"], ["المحرك لا يعمل", "nostart"], ["المحرك طفى", "nostart"], ["حرارة المحرك عالية", "engine"], ["طالع دخان أسود من الشكمان", "engine"], ["المحرك سخن كتير", "engine"], ["ما في قوة", "engine"], ["المراية مكسورة", "mirror"], ["الضو الخلفي ما بيشتغل", "lights"], ["اللمبة محروقة", "lights"], ["لمبة المحرك ولعت", "warnlight"], ["رسالة خطأ على الشاشة", "warnlight"], ["الزجاج الأمامي مشعور", "glass"], ["حجر ضرب الزجاج", "glass"], ["الشباك ما بيسكر", "window"], ["البطارية فاضية", "batt"], ["التاكوغراف ما بيقرا الكرت", "tacho"], ["ضيعت كرت السائق", "tacho"], ["كرت المازوت ما بيمر", "fuelcard"], ["ضيعت المفاتيح", "lost"], ["التريلا ما بتشبك", "coupling"], ["خلص المازوت", "dryfuel"], ["البراد ما بيبرد", "reefer"], ["البالونات نازلة", "susp"], ["الجير ما بيعشق", "gear"], ["الكلتش بيزحلق", "gear"], ["المكيف ما بيبرد", "climate"], ["تعطل المكيف", "climate"], ["الشوفاج ما بيدفي", "climate"], ["تدفئة الكرسي ما بتشتغل", "cabkit"], ["الشادر مشقوق", "tarp"], ["الشكمان واقع", "exhaust"], ["المساحات ما بتمسح", "visib"], ["حزام الأمان مقطوع", "seat"], ["صواميل الدولاب مرخية", "wheel"], ["الشاحنة غرزت بالطين", "stuck"], ["علقت بالثلج", "stuck"], ["النمرة وقعت", "numplate"], ["الكاميرا مش شغالة", "adas"], ["الباب ما بيسكر", "door"], ["الرافعة الخلفية ما بتنزل", "door"], ["انجرحت بإيدي", "injury"], ["الفرامل ما بتمسك، والمحرك ما بيدور", "brake,nostart"], ["اَلْفَرَامِلُ لَا تَعْمَلُ", "brake"], ["الإطار نازل هوا", "flat"], ["عطل في الفرامل", "brake"], ["المرآة انكسرت", "mirror"], ["البطارية ميتة", "batt"], ["المفتاح ضاع", "lost"], ["اللوحة مكسورة", "numplate"], ["احترقت الكبينة", "fire"], ["الشاحنة احترقت", "fire"], ["المحرك سخن والفرامل ضعيفة", "brake,engine"]]
NO=["تم إصلاح الفرامل", "صلحوا الفرامل", "غيرنا الدولاب", "رجع يشتغل", "كل شي تمام", "ما في تسريب زيت", "الزجاج مش مكسور", "طفاية الحريق ناقصة", "علقت بالزحمة", "شغلت الفلاشر", "الفرامل تعمل بشكل طبيعي", "لا يوجد دخان", "ما في مشكلة", "الإطار مش مبنشر", "ما صار حادث", "الكبينة ما احترقت", "الفرامل شغالة منيح", "framl la t3ml"]
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ar.inhaber','display_name':'AR Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='ar.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM76' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nAR-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
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
            if SHOTS and txt in ('الفرامل لا تعمل','البراد ما بيبرد','ضيعت المفاتيح'): q.locator('#'+want.split(',')[0]).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/ar-{CASES.index([txt,want])}-{lang}-{w}.png')
        for txt in NO:
            q.fill('#d',txt); q.wait_for_timeout(100)
            shown=q.evaluate("[...document.querySelectorAll('.panel[role=status]')].filter(e=>!e.hidden&&e.id).map(e=>e.id)")
            check(not shown,f'{lang}/{w}: „{txt}“ ohne Hinweis {shown}')
        q.fill('#d','الفرامل لا تعمل'); check(q.evaluate("getComputedStyle(document.querySelector('#d')).direction==='rtl'"),f'{lang}/{w}: arabischer Meldetext von rechts nach links')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        q.fill('#d','')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
