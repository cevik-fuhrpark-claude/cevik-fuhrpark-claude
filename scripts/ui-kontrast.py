# [CLAUDE] UI-Prüfung (31.10.2026, Backlog 785, Blickwinkel „Werkstatt-Tablet im Freien bei Sonnenlicht“): Textkontrast nach
# WCAG 2.1 (1.4.3) auf den Hauptansichten in hell und dunkel. Für jedes sichtbare Element mit eigenem Text wird die Schriftfarbe
# gegen den tatsächlich darunterliegenden Hintergrund (Vorfahren mit Hintergrundfarbe, Deckkraft eingerechnet) gemessen:
# normaler Text ≥ 4,5:1, großer Text (≥ 24 px bzw. ≥ 18,66 px fett) ≥ 3:1. Deaktivierte Bedienelemente sind nach WCAG ausgenommen.
# Rollen Inhaber, Fahrer und Werkstatt, 390/1366 px, DE. Braucht den Dev-Server (scripts/dev-server.mjs).
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
# Misst alle Textelemente; liefert Verstöße [Text, Verhältnis, Soll, Farbe, Hintergrund, Selektor]
AUDIT = r"""() => {
  const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const over = (top, bot) => { const a = top[3]; return [0, 1, 2].map((i) => top[i] * a + bot[i] * (1 - a)).concat(1); };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgOf = (el) => { const stack = []; let e = el, img = false;
    while (e && e.nodeType === 1) { const cs = getComputedStyle(e); if (cs.backgroundImage && cs.backgroundImage !== 'none') img = true;
      const c = parse(cs.backgroundColor); if (c && c[3] > 0) { stack.push(c); if (c[3] >= 1) break; } e = e.parentElement; }
    let base = [255, 255, 255, 1]; if (!e) { const c = parse(getComputedStyle(document.documentElement).backgroundColor); if (c && c[3] > 0) base = c; }
    for (let i = stack.length - 1; i >= 0; i--) base = over(stack[i], base); return { c: base, img }; };
  const opac = (el) => { let o = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) o *= Number(getComputedStyle(e).opacity); return o; };
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    if (['SCRIPT', 'STYLE', 'svg', 'SVG', 'OPTION', 'TEMPLATE'].includes(el.tagName) || el.closest('svg')) continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
    const isField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) && !['hidden', 'checkbox', 'radio', 'file', 'range', 'color'].includes(el.type);
    const txt = isField ? (el.value || el.placeholder || (el.tagName === 'SELECT' ? el.options[el.selectedIndex]?.text : '') || '') : own;
    if (!txt || !/[\p{L}\p{N}]/u.test(txt)) continue;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    const cs = getComputedStyle(el); if (cs.visibility !== 'visible' || cs.display === 'none') continue;
    if (el.closest('[hidden],[aria-hidden="true"]')) continue;
    if (el.disabled || el.closest('button:disabled,fieldset:disabled,[aria-disabled="true"]')) continue;
    if (isField && !el.value && el.placeholder) { /* Platzhalter: eigene Farbe */ }
    const fgs = isField && !el.value && el.placeholder ? getComputedStyle(el, '::placeholder').color : cs.color; const fg0 = parse(fgs); if (!fg0) continue;
    const bg = bgOf(el); if (bg.img) continue;
    const o = opac(el); const fg = over([fg0[0], fg0[1], fg0[2], fg0[3] * o], bg.c);
    const size = parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 700;
    const large = size >= 24 || (bold && size >= 18.66);
    const need = large ? 3 : 4.5; const q = ratio(fg, bg.c);
    if (q + 0.005 < need) {
      const cls = el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '';
      const par = el.parentElement; const pcls = par && typeof par.className === 'string' && par.className ? '.' + par.className.trim().split(/\s+/).join('.') : '';
      out.push([txt.slice(0, 40), Math.round(q * 100) / 100, need, fgs, 'rgb(' + bg.c.slice(0, 3).map(Math.round).join(',') + ')', (par ? par.tagName.toLowerCase() + pcls + ' > ' : '') + el.tagName.toLowerCase() + cls]);
    }
  }
  return out;
}"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
ROUTES={'owner':['#/','#/cases','#/new','#/vehicles','#/more','#/maintenance','#/master','#/plan','#/stock','#/users','#/help','#/check','#/emergency'],
        'driver':['#/','#/new','#/check','#/help'],
        'workshop':['#/','#/cases','#/stock']}
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ko.inhaber','display_name':'KO Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ko.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    sfx=str(uuid.uuid4().int)[:4]
    vin='WMA15SZZ2HM75'+sfx
    csv=f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nKO-ZM {sfx};Dortmund;MAN;2016;{vin};Lkw'
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeug importiert')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    users={'owner':'ko.inhaber'}
    for role in ['driver','workshop']:
        un=f'ko.{role}{sfx}'; r=api('POST','/api/users',{'username':un,'display_name':f'KO {role}','role':role,'workshop_site':'DORTMUND','environment':envn,'language':'de'})
        if r['s'] in (200,201) and r['d'] and r['d'].get('invite_token'):
            c2=br.new_context(); q2=c2.new_page(); q2.goto(B); q2.evaluate(JS,['POST','/api/invite/accept',{'token':r['d']['invite_token'],'password':PW},None]); c2.close()
            users[role]=un
        check(role in users,f'Konto {role} angelegt')
    c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Spiegel rechts lose (Test Kontrast)','priority':'kritisch','driveability':'nicht_fahrbereit','request_key':'ko-'+sfx})
    check(c['s']==201,'Vorgang angelegt'); cid=c['d']['id']
    vs=api('GET','/api/vehicles')['d']; vl=vs.get('vehicles') if isinstance(vs,dict) else vs; vid=[v for v in vl if v.get('vin')==vin][0]['id']
    ROUTES['owner']+=['#/cases/'+cid,'#/v/'+vid,'#/fines','#/drivers','#/tires','#/tacho','#/quality','#/audit','#/guide']; ROUTES['driver'].append('#/cases/'+cid)
    seen={}
    for scheme in ['light','dark']:
        for role,routes in ROUTES.items():
            if role not in users: continue
            for (w,h) in [(390,844),(1366,900)]:
                ctx=br.new_context(viewport={'width':w,'height':h},color_scheme=scheme); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
                q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':users[role],'password':PW},None])
                for rt in routes:
                    q.goto(B+'/'+rt); q.wait_for_timeout(900)
                    for t,rq,need,fg,bg,sel in q.evaluate(AUDIT):
                        key=(scheme,sel,fg,bg)
                        if key in seen: continue
                        seen[key]=1; check(False,f'{scheme}/{role}/{w} {rt}: „{t}“ {rq}:1 < {need}:1 ({fg} auf {bg}) {sel}')
                    if SHOTS: q.screenshot(path=f"{SHOTS}/kontrast-{scheme}-{role}-{w}-{rt.strip('#/') or 'start'}.png")
                check(not errs,f'{scheme}/{role}/{w}: keine Skriptfehler {errs[:1]}')
                ctx.close()
    check(len(seen)==0,f'Kontrast überall ausreichend ({len(seen)} Abweichungen)')
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
