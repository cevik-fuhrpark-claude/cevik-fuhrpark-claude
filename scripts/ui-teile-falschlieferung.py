# [CLAUDE] UI-Test Vorgang „wartet auf Teile“ (26.10.2026, Backlog 378, Blickwinkel „Werkstatt bekommt Teile falsch geliefert“):
# Vorgang zeigt „Wartet auf …“, „Liefertermin 2× verschoben“ mit ursprünglichem Termin und den letzten Vermerk zur Terminänderung;
# Formular „Liefertermin ändern“ nennt den Grund als Hinweis. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
WAIT={'de':'Wartet auf','uk':'Очікуємо','en':'Waiting for'}
MOVED={'de':'2× verschoben','uk':'перенесено 2 рази','en':'postponed 2 times'}
HINT={'de':'falsch geliefert','uk':'доставлено не те','en':'wrong part delivered'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'tf.inhaber','display_name':'TF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'tf.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    site=api('GET','/api/meta')['d']['workshops'][0]['code']
    vid='VIN:WDB96340310737801'; api('POST','/api/vehicles',{'plate':'TF-TL 378','vin':'WDB96340310737801','site':'Dortmund'})
    n=[0]
    def cmd(cid,action,payload=None,note=None):
        n[0]+=1; v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        b={'action':action,'command_id':f'tf-{os.getpid()}-{n[0]}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return api('POST',f'/api/cases/{cid}/commands',b)
    d=lambda k: (datetime.date.today()+datetime.timedelta(days=k)).isoformat()
    r=api('POST','/api/cases',{'vehicle_id':vid,'description':'Rückleuchte links gebrochen','priority':'niedrig','driveability':'fahrbereit','workshop_site':site,'request_key':f'tf-{os.getpid()}'})
    check(r['s']==201,f'Meldung ({r["s"]})'); CID=r['d']['id']
    check(cmd(CID,'approve_repair',{'workshop_site':site},'Leuchte tauschen')['s']==200,'Reparatur freigegeben')
    check(cmd(CID,'start_repair')['s']==200,'in Reparatur')
    check(cmd(CID,'wait_parts',{'parts_expected_date':d(2)},'Rückleuchte links, Hella 2VP')['s']==200,'wartet auf Teile')
    check(cmd(CID,'set_parts_eta',{'parts_expected_date':d(5)},'Falsch geliefert (rechts statt links), Nachlieferung bestellt')['s']==200,'1. Verschiebung')
    check(cmd(CID,'set_parts_eta',{'parts_expected_date':d(8)},'Erneut falsch, Lieferant schickt direkt')['s']==200,'2. Verschiebung')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'tf.inhaber','password':PW}])
        q.goto(B+'/#/cases/'+CID); q.wait_for_selector('#pwmoves', timeout=15000)
        dl=q.inner_text('#pwnote').strip(); mv=q.inner_text('#pwmoves').strip()
        check('Hella 2VP' in dl,f'{lang} {w}px: worauf gewartet wird ({dl!r})')
        check(WAIT[lang] in q.inner_text('body'),f'{lang} {w}px: Beschriftung „{WAIT[lang]}“')
        check(MOVED[lang] in mv and 'Erneut falsch' in mv,f'{lang} {w}px: Verschiebungen und letzter Vermerk ({mv!r})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/teile_falsch_{lang}_{w}.png',full_page=True)
        if w==390:
            btn=q.locator('button[data-act="set_parts_eta"]')
            if btn.count():
                btn.first.click(); q.wait_for_selector('textarea[name="note"]', timeout=10000)
                lab=q.locator('textarea[name="note"]').evaluate("t=>t.previousElementSibling ? t.previousElementSibling.innerText : ''")
                check(HINT[lang] in lab,f'{lang}: Hinweis zum Grund im Formular ({lab!r})')
                if SHOTS: q.screenshot(path=f'{SHOTS}/teile_falsch_form_{lang}.png',full_page=True)
            else: check(False,f'{lang}: Knopf „Liefertermin ändern“ gefunden')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('alles grün' if not fails else f'{len(fails)} Fehler'); raise SystemExit(1 if fails else 0)
