# [CLAUDE] UI-Test (28.10.2026, Backlog 463, Folge aus 462: Rückfrage an den Melder als erkennbarer offener Zustand):
# Je Sprache (DE/UK/EN): Fahrer meldet; Fuhrparkleitung setzt im Kommentar das Häkchen „Als Rückfrage …“ (setzt „Gemeldet von“ mit),
# Vorgang zeigt „Rückfrage offen“, Verlauf „Rückfrage an den Melder“; Fahrer sieht oben auf der Startseite „Rückfrage der Fuhrparkleitung“
# und im Vorgang den Hinweis, antwortet per Kommentar; Leitung sieht „Antwort vom Melder eingegangen“ (Vorgang, Liste, „Heute zu tun“).
# Ansichten 390/820/1366 px ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
L={'de':{'open':'Rückfrage offen','ans':'Antwort vom Melder eingegangen','act':'Rückfrage an den Melder','drv':'Rückfrage der Fuhrparkleitung','todo':'Antwort auf Rückfrage eingegangen'},
   'uk':{'open':'Уточнення відкрите','ans':'Відповідь від автора повідомлення отримано','act':'Уточнення для автора повідомлення','drv':'Уточнення від керівника автопарку','todo':'Отримано відповідь на уточнення'},
   'en':{'open':'Question open','ans':'Reporter has answered','act':'Question to the reporter','drv':'Question from fleet management','todo':'Answer to a question received'}}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
WIDTHS=[(390,844),(820,1180),(1366,900)]
def noscroll(q): return q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1')
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'rf.inhaber','display_name':'RF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'rf.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    def mkuser(un,role,lang='de',**kw):
        u=api('POST','/api/users',{'username':un,'display_name':un.upper(),'role':role,'environment':'production','language':lang,**kw})
        c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
        return u['d'].get('id') or (u['d'].get('user') or {}).get('id')
    def page(un,wd=390,h=844):
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}]); return ctx,q,errs
    for i,lang in enumerate(['de','uk','en']):
        vin=f'WDB9634031L40010{i}'; api('POST','/api/vehicles',{'vin':vin,'plate':f'RF-AB {i+1}','site':'Dortmund'})
        did=mkuser(f'rf.fahrer.{lang}','driver',lang); mkuser(f'rf.leitung.{lang}','fleet',lang)
        check(api('POST',f'/api/vehicles/VIN:{vin}/drivers',{'user_id':did,'evidence':'Dienstplan'})['s'] in (200,201),f'{lang}: Zuordnung')
        dctx,d,derr=page(f'rf.fahrer.{lang}')
        c=d.evaluate(JS,['POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Spiegel abgefahren','priority':'mittel','driveability':'fahrbereit','workshop_site':'DORTMUND','request_key':str(uuid.uuid4())}])
        check(c['s']==201,f'{lang}: Meldung'); cid=c['d']['id']
        # Leitung fragt über die Oberfläche zurück
        lctx,l,lerr=page(f'rf.leitung.{lang}')
        l.goto(B+'/#/cases/'+cid); l.reload(); l.wait_for_selector('#cf [data-q]',timeout=15000)
        l.fill('#ct','Welcher Spiegel? Bitte Foto.'); l.check('#cf [data-q]')
        check(l.is_checked('#cf [data-nt="reporter"]'),f'{lang}: Häkchen setzt „Gemeldet von“ mit')
        l.click('#cf button'); l.wait_for_selector('[data-qbanner="open"]',timeout=15000)
        check(L[lang]['act'] in l.inner_text('ol.timeline'),f'{lang}: Verlauf „{L[lang]["act"]}“')
        check(L[lang]['open'] in l.inner_text('[data-qbanner]'),f'{lang}: Hinweis „{L[lang]["open"]}“')
        if SHOTS: l.screenshot(path=f'{SHOTS}/rf_leitung_open_{lang}.png',full_page=True)
        # Fahrer: Startseite und Vorgang in allen Breiten
        for wd,h in WIDTHS:
            fctx,f,ferr=page(f'rf.fahrer.{lang}',wd,h)
            f.goto(B+'/#/'); f.reload(); f.wait_for_selector('#qhome',timeout=15000)
            check(L[lang]['drv'] in f.inner_text('#qhome') and f.locator('#qhome a.row').count()==1,f'{lang} {wd}px: Fahrer-Startseite zeigt die Rückfrage')
            check(noscroll(f),f'{lang} {wd}px: Startseite ohne Querscrollen')
            if SHOTS: f.screenshot(path=f'{SHOTS}/rf_fahrer_home_{lang}_{wd}.png',full_page=True)
            f.goto(B+'/#/cases/'+cid); f.wait_for_selector('[data-qbanner="open"]',timeout=15000)
            check(noscroll(f),f'{lang} {wd}px: Vorgang ohne Querscrollen')
            check(not ferr,f'{lang} {wd}px: Fahrer ohne Skriptfehler {ferr}'); fctx.close()
        d.goto(B+'/#/cases/'+cid); d.reload(); d.wait_for_selector('#cf #ct',timeout=15000)
        d.fill('#ct','Rechts, Foto kommt gleich'); d.click('#cf button'); d.wait_for_timeout(1200)
        d.goto(B+'/#/'); d.reload(); d.wait_for_timeout(1200)
        check(d.locator('#qhome').count()==0,f'{lang}: nach der Antwort keine offene Rückfrage mehr auf der Startseite')
        check(not derr,f'{lang}: Fahrer ohne Skriptfehler {derr}'); dctx.close(); lctx.close()
        # Leitung: Vorgang, Liste, Heute zu tun
        for wd,h in WIDTHS:
            mctx,m,merr=page(f'rf.leitung.{lang}',wd,h)
            m.goto(B+'/#/cases/'+cid); m.reload(); m.wait_for_selector('[data-qbanner="answered"]',timeout=15000)
            check(L[lang]['ans'] in m.inner_text('[data-qbanner]'),f'{lang} {wd}px: Vorgang „{L[lang]["ans"]}“')
            m.goto(B+'/#/cases?f=q_answered'); m.wait_for_timeout(1200)
            rows=m.locator('.list a.row')
            check(rows.count()==i+1 and m.locator('[data-qchip="answered"]').count()==i+1 and rows.filter(has_text=f'RF-AB {i+1}').count()==1,f'{lang} {wd}px: Liste „beantwortet“ mit Kennzeichnung ({rows.count()})')
            check(noscroll(m),f'{lang} {wd}px: Liste ohne Querscrollen')
            if SHOTS: m.screenshot(path=f'{SHOTS}/rf_leitung_liste_{lang}_{wd}.png',full_page=True)
            m.goto(B+'/#/'); m.wait_for_timeout(1500)
            check(L[lang]['todo'] in m.inner_text('body'),f'{lang} {wd}px: „Heute zu tun“ nennt die Antwort')
            check(noscroll(m),f'{lang} {wd}px: Startseite ohne Querscrollen')
            check(not merr,f'{lang} {wd}px: Leitung ohne Skriptfehler {merr}'); mctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
