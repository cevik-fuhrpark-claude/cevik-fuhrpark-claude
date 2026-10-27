# [CLAUDE] UI-Test (27.10.2026, Backlog 433, Blickwinkel „Fahrer im Ausland, Handy in Ortszeit – deutsche Zeit oder Ortszeit?“):
# Gerät in Zeitzone Europe/Istanbul → „Panne & Notfall“ zeigt den Hinweis „deutsche Zeit“ mit beiden Uhrzeiten und bei „wieder ab …“
# zusätzlich die Uhrzeit auf diesem Gerät; Gerät in Europe/Berlin bzw. Europe/Warsaw (gleiche Zeit) → kein Hinweis, keine zweite Uhrzeit.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (scripts/dev-server.mjs). Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime, zoneinfo
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
NOTE={'de':('deutscher Zeit','auf diesem Gerät'),'uk':('німецьким часом','на цьому пристрої'),'en':('German time','on this device')}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
noscroll='()=>document.documentElement.scrollWidth<=innerWidth+1'
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'tz.inhaber','display_name':'TZ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'tz.inhaber','password':PW})['s']!=200:
        ok=False
        for un in ['nw.inhaber','nb.inhaber','ab.inhaber','ws.inhaber','ft.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: ok=True; break
        check(ok,'Anmeldung Inhaber')
    R=os.getpid()%100000
    # Zeitspanne sicher „jetzt nicht besetzt“: täglich ab jetzt + 6 h für 30 Minuten (deutsche Zeit)
    nb=datetime.datetime.now(zoneinfo.ZoneInfo('Europe/Berlin'))+datetime.timedelta(hours=6)
    f=nb.strftime('%H:%M'); t=(nb+datetime.timedelta(minutes=30)).strftime('%H:%M')
    r=api('POST','/api/emergency/contacts',{'kind':'dispo','label':f'TZ-Dispo {R}','phone':f'0231 {R} 8','scope':'all','hours_days':'1234567','hours_from':f,'hours_to':t})
    check(r['s']==201,f'Rufnummer mit Zeiten angelegt {r["s"]} {r["d"]}'); cid=r['d']['id']
    for tz,abroad in [('Europe/Istanbul',True),('Europe/Berlin',False),('Europe/Warsaw',False)]:
      for lang in ['de','uk','en']:
        for w,h in ([(390,844),(820,1180),(1366,900)] if abroad else [(390,844)]):
          ctx=br.new_context(viewport={'width':w,'height':h},timezone_id=tz); m=ctx.new_page(); errs=[]; m.on('pageerror',lambda e: errs.append(str(e)))
          m.goto(B); m.context.add_cookies(a.context.cookies()); m.evaluate(JS,['PATCH','/api/me',{'language':lang}])
          m.goto(B+'/#/emergency'); m.reload(); m.wait_for_selector('.emrow .emhours',timeout=15000)
          info=m.evaluate(f'''() => {{ const r = [...document.querySelectorAll('.emrow')].find((x) => x.textContent.includes('TZ-Dispo {R}')); const n = document.querySelector('[data-emtz]');
            return {{ note: n ? n.textContent : null, closed: r ? r.classList.contains('emclosed') : null, next: r && r.querySelector('[data-emnext]') ? r.querySelector('[data-emnext]').textContent : null, local: r && r.querySelector('[data-emnextlocal]') ? r.querySelector('[data-emnextlocal]').getAttribute('data-emnextlocal') : null }}; }}''')
          check(info['closed'] is True and info['next'],f'{tz} {lang} {w}px: Nummer „jetzt nicht besetzt“ mit „wieder ab“ {info}')
          if abroad:
            loc=(nb.astimezone(zoneinfo.ZoneInfo(tz))).strftime('%H:%M'); now_b=datetime.datetime.now(zoneinfo.ZoneInfo('Europe/Berlin'))
            check(info['note'] and NOTE[lang][0] in info['note'] and NOTE[lang][1] in info['note'],f'{tz} {lang} {w}px: Hinweis deutsche Zeit {info["note"]}')
            check(info['note'] and (now_b.strftime('%H:%M') in info['note'] or (now_b-datetime.timedelta(minutes=1)).strftime('%H:%M') in info['note']),f'{tz} {lang} {w}px: Hinweis nennt deutsche Uhrzeit')
            check(info['local'] and info['local'].endswith(loc) and loc in info['next'] and NOTE[lang][1] in info['next'],f'{tz} {lang} {w}px: „wieder ab“ mit Gerätezeit {loc} {info["next"]}')
          else:
            check(info['note'] is None and info['local'] is None and NOTE[lang][1] not in (info['next'] or ''),f'{tz} {lang} {w}px: kein Zeitzonen-Hinweis')
          check(m.evaluate(noscroll),f'{tz} {lang} {w}px: ohne Querscrollen')
          if SHOTS and abroad: m.screenshot(path=f'{SHOTS}/notfall_zeitzone_{lang}_{w}.png')
          check(not errs,f'{tz} {lang} {w}px: ohne Skriptfehler {errs[:1]}')
          ctx.close()
    api('POST',f'/api/emergency/contacts/{cid}/archive',{})
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
