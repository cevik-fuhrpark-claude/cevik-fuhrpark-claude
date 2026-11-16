# [CLAUDE] UI-Test (16.11.2026, Backlog 1534, Blickwinkel „Fahrer schreibt die Meldung auf Griechisch“):
# Meldeformular zeigt bei griechischen Stichwörtern (Tabelle GR_KINDS im still nachgeladenen Modul app-sprachen.js) dieselben Hinweise wie bei den anderen
# Sprachen und keine weiteren (genau der erwartete Hinweis sichtbar), auch bei vorangestelltem Verb („Έσκασε το λάστιχο“); Reparaturvermerk, Verneinung,
# Feuerlöscher, Stau, Warnblinker, „Όλα καλά“ ohne; „Βγαίνει μαύρος καπνός από την εξάτμιση“ zeigt den Motor-Hinweis statt Brand. DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[["Τα φρένα δεν πιάνουν", "brake"], ["ΤΑ ΦΡΕΝΑ ΔΕΝ ΠΙΑΝΟΥΝ", "brake"], ["Δεν πιάνουν τα φρένα", "brake"], ["Τα φρένα δεν δουλεύουν καλά", "brake"], ["Πέφτει η πίεση του αέρα", "brake"], ["Το χειρόφρενο δεν κρατάει", "parkbrake"], ["Το χειρόφρενο κόλλησε", "parkbrake"], ["Έσκασε το λάστιχο", "flat"], ["Το λάστιχο τρύπησε", "flat"], ["Το λάστιχο ξεφούσκωσε", "flat"], ["Έπαθα λάστιχο, η ρόδα έσκασε", "flat"], ["Το λάστιχο είναι φαγωμένο", "tyre"], ["Δεν παίρνει μπρος", "nostart"], ["Ο κινητήρας δεν ξεκινάει", "nostart"], ["Το φορτηγό δεν ανάβει", "nostart"], ["Ο κινητήρας έσβησε", "nostart"], ["Ο κινητήρας ζεσταίνεται", "engine"], ["Ο κινητήρας υπερθερμάνθηκε", "engine"], ["Ο κινητήρας κάνει θόρυβο", "engine"], ["Βγαίνει μαύρος καπνός από την εξάτμιση", "engine"], ["Η μηχανή χτυπάει", "engine"], ["Πήρε φωτιά η καμπίνα", "fire"], ["Βγαίνει καπνός από την καμπίνα", "fire"], ["Η καμπίνα καίγεται", "fire"], ["Τρέχουν λάδια", "leak"], ["Στάζει πετρέλαιο", "leak"], ["Διαρροή αντιψυκτικού", "leak"], ["Τρακάρισα με ένα αυτοκίνητο", "acc"], ["Είχα τροχαίο", "acc"], ["Έγινε ατύχημα", "acc"], ["Χτύπησα σε μια κολόνα", "acc"], ["Ο οδηγός τραυματίστηκε", "injury"], ["Είχα ατύχημα, ο οδηγός τραυματίστηκε", "acc"], ["Άναψε η λάμπα του κινητήρα", "warnlight"], ["Ανάβει το λαμπάκι του λαδιού", "warnlight"], ["Βγάζει σφάλμα στο ταμπλό", "warnlight"], ["Ράγισε το παρμπρίζ", "glass"], ["Μια πέτρα χτύπησε το παρμπρίζ και ράγισε", "glass"], ["Ο καθρέφτης έσπασε", "mirror"], ["Τα φώτα δεν ανάβουν", "lights"], ["Κάηκε η λάμπα", "lights"], ["Το φανάρι δεν δουλεύει", "lights"], ["Η μπαταρία άδειασε", "batt"], ["Έπεσε η μπαταρία", "batt"], ["Ο ταχογράφος δεν διαβάζει την κάρτα", "tacho"], ["Έχασα την κάρτα οδηγού", "tacho"], ["Η κάρτα καυσίμων δεν περνάει", "fuelcard"], ["Έχασα τα κλειδιά", "lost"], ["Χάθηκε η άδεια κυκλοφορίας", "lost"], ["Ο πέμπτος τροχός δεν κλειδώνει", "coupling"], ["Το ημιρυμουλκούμενο δεν κουμπώνει", "coupling"], ["Η σέλα δεν ανοίγει", "coupling"], ["Τελείωσε το πετρέλαιο", "dryfuel"], ["Έμεινα από πετρέλαιο", "dryfuel"], ["Το ντεπόζιτο είναι άδειο", "dryfuel"], ["Το ψυγείο δεν κρυώνει", "reefer"], ["Το Thermo King βγάζει σφάλμα, το ψυγείο δεν δουλεύει", "reefer"], ["Η φούσκα της αερανάρτησης έσκασε", "susp"], ["Το αμορτισέρ τρέχει λάδια", "susp"], ["Δεν μπαίνουν οι ταχύτητες", "gear"], ["Ο συμπλέκτης γλιστράει", "gear"], ["Το σασμάν χάλασε", "gear"], ["Το καλοριφέρ δεν ζεσταίνει", "climate"], ["Το κλιματιστικό δεν δουλεύει", "climate"], ["Το webasto δεν ανάβει", "climate"], ["Η θέρμανση του καθίσματος δεν δουλεύει", "cabkit"], ["Ο μουσαμάς σκίστηκε", "tarp"], ["Η εξάτμιση έπεσε", "exhaust"], ["Οι υαλοκαθαριστήρες δεν δουλεύουν", "visib"], ["Η ζώνη δεν κουμπώνει", "seat"], ["Το κάθισμα έσπασε", "seat"], ["Τα παξιμάδια της ρόδας χαλάρωσαν", "wheel"], ["Λείπει ένα μπουλόνι από τη ζάντα", "wheel"], ["Κόλλησα στη λάσπη", "stuck"], ["Το φορτηγό βούλιαξε στο χιόνι", "stuck"], ["Έπεσε η πινακίδα", "numplate"], ["Η κάμερα δεν δουλεύει", "adas"], ["Η πόρτα δεν κλείνει", "door"], ["Η υδραυλική πόρτα δεν δουλεύει", "door"], ["Το τζάμι δεν κατεβαίνει", "window"], ["Το τιμόνι είναι βαρύ", "steer"], ["Τραβάει δεξιά", "steer"], ["Το τιμόνι τρέμει", "steer"], ["Οι πόρτες δεν ανοίγουν", "door"]]
NO=["Όλα καλά", "Τα φρένα επισκευάστηκαν", "Αλλάξαμε το λάστιχο", "Ξανά δουλεύει", "Τα φρένα δουλεύουν κανονικά", "Λείπει ο πυροσβεστήρας", "Η καμπίνα έχει ζημιά", "Το λάστιχο δεν έσκασε", "Ο καθρέφτης δεν είναι σπασμένος", "Δεν τρέχει λάδι", "Κανένα πρόβλημα", "Κόλλησα στην κίνηση", "Άναψα τα αλάρμ", "Δεν τράκαρα", "Άναψα τα φώτα", "Φτιάχτηκε το φρένο", "Το τζάμι δεν είναι σπασμένο", "Καπνίζω", "Ο κινητήρας δουλεύει", "Δεν υπάρχει πρόβλημα", "Χωρίς διαρροή"]
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'gr.inhaber','display_name':'GR Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='gr.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM76' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nGR-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':user,'password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        for txt,want in CASES:
            q.fill('#d',txt); q.wait_for_timeout(100)
            shown=q.evaluate("[...document.querySelectorAll('.panel[role=status]')].filter(e=>!e.hidden&&e.id).map(e=>e.id)")
            check(shown==[want],f'{lang}/{w}: „{txt}“ → {want} (sichtbar: {shown})')
            if SHOTS and txt in ('Τα φρένα δεν πιάνουν','Το ψυγείο δεν κρυώνει','Έχασα τα κλειδιά'): q.locator('#'+want).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/gr-{CASES.index([txt,want])}-{lang}-{w}.png')
        for txt in NO:
            q.fill('#d',txt); q.wait_for_timeout(100)
            shown=q.evaluate("[...document.querySelectorAll('.panel[role=status]')].filter(e=>!e.hidden&&e.id).map(e=>e.id)")
            check(not shown,f'{lang}/{w}: „{txt}“ ohne Hinweis {shown}')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        q.fill('#d','')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
