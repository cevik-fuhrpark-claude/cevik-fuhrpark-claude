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
const TR_NEG = /\b(?:patla|kiril|catla|kop|yirtil|delin|ezil|bozul|sizdir|akit)(?:ma|me)(?:di|mis|yor)\S*|\b(?:inmedi|inmemis|akmiyor|akmadi|sizmiyor|sizmadi)\b/g;
function trKinds(v) { const k = new Set(); for (const p of trFold(v).replace(TR_NEG, ' ').split(/[.,;!?\n]+/)) if (!TR_OK.test(p)) for (const [n, rx, ex] of TR_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); if (k.has('acc')) k.delete('injury'); return k; }



const PL_OK = /naprawi|wymienio|wymienil|juz\s+dziala|bez\s+problem|nie\s+ma\s+problemu|wszystko\s+(?:ok|w\s+porzadku)/;
const PL_KINDS = [['brake', /\bhamul(?:ce|ec|ca|cy|cow)\s+(?:\S+\s+)?(?:nie\s+(?:dziala|trzyma|hamuj)|sie\s+(?:blokuj|zablok|grzej|przegrz)|slab|zawiod|puszcz)|\b(?:slabo|nie|zle)\s+hamuje|\b(?:brak|spada|ucieka|niskie)\s+(?:\S+\s+)?cisnieni\S*\s+(?:w\s+)?(?:powietrz|ukladzie\s+hamulc)/, /swiatl|reczn|postojow|asystent|bez\s+powodu/],
  ['fire', /\bpozar|\bogien|\b(?:kabina|silnik|opona|naczepa|auto|samochod|ciezarowka|kolo)\s+(?:sie\s+)?(?:pali\b|zapalil|zapalila|plonie)|\bpali\s+sie\s+(?:\S+\s+)?(?:kabina|silnik|opona|naczepa|auto|kolo)|\bdym\S*\s+(?:\S+\s+)?(?:leci|idzie|wydobywa|z\s+(?:silnika|kabiny|maski|deski)|spod)|\bdymi\s+sie|\b(?:czuc|smierdzi|zapach)\s+(?:\S+\s+)?(?:spalenizn|spalon|palon)|\bswad\b|\bkabel\S*\s+(?:\S+\s+)?(?:stopil|spalil|przepalil)/, /wydech|tlumik|gasnic|kontrolk|lampk|sprzegl|klock/],
  ['flat', /\b(?:opon\S*|kol[oa]|guma|gume)\s+(?:\S+\s+)?(?:przebit|pekl|wybuchl|wystrzelil|strzelil|eksplod|zeszl|flak|kapc)|\b(?:pekl|wybuchl|wystrzelil|strzelil)\S*\s+(?:\S+\s+)?(?:opon|gum)|\bzlapal\S*\s+(?:\S+\s+)?(?:gume|kapcia|flaka)|\bkapec\b|\bflak\b/],
  ['steer', /\bkierownic\S*\s+(?:\S+\s+)?(?:zablokow|zaciel|ciezk|chodzi\s+ciezko|luz|nie\s+(?:kreci|skreca|dziala))|\bukl\S*\s+kierownicz\S*\s+(?:\S+\s+)?(?:nie\s+dziala|awari)|\b(?:auto|samochod|ciezarowka|ciagnik)\s+(?:\S+\s+)?(?:sciaga|ciagnie)\s+(?:w\s+|na\s+)?(?:prawo|lewo)/],
  ['leak', /\b(?:olej|ropa|ropy|paliwo|plyn|diesel|adblue)\S*\s+(?:\S+\s+)?(?:cieknie|kapie|wycieka|leci|ucieka|sie\s+leje)|\bwyciek\S*\s+(?:\S+\s+)?(?:olej|paliw|ropy|plyn|adblue|diesl)|\b(?:cieknie|kapie|wycieka|leje\s+sie)\s+(?:\S+\s+)?(?:olej|ropa|paliwo|plyn|diesel|adblue)/],
  ['acc', /\b(?:mialem|mielismy|zdarzyl\S*|spowodowal\S*)\s+(?:\S+\s+)?(?:wypadek|kolizj|stluczk)|\bwypadek\b|\bkolizj|\bstluczk|\b(?:uderzyl|walnal|wjechal|najechal|otarl|zarysowal|cofajac\s+uderzyl)\S*/, /kamien|kamyk/],
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
const CS_NEG = /\b(?:neni|nie\s+je|nebol[aoy]?|nebyl[aoy]?|nejsou|nie\s+su)\s+(?:(?:to|je)\s+)?(?:praskl|prasknut|pichl|pichnut|prazdn|splask|vybuchl|roztrh|rozbit|ulomen|utrzen|odtrzen|odtrhnut|poskoz|poskoden)\S*|\bne(?:tece|tecie|kape|unika)\b/g;
function csKinds(v) { const k = new Set(); for (const p of csFold(v).replace(CS_NEG, ' ').split(/[.,;!?\n]+/)) if (!CS_OK.test(p)) for (const [n, rx, ex] of CS_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); if (k.has('acc')) k.delete('injury'); return k; }




const BG_OK = /\bremontiran|\bopraven|\bsmen|\bzamen|\braboti\s+(?:otnovo|pak|normalno)|\b(?:otnovo|pak|veche)\s+raboti\b|\bvsichko\s+e\s+(?:nared|ok|v\s+red)|\b(?:nyama|bez)\s+problem/;
const BG_KINDS = [['brake', /\bspirach\S*\s+(?:\S+\s+){0,2}(?:ne\s+(?:rabot|deystv|darzh|spir|hvasht)|slab|otkaz)|\bne\s+spira\b|\b(?:spada|pada|namalya)\S*\s+(?:\S+\s+)?nalyagan|\b(?:izpuska|puska|byaga)\s+(?:\S+\s+)?vazduh/, /rachn|parking|stop|svetl|asistent|\bsam[ao]?\b|bez\s+prichina|gum|vazglavnits/],
  ['fire', /\bpozhar|\b(?:gori|goryat|zapali\s+se|plamna)\b|\bdim\S*\s+(?:\S+\s+)?(?:ot|izpod|izliza|vliza)\b|\b(?:izliza|vliza|ima|vali)\s+(?:\S+\s+)?dim\b|\bmirishe\s+(?:\S+\s+)?(?:na\s+)?(?:izgor|parlen)/, /auspuh|izpuskatel|vyhlop|wydech|egzoz|esapament|kipufog|vyfuk|pozharogasit|pozharsk|gashe|krushk|lamp|luqk|luck|\bfar|gabarit|svetl|protivotuman|ne\s+gor/],
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

const bgFold = (s) => String(s || '').toLowerCase().replace(/[а-яѝ]/g, (c) => BG_TR[c] || c).replace(/[\u00df-\u024f]/g, 'q');
const BG_NEG = /\bne\s+(?:(?:e|se|sa|beshe|byaha|mi)\s+){0,2}(?:spuka|spukan|izbuhna|pukna|puknat|eksplodira|prazn|schupen|schupi|otchupen|otchupi|padna|tech|kape|izticha)\S*/g;
function bgKinds(v) { const k = new Set(); for (const p of bgFold(v).replace(BG_NEG, ' ').split(/[.,;!?\n]+/)) if (!BG_OK.test(p)) for (const [n, rx, ex] of BG_KINDS) if (rx.test(p) && !(ex && ex.test(p))) k.add(n); if (k.has('acc')) k.delete('injury'); return k; }
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
const LV_OK = /\bsalabo|\bnomain|\bsaremont|\b(?:jau|atkal)\s+(?:darbojas|strada)\b|\b(?:darbojas|strada)\s+(?:atkal|normali)\b|\bviss\s+(?:kartiba|labi)|\bbez\s+problem/;
const LV_KINDS = [['brake', /\bbremz\S*\s+(?:\S+\s+)?(?:nedarboj|nestrada|nebremz|vajas|neietur|atteic|pazud)|\bnebremz|\bvaj\S*\s+bremz|\b(?:krit|samazinas|pazud)\S*\s+(?:\S+\s+)?(?:gaisa\s+)?spiedien|\bspiedien\S*\s+(?:\S+\s+)?(?:krit|samazin)|\b(?:pus|laiz)\s+gaisu\b/, /rokas|stavbremz|luktur|gaism|asistent|\bpat[si]\b|\bpasa\b|iemesl|riep|spilven|avarijas/],
  ['fire', /\bugunsgrek|\baizdeg\S*\s+(?:\S+\s+)?(?:kabin|dzinej|motor|riten|riep|vad|piekab)|\b(?:kabin\S*|dzinej\S*|motor\S*|riten\S*|riep\S*|piekab\S*|vadi)\s+(?:\S+\s+)?deg\b|\bdeg\s+(?:kabine|dzinejs|motors|ritenis|riepa|piekabe|vadi)\b|\b(?:dumi|dumu|kup|kupej\S*)\b|\bdeguma|\bsvilum/, /izputej|slapetaj|wydech|vyhlop|auspuh|egzoz|esapament|kipufog|vyfuk|ismetim|duslintuv|ugunsdzes|lamp|kontrol|luktur|gaism/],
  ['flat', /\bpardur\S*|\b(?:parsprag\S*|plisa|plisusi|sprag\S*|nolaid\S*|nolaist\S*|tuks\S*)\s+(?:\S+\s+)?riep|\briep\S*\s+(?:\S+\s+)?(?:parsprag|plisa|plisusi|nolaid|nolaist|tuks|pardurt|sprag)/, /spilven|tent|slotin/],
  ['steer', /\bstur(?:e|i|es|ei)\b\s+(?:\S+\s+)?(?:iestreg|iestredz|bloket|nobloket|gruti|nedarboj|nestrada|negriez|klib)|\b(?:velk|rauj)\s+(?:\S+\s+)?(?:pa\s+)?(?:labi|kreisi)\b/],
  ['leak', /\b(?:ella|ellu|ellas|dizel|degviel|antifriz|dzesesanas\s+skidr|skidr|adblue)\S*\s+(?:\S+\s+)?(?:tek|pil|sucas|izteceja|noplud)\S*|\b(?:tek|pil|sucas|izteceja|noplud)\S*\s+(?:\S+\s+)?(?:ella|ellu|dizel|degviel|antifriz|dzesesanas|skidr|adblue)/],
  ['acc', /\bavarij|\bsadursm|\bietriec|\bsadur(?:os|as)\b|\batsit(?:os|as)\b|\baizker|\bnoskrap|\bsasit(?:u|a)\s+(?:\S+\s+)?(?:masin|auto|kravas)/, /rezim|akmen|skemb|gaism|signal|zime|trijstur|bremz/],
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
  ['steer', /\bsache\S*\s+(?:\S+\s+)?(?:mdzim|gaiched|ar\s+trial|ver\s+vatrial|luft|kankal)|\b(?:marjvniv|martskhniv)\s+(?:\S+\s+)?(?:miakv|itsev|mikh)/],
  ['leak', /\b(?:zet|satsvav|dizel|antifriz|tosol|adblu|siti)\S*\s+(?:\S+\s+)?(?:zhonav|gamodis|ighvr|gaedin|chamodis)|\bgazhonv|\bzhonav\S*\s+(?:\S+\s+)?(?:zet|satsvav|dizel|antifriz)/],
  ['fire', /\bitsvis\b|\btsetskhl(?!makr)|\bkhandzar(?!satsin)|\bkvaml/, /\b(?:maquch|gamonabolkv|glushitel|vikhlop)/],
  ['acc', /\bavari(?!ul)|\b(?:davejakh|shemejakh|daejakh|shevejakh|gadabrund|gadavbrund)|\bsagzao\s+(?:\S+\s+)?shemtkhvev/],
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
  ['door', /\b(?:kari|karebi|kars|saket|gidrobort|hidrobort)\S*\s+(?:\S+\s+)?(?:(?:ar|ver)\s+(?:iketeb|igheb|vkhsni|vagheb|mushaob|eshveb)|gapuch)/]];

const GE_NEG = /\b(?:ar|ver)\s+(?:aris\s+)?(?:itsv|zhonav|gamod|ighvr|gaskd|daeshv|gaikhvrit|gakhvret|gatqd|gaibzar|daziand|dashav|davejakh|chamovard)\S*/g;
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
  ['steer', uzRx('rul', '@|qattiq\\S*|ogir\\S*|aylanma\\S*|tiqil\\S*|qimirla\\S*|bush\\S*', '\\b(?:ongga|onga|chapga)\\s+(?:\\S+\\s+)?tort(?:yapti|ib|adi|ayapti|moqda)\\S*'), /podushka|xavfsizlik/],
  ['leak', uzRx('moy|maslo|solyarka|salyarka|dizel|yoqilgi|antifriz|tosol|sovutish\\s+suyuq|adblue|gidravlik', 'oq(?:yapti|ayapti|moqda|ib|di|yabdi)\\b|tomchila\\S*|tom(?:yapti|ib)\\b|siz(?:ib|yapti|moqda)\\b|ketyapti|ketib\\s+qolyapti', '\\b(?:oqyapti|oqib\\s+yotibdi)\\s+(?:\\S+\\s+)?(?:moy|solyarka|antifriz|dizel)'), /tugadi|tugab|qolmadi|chiroq|chirog|lampochka/],
  ['fire', uzRx(UZ_FIRE_N, 'yon(?:yapti|ayapti|ib\\s+ket\\S*|ib\\s+qol\\S*|moqda|di)\\b|olov\\S*', '\\byongin\\S*|\\b(?:tutun|dud)\\S*\\s+(?:\\S+\\s+)?(?:chiq|ket)\\S*|\\bolov\\s+(?:\\S+\\s+)?(?:chiq|ol)\\S*|\\bot\\s+ket(?:di|ib)\\b'), /glushitel|glushak|vyxlop|vixlop|truba|ochirgich|ognetush|chiro|lampochka|indikator|check|chek|panel|sigaret|chiqma/],
  ['acc', /\bavariya(?:ga|da|ni|si)?\s+(?:\S+\s+)?(?:uchradi|uchradim|uchradik|boldi|bolib|qildim|chiqdi)\b|\btoqnash\S*|\buril(?:di|dim|dik|ib)\b|\burib\s+(?:oldi|oldim|yubordim|ketdim|ketdi)\b|\btegib\s+ket(?:dim|di)\b/, /\btosh\b|shagal|qum\s+/],
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
  ['steer', azRx('sukan|rul', '@|agir\\S*|berk\\S*|firlanmir\\S*|oynayir\\S*|ilis\\S*', '\\b(?:saga|sola)\\s+(?:\\S+\\s+)?cek(?:ir|ib|di)\\b'), /tehlukesizlik|podus/],
  ['leak', azRx('yag|maslo|solyarka|dizel|yanacaq|antifriz|tosol|soyuducu\\s+maye|adblue|hidravlik|gidravlik', 'ax(?:ir|di|ib|idir)\\b|siz(?:ir|di|ib)\\b|damcila\\S*|damir\\b|tokul(?:ur|ub|du)\\b|gedir\\b', '\\bax(?:ir|ib)\\s+(?:\\S+\\s+)?(?:yag|solyarka|antifriz|dizel)'), /qurtar|bitdi|qalmadi|lampa|isiq|indikator|kart/],
  ['fire', azRx(AZ_FIRE_N, 'yan(?:ir|di|ib\\s+(?:gedir|getdi))\\b|alis(?:di|ib|ir)\\b|od\\s+tut\\S*', '\\byangin\\S*|\\btustu\\S*\\s+(?:\\S+\\s+)?(?:cix|gel)\\S*|\\bod\\s+(?:tutdu|tutub|aldi)\\b|\\balov\\S*'), /egzoz|qlusitel|glusitel|vixlop|vyxlop|truba|sondurucu|ognetus|lampa|isiq|indikator|check|cek|panel|siqaret/],
  ['acc', /\bqeza(?:ya|da|ni|si)?\s+(?:\S+\s+)?(?:dusdum|dusduk|dusdu|oldu|oldum|etdim|etdi|elemisem|eledim)\b|\btoqqus\S*|\bvurdum\b|\bvurdu\b|\bvurub\s+(?:qacdi|getdi)\b|\bdeydim\b|\bcirpil(?:di|dim)\b/, /\bdas\b|cinqil|rejim|\bhava\s+vur/],
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
  ['steer', kzRx('rul|rol(?!ik)', '@|auyr\\S*|qatty\\S*|aynalmay\\S*|kepti\\S*|solqyl\\S*', '\\b(?:onga|solga)\\s+(?:\\S+\\s+)?tart(?:ady|yp|ty)\\b'), /podushka|qauipsizdik/],
  ['leak', kzRx('may|maslo|solyarka|dizel|janarmay|otyn|antifriz|tosol|salqyndatqysh\\s+suyyq|adblue|gidravlik', 'ag(?:yp|ady|ypty)\\b|aqty\\b|tamshyla\\S*|tamyp\\b|syzyp\\b|ketip\\s+jatyr', '\\bagyp\\s+(?:jatyr|tur)\\s+(?:\\S+\\s+)?(?:may|solyarka|antifriz|dizel)'), /bitti|tausyl|qalmady|sham|lampoch|indikator|karta/],
  ['fire', kzRx(KZ_FIRE_N, 'jan(?:yp\\s+(?:jatyr|ketti|tur)|dy|ypty)\\b|ort\\s+(?:shyq|shyg|ald)\\S*|tutin\\S*\\s+(?:\\S+\\s+)?(?:shyg|bur)\\S*', '\\bort\\s+(?:shyq|shyg|ket|ald)\\S*|\\borten\\S*|\\btutin\\S*\\s+(?:\\S+\\s+)?(?:shyg|bur)\\S*'), /glushitel|vyhlop|shygaru|sondirgish|ognetush|sham|lampoch|indikator|check|chek|panel|siga/],
  ['acc', /\b(?:apat|avariya)\S*\s+(?:\S+\s+)?(?:tustim|tustik|tusti|boldy|jasadym|jasadyq)\b|\bsoqtyg\S*|\bsogyp\s+(?:aldym|aldy|kettim|ketti)\b|\bsoqtym\b|\bqagyp\s+(?:aldym|ketti|kettim)\b/, /\btas\b|rejim/],
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
  ['steer', kyRx('rul|rol(?!ik)', '@|oor\\b|oorlap\\S*|katuu\\S*|burulbay\\S*|kyst\\S*|solkul\\S*', '\\b(?:ongo|solgo)\\s+(?:\\S+\\s+)?tart(?:at|yp|ty)\\S*'), /podushka|koopsuzduk/],
  ['leak', kyRx('may|maslo|solyarka|dizel|antifriz|tosol|adblue|gidravlik', 'ag(?:yp|at|ypty)\\S*|akty\\b|tamchyla\\S*|tamyp\\b|syzyp\\b|ketip\\s+jatat', '\\bagyp\\s+(?:jatat|turat)\\s+(?:\\S+\\s+)?(?:may|solyarka|antifriz|dizel)'), /buttu|tugon|kalbady|chyra[kg]|lampoch|indikator|karta/],
  ['fire', kyRx(KY_FIRE_N, 'kuyup\\s+(?:jatat|ketti|tur)\\S*|kuydu\\b|ort\\s+(?:chyk|chyg|ald)\\S*|tutun\\S*\\s+(?:\\S+\\s+)?(?:chyg|chyk|burk)\\S*', '\\bort\\s+(?:chyk|chyg|ket|ald)\\S*|\\bortton\\S*|\\btutun\\S*\\s+(?:\\S+\\s+)?(?:chyg|chyk|burk)\\S*'), /glushitel|vyhlop|chygaruuchu|ochurguch|ognetush|chyra[kg]|lampoch|indikator|check|chek|panel|sigaret|kubaty|jarygy/],
  ['acc', /\bavari(?:ya|ia)\S*\s+(?:\S+\s+)?(?:boldu|kyldym|kyldyk|jasadym|tushtum|kabyld\S*)\b|\bkyrsyk\S*\s+(?:\S+\s+)?(?:boldu|kabyld\S*|tushtum)\b|\bkagyp\s+(?:aldym|aldy|kettim|ketti)\b|\burunup\s+(?:aldym|aldy|kettim|ketti)\b|\bsuzup\s+(?:aldym|aldy)\b/, /\btash\b|rejim/],
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
  ['steer', tjRx('rul', `@|vaznin\\S*|${TJ_NOT}gard\\S*|bozi\\s+dor\\S*|melarz\\S*|larzid\\S*`, '\\b(?:moshin|mashin)\\S*\\s+(?:\\S+\\s+)?(?:ba\\s+)?(?:tarafi\\s+)?(?:rost|chap)\\s+mekash\\S*'), /podushka|bolisht|behatar/],
  ['leak', tjRx('ravgan|maslo|solyarka|dizel|antifriz|tosol|adblue|gidravlik', 'merez\\S*|rehta\\s+istod\\S*|chakid\\S*|mechak\\S*|tarovish\\S*', '\\bmerezad\\s+(?:\\S+\\s+)?(?:ravgan|solyarka|antifriz|dizel)'), /tamom|holi\s+shud|namond|charog|chirog|lampoch|indikator|k[ao]rt/],
  ['fire', tjRx(TJ_FIRE_N, 'mesuz\\S*|suht\\b|suhta\\s+(?:istod|ravad)\\S*|otash\\s+girift\\S*|dud\\s+(?:mebaro|baromad)\\S*', '\\botash\\s+girift\\S*|\\bsuhtor\\S*|\\bdud\\S*\\s+(?:\\S+\\s+)?(?:mebaro|baromad)\\S*'), /glushitel|vyhlop|lulai\s+dud|ognetush|charog|chirog|lampoch|indikator|check|chek|panel|sigaret|tamoku/],
  ['acc', /\bsadama\S*\s+(?:\S+\s+)?(?:shud|shudam|shudem|kardam|kard|dochor\s+shud\S*)(?!\S)|\bavari(?:ya|ia)\S*\s+(?:\S+\s+)?(?:shud|shudam|kardam|kard)(?!\S)|\bbar\s*hurd(?:am|em|ed|and|)\b|\b(?:moshin|mashin|devor|sutun|darvoza|pritsep|bordyur)\S*\s+(?:\S+\s+)?zadam\b/, /\bsang\b|rejim/],
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
  ['steer', /\bghek\S*\s+(?:\S+\s+)?(?:tsanr|khagh|lyuft|chi\s+ptt)|\b(?:aj|dzakh)\s+(?:\S+\s+)?(?:kash|tan)um/],
  ['leak', /\b(?:yugh|varelik|dizel|solyar|antifriz|tosol|adblu|jur)\S*\s+(?:\S+\s+)?(?:hos|katum|kat\S*\s+e|artahos)|\bartahos/],
  ['fire', /\bvarvum\s+e\b|\bayrv|\bkrak(?!mar)|\bhrdeh|\btsukh|\bpozhar/, /\b(?:khlatsutsich|glushitel|vikhlop|chek|lamp|indikator|luys|far)/],
  ['acc', /\bvtar(?!ayin)|\bavaria(?:\s|$)|\bavariayi\s+entark|\bbakhv|\bkhpets|\bkhpel\s+em/],
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
  ['door', /\b(?:dur(?:y|n|ry)?|drner\S*|(?:gidro|hidro)bort\S*)\s+(?:\S+\s+)?(?:chi\s+(?:pakv|batsv|ashkhat|bardzr|ijn)|chen\s+(?:pakv|batsv)|pchats)/]];

const HY_NEG = /\bch(?:i|en|em|enk|es)\s+(?:hos|kat|kotr|payt|tsakv|chakv|bakhv|vnasv|ayrv|ijel|ynk|jard|viravor)\S*|\b(?:kotrv|payt|tsakv|chakv|vnasv|jard)\S*\s+che\b|\bchkotrv\S*/g;
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
  ['steer', grCo('timon', `vary|sklir|tremei|tremun|paizei|tzogk|den\\s+(?:\\S+\\s+)?gyriz|${GR_NW}`)],
  ['steer', /\b(?:travaei|travai|pigainei|fevgei)\s+(?:\S+\s+)?(?:dexia|aristera)/],
  ['leak', grCo('lad|petrel|ntizel|diizel|antipsyktik|kavsim|adblu|ygr', 'trech|stazei|stazun|diarro|chyn'), /\b(?:amortis|aeranart|fusk)/],
  ['leak', /\bdiarro/],
  ['fire', /\b(?:fotia|flog|kaigetai|kaigontai|pyrkagi|kapn)/, /\b(?:pyrosvest|exatmis|eksatmis|kapniz)/],
  ['acc', /\b(?:atychim|trochai|trakar|sygkrus|chtypis(?:a|ame|e)\b|epesa\s+pano)/, /\b(?:petr|chalaz)/],
  ['injury', /\b(?:travmat|aimorag|kopika|traumat)/],
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
  ['door', grCo('port(?:a|es|as|aki)\\b|ydravlik|anypsotik', `den\\s+(?:\\S+\\s+)?(?:klein|anoig|kleidon|xekleid|aneva|kateva)|kollis|espase|${GR_NW}`), /\b(?:tzam|parathyr)/]];

