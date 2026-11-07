# [CLAUDE] UI-Prüfung (07.11.2026, Backlog 195/1110, Blickwinkel „Fahrer liest am Handy sein Bußgeld“): Fahrer am Handy (390 px, Touch,
# DE/UK/EN; Startseite zusätzlich Tablet 820/PC 1366) mit langen Behördennamen, Tatorten und Aktenzeichen. Startseite zeigt den Hinweis „Behördenschreiben: bitte lesen“ mit Kennzeichen,
# Nummer und Antwortfrist (vorher nur Glocke/Push und „Mehr“), `#/fines` und `#/fines/<id>` ohne Querscrollen/Abschneiden, keine leere
# Überschrift „Fotos & Dokumente“, keine interne Notiz der Leitung; nach „Zur Kenntnis genommen“ verschwindet der Hinweis. Dev-Server: CFP_URL. Bilder: CFP_SHOTS=<Ordner>.
import os, uuid, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
OVF = r"""() => { const W = document.documentElement.clientWidth; const out = [];
  for (const e of document.querySelectorAll('main *')) { const r = e.getBoundingClientRect(); if (!r.width) continue;
    if (r.right > W + 1) out.push((e.className || e.tagName) + ' rechts ' + Math.round(r.right));
    if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'visible') out.push('abgeschnitten ' + (e.className || e.tagName)); }
  return [...new Set(out)].slice(0, 8); }"""
