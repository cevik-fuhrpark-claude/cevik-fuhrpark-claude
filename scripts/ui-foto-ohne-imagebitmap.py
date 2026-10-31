# [CLAUDE] UI-Prüfung (31.10.2026, Backlog 795, Blickwinkel „Fahrer mit älterem Handy/Browser“): createImageBitmap fehlt in iOS/Safari < 15.
# Fotos wurden dort nicht verkleinert – ein Handyfoto über 5 MB scheiterte mit „Datei zu groß“. Jetzt dekodiert die App das Bild dann über <img>.
# Das Skript entfernt createImageBitmap vor dem Laden und lädt am Vorgang ein großes JPEG (4000×3000, > 5 MB) und ein hochkant gedrehtes
# (EXIF-Drehung 6) hoch: beide müssen ankommen, ≤ 1600 px und klein sein, das gedrehte hochkant. Gegenprobe mit createImageBitmap (neuer Browser).
# DE/UK/EN, 390 und 1366 px, keine Skriptfehler. Dev-Server: CFP_URL. Screenshots: CFP_SHOTS=<Ordner>.
import os, io, uuid, random
from PIL import Image
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
DL = """async (id) => { const r = await fetch('/api/files/' + id); const b = new Uint8Array(await r.arrayBuffer()); let s = ''; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode(...b.subarray(i, i + 8192)); return btoa(s); }"""
NOBMP = "delete window.createImageBitmap; window.createImageBitmap = undefined;"
def big_jpeg():
    im=Image.frombytes('RGB',(4000,3000),os.urandom(4000*3000*3))
    b=io.BytesIO(); im.save(b,'JPEG',quality=90); return b.getvalue()
def rotated_jpeg():
    im=Image.new('RGB',(3000,2000),(30,90,160)); ex=Image.Exif(); ex[0x0112]=6
    b=io.BytesIO(); im.save(b,'JPEG',quality=85,exif=ex.tobytes()); return b.getvalue()
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
BIG=big_jpeg(); ROT=rotated_jpeg()
check(len(BIG)>5*1024*1024,f'Testfoto größer als 5 MB ({len(BIG)//1024} KB)')
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ib.inhaber','display_name':'IB Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ib.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    sfx=str(uuid.uuid4().int)[:4]; vin='WMA15SZZ2HM76'+sfx
    check(api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nIB-ZM {sfx};Dortmund;MAN;2016;{vin};Lkw','text/csv')['s']==200,'Fahrzeug importiert')
    for lang in ['de','uk','en']:
        for w in [390,1366]:
            for old in [True,False]:
                tag=f'{lang} {w} {"ohne createImageBitmap" if old else "mit createImageBitmap"}'
                cid=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':f'Stoßfänger hinten eingedrückt {tag}','priority':'mittel','driveability':'fahrbereit','request_key':str(uuid.uuid4())})['d']['id']
                ctx=br.new_context(viewport={'width':w,'height':900})
                if old: ctx.add_init_script(NOBMP)
                q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
                q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ib.inhaber','password':PW},None]); q.evaluate(JS,['PATCH','/api/me',{'language':lang},None])
                q.goto(B+'/#/cases/'+cid); q.reload(); q.wait_for_selector('#file',state='attached',timeout=20000)
                if old: check(q.evaluate('()=>typeof createImageBitmap!=="function"'),f'{tag}: alter Browser nachgebildet')
                for n,(name,data) in enumerate([('gross.jpg',BIG),('hochkant.jpg',ROT)]):
                    q.set_input_files('#file',{'name':name,'mimeType':'image/jpeg','buffer':data})
                    try: q.wait_for_selector(f'.thumbs figure.thumb:nth-of-type({n+1})',timeout=30000)
                    except Exception: pass
                fl=api('GET',f'/api/cases/{cid}')['d'].get('files') or []
                check(len(fl)==2,f'{tag}: beide Fotos angekommen ({len(fl)})')
                for f in fl:
                    im=Image.open(io.BytesIO(__import__('base64').b64decode(q.evaluate(DL,f['id']))))
                    check(max(im.size)<=1600 and f['size']<2*1024*1024,f'{tag}: {f["filename"]} verkleinert ({im.size[0]}×{im.size[1]}, {f["size"]//1024} KB)')
                    if 'hochkant' in f['filename']: check(im.size[1]>im.size[0],f'{tag}: EXIF-Drehung beachtet (hochkant {im.size})')
                check(not q.locator('.toast.err').count(),f'{tag}: keine Fehlermeldung')
                check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{tag}: ohne Querscrollen')
                if SHOTS: q.screenshot(path=f"{SHOTS}/foto-ohne-bitmap-{lang}-{w}-{int(old)}.png")
                check(not errs,f'{tag}: keine Skriptfehler {errs[:1]}')
                ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün'); raise SystemExit(1 if fails else 0)
