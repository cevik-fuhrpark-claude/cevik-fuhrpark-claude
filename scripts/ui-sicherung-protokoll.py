# [CLAUDE] UI-Test: Protokolleintrag „Datensicherung“ nennt die gesicherten Bereiche als Bezeichnung (DE/UK/EN) statt Tabellennamen
# (z. B. „Werkstätten 0, Fahrzeuge 1 …“ statt „workshops 0, vehicles 1“). 390/820/1366 px ohne Querscrollen/Skriptfehler.
# Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os, re
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EXP={'de':['Anzahlen: Werkstätten','Fahrzeuge 1','Protokoll','Schema-Versionen'],'uk':['Кількості: Майстерні','Транспортні засоби 1','Версії схеми'],'en':['Counts: Workshops','Vehicles 1','Schema versions']}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'sb.inhaber','display_name':'SB Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'sb.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    api('POST','/api/vehicles',{'vin':'WDB96340310777101','plate':'SB-SI 1','site':'Dortmund'})
    check(api('GET','/api/admin/backup')['s']==200,'Datensicherung heruntergeladen')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h}); q=c.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'sb.inhaber','password':PW}])
        q.goto(B+'/#/audit'); q.wait_for_selector('.list .row')
        row=q.locator('.list .row', has_text='backup.export').first
        txt=row.inner_text()
        for e in EXP[lang]: check(e in txt,f'{lang} {w}px: „{e}“')
        check(not re.search(r'\b[a-z]*_[a-z]+\b', txt.replace('backup.export','')),f'{lang} {w}px: keine Tabellennamen ({txt[:120]!r})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        if SHOTS: row.screenshot(path=f'{SHOTS}/sicherung_protokoll_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        c.close()
    br.close()
print(f"\n{'OK' if not fails else str(len(fails))+' Fehler'}")
raise SystemExit(1 if fails else 0)
