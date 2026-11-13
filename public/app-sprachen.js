// [CLAUDE] AUTOMATISCH ERZEUGT durch scripts/build-app.mjs aus public/app.js – nicht von Hand bearbeiten (Code in app.js ändern, dann npm run build)
import {  } from './app-main.js';















const TR_OK = /(?:tamir|onarim)\s+(?:edildi|yapildi)|duzel(?:di|tildi)|degistir(?:ildi|dim|dik)|onarildi|giderildi|halledildi|(?:sorun|problem)\S*\s+yok|\bdegil\b/;
const TR_KINDS = [['brake', /\bfren(?:ler|im|leri|lerim)?\s+(?:\S+\s+)?(?:tutmuyor|bosa|yok\b|calismiyor|zayif|kilitlen|sikis|isin)|\bfren\s+havasi|\bhava\s+basinci\s+(?:\S+\s+)?dus/, /lamba|asistan|acil\s+fren/],
  ['fire', /\byangin|\balev\s+(?:al|cik|var)|\bduman\s+(?:\S+\s+)?(?:cik|gel|var|tut)|\byanik\s+koku|\bkablo\S*\s+(?:yandi|eridi)/, /egzoz|sondur/],
  ['flat', /\b(?:lasti(?:k|gi|gim|kler)|teker\S*)\s+(?:\S+\s+)?(?:patla|indi\b|inik|sondu|yirtil)|\bpatlak\s+lastik/],
  ['steer', /\bdireksiyon\S*\s+(?:\S+\s+)?(?:kilitlen|kitlen|agir|sert|bosluk|tutmuyor|donmuyor|cekiyor)|\b(?:arac|kamyon|tir)\s+(?:\S+\s+)?(?:saga|sola)\s+cekiyor/],
  ['leak', /\b(?:yag|mazot|motorin|dizel|antifriz|hidrolik|adblue)\S*\s+(?:\S+\s+)?(?:kacir|akiyor|sizdir|sizinti|damli|kacag)/],
  ['acc', /\bkaza\s+(?:yaptim|yaptik|yapti|oldu|gecir)|\bcarp(?:tim|tik|ti|isti|isma)/, /\btas\b|\bcam\b/],
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
function trKinds(v) { const k = new Set(); for (const p of trFold(v).split(/[.,;!?\n]+/)) if (!TR_OK.test(p)) for (const [n, rx, ex] of TR_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); if (k.has('acc')) k.delete('injury'); return k; }



const PL_OK = /naprawi|wymienio|wymienil|juz\s+dziala|bez\s+problem|nie\s+ma\s+problemu|wszystko\s+(?:ok|w\s+porzadku)/;
const PL_KINDS = [['brake', /\bhamul(?:ce|ec|ca|cy|cow)\s+(?:\S+\s+)?(?:nie\s+(?:dziala|trzyma|hamuj)|sie\s+(?:blokuj|zablok|grzej|przegrz)|slab|zawiod|puszcz)|\b(?:slabo|nie|zle)\s+hamuje|\b(?:brak|spada|ucieka|niskie)\s+(?:\S+\s+)?cisnieni\S*\s+(?:w\s+)?(?:powietrz|ukladzie\s+hamulc)/, /swiatl|reczn|postojow|asystent|bez\s+powodu/],
  ['fire', /\bpozar|\bogien|\b(?:kabina|silnik|opona|naczepa|auto|samochod|ciezarowka|kolo)\s+(?:sie\s+)?(?:pali\b|zapalil|zapalila|plonie)|\bpali\s+sie\s+(?:\S+\s+)?(?:kabina|silnik|opona|naczepa|auto|kolo)|\bdym\S*\s+(?:\S+\s+)?(?:leci|idzie|wydobywa|z\s+(?:silnika|kabiny|maski|deski)|spod)|\bdymi\s+sie|\b(?:czuc|smierdzi|zapach)\s+(?:\S+\s+)?(?:spalenizn|spalon|palon)|\bswad\b|\bkabel\S*\s+(?:\S+\s+)?(?:stopil|spalil|przepalil)/, /wydech|tlumik|gasnic|kontrolk|lampk|sprzegl|klock/],
  ['flat', /\b(?:opon\S*|kol[oa]|guma|gume)\s+(?:\S+\s+)?(?:pekl|wybuchl|wystrzelil|strzelil|eksplod|zeszl|flak|kapc)|\b(?:pekl|wybuchl|wystrzelil|strzelil)\S*\s+(?:\S+\s+)?(?:opon|gum)|\bzlapal\S*\s+(?:\S+\s+)?(?:gume|kapcia|flaka)|\bkapec\b|\bflak\b/],
  ['steer', /\bkierownic\S*\s+(?:\S+\s+)?(?:zablokow|zaciel|ciezk|chodzi\s+ciezko|luz|nie\s+(?:kreci|skreca|dziala))|\bukl\S*\s+kierownicz\S*\s+(?:\S+\s+)?(?:nie\s+dziala|awari)|\b(?:auto|samochod|ciezarowka|ciagnik)\s+(?:\S+\s+)?(?:sciaga|ciagnie)\s+(?:w\s+|na\s+)?(?:prawo|lewo)/],
  ['leak', /\b(?:olej|ropa|ropy|paliwo|plyn|diesel|adblue)\S*\s+(?:\S+\s+)?(?:cieknie|kapie|wycieka|leci|ucieka|sie\s+leje)|\bwyciek\S*\s+(?:\S+\s+)?(?:olej|paliw|ropy|plyn|adblue|diesl)|\b(?:cieknie|kapie|wycieka|leje\s+sie)\s+(?:\S+\s+)?(?:olej|ropa|paliwo|plyn|diesel|adblue)/],
  ['acc', /\b(?:mialem|mielismy|zdarzyl\S*|spowodowal\S*)\s+(?:\S+\s+)?(?:wypadek|kolizj|stluczk)|\bwypadek\b|\bkolizj|\bstluczk|\b(?:uderzyl|walnal|wjechal|najechal|otarl|zarysowal|cofajac\s+uderzyl)\S*/, /kamien|kamyk/],
  ['injury', /\branny\b|\branna\b|\bzranion|\bzranil|\bkaretk|\bambulans/],
  ['parkbrake', /\bhamul\S*\s+reczn\S*\s+(?:\S+\s+)?(?:nie\s+(?:trzyma|dziala|puszcza|zaciaga)|zepsut|zaciel)|\b(?:auto|samochod|ciezarowka|naczepa|ciagnik)\s+(?:sie\s+|mi\s+)?(?:stoczyl|zjechal)/],
  ['nostart', /\b(?:silnik|auto|samochod|ciezarowka|ciagnik)\s+(?:\S+\s+)?nie\s+(?:odpala|zapala|startuje|chce\s+odpalic)|\brozrusznik\S*\s+(?:\S+\s+)?nie\s+(?:kreci|dziala)|\bnie\s+(?:moge|mozna)\s+odpalic/],
  ['mirror', /\blusterk\S*\s+(?:\S+\s+)?(?:urwan|urwal|pekl|pekniet|zbit|rozbit|odpadl|lata|luzn|nie\s+(?:dziala|reguluj|da\s+sie))|\b(?:urwan|pekniet|rozbit|zbit)\S*\s+lusterk/],
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
function plKinds(v) { const k = new Set(); for (const p of plFold(v).split(/[.,;!?\n]+/)) if (!PL_OK.test(p)) for (const [n, rx, ex] of PL_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); if (k.has('acc')) k.delete('injury'); return k; }



const RO_OK = /reparat|inlocuit|merge\s+din\s+nou|functioneaza\s+din\s+nou|fara\s+problem|totul\s+(?:e\s+)?(?:ok|in\s+regula)/;
const RO_KINDS = [['brake', /\bfran(?:a|e|ele)\s+(?:\S+\s+)?(?:nu\s+(?:mai\s+)?(?:functioneaza|merg|merge|tin|tine|franeaza)|au\s+cedat|slab)|\bnu\s+(?:mai\s+)?franeaza|\b(?:pierde|scade|scapa)\s+(?:\S+\s+)?(?:aer|presiune)/, /mana|parcare|stop|lumin|singur|fara\s+motiv|pern|anvelop|cauciuc|roat/],
  ['fire', /\bincendiu|\b(?:a\s+luat|ia|lua)\s+foc|\bfoc\s+la|\b(?:cabina|motorul|anvelopa|roata|remorca|semiremorca|camionul|masina)\s+(?:\S+\s+)?arde\b|\b(?:iese|ies|vine)\s+fum|\bfum\S*\s+(?:\S+\s+)?(?:din|de\s+la|de\s+sub|iese)|\bmiro(?:s|as)\S*\s+(?:\S+\s+)?(?:de\s+)?(?:ars|arsura|cauciuc\s+ars|cabluri\s+arse)/, /esapament|toba|stingator|martor|bec/],
  ['flat', /\b(?:anvelop|cauciuc|roat)\S*\s+(?:\S+\s+)?(?:a\s+)?(?:explodat|plesnit|spart|dezumflat|pe\s+janta)|\b(?:a\s+)?(?:explodat|plesnit)\s+(?:\S+\s+)?(?:anvelop|cauciuc|roat)|\bpana\s+de\s+(?:cauciuc|roata)|\bam\s+(?:facut|prins)\s+pana/],
  ['steer', /\bvolan\S*\s+(?:\S+\s+)?(?:blocat|greu|are\s+joc|nu\s+(?:merge|se\s+invarte|vireaza))|\bdirecti\S*\s+(?:\S+\s+)?(?:blocat|defect|nu\s+functioneaza|are\s+joc)|\btrage\s+(?:\S+\s+)?(?:dreapta|stanga)/],
  ['leak', /\b(?:ulei|motorina|combustibil|lichid|antigel|adblue)\S*\s+(?:\S+\s+)?(?:curge|picura|se\s+scurge)|\b(?:curge|picura|pierde|se\s+scurge)\s+(?:\S+\s+)?(?:ulei|motorina|combustibil|lichid|antigel|adblue)|\bscurgere\s+de/],
  ['acc', /\b(?:am\s+(?:avut|facut)|s-a\s+produs)\s+(?:\S+\s+)?(?:accident|tamponare)|\baccident\b|\btampona|\bam\s+(?:lovit|atins|zgariat|agatat)|\bm-a\s+lovit/, /piatr|pietricic/],
  ['injury', /\branit[ia]?\b|\bambulant/],
  ['parkbrake', /\bfran\S*\s+de\s+(?:mana|parcare)\s+(?:\S+\s+)?(?:nu\s+(?:tine|functioneaza|se\s+elibereaza)|defect|blocat)|\b(?:camionul|masina|remorca|semiremorca|tractorul)\s+(?:\S+\s+)?(?:a\s+luat-o\s+la\s+vale|a\s+plecat\s+singur)/],
  ['nostart', /\b(?:motorul|camionul|masina|tractorul)\s+(?:\S+\s+)?nu\s+(?:mai\s+)?(?:porneste|vrea\s+sa\s+porneasca)|\bdemaror\S*\s+(?:\S+\s+)?nu\s+(?:merge|functioneaza)|\bnu\s+pot\s+sa\s+pornesc/],
  ['mirror', /\boglind\S*\s+(?:\S+\s+)?(?:rupt|spart|crapat|cazut|atarna|nu\s+se\s+regleaza)/],
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
function roKinds(v) { const k = new Set(); for (const p of roFold(v).split(/[.,;!?\n]+/)) if (!RO_OK.test(p)) for (const [n, rx, ex] of RO_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); if (k.has('acc')) k.delete('injury'); return k; }



const HR_OK = /poprav|zamijenj|zamenj|promijenj|promenj|opet\s+radi|ponovo\s+radi|nema\s+problem|sve\s+(?:ok|u\s+redu)/;
const HR_KINDS = [['brake', /\bkocnic\S*\s+(?:\S+\s+)?(?:ne\s+(?:rade|radi|koce|drze|drzi)|slab|otkazal|popustil)|\b(?:slabo|ne)\s+koci|\b(?:pada|gubi|nestaje)\s+(?:\S+\s+)?(?:pritisak|zrak|vazduh)/, /rucn|parkirn|svjetl|svetl|stop|asistent|sam\s+od\s+sebe|bez\s+razloga|gum|jastuk|mijeh|\bmeh/],
  ['fire', /\bpozar|\b(?:gori|zapalio\s+se|zapalila\s+se|zapalilo\s+se)\b|\bizlazi\s+dim|\bdim\S*\s+(?:\S+\s+)?(?:iz|ispod|izlazi|kulja)|\b(?:mirise|smrdi|miris|smrad)\S*\s+(?:\S+\s+)?(?:na\s+)?(?:izgoren|paljevin|spaljen|zagoren)/, /auspuh|izduv|aparat|gasenj|lampic|sijalic|pregorj/],
  ['flat', /\b(?:gum\S*|pneumati\S*)\s+(?:\S+\s+)?(?:pukl|puknut|probusen|eksplod|prazn|ispust)|\b(?:pukl|eksplodiral)\S*\s+(?:\S+\s+){0,2}gum/],
  ['steer', /\bvolan\S*\s+(?:\S+\s+)?(?:blokiran|zakljucan|tezak|tesko|ima\s+(?:zazor|luft)|ne\s+(?:okrece|radi))|\bvuce\s+(?:\S+\s+)?(?:desno|lijevo|levo)/],
  ['leak', /\b(?:ulj|goriv|naft|dizel|tecnost|tekucin|antifriz|adblue)\S*\s+(?:\S+\s+)?(?:curi|kapa|cure|ide\s+van)|\b(?:curi|kapa|gubi)\s+(?:\S+\s+)?(?:ulj|goriv|naft|dizel|tecnost|tekucin|antifriz|adblue)/],
  ['acc', /\b(?:imao|imala|imali)\s+(?:sam\s+|smo\s+)?(?:\S+\s+)?(?:nesrec|sudar|udes)|\bnesreca|\bsudar|\budes\b|\b(?:udario|udarila|lupio|ogrebao|okrznuo|zakacio)\b|\budario\s+me/, /kamen/],
  ['injury', /\b(?:povrijed|povred|ozlijed|ozled)\S*|\bhitn\S*\s+pomoc|\bambulant/],
  ['parkbrake', /\brucn\S*\s+(?:kocnic\S*\s+)?(?:\S+\s+)?(?:ne\s+(?:drzi|radi|otpusta)|pokvaren|zaglavil)|\b(?:kamion|auto|prikolica|tegljac)\S*\s+(?:se\s+)?(?:otkotrlja|sam\s+krenu)/],
  ['nostart', /\b(?:motor|kamion|auto|tegljac)\S*\s+(?:\S+\s+)?(?:ne\s+(?:pali|upaljuje|vata)|nece\s+(?:da\s+)?(?:upali|pali))|\banlaser\S*\s+(?:\S+\s+)?ne\s+radi/],
  ['mirror', /\b(?:retrovizor|ogledal|retrovizer)\S*\s+(?:\S+\s+)?(?:slomljen|otpa|puk|razbijen|visi|ne\s+(?:radi|podesava))/],
  ['lights', /\b(?:svjetl|svetl|far\b|farovi|zmigavac|migavac|sijalic|lamp[ae]\b|stop\s+svjetl|stop\s+svetl)\S*\s+(?:\S+\s+)?(?:ne\s+(?:rade|radi|svijetl|svetl|gori|gore)|pregorj|pregorel|razbijen)|\bpregorj\S*\s+(?:\S+\s+)?sijalic/, /lampic|kontroln/],
  ['warnlight', /\b(?:lampic|kontroln\S*\s+lamp)\S*\s+(?:\S+\s+)?(?:svijetli|svetli|gori|upalil|trepc|treperi)|\bupalil\S*\s+(?:se\s+)?(?:\S+\s+)?lampic/],
  ['glass', /\b(?:vjetrobran|vetrobran|sofersajbn|staklo|stakla)\S*\s+(?:\S+\s+)?(?:pukl|puknut|napukl|razbijen|ostecen)|\b(?:pukl|napukl|razbijen)\S*\s+(?:\S+\s+)?(?:vjetrobran|vetrobran|sofersajbn|staklo)/, /retrovizor|ogledal|kamen\s+udario|udario\s+kamen/],
  ['window', /\b(?:prozor|staklo)\S*\s+(?:\S+\s+)?(?:se\s+)?ne\s+(?:spusta|podize|otvara|zatvara)/],
  ['batt', /\b(?:akumulator|aku)\S*\s+(?:\S+\s+)?(?:prazan|ispraznj|crkao|slab|ne\s+puni|ne\s+drzi)/],
  ['tacho', /\btahograf\S*\s+(?:\S+\s+)?(?:ne\s+(?:radi|cita)|greska|kvar)|\bkartic\S*\s+(?:vozaca\s+)?(?:\S+\s+)?(?:ne\s+(?:cita|radi|izlazi)|izgubljen|ukraden|ostecen|zaglavil)|\bizgubio\s+(?:sam\s+)?karticu/],
  ['coupling', /\b(?:prikolic|poluprikolic)\S*\s+(?:\S+\s+)?(?:se\s+)?(?:ne\s+(?:kaci|zakaci|otkaci|spaja)|otkacil|odvojil)|\bsedl\S*\s+(?:\S+\s+)?(?:ne\s+(?:zatvara|zakljucava|otvara)|pokvaren|kvar)/],
  ['dryfuel', /\b(?:nestalo|ostao\s+sam\s+bez|nemam\s+vise)\s+(?:\S+\s+)?(?:goriva|nafte|dizela)/, /agregat|hladnja|frigo/],
  ['engine', /\bmotor\S*\s+(?:\S+\s+)?(?:se\s+)?(?:pregrija|pregreva|kuha|nema\s+snag|gubi\s+snag|gasi|ugasio|trza)|\bhavarijsk|\bgubi\s+snagu/],
  ['tyre', /\bgum\S*\s+(?:\S+\s+)?(?:ostecen|posjecen|isjecen|istrosen|celav|ima\s+balon|gubi\s+(?:zrak|vazduh)|malo\s+(?:zraka|vazduha))/, /pukl|puknut/],
  ['reefer', /\b(?:agregat|hladnja|frigo|thermo\s*king|carrier)\S*\s+(?:\S+\s+)?(?:ne\s+(?:hladi|radi|pali)|alarm|greska|kvar|stao|ugasio)/],
  ['susp', /\b(?:jastuk|mijeh|meh)\S*\s+(?:\S+\s+)?(?:puk|pusta|ispust|ostecen)|\b(?:ogibljenj|vjesanj|vesanj)\S*\s+(?:\S+\s+)?(?:ne\s+radi|kvar|pokvaren)|\b(?:prikolica|kamion|tegljac)\s+(?:\S+\s+)?(?:nakrivljen|nagnut|spustil)/],
  ['gear', /\bbrzin\S*\s+(?:\S+\s+)?ne\s+(?:ulazi|ulaze)|\b(?:mjenjac|menjac)\S*\s+(?:\S+\s+)?(?:greska|kvar|ne\s+radi)|\bkvacil\S*\s+(?:\S+\s+)?(?:proklizava|ne\s+radi|izgorj|izgorel)/],
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
function hrKinds(v) { const k = new Set(); for (const p of hrFold(v).split(/[.,;!?\n]+/)) if (!HR_OK.test(p)) for (const [n, rx, ex] of HR_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); if (k.has('acc')) k.delete('injury'); return k; }



const HU_OK = /\b(?:meg|ki)?javit(?:va|ottak|ottam|otta|ottuk)\b|\bki\s*cserel(?:tek|tuk|tem|ve|te)\b|\bcserel(?:ve|tek|tuk)\b|\bujra\s+(?:mukodik|jo)\b|\bmar\s+(?:jo|mukodik|rendben)\b|\bminden\s+rendben|\bnincs\s+(?:semmi\s+)?(?:gond|baj|problema)|\bmegoldva/;
const HU_KINDS = [['brake', /\bfek(?:ek|et|nek|rendszer\S*|betet\S*|tarcs\S*)?\s+(?:\S+\s+)?(?:nem\s+(?:mukodik|mukodnek|fog|fognak)|gyenge|gyengen|elromlott|rossz|tonkrement)|\b(?:nem|gyengen|rosszul)\s+fekez|\bnem\s+fog(?:nak)?\s+(?:a\s+)?fek|\b(?:esik|csokken|elmegy|szokik)\s+(?:a\s+)?(?:\S+\s+)?(?:levego|legnyomas|nyomas)/, /kezifek|rogzitofek|feklamp|magatol|ok\s+nelkul|gumi|abroncs|legrugo|harang/],
  ['fire', /\btuz\s+(?:van|utott\s+ki)|\btuzet\b|\btuzben\b|\bkigyullad|\beg\s+a\s+(?:kabin|motor|kamion|potkocsi|rakomany)\b|\bfust\S*\s+(?:\S+\s+)?(?:jon|szall|gomolyog)|\bfustol|\beget\S*\s+szag|\bszag\S*\s+(?:\S+\s+)?eget/, /kipufog|porolto|tuzolto|lampa|izzo|visszajelz|hibalamp/],
  ['flat', /\bdefekt(?:et|em|unk)\b|\bdefekt\s+(?:van|lett|kaptam)\b|\b(?:gumi|abroncs)\S*\s+(?:\S+\s+)?(?:kidurrant|kilyukadt|lyukas|durrant|szetrobbant|felrobbant|lapos|leeresztett|leengedett)|\b(?:kidurrant|kilyukadt|szetrobbant|felrobbant|lapos|leeresztett)\s+(?:\S+\s+){0,2}(?:gumi|abroncs)/, /harang|legrugo/],
  ['steer', /\bkormany\S*\s+(?:\S+\s+)?(?:beragadt|blokkol|zarol|nehez|nem\s+(?:fordul|mukodik)|kotyog|holtjatek)|\b(?:beragadt|blokkolt|nehez)\s+(?:a\s+)?kormany|\bhuz\s+(?:\S+\s+)?(?:jobbra|balra)/],
  ['leak', /\b(?:olaj|uzemanyag|gazolaj|dizel|diesel|hutoviz|hutofolyadek|folyadek|fagyallo|adblue)\S*\s+(?:\S+\s+)?(?:folyik|csopog|szivarog|ereszt)|\b(?:folyik|csopog|szivarog|ereszt)\s+(?:az?\s+)?(?:\S+\s+)?(?:olaj|uzemanyag|gazolaj|dizel|hutoviz|folyadek|fagyallo|adblue)/],
  ['acc', /\bbaleset|\butkoz|\bosszeutkoz|\bnekimen|\bnekem\s+jott|\bbelem\s+jott|\bkoccan|\bmeghuztam\b|\bsurolt/, /\bko\b|kavics/],
  ['injury', /\bmegserultem\b|\bmegsebesul|\bmento(?:t|k|hoz)?\b|\bkorhaz|\bverzik|\bvereztem|\beltort\s+a\s+(?:lab|kez|kar|bord)/],
  ['parkbrake', /\b(?:kezifek|rogzitofek)\S*\s+(?:\S+\s+)?(?:nem\s+(?:fog|tart|mukodik|old|enged)|elromlott|beragadt)|\belgurult/],
  ['nostart', /\b(?:motor|kamion|auto|vontato)\S*\s+(?:\S+\s+)?nem\s+(?:indul|akar\s+(?:be)?indulni)|\bnem\s+(?:akar\s+)?(?:be)?indul(?:ni)?\b|\bonindito\S*\s+(?:\S+\s+)?(?:nem\s+mukodik|rossz|elromlott)/, /huto|agregat|aggregat|klima|futes|webasto|lift|hatfal/],
  ['mirror', /\b(?:tukor|tukr|visszapillanto)\S*\s+(?:\S+\s+)?(?:letort|eltort|kitort|betort|torott|log|leszakadt|nem\s+(?:allithato|mukodik))|\b(?:letort|eltort|kitort|leszakadt)\s+(?:a\s+)?(?:\S+\s+)?(?:tukor|visszapillanto)/],
  ['lights', /\b(?:lampa|lampak|fenyszoro|vilagitas|izzo|index|helyzetjelzo|feklampa|tolatolampa|reflektor)\S*\s+(?:\S+\s+)?(?:nem\s+(?:vilagit|eg|egnek|mukodik|mukodnek)|kieg|torott|eltort|kitort)|\bkieg\S*\s+(?:az?\s+)?(?:\S+\s+)?(?:izzo|lampa)/, /visszajelz|kontroll|muszerfal|hibalamp/],
  ['warnlight', /\b(?:visszajelz|hibalamp|motorhibalamp|figyelmeztet)\S*\s+(?:\S+\s+)?(?:vilagit|eg|kigyulladt|felgyulladt|villog)\b|\b(?:kigyulladt|felgyulladt|vilagit|villog)\s+(?:az?\s+|egy\s+)?(?:\S+\s+)?(?:visszajelz|hibalamp)|\b(?:motor|olaj|akkumulator|abs|ebs)\s*(?:hiba)?\s*lamp\S*\s+(?:\S+\s+)?(?:vilagit|eg|villog)\b|\b(?:vilagit|eg|villog)\s+(?:a\s+)?(?:motor|olaj|akkumulator|abs|ebs)\s*(?:hiba)?\s*lamp/],
  ['glass', /\b(?:szelvedo|uveg)\S*\s+(?:\S+\s+)?(?:megreped|reped|betort|kitort|eltort|torott|csillag)|\b(?:megreped|reped|betort|kitort|eltort|torott)\S*\s+(?:az?\s+)?(?:\S+\s+)?(?:szelvedo|uveg)/, /tukor|tukr|visszapillanto/],
  ['window', /\b(?:ablak(?:ot|om)?|ablakemelo\S*)\s+(?:\S+\s+)?(?:nem\s+(?:megy|mukodik|nyilik|zarodik)|beragadt)/],
  ['batt', /\b(?:akkumulator|akku)\S*\s+(?:\S+\s+)?(?:lemerult|le\s+van\s+merulve|gyenge|nem\s+tolt)|\blemerult\s+(?:az?\s+)?akku/, /lamp|visszajelz/],
  ['tacho', /\b(?:tachograf|menetiro)\S*\s+(?:\S+\s+)?(?:nem\s+(?:mukodik|olvas)|hiba|hibas|elromlott)|\b(?:sofor)?kartya\S*\s+(?:\S+\s+)?(?:nem\s+(?:olvas|mukodik|jon\s+ki)|beragadt|elveszett|ellopt|serult|torott)|\belvesztettem\s+(?:a\s+)?(?:sofor)?kartya/, /tank|\bkut|uzemanyag/],
  ['coupling', /\b(?:potkocsi|felpotkocsi)\S*\s+(?:\S+\s+)?(?:nem\s+(?:kapcsol|csatlakozik|akaszthato)|lekapcsolod|levalt|leszakadt)|\bnyereg\S*\s+(?:\S+\s+)?(?:nem\s+(?:zar|nyit|kapcsol)|elromlott|hibas|beragadt)/],
  ['dryfuel', /\b(?:kifogyott|elfogyott|nincs\s+(?:tobb|mar))\s+(?:az?\s+)?(?:\S+\s+)?(?:uzemanyag|gazolaj|dizel|diesel)|\b(?:uzemanyag|gazolaj|dizel)\S*\s+(?:\S+\s+)?(?:kifogyott|elfogyott)/, /huto|agregat|aggregat|adblue/],
  ['engine', /\bmotor\S*\s+(?:\S+\s+)?(?:tulmeleg|forr|nincs\s+ereje|lefullad|leall|rangat|kihagy)|\btulmeleged|\bveszuzem|\bnincs\s+ereje|\bteljesitmeny\S*\s+(?:\S+\s+)?(?:esik|veszt|csokken)/, /huto(?:agregat|aggregat|gep)|\bfek|kerek|csapagy/],
  ['tyre', /\b(?:gumi|abroncs)\S*\s+(?:\S+\s+)?(?:serult|vagott|elvagott|kopott|lekopott|bubor|pup|ereszt|levegot\s+veszit|szakadt|repedt)|\bgumi\S*\s+(?:\S+\s+)?(?:keves|alacsony)\s+(?:a\s+)?(?:levego|nyomas)/, /kidurr|kilyukad|szetrobban|lapos|defekt|harang|legrugo/],
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
function huKinds(v) { const k = new Set(); for (const p of huFold(v).split(/[.,;!?\n]+/)) if (!HU_OK.test(p)) for (const [n, rx, ex] of HU_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); if (k.has('acc')) k.delete('injury'); return k; }



const CS_OK = /\bopraven|\bvymenen|\bvymenil|\bfunguje\s+(?:uz|zase|opet|znova|znovu)\b|\b(?:uz|zase|opet|znova|znovu)\s+funguje\b|\b(?:je|vse|vsetko|vsechno)\s+(?:v\s+poradku|v\s+poriadku|ok)\b|\bbez\s+problem/;
const CS_KINDS = [['brake', /\bbrzd\S*\s+(?:\S+\s+)?(?:nefunguj|nebrzd|nedrz|slab|selhal|zlyhal|povolil)|\bnebrzd|\bslabo\s+brzd|\b(?:pada|klesa|unika)\s+(?:\S+\s+)?tlak|\bunika\s+vzduch/, /rucn|parkovac|svetl|stop|asistent|\bsam[ao]?\b|bez\s+d[uo]vodu|pneu|gum|\bmech|vankus|\bvak/],
  ['fire', /\bpozar|\b(?:hori|horet|vzplanul\S*)\b|\b(?:kour|dym)\S*\s+(?:\S+\s+)?(?:z|zpod|spod|ide|jde|vychadz\S*|vychaz\S*|stoupa)\b|\b(?:jde|ide|vychazi|vychadza|stoupa|vali)\s+(?:\S+\s+)?(?:kour|dym)|\b(?:smrdi|pachne|citim|cit)\S*\s+(?:\S+\s+)?(?:spalen|horen)/, /vyfuk|wydech|vyhlop|auspuh|egzoz|esapament|kipufog|hasic|hasiac|zarovk|ziarovk|kontrolk/],
  ['flat', /\b(?:pichl|pichol)\S*|\b(?:pneu\S*|gum[ay]\b)\s+(?:\S+\s+)?(?:prask|pichl|pichnut|prazdn|splask|vybuchl|roztrh)|\b(?:prask|vybuchl|roztrh|splasl)\S*\s+(?:\S+\s+){0,2}(?:pneu|gum)|\bmam[e]?\s+defekt|\bdefekt\s+(?:na\s+)?(?:pneu|kole)/, /\bmech|\bvak|placht|sterac|stierac/],
  ['steer', /\bvolant\S*\s+(?:\S+\s+)?(?:zablokov|zasek|tezk|tazk|ma\s+vul|nejde|nefunguj)|\b(?:tahne|taha)\s+(?:\S+\s+)?(?:doprava|doleva|vpravo|vlevo|vlavo)/],
  ['leak', /\b(?:olej|naft|palivo|paliva|chladic|chladiac|kapalin|kvapalin|nemrz|adblue|diesel)\S*\s+(?:\S+\s+)?(?:tece|tecie|kape|kvapka|unika|vytek|vytiek)|\b(?:tece|tecie|kape|kvapka|unika|vytek|vytiek)\S*\s+(?:\S+\s+)?(?:olej|naft|palivo|chladic|chladiac|kapalin|kvapalin|nemrz|adblue)/],
  ['acc', /\bnehod|\bhavar|\bsrazk|\bzrazk|\bnaboural|\bnabural|\bnarazil|\bodrel|\bvrazil/, /rezim|kamen|kamienk|kaminek/],
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
function csKinds(v) { const k = new Set(); for (const p of csFold(v).split(/[.,;!?\n]+/)) if (!CS_OK.test(p)) for (const [n, rx, ex] of CS_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); if (k.has('acc')) k.delete('injury'); return k; }




const BG_OK = /\bremontiran|\bopraven|\bsmen|\bzamen|\braboti\s+(?:otnovo|pak|normalno)|\b(?:otnovo|pak|veche)\s+raboti\b|\bvsichko\s+e\s+(?:nared|ok|v\s+red)|\b(?:nyama|bez)\s+problem/;
const BG_KINDS = [['brake', /\bspirach\S*\s+(?:\S+\s+){0,2}(?:ne\s+(?:rabot|deystv|darzh|spir|hvasht)|slab|otkaz)|\bne\s+spira\b|\b(?:spada|pada|namalya)\S*\s+(?:\S+\s+)?nalyagan|\b(?:izpuska|puska|byaga)\s+(?:\S+\s+)?vazduh/, /rachn|parking|stop|svetl|asistent|\bsam[ao]?\b|bez\s+prichina|gum|vazglavnits/],
  ['fire', /\bpozhar|\b(?:gori|goryat|zapali\s+se|plamna)\b|\bdim\S*\s+(?:\S+\s+)?(?:ot|izpod|izliza|vliza)\b|\b(?:izliza|vliza|ima|vali)\s+(?:\S+\s+)?dim\b|\bmirishe\s+(?:\S+\s+)?(?:na\s+)?(?:izgor|parlen)/, /auspuh|izpuskatel|vyhlop|wydech|egzoz|esapament|kipufog|vyfuk|pozharogasit|pozharsk|krushk|lamp|\bfar|gabarit|svetl|protivotuman|ne\s+gor/],
  ['flat', /\bspukah\b|\bspukan\S*\s+gum|\bgum\S*\s+(?:\S+\s+)?(?:se\s+)?(?:spuka|izbuhna|pukna|eksplodira|prazn)|\b(?:spuka|izbuhna|pukna)\S*\s+(?:mi\s+)?(?:\S+\s+)?gum/, /vazglavnits|chistachk/],
  ['steer', /\bvolan\S*\s+(?:\S+\s+)?(?:blokir|zaklyuch|zaseda|zasyada|tezhak|tezhko|ne\s+se\s+varti|ima\s+lyuft)|\b(?:tegli|darpa)\s+(?:\S+\s+)?(?:nadyasno|nalyavo|vdyasno|vlyavo)/],
  ['leak', /\b(?:maslo\S*|nafta\S*|gorivo\S*|antifriz\S*|ohladitel\S*|technost\S*|adblue|dizel\S*|hidravlik\S*)\s+(?:\S+\s+)?(?:teche|kape|izticha|tekat|kapyat)|\b(?:teche|kape|izticha|tekat|kapyat|izteche)\S*\s+(?:\S+\s+)?(?:maslo|nafta|gorivo|antifriz|ohladitel|technost|adblue|dizel|hidravlik)/, /\bne\s+(?:tech|tek|kap|izticha)/],
  ['acc', /\bkatastrof|\bblasna|\bpatnotransportno|\bptp\b|\bsblasa|\budari\S*\s+(?:me|ni|kamiona|remarketo)\b/, /kamache|kamak/],
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
  ['reefer', /\b(?:agregat|hladiln\S*\s+agregat|hladiln\S*\s+ustroystvo)\S*\s+(?:\S+\s+)?(?:ne\s+(?:ohlazhda|raboti|varvi|pali)\b|alarma|greshka|avariya)|\balarm\S*\s+(?:na\s+)?(?:hladil|agregat)/],
  ['susp', /\b(?:vazdushn\S*\s+)?(?:vazglavnits|mehov)\S*\s+(?:\S+\s+)?(?:se\s+)?(?:spuka|pukna|puska|izpuska|povred|skasa)|\b(?:remarke|poluremarke|kamion|vlekach|kabina)\S*\s+(?:\S+\s+)?(?:se\s+)?(?:naklanya|nakloni|klyumna)|\bokachvane\S*\s+(?:\S+\s+)?(?:ne\s+raboti|greshk|povred)/],
  ['gear', /\bne\s+(?:vliza|vlizat|se\s+vklyuchva)\s+(?:\S+\s+)?skorost|\bskorost\S*\s+(?:\S+\s+)?(?:ne\s+(?:vliza|vlizat|se\s+vklyuchva)|izbiva|izkachat)|\bskorostn\S*\s+kutiya\S*\s+(?:\S+\s+)?(?:greshk|avariya|ne\s+raboti|blokir|zaseda)|\bsaedinitel\S*\s+(?:\S+\s+)?(?:buksuva|prihlazva|ne\s+raboti|izgorya)/],
  ['climate', /\b(?:klimati\S*|klima|parno\S*|pechk\S*|otoplen\S*|webasto|vebasto)\s+(?:\S+\s+)?(?:ne\s+(?:raboti|topli|gree|ohlazhda|duha|pali)\b|greshk|avariya)/, /sedalk|podgryav/],
  ['tarp', /\bbrezent\S*\s+(?:\S+\s+)?(?:skasan|skasa|razkasan|dupk|povred|sryazan)|\bdupk\S*\s+(?:\S+\s+)?(?:v\s+|na\s+)?brezent|\b(?:pokrivalo|shtora|shtori)\S*\s+(?:\S+\s+)?(?:skasan|skasa|razkasan|sryazan)/],
  ['exhaust', /\bauspuh\S*\s+(?:\S+\s+)?(?:padna|padnal|visi|otpadna|dupk|pukna|puknat|schupen)/],
  ['visib', /\bchistachk\S*\s+(?:\S+\s+)?(?:ne\s+(?:rabot|chist)|schupen|schupi|otchupi|padna)|\bstaklo\S*\s+(?:\S+\s+)?(?:se\s+)?(?:zapotyava|zamaglya|zapoti)/, /sedalk|podgryav/],
  ['seat', /\b(?:predpazen\S*\s+)?kolan\S*\s+(?:\S+\s+)?(?:ne\s+(?:zakopchava|se\s+zakopchava|darzhi|raboti|izliza)|skasan|zaseda|zasedna)|\bsedalk\S*\s+(?:\S+\s+)?(?:schupen|schupi|ne\s+(?:raboti|se\s+regulira)|klati)/, /podgryav|otoplen/],
  ['wheel', /\b(?:bolt|gayk|shpilk)\S*\s+(?:\S+\s+){0,3}(?:razhlab|razvi|lipsv|padna|otpadna)|\bdzhant\S*\s+(?:\S+\s+)?(?:pukn|izkrivi|schup)|\b(?:glavin|lager|kolel)\S*\s+(?:\S+\s+)?(?:pregrya|goresht|byuchi|tropa|klati)/, /spirach/],
  ['stuck', /\b(?:zasednah|zasedna|zatanah|zatana)\S*\s+(?:\S+\s+){0,3}(?:kal\S*|sn[ye]g\S*|pyasa\S*)/],
  ['lost', /\b(?:zagubih|izgubih)\s+(?:si\s+)?(?:\S+\s+)?(?:klyuch|talon)|\bklyuch\S*\s+(?:\S+\s+)?(?:izguben|zaguben|lipsv)|\bne\s+moga\s+da\s+namerya\s+(?:\S+\s+)?klyuch/],
  ['numplate', /\b(?:registratsion\S*\s+(?:nomer|tabel)\S*|nomer\S*\s+tabel\S*|tabel\S*\s+s\s+nomer\S*|nomerat|nomera)\s+(?:\S+\s+)?(?:padna|padnal|izgub|lipsva|otkradn|schupen|ne\s+se\s+chete)/, /osvetl|svetl|krushk/],
  ['adas', /\b(?:asistent|radar|senzor|datchik|kamera|tempomat)\S*\s+(?:\S+\s+){0,3}(?:ne\s+raboti|greshk|izklyuchi|otkaz)|\bspira\s+(?:\S+\s+)?(?:sam\b|bez\s+prichina)/],
  ['door', /\bvrat\S*\s+(?:\S+\s+)?(?:ne\s+se\s+(?:zatvarya|otvarya|zaklyuchva)|zaseda|zasedna|blokir)|\b(?:(?:padasht|podemn|hidravlich)\S*\s+)?bord\S*\s+(?:\S+\s+)?(?:ne\s+(?:raboti|se\s+vdiga|se\s+spuska)|greshk|avariya)/, /prozor/]];
const BG_TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sht', ъ: 'a', ь: 'y', ю: 'yu', я: 'ya', ѝ: 'i' };
const bgFold = (s) => String(s || '').toLowerCase().replace(/[а-яѝ]/g, (c) => BG_TR[c] || c);
function bgKinds(v) { const k = new Set(); for (const p of bgFold(v).split(/[.,;!?\n]+/)) if (!BG_OK.test(p)) for (const [n, rx, ex] of BG_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); if (k.has('acc')) k.delete('injury'); return k; }
const LT_OK = /\bsutais|\bpatais|\bpakeist|\bpakeite|\b(?:jau|vel)\s+veikia\b|\bveikia\s+(?:jau|vel|normaliai)\b|\bviskas\s+(?:gerai|tvarkoje)|\bbe\s+problem/;
const LT_KINDS = [['brake', /\bstabd\S*\s+(?:\S+\s+)?(?:neveik|nestabd|silpn|nelaiko|sugedo|dingo)|\bnestabd|\bsilpn\S*\s+stabd|\b(?:krenta|krinta|mazeja|dingsta|dingo)\s+(?:\S+\s+)?(?:oro\s+)?slegis|\boro\s+slegis\s+(?:\S+\s+)?(?:krenta|krinta|mazeja)|\b(?:pucia|leidzia|isleidzia)\s+ora\b/, /rankin|stovejim|zibint|sviesos|asistent|\bpat[si]\b|savaime|priezast|padang|pagalv|kortel/],
  ['fire', /\bgaisr|\buzsiliepsn|\buzsideg\S*\s+(?:\S+\s+)?(?:kabin|varikl|ratas|padang|sunkvezim|vilkik|priekab|laid)|\b(?:kabin\S*|varikl\S*|ratas|padang\S*|sunkvezim\S*|vilkik\S*|priekab\S*|laidai)\s+(?:\S+\s+)?(?:dega|uzsidege)\b|\bdega\s+(?:kabina|variklis|ratas|padanga|sunkvezimis|vilkikas|priekaba|laidai)\b|\b(?:dumai|dumu|dumija|ruksta|rukst\S*)\b|\bdeges/, /ismetim|duslintuv|vamzd|wydech|vyhlop|auspuh|egzoz|esapament|kipufog|vyfuk|gesintuv|lemput|kontrolin|zibint|sviesa|sviesos/],
  ['flat', /\bpradur\S*|\b(?:sprogo|sprogusi|truko|trukusi|nuleido|nuleista|subliusk\S*|plyso|plysusi)\s+(?:\S+\s+)?padang|\bpadang\S*\s+(?:\S+\s+)?(?:sprogo|truko|nuleido|nuleista|pradurt|plyso|subliusk|tuscia)/, /pagalv|tent|valytuv/],
  ['steer', /\bvair(?:as|a|o|e)\b\s+(?:\S+\s+)?(?:uzstrig|uzsiblokav|uzblokuot|sunkiai|neveik|nesisuka|klib)|\b(?:traukia|tempia|mesta)\s+(?:\S+\s+)?(?:i\s+)?(?:desine|kaire)/],
  ['leak', /\b(?:alyv|tepal|dyzel|kuras\b|kuro\b|antifriz|ausinimo\s+skyst|skyst|adblue|tosol)\S*\s+(?:\S+\s+)?(?:teka|bega|lasa|varva|isbego|istek|prateka)|\b(?:teka|bega|lasa|varva|isbego|istek|prateka)\S*\s+(?:\S+\s+)?(?:alyv|tepal|dyzel|kuras|kuro|antifriz|ausinimo|skyst|adblue)/],
  ['acc', /\bavarij|\bsusidur|\batsitrenk|\bisitrenk|\btrenk[e]?s\b|\btrenkesi|\bkliud|\bapibraiz|\bsudauziau/, /rezim|akmen|akmuo|akmenuk/],
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


async function foreignKinds(v) { return new Set([...trKinds(v), ...plKinds(v), ...roKinds(v), ...hrKinds(v), ...huKinds(v), ...csKinds(v), ...bgKinds(v), ...ltKinds(v)]); }

export { foreignKinds };
