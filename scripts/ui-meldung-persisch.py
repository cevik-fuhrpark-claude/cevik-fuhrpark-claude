# [CLAUDE] UI-Test (15.11.2026, Backlog 1504, Blickwinkel „Fahrer schreibt die Meldung auf Persisch (Farsi/Dari)“):
# Meldeformular zeigt bei persischen Stichwörtern (Tabelle FA_KINDS im still nachgeladenen Modul app-sprachen.js) dieselben Hinweise wie bei den anderen
# Sprachen und keine weiteren (genau der erwartete Hinweis sichtbar); Reparaturvermerk, verneintes Verb, Feuerlöscher, Stau, „همه چیز خوبه“ ohne;
# „از اگزوز دود سیاه میاد“ zeigt den Motor-Hinweis statt Brand; Meldetext rechtsbündig (dir=auto). DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[["ترمز کار نمی‌کنه", "brake"], ["ترمزها نمی‌گیره", "brake"], ["ترمز برید", "brake"], ["لنت ترمز تموم شده", "brake"], ["فشار باد پایین اومده", "brake"], ["بریک خراب است", "brake"], ["ترمز دستی نمی‌گیره", "parkbrake"], ["هندبریک خرابه", "parkbrake"],  ["لاستیک پنچر شد", "flat"], ["لاستیک ترکید", "flat"], ["پنچر شدم", "flat"], ["لاستیک عقب باد نداره", "flat"], ["تایر پنچر است", "flat"], ["لاستیک ترک خورده", "tyre"], ["لاستیک صاف شده", "tyre"], ["لاستیک باد کرده", "tyre"],  ["فرمان سنگین شده", "steer"], ["کامیون به راست می‌کشه", "steer"], ["روغن نشت می‌کنه", "leak"], ["گازوئیل می‌چکه", "leak"], ["زیر موتور روغن چکه می‌کنه", "leak"], ["نشتی روغن داره", "leak"], ["تیل می‌چکه", "leak"],  ["کابین آتش گرفت", "fire"], ["از کابین دود میاد", "fire"], ["موتور داره می‌سوزه", "fire"], ["تصادف کردم", "acc"], ["با دنده عقب زدم به یک ماشین", "acc"], ["یه ماشین به من زد", "acc"], ["راننده زخمی شد", "injury"], ["تصادف شد و راننده زخمی شد", "acc"], ["دستم برید", "injury"],  ["موتور روشن نمی‌شه", "nostart"], ["ماشین استارت نمی‌خوره", "nostart"], ["موتور کار نمی‌کنه", "nostart"], ["کامیون وسط راه خاموش شد", "nostart"], ["موتر چالان نمی‌شه", "nostart"],  ["موتور داغ کرده", "engine"], ["آمپر آب بالا رفته", "engine"], ["از اگزوز دود سیاه میاد", "engine"], ["موتور قدرت نداره", "engine"], ["موتور صدای عجیب می‌ده", "engine"],  ["آینه بغل شکست", "mirror"], ["چراغ عقب سوخته", "lights"], ["راهنما کار نمی‌کنه", "lights"], ["چراغ چک روشن شد", "warnlight"], ["چراغ موتور روشن شده", "warnlight"], ["خطا روی صفحه نمایشگر", "warnlight"],  ["شیشه جلو ترک برداشت", "glass"], ["سنگ خورد به شیشه", "glass"], ["شیشه بالا نمی‌ره", "window"], ["باتری خالی شده", "batt"], ["باتری خوابیده", "batt"],  ["تاخوگراف کارت رو نمی‌خونه", "tacho"], ["کارت راننده گم شد", "tacho"], ["کارت هوشمند گم شده", "tacho"], ["کارت سوخت کار نمی‌کنه", "fuelcard"], ["کارت سوخت مسدود شده", "fuelcard"], ["سوئیچ را گم کردم", "lost"], ["کلید گم شد", "lost"], ["مدارک ماشین گم شده", "lost"],  ["تریلی جدا شد", "coupling"], ["چرخ پنجم قفل نمی‌شه", "coupling"], ["سوخت تمام شد", "dryfuel"], ["گازوئیل تموم کردم", "dryfuel"], ["باک خالیه", "dryfuel"], ["یخچال سرد نمی‌کنه", "reefer"], ["سردکن خراب است", "reefer"],  ["بالشتک باد پاره شده", "susp"], ["فنر شکسته", "susp"], ["کامیون یک طرف نشسته", "susp"], ["دنده جا نمی‌ره", "gear"], ["کلاچ می‌لغزه", "gear"], ["گیربکس صدا می‌ده", "gear"],  ["بخاری گرم نمی‌کنه", "climate"], ["کولر خنک نمی‌کنه", "climate"], ["گرمکن صندلی کار نمی‌کنه", "cabkit"], ["چادر پاره شده", "tarp"], ["اگزوز افتاده", "exhaust"], ["برف‌پاک‌کن کار نمی‌کنه", "visib"], ["آب‌پاش آب نمی‌ده", "visib"],  ["کمربند قفل نمی‌شه", "seat"], ["صندلی شکسته", "seat"], ["مهره چرخ شل شده", "wheel"], ["بلبرینگ صدا می‌ده", "wheel"], ["تو گل گیر کردم", "stuck"], ["در برف گیر کردیم", "stuck"], ["پلاک افتاده", "numplate"], ["دوربین عقب کار نمی‌کنه", "adas"], ["در باز نمی‌شه", "door"], ["قفل مرکزی خرابه", "door"],  ["ترمز نمی‌گیره، موتور روشن نمی‌شه", "brake,nostart"], ["ترمز نمي گيره", "brake"], ["ترمز كار نمي كنه", "brake"], ["موتور داغ کرده و ترمز ضعیفه", "brake,engine"], ["لاستیک پنچر شد؛ آینه شکست", "flat,mirror"]]
NO=["ترمز تعمیر شد", "لاستیک را عوض کردیم", "دوباره کار می‌کنه", "همه چیز خوبه", "مشکلی نیست", "روغن نشت نمی‌کنه", "شیشه شکسته نیست", "کپسول آتش‌نشانی نیست", "تو ترافیک گیر کردم", "لاستیک پنچر نیست", "تصادف نکردم", "هیچ مشکلی نداره", "ترمز درست شد", "پنچرگیری کردم", "دود نمیاد", "بدون تصادف رسیدم", "کامیون سالم است", "بار تحویل داده شد", "فردا ساعت هشت می‌رسم", "trmz kar nmyknh", "لاستیک‌ها را باد کردم"]
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fa.inhaber','display_name':'FA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='fa.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM76' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nFA-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
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
            if SHOTS and txt in ('ترمز کار نمی‌کنه','یخچال سرد نمی‌کنه','سوئیچ را گم کردم'): q.locator('#'+want.split(',')[0]).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/fa-{CASES.index([txt,want])}-{lang}-{w}.png')
        for txt in NO:
            q.fill('#d',txt); q.wait_for_timeout(100)
            shown=q.evaluate("[...document.querySelectorAll('.panel[role=status]')].filter(e=>!e.hidden&&e.id).map(e=>e.id)")
            check(not shown,f'{lang}/{w}: „{txt}“ ohne Hinweis {shown}')
        q.fill('#d','ترمز کار نمی‌کنه'); check(q.evaluate("getComputedStyle(document.querySelector('#d')).direction==='rtl'"),f'{lang}/{w}: persischer Meldetext von rechts nach links')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        q.fill('#d','')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
