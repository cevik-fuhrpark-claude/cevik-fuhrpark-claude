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


async function foreignKinds(v) { return new Set([...trKinds(v), ...plKinds(v), ...roKinds(v)]); }

export { foreignKinds };
