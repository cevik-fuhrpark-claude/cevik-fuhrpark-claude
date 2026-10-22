# [CLAUDE] UI-Test (22.10.2026, Fund Teilagent „Inhaber schaltet zwischen Test und Betrieb um“): Inhaber meldet in der Testansicht einen
# Schaden mit 4 Fotos (Upload künstlich verlangsamt) und schaltet währenddessen auf „Betrieb“ – alle Fotos gehen mit der Umgebung der
# Meldung (test) hoch, alle 4 am Vorgang, Postausgang danach leer (vorher: 3 Fotos mit „production“ → 404, Sicherung gelöscht, verloren).
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh); CFP_URL für anderen Port.
import asyncio, os, base64, tempfile
from playwright.async_api import async_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'
JS = """async ([m, path, body, env]) => { const h = { 'content-type': 'application/json', 'x-cfp': '1' }; if (env) h['x-cfp-env']=env;
  const r = await fetch(path, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, d: await r.json().catch(() => null) }; }"""
VIN='VIN:WDB96340310778888'
PNG=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEklEQVR4nGP4z8CAB+GTG8HSALfKY52fjcWfAAAAAElFTkSuQmCC')
fotos=[]
for i in range(4):
    f=os.path.join(tempfile.mkdtemp() if i==0 else os.path.dirname(fotos[0]),f'um-{i}.png'); open(f,'wb').write(PNG+bytes([i])); fotos.append(f)
async def main():
  async with async_playwright() as p:
    br=await p.chromium.launch(); adm=await (await br.new_context()).new_page(); await adm.goto(B)
    api=lambda m,pa,b=None,e=None: adm.evaluate(JS,[m,pa,b,e])
    s=await api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'um.inhaber','display_name':'UM Inhaber'})
    if s['s']==200: await api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    await api('POST','/api/login',{'username':'um.inhaber','password':PW})
    await api('POST','/api/vehicles',{'plate':'UM-FO 1','vin':VIN[4:],'site':'Dortmund'})
    q=await (await br.new_context(viewport={'width':390,'height':844})).new_page(); await q.goto(B)
    await q.evaluate(JS,['POST','/api/login',{'username':'um.inhaber','password':PW},None])
    await q.evaluate("localStorage.setItem('cfp_env','test')"); await q.goto(B+'/#/new'); await q.reload(); await q.wait_for_selector('#d')
    sent=[]
    async def slow(route):
        sent.append(route.request.headers.get('x-cfp-env')); await asyncio.sleep(1.5); await route.continue_()
    await q.route('**/api/cases/*/files', slow)
    await q.locator(f'input[name=veh][value="{VIN}"]').check(force=True); await q.fill('#d','Umschalten FOTO-TEST')
    await q.set_input_files('#ph', fotos)
    await q.click('#sb'); await q.wait_for_timeout(1000)
    await q.select_option('#envsel','production')   # Inhaber schaltet während des Hochladens um
    await q.wait_for_timeout(8000)
    t=await q.evaluate("[...document.querySelectorAll('.toast')].map(x=>x.textContent)")
    c=[x for x in (await api('GET','/api/cases?status=','',"test"))['d']['cases'] if 'FOTO-TEST' in x['description']]
    files=(await api('GET',f"/api/cases/{c[0]['id']}",None,'test'))['d'].get('files',[]) if c else None
    ob=await q.evaluate("Object.entries(localStorage).filter(([k])=>k.startsWith('cfp_outbox_')).map(([k,v])=>v)")
    print('Header je Foto:',sent,'| Hinweise:',t,'| Vorgang (test):',len(c),'| Fotos am Vorgang:',None if files is None else len(files),'| Postausgang:',ob)
    check(sent==['test']*4,'alle Fotos mit Umgebung der Meldung (test) gesendet')
    check(len(c)==1 and files is not None and len(files)==4,'4 Fotos am Test-Vorgang')
    check(all(v=='[]' for v in ob),'Postausgang leer')
    check(not any('nicht' in x or 'not' in x for x in t),'kein Hinweis auf fehlgeschlagene Fotos')
    await q.goto(B+'/#/'); await q.wait_for_timeout(4000)
    files=(await api('GET',f"/api/cases/{c[0]['id']}",None,'test'))['d'].get('files',[])
    print('nach erneutem Seitenwechsel: Fotos', len(files), 'Postausgang', await q.evaluate("Object.entries(localStorage).filter(([k])=>k.startsWith('cfp_outbox_')).map(([k,v])=>v)"))
    await br.close()
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
asyncio.run(main())
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
