# [CLAUDE] UI-Test Backlog 864 (Blickwinkel „Fahrer meldet einen Schaden, Foto verwackelt/unscharf“): wählt man in „Melden“ oder in der
# Abfahrtskontrolle ein stark unscharfes Foto, erscheint ein Hinweis (Senden bleibt möglich); ein scharfes Foto ersetzt den Hinweis, ein
# sehr dunkles Foto meldet nur „dunkel“. Am Vorgang meldet das Hochladen eines unscharfen Fotos den Hinweis im Toast. DE/UK/EN bei
# 390/820/1366 px. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os, tempfile
from PIL import Image, ImageDraw, ImageFilter
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
BLUR={'de':'1 Foto wirkt stark verwackelt','uk':'1 фото сильно розмите','en':'1 photo looks badly shaken'}
BLUR2={'de':'2 Fotos wirken stark verwackelt','uk':'2 фото сильно розмиті','en':'2 photos look badly shaken'}
tmp=tempfile.mkdtemp()
def scene():
    im=Image.new('RGB',(1200,900),(170,170,165)); d=ImageDraw.Draw(im)
    for i in range(0,1200,60): d.rectangle([i,300,i+28,600],fill=(40,45,60))
    for y in range(80,260,22): d.line([(100,y),(1100,y)],fill=(20,20,20),width=3)
    d.ellipse([500,620,800,860],outline=(200,30,30),width=12); return im
def save(im,name): p=os.path.join(tmp,name); im.save(p,'JPEG',quality=88); return p
sharp=save(scene(),'scharf.jpg'); blur1=save(scene().filter(ImageFilter.GaussianBlur(30)),'unscharf1.jpg'); blur2=save(scene().filter(ImageFilter.GaussianBlur(40)),'unscharf2.jpg')
dark=save(Image.new('RGB',(400,300),(12,14,18)),'nacht.jpg')
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
def state(q,sel):
    return q.evaluate(f"()=>{{const d=document.querySelector('[{sel}]');return d?{{h:d.hidden,t:d.textContent}}:null}}")
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ts.inhaber','display_name':'TS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ts.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    site=api('GET','/api/meta')['d']['workshops'][0]['code']; pid=os.getpid()
    vin=f'WDB9634033{pid%10000000:07d}'[:17]; api('POST','/api/vehicles',{'plate':f'TS-FU {pid%9000+1}','vin':vin,'site':'Dortmund'}); vid='VIN:'+vin
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        tag=f'{lang} {w}px'
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ts.inhaber','password':PW}])
        for route,name in [('/#/new','Melden'),(f'/#/check/{vid}','Abfahrtskontrolle')]:
          q.goto(B+route); q.reload(); q.wait_for_selector('#ph',state='attached',timeout=15000)
          q.set_input_files('#ph',[blur1])
          q.wait_for_function("()=>{const d=document.querySelector('[data-photoblur]');return d&&!d.hidden}",timeout=10000)
          st=state(q,'data-photoblur'); check(BLUR[lang] in st['t'],f"{tag} {name}: Hinweis 1 unscharfes Foto ({st['t'][:40]})")
          check(state(q,'data-photodark')['h'],f'{tag} {name}: kein Dunkel-Hinweis')
          sb=q.evaluate("()=>{const b=document.querySelector('#ph').form.querySelector('button[type=submit],button:not([type])');return b?!b.disabled:null}")
          check(sb is not False,f'{tag} {name}: Senden bleibt möglich')
          if SHOTS: q.screenshot(path=f'{SHOTS}/fu_{"melden" if route=="/#/new" else "check"}_{lang}_{w}.png',full_page=True)
          q.set_input_files('#ph',[blur1,blur2,sharp])
          q.wait_for_function(f"()=>{{const d=document.querySelector('[data-photoblur]');return d&&!d.hidden&&d.textContent.includes({BLUR2[lang]!r})}}",timeout=10000)
          check(True,f'{tag} {name}: 2 von 3 Fotos unscharf')
          q.set_input_files('#ph',[sharp]); q.wait_for_timeout(800)
          check(state(q,'data-photoblur')['h'],f'{tag} {name}: scharfes Foto → kein Hinweis')
          q.set_input_files('#ph',[dark])
          q.wait_for_function("()=>{const d=document.querySelector('[data-photodark]');return d&&!d.hidden}",timeout=10000)
          check(state(q,'data-photoblur')['h'],f'{tag} {name}: dunkles Foto → nur Dunkel-Hinweis')
        cid=api('POST','/api/cases',{'vehicle_id':vid,'description':f'TS Foto unscharf {lang} {w}','priority':'niedrig','driveability':'fahrbereit','workshop_site':site,'request_key':f'fu-{pid}-{lang}-{w}'})['d']['id']
        q.goto(B+f'/#/cases/{cid}'); q.reload(); q.wait_for_selector('#file',state='attached',timeout=15000)
        q.set_input_files('#file',[blur1])
        q.wait_for_function(f"()=>(document.getElementById('live')||{{}}).textContent&&document.getElementById('live').textContent.includes({BLUR[lang]!r})",timeout=15000)
        check(True,f'{tag} Vorgang: Hinweis nach dem Hochladen')
        n=len(api('GET',f'/api/cases/{cid}')['d'].get('files') or [])
        check(n==1,f'{tag} Vorgang: Foto trotzdem angehängt ({n})')
        if SHOTS: q.screenshot(path=f'{SHOTS}/fu_vorgang_{lang}_{w}.png',full_page=True)
        check(not errs,f'{tag}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'ALLES GRÜN'); raise SystemExit(1 if fails else 0)
