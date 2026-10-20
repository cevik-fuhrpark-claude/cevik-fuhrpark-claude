# [CLAUDE] UI-Test (20.10.2026): Einstellungen – Reaktionsfrist „kritisch“ zeigt „sofort“ statt Eingabefeld (Agent meldet sofort);
# Benutzerliste nach Deaktivieren/Aktivieren; Hilfe „Benutzer, Zugänge & Protokoll“ ohne „Aktivieren macht es rückgängig“.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
IMM={'de':'sofort','uk':'одразу','en':'immediately'}
OLD={'de':'„Aktivieren“ macht es rückgängig','uk':'«Активувати» скасовує це','en':'“Activate” reverses it'}
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'rf.inhaber','display_name':'RF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    r=api('POST','/api/login',{'username':'rf.inhaber','password':PW}); check(r['s']==200,f'Anmeldung ({r["s"]})')
    u=api('POST','/api/users',{'username':'rf.fahrer','display_name':'RF Fahrer','role':'driver','environment':'production'}); check(u['s'] in (201,409),f'Fahrer ({u["s"]})')
    if u['s']==201:
        api('PATCH',f'/api/users/{u["d"]["id"]}',{'active':False}); api('PATCH',f'/api/users/{u["d"]["id"]}',{'active':True})
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'rf.inhaber','password':PW}])
        q.goto(B+'/#/settings'); q.wait_for_selector('#sf', timeout=15000)
        check(q.query_selector('#sf input[name=sla_production_ack_kritisch_min]') is None,f'{lang} {w}px: kein Eingabefeld „kritisch“')
        check(q.query_selector('#sf input[name=sla_production_ack_mittel_min]') is not None,f'{lang} {w}px: Feld „mittel“ vorhanden')
        check(IMM[lang] in q.inner_text('#sf'),f'{lang} {w}px: „{IMM[lang]}“ angezeigt')
        sw=q.evaluate('()=>document.documentElement.scrollWidth'); check(sw<=w+1,f'{lang} {w}px: Einstellungen ohne Querscrollen ({sw})')
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/rf-einstellungen-{lang}.png', full_page=True)
        q.goto(B+'/#/users')
        try: q.wait_for_selector('td:has-text("RF Fahrer")', timeout=15000); ok_u=True
        except Exception: ok_u=False
        check(ok_u,f'{lang} {w}px: Benutzerliste zeigt Konto')
        sw=q.evaluate('()=>document.documentElement.scrollWidth'); check(sw<=w+1,f'{lang} {w}px: Benutzer ohne Querscrollen ({sw})')
        q.goto(B+'/#/help'); q.wait_for_selector('main', timeout=15000)
        check(OLD[lang] not in q.inner_text('body'),f'{lang} {w}px: Hilfe ohne „rückgängig“')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print(f'{"FEHLER" if fails else "OK"}: {len(fails)} Abweichungen')
raise SystemExit(1 if fails else 0)
