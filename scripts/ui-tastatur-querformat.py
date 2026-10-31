# [CLAUDE] UI-Prüfung (31.10.2026, Backlog 791, Blickwinkel „Fahrer mit Bildschirmtastatur im Querformat“): Verkleinert die
# Bildschirmtastatur die Seite (Querformat 844×170 / 740×180, Zoom 200 % hochkant 180×200), ist die Tabbar ausgeblendet, solange
# ein Textfeld den Fokus hat; jedes Textfeld im Meldeformular und in der Abfahrtskontrolle liegt nach dem Fokussieren vollständig
# im Bild und ist nicht verdeckt (vorher verdeckte die 45-px-Leiste das untere Ende der Beschreibung). Ohne Fokus, nach dem
# Verlassen des Feldes, bei Ankreuzfeldern und im Hochformat (390×480) bleibt die Tabbar sichtbar. DE/UK/EN. Dev-Server: CFP_URL.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
FIELDS = r"""() => [...document.querySelectorAll('#app input, #app textarea')].filter((e) => e.checkVisibility({ visibilityProperty: true }) && !['hidden','checkbox','radio','file','submit','button'].includes(e.type)).map((e, i) => { e.dataset.probe = i; return { i, n: e.name || e.id || e.type }; })"""
TB = r"""() => { const tb = document.querySelector('.tabbar'); return !!tb && getComputedStyle(tb).display !== 'none' && tb.getBoundingClientRect().height > 0; }"""
MEAS = r"""(i) => { const e = document.querySelector(`[data-probe="${i}"]`); const r = e.getBoundingClientRect(); const tb = document.querySelector('.tabbar');
  const tbvis = getComputedStyle(tb).display !== 'none'; const lim = tbvis ? tb.getBoundingClientRect().top : innerHeight;
  const hit = document.elementFromPoint(r.left + Math.min(r.width / 2, 20), r.top + Math.min(r.height / 2, 10));
  const covered = !(hit && (hit === e || e.contains(hit) || hit.contains(e)));
  return { top: Math.round(r.top), bot: Math.round(r.bottom), lim: Math.round(lim), tbvis, covered, active: document.activeElement === e }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'tq.inhaber','display_name':'TQ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'tq.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    sfx=str(uuid.uuid4().int)[:4]; vin='WMA15SZZ2HM77'+sfx
    check(api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nTQ-ZM {sfx};Dortmund;MAN;2016;{vin};Lkw','text/csv')['s']==200,'Fahrzeug importiert')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    un=f'tq.fahrer{sfx}'; r=api('POST','/api/users',{'username':un,'display_name':'TQ Fahrer','role':'driver','environment':envn,'language':'de'})
    c2=br.new_context(); q2=c2.new_page(); q2.goto(B); q2.evaluate(JS,['POST','/api/invite/accept',{'token':r['d']['invite_token'],'password':PW},None]); c2.close()
    for lang in ['de','uk','en']:
        for (w,h,hide) in [(844,170,True),(740,180,True),(180,200,True),(390,480,False)]:
            ctx=br.new_context(viewport={'width':w,'height':h},is_mobile=True,has_touch=True,device_scale_factor=2); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
            q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW},None]); q.evaluate(JS,['PATCH','/api/me',{'language':lang},None])
            for rt in ['#/new','#/check']:
                q.goto(B+'/'+rt); q.reload(); q.wait_for_selector('.tabbar',timeout=20000); q.wait_for_timeout(700)
                if rt=='#/new': q.evaluate("()=>{ const r=[...document.querySelectorAll('input[name=veh]')].find(x=>x.closest('label') && x.closest('label').textContent.includes('TQ-ZM')) || document.querySelector('input[name=veh]'); if (r) r.click(); }"); q.wait_for_timeout(500)
                tag=f'{lang} {w}×{h} {rt}'
                check(q.evaluate(TB),f'{tag}: Tabbar ohne Fokus sichtbar')
                cb=q.query_selector('#app input[type=checkbox]')
                if cb: q.evaluate("()=>document.querySelector('#app input[type=checkbox]').focus()"); q.wait_for_timeout(100); check(q.evaluate(TB),f'{tag}: Ankreuzfeld blendet die Tabbar nicht aus')
                fs=q.evaluate(FIELDS); check(len(fs)>0,f'{tag}: Textfelder gefunden ({len(fs)})')
                for f in fs:
                    q.evaluate('()=>{ document.activeElement && document.activeElement.blur(); window.scrollTo(0,0); }')
                    q.focus(f'[data-probe="{f["i"]}"]'); q.wait_for_timeout(120)
                    m=q.evaluate(MEAS,f['i'])
                    check(m['active'] and m['tbvis']!=hide,f'{tag} {f["n"]}: Tabbar {"aus" if hide else "sichtbar"}geblendet beim Tippen')
                    if m['bot']-m['top'] <= m['lim']:  # Feld passt grundsätzlich ins Bild
                        q.evaluate(f'()=>document.querySelector(\'[data-probe="{f["i"]}"]\').scrollIntoView({{block:"nearest"}})'); m=q.evaluate(MEAS,f['i'])
                        check(m['top']>=0 and m['bot']<=m['lim']+1 and not m['covered'],f'{tag} {f["n"]}: Feld vollständig sichtbar ({m["top"]}–{m["bot"]} ≤ {m["lim"]})')
                if SHOTS: q.screenshot(path=f"{SHOTS}/tastatur-quer-{lang}-{w}-{rt.strip('#/')}.png")
                q.evaluate('()=>document.activeElement && document.activeElement.blur()'); q.wait_for_timeout(100)
                check(q.evaluate(TB),f'{tag}: Tabbar nach Verlassen des Feldes wieder da')
            check(not errs,f'{lang} {w}×{h}: keine Skriptfehler {errs[:1]}')
            ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün'); raise SystemExit(1 if fails else 0)
