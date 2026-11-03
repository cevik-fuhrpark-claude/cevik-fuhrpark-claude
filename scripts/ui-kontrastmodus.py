# [CLAUDE] UI-Prüfung (03.11.2026, Backlog 893, Blickwinkel „Fuhrparkleitung am Büro-PC mit Windows-Kontrastdesign (hoher Kontrast)“):
# Im Kontrastmodus (CSS forced-colors: active – Windows „Kontrastdesigns“, auch Edge/Chrome) ersetzt der Browser alle Farben durch
# wenige Systemfarben; Hintergrundfarben und Schatten (box-shadow) verschwinden. Was nur über Farbe/Schatten markiert ist, sieht dann
# gleich aus (WCAG 1.4.1 / 1.4.11). Geprüft wird mit echter Farbersetzung von Chromium (emulate_media forced_colors='active'):
#  1. Auswahl sichtbar: Abfahrtskontrolle (OK/Mangel/entfällt, Auswahlfeld unsichtbar), Fahrzeugwahl im Meldeformular und in der
#     Sammelmeldung – gewählte Beschriftung muss sich von einer nicht gewählten unterscheiden; Dringlichkeit/Fahrbereitschaft
#     (Auswahlfeld sichtbar) genügen durch das Feld selbst.
#  2. „Aktuell“-Markierung: Filter-Reiter (.seg-tabs a.on) und Navigationsleiste (.tabbar a.active) – ohne Unterschied nur über Schriftstärke.
#  3. Jeder Knopf (.btn / button, außer Textlinks) hat einen sichtbaren Rahmen – sonst steht „Meldung absenden“ als bloßer Text da.
#  4. Fehlender Prüfpunkt (.checkitem.missing) hat eine Markierung ohne Schatten; Tastaturfokus hat einen sichtbaren Rahmen.
#  5. Flottenbalken (Kennzahlen) behält seine Farben (Diagramm, forced-color-adjust: none).
#  6. Kein Text unlesbar auf der Canvas-Hinterlegung („Backplate“), die Chromium im Kontrastmodus hinter Text legt (z. B. HighlightText).
# Hell und dunkel (Windows „Wüste“ bzw. „Nachthimmel“), 390/1366 px, Rollen Inhaber und Fahrer, DE. Braucht den Dev-Server.
# Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
AUDIT = r"""() => {
  const out = [];
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 1 && r.height > 1 && cs.visibility === 'visible' && !e.closest('[hidden]'); };
  const canvas = getComputedStyle(document.body).backgroundColor;
  const alpha0 = (c) => /rgba\([^)]*,\s*0\)$/.test(c) || c === 'transparent';
  // Fläche mit Teil-Deckkraft in Canvas-Farbe (z. B. color-mix 10 %) ist im Kontrastmodus unsichtbar → wie keine Fläche
  const rgb = (c) => (c.match(/\d+(\.\d+)?/g) || []).slice(0, 3).join(','); const bgn = (c) => alpha0(c) || rgb(c) === rgb(canvas) ? canvas : c;
  // sichtbare Merkmale (ohne Schriftstärke – fett allein ist keine erkennbare Markierung); Pseudoelemente nur mit Text oder eigener Fläche
  const sig = (el) => { const cs = getComputedStyle(el); const side = (s) => (cs['border' + s + 'Style'] === 'none' || parseFloat(cs['border' + s + 'Width']) === 0 || alpha0(cs['border' + s + 'Color'])) ? '-' : cs['border' + s + 'Color'] + ' ' + cs['border' + s + 'Width'] + ' ' + cs['border' + s + 'Style'];
    const p = [bgn(cs.backgroundColor), cs.color, side('Top'), side('Left'), side('Bottom'), side('Right'),
      cs.outlineStyle === 'none' || parseFloat(cs.outlineWidth) === 0 ? '-' : cs.outlineColor + ' ' + cs.outlineWidth, cs.textDecorationLine];
    for (const ps of ['::before', '::after']) { const q = getComputedStyle(el, ps); if (!q.content || q.content === 'none' || q.display === 'none') continue;
      const txt = q.content.replace(/^["']|["']$/g, ''); const fill = bgn(q.backgroundColor) !== canvas && bgn(q.backgroundColor) !== bgn(cs.backgroundColor);
      if (txt.trim() || fill) p.push(ps + ' ' + txt + ' ' + (fill ? q.backgroundColor : '')); }
    return p.join(' | '); };
  const name = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).join('.') : '');
  // 1. Auswahlgruppen mit eigenen Beschriftungen
  for (const g of document.querySelectorAll('.seg, .vehpick, .choices')) { if (!vis(g)) continue;
    const labs = [...g.querySelectorAll('label')].filter((l) => l.querySelector('input') && vis(l)); if (labs.length < 2) continue;
    const a = labs[0], b = labs[1], ia = a.querySelector('input'), ib = b.querySelector('input'); const was = [ia.checked, ib.checked];
    const fieldVisible = parseFloat(getComputedStyle(ia).opacity) > 0 && ia.getBoundingClientRect().width > 4;
    ia.checked = true; if (ib.type === 'checkbox') ib.checked = false; const on = sig(a), off = sig(b); ia.checked = was[0]; ib.checked = was[1];
    if (on === off && !fieldVisible) out.push('Auswahl nicht erkennbar in ' + name(g) + ' („' + a.textContent.trim().slice(0, 25) + '“ gewählt = nicht gewählt: ' + on + ')'); }
  // 2. Markierung „aktuell“
  for (const [sel, cls] of [['.seg-tabs a', 'on'], ['.tabbar a', 'active']]) { const all = [...document.querySelectorAll(sel)].filter(vis);
    const on = all.find((e) => e.classList.contains(cls)), off = all.find((e) => !e.classList.contains(cls) && !e.classList.contains('report'));
    if (on && off && sig(on) === sig(off)) out.push('aktuelle Auswahl nicht erkennbar: ' + sel + '.' + cls + ' („' + on.textContent.trim().slice(0, 25) + '“)'); }
  // 3. Knöpfe mit Rahmen
  for (const e of document.querySelectorAll('button, .btn')) { if (!vis(e) || e.closest('.tabbar, .seg')) continue; const cs = getComputedStyle(e);
    if (e.classList.contains('linkbtn') || /underline/.test(cs.textDecorationLine) || e.closest('.helpsec')) continue;
    const s = sig(e).split(' | '); if (s.slice(2, 6).every((x) => x === '-')) out.push('Knopf ohne Rahmen: ' + name(e) + ' „' + e.textContent.trim().slice(0, 30) + '“'); }
  // 4. fehlender Prüfpunkt
  const items = [...document.querySelectorAll('.checkitem')].filter(vis);
  if (items.length > 1) { items[0].classList.add('missing'); const m = sig(items[0]), n = sig(items[1]); items[0].classList.remove('missing');
    if (m.split(' | ').slice(0, 6).join() === n.split(' | ').slice(0, 6).join()) out.push('fehlender Prüfpunkt nicht markiert (' + m + ')'); }
  // 6. Text auf der „Backplate“: Chromium legt im Kontrastmodus Canvas-Fläche hinter jeden Text (außer forced-color-adjust: none) – eine
  //    selbst gesetzte Systemfarbe wie HighlightText (für Auswahl mit Highlight-Hintergrund) war darauf unsichtbar (03.11.2026 gefunden)
  const lum = (c) => { const v = (c.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number).map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const segIn = document.querySelector('.seg input'); const segWas = segIn && segIn.checked; if (segIn) segIn.checked = true; // gewählte Auswahl mitprüfen
  for (const e of document.querySelectorAll('#app *, .tabbar *')) { if (['SCRIPT', 'STYLE', 'OPTION'].includes(e.tagName) || e.closest('svg')) continue;
    const own = [...e.childNodes].some((n) => n.nodeType === 3 && /[\p{L}\p{N}]/u.test(n.textContent)); if (!own || !vis(e)) continue;
    const cs = getComputedStyle(e); if (cs.forcedColorAdjust === 'none' || e.disabled || e.closest(':disabled')) continue;
    const q = cr(cs.color, canvas); if (q < 4.5) { out.push('Text auf Canvas-Hinterlegung unlesbar: ' + name(e) + ' „' + e.textContent.trim().slice(0, 25) + '“ ' + q.toFixed(2) + ':1'); break; } }
  if (segIn) segIn.checked = segWas;
  // 5. Flottenbalken behält Farben
  for (const s of document.querySelectorAll('.fleetbar span')) { if (!vis(s)) continue; const c = getComputedStyle(s).backgroundColor;
    if (c === canvas || alpha0(c)) { out.push('Flottenbalken ohne Farbe (' + c + ')'); break; } }
  return out; }"""