const GR_NEG = /\bden\s+(?:\S+\s+)?(?:espase|ragise|eskase|trypise|trech|staz|kaigetai|chtypis|trakar|epese|chalase|chalarose|skistike|travmatist|pire\s+fotia|epiase\s+fotia)\S*|\bden\s+(?:einai|ine)\s+(?:\S+\s+)?(?:spasmen|ragismen|fagomen|chalasmen|trypim|travmatism)\S*|\bchoris\s+(?:\S+\s+)?(?:diarro|zimi|atychim|provlim)\S*/g;
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
  ['steer', hiRx('stiring|stering|steering|staring|stearing', '@|bhari|bhaari|hil\\s+rah\\S*|dhila|dhili|kamp\\S*|thartha\\S*|ghum\\s+nahi|nahi\\s+ghum\\S*|khinch\\S*|khich\\S*', '\\b(?:gadi|truck|trak)\\S*\\s+(?:\\S+\\s+)?(?:ek\\s+taraf|left|right|baen|dae?n)\\s+(?:\\S+\\s+)?(?:khinch|khich|bhag)\\S*')],
  ['leak', hiRx('tel|oil|ail|diesel|disel|dijal|dizal|culant|kulent|kulant|adblue|hydraulic|haidrolik', 'tapak\\S*|tapk\\S*|leak\\s+ho\\S*|lik\\s+ho\\S*|ris\\s+rah\\S*|beh\\s+rah\\S*|bah\\s+rah\\S*|gir\\s+rah\\S*'), /khatam|light|lait|batti|card|kard|\btank\s+(?:\S+\s+)?khali/],
  ['fire', /\bag\s+(?:(?!nahi)\S+\s+)?(?:lag|pakad)\S*|\b(?:cabin|kebin|engine|enjin|injan|gadi|truck|trak|trailer|treler|vire|vayar|tar|seat|battery|bettri|batri)\S*\s+(?:\S+\s+){0,3}?(?:se\s+)?(?:dhuan|dhua|dhuva|dhunva|smoke)\s+(?:\S+\s+)?(?:nikal|a\s+rah|uth)\S*|\b(?:cabin|kebin|gadi|truck|trak|tyre|tayar|trailer|treler|vire|vayar|tar|seat)\S*\s+(?:\S+\s+)?jal\s+(?:gaya|raha|rahi|rahe)\b/, /silencer|sailensar|silensar|exhaust|eksast|light|lait|batti|lamp|bulb|balb|clutch|cluch|klach|fuse|fyuz|nahi\s+jal|indicator|check/],
  ['acc', /\b(?:accident|exident|aksident|eksident)\s+(?:\S+\s+)?(?:ho\s+gaya|hua|hui|kar\s+(?:diya|di))|\bthok\s+(?:di|diya|gaya|lag\S*)\b|\btakra\s+(?:gaya|gayi|diya|di)|\btakar\s+(?:ho|lag|mar|mari)\S*|\bthoki\b/],
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
  ['stuck', /\b(?:kichad|kichar|chikad|mitti|baraf|barf|snov|ret|rait)\S*\s+(?:\S+\s+){0,2}?(?:phas|fas|dhas|dhans)\S*/, /traffic|trefik|\bjam\b|line|lain/],
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
const TL_NEG = /\b(?:hindi|di)\s+(?:naman\s+|na\s+|po\s+|pa\s+)?(?:tumutulo|tumatagas|nasira|sira|basag|nabasag|nabangga|nabunggo|naaksidente|nasunog|nasusunog|umuusok|flat|na\s+flat|butas|nabutas|pumutok|nasugatan|nasaktan|ninakaw|nanakaw|nawala|nalaglag|nahulog|natanggal|punit|napunit|kumalas)\b|\bwala(?:ng)?\s+(?:naman\s+|namang\s+|pong\s+|po\s+)?(?:tagas|tulo|leak|aksidente|disgrasya|sunog|apoy|usok|sira|nasira|problema|diperensya|damage|gasgas|sugat|nasugatan|nasaktan|ninakaw|nanakaw|nawala|nabangga|basag|lamat|crack)\b/g;
const TL_KINDS = [['brake', tlCo('preno|brake', '@|walang\\s+preno|mahina|ayaw\\s+(?:kumapit|kumagat)|(?:hindi|di)\\s+(?:kumakapit|kumakagat)|malambot|lumalambot|naiipit|naipit|nagla\\s*lock|nag\\s+lock'), /hand\s*brake|handbreak|parking\s+brake|ilaw|light/],
  ['brake', tlCo('air\\s+pressure|presyon\\s+ng\\s+hangin|hangin\\s+ng\\s+preno', 'bumababa|mababa|nawawala|bumagsak|bagsak|hindi\\s+(?:umaakyat|tumataas)|ayaw\\s+(?:umakyat|tumaas)')],
  ['parkbrake', tlCo('hand\\s*brake|handbreak|parking\\s+brake', '@|ayaw\\s+(?:bumitaw|matanggal|maalis)|(?:hindi|di)\\s+(?:bumibitaw|mabitawan|maalis|matanggal|kumakapit)|ayaw\\s+kumapit|naiipit|naipit|stuck')],
  ['parkbrake', /\bkusang\s+(?:umandar|gumulong|umatras|tumakbo)|\bgumulong\s+(?:nang\s+|ng\s+)?(?:mag\s*isa|kusa)/],
  ['flat', tlCo('gulong|goma|tyre|tire|tayr', 'flat|butas|nabutas|pumutok|putok|sumabog|nawalan\\s+ng\\s+hangin|walang\\s+hangin|kulang\\s+(?:sa\\s+)?hangin|impis|naimpis|puncture|na\\s+puncture'), /air\s*bag|airbag|trapal|tarp|nut|turnilyo|bolt|tornilyo/],
  ['tyre', tlCo('gulong|goma|tyre|tire|tayr', 'kalbo|upod|pudpod|manipis|may\\s+hiwa|hiwa|laslas|may\\s+umbok|umbok|bukol|may\\s+bukol'), /flat|butas|pumutok|putok|hangin|puncture/],
  ['steer', tlCo('manibela|steering|direksyon|direksiyon', '@|matigas|mabigat|umuuga|nanginginig|maluwag|lumuluwag|may\\s+laro|kumakabig|humihila')],
  ['steer', tlCo('truck|trak|sasakyan|unit', '(?:humihila|kumakabig|kinakabig|lumilihis)\\s+(?:\\S+\\s+){0,2}?(?:pa\\s*)?(?:kanan|kaliwa)')],
  ['leak', tlCo('langis|oil|diesel|krudo|coolant|adblue|hydraulic|haydroliko|gasolina|tubig\\s+ng\\s+radiator', 'tumutulo|tulo|tumatagas|tagas|may\\s+tagas|leak|leaking|nag\\s*le\\s*leak|naglileak|tumatapon'), /ubos|naubos|naubusan|card|ilaw|light/],
  ['leak', /\bmay\s+(?:tumutulo|tumatagas|tagas|leak)\b/, /ubos|naubos|naubusan|card|ilaw|light|bubong|kisame|ulan/],
  ['fire', /\b(?:nasusunog|nasunog|may\s+sunog|nagliliyab|nagliyab|may\s+apoy|nag\s*apoy|umaapoy)\b/, /clutch|klats|klach|fuse|piyus|bumbilya|pagkain|kanin|ulam/],
  ['fire', tlCo('cabin|kabina|makina|engine|truck|trak|wire|wiring|kable|baterya|battery|upuan|seat|dashboard', 'usok|umuusok|nag\\s*uusok|umuusok'), /tambutso|tambucho|muffler|exhaust|silencer|maitim|itim|puti|asul/],
  ['acc', /\b(?:nabangga|bumangga|nakabangga|binangga|nabunggo|bumunggo|nakabunggo|naaksidente|aksidente|disgrasya|nadisgrasya|sumalpok|sinalpok|natamaan\s+ako|tumama\s+ako|nasagi|nakasagi)\b/],
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
  '(?:wala(?:ng)?|hindi|di)\\s+(?:naman\\s+|namang\\s+|pong\\s+|po\\s+)?(?:aksidente|naaksidente|disgrasya|nadisgrasya|nabangga|nabunggo|sunog|nasunog|apoy|usok|umuusok|nakaw|ninakaw|nanakaw|nagnakaw)\\p{L}*'
].join('|') + ')(?!\\p{L})', 'giu');
const fkNeg = (v) => String(v || '').replace(FK_NEG, ' ok ');
async function foreignKinds(v0) { const v = fkNeg(v0); const k = new Set([...trKinds(v), ...plKinds(v), ...roKinds(v), ...hrKinds(v), ...huKinds(v), ...csKinds(v), ...bgKinds(v), ...ltKinds(v), ...lvKinds(v), ...sqKinds(v), ...etKinds(v), ...rlKinds(v), ...ulKinds(v), ...srKinds(v), ...slKinds(v), ...beKinds(v), ...geKinds(v), ...arKinds(v), ...faKinds(v), ...uzKinds(v), ...azKinds(v), ...kzKinds(v), ...kyKinds(v), ...tjKinds(v), ...tkKinds(v), ...hyKinds(v), ...grKinds(v), ...hiKinds(v), ...tlKinds(v)]); if (k.has('acc')) k.delete('injury'); return k; }

export { foreignKinds };
