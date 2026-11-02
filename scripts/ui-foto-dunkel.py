# [CLAUDE] UI-Test Backlog 863 (Blickwinkel „Fahrer meldet nachts einen Schaden, Foto zu dunkel“): wählt man in „Melden“ oder in der
# Abfahrtskontrolle ein sehr dunkles Foto, erscheint ein Hinweis (Senden bleibt möglich); ein helles Foto ersetzt den Hinweis. Am Vorgang
# meldet das Hochladen eines dunklen Fotos den Hinweis im Toast. DE/UK/EN bei 390/820/1366 px. Frischer Dev-Server nötig.
# Screenshots: CFP_SHOTS=<Ordner>.
import os, tempfile
from PIL import Image
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
DARK={'de':'1 Foto ist sehr dunkel','uk':'1 фото дуже темне','en':'1 photo is very dark'}
DARK2={'de':'2 Fotos sind sehr dunkel','uk':'2 фото дуже темні','en':'2 photos are very dark'}
tmp=tempfile.mkdtemp()
def mk(name,col):
    p=os.path.join(tmp,name); im=Image.new('RGB',(400,300),col)
    for x in range(150,250):
        for y in range(120,180): im.putpixel((x,y),tuple(min(255,c+25) for c in col))
    im.save(p,'JPEG',quality=85); return p
dark1=mk('nacht1.jpg',(12,14,18)); dark2=mk('nacht2.jpg',(30,28,25)); bright=mk('tag.jpg',(150,140,130))
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
def state(q):
    return q.evaluate("()=>{const d=document.querySelector('[data-photodark]');return d?{h:d.hidden,t:d.textContent}:null}")
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ts.inhaber','display_name':'TS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ts.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    site=api('GET','/api/meta')['d']['workshops'][0]['code']; pid=os.getpid()
    vin=f'WDB9634032{pid%10000000:07d}'[:17]; api('POST','/api/vehicles',{'plate':f'TS-FD {pid%9000+1}','vin':vin,'site':'Dortmund'}); vid='VIN:'+vin
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        tag=f'{lang} {w}px'
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ts.inhaber','password':PW}])
        for route,name in [('/#/new','Melden'),(f'/#/check/{vid}','Abfahrtskontrolle')]:
          q.goto(B+route); q.reload(); q.wait_for_selector('#ph',state='attached',timeout=15000)
          q.set_input_files('#ph',[dark1])
          q.wait_for_function("()=>{const d=document.querySelector('[data-photodark]');return d&&!d.hidden}",timeout=10000)
          st=state(q); check(DARK[lang] in st['t'],f"{tag} {name}: Hinweis 1 dunkles Foto ({st['t'][:40]})")
          sb=q.evaluate("()=>{const b=document.querySelector('#ph').form.querySelector('button[type=submit],button:not([type])');return b?!b.disabled:null}")
          check(sb is not False,f'{tag} {name}: Senden bleibt möglich')
          if SHOTS: q.screenshot(path=f'{SHOTS}/fd_{"melden" if route=="/#/new" else "check"}_{lang}_{w}.png',full_page=True)
          q.set_input_files('#ph',[dark1,dark2,bright])
          q.wait_for_function(f"()=>{{const d=document.querySelector('[data-photodark]');return d&&!d.hidden&&d.textContent.includes({DARK2[lang]!r})}}",timeout=10000)
          check(True,f'{tag} {name}: 2 von 3 Fotos dunkel')
          q.set_input_files('#ph',[bright]); q.wait_for_timeout(600)
          check(state(q)['h'],f'{tag} {name}: helles Foto → kein Hinweis')
        # Vorgang: Foto hochladen
        cid=api('POST','/api/cases',{'vehicle_id':vid,'description':f'TS Foto dunkel {lang} {w}','priority':'niedrig','driveability':'fahrbereit','workshop_site':site,'request_key':f'fd-{pid}-{lang}-{w}'})['d']['id']
        q.goto(B+f'/#/cases/{cid}'); q.reload(); q.wait_for_selector('#file',state='attached',timeout=15000)
        q.set_input_files('#file',[dark1])
        q.wait_for_function(f"()=>(document.getElementById('live')||{{}}).textContent&&document.getElementById('live').textContent.includes({DARK[lang]!r})",timeout=15000)
        check(True,f'{tag} Vorgang: Hinweis nach dem Hochladen')
        n=len(api('GET',f'/api/cases/{cid}')['d'].get('files') or [])
        check(n==1,f'{tag} Vorgang: Foto trotzdem angehängt ({n})')
        if SHOTS: q.screenshot(path=f'{SHOTS}/fd_vorgang_{lang}_{w}.png',full_page=True)
        check(not errs,f'{tag}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'ALLES GRÜN'); raise SystemExit(1 if fails else 0)
