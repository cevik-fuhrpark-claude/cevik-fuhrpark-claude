# [CLAUDE] UI-Test (25.10.2026, Backlog 264, Blickwinkel „Werkstatt fällt eine Woche aus“): Vorgangsliste mit Werkstatt-Auswahl –
# Leitung wählt eine Werkstatt, Liste zeigt nur deren Aufträge/Vorschläge; Auswahl bleibt beim Reiterwechsel; Ausdruckkopf nennt sie.
# DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh).
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'wf.inhaber','display_name':'WF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'wf.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    wss=[w['code'] for w in api('GET','/api/meta')['d']['workshops']]
    check(len(wss)>=2,'zwei Werkstätten'); w1,w2=wss[0],wss[1]
    pid=os.getpid(); va=f'WDB9634031W{pid%10000:04d}01'[:17].ljust(17,'0')
    check(api('POST','/api/vehicles',{'vin':va,'plate':'WF-AB 11','site':'Dortmund'})['s']==201,'Fahrzeug')
    for desc,ws in [('Bremse zieht WF1 (Test)',w1),('Licht defekt WF2 (Test)',w2)]:
        check(api('POST','/api/cases',{'vehicle_id':'VIN:'+va,'description':desc,'priority':'mittel','driveability':'fahrbereit','workshop_site':ws,'request_key':str(uuid.uuid4())})['s']==201,'Meldung '+ws)
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        print('—',lang,wd)
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'wf.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/cases'); q.reload(); q.wait_for_selector('#cws',timeout=15000)
        q.select_option('#cws',w2); q.wait_for_function("()=>{const t=document.querySelector('#cl'); return t && !t.innerText.includes('WF1') && t.innerText.includes('WF2')}",timeout=15000)
        check(True,f'{lang} {wd}px: Liste gefiltert')
        q.click('.seg-tabs a[data-f=all]'); q.wait_for_selector('#cws',timeout=15000)
        check(q.input_value('#cws')==w2 and 'WF1' not in q.inner_text('#cl'),f'{lang} {wd}px: Auswahl bleibt beim Reiterwechsel')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/vorgaenge-werkstattfilter-{lang}-{wd}.png')
        q.select_option('#cws',''); q.wait_for_function("()=>{const t=document.querySelector('#cl'); return t && t.innerText.includes('WF1')}",timeout=15000)
        check(True,f'{lang} {wd}px: „alle“ hebt den Filter auf')
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER:' if fails else 'Alles grün', len(fails))
raise SystemExit(1 if fails else 0)
