# [CLAUDE] UI-Test „Teillieferung eingegangen“ (27.10.2026, Backlog 449, Blickwinkel „Lieferant liefert nur einen Teil der Bestellung“):
# Knopf im Status „wartet auf Teile“, Formular (Hinweis, „Worauf wird noch gewartet?“, Rest-Termin vorbelegt) per Oberfläche absenden;
# Vorgang zeigt „Wartet noch auf …“, „Teillieferungen: 1“ mit ursprünglichem Vermerk; Liste zeigt den neuen Vermerk.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
STILL={'de':'Wartet noch auf','uk':'Ще очікуємо','en':'Still waiting for'}
COUNT={'de':'Teillieferungen: 1','uk':'Часткових поставок: 1','en':'Partial deliveries: 1'}
BTN={'de':'Teillieferung eingegangen','uk':'Часткова поставка надійшла','en':'Partial delivery received'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'tl.inhaber','display_name':'TL Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'tl.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    site=api('GET','/api/meta')['d']['workshops'][0]['code']
    vid='VIN:WDB96340310744901'; api('POST','/api/vehicles',{'plate':'TF-TL 449','vin':'WDB96340310744901','site':'Dortmund'})
    n=[0]
    def cmd(cid,action,payload=None,note=None):
        n[0]+=1; v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        b={'action':action,'command_id':f'tl-{os.getpid()}-{n[0]}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return api('POST',f'/api/cases/{cid}/commands',b)
    d=lambda k: (datetime.date.today()+datetime.timedelta(days=k)).isoformat()
    r=api('POST','/api/cases',{'vehicle_id':vid,'description':'Bremsen vorne verschlissen','priority':'mittel','driveability':'fahrbereit','workshop_site':site,'request_key':f'tl-{os.getpid()}'})
    check(r['s']==201,f'Meldung ({r["s"]})'); CID=r['d']['id']
    check(cmd(CID,'approve_repair',{'workshop_site':site},'Bremsen vorne erneuern')['s']==200,'Reparatur freigegeben')
    check(cmd(CID,'start_repair')['s']==200,'in Reparatur')
    check(cmd(CID,'wait_parts',{'parts_expected_date':d(3)},'Bremsscheiben und Beläge, bestellt bei Teile Nord')['s']==200,'wartet auf Teile')
    # Teillieferung über die Oberfläche (DE, Handy)
    api('PATCH','/api/me',{'language':'de'})
    ctx=br.new_context(viewport={'width':390,'height':844}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
    q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'tl.inhaber','password':PW}])
    q.goto(B+'/#/cases/'+CID); q.wait_for_selector('#pwnote', timeout=15000)
    btn=q.locator('button[data-act="parts_partial"]')
    check(btn.count()==1,'Knopf „Teillieferung eingegangen“')
    if btn.count():
        check(BTN['de'] in btn.first.inner_text(),'Beschriftung Knopf')
        btn.first.click(); q.wait_for_selector('#pphint', timeout=10000)
        check(q.input_value('#ppeta')==d(3),'Rest-Termin mit bisherigem Termin vorbelegt')
        lab=q.locator('textarea[name="note"]').evaluate("t=>t.previousElementSibling ? t.previousElementSibling.innerText : ''")
        check('Worauf wird noch gewartet' in lab,f'Beschriftung Vermerk ({lab!r})')
        if SHOTS: q.screenshot(path=f'{SHOTS}/teillieferung_form_de.png',full_page=True)
        q.fill('#ppeta',d(6)); q.fill('textarea[name="note"]','Beläge hinten fehlen noch, Scheiben geliefert')
        q.locator('#af button.btn:not(.secondary)').first.click()
        q.wait_for_selector('#pwpartial', timeout=15000)
    check(not errs,f'Absenden: keine Skriptfehler {errs[:2]}')
    ctx.close()
    det=api('GET',f'/api/cases/{CID}')['d']
    check(det['case']['parts_expected_date']==d(6) and det['case']['status']=='wartet_teile','Server: Status bleibt, neuer Rest-Termin')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'tl.inhaber','password':PW}])
        q.goto(B+'/#/cases/'+CID); q.wait_for_selector('#pwpartial', timeout=15000)
        nt=q.inner_text('#pwnote'); pp=q.inner_text('#pwpartial'); body=q.inner_text('body')
        check('Beläge hinten fehlen noch' in nt,f'{lang} {w}px: aktueller Vermerk ({nt[:60]!r})')
        check(STILL[lang] in body,f'{lang} {w}px: „{STILL[lang]}“')
        check(COUNT[lang] in pp and 'Teile Nord' in pp,f'{lang} {w}px: Anzahl + ursprünglicher Vermerk ({pp[:90]!r})')
        check(q.locator('[data-ppev]').count()==1,f'{lang} {w}px: Verlauf nennt Rest-Termin')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/teillieferung_{lang}_{w}.png',full_page=True)
        q.goto(B+'/#/cases'); q.wait_for_selector('[data-pwnote]', timeout=15000)
        ln=' '.join(q.locator('[data-pwnote]').all_inner_texts())
        check('Beläge hinten fehlen noch' in ln and 'Teile Nord' not in ln,f'{lang} {w}px: Liste zeigt neuen Vermerk')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('alles grün' if not fails else f'{len(fails)} Fehler'); raise SystemExit(1 if fails else 0)