FOCUS = r"""() => { const b = [...document.querySelectorAll('#app .btn')].find((e) => e.getBoundingClientRect().width > 1); if (!b) return 'kein Knopf';
  b.focus({ focusVisible: true }); const cs = getComputedStyle(b); return cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 ? '' : 'Fokus ohne Rahmen: ' + cs.outlineStyle + ' ' + cs.outlineWidth; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
ROUTES={'owner':['#/','#/cases','#/new','#/new/multi','#/vehicles','#/more','#/check','#/maintenance','#/master','#/stock','#/users','#/inbox'],
        'driver':['#/','#/new','#/check']}
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'km.inhaber','display_name':'KM Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'km.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    sfx=str(uuid.uuid4().int)[:4]; vins=['WMA15SZZ2HM77'+sfx,'WMA15SZZ2HM78'+sfx]
    csv='Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\n'+'\n'.join(f'KM-Z{i} {sfx};Dortmund;MAN;2016;{v};Lkw' for i,v in enumerate(vins))
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeuge importiert')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    users={'owner':'km.inhaber'}
    un=f'km.driver{sfx}'; r=api('POST','/api/users',{'username':un,'display_name':'KM Fahrer','role':'driver','environment':envn,'language':'de'})
    if r['s'] in (200,201) and r['d'] and r['d'].get('invite_token'):
        c2=br.new_context(); q2=c2.new_page(); q2.goto(B); q2.evaluate(JS,['POST','/api/invite/accept',{'token':r['d']['invite_token'],'password':PW},None]); c2.close(); users['driver']=un
    check('driver' in users,'Konto Fahrer angelegt')
    c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vins[0],'description':'Spiegel rechts lose (Test Kontrastmodus)','priority':'kritisch','driveability':'nicht_fahrbereit','request_key':'km-'+sfx})
    check(c['s']==201,'Vorgang angelegt'); ROUTES['owner'].append('#/cases/'+c['d']['id'])
    seen={}; hits={'seg':0,'vehpick':0,'tabs':0}
    for scheme in ['light','dark']:
        for role,routes in ROUTES.items():
            if role not in users: continue
            for (w,h) in [(390,844),(1366,900)]:
                ctx=br.new_context(viewport={'width':w,'height':h},color_scheme=scheme,forced_colors='active'); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
                q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':users[role],'password':PW},None])
                check(q.evaluate("matchMedia('(forced-colors: active)').matches"),f'{scheme}/{role}/{w}: Kontrastmodus aktiv')
                for rt in routes:
                    q.goto(B+'/'+rt); q.wait_for_timeout(900)
                    hits['seg']+=q.locator('.seg:visible').count(); hits['vehpick']+=q.locator('.vehpick:visible').count(); hits['tabs']+=q.locator('.seg-tabs a.on:visible').count()
                    for m in q.evaluate(AUDIT):
                        key=(scheme,m.split('„')[0])
                        if key in seen: continue
                        seen[key]=1; check(False,f'{scheme}/{role}/{w} {rt}: {m}')
                    if rt=='#/check':
                        f=q.evaluate(FOCUS); check(not f,f'{scheme}/{role}/{w}: Tastaturfokus sichtbar {f}')
                        if SHOTS:
                            q.locator('.seg label').first.click(); q.locator('.seg label.bad').nth(1).click() if q.locator('.seg label.bad').count()>1 else None
                    if SHOTS: q.screenshot(path=f"{SHOTS}/kontrastmodus-{scheme}-{role}-{w}-{rt.strip('#/').replace('/','-') or 'start'}.png")
                check(not errs,f'{scheme}/{role}/{w}: keine Skriptfehler {errs[:1]}')
                ctx.close()
    check(hits['seg']>0 and hits['vehpick']>0 and hits['tabs']>0,f'Prüfgegenstände gefunden {hits}')
    check(len(seen)==0,f'Kontrastmodus überall erkennbar ({len(seen)} Abweichungen)')
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
