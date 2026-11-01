# [CLAUDE] UI-Test (01.11.2026, Backlog 821, Blickwinkel „Inhaber mit Handy und PC – Einstellungen auf zwei Geräten“): Der Inhaber hat die
# Einstellungen am PC offen, ändert inzwischen am Handy die Kostengrenze. Am PC trägt er eine andere Grenze und eine Warnfrist ein und speichert →
# Konflikt: Einstellungen neu geladen, Hinweis „Eingaben stehen noch im Formular“ mit Warnung (gleiches Feld), eigene Eingaben stehen im Formular,
# Feld des anderen Geräts markiert; nichts still überschrieben; zweites Speichern übernimmt die Eingaben. DE/UK/EN bei 390/820/1366 px,
# kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
KEPT={'de':'anderen Gerät oder in einem anderen Fenster geändert','uk':'на іншому пристрої або в іншому вікні','en':'on another device or in another window'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'eg.inhaber','display_name':'EG Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'eg.inhaber','password':PW})['s']==200,'Anmeldung Inhaber (Handy)')
    n=0
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; mine_lim=str(1000+n*10); other_lim=str(3000+n*10); mine_days=str(10+n)
        check(api('PUT','/api/settings',{'repair_cost_limit_net':'1500','maintenance_warn_days':'30'})['s']==200,f'{lang} {w}px: Ausgangsstand')
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'eg.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/settings'); q.reload(); q.wait_for_selector('#sf #repair_cost_limit_net',timeout=15000)
        check(api('PUT','/api/settings',{'repair_cost_limit_net':other_lim})['s']==200,f'{lang} {w}px: Handy ändert die Kostengrenze auf {other_lim}')
        q.fill('#repair_cost_limit_net',mine_lim); q.fill('#maintenance_warn_days',mine_days); q.locator('#sf button:not([type=button])').first.click()
        hint=''
        try: q.wait_for_selector('#sf [data-ctlost]',timeout=10000); hint=q.inner_text('#sf [data-ctlost]')
        except Exception as ex: print('   ',ex)
        check(KEPT[lang] in hint and '⚠' in hint,f'{lang} {w}px: Hinweis nennt das andere Gerät/Fenster, mit Warnung gleiches Feld (Backlog 822) ({hint[:60]!r})')
        check(q.input_value('#repair_cost_limit_net')==mine_lim and q.input_value('#maintenance_warn_days')==mine_days and q.evaluate("document.querySelector('#repair_cost_limit_net').classList.contains('ct-other')"),f'{lang} {w}px: eigene Eingaben bleiben, Kostengrenze markiert')
        v=api('GET','/api/settings')['d']['values']
        check(v.get('repair_cost_limit_net')==other_lim and v.get('maintenance_warn_days')=='30',f'{lang} {w}px: nichts still überschrieben ({v.get("repair_cost_limit_net")}/{v.get("maintenance_warn_days")})')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        if SHOTS: q.locator('#sf [data-ctlost]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/einst_gleichzeitig_{lang}_{w}.png')
        q.evaluate("()=>document.querySelectorAll('.toast').forEach(x=>x.remove())")
        q.locator('#sf button:not([type=button])').first.click(); q.wait_for_timeout(1500)
        v=api('GET','/api/settings')['d']['values']
        check(v.get('repair_cost_limit_net')==mine_lim and v.get('maintenance_warn_days')==mine_days,f'{lang} {w}px: zweites Speichern übernimmt die Eingaben ({v.get("repair_cost_limit_net")}/{v.get("maintenance_warn_days")})')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print(f"{'FEHLER' if fails else 'OK'}: {len(fails)} Fehler")
raise SystemExit(1 if fails else 0)
