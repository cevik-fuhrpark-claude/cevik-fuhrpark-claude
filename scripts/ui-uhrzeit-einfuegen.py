# [CLAUDE] UI-Prüfung (04.11.2026, Backlog 978, Blickwinkel „Leitung überträgt die Tatzeit aus dem Bußgeldbescheid, Fahrer die
# Uhrzeit aus einer Nachricht“): Uhrzeit- und Datum+Uhrzeit-Felder verwarfen eingefügten Text still. Geprüft (DE/UK/EN, 390/820/1366 px):
#  1. Bußgelder → Neues Schreiben: „Tatzeit: 03.11.2026, 14:32 Uhr“ / „03 листопада 2026 о 14:32“ / „03/11/2026 2:32 PM“ eingefügt →
#     Tatzeit 2026-11-03T14:32; Speichern legt das Schreiben mit 13:32 UTC an.
#  2. Nur Datum → Meldung „keine Uhrzeit“, Feld unverändert (Uhrzeit wird nicht geraten); zwei Uhrzeiten / 25:10 → Meldung.
#  3. Schaden melden: „03.11.2026 18:45“ ins Tagesfeld → Tag UND Uhrzeit übernommen; „7:15 PM“ ins Uhrzeitfeld → 19:15.
# Braucht den Dev-Server. Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
PASTE = """([sel, txt]) => { const el = document.querySelector(sel); el.focus(); const dt = new DataTransfer(); dt.setData('text/plain', txt);
  const ok = el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); return { prevented: !ok, value: el.value }; }"""
TOAST = "() => { const x = [...document.querySelectorAll('.toast.err')].pop(); return x ? x.textContent : ''; }"
CLR = "() => document.querySelectorAll('.toast').forEach((x) => x.remove())"
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'uz.inhaber','display_name':'UZ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    own='uz.inhaber' if s['s']==200 else None
    if not own:
        for u in ['uz.inhaber','dz.inhaber','ez.inhaber','mt.inhaber','km.inhaber','ui.inhaber','inhaber']:
            if api('POST','/api/login',{'username':u,'password':PW})['s']==200: own=u; break
    check(own and api('POST','/api/login',{'username':own,'password':PW})['s']==200,'Anmeldung Inhaber')
    sfx=str(uuid.uuid4().int)[:4]; vins=[f'WMA15SZZ2HN8{i}'+sfx for i in range(3)]; plates=[f'UZ-P{i} {sfx}' for i in range(3)]
    csv='Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\n'+'\n'.join(f'{pl};Dortmund;MAN;2016;{v};Lkw' for pl,v in zip(plates,vins))
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeuge importiert')
    CASES=[('de',390,844,'Tatzeit: 03.11.2026, 14:32 Uhr','keine Uhrzeit','mehrere verschiedene Uhrzeiten','gibt es nicht'),
           ('uk',820,1180,'03 листопада 2026 о 14:32','без часу','кілька різних','не існує'),
           ('en',1366,900,'03/11/2026 2:32 PM','no time','several different times','does not exist')]
    for i,(lang,w,h,txt,m_not,m_many,m_inv) in enumerate(CASES):
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':own,'password':PW},None]); q.evaluate(JS,['PATCH','/api/me',{'language':lang},None])
        q.goto(B+'/#/fines'); q.wait_for_selector('#nf',state='attached',timeout=15000); q.wait_for_timeout(500)
        q.evaluate("() => { const d = document.querySelector('#nf').closest('details'); if (d) d.open = true; }")
        sel="#nf input[name=offense_at]"
        r=q.evaluate(PASTE,[sel,txt]); check(r['prevented'] and r['value']=='2026-11-03T14:32',f'{lang} {w}px: Tatzeit „{txt}“ → {r["value"]}')
        for bad,msg in [('03.11.2026',m_not),('03.11.2026 14:32 und 14:40',m_many),('03.11.2026 25:10',m_inv)]:
            q.evaluate(CLR); r=q.evaluate(PASTE,[sel,bad]); q.wait_for_timeout(150); tt=q.evaluate(TOAST)
            check(r['prevented'] and r['value']=='2026-11-03T14:32' and msg.lower() in tt.lower(),f'{lang}: „{bad}“ → Feld unverändert, Meldung „{tt[:70]}“')
        q.evaluate(CLR)
        if SHOTS: q.evaluate("() => document.querySelector('#nf').scrollIntoView({block:'start'})"); q.screenshot(path=f'{SHOTS}/uhrzeit-einfuegen-buss-{lang}-{w}.png')
        q.fill('#nf input[name=authority]','UI-Test Behörde'); q.fill('#nf input[name=plate_in_letter]',plates[i]); q.fill('#nf input[name=reference]',f'UZ-{sfx}-{lang}')
        q.evaluate("() => document.querySelector('#nf').requestSubmit()"); q.wait_for_timeout(1500)
        fl=q.evaluate(JS,['GET','/api/fines',None,None])['d'] or {}; rows=fl.get('fines') if isinstance(fl,dict) else fl
        mine=[x for x in (rows or []) if x.get('reference')==f'UZ-{sfx}-{lang}']
        check(mine and str(mine[0].get('offense_at','')).startswith('2026-11-03T13:32'),f'{lang}: Schreiben mit Tatzeit 13:32 UTC gespeichert ({[x.get("offense_at") for x in mine]})')
        # Schaden melden: Tag + Uhrzeit aus einem Text, Uhrzeit allein im Uhrzeitfeld
        q.goto(B+'/#/new'); q.wait_for_selector('#occd',state='attached',timeout=15000); q.wait_for_timeout(400)
        r=q.evaluate(PASTE,['#occd','03.11.2026 18:45']); tv=q.eval_on_selector('#occt','e => e.value')
        check(r['prevented'] and r['value']=='2026-11-03' and tv=='18:45',f'{lang}: Schadenzeitpunkt „03.11.2026 18:45“ → {r["value"]} {tv}')
        r=q.evaluate(PASTE,['#occt','7:15 PM']); check(r['prevented'] and r['value']=='19:15',f'{lang}: Uhrzeitfeld „7:15 PM“ → {r["value"]}')
        q.evaluate(CLR); r=q.evaluate(PASTE,['#occt','abends']); q.wait_for_timeout(150); tt=q.evaluate(TOAST)
        check(r['prevented'] and r['value']=='19:15' and len(tt)>10,f'{lang}: „abends“ → nicht geraten, Meldung „{tt[:60]}“')
        q.evaluate(CLR); r=q.evaluate(PASTE,['#l','18:45']); check(not r['prevented'],f'{lang}: Textfeld nicht abgefangen')
        if SHOTS: q.evaluate("() => document.querySelector('#occd').scrollIntoView({block:'center'})"); q.screenshot(path=f'{SHOTS}/uhrzeit-einfuegen-meldung-{lang}-{w}.png')
        check(not errs,f'{lang}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('\nUI-Uhrzeit einfügen:', 'OK' if not fails else f'{len(fails)} Fehler'); raise SystemExit(1 if fails else 0)
