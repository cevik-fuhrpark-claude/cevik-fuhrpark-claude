# [CLAUDE] UI-Prüfung (03.11.2026, Backlog 896, Blickwinkel „Fahrer mit polnischer/rumänischer Muttersprache lässt die App vom Browser übersetzen“):
# Die App bietet DE/UK/EN. Wer eine andere Sprache spricht, lässt Chrome/Safari die Seite übersetzen. Die Browser-Übersetzung ersetzt jeden
# Textknoten durch <font><font>Übersetzung</font></font> (Chrome) und übersetzt alles außer Elementen mit translate="no"/class="notranslate".
# Simuliert wird das mit einem Pseudo-Übersetzer (Init-Skript, MutationObserver wie Chrome; jeder übersetzte Text bekommt „ⓣ“ vorangestellt).
# Geprüft:
#  1. Kennzeichen (.plate), Vorgangsnummern (T-/S-JJJJ-NNNN) und FIN bleiben unübersetzt (eigener Textknoten mit translate="no") –
#     Inhaber/Leitung auf 15 Ansichten, Fahrer auf Start/Meldung/Vorgang, 390 und 1366 px.
#  2. Die App läuft mit „übersetztem“ DOM weiter: keine Skriptfehler beim Wechsel der Ansichten; Fahrzeugsuche im Meldeformular findet das
#     Fahrzeug über das Kennzeichen; der Fahrer sendet eine Meldung über das übersetzte Formular (Vorgang kommt beim Server an).
#  3. Hinweis zur Browser-Übersetzung unter der Sprachwahl (Anmeldung und Profil), DE/UK/EN.
#  4. Gegenprobe: Pseudo-Übersetzer ignoriert translate="no" → Prüfung 1 muss rot werden.
# Braucht den Dev-Server. Screenshots: CFP_SHOTS=<Ordner>.
import os, re, uuid, time
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
MT = r"""(() => {
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'NOSCRIPT', 'TITLE']);
  const prot = (el) => !window.__mtIgnoreNo && el.closest('[translate="no"], .notranslate');
  const run = () => { window.__mtT = null; if (!document.body) return; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const list = [];
    for (let n; (n = w.nextNode());) { const p = n.parentElement; if (!p || SKIP.has(p.tagName) || !n.data.trim() || n.data.startsWith('ⓣ') || p.closest('font[data-mt]') || prot(p)) continue; list.push(n); }
    for (const n of list) { if (n.parentElement.tagName === 'OPTION') { n.data = 'ⓣ' + n.data; continue; }
      const f1 = document.createElement('font'); f1.setAttribute('data-mt', ''); f1.style.verticalAlign = 'inherit'; const f2 = document.createElement('font'); f2.style.verticalAlign = 'inherit'; f2.textContent = 'ⓣ' + n.data; f1.appendChild(f2); n.replaceWith(f1); }
    document.documentElement.classList.add('translated-ltr'); };
  new MutationObserver(() => { if (!window.__mtT) window.__mtT = setTimeout(run, 120); }).observe(document, { subtree: true, childList: true, characterData: true });
  document.addEventListener('DOMContentLoaded', run);
})();"""
AUDIT = r"""() => { const out = []; const ID = /^ⓣ\s*([TS]-20\d\d-\d{4}|[A-ZÄÖÜ]{1,3}-[A-Z]{1,2}\s?\d{1,4}[EH]?|[A-HJ-NPR-Z0-9]{17})\s*$/;
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) { const m = n.data.trim().match(ID); if (m && n.parentElement.getClientRects().length) out.push(m[1]); }
  const plates = [...document.querySelectorAll('.plate')].filter((e) => e.getClientRects().length); const bad = plates.filter((e) => e.textContent.includes('ⓣ'));
  for (const e of bad) out.push('Kennzeichen übersetzt: ' + e.textContent.trim());
  return { out: [...new Set(out)], plates: plates.length, translated: document.body.innerText.includes('ⓣ') }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'mt.inhaber','display_name':'MT Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    own='mt.inhaber' if s['s']==200 else None
    if not own:  # Server schon eingerichtet: vorhandenes Inhaber-Konto anderer UI-Prüfungen
        for u in ['mt.inhaber','km.inhaber','ui.inhaber','inhaber']:
            if api('POST','/api/login',{'username':u,'password':PW})['s']==200: own=u; break
    check(own and api('POST','/api/login',{'username':own,'password':PW})['s']==200,'Anmeldung Inhaber')
    sfx=str(uuid.uuid4().int)[:4]; vins=['WMA15SZZ2HM96'+sfx,'WMA15SZZ2HM97'+sfx]; plates=[f'MT-U{i} {sfx}' for i in range(2)]
    csv='Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\n'+'\n'.join(f'{pl};Dortmund;MAN;2016;{v};Lkw' for pl,v in zip(plates,vins))
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeuge importiert')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    users={'owner':own}
    un=f'mt.fahrer{sfx}'; r=api('POST','/api/users',{'username':un,'display_name':'MT Fahrer','role':'driver','environment':envn,'language':'de'})
    if r['s'] in (200,201) and r['d'] and r['d'].get('invite_token'):
        c2=br.new_context(); q2=c2.new_page(); q2.goto(B); q2.evaluate(JS,['POST','/api/invite/accept',{'token':r['d']['invite_token'],'password':PW},None]); c2.close(); users['driver']=un
    check('driver' in users,'Fahrerkonto angelegt')
    c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vins[0],'description':'Spiegel rechts lose (Test Browser-Übersetzung)','priority':'mittel','driveability':'eingeschraenkt','request_key':'mt-'+sfx})
    check(c['s']==201,'Vorgang angelegt'); cid=c['d']['id']; cno=c['d'].get('case_no','')
    vs=api('GET','/api/vehicles')['d']; vl=vs.get('vehicles') if isinstance(vs,dict) else vs; vid=[v for v in vl if v.get('vin')==vins[0]][0]['id']
    ROUTES={'owner':['#/','#/cases','#/cases/'+cid,'#/new','#/vehicles','#/v/'+vid,'#/more','#/check','#/maintenance','#/master','#/plan','#/emergency','#/claims','#/tires','#/quality'],
            'driver':['#/','#/new','#/cases/'+cid,'#/check']}
    def page(role,w,h,ignore=False,lang='de'):
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        if ignore: q.add_init_script('window.__mtIgnoreNo = true;')
        q.add_init_script(MT); q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':users[role],'password':PW},None]); return ctx,q,errs
    seen_ids=0
    for role,routes in ROUTES.items():
        if role not in users: continue
        for (w,h) in [(390,844),(1366,900)]:
            ctx,q,errs=page(role,w,h); bad=[]; tr=False
            for rt in routes:
                q.goto(B+'/'+rt); q.wait_for_timeout(1100)
                res=q.evaluate(AUDIT); tr=tr or res['translated']; seen_ids+=res['plates']
                for m in res['out']: bad.append(f'{rt}: {m}')
                if SHOTS and w==390: q.screenshot(path=f"{SHOTS}/mt-{role}-{w}-{re.sub(r'[^a-z0-9]+','_',rt)}.png",full_page=True)
            check(tr,f'{role}/{w}: Pseudo-Übersetzung aktiv')
            check(not bad,f'{role}/{w}: Kennzeichen/Vorgangsnummern/FIN unübersetzt {bad[:4]}')
            check(not errs,f'{role}/{w}: ohne Skriptfehler mit übersetztem DOM {errs[:2]}')
            ctx.close()
    check(seen_ids>20,f'Kennzeichen auf den Ansichten gefunden ({seen_ids})')
    # Fahrer meldet über das übersetzte Formular; Suche über das Kennzeichen
    if 'driver' in users:
        ctx,q,errs=page('driver',390,844); q.goto(B+'/#/new'); q.wait_for_selector('#d'); q.wait_for_timeout(900)
        check('ⓣ' in q.inner_text('body'),'Meldeformular übersetzt')
        q.fill('#vq',plates[1]); q.wait_for_timeout(300)
        vis=q.evaluate("[...document.querySelectorAll('.vehpick label')].filter((l)=>!l.hidden).map((l)=>l.querySelector('input').value)")
        check(vis==['VIN:'+vins[1]],f'Fahrzeugsuche über Kennzeichen findet genau das Fahrzeug ({vis})')
        q.click(f'label:has(input[name=veh][value="VIN:{vins[1]}"])'); q.fill('#d','Rückleuchte links ohne Funktion (Test Übersetzung '+sfx+')')
        q.locator('input[name=prio]').first.check(force=True); q.locator('input[name=drv]').first.check(force=True)
        q.locator('#d').evaluate('(e) => e.form.requestSubmit()'); q.wait_for_timeout(2500)
        cs=q.evaluate(JS,['GET','/api/cases?f=all',None,None])['d']['cases']
        check(any(('Test Übersetzung '+sfx) in x['description'] for x in cs),'Meldung über das übersetzte Formular angekommen')
        check(not errs,f'Meldung ohne Skriptfehler {errs[:2]}')
        ctx.close()
    # Hinweis unter der Sprachwahl (Anmeldung, DE/UK/EN) und im Profil
    HINT={'de':'Browser kann die App übersetzen','uk':'Браузер може перекласти','en':'browser can translate the app'}
    for lang,txt in HINT.items():
        ctx=br.new_context(viewport={'width':390,'height':844}); q=ctx.new_page(); q.goto(B); q.wait_for_selector('#lang'); q.select_option('#lang',lang); q.wait_for_timeout(700)
        check(q.locator('#langmt').is_visible() and txt in q.inner_text('#langmt'),f'Anmeldung {lang}: Hinweis zur Browser-Übersetzung')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'Anmeldung {lang}: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/mt-anmeldung-{lang}.png',full_page=True)
        ctx.close()
    ctx,q,errs=page('owner',1366,900); q.goto(B+'/#/more'); q.wait_for_timeout(1000)
    check(q.locator('#langmt').count()==1 and q.locator('#langmt').is_visible(),'Profil: Hinweis zur Browser-Übersetzung'); ctx.close()
    # Gegenprobe: Übersetzer ohne Rücksicht auf translate="no" → Kennzeichen/Nummern übersetzt
    ctx,q,errs=page('owner',1366,900,ignore=True); hits=[]
    for rt in ['#/cases','#/cases/'+cid,'#/v/'+vid]:
        q.goto(B+'/'+rt); q.wait_for_timeout(1100); hits+=q.evaluate(AUDIT)['out']
    check(any(x.startswith('Kennzeichen') for x in hits) and any(re.match(r'[TS]-20',x) for x in hits) and any(len(x)==17 for x in hits),f'Gegenprobe ohne translate="no" ist rot ({len(hits)} Funde)')
    ctx.close(); br.close()
print('FEHLER: '+str(len(fails)) if fails else 'OK – Browser-Übersetzung')
raise SystemExit(1 if fails else 0)
