# [CLAUDE] UI-Test Start-Wächter (boot.js, 21.10.2026): Passen geladene Module nicht zusammen (Netzabbruch nach einem Deployment – neue
# app.js, alte i18n.js aus dem Offline-Cache), steht statt dauerhaft „Lädt…“ ein Hinweis mit „Neu laden“ in der Gerätesprache (DE/UK/EN);
# „Neu laden“ startet die App. Normaler Start: kein Hinweis. 390/820/1366 px.
# Backlog 588 (28.10.2026): langsame Verbindung (30 KB/s) → nach 15 s „Lädt noch“ statt Ladefehler, danach startet die App (DE 390 px). Dev-Server: CFP_URL (Standard Port 8787). Screenshots: CFP_SHOTS.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); SHOTS=os.environ.get('CFP_SHOTS')
fails=[]
TXT={'de':('Die App konnte nicht vollständig geladen werden.','Neu laden'),'uk':('Не вдалося повністю завантажити застосунок.','Перезавантажити'),'en':('The app could not be loaded completely.','Reload')}
LOC={'de':'de-DE','uk':'uk-UA','en':'en-GB'}
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch()
    for lang,w,h in [('uk',390,844),('de',820,1180),('en',1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h},locale=LOC[lang]); pg=c.new_page(); errs=[]
        pg.on('pageerror',lambda e: errs.append(str(e)))
        pg.goto(B); pg.wait_for_timeout(1200)
        check(pg.evaluate('window.__cfpBooted===true') and pg.locator('#bootfail').count()==0 and not errs, f'{lang} {w}: normaler Start ohne Hinweis {errs}')
        c.close()
        c=br.new_context(viewport={'width':w,'height':h},locale=LOC[lang],service_workers='block'); pg=c.new_page()
        pg.route('**/i18n.js',lambda r: r.fulfill(status=200,content_type='text/javascript',body='export const ALT=1;'))
        pg.goto(B)
        try: pg.wait_for_selector('#bootfail',timeout=5000); t=pg.inner_text('#bootfail')
        except Exception: t=''
        check(TXT[lang][0] in t and pg.get_by_role('button',name=TXT[lang][1]).count()==1, f'{lang} {w}: Hinweis bei gemischten Modulen ({t[:60]!r})')
        check(pg.evaluate('document.documentElement.scrollWidth<=window.innerWidth'), f'{lang} {w}: kein waagerechtes Scrollen')
        if SHOTS: pg.screenshot(path=f'{SHOTS}/startwaechter_{lang}_{w}.png')
        pg.unroute('**/i18n.js'); pg.get_by_role('button',name=TXT[lang][1]).click(); pg.wait_for_timeout(1500)
        check(pg.evaluate('window.__cfpBooted===true') and pg.locator('#bootfail').count()==0, f'{lang} {w}: „Neu laden“ startet die App')
        c.close()
    c=br.new_context(viewport={'width':390,'height':844},locale='de-DE',service_workers='block'); pg=c.new_page()
    cdp=c.new_cdp_session(pg); cdp.send('Network.enable'); cdp.send('Network.setCacheDisabled',{'cacheDisabled':True})
    cdp.send('Network.emulateNetworkConditions',{'offline':False,'latency':2000,'downloadThroughput':30000,'uploadThroughput':30000})
    pg.goto(B,wait_until='commit')
    try: pg.wait_for_function("()=>document.getElementById('bootslow')||document.getElementById('bootfail')||window.__cfpBooted",timeout=90000); t=pg.inner_text('#app')
    except Exception: t=''
    check('Lädt noch – langsame Verbindung' in t and pg.locator('#bootfail').count()==0, f'de 390: langsame Verbindung – „Lädt noch“ statt Ladefehler ({t[:60]!r})')
    if SHOTS: pg.screenshot(path=f'{SHOTS}/startwaechter_langsam_de_390.png')
    try: pg.wait_for_function('()=>window.__cfpBooted===true',timeout=120000,polling=500); ok=True
    except Exception as e: ok=False; print('    ', str(e)[:200], pg.inner_text('#app')[:80])
    check(ok and pg.locator('#bootfail').count()==0, 'de 390: langsame Verbindung – App startet danach')
    c.close()
    br.close()
print('Start-Wächter: '+('alles grün' if not fails else 'FEHLER: '+' | '.join(fails)))
raise SystemExit(1 if fails else 0)
