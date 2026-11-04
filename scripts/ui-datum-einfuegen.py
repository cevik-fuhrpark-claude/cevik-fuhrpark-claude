# [CLAUDE] UI-Prüfung (04.11.2026, Backlog 975, Blickwinkel „Leitung überträgt ein Datum aus Rechnung, E-Mail oder Bescheid per
# Kopieren/Einfügen“): Datumsfelder (input type=date) verwarfen eingefügten Text still. Geprüft (DE/UK/EN, 390/820/1366 px):
#  1. Fahrzeugakte → Massenspeicher-Auslesung: „Ausgelesen am 03.11.2026“ / „03 листопада 2026“ / „03/11/2026“ eingefügt → Feld zeigt
#     2026-11-03, Speichern legt die Auslesung mit diesem Datum an.
#  2. Text ohne Datum, mit zwei Daten, „31.02.2026“ → Meldung in der App-Sprache, Feld unverändert.
#     Backlog 976: nur Monat/Jahr („nächste HU: 11/2027“) → eigene Meldung, kein geratener Tag.
#  3. Textfelder bleiben unberührt (Einfügen nicht abgefangen).
# Braucht den Dev-Server. Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
PASTE = """([sel, txt]) => { const el = document.querySelector(sel); el.focus(); const dt = new DataTransfer(); dt.setData('text/plain', txt);
  const ok = el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); return { prevented: !ok, value: el.value }; }"""
TOAST = "() => { const x = [...document.querySelectorAll('.toast.err')].pop(); return x ? x.textContent : ''; }"
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'dz.inhaber','display_name':'DZ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    own='dz.inhaber' if s['s']==200 else None
    if not own:
        for u in ['dz.inhaber','ez.inhaber','mt.inhaber','km.inhaber','ui.inhaber','inhaber']:
            if api('POST','/api/login',{'username':u,'password':PW})['s']==200: own=u; break
    check(own and api('POST','/api/login',{'username':own,'password':PW})['s']==200,'Anmeldung Inhaber')
    sfx=str(uuid.uuid4().int)[:4]; vins=[f'WMA15SZZ2HN9{i}'+sfx for i in range(3)]; plates=[f'DZ-P{i} {sfx}' for i in range(3)]
    csv='Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\n'+'\n'.join(f'{pl};Dortmund;MAN;2016;{v};Lkw' for pl,v in zip(plates,vins))
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeuge importiert')
    vs=api('GET','/api/vehicles')['d']; vl=vs.get('vehicles') if isinstance(vs,dict) else vs; ids={v['vin']:v['id'] for v in vl if v.get('vin') in vins}
    CASES=[('de',390,844,'Ausgelesen am 03.11.2026','Kein Datum','mehrere','gibt es im Kalender nicht','Nur Monat und Jahr'),
           ('uk',820,1180,'03 листопада 2026','не знайдено','кілька','немає в календарі','лише місяць і рік'),
           ('en',1366,900,'03/11/2026','No date','several','does not exist','Only month and year')]
    for i,(lang,w,h,txt,m_none,m_many,m_inv,m_mon) in enumerate(CASES):
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':own,'password':PW},None]); q.evaluate(JS,['PATCH','/api/me',{'language':lang},None])
        vid=ids[vins[i]]; q.goto(B+'/#/vehicles/'+vid); q.wait_for_selector('#tvf',state='attached',timeout=15000); q.wait_for_timeout(600)
        q.evaluate("() => { const d = document.querySelector('#tvf').closest('details'); if (d) d.open = true; }")
        sel="#tvf input[name=downloaded_on]"
        r=q.evaluate(PASTE,[sel,txt]); check(r['prevented'] and r['value']=='2026-11-03',f'{lang} {w}px: „{txt}“ → {r["value"]}')
        # Fehlerfälle: Feld bleibt, Meldung in der App-Sprache
        for bad,msg in [('Rechnung Nr. 4711',m_none),('03.11.2026 – 05.11.2026',m_many),('31.02.2026',m_inv),('nächste HU: 11/2027',m_mon)]:
            q.evaluate("() => document.querySelectorAll('.toast').forEach((x) => x.remove())")
            r=q.evaluate(PASTE,[sel,bad]); q.wait_for_timeout(150); tt=q.evaluate(TOAST)
            check(r['prevented'] and r['value']=='2026-11-03' and msg.lower() in tt.lower(),f'{lang}: „{bad}“ → Feld unverändert, Meldung „{tt[:70]}“')
        r=q.evaluate(PASTE,["#tvf input[name=evidence]",'03.11.2026']); check(not r['prevented'],f'{lang}: Textfeld nicht abgefangen')
        q.evaluate("() => document.querySelectorAll('.toast').forEach((x) => x.remove())")
        if SHOTS: q.evaluate("() => document.querySelector('#tvf').scrollIntoView({block:'center'})"); q.screenshot(path=f'{SHOTS}/datum-einfuegen-{lang}-{w}.png')
        q.fill("#tvf input[name=evidence]",'UI-Test Datum einfügen'); q.evaluate("() => document.querySelector('#tvf').requestSubmit()"); q.wait_for_timeout(1500)
        dl=q.evaluate(JS,['GET','/api/tacho/downloads?vehicle_id='+vid,None,None])['d'] or {}
        rows=dl.get('downloads') or []
        check(any(x.get('downloaded_on')=='2026-11-03' for x in rows),f'{lang}: Auslesung mit 03.11.2026 gespeichert ({[x.get("downloaded_on") for x in rows][:3]})')
        check(not errs,f'{lang}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('\nUI-Datum einfügen:', 'OK' if not fails else f'{len(fails)} Fehler'); raise SystemExit(1 if fails else 0)
