// [CLAUDE] AUTOMATISCH ERZEUGT durch scripts/build-app.mjs aus public/app.js – nicht von Hand bearbeiten (Code in app.js ändern, dann npm run build)
import {  } from './app-main.js';















const TR_OK = /(?:tamir|onarim)\s+(?:edildi|yapildi)|duzel(?:di|tildi)|degistir(?:ildi|dim|dik)|onarildi|giderildi|halledildi|(?:sorun|problem)\S*\s+yok|\bdegil\b/;
const TR_KINDS = [['brake', /\bfren(?:ler|im|leri|lerim)?\s+(?:\S+\s+)?(?:tutmuyor|bosa|yok\b|calismiyor|zayif|kilitlen|sikis|isin)|\bfren\s+havasi|\bhava\s+basinci\s+(?:\S+\s+)?dus/, /lamba|asistan|acil\s+fren/],
  ['fire', /\byangin|\balev\s+(?:al|cik|var)|\bduman\s+(?:\S+\s+)?(?:cik|gel|var|tut)|\byanik\s+koku|\bkablo\S*\s+(?:yandi|eridi)/, /egzoz|sondur/],
  ['flat', /\b(?:lasti(?:k|gi|gim|kler)|teker\S*)\s+(?:\S+\s+)?(?:patla|indi\b|inik|sondu|yirtil)|\bpatlak\s+lastik/],
  ['steer', /\bdireksiyon\S*\s+(?:\S+\s+)?(?:kilitlen|kitlen|agir|sert|bosluk|tutmuyor|donmuyor|cekiyor)|\b(?:arac|kamyon|tir)\s+(?:\S+\s+)?(?:saga|sola)\s+cekiyor/],
  ['leak', /\b(?:yag|mazot|motorin|dizel|antifriz|hidrolik|adblue)\S*\s+(?:\S+\s+)?(?:kacir|akiyor|sizdir|sizinti|damli|kacag)/],
  ['acc', /\bkaza\s+(?:yaptim|yaptik|yapti|oldu|gecir)|\bcarp(?:tim|tik|ti|isti|isma)/, /\btas\b|\bcam\b/],

  ['acc', /\b(?:devril(?!me)|takla\s+att|yan\s+yatt|yoldan\s+cikt|sarampol)/, /\b(?:yuk|yukler|yuku|palet|paletler|koli|kasa)\b|devrilme|cikmad|dusmed|girmed|kaymad|\bdegil\b/],

  ['acc', /\bhendeg(?:e|e\s+dogru)\s+(?:\S+\s+)?(?:dust|girdi|girdik|girdim|kaydi|kaydik|uctu|yuvarlan)/, /\b(?:yuk|yukler|yuku|palet|paletler|koli|kasa)\b|dusmed|girmed|kaymad|\bdegil\b/],

  ['stuck', /\bsarampol|\bhendeg(?:e|de)\b|\bhendekte\b/, /\b(?:yuk|yukler|yuku|palet|paletler|koli|kasa)\b|dusmed|girmed|kaymad/],

  ['acc', /\b(?:kamyon|tir|arac|araba|dorse|romork|cekici|kamyonet|minibus|panelvan)\S*\s+(?:\S+\s+)?hendekte\b|\bhendekteyi[mz]\b/, /\b(?:yuk|yukler|yuku|palet|paletler|koli|kasa)\b|\bdegil/],

  ['acc', /\bters\s+don(?:du|mus)/, /\b(?:yuk|yukler|yuku|yuklerin|palet|paletler|koli|koliler|kolilerin|kasa|kutular)\b/],
  ['injury', /\byaralan|\byarali\b|\bambulans/],
  ['nostart', /\b(?:motor|arac|kamyon|tir)\s+(?:\S+\s+)?(?:calismiyor|calismadi|baslamiyor)|\bmars\s+(?:\S+\s+)?(?:basmiyor|almiyor)/],
  ['mirror', /\bayna\S*\s+(?:\S+\s+)?(?:kiri|kirdim|dustu|koptu|catla|yok\b|ayarlanmiyor|oynuyor|gevse)/],
  ['lights', /\b(?:far(?:lar|im|i)?|stop|sinyal\S*|dortlu\S*|lamba\S*|ampul\S*)\s+(?:\S+\s+)?(?:yanmiyor|calismiyor|patladi|kiri|bozuk)/, /ariza|uyari/],
  ['warnlight', /\b(?:ariza|uyari)\s+(?:isigi|lambasi)\s+(?:\S+\s+)?yan/],
  ['glass', /\bcam\S*\s+(?:\S+\s+)?(?:kiri|kirdi|catla|patla)|\bcamda\s+(?:\S+\s+)?catlak/, /ayna|kapi/],
  ['window', /\bcam\S*\s+(?:\S+\s+)?(?:acilmiyor|kapanmiyor|inmiyor|kalkmiyor)/],
  ['batt', /\baku\S*\s+(?:\S+\s+)?(?:bitti|bitik|bosaldi|bos\b|zayif|sarj\s+(?:olmuyor|tutmuyor)|sisti)/],
  ['tacho', /\btakograf\S*\s+(?:\S+\s+)?(?:calismiyor|ariza|bozuk|hata|okumuyor)|\b(?:sofor|surucu)\s+kart\S*\s+(?:\S+\s+)?(?:okunmuyor|kayboldu|kaybettim|kirildi|bozuk|takili|cikmiyor|calismiyor)/],
  ['coupling', /\b(?:dorse|treyler|romork)\S*\s+(?:\S+\s+)?(?:baglanmiyor|kilitlenmiyor|ayrilmiyor|koptu|kopmus)|\b(?:besinci\s+teker|semer)\S*\s+(?:\S+\s+)?(?:kilitlenmiyor|kilitlemiyor|acilmiyor|kapanmiyor|bozuk)/],
  ['dryfuel', /\b(?:mazot|motorin|yakit|dizel)\S*\s+(?:\S+\s+)?(?:bitti|kalmadi)/, /frigo|sogutucu|ermo\s*king/],
  ['engine', /\bmotor\s+(?:\S+\s+)?(?:isiniyor|isindi|kaynatti|kaynatiyor|hararet)|\bhararet\s+(?:yapti|yapiyor|var)|\b(?:motor|arac|kamyon|tir)\s+(?:\S+\s+)?(?:cekmiyor|guc\s+kaybediyor)|\bguc\s+kaybi/],
  ['tyre', /\blasti(?:k|gi|kler)\S*\s+(?:\S+\s+)?(?:kesik|kesildi|yirtik|asin|kabardi|catlak|hava\s+kacir|havasi\s+(?:az|dusuk|eksik))/],

  ['flat', /\blasti(?:k|gi|gim|kler|klerin|klerim)\S*\s+(?:\S+\s+)?(?:bozuk|bozuldu|bozulmus|bozulmustu|kullanilamaz|mahvol\S*|hurda)/, /yedek|silecek|conta|stepne/],
  ['tyre', /\blasti(?:k|gi|gim|kler|klerin|klerim)\S*\s+(?:\S+\s+)?hasar\S*/, /yedek|silecek|conta|stepne|patla|indi\b|inik/],
  ['reefer', /\b(?:frigo\S*|sogutucu\S*|t?h?ermo\s*king\S*|carrier)\s+(?:\S+\s+)?(?:calismiyor|sogutmuyor|durdu|bozuk|ariza|alarm|kapandi|bitti)|\bkasa\s+(?:\S+\s+)?sogutmuyor/, /klima/],
  ['susp', /\b(?:koruk\S*|hava\s+yastig\S*|suspansiyon\S*|makas\S*)\s+(?:\S+\s+)?(?:patla|indi\b|bozuk|kiri|hava\s+kacir|calismiyor)|\b(?:dorse|arac|kamyon|tir)\s+(?:\S+\s+)?(?:yana\s+yatti|egik\s+duruyor)/],
  ['gear', /\bvites\S*\s+(?:\S+\s+)?(?:gecmiyor|girmiyor|takilmiyor|atmiyor|bozuk)|\bsanziman\S*\s+(?:\S+\s+)?(?:ariza|bozuk|calismiyor)|\bdebriyaj\S*\s+(?:\S+\s+)?(?:kacir|patinaj|tutmuyor|bosa)/],
  ['climate', /\b(?:klima|kalorifer|isitici|webasto)\S*\s+(?:\S+\s+)?(?:calismiyor|bozuk|sogutmuyor|isitmiyor|ariza)/, /koltuk/],
  ['tarp', /\bbranda\S*\s+(?:\S+\s+)?(?:yirtil|yirtik|delik|delindi|koptu|acildi|uctu)/],
  ['exhaust', /\begzoz\S*\s+(?:\S+\s+)?(?:patla|delik|delindi|koptu|dustu|ses\s+yap|kacir)/],
  ['visib', /\bsilecek\S*\s+(?:\S+\s+)?(?:calismiyor|bozuk|kirildi|koptu|silmiyor|durdu|ariza)|\bcam(?:lar)?\s+(?:\S+\s+)?bugulan/],
  ['seat', /\b(?:emniyet\s+)?kemer\S*\s+(?:\S+\s+)?(?:takilmiyor|kilitlenmiyor|oturmuyor|sarmiyor|toplanmiyor|kopuk|koptu|yirtik|yirtildi|bozuk)|\bkoltu(?:k|gu|gum)\S*\s+(?:\S+\s+)?(?:kirildi|kirik|inmiyor|kalkmiyor|ayarlanmiyor|oynuyor|sallaniyor|bozuk)/, /isit/],
  ['wheel', /\bbijon\S*\s+(?:\S+\s+)?(?:gevse|koptu|kopmus|eksik|dustu|yok\b)|\bjant\S*\s+(?:\S+\s+)?(?:catla|kirildi|kirik|egildi|egri)|\b(?:teker\S*|poyra\S*|rulman\S*)\s+(?:\S+\s+)?(?:sallaniyor|oynuyor|gevse|isindi|kizdi|yandi)/],
  ['stuck', /\b(?:camur|kar|toprag|kum|batakl)\S*\s+(?:\S+\s+)?(?:saplan|batti|gomul)|\b(?:arac|kamyon|tir|dorse)\s+(?:\S+\s+)?(?:saplandi|gomuldu)|\bbuzda\s+(?:\S+\s+)?(?:kayiyor|kaydi|ilerlemiyor|cikamiyor)/],
  ['lost', /\b(?:anahtar|ruhsat)\S*\s+(?:\S+\s+)?(?:kayboldu|kaybettim|kaybolmus|bulamiyorum|yok\b)/],
  ['numplate', /\bplaka\S*\s+(?:\S+\s+)?(?:dustu|dusmus|kayboldu|calindi|koptu|kirildi|okunmuyor|yok\b)/, /lamba|isig/],
  ['adas', /\b(?:asistan|serit\s+takip|acil\s+fren|mesafe\s+(?:sensor|radar))\S*\s+(?:\S+\s+)?(?:calismiyor|ariza|bozuk|hata|kapandi)|\b(?:kendi\s+kendine|sebepsiz|durduk\s+yere)\s+(?:\S+\s+)?fren\s+yap/],
  ['door', /\bkapi\S*\s+(?:\S+\s+)?(?:kapanmiyor|acilmiyor|kilitlenmiyor|bozuk|kiri)|\b(?:lift|asansor)\S*\s+(?:\S+\s+)?(?:calismiyor|kalkmiyor|inmiyor|kapanmiyor|acilmiyor|bozuk|ariza)/, /\bcam/]];
const trFold = (s) => String(s || '').replace(/[İI]/g, 'i').toLowerCase().replace(/[ışğçöü]/g, (c) => 'isgcou'['ışğçöü'.indexOf(c)]);
const TR_NEG = /\b(?:patla|kiril|catla|kop|yirtil|delin|ezil|bozul|sizdir|akit)(?:ma|me)(?:di|mis|yor)\S*|\b(?:inmedi|inmemis|akmiyor|akmadi|sizmiyor|sizmadi)\b/g;
function trKinds(v) { const k = new Set(); for (const p of trFold(v).replace(TR_NEG, ' ').split(/[.,;!?\n]+/)) if (!TR_OK.test(p)) for (const [n, rx, ex] of TR_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); if (k.has('acc')) k.delete('injury'); return k; }



const PL_OK = /naprawi|wymienio|wymienil|juz\s+dziala|bez\s+problem|nie\s+ma\s+problemu|wszystko\s+(?:ok|w\s+porzadku)/;
const PL_KINDS = [['brake', /\bhamul(?:ce|ec|ca|cy|cow)\s+(?:\S+\s+)?(?:nie\s+(?:dziala|trzyma|hamuj)|sie\s+(?:blokuj|zablok|grzej|przegrz)|slab|zawiod|puszcz)|\b(?:slabo|nie|zle)\s+hamuje|\b(?:brak|spada|ucieka|niskie)\s+(?:\S+\s+)?cisnieni\S*\s+(?:w\s+)?(?:powietrz|ukladzie\s+hamulc)/, /swiatl|reczn|postojow|asystent|bez\s+powodu/],
  ['fire', /\bpozar|\bogien|\b(?:kabina|silnik|opona|naczepa|auto|samochod|ciezarowka|kolo)\s+(?:sie\s+)?(?:pali\b|zapalil|zapalila|plonie)|\bpali\s+sie\s+(?:\S+\s+)?(?:kabina|silnik|opona|naczepa|auto|kolo)|\bdym\S*\s+(?:\S+\s+)?(?:leci|idzie|wydobywa|z\s+(?:silnika|kabiny|maski|deski)|spod)|\bdymi\s+sie|\b(?:czuc|smierdzi|zapach)\s+(?:\S+\s+)?(?:spalenizn|spalon|palon)|\bswad\b|\bkabel\S*\s+(?:\S+\s+)?(?:stopil|spalil|przepalil)/, /wydech|tlumik|gasnic|kontrolk|lampk|sprzegl|klock/],
  ['flat', /\b(?:opon\S*|kol[oa]|guma|gume)\s+(?:\S+\s+)?(?:przebit|pekl|wybuchl|wystrzelil|strzelil|eksplod|zeszl|flak|kapc)|\b(?:pekl|wybuchl|wystrzelil|strzelil)\S*\s+(?:\S+\s+)?(?:opon|gum)|\bzlapal\S*\s+(?:\S+\s+)?(?:gume|kapcia|flaka)|\bkapec\b|\bflak\b/],
  ['steer', /\bkierownic\S*\s+(?:\S+\s+)?(?:zablokow|zaciel|ciezk|chodzi\s+ciezko|luz|nie\s+(?:kreci|skreca|dziala))|\bukl\S*\s+kierownicz\S*\s+(?:\S+\s+)?(?:nie\s+dziala|awari)|\b(?:auto|samochod|ciezarowka|ciagnik)\s+(?:\S+\s+)?(?:sciaga|ciagnie)\s+(?:w\s+|na\s+)?(?:prawo|lewo)/],
  ['leak', /\b(?:olej|ropa|ropy|paliwo|plyn|diesel|adblue)\S*\s+(?:\S+\s+)?(?:cieknie|kapie|wycieka|leci|ucieka|sie\s+leje)|\bwyciek\S*\s+(?:\S+\s+)?(?:olej|paliw|ropy|plyn|adblue|diesl)|\b(?:cieknie|kapie|wycieka|leje\s+sie)\s+(?:\S+\s+)?(?:olej|ropa|paliwo|plyn|diesel|adblue)/],
  ['acc', /\b(?:mialem|mielismy|zdarzyl\S*|spowodowal\S*)\s+(?:\S+\s+)?(?:wypadek|kolizj|stluczk)|\bwypadek\b|\bkolizj|\bstluczk|\b(?:uderzyl|walnal|wjechal|najechal|otarl|zarysowal|cofajac\s+uderzyl)\S*/, /kamien|kamyk/],

  ['acc', /\b(?:przewrocil|wywrocil|dachowal)\S*|\b(?:zjechal|wypadl)\S*\s+(?:\S+\s+)?z\s+(?:drogi|jezdni|trasy)|\b(?:wpadl|wjechal|zjechal|zsunal)\S*\s+(?:\S+\s+)?do\s+rowu|\bw\s+rowie\b/, /ladun|towar|palet|skrzyn|karton|\bnie\s+(?:\S+\s+)?(?:przewroc|wywroc|zjechal|wpadl|dachowal|wjechal|zsunal|stoi|stoimy|jest|jestem|jestesmy|lezy)/],

  ['stuck', /\bdo\s+rowu\b|\bw\s+rowie\b|\butkn[ae]l\S*\s+(?:\S+\s+)?w\s+(?:blocie|sniegu|piachu|piasku|bagnie|rowie)/, /ladun|towar|palet|skrzyn|karton|\bnie\s+(?:\S+\s+)?(?:wpadl|wjechal|zjechal|zsunal|stoi|utkn|jest|jestem|jestesmy|lezy)/],
  ['injury', /\branny\b|\branna\b|\bzranion|\bzranil|\bkaretk|\bambulans/],
  ['parkbrake', /\bhamul\S*\s+reczn\S*\s+(?:\S+\s+)?(?:nie\s+(?:trzyma|dziala|puszcza|zaciaga)|zepsut|zaciel)|\b(?:auto|samochod|ciezarowka|naczepa|ciagnik)\s+(?:sie\s+|mi\s+)?(?:stoczyl|zjechal)/],
  ['nostart', /\b(?:silnik|auto|samochod|ciezarowka|ciagnik)\s+(?:\S+\s+)?nie\s+(?:odpala|zapala|startuje|chce\s+odpalic)|\brozrusznik\S*\s+(?:\S+\s+)?nie\s+(?:kreci|dziala)|\bnie\s+(?:moge|mozna)\s+odpalic/],
  ['mirror', /\b(?:bez|brak|brakuje)\s+(?:\S+\s+)?lusterk|\blusterk\S*\s+(?:\S+\s+)?(?:urwan|urwal|pekl|pekniet|zbit|rozbit|odpadl|lata|luzn|nie\s+(?:dziala|reguluj|da\s+sie))|\b(?:urwan|pekniet|rozbit|zbit)\S*\s+lusterk/],
  ['lights', /\b(?:swiatl\S*|reflektor\S*|lamp[ay]\b|kierunkowskaz\S*|migacz\S*|stop\S*|zarowk\S*|awaryjn\S*)\s+(?:\S+\s+)?(?:nie\s+(?:dziala|swiec|pal)|przepalon|przepalil|zbit|rozbit|pekl)|\bprzepalon\S*\s+(?:\S+\s+)?(?:zarowk|swiatl)/, /kontrol|ostrzega/],
  ['warnlight', /\b(?:kontrolk\S*|lampk\S*|check\s+engine)\s+(?:\S+\s+)?(?:sie\s+)?(?:pali|swieci|zapalil|miga|wyskoczyl)|\b(?:pali|swieci|zapalil\S*)\s+sie\s+(?:\S+\s+)?(?:kontrolk|lampk|check)/],
  ['glass', /\bszyb\S*\s+(?:\S+\s+)?(?:pekl|pekniet|zbit|rozbit|odprysk)|\b(?:pekniet|zbit|rozbit)\S*\s+(?:przedni\S*\s+)?szyb|\bodprysk/, /lusterk/],
  ['window', /\bszyb\S*\s+(?:\S+\s+)?nie\s+(?:otwier|zamyk|opuszcz|podnos|zjezdz|wjezdz)|\bpodnosnik\S*\s+szyb\S*\s+(?:\S+\s+)?(?:nie\s+dziala|zepsut|awari)/],
  ['batt', /\b(?:akumulator\S*|aku)\s+(?:\S+\s+)?(?:padl|padniet|rozladow|slab|wyladow|spuchl|nie\s+(?:laduj|trzyma))/],
  ['tacho', /\btachograf\S*\s+(?:\S+\s+)?(?:nie\s+(?:dziala|czyta)|blad|awari|zepsut)|\bkart\S*\s+kierowcy\s+(?:\S+\s+)?(?:nie\s+(?:czyta|dziala|wychodzi)|zgubi|zgin|uszkodz|zablok|pekl|ukradz)|\bzgubil\S*\s+(?:\S+\s+)?kart\S*\s+kierowcy/],
  ['coupling', /\b(?:naczep\S*|przyczep\S*)\s+(?:\S+\s+)?(?:nie\s+(?:chce\s+sie\s+)?(?:zapina|zaczepi|odczepi|podpina|wpina|zapiac|zaczepic|odczepic|podpiac)|odczepil|odpiel|urwal)|\b(?:siodl\S*|zamek\s+siodla|piat\S*\s+kol\S*)\s+(?:\S+\s+)?(?:nie\s+(?:zamyka|zapina|otwiera|blokuje)|zepsut|awari)/],
  ['dryfuel', /\b(?:skonczyl\S*|zabraklo|brak)\s+(?:\S+\s+)?(?:paliw[oa]|rop[ay]|diesl[a]|oleju\s+napedowego)|\b(?:paliwo|ropa)\s+(?:\S+\s+)?(?:sie\s+)?skonczyl/, /agregat|chlodni|thermo|carrier/],
  ['engine', /\bsilnik\S*\s+(?:\S+\s+)?(?:sie\s+)?(?:przegrzewa|grzeje|gotuje|traci\s+moc|nie\s+ma\s+mocy|nie\s+ciagnie|szarpie|gasnie|zgasl)|\b(?:spadek|utrata)\s+mocy|\btryb\s+awaryjn/],
  ['tyre', /\bopon\S*\s+(?:\S+\s+)?(?:przeciet|rozciet|uszkodz|lysa|zuzyt|starta|babel|guz|ucieka\s+powietrz|traci\s+powietrz|malo\s+powietrz|nisk\S*\s+cisnieni)/],

  ['flat', /\bopon\S*\s+(?:\S+\s+)?(?:zepsut|popsut|rozwalon|zniszczon|do\s+niczego|do\s+wyrzucenia)|\b(?:zepsul|popsul|rozwalil)\S*\s+(?:sie\s+)?(?:\S+\s+)?opon/, /zapasow|wycieracz|uszczel/],
  ['reefer', /\b(?:agregat\S*|chlodni\S*|thermo\s*king|carrier)\s+(?:\S+\s+)?(?:nie\s+(?:dziala|chlodzi|trzyma|odpala)|alarm|awari|stanal|wylaczyl|zepsut)/, /klima/],
  ['susp', /\b(?:miech\S*|zawieszeni\S*|resor\S*)\s+(?:\S+\s+)?(?:pekl|pekniet|opadl|siadl|ucieka|zepsut|zlaman|awari|nie\s+dziala)|\b(?:naczepa|auto|ciezarowka|ciagnik)\s+(?:\S+\s+)?(?:przechylon|krzywo\s+stoi|siadla|opadla)/],
  ['gear', /\bbieg\S*\s+(?:\S+\s+)?nie\s+(?:wchodz|wrzuca)|\bskrzyni\S*\s+(?:\S+\s+)?(?:biegow\s+)?(?:awari|zepsut|blad|nie\s+dziala)|\bsprzegl\S*\s+(?:\S+\s+)?(?:slizga|nie\s+(?:dziala|trzyma|lapie|rozlacza)|zepsut|spalon)/],
  ['climate', /\b(?:klima\S*|ogrzewani\S*|webasto|nagrzewnic\S*)\s+(?:\S+\s+)?(?:nie\s+(?:dziala|grzeje|chlodzi)|zepsut|awari)/, /fotel|siedzeni/],
  ['tarp', /\bplandek\S*\s+(?:\S+\s+)?(?:rozdart|podart|dziur|przeciet|porwan|urwan|zerwal|rozerwan)/],
  ['exhaust', /\b(?:wydech\S*|tlumik\S*|rur\S*\s+wydechow\S*)\s+(?:\S+\s+)?(?:urwan|urwal|odpadl|dziur|pekl|glosn)/],
  ['visib', /\bwycieraczk\S*\s+(?:\S+\s+)?(?:nie\s+(?:dziala|ciera|chodz)|urwan|zepsut|stanel)|\bszyb\S*\s+(?:\S+\s+)?(?:paruj|zaparow)/],
  ['seat', /\bpas\S*\s+(?:bezpieczenstwa\s+)?(?:\S+\s+)?(?:nie\s+(?:zapina|zatrzask|wraca|zwija)|urwan|rozdart|zepsut|zablokow)|\bfotel\S*\s+(?:\S+\s+)?(?:zlaman|zepsut|lata|chwieje|nie\s+(?:reguluj|dziala))/, /grzan|grzew|ruchu/],
  ['wheel', /\b(?:srub\S*|nakretk\S*)\s+(?:\S+\s+)?(?:kol\S*\s+)?(?:luz|poluzow|odkrec|brak|urwan|zgubion)|\bfelg\S*\s+(?:\S+\s+)?(?:pekl|pekniet|krzyw|wygiet)|\b(?:kolo|piasta|lozysk\S*)\s+(?:\S+\s+)?(?:lata|chwieje|grzeje|gorac|bije)/],
  ['stuck', /\b(?:zakopal|ugrzazl|ugrzezl|zakopan)\S*|\butknal\S*\s+(?:\S+\s+)?w\s+(?:blocie|sniegu|piachu|piasku)|\bbuksuj/],
  ['lost', /\b(?:kluczyk\S*|klucz\S*|dowod\S*\s+rejestracyjn\S*)\s+(?:\S+\s+)?(?:zgubi|zgin|zaginal|nie\s+moge\s+znalezc)|\bzgubil\S*\s+(?:\S+\s+)?(?:kluczyk|klucz|dowod)/],
  ['numplate', /\btablic\S*\s+(?:rejestracyjn\S*\s+)?(?:\S+\s+)?(?:odpadl|zgubi|zgin|urwan|ukradz|nieczyteln|pekl)/, /oswietl|swiatl/],
  ['adas', /\b(?:asystent\S*|radar\S*|czujnik\S*|kamer\S*)\s+(?:\S+\s+){0,2}(?:nie\s+dziala|awari|blad|wylaczyl|zepsut)|\b(?:sam|sama|samo)\s+(?:\S+\s+)?hamuje|\bhamuje\s+bez\s+powodu/],
  ['door', /\bdrzwi\S*\s+(?:\S+\s+)?nie\s+(?:zamyk|otwier|domyk)|\bwind\S*\s+(?:\S+\s+)?(?:nie\s+(?:dziala|podnosi|opuszcza)|zepsut|awari)/, /szyb/]];
const plFold = (s) => String(s || '').toLowerCase().replace(/[ąćęłńóśźż]/g, (c) => 'acelnoszz'['ąćęłńóśźż'.indexOf(c)]);
const PL_NEG = /\bnie\s+(?:jest\s+|sa\s+|byl[oa]?\s+|zostal[oa]?\s+)?(?:przebit|pekniet|pekl|zbit|rozbit|urwan|uszkodz|zepsut|cieknie|ciekn|przecieka|wycieka|luzn|poluzowan|wybuchl|zeszl|flak)\S*/g;
const PL_FUNK = /\bfunkcjonuj\S*/g;
function plKinds(v) { const k = new Set(); for (const p of plFold(v).replace(PL_FUNK, 'dziala').replace(PL_NEG, ' ').split(/[.,;!?\n]+/)) if (!PL_OK.test(p)) for (const [n, rx, ex] of PL_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); if (k.has('acc')) k.delete('injury'); return k; }



const RO_OK = /reparat|inlocuit|merge\s+din\s+nou|functioneaza\s+din\s+nou|fara\s+problem|totul\s+(?:e\s+)?(?:ok|in\s+regula)/;
const RO_KINDS = [['brake', /\bfran(?:a|e|ele)\s+(?:\S+\s+)?(?:nu\s+(?:mai\s+)?(?:functioneaza|merg|merge|tin|tine|franeaza)|au\s+cedat|slab)|\bnu\s+(?:mai\s+)?franeaza|\b(?:pierde|scade|scapa)\s+(?:\S+\s+)?(?:aer|presiune)/, /mana|parcare|stop|lumin|singur|fara\s+motiv|pern|anvelop|cauciuc|roat/],
  ['fire', /\bincendiu|\b(?:a\s+luat|ia|lua)\s+foc|\bfoc\s+la|\b(?:cabina|motorul|anvelopa|roata|remorca|semiremorca|camionul|masina)\s+(?:\S+\s+)?arde\b|\b(?:iese|ies|vine)\s+fum|\bfum\S*\s+(?:\S+\s+)?(?:din|de\s+la|de\s+sub|iese)|\bmiro(?:s|as)\S*\s+(?:\S+\s+)?(?:de\s+)?(?:ars|arsura|cauciuc\s+ars|cabluri\s+arse)/, /esapament|toba|stingator|martor|bec/],
  ['flat', /\b(?:anvelop|cauciuc|roat)\S*\s+(?:\S+\s+)?(?:a\s+)?(?:explodat|plesnit|spart|dezumflat|pe\s+janta)|\b(?:a\s+)?(?:explodat|plesnit)\s+(?:\S+\s+)?(?:anvelop|cauciuc|roat)|\bpana\s+de\s+(?:cauciuc|roata)|\bam\s+(?:facut|prins)\s+pana/],
  ['steer', /\bvolan\S*\s+(?:\S+\s+)?(?:blocat|greu|are\s+joc|nu\s+(?:merge|se\s+invarte|vireaza))|\bdirecti\S*\s+(?:\S+\s+)?(?:blocat|defect|nu\s+functioneaza|are\s+joc)|\btrage\s+(?:\S+\s+)?(?:dreapta|stanga)/],
  ['leak', /\b(?:ulei|motorina|combustibil|lichid|antigel|adblue)\S*\s+(?:\S+\s+)?(?:curge|picura|se\s+scurge)|\b(?:curge|picura|pierde|se\s+scurge)\s+(?:\S+\s+)?(?:ulei|motorina|combustibil|lichid|antigel|adblue)|\bscurgere\s+de/],
  ['acc', /\b(?:am\s+(?:avut|facut)|s-a\s+produs)\s+(?:\S+\s+)?(?:accident|tamponare)|\baccident\b|\btampona|\bam\s+(?:lovit|atins|zgariat|agatat)|\bm-a\s+lovit/, /piatr|pietricic/],

  ['acc', /\b(?:s-a\s+rasturnat|m-am\s+rasturnat|rasturnat)|\b(?:am\s+iesit|a\s+iesit|iesit)\s+(?:\S+\s+){0,2}?(?:de\s+pe|din)\s+(?:drum|sosea|carosabil)|\b(?:in|intr-un)\s+sant\b|\bin\s+rapa\b/, /marf|incarcatur|palet|colet|\bnu\s+(?:\S+\s+)?(?:s-a\s+rasturnat|am\s+iesit|a\s+iesit|am\s+intrat|a\s+intrat|e|este|sunt)\b/],

  ['stuck', /\b(?:in|intr-un)\s+sant\b|\bin\s+rapa\b/, /marf|incarcatur|palet|colet|\bnu\s+(?:\S+\s+)?(?:am\s+intrat|a\s+intrat|am\s+iesit|a\s+iesit|e|este|sunt)/],
  ['injury', /\branit[ia]?\b|\bambulant/],
  ['parkbrake', /\bfran\S*\s+de\s+(?:mana|parcare)\s+(?:\S+\s+)?(?:nu\s+(?:tine|functioneaza|se\s+elibereaza)|defect|blocat)|\b(?:camionul|masina|remorca|semiremorca|tractorul)\s+(?:\S+\s+)?(?:a\s+luat-o\s+la\s+vale|a\s+plecat\s+singur)/],
  ['nostart', /\b(?:motorul|camionul|masina|tractorul)\s+(?:\S+\s+)?nu\s+(?:mai\s+)?(?:porneste|vrea\s+sa\s+porneasca)|\bdemaror\S*\s+(?:\S+\s+)?nu\s+(?:merge|functioneaza)|\bnu\s+pot\s+sa\s+pornesc/],
  ['mirror', /\b(?:fara|lipseste|lipsa)\s+(?:\S+\s+)?oglind|\boglind\S*\s+(?:\S+\s+)?(?:lipseste|rupt|spart|crapat|cazut|atarna|nu\s+se\s+regleaza)/],
  ['lights', /\b(?:far\S*|lumin\S*|stop\S*|semnalizar\S*|bec\S*|lamp\S*)\s+(?:\S+\s+)?(?:nu\s+(?:functioneaza|merge|merg|lumineaza|se\s+aprinde)|ars|spart)|\bs-a\s+ars\s+(?:\S+\s+)?bec/, /martor|bord/],
  ['warnlight', /\bmartor\S*\s+(?:\S+\s+)?(?:aprins|se\s+aprinde|clipeste|s-a\s+aprins)|\b(?:s-a\s+aprins|se\s+aprinde|clipeste)\s+(?:\S+\s+)?martor/],
  ['glass', /\bparbriz\S*\s+(?:\S+\s+)?(?:crapat|fisurat|spart|ciupit)|\b(?:crapat|fisurat|spart)\S*\s+parbriz|\bciupitur/, /oglind/],
  ['window', /\bgeam\S*\s+(?:\S+\s+)?nu\s+(?:se\s+)?(?:deschide|inchide|ridica|coboara)/],
  ['batt', /\bbateri\S*\s+(?:\S+\s+)?(?:descarcat|moart|terminat|nu\s+(?:tine|incarca))/],
  ['tacho', /\btahograf\S*\s+(?:\S+\s+)?(?:nu\s+(?:functioneaza|citeste)|eroare|defect)|\bcard\S*\s+(?:de\s+)?(?:tahograf|conducator\S*|sofer)\s+(?:\S+\s+)?(?:nu\s+(?:citeste|functioneaza|iese)|pierdut|furat|defect|blocat)|\bam\s+pierdut\s+cardul/],
  ['coupling', /\b(?:semiremorc|remorc)\S*\s+(?:\S+\s+)?(?:nu\s+(?:se\s+)?(?:cupleaza|decupleaza|prinde)|s-a\s+decuplat|s-a\s+desprins)|\b(?:saua|sei|cuplaj\S*)\s+(?:\S+\s+)?(?:nu\s+(?:se\s+)?(?:inchide|blocheaza|deschide)|defect)/],
  ['dryfuel', /\b(?:am\s+ramas\s+fara|s-a\s+terminat|nu\s+mai\s+am)\s+(?:\S+\s+)?(?:motorina|combustibil|carburant)/, /agregat|frigorific/],
  ['engine', /\bmotor\S*\s+(?:\S+\s+)?(?:se\s+)?(?:supraincalzeste|incalzeste|fierbe|nu\s+trage|pierde\s+putere|se\s+opreste|s-a\s+oprit)|\bmod\S*\s+(?:de\s+)?avarie|\bpierde\s+putere/],
  ['tyre', /\b(?:anvelop|cauciuc)\S*\s+(?:\S+\s+)?(?:taiat|deteriorat|uzat|tocit|umflat|bula|pierde\s+aer)/, /dezumflat/],

  ['flat', /\b(?:anvelop|cauciuc)\S*\s+(?:\S+\s+){0,2}(?:stricat|distrus|terminat|praf\b)|\bs-?a\s+stricat\s+(?:\S+\s+)?(?:anvelop|cauciuc)/, /rezerv|stergator|garnitur|\busa\b|\busii\b|geam/],
  ['reefer', /\b(?:agregat\S*|frigorific\S*|thermo\s*king|carrier)\s+(?:\S+\s+)?(?:nu\s+(?:functioneaza|raceste|porneste|tine)|alarm|eroare|defect|s-a\s+oprit)/],
  ['susp', /\bpern\S*\s+(?:de\s+aer\s+)?(?:\S+\s+)?(?:spart|pierde\s+aer|crapat)|\bsuspensi\S*\s+(?:\S+\s+)?(?:defect|cazut|nu\s+functioneaza)|\b(?:remorca|semiremorca|camionul)\s+(?:\S+\s+)?(?:sta\s+stramb|s-a\s+lasat)/],
  ['gear', /\bvitez\S*\s+(?:\S+\s+)?nu\s+(?:intra|se\s+schimba)|\bcutia\s+de\s+viteze\s+(?:\S+\s+)?(?:defect|eroare|nu\s+functioneaza)|\bambreiaj\S*\s+(?:\S+\s+)?(?:patineaza|nu\s+(?:functioneaza|decupleaza)|ars)/],
  ['climate', /\b(?:clima|aerul\s+conditionat|incalzirea|webasto|caloriferul)\s+(?:\S+\s+)?(?:nu\s+(?:functioneaza|merge|incalzeste|raceste)|defect)/, /scaun/],
  ['tarp', /\bprelat\S*\s+(?:\S+\s+)?(?:rupt|sfasiat|gaurit|taiat)/],
  ['exhaust', /\b(?:esapament\S*|toba)\s+(?:\S+\s+)?(?:rupt|cazut|gaurit|spart|face\s+zgomot)/],
  ['visib', /\bstergat\S*\s+(?:\S+\s+)?(?:nu\s+(?:functioneaza|merg|merge)|rupt|defect)|\bparbriz\S*\s+(?:\S+\s+)?(?:aburit|se\s+abureste)/],
  ['seat', /\bcentur\S*\s+(?:\S+\s+)?(?:nu\s+(?:se\s+)?(?:inchide|blocheaza|retrage)|rupt|defect|blocat)|\bscaun\S*\s+(?:\S+\s+)?(?:rupt|defect|se\s+misca|nu\s+se\s+regleaza)/, /incalz/],
  ['wheel', /\b(?:prezoan|piulit)\S*\s+(?:\S+\s+)?(?:slabit|desfacut|lipsa|rupt|pierdut)|\bjant\S*\s+(?:\S+\s+)?(?:crapat|indoit|fisurat)|\b(?:roata|butucul|rulmentul)\s+(?:\S+\s+)?(?:are\s+joc|se\s+incinge|e\s+fierbinte|bate|se\s+clatina)/],
  ['stuck', /\bimpotmol|\b(?:blocat|ramas)\s+in\s+(?:noroi|zapada|nisip)/],
  ['lost', /\bam\s+pierdut\s+(?:\S+\s+)?(?:cheile|cheia|talonul|certificatul)|\b(?:cheile|cheia|talonul)\s+(?:\S+\s+)?(?:pierdut|nu\s+le\s+gasesc|nu\s+o\s+gasesc)/],
  ['numplate', /\b(?:numar\S*|placut\S*)\s+(?:de\s+inmatriculare\s+)?(?:\S+\s+)?(?:cazut|pierdut|furat|rupt|ilizibil)/, /lumin|bec/],
  ['adas', /\b(?:asistent\S*|radar\S*|senzor\S*|camer\S*)\s+(?:\S+\s+){0,2}(?:nu\s+functioneaza|defect|eroare|s-a\s+oprit)|\bfraneaza\s+(?:singur|fara\s+motiv)/],
  ['door', /\bus(?:a|ile|ii)\s+(?:\S+\s+)?nu\s+(?:se\s+)?(?:inchide|deschide)|\blift\S*\s+(?:\S+\s+)?(?:nu\s+(?:functioneaza|urca|coboara)|defect)/, /geam/]];
const roFold = (s) => String(s || '').toLowerCase().replace(/[ăâîșşțţ]/g, (c) => 'aaisstt'['ăâîșşțţ'.indexOf(c)]);
const RO_NEG = /\bnu\s+(?:e\s+|este\s+|a\s+|s-a\s+|sunt\s+|au\s+|mai\s+)?(?:spart|crapat|rupt|dezumflat|explodat|plesnit|cazut|fisurat|deteriorat|curge|pierde\s+(?:ulei|apa|aer|motorina))\S*/g;
const RO_MERGE = /\bnu\s+(?:mai\s+)?merg(?:e|eau)?\b/g;
function roKinds(v) { const k = new Set(); for (const p of roFold(v).replace(RO_MERGE, 'nu functioneaza').replace(RO_NEG, ' ').split(/[.,;!?\n]+/)) if (!RO_OK.test(p)) for (const [n, rx, ex] of RO_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); if (k.has('acc')) k.delete('injury'); return k; }



const HR_OK = /poprav|zamijenj|zamenj|promijenj|promenj|opet\s+radi|ponovo\s+radi|nema\s+problem|sve\s+(?:ok|u\s+redu)/;
const HR_KINDS = [['brake', /\bkocnic\S*\s+(?:\S+\s+)?(?:ne\s+(?:rade|radi|koce|drze|drzi)|slab|otkazal|popustil)|\b(?:slabo|ne)\s+koci|\b(?:pada|gubi|nestaje)\s+(?:\S+\s+)?(?:pritisak|zrak|vazduh)/, /rucn|parkirn|svjetl|svetl|stop|asistent|sam\s+od\s+sebe|bez\s+razloga|gum|jastuk|mijeh|\bmeh/],
  ['fire', /\bpozar|\b(?:gori|zapalio\s+se|zapalila\s+se|zapalilo\s+se)\b|\bizlazi\s+dim|\bdim\S*\s+(?:\S+\s+)?(?:iz|ispod|izlazi|kulja)|\b(?:mirise|smrdi|miris|smrad)\S*\s+(?:\S+\s+)?(?:na\s+)?(?:izgoren|paljevin|spaljen|zagoren)/, /auspuh|izduv|izpuh|aparat|gasenj|lampic|sijalic|pregorj|luck/],
  ['flat', /\b(?:gum\S*|pneumati\S*)\s+(?:\S+\s+)?(?:pukl|puknut|probusen|eksplod|prazn|ispust)|\b(?:pukl|eksplodiral)\S*\s+(?:\S+\s+){0,2}gum/],
  ['steer', /\bvolan\S*\s+(?:\S+\s+)?(?:blokiran|zakljucan|tezak|tesko|ima\s+(?:zazor|luft)|ne\s+(?:okrece|radi))|\bvuce\s+(?:\S+\s+)?(?:desno|lijevo|levo)/],
  ['leak', /\b(?:ulj|goriv|naft|dizel|tecnost|tekucin|antifriz|adblue)\S*\s+(?:\S+\s+)?(?:curi|kapa|cure|ide\s+van)|\b(?:curi|kapa|gubi)\s+(?:\S+\s+)?(?:ulj|goriv|naft|dizel|tecnost|tekucin|antifriz|adblue)/],
  ['acc', /\b(?:imao|imala|imali)\s+(?:sam\s+|smo\s+)?(?:\S+\s+)?(?:nesrec|sudar|udes)|\bnesreca|\bsudar|\budes\b|\b(?:udario|udarila|lupio|ogrebao|okrznuo|zakacio)\b|\budario\s+me/, /kamen/],

  ['acc', /\bprevrnu\S*|\bsleti\S*\s+(?:\S+\s+)?(?:s|sa)\s+(?:ceste|puta|druma|kolnika)|\bsleti\S*\s+(?:\S+\s+)?u\s+(?:jarak|provaliju)|\bu\s+(?:jarku|jarak)\b/, /teret|palet|tovar|\bnije\s+(?:se\s+)?(?:prevrnu|sleti|u\s+jark)|\bnisam\s+(?:se\s+)?(?:prevrnu|sleti|u\s+jark)/],

  ['stuck', /\bu\s+(?:jarku|jarak)\b|\bzap(?:eo|ela|elo|eli|ao|ala)\s+(?:sam\s+|je\s+|smo\s+|su\s+)?(?:\S+\s+)?u\s+(?:blat|snij|sneg|pijes|pesk)/, /teret|palet|tovar|\bnije\s+(?:se\s+)?(?:sleti|zapeo|zapela|u\s+jark)|\bnisam\s+(?:sleti|zapeo|u\s+jark)/],
  ['injury', /\b(?:povrijed|povred|ozlijed|ozled)\S*|\bhitn\S*\s+pomoc|\bambulant/, /^(?!.*\b(?:vozac\S*|suvozac\S*|covjek|covek|osoba|pjesak|pesak|biciklist\S*|kolega|sam|smo|ja|jas|sum)\b)(?!.*\b(?:hitn|ambulant))(?=.*\b(?:povrijed|povred)).*\b(?:gum|kabin|prikolic|stakl|felg|branik|vrat|karoserij|cerad|retrovizor|ogledal|far|blatobran|kamion|tegljac|auto|sleper|ceradu)/],
  ['parkbrake', /\brucn\S*\s+(?:kocnic\S*\s+)?(?:\S+\s+)?(?:ne\s+(?:drzi|radi|otpusta)|pokvaren|zaglavil)|\b(?:kamion|auto|prikolica|tegljac|sleper)\S*\s+(?:se\s+)?(?:otkotrlja|sam\s+krenu)/],
  ['nostart', /\b(?:motor|kamion|auto|tegljac)\S*\s+(?:\S+\s+)?(?:ne\s+(?:pali|upaljuje|vata)|nece\s+(?:da\s+)?(?:upali|pali))|\banlaser\S*\s+(?:\S+\s+)?ne\s+radi/],
  ['mirror', /\b(?:bez|nema)\s+(?:\S+\s+)?(?:retrovizor|ogledal)|\b(?:retrovizor|ogledal|retrovizer)\S*\s+(?:\S+\s+)?(?:fali|nedostaje|slomljen|otpa|puk|razbijen|visi|ne\s+(?:radi|podesava))/],
  ['lights', /\b(?:svjetl|svetl|far\b|farovi|zmigavac|migavac|sijalic|lamp[ae]\b|stop\s+svjetl|stop\s+svetl)\S*\s+(?:\S+\s+)?(?:ne\s+(?:rade|radi|svijetl|svetl|gori|gore)|pregorj|pregorel|razbijen)|\bpregorj\S*\s+(?:\S+\s+)?sijalic/, /lampic|kontroln/],
  ['warnlight', /\b(?:lampic|kontroln\S*\s+lamp)\S*\s+(?:\S+\s+)?(?:svijetli|svetli|gori|upalil|trepc|treperi)|\bupalil\S*\s+(?:se\s+)?(?:\S+\s+)?lampic|\b(?:gori|svijetli|svetli)\s+(?:\S+\s+)?lampic/],
  ['glass', /\b(?:vjetrobran|vetrobran|sofersajbn|staklo|stakla)\S*\s+(?:\S+\s+)?(?:pukl|puknut|napukl|razbijen|ostecen)|\b(?:pukl|napukl|razbijen)\S*\s+(?:\S+\s+)?(?:vjetrobran|vetrobran|sofersajbn|staklo)/, /retrovizor|ogledal|kamen\s+udario|udario\s+kamen/],
  ['window', /\b(?:prozor|staklo)\S*\s+(?:\S+\s+)?(?:se\s+)?ne\s+(?:spusta|podize|otvara|zatvara)/],
  ['batt', /\b(?:akumulator|aku)\S*\s+(?:\S+\s+)?(?:prazan|ispraznj|crkao|slab|ne\s+puni|ne\s+drzi)/],
  ['tacho', /\btahograf\S*\s+(?:\S+\s+)?(?:ne\s+(?:radi|cita)|greska|kvar)|\bkartic\S*\s+(?:vozaca\s+)?(?:\S+\s+)?(?:ne\s+(?:cita|radi|izlazi)|izgubljen|ukraden|ostecen|zaglavil)|\bizgubio\s+(?:sam\s+)?karticu/],
  ['coupling', /\b(?:prikolic|poluprikolic)\S*\s+(?:\S+\s+)?(?:se\s+)?(?:ne\s+(?:kaci|zakaci|otkaci|spaja)|otkacil|odvojil)|\bsedl\S*\s+(?:\S+\s+)?(?:ne\s+(?:zatvara|zakljucava|otvara)|pokvaren|kvar)/],
  ['dryfuel', /\b(?:nestalo|ostao\s+sam\s+bez|nemam\s+vise)\s+(?:\S+\s+)?(?:goriva|nafte|dizela)/, /agregat|hladnja|frigo/],
  ['engine', /\bmotor\S*\s+(?:\S+\s+)?(?:se\s+)?(?:pregrija|pregreva|kuha|nema\s+snag|gubi\s+snag|gasi|ugasio|trza)|\bhavarijsk|\bgubi\s+snagu/],
  ['tyre', /\bgum\S*\s+(?:\S+\s+)?(?:ostecen|posjecen|isjecen|istrosen|celav|ima\s+balon|gubi\s+(?:zrak|vazduh)|malo\s+(?:zraka|vazduha))/, /pukl|puknut/],

  ['flat', /\b(?:gum(?:a|e|u|i|om|ama)|pneumati\S*)\s+(?:\S+\s+)?(?:je\s+|su\s+|mi\s+)?(?:pokvaren\S*|crkl\S*|crknut\S*|unisten\S*|za\s+baciti)|\b(?:pokvarila|crkla|crknula)\s+(?:mi\s+|se\s+)?(?:\S+\s+)?gum(?:a|e)\b/, /brisac|metlic|brtv|rezervn|zamjensk|vrata/],

  ['flat', /\bgum(?:a|e|u|i|om|ama)\s+(?:(?!nije\s|ni\s|ne\s)\S+\s+)?(?:se\s+|je\s+|su\s+|mi\s+)?(?:pokvaril\S*|polomljen\S*|polomil\S*|slomljen\S*|slomil\S*)|\b(?:polomila|slomila)\s+(?:mi\s+|se\s+)?(?:\S+\s+)?gum(?:a|e)\b/, /brisac|metlic|brtv|rezervn|zamjensk|vrata/],
  ['reefer', /\b(?:agregat|hladnja|frigo|thermo\s*king|carrier)\S*\s+(?:\S+\s+)?(?:ne\s+(?:hladi|radi|pali)|alarm|greska|kvar|stao|ugasio)/],
  ['susp', /\b(?:jastuk|mijeh|meh)\S*\s+(?:\S+\s+)?(?:puk|pusta|ispust|ostecen)|\b(?:ogibljenj|vjesanj|vesanj)\S*\s+(?:\S+\s+)?(?:ne\s+radi|kvar|pokvaren)|\b(?:prikolica|kamion|tegljac)\s+(?:\S+\s+)?(?:nakrivljen|nagnut|spustil)/],
  ['gear', /\bbrzin\S*\s+(?:\S+\s+)?ne\s+(?:ulazi|ulaze)|\b(?:mjenjac|menjac)\S*\s+(?:\S+\s+)?(?:greska|kvar|ne\s+(?:radi|ubacuje|ulazi))|\bkvacil\S*\s+(?:\S+\s+)?(?:proklizava|ne\s+radi|izgorj|izgorel)/],
  ['climate', /\b(?:klima|grijanj|grejanj|webasto|grijac|grejac)\S*\s+(?:\S+\s+)?(?:ne\s+(?:radi|grije|greje|hladi)|kvar|pokvaren)/, /sjedist|sedist/],
  ['tarp', /\bcerad\S*\s+(?:\S+\s+)?(?:pocijepan|pocepan|poderan|iscijepan|rupa|pukl)/],
  ['exhaust', /\bauspuh\S*\s+(?:\S+\s+)?(?:otpa|pukao|puknut|rupa|buci|visi)/],
  ['visib', /\bbrisac\S*\s+(?:\S+\s+)?(?:ne\s+(?:rade|radi|brisu)|slomljen|pokvaren)|\bstaklo\s+(?:se\s+)?(?:magli|zamaglil)/],
  ['seat', /\bpojas\S*\s+(?:\S+\s+)?(?:ne\s+(?:kopca|zakopcava|vraca|drzi)|pokidan|pokvaren|zaglavil)|\b(?:sjedist|sedist)\S*\s+(?:\S+\s+)?(?:slomljen|pokvaren|klima|ne\s+(?:podesava|radi))/, /grijanj|grejanj|grij|grej/],
  ['wheel', /\b(?:sarafi|vijci|matic|zavrtnj)\S*\s+(?:\S+\s+)?(?:tocka\s+|kotaca\s+)?(?:labav|olabav|odvrn|fale|nema)|\bfelg\S*\s+(?:\S+\s+)?(?:pukl|kriv|savijen)|\b(?:tocak|kotac|glavcin|lezaj)\S*\s+(?:\S+\s+)?(?:klima|grije|greje|vruc|lupa)/],
  ['stuck', /\bzaglavi\S*\s+(?:\S+\s+)?(?:se\s+)?(?:\S+\s+)?u\s+(?:blat|snij|sneg|pijes|pesk)|\bzaglibi/],
  ['lost', /\bizgubi\S*\s+(?:sam\s+)?(?:\S+\s+)?(?:kljuc|saobracajn|prometn)|\b(?:kljuc|saobracajn)\S*\s+(?:\S+\s+)?(?:izgubljen|ne\s+mogu\s+(?:da\s+)?(?:nadjem|naci|nadem))/],
  ['numplate', /\b(?:registarsk\S*\s+)?tablic\S*\s+(?:\S+\s+)?(?:otpa|izgubljen|ukraden|necitljiv|pukl|slomljen)/, /svjetl|svetl|sijalic/],
  ['adas', /\b(?:asistent|radar|senzor|kamer)\S*\s+(?:\S+\s+){0,2}(?:ne\s+radi|greska|kvar|iskljucio)|\bkoci\s+(?:sam\s+od\s+sebe|bez\s+razloga)/],
  ['door', /\bvrata\s+(?:\S+\s+)?(?:se\s+)?ne\s+(?:zatvaraju|otvaraju|zakljucavaju)|\b(?:lift|rampa)\S*\s+(?:\S+\s+)?(?:ne\s+(?:radi|dize|spusta)|pokvaren|kvar)/]];
const hrFold = (s) => String(s || '').toLowerCase().replace(/[čćđšž]/g, (c) => 'ccdsz'['čćđšž'.indexOf(c)]);
const HR_NEG = /\b(?:nije|nisu|nije\s+bil[ao]|nisu\s+bil[ei])\s+(?:pukl|puknut|probusen|eksplod|prazn|slomljen|razbijen|otpa|ostecen|polomljen|izdupc|duplna|skrsen|kursen)\S*|\bne\s+(?:curi|cure|procuri|procuruje|kapa)\b/g;
const HR_FUNK = /\bfunkcioni[rs]\S*/g;
function hrKinds(v) { const k = new Set(); for (const p of hrFold(v).replace(HR_FUNK, 'radi').replace(HR_NEG, ' ').split(/[.,;!?\n]+/)) if (!HR_OK.test(p)) for (const [n, rx, ex] of HR_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); if (k.has('acc')) k.delete('injury'); return k; }



const HU_OK = /\b(?:meg|ki)?javit(?:va|ottak|ottam|otta|ottuk)\b|\bki\s*cserel(?:tek|tuk|tem|ve|te)\b|\bcserel(?:ve|tek|tuk)\b|\bujra\s+(?:mukodik|jo)\b|\bmar\s+(?:jo|mukodik|rendben)\b|\bminden\s+rendben|\bnincs\s+(?:semmi\s+)?(?:gond|baj|problema)|\bmegoldva/;
const HU_KINDS = [['brake', /\bfek(?:ek|et|nek|rendszer\S*|betet\S*|tarcs\S*)?\s+(?:\S+\s+)?(?:nem\s+(?:mukodik|mukodnek|fog|fognak)|gyenge|gyengen|elromlott|rossz|tonkrement)|\b(?:nem|gyengen|rosszul)\s+fekez|\bnem\s+fog(?:nak)?\s+(?:a\s+)?fek|\b(?:esik|csokken|elmegy|szokik)\s+(?:a\s+)?(?:\S+\s+)?(?:levego|legnyomas|nyomas)/, /kezifek|rogzitofek|feklamp|magatol|ok\s+nelkul|gumi|abroncs|legrugo|harang/],
  ['fire', /\btuz\s+(?:van|utott\s+ki)|\btuzet\b|\btuzben\b|\bkigyullad|\beg\s+a\s+(?:kabin|motor|kamion|potkocsi|rakomany)\b|\bfust\S*\s+(?:\S+\s+)?(?:jon|szall|gomolyog)|\bfustol|\beget\S*\s+szag|\bszag\S*\s+(?:\S+\s+)?eget/, /kipufog|porolto|tuzolto|lampa|izzo|visszajelz|hibalamp/],
  ['flat', /\bdefekt(?:et|em|unk)\b|\bdefekt\s+(?:van|lett|kaptam)\b|\b(?:gumi|abroncs)\S*\s+(?:\S+\s+)?(?:kidurrant|kilyukadt|lyukas|durrant|szetrobbant|felrobbant|lapos|leeresztett|leengedett)|\b(?:kidurrant|kilyukadt|szetrobbant|felrobbant|lapos|leeresztett)\s+(?:\S+\s+){0,2}(?:gumi|abroncs)/, /harang|legrugo/],
  ['steer', /\bkormany\S*\s+(?:\S+\s+)?(?:beragadt|blokkol|zarol|nehez|nem\s+(?:fordul|mukodik)|kotyog|holtjatek)|\b(?:beragadt|blokkolt|nehez)\s+(?:a\s+)?kormany|\bhuz\s+(?:\S+\s+)?(?:jobbra|balra)/],
  ['leak', /\b(?:olaj|uzemanyag|gazolaj|dizel|diesel|hutoviz|hutofolyadek|folyadek|fagyallo|adblue)\S*\s+(?:\S+\s+)?(?:folyik|csopog|szivarog|ereszt)|\b(?:folyik|csopog|szivarog|ereszt)\s+(?:az?\s+)?(?:\S+\s+)?(?:olaj|uzemanyag|gazolaj|dizel|hutoviz|folyadek|fagyallo|adblue)/],
  ['acc', /\bbaleset|\butkoz|\bosszeutkoz|\bnekimen|\bnekem\s+jott|\bbelem\s+jott|\bkoccan|\bmeghuztam\b|\bsurolt/, /\bko\b|kavics/],

  ['acc', /\bfelborul|\boldalara\s+(?:dolt|borult|fordult)|\b(?:letert|lesodrod|lecsusz|kisodrod)\S*\s+(?:\S+\s+)?az\s+utrol|\barokba\s+(?:\S+\s+)?(?:csusz|hajt|kerul|borul|fordul|ment)|\b(?:csusz|hajt|kerul|borul|fordul)\S*\s+(?:\S+\s+)?(?:az\s+)?arokba/, /rakomany|raklap|\baru\b|\bnem\s+(?:\S+\s+)?(?:borult|felborul|tert|csusz)/],

  ['stuck', /\barok(?:ba|ban)\b/, /rakomany|raklap|\baru\b|\bnem\s+(?:\S+\s+)?(?:csusz|hajt|kerul|borul|fordul|ment|van)|\bnincs(?:en)?\s+(?:\S+\s+)?arok|\bnem\s+(?:az\s+)?arok|\bnem\s+(?:vagyok|vagyunk)\b/],

  ['acc', /\b(?:kamion|teherauto|kocsi|auto|jarmu|potkocsi|felpotkocsi|vontato|nyerges|kisteherauto|furgon)\S*\s+(?:\S+\s+){0,2}?arokban\b|\b(?:vagyok|vagyunk)\s+(?:az\s+)?arokban\b|\barokban\s+(?:vagyok|vagyunk)\b/, /rakomany|raklap|\baru\b|\bnem\s+(?:\S+\s+)?(?:az\s+)?arok|\bnincs(?:en)?\s+(?:\S+\s+)?arok|\bnem\s+(?:vagyok|vagyunk)/],
  ['injury', /\bmegserultem\b|\bmegsebesul|\bmento(?:t|k|hoz)?\b|\bkorhaz|\bverzik|\bvereztem|\beltort\s+a\s+(?:lab|kez|kar|bord)/],
  ['parkbrake', /\b(?:kezifek|rogzitofek)\S*\s+(?:\S+\s+)?(?:nem\s+(?:fog|tart|mukodik|old|enged)|elromlott|beragadt)|\belgurult/],
  ['nostart', /\b(?:motor|kamion|auto|vontato)\S*\s+(?:\S+\s+)?nem\s+(?:indul|akar\s+(?:be)?indulni)|\bnem\s+(?:akar\s+)?(?:be)?indul(?:ni)?\b|\bonindito\S*\s+(?:\S+\s+)?(?:nem\s+mukodik|rossz|elromlott)/, /huto|agregat|aggregat|klima|futes|webasto|lift|hatfal/],
  ['mirror', /\b(?:tukor|tukr|visszapillanto)\S*\s+(?:\S+\s+)?(?:letort|eltort|kitort|betort|torott|log|leszakadt|nem\s+(?:allithato|mukodik)|tort\s+(?:el|le|ki|be)\b|szakadt\s+le\b)|\b(?:letort|eltort|kitort|leszakadt)\s+(?:a\s+)?(?:\S+\s+)?(?:tukor|visszapillanto)/],
  ['lights', /\b(?:lampa|lampak|fenyszoro|vilagitas|izzo|index|helyzetjelzo|feklampa|tolatolampa|reflektor)\S*\s+(?:\S+\s+)?(?:nem\s+(?:vilagit|eg|egnek|mukodik|mukodnek)|kieg|torott|eltort|kitort)|\bkieg\S*\s+(?:az?\s+)?(?:\S+\s+)?(?:izzo|lampa)/, /visszajelz|kontroll|muszerfal|hibalamp/],
  ['warnlight', /\b(?:visszajelz|hibalamp|motorhibalamp|figyelmeztet)\S*\s+(?:\S+\s+)?(?:vilagit|eg|kigyulladt|felgyulladt|villog)\b|\b(?:kigyulladt|felgyulladt|vilagit|villog)\s+(?:az?\s+|egy\s+)?(?:\S+\s+)?(?:visszajelz|hibalamp)|\b(?:motor|olaj|akkumulator|abs|ebs)\s*(?:hiba)?\s*lamp\S*\s+(?:\S+\s+)?(?:vilagit|eg|villog)\b|\b(?:vilagit|eg|villog)\s+(?:a\s+)?(?:motor|olaj|akkumulator|abs|ebs)\s*(?:hiba)?\s*lamp/],
  ['glass', /\b(?:szelvedo|uveg)\S*\s+(?:\S+\s+)?(?:megreped|reped|betort|kitort|eltort|torott|csillag|repedt\s+meg\b|tort\s+(?:el|ki|be)\b)|\b(?:megreped|reped|betort|kitort|eltort|torott)\S*\s+(?:az?\s+)?(?:\S+\s+)?(?:szelvedo|uveg)/, /tukor|tukr|visszapillanto/],
  ['window', /\b(?:ablak(?:ot|om)?|ablakemelo\S*)\s+(?:\S+\s+)?(?:nem\s+(?:megy|mukodik|nyilik|zarodik)|beragadt)/],
  ['batt', /\b(?:akkumulator|akku)\S*\s+(?:\S+\s+)?(?:lemerult|le\s+van\s+merulve|gyenge|nem\s+tolt)|\blemerult\s+(?:az?\s+)?akku/, /lamp|visszajelz/],
  ['tacho', /\b(?:tachograf|menetiro)\S*\s+(?:\S+\s+)?(?:nem\s+(?:mukodik|olvas)|hiba|hibas|elromlott)|\b(?:sofor)?kartya\S*\s+(?:\S+\s+)?(?:nem\s+(?:olvas|mukodik|jon\s+ki)|beragadt|elveszett|ellopt|serult|torott)|\belvesztettem\s+(?:a\s+)?(?:sofor)?kartya/, /tank|\bkut|uzemanyag/],
  ['coupling', /\b(?:potkocsi|felpotkocsi)\S*\s+(?:\S+\s+)?(?:nem\s+(?:kapcsol|csatlakozik|akaszthato)|lekapcsolod|levalt|leszakadt)|\bnyereg\S*\s+(?:\S+\s+)?(?:nem\s+(?:zar|nyit|kapcsol)|elromlott|hibas|beragadt)/],
  ['dryfuel', /\b(?:kifogyott|elfogyott|nincs\s+(?:tobb|mar))\s+(?:az?\s+)?(?:\S+\s+)?(?:uzemanyag|gazolaj|dizel|diesel)|\b(?:uzemanyag|gazolaj|dizel)\S*\s+(?:\S+\s+)?(?:kifogyott|elfogyott)/, /huto|agregat|aggregat|adblue/],
  ['engine', /\bmotor\S*\s+(?:\S+\s+)?(?:tulmeleg|forr|nincs\s+ereje|lefullad|leall|rangat|kihagy)|\btulmeleged|\bveszuzem|\bnincs\s+ereje|\bteljesitmeny\S*\s+(?:\S+\s+)?(?:esik|veszt|csokken)/, /huto(?:agregat|aggregat|gep)|\bfek|kerek|csapagy/],
  ['tyre', /\b(?:gumi|abroncs)\S*\s+(?:\S+\s+)?(?:serult|vagott|elvagott|kopott|lekopott|bubor|pup|ereszt|levegot\s+veszit|szakadt|repedt)|\bgumi\S*\s+(?:\S+\s+)?(?:keves|alacsony)\s+(?:a\s+)?(?:levego|nyomas)/, /kidurr|kilyukad|szetrobban|lapos|defekt|harang|legrugo/],

  ['flat', /\b(?:gumi|abroncs)\S*\s+(?:\S+\s+)?(?:tonkrement|tonkre\s+ment|elromlott|hasznalhatatlan)|\b(?:tonkrement|elromlott)\s+(?:\S+\s+){0,2}(?:gumi|abroncs)/, /ablaktorl|tomit|ajto|potkerek|harang|legrugo/],
  ['reefer', /\b(?:huto|hutoaggregat|hutoagregat|hutogep|hutoegyseg)\S*\s+(?:\S+\s+)?(?:nem\s+(?:hut|mukodik|indul)|riaszt|alarm|hiba|leallt|elromlott)/, /hutoviz|hutofolyadek/],
  ['susp', /\b(?:legrugo|gumiharang|rugo)\S*\s+(?:\S+\s+)?(?:kidurrant|szakadt|elszakadt|eltort|ereszt|leereszt|lyukas)|\bfelfugg\S*\s+(?:\S+\s+)?(?:nem\s+mukodik|hibas|elromlott)|\b(?:potkocsi|kamion|vontato|felpotkocsi)\S*\s+(?:\S+\s+)?(?:ferde|megdolt|leult|lesullyedt|oldalra\s+dol)/],
  ['gear', /\b(?:sebessegvalto|valto|fokozat|sebesseg)\S*\s+(?:\S+\s+)?(?:nem\s+(?:megy\s+be|kapcsol|mukodik)|hiba|hibas|elromlott|beragadt)|\bnem\s+megy\s+be\s+(?:a\s+)?(?:\S+\s+)?(?:fokozat|sebesseg)|\bkupp?lung\S*\s+(?:\S+\s+)?(?:csuszik|nem\s+mukodik|elromlott|leegett|kiegett)/],
  ['climate', /\b(?:klima|legkondi|futes|allofutes|webasto|kalorifer)\S*\s+(?:\S+\s+)?(?:nem\s+(?:mukodik|hut|fut|megy)|elromlott|hibas)/, /ules/],
  ['tarp', /\bponyv\S*\s+(?:\S+\s+)?(?:szakadt|elszakadt|kiszakadt|lyukas|rongyos)/],
  ['exhaust', /\bkipufog\S*\s+(?:\S+\s+)?(?:leesett|log|lyukas|eltort|letort|zajos|hangos|szakadt|leszakadt)/],
  ['visib', /\b(?:ablaktorlo|torlo|ablakmoso)\S*\s+(?:\S+\s+)?(?:nem\s+(?:mukodik|mukodnek|torol|torolnek|megy)|eltort|letort|elromlott)|\b(?:be)?parasod/],
  ['seat', /\b(?:biztonsagi\s+)?ov(?:et|em|ek)?\s+(?:\S+\s+)?(?:nem\s+(?:kapcsol|csatol|tart|mukodik)|szakadt|elszakadt|beragadt)|\bules\S*\s+(?:\S+\s+)?(?:eltort|torott|nem\s+(?:allithato|mukodik)|elromlott|lotyog|kotyog)/, /fut/],
  ['wheel', /\b(?:kerekcsavar|kerekanya|csavar|anyacsavar)\S*\s+(?:\S+\s+)?(?:laza|meglazult|kilazult|hianyzik|leesett)|\b(?:meglazult|kilazult)\s+(?:a\s+|egy\s+)?(?:kerekcsavar|kerekanya|anyacsavar)|\bfelni\S*\s+(?:\S+\s+)?(?:repedt|megreped|gorbe|elgorbult|eltort)|\b(?:kerekagy|kerek|csapagy)\S*\s+(?:\S+\s+)?(?:forro|tulmeleg|zug|kotyog|lotyog|nagyon\s+meleg)/],
  ['stuck', /\b(?:elakad|beragad|megreked|besuppad)\S*\s+(?:\S+\s+){0,2}(?:sar|ho\b|hoban|homok|latyak)|\b(?:sarban|hoban|homokban)\s+(?:\S+\s+)?(?:elakad|ragad|reked)/],
  ['lost', /\belvesztettem\s+(?:az?\s+)?(?:\S+\s+)?(?:kulcs|forgalmi)|\b(?:kulcs|forgalmi)\S*\s+(?:\S+\s+)?(?:elveszett|eltunt|nincs\s+meg)|\bnem\s+talalom\s+(?:az?\s+)?(?:\S+\s+)?(?:kulcs|forgalmi)/],
  ['numplate', /\brendszam\S*\s+(?:\S+\s+)?(?:leesett|elveszett|ellopt|olvashatatlan|eltort|torott|letort|hianyzik)/, /vilagit|lampa|izzo/],
  ['adas', /\b(?:savtarto|asszisztens|radar|szenzor|erzekelo|kamera|tavolsagtarto)\S*\s+(?:\S+\s+){0,2}(?:nem\s+mukodik|hiba|hibas|kikapcsolt|kiesett)|\b(?:magatol|ok\s+nelkul|indokolatlanul)\s+(?:\S+\s+)?fekez/],
  ['door', /\bajto\S*\s+(?:\S+\s+)?(?:nem\s+(?:zarodik|zar|nyilik|nyithato|csukodik)|beragadt)|\b(?:emelohatfal|hatfal|lift|rampa)\S*\s+(?:\S+\s+)?(?:nem\s+(?:mukodik|emel|megy)|elromlott|hibas)/, /ablak/]];
const huFold = (s) => String(s || '').toLowerCase().replace(/[áéíóöőúüűõûô]/g, (c) => 'aeiooouuuouo'['áéíóöőúüűõûô'.indexOf(c)]);
const HU_NEG = /\b(?:nem|nincs(?:en)?|nincsenek)\s+(?:(?:volt|lett)\s+)?(?:ki|le|el|szet|fel|be)?(?:durrant|lyukad|lyukas|robbant|lapos|leeresztett|leengedett|tort|torve|torott|szakadt|szakadva|serult|folyik|szivarog|csopog)\S*/g;
function huKinds(v) { const k = new Set(); for (const p of huFold(v).replace(HU_NEG, ' ').split(/[.,;!?\n]+/)) if (!HU_OK.test(p)) for (const [n, rx, ex] of HU_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); if (k.has('acc')) k.delete('injury'); return k; }



const CS_OK = /\bopraven|\bvymenen|\bvymenil|\bfunguje\s+(?:uz|zase|opet|znova|znovu)\b|\b(?:uz|zase|opet|znova|znovu)\s+funguje\b|\b(?:je|vse|vsetko|vsechno)\s+(?:v\s+poradku|v\s+poriadku|ok)\b|\bbez\s+problem/;
const CS_KINDS = [['brake', /\bbrzd\S*\s+(?:\S+\s+)?(?:nefunguj|nejd|nebrzd|nedrz|slab|selhal|zlyhal|povolil)|\bnebrzd|\bslabo\s+brzd|\b(?:pada|klesa|unika)\s+(?:\S+\s+)?tlak|\bunika\s+vzduch/, /rucn|parkovac|svetl|stop|asistent|\bsam[ao]?\b|bez\s+d[uo]vodu|pneu|gum|\bmech|vankus|\bvak/],
  ['fire', /\bpozar|\b(?:hori|horet|vzplanul\S*)\b|\b(?:kour|dym)\S*\s+(?:\S+\s+)?(?:z|zpod|spod|ide|jde|vychadz\S*|vychaz\S*|stoupa)\b|\b(?:jde|ide|vychazi|vychadza|stoupa|vali)\s+(?:\S+\s+)?(?:kour|dym)|\b(?:smrdi|pachne|citim|cit)\S*\s+(?:\S+\s+)?(?:spalen|horen)/, /vyfuk|wydech|vyhlop|vykhlop|hlushn|glushn|auspuh|egzoz|esapament|kipufog|hasic|hasiac|zarovk|ziarovk|kontrolk/],
  ['flat', /\b(?:pichl|pichol)\S*|\b(?:pneu\S*|gum[ay]\b)\s+(?:\S+\s+)?(?:prask|pichl|pichnut|prazdn|splask|vybuchl|roztrh)|\b(?:prask|vybuchl|roztrh|splasl)\S*\s+(?:\S+\s+){0,2}(?:pneu|gum)|\bmam[e]?\s+defekt|\bdefekt\s+(?:na\s+)?(?:pneu|kole)/, /\bmech|\bvak|placht|sterac|stierac/],
  ['steer', /\bvolant\S*\s+(?:\S+\s+)?(?:zablokov|zasek|tezk|tazk|ma\s+vul|nejde|nefunguj)|\b(?:tahne|taha)\s+(?:\S+\s+)?(?:doprava|doleva|vpravo|vlevo|vlavo)/],
  ['leak', /\b(?:olej|naft|palivo|paliva|chladic|chladiac|kapalin|kvapalin|nemrz|adblue|diesel)\S*\s+(?:\S+\s+)?(?:tece|tecie|kape|kvapka|unika|vytek|vytiek)|\b(?:tece|tecie|kape|kvapka|unika|vytek|vytiek)\S*\s+(?:\S+\s+)?(?:olej|naft|palivo|chladic|chladiac|kapalin|kvapalin|nemrz|adblue)/],
  ['acc', /\bnehod|\bhavar|\bsrazk|\bzrazk|\bnaboural|\bnabural|\bnarazil|\bodrel|\bvrazil/, /rezim|kamen|kamienk|kaminek/],

  ['acc', /\b(?:prevratil|prevratila|prevratilo|prevratili|prevraceny|prevrateny)\b|\bsjel\S*\s+(?:\S+\s+)?(?:ze?)\s+(?:silnice|cesty|vozovky|dalnice)|\b(?:zisiel|zisl)\S*\s+(?:\S+\s+)?z\s+(?:cesty|vozovky|dialnice)|\b(?:do|v)\s+(?:prikopu|priekopy|priekope|prikope)\b/, /\bnaklad(?!n|i?ak)|palet|\b(?:nesjel|nesjela|nespadl|nespadla|nezisiel|nespadol|neni|nie\s+je|neprevratil\S*)\b/],

  ['stuck', /\b(?:do|v)\s+(?:prikopu|priekopy|priekope|prikope)\b/, /\bnaklad(?!n|i?ak)|palet|\b(?:nesjel|nespadl|nezisiel|nespadol|neni|nie\s+je)\b/],
  ['injury', /\bzran(?:en|il|ila|ili)\S*|\bzachrank|\bsanitk|\bnemocnic/],
  ['parkbrake', /\b(?:rucni|rucna|parkovaci|parkovacia)\s+brzd\S*\s+(?:\S+\s+)?(?:nedrz|nefunguj|neuvoln|zasekl|nejde)|\b(?:rozjel|rozbehol|pohol|odjel)\S*\s+(?:sa\s+|se\s+)?sam/],
  ['nostart', /\bnenastartuj|\bnestartuj|\b(?:nejde|neda\s+sa)\s+(?:\S+\s+)?nastartovat|\bstarter\S*\s+(?:\S+\s+)?nefunguj/, /agregat|chlad|klim|topen|kurenie|webasto/],
  ['mirror', /\b(?:zrcatk|zrcadl|zrkadl|zrkadielk)\S*\s+(?:\S+\s+)?(?:ulomen|ulomil|rozbit|utrzen|odtrhn|odtrhol|prask|visi|nejde|nefunguj)|\b(?:ulomen|ulomil|rozbit|utrzen|odtrh)\S*\s+(?:\S+\s+)?(?:zrcatk|zrcadl|zrkadl)/],
  ['lights', /\b(?:svetl|svetlomet|reflektor|blinkr|smerovk|zarovk|ziarovk)\S*\s+(?:\S+\s+)?(?:nesviti|nesvieti|nefunguj|praskl|spalen|vypalen|rozbit)|\bnesvit\S*\s+(?:\S+\s+)?(?:svetl|blinkr|zarovk|reflektor)|\bnesviet\S*\s+(?:\S+\s+)?(?:svetl|smerovk|ziarovk)|\b(?:praskl|spalen|vypalen)\S*\s+(?:\S+\s+)?(?:zarovk|ziarovk)/, /kontrolk|palubn|displej/],
  ['warnlight', /\bkontrolk\S*\s+(?:\S+\s+)?(?:sviti|svieti|blika|rozsvit|rozsviet)|\b(?:sviti|svieti|blika|rozsvitil\S*|rozsvietil\S*)\s+(?:se\s+|sa\s+|mi\s+)?(?:\S+\s+)?kontrolk/],
  ['glass', /\b(?:(?:celni|celne|predni|predne)\s+)?sklo\S*\s+(?:\S+\s+)?(?:praskl|puklo|rozbit|poskoz|poskoden)|\b(?:praskl|puklo|rozbit|poskoz)\S*\s+(?:\S+\s+)?(?:(?:celni|celne)\s+)?sklo/, /zrcatk|zrcadl|zrkadl|kamen|kamienk|kaminek/],
  ['window', /\bokn\S*\s+(?:\S+\s+)?(?:nejde|nefunguj|zasekl)/, /sterac|stierac/],
  ['batt', /\b(?:bateri|akumulator|autobateri|aku)\S*\s+(?:\S+\s+)?(?:vybit|slab|nedobij|nenabij)|\bvybit\S*\s+(?:\S+\s+)?(?:bateri|akumulator|aku)/, /kontrolk/],
  ['tacho', /\btachograf\S*\s+(?:\S+\s+)?(?:nefunguj|necte|necita|chyb|porucha|poruch)|\bkart[auy]\s+(?:ridice\s+|vodica\s+)?(?:\S+\s+)?(?:nejde\s+(?:precist|vytahnout|vybrat)|necte|necita|zasekl|ztracen|straten|ukraden|poskoz)|\b(?:ztratil|stratil)\s+(?:jsem\s+|som\s+)?(?:\S+\s+)?kart/, /tank|cerpac|palivov|platebn|platobn/],
  ['coupling', /\b(?:naves|prives)\S*\s+(?:\S+\s+)?(?:nejde\s+(?:zapojit|pripojit|zapriahnut|odpojit)|se\s+odpojil|sa\s+odpojil|odpojil|uvolnil)|\btocnic\S*\s+(?:\S+\s+)?(?:nezavir|nezatvar|nezamyk|nejde|porucha|poskoz|zasekl)/],
  ['dryfuel', /\b(?:dosl[ao]|minul[ao]?)\s+(?:(?:sa|se|mi)\s+)?(?:\S+\s+)?(?:naft|palivo|diesel)|\bnemam\s+(?:uz\s+)?(?:naft|palivo)|\b(?:naft|palivo)\S*\s+(?:\S+\s+)?(?:doslo|dosla|minul)/, /agregat|chlad|adblue/],
  ['engine', /\bmotor\S*\s+(?:\S+\s+)?(?:se\s+|sa\s+)?(?:prehriv|prehriev|nema\s+vykon|ztraci|straca|zhasin|chcip|cuka|vypina)|\b(?:nouzov|nudzov|havarijn)\S*\s+rezim|\b(?:nema|ztraci|straca)\s+(?:\S+\s+)?vykon/, /agregat|brzd|lozisk/],
  ['tyre', /\b(?:pneu\S*|gum[ay]\b)\s+(?:\S+\s+)?(?:poskoz|poskoden|proriznut|prerezan|narezan|sjet|ojet|zodrat|opotreb|boul|bublin|ztraci\s+vzduch|straca\s+vzduch|ma\s+malo|uchodi|unika)/, /praskl|pichl|pichnut|vybuchl|splask|prazdn|defekt|sterac|stierac/],

  ['flat', /\bpneu\S*\s+(?:\S+\s+)?(?:je\s+|sa\s+|su\s+|jsou\s+)?(?:rozbit\S*|znicen\S*|pokazen\S*|pokazil\S*|na\s+odpis|na\s+vyhozeni|v\s+haji|kaput\S*)/, /rezerv|stierac|sterac|tesnen/],
  ['reefer', /\b(?:agregat|chladic\S*\s+(?:agregat|jednotk)|chladiac\S*\s+(?:agregat|jednotk))\S*\s+(?:\S+\s+)?(?:nechladi|nefunguj|alarm|chyb|porucha|vypadl|nejede|nejde)/],
  ['susp', /\b(?:mech|mechy|vzduchov\S*\s+(?:mech|vak)|vak)\S*\s+(?:\S+\s+)?(?:praskl|roztrh|unika|uchodi|pusti|poskoz|poskoden)|\b(?:odpruzen|perovan)\S*\s+(?:\S+\s+)?(?:nefunguj|porucha|poskoz)|\b(?:naves|prives|kamion|tahac)\S*\s+(?:\S+\s+)?(?:se\s+|sa\s+)?(?:naklan|nakloni|naklonen|sedi\s+nizko)/],
  ['gear', /\b(?:nejde|neda\s+sa)\s+(?:\S+\s+)?zaradit|\b(?:rychlost|kvalt)\S*\s+(?:\S+\s+)?(?:nejde|nezaradi)|\bprevodovk\S*\s+(?:\S+\s+)?(?:chyb|porucha|nefunguj|zasekl|drhne)|\bspojk\S*\s+(?:\S+\s+)?(?:prokluz|preklz|nefunguj|spalen|nejde)/],
  ['climate', /\b(?:klima\S*|topen\S*|kurenie|webasto|nezavisl\S*\s+topen\S*)\s+(?:\S+\s+)?(?:nefunguj|netopi|nekuri|nechladi|nejde|porucha)/, /sedad|sedac|vyhriv|vyhrev/],
  ['tarp', /\bplacht\S*\s+(?:\S+\s+)?(?:roztrh|roztrz|potrh|potrz|dira|diera|poskoz|poskoden|natrzen)|\b(?:dira|diera)\s+v\s+placht/],
  ['exhaust', /\bvyfuk\S*\s+(?:\S+\s+)?(?:upadl|odpadl|odpadol|visi|dira|diera|hlucn|praskl|prasknut|ulomen)/],
  ['visib', /\b(?:sterac|stierac)\S*\s+(?:\S+\s+)?(?:nefunguj|nestir|nestier|ulomen|zlomen|nejde)|\bsklo\s+(?:se\s+|sa\s+)?(?:mlzi|zamlzuj|hmli|zahmlieva|zarosi)/],
  ['seat', /\b(?:bezpecnostn\S*\s+)?pas\s+(?:\S+\s+)?(?:nejde|nedrzi|nefunguj|roztrh|zasekl)|\b(?:sedadl|sedack)\S*\s+(?:\S+\s+)?(?:zlomen|rozbit|nefunguj|nejde\s+nastavit|vikla|kyva)/, /vyhriv|vyhrev|kuren|topen/],
  ['wheel', /\b(?:srouby|sroub|skrutk|matic)\S*\s+(?:\S+\s+){0,2}(?:povolen|uvolnen|volne|chybi|chyba|upadl)|\b(?:rafek|rafk|disk)\S*\s+(?:\S+\s+)?(?:praskl|ohnut|zlomen)|\b(?:naboj|lozisk|kolo|koleso)\S*\s+(?:\S+\s+)?(?:hork|horuc|prehriv|prehriev|huci|klepe|vikla)/, /brzd/],
  ['stuck', /\b(?:zapadl|zapadol|uvizl|uviazol|zahrabal)\S*\s+(?:\S+\s+){0,3}(?:blat|snih|sneh|pisk|piesk)/],
  ['lost', /\b(?:ztratil|stratil)\S*\s+(?:jsem\s+|som\s+)?(?:\S+\s+)?(?:klic|kluc|technick|osvedc)|\b(?:klic|kluc)\S*\s+(?:\S+\s+)?(?:ztracen|straten|nemuzu|nemozem)|\bnemuzu\s+najit\s+(?:\S+\s+)?klic|\bnemozem\s+najst\s+(?:\S+\s+)?kluc/],
  ['numplate', /\b(?:spz|ecv|registracn\S*\s+znack\S*|poznavac\S*\s+znack\S*|evidencn\S*\s+cisl\S*)\s+(?:\S+\s+)?(?:upadl|odpadl|odpadol|ztracen|straten|ukraden|necitel|zlomen|chybi|chyba)/, /osvetlen|svetl|zarovk|ziarovk/],
  ['adas', /\b(?:asistent|radar|senzor|snimac|kamera|tempomat)\S*\s+(?:\S+\s+){0,3}(?:nefunguj|chyb|porucha|vypnul|nejde)|\bbrzdi\s+(?:\S+\s+)?(?:sam|bez\s+(?:duvodu|dovodu))/],
  ['door', /\bdver\S*\s+(?:\S+\s+)?(?:nejd|nezavir|nezatvar|nezamyk|neotevir|neotvar|zasekl)|\b(?:hydraulick\S*\s+)?(?:celo|plosin|rampa)\S*\s+(?:\S+\s+)?(?:nefunguj|nejde|nejede|porucha|chyb)/, /okn/]];
const csFold = (s) => String(s || '').toLowerCase().replace(/[áäčďéěíĺľňóôŕřšťúůýž]/g, (c) => 'aacdeeillnoorrstuuyz'['áäčďéěíĺľňóôŕřšťúůýž'.indexOf(c)]);
const CS_NEG = /\b(?:neni|nie\s+je|nebol[aoy]?|nebyl[aoy]?|nejsou|nie\s+su)\s+(?:(?:to|je)\s+)?(?:praskl|prasknut|pichl|pichnut|prazdn|splask|vybuchl|roztrh|rozbit|ulomen|utrzen|odtrzen|odtrhnut|poskoz|poskoden)\S*|\bne(?:tece|tecie|kape|unika)\b/g;
function csKinds(v) { const k = new Set(); for (const p of csFold(v).replace(CS_NEG, ' ').split(/[.,;!?\n]+/)) if (!CS_OK.test(p)) for (const [n, rx, ex] of CS_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); if (k.has('acc')) k.delete('injury'); return k; }




const BG_OK = /\bremontiran|\bopraven|\bsmen|\bzamen|\braboti\s+(?:otnovo|pak|normalno)|\b(?:otnovo|pak|veche)\s+raboti\b|\bvsichko\s+e\s+(?:nared|ok|v\s+red)|\b(?:nyama|bez)\s+problem/;
const BG_KINDS = [['brake', /\bspirach\S*\s+(?:\S+\s+){0,2}(?:ne\s+(?:rabot|deystv|darzh|spir|hvasht)|slab|otkaz)|\bne\s+spira\b|\b(?:spada|pada|namalya)\S*\s+(?:\S+\s+)?nalyagan|\b(?:izpuska|puska|byaga)\s+(?:\S+\s+)?vazduh/, /rachn|parking|stop|svetl|asistent|\bsam[ao]?\b|bez\s+prichina|gum|vazglavnits/],
  ['fire', /\bpozhar|\b(?:gori|goryat|zapali\s+se|plamna)\b|\bdim\S*\s+(?:\S+\s+)?(?:ot|izpod|izliza|vliza)\b|\b(?:izliza|vliza|ima|vali)\s+(?:\S+\s+)?dim\b|\bmirishe\s+(?:\S+\s+)?(?:na\s+)?(?:izgor|parlen)/, /auspuh|izpuskatel|vyhlop|wydech|egzoz|esapament|kipufog|vyfuk|pozharogasit|pozharsk|gashe|krushk|lamp|luqk|luck|\bfar|gabarit|svetl|protivotuman|ne\s+gor/],
  ['flat', /\bspukah\b|\bspukan\S*\s+gum|\bgum\S*\s+(?:\S+\s+)?(?:se\s+)?(?:spuka|izbuhna|pukna|eksplodira|prazn)|\b(?:spuka|izbuhna|pukna)\S*\s+(?:mi\s+)?(?:\S+\s+)?gum/, /vazglavnits|chistachk/],
  ['steer', /\bvolan\S*\s+(?:\S+\s+)?(?:blokir|zaklyuch|zaseda|zasyada|tezhak|tezhko|ne\s+se\s+varti|ima\s+lyuft)|\b(?:tegli|darpa)\s+(?:\S+\s+)?(?:nadyasno|nalyavo|vdyasno|vlyavo)/],
  ['leak', /\b(?:maslo\S*|nafta\S*|gorivo\S*|antifriz\S*|ohladitel\S*|technost\S*|adblue|dizel\S*|hidravlik\S*)\s+(?:\S+\s+)?(?:teche|kape|izticha|tekat|kapyat)|\b(?:teche|kape|izticha|tekat|kapyat|izteche)\S*\s+(?:\S+\s+)?(?:maslo|nafta|gorivo|antifriz|ohladitel|technost|adblue|dizel|hidravlik)/, /\bne\s+(?:tech|tek|kap|izticha)/],
  ['acc', /\bkatastrof|\bblasna|\bpatnotransportno|\bptp\b|\bsblasa|\budari\S*\s+(?:me|ni|kamiona|remarketo)\b/, /kamache|kamak/],

  ['acc', /\bpreobar(?:na|nah|nahme|nat|nato|nala)\b|\b(?:izlyaz|izleta|izletyah|izhvarch)\S*\s+(?:\S+\s+)?ot\s+(?:patya|patnoto|platnoto)|\bv\s+kanavk/, /\btovar|palet|\bne\s+(?:(?:se|e|sam|sme|sa|si|beshe)\s+)?(?:preobar|izlyaz|izlet)|\bne\s+(?:e|sme|sam|sa|padna|padnah|padnahme|vleze|vlyazoh)\s+(?:\S+\s+)?v\s+kanavk/],

  ['stuck', /\bv\s+kanavk/, /\btovar|palet|\bne\s+(?:e|sme|sam|sa|padna|padnah|padnahme|vleze|vlyazoh|izlyaz)\b/],
  ['injury', /\branen\S*|\bpostradah|\blineyk|\bbolnits|\barza\s+pomosht/],
  ['parkbrake', /\b(?:rachn|parking)\S*\s+spirach\S*\s+(?:\S+\s+)?(?:ne\s+(?:darzh|rabot|se\s+osvobozhd|puska)|zaseda|blokir)|\b(?:tragna|potegli|izbyaga)\S*\s+(?:\S+\s+)?sam\b/],
  ['nostart', /\bne\s+(?:pali|zapalva|zapali|startira)\b|\bstarter\S*\s+(?:\S+\s+)?ne\s+(?:raboti|varti)/, /agregat|hladil|klimat|parno|pechk|webasto|vebasto|lamp|krushk|svetl|\bfar/],
  ['mirror', /\bogledal\S*\s+(?:\S+\s+)?(?:schupen|schupi|otchupen|otchupi|padna|visi|ne\s+raboti|pukn)|\b(?:schupen|schupi|otchupen|otchupi)\S*\s+(?:\S+\s+)?ogledal/],
  ['lights', /\b(?:far|farove|farat|farovete|svetlin\S*|stopove\S*|migach\S*|krushk\S*|gabarit\S*)\s+(?:\S+\s+)?(?:ne\s+(?:svet|rabot|gori)|izgor|schupen|pukn)|\b(?:izgoryal|schupen|puknat)\S*\s+(?:\S+\s+)?(?:krushk|far|stop|migach)/, /kontroln|lampichk|tablo|displey/],
  ['warnlight', /\b(?:lampichk|kontroln\S*\s+lamp|indikator)\S*\s+(?:\S+\s+){0,3}(?:sveti|svetna|miga|svetyat)|\b(?:sveti|svetna|svetnaha|miga)\s+(?:mi\s+)?(?:\S+\s+)?(?:lampichk|kontroln|indikator)/, /gum|\bshin/],
  ['glass', /\b(?:predno\S*\s+)?staklo\S*\s+(?:\S+\s+)?(?:pukn|schup|spukan|povred|naprasn)|\b(?:pukn|schup|spukan|povred)\S*\s+(?:\S+\s+)?(?:predno\S*\s+)?staklo/, /ogledal|kamache|kamak|\bfar|zapotya/],
  ['window', /\bprozor\S*\s+(?:\S+\s+)?(?:ne\s+(?:se\s+)?(?:vdiga|svalya|spuska|otvarya|zatvarya|raboti)|zaseda|zasedna|blokir)/, /chistachk/],
  ['batt', /\b(?:akumulator|akum|bateri)\S*\s+(?:\S+\s+)?(?:padnal|padna|iztoshten|prazen|ne\s+(?:zarezhda|se\s+zarezhda|darzhi))|\b(?:padnal|iztoshten|prazen)\S*\s+(?:\S+\s+)?(?:akumulator|akum|bateri)/, /lampichk|kontroln/],
  ['tacho', /\btahograf\S*\s+(?:\S+\s+)?(?:ne\s+(?:chete|raboti|priema|vadi)|greshk|povreda|blokir)|\bkart\S*\s+(?:na\s+vodacha\s+)?(?:\S+\s+)?(?:zasedna|zaseda|ne\s+(?:izliza|se\s+chete)|izgubena|otkradnata|povredena|schupena)|\b(?:zagubih|izgubih)\s+(?:si\s+)?(?:\S+\s+)?kart/, /gorivo|benzinost|platezh|bankov|tank/],
  ['coupling', /\b(?:remarke|poluremarke)\S*\s+(?:\S+\s+)?(?:ne\s+se\s+(?:zakacha|zakachva|otkacha|svarzva)|se\s+otkachi|otkachi|razkachi)|\bsedlo\S*\s+(?:\S+\s+)?(?:ne\s+(?:zaklyuchva|zatvarya|raboti)|povred|blokir|zaseda)/],
  ['dryfuel', /\bsvarsh\S*\s+(?:mi\s+)?(?:\S+\s+)?(?:gorivo|nafta|dizel)|\b(?:gorivo|nafta|dizel)\S*\s+(?:\S+\s+)?svarsh|\bnyamam\s+(?:veche\s+)?(?:gorivo|nafta|dizel)/, /agregat|hladil|adblue/],
  ['engine', /\b(?:dvigatel|motor)\S*\s+(?:\S+\s+)?(?:pregryava|pregrya|nyama\s+moshtnost|gubi\s+moshtnost|gasne|zagasva|zagasna|troi|ne\s+darpa)|\bavariy\S*\s+rezhim|\b(?:nyama|gubi)\s+(?:\S+\s+)?moshtnost/, /agregat|spirach|lager/],
  ['tyre', /\bgum\S*\s+(?:\S+\s+)?(?:povred|sryaz|naryaz|iznos|izhabena|gubi\s+vazduh|izpuska|ima\s+malko|myahur|tsepnat)/, /spuka|spukan|izbuhn|pukna|prazn|chistachk/],

  ['flat', /\bgum\S*\s+(?:\S+\s+)?(?:se\s+)?(?:schup|razval|skapa)\S*|\b(?:schupi|razvali|skapa)\S*\s+(?:se\s+)?(?:mi\s+)?(?:\S+\s+)?gum/, /rezerv|chistachk|vazglavnits|\bne\s+(?:\S+\s+)?(?:schup|razval|skapa)/],
  ['reefer', /\b(?:agregat|hladiln\S*\s+agregat|hladiln\S*\s+ustroystvo)\S*\s+(?:\S+\s+)?(?:ne\s+(?:ohlazhda|raboti|varvi|pali)\b|alarma|greshka|avariya)|\balarm\S*\s+(?:na\s+)?(?:hladil|agregat)/],
  ['susp', /\b(?:vazdushn\S*\s+)?(?:vazglavnits|mehov)\S*\s+(?:\S+\s+)?(?:se\s+)?(?:spuka|pukna|puska|izpuska|povred|skasa)|\b(?:remarke|poluremarke|kamion|vlekach|kabina)\S*\s+(?:\S+\s+)?(?:se\s+)?(?:naklanya|nakloni|klyumna)|\bokachvane\S*\s+(?:\S+\s+)?(?:ne\s+raboti|greshk|povred)/],
  ['gear', /\bne\s+(?:vliza|vlizat|se\s+vklyuchva)\s+(?:\S+\s+)?skorost|\bskorost\S*\s+(?:\S+\s+)?(?:ne\s+(?:vliza|vlizat|se\s+vklyuchva)|izbiva|izkachat)|\bskorostn\S*\s+kutiya\S*\s+(?:\S+\s+)?(?:greshk|avariya|ne\s+raboti|blokir|zaseda)|\bsaedinitel\S*\s+(?:\S+\s+)?(?:buksuva|prihlazva|ne\s+raboti|izgorya)/],
  ['climate', /\b(?:klimati\S*|klima|parno\S*|pechk\S*|otoplen\S*|webasto|vebasto)\s+(?:\S+\s+)?(?:ne\s+(?:raboti|topli|gree|ohlazhda|duha|pali)\b|greshk|avariya)/, /sedalk|podgryav/],
  ['tarp', /\bbrezent\S*\s+(?:\S+\s+)?(?:skasan|skasa|razkasan|dupk|povred|sryazan)|\bdupk\S*\s+(?:\S+\s+)?(?:v\s+|na\s+)?brezent|\b(?:pokrivalo|shtora|shtori)\S*\s+(?:\S+\s+)?(?:skasan|skasa|razkasan|sryazan)/],
  ['exhaust', /\bauspuh\S*\s+(?:\S+\s+)?(?:padna|padnal|visi|otpadna|dupk|pukna|puknat|schupen)/],
  ['visib', /\bchistachk\S*\s+(?:\S+\s+)?(?:ne\s+(?:rabot|chist)|schupen|schupi|otchupi|padna)|\bstaklo\S*\s+(?:\S+\s+)?(?:se\s+)?(?:zapotyava|zamaglya|zapoti)/, /sedalk|podgryav/],

  ['load', /\b(?:tovar(?:at|a|ut)?|stoka(?:ta)?|stokite|paleti(?:te)?|paletata|palet|kashoni(?:te)?|kashonat|kutii(?:te)?)\s+(?:(?!ne\s)\S+\s+){0,2}?(?:(?:se|e|sa)\s+)?(?:izmest\S*|premest\S*|plazn\S*|plazga\S*|preobarn\S*|obarn\S*|padna\S*|padnal\S*|razpadn\S*|sruti\S*|srutil\S*|naklon\S*|razsipa\S*)|\b(?:se\s+)?(?:izmesti|izmestiha|padna|padnaha|preobarna|obarna|plazna|sruti|srutiha|razsipa)\s+(?:(?:mi|ni|tsyaliyat|tsyalata)\s+)?(?:tovar|stoka|paleti|paletata|kashoni)\S*/, /(?:otnovo|pak)\s+(?:ukrep|zakrep|podred|vrazah)|ukrepih|podredih|zakrepih|prenaredih|kamion\S*\s+(?:se\s+)?(?:preobarn|obarn)/],
  ['lashgear', /\b(?:kolan\S*\s+za\s+(?:tovar\S*|ukrepvane|zakrepvane|vrazvane)|ukrepvasht\S*\s+kolan\S*|spanzet\S*|spanset\S*|treschotk\S*|tresch?otk\S*|remak\S*|rematsi\S*)\s+(?:(?!ne\s)\S+\s+)?(?:(?:e|sa|se)\s+)?(?:skasan\S*|skasa\S*|razkasa\S*|schupen\S*|schupi\S*|lipsv\S*|nyama\b)|\b(?:skasa|skasaha|skasa\s+se|skasaha\s+se)\s+(?:\S+\s+)?(?:kolan\S*\s+za\s+tovar|spanzet|treschotk|rematsi)/, /predpazen|sedalk|smenih|novi\s+kolani|nov\s+kolan/],
  ['seat', /\b(?:predpazen\S*\s+)?kolan\S*\s+(?:\S+\s+)?(?:ne\s+(?:zakopchava|se\s+zakopchava|darzhi|raboti|izliza)|skasan|zaseda|zasedna)|\bsedalk\S*\s+(?:\S+\s+)?(?:schupen|schupi|ne\s+(?:raboti|se\s+regulira)|klati)/, /podgryav|otoplen/],
  ['wheel', /\b(?:bolt|gayk|shpilk)\S*\s+(?:\S+\s+){0,3}(?:razhlab|razvi|lipsv|padna|otpadna)|\bdzhant\S*\s+(?:\S+\s+)?(?:pukn|izkrivi|schup)|\b(?:glavin|lager|kolel)\S*\s+(?:\S+\s+)?(?:pregrya|goresht|byuchi|tropa|klati)/, /spirach/],
  ['stuck', /\b(?:zasednah|zasedna|zatanah|zatana)\S*\s+(?:\S+\s+){0,3}(?:kal\S*|sn[ye]g\S*|pyasa\S*)/],
  ['lost', /\b(?:zagubih|izgubih)\s+(?:si\s+)?(?:\S+\s+)?(?:klyuch|talon)|\bklyuch\S*\s+(?:\S+\s+)?(?:izguben|zaguben|lipsv)|\bne\s+moga\s+da\s+namerya\s+(?:\S+\s+)?klyuch/],
  ['numplate', /\b(?:registratsion\S*\s+(?:nomer|tabel)\S*|nomer\S*\s+tabel\S*|tabel\S*\s+s\s+nomer\S*|nomerat|nomera)\s+(?:\S+\s+)?(?:padna|padnal|izgub|lipsva|otkradn|schupen|ne\s+se\s+chete)/, /osvetl|svetl|krushk/],
  ['adas', /\b(?:asistent|radar|senzor|datchik|kamera|tempomat)\S*\s+(?:\S+\s+){0,3}(?:ne\s+raboti|greshk|izklyuchi|otkaz)|\bspira\s+(?:\S+\s+)?(?:sam\b|bez\s+prichina)/],
  ['door', /\bvrat\S*\s+(?:\S+\s+)?(?:ne\s+se\s+(?:zatvarya|otvarya|zaklyuchva)|zaseda|zasedna|blokir)|\b(?:(?:padasht|podemn|hidravlich)\S*\s+)?bord\S*\s+(?:\S+\s+)?(?:ne\s+(?:raboti|se\s+vdiga|se\s+spuska)|greshk|avariya)/, /prozor/]];
const BG_TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sht', ъ: 'a', ь: 'y', ю: 'yu', я: 'ya', ѝ: 'i' };

const bgFold = (s) => String(s || '').toLowerCase().replace(/[а-яѝ]/g, (c) => BG_TR[c] || c).replace(/[\u00df-\u024f]/g, 'q');
const BG_NEG = /\bne\s+(?:(?:e|se|sa|sme|sam)\s+)?(?:(?:padna|padnah|padnahme|vleze|vlyazoh|zasedna)\S*\s+)?v\s+kanavk\S*|\bne\s+(?:(?:e|se|sa|beshe|byaha|mi)\s+){0,2}(?:spuka|spukan|izbuhna|pukna|puknat|eksplodira|prazn|schupen|schupi|otchupen|otchupi|padna|tech|kape|izticha)\S*/g;
function bgKinds(v) { const k = new Set(); for (const p of bgFold(v).replace(BG_NEG, ' ').split(/[.,;!?\n]+/)) if (!BG_OK.test(p)) for (const [n, rx, ex] of BG_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); if (k.has('acc')) k.delete('injury'); return k; }
const LT_OK = /\bsutais|\bpatais|\bpakeist|\bpakeite|\b(?:jau|vel)\s+veikia\b|\bveikia\s+(?:jau|vel|normaliai)\b|\bviskas\s+(?:gerai|tvarkoje)|\bbe\s+problem/;
const LT_KINDS = [['brake', /\bstabd\S*\s+(?:\S+\s+)?(?:neveik|nestabd|silpn|nelaiko|sugedo|dingo)|\bnestabd|\bsilpn\S*\s+stabd|\b(?:krenta|krinta|mazeja|dingsta|dingo)\s+(?:\S+\s+)?(?:oro\s+)?slegis|\boro\s+slegis\s+(?:\S+\s+)?(?:krenta|krinta|mazeja)|\b(?:pucia|leidzia|isleidzia)\s+ora\b/, /rankin|stovejim|zibint|sviesos|asistent|\bpat[si]\b|savaime|priezast|padang|pagalv|kortel/],
  ['fire', /\bgaisr|\buzsiliepsn|\buzsideg\S*\s+(?:\S+\s+)?(?:kabin|varikl|ratas|padang|sunkvezim|vilkik|priekab|laid)|\b(?:kabin\S*|varikl\S*|ratas|padang\S*|sunkvezim\S*|vilkik\S*|priekab\S*|laidai)\s+(?:\S+\s+)?(?:dega|uzsidege)\b|\bdega\s+(?:kabina|variklis|ratas|padanga|sunkvezimis|vilkikas|priekaba|laidai)\b|\b(?:dumai|dumu|dumija|ruksta|rukst\S*)\b|\bdeges/, /ismetim|duslintuv|vamzd|wydech|vyhlop|auspuh|egzoz|esapament|kipufog|vyfuk|gesintuv|lemput|kontrolin|zibint|sviesa|sviesos/],
  ['flat', /\bpradur\S*|\b(?:sprogo|sprogusi|truko|trukusi|nuleido|nuleista|subliusk\S*|plyso|plysusi)\s+(?:\S+\s+)?padang|\bpadang\S*\s+(?:\S+\s+)?(?:sprogo|truko|nuleido|nuleista|pradurt|plyso|subliusk|tuscia)/, /pagalv|tent|valytuv/],
  ['steer', /\bvair(?:as|a|o|e)\b\s+(?:\S+\s+)?(?:uzstrig|uzsiblokav|uzblokuot|sunkiai|neveik|nesisuka|klib)|\b(?:traukia|tempia|mesta)\s+(?:\S+\s+)?(?:i\s+)?(?:desine|kaire)/],
  ['leak', /\b(?:alyv|tepal|dyzel|kuras\b|kuro\b|antifriz|ausinimo\s+skyst|skyst|adblue|tosol)\S*\s+(?:\S+\s+)?(?:teka|bega|lasa|varva|isbego|istek|prateka)|\b(?:teka|bega|lasa|varva|isbego|istek|prateka)\S*\s+(?:\S+\s+)?(?:alyv|tepal|dyzel|kuras|kuro|antifriz|ausinimo|skyst|adblue)/],
  ['acc', /\bavarij|\bsusidur|\batsitrenk|\bisitrenk|\btrenk[e]?s\b|\btrenkesi|\bkliud|\bapibraiz|\bsudauziau/, /rezim|akmen|akmuo|akmenuk/],

  ['acc', /\bapsivert|\bapvirt|\b(?:nuvaziav|nuslyd|islekiau|islek)\S*\s+(?:\S+\s+)?nuo\s+kelio|\bi\s+griov|\bgriovyje\b/, /krovin|palet|\b(?:ne\S+|nera)\s+(?:\S+\s+)?(?:i\s+griov|griovyje)/],

  ['stuck', /\bi\s+griov|\bgriovyje\b/, /krovin|palet|\b(?:ne\S+|nera)\s+(?:\S+\s+)?(?:i\s+griov|griovyje)/],
  ['injury', /\bsuzeist|\bsusizeid|\bsusizalo|\bgreitaj|\bgreitoj|\bligonin/],
  ['parkbrake', /\b(?:rankin|stovejimo)\S*\s+stabd\S*\s+(?:\S+\s+)?(?:nelaiko|neveik|neatleid|uzstrig)|\b(?:nuriedejo|pajudejo|nuvaziavo|riedejo|nuriedejo)\s+(?:\S+\s+)?(?:pats|pati|savaime)/],
  ['nostart', /\bneuzsived|\bneuzved|\bnepasileid|\bstarter\S*\s+(?:\S+\s+)?(?:neveik|nesuka|sugedo)/, /agregat|saldytuv|kondicion|sildym|sildytuv|webasto|autonomin/],
  ['mirror', /\bveidrod\S*\s+(?:\S+\s+)?(?:nuluz|suduz|sudauz|nutrauk|kabo|neveik|isdauz|skilo|iskil)|\b(?:nuluzo|suduzo|sudauz\S*|nutrauk\S*|nudauz\S*)\s+(?:\S+\s+)?veidrod/],
  ['lights', /\b(?:zibint|sviesos|sviesu|lemput|posukis|posukiai|posukio|posuku)\S*\s+(?:\S+\s+)?(?:nesviec|nedega|neveik|perdeg|sudauz|suduz|skilo)|\b(?:nesviec|nedega)\S*\s+(?:\S+\s+)?(?:zibint|sviesos|lemput|posuk)|\bperdeg\S*\s+(?:\S+\s+)?(?:lemput|zibint)/, /kontrolin|prietais|ekran|displ/],
  ['warnlight', /\b(?:kontrolin\S*\s+)?lemput\S*\s+(?:\S+\s+)?(?:dega|mirksi|uzsideg)|\b(?:dega|mirksi|uzsideg\S*)\s+(?:\S+\s+){0,2}lemput|\bkontrolin\S*\s+(?:\S+\s+)?(?:dega|mirksi|uzsideg)/],
  ['glass', /\b(?:priekin\S*\s+)?stikl\S*\s+(?:\S+\s+)?(?:iskil|skilo|suduz|itruk|truko|sudauz)|\b(?:iskil|skilo|suduz|itruk|sudauz)\S*\s+(?:\S+\s+)?(?:priekin\S*\s+)?stikl/, /veidrod|akmen|akmuo/],
  ['window', /\blang(?:as|o|ai|u)\b\s+(?:\S+\s+)?(?:nesileid|nenusileid|nepakyl|nekyla|neveik|uzstrig|neatsidar|neuzsidar)/, /valytuv/],
  ['batt', /\b(?:akumuliator|akumas|baterij)\S*\s+(?:\S+\s+)?(?:issikrov|tusc|silpn|nekrau|nesikrau|mires|nusedo|sedo)|\bissikrov\S*\s+(?:\S+\s+)?(?:akumuliator|akumas|baterij)/, /kontrolin|lemput/],
  ['tacho', /\btachograf\S*\s+(?:\S+\s+)?(?:neveik|neskait|nenuskait|klaid|gedim|sugedo|nepriima)|\bkortel\S*\s+(?:vairuotoj\S*\s+)?(?:\S+\s+)?(?:uzstrig|neskait|nenuskait|pamest|pavogt|sugadint|neisein)|\b(?:pameciau|pamesta|pavoge|pavogta)\s+(?:\S+\s+)?(?:vairuotoj\S*\s+)?kortel|\bnegaliu\s+(?:istraukti|isimti)\s+(?:\S+\s+)?kortel|\bvairuotoj\S*\s+kortel\S*\s+(?:\S+\s+)?(?:neveik|sugedo|sugadint)/, /\bkur[ao]\b|degal|mokej|banko|kreditin/],
  ['coupling', /\b(?:priekab|puspriekab)\S*\s+(?:\S+\s+)?(?:neprisikabin|nepasikabin|atsikabin|neatsikabin|nesikabin)|\b(?:balnas|balno|sakabin\S*)\s+(?:\S+\s+)?(?:neuzsidar|neuzsirakin|neveik|uzstrig|sugedo|gedim)/],
  ['dryfuel', /\b(?:baigesi|pritruko|issibaige)\s+(?:man\s+)?(?:\S+\s+)?(?:kur(?:as|o)\b|dyzel|degal)|\bneturiu\s+(?:daugiau\s+)?(?:kuro|dyzelio|degalu)\b|\b(?:kuras|dyzelis|degalai)\s+(?:\S+\s+)?(?:baigesi|pritruko|issibaige)/, /agregat|saldytuv|adblue/],
  ['engine', /\bvarikl\S*\s+(?:\S+\s+)?(?:perkait|perkaist|kaista|uzgest|gesta|trukcio|neturi\s+galios|praranda\s+gali)|\bavarin\S*\s+rezim|\b(?:nera|neturi|praranda|truksta)\s+(?:\S+\s+)?galios\b/, /agregat|stabd|guol/],
  ['tyre', /\bpadang\S*\s+(?:\S+\s+)?(?:pazeist|ipjaut|ipjov|nudil|nusidev|guz|burbul|praranda\s+ora|leidzia\s+ora|isleidzia\s+ora)/, /sprog|pradur|truk|nuleid|plys|subliusk|tusc|valytuv|tent/],

  ['flat', /\bpadang\S*\s+(?:\S+\s+)?(?:suged|suluz|sulauz)\S*|\b(?:suged|suluz)\S*\s+(?:\S+\s+)?padang/, /atsargin|valytuv|tent|pagalv|\bnera\b|\bnebuvo\b/],
  ['tyre', /\bpadang\S*\s+(?:\S+\s+)?(?:sugadint|apgadint)\S*/, /atsargin|valytuv|tent|\bnera\b|\bnebuvo\b/],
  ['reefer', /\b(?:saldytuv|saldymo\s+(?:agregat|irengin)|agregat)\S*\s+(?:\S+\s+)?(?:nesald|neveik|aliarm|klaid|gedim|sugedo|issijung)/, /kabin/],
  ['susp', /\b(?:oro\s+)?pagalv\S*\s+(?:\S+\s+)?(?:sprogo|truko|plyso|praleidz|leidzia|pazeist|isleid)|\bpakab\S*\s+(?:\S+\s+)?(?:neveik|gedim|sugedo|pazeist)|\b(?:priekab|puspriekab|sunkvezim|vilkik)\S*\s+(?:\S+\s+)?(?:pasvir|svyra|krypsta|pakryp|sedi\s+zemai)/, /saugos|vairo/],
  ['gear', /\bneisijung\S*\s+(?:\S+\s+)?pavar|\bpavar\S*\s+(?:\S+\s+)?(?:neisijung|nesijung|nejung|neveik|klaid|gedim|uzstrig|sugedo)|\bsankab\S*\s+(?:\S+\s+)?(?:slysta|praslysta|neveik|sudeg|perdeg|sugedo)/],
  ['climate', /\b(?:kondicionier\S*|klimat\S*|sildym\S*|sildytuv\S*|webasto|pecius|autonomin\S*\s+sild\S*)\s+(?:\S+\s+)?(?:neveik|nesildo|nesald|nepucia|sugedo|neisijung)/, /sedyn|veidrod/],
  ['tarp', /\btent\S*\s+(?:\S+\s+)?(?:suplys|praplys|iplys|plyso|skyl|pradurt|pazeist)|\bskyl\S*\s+(?:\S+\s+)?tent/],
  ['exhaust', /\b(?:duslintuv\S*|ismetim\S*\s+vamzd\S*)\s+(?:\S+\s+)?(?:nukrito|kabo|skyl|prakiur|garsiai|triuksm|skilo|nuluz)/],
  ['visib', /\bvalytuv\S*\s+(?:\S+\s+)?(?:neveik|nevalo|nuluz|sulauz|sugedo)|\bstikl\S*\s+(?:\S+\s+)?(?:rasoja|aprasoj|apsiblaus)/],
  ['seat', /\b(?:saugos\s+)?dirz\S*\s+(?:\S+\s+)?(?:neuzsiseg|neveik|uzstrig|suplys|nelaiko)|\bsedyn\S*\s+(?:\S+\s+)?(?:sulauz|sulu|nuluz|neveik|nesireguliuoj|klib)/, /sildym|sildom|generator|ventiliator/],
  ['wheel', /\b(?:varzt|verzl)\S*\s+(?:\S+\s+){0,2}(?:atsilaisvin|atsisuk|nera|truksta|iskrito|nukrito|laisv)|\b(?:ratlank|disk)\S*\s+(?:\S+\s+)?(?:iskil|skilo|sulenkt|sulinko|nuluz)|\b(?:stebul|guol|ratas)\S*\s+(?:\S+\s+)?(?:karst|kaista|perkait|perkaist|uzia|kalena|klib)/, /stabd/],
  ['stuck', /\b(?:istrig|iklimp|uzstrig|isklimp)\S*\s+(?:\S+\s+){0,3}(?:purv|snieg|smel|bal(?:a|oje)\b)/],
  ['lost', /\b(?:pameciau|pamest\S*|dingo)\s+(?:\S+\s+)?(?:rakt|technin|liudijim)|\brakt\S*\s+(?:\S+\s+)?(?:pamest|dingo|nerandu|neberandu)|\b(?:negaliu\s+rasti|nerandu|neberandu)\s+(?:\S+\s+)?rakt/],
  ['numplate', /\b(?:valstybin\S*\s+)?numer\S*\s+(?:\S+\s+)?(?:nukrito|pamest|pavogt|neiskaitom|nuluz|dingo)|\bnumerio\s+lent\S*\s+(?:\S+\s+)?(?:nukrito|nuluz|pamest|pavogt)/, /apsviet|zibint|lemput|telefon/],
  ['adas', /\b(?:asistent|radar|jutikl|sensor|kamer|tempomat|kruiz)\S*\s+(?:\S+\s+){0,3}(?:neveik|klaid|gedim|issijung|sugedo)|\bstabdo\s+(?:\S+\s+)?(?:pats|savaime|be\s+priezast)/],
  ['door', /\bdur(?:ys|is|u|yse)\b\s+(?:\S+\s+)?(?:neuzsidar|neatsidar|neuzsirakin|neatsirakin|uzstrig|nesidaro)|\b(?:hidraulin\S*\s+)?(?:bort|keltuv|liftas|rampa)\S*\s+(?:\S+\s+)?(?:neveik|nekyla|nenusileid|gedim|sugedo|klaid)/, /lang/]];
const ltFold = (s) => String(s || '').toLowerCase().replace(/[ąčęėįšųūž]/g, (c) => 'aceeisuuz'['ąčęėįšųūž'.indexOf(c)]);
function ltKinds(v) { const k = new Set(); for (const p of ltFold(v).split(/[.,;!?\n]+/)) if (!LT_OK.test(p)) for (const [n, rx, ex] of LT_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); if (k.has('acc')) k.delete('injury'); return k; }
const LV_OK = /\bsalabo|\bnomain|\bsaremont|\b(?:jau|atkal)\s+(?:darbojas|strada)\b|\b(?:darbojas|strada)\s+(?:atkal|normali)\b|\bviss\s+(?:kartiba|labi)|\bbez\s+problem/;
const LV_KINDS = [['brake', /\bbremz\S*\s+(?:\S+\s+)?(?:nedarboj|nestrada|nebremz|vajas|neietur|atteic|pazud)|\bnebremz|\bvaj\S*\s+bremz|\b(?:krit|samazinas|pazud)\S*\s+(?:\S+\s+)?(?:gaisa\s+)?spiedien|\bspiedien\S*\s+(?:\S+\s+)?(?:krit|samazin)|\b(?:pus|laiz)\s+gaisu\b/, /rokas|stavbremz|luktur|gaism|asistent|\bpat[si]\b|\bpasa\b|iemesl|riep|spilven|avarijas/],
  ['fire', /\bugunsgrek|\baizdeg\S*\s+(?:\S+\s+)?(?:kabin|dzinej|motor|riten|riep|vad|piekab)|\b(?:kabin\S*|dzinej\S*|motor\S*|riten\S*|riep\S*|piekab\S*|vadi)\s+(?:\S+\s+)?deg\b|\bdeg\s+(?:kabine|dzinejs|motors|ritenis|riepa|piekabe|vadi)\b|\b(?:dumi|dumu|kup|kupej\S*)\b|\bdeguma|\bsvilum/, /izputej|slapetaj|wydech|vyhlop|auspuh|egzoz|esapament|kipufog|vyfuk|ismetim|duslintuv|ugunsdzes|lamp|kontrol|luktur|gaism/],
  ['flat', /\bpardur\S*|\b(?:parsprag\S*|plisa|plisusi|sprag\S*|nolaid\S*|nolaist\S*|tuks\S*)\s+(?:\S+\s+)?riep|\briep\S*\s+(?:\S+\s+)?(?:parsprag|plisa|plisusi|nolaid|nolaist|tuks|pardurt|sprag)/, /spilven|tent|slotin/],
  ['steer', /\bstur(?:e|i|es|ei)\b\s+(?:\S+\s+)?(?:iestreg|iestredz|bloket|nobloket|gruti|nedarboj|nestrada|negriez|klib)|\b(?:velk|rauj)\s+(?:\S+\s+)?(?:pa\s+)?(?:labi|kreisi)\b/],
  ['leak', /\b(?:ella|ellu|ellas|dizel|degviel|antifriz|dzesesanas\s+skidr|skidr|adblue)\S*\s+(?:\S+\s+)?(?:tek|pil|sucas|izteceja|noplud)\S*|\b(?:tek|pil|sucas|izteceja|noplud)\S*\s+(?:\S+\s+)?(?:ella|ellu|dizel|degviel|antifriz|dzesesanas|skidr|adblue)/],
  ['acc', /\bavarij|\bsadursm|\bietriec|\bsadur(?:os|as)\b|\batsit(?:os|as)\b|\baizker|\bnoskrap|\bsasit(?:u|a)\s+(?:\S+\s+)?(?:masin|auto|kravas)/, /rezim|akmen|skemb|gaism|signal|zime|trijstur|bremz/],

  ['acc', /\bapgaz(?:as|ies|usies|ts|ta)\b|\b(?:nobrauc|noslid|izlidoj)\S*\s+(?:\S+\s+)?no\s+cela|\b(?:iebrauc|ieslid|iekrit)\S*\s+gravi|\b(?:ir|esam|esmu|stav|palika|iestreg)\S*\s+(?:\S+\s+)?gravi\b/, /\bkrav(?!as\s+(?:auto|masin|automasin))|palet|\bnav\s+(?:\S+\s+)?gravi/],

  ['stuck', /\b(?:iebrauc|ieslid|iekrit|ir|esam|esmu|stav|palika|iestreg)\S*\s+(?:\S+\s+)?gravi\b/, /\bkrav(?!as\s+(?:auto|masin|automasin))|palet|\bnav\s+(?:\S+\s+)?gravi/],
  ['injury', /\bievainot|\bsavainoj|\batr(?:a|o|ajai)\s+palidzib|\bslimnic/],
  ['parkbrake', /\b(?:rokas\s+bremz|stavbremz)\S*\s+(?:\S+\s+)?(?:neturas|neietur|nedarboj|nestrada|neatlaiz|iestreg)|\b(?:aizripoja|noripoja|sakustejas|aizbrauca)\s+(?:\S+\s+)?(?:pati|pats|pasa)\b/],
  ['nostart', /\bneiedarboj|\bnevar\s+(?:\S+\s+)?iedarbin|\bstarter\S*\s+(?:\S+\s+)?(?:nedarboj|nestrada|negriez)/, /agregat|saldet|refrizerator|kondicion|apkur|sild|webasto|autonom/],
  ['mirror', /\bspogul\S*\s+(?:\S+\s+)?(?:noluz|saplis|nolauz|noraut|karaj|nedarboj|sasist|ieplis)|\b(?:noluz|saplis|nolauzt|noraut|sasist)\S*\s+(?:\S+\s+)?spogul/],
  ['lights', /\b(?:luktur|gaism|spuldz|virzienraditaj|pagrieziena\s+raditaj|migluktur)\S*\s+(?:\S+\s+)?(?:nespid|nedeg|nedarboj|nestrada|izdeg|saplis|sasist)|\b(?:nespid|nedeg)\S*\s+(?:\S+\s+)?(?:luktur|gaism|spuldz)|\bizdeg\S*\s+(?:\S+\s+)?(?:spuldz|luktur)/, /kontrol|panel|ekran|displej/],
  ['warnlight', /\b(?:kontrol\S*\s+)?lamp(?:ina|inas|a)\b\s+(?:\S+\s+)?(?:deg\b|mirgo|iedeg)|\b(?:deg|mirgo|iedeg\S*)\s+(?:\S+\s+){0,2}(?:kontrol\S*|lampin\S*|lampa)\b|\bkontrol(?:lamp|spuldz)\S*\s+(?:\S+\s+)?(?:deg\b|mirgo|iedeg)/],
  ['glass', /\b(?:vejstikl|stikl)\S*\s+(?:\S+\s+)?(?:ieplis|saplis|plaisa|sasist|ieplais)|\b(?:ieplis|saplis|plaisa|sasist)\S*\s+(?:\S+\s+)?(?:vejstikl|stikl)/, /spogul|akmen|skemb/],
  ['window', /\blog(?:s|a|i|u)\b\s+(?:\S+\s+)?(?:nenolaiz|necel|nedarboj|nestrada|iestreg|iestredz|neatver|neaizver)/, /slotin|tiritaj/],
  ['batt', /\b(?:akumulator|baterij)\S*\s+(?:\S+\s+)?(?:izlad|tuks|vajs|vaj\b|neuzlad|nosed|miris)|\b(?:izlad|nosed)\S*\s+(?:\S+\s+)?(?:akumulator|baterij)/, /kontrol|lamp/],
  ['tacho', /\btahograf\S*\s+(?:\S+\s+)?(?:nedarboj|nestrada|nenolasa|nelasa|kluda|kludu|bojat|nepienem)|\bkart(?:e|i|es)\b\s+(?:\S+\s+)?(?:iestreg|iestredz|nenolasa|nelasa|pazaudet|nozagt|bojat)|\b(?:pazaudeju|pazaudeta|nozaga|nozagta)\s+(?:\S+\s+)?(?:vaditaj\S*\s+)?kart|\bnevaru\s+(?:iznemt|izvilkt)\s+(?:\S+\s+)?kart|\bvaditaj\S*\s+kart\S*\s+(?:\S+\s+)?(?:nedarboj|nestrada|bojat)/, /degviel|maksajum|bankas|kredit/],
  ['coupling', /\b(?:piekab|puspiekab)\S*\s+(?:\S+\s+)?(?:atkabin|neatkabin|nesakabin|nepiekabin|nekabin)|\b(?:sakab|seglu\s+sakab|seglierice)\S*\s+(?:\S+\s+)?(?:nenosledz|nenosleg|nedarboj|nestrada|iestreg|nesledz|bojat)/],
  ['dryfuel', /\b(?:beidzas|beidzies|beigusies|pietruka|izbeidzas)\s+(?:\S+\s+)?(?:degviel|dizel)|\bnav\s+(?:vairs\s+)?(?:degviel|dizel)|\b(?:degviel|dizel)\S*\s+(?:\S+\s+)?(?:beidzas|beidzies|beigusies|pietruka)/, /agregat|saldet|adblue|kart/],
  ['engine', /\b(?:dzinej|motor)\S*\s+(?:\S+\s+)?(?:parkarst|sakarst|nevelk|noslap|slap|raust|zaude\s+jaud)|\bavarijas\s+rezim|\b(?:nav|zaude|truks)\S*\s+(?:\S+\s+)?jaud/, /agregat|bremz|gultn/],
  ['tyre', /\briep\S*\s+(?:\S+\s+)?(?:bojat|iegriez|nodil|nolietot|pump|burbul|zaude\s+gais|laiz\s+gais|maz\s+gais)/, /parsprag|plis|sprag|nolaid|nolaist|tuks|pardur|slotin|tent/],

  ['flat', /\briep\S*\s+(?:\S+\s+)?(?:saluz|salauz|beigt)\S*|\b(?:saluz|salauz)\S*\s+(?:\S+\s+)?riep/, /rezerv|slotin|tent|spilven|\bnav\b|\bnebija\b/],
  ['tyre', /\briep\S*\s+(?:\S+\s+)?sabojat\S*/, /rezerv|slotin|tent|\bnav\b|\bnebija\b/],
  ['reefer', /\b(?:saldetaj|refrizerator|agregat|dzesesanas\s+(?:agregat|iekart))\S*\s+(?:\S+\s+)?(?:nedzese|nesalde|nedarboj|nestrada|trauksm|kluda|kludu|bojat|izsledz)/, /kabin|ledusskap/],
  ['susp', /\b(?:gaisa\s+)?spilven\S*\s+(?:\S+\s+)?(?:plis|parplis|sprag|parsprag|laiz|bojat|nolaid)|\bpiekar\S*\s+(?:\S+\s+)?(?:nedarboj|bojat|nestrada)|\b(?:piekab|puspiekab|vilcej)\S*\s+(?:\S+\s+)?(?:saskieb|nolie|sveras|zemu)/, /drosib|stur/],
  ['gear', /\bneiesledz\S*\s+(?:\S+\s+)?(?:parnes|atrum)|\bnevar\s+ieslegt\s+(?:\S+\s+)?(?:parnes|atrum)|\b(?:atrumkarb|parnesumkarb)\S*\s+(?:\S+\s+)?(?:kluda|kludu|nedarboj|nestrada|iestreg|bojat)|\bsajug\S*\s+(?:\S+\s+)?(?:slid|nedarboj|nestrada|izdeg|sadeg)/],
  ['climate', /\b(?:kondicionier|klimat|apkur|sildit|webasto|autonom\S*\s+apkur)\S*\s+(?:\S+\s+)?(?:nedarboj|nestrada|nesilda|nedzese|neiesledz|bojat)/, /sedekl|spogul/],
  ['tarp', /\btent\S*\s+(?:\S+\s+)?(?:saples|saplis|plis|caurum|pardurt|bojat)|\bcaurum\S*\s+(?:\S+\s+)?tent/],
  ['exhaust', /\b(?:izputej|troksna\s+slapetaj|slapetaj)\S*\s+(?:\S+\s+)?(?:nokrit|karaj|caur|skal|ieplis|noluz|atdal)/],
  ['visib', /\b(?:slotin|tiritaj|stiklu\s+tiritaj)\S*\s+(?:\S+\s+)?(?:nedarboj|nestrada|netira|noluz|bojat)|\b(?:stikl|vejstikl|logs)\S*\s+(?:\S+\s+)?(?:aizsvist|svist|aizsvid|rasoj)/],
  ['seat', /\b(?:drosibas\s+)?jost\S*\s+(?:\S+\s+)?(?:neaizsprad|nedarboj|iestreg|saplis|neietur|neturas)|\bsedekl\S*\s+(?:\S+\s+)?(?:saluz|noluz|nedarboj|nestrada|neregul|logas|kustas)/, /sild/],
  ['wheel', /\b(?:skruv|uzgriezn)\S*\s+(?:\S+\s+){0,2}(?:valig|atskruv|truks|nokrit|izkrit)|\b(?:disk|ritendisk)\S*\s+(?:\S+\s+)?(?:ieplis|plaisa|saliekt|saluz)|\b(?:rumb|gultn|ritenis)\S*\s+(?:\S+\s+)?(?:karst|sakarst|parkarst|duc|klab|klib)/, /bremz/],
  ['stuck', /\b(?:iestreg|iestredz|iespru|iegrim)\S*\s+(?:\S+\s+){0,3}(?:dubl|snieg|smilt|purv)/],
  ['lost', /\b(?:pazaudeju|pazaudet\S*|pazuda)\s+(?:\S+\s+)?(?:atsleg|tehnisk|registracijas\s+apliecib|apliecib)|\batsleg\S*\s+(?:\S+\s+)?(?:pazaudet|pazud|nevaru\s+atrast)|\bnevaru\s+atrast\s+(?:\S+\s+)?atsleg/],
  ['numplate', /\b(?:numurzim|valsts\s+numur|numur)\S*\s+(?:\S+\s+)?(?:nokrit|pazaudet|nozagt|noluz|nav\s+salasam|nesalasam|pazud)/, /apgaism|gaism|spuldz|telefon/],
  ['adas', /\b(?:asistent|radar|sensor|kamer|kruiza\s+kontrol|tempomat)\S*\s+(?:\S+\s+){0,3}(?:nedarboj|nestrada|kluda|kludu|izsledz|bojat)|\bbremze\s+(?:\S+\s+)?(?:pats|pati|bez\s+iemesl)/],
  ['door', /\bdurv\S*\s+(?:\S+\s+)?(?:neaizver|neatver|neaizsledz|neatsledz|iestreg|iestredz)|\b(?:hidraulisk\S*\s+)?(?:bort|lift|pacelaj|rampa)\S*\s+(?:\S+\s+)?(?:nedarboj|nestrada|necel|nenolaiz|kluda|bojat)/, /\blog/]];
const lvFold = (s) => String(s || '').toLowerCase().replace(/[āčēģīķļņšūž]/g, (c) => 'acegiklnsuz'['āčēģīķļņšūž'.indexOf(c)]);
function lvKinds(v) { const k = new Set(); for (const p of lvFold(v).split(/[.,;!?\n]+/)) if (!LV_OK.test(p)) for (const [n, rx, ex] of LV_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); if (k.has('acc')) k.delete('injury'); return k; }
const SQ_OK = /\bu\s+(?:riparua|rregullua|nderrua)n?\b|\b(?:riparuar|rregulluar|nderruar)\b|\bpunon\s+(?:perseri|prape|normal)|\bne\s+rregull\b|\bpa\s+problem/;
const SQ_KINDS = [['brake', /\bfren\S*\s+(?:\S+\s+)?(?:nuk\s+(?:punon|punojne|mbajne|mban|kapin|kap)|jane\s+te\s+dobet|te\s+dobet|dobet)|\bnuk\s+frenon\b|\b(?:ra|bie|humbet|ulet)\s+(?:\S+\s+)?presion\S*\s+(?:i\s+)?(?:te\s+)?ajri|\bpresion\S*\s+(?:i\s+)?ajri\S*\s+(?:\S+\s+)?(?:ra|bie|ulet)\b|\b(?:humb|humbet|fryn|nxjerr)\s+aj[eë]r\b/, /dore|drit|llamb|asistent|vete|arsye|gom|jastek|balon/],
  ['fire', /\bzjarr\b|\bmori\s+zjarr|\b(?:digjet|po\s+digjet|u\s+dogj)\s+(?:\S+\s+)?(?:kabin|motor|rrot|gom|kabllo|rimorkio)|\b(?:kabin\S*|motor\S*|rrot\S*|gom\S*|kabllo\S*|rimorkio\S*)\s+(?:\S+\s+)?(?:po\s+)?digjet\b|\btym\b|\btymi\b|\btymos|\bere\s+(?:\S+\s+)?djegi/, /marmit|shkarkim|zjarrfik|fikes|llamb|drit|fener|friksion|wydech|vyhlop|auspuh|egzoz|esapament|kipufog|vyfuk|izputej|ismetim|duslintuv/],
  ['flat', /\bgom\S*\s+(?:\S+\s+)?(?:u\s+)?(?:shpua|shpuar|plasi|plasur|shfry|shfryre|shfrye|shfryra)\b|\b(?:shpova|shpuam|plasi|u\s+shpua|u\s+shfry)\s+(?:\S+\s+)?gom/, /jastek|balon|tend|fshir/],
  ['steer', /\btimon\S*\s+(?:\S+\s+)?(?:u\s+)?(?:bllokua|bllokuar|eshte\s+bllokuar|rende|nuk\s+(?:kthehet|punon|rrotullohet)|lekundet|ka\s+loje)|\b(?:terheq|teheq|shkon)\s+(?:\S+\s+)?(?:ne\s+te\s+|nga\s+e\s+)?(?:djathte|majte|djathtas|majtas)\b/],
  ['leak', /\b(?:rrjedh|pikon|pikojne|derdhet|humb|humbet)\s+(?:\S+\s+)?(?:vaj|naft|karburant|antifriz|ftohes|leng|adblue)|\b(?:vaj|naft|karburant|antifriz|leng\S*\s+ftohes|adblue)\S*\s+(?:\S+\s+)?(?:rrjedh|pikon|derdhet)\b/],
  ['acc', /\baksident|\bperplas|\bu\s+godit|\bgodita\s+(?:\S+\s+)?(?:makin|kamion|mur|shtyll|automjet|vetur)|\bgoditem\b|\bme\s+goditi\s+(?:nje\s+)?(?:makin|kamion|vetur)/, /gur|zhavor|emergjenc|trekendesh|drit|llamb/],

  ['acc', /\bpermbys|\b(?:dola|doli|dolem)\s+(?:\S+\s+)?(?:nga|jashte)\s+(?:\S+\s+)?rrug|\b(?:rashe|ra|perfundova|perfundoi|ngeli|ngeci|mbeti|mbeta|mbetem)\s+(?:\S+\s+)?ne\s+(?:kanal|hendek)|\b(?:kamion|makin|rimorkio|automjet|furgon)\S*\s+(?:nuk\s+)?(?:eshte|jane)\s+ne\s+(?:kanal|hendek)/, /ngarkes|palet|\bnuk\s+(?:u\s+)?(?:permbys|dola|doli|ra|eshte|jane|ngeli|ngeci|mbeti)/],

  ['stuck', /\b(?:rashe|ra|perfundova|perfundoi|ngeli|ngeci|mbeti|mbeta|mbetem)\s+(?:\S+\s+)?ne\s+(?:kanal|hendek)|\b(?:kamion|makin|rimorkio|automjet|furgon)\S*\s+(?:nuk\s+)?(?:eshte|jane)\s+ne\s+(?:kanal|hendek)/, /ngarkes|palet|\bnuk\b/],
  ['injury', /\b(?:jam|eshte|u)\s+(?:i\s+|e\s+)?plagos|\bte\s+plagosur|\bambulanc|\bndihm\S*\s+e\s+shpejte|\bspital/],
  ['parkbrake', /\bfren\S*\s+(?:e\s+)?dores\s+(?:\S+\s+)?(?:nuk\s+(?:mban|punon|leshon|lirohet)|u\s+bllokua|bllokuar)|\b(?:u\s+rrokullis|leviz\S*|iku|shkoi)\s+(?:\S+\s+)?vete\b/],
  ['nostart', /\b(?:motor\S*\s+)?nuk\s+(?:ndizet|niset|startohet)\b|\bstarter\S*\s+(?:\S+\s+)?nuk\s+(?:punon|rrotullohet)/, /drit|llamb|fener|ngroh|kondicion|klim|frigo|agregat|webasto|kalorifer|sinjal/],
  ['mirror', /\bpasqyr\S*\s+(?:\S+\s+)?(?:u\s+)?(?:thye|theu|thyer|ra|u\s+keput|keput|varet|nuk\s+punon|plasi)|\b(?:theva|thyem|u\s+thye)\s+(?:\S+\s+)?pasqyr/],
  ['lights', /\b(?:drit|fener|fanar|llamb|sinjalizues|pulsues|freca)\S*\s+(?:\S+\s+){0,2}(?:nuk\s+(?:ndiz|punon|punojne|ndriço|ndrico)|u\s+dogj|eshte\s+djegur|jane\s+djegur|u\s+thye|thyer)|\bu\s+dogj\s+(?:\S+\s+)?(?:llamb|drit|fener)/, /panel|ekran|kontroll|motorit/],
  ['warnlight', /\b(?:u\s+ndez|ndizet|pulson|eshte\s+ndezur|ndezur)\s+(?:\S+\s+){0,2}(?:llamb|drit\S*\s+e\s+kuqe|drit\S*\s+e\s+verdhe|sinjal\S*\s+(?:ne|i)\s+panel)|\bllamb\S*\s+(?:\S+\s+){0,2}(?:u\s+ndez|ndizet|pulson|eshte\s+ndezur)/, /\bnuk\b|dogj|djegur/],
  ['glass', /\bxham\S*\s+(?:\S+\s+){0,2}(?:u\s+ca|care|u\s+thye|thyer|plasi|plasarit|u\s+plas)|\b(?:plasaritj|carj)\S*\s+(?:\S+\s+)?(?:ne\s+)?xham/, /pasqyr|gur|zhavor|dere|dritar|avull|mjegull/],
  ['window', /\b(?:dritar\S*|xham\S*\s+(?:i|e)\s+der\S*)\s+(?:\S+\s+)?nuk\s+(?:ulet|ngrihet|hapet|mbyllet|punon)|\bngrites\S*\s+(?:\S+\s+)?(?:i\s+xhamit\s+)?nuk\s+punon/, /fshir/],
  ['batt', /\b(?:bateri|akumulator)\S*\s+(?:\S+\s+)?(?:u\s+shkarkua|shkarkuar|bosh|ra\b|ka\s+rene|e\s+dobet|nuk\s+mban)|\bu\s+shkarkua\s+(?:\S+\s+)?(?:bateri|akumulator)/, /llamb|telefon|celular/],
  ['tacho', /\b(?:tahograf|takograf|tachograf)\S*\s+(?:\S+\s+)?(?:nuk\s+(?:punon|lexon|pranon)|gabim|ka\s+defekt|prishur|u\s+prish)|\bkart\S*\s+(?:e\s+)?(?:shoferit\s+|drejtuesit\s+)?(?:\S+\s+)?(?:mbeti\s+brenda|u\s+bllokua|bllokuar|nuk\s+(?:lexohet|del|punon))|\bhumba\s+(?:\S+\s+)?kart|\bkart\S*\s+(?:e\s+)?(?:shoferit|drejtuesit)\s+(?:\S+\s+)?(?:humbi|u\s+humb|u\s+vodh)/, /karburant|naft|bank|kredit|pages/],
  ['coupling', /\b(?:rimorkio|gjysmerimorkio|gjysme\s+rimorkio)\S*\s+(?:\S+\s+)?(?:u\s+shkeput|u\s+zgjidh|nuk\s+(?:lidhet|bashkohet|shkeputet))|\b(?:shal\S*|rrot\S*\s+e\s+peste)\s+(?:\S+\s+)?(?:nuk\s+(?:mbyllet|punon|kyçet|kycet)|u\s+bllokua|bllokuar)/],
  ['dryfuel', /\b(?:mbaroi|mbaron|na\s+mbaroi|me\s+mbaroi)\s+(?:\S+\s+)?(?:nafta|karburant)|\bnuk\s+(?:ka|kemi|kam)\s+(?:me\s+)?(?:naft|karburant)|\bmbeta\s+pa\s+(?:naft|karburant)/, /agregat|frigo|adblue|kart/],
  ['engine', /\bmotor\S*\s+(?:\S+\s+)?(?:nxehet|u\s+nxeh|u\s+mbinxeh|mbinxehet|nuk\s+terheq|humb\S*\s+fuqi|pa\s+fuqi|fiket|u\s+fik|dridhet)|\bregjim\S*\s+(?:i\s+)?(?:emergjenc|urgjenc)|\bnuk\s+ka\s+fuqi\b/, /agregat|frigo|fren|kushinet/],
  ['tyre', /\bgom\S*\s+(?:\S+\s+)?(?:e\s+)?(?:demtuar|u\s+demtua|prere|u\s+pre|konsumuar|ka\s+flluske|flluske|humb\S*\s+aj[eë]r|ka\s+pak\s+aj[eë]r|pa\s+aj[eë]r)/, /shpua|plas|shfry|fshir|tend/],

  ['flat', /\bgom\S*\s+(?:\S+\s+){0,2}(?:e\s+)?(?:u\s+)?prish\S*|\bu\s+prish\S*\s+(?:\S+\s+)?gom/, /rezerv|fshir|jastek|balon|tend|\b(?:nuk|s)\s+(?:\S+\s+)?(?:e\s+)?(?:u\s+)?prish/],
  ['reefer', /\b(?:frigorifer|frigo|agregat|ftohes\S*\s+(?:i\s+)?rimorkio)\S*\s+(?:\S+\s+)?(?:nuk\s+(?:ftoh|ngrin|punon)|jep\s+alarm|alarm|gabim|ka\s+defekt|u\s+fik)/, /kabin/],
  ['susp', /\b(?:jastek\S*|balon\S*)\s+(?:\S+\s+)?(?:(?:i\s+|e\s+)?ajrit\s+)?(?:plasi|u\s+shpua|shpuar|humb|leshon|u\s+ul)|\bpezullim\S*\s+(?:\S+\s+)?(?:nuk\s+punon|ka\s+defekt|u\s+prish)|\b(?:rimorkio|gjysmerimorkio|kamion)\S*\s+(?:\S+\s+)?(?:eshte\s+)?(?:anuar|u\s+anua|anohet|shtrembe)/, /sigurim|timon/],
  ['gear', /\bnuk\s+(?:hyn|futet|fus)\s+(?:\S+\s+)?marsh|\bmarsh\S*\s+(?:\S+\s+)?nuk\s+(?:hyn|futet)|\bkuti\S*\s+(?:e\s+)?(?:shpejtesi|marsh)\S*\s+(?:\S+\s+)?(?:gabim|ka\s+defekt|nuk\s+punon|u\s+prish|bllokuar)|\bfriksion\S*\s+(?:\S+\s+)?(?:rreshqet|nuk\s+punon|u\s+dogj|djegur)/],
  ['climate', /\b(?:kondicioner|klim|ngrohj|kalorifer|webasto)\S*\s+(?:\S+\s+)?(?:nuk\s+(?:punon|ngroh|ftoh|ndizet)|ka\s+defekt|u\s+prish)/, /ndenjes|sedilj|pasqyr/],
  ['tarp', /\b(?:tend|mushama|telon)\S*\s+(?:\S+\s+)?(?:u\s+gris|grisur|u\s+shqye|shqyer|vrim|u\s+ça|u\s+ca|e\s+cjerre)|\bvrim\S*\s+(?:\S+\s+)?(?:ne\s+)?(?:tend|mushama|telon)/],
  ['exhaust', /\b(?:marmit|tub\S*\s+(?:i\s+)?shkarkim)\S*\s+(?:\S+\s+)?(?:ra|u\s+keput|keputur|varet|u\s+shpua|vrim|u\s+ça|u\s+ca)/],
  ['visib', /\bfshires\S*\s+(?:\S+\s+)?(?:nuk\s+(?:punon|punojne|fshijne|fshin)|u\s+thye|thyer|ka\s+defekt)|\bxham\S*\s+(?:\S+\s+)?(?:avullo|mjegullo|zbardhet)/],
  ['seat', /\brrip\S*\s+(?:i\s+)?sigurim\S*\s+(?:\S+\s+)?(?:nuk\s+(?:mbyllet|mban|punon|del)|u\s+keput|bllokuar)|\b(?:ndenjes|sedilj)\S*\s+(?:\S+\s+)?(?:u\s+prish|prishur|u\s+thye|thyer|nuk\s+(?:rregullohet|punon)|leviz|lekundet)/, /ngroh/],
  ['wheel', /\b(?:bulon|dado)\S*\s+(?:\S+\s+){0,3}(?:te\s+)?(?:liruar|u\s+liruan|u\s+lirua|mungojne|ra\b|rane)|\bdisk\S*\s+(?:\S+\s+)?(?:i\s+)?(?:rrotes\s+)?(?:u\s+ca|care|plasi|u\s+shtremberua|shtremberuar)|\b(?:moz|kushinet|rrota)\S*\s+(?:\S+\s+)?(?:nxehet|e\s+nxehte|u\s+nxeh|zhurm|troket|lekundet)/, /fren/],
  ['stuck', /\b(?:ngela|ngeci|ngecem|mbeta|mbeti|u\s+ngul|u\s+fut)\s+(?:\S+\s+){0,2}(?:balt|bore|rere|lloç|lloc|kenet)/],
  ['lost', /\bhumba\s+(?:\S+\s+)?(?:celes|lej\S*\s+e\s+qarkullimit|librez)|\bceles\S*\s+(?:\S+\s+)?(?:humben|humbi|u\s+humben)|\bnuk\s+(?:i\s+)?gjej\s+(?:\S+\s+)?celes/],
  ['numplate', /\btarg\S*\s+(?:\S+\s+)?(?:ra\b|u\s+keput|humbi|u\s+humb|u\s+vodh|nuk\s+lexohet|u\s+thye)/, /drit|llamb|ndriçim|ndricim|telefon/],
  ['adas', /\b(?:asistent|radar|sensor|kamer|tempomat|kontroll\S*\s+i\s+shpejtesise)\S*\s+(?:\S+\s+){0,3}(?:nuk\s+punon|gabim|ka\s+defekt|u\s+fik|u\s+çaktivizua|u\s+caktivizua)|\bfrenon\s+(?:\S+\s+)?(?:vete|pa\s+arsye)/],
  ['door', /\b(?:der\S*|dyer\S*)\s+(?:\S+\s+)?nuk\s+(?:mbyllet|hapet|mbyllen|hapen|kycet|kyçet|kycen|kyçen)|\b(?:bord\S*|ashensor\S*|platform\S*)\s+(?:\S+\s+)?(?:hidraulik\S*\s+)?(?:nuk\s+(?:punon|ngrihet|ulet)|gabim|ka\s+defekt|u\s+prish)/, /dritar|xham/]];
const sqFold = (s) => String(s || '').toLowerCase().replace(/[ëç]/g, (c) => (c === 'ë' ? 'e' : 'c'));
const SQ_NEG = /\b(?:nuk|s)\s+(?:(?:u|eshte|jane|ka|kane|esht)\s+)?(?:shpua|shpuar|plasi|plasur|shfry|thye|theu|thyer|keput|rrjedh|pikon)\S*/g;
const SQ_FUNK = /\bfunksion\S*/g;
function sqKinds(v) { const k = new Set(); for (const p of sqFold(v).replace(SQ_FUNK, 'punon').replace(SQ_NEG, ' ').split(/[.,;!?\n]+/)) if (!SQ_OK.test(p)) for (const [n, rx, ex] of SQ_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); if (k.has('acc')) k.delete('injury'); return k; }
const ET_OK = /\b(?:parandatud|parandati|parandasin|vahetatud|vahetati|vahetasin)\b|\btootab\s+(?:jalle|uuesti|taas|normaalselt)|\b(?:koik|on\s+nuud)\s+korras\b|\bprobleem(?:e|id)?\s+(?:pole|ei\s+ole)\b|\bprobleemideta\b/;
const ET_KINDS = [['brake', /\bpidur\S*\s+(?:\S+\s+)?(?:ei\s+(?:toota|pea|toimi|haara|hoia)|on\s+norgad|norgad|norgalt)|\bei\s+pidurda\b|\bohurohk\S*\s+(?:\S+\s+)?(?:langeb|langes|kukub|kukkus|kaob|kadus)|\b(?:langeb|langes|kukub|kukkus|kadus)\s+(?:\S+\s+)?ohurohk|\b(?:lekib|laseb|kaotab)\s+ohku\b/, /tul|lamp|assistent|\bise\b|iseenesest|pohjuseta|rehv|kumm|padi|padja|kasipidur|seisupidur/],
  ['fire', /\btulekahju|\bsuitseb|\bsuitses|\bsuitsu\b|\bsuits\s+(?:tuleb|kabiin|mootor)|\b(?:kabiin|mootor|ratas|ratta|rehv|juhtme|haagis)\S*\s+(?:\S+\s+)?(?:poleb|laks\s+polema|hakkas\s+polema|vottis\s+tule)|\b(?:poleb|laks\s+polema|vottis\s+tule)\s+(?:\S+\s+)?(?:kabiin|mootor|ratas|rehv|juhtmed|haagis)|\bkorbe\s*(?:lohn|hais)|\bkorbelohn|\bkorbehais/, /summut|valjalask|heitgaas|kustut|\btul(?:i|ed|eke|uke|ukesed)\b|margutul|kontrolltul|lamp|sidur|marmit|wydech|vyhlop|auspuh|egzoz|esapament|kipufog|vyfuk|izputej|ismetim|duslintuv/],
  ['flat', /\b(?:rehv|kumm)\S*\s+(?:\S+\s+)?(?:lohkes|lohkenud|puhkes|on\s+tuhi|tuhi\b|tuhjaks|augus|katki)|\b(?:lohkes|lohkenud|puhkes)\s+(?:\S+\s+)?(?:rehv|kumm)/, /padi|padja|tent|tend|kojam|klaasipuhast/],
  ['steer', /\brool\S*\s+(?:\S+\s+)?(?:on\s+)?(?:kinni|kiilus|raske|ei\s+(?:poora|toota|keera)|logiseb|lotendab|vabakaik)|\b(?:veab|tombab|kisub)\s+(?:\S+\s+)?(?:paremale|vasakule)\b/],
  ['leak', /\b(?:oli|kutus|diisel|antifriis|jahutusvedel|vedelik|adblue)\S*\s+(?:\S+\s+)?(?:lekib|lekkis|tilgub|tilkus|voolab\s+valja|jookseb\s+valja)|\b(?:lekib|lekkis|tilgub|tilkus)\s+(?:\S+\s+)?(?:oli|olit|kutus|kutust|diisel|diislit|antifriis|jahutusvedel|vedelik|adblue)|\b(?:oli|kutuse|diisli|antifriisi|jahutusvedeliku)leke/],
  ['acc', /\bavarii|\bonnetus|\bkokkupor|\bporka\S*\s+(?:\S+\s+)?kokku|\b(?:soitsin|soitis|soitsime|tagurdasin)\s+(?:\S+\s+){0,3}otsa\b|\bsain\s+(?:\S+\s+)?otsa\b/, /avariitul|avariirez|avariimark|avariipidur|avariik|avariin|kolmnurk|kivi|killust|tul(?:ed|i)\b/],

  ['acc', /\b(?:laks|lainud|laksime)\s+(?:\S+\s+)?umber\b|\bumber\s+(?:laks|lainud)|\b(?:soitsin|soitis|soitsime|libisesin|libises)\s+(?:\S+\s+)?(?:teelt\s+valja|kraavi)|\bkraavis\b/, /koorem|\blast\b|\balus|\b(?:ei|pole)\s+(?:\S+\s+){0,2}?(?:lainud|soitnud|libisenud)|\b(?:ei|pole)\s+(?:\S+\s+)?kraavi/],

  ['stuck', /\b(?:soitsin|soitis|soitsime|libisesin|libises|vajus|vajusin|vajusime)\s+(?:\S+\s+)?kraavi|\bkraavis\b/, /koorem|\blast\b|\balus|\b(?:ei|pole)\s+(?:\S+\s+)?kraavi/],
  ['injury', /\bsa(?:in|ime)\s+(?:\S+\s+)?viga\b|\bkiirabi|\bhaigla|\bolen\s+vigastatud|\b(?:juht|inime|isik|kaassoitja)\S*\s+(?:on\s+|sai\s+)?vigasta/],
  ['parkbrake', /\b(?:kasipidur|seisupidur)\S*\s+(?:\S+\s+)?(?:ei\s+(?:pea|hoia|toota|vabane|lahe\s+maha)|kinni|kiilus)|\b(?:veeres|veereb|liikus|hakkas\s+veerema)\s+(?:\S+\s+)?ise\b/],
  ['nostart', /\bei\s+(?:kaivitu|lahe\s+kaima)\b|\bstarter\S*\s+(?:\S+\s+)?ei\s+(?:toota|keera|poora)/, /agregaat|kulmuti|kliima|\bkute|kutte|soojend|webasto|\btul(?:i|ed)\b|lamp/],
  ['mirror', /\bpee(?:gel|gl)\S*\s+(?:\S+\s+)?(?:on\s+)?(?:katki|murdus|purunes|kukkus|ripub|lahti|ei\s+toota)|\b(?:lohkusin|murdsin|lohuti|purustati)\s+(?:\S+\s+)?peegl/],
  ['lights', /\b(?:tuli|tuled|tule|esitul|tagatul|suunatul|suunaja|piduritul|numbritul|udutul|kaugtul|lahitul|lamp|pirn)\S*\s+(?:\S+\s+)?(?:ei\s+(?:pole|toota|sutti|polenud)|laks\s+labi|on\s+labi|katki|purunes)|\bpirn\S*\s+(?:\S+\s+)?(?:labi|katki)/, /kontroll|margutul|hoiatus|armatuur|ekraan|naidik|tuluke/],
  ['warnlight', /\b(?:margutul|kontrolltul|hoiatustul|tuluke|tulukes|lamp|(?:mootori|aku|oli|piduri|rehvi)\s+tul|punane\s+tul|kollane\s+tul)\S*\s+(?:\S+\s+)?(?:poleb|vilgub|suttis|jai\s+polema)|\b(?:suttis|poleb|vilgub|suttisid)\s+(?:\S+\s+){0,2}(?:margutul|kontrolltul|hoiatustul|tuluke|tulukes|lamp|punane\s+tul|kollane\s+tul|mootori\s+tul)/, /\bei\b/],
  ['glass', /\b(?:esiklaas|tuuleklaas|klaas)\S*\s+(?:\S+\s+){0,2}(?:moran|pragun|praod|mora\b|morad\b|katki|purunes|puruks)|\b(?:mora|morad|pragu)\s+(?:\S+\s+)?(?:esiklaas|tuuleklaas|klaas)/, /peegl|peegel|kivi|killust|aken|akna|\buks|ukse|udu|higist|auru/],
  ['window', /\b(?:aken|akna|aknad)\S*\s+(?:\S+\s+)?ei\s+(?:lahe|liigu|avane|sulgu|toota|kerki)|\baknatost\S*\s+(?:\S+\s+)?(?:ei\s+toota|katki|rikkis)/, /kojam|klaasipuhast/],
  ['batt', /\b(?:aku|akud|akumulaator\S*)\b\s+(?:\S+\s+)?(?:on\s+)?(?:tuhi|tuhjaks|tuhjenes|ei\s+laadi|suri|nork|labi)|\btuhjenes\s+(?:\S+\s+)?aku/, /\btul|lamp|telefon/],
  ['tacho', /\b(?:tahhograaf|tahograaf|tachograaf|soidumeerik)\S*\s+(?:\S+\s+)?(?:ei\s+(?:toota|loe|vota|tunne)|viga|vea|annab\s+vea|katki|rikkis)|\b(?:juhi)?kaar[dt]\S*\s+(?:\S+\s+)?(?:jai\s+kinni|kinni|ei\s+(?:tule\s+valja|loe|toota)|kadus|varastati)|\b(?:kaotasin|kaotas|varastati)\s+(?:\S+\s+)?(?:juhi)?kaar[dt]/, /kutuse|tankim|pank|krediit|makse/],
  ['coupling', /\b(?:poolhaagis|haagis)\S*\s+(?:\S+\s+)?(?:haakus\s+lahti|tuli\s+lahti|ei\s+(?:haagi|haaku|tule\s+lahti|uhendu))|\bsadul\S*\s+(?:\S+\s+)?(?:ei\s+(?:sulgu|lukustu|toota)|kinni|katki|rikkis)/],
  ['dryfuel', /\b(?:kutus|diisel|kutust|diislit)\S*\s+(?:\S+\s+)?(?:sai\s+otsa|on\s+otsas|otsas|lopp)|\b(?:pole|ei\s+ole)\s+(?:enam\s+)?(?:kutust|diislit)|\bjai\S*\s+(?:\S+\s+)?(?:kutusest|diislist)\s+(?:ilma|tuhjaks)/, /agregaat|kulmuti|adblue|kaar/],
  ['engine', /\bmootor\S*\s+(?:\S+\s+)?(?:kuumeneb|ulekuumen|keeb|ei\s+vea|jouetu|kaotab\s+voimsust|seiskus|seiskub|turtsub|tuksub)|\bavariirez|\bvoimsus\S*\s+(?:\S+\s+)?(?:puudub|kadus|langes)|\bei\s+ole\s+voimsust/, /agregaat|kulmuti|pidur|laager/],
  ['tyre', /\b(?:rehv|kumm)\S*\s+(?:\S+\s+){0,2}(?:kulunud|vigast|kahjust|mull|muhk|loige|laseb\s+ohku|kaotab\s+ohku|vahe\s+ohku|madal\s+rohk)/, /lohke|tuhi|tuhjaks|augus|katki|kojam|klaasipuhast|tent|tend|padi|padja/],

  ['flat', /\b(?:rehv|kumm)\S*\s+(?:\S+\s+){0,2}rikk/, /varu|padi|padja|tent|tend|kojam|klaasipuhast|\b(?:ei|pole)\s+(?:\S+\s+)?rikk/],
  ['reefer', /\b(?:kulmaagregaat|agregaat|kulmuti|kulmseade|jahutusseade|kulmutus|refrizeraator)\S*\s+(?:\S+\s+)?(?:ei\s+(?:jahuta|kulmuta|toota|kaivitu)|annab\s+(?:hairet|alarmi|vea)|hair|alarm|viga|vea|rikkis|katki|lulitus\s+valja)/, /kabiin|kulmkap/],
  ['susp', /\b(?:ohkpad|ohupad|ohkpadj|ohupadj|padi|padjad)\S*\s+(?:\S+\s+)?(?:lohkes|lohkenud|lekib|laseb|katki|rebenes|tuhi)|\bvedrustus\S*\s+(?:\S+\s+)?(?:ei\s+toota|rikkis|katki|viga)|\b(?:poolhaagis|haagis|veduk|auto)\S*\s+(?:\S+\s+)?(?:on\s+)?(?:viltu|kaldu|vajus|vajunud)/, /turva|rool|iste|istme/],
  ['gear', /\b(?:kaik|kaigud|kaiku)\S*\s+(?:\S+\s+)?ei\s+(?:lahe|taha)\s+sisse|\bei\s+saa\s+(?:\S+\s+)?kaiku|\bkaigukast\S*\s+(?:\S+\s+)?(?:annab\s+vea|viga|vea|ei\s+toota|rikkis|katki|kinni)|\bsidur\S*\s+(?:\S+\s+)?(?:libiseb|ei\s+toota|poles|labi|katki)/],
  ['climate', /\b(?:kliima|konditsioneer|kute|kutteseade|kutte|soojend|webasto|lisakute|puhur)\S*\s+(?:\S+\s+)?(?:ei\s+(?:toota|jahuta|soojenda|kuta|kaivitu|lahe\s+kaima)|rikkis|katki)/, /istme|iste|peegl/],
  ['tarp', /\bten[dt]\S*\s+(?:\S+\s+)?(?:on\s+)?(?:rebenes|rebenenud|katki|auk|augus|lohki)/],
  ['exhaust', /\b(?:summuti|valjalask|heitgaasitoru)\S*\s+(?:\S+\s+)?(?:on\s+)?(?:kukkus|ripub|lahti|katki|auk|augus|murdus)/],
  ['visib', /\b(?:kojam|klaasipuhast)\S*\s+(?:\S+\s+)?(?:ei\s+(?:toota|puhasta|liigu)|katki|murdus|rikkis)|\b(?:klaas|aken|aknad|esiklaas)\S*\s+(?:\S+\s+){0,2}(?:udu|higist|auru|tuhmu)/],
  ['seat', /\bturvavoo\S*\s+(?:\S+\s+)?(?:ei\s+(?:kinnitu|tule|hoia|toota|lukustu)|kinni|katki|rebenes)|\b(?:iste|istme|istet)\b\s+(?:\S+\s+)?(?:on\s+)?(?:katki|murdus|ei\s+(?:reguleeru|toota|liigu)|loksub|logiseb|koigub)/, /soojend|\bkute|kutte/],
  ['wheel', /\b(?:rattamutr|mutr|rattapolt|polt|poldid)\S*\s+(?:\S+\s+){0,2}(?:lahti|puudu|kukkusid|kukkus|logisevad|logiseb)|\b(?:velg|veljed|velje)\S*\s+(?:\S+\s+)?(?:on\s+)?(?:moran|pragu|mora\b|kover|murdus)|\b(?:rattalaager|laager|rumm|ratas)\S*\s+(?:\S+\s+)?(?:kuumeneb|kuum\b|ulekuumen|undab|kolksub|logiseb|loksub)/, /pidur/],
  ['stuck', /\b(?:porisse|poris|mudasse|mudas|lumme|lumes|lumesse|liiva|liivas|liivasse|soosse|soos)\s+(?:\S+\s+)?kinni|\bkinni\s+(?:\S+\s+)?(?:poris|porisse|mudas|mudasse|lumes|lumme|liivas|liivasse|soos)\b|\b(?:jain|jai|jaime)\s+(?:\S+\s+)?(?:porisse|mudasse|lumme|liiva|liivasse|soosse)\b/],
  ['lost', /\b(?:kaotasin|kaotas)\s+(?:\S+\s+)?(?:votm|registreerimistunnistus|tehnilise\s+passi|tehnilise)|\bvotm\S*\s+(?:\S+\s+)?(?:on\s+)?(?:kadunud|kadusid|kaotsi|kadus)|\bei\s+leia\s+(?:\S+\s+)?votm/],
  ['numplate', /\b(?:numbrimar\S*|numbriplaat\S*|number)\s+(?:\S+\s+)?(?:on\s+)?(?:kukkus|kadunud|kadus|varastati|murdus|katki|loetamatu|pole\s+loetav|ei\s+ole\s+loetav)/, /\btul|valgust|telefon/],
  ['adas', /\b(?:assistent|radar|andur|sensor|kaamera|tagurduskaamera|pusikiirus|tempomat|kiirusehoidja|soiduraja|reahoid)\S*\s+(?:\S+\s+){0,3}(?:ei\s+toota|annab\s+vea|viga|vea|lulitus\s+valja|rikkis|katki)|\bpidurdab\s+(?:\S+\s+)?(?:ise|iseenesest|asjata|pohjuseta)/],
  ['door', /\b(?:uks|uksed|ukse)\b\s+(?:\S+\s+)?(?:ei\s+(?:sulgu|avane|lukustu|lahe\s+(?:kinni|lahti)|tule\s+lahti)|kiilus)|\bust\s+ei\s+saa\s+(?:lahti|kinni)|\b(?:tostuk|tagaluuk|luuk|laadimisplatvorm|kaldtee)\S*\s+(?:\S+\s+)?(?:ei\s+(?:toota|touse|lange|lahe)|viga|vea|annab\s+vea|rikkis|katki)/, /aken|akna/]];
const etFold = (s) => String(s || '').toLowerCase().replace(/[õäöüšž]/g, (c) => 'oaousz'['õäöüšž'.indexOf(c)]);
const ET_NEG = /\b(?:ei|pole)\s+(?:(?:ole|olnud|on)\s+)?(?:lohke|puhke|tuhi|tuhjak|augu|katki|murdu|purune|kukku|leki|tilgu)\S*/g;
function etKinds(v) { const k = new Set(); for (const p of etFold(v).replace(ET_NEG, ' ').split(/[.,;!?\n]+/)) if (!ET_OK.test(p)) for (const [n, rx, ex] of ET_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); if (k.has('acc')) k.delete('injury'); return k; }

const RL_OK = /\b(?:otremontirov|pochinil|zamenil|ispravil|ispravlen)\S*|\b(?:snova|opyat)\s+rabotaet\b|\brabotaet\s+(?:snova|normalno|opyat)\b|\bvse\s+v\s+poryadke\b|\bbez\s+problem/;
const RL_KINDS = [['brake', /\btormoz\S*\s+(?:\S+\s+)?(?:ne\s+(?:rabota|derzh|tormoz|srabat)|slab|otkaz)|\bne\s+tormozit\b|\b(?:padaet|upalo|upal|propalo)\s+(?:\S+\s+)?davlen|\bdavlen\S*\s+(?:\S+\s+)?(?:pada|upal)|\b(?:travit|spuskaet)\s+(?:\S+\s+)?vozdu/, /ruchn|stoyan|fonar|lamp|stop|asistent|assistent|\bsam\b|bez\s+prichin|shin|koles|podush|ballon/],
  ['fire', /\bpozhar(?:a|e|u|om|y)?\b|\bgorit\s+(?:\S+\s+)?(?:kabin|dvigatel|motor|koleso|shin|provod|pricep)|\b(?:kabin\S*|dvigatel\S*|motor\S*|koleso|shin\S*|provod\S*|pricep\S*)\s+(?:\S+\s+)?(?:gorit|zagorel|vosplamen)|\bzagorel\S*\s+(?:\S+\s+)?(?:kabin|dvigatel|motor|koleso|shin|provod|pricep)|\bdym\S*\s+(?:iz|ot|v)\s+(?:\S+\s+)?(?:kabin|dvigatel|motor|kapot|koles)|\b(?:zapah|pahnet|pakhnet|vonyaet)\s+(?:\S+\s+)?gar/, /vyhlop|vykhlop|glushitel|ognetushit|lamp|kontroln|indikator|chek|check|stseplen|sceplen|marmit|wydech|auspuh|egzoz|esapament|kipufog|vyfuk|izputej|ismetim|duslintuv|summut/],
  ['flat', /\b(?:probil|probyl|probyv)\S*\s+(?:\S+\s+)?(?:koleso|kolesa|shin)|\b(?:koleso|kolesa|shin\S*)\s+(?:\S+\s+)?(?:probit|probito|probita|lopnul|lopnula|vzorval|spustil|spuscheno|spushcheno|sdulos|sdulas)|\b(?:lopnul\S*|vzorval\S*)\s+(?:\S+\s+)?(?:koleso|shin)|\bprokol\b/, /podush|ballon|tent|dvorn/],
  ['steer', /\brul\S*\s+(?:\S+\s+)?(?:zaklin\S*|tugo|tyazhel\S*|ne\s+(?:krutit|povorach|rabota)|lyuft|boltaet)|\b(?:tyanet|uvodit)\s+(?:\S+\s+)?(?:vpravo|vlevo|napravo|nalevo)\b/],
  ['leak', /\b(?:techet|tech|kapaet|podtekaet|vytekaet|bezhit)\s+(?:\S+\s+)?(?:maslo|masla|soliar|solyar|dizel|toplivo|tosol|antifriz|ohlazhd|okhlazhd|adblue|zhidkost)|\b(?:maslo|masla|soliar|solyar|dizel|toplivo|tosol|antifriz|adblue)\S*\s+(?:\S+\s+)?(?:techet|kapaet|podtekaet|vytekaet|bezhit)/],
  ['acc', /\bavari(?:ya|yu|yei|yey|ei|ey|i)\b|\bdtp\b|\bstolknov|\bstolknul|\bvrezal|\b(?:udaril|zadel|pomyal|vehal|vekhal)\S*\s+(?:\S+\s+){0,2}(?:mashin|avto|stolb|stenu|ograd|gruzovik|furu)|\bv\s+menya\s+(?:\S+\s+)?(?:vrezal|vehal|vekhal)/, /avariyk|avariyn|avariin|znak|treugoln|kamen|shcheb|scheb|rezhim|agregat|refrizh/],
  ['injury', /\branen|\btravm|\bpostradal|\bskor(?:aya|uyu)\b|\bbolnits|\bbolnic/],
  ['parkbrake', /\b(?:ruchnik|ruchn\S*\s+tormoz|stoyanoch\S*\s+tormoz)\S*\s+(?:\S+\s+)?(?:ne\s+(?:derzh|rabota|otpuska)|zaklin)|\b(?:pokatil|uehal|uekhal|poehal|poekhal)\S*\s+(?:\S+\s+)?sam/],
  ['nostart', /\bne\s+(?:zavod|zapusk)\S*|\bstarter\S*\s+(?:\S+\s+)?ne\s+(?:krutit|rabota)/, /agregat|refrizh|holodil|kholodil|konditsion|kondicion|pech|otopit|webasto|vebasto|avtonomk|fonar|lamp/],
  ['mirror', /\b(?:d?zerkal)\S*\s+(?:\S+\s+)?(?:razbit|razbil|slomal|slomano|otorval|otorvano|visit|tresn)|\b(?:razbil|slomal|otorval)\S*\s+(?:\S+\s+)?d?zerkal/],
  ['lights', /\b(?:far[aiy]|fonar\S*|svet\b|lampochk\S*|lamp[aiy]|povorotnik\S*|povorot\S*|gabarit\S*|stop\S*)\s+(?:\S+\s+)?(?:ne\s+(?:gorit|goryat|svetit|svetyat|rabota)|peregorel\S*|razbit\S*)|\bperegorel\S*\s+(?:\S+\s+)?(?:lampochk|lamp|far|fonar)/, /kontroln|panel|ekran|chek|check|pribor|indikator/],
  ['warnlight', /\b(?:gorit|zagorel\S*|migaet|morgaet)\s+(?:\S+\s+){0,2}(?:lampochk|lamp|indikator|chek|check|oshibk|kontroln|znachok)|\b(?:lampochk|indikator|chek|check|kontroln\S*\s+lamp)\S*\s+(?:\S+\s+){0,2}(?:gorit|zagorel|migaet)/, /\bne\b|peregorel/],
  ['glass', /\b(?:lobov\S*\s+)?stekl\S*\s+(?:\S+\s+){0,2}(?:tresn|treschin|razbit|lopnul|raskol)|\btreschin\S*\s+(?:\S+\s+)?(?:na\s+)?(?:lobov|stekl)/, /zerkal|kamen|shcheb|scheb|dver|bokov|potel|zapot|poteet|okn/],
  ['window', /\b(?:okn\S*|bokov\S*\s+stekl\S*|stekl\S*)\s+(?:\S+\s+)?ne\s+(?:opuska|podnima|otkryva|zakryva)|\bsteklopod\S*\s+(?:\S+\s+)?(?:ne\s+rabota|slomal)/, /dvorn/],
  ['batt', /\b(?:akkumulyator|akkum|akb|batare)\S*\s+(?:\S+\s+)?(?:sel\b|razryazh|razryadil|ne\s+(?:zaryazh|derzh)|sdoh)|\b(?:sel|razryadil\S*)\s+(?:\S+\s+)?(?:akkumulyator|akkum|akb|batare)/, /lamp|telefon/],
  ['tacho', /\b(?:tahograf|takhograf|tachograf)\S*\s+(?:\S+\s+)?(?:ne\s+(?:rabota|chita|prinima|vidit)|oshibk|slomal|glyuch)|\bkart\S*\s+(?:\S+\s+)?(?:voditelya\s+)?(?:zastryal\S*|ne\s+(?:chita|vyhodit|vykhodit|rabota))|\b(?:poteryal|ukrali)\s+(?:\S+\s+)?(?:voditel\S*\s+)?kart/, /toplivn|zapravoch|bank|kredit|oplat/],
  ['coupling', /\b(?:pricep|polupricep)\S*\s+(?:\S+\s+)?(?:otsoedin|otcepil|otstegnul|ne\s+(?:stsepl|scepl|tsepl|otsepl))|\b(?:sedl\S*|stsepk\S*|scepk\S*)\s+(?:\S+\s+)?(?:ne\s+(?:zakryva|rabota|zaschelkiva|zashchelkiva)|zaklin|slomal)/],
  ['dryfuel', /\b(?:konchil|zakonchil|konchaet)\S*\s+(?:\S+\s+)?(?:toplivo|soliar|solyar|dizel|benzin)|\b(?:toplivo|soliar|solyar|dizel)\S*\s+(?:\S+\s+)?(?:konchil|zakonchil)|\bnet\s+(?:bolshe\s+)?(?:topliva|soliary|solyary|dizelya)\b|\bobsoh|\bobsokh/, /agregat|refrizh|adblue|kart/],
  ['engine', /\b(?:dvigatel|motor)\S*\s+(?:\S+\s+)?(?:peregrev|greetsya|kipit|ne\s+tyanet|glohnet|zagloh|troit|poteryal\s+moshch|poteryal\s+mosch)|\bavariyn\S*\s+rezhim|\bne\s+tyanet\b|\bnet\s+tyagi\b/, /agregat|refrizh|tormoz|podshipn/],
  ['tyre', /\b(?:shin\S*|rezin\S*)\s+(?:\S+\s+){0,2}(?:povrezhd|porez|iznos|lysa|lysaya|gryzh|travit|malo\s+vozduh)|\bgryzh\S*\s+(?:\S+\s+)?(?:na\s+)?(?:shin|koles|rezin)/, /probit|lopnul|vzorval|spustil|sdul|podush|tent|dvorn/],
  ['reefer', /\b(?:refrizherator|refrizh|kholodil\S*\s+agregat|holodil\S*\s+agregat|agregat)\S*\s+(?:\S+\s+)?(?:ne\s+(?:morozit|holodit|kholodit|rabota|ohlazhd|okhlazhd)|oshibk|alarm|avari|slomal|otklyuch)/, /kabin/],
  ['susp', /\b(?:pnevmopodush|podushk|pnevmoballon|ballon)\S*\s+(?:\S+\s+)?(?:lopnul|porval|travit|spuskaet|spustil|probit)|\bpodvesk\S*\s+(?:\S+\s+)?(?:ne\s+rabota|slomal|oshibk)|\b(?:pricep|polupricep|tyagach)\S*\s+(?:\S+\s+)?(?:perekosil|perekoshen|krenit|zavalil)/, /bezopasn|rul|siden/],
  ['gear', /\bne\s+(?:vklyucha|vhodit|vkhodit)\S*\s+(?:\S+\s+)?peredach|\bperedach\S*\s+(?:\S+\s+)?ne\s+(?:vklyucha|vhod|vkhod|vtyka)|\b(?:korobk|kpp)\S*\s+(?:\S+\s+)?(?:oshibk|slomal|ne\s+rabota|zaklin)|\b(?:stseplen|sceplen)\S*\s+(?:\S+\s+)?(?:probuks|buksu|ne\s+rabota|sgorel)/],
  ['climate', /\b(?:konditsioner|kondicioner|kondey|klimat|pech\S*|otopitel|otoplen|webasto|vebasto|avtonomk)\S*\s+(?:\S+\s+)?(?:ne\s+(?:rabota|greet|holodit|kholodit|duet|vklyucha|zavod)|slomal)/, /siden|zerkal/],
  ['tarp', /\btent\S*\s+(?:\S+\s+)?(?:porval|razorval|dyrk|dyra|porvan|razorvan)|\b(?:dyra|dyrka)\s+(?:\S+\s+)?(?:v|na)\s+tent/],
  ['exhaust', /\b(?:glushitel|vyhlopn|vykhlopn|vyhlop\S*\s+trub|vykhlop\S*\s+trub)\S*\s+(?:\S+\s+)?(?:otvalil|otorval|visit|upal|progorel|dyrk|dyra|tresn)/],
  ['visib', /\b(?:dvornik|stekloochist)\S*\s+(?:\S+\s+)?(?:ne\s+(?:rabota|chist)|slomal)|\b(?:stekl|lobov|okn)\S*\s+(?:\S+\s+){0,2}(?:potee|zapot|poteet)/],
  ['seat', /\bremen\S*\s+bezopasnost\S*\s+(?:\S+\s+)?(?:ne\s+(?:zastegiva|vytyagiva|derzh|rabota)|zaklin|porval)|\bremen\S*\s+(?:\S+\s+)?ne\s+(?:zastegiva|vytyagiva)|\b(?:siden|kresl)\S*\s+(?:\S+\s+)?(?:slomal|ne\s+(?:reguliru|rabota|dvigaetsya)|shatae|boltae)/, /podogrev/],
  ['wheel', /\b(?:gaik|bolt|shpilk)\S*\s+(?:\S+\s+){0,2}(?:otkrutil|oslab|razboltal|poteryal|vypal|otorval)|\bdisk\S*\s+(?:\S+\s+)?(?:tresn|treschin|lopnul|pognul|pognut)|\b(?:podshipnik|stupits)\S*\s+(?:\S+\s+)?(?:greetsya|gudit|nagrel|stuchit|lyuft)/, /tormoz/],
  ['stuck', /\b(?:zastryal|zastrial|zakopal|zavyaz)\S*\s+(?:\S+\s+){0,2}(?:gryaz|grjaz|snegu|sneg|peske|pesok|bolot)/],
  ['lost', /\bpoteryal\S*\s+(?:\S+\s+)?(?:klyuch|kluch|tehpasport|tekhpasport|svidetelstvo|dokument)|\bklyuch\S*\s+(?:\S+\s+)?(?:poteryal|propal|ne\s+mogu\s+nayti)|\bne\s+mogu\s+nayti\s+(?:\S+\s+)?klyuch/],
  ['numplate', /\b(?:nomer|nomernoy\s+znak|nomernoi\s+znak|gosnomer)\S*\s+(?:\S+\s+)?(?:otvalil|upal|poteryal|ukrali|slomal|otorval|ne\s+chitaetsya)/, /podsvet|fonar|lamp|telefon/],
  ['adas', /\b(?:asistent|assistent|radar|datchik|sensor|kamer|kruiz)\S*\s+(?:\S+\s+){0,3}(?:ne\s+rabota|oshibk|otklyuch|slomal)|\btormozit\s+(?:\S+\s+)?(?:sam|bez\s+prichin)/],
  ['door', /\bdver\S*\s+(?:\S+\s+)?(?:ne\s+(?:zakryva|otkryva|zapira|otpira)|zaklin|zaelo)|\b(?:gidrobort|bort|lift|podyemnik|podemnik)\S*\s+(?:\S+\s+)?(?:ne\s+(?:rabota|podnima|opuska)|oshibk|slomal)/, /okn|stekl/]];
const rlFold = (s) => String(s || '').toLowerCase().replace(/['ʼ’`]/g, '').replace(/[ß-ɏ]/g, 'q');
const RL_NEG = /\b(?:ne|net)\s+(?:(?:bylo|byl|byla|byli)\s+)?(?:probit|probito|probita|lopnul|vzorval|spustil|spusch|spushch|sdul|razbit|razbil|slomal|slomano|otorval|otorvan|tresn|techet|kapaet|podteka)\S*/g;
const RL_FILL = /\bu\s+(?:menya|menia|nas|nego|nee|neyo)\b/g;
function rlKinds(v) { const k = new Set(); for (const p of rlFold(v).replace(RL_FILL, ' ').replace(RL_NEG, ' ').split(/[.,;!?\n]+/)) if (!RL_OK.test(p)) for (const [n, rx, ex] of RL_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); if (k.has('acc')) k.delete('injury'); return k; }

const UL_OK = /\b(?:vidremont|polahodil|zaminil|vipravil|vipravlen)\S*|\b(?:znovu|znov|vzhe)\s+pratsiu|\bpratsiu\S*\s+(?:znovu|normalno)\b|\bvse\s+(?:v\s+)?(?:poriadku|normalno|dobre|harazd)\b|\bbez\s+problem/;
const UL_KINDS = [['brake', /\bhalm\S*\s+(?:\S+\s+)?(?:ne\s+(?:pratsiu|trima|halmu|spratsiov)|slabk|vidmov)|\bne\s+halmu|\b(?:padaie|padae|vpav|vpalo|znizh)\S*\s+(?:\S+\s+)?tisk|\btisk\S*\s+(?:\S+\s+)?(?:pada|vpav|znizh)|\b(?:travit|spuskaie|spuskae)\s+(?:\S+\s+)?povitr/, /ruchn|stoian|lihtar|lamp|stop|as+istent|\bsam\b|bez\s+prichin|shin|koles|hum[aiu]|podush|balon/],
  ['fire', /\bpozhezh|\bhorit\s+(?:\S+\s+)?(?:kabin|dvihun|motor|koleso|shin|provod|prichip)|\b(?:kabin\S*|dvihun\S*|motor\S*|koleso|shin\S*|provod\S*|prichip\S*)\s+(?:\S+\s+)?(?:horit|zahoril|zainial|zaimal)|\b(?:zahoril|zainial|zaimal)\S*\s+(?:\S+\s+)?(?:kabin|dvihun|motor|koleso|shin|provod|prichip)|\bdim\S*\s+(?:z|iz|zi|vid|v)\s+(?:\S+\s+)?(?:kabin|dvihun|motor|kapot|koles)|\b(?:zapah|pahne|smerdit)\s+(?:\S+\s+)?(?:horil|har)/, /\bne\s+hori|vihlop|hlushnik|vohnehas|lamp|kontroln|indikator|chek|check|zcheplen|marmit|videh|auspuh|ehzoz|esapament|kipufoh|vifuk|izputei|ismetim|duslintuv|summut/],
  ['flat', /\b(?:probiv|probili|probito|probila)\S*\s+(?:\S+\s+)?(?:koleso|kolesa|shin)|\b(?:koleso|kolesa|shin\S*)\s+(?:\S+\s+)?(?:probit\S*|lopnul\S*|lusnul\S*|vibuhl\S*|spustil\S*|zdul\S*)|\b(?:lopnul|lusnul|vibuhl)\S*\s+(?:\S+\s+)?(?:koleso|shin)|\bprokol\b/, /podush|balon|tent|dvirn/],
  ['steer', /\bkerm\S*\s+(?:\S+\s+)?(?:zaklin\S*|tuho|tuhe|vazhk\S*|ne\s+(?:krutit|povertaiet|pratsiu)|liuft|telipa|bovta)|\b(?:tiahne|tiane|vede)\s+(?:\S+\s+)?(?:vpravo|vlivo|napravo|nalivo)\b/],
  ['leak', /\b(?:teche|kapaie|kapae|pidtikaie|pidtikae|vitikaie|vitikae)\s+(?:\S+\s+)?(?:oliv|masl|soliar|dizel|paln|paliv|antifriz|tosol|oholodzh|adblue|ridin)|\b(?:oliv|masl|soliar|dizel|paliv|paln|antifriz|tosol|adblue)\S*\s+(?:\S+\s+)?(?:teche|kapaie|kapae|pidtikaie|pidtikae|vitikaie|vitikae)/],
  ['acc', /\bavari(?:iu|ia|ii)\b|\bdtp\b|\bzitkn|\bvrizav|\b(?:vdariv|vdarila|zachepiv|zachepila|vrizav|vi+hav)\S*\s+(?:\S+\s+){0,2}(?:mashin|avto|stovp|stinu|ohorozh|parkan|vantazhivk|furu)|\bv\s+mene\s+(?:\S+\s+)?(?:vrizav|vi+hav)/, /avariik|avariin|znak|trikutn|kamin|shcheb|rezhim|ahrehat|refri[zh]/],
  ['injury', /\bporanen|\btravm|\bpostrazhda|\bshvidk\S*\s+dopomoh|\bviklik\S*\s+(?:\S+\s+)?shvidk|\blikarn/],
  ['parkbrake', /\b(?:ruchnik|ruchn\S*\s+halm\S*|stoianochn\S*\s+halm\S*)\s+(?:\S+\s+)?(?:ne\s+(?:trima|pratsiu|vidpuska)|zaklin)|\b(?:pokotil|pokotiv|poi+ha)\S*\s+(?:\S+\s+)?sam/],
  ['nostart', /\bne\s+(?:zavod|zapuska)\S*|\bstarter\S*\s+(?:\S+\s+)?ne\s+(?:krutit|pratsiu)/, /ahrehat|refri[zh]|holodil|konditsion|pichk|opal|vebasto|avtonomk|far[ai]\b|lamp/],
  ['mirror', /\bdzerkal\S*\s+(?:\S+\s+)?(?:rozbit|rozbil|rozbiv|zlaman|zlamal|zlamav|vidirv|visit|trisn)|\b(?:rozbiv|rozbil|zlamav|zlamal|vidirv)\S*\s+(?:\S+\s+)?dzerkal/],
  ['lights', /\b(?:far[ai]|lihtar\S*|svitlo|lampochk\S*|lamp[ai]|povorotnik\S*|habarit\S*|stop\S*)\s+(?:\S+\s+)?(?:ne\s+(?:horit|horiat|svitit|svitiat|pratsiu)|perehoril\S*|rozbit\S*)|\bperehoril\S*\s+(?:\S+\s+)?(?:lampochk|lamp|far|lihtar)/, /kontroln|panel|ekran|chek|check|prilad|indikator/],
  ['warnlight', /\b(?:horit|zahoril\S*|zasvitil\S*|blimaie|blimae|mihaie|mihae)\s+(?:\S+\s+){0,2}(?:lampochk|lamp|indikator|chek|check|pomilk|kontroln|znachok)|\b(?:lampochk|indikator|chek|check|kontroln\S*\s+lamp)\S*\s+(?:\S+\s+){0,2}(?:horit|zahoril|zasvitil|blima)/, /\bne\b|perehoril/],
  ['glass', /\b(?:lobov\S*\s+)?skl[oa]\S*\s+(?:\S+\s+){0,2}(?:trisn|trishchin|rozbit|lusnul|lopnul)|\btrishchin\S*\s+(?:\S+\s+)?(?:na\s+)?(?:lobov|skl)/, /dzerkal|kamin|shcheb|dver|bokov|zapotiv|pitni|vikn|sklopid/],
  ['window', /\b(?:vikn\S*|bokov\S*\s+skl\S*)\s+(?:\S+\s+)?ne\s+(?:opuska|pidiima|pidnima|vidkriva|zakriva)|\bsklopid\S*\s+(?:\S+\s+)?(?:ne\s+pratsiu|zlamav|zlamal)/, /dvirn/],
  ['batt', /\b(?:akumuliator|akumul|akb|batare)\S*\s+(?:\S+\s+)?(?:siv\b|sil\b|rozriadiv|rozriadzh|ne\s+(?:zariadzh|trima)|zdoh)|\b(?:siv|sil|rozriadiv\S*)\s+(?:\S+\s+)?(?:akumul|akb|batare)/, /lamp|telefon/],
  ['tacho', /\b(?:tahohraf|tachohraf)\S*\s+(?:\S+\s+)?(?:ne\s+(?:pratsiu|chita|priima|bachit)|pomilk|zlamav|zlamal|hliuch)|\bkartk\S*\s+(?:\S+\s+)?(?:vodiia\s+)?(?:zastriahl\S*|ne\s+(?:chita|vihodit|pratsiu))|\b(?:zahubiv|zahubila|vtrativ|vkrali)\s+(?:\S+\s+)?(?:vodiis\S*\s+)?kartk/, /palivn|zapravn|bank|kredit|oplat/],
  ['coupling', /\b(?:prichip|napivprichip)\S*\s+(?:\S+\s+)?(?:vidchepiv|vidchepil|vidstibnuv|ne\s+(?:zchepl|chipl|vidchepl))|\b(?:sidl\S*|zchipk\S*)\s+(?:\S+\s+)?(?:ne\s+(?:zakriva|pratsiu|zaskakuie)|zaklin|zlamal)/],
  ['dryfuel', /\b(?:zakinchil|skinchil)\S*\s+(?:\S+\s+)?(?:paln|paliv|soliar|dizel|benzin)|\b(?:paln\S*|paliv\S*|soliar\S*|dizel\S*)\s+(?:\S+\s+)?(?:zakinchil|skinchil)|\bnemai?e\s+(?:bilshe\s+)?(?:palnoho|paliva|soliarki|dizelia)\b/, /ahrehat|refri[zh]|adblue|kartk/],
  ['engine', /\b(?:dvihun|motor)\S*\s+(?:\S+\s+)?(?:perehriva|kipit|ne\s+tiahne|hlohne|zahloh|troit|vtrativ\s+potuzh)|\bavariin\S*\s+rezhim|\bne\s+tiahne\b|\bnemai?e\s+tiahi\b/, /ahrehat|refri[zh]|halm|pidship/],
  ['tyre', /\b(?:shin\S*|hum[aiu])\s+(?:\S+\s+){0,2}(?:poshkodzh|poriz|znosh|lis[ai]\b|hrizh|travit|malo\s+povitr)|\bhrizh\S*\s+(?:\S+\s+)?(?:na\s+)?(?:shin|koles|hum)/, /probit|lopnul|lusnul|vibuh|spustil|zdul|podush|tent|dvirn/],
  ['reefer', /\b(?:refri[zh]\S*|holodil\S*\s+ahrehat|ahrehat)\S*\s+(?:\S+\s+)?(?:ne\s+(?:morozit|holodit|pratsiu|oholodzh)|pomilk|alarm|avari|zlamav|zlamal|vidkliuch|vimknuv)/, /kabin/],
  ['susp', /\b(?:pnevmopodushk|podushk|pnevmobalon|balon)\S*\s+(?:\S+\s+)?(?:lopnul|lusnul|porval|travit|spuskaie|spustil|probit)|\bpidvisk\S*\s+(?:\S+\s+)?(?:ne\s+pratsiu|zlamal|pomilk)|\b(?:prichip|napivprichip|tiahach)\S*\s+(?:\S+\s+)?(?:perekosil|perekoshen|hiliaie|zavalil)/, /bezpek|kerm|sidin/],
  ['gear', /\bne\s+(?:vmika|vkliucha|vhodit)\S*\s+(?:\S+\s+)?peredach|\bperedach\S*\s+(?:\S+\s+)?ne\s+(?:vmika|vkliucha|vhod)|\b(?:korobk|kpp)\S*\s+(?:\S+\s+)?(?:pomilk|zlamal|ne\s+pratsiu|zaklin)|\bzcheplen\S*\s+(?:\S+\s+)?(?:probuks|buksu|ne\s+pratsiu|zhoril)/],
  ['climate', /\b(?:konditsioner|kondei|klimat|pichk\S*|opaliuvach|opalennia|vebasto|avtonomk)\S*\s+(?:\S+\s+)?(?:ne\s+(?:pratsiu|hri|holodit|due|vmika|zavod)|zlamal|zlamav)/, /sidin|dzerkal/],
  ['tarp', /\btent\S*\s+(?:\S+\s+)?(?:porval|rozirval|dirk|dira|porvan|rozirvan)|\b(?:dira|dirka)\s+(?:\S+\s+)?(?:v|u|na)\s+tent/],
  ['exhaust', /\b(?:hlushnik|vihlopn\S*\s+trub)\S*\s+(?:\S+\s+)?(?:vidvaliv|vidvalil|vidirv|visit|vpav|prohoriv|dirk|dira|trisn)/],
  ['visib', /\b(?:dvirnik|sklooch)\S*\s+(?:\S+\s+)?(?:ne\s+(?:pratsiu|chist)|zlamal)|\b(?:skl|lobov|vikn)\S*\s+(?:\S+\s+){0,2}(?:pitni|zapotiv)/],
  ['seat', /\bremin\S*\s+bezpek\S*\s+(?:\S+\s+)?(?:ne\s+(?:zastiba|vitiaha|trima|pratsiu)|zaklin|porval)|\bremin\S*\s+(?:\S+\s+)?ne\s+(?:zastiba|vitiaha)|\b(?:sidinn|krisl)\S*\s+(?:\S+\s+)?(?:zlamal|ne\s+(?:rehulu|pratsiu|ruha)|hitaie|telipa)/, /pidihriv/],
  ['wheel', /\b(?:haik|bolt|shpilk)\S*\s+(?:\S+\s+){0,2}(?:vidkrutil|oslab|rozboltal|zahubil|vipal|vidirval)|\bdisk\S*\s+(?:\S+\s+)?(?:trisn|trishchin|lusnuv|pohnuv|pohnut|zihnut)|\b(?:pidshipnik|stupits|matochin)\S*\s+(?:\S+\s+)?(?:hriiet|hude|nahriv|stukaie|liuft)/, /halm/],
  ['stuck', /\b(?:zastriah|zastriav|zakopav|zaviaz)\S*\s+(?:\S+\s+){0,2}(?:hriaz|bahniu|bahnuk|snihu|snih|pisku|pisok|boloti)/],
  ['lost', /\b(?:zahubiv|zahubil|vtrativ)\S*\s+(?:\S+\s+)?(?:kliuch|tehpasport|svidotstv|dokument)|\bkliuch\S*\s+(?:\S+\s+)?(?:zahubil|propal|ne\s+mozhu\s+znaiti)|\bne\s+mozhu\s+znaiti\s+(?:\S+\s+)?kliuch/],
  ['numplate', /\b(?:nomer|nomern\S*\s+znak)\S*\s+(?:\S+\s+)?(?:vidvaliv|vidvalil|vpav|zahubiv|vkrali|zlamal|vidirv|ne\s+chita)/, /pidsvit|lihtar|lamp|telefon/],
  ['adas', /\b(?:as+istent|radar|datchik|sensor|kamer|kruiz)\S*\s+(?:\S+\s+){0,3}(?:ne\s+pratsiu|pomilk|vidkliuch|vimkn|zlamal)|\bhalmu\S*\s+(?:\S+\s+)?(?:sam|bez\s+prichini)/],
  ['door', /\bdver\S*\s+(?:\S+\s+)?(?:ne\s+(?:zakriva|vidkriva|zamika|vidmika)|zaklin|zai+lo)|\b(?:hidrobort|bort|lift|pidiomnik)\S*\s+(?:\S+\s+)?(?:ne\s+(?:pratsiu|pidnima|pidiima|opuska)|pomilk|zlamal)/, /vikn|skl/]];
const ulFold = (s) => String(s || '').toLowerCase().replace(/['ʼ’`]/g, '').replace(/kh/g, 'h').replace(/c(?!h)/g, 'ts').replace(/[yj]/g, 'i').replace(/g/g, 'h').replace(/w/g, 'v').replace(/[ß-ɏ]/g, 'q');
const UL_NEG = /\bne\s+(?:(?:bulo|buv|bula|buli)\s+)?(?:probit|lopnul|lusnul|vibuhl|spustil|zdul|rozbit|zlaman|vidirv|trisn|teche|kapaie|kapae|pidtik)\S*/g;
const UL_FILL = /\bu\s+(?:mene|nas|noho|nei|neyi)\b/g;
function ulKinds(v) { const k = new Set(); for (const p of ulFold(v).replace(UL_FILL, ' ').replace(UL_NEG, ' ').split(/[.,;!?\n]+/)) if (!UL_OK.test(p)) for (const [n, rx, ex] of UL_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); if (k.has('acc')) k.delete('injury'); return k; }



const SR_TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ђ: 'đ', е: 'e', ж: 'ž', з: 'z', и: 'i', ј: 'j', к: 'k', л: 'l', љ: 'lj', м: 'm', н: 'n', њ: 'nj', о: 'o', п: 'p', р: 'r', с: 's', т: 't', ћ: 'ć', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'č', џ: 'dž', ш: 'š', ѓ: 'đ', ќ: 'ć', ѕ: 'dz', ѐ: 'e', ѝ: 'i', è: 'e' };
const SR_NOT = /[ыэщъьяюёйіїєґ]/;
const MK_OK = /\bpopraven|\bpopravi(?:ja|vme|v)\b|\bzamen(?:et|ija|ivme|iv)\b|\bsmen(?:et|ija|ivme|iv)\b|\b(?:pak|povtorno|veke)\s+raboti\b|\braboti\s+(?:normalno|pak|povtorno)\b|\bse\s+e\s+(?:vo\s+red|ok)\b|\bnema\s+problem/;
const MK_KINDS = [['brake', /\b(?:sopirac|kocnic)\S*\s+(?:\S+\s+){0,2}(?:ne\s+(?:rabot|fak|koc)|slab|otkaz|popust)|\bne\s+sopira\b|\b(?:pagja|paga|pada|gubi)\s+(?:\S+\s+)?(?:pritisok|vozduh|vozduhot)\b/, /racn|parkir|svetl|stop|asistent|samo\s+od\s+sebe|bez\s+pricina/],
  ['fire', /\bcad\S*\s+(?:\S+\s+)?(?:od|izleguva|izlegu|ima\s+vo)\b|\bse\s+zapali\b|\bpozar|\b(?:gori|gorat)\s+(?:kabinata|kamionot|motorot|prikolkata|gumata)/, /auspuh|izduv|aparat|lampick|sijalick|svetl/],
  ['flat', /\bgum\S*\s+(?:\S+\s+)?(?:(?:mi\s+|se\s+)?pukna|puknat|izdupc|duplna|izduvan|prazn)|\bpukna\S*\s+(?:\S+\s+){0,2}gum/],

  ['flat', /\bgum\S*\s+(?:(?!ne\s|nema\s)\S+\s+)?(?:(?:e|se|mi)\s+)?(?:rasip\S*|skrs\S*)|\b(?:se\s+)?(?:rasipa|skrsi)\s+(?:mi\s+)?gum\S*/, /rezerv|brisac|metlic/],
  ['tyre', /\bgum\S*\s+(?:(?!ne\s|nema\s)\S+\s+)?(?:(?:e|se)\s+)?ostet\S*/, /rezerv|brisac|metlic/],
  ['steer', /\bvolan\S*\s+(?:\S+\s+)?(?:(?:e|se)\s+)?(?:zaglav|blokir|tezok|tesko|ne\s+se\s+vrti)/],
  ['leak', /\b(?:maslo|gorivo|nafta|dizel|tecnost|antifriz|adblue)\S*\s+(?:\S+\s+)?(?:tece|kapi|curi|isteka)|\b(?:tece|kapi|isteka|curi)\s+(?:\S+\s+)?(?:maslo|goriv|naft|dizel|tecnost|antifriz|adblue)/],
  ['acc', /\bsoobracajna\s+nesrec|\bnesrekj|\bsudir|\b(?:udriv|udrija|izgrebav|zakaciv|me\s+udri|me\s+udrija)\b/, /kamen/],
  ['injury', /\b(?:ranet|raneta)\b|\b(?:itna|brza)\s+pomos/],
  ['parkbrake', /\bracn\S*\s+(?:sopirac\S*\s+)?(?:\S+\s+)?ne\s+(?:drzi|fak|raboti)|\b(?:kamionot|sleperot|prikolkata|voziloto)\s+(?:se\s+)?(?:trgna|tragna|se\s+istrkala|se\s+trkala)\s+sam/],
  ['nostart', /\b(?:motor|kamion|sleper)\S*\s+(?:\S+\s+)?ne\s+(?:se\s+)?(?:pali|startuva|tera)\b/],
  ['mirror', /\b(?:retrovizor|ogledal)\S*\s+(?:\S+\s+)?(?:e\s+)?(?:skrsen|kursen|otpadna|pukna|puknat|visi)/],
  ['warnlight', /\b(?:sveti|gori|se\s+zapali)\s+(?:\S+\s+)?(?:lampick|kontroln)|\blampick\S*\s+(?:\S+\s+)?(?:sveti|gori|trepka)/],
  ['glass', /\b(?:vetrobran|staklo|sofersajbn)\S*\s+(?:\S+\s+)?(?:e\s+)?(?:puknat|pukna|skrsen|ostet)/, /retrovizor|ogledal|kamen/],
  ['window', /\b(?:prozor|staklo)\S*\s+(?:\S+\s+)?ne\s+se\s+(?:spusta|krena|kreva|otvora|zatvora)/],
  ['batt', /\bakumulator\S*\s+(?:\S+\s+)?(?:e\s+)?(?:prazen|ispraznet|slab|ne\s+polni)/],
  ['tacho', /\btahograf\S*\s+(?:\S+\s+)?ne\s+(?:ja\s+)?(?:cita|raboti)|\bkartick\S*\s+(?:\S+\s+)?(?:ne\s+(?:se\s+)?(?:cita|raboti)|izgubena|ukradena|ostetena)|\bizgubiv\s+(?:ja\s+)?(?:\S+\s+)?kartick/],
  ['coupling', /\b(?:prikolk|poluprikolk)\S*\s+(?:\S+\s+)?ne\s+se\s+(?:zakacuva|kaci|otkacuva)|\bsedl\S*\s+(?:\S+\s+)?ne\s+(?:se\s+)?(?:zatvora|zaklucuva)/],
  ['dryfuel', /\b(?:ostanav|ostanavme|ostana)\s+bez\s+(?:gorivo|nafta|dizel)|\bme\s+snema\s+(?:gorivo|nafta|dizel)/, /agregat|ladiln|frigo/],
  ['engine', /\bmotor\S*\s+(?:\S+\s+)?(?:se\s+)?(?:pregreva|vrie|nema\s+sila|gubi\s+sila|gasne|zgasna|trza)/],
  ['reefer', /\b(?:ladilnik|ladilna|agregat|frigo)\S*\s+(?:\S+\s+)?ne\s+(?:ladi|raboti|pali)/],
  ['gear', /\bmenuvac\S*\s+(?:\S+\s+)?(?:ne\s+(?:vleguva|raboti|menuva)|greska|kvar)|\bbrzin\S*\s+(?:\S+\s+)?ne\s+(?:vleguva|vlegu)|\bkvacil\S*\s+(?:\S+\s+)?(?:lizga|ne\s+raboti|izgore)/],
  ['climate', /\b(?:klima|greenje|parno|webasto|vebasto)\S*\s+(?:\S+\s+)?ne\s+(?:raboti|gree|ladi)/, /sedist/],
  ['visib', /\bbrisac\S*\s+(?:\S+\s+)?ne\s+(?:rabot|brisat)/],
  ['seat', /\bpojas\S*\s+(?:\S+\s+)?ne\s+(?:se\s+)?(?:zakopcuva|vraka|drzi)|\bsedist\S*\s+(?:\S+\s+)?(?:e\s+)?(?:skrsen|ne\s+(?:se\s+)?(?:podesuva|raboti))/, /greenj|gree/],
  ['exhaust', /\bauspuh\S*\s+(?:\S+\s+)?(?:otpadna|pukna|puknat|visi|dupka)/],
  ['door', /\bvrat\S*\s+(?:\S+\s+)?ne\s+se\s+(?:zatvora|otvora|zaklucuva)|\b(?:lift|rampa|hidraulik)\S*\s+(?:\S+\s+)?ne\s+(?:raboti|se\s+krena|se\s+kreva)/],
  ['lost', /\bizgubi\S*\s+(?:gi\s+|go\s+|ja\s+)?(?:\S+\s+)?(?:kluc|soobracajn)/]];
const srLat = (s) => String(s || '').toLowerCase().replace(/[а-шђјљњћџѓќѕѐѝè]/g, (c) => SR_TR[c] || c);

const SR_PERSON = /\b(?:vozac\S*|suvozac\S*|sovozac\S*|covek|covjek|covekot|osoba|lice|pesak|pesakot|biciklist\S*|kolega|kolegata|sam|sum|smo|sme|ja|jas)\b|\b(?:hitn|itn|brz)\S*\s+pomo|\bambulant/;
function srKinds(v) { const k = new Set(); for (const raw of String(v || '').toLowerCase().split(/[.,;!?\n]+/)) { if (SR_NOT.test(raw)) continue; const p = srLat(raw); const f = hrFold(p); if (/[а-шђјљњћџѓќѕ]/.test(raw)) for (const n of hrKinds(p)) if (n !== 'injury' || SR_PERSON.test(f)) k.add(n); if (!MK_OK.test(f)) for (const [n, rx, ex] of MK_KINDS) if (rx.test(f) && !(ex && ex.test(f))) k.add(n); } if (k.has('acc')) k.delete('injury'); return k; }




const SL_OK = /popravlj|zamenjan|zamenjal|spet\s+dela|zopet\s+dela|ponovno\s+dela|dela\s+normalno|ni\s+(?:vec\s+)?problem|vse\s+(?:je\s+)?(?:ok|v\s+redu)/;
const SL_KINDS = [['brake', /\bzavor\S*\s+(?:\S+\s+)?(?:ne\s+(?:delaj|dela|prime|zavira)|slab|odpoved|popusca)|\b(?:slabo|ne)\s+zavira|\b(?:pada|izgublja|zmanjkuje)\s+(?:\S+\s+)?(?:tlak|zrak)\b/, /rocn|parkirn|luc|stop|asistent|sam\s+od\s+sebe|brez\s+razloga|gum|pnevmatik|blazin|\bmeh\b/],
  ['fire', /\bpozar|\b(?:gori|zagorel[aoi]?|vzgal[aoi]?\s+se|se\s+je\s+vzgal[aoi]?)\b|\bkadi\s+(?:\S+\s+)?iz\b|\biz\s+(?:\S+\s+)?se\s+kadi|\bdim\S*\s+(?:\S+\s+)?(?:iz|izpod|se\s+vali|uhaja)\b|\b(?:smrdi|vonj\S*|disi)\s+(?:\S+\s+)?(?:po\s+)?(?:zazgan|zgoren|smojen)/, /izpuh|auspuh|gasiln|aparat|luck|lampic|sijalic|kontrolk|zarnic|pregorel/],
  ['flat', /\b(?:gum\S*|pnevmatik\S*)\s+(?:\S+\s+){0,2}(?:pocil|pocen|predrt|eksplodiral|prazn|spusc)|\bpocil\S*\s+(?:\S+\s+){0,2}(?:gum|pnevmatik)/],
  ['steer', /\bvolan\S*\s+(?:\S+\s+)?(?:je\s+)?(?:blokiran|zaklenjen|tezak|tezko|trd\b|ima\s+zracnost|ne\s+(?:obraca|dela))|\bvlece\s+(?:\S+\s+)?(?:v\s+)?(?:desno|levo)/],
  ['leak', /\b(?:olj|goriv|naft|dizl|dizel|tekocin|antifriz|adblue)\S*\s+(?:\S+\s+)?(?:tece|kaplja|pusca|curlja|uhaja)|\b(?:tece|kaplja|pusca|curlja|izgublja)\s+(?:\S+\s+)?(?:olj|goriv|naft|dizl|dizel|tekocin|antifriz|adblue)/],
  ['acc', /\bnesrec|\btrcenj|\b(?:trcil|trcila|zadel|zadela|oplazil|oplazila|opraskal|opraskala|zaletel|zaletela|naletel)\b/, /kamen|kamenc/],

  ['acc', /\bprevrn(?:il|ila|ilo|ili|jen|jena|jeno|jeni)\b|\b(?:zapeljal|zaneslo|zdrsnil|zletel)\S*\s+(?:\S+\s+){0,2}?(?:s|z)\s+(?:ceste|vozisca)|\b(?:zapeljal|zdrsnil|zletel|pristal)\S*\s+(?:\S+\s+){0,2}?v\s+jarek|\b(?:je|sem|smo|stoji|obtical)\s+(?:\S+\s+)?v\s+jarku\b/, /\btovor(?!nj)|palet|\bni\s+(?:se\s+)?(?:prevrn|zapelj)|\b(?:ni|nisem|nismo|niso)\s+(?:\S+\s+)?(?:zapelj|zdrsn|zlet|pristal|v\s+jar)/],

  ['stuck', /\bv\s+(?:jarek|jarku)\b/, /\btovor(?!nj)|palet|\b(?:ni|nisem|nismo|niso)\s+(?:\S+\s+)?(?:zapelj|zdrsn|zlet|pristal|v\s+jar)/],
  ['injury', /\branjen\S*|\b(?:sem\s+se|se\s+je)\s+(?:\S+\s+)?poskodoval|\bposkodoval\S*\s+sem\s+se\b|\b(?:voznik|sovoznik|kolega|pesec|kolesar|clovek|oseba)\S*\s+(?:\S+\s+)?(?:je\s+)?(?:poskodovan|ranjen)|\b(?:resilc|resevalc)|\bnujn\S*\s+(?:medicinsk\S*\s+)?pomoc/, /\b(?:tovornjak|kamion|vlacilec|priklopnik|vozilo|kabin)\S*\s+se\s+je\s+(?:\S+\s+)?poskodoval/],
  ['parkbrake', /\brocn\S*\s+(?:zavor\S*\s+)?(?:\S+\s+)?(?:ne\s+(?:drzi|dela|popusti)|pokvarjen|zataknjen)|\b(?:tovornjak|kamion|vlacilec|priklopnik|vozilo)\S*\s+(?:se\s+)?(?:je\s+)?(?:sam\s+)?(?:odkotalil|zapeljal\s+sam|premaknil\s+sam|sam\s+premaknil|sam\s+zapeljal)/],
  ['nostart', /\b(?:motor|tovornjak|kamion|vlacilec)\S*\s+(?:\S+\s+)?(?:ne\s+(?:vzge|zazene|zaganja)|noce\s+(?:vzgati|zagnati|vzgat))|\bzaganjac\S*\s+(?:\S+\s+)?ne\s+dela/],
  ['mirror', /\bogledal\S*\s+(?:\S+\s+)?(?:je\s+)?(?:zlomljen|odpadl|pocil|pocen|razbit|visi|ne\s+(?:dela|nastavlja))/],
  ['lights', /\b(?:luc|luci|zaromet\S*|smernik\S*|zavorn\S*\s+luc\S*|zarnic\S*)\s+(?:\S+\s+)?(?:ne\s+(?:dela|delajo|sveti|svetijo|gori|gorijo)|pregorel\S*|razbit\S*)|\bpregorel\S*\s+(?:\S+\s+)?(?:zarnic|luc)/, /lucka|kontroln/],
  ['warnlight', /\b(?:lucka|kontroln\S*\s+luck)\S*\s+(?:\S+\s+)?(?:sveti|gori|utripa|se\s+je\s+prizgal|se\s+prizge)|\bprizgal\S*\s+(?:se\s+)?(?:je\s+)?(?:\S+\s+)?lucka|\b(?:gori|sveti|utripa)\s+(?:\S+\s+)?lucka/],
  ['glass', /\b(?:vetrobran\S*|steklo|stekla|sipa)\s+(?:\S+\s+)?(?:je\s+)?(?:pocil|pocen|razpokan|razbit)|\b(?:pocil|razpokal|razbil)\S*\s+(?:\S+\s+)?(?:se\s+)?(?:je\s+)?(?:vetrobran|steklo|sipa)/, /ogledal|kamen/],
  ['window', /\b(?:okno|steklo)\S*\s+(?:\S+\s+)?(?:se\s+)?ne\s+(?:spusca|dviga|odpira|zapira)/],
  ['batt', /\bakumulator\S*\s+(?:\S+\s+)?(?:je\s+)?(?:prazen|prazn|izpraznjen|sibk|crknjen|ne\s+polni|ne\s+drzi)/],
  ['tacho', /\btahograf\S*\s+(?:\S+\s+)?(?:ne\s+(?:dela|bere|prebere)|napaka|okvar)|\bkartic\S*\s+(?:voznika\s+)?(?:\S+\s+)?(?:ne\s+(?:bere|dela|gre\s+ven)|izgubljen|ukraden|poskodovan|zataknjen)|\bizgubil\S*\s+(?:sem\s+)?kartic/, /goriv|tank|bencin|nafto/],
  ['coupling', /\b(?:priklopnik|polpriklopnik|prikolic)\S*\s+(?:\S+\s+)?(?:se\s+)?(?:ne\s+(?:zapne|pripne|odpne|spoji)|odpel|odklopil)|\bsedl\S*\s+(?:\S+\s+)?(?:se\s+)?(?:ne\s+(?:zapre|zaklene|odpre)|pokvarjen|okvar)/],
  ['dryfuel', /\b(?:zmanjkalo|ostal\S*\s+sem\s+brez|nimam\s+vec)\s+(?:\S+\s+)?(?:je\s+)?(?:goriva|nafte|dizla|dizel)\b/, /agregat|hladil/],
  ['engine', /\bmotor\S*\s+(?:\S+\s+)?(?:se\s+)?(?:pregreva|kuha|nima\s+moci|izgublja\s+moc|ugasa|ugasnil|je\s+ugasnil|cuka|trza)|\bzasilni\s+(?:nacin|rezim)|\bizgublja\s+moc/],
  ['tyre', /\b(?:gum|pnevmatik)\S*\s+(?:\S+\s+)?(?:je\s+)?(?:poskodovan|prerezan|obrabljen|ima\s+(?:mehur|balon)|izgublja\s+zrak|pusca\s+zrak|premalo\s+zraka)/, /pocil|pocen|predrt/],
  ['reefer', /\b(?:hladiln\S*\s+agregat|agregat|frigo|thermo\s*king|carrier)\S*\s+(?:\S+\s+)?(?:ne\s+(?:hladi|dela|vzge)|alarm|napaka|okvar|se\s+je\s+ustavil|ugasnil)/],
  ['susp', /\b(?:blazin|zracn\S*\s+blazin)\S*\s+(?:\S+\s+)?(?:je\s+)?(?:pocil|pusca|poskodovan)|\bmeh\b\s+(?:\S+\s+)?(?:je\s+)?(?:pocil|pusca)|\bvzmetenj\S*\s+(?:\S+\s+)?(?:ne\s+dela|okvar|pokvarjen)|\b(?:priklopnik|tovornjak|vlacilec)\s+(?:je\s+)?(?:\S+\s+)?(?:nagnjen|povesen|se\s+je\s+spustil)/],
  ['gear', /\bprestav\S*\s+(?:\S+\s+)?(?:ne\s+(?:gre|grejo|prime))|\bmenjalnik\S*\s+(?:\S+\s+)?(?:napaka|okvar|ne\s+(?:dela|prestavlja))|\bsklopk\S*\s+(?:\S+\s+)?(?:drsi|ne\s+dela|zgorel)/],
  ['climate', /\b(?:klima|ogrevanj|gretj|webasto|grelec)\S*\s+(?:\S+\s+)?(?:ne\s+(?:dela|greje|hladi)|okvar|pokvarjen)/, /sedez/],
  ['tarp', /\bcerad\S*\s+(?:\S+\s+)?(?:je\s+)?(?:strgan|raztrgan|luknj|pocen)/],
  ['exhaust', /\bizpuh\S*\s+(?:\S+\s+)?(?:je\s+)?(?:odpadel|pocil|pocen|luknj|ropota|visi)/],
  ['visib', /\bbrisal\S*\s+(?:\S+\s+)?(?:ne\s+(?:delaj|dela|brise)|zlomljen|pokvarjen)|\bsteklo\s+se\s+(?:ros|zarosi)/],
  ['seat', /\b(?:varnostn\S*\s+)?pas\b\s+(?:\S+\s+)?(?:se\s+)?(?:ne\s+(?:zapne|vraca|drzi)|strgan|pokvarjen|zataknjen)|\bsedez\S*\s+(?:\S+\s+)?(?:je\s+)?(?:zlomljen|pokvarjen|se\s+maje|ne\s+(?:dela|nastavlja))/, /gretj|ogrevanj/],
  ['wheel', /\b(?:vijak|vijaki|matic)\S*\s+(?:\S+\s+)?(?:kolesa\s+)?(?:so\s+|je\s+)?(?:razrahljan|zrahljan|odvit|manjka)|\bplatisc\S*\s+(?:\S+\s+)?(?:je\s+)?(?:pocen|pocil|zvit|ukrivljen)|\b(?:kolo|lezaj|pesto)\S*\s+(?:\S+\s+)?(?:se\s+)?(?:maje|greje|vroc|ropota)/],
  ['stuck', /\bobtical\S*\s+(?:sem\s+)?(?:\S+\s+)?v\s+(?:blat|snegu|pesk)|\bzaril\S*\s+(?:se\s+)?(?:\S+\s+)?v\s+(?:blat|sneg|pesek)/],
  ['lost', /\bizgubil\S*\s+(?:sem\s+)?(?:\S+\s+)?(?:kljuc|prometn\S*\s+dovoljenj)|\b(?:kljuc|prometn\S*\s+dovoljenj)\S*\s+(?:\S+\s+)?(?:izgubljen|ne\s+najdem)|\bne\s+najdem\s+(?:\S+\s+)?kljuc/],
  ['numplate', /\b(?:registrsk\S*\s+)?tablic\S*\s+(?:\S+\s+)?(?:je\s+)?(?:odpadl|izgubljen|ukraden|necitljiv|pocen|zlomljen)/, /luc|zarnic/],
  ['adas', /\b(?:asistent|radar|senzor|kamer)\S*\s+(?:\S+\s+){0,2}(?:ne\s+dela|napaka|okvar|izklopil)|\bzavira\s+(?:sam\s+od\s+sebe|brez\s+razloga)/],
  ['door', /\bvrata\s+(?:\S+\s+)?(?:se\s+)?ne\s+(?:zaprejo|odprejo|zaklenejo|zapirajo|odpirajo)|\b(?:dvizn\S*\s+(?:ploscad|vrata)|lift|rampa)\S*\s+(?:\S+\s+)?(?:ne\s+(?:dela|delajo|dviga|spusca)|pokvarjen|okvar)/]];
const SL_NEG = /\b(?:ni|niso|ne)\s+(?:(?:bil[aoi]?|bile)\s+)?(?:pocil|pocen|predrt|eksplodiral|prazn|zlomljen|odpadl|razbit|pusca|puscal|tece|kaplja)\S*/g;
const SL_DELUJ = /\b(?:deluj|funkcionir)\S*/g;
function slKinds(v) { const k = new Set(); for (const p of hrFold(v).replace(SL_DELUJ, 'dela').replace(SL_NEG, ' ').split(/[.,;!?\n]+/)) if (!SL_OK.test(p)) for (const [n, rx, ex] of SL_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); if (k.has('acc')) k.delete('injury'); return k; }


const BE_MAP = { а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', ё: 'io', ж: 'zh', з: 'z', і: 'i', и: 'i', ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ў: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ы: 'y', ь: '', ъ: '', э: 'e', ю: 'iu', я: 'ia', є: 'ie' };
const beLat = (s) => String(s || '').toLowerCase().replace(/['ʼ’`]/g, '').replace(/[а-яёіїєґў]/g, (c) => BE_MAP[c] ?? c);
const BE_OK = /\b(?:adramantav|pamianial|zamianil|vypravil|pachynil|paladzil)\S*|\b(?:znou|zrazu)\s+pratsu|\bpratsu\S*\s+(?:znou|narmalna)\b|\busio\s+(?:u\s+)?(?:paradku|dobra|narmalna)\b|\bbiaz\s+prablem/;
const BE_KINDS = [['brake', /\b(?:tarmaz|tormaz)\S*\s+(?:\S+\s+)?(?:ne\s+(?:pratsu|tryma|tarmoz|spratsav)|slab|admovil)|\bne\s+tarmoz|\b(?:padae|upau|upal|znizhaetstsa)\s+(?:\S+\s+)?tsisk|\btsisk\S*\s+(?:\S+\s+)?(?:padae|upau|znizh)|\b(?:tratsits|spuskae|travits)\s+(?:\S+\s+)?pavetr/, /ruchn|stoiank|stop|liampach|lamp|likhtar|shyn|padushk|asistent|\bsam\b/],
  ['fire', /\bpazhar|\b(?:haryts|haryt|zahare(?:lasia|usia|lisia|losia)|uzharel)\b|\bdym\S*\s+(?:\S+\s+)?(?:z|sa|z-pad|ad)\b|\bdymits|\bpakhne\s+(?:\S+\s+)?(?:harel|palen)/, /hlushyts|vykhlap|liampach|lamp|chek|indykatar|kantrolk|far[ay]?\b|stop|habarit|pavarotn|pamylk/],
  ['flat', /\b(?:lopnul|prabit|spustsil|spushchan|razarval|vybukhl)\S*\s+(?:\S+\s+)?(?:shyn|kol[aoy]\b)|\b(?:shyn|kol[aoy]\b)\S*\s+(?:\S+\s+)?(?:lopnul|prabit|spustsil|spushchan|razarval|spuskae)/, /zapasn/],
  ['steer', /\brul\S*\s+(?:\S+\s+)?(?:tsiazhk|zaklinil|ne\s+krutsi|liuft|biaets)|\btsiahne\s+(?:\S+\s+)?(?:u\s*)?(?:prava|leva|bok)\b/],
  ['leak', /\b(?:tsiache|kapae|patsiok|tsiakuts|ubiahae)\S*\s+(?:\S+\s+)?(?:masl|paliv|saliark|dyzel|antyfryz|tasol|adblue|vadkas)|\b(?:masl|paliv|saliark|dyzel|antyfryz|tasol|adblue)\S*\s+(?:\S+\s+)?(?:tsiache|kapae|patsiok|tsiakuts)/],
  ['acc', /\bavary(?:ia|i|iu)\b|\bdtz\b|\b(?:urezau|urezalas|zbiu|zbila|zachapiu|zachapila|sutyknu|uviezau|uvehau)\S*/, /kamen|kamian/],
  ['injury', /\bparanen\S*|\b(?:kirouts|vadzits|pasazhyr|peshakhod|chalavek)\S*\s+(?:\S+\s+)?(?:paranen|pakalechan|traumav)|\bkhutk\S*\s+dapamoh|\btraum/, /\b(?:mashyn|hruzavik|tsiahach|prychep|kabin)\S*\s+(?:\S+\s+)?pashkodzh/],
  ['parkbrake', /\bruchn\S*\s+(?:(?:tarmaz|tormaz)\S*\s+)?(?:\S+\s+)?(?:ne\s+(?:tryma|pratsu|adpuska)|zlaman|zaklinil)|\b(?:sam\s+)?pakatsi(?:usia|lasia|lisia)\b/],
  ['nostart', /\b(?:rukhavik|mator|hruzavik|tsiahach|mashyn)\S*\s+(?:\S+\s+)?ne\s+(?:zavodz|zapuska|zavia)|\bstartar\S*\s+(?:\S+\s+)?ne\s+(?:krutsi|pratsu)/],
  ['mirror', /\bliusterk\S*\s+(?:\S+\s+)?(?:razbit|zlaman|adarval|adlamal|tresn|vysits|ne\s+rehuliu)|\b(?:razbil|zlamal|adarval)\S*\s+(?:\S+\s+)?liusterk/],
  ['lights', /\b(?:far[ay]?|faru|stop\S*|pavarotnik\S*|habarit\S*|asviatlenn\S*)\s+(?:\S+\s+)?(?:ne\s+(?:pratsu|haryts|haratsts|svets)|perahare|razbit)|\bne\s+(?:haryts|haratsts|pratsu\S*)\s+(?:\S+\s+)?(?:far|stop|pavarotnik|habarit)|\bperahare\S*\s+(?:\S+\s+)?(?:liampach|lamp)/],
  ['warnlight', /\b(?:haryts|zahare\S*|mihae|svetsits|zapalil\S*)\s+(?:\S+\s+)?(?:liampach|lamp|chek|indykatar|kantrolk|pamylk)|\b(?:liampach|lamp|chek|indykatar|kantrolk)\S*\s+(?:\S+\s+)?(?:haryts|zahare|mihae|svetsits)/, /\bfar|stop|pavarotn|habarit|perahare/],
  ['glass', /\b(?:labav\S*|shkl\S*)\s+(?:\S+\s+)?(?:tresn|razbit|patreskal)|\btreshchyn\S*\s+(?:\S+\s+)?(?:na\s+)?(?:labav|shkl)|\b(?:kamen|kamian)\S*\s+(?:\S+\s+)?(?:trapiu|patrapiu|uletseu|vyletseu|udaryu)\S*\s+(?:\S+\s+)?(?:u\s+)?(?:labav|shkl)/, /liusterk/],
  ['window', /\b(?:akno|shkl\S*)\s+(?:\S+\s+)?ne\s+(?:apuska|padnima|adchynia|zachynia)/],
  ['batt', /\bakumuliatar\S*\s+(?:\S+\s+)?(?:seu\b|razradzh|pusty|ne\s+(?:zariadzh|tryma))|\bseu\s+akumuliatar/],
  ['tacho', /\btakhohraf\S*\s+(?:\S+\s+)?(?:ne\s+(?:chyta|pratsu|bacha)|pamylk|zlaman)|\bkart\S*\s+(?:kirouts\S*\s+)?(?:\S+\s+)?(?:ne\s+(?:chyta|pratsu|vykhodz)|zlaman|z(?:a)?hublen|skradzen|pashkodzhan)|\bz(?:a)?hubi\S*\s+(?:\S+\s+)?kart/, /paliv|paliu|zapraun|azs/],
  ['coupling', /\b(?:prychep|paupryche|naupryche)\S*\s+(?:\S+\s+)?(?:ne\s+(?:schapl|zachapl|adchapl)|adchapiu|adarvau)|\bsiadl\S*\s+(?:\S+\s+)?(?:ne\s+(?:zachynia|zakryva|adkryva)|zlaman)/],
  ['dryfuel', /\b(?:skonchyl|zakonchyl)\S*\s+(?:\S+\s+)?(?:paliv|saliark|dyzel)|\b(?:paliv|saliark|dyzel)\S*\s+(?:\S+\s+)?(?:skonchyl|zakonchyl)|\bniama\s+(?:bolsh\s+)?(?:paliv|saliark)/, /aharehat|khaladz|refryzh/],
  ['engine', /\b(?:rukhavik|mator)\S*\s+(?:\S+\s+)?(?:perahra|hlokhne|zahlokh|ne\s+tsiahne|tsiahne\s+drenna|traschae)|\bavaryin\S*\s+rezhym|\b(?:hlushyts|vykhlap)\S*\s+(?:\S+\s+)?dymits|\bdym\S*\s+(?:\S+\s+)?(?:z|sa)\s+(?:\S+\s+)?(?:hlushyts|vykhlap)/],
  ['tyre', /\bshyn\S*\s+(?:\S+\s+)?(?:pashkodzhan|parezan|zatsert|hryzh|tratsits\s+pavetr|spuskae\s+pavetr)/, /lopnul|prabit/],

  ['flat', /\b(?:shyn|pakryshk)\S*\s+(?:\S+\s+)?(?:zlamal|zlaman|sapsaval|sapsavan|paramal|paraman)|\b(?:zlamal|sapsaval)\S*\s+(?:\S+\s+)?(?:shyn|pakryshk)/, /zapasn|\bne\s+(?:zlamal|sapsaval|paramal)/],
  ['reefer', /\b(?:khaladziln|refryzh|aharehat|termo\s*kin|carrier)\S*\s+(?:\S+\s+)?(?:ne\s+(?:khalodz|pratsu|zavodz)|pamylk|alarm|spynius|zahlokh)/],
  ['susp', /\b(?:padushk|pneumapadushk|pnevmapadushk|pneumaresor)\S*\s+(?:\S+\s+)?(?:spuska|lopnul|tratsits|prapuska|travits)|\bpadviesk\S*\s+(?:\S+\s+)?(?:ne\s+pratsu|zlaman)/, /siadz|krasl/],
  ['gear', /\bperadach\S*\s+(?:\S+\s+)?ne\s+(?:ukliuch|uklia|ida|uvakho)|\bkarobk\S*\s+(?:\S+\s+)?(?:pamylk|zlaman|ne\s+pratsu|ne\s+pierakliuch)|\bschaplenn\S*\s+(?:\S+\s+)?(?:buksu|ne\s+pratsu|zharel|zhareu|zhare)/],
  ['climate', /\b(?:atsiaplenn|kandytsyian|kandytsian|klimat|pechk|webasto|vebasta)\S*\s+(?:\S+\s+)?(?:ne\s+(?:pratsu|hree|khalodz|duie)|zlaman)/, /siadz/],
  ['tarp', /\btent\S*\s+(?:\S+\s+)?(?:parvan|razarvan|dzirk|dziurk)/],
  ['exhaust', /\b(?:hlushyts|vykhlap)\S*\s+(?:\S+\s+)?(?:advaliu|advalil|adarvau|adarval|prahar|dzirk|tresn|vysits)/],
  ['visib', /\bdvornik\S*\s+(?:\S+\s+)?(?:ne\s+(?:pratsu|chysts)|zlaman)|\bshkl\S*\s+(?:\S+\s+)?pacie/],
  ['seat', /\bremen\S*\s+biaspek\S*\s+(?:\S+\s+)?(?:ne\s+(?:zashpil|zashchalk|ustsiah|tryma)|parvan|zaklinil)|\bsiadzenn\S*\s+(?:\S+\s+)?(?:zlaman|khistaetstsa|ne\s+(?:rehuliu|pratsu))/, /atsiaplen|padahre/],
  ['wheel', /\bhaik\S*\s+(?:\S+\s+)?(?:kol\S*\s+)?(?:aslab|adkruts|niama|razkruts)|\bdysk\S*\s+(?:kola\s+)?(?:\S+\s+)?(?:tresn|zhnut|pahnut)|\b(?:stupits|padshypnik)\S*\s+(?:\S+\s+)?(?:hreetstsa|hrukhae|hudz)/],
  ['stuck', /\b(?:zakhrasn|zastrah|zaseu|zasela|zakapau)\S*\s+(?:\S+\s+)?u\s+(?:hraz|snez|pias|kanav)/],
  ['lost', /\bz(?:a)?hubi\S*\s+(?:\S+\s+)?(?:kliuch|tekhpasp|dakument)|\bkliuch\S*\s+(?:\S+\s+)?(?:z(?:a)?hubil|ne\s+mahu\s+znaits)|\bne\s+mahu\s+znaits\s+(?:\S+\s+)?kliuch/],
  ['numplate', /\bnumar(?:n\S*\s+znak\S*)?\s+(?:\S+\s+)?(?:advaliu|advalil|z(?:a)?hubil|skradzen|ukradli|ne\s+chytaetstsa|zlaman)/, /liampach|lamp|telef/],
  ['adas', /\b(?:kamer|radar|datchyk|sensar|asistent)\S*\s+(?:\S+\s+){0,2}(?:ne\s+pratsu|pamylk|adkliuchy)|\btarmozits\s+sam/],
  ['cabkit', /\bpadahre\S*\s+(?:\S+\s+)?siadzenn\S*\s+(?:\S+\s+)?(?:ne\s+pratsu|zlaman)/],
  ['fuelcard', /\b(?:paliun|zapraun)\S*\s+kart\S*\s+(?:\S+\s+)?(?:ne\s+(?:pratsu|pryma|chyta)|zablakav|z(?:a)?hublen)|\bz(?:a)?hubi\S*\s+(?:\S+\s+)?(?:paliun|zapraun)\S*\s+kart/],
  ['door', /\bdzver\S*\s+(?:\S+\s+)?(?:ne\s+(?:zachynia|adchynia|zakryva|adkryva|zamyka)|zaklinil)|\b(?:hidrabort|padiomnik)\S*\s+(?:\S+\s+)?(?:ne\s+(?:pratsu|padnima|apuska)|zlaman)/]];

const BE_NEG = /\bne\s+(?:(?:byl[aoi]?|byu)\s+)?(?:prabit|lopnul|razbit|zlaman|tsiache|kapae|spushchan|tresn)\S*/g;
function beKinds(v) { const k = new Set(); for (const raw of String(v || '').split(/[.,;!?\n]+/)) { if (!/[а-яёіўы]/i.test(raw) || /[ищъїєґ]/i.test(raw)) continue; const p = beLat(raw).replace(/\bu\s+miane\b/g, ' ').replace(BE_NEG, ' '); if (!BE_OK.test(p)) for (const [n, rx, ex] of BE_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); } if (k.has('acc')) k.delete('injury'); return k; }



const GE_MAP = { ა: 'a', ბ: 'b', გ: 'g', დ: 'd', ე: 'e', ვ: 'v', ზ: 'z', თ: 't', ი: 'i', კ: 'k', ლ: 'l', მ: 'm', ნ: 'n', ო: 'o', პ: 'p', ჟ: 'zh', რ: 'r', ს: 's', ტ: 't', უ: 'u', ფ: 'p', ქ: 'k', ღ: 'gh', ყ: 'q', შ: 'sh', ჩ: 'ch', ც: 'ts', ძ: 'dz', წ: 'ts', ჭ: 'ch', ხ: 'kh', ჯ: 'j', ჰ: 'h' };
const geLat = (s) => String(s || '').toLowerCase().replace(/[ა-ჰ]/g, (c) => GE_MAP[c] ?? c);
const GE_OK = /\b(?:shevaket|sheaket|gavaket|gaaket|gamovtsval|shevtsval|shetsval|gamotsval|gamostsor)\S*|\bisev\s+(?:\S+\s+)?mushaob|\bqvelaper\S*\s+(?:\S+\s+)?(?:rigz|kargad|norm)|\bproblem\S*\s+ar\s+(?:aris|maqv|gvaqv)|\bnormalur/;
const GE_KINDS = [['brake', /\b(?:mukhruch|tormoz)\S*\s+(?:\S+\s+)?(?:(?:ar|ver)\s+(?:mushaob|ichers|achers|chers)|sust)|\btsnev\S*\s+(?:\S+\s+)?(?:etsem|vardeb|daets)|\bhaer\S*\s+(?:\S+\s+)?(?:ar\s+ivseb|ar\s+igheb)/, /\bkhelis\s+(?:mukhruch|tormoz)/],
  ['parkbrake', /\bkhelis\s+(?:mukhruch|tormoz)\S*\s+(?:\S+\s+)?(?:ar|ver|gapuch|gaiched)/],
  ['flat', /\b(?:saburav|borbal|shin)\S*\s+(?:\S+\s+)?(?:gaskd|daeshv|chajd|gaikhvrit|gaichr)|\b(?:gaskd|gaikhvrit)\S*\s+(?:\S+\s+)?(?:saburav|borbal)|\bsaburav\S*\s+(?:\S+\s+)?haer\S*\s+gadis/],
  ['tyre', /\bsaburav\S*\s+(?:\S+\s+)?(?:gatsvet|bzar|gaibzar|daziand|gaberil)/],

  ['flat', /\b(?:saburav|shin)\S*\s+(?:\S+\s+)?gapuch|\bgapuch\S*\s+(?:\S+\s+)?saburav/, /satadarig/],
  ['tyre', /\b(?:saburav|shin)\S*\s+(?:\S+\s+)?dazianeb/, /satadarig/],
  ['steer', /\bsache\S*\s+(?:\S+\s+)?(?:mdzim|gaiched|ar\s+trial|ver\s+vatrial|luft|kankal)|\b(?:marjvniv|martskhniv)\s+(?:\S+\s+)?(?:miakv|itsev|mikh)/],
  ['leak', /\b(?:zet|satsvav|dizel|antifriz|tosol|adblu|siti)\S*\s+(?:\S+\s+)?(?:zhonav|gamodis|ighvr|gaedin|chamodis)|\bgazhonv|\bzhonav\S*\s+(?:\S+\s+)?(?:zet|satsvav|dizel|antifriz)/],
  ['fire', /\bitsvis\b|\btsetskhl(?!makr)|\bkhandzar(?!satsin)|\bkvaml/, /\b(?:maquch|gamonabolkv|glushitel|vikhlop)/],
  ['acc', /\bavari(?!ul)|\b(?:davejakh|shemejakh|daejakh|shevejakh|gadabrund|gadavbrund)|\bsagzao\s+(?:\S+\s+)?shemtkhvev/],

  ['acc', /\bgzidan\s+(?:\S+\s+)?(?:gadavid|gadavard|gadakhd)|\b(?:gadavid|gadavard)\S*\s+(?:\S+\s+)?gzidan|\b(?:arkh|tkhril)\S*\s+(?:\S+\s+)?chavard|\bchavard\S*\s+(?:\S+\s+)?(?:arkh|tkhril)|\btkhrilshi(?:a|aa)\b/, /\btvirt|palet|\bar\s+(?:gadavid|gadavard|chavard)/],

  ['stuck', /\b(?:arkh|tkhril)\S*\s+(?:\S+\s+)?chavard|\bchavard\S*\s+(?:\S+\s+)?(?:arkh|tkhril)|\btkhrilshi(?:a|aa)\b/, /\btvirt|palet|\bar\s+(?:gadavid|gadavard|chavard)|\bar\s+(?:aris\s+)?tkhril/],
  ['injury', /\b(?:dashav|davshav|travm)/],
  ['nostart', /\b(?:dzrav|motor|mankan)\S*\s+(?:\S+\s+)?(?:(?:ar|ver)\s+(?:irtveb|ikokeb)|chakr)|\bver\s+(?:davkok|vkok|gavkok)/],
  ['engine', /\b(?:gadakhurd|khurdeb)|\bdzrav\S*\s+(?:\S+\s+)?(?:simdzlavr|aklebs|khmaur|kakun|kankal)|\b(?:maquch|gamonabolkv)\S*\s+(?:\S+\s+)?kvaml|\bkvaml\S*\s+(?:\S+\s+)?(?:maquch|gamonabolkv)|\bturbin\S*\s+(?:\S+\s+)?(?:gapuch|stvens|khmaur)/],
  ['mirror', /\bsark\S*\s+(?:\S+\s+)?(?:gatqd|motqd|gaibzar|chamovard|daziand)|\b(?:gatqd|motqd)\S*\s+(?:\S+\s+)?sark/],
  ['lights', /\b(?:pari|parebi|par[ie]b\S*|natur|shuk|stop|gabarit|povorot)\S*\s+(?:\S+\s+)?(?:ar\s+(?:anateb|mushaob|ints)|daitsv)|\bmokhvevis\s+(?:\S+\s+)?(?:ar\s+mushaob|daitsv)/],
  ['warnlight', /\bainto\b|\bantia\b|\b(?:shetsdom|oshibk)\S*\s+(?:\S+\s+)?(?:tser|amoagd|gamoakv|ants)/],
  ['glass', /\bmin\S*\s+(?:\S+\s+)?(?:gaibzar|gatqd|bzar|chamtvr)|\bkv\S*\s+(?:\S+\s+)?mokhvd\S*\s+(?:\S+\s+)?(?:sakare|min)|\bpanjar\S*\s+(?:\S+\s+)?(?:gatqd|gaibzar|chamtvr)/],
  ['window', /\bpanjar\S*\s+(?:\S+\s+)?(?:ar|ver)\s+(?:itsev|eshveb|ikhureb|igheb|daveshv|avts)/],
  ['batt', /\b(?:akumulator|akum|batare)\S*\s+(?:\S+\s+)?(?:dajd|datsl|chajd|ar\s+(?:mushaob|tenis))|\b(?:dajd|datsl)\S*\s+(?:\S+\s+)?(?:akumulator|akum|batare)/],
  ['tacho', /\btakhograp\S*\s+(?:\S+\s+)?(?:ar|ver|gapuch|shetsdom)|\bmdzghol\S*\s+barat\S*\s+(?:\S+\s+)?(?:davkarg|dakarg|damekarg|gapuch|gatqd|ar\s+(?:ikitkh|mushaob))/],
  ['fuelcard', /\b(?:satsvavis|benzinis|dizelis)\s+barat\S*\s+(?:\S+\s+)?(?:ar|ver|daiblok|gapuch|davkarg)/],
  ['lost', /\b(?:gasagheb|tekpasport|dokument)\S*\s+(?:\S+\s+)?(?:davkarg|damekarg|dakarg|ver\s+vipov)|\b(?:davkarg|damekarg)\S*\s+(?:\S+\s+)?(?:gasagheb|tekpasport|dokument)/],
  ['coupling', /\b(?:misabmel|pritsep|polupritsep|sedl|treiler)\S*\s+(?:\S+\s+)?(?:ar|ver)\s+(?:ebmeb|vabam|davabi|ikhsneb|iketeb)/],
  ['dryfuel', /\b(?:satsvav|dizel|soliar|benzin)\S*\s+(?:\S+\s+)?(?:gamitavd|gatavd|damimtavr|damtavr|gamomel)|\bavz\S*\s+(?:\S+\s+)?tsariel/],
  ['reefer', /\b(?:matsivar|repi|refi|refrijerator|kholodilnik|agregat|termoking)\S*\s+(?:\S+\s+)?(?:(?:ar|ver)\s+(?:atsieb|mushaob|chairtv)|gapuch|shetsdom)/],
  ['susp', /\b(?:pnevmo|padushk|resor|amortizator)\S*\s+(?:\S+\s+)?(?:gaskd|gatqd|ushvebs|chajd|daeshv|ar\s+mushaob|zhonav|gapuch)/],
  ['gear', /\b(?:sichkar|peredach|korobk|gadatsemat)\S*\s+(?:\S+\s+)?(?:(?:ar|ver)\s+(?:ertveb|chairtv|vrtav|gadadis)|gapuch|khmaur|kakun)|\b(?:stseplen|klach|gadabmulob)\S*\s+(?:\S+\s+)?(?:buksa|ar\s+mushaob|gapuch)/],
  ['climate', /\b(?:gatbob|konditsioner|pechi|pechka|avtonomk|vebasto|webasto|klimat)\S*\s+(?:\S+\s+)?(?:(?:ar|ver)\s+(?:mushaob|atbob|atsieb|chairtv|irtveb)|gapuch)/, /\bsavardzl\S*\s+gatbob/],
  ['cabkit', /\bsavardzl\S*\s+gatbob\S*\s+(?:\S+\s+)?(?:ar|ver|gapuch)/],
  ['tarp', /\b(?:tent|brezent|pard)\S*\s+(?:\S+\s+)?(?:gaikh|dakhe|gaichr|daziand|chamovard)/],
  ['exhaust', /\bmaquch\S*\s+(?:\S+\s+)?(?:chamovard|gaikhvrit|gapuch|khmaur|daziand|motqd|gatqd)/],
  ['visib', /\b(?:satsmend|dvornik)\S*\s+(?:\S+\s+)?(?:ar|ver|gapuch|gatqd)/],
  ['seat', /\bghved\S*\s+(?:\S+\s+)?(?:ar|ver|gapuch|gatqd|gaikh)|\bsavardzel\S*\s+(?:\S+\s+)?(?:gatqd|gapuch|ar\s+(?:mushaob|ireguleb))/],
  ['wheel', /\b(?:chanchik|kanch|gaik)\S*\s+(?:\S+\s+)?(?:moeshv|moshv|chamovard|aklia|gatqd)/],
  ['stuck', /\b(?:talakh|tovl|qinul|kvish)\S*\s+(?:\S+\s+)?(?:chavrch|chavepal|chaejd|chavjd)|\b(?:mankan|borbl|borbal)\S*\s+(?:\S+\s+)?buksa/, /\bsatsob/],
  ['numplate', /\b(?:nomer|sanomr)\S*\s+(?:\S+\s+)?(?:chamovard|dakarg|davkarg|motqd|gatqd|moipar)/],
  ['adas', /\b(?:kamer|radar|asistent|sensor|datchik)\S*\s+(?:\S+\s+)?(?:(?:ar|ver)\s+(?:mushaob|achveneb)|gapuch)/],
  ['door', /\b(?:kari|karebi|kars|saket|gidrobort|hidrobort)\S*\s+(?:\S+\s+)?(?:(?:ar|ver)\s+(?:iketeb|igheb|vkhsni|vagheb|mushaob|eshveb)|gapuch)/],

  ['load', /\b(?:tvirt|palet)\S*\s+(?:\S+\s+)?(?:gadaadgil|daets|datsviv|gadmovard|gadavard|gadaikhar|gadaqir|gaiqir)/, /ghved/],
  ['lashgear', /\b(?:tvirtis\s+ghved|ghvedeb)\S*\s+(?:\S+\s+)?(?:gatsq|gaskd|gapuch|dazian)/, /dzrav|generator|usaprtkh|ventil/],
  ['theft', /\b(?:moipar|moparul|gaqurd|qurdob)\S*/],
  ['vandal', /\bvandal|\bvighats\S*\s+(?:\S+\s+){0,3}?(?:dakatsr|gakatsr|chamtvr|daamtvr|gachr|daghebe)/]];

const GE_NEG = /\b(?:ar|ver)\s+(?:aris\s+)?(?:itsv|zhonav|gamod|ighvr|gaskd|daeshv|gaikhvrit|gakhvret|gatqd|gaibzar|dazian|dashav|davejakh|chamovard|gapuch|moipar|gadaadgil|daets|gatsq)\S*/g;
function geKinds(v) { const k = new Set(); for (const raw of String(v || '').split(/[.,;!?\n]+/)) { if (!/[ა-ჰᲐ-Ჰ]/.test(raw)) continue; const p = geLat(raw).replace(GE_NEG, ' '); if (!GE_OK.test(p)) for (const [n, rx, ex] of GE_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); } if (k.has('acc')) k.delete('injury'); return k; }




const AR_MAP = { ا: 'a', أ: 'a', إ: 'a', آ: 'a', ٱ: 'a', ء: '', ب: 'b', ت: 't', ث: 'th', ج: 'j', ح: '7', خ: 'kh', د: 'd', ذ: 'dh', ر: 'r', ز: 'z', س: 's', ش: 'sh', ص: 's', ض: 'd', ط: 't', ظ: 'dh', ع: '3', غ: 'gh', ف: 'f', ق: 'q', ك: 'k', ل: 'l', م: 'm', ن: 'n', ه: 'h', ة: 'h', و: 'w', ي: 'y', ى: 'a', ؤ: 'w', ئ: 'y', پ: 'p', چ: 'ch', ژ: 'zh', ک: 'k', گ: 'g', ی: 'y' };
const arLat = (s) => String(s || '').replace(/[ً-ٰٟـ]/g, '').replace(/[ء-ی]/g, (c) => AR_MAP[c] ?? c).toLowerCase();
const AR_P = '\\b[wfb]?(?:a?ll?)?';
const AR_NOT = (v) => `(?:la|ma|msh|mw|lm)\\s+(?:\\S+\\s+)?(?:b?[ynt])?(?:${v})`;
const AR_D = `(?:${AR_NOT('3ml|shtghl|shghal|shtghal')}|khrb|m3tl|t?3tl|3atl|d3yf)`;

const arRx = (n, d, extra) => new RegExp(`${AR_P}(?:${n})\\S*\\s+(?:\\S+\\s+){0,2}(?:${d.split('D').join(AR_D)})|\\bt?3tl\\S*\\s+(?:fy\\s+)?${AR_P}(?:${n})${extra ? '|' + extra : ''}`);
const AR_ENG = 'm7rk|mwtwr|matwr', AR_EXH = 'shkman|ashkman|3adm|akzwz|ekzwz|aksdwz', AR_LOSE = 'da3|day3|dy3t|fqdt|mfqwd|ra7t|ansrq|msrwq|srqw';
const AR_OK = /\b(?:tm|ttm|qd)\s+(?:al)?(?:asla7|tsly7|tghyyr|astbdal|tbdyl)|\b(?:sl7|asl7|ghyrna|ghyrw|ghyrt|bdlna|bdlw|bdlt)\S*|\brj3\S*\s+(?:\S+\s+)?b?[yt](?:shtghl|3ml)|\bkl\s+(?:\S+\s+)?(?:tmam|mmtaz|mnyh|tyb|zyn)|\b(?:ma|mafy|mafyh|la|lys)\s+(?:fy\s+|ywjd\s+|twjd\s+|fyh\s+|hnak\s+)?(?:ay\s+)?(?:mshkl|mshakl|a3tal)|\b(?:b?[yt]3ml|b?[yt]shtghl|shghal\S*)\s+(?:\S+\s+)?(?:bshkl\s+)?(?:tby3y|mnyh|tmam|mzbwt|mlyh)/;
const AR_KINDS = [['brake', arRx('framl|fram|bryk|mkab7|mkb7', 'D|' + AR_NOT('msk'), '\\bdght\\s+[wfb]?(?:a?ll?)?hwa\\S*\\s+(?:\\S+\\s+)?(?:b?[yt]nzl|[yt]nkhfd|nazl|d3yf)'), /(?:framl|fram|bryk)\S*\s+[wfb]?(?:a?ll?)?(?:yd|wqwf)\b|hand\s*bryk/],
  ['parkbrake', arRx('(?:framl|fram|bryk)\\S*\\s+[wfb]?(?:a?ll?)?(?:yd|wqwf)\\b|hand\\s*bryk', 'D|' + AR_NOT('msk'))],
  ['flat', arRx('atar|dwlab|dwalyb|kawtsh|kwtsh|tayr|3jl', 'anfjr|fq3|m?bnshr|mthqwb|nazl|fady|nfs', `\\b(?:anfjr|fq3|bnshr|ankhzq)\\S*\\s+(?:\\S+\\s+)?${AR_P}(?:atar|dwlab|kawtsh|kwtsh|tayr|3jl)|\\bm?bnshr`)],
  ['tyre', arRx('atar|dwlab|dwalyb|kawtsh|kwtsh|tayr', 'mshqwq|anshq|mntfkh|mmsw7|mqtw3', `\\bshq\\S*\\s+(?:fy\\s+)?${AR_P}(?:atar|dwlab|kawtsh|tayr)`)],
  ['steer', arRx('mqwd|drksywn|dryksywn|styrng|twjyh', 'D|thqyl|qasy|l3b|[yt]s7b|[yt]shd', '\\b(?:b?[yt]s7b|b?[yt]shd)\\s+(?:\\S+\\s+)?\\S*(?:ymyn|ysar|shmal)')],
  ['leak', arRx('zyt|dyzl|mazwt|swlar|adblw|antyfryz|sayl', 'b?[yt]srb|tsryb|b?[yt]nqt|b?[yt]khr|nazl', `\\b(?:tsryb|tnqyt|nazl|b?[yt]nqt|b?[yt]khr|b?[yt]srb)\\s+(?:\\S+\\s+){0,2}${AR_P}(?:zyt|dyzl|mazwt|swlar|adblw|antyfryz)`)],
  ['fire', /\b[wfb]?(?:a?ll?)?(?:7ryq|nar\b|dkhan|dkhnh)|\b(?:b?[yt]|a)?7trq|\basht3l|\b(?:b?t)?wl3/, new RegExp(`\\btfay|${AR_P}(?:${AR_EXH})|\\b(?:b?t)?wl3\\S*\\s+(?:\\S+\\s+)?${AR_P}(?:lmb|dw\\b|ashar|3lam)|${AR_P}(?:lmb|dw\\b)\\S*\\s+(?:\\S+\\s+){0,2}(?:b?t)?wl3`)],
  ['acc', /\b[wfb]?(?:a?ll?)?(?:7adth|7adt\b)|\bt?sadm|\bastdm|\b(?:sdmt|sdmny|sdmna|sdmw|khbtt|khbtny|khbtna|khbtw|khbth|d3st)/],

  ['acc', /\b(?:al)?anqlb|\bmnqlb|\bkhrj\S*\s+(?:3n|mn)\s+(?:al)?tryq|\b(?:al)?(?:sha7n|syar|trl|qatr|mqtwr|lwry)\S*\s+(?:\S+\s+)?mqlwb/, /7mwl|bda3|palet|\b(?:ma|lm|la|msh|mish|mw|lys|lyst)\s+(?:\S+\s+)?(?:anqlb|tnqlb|ynqlb|khrj|mqlwb)/],

  ['acc', new RegExp(`\\b[wf]?(?:sqt|wq3|ta7|anzlq|tzl[qj]|tdhrj|[yt]sqt|[yt]q3|[yt]ty7|[yt]nzlq|dkhl)\\S*\\s+(?:\\S+\\s+){0,2}?(?:fy|ila|l)\\s*${AR_P}(?:khndq|tr3h)|${AR_P}(?:sha7n|syar|trl|qatr|mqtwr|lwry)\\S*\\s+(?:\\S+\\s+)?fy\\s*${AR_P}(?:khndq|tr3h)\\b`), /7mwl|bda3|palet|\b(?:lm|ma|la|lys|lyst|msh|mw|mish|mesh)\s+(?:\S+\s+)?(?:[wf]?(?:sqt|wq3|ta7|anzlq|dkhl|[yt]sqt|[yt]q3|[yt]ty7|[yt]nzlq|[yt]dkhl)|fy)/],

  ['stuck', new RegExp(`\\b[wf]?(?:sqt|wq3|ta7|anzlq|tzl[qj]|tdhrj|[yt]sqt|[yt]q3|[yt]ty7|[yt]nzlq|dkhl)\\S*\\s+(?:\\S+\\s+){0,2}?(?:fy|ila|l)\\s*${AR_P}(?:khndq|tr3h)|${AR_P}(?:sha7n|syar|trl|qatr|mqtwr|lwry)\\S*\\s+(?:\\S+\\s+)?fy\\s*${AR_P}(?:khndq|tr3h)\\b`), /7mwl|bda3|palet|\b(?:lm|ma|la|lys|lyst|msh|mw|mish|mesh)\s+(?:\S+\s+)?(?:[wf]?(?:sqt|wq3|ta7|anzlq|dkhl|[yt]sqt|[yt]q3|[yt]ty7|[yt]nzlq|[yt]dkhl)|fy)/],
  ['injury', /\b(?:msab|asab[ht]|anjr7|mjrw7|jr7|nzyf|[yt]nzf)/],
  ['nostart', arRx(AR_ENG, AR_NOT('dwr|ql3|shtghl|shghl|3ml|shghal|shtghal') + '|(?:tfa|ytfy|btfy|bytfy|wqf)\\b', `\\b(?:la|ma|msh|mw)\\s+(?:\\S+\\s+)?b?[yt](?:dwr|ql3)\\b|\\b(?:tfa|ytfy|btfy|bytfy)\\s+(?:\\S+\\s+)?${AR_P}(?:${AR_ENG})`)],
  ['engine', arRx(AR_ENG + '|tyrbw|trbw', 'skhn|skhwn|d3yf|d3f|swt|tqtq|khrb|m3tl|3atl|[yt]rjf|byrjf|rjf|sfyr|bysfr', `\\b(?:skhwnh|artfa3)\\s+(?:\\S+\\s+)?${AR_P}7rar|\\b7rar\\S*\\s+${AR_P}(?:${AR_ENG})\\S*\\s+(?:\\S+\\s+)?(?:3aly|mrtf3|[yt]rtf3|btrtf3|tl3t)|${AR_P}(?:${AR_EXH})\\S*\\s+(?:\\S+\\s+){0,2}${AR_P}(?:dkhan|dkhnh)|${AR_P}(?:dkhan|dkhnh)\\S*\\s+(?:\\S+\\s+){0,3}${AR_P}(?:${AR_EXH})|\\b(?:ma|mafy|la)\\s+(?:fy\\s+|ywjd\\s+)?(?:qwh|3zm)\\b|\\b(?:fqdan|d3f|nqs)\\s+(?:fy\\s+)?${AR_P}(?:qwh|3zm)`)],
  ['mirror', arRx('mrah|mrayh|mray|mrayat|mrayt', 'mksw?r|anksr|[yt]nksr|ksrt|trt|wq3t|sqtt|mkhlw3', `\\b(?:anksr|ksrt?)\\S*\\s+(?:\\S+\\s+)?${AR_P}(?:mrah|mrayh|mray)`)],
  ['lights', arRx('dw\\b|dwa\\b|adwa\\b|lmbh|lmbat|lmb\\b|adah|fanws|anwar|nwr\\b|stwb|ghmaz|flashr|kshaf', 'D|m7rwq|7rqt|an7rqt|tafy|mtfy|' + AR_NOT('dwy|dy'))],
  ['warnlight', new RegExp(`\\b(?:lmb|dw\\b|ashar|3lam|ayqwn)\\S*\\s+(?:\\S+\\s+)?${AR_P}(?:${AR_ENG}|t7dhyr|tnbyh|khta|zyt|abs|adblw)|\\b(?:rsal|khta)\\S*\\s+(?:\\S+\\s+)?(?:3l[ae]|fy|b)\\s+${AR_P}?(?:shash|tablw|3dad)|\\b(?:ash3l|wl3|dwt|tl3t)\\S*\\s+(?:\\S+\\s+)?${AR_P}(?:lmb|dw\\b|ashar|3lam)`)],
  ['glass', arRx('zjaj|qzaz|blwr|shbak|nafdh|brbryz', 'mksw?r|anksr|[yt]nksr|msh3wr|sh3r|mshqwq|shq|mtshq|7jr', `\\b(?:sh3r|shq)\\S*\\s+(?:fy\\s+)?${AR_P}(?:zjaj|qzaz|blwr)|\\b7jr\\S*\\s+(?:\\S+\\s+){0,2}${AR_P}(?:zjaj|qzaz|blwr)`)],
  ['window', arRx('shbak|shbabyk|nafdh|nwafdh', 'D|' + AR_NOT('skr|nzl|tl3|ghlq|ft7|sakr'))],
  ['batt', arRx('btaryh|btaryat|btary\\b|bataryh', 'fady|khls|myt|nazl|d3yf|fslt|nam|D', `\\b(?:fdyt|khlst|nzlt|matt)\\s+(?:\\S+\\s+)?${AR_P}btary`)],
  ['tacho', arRx(`takwghraf|takhwghraf|takwgraf|takhwgraf|takw\\b|(?:krt|btaq)\\S*\\s+${AR_P}(?:sayq|shwfyr)`, `D|${AR_LOSE}|anksr|mksw?r|${AR_NOT('qr|qra')}`, `\\b(?:dy3t|fqdt|da3t)\\s+(?:\\S+\\s+)?${AR_P}(?:krt|btaq)\\S*\\s+${AR_P}(?:sayq|shwfyr)`)],
  ['fuelcard', arRx(`(?:krt|btaq)\\S*\\s+${AR_P}(?:wqwd|mazwt|bnzyn|dyzl|swlar|kazy|t3by)`, `D|${AR_LOSE}|anksr|mksw?r|mrfwd|mqfl|mblwk|${AR_NOT('qr|mr')}`, `\\b(?:dy3t|fqdt)\\s+(?:\\S+\\s+)?${AR_P}(?:krt|btaq)\\S*\\s+${AR_P}(?:wqwd|mazwt|bnzyn|dyzl|kazy|t3by)`)],
  ['lost', arRx('mfta7|mfaty7|awraq|astmar', AR_LOSE, `\\b(?:dy3t|fqdt|da3t?)\\S*\\s+(?:\\S+\\s+)?${AR_P}(?:mfta7|mfaty7|awraq|astmar)`)],
  ['coupling', arRx('tryl|mqtwr|s7n\\b|kyng|sdl', AR_NOT('shbk|qfl|msk|rkb') + '|anfsl|anfk|fltt'), /\b[wfb]?(?:a?ll?)?(?:framl|fram\b|bryk)/],
  ['dryfuel', new RegExp(`${AR_P}(?:mazwt|dyzl|swlar|bnzyn|wqwd)\\S*\\s+(?:\\S+\\s+)?(?:khls|nfd|ntfd)|\\b(?:khls|khlst|nfd|nfdt)\\S*\\s+(?:\\S+\\s+)?${AR_P}(?:mazwt|dyzl|swlar|bnzyn|wqwd)|${AR_P}(?:khzan|tnk)\\S*\\s+(?:\\S+\\s+)?fady`)],
  ['reefer', arRx(`brad|thlaj|fryzr|thrmw|trmw|kwlr|(?:makyn|mkyn|wh?d)\\S*\\s+${AR_P}tbryd`, 'D|tafy|' + AR_NOT('brd'))],
  ['susp', arRx('msa3d|balwn|mkhd|nwabd|yay|t3lyq|sspns|amrtyz', 'anfjr|mnfjr|mthqwb|fady|nazl|mksw?r|anksr|[yt]srb|tsryb|[yt]nqt|D', `${AR_P}(?:sha7n|syar|tryl|kmywn)\\S*\\s+(?:\\S+\\s+)?(?:nazl|mayl|natsh)`), new RegExp(`msa3d\\S*\\s+${AR_P}(?:7ar|sayq|frml|tw?qf)`)],
  ['gear', arRx('jyr|qyr|gyr|ftys|kltsh|klatsh|dbryaj|dbryag|grbks|jyrbks|3lbh\\s+[wfb]?(?:a?ll?)?sr3|naql\\s+[wfb]?(?:a?ll?)?7rk', AR_NOT('3shq|dkhl|ghyr|tghyr') + '|3alq|tqtq|m7rwq|D|b?[yt]z7lq|b?[yt]flt', '\\b(?:ma|la|msh)\\s+(?:\\S+\\s+)?b?[yt]3shq\\b')],
  ['climate', arRx('mkyf|tkyyf|tkyf|kwndshn|kndyshn|tdfy|shwfaj|swba|dfay|hytr|wybstw|wbstw', 'D|' + AR_NOT('brd|dfy|skhn')), new RegExp(`(?:tdfy|tskhyn)\\S*\\s+${AR_P}(?:krsy|mq3d)`)],
  ['cabkit', arRx(`(?:tdfy|tskhyn)\\S*\\s+${AR_P}(?:krsy|mq3d)`, 'D')],
  ['tarp', arRx('shadr|trbal|brnd|star[ah]', 'mshqwq|anshq|shq|mqtw3|anqt3|mmzq|tmzq|mkhzwq|ankhzq|mfkwk|tar|trt', `\\b(?:shq|khzq)\\S*\\s+(?:fy\\s+)?${AR_P}(?:shadr|trbal)`)],
  ['exhaust', arRx(AR_EXH, 'waq3|wq3|sqt|mksw?r|anksr|mthqwb|mkhzwq|swt|byzmr|mfkwk|anfk|m3lq|mt3lq|dayl|D'), /dkhan|dkhnh/],
  ['visib', arRx('ms7[ah]|ms7at|msa7|mas7|wybr|wyprz', 'D|mqtw3|anqt3|mksw?r|anksr|' + AR_NOT('ms7|t7rk'))],
  ['seat', arRx('krsy|kursy|mq3d|7zam', 'D|mksw?r|anksr|mqtw3|anqt3|3alq|3lq|' + AR_NOT('qfl|t7rk|rj3|tl3|shbk|nzl')), new RegExp(`(?:tdfy|tskhyn)\\S*\\s+${AR_P}(?:krsy|mq3d)`)],
  ['wheel', arRx('swamyl|smwl|smamyl|brghy|braghy|rwlman|bylya|bly\\b|jnt|jnwt', 'mrkhy|mfkwk|rakhy|rkhw|anfk|wq3|sqt|naqs|mksw?r|anksr|tar|ra7|swt|bytq|tqtq|D', `${AR_P}(?:dwlab|3jl|atar|kawtsh)\\S*\\s+(?:\\S+\\s+){0,2}(?:b?[yt]tl3|ankhl3|tar\\b|b?[yt]rqs)`)],
  ['stuck', new RegExp(`\\b(?:t?ghrz|ghtst)|\\b(?:3lq|t3lq)\\S*\\s+(?:\\S+\\s+){0,2}(?:fy\\s+)?${AR_P}(?:w7l|tyn|thlj|rml|khndq|tr3h)`)],
  ['numplate', arRx(`nmr[ht]?\\b|nmrat|lw7[ht]?\\s+${AR_P}arqam|lw7[ht]?\\b`, `wq3|sqt|trt|${AR_LOSE}|mksw?r|anksr|${AR_NOT('nqr|qr')}|msh\\s+mqrw|mmsw7`), /lmb|dw\b|nwr\b|tlfwn|tlyfwn|qyad/],
  ['adas', arRx(`kamyr|kmyr|radar|rdar|7sas|7ssas|snsr|sensr|msa3d\\S*\\s+${AR_P}(?:7ar|frml|tw?qf|sayq)`, 'D|khta|tafy|' + AR_NOT('shwf'), '\\bb?[yt]frml\\S*\\s+(?:\\S+\\s+)?(?:l7al|w7d|mn\\s+7al)')],
  ['door', arRx('bab\\b|babh|abwab|qfl|kalwn|skr[ht]|bwab[ht]|raf3[ht]?|hydrw?lyk', AR_NOT('skr|ft7|nft7|ghlq|nghlq|qfl|nqfl|tl3|nzl') + '|mksw?r|anksr|3alq|3lq|D')]];

const AR_NEG = /\b(?:la|ma|msh|mw|mafy|mafyh|lys|lm|bdwn|blash|ghyr)\s+(?:fy\s+|ywjd\s+|twjd\s+|fyh\s+|hnak\s+|3m\s+|sar\s+|7sl\s+|kan\s+)?[wfb]?(?:a?ll?)?(?:b?[yt]srb|tsryb|srb|b?[yt]nqt|tnqyt|b?[yt]khr|anfjr|[yt]nfjr|mnfjr|m?bnshr|mthqwb|anksr|[yt]nksr|mksw?r|msh3wr|7ryq|nar\b|dkhan|dkhnh|[yta]7trq|7adth|7adt\b|tsadm|asab|msab|anjr7|mjrw7|da3|day3|mshqwq|mqtw3)\S*/g;
function arKinds(v) { const k = new Set(); for (const raw of String(v || '').split(/[.,;!?\n،؛؟]+/)) { if (!/[ء-ي]/.test(raw)) continue; const p = arLat(raw).replace(AR_NEG, ' '); if (!AR_OK.test(p)) for (const [n, rx, ex] of AR_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); } if (k.has('acc')) k.delete('injury'); return k; }




const faLat = (s) => arLat(String(s || '').replace(/‌/g, '')).replace(/\b(n?my)\s+(?=\S)/g, '$1');
const FA_D = 'kar\\s+nmy\\S*|3ml\\s+nmy\\S*|khrab\\S*|d3yf\\S*|az\\s+kar\\s+aft\\S*|(?:mshkl|ayrad|3yb)\\S*\\s+(?:\\S+\\s+)?(?:dar|pyda)\\S*';
const FA_LOSE = 'gm\\s+(?:sh|kr)\\S*|gm\\b|dzdyd\\S*';

const faRx = (n, d, extra) => new RegExp(`\\b(?:${n})\\S*\\s+(?:\\S+\\s+){0,3}(?:${d.split('D').join(FA_D)})${extra ? '|' + extra : ''}`);
const FA_OK = /\b(?:t3myr|t3wyd|3wd|drst|pnchrgyry)\s*(?:shd|krd|kr)\S*|\bdwbarh\s+(?:\S+\s+)?(?:kar|rwshn)\s+my\S*|\bhmh\s*(?:chyz|chy)\S*\s+(?:\S+\s+)?(?:khwb|drst|mrtb|ok|salm|rdyf|tmyz)|\bmshkly\s+(?:\S+\s+)?n(?:yst|dar)\S*|\bsalm\s+(?:ast|h?st)\b|\bdrst\s+kar\s+my\S*|\bkar\s+my(?:knd|knh)\s+(?:\S+\s+)?(?:khwb|ady|drst)/;
const FA_NEG = /\b(?:hych|bdwn)\s+\S+|\b(?:pnchr|shksth|shkst|trk|nsht|nshty|chkh|dwd|atsh|tsadf|tsadfy|parh|swrakh|khrab|mshkl|mshkly|ayrad|ayrady|3yb|gm|khaly|aftadh|aftad|lq|shl|jda)\S*\s+(?:(?:hm|ham|ra|ast)\s+)?n(?:yst|bwd|dar|dasht|shd|krd|kd|grft|myad|mychk|my)\S*/g;
const FA_ENG = 'mwtwr|mashyn|kamywn|tryly|mwtr|kshnd';
const FA_WARN = '(?:chk|mwtwr|hshdar|khta|abs|ebs|adblw|rwghn|dma|batry|srwys|zrd|qrmz)';
const FA_KINDS = [['brake', faRx('trmz|bryk|lnt', 'D|nmy?gyr\\S*|bryd\\S*|sft\\S*|sda\\S*\\s+(?:\\S+\\s+)?(?:my|dar)\\S*|dagh\\S*|tmwm\\S*|tmam\\s+sh\\S*', '\\bfshar\\s+(?:\\S+\\s+)?bad\\S*\\s+(?:\\S+\\s+)?(?:km|payyn|myaft|aft|nmyr)\\S*'), /trmz\s*(?:dsty|khwab|parkyng)|hnd\s*bryk|(?:chragh|lamp)\s+(?:trmz|bryk)|khwdkar/],
  ['parkbrake', faRx('trmz\\s*(?:dsty|khwab|parkyng)|hnd\\s*bryk', 'D|nmy?gyr\\S*|bryd\\S*|gyr\\s+krd\\S*|(?:baz|azad)\\s+nmy\\S*|nmykhwab\\S*')],
  ['flat', faRx('lastyk|tayr|chrkh', 'pnchr\\S*|trkyd\\S*|bad\\s+(?:\\S+\\s+)?(?:ndar|khaly|rft|km)\\S*|bad\\S*\\s+khaly\\S*|khwabyd\\S*', '\\bpnchr\\S*(?=\\s|$)|\\btrkyd\\S*\\s+(?:\\S+\\s+)?(?:lastyk|tayr)')],
  ['tyre', faRx('lastyk|tayr', 'trk(?!yd)\\S*|parh\\S*|bad\\s+krdh\\b|sayydh|saydh|saf\\s+sh\\S*|brydgy\\S*|ajr\\S*')],
  ['steer', faRx('frman', 'D|sngyn\\S*|sft\\S*|lq\\b|lq\\s+sh\\S*|l3q|myksh\\S*|kj\\b|kj\\s+sh\\S*|bazy\\s+dar\\S*|mylrz\\S*|lrz\\S*', '\\b(?:mashyn|kamywn|tryly|mwtr)\\S*\\s+(?:\\S+\\s+)?(?:bh\\s+)?(?:smt\\s+)?(?:rast|chp)\\s+myksh\\S*')],
  ['leak', faRx('rwghn|tyl|gazw|dyzl|swkht|ab\\s+radyatwr|ddykh|adblw', 'nsht\\s+(?:my|dar|krd)\\S*|nshty\\s+dar\\S*|mychk\\S*|chkh\\s+(?:my|dar|krd)\\S*|myryz\\S*|(?:ryzsh|ryzy)\\s+dar\\S*', '\\bnshty?\\s+(?:\\S+\\s+)?(?:rwghn|tyl|gazw|dyzl|swkht|ab|ddykh|adblw)\\S*(?=\\s|$)(?!\\s+(?:\\S+\\s+)?n)|\\b(?:rwghn|tyl|gazw\\S*?)\\s*ryzy\\S*(?=\\s|$)(?!\\s+(?:\\S+\\s+)?n)')],
  ['fire', /\batsh\s*(?:grft|gyrft|grfth|zd)\S*|\batshswz\S*|\b(?:kabyn|mwtwr|mashyn|kamywn|tryly|mwtr|bar|lastyk)\S*\s+(?:\S+\s+)?(?:myswz\S*|atsh\b)|\bdwd\s+(?:\S+\s+){0,2}(?:myad|myayd|blnd|byrwn|zd|grft)\S*/, /agzwz/],
  ['acc', /\btsadf\S*(?=\s|$)(?!\s+n)|\btsadm|\baksydnt|\btkr\s+(?:kd|krd|khwrd)\S*|\b(?:zdm|zdym|zd|khwrdm|khwrdym|malydm)\s+bh\s+|\bbh\s+(?:\S+\s+){0,2}(?:zdm|zdym|khwrdm|khwrdym|malydm)\b|\b(?:bhm|bh\s+mn|bh\s+ma)\s+(?:\S+\s+)?zd/],

  ['acc', /\bwazhgwn|\bchp\s+shd|\baz\s+jadh\s+(?:\S+\s+)?(?:mn7rf|khar[jg])/, /\bbar\b|palt|wazhgwn\s+nshd|(?:mn7rf|khar[jg])\s+n(?:shd|bwd|ymd)/],

  ['acc', /\b(?:aftad|aftadh|aftadym|aftadm|rft|rftym|rftm|lyz\s+khwrd|sr\s+khwrd)\s+(?:\S+\s+)?(?:tw|twy|dakhl|dr|bh)\s+(?:jwb|jwy|khndq|kanal|drh)\b|\b(?:tw|twy|dakhl|dr|bh)\s+(?:jwb|jwy|khndq|kanal|drh)\s+(?:\S+\s+)?(?:aftad|rft|lyz\s+khwrd|sr\s+khwrd)\S*|\b(?:kamywn|mashyn|mwtr|trylr|trayly|tryly|kshndh)\S*\s+(?:\S+\s+)?(?:tw|twy|dakhl|dr)\s+(?:jwy|khndq)\b/, /\bbar\b|palt|\bnyst\b|\bny?ftad|\bnrft|\bnkhwrd/],

  ['stuck', /\b(?:aftad|aftadh|aftadym|aftadm|rft|rftym|rftm|lyz\s+khwrd|sr\s+khwrd)\s+(?:\S+\s+)?(?:tw|twy|dakhl|dr|bh)\s+(?:jwb|jwy|khndq|kanal|drh)\b|\b(?:tw|twy|dakhl|dr|bh)\s+(?:jwb|jwy|khndq|kanal|drh)\s+(?:\S+\s+)?(?:aftad|rft|lyz\s+khwrd|sr\s+khwrd)\S*|\b(?:kamywn|mashyn|mwtr|trylr|trayly|tryly|kshndh)\S*\s+(?:\S+\s+)?(?:tw|twy|dakhl|dr)\s+(?:jwy|khndq)\b/, /\bbar\b|palt|\bnyst\b|\bny?ftad|\bnrft|\bnkhwrd/],
  ['injury', /\b(?:zkhmy|msdwm|mjrw7)|\basyb\s+dyd(?:m|ym)\b|\b(?:dstm|paym|srm)\s+(?:\S+\s+)?(?:bryd|zkhm)/],
  ['nostart', faRx('mwtwr|mwtr', 'kar\\s+nmy\\S*|(?:rwshn|ash?tart|chalan)\\s+(?:\\S+\\s+)?nmy\\S*|khamwsh\\s+(?:shd|my)\\S*', `\\b(?:${FA_ENG})\\S*\\s+(?:\\S+\\s+){0,3}(?:(?:rwshn|chalan)\\s+nmy\\S*|khamwsh\\s+(?:shd|my)\\S*)|\\b(?:rwshn|ash?tart|chalan)\\s+(?:\\S+\\s+)?nmy(?:shh|shwd|shd|zn|khwr|gyr)\\S*`), /\b(?:chragh|lamp|nwr\b|flashr|rahnma|bkhary|kwlr|hytr|wbstw|ykhchal|sf7h|nmayshgr|dwrbyn)/],
  ['engine', faRx('mwtwr|twrbw', 'dagh\\S*|jwsh\\s+awrd\\S*|sda\\S*\\s+(?:\\S+\\s+)?(?:my|dar)\\S*|(?:qdrt|kshsh)\\s+ndar\\S*|d3yf\\S*|khrab\\S*|mylrz\\S*|lrzsh\\S*|dwd\\s+my(?:knd|knh|kn)\\b|tq\\s*tq\\S*|ryp\\s+my\\S*', '\\bampr\\S*\\s+(?:\\S+\\s+)?(?:ab\\s+)?bala|\\bjwsh\\s+awrd\\S*|\\bagzwz\\S*\\s+(?:\\S+\\s+){0,2}dwd|\\bdwd\\s+(?:\\S+\\s+){0,2}(?:az\\s+)?agzwz|\\b(?:qdrt|kshsh)\\s+ndar\\S*'), new RegExp(`\\b(?:chragh|lamp)\\S*\\s+(?:\\S+\\s+)?${FA_WARN}`)],
  ['mirror', faRx('aynh|ayynh', 'shkst\\S*|trk(?!yd)\\S*|aftad\\S*|kndh\\s+sh\\S*|kj\\s+sh\\S*|lq\\b|lq\\s+sh\\S*|shl\\s+sh\\S*|D')],
  ['lights', faRx('chragh|lamp|nwr\\b|flashr|rahnma|nwrafkn', 'D|swkht\\S*|khamwsh\\b(?!\\s+nmy)|rwshn\\s+nmy\\S*|kar\\s+nmy\\S*'), new RegExp(`\\b(?:chragh|lamp)\\S*\\s+(?:\\S+\\s+)?(?:chk|mwtwr|hshdar|khta|abs|ebs|adblw|rwghn|dma|batry|srwys)|\\b(?:chragh|lamp)\\S*\\s+(?:\\S+\\s+)?(?:zrd|qrmz)\\S*\\s+(?:\\S+\\s+)?rwshn\\s+sh`)],
  ['warnlight', new RegExp(`\\b(?:chragh|lamp)\\S*\\s+(?:\\S+\\s+)?${FA_WARN}\\S*\\s+(?:\\S+\\s+)?(?:rwshn\\s+(?:sh|mand|mwnd|my|ast|h?st)|khamwsh\\s+nmy|chshmk)|\\b(?:khta|arwr|hshdar|pyghm)\\S*\\s+(?:\\S+\\s+){0,2}(?:rwy|dr|bh)\\s+(?:sf7h|nmayshgr|dashbwrd|kylwmtr|mnytwr)`)],
  ['glass', faRx('shysh', 'shkst\\S*|trk(?!yd)\\S*|sng\\s+khwrd\\S*|khrd\\s+sh\\S*', '\\bsng\\s+(?:\\S+\\s+)?(?:khwrd|zd|prt)\\S*\\s+(?:\\S+\\s+)?(?:bh\\s+)?shysh'), /balabr|bala\s+br|shwr/],
  ['window', faRx('shysh|pnjrh|balabr', '(?:bala|payyn|baz|bsth)\\s+nmy\\S*|gyr\\s+krd\\S*|kar\\s+nmy\\S*|khrab\\S*'), /shwr|brfpak|abpash/],
  ['batt', faRx('batry|btry|akw\\b|aky\\b', 'khaly\\S*|tmwm\\S*|tmam\\s+krd\\S*|khwabyd\\S*|khwab\\b|d3yf\\S*|sh?arzh?\\s+nmy\\S*|sharj\\s+nmy\\S*|ab\\s+krd\\S*|bad\\s+krd\\S*|D')],
  ['tacho', faRx('ta(?:kh|k|ch)w?gra?f|kart\\s+(?:rannd|shwfr|hwshmnd)', `D|${FA_LOSE}|shkst\\S*|nmykhw\\S*|khwndh\\s+nmy\\S*|qbwl\\s+nmy\\S*|khta\\S*`, '\\bgm\\s+kr\\S*\\s+(?:\\S+\\s+)?kart\\s+(?:rannd|hwshmnd)')],
  ['fuelcard', faRx('kart\\s+(?:swkht|bnzyn|gazw|tank)', `D|${FA_LOSE}|msdwd\\S*|bl[ao]?k\\S*|qbwl\\s+nmy\\S*|rd\\s+my\\S*`)],
  ['lost', faRx('klyd|swyych|swych|mdark|kart\\s+(?:mashyn|khwdrw)|sanad|snd\\b', `${FA_LOSE}|nyst\\b|pyda\\s+nmy\\S*`, '\\bgm\\s+kr\\S*\\s+(?:\\S+\\s+)?(?:klyd|swyych|mdark)')],
  ['coupling', faRx('tryly|trylr|chrkh\\s+pnjm|kfy\\b|kwplyng|shylng\\s+bad|shylngha', 'jda\\s+sh\\S*|(?:qfl|bsth|wsl)\\s+nmy\\S*|lq\\b|lq\\s+sh\\S*|dr\\s+rft\\S*'), /trmz/],
  ['dryfuel', /\b(?:swkht|gazw|bnzyn|dyzl|bak|tyl)\S*\s+(?:\S+\s+)?(?:tmam|tmwm|khlas|khaly)\S*(?=\s|$)(?!\s+(?:\S+\s+)?n)|\b(?:tmam|tmwm)\s+(?:krdm|krdym|shd)\s+(?:\S+\s+)?(?:swkht|gazw|bnzyn|dyzl)/, /kart|lastyk|batry/],
  ['reefer', faRx('ykhchal|srdkn|srdkhanh|ywnyt\\s+srd|trmwkyng|trmw\\s*kyng', 'D|(?:srd|khnk)\\s+nmy\\S*|khamwsh\\s+(?:sh|my)\\S*|grm\\s+sh\\S*', '\\bdma\\S*\\s+(?:\\S+\\s+)?ykhchal\\S*\\s+(?:\\S+\\s+)?bala')],
  ['susp', faRx('fnr|kmk\\s*fnr|balshtk|bad\\s*bnd|kysh\\s+bad|amrtysr', 'shkst\\S*|parh\\S*|trkyd\\S*|nsht\\S*|khwabyd\\S*|khaly\\b|bad\\s+(?:ndar|nmy)\\S*|swrakh\\S*|D', '\\b(?:kamywn|tryly|mashyn|kabyn|mwtr)\\S*\\s+(?:\\S+\\s+){0,2}(?:kj|yk\\s+(?:trf|smt)\\S*)\\s+(?:sh|ast|h?st|nshst|aftad)\\S*'), /sndly/],
  ['gear', faRx('gyrbks|gyrbaks|dndh|klach|klaj|klch|dyfrnsyl', 'D|ja\\s+nmy\\S*|dr\\s+my\\S*|gyr\\s+(?:my|krd)\\S*|sft\\S*|mylghz\\S*|sda\\S*\\s+(?:\\S+\\s+)?(?:my|dar)\\S*|bwy\\s+swkht\\S*|tq\\s*tq\\S*')],
  ['climate', faRx('bkhary|kwlr|hytr|wbstw|wbastw|dmndh|thwyh|klyma', 'D|(?:srd|grm|khnk|rwshn)\\s+nmy\\S*|bad\\s+(?:\\S+\\s+)?nmy\\S*|khamwsh\\s+my\\S*|gaz\\s+ndar\\S*'), /sndly/],
  ['cabkit', faRx('grmkn\\S*\\s+sndly|sndly\\s+grmkn', 'D|grm\\s+nmy\\S*')],
  ['tarp', faRx('chadr|brznt', 'parh\\S*|pary\\S*|swrakh\\S*|jr\\s+khwrd\\S*|kndh\\s+sh\\S*|ptr\\S*|bsth\\s+nmy\\S*|shl\\s+sh\\S*|D')],
  ['exhaust', faRx('agzwz|ekzwz', 'aftad\\S*|shkst\\S*|swrakh\\S*|sda\\S*\\s+(?:\\S+\\s+)?(?:my|dar)\\S*|lq\\b|lq\\s+sh\\S*|kndh\\s+sh\\S*|awyzan\\S*|D'), /dwd/],
  ['visib', faRx('brfpak|brf\\s+pak|tyghh?\\s+brf|abpash|ab\\s+pash|shyshhshwr|shyshh\\s+shwr', 'D|(?:pak|tmyz)\\s+nmy\\S*|parh\\S*|kndh\\s+sh\\S*|ab\\s+nmy\\S*|nmyzn\\S*|tkan\\s+nmy\\S*')],
  ['seat', faRx('sndly|kmrbnd|kmr\\s+bnd|syt\\b', 'D|shkst\\S*|parh\\S*|gyr\\s+krd\\S*|(?:qfl|bsth|baz|jlw|3qb|payyn|bala)\\s+nmy\\S*|lq\\b|lq\\s+sh\\S*|shl\\s+sh\\S*|bad\\s+ndar\\S*|khwabyd\\S*'), /grmkn/],
  ['wheel', faRx('mhrh|bwlt|pych\\s+chrkh|rwlmn|blbryng|bwlbryng|kardan|kardn|ryng|twpy', 'shl\\S*|lq\\b|lq\\s+sh\\S*|aftad\\S*|kndh\\s+sh\\S*|nyst\\b|sda\\S*\\s+(?:\\S+\\s+)?(?:my|dar)\\S*|dagh\\S*|gm\\s+sh\\S*|shkst\\S*|D', '\\bchrkh\\S*\\s+(?:\\S+\\s+){0,2}(?:shl|lq|dagh|sda\\s+my|mylrz|dr\\s+myr|aftad|kndh\\s+sh|qfl\\s+krd)\\S*'), /pnjm|pnchr/],
  ['stuck', /\b(?:tw|twy|dr)\s+(?:gl|brf|shn|chalh|jwb|lajn)\s+(?:\S+\s+)?(?:gyr\s+krd|gyr\s+aftad|frw\s*rft|mand|mwnd)\S*|\b(?:gl|shn|chalh|lajn)\s+(?:\S+\s+)?(?:gyr\s+krd|frw\s*rft)\S*|\bgyr\s+krd\S*\s+(?:tw|twy|dr)\s+(?:gl|brf|shn|chalh|jwb|lajn)\b/],
  ['numplate', faRx('plak', 'aftad\\S*|gm\\s+sh\\S*|gm\\b|shkst\\S*|kndh\\s+sh\\S*|khwana?\\s+nyst|khwndh\\s+nmy\\S*|nyst\\b|dzdyd\\S*|kj\\s+sh\\S*|D'), /chragh|lamp|nwr\b/],
  ['adas', faRx('dwrbyn|snswr|radar|rdar|dsthyar|lyn\\s*asyst', 'D|khta\\S*|khamwsh\\s+sh\\S*|tar\\b|tar\\s+sh\\S*|nmyby?n\\S*|(?:nshan|tswyr)\\s+nmy\\S*|syah\\s+sh\\S*')],
  ['door', new RegExp(`\\bdrb\\S*\\s+(?:\\S+\\s+){0,2}(?:${FA_D}|(?:baz|bsth|qfl)\\s+nmy\\S*|gyr\\s+krd\\S*|shkst\\S*|kndh\\s+sh\\S*|lq\\b)|\\bdr\\s+(?:(?:kabyn|ranndh|3qb|bar|kmprsy|ykhchal|knar)\\S*\\s+)?(?:baz|bsth|qfl)\\s+nmy\\S*|\\bqfl\\S*\\s+(?:\\S+\\s+){0,2}(?:${FA_D}|(?:baz|bsth)\\s+nmy\\S*|shkst\\S*|kndh\\s+sh\\S*|gyr\\s+krd\\S*)`), /chrkh\s+pnjm|kmrbnd|klyd|sndly/]];
function faKinds(v) { const k = new Set(); for (const raw of String(v || '').split(/[.,;!?\n،؛؟]+/)) { if (!/[ء-ۿ]/.test(raw)) continue; const p = faLat(raw).replace(FA_NEG, ' '); if (!FA_OK.test(p)) for (const [n, rx, ex] of FA_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); } if (k.has('acc')) k.delete('injury'); return k; }






const UZ_TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h' };
const uzFold = (s) => String(s || '').toLowerCase().replace(/[а-яёўқғҳ]/g, (c) => UZ_TR[c] ?? c).replace(/([og])[ʻʼ‘’'`´]/g, '$1');
const UZ_D = 'ishlama\\S*|buzil\\S*|buzuq\\S*|nosoz\\S*';
const UZ_SIN = 'sin(?:di|dir\\S*|gan|ib|iq)\\b\\S*';
const uzRx = (n, d, extra) => new RegExp(`\\b(?:${n})\\S*\\s+(?:\\S+\\s+){0,2}?(?:${d.split('@').join(UZ_D)})${extra ? '|' + extra : ''}`);
const UZ_OK = /\b(?:tuzat|tuzal|almashtir|yangila|sozla|remont\s+qil)\S*|\bsoz\b(?!\s+emas)|\b(?:yana|endi|qayta)\s+(?:\S+\s+)?(?:ishlay|yonyapti|yuryapti|ot\s+ol)\S*|\bhammasi\s+(?:\S+\s+)?(?:joyida|yaxshi|normal|soz|ok)\b|\bmuammo\S*\s+yoq\b|\bmuammosiz\b/;
const UZ_NEG = /\b(?:teshil|yoril|portla|sin|buzil|kuy|oq|uzil|yirtil|qiz|toqnash|uril|ur|yarala|tuga|osil|darz|egil|bot|ogirla|yoqol|yoqot|tiqil|tomchila)(?:ib\s+)?m[ae](?:gan|di|ydi|yapti|yabdi|yotgan|sa|y)\S*|\b\S+\s+emas\b|\bhech\s+(?:qanday\s+|narsa\s+)?\S+|\b(?:avariya|muammo|xato|tutun|shikast)siz\b/g;
const UZ_FIRE_N = 'kabina|motor|dvigatel|gildirak|shina|balon|ballon|mashina|yuk|pritsep|prisep|tirkama|simlar|provod';
const UZ_KINDS = [['brake', uzRx('tormoz|tormaz', '@|ushlama\\S*|tutma\\S*|yoq\\b|kuchsiz\\S*|zaif\\S*|ketib\\s+qol\\S*', '\\bhavo\\s+(?:\\S+\\s+)?(?:bosim\\S*\\s+)?(?:tush(?:yapti|ib|di)|ketyapti|chiqyapti)'), /\bqol\s+tormoz|\bel\s+tormoz|ruchnik|stoyanka|asistent|datchik|ozi\s+(?:\S+\s+)?tormoz|chiro|lampochka|indikator/],
  ['parkbrake', /\b(?:qol\s+tormoz\S*|ruchnik\S*)\s+(?:\S+\s+){0,2}?(?:ishlama|ushlama|tutma|buzil|buzuq)\S*|\bozi\s+(?:\S+\s+)?(?:yurib|dumalab|siljib)\s+ket\S*/],
  ['flat', uzRx('shina|balon|ballon|gildirak|koles|pokrishka', 'teshil\\S*|yoril\\S*|portla\\S*|dami\\s+chiq\\S*|havosi\\s+(?:chiq|ket|tush)\\S*|pachaq\\S*|prokol\\S*', '\\b(?:teshil|portla|yoril)\\S*\\s+(?:\\S+\\s+)?(?:shina|balon|ballon|gildirak)|\\bprokol\\s+bol\\S*'), /podushka|yostig|yostiq|tent/],
  ['tyre', uzRx('shina|balon|ballon|pokrishka|protektor', 'yeyil\\S*|kesil\\S*|shish\\S*|grija\\S*|gryja\\S*|tekis\\s+bol\\S*|siliq\\S*|darz\\S*'), /teshil|portla|yoril|dami\s+chiq|havosi/],

  ['flat', uzRx('shina|balon|ballon|pokrishka', '@'), /zapas|ehtiyot|podushka|yostig|yostiq|tent/],
  ['steer', uzRx('rul', '@|qattiq\\S*|ogir\\S*|aylanma\\S*|tiqil\\S*|qimirla\\S*|bush\\S*', '\\b(?:ongga|onga|chapga)\\s+(?:\\S+\\s+)?tort(?:yapti|ib|adi|ayapti|moqda)\\S*'), /podushka|xavfsizlik/],
  ['leak', uzRx('moy|maslo|solyarka|salyarka|dizel|yoqilgi|antifriz|tosol|sovutish\\s+suyuq|adblue|gidravlik', 'oq(?:yapti|ayapti|moqda|ib|di|yabdi)\\b|tomchila\\S*|tom(?:yapti|ib)\\b|siz(?:ib|yapti|moqda)\\b|ketyapti|ketib\\s+qolyapti', '\\b(?:oqyapti|oqib\\s+yotibdi)\\s+(?:\\S+\\s+)?(?:moy|solyarka|antifriz|dizel)'), /tugadi|tugab|qolmadi|chiroq|chirog|lampochka/],
  ['fire', uzRx(UZ_FIRE_N, 'yon(?:yapti|ayapti|ib\\s+ket\\S*|ib\\s+qol\\S*|moqda|di)\\b|olov\\S*', '\\byongin\\S*|\\b(?:tutun|dud)\\S*\\s+(?:\\S+\\s+)?(?:chiq|ket)\\S*|\\bolov\\s+(?:\\S+\\s+)?(?:chiq|ol)\\S*|\\bot\\s+ket(?:di|ib)\\b'), /glushitel|glushak|vyxlop|vixlop|truba|ochirgich|ognetush|chiro|lampochka|indikator|check|chek|panel|sigaret|chiqma/],
  ['acc', /\bavariya(?:ga|da|ni|si)?\s+(?:\S+\s+)?(?:uchradi|uchradim|uchradik|boldi|bolib|qildim|chiqdi)\b|\btoqnash\S*|\buril(?:di|dim|dik|ib)\b|\burib\s+(?:oldi|oldim|yubordim|ketdim|ketdi)\b|\btegib\s+ket(?:dim|di)\b/, /\btosh\b|shagal|qum\s+/],

  ['acc', /\bagdaril(?!ma)|\byoldan\s+chiq(?:ib|di|dim)|\bariqqa\s+(?:tush(?!ma)|agdar(?!ilma))/, /\byuk(?:lar|ni)?\b(?!\s+mashina)|palet|agdarilma/],

  ['acc', /\b(?:ariqq?a|zovurga|kanavaga)\s+(?:\S+\s+)?(?:tush(?!ma)|agdaril(?!ma)|kir(?!ma)|uchib|sirpanib|sirgalib)|\b(?:mashina|fura|kamaz|tir|furgon|avto|pritsep|tirkama)\S*\s+(?:\S+\s+)?(?:ariq|zovur|kanava)da\b/, /\byuk(?:lar|ni)?\b(?!\s+mashina)|palet/],

  ['stuck', /\b(?:ariqq?a|zovurga|kanavaga)\s+(?:\S+\s+)?(?:tush(?!ma)|agdaril(?!ma)|kir(?!ma)|uchib|sirpanib|sirgalib)|\b(?:mashina|fura|kamaz|tir|furgon|avto|pritsep|tirkama)\S*\s+(?:\S+\s+)?(?:ariq|zovur|kanava)da\b/, /\byuk(?:lar|ni)?\b(?!\s+mashina)|palet/],
  ['injury', /\byaralan(?:di|dim|gan|ib)\b|\bjarohat\S*|\btez\s+yordam\S*|\bkasalxona\S*|\bshifoxona\S*|\b(?:qol|oyog|bosh|bel|barmog)im\S*\s+(?:\S+\s+)?(?:kesib|kesil|sindi|sinib|lat\s+yedi|shikast)\S*/],
  ['nostart', /\bot\s+olma\S*|\bzavod\s+(?:bolma|olma)\S*|\bzavodga\s+tushma\S*|\bstarter\S*\s+(?:\S+\s+)?(?:ishlama|aylanma|buzil)\S*|\b(?:motor|dvigatel|mashina)\s+(?:umuman\s+)?(?:ishlama|yurma)\S*/, /agregat|xolodil|refrijerator|konditsioner|pechka|webasto|vebasto/],
  ['engine', uzRx('motor|dvigatel', 'qiz(?:ib|di|iyapti|yapti|moqda)\\b\\S*|isib\\s+ket\\S*|ochib\\s+qol\\S*|ochyapti|tortma\\S*|kuchsiz\\S*|kuchi\\s+yoq|taqilla\\S*|shovqin\\S*|gʻalati|galati', '\\b(?:kuch|moshchnost\\S*)\\s+yoq\\b|\\btortmayapti\\b|\\b(?:glushitel|glushak|vyxlop|vixlop|truba)\\S*\\s+(?:\\S+\\s+){0,2}?(?:(?:qora|oq|kok)\\s+)?(?:tutun|dud)|\\b(?:qora|kok)\\s+tutun\\s+(?:\\S+\\s+)?chiq\\S*|\\bavariya\\s+rejim\\S*|\\btemperatura\\S*\\s+(?:\\S+\\s+)?(?:kotaril|baland|oshib|oshdi)\\S*'), /agregat|xolodil|refrijerator|chiro|lampochka/],
  ['mirror', uzRx('kozgu|zerkal', UZ_SIN + '|buzil\\S*|uzil\\S*|osil\\S*|tushib\\s+ket\\S*|qopor\\S*', '\\b(?:sindi|sindirdim|sindirib\\s+\\S+)\\s+(?:\\S+\\s+)?(?:kozgu|zerkal)'), /isit|podogrev/],
  ['lights', uzRx('chiroq|chirog|fara|farlar|fonar|stop\\s+chiroq|povorot|gabarit|lampochka|lampa|avariyka', 'yonma\\S*|ishlama\\S*|kuy(?:di|ib|gan)\\S*|' + UZ_SIN + '|ochib\\s+qol\\S*', '\\b(?:kuydi|kuyib\\s+qoldi)\\s+(?:\\S+\\s+)?(?:lampochka|lampa|chiroq)'), /panel|ekran|displey|xato|oshibk|check|chek|motor\s+chiro|indikator/],
  ['warnlight', /\b(?:panel|ekran|displey|pribor)\S*\s+(?:\S+\s+){0,3}?(?:yon(?:yapti|ib|di|moqda)\b|chiq(?:di|yapti)\b|xato|oshibk)\S*|\b(?:check|chek|indikator|lampochka)\S*\s+(?:\S+\s+)?(?:yon(?:yapti|ib|di|moqda)|miltilla\S*|chiqdi|chiqyapti)\b|\b(?:xato|xatolik|oshibka)\S*\s+(?:\S+\s+)?(?:chiq|yon|kor|ber)\S*|\b(?:motor|dvigatel|moy|abs|ebs|adblue|akkumulyator|tormoz|qizil|sariq)\s+chiro(?:q|g)\S*\s+(?:\S+\s+)?yon(?:yapti|ib|di|moqda)\b/],
  ['glass', uzRx('lobovoy|oldingi\\s+oyna|old\\s+oyna|oyna|steklo|shisha', 'yoril\\S*|darz\\S*|' + UZ_SIN + '|treshchin\\S*|chatna\\S*|teshil\\S*', '\\btosh\\s+(?:\\S+\\s+){0,2}?(?:urildi|tegdi|tushdi|keldi)'), /kozgu|zerkal/],
  ['window', /\boyna\S*\s+(?:\S+\s+)?(?:tushma|kotarilma|ochilma|yopilma)\S*|\bsteklopod\S*\s+(?:\S+\s+)?(?:ishlama|buzil)\S*/],
  ['batt', uzRx('akkumulyator|akkumlyator|akkum|akum|batareya|akb', '@|otir\\S*|tugadi|tugab\\S*|zaryad\\S*\\s+(?:olma|ushlama|tutma)\\S*|boshab\\S*'), /chiro|lampochka|indikator/],
  ['tacho', /\b(?:taxograf|tahograf|tachograf)\S*\s+(?:\S+\s+){0,2}?(?:ishlama|buzil|buzuq|oqima|xato|kartani\s+(?:oqima|olma))\S*|\b(?:karta|kartochka)\S*\s+(?:\S+\s+){0,2}?(?:oqima|tiqilib|qolib\s+ket|chiqma|yoqol|yoqot|ogirla)\S*|\b(?:haydovchi|voditel)\S*\s+karta\S*\s+(?:\S+\s+)?(?:ishlama|buzil|yoqol|yoqot)\S*/, /yoqilgi|zapravka|toplivn|bank|plastik|benzin|dizel|solyarka|bonus/],
  ['fuelcard', /\b(?:yoqilgi|toplivn|zapravka|dizel|solyarka|benzin)\S*\s+karta\S*\s+(?:\S+\s+){0,2}?(?:ishlama|blok|otma|yoqol|yoqot|qabul\s+qilma|ogirla)\S*/],
  ['lost', uzRx('kalit|klyuch|texpasport|tex\\s+pasport|hujjat|dokument', 'yoqol\\S*|yoqot\\S*|topolma\\S*|topilma\\S*|ogirla\\S*', '\\b(?:yoqotdim|yoqotib\\s+qoydim)\\s+(?:\\S+\\s+)?(?:kalit|klyuch|hujjat|texpasport)'), /karta/],
  ['coupling', /\b(?:pritsep|prisep|polupritsep|tirkama)\S*\s+(?:\S+\s+){0,2}?(?:ulanma|ilinma|uzil|ajral|chiqib\s+ket)\S*|\b(?:sedelka|egar)\S*\s+(?:\S+\s+){0,2}?(?:ishlama|buzil|yopilma|ilinma|qulflanma)\S*/],
  ['dryfuel', /\b(?:solyarka|salyarka|yoqilgi|dizel|benzin|toplivo)\S*\s+(?:\S+\s+)?(?:tugadi|tugab|qolmadi|yoq\b)\S*|\bbak\S*\s+(?:\S+\s+)?(?:bosh|quruq)\b/, /agregat|xolodil|adblue|karta/],
  ['reefer', uzRx('xolodilnik|xolodil|refrijerator|refrejerator|agregat|sovutgich', '@|sovutma\\S*|ochib\\s+qol\\S*|xato\\S*|alarm\\S*|yoqilma\\S*'), /kabina|konditsioner/],
  ['susp', uzRx('podushka|havo\\s+yostig|yostiq|pnevmo|ressor|amortizator|ammortizator', 'yoril\\S*|teshil\\S*|portla\\S*|' + UZ_SIN + '|@|havo\\s+chiqar\\S*|tushib\\s+qol\\S*', '\\b(?:pritsep|prisep|tirkama|mashina)\\S*\\s+(?:\\S+\\s+)?(?:bir\\s+tomonga\\s+)?(?:qiyshay|egilib\\s+qol|ogib\\s+qol)\\S*'), /xavfsizlik|\brul\b/],
  ['gear', uzRx('peredacha|skorost|korobka|kpp|uzatma', 'tushma\\S*|qoshilma\\S*|ulanma\\S*|@|xato\\S*|kirma\\S*', '\\b(?:sseplenie|stseplenie|sepleniye|seplenie|mufta)\\S*\\s+(?:\\S+\\s+){0,2}?(?:ishlama|buzil|kuy|toyib|sirgan|sirpan)\\S*')],
  ['climate', uzRx('konditsioner|kondisioner|kondey|pechka|isitgich|webasto|vebasto|avtonomka|ventilyator', '@|isitma\\S*|sovutma\\S*|puflama\\S*|yoqilma\\S*'), /orindiq|sidenye|kozgu|zerkal|xolodil|agregat|refrijerator/],
  ['cabkit', /\b(?:orindiq|sidenye|kozgu|zerkal)\S*\s+(?:isitgich|isitish|podogrev)\S*\s+(?:\S+\s+)?(?:ishlama|buzil|isitma)\S*|\bpodogrev\S*\s+(?:\S+\s+)?(?:ishlama|buzil)\S*/],
  ['tarp', uzRx('tent', 'yirtil\\S*|yirtiq\\S*|teshil\\S*|teshik\\S*|uzil\\S*', '\\b(?:teshik|yirtiq)\\S*\\s+(?:\\S+\\s+)?tent')],
  ['exhaust', uzRx('glushitel|glushak|vyxlop|vixlop|vyhlop', 'tushib\\S*|osil\\S*|teshil\\S*|yoril\\S*|uzil\\S*|' + UZ_SIN + '|shovqin\\S*|@')],
  ['visib', uzRx('dvornik|tozalagich|shchetka|omyvatel|omivatel|stekloomivatel|bryzgovik', '@|tozalama\\S*|' + UZ_SIN + '|uzil\\S*|suv\\s+(?:sepma|berma|chiqma)\\S*', '\\boyna\\S*\\s+(?:\\S+\\s+)?terla\\S*')],
  ['seat', /\b(?:kamar|remen)\S*\s+(?:\S+\s+){0,2}?(?:taqilma|qadalma|ishlama|buzil|tiqil|yirtil)\S*|\b(?:orindiq|sidenye|kreslo)\S*\s+(?:\S+\s+){0,2}?(?:sin(?:di|gan|ib)|ishlama|buzil|qimirla|tushib\s+ket)\S*/, /isit|podogrev/],
  ['wheel', /\b(?:gayka|bolt)\S*\s+(?:\S+\s+){0,2}?(?:boshab|bosha|yoq\b|tushib|chiqib|yechil)\S*|\bdisk\S*\s+(?:\S+\s+)?(?:yoril|darz|egil|sin(?:di|gan|ib))\S*|\b(?:podshipnik|stupitsa|stupisa|gupchak)\S*\s+(?:\S+\s+){0,2}?(?:qiz|ishlama|buzil|shovqin|gudilla|ovoz)\S*|\b(?:kardan|reduktor)\S*\s+(?:\S+\s+){0,2}?(?:ishlama|buzil|shovqin|taqilla)\S*/, /tormoz/],
  ['stuck', /\b(?:loy|botqoq|qor|qum)\S*\s+(?:\S+\s+){0,2}?(?:botib\s+qol|tiqilib\s+qol|qolib\s+ket|botdi|botdim)\S*|\bbotib\s+qol\S*/],
  ['numplate', uzRx('nomer|davlat\\s+raqam|raqam', 'tushib\\S*|yoqol\\S*|ogirla\\S*|uzil\\S*|' + UZ_SIN + '|korinma\\S*|oqilma\\S*'), /chiro|lampochka|telefon|\btel\b|karta|podsvet/],
  ['adas', uzRx('datchik|sensor|radar|kamera|asistent|kruiz|tempomat', '@|xato\\S*|ochib\\s+qol\\S*', '\\bozi\\s+(?:\\S+\\s+)?tormoz\\s+(?:ber|bos)\\S*')],
  ['door', uzRx('eshik|dver|gidrobort|zamok|markaziy\\s+qulf', 'yopilma\\S*|ochilma\\S*|qulflanma\\S*|tiqil\\S*|@|ochilib\\s+ket\\S*|kotarilma\\S*|tushma\\S*'), /oyna/]];
function uzKinds(v) { const k = new Set(); for (const raw of String(v || '').split(/[.,;!?\n]+/)) { if (!/[a-zа-яёўқғҳ]/i.test(raw)) continue; const p = uzFold(raw).replace(UZ_NEG, ' '); if (!UZ_OK.test(p)) for (const [n, rx, ex] of UZ_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); } if (k.has('acc')) k.delete('injury'); return k; }






const azFold = (s) => String(s || '').toLowerCase().replace(/\u0307/g, '').replace(/[əä]/g, 'e').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ş|sh/g, 's').replace(/ç|ch/g, 'c').replace(/ğ|gh/g, 'g').replace(/[ʻʼ‘’'`´-]/g, ' ');
const AZ_D = 'isleme\\S*|islemir\\S*|xarab\\S*|nasaz\\S*|siradan\\s+cix\\S*';
const AZ_SIN = 'sin(?:di|ib|iq|dir|mis)\\b\\S*|qiril(?:di|ib|mis)\\S*';
const azRx = (n, d, extra) => new RegExp(`\\b(?:${n})\\S*\\s+(?:\\S+\\s+){0,2}?(?:${d.split('@').join(AZ_D)})${extra ? '|' + extra : ''}`);
const AZ_OK = /\b(?:duzeldil|duzeldi|temir\s+(?:olundu|edildi|olunub|edilib|etdiler|etdim)|deyisdiril|deyisdirdi|deyisdik|yenilendi)\S*|\b(?:yene|artiq|tezeden)\s+(?:\S+\s+)?(?:isleyir|yanir|gedir|ise\s+dusur)\b|\bher\s+sey\s+(?:\S+\s+)?(?:qaydasindadir|qaydasinda|yaxsidir|normaldir|ok)\b|\bproblem\S*\s+yoxdur\b|\bnasazliq\s+yoxdur\b/;
const AZ_NEG = /\b\S+\s+deyil\S*|\bhec\s+(?:bir\s+|ne\s+)?\S+|\b(?:qeza|problem|xeta|tustu|zede|nasazliq)s[iu]z\b/g;
const AZ_FIRE_N = 'kabin|muherrik|motor|teker|masin|yuk|qosqu|pritsep|naqil|provod|tent';
const AZ_KINDS = [['brake', azRx('eylec|tormoz', '@|tutmur\\S*|saxlamir\\S*|yoxdur|zeif\\S*|getdi\\b|getmir\\S*', '\\bhava\\s+(?:tezyiq\\S*\\s+)?(?:dusur|dusdu|gedir|cixir|tutmur)\\b'), /\bel\s+eylec|rucnik|datcik|ozu\s+(?:\S+\s+)?eylec|lampa|indikator|isiq/],
  ['parkbrake', /\b(?:el\s+eylec\S*|rucnik\S*)\s+(?:\S+\s+){0,2}?(?:isleme|islemir|tutmur|saxlamir|xarab)\S*|\b(?:oz\s+ozune|ozbasina)\s+(?:\S+\s+)?(?:getdi|diyirlendi|surusdu|yurudu)\b/],
  ['flat', azRx('teker|sin(?:ler|i|in|lerin)?(?![a-z])|balon|kolyos|pokriska', 'partla(?:di|yib|yibdi|mis)\\b|desil\\S*|havasi\\s+(?:cix|get|dus)\\S*|yatib\\b|yatdi\\b|prokol\\S*', '\\bprokol\\s+(?:oldu|olub)\\b|\\b(?:partladi|desildi)\\s+(?:\\S+\\s+)?(?:teker|sin\\b)'), /podus|yastiq|tent/],
  ['tyre', azRx('teker|sin(?:ler|i|in|lerin)?(?![a-z])|protektor|pokriska', 'yeyil\\S*|kesil\\S*|sisib\\S*|qabar\\S*|hamarla\\S*|cat(?:la\\S*|\\s+var)'), /partla|desil|havasi|prokol/],

  ['flat', azRx('sin(?:ler|i|in|lerin)?(?![a-z])|pokriska', '@'), /ehtiyat|zapas|olmay|olmad|podus|yastiq|tent/],
  ['steer', azRx('sukan|rul', '@|agir\\S*|berk\\S*|firlanmir\\S*|oynayir\\S*|ilis\\S*', '\\b(?:saga|sola)\\s+(?:\\S+\\s+)?cek(?:ir|ib|di)\\b'), /tehlukesizlik|podus/],
  ['leak', azRx('yag|maslo|solyarka|dizel|yanacaq|antifriz|tosol|soyuducu\\s+maye|adblue|hidravlik|gidravlik', 'ax(?:ir|di|ib|idir)\\b|siz(?:ir|di|ib)\\b|damcila\\S*|damir\\b|tokul(?:ur|ub|du)\\b|gedir\\b', '\\bax(?:ir|ib)\\s+(?:\\S+\\s+)?(?:yag|solyarka|antifriz|dizel)'), /qurtar|bitdi|qalmadi|lampa|isiq|indikator|kart/],
  ['fire', azRx(AZ_FIRE_N, 'yan(?:ir|di|ib\\s+(?:gedir|getdi))\\b|alis(?:di|ib|ir)\\b|od\\s+tut\\S*', '\\byangin\\S*|\\btustu\\S*\\s+(?:\\S+\\s+)?(?:cix|gel)\\S*|\\bod\\s+(?:tutdu|tutub|aldi)\\b|\\balov\\S*'), /egzoz|qlusitel|glusitel|vixlop|vyxlop|truba|sondurucu|ognetus|lampa|isiq|indikator|check|cek|panel|siqaret/],
  ['acc', /\bqeza(?:ya|da|ni|si)?\s+(?:\S+\s+)?(?:dusdum|dusduk|dusdu|oldu|oldum|etdim|etdi|elemisem|eledim)\b|\btoqqus\S*|\bvurdum\b|\bvurdu\b|\bvurub\s+(?:qacdi|getdi)\b|\bdeydim\b|\bcirpil(?:di|dim)\b/, /\bdas\b|cinqil|rejim|\bhava\s+vur/],

  ['acc', /\b(?:masin|tir|kamaz|furgon|qosqu)\S*\s+(?:\S+\s+)?(?:asdi|asib)\b|\bcevril(?:di|ib)\b|\byoldan\s+cix(?:di|dim|dig|ib)|\bxendey\S*\s+(?:dus(?!me)|yuvarlan(?!ma))/, /\byuk(?:ler|u)?\b(?!\s+masin)|palet|asmadi|cevrilmedi/],

  ['acc', /\b(?:xendey\S*|kanavaya)\s+(?:\S+\s+)?(?:dus(?!me)|yuvarlan(?!ma)|gir(?!me)|surus(?!me))|\barxa\s+(?:dus(?!me)|yuvarlan(?!ma))|\b(?:masin|tir|kamaz|furgon|qosqu|avto|pritsep)\S*\s+(?:\S+\s+)?(?:xendekde|kanavada)(?:dir)?\b/, /\byuk(?:ler|u)?\b(?!\s+masin)|palet/],

  ['stuck', /\b(?:xendey\S*|kanavaya)\s+(?:\S+\s+)?(?:dus(?!me)|yuvarlan(?!ma)|gir(?!me)|surus(?!me))|\barxa\s+(?:dus(?!me)|yuvarlan(?!ma))|\b(?:masin|tir|kamaz|furgon|qosqu|avto|pritsep)\S*\s+(?:\S+\s+)?(?:xendekde|kanavada)(?:dir)?\b/, /\byuk(?:ler|u)?\b(?!\s+masin)|palet/],
  ['injury', /\byaralan(?:di|dim|ib|mis)\b|\bzede\s+(?:aldi|aldim|alib)\b|\btecili\s+yardim\S*|\bxestexana\S*|\b(?:el|ayag|bas|bel|barmag)im\S*\s+(?:\S+\s+)?(?:kesildi|kesdim|sindi|zedelendi|ezildi)\b/],
  ['nostart', /\bise\s+dusmur\S*|\bise\s+salmaq\s+olmur\b|\bstart\s+(?:vermir|almir|olmur)\b|\bstarter\S*\s+(?:\S+\s+)?(?:isleme|islemir|firlanmir|xarab)\S*|\b(?:muherrik|motor|masin)\s+(?:umumiyyetle\s+)?(?:islemir|islemeyir|islemedi|getmir)\b/, /aqreqat|xolodil|refrijerator|kondisioner|kondisoner|pec\b|webasto|vebasto|soyuducu/],
  ['engine', azRx('muherrik|motor', 'qiz(?:ib|di|ir|masi)\\b\\S*|dartmir\\S*|gucu\\s+(?:yoxdur|azdir)|zeif\\S*|taqqilda\\S*|ses\\s+(?:salir|verir)\\S*|qeribe\\s+ses\\S*', '\\b(?:guc|mosnost\\S*)\\s+yoxdur\\b|\\bdartmir\\b|\\b(?:egzoz|qlusitel|glusitel|vixlop|vyxlop|truba)\\S*\\s+(?:\\S+\\s+){0,2}?(?:(?:qara|ag|goy)\\s+)?tustu|\\b(?:qara|goy)\\s+tustu\\s+(?:\\S+\\s+)?cix\\S*|\\bqeza\\s+rejim\\S*|\\btemperatur\\S*\\s+(?:\\S+\\s+)?(?:qalx|yuksel|artir|artdi)\\S*'), /aqreqat|xolodil|refrijerator|lampa|isiq|indikator/],
  ['mirror', azRx('guzgu|zerkal', AZ_SIN + '|xarab\\S*|qop(?:du|ub)\\S*|sallan\\S*|dus(?:du|ub)\\b', '\\b(?:sindi|sindirdim)\\s+(?:\\S+\\s+)?(?:guzgu|zerkal)'), /qizdir|isidic|podogrev|podoqrev/],
  ['lights', azRx('isiq|isig|fara|faralar|fonar|stop\\s+isig|povorot|qabarit|gabarit|lampoc|lampa\\b', 'yanmir\\S*|yanmayir\\S*|@|' + AZ_SIN + '|sonub\\b|sondu\\b', '\\b(?:lampoc\\S*|lampa)\\s+(?:\\S+\\s+)?yan(?:ib|ib\\s+gedib)\\b'), /panel|ekran|displey|xeta|sehv|check|cek|muherrik\s+lampa|motor\s+lampa|indikator/],
  ['warnlight', /\b(?:panel|ekran|displey|pribor)\S*\s+(?:\S+\s+){0,3}?(?:yan(?:ir|di|ib)\b|cix(?:di|ir)\b|xeta|sehv|osibk)\S*|\b(?:check|cek|indikator|lampa)\S*\s+(?:\S+\s+)?(?:yan(?:ir|di)|yanib\s+sonur|yanib\s+qalib|cixdi|cixir)\b|\b(?:xeta|sehv|osibka)\S*\s+(?:\S+\s+)?(?:cix|ver|gos|yan)\S*|\b(?:muherrik|motor|yag|abs|ebs|adblue|akkumulyator|eylec|qirmizi|sari)\s+lampa\S*\s+(?:\S+\s+)?yan(?:ir|di|ib)\b/],
  ['glass', azRx('lobovoy|on\\s+suse|suse|steklo', 'catla\\S*|cat\\s+var|cat\\s+dus\\S*|' + AZ_SIN + '|tresin\\S*|desil\\S*', '\\bdas\\s+(?:\\S+\\s+){0,2}?(?:deydi|dusdu|gelib\\s+deydi|vurdu)'), /guzgu|zerkal|silen|dvornik|pencere\s+\S+\s+(?:dusmur|qalxmir)/],
  ['window', /\b(?:pencere|suse)\S*\s+(?:\S+\s+)?(?:dusmur|qalxmir|acilmir|baglanmir)\S*|\bsteklopod\S*\s+(?:\S+\s+)?(?:isleme|islemir|xarab)\S*/],
  ['batt', azRx('akkumulyator|akkumlyator|akkum|akum|batareya|akb', '@|otur(?:ub|du)\\S*|bosal\\S*|doldurmur\\S*|sarj\\s+(?:almir|saxlamir)\\S*|zeif\\S*|bitib\\b'), /lampa|isiq|indikator/],
  ['tacho', /\b(?:taxoqraf|taxograf|tachograf|taxoqrav)\S*\s+(?:\S+\s+){0,2}?(?:isleme|islemir|xarab|oxumur|xeta|karti\s+(?:oxumur|qebul\s+etmir))\S*|\b(?:kart|kartoc)\S*\s+(?:\S+\s+){0,2}?(?:oxunmur|oxumur|ilisib|qalib|cixmir|itdi|itib|itirdim|ogurlan)\S*|\b(?:surucu|voditel)\S*\s+kart\S*\s+(?:\S+\s+)?(?:isleme|islemir|xarab|itdi|itirdim)\S*/, /yanacaq|zapravka|toplivn|bank|plastik|benzin|dizel|solyarka|bonus/],
  ['fuelcard', /\b(?:yanacaq|toplivn|zapravka|dizel|solyarka|benzin)\S*\s+kart\S*\s+(?:\S+\s+){0,2}?(?:isleme|islemir|blok|kecmir|itdi|itib|itirdim|qebul\s+olunmur|ogurlan)\S*/],
  ['lost', azRx('acar|klyuc|texpasport|tex\\s+pasport|sened|dokument', 'itdi\\b|itib\\b|itirdim\\S*|tapa\\s+bilmir\\S*|tapilmir\\S*|ogurlan\\S*', '\\bitirdim\\s+(?:\\S+\\s+)?(?:acar|klyuc|sened|texpasport)'), /kart/],
  ['coupling', /\b(?:qosqu|yarimqosqu|pritsep|pricep|polupritsep)\S*\s+(?:\S+\s+){0,2}?(?:qosulmur|ilismir|ayrildi|ayrilib|qopdu|qopub|acildi)\S*|\b(?:sedelka|yeher)\S*\s+(?:\S+\s+){0,2}?(?:isleme|islemir|xarab|baglanmir|kilidlenmir|tutmur)\S*/],
  ['dryfuel', /\b(?:solyarka|yanacaq|dizel|benzin|toplivo)\S*\s+(?:\S+\s+)?(?:qurtardi|qurtarib|bitdi|bitib|qalmadi|yoxdur)\b|\bbak\S*\s+(?:\S+\s+)?bos(?:dur|du|alib)?\b/, /aqreqat|xolodil|adblue|kart/],
  ['reefer', azRx('xolodilnik|xolodil|refrijerator|refrejerator|aqreqat|soyuducu(?!\\s+maye)', '@|soyutmur\\S*|soyutmayir\\S*|qizir\\b|xeta\\S*|alarm\\S*|yanmir\\S*'), /kabin|kondisioner|kondisoner/],
  ['susp', azRx('podus|pnevmoyastiq|hava\\s+yastig|yastiq|ressor|amortizator|amortizator\S*', 'partla\\S*|desil\\S*|' + AZ_SIN + '|@|hava\\s+burax\\S*|yatib\\b|dusub\\b', '\\b(?:qosqu|pritsep|yarimqosqu|masin)\\S*\\s+(?:\\S+\\s+)?(?:bir\\s+terefe\\s+)?(?:eyil|eyri\\s+dur|yatib)\\S*'), /tehlukesizlik|\brul\b|sukan/],
  ['gear', azRx('suret|peredac|skorost|karobka|korobka|kpp|oturme\\s+qutu|oturucu', 'girmir\\S*|qosulmur\\S*|@|xeta\\S*|dusmur\\S*', '\\b(?:debriyaj|scepleniye|sceplenie|sepleniye|seplenie|mufta)\\S*\\s+(?:\\S+\\s+){0,2}?(?:isleme|islemir|xarab|yanib|surusur|tutmur)\\S*'), /isiq|lampa/],
  ['climate', azRx('kondisioner|kondisoner|kondey|pec|qizdirici|webasto|vebasto|avtonomka|ventilyator', '@|qizdirmir\\S*|soyutmur\\S*|ufurmur\\S*|yanmir\\S*'), /oturacaq|kreslo|guzgu|zerkal|xolodil|aqreqat|refrijerator/],
  ['cabkit', /\b(?:oturacaq|kreslo|guzgu|zerkal)\S*\s+(?:qizdiric|isidic|podogrev|podoqrev)\S*\s+(?:\S+\s+)?(?:isleme|islemir|xarab|qizdirmir)\S*|\b(?:podogrev|podoqrev)\S*\s+(?:\S+\s+)?(?:isleme|islemir|xarab)\S*/],
  ['tarp', azRx('tent', 'ciril\\S*|ciriq\\S*|desil\\S*|desik\\S*|qop(?:du|ub)\\S*', '\\b(?:desik|ciriq)\\S*\\s+(?:\\S+\\s+)?tent')],
  ['exhaust', azRx('egzoz|qlusitel|glusitel|vixlop|vyxlop', 'dus(?:du|ub)\\S*|sallan\\S*|desil\\S*|catla\\S*|qop(?:du|ub)\\S*|' + AZ_SIN + '|ses\\s+(?:salir|verir)\\S*|@'), /tustu/],
  ['visib', azRx('dvornik|silen|suse\\s+silen|yuyucu|scotka|omivatel|omyvatel', '@|silmir\\S*|' + AZ_SIN + '|qop(?:du|ub)\\S*|su\\s+(?:vurmur|vermir|cixmir)\\S*', '\\b(?:suse|pencere)\\S*\\s+(?:\\S+\\s+)?terle(?:yir|yib|di)\\b')],
  ['seat', /\b(?:kemer|remen)\S*\s+(?:\S+\s+){0,2}?(?:baglanmir|taxilmir|isleme|islemir|xarab|ilis|ciril)\S*|\b(?:oturacaq|kreslo|sidenye)\S*\s+(?:\S+\s+){0,2}?(?:sin(?:di|ib)|isleme|islemir|xarab|terpenir|oynayir|dus(?:du|ub))\S*/, /qizdir|isidic|podogrev|podoqrev/],
  ['wheel', /\b(?:qayka|bolt)\S*\s+(?:\S+\s+){0,2}?(?:bosal|yoxdur|dus(?:du|ub)|cixib|acilib)\S*|\bdisk\S*\s+(?:\S+\s+)?(?:catla|eyil|sin(?:di|ib))\S*|\b(?:podsipnik|stupitsa|stupica|gupcek)\S*\s+(?:\S+\s+){0,2}?(?:qiz|isleme|islemir|xarab|ugulda|ses)\S*|\b(?:kardan|reduktor)\S*\s+(?:\S+\s+){0,2}?(?:isleme|islemir|xarab|ses|taqqilda)\S*/, /eylec|tormoz/],
  ['stuck', /\b(?:palciq|batdaq|qar|qum)\S*\s+(?:\S+\s+){0,2}?(?:batib\s+qal|ilisib\s+qal|batdi|batdim|batmisam)\S*|\bbatib\s+qal(?:di|dim|mis|misam)\b/],
  ['numplate', azRx('nomre|dovlet\\s+nisan', 'dus(?:du|ub)\\S*|itdi\\b|itib\\b|ogurlan\\S*|qop(?:du|ub)\\S*|' + AZ_SIN + '|gorunmur\\S*|oxunmur\\S*'), /isiq|lampa|telefon|\btel\b|kart|podsvet/],
  ['adas', azRx('datcik|sensor|radar|kamera|assistent|asistent|kruiz|tempomat', '@|xeta\\S*|sonub\\b|sondu\\b', '\\bozu\\s+(?:\\S+\\s+)?eylec\\s+(?:edir|basir|verir|etdi|basdi)\\b')],
  ['door', azRx('qapi|dver|hidrobort|gidrobort|qifil|zamok|merkezi\\s+kilid', 'baglanmir\\S*|acilmir\\S*|kilidlenmir\\S*|ilis\\S*|@|acilib\\s+get\\S*|qalxmir\\S*|dusmur\\S*'), /pencere|suse/]];
function azKinds(v) { const k = new Set(); for (const raw of String(v || '').split(/[.,;!?\n]+/)) { if (!/[a-zəıöüşçğ]/i.test(raw)) continue; const p = azFold(raw).replace(AZ_NEG, ' '); if (!AZ_OK.test(p)) for (const [n, rx, ex] of AZ_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); } if (k.has('acc')) k.delete('injury'); return k; }






const KZ_TR = { а: 'a', ә: 'a', б: 'b', в: 'v', г: 'g', ғ: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', і: 'i', к: 'k', қ: 'q', л: 'l', м: 'm', н: 'n', ң: 'n', о: 'o', ө: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ұ: 'u', ү: 'u', ф: 'f', х: 'h', һ: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
const kzFold = (s) => String(s || '').toLowerCase().replace(/̇/g, '').replace(/[а-яёәғқңөұүһі]/g, (c) => KZ_TR[c] ?? c).replace(/ä/g, 'a').replace(/ğ/g, 'g').replace(/ñ/g, 'n').replace(/ö/g, 'o').replace(/[ūü]/g, 'u').replace(/ş/g, 'sh').replace(/ç/g, 'ch').replace(/ı/g, 'y').replace(/zh/g, 'j').replace(/kh|x/g, 'h').replace(/[ʻʼ‘’'`´-]/g, ' ');
const KZ_D = 'istemey\\S*|isten\\s+shyq\\S*|buzyl\\S*|buzyq\\S*|rabotat\\s+etpey\\S*';
const KZ_SIN = 'syn(?:dy|yp|gan|yq)\\b\\S*';
const kzRx = (n, d, extra) => new RegExp(`\\b(?:${n})\\S*\\s+(?:\\S+\\s+){0,2}?(?:${d.split('@').join(KZ_D)})${extra ? '|' + extra : ''}`);
const KZ_OK = /\b(?:jondel|jondep|jondedi|auystyryl|auystyrdy)\S*|\b(?:qaytadan|qayta|qazir|endi)\s+(?:\S+\s+)?(?:istep\s+tur|isteydi|janyp\s+tur|jurip\s+tur|otalady|ot\s+alady)\b|\bbari\s+(?:\S+\s+)?(?:durys|jaqsy|qalypty|normal|ok)\b|\b(?:problema|masele|aqau)\S*\s+joq\b/;
const KZ_NEG = /\b\S+\s+emes\b|\besh\s+(?:qanday\s+|bir\s+|narse\s+)?\S+|\b\S+(?:gan|gen|qan|ken)\s+jo[qk]\b|\b(?:apat|avariya|problema|masele|aqau|tutin|jaraqat)s[yi]z\b/g;
const KZ_FIRE_N = 'kabina|qozgaltqysh|motor|dongelek|dongalaq|shina|kolik|mashina|juk|tirkeme|pritsep|sym|provod|tent';
const KZ_KINDS = [['brake', kzRx('tejegish|tormoz|tormaz', '@|ustamay\\S*|joq\\b|alsyz\\S*|ketip\\s+qal\\S*', '\\baua\\s+(?:\\S+\\s+)?(?:qysym\\S*\\s+)?(?:tusip|tusti|ketip)\\b'), /\bqol\s+tejeg|ruchnik|ozi\s+(?:\S+\s+)?tejey|datchik|sham|lampoch|indikator/],
  ['parkbrake', /\b(?:qol\s+tejegish|ruchnik)\S*\s+(?:\S+\s+){0,2}?(?:istemey|ustamay|buzyl)\S*|\b(?:ozdiginen|oz\s+ozinen)\s+(?:\S+\s+)?(?:jurip\s+ketti|domalap\s+ketti|jyljyp\s+ketti)\b/],
  ['flat', kzRx('dongelek|dongalaq|shina|balon|ballon|koles|pokryshk', 'jaryl(?:dy|yp|ypty|gan)\\b|tesil(?:di|ip|ipti|gen)\\b|auasy\\s+(?:shyg|ket|tus)\\S*|prokol\\S*', '\\bprokol\\s+(?:boldy|bolyp)\\S*|\\b(?:jaryldy|tesildi)\\s+(?:\\S+\\s+)?(?:dongelek|shina|balon)'), /podushka|jastyq|tent/],
  ['tyre', kzRx('dongelek|shina|protektor|pokryshk|rezina', 'toz(?:dy|yp|gan)\\S*|kesil\\S*|isin(?:ip|di|gen)\\S*|jaryqshaq\\S*|tegis\\s+bol\\S*'), /jaryl|tesil|auasy|prokol/],

  ['flat', kzRx('shina|balon|ballon|pokryshk', '@'), /zapas|qosalq|podushka|jastyq|tent/],
  ['steer', kzRx('rul|rol(?!ik)', '@|auyr\\S*|qatty\\S*|aynalmay\\S*|kepti\\S*|solqyl\\S*', '\\b(?:onga|solga)\\s+(?:\\S+\\s+)?tart(?:ady|yp|ty)\\b'), /podushka|qauipsizdik/],
  ['leak', kzRx('may|maslo|solyarka|dizel|janarmay|otyn|antifriz|tosol|salqyndatqysh\\s+suyyq|adblue|gidravlik', 'ag(?:yp|ady|ypty)\\b|aqty\\b|tamshyla\\S*|tamyp\\b|syzyp\\b|ketip\\s+jatyr', '\\bagyp\\s+(?:jatyr|tur)\\s+(?:\\S+\\s+)?(?:may|solyarka|antifriz|dizel)'), /bitti|tausyl|qalmady|sham|lampoch|indikator|karta/],
  ['fire', kzRx(KZ_FIRE_N, 'jan(?:yp\\s+(?:jatyr|ketti|tur)|dy|ypty)\\b|ort\\s+(?:shyq|shyg|ald)\\S*|tutin\\S*\\s+(?:\\S+\\s+)?(?:shyg|bur)\\S*', '\\bort\\s+(?:shyq|shyg|ket|ald)\\S*|\\borten\\S*|\\btutin\\S*\\s+(?:\\S+\\s+)?(?:shyg|bur)\\S*'), /glushitel|vyhlop|shygaru|sondirgish|ognetush|sham|lampoch|indikator|check|chek|panel|siga/],
  ['acc', /\b(?:apat|avariya)\S*\s+(?:\S+\s+)?(?:tustim|tustik|tusti|boldy|jasadym|jasadyq)\b|\bsoqtyg\S*|\bsogyp\s+(?:aldym|aldy|kettim|ketti)\b|\bsoqtym\b|\bqagyp\s+(?:aldym|ketti|kettim)\b/, /\btas\b|rejim/],

  ['acc', /\baudaryl(?!ma)|\bjoldan\s+(?:\S+\s+)?shyg(?:yp|ty|tym)|\bor(?:ga|ge)\s+(?:tus|kul)/, /\bjuk(?:ter|ti)?\b(?!\s+(?:koligi|mashina|tasuu|tashuu))|audarylma/],

  ['acc', /\b(?:aryqqa|orga|kanavaga|jyraga)\s+(?:\S+\s+)?(?:tus(?!pe)|kul(?!ama)|audaryl(?!ma)|kirip)|\b(?:mashina|kolik|fura|kamaz|tir|avto|pritsep)\S*\s+(?:\S+\s+)?(?:aryqta|kanavada)\b/, /\bjuk(?:ter|ti)?\b(?!\s+(?:koligi|mashina|tasuu|tashuu))|palet/],

  ['stuck', /\b(?:aryqqa|orga|kanavaga|jyraga)\s+(?:\S+\s+)?(?:tus(?!pe)|kul(?!ama)|audaryl(?!ma)|kirip)|\b(?:mashina|kolik|fura|kamaz|tir|avto|pritsep)\S*\s+(?:\S+\s+)?(?:aryqta|kanavada)\b/, /\bjuk(?:ter|ti)?\b(?!\s+(?:koligi|mashina|tasuu|tashuu))|palet/],
  ['injury', /\bjaralan(?:dym|dy|yp|gan)\b|\bjaraqat\s+(?:aldym|aldy|alyp)\b|\bjedel\s+jardem\S*|\bauruhana\S*|\b(?:qol|ayag|bas|bel|sausag)ym\S*\s+(?:\S+\s+)?(?:kesildi|kesip\s+aldym|syndy|jaraqattandy|qysylyp\s+qaldy)\b/],
  ['nostart', /\bot\s+almay\S*|\botalmay\S*|\biske\s+qosylmay\S*|\bstarter\S*\s+(?:\S+\s+)?(?:istemey|aynalmay|buzyl)\S*|\b(?:qozgaltqysh|motor|mashina|kolik)\s+(?:mulde\s+)?(?:qosylmay|jurmey)\S*/, /agregat|tonazyt|holodil|refrijerator|konditsioner|pesh|webasto|vebasto|jylytqysh/],
  ['engine', kzRx('qozgaltqysh|motor|dvigatel', 'qyz(?:yp|dy|ady)\\b\\S*|tartpay\\S*|kushi\\s+(?:joq|az)|alsyz\\S*|tyqylda\\S*|bogde\\s+dybys\\S*|dybys\\s+(?:shyg|ber)\\S*|shuylda\\S*', '\\btartpaydy\\b|\\b(?:glushitel|vyhlop|shygaru\\s+qubyr)\\S*\\s+(?:\\S+\\s+){0,2}?(?:(?:qara|aq|kok)\\s+)?tutin|\\b(?:qara|kok)\\s+tutin\\s+(?:\\S+\\s+)?shyg\\S*|\\b(?:avariya|apattyq)\\s+rejim\\S*|\\btemperatura\\S*\\s+(?:\\S+\\s+)?(?:koteril|joglar)\\S*'), /agregat|tonazyt|holodil|refrijerator|sham|lampoch|indikator/],
  ['mirror', kzRx('ayna(?!l)|zerkal', KZ_SIN + '|uzil\\S*|julyn\\S*|tusip\\s+(?:qal|ket)\\S*|salbyra\\S*|@', '\\b(?:syndyrdym|syndyryp\\s+aldym)\\s+(?:\\S+\\s+)?(?:ayna|zerkal)'), /jylyt|podogrev/],
  ['lights', kzRx('fara|faralar|sham(?!a)|stop\\s+sham|gabarit|povorot|burylys\\s+sham|lampoch|lampa', 'janbay\\S*|@|' + KZ_SIN + '|kuyip\\s+(?:ket|qal)\\S*', '\\b(?:lampoch\\S*|lampa)\\s+(?:\\S+\\s+)?kuyip\\s+(?:ketti|qaldy)'), /panel|ekran|displey|qate|oshibk|check|chek|qozgaltqysh\s+sham|motor\s+sham|indikator/],
  ['warnlight', /\b(?:panel|ekran|displey|pribor)\S*\s+(?:\S+\s+){0,3}?(?:janyp|jandy|shyqty|shygyp|qate|oshibk)\S*|\b(?:check|chek|indikator|sham|lampoch)\S*\s+(?:\S+\s+)?(?:janyp\s+(?:tur|jatyr|qaldy)|jandy|jypylyq\S*|shyqty)\b|\b(?:qate|oshibka)\S*\s+(?:\S+\s+)?(?:shyq|shyg|ber|kors)\S*/],
  ['glass', kzRx('aynek|lobovoy|steklo', 'jaryl\\S*|jaryqshaq\\S*|syzat\\S*|' + KZ_SIN + '|treshin\\S*|tesil\\S*', '\\btas\\s+(?:\\S+\\s+){0,2}?(?:tidi|tiyip|soqty|ushyp\\s+keldi)'), /ayna(?!l)|zerkal|dvornik|tazalag|tuspey|koterilmey/],
  ['window', /\b(?:tereze|aynek)\S*\s+(?:\S+\s+)?(?:tuspey|koterilmey|ashylmay|jabylmay)\S*|\bsteklopod\S*\s+(?:\S+\s+)?(?:istemey|buzyl)\S*/],
  ['batt', kzRx('akkumulyator|akkumlyator|akkum|akum|batareya|akb', '@|otyr(?:yp|dy)\\S*|zaryad\\S*\\s+(?:joq|ustamay|almay)\\S*|bitip\\s+qal\\S*|alsyz\\S*'), /sham|lampoch|indikator/],
  ['tacho', /\b(?:tahograf|tachograf)\S*\s+(?:\S+\s+){0,2}?(?:istemey|buzyl|oqymay|qate|kartany\s+(?:oqymay|qabyldamay))\S*|\bkarta\S*\s+(?:\S+\s+){0,2}?(?:oqylmay|oqymay|qystyr|shyqpay|jogal|urlan)\S*|\b(?:jurgizushi|voditel)\S*\s+karta\S*\s+(?:\S+\s+)?(?:istemey|buzyl|jogal)\S*/, /janarmay|otyn|zapravk|toplivn|bank|benzin|dizel|solyark|bonus/],
  ['fuelcard', /\b(?:janarmay|otyn|toplivn|zapravk|dizel|solyark|benzin)\S*\s+karta\S*\s+(?:\S+\s+){0,2}?(?:istemey|blok|otpey|jogal|qabyldanbay|urlan)\S*/],
  ['lost', kzRx('kilt|klyuch|tehpasport|teh\\s+pasport|qujat|dokument', 'jogal(?:dy|yp|gan)\\b|jogalt(?:tym|yp|ty)\\S*|tabylmay\\S*|taba\\s+almay\\S*|urlan\\S*', '\\bjogalttym\\s+(?:\\S+\\s+)?(?:kilt|klyuch|qujat|tehpasport)'), /karta/],
  ['coupling', /\b(?:tirkeme|pritsep|pricep|polupritsep)\S*\s+(?:\S+\s+){0,2}?(?:qosylmay|ilinbey|agytylyp|ajyrap|ajyrady|julyn)\S*|\b(?:sedelka|sedel)\S*\s+(?:\S+\s+){0,2}?(?:istemey|buzyl|jabylmay|qulyptalmay|ustamay)\S*/],
  ['dryfuel', /\b(?:solyarka|janarmay|otyn|dizel|benzin|toplivo)\S*\s+(?:\S+\s+)?(?:bitti|bitip\s+qaldy|tausyldy|qalmady|joq)\b|\bbak\S*\s+(?:\S+\s+)?bos\b/, /agregat|tonazyt|holodil|adblue|karta/],
  ['reefer', kzRx('holodilnik|holodil|refrijerator|refrejerator|agregat|tonazytqysh', '@|salqyndatpay\\S*|suytpay\\S*|qyzyp\\s+(?:ket|tur)\\S*|qate\\S*|alarm\\S*|qosylmay\\S*'), /kabina|konditsioner/],
  ['susp', kzRx('podushka|pnevmo|ressor|amortizator|aua\\s+jastyq', 'jaryl\\S*|tesil\\S*|' + KZ_SIN + '|@|aua\\s+shygar\\S*|tusip\\s+qal\\S*', '\\b(?:tirkeme|pritsep|mashina|kolik)\\S*\\s+(?:\\S+\\s+)?(?:bir\\s+jaqqa\\s+)?(?:qisay|enkey)\\S*'), /qauipsizdik|\brul\b/],
  ['gear', kzRx('berilis|peredacha|skorost|korobka|kpp', 'qosylmay\\S*|kirmey\\S*|@|qate\\S*|tuspey\\S*', '\\b(?:stseplenie|sceplenie|seplenie|ilinis|mufta)\\S*\\s+(?:\\S+\\s+){0,2}?(?:istemey|buzyl|tayyp|jangan|janyp\\s+ket|ustamay)\\S*'), /sham|lampa/],
  ['climate', kzRx('konditsioner|kondisioner|kondey|pesh|jylytqysh|webasto|vebasto|avtonomka|ventilyator', '@|jylytpay\\S*|suytpay\\S*|urlemey\\S*|qosylmay\\S*'), /oryndyq|kreslo|ayna(?!l)|zerkal|holodil|agregat|refrijerator|tonazyt/],
  ['cabkit', /\b(?:oryndyq|kreslo|ayna|zerkal)\S*\s+(?:jylytqysh|podogrev)\S*\s+(?:\S+\s+)?(?:istemey|buzyl|jylytpay)\S*|\bpodogrev\S*\s+(?:\S+\s+)?(?:istemey|buzyl)\S*/],
  ['tarp', kzRx('tent', 'jyrtyl\\S*|jyrtyq\\S*|tesil\\S*|tesik\\S*|julyn\\S*', '\\b(?:tesik|jyrtyq)\\S*\\s+(?:\\S+\\s+)?tent')],
  ['exhaust', kzRx('glushitel|vyhlop|shygaru\\s+qubyr', 'tusip\\S*|salbyra\\S*|tesil\\S*|jaryl\\S*|uzil\\S*|' + KZ_SIN + '|dybys\\S*|@'), /tutin/],
  ['visib', kzRx('dvornik|tazalagysh|shyotk|shotk|shchetk|omyvatel|omivatel', '@|tazalamay\\S*|' + KZ_SIN + '|uzil\\S*|su\\s+(?:shashpay|bermey|shyqpay)\\S*', '\\b(?:aynek|tereze)\\S*\\s+(?:\\S+\\s+)?terle\\S*')],
  ['seat', /\b(?:beldik|remen)\S*\s+(?:\S+\s+){0,2}?(?:tagylmay|bekitilmey|istemey|buzyl|qystyr|jyrtyl)\S*|\b(?:oryndyq|kreslo|sidenye)\S*\s+(?:\S+\s+){0,2}?(?:syn(?:dy|yp)|istemey|buzyl|qozgalady|solqyl|bosap)\S*/, /jylyt|podogrev/],
  ['wheel', /\b(?:gayka|bolt)\S*\s+(?:\S+\s+){0,2}?(?:bosap|bosady|joq|tusip|shygyp)\S*|\bdisk\S*\s+(?:\S+\s+)?(?:jaryl|qisay|syn(?:dy|yp))\S*|\b(?:podshipnik|stupitsa|stupica)\S*\s+(?:\S+\s+){0,2}?(?:qyz|istemey|buzyl|shuylda|dybys)\S*|\b(?:kardan|reduktor)\S*\s+(?:\S+\s+){0,2}?(?:istemey|buzyl|dybys|tyqylda)\S*/, /tejegish|tormoz/],
  ['stuck', /\b(?:batpaq|qar|qum|lay)\S*\s+(?:\S+\s+){0,2}?(?:batyp\s+qal|tyqylyp\s+qal|batyp\s+tur)\S*|\bbatyp\s+qal(?:dy|dym|dyq)\b/],
  ['numplate', kzRx('nomir|memlekettik\\s+nomir', 'tusip\\S*|jogal(?:dy|yp)\\b|urlan\\S*|julyn\\S*|' + KZ_SIN + '|korinbey\\S*|oqylmay\\S*'), /sham|lampa|telefon|\btel\b|karta|podsvet/],
  ['adas', kzRx('datchik|sensor|radar|kamera|asistent|assistent|kruiz|tempomat', '@|qate\\S*|sonip\\s+qal\\S*', '\\bozi\\s+(?:\\S+\\s+)?tejey\\S*')],
  ['door', kzRx('esik|dver|gidrobort|qulyp|zamok|ortalyq\\s+qulyp', 'jabylmay\\S*|ashylmay\\S*|qulyptalmay\\S*|kepti\\S*|@|ashylyp\\s+ket\\S*|koterilmey\\S*|tuspey\\S*'), /tereze|aynek/]];
function kzKinds(v) { const k = new Set(); for (const raw of String(v || '').split(/[.,;!?\n]+/)) { if (!/[a-zа-яёәғқңөұүһіäğñöūüşı]/i.test(raw)) continue; const p = kzFold(raw).replace(KZ_NEG, ' '); if (!KZ_OK.test(p)) for (const [n, rx, ex] of KZ_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); } if (k.has('acc')) k.delete('injury'); return k; }






const KY_D = 'ishtebe\\S*|ishten\\s+chyk\\S*|buzul\\S*|buzuk\\S*|rabotat\\s+etpe\\S*';
const KY_SIN = 'syn(?:dy|yp|gan|yk)\\b\\S*';
const kyRx = (n, d, extra) => new RegExp(`\\b(?:${n})\\S*\\s+(?:\\S+\\s+){0,2}?(?:${d.split('@').join(KY_D)})${extra ? '|' + extra : ''}`);
const KY_OK = /\b(?:ondol|ondoldu|ondop\s+(?:berdi|koydu)|almashtyr)\S*|\b(?:kayra|kayradan|azyr|emi)\s+(?:\S+\s+)?(?:ishtep\s+(?:tur\S*|jatat)|ishteyt|kuyup\s+tur\S*|jurup\s+jatat|ot\s+alat)\b|\bbaary\s+(?:\S+\s+)?(?:jakshy|tuura|normal|ok)\b|\b(?:problema|koygoy|kemchilik)\S*\s+jok\b/;
const KY_NEG = /\b\S+\s+emes\b|\bech\s+(?:kanday\s+|bir\s+|nerse\s+)?\S+|\b\S+[gkq][aeo]n\s+jo[kq]\b|\b(?:avariya|problema|koygoy|kemchilik|tutun|jarakat|kyrsyk)s[yiu]z\b/g;
const KY_FIRE_N = 'kabina|kyymyldatkych|motor|dongolok|shina|mashina|unaa|juk|pritsep|pricep|zym|provod|tent';
const KY_KINDS = [['brake', kyRx('tormoz|tormuz', '@|karmabay\\S*|jok\\b|alsyz\\S*|ketip\\s+kal\\S*', '\\baba\\s+(?:\\S+\\s+)?(?:basym\\S*\\s+)?(?:tushup|tushtu|ketip)\\b'), /\bkol\s+tormoz|ruchnik|ozu\s+(?:\S+\s+)?tormoz|datchik|chyra[kg]|lampoch|indikator/],
  ['parkbrake', /\b(?:kol\s+tormoz|ruchnik)\S*\s+(?:\S+\s+){0,2}?(?:ishtebe|karmabay|buzul)\S*|\b(?:ozunon\s+ozu|ozu\s+ozunon)\s+(?:\S+\s+)?(?:jylyp|jyljyp|jurup|tomolop)\s+ketti\b/],
  ['flat', kyRx('dongolok|shina|balon|ballon|koles|pokryshk', 'jaryl(?:dy|yp|gan)\\b|teshil(?:di|ip|gen)\\b|abasy\\s+(?:chyk|chyg|ket|tush)\\S*|prokol\\S*', '\\bprokol\\s+(?:boldu|bolup)\\S*|\\b(?:jaryldy|teshildi)\\s+(?:\\S+\\s+)?(?:dongolok|shina|balon)'), /podushka|jazdyk|tent/],
  ['tyre', kyRx('dongolok|shina|protektor|pokryshk|rezina', 'jeshil\\S*|kesil\\S*|shish(?:ip|ti|ken)\\S*|jaraka\\S*|tegiz\\s+bol\\S*'), /jaryl|teshil|abasy|prokol/],

  ['flat', kyRx('shina|balon|ballon|pokryshk', '@'), /zapas|kosumcha|podushka|jazdyk|tent/],
  ['steer', kyRx('rul|rol(?!ik)', '@|oor\\b|oorlap\\S*|katuu\\S*|burulbay\\S*|kyst\\S*|solkul\\S*', '\\b(?:ongo|solgo)\\s+(?:\\S+\\s+)?tart(?:at|yp|ty)\\S*'), /podushka|koopsuzduk/],
  ['leak', kyRx('may|maslo|solyarka|dizel|antifriz|tosol|adblue|gidravlik', 'ag(?:yp|at|ypty)\\S*|akty\\b|tamchyla\\S*|tamyp\\b|syzyp\\b|ketip\\s+jatat', '\\bagyp\\s+(?:jatat|turat)\\s+(?:\\S+\\s+)?(?:may|solyarka|antifriz|dizel)'), /buttu|tugon|kalbady|chyra[kg]|lampoch|indikator|karta/],
  ['fire', kyRx(KY_FIRE_N, 'kuyup\\s+(?:jatat|ketti|tur)\\S*|kuydu\\b|ort\\s+(?:chyk|chyg|ald)\\S*|tutun\\S*\\s+(?:\\S+\\s+)?(?:chyg|chyk|burk)\\S*', '\\bort\\s+(?:chyk|chyg|ket|ald)\\S*|\\bortton\\S*|\\btutun\\S*\\s+(?:\\S+\\s+)?(?:chyg|chyk|burk)\\S*'), /glushitel|vyhlop|chygaruuchu|ochurguch|ognetush|chyra[kg]|lampoch|indikator|check|chek|panel|sigaret|kubaty|jarygy/],
  ['acc', /\bavari(?:ya|ia)\S*\s+(?:\S+\s+)?(?:boldu|kyldym|kyldyk|jasadym|tushtum|kabyld\S*)\b|\bkyrsyk\S*\s+(?:\S+\s+)?(?:boldu|kabyld\S*|tushtum)\b|\bkagyp\s+(?:aldym|aldy|kettim|ketti)\b|\burunup\s+(?:aldym|aldy|kettim|ketti)\b|\bsuzup\s+(?:aldym|aldy)\b/, /\btash\b|rejim/],

  ['acc', /\boodaryl(?!ba)|\bjoldon\s+(?:\S+\s+)?chyg(?:yp|ty|tym)|\barykka\s+(?:tush(?!po)|kulad)/, /\bjuk(?:tor|tu)?\b(?!\s+(?:tashuu|mashina|unaa))|oodarylba|oodarylgan\s+jok/],

  ['acc', /\b(?:arykka|orgo|kanavaga|jyraga)\s+(?:\S+\s+)?(?:tush(?!po)|kula(?!ba)|oodaryl(?!ba)|kirip)|\b(?:mashina|unaa|fura|kamaz|avto|pritsep)\S*\s+(?:\S+\s+)?(?:arykta|kanavada)\b/, /\bjuk(?:tor|tu)?\b(?!\s+(?:tashuu|mashina|unaa))|palet/],

  ['stuck', /\b(?:arykka|orgo|kanavaga|jyraga)\s+(?:\S+\s+)?(?:tush(?!po)|kula(?!ba)|oodaryl(?!ba)|kirip)|\b(?:mashina|unaa|fura|kamaz|avto|pritsep)\S*\s+(?:\S+\s+)?(?:arykta|kanavada)\b/, /\bjuk(?:tor|tu)?\b(?!\s+(?:tashuu|mashina|unaa))|palet/],
  ['injury', /\bjarakat\s+(?:aldym|aldy|alyp)\b|\bjaradar\s+bol\S*|\btez\s+jardam\S*|\boorukana\S*|\b(?:kolum|butum|bashym|belim|manjam)\S*\s+(?:\S+\s+)?(?:kesildi|kesip\s+aldym|syndy|kysylyp\s+kaldy)\b/],
  ['nostart', /\bot\s+albay\S*|\botalbay\S*|\bstarter\S*\s+(?:\S+\s+)?(?:ishtebe|aylanbay|buzul)\S*|\b(?:kyymyldatkych|motor|mashina|unaa)\s+(?:takyr\s+)?(?:otpoy|jurbo)\S*/, /agregat|muzdat|holodil|refrijerator|konditsioner|pech|webasto|vebasto|jylytkych/],
  ['engine', kyRx('kyymyldatkych|motor|dvigatel', 'kyz(?:yp|dy|ayt)\\b\\S*|tartpay\\S*|kubaty\\s+(?:jok|az)|alsyz\\S*|tykylda\\S*|bashka\\s+(?:dobush|un)\\S*|dobush\\s+(?:chyg|ber)\\S*|shyldyra\\S*', '\\b(?:glushitel|vyhlop|chygaruuchu\\s+tutuk)\\S*\\s+(?:\\S+\\s+){0,2}?(?:(?:kara|ak|kok)\\s+)?tutun|\\b(?:kara|kok)\\s+tutun\\s+(?:\\S+\\s+)?chyg\\S*|\\bavari(?:ya|ia)l\\S*\\s+rejim\\S*|\\btemperatura\\S*\\s+(?:\\S+\\s+)?(?:kotorul|jogorula)\\S*'), /agregat|muzdat|holodil|refrijerator|chyra[kg]|lampoch|indikator/],
  ['mirror', kyRx('kuzgu|zerkal', KY_SIN + '|uzul\\S*|julun\\S*|tushup\\s+(?:kal|ket)\\S*|salaktap\\S*|@', '\\b(?:syndyrdym|syndyryp\\s+aldym)\\s+(?:\\S+\\s+)?(?:kuzgu|zerkal)'), /jylyt|podogrev/],
  ['lights', kyRx('fara|faralar|chyra[kg]|stop\\s+chyra[kg]|gabarit|povorot|burulush\\s+chyra[kg]|lampoch|lampa', 'kuyboy\\S*|janbay\\S*|@|' + KY_SIN + '|kuyup\\s+(?:ket|kal)\\S*', '\\b(?:lampoch\\S*|lampa)\\s+(?:\\S+\\s+)?kuyup\\s+(?:ketti|kaldy)'), /panel|ekran|displey|kata|oshibk|check|chek|kyymyldatkych\s+chyra|motor\s+chyra|abs\s+chyra|indikator/],
  ['warnlight', /\b(?:panel|ekran|displey|pribor)\S*\s+(?:\S+\s+){0,3}?(?:kuyup|kuydu|chykty|chygyp|kata|oshibk)\S*|\b(?:check|chek|indikator|chyra[kg]|lampoch)\S*\s+(?:\S+\s+)?(?:kuyup\s+(?:tur\S*|jatat)|kuydu|jymyld\S*|chykty)(?!\S)|\b(?:kata|oshibka)\S*\s+(?:\S+\s+)?(?:chyk|chyg|ber|korsot)\S*/],
  ['glass', kyRx('aynek|lobovoy|steklo', 'jaryl\\S*|jaraka\\S*|chiyil\\S*|' + KY_SIN + '|treshin\\S*|teshil\\S*', '\\btash\\s+(?:\\S+\\s+){0,2}?(?:tiydi|tiyip|urdu|uchup\\s+keldi)'), /kuzgu|zerkal|dvornik|tazala|tushpoy|kotorulbo/],
  ['window', /\b(?:tereze|aynek)\S*\s+(?:\S+\s+)?(?:tushpoy|kotorulbo|achylbay|jabylbay)\S*|\bsteklopod\S*\s+(?:\S+\s+)?(?:ishtebe|buzul)\S*/],
  ['batt', kyRx('akkumulyator|akkumlyator|akkum|akum|batareya|akb', '@|oturup\\S*|olturup\\S*|zaryad\\S*\\s+(?:jok|karmabay|albay)\\S*|butup\\s+kal\\S*|alsyz\\S*'), /chyra[kg]|lampoch|indikator/],
  ['tacho', /\b(?:tahograf|tachograf)\S*\s+(?:\S+\s+){0,2}?(?:ishtebe|buzul|okubay|kata|kartany\s+(?:okubay|kabyl\s+albay))\S*|\bkarta\S*\s+(?:\S+\s+){0,2}?(?:okulbay|okubay|kyst|chykpay|jogol|uurdal)\S*|\b(?:aydoochu|voditel)\S*\s+karta\S*\s+(?:\S+\s+)?(?:ishtebe|buzul|jogol)\S*/, /kuyuuchu|zapravk|toplivn|bank|benzin|dizel|solyark|bonus/],
  ['fuelcard', /\b(?:kuyuuchu\s+may|toplivn|zapravk|dizel|solyark|benzin)\S*\s+karta\S*\s+(?:\S+\s+){0,2}?(?:ishtebe|blok|otpoy|jogol|uurdal|kabyl\S*\s+alynbay)\S*/],
  ['lost', kyRx('achkych|klyuch|tehpasport|teh\\s+pasport|dokument', 'jogol(?:du|up|gon)\\b|jogot(?:tum|up|tu)\\S*|tabylbay\\S*|taba\\s+albay\\S*|uurdal\\S*', '\\bjogotup\\s+(?:aldym|koydum)\\s+(?:\\S+\\s+)?(?:achkych|klyuch|dokument|tehpasport)'), /karta/],
  ['coupling', /\b(?:pritsep|pricep|polupritsep)\S*\s+(?:\S+\s+){0,2}?(?:ilinbe|ulanbay|ajyrap|ajyrady|julun|chechilip)\S*|\b(?:sedelka|sedel)\S*\s+(?:\S+\s+){0,2}?(?:ishtebe|buzul|jabylbay|kulpulanbay|karmabay)\S*/],
  ['dryfuel', /\b(?:solyarka|kuyuuchu\s+may|dizel|benzin|toplivo)\S*\s+(?:\S+\s+)?(?:buttu|butup\s+kaldy|tugondu|tugonup\s+kaldy|kalbady)\b|\bbak\S*\s+(?:\S+\s+)?bosh\b/, /agregat|muzdat|holodil|adblue|karta/],
  ['reefer', kyRx('holodilnik|holodil|refrijerator|refrejerator|agregat|muzdatkych', '@|muzdatpay\\S*|suutpay\\S*|kyzyp\\s+(?:ket|tur)\\S*|kata\\S*|alarm\\S*|kosulbay\\S*'), /kabina|konditsioner/],
  ['susp', kyRx('podushka|pnevmo|ressor|amortizator|aba\\s+jazdyk', 'jaryl\\S*|teshil\\S*|' + KY_SIN + '|@|aba\\s+chygar\\S*|tushup\\s+kal\\S*', '\\b(?:pritsep|mashina|unaa)\\S*\\s+(?:\\S+\\s+)?(?:bir\\s+jakka\\s+)?kyyshay\\S*'), /koopsuzduk|\brul\b/],
  ['gear', kyRx('berilish|peredacha|skorost|korobka|kpp', 'kirbey\\S*|kosulbay\\S*|@|kata\\S*|tushpoy\\S*', '\\b(?:stseplenie|sceplenie|seplenie)\\S*\\s+(?:\\S+\\s+){0,2}?(?:ishtebe|buzul|tayyp|tayga\\S*|kuygon|kuyup\\s+ket|karmabay)\\S*'), /chyra[kg]|lampa/],
  ['climate', kyRx('konditsioner|kondisioner|kondey|pech|jylytkych|webasto|vebasto|avtonomka|ventilyator', '@|jylytpay\\S*|suutpay\\S*|muzdatpay\\S*|kosulbay\\S*'), /oturguch|kreslo|kuzgu|zerkal|holodil|agregat|refrijerator|muzdatkych/],
  ['cabkit', /\b(?:oturguch|kreslo|kuzgu|zerkal)\S*\s+(?:jylytkych|podogrev)\S*\s+(?:\S+\s+)?(?:ishtebe|buzul|jylytpay)\S*|\bpodogrev\S*\s+(?:\S+\s+)?(?:ishtebe|buzul)\S*/],
  ['tarp', kyRx('tent', 'tytyl\\S*|ayryl\\S*|jyrtyl\\S*|teshil\\S*|teshik\\S*|julun\\S*', '\\b(?:teshik|jyrtyk)\\S*\\s+(?:\\S+\\s+)?tent')],
  ['exhaust', kyRx('glushitel|vyhlop|chygaruuchu\\s+tutuk', 'tushup\\S*|salaktap\\S*|teshil\\S*|jaryl\\S*|uzul\\S*|' + KY_SIN + '|dobush\\S*|@'), /tutun/],
  ['visib', kyRx('dvornik|tazalagych|shyotk|shotk|shchetk|omyvatel|omivatel', '@|tazalabay\\S*|' + KY_SIN + '|uzul\\S*|suu\\s+(?:chachpay|berbey|chykpay)\\S*', '\\b(?:aynek|tereze)\\S*\\s+(?:\\S+\\s+)?terle\\S*')],
  ['seat', /\b(?:koopsuzduk\s+kur|remen)\S*\s+(?:\S+\s+){0,2}?(?:tagylbay|bekibey|ishtebe|buzul|kyst|ayryl)\S*|\b(?:oturguch|kreslo|sidenye)\S*\s+(?:\S+\s+){0,2}?(?:syn(?:dy|yp)|ishtebe|buzul|kyymyld|solkul|boshop)\S*/, /jylyt|podogrev/],
  ['wheel', /\b(?:gayka|bolt)\S*\s+(?:\S+\s+){0,2}?(?:boshop|boshodu|jok|tushup|chygyp)\S*|\bdisk\S*\s+(?:\S+\s+)?(?:jaryl|kyyshay|syn(?:dy|yp))\S*|\b(?:podshipnik|stupitsa|stupica)\S*\s+(?:\S+\s+){0,2}?(?:kyz|ishtebe|buzul|shyldyra|dobush|tykylda)\S*|\b(?:kardan|reduktor)\S*\s+(?:\S+\s+){0,2}?(?:ishtebe|buzul|dobush|tykylda)\S*/, /tormoz/],
  ['stuck', /\b(?:batkak|kar|kum|ylay)\S*\s+(?:\S+\s+){0,2}?(?:batyp\s+kal|tygylyp\s+kal|batyp\s+tur)\S*|\bbatyp\s+kal(?:dy|dym|dyk)\b/],
  ['numplate', kyRx('nomer|mamlekettik\\s+nomer', 'tushup\\S*|jogol(?:du|up)\\b|uurdal\\S*|julun\\S*|' + KY_SIN + '|korunbo\\S*|okulbay\\S*'), /chyra[kg]|lampa|telefon|\btel\b|karta|podsvet/],
  ['adas', kyRx('datchik|sensor|radar|kamera|asistent|assistent|kruiz|tempomat', '@|kata\\S*|ochup\\s+kal\\S*', '\\bozu\\s+(?:\\S+\\s+)?tormoz\\s+(?:basat|berat|basty)\\S*')],
  ['door', kyRx('eshik|dver|gidrobort|kulpu|zamok|borborduk\\s+kulpu', 'jabylbay\\S*|achylbay\\S*|kulpulanbay\\S*|kyst\\S*|@|achylyp\\s+ket\\S*|kotorulbo\\S*|tushpoy\\S*'), /tereze|aynek/]];
function kyKinds(v) { const k = new Set(); for (const raw of String(v || '').split(/[.,;!?\n]+/)) { if (!/[a-zа-яёңөү]/i.test(raw)) continue; const p = kzFold(raw).replace(KY_NEG, ' '); if (!KY_OK.test(p)) for (const [n, rx, ex] of KY_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); } if (k.has('acc')) k.delete('injury'); return k; }







const TJ_TR = { ...KZ_TR, ғ: 'g', қ: 'q', ҳ: 'h', ҷ: 'j', ӣ: 'i', ӯ: 'u', ъ: '' };
const tjFold = (s) => String(s || '').toLowerCase().replace(/[а-яёғқҳҷӣӯ]/g, (c) => TJ_TR[c] ?? c).replace(/ī/g, 'i').replace(/ū/g, 'u').replace(/ğ|g['ʻʼ‘’`]|gh/g, 'g').replace(/kh|x/g, 'h').replace(/zh/g, 'j').replace(/[ʻʼ‘’'`´]/g, '').replace(/-/g, ' ');
const TJ_NOT = '(?:name|na)';
const TJ_D = `kor\\s+${TJ_NOT}kun\\S*|kor\\s+nakard\\S*|vayron\\S*|harob\\s+shud\\S*|nosoz\\S*|rabotat\\s+${TJ_NOT}kun\\S*`;
const TJ_SHK = 'shikast\\S*';
const tjRx = (n, d, extra) => new RegExp(`\\b(?:${n})\\S*\\s+(?:\\S+\\s+){0,2}?(?:${d.split('@').join(TJ_D)})${extra ? '|' + extra : ''}`);
const TJ_OK = /\b(?:tamir|taamir)\s+(?:shud|kard)\S*|\b(?:durust|soz|ivaz)\s+(?:shud|kard)\S*|\b(?:boz|holo|aknun)\s+(?:\S+\s+)?kor\s+mekun\S*|\bhama(?:ash|i)?\s+(?:\S+\s+)?(?:hub|durust|normal|ok)\b/;
const TJ_NEG = /\b(?:\S+(?:sta|nda|ida|hta|uda)|vayron|harob|nosoz|mushkil\S*|problem\S*|kambud\S*|sadama\S*|avari\S*)\s+nest\b|\bhe(?:j|ch)\s+(?:\S+\s+)?\S+|\bbe\s+(?:sadama|avari|mushkil|problem|zarar)\S*/g;
const TJ_FIRE_N = 'kabina|motor|dvigatel|charh|shina|moshin|mashin|bor\\b|pritsep|sim\\b|simho|provod|tent';
const TJ_KINDS = [['brake', tjRx('tormoz|tormaz', `@|${TJ_NOT}gir\\S*|nagirift\\S*|sust\\s+shud\\S*`, '\\bhavo\\S*\\s+(?:\\S+\\s+)?(?:fishor\\S*\\s+)?(?:past\\s+shud|aftod)\\S*'), /tormoz\S*\s+dasti|ruchnik|hudash|datchik|charog|chirog|lampoch|indikator/],
  ['parkbrake', new RegExp(`\\b(?:tormoz\\S*\\s+dasti|ruchnik)\\S*\\s+(?:\\S+\\s+){0,2}?(?:kor\\s+${TJ_NOT}kun|${TJ_NOT}gir|vayron)\\S*|\\b(?:hud\\s+ba\\s+hud|hudash)\\s+(?:\\S+\\s+)?(?:harakat\\s+kard|ravon\\s+shud|gelid|gelida\\s+raft)\\S*`)],
  ['flat', tjRx('charh|shina|ballon|balon|koles|pokryshk', 'tarkid\\S*|suroh\\s+shud\\S*|havo\\S*\\s+(?:baromad|raft|holi\\s+shud)\\S*|prokol\\S*', '\\bprokol\\s+shud\\S*|\\btarkid\\S*\\s+(?:\\S+\\s+)?(?:charh|shina|ballon)|\\bhavo\\S*\\s+(?:\\S+\\s+)?(?:charh|shina|ballon)\\S*\\s+(?:baromad|raft)\\S*'), /podushka|bolisht|tent/],
  ['tyre', tjRx('charh|shina|protektor|pokryshk|rezina', 'hurda\\s+shud\\S*|sud(?:a|ida)\\s+shud\\S*|burida\\s+shud\\S*|varam\\s+kard\\S*|kafid\\S*|hamvor\\s+shud\\S*'), /tarkid|suroh|havo|prokol/],

  ['flat', tjRx('shina|ballon|balon|pokryshk', '@|shikast\\S*'), /zapas|ehtiyot|nashud|podushka|bolisht|tent/],
  ['steer', tjRx('rul', `@|vaznin\\S*|${TJ_NOT}gard\\S*|bozi\\s+dor\\S*|melarz\\S*|larzid\\S*`, '\\b(?:moshin|mashin)\\S*\\s+(?:\\S+\\s+)?(?:ba\\s+)?(?:tarafi\\s+)?(?:rost|chap)\\s+mekash\\S*'), /podushka|bolisht|behatar/],
  ['leak', tjRx('ravgan|maslo|solyarka|dizel|antifriz|tosol|adblue|gidravlik', 'merez\\S*|rehta\\s+istod\\S*|chakid\\S*|mechak\\S*|tarovish\\S*', '\\bmerezad\\s+(?:\\S+\\s+)?(?:ravgan|solyarka|antifriz|dizel)'), /tamom|holi\s+shud|namond|charog|chirog|lampoch|indikator|k[ao]rt/],
  ['fire', tjRx(TJ_FIRE_N, 'mesuz\\S*|suht\\b|suhta\\s+(?:istod|ravad)\\S*|otash\\s+girift\\S*|dud\\s+(?:mebaro|baromad)\\S*', '\\botash\\s+girift\\S*|\\bsuhtor\\S*|\\bdud\\S*\\s+(?:\\S+\\s+)?(?:mebaro|baromad)\\S*'), /glushitel|vyhlop|lulai\s+dud|ognetush|charog|chirog|lampoch|indikator|check|chek|panel|sigaret|tamoku/],
  ['acc', /\bsadama\S*\s+(?:\S+\s+)?(?:shud|shudam|shudem|kardam|kard|dochor\s+shud\S*)(?!\S)|\bavari(?:ya|ia)\S*\s+(?:\S+\s+)?(?:shud|shudam|kardam|kard)(?!\S)|\bbar\s*hurd(?:am|em|ed|and|)\b|\b(?:moshin|mashin|devor|sutun|darvoza|pritsep|bordyur)\S*\s+(?:\S+\s+)?zadam\b/, /\bsang\b|rejim/],

  ['acc', /\bchappa\s+(?:shud|gasht)|\baz\s+roh\s+(?:\S+\s+)?(?:baromad|lagzid)|\bba\s+(?:ju[iy]|chuqur)\S*\s+(?:aftod|darafto)/, /\bbor(?:ho)?\b|palet/],

  ['acc', /\bba\s+(?:ju[iy]|handaq|kanava)\S*\s+(?:\S+\s+)?(?:aftod|darafto|gelid|galtid)|\b(?:moshin|mashin|fura|kamaz|avto|pritsep)\S*\s+(?:\S+\s+)?dar\s+(?:ju[iy]|handaq|kanava)\S*/, /\bbor(?:ho)?\b|palet|\bnest\b|\bna(?:aftod|darafto|gelid|galtid)/],

  ['stuck', /\bba\s+(?:ju[iy]|handaq|kanava)\S*\s+(?:\S+\s+)?(?:aftod|darafto|gelid|galtid)|\b(?:moshin|mashin|fura|kamaz|avto|pritsep)\S*\s+(?:\S+\s+)?dar\s+(?:ju[iy]|handaq|kanava)\S*/, /\bbor(?:ho)?\b|palet|\bnest\b|\bna(?:aftod|darafto|gelid|galtid)/],
  ['injury', /\bzahmi\s+shud\S*|\bjarohat\s+(?:girift|bard|did)\S*|\b(?:yo|e)rii\s+tajili|\bskoraya\S*|\bbemorhona\S*|\b(?:dastam|poyam|saram|kamaram|angushtam)\S*\s+(?:\S+\s+)?(?:burida\s+shud|shikast|monda\s+shud)\b/],
  ['nostart', new RegExp(`\\b(?:motor|moshin|mashin|dvigatel)\\S*\\s+(?:\\S+\\s+)?(?:zavod\\S*\\s+${TJ_NOT}shav\\S*|sar\\s+${TJ_NOT}shav\\S*|dar\\s*${TJ_NOT}gir\\S*)|\\bzavod\\S*\\s+${TJ_NOT}shav\\S*|\\bstarter\\S*\\s+(?:\\S+\\s+)?(?:kor\\s+${TJ_NOT}kun|vayron|${TJ_NOT}gard)\\S*`), /agregat|holodil|refrijerator|yahdon|konditsioner|pech|webasto|vebasto|garmkun/],
  ['engine', tjRx('motor|dvigatel|muharrik', 'garm\\s+(?:shud|meshav)\\S*|jushid\\S*|mejush\\S*|quvvat\\S*\\s+(?:nador|kam)\\S*|kashish\\s+nador\\S*|namekash\\S*|taq\\s*taq\\S*|ovoz\\S*\\s+(?:\\S+\\s+)?(?:mebaro|baromad|medih)\\S*|sado\\S*\\s+(?:\\S+\\s+)?(?:mebaro|baromad|medih)\\S*', '\\b(?:glushitel|vyhlop|lulai\\s+dud)\\S*\\s+(?:\\S+\\s+){0,2}?(?:(?:si(?:yo|e)h|safed|kabud)\\s+)?dud|\\b(?:si(?:yo|e)h|kabud)\\s+dud\\s+(?:\\S+\\s+)?(?:mebaro|baromad)\\S*|\\bavari\\S*\\s+rejim\\S*|\\bharorat\\S*\\s+(?:\\S+\\s+)?(?:baland|bolo)\\s+(?:shud|raft|meshav)\\S*'), /agregat|holodil|refrijerator|yahdon|charog|chirog|lampoch|indikator/],
  ['mirror', tjRx('oina|zerkal', TJ_SHK + '|kanda\\s+shud\\S*|aftod\\S*|ovezon\\S*|@', '\\bshikastam\\s+(?:\\S+\\s+)?(?:oina|zerkal)'), /oinai\s+pesh|lobovoy|garmkun|podogrev/],
  ['lights', tjRx('fara|charog|chirog|stop\\s+charog|gabarit|povorot|lampoch|lampa', 'namesuz\\S*|dar\\s*namegir\\S*|@|' + TJ_SHK, '\\b(?:lampoch\\S*|lampa)\\s+(?:\\S+\\s+)?suht\\S*'), /panel|ekran|displey|hato|oshibk|check|chek|(?:charog|chirog)\S*\s+(?:\S+\s+)?(?:motor|abs|tormoz|ravgan)|indikator/],
  ['warnlight', /\b(?:panel|ekran|displey|pribor)\S*\s+(?:\S+\s+){0,3}?(?:mesuz|dar\s*girift|hato|oshibk)\S*|\b(?:check|chek|indikator|charog|chirog|lampoch)\S*\s+(?:\S+\s+)?(?:mesuz\S*|dar\s*girift\S*|milt\S*)(?!\S)|\b(?:hato|oshibka)\S*\s+(?:\S+\s+)?(?:baromad|mebaro|nishon\s+med)\S*/],
  ['glass', tjRx('shisha|lobovoy|steklo|oinai\\s+pesh', 'kafid\\S*|tarkid\\S*|tarqish\\S*|' + TJ_SHK + '|treshin\\S*|suroh\\s+shud\\S*', '\\bsang\\s+(?:\\S+\\s+){0,2}?(?:zad|rasid|hurd)\\b'), /zerkal|dvornik|po(?:yo|e)n|bolo\s+namer|kushoda|pushida/],
  ['window', new RegExp(`\\b(?:tireza|shisha)\\S*\\s+(?:\\S+\\s+)?(?:po(?:yo|e)n|bolo)\\s+${TJ_NOT}rav\\S*|\\bsteklopod\\S*\\s+(?:\\S+\\s+)?(?:kor\\s+${TJ_NOT}kun|vayron)\\S*|\\btireza\\S*\\s+(?:\\S+\\s+)?(?:kushoda|pushida)\\s+${TJ_NOT}shav\\S*`)],
  ['batt', tjRx('akkumulyator|akkumlyator|akkum|akum|batareya|akb', '@|nishast\\S*|zaryad\\S*\\s+(?:nador|namegir|tamom)\\S*|holi\\s+shud\\S*|tamom\\s+shud\\S*'), /charog|chirog|lampoch|indikator/],
  ['tacho', new RegExp(`\\b(?:tahograf|tachograf)\\S*\\s+(?:\\S+\\s+){0,2}?(?:kor\\s+${TJ_NOT}kun|vayron|${TJ_NOT}hon|hato)\\S*|\\bk[ao]rt\\S*\\s+(?:\\S+\\s+){0,2}?(?:honda\\s+${TJ_NOT}shav|${TJ_NOT}hon|gum\\s+shud|duzdid|kor\\s+${TJ_NOT}kun|vayron)\\S*`), /suzishvori|zapravk|toplivn|bank|benzin|dizel|solyark|bonus|telefon/],
  ['fuelcard', new RegExp(`\\b(?:suzishvori|toplivn|zapravk|dizel|solyark|benzin)\\S*\\s+k[ao]rt\\S*\\s+(?:\\S+\\s+){0,2}?(?:kor\\s+${TJ_NOT}kun|blok|${TJ_NOT}gudar|gum\\s+shud|duzdid|vayron)\\S*|\\bk[ao]rt\\S*\\s+(?:suzishvori|toplivn|zapravk|dizel|solyark|benzin)\\S*\\s+(?:\\S+\\s+)?(?:kor\\s+${TJ_NOT}kun|blok|${TJ_NOT}gudar|gum\\s+shud|duzdid|vayron)\\S*`)],
  ['lost', tjRx('kalid|klyuch|tehpasport|teh\\s+pasport|hujjat|dokument', 'gum\\s+(?:shud|kard)\\S*|duzdid\\S*|' + TJ_NOT + 'yob\\S*', '\\bgum\\s+kardam\\s+(?:\\S+\\s+)?(?:kalid|klyuch|hujjat|dokument|tehpasport)'), /k[ao]rt/],
  ['coupling', new RegExp(`\\b(?:pritsep|pricep|polupritsep|tirkama)\\S*\\s+(?:\\S+\\s+){0,2}?(?:judo\\s+shud|kanda\\s+shud|vasl\\s+${TJ_NOT}shav|bast\\S*\\s+${TJ_NOT}shav)\\S*|\\b(?:sedelka|sedel)\\S*\\s+(?:\\S+\\s+){0,2}?(?:kor\\s+${TJ_NOT}kun|vayron|${TJ_NOT}bast|qulf\\s+${TJ_NOT}shav|${TJ_NOT}gir)\\S*`)],
  ['dryfuel', /\b(?:solyarka|suzishvori|dizel|benzin|toplivo)\S*\s+(?:\S+\s+)?(?:tamom\s+shud|holi\s+shud|namond)\b|\bbak\S*\s+(?:\S+\s+)?holi\s+(?:shud|mond)\S*/, /agregat|holodil|adblue|k[ao]rt/],
  ['reefer', tjRx('holodilnik|holodil|refrijerator|refrejerator|agregat|yahdon|sardkun', `@|sard\\s+${TJ_NOT}kun\\S*|hunuk\\s+${TJ_NOT}kun\\S*|garm\\s+shud\\S*|hato\\S*|alarm\\S*|dar\\s*${TJ_NOT}gir\\S*`), /kabina|konditsioner/],
  ['susp', tjRx('podushka|bolisht|pnevmo|ressor|amortizator', 'tarkid\\S*|suroh\\s+shud\\S*|' + TJ_SHK + '|@|havo\\S*\\s+(?:baromad|raft)\\S*|po(?:yo|e)n\\s+shud\\S*', '\\b(?:pritsep|moshin|mashin)\\S*\\s+(?:\\S+\\s+)?(?:ba\\s+yak\\s+taraf\\s+)?kaj\\s+shud\\S*'), /behatar|\brul/],
  ['gear', tjRx('peredach|skorost|korobk|kpp', `${TJ_NOT}daro\\S*|${TJ_NOT}gudar\\S*|@|hato\\S*|parid\\S*`, `\\b(?:stseplenie|sceplenie|seplenie)\\S*\\s+(?:\\S+\\s+){0,2}?(?:kor\\s+${TJ_NOT}kun|vayron|suht|lagzid|${TJ_NOT}gir)\\S*`), /charog|chirog|lampa/],
  ['climate', tjRx('konditsioner|kondisioner|kondey|pech|garmkunak|webasto|vebasto|avtonomka|ventilyator', `@|garm\\s+${TJ_NOT}kun\\S*|sard\\s+${TJ_NOT}kun\\S*|hunuk\\s+${TJ_NOT}kun\\S*|dar\\s*${TJ_NOT}gir\\S*`), /kursi|kreslo|oina|zerkal|holodil|agregat|refrijerator|yahdon/],
  ['cabkit', new RegExp(`\\b(?:kursi|kreslo|oina|zerkal)\\S*\\s+(?:garmkun|podogrev)\\S*\\s+(?:\\S+\\s+)?(?:kor\\s+${TJ_NOT}kun|vayron|garm\\s+${TJ_NOT}kun)\\S*|\\b(?:podogrev|garmkunak)\\S*\\s+(?:kursi|kreslo|oina|zerkal)\\S*\\s+(?:\\S+\\s+)?(?:kor\\s+${TJ_NOT}kun|vayron|garm\\s+${TJ_NOT}kun)\\S*|\\bpodogrev\\S*\\s+(?:kor\\s+${TJ_NOT}kun|vayron)\\S*`)],
  ['tarp', tjRx('tent|brezent|sayabon', 'darid\\S*|kanda\\s+shud\\S*|suroh\\S*|chok\\s+shud\\S*', '\\bsuroh\\S*\\s+(?:\\S+\\s+)?(?:tent|brezent)')],
  ['exhaust', tjRx('glushitel|vyhlop|lulai\\s+dud', 'aftod\\S*|ovezon\\S*|suroh\\S*|tarkid\\S*|kanda\\s+shud\\S*|' + TJ_SHK + '|ovoz\\S*\\s+(?:\\S+\\s+)?(?:baland|mebaro)\\S*|@'), /\bdud\b/],
  ['visib', tjRx('dvornik|tozakunak|shyotk|shotk|shchetk|omyvatel|omivatel', `@|toza\\s+${TJ_NOT}kun\\S*|${TJ_SHK}|kanda\\s+shud\\S*|ob\\s+${TJ_NOT}(?:par|dih)\\S*`, '\\b(?:shisha|tireza)\\S*\\s+(?:\\S+\\s+)?(?:arq\\s+kard|bug\\s+girift|bug\\s+kard)\\S*')],
  ['seat', new RegExp(`\\b(?:kamarband|remen)\\S*\\s+(?:\\S+\\s+){0,2}?(?:${TJ_NOT}bast|bast\\S*\\s+${TJ_NOT}shav|kor\\s+${TJ_NOT}kun|vayron|kanda\\s+shud)\\S*|\\b(?:kursi|kreslo|sidenye)\\S*\\s+(?:\\S+\\s+){0,2}?(?:shikast|kor\\s+${TJ_NOT}kun|vayron|melarz|sust\\s+shud)\\S*`), /garmkun|podogrev/],
  ['wheel', /\b(?:gayka|bolt)\S*\s+(?:\S+\s+){0,2}?(?:sust\s+shud|kushoda\s+shud|nest|aftod|kanda\s+shud)\S*|\bdisk\S*\s+(?:\S+\s+)?(?:kaj\s+shud|tarkid|shikast|kafid)\S*|\b(?:podshipnik|stupitsa|stupica)\S*\s+(?:\S+\s+){0,2}?(?:garm\s+shud|kor\s+(?:name|na)kun|vayron|ovoz|sado|taq)\S*|\b(?:kardan|reduktor)\S*\s+(?:\S+\s+){0,2}?(?:kor\s+(?:name|na)kun|vayron|ovoz|sado|taq)\S*/, /tormoz/],
  ['stuck', /\b(?:loy|barf|reg|botloq|gil)\S*\s+(?:\S+\s+){0,2}?(?:mondam|mondem|monda\s+shud|garq\s+shud|band\s+mond)\S*|\b(?:loy|barf|reg|botloq)\S*\s+(?:\S+\s+)?garq\S*|\bgarq\s+shud(?:am|em)?\b/],
  ['numplate', tjRx('nomer|raqam|davlatraqam', `aftod\\S*|gum\\s+shud\\S*|duzdid\\S*|kanda\\s+shud\\S*|${TJ_SHK}|honda\\s+${TJ_NOT}shav\\S*|${TJ_NOT}namoy\\S*`), /charog|chirog|lampa|telefon|\btel\b|k[ao]rt|podsvet/],
  ['adas', tjRx('datchik|sensor|radar|kamera|asistent|assistent|kruiz|tempomat', '@|hato\\S*|homush\\s+shud\\S*', '\\bhudash\\s+(?:\\S+\\s+)?tormoz\\s+(?:mezan|zad|megir)\\S*')],
  ['door', tjRx('dvera?|dveri|gidrobort|qulf|zamok|dari\\s+(?:kabina|moshin|mashin|pesh|qafo|chap|rost|bor|pas)', `(?:pushida|basta|kushoda|qulf)\\s+${TJ_NOT}shav\\S*|${TJ_NOT}kush\\S*|${TJ_NOT}bast\\S*|@|kushoda\\s+shud\\S*|bolo\\s+${TJ_NOT}rav\\S*|po(?:yo|e)n\\s+${TJ_NOT}rav\\S*`), /tireza|shisha/]];
function tjKinds(v) { const k = new Set(); for (const raw of String(v || '').split(/[.,;!?\n]+/)) { if (!/[a-zа-яёғқҳҷӣӯ]/i.test(raw)) continue; const p = tjFold(raw).replace(TJ_NEG, ' '); if (!TJ_OK.test(p)) for (const [n, rx, ex] of TJ_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); } if (k.has('acc')) k.delete('injury'); return k; }









const TK_TR = { а: 'a', ә: 'e', б: 'b', в: 'w', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', җ: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', ң: 'n', о: 'o', ө: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ү: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'c', ш: 's', щ: 's', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
const tkFold = (s) => String(s || '').toLowerCase().replace(/̇/g, '').replace(/[а-яёәңөүҗ]/g, (c) => TK_TR[c] ?? c).replace(/ä/g, 'e').replace(/ý/g, 'y').replace(/ş|sh|š/g, 's').replace(/ç|ch|č/g, 'c').replace(/ň/g, 'n').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ž|zh/g, 'j').replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/[ʻʼ‘’'`´-]/g, ' ');
const TK_NV = '(?:m[ae]y[ae]r|m[ae]d[iy]|[ae]nok)';
const TK_W = `isle${TK_NV}\\S*|isl[ae]nok\\S*`;
const TK_D = `${TK_W}|bozul\\S*|bozuk\\S*|nasaz\\S*|rabotat\\S*\\s+etm[ae]\\S*`;
const TK_SHK = 'dowul\\S*|dowuk\\S*';
const tkRx = (n, d, extra) => new RegExp(`\\b(?:${n})\\S*\\s+(?:\\S+\\s+){0,2}?(?:${d.split('@').join(TK_D)})${extra ? '|' + extra.split('@').join(TK_D) : ''}`);
const TK_OK = /\b(?:bejeril|bejerdi|calsyl|calysdy|calysdyk|tazelendi|duzeldi|duzedildi)\S*|\b(?:yene|indi|tazeden)\s+(?:\S+\s+)?(?:isley[ae]r|isleya|yanyar|gidyer)\b|\bhemme\s+zat\s+(?:\S+\s+)?(?:gowy|kadaly|normal|ok|tertipde)\S*|\b(?:problema?|nasazlyk|kemcilik)\S*\s+yok\b/;
const TK_NEG = /\b(?:\S+(?:an|en|yk|uk|ik|ak|ek)|dowuk|bozuk|nasaz|problema?\S*|kemcilik\S*|awariya\S*)\s+d[ae]l\S*|\bhic\s+(?:hili\s+|bir\s+)?\S+|\b(?:awariya|problema?|zeper|nasazlyk|kemcilik)s[yi]z\b|\b(?:yaryl|desil|dowul|bozul|catla|yyrtyl|ak|dam|syz|gyz|ayryl|yit|kesil|ogurla|cis)m[ae](?:d[yi]|y[ae]r|z)\S*/g;
const TK_FIRE_N = 'kabina|motor|dwigatel|dvigatel|teker|sina|masyn|ulag|yuk|pritsep|sim\\b|simler|prowod|provod|tent';
const TK_KINDS = [['brake', tkRx('tormoz|tormaz', `@|tutm[ae]y[ae]r\\S*|tutmady\\S*|tutanok\\S*|gowsa\\S*|yok\\b`, '\\bhowa\\S*\\s+(?:basys\\S*\\s+)?(?:pes\\s+)?(?:dusdi|dusyer|gacyar|gacdy|gitdi|gidyer)\\b'), /\bel\s+tormoz|rucnik|datcik|ozi\s+(?:\S+\s+)?tormoz|cyra|lampoc|indikator/],
  ['parkbrake', new RegExp(`\\b(?:el\\s+tormoz|rucnik)\\S*\\s+(?:\\S+\\s+){0,2}?(?:tutm[ae]y[ae]r|tutanok|${TK_W}|bozul|cykm[ae]y[ae]r|ayrylm[ae]y[ae]r)\\S*|\\b(?:masyn|ulag)\\S*\\s+(?:\\S+\\s+)?(?:oz\\s+ozunden|ozbasdak)\\s+(?:\\S+\\s+)?(?:gitdi|yoredi|tigirlendi|hereket\\s+etdi|yorap\\s+gitdi)\\S*`)],
  ['flat', tkRx('teker|sina|ballon|balon|koles|pokrysk', 'yaryl\\S*|desil\\S*|yel\\S*\\s+(?:cykdy|gitdi|cykyar|gidyer)\\S*|prokol\\S*|patlad\\S*', '\\bprokol\\s+boldy\\S*'), /podusk|tent/],
  ['tyre', tkRx('teker|sina|protektor|pokrysk|rezin', 'konel\\S*|tozup\\S*|tozdy\\S*|kesil\\S*|cisdi\\S*|cisip\\S*'), /yaryl|desil|\byel|prokol/],
  ['steer', tkRx('rul', `@|agyr\\S*|aylanm[ae]y[ae]r\\S*|aylananok\\S*|oyun\\s+ber\\S*|titre\\S*|yrgyl\\S*`, '\\b(?:masyn|ulag)\\S*\\s+(?:\\S+\\s+)?(?:saga|cepe)\\s+(?:cekyer|cekip|tartyar|gidyer)\\S*'), /podusk/],
  ['leak', tkRx('yag(?!y?s|day)|maslo|solyarka|dizel|antifriz|tosol|adblue|gidrawlik|gidravlik', 'ak(?:yar|ya|dy|ip|yp)\\S*|dam(?:yar|dy|jap|ya)\\S*|syz(?:yar|dy|yp)\\S*'), /gutar|bosa|cyra|lampoc|indikator|kart/],
  ['fire', tkRx(TK_FIRE_N, 'yan(?:yar|ya|dy|yp)\\S*|ot\\s+(?:aldy|alyp|tutdy)\\S*|tusse\\s+(?:\\S+\\s+)?(?:cykyar|cykdy|cykya)\\S*', '\\b(?:ot|yangyn)\\s+(?:aldy|tutdy|cykdy|turdy)\\b|\\btusse\\S*\\s+(?:\\S+\\s+)?(?:cykyar|cykdy|cykya)\\S*'), /glusitel|wyhlop|vyhlop|cyra|lampoc|indikator|check|\bcek\b|panel|sigaret|cilim|fara/],
  ['acc', /\bawari(?:ya|a)\S*\s+(?:\S+\s+)?(?:boldum|boldy|boldyk|dusdum|dusdi|dusduk|etdim|etdi)\b|\b(?:masyn|ulag|diwar|sutun|derweze|pritsep|bordyur|agac)\S*\s+(?:\S+\s+)?(?:urdum|kakdym|degdim|degdirdim)\b|\b(?:caknys(?:dyk|dym|dy)|uruldym|urdular)\b/, /\bdas\b|rejim/],
  ['injury', /\byaralan(?:dym|dy|dyk|ypdyr)\b|\byara\s+(?:aldym|aldy)\b|\btiz\s+komek\S*|\bskoraya\S*|\bhassahana\S*|\bbolni(?:sa|tsa|ca)\S*|\b(?:elim|ayagym|kellem|bilim|barmagym)\S*\s+(?:\S+\s+)?(?:kesildi|dowuldi|cykdy|agyryar|yaralandy)\b/],
  ['nostart', new RegExp(`\\b(?:motor|masyn|dwigatel|dvigatel|ulag)\\S*\\s+(?:\\S+\\s+)?(?:ot\\s+alm[ae]y[ae]r|ot\\s+alanok|otlanm[ae]y[ae]r|otlananok|isle(?:dip|tip)\\s+bolm[ae]y[ae]r|za[wv]od\\S*\\s+(?:bolm[ae]y[ae]r|bolanok|etm[ae]y[ae]r))\\S*|\\bza[wv]od\\S*\\s+(?:bolm[ae]y[ae]r|bolanok)\\S*|\\bstarter\\S*\\s+(?:\\S+\\s+)?(?:${TK_W}|bozul|aylanm[ae]y[ae]r)\\S*`), /agregat|holodil|xolodil|refrijerator|sowadyjy|kondi|\bpec|webasto|vebasto/],
  ['engine', tkRx('motor|dwigatel|dvigatel', 'gyz(?:dy|yar|ya|ap|yp)\\S*|guy[cj]\\S*\\s+(?:yok|az|gacdy)\\S*|cekm[ae]y[ae]r\\S*|cekenok\\S*|takylda\\S*|ses\\S*\\s+(?:\\S+\\s+)?(?:cykar|ber)\\S*', '\\b(?:glusitel|wyhlop|vyhlop)\\S*\\s+(?:\\S+\\s+){0,2}?(?:(?:gara|ak|gok)\\s+)?tusse|\\b(?:gara|gok)\\s+tusse\\s+(?:\\S+\\s+)?(?:cykyar|cykdy|cykya)\\S*|\\bawari\\S*\\s+rejim\\S*|\\btemperatura\\S*\\s+(?:\\S+\\s+)?(?:galdy|galyar|yokary)\\S*'), /agregat|holodil|xolodil|refrijerator|sowadyjy/],
  ['mirror', tkRx('ayna|zerkal', `${TK_SHK}|ayryl\\S*|cykyp\\s+gitdi\\S*|dusdi\\S*|asyl\\S*|@`, '\\bdowdum\\s+(?:\\S+\\s+)?(?:aynany|zerkal)\\S*'), /\bon\s+ayna|\bonki\s+ayna|penjire|lobow|lobov|steklo|catla|\bdas\b|gyzdyr|podogre|asak|yokary/],
  ['lights', tkRx('fara|cyra|stop\\s+cyra|gabarit|powarot|poworot|povorot|lampoc|lampa', `yanm[ae]y[ae]r\\S*|yananok\\S*|yanmady\\S*|@|${TK_SHK}`), /panel|ekran|displey|yalnys|osibk|check|\bcek\b|(?:motor|abs|tormoz|yag)\S*\s+cyra|indikator/],
  ['warnlight', /\b(?:panel|ekran|displey|pribor)\S*\s+(?:\S+\s+){0,3}?(?:yalnys|osibk|yan(?:dy|yar))\S*|\b(?:check|cek|indikator|cyra|lampoc)\S*\s+(?:\S+\s+)?(?:yan(?:dy|yar|ya|yp)|yakyp)\S*(?!\S)|\b(?:yalnys|osibka)\S*\s+(?:\S+\s+)?(?:cykdy|cykyar|gorkez)\S*/],
  ['glass', tkRx('on\\s+ayna|onki\\s+ayna|lobow|lobov|steklo|penjire\\s+ayna', `catla\\S*|yaryl\\S*|${TK_SHK}|desil\\S*`, '\\bayna\\S*\\s+(?:\\S+\\s+)?catla\\S*|\\bdas\\s+(?:\\S+\\s+){0,2}?(?:degdi|urdy|gacdy|uruldy)\\b'), /zerkal|gapdal|dwornik|dvornik|asak|yokary|acylm|yapylm|steklopod/],
  ['window', new RegExp(`\\b(?:penjire|ayna)\\S*\\s+(?:\\S+\\s+)?(?:asak|yokary)\\s+(?:dusm[ae]y[ae]r|galm[ae]y[ae]r|gitm[ae]y[ae]r|dusenok|galanok)\\S*|\\bsteklopod\\S*\\s+(?:\\S+\\s+)?(?:${TK_W}|bozul)\\S*|\\bpenjire\\S*\\s+(?:\\S+\\s+)?(?:acylm[ae]y[ae]r|yapylm[ae]y[ae]r|acylanok|yapylanok)\\S*`)],
  ['batt', tkRx('akkumulyator|akkumlyator|akkum|akum|batareya|akb', '@|oturdy\\S*|otyrdy\\S*|zaryad\\S*\\s+(?:yok|alm[ae]y[ae]r|gutardy)\\S*|gutardy\\S*|bosady\\S*'), /cyra|lampoc|indikator/],
  ['tacho', new RegExp(`\\b(?:tahograf|tachograf|taxograf)\\S*\\s+(?:\\S+\\s+){0,2}?(?:${TK_W}|bozul|okam[ae]y[ae]r|okanok|yalnys)\\S*|\\bkart\\S*\\s+(?:\\S+\\s+){0,2}?(?:okalm[ae]y[ae]r|okanok|okam[ae]y[ae]r|yitdi|yitirdim|ogurla|${TK_W}|bozul|dowul)\\S*`), /yangyc|toplivn|topliwn|zapravk|zaprawk|bank|benzin|dizel|solyark|bonus|telefon/],
  ['fuelcard', new RegExp(`\\b(?:yangyc|toplivn|topliwn|zapravk|zaprawk|dizel|solyark|benzin)\\S*\\s+kart\\S*\\s+(?:\\S+\\s+){0,2}?(?:${TK_W}|blok|gecm[ae]y[ae]r|gecenok|yitdi|ogurla|bozul)\\S*`)],
  ['lost', tkRx('acar|klyuc|tehpasport|teh\\s+pasport|resminama|dokument|hujjet', 'yit(?:di|ip|irdim|irdik|irdi)\\S*|ogurla\\S*|tapylm[ae]y[ae]r\\S*|tapm[ae]y[ae]r\\S*|tapanok\\S*', '\\byitirdim\\s+(?:\\S+\\s+)?(?:acar|klyuc|resminama|dokument|tehpasport)\\S*'), /kart/],
  ['coupling', new RegExp(`\\b(?:pritsep|pricep|polupritsep|yarymtirkeg|tirkeg)\\S*\\s+(?:\\S+\\s+){0,2}?(?:ayryldy|cykyp\\s+gitdi|cozuldi|birikm[ae]y[ae]r|birikenok|dakylm[ae]y[ae]r|dakylanok)\\S*|\\b(?:sedelka|sedel)\\S*\\s+(?:\\S+\\s+){0,2}?(?:${TK_W}|bozul|yapylm[ae]y[ae]r|yapylanok|gulplanm[ae]y[ae]r|tutm[ae]y[ae]r)\\S*`)],
  ['dryfuel', /\b(?:solyarka|yangyc|dizel|benzin|toplivo|topliwo)\S*\s+(?:\S+\s+)?(?:gutardy|gutaryp|galmady|bitdi)\b|\bbak\S*\s+(?:\S+\s+)?bos(?:ady|apdyr|\s+galdy)\S*/, /agregat|holodil|adblue|kart/],
  ['reefer', tkRx('holodilnik|holodil|xolodil|refrijerator|refrejerator|agregat|sowadyjy', `@|sowatm[ae]y[ae]r\\S*|sowadanok\\S*|sowatmady\\S*|gyzdy\\S*|yalnys\\S*|alarm\\S*|ot\\s+alm[ae]y[ae]r\\S*`), /kabina|kondi/],
  ['susp', tkRx('podusk|pnewmo|pnevmo|ressor|amortizator', `yaryl\\S*|desil\\S*|${TK_SHK}|@|yel\\S*\\s+(?:cykdy|gitdi|cykyar)\\S*|asak\\s+dusdi\\S*|cokdi\\S*`, '\\b(?:pritsep|masyn|ulag)\\S*\\s+(?:\\S+\\s+)?(?:bir\\s+tarapa\\s+)?(?:gysardy|egildi)\\S*'), /\brul/],
  ['gear', tkRx('peredac|skorost|korobk|kpp', `girm[ae]y[ae]r\\S*|girenok\\S*|@|yalnys\\S*|cykyp\\s+gidyer\\S*`, '\\b(?:stseplen|sceplen|sepleni|cepleni)\\S*\\s+(?:\\S+\\s+){0,2}?(?:@|yandy|koydi|tutm[ae]y[ae]r)\\S*'), /cyra|lampa/],
  ['climate', tkRx('kondisioner|kondicioner|konditsioner|kondey|pec\\b|pecka|gyzdyryjy|webasto|vebasto|awtonomka|avtonomka|wentilyator|ventilyator', `@|gyzdyrm[ae]y[ae]r\\S*|gyzdyranok\\S*|sowatm[ae]y[ae]r\\S*|sowadanok\\S*|ot\\s+alm[ae]y[ae]r\\S*|yanm[ae]y[ae]r\\S*`), /oturgyc|kreslo|ayna|zerkal|holodil|xolodil|agregat|refrijerator|sowadyjy|podogre/],
  ['cabkit', new RegExp(`\\b(?:oturgyc|kreslo|ayna|zerkal)\\S*\\s+(?:gyzdyryj|podogrew|podogrev)\\S*\\s+(?:\\S+\\s+)?(?:${TK_W}|bozul|gyzdyrm[ae]y[ae]r)\\S*|\\b(?:podogrew|podogrev)\\S*\\s+(?:\\S+\\s+)?(?:${TK_W}|bozul)\\S*`)],
  ['tarp', tkRx('tent|brezent', `yyrtyl\\S*|yyrtyk\\S*|desil\\S*|ayryl\\S*|${TK_SHK}`, '\\bdesik\\S*\\s+(?:\\S+\\s+)?(?:tent|brezent)')],
  ['exhaust', tkRx('glusitel|wyhlop|vyhlop', `dusdi\\S*|asyl\\S*|desil\\S*|yaryl\\S*|ayryl\\S*|${TK_SHK}|ses\\S*\\s+(?:\\S+\\s+)?(?:gaty|cykar)\\S*|@`), /\btusse\b/],
  ['visib', tkRx('dwornik|dvornik|arassalayjy|scotk|sotk|omywatel|omyvatel', `@|arassalam[ae]y[ae]r\\S*|arassalanok\\S*|${TK_SHK}|ayryl\\S*|suw\\s+(?:sepm|berm|cykarm)[ae]y[ae]r\\S*`, '\\b(?:ayna|penjire)\\S*\\s+(?:\\S+\\s+)?(?:buglan|derle)\\S*')],
  ['seat', new RegExp(`\\b(?:kemer|remen)\\S*\\s+(?:\\S+\\s+){0,2}?(?:dakylm[ae]y[ae]r|dakylanok|baglanm[ae]y[ae]r|${TK_W}|bozul|uzuldi|yyrtyl)\\S*|\\b(?:oturgyc|kreslo|siden)\\S*\\s+(?:\\S+\\s+){0,2}?(?:dowul|${TK_W}|bozul|yrgyl|gowsady)\\S*`), /gyzdyr|podogre/],
  ['wheel', new RegExp(`\\b(?:gayka|bolt)\\S*\\s+(?:\\S+\\s+){0,2}?(?:gowsady|gowsap|acyldy|yok\\b|dusdi|ayryldy)\\S*|\\bdisk\\S*\\s+(?:\\S+\\s+)?(?:egildi|yaryldy|dowuldi|catlady)\\S*|\\b(?:podsipnik|stupitsa|stupica)\\S*\\s+(?:\\S+\\s+){0,2}?(?:gyzdy|gyzyar|${TK_W}|bozul|ses|takylda)\\S*|\\b(?:kardan|reduktor)\\S*\\s+(?:\\S+\\s+){0,2}?(?:${TK_W}|bozul|ses|takylda|guwla)\\S*`), /tormoz/],
  ['stuck', /\b(?:palcyg|palcyk|gar|cage|cagy|batga|gum)\S*\s+(?:\S+\s+){0,2}?bat(?:dym|dyk|dy|yp)\S*|\bbatyp\s+gal(?:dym|dyk|dy)\b/],
  ['numplate', tkRx('nomer|belgi|dowlet\\s+belgi', `dusdi\\S*|yitdi\\S*|ogurla\\S*|ayryl\\S*|${TK_SHK}|okalm[ae]y[ae]r\\S*|gorunm[ae]y[ae]r\\S*`), /cyra|lampa|telefon|\btel\b|kart|podswet|podsvet/],
  ['adas', tkRx('datcik|sensor|radar|kamera|asistent|assistent|kruiz|tempomat', '@|yalnys\\S*|ocdi\\S*|ocup\\s+gitdi\\S*', '\\b(?:masyn|ulag)\\S*\\s+ozi\\s+(?:\\S+\\s+)?tormoz\\s+(?:basdy|beryer|basyar)\\S*')],
  ['door', tkRx('gap(?:y|ylar|ysy)\\b|dwer|dver|gidrobort|gulp|zamok', `yapylm[ae]y[ae]r\\S*|yapylanok\\S*|acylm[ae]y[ae]r\\S*|acylanok\\S*|@|acylyp\\s+gitdi\\S*|gulplanm[ae]y[ae]r\\S*|${TK_SHK}|galm[ae]y[ae]r\\S*|dusm[ae]y[ae]r\\S*`), /penjire|ayna/]];
function tkKinds(v) { const k = new Set(); for (const raw of String(v || '').split(/[.,;!?\n]+/)) { if (!/[a-zа-яёәңөүҗ]/i.test(raw)) continue; const p = tkFold(raw).replace(TK_NEG, ' '); if (!TK_OK.test(p)) for (const [n, rx, ex] of TK_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); } if (k.has('acc')) k.delete('injury'); return k; }








const HY_MAP = { ա: 'a', բ: 'b', գ: 'g', դ: 'd', ե: 'e', զ: 'z', է: 'e', ը: 'y', թ: 't', ժ: 'zh', ի: 'i', լ: 'l', խ: 'kh', ծ: 'ts', կ: 'k', հ: 'h', ձ: 'dz', ղ: 'gh', ճ: 'ch', մ: 'm', յ: 'y', ն: 'n', շ: 'sh', ո: 'o', չ: 'ch', պ: 'p', ջ: 'j', ռ: 'r', ս: 's', վ: 'v', տ: 't', ր: 'r', ց: 'ts', ւ: 'v', փ: 'p', ք: 'k', և: 'ev', օ: 'o', ֆ: 'f' };
const hyLat = (s) => String(s || '').toLowerCase().replace(/[՛՜՞]/g, '').replace(/ու/g, 'u').replace(/և/g, 'ev').replace(/[ա-ֆ]/g, (c) => HY_MAP[c] ?? c);
const HY_OK = /\b(?:veranorog|norogets|norogel\s+en|sarkets|sarkel\s+en|pokhets|pokhel\s+en|pokhvel)\S*|\bnorits\s+(?:\S+\s+)?ashkhat|\bamen\s+inch\s+(?:\S+\s+)?(?:kargin|normal|lav)|\bkhndir\s+chk|\bnormal\s+(?:\S+\s+)?ashkhat/;
const HY_KINDS = [['brake', /\b(?:argelak|tormuz|tormoz)\S*\s+(?:\S+\s+)?(?:ch[ei]n?\s+(?:ashkhat|brn)|tuyl)|\bodi\s+chnshum\S*\s+(?:\S+\s+)?(?:ynk|ijn)/, /\b(?:dzerki\s+(?:argelak|tormuz|tormoz)|dzernargelak|ruchnik)/],
  ['parkbrake', /\b(?:dzerki\s+(?:argelak|tormuz|tormoz)|dzernargelak|ruchnik)\S*\s+(?:\S+\s+)?(?:ch[ei]n?\s+(?:brn|ashkhat|pah)|pchats|tuyl)/],
  ['flat', /\b(?:anvadogh|aniv|shin|kolyos)\S*\s+(?:\S+\s+)?(?:payt|tsakv|ijel|nstel|od\s+e\s+togh)|\bpaytets\S*\s+(?:\S+\s+)?(?:anvadogh|aniv)/, /\b(?:ptutak|gayk)/],
  ['tyre', /\b(?:anvadogh|shin)\S*\s+(?:\S+\s+)?(?:mash|chakv|chakel)/],

  ['flat', /\b(?:anvadogh|shin)\S*\s+(?:\S+\s+)?(?:pchats|jardv)/, /pahest/],
  ['tyre', /\b(?:anvadogh|shin)\S*\s+(?:\S+\s+)?(?:vnasv|ktrv)/, /pahest/],
  ['steer', /\bghek\S*\s+(?:\S+\s+)?(?:tsanr|khagh|lyuft|chi\s+ptt)|\b(?:aj|dzakh)\s+(?:\S+\s+)?(?:kash|tan)um/],
  ['leak', /\b(?:yugh|varelik|dizel|solyar|antifriz|tosol|adblu|jur)\S*\s+(?:\S+\s+)?(?:hos|katum|kat\S*\s+e|artahos)|\bartahos/],
  ['fire', /\bvarvum\s+e\b|\bayrv|\bkrak(?!mar)|\bhrdeh|\btsukh|\bpozhar/, /\b(?:khlatsutsich|glushitel|vikhlop|chek|lamp|indikator|luys|far)/],
  ['acc', /\bvtar(?!ayin)|\bavaria(?:\s|$)|\bavariayi\s+entark|\bbakhv|\bkhpets|\bkhpel\s+em/],

  ['acc', /\b(?:bernatar|mekena|trak|kamaz|kisakts|pritsep|avtomeken)\S*\s+(?:\S+\s+)?(?:shur\s+e\s+ek|shur\s+ekav|shrjv)|\bdurs\s+e\s+ek\S*\s+chanaparh|\bchanaparhits\s+durs|\b(?:arun|arvi|kharam)\b/, /\bber[yi]?\b|palet|\bchi\s+(?:shrjv|shur)|\bchi\s+(?:\S+\s+)?(?:ynkel|mtel|gnatsel|arun|arvi|kharam)|\bche\b/],

  ['stuck', /\b(?:arun|arvi|kharam)\b/, /\bber[yi]?\b|palet|\bchi\s+(?:\S+\s+)?(?:ynkel|mtel|gnatsel|arun|arvi|kharam)|\bche\b/],
  ['injury', /\b(?:viravor|travm|vnasvatsk)/],
  ['nostart', /\b(?:sharzhich|motor|mekena)\S*\s+(?:\S+\s+)?chi\s+(?:mian|varv)|\b(?:sharzhich|motor)\S*\s+(?:\S+\s+)?(?:anjat|hangav)/],
  ['engine', /\b(?:gertakats|takanum|erum\b)|\b(?:sharzhich|motor)\S*\s+(?:\S+\s+)?(?:aghmk|takum|uzh\s+chuni|dzayn)|\b(?:khlatsutsich|glushitel|vikhlop)\S*\s+(?:\S+\s+)?tsukh|\btsukh\S*\s+(?:\S+\s+)?(?:khlatsutsich|glushitel|vikhlop)|\bturbin\S*\s+(?:\S+\s+)?(?:pchats|svvum|dzayn)/],
  ['mirror', /\b(?:hayel|zerkal)\S*\s+(?:\S+\s+)?(?:kotr|jard|ynk|chakv)/],
  ['lights', /\b(?:luys|far|lamp|gabarit|stop|povorot|shrjadardz)\S*\s+(?:\S+\s+)?(?:ch[ei]n?\s+(?:varv|ashkhat)|ayrvel)/, /\bvtarayin/],
  ['warnlight', /\b(?:chek|indikator|lampochk|lamp)\S*\s+(?:\S+\s+)?varv(?:ets|el|um)|\bskhal\S*\s+(?:\S+\s+)?(?:grum|tsuyts|varv)/, /\bch[ei]n?\s+varv/],
  ['glass', /\b(?:dimapak|apak|lobov)\S*\s+(?:\S+\s+)?(?:chak|kotr|jard)|\bkar\s+(?:\S+\s+)?(?:dipav|kpav)\S*\s+(?:\S+\s+)?(?:dimapak|apak)/],
  ['window', /\b(?:patuhan|apak)\S*\s+(?:\S+\s+)?chi\s+(?:ijn|bardzr|batsv|pakv)/],
  ['batt', /\b(?:akumulyator|akkumulyator|akum|martkots)\S*\s+(?:\S+\s+)?(?:nst|litskatap|chi\s+ashkhat|merel)/],
  ['tacho', /\btakhograf\S*\s+(?:\S+\s+)?(?:chi|skhal|pchats)|\bvarordi\s+kart\S*\s+(?:\S+\s+)?(?:kortsr|korav|korel|chi\s+kard|kotrv)/],
  ['fuelcard', /\b(?:vareliki|benzini|dizeli)\s+kart\S*\s+(?:\S+\s+)?(?:chi|blok|kortsr)/],
  ['lost', /\b(?:banali|klyuch|pastatght|tekhpasport|tekhandznagir|dokument)\S*\s+(?:\S+\s+)?(?:kortsr|korav|korel|chem\s+gtnum)|\bkortsr\S*\s+(?:\S+\s+)?(?:banali|pastatght|tekhpasport|dokument)/],
  ['coupling', /\b(?:ktsord(?!ich)|kisakts|pritsep|polupritsep|sedl|treyler)\S*\s+(?:\S+\s+)?chi\s+(?:mian|kts|amr|bats)/],
  ['dryfuel', /\b(?:varelik|dizel|solyar|benzin)\S*\s+(?:\S+\s+)?(?:verjats|prts)|\bbak\S*\s+(?:\S+\s+)?datark/],
  ['reefer', /\b(?:sarnaran|ref|refrizherator|khaladilnik|kholodilnik|agregat|termoking)\S*\s+(?:\S+\s+)?(?:chi\s+(?:saretsn|sarets|ashkhat|mian)|pchats|skhal)/],
  ['susp', /\b(?:pnevmo|bardz(?!r)|podushk|resor|amortizator)\S*\s+(?:\S+\s+)?(?:payt|kotr|hos|od\s+e\s+togh|chi\s+ashkhat|pchats)/],
  ['gear', /\b(?:pokhantsum|peredach|karobk|skorost)\S*\s+(?:\S+\s+)?(?:ch[ei]n?\s+(?:mtn|mian)|pchats|dzayn)|\b(?:ktsordich|stseplen)\S*\s+(?:\S+\s+)?(?:buks|sahum|chi\s+ashkhat|pchats)/],
  ['climate', /\b(?:jeruts|konditsioner|pechk|avtonomk|vebasto|webasto|klimat)\S*\s+(?:\S+\s+)?(?:chi\s+(?:ashkhat|mian|tak|sarets|varv)|pchats)/, /\bnstateghi\s+(?:takats|jeruts)/],
  ['cabkit', /\bnstateghi\s+(?:takats|jeruts)\S*\s+(?:\S+\s+)?(?:chi|pchats)/],
  ['tarp', /\b(?:tent|brezent)\S*\s+(?:\S+\s+)?(?:patrv|ktrv|pchats|ynk)/],
  ['exhaust', /\b(?:khlatsutsich|glushitel|vikhlop)\S*\s+(?:\S+\s+)?(?:ynkav|ynkel|kotr|tsakv|dzayn|pchats)/],
  ['visib', /\b(?:makrich|apakemakrich|dvornik)\S*\s+(?:\S+\s+)?(?:ch[ei]n?\s+ashkhat|pchats|kotr)/],
  ['seat', /\b(?:amragot|remen)\S*\s+(?:\S+\s+)?(?:chi|kotr|pchats)|\b(?:nstategh(?!i\s+(?:takats|jeruts))|kreslo)\S*\s+(?:\S+\s+)?(?:kotr|pchats|chi\s+(?:kargav|ashkhat))/],
  ['wheel', /\b(?:ptutak|gayk)\S*\s+(?:\S+\s+)?(?:tulats|ynk|kotr|chka)/],
  ['stuck', /\b(?:tsekh|dzyun|dzyan|avaz)\S*\s+(?:\S+\s+)?(?:khrv|mnats)|\bkhrv(?:ets|el)|\b(?:mekena|aniv)\S*\s+(?:\S+\s+)?buks/, /\b(?:khtsanum|probk)/],
  ['numplate', /\b(?:hamaranish|nomer)\S*\s+(?:\S+\s+)?(?:ynk|kortsr|korav|kotr|chi\s+erevum)/],
  ['adas', /\b(?:tesakhtsik|kamer|radar|sensor|datchik|asistent)\S*\s+(?:\S+\s+)?(?:chi\s+ashkhat|pchats|skhal)/],
  ['door', /\b(?:dur(?:y|n|ry)?|drner\S*|(?:gidro|hidro)bort\S*)\s+(?:\S+\s+)?(?:chi\s+(?:pakv|batsv|ashkhat|bardzr|ijn)|chen\s+(?:pakv|batsv)|pchats)/],

  ['load', /\b(?:ber[yi]?|bernery?|palet(?:ner[yi]?|n[yi])?)\s+(?:\S+\s+)?(?:teghasharzh|ynk|shur\s+e\s+ek|shrjv|sahets)/, /goti|amrak/],
  ['lashgear', /\b(?:(?:ber[yi]?|amrakm\S*)\s+(?:\S+\s+)?got|gotiner)\S*\s+(?:\S+\s+)?(?:ktrv|pokv|jardv|pchats)/, /generator|amragot|motor|sharzhich/],
  ['theft', /\bgogh(?:ats|ut)\S*/],
  ['vandal', /\bvandal|\binch\s*-?\s*or\s+mek\S*\s+(?:\S+\s+){0,3}?(?:kerts|jard|ktr|nerk)/]];

const HY_NEG = /\bch(?:i|en|em|enk|es)\s+(?:\S+\s+)?(?:arun|arvi|kharam)\b(?:\s+mej)?|\bch(?:i|en|em|enk|es)\s+(?:hos|kat|kotr|payt|tsakv|chakv|bakhv|vnasv|ayrv|ijel|ynk|jard|viravor|pchats|ktrv|gogh|teghasharzh)\S*|\b(?:kotrv|payt|tsakv|chakv|vnasv|jard|pchats|ktrv|teghasharzhv)\S*\s+che\b|\bchkotrv\S*/g;
function hyKinds(v) { const k = new Set(); for (const raw of String(v || '').split(/[.,;!?\n։՝]+/)) { if (!/[ա-ֆԱ-Ֆ]/.test(raw)) continue; const p = hyLat(raw).replace(HY_NEG, ' '); if (!HY_OK.test(p)) for (const [n, rx, ex] of HY_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); } if (k.has('acc')) k.delete('injury'); return k; }





const GR_MAP = { α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th', ι: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', π: 'p', ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'y', φ: 'f', χ: 'ch', ψ: 'ps', ω: 'o' };
const grLat = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ου/g, 'u').replace(/αυ/g, 'av').replace(/ευ/g, 'ev').replace(/[α-ω]/g, (c) => GR_MAP[c] ?? c);
const grCo = (n, f) => new RegExp(`^(?=.*\\b(?:${n}))(?=.*(?:${f}))`);
const GR_NW = 'den\\s+(?:\\S+\\s+)?(?:dulev|leiturg)|chalas';
const GR_OK = /\b(?:episkev|ftiax|ftiach|allax|allach)|\bxana\s+(?:\S+\s+)?(?:dulev|leiturg)|\bdulev\S*\s+(?:\S+\s+)?(?:kanonik|xana)|\bola\s+(?:\S+\s+)?(?:kala|entax|ok)\b|\bkanena\s+provlim|\bden\s+(?:yparchei|echei|echo)\s+(?:\S+\s+)?provlim/;
const GR_KINDS = [['brake', grCo('fren', `den\\s+(?:\\S+\\s+)?(?:pian|krat|stamat)|adyna|${GR_NW}`), /\bch(?:e)?irofren/],
  ['brake', /\bpiesi\s+(?:tu\s+)?aer\S*\s+(?:\S+\s+)?(?:peft|epese|chan)|\b(?:peft|epese)\S*\s+(?:i\s+)?piesi\s+(?:tu\s+)?aer/],
  ['parkbrake', grCo('che?irofren', `den\\s+(?:\\S+\\s+)?(?:krat|pian|xekol|lyn|kateva)|kollis|${GR_NW}`)],
  ['flat', grCo('lastich|elastik|rod(?:a|es)\\b', 'eskase|skas|trypi|xefusk|pagktser|pagkts'), /\b(?:paximad|mpulon)/],
  ['tyre', grCo('lastich|elastik', 'fagom|fagothik|gyalis|fthar')],

  ['flat', grCo('lastich|elastik', 'chalas'), /efedrik|rezerv|yalokathar|ialokathar|katharist|\bneru|potism/],
  ['tyre', grCo('lastich|elastik', 'katestramm|kommen|kopik'), /efedrik|rezerv|yalokathar|ialokathar|katharist|\bneru|potism/],
  ['steer', grCo('timon', `vary|sklir|tremei|tremun|paizei|tzogk|den\\s+(?:\\S+\\s+)?gyriz|${GR_NW}`)],
  ['steer', /\b(?:travaei|travai|pigainei|fevgei)\s+(?:\S+\s+)?(?:dexia|aristera)/],
  ['leak', grCo('lad|petrel|ntizel|diizel|antipsyktik|kavsim|adblu|ygr', 'trech|stazei|stazun|diarro|chyn'), /\b(?:amortis|aeranart|fusk)/],
  ['leak', /\bdiarro/],
  ['fire', /\b(?:fotia|flog|kaigetai|kaigontai|pyrkagi|kapn)/, /\b(?:pyrosvest|exatmis|eksatmis|kapniz)/],
  ['acc', /\b(?:atychim|trochai|trakar|sygkrus|chtypis(?:a|ame|e)\b|epesa\s+pano)/, /\b(?:petr|chalaz)/],

  ['acc', /\b(?:anatrap|anapodogyris|ekane\s+takla|ektos\s+dromu)|\bvgik\S*\s+(?:\S+\s+){0,2}?apo\s+ton\s+dromo|\bchantak/, /fortio|fortiu|palet|kivoti|\bden\s+(?:\S+\s+)?(?:anatrap|anapodogyris|vgik)|\bden\s+(?:\S+\s+){1,3}?chantak/],

  ['stuck', /\bchantak/, /fortio|fortiu|palet|kivoti|\bden\s+(?:\S+\s+){1,3}?chantak/],
  ['injury', /\b(?:travmat|aimorag|kopika\b|traumat)/],
  ['nostart', grCo('kinitir|michan|motor|amaxi|forti|tirakt', 'den\\s+(?:\\S+\\s+)?(?:xekin|anav)|esvise|svinei')],
  ['nostart', /\bden\s+(?:\S+\s+)?pairn\S*\s+(?:\S+\s+)?mpros/],
  ['engine', grCo('kinitir|motor|michan', 'zestain|thoryv|chtypa|den\\s+(?:\\S+\\s+)?trav|adyna|chanei\\s+(?:\\S+\\s+)?dynam|kovei'), /\bden\s+(?:\S+\s+)?pairn|\bsvin|\besvise/],
  ['engine', /\b(?:ypertherm|turmpin\S*\s+(?:\S+\s+)?(?:sfyr|chalas))|^(?=.*\b(?:exatmis|eksatmis))(?=.*\bkapn)/],
  ['mirror', grCo('kathreft|kathrept', `espase|spas|ragis|epese|kopike|den\\s+(?:\\S+\\s+)?(?:kuniet|rythmiz)|${GR_NW}`)],
  ['lights', grCo('fota\\b|fanar|lamp|flas\\b|provole|stop\\b', `den\\s+(?:\\S+\\s+)?anav|kaike|kammen|espase|${GR_NW}`), /\balarm|\b(?:lampaki|lychnia)\s+(?:tu\s+)?(?:kinitir|ladiu|mpatari)/],
  ['warnlight', grCo('lamp|endeix|lychni|tsek|check', 'anap|anav'), /\bden\s+(?:\S+\s+)?anav|\bkaik|\bfota\b|\bfanar/],
  ['warnlight', /\bvgazei\s+(?:\S+\s+)?(?:lathos|sfalma|minyma)|\b(?:lathos|sfalma)\s+(?:\S+\s+)?(?:othon|tamplo|kontrol)/, /\b(?:tachograf|psygei|frigo|psyktik|thermo\s*king|termokin|thermokin|carrier|kamer|radar|aisthitir|sensor)/],
  ['glass', grCo('parmpriz|parbriz|tzam', 'ragis|espase|spas|petr'), /\bden\s+(?:\S+\s+)?(?:kateva|aneva)/],
  ['window', grCo('tzam|parathyr', 'den\\s+(?:\\S+\\s+)?(?:kateva|aneva|anoig|klein)|kollis')],
  ['batt', grCo('mpatari|batari|syssorevt', `adeias|epese|pesmen|den\\s+(?:\\S+\\s+)?fortiz|teleiose|${GR_NW}`), /\b(?:lampaki|lychnia)\s+(?:tis\s+)?mpatari/],
  ['tacho', grCo('tachograf', `den\\s+(?:\\S+\\s+)?(?:diava|dechet)|sfalma|lathos|kollis|${GR_NW}`)],
  ['tacho', grCo('karta\\s+(?:tu\\s+)?odig', `echasa|chathik|espase|den\\s+(?:\\S+\\s+)?(?:diava|dechet)|${GR_NW}`)],
  ['fuelcard', grCo('karta\\s+(?:\\S+\\s+)?(?:kavsim|petrel|ntizel)', `den\\s+(?:\\S+\\s+)?(?:pern|dechet)|mplok|echasa|chathik|${GR_NW}`)],
  ['lost', grCo('kleidi|adeia\\s+kykloforias|chartia|eggraf|engraf', 'echasa|chathik|chamen|den\\s+(?:\\S+\\s+)?vrisk|klep'), /\bkarta/],
  ['lost', /\bkleidosa\s+(?:\S+\s+){0,3}kleidi/],
  ['coupling', grCo('pemptos\\s+troch|pempto\\s+troch|sela\\b|imirymulk|rymulk|karots|kotsadur', 'den\\s+(?:\\S+\\s+)?(?:kumpon|kleidon|xekleid|anoig|pian|kathet)|xezevg')],
  ['dryfuel', grCo('petrel|kavsim|ntizel|diizel|venzin|ntepozit|rezerv', 'teleios|emeina\\s+(?:\\S+\\s+)?(?:choris|apo)|adei'), /\b(?:karta|adeia\s+kykloforias)/],
  ['reefer', grCo('psygei|psyktik|frigo|termokin|thermokin|carrier', `den\\s+(?:\\S+\\s+)?(?:krya|kryon|pagon|psych|anav|xekin)|sfalma|alarm|zestain|${GR_NW}`)],
  ['susp', grCo('aeranart|anartis|fusk|amortis|sust|elatir|mpalon', `espase|spas|skas|trypi|chan\\S*\\s+(?:\\S+\\s+)?aer|xefusk|kathise|stazei|trech|den\\s+(?:\\S+\\s+)?(?:sikon|aneva)|${GR_NW}`), /\b(?:lastich|elastik)/],
  ['gear', grCo('tachytit|sasman|kivotio|ntempragiaz|symplekt', `den\\s+(?:\\S+\\s+)?(?:mpain|allaz|pian)|kollis|vgainei|petag|glistr|myriz|${GR_NW}`)],
  ['climate', grCo('kalorifer|thermansi|klimatis|erkontision|aircondition|webasto|vebasto|avtonom|anemistir', `den\\s+(?:\\S+\\s+)?(?:zestain|kryon|anav|pairn|vgaz)|${GR_NW}`), /\bkathism/],
  ['cabkit', /^(?=.*\b(?:thermansi|zestama)\s+(?:\S+\s+)?kathism)(?=.*(?:\bden\b|chalas))/],
  ['tarp', grCo('musam|tent(?:a|es)\\b|kurtin', 'skis|trypi|xekremast|xelyth|chalas|espase')],
  ['exhaust', grCo('exatmis|eksatmis', 'epese|kremet|espase|trypi|thoryv|sfyr|xekollise|xekremast|chalas'), /\bkapn/],
  ['visib', grCo('yalokatharist|ygalokatharist|katharistir|sfoggar|vroxopaid', `den\\s+(?:\\S+\\s+)?(?:katharizei|kuniet)|espase|${GR_NW}`)],
  ['visib', /\bden\s+(?:\S+\s+)?vgazei\s+nero/],
  ['seat', grCo('zoni|zones', `den\\s+(?:\\S+\\s+)?(?:kumpon|kleidon|tylig|mazev)|kollis|espase|skis|${GR_NW}`)],
  ['seat', grCo('kathism', `espase|spas|den\\s+(?:\\S+\\s+)?(?:rythmiz|aneva|kateva|kleidon)|skis|${GR_NW}`), /\b(?:thermansi|zestama)/],
  ['wheel', grCo('paximad|mpulon|zant', 'chalar|xevid|leip|epese|kopike|espase|ragis')],
  ['stuck', /\b(?:kollis|vuliax|spinar|glistr)\S*\s+(?:\S+\s+){0,3}(?:lasp|chion|ammo|chomat|lakk)|\b(?:lasp|chion|ammo|chomat)\S*\s+(?:\S+\s+){0,3}(?:kollis|vuliax|spinar)|\bvuliax/],
  ['numplate', grCo('pinakid', 'epese|chathik|echasa|espase|xekollise|den\\s+(?:\\S+\\s+)?(?:fainet|diavaz)|leipei|klap')],
  ['adas', grCo('kamer|radar|aisthitir|sensor', `den\\s+(?:\\S+\\s+)?(?:deichn|vlep)|sfalma|${GR_NW}`)],
  ['door', grCo('port(?:a|es|as|aki)\\b|ydravlik|anypsotik', `den\\s+(?:\\S+\\s+)?(?:klein|anoig|kleidon|xekleid|aneva|kateva)|kollis|espase|${GR_NW}`), /\b(?:tzam|parathyr)/],

  ['load', grCo('fortio|fortiu|palet|kivoti', 'metakinith|metatopist|glistris|epesan|epese|anatrap|gyris|xefyg'), /imant|kastani|\bxana\s+(?:\S+\s+)?(?:des|sfix)/],
  ['lashgear', grCo('imantes|imant\\S*\\s+(?:\\S+\\s+)?(?:fortiu|prosdes|deses|sfixis)|kastani', 'kopik|espase|spas|chalas|skist'), /dynamo|alternat|chronism|kinitir|ventilat|zoni/],
  ['theft', /\b(?:eklepsa|eklepse|klapik|klemmen|klopi)\S*/],
  ['vandal', /\bvandal|\bkapoi(?:os|oi|a)\s+(?:\S+\s+){0,3}?(?:gratzun|charax|vapse|vapsan|eskise|espase|trypise)/]];

const GR_NEG = /\bden\s+(?:\S+\s+){1,3}?chantak\S*|\bden\s+(?:\S+\s+)?(?:espase|ragise|eskase|trypise|trech|staz|kaigetai|chtypis|trakar|epese|chalase|chalarose|skistike|travmatist|pire\s+fotia|epiase\s+fotia|kopik|eklep|klapik|metakinith|epese|epesan)\S*|\bden\s+(?:einai|ine)\s+(?:\S+\s+)?(?:spasmen|ragismen|fagomen|chalasmen|trypim|travmatism|katestramm|kommen)\S*|\bchoris\s+(?:\S+\s+)?(?:diarro|zimi|atychim|provlim)\S*/g;
function grKinds(v) { const k = new Set(); for (const raw of String(v || '').split(/[.,;!?\n\u00b7\u0387\u037e]+/)) { if (!/[\u0370-\u03ff\u1f00-\u1fff]/.test(raw)) continue; const p = grLat(raw).replace(GR_NEG, ' '); if (!GR_OK.test(p)) for (const [n, rx, ex] of GR_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); } if (k.has('acc')) k.delete('injury'); return k; }






const hiFold = (s) => ' ' + String(s || '').toLowerCase().replace(/[’'`´-]/g, ' ').replace(/a{2,}/g, 'a').replace(/e{2,}/g, 'i').replace(/o{2,}/g, 'u').replace(/w/g, 'v')
  .replace(/\b(?:nahin|nhi|nhin|nai|ni)\b/g, 'nahi').replace(/\b(?:gya|gyi|gai|gayi|gae|gaye|gye)\b/g, 'gaya').replace(/\bho(?=gaya\b)/g, 'ho ').replace(/\bhora\b/g, 'ho raha').replace(/\brh([aie])\b/g, 'rah$1').replace(/\bkr\b/g, 'kar').replace(/\bgaddi\b/g, 'gadi') + ' ';
const HI_MARK = /\b(?:nahi|gaya|raha|rahi|rahe|hai|hain|ho|hua|hui|hoya|kar|karta|karti|karda|kardi|karde|diya|di|mein|vich|se|ke|ki|ka|pe|lag|lagi|laga|bahut|bhut|apne|padi|pada|bulao|maine|mujhe|meri|mera|bhi|aur|nu|kisi|chura|churaya|churayi|liya|liye|gayab|gaib|nikal)\b/;
const HI_D = 'kam\\s+nahi\\s+ka?r\\S*|nahi\\s+chal\\S*|chal\\s+nahi|kharab\\S*|kharb\\S*|bigad\\S*|bigar\\S*|fail\\s+ho\\S*|vork\\s+nahi';
const HI_BRK = 'tut\\S*|phut\\S*';
const hiRx = (n, d, extra) => new RegExp(`\\b(?:${n})\\S*\\s+(?:\\S+\\s+){0,3}?(?:${d.split('@').join(HI_D)})${extra ? '|' + extra.split('@').join(HI_D) : ''}`);
const HI_OK = /\b(?:thik|sahi|repair|ripear|ripeyar)\s+(?:kar\s+(?:diya|di|diye|dia|liya|li)|ho\s+gaya|hai\b|hain\b|kiya)|\b(?:badal|badl|change|chenj|replace)\s+(?:kar\s+)?(?:diya|di|diye|dia|liya|li|gaya|kiya)\b|\bsab\s+(?:\S+\s+)?(?:thik|sahi|ok|badhiya|badiya)|\bkoi\s+(?:\S+\s+)?(?:problem|dikat|dikkat|pareshani|kharabi|issue)\s+nahi|\bab\s+(?:\S+\s+)?(?:thik|sahi)\s+(?:se\s+)?(?:chal|kam\s+kar)/;
const HI_NEG = /\bnahi\s+(?:tapak|tapk|ris|beh|bah|leak|lik|phat|fat|tut|gir|kho|ghis|hil|takra|thok|lagi\s+ag|ai\s+chot|lagi\s+chot)\S*|\b(?:tapak|tapka|phat|phata|phati|tuta|tuti|tute|gira|giri|takra|thoka|ghisa)\S*\s+nahi\b|\bkoi\s+(?:\S+\s+)?(?:leak|lik|crack|krek|puncture|pancher|accident|exident|chot)\s+nahi\b|\b(?:leak|lik|crack|krek|puncture|pancher|accident|exident)\s+nahi\s+(?:hai|hua|hui|ho)\b/g;
const HI_KINDS = [['brake', hiRx('brake|brek', '@|nahi\\s+(?:lag|pakad|pakar)\\S*|lag\\s+nahi|jam\\s+ho\\S*', '\\b(?:air|hava)\\s+(?:ka\\s+|ki\\s+)?(?:pressure|presar|dabav)\\S*\\s+(?:\\S+\\s+){0,2}?(?:kam\\s+ho|gir|nahi\\s+ban|dovn\\s+ho)\\S*'), /hand\s*brake|hendbrek|parking\s+brake|light|lait|batti|lamp|\bdisc|\bdisk|apne\s+ap/],
  ['parkbrake', new RegExp(`\\b(?:hand\\s*brake|hendbrek|parking\\s+brake)\\S*\\s+(?:\\S+\\s+){0,3}?(?:nahi\\s+(?:chhut|chut|khul|lag|pakad)|jam|atak|${HI_D})\\S*|\\b(?:gadi|truck|trak)\\S*\\s+(?:\\S+\\s+)?apne\\s+ap\\s+(?:\\S+\\s+)?(?:chal\\s+(?:padi|pada|gaya)|lurak|khisak|rol)\\S*`)],
  ['flat', hiRx('tyre|tayar|tire|tair|tyar|pahiya|pahia|chaka|chakka', 'puncture|pancher|panchar|pankchar|phat\\S*|fat\\s+gaya|burst\\s+ho|hava\\s+(?:\\S+\\s+)?(?:nahi|nikal|kam\\s+ho|khatam)\\S*|baith\\s+gaya|bait\\s+gaya', '\\b(?:puncture|pancher|panchar|pankchar)\\s+ho\\s+gaya'), /air\s*bag|airbag|erbeg|tirpal|tarpal|tarpaulin|nut\b|nat\b|bolt/],
  ['tyre', hiRx('tyre|tayar|tire|tair|tyar', 'ghis\\S*|kat\\s+gaya|cut\\s+lag\\S*|ganja\\s+ho'), /puncture|pancher|panchar|phat|hava\s/],

  ['flat', hiRx('tyre|tayar|tire|tair|tyar', 'kharab\\S*|kharb\\S*|bigad\\S*|bigar\\S*|tut\\S*'), /kharab\s+nahi|nahi\s+(?:hai\s+)?kharab|stepn|spare|ispeyar|viper|vaipar|air\s*bag|tirpal|tarpal|\bnut\b|\bnat\b|bolt/],
  ['tyre', hiRx('tyre|tayar|tire|tair|tyar', 'damage\\S*|demej\\S*|dameg\\S*'), /puncture|pancher|panchar|phat|hava\s|stepn|spare|ispeyar|damage\s+nahi|nahi\s+(?:\S+\s+)?damage/],
  ['steer', hiRx('stiring|stering|steering|staring|stearing', '@|bhari|bhaari|hil\\s+rah\\S*|dhila|dhili|kamp\\S*|thartha\\S*|ghum\\s+nahi|nahi\\s+ghum\\S*|khinch\\S*|khich\\S*', '\\b(?:gadi|truck|trak)\\S*\\s+(?:\\S+\\s+)?(?:ek\\s+taraf|left|right|baen|dae?n)\\s+(?:\\S+\\s+)?(?:khinch|khich|bhag)\\S*')],
  ['leak', hiRx('tel|oil|ail|diesel|disel|dijal|dizal|culant|kulent|kulant|adblue|hydraulic|haidrolik', 'tapak\\S*|tapk\\S*|leak\\s+ho\\S*|lik\\s+ho\\S*|ris\\s+rah\\S*|beh\\s+rah\\S*|bah\\s+rah\\S*|gir\\s+rah\\S*'), /khatam|light|lait|batti|card|kard|\btank\s+(?:\S+\s+)?khali/],
  ['fire', /\bag\s+(?:(?!nahi)\S+\s+)?(?:lag|pakad)\S*|\b(?:cabin|kebin|engine|enjin|injan|gadi|truck|trak|trailer|treler|vire|vayar|tar|seat|battery|bettri|batri)\S*\s+(?:\S+\s+){0,3}?(?:se\s+)?(?:dhuan|dhua|dhuva|dhunva|smoke)\s+(?:\S+\s+)?(?:nikal|a\s+rah|uth)\S*|\b(?:cabin|kebin|gadi|truck|trak|tyre|tayar|trailer|treler|vire|vayar|tar|seat)\S*\s+(?:\S+\s+)?jal\s+(?:gaya|raha|rahi|rahe)\b/, /silencer|sailensar|silensar|exhaust|eksast|light|lait|batti|lamp|bulb|balb|clutch|cluch|klach|fuse|fyuz|nahi\s+jal|indicator|check/],
  ['acc', /\b(?:accident|exident|aksident|eksident)\s+(?:\S+\s+)?(?:ho\s+gaya|hua|hui|kar\s+(?:diya|di))|\bthok\s+(?:di|diya|gaya|lag\S*)\b|\btakra\s+(?:gaya|gayi|diya|di)|\btakar\s+(?:ho|lag|mar|mari)\S*|\bthoki\b/],

  ['acc', /\bpalat\s+(?:gay|gai|gi)|\bpalti\s+(?:kha|ma)|\b(?:road|sadak|rasta)\s+se\s+(?:\S+\s+)?(?:utar|neeche|nikal)/, /\bmaal|saman|nahi\s+(?:\S+\s+)?palat/],

  ['acc', /\b(?:khai|khadd?|nal[ae]|nahar)\s+me\S*\s+(?:\S+\s+)?(?:gir|utar|palat|ghus|chal[ai]\s+ga)\S*|\b(?:truck|trak|trok|gadi|gaddi|tral+a|tanker|kantenar|container)\S*\s+(?:\S+\s+)?(?:khai|khadd?|nal[ae]|nahar)\s+me\S*\s+(?:hai|he|pada|padi|phas|fas)\b/, /\bmaal|saman|pallet/],

  ['stuck', /\b(?:khai|khadd?|nal[ae]|nahar)\s+me\S*\s+(?:\S+\s+)?(?:gir|utar|palat|ghus|chal[ai]\s+ga)\S*|\b(?:truck|trak|trok|gadi|gaddi|tral+a|tanker|kantenar|container)\S*\s+(?:\S+\s+)?(?:khai|khadd?|nal[ae]|nahar)\s+me\S*\s+(?:hai|he|pada|padi|phas|fas)\b/, /\bmaal|saman|pallet/],

  ['acc', /\bult(?:a|e|i)\s+ho\s+(?:gay|gai|gi)/, /\bmaal|saman|pallet|nahi\s+(?:\S+\s+)?ult/],
  ['injury', /\bchot\s+(?:\S+\s+)?(?:lag|lagi|ayi|ai|a\s+gayi)\b|\bzakhmi\b|\bghayal\b|\bkhun\s+(?:\S+\s+)?(?:nikal|beh|bah)\S*|\b(?:ambulance|embulens)\s+(?:\S+\s+)?(?:bula|chahiye|bulao)\S*|\b(?:aspatal|haspatal)\b/],
  ['nostart', /\b(?:engine|enjin|injan|gadi|truck|trak|motor)\S*\s+(?:\S+\s+){0,2}?(?:start|istart)\s+nahi\b|\bstart\s+nahi\s+(?:ho|hu|kar)\S*|\b(?:engine|enjin|injan|gadi|truck|trak)\S*\s+(?:\S+\s+)?band\s+ho\s+(?:gaya|jata|jati|ja\s+raha|ja\s+rahi)\b|\bself\s+nahi\s+(?:le|lag|chal)\S*|\bstarter\S*\s+(?:\S+\s+)?(?:kam\s+nahi|kharab|nahi\s+chal)\S*/, /reefer|rifer|refar|\bac\b|heater|hitar|hiter|agregat|unit|yunit|thanda|vebasto/],
  ['engine', hiRx('engine|enjin|injan|motor', 'garam|garm|overheat|ovarhit|avaz|avaj|khat\\s*khat|pick\\s*up\\s+nahi|pikap\\s+nahi|pover\\s+nahi|pavar\\s+nahi|takat\\s+nahi|jhatk\\S*|dhak\\s+dhak', '\\b(?:silencer|sailensar|silensar|exhaust|eksast)\\S*\\s+(?:\\S+\\s+){0,2}?(?:se\\s+)?(?:kala|safed|nila)\\s+dhu\\S*|\\bturbo\\S*\\s+(?:\\S+\\s+)?(?:@|avaz|siti)\\S*|\\btemperature\\s+(?:\\S+\\s+)?(?:badh|zyada|jyada|upar|high)\\S*'), /start|band\s+ho|light|lait|batti|reefer|rifer/],
  ['mirror', hiRx('mirror|miror|side\\s+shisha|side\\s+glass|ayna|aina', `${HI_BRK}|@|gir\\S*|nikal\\s+gaya|hil\\s+rah\\S*|dhila|crack|krek`), /\bgarm|\bheat|hitar/],
  ['glass', hiRx('shisha|sisha|shisa|vindscrin|vindskrin|vindshild|front\\s+glass|glass|kanch|kach', `crack|krek|${HI_BRK}|darar|chatak|tarak|pat?thar\\s+lag\\S*`), /side|mirror|miror|ayna|aina|khidki|vindo\b|upar|niche/],
  ['window', /\b(?:khidki|vindo|shisha)\S*\s+(?:\S+\s+){0,2}?(?:upar|niche|nice)\s+nahi\s+(?:ho|ja|a)\S*|\b(?:khidki|vindo)\S*\s+(?:\S+\s+)?(?:band|khul)\s+nahi\b|\bpaver\s+vindo\S*\s+(?:\S+\s+)?(?:kam\s+nahi|kharab)\S*/],
  ['lights', hiRx('light|lait|headlight|hedlait|hedlight|batti|bulb|balb|indicator|indiketar|fog|lamp', `@|nahi\\s+jal\\S*|jal\\s+nahi|fuse\\s+ho\\S*|fyuz\\s+ho\\S*|ud\\s+gaya|${HI_BRK}`), /check|engine|enjin|dashboard|deshbord|\babs\b|\bebs\b|varning|eror|error|oil\s+(?:\S+\s+)?(?:light|batti)|battery\s+(?:\S+\s+)?(?:light|batti)/],
  ['warnlight', /\b(?:check|engine|enjin|abs|ebs|oil|tel|battery|bettri|varning|lal|pili|yellov)\S*\s+(?:\S+\s+)?(?:ki\s+|ka\s+)?(?:light|lait|batti|lamp|sign|nishan)\S*\s+(?:\S+\s+){0,2}?(?:jal\s+(?:raha|rahi|rahe|gaya|uth\S*)|a\s+gaya|a\s+rah\S*)|\b(?:dashboard|deshbord|screen|skrin|display|displey)\S*\s+(?:\S+\s+){0,3}?(?:error|eror|galti|varning)\S*\s+(?:\S+\s+)?(?:a\s+rah|dikh|aya|ayi|a\s+gaya)\S*/, /nahi\s+jal/],
  ['batt', hiRx('battery|bettri|baitri|betri|batri', '@|dovn|dead|ded|khatam|baith\\s+gaya|bait\\s+gaya|charge\\s+nahi|charj\\s+nahi|discharge|discharj|phul\\s+gaya|ful\\s+gaya'), /light|lait|batti|indicator|sign/],
  ['tacho', new RegExp(`\\b(?:tachograph|tacograph|takograf|tacho|tako)\\S*\\s+(?:\\S+\\s+){0,3}?(?:${HI_D}|error|eror|nahi\\s+padh|nahi\\s+parh|read\\s+nahi)\\S*|\\b(?:driver\\s+card|drayvar\\s+kard|card|kard)\\S*\\s+(?:\\S+\\s+){0,3}?(?:nahi\\s+(?:padh|parh|le|chal)|read\\s+nahi|kho\\s+gaya|gum\\s+ho|chori\\s+ho|${HI_BRK}|${HI_D})\\S*`), /fuel|diesel|disel|dijal|\btel\b|petrol|tank|bank|atm|\bsim\b|mobile|phone|\bfon\b|adblue|toll|dkv|shell|\buta\b/],
  ['fuelcard', new RegExp(`\\b(?:fuel|diesel|disel|dijal|tel|tank|dkv|shell|uta)\\s+(?:card|kard)\\S*\\s+(?:\\S+\\s+){0,3}?(?:block|blok|reject|decline|kho\\s+gaya|chori|gayab|gaib|${HI_D})\\S*`)],
  ['theft', /\b(?:chori|chory)\s+(?:ho\s+gaya|hui|hua|kar\s+(?:li|liya|liye|le|ke|gaya)\S*)|\bchura\s+(?:liya|li|liye|le\s+gaya|ke|kar)\S*|\bchor\s+(?:\S+\s+){0,3}?(?:le\s+gaya|ghus\s+gaya|aa\s+gaya|tod\S*)|\bchuray[ai]\b|\b(?:diesel|disel|dijal|dizal|tel|fuel|adblue)\S*\s+(?:\S+\s+){0,2}?nikal\s+(?:liya|li|liye|le\s+gaya|ke\s+le\s+gaya|kar\s+le\s+gaya)\b|\b(?:diesel|disel|dijal|dizal|fuel|adblue|battery|bettri|baitri|betri|batri|tyre|tayar|tire|tair|pahiya|stepni|spare|mirror|shisha|sisha|radio|saman|mal|tirpal|tarpal|tarpaulin|tool|auzar|jack|jek|chain|sensor|silencer|cargo|karga)\S*\s+(?:\S+\s+){0,2}?(?:gayab|gaib)\b|\b(?:tank|tanki|tanky)\s+(?:ka\s+|ki\s+)?(?:dhakan|dhakkan|cap|kep|lock|lak|tala)\S*\s+(?:\S+\s+){0,2}?(?:tod|tut)\S*|\bkisi\s+ne\s+(?:\S+\s+){0,4}?(?:lock|lak|tala)\S*\s+tod\S*/, /card|kard|chabi|chabhi|chavi|kagaz|kagaj|papers|number\s+plat|nambar\s+plet|mechani|mekani|mistri|filter|vorkshop|garage|garej/],
  ['vandal', /\bkisi\s+ne\s+(?:\S+\s+){0,5}?(?:kat|phad|tod|khuroch|khurach|kharonch|kharoch|scratch|skrech|skratch|rgad)\S*\s+(?:diya|di|diye|dala|dali|dale|kar\s+(?:diya|di|diye)|gaya|gayi)\b|\b(?:kat|phad|tod|khuroch|khurach|kharonch|kharoch|scratch|skrech|skratch)\S*\s+(?:kar\s+)?(?:diya|di|diye|dala|dali|dale)\s+kisi\s+ne\b/, /\bnahi\b|chor|chura|chori|lock|\blak\b|tala|gayab|gaib|nikal|card|kard|chabi/],
  ['cabkit', /\b(?:seat|sit|mirror|shisha|sisha)\s+(?:ka\s+|ki\s+|ke\s+)?(?:heater|hitar|hiter|heating|hiting|garmi)\s+(?:\S+\s+){0,2}?(?:kam\s+nahi|nahi\s+(?:chal|a\b|ho|kar)|band\s+ho|kharab|kharb|bigad|fail\s+ho|vork\s+nahi)\S*|\b(?:seat|sit|mirror|shisha|sisha)\s+(?:\S+\s+)?garam\s+nahi\s+(?:ho|hot|kar)\S*/],
  ['lost', hiRx('chabi|chabhi|chavi|kagaz|kagaj|papers|registration|\\brc', 'kho\\s+(?:gaya|di|diya)|gum\\s+ho\\S*|chori\\s+ho\\S*|gayab|gaib|nahi\\s+mil\\s+rah\\S*|mil\\s+nahi\\s+rah\\S*', '\\bkho\\s+(?:di|diya|gaya)\\s+(?:\\S+\\s+)?(?:chabi|chabhi|kagaz|kagaj)'), /card|kard/],
  ['coupling', new RegExp(`\\b(?:trailer|treler|trali)\\S*\\s+(?:\\S+\\s+){0,2}?(?:khul\\s+gaya|alag\\s+ho\\s+gaya|nikal\\s+gaya|lag\\s+nahi|jud\\s+nahi|lock\\s+nahi|lok\\s+nahi|atak\\S*)|\\b(?:fifth\\s+vhil|5th\\s+vhil|kingpin|kinpin|saddle|sedel)\\S*\\s+(?:\\S+\\s+){0,2}?(?:${HI_D}|lock\\s+nahi|lok\\s+nahi|band\\s+nahi|khul\\s+nahi)\\S*`), /darvaz|darvaj|gate|\bget\b|\bdur\b|tirpal|tarpal|tarpaulin|parda|tala|light|lait|batti/],
  ['dryfuel', /\b(?:diesel|disel|dijal|dizal|tel|fuel|petrol)\S*\s+(?:\S+\s+)?(?:khatam|khtm|khatm)\s+(?:ho|hai|gaya)\S*|\btank\s+(?:\S+\s+)?khali\s+(?:ho|hai)\S*/, /adblue|card|kard|reefer|rifer|light|batti/],
  ['reefer', hiRx('reefer|rifer|refar|reefar|thermo\\s*king|carrier|unit|yunit|cooling\\s+unit|kuling\\s+unit|fridge|frij', '@|thand[ai]\\s+nahi|cooling\\s+nahi|kuling\\s+nahi|temperature\\s+(?:\\S+\\s+)?(?:nahi|badh|upar)\\S*|alarm|start\\s+nahi'), /cabin|kebin|\bac\b/],
  ['climate', hiRx('ac\\b|e\\s?si\\b|heater|hitar|hiter|vebasto|blover|bloar|pankha|\\bfan', '@|thand[ai]\\s+nahi|garam\\s+nahi|garm\\s+nahi|hava\\s+nahi|gas\\s+khatam|gais\\s+khatam'), /reefer|rifer|unit|yunit|engine|enjin|radiator|seat|sit\b|mirror|shisha|sisha/],
  ['tarp', hiRx('tirpal|tarpal|tarpaulin|tarpolin|parda|curtain|kartan|tent', `kat\\S*|phad\\S*|phat\\S*|fat\\s+gaya|chir\\S*|ched|chhed|khul\\s+gaya|ud\\s+gaya|${HI_BRK}`)],
  ['exhaust', hiRx('silencer|sailensar|silensar|exhaust|eksast|ekjast', `gir\\S*|${HI_BRK}|latak\\S*|phat\\S*|chhed|ched|avaz|nikal\\s+gaya|@`), /dhu|smoke|\btel\b|oil|diesel|disel/],
  ['visib', hiRx('viper|vaipar|vipar|vasher', `@|nahi\\s+chal\\S*|${HI_BRK}|pani\\s+nahi`)],
  ['seat', new RegExp(`\\b(?:seat\\s+belt|seatbelt|sit\\s+belt|belt)\\S*\\s+(?:\\S+\\s+){0,2}?(?:nahi\\s+lag|lag\\s+nahi|lock\\s+nahi|lok\\s+nahi|${HI_D}|${HI_BRK}|phat\\S*|atak\\S*)|\\b(?:seat|sit)\\S*\\s+(?:\\S+\\s+){0,2}?(?:${HI_D}|${HI_BRK}|hil\\s+rah\\S*|dhili|niche\\s+(?:gir|baith|bait)\\S*|upar\\s+nahi|adjust\\s+nahi)`), /garm|heat|hitar|fan\s+belt|pankha|v\s+belt|alternator|dhu|\bag\s/],
  ['door', hiRx('darvaz|darvaj|door|\\bdur\\b|gate|tala|lock|lok\\b|handle|hendal', 'band\\s+nahi|nahi\\s+band|khul\\s+nahi|nahi\\s+khul\\S*|khul\\s+gaya|atak\\S*|jam\\s+ho\\S*|@|tut\\S*'), /khidki|vindo|shisha|seat|belt|stiring|steering|card|kard|trailer\s+(?:\S+\s+)?khul|hand\s*brake/],
  ['stuck', /\b(?:kichad|kichar|chikad|mitti|baraf|barf|snov|ret|rait|gadd?h)\S*\s+(?:\S+\s+){0,2}?(?:phas|fas|dhas|dhans)\S*/, /traffic|trefik|\bjam\b|line|lain/],
  ['numplate', hiRx('number\\s+plate|nambar\\s+plet|number\\s+plet|nambar\\s+plate', `gir\\S*|kho\\S*|${HI_BRK}|chori|nikal\\s+gaya|dikh\\s+nahi|padh\\S*\\s+nahi`), /light|lait|batti/],
  ['gear', hiRx('gear|giyar|gearbox|giyarbaks|clutch|cluch|klach', '@|nahi\\s+lag\\S*|lag\\s+nahi|nahi\\s+(?:dal|pad|ja)\\S*|fas\\S*|phas\\S*|jal\\s+gaya|slip|atak\\S*|jam\\s+ho\\S*|avaz'), /light|lait|batti/],
  ['wheel', /\b(?:nut|nat|bolt)\S*\s+(?:\S+\s+){0,3}?(?:dhil\S*|nikal\S*|gir\S*|kho\S*|nahi\s+hai|gayab)|\b(?:rim)\S*\s+(?:\S+\s+)?(?:tedh\S*|tut\S*|crack|krek|phat\S*)|\b(?:bearing|bering|hub)\S*\s+(?:\S+\s+){0,2}?(?:garam|garm|avaz|kharab|tut\S*)/, /brake|brek|seat|belt/],
  ['susp', hiRx('air\\s*bag|airbag|erbeg|eyar\\s+beg|kamani|patta|shocker|shokar|suspension|saspenshan|bellov', `phat\\S*|fat\\s+gaya|${HI_BRK}|@|hava\\s+(?:nikal|nahi)\\S*|leak|lik|niche\\s+baith\\S*|baith\\s+gaya|bait\\s+gaya`), /stiring|steering/],
  ['adas', hiRx('sensor|sensar|radar|camera|kemra|cruise|kruz|lane\\s+assist', '@|error|eror|nahi\\s+dikh\\S*|band\\s+ho\\S*', '\\b(?:gadi|truck|trak)\\S*\\s+(?:\\S+\\s+)?apne\\s+ap\\s+(?:\\S+\\s+)?(?:brake|brek)\\S*'), /reefer|rifer|tacho|tako/]];
function hiKinds(v) { const k = new Set(); for (const raw of String(v || '').split(/[.,;!?\n।]+/)) { if (!/[a-z]/i.test(raw)) continue; const f = hiFold(raw); if (!HI_MARK.test(f)) continue; const p = f.replace(HI_NEG, ' '); if (!HI_OK.test(p)) for (const [n, rx, ex] of HI_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); } if (k.has('acc')) k.delete('injury'); return k; }






const tlFold = (s) => ' ' + String(s || '').toLowerCase().replace(/[’'`´-]/g, ' ').replace(/\b(?:ung|iyong|yong)\b/g, 'yung').replace(/\b(?:hnd|hinde|hnde)\b/g, 'hindi')
  .replace(/\bwla\b/g, 'wala').replace(/\bwlang\b/g, 'walang').replace(/\s+/g, ' ') + ' ';
const TL_MARK = /\b(?:ang|ng|nang|yung|ay|hindi|ayaw|wala|walang|mga|po|ako|ko|kami|namin|natin|kasi|naman|lang|rin|din|sira|nasira|sa|na|may)\b/;
const TL_D = 'sira|nasira|nasisira|(?:hindi|di)\\s+(?:na\\s+|po\\s+)?gumagana|ayaw\\s+(?:na\\s+)?gumana|may\\s+(?:problema|diperensya|deperensya|depekto|aberya)|pumapalya|palyado|nagloloko|naglo\\s+loko';
const TL_BRK = 'basag|nabasag|biyak|nabiyak|bitak|may\\s+lamat|lamat|crack|cracked|baluktot|nabali|bali|putol|naputol';
const tlCo = (n, d) => new RegExp(`^(?=.*\\b(?:${n}))(?=.*\\b(?:${d.split('@').join(TL_D).split('#').join(TL_BRK)})(?![a-z]))`);
const TL_OK = /\b(?:okay|ok|ayos|maayos|naayos|inayos|napalitan|pinalitan|pinaltan|nagawa|ginawa|na\s+fix|na\s+repair|nirepair|fixed|gumagana|umaandar|lumalamig)\s+na\b|\b(?:ayos|okay|ok)\s+lang\b|\bwalang\s+(?:naging\s+)?(?:problema|diperensya|aberya)\b|\bmaayos\s+(?:naman\s+)?(?:ang|lahat|na)\b/;
const TL_NEG = /\b(?:hindi|di)\s+(?:\S+\s+){0,2}?sa\s+kanal\b|\b(?:hindi|di)\s+(?:naman\s+|na\s+|po\s+|pa\s+)?(?:tumutulo|tumatagas|nasira|sira|basag|nabasag|nabangga|nabunggo|naaksidente|nasunog|nasusunog|umuusok|flat|na\s+flat|butas|nabutas|pumutok|nasugatan|nasaktan|ninakaw|nanakaw|nawala|nalaglag|nahulog|natanggal|punit|napunit|kumalas)\b|\bwala(?:ng)?\s+(?:naman\s+|namang\s+|pong\s+|po\s+)?(?:tagas|tulo|leak|aksidente|disgrasya|sunog|apoy|usok|sira|nasira|problema|diperensya|damage|gasgas|sugat|nasugatan|nasaktan|ninakaw|nanakaw|nawala|nabangga|basag|lamat|crack)\b/g;
const TL_KINDS = [['brake', tlCo('preno|brake', '@|walang\\s+preno|mahina|ayaw\\s+(?:kumapit|kumagat)|(?:hindi|di)\\s+(?:kumakapit|kumakagat)|malambot|lumalambot|naiipit|naipit|nagla\\s*lock|nag\\s+lock'), /hand\s*brake|handbreak|parking\s+brake|ilaw|light/],
  ['brake', tlCo('air\\s+pressure|presyon\\s+ng\\s+hangin|hangin\\s+ng\\s+preno', 'bumababa|mababa|nawawala|bumagsak|bagsak|hindi\\s+(?:umaakyat|tumataas)|ayaw\\s+(?:umakyat|tumaas)')],
  ['parkbrake', tlCo('hand\\s*brake|handbreak|parking\\s+brake', '@|ayaw\\s+(?:bumitaw|matanggal|maalis)|(?:hindi|di)\\s+(?:bumibitaw|mabitawan|maalis|matanggal|kumakapit)|ayaw\\s+kumapit|naiipit|naipit|stuck')],
  ['parkbrake', /\bkusang\s+(?:umandar|gumulong|umatras|tumakbo)|\bgumulong\s+(?:nang\s+|ng\s+)?(?:mag\s*isa|kusa)/],
  ['flat', tlCo('gulong|goma|tyre|tire|tayr', 'flat|butas|nabutas|pumutok|putok|sumabog|nawalan\\s+ng\\s+hangin|walang\\s+hangin|kulang\\s+(?:sa\\s+)?hangin|impis|naimpis|puncture|na\\s+puncture'), /air\s*bag|airbag|trapal|tarp|nut|turnilyo|bolt|tornilyo/],
  ['tyre', tlCo('gulong|goma|tyre|tire|tayr', 'kalbo|upod|pudpod|manipis|may\\s+hiwa|hiwa|laslas|may\\s+umbok|umbok|bukol|may\\s+bukol'), /flat|butas|pumutok|putok|hangin|puncture/],

  ['flat', /\b(?:may\s+)?(?:na)?sira\s+(?:na\s+)?(?:po\s+)?(?:ang|yung|ng)\s+(?:\S+\s+)?(?:gulong|goma|tyre|tire|tayr)|\b(?:gulong|goma|tyre|tire|tayr)\S*\s+(?:\S+\s+){0,2}(?:ay\s+)?(?:na)?sira\b/, /reserba|reserve|spare|step\s*ney|wiper|pamunas|air\s*bag|\b(?:hindi|di)\s+(?:\S+\s+)?(?:na)?sira/],
  ['steer', tlCo('manibela|steering|direksyon|direksiyon', '@|matigas|mabigat|umuuga|nanginginig|maluwag|lumuluwag|may\\s+laro|kumakabig|humihila')],
  ['steer', tlCo('truck|trak|sasakyan|unit', '(?:humihila|kumakabig|kinakabig|lumilihis)\\s+(?:\\S+\\s+){0,2}?(?:pa\\s*)?(?:kanan|kaliwa)')],
  ['leak', tlCo('langis|oil|diesel|krudo|coolant|adblue|hydraulic|haydroliko|gasolina|tubig\\s+ng\\s+radiator', 'tumutulo|tulo|tumatagas|tagas|may\\s+tagas|leak|leaking|nag\\s*le\\s*leak|naglileak|tumatapon'), /ubos|naubos|naubusan|card|ilaw|light/],
  ['leak', /\bmay\s+(?:tumutulo|tumatagas|tagas|leak)\b/, /ubos|naubos|naubusan|card|ilaw|light|bubong|kisame|ulan/],
  ['fire', /\b(?:nasusunog|nasunog|may\s+sunog|nagliliyab|nagliyab|may\s+apoy|nag\s*apoy|umaapoy)\b/, /clutch|klats|klach|fuse|piyus|bumbilya|pagkain|kanin|ulam/],
  ['fire', tlCo('cabin|kabina|makina|engine|truck|trak|wire|wiring|kable|baterya|battery|upuan|seat|dashboard', 'usok|umuusok|nag\\s*uusok|umuusok'), /tambutso|tambucho|muffler|exhaust|silencer|maitim|itim|puti|asul/],
  ['acc', /\b(?:nabangga|bumangga|nakabangga|binangga|nabunggo|bumunggo|nakabunggo|naaksidente|aksidente|disgrasya|nadisgrasya|sumalpok|sinalpok|natamaan\s+ako|tumama\s+ako|nasagi|nakasagi)\b/],

  ['acc', /\btumaob|\bnatumba|\bbumaligtad|\b(?:lumabas|lumihis|nadulas)\s+(?:\S+\s+){0,2}?(?:sa|ng)\s+(?:kalsada|daan)|\bsa\s+kanal\b/, /karga|hindi\s+(?:\S+\s+)?(?:tumaob|lumabas)|hindi\s+(?:\S+\s+){0,2}?sa\s+kanal/],

  ['stuck', /\bsa\s+kanal\b/, /karga|hindi\s+(?:\S+\s+){0,2}?sa\s+kanal/],
  ['injury', /\b(?:nasugatan|sugatan|may\s+sugat|nasaktan|duguan|dumudugo|ambulansya|ambulance)\b/],
  ['nostart', /\b(?:ayaw|hindi|di)\s+(?:na\s+|po\s+)?(?:mag\s*start|mag\s+istart|magstart|umandar|umaandar|mag\s*andar|mapaandar|paandarin|ma\s*start|nag\s*s?start|nagsisistart|nagistart)\b|\b(?:makina|engine|truck|trak)\S*\s+(?:\S+\s+)?(?:namamatay|namatay)\b|\b(?:namamatay|namatay)\s+(?:\S+\s+)?(?:ang\s+|yung\s+)?(?:makina|engine|truck|trak)\b/, /reefer|refer|thermo|carrier|unit|aircon|air\s*con|\bac\b|heater|webasto|freezer|chiller/],
  ['engine', tlCo('makina|engine|motor|makena', 'mainit|umiinit|nag\\s*overheat|overheat|nag\\s*iinit|kakaibang\\s+tunog|maingay|may\\s+tunog|kumakalampag|kalampag|(?:mahina|walang)\\s+(?:ang\\s+)?(?:hatak|lakas|power)|nanghihina|@|nagvi\\s*vibrate|kumakadyot|limp\\s+mode'), /usok|umuusok|ilaw|light|start|umandar|umaandar|namamatay|namatay/],
  ['engine', tlCo('tambutso|tambucho|muffler|exhaust|silencer', '(?:maitim|itim|puti|asul|makapal)\\s+na\\s+usok|usok\\s+(?:na\\s+)?(?:maitim|itim|puti|asul)')],
  ['engine', tlCo('turbo', '@|sumisipol|sipol|may\\s+tunog|maingay'), /usok/],
  ['engine', tlCo('temperatura|temperature|temp', 'tumataas|mataas|umaakyat'), /reefer|refer|unit|freezer|chiller|aircon/],
  ['mirror', tlCo('side\\s+mirror|salamin\\s+sa\\s+(?:gilid|tagiliran)|rear\\s*view|mirror|espeho|espejo', '@|#|nalaglag|natanggal|maluwag|lumuluwag|umuuga|gumagalaw'), /heater|heating|init/],
  ['glass', tlCo('windshield|windscreen|salamin\\s+sa\\s+harap|harapang\\s+salamin|salamin|bintana', '#|tinamaan\\s+ng\\s+bato|natamaan\\s+ng\\s+bato'), /side|mirror|gilid|tagiliran|espeho|espejo|rear\s*view|ayaw|tumaas|bumaba/],
  ['window', tlCo('bintana|window', '(?:ayaw|hindi|di)\\s+(?:\\S+\\s+)?(?:tumaas|bumaba|umakyat|sumara|magsara|isara|bumukas|mabuksan|maisara|maitaas|maibaba|tumataas|bumababa)')],
  ['lights', tlCo('ilaw|headlight|head\\s+light|signal\\s*light|signal|tail\\s*light|brake\\s*light|bumbilya|fog\\s*light|park\\s*light|hazard|blinker|indicator', '@|#|patay|walang\\s+ilaw|pundido|napundi|pundi|(?:hindi|di)\\s+(?:umiilaw|nagsisindi|sumisindi)|ayaw\\s+(?:umilaw|magsindi|sumindi)'), /check\s+engine|dashboard|warning|\babs\b|\bebs\b|ilaw\s+ng\s+(?:langis|baterya|makina|battery|oil)|oil\s+light|battery\s+light|nakailaw|naka\s+ilaw|umiilaw\s+(?:ang|yung)/],
  ['warnlight', tlCo('check\\s+engine|warning|\\babs|\\bebs|ilaw\\s+ng\\s+(?:langis|baterya|makina|battery|oil)|oil\\s+light|battery\\s+light|engine\\s+light', 'nakailaw|naka\\s+ilaw|umiilaw|lumabas|may\\s+lumabas|nagpapakita|nag\\s*bi\\s*blink|kumikislap|naka\\s+on|bukas|lumitaw')],
  ['warnlight', tlCo('dashboard|screen|display|monitor', '(?:may\\s+)?(?:error|warning|mensahe|lumabas|lumitaw)')],
  ['batt', tlCo('baterya|battery|batirya|bateri', 'lowbat|low\\s*bat|low\\s+battery|deadbat|patay|namatay|drained|walang\\s+(?:karga|charge|kuryente)|ayaw\\s+mag\\s*charge|(?:hindi|di)\\s+nag\\s*cha?\\s*charge|lumobo|lobo|mahina|@'), /ilaw|light|indicator|nakaw|ninakaw|ninakawan|nanakaw|magnanakaw/],
  ['tacho', tlCo('tachograph|tacho|takograp|tako', '@|#|error|ayaw\\s+(?:bumasa|basahin)|(?:hindi|di)\\s+(?:mabasa|nababasa|bumabasa)'), /fuel|diesel|krudo|gas\b|atm|bangko/],
  ['tacho', tlCo('driver\\s*card|card\\s+ng\\s+driver|driver\\s+kard|card|kard', '@|#|error|ayaw\\s+(?:bumasa|basahin)|(?:hindi|di)\\s+(?:mabasa|nababasa)|nawala|naiwala|ninakaw|nanakaw'), /fuel|diesel|krudo|gas\b|atm|bangko|shell|dkv|uta\b|credit|debit/],
  ['fuelcard', tlCo('(?:fuel|diesel|krudo|gas|dkv|shell|uta)\\s*card', 'block|na\\s+block|naka\\s+block|blocked|reject|na\\s+reject|declined|na\\s+decline|ayaw\\s+(?:tanggapin|gumana)|(?:hindi|di)\\s+tinanggap|nawala|naiwala|ninakaw|nanakaw|@')],
  ['theft', /\b(?:ninakaw|ninakawan|nanakaw|nanakawan|nagnakaw|magnanakaw|pinagnakawan)\b|\b(?:sinipsip|sumipsip|hinigop|humigop)\s+(?:\S+\s+){0,2}?(?:diesel|krudo|gasolina)\b|\bpinasok\s+(?:ng\s+(?:magnanakaw|kung\s+sino)\s+)?(?:ang\s+|yung\s+)?(?:cabin|kabina|truck|trak|trailer|sasakyan)\b/, /card|kard|susi|\bkey\b|plaka|plate|(?:hindi|di|wala|walang)\s+(?:\S+\s+)?(?:ninakaw|nanakaw|nagnakaw)/],
  ['vandal', /\b(?:sinira|ginasgas|ginasgasan|ginuhitan|hiniwa|nilaslas|pinunit|binasag|binutas|tinusok|sinulatan|vinandal)\s+(?:\S+\s+){0,4}?(?:ng|nang)\s+(?:kung\s+sino|ibang\s+tao|di\s+kilala|hindi\s+kilala|mga\s+bata|vandal)|\b(?:kung\s+sino|may\s+tao)\s+(?:ang\s+)?(?:\S+\s+)?(?:sumira|gumasgas|naglaslas|bumasag|bumutas|pumunit|nagsulat|nag\s*vandal)|\bvinandal\b|\bna\s+vandal\b/],
  ['cabkit', tlCo('(?:seat|upuan|mirror|salamin)\\s+(?:heater|heating)|heater\\s+(?:ng|sa)\\s+(?:upuan|seat|mirror|salamin)', '@|(?:hindi|di)\\s+umiinit|ayaw\\s+uminit|walang\\s+init')],
  ['lost', tlCo('susi|\\bkey|papeles|rehistro|registration|or\\s*cr|dokumento|libreta', 'nawala|naiwala|nawawala|(?:hindi|di)\\s+(?:ko\\s+|namin\\s+)?(?:makita|mahanap)|ninakaw|nanakaw'), /card|kard/],
  ['coupling', tlCo('trailer|treyler|trailler', 'kumalas|nakalas|natanggal\\s+sa\\s+(?:truck|trak|ulo|tractor)|humiwalay|nahiwalay|ayaw\\s+(?:kumabit|mag\\s*lock|ikabit|maikabit)|(?:hindi|di)\\s+(?:makabit|maikabit|nakakabit|nagla\\s*lock|naka\\s+lock|kumakabit)')],
  ['coupling', tlCo('kingpin|king\\s+pin|fifth\\s+wheel|5th\\s+wheel|sadel|saddle|kupling|coupling', '@|#|ayaw\\s+(?:mag\\s*lock|sumara|magsara)|(?:hindi|di)\\s+(?:nagla\\s*lock|naka\\s+lock|ma\\s*lock|mai\\s*lock|sumasara|nagsasara)|naipit|stuck')],
  ['dryfuel', /\bnaubusan\s+(?:ako\s+|kami\s+|po\s+)?(?:ng\s+)?(?:diesel|krudo|gasolina|fuel|gas)\b|\b(?:diesel|krudo|fuel|gasolina)\S*\s+(?:\S+\s+)?(?:ubos|naubos|wala\s+na)\b|\b(?:ubos|naubos)\s+(?:na\s+)?(?:ang\s+|yung\s+)?(?:diesel|krudo|fuel|gasolina)\b|\bwalang\s+(?:laman\s+(?:ang\s+)?tangke|diesel|krudo)\b/, /adblue|card|kard|reefer|refer|nakaw|ninakaw|sinipsip/],
  ['reefer', tlCo('reefer|refer|thermo\\s*king|carrier|cooling\\s+unit|freezer|chiller|\\bunit', '@|(?:hindi|di)\\s+(?:na\\s+)?(?:lumalamig|malamig|nagpapalamig)|ayaw\\s+(?:lumamig|magpalamig)|tumataas\\s+ang\\s+temp\\S*|alarm|ayaw\\s+mag\\s*start|(?:hindi|di)\\s+nag\\s*start|error'), /cabin|kabina|aircon|air\s*con/],
  ['climate', tlCo('aircon|air\\s*con|\\bac|heater|hiter|webasto|blower|bentilador', '@|(?:hindi|di)\\s+(?:na\\s+)?(?:lumalamig|malamig|umiinit|mainit)|ayaw\\s+(?:lumamig|uminit)|mainit\\s+(?:ang\\s+)?hangin|walang\\s+(?:lamig|init|hangin)'), /reefer|refer|\bunit|freezer|chiller|(?:seat|upuan|mirror|salamin)\s+(?:heater|heating)|heater\s+(?:ng|sa)\s+(?:upuan|seat|mirror|salamin)|makina|engine/],
  ['tarp', tlCo('trapal|tarpaulin|tarp|lona|kurtina|curtain', 'sinira|punit|napunit|pinunit|butas|nabutas|binutas|hiwa|hiniwa|laslas|nilaslas|natanggal|nilipad|tinangay|@|#')],
  ['exhaust', tlCo('tambutso|tambucho|muffler|exhaust|silencer', 'nalaglag|nahulog|natanggal|nakabitin|lumalawit|butas|maingay|@|#'), /usok/],
  ['visib', tlCo('wiper|panlinis\\s+ng\\s+salamin', '@|#|walang\\s+tubig|ayaw\\s+mag\\s*spray|(?:hindi|di)\\s+(?:nag\\s*spray|gumagalaw)')],
  ['seat', tlCo('seat\\s*belt|seatbelt|sinturon|upuan|\\bseat', '@|#|ayaw\\s+(?:kumabit|mag\\s*lock|maikabit|ma\\s*lock)|(?:hindi|di)\\s+(?:kumakabit|nagla\\s*lock|ma\\s*lock)|napunit|punit|naipit|bumababa|lumulubog|maluwag'), /heater|heating|init|nasunog|nasusunog|usok/],
  ['door', tlCo('pinto|pintuan|door|kandado|\\block|seradura|hawakan', '@|#|ayaw\\s+(?:magsara|sumara|isara|mabuksan|bumukas|mag\\s*lock)|(?:hindi|di)\\s+(?:magsara|sumasara|maisara|mabuksan|bumubukas|nagsasara|nagla\\s*lock|ma\\s*lock)|bumukas\\s+(?:habang|nang)|naipit|stuck'), /bintana|window|seat|belt|kumalas|card|kard|fifth|5th|kingpin|king\s+pin|sadel|saddle|kupling|coupling|ninakaw|nanakaw|sinira\s+(?:\S+\s+){0,4}?(?:ng|nang)\s+kung/],
  ['stuck', tlCo('putik|niyebe|snow|yelo|buhangin|lusak', 'na\\s*stuck|naipit|lubog|nalubog|baon|nabaon|nabalaho|balaho|nasadlak|stuck'), /traffic|trapik/],
  ['numplate', tlCo('plaka|plate\\s*number|number\\s*plate|\\bplate', 'nalaglag|nahulog|natanggal|nawala|ninakaw|nanakaw|(?:hindi|di)\\s+mabasa|#'), /ilaw|light/],
  ['gear', tlCo('gear|kambyo|kambiyo|transmission|gearbox|clutch|klats|klach', '@|ayaw\\s+(?:pumasok|kumambyo|mag\\s*shift)|(?:hindi|di)\\s+(?:pumapasok|makambyo|maipasok)|dumudulas|nag\\s*slip|slip|nasunog|sunog|matigas|naipit|stuck'), /ilaw|light/],
  ['wheel', tlCo('\\bnut|turnilyo|tornilyo|bolt|\\blug|tuerka', 'maluwag|lumuwag|natanggal|nawala|nahulog|kulang'), /preno|brake|seat|upuan|salamin|mirror|plaka|plate/],
  ['wheel', tlCo('bearing|\\bhub|\\brim|\\baro', 'mainit|maingay|may\\s+tunog|@|#')],
  ['susp', tlCo('air\\s*bag|airbag|suspension|suspensyon|shock|bellows|leaf\\s+spring|muelye|muwelye|\\bspring', 'pumutok|putok|sumabog|tumatagas|tagas|leak|lumubog|bumaba|walang\\s+hangin|nawalan\\s+ng\\s+hangin|maluwag|@|#'), /manibela|steering|upuan|seat/],
  ['adas', tlCo('sensor|radar|camera|kamera|cruise|lane\\s+assist|emergency\\s+brake', '@|error|ayaw\\s+gumana'), /reefer|refer|tacho|tako|dashcam/],
  ['adas', /\bkusang\s+(?:nag\s*)?(?:preno|brake|nagpreno|pumreno)\b/]];
function tlKinds(v) { const k = new Set(); for (const raw of String(v || '').split(/[.,;!?\n]+|\s(?:at|pero|tapos|saka|tsaka|kaso)\s/)) { if (!/[a-z]/i.test(raw)) continue; const f = tlFold(raw); if (!TL_MARK.test(f)) continue; const p = f.replace(TL_NEG, ' '); if (!TL_OK.test(p)) for (const [n, rx, ex] of TL_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); } if (k.has('acc')) k.delete('injury'); return k; }






const esFold = (s) => ' ' + String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'`´]/g, ' ').replace(/\bno\s+(?:me\s+)?(?:esta|estan)\s+bien\b/g, 'esta mal')
  .replace(/\bno\s+(?:me\s+)?(funcionan?|anda|andan|va|van)\s+bien\b/g, 'no $1').replace(/\b(?:todavia\s+|aun\s+|aun\s+no\s+|todavia\s+no\s+)?no\s+(?:lo\s+|la\s+|los\s+|las\s+)?(?:esta|estan|ha\s+sido|han\s+sido|fue|fueron|han|ha)\s+(?:arreglad|reparad|cambiad|solucionad)\S*/g, 'esta mal')
  .replace(/\bq\b/g, 'que').replace(/\s+/g, ' ') + ' ';
const ES_MARK = /\b(?:el|la|los|las|del|de|no|se|esta|estan|tiene|tengo|tienen|hay|mi|me|que|un|una|con|en|por|muy|ya|al|lo|le|nos|sin|mis|su|sus|camion|troca|tuve|tuvimos|estoy|estamos|pierde|pierden|gotea|gotean)\b/;
const ES_D = 'rot[oa]s?|se\\s+(?:ha\\s+|me\\s+|le\\s+)?(?:rompio|rompieron|averio|estropeo)|averiad[oa]s?|estropead[oa]s?|danad[oa]s?|descompuest[oa]s?|no\\s+(?:me\\s+|le\\s+)?(?:funcionan?|anda|andan|va|van|sirven?)|fallan?|fallando|tienen?\\s+(?:un\\s+|una\\s+)?(?:problema|fallo|falla|averia|defecto)|estan?\\s+mal|hace\\s+cosas\\s+raras';
const ES_BRK = 'rajad[oa]s?|raja|partid[oa]s?|quebrad[oa]s?|agrietad[oa]s?|grieta|fisurad[oa]s?|fisura|estrellad[oa]s?|doblad[oa]s?|astillad[oa]s?';
const esCo = (n, d) => new RegExp(`^(?=.*\\b(?:${n})(?![a-z]))(?=.*\\b(?:${d.split('@').join(ES_D).split('#').join(ES_BRK)})(?![a-z]))`);
const ES_TRUCK = 'camion|trailer|troca|gandola|rastra|vehiculo|tractora|cabeza\\s+tractora|furgoneta|furgon';
const ES_OK = /\b(?:ya\s+)?(?:arreglad[oa]s?|reparad[oa]s?|sustituid[oa]s?|reemplazad[oa]s?|solucionad[oa]s?|cambiad[oa]s?(?!\s+de\b))\b|\b(?:ya\s+)?funcionan?\s+(?:bien|correctamente|de\s+nuevo|otra\s+vez|perfecto|perfectamente)\b|\bvuelven?\s+a\s+funcionar\b|\bya\s+(?:funcionan?|arranca|enfria|frena|anda)\b|\btodo\s+(?:bien|ok|correcto|perfecto|en\s+orden)\b|\bsin\s+(?:ningun\s+)?problemas?\b|\bningun\s+problema\b/;
const ES_NEG = /\bno\s+(?:se\s+)?(?:ve\s+)?(?:gotea|gotean|pierde|pierden|rompio|rompieron|hubo\s+\S+|hay\s+(?:ninguna?\s+)?(?:fugas?|perdidas?|goteo|danos?|heridos?|fuego|humo)|tiene\s+(?:fugas?|perdidas?|danos?)|esta\s+(?:rot[oa]|pinchad[oa]|danad[oa]|averiad[oa]|quemad[oa])|estan\s+(?:rot[oa]s|pinchad[oa]s|danad[oa]s)|choque|chocamos|me\s+choc\S*|(?:me\s+|nos\s+)?robaron|ha\s+pasado\s+nada)\b|\bsin\s+(?:ninguna?\s+)?(?:fugas?|perdidas?|goteo|danos?|heridos?|lesionados?|accidentes?|incidentes?|golpes?|humo|fuego)\b|\bnadie\s+(?:\S+\s+)?herido\b|\bnadie\s+se\s+(?:lastimo|hizo\s+dano)\b/g;
const ES_KINDS = [['brake', esCo('frenos?', '@|no\\s+frenan?|sin\\s+frenos?|floj[oa]s?|bland[oa]s?|esponjos[oa]s?|se\\s+(?:bloquean?|traban?|agarrotan?|quedan?\\s+pegados?)|bloquead[oa]s?|chirrian?|pitan?|rechinan?|hacen?\\s+ruido|no\\s+agarran?|frenan?\\s+(?:mal|poco)|tarda\\s+en\\s+frenar'), /freno\s+de\s+(?:mano|estacionamiento|parking|parqueo)|\bluz|\bluces|piloto|liquido|aire/],
  ['brake', esCo(ES_TRUCK, 'no\\s+frena|frena\\s+(?:mal|poco)|tarda\\s+en\\s+frenar'), /\bsol[oa]\b/],
  ['brake', esCo('presion\\s+de\\s+(?:aire|los\\s+frenos)|aire\\s+de\\s+(?:los\\s+)?frenos|calderin(?:es)?', 'baja|bajando|se\\s+(?:baja|cae|pierde)|no\\s+sube|pierde|perdida|fuga')],
  ['parkbrake', esCo('freno\\s+de\\s+(?:mano|estacionamiento|parking|parqueo)', '@|no\\s+(?:se\\s+)?(?:suelta|sueltan|quita|desbloquea|libera|sujeta|agarra|aguanta)|no\\s+lo\\s+puedo\\s+(?:soltar|quitar)|atascad[oa]|pegad[oa]|bloquead[oa]')],
  ['parkbrake', new RegExp(`\\b(?:${ES_TRUCK}|remolque)\\s+(?:\\S+\\s+){0,2}?(?:se\\s+(?:movio|mueve|fue|desplazo)\\s+(?:rodando\\s+)?sol[oa]|se\\s+fue\\s+rodando|rodo\\s+sol[oa])\\b`)],
  ['flat', esCo('ruedas?|neumaticos?|llantas?|gomas?|cubiertas?|cauchos?', 'pinchad[oa]s?|pinchazo|pincharon|poncharon|ponchad[oa]s?|ponchon|se\\s+(?:me\\s+|nos\\s+)?(?:pincho|poncho|reviento|exploto|desinflo|bajo)|reventad[oa]s?|reventon|reviento|revento|reventaron|exploto|desinflad[oa]s?|sin\\s+aire|bajas?\\s+de\\s+aire|pierden?\\s+aire|perdiendo\\s+aire|se\\s+esta\\s+desinflando|esta\\s+baja|estan\\s+bajas|plana'), /airbag|air\s*bag|balona|fuelle|\blona|tuercas?|tornillos?|pernos?|quinta\s+rueda|freno/],
  ['tyre', esCo('neumaticos?|llantas?|gomas?|cubiertas?|cauchos?|ruedas?', 'gastad[oa]s?|desgastad[oa]s?|lis[oa]s?|calv[oa]s?|sin\\s+(?:dibujo|perfil|banda)|cortad[oa]s?|con\\s+(?:un\\s+)?corte|tiene\\s+(?:un\\s+)?corte|chichon|bulto|hernia|abultad[oa]|deformad[oa]|cristalizad[oa]s?'), /pinch|ponch|revent|explot|desinfl|sin\s+aire|pierden?\s+aire|quinta\s+rueda/],

  ['flat', esCo('neumaticos?|llantas?|gomas?|cubiertas?|cauchos?', 'rot[oa]s?|se\\s+(?:ha\\s+|me\\s+|le\\s+|nos\\s+)?(?:rompio|rompieron|estropeo|estropearon)|estropead[oa]s?|averiad[oa]s?|hech[oa]s?\\s+polvo|para\\s+tirar|muert[oa]s?'), /airbag|air\s*bag|balona|fuelle|\blona|tuercas?|tornillos?|pernos?|quinta\s+rueda|freno|limpia|escobilla|junta|manguera|puerta|repuesto|reserva|auxilio|tapacubos/],
  ['tyre', esCo('neumaticos?|llantas?|gomas?|cubiertas?|cauchos?', 'danad[oa]s?'), /pinch|ponch|revent|explot|desinfl|sin\s+aire|limpia|escobilla|junta|manguera|puerta|repuesto|reserva|auxilio/],
  ['steer', esCo('direccion|volante', '@|dur[oa]|pesad[oa]|tiene\\s+juego|juego|holgura|vibra|tiembla|floj[oa]|suelt[oa]|tira\\s+(?:hacia\\s+|a\\s+)?(?:la\\s+)?(?:derecha|izquierda)'), /en\s+direccion|direccion\s+(?:a|hacia|norte|sur|este|oeste|contraria)\b|asistente|carril|intermitente|cambio\s+de\s+direccion/],
  ['steer', esCo(ES_TRUCK, '(?:tira|se\\s+va|se\\s+desvia|jala)\\s+(?:hacia\\s+|para\\s+|a\\s+)?(?:la\\s+)?(?:derecha|izquierda)')],
  ['leak', esCo('aceite|gasoil|gasoleo|diesel|combustible|refrigerante|anticongelante|adblue|hidraulico|liquido\\s+(?:de\\s+frenos|hidraulico|refrigerante)|radiador', 'gotea|gotean|goteando|goteo|pierden?|perdiendo|perdida|fugas?|se\\s+(?:sale|salen|esta\\s+saliendo|derrama)|derrama|chorrea|chorreando'), /tarjeta|\bluz|testigo|chivato|se\s+acabo|sin\s+(?:gasoil|gasoleo|diesel|combustible)|me\s+quede|robaron|robo|sacaron|cambio\s+de\s+aceite|precio|potencia|fuerza/],
  ['leak', /\bhay\s+(?:una\s+)?(?:fuga|perdida|goteo|charco)\b|\b(?:gotea|chorrea)\s+(?:algo|por\s+debajo)\b/, /aire|techo|lluvia|tarjeta|\bluz/],
  ['fire', /\b(?:fuego|incendio|se\s+(?:esta\s+)?(?:quema|quemando|incendio|incendia|prendio\s+fuego)|en\s+llamas|ardiendo|llamas|se\s+quemo\s+(?:el|la)\s+(?:camion|cabina|motor|trailer|remolque|carga|troca))\b/, /embrague|clutch|fusible|bombill|foco|comida|cigarr|cerillas|extintor|\bluz|\bluces/],
  ['fire', esCo('cabina|motor|camion|troca|cables?|cableado|bateria|asiento|tablero|salpicadero|trailer|remolque', 'humo|sale\\s+humo|echa\\s+humo|echando\\s+humo|humea|huele\\s+a\\s+quemado|olor\\s+a\\s+quemado'), /escape|tubo|negro|blanco|azul|embrague|frenos?/],
  ['acc', /\b(?:accidente|choque|chocamos|chocado|choco|chocaron|colision|colisione|atropell\S*|me\s+dieron\s+(?:por\s+detras|un\s+golpe)|me\s+golpearon|por\s+alcance|siniestro|vuelco|volque|volcamos|se\s+volco)\b/],

  ['acc', /\b(?:volco|volcado|volcada)\b|\b(?:me\s+sali|se\s+salio|nos\s+salimos)\s+de\s+la\s+(?:carretera|via|calzada|autopista|autovia)|\bcuneta\b/, /carga|palet|mercancia|\bno\s+(?:se\s+)?(?:volco|sali)|\bno\s+(?:\S+\s+)?(?:esta|estamos|cai|cay|termine|acab|fue|fuimos)\S*\s+(?:\S+\s+){0,2}?(?:cuneta|zanja)/],

  ['stuck', /\bcuneta\b|\b(?:en|a)\s+(?:una|la)\s+zanja\b/, /carga|palet|mercancia|\bno\s+(?:\S+\s+)?(?:sali|cai|cay|esta|termine|acab|fue|fuimos)/],

  ['acc', /\b(?:en|a)\s+(?:una|la)\s+zanja\b/, /carga|palet|mercancia|\bno\s+(?:\S+\s+)?(?:sali|cai|cay|esta|estamos|termine|acab|fue|fuimos)/],
  ['injury', /\b(?:herid[oa]s?|lesionad[oa]s?|sangr\S*|ambulancia|me\s+(?:lastime|hice\s+dano))\b/],
  ['nostart', /\b(?:no\s+(?:me\s+)?(?:arranca|arrancan|enciende|prende|quiere\s+(?:arrancar|encender|prender)|da\s+contacto|hace\s+contacto)|se\s+(?:me\s+)?(?:apaga|apago|cala|calo)\s+(?:el\s+|solo\s+)?(?:motor|camion|troca)|(?:motor|camion|troca)\s+(?:\S+\s+)?se\s+(?:apaga|apago|cala|calo|muere|murio))\b/, /frigo|equipo\s+de\s+frio|grupo\s+(?:de\s+)?frio|unidad\s+de\s+frio|thermo|termo|carrier|reefer|aire\s+acondicionado|\bclima|calefac|webasto|\bluz|\bluces|faro|foco|pantalla|tablet|movil|telefono|radio/],
  ['engine', esCo('motor', 'se\\s+(?:calienta|recalienta|sobrecalienta|esta\\s+calentando)|recalentad[oa]|sobrecalentad[oa]|calentandose|temperatura\\s+alta|hace\\s+(?:un\\s+)?ruido|ruido\\s+(?:raro|extrano|fuerte)|suena\\s+(?:raro|mal)|golpetea|pierde\\s+(?:fuerza|potencia)|sin\\s+(?:fuerza|potencia)|no\\s+tiene\\s+(?:fuerza|potencia)|no\\s+tira|tironea|da\\s+tirones|modo\\s+(?:de\\s+)?emergencia|vibra|@'), /humo|testigo|chivato|\bluz|arranca|enciende|prende|\bse\s+(?:apaga|apago|cala|calo)\b|muere|murio/],
  ['engine', esCo(ES_TRUCK, 'pierde\\s+(?:fuerza|potencia)|sin\\s+(?:fuerza|potencia)|no\\s+tiene\\s+(?:fuerza|potencia)|no\\s+tira|modo\\s+(?:de\\s+)?emergencia')],
  ['engine', esCo('motor|escape|tubo\\s+de\\s+escape|silenciador|mofle', 'humo\\s+(?:muy\\s+)?(?:negro|blanco|azul)|(?:negro|blanco|azul)\\s+humo|mucho\\s+humo')],
  ['engine', esCo('turbo', '@|silba|pita|hace\\s+ruido'), /humo/],
  ['engine', esCo('temperatura\\s+del\\s+motor|temperatura\\s+del\\s+agua', 'sube|subiendo|alta|muy\\s+alta|en\\s+rojo')],
  ['mirror', esCo('espejos?|retrovisor(?:es)?', '@|#|se\\s+(?:cayo|ha\\s+caido|solto)|caido|suelt[oa]|floj[oa]|se\\s+mueve|arrancad[oa]|colgando'), /calefact|calefaccion|calienta/],
  ['glass', esCo('parabrisas|luna|cristal|vidrio', '#|rot[oa]|impacto|piedra|piedrazo|picad[oa]|chinazo|golpe'), /espejo|retrovisor|ventanilla|ventana|elevalunas|sube|baja|puerta|lateral|limpia/],
  ['window', esCo('ventanillas?|ventanas?|elevalunas|cristal\\s+de\\s+la\\s+puerta|vidrio\\s+de\\s+la\\s+puerta', 'no\\s+(?:\\S+\\s+)?(?:sube|baja|suben|bajan|cierra|cierran|abre|abren)|atascad[oa]|se\\s+quedo\\s+(?:abiert|bajad)[oa]|@')],
  ['lights', esCo('luz|luces|faros?|focos?|intermitentes?|pilotos?|bombillas?|bombillos?|antinieblas|galibos?|direccionales?|luz\\s+de\\s+freno|luces\\s+de\\s+freno', '@|#|fundid[oa]s?|se\\s+(?:fundio|fundieron|quemo|quemaron)|quemad[oa]s?|no\\s+(?:\\S+\\s+)?(?:encienden?|prenden?|alumbran?|iluminan?)|apagad[oa]s?|sin\\s+luz|sin\\s+luces|no\\s+hay\\s+luz'), /testigo|chivato|tablero|cuadro|salpicadero|check\s+engine|\babs\b|\bebs\b|luz\s+de\s+(?:aviso|averia|aceite|bateria|motor|advertencia)|luz\s+del\s+motor|pantalla|semaforo|piloto\s+(?:de\s+averia|del\s+motor|naranja|rojo|amarillo)/],
  ['warnlight', esCo('testigo|chivato|luz\\s+de\\s+(?:aviso|averia|advertencia|aceite|bateria|motor)|luz\\s+del\\s+motor|check\\s+engine|\\babs|\\bebs|piloto\\s+(?:de\\s+averia|del\\s+motor|naranja|rojo|amarillo)', 'encendid[oa]|se\\s+(?:encendio|enciende|prendio|prende|ilumino)|prendid[oa]|aparece|aparecio|sale|salio|parpadea|parpadeando|fij[oa]')],
  ['warnlight', esCo('tablero|cuadro|pantalla|display|salpicadero|ordenador\\s+de\\s+a\\s+bordo', '(?:sale|aparece|salio|aparecio|muestra|hay)\\s+(?:un\\s+|una\\s+)?(?:error|aviso|fallo|mensaje|averia|codigo)|error'), /tacografo|tarjeta|frigo/],
  ['batt', esCo('baterias?|acumulador', 'descargad[oa]s?|muert[oa]s?|sin\\s+carga|no\\s+(?:\\S+\\s+)?carga|no\\s+cargan|agotad[oa]s?|hinchad[oa]s?|floj[oa]s?|baja|bajas|se\\s+(?:descargo|descarga|agoto)|@'), /\bluz|testigo|chivato|robad|robaron|robo|movil|telefono|tablet|portatil|linterna|humo|fuego/],
  ['batt', /\b(?:se\s+)?(?:quedo|quede|quedamos)\s+sin\s+bateria\b/],
  ['tacho', esCo('tacografo|tacho', '@|#|error|no\\s+(?:me\\s+)?(?:lee|reconoce|acepta)'), /gasoil|combustible|banco|cajero/],
  ['tacho', esCo('tarjeta\\s+(?:de\\s+)?(?:conductor|tacografo|del\\s+conductor|chofer)', '@|#|error|no\\s+(?:\\S+\\s+)?(?:lee|reconoce|acepta)|perdi|perdid[oa]|se\\s+me\\s+perdio|extravi\\S*|robad[oa]|me\\s+la\\s+robaron|caducad[oa]|vencid[oa]')],
  ['fuelcard', esCo('tarjeta\\s+(?:de\\s+)?(?:gasoil|gasoleo|combustible|diesel|gasolina|carburante)|tarjeta\\s+(?:dkv|shell|uta|as\\s*24|eurowag)', 'bloquead[oa]|rechazad[oa]|denegad[oa]|no\\s+(?:me\\s+)?(?:\\S+\\s+)?(?:pasa|acepta|aceptan|la\\s+aceptan)|perdid[oa]|perdi|robad[oa]|caducad[oa]|vencid[oa]|@')],
  ['theft', /\b(?:robo|robaron|robado|robada|robados|robadas|han\s+robado|hurtaron|hurto|sustrajeron|ladron(?:es)?|desvalijaron|forzaron\s+(?:la\s+)?(?:cabina|puerta|cerradura)|(?:sacaron|chuparon|vaciaron)\s+(?:\S+\s+){0,3}?(?:gasoil|gasoleo|diesel|combustible|deposito|tanque))\b/, /tarjeta|llaves?|matricula|placa|nada\s+robado/],
  ['vandal', /\b(?:vandalismo|vandalizad[oa]s?|vandalizaron|vandalos|grafitis?|graffitis?|pintadas|rayaron|rajaron|pintaron|rasgaron)\b|\balguien\s+(?:me\s+|nos\s+|le\s+)?(?:\S+\s+){0,2}?(?:rayo|rajo|corto|rompio|pincho|pinto|reviento|arano)\b/],
  ['cabkit', esCo('asientos?\\s+(?:calefactables?|calefactados?|con\\s+calefaccion)|calefaccion\\s+(?:del|de\\s+los|de\\s+la)\\s+(?:asientos?|espejos?|retrovisor(?:es)?)|espejos?\\s+(?:calefactables?|calefactados?)', '@|no\\s+(?:se\\s+)?calientan?|sin\\s+calor')],
  ['lost', esCo('llaves?|papeles|documentos|documentacion|permiso\\s+de\\s+circulacion|ficha\\s+tecnica|tarjeta\\s+de\\s+circulacion|\\bcmr', 'perdi|perdid[oa]s?|se\\s+me\\s+(?:perdio|perdieron|cayeron|cayo)|extravi\\S*|no\\s+(?:las?\\s+|los?\\s+)?(?:encuentro|encontramos|aparece|aparecen)|robad[oa]s?|me\\s+las?\\s+robaron'), /tarjeta\s+(?:de\s+)?(?:conductor|gasoil|gasoleo|combustible|tacografo|dkv|shell|uta)|dentro\s+del?\s+(?:camion|la\s+cabina)/],
  ['coupling', esCo('remolque|semirremolque|semi|trailer|batea|cisterna', 'se\\s+(?:ha\\s+)?(?:solto|desengancho|desacoplo|separo)|desenganchad[oa]|desacoplad[oa]|no\\s+(?:se\\s+)?(?:engancha|acopla|enganchan)|no\\s+(?:lo|la)\\s+puedo\\s+enganchar'), /puertas?|\bluz|\bluces|\blona|freno/],
  ['coupling', esCo('quinta\\s+rueda|king\\s*pin|kingpin|perno\\s+rey|enganche|plato', '@|#|no\\s+(?:\\S+\\s+)?(?:cierra|bloquea|engancha|traba|cierran)|atascad[oa]|abiert[oa]'), /pinch|tuerca|comida/],
  ['dryfuel', /\b(?:me\s+|nos\s+)?(?:quede|quedamos|quedo|he\s+quedado)\s+sin\s+(?:gasoil|gasoleo|diesel|combustible|gasolina|carburante)\b|\bse\s+(?:me\s+|nos\s+)?(?:acabo|termino|agoto)\s+(?:el\s+)?(?:gasoil|gasoleo|diesel|combustible|gasolina)\b|\b(?:deposito|tanque)\s+(?:\S+\s+)?vacio\b/, /adblue|tarjeta|robaron|robo|sacaron|vaciaron|frigo/],
  ['reefer', esCo('frigo|frigorifico|equipo\\s+de\\s+frio|grupo\\s+(?:de\\s+)?frio|unidad\\s+de\\s+frio|thermo\\s*king|carrier|maquina\\s+de\\s+frio|termo|thermo|reefer|camara\\s+de\\s+frio', '@|no\\s+(?:\\S+\\s+)?(?:enfria|enfrian|congela|refrigera)|no\\s+(?:me\\s+)?(?:arranca|enciende|prende)|alarma|error|sube\\s+la\\s+temperatura|temperatura\\s+(?:sube|alta|subiendo)|no\\s+(?:baja|mantiene)\\s+(?:la\\s+)?temperatura'), /cabina|aire\s+acondicionado/],
  ['climate', esCo('aire\\s+acondicionado|\\bac|climatizador|calefaccion|calefactor|webasto|ventilador|aire\\s+de\\s+la\\s+cabina', '@|no\\s+(?:\\S+\\s+)?(?:enfria|enfrian|calienta|calientan|sale|tira|echa)|sale\\s+(?:aire\\s+)?(?:caliente|frio)|sin\\s+(?:frio|calor)|echa\\s+(?:aire\\s+)?caliente'), /frigo|equipo\s+de\s+frio|grupo\s+(?:de\s+)?frio|unidad\s+de\s+frio|thermo|carrier|reefer|asiento|espejo|retrovisor|motor/],
  ['climate', esCo('clima', 'no\\s+(?:\\S+\\s+)?(?:enfria|calienta)'), /frigo|reefer|thermo/],
  ['tarp', esCo('lonas?|toldo|cortinas?|cortinero', 'rot[oa]s?|rajad[oa]s?|cortad[oa]s?|cortaron|rajaron|rasgad[oa]s?|rasgaron|desgarrad[oa]s?|agujero|agujeread[oa]s?|se\\s+(?:volo|solto|rompio|abrio)|suelt[oa]s?|@|#')],
  ['exhaust', esCo('tubo\\s+de\\s+escape|escape|silenciador|mofle', 'se\\s+(?:cayo|ha\\s+caido|solto)|caido|colgando|suelt[oa]|agujero|agujeread[oa]|picad[oa]|hace\\s+(?:mucho\\s+)?ruido|@|#'), /humo|adblue/],
  ['visib', esCo('limpiaparabrisas|limpias|escobillas|limpiadores|plumas|wipers?|lavaparabrisas', '@|#|no\\s+(?:\\S+\\s+)?(?:limpian?|echan?\\s+agua|se\\s+mueven?)|no\\s+sale\\s+agua|sin\\s+agua|no\\s+hay\\s+agua')],
  ['seat', esCo('cinturon(?:\\s+de\\s+seguridad)?|asientos?', '@|#|no\\s+(?:\\S+\\s+)?(?:engancha|abrocha|cierra|bloquea|sube|baja|se\\s+mueve|traba)|se\\s+(?:baja|hunde|cae)|hundid[oa]|suelt[oa]|floj[oa]|atascad[oa]'), /calefact|calefaccion|calienta|fuego|humo|quemad|sangr/],
  ['door', esCo('puertas?|cerraduras?|manilla|manija|maneta|portalon|portones?', '@|#|no\\s+(?:\\S+\\s+)?(?:cierra|cierran|abre|abren|traba|bloquea)|no\\s+(?:se\\s+)?(?:puede|pueden)\\s+(?:cerrar|abrir)|atascad[oa]s?|se\\s+abre\\s+sol[oa]|se\\s+abrio\\s+(?:sol[oa]|en\\s+marcha)|trabad[oa]s?'), /ventanilla|ventana|elevalunas|cristal|vidrio|cinturon|tarjeta|forzaron|robaron|robo|quinta\s+rueda|king/],
  ['stuck', esCo('barro|lodo|fango|nieve|hielo|arena|cuneta|zanja|grava', 'atascad[oa]|atrapad[oa]|enterrad[oa]|hundid[oa]|encallad[oa]|empantanad[oa]|enlodad[oa]|no\\s+(?:puedo|podemos)\\s+salir|patina|patinan|patinando|me\\s+(?:atasque|quede\\s+atascado|hundi|enterre)'), /trafico|atasco\b|retencion/],
  ['numplate', esCo('matricula|placas?|patente', 'se\\s+(?:cayo|ha\\s+caido|solto)|caida|perdid[oa]|perdi|robad[oa]|me\\s+la\\s+robaron|no\\s+se\\s+(?:lee|ve)|ilegible|suelt[oa]|#|@'), /\bluz|\bluces|iluminacion/],
  ['gear', esCo('caja\\s+de\\s+cambios|cambios|marchas?|embrague|clutch|transmision', '@|no\\s+(?:me\\s+)?(?:entra|entran|engrana|engranan|mete)|no\\s+puedo\\s+(?:meter|cambiar)|patina|patinando|se\\s+(?:quemo|salta|sale|salen)|quemad[oa]|dur[oa]s?|rasca|rascan|cruje|salta'), /\bluz|testigo|cambio\s+de\s+aceite|rueda|neumatico/],
  ['wheel', esCo('tuercas?|tornillos?\\s+de\\s+(?:la\\s+)?rueda|esparragos?|pernos?\\s+de\\s+(?:la\\s+)?rueda|birlos?', 'floj[oa]s?|suelt[oa]s?|falta|faltan|se\\s+(?:cayo|cayeron|solto|soltaron)|caid[oa]s?|perdid[oa]s?|rot[oa]s?'), /freno|espejo|asiento|matricula|placa|perno\s+rey/],
  ['wheel', esCo('rodamiento|cojinete|buje|cubo\\s+de\\s+(?:la\\s+)?rueda', 'caliente|se\\s+calienta|ruido|hace\\s+ruido|suena|@|#')],
  ['susp', esCo('suspension|balonas?|fuelles?|pulmon(?:es)?|ballestas?|amortiguador(?:es)?|muelles?|bolsas?\\s+de\\s+aire|colchon\\s+de\\s+aire', 'reventad[oa]s?|revento|exploto|pinchad[oa]|pierden?\\s+aire|fugas?|se\\s+(?:bajo|baja|hundio|cae)|bajad[oa]|sin\\s+aire|floj[oa]s?|@|#'), /direccion|volante|asiento/],
  ['adas', esCo('sensor(?:es)?|radar|camara|control\\s+de\\s+crucero|crucero|asistente\\s+de\\s+carril|frenad[oa]\\s+de\\s+emergencia|aviso\\s+de\\s+carril', '@|error|no\\s+(?:\\S+\\s+)?(?:funciona|detecta)'), /frigo|tacografo|camara\s+(?:de\s+)?(?:frio|frigorifica)|dashcam/],
  ['adas', new RegExp(`\\b(?:${ES_TRUCK})\\s+(?:\\S+\\s+){0,2}?frena\\s+sol[oa]\\b|\\bfrena\\s+sol[oa]\\b`)]];
function esKinds(v) { const k = new Set(); for (const raw of String(v || '').split(/[.,;!?¡¿\n]+|\s(?:y|e|pero|aunque|ademas|tambien)\s/i)) { if (!/[a-z]/i.test(raw)) continue; const f = esFold(raw); if (!ES_MARK.test(f)) continue; const p = f.replace(ES_NEG, ' '); if (!ES_OK.test(p)) for (const [n, rx, ex] of ES_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); } if (k.has('acc')) k.delete('injury'); return k; }






const ptFold = (s) => ' ' + String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'`´]/g, ' ').replace(/\bta\b/g, 'esta').replace(/\btao\b/g, 'estao')
  .replace(/\bpra\b/g, 'para').replace(/\bq\b/g, 'que').replace(/\bn\s+(?=(?:funciona|funcionam|pega|liga|arranca|acende|acendem|da|trava|freia|fecha|abre|sobe|desce|gela|arrefece|esfria|aquece|engata|entra|entram)\b)/g, 'nao ')
  .replace(/\bnao\s+(?:me\s+)?(?:esta|estao)\s+(?:bem|bom|boa|em\s+condicoes)\b/g, 'esta mal').replace(/\bnao\s+(?:me\s+)?(funcionam?|trabalham?|anda|andam)\s+(?:bem|direito|como\s+deve)\b/g, 'nao $1')
  .replace(/\b(?:ainda\s+)?nao\s+(?:o\s+|a\s+|os\s+|as\s+)?(?:esta|estao|foi|foram|ficou|ficaram)\s+(?:arranjad|reparad|consertad|trocad|resolvid|substituid)\S*/g, 'esta mal').replace(/\s+/g, ' ') + ' ';
const PT_MARK = /\b(?:o|a|os|as|do|da|dos|das|no|na|nos|nas|nao|um|uma|com|em|esta|estao|tem|tenho|ha|meu|minha|que|se|de|para|muito|ja|sem|foi|ficou|fiquei|estou|estamos|camiao|caminhao|perde|perdendo|pinga|vaza|deu|pelo|pela|ao|aos|mas|num|numa|me|eu)\b/;
const PT_D = 'partid[oa]s?|quebrad[oa]s?|avariad[oa]s?|avariou|estragad[oa]s?|estragou|danificad[oa]s?|com\\s+(?:defeito|problema|avaria)|defeituos[oa]s?|nao\\s+(?:esta\\s+a\\s+|esta\\s+)?(?:funcionam?|funcionando|trabalham?|anda|andam|presta|prestam)|(?:esta|estao)\\s+a\\s+falhar|falham?|falhando|tem\\s+(?:um\\s+|uma\\s+)?(?:problema|defeito|avaria)|(?:esta|estao)\\s+mal|pifou|pifad[oa]s?|deu\\s+(?:problema|defeito|o\\s+berro)|(?:esta|estao)\\s+(?:a\\s+dar|dando)\\s+problemas?';
const PT_BRK = 'rachad[oa]s?|racha|rachadura|trincad[oa]s?|trinca|estalad[oa]s?|fissurad[oa]s?|fissura|amolgad[oa]s?|amassad[oa]s?|tort[oa]s?|dobrad[oa]s?|empenad[oa]s?|lascad[oa]s?';
const ptCo = (n, d) => new RegExp(`^(?=.*\\b(?:${n})(?![a-z]))(?=.*\\b(?:${d.split('@').join(PT_D).split('#').join(PT_BRK)})(?![a-z]))`);
const PT_TRUCK = 'camiao|caminhao|cavalo\\s+mecanico|trator|tractor|viatura|veiculo|carrinha|furgao|carro';
const PT_OK = /\b(?:ja\s+)?(?:arranjad[oa]s?|reparad[oa]s?|consertad[oa]s?|substituid[oa]s?|resolvid[oa]s?|trocad[oa]s?)\b|\b(?:ja\s+)?(?:funcionam?|trabalham?)\s+(?:bem|direito|normalmente|outra\s+vez|de\s+novo|perfeitamente)\b|\bvolt(?:ou|aram)\s+a\s+funcionar\b|\bja\s+(?:funcionam?|pega|arranca|liga|trava|freia|arrefece|gela)\b|\btudo\s+(?:bem|ok|certo|em\s+ordem|normal|tranquilo|beleza)\b|\bsem\s+(?:nenhum\s+)?problemas?\b|\bnenhum\s+problema\b/;
const PT_NEG = /\bnao\s+(?:se\s+)?(?:ve\s+)?(?:pinga|pingam|vaza|vazam|perde|perdem|verte|partiu|partiram|quebrou|houve\s+\S+|ha\s+(?:nenhuma?\s+)?(?:fugas?|vazamentos?|danos?|feridos?|fogo|fumo|fumaca)|tem\s+(?:fugas?|vazamentos?|danos?)|esta\s+(?:partid[oa]|furad[oa]|danificad[oa]|avariad[oa]|queimad[oa]|estragad[oa])|estao\s+(?:partid[oa]s|furad[oa]s|danificad[oa]s)|bati|batemos|bateu|(?:me\s+|nos\s+)?(?:roubaram|furtaram)(?:\s+nada)?|aconteceu\s+nada)\b|\bsem\s+(?:nenhuma?\s+)?(?:fugas?|vazamentos?|perdas?|danos?|feridos?|acidentes?|incidentes?|fumo|fumaca|fogo|estragos?)\b|\bninguem\s+(?:\S+\s+)?(?:ferido|magoado|machucado)\b|\bninguem\s+se\s+(?:magoou|machucou|feriu)\b/g;
const PT_KINDS = [['brake', ptCo('travoes|travao|freios?|travagem', '@|nao\\s+(?:\\S+\\s+)?(?:travam?|freiam?|seguram?|pegam?)|sem\\s+(?:travoes|travao|freios?)|moles?|esponjos[oa]s?|fofos?|(?:esta|estao)\\s+a\\s+(?:prender|bloquear)|(?:bloqueiam?|prendem?)\\s+sozinh[oa]s?|bloquead[oa]s?|pres[oa]s?|chiam?|chiando|guincham?|apitam?|fazem?\\s+(?:barulho|ruido)|(?:travam?|freiam?)\\s+(?:mal|pouco)|demora\\s+a\\s+(?:travar|frear)'), /(?:travao|freio)\s+de\s+(?:mao|estacionamento|parque|parqueamento)|\bluz|\bluzes|liquido|\bar\b|escape|motor/],
  ['brake', ptCo(PT_TRUCK, 'nao\\s+(?:trava|freia)|(?:trava|freia)\\s+(?:mal|pouco)|demora\\s+a\\s+(?:travar|frear)'), /sozinh|porta/],
  ['brake', ptCo('pressao\\s+(?:do\\s+|de\\s+)?ar|ar\\s+dos\\s+(?:travoes|freios)|reservatorios?\\s+de\\s+ar', 'baixa|baixando|a\\s+baixar|cai|caindo|a\\s+cair|nao\\s+sobe|perde|perdendo|fuga|vazamento')],
  ['parkbrake', ptCo('(?:travao|freio)\\s+de\\s+(?:mao|estacionamento|parque|parqueamento)', '@|nao\\s+(?:se\\s+)?(?:solta|desbloqueia|segura|prende|aguenta)|pres[oa]|bloquead[oa]|encravad[oa]|emperrad[oa]')],
  ['parkbrake', new RegExp(`\\b(?:${PT_TRUCK}|reboque|semirreboque|galera)\\s+(?:\\S+\\s+){0,2}?(?:andou|desceu|deslizou|se\\s+moveu|moveu-se|rolou|descaiu)\\s+sozinh[oa]\\b`)],
  ['flat', ptCo('pneus?|rodas?|pneumaticos?', 'furad[oa]s?|furou|furaram|um\\s+furo|rebentad[oa]s?|rebentou|rebentaram|estourad[oa]s?|estourou|estouraram|vazi[oa]s?|murch[oa]s?|em\\s+baixo|arriou|arriad[oa]s?|sem\\s+ar|(?:perde|perdem|perdendo|a\\s+perder)\\s+ar|esvaziou|esvaziad[oa]s?'), /porcas?|pernos?|parafusos?|rolamentos?|cubo|quinta\s+roda|suspensao|balao|baloes|foles?/],
  ['tyre', ptCo('pneus?|pneumaticos?', 'gast[oa]s?|desgastad[oa]s?|carecas?|lis[oa]s?|sem\\s+(?:piso|rasto|sulco|borracha)|cortad[oa]s?|com\\s+(?:um\\s+)?(?:corte|alto|inchaco|bolha|hernia)|tem\\s+(?:um\\s+)?(?:corte|alto|inchaco|bolha|hernia)|bolhas?|hernia|inchad[oa]s?|deformad[oa]s?|ressequid[oa]s?'), /fur|rebent|estour|vazi|murch|sem\s+ar|perde|esvazi/],

  ['flat', ptCo('pneus?|pneumaticos?', 'estragad[oa]s?|estragou|partid[oa]s?|avariad[oa]s?|pifou|lixad[oa]s?|mort[oa]s?|foi\\s+(?:se|ao\\s+ar)'), /porcas?|pernos?|parafusos?|rolamentos?|cubo|quinta\s+roda|suspensao|balao|baloes|foles?|sobresselente|suplente|reserva|step|escova|limpa/],
  ['tyre', ptCo('pneus?|pneumaticos?', 'danificad[oa]s?'), /fur|rebent|estour|vazi|murch|sem\s+ar|esvazi|sobresselente|suplente|reserva|step/],
  ['steer', ptCo('direcao|direccao|volante', '@|dur[oa]|pesad[oa]|(?:com|tem)\\s+folga|folga|vibra|treme|tremendo|a\\s+tremer|bamb[oa]|solt[oa]|puxa\\s+(?:para\\s+)?(?:a\\s+)?(?:direita|esquerda)'), /(?:na|em)\s+direcao|direcao\s+(?:a|ao|de|do|da|norte|sul)\b|assistente|faixa|pisca|seta/],
  ['steer', ptCo(PT_TRUCK, '(?:puxa|foge|desvia)\\s+(?:para\\s+)?(?:a\\s+)?(?:direita|esquerda)')],
  ['leak', ptCo('oleo|gasoleo|diesel|combustivel|refrigerante|anticongelante|adblue|hidraulico|liquido\\s+(?:de\\s+|dos\\s+)?(?:travoes|freios?|arrefecimento|refrigeracao|hidraulico)|agua\\s+do\\s+(?:motor|radiador)|radiador', 'pinga|pingam|pingando|a\\s+pingar|vaza|vazam|vazando|a\\s+verter|verte|perde|perdem|perdendo|a\\s+perder|fugas?|vazamento|derrama|escorre|escorrendo|a\\s+escorrer|poca|manchas?'), /muda\s+de\s+oleo|troca\s+de\s+oleo|cartao|vazio|fiquei\s+sem|ficamos\s+sem|roub|furt|tiraram|sugaram|forca|potencia/],
  ['leak', /\bha\s+(?:uma\s+)?(?:fuga|vazamento|poca)\b|\b(?:pinga|vaza|escorre)\s+(?:alguma\s+coisa|algo|por\s+baixo)\b/, /\bar\b|teto|tecto|chuva|cartao|\bluz/],
  ['fire', /\b(?:fogo|incendio|pegou\s+fogo|pegando\s+fogo|a\s+pegar\s+fogo|(?:esta|estao)\s+a\s+arder|ardendo|em\s+chamas|chamas|labaredas|queimou-?(?:se)?\s+(?:o|a)\s+(?:camiao|caminhao|cabine|cabina|motor|reboque|carga))\b/, /embraiagem|embreagem|fusivel|lampada|comida|cigarr|fosforo|isqueiro|extintor|\bluz|\bluzes/],
  ['fire', ptCo('cabine|cabina|motor|camiao|caminhao|cabos?|cablagem|fiacao|fios|bateria|bancos?|assentos?|painel|tablier|reboque', 'fumo|fumaca|sai\\s+(?:fumo|fumaca)|deita\\s+fumo|solta\\s+fumaca|cheira\\s+a\\s+queimado|cheiro\\s+(?:a|de)\\s+queimado|cheirando\\s+a\\s+queimado'), /escape|escapamento|tubo|pret[oa]|branc[oa]|azul|muito\s+fum|muita\s+fum|embraiagem|embreagem|travoes|travao|freios?|cigarro/],
  ['acc', /\b(?:acidente|bati|batemos|bateram|batida|colisao|colidi|colidiu|choquei|chocamos|choque\s+com|embati|embateu|embate|abalroad[oa]|atropel\S*|capotou|capotei|tombou|tombei|tombamento|despistei|despistou|sinistro)\b/, /biela|ponto|porta|meta|recorde|coracao|sino|bateria/],

  ['acc', /\b(?:sai|saiu|saimos)\s+(?:\S+\s+)?da\s+(?:estrada|pista|via|autoestrada|rodovia)|\b(?:na|numa)\s+(?:vala|valeta|ribanceira)\b/, /carga|palet|\bnao\s+(?:\S+\s+)?(?:sai|caiu|cai|esta|estamos|fiquei|ficou|foi|fomos)/],

  ['stuck', /\b(?:na|numa)\s+(?:vala|valeta|ribanceira)\b/, /carga|palet|\bnao\s+(?:\S+\s+)?(?:sai|caiu|cai|esta|fiquei)/],
  ['injury', /\b(?:ferid[oa]s?|magoad[oa]s?|machucad[oa]s?|me\s+machuquei|machuquei-?me|magoei-?me|me\s+magoei|sangr\S*|sangue|ambulancia|lesionad[oa]s?)\b/],
  ['nostart', /\b(?:nao\s+(?:me\s+)?(?:pega|arranca|liga|da\s+(?:partida|ignicao|arranque|sinal\s+de\s+vida)|quer\s+(?:pegar|arrancar|ligar|trabalhar))|(?:motor|camiao|caminhao)\s+(?:\S+\s+)?(?:morreu|morre|desliga\s+sozinho|desligou\s+sozinho|apaga|apagou|vai\s+abaixo|foi\s+abaixo|parou\s+(?:de\s+repente|sozinho|em\s+andamento))|(?:desliga|desligou|apaga|apagou|morre|morreu|foi\s+abaixo|vai\s+abaixo)\s+(?:o\s+)?(?:motor|camiao|caminhao))\b/, /frio|frigorific|maquina\s+de\s+frio|thermo|termo|carrier|reefer|ar\s+condicionado|ar-condicionado|climatiz|aquecimento|webasto|sofagem|\bluz|\bluzes|farol|farois|pisca|seta|ecra|tela|tablet|telemovel|celular|telefone|radio|gps|wifi|computador|cartao|tacografo|ninguem|chefe|cliente|escritorio|despacho|\bele\b|\bela\b/],
  ['engine', ptCo('motor', 'aquece|aquecendo|a\\s+aquecer|sobreaquec\\S*|superaquec\\S*|temperatura\\s+alta|faz\\s+(?:um\\s+)?(?:barulho|ruido)|barulho\\s+(?:estranho|esquisito|forte)|ruido\\s+(?:estranho|esquisito)|bate|batendo|a\\s+bater|(?:perde|perdendo|a\\s+perder)\\s+(?:forca|potencia)|sem\\s+(?:forca|potencia)|nao\\s+(?:tem\\s+)?(?:forca|potencia)|nao\\s+puxa|engasga|engasgando|a\\s+engasgar|modo\\s+de\\s+emergencia|@'), /(?:nao|sem)\s+(?:me\s+)?(?:pega|arranca|liga|da)|morreu|morre|desliga|apaga|abaixo|fumo|fumaca|cheir|pinga|vaza|verte|perde\s+(?:oleo|agua|gasoleo|diesel|refrigerante|adblue)|fuga|vazamento|\bluz|testemunho|frio|frigorific|thermo|carrier|reefer/],
  ['engine', ptCo(PT_TRUCK, '(?:perde|perdendo|a\\s+perder)\\s+(?:forca|potencia)|sem\\s+(?:forca|potencia)|nao\\s+(?:tem\\s+)?(?:forca|potencia)|nao\\s+puxa|modo\\s+de\\s+emergencia')],
  ['engine', ptCo('motor|escape|escapamento|tubo\\s+de\\s+escape|silenciador', '(?:fumo|fumaca)\\s+(?:muito\\s+)?(?:pret[oa]|branc[oa]|azul)|(?:muito|muita)\\s+(?:fumo|fumaca)')],
  ['engine', ptCo('turbo', '@|assobia|apita|faz\\s+barulho|chia'), /fumo|fumaca/],
  ['engine', ptCo('temperatura\\s+do\\s+(?:motor|agua)', 'sobe|subindo|a\\s+subir|alta|muito\\s+alta|no\\s+vermelho')],
  ['mirror', ptCo('espelhos?|retrovisor(?:es)?', '@|#|caiu|soltou|solt[oa]s?|bamb[oa]|abana|a\\s+abanar|arrancad[oa]|pendurad[oa]|partiram'), /aquecid|aquecimento|aquece|desembaci/],
  ['glass', ptCo('para-?brisas?|vidro\\s+da\\s+frente|vidro\\s+dianteiro|vidro', '#|partid[oa]|quebrad[oa]|pedra|pedrada|impacto|picad[oa]|lascad[oa]|estrela'), /espelho|retrovisor|janela|porta|lateral|elevador|sobe|desce|limpa|farol|farois|\bluz|lanterna|ecra|tela/],
  ['window', ptCo('janelas?|vidros?\\s+(?:da|de)\\s+(?:porta|janela)|vidros?\\s+(?:eletricos?|electricos?|laterais|lateral)|elevador(?:es)?\\s+d[eo]s?\\s+vidros?|vidros?(?=\\s+(?:\\S+\\s+)?nao\\s+(?:sobe|desce|sobem|descem|fecha|fecham|abre|abrem))', 'nao\\s+(?:\\S+\\s+)?(?:sobe|desce|sobem|descem|fecha|fecham|abre|abrem)|encravad[oa]|emperrad[oa]|ficou\\s+(?:abert[oa]|em\\s+baixo)|@')],
  ['lights', ptCo('luz|luzes|farol|farois|farolins?|piscas?|setas?|lampadas?|minimos|medios|maximos|lanternas?|faroletes?', '@|#|fundid[oa]s?|fundiu|fundiram|queimad[oa]s?|queimou|queimaram|nao\\s+(?:\\S+\\s+)?(?:acende|acendem|liga|ligam|funciona|funcionam|pisca|piscam|alumia|alumiam|ilumina)|apagad[oa]s?|sem\\s+(?:luz|luzes)|piscam?\\s+(?:muito\\s+)?(?:rapido|depressa)'), /(?:luz|luzes)\s+(?:de\s+|do\s+|da\s+)?(?:avaria|aviso|alerta|advertencia|motor|oleo|bateria|injecao|abs|ebs|check)|painel|tablier|quadrante|acendeu|acesa|testemunho|cabine\s+(?:da\s+)?luz|frio|frigorific|matricula|placa|telemovel|celular/],
  ['warnlight', ptCo('luz\\s+(?:de\\s+|do\\s+|da\\s+)?(?:avaria|aviso|alerta|advertencia|motor|oleo|bateria|injecao)|check\\s+engine|abs|ebs|testemunho|luz\\s+(?:amarela|vermelha|laranja)', 'acesa|acendeu|acende|ligou|ligada|aparece|apareceu|a\\s+piscar|piscando|pisca|nao\\s+apaga|ficou\\s+acesa'), /tacografo|cartao|frio|frigorific/],
  ['warnlight', ptCo('painel|tablier|quadrante|ecra|display|computador\\s+de\\s+bordo', '(?:aparece|apareceu|mostra|da|deu|ha|tem)\\s+(?:um\\s+|uma\\s+)?(?:erro|aviso|falha|mensagem|avaria|codigo)|erro'), /tacografo|cartao|frio|frigorific|telemovel|celular|tablet/],
  ['batt', ptCo('baterias?|acumulador', 'descarregad[oa]s?|descarregou|arriad[oa]s?|arriou|mort[oa]s?|sem\\s+carga|nao\\s+(?:\\S+\\s+)?carrega|nao\\s+carregam|fracas?|inchad[oa]s?|em\\s+baixo|@'), /\bluz|testemunho|roub|furt|telemovel|celular|telefone|tablet|portatil|computador|lanterna|fumo|fumaca|fogo|cheir|radio|gps/],
  ['batt', /\b(?:fiquei|ficou|ficamos)\s+sem\s+bateria\b/, /telemovel|celular|telefone|tablet|portatil|computador|lanterna|radio|gps/],
  ['tacho', ptCo('tacografo', '@|#|erro|nao\\s+(?:\\S+\\s+)?(?:le|reconhece|aceita)'), /gasoleo|combustivel|multibanco/],
  ['tacho', ptCo('cartao\\s+(?:de\\s+|do\\s+)?(?:condutor|motorista|tacografo)', '@|#|erro|nao\\s+(?:\\S+\\s+)?(?:le|reconhece|aceita)|perdi|perdid[oa]|extravi\\S*|roubad[oa]|roubaram|expirad[oa]|caducad[oa]|vencid[oa]')],
  ['fuelcard', ptCo('cartao\\s+(?:de\\s+|do\\s+)?(?:combustivel|gasoleo|gasoil|diesel|abastecimento|frota)|cartao\\s+(?:dkv|shell|uta|as\\s*24|eurowag|galp|bp|repsol)', 'bloquead[oa]|recusad[oa]|rejeitad[oa]|nao\\s+(?:\\S+\\s+)?(?:passa|aceita|aceitam|funciona|da)|perdi|perdid[oa]|roubad[oa]|expirad[oa]|caducad[oa]|vencid[oa]|@')],
  ['cabkit', ptCo('bancos?\\s+aquecidos?|assentos?\\s+aquecidos?|aquecimento\\s+(?:do|dos|da)\\s+(?:bancos?|assentos?|espelhos?|retrovisor(?:es)?)|espelhos?\\s+aquecidos?|retrovisor(?:es)?\\s+aquecidos?', '@|nao\\s+(?:\\S+\\s+)?aquecem?|sem\\s+aquecimento')],
  ['lost', ptCo('chaves?|documentos|papeis|documentacao|livrete|dua|crlv|certificado\\s+de\\s+matricula|cmr|guias?\\s+de\\s+transporte', 'perdi|perdid[oa]s?|perderam|extravi\\S*|nao\\s+(?:as\\s+|os\\s+|a\\s+|o\\s+)?(?:encontro|acho|encontramos|aparece|aparecem)|sumiu|sumiram|desapareceu|desapareceram|roubad[oa]s?|roubaram|furtad[oa]s?|furtaram'), /cartao/],
  ['coupling', ptCo('reboque|semirreboque|semi-reboque|semi|galera|carreta|cisterna|atrelado', 'soltou|soltou-se|se\\s+soltou|desengatou|desengatou-se|desengatad[oa]|desacoplou|desacoplad[oa]|nao\\s+(?:se\\s+)?(?:engata|acopla|engatam)|nao\\s+(?:o\\s+|a\\s+)?consigo\\s+engatar'), /portas?|\bluz|\bluzes|lona|travao|freio/],
  ['coupling', ptCo('quinta\\s+roda|king\\s*pin|kingpin|prato|engate|cavilha', '@|#|nao\\s+(?:\\S+\\s+)?(?:fecha|trava|engata|tranca|fecham)|encravad[oa]|emperrad[oa]|abert[oa]'), /fur|porca|comida|almoco|jantar/],
  ['dryfuel', /\b(?:fiquei|ficamos|ficou|estou|estamos)\s+sem\s+(?:gasoleo|diesel|combustivel|gasolina)\b|\b(?:acabou|acabou-se|terminou)\s+(?:o\s+)?(?:gasoleo|diesel|combustivel|gasolina)\b|\b(?:deposito|tanque)\s+(?:\S+\s+)?vazio\b|\bsecou\s+o\s+(?:deposito|tanque)\b/, /adblue|cartao|roub|furt|tiraram|sugaram|frio|frigorific/],
  ['reefer', ptCo('frio|frigorifico|maquina\\s+(?:de|do)\\s+frio|grupo\\s+(?:de\\s+)?frio|unidade\\s+de\\s+frio|thermo\\s*king|carrier|termo|thermo|reefer|camara\\s+frigorifica|bau\\s+(?:frigorifico|refrigerado)', '@|nao\\s+(?:\\S+\\s+)?(?:arrefece|arrefecem|gela|gelam|refrigera|congela|esfria|faz\\s+frio)|nao\\s+(?:\\S+\\s+)?(?:arranca|liga|pega)|alarme|em\\s+alarme|da\\s+alarme|temperatura\\s+(?:sobe|subiu|alta|a\\s+subir)'), /estou\s+com\s+frio|faz\s+(?:muito\s+)?frio|(?:hoje|la\s+fora)|ar\s+condicionado|ar-condicionado|climatiz|cabine|cabina|aquecimento/],
  ['climate', ptCo('ar\\s+condicionado|ar-condicionado|ac|climatizacao|climatizador|aquecimento|sofagem|aquecedor|webasto|ventilador|ventilacao|chaufagem', '@|nao\\s+(?:\\S+\\s+)?(?:arrefece|arrefecem|gela|gelam|esfria|aquece|aquecem|sai|deita|da\\s+frio|da\\s+calor)|sai\\s+(?:ar\\s+)?(?:quente|frio)|sem\\s+(?:frio|ar|calor)|deita\\s+(?:ar\\s+)?quente'), /frigorific|maquina\s+de\s+frio|grupo\s+de\s+frio|thermo|carrier|reefer|bancos?|assentos?|espelhos?|retrovisor/],
  ['tarp', ptCo('lonas?|cortinas?|cortineiro|toldo|encerado', 'rasgad[oa]s?|rasgou|rot[oa]s?|furad[oa]s?|cortad[oa]s?|um\\s+(?:buraco|rasgao)|buraco|solt[oa]s?|soltou|voou|abriu-se|@|#')],
  ['exhaust', ptCo('tubo\\s+de\\s+escape|escape|escapamento|silenciador|panela\\s+de\\s+escape|ponteira', 'caiu|soltou|solt[oa]|pendurad[oa]|a\\s+arrastar|arrastando|furad[oa]|buraco|faz\\s+(?:muito\\s+)?barulho|barulho|@|#'), /fumo|fumaca|adblue|travao\s+de\s+escape/],
  ['visib', ptCo('limpa-?para-?brisas?|limpa-?vidros?|limpadores?|escovas?|escovinhas|palhetas?|esguichos?|lava-?vidros?', '@|#|nao\\s+(?:\\S+\\s+)?(?:limpam?|deitam?\\s+agua|mexem?|esguicham?)|nao\\s+sai\\s+agua|sem\\s+agua|nao\\s+ha\\s+agua|riscam|arrastam')],
  ['seat', ptCo('cinto(?:\\s+de\\s+seguranca)?|bancos?|assentos?|cadeira', '@|#|nao\\s+(?:\\S+\\s+)?(?:prende|trava|fecha|bloqueia|sobe|desce|se\\s+mexe|encaixa|engata)|(?:desce|baixa|afunda|cai)\\s+sozinh[oa]|afundad[oa]|solt[oa]|bamb[oa]|encravad[oa]|emperrad[oa]'), /aquec|fogo|fumo|fumaca|queimad|sangr|multibanco|conta|dinheiro|transferencia|cartao|pagamento|pagar/],
  ['door', ptCo('portas?|fechaduras?|puxador(?:es)?|macaneta|portoes?|taipais?', '@|#|nao\\s+(?:\\S+\\s+)?(?:fecha|fecham|abre|abrem|tranca|trancam|trava)|nao\\s+(?:se\\s+)?(?:consegue|consigo|da\\s+para)\\s+(?:fechar|abrir)|encravad[oa]s?|emperrad[oa]s?|abre\\s+sozinh[oa]|abriu\\s+(?:sozinh[oa]|em\\s+andamento|a\\s+andar)|pres[oa]s?'), /vidro|janela|elevador|porta-|portagem/],
  ['stuck', ptCo('lama|lamaceiro|neve|gelo|areia|valeta|vala|berma|barro', 'atolad[oa]|atolou|atolei|atascad[oa]|atasquei|enterrad[oa]|enterrei|enterrou|pres[oa]|encalhad[oa]|nao\\s+(?:consigo|conseguimos|da\\s+para)\\s+sair|patina|patinam|patinando|a\\s+patinar|derrapa'), /transito|engarrafamento|fila|bicha|trafego/],
  ['numplate', ptCo('matricula|placas?|chapa\\s+de\\s+matricula', 'caiu|soltou|cai|perdid[oa]|perdi|roubad[oa]|roubaram|ilegivel|nao\\s+se\\s+(?:le|ve)|solt[oa]|#|@'), /\bluz|\bluzes|iluminacao|certificado|livrete|documento|eletronica|electronica|sinal/],
  ['gear', ptCo('caixa\\s+de\\s+(?:velocidades|cambio|mudancas)|cambio|mudancas?|marchas?|embraiagem|embreagem|velocidades', '@|nao\\s+(?:\\S+\\s+)?(?:entra|entram|engrena|engrenam|mete|engata)|nao\\s+consigo\\s+(?:meter|engatar|passar)|patina|patinando|a\\s+patinar|queimou|queimad[oa]|dur[oa]s?|arranha|arranham|raspa|salta|saltam|range'), /\bluz|testemunho|cambio\s+(?:de\s+)?(?:oleo|pneus?|turno)|frio|reboque/],
  ['wheel', ptCo('porcas?(?:\\s+da\\s+roda)?|pernos?|parafusos?\\s+da\\s+roda|prisioneiros?', 'frouxas?|frouxos?|solt[oa]s?|faltam?|cairam|caiu|soltaram|soltou|perdid[oa]s?|partid[oa]s?|partiu'), /travao|freio|espelho|banco|matricula|placa|cavilha|king/],
  ['wheel', ptCo('rolamentos?|cubo(?:\\s+da\\s+roda)?|cubos', 'quente|aquece|a\\s+aquecer|barulho|faz\\s+barulho|ruido|chia|@|#')],
  ['susp', ptCo('suspensao|baloes|balao|bolsas?\\s+de\\s+ar|foles?|molas?|feixes?\\s+de\\s+molas?|amortecedor(?:es)?|almofadas?\\s+de\\s+ar', 'rebentad[oa]s?|rebentou|estourad[oa]s?|estourou|furad[oa]s?|furou|perdem?\\s+ar|perdendo\\s+ar|a\\s+perder\\s+ar|fugas?|vazamento|baixou|baix[oa]|em\\s+baixo|afundou|sem\\s+ar|solt[oa]s?|@|#'), /direcao|volante|bancos?|assentos?/],
  ['adas', ptCo('sensor(?:es)?|radar|camaras?|cameras?|cruise\\s+control|controlo\\s+de\\s+velocidade|controle\\s+de\\s+cruzeiro|piloto\\s+automatico|assistente\\s+de\\s+(?:faixa|via)|travagem\\s+de\\s+emergencia|frenagem\\s+de\\s+emergencia|aviso\\s+de\\s+(?:faixa|saida\\s+de\\s+faixa)', '@|erro|nao\\s+(?:\\S+\\s+)?(?:funciona|deteta|detecta)'), /frio|frigorific|tacografo|dashcam|camara\s+de\s+ar|camera\s+de\s+ar|pneu/],
  ['adas', new RegExp(`\\b(?:${PT_TRUCK})\\s+(?:\\S+\\s+){0,2}?(?:trava|freia)\\s+sozinh[oa]\\b|\\b(?:trava|freia)\\s+sozinh[oa]\\b`)],
  ['theft', /\b(?:roubo|roubaram|roubad[oa]s?|furto|furtaram|furtad[oa]s?|ladr(?:ao|oes)|assalt\S*|arrombaram|arrombad[oa]|forcaram\s+(?:a\s+)?(?:cabine|porta|fechadura)|(?:tiraram|sugaram|levaram)\s+(?:\S+\s+){0,3}?(?:gasoleo|diesel|combustivel|deposito|tanque))\b/, /cartao|chaves?|matricula|placa|documentos|papeis/],
  ['vandal', /\b(?:vandalismo|vandaliz\S*|vandalos|grafitis?|graffitis?|pichac\S*|pichad[oa]s?|picharam|riscaram|riscad[oa]\s+(?:de\s+)?proposito)\b|\balguem\s+(?:me\s+|nos\s+|lhe\s+)?(?:\S+\s+){0,2}?(?:riscou|rasgou|cortou|partiu|quebrou|furou|pintou|amolgou|amassou)\b/]];
function ptKinds(v) { const k = new Set(); for (const raw of String(v || '').split(/[.,;!?\n]+|\s(?:e|mas|por[eé]m|tamb[eé]m|al[eé]m\s+disso)\s/i)) { if (!/[a-z]/i.test(raw)) continue; const f = ptFold(raw); if (!PT_MARK.test(f)) continue; const p = f.replace(PT_NEG, ' '); if (!PT_OK.test(p)) for (const [n, rx, ex] of PT_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); } if (k.has('acc')) k.delete('injury'); return k; }






const itFold = (s) => ' ' + String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'`´]/g, ' ').replace(/\bc\s+e\b/g, 'ce').replace(/\bnn\b/g, 'non')
  .replace(/\bnon\s+(?:mi\s+)?(?:e|sono|va|vanno)\s+(?:bene|a\s+posto|apposto|in\s+ordine)\b/g, 'e mal').replace(/\bnon\s+(?:mi\s+)?(funziona|funzionano)\s+(?:bene|come\s+dovrebbe|correttamente|benissimo)\b/g, 'non $1')
  .replace(/\b(?:ancora\s+)?non\s+(?:l\s+|lo\s+|la\s+|li\s+|le\s+)?(?:e|sono|hanno|ha)\s+(?:ancora\s+)?(?:stat[oaie]\s+)?(?:riparat|aggiustat|sistemat|cambiat|sostituit|risolt)\S*/g, 'e mal').replace(/\s+/g, ' ') + ' ';
const IT_MARK = /\b(?:il|lo|la|i|gli|le|l|del|dello|della|dei|degli|delle|di|da|dal|dalla|dallo|non|un|una|uno|con|in|nel|nella|per|mi|si|ho|ha|hanno|abbiamo|sono|siamo|e|che|ce|ci|sta|stanno|piu|gia|senza|al|alla|ai|sul|sulla|camion|tir|mio|mia|perde|perdono|gocciola|qualcuno|tutto|ancora)\b/;
const IT_D = 'rott[oaie]|si\\s+(?:e\\s+|sono\\s+)?(?:rott[oaie]|guastat[oaie])|guast[oaie]|guastat[oaie]|danneggiat[oaie]|difettos[oaie]|non\\s+(?:mi\\s+)?(?:funziona|funzionano|va|vanno)|(?:ha|hanno)\\s+(?:un\\s+)?(?:problema|guasto|difetto)|e\\s+mal|in\\s+avaria|avariat[oaie]|fuori\\s+uso|da\\s+(?:cambiare|sostituire|riparare)';
const IT_BRK = 'crepat[oaie]|crepa|incrinat[oaie]|spaccat[oaie]|scheggiat[oaie]|piegat[oaie]|stort[oaie]|ammaccat[oaie]|ammaccatura|fessurat[oaie]|fessura|sfondat[oaie]';
const itCo = (n, d) => new RegExp(`^(?=.*\\b(?:${n})(?![a-z]))(?=.*\\b(?:${d.split('@').join(IT_D).split('#').join(IT_BRK)})(?![a-z]))`);
const IT_TRUCK = 'camion|tir|trattore|motrice|mezzo|veicolo|furgone|autocarro|bilico|macchina';
const IT_OK = /\b(?:gia\s+)?(?:riparat[oaie]|aggiustat[oaie]|sistemat[oaie]|sostituit[oaie]|cambiat[oaie]|risolt[oaie])\b|\b(?:funziona|funzionano|va|vanno)\s+(?:di\s+nuovo\s+)?(?:bene|benissimo|perfettamente|regolarmente|di\s+nuovo)\b|\bha\s+ripreso\s+a\s+funzionare\b|\btutto\s+(?:ok|bene|a\s+posto|apposto|in\s+ordine|regolare|normale)\b|\bnessun\s+problema\b|\bsenza\s+problemi\b|\be\s+(?:tutto\s+)?(?:a\s+posto|apposto)\b/;
const IT_NEG = /\bnon\s+(?:si\s+)?(?:vede\s+)?(?:perde|perdono|gocciola|gocciolano|cola|colano|e\s+(?:rott|bucat|danneggiat|guast|forat)\S*|sono\s+(?:rott|bucat|danneggiat|guast)\S*|ci\s+sono\s+(?:\S+\s+)?(?:perdite|danni|feriti)|ce\s+(?:nessuna?\s+)?(?:perdita|perdite|fumo|fuoco|danno|danni)|ho\s+(?:urtato|sbattuto|tamponato)|(?:mi\s+|ci\s+)?hanno\s+rubato(?:\s+niente|\s+nulla)?|e\s+successo\s+(?:niente|nulla))\b|\bsenza\s+(?:nessuna?\s+|alcuna?\s+)?(?:perdite|perdita|danni|feriti|incidenti|fumo|fuoco)\b|\bnessun[oa]?\s+(?:perdita|perdite|danno|danni|ferito|feriti)\b|\bnessuno\s+(?:si\s+)?(?:e\s+)?(?:ferito|fatto\s+male)\b/g;
const IT_KINDS = [['brake', itCo('freni|freno|frenata|impianto\\s+frenante', '@|non\\s+(?:\\S+\\s+)?(?:frena|frenano|tiene|tengono|prende|prendono)|senza\\s+freni|moll[oi]|spugnos[oi]|si\\s+bloccano|si\\s+blocca|bloccat[oi]|fischia|fischiano|stride|stridono|cigola|cigolano|fanno\\s+rumore|fa\\s+rumore|frena(?:no)?\\s+(?:poco|male)'), /freno\s+(?:a\s+mano|di\s+stazionamento|motore)|frenata\s+(?:automatica|di\s+emergenza)|\bluc[ei]|liquido|\baria\b|scarico|da\s+sol[oa]/],
  ['brake', itCo(IT_TRUCK, 'non\\s+frena|frena\\s+(?:male|poco)'), /da\s+sol[oa]|porta/],
  ['brake', itCo('pressione\\s+(?:dell\\s+)?aria|aria\\s+(?:dei\\s+)?freni|serbato(?:io|i)\\s+(?:dell\\s+)?aria', 'bassa|scende|cala|sta\\s+calando|non\\s+sale|perde|perdita')],
  ['parkbrake', itCo('freno\\s+(?:a\\s+mano|di\\s+stazionamento)', '@|non\\s+(?:si\\s+)?(?:sblocca|stacca|rilascia|tiene|toglie)|bloccat[oa]|incastrat[oa]|inceppat[oa]')],
  ['parkbrake', new RegExp(`\\b(?:${IT_TRUCK}|rimorchio|semirimorchio)\\s+(?:\\S+\\s+){0,2}?(?:partit[oa]|mosso|mossa|andat[oa]|scivolat[oa]|spostat[oa])\\s+da\\s+sol[oa]\\b`)],
  ['flat', itCo('gomm[ae]|pneumatic[oi]|ruot[ae]|copertone|copertoni', 'bucat[oaie]|forat[oaie]|una\\s+foratura|foratura|scoppiat[oaie]|esplos[oaie]|sgonfi[aeo]?|a\\s+terra|afflosciat[oaie]|perde\\s+aria|perdono\\s+aria|senza\\s+aria'), /bullon|dad[io]|cuscinett|mozz|ralla|sospension|soffiett|polmon|\bfreno/],
  ['flat', /\b(?:ho|abbiamo)\s+(?:forato|bucato)\b/],
  ['tyre', itCo('gomm[ae]|pneumatic[oi]|copertone|copertoni', 'consumat[oaie]|usurat[oaie]|lisci[oae]?|lisce|calv[oaie]|senza\\s+(?:battistrada|profilo)|tagliat[oaie]|(?:ha|hanno|con)\\s+(?:un\\s+|una\\s+)?(?:taglio|bolla|ernia|rigonfiamento)|bolla|ernia|deformat[oaie]|screpolat[oaie]'), /bucat|forat|scoppi|esplos|sgonf|a\s+terra|perd|senza\s+aria/],

  ['flat', itCo('gomm[ae]|pneumatic[oi]|copertone|copertoni', 'rott[oaie]|si\\s+(?:e\\s+|sono\\s+)?rott[oaie]|andat[oaie]|distrutt[oaie]|kaputt|fuori\\s+uso|da\\s+buttare'), /bullon|dad[io]|cuscinett|mozz|ralla|sospension|soffiett|polmon|\bfreno|tergicristall|spazzol|guarnizion|tubo|manicott|scorta|ricambio|di\s+riserva/],
  ['tyre', itCo('gomm[ae]|pneumatic[oi]|copertone|copertoni', 'danneggiat[oaie]'), /bucat|forat|scoppi|esplos|sgonf|a\s+terra|senza\s+aria|tergicristall|spazzol|guarnizion|tubo|manicott|scorta|ricambio|di\s+riserva/],
  ['steer', itCo('sterzo|volante|servosterzo', '@|dur[oa]|pesante|(?:ha|con)\\s+gioco|gioco|vibra|trema|balla|tira\\s+a\\s+(?:destra|sinistra)'), /al\s+volante|alla\s+guida|corsia|freccia/],
  ['steer', itCo(IT_TRUCK, 'tira\\s+(?:verso\\s+)?(?:a\\s+)?(?:destra|sinistra)')],
  ['leak', itCo('olio|gasolio|diesel|carburante|liquido\\s+(?:dei\\s+freni|freni|di\\s+raffreddamento|refrigerante|idraulico)|antigelo|adblue|idraulico|acqua\\s+(?:del\\s+)?(?:motore|radiatore)|radiatore|refrigerante', 'perde|perdono|sta\\s+perdendo|stanno\\s+perdendo|gocciola|gocciolano|cola|colano|perdita|perdite|trafila|trasuda|macchia|macchie|pozza'), /cambio\s+(?:dell\s+|d\s+)?olio|tagliando|carta|vuot|senza|finit|rubat|furt|potenza|forza|spia/],
  ['leak', /\bce\s+(?:una\s+)?(?:perdita|pozza|macchia)\b|\b(?:perde|gocciola|cola)\s+(?:qualcosa|da\s+sotto)\b/, /\baria\b|tetto|pioggia|carta|\bluc/],
  ['fire', /\b(?:fuoco|incendio|(?:ha\s+)?preso\s+fuoco|sta\s+prendendo\s+fuoco|(?:sta|stanno)\s+bruciando|brucia|in\s+fiamme|fiamme)\b/, /frizione|fusibil|lampadin|cibo|sigarett|accendino|fiammifer|estintor|\bluc[ei]|sole|occhi|stomaco|gola/],
  ['fire', itCo('cabina|motore|camion|cavi|cablaggio|fili|batteria|sedil[ei]|cruscotto|rimorchio', 'fumo|fuma|esce\\s+fumo|puzza\\s+di\\s+bruciato|odore\\s+di\\s+bruciato|sa\\s+di\\s+bruciato|sento\\s+(?:odore\\s+di\\s+)?bruciato'), /scarico|marmitta|tubo|ner[oa]|bianc[oa]|\bblu\b|azzurr|tanto\s+fumo|molto\s+fumo|frizione|freni|sigarett/],
  ['acc', /\b(?:incident[ei]|tamponament[oi]|tamponat[oaie]|ho\s+tamponato|scontro|scontrat[oaie]|collisione|urtat[oaie]|ho\s+urtato|abbiamo\s+urtato|ho\s+sbattuto|abbiamo\s+sbattuto|hanno\s+sbattuto|investit[oaie]|ho\s+investito|ribaltat[oaie]|cappottat[oaie]|uscit[oa]\s+(?:fuori\s+)?(?:di\s+)?strada|finit[oa]\s+(?:fuori\s+strada|nel\s+fosso|in\s+un\s+fosso))\b/, /cuore|record|sbattuto\s+(?:la\s+)?testa|\bnon\s+(?:\S+\s+){0,2}?(?:finit|uscit|ribaltat|cappottat)/],

  ['stuck', /\b(?:nel|in\s+un|dentro\s+(?:al|il|un))\s+(?:fosso|fossato|cunetta)\b/, /carico|merce|bancal|pedan|\bnon\b/],

  ['acc', /\b(?:camion\S*|rimorchio|semirimorchio|motrice|furgone|cisterna|bilico|autoarticolato|tir|trattore|macchina|auto)\s+(?:\S+\s+){0,3}?(?:nel|in\s+un|dentro\s+(?:al|il|un))\s+(?:fosso|fossato)\b|\b(?:camion\S*|rimorchio|semirimorchio|motrice|furgone|cisterna|bilico|autoarticolato|tir|trattore|macchina|auto)\s+(?:\S+\s+){0,3}?(?:nella|in\s+una)\s+cunetta\b|\b(?:sono|siamo)\s+(?:\S+\s+)?(?:nel|in\s+un)\s+(?:fosso|fossato)\b/, /carico|merce|bancal|pedan|\bnon\s+(?:\S+\s+){0,2}?(?:e|sta|sono|siamo|si\s+trova|finit[oa]|uscit[oa]|ribaltat[oa]|cappottat[oa]|cadut[oa])\b/],
  ['injury', /\b(?:ferit[oaie]|mi\s+sono\s+fatt[oa]\s+male|si\s+e\s+fatt[oa]\s+male|ci\s+siamo\s+fatti\s+male|sanguin\S*|sangue|ambulanza|infortunat[oaie]|infortunio)\b/],
  ['nostart', /\b(?:non\s+(?:si\s+)?(?:parte|accende|avvia|mette\s+in\s+moto|va\s+in\s+moto|da\s+segni\s+di\s+vita)|non\s+(?:vuole\s+)?(?:partire|accendersi|avviarsi)|(?:motore|camion)\s+(?:\S+\s+)?(?:si\s+spegne|si\s+e\s+spento|muore|e\s+morto)|(?:si\s+spegne|si\s+e\s+spento)\s+(?:il\s+)?(?:motore|camion))\b/, /frigo|thermo|termo|carrier|reefer|aria\s+condizionata|clima|riscaldamento|webasto|stufa|\bluc[ei]|far[oi]|frecc|schermo|display|tablet|telefono|cellulare|radio|gps|wifi|computer|carta|tachigrafo|nessuno|capo|cliente|ufficio|\blui\b|\blei\b|treno|nave|traghetto|aereo|volo|partenza|domani|spia|non\s+si\s+spegne/],
  ['engine', itCo('motore', 'scald[ao]|sta\\s+scaldando|si\\s+surriscald\\S*|surriscald\\S*|temperatura\\s+alta|fa\\s+(?:un\\s+)?rumore|rumore\\s+strano|batte|picchia|(?:perde|sta\\s+perdendo)\\s+(?:potenza|forza)|senza\\s+(?:potenza|forza)|non\\s+(?:ha\\s+)?(?:potenza|forza)|non\\s+tira|in\\s+protezione|in\\s+emergenza|modalita\\s+(?:di\\s+)?emergenza|strappa|tossisce|perde\\s+colpi|@'), /(?:non|senza)\s+(?:si\s+)?(?:parte|accende|avvia)|si\s+spegne|si\s+e\s+spento|e\s+morto|muore|fumo|fuma|puzza|odore|perde\s+(?:olio|acqua|gasolio|adblue|liquido)|perdita|gocciol|\bcola|spia|frigo|thermo|carrier/],
  ['engine', itCo(IT_TRUCK, '(?:perde|sta\\s+perdendo)\\s+(?:potenza|forza)|senza\\s+(?:potenza|forza)|non\\s+(?:ha\\s+)?(?:potenza|forza)|non\\s+tira|in\\s+protezione|in\\s+emergenza')],
  ['engine', itCo('motore|scarico|marmitta|tubo\\s+di\\s+scarico', 'fumo\\s+(?:molto\\s+)?(?:ner[oa]|bianc[oa]|blu|azzurr[oa])|(?:molto|tanto)\\s+fumo|fuma\\s+(?:molto|tanto|ner[oa]|bianc[oa])')],
  ['engine', itCo('turbo|turbina', '@|fischia|sibila|fa\\s+rumore'), /fumo/],
  ['engine', itCo('temperatura\\s+(?:del\\s+)?(?:motore|acqua)', 'sale|alta|troppo\\s+alta|nel\\s+rosso|al\\s+massimo')],
  ['mirror', itCo('specchi[oe]?|specchiett[oi]|retrovisor[ei]', '@|#|cadut[oa]|si\\s+e\\s+staccat[oa]|staccat[oaie]|allentat[oaie]|balla|ballano|penzola|penzolante'), /riscaldat|riscaldamento|sbrin/],
  ['glass', itCo('parabrezza|vetro\\s+(?:anteriore|davanti)|vetro', '#|rott[oa]|sasso|sassata|pietra|stellat[oa]|una\\s+stella'), /specchi|retrovisor|finestrin|portiera|\bporta\b|laterale|alzacristall|alzavetr|sale|scende|tergi|far[oi]\b|\bluc|fanal|schermo|display|telefono|cellulare|bicchiere|bottiglia/],
  ['window', itCo('finestrin[oi]|vetr[oi]\\s+(?:della\\s+|del\\s+)?(?:portiera|porta)|alzacristall[oi]|alzavetr[oi]|vetr[oi]\\s+elettric[oi]|vetr[oi](?=\\s+(?:\\S+\\s+)?non\\s+(?:sale|scende|salgono|scendono|si\\s+chiude|si\\s+chiudono|si\\s+apre))', 'non\\s+(?:\\S+\\s+)?(?:sale|scende|salgono|scendono|si\\s+chiude|si\\s+chiudono|si\\s+apre|si\\s+aprono|chiude|apre)|bloccat[oaie]|incastrat[oaie]|rimast[oi]\\s+(?:apert[oi]|giu)|@')],
  ['lights', itCo('luc[ei]|far[oi]|fanal[ei]|fanalin[oi]|frecc(?:ia|e)|lampadin[ae]|anabbaglianti|abbaglianti|luci\\s+di\\s+posizione|lampeggiant[ei]|stop', '@|#|bruciat[oaie]|fulminat[oaie]|non\\s+(?:\\S+\\s+)?(?:si\\s+accende|si\\s+accendono|accende|funziona|funzionano|lampeggia|lampeggiano|illumina|va|vanno)|spent[oaie]|senza\\s+luc[ei]|lampeggia(?:no)?\\s+(?:troppo\\s+)?(?:veloce|velocemente)'), /spia|cruscotto|quadro|display|accesa|frigo|targa|telefono|cellulare|corrente|bolletta/],
  ['warnlight', itCo('spia|spie|check\\s+engine|abs|ebs|luce\\s+(?:rossa|gialla|arancione)', 'accesa|accese|si\\s+e\\s+accesa|si\\s+sono\\s+accese|si\\s+accende|lampeggia|lampeggiano|rimane\\s+accesa|resta\\s+accesa|non\\s+si\\s+spegne|e\\s+uscita|appare|compare'), /tachigrafo|carta|frigo/],
  ['warnlight', itCo('cruscotto|quadro|display|schermo|computer\\s+di\\s+bordo', '(?:appare|compare|e\\s+uscit[oa]|esce|da|mostra|ce)\\s+(?:un\\s+|una\\s+)?(?:errore|avviso|guasto|messaggio|codice|avaria)|errore'), /tachigrafo|carta|frigo|telefono|cellulare|tablet/],
  ['batt', itCo('batteri[ae]|accumulator[ei]', 'scaric[ae]|si\\s+e\\s+scaricat[ae]|scaricat[ae]|mort[ae]|a\\s+terra|non\\s+(?:\\S+\\s+)?(?:carica|tiene\\s+la\\s+carica)|debol[ei]|gonfi[ae]|@'), /spia|telefono|cellulare|tablet|computer|portatil|torcia|fumo|fuoco|puzza|radio|gps|rubat|furt|\best\b/],
  ['batt', /\b(?:rimast[oaie]|sono|siamo)\s+(?:\S+\s+)?senza\s+batteria\b/, /telefono|cellulare|tablet|computer|portatil|torcia|radio|gps/],
  ['tacho', itCo('tachigrafo|cronotachigrafo', '@|#|errore|non\\s+(?:\\S+\\s+)?(?:legge|riconosce|accetta)'), /gasolio|carburante|bancomat/],
  ['tacho', itCo('carta\\s+(?:del\\s+)?(?:conducente|autista|tachigrafica|tachigrafo)', '@|#|errore|non\\s+(?:\\S+\\s+)?(?:legge|riconosce|accetta)|pers[oa]|ho\\s+perso|smarrit[oa]|rubat[oa]|scadut[oa]')],
  ['fuelcard', itCo('carta\\s+(?:del\\s+|di\\s+|per\\s+il\\s+)?(?:carburante|gasolio|rifornimento|flotta)|carta\\s+(?:dkv|shell|uta|as\\s*24|eni|q8|esso)|fuel\\s*card', 'bloccat[oa]|rifiutat[oa]|non\\s+(?:\\S+\\s+)?(?:passa|accetta|accettano|funziona|va|prende)|pers[oa]|ho\\s+perso|smarrit[oa]|rubat[oa]|scadut[oa]|@')],
  ['cabkit', itCo('sedil[ei]\\s+riscaldat[oi]|riscaldamento\\s+(?:del\\s+|dei\\s+|degli\\s+)?(?:sedil[ei]|specchi\\S*)|specchi\\S*\\s+riscaldat[oi]', '@|non\\s+(?:\\S+\\s+)?(?:scalda|scaldano|riscalda|riscaldano)')],
  ['lost', itCo('chiav[ei]|document[oi]|libretto(?:\\s+di\\s+circolazione)?|carta\\s+di\\s+circolazione|cmr|bolla|bolle|ddt', 'pers[oaie]|ho\\s+perso|abbiamo\\s+perso|smarrit[oaie]|non\\s+(?:l[oaie]\\s+)?(?:trovo|troviamo|trovano)|non\\s+si\\s+trova(?:no)?|spars[oaie]|sparit[oaie]|rubat[oaie]|hanno\\s+rubato'), /carta\s+(?:del\s+)?(?:conducente|autista|tachigraf|carburante|gasolio)|tessera|gomm/],
  ['coupling', itCo('rimorchio|semirimorchio|semi|bilico|cisterna|carrello', 'sganciat[oa]|si\\s+e\\s+sganciat[oa]|staccat[oa]|si\\s+e\\s+staccat[oa]|non\\s+(?:si\\s+)?aggancia|non\\s+riesco\\s+(?:ad?\\s+)?agganciar\\S*'), /porte?\b|portellon|\bluc|telo|teloni|centina|freno/],
  ['coupling', itCo('ralla|kingpin|king\\s*pin|perno\\s+(?:del\\s+)?(?:rimorchio|ralla)|gancio(?:\\s+di\\s+traino)?', '@|#|non\\s+(?:\\S+\\s+)?(?:chiude|blocca|aggancia|si\\s+chiude)|bloccat[oa]|incastrat[oa]|apert[oa]'), /gomm|bullon|pranzo|cena/],
  ['dryfuel', /\b(?:rimast[oaie]|sono|siamo)\s+(?:senza\s+(?:gasolio|diesel|carburante|benzina)|a\s+secco)\b|\b(?:finito|esaurito)\s+(?:il\s+)?(?:gasolio|diesel|carburante|benzina)\b|\b(?:gasolio|diesel|carburante)\s+(?:e\s+)?finito\b|\bserbatoio\s+(?:\S+\s+)?vuoto\b/, /adblue|carta|rubat|furt|frigo/],
  ['reefer', itCo('frigo|gruppo\\s+frigo|frigorifero|cella\\s+frigo(?:rifera)?|thermo\\s*king|termo\\s*king|carrier|reefer|macchina\\s+del\\s+freddo|impianto\\s+(?:del\\s+)?freddo', '@|non\\s+(?:\\S+\\s+)?(?:raffredda|raffreddano|fa\\s+freddo|congela|tiene\\s+la\\s+temperatura|tiene)|non\\s+(?:\\S+\\s+)?(?:parte|si\\s+accende|si\\s+avvia)|allarme|in\\s+allarme|da\\s+allarme|temperatura\\s+(?:sale|alta|e\\s+salita|sta\\s+salendo)'), /ho\s+freddo|fa\s+(?:molto\s+)?freddo|aria\s+condizionata|clima|cabina|riscaldamento/],
  ['climate', itCo('aria\\s+condizionata|condizionatore|clima|climatizzatore|riscaldamento|stufa|webasto|ventola|ventilazione', '@|non\\s+(?:\\S+\\s+)?(?:raffredda|raffreddano|rinfresca|scalda|scaldano|riscalda|esce|soffia|fa\\s+freddo|butta)|esce\\s+(?:aria\\s+)?(?:calda|fredda)|soffia\\s+(?:aria\\s+)?cald[oa]|senza\\s+(?:aria|freddo|caldo)'), /frigo|thermo|carrier|reefer|cella|sedil|specchi|retrovisor/],
  ['tarp', itCo('telon[ei]|tendon[ei]|centinat[oa]|telo|teli', 'strappat[oaie]|stracciat[oaie]|rott[oaie]|bucat[oaie]|tagliat[oaie]|squarciat[oaie]|un\\s+(?:buco|taglio|strappo)|buco|strappo|si\\s+e\\s+staccat[oa]|staccat[oaie]|volat[oa]\\s+via|@|#')],
  ['exhaust', itCo('tubo\\s+di\\s+scarico|marmitta|silenziatore', 'cadut[oa]|si\\s+e\\s+staccat[oa]|staccat[oa]|penzola\\S*|tocca\\s+terra|struscia|bucat[oa]|buco|fa\\s+(?:molto\\s+)?rumore|rumoros[oa]|@|#'), /fumo|fuma|adblue|freno/],
  ['exhaust', itCo('scarico', 'cadut[oa]|si\\s+e\\s+staccat[oa]|staccat[oa]|penzola\\S*|tocca\\s+terra|struscia|bucat[oa]|rott[oa]|#'), /fumo|fuma|adblue|freno|merce|carico|bancal|pedan/],
  ['visib', itCo('tergicristall[oi]|tergi|spazzol[ae]|lavavetri|ugell[oi]|spruzzator[ei]|tergilunotto', '@|#|non\\s+(?:\\S+\\s+)?(?:pulisce|puliscono|si\\s+muove|si\\s+muovono|spruzza|spruzzano|butta\\s+acqua)|non\\s+esce\\s+(?:l\\s+)?acqua|senza\\s+acqua|rigan[oa]|lasciano\\s+righe')],
  ['seat', itCo('cintur[ae](?:\\s+di\\s+sicurezza)?|sedil[ei]|poltrona', '@|#|non\\s+(?:\\S+\\s+)?(?:si\\s+aggancia|aggancia|si\\s+blocca|blocca|si\\s+chiude|chiude|sale|scende|si\\s+muove|si\\s+regola|tiene)|(?:scende|si\\s+abbassa|cala)\\s+da\\s+sol[oa]|sfondat[oa]|allentat[oa]|bloccat[oa]|incastrat[oa]'), /riscald|fuoco|fumo|bruciat|sangu|banca|conto|soldi|bonifico|carta|pagamento|pagare/],
  ['door', itCo('port[ae]|portier[ae]|serratur[ae]|maniglia|maniglie|portellon[ei]', '@|#|non\\s+(?:\\S+\\s+)?(?:si\\s+chiude|si\\s+chiudono|chiude|chiudono|si\\s+apre|si\\s+aprono|apre|aprono|si\\s+blocca|blocca)|non\\s+(?:si\\s+)?riesc[eo]\\s+(?:a\\s+)?(?:chiudere|aprire)|bloccat[oaie]|incastrat[oaie]|si\\s+apre\\s+da\\s+sol[oa]|si\\s+e\\s+apert[oa]\\s+(?:da\\s+sol[oa]|in\\s+marcia|durante\\s+la\\s+marcia)'), /vetr|finestrin|alzacristall|alzavetr|portafoglio|\b(?:mi|ci|ti|lo|li)\s+porta\b|porta\s+(?:il|lo|la|i|gli|le|un|una)\s/],
  ['stuck', itCo('fango|neve|ghiaccio|sabbia|fosso|fossato|cunetta|banchina', 'impantanat[oa]|insabbiat[oa]|bloccat[oa]|incastrat[oa]|non\\s+(?:riesco|riusciamo)\\s+(?:a\\s+)?uscire|slitta|slittano|pattina|pattinano|affondat[oa]'), /traffico|coda|fila|incolonnat|autostrada\s+chiusa/],
  ['stuck', /\b(?:impantanat[oaie]|insabbiat[oaie])\b/],
  ['numplate', itCo('targa|targhe|targhetta', 'cadut[oa]|si\\s+e\\s+staccat[oa]|staccat[oa]|pers[oa]|ho\\s+perso|rubat[oa]|illeggibile|non\\s+si\\s+legge|allentat[oa]|#|@'), /\bluc|illuminazione|libretto|documento|telepass|elettronic/],
  ['gear', itCo('cambio|marce|marcia|frizione|retromarcia', '@|non\\s+(?:\\S+\\s+)?(?:entra|entrano|ingrana|ingranano|innesta|si\\s+innesta)|non\\s+riesco\\s+(?:a\\s+)?(?:mettere|inserire|innestare)|slitta|pattina|brucia|bruciat[oa]|dur[oa]|grattano|gratta|salta|saltano|stride'), /\bluc|spia|cambio\s+(?:dell?\s+|d\s+|delle\s+|degli\s+)?(?:olio|gomme|pneumatici|turno|filtro)|frigo|rimorchio|in\s+marcia|durante\s+la\s+marcia/],
  ['wheel', itCo('bullon[ei](?:\\s+della\\s+ruota)?|dad[oi](?:\\s+della\\s+ruota)?|prigionier[oi]', 'allentat[oi]|lent[oi]|mancan[oi]|manca|cadut[oi]|si\\s+sono\\s+allentati|pers[oi]|rott[oi]|spezzat[oi]'), /freno|specchi|sedil|targa|ralla/],
  ['wheel', itCo('cuscinett[oi]|mozz[oi]', 'caldo|scalda|si\\s+scalda|rumore|fa\\s+rumore|fischia|@|#')],
  ['susp', itCo('sospension[ei]|soffiett[oi]|polmon[ei]|polmoncin[oi]|cuscin[oi]\\s+d\\s+aria|molle|molla|balestr[ae]|ammortizzator[ei]', 'scoppiat[oaie]|bucat[oaie]|perde\\s+aria|perdono\\s+aria|si\\s+e\\s+abbassat[oa]|abbassat[oaie]|bass[oaie]|giu|a\\s+terra|senza\\s+aria|spezzat[oaie]|@|#'), /sterzo|volante|sedil/],
  ['adas', itCo('sensor[ei]|radar|telecamer[ae]|cruise\\s+control|cruise|regolatore\\s+di\\s+velocita|mantenimento\\s+(?:di\\s+|della\\s+)?corsia|assistente\\s+(?:di\\s+)?corsia|frenata\\s+(?:automatica|di\\s+emergenza)|lane\\s+assist', '@|errore|non\\s+(?:\\S+\\s+)?(?:funziona|rileva|vede)'), /frigo|tachigrafo|dashcam|pressione|gomm/],
  ['adas', new RegExp(`\\b(?:${IT_TRUCK})\\s+(?:\\S+\\s+){0,2}?frena\\s+da\\s+sol[oa]\\b|\\bfrena\\s+da\\s+sol[oa]\\b`)],
  ['theft', /\b(?:furto|furti|rubat[oaie]|hanno\s+rubato|ladr[oi]|rapina|rapinat[oaie]|scassinat[oaie]|hanno\s+scassinato|hanno\s+forzato\s+(?:la\s+)?(?:cabina|porta|portiera|serratura)|forzat[oa]\s+la\s+(?:cabina|porta|portiera|serratura)|hanno\s+(?:preso|portato\s+via|succhiato|tolto|prelevato)\s+(?:\S+\s+){0,3}?(?:gasolio|diesel|carburante))\b/, /carta|chiav|targa|document|libretto/],
  ['vandal', /\b(?:vandal(?:i|ismo|ic[oi]|izzat\S*)|graffit[io]|imbrattat[oaie]|hanno\s+(?:\S+\s+){0,2}?(?:rigato|graffiato|squarciato|imbrattato)|qualcuno\s+(?:\S+\s+){0,3}?(?:rigato|graffiato|tagliato|squarciato|spaccato|bucato|rotto|imbrattato))\b/]];
function itKinds(v) { const k = new Set(); for (const raw of String(v || '').split(/[.,;!?\n]+|\s(?:ma|per[oò]|poi|anche|inoltre|ed)\s|\se\s+(?=(?:il|lo|la|i|gli|le|l['’]|un|una|uno|non|perde|perdono|fa|fanno|ha|hanno|si|mi|c['’]|ci|ho)\b)/i)) { if (!/[a-z]/i.test(raw)) continue; const f = itFold(raw); if (!IT_MARK.test(f)) continue; const p = f.replace(IT_NEG, ' '); if (!IT_OK.test(p)) for (const [n, rx, ex] of IT_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); } if (k.has('acc')) k.delete('injury'); return k; }






const frFold = (s) => ' ' + String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe').replace(/[’'`´-]/g, ' ')
  .replace(/\b(?:toujours\s+|encore\s+)?(?:n\s+|ne\s+)?(?:l\s+|la\s+|le\s+|les\s+)?(?:est|sont|a|ont)?\s*(?:toujours\s+|encore\s+)?pas\s+(?:encore\s+)?(?:ete\s+)?(?:repare|change|remplace|regle|resolu|depanne)\S*/g, ' est mal')
  .replace(/\s+/g, ' ') + ' ';
const FR_MARK = /\b(?:le|la|je|suis|pneu|pneus|freins|moteur|les|l|du|des|d|une|ne|n|pas|plus|est|sont|j|ai|il|elle|ils|ca|c|ce|cette|qu|que|y|au|aux|mon|ma|mes|sur|avec|sans|deja|m|nous|tout|rien|toujours|encore|fuit|fuite|perd|quelqu)\b/;
const frNot = (v) => `(?:ne\\s+|n\\s+)?(?:se\\s+|s\\s+|l\\s+|la\\s+|le\\s+|les\\s+)?(?:${v})\\s+(?:pas|plus|jamais)`;
const FR_D = 'casse(?:e|s|es)?|cassee?s?|abime(?:e|s|es)?|endommage(?:e|s|es)?|defectueu(?:x|se|ses)|hs|en\\s+panne|pete(?:e|s|es)?|foutu(?:e|s|es)?|' + frNot('marche|marchent|fonctionne|fonctionnent|va|vont') + '|(?:a|ont)\\s+(?:un\\s+)?(?:probleme|souci|defaut)|est\\s+mal|a\\s+(?:changer|remplacer|reparer)';
const FR_BRK = 'fissure(?:e|s|es)?|une\\s+fissure|fendu(?:e|s|es)?|fele(?:e|s|es)?|ebreche(?:e|s|es)?|plie(?:e|s|es)?|tordu(?:e|s|es)?|cabosse(?:e|s|es)?|enfonce(?:e|s|es)?|une\\s+bosse|bosse|eclate(?:e|s|es)?';
const frCo = (n, d) => new RegExp(`^(?=.*\\b(?:${n})(?![a-z]))(?=.*\\b(?:${d.split('@').join(FR_D).split('#').join(FR_BRK)})(?![a-z]))`);
const FR_TRUCK = 'camion|poids\\s+lourd|tracteur|porteur|vehicule|bahut|camionnette|fourgon|semi';
const FR_OK = /\b(?:deja\s+)?(?:repare|reparee|repares|reparees|remplace(?:e|s|es)?|change(?:e|s|es)?|resolu(?:e|s|es)?|depanne(?:e|s|es)?)\b|\b(?:marche|marchent|fonctionne|fonctionnent|roule)\s+(?:a\s+nouveau|de\s+nouveau|bien|tres\s+bien|parfaitement|correctement|nickel|normalement)\b|\btout\s+(?:va\s+bien|est\s+(?:ok|bon|en\s+ordre|normal)|ok|roule|bon)\b|\b(?:aucun|pas\s+de|sans)\s+probleme|\brien\s+a\s+signaler\b|\bc\s+est\s+(?:bon|ok|regle)\b/;
const FR_NEG = /\b(?:ne\s+|n\s+)?(?:fuit|fuient|goutte|gouttent|coule|coulent)\s+(?:pas|plus)\b|\b(?:ne\s+|n\s+)?(?:perd|perdent)\s+pas\s+(?:d\s+|de\s+(?:l\s+)?|du\s+)?(?:huile|gasoil|gazole|eau|liquide|carburant|adblue|diesel)\b|\bpas\s+(?:eu\s+)?(?:de|d)\s+(?:fuite|fuites|degats?|dommages?|blesses?|fumee|feu|accident|accrochage|collision|incendie|vol)\b|\baucun(?:e)?\s+(?:fuite|degats?|dommages?|blesses?|accident|fumee|incendie|vol)\b|\bsans\s+(?:aucun(?:e)?\s+)?(?:fuite|fuites|degats|dommages|blesses|accident|fumee|feu)\b|\b(?:n\s+|ne\s+)?(?:est|sont)\s+pas\s+(?:casse|creve|abime|endommage|fissure|perce|blesse)\S*|\bpersonne\s+(?:n\s+)?(?:est|a\s+ete|s\s+est)\s+(?:blesse|fait\s+mal)\S*|\brien\s+(?:n\s+)?(?:a\s+ete\s+)?vole\b|\b(?:n\s+)?(?:a|ont|ai)\s+rien\s+vole\b|\b(?:n\s+)?ai\s+(?:rien\s+|pas\s+)(?:percute|heurte|touche|tamponne)\b/g;
const FR_KINDS = [['brake', frCo('freins?|freinage|systeme\\s+de\\s+freinage', '@|' + frNot('freine|freinent|tient|tiennent|prend') + '|sans\\s+freins?|mous?|molle|spongieux|se\\s+bloquent|se\\s+bloque|bloques?|sifflent|siffle|grincent|grince|couinent|couine|font\\s+du\\s+bruit|fait\\s+du\\s+bruit|freinent?\\s+mal'), /frein\s+(?:a\s+main|de\s+parking|de\s+stationnement|moteur)|freinage\s+(?:automatique|d\s+urgence)|ralentisseur|\bfeux?\b|liquide|\bair\b|echappement|tout\s+seul/],
  ['brake', frCo(FR_TRUCK, frNot('freine') + '|freine\\s+mal'), /tout\s+seul/],
  ['brake', frCo('pression\\s+(?:d\\s+)?air|pression\\s+des\\s+freins|reservoirs?\\s+d\\s+air', 'basse|baisse|descend|chute|' + frNot('monte') + '|fuit|fuite|perd')],
  ['parkbrake', frCo('frein\\s+(?:a\\s+main|de\\s+parking|de\\s+stationnement)', '@|' + frNot('desserre|libere|tient|enleve|debloque') + '|bloque|coince')],
  ['parkbrake', new RegExp(`\\b(?:${FR_TRUCK}|remorque|semi\\s+remorque)\\s+(?:\\S+\\s+){0,3}?(?:parti|bouge|roule|glisse|deplace|avance|recule)\\s+(?:tout\\s+)?seule?\\b`)],
  ['flat', frCo('pneus?|roues?|pneumatiques?', 'creve(?:e|s|es)?|a\\s+plat|eclate(?:e|s|es)?|degonfle(?:e|s|es)?|perdent\\s+(?:de\\s+)?l\\s+air|perd\\s+(?:de\\s+)?l\\s+air|une\\s+crevaison|crevaison|sans\\s+air'), /boulon|ecrou|roulement|moyeu|sellette|suspension|soufflet|coussin|ballon|\bfreins?\b|quelqu|ils\s+ont/],
  ['flat', /\b(?:j\s+ai|on\s+a|nous\s+avons)\s+creve\b|\bcrevaison\b/, /quelqu|ils\s+ont/],
  ['tyre', frCo('pneus?|pneumatiques?', 'uses?|usees?|lisses?|chauves?|sans\\s+(?:profil|sculptures?)|coupe(?:e|s|es)?|entaille(?:e|s|es)?|une\\s+(?:coupure|entaille|hernie|bulle|bosse)|hernie|bulle|deforme(?:e|s|es)?|craquele(?:e|s|es)?'), /creve|a\s+plat|eclate|degonfl|perd|sans\s+air/],

  ['flat', frCo('pneus?|pneumatiques?', 'casse(?:e|s|es)?|cassee?s?|foutu(?:e|s|es)?|fichu(?:e|s|es)?|morts?|hs|pete(?:e|s|es)?|nase|naze|bousille(?:e|s|es)?'), /boulon|ecrou|roulement|moyeu|sellette|suspension|soufflet|coussin|ballon|\bfreins?\b|essuie|balai|joint|durite|secours/],
  ['tyre', frCo('pneus?|pneumatiques?', 'abime(?:e|s|es)?|endommage(?:e|s|es)?'), /creve|a\s+plat|eclate|degonfl|sans\s+air|essuie|balai|joint|durite|secours/],
  ['steer', frCo('direction|volant|direction\\s+assistee', '@|dure?|lourde?|du\\s+jeu|jeu|vibre|tremble|tire\\s+a\\s+(?:droite|gauche)'), /au\s+volant|en\s+direction|direction\s+(?:de|du|des|d)\b|clignotant/],
  ['steer', frCo(FR_TRUCK, 'tire\\s+(?:vers\\s+la\\s+|a\\s+)(?:droite|gauche)')],
  ['leak', frCo('huile|gasoil|gazole|diesel|carburant|liquide\\s+(?:de\\s+frein|de\\s+refroidissement|hydraulique)|antigel|adblue|hydraulique|eau\\s+(?:du\\s+)?(?:moteur|radiateur)|radiateur|refroidissement', 'fuit|fuient|fuite|fuites|perd|perdent|coule|coulent|goutte|gouttent|suinte|une\\s+tache|tache|flaque'), /vidange|carte|vide|sans|plus\s+de|panne|vol|puissance|voyant/],
  ['leak', /\b(?:il\s+)?y\s+a\s+(?:une\s+)?(?:fuite|flaque|tache)\b|\bca\s+(?:fuit|coule)\b|\b(?:fuit|coule|goutte)\s+(?:par|en)\s+dessous\b/, /\bair\b|toit|pluie|carte|\bfeux?\b/],
  ['fire', /\b(?:incendie|(?:a|ont)\s+pris\s+feu|prend\s+feu|en\s+feu|brule|brulent|en\s+flammes|flammes|au\s+feu)\b/, /embrayage|fusible|ampoule|lampe|phare|clignotant|cigarette|briquet|allumette|extincteur|soleil|yeux|estomac|gorge|cafe|repas/],
  ['fire', /\bfeu\b/, /\bfeu\s+(?:stop|arriere|avant|de\s+(?:position|croisement|route|recul|brouillard|gabarit)|rouge|vert|orange|tricolore|clignotant)|pas\s+de\s+feu|cigarette|briquet|ampoule|extincteur|\bvoyant/],
  ['fire', frCo('cabine|moteur|camion|cables?|faisceau|fils|batterie|sieges?|tableau\\s+de\\s+bord|remorque', 'fumee|fume|de\\s+la\\s+fumee|odeur\\s+de\\s+brule|sent\\s+le\\s+brule|ca\\s+sent\\s+le\\s+brule|odeur\\s+de\\s+cramer|crame'), /echappement|\bpot\b|noire|blanche|bleue|beaucoup\s+de\s+fumee|fume\s+(?:beaucoup|noir|blanc|bleu)|embrayage|freins?|cigarette/],
  ['acc', /\b(?:accident|accrochage|collision|carambolage|percute|j\s+ai\s+percute|tamponne|on\s+m\s+a\s+tamponne|heurte|j\s+ai\s+heurte|on\s+a\s+heurte|accroche\s+(?:un|une|le|la)\s+(?:poteau|voiture|vehicule|mur|camion|barriere|pilier|quai)|sorti\s+de\s+(?:la\s+)?route|dans\s+le\s+fosse|(?:s\s+est|est)\s+(?:renverse|couche))\b/, /coeur|record|du\s+travail|\b(?:pas|jamais)\s+(?:\S+\s+)?(?:dans\s+(?:le|un)\s+fosse|sorti|renverse|couche)/],

  ['stuck', /\bdans\s+(?:le|un)\s+fosse\b/, /chargement|marchandise|palette|\b(?:pas|jamais)\b/],
  ['injury', /\b(?:blesse(?:e|s|es)?|je\s+me\s+suis\s+fait\s+mal|il\s+s\s+est\s+fait\s+mal|on\s+s\s+est\s+fait\s+mal|saigne|saignement|sang|ambulance|samu)\b/],
  ['nostart', /\b(?:(?:ne\s+|n\s+)?(?:demarre|demarrent|s\s+allume|se\s+lance|se\s+met\s+pas\s+en\s+route)\s+(?:pas|plus)|(?:ne\s+)?veut\s+(?:pas|plus)\s+demarrer|refuse\s+de\s+demarrer|aucun\s+signe\s+de\s+vie|(?:moteur|camion)\s+(?:\S+\s+)?(?:cale|s\s+arrete\s+tout\s+seul|s\s+est\s+arrete|s\s+est\s+coupe|se\s+coupe|est\s+mort)|(?:moteur|camion)\s+a\s+cale)\b/, /frigo|groupe\s+froid|thermo|carrier|clim|chauffage|webasto|\bfeux?\b|phares?|lumiere|clignotant|ecran|tablette|telephone|portable|radio|gps|wifi|ordinateur|carte|chrono|personne|chef|client|bureau|train|bateau|ferry|avion|\bvol\b|demain|voyant|ne\s+s\s+eteint|lampe|ampoule|gyrophare/],
  ['engine', frCo('moteur', 'chauffe|surchauffe|en\\s+surchauffe|temperature\\s+elevee|fait\\s+(?:un\\s+|du\\s+)?bruit|bruit\\s+(?:bizarre|etrange)|cogne|claque|perd\\s+(?:de\\s+la\\s+)?puissance|manque\\s+de\\s+puissance|(?:pas|plus)\\s+de\\s+puissance|sans\\s+puissance|' + frNot('tire') + '|en\\s+mode\\s+(?:degrade|secours|securite)|broute|tousse|a\\s+des\\s+rates|@'), /demarre|cale|s\s+arrete|s\s+est\s+arrete|s\s+est\s+coupe|se\s+coupe|est\s+mort|fumee|fume|odeur|sent|fuit|fuite|perd\s+(?:de\s+l\s+|de\s+|du\s+)?(?:huile|eau|gasoil|adblue|liquide)|goutte|coule|voyant|frigo|signe\s+de\s+vie/],
  ['engine', frCo(FR_TRUCK, 'perd\\s+(?:de\\s+la\\s+)?puissance|manque\\s+de\\s+puissance|(?:pas|plus)\\s+de\\s+puissance|' + frNot('tire') + '|en\\s+mode\\s+(?:degrade|secours)')],
  ['engine', frCo('moteur|echappement|pot\\s+d\\s+echappement', 'fumee\\s+(?:tres\\s+)?(?:noire|blanche|bleue)|beaucoup\\s+de\\s+fumee|fume\\s+(?:beaucoup|noir|blanc|bleu)')],
  ['engine', frCo('turbo', '@|siffle|fait\\s+du\\s+bruit'), /fumee/],
  ['engine', frCo('temperature\\s+(?:du\\s+)?(?:moteur|eau)', 'monte|elevee|trop\\s+haute|dans\\s+le\\s+rouge|au\\s+maximum')],
  ['mirror', frCo('retros?|retroviseurs?|miroirs?', '@|#|tombe|tombee|s\\s+est\\s+detache|detache|desserre|pendouille|pend|bouge'), /chauffant|degivr|chauffage/],
  ['glass', frCo('pare\\s+brise|parebrise|vitre\\s+avant', '#|caillou|gravillon|pierre|etoile|un\\s+impact|impact|@'), /retro|vitre\s+(?:laterale|de\s+la\s+porte|de\s+la\s+portiere|electrique)|leve\s+vitre|essuie|phare|ecran|telephone|monte|descend/],
  ['window', frCo('vitres?\\s+electriques?|leve\\s+vitres?|vitres?\\s+(?:de\\s+la\\s+)?(?:porte|portiere|conducteur|passager)|vitres?(?=\\s+(?:\\S+\\s+)?(?:ne\\s+|n\\s+)?(?:monte|descend|montent|descendent)\\s)', frNot('monte|descend|montent|descendent|ferme|ouvre') + '|bloquee?s?|coincee?s?|restee?s?\\s+ouverte?s?|@')],
  ['lights', frCo('feux|phares?|lumieres?|eclairage|clignotants?|ampoules?|veilleuses?|gyrophares?|feu\\s+(?:stop|arriere|avant|de\\s+(?:position|croisement|route|recul|brouillard|gabarit))|feux\\s+(?:stop|arriere|avant)', '@|#|grillee?s?|brulee?s?|' + frNot('allume|allument|eclaire|eclairent|clignote|clignotent') + '|eteinte?s?|sans\\s+(?:feux|lumiere|eclairage)|clignotent?\\s+trop\\s+vite'), /voyant|tableau\s+de\s+bord|ecran|frigo|plaque|telephone|portable|courant|facture/],
  ['lights', /\bsans\s+(?:feux|lumiere|eclairage)\b/],
  ['warnlight', frCo('voyants?|check\\s+engine|abs|ebs|temoins?|lumiere\\s+(?:rouge|orange|jaune)', 'allumee?s?|s\\s+est\\s+allume\\S*|s\\s+allume|s\\s+allument|clignote|clignotent|reste\\s+allume\\S*|' + frNot('eteint') + '|s\\s+affiche|apparait'), /chrono|tachy|carte|frigo/],
  ['warnlight', frCo('tableau\\s+de\\s+bord|ecran|afficheur|ordinateur\\s+de\\s+bord', '(?:affiche|il\\s+y\\s+a|j\\s+ai|apparait|s\\s+affiche)\\s+(?:un\\s+|une\\s+)?(?:erreur|message|alerte|code|defaut|panne)|erreur|message\\s+d\\s+erreur'), /chrono|tachy|carte|frigo|telephone|portable|tablette/],
  ['batt', frCo('batteries?', 'a\\s+plat|vides?|dechargee?s?|mortes?|' + frNot('charge|tient|tiennent') + '|faibles?|gonflee?s?|@'), /voyant|telephone|portable|tablette|ordinateur|lampe|fumee|\bfeu\b|odeur|radio|gps|vol/],
  ['batt', /\b(?:plus\s+de|panne\s+de)\s+batterie\b/, /telephone|portable|tablette|ordinateur|lampe|radio|gps/],
  ['tacho', frCo('chronotachygraphe|tachygraphe|chrono', '@|#|erreur|' + frNot('lit|reconnait|accepte|prend')), /gasoil|carburant|bancaire/],
  ['tacho', frCo('carte\\s+(?:du\\s+)?(?:conducteur|chauffeur|chrono|tachy\\S*)', '@|#|erreur|' + frNot('lue|lit|passe|reconnue') + '|perdue|j\\s+ai\\s+perdu|egaree|volee|expiree|perimee')],
  ['fuelcard', frCo('carte\\s+(?:de\\s+|a\\s+)?(?:carburant|gasoil|gazole|essence)|carte\\s+(?:total|dkv|shell|uta|as\\s*24|esso|bp)|fuel\\s*card', 'bloquee|refusee|' + frNot('passe|marche|fonctionne|prend|accepte') + '|perdue|j\\s+ai\\s+perdu|volee|expiree|@')],
  ['cabkit', frCo('sieges?\\s+chauffants?|chauffage\\s+(?:du\\s+|des\\s+)?(?:sieges?|retro\\S*)|retro\\S*\\s+chauffants?', '@|' + frNot('chauffe|chauffent'))],
  ['lost', frCo('cles?|clefs?|papiers|documents?|carte\\s+grise|certificat\\s+d\\s+immatriculation|cmr|bon\\s+de\\s+livraison|lettre\\s+de\\s+voiture', 'perdue?s?|j\\s+ai\\s+perdu|on\\s+a\\s+perdu|egaree?s?|' + frNot('trouve|retrouve|trouvons') + '|introuvables?|disparue?s?|volee?s?|on\\s+a\\s+vole'), /carte\s+(?:du\s+)?(?:conducteur|chauffeur|carburant|gasoil|chrono)|pneu/],
  ['coupling', frCo('remorque|semi\\s+remorque|citerne|plateau', 'decrochee|s\\s+est\\s+decrochee|detachee|s\\s+est\\s+detachee|' + frNot('attelle|accroche') + '|n\\s+arrive\\s+pas\\s+a\\s+(?:l\\s+|la\\s+)?(?:atteler|accrocher)'), /portes?\b|hayon|\bfeux?\b|bache|ridelle|frein/],
  ['coupling', frCo('sellette|king\\s*pin|pivot|attelage|crochet\\s+d\\s+attelage', '@|#|' + frNot('ferme|verrouille|accroche') + '|bloquee?|coincee?|ouverte?'), /pneu|boulon|repas|dejeuner/],
  ['dryfuel', /\b(?:en\s+)?panne\s+(?:de\s+|d\s+)?(?:gasoil|gazole|carburant|essence|diesel|seche)\b|\bplus\s+de\s+(?:gasoil|gazole|carburant|diesel)\b|\b(?:gasoil|gazole|carburant|reservoir)\s+(?:est\s+)?vide\b|\bn\s+ai\s+plus\s+de\s+(?:gasoil|gazole|carburant)\b/, /adblue|carte|vol|frigo|\bair\b/],
  ['reefer', frCo('frigo|groupe\\s+(?:froid|frigo\\S*)|thermo\\s*king|carrier|caisse\\s+frigo\\S*|frigorifique', '@|' + frNot('refroidit|refroidissent|fait\\s+froid|fait|tient\\s+la\\s+temperature|tient|demarre|allume|lance') + '|alarme|en\\s+alarme|en\\s+defaut|temperature\\s+(?:monte|elevee|est\\s+montee|qui\\s+monte)'), /j\s+ai\s+froid|il\s+fait\s+froid|clim|cabine|chauffage/],
  ['climate', frCo('clim|climatisation|climatiseur|chauffage|webasto|ventilation|ventilateur|soufflerie|chauffage\\s+autonome', '@|' + frNot('refroidit|refroidissent|chauffe|chauffent|souffle|fait\\s+froid|sort') + '|souffle\\s+(?:de\\s+l\\s+air\\s+)?chaud|sans\\s+(?:clim|chauffage)'), /frigo|thermo|carrier|caisse|sieges?|retro/],
  ['tarp', frCo('baches?|rideaux?|toile', 'dechiree?s?|dechire|arrachee?s?|trouee?s?|percee?s?|coupee?s?|un\\s+trou|une\\s+dechirure|trou|s\\s+est\\s+detachee|envolee|@|#')],
  ['exhaust', frCo('pot\\s+d\\s+echappement|echappement|silencieux', 'tombe|tombee|s\\s+est\\s+detache|detache|pend|pendouille|touche\\s+(?:le\\s+sol|par\\s+terre)|traine|troue|perce|un\\s+trou|fait\\s+(?:beaucoup\\s+de\\s+)?bruit|bruyant|@|#'), /fumee|fume|adblue|frein/],
  ['visib', frCo('essuie\\s+glaces?|balais|lave\\s+glaces?|gicleurs?', '@|#|' + frNot('essuie|essuient|nettoie|nettoient|bouge|bougent|gicle|giclent|sort') + '|plus\\s+de\\s+lave\\s+glace|laissent\\s+des\\s+traces')],
  ['seat', frCo('ceintures?(?:\\s+de\\s+securite)?|sieges?|fauteuil', '@|#|' + frNot('attache|accroche|verrouille|boucle|bloque|ferme|monte|descend|bouge|regle|tient') + '|descend\\s+tout\\s+seul|s\\s+affaisse|bloquee?|coincee?|desserree?'), /chauffant|\bfeu\b|fumee|banque|compte|argent|virement|carte|paiement|payer|siege\s+social/],
  ['door', frCo('portes?|portieres?|serrures?|poignees?|hayon', '@|#|' + frNot('ferme|ferment|ouvre|ouvrent|verrouille|verrouillent') + '|n\\s+arrive\\s+pas\\s+a\\s+(?:la\\s+|les\\s+)?(?:fermer|ouvrir)|bloquee?s?|coincee?s?|s\\s+ouvre\\s+toute\\s+seule|s\\s+est\\s+ouverte\\s+(?:toute\\s+seule|en\\s+roulant)'), /vitre|leve\s+vitre|portefeuille|\bporte\s+(?:le|la|les|un|une|des|du)\s/],
  ['stuck', frCo('boue|neige|verglas|sable|fosse|bas\\s+cote|accotement', 'embourbe|ensable|enlise|s\\s+est\\s+enlise|bloquee?|coincee?|n\\s+arrive\\s+pas\\s+a\\s+sortir|patine|patinent'), /bouchon|trafic|embouteillage|autoroute\s+fermee|file/],
  ['stuck', /\b(?:embourbe|ensable|enlise)(?:e|s|es)?\b/],
  ['numplate', frCo('plaques?(?:\\s+d\\s+immatriculation)?', 'tombee?|s\\s+est\\s+detachee|detachee|perdue|j\\s+ai\\s+perdu|volee|illisible|desserree|#|@'), /eclairage|\bfeux?\b|carte\s+grise|document|badge|telepeage|cuisson/],
  ['gear', frCo('boite(?:\\s+de\\s+vitesses?)?|vitesses?|embrayage|marche\\s+arriere|rapports?', '@|' + frNot('passe|passent|rentre|rentrent|enclenche') + '|n\\s+arrive\\s+pas\\s+a\\s+passer|patine|brule|dure?|craque|craquent|saute|sautent|grince|accroche'), /voyant|\bfeux?\b|gants|lettres|exces\s+de\s+vitesse|limitation|vitesse\s+limitee|frigo|remorque/],
  ['wheel', frCo('boulons?(?:\\s+de\\s+roue)?|ecrous?(?:\\s+de\\s+roue)?|goujons?', 'desserres?|laches?|manquants?|manque|tombes?|perdus?|casses?'), /frein|retro|siege|plaque|sellette/],
  ['wheel', frCo('roulements?|moyeux?', 'chauffe|chaud|bruit|fait\\s+du\\s+bruit|siffle|@|#')],
  ['susp', frCo('suspensions?|coussins?\\s+d\\s+air|soufflets?|ballons?|lames?|ressorts?|amortisseurs?', 'eclatee?s?|creve|perce|perd\\s+(?:de\\s+)?l\\s+air|perdent\\s+(?:de\\s+)?l\\s+air|s\\s+est\\s+affaisse\\S*|affaissee?s?|basses?|a\\s+plat|sans\\s+air|@|#'), /direction|volant|siege/],
  ['adas', frCo('capteurs?|radar|cameras?|regulateur(?:\\s+de\\s+vitesse)?|cruise\\s+control|limiteur|aide\\s+au\\s+maintien|lane\\s+assist|freinage\\s+(?:d\\s+urgence|automatique)|detecteur', '@|erreur|' + frNot('detecte|voit')), /frigo|chrono|tachy|dashcam|pression|pneu/],
  ['adas', new RegExp(`\\b(?:${FR_TRUCK})\\s+(?:\\S+\\s+){0,2}?freine\\s+tout\\s+seul\\b|\\bfreine\\s+tout\\s+seul\\b`)],
  ['theft', /\b(?:vol\s+(?:de|du|d)\s+(?:gasoil|gazole|carburant|diesel|batteries?|marchandise|chargement|palettes|cargaison)|voleurs?|cambriol\S*|on\s+(?:m\s+|nous\s+)?a\s+vole|ils\s+ont\s+vole|(?:a|ont|ai)\s+ete\s+vole(?:e|s|es)?|siphonne\S*|(?:ont|a)\s+(?:force|fracture)\s+(?:la\s+)?(?:cabine|porte|portiere|serrure)|(?:ont|a)\s+(?:pompe|pris|vide)\s+(?:\S+\s+){0,2}?(?:gasoil|gazole|carburant|reservoir))\b/, /carte|cles?\b|clefs?|plaque|document|papiers/],
  ['vandal', /\b(?:vandal(?:isme|es?|ise\S*)|tague(?:e|s|es)?|graffitis|(?:des|de|avec)\s+graffiti|quelqu\s+un\s+a\s+(?:raye|creve|tague|coupe|lacere|casse|crache)|(?:ils|on)\s+(?:m\s+)?(?:a|ont)\s+(?:raye|tague|lacere)|lacere\S*)\b/]];
function frKinds(v) { const k = new Set(); for (const raw of String(v || '').split(/[.,;!?\n]+|\s(?:mais|puis|aussi|en\s+plus|ensuite)\s|\set\s+(?=(?:le|la|les|l['’]|un|une|il|elle|ils|ne|n['’]|ca|ça|j['’]|je|on|y|du|des)\b)/i)) { if (!/[a-z]/i.test(raw)) continue; const f = frFold(raw); if (!FR_MARK.test(f)) continue; const p = f.replace(FR_NEG, ' '); if (!FR_OK.test(p)) for (const [n, rx, ex] of FR_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); } if (k.has('acc')) k.delete('injury'); return k; }






const nlFold = (s) => ' ' + String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'`´-]/g, ' ')
  .replace(/\bm\s+n\b/g, 'mijn').replace(/\bz\s+n\b/g, 'zijn').replace(/(^|\s)t\s/g, '$1het ').replace(/\bni(?:e)?\b/g, 'niet')
  .replace(/\b(?:moet|moeten)\s+(?:nog\s+)?(?:\S+\s+){0,2}?(?:gerepareerd|vervangen|gemaakt|hersteld)\s+worden\b/g, ' is kapot nlvv ')
  .replace(/\b(?:is|zijn|werd|werden|wordt|worden)?\s*(?:nog\s+(?:steeds\s+|altijd\s+)?)?niet\s+(?:meer\s+)?(?:goed\s+)?(?:gerepareerd|vervangen|gemaakt|opgelost|hersteld)\b/g, ' is kapot nlvv ')
  .replace(/\s+/g, ' ') + ' ';
const NL_MARK = /\b(?:de|het|een|niet|geen|ik|mijn|zijn|wordt|werkt|werken|doet|heb|hebben|heeft|lekt|kapot|nog|al|ook|van|op|met|zonder|bij|naar|deze|dit|dat|weer|meer|staat|zit|gaat|band|banden|remmen|vrachtwagen|we|wij|hij|ze|u|er\s+(?:is|zit|zijn|komt|loopt))\b/;
const nlNot = (v) => `(?:${v})\\s+(?:\\S+\\s+){0,3}?niet|niet\\s+(?:meer\\s+|goed\\s+)?(?:${v})`;
const NL_D = 'kapot|kapotte|stuk|defect|kaduuk|beschadigd|naar\\s+de\\s+knoppen|' + nlNot('werkt|werken|doet\\s+het|doen\\s+het|functioneert|functioneren') + '|(?:heeft|hebben)\\s+(?:een\\s+)?(?:probleem|storing|defect|mankement)|is\\s+niet\\s+(?:goed|in\\s+orde)';
const NL_BRK = 'gebarsten|een\\s+barst|barst|gescheurd|een\\s+scheur|scheur|gebroken|afgebroken|verbogen|krom|gedeukt|ingedeukt|een\\s+deuk|deuk|gesprongen|versplinterd';
const nlCo = (n, d) => new RegExp(`^(?=.*\\b(?:${n})(?![a-z]))(?=.*\\b(?:${d.split('@').join(NL_D).split('#').join(NL_BRK)})(?![a-z]))`);
const NL_TRUCK = 'vrachtwagen|vrachtauto|truck|camion|wagen|trekker|bakwagen|bestelwagen|bestelbus|auto|lzv';
const NL_OK = /\b(?:al\s+|alweer\s+|inmiddels\s+)?(?:gerepareerd|vervangen|verwisseld|opgelost|hersteld)\b|\b(?:is|zijn)\s+(?:al\s+|weer\s+|inmiddels\s+)?gemaakt\b|\b(?:werkt|werken|doet\s+het|doen\s+het|rijdt|functioneert)\s+(?:nu\s+|alles\s+)?(?:weer|goed|prima|perfect|normaal|correct)\b|\balles\s+(?:is\s+)?(?:ok|oke|goed|in\s+orde|prima)\b|\bgeen\s+(?:problemen|probleem)\b|\b(?:niets|niks)\s+aan\s+de\s+hand\b|\bniets\s+te\s+melden\b/;
const NL_NEG = /\b(?:lekt|lekken|druppelt|druppelen|druipt|loopt)\s+(?:(?:nog|helemaal|al)\s+)?niet\b|\bniet\s+(?:meer\s+)?(?:lekt|lekken|druppelt)\b|\b(?:verliest|verliezen)\s+geen\s+(?:olie|diesel|water|koelvloeistof|brandstof|adblue|lucht|vloeistof)\b|\bgeen\s+(?:lek|lekkage|lekken|schade|gewonde|gewonden|rook|brand|vuur|ongeluk|ongeval|aanrijding|botsing|diefstal|inbraak)\b|\bzonder\s+(?:lekkage|schade|gewonden|rook|brand)\b|\bniet\s+(?:kapot|lek|gebarsten|gescheurd|beschadigd|gewond|gebroken)\b|\bniemand\s+(?:is\s+|raakte\s+|werd\s+)?gewond\b|\b(?:niets|niks)\s+(?:is\s+)?gestolen\b|\b(?:heb|hebben)\s+(?:niets|niks)\s+geraakt\b/g;
const NL_KINDS = [['brake', nlCo('remmen|rem|remsysteem', '@|' + nlNot('remt|remmen|pakt|pakken|grijpt|grijpen') + '|zonder\\s+remmen|slap|slappe|zacht|sponzig|blokkeren|blokkeert|geblokkeerd|piepen|piept|gieren|giert|maken\\s+(?:veel\\s+)?(?:lawaai|herrie|geluid)|maakt\\s+(?:veel\\s+)?(?:lawaai|herrie|geluid)|remmen\\s+slecht|remt\\s+slecht'), /handrem|parkeerrem|motorrem|retarder|noodrem|remlicht|remvloeistof|\blucht|uitlaat|vanzelf|uit\s+zichzelf|zomaar/],
  ['brake', nlCo(NL_TRUCK, nlNot('remt') + '|remt\\s+slecht'), /vanzelf|uit\s+zichzelf|zomaar/],
  ['brake', nlCo('luchtdruk|remdruk|luchttanks?|luchtketels?', 'daalt|zakt|laag|te\\s+laag|loopt\\s+terug|lekt|lek|' + nlNot('loopt\\s+op|bouwt\\s+op|komt\\s+op|stijgt'))],
  ['parkbrake', nlCo('handrem|parkeerrem', '@|gaat\\s+niet\\s+(?:meer\\s+)?los|krijg\\s+(?:\\S+\\s+){0,2}?niet\\s+los|blijft\\s+vast|zit\\s+vast|vast|houdt\\s+niet|' + nlNot('houdt'))],
  ['parkbrake', new RegExp(`\\b(?:${NL_TRUCK}|oplegger|aanhanger|trailer)\\s+(?:\\S+\\s+){0,3}?(?:weggerold|rolde\\s+weg|rolt\\s+weg|vanzelf\\s+(?:gaan\\s+)?(?:rijden|rollen|weggereden|weggerold|weg)|reed\\s+vanzelf|rolde\\s+vanzelf)\\b`)],
  ['flat', nlCo('band|banden|wiel|wielen', 'lek|plat|leeg|loopt\\s+leeg|lopen\\s+leeg|ontploft|geklapt|geknapt|verliest\\s+lucht|verliezen\\s+lucht|een\\s+klapband|klapband|een\\s+lekke'), /bout|moer|lager|naaf|schotel|vering|balg|\brem(?:men)?\b|iemand|ze\s+hebben|gestoken|profiel|reserve/],
  ['flat', /\b(?:lekke\s+band(?:en)?|klapband|band\s+lek)\b/, /iemand|ze\s+hebben|gestoken|reserve/],
  ['tyre', nlCo('band|banden', 'versleten|afgesleten|kaal|kale|glad|gladde|geen\\s+profiel|zonder\\s+profiel|te\\s+weinig\\s+profiel|een\\s+snee|snee|ingesneden|een\\s+bult|bult|uitstulping|scheurtjes|scheuren|een\\s+scheur|vervormd'), /lek|plat|leeg|ontploft|geklapt|lucht/],


  ['flat', nlCo('band|banden', 'kapot|kapotte|stuk|kaduuk|naar\\s+de\\s+knoppen|defect'), /bout|moer|lager|naaf|schotel|vering|balg|\brem(?:men)?\b|reserve|lading|sjor|ratel|riem|transport|lopende|ruitenwisser|rubber|radio|cassette|\bnlvv\b/],
  ['tyre', nlCo('band|banden', 'beschadigd|beschadigde'), /lek|plat|leeg|ontploft|geklapt|lucht|reserve|lading|sjor|ratel|riem|transport|lopende|ruitenwisser/],
  ['steer', nlCo('stuur|stuurinrichting|besturing|stuurbekrachtiging', '@|zwaar|stug|speling|trilt|schudt|trekt\\s+naar\\s+(?:rechts|links)'), /achter\s+het\s+stuur|aan\s+het\s+stuur|richting|knipper|\b(?:ik|we|wij|je|jij|u)\s+stuur\b|stuur\s+(?:je|u|ik|jullie|een|de|het|foto|bericht|nog)\b/],
  ['steer', nlCo(NL_TRUCK, 'trekt\\s+(?:scheef\\s+)?naar\\s+(?:rechts|links)')],
  ['leak', nlCo('olie|motorolie|diesel|brandstof|koelvloeistof|remvloeistof|hydrauliekolie|hydrauliek|antivries|adblue|koelwater|radiateur|koeler', 'lekt|lekken|lekkage|een\\s+lek|lek|verliest|verliezen|druppelt|druppelen|druipt|loopt\\s+eruit|loopt\\s+weg|een\\s+plas|plas|plassen|een\\s+vlek|vlek'), /verversen|olieverversing|onderhoud|kaart|\bleeg\b|zonder|\bop\b|gestolen|diefstal|afgetapt|vermogen|lampje|\blucht|\bband|peil|bijvullen|bijgevuld/],
  ['leak', /\b(?:er\s+)?(?:is|zit)\s+(?:een\s+)?(?:lek|lekkage|plas)\b|\bhet\s+lekt\b|\b(?:lekt|druppelt|druipt)\s+(?:onder|eronder|van\s+onder)/, /\blucht|dak|regen|\bband|wiel|kaart|banden/],
  ['fire', /\b(?:in\s+brand|er\s+(?:is|was)\s+brand|brand\s+(?:in|gehad|ontstaan)|staat\s+in\s+brand|vlam\s+gevat|vat\s+vlam|vlammen|in\s+de\s+fik|vuur)\b/, /sigaret|aansteker|\bzon\b|maag|ogen|koffie|blusser|brandstof|lampje|vuurtje/],
  ['fire', nlCo('cabine|motor|vrachtwagen|kabels?|kabelboom|draden|accu|stoel|dashboard|oplegger|motorruimte', 'rook|rookt|het\\s+rookt|komt\\s+rook|brandlucht|brandgeur|ruikt\\s+(?:naar\\s+)?(?:verbrand|branderig|schroei)|ruikt\\s+branderig|schroeilucht|smeult'), /uitlaat|zwart|zwarte|\bwit|witte|blauw|blauwe|veel\s+rook|rookt\s+(?:erg\s+|heel\s+)?(?:veel|zwart|wit|blauw)|koppeling|\brem(?:men)?\b|sigaret/],
  ['acc', /\b(?:ongeluk|ongelukje|ongeval|aanrijding|botsing|kettingbotsing|aangereden|tegenaan\s+gereden|ertegenaan\s+gereden|achterop\s+gereden|(?:heb|hebben|heeft)\s+(?:een|de|het)\s+(?:paal|auto|wagen|muur|vrachtwagen|hek|vangrail|pilaar|laadperron|boom|personenauto|brugpijler|slagboom)\s+geraakt|van\s+de\s+weg\s+geraakt|in\s+de\s+sloot|gekanteld|omgevallen|op\s+(?:zijn|z|de)\s+(?:kant|zij))\b/, /werk\s*ongeval|\bgeluk\s+gehad|\b(?:niet|nooit)\s+(?:\S+\s+)?(?:in\s+(?:de|een)\s+(?:sloot|greppel)|gekanteld|omgevallen|van\s+de\s+weg|op\s+(?:zijn|z|de)\s+(?:kant|zij))/],

  ['stuck', /\bin\s+(?:de|een)\s+(?:sloot|greppel)\b/, /lading|pallet|\b(?:niet|geen|nooit)\b/],

  ['acc', /\b(?:vrachtwagen|vrachtauto|wagen|truck|auto|oplegger|aanhanger|trailer|trekker|bestelbus|busje|ik|we|wij)\s+(?:\S+\s+){0,3}?in\s+(?:de|een)\s+greppel\b|\bin\s+(?:de|een)\s+greppel\s+(?:\S+\s+)?(?:gereden|beland|gegleden|geraakt|terechtgekomen|gegaan|gereden)\b/, /lading|pallet|\b(?:niet|geen|nooit)\b/],
  ['injury', /\b(?:gewond|gewonde|gewonden|pijn\s+gedaan|bezeerd|bloed|bloedt|bloeden|ambulance|ziekenwagen)\b/],
  ['nostart', /\b(?:(?:start|starten|slaat|slaan|springt|springen)\s+(?:(?:nog|steeds|helemaal)\s+)?niet\s+(?:meer\s+)?(?:aan\b)?|wil\s+niet\s+(?:meer\s+)?(?:starten|aanslaan|aanspringen|aan)|niet\s+(?:meer\s+)?(?:starten|aanslaan|aan\s+te\s+krijgen)|geen\s+teken\s+van\s+leven|(?:motor|vrachtwagen|truck|wagen|camion)\s+(?:\S+\s+)?(?:valt\s+(?:steeds\s+)?uit|slaat\s+af|is\s+afgeslagen|sloeg\s+af|viel\s+uit|valt\s+stil|stopt\s+vanzelf))/, /frigo|koelmachine|koelunit|koelgroep|thermo|carrier|airco|kachel|verwarming|webasto|\blicht|lampen|scherm|tablet|telefoon|gsm|radio|navigatie|computer|kaart|tachograaf|niemand|chef|klant|kantoor|trein|veerboot|ferry|boot|vliegtuig|morgen|lampje|gaat\s+niet\s+uit|ventilator/],
  ['engine', nlCo('motor', 'wordt\\s+(?:te\\s+)?(?:warm|heet)|te\\s+heet|te\\s+warm|oververhit|oververhitting|raakt\\s+oververhit|temperatuur\\s+(?:is\\s+)?(?:te\\s+)?hoog|maakt\\s+(?:een\\s+)?(?:raar|vreemd|raar\\s+|vreemd\\s+)?\\s*(?:lawaai|geluid|herrie)|raar\\s+geluid|vreemd\\s+geluid|tikt|klopt|verliest\\s+vermogen|geen\\s+vermogen|weinig\\s+vermogen|geen\\s+kracht|' + nlNot('trekt') + '|noodloop|in\\s+noodloop|in\\s+noodstand|sputtert|hapert|@'), /start|slaat\s+af|valt\s+uit|afgeslagen|\brook|rookt|ruikt|lekt|lekkage|\blek\b|verliest\s+(?:olie|water|diesel|koelvloeistof)|druppelt|lampje|frigo|\bkoel|teken\s+van\s+leven/],
  ['engine', nlCo(NL_TRUCK, 'verliest\\s+vermogen|geen\\s+vermogen|weinig\\s+vermogen|geen\\s+kracht|' + nlNot('trekt') + '|in\\s+noodloop')],
  ['engine', nlCo('motor|uitlaat', 'zwarte\\s+rook|witte\\s+rook|blauwe\\s+rook|veel\\s+rook|rookt\\s+(?:erg\\s+|heel\\s+)?(?:veel|zwart|wit|blauw)')],
  ['engine', nlCo('turbo', '@|fluit|giert|maakt\\s+(?:veel\\s+)?(?:lawaai|geluid)'), /\brook/],
  ['engine', nlCo('motortemperatuur|watertemperatuur|temperatuur\\s+van\\s+de\\s+motor', 'loopt\\s+op|stijgt|hoog|te\\s+hoog|in\\s+het\\s+rood|maximaal')],
  ['mirror', nlCo('spiegels?|buitenspiegels?|zijspiegels?', '@|#|eraf|eraf\\s+gevallen|afgevallen|gevallen|hangt\\s+los|zit\\s+los|los|beweegt'), /verwarm/],
  ['glass', nlCo('voorruit|ruit\\s+voor', '#|steenslag|sterretje|een\\s+sterretje|steen|een\\s+steen|inslag|@'), /spiegel|zijruit|portierruit|\braam|ruitenwisser|wisser|koplamp|scherm|telefoon|omhoog|omlaag/],
  ['window', nlCo('elektrische\\s+ram(?:en)?|raam|ramen|zijruit|portierruit|ruit\\s+(?:van\\s+de\\s+)?(?:deur|portier|bestuurder|bijrijder)', nlNot('gaat|gaan|sluit|sluiten') + '|blijft\\s+(?:open|hangen)|zit\\s+vast|klemt|@'), /wisser/],
  ['lights', nlCo('lichten|licht|lampen|lamp|koplamp(?:en)?|achterlicht(?:en)?|remlicht(?:en)?|knipperlicht(?:en)?|richtingaanwijzers?|pinkers?|verlichting|zwaailicht(?:en)?|mistlamp(?:en)?|mistlicht(?:en)?|dimlicht(?:en)?|grootlicht|breedtelicht(?:en)?|achterlicht|remlicht|knipperlicht|lampje\\s+(?:van\\s+de\\s+)?(?:koplamp|achterlicht)', '@|#|doorgebrand|' + nlNot('brandt|branden|knippert|knipperen|gaat\\s+aan|gaan\\s+aan') + '|vallen\\s+uit|valt\\s+uit|zonder\\s+(?:licht|verlichting)|knipper\\w*\\s+(?:te\\s+)?(?:snel|vlug)'), /lampje|dashboard|scherm|frigo|kenteken|telefoon|gsm|stroom|factuur|controlelamp|waarschuwingslamp/],
  ['lights', /\bzonder\s+(?:\S*licht|\S*lichten|\S*lampen|verlichting)\b/],
  ['warnlight', nlCo('lampjes?|controlelampjes?|waarschuwingslampjes?|motorlampje|storingslampje|check\\s+engine|abs|ebs', 'brandt|branden|gaat\\s+aan|ging\\s+aan|is\\s+aangegaan|aangegaan|staat\\s+aan|blijft\\s+branden|knippert|knipperen|gaat\\s+niet\\s+(?:meer\\s+)?uit|verschijnt|komt\\s+op|staat\\s+op'), /tachograaf|tacho|kaart|frigo|koplamp|achterlicht|(?:brandt|branden)\s+niet|\bis\s+uit\b|\bging\s+uit\b|\bgaat\s+uit\b/],
  ['warnlight', nlCo('dashboard|scherm|display|boordcomputer', '(?:geeft|toont|laat\\s+zien)\\s+(?:een\\s+)?(?:fout|foutmelding|melding|storing|foutcode|code)|foutmelding|storingsmelding|storing|fout|foutcode'), /tacho|kaart|frigo|telefoon|gsm|tablet/],
  ['batt', nlCo('accu|accus|accu\\s+s|batterij|batterijen', 'leeg|plat|dood|' + nlNot('laadt|laden|houdt') + '|zwak|opgezwollen|bol|@'), /lampje|telefoon|gsm|tablet|laptop|zaklamp|\brook|brand|radio|navigatie|gestolen|diefstal/],
  ['batt', /\blege\s+accu\b|\bgeen\s+stroom\s+meer\b/, /telefoon|gsm|tablet|laptop|zaklamp|frigo|stopcontact/],
  ['tacho', nlCo('tachograaf|tacho|tachograph|digitale\\s+tachograaf', '@|#|fout|foutmelding|storing|' + nlNot('leest|herkent|accepteert|neemt')), /diesel|tank|bank/],
  ['tacho', nlCo('chauffeurskaart|bestuurderskaart|tachokaart|tachograafkaart|kaart\\s+van\\s+de\\s+tacho\\S*', '@|#|fout|' + nlNot('leest|gelezen|herkend|wordt') + '|kwijt|verloren|gestolen|verlopen')],
  ['fuelcard', nlCo('tankkaart|tankpas|brandstofkaart|dieselkaart|dkv\\s+kaart|dkv|kaart\\s+van\\s+(?:dkv|shell|uta|total|as\\s*24|esso|bp)|fuel\\s*card', 'geblokkeerd|geweigerd|wordt\\s+geweigerd|' + nlNot('werkt|doet\\s+het|wordt\\s+geaccepteerd') + '|kwijt|verloren|gestolen|verlopen|@')],
  ['cabkit', nlCo('stoelverwarming|verwarmde\\s+stoel|spiegelverwarming|verwarmde\\s+spiegels?', '@|wordt\\s+niet\\s+(?:meer\\s+)?warm|' + nlNot('verwarmt|warmt'))],
  ['lost', nlCo('sleutels?|papieren|documenten|kentekenbewijs|kenteken\\s+bewijs|cmr|vrachtbrief|leveringsbon|pakbon', 'kwijt|verloren|ben\\s+(?:\\S+\\s+){0,2}?kwijt|heb\\s+(?:\\S+\\s+){0,2}?verloren|vind\\s+(?:\\S+\\s+){0,6}?niet|kan\\s+(?:\\S+\\s+){0,3}?niet\\s+(?:meer\\s+)?vinden|(?:is|zijn)\\s+weg|zoek|gestolen'), /chauffeurskaart|tankkaart|\bband|tacho/],
  ['coupling', nlCo('oplegger|aanhanger|trailer|aanhangwagen', 'losgekoppeld|losgeraakt|losgekomen|losgeslagen|' + nlNot('koppelt') + '|niet\\s+(?:goed\\s+)?(?:aan|vast)?gekoppeld|krijg\\s+(?:\\S+\\s+){0,2}?niet\\s+(?:aan|vast)\\s*gekoppeld|kan\\s+(?:\\S+\\s+){0,2}?niet\\s+(?:aan)?koppelen'), /deur|deuren|laadklep|\blicht|lichten|zeil|huif|\brem|\bband|wiel|\bweg\b/],
  ['coupling', nlCo('koppelschotel|schotel|kingpin|king\\s+pin|trekhaak|vijfde\\s+wiel', '@|#|' + nlNot('sluit|vergrendelt|klikt') + '|gaat\\s+niet\\s+dicht|zit\\s+vast|klemt|staat\\s+open'), /\bband|bout|moer|eten|lunch/],
  ['dryfuel', /\b(?:zonder|geen)\s+(?:diesel|brandstof|benzine)(?:\s+meer)?\b|\b(?:diesel|brandstof|tank)\s+(?:is\s+)?(?:helemaal\s+)?(?:op|leeg)\b|\bdroog\s*gereden|\bstaat\s+droog\b/, /adblue|kaart|gestolen|diefstal|afgetapt|\bkoel|\blucht/],
  ['reefer', nlCo('frigo|koelmachine|koelunit|koelgroep|koelaggregaat|thermo\\s*king|carrier|koeling|koelcel|koeltrailer|koelinstallatie', '@|' + nlNot('koelt|koelen|houdt|start|springt') + '|houdt\\s+(?:de\\s+)?temperatuur\\s+niet|wordt\\s+niet\\s+(?:meer\\s+)?koud|alarm|geeft\\s+alarm|in\\s+alarm|in\\s+storing|storing|temperatuur\\s+(?:loopt\\s+op|stijgt|te\\s+hoog|is\\s+te\\s+hoog)'), /ik\s+heb\s+het\s+koud|het\s+is\s+koud|airco|cabine|verwarming|kachel/],
  ['climate', nlCo('airco|airconditioning|klimaatregeling|verwarming|kachel|standkachel|webasto|ventilatie|ventilator|blower', '@|' + nlNot('koelt|koelen|verwarmt|blaast|draait') + '|blaast\\s+(?:alleen\\s+)?warm|blaast\\s+warme\\s+lucht|wordt\\s+niet\\s+(?:meer\\s+)?(?:koud|warm)|zonder\\s+(?:airco|verwarming|kachel)'), /frigo|koelmachine|koelunit|thermo|carrier|stoel|spiegel/],
  ['tarp', nlCo('zeil|zeilen|huif|dekzeil|schuifzeil|gordijn|gordijnen|schuifgordijn', 'gescheurd|een\\s+scheur|scheur|een\\s+gat|gat|gaten|losgeraakt|los|weggewaaid|opengesneden|@|#')],
  ['exhaust', nlCo('uitlaat|uitlaatpijp|knalpot|demper|einddemper', 'eraf|afgevallen|gevallen|los|hangt|sleept|raakt\\s+de\\s+grond|een\\s+gat|gat|maakt\\s+(?:veel\\s+)?(?:lawaai|herrie|geluid)|@|#'), /\brook|rookt|adblue|\brem/],
  ['visib', nlCo('ruitenwissers?|wissers?|ruitensproeiers?|sproeiers?|ruitenvloeistof|ruitensproeier', '@|#|' + nlNot('wist|wissen|beweegt|bewegen|spuit|spuiten|sproeit|sproeien') + '|maken\\s+strepen|maakt\\s+strepen|strepen|(?:is|zijn)\\s+op|geen\\s+ruitenvloeistof')],
  ['seat', nlCo('gordel|gordels|veiligheidsgordels?|stoel|stoelen|bestuurdersstoel|chauffeursstoel', '@|#|' + nlNot('klikt|sluit|vergrendelt|gaat|blijft|beweegt|verstelt|houdt') + '|zakt\\s+(?:vanzelf\\s+)?(?:weg|in|naar\\s+beneden)|zit\\s+vast|klemt|zit\\s+los'), /verwarm|brand|\brook|bank|rekening|geld|betaling|kaart/],
  ['door', nlCo('deur|deuren|portier|portieren|slot|sloten|klink|deurklink|achterdeur|achterdeuren', '@|#|' + nlNot('sluit|sluiten|gaat|gaan|opent|openen|vergrendelt') + '|krijg\\s+(?:\\S+\\s+){0,2}?niet\\s+(?:open|dicht)|zit\\s+vast|klemt|gaat\\s+vanzelf\\s+open|ging\\s+(?:\\S+\\s+){0,3}?vanzelf\\s+open|open\\s+tijdens\\s+het\\s+rijden'), /\braam|ruit|portemonnee|tot\s+slot/],
  ['stuck', nlCo('modder|sneeuw|ijs|zand|sloot|berm|greppel|drek', 'vast|zit\\s+vast|vastgereden|vastgelopen|vastgezakt|kom\\s+(?:er\\s+)?niet\\s+(?:meer\\s+)?uit|kan\\s+(?:er\\s+)?niet\\s+(?:meer\\s+)?uit|spinnen|spint|slipt|slippen|doorslaan|slaan\\s+door'), /\bfile|verkeer|snelweg\s+dicht/],
  ['stuck', /\b(?:vastgereden|vastgezakt|ingegraven|ingezakt\s+in)\b/],
  ['numplate', nlCo('kentekenplaat|kentekenplaten|nummerplaat|nummerplaten|kenteken', 'eraf|eraf\\s+gevallen|afgevallen|gevallen|los|losgeraakt|kwijt|verloren|gestolen|onleesbaar|#|@'), /verlichting|\blicht|lampje|kentekenbewijs|papieren|document|badge|tol/],
  ['gear', nlCo('versnellingsbak|versnelling|versnellingen|koppeling|achteruit|achteruitversnelling|schakelen|bak', '@|' + nlNot('schakelt|schakelen|pakt') + '|gaat\\s+er\\s+niet\\s+in|gaan\\s+er\\s+niet\\s+in|krijg\\s+(?:\\S+\\s+){0,2}?niet\\s+in|schakelt\\s+slecht|slipt|slipt\\s+door|zwaar|stug|kraakt|kraken|springt\\s+eruit|valt\\s+eruit|ruikt\\s+verbrand'), /lampje|\blicht|handschoen|snelheid|frigo|oplegger|kingpin|schotel|bakwagen/],
  ['wheel', nlCo('wielbout(?:en)?|bouten|moeren|wielmoer(?:en)?', 'los|losgekomen|losgedraaid|ontbreken|ontbreekt|eraf|kwijt|gebroken|afgebroken'), /\brem|spiegel|stoel|kenteken|schotel/],
  ['wheel', nlCo('wiellager|lager|lagers|naaf|wielnaaf', 'wordt\\s+(?:heel\\s+)?(?:warm|heet)|heet|warm|lawaai|geluid|maakt\\s+(?:lawaai|geluid)|bromt|fluit|@|#')],
  ['susp', nlCo('vering|luchtvering|luchtbalg(?:en)?|balg(?:en)?|bladver(?:en)?|schokbrekers?|veren', 'geklapt|gescheurd|lek|verliest\\s+lucht|lekt\\s+lucht|zakt|is\\s+gezakt|zakt\\s+in|ingezakt|scheef|laag|plat|@|#'), /stuur|stoel/],
  ['adas', nlCo('sensoren|sensor|radar|camera|cameras|cruise\\s*control|adaptieve\\s+cruise|snelheidsregelaar|begrenzer|rijstrookassistent|lane\\s+assist|noodremsysteem|noodremassistent', '@|fout|foutmelding|storing|' + nlNot('herkent|ziet|detecteert')), /frigo|tacho|dashcam|druk|\bband/],
  ['adas', new RegExp(`\\b(?:${NL_TRUCK})\\s+(?:\\S+\\s+){0,2}?(?:remt|stopt)\\s+(?:uit\\s+zichzelf|vanzelf|zomaar)\\b|\\bremt\\s+(?:uit\\s+zichzelf|vanzelf|zomaar)\\b`)],
  ['theft', /\b(?:diefstal|dieven|dief|ingebroken|inbraak|leeggepompt|afgetapt|(?:hebben|heeft)\s+(?:\S+\s+){0,3}?(?:gestolen|afgetapt|leeggehaald|leeggepompt|weggenomen)|(?:is|zijn|werd|werden)\s+(?:\S+\s+)?gestolen|opengebroken)\b/, /kaart|sleutel|kenteken|papieren|document|nummerplaat|kwijt/],
  ['vandal', /\b(?:vandalisme|vandalen|beklad|graffiti|bekrast|iemand\s+heeft\s+(?:\S+\s+){0,3}?(?:bekrast|lek\s+gestoken|lekgestoken|doorgesneden|gekrast|ingeslagen|beklad)|lek\s*gestoken)\b/]];
function nlKinds(v) { const k = new Set(); for (const raw of String(v || '').split(/[.,;!?\n]+|\s(?:maar|daarna|bovendien|en\s+ook)\s|\sen\s+(?=(?:de|het|een|ik|mijn|m['’]n|hij|ze|die|dat|nu|geen|niet|er|'t|ook)\b)/i)) { if (!/[a-z]/i.test(raw)) continue; const f = nlFold(raw); if (!NL_MARK.test(f)) continue; const p = f.replace(NL_NEG, ' '); if (!NL_OK.test(p)) for (const [n, rx, ex] of NL_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); } if (k.has('acc')) k.delete('injury'); return k; }






const kuFold = (s) => ' ' + String(s || '').toLowerCase().replace(/ê/g, 'e').replace(/[îı]/g, 'i').replace(/[ûü]/g, 'u').replace(/ç/g, 'c').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ö/g, 'o')
  .replace(/[’'`´-]/g, ' ').replace(/\s+/g, ' ') + ' ';
const KU_D = 'naxebit\\S*|x(?:e|i)rab?\\s+(?:bu|buye|bun|ye|e)\\b|arize\\s+(?:da|daye|heye)\\b';
const kuRx = (n, d, extra) => new RegExp(`\\b(?:${n})\\S*\\s+(?:\\S+\\s+){0,3}?(?:${d.split('@').join(KU_D)})${extra ? '|' + extra : ''}`);
const KU_NEG = /\b(?:qeza|agir|duman|du|birindar\S*|problem\S*|pirsgirek\S*|xisar\S*|zirar\S*|dizi|herikin)\s+(?:\S+\s+)?(?:tune|tuneye|nebu|nebuye|cenebu|cenebuye)\b|\bne\s+(?:sikest|sikiya|teqi|herik|sewit|x(?:e|i)rab?|qewim|qeti|semiti)\S*|\bne(?:sikest|sikiya|teqi|herik|sewit|qewim|qeti|semiti)\S*|\bna(?:herik|sewit)\S*/g;
const KU_OK = /\b(?:hat|hate|hatin|hatiye|hatine)\s+(?:cekirin|guhertin|tamirkirin|tamir\s+kirin|saz\s+kirin)\b|\b(?:min|me|em|wan|wi|mekanik\S*|tamirk\S*|hosta)\s+(?:\S+\s+){0,2}?(?:cekir|guhert|tamir\s+kir|saz\s+kir)\b|\b(?:bas|bes)\s+(?:e|ye|bu)\b|\b(?:careke\s+din|disa|niha)\s+dixebit\S*|\bdixebit\S*\s+(?:careke\s+din|disa|niha)\b/;
const KU_LAMP = 'lamba|cira|isaret|nisan|ampul|gosterge';
const KU_KINDS = [['brake', kuRx('fren|firen', '@|nagir\\S*|qels\\S*|sist\\s+(?:bu|e|ye)\\b|tune\\b'), /\bfren\S*\s+(?:a\s+)?dest|\bdest\s+fren/],
  ['parkbrake', kuRx('fren\\S*\\s+(?:a\\s+)?dest|dest\\s+fren|el\\s+fren', '@|nagir\\S*|bernade\\S*|venabe\\S*', '\\b(?:kamyon|tir|ereb)\\S*\\s+(?:\\S+\\s+)?(?:bi\\s+xwe\\s+)?(?:geriya|gindir\\S*|cu\\s+pas)\\b')],
  ['flat', /\b(?:teker|lastik|lastiq)\S*\s+(?:\S+\s+){0,3}?(?:teqi\S*|qetiya\S*|pincar\S*|kun\s+bu\S*|vala\s+bu\S*)|\b(?:lastik|lastiq)\S*\s+(?:\S+\s+){0,3}?(?:x(?:e|i)rab?\s+(?:bu|buye)\b|sikest\S*)|\bbaye\s+(?:\S+\s+)?(?:teker|lastik)\S*\s+(?:\S+\s+)?(?:cu|dice|derket|derdikeve|reviya)\b|\bteqiya\s+(?:\S+\s+)?(?:teker|lastik)/, /yedek|stepne|zede/],
  ['steer', kuRx('sukan|direksiyon|direksyon|rul', '@|giran\\b|nazivir\\S*|naziv\\S*|dilerz\\S*|lerizi\\S*')],
  ['leak', kuRx('run|ron|mazot|mazut|benzin|antifriz|adblue|yag|hidrolik', 'diherik\\S*|herik\\S*|dirij\\S*|rij\\S*|dilop\\s+dike|dicik\\S*|cikiya\\S*', '\\b(?:diherik|dilop\\s+dike)\\S*\\s+(?:\\S+\\s+)?(?:run|ron|mazot|antifriz|adblue)')],
  ['fire', new RegExp(`\\bagir\\s+(?:\\S+\\s+){0,2}?(?:girt|ket|heye|pe\\s+ket|derket|hilbu)\\b|\\b(?:ket|keti)\\s+agir\\b|\\b(?:disewit|sewiti|disewiti)\\S*|\\bduman\\S*\\s+(?:\\S+\\s+){0,2}?(?:derdikev\\S*|derket|te|heye)\\b|\\bdu\\s+(?:je\\s+)?(?:derdikev\\S*|te)\\b`), new RegExp(`\\b(?:${KU_LAMP}|far|egzoz|eksoz)`)],
  ['acc', /\bqeza\s+(?:\S+\s+){0,2}?(?:kir|kiriye|kirin|cebu|cebuye|qewimi\S*|bu)\b|\bpevket\S*|\bli\s+(?:min|me|kamyon\S*|tir\S*|ereb\S*)\s+(?:\S+\s+)?xist\b/],

  ['acc', /\b(?:kamyon|tir|tira|ereb\S*|maqin\S*|trak\S*)\s+(?:\S+\s+){0,2}?(?:wergeriya|qulibu)|\bji\s+re\s+(?:\S+\s+)?derket|\bket(?:im|in|e)?\s+(?:nav\s+)?(?:co|cok|xendek\S*)\b/, /\b(?:bar|bare|barek|palet\S*|koli\S*)\b|nehat/],

  ['acc', /\bket(?:im|in|e|iye)?\s+(?:nav\s+)?(?:co|cok|coye|xendek\S*|cal\S*)(?=\s|$)|\b(?:kamyon|tir|tira|ereb|maqin|trak|dorse)\S*\s+(?:\S+\s+)?di\s+(?:xendek|cal)\S*\s+de\s+(?:ye|e|bu|buye|ma|maye)\b/, /\b(?:bar|bare|barek|palet\S*|koli\S*)\b|\bnine\b|\bne\s+di\b/],

  ['stuck', /\bket(?:im|in|e|iye)?\s+(?:nav\s+)?(?:co|cok|coye|xendek\S*|cal\S*)(?=\s|$)|\b(?:kamyon|tir|tira|ereb|maqin|trak|dorse)\S*\s+(?:\S+\s+)?di\s+(?:xendek|cal)\S*\s+de\s+(?:ye|e|bu|buye|ma|maye)\b/, /\b(?:bar|bare|barek|palet\S*|koli\S*)\b|\bnine\b|\bne\s+di\b/],
  ['injury', /\bbirindar\s+(?:bum|bu|bun|im|e|in|buye|buyin)\b|\b(?:min|ez|em|sofer)\s+(?:\S+\s+)?birindar\b/, /\bnebu|\bne\s+bu/],
  ['nostart', /\b(?:motor|kamyon|tir|ereb)\S*\s+(?:\S+\s+){0,2}?(?:dest\s+pe\s+nake|venake|naqelib\S*|hilnaye)/],
  ['engine', kuRx('motor', '@|germ\\s+bu\\S*|zede\\s+germ\\S*|gelek\\s+germ\\S*|deng\\s+(?:dide|dike)|hez\\s+nake|kes\\s+nake', '\\b(?:egzoz|eksoz)\\S*\\s+(?:\\S+\\s+){0,2}?du(?:man)?\\s+res'), /dest\s+pe\s+nake|venake|naqelib/],
  ['mirror', kuRx('neynik|eyne|ayna|awene', '@|sikest\\S*|sikiya\\S*|ket\\b|ketiye|qelis\\S*|tirisk\\S*')],
  ['glass', kuRx('cam|sise', 'sikest\\S*|sikiya\\S*|qelis\\S*|tirisk\\S*|derz\\S*'), /neynik|ayna|eyne|cira|far\b|pencere\s+(?:aliy|kenar)|silecek|paqijk/],
  ['lights', kuRx('cira|ronahi|far|stop|sinyal|ampul', '@|venab\\S*|natewe\\S*|nadin\\S*|sikest\\S*|tari\\s+(?:ye|e)\\b'), /lamba\s+sor|ronahiya\s+hisyar/],
  ['warnlight', new RegExp(`\\b(?:${KU_LAMP})\\S*\\s+(?:\\S+\\s+){0,3}?(?:veket\\S*|peket\\S*|disewit\\S*|sewiti\\S*|vebu\\b|dibiriq\\S*|biriqi\\S*)`), /naxebit|venab|natewe/],
  ['batt', kuRx('aku|aqu|bateri|akumulator', '@|vala\\s+(?:ye|e|bu|buye)\\b|mir\\b|miriye|qediya\\S*|bar\\s+nake')],
  ['theft', /\b(?:hat|hate|hatin|hatine|hatiye)\s+diz(?:in|ine)\b|\bdiziy(?:e|a|in)\S*|\bdiz(?:an|ek|eke)?\s+(?:\S+\s+){0,2}?(?:bir|birin|biribu|biriye)\b/],
  ['door', kuRx('deri|derik', '@|venab\\S*|venebu\\S*|naye\\s+girtin|nagir\\S*|qefil\\s+(?:bu|ma)\\S*|sikest\\S*')],
  ['climate', kuRx('klima|kalorifer|germker', '@|sar\\s+nake|germ\\s+nake')],
  ['reefer', kuRx('frigo|frigorifik|sarker|sarinc|termo\\s*king|thermo\\s*king|carrier', '@|sar\\s+nake|sar\\s+nabe|germ\\s+bu\\S*')],
  ['breakdown', /\b(?:kamyon|kamyona|ereb\S*|tir|tira|maqin\S*|wesait\S*|trak\S*|otomobil\S*)\s+(?:\S+\s+){0,2}?(?:x(?:e|i)rab?\s+(?:bu|buye)\b|li\s+(?:ser\s+)?re\s+ma|di\s+re\s+de\s+ma)/],



  ['tyre', /\b(?:lastik|lastiq)\S*\s+(?:\S+\s+){0,3}?(?:hatiye\s+birin|hat\s+birin|biriye|biri\s+(?:ye|e)\b|kevin\s+bu\S*|werimi\S*|zirar\s+dit\S*)|\bbaye\s+(?:\S+\s+)?(?:teker|lastik)\S*\s+(?:\S+\s+)?kem\s+(?:e|ye|bu|buye|dibe)\b/, /yedek|stepne|teker\S*\s+(?:a\s+)?zede/],
  ['tacho', new RegExp(`\\b(?:takograf|tahograf|taxograf)\\S*\\s+(?:\\S+\\s+){0,3}?(?:${KU_D}|sikest\\S*|qeyd\\s+nak\\S*|nanivis\\S*|xelet\\S*|cewt\\S*)|\\bkart\\S*\\s+(?:a\\s+)?(?:sofer|ajokar)\\S*\\s+(?:\\S+\\s+){0,2}?(?:${KU_D}|naye\\s+xwendin|naxwin\\S*|winda\\s+bu\\S*|sikest\\S*|ase\\s+ma\\S*|dernak\\S*)|\\b(?:min|me)\\s+kart\\S*\\s+(?:a\\s+)?(?:sofer|ajokar)\\S*\\s+(?:\\S+\\s+)?winda\\s+kir`)],
  ['coupling', /\b(?:dorse|romork|treyler)\S*\s+(?:\S+\s+){0,3}?(?:gire\s+nabe|giredan\s+nabe|naye\s+giredan|qetiya\S*|veqetiya\S*|qut\s+bu\S*|kilit\s+nab\S*|kilit\s+nak\S*)|\b(?:semer|besinci\s+teker|teker\S*\s+(?:a\s+)?pencemin|kili[td]\S*\s+(?:a\s+)?dorse)\S*\s+(?:\S+\s+){0,2}?(?:naxebit\S*|venab\S*|nagir\S*|kilit\s+nab\S*|x(?:e|i)rab?\s+bu\S*)/, /deri|branda|fren|cira|lamba|far\b|lastik|plaka|kemer|qayis/],
  ['wheel', /\b(?:bijon|somun)\S*\s+(?:\S+\s+){0,2}?(?:sist\s+(?:bu|bun|bune|buye|e|in)\b|ket\b|ketin\b|ketine|ketiye|tune\b|winda\s+bu\S*|qetiya\S*)|\bjant\S*\s+(?:\S+\s+){0,2}?(?:sikest\S*|qelisi\S*|xwar\s+bu\S*|tirisk\S*)|\b(?:teker|rulman|poyra)\S*\s+(?:\S+\s+){0,2}?(?:dileq\S*|leqi\S*|dihej\S*|sist\s+(?:bu|e|ye)\b|germ\s+bu\S*|zede\s+germ\S*)/, /yedek|stepne|teker\S*\s+(?:a\s+)?zede\s+(?!germ)/],
  ['gear', kuRx('vites|sanziman|sanzuman|girbox|gerbox', '@|nakev\\S*|nace\\b|nacin\\S*|naguher\\S*', '\\b(?:debriyaj|debreyaj|kavrama)\\S*\\s+(?:\\S+\\s+){0,2}?(?:' + KU_D + '|nagir\\S*|dixisik\\S*|xisiya\\S*|patinaj\\S*)')],
  ['exhaust', kuRx('egzoz|eksoz|ekzos', '@|qetiya\\S*|ket\\b|ketiye|kun\\s+(?:bu|e|ye)\\b|deng\\s+(?:dide|dike)|sikest\\S*'), /du(?:man)?\s+res/],
  ['window', /\b(?:pencere|cam)\S*\s+(?:\S+\s+){0,3}?(?:danakev\S*|hilnakev\S*|naye\s+(?:xwar|jor)|nace\s+(?:jor|xwar)|nacin\S*\s+(?:jor|xwar)|venab\S*|naye\s+vekirin|ase\s+ma\S*)/, /\bderi\S*\s+(?:\S+\s+)?(?:venab|venebu|naye\s+girtin)|neynik|ayna|eyne/],
  ['tarp', kuRx('branda|cadir|tente', 'qetiya\\S*|ciri\\S*|dirriya\\S*|kun\\s+bu\\S*|firiya\\S*|vebu\\S*')],
  ['susp', kuRx('koruk|balon|amortisor|makas|suspansiyon|suspension', '@|teqi\\S*|qetiya\\S*|sikest\\S*|daket\\S*|bay\\S*\\s+(?:\\S+\\s+)?(?:diherik\\S*|dice|cu)\\b', '\\b(?:kamyon|tir|dorse)\\S*\\s+(?:\\S+\\s+){0,3}?aliyek\\S*\\s+(?:ve\\s+)?(?:xwar|daket)\\S*'), /sukan|kursi|kemer/],
  ['seat', /\bkemer\S*\s+(?:\S+\s+){0,2}?(?:nagir\S*|naye\s+(?:girtin|qefilandin)|qetiya\S*|sikest\S*|naxebit\S*|kilit\s+nab\S*|venab\S*)|\bkursi\S*\s+(?:\S+\s+){0,2}?(?:sikest\S*|dileq\S*|leqi\S*|daket\S*|naxebit\S*)/, /\bbar|palet|qayis|dorse|germ/],
  ['lost', /\b(?:mifte|kilit|kilid|ruxset|ruxsat|ruhsat)\S*\s+(?:\S+\s+){0,2}?(?:winda\s+(?:bu|bun|e|ye)\S*|nabin\S*)|\b(?:min|me)\s+(?:\S+\s+)?(?:mifte|kilit|kilid|ruxset|ruxsat|ruhsat)\S*\s+(?:\S+\s+)?winda\s+kir/, /kart|dorse/],
  ['numplate', kuRx('plaka|plake|plaqe', 'ket\\b|ketiye|ketibu|winda\\s+bu\\S*|sikest\\S*|qetiya\\S*|naye\\s+xwendin'), /cira|lamba|ronahi|ampul/],
  ['visib', kuRx('silecek|siliker|paqijker', '@|paqij\\s+nak\\S*|sikest\\S*|qetiya\\S*|ranawest\\S*|nalivi\\S*', '\\bcam\\S*\\s+(?:\\S+\\s+){0,2}?(?:buxar|hilm|mij)\\S*\\s+(?:dibe|bu|digire|girt|dike|kir)\\b')],
  ['stuck', /\b(?:heri|berf|qum|cemed|qesa|kamyon|tir|dorse|ereb)\S*\s+(?:\S+\s+){0,3}?ase\s+(?:ma|bu|maye|buye|mam|man|bum)\b|\bdi\s+(?:heri|berf|qum)\S*\s+de\s+(?:ma|mam|maye|man)\b|\b(?:qesa|cemed)\S*\s+(?:\S+\s+)?(?:dixisik\S*|xisiya\S*|disemit\S*|semiti\S*)/, /deri|pencere|\bcam|kart|vites/],
  ['fuelcard', new RegExp(`\\bkart\\S*\\s+(?:a\\s+)?(?:mazot|mazut|benzin|soteme|yaqit|akaryakit)\\S*\\s+(?:\\S+\\s+){0,2}?(?:${KU_D}|winda\\s+bu\\S*|bloke\\s+(?:bu|buye|e|ye)\\b|qebul\\s+nak\\S*|naye\\s+(?:qebul|xwendin)\\S*|sikest\\S*)|\\b(?:min|me)\\s+kart\\S*\\s+(?:a\\s+)?(?:mazot|mazut|benzin|soteme)\\S*\\s+(?:\\S+\\s+)?winda\\s+kir`)],
  ['adas', kuRx('radar|sensor|senzor|asistan', '@|xelet\\S*|cewt\\S*|nas\\s+nak\\S*', '\\b(?:kamyon|tir|ereb)\\S*\\s+(?:\\S+\\s+){0,2}?bi\\s+xwe\\s+(?:\\S+\\s+)?fren\\s+(?:dike|kir|digire|girt)\\b'), /frigo|takograf|park/],
  ['vandal', /\b(?:kesek\S*|kesan|hinekan)\s+(?:\S+\s+){0,4}?(?:xez\s+kir\S*|kun\s+kir\S*|sikand\S*|birr?in\b|boyax\s+kir\S*)/],
  ['load', /\b(?:bar|bare|barek|palet\S*|koli\S*)\s+(?:\S+\s+){0,2}?(?:semiti\S*|disemit\S*|hilwesiya\S*|ket\b|ketin\b|ketine|ketiye|wergeriya\S*)/, /\b(?:ji\s+nu\s+ve|disa)\s+(?:\S+\s+)?(?:gire\s*da|sabit\s+kir|sidand)/],
  ['lashgear', /\b(?:qayis\S*|spanset\S*|spanzet\S*|sapan\S*|circir\S*|(?:zincir|kemer)\S*\s+(?:a\s+)?bar\S*)\s+(?:\S+\s+){0,2}?(?:qetiya\S*|qetiyan|sikest\S*|x(?:e|i)rab?\s+(?:bu|buye)\b|winda\s+bu\S*|tune\b|naxebit\S*)/, /motor|dinamo|alternator|ventilator|pervane|\b(?:ji\s+nu\s+ve|disa)\s+(?:\S+\s+)?(?:gire\s*da|sabit\s+kir|sidand)/],
  ['dryfuel', /\b(?:mazot|mazut|benzin|soteme\S*)\s+(?:\S+\s+){0,2}?(?:qediya\S*|xilas\s+bu\S*|nema\b|tune\b)/]];
function kuKinds(v) { const k = new Set(); for (const raw of String(v || '').split(/[.,;!?\n]+|\s(?:û|u|lê|le|lêbelê|lebele)\s/i)) { if (!/[a-zêîûçş]/i.test(raw)) continue; const p = kuFold(raw).replace(KU_NEG, ' '); if (!KU_OK.test(p)) for (const [n, rx, ex] of KU_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); } if (k.has('acc')) k.delete('injury'); if (k.has('nostart')) k.delete('breakdown'); return k; }






const SO_MAP = { ە: 'e', ێ: 'e', ۆ: 'o', ڕ: 'r', ڵ: 'l', ڤ: 'v', ھ: 'h', ه: 'h', ی: 'y', ي: 'y', ى: 'y', و: 'w', ئ: '', ء: '', ا: 'a', أ: 'a', إ: 'a', آ: 'a', ب: 'b', پ: 'p', ت: 't',
  ث: 's', ج: 'j', چ: 'ch', ح: 'h', خ: 'kh', د: 'd', ذ: 'z', ر: 'r', ز: 'z', ژ: 'zh', س: 's', ش: 'sh', ص: 's', ض: 'z', ط: 't', ظ: 'z', ع: '', غ: 'gh', ف: 'f', ق: 'q', ك: 'k', ک: 'k', گ: 'g',
  ل: 'l', م: 'm', ن: 'n', ة: 'e' };
const soLat = (s) => ' ' + String(s || '').replace(/[ً-ٰٟـ‌]/g, '').replace(/ه(?=[^ء-ۿ]|$)/g, 'ە').replace(/[ء-ۿ]/g, (c) => SO_MAP[c] ?? c).toLowerCase().replace(/\s+/g, ' ') + ' ';
const SO_D = 'kar\\s+nak\\S*|ysh\\s+nak\\S*|khrap\\S*|tekchw\\S*|tek\\s+chw\\S*';
const soRx = (n, d, extra) => new RegExp(`\\b(?:${n})\\S*\\s+(?:\\S+\\s+){0,3}?(?:${d.split('@').join(SO_D)})${extra ? '|' + extra : ''}`);
const SO_NEG = /\bhych\s+(?:\S+\s+){0,2}?nyy?e\b|\b(?:rwwdaw|tesadwf|agr|dwwkel|bryndar|ksh|keshe|kysh)\S*\s+(?:\S+\s+)?(?:nebww\S*|nyy?e)\b|\bne(?:shka|teqy|rzha|rzh|swwta|dzra|kewt)\S*/g;
const SO_OK = /\bchak\s*kra\S*|\bchak\s+kra\S*|\bgord?ra\S*|\b(?:ysh|kar)\s+dek\S*|\bbash(?:e|\s+e)\b/;

const SO_MARK = /\b(?:nak(?:at|en|atewe|en)|dek(?:at|en)|bww|bwwm|bwwn|bwwe|dzra|dzrawe|shka|shkawe|teqy|teqyyewe)\b/;
const SO_LAMP = 'glop|gllop|chra|layt|nyshan';
const SO_KINDS = [['brake', soRx('bryk|brek|fren|frene', '@|nagr\\S*|lawaz\\S*|nyye\\b'), /dest|hendbryk|hand/],
  ['parkbrake', soRx('bryk\\S*\\s+(?:y\\s+)?dest|brekdest|hendbryk|hend\\s+bryk', '@|nagr\\S*')],
  ['flat', soRx('taye|tayer|tay|tayr|tayer', 'teqy\\S*|pencher\\S*|bay\\S*\\s+(?:\\S+\\s+)?(?:chw\\S*|derchw\\S*)|qwl\\s+bww\\S*'), /yede[kg]|stepne|ysprt|zyade/],
  ['steer', soRx('swkan|sukan|stern|styrn', '@|qwrs\\S*|nasw?r\\S*|nakhwl\\S*|delerz\\S*')],
  ['leak', soRx('ron|rwn|gazwayl|gazoyl|benzyn|mazwt|dyzl|antyfryz|adblw', 'derzh\\S*|rzha\\S*|rzhaw\\S*|dechor\\S*|chora\\S*|detk\\S*'), /tewaw|nema/],
  ['fire', new RegExp(`\\bagr\\s+(?:\\S+\\s+){0,2}?(?:kewt\\S*|grt\\S*|heye|bwwe|befr)|\\bkewte\\s+(?:\\S+\\s+)?agr|\\bdeswwt\\S*|\\bswwta\\b|\\bswwtaw\\S*|\\bdwwkel\\S*\\s+(?:\\S+\\s+){0,3}?(?:det|dyt|hat|heye|derdech\\S*|berz\\S*)\\b`), new RegExp(`\\b(?:${SO_LAMP})|swwtemen|egzoz`)],
  ['acc', /\b(?:rwwdaw|tesadwf|tesadw?f)\S*\s+(?:\S+\s+){0,2}?(?:krd|krdm|krdyn|bww|rwwyda|kra)\b|\bpekdadan\S*|\bdamdaye\s+/],

  ['acc', /\bwerger(?:a|an|awe)\b|\ble\s+reg[ae]\S*\s+(?:\S+\s+)?derch/, /\bbar|palet|wernager/],

  ['acc', /\bkewt\S*\s+(?:\S+\s+)?(?:naw\s+)?(?:jog(?:e|el)|khendeq)\S*|\b(?:otombel|barhelgr|trel|kamyon|seyar|lory)\S*\s+(?:\S+\s+)?le\s+(?:naw\s+)?(?:jog(?:e|el)|khendeq)/, /\bbar(?!helgr)|palet|\bnyy?e\b|\bnebww/],

  ['stuck', /\bkewt\S*\s+(?:\S+\s+)?(?:naw\s+)?(?:jog(?:e|el)|khendeq)\S*|\b(?:otombel|barhelgr|trel|kamyon|seyar|lory)\S*\s+(?:\S+\s+)?le\s+(?:naw\s+)?(?:jog(?:e|el)|khendeq)/, /\bbar(?!helgr)|palet|\bnyy?e\b|\bnebww/],
  ['injury', /\bbryndar\s+(?:bwwm|bww|bwwn|bwwyn|bwwe|m|e|yn)\b|\b(?:mn|em|shofer)\S*\s+(?:\S+\s+)?bryndar\b/],
  ['nostart', /\b(?:matore?|mator|matwr|lory|loryy|trambyl|otombyl|motor)\S*\s+(?:\S+\s+){0,2}?(?:dest\s+pe\s+nak\S*|nakewete\s+kar|helnaks\S*|helnas\S*|nadat\S*\s+bergw)/],
  ['engine', soRx('matore?|mator|matwr|motor', '@|germ\\s+(?:bww|debe)\\S*|zor\\s+germ\\S*|deng\\s+(?:dekat|deda|dedat)'), /dest\s+pe\s+nak|nakewete\s+kar/],
  ['mirror', soRx('awene|awyne|aweney', '@|shka\\S*|kewt\\S*|nyye\\b')],
  ['glass', soRx('shwwshe|shwshe|jam', 'shka\\S*|derz\\S*|qelysh\\S*'), /awene|glop|chra|layt/],
  ['lights', soRx(SO_LAMP + '|fanws|stop|syqnal|sygnal', '@|helnak\\S*|nakwzhyt\\S*|shka\\S*'), /swwr|agadar/],
  ['warnlight', new RegExp(`\\b(?:${SO_LAMP})\\S*\\s+(?:\\S+\\s+){0,2}?(?:helkrd\\S*|helkrdwe|dagyrsa\\S*|daygrsa\\S*|detrwsk\\S*|trwsk\\S*|helkra\\S*)`), new RegExp(SO_D)],
  ['batt', soRx('batry|patry|aku|akw', '@|betal\\S*|mrdw\\S*|mrd\\b|tewaw\\s+bww\\S*|charj\\s+nak\\S*')],
  ['theft', /\bdzra\S*|\bdzyy?an\S*|\bdzyw\S*|\bdzyrawe/],
  ['door', soRx('derga|dergay|dergake', '@|nakrete?w\\S*|nakrytew\\S*|dakhra\\S*|danakhr\\S*|nadakhr\\S*|shka\\S*')],
  ['climate', soRx('mwke?y?e?f|klyma|kwlyr|hyter|sobe', '@|sard\\s+nak\\S*|germ\\s+nak\\S*')],
  ['reefer', soRx('sardker\\S*|sardkerewe|frygo|frygoe|frygw|termo\\s*kyng|tyrmo\\s*kyng|karyer', '@|sard\\s+nak\\S*|sard\\s+nab\\S*|germ\\s+bww\\S*')],


  ['tyre', /\b(?:taye|tayer|tay|tayr)\S*\s+(?:\S+\s+){0,2}?(?:brawe|bra\b|brdra\S*|zyany\s+pegeyshtwe|ziyan\S*)|\bbay\s+(?:\S+\s+)?(?:taye|tayer|tay)\S*\s+(?:\S+\s+)?kem\S*/, /yede[kg]|stepne|ysprt|teqy|pencher/],
  ['tacho', new RegExp(`\\b(?:takograf|tachograf|tahograf)\\S*\\s+(?:\\S+\\s+){0,2}?(?:${SO_D}|shka\\S*|tomar\\s+nak\\S*)|\\bkart\\S*\\s+(?:y\\s+)?(?:shofer|shwfer|shofyr)\\S*\\s+(?:\\S+\\s+){0,2}?(?:${SO_D}|wn\\s+bww\\S*|nakhwenr\\S*|shka\\S*)|\\bkart\\S*\\s+(?:y\\s+)?(?:shofer|shwfer)\\S*\\s+(?:\\S+\\s+)?wn\\s+krd`)],
  ['coupling', /\b(?:tryle|trylle|treyler|dorse|dwrse|romork)\S*\s+(?:\S+\s+){0,2}?(?:nabestr\S*|jya\s+bwwew\S*|jyabwwew\S*|pchra\S*|qwfl\s+nab\S*)/, /derga|chadr|bryk|glop|chra|taye/],
  ['tarp', soRx('chadr|chader|brande|branda|tente', 'dra\\b|draw\\S*|pchra\\S*|kwn\\s+bww\\S*|frya\\S*')],
  ['load', /\b(?:bar|bare|bareke|barekan|palet|paletek|paletekan|qwtw|qwtwekan)\s+(?:\S+\s+){0,2}?(?:kewt\S*|kewtn\S*|jwla\S*|lyskhwr\S*|wergera\S*|helgera\S*)/, /dwbare\s+(?:\S+\s+)?best/],
  ['lashgear', /\b(?:qaysh|qayshy|qayshe|qaysh\S*|spanset|zncyr\S*)\s+(?:\S+\s+)?(?:bar|bareke|barbestn\S*)?\s*(?:\S+\s+)?(?:pchra\S*|brra\S*|shka\S*|wn\s+bww\S*|nyye\b)/, /mator|matwr|motor|dynamo|panke|dwbare\s+(?:\S+\s+)?best/],
  ['lost', /\b(?:klyl|klylek|klylekan|klylekem|kylyl|rwkhset|rwkhsat|anwnt)\S*\s+(?:\S+\s+)?(?:wn\s+bww\S*|wnbww\S*|nyye\b)|\b(?:klyl|klylek|klylekan|kylyl|rwkhset)\S*\s+(?:\S+\s+)?wn\s+krd/, /kart/],
  ['gear', soRx('ger|gear|gyr|geyr|gerboks|gyrboks|klach|klech|klatch', '@|nachyt\\S*|nachet\\S*|nagor\\S*|nayet\\S*')],
  ['exhaust', soRx('egzoz|egzwz|eksoz', '@|pchra\\S*|kwn\\s+bww\\S*|kewt\\S*|deng\\s+(?:dekat|deda)'), /dwwkel/],
  ['dryfuel', /\b(?:gazwayl|gazoyl|benzyn|swwtemeny|swtemeny|dyzl|mazwt)\S*\s+(?:\S+\s+){0,2}?(?:tewaw\s+bww\S*|nemaw\S*|nema\b|nyye\b)/]];
function soKinds(v) { const k = new Set(); for (const raw of String(v || '').split(/[.,;!?\n،؛؟]+|\s(?:و|بەڵام|هەروەها)\s/)) { if (!/[ء-ۿ]/.test(raw)) continue; const f = soLat(raw); if (!/[ەێۆڕڵڤ]/.test(raw) && !SO_MARK.test(f)) continue; const p = f.replace(SO_NEG, ' '); if (!SO_OK.test(p)) for (const [n, rx, ex] of SO_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); } if (k.has('acc')) k.delete('injury'); if (k.has('nostart')) k.delete('engine'); return k; }







const LX_MAP = { 'ı': 'i', 'ł': 'l', '’': ' ', "'": ' ', '`': ' ', '´': ' ', '-': ' ', 'ß': 's' };
const lxFold = (s) => { let o = ''; for (let i = 0; i < s.length; i++) { const c = s[i], l = c.toLowerCase(); o += LX_MAP[l] || l.normalize('NFD')[0] || c; } return o; };
const LX_G = '(?:[^\\s.,;!?]+\\s+){0,3}?';
const lxRx = (n, v, rev) => new RegExp(`\\b(?:${n})\\s+${LX_G}(?:${v})\\b` + (rev ? `|\\b(?:${rev})\\b` : ''), 'g');
const LX_BELT = /motor|alternat|dinamo|triger|vantilat|distribu|ventil|ventola|servizi|bezpiecz|seguridad|sicurezza|securite|ceinture|cintura|cinto|klinow|rozrzad|zebat|veiligheid|autogordel/;
const LX_KINDS = [

  ['load', lxRx('yuk|yuku|yukum|yukumuz|yukler|yukleri|yuklerin|mallar|mallari|palet|paletler|paletleri|paletlerin|koliler|kolilerin|kutular|kutularin|esyalar', 'ters\\s+(?:dondu|donmus|dondular|donmusler)|yan(?:a)?\\s+(?:yatti|yatmis|yattilar)|kaydi|kaymis|kayiyor|kaydilar|kaymislar|kaymaya\\s+basladi|devrildi|devrilmis|devrildiler|dustu|dusmus|dustuler|yikildi|yikilmis|dagildi|dagilmis|dokuldu|dokulmus|oynadi|oynamis|oynuyor|yer\\s+degistirdi|yerinden\\s+(?:oynadi|kaydi|cikti)|egildi|yamuldu'), null,
    /(?:tekrar|yeniden)\s+(?:bagla|sabitle|yerles|duzelt|topla)|duzelttim|duzelttik|duzeltildi|sabitledim/],
  ['lashgear', lxRx('spanzet\\S*|spanset\\S*|span\\s+kayis\\S*|sabitleme\\s+kayis\\S*|baglama\\s+kayis\\S*|yuk\\s+kayis\\S*|circir\\S*|gerdirme\\s+kayis\\S*', 'koptu|kopmus|koptular|kopuk|yirtildi|yirtilmis|yirtik|kirildi|kirik|bozuk|bozuldu|eksik|kayip|yok|asinmis|parcalandi'), null, /yenisini\s+(?:taktim|aldim)|degistirdim|degistirildi/, LX_BELT],

  ['load', lxRx('ladunek|ladunku|towar|towaru|palety|paleta|palet|kartony|skrzynie|skrzynia|paczki', 'przesun\\S*|przewroci\\S*|przewalil\\S*|spadl\\S*|wypadl\\S*|zsunal\\S*|zsunel\\S*|rozsypal\\S*|przechylil\\S*|przemiesci\\S*|pojechal\\S*|runal\\S*|runel\\S*|zawalil\\S*',
    `(?:przesunal|przesunel|przewrocil|spadl|spadly|spadla|wypadl|wypadly|zsunal|zsunel)\\S*\\s+(?:sie\\s+)?(?:[^\\s.,;!?]+\\s+){0,2}?(?:ladunek|towar|palety|paleta|kartony|skrzynie)`), /\bnie\b/,
    /ponownie\s+(?:zabezpiecz|zapi|przymocow|ulozy)|zabezpieczyl\S*\s+(?:ponownie|jeszcze\s+raz)|poprawil\S*|poprawion\S*|juz\s+(?:jest\s+)?zabezpieczon\S*|przelozyl\S*/],
  ['lashgear', lxRx('pas(?:y|ow)?\\s+(?:transportow|mocujac|ladunkow|spinajac)\\S*|pasy|spanzet\\S*|spanset\\S*|lancuch\\S*\\s+(?:do\\s+)?mocowan\\S*|grzechotk\\S*', 'pekl\\S*|peka|pekniet\\S*|zerwal\\S*|zerwan\\S*|urwal\\S*|urwan\\S*|uszkodzon\\S*|rozerwan\\S*|przetart\\S*|zepsut\\S*|zepsul\\S*',
    '(?:brakuje|nie\\s+ma|nie\\s+mam)\\s+(?:[^\\s.,;!?]+\\s+)?(?:pasow|spanzet\\S*|spanset\\S*|grzechotek)'), /\bnie\s+(?!ma\b|mam\b)/, /wymienil\S*|wymienion\S*|nowe\s+pasy/, /ruchu|zieleni|zjazd|bezpiecz|klinow|rozrzad|silnik|alternat|wentylat/],

  ['load', lxRx('marfa|marfuri|marfurile|incarcatura|incarcaturii|paletii|paletele|palete|paleti|cutiile|coletele|colete|baxurile|baxuri', '(?:s\\s+a|s\\s+au|se)\\s+(?:mutat|miscat|deplasat|rasturnat|daramat|prabusit|surpat|inclinat|misca|deplaseaza|rastoarna|varsat)|a\\s+alunecat|au\\s+alunecat|aluneca|a\\s+cazut|au\\s+cazut|cazut|a\\s+picat|au\\s+picat|rasturnat\\S*',
    '(?:s\\s+a|s\\s+au)\\s+(?:mutat|miscat|deplasat|rasturnat|daramat)\\s+(?:toata\\s+)?(?:marfa|incarcatura|paletii|paletele)|(?:au|a)\\s+cazut\\s+(?:[^\\s.,;!?]+\\s+)?(?:paletii|paletele|cutiile|coletele|marfa)'), /\bnu\b/,
    /(?:am|a)\s+(?:re)?asigurat|reasigurat|am\s+refacut|am\s+(?:re)?aranjat|am\s+fixat\s+din\s+nou|din\s+nou\s+(?:asigurat|fixat|legat)/],
  ['lashgear', lxRx('chingi|chingile|chinga|chingii|curele(?:le)?\\s+de\\s+(?:ancorare|fixare|legare|asigurare)|spanset\\S*|spanzet\\S*|lanturi(?:le)?\\s+de\\s+(?:ancorare|fixare)|clichet\\S*', 'rupt\\S*|s\\s+a\\s+rupt|s\\s+au\\s+rupt|defect\\S*|stricat\\S*|lipsesc|lipseste|deteriorat\\S*|uzat\\S*|tocit\\S*|desfacut\\S*',
    '(?:lipsesc|lipseste|nu\\s+am|nu\\s+sunt|nu\\s+avem)\\s+(?:[^\\s.,;!?]+\\s+)?(?:chingi\\S*|clichet\\S*)'), /\bnu\s+(?!am\b|sunt\b|avem\b)/, /schimbat\S*|inlocuit\S*|chingi\s+noi/],

  ['load', lxRx('carga|mercancia|mercaderia|palets|palet|paletas|pales|cajas|bultos|tarimas', 'se\\s+(?:ha|han)\\s+(?:movido|desplazado|corrido|caido|volcado|derrumbado|venido\\s+abajo|ladeado|inclinado)|se\\s+(?:movio|movieron|desplazo|desplazaron|corrio|corrieron|cayo|cayeron|volco|volcaron|vuelca|derrumbo|derrumbaron|mueve|mueven|ladeo|inclino|vino\\s+abajo)|(?:esta|estan)\\s+(?:movid|desplazad|caid|volcad|tirad|ladead)\\S*|(?:ha|han)\\s+caido|cayo|cayeron',
    'se\\s+(?:ha\\s+|han\\s+)?(?:movido|movio|desplazado|desplazo|caido|cayo|cayeron|volcado|volco|corrido|corrio)\\s+(?:toda\\s+)?(?:la|el|los|las|una|unos|unas)\\s+(?:carga|mercancia|palets|paletas|pales|cajas|bultos)'), /\bno\b/,
    /(?:vuelto|volvi|volvimos)\s+a\s+(?:asegurar|amarrar|sujetar|colocar|cargar)|re\s*asegur|reamarr|ya\s+(?:esta|estan)\s+(?:asegurad|amarrad|sujet)|recoloc/, /bateria|electric|cargador|movil|telefono|aceite|aire\s+acondicionado/],
  ['lashgear', lxRx('cinchas?|eslingas?|correas?\\s+de\\s+(?:amarre|sujecion|carga)|trinquetes?|carracas?|cadenas?\\s+de\\s+(?:amarre|sujecion)|spanset', 'rot[oa]s?|se\\s+(?:ha|han)\\s+roto|se\\s+rompi\\S*|partid[oa]s?|se\\s+(?:ha|han)\\s+partido|rajad[oa]s?|desgastad[oa]s?|deshilachad[oa]s?|faltan|danad[oa]s?|estropead[oa]s?',
    '(?:faltan|no\\s+hay|no\\s+tengo|no\\s+tenemos)\\s+(?:[^\\s.,;!?]+\\s+)?(?:cinchas|eslingas|carracas|trinquetes)'), /\bno\s+(?!hay\b|tengo\b|tenemos\b)/, /cambiad[oa]s|cambie|nuevas/, LX_BELT],

  ['load', lxRx('carga|mercadoria|mercadorias|paletes|palete|paletas|caixas|volumes', '(?:se\\s+)?(?:deslocou|moveu|mexeu|mexeram|moveram|deslocaram|deslizou|escorregou|escorregaram)(?:\\s+se)?|caiu|cairam|tombou|tombaram|virou|viraram|desabou|desabaram|desmoronou|(?:esta|estao)\\s+(?:deslocad|tombad|caid)\\S*',
    '(?:cairam|caiu|tombaram|tombou)\\s+(?:[^\\s.,;!?]+\\s+)?(?:paletes|caixas|volumes|a\\s+carga)'), /\bnao\b/,
    /(?:voltei|voltamos)\s+a\s+(?:amarrar|prender|segurar|arrumar)|ja\s+(?:esta|estao)\s+(?:amarrad|pres|segur|arrumad)|reamarr|rearrum/, /bateria|eletric|electric|carregador|telemovel|celular|oleo/],
  ['lashgear', lxRx('cintas?|cintas?\\s+de\\s+(?:amarracao|carga)|correias?\\s+de\\s+(?:amarracao|carga)|catracas?|roquetes?|spanset', 'partid[oa]s?|partiu|partiram|rebentad[oa]s?|rebentou|rebentaram|rompeu|romperam|rompid[oa]s?|rasgad[oa]s?|rasgou|estragad[oa]s?|danificad[oa]s?|faltam|gast[oa]s?',
    '(?:faltam|nao\\s+ha|nao\\s+tenho|nao\\s+temos)\\s+(?:[^\\s.,;!?]+\\s+)?(?:cintas|catracas|roquetes)'), /\bnao\s+(?!ha\b|tenho\b|temos\b)/, /troquei|trocad[oa]s|substitu|novas/, LX_BELT],

  ['load', lxRx('carico|merce|merci|bancali|bancale|pedane|pedana|pallet|colli|scatoloni|cartoni', '(?:si\\s+)?(?:e|sono)\\s+(?:spostat|moss|scivolat|cadut|crollat|ribaltat|rovesciat|inclinat|sbilanciat)\\S*|(?:spostat|ribaltat|rovesciat|crollat)[oaie]|scivola|si\\s+sposta|si\\s+muove|si\\s+muovono|si\\s+spostano|caduto|caduta|cadute|caduti',
    '(?:e|sono|si\\s+e|si\\s+sono)\\s+(?:cadut|spostat|ribaltat|scivolat)\\S*\\s+(?:[^\\s.,;!?]+\\s+){0,2}?(?:il|la|lo|i|le|gli|un|una|dei|delle|alcuni|alcune|due|tre)\\s+(?:carico|merce|bancali|bancale|pedane|colli|scatoloni|cartoni)'), /\bnon\b/,
    /(?:ho|abbiamo)\s+(?:[^\s.,;!?]+\s+)?(?:sistemat|rifissat|riassicurat|rilegat)\S*|(?:fissat|assicurat|legat)\S*\s+(?:di\s+nuovo|nuovamente)|gia\s+(?:fissat|sistemat|assicurat)/, /batteri|elettric|caricabatter/],
  ['lashgear', lxRx('cinghi[ae]|fasce|fascia\\s+di\\s+(?:ancoraggio|fissaggio)|cricchett[io]|tenditori|tenditore|catene\\s+di\\s+(?:ancoraggio|fissaggio)|spanset', 'rott[aeoi]|si\\s+(?:e|sono)\\s+rott\\S*|spezzat\\S*|strappat\\S*|lacerat\\S*|danneggiat\\S*|consumat\\S*|logor\\S*|sfilacciat\\S*|mancano',
    '(?:mancano|non\\s+ci\\s+sono|non\\s+ho|non\\s+abbiamo)\\s+(?:le\\s+|abbastanza\\s+)?(?:cinghie|fasce|cricchetti)'), /\bnon\s+(?!ci\s+sono\b|ho\b|abbiamo\b)/, /cambiat[ei]|sostituit[ei]|nuove/, LX_BELT],

  ['load', lxRx('chargement|cargaison|marchandises?|palettes?|colis|cartons|caisses|la\\s+charge', '(?:a|ont)\\s+(?:bouge|glisse|ripe|bascule|chute|verse)|(?:s\\s+est|se\\s+sont)\\s+(?:deplace|renverse|effondre|ecroule|couche|affaisse|decale|incline|mis\\s+a\\s+glisser)\\S*|(?:est|sont)\\s+(?:tombe|renverse|deplace|decale|parti)\\S*|bouge|glisse|tombe|tombent',
    '(?:sont|est)\\s+tombe\\S*\\s+(?:[^\\s.,;!?]+\\s+){0,2}?(?:des|les|la|le|une|un|deux|trois)\\s+(?:palettes?|colis|cartons|caisses)'), /\b(?:ne|n|pas|jamais|rien)\b/,
    /(?:re\s*)?(?:sangle|arrime|cale|attache)\S*\s+(?:a|de)\s+nouveau|resangl|rearrim|j\s+ai\s+(?:tout\s+)?(?:resangle|rearrime|recale|refait|remis)|remis\s+en\s+place/, /batterie|electri|recharge|prise\s+en\s+charge|en\s+charge|charge\s+utile/],
  ['lashgear', lxRx('sangles?|cliquets?|tendeurs?|chaines?\\s+d\\s+arrimage|courroies?\\s+d\\s+arrimage|spanset', 'cassee?s?|se\\s+sont\\s+cassee?s|s\\s+est\\s+cassee?|dechiree?s?|abimee?s?|rompue?s?|usee?s?|effilochee?s?|a\\s+lache|ont\\s+lache|lachee?s?|manquent|defectueu\\S*|hs',
    '(?:n\\s+)?y\\s+a\\s+(?:pas|plus)\\s+(?:assez\\s+)?(?:de|d)\\s+(?:sangles|cliquets)|il\\s+manque\\s+(?:des\\s+|de\\s+|les\\s+|une\\s+|deux\\s+)?(?:sangles?|cliquets?)|(?:pas|plus)\\s+(?:assez\\s+)?de\\s+sangles'), /\b(?:ne|n)\s+(?!y\s+a\b)(?:[^\s.,;!?]+\s+)?(?:sont|est|pas)\b/, /changee?s|remplacee?s|neuves/, LX_BELT],

  ['load', lxRx('lading|vracht|pallets?|goederen|dozen|rolcontainers?|kratten|colli|bigbags?', 'verschoven|verschuift|verschuiven|schuift|gaan\\s+(?:schuiven|verschuiven|lopen)|omgevallen|omgekiept|gekanteld|gevallen|viel|vielen|eruit\\s+gevallen|eraf\\s+gevallen|ingestort|ingezakt|scheef|losgeraakt|losgekomen',
    '(?:is|zijn)\\s+(?:er\\s+)?(?:[^\\s.,;!?]+\\s+){0,2}?(?:pallets?|dozen|kratten|colli|rolcontainers?)\\s+(?:omgevallen|gevallen|verschoven|uitgevallen)'), /\b(?:niet|geen|niets|niks|nergens)\b/,
    /opnieuw\s+(?:vastgezet|gezekerd|gesjord|vastgemaakt|gestapeld|geladen)|weer\s+(?:vastgezet|gezekerd|gesjord|vastgemaakt|recht)|herladen|rechtgezet|recht\s+gezet|al\s+(?:vastgezet|gezekerd)/, /accu|batterij|elektrisch|laadpaal|vrachtbrief|vrachtprijs/],
  ['lashgear', lxRx('spanbanden?|sjorbanden?|spanriemen|sjorriemen|ratels?|sjorkettingen|spankettingen|spanset', 'kapot|stuk|gescheurd|gebroken|geknapt|gesprongen|versleten|beschadigd|ontbreken|ontbreekt|kwijt|werken\\s+niet|werkt\\s+niet|houden\\s+niet|houdt\\s+niet|sluit\\s+niet',
    '(?:geen|te\\s+weinig|niet\\s+genoeg)\\s+(?:spanbanden|sjorbanden|spanriemen|ratels)'), /\bniet\s+(?:kapot|stuk|gescheurd|gebroken|versleten|beschadigd)|\bgeen\s+(?:schade|probleem)/, /vervangen|nieuwe\s+(?:spanbanden|sjorbanden|ratels)/, LX_BELT],

  ['load', lxRx('teret|tereta|roba|robe|palete|paleta|kutije|tovor', 'se\\s+(?:je\\s+)?(?:pomaknuo|pomaknula|pomakla|pomakao|pomjerio|pomjerila|pomerio|pomerila|prevrnuo|prevrnula|prevrnule|srusio|srusila|srusile|nagnuo|nagnula|premaknil|premaknila|prevrnil|podrl)|(?:je|su)\\s+(?:pao|pala|pale|pali|ispao|ispala|ispale|kliznuo|kliznula|padel|padla)|ispao|ispala|ispale|kliznuo|kliznula|klizi',
    '(?:pale|ispale|pala|pao)\\s+(?:su\\s+|je\\s+)?(?:\\S+\\s+)?(?:palete|kutije|teret|roba)'), /\b(?:nije|nisu|ni|ne)\b/, /(?:ponovno|opet|ponovo)\s+(?:osigura|pricvrst|veza|zaveza|pritrdil)|osigurao\s+sam|ucvrstio\s+sam/],
  ['lashgear', lxRx('trake\\s+za\\s+(?:teret|vezanje|pricvrscivanje)|remen(?:i|ovi)?\\s+za\\s+(?:teret|vezanje|pricvrscivanje)|spanzet\\S*|spanset\\S*|zatezn\\S*\\s+(?:trak|remen)\\S*|gurtne|gurte|pasovi\\s+za\\s+tovor', 'puk\\S*|potrgan\\S*|pokidan\\S*|ostecen\\S*|nedostaj\\S*|fale|fali|strgan\\S*|manjkaj\\S*',
    'puk\\S*\\s+(?:su\\s+|je\\s+)?(?:spanzet|spanset|gurt)\\S*|(?:nema|nemam|nemamo|fale|fali|nedostaju)\\s+(?:\\S+\\s+)?(?:spanzet\\S*|spanset\\S*|gurt\\S*|trak\\S*\\s+za\\s+(?:teret|vezanje))'), /\b(?:nije|nisu)\b/, /zamijen|zamenj|nove\s+(?:trake|gurte)/, LX_BELT],

  ['load', lxRx('rakomany|rakomanyt|aru|arut|raklap|raklapok|raklapot|dobozok|ladak', 'elcsuszott|megcsuszott|elcsusztak|elmozdult|elmozdultak|eldolt|eldoltek|felborult|felborultak|leesett|leestek|kiesett|kiestek|ledolt|osszedolt|megbillent|esett|estek|beleesett|beleestek|becsuszott|belecsuszott',
    '(?:elcsuszott|megcsuszott|elcsusztak|elmozdult|elmozdultak|eldolt|eldoltek|felborult|leesett|leestek|kiesett|kiestek|ledolt|osszedolt)\\s+(?:a|az|egy|ket|harom)\\s+(?:rakomany|aru|raklap|raklapok|dobozok|ladak)'), /\b(?:nem|sem)\b/, /ujra\s+(?:rogzit|lekot|biztosit|lespanifer)|megigazit|rendbe\s+tett/],
  ['lashgear', lxRx('heveder\\S*|spanifer\\S*|spanset\\S*|racsni\\S*|lekotoheveder\\S*|rogzito\\s+(?:heveder|szij)\\S*', 'elszakadt|elszakadtak|szakadt|szakadtak|elszakad|tonkrement|serult|serultek|hianyzik|hianyoznak|kopott|eltort',
    '(?:elszakadt|elszakadtak|szakadt|szakadtak|tonkrement|serult)\\s+(?:a|az|egy|ket)\\s+(?:heveder|spanifer|racsni)\\S*|(?:nincs(?:enek)?|hianyzik|hianyoznak)\\s+(?:eleg\\s+|a\\s+|egy\\s+|ket\\s+)?(?:heveder|spanifer|racsni)\\S*'), /\bnem\b/, /kicserel|uj\s+(?:heveder|spanifer)/, /biztonsagi|ekszij|vezermu|motor|generator/],

  ['load', lxRx('naklad|nakladu|zbozi|tovar|tovaru|palety|paleta|krabice|bedny', '(?:se|sa)\\s+(?:posunul|posunula|posunuly|posunulo|posunuli|presunul|presunula|prevrhl|prevrhla|prevrhly|prevrhol|prevratil|preklopil|zrutil|zrutila|sesul|sesunul|naklonil)|spadl|spadla|spadly|spadol|vypadl|vypadla|vypadly|vypadol|vypadli|rozsypal\\S*',
    '(?:posunul|posunula|posunuly|prevrhl|prevrhla|prevrhly|spadl|spadly|spadla|vypadl|vypadly|vypadla)\\s+(?:se\\s+|sa\\s+)?(?:\\S+\\s+)?(?:naklad|zbozi|tovar|palety|krabice|bedny)'), /\b(?:neni|nie\s+je)\b/, /znovu\s+(?:zajist|upevn|uvaz|zaist)|opat\s+(?:zaist|upevn)|prerovnal|zajistil\s+jsem|zaistil\s+som/],
  ['lashgear', lxRx('popruh\\S*|kurty|upinac\\S*\\s+popruh\\S*|upinaci\\s+pas\\S*|ranacn?\\S*|ratsn\\S*|spanset\\S*|spanzet\\S*', 'prask\\S*|roztrh\\S*|pretrh\\S*|roztrz\\S*|pretrz\\S*|utrh\\S*|poskoz\\S*|poskoden\\S*|chybi|chybaju|rozbit\\S*|znicen\\S*|zniceny|odreny|odrene',
    '(?:chybi|chybaju|nemam|nemame|nemam\\s+ziadne|nemam\\s+zadne)\\s+(?:\\S+\\s+)?(?:popruh\\S*|kurty|spanset\\S*|spanzet\\S*)'), /\b(?:neni|nie\s+je|nie\s+su)\b/, /vymen|nove\s+popruh|nove\s+kurty/, /bezpecnost|klinov|rozvod|motor|alternat/],


  ['load', lxRx('krovinys|krovini|kroviniai|krovinio|paletes|padeklai|padeklas|dezes|prekes|kroviny', 'pasislinko|pasislinkes|pasislinke|nuvirto|apvirto|isvirto|nukrito|iskrito|pajudejo|slenka|nuslydo|subyrejo|sugriuvo|apsivert\\S*|persivert\\S*|nugriuvo|griuvo',
    '(?:pasislinko|nuvirto|apvirto|isvirto|nukrito|iskrito|nuslydo|apsiverte|persiverte|nugriuvo)\\s+(?:[^\\s.,;!?]+\\s+)?(?:krovinys|kroviniai|paletes|padeklai|dezes|prekes)'), /\bne\b/, /(?:vel|is\s+naujo)\s+(?:pritvirtin|sutvirtin|surisau|sutvarki)|pritvirtinau\s+(?:vel|is\s+naujo)|perkroviau|sutvarkiau/],
  ['lashgear', lxRx('tvirtinimo\\s+dirz\\S*|krovinio\\s+dirz\\S*|verzimo\\s+dirz\\S*|sutraukimo\\s+dirz\\S*|dirzai|dirzu|spanset\\S*|spanzet\\S*|tempikliai|reketai', 'nutruko|nutruke|sutruko|plyso|suplyso|suplysus\\S*|sugedo|sugadint\\S*|pazeist\\S*|nusidevej\\S*|truksta|dingo',
    '(?:truksta|neturiu|neturime|nera)\\s+(?:[^\\s.,;!?]+\\s+)?(?:dirzu|tvirtinimo\\s+dirzu|spanset\\S*|spanzet\\S*)'), /\bne\s+(?!turiu\b)/, /pakeiciau|pakeisti|nauji\s+dirzai/, /saugos|kedes|generator|variklio|ventiliator|paskirstymo/],

  ['load', lxRx('krava|kravu|kravas(?!\\s+(?:auto|masin|automasin))|paletes|paletu|kastes|preces', '(?:ir\\s+)?(?:parvietojusies|parvietojas|nobidijusies|nobidijas|apgazusies|apgazas|sagazusies|sagazas|nokritusi|nokrita|izkrita|izkritusi|noslideja|sabruka|sabrukusi|kustas|apvelas|apvelusies|apvelusas)',
    '(?:parvietojas|nobidijas|apgazas|sagazas|nokrita|izkrita|noslideja|sabruka|apvelas)\\s+(?:[^\\s.,;!?]+\\s+)?(?:krava|kravas(?!\\s+(?:auto|masin|automasin))|paletes|kastes|preces)'), /\bnav\b|\bne\b/, /(?:atkal|no\s+jauna)\s+(?:nostiprin|piestiprin|sasien|sakart)|parkravu|sakartoju/],
  ['lashgear', lxRx('siksnas|siksna|stiprinajuma\\s+siksn\\S*|kravas\\s+siksn\\S*|spanset\\S*|spanzet\\S*|sprudrat\\S*', 'saplisa|saplisusas|saplisusi|plisa|partruka|partrukusas|ir\\s+bojatas|bojatas|bojata|trukst|pazudusas|nodilusas',
    '(?:trukst|nav)\\s+(?:[^\\s.,;!?]+\\s+)?(?:siksnu|stiprinajuma\\s+siksnu|spanset\\S*|spanzet\\S*)'), /\bnav\s+(?:bojat|saplis|partruk)/, /nomainiju|jaunas\s+siksnas/, /drosibas|josta|generatora|zobsiksn|dzinej|ventilator/],

  ['load', lxRx('ngarkesa|ngarkesen|ngarkese|malli|mallrat|mallin|paletat|paleta|kutite|kutit', 'u\\s+(?:zhvendos|zhvendosen|levize|levizen|rrezua|rrezuan|permbys|permbysen|shemb|shemben|anua|rrezu)|ra\\b|rane\\b|kane\\s+rene|ka\\s+rene|eshte\\s+zhvendosur|jane\\s+zhvendosur',
    'u\\s+(?:zhvendos|zhvendosen|rrezua|rrezuan|permbys|permbysen|shemb)\\s+(?:[^\\s.,;!?]+\\s+)?(?:ngarkesa|malli|mallrat|paletat|kutite)|(?:rane|ra)\\s+(?:[^\\s.,;!?]+\\s+)?(?:paletat|kutite|ngarkesa|malli)'), /\b(?:nuk|s)\b/, /(?:e|i)\s+(?:sigurova|lidha|fiksova)\s+(?:perseri|serish)|(?:perseri|serish)\s+(?:e\s+)?(?:sigur|lidh|fiks)|rregullova/],
  ['lashgear', lxRx('rripat|rripa|rripat\\s+e\\s+ngarkeses|rripat\\s+e\\s+fiksimit|spanset\\S*|spanzet\\S*|cikrik\\S*', 'u\\s+keputen|u\\s+keput|jane\\s+keputur|keputur|u\\s+grisen|u\\s+gris|jane\\s+grisur|grisur|te\\s+prishura|prishur|mungojne|mungon',
    '(?:mungojne|nuk\\s+kam|nuk\\s+kemi|nuk\\s+ka)\\s+(?:[^\\s.,;!?]+\\s+)?(?:rripa|rripat|spanset\\S*|spanzet\\S*)|u\\s+(?:keputen|keput|grisen)\\s+(?:[^\\s.,;!?]+\\s+)?rripat'), /\bnuk\s+(?!kam\b|kemi\b|ka\b)/, /i\s+nderrova|te\s+reja|zevendesova/, /sigurimit|sigurise|motorit|alternator|ventilator|kambio/],

  ['load', lxRx('koorem|koorma|last|lasti|kaup|kaubad|alused|kastid|aluse', 'nihkus|nihkusid|on\\s+nihkunud|nihkunud|liikus|liikusid|kukkus|kukkusid|kukkus\\s+umber|laks\\s+umber|lainud\\s+umber|vajus|vajusid|libises|laksid\\s+umber|kukkusid\\s+umber|(?:on\\s+|olid\\s+)?umber\\s+lainud',
    '(?:kukkusid|kukkus|nihkus|nihkusid|vajus|libises|laksid\\s+umber)\\s+(?:[^\\s.,;!?]+\\s+)?(?:alused|kastid|koorem|kaubad)'), /\b(?:ei|pole|polnud)\b/, /(?:uuesti|jalle)\s+(?:kinnit|pingut|seo)|kinnitasin\s+uuesti|ladusin\s+umber|sattisin/],
  ['lashgear', lxRx('rihmad|rihm|kinnitusrihm\\S*|pingutusrihm\\S*|koormarihm\\S*|spanset\\S*|spanzet\\S*|ratsud', 'on\\s+katki|laksid\\s+katki|lks\\s+katki|laks\\s+katki|katki|rebenesid|rebenes|puruks|puudu|puuduvad|kulunud|vigased',
    '(?:pole|ei\\s+ole|puudu\\s+on)\\s+(?:[^\\s.,;!?]+\\s+)?(?:rihmu|kinnitusrihmu|spanset\\S*)'), /\b(?:ei|pole)\s+(?!ole\b)(?:katki|rebenenud)/, /vahetasin|uued\s+rihmad/, /turva|veorihm|hammasrihm|mootori|generaator|ventilaator/],

  ['load', lxRx('maal|saman|samaan|cargo|load|pallet|pallets|peti|petiyan|daba|dabbe', 'shift\\s+ho\\s+(?:gaya|gaye|gya|gyi|gayi)|khisak\\s+(?:gaya|gaye|gya|gyi|gayi)|gir\\s+(?:gaya|gaye|gya|gyi|gayi|pada|pade)|hil\\s+(?:gaya|gaye|gya)|palat\\s+(?:gaya|gaye|gya)|ulat\\s+(?:gaya|gaye|gya)|ludhak\\s+(?:gaya|gaye|gya)|ult(?:a|e|i)\\s+ho\\s+(?:gaya|gaye|gya|gyi|gayi)|palat\\s+ho\\s+(?:gaya|gaye|gya)'), /\b(?:nahi|nahin|nai)\b/, /(?:dobara|fir\s+se|phir\s+se)\s+(?:bandh|baandh|tight|set|laga)|theek\s+kar\s+diya|set\s+kar\s+diya/, /battery|charge|charging|phone|mobile/],
  ['lashgear', lxRx('strap|straps|ratchet|ratchets|patta|patte|rassi|rassiyan|load\\s+belt|lashing\\s+belt|cargo\\s+belt', 'toot\\s+(?:gaya|gaye|gya|gyi|gayi)|tut\\s+(?:gaya|gaye|gya)|kat\\s+(?:gaya|gaye|gya)|phat\\s+(?:gaya|gaye|gya)|kharab\\s+(?:ho\\s+)?(?:gaya|gaye|hai|hain)|kam\\s+(?:hai|hain)',
    '(?:strap|straps|ratchet|patte|rassi)\\s+(?:nahi|nahin)\\s+(?:hai|hain|he)'), /\b(?:nahi|nahin|nai)\s+(?:toot|tut|kat|phat|kharab)/, /(?:naya|naye|nayi)\s+(?:laga|lagaya|lagaye)|badal\s+diya|change\s+kar\s+diya/, /seat|safety|fan|engine|alternator|timing/],

  ['load', lxRx('karga|kargamento|kargada|kahon|mga\\s+kahon|paleta|pallet|pallets|mga\\s+pallet', 'gumalaw|natumba|nahulog|bumagsak|tumagilid|lumipat|nadulas|umusog|gumuho|tumaob|tumumba|bumaligtad',
    '(?:gumalaw|natumba|nahulog|bumagsak|tumagilid|lumipat|nadulas|umusog|gumuho|tumaob|tumumba|bumaligtad)\\s+(?:na\\s+)?(?:ang|yung|iyong|ung)\\s+(?:mga\\s+)?(?:karga|kargamento|kargada|kahon|paleta|pallet\\S*)'), /\b(?:hindi|di)\b/, /(?:tinali|inayos|sinecure|ini\s*secure)\s+(?:ko|namin)\s+(?:ulit|uli)|inayos\s+ko\s+na/, /battery|baterya|charge|cellphone/],
  ['lashgear', lxRx('strap|mga\\s+strap|ratchet|tali|lubid|kadena', 'naputol|napigtas|nasira|sira|wala\\s+na',
    '(?:naputol|napigtas|nasira)\\s+(?:na\\s+)?(?:ang|yung|ung)\\s+(?:mga\\s+)?(?:strap|ratchet|tali|lubid|kadena)|(?:walang|kulang\\s+ang|kulang\\s+(?:ng|sa))\\s+(?:mga\\s+)?(?:strap|ratchet)'), /\b(?:hindi|di)\b/, /pinalitan|bagong\s+strap/, /seatbelt|seat\s+belt|sinturon|fan|makina|sapatos/]];



const LX_DITCH = /^\s+(?:[^\s.,;!?]+\s+){0,2}?(?:prikop\S*|priekop\S*|rowu|rowie|hendeg\S*|hendek\S*|sarampol\S*|cuneta|zanja|valeta|vala|fosso|fossato|cunetta|fosse|sloot|greppel|arok\S*|sant|santul|rapa|jarak|jarku|griov\S*|grav(?:is|i|ja|ji|ju)|kraavi?|kanal\S*|khaai|naale|nale)\b/;
function lxRun(v) { const s = String(v || ''), f = lxFold(s), k = new Set(), cut = s.split(''); let any = false;
  for (const [n, rx, neg, ok, ex] of LX_KINDS) for (const m of f.matchAll(rx)) { const a = m.index; let b = a + m[0].length;
    let p = a; while (p > 0 && !/[.,;!?\n]/.test(f[p - 1])) p--; let q = b; while (q < f.length && !/[.,;!?\n]/.test(f[q])) q++;
    const part = f.slice(p, q); if (ex && ex.test(part)) continue; any = true;
    if (!(neg && neg.test(f.slice(p, b))) && !(ok && ok.test(part))) k.add(n);
    const dm = n === 'load' ? LX_DITCH.exec(f.slice(b, q)) : null; const e = dm ? b + dm[0].length : b;
    for (let i = a; i < e; i++) cut[i] = i === a + 1 ? 'o' : i === a + 2 ? 'k' : ' '; }
  return { k, rest: any ? cut.join('') : s }; }




const FK_NEG = new RegExp('(?:^|[^\\p{L}])(?:' + [
  'kaza\\s+(?:olmad[ıi]|yok|yapmad[ıi][mk]?)', '(?:yang[ıi]n|duman|h[ıi]rs[ıi]zl[ıi]k|soygun)\\s+(?:yok|[çc][ıi]kmad[ıi]|olmad[ıi])', 'hi[çc]bir\\s+[şs]ey\\s+[çc]al[ıi]nmad[ıi]',
  '(?:nie\\s+by[łl]o|bez|brak)\\s+(?:wypadku|kolizji|st[łl]uczki|po[żz]aru|ognia|dymu|kradzie[żz]y|w[łl]amania)', 'nic\\s+nie\\s+(?:zosta[łl]o\\s+)?(?:skradzione|ukradzione|ukradli|zgin[ęe][łl]o)',
  '(?:nu\\s+(?:a\\s+fost|am\\s+avut|s-a\\s+produs|e|este)\\s+(?:nici\\s*un\\s+|un\\s+)?|f[aă]r[aă]\\s+|nici\\s*un\\s+)(?:accident|tamponare|incendiu|foc|fum|furt)', 'nu\\s+(?:s-a\\s+furat|a\\s+fost\\s+furat|au\\s+furat)\\s+nimic', 'nimic\\s+(?:nu\\s+)?(?:a\\s+fost\\s+)?furat',
  '(?:nije\\s+bilo|nema|bez|ni\\s+bilo|brez)\\s+(?:nesre[ćcč]e|nezgode|sudara|udesa|trka|po[žz]ara|vatre|dima|kra[đd]e|kraje|provale)', 'nije\\s+(?:bila\\s+|to\\s+)?(?:nesre[ćc]a|nezgoda)', 'ni[šs]ta\\s+(?:nije\\s+)?ukradeno',
  'nem\\s+volt\\s+(?:semmi(?:lyen)?\\s+)?(?:baleset|[üu]tk[öo]z[ée]s|t[űu]z|f[üu]st|lop[áa]s|bet[öo]r[ée]s)', '(?:baleset|t[űu]z|f[üu]st)\\s+nem\\s+volt', 'nincs\\s+(?:semmi(?:lyen)?\\s+)?(?:baleset|t[űu]z|f[üu]st)', 'semmit\\s+(?:sem\\s+)?(?:nem\\s+)?lopt[áa]k(?:\\s+el)?', 'nem\\s+lopt[áa]k\\s+el\\s+semmit',
  '(?:nebyla|nebyl|nebylo|nebola|nebol|nedo[šs]lo\\s+ku?|nestala\\s+se|bez|[žz][áa]dn[áaýy]|[žz]iadn[aey])\\s+(?:to\\s+)?(?:nehod\\p{L}*|koliz\\p{L}*|po[žz][áa]r\\p{L}*|kr[áa]de[žz]\\p{L}*|vloup[áa]n\\p{L}*|vl[áa]man\\p{L}*)', 'nic\\s+(?:nebylo\\s+)?(?:ukradeno|neukradli)', 'ni[čc]\\s+(?:nebolo\\s+)?(?:ukradnut[ée]|neukradli)',
  '(?:нямаше|няма|без|не\\s+е\\s+имало|немаше|нема)\\s+(?:катастроф\\p{L}*|произшестви\\p{L}*|инцидент|пожар|дим|кражба|удар|несреќ\\p{L}*|сообраќајк\\p{L}*)', 'нищо\\s+не\\s+(?:е\\s+)?(?:откраднато|откраднаха)',
  '(?:nebija|nav\\s+bij(?:is|usi)|bez)\\s+(?:avārij\\p{L}*|avarij\\p{L}*|negadījum\\p{L}*|negadijum\\p{L}*|ugun\\p{L}*|dūm\\p{L}*|zādzīb\\p{L}*|zadzib\\p{L}*)',
  '(?:nebuvo|be|nėra|nera)\\s+(?:jokios\\s+|jokio\\s+)?(?:avarij\\p{L}*|eismo\\s+įvyki\\p{L}*|susidūrim\\p{L}*|susidurim\\p{L}*|gaisr\\p{L}*|dūm\\p{L}*|vagyst\\p{L}*)',
  '(?:nuk\\s+(?:ka|pati|kishte|ndodhi|pat)(?:\\s+pasur)?|pa)\\s+(?:asnj[ëe]\\s+|nj[ëe]\\s+)?(?:aksident\\p{L}*|zjarr\\p{L}*|tym\\p{L}*|vjedhje\\p{L}*)',
  '(?:ei\\s+olnud|pole\\s+olnud|ei\\s+ole|pole|polnud|ilma)\\s+(?:mingit\\s+)?(?:õnnetus\\p{L}*|onnetus\\p{L}*|avarii\\p{L}*|kokkupõrge\\p{L}*|tulekahju\\p{L}*|tuld|suitsu\\p{L}*|vargus\\p{L}*)',
  '(?:koi\\s+)?(?:accident|exident|aksident|eksident|takkar|takar|chori|aag|ag)\\s+(?:bhi\\s+)?(?:nahi|nahin|nhi|nai)\\s+(?:hua|hui|huva|lagi|hai|tha|thi|ho)', '(?:kuch\\s+(?:bhi\\s+)?)?(?:gayab|gaib|chori)\\s+(?:nahi|nahin|nhi|nai)\\s+(?:hua|hui|huva|hai|tha|thi|ho|kiya)', 'kuch\\s+(?:bhi\\s+)?(?:nahi|nahin|nhi|nai)\\s+(?:chura\\p{L}*|gaya|gayab)',
  '(?:wala(?:ng)?|hindi|di)\\s+(?:naman\\s+|namang\\s+|pong\\s+|po\\s+)?(?:aksidente|naaksidente|disgrasya|nadisgrasya|nabangga|nabunggo|sunog|nasunog|apoy|usok|umuusok|nakaw|ninakaw|nanakaw|nagnakaw)\\p{L}*',
  '(?:no\\s+(?:hubo|hay|ha\\s+habido|tuve|tuvimos|he\\s+tenido)|sin|ning[uú]n)\\s+(?:ning[uú]n[oa]?\\s+)?(?:accidente|choque|colisi[oó]n|incendio|fuego|humo|robo|herid\\p{L}*|lesionad\\p{L}*)', 'no\\s+(?:me\\s+|nos\\s+)?(?:robaron|han\\s+robado|rob[oó])\\s+nada', 'nada\\s+(?:fue\\s+)?robado', 'no\\s+(?:he\\s+)?(?:choqu[eé]|chocamos|chocado)', 'nadie\\s+(?:result[oó]\\s+|est[aá]\\s+|sali[oó]\\s+)?herid\\p{L}*',
  '(?:n[aã]o\\s+(?:houve|h[aá]|teve|tive|tivemos)|sem|nenhum)\\s+(?:nenhum[a]?\\s+)?(?:acidente|batida|colis[aã]o|choque|inc[eê]ndio|fogo|fumo|fuma[cç]a|roubo|furto|ferid\\p{L}*|magoad\\p{L}*|machucad\\p{L}*)', 'n[aã]o\\s+(?:me\\s+|nos\\s+)?(?:roubaram|furtaram)\\s+nada', 'nada\\s+(?:foi\\s+)?(?:roubado|furtado)', 'n[aã]o\\s+(?:bati|batemos|bateu)', 'ningu[eé]m\\s+(?:ficou\\s+|est[aá]\\s+|saiu\\s+)?(?:ferid|magoad|machucad)\\p{L}*',
  '(?:non\\s+(?:c[\'’]?\\s*[eè]\\s+stat[oa]|c[\'’]?\\s*[eè]|ho\\s+avuto|abbiamo\\s+avuto|ci\\s+sono\\s+stati)|senza|nessun[oa]?)\\s+(?:nessun[oa]?\\s+|alcun[oa]?\\s+)?(?:incident\\p{L}*|tamponament\\p{L}*|collision\\p{L}*|scontr\\p{L}*|incendi\\p{L}*|fuoco|fumo|furt\\p{L}*|ferit\\p{L}*)', 'non\\s+(?:mi\\s+|ci\\s+)?hanno\\s+rubato\\s+(?:niente|nulla)', '(?:niente|nulla)\\s+(?:[eè]\\s+stato\\s+)?rubato', 'nessuno\\s+(?:[eè]\\s+|si\\s+[eè]\\s+)?(?:ferit\\p{L}*|fatt[oa]\\s+male)',
  '(?:pas\\s+(?:eu\\s+)?(?:d[\'’]\\s*|de\\s+)|sans\\s+|aucun[e]?\\s+)(?:accident|accrochage|collision|incendie|feu|fum[ée]e|vol|bless\\p{L}*)', 'rien\\s+(?:n[\'’]\\s*a\\s+[ée]t[ée]\\s+)?vol[ée]', '(?:on\\s+)?(?:ne\\s+)?m[\'’]\\s*a\\s+rien\\s+vol[ée]', 'personne\\s+(?:n[\'’]\\s*)?(?:est|a\\s+[ée]t[ée])\\s+bless\\p{L}*',
  '(?:geen|zonder)\\s+(?:enkel(?:e)?\\s+)?(?:ongeluk\\p{L}*|ongeval\\p{L}*|aanrijding\\p{L}*|botsing|brand|vuur|rook|diefstal|inbraak|gewond\\p{L}*)', '(?:het\\s+)?(?:was|is)\\s+geen\\s+(?:ongeluk|ongeval|aanrijding)', '(?:er\\s+(?:is|was|werd)\\s+)?(?:niets|niks)\\s+(?:is\\s+|werd\\s+)?gestolen', 'niemand\\s+(?:is\\s+|raakte\\s+|werd\\s+)?gewond'
].join('|') + ')(?!\\p{L})', 'giu');
const fkNeg = (v) => lxRun(String(v || '').replace(FK_NEG, ' ok ')).rest;
async function foreignKinds(v0) { const v = fkNeg(v0); const k = new Set([...trKinds(v), ...plKinds(v), ...roKinds(v), ...hrKinds(v), ...huKinds(v), ...csKinds(v), ...bgKinds(v), ...ltKinds(v), ...lvKinds(v), ...sqKinds(v), ...etKinds(v), ...rlKinds(v), ...ulKinds(v), ...srKinds(v), ...slKinds(v), ...beKinds(v), ...geKinds(v), ...arKinds(v), ...faKinds(v), ...uzKinds(v), ...azKinds(v), ...kzKinds(v), ...kyKinds(v), ...tjKinds(v), ...tkKinds(v), ...hyKinds(v), ...grKinds(v), ...hiKinds(v), ...tlKinds(v), ...esKinds(v), ...ptKinds(v), ...itKinds(v), ...frKinds(v), ...nlKinds(v), ...kuKinds(v), ...soKinds(v), ...lxRun(String(v0 || '').replace(FK_NEG, ' ok ')).k]); if (k.has('acc')) k.delete('injury'); return k; }

export { foreignKinds };
