# [CLAUDE] UI-Test (23.10.2026, Backlog 183): Formularentwurf Abfahrtskontrolle/Meldung im Sitzungsspeicher.
# (1) Abfahrtskontrolle angefangen (Fahrzeug, Antworten, Mangel mit Notiz + Sicherheits-Haken, km) → Hilfe → Zurück: alles wieder da,
#     Hinweis „wiederhergestellt“; Sprachwechsel unter „Mehr“ → Kontrolle: Eingaben da, Hinweis in der neuen Sprache.
# (2) QR-Aufruf eines anderen Fahrzeugs übernimmt den Entwurf nicht; „Entwurf verwerfen“ leert das Formular.
# (3) Meldung angefangen (Fahrzeug, Beschreibung mit „Unfall“, Dringlichkeit) → „Mehr“ → zurück: wieder da (Unfallhinweis sichtbar);
#     nach dem Senden ist das Formular beim nächsten Aufruf leer.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (scripts/dev-server.mjs).
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
REST={'de':'wiederhergestellt','uk':'Відновлено','en':'restored'}
NEXT={'de':'uk','uk':'en','en':'de'}
VA='VIN:WMA15SZZ2HM722780'; VB='VIN:WMA15SZZ2HM722781'
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fe.inhaber','display_name':'FE Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'fe.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    csv='Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nFE-ZM 1;Dortmund;MAN;2016;WMA15SZZ2HM722780;Lkw\nFE-ZM 2;Dortmund;MAN;2017;WMA15SZZ2HM722781;Lkw'
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeuge importiert')
    keys=[i['key'] for i in api('GET','/api/meta')['d']['checklist']]
    n=0
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.on('dialog',lambda d: d.accept())
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'fe.inhaber','password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        # (1) Abfahrtskontrolle
        q.goto(B+'/#/check'); q.wait_for_selector('#f #v',timeout=15000)
        q.select_option('#v',VA)
        q.locator(f'input[name="{keys[0]}"][value="ok"]').check(force=True)
        q.locator(f'input[name="{keys[1]}"][value="mangel"]').check(force=True)
        q.fill(f'input[name="{keys[1]}__note"]','Entwurf Testnotiz')
        q.locator(f'input[name="{keys[1]}__safety"]').check(force=True)
        q.locator(f'input[name="{keys[2]}"][value="na"]').check(force=True)
        q.fill('#km','123456'); q.wait_for_timeout(150)
        hl=q.locator('a[href^="#/help"]')
        if hl.count(): hl.first.click(); q.wait_for_timeout(500); q.go_back()
        else: q.goto(B+'/#/more'); q.wait_for_timeout(400); q.goto(B+'/#/check')
        q.wait_for_selector('#f #v',timeout=15000); q.wait_for_timeout(300)
        def chk_state(tag, lg):
            st=q.evaluate("""(k) => ({ v: document.querySelector('#v').value, a: (document.querySelector(`input[name="${k[0]}"]:checked`)||{}).value,
              b: (document.querySelector(`input[name="${k[1]}"]:checked`)||{}).value, c: (document.querySelector(`input[name="${k[2]}"]:checked`)||{}).value,
              note: document.querySelector(`input[name="${k[1]}__note"]`).value, det: !document.querySelector(`.checkitem[data-key="${k[1]}"] .detail`).hidden,
              saf: document.querySelector(`input[name="${k[1]}__safety"]`).checked, km: document.querySelector('#km').value,
              open: [...document.querySelectorAll('.checkitem input[type=radio]:checked')].length,
              box: (document.querySelector('#fdraft')||{}).innerText||'' })""",keys)
            check(st['v']==VA and st['a']=='ok' and st['b']=='mangel' and st['c']=='na' and st['note']=='Entwurf Testnotiz' and st['det'] and st['saf'] and st['km']=='123456' and st['open']==3,f'{lang}/{w}: Kontrolle nach {tag} vollständig ({st})')
            check(REST[lg] in st['box'],f'{lang}/{w}: Hinweis „{REST[lg]}“ nach {tag}')
        chk_state('Hilfe → Zurück', lang)
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/fe_check_{lang}_{w}.png')
        # Sprachwechsel unter „Mehr“
        nl=NEXT[lang]
        q.goto(B+'/#/more'); q.wait_for_selector('#lang',timeout=15000); q.select_option('#lang',nl); q.wait_for_timeout(600)
        q.goto(B+'/#/check'); q.wait_for_selector('#f #v',timeout=15000); q.wait_for_timeout(300)
        chk_state('Sprachwechsel', nl)
        q.goto(B+'/#/more'); q.wait_for_selector('#lang',timeout=15000); q.select_option('#lang',lang); q.wait_for_timeout(600)
        # (2) QR eines anderen Fahrzeugs: kein Entwurf
        q.goto(B+'/#/check/'+VB); q.wait_for_selector('#f #v',timeout=15000); q.wait_for_timeout(300)
        st=q.evaluate("() => ({ v: document.querySelector('#v').value, n: document.querySelectorAll('.checkitem input[type=radio]:checked').length, box: !!document.querySelector('#fdraft') })")
        check(st['v']==VB and st['n']==0 and not st['box'],f'{lang}/{w}: QR anderes Fahrzeug ohne Entwurf ({st})')
        q.goto(B+'/#/check'); q.wait_for_selector('#fdraft',timeout=15000)
        q.click('#fdx'); q.wait_for_timeout(500); q.wait_for_selector('#f #v',timeout=15000)
        st=q.evaluate("() => ({ n: document.querySelectorAll('.checkitem input[type=radio]:checked').length, km: document.querySelector('#km').value, box: !!document.querySelector('#fdraft') })")
        check(st['n']==0 and st['km']=='' and not st['box'],f'{lang}/{w}: „Entwurf verwerfen“ leert ({st})')
        # (3) Meldung
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        q.locator(f'input[name=veh][value="{VB}"]').check(force=True)
        q.fill('#d',f'Unfall beim Rangieren {n}, Spiegel ab'); q.locator('input[name=prio][value="kritisch"]').check(force=True); q.fill('#l','Hof Dortmund')
        q.wait_for_timeout(150); q.goto(B+'/#/more'); q.wait_for_selector('#lang',timeout=15000); q.go_back()
        q.wait_for_selector('#f #d',timeout=15000); q.wait_for_timeout(300)
        st=q.evaluate("() => ({ v: (document.querySelector('input[name=veh]:checked')||{}).value, d: document.querySelector('#d').value, p: document.querySelector('input[name=prio]:checked').value, l: document.querySelector('#l').value, acc: !document.querySelector('#acc').hidden, box: !!document.querySelector('#fdraft') })")
        check(st['v']==VB and st['d'].startswith('Unfall beim Rangieren') and st['p']=='kritisch' and st['l']=='Hof Dortmund' and st['acc'] and st['box'],f'{lang}/{w}: Meldung wiederhergestellt ({st})')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Meldung ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/fe_new_{lang}_{w}.png')
        q.click('#sb')
        # kritisch: Ergebnisseite mit Anruf-Hinweis (Backlog 283), dann „Meldung öffnen“
        for _ in range(60):
            if '#/cases/' in q.url or q.query_selector('[data-sentcritical]'): break
            q.wait_for_timeout(250)
        if q.query_selector('[data-sentcritical]'):
            check(q.query_selector('[data-sentcritical] [data-callbox]') is not None,f'{lang}/{w}: Anruf-Hinweis nach kritischer Meldung')
            q.click('[data-sentcritical] a.btn[href^="#/cases/"]')
            for _ in range(40):
                if '#/cases/' in q.url: break
                q.wait_for_timeout(250)
        check('#/cases/' in q.url,f'{lang}/{w}: Meldung gesendet ({q.url})'); q.wait_for_timeout(300)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000); q.wait_for_timeout(300)
        st=q.evaluate("() => ({ d: document.querySelector('#d').value, box: !!document.querySelector('#fdraft') })")
        check(st['d']=='' and not st['box'],f'{lang}/{w}: nach dem Senden leer ({st})')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+'; '.join(fails) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
