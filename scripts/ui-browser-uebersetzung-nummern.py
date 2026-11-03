# [CLAUDE] UI-Prüfung (03.11.2026, Backlog 898, Folge aus 896 „Fahrer/Leitung lässt die App vom Browser übersetzen“):
# Neben Kennzeichen/Vorgangsnummern/FIN bleiben jetzt auch Vertragsnummer, Schadennummer (Versicherer und Gegenseite), Personalnummer,
# Bußgeldnummer und Aktenzeichen des Bußgeldschreibens sowie der Dubletten-Verweis unübersetzt (translate="no").
# Pseudo-Übersetzer wie in ui-browser-uebersetzung.py (Init-Skript, <font>-Hüllen, „ⓣ“ vor jedem übersetzten Text).
# Geprüft (alle <details> aufgeklappt; sichtbar = checkVisibility): Liste und Detail von Verträgen, Versicherungsfällen, Fahrerakte, Bußgeldern sowie Fahrzeugakte/Vorgang (390 und 1366 px):
#  kein Textknoten mit einer dieser Nummern trägt „ⓣ“; die Nummer ist sichtbar; keine Skriptfehler. Gegenprobe: Übersetzer ignoriert
#  translate="no" → Funde. Braucht den Dev-Server. Screenshots: CFP_SHOTS=<Ordner>.
import os, re, uuid, time
from urllib.parse import quote
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
      const f1 = document.createElement('font'); f1.setAttribute('data-mt', ''); const f2 = document.createElement('font'); f2.textContent = 'ⓣ' + n.data; f1.appendChild(f2); n.replaceWith(f1); }
    document.documentElement.classList.add('translated-ltr'); };
  new MutationObserver(() => { if (!window.__mtT) window.__mtT = setTimeout(run, 120); }).observe(document, { subtree: true, childList: true, characterData: true });
  document.addEventListener('DOMContentLoaded', run);
})();"""
AUDIT = r"""(toks) => { const bad = [], seen = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) { const p = n.parentElement; if (!p || !(p.checkVisibility ? p.checkVisibility() : p.getClientRects().length) || p.closest('option, .print-only')) continue;
    for (const k of toks) if (n.data.includes(k)) { seen.push(k); if (n.data.includes('ⓣ')) bad.push(k); } }
  return { bad: [...new Set(bad)], seen: [...new Set(seen)], translated: document.body.innerText.includes('ⓣ') }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'mtn.inhaber','display_name':'MTN Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    own='mtn.inhaber' if s['s']==200 else None
    if not own:
        for u in ['mtn.inhaber','mt.inhaber','km.inhaber','ui.inhaber','inhaber']:
            if api('POST','/api/login',{'username':u,'password':PW})['s']==200: own=u; break
    check(own and api('POST','/api/login',{'username':own,'password':PW})['s']==200,'Anmeldung Inhaber')
    sfx=str(uuid.uuid4().int)[:4]; vin='WMA15SZZ2HM98'+sfx; pl=f'MT-N {sfx}'
    check(api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\n{pl};Dortmund;MAN;2016;{vin};Lkw','text/csv')['s']==200,'Fahrzeug importiert')
    vs=api('GET','/api/vehicles')['d']; vl=vs.get('vehicles') if isinstance(vs,dict) else vs; vid=[v for v in vl if v.get('vin')==vin][0]['id']
    PN=f'PN{sfx}X'; KN=f'LV-{sfx}-77A'; SN=f'SN-{sfx}-0815'; GN=f'GS-{sfx}-4242'; AZ=f'AZ-{sfx}-913'
    d=api('POST','/api/drivers',{'display_name':'MTN Fahrer '+sfx,'personnel_no':PN,'site':'Dortmund'}); check(d['s']==201,'Fahrerakte mit Personalnummer'); did=d['d']['id']
    k=api('POST',f'/api/vehicles/{vid}/contracts',{'kind':'leasing','partner':'MTN Leasing','evidence':'Vertrag','contract_no':KN,'start_date':'2026-01-01','end_date':'2029-12-31'})
    check(k['s'] in (200,201),f'Vertrag mit Vertragsnummer ({k["s"]})')
    c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Seitenwand eingedrückt (Test Nummern-Übersetzung)','priority':'mittel','driveability':'eingeschraenkt','request_key':'mtn-'+sfx})
    check(c['s']==201,'Vorgang angelegt'); cid=c['d']['id']
    cl=api('PUT',f'/api/cases/{cid}/claim',{'insurer':'MTN Versicherung','claim_no':SN,'opponent_claim_no':GN,'opponent_insurer':'Gegner Versicherung AG','opponent_plate':'K-XY 123','reported_on':time.strftime('%Y-%m-%d'),'evidence':'Schadenmeldung'})
    check(cl['s']==200,f'Versicherungsfall mit Schadennummern ({cl["s"]} {cl["d"] if cl["s"]!=200 else ""})')
    f=api('POST','/api/fines',{'kind':'anhoerung','authority':'Stadt Test','reference':AZ,'offense_type':'parken','offense_at':'2026-10-01T09:00','plate_in_letter':pl,'request_key':'mtn-f-'+sfx})
    check(f['s']==201,'Bußgeld mit Aktenzeichen'); fid=f['d']['id']; FN=f['d']['fine_no']
    ROUTES=[('#/drivers',[PN]),('#/drivers/'+did,[PN]),('#/contracts',[KN]),('#/vehicles/'+quote(vid,safe=''),[KN]),('#/claims',[SN]),('#/cases/'+cid,[SN,GN]),('#/fines',[FN]),('#/fines/'+fid,[FN,AZ])]
    def page(w,h,ignore=False):
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        if ignore: q.add_init_script('window.__mtIgnoreNo = true;')
        q.add_init_script(MT); q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':own,'password':PW},None]); return ctx,q,errs
    for (w,h) in [(390,844),(1366,900)]:
        ctx,q,errs=page(w,h); bad=[]; miss=[]; tr=False
        for rt,toks in ROUTES:
            q.goto(B+'/'+rt); q.wait_for_timeout(1200); q.evaluate("document.querySelectorAll('details').forEach((d) => { d.open = true; })"); q.wait_for_timeout(400)  # aufgeklappte Bereiche (z. B. Sammel-Beenden der Verträge) mitprüfen
            res=q.evaluate(AUDIT,toks); tr=tr or res['translated']
            bad+=[f'{rt}: {x}' for x in res['bad']]; miss+=[f'{rt}: {x}' for x in toks if x not in res['seen']]
            if SHOTS: q.screenshot(path=f"{SHOTS}/mtn-{w}-{re.sub(r'[^a-z0-9]+','_',rt)}.png",full_page=True)
        check(tr,f'{w}: Pseudo-Übersetzung aktiv')
        check(not miss,f'{w}: alle Nummern sichtbar {miss[:4]}')
        check(not bad,f'{w}: Vertrags-/Schaden-/Personal-/Bußgeldnummer und Aktenzeichen unübersetzt {bad[:4]}')
        check(not errs,f'{w}: ohne Skriptfehler {errs[:2]}')
        ctx.close()
    ctx,q,errs=page(1366,900,ignore=True); hits=[]
    for rt,toks in ROUTES:
        q.goto(B+'/'+rt); q.wait_for_timeout(1100); hits+=q.evaluate(AUDIT,toks)['bad']
    check(len(set(hits))>=5,f'Gegenprobe ohne translate="no" ist rot ({sorted(set(hits))})')
    ctx.close(); br.close()
print('FEHLER: '+str(len(fails)) if fails else 'OK – Nummern bei Browser-Übersetzung')
raise SystemExit(1 if fails else 0)