TITLE={'de':'Behördenschreiben: bitte lesen','uk':'Листи від органів влади: прочитайте, будь ласка','en':'Authority letters: please read'}
FILES={'de':'Fotos & Dokumente','uk':'Фото та документи','en':'Photos & documents'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fh.inhaber','display_name':'FH Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    owner='fh.inhaber'
    if api('POST','/api/login',{'username':owner,'password':PW})['s']!=200:
        for un in ['bf.inhaber','zs.inhaber','vc.inhaber','bd.inhaber','kd.inhaber','wt.inhaber','tr.inhaber','as.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: owner=un; break
    me=api('GET','/api/me')['d']; check(bool(me),'Anmeldung Inhaber'); envn=(me.get('user') or me).get('environment') or 'production'
    R=os.getpid()%100000; PL=f'FH-BG {R%900+100}'; DUN=f'fh.fahrer{R}'
    api('POST','/api/vehicles',{'plate':PL,'vin':f'WDB9634FH{R:05d}110'[:17],'kind':'lkw'})
    du=api('POST','/api/users',{'username':DUN,'display_name':f'FH Fahrer {R}','role':'driver','environment':envn}); check(du['s']==201,f'Fahrerkonto ({du["s"]})'); DUID=du['d']['id']
    AUTH='Landratsamt Musterkreis – Zentrale Bußgeldstelle für Verkehrsordnungswidrigkeiten, Sachgebiet Schwerverkehr und Gefahrgut'
    REF=f'Az.: 714.2026.{R}.0/BG-SCHWERVERKEHR-ABCDEFGHIJKLMNOP'; NOTE=f'Interne Notiz Leitung {R}'
    off=(datetime.datetime.now(datetime.timezone.utc)-datetime.timedelta(days=5)).strftime('%Y-%m-%dT%H:%M:%SZ')
    fi=api('POST','/api/fines',{'kind':'anhoerung','authority':AUTH,'reference':REF,'offense_type':'geschwindigkeit','offense_at':off,'plate_in_letter':PL,
      'location':'BAB 3 Richtungsfahrbahn Frankfurt, Höhe Anschlussstelle Würzburg-Kist, km 312,450 Baustellenbereich','response_due':(datetime.date.today()+datetime.timedelta(days=6)).isoformat(),
      'amount_eur':'128,50','driving_ban_months':1,'note':NOTE,'request_key':str(uuid.uuid4())})
    check(fi['s']==201,f'Anhörung erfasst ({fi["s"]})'); FID=fi['d']['id']; FNO=fi['d'].get('fine_no','')
    ver=lambda: api('GET',f'/api/fines/{FID}')['d']['fine']['version']
    check(api('POST',f'/api/fines/{FID}/commands',{'action':'confirm_driver','expected_version':ver(),'payload':{'driver_id':DUID,'basis':'manuell','evidence':'Tourenplan (Test)'}})['s']==200,'Fahrer ermittelt')
    check(api('POST',f'/api/fines/{FID}/commands',{'action':'inform_driver','expected_version':ver()})['s']==200,'Fahrer informiert')
    check(a.evaluate(JS,['POST','/api/invite/accept',{'token':du['d']['invite_token'],'password':PW}])['s'] in (200,201),'Fahrerkonto aktiviert')
    def phone(lang,w=390):
        ctx=br.new_context(viewport={'width':w,'height':844},has_touch=(w<1300),is_mobile=(w<500)); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':DUN,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/'); q.reload(); return ctx,q,errs
    for lang in ['de','uk','en']:
        ctx,q,errs=phone(lang)
        q.wait_for_selector('#fhome',timeout=15000); h=q.inner_text('#fhome')
        check(TITLE[lang] in h and PL in h and FNO in h and q.locator('#fhome [data-fhome]').count()==1,f'{lang}: Startseite zeigt das offene Schreiben ({h[:80]!r})')
        check(q.evaluate(OVF)==[] and q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang}: Startseite ohne Überstand')
        if SHOTS: q.screenshot(path=f'{SHOTS}/fh_home_{lang}.png',full_page=True)
        q.locator('#fhome [data-fhome]').click(); q.wait_for_selector('#fdprt',timeout=15000); q.wait_for_timeout(300)
        check(f'#/fines/{FID}' in q.url,f'{lang}: Tippen öffnet das Schreiben')
        txt=q.inner_text('main')
        check('714.2026.' in txt and 'Würzburg-Kist' in txt and 'Gefahrgut' in txt,f'{lang}: Aktenzeichen, Tatort, Behörde vollständig')
        check(NOTE not in txt,f'{lang}: interne Notiz nicht sichtbar')
        check(FILES[lang] not in txt,f'{lang}: keine leere Überschrift „Fotos & Dokumente“')
        check(q.evaluate(OVF)==[] and q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang}: Schreiben ohne Querscrollen/Abschneiden')
        if SHOTS: q.screenshot(path=f'{SHOTS}/fh_detail_{lang}.png',full_page=True)
        q.goto(B+'/#/fines'); q.wait_for_selector('main .list a.row',timeout=15000)
        check(q.evaluate(OVF)==[] and q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang}: Liste ohne Querscrollen/Abschneiden')
        check(not errs,f'{lang}: keine Skriptfehler {errs[:1]}'); ctx.close()
    for w in [820,1366]:
        ctx,q,errs=phone('de',w); q.wait_for_selector('#fhome',timeout=15000)
        check(q.evaluate(OVF)==[] and q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1') and not errs,f'de {w}px: Hinweis auf der Startseite ohne Überstand/Fehler')
        if SHOTS: q.screenshot(path=f'{SHOTS}/fh_home_de_{w}.png',full_page=True)
        ctx.close()
    ctx,q,errs=phone('uk')
    q.goto(B+'/#/fines/'+FID); q.wait_for_selector('#ack',timeout=15000); q.locator('#ack').click(); q.wait_for_selector('#ack',state='detached',timeout=15000)
    q.goto(B+'/#/'); q.reload(); q.wait_for_selector('main h1',timeout=15000); q.wait_for_timeout(1200)
    check(q.locator('#fhome').count()==0,'uk: nach „Ознайомлений“ kein Hinweis mehr auf der Startseite')
    check(not errs,f'Quittung: keine Skriptfehler {errs[:1]}'); ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
