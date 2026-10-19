# [CLAUDE] UI-Test (19.10.2026): Fahrzeugakte – Gültigkeit je Dokument (abgelaufen/läuft bald ab/abgelöst) als Chip, Unterzeile bricht um,
# Dateihinweis übersetzt; gleiche Datei mit anderen Angaben → Warnung + Formular „Dokumentangaben korrigieren“ mit den neuen Angaben offen.
# UK 390 px, EN 1440 px, DE 820 px; kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
UP = """async ([path, txt]) => { const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/pdf', 'x-cfp': '1', 'x-filename': 'dok.pdf' }, body: new TextEncoder().encode('%PDF-1.4\\n% ' + txt + '\\n%%EOF') });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CHIP={'de':('abgelaufen','läuft bald ab','abgelöst'),'uk':('прострочено','скоро спливає','замінено'),'en':('expired','expires soon','superseded')}
HINT={'de':'max. 5 MB','uk':'макс. 5 МБ','en':'max. 5 MB'}
VIN='WDB96340310888875'
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
today=datetime.date.today()
iso=lambda n:(today+datetime.timedelta(days=n)).isoformat()
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ds.inhaber','display_name':'DS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ds.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    vid=api('POST','/api/vehicles',{'plate':'DS-UI 1','vin':VIN,'site':'Dortmund'})['d']['id']
    up=lambda q,t: a.evaluate(UP,[f'/api/vehicles/{vid}/documents?{q}',t])
    up(f'kind=versicherung&valid_until={iso(-9)}','Vers alt'); up(f'kind=leasing&valid_until={iso(5)}','Leasing')
    up(f'kind=zulassung&valid_until={iso(-40)}','Zul alt'); up(f'kind=zulassung&valid_until={iso(400)}','Zul neu')
    up(f'kind=sonstiges&note=ADR-Bescheinigung%20Tank%20und%20Gefahrgut%20mit%20langer%20Bemerkung&valid_until={iso(-1)}','ADR')
    for lang,w,h in [('uk',390,844),('en',1440,900),('de',820,1180)]:
      api('PATCH','/api/me',{'language':lang})
      ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
      q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ds.inhaber','password':PW}])
      q.goto(B+f'/#/vehicles/{vid}')
      try: q.wait_for_selector('[data-docst]',timeout=15000)
      except Exception as ex: print('   ',ex)
      chips=q.eval_on_selector_all('[data-docst]','els => els.map(e => e.dataset.docst + ":" + e.textContent)')
      ex,soon,sup=CHIP[lang]
      check(sorted(chips)==sorted([f'abgelaufen:{ex}',f'abgelaufen:{ex}',f'laeuft_ab:{soon}',f'abgeloest:{sup}']),f'{lang}/{w}: Chips {chips}')
      check(HINT[lang] in (q.text_content('#docf') or '') if q.locator('#docf').count() else False,f'{lang}/{w}: Dateihinweis übersetzt')
      sub=q.evaluate("() => { const s = [...document.querySelectorAll('.row .sub')].find(x => x.textContent.includes('ADR')); return s ? getComputedStyle(s).whiteSpace + '|' + (s.scrollWidth <= s.clientWidth + 1) : '' }")
      check(sub.startswith('normal|true'),f'{lang}/{w}: Unterzeile bricht um ({sub})')
      # gleiche Datei mit anderen Angaben hochladen (Formular) → Warnung, Korrekturformular offen mit neuen Angaben
      import tempfile
      f=tempfile.NamedTemporaryFile(suffix='.pdf',delete=False); f.write(b'%PDF-1.4\n% Leasing\n%%EOF'); f.close()
      q.evaluate("() => { const d = document.querySelector('#docf').closest('details'); if (d) d.open = true; }")
      q.set_input_files('#docf [name=file]',f.name); q.select_option('#docf [name=kind]','leasing'); q.fill('#docf [name=valid_until]',iso(700)); q.fill('#docf [name=note]','Verlängerung')
      q.locator('#docf button').first.click()
      ok=True
      try: q.wait_for_function("(v) => { const d = document.querySelector('#docedit-d'); const e = document.querySelector('#docedit'); return d && d.open && e.valid_until.value === v }", arg=iso(700), timeout=10000)
      except Exception as e2: ok=False; print('   ',e2)
      check(ok and q.input_value('#docedit [name=valid_until]')==iso(700) and q.input_value('#docedit [name=note]')=='Verlängerung','%s/%d: Korrektur offen mit neuen Angaben'%(lang,w))
      toast=q.locator('.toast').last.inner_text() if q.locator('.toast').count() else ''
      check(len(toast)>30,f'{lang}/{w}: Warnung „nicht übernommen“ ({toast[:60]})')
      if SHOTS: q.screenshot(path=f'{SHOTS}/dok_status_{lang}_{w}.png',full_page=False)
      check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{lang}/{w}: kein Querscrollen')
      check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
      ctx.close()
    br.close()
print('alles grün' if not fails else 'FEHLER: '+'; '.join(fails))
raise SystemExit(1 if fails else 0)
