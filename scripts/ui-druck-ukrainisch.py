# [CLAUDE] UI-Test (22.10.2026, Backlog 151, Teilagent „Druckansichten UK/EN“): im Druck (A4, 718 px) – Management-Vorgangstabelle Spalte 2
# mind. 10em breit (vorher ≈ 87 px, Wortbruch „Пошкодже|но“), Fahrzeugakte HU/SP-Kasten mit Wertspalte ≥ 7,5em bei langen ukrainischen
# Beschriftungen (vorher 44 px), Werkstatt „EXTERN“ in der App-Sprache (Werkstattauslastung, Auswahllisten). DE/UK/EN.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh).
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
EXT={'de':'Externe Werkstatt','uk':'Зовнішня майстерня','en':'External workshop'}
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'du.inhaber','display_name':'DU Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'du.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    site=api('GET','/api/meta')['d']['workshops'][0]['code']
    VIN='WDB96340310776031'
    api('POST','/api/vehicles',{'plate':'DU-AB 1','vin':VIN,'site':'Dortmund'})
    api('POST',f'/api/vehicles/VIN:{VIN}/maintenance',{'kind':'HU','evidence':'Prüfbericht','interval_months':12,'last_done_date':'2026-01-10'})
    api('POST','/api/cases',{'vehicle_id':'VIN:'+VIN,'description':'Пошкоджено гальмівний трубопровід причепа','priority':'niedrig','driveability':'fahrbereit','workshop_site':site,'request_key':'du-1'})
    q=a
    for lang in ('de','uk','en'):
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.set_viewport_size({'width':718,'height':1000}); q.emulate_media(media='print')
        q.goto(B+'/#/master'); q.reload(); q.wait_for_selector('table.mtab',timeout=15000); q.wait_for_timeout(300)
        w=q.evaluate("()=>{const td=document.querySelector('table.mtab tbody tr td:nth-child(2)');return td?td.getBoundingClientRect().width:0}")
        fs=q.evaluate("()=>parseFloat(getComputedStyle(document.querySelector('table.mtab')).fontSize)")
        check(w>=10*fs-1,f'{lang}: Management-Spalte 2 im Druck {w:.0f} px ≥ 10em')
        q.goto(B+f'/#/vehicles/VIN:{VIN}'); q.wait_for_selector('.kv dd',timeout=15000); q.wait_for_timeout(300)
        mn=q.evaluate("()=>Math.min(...[...document.querySelectorAll('.kv')].filter(k=>k.offsetParent).map(k=>{const d=k.querySelector('dd');return d?d.getBoundingClientRect().width:999}))")
        fs2=q.evaluate("()=>parseFloat(getComputedStyle(document.querySelector('.kv dd')).fontSize)")
        check(mn>=7.5*fs2-1,f'{lang}: Fahrzeugakte Wertspalte im Druck {mn:.0f} px ≥ 7,5em')
        q.emulate_media(media='screen'); q.set_viewport_size({'width':1366,'height':900})
        q.goto(B+'/#/wsload'); q.wait_for_timeout(1200)
        txt=q.inner_text('main')
        check((EXT[lang] in txt) and (lang=='de' or 'Externe Werkstatt' not in txt),f'{lang}: Werkstattauslastung nennt „{EXT[lang]}“')
        q.goto(B+'/#/plan'); q.wait_for_timeout(1000)
        opts=q.evaluate("()=>[...document.querySelectorAll('main select option')].map(o=>o.textContent)")
        check(lang=='de' or 'Externe Werkstatt' not in opts,f'{lang}: Auswahllisten ohne deutschen Werkstattnamen')
    q.evaluate(JS,['PATCH','/api/me',{'language':'de'}])
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
