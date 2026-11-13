# [CLAUDE] UI-Test (13.11.2026, Backlog 1425, Blickwinkel „Werkstatt plant die Woche nach Teile-Lieferterminen“): Werkstatttermin vor
# dem Teile-Liefertermin – Hinweis schon bei der Eingabe (Werkstattplan, Vorgang „Termin setzen“, „Liefertermin ändern“) und Chip in der
# Vorgangsansicht. DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh).
# Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CHIP={'de':'Termin vor Liefertermin der Teile','uk':'Термін раніше дати поставки запчастин','en':'Date before parts delivery date'}
LATER={'de':'erst am','uk':'лише','en':'only expected on'}
AFTER={'de':'liegt vor diesem Liefertermin','uk':'раніше цієї дати поставки','en':'before this delivery date'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'pl.inhaber','display_name':'PL Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'pl.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    env=api('GET','/api/me')['d']['user']['environment']; pid=os.getpid()
    wu=api('POST','/api/users',{'username':f'pl.ws{pid}','display_name':'PL Werkstatt','role':'workshop','environment':env,'workshop_site':'DORTMUND'})
    wctx=br.new_context(); wp=wctx.new_page(); wp.goto(B); wp.evaluate(JS,['POST','/api/invite/accept',{'token':wu['d']['invite_token'],'password':PW}])
    today=datetime.datetime.now(datetime.timezone.utc).date(); iso=lambda n:(today+datetime.timedelta(days=n)).isoformat()
    def mk(n):
        vin=f'WDB9634031L{pid%10000:04d}{n:02d}'[:17].ljust(17,'0'); vid='VIN:'+vin
        check(api('POST','/api/vehicles',{'vin':vin,'plate':f'PL-TE {n}','site':'Dortmund'})['s']==201,f'Fahrzeug {n}')
        return api('POST','/api/cases',{'vehicle_id':vid,'description':f'Bremssattel fest (Test {n})','priority':'niedrig','driveability':'fahrbereit','workshop_site':'DORTMUND','request_key':str(uuid.uuid4())})['d']['id']
    def cmd(cid,cl,action,payload=None,note=None):
        v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        r=cl(JS,['POST',f'/api/cases/{cid}/commands',{'action':action,'command_id':str(uuid.uuid4()),'expected_version':v,'payload':payload or {},**({'note':note} if note else {})}])
        check(r['s']==200,f'{action} {r["s"]} {str(r["d"])[:100] if r["s"]!=200 else ""}')
    # Auftrag A: Termin morgen, wartet auf Teile bis +6 → Chip in der Vorgangsansicht; Auftrag B: wartet auf Teile bis +6, ohne Termin → Plan-Eingabe
    A=mk(1); B2=mk(2)
    for cid in (A,B2):
        cmd(cid,a.evaluate,'approve_repair',{'workshop_site':'DORTMUND'},'frei'); cmd(cid,wp.evaluate,'acknowledge'); cmd(cid,wp.evaluate,'start_repair')
        cmd(cid,wp.evaluate,'wait_parts',{'parts_expected_date':iso(6)},'Bremssattel bestellt')
    cmd(A,wp.evaluate,'set_planned_date',{'planned_date':iso(1)})
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'pl.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        # Werkstattplan: Datum vor dem Liefertermin eintippen → Hinweis; am Liefertag → weg
        q.goto(B+'/#/plan'); q.reload(); q.wait_for_selector(f'#pd-{B2}',timeout=15000)
        q.fill(f'#pd-{B2}',iso(2)); hint=q.locator(f'#pd-{B2} ~ p[data-etaplan]')
        check(hint.is_visible() and LATER[lang] in hint.inner_text(),f'{lang} {wd}px: Plan – Hinweis bei Termin vor Liefertermin')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: Plan ohne Querscrollen')
        if SHOTS: hint.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/plan-liefertermin-{lang}-{wd}.png')
        q.fill(f'#pd-{B2}',iso(6)); check(not hint.is_visible(),f'{lang} {wd}px: Plan – am Liefertag kein Hinweis')
        chipA=q.locator(f'a.row[href="#/cases/{A}"] [data-planeta]')
        check(chipA.count()==1 and CHIP[lang] in chipA.inner_text(),f'{lang} {wd}px: Plan – Chip am kommenden Termin')
        # Vorgangsansicht: Chip neben dem Termin; „Liefertermin ändern“ nach dem Termin → Hinweis
        q.goto(B+'/#/cases/'+A); q.wait_for_selector('button[data-act="set_parts_eta"]',timeout=20000)
        dd=q.locator('[data-planeta]'); check(dd.count()==1 and CHIP[lang] in dd.inner_text(),f'{lang} {wd}px: Vorgang – Chip')
        q.locator('button[data-act="set_parts_eta"]').first.click(); q.wait_for_selector('#af input[name="parts_expected_date"]',timeout=10000)
        eh=q.locator('#af p[data-etaplan]'); check(eh.is_visible() and AFTER[lang] in eh.inner_text(),f'{lang} {wd}px: Liefertermin ändern – Hinweis')
        if SHOTS: eh.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/vorgang-liefertermin-{lang}-{wd}.png')
        q.fill('#af input[name="parts_expected_date"]',iso(1)); check(not eh.is_visible(),f'{lang} {wd}px: Liefertermin am Termin – kein Hinweis')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: Vorgang ohne Querscrollen')
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print(f"\n{'FEHLER: '+str(len(fails)) if fails else 'alles grün'}")
if fails: raise SystemExit(1)
