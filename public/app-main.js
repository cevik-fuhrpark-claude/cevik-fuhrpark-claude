// [CLAUDE] AUTOMATISCH ERZEUGT durch scripts/build-app.mjs aus public/app.js – nicht von Hand bearbeiten (Code in app.js ändern, dann npm run build)

import { caseDescText, stockNoteText } from './check-labels.js';
import { STRINGS, PLURALS, CHECK_LABELS, translateValidation, deLimitText, translateImportReason, translateNextAction, translateLockReason, auditActionLabel, auditDetailText, loadLang, langLoaded, loadHelp, helpLoaded } from './i18n-core.js';

import { findingMessage, posWord } from './finding-messages.js';
import { svg as qrSvg } from './qr.js';
import { dataQualityCsv, dqDetailText, defectItemsCsv, defectVehiclesCsv, agentFindingsCsv, usersCsv, sortUsers, filterUsers, isUnusedUser, inviteExpired, readCsvFile as readCsvRaw } from './csv.js';
import { helpMatches, helpNorm } from './help.js';
import { BUILD_VERSION } from './build-version.js';
import { federalHoliday, STATES } from './holidays.js';
import { parseHours, durationIn, H_UNIT as H_U, parseQty, qtyIn, unitCanon, moneyIn, moneyForeign, kmIn, kmForeignUnit, ratePeriod, unitIn, massTonnes, tireSizeSame, tireSizeFmt } from './hours.js';
import { reachableNow, dayRanges, coverageGaps, windowsOf, MORE_MAX, nextOpen, tzDiff, nextOpenLocal, holidayGaps, phoneIn } from './emhours.js';


function lbRx(src, flags, testOnly) {
  if (lbRx.ok === undefined) { try { lbRx.ok = !!new RegExp('(?<=a)b'); } catch (e) { lbRx.ok = false; } }
  return new RegExp(lbRx.ok ? src : lbFallback(src, !!testOnly), flags);
}
function lbFallback(src, exact) {
  const classEnd = (i) => { for (let j = i + 1; j < src.length; j++) { if (src[j] === '\\') j++; else if (src[j] === ']') return j + 1; } return src.length; };
  const groupEnd = (i) => { let d = 0; for (let j = i; j < src.length; j++) { const c = src[j]; if (c === '\\') j++; else if (c === '[') j = classEnd(j) - 1; else if (c === '(') d++; else if (c === ')' && --d === 0) return j + 1; } return src.length; };
  const negOne = (x) => { const m = /^\[(\^?)((?:\\.|[^\]\\])*)\]$/.exec(x); if (m) return m[1] ? '[' + m[2] + ']' : '[^' + m[2] + ']';
    if (/^\\[wdsWDS]$/.test(x)) return '\\' + (x[1] === x[1].toLowerCase() ? x[1].toUpperCase() : x[1].toLowerCase());
    if (x.length === 1 && !/[\\^$.|?*+()[\]{}/]/.test(x)) return '[^' + (x === '-' ? '\\-' : x) + ']';
    return null; };
  let out = ''; const st = [true], pol = [1]; let at = true;
  for (let i = 0; i < src.length;) {
    const c = src[i];
    if (c === '\\') { out += src.slice(i, i + 2); i += 2; at = false; continue; }
    if (c === '[') { const e = classEnd(i); out += src.slice(i, e); i = e; at = false; continue; }
    if (c === '(' && (src.startsWith('(?<=', i) || src.startsWith('(?<!', i))) {
      const e = groupEnd(i), inner = src.slice(i + 4, e - 1);
      if (exact && at) {
        if (src[i + 3] === '=') { out += '(?:' + lbFallback(inner, false) + ')'; at = false; }
        else { const one = negOne(inner); if (one) { out += '(?:^|' + one + ')'; at = false; } }
      } else if (pol[pol.length - 1] < 0) out += '(?!)';
      i = e; continue;
    }
    if (c === '(') { const look = src.startsWith('(?=', i) || src.startsWith('(?!', i); const h = look || src.startsWith('(?:', i) ? 3 : src.startsWith('(?<', i) ? src.indexOf('>', i) + 1 - i : 1;
      st.push(at && !look); pol.push(pol[pol.length - 1] * (src.startsWith('(?!', i) ? -1 : 1)); out += src.slice(i, i + h); i += h; at = at && !look; continue; }
    if (c === ')') { st.pop(); pol.pop(); out += c; i++; at = false; continue; }
    if (c === '|') { out += c; i++; at = st[st.length - 1]; continue; }
    if (c === '^') { out += c; i++; continue; }
    out += c; i++; at = false;
  }
  return out;
}
const __T = [String.raw`(?![a-zäöüß])`, String.raw`(?<![a-zäöüß-])`, String.raw`(?<![а-яіїєґё])`, String.raw`(?<![a-zäöüß])`, String.raw`(?<![а-яіїєґ])`, String.raw`(?<![a-z-])`, String.raw`(?![а-яіїєґё])`, String.raw`\s+(?:\S+\s+)?`, String.raw`(?:\S+\s+){0,2}?`, String.raw`(?:\S+\s+){0,3}?`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|`, String.raw`|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|`, String.raw`|відремонт\S*|замінил\S*|`, String.raw`nicht\s+(?:mehr\s+)?`, String.raw`(?:фургон|будк|прицеп|полуприцеп|причеп|напівпричеп|кузов|`, String.raw`|не\s+працю\S*|не\s+работа\S*|`, String.raw`(?:auflieger|anh(?:ä|ae)nger|`, String.raw`|сломал\S*|сломан\S*|`, String.raw`(?:won['’]?t|will\s+not|doesn['’]?t|`, String.raw`(?:колес\S*|колiс\S*|коліс\S*|шин\S*|покрышк\S*|покришк\S*|резин\S*|гум[аиуі]|баллон\S*|балон\S*)`, String.raw`(?:ab(?:gebrochen|gerissen)?|gebrochen|durchgebrochen|kaputt|defekt|lose|locker|wackelt|wackelig|klemmt|h(?:ä|ae)ngt|`, String.raw`|реф)\S*|(?:задн\S*|задні)\s+(?:ворота|двер\S*)|(?:боков\S*|бічн\S*)\s+двер\S*|`, String.raw`|більше\s+не|больше\s+не))`, String.raw`|fixed|repaired|replaced|`, String.raw`(?![a-z])|(?<![a-z])`, String.raw`|auflieger|anh(?:ä|`, String.raw`|funktioniert\s+wieder|wieder\s+(?:ok|`, String.raw`|geht\s+nicht|funktioniert\s+nicht|`, String.raw`|злама[вл]\S*|сломал\S*|`, String.raw`|отремонт\S*|заменил\S*|`, String.raw`|злама[внл]\S*|сломан\S*|`, String.raw`|оторва\S*|тріснув\S*|треснул\S*|теліпа\S*|болта\S*|хита\S*|шата\S*|заклин\S*|`, String.raw`|під\s+час\s+руху|во\s+время\s+движения|в\s+дороге|в\s+дорозі|`, String.raw`|kühlanhänger|kühlkoffer|kuehlkoffer|kühler|kuehler|kofferaufbau|aufbau|sattelauflieger|`, String.raw`|pneu|zwillingsreifen|vorderreifen|hinterreifen|aufliegerreifen|anh(?:ä|`, String.raw`|ss)en|haupt|weitwinkel|rampen|front|fahrer|beifahrer|`, String.raw`(?:немає|нема|нет`, String.raw`|відсутн\S*|отсутств`, String.raw`(?:won['’]?t|doesn['’]?t|does`, String.raw`|(?<![a-z])(?:`, String.raw`(?:колес|колiс|коліс|шин|покрышк|покришк|резин|баллон|балон)`, String.raw`(?![a-z])(?![^.;!?]*(?:fixed|repaired|replaced`, String.raw`funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung`, String.raw`не\s+працю\S*|не\s+работа\S*`, String.raw`\s+(?:\S+\s+){0,4}?(?:`, String.raw`|load(?![a-z])|trailer|box\s+body|curtain|вантаж\S*|кузов\S*|причіп\S*|прицеп\S*|напівпричіп\S*|полуприцеп\S*|тент\S*|фургон\S*)[^.;!?]*)`, String.raw`(?:fahrer|beifahrer|heck|seiten|schiebe|kabinen|fahrerhaus|koffer|aufbau|hinter|vorder|fl(?:ü|ue)gel)?[\s-]?t(?:ü|ue)r(?:en)`, String.raw`(?<!(?:handy|telefon|smartphone|tablet|sitz|fahrersitz|uhr|phone|seat|телефон|сидіння|сиденье|spiegel|mirror|дзеркало|зеркало)\s+)`, String.raw`(?:niemand|keiner|keine|kein|nicht|nichts|ohne|nobody|no\s+one|noone|not|no|never|without|ніхто\s+не|никто\s+не|не|без)\s+(?:\S+\s+){0,2})`, String.raw`(?:открыл|відкрил|відчинил|распахнул|розчинил|розчахнул)`, String.raw`(?:schranke|poller|(?:stra(?:ß|ss)en)?laterne|laternen(?:pfahl|mast)|(?:licht|strom|beleuchtungs|ampel)mast|leitpfosten|absperrpfosten|pfosten|pfahl|z(?:a|ä|ae)un|(?:verkehrs|stra(?:ß|ss)en|park)?schild|schilder|verkehrszeichen|(?:leit|schutz)planke|(?:baustellen)?absperrung|bake|ampel|(?:zapf|tank)s(?:ä|ae)ule|(?:hof|hallen|einfahrts|garagen|werks|firmen|grundst(?:ü|ue)cks|sektional|lager|rampen|kipp)?tor|toreinfahrt|(?:b(?:ü|ue)ro|hallen|lager|werkstatt|eingangs|haus|glas)t(?:ü|ue)r|mauer|(?:haus|hallen|geb(?:ä|ae)ude)wand|hausecke|geb(?:ä|ae)ude|vordach|carport|(?:strom|verteiler|schalt)kasten|hydrant|briefkasten|fahrradst(?:ä|ae)nder|park(?:schein)?automat|wartenh(?:ä|ae)uschen|wareh(?:ä|ae)uschen|blumenk(?:ü|ue)bel)(?:n|en|e|s|es|er)`];
const __RX = [String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))`, String.raw`(?![^.;!?]*(?:украл|украд|вкрал|вкрад|пропал|пропав|пропал|нема|нет(?![а-яіїєґё])|не\s+хвата|не\s+вистача))`, String.raw`(?![^.;!?]*(?:fehlt|fehlen|gestohlen|geklaut|entwendet|ladung\s+weg|ware\s+weg))`, String.raw`(?![^.;!?]*(?:відремонт\S*|замінил\S*|замінив\S*|отремонт\S*|заменил\S*|поменял\S*|поміняв\S*))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*))`, String.raw`(?!\S*\s+(?:\S+\s+)?(?:wischer|scheibenwischer|wischwasser|waschanlage|wasserd(?:ü|ue)sen?|beschlagen|wipers?|washers?|wiper\s+blades?|fogg?ed|fogging|misted|misting|steamed\s+up)(?![a-zäöüß]))`, String.raw`(?!(?=\S*\s+(?:\S+\s+){0,2}?(?:beschlagen|fogg?ed|fogging|misted|misting|steamed\s+up)(?![a-zäöüß]))(?![^.;!?]*(?:riss|gerissen|gesprungen|sprung|kaputt|gebrochen|eingeschlagen|crack|broken|smashed)))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|found|gefunden|знайшли|нашли|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung|da)|fixed|repaired|replaced))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|freigeschaltet|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung|frei)|fixed|repaired|replaced|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|замінив\S*|полагодил\S*|отремонт\S*|заменил\S*|починил\S*|більше\s+не|больше\s+не))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|(?:ist\s+)?(?:weg|aus|erloschen)(?![a-zäöüß])|fixed|repaired|replaced|gone|cleared|відремонт|полагод|згас|погас|зник|пропал))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|gone|cleared|відремонт\S*|полагод\S*|замінил\S*|отремонт\S*|заменил\S*|згас\S*|погас\S*|зник\S*|пропал\S*|більше\s+не|больше\s+не))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|abgedichtet|nicht\s+mehr|kein\S*\s+(?:\S+\s+)?mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung|dicht)|fixed|repaired|replaced|resealed|no\s+longer|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|поменял\S*|усунул\S*|устранил\S*|більше\s+не|больше\s+не))`, String.raw`(?!\s+(?:\S+\s+)?(?:gereinigt|getauscht|erneuert|ersetzt|erledigt|behoben|repariert|erfolgreich|ok(?![a-zäöüß])|in\s+ordnung|cleaned|replaced|fixed|done))`, String.raw`(?![^.;!?\n]*(?:reifen|flanke|lauffl|karkasse|lack|tyre|tire|шин|покришк|покрышк))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|sorted|no\s+longer))`, String.raw`(?![^.;!?]*(?:repariert|getauscht|erneuert|behoben|gewechselt|wieder\s+in\s+ordnung|fixed|repaired|replaced|відремонт\S*|замінен\S*|отремонт\S*|заменен\S*))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|adjusted|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|відрегул\S*|отрегулир\S*))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|замінив\S*|отремонт\S*|заменил\S*|більше\s+не|больше\s+не))`, String.raw`(?![^.;!?]*(?:repariert|behoben|aufgetaut|fixed|repaired|thawed|отремонт\S*|відремонт\S*|починил\S*|полагодил\S*|разморозил\S*|розморозил\S*|отогрел\S*|відігріл\S*|больше\s+не|більше\s+не))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nachgef(?:ü|ue)llt|aufgef(?:ü|ue)llt|fixed|repaired|replaced|topped\s+up|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*|долил\S*|долив\S*))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|fixed|repaired|replaced|patched|відремонт\S*|замінил\S*|замінив\S*|полагодил\S*|отремонт\S*|заменил\S*|починил\S*))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|fixed|repaired|replaced))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*|усунул\S*|устранил\S*|полагодил\S*|починил\S*))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|abgedichtet|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|patched|sealed|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|fixed|repaired|replaced|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|поменял\S*|помінял\S*|закрепил\S*|закріпил\S*|закріпив\S*|докрепил\S*|докріпив\S*))`, String.raw`(?![^.;!?]*(?:laderaum|ladefl(?:ä|ae)che|koffer|plane|aufbau|auflieger|anh(?:ä|ae)nger|ladung|ware|container|k(?:ü|ue)hlraum|cargo|load(?![a-z])|trailer|box\s+body|curtain|вантаж\S*|кузов\S*|причіп\S*|прицеп\S*|напівпричіп\S*|полуприцеп\S*|тент\S*|фургон\S*))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|fixed|repaired|replaced|adjusted|відремонт|полагод|отремонт|почини))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|befestigt|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*))`, String.raw`(?![^.;!?]*(?:відремонт\S*|отремонт\S*|замінил\S*|замінил\S*|замінен\S*|заменил\S*|заменил\S*|заменен\S*|усунул\S*|устранил\S*|полагодил\S*|починил\S*|закріпил\S*|закрепил\S*|відрегулю\S*|отрегулир\S*|прибрал\S*|убрал\S*))`, String.raw`(?![^.;!?]*(?:entfernt|beseitigt|weggemacht|umgesiedelt|(?:ist|sind|war|waren)\s+weg(?![a-zäöüß])|removed|gone|видал\S*|прибра\S*|удал\S*|убра\S*))`, String.raw`(?![^.;!?]*(?:entfernt|beseitigt|weggemacht|rausgeholt|removed|cleared|прибра\S*|видал\S*|удал\S*|убра\S*))`, String.raw`(?![^.;!?]*(?:відремонт\S*|отремонт\S*|замінил\S*|замінен\S*|заменил\S*|заменен\S*|усунул\S*|устранил\S*|полагодил\S*|починил\S*|приклеї\S*|приклеи\S*|наклеї\S*|наклеи\S*|почистил\S*|очистил\S*|помил\S*|помыл\S*|закріпил\S*|закрепил\S*|замовил\S*|заказал\S*))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))`, String.raw`(?![^.;!?]*(?:відремонт\S*|замінил\S*|замінив\S*|поміняли\S*|полагодил\S*|отремонт\S*|заменил\S*|поменяли\S*|починил\S*|прикрутил\S*|прикрутив\S*|почистил\S*|почистив\S*|помыл\S*|помив\S*|помили|repariert|getauscht|fixed|repaired|replaced))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|gerichtet|eingestellt|funktioniert\s+wieder|geht\s+wieder|wieder\s+(?:ok|in\s+ordnung|normal)|fixed|repaired|replaced|sorted|no\s+longer|working\s+again|відремонт\S*|замінил\S*|замінен\S*|замінив\S*|поміня\S*|отремонт\S*|заменил\S*|заменен\S*|поменя\S*|полагодил\S*|починил\S*|почистил\S*|більше\s+не|больше\s+не))`, String.raw`(?!(?:[^.;!?]*[^а-яіїєґё.;!?])?(?:офис\S*|офіс\S*|склад[еуі]?(?![а-яіїєґё])|цех\S*|здани\S*|будівл\S*|туалет\S*|душев\S*|ванн\S*|квартир\S*|приложени\S*|програм\S*|додат\S*|телефон\S*|планшет\S*|сайт\S*|браузер\S*))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|geht\s+wieder|wieder\s+(?:ok|in\s+ordnung|da|an)|fixed|repaired|replaced|works\s+again|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung|normal)|fixed|repaired|replaced|sorted|no\s+longer|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*|більше\s+не|больше\s+не))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|(?<![a-zäöüß])neu(?:er|en|es|e)?(?![a-zäöüß])|eingebaut|klemmt\s+nicht\s+mehr|wackelt\s+nicht\s+mehr|funktioniert\s+wieder|geht\s+wieder|wieder\s+(?:ok|in\s+ordnung|fest|dran)|alles\s+ok|fixed|repaired|replaced|works\s+again|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*|знову\s+працю\S*|снова\s+работа\S*))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|working\s+again|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*))`, String.raw`(?![^.;!?]*(?:відремонт\S*|замінил\S*|замінен\S*|поміня\S*|полагод\S*|отремонт\S*|заменил\S*|заменен\S*|поменя\S*|почини\S*|більше\s+не|больше\s+не))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung|an)|fixed|repaired|replaced|working\s+again))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінив\S*|полагодил\S*|поміня\S*|отремонт\S*|заменил\S*|поменя\S*|почини\S*))`, String.raw`(?![^.;!?]*(?:разморозил\S*|розморозил\S*|оттаял\S*|відтанул\S*|отогрел\S*|відігріл\S*|відкрил\S*|открыл\S*))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung|zu|geschlossen)|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|gereinigt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|cleaned|відремонт\S*|замінил\S*|замінен\S*|замінив\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|gerichtet|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|straightened|no\s+longer|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|вирівня\S*|выпрями\S*|більше\s+не|больше\s+не))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|geht\s+wieder|wieder\s+(?:ok|in\s+ordnung|normal|dran|fest)|fixed|repaired|replaced|sorted|working\s+again|no\s+longer|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|полагодил\S*|починил\S*|більше\s+не|больше\s+не))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|gerichtet|funktioniert\s+wieder|geht\s+wieder|wieder\s+(?:ok|in\s+ordnung|normal|zu|dicht)|nicht\s+mehr|fixed|repaired|replaced|straightened|sorted|no\s+longer|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|полагодил\S*|починил\S*|більше\s+не|больше\s+не))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|adjusted|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))`, String.raw`(?!(?:getauscht|repariert|erneuert|gewechselt|ersetzt|nachgef(?:ü|ue)llt)\s)`, String.raw`(?![^.;!?]*(?:repariert|behoben|erneuert|getauscht|fixed|repaired|replaced))`, String.raw`(?![^.;!?]*(?:schnee|glatt|eis(?![a-zäöüß])|matsch|schlamm|drehen\s+durch|repariert|behoben|fixed|repaired))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|festgemacht|befestigt|wieder\s+(?:drauf|dran|fest)|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|reattached|no\s+longer|відремонт\S*|замінил\S*|замінен\S*|замінив\S*|отремонт\S*|заменил\S*|усунул\S*|устранил\S*|полагодил\S*))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|gereinigt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|cleaned|no\s+longer|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|почистил\S*|більше\s+не|больше\s+не))`, String.raw`(?!nicht|kein|not(?![a-z])|no(?![a-z])|reifen|felge|tyre|tire|rim|не(?![а-яіїєґё]))`, String.raw`(?![^.;!?,]*(?:hang|gef(?:ä|ae)lle|absch(?:ü|ue)ssig|bordstein|gel(?:ä|ae)nde|parkplatz|rampe|boden|untergrund|schr(?:ä|ae)g))`, String.raw`(?!\s+(?:безпек|безопасн|сидін|сиден|крісл|кресл|водіт|водит)\S*)`, String.raw`(?!\s+(?:\S+\s+)?(?:телефон|моб|планшет|рац|сканер|нав[иі]г|ноут|пульт)\S*)`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|полагодил\S*|починил\S*))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|eingestellt|nachgestellt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|adjusted|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|відрегул\S*|отрегулир\S*))`, String.raw`(?!\s+(?:на\s+)?(?:генератор|вентилятор|привод|помп|грм|кріплен|креплен|вантаж|груз|стяжн|тент))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|geht\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|sorted|works\s+again|working\s+again|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*))`, String.raw`(?!\s+(?:\S+\s+)?(?:поворот\S*|стоп\S*|аварі\S*|авари\S*|задн\S*|заднь\S*|габарит\S*|gps|жпс|джипиес|мобильн\S*|мобільн\S*|телефон\S*|связ\S*|зв['’]?язк\S*))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|замінили|поміняли|отремонт\S*|заменил\S*|заменен\S*|поменял\S*|починил\S*|полагодил\S*))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|entfernt|nachgezogen|festgezogen|angezogen|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|removed|tightened|no\s+longer|відремонт\S*|замінил\S*|замінив\S*|прибрал\S*|вийняли|затягнул\S*|отремонт\S*|заменил\S*|убрали|достали|затянул\S*|більше\s+не|больше\s+не))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung|normal)|fixed|repaired|replaced|sorted|working\s+again|no\s+longer|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|полагодил\S*|починил\S*|більше\s+не|больше\s+не))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|gerichtet|fixed|repaired|replaced))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|no\s+longer|відремонт\S*|замінил\S*|отремонт\S*|заменил\S*|поменял\S*|помінял\S*|більше\s+не|больше\s+не))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|fixed|repaired|replaced|patched))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|fixed|repaired|replaced|changed|patched|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*|полагод\S*|починил\S*))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|fixed|repaired|replaced|changed|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|geflickt|nicht\s+mehr|fixed|repaired|replaced|changed|no\s+longer|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*|більше\s+не|больше\s+не))`, String.raw`(?!\s+(?:\S+\s+)?(?:nicht\s+mehr|weg(?![a-zäöüß])|behoben|gone|fixed|stopped|no\s+longer))`, String.raw`(?!\s+(?:\S+\s+)?(?:nicht\s+mehr|wieder|behoben|repariert|gepr(?:ü|ue|u)ft|fixed|repaired|checked))`, String.raw`(?![,;.]?\s+(?:\S+\s+)?(?:repariert|getauscht|ersetzt|erneuert|behoben|geschwei(?:ß|ss)t|in\s+ordnung|fixed|repaired|replaced))`, String.raw`(?![^.;!?]*(?:відремонт\S*|отремонт\S*|замінил\S*|замінен\S*|заменил\S*|заменен\S*|усунул\S*|устранил\S*|полагодил\S*|починил\S*))`, String.raw`(?![^.;!?]*(?:відремонт\S*|отремонт\S*|замінил\S*|замінив\S*|замінен\S*|заменил\S*|заменен\S*|поміня\S*|поменя\S*|заізол\S*|заизол\S*|усунул\S*|устранил\S*|полагодил\S*|починил\S*|більше\s+не|больше\s+не))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|gereinigt|fixed|repaired|replaced|відремонт\S*|замінен\S*|отремонт\S*|заменен\S*))`, String.raw`(?![^.;!?]*(?:wieder\s+da|wieder\s+vorhanden|gefunden|repariert|ersetzt|erneuert|getauscht|gewechselt|behoben|montiert|aufgezogen|fixed|repaired|replaced|found|fitted|відремонт\S*|замінил\S*|замінен\S*|знайшл\S*|отремонт\S*|заменил\S*|заменен\S*|нашл\S*))`, String.raw`(?![^.;!?]*(?:erledigt|gemacht|durchgef(?:ü|ue)hrt|zur(?:ü|ue)ckgesetzt|resettet|quittiert|behoben|repariert|done|reset|completed|carried\s+out|зроблен\S*|зробили|виконал\S*|виконан\S*|скинул\S*|скинули|сделал\S*|сделан\S*|выполнен\S*|сбросил\S*))`, String.raw`(?![^.;!?]*(?:done|reset|completed|carried\s+out|fixed|cleared))`, String.raw`(?![^.;!?]*(?:зроблен\S*|зробили|виконал\S*|виконан\S*|скинул\S*|скинули|сделал\S*|сделан\S*|выполнен\S*|сбросил\S*))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|instand\s+gesetzt|fixed|repaired|replaced|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|заменил\S*|заменен\S*))`, String.raw`(?![^.;!?]*(?:abgelassen|entleert|abgepumpt|erledigt|behoben|repariert|getauscht|gewechselt|drained|fixed|replaced|злил\S*|злили|відремонт\S*|замінил\S*|слил\S*|отремонт\S*|заменил\S*))`, String.raw`(?![^.;!?]*(?:злил\S*|злили|відремонт\S*|замінил\S*|слил\S*|отремонт\S*|заменил\S*))`, String.raw`(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced|sorted|відремонт\S*|полагодил\S*|отремонт\S*|починил\S*))`];



const deviceLang = () => { let ls = []; try { ls = [...(navigator.languages || []), navigator.language || '']; } catch { ls = [navigator.language || '']; } for (const x of ls) { const l = String(x || '').toLowerCase(); if (l.startsWith('uk')) return 'uk'; if (l.startsWith('en')) return 'en'; if (l.startsWith('de')) return 'de'; } return 'de'; };

const sortPref = (key, allowed, def, set) => { const k = 'cfp_sort_' + key; if (set !== undefined) { try { sessionStorage.setItem(k, set); } catch {} return set; } let v = ''; try { v = sessionStorage.getItem(k) || ''; } catch {} return allowed.includes(v) ? v : def; };
const CASE_SORTS = ['priority', 'oldest', 'updated'], VEH_SORTS = ['plate', 'next_due', 'km_due', 'check_oldest', 'km_desc', 'findings'];
let lastActivity = Date.now(), lastApiAt = 0, idleBusy = false;

const readCsvFile = async (f) => { try { return await readCsvRaw(f); } catch (e) { if (e && (e.code === 'csv_mixed_encoding' || e.code === 'csv_unknown_encoding')) e.message = t(e.code); throw e; } };



const rkFor = (form, b) => { const sig = JSON.stringify(b); if (!form.dataset.rk || form.dataset.rkSig !== sig) { form.dataset.rk = uid(); form.dataset.rkSig = sig; } return form.dataset.rk; };

const lostMark = (form, b, err) => { if (err && err.offline) form.dataset.lostSig = JSON.stringify(b); };
const lostDup = (form, b, err, codes) => !!err && codes.includes(err.code) && form.dataset.lostSig === JSON.stringify(b);

const lostIs = (el, b) => !!el && el.dataset.lostSig === JSON.stringify(b);
const S = { me: null, meta: null, lang: (() => { try { return localStorage.getItem('cfp_lang') || deviceLang(); } catch { return deviceLang(); } })(), viewEnv: null, unread: 0 };



if (!['de', 'uk', 'en'].includes(S.lang)) S.lang = 'de';
window.__cfpLoading = true;
const langReady = loadLang(S.lang).catch(async (e) => {
  for (const l of ['de', 'uk', 'en']) if (l !== S.lang) { try { await loadLang(l); S.lang = l; return; } catch {   } }
  window.__cfpLoading = false; window.dispatchEvent(new Event('error')); throw e;
});
langReady.then(() => { window.__cfpBooted = true; }, () => {});

const ensureLang = async (l) => { if (langLoaded(l)) return true; try { await loadLang(l); return true; } catch { if (S.lang === l) S.lang = ['de', 'uk', 'en'].find(langLoaded) || 'de'; return false; } };
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const pnm = (name, hidden) => (hidden ? t('name_hidden_driver') : name);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const BERLIN_FMT = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' });

const BERLIN_DT_FMT = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const berlinLocalDT = (iso) => { const d = new Date(iso || ''); return Number.isNaN(d.getTime()) ? '' : BERLIN_DT_FMT.format(d).replace(' ', 'T'); };




let clockSkew = 0;
const nowMs = () => Date.now() + clockSkew;
function clockSample(hdr, t0, t1) {
  const s = Date.parse(hdr || ''); if (!Number.isFinite(s) || t1 - t0 > 10000) return;
  const d = s + 500 - (t0 + t1) / 2; const nv = Math.abs(d) > 120000 ? Math.round(d) : 0;
  const was = Math.abs(clockSkew) > 300000; clockSkew = nv; if (was !== (Math.abs(nv) > 300000) || was) clockWarn();
}

function clockText() {
  const m = Math.round(Math.abs(clockSkew) / 60000); if (m < 5) return '';
  const span = m >= 90 ? (m >= 2880 ? t('clock_days').replace('{n}', Math.round(m / 1440)) : t('clock_hours').replace('{n}', Math.round(m / 60))) : t('clock_minutes').replace('{n}', m);
  return t(clockSkew > 0 ? 'clock_behind' : 'clock_ahead').replace('{d}', span);
}
function clockWarn() {
  if (typeof document === 'undefined') return;
  const txt = clockText(); let el = document.querySelector('.clockband');
  if (!txt || !S.me) { if (el) el.remove(); return; }
  if (!el) { const at = document.querySelector('.testband') || document.querySelector('.topbar'); if (!at) return; el = document.createElement('div'); el.className = 'clockband'; el.setAttribute('role', 'status'); at.after(el); }
  if (el.dataset.txt !== txt) { el.dataset.txt = txt; el.textContent = txt; }
}

const bDate = (days = 0) => { const t = BERLIN_FMT.format(new Date(nowMs())); if (!days) return t; const [y, m, d] = t.split('-').map(Number); const x = new Date(Date.UTC(y, m - 1, d + days)); return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`; };

const bYearAhead = () => { const d = bDate(); const md = d.slice(5); return `${Number(d.slice(0, 4)) + 1}-${md === '02-29' ? '02-28' : md}`; };

const workDateMin = (iso) => { const d = BERLIN_FMT.format(new Date(iso)); const y = `${Number(d.slice(0, 4)) - 1}${d.slice(4)}`; return y.endsWith('-02-29') ? y.slice(0, 8) + '28' : y; };

const t = (k) => (STRINGS[S.lang] && STRINGS[S.lang][k]) || STRINGS.de[k] || k;

const noneP = () => `<p class="muted" data-none>${esc(t('no_entries'))}</p>`;

const MK_KEYS = { Tachograph: 'tacho', 'Ölwechsel': 'oil', Inspektion: 'service', Bremsen: 'brakes', Reifen: 'tires', 'Hydraulik/Aufbau': 'hydraulics', 'Feuerlöscher': 'extinguisher', Verbandkasten: 'firstaid', Ladungssicherung: 'loadsec', Ladebordwand: 'taillift', Ladekran: 'crane', 'Kühlgerät': 'reefer', 'ATP-Bescheinigung': 'atp', Temperaturschreiber: 'templog', 'Rückruf': 'recall', Sonstiges: 'other' };

const mkR = (r) => mk(r.kind) + (r && r.title ? ' – ' + r.title : '');
const mk = (k) => (MK_KEYS[k] ? t('mk_' + MK_KEYS[k]) : k);



const uid = () => { if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join(''); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`; };


const DT_FMT = {};

const locOf = (l) => (l === 'uk' ? 'uk-UA' : l === 'en' ? 'en-GB' : 'de-DE');
const uiLoc = () => locOf(S.lang);
const fmtNum = (x, o) => Number(x).toLocaleString(uiLoc(), o);

const unitL = (u) => (/^(stk\.?|stück|pcs\.?|шт\.?)$/i.test(String(u ?? '').trim()) ? t('unit_pcs') : (u ?? ''));

const rc2 = (n) => { const x = Number(n); return Number.isFinite(x) ? Math.sign(x) * Math.round(Number((Math.abs(x) * 100).toFixed(6))) / 100 + 0 : x; };

const nDays = (n) => { let k = 'other'; try { k = new Intl.PluralRules(uiLoc()).select(Number(n)); } catch {   } return `${fmtNum(n)} ${t('days_' + k) !== 'days_' + k ? t('days_' + k) : t('days')}`; };


const tn = (k, n) => { let c = 'other'; try { c = new Intl.PluralRules(uiLoc()).select(Number(n)); } catch {   } const p = (PLURALS[S.lang] || {})[k]; return ((p && (p[c] || p.other || p.many)) || t(k)).replace('{n}', fmtNum(n)); };


const decIn = (x) => (S.lang === 'en' ? String(x) : String(x).replace('.', ','));
const fmtMonth = (ym) => new Intl.DateTimeFormat(uiLoc(), { year: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(ym + '-15T12:00:00Z'));


const dateOpts = (timeZone) => ({ day: '2-digit', month: '2-digit', year: 'numeric', timeZone });

const dtFmt = (kind) => { const loc = uiLoc(); const k = kind + loc; return DT_FMT[k] || (DT_FMT[k] = new Intl.DateTimeFormat(loc, kind === 'dt' ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Berlin' } : dateOpts(kind === 'd' ? 'Europe/Berlin' : 'UTC'))); };



const AF_DRIVER = /^(DRIVER_DOC_|LICENSE_CHECK_|TACHO_CARD_)/;
const afLink = (caseId, code, subj) => { const c = String(code || ''); const d = (h, attr) => `<a href="${h}"${attr}>${esc(t('details'))}</a>`;
  if (caseId) return d(`#/cases/${esc(caseId)}`, '');
  if (!subj) return '';
  if (c.startsWith('FINE_')) return d(`#/fines/${encodeURIComponent(subj)}`, ' data-afine');
  const did = String(subj).split('|')[0];
  if (AF_DRIVER.test(c) && isMgr()) return d(`#/drivers/${encodeURIComponent(did)}`, ' data-adriver');
  if (c.startsWith('STOCK_')) return d(`#/stock/${encodeURIComponent(subj)}`, ' data-astock');
  return ''; };
const notifHref = (x) => { const m = /^(vehicle|fine):(.+)$/.exec(x.ref || ''); return x.case_id ? '#/cases/' + encodeURIComponent(x.case_id) : m ? (m[1] === 'vehicle' ? '#/vehicles/' + encodeURIComponent(m[2]) : '#/fines/' + encodeURIComponent(m[2])) : x.kind === 'new_login' ? '#/more?o=sess' : S.me.role === 'driver' ? '#/' : isMgr() ? '#/master' : '#/'; };

const siteKeyUi = (x) => (x && String(x).trim() ? String(x).normalize('NFC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('de') : 'ohne');

const HM_FMT = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

const fmtHM = (iso) => { const d = new Date(iso || ''); return Number.isNaN(d.getTime()) ? '' : HM_FMT.format(d); };
const fmtDT = (iso) => { if (!iso) return '–'; const d = new Date(iso); return Number.isNaN(d.getTime()) ? '–' : dtFmt('dt').format(d); };

const fmtD = (iso) => { if (!iso) return '–'; const d = new Date(iso.length === 10 ? iso + 'T12:00:00Z' : iso); return Number.isNaN(d.getTime()) ? '–' : dtFmt(iso.length === 10 ? 'd10' : 'd').format(d); };

const fmtOccurred = (x) => (!x ? '–' : x.length === 10 ? fmtD(x) : fmtDT(x));



const berlinOffMin = (ms) => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return Math.round((Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour) % 24, Number(p.minute)) - Math.floor(ms / 60000) * 60000) / 60000); };
const tzDiffMin = (ms = Date.now()) => { try { const d = -new Date(ms).getTimezoneOffset() - berlinOffMin(ms); return Number.isFinite(d) ? d : 0; } catch { return 0; } };
const tzDiffText = (d) => { const a = Math.abs(d); return `${d > 0 ? '+' : '−'}${Math.floor(a / 60)}:${String(a % 60).padStart(2, '0')}`; };
const tzNote = () => { const d = tzDiffMin(); return d ? `<p class="small alert" data-tzdiff role="note" style="margin:2px 0 8px">${esc(t('tz_device_diff').replace('{d}', tzDiffText(d)).replace('{now}', fmtHM(new Date(nowMs()).toISOString())))}</p>` : ''; };

const occurredFields = (cur, named = false) => { const dt = cur && cur.length > 10 ? berlinLocalDT(cur) : ''; const dv = cur ? (dt ? dt.slice(0, 10) : cur) : ''; const tv = dt ? dt.slice(11, 16) : '';
  return `<div class="grid2" data-occ><div><label for="occd">${esc(t('occ_date'))}<span class="hint">${esc(t('occ_date_hint'))}</span></label><input type="date" id="occd"${named ? ' name="occ_date"' : ''} max="${bDate()}" value="${esc(dv)}"><div class="occq noprint" data-occq role="group" aria-label="${esc(t('occ_q_label'))}">${[0, 1, 2].map((n) => `<button type="button" class="btn secondary small" data-occd="${n}" title="${esc(fmtD(bDate(-n)))}">${esc(t('occ_q_' + n))}</button>`).join('')}</div><p class="small noprint" data-occdesc hidden></p></div><div><label for="occt">${esc(t('occ_time'))}<span class="hint">${esc(t('occ_time_hint'))}</span></label><input type="time" id="occt"${named ? ' name="occ_time"' : ''} step="60" value="${esc(tv)}"></div></div>${tzNote()}`; };

const occurredValue = (dv, tv) => (!dv ? (tv ? undefined : '') : tv ? `${dv}T${tv}` : dv);

const isWeekendD = (iso) => !!iso && iso.length === 10 && [0, 6].includes(new Date(iso + 'T12:00:00Z').getUTCDay());


const todayAt = (iso) => { if (!iso) return ''; const x = new Date(iso); if (Number.isNaN(x.getTime()) || BERLIN_FMT.format(x) !== bDate()) return ''; return fmtDT(iso).split(' ').pop(); };
const bookedWho = (iso, name) => (name || todayAt(iso) ? `<span class="small muted" data-bkby>${todayAt(iso) ? ' ' + esc(todayAt(iso)) : ''}${name ? ' · ' + esc(name) : ''}</span>` : '');
const bookedAt = (iso) => (iso ? `<br><span class="small muted" title="${esc(t('cost_booked_hint'))}">${esc(t('cost_booked'))} ${fmtD(iso)}</span>` : '');


const holName = (iso) => { const h = federalHoliday(iso); return h ? t('hol_' + h) : ''; };
const fmtDue = (iso) => { if (!iso || iso.length !== 10) return fmtD(iso); const d = new Date(iso + 'T12:00:00Z'); if (Number.isNaN(d.getTime())) return '–'; const k = 'wd' + uiLoc(); const wd = (DT_FMT[k] || (DT_FMT[k] = new Intl.DateTimeFormat(uiLoc(), { weekday: 'short', timeZone: 'UTC' }))).format(d); return `${wd} ${fmtD(iso)}${holName(iso) ? ' (' + holName(iso) + ')' : isWeekendD(iso) ? ' (' + t('due_weekend') + ')' : ''}`; };




function offDayWatch(els, key = 'plan_offday_hint') { for (const el of els) { if (!el || el.dataset.offW) continue; el.dataset.offW = '1'; const h = document.createElement('p'); h.className = 'small muted'; h.dataset.offday = ''; h.hidden = true; el.after(h); const upd = () => { const v = el.value; const x = holName(v) || (isWeekendD(v) ? t('due_weekend') : ''); h.hidden = !x; if (x) h.textContent = t(key).replace('{d}', () => x); }; el.addEventListener('input', upd); el.addEventListener('change', upd); upd(); } }

const dqDetail = (i) => dqDetailText(i, t, fmtD, mk, { km: (n) => fmtKm(n), src: (v) => odoSrc(v), pos: (p) => posL(p), mm: (n) => fmtMm(n), ax: (v) => t('axle_' + v), ws: (c) => wsName(c) });
const hrs = (n) => (n === null || n === undefined ? '–' : fmtNum(Math.round(n * 100) / 100, { maximumFractionDigits: 2 }));
const EUR_FMT = {};
const eur = (n) => { if (n === null || n === undefined) return '–'; const l = uiLoc(); return (EUR_FMT[l] || (EUR_FMT[l] = new Intl.NumberFormat(l, { style: 'currency', currency: 'EUR', currencyDisplay: 'narrowSymbol' }))).format(n); };

const EUR3_FMT = {};

const eur3 = (n) => { if (n === null || n === undefined) return '–'; const l = uiLoc(); return (EUR3_FMT[l] || (EUR3_FMT[l] = new Intl.NumberFormat(l, { style: 'currency', currency: 'EUR', currencyDisplay: 'narrowSymbol', minimumFractionDigits: 2, maximumFractionDigits: 3 }))).format(n); };
const eurIst = (o) => (o && o.valued_items === 0 && o.unvalued_items > 0 ? '–' : eur(o.actual_net));

const fileUrl = (id) => `/api/files/${encodeURIComponent(id)}${S.viewEnv && S.me && S.me.role === 'owner' ? '?env=' + encodeURIComponent(S.viewEnv) : ''}`;
const isMgr = () => S.me && ['owner', 'fleet'].includes(S.me.role);


const noTr = (s) => `<span translate="no">${esc(s)}</span>`;

function plate(p, opts = {}) {
  const txt = esc(p || '—');
  return `<span class="plate${opts.big ? ' big' : ''}${opts.locked ? ' locked' : ''}" translate="no" aria-label="${esc(t('plate_label'))} ${txt}"><span class="eu">D</span><span class="num">${txt}</span></span>`;
}




function timeoutSignal(ms) {
  try { if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) return AbortSignal.timeout(ms); } catch {}
  if (typeof AbortController === 'undefined') return undefined;
  const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal;
}


const START_TIMEOUT_MS = 15000, OFFLINE_GET_TIMEOUT_MS = 8000;
async function api(method, path, body, extra = {}) {

  if (S.quietHome && method === 'GET' && !extra.bg) extra = { ...extra, bg: true };

  if (S.quietBg && method === 'GET' && !extra.bg) extra = { ...extra, bg: true };
  const headers = { 'x-cfp': '1', ...(extra.headers || {}), ...(extra.bg ? { 'x-cfp-bg': '1' } : {}) };

  if (S.lang && !headers['x-cfp-lang']) headers['x-cfp-lang'] = S.lang;

  if (method === 'GET' && path.startsWith('/api/notifications') && !headers['x-cfp-device']) { try { headers['x-cfp-device'] = deviceId(); } catch {   } }
  if (S.viewEnv && S.me && S.me.role === 'owner') headers['x-cfp-env'] = S.viewEnv;

  if (extra.env && S.me && S.me.role === 'owner') headers['x-cfp-env'] = extra.env;


  if (method !== 'GET' && ((S.me && S.me.id) || extra.asUser) && !path.startsWith('/api/logout')) {
    headers['x-cfp-user'] = extra.asUser || S.me.id;

    if (S.me && S.me.role !== 'owner' && (extra.env || S.me.environment)) headers['x-cfp-env-of'] = extra.env || S.me.environment;
  }
  let b = body;
  if (body !== undefined && !(body instanceof Blob) && !(body instanceof ArrayBuffer) && typeof body !== 'string') { b = JSON.stringify(body); headers['content-type'] = 'application/json'; }
  let res;
  if (!extra.bg) lastApiAt = Date.now();



  if (method === 'GET' && S.offlineStart && !extra.bg) extra = { ...extra, timeoutMs: Math.min(extra.timeoutMs || OFFLINE_GET_TIMEOUT_MS, OFFLINE_GET_TIMEOUT_MS) };
  const sig = extra.timeoutMs ? timeoutSignal(extra.timeoutMs) : undefined;
  let t0 = Date.now();


  const preQ = window.__cfpPre, pre = preQ && preQ.shift();
  const usePre = !!pre && method === 'GET' && path === pre[0];
  if (!usePre || !preQ.length) window.__cfpPre = null;
  if (usePre) t0 = window.__cfpMeT0 || t0;

  const preWait = (pr) => (!extra.timeoutMs ? pr : Promise.race([pr, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), extra.timeoutMs))]));
  try { res = usePre ? await preWait(pre[1]) : await fetch(path, { method, headers, body: b, credentials: 'same-origin', ...(sig ? { signal: sig } : {}) }); }
  catch { const e = new Error(t('offline')); e.offline = true; throw e; }
  try { clockSample(res.headers.get('date'), t0, Date.now()); } catch {}


  if (res.status === 401 && (extra.bg || extra.keepDirty) && viewDirty()) {
    if (!S.authLostShown) { S.authLostShown = true; toast(t('session_lost_dirty'), true); }
    const e = new Error(t('err_unauthenticated')); e.status = 401; throw e;
  }








  if (res.status === 401 && !path.startsWith('/api/login') && !path.startsWith('/api/invite') && !path.startsWith('/api/setup')) { const h0 = (location.hash || '').replace(/%3A/gi, ':'); const fromPush = pushNavFresh(h0); const kept = authLostKeep(); resetUserState(kept); clearOfflineData(); markSession(''); if (kept) setTimeout(() => toast(t('session_expired_kept')), 300); if (/^#\/(new|check|v)\/VIN:[A-Z0-9]+$/.test(h0) || (fromPush && AFTER_LOGIN_RX.test(h0))) { try { sessionStorage.setItem('cfp_after_login', h0); } catch {} } location.hash = '#/login'; const e = new Error(t('err_unauthenticated')); e.status = 401; throw e; }
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : await res.blob();

  if (data instanceof Blob && res.headers.get('x-cfp-truncated')) data.cfpTruncated = Number(res.headers.get('x-cfp-truncated')) || true;
  if (!res.ok) {

    const code = data && data.error;
    let tr = srvText(code, data && data.message);

    if (code === 'forbidden' && data && typeof data.denied === 'string') { const fx = forbiddenText(data); if (fx) tr = fx; }

    if (code === 'insufficient_stock' && tr && data && typeof data.available === 'number') tr = t('err_insufficient_stock_q').replace('{q}', fmtNum(data.available)).replace('{u}', unitL(data.unit)) + (data.no_stock_hint ? ' ' + t('stock_no_stock_hint') : '');
    const e = new Error(tr || (data && data.message) || `${t('error')} ${res.status}`); e.code = code; e.status = res.status; e.data = data instanceof Blob ? null : data;

    if (code === 'user_mismatch' || code === 'env_mismatch') setTimeout(() => location.reload(), 2500);
    throw e;
  }

  if (method !== 'GET' && VEH_CHANGE_RE.test(path)) setTimeout(() => vehCacheRefresh(true), 0);
  return data;
}
const VEH_CHANGE_RE = /^\/api\/(vehicles(\/import|\/[^/?]+\/(active|drivers))?|assignments\/[^/?]+)(\?|$)/;


function forbiddenText(d) {
  const lb = (k, v) => { if (typeof v !== 'string' || !/^[a-z_]{1,40}$/.test(v)) return '–'; const x = t(k + v); return x === k + v ? '–' : x; };
  const st = (k) => lb(k, d.status);
  if (d.denied === 'action_not_allowed') return t('err_action_not_allowed').replace('{a}', () => lb('act_', d.action)).replace('{s}', () => st('st_'));
  if (d.denied === 'inspection_not_allowed') return t('err_inspection_not_allowed').replace('{r}', () => t('st_in_reparatur')).replace('{s}', () => st('st_'));
  if (d.denied === 'fine_action_not_allowed') return t('err_fine_action_not_allowed').replace('{s}', () => st('fs_'));
  return null;
}
function srvText(code, msg) {
  if (code === 'validation' && S.lang === 'de') return deLimitText(msg);

  { const m = code === 'too_many' && /^Maximal (\d+) Dokumente je Fahrzeug/.exec(msg || ''); if (m && S.lang !== 'de') return t('docs_full').replace('{max}', m[1]); }

  if (code === 'forbidden' && S.lang !== 'de') return translateValidation(S.lang, msg) || (STRINGS[S.lang] && STRINGS[S.lang].err_forbidden) || null;
  return (code && S.lang !== 'de' && ((STRINGS[S.lang] && STRINGS[S.lang]['err_' + code]) || translateValidation(S.lang, msg))) || null;
}


const reasonText = (r) => { const x = translateImportReason(S.lang, r); return typeof x === 'string' ? x.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (d, y, m, dd) => (isCalDay(+y, +m, +dd) ? fmtD(d) : d)) : x; };
const isCalDay = (y, m, d) => { const x = new Date(Date.UTC(y, m - 1, d)); return m >= 1 && m <= 12 && x.getUTCFullYear() === y && x.getUTCMonth() === m - 1 && x.getUTCDate() === d; };



function announce(msg) {
  let live = document.getElementById('live');
  if (!live) { live = document.createElement('div'); live.id = 'live'; live.className = 'sr-only'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); document.body.appendChild(live); }
  live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 50);
}
const announceHits = (n) => announce(n ? tn('search_hits_n', n) : t('search_no_hits'));
function toast(msg, err = false) {
  if (msg === '✓') msg = '✓ ' + t('saved_ok');

  let live = document.getElementById('live');
  if (!live) { live = document.createElement('div'); live.id = 'live'; live.className = 'sr-only'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); document.body.appendChild(live); }
  if (!err) { live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 50); }
  const el = document.createElement('div');
  el.className = 'toast' + (err ? ' err' : ''); el.dataset.at = String(Date.now());
  if (err) el.setAttribute('role', 'alert'); else el.setAttribute('aria-hidden', 'true');
  el.textContent = msg;


  if (err) document.querySelectorAll('.toast.err').forEach((x) => x.remove());
  const ms = err ? Math.min(20000, Math.max(6000, 2500 + String(msg).length * 60)) : 3000;
  let timer = setTimeout(() => el.remove(), ms);
  if (err) {
    el.title = t('tap_to_close');
    el.addEventListener('click', () => el.remove());
    el.addEventListener('pointerenter', () => clearTimeout(timer));
    el.addEventListener('pointerleave', () => { clearTimeout(timer); timer = setTimeout(() => el.remove(), 4000); });
  }
  document.body.appendChild(el);
}




const plateCmp = (a, b) => String(a || '').localeCompare(String(b || ''), 'de', { numeric: true });

const vOverdue = (v) => !v.eval_excluded && ((v.next_due && v.next_due < bDate()) || (v.km_remaining !== null && v.km_remaining !== undefined && v.km_remaining < 0));


const comboSideOk = (x) => !!x && !x.eval_excluded && x.availability === 'einsatzbereit_lt_system' && !x.failed_inspection && !x.reinspection_open && !vOverdue(x);
const comboClearV = (v) => v.kind === 'lkw' && !!v.coupled && v.coupled.kind === 'anhaenger' && comboSideOk(v) && comboSideOk(v.coupled);



const SK_CYR = { 'а': 'a', 'в': 'b', 'е': 'e', 'к': 'k', 'м': 'm', 'н': 'h', 'о': 'o', 'р': 'p', 'с': 'c', 'т': 't', 'у': 'y', 'х': 'x', 'і': 'i' };
const searchKey = (x) => String(x || '').normalize('NFC').toLowerCase().replace(/[\s\-./_\u2010-\u2014\u202a-\u202e\u2066-\u2069]/g, '').replace(/[авекмнорстухі]/g, (c) => SK_CYR[c]);

function markInvalid(el, msg, after = el) {
  if (!el) return;
  const id = 'err_' + String(el.id || el.getAttribute('aria-labelledby') || el.getAttribute('name') || 'feld').replace(/[^\w-]/g, '_');
  let p = document.getElementById(id);
  if (!p) { p = document.createElement('p'); p.id = id; p.className = 'small fielderr'; after.insertAdjacentElement('afterend', p); }
  p.textContent = msg;
  el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', id);
  const clear = () => { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); p.remove(); el.removeEventListener('input', clear); el.removeEventListener('change', clear); };
  el.addEventListener('input', clear); el.addEventListener('change', clear);
}


const ICON = {
  home: '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  cases: '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/></svg>',
  plus: '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>',
  truck: '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 6h11v10H2zM13 9h4l4 4v3h-8z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>',
  bell: '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4"/></svg>',
  more: '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  search: '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  chart: '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
};



const TAB_SHY = { Abfahrtskontrolle: 'Abfahrts\u00ADkontrolle', Kontrolle: 'Kon\u00ADtrolle', Management: 'Manage\u00ADment', 'Übersicht': 'Über\u00ADsicht', 'Vorgänge': 'Vor\u00ADgänge', Fahrzeuge: 'Fahr\u00ADzeuge',
  Overview: 'Over\u00ADview', Vehicles: 'Vehi\u00ADcles', 'Повідомити': 'Пові\u00ADдомити', 'Транспорт': 'Тран\u00ADспорт', 'Керівництво': 'Керів\u00ADництво', 'Перевірка': 'Пере\u00ADвірка', 'виїздом': 'ви\u00ADїздом', 'Заявки': 'Заяв\u00ADки' };
const tabShy = (label) => String(label).split(' ').map((w) => TAB_SHY[w] || w).join(' ');
function frame(content, active) {
  const env = S.me ? (S.viewEnv && S.me.role === 'owner' ? S.viewEnv : S.me.environment) : null;
  const tabs = [];
  tabs.push(['#/', 'home', t('nav_home'), 'home']);
  tabs.push(['#/cases', 'cases', t('nav_cases'), 'cases']);
  if (S.me.role !== 'viewer') tabs.push(['#/new', 'plus', t('nav_new'), 'new']);
  if (isMgr()) tabs.push(['#/master', 'chart', t('nav_master'), 'master']);
  else if (S.me.role !== 'driver') tabs.push(['#/vehicles', 'truck', t('nav_vehicles'), 'vehicles']);
  else tabs.push(['#/check', 'truck', t('nav_check_tab'), 'check', t('nav_check')]);
  tabs.push(['#/more', 'more', t('nav_more'), 'more']);
  return `<a class="skip" href="#main">${esc(t('skip_to_content'))}</a>
  <header class="topbar">
    <div class="brand">CEVIK <span class="bn">${esc(t('app'))}</span> <small>[CLAUDE]</small></div>
    <div class="spacer"></div>
    ${S.me.role === 'owner' ? `<select id="envsel" aria-label="${esc(t('env_switch'))}"><option value="production"${env === 'production' ? ' selected' : ''}>${esc(t('env_prod'))}</option><option value="test"${env === 'test' ? ' selected' : ''}>${esc(t('env_testname'))}</option></select>` : ''}
    ${S.me.role !== 'driver' ? `<a href="#/search" class="tbicon" aria-label="${esc(t('search_title'))}" aria-keyshortcuts="/" title="${esc(t('search_title'))} (/)" style="color:#fff">${ICON.search}</a>` : ''}
    <a href="#/inbox" class="tbicon" aria-label="${esc(bellLabel())}" style="position:relative;color:#fff">${ICON.bell}${S.unread ? `<span class="badge" aria-hidden="true" style="position:absolute;top:2px;right:0">${S.unread}</span>` : ''}</a>
  </header>
  ${env === 'test' ? `<div class="testband">${esc(t('env_test'))}</div>` : ''}
  ${clockText() ? `<div class="clockband" role="status">${esc(clockText())}</div>` : ''}
  <nav class="tabbar" aria-label="${esc(t('navigation'))}">${tabs.map(([href, icon, label, key, full]) => `<a href="${href}"${full && full !== label ? ` aria-label="${esc(full)}"` : ''} class="${key === active ? 'active' : ''}${key === 'new' ? ' report' : ''}"${key === active ? ' aria-current="page"' : ''}>${key === 'new' ? `<span class="dot">${ICON[icon]}</span>` : ICON[icon]}<span>${esc(tabShy(label))}</span></a>`).join('')}</nav>
  <main id="main" tabindex="-1">${content}</main>`;
}

function render(html, active, { defer = false } = {}) {


  const same = !!(S.me && S.lastHash && (location.hash || '#/').replace(/%3A/gi, ':') === S.lastHash);
  const interim = html === `<p class="muted">${esc(t('loading'))}</p>`;
  if (same) keepCapture(); else { S.keep = null; S.actSince = []; }

  if (document.documentElement.lang !== S.lang) document.documentElement.lang = S.lang;
  document.getElementById('app').innerHTML = S.me ? frame(html, active) : `<main>${html}</main>`;
  const sk = $('.skip'); if (sk) sk.onclick = (e) => { e.preventDefault(); $('#main').focus(); };
  const es = $('#envsel');
  if (es) es.onchange = () => { S.viewEnv = es.value; try { localStorage.setItem('cfp_env', es.value); } catch {} S.unread = 0; refreshUnread();

    const m = location.hash.match(/^#\/(cases|inspect|fines|drivers)\/[^?]+/);
    if (m) { location.hash = m[1] === 'fines' ? '#/fines' : m[1] === 'drivers' ? '#/drivers' : '#/cases'; return; }
    route(); };
  stackTables(document.getElementById('app'));
  markToggles(document.getElementById('app'));
  bindOutbox();
  if (same && interim) return;
  pageTitle();
  S.renderSame = same;

  if (same && S.keep) { if (defer) S.pendingRestore = true; else keepRestore(); } else window.scrollTo(0, 0);
  if (!interim && S.restoreScroll != null) { const y = S.restoreScroll; S.restoreScroll = null; requestAnimationFrame(() => window.scrollTo(0, y)); }
}
function finishRender() { if (S.pendingRestore) { S.pendingRestore = false; if (S.keep) keepRestore(); } }



function pageTitle() {
  const app = `CEVIK ${t('app')}`;
  const h = document.querySelector('#app h1');

  const head = h ? (h.dataset.title || h.textContent).replace(/\s+/g, ' ').trim().slice(0, 80) : '';
  const title = head && head !== app ? `${head} – ${app}` : app;
  if (document.title !== title) document.title = title;
}


const TOGGLE_ATTRS = ['av', 'clf', 'cf', 'qk', 'tt', 'tf', 'af', 'wl', 'dq', 'ud', 'mf', 'vk'];
function markToggles(root) {
  for (const b of root.querySelectorAll(TOGGLE_ATTRS.map((a) => `button.btn[data-${a}]`).join(','))) {
    if (b.hasAttribute('aria-pressed') || b.hasAttribute('aria-selected')) continue;
    b.setAttribute('aria-pressed', String(!b.classList.contains('secondary')));
  }
}


const STACK_CV_MIN = 100;
function stackTables(root) {
  for (const tb of root.querySelectorAll('table.stack')) {
    const heads = [...tb.querySelectorAll('thead th')].map((th) => th.textContent.trim());
    for (const tr of tb.querySelectorAll('tbody tr')) [...tr.children].forEach((td, i) => { if (heads[i] && !td.dataset.label && !(td.colSpan > 1)) td.dataset.label = heads[i]; });

    tb.classList.toggle('bigstack', tb.tBodies.length > 0 && tb.tBodies[0].rows.length > STACK_CV_MIN);
  }
}



let fieldSeq = 0;
function labelFix(root) {
  for (const el of root.querySelectorAll('input:not([type=hidden]),select,textarea')) {
    if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.closest('label')) continue;
    if (el.id && root.querySelector(`label[for="${CSS.escape(el.id)}"]`)) continue;
    const prev = el.previousElementSibling;
    if (prev && prev.tagName === 'LABEL' && !prev.htmlFor) { if (!el.id) el.id = `f${++fieldSeq}`; prev.htmlFor = el.id; continue; }
    if (el.placeholder) el.setAttribute('aria-label', el.placeholder);
  }
}
{
  let queued = false;
  const app = document.getElementById('app');
  if (app && typeof MutationObserver !== 'undefined') new MutationObserver(() => { if (queued) return; queued = true; queueMicrotask(() => { queued = false; labelFix(app); }); }).observe(app, { childList: true, subtree: true });
}


const routes = [
  [/^#\/login$/, viewLogin], [/^#\/setup$/, viewSetup], [/^#\/invite\/(.+)$/, viewInvite],
  [/^#\/?$/, viewHome], [/^#\/cases(?:\?f=\w+)?$/, viewCases], [/^#\/cases\/([\w-]+)$/, viewCase], [/^#\/new$/, viewNew], [/^#\/new\/multi$/, viewNewMulti], [/^#\/new\/(VIN:[A-Z0-9]+)$/, viewNew], [/^#\/vehicles\/qr$/, viewQrSheet], [/^#\/v\/(VIN:[A-Z0-9]+)$/, viewScan], [/^#\/check\/(VIN:[A-Z0-9]+)$/, viewDepartureCheck], [/^#\/vehicles\/qr\/(VIN:[A-Z0-9]+)$/, viewQrSheet],
  [/^#\/vehicles(?:\?f=\w+)?$/, viewVehicles], [/^#\/vehicles\/(VIN:[A-Z0-9]+)$/, viewVehicle], [/^#\/vehicles\/(VIN:[A-Z0-9]+)\?ev=([\w-]+)$/, viewVehicle], [/^#\/vehicles\/(VIN:[A-Z0-9]+)\?sec=tires$/, (vid) => viewVehicle(vid, null, 'tires')], [/^#\/vehicles\/(VIN:[A-Z0-9]+)\?sec=wo$/, (vid) => viewVehicle(vid, null, 'wo')], [/^#\/vehicles\/(VIN:[A-Z0-9]+\?done=[\w-]+)$/, (x) => viewVehicle(x.split('?done=')[0], null, 'done:' + x.split('?done=')[1])], [/^#\/vehicles\/(VIN:[A-Z0-9]+)\/timeline(?:\?f=(\w+))?$/, viewTimeline], [/^#\/inbox$/, viewInbox], [/^#\/push$/, () => { location.replace(notifHref({})); }],
  [/^#\/master(?:\?(q|sev)=([^&]*))?$/, viewMaster], [/^#\/plan(?:\?s=(mdue))?$/, (sec) => viewPlan(sec)], [/^#\/users$/, viewUsers], [/^#\/settings(?:\?s=([a-z_]+))?$/, (sec) => viewSettings(sec)], [/^#\/more(?:\?o=(sess))?$/, (o) => viewMore(o)],
  [/^#\/check$/, viewDepartureCheck], [/^#\/check\/paper$/, viewCheckPaper], [/^#\/guide(?:\?l=(de|uk|en))?$/, (l) => viewDriverGuide(l)], [/^#\/stock$/, viewStock], [/^#\/stock\/reorder$/, viewReorder], [/^#\/stock\/journal$/, viewStockJournal], [/^#\/stock\/usage$/, viewPartsUsage], [/^#\/stock\/receipt$/, viewStockReceipt], [/^#\/stock\/count$/, viewStockCount], [/^#\/stock\/asof$/, viewStockAsOf], [/^#\/fines$/, viewFines], [/^#\/drivers$/, viewDrivers], [/^#\/tacho$/, viewTacho], [/^#\/tacho\/history$/, viewTachoHistory], [/^#\/contracts$/, viewContracts], [/^#\/claims$/, viewClaims], [/^#\/drivers\/records$/, viewDriverRecords], [/^#\/drivers\/([\w-]+)$/, viewDriver], [/^#\/costs$/, viewCosts], [/^#\/kpi$/, viewKpi], [/^#\/defects$/, viewDefects], [/^#\/audit(?:\?u=([\w-]+))?$/, (u) => viewAudit(false, u)], [/^#\/audit\?v=(VIN:[A-Z0-9]+)$/, (v) => viewAudit(false, undefined, v)], [/^#\/usage$/, viewUsage], [/^#\/readiness$/, viewReadiness], [/^#\/quality(?:\?f=(\w+))?$/, viewQuality], [/^#\/wsload$/, viewWsLoad], [/^#\/telematics$/, viewTelematics], [/^#\/help(?:\?s=([\w-]+))?(?:[?&]q=([^&#]*))?$/, viewHelp], [/^#\/search$/, viewSearch], [/^#\/emergency(?:\?v=(VIN:[A-Z0-9]+)(?:&from=file)?)?$/, viewEmergency], [/^#\/emergency\/edit$/, viewEmergencyEdit], [/^#\/tires(?:\?f=\w+)?$/, viewFleetTires], [/^#\/maintenance(?:\?f=(gaps|due|noplan|all))?$/, viewMaint], [/^#\/maintenance\/multi$/, viewMaintMulti], [/^#\/fines\/([\w-]+)$/, viewFine], [/^#\/stock\/([\w-]+)$/, viewStockItem], [/^#\/inspect\/([\w-]+)$/, viewInspection],
];

const VS_KEYS = { cases: 'caseVsite', vehicles: 'vehSite', plan: 'planVsite', tires: 'tireSite', quality: 'dqSite', maintenance: 'maintSite', tacho: 'tachoSite' };
function applySiteJump(h) {
  const m = h.match(/^#\/(\w+)\?(.*)$/); if (!m) return h;
  const p = new URLSearchParams(m[2]); if (!p.has('vs')) return h;
  const v = String(p.get('vs') || '').slice(0, 80); p.delete('vs');
  const k = VS_KEYS[m[1]]; if (k && S.me && S.me.role !== 'driver') S[k] = v === '*' ? '' : v;

  if (m[1] === 'cases' && S.me && S.me.role !== 'driver') { S.caseWs = null; S.caseLimit = null; }
  const q = p.toString(); const nh = h.slice(0, h.indexOf('?')) + (q ? '?' + q : '');
  try { history.replaceState(history.state, '', nh); } catch {}
  return nh;
}
const routeArg = (x) => { if (x === undefined) return undefined; try { return decodeURIComponent(x); } catch { return x; } };


const AFTER_LOGIN_RX = /^#\/((new|check|v)\/VIN:[A-Z0-9]+|cases\/[\w-]+|fines\/[\w-]+|vehicles\/(VIN|VIN%3A)[:A-Z0-9]+|more\?o=sess|push)$/;
const PUSH_NAV_MS = 2 * 60 * 1000;
function pushNavFresh(h) { const p = S.pushNav; return !!p && String(p.hash || '').replace(/%3A/gi, ':') === h && Date.now() - p.at < PUSH_NAV_MS; }
async function route() {

  let h = (location.hash || '#/').replace(/%3A/gi, ':');


  { const base = h.split('?')[0]; if (S.toastPage && S.toastPage !== base) document.querySelectorAll('.toast.err').forEach((x) => { if (Date.now() - Number(x.dataset.at || 0) > 1500) x.remove(); }); S.toastPage = base; }
  const pub = /^#\/(login|setup|invite\/)/.test(h);

  const gen = S.routeGen = (S.routeGen || 0) + 1;
  try { await langReady; } catch { return; }
  await ensureLang(S.lang);
  try {
    if (!S.me && !pub) {
      try {


        const r = await api('GET', '/api/me', undefined, { timeoutMs: START_TIMEOUT_MS }); S.me = r.user; markSession(r.user.id); lastActivity = Date.now(); h = idleResume(r.user.id, h); S.lang = r.user.language || S.lang; S.offlineStart = false;

        if (r.user.language && r.user.role !== 'workshop') { try { if (!localStorage.getItem('cfp_lang_pending')) localStorage.setItem('cfp_lang', r.user.language); } catch {} }

        let pl = null; try { pl = localStorage.getItem('cfp_lang_pending'); } catch {}
        const m = pl && pl.match(/^(.+):(de|uk|en)$/);
        if (m && m[1] === S.me.id) { if (m[2] !== S.lang) { S.lang = S.me.language = m[2]; await api('PATCH', '/api/me', { language: m[2] }).catch(() => {}); } try { localStorage.removeItem('cfp_lang_pending'); } catch {} }
      }
      catch (err) {

        const cached = err.offline ? offlineSession() : null;
        if (!cached) { const st = await api('GET', '/api/setup/status', undefined, { timeoutMs: START_TIMEOUT_MS }).catch(() => ({})); if (!st.needs_setup && AFTER_LOGIN_RX.test(h)) { try { sessionStorage.setItem('cfp_after_login', h); } catch {} } location.hash = st.needs_setup ? '#/setup' : '#/login'; return; }
        S.me = cached.me; S.meta = cached.meta; S.lang = S.me.language || S.lang; S.offlineStart = true;
      }
      await ensureLang(S.lang);
      if (S.me.role === 'owner') S.viewEnv = localStorage.getItem('cfp_env') || null;

      { const pe = new URLSearchParams(location.search).get('env'); if (pe) { pushEnv(pe); history.replaceState(history.state, '', location.pathname + location.hash); } }
      if (!S.offlineStart) {

        try { S.meta = await api('GET', '/api/meta', undefined, { timeoutMs: START_TIMEOUT_MS }); }
        catch (err) { const c = err.offline ? offlineSession() : null; if (!c || c.me.id !== S.me.id) throw err; S.meta = c.meta; }
        saveOfflineSession();
        refreshUnread();
        pushRebind();
      }
    }
    h = applySiteJump(h);


    { const vm = S.me && S.me.role === 'driver' && h.match(/^#\/vehicles\/(VIN:[A-Z0-9]+)(?:[/?].*)?$/); if (vm) { h = '#/v/' + vm[1]; try { history.replaceState(history.state, '', location.pathname + location.search + h); } catch {   } } }
    for (const [re, fn] of routes) {
      const m = h.match(re);
      if (!m) continue;

      await fn(...m.slice(1).map(routeArg));



      if (gen !== S.routeGen) { if ((S.routeDone || 0) > gen) route(); else S.routeStale = S.routeGen; return; }
      S.routeDone = gen;
      if (S.routeStale === gen) { S.routeStale = 0; route(); return; }


      const ae = document.activeElement;
      if (S.lastHash && S.lastHash !== h && !(ae && ae !== document.body && ae.matches('input, select, textarea, [data-keepfocus]') && ae.closest('#main, main'))) { const h1 = document.querySelector('#main h1, main h1'); if (h1) { h1.tabIndex = -1; h1.focus({ preventScroll: true }); } }
      S.lastHash = h;
      if (S.me && navigator.onLine !== false) flushOutbox();
      return;
    }
    location.hash = '#/';
  } catch (e) {
    if (gen !== S.routeGen) return;

    const gone = e && (e.status === 403 || e.status === 404);


    const oev = e && e.status === 404 && e.data && S.me && S.me.role === 'owner' && ['test', 'production'].includes(e.data.other_environment) ? e.data.other_environment : '';
    const lnk = !oev && e && e.status === 404 && /^#\/(cases|fines)\/[\w-]+$/.test(h);
    const envNm = (x) => t(x === 'test' ? 'env_testname' : 'env_prod');
    render(`<h1 tabindex="-1" id="errh">${esc(t('page_unavailable'))}</h1><div class="panel alert" role="alert"><p>${esc(e.message)}</p>${oev ? `<p>${esc(t('link_other_env').replace('{env}', envNm(oev)).replace('{cur}', envNm(oev === 'test' ? 'production' : 'test')))}</p>` : ''}${lnk ? `<p class="small">${esc(t('link_no_access_hint'))}</p>` : ''}${oev ? `<div class="actions"><button type="button" class="btn" id="rlenv">${esc(t('link_switch_env').replace('{env}', envNm(oev)))}</button><a class="btn secondary" href="#/" id="rlhome">${esc(t('to_overview'))}</a></div>` : gone ? `<a class="btn" href="#/" id="rlhome">${esc(t('to_overview'))}</a>` : `<button class="btn" id="rl">${esc(t('retry'))}</button>`}</div>`);
    const rl = document.getElementById('rl'); if (rl) rl.onclick = () => location.reload();
    const re = document.getElementById('rlenv'); if (re) re.onclick = () => { if (pushEnv(oev)) route(); };
    const eh = document.getElementById('errh'); if (eh) eh.focus({ preventScroll: true });
  }
}


const NAV_SCROLL = new Map(); let navCur = null; let navSeq = Date.now();
function navMark(initial = false) {
  if (!initial && navCur !== null) NAV_SCROLL.set(navCur, window.scrollY);
  const st = history.state && history.state.cfpNav;
  if (st) { navCur = st; S.restoreScroll = initial ? null : (NAV_SCROLL.has(st) ? NAV_SCROLL.get(st) : null); return; }
  navCur = ++navSeq; S.restoreScroll = null;
  try { history.replaceState({ ...(history.state && typeof history.state === 'object' ? history.state : {}), cfpNav: navCur }, ''); } catch {   }
}
navMark(true);
window.addEventListener('hashchange', () => navMark());
window.addEventListener('hashchange', route);

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || e.defaultPrevented || !e.target || !e.target.closest) return;
  if (e.target.closest('#af')) { const c = document.getElementById('ac'); if (c) { e.preventDefault(); c.click(); } return; }
  const fm = e.target.closest('form[data-mdone]');
  if (fm) { e.preventDefault(); fm.hidden = true; const b = document.querySelector(`button[data-done="${CSS.escape(fm.dataset.mdone)}"]`); if (b) { b.setAttribute('aria-expanded', 'false'); b.focus(); } }
});



function slashTarget(key, mods, editable, role, hash) {
  if (key !== '/' || mods || editable) return null;
  const h = String(hash || '');
  if (h.startsWith('#/help')) return 'hq';
  if (!role || role === 'driver') return null;
  return h.startsWith('#/search') ? 'gq' : 'nav';
}
document.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.isComposing) return;
  const el = e.target; const editable = !!(el && (el.isContentEditable || (el.closest && el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]'))));
  const tg = slashTarget(e.key, e.ctrlKey || e.metaKey || e.altKey, editable, S.me && S.me.role, location.hash);
  if (!tg) return;
  if (tg === 'nav') { e.preventDefault(); location.hash = '#/search'; return; }
  const inp = document.getElementById(tg); if (!inp) return;
  e.preventDefault(); inp.focus(); try { inp.select(); } catch {   }
});


function noteAction(el) {
  const scope = el && el.closest && (el.closest('form') || el.closest('details, section, .panel, .row, .actions, li, tr') || el);
  if (scope) S.actSince = [...(S.actSince || []).slice(-19), scope];
}




document.addEventListener('submit', (e) => {
  const form = e.target, h = form && form.onsubmit;
  if (typeof noteAction === 'function') noteAction(form);
  if (typeof h !== 'function') return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (form.cfpBusy) return;
  form.cfpBusy = true; form.setAttribute('aria-busy', 'true');
  let p; try { p = h.call(form, e); } catch (err) { p = Promise.reject(err); }
  Promise.resolve(p).catch((err) => { if (!onUnhandledApiError(err)) throw err; }).finally(() => { form.cfpBusy = false; form.removeAttribute('aria-busy'); });
}, true);





const pasteNum = (raw, numeric = false) => {
  let s = String(raw || '').trim(); if (!s || s.length > 40) return null;
  if (numeric) s = s.replace(/^(km[-\s]?stand|kilometerstand|kilometer|tachostand|tacho|km|км|пробіг|пробег|odometer(?:\s+reading)?|mileage)\s*[:.=]?\s*(?=\d)/i, '');
  s = s.replace(/^(€|eur)\s*/i, '').replace(/\s*(€|eur|km|км)\.?$/i, '').replace(/[\s    '’]/g, '');
  return /^-?\d[\d.,]*$/.test(s) ? s : null;
};
document.addEventListener('paste', (e) => {
  const el = e.target; if (!el || el.tagName !== 'INPUT' || !/^(numeric|decimal)$/.test(el.getAttribute('inputmode') || '') || el.readOnly || el.disabled) return;
  const raw = e.clipboardData ? e.clipboardData.getData('text') : ''; const v = pasteNum(raw, el.getAttribute('inputmode') === 'numeric');
  if (v === null || v === String(raw).trim()) return;
  e.preventDefault();
  try { el.setRangeText(v, el.selectionStart ?? el.value.length, el.selectionEnd ?? el.value.length, 'end'); } catch { el.value = v; }
  el.dispatchEvent(new Event('input', { bubbles: true }));
});


const MONEY_FIELD = /^(amount_eur|amount_net|appraisal_net|deductible_net|reimbursed_net|monthly_rate_net|unit_price_net)$/;
document.addEventListener('change', (e) => {
  const el = e.target; if (!el || el.tagName !== 'INPUT' || el.readOnly || el.disabled) return;
  if (!(MONEY_FIELD.test(el.name || '') || el.id === 'ie_price' || /^rcp\d+$/.test(el.id || ''))) return;

  const fx = moneyForeign(el.value); if (fx) { el.setCustomValidity(t('money_fx').replace('{c}', () => fx)); el.dataset.cfpFx = '1'; el.reportValidity(); return; }

  if (el.name === 'monthly_rate_net') { const rp = ratePeriod(el.value); if (rp && rp.period !== 'month') { el.setCustomValidity(t('rate_per').replace('{p}', () => t('rp_' + rp.period))); el.dataset.cfpFx = '1'; el.reportValidity(); return; }
    if (rp) { el.value = rp.value; el.dispatchEvent(new Event('input', { bubbles: true })); } }
  const w = moneyIn(el.value); if (w === null) return;
  const v = /^\d+\.\d{2}$/.test(w) ? decIn(w) : w; if (v === el.value) return;
  el.value = v; el.dispatchEvent(new Event('input', { bubbles: true }));
}, true);
document.addEventListener('input', (e) => { const el = e.target; if (el && el.dataset && el.dataset.cfpFx) { delete el.dataset.cfpFx; el.setCustomValidity(''); } }, true);


const KM_FIELD = /^(km|odometer_km|done_km|due_km|last_done_km|next_due_km)$/;
document.addEventListener('change', (e) => {
  const el = e.target; if (!el || el.tagName !== 'INPUT' || el.readOnly || el.disabled || el.getAttribute('inputmode') !== 'numeric') return;
  if (!(KM_FIELD.test(el.name || '') || /^(km|kfkm|extkmv|tfkm)$/.test(el.id || ''))) return;

  const fu = kmForeignUnit(el.value); if (fu) { el.setCustomValidity(t(fu === 'mi' ? 'km_mi' : 'km_hrs')); el.dataset.cfpFx = '1'; el.reportValidity(); return; }
  const v = kmIn(el.value); if (v === null || v === el.value) return;
  el.value = v; el.dispatchEvent(new Event('input', { bubbles: true }));
}, true);


const UNIT_FIELD = { tread_mm: 'mm', pressure_bar: 'bar', interval_months: 'months', interval_km: 'km', zgm_kg: 'kg' };
document.addEventListener('change', (e) => {
  const el = e.target; if (!el || el.tagName !== 'INPUT' || el.readOnly || el.disabled) return;
  const k = UNIT_FIELD[el.name || ''] || (el.id === 'mci' ? 'months' : null); if (!k) return;

  if (k === 'kg' && massTonnes(el.value)) { el.setCustomValidity(t('zgm_t_hint')); el.dataset.cfpFx = '1'; el.reportValidity(); return; }
  const v = unitIn(el.value, k); if (v === null || v === el.value) return;
  el.value = v; el.dispatchEvent(new Event('input', { bubbles: true }));
}, true);


document.addEventListener('change', (e) => {
  const el = e.target; if (!el || el.tagName !== 'INPUT' || el.readOnly || el.disabled || !el.hasAttribute('data-tiresize')) return;
  const v = tireSizeFmt(el.value); if (v === null || v === el.value) return;
  el.value = v; el.dispatchEvent(new Event('input', { bubbles: true }));
}, true);






const PD_MON = { jan: 1, jän: 1, feb: 2, mär: 3, mar: 3, mrz: 3, apr: 4, mai: 5, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, dez: 12, dec: 12,
  січ: 1, лют: 2, бер: 3, кві: 4, тра: 5, чер: 6, лип: 7, сер: 8, вер: 9, жов: 10, лис: 11, гру: 12,
  янв: 1, фев: 2, мая: 5, май: 5, июн: 6, июл: 7, авг: 8, сен: 9, окт: 10, ноя: 11, дек: 12, апр: 4 };
const PD_FULL = ['januar', 'january', 'jänner', 'februar', 'february', 'märz', 'march', 'april', 'juni', 'june', 'juli', 'july', 'august', 'sept', 'september', 'oktober', 'october', 'november', 'dezember', 'december'];
const pasteDate = (raw, year, toBerlin) => {
  let s = String(raw || '').replace(/[   ]/g, ' ').trim().toLowerCase(); if (!s || s.length > 120) return null;
  const found = []; const cut = (m) => { s = s.slice(0, m.index) + ' '.repeat(m[0].length) + s.slice(m.index + m[0].length); };
  const yr = (y) => { if (y.length === 4) return Number(y); const n = 2000 + Number(y); return n <= year + 20 ? n : n - 100; };
  const mon = (w) => { const k = w.replace(/\.$/, ''); if (k.length < 3 || k.length > 12) return 0;
    if (/^[a-zäöü]+$/.test(k) && k.length > 3 && !PD_FULL.includes(k)) return 0;
    return PD_MON[k.slice(0, 3)] || 0; };
  let m;
  const iso = /(^|[^\d])(\d{4})-(\d{2})-(\d{2})(t\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(z|[+-]\d{2}:?\d{2}))?(?!\d)/;
  while ((m = iso.exec(s))) {
    if (m[5] && toBerlin) { const b = toBerlin(m[0].slice(m[1].length).toUpperCase()); if (b) { const [y, mo, d] = b.split('-'); found.push([Number(y), Number(mo), Number(d)]); cut(m); continue; } }
    found.push([Number(m[2]), Number(m[3]), Number(m[4])]); cut(m);
  }
  const numRx = /(^|[^\d])(\d{1,2})\s*([./-])\s*(\d{1,2})\s*\3\s*(\d{4}|\d{2})(?!\d)/;
  while ((m = numRx.exec(s))) {
    let d = Number(m[2]); let mo = Number(m[4]); if (m[3] === '/' && mo > 12 && d <= 12) [d, mo] = [mo, d];
    found.push([yr(m[5]), mo, d]); cut(m);
  }
  const nameRx = /(^|[^\d])(\d{1,2})(?:st|nd|rd|th)?\.?\s*(?:de\s+)?([a-zäöüа-яёіїєґ]{3,12}\.?),?\s*(\d{4})(?!\d)/;
  while ((m = nameRx.exec(s))) { const mo = mon(m[3]); if (!mo) { cut(m); continue; } found.push([Number(m[4]), mo, Number(m[2])]); cut(m); }
  const enRx = /(^|[^a-z])([a-z]{3,9}\.?)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})(?!\d)/;
  while ((m = enRx.exec(s))) { const mo = mon(m[2]); if (!mo) { cut(m); continue; } found.push([Number(m[4]), mo, Number(m[3])]); cut(m); }
  if (!found.length) return { e: /(^|[^\d.\/])(0?[1-9]|1[0-2])\s*[./-]\s*(\d{4})(?!\d)/.test(s) ? 'month' : 'none' };
  const fmt = ([y, mo, d]) => `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const uniq = [...new Set(found.map(fmt))];
  if (uniq.length > 1) return { e: 'many' };
  const [y, mo, d] = found[0]; const x = new Date(Date.UTC(y, mo - 1, d));
  if (mo < 1 || mo > 12 || d < 1 || y < 1900 || x.getUTCMonth() !== mo - 1 || x.getUTCDate() !== d) return { e: 'invalid', x: uniq[0] };
  return { d: uniq[0] };
};




const pasteTime = (raw) => {
  let s = ' ' + String(raw || '').replace(/[   ]/g, ' ').trim().toLowerCase() + ' '; if (s.length > 122) return null;
  const found = []; let bad = false; const cut = (m) => { s = s.slice(0, m.index) + ' '.repeat(m[0].length) + s.slice(m.index + m[0].length); };
  const put = (h, mi, ap) => { if (ap) { if (h < 1 || h > 12) { bad = true; return; } h = (h % 12) + (ap[0] === 'p' ? 12 : 0); } if (h > 23 || mi > 59) { bad = true; return; } found.push(`${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`); };
  const AP = '\\s*(a\\.?\\s?m\\.?|p\\.?\\s?m\\.?)(?![a-z])';
  const rxs = [
    [new RegExp(`(^|[^\\d:+\\-])(\\d{1,2})[:.](\\d{2})(?::\\d{2}(?:\\.\\d+)?)?${AP}`), (m) => put(Number(m[2]), Number(m[3]), m[4])],
    [new RegExp(`(^|[^\\d:.+\\-])(\\d{1,2})${AP}`), (m) => put(Number(m[2]), 0, m[3])],
    [/(^|[^\d:+\-])(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(?![\d:])/, (m) => put(Number(m[2]), Number(m[3]))],
    [/(^|[^\d:.])(\d{1,2})\.(\d{2})\s*(?:uhr|h)(?![a-z])/, (m) => put(Number(m[2]), Number(m[3]))],
    [/(^|[^\d:.])(\d{1,2})\s*(?:uhr|h)\s*(\d{2})?(?![\d.a-z])/, (m) => put(Number(m[2]), m[3] ? Number(m[3]) : 0)],
  ];
  for (const [rx, f] of rxs) { let m; while ((m = rx.exec(s))) { f(m); cut(m); } }
  if (!found.length && !bad) { const m = s.trim().match(/^(\d{1,2})\.(\d{2})$/); if (m) put(Number(m[1]), Number(m[2])); }
  const uniq = [...new Set(found)];
  if (uniq.length > 1) return { e: 'many' };
  if (bad) return { e: 'invalid' };
  return uniq.length ? { t: uniq[0] } : { e: 'none' };
};

const pasteZoned = (raw, toBerlinDT) => String(raw || '').replace(/(\d{4})-(\d{2})-(\d{2})[tT ](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(z|[+-]\d{2}:?\d{2})(?![\d])/gi, (z) => { const b = toBerlinDT(z.toUpperCase().replace(' ', 'T')); return b ? b.replace('T', ' ') : z; });
const pdErr = (e) => t(e === 'many' ? 'pd_many' : e === 'invalid' ? 'pd_invalid' : e === 'month' ? 'pd_month' : 'pd_none');
const ptErr = (e) => t(e === 'many' ? 'pt_many' : e === 'invalid' ? 'pt_invalid' : 'pt_none');
const pasteSet = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
document.addEventListener('paste', (e) => {
  const el = e.target; if (!el || el.tagName !== 'INPUT' || !['date', 'time', 'datetime-local'].includes(el.type) || el.readOnly || el.disabled) return;
  const raw0 = e.clipboardData ? e.clipboardData.getData('text') : ''; if (!String(raw0).trim()) return;
  const raw = pasteZoned(raw0, berlinLocalDT);
  if (el.type === 'time') {
    const r = pasteTime(raw); if (!r) return;
    e.preventDefault(); if (!r.t) { toast(ptErr(r.e), true); return; }
    pasteSet(el, r.t); if (!el.checkValidity()) el.reportValidity(); return;
  }
  const r = pasteDate(raw, Number(bDate().slice(0, 4)));
  if (!r) return;
  e.preventDefault();
  if (el.type === 'datetime-local') {

    const tr = pasteTime(raw.replace(/(^|[^\d])\d{4}-\d{2}-\d{2}(?=t|\s|$)/gi, '$1 ').replace(/(^|[^\d])\d{1,2}\s*[./-]\s*\d{1,2}\s*[./-]\s*\d{2,4}(?!\d)/g, '$1 ')) || { e: 'none' };
    if (!r.d) { toast(r.e === 'none' && tr.t ? t('pdt_nodate') : pdErr(r.e), true); return; }
    if (!tr.t) { toast(tr.e === 'none' ? t('pdt_notime') : ptErr(tr.e), true); return; }
    pasteSet(el, `${r.d}T${tr.t}`); if (!el.checkValidity()) el.reportValidity(); return;
  }
  if (!r.d) { toast(pdErr(r.e), true); return; }
  pasteSet(el, r.d);

  const tf = el.closest('[data-occ]') && el.closest('[data-occ]').querySelector('input[type=time]');
  if (tf && !tf.disabled) { const tr = pasteTime(raw.replace(/(^|[^\d])\d{4}-\d{2}-\d{2}(?=t|\s|$)/gi, '$1 ').replace(/(^|[^\d])\d{1,2}\s*[./-]\s*\d{1,2}\s*[./-]\s*\d{2,4}(?!\d)/g, '$1 ')); if (tr && tr.t) pasteSet(tf, tr.t); }
  if (!el.checkValidity()) el.reportValidity();
});





const VIN_LBL = /^\s*(?:(?:fin|vin)(?:[-\s.]*(?:nr|nummer|code|no|number|код))?|fahrgestell(?:[-\s.]*(?:nummer|nr))?|fahrzeug[-\s.]*ident(?:ifizierungs|ifikations)?[-\s.]*(?:nummer|nr)|vehicle\s+identification\s+(?:number|no)|chassis(?:[-\s.]*(?:no|number|nr|nummer))?|ідентифікаційний\s+номер(?:\s+транспортного\s+засобу)?|номер\s+(?:шасі|кузова))\.?\s*(?:\(\s*e\s*\)\s*)?[:#=]\s*|^\s*(?:fahrgestell(?:[-\s.]*(?:nummer|nr))?|fahrzeug[-\s.]*ident(?:ifizierungs|ifikations)?[-\s.]*(?:nummer|nr)|vehicle\s+identification\s+(?:number|no)|vin[-\s]?код|ідентифікаційний\s+номер(?:\s+транспортного\s+засобу)?)\.?\s*(?:\(\s*e\s*\)\s*)?/i;
const vinKey = (x) => { let c = String(x || '').normalize('NFKC').replace(/^\s*VIN:/i, '').replace(VIN_LBL, '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (c.length === 20 && /^(FIN|VIN)/.test(c)) c = c.slice(3); return c; };
const vinOf = (raw) => {
  const s = String(raw || '').normalize('NFKC').replace(/[   ]/g, ' ').trim(); if (!s || s.length > 300) return null;
  const all = vinKey(s); if (all.length === 17) return { v: all };
  const ok = (k) => k.length === 17 && /\d/.test(k) && /[A-Z]/.test(k); const found = new Set();
  for (const line of s.split(/[\r\n;,|\t]+/)) {
    const c = vinKey(line); if (ok(c)) { found.add(c); continue; }
    for (const w of line.split(/\s+/)) { const k = vinKey(w); if (ok(k)) found.add(k); }
  }
  if (found.size > 1) return { e: 'many' };
  return found.size ? { v: [...found][0] } : { e: 'none', c: all };
};
const vinCheck = (el) => {
  const box = el.form && el.form.querySelector('#vinchk'); if (!box) return;
  const c = vinKey(el.value); const msg = !c ? '' : /[IOQ]/.test(c) ? t('vin_ioq') : c.length !== 17 ? t('vin_len').replace('{n}', c.length) : '';
  box.textContent = msg; box.hidden = !msg; const w = /[IOQ]/.test(c); box.classList.toggle('panel', w); box.classList.toggle('warn', w); box.classList.toggle('muted', !w);
};
document.addEventListener('paste', (e) => {
  const el = e.target; if (!el || el.tagName !== 'INPUT' || el.name !== 'vin' || el.type === 'hidden' || el.readOnly || el.disabled) return;
  const raw = e.clipboardData ? e.clipboardData.getData('text') : ''; const r = vinOf(raw); if (!r) return;
  if (r.v && r.v === String(raw).trim()) return;
  e.preventDefault();
  if (r.e === 'many') { toast(t('pv_many'), true); return; }
  if (r.e === 'none') { if (!r.c || r.c.length > 25) { toast(t('pv_none'), true); return; } pasteSet(el, r.c); vinCheck(el); return; }
  pasteSet(el, r.v); vinCheck(el);
});
document.addEventListener('input', (e) => { const el = e.target; if (el && el.tagName === 'INPUT' && el.name === 'vin' && el.type !== 'hidden') vinCheck(el); });


const occDescWord = (txt) => {
  let s = ' ' + String(txt || '').toLowerCase().split(/[^\p{L}]+/u).filter(Boolean).join(' ') + ' ';
  const two = [' vorgestern ', ' day before yesterday ', ' позавчора ', ' позавчера '].find((w) => s.includes(w));
  if (two) s = s.split(two).join(' ');
  const one = [' gestern ', ' yesterday ', ' вчора ', ' вчера '].find((w) => s.includes(w));
  if (two && one) return null;
  return two ? { n: 2, w: two.trim() } : one ? { n: 1, w: one.trim() } : null;
};
const occSet = (box, n) => { const el = box && $('#occd', box); if (!el) return; el.value = bDate(-n); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
const occDescUpd = (form) => {
  const box = form && $('[data-occ]', form); const h = form && $('[data-occdesc]', form); const d = form && $('#d', form); const el = box && $('#occd', box);
  if (!h || !d || !el) return;
  const m = el.value ? null : occDescWord(d.value);
  h.hidden = !m; if (!m) { h.textContent = ''; return; }
  h.innerHTML = `ℹ️ ${esc(tfill('occ_desc_hint', { w: m.w, d: fmtD(bDate(-m.n)) }))} <button type="button" class="btn secondary small" data-occd="${m.n}">${esc(t('occ_desc_take'))}</button>`;
};
const occQuickClick = (e) => {
  const b = e.target && e.target.closest ? e.target.closest('[data-occd]') : null; if (!b) return;
  e.preventDefault(); const form = b.closest('form'); const box = form ? $('[data-occ]', form) : b.closest('[data-occ]');
  occSet(box, Number(b.dataset.occd)); if (form) occDescUpd(form);
};
document.addEventListener('click', occQuickClick);
document.addEventListener('input', (e) => { const el = e.target; if (!el || !(el.id === 'd' || el.id === 'occd')) return; const form = el.closest('form'); if (form && $('[data-occ]', form)) occDescUpd(form); });



document.addEventListener('click', (e) => {
  const el = e.target && e.target.closest ? e.target.closest('button, a, [role="button"]') : null;
  if (el && typeof noteAction === 'function') noteAction(el);
  const h = el && el.onclick;
  if (typeof h !== 'function' || h.cfpGuard) return;
  const g = function (ev) {
    if (el.cfpBusy) { ev.preventDefault(); return false; }
    const r = h.call(this, ev);
    if (r && typeof r.then === 'function') {
      el.cfpBusy = true; el.setAttribute('aria-busy', 'true');
      Promise.resolve(r).catch((err) => { if (!onUnhandledApiError(err)) throw err; }).finally(() => { el.cfpBusy = false; el.removeAttribute('aria-busy'); });
    }
    return r;
  };
  g.cfpGuard = true; el.onclick = g;
}, true);



let lastRejectMsg = '', lastRejectAt = 0;
function onUnhandledApiError(err) {
  if (!err || !(err.offline || err.status) || err.status === 401) return false;
  const now = Date.now();
  if (err.message === lastRejectMsg && now - lastRejectAt < 3000) return true;
  lastRejectMsg = err.message; lastRejectAt = now;
  toast(err.message, true);
  return true;
}
window.addEventListener('unhandledrejection', (e) => { if (onUnhandledApiError(e.reason)) e.preventDefault(); });


const OFFLINE_KEY = 'cfp_offline_session';
function saveOfflineSession() {
  try {
    const { id, username, display_name, role, environment, workshop_site, language } = S.me;
    localStorage.setItem(OFFLINE_KEY, JSON.stringify({ me: { id, username, display_name, role, environment, workshop_site, language }, meta: S.meta, saved_at: new Date().toISOString() }));
  } catch {}
}
function offlineSession() { try { const x = JSON.parse(localStorage.getItem(OFFLINE_KEY) || 'null'); return x && x.me && x.meta ? x : null; } catch { return null; } }



const KEEP_STATE = ['lang', 'appVersion', 'meta'];


function resetUserState(keepFor = null) {
  for (const k of Object.keys(S)) if (!KEEP_STATE.includes(k)) delete S[k];
  S.me = null; S.viewEnv = null; S.unread = 0;
  const keep = (k) => k === 'cfp_after_login' || (keepFor && (k === IDLE_KEY || (k.startsWith('cfp_fd_') && k.includes('_' + keepFor + '_'))));
  try { for (const k of Object.keys(sessionStorage)) if (k.startsWith('cfp_') && !keep(k)) sessionStorage.removeItem(k); } catch {}
}




const IDLE_KEY = 'cfp_idle_resume';

function idleKeep(uid = S.me && S.me.id) {
  if (!uid) return null;
  try {
    if (S.me && S.openAct && $('#af') && viewDirty()) actDraftSave(S.openAct.caseId, S.openAct.action);
    const id = uid; const has = Object.keys(sessionStorage).some((k) => k.startsWith('cfp_fd_') && k.includes('_' + id + '_'));
    if (!has) return null;
    sessionStorage.setItem(IDLE_KEY, JSON.stringify({ u: id, page: location.hash || '#/', at: new Date().toISOString() }));
    return id;
  } catch { return null; }
}




function authLostKeep() {
  let id = S.me && S.me.id;
  if (!id) { const o = offlineSession(); id = o && o.me && o.me.id; }
  return id ? idleKeep(id) : null;
}
function idleResume(userId, h) {
  let x = null; try { x = JSON.parse(sessionStorage.getItem(IDLE_KEY) || 'null'); sessionStorage.removeItem(IDLE_KEY); } catch {}
  if (!x || x.u !== userId) {

    try { for (const k of Object.keys(sessionStorage)) if (k.startsWith('cfp_fd_') && !k.includes('_' + userId + '_')) sessionStorage.removeItem(k); } catch {}
    return h;
  }
  const page = String(x.page || '').replace(/%3A/gi, ':');
  if (!/^#\/(cases|inspect|new|check)\b/.test(page) || !['#/', '#', ''].includes(h) || Date.now() - Date.parse(x.at) > FORM_DRAFT_MS) return h;
  try { history.replaceState(history.state, '', location.pathname + location.search + x.page); } catch { return h; }
  setTimeout(() => toast(t('idle_resumed')), 300);
  return page;
}


const SESSION_MARK = 'cfp_session_user';
function markSession(id) { try { if (localStorage.getItem(SESSION_MARK) !== id) localStorage.setItem(SESSION_MARK, id); } catch {} }
window.addEventListener('storage', (e) => {


  if (e.key === SESSION_MARK && !S.me && e.newValue && /^#\/login/.test(location.hash || '')) { afterLogin(); return; }
  if (e.key !== SESSION_MARK || !S.me || S.offlineStart) return;
  if ((e.newValue || '') !== S.me.id) { resetUserState(); location.reload(); }
});
function clearOfflineData() {
  try { for (const k of Object.keys(localStorage)) if (k === OFFLINE_KEY || k.startsWith('cfp_veh_') || k.startsWith('cfp_myveh_') || k.startsWith('cfp_emerg_') || k.startsWith('cfp_inv_')) localStorage.removeItem(k); } catch {}
}



const idleLimitMs = () => { const m = S.me ? Number(S.me.idle_logout_min) : 0; return m > 0 ? m * 60000 : 0; };


let sharedActivityAt = 0;
function syncActivity() {
  try { const v = Number(localStorage.getItem('cfp_last_activity')) || 0; if (v > lastActivity && v <= Date.now() + 5000) lastActivity = v; } catch {}
}
function shareActivity(now) {
  if (now - sharedActivityAt < 5000) return; sharedActivityAt = now;
  try { localStorage.setItem('cfp_last_activity', String(now)); } catch {}
}
function noteActivity(ev) {
  const ms = idleLimitMs(), now = Date.now();
  if (ms) syncActivity();
  if (ms && now - lastActivity > ms) { checkIdle(); return; }
  lastActivity = now; if (ms) shareActivity(now); if (ms && !(ev && ev.target && ev.target.closest && ev.target.closest('#idlebar'))) idleWarn(null);
  if (ms && !S.offlineStart && navigator.onLine !== false && now - lastApiAt > Math.min(60000, ms / 3)) api('GET', '/api/me', undefined, { keepDirty: true }).catch(() => {});
}

function idleWarn(left) {
  let bar = document.getElementById('idlebar');
  if (left === null) { if (bar) bar.remove(); return; }
  if (!bar) {

    bar = document.createElement('div'); bar.id = 'idlebar'; bar.className = 'update-bar'; bar.setAttribute('role', 'alert');
    bar.innerHTML = `<span class="sr-only">${esc(t('idle_warn').replace('{s}', Math.max(1, Math.ceil(left / 1000))))}</span><span aria-hidden="true"></span><button type="button" class="btn">${esc(t('idle_stay'))}</button>`;
    bar.querySelector('button').onclick = () => { lastActivity = Date.now(); idleWarn(null); noteActivity(); };
    document.body.appendChild(bar);
  }
  bar.querySelector('span[aria-hidden]').textContent = t('idle_warn').replace('{s}', Math.max(1, Math.ceil(left / 1000)));
}
async function checkIdle() {
  const ms = idleLimitMs();
  if (ms) syncActivity();
  const left = ms ? ms - (Date.now() - lastActivity) : Infinity;
  idleWarn(left > 0 && left <= 60000 && !idleBusy ? left : null);
  if (!ms || idleBusy || left > 0) return;
  idleBusy = true;



  try { const ep = await pushOffForLogout(); if (!S.offlineStart && navigator.onLine !== false) await api('POST', '/api/logout', { push_endpoint: ep }).catch(() => {}); } catch {}
  const kept = idleKeep();
  clearOfflineData(); resetUserState(kept); markSession(''); idleBusy = false;
  location.hash = '#/login'; toast(t(kept ? 'idle_signed_out_kept' : 'idle_signed_out'));
}
['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => window.addEventListener(ev, noteActivity, { passive: true, capture: true }));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkIdle(); });




function keepActOnHide() {
  try {
    if (!S.me || !S.openAct || !$('#af') || !viewDirty()) return;
    const id = S.openAct.caseId; if (!actDraft(id).load()) S.hideDraft = id;
    actDraftSave(id, S.openAct.action);
  } catch {}
}
function dropHideDraft() {
  const id = S.hideDraft; if (!id) return; S.hideDraft = null;
  if (S.me) actDraft(id).clear();
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') keepActOnHide(); else dropHideDraft(); });
window.addEventListener('pagehide', keepActOnHide);
window.addEventListener('pageshow', (e) => { if (e.persisted) dropHideDraft(); });
setInterval(checkIdle, 5000);


window.addEventListener('online', async () => {
  if (!S.offlineStart) return;
  if (!viewDirty()) { S.offlineStart = false; S.me = null; route(); return; }
  try {
    const r = await api('GET', '/api/me', undefined, { keepDirty: true });

    if (S.me && r.user && r.user.id !== S.me.id) { toast(t('err_user_mismatch'), true); setTimeout(() => location.reload(), 2500); return; }
    S.me = r.user; S.offlineStart = false;
    S.meta = await api('GET', '/api/meta'); saveOfflineSession(); refreshUnread(true); flushOutbox();
  } catch {}
});


let offlineProbeBusy = false;
setInterval(async () => {
  if (!S.offlineStart || offlineProbeBusy || navigator.onLine === false || document.visibilityState === 'hidden') return;
  offlineProbeBusy = true;
  try {
    const r = await api('GET', '/api/me', undefined, { bg: true, keepDirty: true, timeoutMs: START_TIMEOUT_MS });
    if (!S.offlineStart) return;
    if (S.me && r.user && r.user.id !== S.me.id) { toast(t('err_user_mismatch'), true); setTimeout(() => location.reload(), 2500); return; }
    if (!viewDirty()) { S.offlineStart = false; S.me = null; route(); return; }
    S.me = r.user; S.offlineStart = false;
    S.meta = await api('GET', '/api/meta', undefined, { bg: true, timeoutMs: START_TIMEOUT_MS }); saveOfflineSession(); refreshUnread(true); flushOutbox();
  } catch {   } finally { offlineProbeBusy = false; }
}, 30000);

function viewDirty(skip) {
  const m = document.getElementById('main') || document.querySelector('main'); if (!m) return false;
  return [...m.querySelectorAll('input, textarea, select')].some((el) => {
    if (el === skip) return false;
    if (Array.isArray(skip) && skip.includes(el)) return false;
    if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') return false;
    if (el.type === 'file') return !!el.value;
    if (el.type === 'checkbox' || el.type === 'radio') return el.checked !== el.defaultChecked;
    if (el.tagName === 'SELECT') { const d = [...el.options].findIndex((o) => o.defaultSelected); return el.selectedIndex !== (d < 0 ? (el.multiple ? -1 : 0) : d); }
    return el.value !== el.defaultValue;
  });
}








const KEEP_SKIP_TYPES = ['hidden', 'submit', 'button', 'reset', 'image', 'file', 'password'];
const fieldDefault = (el) => (el.type === 'checkbox' || el.type === 'radio') ? String(el.defaultChecked) : el.tagName === 'SELECT' ? [...el.options].map((o) => (o.defaultSelected ? 1 : 0)).join('') + ':' + [...el.options].map((o) => o.value).join('\u0001') : el.defaultValue;
const fieldValue = (el) => (el.type === 'checkbox' || el.type === 'radio') ? el.checked : el.tagName === 'SELECT' ? [...el.options].filter((o) => o.selected).map((o) => o.value) : el.value;
function fieldDirty(el) {
  if (el.type === 'checkbox' || el.type === 'radio') return el.checked !== el.defaultChecked;
  if (el.tagName === 'SELECT') { const d = [...el.options].findIndex((o) => o.defaultSelected); return el.selectedIndex !== (d < 0 ? (el.multiple ? -1 : 0) : d); }
  return el.value !== el.defaultValue;
}
function keepScan(root) {
  const groups = {}, details = new Map(), formKey = new Map(), occ = {};
  let fi = 0;
  const once = (k) => { occ[k] = (occ[k] || 0) + 1; return occ[k] > 1 ? `${k}~${occ[k]}` : k; };
  for (const el of root.querySelectorAll('input, textarea, select')) {
    if (KEEP_SKIP_TYPES.includes(el.type)) continue;
    const f = el.closest('form');
    if (f && !formKey.has(f)) formKey.set(f, once('F:' + (f.id || [...f.attributes].filter((a) => a.name.startsWith('data-')).map((a) => `${a.name}=${a.value}`).join('&') || `#${fi++}`)));
    const fk = once(`${f ? formKey.get(f) : ''}|${el.name || el.id || ''}|${el.tagName}:${el.type}`);
    const gk = f ? formKey.get(f) : 'E:' + fk;
    const g = groups[gk] || (groups[gk] = { sig: [], els: {} });
    g.sig.push(fieldDefault(el)); g.els[fk] = el;
  }
  for (const g of Object.values(groups)) g.sig = g.sig.join('\u0002');
  for (const d of root.querySelectorAll('details')) { const s = d.querySelector('summary'); details.set(once('D:' + (d.id || (s ? s.textContent.trim().slice(0, 80) : ''))), d); }
  return { groups, details };
}
function keepCapture() {
  if (S.keep) return;
  const m = document.getElementById('main');
  if (!m) return;
  const skip = (S.actSince || []).filter(Boolean);
  const { groups, details } = keepScan(m);
  const keep = { env: S.viewEnv || null, y: window.scrollY || 0, groups: {}, open: [] };
  for (const [gk, g] of Object.entries(groups)) {
    const fields = {};
    for (const [fk, el] of Object.entries(g.els)) if (fieldDirty(el) && !skip.some((c) => c === el || (c.contains && c.contains(el)))) fields[fk] = fieldValue(el);
    if (Object.keys(fields).length) keep.groups[gk] = { sig: g.sig, fields };
  }
  for (const [k, d] of details) if (d.open) keep.open.push(k);

  const ae = document.activeElement, app = document.getElementById('app');
  keep.focus = ae && ae !== document.body && app && app.contains(ae) ? focusKey(ae) : null;
  S.keep = keep;
}

function focusKey(el) {
  const attrSel = (x, f = (a) => a.name.startsWith('data-')) => [...x.attributes].filter(f).map((a) => `[${a.name}="${CSS.escape(a.value)}"]`).join('');
  if (el.id) return { sel: '#' + CSS.escape(el.id), text: '' };
  const f = el.closest('form');
  const fsel = f ? (f.id ? 'form#' + CSS.escape(f.id) + ' ' : (attrSel(f) ? 'form' + attrSel(f) + ' ' : '')) : '';
  return { sel: fsel + el.tagName.toLowerCase() + attrSel(el, (a) => a.name.startsWith('data-') || a.name === 'name' || (el.tagName === 'A' && a.name === 'href')), text: (el.textContent || '').trim().slice(0, 80) };
}
function focusRestore(k) {
  if (!k) return;
  let el = null;
  try { const c = [...document.querySelectorAll(k.sel)]; el = c.find((x) => (x.textContent || '').trim().slice(0, 80) === k.text) || (c.length === 1 ? c[0] : null); } catch { el = null; }

  if (!el || el.hidden || !el.getClientRects().length) { el = document.querySelector('#main h1'); if (el) el.tabIndex = -1; }
  if (el) el.focus({ preventScroll: true });
}
function keepRestore() {
  const k = S.keep; S.keep = null; S.actSince = [];
  if (k.env !== (S.viewEnv || null)) { window.scrollTo(0, 0); return; }
  const m = document.getElementById('main');
  if (!m) return;
  const { groups, details } = keepScan(m);
  const changed = [];
  for (const [gk, g] of Object.entries(k.groups)) {
    const ng = groups[gk];
    if (!ng || ng.sig !== g.sig) continue;
    for (const [fk, v] of Object.entries(g.fields)) {
      const el = ng.els[fk];
      if (!el) continue;
      if (el.type === 'checkbox' || el.type === 'radio') { if (el.checked === v) continue; el.checked = v; }
      else if (el.tagName === 'SELECT') { if (!v.every((x) => [...el.options].some((o) => o.value === x))) continue; [...el.options].forEach((o) => { o.selected = v.includes(o.value); }); }
      else { if (el.value === v) continue; el.value = v; }
      changed.push(el);
      for (let d = el.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true;
    }
  }
  for (const key of k.open) { const d = details.get(key); if (d) d.open = true; }
  if (k.focus && (document.activeElement === document.body || !document.activeElement)) focusRestore(k.focus);
  window.scrollTo(0, k.y);

  setTimeout(() => {
    for (const el of changed) { if (!el.isConnected) continue; el.dispatchEvent(new Event('input', { bubbles: true })); if (el.closest('form')) el.dispatchEvent(new Event('change', { bubbles: true })); }
    if (Math.abs((window.scrollY || 0) - k.y) > 2) window.scrollTo(0, k.y);
  }, 0);
}


async function refreshUnread(bg = false) {
  const ev = S.viewEnv;
  const tray = await trayNotifications();
  try { const n = await api('GET', '/api/notifications?count=1' + (tray.length ? '&tray=' + tray.map((x) => x.data.id).join(',') : ''), undefined, { bg });

    if (tray.length && Array.isArray(n.tray_unread)) { const keep = new Set(n.tray_unread); for (const x of tray) if (!keep.has(x.data.id)) { try { x.close(); } catch {   } } }
    if (S.viewEnv !== ev) return; const prev = S.unread; S.unread = n.unread; lastUnreadAt = Date.now(); paintBadge();
    if (bg && n.unread > (prev || 0)) inboxPoll(); if (bg && n.unread > (prev || 0)) { caseAutoRefresh(15000); vehFileAutoRefresh(15000); }     } catch {}
}

async function trayNotifications() {
  try { if (!('serviceWorker' in navigator)) return []; const reg = await navigator.serviceWorker.getRegistration(); if (!reg || !reg.getNotifications) return [];
    return (await reg.getNotifications()).filter((x) => x.data && typeof x.data.id === 'string' && /^[\w-]{1,64}$/.test(x.data.id)).slice(0, 50); } catch { return []; }
}

function bellLabel() { return t('notifications') + (S.unread ? ': ' + S.unread : ''); }

function paintBadge() {
  const a = document.querySelector('.topbar a[href="#/inbox"]'); if (!a) return;
  let b = a.querySelector('.badge');
  a.setAttribute('aria-label', bellLabel());
  if (!S.unread) { if (b) b.remove(); return; }
  if (!b) { b = document.createElement('span'); b.className = 'badge'; b.setAttribute('aria-hidden', 'true'); b.style.cssText = 'position:absolute;top:2px;right:0'; a.appendChild(b); }
  b.textContent = S.unread;
}

let lastUnreadAt = 0;
function pollUnread() {
  if (!S.me || S.offlineStart || navigator.onLine === false || document.visibilityState !== 'visible' || Date.now() - lastUnreadAt < 30000) return;
  lastUnreadAt = Date.now(); refreshUnread(true);
}
document.addEventListener('visibilitychange', pollUnread);
setInterval(pollUnread, 120000);





const HOME_REFRESH_MS = 5 * 60000;




function onPage(...bases) { const h = (location.hash || '#/').replace(/%3A/gi, ':').split('?')[0]; return bases.some((b) => b === h); }
const isHomeHash = () => ['#/', '#', ''].includes(location.hash || '');
async function homeAutoRefresh(minAge) {
  if (!S.me || S.me.role === 'driver' || S.offlineStart || S.quietHome || navigator.onLine === false || document.visibilityState !== 'visible') return;
  if (!isHomeHash() || S.lastHash !== '#/' || !S.homeAt || Date.now() - S.homeAt < minAge) return;
  const ae = document.activeElement;
  if (viewDirty() || (ae && ae.matches && ae.matches('input, select, textarea')) || document.querySelector('dialog[open], .toast.err')) return;
  S.quietHome = true;
  try { await viewHome(); } catch {   S.homeAt = Date.now(); } finally { S.quietHome = false; }
}
setInterval(() => { homeAutoRefresh(HOME_REFRESH_MS); casesAutoRefresh(HOME_REFRESH_MS); planAutoRefresh(HOME_REFRESH_MS); vehAutoRefresh(HOME_REFRESH_MS); }, 30000);
window.addEventListener('focus', () => { homeAutoRefresh(60000); casesAutoRefresh(60000); planAutoRefresh(60000); vehAutoRefresh(60000); });
document.addEventListener('visibilitychange', () => { homeAutoRefresh(60000); casesAutoRefresh(60000); planAutoRefresh(60000); vehAutoRefresh(60000); });






const isPlanHash = () => /^#\/plan(?:\?s=mdue)?$/.test(location.hash || '');
async function planAutoRefresh(minAge) {
  if (!S.me || S.me.role === 'driver' || S.offlineStart || S.quietBg || navigator.onLine === false || document.visibilityState !== 'visible') return;
  if (!isPlanHash() || S.lastHash !== location.hash || !S.planAt || Date.now() - S.planAt < minAge) return;
  const ae = document.activeElement;
  if (viewDirty() || (ae && ae.matches && ae.matches('input, select, textarea')) || document.querySelector('dialog[open], .toast.err')) return;
  S.quietBg = true;
  try { await viewPlan(); } catch { S.planAt = Date.now(); } finally { S.quietBg = false; }
}





const isVehHash = () => (location.hash || '') === '#/vehicles';
async function vehAutoRefresh(minAge) {
  if (!S.me || S.me.role === 'driver' || S.offlineStart || S.quietBg || navigator.onLine === false || document.visibilityState !== 'visible') return;
  if (!isVehHash() || !/^#\/vehicles(?:\?|$)/.test(S.lastHash || '') || !S.vehAt || Date.now() - S.vehAt < minAge) return;
  const ae = document.activeElement;
  if (viewDirty(document.getElementById('q')) || (ae && ae.matches && ae.matches('input, select, textarea')) || document.querySelector('dialog[open], .toast.err')) return;
  const sel = window.getSelection && window.getSelection(); if (sel && !sel.isCollapsed && String(sel).trim()) return;
  S.lastHash = '#/vehicles';
  S.quietBg = true;
  try { await viewVehicles(); } catch { S.vehAt = Date.now(); } finally { S.quietBg = false; }
}






const isStockHash = () => (location.hash || '') === '#/stock';
async function stockAutoRefresh(minAge) {
  if (!S.me || S.me.role === 'driver' || S.offlineStart || S.quietBg || navigator.onLine === false || document.visibilityState !== 'visible') return;
  if (!isStockHash() || S.lastHash !== '#/stock' || !S.stockAt || Date.now() - S.stockAt < minAge) return;
  const ae = document.activeElement;
  if (viewDirty(['q', 'sf', 'ssite'].map((x) => document.getElementById(x)).filter(Boolean)) || (ae && ae.matches && ae.matches('input, select, textarea')) || document.querySelector('dialog[open], .toast.err')) return;
  const sel = window.getSelection && window.getSelection(); if (sel && !sel.isCollapsed && String(sel).trim()) return;
  S.quietBg = true;
  try { await viewStock(); } catch { S.stockAt = Date.now(); } finally { S.quietBg = false; }
}
setInterval(() => stockAutoRefresh(HOME_REFRESH_MS), 30000);
window.addEventListener('focus', () => stockAutoRefresh(60000));
document.addEventListener('visibilitychange', () => stockAutoRefresh(60000));







const isMaintHash = () => /^#\/maintenance(?:\?f=(?:gaps|due|noplan|all))?$/.test(location.hash || '');
async function maintAutoRefresh(minAge) {
  if (!S.me || S.me.role === 'driver' || S.offlineStart || S.quietBg || navigator.onLine === false || document.visibilityState !== 'visible') return;
  if (!isMaintHash() || S.lastHash !== location.hash || !S.maintAt || Date.now() - S.maintAt < minAge) return;
  const ae = document.activeElement;
  if (viewDirty() || (ae && ae.matches && ae.matches('input, select, textarea')) || document.querySelector('dialog[open], .toast.err')) return;
  if (['mhres', 'mimpr', 'rimpr'].some((x) => { const el = document.getElementById(x); return el && el.innerHTML.trim(); }) || document.getElementById('mbres')) return;
  const sel = window.getSelection && window.getSelection(); if (sel && !sel.isCollapsed && String(sel).trim()) return;
  S.quietBg = true;
  try { await viewMaint(); } catch { S.maintAt = Date.now(); } finally { S.quietBg = false; }
}
setInterval(() => maintAutoRefresh(HOME_REFRESH_MS), 30000);
window.addEventListener('focus', () => maintAutoRefresh(60000));
document.addEventListener('visibilitychange', () => maintAutoRefresh(60000));





const isFinesHash = () => (location.hash || '') === '#/fines';
async function finesAutoRefresh(minAge) {
  if (!S.me || S.me.role === 'driver' || S.offlineStart || S.quietBg || navigator.onLine === false || document.visibilityState !== 'visible') return;
  if (!isFinesHash() || S.lastHash !== '#/fines' || !S.finesAt || Date.now() - S.finesAt < minAge) return;
  const ae = document.activeElement;
  if (viewDirty() || (ae && ae.matches && ae.matches('input, select, textarea')) || document.querySelector('dialog[open], .toast.err')) return;
  const sel = window.getSelection && window.getSelection(); if (sel && !sel.isCollapsed && String(sel).trim()) return;
  S.quietBg = true;
  try { await viewFines(); } catch { S.finesAt = Date.now(); } finally { S.quietBg = false; }
}
setInterval(() => finesAutoRefresh(HOME_REFRESH_MS), 30000);
window.addEventListener('focus', () => finesAutoRefresh(60000));
document.addEventListener('visibilitychange', () => finesAutoRefresh(60000));





const isContractsHash = () => (location.hash || '') === '#/contracts';
async function contractsAutoRefresh(minAge) {
  if (!S.me || S.me.role === 'driver' || S.offlineStart || S.quietBg || navigator.onLine === false || document.visibilityState !== 'visible') return;
  if (!isContractsHash() || S.lastHash !== '#/contracts' || !S.ctAt || Date.now() - S.ctAt < minAge) return;
  const ae = document.activeElement;
  if (viewDirty() || (ae && ae.matches && ae.matches('input, select, textarea')) || document.querySelector('dialog[open], .toast.err')) return;
  const imp = document.getElementById('ctimpr'); if ((imp && imp.innerHTML.trim()) || document.querySelector('[data-ctbres]')) return;
  const sel = window.getSelection && window.getSelection(); if (sel && !sel.isCollapsed && String(sel).trim()) return;
  S.quietBg = true;
  try { await viewContracts(); } catch { S.ctAt = Date.now(); } finally { S.quietBg = false; }
}




const isClaimsHash = () => (location.hash || '') === '#/claims';
async function claimsAutoRefresh(minAge) {
  if (!S.me || S.me.role === 'driver' || S.offlineStart || S.quietBg || navigator.onLine === false || document.visibilityState !== 'visible') return;
  if (!isClaimsHash() || S.lastHash !== '#/claims' || !S.clAt || Date.now() - S.clAt < minAge) return;
  const ae = document.activeElement;
  if (viewDirty() || (ae && ae.matches && ae.matches('input, select, textarea')) || document.querySelector('dialog[open], .toast.err')) return;
  const q = document.getElementById('clq'); if (q && q.value.trim() !== (S.clQ || '')) return;
  const sel = window.getSelection && window.getSelection(); if (sel && !sel.isCollapsed && String(sel).trim()) return;
  S.quietBg = true;
  try { await viewClaims(); } catch { S.clAt = Date.now(); } finally { S.quietBg = false; }
}
setInterval(() => { contractsAutoRefresh(HOME_REFRESH_MS); claimsAutoRefresh(HOME_REFRESH_MS); }, 30000);
window.addEventListener('focus', () => { contractsAutoRefresh(60000); claimsAutoRefresh(60000); });
document.addEventListener('visibilitychange', () => { contractsAutoRefresh(60000); claimsAutoRefresh(60000); });





const isDriversHash = () => (location.hash || '') === '#/drivers';
async function driversAutoRefresh(minAge) {
  if (!isMgr() || S.offlineStart || S.quietBg || navigator.onLine === false || document.visibilityState !== 'visible') return;
  if (!isDriversHash() || S.lastHash !== '#/drivers' || !S.drvAt || Date.now() - S.drvAt < minAge) return;
  const ae = document.activeElement;
  if (viewDirty() || (ae && ae.matches && ae.matches('input, select, textarea')) || document.querySelector('dialog[open], .toast.err, [data-dtbdone], [data-dlbdone]')) return;
  const sel = window.getSelection && window.getSelection(); if (sel && !sel.isCollapsed && String(sel).trim()) return;
  S.quietBg = true;
  try { await viewDrivers(); } catch { S.drvAt = Date.now(); } finally { S.quietBg = false; }
}




const isTachoHash = () => (location.hash || '') === '#/tacho';
async function tachoAutoRefresh(minAge) {
  if (!S.me || S.me.role === 'driver' || S.offlineStart || S.quietBg || navigator.onLine === false || document.visibilityState !== 'visible') return;
  if (!isTachoHash() || S.lastHash !== '#/tacho' || !S.tachoAt || Date.now() - S.tachoAt < minAge) return;
  const ae = document.activeElement;
  if (viewDirty() || (ae && ae.matches && ae.matches('input, select, textarea')) || document.querySelector('dialog[open], .toast.err')) return;
  const imp = document.getElementById('timpr'); if (imp && imp.innerHTML.trim()) return;
  const sel = window.getSelection && window.getSelection(); if (sel && !sel.isCollapsed && String(sel).trim()) return;
  S.quietBg = true;
  try { await viewTacho(); } catch { S.tachoAt = Date.now(); } finally { S.quietBg = false; }
}
setInterval(() => { driversAutoRefresh(HOME_REFRESH_MS); tachoAutoRefresh(HOME_REFRESH_MS); }, 30000);
window.addEventListener('focus', () => { driversAutoRefresh(60000); tachoAutoRefresh(60000); });
document.addEventListener('visibilitychange', () => { driversAutoRefresh(60000); tachoAutoRefresh(60000); });






const isTiresHash = () => (location.hash || '') === '#/tires';
async function tiresAutoRefresh(minAge) {
  if (!S.me || S.me.role === 'driver' || S.offlineStart || S.quietBg || navigator.onLine === false || document.visibilityState !== 'visible') return;
  if (!isTiresHash() || !/^#\/tires(?:\?|$)/.test(S.lastHash || '') || !S.tiresAt || Date.now() - S.tiresAt < minAge) return;
  const ae = document.activeElement;
  if (viewDirty() || (ae && ae.matches && ae.matches('input, select, textarea')) || document.querySelector('dialog[open], .toast.err, [data-wobdone], [data-wobfail]')) return;
  const sel = window.getSelection && window.getSelection(); if (sel && !sel.isCollapsed && String(sel).trim()) return;
  S.lastHash = '#/tires';
  S.quietBg = true;
  try { await viewFleetTires(); } catch { S.tiresAt = Date.now(); } finally { S.quietBg = false; }
}
setInterval(() => tiresAutoRefresh(HOME_REFRESH_MS), 30000);
window.addEventListener('focus', () => tiresAutoRefresh(60000));
document.addEventListener('visibilitychange', () => tiresAutoRefresh(60000));







const CASE_REFRESH_MS = 2 * 60000;
const caseHashId = () => { const m = (location.hash || '').match(/^#\/cases\/([\w-]+)$/); return m ? m[1] : null; };
const caseSig = (d) => (d && d.case ? [d.case.version, d.case.status, d.case.safety_lock ? 1 : 0, ...['events', 'files', 'work', 'parts', 'external_costs', 'open_items', 'inspections', 'followups'].map((k) => (Array.isArray(d[k]) ? d[k].length : '')), d.claim ? d.claim.updated_at || '' : ''].join('|') : '');
async function caseAutoRefresh(minAge) {
  const cv = S.caseView;
  if (!cv || !S.me || S.me.role === 'driver' || S.offlineStart || S.quietBg || navigator.onLine === false || document.visibilityState !== 'visible') return;
  if (caseHashId() !== cv.id || S.lastHash !== location.hash || Date.now() - cv.at < minAge) return;
  cv.at = Date.now(); let d;
  S.quietBg = true;
  try { d = await api('GET', '/api/cases/' + encodeURIComponent(cv.id)); } catch { return;   } finally { S.quietBg = false; }
  if (S.caseView !== cv || caseHashId() !== cv.id || S.lastHash !== location.hash) return;
  if (caseSig(d) === cv.sig) return;
  const ae = document.activeElement; const sel = window.getSelection && window.getSelection();
  if (viewDirty() || (ae && ae.matches && ae.matches('input, select, textarea')) || document.querySelector('dialog[open], .toast.err, #lostact') || (sel && !sel.isCollapsed && String(sel).trim())) { caseChangedBanner(d); return; }
  S.quietBg = true;
  try { await viewCase(cv.id, d); toast(t('case_chg_done')); } catch {   } finally { S.quietBg = false; }
}

function caseChangedBanner(d) {
  const m = document.getElementById('main'); if (!m || !d || !d.case) return;
  const txt = t('case_chg_banner').replace('{t}', fmtHM(new Date(nowMs()).toISOString())).replace('{st}', stTxt(d.case));
  let b = document.getElementById('casechg');
  if (!b) { m.insertAdjacentHTML('afterbegin', `<div class="panel warn noprint" id="casechg" role="status"><span></span> · <a href="${esc(location.hash)}" id="casechgre">${esc(t('update_now'))}</a></div>`); b = document.getElementById('casechg');
    b.querySelector('#casechgre').onclick = async (e) => { e.preventDefault(); const id = caseHashId(); if (!id) return; try { await viewCase(id); } catch (err) { toast(err.message, true); } }; }
  b.querySelector('span').textContent = 'ⓘ ' + txt;
}
setInterval(() => caseAutoRefresh(CASE_REFRESH_MS), 30000);





const dataSig = (d) => { const s = JSON.stringify(d) || ''; let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return s.length + ':' + h; };

const vehSig = (d) => dataSig({ ...d, downtime: undefined, agent_findings: (d.agent_findings || []).map((f) => f.id + ':' + f.severity) });
const hashNorm = () => (location.hash || '').replace(/%3A/gi, ':');
async function vehFileAutoRefresh(minAge) {
  const vf = S.vehFile;
  if (!vf || !S.me || S.me.role === 'driver' || S.offlineStart || S.quietBg || navigator.onLine === false || document.visibilityState !== 'visible') return;
  if (hashNorm() !== vf.hash || S.lastHash !== vf.hash || Date.now() - vf.at < minAge) return;
  vf.at = Date.now(); let d;
  S.quietBg = true;
  try { d = await api('GET', '/api/vehicles/' + encodeURIComponent(vf.id)); } catch { return;   } finally { S.quietBg = false; }
  if (S.vehFile !== vf || hashNorm() !== vf.hash) return;
  if (vehSig(d) === vf.sig) return;
  const m = document.getElementById('main'); if (!m) return;
  const txt = t('veh_chg_banner').replace('{t}', fmtHM(new Date(nowMs()).toISOString()));
  let b = document.getElementById('vehchg');
  if (!b) { m.insertAdjacentHTML('afterbegin', `<div class="panel warn noprint" id="vehchg" role="status"><span></span> · <a href="${esc(location.hash)}" id="vehchgre">${esc(t('update_now'))}</a></div>`); b = document.getElementById('vehchg');
    b.querySelector('#vehchgre').onclick = async (e) => { e.preventDefault(); try { await viewVehicle(vf.id); } catch (err) { toast(err.message, true); } }; }
  b.querySelector('span').textContent = 'ⓘ ' + txt;
}
setInterval(() => vehFileAutoRefresh(CASE_REFRESH_MS), 30000);
window.addEventListener('focus', () => vehFileAutoRefresh(60000));
document.addEventListener('visibilitychange', () => vehFileAutoRefresh(60000));
window.addEventListener('focus', () => caseAutoRefresh(60000));
document.addEventListener('visibilitychange', () => caseAutoRefresh(60000));
const isCasesHash = () => /^#\/cases(?:\?f=\w+)?$/.test(location.hash || '');
async function casesAutoRefresh(minAge) {
  const cq = S.casesQuiet;
  if (!cq || !S.me || S.me.role === 'driver' || S.offlineStart || cq.busy || navigator.onLine === false || document.visibilityState !== 'visible') return;
  if (!isCasesHash() || !/^#\/cases(?:\?|$)/.test(S.lastHash || '') || Date.now() - cq.at < minAge) return;
  const ae = document.activeElement; const inp = document.getElementById('cq');
  if ((ae && ae.matches && ae.matches('input, select, textarea')) || (inp && inp.value.trim() !== (S.caseQ || '')) || document.querySelector('dialog[open], .toast.err')) return;
  const sel = window.getSelection && window.getSelection(); if (sel && !sel.isCollapsed && String(sel).trim()) return;
  cq.busy = true;
  try { await cq.fn(); } catch { cq.at = Date.now(); } finally { cq.busy = false; }
}




function orphanOutboxNote() {


  const by = new Map(); const bad = new Map();
  try { for (const k of Object.keys(localStorage)) if (k.startsWith('cfp_outbox_')) for (const x of JSON.parse(localStorage.getItem(k) || '[]')) { const n = x.user_name; if (!n) continue; const m = x.failed ? bad : by; m.set(n, (m.get(n) || 0) + 1); } } catch {}
  const lines = [...[...by].map(([n, c]) => tn('outbox_orphan', c).replaceAll('{name}', n)), ...[...bad].map(([n, c]) => tn('outbox_orphan_failed', c).replaceAll('{name}', n))];
  return lines.length ? `<p class="small alert" id="orphan_outbox" role="note">${lines.map(esc).join('<br>')}</p>` : '';
}


const pwField = (ac, extra = '') => `<div class="pwrow" style="display:flex;gap:6px;align-items:center"><input id="p" type="password" autocomplete="${ac}"${extra} required style="flex:1;min-width:0"><button type="button" class="btn secondary small" id="pwshow" aria-pressed="false" aria-controls="p" style="white-space:nowrap">${esc(t('pw_show'))}</button></div>`;
function bindPwShow() {
  const b = $('#pwshow'); if (!b) return;
  b.onclick = () => { const p = $('#p'); const show = p.type === 'password'; p.type = show ? 'text' : 'password'; b.setAttribute('aria-pressed', String(show)); b.textContent = t(show ? 'pw_hide' : 'pw_show'); };
}
function viewLogin() {
  render(`<div class="center"><form id="f" class="narrow panel">
    <h1>CEVIK ${esc(t('app'))}</h1><p class="muted small">[CLAUDE]</p>
    <label for="u">${esc(t('username'))}</label><input id="u" autocomplete="username" required autocapitalize="none" autocorrect="off" spellcheck="false"><p class="small alert" id="ulatin" role="alert" hidden>${esc(t('login_latin_hint'))}</p>
    <label for="p">${esc(t('password'))}</label>${pwField('current-password')}
    <div class="actions"><button class="btn block">${esc(t('login'))}</button></div>${orphanOutboxNote()}
    <details class="small" style="margin-top:8px"><summary>${esc(t('forgot_pw'))}</summary><p class="muted">${esc(t('forgot_pw_hint'))}</p></details>
    ${langSelect()}
  </form></div>`);
  bindLang(); bindPwShow(); loginSessionNote();
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    try {


      const un = $('#u').value.replace(/\s+/g, ''); const ul = $('#ulatin');
      if (/[\u0400-\u04FF]/.test(un)) { ul.hidden = false; $('#u').focus(); return; }
      ul.hidden = true;


      const r = await api('POST', '/api/login', { username: un, password: $('#p').value, device_id: deviceId() }, { timeoutMs: SEND_TIMEOUT_MS });
      if (r.second_factor) { await viewLoginCode(r.challenge); return; }
      afterLogin();
    } catch (err) { toast(err.message, true); }
  };
}




async function loginSessionNote() {
  let mark = ''; try { mark = localStorage.getItem(SESSION_MARK) || ''; } catch {}
  if (!mark) return;
  let u = null; try { const r = await fetch('/api/me', { credentials: 'same-origin', headers: { 'x-cfp': '1' } }); if (r.ok) u = (await r.json()).user; } catch {}
  const f = $('#f'); if (!u || !f || !/^#\/login/.test(location.hash || '') || $('#already')) return;
  f.insertAdjacentHTML('afterbegin', `<div class="panel good" id="already" role="status"><p>${esc(t('login_already').replace('{name}', u.display_name || u.username))}</p><div class="actions"><a class="btn block" href="#/" id="alreadygo">${esc(t('login_continue'))}</a></div></div>`);
  $('#alreadygo').onclick = (e) => { e.preventDefault(); afterLogin(); };
}

function deviceId() {
  try {
    let d = localStorage.getItem('cfp_device');
    if (!/^[0-9a-f]{32}$/.test(d || '')) { d = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join(''); localStorage.setItem('cfp_device', d); }
    return d;
  } catch { return undefined; }
}
function afterLogin() { S.me = null; let next = '#/'; try { next = sessionStorage.getItem('cfp_after_login') || '#/'; sessionStorage.removeItem('cfp_after_login'); } catch {} location.hash = next; route(); }
async function viewLoginCode(...a) { return (await lazyModule('konto')).viewLoginCode(...a); }
function langSelect() {
  return `<label for="lang">${esc(t('language'))}</label><select id="lang"><option value="de" lang="de"${S.lang === 'de' ? ' selected' : ''}>Deutsch</option><option value="uk" lang="uk"${S.lang === 'uk' ? ' selected' : ''}>Українська</option><option value="en" lang="en"${S.lang === 'en' ? ' selected' : ''}>English</option></select><p class="small muted" id="langmt">${esc(t('lang_browser_hint'))}</p>`;
}
function bindLang(save = false) {
  const l = $('#lang');

  if (l) l.onchange = async () => { S.lang = l.value; try { localStorage.setItem('cfp_lang', l.value); } catch {} if (save) { if (S.me) { S.me.language = l.value; saveOfflineSession(); } await api('PATCH', '/api/me', { language: l.value }).then(() => { try { localStorage.removeItem('cfp_lang_pending'); } catch {} }).catch((err) => { if (err.offline && S.me) try { localStorage.setItem('cfp_lang_pending', `${S.me.id}:${l.value}`); } catch {} }); } route(); };
}
async function viewSetup(...a) { return (await lazyModule('konto')).viewSetup(...a); }
async function viewInvite(...a) { return (await lazyModule('konto')).viewInvite(...a); }





const partsPartialRow = (pw) => (pw.partial_count ? `<dt>${esc(t('pp_label'))}</dt><dd id="pwpartial"><span class="chip mittel">${esc(t('pp_count').replace('{n}', pw.partial_count))}</span> <span class="small">${esc(t('pp_last'))} ${fmtDT(pw.last_partial_at)}${pw.last_partial_by ? ' · ' + esc(pw.last_partial_by) : ''}</span>${pw.last_partial_file ? `<br><span class="small" id="pwdlv">📎 ${esc(t('dlv_file'))}: <a href="${fileUrl(pw.last_partial_file.id)}" target="_blank" rel="noopener">${esc(pw.last_partial_file.name || t('dlv_file'))}</a></span>` : ''}${pw.original_note ? `<br><span class="small muted">${esc(t('pp_orig'))}: ${esc(pw.original_note)}</span>` : ''}</dd>` : '');
const partsWaitRows = (pw) => `${pw.note ? `<dt>${esc(t(pw.partial_count ? 'parts_wait_still' : 'parts_wait_for'))}</dt><dd id="pwnote">${esc(pw.note)} <span class="muted small">· ${esc(t('parts_wait_since'))} ${fmtDT(pw.since)}</span></dd>` : ''}${pw.postponed || pw.last_change_note ? `<dt>${esc(t('parts_eta_changes'))}</dt><dd id="pwmoves">${pw.postponed ? `<span class="chip mittel">${esc(tn('parts_postponed', pw.postponed))}</span>${pw.first_eta ? ` <span class="small">${esc(t('parts_first_eta'))} ${fmtD(pw.first_eta)}</span>` : ''}` : ''}${pw.last_change_note ? `${pw.postponed ? '<br>' : ''}<span class="small">${esc(t('parts_last_change'))} (${fmtDT(pw.last_change_at)}): ${esc(pw.last_change_note)}</span>` : ''}</dd>` : ''}` + partsPartialRow(pw);


const partsWaitDays = (c) => (c.status_since ? Math.max(0, Math.round((Date.parse(bDate()) - Date.parse(BERLIN_FMT.format(new Date(c.status_since)))) / 864e5)) : null);
const partsWaitList = (c) => {
  if (c.status !== 'wartet_teile') return '';
  const d = partsWaitDays(c);
  return `${c.parts_wait_note ? ` · <span data-pwnote>${esc(t('parts_wait_for'))}: ${ltxt(clipTxt(c.parts_wait_note, 60))}</span>` : ''}${d ? ` · <b data-pwdays>${esc(t('parts_wait_days').replace('{d}', nDays(d)))}</b>` : ''}${c.parts_expected_date ? '' : ` <span class="chip mittel" data-pwnoeta>${esc(t('parts_eta_none'))}</span>`}`;
};
const partsEta = (c, sep = ' · ', label = true) => c.status === 'wartet_teile' && c.parts_expected_date ? `${sep}<b>${label ? esc(t('parts_eta')) + ' ' : ''}${fmtD(c.parts_expected_date)}</b>${c.parts_expected_date < bDate() ? ` <span class="chip kritisch">${esc(t('parts_eta_passed'))}</span>` : ''}` : '';



const wsFlowKey = () => 'cfp_wsflow_' + (S.me ? S.me.id : '');
function wsFlow() {
  let hidden = false; try { hidden = localStorage.getItem(wsFlowKey()) === '1'; } catch {}
  const q = (k) => t('act_' + k);
  const steps = [t('wsf_1').replace('{a}', () => q('acknowledge')), t('wsf_2').replace('{a}', () => q('start_repair')), t('wsf_3').replace('{a}', () => q('record_work')).replace('{b}', () => q('add_part')),
    t('wsf_4').replace('{a}', () => q('wait_parts')).replace('{b}', () => q('resume_repair')), t('wsf_5').replace('{a}', () => q('inspection')).replace('{b}', () => q('request_quality_check')), t('wsf_6')];
  return `<details class="panel noprint" id="wsflow"${hidden ? '' : ' open'}><summary><b>${esc(t('wsf_title'))}</b></summary><ol style="margin:8px 0 4px;padding-left:1.4em">${steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>${hidden ? '' : `<div class="actions"><button type="button" class="btn secondary" id="wsflowhide">${esc(t('wsf_hide'))}</button></div>`}</details>`;
}
function bindWsFlow() {
  const b = $('#wsflowhide'); if (!b) return;
  b.onclick = () => { try { localStorage.setItem(wsFlowKey(), '1'); } catch {} const d = $('#wsflow'); if (d) d.open = false; b.closest('.actions').remove(); };
}



const dayRank = (c) => (c.priority === 'kritisch' || c.safety_lock ? 0 : c.priority === 'mittel' ? 1 : 2);
const dayOrder = (a, b) => dayRank(a) - dayRank(b) || String(a.created_at).localeCompare(String(b.created_at)) || String(a.id).localeCompare(String(b.id));


const early = (p) => { p.catch(() => {}); return p; };
async function workshopBoard() {



  const pOpen = api('GET', '/api/cases?status=open&limit=500'), pOv = early(api('GET', '/api/maintenance')), pNr = early(api('GET', '/api/me/inspections-without-result'));
  const pRi = early(api('GET', '/api/cases?' + caseFilterQ('open_items') + '&limit=200')), pWin = early(wsWinter(vsDef('tireSite')));
  const pMine = early(api('GET', '/api/cases?' + caseFilterQ('mine') + '&limit=500'));
  const open = (await pOpen).cases.filter((c) => c.access !== 'read');
  const lanes = [
    ['ws_to_ack', open.filter((c) => c.status === 'werkstatt_freigegeben' && !c.workshop_ack_at)],
    ['ws_to_start', open.filter((c) => c.status === 'werkstatt_freigegeben' && c.workshop_ack_at)],
    ['st_in_reparatur', open.filter((c) => c.status === 'in_reparatur')],

    ['st_wartet_teile', open.filter((c) => c.status === 'wartet_teile').sort((a, b) => String(a.status_since || a.updated_at).localeCompare(String(b.status_since || b.updated_at)))],
    ['st_abschlusskontrolle', open.filter((c) => c.status === 'abschlusskontrolle')],
    ['ws_preview', open.filter((c) => c.status === 'gemeldet')],
  ];


  const today = bDate();
  const passed = open.filter((c) => c.status === 'werkstatt_freigegeben' && c.planned_date && c.planned_date < today).sort((a, b) => a.planned_date.localeCompare(b.planned_date) || dayOrder(a, b));
  const todayL = open.filter((c) => ['werkstatt_freigegeben', 'in_reparatur', 'wartet_teile'].includes(c.status) && c.planned_date === today).sort(dayOrder);
  if (todayL.length) lanes.unshift(['ws_planned_today', todayL]);

  const fromInsp = open.filter((c) => c.maintenance_event_id && ['werkstatt_freigegeben', 'in_reparatur', 'wartet_teile'].includes(c.status));
  if (fromInsp.length) lanes.unshift(['ws_from_inspection', fromInsp]);


  const costWait = open.filter((c) => c.cost_over_limit_at);
  if (costWait.length) lanes.unshift(['cost_approval_pending', costWait]);
  const partsDue = open.filter((c) => c.status === 'wartet_teile' && c.parts_expected_date && c.parts_expected_date <= bDate(1)).sort((a, b) => a.parts_expected_date.localeCompare(b.parts_expected_date) || dayOrder(a, b));
  if (partsDue.length) lanes.unshift(['ws_parts_due', partsDue]);


  if (passed.length) lanes.unshift(['todo_plan_passed', passed]);

  const rep = open.filter((c) => recentRepeat(c));
  if (rep.length) lanes.unshift(['ws_repeat', rep]);



  let mineIds = null; try { mineIds = new Set((await pMine).cases.map((c) => c.id)); } catch {}
  const WORKING = (c) => ['in_reparatur', 'wartet_teile', 'abschlusskontrolle'].includes(c.status) || (c.status === 'werkstatt_freigegeben' && c.workshop_ack_at);
  const mineL = mineIds ? open.filter((c) => WORKING(c) && mineIds.has(c.id)) : [];
  if (mineL.length && mineL.length < open.filter(WORKING).length) { const i = lanes.findIndex(([k]) => k === 'ws_to_ack'); lanes.splice(i, 0, ['ws_mine', mineL]); }


  const STEP_KEYS = ['ws_to_ack', 'ws_to_start', 'st_in_reparatur', 'st_wartet_teile', 'st_abschlusskontrolle', 'ws_preview'];
  const shown = lanes.filter(([, l]) => l.length);
  const above = new Map();
  for (const [k, l] of shown) if (!STEP_KEYS.includes(k)) for (const c of l) { if (!above.has(c.id)) above.set(c.id, []); above.get(c.id).push(t(k)); }
  const total = new Set(shown.flatMap(([, l]) => l.map((c) => c.id))).size;
  const alsoAbove = (c) => (above.has(c.id) ? `<b data-alsoabove>↑ ${esc(t('ws_also_above'))}: ${esc(above.get(c.id).join(' · '))}</b> · ` : '');
  let noteDone = false;
  const dupNote = (k) => { if (noteDone || !above.size || !STEP_KEYS.includes(k)) return ''; noteDone = true; return `<p class="small muted" id="wsdupnote">${esc(tn('ws_dup_note', total))}</p>`; };

  const mySite = S.me.workshop_site ? wsName(S.me.workshop_site) : '';
  let html = wsFlow() + (shown.map(([k, l]) => `${dupNote(k)}<h2>${esc(t(k))} <span class="chip">${l.length}</span></h2>${k === 'ws_planned_today' && l.length > 1 ? `<p class="small muted" id="wsdayorder">${esc(t('day_order_hint'))}</p>` : ''}${k === 'ws_parts_due' && l.some(pdrOn) ? `<p class="small" data-wspdr>🚚 <b>${esc(t('ws_pdr_due').replace('{n}', l.filter(pdrOn).length))}</b> – ${esc(t('ws_pdr_due_hint'))}</p>` : ''}${k === 'ws_mine' ? `<p class="small muted" id="wsminehint">${esc(t('ws_mine_hint'))} <a href="${esc(hj('#/cases?f=mine'))}">${esc(t('show_in_list'))} ›</a></p>` : ''}${caseList(l, '', STEP_KEYS.includes(k) ? alsoAbove : null)}${k === 'ws_repeat' ? `<p class="small"><a href="${esc(hj('#/cases?f=repeat'))}">${esc(t('show_in_list'))} ›</a></p>` : ''}`).join('') || `<p class="muted" data-wsempty>${esc(mySite ? t('no_cases_ws').replace('{w}', () => mySite) : t('no_cases'))}</p>`);
  if (mySite) html = `<p class="small muted" data-wssite>${esc(t('ws_site_lbl'))} <b>${esc(mySite)}</b></p>` + html;
  try {
    const ov = await pOv;

    const kmDueNow = (r) => ['ueberfaellig', 'faellig'].includes(r.km_status);
    const soon = ov.rows.filter((r) => (r.days !== null && r.days <= 14) || kmDueNow(r));
    if (soon.length) html += `<h2>${esc(t('inspections_due'))} (≤ ${esc(nDays(14))}${soon.some(kmDueNow) ? ' ' + esc(t('ws_due_km_suffix')) : ''})</h2><div class="list">${soon.map((r) => `<a class="row ${r.status === 'ueberfaellig' ? 'p-kritisch' : 'p-mittel'}" href="#/vehicles/${encodeURIComponent(r.vehicle_id)}">${plate(r.plate)}<span class="title">${esc(mkR(r))}${r.days !== null && r.days <= 14 ? ' · ' + fmtD(r.next_due_date) : ''}${kmDueNow(r) ? ` · ${esc(t('due_at_km'))} ${fmtKm(r.next_due_km)} (${r.km_remaining < 0 ? esc(t('km_over')) + ' ' + fmtKm(-r.km_remaining) : esc(t('km_left')) + ' ' + fmtKm(r.km_remaining)})` : ''}</span><span class="chip ${r.status === 'ueberfaellig' ? 'kritisch' : 'mittel'}">${esc(t('ms_' + r.status))}${kmUnclearDateDue(r) ? ' · ' + esc(t('ms_' + r.date_status)) : ''}</span>${r.km_unclear ? `<span class="sub km-unclear">${esc(t('km_unclear_drop').replace('{d}', fmtD(r.km_drop_at)))}</span>` : ''}</a>`).join('')}</div><p class="small" style="margin-top:8px"><a href="#/plan?s=mdue">${esc(t('wplan'))}: ${esc(t('wplan_mdue'))} ›</a> <span class="muted">${esc(t('ws_mdue_link_hint'))}</span></p>`;

    const dw = ov.defects_without_case || [];
    if (dw.length) html += `<h2>${esc(t('ws_defects_pending'))} <span class="chip">${dw.length}</span></h2><p class="small muted">${esc(t('ws_defects_hint'))}</p><div class="list">${dw.map((x) => `<a class="row p-kritisch" href="#/vehicles/${encodeURIComponent(x.vehicle_id)}">${plate(x.plate)}<span class="title">${esc(mk(x.kind))} · ${fmtD(x.done_date)}</span><span class="chip kritisch">${esc(t('res_' + x.result))}</span></a>`).join('')}</div>`;

    const rm = ov.report_missing || [];
    if (rm.length) html += `<h2 id="wsnr">${esc(t('todo_report_missing'))} <span class="chip">${rm.length}${(ov.lists_truncated || []).includes('report_missing') ? '+' : ''}</span></h2><p class="small muted">${esc(t('ws_nr_hint'))}</p><div class="list">${rm.map((x) => `<a class="row" href="#/vehicles/${encodeURIComponent(x.vehicle_id)}">${plate(x.plate)}<span class="title">${esc(mk(x.kind))} · ${fmtD(x.done_date)}</span><span class="chip">${esc(t('nr_go'))} ›</span></a>`).join('')}</div>`;
  } catch {}

  try {
    const nr = (await pNr).items;
    if (nr.length) html += `<h2>${esc(t('res_missing_mine'))} <span class="chip">${nr.length}</span></h2><p class="small muted">${esc(t('res_missing_hint'))}</p><div class="list">${nr.map((r) => `<a class="row" href="#/vehicles/${encodeURIComponent(r.vehicle_id)}?ev=${encodeURIComponent(r.id)}">${plate(r.plate)}<span class="title">${esc(mk(r.kind))} · ${fmtD(r.done_date)}</span><span class="chip">${esc(t('res_add_go'))} ›</span></a>`).join('')}</div>`;
  } catch {}

  try {
    const ri = (await pRi).cases;
    if (ri.length) html += `<h2 id="wsoi">${esc(t('filter_open_items'))} <span class="chip">${ri.length}</span></h2><p class="small muted">${esc(t('ws_open_items_hint'))}</p>${caseList(ri.slice(0, 10))}<p class="small"><a href="${esc(hj('#/cases?f=open_items'))}">${esc(t('show_in_list'))} ›</a></p>`;
  } catch {}

  html += await pWin;
  return html + `<p class="navlinks"><a href="${esc(hj('#/cases'))}">${esc(t('all'))}</a> <a href="#/plan">${esc(t('wplan'))} ›</a></p>${helpLink('ws')}`;
}


function hj(href) {
  const r = S.me && S.me.role; let s = null;


  if (r === 'owner' || r === 'fleet' || r === 'workshop') s = '*';
  else if (r === 'dispatch') s = S.me.home_site && !S.dispoAll ? S.me.home_site : '*';
  return s === null ? href : href + (href.includes('?') ? '&' : '?') + 'vs=' + encodeURIComponent(s);
}
async function viewHome() {
  if (!S.quietHome) render(`<p class="muted">${esc(t('loading'))}</p>`, 'home');


  if (S.me.role !== 'driver' && mayReport() && navigator.onLine) vehCacheRefresh();
  let d, cases;


  const mvP = S.me.role === 'driver' ? early(api('GET', '/api/me/vehicles')) : null;


  const finP = S.me.role === 'driver' ? early(api('GET', '/api/fines')) : null;
  const boardP = S.me.role === 'workshop' ? early(workshopBoard()) : S.me.role !== 'driver' && isMgr() ? early(fleetTodo()) : null;
  try {

    const dsite = S.me.role === 'dispatch' && S.me.home_site && !S.dispoAll ? '&vsite=' + encodeURIComponent(S.me.home_site) : '';


    [d, cases] = await Promise.all([api('GET', '/api/dashboard' + (dsite ? '?' + dsite.slice(1) : '')), api('GET', '/api/cases?status=open&limit=8' + dsite).then((r) => r.cases)]);
  } catch (err) {
    if (!err.offline || S.me.role !== 'driver') throw err;
    d = {}; cases = null;
  }
  let html = `<h1>${esc(t('welcome'))}, ${esc(S.me.display_name)}</h1>${outboxBanner()}${draftsBanner()}`;


  if (S.me.role !== 'driver') html += `<p class="small muted" id="homeasof" style="margin:-6px 0 8px">${esc(t('home_asof').replace('{t}', fmtHM(new Date(nowMs()).toISOString())))} · <a href="#/" id="homereload" title="${esc(t('home_asof_hint'))}">${esc(t('update_now'))}</a></p>`;
  if (S.me.role === 'driver') {
    html += `<a class="btn block" href="#/new" style="margin:8px 0 12px">${esc(t('report_damage'))}</a><a class="btn secondary block" href="#/check">${esc(t('departure_check'))}</a><a class="btn secondary block" href="#/emergency" id="emhome" style="margin-top:8px">☎ ${esc(t('em_title'))}</a><p style="margin-top:8px"><a class="tap" href="#/help">${esc(t('help'))} ›</a></p><section class="panel" id="pushnudge" hidden></section>`;
    const mvKey = `cfp_myveh_${S.me.id}_${S.me.environment}`;
    let mv = null; let mvOffline = false;
    try { mv = (await mvP).vehicles; try { localStorage.setItem(mvKey, JSON.stringify({ at: new Date().toISOString(), vehicles: mv })); } catch {}

      vehCacheRefresh();

      api('GET', '/api/emergency').then((d) => { try { localStorage.setItem(`cfp_emerg_${S.me.id}_${S.me.environment}_`, JSON.stringify({ at: new Date().toISOString(), d })); } catch {} }).catch(() => {}); }
    catch { try { const c = JSON.parse(localStorage.getItem(mvKey) || 'null'); if (c) { mv = c.vehicles; mvOffline = c.at; } } catch {} }
    if (mvOffline || cases === null) html += `<div class="panel alert">${esc(t('offline_view'))}${mvOffline ? ` (${esc(t('as_of'))} ${fmtDT(mvOffline)})` : ''}</div>`;

    if (mv && !mvOffline) html += vehChangeNote(mv);
    if (mv && mv.length) html += `<h2>${esc(t('my_vehicle'))}</h2>${mv.map((v) => { const ob = outboxVeh(v.id); const obc = v.coupled && v.coupled.id ? outboxVeh(v.coupled.id) : { n: 0, crit: false }; const obCrit = ob.crit || obc.crit; const obN = ob.n + obc.n; return `<section class="panel ${v.locked || v.coupled?.locked || obCrit ? 'alert' : ''}"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${plate(v.plate, { locked: v.locked })}${coupledLockedChip(v.coupled)}${v.locked ? `<span class="chip kritisch">${esc(t('locked'))} – ${esc(t('do_not_drive'))}</span>` : v.open_cases_total ? `<span class="chip mittel">${esc(tn('open_reports_n', v.open_cases_total))}</span>` : obN || v.coupled?.locked || v.coupled?.open_cases_total ? '' : `<span class="chip ok">${esc(t('no_open_reports'))}</span>`}${v.coupled && !v.coupled.locked && v.coupled.open_cases_total ? `<span class="chip mittel" data-coupledopen>${esc(v.coupled.plate)}: ${esc(tn('open_reports_n', v.coupled.open_cases_total))}</span>` : ''}${obN ? `<span class="chip ${obCrit ? 'kritisch' : 'mittel'}" data-outboxveh>${esc(tn('outbox_veh_pending', obN))}</span>` : ''}</div>${obCrit ? `<p role="alert" data-outboxcrit><b>⚠ ${esc(t('outbox_veh_crit'))}</b></p>` : ''}
      ${drvNotes(v.notes)}
      ${v.eval_excluded ? `<p class="small" role="note" data-drvresting><b>⚠ ${esc(t('drv_resting'))}</b></p>` : ''}
      ${v.winter ? `<p class="small" role="note" data-drvwinter><b>❄ ${esc(t('drv_winter').replace('{p}', v.winter.noncompliant.map(posL).join(', ')))}</b></p>` : ''}
      <dl class="kv" style="margin-top:8px">${v.trailer_plate ? `<dt>${esc(t('trailer'))}</dt><dd>${esc(v.trailer_plate)}</dd>` : ''}${v.valid_from ? `<dt>${esc(t('drv_assigned_since'))}</dt><dd data-assignedsince>${fmtD(v.valid_from)}</dd>` : ''}<dt>${esc(t('km'))}</dt><dd>${v.last_km ? `${fmtKm(v.last_km.km)} <span class="small muted">(${fmtD(v.last_km.measured_at)})</span>` : '–'}</dd>${myPlanned(v)}${drvInspRows(v)}${(v.km_due || []).map((r) => `<dt>${esc(mk(r.kind))}</dt><dd>${esc(t('due_at_km'))} ${fmtKm(r.next_due_km)}${r.km_remaining < 0 ? ` <span class="chip kritisch">${esc(t('drv_overdue'))}</span>` : ` <span class="small">(${esc(t('km_left'))} ${fmtKm(r.km_remaining)})</span>`}${r.planned_date ? ` <span class="small">· ${esc(t('planned'))} ${fmtD(r.planned_date)}${todayMark(r.planned_date)}</span>` : ''}</dd>`).join('')}</dl>${knownDefects(v.known_defects)}${relItems(v.open_items_after_release)}${drvCoupled(v.coupled)}</section>`; }).join('')}`;

    else if (mv && !mvOffline) html += `<div class="panel" role="note" data-novehicle>${esc(t('drv_no_vehicle'))}</div>`;

    const qo = (cases || []).filter((c) => c.q_state === 'open');
    if (qo.length) html += `<section class="panel warn" role="note" id="qhome"><h2 style="margin-top:0">${esc(t('q_drv_title'))}</h2><p class="small">${esc(t('q_drv_hint'))}</p>${caseList(qo)}</section>`;
    let fo = []; try { fo = cases === null ? [] : ((await finP).fines || []).filter((f) => f.driver_informed_at && !f.driver_ack_at && !['beantwortet', 'bezahlt', 'eingestellt', 'erledigt'].includes(f.status)); } catch { fo = []; }
    if (fo.length) html += `<section class="panel warn" role="note" id="fhome"><h2 style="margin-top:0">${esc(t('fine_home_title'))}</h2><p class="small">${esc(t('fine_home_hint').replace('{a}', t('ack_fine')).replace('{d}', t('fine_dispute')))}</p><div class="list">${fo.map((f) => `<a class="row" href="#/fines/${esc(f.id)}" data-fhome>${plate(f.plate || f.plate_in_letter)}<span class="title">${esc(t('fk_' + f.kind))} · ${esc(t('of_' + f.offense_type))}</span><span class="sub" style="white-space:normal">${noTr(f.fine_no)} · ${fmtDT(f.offense_at)}${f.response_due ? ` · ${esc(t('response_due'))} ${esc(fmtDue(f.response_due))}` : ''}</span></a>`).join('')}</div></section>`;
    if (cases) html += `<h2>${esc(t('nav_cases'))}</h2>${caseList(cases, t('no_cases_driver'))}`;
  } else {


    if (S.me.role === 'dispatch') { const hp = S.me.home_site && !S.dispoAll ? S.me.home_site : ''; html += `<div data-dprinthead>${printHead([t('dispo_print_title'), `${t('kpi_vsite')}: ${hp ? (hp === 'ohne' ? t('cs_nosite') : hp) : t('filter_all')}`])}</div>`; }
    if (S.me.role === 'dispatch' && S.me.home_site) { const hs0 = !S.dispoAll ? S.me.home_site : ''; html += `<p class="small muted noprint" id="dsitebar">${esc(t('kpi_vsite'))}: <b>${esc(hs0 ? (hs0 === 'ohne' ? t('cs_nosite') : hs0) : t('filter_all'))}</b> · <a href="#/" class="tap" id="dsitetoggle">${esc(hs0 ? t('dispo_all_sites') : t('dispo_my_site'))}</a></p>`; }
    if (d.vehicles) {
      const v = d.vehicles; const tot = Math.max(v.total, 1);
      const seg = [['gesperrt', v.gesperrt, 'var(--stop)'], ['werkstatt', v.werkstatt, 'var(--mid)'], ['meldung_offen', v.meldung_offen, 'var(--signal)'], ['einsatzbereit_lt_system', v.einsatzbereit, 'var(--go)']];
      html += `<section class="panel"><h2 style="margin-top:0">${esc(t('vehicles'))}: ${v.total}</h2>
        <div class="fleetbar" role="img" aria-label="${esc(t('fleet_state'))}">${seg.map(([, n, c]) => `<span style="width:${(n / tot) * 100}%;background:${c}"></span>`).join('')}</div>
        <div class="legend">${seg.map(([k, n, c]) => `<a href="${hj(FB_HREF[k])}" data-fbk="${k}"><i style="background:${c}"></i>${esc(t('av_' + k))}: <b>${n}</b></a>`).join('')}${v.ruhend ? `<a class="muted" id="fbdormant" href="${hj('#/vehicles?f=dormant')}">${esc(t('eval_excluded'))}: <b>${v.ruhend}</b></a>` : ''}</div></section>`;
    }

    html += `<div class="stats"><a class="statlink" id="stopen" href="${hj('#/cases?f=open')}"><b>${d.open_cases}${d.open_cases_truncated ? '+' : ''}</b>${esc(t('open'))}</a><a class="statlink" id="stcrit" href="${hj('#/cases?f=critical')}"><b style="color:var(--stop)">${d.critical}</b>${esc(t('prio_kritisch'))}</a><a class="statlink" id="stlock" href="${hj('#/cases?f=locked')}"><b>${d.locked}</b>${esc(t('locked_cases'))}</a>
      ${S.me.role === 'workshop' ? `<div><b>${d.inbox}</b>${esc(t('act_acknowledge'))}</div><div><b>${d.in_progress}</b>${esc(t('st_in_reparatur'))}</div><div><b>${d.waiting_parts ?? 0}</b>${esc(t('st_wartet_teile'))}</div>` : ''}</div>`;
    if (d.findings && d.findings.length) {
      const n = d.findings.filter((f) => ['kritisch', 'handeln'].includes(f.severity)).reduce((s, f) => s + f.n, 0);
      if (n) html += `<a class="panel alert" style="display:block;text-decoration:none" href="#/master?sev=act" id="homefind"><b>${esc(t('not_clear'))}</b> · ${esc(t('findings'))} (${esc(t('asev_act'))}): ${fmtNum(n)}</a>`;
    }
    if (S.me.role === 'workshop') html += await boardP;
    else {
      if (isMgr()) html += await boardP;

      if (S.me.role === 'dispatch') html += await dispoHome(cases);

      const dk = siteKeyUi;
      const shown = S.me.role === 'dispatch' && S.me.home_site && !S.dispoAll && cases ? cases.filter((c) => dk(c.vehicle_site) === dk(S.me.home_site === 'ohne' ? null : S.me.home_site)) : cases;
      html += `<h2>${esc(t('open'))}</h2>${caseList(shown)}<p class="navlinks"><a href="${hj('#/cases')}">${esc(t('all'))}</a></p>`;
      if (S.me.role === 'viewer') html += helpLink('viewer');
    }
  }


  if (!isHomeHash()) return;
  render(html, 'home');
  bindWsFlow();
  bindDraftsBanner();
  S.homeAt = Date.now();
  const hrl = $('#homereload'); if (hrl) hrl.onclick = async (e) => { e.preventDefault(); await viewHome(); };
  const vco = $('#vchangeok'); if (vco) vco.onclick = () => { vehSeenSave(S.vcur || []); const p = $('#vchange'); if (p) p.remove(); };
  pushNudge().catch(() => {});
  const trb = $('#todoretry'); if (trb) trb.onclick = async () => { await viewHome(); };

  const dunr = $('#dunrec'); if (dunr) dunr.onclick = () => { S.caseVsite = dunr.dataset.site; };
  const dtg = $('#dsitetoggle'); if (dtg) dtg.onclick = (e) => { e.preventDefault(); S.dispoAll = !S.dispoAll; route(); };
  const dpr = $('#dprint'); if (dpr) dpr.onclick = () => window.print();
}
async function dispoHome(...a) { return (await lazyModule('dispo')).dispoHome(...a); }










function nextWorkdayAfter(iso) {
  const ymd = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  let d = new Date(Date.parse(iso + 'T12:00:00Z'));
  for (let i = 0; i < 10; i++) { d = new Date(d.getTime() + 86400000); const wd = d.getUTCDay(); if (wd !== 0 && wd !== 6 && !federalHoliday(ymd(d))) return ymd(d); }
  return ymd(new Date(Date.parse(iso + 'T12:00:00Z') + 86400000));
}







function dispoDayBefore(d) { const [y, m, dd] = String(d).split('-').map(Number); const x = new Date(Date.UTC(y, m - 1, dd - 1)); return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`; }




async function wsWinter(vsite = '') {
  const r = await api('GET', '/api/tires/winter' + (vsite ? '?site=' + encodeURIComponent(vsite) : '')).catch(() => null);
  if (!r || (!r.totals.nicht_erfuellt && !r.totals.unbekannt)) return '';

  const wl = (h) => `${h}&vs=${encodeURIComponent(vsite || '*')}`;
  const rows = r.noncompliant.map((x) => `<a class="row p-mittel" href="#/vehicles/${encodeURIComponent(x.vehicle_id)}?sec=tires">${plate(x.plate)}<span class="title" style="white-space:normal">${esc(t('winter_bad').replace('{p}', x.noncompliant.map(posL).join(', ')))}</span><span class="chip mittel">${esc(t('ws_nicht_erfuellt'))}</span>${x.missing.length || x.open_order || x.closed_order ? `<span class="sub wrap">${[x.missing.length && esc(t('winter_missing').replace('{p}', x.missing.map(posL).join(', '))), x.open_order && woApptTxt(x.open_order), x.closed_order && `⚠ ${esc(t('wo_closed_short').replace('{no}', x.closed_order.case_no))}`].filter(Boolean).join(' · ')}</span>` : ''}</a>`).join('');
  return `<section id="wswinter"><h2>${esc(t('ws_winter'))}${r.totals.nicht_erfuellt ? ` <span class="chip">${r.totals.nicht_erfuellt}</span>` : ''}</h2><p class="small muted">${esc(t('ws_winter_hint'))}</p>${rows ? `<div class="list">${rows}</div><p class="small noprint"><a href="${wl('#/tires?f=winter_bad')}" id="wswbad">${esc(t('ws_winter_show'))} ›</a></p>` : ''}${r.noncompliant.some((x) => x.closed_order) ? `<p class="small noprint"><a href="${wl('#/tires?f=winter_closed')}" id="wswclosed">${esc(t('tires_winter_closed'))} ›</a></p>` : ''}${r.totals.unbekannt ? `<p class="small noprint"><a href="${wl('#/tires?f=winter_unknown')}" class="tap" id="wswunk">${esc(t('ws_winter_unknown').replace('{n}', r.totals.unbekannt))} ›</a></p>` : ''}</section>`;
}




function woTag(i) { return i.tire_order === 'winter' ? `<span class="chip mittel wotag">❄ ${esc(t('wo_tag'))}</span> ` : ''; }



const planVehTag = (i) => [i.coupled ? `<span data-pcoupled>🔗 ${esc(t('vk_' + i.coupled.kind))} ${esc(i.coupled.plate)}</span>` : '', i.eval_excluded ? `<span class="chip" data-pdormant>${esc(t('eval_excluded'))}</span>` : ''].filter(Boolean).join(' ');




async function fleetTodo(...a) { return (await lazyModule('leitung')).fleetTodo(...a); }




const recentRepeat = (c) => !!c.last_repeat_at && BERLIN_FMT.format(new Date(c.last_repeat_at)) >= bDate(-2);


const OPEN_CASE_ST = ['gemeldet', 'werkstatt_freigegeben', 'in_reparatur', 'wartet_teile', 'abschlusskontrolle'];

const hoMissing = (c) => OPEN_CASE_ST.includes(c.status) ? [c.handover_keys === 'fehlt' && t('ho_keys_missing'), c.handover_papers === 'fehlt' && t('ho_papers_missing')].filter(Boolean) : [];
const hoVal = (v) => (v === 'fehlt' ? `<span class="chip mittel">${esc(t('ho_fehlt'))}</span>` : esc(t(v === 'da' ? 'ho_da' : 'ho_none')));
function handoverInfo(c) {
  if (!c.handover_keys && !c.handover_papers) return '';
  return `<dt>${esc(t('ho_title'))}</dt><dd id="handover"><span style="white-space:nowrap">${esc(t('ho_keys'))}:</span> ${hoVal(c.handover_keys)}<br><span style="white-space:nowrap">${esc(t('ho_papers'))}:</span> ${hoVal(c.handover_papers)}</dd>`;
}

function pickupInfo(c) {
  if (!c.pickup_note) return '';
  return `<dt>${esc(t('pu_title'))}</dt><dd id="pickup" style="white-space:pre-wrap"${langAttr(c.pickup_note)}>${esc(c.pickup_note)}</dd>`;
}


const WST_ST = ['in_reparatur', 'wartet_teile'];


const RDY_ST = ['werkstatt_freigegeben', 'in_reparatur', 'wartet_teile'];
const rdyOf = (c) => (c && c.ready_expected_on && (!c.status || RDY_ST.includes(c.status)) ? c.ready_expected_on : null);

const rdyMoves = (d) => { if (!d || !Array.isArray(d.events)) return null; let n = 0, first = null; for (const e of d.events) { if (e.action === 'reassign_workshop') { n = 0; first = null; } else if (e.action === 'set_ready_date' && e.payload) { const f = e.payload.from, to = e.payload.to; if (!first) first = f || to || null; if (f && to && to > f) n++; } } return n && first ? { n, first } : null; };
const rdyTxt = (d, label = 'rdy_title') => `${esc(t(label))} <b>${fmtD(d)}</b>${d === bDate() ? ' (' + esc(t('today')) + ')' : ''}${d < bDate() ? ` <span class="chip mittel" data-rdypast>${esc(t('rdy_passed'))}</span>` : ''}`;
const WST_LATER = ['record_work', 'add_part', 'add_open_item', 'resolve_open_item', 'add_external_cost'];
function workStateInfo(c, d) {
  if (!c.work_state_note || !WST_ST.includes(c.status)) return '';
  const ev = d && Array.isArray(d.events) ? d.events.filter((e) => e.action === 'set_work_state' && e.note).pop() : null;
  const who = (ev && ev.actor_name) || c.work_state_by_name || '';

  const later = c.work_state_at && d && Array.isArray(d.events) ? d.events.filter((e) => WST_LATER.includes(e.action) && e.created_at > c.work_state_at).length : 0;
  return `<dt>${esc(t('wst_title'))}</dt><dd id="wstate"><span style="white-space:pre-wrap"${langAttr(c.work_state_note)}>${esc(c.work_state_note)}</span>${c.work_state_at ? `<br><span class="small muted" data-wstat>${esc(t('vl_as_of'))} ${fmtDT(c.work_state_at)}${who ? ' · ' + esc(who) : ''}</span>` : ''}${later ? `<br><span class="chip mittel" data-wstlater>${esc(tn('wst_later', later))}</span> <span class="small muted">${esc(t('wst_later_hint'))}</span>` : ''}</dd>`;
}

const pdrOn = (c) => c.status === 'wartet_teile' && !!c.parts_drive_at && !c.safety_lock;
const pdrList = (c) => (pdrOn(c) ? ` · <b data-pdr style="white-space:nowrap">🚚 ${esc(t('pdr_short'))}</b>` : '');
function pdrInfo(c, d) {
  if (!pdrOn(c)) return '';
  const ev = d && Array.isArray(d.events) ? d.events.filter((e) => e.action === 'set_parts_drive' && e.payload && e.payload.on).pop() : null;
  const who = S.me.role !== 'driver' && ev && ev.actor_name ? ev.actor_name : '';
  return `<dt>${esc(t('pdr_title'))}</dt><dd id="pdrive"><b>🚚 ${esc(t('pdr_yes'))}</b> <span class="small muted" data-pdrat>(${esc(t('vl_as_of'))} ${fmtDT(c.parts_drive_at)}${who ? ' · ' + esc(who) : ''})</span><br><span class="small muted">${esc(t('pdr_back_hint'))}</span></dd>`;
}

const ackList = (c) => (c.status === 'werkstatt_freigegeben' && c.workshop_ack_at && c.workshop_ack_by_name ? ` · <span data-ackl style="white-space:nowrap">${esc(t('ws_ack_by'))} ${esc(c.workshop_ack_by_name)}</span>` : '');
const workStateList = (c) => (c.work_state_note && WST_ST.includes(c.status) ? ` · <span data-wstate>⏸ <b>${esc(t('wst_short'))}</b>: ${ltxt(clipTxt(c.work_state_note, 60))}${c.work_state_by_name ? ` (${esc(c.work_state_by_name)})` : ''}</span>` : '');

const vlAt = (c) => (c.vehicle_location_at ? ` <span class="small muted" data-vlat>(${esc(t('vl_as_of'))} ${fmtDT(c.vehicle_location_at)})</span>` : '');
function vehLocInfo(c) {
  if (!c.vehicle_location && !c.tow_service) return '';
  const tow = c.tow_service ? `<span class="chip mittel">${esc(t('vl_towed_chip'))}</span> ${esc(c.tow_service)}${c.towed_on ? ' · ' + fmtD(c.towed_on) : ''}` : '';
  return `<dt>${esc(t('vl_title'))}</dt><dd id="vehloc">${c.vehicle_location ? esc(c.vehicle_location) : `<span class="muted">${esc(t('vl_unknown'))}</span>`}${tow ? `<br>${tow}` : ''}${vlAt(c)}</dd>`;
}


function qChip(c) { return c.q_state ? ` · <span class="chip ${c.q_state === 'open' ? 'mittel' : 'ok'}" data-qchip="${esc(c.q_state)}">${esc(t(c.q_state === 'open' ? 'q_open' : 'q_answered'))}</span>` : ''; }


function rejBox(c, d) {
  if (c.status !== 'abgelehnt' || isWithdrawn(c) || c.reporter_id !== S.me.id || isMgr()) return '';
  const rj = (d.events || []).filter((e) => e.action === 'reject'); const ev = rj[rj.length - 1];
  return `<div class="panel" id="rejbox"><b>${esc(t('rej_box_t'))}</b>${ev && ev.note ? `<p style="white-space:pre-wrap;margin:6px 0"${langAttr(ev.note)}>${esc(ev.note)}</p>` : ''}<p class="small muted" style="margin:0">${esc(t('rej_box_s'))}</p></div>`;
}
function qBanner(c) {
  if (!c.q_state) return '';
  if (S.me.role === 'driver' || c.reporter_id === S.me.id) return c.q_state === 'open' ? `<div class="panel warn" role="note" data-qbanner="open"><b>${esc(t('q_drv_title'))}</b><br>${esc(t('q_drv_hint'))} <a href="#cf" data-qjump>${esc(t('q_drv_jump'))}</a></div>` : '';
  return `<div class="panel ${c.q_state === 'open' ? '' : 'good'}" role="note" data-qbanner="${esc(c.q_state)}"><b>${esc(t(c.q_state === 'open' ? 'q_open' : 'q_answered'))}</b> · ${esc(t('q_asked_at'))} ${fmtDT(c.q_at)}${c.q_state === 'answered' ? ` – ${esc(t('q_answered_hint'))}` : ''}</div>`;
}


const isWithdrawn = (c) => c.status === 'abgelehnt' && !!c.workshop_site && !c.duplicate_of;
const stTxt = (c) => (isWithdrawn(c) ? t('vi_kind_withdrawn') : t('st_' + c.status));


function relCostOpen(d) {
  if (!d || !Array.isArray(d.parts) || !Array.isArray(d.external_costs)) return '';
  const ext = d.external_costs;
  const parts = ext.some((e) => e.covers_work_and_parts) ? [] : d.parts;
  const noVal = (x, k) => x[k] === null || x[k] === undefined || x.valuation === 'unvalued';
  const est = parts.filter((p) => !noVal(p, 'unit_price_net') && p.valuation === 'estimate').length + ext.filter((e) => !noVal(e, 'amount_net') && e.valuation === 'estimate').length;
  const unv = parts.filter((p) => noVal(p, 'unit_price_net')).length + ext.filter((e) => noVal(e, 'amount_net')).length;
  if (!est && !unv) return '';
  return t('rel_cost_open').replace('{x}', [est ? t('rel_cost_est').replace('{n}', est) : '', unv ? t('rel_cost_unv').replace('{n}', unv) : ''].filter(Boolean).join(' · '));
}

const ownerT = (k) => t(S.me && S.me.role !== 'owner' ? k + '_mgr' : k);
function caseList(list, empty, extra) {
  if (!list.length) return `<p class="muted">${esc(empty || t('no_cases'))}</p>`;
  return `<div class="list">${list.map((c) => { const xh = extra ? extra(c) : ''; return `<a class="row p-${esc(c.priority)}" href="#/cases/${esc(c.id)}">
    ${plate(c.plate, { locked: c.safety_lock })}
    <span class="title">${woTag(c)}${ltxt(cDesc(c.description))}</span>
    <span class="chip ${esc(c.status === 'fahrzeug_freigegeben' ? 'ok' : c.priority)}">${esc(stTxt(c))}</span>
    <span class="sub${c.status === 'wartet_teile' || c.access === 'preview' || c.appraisal_wait_on || xh || rdyOf(c) || (c.work_state_note && WST_ST.includes(c.status)) ? ' wrap' : ''}">${xh}${esc(c.case_no)} · ${esc(t('prio_' + c.priority))}${c.safety_lock ? ' · ' + esc(t('locked')) : ''}${c.open_items > 0 ? ` · <span data-oi>${esc(t('open_items'))}: ${Number(c.open_items)}</span>` : ''}${c.file_count ? ` · <span data-fc title="${esc(t('files'))}">📎 ${Number(c.file_count)}</span>` : ''}${c.access === 'preview' ? ' · ' + esc(t('preview_hint')) : ''}${c.appraisal_wait_on ? ` · <b data-apwlist>🔍 ${esc(t('apw_short'))} ${fmtD(c.appraisal_wait_on)}${c.appraisal_wait_on === bDate() ? ' (' + esc(t('today')) + ')' : ''}</b>` : ''}${c.tow_service && OPEN_CASE_ST.includes(c.status) ? ` · <b class="towtag">${esc(t('vl_towed_chip'))}</b>` : ''}${['gemeldet', 'werkstatt_freigegeben'].includes(c.status) && c.reported_driveability === 'nicht_fahrbereit' && !c.tow_service ? ` · <b data-notdrv>${esc(t('cl_not_drivable'))}</b>${c.location_note && !c.vehicle_location ? ` <span data-locnote>📍 ${esc(clipTxt(c.location_note, 60))}</span>` : ''}` : ''}${hoMissing(c).length ? ` · <b class="hotag">${esc(hoMissing(c).join(', '))}</b>` : ''}${c.planned_date && ['werkstatt_freigegeben', 'in_reparatur', 'wartet_teile'].includes(c.status) ? ` · <b>${esc(t('planned'))} ${fmtD(c.planned_date)}</b>${c.planned_note ? ` <span data-plannote>(${esc(clipTxt(c.planned_note, 60))})</span>` : ''}` : ''} · ${fmtDT(c.updated_at)}${recentRepeat(c) ? ` · <b>${esc(t('act_repeat_finding'))} ${fmtDT(c.last_repeat_at)}</b>` : ''}${partsEta(c)}${partsWaitList(c)}${workStateList(c)}${c.ready_expected_on && rdyOf(c) ? ` · <span data-rdyl>${rdyTxt(c.ready_expected_on)}</span>` : ''}${pdrList(c)}${ackList(c)}${c.cost_over_limit_at ? ` · <span class="chip mittel" data-casince>${esc(t('cost_approval_pending'))} ${esc(t('since'))} ${fmtD(c.cost_over_limit_at)}</span>` : ''}${qChip(c)}${c.maintenance_event_id ? ` · <b>${esc(t('md_case'))}</b>` : ''}${c.duplicate_of_no ? ` · ${esc(t('dup_of'))} ${esc(c.duplicate_of_no)}` : ''}${c.followup_on && !['fahrzeug_freigegeben', 'abgelehnt'].includes(c.status) ? ` · <span class="chip${c.followup_on <= bDate() ? ' mittel' : ''}">${esc(t('followup'))} ${fmtD(c.followup_on)}</span>` : ''}</span></a>`; }).join('')}</div>`;
}



const caseFilterQ = (f) => (f === 'q_open' ? 'status=open&question=open' : f === 'q_answered' ? 'status=open&question=answered' : f === 'unreceived' ? 'status=open&unreceived=1' : f === 'received_open' ? 'status=open&received_open=1' : f === 'limited' ? 'status=open&limited=1' : f === 'open_items' ? 'status=fahrzeug_freigegeben&open_items=1' : f === 'mine' ? 'status=open&mine=1' : f === 'paused' ? 'status=open&paused=1' : f === 'ready_overdue' ? 'status=open&ready_overdue=1' : f === 'cost_approval' ? 'status=open&cost_approval=1' : f === 'critical' ? 'status=open&priority=kritisch' : f === 'locked' ? 'status=open&locked=1' : f === 'repeat' ? 'status=open&repeat_days=3' : f === 'warranty' ? 'status=open&warranty=1' : f === 'stale' ? 'status=open&stale=1' : f === 'followup' ? 'status=open&followup=1' : `status=${f === 'all' ? '' : f}`);

async function viewCases(...a) { return (await lazyModule('suche')).viewCases(...a); }



function printStamp() {
  const env = S.me ? (S.viewEnv && S.me.role === 'owner' ? S.viewEnv : S.me.environment) : null;
  return `${esc(t('printed_at'))}: ${fmtDT(new Date(nowMs()).toISOString())} · ${esc(S.me.display_name)}${env === 'test' ? ` · <b class="print-test">${esc(t('env_test'))}</b>` : ''}`;
}

function printHead(parts) {
  return `<p class="print-only small">${printStamp()}${parts.filter(Boolean).map((x) => ' · ' + esc(x)).join('')} · CEVIK ${esc(t('app'))} [CLAUDE]</p>`;
}




const outboxKey = () => `cfp_outbox_${S.me.id}_${S.me.environment}`;
function outboxGet(key) { try { return JSON.parse(localStorage.getItem(key || outboxKey()) || '[]'); } catch { return []; } }
function outboxSet(list, key) { try { localStorage.setItem(key || outboxKey(), JSON.stringify(list)); } catch {} }

function idb() { return new Promise((res, rej) => { const r = indexedDB.open('cfp_outbox', 1); r.onupgradeneeded = () => r.result.createObjectStore('photos'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function idbDo(mode, fn) { const db = await idb(); return new Promise((res, rej) => { const tx = db.transaction('photos', mode); const st = tx.objectStore('photos'); const out = fn(st); tx.oncomplete = () => res(out && 'result' in out ? out.result : undefined); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error || new Error('abort')); }); }
const photosPut = (key, list) => idbDo('readwrite', (st) => st.put(list, key));
const photosGet = (key) => idbDo('readonly', (st) => st.get(key));
const photosDel = (key) => idbDo('readwrite', (st) => st.delete(key));


const photoRetry = (err) => !!(err && (err.offline || err.status === 401 || err.status === 429 || err.status >= 500 || err.code === 'user_mismatch' || err.code === 'env_mismatch'));

const PHOTO_TIMEOUT_MS = 120000;



const SEND_TIMEOUT_MS = 60000;
async function uploadCasePhotos(caseId, list, ox = {}) {
  let failed = 0;
  for (const p of list) { try { await api('POST', `/api/cases/${caseId}/files`, p.blob, { timeoutMs: PHOTO_TIMEOUT_MS, ...ox, headers: photoHeaders(p.name, p.blob, p.taken) }); } catch (err) { if (photoRetry(err)) throw err; failed++; } }
  return failed;
}
let flushing = false;




const photoTarget = (item, r) => (item.path === '/api/inspections' ? ((r.followups || []).find((f) => f && f.id && (!f.repeat || f.own)) || (S.me && S.me.role !== 'driver' ? (r.followups || []).find((f) => f && f.id) : null) || {}).id : r.id);

const photosSkippedText = (r) => ((r && r.followups || []).some((f) => f && f.repeat) ? t('check_photos_repeat') : t('check_photos_skipped'));




const LOCKS = typeof navigator !== 'undefined' && navigator.locks && typeof navigator.locks.request === 'function' ? navigator.locks : null;
async function flushOutbox() {
  if (!S.me || flushing) return;
  if (!outboxGet().some((x) => !x.failed)) return;
  if (!LOCKS) return flushOutboxRun();
  return LOCKS.request('cfp_outbox', { ifAvailable: true }, async (lock) => { if (lock && S.me && !flushing) await flushOutboxRun(); });
}
async function flushOutboxRun() {
  const list = outboxGet().filter((x) => !x.failed); if (!list.length) return;

  let busy = new Set();
  if (LOCKS && LOCKS.query) { try { busy = new Set(((await LOCKS.query()).held || []).map((l) => l.name)); } catch {} }
  flushing = true;
  const done = new Set(); const failedNow = new Map(); const photoPending = new Map(); const heldNow = new Map(); let kept = 0;
  const key = outboxKey();
  try {
    for (const item of list) {
      if (!S.me) { kept++; break; }
      if (item.hold && item.photo_target && !unmetered()) continue;
      if (PHOTO_UPLOADING.has(item.body.request_key) || busy.has('cfp_photo_' + item.body.request_key)) { kept++; continue; }
      try {

        let r = item.photo_target ? { id: item.photo_target, followups: [{ id: item.photo_target }], case_no: item.case_no } : null;


        const sendBody = item.path === '/api/inspections' && item.saved_at ? { ...item.body, performed_at: item.saved_at, client_now: new Date().toISOString() } : item.body;
        const ox = { asUser: item.user_id || S.me.id, env: item.env, keepDirty: true };
        if (!r) r = await api('POST', item.path || '/api/cases', sendBody, { ...ox, timeoutMs: SEND_TIMEOUT_MS });
        let failed = 0; let skippedTxt = '';

        if (item.photos && item.hold && !unmetered()) {
          heldNow.set(item.body.request_key, { target: photoTarget(item, r), case_no: r.case_no });
          toast(`${t('report_sent')}: ${r.case_no} · ${tn('photos_held', item.photos)}${r.urgent_push_recipients === 0 ? ' · ⚠ ' + t('no_push_reach') : ''}`, r.urgent_push_recipients === 0);
          continue;
        }
        if (item.photos) {
          const ph = await photosGet(item.body.request_key).catch(() => null);
          const target = photoTarget(item, r);


          if (ph && ph.length && !target) skippedTxt = photosSkippedText(r);
          try { if (ph && ph.length && target) failed = await uploadCasePhotos(target, ph, ox); }
          catch (err) {
            if (photoRetry(err)) { photoPending.set(item.body.request_key, { target, case_no: r.case_no }); kept++; if (err.status === 401 || err.code === 'user_mismatch' || err.code === 'env_mismatch') break; continue; }
            throw err;
          }
          await photosDel(item.body.request_key).catch(() => {});
        }
        done.add(item.body.request_key);
        toast(item.path === '/api/inspections' ? `${t('check_saved')}${skippedTxt ? ' · ' + skippedTxt : ''}${failed ? ' · ' + tn('photos_failed', failed) : ''}${kmWarn(r)}${cplNote(r)}${lockedWarn(r)}` : `${t('report_sent')}: ${r.case_no}${failed ? ' · ' + tn('photos_failed', failed) : ''}${r.urgent_push_recipients === 0 ? ' · ⚠ ' + t('no_push_reach') : ''}`, !!failed || !!r.km_rejected || !!r.km_equals_truck || !!r.vehicle_locked || !!r.coupled_locked || r.urgent_push_recipients === 0);

      }
      catch (err) {
        if (err.offline || err.status === 429 || err.status >= 500) { kept++; continue; }
        if (err.code === 'user_mismatch' || err.code === 'env_mismatch') { kept++; break; }
        if (err.status === 401) { kept++; break; }



        failedNow.set(item.body.request_key, { status: err.status || 0, message: String(err.message || ''), code: err.code || null, raw: (err.data && err.data.message) || null, at: new Date().toISOString() });
        toast(`${t('outbox_failed')}: ${err.message}`, true);
      }
    }
  } finally {
    try { outboxSet(outboxGet(key).filter((x) => !done.has(x.body.request_key)).map((x) => (failedNow.has(x.body.request_key) ? { ...x, failed: failedNow.get(x.body.request_key) }
      : photoPending.has(x.body.request_key) ? { ...x, photo_target: photoPending.get(x.body.request_key).target || null, case_no: photoPending.get(x.body.request_key).case_no || null }
      : heldNow.has(x.body.request_key) ? { ...x, photo_target: heldNow.get(x.body.request_key).target || null, case_no: heldNow.get(x.body.request_key).case_no || null } : x)), key); } catch {}
    flushing = false;
  }
  if (failedNow.size || done.size || heldNow.size) refreshOutbox();

  if (done.size && /^#\/?$/.test(location.hash || '#/') && !viewDirty()) route();
  if (kept && S.me && !S.outboxRetry) S.outboxRetry = setTimeout(() => { S.outboxRetry = null; if (navigator.onLine) flushOutbox(); }, 60000);
}
window.addEventListener('online', () => flushOutbox());

function unmetered() { try { const c = navigator.connection; return !!(c && (c.type === 'wifi' || c.type === 'ethernet')); } catch { return false; } }
try { if (navigator.connection && navigator.connection.addEventListener) navigator.connection.addEventListener('change', () => { if (unmetered() && outboxGet().some((x) => x.hold && !x.failed)) flushOutbox(); }); } catch {}

function outboxText(x) {
  const b = x.body || {};
  if (x.path === '/api/inspections') return (b.items || []).filter((i) => i.result === 'mangel').map((i) => `${checkLabel(i.key)}: ${i.note || ''}`).join('\n') || t('outbox_check_ok');
  return b.description || '';
}
function outboxPlate(id, x) {
  if (x && x.plate) return x.plate;
  try { const vs = JSON.parse(localStorage.getItem(`cfp_veh_${S.me.id}_${envFn()}`) || '[]'); const v = vs.find((x) => x.id === id); if (v) return v.plate; } catch {}
  return String(id || '').replace(/^VIN:/, '');
}


function otherEnvOutbox() {
  const out = []; const pre = `cfp_outbox_${S.me.id}_`;
  try { for (const k of Object.keys(localStorage)) if (k.startsWith(pre) && k !== outboxKey()) for (const x of JSON.parse(localStorage.getItem(k) || '[]')) out.push({ ...x, failed: { code: 'env_changed', message: t('outbox_env_changed') }, envKey: k }); } catch {}
  return out;
}
function outboxBanner() {
  if (!S.me) return '';
  const all = outboxGet(); const n = all.filter((x) => !x.failed && !x.photo_target).length; const np = all.filter((x) => !x.failed && x.photo_target && !x.hold).length;
  const held = all.filter((x) => !x.failed && x.photo_target && x.hold); const nh = held.reduce((a, x) => a + (Number(x.photos) || 0), 0); const bad = [...all.filter((x) => x.failed), ...otherEnvOutbox()];
  let html = '';
  if (bad.length) {
    html += `<div class="panel alert" id="outbox_failed" role="alert"><h2>${esc(tn('outbox_failed_n', bad.length))}</h2><p class="small">${esc(tn('outbox_failed_hint', bad.length))}</p>${bad.map((x) => {
      const k = esc(x.body.request_key);
      return `<div class="obx-item"><p><b>${esc(x.path === '/api/inspections' ? t('departure_check') : t('report_damage'))}</b> · ${esc(outboxPlate(x.body.vehicle_id, x))} · ${esc(t('outbox_saved_at'))} ${fmtDT(x.saved_at)}</p>
        <p class="small">${esc(t('outbox_reason'))}: ${esc(x.envKey ? t('outbox_env_changed') : (x.failed.raw ? srvText(x.failed.code, x.failed.raw) || x.failed.raw : x.failed.message) || '')}</p>
        <label for="obx_${k}">${esc(t('outbox_text'))}</label><textarea id="obx_${k}" readonly rows="3">${esc(outboxText(x))}</textarea>
        <div class="actions">${x.envKey ? `<button type="button" class="btn secondary" data-obx-del-env="${esc(x.envKey)}" data-rk="${k}">${esc(t('outbox_discard'))}</button>` : `<button type="button" class="btn secondary" data-obx-retry="${k}">${esc(t('outbox_retry'))}</button><button type="button" class="btn secondary" data-obx-del="${k}">${esc(t('outbox_discard'))}</button>`}</div></div>`;
    }).join('')}</div>`;
  }

  if (n || np) html += `<div class="panel alert" id="outbox" role="status">${[n ? esc(tn('outbox_pending', n)) : '', np ? esc(tn('outbox_photos_pending', np)) : ''].filter(Boolean).join('<br>')}</div>`;

  if (nh) html += `<div class="panel" id="outbox_held" role="status" data-outboxheld><p>${esc(tn('outbox_photos_held', nh))} ${held.map((x) => (x.case_no ? `<a href="#/cases/${esc(x.photo_target)}" translate="no">${esc(x.case_no)}</a>` : '')).filter(Boolean).join(', ')}</p><p class="small muted">${esc(t('outbox_photos_held_hint'))}</p><div class="actions"><button type="button" class="btn secondary" data-obx-release>${esc(t('photos_send_now'))}</button><button type="button" class="btn secondary" data-obx-held-del>${esc(t('photos_held_discard'))}</button></div></div>`;
  return html ? `<div id="outbox_area">${html}</div>` : '';
}

function refreshOutbox() {
  const area = document.getElementById('outbox_area'); const html = outboxBanner();
  if (area) { if (html) area.outerHTML = html; else area.remove(); }
  else if (html && document.getElementById('outbox_slot')) document.getElementById('outbox_slot').innerHTML = html;
  bindOutbox();
}
function bindOutbox() {
  for (const b of document.querySelectorAll('[data-obx-del]')) b.onclick = async () => {
    const key = b.dataset.obxDel;
    if (!confirm(t('outbox_discard_confirm'))) return;
    outboxSet(outboxGet().filter((x) => x.body.request_key !== key)); await photosDel(key).catch(() => {});
    refreshOutbox();
  };
  for (const b of document.querySelectorAll('[data-obx-del-env]')) b.onclick = async () => {
    if (!confirm(t('outbox_discard_confirm'))) return;
    const k = b.dataset.obxDelEnv; const rk = b.dataset.rk;
    if (!S.me || !k.startsWith(`cfp_outbox_${S.me.id}_`)) return;
    const rest = outboxGet(k).filter((x) => x.body.request_key !== rk);
    try { if (rest.length) localStorage.setItem(k, JSON.stringify(rest)); else localStorage.removeItem(k); } catch {}
    await photosDel(rk).catch(() => {}); refreshOutbox();
  };

  for (const b of document.querySelectorAll('[data-obx-release]')) b.onclick = async () => {
    const cid = b.dataset.obxRelease || '';
    outboxSet(outboxGet().map((x) => (x.hold && x.photo_target && (!cid || x.photo_target === cid) ? { ...x, hold: undefined } : x)));
    refreshOutbox(); if (navigator.onLine === false) { toast(t('photos_send_offline')); return; }
    await flushOutbox();
    if (cid && location.hash === '#/cases/' + cid && !viewDirty()) route();
  };
  for (const b of document.querySelectorAll('[data-obx-held-del]')) b.onclick = async () => {
    if (!confirm(t('photos_held_discard_confirm'))) return;

    const gone = new Set(outboxGet().filter((x) => x.hold && x.photo_target && !x.failed).map((x) => x.body.request_key));
    outboxSet(outboxGet().filter((x) => !gone.has(x.body.request_key)));
    for (const k of gone) await photosDel(k).catch(() => {});
    refreshOutbox();
  };
  for (const b of document.querySelectorAll('[data-obx-retry]')) b.onclick = async () => {
    const key = b.dataset.obxRetry;
    outboxSet(outboxGet().map((x) => (x.body.request_key === key ? { ...x, failed: undefined } : x)));
    refreshOutbox(); await flushOutbox();
  };
}


function vehCacheRefresh(force = false) {
  if (!S.me || !navigator.onLine) return;
  try {
    const vkey = `cfp_veh_${S.me.id}_${envFn()}`;
    const at = Number(localStorage.getItem(vkey + '_at')) || 0;
    if (!force && localStorage.getItem(vkey) && Date.now() - at < 300000) return;
  } catch {}
  vehiclesCached().catch(() => {});
}
async function vehiclesCached() {
  const vkey = `cfp_veh_${S.me.id}_${envFn()}`;
  try { const vs = (await api('GET', '/api/vehicles', undefined, { timeoutMs: START_TIMEOUT_MS })).vehicles; try { localStorage.setItem(vkey + '_at', String(Date.now())); localStorage.setItem(vkey, JSON.stringify(vs.map((v) => ({ id: v.id, plate: v.plate, kind: v.kind, site: v.site, assigned: v.assigned, availability: v.availability, coupled: v.coupled || null, last_check_at: v.last_check_at || null, last_check_result: v.last_check_result || null })))); } catch {} return vs; }
  catch (err) { if (!err.offline) throw err; let vs = null; try { vs = JSON.parse(localStorage.getItem(vkey) || 'null'); } catch {} if (!vs) throw err; return vs; }
}


async function photosLater(path, body, r, target, files, who = outboxWho(), hold = false) {
  try {
    if (!who) return 0;
    const list = []; for (const f of files) list.push(await prepPhoto(f));
    await photosPut(body.request_key, list);
    outboxAdd(path, body, list.length, who);
    outboxSet(outboxGet(who.key).map((x) => (x.body.request_key === body.request_key ? { ...x, photo_target: target, case_no: r.case_no || null, ...(hold ? { hold: true } : {}) } : x)), who.key);
    return list.length;
  } catch { return 0; }
}




const PHOTO_UPLOADING = new Set();



async function uploadPhotosSafe(path, body, r, target, files, sb, who = outboxWho()) {

  if (LOCKS) return LOCKS.request('cfp_photo_' + body.request_key, () => uploadPhotosSafeRun(path, body, r, target, files, sb, who));
  return uploadPhotosSafeRun(path, body, r, target, files, sb, who);
}
async function uploadPhotosSafeRun(path, body, r, target, files, sb, who) {
  const key = body.request_key; let failed = 0; let later = 0; let list = null; let backed = false;
  const ox = who ? { env: who.env } : {};
  try { list = []; for (const f of files) list.push(await prepPhoto(f)); } catch { list = null; }
  if (list) {
    try {
      if (!who) throw new Error('no user');
      await photosPut(key, list); outboxAdd(path, body, list.length, who);
      outboxSet(outboxGet(who.key).map((x) => (x.body.request_key === key ? { ...x, photo_target: target, case_no: r.case_no || null } : x)), who.key);
      backed = true;
    } catch { backed = false; }
  }
  PHOTO_UPLOADING.add(key);
  try {
    for (const [i, file] of files.entries()) {
      if (sb) sb.textContent = `${t('uploading')} ${i + 1}/${files.length}`;
      try { failed += await uploadCasePhotos(target, [list ? list[i] : { blob: await prepareUpload(file), name: file.name }], ox); } catch (err) {
        if (photoRetry(err)) { later = backed ? files.length - i : await photosLater(path, body, r, target, files.slice(i), who); break; }
        failed++;
      }
    }
  } finally { PHOTO_UPLOADING.delete(key); }
  if (backed && !later) { outboxSet(outboxGet(who.key).filter((x) => x.body.request_key !== key), who.key); await photosDel(key).catch(() => {}); }
  return { failed, later };
}





function draftsBanner() {
  if (!S.me) return '';
  const sfx = `_${S.me.id}_${S.viewEnv && S.me.role === 'owner' ? S.viewEnv : S.me.environment}`;
  let plates = {}; try { for (const v of JSON.parse(localStorage.getItem(`cfp_veh_${S.me.id}_${envFn()}`) || '[]')) plates[v.id] = v.plate; } catch { plates = {}; }
  const items = [];
  try {
    for (const k of Object.keys(sessionStorage)) {
      if (!k.startsWith('cfp_fd_') || !k.endsWith(sfx)) continue;
      const page = k.slice(7, -sfx.length); let x = null; try { x = JSON.parse(sessionStorage.getItem(k) || 'null'); } catch {}
      if (!x || !x.v || typeof x.v !== 'object' || !Object.keys(x.v).length || !(Date.now() - Date.parse(x.at) < FORM_DRAFT_MS)) continue;
      let href = null; let label = ''; let vid = '';
      if (page === 'new') { href = '#/new'; label = t('report_damage'); vid = x.v.veh; }
      else if (page === 'check') { href = '#/check'; label = t('departure_check'); vid = x.v.v; }
      else if (/^insp_[A-Za-z0-9-]+$/.test(page)) { href = '#/inspect/' + page.slice(5); label = t('inspection'); }
      else if (/^act_[A-Za-z0-9-]+$/.test(page) && x.action && S.hideDraft !== page.slice(4)) { href = '#/cases/' + page.slice(4); label = t('act_' + x.action); }
      if (href) items.push({ k, href, label, plate: vid && plates[vid] ? plates[vid] : '', at: x.at, photos: x.photos });
    }
  } catch { return ''; }
  if (!items.length) return '';
  items.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return `<section class="panel warn" id="homedrafts" role="note"><h2 style="margin-top:0">${esc(t('home_drafts'))}</h2><p class="small">${esc(t('home_drafts_hint'))}</p>${items.map((i) => `<div class="obx-item" data-homedraft="${esc(i.href)}" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;border-top:1px solid var(--rule);padding-top:10px;margin-top:10px"><span style="flex:1 1 200px"><b>${esc(i.label)}</b>${i.plate ? ' · ' + plate(i.plate) : ''} <span class="small muted" style="white-space:nowrap">${fmtDT(i.at)}</span>${i.photos ? `<br><span class="small">${esc(t('form_draft_photos'))}</span>` : ''}</span><a class="btn" href="${esc(i.href)}">${esc(t('home_draft_continue'))}</a><button type="button" class="btn secondary" data-fdrop="${esc(i.k)}">${esc(t('inventory_draft_discard'))}</button></div>`).join('')}</section>`;
}
function bindDraftsBanner() {
  $$('[data-fdrop]').forEach((b) => (b.onclick = () => { if (!confirm(t('form_draft_discard_confirm'))) return; try { sessionStorage.removeItem(b.dataset.fdrop); } catch {} const it = b.closest('[data-homedraft]'); if (it) it.remove(); const box = $('#homedrafts'); if (box && !$('[data-homedraft]', box)) box.remove(); }));
}


const outboxWho = () => (S.me ? { id: S.me.id, name: S.me.display_name, env: S.me.role === 'owner' && S.viewEnv ? S.viewEnv : S.me.environment, key: outboxKey() } : null);


const callBox = (vid) => `<p><b>${esc(t('outbox_call'))}</b></p><div class="actions" data-callbox><a class="btn secondary" href="${vid ? `#/emergency?v=${esc(vid)}` : '#/emergency'}">☎ ${esc(t('em_title'))}</a><a class="btn danger" href="tel:112">${esc(t('em_112_btn'))}</a></div>`;



const outboxCrit = (x) => (x.path === '/api/inspections' ? (x.body.items || []).some((i) => i && i.result === 'mangel' && i.safety_relevant) : x.body.priority === 'kritisch' || x.body.driveability === 'nicht_fahrbereit');
function outboxVeh(id) {
  const out = { n: 0, crit: false }; if (!id || !S.me) return out;
  for (const x of outboxGet()) { if (!x || !x.body || x.body.vehicle_id !== id) continue; if (x.path === '/api/cases' || (x.path === '/api/inspections' && (x.body.items || []).some((i) => i && i.result === 'mangel'))) out.n++; if (outboxCrit(x)) out.crit = true; }
  return out;
}
const outboxVehAlert = (id) => (outboxVeh(id).crit ? `<div class="alert" role="alert" style="margin-bottom:8px" data-outboxcrit><b>⚠ ${esc(t('outbox_veh_crit'))}</b></div>` : '');
function outboxAdd(path, body, photos = 0, who = outboxWho()) { if (!who) return; const list = outboxGet(who.key); const pl = S.me ? outboxPlate(body.vehicle_id) : null; if (!list.some((x) => x.body.request_key === body.request_key)) list.push({ path, body, photos, ...(pl && pl !== String(body.vehicle_id || '').replace(/^VIN:/, '') ? { plate: pl } : {}), saved_at: new Date().toISOString(), user_id: who.id, user_name: who.name, env: who.env }); outboxSet(list, who.key); }



const noVehiclesNote = () => `<div class="panel" role="note" data-novehicles><p>${esc(t(isMgr() ? (S.me.role === 'fleet' ? 'no_vehicles_fleet' : 'no_vehicles_mgr') : 'no_vehicles_ask'))}</p>${isMgr() ? `<p><a class="btn" href="#/vehicles">${esc(t('nav_vehicles'))} ›</a></p>` : ''}</div>`;

const tachoPanel = () => `<div id="tacho" class="panel" hidden role="status"><b>${esc(t('tacho_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('tacho_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;

const glassPanel = (check = false) => { const st = t('glass_hint_steps').split('|'); if (check) st[2] = t('glass_hint_step_check'); return `<div id="glass" class="panel" hidden role="status"><b>${esc(t('glass_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${st.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`; };






const TACHO_WORK = /getriebe|tachogeber|impulsgeber|kitas|fahrtenschreiber|tachograph|gearbox|transmission|коробк\S*\s+передач|кпп|тахограф|тахогенератор|датчик\s+швидкост|датчик\s+скорост|bo[iî]te\s+de\s+vitesses?|(?:chrono)?tachygraphe|capteur\s+de\s+vitesse/i;





const ACC_HINT = lbRx(String.raw`${__T[1]}(?:bin|sind|ist|hinten|leicht|voll)${__T[7]}aufgefahren${__T[0]}(?!\s+auf\s+(?:die|den|das)\s+(?:autobahn|bahn|f(?:ä|ae)hre|zug|rampe|ladefl(?:ä|ae)che|anh(?:ä|ae)nger|auflieger))|${__T[1]}im\s+stau${__T[7]}aufgefahren|${__T[1]}(?:mir|uns|ihm)\s+${__T[8]}(?:hinten\s+)?(?:rein|drauf|hinein|herein|drauf|in\s+die\s+seite|ins\s+heck)\s*gefahren${__T[0]}|${__T[1]}(?:auto|pkw|wagen|fahrzeug|transporter|bus|motorrad|sprinter|kleinwagen)(?:s)?${__T[7]}gestreift${__T[0]}|${__T[1]}(?:zusammengesto(?:ß|ss)en|zusammensto(?:ß|ss)|zusammengekracht|kollidiert|kollision)${__T[0]}|${__T[5]}(?:hit|rammed|bumped)\s+(?:me|us|my\s+(?:truck|lorry|trailer|cab|unit)|the\s+(?:truck|lorry|trailer))\s+(?:from\s+behind|in\s+the\s+(?:back|rear|side)|on\s+the\s+side)(?![a-z])|${__T[5]}(?:drove|ran|reversed|backed|crashed|went)\s+into\s+(?:me|us|my\s+(?:truck|lorry|trailer|cab)|the\s+back\s+of\s+(?:me|us|my\s+\S+))(?![a-z])|${__T[5]}collided(?![a-z])|${__T[2]}(?:в|у)\s+(?:мене|нас|меня)${__T[7]}(?:врізал|врезал|в['’]?їхал|въехал)\S*|${__T[2]}(?:врізал|врезал|в['’]?їхал|въехал)\S*\s+(?:в|у)\s+(?:мене|нас|меня)${__T[6]}|unfall|accident|${__T[1]}(?:(?:fahr)?radfahrer(?:in|innen)?|radler(?:in)?|fu(?:ß|ss)g(?:ä|ae)nger(?:in|innen)?|motorradfahrer(?:in)?|rollerfahrer(?:in)?|e-?scooter(?:fahrer(?:in)?)?)${__T[0]}${__T[44]}(?:ü|ue)bersehen|erfasst|gestreift|touchiert|ber(?:ü|ue)hrt|gest(?:ü|ue)rzt|umgefahren|angefahren|abgefahren|zusammengesto(?:ß|ss)en|gerammt|verletzt)${__T[0]}|${__T[5]}(?:(?:hit|struck|knocked\s+(?:down|over)|clipped|ran\s+over|run\s+over|collided\s+with)\s+${__T[8]}(?:cyclists?|pedestrians?|motorcyclists?|(?:e-?)?scooter\s+riders?)|(?:cyclists?|pedestrians?|motorcyclists?)\s+${__T[9]}(?:was\s+|got\s+)?(?:hit|struck|knocked\s+(?:down|over)|clipped|injured|run\s+over))(?![a-z])|${__T[4]}(?:збив|збила|зачепив|зачепила|сбил|сбила|задел|задела|наїхав|наїхала|наехал|наехала)\s+${__T[8]}(?:велосипедист|пішоход|пішохід|пешеход|мотоцикліст|мотоциклист)\S*|rangierschaden|${__T[3]}beim\s+(?:rangieren|zurücksetzen|rückwärtsfahren)\s+(?:\S+\s+){0,5}?(?:angefahren|gesto(?:ß|ss)en|touchiert|besch(?:ä|ae)digt|gerammt|gestreift)${__T[0]}${__T[39]}while|when)\s+(?:manoeuvring|maneuvering|reversing|backing\s+up)\s+(?:\S+\s+){0,5}?(?:hit|struck|damaged|scraped)(?![a-z])|(?:під\s+час|при)\s+(?:маневрування|маневрировании|задньому\s+ходу)\s+(?:\S+\s+){0,5}?(?:зачепи|вдари|пошкоди|ударил|задел|повредил)\S*|дтп|(?<!(?:рефрижератор\S*|холодильн\S*\s+(?:установк\S*|агрегат\S*)|агрегат\S*)${__T[7]})авар(?:ія|ії|ію|ією|ия|ии|ию|ией)(?![а-яіїєґ])(?!\s+(?:рефрижератор\S*|холодильн\S*|агрегат\S*|термо\S*))|${__T[1]}(?:in\s+den|im)\s+(?:stra(?:ß|ss)en)?graben${__T[7]}(?:gerutscht|gefahren|geraten|abgerutscht|gelandet|gekippt)|${__T[1]}(?:lkw|fahrzeug|sattelzug|zug${__T[25]}ae|a)nger|gespann|zugmaschine|wagen)\s+${__T[9]}(?:eingeknickt|umgekippt|umgest(?:ü|ue|u)rzt|auf\s+die\s+seite\s+gekippt)${__T[0]}|von\s+der\s+fahrbahn\s+abgekommen|${__T[3]}(?:von\s+der\s+(?:stra(?:ß|ss)e|autobahn|landstra(?:ß|ss)e|fahrbahn)|ins\s+feld|in\s+die\s+b(?:ö|oe)schung)${__T[7]}(?:abgekommen|abgerutscht|gerutscht|abgedriftet)|${__T[3]}(?:kam|kamen|kommt)\s+${__T[9]}von\s+der\s+(?:stra(?:ß|ss)e|autobahn|landstra(?:ß|ss)e|fahrbahn)\s+ab${__T[0]}|${__T[3]}b(?:ö|oe)schung\s+(?:hinunter|hinab|runter|herunter)(?:gerutscht|gefahren|gest(?:ü|ue)rzt|gekippt)?${__T[0]}|${__T[1]}(?:lkw|fahrzeug|sattelzug|zug${__T[25]}ae|a)nger|gespann|zugmaschine|wagen)\s+${__T[8]}(?:liegt|lag|landete)\s+auf\s+der\s+seite${__T[0]}${__T[39]}left|went\s+off|ran\s+off|veered\s+off|came\s+off)\s+the\s+(?:road|carriageway|motorway|highway)${__T[39]}truck|lorry|trailer|vehicle|rig)\s+${__T[8]}(?:is|was|lying|ended\s+up)${__T[7]}on\s+its\s+side|(?:з['’]їхав|з['’]їхала|съехал\S*|вилетів|вилетіла|вылетел\S*)${__T[7]}(?:з|с|із)\s+(?:дороги|траси|трассы|шосе|шоссе|автобану)|${__T[4]}(?:лежить|лежит)\s+на\s+(?:боці|боку)${__T[39]}jack-?knif\S*|overturned|rolled\s+over|in\s+(?:a|the)\s+ditch|slid\s+off\s+the\s+road)|(?:з['’]їхав|з['’]їхала|съехал\S*)${__T[7]}(?:в|у)\s+кювет|${__T[4]}(?:вантажівк\S*|фур\S*|тягач\S*|причіп|напівпричіп|грузовик\S*)${__T[7]}(?:перекину\S*|перевернул\S*|склав\S*|склал\S*|сложил\S*)|zusammensto(?:ß|ss)|${__T[3]}kollision|${__T[3]}(?:pkw|auto|kleinwagen|transporter|motorrad|radfahrer\S*|fu(?:ß|ss)g(?:ä|ae|a)nger\S*)\s+${__T[8]}(?:angefahren|gerammt|touchiert)${__T[0]}|auf\s+${__T[8]}(?:pkw|auto|lkw|fahrzeug|wagen|vordermann|stauende|transporter|bus)\s+aufgefahren${__T[39]}collision|collided|rear-ended|crash(?:ed)?\s+into|hit\s+(?:a|another|the)\s+(?:car|vehicle|truck|lorry|van))|зіткн\S*|столкн\S*|(?:є|е)вропротокол\S*|(?:наїхав|наїхала|наехал\S*|зачепив|зачепила|зачепили|задел[аи]?|зацепил\S*|врізав\S*|врізал\S*|врезал\S*)\s+${__T[8]}(?:машин\S*|авто\S*|легков\S*|вантажівк\S*|фур\S*|грузовик\S*|автобус\S*)|${__T[1]}(?<!(?:nicht|nie|kein)\s+)(?:angeeckt|angedotzt|gegengefahren|dagegengefahren|gegengeknallt|dagegengeknallt|gegengesetzt|dagegengesetzt)${__T[0]}|${__T[1]}(?<!(?:nicht|nie)\s+)dagegen\s+(?:gefahren|geknallt|gesetzt|gesto(?:ß|ss)en)${__T[0]}|${__T[1]}(?:delle|beule|macke|kratzer|schramme)n?\s+${__T[9]}(?:reingefahren|reingesetzt|reingehauen|reingemacht)${__T[0]}|${__T[1]}blechschaden|${__T[1]}(?:lkw|bus|reisebus|sattelzug|gespann)\s+${__T[8]}(?:touchiert|gerammt|gestreift)${__T[0]}|${__T[1]}(?:an|am)\s+${__T[8]}(?:pkw|auto|lkw|fahrzeug|wagen|transporter|bus|sprinter)\s+h(?:ä|ae)ngen\s*geblieben|${__T[1]}(?:hab|habe|hat|haben)${__T[7]}(?:was|etwas|jemand(?:en)?)\s+angefahren${__T[0]}`, 'i');


const THEFT_HINT = lbRx(String.raw`(?:${__T[2]}пломб\S*${__T[7]}(?:зірван\S*|зірвали|злама[внл]\S*|зламали|сорван\S*|сорвали|сломан\S*|сломали)|${__T[2]}(?:зірвали|сорвали|зламали|сломали)\s+пломб\S*)${__RX[0]}|${__T[2]}(?:(?:вантажівк|машин|кабін|кабин|фур|причіп|причеп|прицеп|авто|нас|мене|меня)\S*${__T[7]}(?<!не\s)(?:обікрали|обокрали|пограбували|ограбили)|(?<!не\s)(?:обікрали|обокрали|пограбували|ограбили)${__T[7]}(?:вантажівк|машин|кабін|кабин|фур|причіп|причеп|прицеп|авто|нас|мене|меня))${__T[6]}|diebstahl(?!-?(?:warn|alarm)anlage)|planenschlitz\S*|${__T[1]}(?:tank|tanks|diesel|kraftstoff|sprit|adblue)\s+${__T[9]}(?:leer\s?gesaugt|nachts${__T[7]}(?:abgepumpt|abgesaugt)|(?:abgepumpt|abgesaugt)${__T[7]}(?:über|ueber)\s+nacht)|${__T[1]}(?:diesel|kraftstoff|sprit|adblue)\s+(?:fehlt|fehlen)${__T[7]}(?:im|aus\s+dem)\s+tank${__T[0]}|${__T[1]}weniger\s+(?:diesel\s+|kraftstoff\s+|sprit\s+)?im\s+tank\s+${__T[8]}(?:als\s+abends|als\s+gestern|über\s+nacht|ueber\s+nacht|seit\s+gestern)|${__T[5]}(?:fuel|diesel|tank)\s+${__T[8]}drained\s+${__T[8]}(?:overnight|at\s+night|while\s+parked)|${__T[1]}(?:aufgehebelt|aufgestemmt|gewaltsam\s+ge(?:ö|oe)ffnet)${__T[0]}|${__T[1]}(?:scheibe|seitenscheibe|fahrerscheibe|beifahrerscheibe|fenster|seitenfenster|dreiecksfenster)\s+${__T[8]}eingeschlagen[,;]?${__T[44]}weg|fehl(?:t|en)|ausger(?:ä|ae)umt|durchw(?:ü|ue)hlt)${__T[0]}|${__T[1]}(?:fahrerhaus|kabine|lkw|fahrzeug|handschuhfach|staufach|staukasten)\s+${__T[8]}(?:durchw(?:ü|ue)hlt|ausger(?:ä|ae)umt)${__T[0]}|${__T[5]}(?:broke\s+into|forced\s+(?:open|the\s+(?:door|lock|window))|pried\s+open|prised\s+open|jemmied)(?![a-z])|${__T[2]}(?:зламали|взломали|зломали)${__T[7]}(?:замок|замки|двер\S*|кабін\S*|кабин\S*)|\bdieb(?!stahl-?(?:warn|alarm)anlage)|gestohlen|geklaut|entwendet|abgezapft|${__T[3]}einbruch|aufgebrochen|theft|stolen|\bsteal|break-in|broken into|burglar|крадіж|в(?:и)?крал|в(?:и)?крад|украл|украд|siphon|${__T[4]}(?:з|с)лил[иао]?${__T[7]}(?:пальн|палив|дизел|соляр|топлив|бензин)|${__T[3]}(?:ladung|ware|paletten?|kartons?)\s+${__T[8]}(?:fehl(?:t|en)|weg)${__T[0]}${__T[39]}cargo|load|goods|pallets?)\s+${__T[8]}(?:missing|gone)(?![a-z])|${__T[4]}(?:вантаж|груз|товар|палет)\S*\s+${__T[8]}(?:немає|нема|зник|пропа|нет(?![а-яіїєґ]))|${__T[4]}${__T[36]}|зник\S*|пропал\S*)\s+${__T[8]}(?:вантаж|груз|товар|палет)`, 'i', 1);








const VANDAL_HINT = lbRx(String.raw`${__T[1]}(?:jemand|unbekannte?|t(?:ä|ae)ter)${__T[44]}eingeschlagen|zerkratzt|zerst(?:ö|oe)rt|eingetreten)${__T[0]}|${__T[5]}(?:someone|somebody|vandals?)\s+(?:has\s+|had\s+)?(?:smashed|scratched|keyed|kicked\s+in)(?![a-z])|${__T[3]}vandal|sachbesch(?:ä|ae)digung|mutwillig|(?:absichtlich|vorsätzlich|vorsaetzlich)\s+${__T[8]}(?:besch(?:ä|ae)digt|zerkratzt|zerstochen|zerst(?:ö|oe)rt|eingeschlagen|aufgeschlitzt|beschmiert)|graffiti|grafitti|beschmiert|besprayt|bespr(?:ü|ue)ht|zerstochen|aufgestochen|(?:reifen|ventil)\S*\s+${__T[9]}(?:aufgeschlitzt|zerschnitten|abgeschraubt|abgedreht)${__T[0]}${__T[39]}slashed|spray-?painted|deliberately\s+damaged|malicious(?:ly)?\s+damaged?|criminal\s+damage)(?![a-z])|вандал|графіт|граффит|графит|навмисн\S*${__T[7]}пошкод|умышленн\S*${__T[7]}повред|(?:порізал|прорізал|проткнул|порезал|прорезал)\S*${__T[7]}(?:шин|колес|колiс|скат)|${__T[2]}(?:порізал|прорізал|порезал|прорезал|розрізал|разрезал)\S*${__T[7]}(?:тент|штор)${__RX[1]}|${__T[2]}(?:тент|штор)\S*${__T[7]}(?:порізал|прорізал|порезал|прорезал|розрізал|разрезал|порізан|порезан|розрізан|разрезан)${__RX[1]}|${__T[1]}(?:seiten|dach)?planen?\s+${__T[9]}(?:aufgeschlitzt|zerschnitten|aufgeschnitten)${__T[0]}${__RX[2]}|${__T[1]}(?:aufgeschlitzte|zerschnittene|aufgeschnittene)[nr]?\s+(?:seiten|dach)?plane${__RX[2]}|розмалюв|разрисов|${__T[2]}(?:хуліган|хулиган)\S*`, 'i', 1);



const MARTEN_HINT = lbRx(String.raw`marder${__T[39]}martens?|rodents?)(?![a-z])|chewed\s+${__T[9]}(?:cables?|wires?|wiring|hoses?|lines?)|(?:cables?|wires?|wiring|hoses?)\s+${__T[8]}(?:chewed|bitten\s+through)|${__T[3]}nager${__T[0]}|angeknabbert|zerbissen|durchgebissen|(?:kabel|leitung|schl(?:ä|ae|a)uch|d(?:ä|ae|a)mmmatte|d(?:ä|ae|a)mmung|isolierung)\S*\s+${__T[9]}(?:angefressen|abgebissen|angebissen)|куниц|гризун|грызун|(?:погриз|перегриз|прогриз|погрыз|перегрыз|прогрыз)`, 'i', 1);



const STORM_HINT = lbRx(String.raw`unwetter|orkan|${__T[3]}sturm(?:schaden|schäden|schaeden|b(?:ö|oe)e|b(?:ö|oe)en|tief)?${__T[0]}|${__T[3]}hagel(?:schaden|schäden|schaeden|schlag|k(?:ö|oe)rner|sturm)?${__T[0]}|${__T[3]}(?:baum|bäume|baeume|ast|äste|aeste)${__T[44]}(?:herunter|runter|drauf|um)?gefallen|gest(?:ü|ue)rzt|umgest(?:ü|ue)rzt|umgekippt|gekracht|abgebrochen)${__T[0]}|umgest(?:ü|ue)rzte[nrs]?\s+baum|hochwasser|(?:(?:ü|ue)berflutet|(?:ü|ue)berschwemm|starkregen)${__T[39]}storms?|stormy|hail(?:storm|stones?)?|flood(?:ed|ing|water|waters)?|fallen\s+(?:tree|branch))${__T[24]}(?:tree|branch)\s+${__T[9]}(?:fell|fallen|came\s+down)(?![a-z])|${__T[4]}(?:бур[яіюі]|бурею|шторм|ураган|град(?:ом|у|ини|ина)?|злив[аи])(?![а-яіїєґ])|повін|паводк|паводок|затоплен|затопил|підтопл|подтопл|(?:дерев|гілк|гілл|ветк)\S*\s+${__T[9]}(?:впал|упал|звалил|повалил)|(?:впал|упал|повалил)\S*${__T[7]}(?:дерев|гілк|ветк)|${__T[1]}(?:durch|ins)${__T[7]}(?:wasser|hochwasser|(?:ü|ue)berflutete\S*|(?:ü|ue)berschwemmte\S*)${__T[7]}(?:gefahren|durchgefahren)|${__T[1]}wasser${__T[7]}angesaugt${__T[39]}drove|driven|driving)\s+through\s+(?:deep\s+|flood\s+)?(?:water|flood\S*)|${__T[3]}(?:vom\s+wind|wind\s+hat|windb(?:ö|oe)e\S*\s+hat)${__T[44]}ab|weg|herunter|runter|um|auf)?(?:gerissen|geweht|geworfen|gedr(?:ü|ue)ckt)${__T[0]}${__T[39]}wind|gusts?)\s+${__T[8]}(?:ripped|blew|tore|knocked|pulled)${__T[24]}(?:blown|ripped|torn)\s+(?:off|away|open|down)\s+${__T[8]}by\s+(?:the\s+|a\s+)?(?:wind|gust)|${__T[2]}(?:ветром|вітром|ветер|вітер)\s+${__T[8]}(?:сорва|оторва|зірва|відірва|сдул|здул|повали|сломал|злама|вырва|вирва|порва|розірва)\S*|${__T[2]}(?:сорва|оторва|зірва|відірва|сдул|здул|вырва|вирва|порва|розірва)\S*${__T[7]}(?:ветром|вітром)`, 'i', 1);




const BRIDGE_HINT = lbRx(String.raw`br(?:ü|ue)ckenanprall|br(?:ü|ue)ckenanfahrschaden|durchfahrtsh(?:ö|oe)he|einfahrtsh(?:ö|oe)he|${__T[3]}zu\s+hoch\s+f(?:ü|ue)r\s+(?:die|das|den)${__T[7]}(?:br(?:ü|ue)cke|unterf(?:ü|ue)hrung|einfahrt|durchfahrt|parkhaus|halle)|${__T[3]}(?:(?:eisenbahn|bahn|autobahn|fu(?:ß|ss)g(?:ä|ae)nger|stra(?:ß|ss)en|beton|stahl)?br(?:ü|ue)cke|unterf(?:ü|ue)hrung|parkhaus(?:einfahrt)?|tiefgarage(?:neinfahrt)?|tankstellendach|tankstellen(?:ü|ue)berdachung|(?:ü|ue)berdachung|vordach|h(?:ö|oe)henbegrenzung|h(?:ö|oe)henbalken|torbogen)(?:n|en|s)?${__T[0]}${__T[44]}angefahren|gerammt|touchiert|gestreift|erwischt|mitgenommen|h(?:ä|ae)ngen\s*geblieben|h(?:ä|ae)ngengeblieben|stecken\s*geblieben|steckengeblieben|steckt\s+fest|feststeckt|eingeklemmt|verkeilt|dagegen|zu\s+niedrig|aufgerissen|abgerissen)${__T[0]}|${__T[3]}(?:gegen|unter|in)\s+(?:die|der|das|den|dem|eine|einer|ein|einem)?\s*${__T[3]}(?:(?:eisenbahn|bahn|autobahn|fu(?:ß|ss)g(?:ä|ae)nger|stra(?:ß|ss)en|beton|stahl)?br(?:ü|ue)cke|unterf(?:ü|ue)hrung|parkhaus(?:einfahrt)?|tiefgarage(?:neinfahrt)?|tankstellendach|tankstellen(?:ü|ue)berdachung|(?:ü|ue)berdachung|vordach|h(?:ö|oe)henbegrenzung|h(?:ö|oe)henbalken|torbogen)(?:n|en|s)?${__T[0]}\s+${__T[9]}(?:gefahren|geknallt|gekracht|geprallt|gesto(?:ß|ss)en|gerauscht|geraten)${__T[0]}${__T[39]}bridge\s+strike|low\s+bridge|height\s+(?:barrier|restriction|limit|bar)s?)${__T[24]}(?:hit|struck|scraped|clipped|crashed\s+into|drove\s+into|ran\s+into|went\s+into|stuck\s+under|wedged\s+under|got\s+stuck\s+under)\s+${__T[9]}(?:bridge|underpass|overpass|flyover|canopy|car\s+park\s+entrance)${__T[24]}(?:bridge|underpass|overpass|canopy)\s+${__T[8]}(?:was\s+|got\s+)?(?:hit|struck|clipped|damaged)(?![a-z])|too\s+(?:tall|high)\s+for\s+the\s+(?:bridge|underpass|entrance|car\s+park)|(?:вріза\S*|зачепи\S*|задел[аи]?|застряг\S*|вдари\S*|в['’]?їха\S*|въеха\S*|ударил\S*|зацепил\S*|застрял\S*|врезал\S*)\s+${__T[9]}(?:(?<!(?:задн|передн|ведуч|задні|передні|задний|передний|ведучий|ведущий)\S*\s+)(?:міст|мосту|мостом|мості|мост|моста|мосте)(?![а-яіїєґ])|шляхопровід|шляхопровод|путепровод|естакад|эстакад|навіс\S*\s+(?:азс|заправ)|навес\S*\s+(?:азс|заправ))|(?:обмежен|ограничен)\S*${__T[7]}(?:висот|высот)|(?:під|под)\s+(?:мостом|мост|шляхопровод\S*|путепровод\S*)${__T[7]}(?:застряг|застрял|зачепи|зацепи)`, 'i', 1);




const TOW_HINT = lbRx(String.raw`${__T[3]}(?:verwahr(?:platz|stelle|gelände|gelaende|hof)|abschlepphof|park(?:kralle)|radkralle|reifenkralle)${__T[0]}|${__T[3]}(?:ordnungsamt|polizei|stadt|beh(?:ö|oe)rde|gemeinde|kommune|politie|police)\S*\s+(?:\S+\s+){0,5}?(?:abgeschleppt|weggeschleppt|umgesetzt|abschleppen\s+lassen|kralle)${__T[0]}|${__T[3]}(?:abgeschleppt|weggeschleppt|umgesetzt)\s+(?:\S+\s+){0,5}?(?:ordnungsamt|polizei|beh(?:ö|oe)rde|halteverbot|parkverbot|verwahr)|${__T[3]}(?:im|aus\s+dem|wegen)\s+(?:absoluten\s+)?(?:halte|park)verbot(?:s)?\s+${__T[9]}(?:abgeschleppt|weggeschleppt|umgesetzt)${__T[39]}impound(?:ed)?|wheel[\s-]+clamp(?:ed)?|clamped|(?:police|council|authorities|city)\s+${__T[9]}towed|towed\s+(?:away\s+)?by\s+(?:the\s+)?(?:police|council|authorities|city)|towed\s+(?:away\s+)?from\s+(?:a\s+|the\s+)?no[\s-]+parking)(?![a-z])|штрафмайданчик|штраф\S*\s+(?:майданчик|стоянк)|штрафстоянк|(?:поліці|полиці|полиц|муніципал)\S*\s+${__T[9]}(?:евакуювал|эвакуировал|забрал|забрала|забрали|евакуатор)\S*|(?:блокуван|блокиратор|блокувальник)\S*${__T[7]}колес`, 'i', 1);





const STOW_HINT = lbRx(String.raw`${__T[3]}(?:im|in\s+(?:der|dem|den)|unter\s+(?:der|dem))${__T[7]}(?:laderaum|ladefl(?:ä|ae)che${__T[25]}ae)nger|k(?:ü|ue)hlauflieger|koffer(?:aufbau)?|container|aufbau)\s+${__T[9]}(?:personen|menschen|leute|migranten|fl(?:ü|ue)chtlinge)${__T[0]}${__T[39]}found|discovered|saw|spotted|heard|caught)\s+${__T[8]}(?:people|persons|migrants|someone|somebody|refugees|men)\s+${__T[9]}(?:in|inside|under|on|behind)\s+(?:the\s+|my\s+|our\s+)?(?:trailer|load|lorry|truck|container|cargo|curtain|reefer|box)(?![a-z])|${__T[4]}(?:в|у|під|под)${__T[7]}(?:причеп\S*|причіп\S*|напівпричеп\S*|полуприцеп\S*|прицеп\S*|кузов\S*|контейнер\S*|фур[іиеу])\s+${__T[9]}(?:(?:люди(?![а-яіїєґ])|людей)(?!\s+(?:з|зі|із|с|со|від|от)\s)|мігрант\S*|мигрант\S*|біженц\S*|беженц\S*|нелегал\S*|(?:хтось|кто-?то)${__T[7]}(?:хова\S*|прята\S*|сидить|сидит|стука\S*|шумить|шумит))|blinde[nr]?\s+passagier|${__T[3]}(?:personen|menschen|leute|migranten|fl(?:ü|ue)chtlinge|jemand)\s+${__T[9]}(?:im|in\s+(?:der|dem|den)|unter\s+(?:der|dem)|zwischen\s+der)${__T[7]}(?:laderaum|ladefl(?:ä|ae)che${__T[25]}ae)nger|k(?:ü|ue)hlauflieger|koffer(?:aufbau)?|container|aufbau|plane|ladung)${__T[0]}|${__T[3]}(?:personen|menschen|leute|migranten|fl(?:ü|ue)chtlinge|jemand)${__T[44]}versteckt|eingestiegen|reingeklettert|hineingeklettert|rausgesprungen|herausgesprungen|herausgekommen)${__T[0]}|versteckte\s+(?:personen|menschen)${__T[39]}stowaways?|clandestines?|clandestine\s+entrants?)${__T[24]}(?:people|persons|migrants|someone|somebody|refugees)\s+${__T[9]}(?:hiding|hidden|found|inside|climbed\s+into|got\s+into)\s+${__T[9]}(?:trailer|load|lorry|truck|container|cargo|curtain)|${__T[4]}(?:люди|людей|мігрант\S*|мигрант\S*|біженц\S*|беженц\S*|нелегал\S*)\s+${__T[9]}(?:в|у|під|под)${__T[7]}(?:причеп\S*|причіп\S*|напівпричеп\S*|полуприцеп\S*|прицеп\S*|кузов\S*|вантаж\S*|груз\S*|контейнер\S*)|(?:сховал\S*|спрятал\S*|ховал\S*|прятал\S*)\s+${__T[9]}(?:в|у|під|под)${__T[7]}(?:причеп\S*|причіп\S*|напівпричеп\S*|полуприцеп\S*|прицеп\S*|кузов\S*|вантаж\S*|груз\S*|контейнер\S*)`, 'i', 1);



const ROOFICE_HINT = lbRx(String.raw`${__T[3]}(?:eis(?:platten?|schicht|brocken|schollen?|st(?:ü|ue)cke?|panzer)?|schnee(?:schicht|last|brett|haufen|massen|decke)?)${__T[0]}${__T[44]}auf|vom|von|am)\s+${__T[8]}(?:${__T[16]}planen|koffer|kabinen|fahrerhaus|lkw|container)?dach|aufliegerdach|plane|planendach${__T[25]}ae)nger|aufbau|koffer)(?:es|s)?${__T[0]}|${__T[3]}(?:${__T[16]}planen|koffer|kabinen|fahrerhaus|lkw|container)?dach|plane)${__T[0]}\s+${__T[9]}(?:vereist|zugefroren|eingeschneit|schneebedeckt|voller\s+(?:eis|schnee)|voll\s+(?:eis|schnee)|mit${__T[7]}(?:eis|schnee))${__T[0]}|${__T[3]}(?:dacheis|dachschnee|eisplatten?)${__T[0]}${__T[39]}ice|snow)(?:\s+(?:sheets?|slabs?|chunks?|layer|load))?${__T[44]}on|off|from)\s+(?:the\s+)?(?:\S+\s+)?(?:roof|top|tarp|tarpaulin|curtain)${__T[24]}roof\s+${__T[8]}(?:covered|full|caked)\s+(?:with|of|in)\s+(?:ice|snow)${__T[39]}icy|frozen|snow-covered|snowy)${__T[7]}roof(?![a-z])|${__T[2]}(?:лід|льоду|лед|льда|крижан\S*|крижин\S*|льдин\S*|наледь|сніг\S*|снег\S*)\s+${__T[9]}(?:на|з|із|зі|с|со)${__T[7]}(?:дах\S*|крыш\S*|тент\S*)|${__T[2]}(?:дах\S*|крыш\S*|тент\S*)\s+${__T[9]}(?:в|у|під|под)\s+(?:сніг\S*|снег\S*|льод\S*|льд\S*|лід|лед)|${__T[2]}(?:дах\S*|крыш\S*|тент\S*)\s+${__T[8]}(?:обмерз\S*|обледен\S*|замерз\S*|засипан\S*|засыпан\S*)`, 'i', 1);


const HITRUN_HINT = lbRx(String.raw`fahrerflucht|unfallflucht|parkschaden|${__T[3]}verursacher\S*\s+${__T[8]}(?:unbekannt|abgehauen|weggefahren|gefl(?:ü|ue)chtet|geflohen)${__T[0]}|${__T[3]}(?:angefahren|touchiert|gerammt|gestreift|zerkratzt|eingedellt|besch(?:ä|ae)digt)[,;]?\s+(?:\S+\s+){0,6}?(?:abgehauen|davongefahren|gefl(?:ü|ue)chtet|geflohen|ohne\s+(?:anzuhalten|sich\s+zu\s+melden|(?:einen\s+)?zettel|(?:eine\s+)?nachricht))${__T[0]}${__T[39]}someone|somebody|a\s+(?:car|van|truck|lorry|vehicle|bus)|another\s+(?:car|van|truck|lorry|vehicle|driver)|other\s+(?:car|van|truck|lorry|driver)|unknown\s+\S+)\s+${__T[8]}(?:hit|struck|scraped|clipped|bumped|dented|crashed\s+into|ran\s+into|reversed\s+into|backed\s+into)${__T[44]}and|then)\s+(?:just\s+|simply\s+)?(?:drove|driven|took|went|ran|left|sped)(?:\s+(?:off|away))?(?![a-z])|${__T[4]}(?:хтось|невідом\S*|кто-?то|неизвестн\S*|інш\S*\s+(?:машин|авто|вантажівк|фур|воді)\S*|друг\S*\s+(?:машин|авто|фур|водител)\S*)\s+${__T[8]}(?:врізав\S*|в['’]?їхав\S*|вдарив\S*|вдарил\S*|зачепив\S*|зачепил\S*|подряпав\S*|подряпал\S*|пошкодив\S*|пошкодил\S*|врезал\S*|въехал\S*|ударил\S*|задел\S*|поцарапал\S*|повредил\S*)${__T[44]}і|и|та|й)\s+(?:просто\s+)?(?:поїхав\S*|уїхав\S*|поїхал\S*|уехал\S*|поехал\S*|зник\S*|исчез\S*|втік|втекл\S*|сбежал\S*|скрыл\S*)|hit[\s-]+and[\s-]+run|(?:fled|left)\s+the\s+scene|(?:drove|driven|took)\s+off\s+without\s+(?:stopping|leaving)|(?:damaged|hit|struck|scraped|dented)\s+${__T[8]}while\s+parked|${__T[4]}(?:втік|втекл|втеч[аіуе]|скрылс|скрылась|скрылись)|(?:поїхав|поїхала|поїхали|уехал\S*|зник\S*|исчез\S*)\s+з?с?\s*(?:місця|места)\s+(?:дтп|аварії|аварии|пригоди|происшествия)`, 'i', 1);






const ACC2_HINT = lbRx(String.raw`(?:${__T[1]}(?:(?:auto|pkw|lkw|wagen|fahrzeug|transporter|kleintransporter|bus|reisebus|linienbus|sprinter|kleinwagen|laster|sattelzug|motorrad|traktor|trecker|lieferwagen|kastenwagen|wohnmobil|wohnwagen|taxi|suv)|einer|jemand)(?:s|e|en)?\s+${__T[9]}(?:mich|uns|mir|meinen|meine|mein|meinem|unseren|unsere|unser)\s+${__T[9]}(?:gestreift|angefahren|erwischt|touchiert|gerammt|abgefahren|abgerissen|(?:rein|hinein|drauf|hinten\s+drauf)\s?gefahren|reingekracht|reingeknallt|geschrammt|eingedr(?:ü|ue)ckt|eingedellt|demoliert|besch(?:ä|ae)digt|zerkratzt|aufgefahren)${__T[0]}|${__T[1]}(?:hat|haben)\s+(?:mich|uns|mir)\s+(?:ein|eine|einer|der|die|jemand|so\s+ein)\s+${__T[9]}(?:gestreift|angefahren|erwischt|touchiert|gerammt|abgefahren|abgerissen|(?:rein|hinein|drauf|hinten\s+drauf)\s?gefahren|reingekracht|reingeknallt|geschrammt|eingedr(?:ü|ue)ckt|eingedellt|demoliert|besch(?:ä|ae)digt|zerkratzt|aufgefahren)${__T[0]}|${__T[1]}(?:ist|sind)\s+mir\s+${__T[8]}(?:in\s+die\s+seite|ins\s+heck|in\s+den\s+${__T[16]}aufbau))${__T[0]}|${__T[1]}(?:(?:beim|im|bei)\s+(?:dem\s+)?(?:einparken|ausparken|parken|abbiegen|rechtsabbiegen|linksabbiegen|wenden|spurwechsel|kreisverkehr|(?:ü|ue)berholen|einfädeln|einscheren|rangieren|zur(?:ü|ue)cksetzen|r(?:ü|ue)ckw(?:ä|ae)rts\s?fahren|rausfahren|ausfahren|einfahren)|habe|hab|ich|wir)${__T[44]}ein(?:en|em)?|anderen|einen\s+anderen|fremden|geparkten|parkenden)${__T[7]}(?:auto|pkw|lkw|wagen|fahrzeug|transporter|kleintransporter|bus|reisebus|linienbus|sprinter|kleinwagen|laster|sattelzug|motorrad|traktor|trecker|lieferwagen|kastenwagen|wohnmobil|wohnwagen|taxi|suv)(?:s|e|en)?\s+${__T[8]}(?:gestreift|angefahren|erwischt|touchiert|gerammt|abgefahren|abgerissen|(?:rein|hinein|drauf|hinten\s+drauf)\s?gefahren|reingekracht|reingeknallt|geschrammt|eingedr(?:ü|ue)ckt|eingedellt|demoliert|besch(?:ä|ae)digt|zerkratzt|aufgefahren)${__T[0]}|${__T[1]}(?:ein|eine|einer|so\s+ein)${__T[7]}(?:auto|pkw|lkw|wagen|fahrzeug|transporter|kleintransporter|bus|reisebus|linienbus|sprinter|kleinwagen|laster|sattelzug|motorrad|traktor|trecker|lieferwagen|kastenwagen|wohnmobil|wohnwagen|taxi|suv)(?:s|e|en)?\s+${__T[8]}(?:(?:rein|hinein|drauf|hinten\s+drauf)\s?gefahren|reingekracht|reingeknallt|reingerauscht)${__T[0]}|${__T[1]}(?:zusammengeprallt|zusammenprall|karambolage|massenkarambolage)${__T[0]}|${__T[5]}(?:crash(?:ed)?|collision|collided|smash(?:ed)?)\s+(?:with|into)\s+(?:a|an|the|another)${__T[7]}(?:car|van|truck|lorry|vehicle|bus|motorbike|motorcycle|cyclist|coach|taxi)(?![a-z])|${__T[5]}(?:a|the|another|some|other)\s+(?:car|van|truck|lorry|vehicle|bus|driver|guy|coach|taxi|motorbike)\s+${__T[8]}(?:hit|struck|scraped|clipped|bumped|sideswiped|rear[- ]?ended|crashed\s+into|ran\s+into|reversed\s+into|backed\s+into|drove\s+into)\s+(?:me|us|my|our|the\s+(?:truck|lorry|trailer|cab|mirror|side|back|rear))(?![a-z])|${__T[5]}(?:rear[- ]?ended|sideswiped|t[- ]?boned|fender[- ]?bender)(?![a-z])|${__T[5]}pulled\s+out\s+in\s+front\s+of\s+(?:me|us)\s+${__T[9]}(?:hit|crashed|collided|struck|clipped)(?![a-z])|${__T[5]}(?:i|we)${__T[7]}(?:hit|scraped|clipped|struck|bumped|dented|rear[- ]?ended|reversed\s+into|backed\s+into|crashed\s+into|ran\s+into)\s+(?:a|an|another|someone['’]?s|the\s+other|a\s+parked)${__T[7]}(?:car|van|truck|lorry|vehicle|bus|trailer|motorbike|coach|taxi)(?![a-z])|${__T[2]}(?:зачепили|задели|вдарили|ударили|пошкодили|повредили|підрізав\S*\s+${__T[8]}(?:і|й|та)\s+(?:зачепив|вдарив)\S*|подрезал\S*\s+${__T[8]}и\s+(?:задел|ударил)\S*)\s+(?:мені|мне|мій|мой|моє|мою|мое|нам|наш\S*)?\s*(?:\S+\s+)?(?:бампер|дзеркал|зеркал|двер|причіп|причеп|прицеп|кабін|кабин|крил|борт|фар|машин|вантажівк|авто|фур|тягач)\S*)${__T[10]}wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced${__T[12]}отремонт\S*|заменил\S*))`, 'i', 1);

const HITRUN2_HINT = lbRx(String.raw`(?:${__T[1]}(?:angefahren|touchiert|gerammt|gestreift|erwischt|zerkratzt|eingedellt|besch(?:ä|ae)digt|reingefahren|drauf\s?gefahren|abgefahren|abgerissen)\s+${__T[8]}und\s+(?:ist|war|hat\s+sich|haut|f(?:ä|ae)hrt)\s+(?:dann\s+)?(?:einfach\s+)?(?:weg|weitergefahren|abgehauen|verschwunden|davon(?:gefahren)?|ab|weiter)${__T[0]}|${__T[5]}(?:hit|scraped|clipped|bumped|dented|rear[- ]?ended|struck)\s+(?:\S+\s+){0,4}?and\s+(?:then\s+)?(?:just\s+)?(?:drove|took|sped|went|ran)\s+(?:off|away)(?![a-z]))`, 'i', 1);




const ACC3_HINT = lbRx(String.raw`(?:${__T[2]}(?:мне|мені|нам)${__T[7]}(?:въехал|в['’ʼ]?їхал|в['’ʼ]?їхав|врезал|врізал|врізав|влетел|влетів|влетіл)\S*|${__T[2]}(?:въехал|в['’ʼ]?їхал|в['’ʼ]?їхав|врезал|врізал|врізав|влетел|влетів|влетіл)\S*\s+${__T[8]}(?:в|у)\s+${__T[8]}(?:(?:машин|легков|легківк|легковушк|легковик|вантажівк|фур|грузовик|автобус|прицеп|причіп|причеп|полуприцеп|напівпричіп|кабін|кабин|тягач)[а-яіїєґё]*|авто(?:мобил[а-яіїєґё]*|мобіл[а-яіїєґё]*)?|зад|бок|бік|бочин[а-яіїєґё]*)${__T[6]}|${__T[2]}(?:сзади|ззаду)${__T[7]}(?:въехал|в['’ʼ]?їхал|в['’ʼ]?їхав|врезал|врізал|врізав|влетел|влетів|влетіл|наехал|наїхав|наїхал)\S*|${__T[2]}(?:поцарапал|подряпав|подряпал|помял|пом['’ʼ]?яв|разбил|розбив|ударил|вдарив|задел|зачепив|зацепил)[а-яіїєґё]*${__T[7]}(?:чуж|друг|інш|сосед|сусід|припаркован|запаркован|стоящ|стоячу|легков|легківк|легковушк)\S*${__T[7]}(?:машин|авто|легков|легківк|легковушк|вантажівк|фур|грузовик|автобус)|${__T[2]}(?:зачепив|зачепила|наїхав|наїхала)\s+${__T[8]}(?:легківк|легковик)|${__T[2]}(?:пострадавш\S*|постраждал(?:і|их|ий|ого|им|ими)${__T[6]}))${__RX[3]}`, 'i', 1);

const HITRUN3_HINT = lbRx(String.raw`(?:${__T[2]}(?:помяли|пом['’ʼ]?яли|поцарапали|подряпали|разбили|розбили|задели|зачепили|ударили|вдарили|пошкодили|повредили|въехали|в['’ʼ]?їхали|врезались|врізались)${__T[44]}на|в|у)\s+(?:стоянк|стоянц|парковк|парковц|паркінг|паркинг)[а-яіїєґё]*|${__T[2]}(?:на|в|у)\s+(?:стоянк|стоянц|парковк|парковц|паркінг|паркинг)[а-яіїєґё]*\s+${__T[9]}(?:помяли|пом['’ʼ]?яли|поцарапали|подряпали|разбили|розбили|задели|зачепили|ударили|вдарили|пошкодили|повредили|въехали|в['’ʼ]?їхали|врезались|врізались)${__T[6]})${__RX[3]}`, 'i', 1);





const GLASS_HINT = lbRx(String.raw`(?:${__T[2]}(?:камень|камінь|камешек|камінець|щебень|щебінь|щеб[её]нк\S*|гравий|гравій)\s+${__T[8]}(?:в|у|на)\s+(?:лобов\S*|стекло|скло)|${__T[2]}(?:в|у)\s+лобов\S*${__T[7]}(?:прилетел\S*|прилетів|прилетіл\S*|попал\S*|потрапив|потрапил\S*|влетел\S*|влетів|ударил\S*|вдарив))${__RX[4]}|(?:${__T[2]}(?:скол|тріщин|трещин)\S*\s+${__T[8]}(?:на|по)\s+лобов\S*|${__T[2]}(?:на|по)\s+лобов\S*\s+${__T[8]}(?:скол|тріщин|трещин)|${__T[2]}лобов\S*${__T[7]}(?:тріснул\S*|трісн\S*|треснул\S*|розбит\S*|разбит\S*|пошкоджен\S*|в\s+(?:тріщин|трещин|скол)))${__T[10]}${__T[42]})|fixed|repaired|replaced${__T[11]}заменил\S*|усунул\S*|устранил\S*|закле[иї]л|полимер|полімер))|windschutzscheibe${__RX[5]}|frontscheibe${__RX[5]}|seitenscheibe(?!n?\s+(?:geht|gehen|l(?:ä|ae|a)sst|f(?:ä|ae|a)hrt|schlie(?:ß|ss)t|bleibt|rutscht|kommt)\s)${__RX[6]}|heckscheibe${__RX[6]}|steinschlag|glasbruch|glasschaden|${__T[3]}(?<!brems[\s-]?)scheibe\s+${__T[9]}(?:gerissen|gesprungen|eingeschlagen|kaputt|gebrochen|(?:einen\s+)?riss|(?:einen\s+|ein\s+)?(?:stern|sternchen|sprung)${__T[0]})|(?:riss|stern|sternchen|sprung)\s+in\s+der${__T[7]}scheibe${__T[0]}|windshield${__RX[5]}|windscreen${__RX[5]}|(?:stone|rock)\s+chip|(?:cracked|broken|smashed|chipped)\s+(?:side\s+)?(?:window|glass)|(?<!mirror\s)(?:window|glass)\s+(?:is\s+)?(?:cracked|broken|smashed|chipped)|(?<!(?:омивач|омыват|двірник|дворник|склоочисник|стеклоочистител|щітк|щетк|незамерзайк)\S*\s+)лобов\S*\s+(?:скл|стекл)|скл[оаіу]\S*${__T[7]}(?:тріснул|розбит|пошкоджен)|стекл\S*${__T[7]}(?:треснул|разбит)|(?:тріщин|трещин|скол)\S*${__T[7]}(?:на\s+)?(?:скл|стекл)|${__RX[7]}${__T[2]}(?:бокове|бічне|заднє|боковое|заднее)\s+(?:скло|стекло)${__T[7]}(?:розбил\S*|разбил\S*|розбит\S*|разбит\S*|вибил\S*|выбил\S*|трісну\S*|тресну\S*)${__RX[7]}|${__RX[7]}${__T[2]}(?:розбил\S*|разбил\S*|вибил\S*|выбил\S*)${__T[7]}(?:бокове|бічне|заднє|боковое|заднее)\s+(?:скло|стекло)${__RX[7]}`, 'i', 1);


const WILD_HINT = lbRx(String.raw`wildunfall|wildwechsel|wildschwein|${__T[3]}(?:reh|rehe|rehbock|hirsch|wild|fuchs|dachs)${__T[0]}|\bdeer\b|\bboars?\b|\bmoose\b|\belk\b|animal\s+(?:collision|strike)|hit\s+an?\s+animal|${__T[4]}(?:косул|козул|сарн(?:а|и|у|ою|і)(?![а-яіїєґ])|олен|кабан|лос[ьяюе](?:м)?(?![а-яіїєґ])|дик\S*\s+(?:твар|живот))`, 'i', 1);





const LOST_HINT = lbRx(String.raw`${__T[2]}(?:ключ\S*\s+${__T[8]}(?:зачинив|зачинила|зачинив\S*|замкнув\S*|закрив\S*|закрыл\S*|захлопнул\S*|залишив\S*|оставил\S*|забув\S*|забыл\S*)|(?:зачинив|зачинила|замкнув\S*|закрив\S*|закрыл\S*|захлопнул\S*|залишив\S*|оставил\S*|забув\S*|забыл\S*)\s+${__T[8]}ключ\S*)\s+${__T[8]}(?:в|у)\s+(?:кабін\S*|кабин\S*|машин\S*|авто${__T[6]}|салон\S*|вантажівц\S*|грузовик\S*)|${__T[4]}${__T[36]}|не\s+маю|не\s+можу\s+знайти|не\s+могу\s+найти)${__T[7]}(?:техпаспорт\S*|ключ(?:ів|ей|а)?(?![а-яіїєґ])|свідоцтв\S*\s+про\s+реєстрац\S*)|${__T[3]}(?:(?:fahrzeug|lkw|auto|wagen|ersatz)?schl(?:ü|ue|u)ssel\S*|fahrzeugschein|zulassungsbescheinigung|fahrzeugpapiere|papiere)${__T[44]}verloren|verlegt|weg${__T[0]}|fehl(?:t|en)${__T[0]}|vergessen|abhanden|liegen\s*gelassen|eingeschlossen|${__T[13]}(?:auffindbar|auffinden|da|gefunden|zu\s+finden))|(?:verloren|verlegt|vergessen|eingeschlossen|finde)\S*\s+${__T[9]}(?:schl(?:ü|ue|u)ssel|fahrzeugschein|zulassungsbescheinigung|fahrzeugpapiere)|schl(?:ü|ue|u)sselverlust|(?:lost|misplaced|forgot|forgotten|can['’]?t\s+find|cannot\s+find|locked)\s+${__T[8]}(?:keys?|registration|vehicle\s+documents|vehicle\s+papers|truck\s+(?:documents|papers))\b|\b(?:keys?|registration\s+(?:certificate|document)s?|vehicle\s+(?:documents|papers))\s+${__T[9]}(?:lost|missing|gone|locked\s+in)\b|${__T[4]}(?:ключ\S*|техпаспорт\S*|свідоцтв\S*\s+про\s+реєстрац\S*)\s+${__T[9]}(?:загуб|втрат|зник|забу|потер|пропа|нема|не\s+можу\s+знайти|не\s+могу\s+найти)|(?:загуби|загуба|втрати|забу|забы|потеря|потерял|посеял)\S*\s+${__T[9]}(?:ключ|техпаспорт|свідоцтв|документ\S*\s+(?:на\s+|від\s+|для\s+)?(?:машин|авто|тягач|грузовик|вантажівк|фур))|${__T[1]}(?:schl(?:ü|ue)ssel)${__T[44]}eingeschlossen|eingesperrt|weggeschlossen)|${__T[1]}(?:mich|uns)?\s*ausgesperrt${__T[0]}${__T[39]}keys?\s+${__T[9]}locked\s+(?:in|inside)|locked\s+(?:myself\s+)?out)(?![a-z])|${__T[1]}(?:abgeschlossen|zugefallen|zugesperrt|verriegelt),?\s+${__T[9]}schl(?:ü|ue)ssel,?${__T[7]}(?:drin|drinnen|innen|steckt|liegt${__T[7]}(?:drin|im\s+(?:lkw|fahrerhaus|f(?:ü|ue)hrerhaus)))${__T[0]}|${__T[1]}schl(?:ü|ue)ssel\s+${__T[8]}(?:drin|drinnen|steckt\s+innen)\s+${__T[9]}(?:abgeschlossen|zugefallen|zugesperrt|verriegelt)${__T[0]}|${__RX[8]}${__T[5]}(?:vehicle\s+)?registration\s+(?:document|certificate|papers?|card)?\s*(?:is\s+|was\s+)?(?:missing|lost|gone|not\s+(?:in\s+the\s+(?:truck|cab|vehicle)|there))(?![a-z])${__RX[8]}|${__RX[8]}${__T[2]}(?:свідоцтв\S*\s+(?:про\s+)?реєстраці\S*|свидетельств\S*\s+(?:о\s+)?регистраци\S*)${__T[7]}(?:загуби\S*|втрати\S*|потеря\S*|нема\S*|немає${__T[37]}\S*|пропа\S*|зник\S*)|${__T[2]}(?:загуби\S*|втрати\S*|потеря\S*|нема\S*|немає${__T[37]}\S*)${__T[7]}(?:свідоцтв\S*\s+(?:про\s+)?реєстраці\S*|свидетельств\S*\s+(?:о\s+)?регистраци\S*)${__RX[8]}`, 'i', 1);





const FLAT_HINT = lbRx(String.raw`${__T[1]}keine\s+luft\s+(?:mehr\s+)?(?:im|in\s+dem|auf\s+dem)${__T[7]}reifen${__T[0]}${__RX[9]}|reifen[sn]?\s+${__T[9]}(?:plat${__T[0]}|schlaff${__T[0]}|kaput${__T[0]}|geplatz|geplazt|(?:keine?|ohne)\s+luft|luft\s+(?:ist\s+)?(?:raus|weg))|(?:hab\S*|hat)${__T[7]}(?:einen|['’]?nen|['’]?n)\s+platten|${__T[3]}reifen[sn]?\s+hat\s+platten|${__T[3]}platten\s+(?:am|an\s+der|hinten|vorne?|links|rechts)${__T[0]}${__T[39]}koleso|kolesa|shina)${__T[7]}(?:probit|spust|lopnu)\S*|reifenpanne|reifenplatzer|plattfu(?:ß|ss)|${__T[3]}(?:platte[rmn]?|geplatzte[rmn]?)${__T[7]}reifen|reifen[sn]?\s+${__T[9]}(?:platt${__T[0]}|geplatzt|zerfetzt|explodiert|kaputt|defekt|aufgeschlitzt|eingeschnitten)|${__T[3]}reifen[sn]?\s+${__T[9]}(?:durch|wegen|von)\s+(?:\S+\s+){1,3}?platt${__T[0]}|flat\s+(?:tyre|tire)|(?:tyre|tire)s?\s+${__T[8]}(?:burst|blew|blown|exploded|flat(?![a-z]))|blow-?out|punctur|(?:пробив|пробила|пробили|пробило|пробил|проколов|прокололо|проколол|проколола|спустил[оаи]?|спустив|лопнул[аои]?|лопнув)\s+${__T[8]}(?:колес|шин)|(?:колес|шин)\S*\s+${__T[8]}(?:лопнул|лопнув|пробит|пробил|пробив|спущен|спустил|розірв|порвал)|прокол\S*${__T[7]}(?:колес|шин)|${__T[2]}пробит[аоіи]?${__T[7]}(?:колес|шин)`, 'i', 1);





const ROADCHK_HINT = lbRx(String.raw`${__T[1]}(?<!(?:keine|ohne)\s)(?:m(?:ä|ae)ngelkarte|sicherheitsleistung)${__T[0]}|${__T[1]}zoll(?:\s+hat|beamt\S*|kontrolle)\s+${__T[8]}(?:kontrolliert|angehalten|gepr(?:ü|ue)ft)?[^.;!?]{0,60}?${__T[3]}(?:bem(?:ä|ae)ngelt|beanstandet|m(?:ä|ae)ngelbericht|(?<!(?:ohne|keine|keinerlei)\s)m(?:ä|ae)ngel${__T[0]}|weiterfahrt${__T[7]}untersagt)|(?<![a-zа-яіїєґё])(?:bag|balm)(?![a-z])[^.;!?]{0,40}?(?:протокол\S*|акт\s+(?:про\s+)?(?:порушен\S*|нарушен\S*))(?![^.;!?]*(?:дтп|аварі\S*|авари\S*))|(?:(?<![a-z])(?:police|roadside\s+(?:check|inspection)|dvsa|bag|balm)\S*\s+(?:\S+\s+){0,6}?(?:defects?|faults?)\s+(?:were\s+)?(?:found|noted|recorded)${__T[39]}police|roadside\s+(?:check|inspection)|dvsa|bag|balm)\S*\s+${__T[9]}found\s+${__T[8]}(?:defects?|faults?)|${__T[2]}(?:поліці\S*|поліц\S*|полиц\S*|bag\S*|balm\S*|дорожн\S*\s+контрол\S*)\s+(?:\S+\s+){0,8}?(?:недолік\S*|несправн\S*|неисправн\S*|недостат\S*|замечан\S*|зауважен\S*))${__RX[0]}|${__T[3]}(?:polizei\S*|bag${__T[0]}\S*|balm${__T[0]}\S*|verkehrskontrolle|stra(?:ß|ss)enkontrolle|zollkontrolle|kontrolle\s+(?:durch|von|der)\s+(?:die\s+|der\s+|dem\s+)?(?:polizei|bag|balm))\s+(?:\S+\s+){0,8}?(?:bem(?:ä|ae|a)ngelt|beanstandet|m(?:ä|ae|a)ngelbericht|(?<!(?:ohne|keine|keinerlei)\s+)m(?:ä|ae|a)ngel${__T[0]}|verwarn|bußgeld|bussgeld|weiterfahrt|stillgelegt|stilllegung|untersagt|festgehalten|plakette|entstempel)|weiterfahrt\s+${__T[8]}(?:untersagt|verboten)|m(?:ä|ae|a)ngelbericht|ladungssicherung\S*\s+${__T[9]}(?:bem(?:ä|ae|a)ngelt|beanstandet)|(?:bem(?:ä|ae|a)ngelt|beanstandet)\S*\s+${__T[9]}ladungssicherung${__T[39]}police|roadside\s+(?:check|inspection)|dvsa|bag(?![a-z])|balm)\S*\s+(?:\S+\s+){0,8}?(?:fined|fine|ticket|defect\s+notice|prohibit|not\s+allowed\s+to\s+(?:drive|continue)|flagged|grounded|impounded|immobili[sz]ed|out\s+of\s+service|failed\s+(?:the\s+)?(?:inspection|check))|prohibition\s+notice|load\s+securing\s+${__T[8]}(?:criticised|criticized|objected)|(?:поліці|поліц|полиц|контрол)\S*\s+(?:\S+\s+){0,8}?(?:о?штраф|заборон|запрет|кріплення\s+вантаж|крепление\s+груз)|${__T[3]}(?:(?:wir|ich)\s+(?:wurden|wurde|sind|bin)\s+${__T[9]}(?:kontrolliert|angehalten)|(?:wurden|wurde)\s+(?:wir|ich)\s+${__T[9]}(?:kontrolliert|angehalten)|(?:raus|heraus)(?:gezogen|gewunken)|rausgeholt)\S*\s+(?:\S+\s+){0,8}?(?:bem(?:ä|ae|a)ngelt|beanstandet|verwarn|bußgeld|bussgeld|weiterfahrt|stillgelegt|untersagt|festgehalten)|${__T[3]}kontrolle\s+(?:(?:auf|an)\s+(?:der|dem)|am|an)\s+(?:a\s?\d+|autobahn|bundesstra(?:ß|ss)e|b\s?\d+|rast\S*|parkplatz|grenze)\S*\s+(?:\S+\s+){0,8}?(?:bem(?:ä|ae|a)ngelt|beanstandet|verwarn|bußgeld|bussgeld|weiterfahrt|stillgelegt|untersagt|festgehalten)|(?<![\d,.]\s?)${__T[3]}zoll(?:beamt\S*)?${__T[0]}\s+(?:\S+\s+){0,8}?(?:bem(?:ä|ae|a)ngelt|beanstandet|verwarn|bußgeld|bussgeld|weiterfahrt|stillgelegt|untersagt|festgehalten)|(?:grounded|impounded|immobili[sz]ed)\s+${__T[8]}by\s+(?:the\s+)?(?:police|dvsa|balm|bag)`, 'i', 1);






const NOSTART_HINT = lbRx(String.raw`${__T[1]}(?<!(?:kein|keine|ohne)\s)wegfahrsperre${__T[0]}${__RX[10]}|${__T[5]}immobili[sz]er(?![a-z])${__RX[10]}|${__T[2]}(?:іммобілайзер|иммобилайзер)\S*|(?<!(?:stand|park)?(?:heizung|klima(?:anlage|ger(?:ä|ae)t)?|k(?:ü|ue)hl(?:aggregat|maschine|ger(?:ä|ae)t|ung)|aggregat|reefer|thermo\s?king|carrier|l(?:ü|ue)fter|gebl(?:ä|ae)se)(?:es|s)?\s+(?:\S+\s+){0,2})springt\s+${__T[8]}${__T[13]}an${__T[0]}|(?:motor|lkw|fahrzeug|wagen|zugmaschine|sattelzug)\s+${__T[8]}(?:startet|startete)\s+nicht|(?<!(?:stand|park)?(?:heizung|klima(?:anlage|ger(?:ä|ae)t)?|k(?:ü|ue)hl(?:aggregat|maschine|ger(?:ä|ae)t|ung)|aggregat|reefer|thermo\s?king|carrier|l(?:ü|ue)fter|gebl(?:ä|ae)se)(?:es|s)?\s+(?:\S+\s+){0,2})l(?:ä|ae|a)sst\s+sich\s+${__T[13]}starten|anlasser\s+${__T[8]}(?:dreht|macht|klackt)\s+nicht|anlasser\s+${__T[8]}(?:defekt|kaputt|ausgefallen|geht\s+nicht|funktioniert\s+nicht)|batterie\S*\s+(?:(?!nicht\s|kein\S*\s)\S+\s+){0,3}?(?:leer|platt|tot|kaputt|defekt|schwach)${__T[0]}|batterie\S*\s+(?:(?:ist|sind|war|waren|wieder|komplett|v(?:ö|oe)llig|ganz|total|(?:ü|ue)ber\s+nacht)\s+){0,2}(?:tief)?entladen${__T[0]}|starthilfe${__T[39]}engine|truck|lorry|vehicle|it)\s+(?:won['’]?t|will\s+not|does\s*n[o']?t|did\s*n[o']?t|cannot|can['’]?t)\s+start|(?:flat|dead|weak)\s+battery|battery\s+(?:(?!not\s|isn['’]?t\s)\S+\s+){0,2}?(?:flat|dead|weak)(?![a-z])|jump[- ]?start|(?<!(?:автономк|вебаст|webasto|печк|пічк|отопител|опалювач|реф|холодильн)\S*\s+)не\s+заводит|(?:двигун|мотор|машин|вантажівк|тягач|грузовик)\S*${__T[7]}не\s+запуска|(?:акумулятор\S*|акум[аиу]?${__T[6]})\s+${__T[8]}(?:розряд|сів|сіла|слаб|здох|сдох)|(?:аккумулятор\S*|аккум[аыу]?${__T[6]})\s+${__T[8]}(?:разряж|сел|слаб|сдох)|(?:сів|сел|слабк\S*|слаб(?:ый|ий))\s+(?:акум|аккум)|(?:розрядив|разрядил)\S*${__T[7]}(?:акумулятор|аккумулятор)|${__T[1]}(?:z(?:ü|ue|u)ndschloss|z(?:ü|ue|u)ndschl(?:ö|oe|o)sser|lenkradschloss|lenkradsperre)\S*\s+${__T[9]}(?:defekt|kaputt|klemmt|blockiert|geht\s+nicht|gehen\s+nicht|dreht\s+(?:sich\s+)?nicht|l(?:ä|ae|a)sst\s+sich\s+${__T[13]}drehen|rastet\s+nicht)|${__T[1]}schl(?:ü|ue|u)ssel${__T[44]}im|ins|in\s+(?:das|der|dem))\s+(?:z(?:ü|ue|u)ndschloss|z(?:ü|ue|u)ndung|lenkradschloss)|${__T[1]}schl(?:ü|ue|u)ssel\s+${__T[8]}(?:klemmt|steckt\s+fest|dreht\s+(?:sich\s+)?nicht|l(?:ä|ae|a)sst\s+sich\s+${__T[13]}drehen)${__T[7]}(?:im|in\s+der)\s+(?:z(?:ü|ue|u)ndschloss|z(?:ü|ue|u)ndung|lenkradschloss)|${__T[5]}(?:ignition(?:\s+(?:lock|switch|barrel))?|steering\s+lock)\s+${__T[8]}(?:stuck|jammed|broken|faulty|not\s+working|won['’]?t\s+turn|doesn['’]?t\s+turn|locked)(?![a-z])|${__T[5]}key\s+${__T[8]}(?:stuck|jammed|won['’]?t\s+turn|doesn['’]?t\s+turn|will\s+not\s+turn)${__T[7]}in\s+(?:the\s+)?ignition|${__T[4]}(?:замок|замка|замку)\s+(?:запалюван|зажиган)\S*\s+${__T[8]}(?:${__T[43]}|заклин\S*${__T[28]}не\s+поверта\S*|не\s+повора\S*)|${__T[4]}ключ\S*\s+${__T[9]}(?:в|у)\s+(?:замку\s+)?(?:запалюван|зажиган)\S*|(?<!(?:stand|park)?(?:heizung|klima(?:anlage|ger(?:ä|ae)t)?|k(?:ü|ue)hl(?:aggregat|maschine|ger(?:ä|ae)t|ung)|aggregat|reefer|thermo\s?king|carrier|l(?:ü|ue)fter|gebl(?:ä|ae)se)(?:es|s)?\s+(?:\S+\s+){0,2})${__T[1]}(?:springt|startet|springen|starten)\s+${__T[8]}(?:schlecht|schwer|nur\s+schwer|erst\s+nach\s+${__T[8]}versuch\S*)\s*(?:an${__T[0]})?${__T[39]}hard|difficult)\s+to\s+start${__T[39]}starts|starting)\s+(?:very\s+)?(?:badly|poorly)|(?:^|[.;!,:]\s*)(?:won['’]?t|will\s+not|does\s*n['’]?t|doesn['’]?t)\s+start(?![a-z])${__RX[7]}|${__T[1]}z(?:ü|ue|u)ndschl(?:ü|ue|u)ssel\s+${__T[8]}(?:steckt${__T[7]}fest|klemmt|l(?:ä|ae|a)(?:ss|ß)t\s+sich\s+${__T[13]}(?:drehen|abziehen|rausziehen|herausziehen)|geht\s+${__T[13]}(?:raus|heraus))${__T[0]}${__RX[7]}|${__RX[8]}${__T[5]}starter(?:\s+motor)?${__T[7]}(?:not\s+turning|won['’]?t\s+turn|doesn['’]?t\s+turn|just\s+clicks|only\s+clicks|clicking|broken|faulty|failed|dead|not\s+working|doesn['’]?t\s+work|isn['’]?t\s+working)(?![a-z])${__RX[8]}|${__RX[8]}${__T[2]}стартер\S*${__T[7]}(?:не\s+крути\S*|не\s+крутит|тільки\s+клаца\S*|только\s+щелка\S*|клаца\S*|щелка\S*|злама[внл]\S*${__T[17]}несправн\S*|неисправ\S*${__T[15]}вийшов\s+з\s+ладу|вышел\s+из\s+строя)${__RX[8]}|(?:${__T[3]}orgel(?:t|n)${__T[0]}|${__T[3]}(?:will|wollte|mag)\s+${__T[13]}(?:anspringen|starten)|${__T[3]}geht${__T[7]}(?:beim|nach\s+dem)\s+(?:starten|anlassen|start)\s+${__T[8]}aus${__T[0]}|${__T[3]}motor${__T[7]}kommt\s+nicht(?=\s*(?:$|[.,;!?]))|${__T[3]}keinen\s+mucks|${__T[3]}(?:schl(?:ü|ue|u)ssel|z(?:ü|ue|u)ndung)[^\s.,;!?]*\s+(?:[^\s.,;!?]+\s+){0,5}?(?:passiert|tut\s+sich)\s+(?:gar\s+)?nichts|${__T[3]}z(?:ü|ue|u)ndung\s+an,?\s+(?:aber\s+)?(?:es\s+)?(?:tut\s+sich|passiert)\s+(?:gar\s+)?nichts${__T[39]}cranks?|turns\s+over)\s+${__T[8]}${__T[38]}\s+not|will\s+not)\s+(?:fire|start|catch)|${__T[2]}(?:двигун|мотор|двигатель)\S*${__T[7]}не\s+запуска\S*|${__T[2]}не\s+запуска\S*${__T[7]}(?:двигун|мотор|двигатель))${__T[10]}funktioniert\s+wieder|springt\s+wieder|wieder\s+(?:ok|in\s+ordnung)${__T[23]}starts\s+again${__T[12]}отремонт\S*|заменил\S*))|(?:${__T[2]}(?:потрібен|потрібна|потрібно|треба|нужен|нужно|надо)${__T[7]}(?:прикурюв\S*|прикурит\S*|прикуриват\S*|прикурить)|${__T[2]}(?:прикурил\S*|прикурювал\S*|прикуривал\S*))${__RX[11]}|${__T[2]}(?<!(?:автономк|вебаст|webasto|печк|пічк|отопител|опалювач|реф|холодильн)\S*\s+)(?:плохо|погано|тяжело|туго|важко|насилу|еле|ледве|ледь)${__T[7]}(?:заводит\S*|запуска\S*)(?![^.;!?]*(?:поменял\S*|помінял\S*|repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|nicht\s+mehr|wieder\s+normal${__T[26]}in\s+ordnung)${__T[23]}no\s+longer${__T[12]}замінив\S*|отремонт\S*|заменил\S*${__T[22]}`, 'i', 1);












const WARNLIGHT_HINT = lbRx(String.raw`${__T[1]}stopp?-(?:leuchte|lampe|symbol|anzeige)\s+(?:ist\s+)?(?:an|leuchtet|brennt|blinkt)${__T[0]}${__RX[12]}|${__T[1]}(?:display|kombiinstrument|armaturenbrett|cockpit|bildschirm)\s+${__T[8]}(?:steht|zeigt|erscheint|kommt)${__T[7]}stopp?(?![a-zäöüß-])${__RX[12]}|${__T[5]}stop\s+(?:light|lamp|warning|symbol)\s+(?:(?:is|came|has\s+come|come|just\s+came)\s+)?(?:on|lit|flashing)(?:\s+(?:on|in)\s+(?:the\s+)?(?:dash|dashboard|display|cluster))?(?![a-z])${__RX[12]}|${__T[5]}(?:dash|dashboard|display|cluster)${__T[7]}(?:shows|says|showing|saying)\s+(?:a\s+|the\s+)?(?:red\s+)?stop(?![a-z])${__RX[12]}|${__T[4]}(?<!не\s)(?:горить|горит|загорів\S*|загорі\S*|загорел\S*|світиться|светится|блима\S*|мига\S*)${__T[7]}(?:stop|стоп)(?![a-zа-яіїєґ-])${__RX[12]}|${__T[4]}(?:помилк\S*|ошибк\S*|попереджен\S*|предупрежден\S*)${__T[7]}(?:на|в)\s+(?:дисплеї|дисплее|екрані|экране|панелі|панели|бортовому\s+комп\S*)${__RX[12]}|(?:${__T[1]}(?<!(?:kein|keine|ohne)\s)(?:(?:motor)?(?:ö|oe)l-?warnung|batterie-?warnung|lade-?warnung)${__T[0]}(?!\s+(?:ist\s+)?(?:weg|aus|erloschen|wieder\s+aus))|${__T[1]}(?:ö|oe)lkanne\s+${__T[8]}(?:leuchtet|blinkt|brennt|an${__T[0]}|geht\s+an|ging\s+an|kommt)|(?<![a-z])(?<!no\s)(?:battery|oil)\s+warning(?![a-z])(?!\s+(?:is\s+|has\s+)?(?:gone|off|out|cleared))|(?<![a-z])low\s+oil\s+pressure|${__T[2]}(?:низьк\S*\s+тиск\S*\s+масла|тиск\S*\s+масла${__T[7]}(?:низьк\S*|пада\S*|впав)|низк\S*\s+давлени\S*\s+масла|давлени\S*\s+масла${__T[7]}(?:низк\S*|пада\S*|упал\S*)))${__RX[0]}|${__T[1]}ladekontrolle\s+${__T[8]}(?:leuchtet|brennt|blinkt|(?:geht|ist)\s+an(?=\s*(?:$|[.,;!?]))|an(?=\s*(?:$|[.,;!?])))|${__T[1]}(?:motor)?(?:ö|oe)ldruck(?:anzeige)?${__T[0]}\s+(?:(?:ist|war|geht|seit|heute|schon|wieder|deutlich|sehr|viel|zu|plötzlich|ploetzlich|auf|der|die|laut|display|anzeige|bei|im|leerlauf)[,;]?\s+){0,4}(?:niedrig|zu\s+(?:niedrig|gering)|gering|f(?:ä|ae)llt|sinkt|weg${__T[0]}|null|auf\s+null|warnung|zu\s+wenig|schwankt)${__T[0]}|${__T[1]}(?:motor)?(?:ö|oe)ldruck-?(?:warnung|meldung|fehler)${__T[39]}low\s+oil\s+pressure|oil\s+pressure${__T[7]}(?:low|warning|dropp\S*|falling|alarm))(?![a-z])|${__T[4]}(?:низьк\S*|малий|упав|впав|падає)\s+тиск\S*\s+(?:олив|мастил)\S*|${__T[4]}тиск\S*\s+(?:олив|мастил)\S*${__T[7]}(?:низьк\S*|впав|упав|падає)|${__T[4]}давлени\S*\s+масл\S*${__T[7]}(?:низк\S*|упал\S*|пада\S*)|${__T[4]}(?:низк\S*|упал\S*)\s+давлени\S*\s+масл\S*|(?:warn|kontroll)[\s-]+(?:leuchte|lampe)|(?:warn|kontroll)leuchte|(?:warn|kontroll)lampe|motorkontroll|warnmeldung|${__T[3]}rote[snr]?${__T[7]}(?:leuchte|lampe|symbol|warnung|warnsymbol)${__T[0]}|warning\s+(?:light|lamp|message)|check\s+engine|engine\s+(?:warning\s+|management\s+)?light|dashboard${__T[7]}(?:light|warning)|red${__T[7]}(?:warning|symbol)|(?:контрольн|попереджувальн|сигнальн)\S*\s+(?:ламп|індикатор|индикатор)|(?:горить|горит|загорів|загорілас|загорівс|загорел)\S*\s+${__T[8]}(?:лампа|лампочка|індикатор|индикатор|значок|чек|датчик)|(?:лампа|лампочка|індикатор|индикатор|значок|датчик)\S*\s+${__T[8]}(?:горить|горит|загорів|загорілас|загорел)|${__T[3]}(?:(?:öldruck|oeldruck|öl|oel|batterie|lade|abs|ebs|asr|esp|adblue|harnstoff|motor|kühlmittel|kuehlmittel|kühlwasser|kuehlwasser|bremsdruck|druckluft|vorratsdruck|bremsbelag|bremsverschlei(?:ß|ss)|vorglüh|vorglueh|glüh|airbag|reifendruck|getriebe|feststellbrems|retarder))(?:-|\s+)?(?:warn)?(?:leuchte|lampe|symbol)(?:n)?${__T[0]}|${__T[3]}(?:symbol|warnzeichen|zeichen|anzeige)\s+${__T[8]}(?:leuchtet|blinkt|brennt)${__T[7]}(?:rot|gelb|orange)${__T[0]}|${__T[3]}(?:leuchte|lampe)\s+${__T[8]}(?:leuchtet|blinkt|brennt)${__T[7]}(?:rot|gelb|orange)${__T[7]}(?:im|am|auf)\s+(?:dem\s+)?(?:display|kombiinstrument|armaturenbrett|bildschirm)|${__T[3]}stopp?${__T[7]}(?:leuchtet|blinkt|erscheint|im\s+display)|${__T[3]}(?:fehler|warnung|st(?:ö|oe|o)rung)(?:meldung|code)?\S*${__T[7]}(?:im|auf\s+dem|am)\s+(?:display|bildschirm|kombiinstrument|armaturenbrett)${__T[39]}oil\s+pressure|oil|battery|charging|abs|ebs|adblue|def|coolant|air\s+pressure|airbag|glow\s+plug|tyre\s+pressure|tire\s+pressure)\s+(?:warning\s+)?(?:light|lamp|symbol|icon)s?${__T[24]}(?:brake|stop)\s+warning\s+(?:light|lamp|symbol|icon)s?${__T[24]}red${__T[7]}(?:light|lamp|icon)${__T[7]}(?:on|in)\s+(?:the\s+)?(?:dash\S*|display|instrument\S*)|(?<![a-z])error\s+(?:message|code)s?${__T[7]}(?:on|in)\s+(?:the\s+)?(?:dash\S*|display|instrument\S*)|${__T[3]}(?:display|bildschirm|kombiinstrument)\S*${__T[7]}(?:zeigt|meldet|bringt)\s+${__T[8]}(?:fehler\S*|warnung\S*|st(?:ö|oe|o)rung\S*)|${__T[3]}(?:im|auf\s+dem|am)\s+(?:display|bildschirm|kombiinstrument)${__T[7]}(?:steht|kommt|erscheint|blinkt)\s+${__T[8]}(?:fehler\S*|warnung\S*|st(?:ö|oe|o)rung\S*)${__T[39]}display|dash(?:board)?|instrument\s+cluster)${__T[7]}(?:shows|showing|says|displays)\s+(?:an?\s+)?(?:\S+\s+)?(?:error|warning|fault)|${__T[4]}(?:на\s+)?(?:дисплеї|дисплее|екрані|экране|панелі|панели)\s+${__T[8]}(?:помилк\S*|ошибк\S*|попереджен\S*|предупрежден\S*)|${__RX[7]}${__T[2]}(?:горить|горит|світиться|светится|загорів\S*|загорел\S*)\s+(?:лампа\s+|значок\s+|індикатор\s+|индикатор\s+)?(?:abs|ebs|asr)(?![a-z])${__RX[7]}|${__T[1]}motor(?:fehler|st(?:ö|oe)rung)(?:s?(?:leuchte|lampe|meldung|anzeige|symbol))?${__T[0]}${__T[7]}(?:leuchtet|brennt|blinkt|ist\s+an|an${__T[0]}|im\s+display|auf\s+dem\s+display|wird\s+angezeigt|angezeigt)${__RX[13]}|${__T[5]}engine\s+(?:fault|error|malfunction|failure)\s+(?:light|lamp|warning|message|code|symbol)(?![a-z])${__RX[13]}|${__T[2]}(?:загор\S*|гор(?:ить|ит)|світит\S*|светит\S*|блима\S*|мига\S*|видає|выдает|показу\S*)${__T[7]}(?:помилк\S*|ошибк\S*|несправн\S*|неисправн\S*)${__T[7]}(?:двигун\S*|двигател\S*|мотор\S*)${__RX[13]}`, 'i', 1);

const WARNLIGHT2_HINT = lbRx(String.raw`(?:${__T[1]}(?:gelbe|rote|orange|orangene|orangefarbene)[snrm]?\s+(?:warn)?(?:lampe|leuchte|licht|symbol|zeichen|warnung|meldung|dreieck|anzeige)${__T[0]}\s+(?:[^\s.,;!?]+\s+){0,3}?(?:im|am|auf\s+dem|in\s+der|in\s+dem)\s+(?:display|cockpit|armaturen\S*|kombi\S*|tacho|bildschirm|instrument\S*|anzeige)${__T[0]}|${__T[1]}(?:im|am|auf\s+dem)\s+(?:display|cockpit|armaturen\S*|kombi\S*|tacho|bildschirm|instrument\S*)\s+${__T[8]}(?:gelbe|rote|orange|orangene)[snrm]?\s+(?:warn)?(?:lampe|leuchte|licht|symbol|zeichen|warnung|meldung|dreieck)${__T[0]}|${__T[1]}(?:display|anzeige|bildschirm|cockpit|tacho|armaturen\S*|meldung)\s+${__T[9]}werkstatt\s+aufsuchen|${__T[1]}werkstatt\s+aufsuchen\s+${__T[8]}(?:im|auf\s+dem|am)\s+(?:display|bildschirm|cockpit|tacho)|${__T[1]}abgas[\s-]?(?:kontroll|warn)?(?:lampe|leuchte|symbol)${__T[7]}(?:an|leuchtet|brennt|blinkt|geht\s+${__T[13]}aus)${__T[0]}|${__T[1]}(?:ausrufe?zeichen|schraubenschl(?:ü|ue)ssel|gelbe[sn]?\s+dreieck|rote[sn]?\s+dreieck)(?:[\s-]?(?:symbol|lampe|leuchte))?\s+${__T[8]}(?:an|leuchtet|brennt|blinkt|geht\s+${__T[13]}aus|im\s+display|im\s+cockpit|im\s+tacho)${__T[0]}|${__T[5]}(?:(?:amber|yellow|orange|red)\s+(?:warning|light|symbol|message|triangle)|exclamation\s+(?:mark|point)|wrench\s+(?:light|symbol|icon))\s+${__T[8]}(?:on|in)\s+(?:the\s+)?(?:display|dash|dashboard|cluster|screen)(?![a-z])|${__T[5]}(?:exclamation\s+(?:mark|point)|wrench)\s+(?:light|symbol|icon)?\s*(?:is\s+|came\s+|keeps\s+)?(?:on|lit|flashing|showing|appeared)(?![a-z])|${__T[2]}(?:знак\s+оклику|окличн\S*\s+знак|восклицательн\S*\s+знак|жовт\S*\s+трикутник|червон\S*\s+трикутник|желт\S*\s+треугольник|красн\S*\s+треугольник|гайков\S*\s+ключ|ключик)${__T[7]}(?:горить|горит|світиться|светится|загорів\S*|загорел\S*|блима\S*|мига\S*)|${__T[2]}(?:горить|горит|загорів\S*|загорел\S*|світиться|светится)\s+(?:знак\s+оклику|окличн\S*\s+знак|восклицательн\S*\s+знак|жовт\S*\s+трикутник|желт\S*\s+треугольник|гайков\S*\s+ключ|ключик)|${__T[2]}(?:масл[еяё]нк\S*|(?:температур\S*|чек)(?:\s+(?:двигател\S*|двигун\S*|енжин|энджин|engine))?)\s+(?:(?!не\s)\S+\s+)?(?:горить|горит|загор(?:ел|ів|іл)\S*|світиться|светится|мига\S*|блима\S*)|${__T[2]}(?<!не\s)(?:горить|горит|загор(?:ел|ів|іл)\S*|світиться|светится|мига\S*|блима\S*)${__T[7]}(?:масл[еяё]нк\S*|температур\S*)|${__T[2]}(?<!не\s)(?:горить|горит|загор(?:ел|ів|іл)\S*|світиться|светится|мига\S*|блима\S*)${__T[7]}(?:аккумулятор|акумулятор|батаре\S*)${__T[7]}на\s+(?:панел\S*|приборк\S*|приборці|щитк\S*|диспле\S*|дисплє\S*)|${__T[2]}(?:помилк\S*|ошибк\S*)${__T[7]}на\s+(?:приборк\S*|приборці|щитк\S*)|${__T[5]}(?:dash|dashboard|display|cluster|instrument\s+(?:cluster|panel))\s+(?:(?:is|was|has|all|just|completely|got)\s+){0,2}lit\s+up(?![a-z])|${__T[5]}(?<!no\s)(?:big\s+)?red\s+stop${__T[7]}(?:on|in)\s+(?:the\s+)?(?:dash|dashboard|display|screen|cluster|instrument\s+(?:cluster|panel))(?![a-z])|${__T[5]}(?<!no\s)(?:fault|error|dtc|warning)\s+(?:codes?|messages?)\s+(?:(?:is|are|keeps?|now|still)\s+)?(?:showing|shown|show(?:s|ing)?\s+up|appeared|came\s+up|coming\s+up|popped\s+up|pop(?:s|ping)\s+up|on\s+(?:the\s+)?(?:dash|dashboard|display|screen|cluster|instrument\s+(?:cluster|panel)))(?![a-z])|${__T[5]}(?:dash|dashboard|display|screen|cluster|instrument\s+(?:cluster|panel))\s+(?:(?:is\s+)?(?:showing|shows|gives|giving|has)\s+(?:an?\s+|the\s+)?)?(?:error|fault|warning)\s+(?:messages?|codes?)(?![a-z])|${__T[5]}(?:dash|dashboard|display|screen|cluster|instrument\s+(?:cluster|panel))${__T[7]}(?:says|shows|showing|saying)\s+${__T[8]}(?:(?:workshop|garage)\s+(?:visit|required|needed)|(?:visit|go\s+to|see)\s+(?:the\s+|a\s+)?(?:workshop|garage))(?![a-z])|${__T[5]}(?<!(?:air|pressure|reefer|reversing|reverse|alarm|seatbelt|belt)\s)(?:warning\s+)?buzzer\s+(?:(?:is|keeps?|kept|has\s+been|won['’]?t|will\s+not)\s+)?(?:beeping|buzzing|going(?:\s+off)?|sounding|on|stop)(?![a-z])|${__T[5]}(?:dash|dashboard|display|cluster)\s+(?:(?:keeps|kept|is|started|constantly|always)\s+){0,2}(?:beeping|bleeping|buzzing|pinging)(?![a-z]))${__T[10]}funktioniert\s+wieder|geht\s+wieder|wieder\s+(?:ok|in\s+ordnung|aus)${__T[23]}works\s+again${__T[11]}заменил\S*))`, 'i', 1);










const LEAK_HINT = lbRx(String.raw`${__T[3]}(?:oel|ol|öl|diesel|k(?:ue|u)hlwasser|k(?:ue|u)hlmittel)\s+${__T[9]}(?:l(?:ae|a)uft\s+aus|tropft|tropfen|verlust${__T[0]}|leckt?${__T[0]})|${__T[3]}(?:oel|öl)leck|(?<!kein(?:e|en)?\s+)öl(?:spur|fleck|lache|pfütze|pfuetze|verlust)|(?:öl|diesel|kraftstoff|sprit|kühlwasser|kühlmittel|kühlflüssigkeit|frostschutz\S*|hydraulik\S*|adblue|bremsflüssigkeit|flüssigkeit)\s+${__T[9]}(?:tropft|tropfen|läuft\s+aus|ausgelaufen|ausläuft|leckt|tritt\s+aus|austritt|ausgetreten)|(?:tropft|leckt)\s+${__T[9]}(?:öl|diesel|kraftstoff|kühlwasser|kühlmittel|hydrauliköl|flüssigkeit)|läuft\s+${__T[8]}(?:öl|diesel|kraftstoff|kühlwasser|kühlmittel|flüssigkeit)\S*\s+aus${__T[0]}|verlier\S*\s+${__T[8]}(?:öl|diesel|kraftstoff|kühlwasser|kühlmittel|hydrauliköl|flüssigkeit)|(?:tank|kühler|(?<!luft)schlauch|(?<!luft)leitung|ölwanne|dichtung)\S*\s+${__T[8]}(?:undicht|leckt|leck${__T[0]}|tropft|tropfen)|(?:lache|pfütze|fleck)\s+${__T[8]}unter\s+(?:dem|der|den)${__T[7]}(?:lkw|fahrzeug|wagen|motor|zugmaschine|auflieger|anhänger|getriebe)${__T[39]}oil|fuel|diesel|coolant|antifreeze|hydraulic(?:\s+(?:oil|fluid))?|brake\s+fluid|adblue|fluid)\s+${__T[8]}(?:leak|leaking|leaks|leaked|dripping|drips|spill|spilled|spilling|running\s+out|escaping)|leak(?:s|ing|ed)?\s+${__T[8]}(?:oil|fuel|diesel|coolant|antifreeze|hydraulic|fluid)|losing${__T[7]}(?:oil|coolant|fuel|diesel|fluid)|(?:puddle|pool|stain)\s+(?:of\s+\S+\s+)?under\s+(?:the\s+)?(?:truck|lorry|vehicle|engine|trailer|tractor)|oil\s+(?:slick|trail)|(?:теч|протіка|підтіка|протека|подтека|капа|капл|гонит|гонят|гонить|жене|женуть)\S*\s+${__T[8]}(?:олив|масл|пальн|палив|дизел|антифриз|тосол|охолодж|охлажд|топлив|солярк|гідравлік|гидравлик|гідроборт|гидроборт|адбл|мочевин|сечовин)|(?:олив|масл|пальн|палив|дизел|антифриз|тосол|охолодж|охлажд|топлив|солярк|гідравлік|гидравлик|гідроборт|гидроборт|адбл|мочевин|сечовин)\S*\s+${__T[8]}(?<!не\s)(?:тече|теч[еёу]т|протіка|підтіка|протека|подтека|капа|гонит|гонят|гонить|жене|женуть)|(?:пятн|плям)\S*\s+(?:від\s+|от\s+)?(?:олив|масл|пальн|палив|дизел|антифриз|тосол|солярк)\S*${__T[7]}(?:під|под)${__T[6]}|(?:масл|олив)\S*\s+(?:пятн|плям)\S*${__T[7]}(?:під|под)${__T[6]}|(?:витік|витоку|витікає|утечк)\S*${__T[7]}(?:олив|масл|пальн|палив|дизел|антифриз|тосол|охолодж|охлажд|топлив)|(?:калюж|луж)\S*\s+${__T[8]}(?:під|под)${__T[7]}(?:вантажівк|машин|авто|тягач|грузовик|двигун|мотор|причіп|прицеп)|unter\s+(?:dem|der|den)\s+(?:lkw|fahrzeug|wagen|motor|zugmaschine|auflieger|anhänger|getriebe)\S*\s+${__T[9]}(?:lache|pfütze|pfuetze|ölfleck|fleck)|${__T[4]}(?:бак|радіатор|радиатор|картер|мастил)\S*\s+${__T[8]}(?<!не\s)(?:тече|теч[еёу]т|протіка|підтіка|протека|подтека|капа)|(?:тече|теч[еёу]т|протіка|підтіка|протека|подтека)\S*${__T[7]}(?:бак|радіатор|радиатор|картер)|(?:під|под)${__T[7]}(?:вантажівк|машин|авто|тягач|грузовик|двигун|мотор|причіп|прицеп)\S*${__T[7]}(?:калюж|луж)|${__T[1]}(?:diesel|kraftstoff|sprit)geruch|${__T[1]}riecht\s+${__T[8]}nach\s+(?:diesel|kraftstoff|sprit|treibstoff)|${__T[5]}(?:smell\S*|smells|smelling)\s+${__T[8]}(?:of\s+)?(?:diesel|fuel)(?![a-z])|${__T[4]}(?:пахне|пахнет|запах\S*)${__T[7]}(?:дизел|пальн|палив|солярк|топлив)\S*|${__T[1]}(?:kühler|kuehler|kühlwasser|kuehlwasser|kühlmittel|kuehlmittel|wasser|hydraulik|öl|oel|diesel|kraftstoff)schl(?:ä|ae|a)uch(?:e|es|s)?\s+${__T[8]}(?:geplatzt|geborsten|gerissen|abgerissen|abgesprungen|porös|poroes)${__T[0]}|${__T[5]}(?:coolant|radiator|hydraulic|fuel|oil)\s+(?:hose|pipe|line)s?${__T[7]}(?:burst|split|ruptured|blew|came\s+off)(?![a-z])|${__T[4]}(?:патруб\S*|шланг\S*\s+(?:радіатор|радиатор|охолодж|охлажд|гідравл|гидравл|пальн|палив|топлив|олив|масл)\S*)${__T[7]}(?:лопну|прорва|порва|розірва|зірва|сорва)\S*|${__RX[8]}${__T[5]}radiator\s+${__T[8]}(?:leak\S*|dripping|losing\s+(?:coolant|water))(?![a-z])${__RX[8]}|${__RX[8]}${__T[5]}(?:diesel|fuel)\s+(?:smell|odou?r|fumes)\s+${__T[8]}(?:in|inside)\s+(?:the\s+)?cab(?:in)?(?![a-z])|${__T[5]}(?:smell\S*|stink\S*)\s+(?:of\s+)?(?:diesel|fuel)${__T[7]}(?:in|inside)\s+(?:the\s+)?cab(?:in)?(?![a-z])${__RX[8]}|${__RX[8]}${__T[1]}(?:(?:ö|oe)lwanne|getriebewanne)\s+${__T[8]}(?:aufgerissen|gerissen|durchgeschlagen|durchschlagen|leck${__T[0]}|hat\s+(?:ein\s+)?loch)${__T[0]}|${__T[5]}(?:oil\s+)?sump\s+${__T[8]}(?:cracked|holed|punctured|split|leak\S*)(?![a-z])|${__T[2]}(?:пробив\S*|пробил\S*|пробит\S*|трісну\S*|тресну\S*)${__T[7]}(?:масля\S*\s+)?(?:піддон\S*|поддон\S*|картер\S*)${__RX[8]}|${__RX[7]}${__T[1]}(?:k(?:ü|ue)hlwasser|k(?:ü|ue)hlfl(?:ü|ue)ssigkeit|k(?:ü|ue)hlmittel)${__T[7]}(?:verliert|verloren|l(?:ä|ae)uft\s+aus|tropft)${__T[0]}${__RX[7]}|${__RX[7]}${__T[2]}(?:втрача\S*|тер[яе]\S*|йде|уходит)${__T[7]}(?:охолоджувальн\S*|охлаждающ\S*)\s+(?:рідин\S*|жидкост\S*)${__RX[7]}|${__RX[7]}${__T[2]}(?:охолоджувальн\S*|охлаждающ\S*)\s+(?:рідин\S*|жидкост\S*)${__T[7]}(?:тече|теч[её]т|витіка\S*|вытека\S*|йде|уходит)${__T[6]}${__RX[7]}|${__T[3]}(?:öl|oel|diesel|kraftstoff|k(?:ü|ue|u)hlwasser|k(?:ü|ue|u)hlmittel|hydraulik\S*|adblue|fl(?:ü|ue)ssigkeit)\s+${__T[9]}(?:l(?:ä|ae|a)uft|kommt|spritzt|sprüht)${__T[7]}raus${__T[0]}|${__T[3]}(?:sifft|siffen|suppt|suppen|schwitzt|schwitzen)\s+${__T[8]}(?:öl|oel|diesel|k(?:ü|ue|u)hlwasser|k(?:ü|ue|u)hlmittel|hydraulik\S*)|${__T[3]}(?:motor|getriebe|achse|hinterachse|differential|ölwanne|zylinderkopf|turbo\S*|retarder|kompressor|lenkgetriebe|hydraulik|kippzylinder|hubzylinder)\S*\s+${__T[8]}(?:sifft|suppt|schwitzt)${__T[0]}|${__T[1]}(?:(?:diesel|kraftstoff|adblue|hydraulik(?:(?:ö|oe)l)?|(?:ö|oe)l)-?)?tank(?:s)?${__T[0]}\s+${__T[8]}(?:l(?:ä|ae)uft${__T[7]}aus|ist\s+ausgelaufen)${__T[0]}${__RX[0]}|${__T[1]}(?:(?:motor|hydraulik|getriebe)?(?:ö|oe)l|diesel|kraftstoff|sprit)\s+verliert${__T[0]}(?!${__T[7]}(?:nicht|kein))${__T[10]}abgedichtet|fixed|repaired|replaced))|${__T[2]}(?:лопнул\S*|лопнув|пробило|порвало|прорвало|порвал\S*|теч[её]т|тече|протека\S*|протіка\S*|потек\S*|потік)${__T[7]}(?:патрубок|патрубк\S*|помп\S*)${__RX[0]}|${__T[2]}помп\S*${__T[7]}(?:теч[её]т|тече|протека\S*|протіка\S*|потекл\S*|потек\S*)${__RX[0]}|${__RX[14]}${__T[1]}(?<!(?:luft|balg|b(?:ä|ae)lg|luftfeder)[^.;!?]*)(?:differential|differenzial|hinterachse|vorderachse|antriebsachse|achse|achsgetriebe|getriebe|lenkgetriebe|servolenkung|retarder|radnabe|nabe|naben|simmerring|wellendichtring|radnabendichtung)${__T[0]}\s+${__T[8]}(?:undicht|leckt|(?:ö|oe)lt|sifft|suppt|schwitzt)${__T[0]}${__RX[14]}|${__RX[14]}${__T[1]}(?:(?:ö|oe)l|getriebe(?:ö|oe)l)\s+(?:am|an\s+(?:der|dem|den)|aus\s+(?:der|dem))${__T[7]}(?:differential|differenzial|hinterachse|vorderachse|achse|getriebe|lenkgetriebe|retarder|radnabe|nabe|rad|felge|reifen)${__T[0]}${__RX[14]}|${__RX[14]}${__T[5]}(?:diff|differential|rear\s+axle|front\s+axle|drive\s+axle|axle|gearbox|transmission|hub\s+seal|wheel\s+seal|hub|steering\s+box|power\s+steering|retarder)\s+(?:is\s+|are\s+|has\s+been\s+)?(?:leak\S*|weeping|seeping)(?![a-z])${__RX[14]}|${__RX[14]}${__T[5]}oil\s+(?:on|all\s+over|around)\s+(?:the\s+)?(?:inside\s+of\s+(?:the\s+)?)?(?:wheel|rim|hub|tyre|tire)s?(?![a-z])${__RX[14]}|${__RX[14]}${__T[2]}(?:редуктор\S*|мост|моста|мосту|міст|мосту|коробк\S*|кпп|сальник\S*|гур|гпк|гидроусилител\S*|гідропідсилювач\S*|ретардер\S*|ступиц\S*|маточин\S*)${__T[6]}\s+${__T[8]}(?<!не\s)(?:теч[еёу]т|тече|потек\S*|потік|протека\S*|протіка\S*|подтека\S*|підтіка\S*)${__T[6]}${__RX[14]}|${__RX[14]}${__T[2]}(?:теч[еёу]т|тече|потек\S*|потік|протека\S*|протіка\S*|подтека\S*|підтіка\S*)\s+(?:\S+\s+){0,1}?(?:редуктор\S*|мост|моста|мосту|міст|мосту|коробк\S*|кпп|сальник\S*|гур|гпк|гидроусилител\S*|гідропідсилювач\S*|ретардер\S*|ступиц\S*|маточин\S*)${__T[6]}${__RX[14]}|${__RX[14]}${__T[2]}(?:лопну\S*|прорва\S*|порва\S*|розірва\S*|сорва\S*)${__T[7]}шланг\S*\s+(?:гидравл|гідравл|гур|гпк|радиатор|радіатор|охлажд|охолодж|топлив|палив|масл|олив)\S*${__RX[14]}`, 'i', 1);

const LEAK2_HINT = lbRx(String.raw`${__T[10]}abgedichtet|nachgezogen|wieder\s+(?:dicht|trocken|ok|in\s+ordnung)|${__T[13]}(?:undicht|(?:ö|oe)lig|nass|tropft)|kein(?:e|en)?\s+(?:(?:ö|oe)l|tropfen|pf(?:ü|ue)tze|lache|fleck|fl(?:ü|ue)ssigkeit)|klima|kondens|regen|w(?:ä|ae|a)sch${__T[23]}resealed|no\s+longer|no\s+(?:oil|leak|puddle)${__T[11]}заменил\S*|більше\s+не|больше\s+не|нема\S*|нет\s+))(?:${__T[1]}(?:da|es|irgendwas|was|etwas)\s+tropft\s+${__T[9]}(?:unter\S*|unten|raus|heraus)${__T[0]}|${__T[1]}(?:lkw|fahrzeug|wagen|auto|zugmaschine${__T[25]}ae)nger|sattelzug)\s+tropft${__T[0]}|${__T[1]}(?:(?:ö|oe)l|diesel|kraftstoff)?(?:filter|filtergeh(?:ä|ae)use|ablassschraube|ventildeckel|ventildeckeldichtung|einspritzleitung|r(?:ü|ue)cklaufleitung|(?:kipp|hub|hydraulik|lenk)?zylinder)${__T[0]}\s+${__T[8]}(?:undicht|leckt|leck|tropft|sifft|schwitzt|verliert${__T[7]}(?:ö|oe)l)${__T[0]}|${__T[1]}(?:motor|getriebe|achse|hinterachse|vorderachse|differential|unterboden|ölwanne|felge|kipper|ladebordwand)\S*\s+${__T[8]}(?:(?:ö|oe)lig|ver(?:ö|oe)lt|nass\s+(?:von|vor|mit)\s+(?:ö|oe)l|voller\s+(?:ö|oe)l|voll\s+(?:mit\s+)?(?:ö|oe)l)${__T[0]}|${__T[1]}(?<!kein(?:e|en)?\s+)(?:\S+e\s+)?(?:fl(?:ü|ue)ssigkeit|pf(?:ü|ue)tze|lache|(?:ö|oe)l|diesel)${__T[7]}unter(?:m|\s+(?:dem|der|den))${__T[7]}(?:auto|lkw|fahrzeug|wagen|motor|zugmaschine${__T[25]}ae)nger)${__T[0]}|${__T[5]}(?<!no\s+)(?:oil|diesel|fuel|coolant|fluid|liquid|puddle)\s+${__T[8]}under(?:neath)?\s+(?:the\s+)?(?:truck|lorry|vehicle|engine|trailer|tractor)(?![a-z])|${__T[5]}under(?:neath)?\s+(?:the\s+)?(?:truck|lorry|vehicle|engine|trailer)\s+${__T[9]}(?:puddle|oil|fluid|liquid|dripping)(?![a-z])|${__T[4]}(?:під|под)${__T[7]}(?:вантажівк|машин|авто|тягач|грузовик|двигун|мотор|причіп|прицеп)\S*${__T[7]}(?:плям|пятн|калюж|луж)\S*)`, 'i', 1);

const LEAK3_HINT = lbRx(String.raw`(?:${__T[2]}(?<!не\s)(?:пробит\S*|пробил\S*|пробив|продырявил\S*)${__T[7]}(?:(?:топливн|паливн|дизельн)\S*\s+)?бак(?:а|и|у)?${__T[6]}|${__T[2]}(?:(?:топливн|паливн|дизельн)\S*\s+)?бак(?:а|и|у)?${__T[7]}(?<!не\s)(?:пробит\S*|пробил\S*|пробив|продырявл\S*|розірван\S*|разорван\S*)|${__T[1]}(?:diesel|kraftstoff|adblue)?tank\s+(?:ist\s+|hat\s+)?(?:\S+\s+)?(?:aufgerissen|durchschlagen|aufgeschlitzt|durchstochen|ein\s+loch|leck${__T[0]})${__T[0]}|${__T[2]}(?<!(?:воздушн\S*|повітрян\S*|тормозн\S*|гальмівн\S*|пневм\S*|тормоз\S*|гальм\S*|душ\S*)\s+)(?:шланг\S*|патрубок|патрубк\S*|трубк\S*|радиатор\S*|радіатор\S*)\s+(?:(?!(?:воздуш|повітр|душ|тормоз|гальм|пневм))\S+\s+)?(?<!не\s)(?:тече|течет|протека\S*|протіка\S*|лопнул\S*|лопнув|потек\S*|потік|підтіка\S*|подтека\S*|порвал\S*|порвав\S*|прорвал\S*|прорвав\S*|дырявый|дірявий)${__T[6]}(?![^.;!?]*(?:воздух|повітр|душ))|${__T[2]}(?:масл\S*|мастил\S*|смазк\S*|мастило)${__T[7]}(?:на|по)\s+(?:колес\S*|диск\S*|ступиц\S*|маточин\S*|шин\S*|барабан\S*|внутренн\S*\s+сторон\S*\s+колес\S*)|${__T[2]}(?:капа\S*|тече|течет|подтека\S*|підтіка\S*|уходит|йде|іде)${__T[7]}(?:под|из-под|из\s+под|під|з-під|з\s+під)\s+(?:мотор\S*|двигател\S*|двигун\S*|кабин\S*|кабін\S*|тягач\S*|коробк\S*|мост\S*|міст\S*))${__RX[7]}`, 'i', 1);





const CUSTDMG_HINT = lbRx(String.raw`(?:${__T[2]}(?:клієнт|клиент)\S*\s+${__T[8]}(?:пошкодив|пошкодила|пошкодили|повредил\S*|вдарив|ударил\S*|зачепив|зацепил\S*)${__T[7]}(?:машин|вантажівк|авто|причіп|причеп|прицеп|тент|дзеркал|зеркал|двер|бампер|кабін|кабин|фур)\S*|${__T[3]}kunde(?:n)?\s+(?:hat|haben)${__T[7]}(?:lkw|fahrzeug${__T[25]}ae)nger|plane|t(?:ü|ue)r|spiegel|sto(?:ß|ss)stange|zugmaschine|wagen|aufbau|koffer|kabine|fahrerhaus)\S*${__T[7]}(?:besch(?:ä|ae|a)digt|angefahren|gerammt|eingedr(?:ü|ue)ckt)|(?<![a-z])customer\S*\s+${__T[8]}(?:damaged|dented|hit|reversed\s+into|backed\s+into)${__T[7]}(?:truck|lorry|trailer|vehicle|cab|curtain|tarp|door|bumper|mirror))${__RX[0]}|(?:stapler|hubwagen|flurförder)\S*\s+(?:\S+\s+){0,6}?(?:besch(?:ä|ae|a)digt|angefahren|gerammt|eingedrückt|aufgeschlitzt|aufgerissen|durchstoßen|getroffen|reingefahren|hineingefahren)|(?:besch(?:ä|ae|a)digt|angefahren|gerammt|eingedrückt|aufgeschlitzt|aufgerissen)\s+${__T[9]}(?:vom|von\s+(?:einem|dem)|durch\s+(?:einen|den))${__T[7]}(?:gabel)?(?:stapler|hubwagen)|(?:beim|bei\s+(?:dem|einem))\s+kunden\s+(?:\S+\s+){0,6}?(?:besch(?:ä|ae|a)digt|angefahren|gerammt|eingedrückt|aufgeschlitzt)|(?:besch(?:ä|ae|a)digt|angefahren|gerammt|eingedrückt)\s+${__T[9]}(?:beim|bei\s+(?:dem|einem))\s+kunden|(?:an\s+der|an\s+die|gegen\s+die)\s+(?:lade)?rampe\s+${__T[9]}(?:gestoßen|angefahren|besch(?:ä|ae|a)digt|eingeklemmt|geknallt|gefahren)|(?:lade)?rampe\s+${__T[9]}(?:besch(?:ä|ae|a)digt|angefahren|eingedr(?:ü|ue)ckt|eingedellt)|forklift\S*\s+(?:\S+\s+){0,6}?(?:damaged|hit|struck|pierced|punctured|ripped|dented|crashed)|(?:damaged|hit|struck|pierced|dented|ripped)\s+${__T[9]}by\s+(?:a\s+|the\s+)?(?:forklift|pallet\s+truck)|(?:at|by)\s+(?:the\s+)?customer\S*\s+(?:\S+\s+){0,6}?(?:damaged|hit|dented|struck)|(?:damaged|dented)\s+${__T[9]}at\s+(?:the\s+)?customer|(?:loading\s+)?(?:dock|ramp)\s+${__T[9]}(?:damaged|hit|dented)|(?:hit|reversed\s+into|backed\s+into)\s+(?:the\s+)?(?:loading\s+)?(?:dock|ramp)|(?:навантажувач|погрузчик|штабелер)\S*\s+(?:\S+\s+){0,6}?(?:пошкод|вдари|пробив|пробил|повред|удари|зачепив|зацепил)|(?:пошкод|повред)\S*\s+${__T[9]}(?:навантажувач|погрузчик)|(?:у|в)\s+клієнт\S*\s+(?:\S+\s+){0,6}?пошкод|(?:у|в)\s+клиент\S*\s+(?:\S+\s+){0,6}?повре(?:д|жд)|рамп\S*\s+${__T[9]}(?:пошкод|повред|вдари|удари)|${__T[1]}(?:roll|hallen|hof|werks?|sektional|kipp|schiebe|lager|rampen)?(?:tor|tore|schranke|rollladen)${__T[0]}\s+${__T[9]}(?:auf|gegen)\s+(?:den|das|die|unseren?|meinen?)${__T[7]}(?:lkw${__T[25]}ae)nger|fahrerhaus|plane|aufbau|dach|koffer|kabine|zugmaschine|wagen|spiegel|fahrzeug)\S*\s+${__T[8]}(?:gefallen|gest(?:ü|ue)rzt|(?:he)?runter(?:gekommen|gegangen|gefahren|gefallen|gerauscht)|zugefallen|geknallt|geschlagen|gekracht|gedonnert|geprallt)${__T[0]}|${__T[5]}(?:gate|barrier|roller\s+shutter|shutter|roll-?up\s+door|loading\s+bay\s+door)s?\s+${__T[8]}(?:came\s+down|fell|dropped|closed|slammed|crashed)\s+(?:on(?:to)?|against|in(?:to)?)\s+(?:the\s+|my\s+|our\s+)?(?:truck|lorry|trailer|cab|curtain|roof|vehicle)(?![a-z])|${__T[2]}(?:ворот\S*|шлагбаум\S*|ролет\S*|роллет\S*)\s+${__T[8]}(?:впал\S*|упал\S*|опусти\S*|опусти\S*|вдари\S*|удари\S*|закри\S*|закры\S*)\s+(?:на|по|об)${__T[7]}(?:машин|вантажівк|авто|причіп|причеп|прицеп|тент|кабін|кабин|фур|дах|крыш)\S*|(?:an\s+der|an\s+die|gegen\s+die)\s+(?:lade)?rampe\s+${__T[9]}(?:angesto(?:ß|ss)en|gesto(?:ss)en|touchiert|gestreift|gerammt|gekracht|geprallt|gedonnert|angeeckt)${__T[0]}|${__T[1]}(?:lade)?rampe\s+${__T[9]}(?:touchiert|gestreift|gerammt|angesto(?:ß|ss)en|angeeckt)${__T[0]}|${__T[2]}(?:задел\S*|зацепил\S*|ударил\S*|въехал\S*\s+в|врезал\S*\s+в|зачепи\S*|вдари\S*|в['’ʼ]?їхав\S*\s+(?:у|в)|врізав\S*\s+(?:у|в)|стукнул\S*|притер\S*)${__T[7]}рамп\S*`, 'i', 1);




const CARGO_HINT = lbRx(String.raw`${__T[3]}(?:transport|ladungs|waren|fracht|bruch|n(?:ä|ae)sse)schaden|${__T[3]}(?:kunde|kundin|empf(?:ä|ae)nger|warenannahme|wareneingang)${__T[44]}reklamiert|reklamation|beanstandet|verweigert${__T[7]}annahme|nimmt\s+${__T[8]}nicht\s+an|lehnt\s+${__T[8]}ab|hat\s+${__T[8]}abgelehnt|will\s+${__T[8]}nicht\s+annehmen)${__T[0]}|annahme${__T[7]}verweigert|${__T[3]}(?:ware|waren|ladung|lieferung|paletten?|g(?:ü|ue)ter|kartons?|fracht|packst(?:ü|ue)cke?|kühlware|tiefkühlware)\s+${__T[9]}(?:besch(?:ä|ae|a)digt|zerbrochen|zerdr(?:ü|ue)ckt|eingedr(?:ü|ue)ckt|verdorben|aufgetaut|angetaut|reklamiert|abgelehnt|nicht\s+angenommen|zur(?:ü|ue)ckgewiesen)${__T[0]}|(?:unter\s+vorbehalt|vorbehalt)\s+${__T[9]}(?:frachtbrief|cmr|lieferschein)${__T[39]}cargo|goods|freight|load|shipment|pallets?)\s+${__T[9]}(?:damaged|broken|crushed|spoiled|thawed|rejected|refused)${__T[24]}damaged${__T[7]}(?:cargo|goods|freight|pallets?|shipment)${__T[39]}customer|consignee|receiver)\s+${__T[9]}(?:rejected|refused|complained)${__T[39]}cargo|freight)\s+claim|${__T[2]}(?:пошкоджен\S*|поврежден\S*|зіпсован\S*|испорчен\S*|бит\S*)${__T[7]}(?:вантаж(?!івк)\S*|груз(?!овик)\S*|товар\S*)|${__T[2]}(?:вантаж(?!івк)\S*|груз(?!овик)\S*|товар\S*)\s+${__T[8]}(?:пошкоджен\S*|поврежден\S*|зіпсован\S*|испорчен\S*)|${__T[2]}(?:клієнт\S*|одержувач\S*|клиент\S*|получател\S*)\s+${__T[9]}(?:відмови\S*|отказа\S*|не\s+прийня\S*|не\s+принял\S*|рекламаці\S*|рекламаци\S*)`, 'i', 1);




const NUMPLATE_HINT = lbRx(String.raw`${__T[3]}(?:(?:hintere|vordere)[snrm]?\s+)?(?:kfz-)?(?:kennzeichen(?:schild|tafel)?|nummernschild)(?:s|e|er|n|en)?\s+(?:(?:ist|sind|wurde|wurden|war|hinten|vorne|vorn|am|an|der|die|das|dem|den|vom|von|beim|bei|lkw|auflieger|aufliegers|anh(?:ä|ae)nger|anh(?:ä|ae)ngers|trailer|zugmaschine|sattelzug|komplett|ganz|unterwegs|w(?:ä|ae)hrend|fahrt|auf|autobahn|leider|heute|nacht|wohl|vermutlich|irgendwo|schon|total|stark|teilweise|mir|uns|beide|beiden|einfach|plötzlich|halb|mehr|über|in|letzter|letzte|seit|gestern)\s+){0,4}(?:verloren|abgefallen|runtergefallen|heruntergefallen|weg${__T[0]}|fehl(?:t|en)|gestohlen|geklaut|entwendet|abgeschraubt|abmontiert|abgerissen|abgebrochen|unleserlich|${__T[13]}(?:lesbar|da|dran)|verbogen|zerbrochen|gebrochen|gerissen|besch(?:ä|ae|a)digt|kaputt|zerkratzt)${__T[0]}|${__T[3]}(?:verlorene|gestohlene|geklaute|fehlende|abgefallene|unleserliche|besch(?:ä|ae|a)digte|kaputte|verbogene|zerbrochene|abgeschraubte)[snrm]?\s+(?:(?:hintere|vordere)[snrm]?\s+)?(?:kfz-)?(?:kennzeichen(?:schild|tafel)?|nummernschild)(?:s|e|er|n|en)?${__T[0]}|${__T[3]}kein(?:e|en)?\s+(?:(?:hinteres|vorderes)\s+)?(?:kfz-)?(?:kennzeichen(?:schild|tafel)?|nummernschild)(?:s|e|er|n|en)?\s+(?:mehr\s+)?(?:dran|am|an|drauf|vorhanden)${__T[0]}|(?:kennzeichen|nummernschild)(?:diebstahl|verlust)${__T[39]}(?:rear|front)\s+)?(?:number|licen[cs]e|registration|reg)\s+plates?\s+(?:(?:is|are|was|were|has|have|been|got|on|the|rear|front|trailer|truck|our|my|both|just|completely|somehow|during|drive|while|driving)\s+){0,4}(?:lost|missing|gone|stolen|fell\s+off|came\s+off|fallen\s+off|come\s+off|broken|cracked|damaged|unreadable|illegible|bent|snapped)${__T[24]}(?:lost|stole|took|missing|broken|damaged|stolen)\s+(?:the\s+|a\s+|my\s+|our\s+|both\s+)?(?:(?:rear|front|trailer)\s+)?(?:number|licen[cs]e|registration|reg)\s+plates?(?![a-z])|${__T[2]}(?:номерн\S*\s+знак\S*|номерн\S*\s+табличк\S*)\s+${__T[8]}(?:загуби\S*|загубл\S*|втрати\S*|втрачен\S*|потеря\S*|потерял\S*|відпа\S*|отпа\S*|відвали\S*|отвали\S*|вкрал\S*|вкрад\S*|украл\S*|украд\S*|зняли|сняли|відкрути\S*|открути\S*|немає|нема|нет${__T[6]}|зник\S*|пропа\S*${__T[28]}пошкоджен\S*|поврежден\S*|не\s+чита\S*|нечитаб\S*)|${__T[2]}(?:номер(?:и|а)?)\s+(?:загуби\S*|загубл\S*|втрати\S*|втрачен\S*|потеря\S*|потерял\S*|відпа\S*|отпа\S*|відвали\S*|отвали\S*|вкрал\S*|вкрад\S*|украл\S*|украд\S*|зняли|сняли|відкрути\S*|открути\S*|немає|нема|нет${__T[6]}|зник\S*|пропа\S*${__T[28]}пошкоджен\S*|поврежден\S*|не\s+чита\S*|нечитаб\S*)|${__T[2]}(?:загуби\S*|втрати\S*|потерял\S*|вкрали|украли|зняли|сняли|немає|нема|нет)\s+(?:\S+\s+){0,1}?(?:(?:номерн\S*\s+знак\S*|номерн\S*\s+табличк\S*)|(?:номер(?:и|а)?))${__T[6]}(?!\s+(?:телефон|заявк|рахун|сч(?:е|[её])т|замовл|заказ|рейс|документ|договор|догов|накладн)\S*)`, 'i', 1);

const NUMPLATE_WORDS = lbRx(String.raw`${__T[3]}(?:kfz-)?(?:kennzeichen|nummernschild)(?:schild|tafel)?(?:s|e|er|n|en)?${__T[0]}${__T[39]}number|licen[cs]e|registration|reg)\s+plates?(?![a-z])|${__T[2]}номерн\S*\s+(?:знак|табличк)\S*|${__T[2]}номер(?:и|а)?${__T[6]}`, 'gi');




const PFILTER_HINT = lbRx(String.raw`${__T[3]}(?:(?:diesel|ru(?:ß|ss))?partikelfilter|dpf|abgasnachbehandlung|abgasreinigung)(?:-|\s+)(?:(?:ist|sind|wurde|war|der|die|das|dem|den|im|am|beim|lkw|komplett|ganz|wohl|vermutlich|schon|wieder|st(?:ä|ae)ndig|dauernd|immer|seit|heute|gestern|leuchte|anzeige|symbol|lampe|meldet|meldung|zeigt|sagt|laut|display|muss|soll|sollte|m(?:ü|ue)sste|-)\s+){0,4}(?:voll|verstopft|zu${__T[0]}|beladen|leuchte\S*|warn\S*|symbol|fehler\S*|st(?:ö|oe)rung|defekt|regenerier(?!t${__T[0]})\S*|regeneriert\s+(?:werden|nicht)|regeneration\S*|freibrenn\S*|brennt${__T[7]}nicht\s+frei|an${__T[0]}|blinkt)${__T[0]}${__RX[15]}|${__T[3]}(?:stand|park|zwangs)[\s-]?regeneration\S*|${__T[3]}(?:regeneration|freibrennen)\s+(?:(?:des|vom|von|dem|der|filters?|partikelfilters?|dpf|l(?:ä|ae)uft|klappt|geht|ist|wird|wurde|immer|wieder|st(?:ä|ae)ndig|dauernd)\s+){0,3}(?:nicht|abgebrochen|bricht|fehlgeschlagen|n(?:ö|oe)tig|erforderlich|angefordert|startet\s+nicht|unm(?:ö|oe)glich)${__T[0]}${__T[39]}dpf|(?:diesel\s+)?particulate\s+filter)\s+(?:(?:is|light|warning|lamp|symbol|on|the|keeps|says|always|again)\s+){0,3}(?:full|blocked|clogged|light|warning|fault|on|regen\S*|needs?)(?![a-z])${__RX[15]}${__T[39]}parked|forced|manual|stationary)\s+regen(?:eration)?${__T[24]}regen(?:eration)?\s+(?:(?:is|keeps|won['’]?t|will|not|does|doesn['’]?t|keeps)\s+){0,2}(?:fail\S*|stopping|abort\S*|start|work\S*|required|needed)(?![a-z])|${__T[2]}(?:сажов\S*|сажев\S*)\s+фільтр\S*|${__T[2]}(?:сажов\S*|сажев\S*)\s+фильтр\S*|${__T[2]}(?:фільтр|фильтр)\S*\s+(?:твердих\s+частинок|твердых\s+частиц)|${__T[2]}(?:дпф|сажовик\S*)|${__T[2]}регенерац\S*\s+${__T[8]}(?:не\s+проход\S*|не\s+запуска\S*${__T[15]}не\s+відбува\S*|не\s+происход\S*|перерива\S*|прерыва\S*|потрібн\S*|нужн\S*)|${__T[5]}regen(?:eration)?\s+(?:light|lamp|warning|symbol|icon)\s+(?:(?:is|has|came|keeps?|now|just)\s+){0,2}(?:on|lit|flashing|blinking|come\s+on)${__T[41]}|gone|cleared|went\s+out|no\s+longer))`, 'i', 1);





const STEP_HINT = lbRx(String.raw`${__T[2]}(?:відлама\S*|отлома\S*|злама[влн]\S*|сломал\S*|відірва\S*|оторва\S*|відпал\S*|отпал\S*)${__T[7]}(?:сходин\S*|ступеньк\S*|підніжк\S*|подножк\S*)(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|fixed|repaired|replaced${__T[11]}заменил\S*|приварил\S*|приварил\S*|прикрутил\S*))|${__T[1]}(?:aufstiegstritt|einstiegstritt|aufstiegsstufe|trittstufe|trittbrett|tritt|stufe|aufstieg|einstieg|einstiegsstufe|aufstiegsleiter|leiter|haltegriff|griffstange|einstiegsgriff|handlauf|griff)(?:e|en|n|s|es)?\s+(?:(?:ist|sind|wurde|war|der|die|das|am|an|beim|vom|fahrerseite|beifahrerseite|links|rechts|unten|oben|untere|obere|fahrerhaus|kabine|lkw${__T[25]}ae)nger|komplett|ganz|total|sehr|extrem|stark|wieder|schon|seit|heute|gestern|morgens)\s+){0,3}(?:lose|locker|wackelt|wackeln|wackelig|abgebrochen|gebrochen|gerissen|verbogen|defekt|kaputt|fehlt|fehlen|abgerissen|glatt|rutschig|vereist|gl(?:ä|ae)tte|eingerissen)${__T[0]}(?!${__T[7]}(?:wieder\s+fest|befestigt|repariert|getauscht|ersetzt|behoben|fixed|repaired))|${__T[3]}(?:beim|bei[mn]?)\s+(?:ab|aus|ein|auf|runter|herunter|hoch)steigen${__T[44]}ausgerutscht|abgerutscht|weggerutscht|gest(?:ü|ue)rzt|gefallen|hingefallen|runtergefallen|heruntergefallen|abgest(?:ü|ue)rzt|umgeknickt)${__T[0]}|${__T[3]}(?:aus|von)\s+(?:der|dem)\s+(?:kabine|fahrerhaus|lkw|auflieger|ladefl(?:ä|ae)che|stufe|trittstufe)\s+${__T[8]}(?:gest(?:ü|ue)rzt|gefallen|abgerutscht|ausgerutscht|abgest(?:ü|ue)rzt)${__T[0]}|(?<![a-z])(?<!next\s)(?<!first\s)(?<!last\s)(?:cab\s+)?(?:steps?|grab\s+handles?|handrails?|access\s+ladder|ladder)\s+(?:(?:is|are|on|the|driver['’]?s?|side|loose|very|completely)\s+){0,3}(?:loose|broken|bent|missing|wobbly|slippery|icy|cracked)${__T[24]}(?:slipped|fell|fallen)\s+${__T[9]}(?:(?:getting|climbing|stepping)\s+(?:out|down|in|up)|(?:from|off)\s+(?:the\s+)?(?:cab|step|steps|truck|trailer|ladder))(?![a-z])|${__T[2]}(?:сходин\S*|ступеньк\S*|підніжк\S*|подножк\S*|поручн\S*|поручен\S*|ручк\S*\s+(?:кабін|кабин)\S*)\s+${__T[8]}(?:злама[внл]\S*|сломан\S*|сломал\S*|відлама\S*|отлома\S*|відірва\S*|оторва\S*|хитає\S*|шатает\S*|болтає\S*|болтает\S*|розхита\S*|расшата\S*|слизьк\S*|скользк\S*|обледен\S*${__T[37]}\S*|погнут\S*|зігнут\S*)|${__T[2]}(?:посковзну\S*|поскользну\S*|впав|упал|упала|впала|зірвав\S*|сорвал\S*)\s+${__T[9]}(?:з\s+кабін\S*|с\s+кабин\S*|з\s+підніжк\S*|с\s+подножк\S*|виходячи|выходя|злазячи|слезая)`, 'i');
const STEP_WORDS = lbRx(String.raw`${__T[1]}(?:aufstiegstritt|einstiegstritt|aufstiegsstufe|trittstufe|trittbrett|tritt|stufe|aufstieg|einstieg|einstiegsstufe|aufstiegsleiter|leiter|haltegriff|griffstange|einstiegsgriff|handlauf|griff)(?:e|en|n|s|es)?${__T[0]}${__T[39]}cab\s+)?(?:steps?|grab\s+handles?|handrails?|access\s+ladder|ladder)(?![a-z])|${__T[2]}(?:сходин|підніжк|подножк|поручн|поручен)\S*`, 'gi');







const INJURY_HINT = lbRx(String.raw`${__T[1]}(?:arbeits|betriebs)unf(?:ä|ae|a)ll\S*${__T[39]}work(?:place)?|industrial|occupational)\s+(?:accident|injury)|(?<![a-z])accident\s+at\s+work|${__T[2]}(?:нещасн\S*\s+випад\S*|несчастн\S*\s+случа\S*|виробнич\S*\s+травм\S*|производствен\S*\s+травм\S*)|(?<![^.;!?\n]*(?:reifen|flanke|lauffl|karkasse|lack|tyre|tire|шин|покришк|покрышк)[^.;!?\n]*)${__RX[16]}(?<!${__T[48]}${__T[1]}(?:verletzt|verletzte|verletzten|verletzter|verletzung|verletzungen|quetschung|schnittwunde|platzwunde|prellung|verstaucht|umgeknickt)${__T[0]}|(?<![^.;!?\n]*(?:reifen|flanke|lauffl|karkasse|lack|tyre|tire|шин|покришк|покрышк)[^.;!?\n]*)${__RX[16]}(?<!${__T[48]}(?<![a-z])(?:injured|injury|injuries|hurt\s+(?:my|his|her|their|him|himself|herself|myself|themselves)|bleeding|sprained)(?![a-z])|(?<!${__T[48]}${__T[2]}(?:травм\S*|травмув\S*|травмир\S*|поранив\S*|поранен\S*|поранил\S*|ранен\S*|забив\S*\s+(?:руку|ногу|голов\S*|палець|палец)|ушиб\S*)|${__T[1]}(?:finger|fingern|hand|h(?:ä|ae)nde|fu(?:ß|ss)|f(?:ü|ue)(?:ß|ss)e|arm|arme|bein|beine|kopf|knie|zeh|zehe|zehen|daumen|auge|augen|schulter|handgelenk|kn(?:ö|oe)chel|gesicht)${__T[44]}eingeklemmt|geklemmt|eingequetscht|gequetscht|geschnitten|aufgeschnitten|gebrochen|verbrannt|ver(?:ä|ae)tzt|verdreht|gesto(?:ß|ss)en|angeschlagen)${__T[0]}|(?<![a-z])(?<!(?:landing|support|trailer|table|seat|chair|stand|wiper|mirror|crane|tipper|lever|control|swing)\s)(?:finger|fingers|hand|hands|foot|feet|arm|arms|leg|legs|head(?!\s+(?:lights?|lamps?|rest|board|gasket))|knee|back(?!\s+(?:doors?|lights?|lamps?|axle|wall|panel|gate|steps?|window|bumper|end|seat|tyres?|wheels?))|toe|toes|thumb|eye|eyes|shoulder|wrist|ankle|face)\s+${__T[9]}(?:trapped|crushed|caught|jammed|cut|broken|burned|burnt|pinched)${__T[24]}(?:trapped|crushed|jammed|cut|pinched|broke)\s+(?:my|his|her|their|a)\s+(?:finger|fingers|hand|hands|foot|feet|arm|arms|leg|legs|head|knee|back|toe|toes|thumb|eye|eyes|shoulder|wrist|ankle|face)(?![a-z])|${__T[2]}(?:защеми\S*|прищеми\S*|затисну\S*|зажал\S*|зажало|порізав\S*|порезал\S*|придави\S*|придавил\S*)\s+${__T[8]}(?:пал\S*|рук\S*|ног\S*|кист\S*|ступн\S*)|${__T[1]}(?:ich|bin|fahrer|fahrerin|kollege|kollegin|er|sie|jemand|person|mitarbeiter|mitarbeiterin|beifahrer|beifahrerin|lagerist|staplerfahrer)\s+(?:\S+\s+){0,5}?(?:gest(?:ü|ue)rzt|hingefallen|runtergefallen|heruntergefallen|abgest(?:ü|ue)rzt|abgerutscht|ausgerutscht|gefallen)${__T[0]}${__T[39]}i|driver|colleague|he|she|someone|worker|co-driver)\s+${__T[9]}(?:fell|has\s+fallen|slipped)\s+(?:off|from)\s+(?:the\s+)?(?:trailer|truck|deck|bed|tail\s*lift|loading\s+dock|ramp|platform|load)(?![a-z])|${__T[2]}(?:впав|впала|упав|упала|упал|зірвав\S*|сорвал\S*)\s+${__T[8]}(?:з|с|зі|со)\s+(?:причеп\S*|прицеп\S*|кузов\S*|платформ\S*|рамп\S*|гідроборт\S*|гидроборт\S*|напівпричеп\S*|полуприцеп\S*|даху|крыши|тенту|тента|вантаж\S*|груз\S*)`, 'i', 1);
const INJURY_WORDS = lbRx(String.raw`${__T[1]}(?:arbeits|betriebs)unf(?:ä|ae|a)ll\S*|${__T[1]}unfall\s+(?:beim|bei\s+der|bei\s+dem|w(?:ä|ae)hrend\s+(?:der|des|dem))${__T[7]}(?:arbeit|(?:ab|be|ent|auf|um|ver)?laden|ladung|(?:ab|an|auf)?kuppeln|(?:ab|auf)?planen|sichern|zurren)\S*${__T[39]}work(?:place)?|industrial|occupational)\s+accident|(?<![a-z])accident\s+(?:at\s+work|while\s+(?:un)?loading|during\s+(?:un)?loading)`, 'gi');





const FIXOBJ_HINT = lbRx(String.raw`${__T[1]}(?<!(?:kein|keine|keinen|ohne)\s+)${__T[50]}?${__T[0]}(?!\s+(?:hat|ist|fiel|fällt|faellt|ging|kam|war)${__T[0]})\s+(?:(?!nicht\s|kein)\S+\s+){0,3}?(?:angefahren|umgefahren|weggefahren|abgefahren|gestreift|touchiert|gerammt|mitgenommen|erwischt|umgeknickt|umgerissen|abgerissen|eingedr(?:ü|ue)ckt|verbogen|besch(?:ä|ae|a)digt|kaputt\s?gefahren|demoliert)${__T[0]}|${__T[1]}(?:gegen|ins?|ans?|vors?)\s+(?:den|die|das|einen|eine|ein|dem|der)?\s*(?:\S+\s+)?${__T[50]}?${__T[0]}\s+(?:(?!nicht\s)\S+\s+){0,2}?(?:gefahren|gesto(?:ß|ss)en|geknallt|geprallt|gerutscht|gerollt|gesetzt|zur(?:ü|ue)ckgesetzt|gekracht)${__T[0]}|${__T[1]}(?:habe|hab|haben|hat)\s+(?:(?!nicht\s|kein)\S+\s+){0,4}?(?:eine?n?|die|den|das)${__T[7]}${__T[50]}?${__T[0]}\s+(?:\S+\s+){0,1}?(?:angefahren|umgefahren|weggefahren|abgefahren|gestreift|touchiert|gerammt|mitgenommen|erwischt|umgeknickt|umgerissen|abgerissen|eingedr(?:ü|ue)ckt|verbogen|besch(?:ä|ae|a)digt|kaputt\s?gefahren|demoliert)${__T[0]}|${__T[5]}(?:hit|struck|clipped|knocked\s+(?:down|over)|ran\s+(?:into|over)|reversed\s+into|backed\s+into|drove\s+into|crashed\s+into|bumped\s+into|scraped|damaged|took\s+out)\s+(?:a|an|the|some|someone['’]?s|their|his|her)?\s*(?:\S+\s+)?(?:barriers?|barrier\s+(?:arm|gate)|bollards?|lamp\s?posts?|street\s?lights?|street\s?lamps?|light\s+poles?|(?:sign\s?)?posts?|poles?|fences?|(?:road|traffic|street)\s+signs?|signs?|guard\s?rails?|crash\s+barriers?|traffic\s+lights?|(?:fuel|petrol|diesel|gas)\s+pumps?|gates?|(?<!(?:side|head|trailer|box|inner|inside)\s)walls?|bus\s+shelters?|hydrants?|bins?|(?:warehouse|office|shop|garage|loading\s+bay|dock|building)\s+doors?)(?![a-z])|${__T[4]}(?:врізав(?:ся)?|врізалас[яь]|врезал(?:ся|ась)|вдарив(?:ся)?|вдарилас[яь]|ударил(?:ся|ась|а)?|зачепив|зачепила|задел|задела|зацепил[аи]?|збив|збила|сбил|сбила|снес(?:ла)?|знесл?а?|зніс|(?:помял|пом['’ʼ]?яв|м['’ʼ]?яв|разбил|розбив|поцарапал|подряпав|погнул|погнув|ободрал|обдер)\S*\s+${__T[8]}(?:об|о|до)|пошкодив|пошкодила|повредил|повредила|наїхав\s+на|наїхала\s+на|наехал\s+на|наехала\s+на|в['’ʼ]?їха(?:в|ла)\s+[ву]|въехал[аи]?\s+в|(?:здав|здала|сдал|сдала)\s+назад\s+[ву]|задом\s+[ву])${__T[7]}(?:шлагбаум|стовп|стовпчик|столб|ліхтар|фонар|паркан|огорож|огради|забор|дорожн\S*\s+знак|знак|відбійник|отбойник|світлофор|светофор|(?:паливн|заправн|топливн)\S*\s+колонк|колонк|ворот|стін|стен|будинк|здани)\S*|${__T[5]}(?:barriers?|bollards?|fences?|gates?|walls?|(?:warehouse|office|shop|garage|loading\s+bay|dock|building)\s+doors?|lamp\s?posts?|posts?|signs?)\s+(?:was\s+|were\s+|got\s+)?(?:hit|struck|clipped|damaged|scraped|knocked\s+(?:down|over))\s+by\s+(?:the\s+|my\s+|our\s+|a\s+)?(?:truck|lorry|trailer|cab|mirror|vehicle|tail\s*-?lift)(?![a-z])|${__T[1]}(?:bin|sind)\s+(?:(?:r(?:ü|ue)ckw(?:ä|ae)rts|beim\s+rangieren|beim\s+zur(?:ü|ue)cksetzen|leicht|voll|seitlich|mit\s+dem\s+\S+)\s+)?gegen\s+(?:den|die|das|einen|eine|ein|dem|der)?\s*(?:poller|schranke|laterne|pfosten|pfahl|zaun|schild|tor|mauer|wand|ampel|leitplanke|bake|s(?:ä|ae)ule|rampe)(?:n|en|e|s|es)?${__T[0]}(?!\s+[a-zäöüß0-9])`, 'i', 1);










const FIRE_HINT = lbRx(String.raw`(?<![a-z])pozh[ae]r(?:a|u|e|om)?${__T[24]}dym\s+(?:iz|z)\s+|${__T[3]}(?<!auspuff\s+(?:kommt|kommen|steigt|steigen|qualmt\s+es|raucht\s+es)\s+${__T[8]})(?:rauch(?:entwicklung|wolke)?|raucht|qualm|qualmt)${__T[0]}(?!\s+${__T[9]}(?:auspuff|abgas)|\s+${__T[8]}beim\s+(?:gasgeben|gas\s+geben|beschleunigen|kaltstart)${__T[0]})|brandgeruch|schmorgeruch|verschmort|(?:fahrzeug|kabel|motor|reifen|bremsen)brand|${__T[3]}in\s+brand|${__T[3]}flammen?${__T[0]}|${__T[3]}feuer${__T[0]}|${__T[3]}es\s+brennt|${__T[3]}(?:motor|motorraum|reifen|rad|bremse|bremsen|kabine|fahrerhaus|fahrzeug|lkw|auflieger|anhänger|ladung|kabel|kühlaggregat)\s+brennt(?!\s+nicht)|(?<![a-z])smoke(?![a-z])(?!\s+${__T[9]}(?:exhaust|detector)|\s+${__T[8]}(?:when|while|on)\s+(?:accelerating|acceleration|(?:a\s+)?cold\s+start)(?![a-z]))|(?:engine|brakes?|wheel|tyre|tire|cab|truck|trailer)\s+(?:is\s+|was\s+)?smoking|burning\s+smell|smell\s+of\s+burning|on\s+fire|caught\s+fire|(?<![a-z])fire(?![a-z])(?!\s+extinguisher)|(?<![a-z])flames?(?![a-z])|${__T[4]}(?<!(?:вихлоп|выхлоп|глушник|глушител|труб)[а-яіїєґ]*\s+)(?:дим|диму|димом|дым|дыма|дымом|димить|дымит|димит|дымится)(?![а-яіїєґ])(?!${__T[7]}(?:з|із|из)${__T[7]}(?:вихлоп|выхлоп|глушник|глушител)|\S*\s+${__T[8]}(?:при|під\s+час|во\s+время)\s+(?:розгон|разгон|натиск\S*${__T[7]}газ|газуван|газован))|запах\S*${__T[7]}(?:гар|горіл|горел|пален)|пожеж|пожар|(?:горить|горит|палає)\s+(?:двигун|мотор|колес|шин|кабін|кабин|авто|машин|вантажівк|причіп|прицеп|проводк)|(?:двигун|мотор|колесо|шина|кабіна|кабина|машина|вантажівка|проводка)\S*\s+(?:горить|горит|загорів|загорілас|загорел|палає)|${__T[4]}(?:причіп|прицеп|напівпричіп|полуприцеп|фура|вантаж|груз|акумулятор|аккумулятор)(?![а-яіїєґ])\s+(?:горить|горит|загорів\S*|загоріл\S*|загорел\S*|палає|спалахну\S*|вспыхну\S*)|${__T[4]}(?:загорів\S*|загоріл\S*|загорел\S*|загорал\S*|спалахну\S*|вспыхну\S*)\s+(?:(?:наш|мій|моя|мой|моя|весь|вся|цілий|целый)\S*\s+)?(?:двигун|мотор|колес|шин|кабін|кабин|авто|машин|вантажівк|причіп|причеп|прицеп|напівпричеп|напівпричіп|полуприцеп|фур|проводк|вантаж|груз|акумулятор|аккумулятор)|${__T[1]}(?<!(?:kein|keinen|ohne)\s+)brand\s+(?:im|in\s+der|in\s+dem|am|an\s+der|an\s+dem|unter\s+der|unter\s+dem|auf\s+der|auf\s+dem)${__T[7]}(?:motor\S*|fahrerhaus|kabine${__T[25]}ae)nger|laderaum|ladung|reifen|rad|bremse\S*|kabel\S*|batterie\S*|lkw|fahrzeug|aggregat|k(?:ü|ue)hlaggregat)|${__T[1]}riecht\s+${__T[8]}(?:verbrannt|verschmort|angebrannt|nach\s+(?:verbranntem|verschmortem|gas|rauch|kabel(?:n)?${__T[0]}|kabelbrand))|${__T[1]}gasgeruch|${__T[5]}smells?${__T[7]}(?:burnt|burned|burning|of\s+gas)|${__T[4]}(?:пахне|пахнет)${__T[7]}(?:гар\S*|горіл\S*|горел\S*|газ\S*|проводк\S*)|${__T[1]}(?:bremse|bremsen|rad|r(?:ä|ae)der|reifen|nabe|trommel|trommeln)\s+${__T[8]}(?:rauchen|qualmen)${__T[0]}|${__T[1]}(?:stinkt|stinken|riecht|riechen)\s+${__T[8]}(?:verbrannt\S*|verschmort\S*|angebrannt\S*)|${__T[1]}verschmort(?:er|en|es)?\s+geruch`, 'i', 1);













const REEFER_HINT = lbRx(String.raw`(?:${__T[1]}temperatur\s+(?:geht${__T[7]}hoch|steigt(?:\s+an)?|klettert)${__T[7]}(?:im|in\s+der|in\s+dem)\s+(?:laderaum|k(?:ü|ue)hlraum|(?:k(?:ü|ue)hl)?(?:koffer${__T[25]}ae)nger)|k(?:ü|ue)hlauflieger)${__T[0]}|${__T[5]}temp(?:erature)?\s+in\s+(?:the\s+)?(?:trailer|reefer|box|fridge)\s+(?:is\s+|keeps\s+)?(?:rising|going\s+up|climbing|too\s+high)(?![a-z])|${__T[5]}(?:trailer|reefer|box|fridge)\s+temp(?:erature)?\s+(?:is\s+|keeps\s+)?(?:rising|going\s+up|climbing|too\s+high)(?![a-z])|${__T[2]}(?:піднімається|підіймається|піднялас[ья]|росте|зростає|виросла|поднимается|поднялась|растет|выросла)\s+температур\S*\s+(?:в|у)\s+(?:причеп\S*|причіп\S*|прицеп\S*|напівпричеп\S*|напівпричіп\S*|полуприцеп\S*|рефрижератор\S*|холодильник\S*|будц\S*|будк\S*|кузов\S*)|${__T[2]}температур\S*\s+(?:в|у)\s+(?:причеп\S*|причіп\S*|прицеп\S*|напівпричеп\S*|напівпричіп\S*|полуприцеп\S*|рефрижератор\S*|холодильник\S*|будц\S*|будк\S*|кузов\S*)${__T[7]}(?:піднімається|підіймається|піднялас[ья]|росте|зростає|виросла|поднимается|поднялась|растет|выросла)${__T[6]})${__T[10]}${__T[42]}|normal)${__T[23]}back\s+to\s+normal${__T[11]}заменил\S*|усунул\S*|устранил\S*|нормалізу\S*|нормализ\S*))|${__T[4]}(?:термописец\S*|термописц\S*|термописець|термореєстратор\S*|терморегистратор\S*|термопринтер\S*|температурн\S*\s+(?:реєстратор|регистратор|самописець|самописец|принтер)\S*)${__T[7]}(?:не\s+(?:друку|печата|працю|работа|показу|пише|пишет)\S*|злама\S*|слома\S*|помилк\S*|ошибк\S*|глюч\S*)|${__T[1]}(?:(?:k(?:ü|ue)hl)?aggregat(?:s|es)?|k(?:ü|ue)hlger(?:ä|ae)t(?:s|es)?|k(?:ü|ue)hlmaschine|thermo\s?king|carrier)${__T[0]}\s+(?:[^\s.;!?,]+\s+){0,2}?(?:batterie|akku|tank|diesel)(?:s|n)?\s+(?:ist\s+|sind\s+)?(?:leer|alle|platt|tot)${__T[0]}${__RX[17]}|${__T[1]}(?:batterie|akku|tank)(?:s|n)?\s+(?:vom|von\s+der|von\s+dem|des|am)\s+(?:k(?:ü|ue)hl)?(?:aggregat(?:s|es)?|ger(?:ä|ae)t(?:s|es)?)\s+(?:ist\s+)?(?:leer|alle|platt|tot)${__T[0]}${__RX[17]}|${__T[1]}(?:k(?:ü|ue)hl)?aggregat(?:e)?tank(?:s)?\s+(?:ist\s+)?(?:leer|alle)${__T[0]}${__RX[17]}|${__T[1]}(?:k(?:ü|ue)hl)?aggregat\s+hat\s+(?:keinen\s+(?:diesel|sprit|kraftstoff)|keine\s+batterie)${__T[0]}${__RX[17]}|${__T[1]}(?:k(?:ü|ue)hlung|k(?:ü|ue)hlaggregat|aggregat|k(?:ü|ue)hlger(?:ä|ae)t|k(?:ü|ue)hlmaschine|thermo\s?king|carrier)${__T[0]}\s+${__T[8]}(?:spinnt|zickt|piept|spielt\s+verr(?:ü|ue)ckt|macht${__T[7]}(?:faxen|zicken|was\s+es\s+will)|zeigt${__T[7]}(?:alarm|fehler\S*|st(?:ö|oe)rung))${__T[0]}${__RX[17]}|(?:(?<![a-z])(?:trailer|reefer|box|load|cargo)\s+temp(?:erature)?\s+(?:is\s+)?(?:too\s+high|too\s+warm|high|rising|out\s+of\s+range)|(?<![a-z])carrier\s+(?:unit\s+)?(?:fault|error|alarm|not\s+working)|${__T[2]}температур\S*\s+(?:в|у)\s+(?:причеп\S*|прицеп\S*|напівпричеп\S*|полуприцеп\S*|рефрижератор\S*|холодильник\S*)${__T[7]}(?:висок\S*|высок\S*|піднял\S*|поднял\S*|росте|растет|завелик\S*))${__RX[0]}|${__T[1]}k(?:ü|ue)hl(?:auflieger|sattelauflieger|koffer|kofferaufbau|aufbau|anh(?:ä|ae)nger|trailer)(?:s|n)?${__T[0]}\s+${__T[9]}(?:k(?:ü|ue)hlt${__T[7]}nicht|wird${__T[7]}nicht\s+(?:kalt|k(?:ü|ue)hl)|st(?:ö|oe)rung|alarm|ausgefallen|aggregat${__T[7]}(?:aus|defekt|ausgefallen))${__T[0]}${__RX[7]}|(?:k(?:ü|ue|u)hl(?:aggregat|ger(?:ä|ae|a)t|maschine|anlage)|k(?:ä|ae|a)lte(?:aggregat|maschine|anlage)|thermo\s*king|frigoblock|${__T[3]}k(?:ü|ue|u)hlung|temperatur(?:schreiber|rekorder|recorder|drucker)|thermo(?:schreiber|drucker)|datenlogger|thermogra(?:ph|f))\S*${__T[44]}ausgefallen|f(?:ä|ae|a)llt\s+aus|aus${__T[0]}|defekt|kaput|alarm|st(?:ö|oe|o)rung|fehler|k(?:ü|ue|u)hlt\s+nicht|springt\s+nicht|startet\s+nicht|l(?:ä|ae|a)sst\s+sich${__T[7]}${__T[13]}(?:einschalten|anschalten|starten)|schaltet\s+(?:sich\s+)?(?:\S+\s+)?${__T[13]}ein${__T[0]}|geht\s+nicht|l(?:ä|ae|a)uft\s+nicht|ausgegangen|zeigt\s+nichts|druckt\s+nicht)|(?:störung|ausfall|alarm)${__T[7]}(?:kühlaggregat|kühlgerät|kühlmaschine|kälteaggregat|kühlung)|(?:laderaum|k(?:ü|ue|u)hlraum|k(?:ü|ue|u)hlkoffer|k(?:ü|ue|u)hlauflieger|k(?:ü|ue|u)hlware|tiefk(?:ü|ue|u)hlware)\S*\s+${__T[9]}(?:zu\s+warm|wird\s+warm|taut|aufgetaut)|temperatur\s+(?:im|in\s+der|in\s+dem|des)\s+(?:laderaum|k(?:ü|ue|u)hlraum|(?:k(?:ü|ue|u)hl)?(?:koffer${__T[25]}ae)nger))\S*${__T[7]}(?:steigt|zu\s+hoch)|(?<![a-z])temp(?:erature)?\s+(?:is\s+|was\s+)?(?:too\s+high|too\s+warm|rising|out\s+of\s+range)\s+in\s+(?:the\s+)?(?:trailer|reefer|box|fridge|load\s+area|cargo\s+area)(?![a-z])|(?:reefer|fridge\s+unit|refrigeration(?:\s+unit)?|chiller|(?<!engine\s)cooling\s+unit|thermo\s*king|carrier\s+transicold|temperature\s+(?:recorder|printer)|thermo\s+printer|data\s*logger)\s+${__T[9]}(?:failed|failure|fault|broken|down|not\s+working|not\s+printing|stopped|alarm|won['’]?t\s+(?:start|turn\s+on|run)|(?:doesn['’]?t|does\s+not|will\s+not)\s+start|not\s+starting|not\s+running|not\s+cooling|cut(?:s|ting)?\s+out|shut(?:s|ting)?\s+(?:down|off))${__RX[18]}|(?:trailer|load|cargo)\s+(?:is\s+)?(?:getting\s+)?(?:too\s+)?warm|temperature${__T[7]}rising\s+in\s+the\s+(?:trailer|load|box)|(?:холодильн|рефрижератор|реф(?:к[а-яіїєґ]{0,3})?(?![а-яіїєґ])|термописа|терморег[іи]стратор|ре[єе]стратор\s+температур|регистратор\s+температур|охолоджувальн\S*\s+установк|холодильная\s+установк)\S*\s+(?:(?!тягач|машин|двиг)\S+\s+){0,4}?(?:не\s+працю|не\s+работа|зламав|сломал|вийш\S*\s+з\s+ладу|выш\S*\s+из\s+строя|вимкну|выключ|(?<!не\s|(?:кабін|кабин)\S*\s+(?:\S+\s+){0,2})(?:вимика|відключа|отключа|выключа)\S*ся|не\s+охолоджу|не\s+охлажда|помилк|ошибк|в\s+аварії|в\s+аварии|аварійн\S*\s+режим|аварийн\S*\s+режим|не\s+запуска|не\s+заводит|не\s+включа|не\s+включит|не\s+вмика|не\s+увімкн)|${__T[2]}(?:холодильн|рефрижератор|реф(?:к[а-яіїєґё]{0,3})?${__T[6]})\S*\s+${__T[9]}(?:не\s+холод|не\s+мороз|не\s+морож|не\s+трима\S*\s+температур|не\s+держ\S*\s+температур)${__RX[0]}|${__T[3]}(?:ware|ladung)\s+${__T[8]}(?<!nicht\s)(?<!nie\s)zu\s+warm${__T[0]}${__RX[0]}|${__T[1]}temperaturalarm${__T[0]}(?!${__T[7]}(?:quittiert|weg|aus))${__RX[0]}|${__T[2]}авар(?:ія|ії|ію|ия|ии|ию)${__T[6]}\s+(?:рефрижератор\S*|холодильн\S*|агрегат\S*|термо\S*)(?![^.;!?]*(?:repariert|erneuert|behoben|fixed|repaired|відремонт\S*|полагод\S*|отремонт\S*|усунул\S*|устранил\S*${__T[22]}|${__T[1]}(?:thermometer|temperaturf(?:ü|ue)hler|temperatursensor|temperaturanzeige)\s+(?:im|am|vom|des|der)\s+(?:laderaum|k(?:ü|ue)hlkoffer|k(?:ü|ue)hlauflieger|k(?:ü|ue)hlaufbau|k(?:ü|ue)hlraum|koffer|auflieger|aufbau)s?${__T[0]}\s+${__T[8]}(?:zeigt${__T[7]}(?:nichts|nix|falsch\S*)|defekt|kaputt|ausgefallen|geht\s+nicht|funktioniert\s+nicht)${__T[0]}${__T[10]}nicht\s+mehr${__T[26]}in\s+ordnung)${__T[23]}no\s+longer))`, 'i', 1);


const REEFER2_HINT = lbRx(String.raw`${__T[10]}funktioniert\s+wieder|geht\s+wieder|l(?:ä|ae)uft\s+wieder|k(?:ü|ue)hlt\s+wieder|wieder\s+(?:ok|in\s+ordnung)|hydraulik|ladebordwand|lbw|strom(?:aggregat|erzeuger)|notstrom|klima|kran${__T[23]}working\s+again${__T[12]}отремонт\S*|заменил\S*|знову\s+працю\S*|снова\s+работает))(?:${__T[1]}(?<!(?:ladebordwand|lbw|hydraulik|strom|kran|klima)\S*${__T[7]})(?:k(?:ü|ue)hl)?aggregat(?:s|es)?${__T[0]}\s+${__T[8]}(?:k(?:ü|ue)hlt${__T[7]}nicht|geht\s+(?:immer|st(?:ä|ae)ndig|dauernd|zwischendurch|ständig)\s+aus|schaltet\s+(?:sich\s+)?(?:immer\s+|st(?:ä|ae)ndig\s+|dauernd\s+)?ab|vereist|zugefroren|taut\s+nicht\s+ab|abgetaut\s+nicht|(?:l(?:ä|ae)uft|geht)\s+nur\s+(?:auf|mit|am)\s+(?:netz|strom|diesel|steckdose)|(?:l(?:ä|ae)uft|geht|startet|springt)\s+${__T[13]}(?:an\s+)?(?:auf|mit|am|an)\s+(?:netz|strom|diesel|steckdose))${__T[0]}|${__T[1]}(?:display|anzeige|bedienteil)\s+(?:vom|des|am)\s+(?:k(?:ü|ue)hl)?aggregat\S*${__T[7]}(?:aus|dunkel|schwarz|tot|kaputt|defekt|geht\s+nicht)${__T[0]}|${__T[1]}(?:strom)?(?:kabel|stecker)\s+(?:f(?:ü|ue)r\s+(?:das|den|die)?\s*|vom\s+|des\s+)(?:k(?:ü|ue)hl)?(?:aggregat|k(?:ü|ue)hlung|k(?:ü|ue)hlger(?:ä|ae)t)\S*${__T[7]}(?:kaputt|defekt|abgerissen|ab|gebrochen|verschmort)${__T[0]}|${__T[1]}(?:laderaum|k(?:ü|ue)hlraum|koffer|auflieger|ware)\s+(?:wird|ist|bleibt)${__T[7]}${__T[13]}(?:kalt|k(?:ü|ue)hl|runter)${__T[0]}|${__T[1]}temperatur\s+(?:schwankt|springt|steigt\s+und\s+f(?:ä|ae)llt)\s+${__T[8]}(?:im|in\s+der|in\s+dem)\s+(?:laderaum|k(?:ü|ue)hlraum|koffer${__T[25]}ae)nger)${__T[0]}|${__T[5]}(?:reefer|fridge|refrigeration|cooling|carrier|thermo\s?king)(?:\s+unit)?\s+${__T[8]}(?:beeping|alarm\S*|fault|error|only\s+runs\s+on\s+(?:electric|mains|shore\s+power)|won['’]?t\s+(?:switch|change|go)\s+(?:over\s+)?to\s+(?:diesel|electric)|(?:iced|icing|frozen)\s+up|won['’]?t\s+defrost|not\s+defrosting|display\s+(?:is\s+)?(?:blank|dead|off)|(?:plug|cable|lead)\s+(?:is\s+)?(?:damaged|broken|melted)|fan\s+(?:is\s+)?not\s+(?:spinning|turning|working)|batter(?:y|ies)\s+(?:is\s+)?(?:flat|dead)|out\s+of\s+(?:fuel|diesel)|belt\s+(?:has\s+)?(?:snapped|broken|gone))(?![a-z]))`, 'i', 1);

const REEFER3_HINT = lbRx(String.raw`(?![^.;!?]*(?:отремонт|відремонт|заменил|поменял|замінил|поміняли|снова\s+работает|знову\s+працю|кабин|кабін))(?:${__T[2]}(?:реф\S*|термо\s?к[иі]нг\S*|к[эе]р[иі][еє]р\S*|холодильн\S*|агрегат\S*)(?:(?!тягач|машин|двиг)[^.;!?,]){0,40}?${__T[2]}(?:не\s+(?:пере(?:ход|ключа|мика)|крут|р[ао]змор[ао]ж|гори|завод|запуска|охла|охол)\S*|аларм\S*|пищ\S*|только\s+от\s+(?:сети|розетки)|тільки\s+від\s+(?:мережі|розетки)|обмерз\S*|обледен\S*|льду|льоду|лед|лід|замерз\S*|сел\s+акк\S*|сів\s+акум\S*|разряд\S*|розрядж\S*|закончил\S*|закінчил\S*|пуст\S*|порван\S*|порвал\S*|порвав\S*|сгорел\S*|згорі\S*|ошибк\S*|помилк\S*)|${__T[2]}(?:не\s+(?:переход|переключа|перемика|крут|разморажива|розморожу|горит|горить|заводит|заводить|запуска)\S*|аларм\S*|в\s+аварии|в\s+аварії|аварийн\S*\s+режим|аварійн\S*\s+режим|пищ\S*|только\s+от\s+(?:сети|розетки)|тільки\s+від\s+(?:мережі|розетки)|обмерз\S*|обледен\S*|льду|льоду|лед|лід|замерз\S*|сел\s+акк\S*|сів\s+акум\S*|разряд\S*|розрядж\S*|закончил\S*|закінчил\S*|пуст\S*|порван\S*|порвал\S*|порвав\S*|сгорел\S*|згорі\S*|ошибк\S*|помилк\S*)(?:(?!тягач|машин|двиг)[^.;!?,]){0,25}?${__T[2]}(?:реф(?:а|е|у|і|ке|ки|ку)|термо\s?к[иі]нг[аеуі]|агрегат[аеуі])${__T[6]}|${__T[2]}(?:в|у)\s+(?:будк|будц|кузов|прицеп|причеп|причіп|полуприцеп|напівприч|рефе|рефі)\S*\s+(?:(?!не\s)\S+\s+)?(?:жарко|тепло)${__T[6]}|${__T[2]}товар\S*\s+(?:(?!не\s)\S+\s+)?(?:гре|грі|нагр|нагрі|тает|тане|подтаял|підтанув|потек|потік|разморозил|розморозил|розморозив))`, 'i', 1);






















const BRAKE_HINT = lbRx(String.raw`(?![^.;!?]*(?:reifen|tyres?|tires?|wheels?|шин\S*|колес\S*|коліс\S*|klima\S*|k(?:ü|ue)hl\S*|reefer|рефриж\S*|кондиц\S*))(?:${__T[1]}(?:luft|vorrats|brems|system)druck\s+${__T[8]}(?:f(?:ä|ae)llt|sinkt|bricht\s+ein|geht${__T[7]}runter|(?:ist\s+)?(?:zu\s+)?(?:niedrig|gering))${__T[0]}|${__T[1]}(?:luftdruck|druckluft|vorratsdruck|bremsdruck)warn\S*|${__T[1]}(?:lkw${__T[25]}ae)nger|zugmaschine|sattelzug|sattelauflieger|fahrzeug)\s+verliert${__T[7]}luft${__T[0]}|${__T[5]}(?<!(?:tyre|tire|wheel)s?\s(?:\S+\s){0,2})(?:low|dropping|falling|losing|loses|lost|no)\s+air\s+pressure(?![a-z])|${__T[5]}air\s+pressure${__T[7]}(?:warning|alarm|light|buzzer|keeps\s+dropping|falling|drops)(?![a-z])|${__T[5]}(?:truck|trailer|lorry|tractor(?:\s+unit)?|unit|vehicle)\s+(?:is\s+|keeps\s+)?losing\s+air(?![a-z])|${__T[2]}(?:пада\S*|знижу\S*|понижа\S*|снижа\S*|низьк\S*|низк\S*)${__T[7]}(?:тиск\S*|давлен\S*)${__T[7]}(?:повітр\S*|воздух\S*)|${__T[2]}(?:витік|витоку|витікає|тече|утечк\S*|утека\S*)${__T[7]}(?:повітр\S*|воздух\S*))${__T[10]}${__T[42]}|normal)${__T[23]}back\s+to\s+normal${__T[11]}заменил\S*|усунул\S*|устранил\S*))|${__T[1]}riecht\s+${__T[8]}nach\s+(?:hei(?:ß|ss)en\s+|verbrannten\s+|gl(?:ü|ue)henden\s+)?bremsen${__T[0]}|${__T[1]}bremsgeruch|${__T[5]}smell(?:s|ing)?${__T[7]}of\s+(?:hot\s+|burning\s+|burnt\s+)?brakes?(?![a-z])|${__T[5]}brakes?\s+(?:are\s+|is\s+)?(?:smell|smells|smelling|stink|stinks|stinking)(?![a-z])|${__T[4]}(?:пахне|пахнет|пахнуть|запах\S*|смердить|смердять|воняє|воняют|воняет)${__T[7]}(?:гальм\S*|тормоз\S*|колодк\S*)|${__T[4]}(?:гальм\S*|тормоз\S*|колодк\S*)${__T[7]}(?:пахн\S*|смерд\S*|воня\S*)|${__T[1]}(?:keine|kaum|kaum\s+noch|kaum\s+mehr|wenig|keine\s+richtige|fast\s+keine)\s+bremswirkung${__T[0]}${__RX[9]}|${__T[1]}kein(?:en)?\s+(?:luft)?druck\s+(?:mehr\s+)?(?:auf|in|an)\s+(?:der|den)\s+bremse(?:n)?${__T[0]}${__RX[9]}|${__T[1]}keine\s+luft\s+(?:mehr\s+)?(?:im|in\s+den|in\s+der)\s+(?:kessel|vorratsbeh(?:ä|ae)lter|druckluftbeh(?:ä|ae)lter|bremskreis|bremsanlage|druckluftanlage)${__T[0]}${__RX[9]}|${__T[1]}(?:es\s+)?zischt${__T[7]}(?:hinten|vorne|unten|unterm\s+(?:lkw${__T[25]}ae)nger)|st(?:ä|ae)ndig|dauernd|die\s+ganze\s+zeit)${__T[0]}${__RX[17]}|${__T[1]}(?:druck)?luft${__T[7]}entweicht${__T[0]}${__RX[17]}|(?:(?<![a-z])brake\s+(?:pads?|linings?|shoes?)\s+${__T[8]}(?:worn|wear\s+warning|down\s+to\s+(?:the\s+)?metal|metal\s+on\s+metal|gone|finished)|(?<![a-z])brake\s+discs?${__T[7]}(?:cracked|scored|warped|worn)|${__T[1]}brems(?:bel(?:ag|(?:ä|ae)ge)|backen|kl(?:ö|oe)tze)${__T[7]}(?:verschlissen|abgefahren|runter|unten|durch|am\s+ende|fertig)${__T[0]}|${__T[1]}bremsen\s+(?:sind\s+)?(?:\S+\s+)?(?:verschlissen|abgefahren)|${__T[2]}(?:(?:гальмівн|тормозн)\S*\s+)?колодк\S*${__T[7]}(?:стерл\S*|стерт\S*|зношен\S*|изношен\S*|закінчил\S*|закончил\S*)|${__T[2]}(?:гальмівн|тормозн)\S*\s+диск\S*${__T[7]}(?:трісну\S*|тресну\S*|трісн\S*|лопну\S*|зношен\S*|изношен\S*))${__RX[0]}|${__T[1]}(?:rad|r(?:ä|ae)der|achse)${__T[7]}blockier\S*${__RX[0]}${__T[39]}wheels?|axle)\s+(?:is\s+|are\s+|keeps\s+)?(?:locked|locking|locks\s+up)(?:\s+up)?(?![a-z])${__RX[0]}|${__T[2]}(?:колес\S*|вісь|ось)${__T[7]}(?:заклинил\S*|заклинило|заблоку\S*|заблокир\S*|блоку\S*|блокир\S*)${__RX[0]}|${__T[2]}(?:ретардер\S*|інтардер\S*|интардер\S*|гальмо[\s-]+ретардер\S*|моторн\S*\s+гальм\S*|моторн\S*\s+тормоз\S*)\s+${__T[8]}(?:не\s+(?:працю|работа|гальму|тормоз|вмика|включа)|злама[вл]|сломал|відмовив|отказал|вийшов\s+з\s+ладу)\S*${__RX[7]}|${__T[1]}(?<!(?:hydraulik|hydraulikpumpe|kipper|kran|ladekran|ladebordwand|hebeb(?:ü|ue)hne|pumpe)\s+(?:\S+\s+){0,3})(?:baut|bauen)\s+${__T[8]}(?:keine[nr]?|kaum|nicht\s+genug|zu\s+wenig|nur\s+langsam)\s+(?:luft|luftdruck|druck|bremsdruck|vorratsdruck)\s+(?:mehr\s+)?auf${__T[0]}|${__T[1]}keine\s+luft\s+(?:mehr\s+)?(?:im\s+(?:system|kessel|luftkessel|bremssystem)|in\s+(?:den|der)\s+(?:kesseln|luftkesseln|bremsanlage))${__T[0]}|${__T[2]}не\s+(?:набирає|качає|накачує|нагнітає|набирает|качает|накачивает|нагнетает)\s+(?:повітря|воздух|тиск|давление)|${__T[3]}bremst\s+(?:(?:der|die|das|er|sie|es|seit|heute|gestern|bergab|beim|im|auf|nur|noch|fast|irgendwie|wieder|richtig|gar|ganz|sehr|zu|immer|schon|mehr)[,;]?\s+){0,3}(?:nicht|kaum|schlecht|schwach|schw(?:ä|ae|a)cher|ungleichm(?:ä|ae|a)(?:ß|ss)ig|einseitig)${__T[0]}(?!${__T[7]}(?:rechtzeitig|ab${__T[0]}))${__T[39]}(?:is|was|are)n['’]?t|not|barely|hardly)\s+braking${__T[24]}(?:won['’]?t|doesn['’]?t|don['’]?t|does\s+not|will\s+not)\s+brake(?![a-z])(?!\s+(?:in\s+time|early))|(?<![a-z])brakes?\s+(?:badly|poorly|weakly)(?![a-z])|${__T[4]}(?:не|погано|слабо|ледве|плохо|еле)\s+(?:гальму(?:є|ють)|тормоз(?:ит|ят))(?![а-яіїєґ])|${__T[3]}(?:(?:anh(?:ä|ae|a)nger|auflieger|trailer)[- ]?)?(?:ebs|abs)(?:-?(?:stecker|kabel|steckdose|leitung|system|anlage))?(?:-|${__T[0]}\s+${__T[8]})(?:warnung|fehler\S*|st(?:ö|oe)rung|defekt|kaputt|ausgefallen|abgerissen|besch(?:ä|ae|a)digt${__T[27]}fault|warning|failure|damaged|broken|torn|ripped\s+off|not\s+working)${__T[0]}(?![^.;!?]*(?:behoben|repariert|gel(?:ö|oe)scht|getauscht|ersetzt|erneuert|cleared|fixed|repaired|replaced)${__T[0]})|${__T[3]}brems(?:e|en)\s+${__T[8]}(?:quie?tsch\S*|kaput${__T[0]}|funktionier\S*\s+nicht|geht\s+(?:(?:tief|ganz|fast|komplett|bis)\s+){0,2}?(?:durch|zum\s+boden))|${__T[3]}brems[\s-]*(?:belag|bel(?:ä|ae|a)ge|scheiben?|pedal)\S*\s+${__T[8]}(?:abgefahren|runter|gerissen|hat\s+(?:einen\s+)?riss|geht\s+(?:(?:tief|ganz|fast|komplett|bis)\s+){0,2}?(?:durch|zum\s+boden)|kaput\S*|defekt)|(?<![a-z])tormoz\S*\s+${__T[8]}(?:ne\s+(?:rabota|derzh)|slab|skrip|ploh)|${__T[3]}(?:bremsen?|bremsscheibe\S*|bremsbel(?:ä|ae|a)g\S*|bremstrommel\S*|feststellbremse|handbremse|betriebsbremse|motorbremse|dauerbremse|retarder|intarder|bremspedal|bremswirkung|bremsdruck|vorratsdruck|druckluft|bremsleitung\S*)\s+${__T[9]}(?:zieht|ziehen|quietsch\S*|schleif\S*|rubbel\S*|greift|greifen|weich|fest${__T[0]}|festgegangen|eingefroren|festgefroren|angefroren|zugefroren|friert${__T[7]}fest|blockier\S*|heiß|heiss|stinkt|klemmt|löst\s+nicht|zisch\S*|verliert|fällt|schwach|nachl(?:ä|ae|a)(?:ss|ß)t|l(?:ä|ae|a)(?:ss|ß)t\s+nach|vibrier\S*|pulsier\S*|ungleichmäßig|einseitig|kein\s+druck|zu\s+wenig|niedrig|defekt|kaputt|ausgefallen|f(?:ä|ae|a)llt\s+aus|funktioniert\s+nicht|geht\s+nicht${__T[0]}|ohne\s+(?:funktion|wirkung)|(?:wirkt|wirken|bremst|bremsen)\s+(?:(?:fast|so\s+gut\s+wie)\s+)?(?:nicht|kaum)${__T[0]}|fehler\S*|st(?:ö|oe|o)rung)|zieht\s+${__T[9]}beim\s+bremsen|${__T[3]}bremst${__T[7]}(?:schief|einseitig|ungleichm(?:ä|ae)(?:ß|ss)ig)${__T[0]}|beim\s+bremsen\s+${__T[9]}(?:quietsch|schleif|rubbel|vibrier|zieht|ruckelt|geräusch|schlägt)|${__T[3]}(?<!(?:reifen|rdks|tpms)\S*\s+(?:\S+\s+){0,2})(?:druck|luft)verlust(?!${__T[7]}(?:am\s+|im\s+)?reifen)|(?:luft|druckluft)\s+${__T[8]}zisch|${__T[1]}zisch\S*\s+${__T[9]}(?:luft|brems|druckluft|bremsluft)leitung|(?<![a-z])air\s+(?:leak(?:s|ing)?|is\s+leaking|hissing)(?![a-z])(?![^.;!?]*(?:tyre|tire|wheel|conditioning|con(?![a-z])))|(?<![a-z])hissing\s+${__T[8]}air(?![a-z])|${__T[4]}(?<!(?:шин\S*|колес\S*|коліс\S*|кондиц\S*|кондиціон\S*|рефриж\S*)${__T[7]})(?:шипить${__T[7]}повітря|повітря${__T[7]}шипить|шипит${__T[7]}воздух|воздух${__T[7]}шипит)(?!(?:[^.;!?]*[^а-яіїєґё.;!?])?(?:шин|колес|кондиц))|druckluftleitung\S*\s+${__T[8]}(?:undicht|leck|zisch\S*|geplatzt|abgerissen)${__T[39]}brakes?(?![a-z])(?!\s+(?:lights?|lamps?))|brake\s+(?:pedal|pads?|discs?|drums?|pressure|lines?)|handbrake|parking\s+brake|air\s+(?:pressure|line|system|tanks?|reservoirs?)|retarder|intarder)\s+${__T[9]}(?:pull\S*|squeal\S*|squeak\S*|grind\S*|judder\S*|spongy|soft|stuck|seiz\S*|lock\S*|hot|smell\S*|hiss\S*|losing|lost|low|weak|fad\S*|vibrat\S*|not\s+working|failing|failed|drops?|dropping|faulty|fault|failure|broken|(?:doesn|isn|don|aren)['’]?t\s+work(?:ing)?)|pulls?\s+${__T[9]}when\s+braking|when\s+braking\s+${__T[9]}(?:squeal|grind|judder|vibrat|noise|pull)|(?:гальм|тормоз)\S*\s+${__T[9]}(?:примерз|замерз|змерз|тягн|тяне|тянет|тянут|вед[еу]|скрип|свист|скрегоч|скреж|м['’]?як|мягк|клин|заклин|гаряч|горяч|не\s+трима|не\s+держ|не\s+працю|не\s+работа|слаб|вібру|вибри|пахн|запах)|(?:скрип|свист|скрегоч|скреж)[а-яіїєґё]*\s+(?:[а-яіїєґё]+\s+)?(?:гальм|тормоз)|(?:скрип|свист|скрег|скреж)[а-яіїєґё]*\s+(?:[а-яіїєґё]+\s+)?при\s+(?:торможени|гальмуванн)|${__T[3]}(?:quietsch|kreisch|knirsch|schleif|squeal|squeak|grind)[a-zäöüß]*\s+(?:[a-zäöüß]+\s+)?(?:beim\s+bremsen|when\s+(?:braking|i\s+brake))|(?:тягне|веде|тянет|ведет)\s+${__T[8]}(?:при\s+гальмуванні|при\s+торможении)|(?:тиск|давлен)\S*\s+${__T[8]}(?:повітр|воздух)\S*${__T[7]}(?:пада|низьк|низк)|(?<!(?:шин\S*|колес\S*|коліс\S*|баллон|балон)${__T[7]})(?:повітр|воздух)\S*${__T[7]}(?:шипить|шипит|свистить|травить|травит)(?!(?:[^.;!?]*[^а-яіїєґё.;!?])?(?:шин|колес|коліс|баллон|балон))|${__T[3]}(?:luftdruck|bremsdruck|vorratsdruck|systemdruck|druck)\s+${__T[8]}baut\s+sich${__T[7]}nicht\s+(?:mehr\s+|richtig\s+)?auf|${__T[3]}(?<!(?:k(?:ü|ue|u)hlaggregat\S*|aggregat\S*|klima|klimaanlage|k(?:ü|ue|u)hlung|kühlauflieger\S*)\s)(?:druckluft|luft)?kompressor(?![^.,;]*(?:k(?:ü|ue|u)hl|klima|aggregat))\s+${__T[8]}(?:l(?:ä|ae|a)uft${__T[7]}(?:dauernd|st(?:ä|ae|a)ndig|durch|ununterbrochen|permanent)|pumpt${__T[7]}nicht|f(?:ö|oe|o)rdert${__T[7]}nicht)|${__T[3]}(?:druckluft|luft)kompressor\s+${__T[8]}(?:defekt|kaputt|ausgefallen|geht\s+nicht)|(?<![a-z])air\s+pressure${__T[7]}(?:not\s+building|won['’]?t\s+build|doesn['’]?t\s+build|isn['’]?t\s+building)|(?<![a-z])(?<!(?:reefer|fridge|unit|a\/c|ac|aircon|conditioning)\s)(?:air\s+)?compressor(?![^.,;]*(?:reefer|fridge|a\/c|air\s*con|cool))\s+${__T[8]}(?:(?:running|runs)\s+(?:constantly|continuously|non-?stop|all\s+the\s+time)|not\s+pumping)|(?<![a-z])air\s+compressor\s+${__T[8]}(?:broken|faulty|failed|not\s+working)|(?:тиск|давлен)\S*\s+${__T[8]}(?:не\s+набира\S*|не\s+накачу\S*|не\s+підніма\S*|не\s+поднима\S*)|${__T[4]}(?:компресор|компрессор)\S*(?![^.,;]*(?:холод|кондиц|рефриж))\s+${__T[8]}(?:працює\s+постійно|постійно\s+працює|постоянно\s+работает|работает\s+постоянно|не\s+кача\S*|не\s+накачу\S*)|${__T[1]}(?:lufttrockner|lufttrockenpatrone|lufttrocknerpatrone|druckregler|vierkreisschutzventil|mehrkreisschutzventil)\s+${__T[9]}(?:bl(?:ä|ae|a)st${__T[7]}ab|zisch\S*|undicht|defekt|kaputt|ausgefallen|vereist|eingefroren)${__T[0]}|${__T[5]}air\s+dryer\s+${__T[8]}(?:keeps\s+)?(?:purging|blowing(?:\s+off)?|hissing|leaking|faulty|broken|frozen)(?![a-z])|${__T[4]}(?:осушувач|осушител)\S*\s+(?:повітря\s+|воздуха\s+)?(?:\S+\s+)?(?:скида\S*|сбрасыва\S*|шипить|шипит${__T[15]}замерз\S*)|${__T[1]}(?:luft|druckluft|bremsluft|brems|versorgungs|kupplungs)schl(?:ä|ae|a)uch(?:e|es|s)?\s+${__T[9]}(?:undicht|leck${__T[0]}|zisch\S*|geplatzt|geborsten|gerissen|abgerissen|abgesprungen|porös|poroes|defekt|kaputt)|${__T[1]}(?:luft|brems)leitung(?:en)?\s+${__T[8]}(?:undicht|leck${__T[0]}|zisch\S*|geplatzt|gerissen|abgerissen)|${__T[5]}(?:air|brake|suzie|susie)\s+(?:hoses?|lines?|coils?)${__T[7]}(?:burst|split|leak\S*|hiss\S*|ruptured|torn|came\s+off|ripped)(?![a-z])|${__T[4]}(?:повітрян|воздушн|гальмівн|тормозн)\S*\s+(?:шланг|магістрал|трубк)\S*${__T[7]}(?:лопну|прорва|порва|розірва|зірва|сорва|трав|шипит|шипить|пропуска)\S*|${__T[1]}(?:luftkessel|druckluftkessel|luftbeh(?:ä|ae|a)lter|druckluftbeh(?:ä|ae|a)lter|drucklufttank|lufttank|druckluftanlage|luftanlage)(?:s|n)?\s+${__T[9]}(?:eingefroren|zugefroren|festgefroren|vereist|vol(?:l|ler)\s+wasser|undicht|zisch\S*)|${__T[1]}(?:kondens)?wasser${__T[7]}im\s+(?:drucklufttank|lufttank|luftkessel|druckluftkessel|luftbeh(?:ä|ae|a)lter|druckluftbeh(?:ä|ae|a)lter|druckluftsystem|bremssystem)|${__T[5]}(?:brakes?|air\s+(?:tanks?|reservoirs?|lines?|system))\s+${__T[8]}frozen(?![a-z])|${__T[1]}(?:druckluft\S*|luftanlage|kompressor|luftpresser|bremsdruck|vorratsdruck|luftdruck|druck|luft)\s+${__T[9]}(?:baut|bauen|baute)\s+(?:sich\s+)?${__T[8]}(?:kein(?:en)?|nicht|kaum|nur\s+(?:sehr\s+)?langsam|zu\s+langsam)\s+${__T[8]}auf${__T[0]}|${__T[1]}(?:baut|bauen|baute)\s+(?:sich\s+)?(?:kein(?:en)?|nicht\s+genug|zu\s+wenig)\s+(?:luft|brems|vorrats)druck\s+(?:mehr\s+)?auf${__T[0]}|${__T[1]}kein(?:en)?\s+(?:luft|brems|vorrats)?druck(?:aufbau)?\s+${__T[8]}(?:im|in\s+der|am)\s+(?:druckluft\S*|luftkessel\S*|bremssystem|luftanlage)${__T[39]}air(?:\s+pressure)?|pressure|compressor)\s+${__T[9]}${__T[38]}\s+not|not|isn['’]?t|is\s+not|never)${__T[7]}build(?:ing)?(?:\s+up)?|not\s+building\s+(?:up\s+)?(?:air\s+)?pressure|(?:тиск|давлен)\S*\s+${__T[8]}не\s+(?:набира|накачу|піднім|подніма)|${__T[1]}(?:betriebs)?bremse(?:n)?${__RX[19]}\s+(?:(?:sind|ist|waren|war|vorne|hinten|links|rechts|am|vom${__T[25]}ae|a)nger|wohl|komplett|total|stark|extrem|sehr|nach|der|bergab(?:fahrt)?|im|gef(?:ä|ae)lle)\s+){0,3}(?:(?:ü|ue)berhitzt|gl(?:ü|ue)ht|gl(?:ü|ue)hen|riecht|riechen|stinkt|stinken|l(?:ä|ae)sst${__T[7]}nach|lassen${__T[7]}nach|fading)${__T[0]}|(?<![a-z])brakes?\s+(?:(?:are|is|were|was|very|really|on\s+the\s+trailer)\s+){0,2}(?:overheat\S*|glowing|fading|smell\S*|hot)(?![a-z])|${__T[2]}(?:гальм\S*|тормоз\S*)${__T[7]}(?:перегрі\S*|перегре\S*|смерд\S*|воня\S*)|${__T[1]}zisch\S*\s+${__T[8]}(?:am|beim|vom|unter\s+dem|unterm|hinter\s+dem|hinten\s+am)\s+(?:anh(?:ä|ae|a)nger|auflieger|h(?:ä|ae)nger|trailer)${__T[0]}(?![^.;!?]*(?:reifen|rad${__T[0]}|ventil))${__RX[7]}|(?<![a-z])hissing\s+(?:noise\s+|sound\s+)?(?:at|from|under|on|behind)\s+(?:the\s+)?trailer(?![a-z])(?![^.;!?]*(?:tyre|tire|wheel|valve))${__RX[7]}|${__RX[7]}${__T[5]}brake\s+pedal\s+${__T[8]}(?:(?:goes|went|drops|dropped|falls|fell)\s+(?:\S+\s+){0,5}?floor|sinks|sinking|sank)(?![a-z])${__RX[7]}|${__RX[7]}${__T[2]}педал\S*\s+(?:гальм\S*|тормоз\S*)${__T[7]}(?:провалю\S*|проваливает\S*|провалил\S*|йде\s+в\s+підлогу|уходит\s+в\s+пол)${__RX[7]}|${__RX[7]}${__T[5]}(?:parking\s+brake|handbrake|hand\s+brake|spring\s+brake)s?\s+${__T[8]}${__T[18]}does\s+not|can['’]?t|cannot)\s+release${__RX[7]}|${__RX[7]}${__T[2]}(?:ручник|стоянков\S*\s+(?:гальм|тормоз)\S*)${__T[7]}не\s+(?:відпуска\S*|отпуска\S*|знімає\S*|снимает\S*)${__RX[7]}|${__RX[7]}${__T[2]}(?:помилк\S*|ошибк\S*)${__T[7]}(?:ebs|abs)${__T[7]}(?:причеп\S*|напівпричеп\S*|полуприцеп\S*|прицеп\S*)${__RX[7]}|${__RX[7]}${__T[1]}kupplungsk(?:ö|oe|o)pf(?:e)?\s+${__T[8]}(?:undicht|zisch\S*|verliert${__T[7]}luft|defekt|kaputt|abgebrochen|abgerissen)${__T[0]}${__RX[7]}|${__RX[7]}${__T[5]}(?:(?:red|yellow)\s+(?:air\s+|brake\s+)?(?:line|hose|suzie|susie)s?|palm\s+couplings?|glad\s*-?hands?)\s+${__T[9]}(?:leak\S*|hiss\S*|broken|torn|ripped|split|damaged|faulty)(?![a-z])${__RX[7]}|${__RX[7]}${__T[2]}(?<!(?:колес|шин|покришк|резин|балон|балл)\S*${__T[7]})(?:травить|травит|травлять|травят)${__T[7]}(?:повітря|воздух)${__RX[7]}|${__T[1]}(?:bremse|bremsen|bremspedal|betriebsbremse)${__T[0]}\s+(?:(?:geht|gehen|ist|sind|wird|wirkt|l(?:ä|ae)sst\s+sich|lassen\s+sich|seit\s+\S+|jetzt|heute|immer|total|sehr|extrem|richtig|ganz|irgendwie|etwas|bisschen|ein\s+bisschen)\s+){0,3}(?:schwer(?:g(?:ä|ae)ngig)?${__T[0]}(?!\s+(?:zu|auf)${__T[0]})|h(?:ä|ae)ngt|h(?:ä|ae)ngen|f(?:ü|ue)hl(?:t|en)\s+sich${__T[7]}(?:komisch|seltsam|anders|merkw(?:ü|ue)rdig|schwammig|weich|hart)\s+an)${__T[0]}(?!\s+(?:(?:mehr|so|gar|wirklich)\s+)?(?:nicht|nie|kaum)${__T[0]})${__RX[20]}|${__T[1]}bremsweg(?:e|s)?${__T[0]}\s+${__T[9]}(?:l(?:ä|ae)nger|zu\s+lang|sehr\s+lang|verl(?:ä|ae)ngert)${__T[0]}${__RX[20]}|${__T[1]}(?:l(?:ä|ae)ngere[rnms]?|verl(?:ä|ae)ngerte[rnms]?)\s+bremsweg${__RX[20]}|${__T[5]}brakes?\s+(?:(?:is|are|keep|keeps|seem|seems|feel|feels|feeling|a\s+bit|very|really|quite)\s+){0,2}(?:sticking|stick|dragging|grabbing|grab|binding|stiff|heavy|hard\s+to\s+press|(?:weird|strange|odd|funny|off)(?![a-z]))${__RX[20]}|${__T[5]}(?:longer|increased)\s+(?:braking|stopping)\s+distance|${__T[5]}(?:braking|stopping)\s+distance\s+${__T[8]}(?:longer|increased|too\s+long)(?![a-z])${__RX[20]}|${__T[2]}(?:гальм\S*|тормоз\S*)${__T[7]}(?:заїда\S*|заеда\S*|прихоплю\S*|прихватыва\S*|клин\S*|туг\S*|важк\S*|тяжел\S*)${__RX[20]}|${__T[2]}(?:гальмівн\S*|тормозн\S*)\s+(?:шлях|путь)${__T[7]}(?:довш\S*|збільши\S*|длинн\S*|увеличи\S*)${__RX[20]}|${__T[1]}(?:riss|risse)\s+in\s+(?:der|den)${__T[7]}bremsscheibe\S*${__RX[4]}|${__T[1]}bremsscheibe(?:n)?${__T[0]}\s+(?:(?:ist|sind|vorne|vorn|hinten|links|rechts|schon|ganz|total|stark|komplett)\s+){0,2}(?:blau(?:\s+angelaufen)?|verschlissen|abgenutzt|runter|riefig|eingelaufen|verzogen)${__T[0]}(?!\s+(?:mehr\s+)?nicht)${__RX[4]}|${__T[1]}(?:brems)?bel(?:ä|ae)ge${__T[0]}\s+(?:(?:sind|ist|vorne|vorn|hinten|links|rechts|schon|ganz|total|komplett|fast)\s+){0,2}(?:durch|runter|unten|abgefahren|verschlissen|alle)(?=\s*(?:$|[.,;!?\n]))${__RX[4]}|${__T[2]}(?:тріщин\S*|трещин\S*)${__T[7]}(?:гальмівн\S*|тормозн\S*)\s+диск\S*${__RX[4]}|${__T[2]}(?:гальмівн\S*|тормозн\S*)\s+(?:диск\S*|колодк\S*)${__T[7]}(?:зношен\S*|стерт\S*|стерл\S*|изношен\S*|тріснув\S*|тріснул\S*|треснул\S*)${__RX[4]}|${__T[2]}(?:замерзл\S*|замерз${__T[6]}|примерзл\S*|змерзл\S*|замерзли|примерзли|змерзли|замерзн\S*)${__T[7]}(?:гальм\S*|тормоз\S*)${__RX[21]}|${__T[1]}(?:brems(?:zylinder|kammer|membran)|membranzylinder|kombizylinder|federspeicher(?:zylinder)?|tristop(?:-?zylinder)?)\S*\s+${__T[9]}(?:verliert\s+(?!kein)(?:\S+\s+)?luft|undicht|bl(?:ä|ae)st(?:\s+ab)?|zischt|pfeift|leckt|leck${__T[0]}|luftverlust|defekt|kaputt|gerissen)${__RX[21]}|${__T[5]}(?:brake\s+(?:chamber|actuator|cylinder)|spring\s+brake\s+(?:chamber|cylinder|actuator))s?\s+${__T[8]}(?:leak\S*|hissing|broken|damaged|faulty|losing\s+air)${__RX[21]}|${__T[2]}(?:енергоакумулятор\S*|энергоаккумулятор\S*|гальмівн\S*\s+(?:камер|циліндр)\S*|тормозн\S*\s+(?:камер|цилиндр)\S*)\s+${__T[8]}(?:травит\S*|травить|спуска\S*|пропуска\S*|шипит\S*|шипить|негерметичн\S*|зламан\S*|сломан\S*|пошкоджен\S*)${__RX[21]}|(?:${__T[2]}ручник\S*\s+${__T[8]}(?:не\s+(?:працю\S*|работа\S*|відпуска\S*|отпуска\S*|опуска\S*|знима\S*|снима\S*)|заклин\S*|зламав\S*|зламан\S*${__T[17]}застря\S*|завис\S*)|${__T[1]}(?:feststell|hand|park)[\s-]?bremse\S*\s+${__T[9]}(?:l(?:ä|ae)(?:ss|ß)t\s+sich${__T[7]}${__T[13]}l(?:ö|oe)sen|l(?:ö|oe)st${__T[7]}nicht|geht${__T[7]}${__T[13]}(?:auf|raus|los)${__T[0]}))${__RX[11]}|${__T[2]}(?:не\s+(?:працює|працюють|работает|работают)|відмовив|отказал|вийшов\s+з\s+ладу|вышел\s+из\s+строя)${__T[7]}(?:abs|ebs|абс|ебс)(?![a-zа-яіїєґё])${__RX[0]}|(?<![a-zа-яіїєґё])(?:abs|ebs|абс|ебс)(?![a-zа-яіїєґё])${__T[7]}(?:не\s+(?:працює|работает)|відмовив|отказал)${__RX[0]}|${__T[2]}(?:кабель|кабел\S*|провід|провод\S*|роз[\'’ʼ]?єм\S*|разъ[её]м\S*|штекер\S*|розетк\S*)${__T[7]}(?:abs|ebs|абс|ебс)(?![a-zа-яіїєґё])\s*${__T[8]}(?:обірван\S*|обірвал\S*|оборван\S*|оборвал\S*|відірва\S*|оторва\S*|пошкодж\S*|поврежд\S*|злама\S*|слома\S*|переби\S*)${__RX[0]}|${__T[2]}(?:обірван\S*|обірвал\S*|оборван\S*|оборвал\S*|відірва\S*|оторва\S*|пошкоджен\S*|поврежден\S*|зламан\S*|сломан\S*|перебит\S*)${__T[7]}(?:кабель|кабел\S*|провід|провод\S*|роз[\'’ʼ]?єм\S*|разъ[её]м\S*|штекер\S*)${__T[7]}(?:abs|ebs|абс|ебс)(?![a-zа-яіїєґё])${__RX[0]}|(?:${__T[1]}(?:druckluft(?:bremse|anlage|system)?|bremsleitung(?:en)?)\s+${__T[8]}(?:eingefroren|zugefroren|festgefroren|friert${__T[7]}zu)|${__T[2]}(?:пневм\S*|(?:тормозн|гальмівн)\S*\s+(?:магістрал|магистрал|шланг|трубк)\S*)${__T[7]}(?:за|при|пере)мерз\S*|${__T[2]}(?:за|при|пере)мерзл\S*\s+пневм\S*)${__RX[22]}|${__T[1]}bremsfl(?:ü|ue)ssigkeit\S*\s+${__T[8]}(?:leer|zu\s+niedrig|niedrig|unter\s+min\S*|fehlt|warnung)${__T[0]}${__RX[23]}|${__T[2]}(?:(?:мало|нет|немає|низьк\S*|низк\S*|пуст\S*|порожн\S*)${__T[7]}(?:тормозн|гальмівн)\S*\s+(?:жидкост|рідин)\S*|(?:тормозн|гальмівн)\S*\s+(?:жидкост|рідин)\S*${__T[7]}(?:мало|нет|немає|низьк\S*|низк\S*|пуст\S*|порожн\S*|ниже\s+мин\S*|нижче\s+мін\S*))${__RX[23]}`, 'i', 1);







const FOREIGN_TRAILER = /kunde|kundin|fremd|customer|client|third[\s-]party|клієнт|замовник|чуж|заказчик|клиент/i;
const TRAILER_DMG = lbRx(String.raw`${__T[3]}(?:auflieger|anhänger|anhaenger|sattelauflieger)(?!kupplung)|${__T[3]}plane${__T[0]}${__T[39]}trailer|curtain|tarp(?:aulin)?)(?!\s*(?:hitch|coupling))(?![a-z])|${__T[4]}(?:напівпричеп|полуприцеп|причіп|причеп|прицеп(?!н)|тент)`, 'i', 1);


const TARP_HINT = lbRx(String.raw`${__T[1]}(?:gerissene|zerrissene|eingerissene|aufgeschlitzte|kaputte)[nr]?\s+(?:seiten|dach|schiebe)?plane${__T[0]}${__RX[24]}|${__T[5]}(?:torn|ripped|slashed)${__T[7]}(?:tarp(?:aulin)?|curtain(?:\s*side)?)s?(?![a-z])${__RX[24]}|${__T[5]}(?:tarp|tarpaulin)\s+(?:buckles?|straps?|ratchets?)\s+(?:(?:is|are|has|have|been)\s+){0,2}(?:broken|broke|snapped|missing|ripped|torn|gone)(?![a-z])${__RX[24]}|${__T[2]}(?:порвав\S*|порвал\S*|розірвав\S*|розірвал\S*|разорвал\S*|прорвал\S*|прорвав\S*|порезал\S*|порізал\S*|разрезал\S*|розрізал\S*|прорезал\S*|прорізал\S*)${__T[7]}тент\S*${__RX[24]}|${__T[1]}(?:planen(?:schnallen?|verschl(?:ü|ue)sse?|spannschl(?:o|ö|oe)ss(?:er)?)|(?:schnallen?|spannschl(?:o|ö|oe)ss(?:er)?|verschl(?:ü|ue)sse?)\s+(?:an\s+|von\s+)?der\s+plane)${__T[0]}\s+${__T[8]}(?:kaputt|defekt|gebrochen|abgebrochen|abgerissen|gerissen|ausgerissen)${__T[0]}${__RX[25]}|${__T[2]}пряжк\S*\s+(?:на\s+|від\s+|у\s+)?(?:тент\S*|штор\S*)${__T[7]}(?:злама\S*|зломал\S*|відірва\S*|відірван\S*|обірва\S*|порва\S*|тріснул\S*${__T[17]}оторва\S*|оборва\S*|розірва\S*|пошкодж\S*|перерізан\S*|розрізан\S*)|${__T[2]}(?:злама\S*|зломал\S*|відірва\S*|відірван\S*|обірва\S*|порва\S*|тріснул\S*${__T[17]}оторва\S*|оборва\S*|розірва\S*|пошкодж\S*|перерізан\S*|розрізан\S*)${__T[7]}пряжк\S*\s+(?:на\s+|від\s+|у\s+)?(?:тент\S*|штор\S*)|${__T[2]}(?:тече|течет|протіка\S*|протека\S*)${__T[7]}(?:дах\S*|крыш\S*)${__T[7]}(?:напів|полу)?(?:причеп\S*|прицеп\S*|трейлер\S*|фур\S*)|${__T[2]}(?:дах\S*|крыш\S*)${__T[7]}(?:напів|полу)?(?:причеп\S*|прицеп\S*|трейлер\S*|фур\S*)${__T[7]}(?:тече|течет|протіка\S*|протека\S*|дірав\S*|дірява\S*|дірявий|дірк\S*|дыряв\S*|дыр\S*|пробит\S*)${__T[39]}holes?|gaps?|tears?|cracks?)\s+in\s+(?:the\s+)?(?:trailer|reefer|box)\s+roof${__T[39]}roof\s+of\s+(?:the\s+)?(?:trailer|reefer)|(?:trailer|reefer)\s+roof)\s+(?:has|got|with)\s+(?:a\s+)?(?:\S+\s+)?(?:holes?|tears?|cracks?|gaps?)(?![a-z])${__RX[25]}${__T[39]}tir|customs)\s+(?:cable|cord|rope|wire)s?\s+(?:(?:is|are|has|have|was|been|got)\s+){0,2}(?:broken|broke|snapped|cut|torn|ripped|missing|damaged|frayed)(?![a-z])${__RX[25]}|${__T[2]}(?:трос\S*|тросик\S*)\s+(?:tir|тір|тир|митн\S*|таможен\S*)${__T[7]}(?:злама\S*|зломал\S*|відірва\S*|відірван\S*|обірва\S*|порва\S*|тріснул\S*${__T[17]}оторва\S*|оборва\S*|розірва\S*|пошкодж\S*|перерізан\S*|розрізан\S*)|${__T[2]}(?:митн\S*|таможен\S*)\s+(?:трос\S*|тросик\S*)${__T[7]}(?:злама\S*|зломал\S*|відірва\S*|відірван\S*|обірва\S*|порва\S*|тріснул\S*${__T[17]}оторва\S*|оборва\S*|розірва\S*|пошкодж\S*|перерізан\S*|розрізан\S*)|${__T[5]}curtain\s+(?:buckles?|straps?|poles?|rails?|ratchets?|tensioners?)\s+(?:(?:is|are|has|have|been)\s+){0,2}(?:broken|broke|snapped|missing|ripped|bent|torn|gone)(?![a-z])${__RX[18]}|(?:${__T[3]}(?:plane|seitenplane|dachplane|schiebeplane|planenaufbau|planenverdeck|schiebeverdeck|verdeck)${__T[0]}\s+${__T[9]}(?:klemm(?:t|en)|geht\s+nicht\s+(?:auf|zu)${__T[0]}|l(?:ä|ae|a)(?:ss|ß)t\s+sich\s+nicht${__T[7]}(?:(?:ö|oe)ffnen|schlie(?:ß|ss)en|schieben|zuziehen)|gerissen|eingerissen|zerrissen|aufgerissen|kaputt|besch(?:ä|ae|a)digt|löchrig|hat\s+(?:ein\s+)?loch|hat\s+(?:einen\s+)?riss|flattert|lose|aufgeschlitzt|aufgeschnitten|zerschnitten|eingeschnitten|weggeflogen|undicht|h(?:ä|ae|a)ngt${__T[7]}raus)|(?:loch|riss)\s+in\s+der${__T[7]}plane${__T[10]}geflickt${__T[23]}patched${__T[12]}отремонт\S*|заменил\S*))|(?:ladung|ware|paletten?)\s+${__T[8]}(?:nass|durchnässt|feucht)${__T[0]}|wasser\s+${__T[8]}(?:im|in\s+den)\s+(?:laderaum|auflieger|anhänger|koffer)${__T[39]}curtain|tarp(?:aulin)?|canvas|trailer\s+roof)\s+${__T[9]}(?:torn|ripped|tear|hole|flap(?:s|ping)|loose|damaged|slashed|cut|leaking|leaks)|(?:hole|tear|rip)\s+in\s+the\s+(?:curtain|tarp|trailer\s+roof)|(?:load|goods|cargo|pallets?)\s+${__T[8]}(?:wet|soaked|damp)(?![a-z])|water\s+(?:in|inside)\s+the\s+trailer|${__T[4]}тент\S*\s+${__T[9]}(?:порван|порвав|порвал|розірв|дірк|дыр|пошкод|поврежд|розрізан|розрізал|порізан|порізал|порезан|порезал|разрез|теліпа|болта|протіка|протека)|(?:вантаж|груз|товар|палет)\S*\s+${__T[8]}(?:мокр|намок|промок|вологий|сыр)|${__RX[7]}${__T[5]}(?:tarp(?:aulin)?|curtain\s*side|sliding\s+roof)s?\s+${__T[8]}${__T[18]}does\s+not|can['’]?t|cannot)${__T[7]}(?:close|shut|open|lock|tension)(?![a-z])${__RX[7]}|${__RX[7]}${__T[2]}тент\S*${__T[7]}не\s+(?:закрива\S*|зачиня\S*|відкрива\S*|открыва\S*|натягу\S*|натяги\S*)${__RX[7]}|${__RX[7]}${__T[1]}(?:planenrahmen|planengestell|planenspriegel|spriegel)\s+${__T[8]}(?:verbogen|gebrochen|abgebrochen|eingedr(?:ü|ue)ckt|abgerissen|lose)${__T[0]}${__RX[7]}|${__RX[7]}${__T[1]}(?:loch|l(?:ö|oe)cher)\s+${__T[8]}(?:dachplane|plane|planendach)${__T[0]}${__RX[7]}|${__RX[7]}${__T[1]}(?:dachplane|plane|planendach)${__T[7]}(?:hat\s+(?:ein\s+|mehrere\s+)?)?(?:loch|l(?:ö|oe)cher)${__T[0]}${__RX[7]}|${__RX[7]}${__T[5]}holes?\s+in\s+(?:the\s+)?(?:trailer(?:['’]s)?\s+roof|roof\s+of\s+the\s+trailer|tarp|curtain)(?![a-z])${__RX[7]}|${__RX[7]}${__T[2]}(?:дірк\S*|дыр\S*)${__T[7]}(?:в|у|на)\s+(?:тент\S*|дах\S*\s+(?:напів)?причеп\S*|крыш\S*\s+(?:полу)?прицеп\S*)${__RX[7]})${__RX[26]}|${__T[1]}(?:koffer(?:aufbau|dach|t(?:ü|ue)r|t(?:ü|ue)ren)?|aufbau|${__T[16]}koffer)dach|dach\s+(?:vom|des)\s+${__T[16]}koffer|aufbau)\S*)${__T[0]}\s+(?:(?:ist|sind|oben|hinten|vorne|wieder|total|komplett)\s+){0,2}(?:undicht|leckt|tropft)${__T[0]}${__RX[27]}|${__T[1]}(?:regnet|tropft|l(?:ä|ae)uft\s+wasser)\s+(?:es\s+)?(?:in\s+den|ins|in\s+die|in\s+das)\s+${__T[16]}koffer|aufbau|laderaum)\S*${__RX[27]}|${__T[1]}(?:spriegel|dachspriegel|planenseil|planenseile|zollseil|zollschnur|planenspanner|planengurt|planengurte|curtainsider)${__T[0]}\s+(?:(?:ist|sind|hinten|vorne|links|rechts|komplett|gurt|gurte)\s+){0,2}(?:gerissen|kaputt|gebrochen|abgebrochen|verbogen|abgerissen|lose)${__T[0]}(?!\s+(?:mehr\s+)?nicht)${__RX[27]}|${__T[5]}curtains?${__T[7]}${__T[18]}does\s+not|can['’]?t)\s+(?:close|shut|slide|lock|open)(?![a-z])${__RX[27]}|${__T[5]}(?:water|rain)\s+${__T[8]}(?:coming|getting|leaking|dripping|gets|comes)\s+(?:in(?:to)?|inside)\s+(?:the\s+)?(?:trailer|box|body|load\s+area)(?![a-z])${__RX[27]}|${__T[5]}(?:trailer|box\s+body|box)\s+(?:roof\s+)?(?:is\s+)?(?:leaking|leaks)(?![a-z])|${__T[5]}roof\s+(?:is\s+)?(?:leaking|leaks)\s+(?:in|on|of)\s+(?:the\s+)?(?:trailer|box)(?![a-z])${__RX[27]}`, 'i', 1);
const TARP2_HINT = lbRx(String.raw`${__T[10]}geflickt|geklebt|funktioniert\s+wieder|geht\s+wieder|wieder\s+(?:ok|in\s+ordnung|dicht|zu|fest)|nicht\s+mehr|kein(?:e|en)?\s+(?:riss|loch|l(?:ö|oe)cher)${__T[23]}patched|sorted|no\s+longer${__T[11]}заменил\S*|полагодил\S*|починил\S*|заклеїл\S*|заклеил\S*${__T[22]}(?:${__T[1]}(?<!(?:ich|wir|man)\s+)(?:seiten|dach|schiebe|heck)?plane(?:n)?${__T[0]}\s+${__T[9]}(?:hat\s+(?:(?:ein|einen|nen|n|einige|mehrere|viele|zwei|drei|gro(?:ß|ss)e[ns]?|kleine[ns]?|richtig)\s+){0,2}(?:riss|risse|l(?:ö|oe)cher|schlitz|schnitt)|(?:ist\s+)?(?:komplett\s+|ganz\s+|halb\s+)?(?:abgerissen|zerfetzt|zerrissen|schlaff)|rei(?:ß|ss|s)t(?:${__T[7]}(?:ein|auf))?|h(?:ä|ae)ngt${__T[7]}(?:durch|raus|heraus|herunter|runter)|l(?:ä|ae|a)sst\s+sich${__T[7]}${__T[13]}(?:richtig\s+)?(?:spannen|festziehen|straffen|zuziehen)|spannt\s+nicht|ist${__T[7]}${__T[13]}(?:gespannt|straff))${__T[0]}|${__T[1]}(?:(?:planen)?(?:spanner|ratschen?|spannschl(?:o|ö|oe)ss(?:er)?|schnallen?|haken|seilhaken)\s+(?:von\s+der|an\s+der|der)\s+(?:seiten|dach|schiebe)?plane|(?:seiten|dach|schiebe)?plane(?:n)?\s+(?:ratschen?|spanner|haken|schnallen?|spannschl(?:o|ö|oe)ss(?:er)?))${__T[0]}\s+${__T[8]}(?:gebrochen|abgebrochen|abgerissen|ausgerissen|kaputt|defekt|geht\s+nicht|gehen\s+nicht|klemmt|klemmen|fehlt|fehlen|lose|locker|weg)${__T[0]}|${__T[1]}wasser\s+(?:kommt|l(?:ä|ae)uft|tropft|dringt|zieht)\s+${__T[8]}(?:durch|unter)\s+(?:die|der|den)\s+(?:seiten|dach|schiebe)?plane${__T[0]}|${__T[1]}(?:es\s+)?regnet${__T[7]}(?:rein|herein|durch)${__T[7]}(?:im|in\s+(?:den|die|der|das))\s+${__T[16]}laderaum|aufbau|koffer|trailer|ladefl(?:ä|ae)che)${__T[0]}|${__T[1]}(?:hubdach|(?:schiebe)?dach\s+(?:vom|des|am|beim)\s+${__T[16]}trailer)s?)${__T[0]}\s+${__T[8]}(?:klemmt|h(?:ä|ae)ngt|geht\s+nicht|f(?:ä|ae)hrt\s+nicht|l(?:ä|ae|a)sst\s+sich${__T[7]}nicht|kaputt|defekt|blockiert)${__T[0]}|${__T[1]}(?:schiebe|hub)?dach\s+(?:geht|f(?:ä|ae)hrt|l(?:ä|ae|a)sst\s+sich)\s+${__T[13]}(?:\S+\s+)?(?:hoch|runter|auf|zu|schieben|(?:ö|oe)ffnen|schlie(?:ß|ss)en)${__T[7]}(?:beim|am|vom|im)\s+${__T[16]}trailer)${__T[0]}|${__T[1]}zoll(?:seil|schnur|leine)${__T[7]}(?:fehlt|weg|ab${__T[0]}|abgerissen|durchgeschnitten|durchtrennt|lose|locker)${__T[0]}|${__T[1]}(?:dach)?spriegel\S*${__T[7]}(?:fehlt|fehlen|weg|lose|locker|rausgefallen|herausgefallen|abgerissen)${__T[0]}|${__T[5]}(?:side\s+)?(?:curtain|tarp|tarpaulin)s?\s+${__T[8]}(?:hanging\s+(?:out|down|off)|sagging|saggy|slack|won['’]?t\s+(?:tension|tighten)|ripped\s+off|torn\s+off|has\s+(?:a\s+|some\s+)?(?:hole|tear|rip|slit)s?)(?![a-z])|${__T[5]}water\s+(?:is\s+)?(?:coming|getting|leaking|dripping)\s+(?:in\s+)?(?:through|under)\s+(?:the\s+)?(?:curtain|tarp|tarpaulin)(?![a-z])|${__T[5]}(?:holes?|tears?|rips?)\s+in\s+(?:the\s+)?(?:side\s+)?curtain(?![a-z])|${__T[5]}customs\s+(?:cord|cable|rope|wire)${__T[7]}(?:missing|broken|cut|snapped|gone)(?![a-z])|${__T[2]}тент\S*${__T[7]}(?:не\s+закрыва\S*|провис\S*|обвис\S*|звиса\S*|свиса\S*|не\s+натяг\S*)${__T[6]}|${__T[2]}(?:митн\S*|таможенн\S*)\s+(?:трос|шнур)\S*${__T[7]}(?:обірван\S*|обірвал\S*|оборван\S*|оборвал\S*|порван\S*|перерізан\S*|перерезан\S*|відсутн\S*|нема\S*|нет)${__T[6]})`, 'i', 1);



const LOAD_HINT = lbRx(String.raw`${__T[3]}(?:ladung|ware|waren|paletten?|kisten?|fracht|gitterboxen?|kartons?)\s+${__T[9]}(?:verrutscht|verschoben|umgefallen|umgekippt|gekippt|ins\s+rutschen|rutscht|eingestürzt|zusammengebrochen|heruntergefallen|runtergefallen|herausgefallen|rausgefallen|verloren|lose${__T[0]})|(?:verrutscht|verschoben|umgefallen|umgekippt|heruntergefallen|verloren)e[nmrs]?${__T[7]}(?:ladung|ware|paletten?|fracht|kisten?)|(?:(?:spann|zurr|lade|ratschen|rad|reifen)gurt|spannkette|zurrkette|radkette)\S*\s+${__T[8]}(?:gerissen|abgerissen|lose|gel(?:ö|oe|o)st|locker|kaputt|defekt)${__T[0]}${__T[39]}load|cargo|freight|goods|pallets?|boxes|crates?)\s+${__T[9]}(?:shifted|shifting|slid|sliding|fell|fallen|toppled|collapsed|tipped|came\s+loose|has\s+moved|moved\s+(?:forward|backwards?|sideways))|(?:shifted|fallen|toppled|collapsed)\s+(?:load|cargo|pallets?|goods)|lost\s+(?:part\s+of\s+)?(?:the\s+|my\s+|its\s+)?(?:load|cargo)|(?:ratchet|lashing|cargo|load)\s+straps?${__T[7]}(?:broke|broken|snapped|came\s+loose|loose)|${__T[4]}(?:вантаж(?:у|ем|і)?|груз(?:а|ом|у)?|палет\S*|паллет\S*|піддон\S*|поддон\S*|товар(?:и|ы)?)(?![а-яіїєґ])\s+(?:(?!не\s)\S+\s+){0,3}?(?:зсунув|зсунул|змісти|зміщ|посунув|сдвинул|смести|смещ|переверну|переверн|впав|впал|упал|упав|завали|розсипа|рассыпа|випав|выпал|з['’ʼ]?їха|съеха|сповз|сполз|(?:поехал|поїхав)(?=\s*(?:[.,;!?]|$)))|(?:зсунув|зсунул|змісти|сдвинул|смести)\S*${__T[7]}(?:вантаж|груз)(?![а-яіїєґ])|${__T[1]}(?:pkw|autos?|neuwagen|gebrauchtwagen|kundenfahrzeug(?:e)?|kundenwagen|geladene[nsm]?\s+(?:fahrzeug(?:e)?|wagen|pkw|autos?))${__T[0]}${__T[44]}verrutscht|verschoben|hat\s+sich${__T[7]}gel(?:ö|oe|o)st|haben\s+sich${__T[7]}gel(?:ö|oe|o)st|losgerissen|ist\s+lose|sind\s+lose|heruntergerollt|runtergerollt|weggerollt|nach\s+vorne\s+gerollt)${__T[0]}|${__T[5]}(?:cars?|vehicles?)\s+(?:on\s+(?:the\s+)?(?:upper\s+|lower\s+|top\s+)?(?:deck|trailer|ramp)\s+)${__T[8]}(?:shifted|moved|slid|came\s+loose|rolled)(?![a-z])|${__T[5]}(?:wheel|tyre|tire)\s+(?:straps?|chains?)${__T[7]}(?:broke|broken|snapped|came\s+loose|loose)(?![a-z])|${__T[4]}(?:авто|автомобіл\S*|автомобил\S*|машин[аиу])\s+(?:на\s+(?:верхньому\s+|нижньому\s+)?(?:ярус\S*|платформ\S*)\s+)?${__T[8]}(?:зсунул\S*|змістил\S*|сдвинул\S*|сместил\S*|відірвал\S*|оторвал\S*|скотил\S*)|${__T[4]}(?:лашинг\S*|ремен\S*\s+кріплен\S*|кріпильн\S*\s+ремен\S*|стяжк\S*|ланцюг\S*\s+кріплен\S*)${__T[7]}(?:порвал\S*|порвав\S*|розірвал\S*|лопнув|лопнул\S*|злама[вл]\S*)|${__T[1]}(?:verliert|verlor|verloren\s+hat)\s+${__T[8]}ladung${__T[0]}|${__T[1]}ladung\s+${__T[8]}(?:f(?:ä|ae)llt|fiel)${__T[7]}(?:runter|herunter|raus|heraus|auf\s+die\s+(?:fahrbahn|stra(?:ß|ss)e))${__T[39]}losing|lost|dropped|shed)\s+(?:part\s+of\s+)?(?:the\s+|its\s+|some\s+)?(?:load|cargo)(?![a-z])|${__T[3]}(?:ladung|ware|paletten?|fracht|kisten?|gitterboxen?)\s+${__T[9]}(?:durch\s+(?:die\s+)?(?:stirnwand|vorderwand|bordwand|seitenwand|r(?:ü|ue)ckwand|plane)|(?:hat|haben)\s+(?:die\s+)?(?:stirnwand|vorderwand|bordwand|seitenwand|plane)${__T[7]}(?:durchbrochen|durchschlagen|durchgedr(?:ü|ue)ckt|eingedr(?:ü|ue)ckt|rausgedr(?:ü|ue)ckt|herausgedr(?:ü|ue)ckt|aufgerissen))${__T[0]}${__RX[28]}${__T[39]}load|cargo|freight|goods|pallets?|crates?)\s+${__T[8]}(?:went|came|pushed|broke|smashed|punched|burst)\s+through\s+(?:the\s+)?(?:headboard|bulkhead|front\s+wall|side\s?wall|curtain|tarp|roof)(?![a-z])${__RX[28]}|${__T[2]}(?:вантаж|груз|палет|паллет|піддон|поддон)\S*\s+${__T[8]}(?:пробил|пробив|продавил|продавив|выдавил|видавив|прорвал|прорвав)\S*${__T[7]}(?:борт|стенк|стінк|стен|стін|тент|передн)\S*${__RX[28]}`, 'i');




const LASHGEAR_HINT = lbRx(String.raw`${__T[2]}(?:(?:такелажн|крепежн|кріпильн)\S*\s+(?:рейк|шин)\S*|(?:рейк|шин)\S*\s+(?:для\s+)?(?:креплени|кріпленн)\S*)${__T[7]}(?:оторва\S*|відірва\S*|вырва\S*|вирва\S*${__T[17]}злама\S*|погну\S*|разболта\S*|розхита\S*|болта\S*|тріснул\S*|треснул\S*)${__T[10]}${__T[42]})|fixed|repaired|replaced${__T[11]}заменил\S*|усунул\S*|устранил\S*|прикрутил\S*|закрепил\S*|прикрутив\S*|закріпив\S*))|${__T[2]}(?:стяжн\S*|такелажн\S*|кріпильн\S*|крепежн\S*)\s+(?:ремін\S*|ремен\S*|стрічк\S*|лент\S*)${__T[7]}(?:порва\S*|розірва\S*|лопну\S*${__T[28]}пошкодж\S*|поврежд\S*|зношен\S*|изношен\S*)${__RX[0]}|${__T[3]}(?:(?:zurr|spann|ratschen|lade|ladungs)gurt(?:e|en|s)?|gurte|rungen?|steckrungen?|einstecklatten|kantensch(?:ü|ue|u)tz(?:e|er)?|kantenschoner|ecksch(?:ü|ue|u)tz(?:e|er)?|antirutschmatten?|rutschhemmende\s+matten|ladungssicherungsmittel|sicherungsmittel|ladungssicherung|sperrbalken|sperrstangen?|klemmbretter|klemmbalken|ladungssicherungsnetze?|zurrketten?|(?:spann|zurr)?ratschen?|zurrpunkte?|zurr(?:ö|oe)sen?)${__T[0]}\s+(?:(?:sind|ist|wurden|wurde|nicht|nur|noch|keine|kein|mehr|im|am|auf|dem|der|den|lkw|auflieger|fahrzeug|alle|zwei|drei|einige|mehrere|komplett|total|stark|teilweise|schon|wieder|seit|heute|gestern|an\s+bord)[,;]?\s+){0,3}(?:fehl(?:t|en)|zu\s+wenig(?:e)?|${__T[13]}(?:da|vorhanden|an\s+bord|genug|ausreichend)|weg${__T[0]}|verschwunden|kaputt|defekt|besch(?:ä|ae|a)digt|gerissen|eingerissen|angerissen|eingeschnitten|ausgefranst|durchgescheuert|verschlissen|abgenutzt|verbogen|klemm(?:t|en)|ausgerissen|abgerissen|gebrochen|ohne\s+etikett|etikett\s+fehlt)${__T[0]}(?!${__T[7]}(?:wieder\s+da|ersetzt|nachbestellt|nachgef(?:ü|ue)llt|aufgef(?:ü|ue)llt|erledigt|ok${__T[0]}|in\s+ordnung|gefunden))|${__T[3]}(?:keine|kein|zu\s+wenig(?:e)?|fehlende|besch(?:ä|ae|a)digte|kaputte|eingerissene)${__T[7]}(?:(?:zurr|spann|ratschen|lade|ladungs)gurt(?:e|en|s)?|gurte|rungen?|steckrungen?|einstecklatten|kantensch(?:ü|ue|u)tz(?:e|er)?|kantenschoner|ecksch(?:ü|ue|u)tz(?:e|er)?|antirutschmatten?|rutschhemmende\s+matten|ladungssicherungsmittel|sicherungsmittel|ladungssicherung|sperrbalken|sperrstangen?|klemmbretter|klemmbalken|ladungssicherungsnetze?|zurrketten?|(?:spann|zurr)?ratschen?|zurrpunkte?|zurr(?:ö|oe)sen?)${__T[0]}(?!${__T[7]}(?:n(?:ö|oe)tig|erforderlich|vorgeschrieben))${__T[39]}lashing\s+straps?|ratchet\s+straps?|(?<!(?:tarp|tarpaulin|curtain)\s)straps|edge\s+protectors?|corner\s+protectors?|anti[\s-]?slip\s+mats?|load\s+bars?|lashing\s+(?:chains?|equipment|rails?|points?|eyes?|rings?)|airline\s+rails?|load\s+securing\s+equipment)\s+(?:(?:are|is|on|the|board|not|all|some|two|three|several|completely|badly)\s+){0,3}(?:missing|gone|damaged|torn|frayed|cut|broken|snapped|broke|ripped|worn|not\s+enough|insufficient)${__T[41]}|swapped|sorted|tightened|re-?attached))${__T[39]}no|not\s+enough|missing|damaged|torn|frayed|broken)${__T[7]}(?:lashing\s+straps?|ratchet\s+straps?|straps|edge\s+protectors?|anti[\s-]?slip\s+mats?|load\s+bars?)(?![a-z])|${__T[2]}(?:(?:ремен|ремін)\S*\s+(?:кріплен|креплен)\S*|стяжн\S*\s+(?:ремен|ремін)\S*|стяжк\S*|лашинг\S*|кутник\S*|уголк\S*|антиковзк\S*|антискольз\S*|розпірн\S*|распорн\S*|засоб\S*\s+кріплен\S*|средств\S*\s+креплен\S*)\s+${__T[8]}${__T[36]}${__T[6]}|бракує|не\s+вистачає|не\s+хватает${__T[37]}\S*|порван\S*|порвал\S*|порвав\S*|розірван\S*|розірвал\S*|розірвав\S*|лопнул\S*|лопнув|зношен\S*|пошкоджен\S*|поврежден\S*|злама[внл]\S*|сломан\S*)|${__T[2]}${__T[36]}|бракує|не\s+вистачає|не\s+хватает)${__T[7]}(?:(?:ремен|ремн)(?!\S*\s+(?:безпек|безопасн))\S*|стяжок|стяжк\S*|кутник\S*|уголк\S*|антиковзк\S*|антискольз\S*|розпірн\S*|распорн\S*)|${__T[1]}(?:zurr|airline|ladungssicherungs)schiene(?:n)?${__T[0]}\s+(?:(?:ist|sind|hinten|vorne|links|rechts|an\s+der\s+seite|aus\s+der\s+(?:seiten)?wand|aus\s+der\s+seite)\s+){0,2}(?:lose|locker|abgerissen|ausgerissen|herausgerissen|rausgerissen|gerissen|gebrochen|verbogen|kaputt|defekt)${__T[0]}${__RX[27]}|${__T[2]}(?:порвал\S*|порвав\S*|розірвал\S*|розірвав\S*|лопнул\S*|лопнув)${__T[7]}(?:(?:ремен|ремін)\S*\s+(?:кріплен|креплен)\S*|стяжн\S*\s+(?:ремен|ремін)\S*|стяжк\S*|лашинг\S*)|(?<![a-z])(?<!seat\s)(?<!seat-)(?<!belt\s)(?<!watch\s)(?<!bag\s)(?<!shoulder\s)(?<!tarp\s)(?<!curtain\s)(?:tie[\s-]?down\s+)?straps?\s+(?:(?:has|have|is|are|just|completely)\s+)?(?:snapped|broke|ripped|torn)${__T[41]}|swapped|sorted|re-?attached))|(?:${__T[2]}(?:порва|обірва|оборва|розірва|лопну)\S*\s+(?:ремін\S*|ремен\S*|стрічк\S*|лент\S*)\s+(?:кріплен\S*|креплен\S*|на\s+вантаж\S*|на\s+груз\S*|вантаж\S*|груз\S*)|${__T[2]}(?:ремін\S*|ремен\S*)\s+(?:кріплен\S*\s+(?:вантаж\S*\s+)?|креплен\S*\s+(?:груз\S*\s+)?|на\s+вантаж\S*\s+|на\s+груз\S*\s+)(?:порва|обірва|оборва|розірва|лопну)\S*)${__RX[11]}|${__T[2]}(?:ремен|ремін)\S*\s+(?:стяжн|такелажн|кріпильн|крепежн)\S*${__T[7]}(?:порва\S*|розірва\S*|разорва\S*|лопну\S*${__T[28]}пошкодж\S*|поврежд\S*|зношен\S*|изношен\S*)${__T[10]}fixed|repaired|replaced${__T[12]}замінив\S*|замінен\S*${__T[29]}заменен\S*|полагодил\S*|починил\S*))`, 'i', 1);



const LOAD2_HINT = lbRx(String.raw`${__T[2]}(?:груз(?:а|ом|у|ы)?|вантаж(?:у|ем|і)?|палет\S*|паллет\S*|поддон\S*|піддон\S*|товар(?:и|ы)?|коробки(?!\s+передач)|ящики)${__T[6]}\s+(?:(?!не\s)\S+\s+){0,2}?(?:попада\S*|повалил\S*|повалив\S*|шата\S*|хита\S*|болта\S*|бовта\S*|давит|давят|тисне|тиснуть|напира\S*|упали|впали|вывалил\S*|вивалил\S*|(?:поехал|поїхав)\S*\s+(?:на\s+поворот|при\s+торможени|при\s+гальмуванн|вперед|назад|вбок|убік))${__RX[29]}|${__T[2]}(?:груз(?:а|ом|у|ы)?|вантаж(?:у|ем|і)?)${__T[7]}(?:не|плохо|погано|слабо|криво)\s+(?:закреп|закріп|зафиксир|зафіксов)\S*|${__T[2]}(?:незакреп|незакріп)\S*\s+(?:груз|вантаж)|${__T[2]}(?:потерял|загубив|загубил|втратив|втратил)\S*\s+(?:(?!на\s|для\s)\S+\s+){0,2}?(?:груз(?:а|у|ы)?|вантаж(?:у|і)?)${__T[6]}|${__T[1]}ladung${__T[7]}(?:nicht|schlecht|unzureichend|falsch)\s+gesichert|${__T[1]}(?:ungesichert|unzureichend\s+gesichert)e\s+ladung`, 'i', 1);


const LASHGEAR2_HINT = lbRx(String.raw`${__T[2]}(?:трещотк|тріскачк|храповик)\S*\s+(?:(?!не\s)\S+\s+)?(?:сломал\S*|сломан\S*|злама\S*|не\s+держ\S*|не\s+трима\S*|не\s+работа\S*|не\s+працю\S*|заклин\S*|заел\S*|заїл\S*|треснул\S*|тріснул\S*|лопнул\S*|лопнув|отлетел\S*|відлетіл\S*)${__RX[29]}|${__T[2]}(?:сломал\S*|зламал\S*|порвал\S*|порвав\S*|лопнул\S*|лопнув|розірвал\S*|разорвал\S*)${__T[7]}(?:(?:трещотк|тріскачк|храповик)|(?:стяжн|грузов|крепежн|такелажн|кріпильн)\S*\s+рем|ремен\S*\s+(?:креплен|на\s+груз)|ремін\S*\s+(?:кріплен|на\s+вантаж))${__RX[29]}`, 'i', 1);





const STICKER_HINT = lbRx(String.raw`${__T[3]}(?:(?:umwelt|feinstaub|hu|t(?:ü|ue|u)v|pr(?:ü|ue)f)-?\s?)?plakette(?:n)?${__T[0]}\s+(?:(?:ist|sind|wurde|wurden|am|an|auf|in|der|die|das|dem|den|hinten|vorne|kennzeichen|nummernschild|scheibe|windschutzscheibe|frontscheibe|lkw|zugmaschine|anh(?:ä|ae)nger|auflieger|komplett|ganz|teilweise|halb|fast|stark|schon|seit|heute|gestern|nach|waschanlage|scheibentausch|einfach|leider|nicht|mehr|wieder)[,;]?\s+){0,4}(?:fehl(?:t|en)|weg${__T[0]}|abgefallen|abgel(?:ö|oe)st|l(?:ö|oe)s(?:t|en)\s+sich|lose${__T[0]}|abgerissen|abgekratzt|abgerubbelt|unleserlich|(?:nicht|kaum)\s+(?:mehr\s+)?(?:lesbar|leserlich|erkennbar|zu\s+lesen|zu\s+erkennen|vorhanden|da${__T[0]})|verblasst|ausgeblichen|besch(?:ä|ae|a)digt|kaputt|zerkratzt|zerrissen|eingerissen|gestohlen|geklaut|entwendet)${__T[0]}(?![,;.]?${__T[7]}(?:wieder\s+(?:da|dran|drauf|angebracht)|ersetzt|erneuert|neu${__T[0]}|geklebt|angebracht|erledigt|ok${__T[0]}|in\s+ordnung|bestellt|beantragt))|${__T[3]}(?:fehlende[nmrs]?|abgefallene[nmrs]?|unleserliche[nmrs]?|besch(?:ä|ae|a)digte[nmrs]?|kaputte[nmrs]?|verblasste[nmrs]?|keine|kein|ohne)${__T[7]}(?:(?:umwelt|feinstaub|hu|t(?:ü|ue|u)v|pr(?:ü|ue)f)-?\s?)?plakette(?:n)?${__T[0]}(?!${__T[7]}(?:n(?:ö|oe)tig|erforderlich|vorgeschrieben|bestellt|beantragt|ersetzt|erneuert|angebracht|geklebt))${__T[39]}(?:emissions?|environmental|low[- ]emission(?:\s+zone)?|clean[- ]air(?:\s+zone)?|green|inspection|mot|roadworthiness|t(?:ü|u)v|hu)\s+(?:stickers?|badges?|vignettes?|discs?))\s+(?:(?:is|are|on|the|windscreen|windshield|plate|number|rear|front|has|have|completely|partly|now|already|just)\s+){0,3}(?:missing|gone|fell\s+off|fallen\s+off|came\s+off|come\s+off|peeling(?:\s+off)?|torn(?:\s+off)?|scratched\s+off|damaged|unreadable|illegible|faded|stolen|not\s+(?:readable|legible|visible|there))(?![a-z])(?!${__T[7]}(?:replaced|renewed|ordered|fixed|ok(?![a-z])))${__T[39]}missing|no|damaged|illegible|unreadable|faded|torn|stolen)\s+(?:(?:emissions?|environmental|low[- ]emission(?:\s+zone)?|clean[- ]air(?:\s+zone)?|green|inspection|mot|roadworthiness|t(?:ü|u)v|hu)\s+(?:stickers?|badges?|vignettes?|discs?))(?![a-z])(?!${__T[7]}(?:needed|required|ordered))|${__T[2]}(?:плакетк\S*|(?:екологічн|экологическ|зелен)\S*\s+(?:наклейк|стикер|значок|плакетк)\S*|наклейк\S*\s+(?:про\s+|о\s+)?(?:техогляд|техосмотр|то${__T[6]}|hu|t(?:ü|u)v)\S*)\s+${__T[9]}(?:немає|нема${__T[6]}|нет${__T[6]}|відсутн|отсутств|відклеї|відклеє|отклеи|отклее|відпа|отпа|відірва|оторва|пошкоджен|поврежден|не\s+читає|не\s+читае|нечитаб|нечитаем|не\s+видно|вицві|выцве|вкра|укра)|${__T[2]}${__T[36]}|без|бракує${__T[37]}\S*|пошкоджен\S*|поврежден\S*)${__T[7]}(?:плакетк|(?:екологічн|экологическ|зелен)\S*\s+(?:наклейк|стикер|значок|плакетк)|наклейк\S*\s+(?:про\s+|о\s+)?(?:техогляд|техосмотр|то${__T[6]}))\S*`, 'i');
const STICKER_SPANS = new RegExp(STICKER_HINT.source, 'gi');
const noSticker = (s) => String(s || '').replace(STICKER_SPANS, ' ');

const CABKIT_HINT = lbRx(String.raw`${__T[2]}(?:козир|козыр)\S*${__T[7]}(?:зламав\S*|злама[внл]\S*|відірва\S*${__T[17]}оторва\S*|відвали\S*|отвали\S*)${__RX[0]}|${__T[1]}(?:k(?:ü|ue)hlschrank|wechselrichter|spannungswandler|k(?:ü|ue)hlbox|(?:schlaf|ober|unter)?liege${__T[0]}|koje|bett${__T[0]}|matratze|lattenrost|liegen-?(?:halte)?netz|halte-?netz|sonnenblende(?:n)?|sonnenschutz(?:rollo)?|rollo(?:s)?|vorh(?:a|ä|ae)ng(?:e)?|gardine(?:n)?|verdunkelung|(?<!(?:anh(?:ä|ae)nger|auflieger|ebs|abs|pol(?:ige)?|polig)[- ]?)steckdose${__T[0]}(?!\s+(?:\S+\s+){0,2}(?:anh(?:ä|ae)nger|auflieger|trailer|ebs|abs))|zigarettenanz(?:ü|ue)nder|usb(?:-?(?:anschluss|buchse|port|steckdose))?|ladebuchse|(?:innen|lese|kabinen|fahrerhaus)(?:beleuchtung|licht|leuchte|lampe)|leselampe|ablage(?:fach|f(?:ä|ae)cher|klappe)?|staufach|staukasten|stauklappe|handschuhfach|becherhalter|handyhalter(?:ung)?|telefonhalter(?:ung)?|getr(?:ä|ae)nkehalter|radio|funkger(?:ä|ae)t(?:e)?|cb-?funk(?:ger(?:ä|ae)t)?|sitzheizung)${__T[0]}\s+(?:(?:\d{1,2}(?:-?v(?:olt)?)?|v(?:olt)?|ist|sind|im|in|lkw|truck|der|die|das|dem|den|fahrerhaus|kabine|oben|unten|obere|untere|fahrerseite|beifahrerseite|links|rechts|seit|heute|gestern|schon|wieder|komplett|ganz|mehr|leider|auch|total|nur|noch|seit|tagen|wochen)[,;]?\s+){0,4}(?:defekt|kaputt|abgerissen|ausgerissen|runtergerissen${__T[27]}ohne\s+(?:funktion|strom)|k(?:ü|ue)hlt\s+nicht|abgebrochen|gebrochen|gerissen|eingerissen|zerrissen|lose${__T[0]}|locker${__T[0]}|h(?:ä|ae)lt\s+nicht|klemmt|l(?:ä|ae|a)ss(?:t|en)\s+sich\s+nicht|rastet\s+nicht|fehl(?:t|en)|wackelt|h(?:ä|ae)ngt\s+(?:herunter|runter|schief)|durchgelegen|f(?:ä|ae)llt\s+(?:runter|herunter|ab)|abgefallen)${__T[0]}(?![,;.]?${__T[7]}(?:repariert|ersetzt|getauscht|erneuert|erledigt|wieder\s+(?:ok|in\s+ordnung|ganz|fest)|ok${__T[0]}))${__T[39]}(?:cab\s+)?fridge|bunk(?:\s+bed)?|sleeper\s+bunk|mattress|sun\s*visor|(?:cab|bunk|window|sleeper)\s+curtains?|(?:cab|interior|reading)\s+lights?|(?:power|12v|24v)\s+(?:socket|outlet)|cab\s+socket|usb\s+(?:port|socket|charger)|cigarette\s+lighter|storage\s+(?:compartment|locker|box)|glove\s*box|cup\s+holder|radio|cb\s+radio|two-way\s+radio|seat\s+heat(?:ing|er)|heated\s+seat|bunk\s+(?:net|restraint))\s+(?:(?:is|are|in|the|cab|upper|lower|top|bottom|has|have|now|still|completely|keeps|on|passenger|driver|side)\s+){0,3}(?:broken|not\s+working|doesn['’]?t\s+work|does\s+not\s+work|won['’]?t\s+(?:close|lock|latch|stay|work|cool)|not\s+cooling|missing|torn|ripped|loose|stuck|faulty|damaged|no\s+power|dead|fell\s+off|falling\s+(?:down|off)|hanging\s+(?:down|off))(?![a-z])(?!${__T[7]}(?:fixed|repaired|replaced|ok(?![a-z])))|${__T[2]}(?:холодильник\S*\s+(?:в|у)\s+кабін\S*|холодильник\S*\s+в\s+кабин\S*|спальн\S*\s+(?:місц|мест|полиц|поличк)\S*|спальник\S*|ліжк\S*|кроват\S*|матрац\S*|матрас\S*|(?:сонцезахисн|солнцезащитн)\S*\s+козир\S*|козирок\S*|козырек\S*|шторк\S*|штор[аиуы]?${__T[6]}|розетк\S*\s+(?:в|у)\s+кабін\S*|розетк\S*\s+(?:на\s+)?(?:12|24)\s?(?:в|v|вольт\S*)(?![а-яіїєґёa-z])(?!${__T[7]}(?:причеп|напівпричеп|прицеп|полуприцеп|ebs|abs))|розетк\S*\s+в\s+кабин\S*|прикурювач\S*|прикуриват\S*|usb\S*|освітлен\S*\s+(?:салону|кабіни)|освещени\S*\s+(?:салона|кабины)|підсвітк\S*\s+кабіни|подсветк\S*\s+кабины|бардачок\S*|бардачк\S*|рундук\S*|радіо|радио|магнітол\S*|магнитол\S*|раці[яїю]|раци[яию]|підігрів\S*\s+сидін\S*|подогрев\S*\s+сиден\S*)\s+${__T[9]}(?:не\s+працю|не\s+работа|не\s+холод|зламан|сломан|поламан|відірван|оторван|порван|розірван|не\s+закрива|не\s+закрыва|не\s+фіксу|не\s+фиксир|бракує|немає|нет${__T[6]}|відпа|отпа|теліпа|болта|без\s+(?:живлення|питания)|не\s+заряджа|не\s+заряжа)|${__RX[7]}${__T[2]}(?:ліжко|ліжка|кровать|кровати|спальне\s+місце|спальное\s+место)\s+(?:в\s+(?:кабіні|кабине)\s+)?(?:\S+\s+)?(?:злама\S*|слома\S*|трісну\S*|тресну\S*|провали\S*|відірва\S*|оторва\S*)${__RX[7]}|${__RX[7]}${__T[5]}(?:cab\s+)?fridge(?:\s+in\s+the\s+(?:cab|truck|sleeper))?\s+(?:(?:keeps|keep|always|constantly|randomly|sometimes|now|still|just|on\s+its\s+own)\s+){0,2}(?:cuts?\s+out|cutting\s+out|switch(?:es|ing)?\s+off|shuts?\s+(?:off|down)|shutting\s+(?:off|down)|turns?\s+off|turning\s+off)(?![a-z])${__RX[7]}|${__RX[7]}${__T[1]}k(?:ü|ue)hlschrank${__T[0]}\s+(?:(?:im|in\s+der)\s+(?:fahrerhaus|kabine|lkw)\s+)?(?:geht|schaltet\s+sich|f(?:ä|ae)llt)\s+(?:(?:st(?:ä|ae)ndig|immer(?:\s+wieder)?|dauernd|oft|einfach|von\s+selbst|zwischendurch|nachts|manchmal|pl(?:ö|oe)tzlich|selbst(?:st(?:ä|ae)ndig)?|w(?:ä|ae)hrend\s+der\s+fahrt|jetzt|seit\s+\S+)\s+){0,3}(?:aus|ab)${__T[0]}${__RX[7]}|${__RX[7]}${__T[2]}холодильник\S*\s+(?:в|у)\s+(?:кабін|кабин)\S*\s+(?:(?:постійно|постоянно|весь\s+час|все\s+время|сам|сама|сам\s+по\s+собі|сам\s+по\s+себе|часто|періодично|периодически|іноді|иногда|раз\s+у\s+раз|то\s+и\s+дело)\s+){0,2}(?:вимика\S*|вимкну\S*|відключа\S*|відключи\S*|отключа\S*|отключи\S*|выключа\S*|выключи\S*)${__RX[7]}`, 'i');
const CABKIT_SPANS = new RegExp(CABKIT_HINT.source, 'gi');
const noCabkit = (s) => String(s || '').replace(CABKIT_SPANS, ' ');


const CABHYD = /(?:hydraulik|гидравлик|гідравлік|насос)\S*\s+(?:\S+\s+)?(?:кабин|кабін|kabine|fahrerhaus)\S*|(?:kipp\S*|cab\s+tilt)\s+(?:\S+\s+)?(?:fahrerhaus|kabine|hydraulic)\S*/gi;
const noCabHyd = (s) => s.replace(CABHYD, ' ◇ ');

const AUX_UNIT = lbRx(String.raw`${__T[1]}(?:(?:k(?:ü|ue)hl)?aggregat(?:s|es)?|k(?:ü|ue)hlger(?:ä|ae)t(?:s|es)?|k(?:ü|ue)hlmaschine|thermo\s?king|carrier|standheizung|stromaggregat|generator)${__T[0]}\s+(?:[^\s.;!?,]+\s+){0,2}?(?:motor|dieselmotor|diesel|batterie|akku|tank|kraftstoff)(?:s|es|n|en)?${__T[0]}|${__T[1]}(?:motor|dieselmotor|batterie|akku|tank)(?:s|es|n)?\s+(?:vom|von\s+der|von\s+dem|des|der|am|im|f(?:ü|ue)r\s+(?:das|die|den))\s+(?:k(?:ü|ue)hl)?(?:aggregat(?:s|es)?|ger(?:ä|ae)t(?:s|es)?|maschine)|${__T[1]}(?:k(?:ü|ue)hl)?aggregat(?:e)?tank(?:s)?${__T[0]}|${__T[1]}(?:(?:funk)?schl(?:ü|ue)ssel|fernbedienung|taschenlampe|funkger(?:ä|ae)t|handy|tablet|(?:hand)?scanner)(?:s)?\s+(?:(?:hat|ist|die|der|vom|von|im)\s+)?(?:batterie|akku)(?:n)?${__T[0]}|${__T[1]}(?:batterie|akku)(?:n)?\s+(?:vom|von\s+der|von\s+dem|im|in\s+der|der|des)\s+(?:(?:funk)?schl(?:ü|ue)ssel|fernbedienung|taschenlampe|funkger(?:ä|ae)t|handy|tablet|(?:hand)?scanner)(?:s)?${__T[0]}|${__T[1]}(?:tail\s*-?lift|liftgate|ladebordwand|lbw)${__T[7]}(?:batter(?:y|ies|ie)|akku)|(?:batter(?:y|ies|ie)|akku)n?\s+(?:of|on|for|der|an\s+der|von\s+der)\s+(?:the\s+)?(?:tail\s*-?lift|liftgate|ladebordwand|lbw)`, 'gi');

const EQUIP_SPAN = lbRx(String.raw`${__T[1]}(?:(?:mitnahme|gabel|elektro)?stapler|(?:elektro|hand)?hubwagen|ameise|sackkarre|rollwagen|rollcontainer)(?:s|n)?${__T[0]}[^.;!?,\n]*`, 'gi');

const REEF_RU = lbRx(String.raw`(?<![a-zа-яіїєґё])(?:реф(?:а|е|у|ом|і|ка|ки|ке|ку|кой)?|рефрижератор\S*|термо\s?к[иі]нг\S*|к[эе]р[иі][еє]р\S*|холодильн\S*\s+(?:установк|агрегат)\S*|reefer\S*|thermo\s?king|(?:fridge|refrigeration|cooling|carrier)\s+unit)${__T[6]}`, 'gi');
const REEF_PART = lbRx(String.raw`${__T[2]}(?:двигател\S*|двигун\S*|мотор\S*|акк?умулятор\S*|акб|бак[аеу]?|топлив\S*|палив\S*|дизел\S*|заводит\S*|заводить\S*|запуска\S*|рем[еі]н\S*|в\s+аварии|в\s+аварії|аварийн\S*\s+режим\S*|аварійн\S*\s+режим\S*|(?:batter(?:y|ies)|fuel|tank|belt|engine|display|diesel)(?![a-z]))${__T[6]}`, 'gi');
const REEF_STOP = /тягач|машин|авто|кабин|кабін|truck|lorry|tractor|\bcab\b/i;
const noReefRu = (s) => String(s || '').replace(/[^.;!?,\n]+/g, (c) => { const u = [...c.matchAll(REEF_RU)]; if (!u.length) return c; return c.replace(REEF_PART, (m, o) => (u.some((x) => { const e = x.index + x[0].length; const g = o >= e ? c.slice(e, o) : c.slice(o + m.length, x.index); return !REEF_STOP.test(g) && (o >= e ? g.length <= 25 : g.length <= 15 && /(?:[аеуі]|к[еиу])$/i.test(x[0]) && !/установка$/i.test(x[0])); }) ? ' ◇ ' : m)); });
const noAux = (s) => noReefRu(s).replace(EQUIP_SPAN, ' ◇ ').replace(AUX_UNIT, (m) => m.replace(/(?:dieselmotor|motor|diesel|batter(?:ies|ie|y)|akku|tank|kraftstoff)/gi, '◇'));





const FIX_WORD = lbRx(String.raw`${__T[3]}(?:repariert|erneuert|(?:aus)?getauscht|ersetzt|behoben|(?:aus)?gewechselt|instandgesetzt|eingestellt|befestigt|gereinigt|freigeschaltet|geflickt${__T[23]}patched)${__T[0]}|(?<=${__T[3]}(?:funktioniert|geht|läuft|laeuft|k(?:ü|ue)hlt|heizt|startet|schlie(?:ß|ss)t|(?:ö|oe)ffnet|l(?:ä|ae)dt|reagiert)\s+)(?:schon\s+|immer\s+)?wieder\s+(?=nicht${__T[0]})|${__T[2]}(?:відремонт|отремонт|замінил|замінен|заменил|заменен|усунул|усунен|устранил|устранен|поміня|поменя|полагод|почини)[а-яіїєґё']*`, 'gi');



const FIX_SYN = lbRx(String.raw`${__T[2]}(?:исправ(?:ил|ила|или|ило|лено|лен|лена|лены)|почин(?:ил|ила|или|ило|ено|ен|ена|ены|ив)|виправ(?:ив|ила|или|ило|лено|лений|лена|лені)|полагод(?:ив|ила|или|ило|жено|жений|жена|жені))${__T[6]}`, 'gi');
const RECUR_MARK = lbRx(String.raw`${__T[3]}(?:obwohl|trotz|trotzdem|dennoch|erneut|nochmal|noch\s+mal|schon\s+wieder|immer\s+noch|weiterhin|wieder\s+(?:kaputt|defekt|undicht|da|los|lose|locker|aufgetreten|nicht|das\s+gleiche|dasselbe|gleich)|nach\s+(?:der\s+|dem\s+|einer\s+)?(?:reparatur|tausch|wechsel)\S*\s+${__T[9]}wieder(?!\s+(?:ok|okay|in\s+ordnung|gut|funktionsf\S*|fahrbereit|dicht|heil|fest|frei))|although|though|despite|still(?!\s+(?:fine|ok|okay|good|works?|working))|(?<!(?<!(?:not|n['’]t)\s+)(?:works?|working|fine|ok|okay|good|running|normal)\s+)again)${__T[0]}|${__T[2]}(?:хоча|хоч|попри|досі|хотя|несмотря|вс[её]\s+ещ[её]|все\s+ещ[её]|все\s+еще|(?<!(?:працює|работает)\s+)(?:знову|знов|опять|снова)(?!\s+(?:працює|работает)))${__T[6]}`, 'i');
const FIX_NEG = lbRx(String.raw`(?:${__T[3]}(?:nicht|nie|kein\S*|not|never)|n['’]t|${__T[2]}(?:не|ни))\s+(?:[a-zäöüßа-яіїєґё'’]+\s+){0,2}$`, 'i');


const FIX_PLAN = lbRx(String.raw`(?:${__T[3]}(?:muss|m(?:ü|ue)ssen|soll(?:te|en)?|wird|bitte)${__T[39]}be|needs?|must|should|will))\s+(?:[a-zäöüß]+\s+){0,2}$`, 'i');
const FIX_PLAN_AFTER = /^\s+(?:werden|lassen)(?![a-zäöüß])/i;

const STOP_WORK = lbRx(String.raw`(?<![a-z])(?:stopp(?:ed|s)|quit(?:s|ted)?|ceased?)\s+(?:working|functioning)(?![a-z])`, 'gi');



const PRED_FIRST = lbRx(String.raw`${__T[2]}(не\s+(?:працю[а-яіїєґ]*|работа[а-яё]*|функціону[а-яіїєґ]*|функциониру[а-яё]*|трима[а-яіїєґ]*|держ[а-яё]*|відкрива[а-яіїєґ]*|закрива[а-яіїєґ]*|открыва[а-яё]*|закрыва[а-яё]*|підніма[а-яіїєґ]*|підійма[а-яіїєґ]*|поднима[а-яё]*|опуска[а-яіїєґё]*|відкида[а-яіїєґ]*|откидыва[а-яё]*|бризка[а-яіїєґ]*|брызга[а-яё]*|запуска[а-яіїєґё]*|гріють?|гріє|греє|греют?|греет|охолоджу[а-яіїєґ]*|охлажда[а-яё]*|спрацьову[а-яіїєґ]*|срабатыва[а-яё]*|заряджа[а-яіїєґ]*|заряжа[а-яё]*|вимика[а-яіїєґ]*|выключа[а-яё]*|дує|дме|дует|регулю[а-яіїєґ]*|регулиру[а-яё]*|застіба[а-яіїєґ]*|застеги[а-яё]*|пристіба[а-яіїєґ]*|пристеги[а-яё]*|зупиня[а-яіїєґ]*|останавлива[а-яё]*))((?:\s+[^\s.,;!?:()]+){1,4}?)(?=\s*(?:$|[.,;!?:()\n])|\s+(?:і|й|та|и|а|але|но|бо|тому|потому|після|после|з|із|зі|с|со|вже|уже|ще|еще|ещ[её]|в|у|на|при|під|под|від|от|до|коли|когда|хоча|хотя|знову|снова|опять)${__T[6]})`, 'gi');


const NO_FUNC = lbRx(String.raw`${__T[3]}(?:(?:ohne|keine)\s+funktion|funktionslos|(?:ohne|kein)\s+bild|tut\s+(?:es\s+|er\s+|sie\s+)?nicht(?:\s+mehr)?(?!\s+weh))${__T[0]}${__T[39]}inoperative|out\s+of\s+order|no\s+function|not\s+functioning|does\s+nothing|u\/s)(?![a-z])|${__T[2]}не\s+(?:функціону[а-яіїєґ]*|функциониру[а-яё]*)`, 'gi');


const INTERMIT = [
  [lbRx(String.raw`${__T[3]}(geht|funktioniert|l(?:ä|ae)uft|k(?:ü|ue)hlt|heizt|startet|schlie(?:ß|ss)t|(?:ö|oe)ffnet|reagiert|l(?:ä|ae)dt)\s+(?:manchmal|ab\s+und\s+(?:zu|an)|zeitweise|zeitweilig|sporadisch|gelegentlich|teilweise|hin\s+und\s+wieder|(?:immer\s+)?öfter|oft|h(?:ä|ae)ufig|mal)\s+nicht${__T[0]}`, 'gi'), '$1 nicht'],
  [lbRx(String.raw`${__T[3]}f(ä|ae)llt\s+(?:manchmal|ab\s+und\s+(?:zu|an)|zeitweise|zeitweilig|sporadisch|gelegentlich|hin\s+und\s+wieder|(?:immer\s+)?öfter|oft|h(?:ä|ae)ufig|immer\s+wieder|st(?:ä|ae)ndig|dauernd|(?:schon\s+)?wieder|jetzt|komplett|ganz|total|einfach|auch)\s+aus${__T[0]}`, 'gi'), 'f$1llt aus'],
  [lbRx(String.raw`${__T[3]}(?:funktioniert|geht|l(?:ä|ae)uft|arbeitet)\s+nur\s+(?:noch\s+)?(?:manchmal|zeitweise|zeitweilig|sporadisch|gelegentlich|teilweise|ab\s+und\s+zu|sehr\s+selten|selten)${__T[0]}|${__T[3]}spinnt${__T[0]}`, 'gi'), 'funktioniert nicht'],
  [lbRx(String.raw`(?<![a-z])(?:(?:works?|working|is|are)\s+(?:only\s+)?intermittent(?:ly)?|intermittent(?:ly)?(?=\s*(?:$|[.,;!?]))|playing\s+up|acting\s+up|glitch(?:y|ing))(?![a-z])`, 'gi'), 'not working'],
  [lbRx(String.raw`${__T[2]}(?:глюч(?:ить|ать|ит|ат)|глюка[а-яіїєґ]*|барахл(?:ить|ять|ит|ят)|працю(?:є|ють)\s+через\s+раз)${__T[6]}`, 'gi'), 'не працює'],
  [lbRx(String.raw`${__T[2]}работа(?:ет|ют)\s+через\s+раз${__T[6]}`, 'gi'), 'не работает'],
];


const DIALECT = { bremsn: 'bremsen', reifn: 'reifen', spiagl: 'spiegel', spiegl: 'spiegel', scheibn: 'scheibe', wischa: 'wischer', ziagt: 'zieht', karrn: 'karre', hod: 'hat', hob: 'hab', plattn: 'platten', lampn: 'lampe', liacht: 'licht' };
const COLLOQ = [


  [lbRx(String.raw`${__T[3]}(?:bremsn|reifn|spiagl|spiegl|scheibn|wischa|ziagt|karrn|hod|hob|plattn|lampn|liacht)${__T[0]}`, 'gi'), (m) => DIALECT[m.toLowerCase()]],
  [lbRx(String.raw`${__T[3]}san(?=${__T[7]}(?:hi|hin|kaputt|defekt|platt|leer|runter|durch|abgefahren|ab|lose|locker)${__T[0]})`, 'gi'), 'sind'],
  [lbRx(String.raw`${__T[3]}(?:h(?:ä|ae)nger)${__T[0]}`, 'gi'), 'anhänger'],
  [lbRx(String.raw`${__T[3]}(nicht|net|ned|nich|nit)\s+o${__T[0]}`, 'gi'), '$1 an'],
  [lbRx(String.raw`${__T[3]}(hab|habe|hat|haben)\s+an\s+(?=platten${__T[0]})`, 'gi'), '$1 einen '],
  [lbRx(String.raw`${__T[3]}(springt|springen|zieht|ziehen|bremst|schaltet|lenkt|l(?:ä|ae)dt)(${__T[7]})(?:net|ned|nich|nit)${__T[0]}`, 'gi'), '$1$2nicht'],
  [lbRx(String.raw`${__T[3]}is(?=${__T[7]}(?:hi|hin|platt|leer|runter|durch|lose|locker|ab|abgerissen|abgefahren|undicht|gerissen|gebrochen|verbogen)${__T[0]})`, 'gi'), 'ist'],
  [lbRx(String.raw`${__T[3]}(ist|sind)(${__T[7]})hi${__T[0]}`, 'gi'), '$1$2hin'],
  [lbRx(String.raw`${__T[3]}(?:luft)\s+(?:ist\s+)?(?:\S+\s+)?raus\s+(?:aus\s+)?(?:dem\s+|den\s+|einem\s+)?(?:\S+\s+)?reifen${__T[0]}`, 'gi'), 'reifen ist platt'],
  [lbRx(String.raw`${__T[3]}(reifen|profil)\s+(ist|sind)(${__T[7]})runter${__T[0]}(?!\s*(?:vom|von|gefallen|gekommen))`, 'gi'), '$1 $2$3durch'],
  [lbRx(String.raw`${__T[3]}(kupplung|turbo|lader|radlager|kopfdichtung|zylinderkopfdichtung)\s+(?:ist|sind)${__T[7]}durch${__T[0]}(?!\s*(?:den|die|das|dem|der|einen|eine|gerostet|gescheuert|gebrochen))`, 'gi'), '$1 ist kaputt'],
  [lbRx(String.raw`${__T[3]}(auspuff|endtopf|sto(?:ß|ss)stange|kotfl(?:ü|ue)gel|spritzlappen|schmutzf(?:ä|ae)nger|seitenverkleidung|verkleidung|radkappe|spoiler|windleitblech)\s+(ist|sind)(${__T[7]})ab${__T[0]}(?!\s*(?:jetzt|sofort|morgen|heute|montag))`, 'gi'), '$1 $2$3abgerissen'],
  [lbRx(String.raw`${__T[3]}(?:funzt|funtzt|funktionirt|funktionier|funkioniert|funktoniert|funktionert|funkzioniert)${__T[0]}`, 'gi'), 'funktioniert'],
  [lbRx(String.raw`${__T[3]}get(?=\s+(?:nicht|net|ned|nich|nit|mehr\s+nicht)${__T[0]})`, 'gi'), 'geht'],
  [lbRx(String.raw`${__T[3]}(geht|funktioniert|l(?:ä|ae)uft|k(?:ü|ue)hlt|heizt|startet|schlie(?:ß|ss)t|(?:ö|oe)ffnet|reagiert|tut|ist|sind)(${__T[7]})(?:net|ned|nich|nit)${__T[0]}`, 'gi'), '$1$2nicht'],
  [lbRx(String.raw`${__T[3]}kaput(?![a-zäöüßt])`, 'gi'), 'kaputt'],
  [lbRx(String.raw`${__T[3]}(?:defeckt|defekd|deffekt|defeckd|defekkt)${__T[0]}`, 'gi'), 'defekt'],
  [lbRx(String.raw`${__T[3]}is(?=${__T[7]}(?:kaputt|defekt|hinüber)${__T[0]})`, 'gi'), 'ist'],
  [lbRx(String.raw`${__T[3]}(?:ist|sind)${__T[7]}(?:hin(?:ü|ue)ber|im\s+eimer|im\s+arsch|hin${__T[0]}(?!\s*(?:und|zum|zur|zu|nach|gefahren|gegangen|gelaufen|her|gebracht|gestellt|geschickt|unterwegs)${__T[0]}))${__T[0]}|${__T[3]}(?:im\s+eimer|im\s+arsch)${__T[0]}`, 'gi'), 'ist kaputt'],
  [lbRx(String.raw`(?<![a-z])workin(?![a-z'’g])`, 'gi'), 'working'],

  [/(?:\s+(?:is|are)|['’]s|['’]re)(\s+(?:completely\s+|totally\s+|absolutely\s+|well\s+|just\s+)?)(?:knackered|shot|bust|busted|buggered|goosed|done\s+for)(?![a-z])/gi, ' is$1broken'],
  [lbRx(String.raw`(?<![a-z])(clutch|brakes?|gearbox|alternator|starter(?:\s+motor)?|turbo|heater|wipers?|wiper\s+motor|mirror|wing\s+mirror|headlights?|bulb|fan\s+belt|aircon|air\s+con)\s+(?:has|have|['’]s)\s+(?:just\s+|completely\s+)?gone(?![a-z])(?!\s+(?:in|to|for|back|off|on|through|down|up|out))`, 'gi'), '$1 is broken'],
  [lbRx(String.raw`(?<![a-z])(?:dont|don['’]t)\s+work(?![a-z])`, 'gi'), "doesn't work"],
  [lbRx(String.raw`(?<![a-z])ain['’]?t\s+working(?![a-z])`, 'gi'), 'not working'],

  [lbRx(String.raw`${__T[3]}(stau|sperrung|vollsperrung|umleitung|versp(?:ä|ae)tung|wartezeit)([a-zäöüß]*\s+${__T[9]})(?:wegen|durch|nach)\s+(?:einem\s+|eines\s+|einen\s+|dem\s+|des\s+)?(?:\S+\s+)?unfall(?:s|es)?${__T[0]}`, 'gi'), '$1$2'],
  [lbRx(String.raw`${__T[3]}(?:wegen|durch)\s+(?:eines\s+|einem\s+|einen\s+|des\s+|dem\s+)?(?:\S+\s+)?unfall(?:s|es)?\s+(?=${__T[9]}(?:stau|gesperrt|sperrung|vollsperrung|umleitung)${__T[0]})`, 'gi'), ' '],
  [lbRx(String.raw`(?<![a-z])(traffic|stuck|delay(?:ed)?|queue|queuing|closed|closure|diversion|diverted)(\s+(?:\S+\s+){0,4}?)(?:due\s+to|because\s+of|after)\s+(?:an?\s+|the\s+)?(?:\S+\s+)?(?:accident|crash|collision)(?![a-z])`, 'gi'), '$1$2'],
  [lbRx(String.raw`${__T[2]}(затор|пробк[а-яіїєґё]*|затримк[а-яіїєґё]*|перекри[а-яіїєґё]*|об['’]?їзд|объезд)(${__T[7]})через\s+(?:дтп|аварі[юї]|аварию)`, 'gi'), '$1$2'],

  [lbRx(String.raw`${__T[3]}(?:(?:ist|sind|war|waren)\s+)?nicht\s+(?:defekt|kaputt|platt|besch(?:ä|ae)digt|undicht|gerissen|gebrochen|verbogen|gesprungen|abgefahren|abgerissen|abgebrochen|verrutscht|verschoben|umgefallen|eingedr(?:ü|ue)ckt|zerkratzt|verkratzt|geplatzt|ausgelaufen)${__T[0]}(?!\s+(?:gegangen|gemacht|geworden))`, 'gi'), ' ok'],
  [lbRx(String.raw`${__T[3]}(?:kein|keine|keinen|keinerlei)\s+[a-zäöüß-]*(?:schaden|sch(?:ä|ae)den|leck|defekt|fehler|warnleuchte|warnlampe|kontrollleuchte|problem|probleme|befund|riss|risse|steinschlag|steinschl(?:ä|ae)ge)${__T[0]}|${__T[3]}keine\s+ladung${__T[7]}(?:verloren|verrutscht|besch(?:ä|ae)digt|(?:her)?untergefallen|runtergefallen)${__T[0]}|${__T[3]}(?:rutscht|rutschen|quietscht|quietschen|raucht|rauchen|qualmt|tropft|tropfen|leckt|wackelt|vibriert|klappert|stinkt|sifft|schleift|knackt|klopft|rattert|ruckelt)\s+nicht(?:\s+mehr)?${__T[0]}(?!\s+(?:mehr\s+)?(?:rein|raus|ein|hinein|heraus|runter|hoch|durch)${__T[0]})`, 'gi'), ' ok'],
  [lbRx(String.raw`${__T[3]}(?:kein|keine|keinen|keinerlei)\s+[a-zäöüß-]*(?:unfall|unf(?:ä|ae)lle|diebstahl|einbruch|feuer|brand|rauch|qualm|marder|marderbiss|verlust)${__T[0]}(?!\s+mehr)|${__T[3]}nichts\s+(?:wurde\s+|ist\s+)?(?:gestohlen|geklaut|entwendet|weggekommen)${__T[0]}`, 'gi'), ' ok'],
  [lbRx(String.raw`(?<![a-z])(?:no|not\s+an?)\s+(?:accident|crash|collision|theft|break-?in|fire|smoke|leak)${__T[24]}nothing\s+(?:was\s+|got\s+)?(?:stolen|taken|missing)(?![a-z])`, 'gi'), ' ok'],
  [lbRx(String.raw`${__T[2]}(?:без|не\s+було|не\s+было|немає|нема|нет)\s+(?:дтп|аварі[ії]|аварии|крадіжки|кражи|пожежі|пожара|диму|дыма)${__T[6]}|${__T[2]}нічого\s+не\s+(?:вкрали|украли|зникло|пропало)`, 'gi'), ' ok'],
  [lbRx(String.raw`(?<![a-z])(?:no|not\s+any)\s+(?:visible\s+)?(?:damage|leaks?|warning\s+lights?|faults?|defects?|problems?|issues?)${__T[24]}(?:(?:is|are|was|were)\s+)?not\s+(?:damaged|broken|flat|leaking|cracked|bent)(?![a-z])`, 'gi'), ' ok'],
  [lbRx(String.raw`${__T[2]}(?<!(?:${__T[2]}сигнал|клаксон[а-яіїєґё]*|гудок|бибикалк[а-яіїєґё]*|бібікалк[а-яіїєґё]*)\s+)не\s+(?:скрип|скрегоч|скрежещ|дим|дым|тече|течё|тек|капа|стука|стуч|гуд|вібру|вибрир|смерд|воня|трясе|трясё)[а-яіїєґё]*${__T[6]}(?!\s+(?:звуков[а-яіїєґё]*\s+)?(?:сигнал${__T[6]}|клаксон|гудок|бибикалк|бібікалк))(?:\s+більше|\s+больше)?`, 'gi'), ' ok'],
  [lbRx(String.raw`(?<![a-z])(?:(?:is|are)\s+)?not\s+(?:squeaking|squealing|grinding|smoking|knocking|rattling|vibrating|dripping|juddering|shaking)(?:\s+any\s*more)?(?![a-z])`, 'gi'), ' ok'],
  [lbRx(String.raw`${__T[2]}не\s+(?:пошкоджен|зламан|повреждён|поврежден|сломан|спущен|пробит|розбит|разбит)[а-яіїєґё]*|${__T[2]}${__T[36]}|без)\s+(?:пошкоджен|поврежден|несправност|неисправност|витоку|утечки|течі)[а-яіїєґё]*`, 'gi'), ' ok'],


  [lbRx(String.raw`${__T[3]}(?:geht|gehen|ist|sind|l(?:ä|ae)sst\s+sich|lassen\s+sich|wird|wirkt)\s+nicht\s+(?:mehr\s+|so\s+|besonders\s+|zu\s+)?schwer(?:g(?:ä|ae)ngig)?${__T[0]}(?!\s+(?:zu|auf)${__T[0]})`, 'gi'), ' ok'],
  [lbRx(String.raw`${__T[1]}(bremsweg(?:e|s)?)${__T[0]}\s+(?:(?:ist|sind|wird|wurde|scheint)\s+)?(?:auch\s+)?${__T[13]}(?:l(?:ä|ae)nger|zu\s+lang|verl(?:ä|ae)ngert)${__T[0]}(?:\s+geworden)?`, 'gi'), '$1 ok'],
  [lbRx(String.raw`(?<![a-z])(?:is|are|isn['’]t|aren['’]t)\s+(?:not\s+)?(?:stiff|heavy|sticking)${__T[24]}(?:stopping|braking)\s+distance\s+(?:is\s+|has\s+)?(?:not|n['’]t|isn['’]t|hasn['’]t)\s+(?:got\s+|gotten\s+|become\s+)?(?:longer|increased)(?![a-z])`, 'gi'), (m) => (/not|n['’]t/i.test(m) ? ' ok' : m)],
];
const noFunc = (s) => INTERMIT.reduce((a, [re, to]) => a.replace(re, to), COLLOQ.reduce((a, [re, to]) => a.replace(re, to), s)).replace(lbRx(String.raw`(?<=[a-zäöüß])\s*:\s+(?=[a-zäöüß])`, 'gi'), ' ').replace(NO_FUNC, (m) => (/^[a-zäöüß]/i.test(m) ? (/^(?:ohne|kein|funktionslos|tut)/i.test(m) ? 'funktioniert nicht' : 'not working') : (/функциониру/i.test(m) ? 'не работает' : 'не працює')));




const PLACE_SPAN = lbRx(String.raw`${__T[1]}(?:t(?:ü|ue)r(?:e|en)?|tor(?:e)?|licht(?:er)?|lampe(?:n)?|beleuchtung|fenster|heizung|heizk(?:ö|oe)rper|klima(?:anlage)?|steckdose(?:n)?)${__T[0]}\s+(?:vom|von\s+(?:der|dem|unserer|unserem)|im|in\s+(?:der|dem|unserer|unserem)|zum|zur|ins|der|des|am|an\s+der|beim|bei\s+der|auf\s+(?:der|dem))\s+(?:b(?:ü|ue)ro(?:s|container|raum)?|(?:lager|werk|fahrzeug)?halle|lager(?:raum)?|werkstatt|toilette|wc|klo|pforte|empfang|umkleide(?:raum)?|aufenthaltsraum(?:es)?|sozialraum(?:es)?|pausenraum(?:es)?|kantine|(?:firmen|b(?:ü|ue)ro)?geb(?:ä|ae)ude(?:s)?|(?:betriebs|firmen)?hof(?:es)?|gel(?:ä|ae)nde(?:s)?|depot(?:s)?|einfahrt|waschhalle|waschanlage)${__T[0]}[^.;!?,\n]*|${__T[1]}(?:vom|von\s+(?:der|dem|unserer|unserem)|im|in\s+(?:der|dem|unserer|unserem)|zum|zur|ins|der|des|am|an\s+der|beim|bei\s+der|auf\s+(?:der|dem))\s+(?:b(?:ü|ue)ro(?:s|container|raum)?|toilette|wc|klo|pforte|umkleide(?:raum)?|aufenthaltsraum(?:es)?|sozialraum(?:es)?|pausenraum(?:es)?|kantine|(?:firmen|b(?:ü|ue)ro)?geb(?:ä|ae)ude(?:s)?)${__T[0]}\s+${__T[9]}(?:t(?:ü|ue)r(?:e|en)?|tor(?:e)?|licht(?:er)?|lampe(?:n)?|beleuchtung|fenster|heizung|heizk(?:ö|oe)rper|klima(?:anlage)?|steckdose(?:n)?)${__T[0]}[^.;!?,\n]*|${__T[5]}(?:office|warehouse|depot|yard|building|toilet|bathroom|restroom|washroom|canteen|break\s*room|locker\s*room|gatehouse|reception|shed|wash\s*bay)\s+(?:doors?|gates?|lights?|lamps?|lighting|windows?|heating|heaters?|radiators?|air\s*-?con|socket|sockets)(?![a-z])[^.;!?,\n]*|${__T[5]}(?:doors?|gates?|lights?|lamps?|lighting|windows?|heating|heaters?|radiators?|air\s*-?con|socket|sockets)\s+(?:in|of|to|at|on|for)\s+(?:the\s+|our\s+)?(?:office|warehouse|depot|yard|building|toilet|bathroom|restroom|washroom|canteen|break\s*room|locker\s*room|gatehouse|reception|shed|wash\s*bay)(?![a-z])[^.;!?,\n]*|${__T[5]}(?:in|at)\s+(?:the\s+|our\s+)?(?:office|toilet|bathroom|restroom|washroom|canteen|break\s*room|locker\s*room|gatehouse|reception)(?![a-z])\s+${__T[9]}(?:doors?|gates?|lights?|lamps?|lighting|windows?|heating|heaters?|radiators?|air\s*-?con|socket|sockets)(?![a-z])[^.;!?,\n]*|${__T[2]}(?:двер\S*|ворот\S*|світл\S*|свет(?:а|у)?|ламп\S*|вікн\S*|вікно|окн\S*|окно|опаленн\S*|отоплени\S*|розетк\S*)\s+(?:(?:в|у|на|до|в\s+нашому|у\s+нашому)\s+)?(?:офіс\S*|офис\S*|склад\S*|цех\S*|ангар\S*|туалет\S*|будівл\S*|здани\S*|приміщенн\S*|помещени\S*|роздягальн\S*|раздевалк\S*|їдальн\S*|столов\S*|прохідн\S*|проходн\S*)[^.;!?,\n]*|${__T[2]}(?:в|у)\s+(?:офіс\S*|офис\S*|склад\S*|цех\S*|ангар\S*|туалет\S*|будівл\S*|здани\S*|приміщенн\S*|помещени\S*|роздягальн\S*|раздевалк\S*|їдальн\S*|столов\S*|прохідн\S*|проходн\S*)\s+${__T[9]}(?:двер\S*|ворот\S*|світл\S*|свет(?:а|у)?|ламп\S*|вікн\S*|вікно|окн\S*|окно|опаленн\S*|отоплени\S*|розетк\S*)[^.;!?,\n]*`, 'gi');

const PLACE_KEEP = lbRx(String.raw`${__T[3]}(?:an(?:ge)?fahren|angefahren|touchiert|gerammt|gestreift|gegen|dagegen|rein\s*gefahren|reingefahren|hineingefahren|reingesetzt|zusammengesto(?:ß|ss)en|besch(?:ä|ae)digt|eingedr(?:ü|ue)ckt|eingedellt|kollidiert|unfall\S*|r(?:ü|ue)ckw(?:ä|ae)rts|rangier\S*|lkw\S*|lastwagen|zugmaschine|sattelzug${__T[25]}ae)nger|fahrerhaus|kabine)${__T[0]}${__T[39]}hit|hitting|reversed|reversing|backed|backing|crashed|collided|scraped|clipped|bumped|damaged|accident|truck|lorry|trailer|cab|tractor\s+unit)(?![a-z])|${__T[2]}(?:врізав\S*|врезал\S*|зачепи\S*|зацепи\S*|наїха\S*|наеха\S*|в['’]їха\S*|въеха\S*|пошкод\S*|повред\S*|дтп|вантажівк\S*|грузовик\S*|фур\S*|тягач\S*|причеп\S*|прицеп\S*|кабін\S*|кабин\S*)`, 'i');



const OWNCAR_SPAN = lbRx(String.raw`${__T[1]}(?:privat(?:auto|wagen|fahrzeug|-?pkw)s?|private[nrms]?\s+(?:auto|pkw|wagen)s?|(?:mein|meinem|meinen)\s+(?:privat|eigen)(?:e|en|er|es)?\s+(?:auto|pkw|wagen)s?|(?:mein|meinem)\s+(?:privat(?:auto|wagen|-?pkw))|fahrrads?|e-?bikes?|motorrads?|motorroller|mofa)${__T[0]}[^.;!?,\n]*|${__T[5]}(?:my\s+(?:own|private|personal)\s+(?:car|vehicle)|(?:own|private|personal)\s+car|(?:my\s+)?(?:bike|bicycle|e-?bike|motorbike|scooter))(?![a-z])[^.;!?,\n]*|${__T[2]}(?:(?:мо[яєї]|моя|мій|мою)\s+)?(?:власн\S*|особист\S*|личн\S*|приватн\S*|частн\S*)\s+(?:машин\S*|авто\S*|легков\S*)[^.;!?,\n]*|${__T[2]}(?:велосипед\S*|мопед\S*|мотоцикл\S*|скутер\S*)[^.;!?,\n]*`, 'gi');
const noPlace = (s) => String(s || '').split(/([.;!?,\n]+)/).map((part) => (PLACE_KEEP.test(part) ? part : part.replace(PLACE_SPAN, ' ◇ ').replace(OWNCAR_SPAN, ' ◇ '))).join('');


const V2_INV = lbRx(String.raw`${__T[3]}((?:au(?:ß|ss)erdem|zus(?:ä|ae)tzlich|dazu|dann|danach|jetzt|nun|auch|leider|pl(?:ö|oe)tzlich|manchmal|st(?:ä|ae)ndig|immer\s+wieder|wieder|seit\s+[a-zäöüß0-9.]+|(?:heute|gestern|vorgestern)(?:\s+(?:morgen|fr(?:ü|ue)h|mittag|abend|nacht))?|morgens|abends|nachts|unterwegs|beim\s+[a-zäöüß]+|nach\s+der\s+[a-zäöüß]+|nach\s+dem\s+[a-zäöüß]+))\s+(?!(?:der|die|das|den|dem|ein|eine|mein|meine|unser|unsere|er|sie|es|ich|wir|man)${__T[0]})([a-zäöüß]+(?:t|en))\s+((?:der|die|das|mein|meine|unser|unsere)\s+(?:(?:link|recht|vorder|hinter|neu|alt|ober|unter|mittler|erst|zweit|dritt|(?:ä|ae)u(?:ß|ss)er|inner|gro(?:ß|ss)|klein)e[nrs]?\s+)?(?!(?:hinten|vorne|vorn|links|rechts|oben|unten|nicht|nie|kein\S*|mehr|immer|wieder|schon|auch|noch|sehr|ganz|so|zu|beim|im|am|an|auf|in|nach|bei|seit|und|oder|aber|seit)${__T[0]})[a-zäöüß-]{3,})(?![a-zäöüß-])`, 'gi');



const NO_MORE = lbRx(String.raw`${__T[3]}(?:(?:klemm|quietsch|h(?:ä|ae)ng|wackel|ruckel|flacker|flatter|rutsch|qualm|hak|schmier|tropf|leck|klapper|vibrier|rauch|stink|zisch|pfeif|schleif|knack|knarz|brumm|dr(?:ö|oe)hn|ratter|spinn|ruck|schl(?:ä|ae|a)g)(?:t|en)\s+(?:(?:jetzt|seitdem|seither|zum\s+gl(?:ü|ue)ck)\s+)?nicht\s+mehr(?!\s+(?:richtig|gut|ordentlich|sauber|ganz|vollst(?:ä|ae)ndig|zu${__T[0]}|auf${__T[0]}))|f(?:ä|ae)ll(?:t|en)\s+(?:(?:jetzt|seitdem|seither)\s+)?nicht\s+mehr\s+aus|verlier(?:t|en)\s+(?:(?:jetzt|seitdem|seither)\s+)?(?:keine|kein)\s+(?:[a-zäöüß]+\s+)?mehr)${__T[0]}`, 'gi');



const NO_MORE_X = lbRx(String.raw`${__T[3]}(?:lenkung\s+zieh(?:t|en)\s+(?:(?:jetzt|seitdem|seither)\s+)?nicht\s+mehr(?!\s+(?:richtig|gut|ganz))|zieh(?:t|en)\s+(?:(?:jetzt|seitdem|seither)\s+)?nicht\s+mehr\s+(?:nach\s+(?:links|rechts)|zur\s+seite|einseitig|schief))${__T[0]}${__T[39]}no\s+longer|(?:has\s+|have\s+)?stopped|(?:does|do|is|are|did)(?:\s+not|n['’]t))\s+(?:(?:squeak|squeal|stick|smear|flicker|flap|leak|drip|rattl|vibrat|shak|judder|grind|hiss|knock|smok|stink|jerk|slip|whin|whistl|buzz|clunk)[a-z]{0,4}|cut(?:s|ting)?\s+out|los(?:e|es|ing)\s+air|pull(?:s|ing)?\s+(?:to\s+(?:the\s+)?(?:left|right|one\s+side)|left|right|sideways))(?:\s+any\s*more)?(?![a-z])|${__T[2]}(?:(?:більше|вже|уже|больше)\s+не|перестал[аои]?|перестав(?:ла|ли|ло)?)\s+(?:(?:заїда|заеда|скрип|тек|теч|капа|мига|мерехт|мерца|стука|стуча|вібру|вибриру|гуд|шип|спуска|смика|дерга|димит|дымит|смерд|воня|гримі|гриміт|гремет|гремит|торохт|тарахт|деренч|дребезж|буксу|проковзу|проскальзыва|замерз|примерз|змерз)[а-яіїєґё]*|(?:тягн|тягну|тян|тянут)[а-яіїєґё]*\s+(?:вліво|вправо|ліворуч|праворуч|убік|в\s+бік|влево|вправо|в\s+сторону|налево|направо))(?:\s+більше|\s+больше)?${__T[6]}|${__T[2]}не\s+(?:заїда|заеда|скрип|тече|течу|теч[её]|капа|мига|мерехт|мерца|стука|стуча|вібру|вибриру|шип|спуска)[а-яіїєґё]*\s+(?:більше|больше)${__T[6]}`, 'gi');






const CLAUSE_FIXW = lbRx(String.raw`${__T[3]}(?:repariert|erneuert|(?:aus)?getauscht|ersetzt|(?:aus)?gewechselt|instand\s*gesetzt${__T[23]}changed)${__T[0]}|${__T[4]}(?:відремонт|отремонт|замінил|замінен|заменил|заменен|поміня|поменя|полагод|почини)[а-яіїєґ']*`, 'gi');
const CLAUSE_HEAD = lbRx(String.raw`(?<![a-zäöüßа-яіїєґ'])(?:(?:und|and|а|и|і|та|й|also|dann|then)\s+(?:(?:der|die|das|den|dem|the|my|our|their|a|an)\s+)?|(?:der|die|das|den|dem|the|my|our|their)\s+)([a-zäöüßа-яіїєґ'-]{3,})(?![a-zäöüßа-яіїєґ'])`, 'gi');
const CLAUSE_SKIP = /^(?:wurde|wurden|ist|sind|war|waren|hat|haben|hatte|wird|werden|was|were|has|have|had|got|been|is|are|it|they|them|he|she|we|you|es|er|sie|wir|ihr|man|ich|auch|schon|gestern|heute|letzte|letzten|last|yesterday|today|also|then|dann|noch|still|аж|вже|уже|ще|еще|вчора|вчера|сьогодні|сегодня|його|її|их|його|ее|його|він|вона|вони|он|она|они|це|это|мені|мне|нам|mechaniker|monteur|werkstatt|kollege|kollegen|chef|mechanic|mechanics|garage|workshop|fitter|механік|механики|механік|механик|майстер|мастер|сто|сервіс|сервис)$/i;

const CLAUSE_GAP = lbRx(String.raw`[,:]|(?<![a-zäöüßа-яіїєґ'])(?:obwohl|aber|weil|trotz|nachdem|seit|wieder|although|though|but|because|after|since|again|хоча|хотя|але|но|бо|потому|після|после|знову|опять|снова)(?![a-zäöüßа-яіїєґ'])`, 'i', 1);
const clauseCut = (s) => String(s || '').split(/([.;!?\n]+)/).map((part) => {
  const cuts = [];
  for (const f of part.matchAll(CLAUSE_FIXW)) {
    const before = part.slice(0, f.index); const win = before.split(/\s+/).slice(-7).join(' '); const winAt = before.length - win.length;
    let head = null; for (const h of win.matchAll(CLAUSE_HEAD)) if (!CLAUSE_SKIP.test(h[1]) && !CLAUSE_GAP.test(win.slice(h.index + h[0].length))) { head = h; break; }
    if (!head) continue;
    const at = winAt + head.index, prev = part.slice(0, at);
    if (prev.trim().split(/\s+/).length < 2 || /,\s*$/.test(prev)) continue;
    const stem = head[1].toLowerCase().slice(0, 4);
    if (prev.toLowerCase().split(/[^a-zäöüßа-яіїєґ'-]+/).some((w) => w.startsWith(stem))) continue;
    cuts.push(at);
  }
  return [...new Set(cuts)].sort((a, b) => b - a).reduce((p, at) => p.slice(0, at).replace(/\s+$/, '') + '. ' + p.slice(at), part);
}).join("");





const RECUR_BUT = lbRx(String.raw`${__T[3]}(?:aber|jedoch|doch|allerdings|but|however|yet)${__T[0]}|${__T[2]}(?:але|проте|однак|но|однако)${__T[6]}`, 'i');
const RECUR_DROP = lbRx(String.raw`${__T[3]}(?:immer\s+noch|noch\s+immer|schon\s+wieder|trotzdem|dennoch|weiterhin|erneut|wieder|aber|jedoch|doch|allerdings|still|again|anyway|but|however|yet|es|er|sie|it|they)${__T[0]}|${__T[2]}(?:все\s+одно|вс[её]\s+равно|до\s+сих\s+пор|вс[её]\s+ещ[её]|досі|ще|ещ[её]|знову|знов|снова|опять|але|проте|однак|но|однако|он|она|оно|они|він|вона|воно|вони)${__T[6]}`, 'gi');
const RECUR_ADMIN = lbRx(String.raw`${__T[3]}(?:abgeholt|bezahlt|abgerechnet|berechnet|picked\s+up|collected|invoiced|paid)${__T[0]}|${__T[2]}(?:забра|оплат|заплат)[а-яіїєґё]*`, 'i', 1);

const RECUR_AGAIN = lbRx(String.raw`${__T[3]}(?:aber|jedoch|doch|allerdings)${__T[7]}wieder${__T[0]}`, 'i', 1);
const RECUR_AUX = /(?:\s+(?:wurde|wurden|ist|sind|war|waren|hat|haben|was|were|is|are|has|have|had|been|got|gets))+\s*$/i;
const recurTail = (part) => {
  const f = new RegExp(FIX_WORD.source, 'i').exec(part); if (!f) return '';
  const rest = part.slice(f.index + f[0].length), but = rest.match(RECUR_BUT); if (!but || RECUR_ADMIN.test(rest)) return '';


  const nxt = rest.slice(but.index + but[0].length).replace(RECUR_DROP, ' ').trim();
  if (!/[a-zäöüßа-яіїєґё]/i.test(rest.slice(0, but.index)) && /^(?:[A-ZÄÖÜ][a-zäöüß]{2,}(?![a-zäöüß]*\s+(?:sich|mal)(?![a-zäöüß]))|(?:der|die|das|den|dem|the|my|our|this|that|these|those)\s)/.test(nxt)) return '';
  const subj = part.slice(0, f.index).split(/[,:⁘]/).pop().replace(RECUR_AUX, '').replace(lbRx(String.raw`${__T[2]}(шин|резин)у${__T[6]}`, 'gi'), '$1а');
  const tail = (subj + ' ' + rest.replace(RECUR_DROP, ' ')).replace(/[,:]/g, ' ').replace(/\s+/g, ' ').trim();
  return tail ? ' ⁘ ' + tail : '';
};





const DICT_PAIRS = 'schein werfer|luft feder|luft balg|feder balg|luftfeder balg|lade bord|bord wand|ladebord wand|lade bordwand|lade fläche|fahrer karte|fahrer haus|führer haus|fahrer tür|beifahrer tür|stein schlag|front scheibe|wind schutz|schutz scheibe|windschutz scheibe|heck scheibe|seiten scheibe|sattel kupplung|kühl aggregat|kühl gerät|kühl wasser|kühl mittel|wisch wasser|wasch wasser|scheiben wischer|rück fahr|rückfahr kamera|rückfahr licht|rückfahr scheinwerfer|stoß stange|motor kontroll|motorkontroll leuchte|kontroll leuchte|kontroll lampe|motor leuchte|warn leuchte|reifen druck|reifen panne|kenn zeichen|diesel filter|kraftstoff filter|partikel filter|stand heizung|licht maschine|aus puff|ad blue|brems licht|brems belag|brems beläge|brems scheibe|brems leitung|brems pedal|schluss licht|rück licht|blink licht|hand bremse|fest stell|feststell bremse|lenk rad|zünd schlüssel|auf lieger|an hänger|tank deckel|keil riemen|zahn riemen|wasser pumpe|öl verlust|öl stand|luft verlust|ersatz rad|fahrten schreiber|kupplungs pedal|gas pedal|kennzeichen beleuchtung|kennzeichen leuchte|unterleg keil|verbands kasten|warn dreieck|warn weste|gurt schloss|stütz bein|stütz winde|zurr gurt|spann gurt|cb funk|usb anschluss|usb buchse';
const DICT_UML = (w) => w.replace(/ü/g, '(?:ü|ue)').replace(/ö/g, '(?:ö|oe)').replace(/ä/g, '(?:ä|ae)').replace(/ß/g, '(?:ß|ss)');
const DICT_JOIN = new RegExp('(^|[^a-zäöüß])(' + DICT_PAIRS.split('|').map((x) => x.split(' ').map(DICT_UML).join('\\s+')).join('|') + ')', 'gi');
const DICT_TYPO = [[lbRx(String.raw`${__T[3]}reif+en`, 'gi'), 'reifen'], [lbRx(String.raw`${__T[3]}brem+s+e`, 'gi'), 'bremse'], [lbRx(String.raw`${__T[3]}sc?h?pie?gel`, 'gi'), 'spiegel'], [/ferlust/gi, 'verlust'], [lbRx(String.raw`${__T[3]}oel`, 'gi'), 'öl'], [/def[eä]c?kt/gi, 'defekt'], [lbRx(String.raw`${__T[3]}kupp?lun?g${__T[0]}`, 'gi'), 'kupplung'], [lbRx(String.raw`${__T[3]}ad-blue`, 'gi'), 'adblue']];

const DICT_SIGN = lbRx(String.raw`(\d\s*)?${__T[1]}(komma|comma|doppelpunkt|punkt|full\s+stop|fragezeichen|question\s+mark|(?:ausrufezeichen|exclamation\s+mark)(?![a-zäöüß-])(?!${__T[7]}(?:symbol|icon|lampe|leuchte|leuchtet|brennt|blinkt|light|is\s+on|is\s+lit|lit|flashing|(?:im|am)\s+(?:display|cockpit|tacho)|(?:on|in)\s+(?:the\s+|my\s+)?(?:dash|dashboard|display|screen|cluster)|came\s+on|appeared|showing|keeps\s+(?:coming|flashing)))|neue\s+zeile|neuer\s+absatz|new\s+line|new\s+paragraph)(?![a-zäöüß-])(\s*\d)?`, 'gi');
const dictSign = (w) => (/^(?:komma|comma)$/i.test(w) ? ',' : /^doppel/i.test(w) ? ':' : /^(?:punkt|full)/i.test(w) ? '.' : /^(?:frage|question)/i.test(w) ? '?' : /^(?:ausruf|exclam)/i.test(w) ? '!' : '\n');
const dictFix = (s) => {
  let t = String(s || '').replace(DICT_SIGN, (m, a, w, b) => (a || b ? m : ' ' + dictSign(w) + ' '));
  for (const [r, v] of DICT_TYPO) t = t.replace(r, (w) => (w[0] !== w[0].toLowerCase() ? v[0].toUpperCase() + v.slice(1) : v));
  for (let i = 0; i < 2; i++) t = t.replace(DICT_JOIN, (m, a, w) => a + w.replace(/\s+/g, ''));
  return t;
};
const recurFix = (s) => noFunc(noPlace(clauseCut(dictFix(s).replace(/ё/g, 'е').replace(/Ё/g, 'Е').replace(FIX_SYN, (w) => (/^(?:и|почин)/i.test(w) ? 'отремонтировали' : 'відремонтували')))).replace(STOP_WORK, 'not working')).replace(PRED_FIRST, (m, v, subj) => m + ' ⁘' + subj + ' ' + v).replace(V2_INV, (m, adv, v, subj) => m + ' ⁘' + subj + ' ' + v).replace(NO_MORE, '◦ ⁂ behoben').replace(NO_MORE_X, '◦ ⁂ behoben').split(/([.;!?\n]+)/).map((part) => {
  const all = RECUR_MARK.test(part);
  return (all || RECUR_AGAIN.test(part) ? part + recurTail(part) : part).replace(FIX_WORD, (w, off) => (all || FIX_NEG.test(part.slice(0, off)) || FIX_PLAN.test(part.slice(0, off)) || FIX_PLAN_AFTER.test(part.slice(off + w.length)) || /(?:ти|ть|тися|ться)$/i.test(w) ? (/^\S*wieder/i.test(w) || /^(?:schon|immer)\s/i.test(w) ? '' : '◦') : w));
}).join('');





const FIXED_NOTE = lbRx(String.raw`${__T[3]}(?<!(?<![a-z])be\s+)(?:repariert|erneuert|(?:aus)?getauscht|ersetzt|behoben|(?:aus)?gewechselt|instand\s*gesetzt|gereinigt|befestigt|(?:funktioniert|geht|l(?:ä|ae)uft)\s+wieder(?!\s+(?:nicht|an|aus|auf|zu|ab|los|kaputt)${__T[0]})|wieder\s+(?:ok|okay|in\s+ordnung)${__T[23]}(?<!(?:not|never|n['’]t|stopp?(?:ed|s)?|quit(?:s|ted)?|ceased?)\s+)(?:works?|working)\s+again)${__T[0]}(?!\s+(?:werden|wird|lassen))|${__T[2]}(?:відремонтува(?:в|ла|ли|но)|відремонтован[а-яіїєґё]*|замін(?:ив|или|ила|ено|ений|ена|ені)|поміня(?:в|ла|ли|но)|полагоди(?:в|ла|ли)|отремонтирова(?:л|ла|ли|но)|отремонтирован[а-яё]*|замен(?:ил|или|ила|ено|[её]н|ен|ена|ены)|поменя(?:л|ла|ли|но)|почини(?:л|ла|ли)|усун(?:ув|ули|уто|ено)|устран(?:ил|или|ено|[её]н|ен))${__T[6]}|${__T[2]}(?:знову|знов|снова|опять)\s+(?:працює|работает)${__T[6]}`, 'gi');


const FIX_BUT = lbRx(String.raw`${__T[3]}(?:aber|jedoch|doch|allerdings|but|however|yet)${__T[0]}|${__T[2]}(?:але|проте|однак|но|однако)${__T[6]}`, 'i');
const FIX_BUT_NEG = lbRx(String.raw`${__T[3]}(?:nicht|nie|kein\S*|not|never|no\s+longer|defekt|kaputt|broken|faulty)${__T[0]}|n['’]t(?![a-z])|${__T[2]}(?:не|ні|нет|злама[внл]\S*|сломан\S*)${__T[6]}`, 'i', 1);


const FIX_BUT_ADMIN = lbRx(String.raw`${__T[3]}(?:abgeholt|bezahlt|abgerechnet|berechnet|picked\s+up|collected|invoiced|paid)${__T[0]}|${__T[2]}(?:забра|оплат|заплат)[а-яіїєґё]*`, 'i', 1);



const FIX_FILL = lbRx(String.raw`${__T[3]}(?:immer\s+noch|noch\s+immer|trotzdem|dennoch|weiterhin|(?:immer\s+|schon\s+)?wieder|manchmal|ab\s+und\s+zu|zeitweise|sporadisch|gelegentlich|(?:immer\s+)?öfter|oft|h(?:ä|ae)ufig|st(?:ä|ae)ndig|dauernd|still|anyway|anyhow|again|sometimes|occasionally)${__T[0]}|${__T[2]}(?:все\s+одно|вс[её]\s+равно|все\s+равно|досі|до\s+сих\s+пор|й\s+далі|ще|еще|ещ[её]|знову|знов|снова|опять)${__T[6]}`, 'gi');



const FIX_BUT_FAIL = lbRx(String.raw`${__T[3]}(?:f(?:ä|ae|a)llt\s+${__T[9]}aus|ausgefallen|spinnt|hakt|klemmt|ruckelt|langsam|(?:geht|funktioniert|klappt|l(?:ä|ae)uft|k(?:ü|ue)hlt|heizt|startet)${__T[7]}nicht)${__T[0]}${__T[39]}cuts?\s+(?:out|off)|cutting\s+(?:out|off)|fail(?:s|ed|ing)?|stopped|died|dies|playing\s+up|not\s+working|slow|sluggish|stuck)(?![a-z])|${__T[2]}(?:повільн[а-яіїєґ]*|медленн[а-яё]*|заїда[а-яіїєґ]*|заеда[а-яё]*|вимика[а-яіїєґ]*ся|відключа[а-яіїєґ]*ся|відмовля[а-яіїєґ]*|відмовив|отключа[а-яё]*ся|выключа[а-яё]*ся|отказыва[а-яё]*|вийшов\s+з\s+ладу|вышел\s+из\s+строя|не\s+працю[а-яіїєґ]*|не\s+работа[а-яё]*)`, 'i', 1);
const FIX_BUT_G = new RegExp(FIX_BUT.source, 'gi');
const noFixed = (s) => String(s || '').split(/([.;!?\n]+)/).map((part) => { let end = -1, start = -1, neutral = false; for (const m of part.matchAll(FIXED_NOTE)) { start = m.index; end = m.index + m[0].length; } if (end < 0) { const ci = part.lastIndexOf('◦'); if (ci < 0) return part; start = ci; end = ci + 1; neutral = true; } const rest = part.slice(end), but = rest.match(FIX_BUT), after = but ? rest.slice(but.index + but[0].length) : ''; if (but && (FIX_BUT_NEG.test(after) || FIX_BUT_FAIL.test(rest.slice(0, but.index).split(/[,:]/).pop().trim().split(/\s+/).slice(-2).join(' ') + ' ' + after)) && !FIX_BUT_ADMIN.test(rest)) return part + ' ⁘ ' + (part.slice(0, start) + ' ' + rest.replace(FIX_BUT_G, ' ').replace(FIX_FILL, ' ')).replace(/[,:]/g, ' ').replace(/\s+/g, ' ').trim(); if (neutral) return part; return ' '.repeat(end) + rest; }).join('');

const CABLEAK_HINT = lbRx(String.raw`${__T[1]}(?:fahrer|beifahrer)t(?:ü|ue)r(?:en|e)?${__T[0]}\s+(?:(?:ist|sind|wird|seit|bei|regen|wieder|unten|oben)[,;]?\s+){0,3}(?:undicht|leckt|zieht\s+wasser)${__T[0]}${__RX[17]}|${__T[1]}(?:t(?:ü|ue)r)?dichtung\s+(?:an\s+der\s+|der\s+)?(?:fahrer|beifahrer)t(?:ü|ue)r\s+(?:(?:ist|sind)\s+)?(?:undicht|kaputt|defekt|rissig|l(?:ö|oe)st\s+sich|h(?:ä|ae)ngt\s+raus|lose)${__T[0]}${__RX[17]}|${__T[1]}wasser\s+(?:steht\s+)?(?:im|in\s+der)\s+(?:fahrerhaus|f(?:ü|ue)hrerhaus|schlafkabine|kabine|fu(?:ß|ss)raum)${__T[0]}|${__T[1]}wasser\s+${__T[8]}(?:l(?:ä|ae|a)uft|tropft|kommt|steht|dringt|sammelt\s+sich|l(?:ä|ae|a)uft\s+rein)\s+${__T[9]}(?:ins|in\s+(?:das|die|den)|im|in\s+der|unter\s+(?:dem|den))\s+(?:fahrerhaus|f(?:ü|ue)hrerhaus|kabine|fu(?:ß|ss)raum|lkw)${__T[0]}|${__T[1]}(?:fahrerhaus|f(?:ü|ue)hrerhaus|schlafkabine|kabine|dachluke|dachfenster|schiebedach|dachl(?:ü|ue)fter|dachhaube|hochdach|fahrerhausdach|kabinendach)${__T[0]}\s+(?:(?:ist|sind|wird|seit|heute|gestern|bei|regen|wieder|stark|komplett|leicht|oben|vorne|hinten|links|rechts)[,;]?\s+){0,3}(?:undicht|leckt|tropft|nass${__T[0]})|${__T[1]}(?:es\s+)?regnet\s+(?:es\s+)?${__T[8]}(?:rein|herein|durch${__T[0]}|ins\s+(?:fahrerhaus|f(?:ü|ue)hrerhaus)|in\s+die\s+kabine)${__T[0]}|${__T[1]}(?:fu(?:ß|ss)raum|fu(?:ß|ss)matte(?:n)?|teppich|boden\s+im\s+fahrerhaus|matratze|liege|bettzeug)\s+(?:(?:ist|sind|im|in\s+der|fahrerhaus|kabine|schon|wieder|komplett|ganz|st(?:ä|ae)ndig|immer)[,;]?\s+){0,3}(?:nass|feucht|unter\s+wasser|durchn(?:ä|ae)sst|klatschnass)${__T[0]}(?!\s+(?:gereinigt|gewischt|geputzt|gemacht|gesaugt))|${__T[1]}(?:dachluke|dachfenster|schiebedach|dachl(?:ü|ue)fter|dachhaube)\s+(?:(?:ist|l(?:ä|ae|a)sst|sich|geht|schlie(?:ß|ss)t|mehr|nicht|richtig|ganz)\s+){0,4}(?:klemmt|${__T[13]}(?:zu|schlie(?:ß|ss)en|dicht)|kaputt|defekt|gebrochen|gerissen|undicht)${__T[0]}|${__T[1]}schimmel\s+(?:im|in\s+der|am|an\s+der)\s+(?:fahrerhaus|kabine|liege|matratze|decke|dachhimmel)|(?<![a-z])water\s+(?:is\s+)?(?:leaking|leaks|coming|getting|dripping|running|pooling)\s+(?:in(?:to)?|onto)\s+(?:the\s+)?(?:cab|footwell|bunk)${__T[24]}(?:cab|roof\s+hatch|sun\s*roof|roof\s+vent|roof\s+light)\s+(?:is\s+)?(?:leaking|leaks|leaky|letting\s+(?:water|rain)\s+in)${__T[24]}rain\s+(?:is\s+)?(?:getting|coming|leaking)\s+(?:in(?:to)?)\s+(?:the\s+)?cab${__T[24]}(?:wet|soaked|damp)\s+(?:footwell|cab\s+floor|floor\s+mats?|mattress|bunk)${__T[24]}roof\s+hatch\s+(?:won['’]?t\s+close|doesn['’]?t\s+close|stuck|broken)${__T[24]}mou?ld\s+in\s+(?:the\s+)?cab(?![a-z])|${__T[2]}вод\S*\s+${__T[8]}(?:тече|капає|капает|потрапляє|попадает|протікає|протекает|затікає|затекает|стоїть|стоит)\s+${__T[8]}(?:в|у)\s+кабін\S*|${__T[2]}вод\S*\s+${__T[8]}(?:тече|капає|капает|попадает|протекает|затекает|стоит)\s+${__T[8]}в\s+кабин\S*|${__T[2]}(?<!(?:двер|дверц)\S*\s+)(?:кабін\S*|кабин\S*|люк\S*|дах\S*\s+кабіни|крыш\S*\s+кабины)\s+${__T[8]}(?:протікає|протекает|тече${__T[6]}|течет|не\s+закрива|не\s+закрыва)|${__T[2]}(?:протікає|протекает|тече|течет)\s+(?:дах\S*\s+кабін\S*|крыш\S*\s+кабин\S*|люк\S*)|${__T[2]}(?:мокр\S*|сир\S*|вологий|вологі|влажн\S*)\s+(?:килимок|килимки|коврик\S*|підлог\S*|пол${__T[6]}|матрац\S*|матрас\S*)|${__T[2]}(?:пліснява|плесень|цвіль)\s+(?:в|у)\s+кабін\S*|${__T[2]}плесень\s+в\s+кабин\S*|${__RX[7]}${__T[2]}(?:тече|течет|протіка\S*|протека\S*|затіка\S*|затека\S*)${__T[7]}вод\S*\s+(?:в|у)\s+(?:кабін\S*|кабин\S*)${__RX[7]}|${__RX[7]}${__T[5]}water${__T[7]}(?:in|into)\s+(?:the\s+)?(?:cab|cabin|footwell|bunk)(?![a-z])${__RX[7]}|${__RX[7]}${__T[2]}вод\S*${__T[7]}(?:в|у)\s+(?:кабін\S*|кабин\S*)${__RX[7]}|${__T[2]}(?:в|у)\s+(?:кабін\S*|кабин\S*)${__T[7]}(?:тече|теч[её]т|капає|капает|протіка\S*|протека\S*|затіка\S*|затека\S*|мокро|сиро|сыро|калюж\S*|лужа)${__T[6]}${__RX[7]}|${__T[2]}(?:кабін\S*|кабин\S*|люк\S*)${__T[7]}теч[её]т${__T[6]}${__RX[7]}|${__T[5]}(?:rain|water)\s+(?:is\s+|keeps\s+)?(?:getting|coming|leaking|dripping)\s+in\s+(?:through|via|from|around)\s+(?:the\s+)?(?:roof\s+hatch|sun\s*roof|roof\s+vent|roof\s+light|cab\s+roof|door\s+seals?)(?![a-z])${__RX[7]}|${__T[5]}(?:cab\s+)?roof\s+(?:is\s+)?(?:leaking|leaks|leaky|dripping|drips)\s+(?:in(?:to)?|on(?:to)?)\s+(?:the\s+|my\s+)?(?:cab|bunk|bed|seat|footwell|dashboard)(?![a-z])${__RX[7]}|${__T[5]}cab\s+roof\s+(?:is\s+)?(?:leaking|leaks|leaky)(?![a-z])${__RX[7]}|(?<![^.;!?]*(?:laderaum|ladefl(?:ä|ae)che|koffer|plane|aufbau${__T[25]}ae)nger|ladung|ware|container|k(?:ü|ue)hlraum|cargo${__T[45]}${__T[5]}(?:rain\s*)?water\s+(?:is\s+|keeps\s+)?(?:getting|coming|leaking|dripping)\s+in(?![a-z])(?=[^.;!?]*(?:when\s+it\s+rains|in\s+the\s+rain|from\s+above|from\s+the\s+roof))${__RX[30]}${__RX[7]}|(?<![^.;!?]*(?:laderaum|ladefl(?:ä|ae)che|koffer|plane|aufbau${__T[25]}ae)nger|ladung|ware|container|k(?:ü|ue)hlraum|cargo${__T[45]}${__T[1]}(?:(?:regen)?wasser\s+${__T[8]}(?:l(?:ä|ae|a)uft|kommt|tropft|dringt|sickert)|es\s+tropft)\s+(?:(?:bei|beim|von|oben|regen|immer|st(?:ä|ae)ndig|wieder|dauernd|seit|heute|gestern|vorne|hinten|links|rechts|innen)[,;]?\s+){0,3}(?:rein|herein)${__T[0]}${__RX[30]}${__RX[7]}|(?<![^.;!?]*(?:laderaum|ladefl(?:ä|ae)che|koffer|plane|aufbau${__T[25]}ae)nger|ladung|ware|container|k(?:ü|ue)hlraum|cargo${__T[45]}${__T[1]}bei(?:m)?\s+regen\s+(?:(?:immer|st(?:ä|ae)ndig|wieder|dauernd|oben|vorne|hinten)\s+)?(?:kommt|l(?:ä|ae|a)uft|tropft|dringt|sickert)\s+(?:(?:immer|st(?:ä|ae)ndig|wieder|dauernd)\s+)?(?:(?:das\s+)?(?:regen)?wasser|es)\s+(?:(?:immer|st(?:ä|ae)ndig|wieder|dauernd|oben|von\s+oben)\s+)?(?:rein|herein)${__T[0]}${__RX[30]}${__RX[7]}`, 'i', 1);

const TELEM_HINT = lbRx(String.raw`${__T[1]}(?:navi(?:gationsger(?:ä|ae)t|gationssystem|gation|ger(?:ä|ae)t)?|telematik(?:-?(?:box|ger(?:ä|ae)t|einheit|modul))?|ortung(?:sger(?:ä|ae)t|ssystem)?|gps(?:-?(?:ger(?:ä|ae)t|ortung|tracker|empfang|signal))?|tracker|bordtablet|fahrertablet|yellow-?fox(?:-?(?:ger(?:ä|ae)t|box|tablet))?|webfleet(?:-?(?:ger(?:ä|ae)t|box|tablet))?)${__T[0]}\s+(?:(?:ist|im|in|der|die|das|dem|den|lkw|fahrzeug|seit|heute|gestern|schon|wieder|komplett|ganz|st(?:ä|ae)ndig|immer|dauernd|mehr|auch)[,;]?\s+){0,4}(?:defekt|kaputt${__T[27]}ausgefallen|f(?:ä|ae)llt\s+(?:st(?:ä|ae)ndig\s+|immer\s+)?aus|ohne\s+(?:funktion|signal|empfang)|kein(?:e|en)?\s+(?:signal|verbindung|empfang|position|daten)|startet\s+nicht|bleibt\s+schwarz|h(?:ä|ae)ngt\s+sich\s+auf|friert\s+ein|eingefroren|zeigt\s+nichts|sendet\s+nicht|meldet\s+sich\s+nicht|offline|reagiert\s+nicht|geht\s+(?:st(?:ä|ae)ndig\s+|immer\s+)?aus)${__T[0]}(?![,;.]?${__T[7]}(?:repariert|getauscht|ersetzt|erledigt|wieder\s+(?:ok|da|in\s+ordnung)|ok${__T[0]}))|${__T[1]}(?:kein(?:e|en)?|ohne)\s+(?:gps(?:-?(?:signal|empfang))?|ortung|navi|telematik)${__T[0]}(?!${__T[7]}(?:n(?:ö|oe)tig|erforderlich|vorhanden|eingebaut|verbaut))${__T[39]}sat\s*-?nav|navigation(?:\s+(?:system|unit|device))?|gps(?:\s+(?:unit|device|tracker))?|tracker|tracking\s+(?:device|unit|box)|telematics(?:\s+(?:unit|box|device))?|on-?board\s+tablet|driver\s+tablet)\s+(?:(?:is|has|in|the|truck|still|keeps|completely|now|not)\s+){0,3}(?:not\s+working|broken|dead|faulty|offline|frozen|no\s+signal|lost\s+signal|not\s+tracking|not\s+sending|won['’]?t\s+(?:turn\s+on|start|work)|doesn['’]?t\s+work|does\s+not\s+work|keeps\s+(?:crashing|freezing|turning\s+off)|black\s+screen)(?![a-z])(?!${__T[7]}(?:fixed|replaced|ok(?![a-z])))|${__T[2]}(?:навігатор\S*|навигатор\S*|навігаці\S*|навигаци\S*|gps|телематик\S*|трекер\S*|бортов\S*\s+планшет\S*|планшет\S*\s+водія|yellowfox|webfleet)\s+${__T[8]}(?:не\s+працю|не\s+работа|злама[внл]|сломан|поламан|немає\s+сигнал|нема\s+сигнал|нет\s+сигнал|не\s+вмика|не\s+включа|завис|не\s+показу|не\s+показыва|офлайн|не\s+відправля|не\s+отправля)|${__T[2]}${__T[36]})\s+(?:gps|сигналу\s+gps|сигнала\s+gps|навігатор|навигатор)\S*|${__RX[7]}${__T[1]}(?:navi|navigationsger(?:ä|ae)t|navigation|navigationssystem)\s+${__T[8]}spinnt${__T[0]}${__RX[7]}`, 'i', 1);



const OILLEVEL_HINT = lbRx(String.raw`${__T[1]}(?:motor)?(?:ö|oe)l(?:stand|pegel)?${__T[0]}\s+(?:(?:ist|war|liegt|steht|seit|heute|schon|wieder|deutlich|sehr|viel|zu|knapp|unter|am|auf|der|dem|beim|laut|peilstab|display|anzeige|bei|kontrolle)[,;]?\s+){0,4}(?:niedrig|zu\s+(?:niedrig|gering|wenig)|gering|unter\s+(?:min(?:imum)?|der\s+min|dem\s+min)|am\s+min(?:imum)?|auf\s+min(?:imum)?|sinkt|f(?:ä|ae)llt|nachgef(?:ü|ue)llt|nachf(?:ü|ue)llen|nachgekippt|aufgef(?:ü|ue)llt|muss\s+nachgef(?:ü|ue)llt|fehlt)${__T[0]}(?!${__T[7]}(?:beim\s+(?:service|(?:ö|oe)lwechsel)|in\s+ordnung|ok${__T[0]}))|${__T[1]}(?:zu\s+)?wenig\s+(?:motor)?(?:ö|oe)l${__T[0]}|${__T[1]}(?:motor)?(?:ö|oe)lverbrauch\s+(?:ist\s+)?(?:\S+\s+)?(?:hoch|zu\s+hoch|sehr\s+hoch|stark|gestiegen)${__T[0]}|${__T[1]}(?:braucht|verbraucht|frisst|verbrennt)\s+${__T[8]}(?:motor)?(?:ö|oe)l${__T[0]}${__T[39]}engine\s+)?oil\s+level\s+(?:is\s+|was\s+)?(?:\S+\s+)?(?:low|too\s+low|below\s+(?:the\s+)?min(?:imum)?|at\s+(?:the\s+)?min(?:imum)?|dropping)${__T[24]}low\s+(?:engine\s+)?oil(?:\s+level)?(?![a-z])(?!\s+pressure)${__T[39]}topped\s+up|top\s+up|added|refilled)\s+(?:the\s+)?(?:engine\s+)?oil${__T[24]}(?:using|burning|consuming|uses|burns)\s+(?:a\s+lot\s+of\s+|too\s+much\s+|lots\s+of\s+)?(?:engine\s+)?oil(?![a-z])|${__T[2]}рів(?:ень|ня)\s+(?:моторн\S*\s+)?(?:олив|масл)\S*\s+${__T[8]}(?:низьк|нижче|менше|на\s+мінімум|падає|впав|опусти)|${__T[2]}уров(?:ень|ня)\s+(?:моторн\S*\s+)?масл\S*\s+${__T[8]}(?:низк|ниже|меньше|на\s+минимум|падает|упал|опусти)|${__T[2]}мало\s+(?:моторн\S*\s+)?(?:олив|масл)\S*|${__T[2]}(?:долив\S*|долил\S*)\s+${__T[8]}(?:олив|масл)\S*|${__T[2]}(?:жере|жрет|їсть|ест|берет|бере)\s+(?:олив|масл)\S*|${__T[2]}(?:олив|масл)\S*\s+(?:жере|жрет|їсть)${__T[6]}|${__RX[7]}${__T[2]}(?:низьк\S*|низк\S*)\s+рів(?:ень|ня)\s+(?:моторн\S*\s+)?масла|${__T[2]}низк\S*\s+уров\S*\s+(?:моторн\S*\s+)?масла|${__T[2]}(?:рівень|уровень)\s+(?:моторн\S*\s+)?масла${__T[7]}(?:низьк\S*|низк\S*|мало)${__RX[7]}|${__T[2]}(?:(?:масл|олив)\S*\s+(?:уходит|йде|іде|пропал\S*|пропада\S*|зника\S*|зникл\S*)(?!\s+(?:з|із|зі|из|с|со|по|під|под)${__T[6]})|(?:масл|олив)\S*\s+(?:ниже|нижче|на)\s+(?:мин|мін)|не\s+(?:хватает|вистачає)\s+(?:моторн\S*\s+)?(?:масл|олив)|(?:большой|великий|высокий|високий)\s+(?:расход|розхід|витрат\S*)\s+(?:масл|олив)|(?:расход|розхід|витрат\S*)\s+(?:масл|олив)\S*${__T[7]}(?:большой|велик\S*|вырос|зріс|высок\S*|висок\S*))${__RX[7]}`, 'i', 1);








const PARKBRAKE_HINT = lbRx(String.raw`${__T[1]}(?:lkw|fahrzeug${__T[25]}ae)nger|zug|sattelzug|wagen|laster)\s+h(?:ä|ae)lt${__T[7]}${__T[13]}(?:am|an\s+der|auf\s+der|im|in\s+der)\s+(?:berg|steigung|gef(?:ä|ae)lle|hang|rampe|auffahrt)${__T[0]}${__RX[31]}|${__T[5]}(?:truck|lorry|artic|wagon|trailer|unit|tractor)\s+${__T[38]}\s+not|will\s+not|isn['’]?t|is\s+not)\s+hold(?:ing)?${__T[7]}(?:on|at)\s+(?:a\s+|the\s+)?(?:hill|slope|incline|ramp|gradient)(?![a-z])${__RX[31]}|${__T[4]}(?:тягач|вантажівк\S*|машин\S*|фур[аи]|причіп|причеп\S*|напівпричіп|прицеп\S*)\s+не\s+(?:трима\S*|утриму\S*|держит\S*|держ\S*|удержива\S*)${__T[7]}(?:на|в)\s+(?:підйом\S*|горі|гору|схил\S*|ухил\S*|подъем\S*|горке|уклон\S*|пандус\S*)${__RX[31]}|${__T[1]}(?:(?:auflieger|anh(?:ä|ae|a)nger|trailer)-?)?(?:feststell|hand|park|halte|federspeicher${__T[25]}ae|a)nger)[\s-]?bremse(?:n)?${__T[0]}\s+${__T[9]}(?:h(?:ä|ae|a)lt\S*\s+${__T[9]}nicht${__T[0]}(?!\s+(?:mehr\s+)?(?:auf|fest))|h(?:ä|ae|a)lt\S*\s+${__T[8]}nicht\s+mehr${__T[0]}(?!\s+(?:auf|fest))|greift${__T[7]}nicht|zieht${__T[7]}nicht(?:\s+an)?${__T[0]}|l(?:ä|ae|a)(?:ss|ß)t\s+sich${__T[7]}${__T[13]}(?:einlegen|anziehen|ziehen|aktivieren|bet(?:ä|ae)tigen))|${__T[1]}(?:lkw|fahrzeug${__T[25]}ae|a)nger|zugmaschine|sattelzug|sattelauflieger|wagen|auto|truck|er)${__T[44]}(?:rollt|rollte|rollen|rollten|ist|sind|war|waren)\s+${__T[9]}(?:weg|los|davon)${__T[0]}|weggerollt|losgerollt|davongerollt|ins\s+rollen\s+gekommen)|${__T[1]}(?:rollt|rollte|rollen|rollten|weggerollt|losgerollt)\s+${__T[9]}trotz${__T[7]}(?:feststell|hand|park)[\s-]?bremse${__T[39]}parking|park|hand|spring|trailer)[\s-]?brakes?\s+${__T[9]}(?:(?:won|doesn|does\s+not|did\s+not|didn|isn|is\s+not|not|no\s+longer|wont|doesnt|isnt)['’]?t?${__T[7]}hold(?:ing)?|not\s+holding|fails?\s+to\s+hold|won['’]?t\s+(?:engage|apply))${__T[39]}truck|lorry|vehicle|trailer|rig|tractor|it)\s+${__T[9]}(?:rolled|rolls|rolling|started\s+rolling|started\s+to\s+roll)\s+${__T[8]}away|(?:(?:стоянков|ручн)\S*\s+(?:гальм|тормоз)\S*\s+${__T[8]}не\s+(?:трима|держ)|ручник\S*\s+${__T[8]}не\s+(?:трима|держ|спрацьову|срабатыва))${__RX[11]}|${__T[4]}(?:авто|машин|вантажівк|фур|причіп|причеп|напівпричіп|полуприцеп|тягач|грузовик)\S*\s+${__T[9]}(?:відкоти|откати|покоти|покати|скоти)\S*|${__T[2]}(?:авто|машин|вантажівк|фур|причіп|причеп|напівпричіп|полуприцеп|прицеп|тягач|грузовик)\S*\s+${__T[8]}(?<!не\s)(?:катится|котиться|покатил\S*|покотил\S*|скатыва\S*|скочу\S*|ползет|повзе)${__T[7]}(?:на|з|с|при)\s+(?:ручник\S*|ручном\S*|ручн\S*\s+(?:гальм|тормоз)\S*|стоянков\S*\s+(?:гальм|тормоз)\S*)${__T[10]}eingestellt${__T[23]}adjusted|відремонт|полагод|отремонт|почини|замени|замінил))`, 'i');




const PEDAL_HINT = lbRx(String.raw`${__T[1]}(?:gas|fahr)pedal(?:s|e)?${__T[0]}${__RX[32]}\s+${__T[9]}(?:klemmt|hakt|h(?:ä|ae|a)ngt|bleibt${__T[7]}(?:h(?:ä|ae|a)ngen|unten|stecken)|kommt${__T[7]}${__T[13]}(?:zur(?:ü|ue)ck|hoch|raus)|geht${__T[7]}${__T[13]}(?:zur(?:ü|ue)ck|hoch)|federt${__T[7]}${__T[13]}zur(?:ü|ue)ck|locker|lose|wackelt|abgebrochen|gebrochen|kaputt|defekt|reagiert${__T[7]}nicht|ohne\s+funktion|funktioniert${__T[7]}nicht|ohne\s+wirkung|spinnt|schwerg(?:ä|ae|a)ngig|geht\s+schwer)${__T[0]}|${__T[1]}pedal(?:e)?${__T[0]}${__RX[32]}\s+${__T[8]}(?:klemmt|hakt|h(?:ä|ae|a)ngt|bleibt${__T[7]}(?:h(?:ä|ae|a)ngen|stecken)|kommt${__T[7]}${__T[13]}zur(?:ü|ue)ck|locker|lose|wackelt|abgebrochen)${__T[0]}|${__T[1]}gas${__T[0]}\s+(?:h(?:ä|ae|a)ngt|klemmt|bleibt${__T[7]}(?:h(?:ä|ae|a)ngen|stehen))${__T[0]}${__RX[32]}|${__T[1]}(?:fu(?:ß|ss)matte|gummimatte|matte)(?:n)?${__T[0]}${__RX[32]}${__T[44]}unter|hinter|an|am|vor|(?:ü|ue)ber)${__T[7]}(?:gas|brems|kupplungs|fahr)?pedal\S*|${__T[1]}(?:fu(?:ß|ss)matte|gummimatte)(?:n)?${__T[0]}${__RX[32]}\s+${__T[9]}(?:klemmt|blockiert|verrutscht|rutscht)${__T[0]}|${__T[1]}(?:beschleunigt|gibt\s+gas)${__T[7]}(?:von\s+selbst|von\s+allein\S*|allein\S*|selbstst(?:ä|ae|a)ndig|ungewollt|ohne\s+(?:mein\s+)?zutun)${__T[0]}|${__T[1]}(?:geht|ging|kommt|kam)${__T[7]}${__T[13]}vom\s+gas${__T[0]}|${__T[1]}drehzahl\s+${__T[8]}(?:bleibt${__T[7]}(?:hoch|oben)|geht${__T[7]}${__T[13]}(?:runter|herunter|zur(?:ü|ue)ck)|f(?:ä|ae|a)llt${__T[7]}nicht)${__T[0]}${__RX[32]}|${__T[5]}(?:accelerator|gas|throttle)(?:\s+pedal)?${__T[41]}))\s+${__T[8]}(?:stuck|sticking|sticks|jammed|loose|broken|not\s+returning|doesn['’]?t\s+(?:come\s+back|return)|won['’]?t\s+(?:come\s+back|return)|unresponsive|not\s+responding)(?![a-z])|${__T[5]}(?:floor\s+)?mats?\s+${__T[9]}(?:under|behind|jammed\s+(?:under|behind)|stuck\s+(?:under|behind))\s+(?:the\s+)?(?:accelerator|gas|brake|clutch)?\s*pedals?(?![a-z])|${__T[5]}(?:accelerat\S*|speed(?:s|ing)?\s+up)${__T[7]}(?:by\s+itself|on\s+its\s+own)(?![a-z])|${__T[5]}revs?\s+${__T[8]}(?:stay\S*\s+high|won['’]?t\s+(?:drop|come\s+down)|not\s+dropping)(?![a-z])|${__T[2]}педал\S*\s+(?:газу|газа|акселератор\S*)\s+${__T[8]}(?:заїда\S*|заеда\S*|залипа\S*|застря\S*|не\s+поверта\S*|не\s+возвраща\S*${__T[28]}бовта\S*|болта\S*|${__T[43]})${__RX[33]}|${__T[2]}(?:килимок|килимк\S*|коврик\S*)\s+${__T[9]}(?:під|за|под)${__T[7]}педал\S*${__RX[33]}|${__T[2]}(?:розганя\S*|разгоня\S*)${__T[7]}(?:сам\S*)`, 'i', 1);
const PARKBRAKE_SPANS = new RegExp(PARKBRAKE_HINT.source, 'gi');
const noParkbrake = (s) => String(s || '').replace(PARKBRAKE_SPANS, ' ');
const noLampBurn = (s) => String(s || '').replace(/((?:leuchte|lampe|licht)\S*)\s+(?:(?:vom|von|am|an|beim|des|der|dem|im)\s+)?(?:anh(?:ä|ae)nger|h(?:ä|ae)nger|auflieger|lkw|fahrzeug)\s+brennt/gi, '$1 leuchtet');




const PEST_HINT = lbRx(String.raw`${__T[1]}(?<!(?:keine|kein|keinerlei|ohne)\s+)(?:m(?:ä|ae)use|ratten|ratte|ungeziefer|kakerlaken|wanzen)${__T[7]}im\s+(?:lkw|fahrzeug${__T[25]}ae)nger)${__T[0]}|${__T[1]}(?:bettwanze(?:n)?|bettwanzenbefall|bettwanzenbisse)${__T[0]}|${__T[1]}(?<!(?:keine|kein|keinerlei|ohne|no)\s+)(?:m(?:ä|ae)use(?:kot|dreck|köttel|koettel)?|maus(?:kot|dreck)|mausk(?:ö|oe)ttel|ratten(?:kot)?|ratte|ungeziefer|ungezieferbefall|wanzen|kakerlake(?:n)?|schaben|ameisen|fl(?:ö|oe)he|milben|maden|insekten|fliegen|wespen|wespennest)${__T[0]}${__T[44]}im|in\s+(?:der|dem|die|den|meiner|meinem)|unter\s+(?:der|dem)|hinter\s+(?:der|dem)|auf\s+(?:der|dem))${__T[7]}(?:fahrerhaus\S*|f(?:ü|ue)hrerhaus\S*|kabine|fahrerkabine|schlafkabine|koje|liege|bett|matratze|bettzeug|schlafsack|staufach|staufächern|staufaechern|k(?:ü|ue)hlbox|k(?:ü|ue)hlschrank)${__T[0]}|${__T[1]}(?:fahrerhaus|f(?:ü|ue)hrerhaus|kabine|fahrerkabine|schlafkabine|koje|liege|matratze|bettzeug)${__T[0]}\s+(?:\S+\s+){0,4}?(?<!(?:keine|kein|keinerlei|ohne|no)\s+)(?:m(?:ä|ae)use(?:kot)?|mausk(?:ö|oe)ttel|ratten|ungeziefer|wanzen|kakerlaken|schaben|ameisen|fl(?:ö|oe)he|milben|maden)${__T[0]}|${__T[5]}(?:bed\s?bugs?|mouse\s+droppings|rat\s+droppings)(?![a-z])|${__T[5]}(?<!(?:keine|kein|keinerlei|ohne|no)\s+)(?:mice|mouse|rats?|cockroach(?:es)?|roaches|vermin|pests|ants|fleas|mites|maggots|insects|wasps?)\s+${__T[9]}in\s+(?:the\s+|my\s+)?(?:cab|cabin|bunk|sleeper(?:\s+cab)?|bed|mattress|bedding|storage\s+box(?:es)?|fridge)(?![a-z])|${__T[4]}(?:клоп\S*|блох\S*)|${__T[4]}(?:миш\S*|мыш\S*|щур\S*|пацюк\S*|крыс\S*|тарган\S*|таракан\S*|мурах\S*|муравь\S*|кліщ\S*|комах\S*|насеком\S*|паразит\S*)\s+${__T[9]}(?:в|у|на|під|под)${__T[7]}(?:кабін\S*|кабин\S*|ліжк\S*|койк\S*|спальн\S*|матрац\S*|матрас\S*)`, 'i', 1);



const NEST_HINT = lbRx(String.raw`${__T[1]}(?<!(?:kein|keine|keinerlei|ohne)\s+)(?:wespen|hornissen|bienen)[-]?(?:nest|nester|schwarm|volk)${__T[0]}${__RX[34]}|${__T[1]}(?<!(?:kein|keine|keinerlei|ohne)\s+)nest\s+(?:von\s+|mit\s+)?(?:wespen|hornissen|bienen)${__T[0]}${__RX[34]}|${__T[1]}(?<!(?:kein|keine|keinerlei|ohne)\s+)(?:wespe|wespen|hornisse|hornissen|biene|bienen)${__T[0]}${__RX[34]}${__T[44]}am|im|an\s+(?:der|dem|den)|in\s+(?:der|dem|den)|unter\s+(?:der|dem|den)|hinter\s+(?:der|dem|den)|auf\s+(?:der|dem)|aus\s+(?:der|dem|den))${__T[7]}(?:(?:au(?:ß|ss)en|seiten|rampen|weitwinkel|front)?spiegel|spiegelgeh(?:ä|ae|a)use|aufbau|kofferaufbau|koffer|plane|stoßstange|sto(?:ß|ss)f(?:ä|ae|a)nger|k(?:ü|ue)hlergrill|grill|radkasten|kotfl(?:ü|ue)gel|staukasten|staufach|werkzeugkasten|batteriekasten|tankdeckel|tank|t(?:ü|ue)r|t(?:ü|ue)rrahmen|anh(?:ä|ae|a)nger|auflieger|dach|spoiler|windabweiser|rahmen|fahrerhaus|f(?:ü|ue)hrerhaus|kabine|fahrerkabine|lkw|fahrzeug|zugmaschine|trittstufe|einstieg|l(?:ü|ue)ftung|l(?:ü|ue)ftungsgitter|kabinendach)(?:s|es|n|en)?${__T[0]}|${__T[1]}(?:wespe|wespen|hornisse|hornissen|biene|bienen)${__T[0]}\s+${__T[9]}gestochen${__T[0]}|${__T[1]}gestochen\s+${__T[9]}(?:wespe|wespen|hornisse|hornissen|biene|bienen)(?:n)?${__T[0]}|${__T[5]}(?<!no\s+)(?:wasp|wasps|hornet|hornets|bee|bees)(?:['’]s?)?\s+(?:nest|nests|swarm|hive)(?![a-z])${__RX[34]}|${__T[5]}(?:nest|swarm)\s+of\s+(?:wasps|hornets|bees)(?![a-z])${__RX[34]}|${__T[5]}(?<!no\s+)(?:wasps?|hornets?|bees)(?![a-z])${__RX[34]}\s+${__T[9]}(?:in|on|under|behind|inside|around|from)\s+(?:the\s+|my\s+)?(?:(?:side|wing|door)\s+)?(?:mirrors?|cab|cabin|trailer|body|tarp|bumper|grille|toolbox|tool\s+box|fuel\s+cap|tank|door|roof|vent|truck|vehicle)(?![a-z])|${__T[5]}stung\s+${__T[8]}by\s+(?:a\s+)?(?:wasps?|hornets?|bees?)(?![a-z])|${__T[2]}(?:гнізд|гнезд)\S*${__T[7]}(?:ос|шершн\S*|бджіл|бджол\S*|пчел\S*)${__T[6]}${__RX[34]}|${__T[2]}(?:осин|шершнев|бджолин|пчелин)\S*\s+(?:гнізд|гнезд|рі|ро)\S*|${__T[2]}(?:рій|рой)\s+(?:бджіл|бджол\S*|пчел\S*|ос|шершн\S*)${__T[6]}|${__T[2]}(?:оса|оси(?=\s+(?:в|у)\s)|шершн\S*|бджол\S*|бджіл|пчел\S*)\s+${__T[9]}(?:в|у|на|під|под|за|із|з|из)${__T[7]}(?:дзеркал\S*|зеркал\S*|кабін\S*|кабин\S*|причеп\S*|прицеп\S*|кузов\S*|бампер\S*|ящик\S*|тент\S*|двер\S*)|${__T[2]}(?:вжалил\S*|ужалил\S*|вкусил\S*|покусал\S*)\s+${__T[8]}(?:оса|оси|шершн\S*|бджол\S*|пчел\S*)`, 'i', 1);




const ENGNEST_HINT = lbRx(String.raw`${__T[1]}(?<!(?:kein|keine|ohne)\s+)(?:(?:vogel|v(?:ö|oe)gel|m(?:ä|ae)use|maus|ratten|tauben)-?)?nest(?:er)?\s+${__T[9]}(?:im|in\s+der|unterm|unter\s+der|unter\s+dem|am|an\s+der|auf\s+dem|hinter\s+dem|beim)${__T[7]}(?:motor(?:raum|haube|abdeckung)?|haube|k(?:ü|ue)hler|luftfilter(?:kasten)?|ansaug\S*|batterie(?:kasten)?|auspuff|getriebe)${__T[0]}${__RX[35]}|${__T[1]}(?<!(?:kein|keine|ohne)\s+)(?:m(?:ä|ae)use|maus|ratten?|v(?:ö|oe)gel|vogel|tauben?)\s+${__T[8]}(?:im|unterm|unter\s+der|unter\s+dem|in\s+der)\s+(?:motorraum|motorhaube|haube|luftfilter(?:kasten)?)${__T[0]}${__RX[35]}|${__T[1]}(?:v(?:ö|oe)gel|vogel|tauben?)\s+${__T[8]}nisten\s+${__T[8]}(?:motor(?:raum|haube|abdeckung)?|haube|k(?:ü|ue)hler|luftfilter(?:kasten)?|ansaug\S*|batterie(?:kasten)?|auspuff|getriebe)${__RX[35]}|${__T[5]}(?<!(?:no|without)\s+)(?:(?:bird['’]?s?|mouse|mice|rats?|rodents?|pigeons?)\s+)?nests?\s+${__T[8]}(?:in|under|on|behind|near)\s+(?:the\s+|my\s+)?(?:engine(?:\s+(?:bay|compartment))?|bonnet|hood|air\s+(?:filter|intake)(?:\s+box)?|radiator|battery\s+box|exhaust)(?![a-z])${__RX[35]}|${__T[5]}(?<!(?:no|without)\s+)(?:mice|mouse|rats?|birds?|pigeons?)\s+${__T[8]}(?:in|under|inside)\s+(?:the\s+)?(?:engine\s+(?:bay|compartment)|bonnet|hood|air\s+(?:filter|intake))(?![a-z])${__RX[35]}|${__T[4]}(?<!(?:ос|шерш|бдж|пчел)\S*\s+)(?:(?:пташин|пташи|птичь|птич|мишач|мышин|мишин)\S*\s+)?(?:гнізд\S*|гнезд\S*)${__T[7]}(?:під|в|у|под|на|біля|возле)${__T[7]}(?:капот\S*|двигун\S*|двигат\S*|мотор\S*|моторн\S*\s+(?:відсік|отсек)\S*|радіатор\S*|радиатор\S*|повітрян\S*\s+фільтр\S*|воздушн\S*\s+фильтр\S*|акумулятор\S*|аккумулятор\S*)${__RX[35]}|${__T[4]}(?:миш\S*|мыш\S*|пацюк\S*|щур\S*|крыс\S*|птах\S*|птиц\S*|голуб\S*)${__T[7]}(?:під|в|у|под)\s+(?:капот\S*|моторн\S*\s+(?:відсік|отсек)\S*|повітрян\S*\s+фільтр\S*|воздушн\S*\s+фильтр\S*)${__RX[35]}`, 'i', 1);

const NEST_WORDS = lbRx(String.raw`${__T[1]}(?:wespe|wespen|wespennest|hornisse|hornissen|hornissennest)${__T[0]}|${__T[5]}(?:wasps?)(?![a-z])`, 'gi');
const CONTOUR_HINT = lbRx(String.raw`${__T[1]}(?:kontur(?:markierung|markierungsstreifen|streifen|folie)(?:en)?|warnmarkierung(?:en)?|reflex(?:streifen|folie|folien)|reflektor(?:streifen|folie|folien|en)?|r(?:ü|ue|u)ckstrahler(?:n|s)?|seitenr(?:ü|ue|u)ckstrahler(?:n|s)?|katzenaugen?|(?:park-?)?warntafel(?:n)?|heckmarkierung(?:en|stafel|stafeln)?|markierungstafel(?:n)?)${__T[0]}\s+(?:(?:sind|ist|wurde|wurden|am|an|auf|der|die|das|dem|den|hinten|seitlich|links|rechts|heck|seite|lkw${__T[25]}ae)nger|zugmaschine|komplett|teilweise|stark|total|ganz|schon|seit|heute|gestern|halb|mehrere|einige|alle|zwei|beide|wieder|fast|sehr)[,;]?\s+){0,3}(?:fehl(?:t|en)|weg${__T[0]}|abgerissen|abgefallen|abgel(?:ö|oe)st|l(?:ö|oe)s(?:t|en)\s+sich|lose${__T[0]}|locker${__T[0]}|h(?:ä|ae)ng(?:t|en)\s+(?:herunter|runter|lose|ab|schief)|besch(?:ä|ae|a)digt|kaputt|defekt|zerbrochen|gebrochen|verbogen|eingerissen|zerkratzt|verschmutzt|verdreckt|dreckig|verblasst|abgeschabt|abgefahren|flatter(?:t|n)|${__T[13]}(?:zu\s+sehen|erkennbar|sichtbar|vorhanden|da${__T[0]}))${__T[0]}(?![,;.]?${__T[7]}(?:wieder\s+(?:da|dran|fest|angebracht)|ersetzt|erneuert|repariert|geklebt|angebracht|gereinigt|sauber|befestigt|getauscht|erledigt|ok${__T[0]}|in\s+ordnung|nachbestellt|bestellt))|${__T[1]}(?:fehlende[nmrs]?|abgerissene[nmrs]?|abgefallene[nmrs]?|besch(?:ä|ae|a)digte[nmrs]?|kaputte[nmrs]?|lose[nmrs]?|verschmutzte[nmrs]?|verdreckte[nmrs]?|keine|kein)${__T[7]}(?:kontur(?:markierung|markierungsstreifen|streifen|folie)(?:en)?|warnmarkierung(?:en)?|reflex(?:streifen|folie|folien)|reflektor(?:streifen|folie|folien|en)?|r(?:ü|ue|u)ckstrahler(?:n|s)?|seitenr(?:ü|ue|u)ckstrahler(?:n|s)?|katzenaugen?|(?:park-?)?warntafel(?:n)?|heckmarkierung(?:en|stafel|stafeln)?|markierungstafel(?:n)?)${__T[0]}(?!${__T[7]}(?:n(?:ö|oe)tig|erforderlich|vorgeschrieben|angebracht|bestellt|ersetzt|erneuert))|(?<![a-z])(?<!(?:headlight|headlamp|lamp|light)\s)(?:conspicuity\s+(?:tape|markings?|strips?)|reflective\s+(?:tape|strips?|markings?)|reflector\s+(?:tape|strips?)|reflectors?|rear\s+marker\s+(?:boards?|plates?)|marker\s+boards?|warning\s+(?:boards?|plates?))\s+(?:(?:is|are|on|the|rear|side|left|right|trailer|truck|partly|completely|badly|half|all|some|now)\s+){0,3}(?:missing|gone|torn\s+off|ripped\s+off|came\s+off|fell\s+off|peeling|coming\s+off|loose|hanging\s+(?:off|down)|damaged|broken|cracked|dirty|faded|not\s+visible)(?![a-z])(?!${__T[7]}(?:replaced|fixed|repaired|cleaned|ok(?![a-z])))${__T[39]}missing|damaged|broken|torn|dirty|faded|no)\s+(?:(?!headlight|headlamp|lamp|light)[a-z]+\s+)?(?:conspicuity\s+(?:tape|markings?|strips?)|reflective\s+(?:tape|strips?|markings?)|reflector\s+(?:tape|strips?)|reflectors?|rear\s+marker\s+(?:boards?|plates?)|marker\s+boards?|warning\s+(?:boards?|plates?))(?![a-z])|${__T[2]}(?:світловідбивн|светоотражающ|световозвращающ|катафот|світлоповертач|контурн\S*\s+(?:маркуван|маркировк))(?!\S*\s+(?:жилет|желет))\S*\s+${__T[9]}(?:немає|нема${__T[6]}|нет${__T[6]}|відсутн|отсутств|відірван|відірвал|оторван|оторвал|відклеї|відклеє|отклеи|отклее|відпа|отпа|пошкоджен|поврежден|злама[внл]|сломан|брудн|грязн|не\s+видно|звиса|теліпа)${__RX[36]}|${__T[2]}${__T[36]}|бракує|відсутн\S*|відірван\S*|оторван\S*|пошкоджен\S*|поврежден\S*|брудн\S*|грязн\S*)${__T[7]}(?:світловідбивн|светоотражающ|световозвращающ|катафот|світлоповертач|контурн\S*\s+(?:маркуван|маркировк))(?!\S*\s+(?:жилет|желет))\S*${__RX[36]}`, 'i', 1);




const MIRROR_HINT = lbRx(String.raw`${__T[2]}(?:розбит\S*|разбит\S*|зламан\S*|сломан\S*|відірван\S*|оторван\S*|тріснут\S*|треснут\S*)${__T[7]}(?:дзеркал\S*|зеркал\S*)${__T[10]}fixed|repaired|replaced${__T[12]}замінив\S*|поміняли\S*|полагодил\S*${__T[29]}поменяли\S*|починил\S*))|${__T[5]}(?:wing\s+|side\s+)?mirrors?\s+${__T[38]}\s+not|will\s+not)\s+fold\s+(?:out|in|back)(?![a-z])${__RX[37]}|${__T[2]}(?:дзеркал\S*|зеркал\S*)${__T[7]}не\s+(?:складається|розкладається|складывается|раскладывается)${__RX[37]}|${__T[1]}(?:au(?:ß|ss)en|haupt|weitwinkel|rampen|fahrer|beifahrer|r(?:ü|ue)ck)?spiegel(?:s)?${__T[0]}\s+${__T[8]}(?:klappt|klappen|f(?:ä|ae)hrt|fahren)${__T[7]}${__T[13]}(?:richtig\s+)?(?:aus|ein|an|zur(?:ü|ue)ck)(?:klappen|fahren)?${__T[0]}${__RX[17]}|${__T[1]}spiegelgl(?:a|ä)s(?:er)?\s+(?:(?:ist|sind|einfach|komplett|links|rechts)\s+){0,2}(?:raus(?:gefallen|gesprungen|geflogen)?|herausgefallen|lose|locker|weg|abgefallen)${__T[0]}${__RX[17]}|${__T[2]}(?:дзеркал\S*|зеркал\S*)${__T[7]}(?:збили|збив|збила|сбили|сбил|відбили|отбили|зламали|сломали)${__T[6]}${__RX[0]}|${__T[3]}(?:außen|aussen|haupt|weitwinkel|rampen|front|seiten|bordstein|anfahr|r(?:ü|ue|u)ck)?spiegel(?:glas|halter|arm|kopf|gehäuse)?\s+${__T[9]}(?:abgefahren|abgerissen|abgebrochen|abgeknickt|ab${__T[0]}|kaputt|defekt|gebrochen|zerbrochen|eingeschlagen|zerschlagen|gesprungen|gerissen|besch(?:ä|ae|a)digt|fehlt|weg${__T[0]}|lose|locker|h(?:ä|ae|a)ngt|wackelt|verstellt\S*|l(?:ä|ae|a)(?:ss|ß)t\s+sich\s+nicht)|(?:abgefahren|abgerissen|abgebrochen|kaputt|zerbrochen|gesprungen|besch(?:ä|ae|a)digt)e[nmrs]?${__T[7]}(?:außen|aussen|haupt|weitwinkel|rampen|front|seiten)?spiegel|spiegel\s+${__T[9]}(?:touchiert|gestreift|angefahren|mitgenommen)${__T[39]}(?:wing|side|door|wide[- ]angle|kerb|curb|front|main|class\s+(?:ii|iv|v|vi))\s+)?mirrors?\s+${__T[9]}(?:broken|broke|smashed|cracked|knocked\s+off|ripped\s+off|torn\s+off|snapped|missing|hanging|loose|damaged|gone|bent|won['’]?t\s+adjust)|(?:broken|smashed|cracked|damaged|missing|bent)${__T[7]}mirrors?|(?:hit|clipped|knocked|caught)\s+${__T[8]}mirrors?|${__T[4]}дзеркал\S*\s+${__T[9]}(?:збит|злама[внл]|злама[вл]|розбит|відірв|тріснул|тріснуло|пошкод|нема|відпал|бовта|теліпа|не\s+регулю)|${__T[4]}зеркал\S*\s+${__T[9]}(?:сбит|сломан|сломал|разбит|оторв|треснул|поврежд|нет(?![а-яіїєґ])|отвал|болта|не\s+регулир)|(?:збив|збили|зламав|розбив|відірвав|зачепив|сбил|сломал|разбил|оторвал|зацепил)\S*${__T[7]}(?:дзеркал|зеркал)|${__RX[7]}${__T[1]}spiegelverstellung\s+${__T[8]}(?:geht\s+nicht|funktioniert\s+nicht|defekt|kaputt|ausgefallen)${__RX[7]}|${__RX[7]}${__T[5]}(?:(?:can['’]?t|cannot|can\s+not|unable\s+to)\s+adjust\s+(?:the\s+|my\s+)?(?:(?:wing|side|door|left|right|passenger|driver['’]?s?)\s+)?mirrors?|(?:(?:wing|side|door)\s+)?mirrors?\s+(?:can['’]?t|cannot|can\s+not)\s+be\s+adjusted)(?![a-z])|${__RX[7]}${__T[5]}mirror\s+adjust(?:ment|er)?\s+${__T[8]}(?:not\s+working|doesn['’]?t\s+work|broken|faulty)${__RX[7]}|${__RX[8]}${__T[2]}(?:дзеркал\S*|зеркал\S*)${__T[7]}(?:хитає\S*|хитаєт\S*|теліпа\S*|болта\S*|шата\S*)${__RX[8]}|(?:${__T[5]}mirror\s+glass${__T[7]}(?:fell\s+out|fallen\s+out|came\s+out|popped\s+out|missing|loose)|${__T[2]}скло${__T[7]}дзеркал\S*${__T[7]}(?:випал\S*|відпал\S*|немає|нема|відсутн\S*|тріснул\S*|розбил\S*)|${__T[2]}стекло${__T[7]}зеркал\S*${__T[7]}(?:выпал\S*|отпал\S*|нет|отсутству\S*|треснул\S*|разбил\S*))${__RX[11]}|${__T[2]}(?:відірвало|відірвав\S*|відірвали|зірвало|зірвали|сорвало|сорвали|оторвало|оторвали)${__T[7]}(?:дзеркал\S*|зеркал\S*)${__RX[38]}|${__T[2]}(?:дзеркал\S*|зеркал\S*)${__T[7]}(?:відвалил\S*|відпал\S*|отвалил\S*|отпал\S*|відірвал\S*|оторвал\S*|висить|висит|звисає|звисает)${__T[6]}${__RX[38]}`, 'i', 1);



const MIRROR2_HINT = lbRx(String.raw`(?:${__T[1]}(?:au(?:ß${__T[35]}seiten)?spiegel(?:s)?${__T[0]}\s+${__T[8]}(?:elektrisch\s+)?(?:verstellen|einstellen|verstellung)\s+(?:geht|funktioniert|klappt)\s+nicht|${__T[1]}(?:au(?:ß${__T[35]}seiten)?spiegel(?:s)?${__T[0]}\s+${__T[8]}kann\s+man${__T[7]}${__T[13]}(?:verstellen|einstellen)|${__T[1]}(?:au(?:ß${__T[35]}seiten)?spiegel(?:s)?${__T[0]}\s+(?:(?:links|rechts)\s+)?klappt\s+(?:(?:immer(?:\s+wieder)?|st(?:ä|ae)ndig|dauernd|andauernd|einfach|pl(?:ö|oe)tzlich|w(?:ä|ae)hrend\s+der\s+fahrt|beim\s+fahren|von\s+allein\S*|von\s+selbst|selbst(?:st(?:ä|ae)ndig)?)\s+){1,3}ein${__T[0]}|${__T[1]}(?:au(?:ß${__T[35]}seiten)?spiegel(?:s)?${__T[0]}${__T[44]}ist|steht|sitzt|h(?:ä|ae|e)ngt)${__T[7]}(?:schief|verbogen|verdreht|krumm|weggedreht)${__T[0]}|${__T[1]}(?:au(?:ß${__T[35]}seiten)?spiegel(?:s)?${__T[0]}\s+(?:(?:links|rechts|auch|nur\s+noch)\s+)?h(?:ä|ae|e)ngt${__T[0]}|${__T[1]}(?:au(?:ß${__T[35]}seiten)?spiegel(?:s)?${__T[0]}\s+${__T[8]}h(?:ä|ae)lt\s+nicht\s+(?:mehr|richtig)|${__T[1]}(?:au(?:ß${__T[35]}seiten)?spiegel(?:s)?${__T[0]}\s+${__T[8]}(?:zittert|vibriert|flattert|schwingt)${__T[0]}|${__T[5]}(?:wing\s+|side\s+)?mirrors?\s+(?:is\s+|keeps\s+|are\s+)?(?:shaking|vibrating|wobbling|shakes|vibrates|wobbles|crooked|bent|twisted|sagging|drooping)(?![a-z])|${__T[5]}(?:wing\s+|side\s+)?mirrors?\s+(?:keeps?\s+folding|folds?\s+(?:itself\s+)?in\s+(?:by\s+itself|on\s+its\s+own|while\s+driving))|${__T[2]}(?:дзеркал\S*|зеркал\S*)${__T[7]}(?:трясеться|трясется|вібрує|вибрирует|дрижить|дрожит|криве|кривое|погнут\S*|перекошен\S*)|${__T[2]}(?:дзеркал\S*|зеркал\S*)${__T[7]}(?:складається|складывается)\s+(?:сам\S*|під\s+час\s+руху|во\s+время\s+движения))${__RX[37]}`, 'i', 1);


const MIRROR3_HINT = lbRx(String.raw`(?<!${__T[2]}(?:офис|офіс|туалет|склад[еуі]?${__T[6]}|цех|здани|будівл|душев|ванн|квартир|приложени|програм|додат|телефон|планшет|сайт|браузер)[^.;!?]*)${__RX[39]}${__RX[40]}(?:${__T[2]}(?:дзеркал\S*|зеркал\S*)${__T[7]}(?<!не\s)(?:р[ао]зби[лв]\S*|отлом\S*|відл[ао]м\S*|погнул\S*|в[ыи]рвал\S*|(?:от|від)кол\S*|лопнул\S*|(?:от|від)валил\S*)${__T[6]}|${__T[2]}(?<!не\s)(?:р[ао]зби[лв]\S*|отлом\S*|відл[ао]м\S*|погнул\S*|в[ыи]рвал\S*|снес\S*|знесл\S*|зніс|[сз]бил\S*|задел\S*|зачепи[лв]\S*)${__T[7]}(?:дзеркал\S*|зеркал\S*))`, 'i', 1);



const COUPLING_HINT = lbRx(String.raw`(?:${__T[3]}(?:kann|k(?:ö|oe)nnen|krieg(?:e|en)?|bekomm(?:e|en)?)\s+${__T[9]}${__T[13]}(?:ab|an|auf)(?:kuppeln|satteln)${__T[0]}|${__T[3]}(?:anh(?:ä|ae|a)nger|auflieger|trailer)\s+(?:geht|ging)\s+${__T[13]}(?:ab|los)${__T[0]}|${__T[1]}k(?:ö|oe)nigszapfen\s+${__T[8]}(?:verschlissen|ausgeschlagen|besch(?:ä|ae|a)digt|verbogen|lose|locker|abgenutzt|kaputt|defekt)${__T[0]}|(?<![a-z])king\s?-?pin\s+${__T[8]}(?:worn|damaged|bent|loose|broken)|${__T[2]}(?:шкворн\S*|шкворень|шкворін\S*|шворін\S*|шворн\S*|шворень)${__T[7]}(?:знош\S*|изнош\S*|пошкодж\S*|поврежд\S*|зігнут\S*|погнут\S*|розбит\S*|разбит\S*))${__RX[0]}|${__T[2]}(?:опор[иаы]|опорн\S*\s+(?:стійк|стойк|ноги|ног|пристр|устройств)\S*)\s+(?:(?:напівпричепа|полуприцепа|причепа|прицепа)\s+)?${__T[8]}(?:не\s+(?:крутя|крутит|опуска|підніма|поднима|кручу)|заклин|заїда|заеда|злама[вл]|сломал|погнул)\S*${__RX[7]}|${__T[3]}(?:sattelkupplung|königszapfen|koenigszapfen|zugmaul|zughaken|anhängerkupplung|anhaengerkupplung|kupplungsverriegelung|st(?:ü|ue|u)tzwinde|st(?:ü|ue|u)tzf(?:ü|ue|u)(?:ß|ss)e?|st(?:ü|ue|u)tzbeine?|kurbelst(?:ü|ue|u)tze|st(?:ü|ue|u)tzkurbel|kurbel${__T[0]}|st(?:ü|ue|u)tzen${__T[0]})\S*\s+${__T[9]}(?:rastet\s+nicht|nicht${__T[7]}(?:eingerastet|verriegelt|geschlossen|zu${__T[0]})|verriegelt\s+nicht|schlie(?:ß|ss)t\s+nicht|schlie(?:ß|ss)t\s+schwer|hakt|klemm(?:t|en)|defekt|kaputt|gebrochen|ausgeschlagen|lose${__T[0]}|locker|offen|l(?:ä|ae|a)(?:ss|ß)t\s+sich\s+nicht|lassen\s+sich\s+nicht|abgebrochen|verbogen|geht\s+nicht|gehen\s+nicht)|${__T[3]}(?:auflieger|anhänger|anhaenger|trailer)\s+${__T[9]}(?:l(?:ä|ae|a)(?:ss|ß)t\s+sich\s+nicht${__T[7]}(?:an|ab|auf|ein)?(?:kuppeln|satteln)|nicht\s+(?:richtig\s+|sicher\s+)?(?:angekuppelt|gekuppelt|eingerastet|verriegelt|aufgesattelt)|hat\s+sich\s+${__T[9]}(?:gel(?:ö|oe|o)st|abgekuppelt|losgerissen)|losgerissen|abgesackt)|${__T[3]}(?:an|ab|auf)?(?:kuppeln|satteln)\s+${__T[8]}(?:geht|klappt|funktioniert)\s+nicht${__T[39]}fifth[- ]wheel|king[- ]?pin|coupling\s+(?:jaws?|lock)|landing\s+(?:legs?|gear))\s+${__T[9]}${__T[18]}does\s+not|not\s+(?:locked|closed|closing|engaged)|stuck|jammed|broken|damaged|open|loose|faulty|bent)|(?<![a-z])trailer\s+(?:(?!(?:doors?|curtains?|tarps?|tail\s*lifts?|shutters?)(?![a-z]))\S+\s+){0,3}?${__T[18]}does\s+not|cannot|can['’]?t)${__T[7]}(?:couple|uncouple|hook\s+up|lock)|(?<![a-z])trailer\s+${__T[8]}(?:came|come|has\s+come|became)\s+(?:loose|uncoupled|unhitched|detached|off)|(?:can['’]?t|cannot|could\s+not|couldn['’]?t)${__T[7]}(?:couple|uncouple|hitch|unhitch)${__T[7]}trailer|${__T[4]}(?:(?:сідл[оауі]|седл[оау])(?!\s+(?:водія|водителя))|сідельн\S*\s+(?:пристр|зчіп)\S*|шкворн\S*|шкворень|шкворін\S*|шворін\S*|шворн\S*|шворень|опорн\S*\s+(?:стійк|ног|лап)\S*|седельн\S*\s+(?:устройств|сцеп)\S*|опорн\S*\s+стойк\S*)\s+${__T[9]}(?:не${__T[7]}(?:закрива|зачіпа|фіксу|защіпа|закрыва|цепля|фиксир|защелк|відкрива|відчиня|открыва)|злама[внл]|пошкодж|заклин|відкрит|розбовта|слома|поврежд|открыт|разболта)|${__T[4]}(?:напівпричіп|напівпричеп|причіп|причеп|полуприцеп|прицеп)\S*\s+${__T[9]}(?:не${__T[7]}(?:зчіплю|зчеплю|чіпля|зачіпа|причепи|сцепля|цепля|прицеп)|відчепив|від'єднав|відірвав|отцепил|оторвал)|${__T[4]}(?:опор\S*|стійк\S*)\s+(?:напівпричеп\S*|причеп\S*|полуприцеп\S*)${__T[7]}(?:не\s+опуска\S*|не\s+підніма\S*|не\s+поднима\S*|не\s+крут\S*|заклин\S*|злама\S*|слома\S*)|${__RX[7]}${__T[1]}(?:anh(?:ä|ae)nger|auflieger)\s+(?:hat\s+sich\s+)?${__T[8]}(?:abgekoppelt|losgerissen|gel(?:ö|oe)st|ausgeh(?:ä|ae)ngt)\s+${__T[8]}(?:beim\s+fahren|w(?:ä|ae)hrend\s+der\s+fahrt|in\s+der\s+fahrt|unterwegs|von\s+selbst|selbstst(?:ä|ae)ndig)${__T[0]}${__RX[7]}|${__RX[7]}${__T[1]}(?:anh(?:ä|ae)nger|auflieger)\s+hat\s+sich${__T[7]}(?:abgekoppelt|losgerissen|ausgeh(?:ä|ae)ngt)${__T[0]}${__RX[7]}|(?:${__T[3]}(?:auflieger|anh(?:ä|ae|a)nger|zapfen|k(?:ö|oe)nigszapfen)\S*${__T[7]}(?:rastet|rastete|rasten)${__T[7]}nicht\s+(?:richtig\s+)?ein${__T[0]}|${__T[3]}kupplung\s+(?:vom|am|des|zum|f(?:ü|ue)r\s+den)\s+(?:auflieger|anh(?:ä|ae|a)nger|trailer)\S*\s+${__T[8]}(?:geht${__T[7]}${__T[13]}(?:auf|zu)|schlie(?:ß|ss)t\s+nicht|(?:ö|oe)ffnet\s+nicht|klemmt|h(?:ä|ae)ngt|kaputt|defekt|gebrochen|ausgeschlagen|lose|locker)${__T[0]})${__RX[17]}`, 'i', 1);




const COUPLING2_HINT = lbRx(String.raw`(?:${__T[1]}(?:sattel\s?kup?pl?u?n?g|sattelkupplug|fanghorn|sattelplatte|kupplungsbolzen|kupplungsmaul|bolzen\s+(?:von\s+der|der|an\s+der|am)\s+(?:anh(?:ä|ae)nger)?kupplung)\S*\s+${__T[9]}(?:rastet\s+nicht|schlie(?:ß|ss)t\s+nicht|geht\s+nicht|l(?:ä|ae)(?:ss|ß)t\s+sich\s+nicht|klemmt|hakt|defekt|kaputt|gebrochen|gerissen|rissig|verbogen|abgebrochen|locker|lose${__T[0]}|ausgeschlagen|offen)${__T[0]}|${__T[1]}kupplung\s+(?:vom|am|des|an\s+der|von\s+der|zum)\s+${__T[16]}sattel)\S*\s+${__T[9]}(?:nicht\s+(?:zu|geschlossen|eingerastet|verriegelt)${__T[0]}|offen|defekt|kaputt|klemmt|rastet\s+nicht)|${__T[1]}(?:ab|auf|an)(?:satteln|kuppeln)\s+(?:[^.;!?\s]+\s+){0,5}?(?:(?:geht|ging|gehen)\s+(?:[^.;!?\s]+\s+){0,2}?${__T[13]}(?:raus|rein|auf|zu|runter|hoch)|abgerissen|abgebrochen|runtergefallen|heruntergefallen|abgerutscht|abgesackt|verbogen|klemmt|hakt|kaputt|gerissen)${__T[0]}|${__T[1]}(?:(?:geht|ging|gehen)\s+(?:[^.;!?\s]+\s+){0,2}?${__T[13]}(?:raus|rein|auf|zu|runter|hoch)|abgerissen|abgebrochen|runtergefallen|heruntergefallen|abgerutscht|abgesackt|verbogen|klemmt|hakt|kaputt|gerissen)\s+(?:[^.;!?\s]+\s+){0,3}?bei(?:m)?\s+(?:ab|auf|an)(?:satteln|kuppeln)${__T[0]}|${__T[1]}${__T[16]}trailer)\s+(?:[^.;!?\s]+\s+){0,4}?(?:runtergefallen|heruntergefallen|abgerutscht|abgekippt|vom\s+sattel${__T[7]}gerutscht)${__T[0]}|${__T[1]}(?<!(?:im|in\s+dem|in\s+der|in\s+the)\s+)${__T[16]}trailer)\s+(?:ist\s+|steht\s+)?(?:viel\s+)?zu\s+(?:hoch|niedrig|tief)${__T[0]}(?!${__T[7]}(?:beladen|geladen|gestapelt|gepackt|bepackt))|${__T[1]}(?:komme?|kommt|passe?|passt)\s+${__T[8]}${__T[13]}(?:drunter|darunter|unter\s+(?:den|die)\s+${__T[16]}trailer|sattelplatte))${__T[0]}|${__T[5]}(?:fifth[- ]wheel|jaws?|coupling)\s+${__T[9]}not\s+(?:locking|lock|latching|latch)(?![a-z])|${__T[5]}(?:can['’]?t|cannot|could\s?n['’]?t|unable\s+to)${__T[7]}(?:unhook|hook\s+up|drop|release|uncouple|couple)\s+(?:the\s+|my\s+|this\s+)?trailer(?![a-z])|${__T[2]}не\s+(?:можу|можемо|могу|можем|вдається|виходить|получается)${__T[7]}(?:відчепити|відчіпити|причепити|зчепити|відчепитися|отцепить|прицепить|сцепить|отцепиться|зацепить|зачепити)${__T[6]})${__RX[41]}`, 'i', 1);






const COUPLING3_HINT = lbRx(String.raw`(?:${__T[1]}(?:sattel)?kupplung${__T[0]}\s+(?:[^\s.,;!?]+\s+){0,2}?(?:schlie(?:ß|ss)t${__T[7]}nicht|verriegelt${__T[7]}nicht|rastet${__T[7]}nicht|geht${__T[7]}${__T[13]}zu${__T[0]})(?![^.;!?]*(?:pedal|gang|g(?:ä|ae)nge|schalt|rutsch|trennt))|${__T[1]}(?:sattel)?kupplungs(?:hebel|griff|sicherung|riegel|verschluss|b(?:ü|ue)gel)\S*\s+(?:[^\s.,;!?]+\s+){0,3}?(?:klemmt|hakt|geht${__T[7]}${__T[13]}(?:zur(?:ü|ue)ck|rein|raus|zu|auf|runter)|l(?:ä|ae)(?:ss|ß)t\s+sich\s+nicht|rastet${__T[7]}nicht|kaputt|defekt|abgebrochen|verbogen|blockiert)${__T[0]}|${__T[1]}(?:hebel|griff|sicherung|riegel|sicherungsb(?:ü|ue)gel|b(?:ü|ue)gel|verriegelung)\s+(?:(?:von\s+der|der|an\s+der|vom|am|zur)\s+)?(?:sattel)?kupplung${__T[0]}\s+(?:[^\s.,;!?]+\s+){0,2}?(?:klemmt|hakt|geht${__T[7]}${__T[13]}(?:zur(?:ü|ue)ck|rein|raus|zu|auf|runter)|l(?:ä|ae)(?:ss|ß)t\s+sich\s+nicht|rastet${__T[7]}nicht|kaputt|defekt|abgebrochen|verbogen|blockiert)${__T[0]}|${__T[1]}(?:krieg\S*|bekomm\S*)\s+${__T[8]}(?:h(?:ä|ae)nger|anh(?:ä|ae)nger|auflieger|trailer|sattel)${__T[7]}${__T[13]}(?:ab|los|dran|ran|drunter|zu)${__T[0]}|${__T[1]}k(?:ö|oe)nigszapfen\s+${__T[8]}(?:sitzt|rastet|greift|h(?:ä|ae)lt)${__T[7]}nicht|${__T[1]}${__T[16]}h(?:ä|ae)nger)${__T[7]}(?:springt|rutscht|h(?:ü|ue)pft)${__T[7]}(?:raus|heraus|aus\s+der\s+(?:sattel)?kupplung)${__T[0]}|${__T[5]}(?:trailer|it)\s+${__T[18]}does\s+not)\s+(?:unhook|uncouple|couple|hook\s+up|release|lock)(?![a-z])|${__T[5]}fifth[\s-]wheel\s+(?:handle|lever|release|pin|lock)\s+${__T[8]}(?:stuck|jammed|seized|broken|won['’]?t\s+(?:move|pull|go\s+back|close))|${__T[5]}king\s?-?pin${__T[7]}not\s+(?:locked|seated|engaged|in)(?![a-z])|${__T[2]}(?:причіп|напівпричіп|прицеп|полуприцеп)\S*${__T[7]}не\s+(?:відчіплю|зчіплю|чіпля|отцепля|сцепля|цепля)\S*|${__T[2]}(?:замок\S*\s+(?:сідл|седл|зчіп|сцеп|сідельн|седельн)\S*|сідл\S*|седл\S*|шкворн\S*|шкворень)${__T[7]}не\s+(?:закрива|закрыва|відкрива|открыва|фіксу|фиксир|защіпа|защелк)\S*|(?:рычаг|важіль|важел\S*|ручк\S*)\s+(?:сідл|седл)\S*${__T[7]}не\s+(?:возвраща|поверта|вертае)\S*|(?:сідл|седл)\S*\s+(?:(?!(?:не|нет|немає|без)\s)\S+\s+)?(?:разбит\S*|розбит\S*|стучит|стукає|стукает|люфт\S*)${__T[6]}|(?:стучит|стукає|люфт|стук|стукіт)\s+(?:в|у)?\s*(?:сідл|седл)|(?:фаркоп|сцепк|зчіпк|дышл|дишл)\S*\s+(?:(?!не\s)\S+\s+)?(?:сломан|зламан|разбит|розбит|погнут|зігнут|тріснул|треснул|оторв|відірв)\S*|(?:причіп|напівпричіп|прицеп|полуприцеп)\S*${__T[7]}(?:упал|упав|впав|слетел|злетів|сорвал\S*|зірвав\S*)\s+(?:с|з|із)\s+(?:сідл|седл))${__T[10]}abgeschmiert|funktioniert\s+wieder|geht\s+wieder|wieder\s+(?:ok|in\s+ordnung)${__T[23]}greased${__T[11]}заменил\S*))`, 'i', 1);
const AIRLINE_HINT = lbRx(String.raw`(?:${__T[1]}(?:rote|gelbe)[rnms]?\s+(?:luft|brems|vorrats)?schl(?:a|ä|ae)uch\S*\s+${__T[9]}(?:abgerissen|gerissen|undicht|zischt|kaputt|defekt|verliert|geplatzt|abgebrochen)${__T[0]}|${__T[1]}(?:(?:druckluft|luft|brems)?kupplungsk(?:ö|oe|o)pfe?|duomatik|druckluftkupplung)\S*\s+${__T[9]}(?:undicht|zischt|verliert|abgerissen|kaputt|defekt|abgebrochen|bl(?:ä|ae)st)${__T[0]}|${__T[5]}(?:red|yellow|emergency|service)\s+(?:air\s+)?(?:line|hose)s?\s+${__T[8]}(?:ripped|torn|snapped|leaking|leaks|hissing|broken|came\s+off)(?![a-z])|${__T[5]}glad\s?-?hands?\s+${__T[8]}(?:leak\S*|hiss\S*|broken|damaged)|${__T[2]}шланг\S*${__T[7]}(?:повітр|воздух|гальм|тормоз)\S*${__T[7]}(?:відірв|оторв|трав|пропуска|шипи|шипя|лопну|порва)\S*|${__T[2]}(?:повітрян|воздушн|гальмівн|тормозн)\S*\s+шланг\S*${__T[7]}(?:відірв|оторв|трав|шипи|шипя|лопну|порва)\S*|${__T[2]}шланг\S*${__T[7]}(?:відірвал|оторвал)\S*)${__RX[41]}`, 'i');
const BRAKE3_HINT = lbRx(String.raw`(?:${__T[1]}(?:abs|ebs)[\s-]+(?:(?:vom|von|am|des|der)\s+)?(?:anh(?:ä|ae)nger|h(?:ä|ae)nger|auflieger|sattelauflieger|trailer)s?[\s-]*(?:warn)?(?:leuchte|lampe|kontrollleuchte|licht|anzeige|fehler|st(?:ö|oe)rung)|${__T[1]}(?:abs|ebs)[\s-]*(?:kabel|stecker|leitung|spirale|spiralkabel)\s+${__T[9]}(?:ab|abgerissen|gerissen|rausgerissen|kaputt|defekt|lose|locker|gebrochen)${__T[0]}|${__T[1]}(?:anh(?:ä|ae)nger|h(?:ä|ae)nger|auflieger|sattelauflieger|trailer)${__T[7]}zieht${__T[7]}(?:schief|seitlich|zur\s+seite|nach\s+(?:links|rechts)|weg)${__T[0]}|${__T[5]}trailer\s+(?:is\s+)?pull(?:s|ing)\s+(?:to\s+(?:the\s+)?|towards\s+(?:the\s+)?)?(?:left|right|one\s+side|sideways)|${__T[5]}trailer\s+abs\s+(?:light|lamp|warning|fault)|${__T[5]}abs\s+(?:cable|plug|lead)${__T[7]}(?:broken|ripped|torn|off|loose|damaged)|${__T[2]}(?:причіп|причеп|напівпричіп|напівпричеп|прицеп|полуприцеп)\S*${__T[7]}(?:тягне|тянет|веде|ведет)${__T[7]}(?:вбік|убік|в\s+бік|в\s+сторону|вліво|вправо|влево|вправо)|${__T[2]}(?:шланг|повітр|воздух|пневм)\S*\s+${__T[9]}(?:травить|травит|травлять|травят|спускає|спускает)|${__T[2]}(?<!(?:шин|колес|ниппел|ніпел|запаск|покрышк|покришк)\S*${__T[7]})(?:травить|травит)\s+(?:повітря|воздух|шланг))${__RX[42]}`, 'i', 1);
const BRAKE2_HINT = lbRx(String.raw`(?:${__T[1]}brems(?:scheiben?|trommeln?|bel(?:ä|ae|e)ge?|backen?|s(?:ä|ae|a)ttel)\s+${__T[8]}(?:gl(?:ü|ue)h\S*|qualm\S*|raucht|rauchen|dampf\S*|(?:ist\s+|sind\s+|wird\s+|werden\s+)?(?:sehr\s+|extrem\s+|zu\s+|richtig\s+)?hei(?:ß|ss)${__T[0]})|${__T[1]}brems(?:bel(?:ä|ae|e)ge?|kl(?:ö|oe)tze|backen)\s+${__T[8]}(?:unten|runter|durch|abgefahren|fertig|verschlissen|blank)${__T[0]}|${__T[1]}(?:brems)?bel(?:a|ä|ae)gs?[\s-]?verschlei(?:ß|ss)(?:[\s-]?(?:anzeige|warnung|warnleuchte|leuchte|lampe|meldung|symbol|sensor)\S*|${__T[7]}(?:leuchtet|kommt|angezeigt|gemeldet))|${__T[1]}(?<!(?:sitz|sitzes|lehne|kopfst(?:ü|ue)tze|spiegel)${__T[7]})(?:ruckelt|ruckt|flattert|vibriert|zittert|wackelt|rubbelt|schl(?:ä|ae)gt|stottert|bockt)\s+${__T[8]}beim\s+(?:ab)?bremsen${__T[0]}|${__T[1]}beim\s+(?:ab)?bremsen\s+${__T[9]}(?:ruckel\S*|ruckt|flatter\S*|vibrier\S*|zitter\S*|wackel\S*|rubbel\S*|schl(?:ä|ae)gt|stotter\S*|bockt)${__T[0]}|${__T[5]}(?:shudder|judder|vibrat|shak|pulsat|wobbl)\S*\s+${__T[8]}(?:when|while|under)\s+braking(?![a-z])|${__T[1]}zisch\S*\s+${__T[8]}(?:an|bei|aus|am|vom|von)\s+(?:der\s+|dem\s+|den\s+)?(?:brems\S*|membran\S*|federspeicher\S*|kombizylinder\S*)|${__T[1]}(?:brems(?:e|en|zylinder|kammer)|membranzylinder|federspeicher(?:zylinder)?)${__T[7]}zisch\S*|${__T[5]}hiss\S*\s+${__T[9]}(?:from|at|near)\s+(?:the\s+)?(?:\S+\s+)?(?:brakes?|brake\s+chamber|chamber)(?![a-z])|(?![^.;!?]*(?:reifen|tyres?|tires?|шин\S*))(?:${__T[1]}(?:dauert|braucht)\s+${__T[9]}bis\s+(?:der\s+|die\s+|genug\s+)?(?:luft|druck|luftdruck|bremsdruck|vorratsdruck)${__T[7]}(?:da|oben|aufgebaut|voll|steht)${__T[0]}|${__T[1]}(?:luft|druck|luftdruck|bremsdruck|vorratsdruck)\s+baut\s+(?:sich\s+)?(?:nur\s+|sehr\s+|zu\s+|extrem\s+)?langsam\s+auf|${__T[5]}takes\s+${__T[8]}to\s+build\s+(?:up\s+)?(?:air|pressure)|${__T[5]}(?:air|pressure)\s+(?:builds?|building)\s+(?:up\s+)?(?:very\s+|too\s+|really\s+)?slow(?:ly)?(?![a-z]))|${__T[1]}brems\S*${__T[7]}zi(?:eh|e|h)?(?:t|en)${__T[7]}nach\s+(?:links|rechts)${__T[0]}|${__T[5]}(?<!(?:parking|hand)\s?)brakes?\s+(?:is\s+|are\s+)?(?:not|won['’]?t|wont|doesn['’]?t|doesnt|don['’]?t|dont|isn['’]?t|aren['’]?t)${__T[7]}releas\S*|${__T[5]}(?<!(?:parking|hand)\s?)brakes?\s+(?:are\s+|is\s+)?(?:dragging|binding|stay(?:s|ing)?\s+on|stuck\s+on|smoking|glowing|red[\s-]hot|noisy|making\s+(?:a\s+)?(?:\S+\s+)?noise)(?![a-z])|${__T[5]}pull\S*\s+${__T[9]}(?:when|while|under)\s+braking(?![a-z])|${__T[5]}(?:smoke|smoking|burning\s+smell)\s+${__T[8]}from\s+(?:the\s+)?(?:\S+\s+)?brakes?(?![a-z])|${__T[5]}brake\s+(?:warning\s+(?:light|lamp)|system\s+(?:fault|error|warning))|${__T[5]}brake\s+(?:pads?|shoes?|linings?|discs?)\s+(?:need|needs|have\s+to\s+be)\s+(?:replac|chang|renew)\S*|${__T[5]}(?<!parking\s|hand)(?:no|lost(?:\s+the|\s+all)?)\s+brakes(?![a-z])(?!\s+(?:issues?|problems?|faults?|complaints?))|(?![^.;!?]*(?:geht\s+(?!nicht)(?:(?!nicht)\S+\s+){0,4}?aus${__T[0]}|erlischt|goes\s+(?:out|off)))(?:${__T[1]}(?:abs|ebs)[\s-]?(?:warn|kontroll)?(?:leuchte|lampe|licht|symbol|light|lamp|warning|warnung)${__T[0]}|${__T[1]}(?:abs|ebs)\s+(?:leuchtet|brennt|blinkt|is\s+(?:on|lit)|light)(?![a-z])|(?<![а-яіїєґёa-z])(?:abs|ebs|абс|ебс)${__T[7]}(?:гор\S*|світ\S*|свет\S*|блим\S*|мига\S*|помилк\S*|ошибк\S*)|${__T[2]}(?:помилк\S*|ошибк\S*|лампа|лампочка|індикатор|индикатор)${__T[7]}(?:abs|ebs|абс|ебс)(?![a-zа-яіїєґё]))|${__T[2]}не\s+(?:розгальмов\S*|розгальму\S*|растормаж\S*|растормоз\S*)|${__T[2]}(?:гальм\S*|тормоз\S*|колодк\S*)${__T[7]}не\s+(?:відпуска\S*|відпуст\S*|отпуска\S*|отпуст\S*))${__RX[43]}`, 'i', 1);








const STALK_HINT = lbRx(String.raw`${__RX[44]}(?:${__T[1]}(?:blink(?:er)?|lenkstock|kombi|kombinations|multifunktions|licht|fernlicht|(?:scheiben)?wischer|retarder|intarder|dauerbrems|motorbrems|(?:abstands)?tempomat)[\s-]?(?:hebel|schalter)(?:s|n)?${__T[0]}\s+${__T[9]}${__T[20]}ausgefallen|funktionslos|ohne\s+funktion|funktioniert${__T[7]}nicht|geht${__T[7]}nicht|rastet${__T[7]}nicht|(?:l(?:ä|ae)sst|lässt)\s+sich\s+nicht)${__T[0]}|${__T[1]}(?:hebel|schalter)\s+(?:vom|von\s+(?:der|dem)|des|f(?:ü|ue)r\s+(?:den|die|das)|am|an\s+der)\s+(?:blinker|licht|fernlicht|(?:scheiben)?wischer|retarder|intarder|dauerbremse|motorbremse|tempomat)\S*\s+${__T[9]}${__T[20]}ausgefallen|funktionslos|ohne\s+funktion|funktioniert${__T[7]}nicht|geht${__T[7]}nicht|rastet${__T[7]}nicht|(?:l(?:ä|ae)sst|lässt)\s+sich\s+nicht)${__T[0]}|${__T[1]}(?:abgebrochene|abgerissene|gebrochene|kaputte|defekte|lose|lockere|wackelige|klemmende)[nrs]?${__T[7]}(?:blink(?:er)?|lenkstock|kombi|kombinations|multifunktions|licht|fernlicht|(?:scheiben)?wischer|retarder|intarder|dauerbrems|motorbrems|(?:abstands)?tempomat)[\s-]?(?:hebel|schalter)(?:s|n)?${__T[0]}|${__T[5]}(?:indicator|turn[\s-]?signal|signal|blinker|light|headlight|combination|combi|multi-?function|steering\s+column|(?:windscreen\s+|windshield\s+)?wipers?|retarder|intarder|engine\s+brake|exhaust\s+brake|cruise(?:\s+control)?)\s+(?:stalk|lever|switch)(?:es|s)?(?![a-z])\s+${__T[9]}(?:broke|broken|snapped|cracked|loose|wobbly|stuck|jammed|sticking|came\s+off|fell\s+off|come\s+off|is\s+off|hanging|not\s+working|doesn[\'’]?t\s+work|does\s+not\s+work|won[\'’]?t\s+(?:click|stay|engage|work|lock)|failed|faulty|defective|dead)(?![a-z])|${__T[5]}(?:broken|snapped|cracked|loose|wobbly|stuck|faulty|defective)\s+(?:the\s+)?(?:\S+\s+)?(?:indicator|turn[\s-]?signal|signal|blinker|light|headlight|combination|combi|multi-?function|steering\s+column|(?:windscreen\s+|windshield\s+)?wipers?|retarder|intarder|engine\s+brake|exhaust\s+brake|cruise(?:\s+control)?)\s+(?:stalk|lever|switch)(?:es|s)?(?![a-z])|${__T[2]}(?:важ(?:і|е)л\S*|рыча\S*|ручк\S*|перемикач\S*|переключат\S*|підрульов\S+\s+(?:важ\S*|перемикач\S*)|подрулев\S+\s+(?:рыча\S*|переключат\S*))${__T[7]}(?:поворот\S*|світл\S*|свет\S*|двірник\S*|дворник\S*|склоочисник\S*|стеклоочистит\S*|ретардер\S*|інтардер\S*|интардер\S*|моторн\S+\s+(?:гальм|тормоз)\S*|круїз\S*|круиз\S*)\s+${__T[8]}(?:зламав\S*|зламан\S*|злама[лн]\S*|відлама\S*|отлома\S*${__T[17]}відірва\S*${__T[31]}застря\S*${__T[15]}не\s+фіксу\S*|не\s+фиксиру\S*)|${__T[2]}(?:зламав\S*|зламан\S*|злама[лн]\S*|відлама\S*|отлома\S*${__T[17]}відірва\S*${__T[31]}застря\S*${__T[15]}не\s+фіксу\S*|не\s+фиксиру\S*)${__T[7]}(?:важ(?:і|е)л\S*|рыча\S*|ручк\S*|перемикач\S*|переключат\S*|підрульов\S+\s+(?:важ\S*|перемикач\S*)|подрулев\S+\s+(?:рыча\S*|переключат\S*))${__T[7]}(?:поворот\S*|світл\S*|свет\S*|двірник\S*|дворник\S*|склоочисник\S*|стеклоочистит\S*|ретардер\S*|інтардер\S*|интардер\S*|моторн\S+\s+(?:гальм|тормоз)\S*|круїз\S*|круиз\S*)|${__T[2]}(?:підрульов\S*\s+перемикач\S*|подрулев\S*\s+переключат\S*)\s+${__T[8]}(?:зламав\S*|зламан\S*|злама[лн]\S*|відлама\S*|отлома\S*${__T[17]}відірва\S*${__T[31]}застря\S*${__T[15]}не\s+фіксу\S*|не\s+фиксиру\S*)|${__T[2]}(?:зламав\S*|зламан\S*|злама[лн]\S*|відлама\S*|отлома\S*${__T[17]}відірва\S*${__T[31]}застря\S*${__T[15]}не\s+фіксу\S*|не\s+фиксиру\S*)\s+(?:підрульов\S*\s+перемикач\S*|подрулев\S*\s+переключат\S*))`, 'i');
const STALK_SPANS = new RegExp(STALK_HINT.source, 'gi');
function stalkKinds(v) { const k = new Set(); for (const m of String(v).matchAll(STALK_SPANS)) { const x = m[0]; k.add(/retard|intard|brems|brake|ретард|інтард|интард|моторн/i.test(x) ? 'brake' : /wisch|wiper|двірн|дворн|склоочис|стеклоочис/i.test(x) ? 'visib' : /tempomat|cruise|круї|круи/i.test(x) ? 'adas' : 'lights'); } return k; }





const CTRL_HINT = lbRx(String.raw`${__RX[44]}(?:${__T[1]}(?:heizungs?|gebl(?:ä|ae)se|l(?:ü|ue)ftungs|warnblink(?:licht)?|hand\s?brems|feststell\s?brems|park\s?brems|lenkrad(?:verstell(?:ungs)?)?|lenks(?:ä|ae)ulenverstell(?:ungs)?|spiegelverstell(?:ungs)?|tempomat|(?:differen[tz]ial|l(?:ä|ae)ngs|quer)sperr(?:en|e)?|k(?:ü|ue)hl(?:aggregat|ger(?:ä|ae)t)s?|achslift|liftachsen?)[\s-]?(?:dreh)?(?:regler|knopf|knöpfe|schalter|taste|hebel)(?:s|n|e)?${__T[0]}\s+${__T[9]}${__T[20]}fehlt|ausgefallen|funktionslos|ohne\s+funktion|funktioniert${__T[7]}nicht|geht${__T[7]}nicht|dreht\s+durch|rastet${__T[7]}nicht|l(?:ä|ae)sst\s+sich\s+nicht)${__T[0]}|${__T[1]}(?:dreh)?(?:regler|knopf|knöpfe|schalter|taste|hebel)\s+(?:(?:f(?:ü|ue)r(?:\s+(?:den|die|das))?|vom|von\s+(?:der|dem)|der|des|am|an\s+der|zur?)\s+)?(?:heizung\S*|heiz|gebl(?:ä|ae)se|l(?:ü|ue)ftung|licht|warnblink\S*|hand\s?brems\S*|feststell\s?brems\S*|park\s?brems\S*|lenk(?:rad|s(?:ä|ae)ulen)(?:verstell|einstell)\S*|spiegel(?:verstell|einstell)\S*|tempomat\S*|(?:differen[tz]ial|l(?:ä|ae)ngs|quer)sperr\S*|k(?:ü|ue)hl(?:aggregat|ger(?:ä|ae)t)\S*|achslift\S*|liftachse\S*)\s+${__T[9]}${__T[20]}fehlt|ausgefallen|funktionslos|ohne\s+funktion|funktioniert${__T[7]}nicht|geht${__T[7]}nicht|dreht\s+durch|rastet${__T[7]}nicht|l(?:ä|ae)sst\s+sich\s+nicht)${__T[0]}|${__T[1]}(?:heizung\S*|heiz|gebl(?:ä|ae)se|l(?:ü|ue)ftung|licht|warnblink\S*|hand\s?brems\S*|feststell\s?brems\S*|park\s?brems\S*|lenk(?:rad|s(?:ä|ae)ulen)(?:verstell|einstell)\S*|spiegel(?:verstell|einstell)\S*|tempomat\S*|(?:differen[tz]ial|l(?:ä|ae)ngs|quer)sperr\S*|k(?:ü|ue)hl(?:aggregat|ger(?:ä|ae)t)\S*|achslift\S*|liftachse\S*)\s+(?:dreh)?(?:regler|knopf|knöpfe|schalter|taste|hebel)(?:s|n|e)?${__T[0]}\s+${__T[9]}${__T[20]}fehlt|ausgefallen|funktionslos|ohne\s+funktion|funktioniert${__T[7]}nicht|geht${__T[7]}nicht|dreht\s+durch|rastet${__T[7]}nicht|l(?:ä|ae)sst\s+sich\s+nicht)${__T[0]}${__T[39]}heater|heating|blower|hazard(?:\s+lights?)?|hand\s?brake|parking\s+brake|mirror\s+adjust(?:ment|er)?|steering\s+(?:wheel|column)\s+adjust(?:ment|er)?|cruise(?:\s+control)?|diff(?:erential)?\s+lock|reefer(?:\s+unit)?|lift\s+axle|axle\s+lift)\s+(?:control\s+)?(?:knob|switch|button|lever|dial)s?\s+${__T[8]}(?:broken|broke(?:\s+off)?|snapped|missing|loose|stuck|cracked|(?:fell|came)\s+off|not\s+working|doesn\S?t\s+work|does\s+not\s+work|won\S?t\s+turn)(?![a-z])|(?:ручк\S*|кнопк\S*|регулятор\S*|перемикач\S*|переключател\S*|рычаг\S*|ричаг\S*|важ(?:і|е)л\S*|крутилк\S*)\s+(?:печк\S*|пічк\S*|отопител\S*|обігрівач\S*|вентилятор\S*\s+печ\S*|аварийк\S*|аварійк\S*|ручник\S*|стояночн\S*\s+тормоз\S*|стоянков\S*\s+гальм\S*|регулировк\S*\s+рул\S*|регулюванн\S*\s+керм\S*|регулировк\S*\s+зеркал\S*|регулюванн\S*\s+дзеркал\S*|блокировк\S*\s+диф\S*|блокуванн\S*\s+диф\S*|рефрижератор\S*)\s+${__T[8]}(?:отломал\S*|оторвал\S*${__T[17]}відламал\S*|відірвал\S*|зламал\S*|зламан\S*|болта\S*|теліпа\S*|заел\S*|заклин\S*|запада\S*|не\s+работа\S*|не\s+працю\S*|не\s+крути\S*)|(?:отломал\S*|оторвал\S*${__T[17]}відламал\S*|відірвал\S*|зламал\S*|зламан\S*|болта\S*|теліпа\S*|заел\S*|заклин\S*|запада\S*|не\s+работа\S*|не\s+працю\S*|не\s+крути\S*)\s+(?:ручк\S*|кнопк\S*|регулятор\S*|перемикач\S*|переключател\S*|рычаг\S*|ричаг\S*|важ(?:і|е)л\S*|крутилк\S*)\s+(?:печк\S*|пічк\S*|отопител\S*|обігрівач\S*|вентилятор\S*\s+печ\S*|аварийк\S*|аварійк\S*|ручник\S*|стояночн\S*\s+тормоз\S*|стоянков\S*\s+гальм\S*|регулировк\S*\s+рул\S*|регулюванн\S*\s+керм\S*|регулировк\S*\s+зеркал\S*|регулюванн\S*\s+дзеркал\S*|блокировк\S*\s+диф\S*|блокуванн\S*\s+диф\S*|рефрижератор\S*)|${__T[1]}(?:differen[tz]ial|l(?:ä|ae)ngs|quer)sperre\s+${__T[9]}(?:l(?:ä|ae)sst\s+sich${__T[7]}nicht|geht${__T[7]}nicht|schaltet${__T[7]}nicht|bleibt${__T[7]}(?:drin|eingelegt|aktiv|an)|h(?:ä|ae)ngt|klemmt|defekt|kaputt|ausgefallen|funktioniert${__T[7]}nicht|ohne\s+funktion)${__T[0]}|(?<![a-z])diff(?:erential)?\s+lock\s+${__T[8]}(?:won\S?t|doesn\S?t|does\s+not|not\s+(?:working|engaging|disengaging)|stuck|broken|faulty)(?![a-z]))`, 'i');
const CTRL_SPANS = new RegExp(CTRL_HINT.source, 'gi');
function ctrlKinds(v) { const k = new Set(); for (const m of String(v).matchAll(CTRL_SPANS)) { const x = m[0]; k.add(/differen|sperr|diff\s+lock|диф/i.test(x) ? 'gear' : /k(?:ü|ue)hl|reefer|рефриж/i.test(x) ? 'reefer' : /lift/i.test(x) ? 'susp' : /brems|brake|ручник|тормоз|гальм/i.test(x) ? 'brake' : /lenk|steering|рул|керм/i.test(x) ? 'steer' : /spiegel|mirror|зеркал|дзеркал/i.test(x) ? 'mirror' : /tempomat|cruise/i.test(x) ? 'adas' : /warnblink|licht|hazard|аварий|аварій/i.test(x) ? 'lights' : 'visib'); } return k; }
const LIGHTS_HINT = lbRx(String.raw`${__T[1]}kein(?:e|en)?\s+(?:licht|standlicht|begrenzungsleuchten?|positionsleuchten?|bremslicht|blinker|r(?:ü|ue)cklicht|abblendlicht|fernlicht|scheinwerfer|beleuchtung|r(?:ü|ue)ckfahrlicht)${__T[0]}(?!${__T[7]}(?:n(?:ö|oe)tig|notwendig|n(?:ö|oe)tig))${__RX[9]}|${__T[5]}(?:indicator|headlight|head\s+light|tail\s*light|rear\s+light|brake\s+light|side\s+(?:marker|light)|marker\s+light|fog\s+light|reverse\s+light|reversing\s+light|number\s+plate\s+light)s?\s+(?:bulbs?\s+)?(?:(?:is|are|has|have|on\s+the\s+\S+|left|right|front|rear|nearside|offside)\s+){0,2}(?:gone|out|blown|packed\s+(?:in|up)|given\s+up)(?![a-z])${__RX[18]}|(?:${__T[1]}(?:nebelscheinwerfer|nebelleuchte|nebellicht|kennzeichenbeleuchtung|kennzeichenleuchte)(?:n)?${__T[7]}(?:aus(?=\s*(?:$|[.,;!?]))|defekt|kaputt|geht\s+nicht|gehen\s+nicht|ausgefallen|funktioniert\s+nicht|brennt\s+nicht|leuchtet\s+nicht|gebrochen)|${__T[2]}(?:протитуманк\S*|противотуманк\S*|підсвітк\S*\s+номер\S*|подсветк\S*\s+номер\S*|(?:ліхтар\S*|фар\S*|фонар\S*|габарит\S*)${__T[7]}(?:причеп\S*|прицеп\S*))${__T[7]}(?:не\s+(?:працю\S*|горить|горять|світ\S*|работа\S*|горит|горят|свет\S*)|розбит\S*|разбит\S*|злама[внл]\S*|сломан\S*))${__RX[0]}|${__T[3]}(?:stoppleuchte|stopplicht|warnblinker|warnblinkanlage|warnblinklicht|umrissleuchte|kennzeichenleuchte|blinkleuchte|rundumkennleuchte|rundumleuchte|rundumlicht|blitzleuchte|arbeitsscheinwerfer|arbeitsleuchte|arbeitslicht|zusatzscheinwerfer|scheinwerfer|abblendlicht|fernlicht|r(?:ü|ue|u)cklicht|ruecklicht|bremslicht|blinker|blinklicht|rückleuchte|bremsleuchte|schlussleuchte|schlusslicht|beleuchtung|licht|lichter|standlicht|standlichter|leuchte|lampe|begrenzungsleuchte|positionsleuchte|seitenmarkierungsleuchte|nebelschlussleuchte|kennzeichenbeleuchtung|rückfahrscheinwerfer)(?:n|s|e)?(?!\s+(?:geht|gehen|funktioniert|funktionieren|ok|i\.?\s?o\.?|in\s+ordnung)\s*[,;])\s+(?:\S+\s+){0,6}?(?:ausgefallen|fällt\s+aus|fallen\s+aus|geht\s+nicht|gehen\s+nicht|funktioniert\s+nicht|funktionieren\s+nicht|brennt\s+nicht|brennen\s+nicht|leuchtet\s+nicht|defekt|kaputt|flackert|flackern|zerbrochen|gebrochen|durchgebrannt|blinkt\s+${__T[8]}schnell(?:er)?${__T[0]}|(?:geht|gehen|ging|gingen)\s+${__T[9]}(?:fahrt|pl(?:ö|oe|o)tzlich|immer|zwischendurch|zeitweise|manchmal)\S*${__T[7]}aus${__T[0]})${__RX[45]}|(?:defekte?[nmrs]?|kaputte?[nmrs]?|ausgefallene?[nmrs]?|zerbrochene?[nmrs]?)${__T[7]}(?:rundumkennleuchte|rundumleuchte|rundumlicht|blitzleuchte|arbeitsscheinwerfer|arbeitsleuchte|arbeitslicht|zusatzscheinwerfer|scheinwerfer|abblendlicht|r(?:ü|ue|u)cklicht|ruecklicht|bremslicht|blinker|rückleuchte|bremsleuchte|schlussleuchte|beleuchtung|leuchte|lampe)|(?<![a-z])(?<!(?:warning|engine|dash|dashboard|check|reefer|indicator)\s)(?:(?:rotating\s+|amber\s+|warning\s+)?beacons?|work\s*lights?|spot\s*lights?|head\s*lights?|head\s*lamps?|dipped\s+beam|tail\s*lights?|rear\s+lights?|brake\s+lights?|stop\s+lights?|indicators?|turn\s+signals?|blinkers?|side\s*lights?|marker\s+lights?|lights?|lamps?|bulbs?)\s+${__T[9]}(?:out(?![a-z])|not\s+working|no\s+longer\s+works?|stopped\s+working|doesn['’]?t\s+work|don['’]?t\s+work|isn['’]?t\s+working|aren['’]?t\s+working|failed|broken|flicker(?:s|ing)|dead|smashed|blown)${__RX[45]}|${__T[4]}(?:аварійк\S*|аварийк\S*|аварійн\S*\s+сигналізац\S*|аварийн\S*\s+сигнализац\S*|маячок|маячк\S*|мигалк\S*|проблисков\S*|фар[аиуіы]?|габарит\S*|стоп(?:[- ]?сигнал\S*|(?![-]))|поворотник\S*|ліхтар\S*|фонар\S*|світло|освітлення|свет|освещение|лампочк\S*|лампа)(?![а-яіїєґ])\s+${__T[9]}(?:не${__T[7]}(?:працю|світ|горить|горять|горит|горят|работа|свет|блима|мига|включа|вмика)|згорі|згоріл|перегор|розбит|разбит|злама[внл]|сломал|сломан|блима|мигает|мерехт)${__RX[46]}|${__T[4]}не\s+(?:працю|світ|горить|горять|горит|горят|работа|свет|включа|вмика)[^\s.,;!?]*\s+(?:[^\s.,;!?]+\s+)?(?:аварійк\S*|аварийк\S*|маячок|маячк\S*|мигалк\S*|фар[аиуіы]?|габарит\S*|стоп(?:[- ]?сигнал\S*|(?![-]))|поворотник\S*|ліхтар\S*|фонар\S*|світло|свет|лампочк\S*|лампа)(?![а-яіїєґ])${__RX[46]}|${__RX[7]}${__T[1]}(?:begrenzungsleuchte|begrenzungslicht|umrissleuchte|seitenmarkierungsleuchte|positionsleuchte)n?${__T[7]}(?:fehlt|fehlen|ab|abgerissen|abgebrochen)${__T[0]}${__RX[7]}|${__RX[7]}${__T[5]}(?:marker|side\s+marker|clearance|position)\s+lights?${__T[7]}(?:missing|broken\s+off|knocked\s+off|smashed)(?![a-z])${__RX[7]}|${__RX[7]}${__T[2]}(?:скло|стекло)${__T[7]}(?:фари|фар|ліхтаря|фонаря)${__T[7]}(?:розбит\S*|разбит\S*|трісну\S*|тресну\S*)${__RX[7]}|${__T[1]}(?:r(?:ü|ue|u)cklicht|r(?:ü|ue|u)ckleuchte|bremslicht|bremsleuchte|stoppleuchte|stopplicht|blinker|blinkleuchte|schlussleuchte|schlusslicht|scheinwerfer|abblendlicht|fernlicht|begrenzungsleuchte|positionsleuchte|seitenmarkierungsleuchte|umrissleuchte)(?:n|s|e)?\s+(?:\S+\s+){0,4}?aus(?=\s*(?:$|[.,;!?]))${__RX[47]}|${__T[1]}(?:scheinwerfer|abblendlicht)\S*\s+${__T[9]}(?:(?:falsch|schief)\s+eingestellt|zu\s+(?:hoch|tief)\s+eingestellt|verstellt|blendet|blenden)${__T[0]}${__RX[47]}|(?<![a-z])head\s*(?:lights?|lamps?)\s+${__T[9]}(?:misaligned|out\s+of\s+alignment|aimed\s+too\s+(?:high|low)|dazzl\S*|blinding)${__RX[47]}|${__T[1]}(?:(?:gl(?:ü|ue)h)?birne|birnchen|gl(?:ü|ue)hlampe|leuchtmittel|lampe|leuchte|blinkerbirne|r(?:ü|ue)cklicht|bremslicht)(?:n)?${__T[0]}\s+(?:(?:vorne|vorn|hinten|links|rechts|oben|unten|am|an|der|dem|vom${__T[25]}ae)nger|ist|sind|schon|wieder|mal)\s+){0,4}(?:durch|durchgebrannt)(?=\s*(?:$|[.,;!?\n]))${__RX[17]}|${__T[1]}(?:scheinwerfer|r(?:ü|ue)cklicht|r(?:ü|ue)ckleuchte)(?:n)?${__T[0]}\s+(?:(?:vorne|vorn|hinten|links|rechts|ist|sind|innen|total|komplett|stark)\s+){0,3}(?:beschlagen|voll\s+wasser|voller\s+wasser|l(?:ä|ae)uft\s+voll)${__T[0]}${__RX[17]}|${__T[1]}(?:wasser|feuchtigkeit|kondenswasser)\s+(?:im|in\s+der|in\s+den)\s+(?:scheinwerfer|r(?:ü|ue)cklicht|r(?:ü|ue)ckleuchte)n?${__T[0]}${__RX[17]}|(?:${__T[5]}(?:head\s*lights?|headlamps?|fog\s+lights?)${__T[7]}(?:cracked|broken|smashed|shattered)|${__T[5]}(?:indicators?|blinkers?|turn\s+signals?)${__T[7]}(?:flashing|blinking)${__T[7]}(?:fast|quickly|rapidly|too\s+fast))${__RX[11]}|(?:${__T[2]}(?:світл(?!оф)\S*|свет(?:а|у)?|фар[аиу]?|габарит\S*|стоп-?сигнал\S*|поворотник\S*|аварійк\S*|аварийк\S*|ліхтар\S*|фонар\S*|лампочк\S*)${__T[7]}(?:не\s+вимика\S*|не\s+выключа\S*|не\s+гасн\S*|не\s+гасне|постійно\s+горить|постоянно\s+горит)${__T[6]}|${__T[5]}(?:lights?|headlights?|hazards?|hazard\s+lights?|brake\s+lights?|indicators?)${__T[7]}${__T[18]}does\s+not|don['’]?t|do\s+not|can['’]?t|cannot)\s+(?:be\s+)?(?:turn(?:ed)?|switch(?:ed)?)\s+off(?![a-z])|${__T[5]}(?:brake\s+lights?|hazards?|hazard\s+lights?)\s+(?:are\s+|is\s+)?stuck\s+on(?![a-z]))${__RX[11]}|${__T[2]}поворот[иы]?${__T[7]}не\s+(?:блима|мига)\S*(?![^.;!?]*(?:відремонт\S*|замінил\S*|поміня\S*${__T[29]}поменя\S*|почини\S*))|(?:${__T[1]}bremslicht(?:er)?${__T[0]}\s+${__T[8]}(?:(?:leuchtet|leuchten|brennt|brennen|bleibt|bleiben|ist|sind)${__T[7]}(?:dauerhaft|st(?:ä|ae)ndig|immer|permanent|dauernd)(?:\s+an)?|geht${__T[7]}${__T[13]}aus)${__T[0]}|${__T[5]}brake\s+lights?\s+${__T[8]}(?:(?:stays?|staying|stuck|remains?|is|are|permanently|constantly|always)${__T[7]}on|won['’]?t\s+(?:go|turn|switch)\s+off|(?:does\s+not|doesn['’]?t)\s+(?:go|turn|switch)\s+off)(?![a-z])|${__T[2]}стоп(?:[- ]?сигнал\S*|[иы])?${__T[7]}(?:горить|горит|горять|горят|світиться|светится|світяться|светятся)${__T[7]}(?:постійно|постоянно|весь\s+час|все\s+время|завжди|всегда)${__T[6]}|${__T[5]}(?:headlights?|head\s*lamps?|tail\s*lights?|lamps?|lights?)\s+${__T[8]}(?:full\s+of\s+water|water\s+(?:inside|in\s+(?:it|them))|fogged(?:\s+up)?|misted(?:\s+up)?|condensation)(?![a-z])|${__T[2]}(?:фар|ліхтар|фонар)\S*${__T[7]}(?:запотіл\S*|запотел\S*|(?:\S+\s+)?вода\s+(?:всередині|внутри)|набрал\S*\s+вод\S*)|${__T[2]}не\s+(?:горить|горит|горять|горят|світить|светит|працює|работает)${__T[7]}(?:підсвітк|подсветк)\S*${__T[7]}номер\S*)${__RX[48]}`, 'i', 1);


const LIGHTS2_HINT = lbRx(String.raw`(?:${__T[1]}licht(?:er)?${__T[0]}\s+(?:[^.,;!?\s]+\s+){0,3}?(?:geht|gehen|funktioniert|funktionieren)\s+(?:gar\s+|überhaupt\s+|ueberhaupt\s+)(?:nicht|nix|nichts)${__T[0]}|${__T[1]}(?:geht|gehen|funktioniert)\s+(?:gar\s+)?(?:nix|garnix|nichts)\s+(?:mehr\s+)?mit\s+(?:dem\s+)?licht(?:ern)?${__T[0]}|${__T[1]}(?:gl(?:ü|ue)h)?birne[n]?\s+(?:[^.,;!?\s]+\s+){0,2}?(?:kaputt|defekt|durch|hin)${__T[0]})${__RX[17]}`, 'i', 1);
const LIGHTS3_HINT = lbRx(String.raw`(?:${__T[1]}(?:anh(?:ä|ae)nger|h(?:ä|ae)nger|auflieger|sattelauflieger|trailer)s?\s+(?:[^\s.,;!?]+\s+){0,2}?(?:kein(?:en)?\s+strom|ohne\s+strom|strom\s+(?:ist\s+)?(?:weg|aus)${__T[0]}|stromlos|tot${__T[0]})|${__T[1]}kein(?:en)?\s+strom\s+(?:(?:am|im|beim|auf\s+dem|auf\s+den|zum|für\s+den|vom)\s+)?(?:anh(?:ä|ae)nger|h(?:ä|ae)nger|auflieger|sattelauflieger|trailer)|${__T[5]}(?:trailer\s+(?:has\s+|got\s+)?(?:no|lost)\s+(?:power|electrics|electricity|lights)|no\s+(?:power|electrics)\s+(?:to|on|at)\s+(?:the\s+)?trailer|trailer\s+electrics\s+(?:dead|gone|not\s+working))(?![a-z])|${__T[2]}(?:причіп|причеп|напівпричіп|напівпричеп|прицеп|полуприцеп)\S*${__T[7]}(?:не\s+має|немає|нема|без|нет|не\s+имеет)\s+(?:світла|струму|живлення|света|тока|питания)|${__T[2]}${__T[36]})\s+(?:світла|струму|живлення|света|тока|питания)\s+(?:на|в|у)\s+(?:причіп|причеп|напівпричіп|напівпричеп|прицеп|полуприцеп)\S*)${__RX[42]}`, 'i', 1);


const LIGHTS4_HINT = lbRx(String.raw`(?:${__T[2]}(?:перегорел\S*|перегоріл\S*|перегорів|перегора\S*)${__T[7]}(?:лампочк\S*|лампа|лампы|лампи|лампу|ламп[іо]|фар\S*|габарит\S*|стоп\S*|поворотник\S*|ліхтар\S*|фонар\S*)|${__T[2]}(?:фар[аиыуеі]?|фарой|фарою|фарами|фарах|фонар\S*|ліхтар\S*|стекл\S*\s+фар\S*|скло\s+фар\S*)${__T[6]}${__T[7]}(?<!не\s)(?:треснул\S*|тріснул\S*|тріснув|треснув|потрескал\S*|потріскал\S*|лопнул\S*|раскол\S*|розкол\S*|запітніл\S*|пітніє|потеет|запотева\S*)|${__T[2]}(?:вода|воды|конденсат|влага|волога)${__T[7]}(?:в|у|во|внутри|всередині)\s+(?:фар[аиыуеі]?|фарой|фарою|фарами|фарах|фонар\S*|ліхтар\S*|стекл\S*\s+фар\S*|скло\s+фар\S*)${__T[6]}|${__T[2]}(?:фар[аиыуеі]?|свет|світло|ближн\S*|дальн\S*)${__T[7]}(?:плохо|слабо|погано|ледве|еле|едва|ледь)\s+(?:свет\S*|світ\S*|горит|горить|горят|горять)|${__T[2]}(?:свет|світло|фар[аиыуеі]?|габарит\S*|фонар\S*|ліхтар\S*)\s+(?:очень\s+|дуже\s+|совсем\s+|зовсім\s+)?(?:тускл\S*|тьмян\S*)|${__T[2]}(?:поворотник\S*|поворот|габарит\S*|аварийк\S*|аварійк\S*)${__T[7]}(?:часто|быстро|швидко|очень\s+быстро|дуже\s+швидко)\s+(?:морга\S*|мига\S*|блима\S*|моргн\S*)|${__T[2]}не\s+(?:работает|працює|горит|горить|мигает|блимає|моргает)\s+(?:левый\s+|правый\s+|лівий\s+|правий\s+)?поворот${__T[6]}(?!\s+(?:на\s+(?:развязк|перекрест|перехрест|съезд|з.їзд|трас|дорог|улиц|вулиц|склад|баз)|направо|налево|праворуч|ліворуч))|${__T[2]}(?:номер\S*|номерн\S*\s+знак\S*)${__T[7]}не\s+(?:подсвечива\S*|підсвічу\S*|освещ\S*|освітлю\S*|видно\s+ночью|видно\s+вночі)|${__T[2]}не\s+(?:горят|горять|горит|горить|работа\S*|працю\S*|включа\S*|вмика\S*)${__T[7]}(?:противотуманк\S*|протитуманк\S*|туманк\S*)|${__T[2]}(?:неисправност\S*|несправн\S*|ошибк\S*|помилк\S*)${__T[7]}(?:освещени\S*|освітленн\S*|наружн\S*\s+свет\S*|зовнішн\S*\s+світл\S*)|${__T[2]}(?<!(?:после|до|перед|після|за|на|від|от|с|з)\s)(?:поворотник\S*|поворот(?:а|у|ы|и|ов|ів)?|мигалк\S*|повторител\S*|повторювач\S*)${__T[6]}(?!\s+(?:руля|керма|ключ\S*|направо|налево|праворуч|ліворуч))\s+${__T[9]}(?:не\s+(?:работа\S*|працю\S*|показ\S*|горит|горить|горят|горять|мига\S*|блима\S*|морга\S*|включа\S*|вмика\S*|выключа\S*|вимика\S*)|(?<!не\s)(?:разбит\S*|розбит\S*|сгорел\S*|згорі\S*|згорів|отвал\S*|відпа\S*|відвал\S*|оторва\S*|відірва\S*|щелка\S*|клаца\S*|треснул\S*|тріснул\S*|(?:морга\S*|мига\S*|блима\S*)\s+(?:сам\S*|(?:очень\s+|дуже\s+)?(?:часто|быстро|швидко))))${__T[6]}|${__T[2]}не\s+(?:работа\S*|працю\S*|горит|горить|горят|горять|мига\S*|блима\S*|морга\S*|показ\S*|включа\S*|вмика\S*)${__T[7]}(?:поворотник\S*|мигалк\S*|повторител\S*|повторювач\S*)${__T[6]})${__T[10]}nicht\s+mehr${__T[26]}in\s+ordnung)${__T[23]}no\s+longer${__T[12]}отремонт\S*|заменил\S*|більше\s+не|больше\s+не|починил\S*|полагод\S*|поменял\S*))`, 'i', 1);








const DOOR_HINT = lbRx(String.raw`${__T[5]}(?:tail\s*-?lift|lift\s*gate|liftgate)\s+${__T[8]}(?:drops|lowers|sinks|creeps\s+down|comes\s+down|bent)${__T[41]}|sorted))|${__T[2]}гідроборт\S*\s+${__T[8]}(?:опуска\S*|просіда\S*|проседа\S*|погнут\S*|зігнут\S*|вигнут\S*)(?![^.;!?]*(?:відремонт\S*|полагодил\S*|отремонт\S*|починил\S*))|${__T[2]}гидроборт\S*\s+${__T[8]}(?:опуска\S*|проседа\S*|погнут\S*)(?![^.;!?]*(?:отремонт\S*|починил\S*))|${__T[1]}(?:ladebordwand|lbw|hebeb(?:ü|ue)hne|hubladeb(?:ü|ue)hne|ladeb(?:ü|ue)hne)${__T[0]}\s+${__T[8]}(?:senkt\s+sich|sackt${__T[7]}(?:ab|durch|runter)|verbogen|krumm|spinnt|zickt|spielt\s+verr(?:ü|ue)ckt|macht\s+(?:gar\s+)?(?:nix|nichts|keinen\s+mucks)|bleibt${__T[7]}(?:h(?:ä|ae)ngen|stecken|stehen)|reagiert\s+nicht|l(?:ä|ae|a)(?:ss|ß)t\s+sich${__T[7]}${__T[13]}(?:bedienen|hochfahren|absenken)${__T[0]}|f(?:ä|ae)hrt\s+(?:gar\s+)?nicht(?:\s+mehr)?(?=\s*(?:$|[.,;!?])))${__RX[17]}|${__T[1]}lbw${__T[0]}\s+(?:(?:ist|geht|hinten|wieder|schon)\s+){0,2}(?:defekt|kaputt|ausgefallen|nicht(?=\s*(?:$|[.,;!?]))|(?:geht|f(?:ä|ae)hrt)${__T[7]}${__T[13]}(?:ganz\s+)?(?:hoch|runter|zu|auf|ein)${__T[0]})${__RX[17]}|${__T[1]}(?:kühlauflieger|kuehlauflieger${__T[33]}fahrer|beifahrer|heck|seiten|schiebe|lade|koffer)?(?:tür|tuer)(?:en|e)?${__T[0]}\s+${__T[8]}(?:geht|gehen|l(?:ä|ae|a)(?:ss|ß)t\s+sich|lassen\s+sich)\s+(?:nur\s+)?(?:noch\s+)?(?:ganz\s+|sehr\s+|total\s+|extrem\s+|richtig\s+)?schwer\s+(?:zu|auf|schlie(?:ß|ss)en|(?:ö|oe)ffnen)${__T[0]}${__RX[17]}|${__T[2]}(?:двер\S*|ролет\S*|роллет\S*)${__T[7]}(?:не\s+(?:замика\S*|запира\S*)|заклинил\S*|заклинило|(?<!не\s)(?:заїда|заеда)\S*)${__RX[0]}|${__T[1]}(?:ladebordwand|hebeb(?:ü|ue)hne)${__T[7]}h(?:ä|ae)ngt${__T[7]}schief${__RX[0]}|${__T[3]}(?:(?:kühlauflieger|kuehlauflieger${__T[33]}heck|lade|seiten|schiebe|flügel|fluegel|fahrer|beifahrer|koffer|kühl|kuehl|auflieger|anhänger)?(?:tür|tuer|tur)(?:en|e)?|palettenk(?:a|ä|ae)sten(?:klappe|deckel|schloss|tür)?|ladebordwand|hebebühne|hubladebühne|ladebühne|ladeklappe|bordwand|bordwände|heckklappe|türverriegelung|türschloss|türverschluss|drehstangenverschluss)\s+${__T[9]}(?:(?:schlie(?:ß|ss)t|schliesst|schließen|schliessen|rastet|rasten|verriegelt)${__T[7]}nicht${__T[0]}|(?:geht|gehen|l(?:ä|ae|a)(?:ss|ß)t\s+sich|lassen\s+sich|ist|sind|fährt|fahren|klappt|klappen)${__T[7]}nicht\s+(?:mehr\s+|richtig\s+|ganz\s+)?(?:zu${__T[0]}|auf${__T[0]}|schließen|schliessen|öffnen|verriegeln|abschließen|hoch${__T[0]}|runter|herunter|ein${__T[0]}|ein(?:klappen|fahren)|hochklappen|hochfahren|geschlossen|verriegelt|eingerastet))|${__T[3]}(?:(?:kühlauflieger|kuehlauflieger${__T[33]}heck|lade|seiten|schiebe|flügel|fahrer|beifahrer|koffer|kühl|auflieger|anhänger)?(?:tür|tuer|tur)(?:en|e)?|palettenk(?:a|ä|ae)sten(?:klappe|deckel|schloss|tür)?|ladebordwand|hebebühne|hubladebühne|ladebühne|ladeklappe|bordwand|heckklappe)\s+${__T[9]}(?:klemmt|klemmen|steht${__T[7]}offen|stehen${__T[7]}offen|springt\s+${__T[9]}auf|springen\s+${__T[9]}auf|h(?:ä|ae|a)ngt${__T[7]}(?:herunter|runter|herab)|nicht\s+(?:richtig\s+|ganz\s+|mehr\s+)?(?:zu${__T[0]}|geschlossen|verriegelt|eingerastet|abschließbar))|${__T[3]}(?:(?:kühlauflieger|kuehlauflieger${__T[33]}heck|lade|seiten|schiebe|flügel|fluegel|fahrer|beifahrer|koffer|kühl|kuehl|auflieger|anhänger)?(?:tür|tuer|tur)(?:en|e)?${__T[0]}|palettenk(?:a|ä|ae)sten(?:klappe|deckel|schloss|tür)?|ladebordwand|hebebühne|hubladebühne|ladebühne|türverriegelung|türschloss|türverschluss|drehstangenverschluss)\S*\s+${__T[8]}(?:defekt|kaputt|ausgefallen|gebrochen)${__T[39]}(?:rear|back|side|cargo|trailer|cab|driver['’]?s?|passenger|barn)\s+)?(?:pallet\s+(?:box|chest)|doors?|tail\s*-?lift|lift\s*-?gate|tail\s*-?gate|door\s+(?:lock|latch)|latch)\s+${__T[9]}(?:${__T[18]}does\s+not|can['’]?t|cannot|can\s+not)${__T[7]}(?:close|shut|lock|latch|open|go\s+(?:up|down)|fold|raise|lower|work)|(?:is\s+|are\s+)?not\s+working|isn['’]?t\s+working|aren['’]?t\s+working|(?:is|are)?\s*not\s+(?:closing|locking|latching|closed|locked|shut|opening)|stuck|stick(?:s|ing)|jam(?:s|med)|(?:keeps\s+)?(?:flying|swinging|popping|came|coming)\s+open|hanging\s+down|broken|faulty)|${__T[4]}(?:ящик\S*\s+для\s+(?:піддон|палет)\S*|(?<!(?:скл|стекл)\S*\s+(?:(?:в|у|на)\s+)?)двер\S*|дверцят\S*|гідроборт\S*|гидроборт\S*|борт(?![а-яіїєґ])|задній\s+борт|замок\s+двер\S*|ворота\s+${__T[14]}рефрижератор|реф)\S*|(?:задн\S*|задні)\s+ворота)\s+${__T[9]}(?:не${__T[7]}(?:закрива|зачиня|закри|зачин|відкрива|відчиня|откры|закры|опуска|підійма|підніма|поднима|працю|работа|фіксу|фиксир)|заклин\S*|заїло|заело|(?:з|по|с)?ламан\S*|сломан\S*|поломан\S*|(?:з|по)?ламал\S*|зламав\S*|сломал\S*|поломал\S*|опуска\S*\s+(?:сам|сама|само|сами)(?![а-яіїєґ])|(?:сам|сама|само|сами)\s+опуска\S*|відчинил\S*\s+на\s+ходу|відкрил\S*\s+на\s+ходу|открыл\S*\s+на\s+ходу)|${__T[1]}(?:ladebordwand|hebebühne|hubladebühne|ladebühne)\s+${__T[9]}(?:geht${__T[7]}nicht${__T[0]}|funktioniert${__T[7]}nicht|senkt\s+sich${__T[7]}(?:ab|von\s+selbst)|sackt${__T[7]}ab)(?!${__T[7]}(?:wieder|behoben|repariert))|${__T[5]}(?:tail\s*-?lift|lift\s*-?gate)\s+${__T[9]}(?:not\s+working|isn['’]?t\s+working|doesn['’]?t\s+work|dead|failed|dropping|drops|sinking|keeps\s+(?:dropping|sinking))(?![a-z])|${__T[1]}(?:ladebordwand|hebebühne|hubladebühne|ladebühne)\s+${__T[9]}(?:fehler\S*|st(?:ö|oe|o)rung|piept|warnton|blinkt|ohne\s+funktion|reagiert${__T[7]}nicht)${__T[0]}(?!${__T[7]}(?:behoben|beseitigt|repariert|weg${__T[0]}|quittiert|gel(?:ö|oe)scht))|${__T[5]}tail\s?lift\s+${__T[9]}(?:fault\S*|error\S*|beep\S*|not\s+working|broken|stuck)|${__T[1]}(?:rolltor|rollt(?:ü|ue)r|rollladen|rolltore|rollt(?:ü|ue)ren)${__T[0]}(?![^.;!?]*(?:kunde\S*|halle|lager\S*|rampe|firma|depot|customer|warehouse))${__RX[19]}\s+${__T[9]}(?:klemmt|klemmen|h(?:ä|ae|a)ngt|defekt|kaputt|(?:geht|gehen|l(?:ä|ae)sst\s+sich)${__T[7]}${__T[13]}(?:auf|zu|hoch|runter|(?:ö|oe)ffnen|schlie(?:ß|ss)en))${__T[0]}${__T[39]}roller\s+shutter|roll-?up\s+door)s?\s+${__T[8]}(?:stuck|jammed|broken|won['’]?t\s+(?:open|close))|${__T[1]}(?:ladebordwand|lbw|hebeb(?:ü|ue)hne|hubladeb(?:ü|ue)hne|ladeb(?:ü|ue)hne)\s+(?:(?:ist|hinten|links|rechts|halb|unten|jetzt|wieder|schon\s+wieder)\s+){0,2}h(?:ä|ae)ngt(?:\s+(?:runter|herunter|unten|durch|fest|halb\s+(?:runter|offen)))?(?=\s*(?:$|[.,;!?]))${__RX[0]}|${__T[3]}(?:fahrer|beifahrer|heck|seiten|schiebe|lade|koffer|kühl|kuehl|auflieger|anhänger)?(?:tür|tuer)(?:en|e)?${__T[0]}\s+${__T[9]}(?:zugefroren|festgefroren|eingefroren|angefroren|vereist|friert${__T[7]}zu|frieren${__T[7]}zu)${__T[0]}(?![^.;!?]*(?:aufgetaut|enteist|wieder\s+(?:auf|offen|frei|ok|in\s+ordnung)|repariert|behoben))${__T[39]}(?:rear|back|side|cargo|trailer|cab|driver['’]?s?|passenger)\s+)?doors?(?!\s+(?:lock|latch|handle|seal|rubber)s?(?![a-z]))\s+${__T[8]}(?:frozen|iced)(?:\s+(?:shut|solid|closed|up))?(?![a-z])(?![^.;!?]*(?:thawed|defrosted|de-?iced|open\s+again|fixed|repaired))|${__T[2]}(?<!(?:замок|замка|замки|ущільнювач|уплотнител|резинк)\S*${__T[7]})(?<!(?:скл|стекл)\S*\s+)двер\S*\s+${__T[8]}(?:примерз\S*|замерз\S*|перемерз\S*|вмерз\S*|обледен\S*|змерзл\S*|примерзл\S*)${__RX[49]}|${__T[2]}(?:примерз\S*|замерз\S*|вмерз\S*|примерзл\S*)${__T[7]}двер\S*${__RX[49]}|${__T[3]}(?:(?:kühlauflieger|kuehlauflieger|kühlkoffer|kuehlkoffer|kofferaufbau|aufbau|heck|seiten|lade|koffer|kühl|kuehl|auflieger|anhänger|fahrer|beifahrer|schiebe|flügel|fluegel)?(?:tür|tuer)(?:en|e)?|ladeklappe|bordwand|heckklappe)${__T[0]}${__T[44]}aufgesprungen|aufgeflogen|aufgeschwungen)${__T[0]}${__RX[50]}|${__T[3]}(?:(?:kühlauflieger|kuehlauflieger|kühlkoffer|kuehlkoffer|kofferaufbau|aufbau|heck|seiten|lade|koffer|kühl|kuehl|auflieger|anhänger|fahrer|beifahrer|schiebe|flügel|fluegel)?(?:tür|tuer)(?:en|e)?|ladeklappe|bordwand|heckklappe)${__T[0]}(?=[^.;!?]*(?:w(?:ä|ae)hrend\s+der\s+fahrt|beim\s+fahren|unterwegs|auf\s+der\s+(?:autobahn|landstra(?:ß|ss)e|stra(?:ß|ss)e)|in\s+der\s+kurve|von\s+(?:selbst|allein|alleine)))${__T[44]}aufgegangen|ge(?:ö|oe)ffnet|aufgemacht)${__T[0]}${__RX[50]}|${__T[3]}(?:w(?:ä|ae)hrend\s+der\s+fahrt|beim\s+fahren|unterwegs|auf\s+der\s+(?:autobahn|landstra(?:ß|ss)e|stra(?:ß|ss)e)|in\s+der\s+kurve|von\s+(?:selbst|allein|alleine))\s+${__T[9]}(?:(?:kühlauflieger|kuehlauflieger|kühlkoffer|kuehlkoffer|kofferaufbau|aufbau|heck|seiten|lade|koffer|kühl|kuehl|auflieger|anhänger|fahrer|beifahrer|schiebe|flügel|fluegel)?(?:tür|tuer)(?:en|e)?|ladeklappe|bordwand|heckklappe)${__T[0]}\s+${__T[8]}(?:aufgegangen|aufgesprungen|aufgeflogen|ge(?:ö|oe)ffnet)${__T[0]}${__RX[50]}${__T[39]}(?:rear|back|side|cargo|trailer|barn|box|load(?:ing)?)\s+)?doors?\s+${__T[9]}(?:swung|flew|burst|blew|popped|sprang)\s+open(?![a-z])${__RX[50]}${__T[39]}(?:rear|back|side|cargo|trailer|barn|box|load(?:ing)?)\s+)?doors?\s+${__T[8]}opened(?![a-z])(?=[^.;!?]*(?:while\s+driving|during\s+(?:the\s+)?(?:drive|trip|journey|transit)|in\s+transit|on\s+the\s+(?:motorway|highway|road|autobahn|move)|by\s+(?:itself|themselves)|on\s+(?:its|their)\s+own))${__RX[50]}${__T[39]}while\s+driving|on\s+the\s+(?:motorway|highway)|in\s+transit)\s*,?\s+${__T[8]}(?:(?:rear|back|side|cargo|trailer|barn|box|load(?:ing)?)\s+)?doors?${__T[7]}(?:opened|(?:swung|flew|came|burst)\s+open)(?![a-z])${__RX[50]}|${__T[2]}(?:(?:с|по|з)ломал\S*|зламав\S*|поламал\S*|поламав\S*)\s+(?:ворота\s+${__T[14]}рефрижератор${__T[21]}двер\S*\s+${__T[14]}рефрижератор)\S*)${__RX[50]}|${__T[2]}(?:на\s+ходу${__T[32]}в\s+пути|на\s+трас\S*)${__T[7]}${__T[49]}\S*\s+(?:ворота\s+${__T[14]}рефрижератор${__T[21]}двер\S*\s+${__T[14]}рефрижератор)\S*)${__RX[50]}|${__T[2]}${__T[49]}\S*\s+(?:ворота\s+${__T[14]}рефрижератор${__T[21]}двер\S*\s+${__T[14]}рефрижератор)\S*)(?=[^.;!?]*(?:на\s+ходу${__T[32]}в\s+пути|на\s+трас\S*))${__RX[50]}|${__T[2]}(?:ворота\s+${__T[14]}рефрижератор${__T[21]}двер\S*\s+${__T[14]}рефрижератор)\S*)\s+${__T[8]}${__T[49]}\S*${__T[7]}(?:під\s+час\s+руху|во\s+время\s+движения|в\s+дороге|в\s+дорозі|в\s+пути|на\s+трас\S*)${__RX[50]}|${__T[2]}(?:на\s+ходу${__T[32]}в\s+пути|на\s+трас\S*)\s+(?:ворота\s+${__T[14]}рефрижератор${__T[21]}двер\S*\s+${__T[14]}рефрижератор)\S*)${__T[7]}${__T[49]}\S*${__RX[50]}|${__T[1]}(?:fahrer|beifahrer|aufbau|heck|seiten|schiebe|koffer)?(?:tür|tuer)(?:en|e)?${__T[7]}(?:geht|gehen|l(?:ä|ae|a)(?:ss|ß)t\s+sich|lassen\s+sich)\s+(?:(?:von\s+)?(?:au(?:ß|ss)en|innen|drau(?:ß|ss)en|drinnen)\s+nicht(?:\s+(?:mehr\s+)?(?:auf|öffnen|oeffnen|zu|schließen|schliessen))?|nur\s+(?:noch\s+)?(?:von\s+)?(?:au(?:ß|ss)en|innen|drau(?:ß|ss)en|drinnen)\s+(?:auf|öffnen|oeffnen|zu|schließen|schliessen))${__T[0]}${__RX[51]}|${__T[1]}(?:verriegelungsstange|verschlussstange|drehstange|t(?:ü|ue)rfeststeller|t(?:ü|ue)rarretierung|t(?:ü|ue)rhalter|t(?:ü|ue)rscharnier|t(?:ü|ue)rverriegelung|t(?:ü|ue)rverschluss)(?:n|s|e|en|es)?${__T[0]}\s+${__T[8]}(?:verbogen|gebrochen|abgebrochen|abgerissen|gerissen|ausgerissen|lose|locker|klemmt|fehlt|defekt|kaputt|h(?:ä|ae)ngt\s+schief|schlie(?:ß|ss)t\s+nicht|greift\s+nicht|rastet\s+${__T[13]}ein|h(?:ä|ae)lt\s+nicht)${__T[0]}${__RX[52]}|${__T[1]}(?:heck|seiten|koffer|lade|aufbau|hinter)(?:t(?:ü|ue)r)(?:en|e)?${__T[0]}${__T[7]}h(?:ä|ae)ng(?:t|en)${__T[7]}schief${__T[0]}${__RX[52]}|${__T[5]}(?:locking\s+(?:bar|rod|cam)|door\s+(?:locking\s+bar|lock\s+rod|hinge|stay|holder|retainer|catch))s?(?![a-z])\s+${__T[8]}(?:bent|broken|snapped|torn\s+off|ripped\s+off|loose|missing|stuck|jammed|damaged)(?![a-z])${__RX[52]}|${__T[2]}(?:запірн|запорн)\S*\s+(?:штанг|тяг)\S*${__T[7]}(?:погнут\S*|зігнут\S*|зігнул\S*|зламан\S*|зламал\S*|сломан\S*|сломал\S*|відірва\S*|оторва\S*|заклин\S*)${__RX[52]}`, 'i', 1);


const DOOR2_HINT = lbRx(String.raw`(?:${__T[1]}${__T[46]}?\s+${__T[8]}(?:geht|gehen|schlie(?:ß|ss|s)t|schlie(?:ß|ss|s)en)\s+nicht(?:\s+mehr)?(?:\s+(?:richtig|ganz|sauber))?(?:\s+zu${__T[0]}|\s*$|(?=\s*[.,;!?]))|${__T[1]}${__T[46]}?${__T[7]}(?:klemt|klempt|klämmt|klemmt\s+immer)${__T[0]}|${__T[1]}${__T[46]}?\s+${__T[8]}(?:geht|gehen|springt|springen|fliegt|fliegen|schwingt)\s+(?:immer\s+|st(?:ä|ae)ndig\s+|dauernd\s+|von\s+(?:allein\S*|selbst)\s+)?(?:w(?:ä|ae)hrend\s+der\s+fahrt|beim\s+fahren|unterwegs|in\s+(?:der\s+)?kurven?)\s+auf${__T[0]}|${__T[1]}(?:heck|seiten|lade|koffer|aufbau)t(?:ü|ue)r(?:en)?[\s-]?(?:griff|hebel)(?:e)?\s+${__T[8]}(?:abgebrochen|ab${__T[0]}|kaputt|defekt|lose|locker|gebrochen|geht\s+nicht|klemmt|abgerissen|verbogen)${__T[0]}|${__T[1]}${__T[46]}?${__T[7]}h(?:ä|ae)ngt${__T[7]}durch${__T[0]}|${__T[1]}(?:t(?:ü|ue)r)?scharnier\S*\s+(?:(?:an|von)\s+der\s+|der\s+)?(?:\S*t(?:ü|ue)r(?:en)?\s+)?(?:\S+\s+)?(?:ausgeschlagen|ausgeleiert|locker|lose|gebrochen|abgerissen|kaputt|defekt)${__T[0]}(?<=t(?:ü|ue)r\S*\s+(?:\S+\s+){0,4}\S+)|${__T[1]}(?:drehstangen|t(?:ü|ue)r)[\s-]?(?:verschl(?:ü|ue|u)ss\S*|riegel|stange)${__T[7]}(?:klemmt|klemmen|klemt|h(?:ä|ae)ngt|kaputt|defekt|abgebrochen|gebrochen|geht\s+nicht|verbogen)${__T[0]}|${__T[5]}doors?\s+(?:keeps?\s+|kept\s+)?(?:flies|flew|flying|swings?|swung|swinging|pops?|popped|popping|comes?|came|coming)\s+open(?![a-z])|${__T[5]}doors?\s+(?:is\s+|are\s+)?(?:sagging|sags)(?![a-z]))${__RX[53]}`, 'i', 1);
const DOOR3_HINT = lbRx(String.raw`${__RX[54]}(?:${__T[1]}(?:heckportal|portalt(?:ü|ue)r(?:en)?|portalrahmen|hecktor(?:rahmen)?)${__T[0]}\s+${__T[8]}(?:verbogen|verzogen|krumm|kaputt|defekt|besch(?:ä|ae|a)digt|eingedr(?:ü|ue)ckt|eingebeult|verbeult|gerissen|klemmt|klemmen|h(?:ä|ae)ngt|h(?:ä|ae)ngen|geht${__T[7]}(?:schwer|nicht)|gehen${__T[7]}(?:schwer|nicht)|schlie(?:ß|ss)t\s+nicht|schlie(?:ß|ss)en\s+nicht|l(?:ä|ae|a)sst\s+sich${__T[7]}nicht)${__T[0]}|${__T[5]}(?:rear\s+portal|portal\s+(?:frame|doors?)|roller\s+shutter)${__T[7]}(?:bent|damaged|jammed|stuck|broken|buckled|won['’]?t\s+(?:open|close|shut))(?![a-z])|${__T[2]}(?:рольставн|ролставн|ролл?ет)\S*${__T[7]}(?:заклин\S*|заїл\S*|заел\S*|не\s+(?:відчиня\S*|відкрива\S*|закрива\S*|зачиня\S*|открыва\S*|закрыва\S*|опуска\S*|підніма\S*|поднима\S*)|злама\S*|сломал\S*|погнут\S*|зігнут\S*)${__T[6]})`, 'i', 1);









const DOOR4_HINT = lbRx(String.raw`${__T[10]}${__T[3]}(?:auf)?geladen|funktioniert\s+wieder|geht\s+wieder|l(?:ä|ae)uft\s+wieder|wieder\s+(?:ok|in\s+ordnung|normal)${__T[23]}sorted|charged|working\s+again|no\s+longer${__T[11]}заменил\S*|полагодил\S*|починил\S*${__T[22]}(?:${__T[1]}(?:lade[\s-]?(?:bord|bort|board)[\s-]?wand|ladebordwnd|lbw|hebeb(?:ü|ue)hne|hubladeb(?:ü|ue)hne|ladeb(?:ü|ue)hne)${__T[0]}\s+(?:[^\s.,;!?]+\s+){0,3}?(?:sinkt\s+(?:(?:immer|langsam|von\s+allein\S*|von\s+selbst|st(?:ä|ae)ndig|wieder|ganz)\s+){0,2}(?:ab|runter|nach\s+unten)|bleibt\s+(?:immer\s+|einfach\s+)?(?:halb\s+|ganz\s+)?(?:oben|unten)|(?:geht|l(?:ä|ae)uft|funktioniert)\s+nur\s+(?:noch\s+)?(?:manuell|von\s+hand|per\s+hand|mit\s+(?:der\s+)?hand(?:pumpe)?)|nur\s+(?:noch\s+)?(?:manuell|von\s+hand|per\s+hand|mit\s+(?:der\s+)?handpumpe)|(?:kann|l(?:ä|ae|a)(?:ss|ß)t\s+sich)\s+${__T[13]}(?:(?:hoch|zu|ein|auf|ab|an)?geklappt|(?:hoch|zu|ein|auf)?klappen|gekippt|kippen|geneigt|neigen|eingefahren|einfahren|ausgefahren|ausfahren)|(?:kippt|neigt\s+sich|klappt)\s+nicht(?:\s+mehr)?|(?:hat\s+)?kein(?:en)?\s+strom|strom\s+(?:ist\s+)?(?:weg|aus)|(?:batterie|akku)\s+(?:ist\s+)?(?:leer|tot|platt|kaputt|defekt)|sicherung\s+(?:ist\s+)?(?:raus|durch|geflogen|rausgeflogen|kaputt|defekt|durchgebrannt)|(?:hydraulik)?pumpe\s+(?:[^\s.,;!?]+\s+)?(?:l(?:ä|ae)uft|geht|springt)\s+nicht|warn(?:flagge|fahne|leuchte|lampe)n?\s+(?:[^\s.,;!?]+\s+)?(?:abgebrochen|ab|kaputt|defekt|fehl(?:t|en)|weg|gebrochen|abgerissen))${__T[0]}|${__T[1]}(?:lade[\s-]?(?:bort|board)[\s-]?wand|lade[\s-]bordwand|ladebordwnd)${__T[0]}\s+(?:(?:ist|hinten|komplett|total|ganz|geht|vom|von|der|dem${__T[25]}ae)nger)\s+){0,3}(?:kaputt|defekt|ausgefallen|nicht|(?:geht|funktioniert|reagiert|f(?:ä|ae)hrt)\s+nicht)${__T[0]}|${__T[1]}(?:(?:hydraulik)?pumpe|sicherung|batterie|akku|warn(?:flagge|fahne)n?|(?:warn|kontroll?)(?:leuchte|lampe)|fernbedienung|bedienteil|schalter)\s+(?:(?:von|an|f(?:ü|ue)r|bei|der|die|dem|vom|am|zur)\s+){0,2}(?:lade[\s-]?(?:bord|bort|board)[\s-]?wand|lbw|hebeb(?:ü|ue)hne)${__T[0]}\s+(?:(?:ist|sind|geht|l(?:ä|ae)uft|hat|hinten|wieder|schon|komplett|immer|noch|dauernd|st(?:ä|ae)ndig)\s+){0,2}(?:raus|durch|geflogen|rausgeflogen|durchgebrannt|leer|tot|abgebrochen|ab|abgerissen|kaputt|defekt|fehl(?:t|en)|weg|nicht|leuchtet|brennt|blinkt|an(?=\s*(?:$|[.,;!?])))${__T[0]}|${__T[1]}kein(?:en)?\s+strom\s+(?:mehr\s+)?(?:an|auf|f(?:ü|ue)r|bei|in)\s+(?:der\s+|die\s+)?(?:lade[\s-]?(?:bord|bort|board)[\s-]?wand|lbw|hebeb(?:ü|ue)hne)${__T[0]}|${__T[5]}(?:tail\s*-?lift|lift\s*gate|liftgate|tuck[\s-]?under(?:\s+lift)?|column\s+lift)\s+(?:[^\s.,;!?]+\s+){0,2}?(?:(?:has\s+)?no\s+power|fuse\s+(?:is\s+)?(?:blown|gone)|(?:pump|motor)\s+(?:is\s+)?(?:not\s+(?:working|running)|dead)|(?:is\s+)?not\s+working|stopped\s+working|buttons?${__T[7]}(?:not\s+responding|dead)|(?:rollers?|cables?|chains?|wires?)${__T[7]}(?:snapped|broken|torn|frayed)|tilts?\s+(?:to\s+|on\s+)?one\s+side|not\s+level|jerks|judders|battery\s+(?:is\s+)?(?:flat|dead)|won['’]?t\s+(?:charge|come\s+out)|not\s+charging|(?:only\s+manual|manual\s+only|only\s+works\s+manually)|won['’]?t\s+tilt|not\s+tilting|keeps\s+(?:going|dropping|sinking)\s+down|stays\s+(?:up|down)|flags?\s+(?:are\s+|is\s+)?(?:broken|missing|snapped)|warning\s+light\s+(?:is\s+)?on)(?![a-z])|${__T[5]}(?:warning\s+light|fuse|pump|motor|battery|ramp|flap|roller|platform)s?\s+(?:for|on|of)\s+(?:the\s+)?(?:tail\s*-?lift|liftgate)\s+(?:is\s+|are\s+)?(?:on|blown|dead|flat|not\s+working|damaged|bent|broken|cracked|snapped)(?![a-z])|${__T[2]}г[іи]дроборт\S*${__T[7]}(?:без\s+(?:струму|живлення|питания|тока)|не\s+(?:нахиля|наклоня|склад|реаг|выдвига|висува)\S*|(?<!не\s)(?:пищ|застр|заклин)\S*)|${__T[2]}(?:застр|заклин)\S*${__T[7]}г[іи]дроборт|${__T[2]}(?:нема(?:є)?|нет)\s+(?:струму|живлення|питания|тока)\s+(?:на|у|в)\s+(?:гідроборт|гидроборт)\S*|${__T[1]}(?:lade[\s-]?(?:bord|bort|board)[\s-]?wand|lbw|hebeb(?:ü|ue)hne|hubladeb(?:ü|ue)hne|ladeb(?:ü|ue)hne)${__T[0]}\s+(?:[^\s.,;!?]+\s+){0,3}?(?:f(?:ä|ae)hrt|geht|sinkt|rutscht|kommt|senkt\s+sich)\s+(?:von\s+(?:alleine?|selbst)|immer\s+wieder|st(?:ä|ae)ndig|langsam)\s+(?:runter|nach\s+unten|ab|herunter)${__T[0]}|${__T[1]}(?:lade[\s-]?(?:bord|bort|board)[\s-]?wand|lbw|hebeb(?:ü|ue)hne|hubladeb(?:ü|ue)hne|ladeb(?:ü|ue)hne)${__T[0]}\s+(?:[^\s.,;!?]+\s+){0,3}?(?:rolle|r(?:ö|oe)llchen|anfahrrolle|abrollsicherung|kippsicherung|scharnier|bolzen|zylinder|kette|plattform)\S*${__T[7]}(?:abgebrochen|gebrochen|abgerissen|ausgerissen|verbogen|kaputt|defekt|fehlt)${__T[0]}|${__T[1]}(?:lade[\s-]?(?:bord|bort|board)[\s-]?wand|lbw|hebeb(?:ü|ue)hne|hubladeb(?:ü|ue)hne|ladeb(?:ü|ue)hne)${__T[0]}\s+(?:[^\s.,;!?]+\s+){0,4}?(?:stehen\s?geblieben|h(?:ä|ae)ngen\s?geblieben|(?:bleibt|blieb)\s+${__T[8]}(?:stehen|h(?:ä|ae)ngen))${__T[0]})`, 'i', 1);

const DOOR5_HINT = lbRx(String.raw`${__RX[54]}(?![^.;!?]*(?:офис\S*|офіс\S*|склад\S*|цех\S*|здани\S*|будівл\S*|туалет\S*|душ\S*))(?:${__T[2]}(?:двер\S*|двері)${__T[7]}(?<!не\s)(?:открывается|открываются|открылась|открылись|відчиняється|відчиняються|відчинилася|відчинилися|відкривається|відкриваються|распахива\S*|распахнул\S*|розчиня\S*)\s+(?:(?:сам\S*|сама|сами)\s+)?(?:на\s+ходу${__T[32]}в\s+поворот\S*|на\s+поворот\S*|на\s+кочк\S*|на\s+ямах)|${__T[2]}(?:двер\S*|двері)${__T[7]}(?<!не\s)(?:провисл\S*|провис|провисає|провиса\S*|просел\S*|просела|просіл\S*|просіла|просіли|перекосил\S*|перекосило|перекошен\S*|перекосилися|перекошені|покосил\S*)${__T[6]}|${__T[2]}(?:петл\S*|ручк\S*)\s+(?:(?:на|у|в|від|с|з)\s+)?(?:\S+\s+)?(?:двер\S*|двері)${__T[7]}(?<!не\s)(?:оторвал\S*|отвалил\S*|відвалил\S*|відірвал\S*|сломал\S*|зламал\S*|сломан\S*|зламан\S*|разболтал\S*|болта\S*|люфт\S*|выломал\S*|вирвал\S*|вырвал\S*)|${__T[2]}(?:двер\S*|двері)${__T[7]}(?:не\s+(?:захлопыва\S*|защелкива\S*|зачиня\S*|защелкнул\S*|фиксиру\S*|фіксу\S*)|(?:плохо|туго|погано|насилу|еле|ледве|ледь|с\s+трудом|з\s+трудом|важко|тяжело)\s+(?:закрыва\S*|закрива\S*|зачиня\S*|открыва\S*|відчиня\S*|відкрива\S*|захлопыва\S*))|${__T[2]}(?<!центральн\S*\s+)(?:штанг\S*|запор\S*|ригел\S*|засов\S*|засув\S*|замок|замк\S*)(?!\s+(?:зажиган\S*|запалюван\S*|рул\S*|керм\S*|бак\S*|бардач\S*|капот\S*|ящик\S*|сейф\S*|ремн\S*|ремен\S*|пояс\S*|сідл|седл))\s+${__T[8]}(?:заклинил\S*|заклинило|заклинив|заклинен\S*|заел\S*|заело|заїл\S*|заїло|не\s+(?:заходит|заходить|открыва\S*|відкрива\S*|відчиня\S*|закрыва\S*|закрива\S*|провора\S*|поверта\S*|повертаєт\S*)))`, 'i');



const STUCK_HINT = lbRx(String.raw`festgefahren|steckengeblieben|stecken\s+geblieben|${__T[3]}eingesunken|${__T[3]}(?:lkw|fahrzeug|auflieger|anhänger|anhaenger|zugmaschine|sattelzug|zug|wagen|ich|wir)${__T[44]}steckt|stecke|stecken|sitzt|sitze|sitzen|h(?:ä|ae|a)ngt|hänge|h(?:ä|ae|a)ngen)\s+${__T[9]}fest${__T[0]}|${__T[3]}(?:im|in\s+der|in\s+den|auf\s+der)\s+(?:schlamm|matsch|schnee|graben|sand|acker|wiese|böschung|baustelle)\s+${__T[8]}(?:fest${__T[0]}|eingesunken|stecken)|${__T[3]}(?:räder|reifen|antriebsräder)\s+${__T[8]}drehen${__T[7]}durch|${__T[3]}(?:komme|kommt|kommen|schaffe|schafft|schaffen)${__T[44]}berg|steigung|hang|rampe|auffahrt|anstieg)\s+${__T[9]}${__T[13]}(?:hoch|rauf|hinauf)${__T[0]}${__T[39]}stuck|bogged\s+down|sunk)\s+in\s+(?:the\s+)?(?:snow|mud|ditch|sand|ice|field|verge|soft\s+ground)${__T[39]}truck|lorry|vehicle|trailer|tractor|rig|we|we['’]?re|i['’]?m|i\s+am)\s+(?:is\s+|are\s+|am\s+|got\s+|get\s+|have\s+got\s+)?(?:stuck|bogged\s+down)(?![a-z])(?!\s+in\s+(?:neutral|gear|reverse|\d+(?:st|nd|rd|th)|first|second|third|fourth|fifth|sixth)(?![a-z]))|(?<![a-z])wheels?\s+(?:are\s+|keep\s+)?spinning|(?<![a-z])can['’]?t\s+(?:get|make\s+it)\s+up\s+the\s+(?:hill|ramp|slope|incline)|${__T[4]}(?<!(?:ключ|ключі|карт|картк|карточк|г[іи]дроборт)\S*${__T[7]})(?<!(?:камень|камінь|камінець|камешек|гвоздь|цвях)\s+(?:\S+\s+){0,3})(?:застря(?![^\s.,;!?]*${__T[7]}(?:(?:на|в|у)\s+нейтрал|между\s+(?:колес|шин|скат)|між\s+(?:колес|шин|скат)|(?:в|у)\s+протектор|г[іи]дроборт))\S*(?!${__T[7]}(?:в|у)\s+(?:замку|замке|запалюван|зажиган|тахограф))|(?<!(?:зчеплення|сцеплени[ея])${__T[7]})(?:забукс|буксу)[^\s.,;:!?]*(?![^\s.,;:!?])(?!${__T[7]}(?:зчеплення|сцеплени))|грузов\S*\s+сів\S*)|не\s+(?:можу|може|можемо|могу|может)${__T[7]}(?:виїхати|выехать|піднятися|подняться|заїхати|заехать)\s+${__T[8]}(?:на\s+)?(?:гор\S*|підйом\S*|подъем\S*|пандус\S*|снігу|снегу|бруд\S*|гряз\S*|багн\S*)|${__T[1]}(?:im|in\s+den|in\s+einen|im\s+stra(?:ß|ss)en)\s*graben${__T[0]}|${__T[1]}(?:ins|im|vom)\s+bankett${__T[7]}(?:abgerutscht|gerutscht|eingesunken|eingesackt|festgefahren|steckt)${__T[39]}in|into)\s+(?:a|the)\s+ditch(?![a-z])|${__T[2]}(?:у|в)\s+кювет\S*`, 'i');
const FUEL_HINT = lbRx(String.raw`falsch\s+${__T[8]}(?:getankt|betankt)|falsche[nmrs]?\s+(?:kraftstoff|sprit|treibstoff)|fehlbetank|(?:adblue|harnstoff|adblau)\S*\s+${__T[9]}(?:in\s+den|in|im|ins|statt|anstatt)${__T[7]}(?:diesel|kraftstoff)|benzin\S*\s+${__T[9]}(?:in\s+den|im|ins)${__T[7]}(?:diesel|kraftstoff|tank)|(?:diesel|${__T[1]}(?<!(?:kein|keine|ohne|nicht)\s)(?:benzin|(?:scheiben)?(?:wasch)?wasser|scheibenreiniger|scheibenklar|k(?:ü|ue)hl(?:wasser|mittel)|frostschutz\S*|(?:motor)?(?:ö|oe)l))\s+${__T[9]}(?:in\s+den|in|im|ins|statt|anstatt)${__T[7]}(?:adblue|harnstoff)|(?:benzin|super(?:\s+e10)?)\s+(?:statt|anstatt)\s+diesel|benzin\s+getankt|wrong\s+fuel|mis-?fuel|(?:filled|fuelled|fueled)\s+${__T[8]}with\s+(?:petrol|gasoline)|(?:adblue|def|petrol|gasoline)\s+${__T[8]}in(?:to)?\s+(?:the\s+)?(?:diesel|fuel)[\s-]?tank|adblue${__T[7]}instead\s+of\s+diesel|(?:diesel|${__T[5]}(?:petrol|(?:screen|windscreen|windshield)\s+wash(?:er)?(?:\s+fluid)?|washer\s+fluid|water|coolant|antifreeze|oil))\s+${__T[8]}in(?:to)?\s+(?:the\s+)?(?:adblue|def)[\s-]?tank|(?:залив|залил|заправи|заправил)\S*\s+${__T[9]}(?:не\s+т[еоу]|неправильн|бензин)|неправильн\S*\s+(?:пальн|палив|топлив)|(?:adblue|адбл(?:ю|у)\S*|бензин\S*|сечовин\S*|мочевин\S*)\s+${__T[8]}(?:в|у)\s+(?:дизельн\S*|паливн\S*|топливн\S*)\s+бак|(?:adblue|адбл(?:ю|у)\S*|бензин\S*|сечовин\S*|мочевин\S*)\s+${__T[8]}(?:в|у)\s+(?:бак\s+)?(?:для|під|под)\s+(?:дизел\S*|солярк\S*|пальн\S*|палив\S*|топлив\S*)|(?:adblue|адбл(?:ю|у)\S*|бензин\S*|сечовин\S*|мочевин\S*)\s+${__T[8]}(?:в|у)\s+(?:бак\s+(?:з|с|із)\s+)?(?:дизел\S*|соляр\S*|дизпалив\S*)|${__T[2]}(?<!не\s)(?:перепутал|переплутал|переплутав)\S*${__T[7]}(?:бак|баки|баков|бака|пистолет\S*|пістолет\S*|колонк\S*)${__T[6]}|${__T[1]}(?<!nicht\s)(?:tank|t(?:ä|ae)nke|zapfpistole|zapfs(?:ä|ae)ule)\s+verwechselt|(?:дизель|дизпалив|солярк|соляр)\S*\s+${__T[8]}(?:в|у)\s+(?:бак\s+)?(?:для\s+)?(?:adblue|адбл(?:ю|у)\S*|сечовин\S*|мочевин\S*)|${__RX[7]}(?<![a-z])put${__T[7]}(?:petrol|gasoline)\s+in(?:to)?(?![a-z])(?![^.;!?]*(?:generator|jerry|mower|\bcar\b|\bcan\b))${__RX[7]}`, 'i');




const TACHO_HINT = lbRx(String.raw`fahrtenschreiber|fahrtschreiber|tachogra(?:ph|f)|kontrollger(?:ä|ae|a)t|fahrer-?karte|driver(?:['’]?s)? ?card|tacho(?!meter)|тахограф|тахокарт|${__T[2]}тахо${__T[6]}|водійськ\S*\s+картк|картк\S*\s+водія|карт[аиуі]\s+водія|карт\S* водител|${__T[3]}(?:geschwindigkeits(?:sensor|geber)|impulsgeber|kitas)${__T[0]}|${__T[5]}(?<!(?:wheel|abs)\s)(?:vehicle\s+)?speed\s+sensor|${__T[2]}датчик\S*\s+(?:швидкост|скорост)(?![а-яіїєґё]*\s+(?:колес|коліс|обертан|вращен))`, 'i', 1);




const TACHO2_HINT = lbRx(String.raw`^(?![\s\S]*(?:repariert|erneuert|getauscht|ersetzt|behoben|nachgelegt|eingelegt|geht\s+wieder${__T[26]}in\s+ordnung|lesbar)|neue\s+karte\s+(?:bekommen|erhalten|ist\s+da)${__T[23]}refilled|working\s+again|works\s+again|відремонт\S*|отремонт\S*|замінил\S*|заменил\S*|знову\s+працю\S*|снова\s+работа\S*))(?:[\s\S]*?(?:${__T[3]}(?:dtco|dtc0|massenspeicher|mass\s+memory|digitaler?\s+tacho\S*)${__T[0]}|${__T[3]}(?:kalibrierung|kalibrierdatum|kalibrierungsdatum|57b(?:-pr(?:ü|ue)fung)?)\s+${__T[8]}(?:abgelaufen|f(?:ä|ae)llig|(?:ü|ue)berf(?:ä|ae)llig|(?:ü|ue)berschritten|vorbei))|(?![\s\S]*(?:${__T[3]}(?:tank|zapf|kasse|ec${__T[0]}|ec-|bank|kredit|giro|pin${__T[0]}|maut|obu|schl(?:ü|ue)ssel|sim${__T[0]}|speicher(?!karte)|park|waschanlage|automat|b(?:ü|ue)ro|office|pump|fuel|credit|debit|petrol|diesel|toll|key)|заправ|азс|паливн|топливн|банк|кас[аиіу]|пін|пин|ключ|офіс|офис))[\s\S]*?(?:${__T[1]}(?:meine\s+)?karte${__T[0]}\s+(?:[^\s.,;!?]+\s+){0,3}?(?:steckt${__T[7]}fest|klemmt|h(?:ä|ae)ngt\s+fest|kommt${__T[7]}${__T[13]}(?:raus|heraus)|geht${__T[7]}${__T[13]}(?:rein|raus|hinein|heraus)|l(?:ä|ae)sst\s+sich${__T[7]}${__T[13]}(?:\S+\s+)?(?:einstecken|stecken|ziehen|entnehmen|auswerfen)|wird${__T[7]}${__T[13]}(?:gelesen|erkannt|ausgeworfen)|(?:ist\s+)?(?:nicht\s+lesbar|unlesbar)|(?:zu\s?hause|daheim|zuhause)\s+(?:vergessen|liegen\s+(?:ge)?lassen))|${__T[1]}kartenfehler${__T[0]}|${__T[1]}karten(?:leser|lesegerät|lesegeraet|schacht|slot|einschub)${__T[0]}\s+${__T[8]}(?:kaputt|defekt|klemmt|blockiert${__T[27]}fehler|zeigt\s+fehler|spinnt|nimmt\s+(?:die\s+)?karte\s+nicht)|${__T[1]}fahrkarte${__T[0]}\s+${__T[8]}(?:gesteckt|eingesteckt|steckt|stecken|gelesen|lesen|erkannt|schacht|klemmt|fehler)|${__T[1]}(?:papierrolle|druckerpapier|druckpapier|thermopapier|papier)${__T[0]}\s+${__T[9]}(?:leer|alle|aus${__T[0]}|zu\s+ende|aufgebraucht)|${__T[1]}kein(?:e)?\s+(?:papier|papierrolle|druckerpapier)${__T[0]}\s+(?:mehr\s+)?(?:im|in\s+dem|f(?:ü|ue)r\s+(?:den|die)|zum)\s+(?:drucker|ausdruck|ausdrucken|gerät|geraet)|${__T[1]}drucker${__T[0]}\s+${__T[8]}(?:druckt\s+nicht|geht\s+nicht|kaputt|defekt|klemmt|papierstau)|${__T[1]}ausdruck${__T[0]}\s+(?:geht|klappt|funktioniert)\s+nicht|${__T[1]}(?:kann|konnte|k(?:ö|oe)nnen)${__T[7]}${__T[13]}(?:aus)?drucken|${__T[5]}card\s+${__T[8]}(?:stuck|jammed|won['’]?t\s+(?:come\s+out|go\s+in|eject|read)|not\s+(?:reading|read|recogni[sz]ed|ejecting)|unreadable|left\s+at\s+home)|${__T[5]}card\s+(?:slot|reader)${__T[7]}(?:jammed|stuck|broken|faulty|not\s+working|blocked)|forgot\s+(?:my\s+)?card(?![a-z])|${__T[5]}printer${__T[7]}(?:out\s+of\s+paper|not\s+printing|jammed|broken)|${__T[5]}(?:no|out\s+of)\s+paper(?![a-z])(?!\s+(?:towels?|tissues?|work))|paper\s+roll${__T[7]}(?:empty|ran\s+out|finished)|${__T[2]}карт\S*${__T[7]}не\s+(?:читається|читается|зчитується|считывается|розпізна\S*|распозна\S*|виходить|выходит|вставляється|вставляется|виймається|вынимается)|${__T[2]}карт\S*${__T[7]}застря\S*|${__T[2]}застря\S*\s+карт\S*|${__T[2]}забу[влла]\S*${__T[7]}карт\S*|${__T[2]}(?:закінчи\S*|(?:за)?конч\S*|нема\S*|немає|нет)${__T[7]}(?:папір|папер\S*|бумаг\S*|рулон\S*)|${__T[2]}(?:папір|папер\S*|бумаг\S*)${__T[7]}(?:закінчи\S*|(?:за)?конч\S*|нема\S*)|${__T[2]}принтер\S*${__T[7]}не\s+(?:друкує|печатает|працює|работает)))`, 'i', 1);









const ADAS_HINT = lbRx(String.raw`${__T[3]}(?:(?:notbrems|abbiege|spurhalte|spurverlassens|spur|spurwechsel|totwinkel|toter-winkel|brems|abstands|fahr|fahrer)assistent(?:en|s)?|notbremssystem|notbremsassistenz|abbiegeassistenz|spurhalteassistenz|tempomat|abstandstempomat|abstandsregeltempomat|abstandsregelung|assistenzsystem(?:e|en)?|assistent(?:en)?|(?:rückfahr|rueckfahr|seiten|front|spiegelersatz)?kamera(?:s)?|kamerasystem|kamera-monitor-system|kameramonitor(?:e|en)?|kamerabildschirm(?:e)?|spiegelersatzsystem|radarsensor(?:en)?|abstandssensor(?:en)?)${__T[0]}\s+${__T[9]}(?:ausgefallen|fällt\s+aus|faellt\s+aus|spinnt|spinnen|geht\s+nicht|gehen\s+nicht|funktioniert\s+nicht|funktionieren\s+nicht|defekt|kaputt|fehler\S*|störung|gestört|nicht\s+verfügbar|nicht\s+verfuegbar|ohne\s+funktion|zeigt\s+nichts|zeigt\s+kein\s+bild|bild\s+(?:ist\s+)?schwarz|schwarz${__T[0]}|beschlagen|verschmutzt|verdreckt|zugeschneit|vereist|flackert|unscharf|bremst${__T[7]}(?:grundlos|ohne\s+grund|einfach\s+so)|hat${__T[7]}(?:grundlos|ohne\s+grund)\s+gebremst|löst${__T[7]}(?:grundlos|ständig)\s+aus|(?:piept|piepst|warnt)${__T[7]}(?:st(?:ä|ae)ndig|dauernd|ununterbrochen|grundlos|ohne\s+grund))|${__T[3]}(?:fehler\S*|störung|ausfall|warnung)\s+${__T[8]}(?:des\s+|der\s+|vom\s+|am\s+|im\s+|beim\s+)?(?:notbrems|abbiege|spurhalte|abstands|totwinkel)\S*|phantombremsung|fehlauslösung\s+${__T[8]}(?:notbrems|bremsassist)\S*|${__T[3]}(?:lkw|fahrzeug|zugmaschine|er)\s+${__T[8]}(?:bremst|bremste|hat)\s+${__T[8]}(?:grundlos|ohne\s+grund)\s*(?:gebremst|voll|stark)?${__T[39]}emergency\s+brak(?:e|ing)(?:\s+(?:assist|system))?|aebs|blind\s+spot\s+(?:assist|system|camera|sensor|warning)|turn(?:ing)?\s+assist(?:ant)?|lane\s+(?:keep(?:ing)?|departure)\s+(?:assist|warning|system)|adaptive\s+cruise(?:\s+control)?|cruise\s+control|driver\s+assist(?:ance)?(?:\s+systems?)?|(?:rear(?:view)?|reversing|side|mirror|front)\s+cameras?|camera\s+(?:system|monitor)|radar\s+sensors?)\s+${__T[9]}(?:not\s+working|doesn['’]?t\s+work|isn['’]?t\s+working|failed|fault|error|unavailable|disabled|broken|black|blank|fogged(?:\s+up)?|misted(?:\s+up)?|dirty|blurry|flickering|out(?![a-z]))|phantom\s+brak(?:e|ing)|brak(?:ed|es|ing)\s+${__T[8]}for\s+no\s+reason|${__T[4]}(?:асистент\S*|ассистент\S*|круїз\S*|круиз\S*|(?:датчик\S*|сенсор\S*)\s+(?:мертв\S*|сліп\S*|слеп\S*)\s+зон\S*|(?:датчик\S*|сенсор\S*)\s+(?:парков\S*|паркуван\S*)|систем\S*\s+(?:екстрен\S*|аварійн\S*|экстренн\S*)\s+гальмуван\S*|камер\S*|радар\S*)\s+${__T[9]}(?:${__T[43]}|помилк\S*|ошибк\S*|вийшл\S*\s+з\s+ладу|вийшов\s+з\s+ладу${__T[28]}не\s+показу\S*|не\s+показыва\S*|запітніл\S*|запотел\S*|брудн\S*|забрудн\S*|грязн\S*|мерехт\S*)|${__T[4]}(?:гальму\S*|тормоз\S*)\s+${__T[8]}(?:без\s+причини|без\s+причины)|${__T[3]}(?:rückfahrwarner|rueckfahrwarner|rückfahrwarneinrichtung|rückfahrwarnsystem|rückfahrpiepser|rückwärtswarner|rückfahrwarnsignal|rueckfahrwarnsignal|rückfahrwarnton|rückfahrsignal|rückfahrpieper)\s+${__T[9]}(?:piept\s+nicht|ist\s+stumm|stumm${__T[0]}|ausgefallen${__T[27]}defekt|kaputt)${__T[39]}reversing|reverse|back-?up)\s+(?:alarm|beeper|buzzer)s?\s+${__T[9]}(?:not\s+working|doesn['’]?t\s+work|isn['’]?t\s+working|silent|failed|broken|dead)(?![a-z])|${__T[4]}(?:сигнал\S*|зумер\S*|пищалк\S*)\s+(?:заднього|заднего)\s+ход\S*\s+${__T[8]}(?:${__T[43]}|мовчить|молчит|злама[внл]\S*|сломан\S*)|${__T[3]}tempomat\S*\s+${__T[9]}(?:schaltet\s+sich${__T[7]}(?:ab|aus)${__T[0]}|l(?:ä|ae|a)sst\s+sich${__T[7]}${__T[13]}(?:ein|aus|ab)schalten|beschleunigt${__T[7]}(?:von\s+selbst|allein|grundlos))|(?<![a-z])cruise\s+control\s+${__T[8]}${__T[38]}\s+not|will\s+not)\s+(?:turn|switch)\s+(?:on|off)|${__RX[7]}${__T[5]}(?:lane\s+(?:assist|keeping(?:\s+assist)?|departure(?:\s+warning)?)|emergency\s+brak(?:e|ing)(?:\s+assist(?:ant)?)?|aebs|collision\s+warning|adaptive\s+cruise(?:\s+control)?|acc(?![a-z]))\s+${__T[9]}(?:faulty|fault|not\s+working|broken|error|failed|activat\S*\s+(?:for\s+no\s+reason|by\s+itself|on\s+its\s+own)|brak\S*\s+for\s+no\s+reason|keeps\s+(?:beeping|braking|activating))(?![a-z])${__RX[7]}|${__RX[7]}${__T[2]}(?:автоматичн\S*|екстрен\S*|аварійн\S*)\s+гальмуванн\S*${__T[7]}(?:спрацьову\S*|спрацював\S*|спрацювало)|${__T[2]}(?:автоматическ\S*|экстренн\S*)\s+торможени\S*${__T[7]}(?:срабатыва\S*|сработал\S*)${__RX[7]}`, 'i', 1);


const ADAS2_HINT = lbRx(String.raw`(?:${__T[1]}(?:(?:abbiege|spurhalte|spurwechsel|spur|totwinkel|toter-winkel|notbrems|abstands)\s?(?:assistent\S*|assistenz|warner\S*|warnung)|totwinkelwarner\S*|toter\s+winkel\s+(?:assistent|warner|warnung)\S*|abstandsradar\S*|radar(?:sensor(?:en)?)?|spiegelkamera\S*|mirror\s?cam\S*|kamera(?:bild|monitor|display)\S*|kamera\s+bild)\s+${__T[9]}(?:piept|piepst|pfeift|schl(?:ä|ae)gt\s+${__T[8]}an${__T[0]}|warnt${__T[7]}(?:die\s+ganze\s+zeit|immer|andauernd|st(?:ä|ae)ndig|dauernd|grundlos|ohne\s+grund)|vibriert${__T[7]}(?:die\s+ganze\s+zeit|andauernd|st(?:ä|ae)ndig|dauernd|grundlos|ohne\s+grund)|geht\s+nicht|ausgefallen|f(?:ä|ae)llt\s+aus|kaputt|defekt|schwarz|flackert|verzerrt|verschmutzt|blockiert|zugeschneit|vereist|gest(?:ö|oe)rt|spinnt|funktioniert\s+nicht|zeigt\s+nichts|fehler\S*|st(?:ö|oe)rung)${__T[0]}|${__T[1]}(?:notbremse|notbremsung|lkw|fahrzeug|zugmaschine|wagen|er)\s+${__T[8]}(?:bremst|bremste|macht\s+${__T[8]}vollbremsung)\s+${__T[8]}(?:von\s+(?:alleine?|selbst)|einfach\s+so|alleine?${__T[0]}|grundlos|ohne\s+grund)|${__T[1]}notbremsung\s+${__T[8]}(?:ohne\s+grund|grundlos|einfach\s+so|von\s+(?:alleine?|selbst))|${__T[5]}(?:blind\s+spot\s+(?:warning|assist|sensor|system|camera|monitor)|lane\s+assist|turn(?:ing)?\s+assist\S*|mirror\s?cams?|camera\s+(?:screen|picture|image|display|monitor)|radar(?:\s+sensor)?|collision\s+warning)\s+${__T[9]}(?:keeps\s+(?:beeping|going\s+off|flashing|warning)|beeping\s+(?:all\s+the\s+time|constantly|for\s+no\s+reason)|blocked|black|blank|flickering|distorted|not\s+working|failed|faulty|dirty|error)(?![a-z])|${__T[2]}(?:асистент\S*|ассистент\S*|камер\S*|радар\S*)\s+${__T[9]}(?:пищить|пищит|пікає|пикает|чорн\S*|черн\S*|блима\S*|мига\S*|мерехт\S*|заблокован\S*))${__RX[7]}|${__T[2]}камер\S*\s+${__T[8]}(?:мутн\S*|розмит\S*|размыт\S*|запотіл\S*|запотел\S*)${__RX[38]}|${__T[2]}камер\S*\s+${__T[9]}(?:нічого|ничего)\s+не\s+(?:видно|показує|показывает)${__RX[38]}`, 'i', 1);


const STEER_HINT = lbRx(String.raw`${__T[1]}f(?:ä|ae)hrt${__T[7]}${__T[13]}gerade(?:aus)?${__T[0]}${__RX[31]}|${__T[1]}f(?:ä|ae)hrt\s+${__T[8]}schwimmt${__T[0]}(?!\s+(?:im|ins|in\s+(?:der|dem|den)|auf\s+dem\s+wasser)\s)${__RX[31]}|${__T[4]}(?:вантажівк\S*|машин\S*|тягач\S*|фур[уаи]|авто)${__T[7]}(?:водить|водит|кидає|кидает|носить|носит|нишпорить|рискає|рыскает)(?![а-яіїєґ])${__RX[31]}|${__T[1]}kein(?:e|en)?\s+(?:servo|lenkhilfe|servolenkung|servounterst(?:ü|ue)tzung)${__T[0]}(?:\s+mehr)?${__RX[9]}|(?:(?:${__T[1]}spurstange(?:nkopf|nköpfe|nkoepfe|n)?${__T[7]}(?:verbogen|ausgeschlagen|gebrochen|krumm|locker|hat\s+spiel)${__T[0]}${__T[39]}tie|track|steering)\s?rods?(?:\s+ends?)?${__T[7]}(?:bent|worn|loose|broken|has\s+play)|(?<![a-z])drag\s+link${__T[7]}(?:bent|worn|loose|broken)|${__T[2]}(?:рульов\S*|рулев\S*)\s+(?:тяг\S*|наконечник\S*)${__T[7]}(?:погнут\S*|зігнут\S*|зношен\S*|изношен\S*|люфт\S*${__T[30]}розбит\S*|разбит\S*))${__RX[0]}|${__T[2]}люфт\S*\s+(?:в\s+|у\s+)?(?:керм\S*|рул\S*)${__RX[0]}|${__T[1]}(?:lkw|fahrzeug|zugmaschine|sattelzug|gespann|wagen|lenkung)\s+(?:[^\s.,;!?]+\s+){0,3}?(?:schwimmt|schwammig|wandert)${__T[0]}(?!\s+(?:in\s+die|ins|zur|zum|nach|in\s+den)\s)(?!\s+(?:im|ins|in\s+(?:der|dem|den))\s+(?:wasser|hochwasser|graben|see|fluss|bach|pf(?:ü|ue)tze))${__RX[10]}|${__T[5]}(?:truck|lorry|vehicle|rig|steering|wagon|artic|unit|tractor)\s+${__T[8]}(?:wanders|wandering|is\s+floaty|feels\s+floaty|feels\s+vague|is\s+vague)(?![a-z])${__RX[10]}|${__T[2]}(?:кермо|руль)${__T[7]}(?:гуляє|гуляет|гуляют|гуляють)|${__T[3]}(?:lenkung|lenkrad|servolenkung)\s+${__T[8]}(?:schwer${__T[0]}|locker${__T[0]}|lose${__T[0]}|spielt|ziet|blokier\S*)${__T[39]}rul|rulya)${__T[7]}(?:tug\S*|tyazh\S*|ne\s+krut\S*|lyuft\S*)|${__T[3]}(?:servolenkung|lenkung|lenkhilfe|lenkrad(?:es|s)?|lenkgetriebe|lenkachse|zwangslenkung|spurstange)${__T[0]}\s+${__T[9]}(?:zieht|zog|ausgeschlagen|schwerg(?:ä|ae|a)ngig|geht${__T[7]}schwer|ist${__T[7]}schwer|sehr\s+schwer|hat${__T[7]}spiel|spiel${__T[0]}|wackelt|flattert|vibriert|zittert|schl(?:ä|ae)gt|blockiert|klemmt|hakt|ausgefallen|f(?:ä|ae|a)llt\s+aus|defekt|kaputt|fehler\S*|st(?:ö|oe|o)rung|steht\s+schief|schief${__T[0]}|reagiert${__T[7]}(?:nicht|kaum|verz(?:ö|oe|o)gert))|${__T[3]}(?:fehler\S*|st(?:ö|oe|o)rung|ausfall|warnung|warnmeldung)\s+${__T[8]}(?:der\s+|an\s+der\s+|im\s+)?(?:servolenkung|lenkung|lenkhilfe|lenkgetriebe)${__T[0]}|${__T[3]}(?:lkw|fahrzeug|zugmaschine|auflieger|er|wagen)\s+${__T[8]}(?:zieht|zog)\s+${__T[9]}nach\s+(?:links|rechts)${__T[0]}${__T[39]}power\s+)?steering(?:\s+wheel)?\s+${__T[9]}(?:pulls|pulling|pulled|heavy|stiff|hard|has\s+${__T[9]}play|play(?![a-z])|loose|wobbl\S*|vibrat\S*|shak\S*|locked|locks|jam\S*|failed|fail(?:s|ure)|fault|error|not\s+working|doesn['’]?t\s+work|isn['’]?t\s+working|crooked|off[-\s]cent(?:er|re))${__T[39]}truck|vehicle|lorry|it)\s+${__T[8]}pull(?:s|ing|ed)?\s+${__T[8]}to\s+the\s+(?:left|right)(?![a-z])|${__T[4]}(?:керм\S*|рульов\S*|руль|руля|рулев\S*|підсилювач\S*\s+керма|гидроусилител\S*|гідропідсилювач\S*)\s+${__T[9]}(?:туг\S*|важк\S*|тяжел\S*|тягне|тянет|люфт\S*|вібру\S*|вибриру\S*|трясет\S*|трясе\S*|заклин\S*|клин\S*${__T[15]}помилк\S*|ошибк\S*|відмов\S*|отказа\S*|вийш\S*\s+з\s+ладу|криво)|${__T[4]}(?:тягне|тягнe|тянет|веде|ведет|уводит\S*)\s+${__T[8]}(?:вправо|вліво|влево|праворуч|ліворуч|в\s+сторону|вбік|убік)|${__RX[7]}${__T[2]}(?:(?:кермо|руль)\s+(?!не\s)(?:\S+\s+)?(?:б['’ʼ]?є|бьет|б['’ʼ]?ється|трясе|трясеться|трясется)|(?:б['’ʼ]?є|бьет|трясе|трясет|вібру\S*|вибриру\S*)${__T[7]}(?:кермо|руль|руля))${__T[6]}${__RX[7]})${__RX[26]}|(?:${__T[3]}(?:lkw|fahrzeug|zugmaschine|wagen|sattelzug|er)${__T[7]}(?:l(?:ä|ae|a)uft|f(?:ä|ae|a)hrt)${__T[7]}${__T[13]}gerade(?:aus)?${__T[0]}(?!\s+(?:gut|rund|toll|super|so|besonders|ruhig|sauber))|${__T[3]}lenk(?:ung|rad|getriebe|säule|saeule)\S*\s+${__T[9]}(?:knackt|knacken|knarzt|knarrt|klackt|klopft|quietscht)${__T[0]}|${__T[1]}(?:servo|servolenkung|lenkhilfe|lenkunterst(?:ü|ue)tzung)\S*\s+${__T[8]}(?:ausgefallen|f(?:ä|ae|a)llt\s+aus|defekt|kaputt${__T[27]}weg)${__T[0]}|(?<![a-z])power\s+steering\s+${__T[8]}(?:failed|failure|not\s+working|gone|broken))${__T[10]}eingestellt|vermessen${__T[26]}in\s+ordnung)|fixed|repaired|replaced${__T[12]}отремонт\S*|заменил\S*))|${__T[1]}(?:lenkrad|lenks(?:ä|ae)ule)(?:n?verstellung)?${__T[0]}\s+(?:(?:mehr|richtig|ganz|immer|jetzt|beim\s+fahren)\s+)?(?:bleibt\s+nicht\s+(?:in\s+(?:der\s+)?(?:position|stellung)|oben|stehen)|f(?:ä|ae)llt\s+(?:immer\s+(?:wieder\s+)?)?(?:nach\s+unten|runter|herunter)|(?:rastet|arretiert|verriegelt)${__T[7]}nicht(?:\s+mehr)?(?:\s+(?:richtig|ganz))?\s+ein|(?:l(?:ä|ae)sst|lassen)\s+sich${__T[7]}nicht(?:\s+mehr)?\s+(?:verstellen|arretieren|feststellen|einrasten|fixieren)|h(?:ä|ae)lt\s+(?:die\s+(?:position|einstellung|stellung)\s+)?nicht)${__T[0]}${__RX[55]}|${__T[1]}lenks(?:ä|ae)ule${__T[0]}${__T[7]}(?:wackelt|locker|hat\s+spiel|klappert)${__T[0]}${__RX[55]}|${__T[1]}(?:lenkrad|lenks(?:ä|ae)ulen)(?:verstellung|arretierung|einstellung|verriegelung)${__T[0]}\s+${__T[8]}(?:kaputt|defekt${__T[27]}h(?:ä|ae)lt\s+nicht|rastet\s+nicht|klemmt|ausgefallen)${__T[0]}${__RX[55]}|${__T[5]}steering\s+(?:wheel|column)\s+(?:(?:height\s+|tilt\s+|position\s+)?adjust(?:ment|er)?\s+)?(?:\S+\s+)?(?:${__T[18]}does\s+not|not)\s+(?:lock|adjust|stay|hold)|(?:keeps\s+)?(?:drops?|dropping|falls?|falling|sinks?|sinking)\s+down)(?![a-z])${__RX[55]}|${__T[5]}steering\s+(?:wheel|column)\s+(?:height\s+|tilt\s+)?adjust(?:ment|er)${__T[7]}(?:broken|faulty|stuck|not\s+working)(?![a-z])${__RX[55]}|${__T[2]}(?:кермо|кермов\S*\s+колонк\S*|руль|рулев\S*\s+колонк\S*)${__T[7]}не\s+(?:регулю\S*|фіксу\S*|фиксиру\S*|регулиру\S*)${__RX[55]}|${__T[1]}lenkrad${__T[0]}\s+(?:(?:dreht|drehte|bewegt)\s+sich${__T[7]}(?:nicht|kaum)${__T[0]}|(?:l(?:ä|ae)sst|lie(?:ß|ss))\s+sich${__T[7]}(?:nicht|kaum|nur\s+schwer)(?:\s+mehr)?\s+(?:drehen|bewegen|einschlagen))${__RX[55]}|${__T[5]}steering(?:\s+wheel)?\s+${__T[18]}does\s+not|can['’]?t|cannot)${__T[7]}(?:turn|move)(?![a-z])${__RX[55]}|${__T[2]}(?:кермо|руль)${__T[7]}не\s+(?:крути\S*|поверта\S*|поворачива\S*|руха\S*|двига\S*)${__RX[55]}|(?:${__T[2]}(?:важк\S*|тяжел\S*|туг\S*)${__T[7]}(?:кермо|руль|кермуван\S*|рульов\S*)${__T[6]}|${__T[2]}(?:кермо|руль)${__T[7]}(?:важке|важко|тяжелый|тяжело|туге|тугий|тугой|туго)${__T[6]})${__T[10]}eingestellt|funktioniert\s+wieder${__T[23]}adjusted${__T[12]}отремонт\S*|заменил\S*|полагодил\S*${__T[22]}`, 'i', 1);
const STEER3_HINT = lbRx(String.raw`(?:${__T[2]}(?:руль|руля|рулем|руле|кермо|керма|кермом|кермі|рулев\S*|рульов\S*)${__T[7]}(?:не\s+возвраща\S*|не\s+вертает\S*|сам\s+не\s+возвраща\S*|не\s+выравнива\S*|не\s+вирівню\S*)|${__T[2]}(?:машин\S*|грузовик\S*|фур\S*|тягач\S*|вантажівк\S*|авто)${__T[7]}(?<!не\s)(?:гуля\S*|виля\S*)${__T[7]}(?:(?:по|на)\s+(?:дорог\S*|дороз\S*|трас\S*|прям\S*)|из\s+стороны|з\s+боку)|${__T[2]}(?:руль|руля|рулем|руле|кермо|керма|кермом|кермі|рулев\S*|рульов\S*)\s+${__T[8]}(?<!не\s)(?:гуд\S*|гуде|воет|виє|скрип\S*|рип\S*|хруст\S*|стуч\S*|стука\S*|клац\S*|щелка\S*|скреж\S*|скрегоч\S*)${__T[6]}|${__T[2]}(?:стук|стукіт|скрип|хруст|гул|вой|скрегіт|скрежет)\s+(?:в|у|со\s+стороны|з\s+боку)\s+(?:руль|руля|рулем|руле|кермо|керма|кермом|кермі|рулев\S*|рульов\S*)|${__T[2]}(?:наконечник\S*|тяг[аиі]|шарнир\S*|шарнір\S*)${__T[7]}(?:рулев\S*|рульов\S*)${__T[7]}(?<!не\s)(?:стуч\S*|стука\S*|люфт\S*|болта\S*|бовта\S*|погнут\S*|зігнут\S*|порван\S*|розірван\S*)|${__T[2]}(?:лампа|лампочк\S*|индикатор\S*|індикатор\S*|значок|символ|ошибк\S*|помилк\S*)${__T[7]}(?:рулев\S*\s+управлени\S*|рульов\S*\s+управлінн\S*|гидроусилител\S*|гідропідсилювач\S*|усилител\S*\s+руля|підсилювач\S*\s+керма)|${__T[1]}lenk(?:ung|rad)${__T[7]}(?:geht|kommt|stellt\s+sich)${__T[7]}${__T[13]}(?:von\s+selbst\s+|allein\s+)?(?:zur(?:ü|ue)ck|gerade)${__T[0]}|${__T[1]}lenk(?:ung|rad|getriebe|s(?:ä|ae)ule)${__T[7]}(?:brummt|heult|knackt|klopft|knarzt|quietscht|jault)${__T[0]}(?!\s+nicht${__T[0]}))${__RX[7]}`, 'i', 1);
const STEER2_HINT = lbRx(String.raw`(?:${__T[1]}(?<!(?:wind|sturm|b(?:ö|oe)e|b(?:ö|oe)en|seitenwind|kunde|fahrer)\s+(?:\S+\s+){0,3})zieht\s+(?:(?:stark|extrem|sehr|leicht|immer|st(?:ä|ae)ndig|dauernd|deutlich|richtig|etwas|bisschen|ein\s+bisschen|beim\s+fahren|beim\s+bremsen|bei\s+\d+|ab\s+\d+)\s+){0,3}nach\s+(?:links|rechts)${__T[0]}|${__T[1]}lenkrad\s+(?:steht\s+|ist\s+|sitzt\s+)?(?:(?:jetzt|etwas|leicht|total|komplett|ganz|stark|beim\s+geradeausfahren)\s+)*(?:schr(?:ä|ae)g|verdreht|${__T[13]}(?:gerade(?!\s+(?:sauber|neu|billig|gut|leicht|sch(?:ö|oe)n|toll|bequem|gro(?:ß|ss)))|mittig|in\s+der\s+mitte))${__T[0]}|${__T[1]}(?:servo(?:lenkungs)?(?:ö|oe)l|lenkungs(?:ö|oe)l|lenkgetriebe|servopumpe|servo|servolenkung|lenkhilfe)\s+(?:${__RX[56]}\S+\s+){0,2}?(?:verliert|l(?:ä|ae)uft\s+aus|leer|undicht|tropft|leckt|sifft|zu\s+wenig|fehlt|schwitzt)${__T[0]}|${__T[1]}(?:servopumpe|lenkpumpe|lenkhilfepumpe|servo|servolenkung)\s+(?:${__RX[56]}\S+\s+){0,2}?(?:heult|jault|pfeift|brummt|summt|quietscht|sirrt|macht${__T[7]}ger(?:ä|ae)usch\S*|ist\s+(?:sehr\s+|ganz\s+)?laut)${__T[0]}|${__T[1]}(?:knackt|knackst|knarzt|knarrt|klackt|klopft|quietscht|poltert|kracht|rumpelt|schl(?:ä|ae)gt|knirscht)\s+(?:es\s+)?${__T[8]}(?:beim|bei[mn]?)\s+(?:ein)?(?:lenken|einschlagen|einlenken|lenkeinschlag|drehen\s+(?:des|am)\s+lenkrad\S*)${__T[0]}|${__T[1]}beim\s+(?:ein)?(?:lenken|einschlagen|einlenken|rangieren\s+lenken)\s+${__T[9]}(?:knack\S*|knarz\S*|knarr\S*|klack\S*|klopf\S*|quietsch\S*|polter\S*|kracht|rumpel\S*|knirsch\S*|ger(?:ä|ae)usch\S*)${__T[0]}|${__T[1]}(?:lenkung|lenkrad|lenkgetriebe)${__T[7]}(?:klappert|ruckelt|rattert|brummt|macht${__T[7]}ger(?:ä|ae)usch\S*|reagiert${__T[7]}(?:sp(?:ä|ae)t|tr(?:ä|ae)ge|langsam)|(?:ist\s+)?(?:tot|(?:ganz\s+)?weg))${__T[0]}|${__T[1]}(?:lenkung|lenkrad)\s+(?:geht|stellt\s+sich|kommt|dreht\s+sich|l(?:ä|ae)uft)${__T[7]}${__T[13]}(?:von\s+(?:selbst|allein)\s+)?zur(?:ü|ue)ck${__T[0]}|${__T[1]}achsschenkel(?:bolzen)?${__T[7]}(?:ausgeschlagen|hat${__T[7]}spiel|spiel|locker|gebrochen|verbogen|defekt)${__T[0]}|${__T[1]}spur(?:einstellung)?${__T[7]}(?:stimmt\s+nicht|verstellt|falsch|muss${__T[7]}eingestellt|einstellen|${__T[13]}in\s+ordnung)${__T[0]}|${__T[1]}(?:achs|spur)vermessung${__T[7]}(?:n(?:ö|oe)tig|f(?:ä|ae)llig|notwendig|machen|erforderlich)|${__T[1]}wegen\s+(?:der\s+)?spur${__T[0]}|${__T[1]}(?:lenkachse|nachlaufachse|nachlauflenkachse|vorlaufachse|liftachse|zwangslenkung|lenkung)${__T[7]}(?:lenkt${__T[7]}nicht|(?:warn|st(?:ö|oe)r)\S*|meldung)${__T[0]}|${__T[1]}(?:lenkungs(?:warn)?(?:leuchte|lampe|warnung|fehler|st(?:ö|oe)rung)|lenkrad[\s-]?(?:symbol|leuchte|lampe|warnleuchte))${__T[0]}|${__T[1]}(?:lkw|fahrzeug|zugmaschine|wagen|sattelzug|er|auto)\s+f(?:ä|ae)hrt${__T[7]}(?:schr(?:ä|ae)g|schief)${__T[0]}|^\s*f(?:ä|ae)hrt${__T[7]}(?:schr(?:ä|ae)g|schief)${__T[0]}|${__T[1]}${__T[16]}trailer)\s+(?:l(?:ä|ae)uft|f(?:ä|ae)hrt)${__T[7]}(?:schr(?:ä|ae)g|schief|${__T[13]}(?:in\s+der\s+)?spur)${__T[0]}|${__T[1]}(?:st(?:ä|ae)ndig|dauernd|immer(?:\s+wieder)?|permanent|andauernd|laufend|die\s+ganze\s+zeit)${__T[7]}(?:gegenlenken|gegensteuern|nachlenken|gegenhalten\s+am\s+lenkrad)${__T[0]}|${__T[1]}(?:am\s+lenkrad|an\s+der\s+lenkung|die\s+lenkung)${__T[7]}korrigieren|${__T[5]}(?:pulls|pulling|drifts|drifting|veers|veering)\s+(?:hard\s+|badly\s+|strongly\s+|slightly\s+)?(?:to\s+the\s+)?(?:left|right)(?![a-z])(?!\s+(?:into|onto|out|off|in|lane|turn))|${__T[5]}steering\s+wheel\s+(?:is\s+)?(?:\S+\s+)?(?:not\s+(?:straight|cent(?:er|re)d)|off\s+to\s+the\s+(?:left|right)|skewed)(?![a-z])|${__T[5]}power\s+steering\s+(?:fluid|oil|pump)${__T[7]}(?:leak\S*|low|empty|losing|whin\S*|whistl\S*|squeal\S*|noisy|groan\S*|howl\S*|making${__T[7]}noise)|${__T[5]}steering(?:\s+wheel)?\s+(?:won['’]?t|wont|doesn['’]?t|doesnt|does\s+not|not)${__T[7]}(?:return|self[-\s]?cent\S*|come\s+back)(?![a-z])|${__T[5]}steering(?:\s+wheel|\s+column|\s+box)?\s+${__T[8]}(?:click\S*|clunk\S*|knock\S*|creak\S*|squeak\S*|groan\S*|noise|noisy)(?![a-z])|${__T[5]}(?:click|clunk|knock|creak|crack|pop|squeak|groan)\S*\s+${__T[9]}(?:when|while)\s+(?:i\s+)?(?:turning\s+the\s+(?:steering\s+)?wheel|steering|i\s+steer)(?![a-z])|${__T[5]}(?:power\s+)?steering\s+(?:system\s+)?warning(?![a-z])|${__T[5]}(?:wheel\s+)?(?:alignment|tracking)\s+(?:is\s+)?(?:off|out|wrong|bad|needed|needs\s+(?:doing|checking))(?![a-z])|${__T[5]}(?:keep|constantly|always)${__T[7]}correcting\s+(?:the\s+)?(?:steering|wheel)(?![a-z])|${__T[2]}(?:насос\S*\s+)?(?:гідропідсилювач\S*|гидроусилител\S*|гпк|гур)${__T[7]}(?:гуде|гудит|виє|воет|свистить|свистит|шумить|шумит|тече|течет|підтікає|подтекает)${__T[6]}|${__T[2]}(?:тече|течет|підтікає|подтекает)${__T[7]}(?:гідропідсилювач\S*|гидроусилител\S*|гур)${__T[6]}|${__T[2]}(?:стук|стуч|скрип|хруст|тріск|треск|клац)\S*\s+${__T[8]}при\s+поворот\S*\s+(?:керм\S*|руля|руль)|${__T[2]}(?:помилк|ошибк|несправн|неисправн)\S*${__T[7]}(?:рульов\S*|рулев\S*|керм\S*|руля)${__T[6]})${__T[10]}eingestellt|vermessen${__T[26]}in\s+ordnung|normal)${__T[23]}adjusted|sorted|(?:heult|jault|pfeift|brummt|summt|quietscht|knackt|klappert|zieht|tropft|leckt|verliert)${__T[7]}nicht\s+mehr|no\s+longer${__T[11]}заменил\S*|усунул\S*|устранил\S*|полагодил\S*|починил\S*${__T[22]}`, 'i', 1);
















const ENGINE_HINT = lbRx(String.raw`${__T[1]}motor\s+geht\s+(?:immer\s+(?:wieder\s+)?|st(?:ä|ae)ndig\s+|einfach\s+|pl(?:ö|oe)tzlich\s+|dauernd\s+|(?:beim|im)\s+\S+\s+)?aus${__T[0]}(?![^.;!?]*(?:abstell\S*|normal|wie\s+immer|gewollt|automatisch|start[-\s]?stopp|z(?:ü|ue)ndung|ausschalt\S*|abschalt\S*|ausmach\S*))(?<!automatisch\s+aus)${__RX[0]}|${__T[2]}(?:помилк\S*|ошибк\S*|горить|горит|загорілас\S*|загорел\S*|світиться|светится)${__T[7]}(?:ad[\s-]?blue|адблю\S*|адблу\S*|сечовин\S*|мочевин\S*)${__RX[0]}|${__T[1]}(?:motor|dieselmotor)${__T[0]}\s+(?:[^\s.,;!?]+\s+){0,3}?(?:klopft|nagelt|h(?:ä|ae)mmert)${__T[0]}${__RX[7]}|${__T[1]}motorklopfen${__T[0]}${__RX[7]}|${__T[5]}engine\s+(?:(?:is|keeps|has\s+started|started|now|really|loud(?:ly)?)\s+){0,3}knock(?:s|ing)(?![a-z])${__RX[7]}|${__T[5]}knock(?:ing)?\s+(?:noise\s+|sound\s+)?(?:from|in)\s+(?:the\s+)?engine(?![a-z])${__RX[7]}|${__T[2]}(?:двигун\S*|двигател\S*|двигатель|мотор\S*)\s+${__T[8]}(?:стукає|стукотить|стукоче|стучит|тарахтить|тарахтит)${__T[6]}${__RX[7]}|${__T[2]}(?:турбін\S*|турбин\S*)\s+${__T[8]}(?:свистить|свистит|виє|воет|гуде|гудит|не\s+працює|не\s+работает|не\s+дує|не\s+дме|не\s+дует${__T[28]}димить|дымит)${__T[6]}${__RX[7]}|${__T[1]}(?:(?:motor|visco-?|visko|k(?:ü|ue)hler)?l(?:ü|ue)fter)${__T[0]}(?!\s+(?:im|in\s+der|der|vom|von\s+der|f(?:ü|ue)r\s+(?:das|die))\s+(?:fahrerhaus|kabine|heizung|klima\S*|standheizung|schlafkabine|l(?:ü|ue)ftung))\s+${__T[9]}(?:st(?:ä|ae)ndig|dauernd|permanent|ununterbrochen|durchgehend|(?:die\s+)?ganze\s+zeit|immer\s+(?:an|voll|mit))${__T[0]}${__RX[10]}|${__T[5]}(?<!(?:cab|heater|blower|cabin)\s)(?:(?:engine|radiator|cooling|viscous|visco)\s+)?fan\s+${__T[8]}(?:keeps\s+running|runs\s+(?:constantly|all\s+the\s+time|non-?stop|permanently)|always\s+on|stuck\s+on)(?![a-z])${__RX[10]}|${__T[2]}вентилятор(?!\s+(?:в|у)\s+(?:кабіні|кабине|салоні|салоне))\s+${__T[8]}(?:постійно|весь\s+час|не\s+вимикається|постоянно|вс(?:е|[её])\s+время|не\s+выключается)|${__T[1]}wasserpumpe\s+${__T[8]}(?:undicht|leckt|tropft|verliert)${__T[0]}${__RX[10]}|${__T[5]}water\s+pump\s+${__T[8]}(?:leak\S*|broken|failed|faulty|dripping)(?![a-z])${__RX[10]}|${__T[1]}ad[\s-]?blue\s+(?:(?:ist|war|komplett|ganz|schon|jetzt|seit|heute|gestern|morgens?|unterwegs)\s+){0,3}(?:alle(?=\s*(?:$|[.,;!?]))|ausgegangen|aufgebraucht|leergefahren|leer\s+gefahren)|${__T[1]}(?:kein|keinen)\s+ad[\s-]?blue\s+mehr${__T[0]}|${__T[5]}(?:ran\s+out\s+of|out\s+of)\s+ad[\s-]?blue(?![a-z])|${__T[5]}no\s+ad[\s-]?blue\s+left(?![a-z])|${__T[4]}(?:закінчи|скінчи|кончи|закончи)\S*${__T[7]}ad[\s-]?blue|(?<![a-z])ad[\s-]?blue${__T[7]}(?:закінчи|скінчи|кончи|закончи)\S*|${__T[3]}(?:motor|lkw|fahrzeug|zugmaschine|k(?:ü|ue)hler|er)\s+${__T[9]}(?:(?:ist|geht|läuft|laeuft)${__T[7]}(?:im\s+|in\s+den\s+)?notlauf|notlauf|(?:verliert|reduziert|drosselt)\s+${__T[8]}(?:leistung|kraft)|hat\s+${__T[8]}(?:keine|kaum|wenig|weniger)${__T[7]}(?:leistung|kraft)|zieht\s+(?:nicht\s+(?:mehr|richtig)|(?:nur\s+)?(?:schlecht|kaum)(?:\s+noch)?)${__T[0]}|(?:ist\s+)?(?:(?:ü|ue|u)berhitzt|ueberhitzt)|wird${__T[7]}(?:zu\s+)?heiß|wird${__T[7]}(?:zu\s+)?heiss|kocht)|${__T[3]}(?:notlauf(?:programm|modus)?|leistungsreduzierung|leistungsverlust|leistungsabfall|motorleistung${__T[7]}reduziert|motor(?:temperatur|(?:ü|ue|u)berhitzung|ueberhitzung)|kühlwasser\S*|kuehlwasser\S*|kühlmittel\S*|kuehlmittel\S*|wassertemperatur)${__T[0]}(?:\s+${__T[9]}(?:rot|hoch|zu\s+hoch|kocht|warnung|leer|verloren|läuft\s+aus|laeuft\s+aus|spritzt|(?:ü|ue|u)berhitzt|ueberhitzt|aktiv|zeigt)|(?=\s|$|[.,;!?]))${__RX[37]}|${__T[3]}(?:ad[\s-]?blue|harnstoff)\S*\s+${__T[9]}(?<!(?:ohne|kein|keine|keinen|no|any)\s+)(?:warnung|warnleuchte|fehler\S*|störung|leer|reduziert|drosselt|leuchtet)(?![a-zäöüß]*\s+mehr${__T[0]})${__RX[37]}|${__T[1]}(?:ad-?blue|harnstoff)-?(?:fehler\S*|st(?:ö|oe)rung\S*|warnung|warnleuchte|warnmeldung|fehlermeldung)${__T[0]}${__RX[37]}|${__T[1]}ad[\s-]?blue[\s-]?(?:system|anlage|pumpe|f(?:ö|oe)rderpumpe|dosier(?:ventil|modul|einheit|pumpe|ung)|heizung|sensor|qualit(?:ä|ae)tssensor|einspritzung|einspritzd(?:ü|ue)se|d(?:ü|ue)se|modul|steuerger(?:ä|ae)t)${__T[0]}\s+${__T[9]}(?<!(?:ohne|kein|keine|keinen|no|any)\s+)(?:defekt|kaputt|ausgefallen|(?:funktioniert|geht|arbeitet)${__T[7]}nicht|fehler\S*|st(?:ö|oe)rung)${__T[0]}${__RX[37]}|${__T[5]}ad[\s-]?blue\s+(?:(?:system|pump|dosing\s+(?:unit|module|valve|pump)|doser|heater|sensor|quality\s+sensor|injector|nozzle|module)\s+${__T[8]}(?<!(?:ohne|kein|keine|keinen|no|any)\s+)(?:not\s+working|isn['’]?t\s+working|doesn['’]?t\s+work|does\s+not\s+work|failed|faulty|broken|defective|defect|error|malfunction\S*)|error|malfunction\S*)(?![a-z])${__RX[37]}|(?<![a-zа-яіїєґё-])(?:(?:систем\S*|насос\S*|помп\S*|дозатор\S*|датчик\S*)\s+)?(?:ad[\s-]?blue|адблю\S*|адблу\S*|сечовин\S*|мочевин\S*)(?:\s+(?:систем\S*|насос\S*|помп\S*|дозатор\S*|датчик\S*))?${__T[7]}(?:${__T[43]}|злама\S*|слома\S*|несправн\S*|неисправ\S*|помилк\S*|ошибк\S*|не\s+кача\S*|(?<!не\s)(?:закінчи\S*|скінчи\S*|закончи\S*|кончи\S*|порожн\S*|пуст\S*))${__RX[37]}|(?:${__T[2]}(?<!не\s)(?:закінчи|скінчи|закончи|кончи)\S*${__T[7]}(?:ad[\s-]?blue|адблю\S*|адблу\S*|сечовин\S*|мочевин\S*)|${__T[2]}(?:ограничени|обмеженн|обмежен)\S*${__T[7]}(?:мощност|потужност|скорост|швидкост|оборот)\S*\s+${__T[8]}(?:ad[\s-]?blue|адблю\S*|адблу\S*|сечовин\S*|мочевин\S*)|${__T[2]}(?:запрет|заборон)\S*${__T[7]}(?:запуск|пуск)\S*)${__RX[37]}${__T[39]}(?:engine\s+|coolant\s+)?temp(?:erature)?\s+(?:gauge|needle)(?![^.,;]*(?:reefer|fridge|trailer\s+unit|thermo\s*king|carrier))\s+${__T[9]}(?:in\s+the\s+red|red(?![a-z])|too\s+high|rising|climbing|going\s+up)|limp\s+(?:home\s+)?mode|loss\s+of\s+power|no\s+longer\s+pull(?:s|ing)?(?!\s+(?:to\s+)?(?:the\s+)?(?:left|right|one\s+side|sideways))|loses\s+power|losing\s+power|lost\s+power|no\s+power|reduced\s+(?:engine\s+)?power|power\s+(?:is\s+)?reduced|engine${__T[7]}(?:overheat\S*|derate\S*|too\s+hot)|radiator\s+(?:is\s+)?(?:boil\S*|too\s+hot)|(?<!brakes?\s+(?:are\s+|is\s+|keep\s+|keeps\s+)?)overheat(?:s|ed|ing)(?!${__T[7]}brakes?)|coolant\s+${__T[8]}(?:warning|temperature|temp|low|leak\S*|boil\S*)|ad[\s-]?blue\s+${__T[8]}(?:warning|fault|empty|light))(?![a-z])|${__T[4]}(?:аварійн\S*\s+режим|аварийн\S*\s+режим|втрат\S*\s+потужност\S*|потер\S*\s+мощност\S*|${__T[36]})${__T[7]}(?:потужност\S*|тяги|мощности)|(?:не|погано|слабо|ледве)\s+тягне(?![а-яіїєґ])|(?:не|плохо|слабо|еле)\s+тянет(?![а-яіїєґ])|(?<!(?:гальм|тормоз)\S*\s+)перегр(?!уз|уж)\S*(?!${__T[7]}(?:гальм|тормоз))|охолоджувальн\S*\s+рідин\S*|охлаждающ\S*\s+жидкост\S*|антифриз\S*|тосол\S*${__T[7]}(?:кипи\S*|закипі\S*|закипе\S*)|адблю\S*${__T[7]}(?:помилк\S*|ошибк\S*|попередж\S*|предупрежд\S*))${__RX[11]}|${__T[1]}(?:keilriemen|keilrippenriemen|rippenriemen|antriebsriemen|lichtmaschinenriemen|l(?:ü|ue|u)fterriemen|lichtmaschine|wasserpumpe|k(?:ü|ue|u)hlerl(?:ü|ue|u)fter|motorl(?:ü|ue|u)fter|visco-?l(?:ü|ue|u)fter|viskol(?:ü|ue|u)fter)(?:s|n)?${__T[0]}\s+${__T[9]}(?:gerissen|abgesprungen|runtergesprungen|quietscht|quietschen|pfeift|rutscht|kaputt|defekt|ausgefallen|f(?:ä|ae|a)llt\s+aus|l(?:ä|ae|a)dt\s+nicht|l(?:ä|ae|a)uft\s+nicht|dreht\s+(?:sich\s+)?nicht|funktioniert\s+nicht|geht\s+nicht)|${__T[1]}batterie\S*\s+${__T[8]}(?:wird${__T[7]}${__T[13]}geladen|l(?:ä|ae|a)dt\s+nicht)|${__T[5]}(?:fan|alternator|serpentine|drive|v-?|poly-?v)\s*belt\s+${__T[8]}(?:snapped|broken|broke|squealing|squeaking|slipping|came\s+off|failed)(?![a-z])|${__T[5]}alternator\s+${__T[8]}(?:not\s+charging|isn['’]?t\s+charging|failed|dead|broken|faulty|not\s+working|doesn['’]?t\s+work|isn['’]?t\s+working)|${__T[5]}water\s+pump${__T[7]}(?:failed|broken|faulty)|${__T[5]}(?:radiator|cooling|engine)\s+fan${__T[7]}(?:not\s+working|failed|broken|doesn['’]?t\s+work)|${__T[4]}(?:(?:ремін\S*|ремен\S*|ремн\S*|пас)\s+(?:генератор\S*|вентилятор\S*|привод\S*|помп\S*|грм)|(?:приводн\S*|поліклинов\S*|поликлинов\S*|клинов\S*)\s+(?:ремін\S*|ремен\S*|ремн\S*|пас\S*))\s+${__T[8]}(?:порва|обірва|обрив|оборва|злеті|злетів|слетел|свист|пищ)\S*|${__T[4]}генератор\S*(?!\s+(?:холодильн|рефриж|установк|агрегат)\S*)${__T[7]}(?:не\s+заряджа\S*|не\s+заряжа\S*|не\s+да[её]\s+заряд\S*|злама[внл]\S*${__T[17]}несправн\S*|неисправ\S*${__T[15]}вийшов\s+з\s+ладу|вышел\s+из\s+строя)|${__T[4]}(?:помп\S*|водян\S*\s+насос\S*)${__T[7]}(?:злама[внл]\S*${__T[17]}${__T[43]})|${__T[1]}(?:motor|lkw)\s+(?:[^\s,.;!?]+\s+){0,2}?(?:geht|ging)\s+(?!nicht)(?:[^\s,.;!?]+\s+){0,4}?aus${__T[0]}(?=[^.;!?]*?(?:fahrt|fahren|fahre|fuhr|rollen|ampel|kreuzung|autobahn|stra(?:ß|ss)e|unterwegs|leerlauf|anfahren|bremsen|berg|immer|st(?:ä|ae|a)ndig|pl(?:ö|oe|o)tzlich|einfach|selbst|zwischendurch|mehrmals|grundlos))|${__T[1]}(?:motor|lkw)\s+(?:[^\s,.;!?]+\s+){0,2}?(?:geht|ging)\s+(?!nicht)(?:[^\s,.;!?]+\s+){0,3}?(?:fahrt|fahren|fahre|fuhr|rollen|ampel|kreuzung|autobahn|stra(?:ß|ss)e|unterwegs|leerlauf|anfahren|bremsen|berg|immer|st(?:ä|ae|a)ndig|pl(?:ö|oe|o)tzlich|einfach|selbst|zwischendurch|mehrmals|grundlos)\S*\s+(?:[^\s,.;!?]+\s+){0,2}?aus${__T[0]}|${__T[1]}(?:fahrt|fahren|fahre|fuhr|rollen|ampel|kreuzung|autobahn|stra(?:ß|ss)e|unterwegs|leerlauf|anfahren|bremsen|berg|immer|st(?:ä|ae|a)ndig|pl(?:ö|oe|o)tzlich|einfach|selbst|zwischendurch|mehrmals|grundlos)\S*\s+(?:[^\s,.;!?]+\s+){0,3}?(?:geht|ging)\s+(?:der\s+|mir\s+(?:der\s+)?)?(?:motor|lkw)\s+(?:[^\s,.;!?]+\s+){0,2}?aus${__T[0]}|${__T[1]}(?:motor|lkw)\s+${__T[9]}(?:stirbt|starb)${__T[7]}ab|${__T[1]}(?:motor|lkw)\s+${__T[9]}(?:l(?:ä|ae|a)uft${__T[7]}unrund|lief${__T[7]}unrund|ruckelt|stottert|setzt\s+aus|nimmt\s+kein\s+gas|geht\s+in\s+die\s+knie)|${__T[1]}springt\s+an\s+und\s+geht${__T[7]}(?:wieder\s+)?aus|${__T[5]}engine\s+${__T[8]}(?:cuts?\s+out|cutting\s+out|stalls?|stalled|stalling|dies|died|shuts?\s+(?:itself\s+)?(?:off|down)|shut\s+down|keeps\s+cutting\s+out|misfir\S*|sputter\S*|stutter\S*)|${__T[4]}(?:двигун\S*|мотор\S*|двигател\S*)\s+(?:(?!більше\s+не|больше\s+не|уже\s+не|вже\s+не|не\s)\S+\s+){0,2}?(?:глухне|заглух\S*|глохне|глохнет|заглох\S*|вимика\S*${__T[7]}під\s+час\s+руху|смика\S*|дерга\S*|троїть|троит)|${__T[1]}(?:rauch|qualm|dampf)${__T[7]}aus\s+(?:dem\s+)?auspuff|${__T[1]}(?:aus\s+dem\s+)?auspuff\s+(?:kommt|kommen|steigt|steigen|qualmt\s+es|raucht\s+es)\s+${__T[8]}(?:rauch|qualm|dampf)${__T[0]}|${__T[1]}(?:schwarze[nmrs]?|wei(?:ß|ss)e[nmrs]?|blaue[nmrs]?|graue[nmrs]?)\s+(?:rauch|qualm)(?=[^.;!?]*auspuff)|${__T[1]}auspuff${__T[7]}(?:qualmt|raucht)${__T[7]}(?:schwarz|wei(?:ß|ss)|blau|grau|stark)|${__T[1]}auspuff\s+(?:qualmt|raucht)${__T[0]}(?!${__T[7]}(?:nicht|nie|kaum|kein)${__T[0]})${__RX[57]}|${__T[5]}(?<!(?:no|without)\s+)exhaust\s+(?:is\s+|keeps\s+|still\s+)?(?:smoking|smokes|smoke)(?![a-z])${__RX[57]}|${__T[5]}(?:black|white|blue|grey|gray)\s+smoke(?=[^.;!?]*exhaust)|${__T[5]}smoke${__T[7]}(?:from|out\s+of)\s+(?:the\s+)?exhaust|${__T[4]}(?:чорн|біл|син|черн|бел)\S*\s+(?:дим|дым)\S*\s+${__T[8]}(?:вихлоп|выхлоп|глушник|глушител)|${__T[4]}(?:дим|диму|дым|дыма)(?![а-яіїєґ])${__T[7]}(?:з|із|из)${__T[7]}(?:вихлоп|выхлоп|глушник|глушител)|${__T[4]}(?:вихлоп|выхлоп|глушник|глушител)\S*\s+${__T[8]}(?:дим|дым|димить|дымит|димит|дымится)(?![а-яіїєґ])|${__T[1]}(?:motortemperatur|temperatur|kühlwasser|kuehlwasser)?(?:anzeige|nadel)(?<=(?:temperatur|kühlwasser|kuehlwasser)(?:anzeige|nadel))${__T[0]}(?![^.,;]*(?:k(?:ü|ue|u)hl(?:aggregat|ger(?:ä|ae|a)t|raum|koffer|auflieger|maschine)|au(?:ß|ss)en|thermo\s*king|carrier))\s+${__T[9]}(?:im\s+roten|rot${__T[0]}|geht${__T[7]}hoch|steigt|zu\s+hoch|blinkt)|${__T[1]}(?:turbolader|turbo)${__T[0]}\s+${__T[9]}(?:pfeift|heult|defekt|kaputt|ausgefallen|qualmt|verliert${__T[7]}(?:ö|oe)l)|${__T[5]}turbo(?:charger)?\s+${__T[9]}(?:whistl\S*|whin\S*|failed|broken|faulty|not\s+working)|${__T[5]}(?:engine|coolant)\s+temp(?:erature)?\s+(?:(?:is|was|gets|getting|goes|going|too|very|really|quite|always|reading)\s+){0,3}(?:high|hot)(?![a-z])${__RX[7]}|${__T[2]}(?:температур\S*\s+(?:двигун\S*|двигател\S*|мотор\S*|охолоджувальн\S*\s+рідин\S*|охлаждающ\S*\s+жидкост\S*|антифриз\S*|тосол\S*)\s+${__T[8]}(?:висок\S*|высок\S*|зашкалю\S*)|(?:висок\S*|высок\S*)\s+температур\S*\s+(?:двигун\S*|двигател\S*|мотор\S*|антифриз\S*))${__T[6]}${__RX[7]}|${__RX[8]}${__T[5]}(?:fan\s+|alternator\s+|drive\s+|v\s*-?\s*|poly\s*-?v\s+|serpentine\s+)?(?<!(?:seat|safety|lap|tie|ratchet|lashing|load|cargo|conveyor|tool|utility)[\s-])belt${__T[7]}(?:snapped|broke|broken|came\s+off|has\s+come\s+off|torn)(?![a-z])${__RX[8]}|${__RX[8]}${__T[5]}(?:truck|lorry|engine|it)\s+${__T[18]}does\s+not)\s+(?:accelerate|rev(?:\s+up)?|respond\s+to\s+(?:the\s+)?(?:throttle|accelerator|gas))(?![a-z])${__RX[8]}|${__RX[8]}${__T[2]}не\s+(?:реагу\S*|реагиру\S*)\s+на\s+(?:педаль\s+)?газ${__T[6]}${__RX[8]}|${__RX[7]}${__T[5]}(?:losing|leaking|lost|loses)${__T[7]}(?:coolant|antifreeze)(?![a-z])${__RX[7]}|${__RX[7]}${__T[5]}coolant\s+(?:level\s+)?(?:keeps\s+)?(?:dropping|disappearing|going\s+down)(?![a-z])${__RX[7]}|(?<!(?:schnee|gl(?:ä|ae)tte|glatteis|eis|matsch|schlamm)[^.;!?]*)${__T[3]}(?:kommt|kam|komme)\s+${__T[9]}(?:berg|steigung|anstieg|auffahrt)\S*${__T[7]}(?:nicht|kaum)\s+(?:(?:mehr|noch)\s+)?(?:hoch|rauf|hinauf)${__T[0]}${__RX[58]}|(?<!(?:schnee|gl(?:ä|ae)tte|glatteis|eis|matsch|schlamm)[^.;!?]*)${__T[3]}(?:kriecht|krieche|schleicht)\s+${__T[9]}(?:berg|steigung|anstieg)${__RX[58]}|${__T[3]}(?:raucht|qualmt|dampft)\s+${__T[8]}aus\s+(?:dem\s+)?auspuff|${__T[3]}(?:motor|lkw|fahrzeug|zugmaschine|er)${__T[7]}zieht\s+(?:gar\s+)?nicht(?:\s+(?:mehr|richtig|gut|am\s+berg|bergauf))?(?=\s*(?:$|[.,;!?]))${__RX[0]}|${__T[3]}(?:keine|kaum|wenig)\s+(?:kraft|leistung|power|zug)\s+(?:mehr\s+)?(?:am\s+berg|bergauf|beim\s+(?:anfahren|beschleunigen))${__T[0]}${__RX[0]}|${__T[3]}(?<!kein\s)(?<!keine\s)(?:pfeifen|heulen|pfeifton|qualm|rauch)\s+(?:vom|am|aus\s+dem)\s+turbo(?:lader)?${__T[0]}${__RX[0]}|(?<![a-z])(?<!no\s)(?:whistl\S*|whin\S*|noise|smoke)\s+(?:coming\s+)?(?:from|at)\s+the\s+turbo(?:charger)?(?![a-z])${__RX[0]}|${__T[2]}свист\s+турбін\S*${__RX[0]}${__T[39]}truck|lorry|engine|it)\s+${__T[38]}\s+not|will\s+not)\s+pull(?=\s*(?:$|[.,;!?]|\s+(?:uphill|up\s+hills?|anymore|properly)))${__RX[0]}${__T[39]}has\s+)?no\s+(?:pull|power)\s+(?:uphill|up\s+hills?|on\s+hills?)(?![a-z])${__RX[0]}|${__T[5]}(?<!(?:reefer|fridge|unit|heater)\s)engine\s+(?:is\s+|keeps\s+|has\s+been\s+)?(?:running|runs|getting|gets|got|going|goes)\s+(?:very\s+|too\s+|really\s+|a\s+bit\s+)?hot(?![a-z])${__RX[7]}|${__T[5]}engine\s+temp(?:erature)?\s+(?:is\s+|keeps\s+)?(?:rising|climbing|going\s+up|high|too\s+high|in\s+the\s+red)(?![a-z])${__RX[7]}|${__T[2]}температур\S*\s+(?:двигуна|двигателя|мотора|охолоджувальної\s+рідини|охлаждающей\s+жидкости|антифриз[ау]|тосол[ау])${__T[7]}(?:росте|раст[её]т|піднімається|поднимается|підвищ\S*|повыш\S*|висока|высокая|зашкалю\S*|зашкалива\S*)${__T[6]}${__RX[7]}|${__T[5]}(?<!(?:seat|safety|lap|ratchet|load|lashing|cargo)[\s-])(?:(?:fan|alternator|drive|serpentine|ribbed|v|aux(?:iliary)?)[\s-])?belts?\s+(?:is\s+|are\s+|keeps\s+)?(?:squeal\S*|squeak\S*|screech\S*|chirp\S*|whin\S*)(?![a-z])${__RX[21]}|${__T[5]}(?:fan|alternator|drive|serpentine|ribbed|v)[\s-]belts?\s+(?:is\s+|has\s+)?(?:snapped|broke(?:n)?|came\s+off|slipping|torn|cracked|worn)(?![a-z])${__RX[21]}|${__T[2]}(?:ремін\S*|ремен\S*|ремн\S*)(?!\s+(?:безпек|безопасн|кріплен|креплен|стяжн))(?:\s+(?:генератор\S*|вентилятор\S*|приводн\S*|поліклинов\S*|поликлинов\S*|ГРМ))?${__T[7]}(?:свист\S*|скрип\S*|верещ\S*|пищ\S*)${__T[6]}${__RX[21]}|(?:${__T[1]}gas\s+(?:geht|nimmt)${__T[7]}nicht(?:\s+an)?${__T[0]}|${__T[1]}nur\s+(?:noch\s+)?standgas${__T[0]})${__RX[11]}|(?:${__T[2]}(?:свист|пищ|верещ)\S*\s+(?:приводн\S*\s+|поліклинов\S*\s+|поликлинов\S*\s+|клинов\S*\s+)?(?:ремін\S*|ремен\S*|ремн\S*)${__T[6]}(?![^.;!?]*(?:вантаж|груз|тент|палет|кріплен|креплен|стяжн|безпек|безопасн|сидін|сиден))|${__T[2]}(?:порва|обірва|обрива|оборва|лопну|злеті|злетел|слете)\S*\s+(?:(?:приводн\S*\s+|поліклинов\S*\s+|поликлинов\S*\s+|клинов\S*\s+)(?:ремін\S*|ремен\S*|ремн\S*)|(?:ремін\S*|ремен\S*|ремн\S*)\s+(?:генератор|вентилятор|привод|помп|грм)\S*)${__T[6]}|${__T[1]}riemen${__T[7]}(?:quietscht|quietschen|pfeift|pfeifen)${__T[0]}|${__T[2]}(?:(?:стрілк|стрелк|датчик|покажчик|указател)\S*\s+температур\S*|температур\S*\s+(?:двигун\S*|двигател\S*|мотор\S*|охолоджувальн\S*\s+рідин\S*|охлаждающ\S*\s+жидкост\S*|антифриз\S*|тосол\S*))\s+${__T[8]}(?:в|у|на)\s+(?:червон|красн)\S*|${__T[2]}(?:двигун\S*|двигател\S*|мотор(?:а|у)?)(?!\s+(?:склоочисник|стеклоочистител|двірник|дворник|печ|пічк|обігрівач|вентилятор|холодильн|рефриж|кондиціонер|кондиционер|автономк)\S*)${__T[7]}(?:гріється|греется|грiється|нагріва\S*|нагрева\S*|кипить|кипит|закипа\S*|закипі\S*|закипе\S*)${__T[6]}|${__T[2]}(?:гріється|греется|кипить|кипит|закипа\S*|закипі\S*|закипе\S*)${__T[7]}(?:двигун\S*|двигател\S*|мотор(?:а|у)?|радіатор\S*|радиатор\S*)${__T[6]}(?!\s+(?:печ|пічк|опален|отоплен|обігрівач)\S*)|${__T[2]}(?:радіатор\S*|радиатор\S*)(?!\s+(?:печ|пічк|опален|отоплен|обігрівач)\S*)${__T[7]}(?:кипить|кипит|закипа\S*|закипі\S*|закипе\S*)${__T[6]}|${__T[5]}batter(?:y|ies)\s+${__T[8]}(?:not\s+charging|isn['’]?t\s+charging|not\s+being\s+charged|won['’]?t\s+charge|doesn['’]?t\s+charge|not\s+getting\s+charged)(?![a-z])|${__T[2]}(?:акумулятор\S*|аккумулятор\S*|акб)${__T[7]}(?:не\s+заряджа\S*|не\s+заряжа\S*|не\s+зарядж\S*))${__RX[11]}|(?<![a-zа-яіїєґё])(?:(?:горить|горит|загорі\S*|загоре\S*|світить\S*|светит\S*|блима\S*|мига\S*)${__T[7]}(?:ad[\s-]?blue|адблю\S*|адблу\S*)|(?:ad[\s-]?blue|адблю\S*|адблу\S*)${__T[7]}(?:горить|горит|загорі\S*|загоре\S*|світить\S*|светит\S*|блима\S*|мига\S*))${__RX[0]}|${__T[2]}(?:машин\S*|тягач\S*|грузовик\S*|вантажівк\S*|фур[аиуы]?)\s+(?:(?!більше\s+не|больше\s+не|уже\s+не|вже\s+не|не\s)\S+\s+){0,2}?(?:глохнет|глохне|глухне|заглох\S*|заглух\S*)${__RX[0]}|${__T[2]}(?:глохнет|глохне|глухне)\s+(?:на\s+ходу|під\s+час\s+руху|в\s+дорозі|в\s+дороге|на\s+светофоре|на\s+світлофорі)${__RX[0]}|${__T[2]}(?:троит|троїть)${__T[7]}(?:двигун\S*|мотор\S*|двигател\S*)${__RX[0]}|${__T[1]}dampf\s+${__T[8]}(?:aus|unter)\s+(?:de[mnr]\s+)?(?:motorraum|motor|k(?:ü|ue)hler|(?:motor)?haube|frontklappe|k(?:ü|ue)hlergrill)${__T[0]}${__RX[0]}|${__T[1]}(?:motor|k(?:ü|ue)hler|motorraum)${__T[7]}dampft${__T[0]}${__RX[0]}|${__T[5]}steam\S*\s+${__T[8]}(?:from|out\s+of|under)\s+(?:the\s+)?(?:engine|bonnet|hood|radiator|grille)(?![a-z])${__RX[0]}|${__T[5]}(?:engine|radiator)\s+(?:is\s+|was\s+)?steaming(?![a-z])${__RX[0]}|${__T[2]}(?:пар|пара|парит|парить)\s+(?:ид[её]т\s+|йде\s+|іде\s+)?(?:из|з|із)(?:-под|-під)?${__T[7]}(?:капот|двигател|двигун|мотор|радиатор|радіатор)\S*${__RX[0]}|${__T[2]}(?:радиатор|радіатор|двигател|двигун|мотор)\S*${__T[7]}(?:парит|парує)${__T[6]}${__RX[0]}|${__T[1]}ausgleichsbeh(?:ä|ae)lter\S*\s+${__T[8]}(?:leer|gerissen|undicht|kaputt|defekt|leckt|tropft)${__T[0]}${__RX[0]}|${__T[5]}(?:expansion|coolant|header)\s+(?:tank|bottle|reservoir)\s+${__T[8]}(?:empty|cracked|split|leak\S*|broken|low)(?![a-z])${__RX[0]}|${__T[5]}(?<!(?:no|not)\s+)low\s+(?:on\s+)?coolant(?![a-z])${__RX[0]}|${__T[5]}(?:topped\s+up|top(?:ping)?\s+up|added|filled\s+up)\s+${__T[9]}coolant(?![a-z])${__RX[0]}|${__T[2]}(?:расширительн|розширювальн)\S*\s+бач\S*${__T[7]}(?:пуст\S*|порожн\S*|треснул\S*|тріснув\S*|лопнул\S*|лопнув|теч\S*|протіка\S*|протека\S*)${__RX[0]}|${__T[2]}(?:треснул\S*|тріснув\S*|лопнул\S*|лопнув|теч[её]т|тече|протека\S*|протіка\S*)${__T[7]}(?:расширительн|розширювальн)\S*\s+бач\S*${__RX[0]}|${__T[2]}(?:вискомуфт|віскомуфт)\S*${__RX[0]}|${__T[2]}вентилятор\S*\s+(?:радиатор|радіатор|двигател|двигун|охлажден|охолодж)\S*${__T[7]}(?:не\s+\S+|слома\S*|зламав\S*|постоянно\s+\S+|постійно\s+\S+)${__RX[0]}|${__T[2]}не\s+(?:включа\S*|вмика\S*|крут\S*|работа\S*|працю\S*)\s+вентилятор\S*\s+(?:радиатор|радіатор|двигател|двигун|охлажден|охолодж)${__RX[0]}|${__T[1]}(?<!(?:aggregat|k(?:ü|ue)hl(?:aggregat|ung|maschine|ger(?:ä|ae)t)|heizung|standheizung|klima\S*|gebl(?:ä|ae)se|kompressor)\s+(?:\S+\s+){0,3})leistung\s+(?:wird\s+|wurde\s+|ist\s+)?(?:reduziert|gedrosselt|begrenzt)${__T[0]}(?![^.;!?]*(?:aggregat|k(?:ü|ue)hlung|k(?:ü|ue)hlger(?:ä|ae)t|heizung|klima|gebl(?:ä|ae)se))${__RX[0]}|${__T[1]}(?:motor|lkw|fahrzeug|zugmaschine)\s+drosselt${__T[0]}${__RX[0]}|${__T[2]}(?:тосол\S*${__T[7]}(?:уход\S*|ушел|йде|іде|пішов|пропада\S*|пропал\S*|зника\S*|зник)|(?:мало|нет|немає|долил\S*|долив\S*)\s+тосол\S*)${__RX[0]}|(?:${__T[1]}(?:motor|lkw)\s+(?:ist|war)\s+(?:(?!diesel|kraftstoff|sprit|ad\s?blue|harnstoff|strom|licht)\S+\s+){0,4}?ausgegangen${__T[0]}(?![^.;!?]*(?:abstell\S*|gewollt|absichtlich|start[-\s]?stopp|z(?:ü|ue)ndung|ausgeschaltet|abgeschaltet))|${__T[5]}engine\s+${__T[8]}hesitat\S*|(?:^|[.;!?\n]\s*)(?:заглох|заглух)(?:ла|ли)?${__T[6]})${__T[10]}nicht\s+mehr|wieder\s+normal${__T[26]}in\s+ordnung)${__T[23]}no\s+longer${__T[12]}замінив\S*|отремонт\S*|заменил\S*${__T[22]}|${__T[1]}(?:diesel|kraftstoff|sprit|treibstoff|vor)filter(?:s)?${__T[0]}\s+(?:(?:ist|sind|wohl|vermutlich|komplett|total|ganz|schon)\s+){0,3}(?:verstopft|zu(?=\s*(?:$|[.,;!?]))|dicht(?=\s*(?:$|[.,;!?]))|voll(?=\s*(?:$|[.,;!?]))|verdreckt|zugesetzt)${__T[0]}${__RX[51]}|${__T[5]}fuel\s+filters?\s+(?:(?:is|are|was|got)\s+){0,2}(?:clogged|blocked|plugged)(?![a-z])${__RX[51]}|${__T[2]}(?:паливн\S*|топливн\S*)\s+фільтр\S*${__T[7]}(?:забит\S*|забився|засмічен\S*|засорил\S*|засорен\S*)${__RX[51]}|${__T[2]}(?:паливн\S*|топливн\S*)\s+фильтр\S*${__T[7]}(?:забит\S*|забился|засорил\S*|засорен\S*)${__RX[51]}|${__T[1]}(?<!(?:kein|keine|keinen|ohne)\s(?:\S+\s)?)(?:(?:schwarze[nmrs]?|wei(?:ß|ss)e[nmrs]?|blaue[nmrs]?|graue[nmrs]?)\s+(?:rauch|qualm)\s+${__T[8]}(?:beim|bei|unter)\s+(?:gasgeben|gas\s+geben|beschleunigen|anfahren|kaltstart|starten|last|vollgas)|(?:rauch|qualm)\s+${__T[8]}beim\s+(?:gasgeben|gas\s+geben|beschleunigen))${__T[0]}${__RX[59]}|${__T[1]}ladeluft(?:schlauch|schl(?:ä|ae)uche|k(?:ü|ue)hler|leitung|rohr)?${__T[0]}\s+${__T[8]}(?:abgerutscht|abgesprungen|abgefallen|geplatzt|gerissen|undicht|zischt|pfeift|kaputt|defekt|lose|locker|leck|ab(?=\s*(?:$|[.,;!?])))${__T[0]}${__RX[59]}|${__T[5]}(?<!no\s(?:\S+\s)?)(?:(?:black|white|blue|grey|gray)\s+smoke\s+${__T[8]}(?:when|while|on|under)\s+(?:accelerating|acceleration|pulling\s+away|starting|load|cold\s+start|full\s+throttle)|smoke\s+${__T[8]}(?:when|while|on)\s+(?:accelerating|acceleration))(?![a-z])${__RX[59]}|${__T[5]}(?:intercooler|charge[\s-]?air|boost)\s+(?:hose|pipe)s?\s+${__T[8]}(?:split|burst|blown|came\s+off|popped\s+off|leaking|leaks|hissing|broken|loose)(?![a-z])${__RX[59]}|${__T[2]}(?:(?:чорн|біл|син|сір|черн|бел|сер)\S*\s+(?:дим|дым)\S*\s+${__T[8]}(?:при|під\s+час|во\s+время)\s+(?:розгон|разгон|старт|запуск|навантаж|нагрузк|натиск|газуван|газован)|(?:дим|дым)\S*\s+${__T[8]}(?:при|під\s+час|во\s+время)\s+(?:розгон|разгон|натиск\S*${__T[7]}газ|газуван|газован))\S*${__RX[59]}|${__T[2]}(?:(?:патрубок|патрубк\S*|шланг\S*)${__T[7]}(?:інтеркулер|интеркулер|турбін|турбин|наддув)\S*${__T[7]}(?:злетів|злетел|слетел|відлетів|зірвало|сорвало|лопнув|лопнул|порвався|порвался|тріснув|треснул|пропуска\S*|шипить|шипит)|(?:злетів|злетел|слетел|відлетів|зірвало|сорвало|лопнув|лопнул|порвався|порвался|тріснув|треснул)${__T[7]}(?:патрубок|патрубк\S*|шланг\S*)${__T[7]}(?:інтеркулер|интеркулер|турбін|турбин|наддув))\S*${__T[6]}${__RX[59]}|${__T[1]}(?:ad[\s-]?blue|harnstoff)[\s-]?(?:qualit(?:ä|ae)t|f(?:ü|ue)llstand|stand)\s+${__T[8]}(?<!(?:ohne|kein|keine|keinen|no|any|не)\s+)(?:schlecht|mangelhaft|unzureichend|niedrig|gering|zu\s+niedrig|fehler\S*|warnung)${__T[0]}${__RX[60]}|${__T[5]}(?:low\s+ad[\s-]?blue|ad[\s-]?blue\s+(?:level\s+(?:is\s+)?(?:low|empty)|(?:is\s+)?low|quality${__T[7]}(?:poor|bad|low|warning|fault|error)))(?![a-z])${__RX[60]}|${__RX[60]}${__T[1]}nox[\s-]?sensor\S*\s+${__T[9]}(?<!(?:ohne|kein|keine|keinen|no|any|не)\s+)(?:defekt|kaputt|ausgefallen|fehler\S*|st(?:ö|oe)rung|fault\S*|failed|error|not\s+working|несправн\S*|неисправ\S*|помилк\S*|ошибк\S*|${__T[43]})${__RX[60]}|${__RX[60]}${__T[2]}датчик\S*\s+nox${__T[7]}(?:несправн\S*|неисправ\S*|помилк\S*|ошибк\S*${__T[15]}злама\S*|сломал\S*)${__RX[60]}`, 'i', 1);




const SUSP_HINT = lbRx(String.raw`(?:${__T[5]}(?:truck|trailer|semi-?trailer|vehicle|lorry|cab)\s+${__T[8]}(?:sinks|sags)(?![a-z])(?!${__T[7]}(?:into|in)\s+(?:the\s+)?(?:mud|sand|ground|soil|snow))|${__T[5]}(?:truck|trailer|semi-?trailer|vehicle|lorry|cab)\s+${__T[8]}(?:drops|is\s+dropping|keeps\s+dropping|is\s+lowering|lowers|goes\s+down)${__T[7]}(?:overnight|by\s+itself|on\s+its\s+own)(?![a-z])|${__T[2]}(?:причіп\S*|причеп\S*|напівпричіп\S*|прицеп\S*|полуприцеп\S*|тягач\S*|вантажівк\S*|фур[аиуі])\s+${__T[8]}(?:опуска\S*|осіда\S*|оседа\S*|просіда\S*|проседа\S*)${__T[6]}(?!\s+на\s+(?:ножк|опор|стійк|стойк|лап|рамп)\S*))${__T[10]}${__T[42]}|normal)${__T[23]}no\s+longer${__T[11]}заменил\S*|усунул\S*|устранил\S*${__T[22]}|(?:${__T[1]}(?:(?:vorder|hinter|lenk|antriebs${__T[25]}ae|a)nger|trailer|lift|hub|lauf|nach)?achse|achsen|achsaufh(?:ä|ae|a)ngung(?:en)?|achsk(?:ö|oe|o)rper|achsstreben?|achslenker|achstr(?:ä|ae)ger)${__T[0]}\s+(?:${__RX[61]}\S+\s+){0,2}?(?:verbogen|gebrochen|durchgebrochen|angebrochen|krumm|gerissen|abgerissen|angerissen|verzogen|hat\s+(?:einen\s+)?riss)${__T[0]}${__RX[0]}|${__T[3]}(?:verbogen|gebrochen|krumm|gerissen)e[nmrs]?${__T[7]}(?:achse|achsaufh(?:ä|ae|a)ngung|achsk(?:ö|oe|o)rper|achsstrebe|achslenker)${__T[0]}${__RX[0]}${__T[39]}bent|broken|cracked|snapped)\s+(?:(?:front|rear|trailer|drive|steer(?:ing)?|lift)\s+)?axles?(?![a-z])${__RX[0]}|(?<![a-z])axles?\s+(?:${__RX[61]}\S+\s+){0,2}?(?:bent|broken|cracked|snapped|damaged)(?![a-z])${__RX[0]}|${__T[2]}(?:вісь|осі)${__T[6]}\s+(?:${__RX[61]}\S+\s+){0,2}?(?:погну\S*|зігну\S*|вигну\S*|изогну\S*|злама\S*|слома\S*|лопну\S*|трісну\S*|тресну\S*|поломан\S*)${__RX[0]}|${__T[2]}(?:погнут\S*|погнул\S*|зігнут\S*|зігнул\S*|вигнут\S*|зламал\S*|зламан\S*${__T[17]}лопнул\S*|тріснул\S*|треснул\S*)${__T[7]}(?:вісь|ось|осі)${__T[6]}${__RX[0]}|${__T[1]}federbein\S*${__T[7]}(?:gebrochen|defekt|kaputt|undicht|verbogen)${__T[0]}${__RX[0]}|${__T[2]}(?:піднімн\S*|підйомн\S*|подъемн\S*|подъ[её]мн\S*)\s+(?:вісь|ось)${__T[7]}не\s+(?:підніма\S*|опуска\S*|поднима\S*)${__RX[0]}|${__T[1]}(?:feder|blatt|achs)?federbruch${__T[0]}|${__T[1]}(?:die\s+)?(?:feder|federn|federblatt|federbl(?:ä|ae)tter)\s+(?:(?:ist|sind|hinten|vorne|links|rechts|an\s+der\s+\S+|am\s+\S+)[,;]?\s+){0,3}(?:gebrochen|durchgebrochen|abgebrochen)${__T[0]}(?![,;]?${__T[7]}(?:getauscht|ersetzt|erneuert|repariert))${__T[39]}broken|snapped|cracked)\s+(?:leaf\s+|road\s+|suspension\s+)?springs?${__T[24]}(?:leaf\s+|suspension\s+)?springs?\s+(?:is\s+|has\s+)?(?:broken|snapped|cracked)(?![a-z])|${__T[3]}(?:luftfederung|luftfederb(?:ä|ae|a)lg(?:e)?|luftfeder(?:n)?|luftbalg|luftbälge|luftbaelge|luftsack|luftsäcke|federbalg|federbälge|niveauregulierung|niveauregelung|fahrwerk|federung|blattfeder(?:n)?|liftachse(?:n)?|hubachse(?:n)?|achslift)${__T[0]}\s+${__T[9]}(?:geplatzt|gerissen|defekt|spinnt${__T[27]}kaputt|undicht|verliert${__T[7]}luft|zischt|ausgefallen|f(?:ä|ae|a)llt\s+aus|gebrochen|fehler\S*|st(?:ö|oe|o)rung|senkt\s+sich|sackt${__T[7]}ab|l(?:ä|ae|a)sst${__T[7]}ab|hebt\s+nicht|geht\s+nicht\s+hoch|senkt\s+(?:sich\s+)?nicht${__T[0]}|bleibt${__T[7]}(?:oben|unten)${__T[0]}|geht\s+${__T[13]}(?:runter|herunter|ab)${__T[0]}|l(?:ä|ae|a)sst\s+sich\s+${__T[13]}(?:absenken|senken|heben|anheben)|funktioniert\s+nicht)|${__T[3]}(?:lkw|fahrzeug|zugmaschine${__T[25]}ae|a)nger|trailer|kabine|fahrerhaus)\s+${__T[8]}(?:steht\s+(?:(?:hinten|vorne|vorn|links|rechts|total|ganz|sehr|etwas|leicht|richtig|so|zu)\s+){0,2}(?:schief|tief)|h(?:ä|ae)ngt\s+(?:(?:hinten|vorne|vorn|links|rechts|total|ganz|sehr|etwas|leicht|richtig|so|zu)\s+){0,2}tief)${__T[0]}${__RX[62]}|${__T[3]}(?:lkw|fahrzeug|zugmaschine${__T[25]}ae|a)nger|trailer|er|kabine|fahrerhaus)\s+${__T[9]}(?:h(?:ä|ae|a)ngt|liegt|sitzt|ist)\s+${__T[8]}schief${__T[0]}|${__T[3]}(?:lkw|fahrzeug|zugmaschine${__T[25]}ae|a)nger|trailer|kabine|fahrerhaus)\s+${__T[8]}(?:h(?:ä|ae|a)ngt|liegt|sitzt)\s+(?:\S+\s+){0,1}?(?:(?:links|rechts|hinten|vorne?)\s+(?:(?:links|rechts)\s+)?(?:tiefer|runter|herunter|durch)|(?:auf\s+einer\s+seite|einseitig)(?:\s+(?:tiefer|runter|herunter|durch)|(?=\s*(?:$|[.,;!?]))))${__T[0]}|${__T[3]}(?:lkw|fahrzeug|zugmaschine${__T[25]}ae|a)nger|trailer|kabine|fahrerhaus)\s+${__T[9]}(?:ist|sind)\s+${__T[8]}(?:abgesackt|abgesunken|eingesackt)${__T[0]}|${__T[3]}(?:lkw|fahrzeug|zugmaschine${__T[25]}ae|a)nger|trailer|er|kabine|fahrerhaus)\s+${__T[9]}(?:senkt\s+sich\s+${__T[8]}ab|sackt\s+${__T[8]}ab|sinkt\s+ab|liegt\s+${__T[8]}auf\s+(?:den\s+)?(?:puffern|anschlag))${__T[39]}air\s+(?:suspension|bag|bags|bellows|spring|springs)|suspension|leaf\s+springs?|ride\s+height)\s+${__T[9]}(?:burst|failed|failure|fault|broken|leak\S*|loses\s+air|losing\s+air|down|collapsed|not\s+working|error)${__T[24]}(?:truck|trailer|vehicle|cab|it)\s+${__T[9]}(?:is\s+)?(?:leaning|sagging|sinking|tilted|lopsided)${__T[24]}(?:truck|trailer|vehicle|cab|it)\s+${__T[8]}(?:sits|is|hangs|rides|sitting|hanging)\s+(?:much\s+|a\s+lot\s+)?low(?:er)?\s+(?:on\s+(?:one|the\s+(?:left|right|driver|passenger)(?:['’]?s)?)\s+side|on\s+the\s+(?:left|right)|at\s+the\s+(?:back|rear|front))(?![a-z])|${__T[4]}(?:пневмоподуш\S*|подушк\S*|пневмопідвіск\S*|пневмоподвеск\S*|підвіск\S*|подвеск\S*|ресор\S*|рессор\S*)\s+${__T[9]}(?:лопну\S*|луснул\S*|порва\S*|пробит\S*${__T[15]}(?<=(?:підвіск|подвеск)\S*\s+)не\s+(?:опуска|підніма|поднима|підійма)\S*|спуска\S*|травить|тріснул\S*|злама[вл]\S*${__T[17]}злама[внл]\S*)|${__T[4]}(?:вантажівк\S*|причіп\S*|напівпричіп\S*|прицеп\S*|грузовик\S*)\s+${__T[8]}(?:просі\S*|просел\S*|перекос\S*|перекош\S*|нахил\S*|криво)|${__T[5]}lift(?:ing)?\s+axles?${__T[7]}(?:stuck|jammed|faulty|broken|not\s+working|won['’]?t\s+(?:lift|lower|go\s+(?:up|down))|doesn['’]?t\s+(?:lift|lower|go\s+(?:up|down)))|${__T[4]}(?:підйомн|подъемн|піднімальн)\S*\s+(?:вісь|осі|ось)${__T[7]}(?:не\s+підніма\S*|не\s+поднима\S*|не\s+опуска\S*|заклин\S*|${__T[43]})|${__RX[7]}${__T[5]}air\s+(?:suspension|bags?|bellows)\s+${__T[8]}(?:dropping|drops|dropped|sinking|sinks|sank|sagging|sags|sagged|going\s+down|deflat\S*|leaking|burst)(?![a-z])${__RX[7]}|${__RX[7]}${__T[2]}(?:пневмопідвіск\S*|пневмоподвеск\S*|подушк\S*\s+підвіск\S*|подушк\S*\s+подвеск\S*)${__T[7]}(?:опуска\S*|спуска\S*|сіда\S*|сада\S*|пада\S*|трав\S*|лопну\S*)${__RX[7]}|${__RX[7]}${__T[2]}(?:лопну\S*|трісну\S*|тресну\S*|злама\S*|слома\S*)\s+(?:ресор\S*|рессор\S*|пружин\S*)${__T[6]}${__RX[7]}|${__RX[7]}${__T[2]}(?:ресор\S*|рессор\S*)${__T[7]}(?:лопну\S*|трісну\S*|тресну\S*|злама\S*|слома\S*)${__RX[7]}|${__RX[7]}${__T[1]}sto(?:ß|ss)d(?:ä|ae)mpfer\s+${__T[8]}(?:undicht|leck|ausgelaufen|defekt|kaputt|gebrochen|abgerissen|(?:verliert|schwitzt)${__T[7]}(?:ö|oe)l)${__T[0]}${__RX[7]}|${__RX[7]}${__T[5]}(?:shock\s+absorbers?|shocks|dampers?)\s+${__T[8]}(?:leak\S*|broken|blown|gone|worn\s+out)(?![a-z])${__RX[7]}|${__RX[7]}${__T[2]}амортизатор\S*${__T[7]}(?:тече|течет|потік|потек|злама\S*|слома\S*|відірва\S*|оторва\S*)${__T[6]}${__RX[7]}|${__RX[7]}${__T[1]}(?:luftfederung|luftfeder|niveauregulierung|fahrh(?:ö|oe)he)\s+${__T[8]}(?:zu\s+(?:tief|niedrig|hoch)|ganz\s+unten)${__T[0]}${__RX[7]}|${__RX[7]}${__T[5]}(?:air\s+suspension|ride\s+height)\s+${__T[8]}(?:too\s+(?:low|high)|right\s+down|all\s+the\s+way\s+down)(?![a-z])${__RX[7]}|${__RX[7]}${__T[2]}(?:машин\S*|вантажівк\S*|причіп|причеп\S*|напівпричіп|грузовик\S*|прицеп\S*|фур\S*)${__T[7]}(?:кренить|кренит|хилить|накренил\S*|завалю\S*)${__RX[7]}|${__RX[7]}${__T[2]}крен\s+на\s+(?:один|одну)\s+(?:бік|бок|сторону)${__RX[7]})${__RX[26]}|${__T[3]}(?:lkw|fahrzeug|zugmaschine${__T[25]}ae|a)nger|trailer|kabine|fahrerhaus)\s+steht\s+${__RX[62]}(?:seit\s+(?:\S+\s+){1,3}?|(?:heute|gestern)\s+(?:(?:morgen|fr(?:ü|ue)h|abend)\s+)?|(?:jetzt|pl(?:ö|oe)tzlich|wieder|schon|immer\s+noch|noch\s+immer)\s+|auf\s+einmal\s+)(?:(?:hinten|vorne|vorn|links|rechts|total|ganz|sehr|etwas|leicht|richtig|so|zu)\s+){0,2}(?:schief|tief)${__T[0]}${__RX[0]}|${__T[2]}(?:(?:лопну\S*|луснул\S*|порвал\S*)\s+(?:пневмо)?подушк[а-яіїєґё]*${__T[6]}(?!\s+(?:безпек|безопасн|сидін|сиден|крісл|кресл))|(?:причіп|напівпричіп|прицеп|полуприцеп)\S*\s+не\s+(?:підніма|підійма|поднима|опуска)\S*\s+на\s+(?:пневмо)?подушк)${__RX[7]}|${__T[2]}(?:(?:прицеп|полуприцеп|причіп|напівпричіп|причеп|напівпричеп|тягач|фура|машина|грузовик|вантажівка)\S*${__T[7]}(?<!не\s)(?:сел|села|сів|сіла|просел\S*|осел|осела|осів|осіла)${__T[7]}(?:на\s+(?:одну\s+|один\s+)?(?:сторону|бок|бік|правую|левую|праву|ліву|правый|левый|правий|лівий)|сзади|спереди|ззаду|спереду|назад|на\s+задн\S*|на\s+передн\S*)|(?:пробило|пробил\S*|пробив\S*|порвало|прорвало|розірвало|разорвало)${__T[7]}(?:пневмо)?подушк\S*${__RX[63]}|(?:пневмо)?подушк\S*${__RX[63]}${__T[7]}не\s+(?:накачива\S*|надува\S*|накачу\S*|держит|держат|тримає|тримають|наполня\S*|наповню\S*|поднима\S*|підніма\S*))${__T[6]}${__T[10]}fixed|repaired|replaced${__T[12]}отремонт\S*|заменил\S*|починил\S*|полагод\S*|поменял\S*))`, 'i', 1);





const ENGINE2_HINT = lbRx(String.raw`(?:(?:${__T[1]}(?:motor|lkw|er)\s+${__T[9]}(?:s(?:ä|ae)uft|soff)\s+${__T[8]}ab${__T[0]}|${__T[1]}motor\s+${__T[8]}abgesoffen${__T[0]}|${__T[1]}motor\s+${__T[8]}dreht\s+${__T[8]}${__T[13]}(?:richtig\s+|ganz\s+)?hoch${__T[0]}|${__T[1]}(?:leerlauf)?drehzahl\s+(?:geht|kommt|steigt)${__T[7]}${__T[13]}(?:(?:ü|ue)ber|hoch|h(?:ö|oe)her)${__T[0]}|${__T[1]}(?:leerlauf)?drehzahl${__T[7]}(?:schwankt|springt|pendelt|s(?:ä|ae)gt|geht\s+(?:hoch|rauf)\s+und\s+runter)${__T[0]}|${__T[1]}motor\s+${__T[8]}(?:z(?:ü|ue)nd)?aussetzer${__T[0]}|${__T[1]}(?:z(?:ü|ue)nd)?aussetzer\s+(?:am|im|beim)\s+motor${__T[0]}|${__T[1]}motor${__T[7]}(?:l(?:ä|ae)uft|wird|ist|wurde)\s+(?:(?!nicht|kein)\S+\s+)?(?:zu\s+)?hei(?:ß|ss)${__T[0]}|(?<![a-z])engine\s+${__T[8]}(?:misfir\S*|running\s+hot|runs\s+hot|getting\s+hot)|${__T[2]}(?:двигун\S*|двигател\S*|двигатель|мотор\S*)${__T[7]}не\s+набира\S*${__T[7]}(?:оберт\S*|оборот\S*)|${__T[2]}(?:двигун\S*|двигател\S*|двигатель|мотор\S*)${__T[7]}(?:троїть|троит))|^(?![\s\S]*(?:stau|baustelle|nebel|gl(?:ä|ae)tte|glatteis|schnee|reifen|tyre|tire|polizei|vorschrift|tempolimit|speed\s+limit|traffic|шин\S*|колес\S*|пробк\S*|затор\S*|ожеледиц\S*|гололед\S*))[\s\S]*?(?:${__T[1]}(?:f(?:ä|ae)hrt|fahre|fahren|kommt|komme|schafft)\s+${__T[8]}nur\s+(?:noch\s+)?(?:\d+|schritt(?:tempo|geschwindigkeit))${__T[0]}|${__T[1]}(?:f(?:ä|ae)hrt|fahre|geht)${__T[7]}${__T[13]}(?:schneller\s+als|(?:ü|ue)ber)\s+\d+|${__T[1]}kriecht\s+nur\s+noch${__T[0]}|${__T[1]}(?:geschwindigkeit|tempo|lkw|motor)${__T[7]}(?:ist\s+)?(?:begrenzt|gedrosselt|abgeriegelt)\s+auf\s+\d+|(?<![a-z])${__T[18]}does\s+not|can['’]?t|cannot)\s+go\s+(?:above|over|faster\s+than)\s+\d+${__T[39]}truck|lorry|it)\s+(?:only\s+(?:does|goes|drives)|is\s+only\s+doing)\s+\d+|${__T[2]}(?:їде|йде|едет|идет)${__T[7]}(?:тільки|лише|только)\s+\d+))${__RX[43]}`, 'i', 1);




const ENGINE3_HINT = lbRx(String.raw`(?<!(?:k(?:ü|ue)hl(?:aggregat|auflieger|koffer|ger(?:ä|ae)t|raum|box)|laderaum|ladung|reefer|fridge|рефрижератор\S*|холодильн\S*)[^.;!?]*)(?![^.;!?]*(?:k(?:ü|ue)hl(?:aggregat|auflieger|koffer|ger(?:ä|ae)t|raum|box)|laderaum|ladung|reefer|fridge|рефрижератор\S*|холодильн\S*))(?:${__T[1]}(?:motor|wasser|k(?:ü|ue)hlwasser)?temperatur(?:\s?(?:nadel|zeiger|anzeige))\s+${__T[9]}(?:hoch|rauf|nach\s+oben|auf\s+rot|(?:im|in\s+den)\s+roten)${__T[0]}|${__T[1]}(?:motor|wasser|k(?:ü|ue)hlwasser)?temperatur\s+${__T[8]}(?:steigt|klettert|geht${__T[7]}hoch)\s+${__T[8]}(?:bergauf|berghoch|am\s+berg|an\s+(?:der\s+)?steigung(?:en)?)${__T[0]}|${__T[1]}(?:bergauf|berghoch|am\s+berg|an\s+(?:der\s+)?steigung(?:en)?)\s+${__T[9]}temperatur\s+${__T[8]}(?:hoch|rauf|steigt|klettert)${__T[0]}|${__T[1]}(?:motor|wasser|k(?:ü|ue)hlwasser|k(?:ü|ue)hlmittel)?temperatur(?:anzeige)?\s+${__T[8]}(?:(?:ü|ue)ber\s+|bei\s+|auf\s+|von\s+)?(?:9[5-9]|1[01]\d)\s*(?:grad|°)|${__T[1]}(?<!kein(?:en|e)?\s)dampf(?:t|en)?${__T[0]}\s+${__T[9]}(?:unter\s+(?:der|dem)|unterm)\s+(?:kabine|fahrerhaus|f(?:ü|ue)hrerhaus)${__T[0]}|${__T[1]}(?:unter\s+(?:der|dem)|unterm)\s+(?:kabine|fahrerhaus|f(?:ü|ue)hrerhaus)\s+${__T[8]}(?:dampft|(?:kommt|steigt)${__T[7]}dampf)${__T[0]}|${__T[1]}(?:motor|visco-?|visko|k(?:ü|ue)hler)l(?:ü|ue)fter\s+${__T[8]}(?:springt|l(?:ä|ae)uft|schaltet)\s+${__T[8]}${__T[13]}(?:an|ein|zu)${__T[0]}|${__T[5]}(?<!no\s)steam(?:ing)?\s+${__T[9]}under\s+the\s+cab(?![a-z])|${__T[5]}(?:engine|truck|lorry|motor)\s+(?:is\s+|keeps\s+|was\s+|started\s+|been\s+)?running\s+(?:very\s+|too\s+|really\s+|a\s+bit\s+)?hot(?![a-z])|${__T[5]}engine\s+temp(?:erature)?\s+${__T[8]}(?:rising|going\s+up|climbing|warning|(?:too\s+)?high|light)(?![a-z])|${__T[5]}temp(?:erature)?\s+${__T[8]}(?:rising|rises|goes\s+up|going\s+up|climbing|climbs)\s+${__T[8]}(?:on\s+(?:the\s+)?(?:hills?|inclines?)|uphill|going\s+up\s+hills?)(?![a-z])|${__T[2]}(?:пар|пара|парить|парит|парує)${__T[6]}${__T[7]}(?:з-під|з\s+під|із-під|зпід|из-под|из\s+под)${__T[7]}(?:кабін\S*|кабин\S*)|${__T[2]}(?:мотор|двигун|двигатель|двигател\S*|антифриз|тосол|радіатор|радиатор)\S*${__T[7]}(?:закипів|закипел|закипает|закипає|кипит|кипить)${__T[6]})${__T[10]}${__T[42]}|normal)${__T[23]}back\s+to\s+normal${__T[12]}замінив\S*|полагодил\S*${__T[29]}починил\S*))`, 'i', 1);


const NOSTART2_HINT = lbRx(String.raw`(?:${__T[1]}anlasser${__T[7]}(?:klackt|klickt|klickert|macht\s+nur\s+(?:klick|klack))${__T[0]}(?!\s+(?:nicht|nie|kein)\b)|${__T[1]}(?:es\s+)?(?:klackt|klickt)\s+nur\s+(?:noch\s+)?(?:beim\s+)?(?:starten|anlassen|zünden)${__T[0]}|${__T[2]}(?:щелка\S*|клаца\S*)\s+(?:только\s+|тільки\s+|лише\s+)?стартер|${__T[2]}(?<!(?:телефон|моб|планшет|рац|сканер|нав[иі]г|ноут|пульт)\S*${__T[7]})(?:батаре[яиюей]|батареї|акб|аккумулятор\S*|акумулятор\S*)${__T[6]}${__RX[64]}${__T[7]}(?:разряжен\S*|розряджен\S*|разрядил\S*|розрядил\S*|не\s+(?:держит|тримає|держать|тримають)\s+заряд\S*|не\s+(?:заряжа\S*|заряджа\S*))${__T[6]}|${__T[2]}(?<!(?:телефон|моб|планшет|рац|сканер|нав[иі]г|ноут|пульт)\S*${__T[7]})(?:разрядил\S*|розрядил\S*|сдох\S*|здох\S*)${__T[7]}(?:батаре[яиюей]|батареї|акб|аккумулятор\S*|акумулятор\S*)${__T[6]}${__RX[64]})${__T[10]}${__T[42]})|fixed|repaired|replaced${__T[12]}замінив\S*|полагодил\S*${__T[29]}починил\S*|усунул\S*|устранил\S*|почистил\S*|зачистил\S*|затянул\S*|подтянул\S*|підтягнул\S*))`, 'i', 1);
const ENGINE4_HINT = lbRx(String.raw`(?:(?<!(?:batterie|akku|handy|tablet|klima|gebl(?:ä|ae)se|heizung|licht|lampe|bremse|pumpe|aggregat|k(?:ü|ue)hl\S*|reefer)[^.;!?]*)${__T[1]}keine\s+leistung\s+mehr${__T[0]}|${__T[5]}(?:truck|lorry|engine|tractor\s+unit)\s+(?:is\s+|keeps\s+)?(?:jerk\S*|judder\S*|surg\S*|bucking)(?![^.;!?]*(?:brak\S*|gear\S*|shift\S*))|${__T[5]}(?:rpm|revs)\s+(?:is\s+|are\s+|keeps?\s+)?(?:jump\S*|fluctuat\S*|surg\S*|hunting|going\s+up\s+and\s+down)|${__T[2]}(?:заводи\S*|завод\S*ся|завел\S*|завів\S*|запуска\S*)\s+(?:и|і|й|та)\s+(?:сразу\s+|одразу\s+|відразу\s+|тут\s+же\s+|потом\s+|потім\s+)?(?:заглох\S*|заглух\S*|глохн\S*|глухн\S*)|${__T[2]}(?<!не\s)(?:глохн|глухн)\S*\s+на\s+холост\S*|${__T[2]}(?:пропал\S*|зникл\S*|пропад\S*)\s+(?:тяг\S*|потужн\S*|мощн\S*)|${__T[2]}(?:тяга|потужність|мощность)${__T[7]}(?:пропал\S*|зникл\S*|пропада\S*)|${__T[2]}(?:обороты|оберти|обороти)\s+(?:(?!не\s)\S+\s+)?(?:скач\S*|плава\S*|прыга\S*|стриба\S*|гуля\S*)|${__T[2]}(?:машин\S*|тягач\S*|грузовик\S*|вантажівк\S*|фур[аиуы]|мотор\S*|двигун\S*|двигател\S*)\s+(?:(?!не\s)\S+\s+)?(?:дерга\S*|смика\S*)(?![^.;!?]*(?:тормож\S*|торможен\S*|гальм\S*|переключ\S*|перемика\S*)))${__T[10]}${__T[42]})|fixed|repaired|replaced${__T[12]}замінив\S*|полагодил\S*${__T[29]}починил\S*|усунул\S*|устранил\S*))`, 'i', 1);
const GEAR2_HINT = lbRx(String.raw`(?:(?:${__T[1]}(?:getriebe|automatik|automatikgetriebe|schaltung|gangschaltung)\s+${__T[8]}(?:h(?:ä|ae)ngt|bleibt|geht|springt|f(?:ä|ae)llt)\s+${__T[8]}(?:im|in\s+den|ins|auf|in)\s+(?:neutral|leerlauf|n)${__T[0]}|${__T[1]}schaltet${__T[7]}nur\s+(?:noch\s+)?bis\s+(?:zum\s+|in\s+den\s+)?(?:\d+\.?|erste[nm]?|zweite[nm]?|dritte[nm]?|vierte[nm]?|f(?:ü|ue)nfte[nm]?|sechste[nm]?|siebte[nm]?|achte[nm]?|neunte[nm]?|zehnte[nm]?|elfte[nm]?|zw(?:ö|oe)lfte[nm]?)\s+gang${__T[0]}|${__T[1]}(?:bleibt|h(?:ä|ae)ngt)\s+${__T[8]}im\s+(?:\d+\.?|erste[nm]?|zweite[nm]?|dritte[nm]?|vierte[nm]?|f(?:ü|ue)nfte[nm]?|sechste[nm]?|siebte[nm]?|achte[nm]?|neunte[nm]?|zehnte[nm]?|elfte[nm]?|zw(?:ö|oe)lfte[nm]?)\s+gang${__T[0]}|${__T[1]}kommt\s+${__T[13]}(?:(?:ü|ue)ber|aus)\s+(?:den\s+|dem\s+)?(?:\d+\.?|erste[nm]?|zweite[nm]?|dritte[nm]?|vierte[nm]?|f(?:ü|ue)nfte[nm]?|sechste[nm]?|siebte[nm]?|achte[nm]?|neunte[nm]?|zehnte[nm]?|elfte[nm]?|zw(?:ö|oe)lfte[nm]?)\s+gang${__T[0]}|${__T[1]}(?:getriebe|schaltung|gangschaltung|automatik|automatikgetriebe)\s+(?:spinnt|funktioniert\s+nicht|geht\s+nicht)${__T[0]}|${__T[1]}kriechgang${__T[7]}(?:geht|funktioniert)\s+nicht${__T[0]}|${__T[1]}(?:f(?:ä|ae)hrt|rollt|bewegt\s+sich)\s+nicht\s+${__T[8]}(?:obwohl|trotz)${__T[7]}gang${__T[0]}|${__T[1]}(?:f(?:ä|ae)hrt|rollt)\s+nicht\s+(?:los\s+)?${__T[8]}gang\s+(?:ist\s+)?drin${__T[0]}|${__T[1]}gang\s+(?:ist\s+)?drin\s+${__T[9]}(?:f(?:ä|ae)hrt|rollt|bewegt\s+sich)\s+(?:aber\s+)?nicht${__T[0]}|${__T[1]}motor\s+l(?:ä|ae)uft${__T[7]}aber\s+${__T[8]}(?:f(?:ä|ae)hrt|rollt|bewegt\s+sich)\s+nicht${__T[0]}|(?<![a-z])stuck\s+in\s+(?:neutral|\d+(?:st|nd|rd|th)(?:\s+gear)?|(?:first|second|third|fourth|fifth|sixth|reverse)\s+gear)${__T[24]}no\s+reverse(?:\s+gear)?(?![a-z])(?!\s+(?:parking|allowed|sign|here|zone))|(?<![a-z])${__T[18]}does\s+not)\s+(?:shift|change)\s+(?:up|down)${__T[24]}${__T[18]}does\s+not|can['’]?t|cannot)\s+(?:(?:go|get|engage|select|shift|change|put\s+it)${__T[7]}(?:in(?:to)?\s+)?(?:reverse|gears?)|(?:shift|change)\s+(?:gears?\s+)?(?:above|past|beyond))${__T[24]}${__T[18]}does\s+not)\s+(?:move|drive)\s+(?:at\s+all\s+)?(?:in\s+gear|forwards?\s+or\s+backwards?)${__T[24]}in\s+gear\s+but\s+(?:no\s+drive|(?:it\s+|the\s+truck\s+)?${__T[18]}does\s+not)\s+move)${__T[24]}clutch\s+(?:pedal\s+)?(?:\S+\s+)?(?:does\s+not|doesn['’]?t|won['’]?t|will\s+not|isn['’]?t|is\s+not|not)\s+(?:(?:come|coming|spring\S*|go\S*)\s+(?:back|up)|return\S*)${__T[24]}(?:burn\S*|hot)\s+smell\s+(?:from|of|coming\s+from)\s+(?:the\s+)?clutch${__T[24]}(?:gearbox|transmission|gear\s*shift\S*|gear\s+changes?|shifting)\s+${__T[8]}(?:jerk\S*|jolt\S*)${__T[39]}jerk\S*|jolt\S*)${__T[7]}(?:when|while)\s+(?:changing|shifting)${__T[24]}(?:amt|opticruise|i-?shift|powershift|tipmatic|traxon)${__T[7]}(?:fault|error|failure|problem|warning|not\s+working)(?![a-z])|${__T[2]}(?:коробк\S*|кпп)${__T[7]}(?:застрягл\S*|залипа\S*|зависа\S*|застря\S*)${__T[7]}(?:на\s+)?нейтрал\S*)|^(?![\s\S]*(?:licht|blinker|l(?:ü|ue)fter|klima|heizung|pumpe|aggregat|k(?:ü|ue)hl|ampel|wischer|radio|schalter|zeitschaltuhr|stecker|ger(?:ä|ae)t))[\s\S]*?(?:${__T[1]}(?:schaltet|schalten)${__T[7]}${__T[13]}(?:richtig\s+)?(?:hoch|runter|herunter|zur(?:ü|ue)ck)${__T[0]}|${__T[1]}(?:getriebe|automatik|lkw|er)\s+schaltet\s+(?:gar\s+|(?:ü|ue)berhaupt\s+)?nicht(?:\s+mehr)?${__T[0]}|^\s*schaltet\s+(?:gar\s+)?nicht${__T[0]}|${__T[1]}schaltet${__T[7]}(?:ruckartig|ruckelig|hart|komisch|unruhig|wild|willk(?:ü|ue)rlich|von\s+alleine?|selbstst(?:ä|ae)ndig)${__T[0]}))${__RX[43]}`, 'i', 1);

const GEAR3_HINT = lbRx(String.raw`(?:${__T[2]}(?:педал\S*\s+)?(?:сцеплени|зчепленн)\S*${__T[7]}(?<!не\s)(?:остал\S*|залиш\S*|застр\S*|завис\S*|лежит|лежить|висит|висить|упал\S*|впал\S*|провал\S*)${__T[7]}(?:в|у|на)\s+(?:полу|пол|підлоз\S*|підлогу)${__T[6]}|${__T[2]}(?:педал\S*\s+)?(?:сцеплени|зчепленн)\S*${__T[7]}не\s+(?:возвраща\S*|поверта\S*|вертает\S*)|${__T[2]}(?<!не\s)(?:хруст\S*|скреж\S*|скрег\S*|скрип\S*|тріщ\S*|трещ\S*)\s+${__T[8]}(?:при|під\s+час|во\s+время|когда|коли)${__T[7]}(?:переключени|перемиканн|включени|вмиканн|переключа|перемика|включа|вмика)\S*|${__T[2]}(?:коробк\S*\s+|кпп\s+)?(?:завис\S*|застря\S*|висит|висить|залип\S*|осталась|остался|залишил\S*|встала|стала)${__T[7]}(?:в|на|у)\s+нейтрал\S*|${__T[2]}(?<!не\s)(?:пахн\S*|запах\S*|воня\S*|смерд\S*|смердит\S*)\s+${__T[8]}(?:сцеплени|зчепленн)\S*|${__T[2]}(?:сцеплени|зчепленн)\S*\s+(?:горит|горить|паленым|палене|воняет|пахнет|смердить|пахне|сгорел\S*|згоріл\S*)${__T[6]}|${__T[2]}(?<!не\s)(?:горит|горить|сгорел\S*|згоріл\S*|згорів)${__T[7]}(?:сцеплени|зчепленн)\S*|${__T[1]}(?:riecht|stinkt|geruch)\s+${__T[8]}(?:nach\s+)?(?:(?:verbrannte[rn]?|verschmorte[rn]?)\s+)?kupplung${__T[0]}|${__T[1]}kupplung${__T[7]}(?:stinkt|riecht|ist\s+verbrannt|verbrannt)${__T[0]}|${__T[5]}(?:smell\S*|stink\S*)\s+(?:of\s+|like\s+)?(?:a\s+)?(?:burnt\s+|burning\s+)?clutch(?![a-z])|${__T[2]}не\s+(?:едет|їде|поедет|поїде|трогается|рушает|рушає)\s+${__T[8]}(?:передач\S*|скорост\S*)${__T[7]}(?:включен\S*|увімкнен\S*|вкл)${__T[6]}|${__T[2]}(?:передач\S*|скорост\S*)\s+(?:включен\S*|увімкнен\S*)\s+${__T[8]}не\s+(?:едет|їде|трогается|рушає)${__T[6]}|${__T[2]}не\s+(?:едет|їде|поедет|поїде)\s+ни\s+вперед\s+ни\s+назад|${__T[2]}не\s+(?:едет|їде|поедет|поїде)\s+ні\s+вперед\s+ні\s+назад|${__T[2]}не\s+(?:переключа|перемика)\S*\s+(?:выше|вище|дальше|далі)${__T[6]}|${__T[2]}(?:коробк\S*|кпп|автомат\S*)\s+(?:(?!не\s)\S+\s+)?(?:тупит|тупить|дерга\S*|смика\S*|пина\S*|бьет|б'є|б’є|глюч\S*)${__T[6]}|${__T[2]}(?<!не\s)(?:дерга\S*|смика\S*|пина\S*)${__T[7]}при\s+(?:переключени|перемиканн)\S*)${__RX[7]}`, 'i', 1);
const GEAR_HINT = lbRx(String.raw`${__T[2]}(?:вибива\S*|выбива\S*)${__T[7]}передач\S*${__RX[65]}|${__T[2]}передач\S*${__T[7]}(?:вилітає|вилетіла|вылетает|вылетела|вискакує|выскакивает)${__RX[65]}|${__T[5]}(?:jump(?:s|ing|ed)?|pop(?:s|ping|ped)?|slip(?:s|ping|ped)?)\s+out\s+of\s+(?:gear|\d+(?:st|nd|rd|th))(?![a-z])${__RX[18]}|(?:(?<![a-z])clutch\s+${__T[18]}does\s+not|not)\s+(?:disengag\S*|releas\S*)|${__T[2]}не\s+(?:включа\S*|вмика\S*)${__T[7]}(?:передач\S*|скорост\S*))${__RX[0]}|${__T[1]}kupplung(?:spedal)?\s+(?:(?:ist|geht|wird|l(?:ä|ae)sst\s+sich|sehr|total|extrem|so|zu|ganz|richtig|heute|immer|seit\s+\S+|mittlerweile|inzwischen|auf\s+einmal|pl(?:ö|oe)tzlich)\s+){0,3}(?:schwer|hart|stramm|schwerg(?:ä|ae)ngig)${__T[0]}(?!\s+(?:besch(?:ä|ae)digt|verletzt|kaputt|verbogen))${__RX[10]}|${__T[5]}clutch(?:\s+pedal)?\s+(?:(?:is|feels|has\s+become|got|very|really|so|too|suddenly)\s+){0,3}(?:heavy|stiff|hard\s+to\s+(?:press|push))(?![a-z])${__RX[10]}|${__T[2]}зчеплення\s+${__T[8]}(?:туге|важке|важко\s+вичавлюється)|${__T[2]}сцепление\s+${__T[8]}(?:тугое|тяж(?:е|[её])лое|тяжело\s+выжимается)|${__T[3]}(?:getriebe|schaltgetriebe|automatikgetriebe|getriebesteuerung|schaltung|gangschaltung|schalthebel|ganghebel|g(?:ä|ae|a)nge|gang|r(?:ü|ue|u)ckw(?:ä|ae|a)rtsgang|vorw(?:ä|ae|a)rtsgang|kupplungspedal|kupplungsautomat|kupplungssteller)${__T[0]}\s+${__T[9]}(?:schaltet${__T[7]}(?:nicht|nicht\s+mehr|falsch|ständig)|(?:geht|gehen)${__T[7]}schwer${__T[0]}|schwerg(?:ä|ae|a)ngig|bleibt${__T[7]}unten|kommt${__T[7]}${__T[13]}(?:hoch|zur(?:ü|ue|u)ck)|geht${__T[7]}${__T[13]}(?:rein|herein|hinein|raus|heraus)|geht\s+nicht${__T[0]}|geht\s+nicht\s+mehr|l(?:ä|ae|a)ss(?:t|en)\s+sich${__T[7]}${__T[13]}(?:einlegen|schalten|treten)|l(?:ä|ae|a)ss(?:t|en)\s+sich${__T[7]}(?:nur\s+)?schwer\s+(?:einlegen|schalten)|springt${__T[7]}(?:raus|heraus)|hakt|klemmt|klemmen|kracht|knirscht|rutscht|fehler\S*|st(?:ö|oe|o)rung|defekt|kaputt|ausgefallen|f(?:ä|ae|a)llt\s+aus|bleibt${__T[7]}(?:unten|stecken|h(?:ä|ae|a)ngen)|kommt\s+${__T[13]}(?:hoch|zur(?:ü|ue|u)ck))|${__T[3]}(?:kupplung)${__T[0]}\s+${__T[8]}(?:rutscht|riecht|stinkt|quietscht|trennt\s+nicht|greift${__T[7]}(?:nicht|spät|spaet)|pedal\S*)|${__T[3]}(?:getriebe|schaltgetriebe|automatikgetriebe|schaltung|gangschaltung|schalthebel|ganghebel)${__T[7]}blockiert${__T[0]}|${__T[3]}(?:getriebefehler|getriebest(?:ö|oe|o)rung|getriebeschaden|kein\s+gang|keinen\s+gang|neutralstellung|bleibt\s+${__T[8]}im\s+gang\s+h(?:ä|ae|a)ngen)${__T[0]}|(?<![a-z])(?<!landing\s)(?:gearbox|transmission|gear\s*shift|gears?|reverse\s+gear|clutch(?:\s+pedal)?)\s+${__T[9]}(?:fault|failure|failed|error|slipping|slips|stuck|won['’]?t\s+(?:engage|shift|go\s+in)|not\s+(?:engaging|shifting|working)|doesn['’]?t\s+(?:engage|shift|work)|grinding|jumps\s+out|broken|hard\s+to\s+(?:engage|shift|select))${__T[24]}(?:can['’]?t|cannot|unable\s+to)${__T[7]}(?:engage|select|shift\s+into|get\s+(?:it\s+)?into)\s+(?:a\s+|any\s+|the\s+)?(?:gear|reverse)(?![a-z])|${__T[4]}(?:коробк\S*|кпп|передач\S*|зчепленн\S*|сцеплени\S*|задн\S*\s+(?:хід|ход))\s+${__T[9]}(?:не\s+перемика\S*|не\s+переключа\S*|не\s+вмика\S*|не\s+включа\S*|(?<!не\s)(?:буксу\S*|пробукс\S*)|помилк\S*|ошибк\S*${__T[15]}заклин\S*|клин(?:ит|ить|ят|ять|ило|ує)${__T[6]}|туго\S*|вилітає|вылетает${__T[28]}не\s+вичавлю\S*|не\s+вижима\S*|не\s+выжима\S*)|${__T[4]}(?:буксу|пробукс)\S*${__T[7]}(?:зчепленн|сцеплени)\S*|${__T[4]}(?:зчепленн|сцеплени)\S*${__T[7]}(?:вед[её]т|веде)${__T[6]}(?!\s+(?:себе|себя))|${__T[4]}задн(?:я|яя|юю)\s+не\s+(?:вмика|включа)\S*|${__RX[7]}${__T[1]}(?:(?:achs|differential|differenzial)?getriebe|differen[tz]ial|(?:hinter|antriebs)?achse|hinterachsdifferen[tz]ial)${__T[0]}\s+${__T[8]}(?:heult|jault|pfeift|singt|brummt|knackt|kracht|quietscht|macht\s+(?:(?:komische|laute|starke|seltsame)\s+)?ger(?:ä|ae)usche?)${__T[0]}${__RX[7]}|${__RX[7]}${__T[5]}(?:gearbox|transmission|differential|diff|(?:rear|drive|back)\s+axle|axle)\s+${__T[9]}(?:whin\S*|howl\S*|nois\S*|grind\S*|crunch\S*)(?![a-z])${__RX[7]}|${__RX[7]}${__T[2]}(?:коробк\S*|кпп|редуктор\S*|(?:задн\S*|ведуч\S*)\s+(?:мост|міст)|(?:мост|міст)(?!\s+(?:через|над|біля|возле|над)${__T[6]}))(?:\s+(?:передач|моста|мосту))?\s+${__T[8]}(?:гуде|гудит|виє|воет|скрегоче|скрежещет|хрусти\S*|шумить|шумит|скрипить|скрипит)${__T[6]}${__RX[7]}|${__RX[7]}${__T[2]}не\s+(?:перемика\S*|переключа\S*)${__T[7]}(?:передач\S*|скорост\S*)${__RX[7]}|${__RX[7]}${__T[2]}(?:передач\S*|скорост\S*)\s+не\s+(?:перемика\S*|переключа\S*|включа\S*|вмика\S*)${__RX[7]}|${__T[1]}kupplung(?:spedal)?${__T[0]}\s+(?:(?:kommt|greift|packt|fasst)\s+)(?:(?:erst|sehr|ganz|total|viel|zu|jetzt|immer|schon|extrem|richtig)\s+){0,3}(?:sp(?:ä|ae)t|oben|hoch)${__T[0]}${__RX[66]}|${__T[5]}clutch\s+(?:pedal\s+)?(?:(?:is|has\s+started|started|now|really)\s+)?(?:bites|biting|engages|engaging|catches|catching|grabs|grabbing|takes\s+up)\s+(?:(?:very|really|too|quite|right|at|the|way)\s+){0,3}(?:high|late|top)(?![a-z])${__RX[66]}|${__T[5]}clutch\s+pedal${__T[7]}(?:stays|stuck|staying|remains)\s+(?:down|on\s+the\s+floor)(?![a-z])${__RX[66]}|${__T[2]}(?:зчепленн\S*|сцеплени\S*)${__T[7]}(?:бере|хапає|хватает|берет|схоплю\S*|схватыва\S*)${__T[7]}(?:пізно|поздно|високо|высоко|вгорі|вверху)${__RX[66]}|${__RX[7]}${__T[5]}(?<!landing\s)(?:gearbox|transmission|gear\s*(?:lever|stick|shift(?:er)?)|gearstick|gears)\s+(?:(?:keeps|keep|always|constantly|sometimes|often|now|still|is|are|has\s+been|have\s+been)\s+){0,2}(?:sticks|sticking|stick(?=\s*(?:$|[,.;!?]|in|when|while|between))|jams|jamming|jammed)(?![a-z])${__RX[7]}|${__RX[7]}${__T[5]}(?:gear\s*(?:lever|stick|shift(?:er)?)|gearstick)\s+(?:(?:is|feels|has\s+become|got|very|really|so|too|completely)\s+){0,2}(?:loose|wobbly|wobbles|wobbling)(?![a-z])${__RX[7]}|${__RX[7]}${__T[1]}(?:schalthebel|ganghebel|schaltknauf)${__T[0]}\s+(?:(?:ist|sehr|total|ganz|stark|etwas|zu)\s+){0,2}(?:locker|lose|wackelt|wackelig|abgebrochen)${__T[0]}${__RX[7]}|${__RX[7]}${__T[2]}(?:коробк\S*(?:\s+передач)?|кпп|важіл\S*\s+(?:кпп|перемикання\s+передач|коробки)|важел\S*\s+(?:кпп|перемикання)|рычаг\S*\s+(?:кпп|переключения\s+передач|коробки))\s+(?:(?:постійно|постоянно|іноді|иногда|часто|весь\s+час|все\s+время)\s+)?(?:заїда\S*|заеда\S*|теліпа\S*|болта\S*|хита\S*|шата\S*)${__RX[7]}|${__T[1]}(?<!${__T[16]}sattel|trailer)\S*\s+(?:\S+\s+){0,3})kupplung${__T[0]}\s+(?:(?:ist|sind|wohl|vermutlich|schon|jetzt|komplett|total|ganz|einfach|pl(?:ö|oe)tzlich)\s+){0,3}(?:kaputt|defekt|ausgefallen|geht\s+nicht|funktioniert\s+nicht)${__T[0]}(?![^.;!?]*${__T[16]}sattel|k(?:ö|oe)nigszapfen|trailer|ab(?:ge)?kuppel|an(?:ge)?kuppel|auf(?:ge)?sattel|ab(?:ge)?sattel|repariert|erneuert|getauscht|ersetzt|behoben|gewechselt))|(?:${__T[5]}${__T[18]}does\s+not|can['’]?t|cannot)\s+(?:go|get|put\s+it|shift|engage)${__T[7]}(?:into|in)${__T[7]}gear(?![a-z])|${__T[5]}gears?\s+${__T[18]}don['’]?t)\s+engage|${__T[2]}(?:помилк|ошибк)\S*${__T[7]}(?:коробк|кпп|трансміс|трансмис)\S*|${__T[2]}(?:коробк|кпп)\S*${__T[7]}(?:помилк|ошибк)\S*)${__RX[11]}|(?:${__T[2]}(?:педал\S*\s+)?(?:зчепленн\S*|сцеплени\S*)${__T[7]}(?:провалю\S*|провалива\S*|провали\S*|не\s+вимика\S*|не\s+выключа\S*|не\s+розчіпля\S*|не\s+розмика\S*|не\s+поверта\S*|не\s+возвраща\S*)|${__T[2]}(?:провалю\S*|провалива\S*|провали\S*)${__T[7]}педал\S*\s+(?:зчепленн\S*|сцеплени\S*)|${__T[1]}kupplung(?:spedal)?${__T[0]}\s+${__T[8]}(?:f(?:ä|ae|a)llt${__T[7]}durch|geht${__T[7]}durch\s+bis|bleibt${__T[7]}am\s+boden)${__T[0]}|${__T[5]}clutch\s+pedal${__T[7]}(?:goes|going|went|drops|dropping|dropped|sinks|sinking|sank|falls|falling|fell)\s+(?:straight\s+|right\s+)?(?:to|through)\s+(?:the\s+)?floor(?![a-z]))${__RX[11]}|(?:${__T[1]}getriebe${__T[0]}\s+${__T[8]}(?:im\s+)?not(?:lauf|programm)${__T[0]}|${__T[5]}(?:gearbox|transmission)\s+${__T[8]}(?:in\s+)?(?:limp|emergency)\s+mode(?![a-z])|${__T[2]}(?:коробк\S*|кпп)\s+${__T[8]}(?:в|у)\s+аварійн\S*|${__T[2]}(?:коробк\S*|кпп)\s+${__T[8]}(?:в|у)\s+аварийн\S*|${__T[1]}(?:automatik(?:getriebe)?|getriebe|tipmatic|powershift|opticruise|i-?shift|traxon|ecosplit|splitgruppe|split|rangegruppe)${__T[0]}\s+${__T[8]}(?:schaltet|schalten)${__T[7]}(?:ruckartig|ruckelig|hart|verz(?:ö|oe)gert|sp(?:ä|ae)t|falsch|nicht|komisch|unkontrolliert|selbst(?:st(?:ä|ae)ndig)?)${__T[0]}|${__T[5]}(?:gearbox|transmission|automatic)\s+${__T[8]}(?:shifts|shifting|changes\s+gear)${__T[7]}(?:hard|harshly|roughly|late|jerky|erratically)(?![a-z])|${__T[1]}(?:splitgruppe|split|rangegruppe|range|vorschaltgruppe)${__T[0]}${__T[7]}(?:schaltet|geht|funktioniert)\s+nicht${__T[0]}|${__T[1]}(?:g(?:ä|ae)nge?|getriebe)${__T[0]}\s+${__T[8]}(?:kratz(?:t|en)|krach(?:t|en)|knirsch(?:t|en))${__T[0]}|${__T[5]}(?:gears?|gearbox)\s+${__T[8]}(?:grind(?:s|ing)?|crunch(?:es|ing)?)(?![a-z])|${__T[2]}(?:передач\S*|коробк\S*)\s+${__T[8]}(?:хрустить|хрустят|хрустять|скрегоче|скрежет\S*)|${__T[1]}kupplung(?:s)?(?:verschlei(?:ß|ss))?${__T[0]}\s+${__T[8]}(?:(?:ü|ue)berlastet|(?:ü|ue)berhitzt|zu\s+hei(?:ß|ss)|warnung|verschlissen)${__T[0]}|${__T[1]}kupplungsverschlei(?:ß|ss)(?:warnung|anzeige)?${__T[0]}|${__T[5]}clutch\s+${__T[8]}(?:overload(?:ed)?|overheat(?:ed|ing)?|wear\s+warning|worn(?:\s+out)?)(?![a-z])|${__T[2]}(?:зчеплен|сцеплен)\S*\s+${__T[8]}(?:перегр\S*|перевантаж\S*|перегруж\S*|знос\S*|изнош\S*))${__T[10]}eingestellt${__T[26]}in\s+ordnung)|nicht\s+mehr${__T[23]}adjusted|no\s+longer${__T[12]}замінив\S*|полагодил\S*${__T[29]}починил\S*${__T[22]}`, 'i', 1);

const SEAT_HINT = lbRx(String.raw`${__T[1]}(?:sicherheits)?gurt${__T[0]}${__T[7]}(?:klemmt|hakt|rollt${__T[7]}nicht|rastet${__T[7]}nicht)(?![^.;!?]*(?:ratsche|ladung|palette))${__RX[0]}|${__T[3]}(?:sicherheitsgurt(?:e|es)?|gurtschloss|gurtstraffer|gurtaufroller|fahrergurt|beifahrergurt|anschnallgurt|fahrersitz(?:es)?|beifahrersitz(?:es)?|sitzverstellung|sitzfederung|luftsitz|sitzkonsole|sitz(?:es)?)${__T[0]}\s+${__T[9]}(?:defekt|kaputt|klemmt|blockiert|gerissen|eingerissen|ausgefranst|gebrochen|wackelt|locker|lose${__T[0]}|h(?:ä|ae|a)lt\s+nicht|rastet${__T[7]}${__T[13]}ein|rollt${__T[7]}${__T[13]}(?:auf|zur(?:ü|ue|u)ck)|l(?:ä|ae|a)sst\s+sich${__T[7]}${__T[13]}(?:anlegen|einstecken|herausziehen|rausziehen|verstellen|feststellen|arretieren|schlie(?:ß|ss)en|(?:ö|oe|o)ffnen)|senkt\s+sich|verliert${__T[7]}luft|sackt${__T[7]}(?:ab|durch)|durchgesessen|federt${__T[7]}nicht${__T[0]}|verstellt\s+sich|geht\s+nicht${__T[0]}|funktioniert\s+nicht|ausgefallen)${__T[10]}funktioniert\s+wieder|geht\s+wieder|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced))|${__T[3]}(?:gurt)${__T[0]}\s+${__T[8]}(?:rastet${__T[7]}${__T[13]}ein|rollt${__T[7]}${__T[13]}(?:auf|zur(?:ü|ue|u)ck)|l(?:ä|ae|a)sst\s+sich${__T[7]}${__T[13]}(?:anlegen|einstecken|herausziehen|rausziehen))${__T[39]}seat\s*belts?|safety\s+belts?|belt\s+buckle|(?:driver['’]?s?\s+|passenger\s+)?seat)\s+${__T[9]}(?:losing\s+air|broken|faulty|stuck|jammed|torn|frayed|loose|wobbl\S*|won['’]?t\s+(?:latch|lock|buckle|retract|adjust|click)|doesn['’]?t\s+(?:latch|lock|retract|adjust|work)|does\s+not\s+(?:latch|lock|buckle|retract|adjust|work)|not\s+(?:latching|locking|retracting|working)|keeps\s+(?:sinking|dropping|moving)|sinks|sags|sagging)${__T[24]}air\s+seat${__T[7]}(?:leak\S*|loses\s+air)(?![a-z])|${__T[5]}belt\s+${__T[38]}\s+not)\s+(?:click|latch|buckle)(?![a-z])|${__T[4]}(?:ремін\S*\s+безпеки|пас(?:ок|ка|ку|ком)\s+безпеки|ремен\S*\s+безопасности|(?<!(?:груз|вантаж|палет|паллет|поддон|піддон)[^.;!?]*)(?<!(?:стяжн|вантажн|кріпильн|такелажн|багажн)\S*\s+)ремінь${__RX[67]}(?![^.;!?]*(?:груз|вантаж|палет|паллет|поддон|піддон))|(?<!(?:груз|вантаж|палет|паллет|поддон|піддон)[^.;!?]*)(?<!(?:стяжн|грузов|крепежн|такелажн|багажн)\S*\s+)ремень${__RX[67]}(?![^.;!?]*(?:груз|вантаж|палет|паллет|поддон|піддон))|сидінн\S*|сидень\S*|сидень|сиденье|сиденья|крісл\S*|кресл\S*)\s+${__T[9]}(?:не${__T[7]}(?:застіба\S*|застеги\S*|пристіба\S*|пристеги\S*|фіксу\S*|фиксир\S*|регулю\S*|регулиру\S*|працю\S*|работа\S*|змотує\S*|сматыва\S*|трима\S*|держ\S*)(?![^.;!?]*(?:вантаж|груз|тент))|злама[внл]\S*|сломан\S*${__T[28]}порван\S*|порвал\S*|порвав\S*|обірва\S*|оборва\S*|розірв\S*|заклин\S*|заїда\S*|заеда\S*|хитає\S*|шатает\S*|провалю\S*|провалива\S*|опуска\S*|просед\S*|просіда\S*)|${__RX[7]}${__T[5]}(?:driver['’]?s?\s+)?seat${__T[7]}${__T[18]}does\s+not)\s+(?:go\s+)?(?:up|down|move|adjust|raise|lower)(?![a-z])${__RX[7]}|${__RX[7]}${__T[2]}(?:сидіння|сиденье|крісло|кресло)${__T[7]}не\s+(?:піднімає\S*|підіймає\S*|опускає\S*|регулю\S*|поднимает\S*|опускает\S*|регулиру\S*)${__RX[7]}|(?:${__T[2]}(?:порва|обірва|оборва|розірва|лопну|заклин|не\s+застіба|не\s+застеги|не\s+застегива|не\s+фіксу|не\s+фикси|не\s+витяг|не\s+вытяг)\S*\s+(?:ремін\S*\s+безпеки|пас(?:ок|ка|ку|ком)\s+безпеки|ремен\S*\s+безопасности))${__RX[11]}`, 'i', 1);



const SUSP2_HINT = lbRx(String.raw`(?:${__T[1]}(?:lkw${__T[25]}ae|a)nger|fahrzeug|zugmaschine|sattelzug|hinterachse|trailer)${__T[7]}h(?:ä|ae|e)ngt\s+(?:(?:hinten|vorne?|links|rechts|einseitig|auf\s+einer\s+seite|stark|total|komplett|etwas|richtig)\s+){0,3}?(?:hinten|vorne?|links|rechts|einseitig|auf\s+einer\s+seite|runter|tief(?:er)?|unten|schief)${__T[0]}(?!${__T[7]}(?:am|an|dran|ran|im|in|beim|fest)${__T[0]})|${__T[1]}(?:lkw${__T[25]}ae|a)nger|fahrzeug|zugmaschine|sattelzug|trailer)${__T[7]}(?:liegt|steht|sitzt)\s+(?:(?:sehr|viel|zu|deutlich|extrem|ganz)\s+)?(?:hinten|vorne?|links|rechts|einseitig|auf\s+einer\s+seite)\s+(?:(?:links|rechts|hinten|vorne?|sehr|viel|zu|deutlich|extrem|ganz)\s+){0,2}(?:tief(?:er)?|unten|runter|schief|niedrig(?:er)?)${__T[0]}(?!\s+(?:am|an|im|in|auf|beim|vor|neben)${__T[0]})|${__T[1]}(?:luft)?(?:feder)?(?:balg|b(?:ä|ae)lge|luftsack|luftsäcke)\s+${__T[8]}(?:zischt|pfeift|faucht|verliert|leckt|ist\s+platt|platt)${__T[0]}|${__T[1]}(?:luft)?federung\s+${__T[8]}(?:pfeift|faucht|schl(?:ä|ae)gt${__T[7]}durch|(?:ist\s+)?(?:(?:sehr|extrem|total|viel\s+zu|zu|knall|richtig)\s+)?(?:hart|bretthart|steinhart)|poltert|rumpelt|klappert|klopft)${__T[0]}|${__T[1]}heben\s*(?:\/|und|u\.?|-)?\s*senken${__T[7]}(?:geht|funktioniert|klappt)\s+nicht|${__T[1]}(?:lkw${__T[25]}ae|a)nger|fahrzeug|zugmaschine|trailer)\s+l(?:ä|ae|a)sst\s+sich\s+${__T[13]}(?:heben|senken|anheben|absenken|hochfahren|runterfahren|hochstellen|runterlassen)${__T[0]}|${__T[1]}(?<!(?:berg|steigung|rampe|auffahrt|h(?:ü|ue)gel|hang|stra(?:ß|ss)e)\S*\s+(?:\S+\s+){0,4})(?:lkw${__T[25]}ae|a)nger|fahrzeug|zugmaschine|trailer)\s+kommt\s+${__T[13]}hoch${__T[0]}(?![^.;!?]*(?:berg|steigung|rampe|auffahrt|h(?:ü|ue)gel|hang|schnee|eis|glatt))|${__T[1]}fahrh(?:ö|oe)he${__T[7]}(?:stimmt\s+nicht|falsch|geht\s+nicht|verstellt\s+sich|l(?:ä|ae)sst\s+sich\s+nicht)|${__T[1]}feder(?:lage|lagen|paket|pakete|blatt|bl(?:ä|ae)tter|b(?:ü|ue)gel|bride|briden|auge|bolzen)\s+${__T[8]}(?:gebrochen|gerissen|locker|lose|kaputt|defekt|abgerissen|ausgeschlagen|fehlt)${__T[0]}|${__T[1]}(?:sto(?:ß|ss))?d(?:ä|ae)mpfer\s+${__T[9]}(?:(?:ö|oe)lt|(?:verliert|schwitzt)${__T[7]}(?:ö|oe)l|nass|leckt|ausgeschlagen|abgerissen|lose|locker)${__T[0]}|${__T[1]}(?:fahrwerk|hinterachse|vorderachse|achse)\s+${__T[8]}(?:schl(?:ä|ae)gt${__T[7]}durch|poltert|rumpelt)${__T[0]}|${__T[1]}(?:lkw${__T[25]}ae|a)nger|fahrzeug|hinterachse|achse|trailer|es)\s+${__T[8]}schl(?:ä|ae)gt${__T[7]}durch${__T[7]}(?:bei|an|(?:ü|ue)ber|in|im)${__T[7]}(?:schlagl(?:ö|oe|o)ch|bodenwell|unebenheit|kante|schwelle|kopfsteinpflaster)|${__T[1]}schl(?:ä|ae)gt${__T[7]}durch\s+(?:bei|an|(?:ü|ue)ber|in|im)${__T[7]}(?:schlagl(?:ö|oe|o)ch|bodenwell|unebenheit|kante|schwelle|kopfsteinpflaster)|${__T[1]}(?:poltert|rumpelt|klappert|klopft)${__T[44]}(?:ü|ue)ber|bei|an|auf)${__T[7]}(?:unebenheit|schlagl(?:ö|oe|o)ch|bodenwell|schwelle|kopfsteinpflaster|kanten)|${__T[1]}(?:lkw${__T[25]}ae|a)nger|fahrzeug|hinterachse|trailer)\s+${__T[8]}(?:h(?:ü|ue)pft|springt)(?!${__T[7]}an${__T[0]})\s+${__T[8]}(?:auf\s+der\s+(?:stra(?:ß|ss)e|autobahn|fahrbahn)|bei\s+jeder|(?:ü|ue)ber|beim\s+fahren|wie\s+(?:ein|verr))|${__T[1]}(?:(?:lift|hub)?achse)\s+(?:hebt|senkt)\s+sich\s+nicht|${__T[1]}(?:liftachse|hubachse)${__T[7]}(?:l(?:ä|ae|a)sst\s+sich\s+nicht|geht\s+nicht|kommt\s+nicht)\s+(?:mehr\s+)?(?:runter|herunter|ab|hoch|rauf|senken|heben|absenken|anheben)${__T[0]}|${__T[1]}stabi(?:lisator\S*|s)?${__T[0]}\s+${__T[8]}(?:gebrochen|gerissen|lose|locker|kaputt|defekt|ab|abgerissen|ausgeschlagen|klappert|fehlt)${__T[0]}|${__T[1]}(?:h(?:ö|oe)hen|niveau|nivellier|luftfeder)ventil\S*${__T[7]}(?:kaputt|defekt|undicht|zischt|klemmt|h(?:ä|ae)ngt|geht\s+nicht|spinnt)${__T[0]}|${__T[5]}suspension${__T[7]}(?:bottom(?:s|ing|ed)?\s+out|(?:is\s+)?(?:too\s+|very\s+|really\s+)?(?:hard|stiff|bouncy)|hiss\S*|whistl\S*|knock\S*|clunk\S*|bang\S*)(?![a-z])|${__T[5]}ride\s+height${__T[7]}(?:wrong|off|not\s+working|stuck|won['’]?t\s+\S+|doesn['’]?t\s+\S+)(?![a-z])|${__T[5]}(?:level(?:l?ing)?|height)\s+(?:control|valve|sensor)${__T[7]}(?:not\s+working|broken|faulty|stuck|leak\S*|defective|failed|dead)(?![a-z])|${__T[5]}(?:anti[-\s]?roll\s+bar|sway\s+bar|stabili[sz]er(?:\s+bar)?|u-?bolts?|spring\s+hangers?|spring\s+eyes?)${__T[7]}(?:broken|snapped|cracked|loose|worn|missing)(?![a-z])|${__T[5]}(?:shocks?|dampers?)${__T[7]}(?:leak\S*|blown|broken|worn|gone)(?![a-z])|${__T[5]}(?:truck|trailer|lorry|vehicle)\s+(?:won['’]?t|wont|doesn['’]?t|doesnt|does\s+not|will\s+not)\s+(?:rise|raise|go\s+up|lift|come\s+up)(?![a-z])(?!\s+(?:the|a|an|it|that|this|load|cargo|pallets?)(?![a-z]))(?![^.;!?]*(?:hill|ramp|slope|incline|snow|ice))|${__T[5]}(?:truck|trailer|lorry)\s+(?:is\s+)?(?:bouncing|bouncy|hopping)(?![a-z])|${__T[5]}(?:clunk\S*|bang\S*|knock\S*)\s+${__T[8]}(?:over|on|going\s+over)\s+(?:the\s+)?(?:bumps|potholes|speed\s+bumps)(?![a-z])|${__T[2]}(?:пневмо)?подушк\S*${__T[7]}(?:травит|спускает|шипит|шипить|свистит|свистить)${__T[6]}|${__T[2]}амортизатор\S*${__T[7]}(?:потік|потек|мокр\S*|розбит\S*|разбит\S*|стука\S*|стуч\S*)${__T[6]}|${__T[2]}(?:підвіск|подвеск)\S*${__T[7]}(?:пробива\S*|стука\S*|стуч\S*|жорстк\S*|жестк\S*)${__T[6]}|${__T[2]}стабілізатор\S*${__T[7]}(?:зламан\S*|лопнув|відірв\S*|стука\S*)${__T[6]}|${__T[2]}стабилизатор\S*${__T[7]}(?:сломан\S*|лопнул|оторв\S*|стуч\S*)${__T[6]}|${__T[2]}(?:причіп|напівпричіп|прицеп|полуприцеп)\S*\s+не\s+(?:піднімається|поднимается|опускається|опускается)${__T[6]}|${__T[2]}(?:подъ[её]мн|подъемн)\S*\s+(?:ось|мост)${__T[7]}не${__T[7]}(?:поднима|опуска)\S*|${__T[2]}(?<!(?:в|у|во)\s)(?:кабин|кабін)\S*\s+(?:(?!не\s|ні\s)\S+\s+){0,2}?(?:кача\S*|хита\S*|гойда\S*|раскачива\S*|розгойду\S*|стучит|стука\S*|бь[её]т\S*|б['’]?єт\S*|гуля\S*|болта\S*|бовта\S*|теліпа\S*|ход\S*\s+ходу?н?о[мр]|просел\S*|просі\S*|перекош\S*|перекос\S*)|${__T[2]}(?:опор|креплен|кріплен|сайлентблок|подушк|амортизатор|подвеск|підвіск)\S*${__T[7]}(?:кабин|кабін)\S*\s+${__T[8]}(?:сломан\S*|сломал\S*|злама\S*|порва\S*|оторва\S*|відірва\S*|лопну\S*|треснул\S*|тріснув\S*|изношен\S*|зношен\S*|болта\S*|стуч\S*|стука\S*|теч\S*|тече)${__T[39]}cab|cabin)\s+(?:is\s+)?(?:\S+\s+)?(?:rocking|rocks|swaying|sways|bouncing|bounces|wobbl\S*|knocking|knocks|banging)${__T[24]}cab\s+(?:mount\S*|suspension|shock\S*|dampers?|bush\S*|air\s*bags?)${__T[7]}(?:broken|broke|worn|cracked|leak\S*|faulty|burst|loose|knocking|gone)(?![a-z])|${__T[3]}(?:fahrerhaus|kabinen?)(?:lagerung|lager|d(?:ä|ae)mpfer|federung|sto(?:ß|ss)d(?:ä|ae)mpfer|luftbalg|halter|aufh(?:ä|ae)ngung)\S*${__T[7]}(?:defekt|kaputt|ausgeschlagen|gebrochen|gerissen|undicht|locker|lose|klappert)${__T[0]}|${__T[3]}fahrerhaus${__T[7]}(?:schaukelt|wackelt|schwankt|wippt)${__T[0]})${__T[10]}eingestellt${__T[26]}in\s+ordnung|normal)${__T[23]}adjusted|sorted|nicht\s+mehr|(?:zischt|pfeift|poltert|rumpelt|klappert|h(?:ä|ae)ngt|schl(?:ä|ae)gt|springt|h(?:ü|ue)pft|(?:ö|oe)lt)${__T[7]}nicht\s+mehr|no\s+longer${__T[11]}заменил\S*|усунул\S*|устранил\S*|полагодил\S*|починил\S*${__T[22]}`, 'i', 1);
const SEATSUSP_SPANS = lbRx(String.raw`${__T[3]}(?:(?:bei)?fahrer)?sitz(?:es|s)?\s+${__T[8]}(?:luft)?federung\S*|${__T[3]}(?:luft)?federung\S*${__T[7]}(?:vom|am|des|im)\s+(?:(?:bei)?fahrer)?sitz\S*|(?<![a-z])seat\s+(?:air\s+)?suspension${__T[39]}air\s+)?suspension\s+(?:of|on|in)\s+the\s+(?:driver['’]?s?\s+|passenger['’]?s?\s+)?seat|${__T[2]}(?:пневмо)?(?:підвіск|подвеск)\S*${__T[7]}(?:сидін|сиден)\S*|${__T[2]}(?:сидін|сиден)\S*\s+${__T[8]}(?:пневмо)?(?:підвіск|подвеск)\S*`, 'gi');
const SEATSUSP_HINT = new RegExp(SEATSUSP_SPANS.source, 'i');

const SEAT2_HINT = lbRx(String.raw`(?:${__T[1]}(?:(?:bei)?fahrer)?sitz(?:es|s)?${__T[0]}\s+(?:[^\s.,;!?]+\s+){0,4}?(?:(?:geht|f(?:ä|ae)hrt|kommt)${__T[7]}${__T[13]}(?:hoch|rauf|nach\s+oben|runter|nach\s+unten|vor|zur(?:ü|ue)ck|nach\s+(?:vorne?|hinten))${__T[0]}|bleibt${__T[7]}(?:unten|${__T[13]}oben)${__T[0]}|l(?:ä|ae)sst\s+sich${__T[7]}${__T[13]}(?:hoch\S*|runter\S*|verschieben|schieben|vorschieben|zur(?:ü|ue)ckschieben|einstellen|(?:auf)?pumpen|nach\s+(?:vorne?|hinten|oben|unten)(?:\s+\S+)?)|kann\s+(?:(?:man|ich|er|ihn|den|es)\s+){0,2}${__T[13]}${__T[8]}(?:schieben|verschieben|verstellen|hochstellen|hochpumpen|hochfahren|einstellen|feststellen)${__T[0]}|pumpt${__T[7]}nicht|zischt|pfeift|(?:rutscht|wandert|f(?:ä|ae)hrt|rollt)${__T[7]}(?:immer\s+)?(?:nach\s+(?:hinten|vorne?)|zur(?:ü|ue)ck|weg)${__T[0]}|(?:geht|f(?:ä|ae)llt|sinkt)\s+(?:(?:immer|st(?:ä|ae)ndig|dauernd|von\s+selbst|von\s+allein|allein|selbst|wieder|ganz|einfach)\s+){1,3}(?:runter|nach\s+unten|ab)${__T[0]}|(?:auf|ein)gerissen|ist\s+(?:total\s+|v(?:ö|oe)llig\s+|komplett\s+)?durch(?:gesessen)?${__T[0]}(?!\s+(?:den|die|das|dem|einen|eine|ein|regen|wasser)${__T[0]}))|${__T[1]}(?:r(?:ü|ue)cken|sitz)?lehne(?:n)?${__T[0]}(?!\s+${__T[8]}(?:bett|liege|koje|tisch)\S*)\s+(?:[^\s.,;!?]+\s+){0,3}?(?:defekt|kaputt|gebrochen|abgebrochen|klemmt|wackelt|locker|lose|h(?:ä|ae)lt\s+nicht|rastet${__T[7]}nicht|(?:klappt|f(?:ä|ae)llt)${__T[7]}(?:nach\s+hinten|weg|um|zur(?:ü|ue)ck)|l(?:ä|ae)sst\s+sich${__T[7]}${__T[13]}(?:verstellen|einstellen|feststellen|arretieren|hochstellen|zur(?:ü|ue)ck\S*)|geht\s+nicht|funktioniert\s+nicht)${__T[0]}(?![^.;!?]*(?:bett|liege|koje|tisch))|${__T[1]}(?:sitz|fahrersitz)(?:bezug|polster|bez(?:ü|ue)ge)${__T[0]}\s+(?:[^\s.,;!?]+\s+){0,2}?(?:gerissen|aufgerissen|eingerissen|zerrissen|kaputt|durch(?:gesessen)?)${__T[0]}|${__T[1]}kopfst(?:ü|ue)tze(?:n)?${__T[0]}\s+(?:[^\s.,;!?]+\s+){0,3}?(?:defekt|kaputt|gebrochen|abgebrochen|lose|locker|fehlt|wackelt|h(?:ä|ae)lt\s+nicht|l(?:ä|ae)sst\s+sich${__T[7]}${__T[13]}(?:verstellen|einstellen|feststellen))${__T[0]}|${__T[1]}(?<!(?:ladung|palette|ratsche|ware|kiste|plane)\S*\s+(?:\S+\s+){0,3})(?:sicherheits|fahrer|beifahrer|anschnall)?gurt(?:e|es)?${__T[0]}\s+(?:[^\s.,;!?]+\s+){0,2}?(?:geht${__T[7]}${__T[13]}(?:rein|zu|raus|zur(?:ü|ue)ck)|zieht\s+(?:sich\s+)?(?:\S+\s+)?${__T[13]}(?:ein|zur(?:ü|ue)ck|rein)|bleibt${__T[7]}h(?:ä|ae)ngen|kommt${__T[7]}${__T[13]}raus|blockiert${__T[7]}(?:immer|st(?:ä|ae)ndig|dauernd|sofort))${__T[0]}(?![^.;!?]*(?:ratsche|ladung|palette|spann|zurr|plane|ware|laderaum|kiste))|${__T[5]}(?:(?:driver['’]?s?\s+|passenger['’]?s?\s+)?seat)(?!\s*belt)\s+${__T[8]}(?:${__T[38]}\s+not|will\s+not|can['’]?t|cannot)\s+(?:be\s+)?(?:go|come|stay|move|slide|raise|lift|pump)\S*(?:\s+(?:up|down|forward|back))?|keeps?\s+(?:going|sliding|sinking|dropping|moving)(?:\s+(?:down|back))?|(?:goes|slides|sinks|drops)\s+(?:down|back(?:wards)?)\s+(?:by\s+itself|on\s+its\s+own)|(?:is\s+)?stuck\s+(?:in\s+the\s+|at\s+the\s+)?(?:low(?:est)?|down|bottom)|hiss\S*)(?![a-z])|${__T[5]}(?:backrest|seat\s+back|headrest|head\s+rest)\s+${__T[8]}(?:broken|loose|missing|stuck|wobbl\S*|came\s+off|fell\s+off|falls?\s+back|${__T[38]}\s+not)\s+(?:adjust|lock|stay\s+up))(?![a-z])|${__T[5]}(?:seat\s*belt|safety\s+belt)\s+${__T[8]}(?:${__T[38]}\s+not)\s+(?:come\s+out|pull\s+out|go\s+back|go\s+in|unroll|extend)|keeps\s+locking|locks\s+up)(?![a-z])|${__T[2]}(?:ремін\S*|ремен\S*|ремн\S*|пас\S*)\s+(?:безпеки|безопасности)${__T[7]}не\s+(?:витяг\S*|змоту\S*|намоту\S*|втягу\S*|фіксу\S*|вытяг\S*|сматыв\S*|втягив\S*|фиксир\S*|застіб\S*|застег\S*)|${__T[2]}(?:сидінн\S*|сидень\S*|сиденье|сиденья|крісл\S*|кресл\S*)${__T[7]}(?:не\s+(?:фіксу\S*|фиксир\S*|регулю\S*|регулир\S*|піднім\S*|поднима\S*|пересува\S*|передвига\S*|рухається|двигается)|(?:сповза|з['’]?їжджа|сполза|съезжа|спуска)\S*)|${__T[2]}(?:спинк\S*|підголівник\S*|подголовник\S*)${__T[7]}(?:зламан\S*|сломан\S*|відлама\S*|отлома\S*|відірва\S*|оторва\S*|хитає\S*|шатает\S*|відкида\S*|откидыва\S*|пада\S*|не\s+(?:фіксу|фиксир|регулю|регулир|тримає|держит)\S*))${__T[10]}funktioniert\s+wieder|geht\s+wieder|wieder\s+(?:ok|in\s+ordnung)${__T[23]}works\s+again${__T[11]}заменил\S*))`, 'i', 1);
const noSeatSusp = (s) => String(s || '').replace(SEATSUSP_SPANS, ' ');

const SEATHEAT = lbRx(String.raw`${__T[1]}(?:heizung|bel(?:ü|ue)ftung|l(?:ü|ue)ftung)\s+(?:im|vom|von\s+dem|des|am)\s+(?:fahrer|beifahrer)?sitz(?:es|s)?${__T[0]}|${__T[1]}(?:fahrer|beifahrer)?sitz(?:es|s)?(?:\s+|-)(?:heizung|bel(?:ü|ue)ftung)${__T[0]}|${__T[1]}sitzbel(?:ü|ue)ftung${__T[0]}|${__T[5]}(?:(?:driver['’]?s?\s+|passenger\s+)?seat\s+(?:heat(?:ing|ers?)?|ventilation|cooling)|heated\s+seats?|(?:heating|ventilation)\s+(?:in|of)\s+the\s+(?:driver['’]?s?\s+)?seat)(?![a-z])|${__T[2]}(?:підігрів\S*|обігрів\S*|вентиляці\S*|подогрев\S*|обогрев\S*|вентиляци\S*)${__T[7]}(?:сидін\S*|сиден\S*|сидень\S*|крісл\S*|кресл\S*)`, 'gi');
const noSeatHeat = (s, cab) => String(s || '').replace(SEATHEAT, (m) => (!cab ? ' Sitzheizung ' : /[а-яіїєґё]/i.test(m) ? ' підігрів сидіння ' : /seat/i.test(m) ? ' seat heater ' : ' Sitzheizung '));



const DASH_HINT = lbRx(String.raw`${__T[2]}не\s+(?:сигналить|сигналит)${__T[6]}${__T[10]}fixed|repaired|replaced${__T[12]}замінив\S*|полагодил\S*${__T[29]}починил\S*))|${__T[5]}(?:odometer|mileage|milometer)\s+(?:(?:has|is|was)\s+)?(?:stopped|frozen|stuck|not\s+(?:counting|going\s+up|moving|changing))${__T[41]}|working\s+again))|(?:${__T[1]}kilometerz(?:ä|ae)hler${__T[7]}(?:steht(?!\s+(?:bei|auf)\s)|bleibt\s+stehen|z(?:ä|ae)hlt\s+nicht|geht\s+nicht|defekt|kaputt|spinnt)${__T[0]}|${__T[2]}(?:датчик|покажчик|указатель)\S*\s+(?:рівня\s+|уровня\s+)?(?:палива|пального|топлива)${__T[7]}(?:${__T[43]}|бреше|врет${__T[30]}показу\S*\s+неправильн\S*|показыва\S*\s+неправильн\S*))${__RX[0]}|${__T[1]}(?<!(?:handy|tablet|navi|navigations|telefon|smartphone|radio|kamera)[\s-]?)(?:tankanzeige|tankuhr|kraftstoffanzeige|f(?:ü|ue)llstandsanzeige|kombiinstrument(?:e)?|instrumententafel|instrumentenbrett|armaturenbrett|armaturen|cockpit|display(?:s)?|bildschirm|tachoanzeige|kilometerz(?:ä|ae|a)hler|kilometeranzeige|km-z(?:ä|ae|a)hler|km-anzeige|kilometerstandsanzeige|geschwindigkeitsanzeige|tachonadel|tachometer(?:nadel|anzeige)?|drehzahlmesser|druckanzeige|druckanzeigen|manometer|hupe|signalhorn|horn)${__T[0]}\s+${__T[9]}(?:ausgefallen|f(?:ä|ae|a)llt${__T[7]}aus|schwarz|dunkel|zeigt${__T[7]}(?:nichts|nix|kein\S*)|geht\s+nicht${__T[0]}|geht\s+nicht\s+mehr|geht${__T[7]}aus|funktioniert${__T[7]}nicht|defekt|kaputt|flackert|tot${__T[0]}|ohne\s+funktion|spinnt|bleibt${__T[7]}(?:stehen|h(?:ä|ae|a)ngen|bei\s+null)|z(?:ä|ae|a)hlt\s+nicht(?:\s+mehr)?${__T[0]}|wird\s+${__T[13]}angezeigt)|${__T[5]}(?<!(?:phone|tablet|sat-?nav|radio)[\s-]?)(?:fuel\s+gauge|dashboard|dash|odometer|odo|mileage\s+counter|instrument\s+(?:cluster|panel)|(?<!(?:light|lamp|tail|rear|indicator|headlight)\s)cluster|display|screen|speedometer|speedo|pressure\s+gauges?|gauges?|horn)\s+${__T[9]}(?:dead|blank|black|went\s+out|is\s+out|not\s+working|isn['’]?t\s+working|doesn['’]?t\s+work|stopped\s+working|failed|faulty|broken|flicker\S*|shows\s+nothing|stuck\s+(?:at\s+)?(?:zero|0)|not\s+counting|stopped\s+counting)(?![a-z])|${__T[4]}(?:панел\S*\s+прилад\S*|приладов\S*\s+панел\S*|приборн\S*\s+панел\S*|дисплей\S*|екран\S*|экран\S*|спідометр\S*|спидометр\S*|одометр\S*|лічильник\S*\s+кілометр\S*|счетчик\S*\s+километр\S*|клаксон\S*|гудок|гудк[а-яіїєґ]*|(?<!стоп[- ]?)сигнал(?![а-яіїєґ])(?!\s+(?:поворот\S*|аварі\S*|авари\S*|габарит\S*)))\s+${__T[9]}(?:${__T[43]}|не\s+показу\S*|не\s+показыва\S*|згас\S*|погас\S*|чорн\S*|черн\S*|злама\S*|слома\S*|не\s+раху\S*|не\s+счита\S*)|${__T[4]}не\s+(?:працю\S*|работа\S*)\s+(?:звуков\S*\s+)?(?:клаксон\S*|гудок|гудк[а-яіїєґ]*|сигнал(?![а-яіїєґ])(?!${__T[7]}(?:поворот\S*|стоп\S*|аварі\S*|авари\S*|задн\S*|заднь\S*|габарит\S*)))|${__T[1]}(?:hupe|signalhorn)\s+${__T[9]}(?:(?:h(?:ä|ae|a)ngt|klemmt)(?!\s+nicht)|h(?:ö|oe|o)rt${__T[7]}${__T[13]}auf|geht${__T[7]}${__T[13]}aus|l(?:ä|ae|a)sst\s+sich\s+${__T[13]}abstellen)${__T[0]}|${__T[3]}hupt\s+${__T[8]}(?:von\s+selbst|allein|alleine|dauernd|st(?:ä|ae|a)ndig|ununterbrochen|ohne\s+grund)${__T[0]}|${__T[5]}horn\s+${__T[9]}(?:stuck|jammed|keeps\s+(?:sounding|honking|going\s+off|blaring)|sounds\s+(?:by\s+itself|on\s+its\s+own|constantly)|goes\s+off\s+(?:by\s+itself|on\s+its\s+own)|won['’]?t\s+stop|will\s+not\s+stop|does\s?n['’]?t\s+stop)(?![a-z])|${__T[4]}(?:клаксон\S*|гудок|гудк[а-яіїєґ]*|(?<!стоп[- ]?)сигнал(?![а-яіїєґ]))\s+${__T[9]}(?:заїло|заїв|заело|заклинило|залип\S*|сам\S*${__T[7]}(?:гуд|сигнал|спрацьов|срабатыва|бібика|бибика)\S*|не\s+вимика\S*|не\s+выключа\S*|не\s+замовка\S*|не\s+замолка\S*|постійно\s+гуд\S*|постоянно\s+гуд\S*|гудить\s+постійно)|${__T[1]}(?:tankanzeige|tankuhr|kraftstoffanzeige|f(?:ü|ue)llstandsanzeige)${__T[0]}\s+${__T[8]}(?:zeigt\s+${__T[8]}falsch\S*|falsch${__T[0]}|springt|h(?:ä|ae)ngt${__T[0]}|bewegt\s+sich\s+nicht)|${__T[5]}fuel\s+gauge\s+${__T[8]}(?:wrong|incorrect|inaccurate|jump\S*|stuck|frozen|froze|not\s+moving)|${__RX[7]}${__T[1]}(?:display|bildschirm|monitor)\s+${__T[8]}(?:h(?:ä|ae)ngt(?:\s+sich\s+auf)?|eingefroren|friert${__T[7]}ein|bleibt\s+schwarz)${__T[0]}${__RX[7]}|${__RX[7]}${__T[5]}(?<!(?:phone|tablet|sat-?nav|nav|radio|camera)[\s-]?)(?:dashboard\s+|dash\s+)?(?:screen|display)\s+${__T[8]}(?:frozen|freezes|freezing|keeps\s+freezing|stuck|hangs)(?![a-z])${__RX[7]}|${__RX[7]}${__T[2]}(?:екран\S*|экран\S*|дисплей\S*|монітор\S*|монитор\S*)${__T[7]}(?:завис\S*|зависа\S*|завіс\S*)${__RX[7]}|${__T[5]}horn\s+(?:(?:sounds?|is|seems)\s+)?(?:(?:very|really|too|quite|a\s+bit|pretty)\s+)?(?:weak|quiet|faint|feeble|croaky)(?![a-z])${__RX[68]}|${__T[5]}(?:no\s+|lost\s+(?:the\s+)?)horn(?![a-z])(?!${__T[7]}(?:used|needed|honk\S*|sounded|blown))${__RX[68]}|${__T[1]}hupe\s+(?:(?:ist|klingt|wird|nur\s+noch|sehr|ganz|zu)\s+){0,2}(?:leise|schwach|kr(?:ä|ae)chzt|schnarrt|r(?:ö|oe)chelt)${__T[0]}${__RX[68]}|${__T[1]}keine\s+hupe${__T[0]}(?!${__T[7]}(?:benutzt|ben(?:ö|oe)tigt|gedr(?:ü|ue)ckt|n(?:ö|oe)tig))${__RX[68]}|${__T[2]}(?:(?:звуков\S*\s+сигнал\S*|клаксон\S*|гудок|гудк[а-яіїєґ]*|бибикалк\S*|бібікалк\S*|пищалк\S*)|сигнал${__T[6]}${__RX[69]})${__T[7]}(?:не\s+(?:гуд\S*|бибика\S*|бібіка\S*|пищит|пищить)|хрип\S*|еле\s+слыш\S*|ледве\s+чут\S*|ледь\s+чут\S*|тихо\s+(?:гуд\S*|сигнал\S*))${__T[6]}${__RX[70]}|${__T[2]}(?:звуков\S*\s+сигнал\S*|клаксон\S*|гудок|гудк[а-яіїєґ]*|бибикалк\S*|бібікалк\S*|пищалк\S*)${__T[7]}(?:не\s+(?:работа\S*|працю\S*)|пропа[лв]\S*|зник\S*|сдох\S*|здох\S*)${__T[6]}${__RX[70]}|${__T[2]}(?:не\s+гуд\S*|пропа[лв]\S*|зник\S*)\s+(?:(?:звуков\S*\s+)?сигнал${__T[6]}${__RX[69]}|клаксон\S*|гудок)${__RX[70]}|${__T[2]}(?:нет|немає|нема)\s+(?:звуков\S*\s+сигнал\S*|сигнал\S*\s+звуков\S*|гудка|клаксона)${__T[6]}${__RX[70]}`, 'i', 1);








const LOOSE_HINT = lbRx(String.raw`(?:(?<![a-z])side\s+skirts?${__T[7]}(?:loose|hanging|dragging|ripped\s+off|torn\s+off|came\s+off|fell\s+off)${__T[39]}roof\s+|cab\s+)?spoiler${__T[7]}(?:ripped\s+off|torn\s+off|came\s+off|fell\s+off|loose|hanging)|${__T[2]}(?:спойлер|обтікач|обтекател)\S*${__T[7]}(?:відірва\S*|оторва\S*|відвали\S*|отвали\S*|теля\S*|бовта\S*|звиса\S*))${__RX[0]}|${__T[2]}(?:бічн\S*|боков\S*)\s+(?:захист\S*|защит\S*)${__T[7]}(?:відірва\S*|оторва\S*|відвали\S*|отвали\S*|звиса\S*|свиса\S*|теля\S*|бовта\S*)${__RX[0]}|${__T[3]}(?:kühlergrill|kuehlergrill|frontgrill|grill|frontschürze|frontschuerze|frontklappe|frontmaske|kotfl(?:ü|ue|u)gel|schmutzf(?:ä|ae|a)nger|spritzschutz|spritzlappen|unterfahrschutz|seitenschutz|seitenverkleidung|verkleidung|sto(?:ß|ss)stange|sto(?:ß|ss)f(?:ä|ae|a)nger|auspuff|auspuffrohr|endtopf|trittstufe|trittbrett|staukasten|werkzeugkasten|palettenkasten|reserveradhalter|ersatzradhalter|ersatzrad|reserverad|radkappe|radzierblende|dachspoiler|seitenspoiler|frontspoiler|spoiler|windleitblech|windabweiser|radlauf|radlaufverkleidung|radlaufabdeckung|radhausschale|radhausverkleidung|kennzeichenhalter|kennzeichen|teil|teile|abdeckung|blech)(?:e|en|n|s|es)?\s+${__T[9]}(?:(?:h(?:ä|ae|a)ngt|h(?:ä|ae|a)ngen)${__T[7]}(?:herunter|runter|herab|lose|schief)${__T[0]}|(?:h(?:ä|ae|a)ngt|h(?:ä|ae|a)ngen)(?=\s*(?:$|[.,;!?\n]))|(?:ist|sind)${__T[7]}lose${__T[0]}|abgerissen|abgefallen|verloren|weggeflogen|abgebrochen|schleift|schleifen|klappert|klappern|wackelt|wackeln|losgerissen|lose${__T[0]}|locker${__T[0]})|${__T[1]}(?:schmutzf(?:ä|ae|a)nger|spritzschutz|spritzlappen|kotfl(?:ü|ue|u)gel|radkappe|radlauf|radlaufabdeckung|radhausschale)(?:e|en|n|s|es)?\s+${__T[8]}(?:fehlt|fehlen)${__T[0]}|${__T[5]}(?:mud\s*flaps?|mudguards?|splash\s+guards?|hub\s*caps?)\s+${__T[8]}missing(?![a-z])|${__T[4]}(?:бризковик|бризговик|брызговик)\S*${__T[7]}(?:відсутн|отсутств|нема)\S*|${__T[3]}(?:verliert|verlor|verloren|lose[rsn]?|herunterh(?:ä|ae|a)ngende[rsnm]?|abgerissene[rsnm]?|abgefallene[rsnm]?)\s+${__T[8]}(?:kotfl(?:ü|ue|u)gel|schmutzf(?:ä|ae|a)nger|unterfahrschutz|seitenschutz|seitenverkleidung|verkleidung|sto(?:ß|ss)stange|sto(?:ß|ss)f(?:ä|ae|a)nger|auspuff|auspuffrohr|endtopf|trittstufe|trittbrett|staukasten|werkzeugkasten|palettenkasten|reserveradhalter|ersatzrad|reserverad|radkappe|radzierblende|dachspoiler|seitenspoiler|frontspoiler|spoiler|windleitblech|windabweiser|radlauf|radlaufverkleidung|radlaufabdeckung|radhausschale|radhausverkleidung|kennzeichenhalter|kennzeichen|teil|teile|abdeckung|blech)(?:e|en|n|s|es)?${__T[0]}${__T[39]}grilles?|mudguards?|mud\s*flaps?|fenders?|bumpers?|side\s+guards?|underr(?:un|ide)\s+(?:guard|bar)s?|exhaust(?:\s+pipe)?|panels?|trim|steps?|tool\s*box(?:es)?|(?:side\s+|under\s*body\s+)?storage\s+box(?:es)?|pallet\s+box(?:es)?|spare\s+wheel(?:\s+carrier)?|wheel\s+arch(?:es)?(?:\s+(?:liners?|trims?|covers?))?|parts?|covers?|number\s+plates?|licen[cs]e\s+plates?)\s+${__T[9]}(?:hanging|hangs|loose|came\s+off|come\s+off|fell\s+off|falling\s+off|dragging|ripped\s+off|torn\s+off|broke\s+off|broken\s+off|snapped\s+off|rattling|flapping)${__T[24]}(?:lost|dropped)\s+(?:a\s+|the\s+|some\s+|my\s+)?(?:part|parts|mudguard|mud\s*flap|bumper|panel|exhaust|spare\s+wheel|number\s+plate)(?![a-z])|${__T[4]}(?:решітк|решетк|крил|крыл|підкрил|подкрыл|бризковик|бризговик|брызговик|бампер|відбійник|отбойник|глушник|глушител|(?:вихлопн|выхлопн)\S*\s+труб|кожух|ящик\S*\s+(?:для\s+|під\s+|под\s+)?(?:інструмент|инструмент|палет)|(?:інструментальн|инструментальн|палетн|паллетн)\S*\s+ящик|обшивк|детал|запаск|номерн|обтічник|обтекател|спойлер|дефлектор)\S*\s+${__T[9]}(?:відірва|оторва|відлама|отлома|відпа|отпа|відвали|отвали|звиса|висить|висит|бовтає|болтает|загуби|потерял|втрати|тягнеться|волочит|теліпа)\S*|${__T[4]}(?:відірва|оторва|відпа|отпа|відвали|отвали|звиса|висить|висит|бовтає|болтает|теліпа)\S*${__T[7]}(?:ящик\S*\s+(?:для\s+|під\s+|под\s+)?(?:інструмент|инструмент|палет)|(?:інструментальн|инструментальн|палетн|паллетн)\S*\s+ящик|решітк|решетк|крил|крыл|обтічник|обтекател|спойлер|дефлектор|бризковик|бризговик|брызговик|бампер|відбійник|отбойник|глушник|глушител|(?:вихлопн|выхлопн)\S*\s+труб|кожух|обшивк|запаск|номерн)\S*|${__T[4]}(?:загубив|загубила|втратив|втратила|потерял|потеряла)\s+${__T[8]}(?:крил|крыл|бризковик|бризговик|брызговик|бампер|глушник|глушител|детал|запаск|номер)\S*|${__T[1]}(?:trittstufe|trittbrett|aufstiegstritt|einstiegstritt|aufstiegsstufe|einstiegsstufe|aufstiegshilfe|haltegriff|einstiegsgriff|griffstange)(?:n|e|en|s|es)?\s+${__T[9]}(?:lose|locker|wackelt|abgebrochen|abgerissen|gebrochen|kaputt|defekt|fehlt)${__T[0]}(?!${__T[7]}(?:wieder|repariert|behoben))|${__T[5]}(?:(?:cab|entry|access|boarding|ladder)\s+steps?|grab\s+(?:handles?|rails?)|handrails?|hand\s+rails?)\s+${__T[8]}(?:loose|broken|snapped|missing|cracked|wobbly|came\s+off)(?![a-z])|${__T[4]}(?:сходинк|підніжк|подножк|поручн|поручен|поручень)\S*${__T[7]}(?:відлама|отлома|злама|слома|розхита|шата|відпа|отпа|відірва|оторва)\S*|${__T[1]}schneeketten?\s+${__T[9]}(?:gerissen|abgesprungen|abgerutscht|abgefallen|verloren|schl(?:ä|ae|a)gt|schleift|kaputt)${__T[0]}|${__T[5]}snow\s+chains?\s+${__T[8]}(?:broke|broken|snapped|came\s+off|fell\s+off|lost|slipped\s+off)(?![a-z])|${__T[4]}(?:ланцюг|цеп)\S*\s+(?:протиковзанн|противоскольжен|на\s+колес)\S*${__T[7]}(?:порва|розірва|злете|зіскоч|соскоч|загуби|потеря|злама|слома)\S*|${__T[1]}(?:front|heck|radkasten|radlauf|einstiegs|eck|seiten|unterboden|stirnwand)?verkleidung(?:en|s)?${__T[0]}\s+(?:(?:ist|sind|vorne|hinten|links|rechts|schon|ganz|etwas|total)\s+){0,2}(?:lose|locker|wackelt|wackeln|klappert|klappern|flattert|flattern)${__T[0]}${__T[10]}befestigt|festgeschraubt${__T[26]}in\s+ordnung|fest)${__T[23]}secured))`, 'i', 1);








const VISIB_HINT = lbRx(String.raw`(?:${__T[1]}kein(?:e|en)?\s+(?:wischwasser|waschwasser|scheibenwaschwasser|scheibenreiniger|frostschutz\s+im\s+wischwasser)${__T[0]}(?!${__T[7]}(?:n(?:ö|oe)tig|notwendig|n(?:ö|oe)tig))|${__T[1]}(?:wischwasser|waschwasser|scheibenwaschwasser|scheibenreiniger)\s+(?:ist\s+)?(?:alle|aufgebraucht)${__T[0]}|${__T[5]}(?:no|out\s+of|ran\s+out\s+of|run\s+out\s+of)\s+(?:windscreen\s+|windshield\s+)?(?:washer\s+fluid|screen\s*wash)(?![a-z])|${__T[2]}(?:нема\S*|немає|нет|нету|закінчил\S*|закончил\S*|скінчил\S*)${__T[7]}(?:омивайк\S*|омывайк\S*|незамерзайк\S*|рідин\S*\s+(?:для\s+)?омивач\S*|жидкост\S*\s+(?:для\s+)?омыват\S*|омивач\S*|омыват\S*)|${__T[2]}(?:омивайк\S*|омывайк\S*|незамерзайк\S*)${__T[7]}(?:закінчил\S*|закончил\S*|скінчил\S*|нема|немає|нет|нету)${__T[6]})(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|nachgef(?:ü|ue)llt|aufgef(?:ü|ue)llt|wieder\s+voll${__T[23]}refilled|topped\s+up${__T[12]}отремонт\S*|заменил\S*|долил\S*|долив\S*|залил\S*|залив\S*))|${__T[5]}(?:wipers?|wiper\s+motor|washers?|screen\s*wash)\s+(?:(?:has|have|just|completely)\s+){0,2}(?:packed\s+(?:in|up)|gave\s+up|given\s+up|stopped\s+working|not\s+(?:squirting|spraying))(?![a-z])${__RX[18]}|${__T[3]}(?:fahrerhaus|kabinen|front|scheiben|frontscheiben|spiegel|heizungs)?(?:heizung|lüftung|lueftung|gebläse|geblaese|defroster|defrost)(?:en|motor)?${__T[0]}\s+${__T[9]}(?:ausgefallen|dreht\s+(?:sich\s+)?nicht|pustet\s+nicht|(?:l(?:ä|ae)uft|geht|funktioniert)\s+nur\s+(?:noch\s+)?(?:auf\s+)?(?:stufe|einer|h(?:ö|oe)chster|der\s+h(?:ö|oe)chsten|voller|volle|max)|fällt\s+aus|faellt\s+aus${__T[27]}defekt|kaputt|bläst\s+nicht|blaest\s+nicht|heizt\s+nicht|wird\s+${__T[13]}warm|bleibt\s+kalt|tot${__T[0]}|bl(?:ä|ae)st\s+(?:nur\s+)?kalt)|${__RX[7]}${__T[1]}kein(?:e|en)?\s+(?:fahrerhaus|kabinen)?heizung${__T[0]}(?!${__T[7]}(?:n(?:ö|oe)tig|notwendig|erforderlich|gebraucht|probleme?|st(?:ö|oe)rung))|${__RX[7]}${__T[5]}no\s+(?:cab\s+)?(?:heat|heating)(?![a-z])(?!${__T[7]}(?:needed|required|necessary|damage|shield|issues?|problems?|faults?))|${__RX[7]}${__T[2]}(?:нет|нету|немає|нема)\s+(?:отоплени|опаленн|обігрів|обогрев|печк|пічк)\S*|${__T[3]}(?:windschutzscheibe|frontscheibe|seitenscheibe|heckscheibe|scheibe|scheiben|fenster)n?\s+${__T[9]}(?:beschlagen|beschl(?:ä|ae|a)gt|beschlagt|vereist|vereisen|zugefroren|friert${__T[7]}zu|frieren${__T[7]}zu)${__T[0]}|(?:beschlagene|vereiste|zugefrorene)[nmrs]?${__T[7]}(?:windschutzscheibe|frontscheibe|seitenscheibe|scheibe|scheiben|fenster)|${__T[3]}(?:scheiben)?wischer(?:n|blätter|blaetter|blatt|blattes|gummi|gummis|motor|arm)?\s+${__T[9]}(?:gerissen|eingerissen|lose|locker|ausgefallen|fällt\s+aus|faellt\s+aus|fallen\s+aus|geht\s+nicht|gehen\s+nicht|funktioniert\s+nicht|funktionieren\s+nicht|defekt|kaputt|bleibt\s+stehen|bleiben\s+stehen|wischt\s+nicht|wischen\s+nicht|schmiert|schmieren|quietscht|quietschen|rattert|rattern|(?:zieht|ziehen|macht|machen|hinterl(?:ä|ae|a)sst|hinterlassen)${__T[7]}streifen|festgefroren|eingefroren|abgebrochen|abgerissen|abgefallen|verbogen)|${__T[3]}(?:wischwasser|waschwasser|scheibenwaschanlage|scheibenwaschwasser|scheibenreiniger|waschanlage\s+der\s+scheibe)\s+${__T[9]}(?:leer|gefroren|eingefroren|geht\s+nicht|kommt\s+nicht|funktioniert\s+nicht|defekt|kaputt)|(?<![a-z])(?<!(?:parking|night|seat|engine|cooling|radiator|reefer|fridge)\s)(?:(?:cab\s+)?(?:heater|heating|blower|fan|defroster|demister|de-mister)|heated\s+(?:wing\s+|side\s+|door\s+)?mirrors?|mirror\s+heat(?:ing|er)s?)\s+${__T[9]}(?:not\s+(?:working|blowing)|doesn['’]?t\s+(?:work|blow)|won['’]?t\s+blow|isn['’]?t\s+(?:working|blowing)|broken|failed|stopped|dead|out(?![a-z])|only\s+(?:works|runs|blows|goes)\s+on\s+(?:full|max|maximum|high|top|(?:speed|setting|level)\s+\d)|stuck\s+on\s+(?:full|max|maximum|high|top))${__T[39]}windscreen|windshield|windows?|glass)\s+${__T[9]}(?:fogged|fogging|fogs|misted|misting|mists|steamed|steaming|iced|icing|icy|frozen|frosted)(?![a-z])|(?:fogged|misted|steamed|iced|frozen|frosted)[\s-]+(?:up\s+)?(?:windscreen|windshield|windows?)${__T[39]}windscreen\s+|windshield\s+)?(?:wipers?|wiper\s+blades?|washer\s+fluid|washers?|screen\s*wash)\s+${__T[9]}(?:not\s+working|doesn['’]?t\s+work|don['’]?t\s+work|isn['’]?t\s+working|aren['’]?t\s+working|(?:won['’]?t|will\s+not|don['’]?t|doesn['’]?t)\s+(?:stop|turn\s+off|switch\s+off|park)|keep\s+(?:going|running|wiping)|stuck\s+on|broken|failed|stopped|frozen|empty|dead|squeak\S*|squeal\S*|streak\S*|smear\S*|leav\S*${__T[7]}streaks)|${__T[4]}(?<!(?:автономн|стоянков|додатков|дополнительн)\S*\s+)(?:пічк|печк|обігрів|обогрев|опаленн|отоплени|отопител|обдув|підігрів\S*\s+дзеркал|подогрев\S*\s+зеркал)\S*\s+${__T[9]}(?:${__T[43]}|не\s+запуска\S*|не\s+вмика\S*|не\s+включа\S*|сдохл\S*|здохл\S*|умерл\S*|злама[внл]\S*${__T[17]}несправн\S*|неисправ\S*|не\s+гріє|не\s+греє|не\s+греет|не\s+дме|не\s+дует|(?:дме|дует)${__T[7]}холодн\S*)|${__T[4]}(?:скл[оаіу]|стекл[оаеу]|лобов\S*)\S*\s+${__T[9]}(?:запотіл\S*|запотел\S*|запотіва\S*|запотева\S*|пітні\S*|замерзл\S*|замерза\S*|обмерзл\S*|заледені\S*|обледене\S*)|${__T[4]}(?:двірник|дворник|склоочисник|стеклоочистител|омивач|омыват|омивайк|омывайк|незамерзайк)\S*\s+${__T[9]}(?:(?<!не\s)(?:при|за)мерз\S*${__T[15]}не\s+бризка\S*|не\s+брызга\S*|не\s+вимика\S*|не\s+выключа\S*|не\s+зупиня\S*|не\s+останавлива\S*${__T[28]}замерз\S*|закінчил\S*|закончил\S*|скрип\S*|скрегоч\S*|маж\S*|розмазу\S*|размазыва\S*|порва[лвн]\S*|відірва[лв]\S*|оторвал\S*|погну[лвт]\S*|(?:не|погано|плохо)\s+(?:чист\S*|приляга\S*|прилега\S*))|${__RX[7]}(?<![a-z])(?<!(?:parking|night|seat|engine)\s)(?:cab\s+)?heater\s+${__T[8]}(?:blow(?:s|ing)?\s+(?:only\s+)?cold|only\s+blows\s+cold)${__RX[7]}|${__RX[7]}${__T[2]}(?<!(?:автономн|стоянков|додатков|дополнительн)\S*\s+)(?:пічк|печк|обігрів|обогрев)\S*${__T[7]}(?:дує|дует)${__T[7]}холодн\S*${__RX[7]}|${__RX[7]}${__T[1]}(?:scheiben)?(?:wasch|wisch)(?:anlage|d(?:ü|ue)sen?|wasserpumpe)\s+${__T[8]}(?:spritzt|spr(?:ü|ue)ht|pumpt|geht|funktioniert)${__T[7]}nicht${__T[0]}${__RX[7]}|${__RX[7]}${__T[1]}(?:wasch|wisch)d(?:ü|ue)sen?${__T[7]}(?:verstopft|eingefroren|zugefroren)${__RX[7]}|${__RX[7]}${__T[5]}(?:screen\s*)?wash(?:er)?\s+(?:jets?\s+|pump\s+|nozzles?\s+)?(?:not\s+spraying|won['’]?t\s+spray|blocked|frozen|not\s+working)(?![a-z])${__RX[7]}|${__T[2]}(?:вікн\S*|окн\S*)${__T[7]}(?:запотіва\S*|запотева\S*|запотіл\S*|запотел\S*|пітні\S*|потіють|потеют)${__T[6]}${__RX[7]}|${__T[5]}(?:windows?|side\s+windows?|glass)\s+(?:keeps?\s+|are\s+|is\s+|always\s+)?(?:steam\S*|fog\S*|mist\S*)\s+up(?![a-z])${__RX[7]}|(?:${__T[5]}wiper\s+(?:blade|rubber)s?${__T[7]}(?:torn|split|ripped|worn|broken|damaged|cracked|loose)|${__T[2]}(?:щітк|щетк|гумк|резинк)\S*${__T[7]}(?:двірник|дворник|склоочисник|стеклоочистител)\S*${__T[7]}(?:порвал\S*|порван\S*|зношен\S*|стерл\S*|зламал\S*|відірвал\S*|оторвал\S*))${__RX[11]}|${__T[2]}(?:бач(?:ок|к\S*)${__T[7]}(?:омыват|омивач|омивайк|омывайк)\S*${__T[7]}(?:пуст\S*|порожн\S*|треснул\S*|тріснув\S*|лопнул\S*|лопнув|теч\S*|протека\S*|протіка\S*)|(?:пуст\S*|порожн\S*)\s+бач(?:ок|к\S*)${__T[7]}(?:омыват|омивач)\S*)${__T[10]}fixed|repaired|replaced${__T[11]}заменил\S*|усунул\S*|устранил\S*|долил\S*|долив\S*))|${__T[2]}(?:зеркал|дзеркал)\S*${__T[7]}не\s+(?:гре|грі|подогрева|підігріва)\S*(?![^.;!?]*(?:отремонт|відремонт|заменил|замінил|починил|полагодил)\S*)`, 'i', 1);




const VISIB2_HINT = lbRx(String.raw`(?:${__T[1]}(?:front|seiten|windschutz)?scheiben?\s+friert${__T[7]}(?:von\s+)?innen\s+zu${__T[0]}|${__T[1]}(?:au(?:ß|ss)en|haupt|weitwinkel|rampen|fahrer|beifahrer)?spiegel(?:s)?\s+${__T[8]}(?:beschl(?:ä|ae)gt|beschlagen|vereist|zugefroren|friert\s+zu)${__T[0]}|${__T[1]}(?:scheiben)?wischer(?:arme?|bl(?:a|ä)tt(?:er)?)?\s+(?:\S+\s+){0,5}?bleib(?:t|en)\s+(?:\S+\s+){0,4}?stehen${__T[0]}|${__T[1]}(?:scheiben)?wischer(?:arme?|bl(?:a|ä)tt(?:er)?)?${__T[7]}(?:geht|gehen|l(?:ä|ae)uft|laufen|funktioniert|funktionieren)\s+nur\s+(?:noch\s+)?(?:(?:auf|in|im)\s+)?(?:\S+\s+)?(?:langsam|schnell|stufe|intervall|einmal|manchmal|sporadisch)|${__T[1]}(?:scheiben)?wischer(?:arme?|bl(?:a|ä)tt(?:er)?)?${__T[7]}h(?:ö|oe)r(?:t|en)\s+${__T[13]}auf${__T[0]}|${__T[1]}(?:wisch|wasch|scheibenwasch)wasser\s+(?:kommt|spritzt)\s+(?:nur\s+(?:noch\s+)?(?:links|rechts|wenig|tropfenweise|auf\s+einer\s+seite)|nicht)${__T[0]}|${__T[1]}(?:spritz|wasch|wischwasser|scheibenwasch)d(?:ü|ue)sen?${__T[7]}(?:verstopft|eingefroren|gefroren|zugefroren|spritz(?:t|en)\s+nicht|kaputt|defekt|abgebrochen)|${__T[1]}(?:scheiben)?(?:wasch|wisch)(?:wasser|anlagen)?[\s-]?pumpe${__T[7]}(?:defekt|kaputt${__T[27]}ausgefallen)|${__T[5]}wipers?${__T[7]}(?:stuck|stop|stops|stopped|stay|stays)\s+(?:in\s+the\s+middle|halfway|half\s+way|mid[\s-]?way|up)(?![a-z])|${__T[5]}wipers?\s+only\s+(?:work|works|run|runs|go|goes)\s+(?:on\s+)?(?:fast|slow|high|low|intermittent)|${__T[5]}washer\s+(?:fluid|water)\s+(?:not|isn['’]?t|won['’]?t|doesn['’]?t)\s+(?:spray|spraying|come|coming)|${__T[2]}(?:двірник\S*|дворник\S*)${__T[7]}(?:зупин\S*|останов\S*|застря\S*|завис\S*)\s+(?:посередині|посередине|посредине|на\s+середині|на\s+середине|вгорі|вверху)|${__T[2]}(?:двірник\S*|дворник\S*)${__T[7]}(?:працюють|працює|работают|работает)\s+(?:тільки|лише|только)|${__T[2]}форсунк\S*${__T[7]}(?:омива\S*|омыва\S*)${__T[7]}(?:забит\S*|засмічен\S*|засорен\S*|замерз\S*|${__T[43]}))${__RX[37]}|${__T[5]}(?:windscreen\s+|windshield\s+)?wipers?\s+(?:(?:are|is|got|get|keep|keeps|have|has)\s+)?(?:stuck|jammed|seized)(?![a-z])(?!\s+(?:in\s+)?traffic)${__RX[68]}|${__T[5]}wiper\s+(?:arm|blade)s?\s+(?:(?:has|have|just)\s+)?(?:fell|fallen|came|come|flew|ripped|snapped)\s+off(?![a-z])${__RX[68]}|${__T[5]}lost\s+(?:a|the|one|my)\s+wiper(?:\s+(?:arm|blade))?(?![a-z])${__RX[68]}|${__T[1]}(?:scheiben)?wischer\s+nur\s+(?:noch\s+)?(?:(?:auf|in|im|die|der)\s+)?(?:\S+\s+)?(?:stufe|intervall|langsam|schnell)\S*${__T[0]}${__RX[68]}|${__T[1]}(?:scheiben)?wischer(?:arm|blatt)?\s+(?:(?:ist|sind|hat\s+sich|h(?:ä|ae)ngt|komplett)\s+){0,2}(?:abgefallen|weggeflogen|abgeflogen|klemmt|festgefroren|steckt\s+fest|h(?:ä|ae)ngt\s+fest)${__T[0]}${__RX[68]}`, 'i', 1);


const VISIB3_HINT = lbRx(String.raw`${__RX[39]}(?:${__T[2]}(?:двірник\S*|дворник\S*|склоочисник\S*|стеклоочистител\S*)\s+${__T[8]}(?<!не\s)(?:останов\S*|зупин\S*|встал[иа]?|стал[иа]?|переста\S*|застр\S*|завис\S*|заклин\S*|не\s+(?:включа\S*|вмика\S*|двига\S*|руха\S*|крут\S*))${__T[6]}|${__T[2]}не\s+(?:бр[иы]з[кг]а\S*|пода\S*|поступа\S*|надход\S*|йде|ид[её]т)\s+${__T[8]}(?:стекло|скло|лобов\S*)${__T[6]}|${__T[2]}(?:вода|омывайк\S*|омивайк\S*|жидкост\S*|рідин\S*)${__T[7]}не\s+(?:бр[иы]з[кг]а\S*|пода\S*|поступа\S*|надход\S*|йде|ид[её]т)${__T[6]}|${__T[2]}(?:нет|нету|нема|немає|закончил\S*|кончил\S*|скінчил\S*|закінчил\S*)\s+(?:(?:воды|води|жидкости|рідини)\s+(?:в|у|для)\s+)?(?:бачк\S*\s+)?(?:омыват\S*|омивач\S*|омывайк\S*|омивайк\S*)|${__T[2]}(?:дзеркал\S*|зеркал\S*)${__T[7]}(?<!не\s)(?:запот\S*|пітні\S*|потеет|потіє|замерз\S*|обмерза\S*|змерз\S*|обледен\S*|покрил\S*\s+льдом)${__T[6]})|${__T[2]}(?:(?:поводок|повідець|поводк\S*|повідц\S*|щетк\S*|щітк\S*|рычаг\S*|важіл\S*|важел\S*)\s+)?(?:дворник\S*|двірник\S*|стеклоочистител\S*|склоочисник\S*)${__T[7]}(?:отвалил\S*|відвалил\S*|відвалив\S*|оторвал\S*|відірвал\S*|відірвав\S*|слетел\S*|злетів\S*|злетіл\S*|сломан\S*|сломал\S*|злама\S*|оставля\S*\s+(?:полос\S*|развод\S*)|залиша\S*\s+(?:смуг\S*|розвод\S*)|мажет|мажут|розмазу\S*|размазыва\S*)${__T[6]}${__RX[70]}|${__T[2]}(?:омыват\S*|омивач\S*|омывайк\S*|омивайк\S*)${__T[7]}не\s+(?:ль[её]т\S*|ллє\S*|ллєт\S*|подает\S*|подає\S*|подаєт\S*|качает|качає|бьет|б['’]?є)${__T[6]}${__RX[70]}`, 'i', 1);




const EXHAUST_HINT = lbRx(String.raw`${__T[2]}(?:глушник\S*|глушител\S*|вихлоп\S*|выхлоп\S*)${__T[7]}(?:гуркоч\S*|гуркотить|гучно|громко|реве|ревет|гуде|гудит|тарахт\S*)${__RX[0]}|${__T[5]}exhaust\s+(?:smell|fumes|gas(?:es)?|odou?r)\s+${__T[8]}(?:in|inside|into)\s+(?:the\s+)?(?:cab|cabin)(?![a-z])|${__T[3]}(?:auspuff|auspuffanlage|auspuffrohr|abgasanlage|abgasrohr|endtopf|schalld(?:ä|ae|a)mpfer|abgaskr(?:ü|ue|u)mmer|kr(?:ü|ue|u)mmer)(?:s|es)?${__T[0]}\s+${__T[9]}(?:(?:sehr\s+)?laut(?:er)?(?=\s*(?:$|[.,!;]|geworden|und|als|beim|bei|seit|wie|w(?:ä|ae|a)hrend))|dr(?:ö|oe|o)hnt|knattert|zischt|pfeift|undicht|leck${__T[0]}|hat${__T[7]}loch|durchgerostet|gerissen|rissig|bl(?:ä|ae|a)st\s+ab)|${__T[3]}(?:abgase?|abgasgeruch|abgasgestank|auspuffgase?)\s+${__T[9]}(?:im|in\s+der|in\s+die|ins)\s+(?:fahrerhaus|f(?:ü|ue|u)hrerhaus|kabine|cockpit)${__T[0]}|${__T[3]}(?:riecht|riechts|stinkt|roch)\s+(?:\S+\s+){0,4}?nach\s+(?:abgas(?:en)?|auspuff(?:gasen)?)${__T[0]}${__T[39]}exhaust(?:\s+(?:pipe|system|manifold))?|muffler|silencer)(?!\s+brake)\s+${__T[9]}(?:(?:very\s+)?loud|noisy|blowing|leak\S*|has\s+(?:a\s+)?hole|holed|roar\S*|cracked|rusted\s+through|hiss\S*)${__T[24]}(?:exhaust\s+)?fumes\s+${__T[9]}(?:in|into|inside)\s+(?:the\s+)?(?:cab|cabin)${__T[24]}(?:smell\S*|stink\S*|reek\S*)\s+${__T[9]}(?:of\s+)?exhaust(?![a-z])|${__T[4]}(?:вихлоп\S*|выхлоп\S*|глушник\S*|глушител\S*)\s+${__T[9]}(?:гучн\S*|громк\S*|гуде\S*|гудит|реве\S*|ревет|тріснув\S*|треснул\S*|дірк\S*|дыр\S*|пропуска\S*|прогорі\S*|прогорел\S*)|${__T[4]}(?:запах\S*|смердить|воняє|воняет|пахне|пахнет)\s+${__T[9]}(?:вихлоп\S*|выхлоп\S*)|${__T[4]}(?:вихлопн\S*\s+газ\S*|выхлопн\S*\s+газ\S*)\s+${__T[8]}(?:в|у)\s+(?:кабін\S*|кабин\S*)|${__T[1]}(?:auspuff|auspuffanlage|auspuffrohr|endtopf|schalld(?:ä|ae|a)mpfer)(?:s|es)?${__T[0]}\s+(?:(?:ist|sind|hinten|links|rechts|komplett|total|ganz|wohl|vermutlich|schon)\s+){0,3}(?:kaputt|defekt|besch(?:ä|ae)digt|abgebrochen|abgefallen|abgeknickt|eingedr(?:ü|ue)ckt|verbogen)${__T[0]}${__RX[51]}|${__T[5]}(?:exhaust(?:\s+(?:pipe|system))?|muffler|silencer)(?!\s+brake)\s+(?:(?:is|has|was|got)\s+){0,2}(?:broken|damaged|bent|snapped|fell\s+off|come\s+off|came\s+off)(?![a-z])${__RX[51]}`, 'i', 1);

const EXHAUST2_HINT = lbRx(String.raw`${__T[10]}geschwei(?:ß|ss)t${__T[26]}in\s+ordnung|leise)|nicht\s+mehr|kein(?:e|en)?\s+(?:ger(?:ä|ae)usch|geruch|krach|l(?:ä|ae)rm)${__T[23]}welded|no\s+longer${__T[12]}отремонт\S*|заменил\S*${__T[22]}(?:${__T[1]}(?:auspuff|endtopf|schalld(?:ä|ae)mpfer|abgasanlage|abgasrohr)\S*\s+${__T[8]}(?:macht${__T[7]}(?:krach|l(?:ä|ae)rm|ger(?:ä|ae)usche?|komische\s+ger(?:ä|ae)usche?)|knallt|knattert|klappert|scheppert|rasselt|pfeift|zischt)${__T[0]}|${__T[1]}(?<!kein(?:e|en)?\s+)(?:abgas(?:e)?${__T[7]}(?:riecht|riechen|stinkt|stinken)|abgasgeruch|auspuffgeruch)${__T[0]}|${__T[5]}exhaust(?!\s+brake)\s+${__T[8]}(?:making\s+(?:a\s+)?(?:noise|racket)|banging|rattling|popping|blowing|hissing)(?![a-z])|${__T[5]}(?:exhaust\s+(?:fumes?\s+)?smell|smell\s+of\s+exhaust)(?![a-z]))`, 'i', 1);




const CABTILT_HINT = lbRx(String.raw`${__T[3]}(?:fahrerhaus|f(?:ü|ue|u)hrerhaus|fahrerkabine|kabine)(?:es|s)?${__T[0]}(?!${__T[7]}(?:t(?:ü|ue|u)r|t(?:ü|ue|u)re|t(?:ü|ue|u)ren|fenster|heizung|licht|beleuchtung|schloss|schl(?:ü|ue|u)ssel)${__T[0]})\s+${__T[9]}(?:l(?:ä|ae|a)sst\s+sich${__T[7]}${__T[13]}(?:kippen|ankippen|hochkippen|zur(?:ü|ue|u)ckkippen|herunterlassen|runterlassen|absenken|verriegeln)|kippt${__T[7]}nicht|geht${__T[7]}${__T[13]}(?:hoch|runter|nach\s+unten|zur(?:ü|ue|u)ck)${__T[0]}|nicht\s+(?:richtig\s+|ganz\s+)?verriegelt|unverriegelt|rastet${__T[7]}${__T[13]}ein|bleibt${__T[7]}(?:halb\s+)?(?:oben|gekippt|hochgekippt|in\s+der\s+luft))|${__T[3]}(?:kippvorrichtung|kipppumpe|kippzylinder|fahrerhauskippung|fahrerhausverriegelung|kabinenverriegelung|kippverriegelung|kabinenkippung|kipphydraulik)(?:en)?${__T[0]}\s+${__T[9]}(?:defekt|kaputt|undicht|klemmt|geht\s+nicht|funktioniert${__T[7]}nicht|ausgefallen|fehler\S*|st(?:ö|oe|o)rung|offen${__T[0]}|verliert${__T[7]}(?:(?:ö|oe|o)l|druck))${__T[39]}cab|cabin)(?![a-z])(?!${__T[7]}(?:doors?|windows?|lights?|heater|heating|keys?|locks?)(?![a-z]))\s+${__T[9]}(?:won['’]?t\s+(?:tilt|lower|go\s+(?:back\s+)?(?:up|down)|lock|latch)|will\s+not\s+(?:tilt|lower|lock|latch)|doesn['’]?t\s+(?:tilt|lower|lock|latch)|not\s+(?:tilting|locked|latched|lowering)|unlocked|unlatched|stuck\s+(?:half[-\s]?)?(?:up|tilted|raised|open))${__T[39]}cab[-\s]?tilt(?:ing)?\s+(?:pump|mechanism|system|cylinder|ram|hydraulic\S*)|cab\s+(?:lock|latch|locking))\s+${__T[9]}(?:broken|faulty|failed|fault|leak\S*|not\s+working|doesn['’]?t\s+work|open|stuck|error)(?![a-z])|${__T[4]}(?<!(?:в|у|во)\s)(?![^.;!?]*(?:скло|стекл|окн|вікн|окошк|віконц))(?:кабін\S*|кабин\S*)\s+${__T[9]}(?:не${__T[7]}(?:перекида\S*|опрокид\S*|відкида\S*|откидыва\S*|підійма\S*|поднима\S*|опуска\S*|підня\S*|подня\S*|опуст\S*|відкину\S*|откину\S*|фіксу\S*|фиксир\S*)|не\s+зафіксован\S*|не\s+зафиксирован\S*|не${__T[7]}(?:защ[её]лкн\S*|заклацн\S*|клацну\S*)|не\s+(?:встал\S*|стал\S*|сел\S*)\s+на\s+(?:замок|фиксатор\S*|защ[её]лк\S*)|застрягл\S*|застряла|зависл\S*)|${__RX[7]}${__T[2]}(?<!(?:в|у|во)\s)(?![^.;!?]*(?:скло|стекл|окн|вікн|окошк|віконц))(?:кабін\S*|кабин\S*)\s+не\s+(?:піднімається|поднимается|відкидається|откидывается|опускається|опускается)${__RX[7]}|${__T[2]}(?:насос|гидравлик|гідравлік|hydraulik)\S*${__T[7]}(?:кабин|кабін|kabine|fahrerhaus)\S*\s+${__T[8]}(?:undicht|verliert|leckt|defekt|не\s+кача\S*${__T[15]}злама\S*${__T[17]}теч\S*|тече|подтека\S*|підтіка\S*)${__RX[7]}`, 'i', 1);




const GELFUEL_HINT = lbRx(String.raw`${__T[1]}(?:diesel|dieselkraftstoff|kraftstoff|sprit|treibstoff|adblue|ad-blue|harnstoff|harnstoffl(?:ö|oe|o)sung|kraftstofffilter|dieselfilter|kraftstoffleitung(?:en)?|dieselleitung(?:en)?|adblue-leitung(?:en)?|adblue-tank|adbluetank)(?![a-zäöüß-])\s+${__T[9]}(?:versulzt|eingefroren|gefroren|zugefroren|geliert|ausgeflockt|eingedickt|flockt${__T[7]}aus|friert${__T[7]}ein|friert${__T[0]}|dick\s+geworden|wird${__T[7]}dick)${__T[0]}|${__T[3]}(?:versulzt|eingefroren|gefroren|zugefroren|geliert|ausgeflockt|eingedickt)(?:e|er|es|en|em)?${__T[7]}(?:diesel|dieselkraftstoff|kraftstoff|adblue|ad-blue|harnstoff|kraftstofffilter|dieselfilter|kraftstoffleitung(?:en)?|dieselleitung(?:en)?)${__T[0]}${__T[39]}diesel|fuel(?!\s+gauge)|adblue|ad\s*blue|diesel\s+exhaust\s+fluid|fuel\s+filter|fuel\s+lines?)\s+${__T[9]}(?:gelled|gelling|gelled\s+up|gel(?![a-z])|waxed|waxing|frozen|froze|freezing|turned\s+to\s+gel)${__T[24]}(?:frozen|gelled|waxed)\s+(?:up\s+)?(?:diesel|fuel|adblue|ad\s*blue|fuel\s+filter|fuel\s+lines?)(?![a-z])|${__T[4]}(?:дизел\S*|соляр\S*|паливо|палива|пальне|пального|топливо|топлива|adblue|адблю|сечовин\S*|мочевин\S*|(?:паливн|топливн)\S*\s+(?:фільтр|фильтр)\S*)\s+${__T[9]}(?:замерз\S*|застиг\S*|загус\S*|загуст\S*|парафін\S*|парафин\S*|кристаліз\S*|кристаллиз\S*)|${__T[2]}(?:парафін|парафин)\S*${__T[7]}(?:в|у)\s+(?:дизел|соляр|палив|пальн|топлив|бак)\S*`, 'i', 1);






const DRYFUEL_HINT = lbRx(String.raw`${__T[1]}(?<!(?:adblue|ad-blue|harnstoff|wasser|wischwasser)\s)(?:tank|tanks|dieseltank|kraftstofftank|haupttank)\s+(?:(?:ist|war|komplett|ganz|v(?:ö|oe)llig|total|leider|jetzt|schon|fast)\s+){0,2}(?:leer${__T[0]}(?!\s+(?:gemacht|gepumpt|ger(?:ä|ae)umt|abgelassen))|leer\s?gefahren|trocken\s?gefahren)|${__T[1]}(?:tank|dieseltank|kraftstofftank)\s+(?:\S+\s+){1,3}?(?:leer|trocken)\s?gefahren${__T[0]}|${__T[1]}(?:diesel|kraftstoff|sprit)\s+(?:(?:komplett|ganz|v(?:ö|oe)llig)\s+)?(?:leer|trocken)\s?gefahren${__T[0]}|${__T[1]}(?:diesel|kraftstoff|sprit)\s+(?:(?:ist|war|komplett|ganz|v(?:ö|oe)llig)\s+){0,2}leer${__T[0]}(?!\s*(?:gemacht|gepumpt|ger(?:ä|ae)umt|abgelassen|getankt))|${__T[1]}(?:kein|keinen|ohne)\s+(?:diesel|kraftstoff|sprit|treibstoff|benzin)\s+mehr${__T[0]}|${__T[1]}ohne\s+(?:diesel|kraftstoff|sprit|treibstoff)\s+${__T[8]}(?:liegen\s?geblieben|stehen\s?geblieben)|${__T[1]}(?:diesel|kraftstoff|sprit|treibstoff)\s+(?:ist\s+|war\s+)?(?:alle|ausgegangen|zu\s+ende|aufgebraucht)${__T[0]}(?!\s+getankt)${__T[39]}ran|run|running|runs)\s+out\s+of\s+(?:fuel|diesel|petrol|gas)${__T[24]}out\s+of\s+(?:fuel|diesel)(?![a-z])(?!\s+cards?)${__T[39]}ran|run|running)${__T[7]}dry${__T[24]}(?:fuel|diesel)\s+tank\s+(?:is\s+|was\s+)?(?:empty|dry)${__T[24]}no\s+(?:fuel|diesel)\s+left(?![a-z])|${__T[4]}(?:скінчил\S*|закінчил\S*|кончил\S*|закончил\S*)${__T[7]}(?:пальне|паливо|солярк\S*|дизел\S*|топливо|бензин)(?![а-яіїєґ])|${__T[4]}(?:пальне|паливо|солярк\S*|дизел\S*|топливо)${__T[7]}(?:скінчил\S*|закінчил\S*|кончил\S*|закончил\S*)|${__T[4]}${__T[36]})${__T[7]}(?:пального|палива|солярки|дизеля|топлива)(?![а-яіїєґ])|${__T[4]}(?:паливний\s+|топливный\s+)?бак${__T[7]}(?:порожн\S*|пуст\S*)|${__T[1]}(?:lkw|fahrzeug|wagen|sattelzug|laster|ihn)\s+(?:(?:ist|war|komplett|ganz|v(?:ö|oe)llig)\s+){0,2}trocken\s?gefahren${__T[0]}|${__T[1]}(?<!nicht\s)(?:vergessen${__T[7]}zu\s+tanken|tanken\s+vergessen|nicht\s+getankt)${__T[0]}(?=[^.;!?]*(?:steht|stehe|steh|stehen|stand|stehen\s?geblieben|liegen\s?geblieben|ausgegangen|geht\s+aus|ging\s+aus|springt${__T[7]}nicht|f(?:ä|ae)hrt${__T[7]}nicht|komme?\s+${__T[13]}weiter)${__T[0]})|${__T[1]}(?:steht|stehe|steh|stehen|stand|stehen\s?geblieben|liegen\s?geblieben|ausgegangen|geht\s+aus|ging\s+aus|springt${__T[7]}nicht|f(?:ä|ae)hrt${__T[7]}nicht|komme?\s+${__T[13]}weiter)${__T[0]}[^.;!?]*(?<!nicht\s)(?:vergessen${__T[7]}zu\s+tanken|tanken\s+vergessen|nicht\s+getankt)${__T[0]}|${__T[5]}forgot\s+to\s+(?:fill\s+up|refuel|fuel\s+up|get\s+(?:fuel|diesel)|fill\s+(?:the\s+)?tank)(?![a-z])(?=[^.;!?]*(?:stuck|stranded|stopped|broke\s+down|broken\s+down|won['’]?t\s+start|died|cut\s+out|conked\s+out)(?![a-z]))|${__T[5]}(?:stuck|stranded|stopped|broke\s+down|broken\s+down|won['’]?t\s+start|died|cut\s+out|conked\s+out)(?![a-z])[^.;!?]*forgot\s+to\s+(?:fill\s+up|refuel|fuel\s+up|get\s+(?:fuel|diesel)|fill\s+(?:the\s+)?tank)(?![a-z])|${__T[2]}(?<!не\s)(?:забув|забула|забыл|забыла)${__T[7]}(?:заправит\S*|заправл\S*|залит\S*\s+(?:пальне|паливо|солярк\S*|дизел\S*|топливо))(?=[^.;!?]*(?:стою|стоїть|стоит|стоїмо|стоим|заглох\S*|заглух\S*|не\s+заводит\S*|застряг\S*|застрял\S*)${__T[6]})|${__T[2]}(?:стою|стоїть|стоит|стоїмо|стоим|заглох\S*|заглух\S*|не\s+заводит\S*|застряг\S*|застрял\S*)${__T[6]}[^.;!?]*(?<!не\s)(?:забув|забула|забыл|забыла)${__T[7]}(?:заправит\S*|заправл\S*|залит\S*\s+(?:пальне|паливо|солярк\S*|дизел\S*|топливо))|${__T[2]}(?<!не\s)(?<!(?:дорог|асфальт|трас|покрыт|покритт|краск|фарб|лак|шпакл|клей|пол|підлог|земл|трав|бетон)\S*${__T[7]})(?:обсох|обсохла|обсохли|обсохло)${__T[6]}(?![^.;!?]*(?:асфальт|покрыт|покритт|краск|фарб|лак${__T[6]}|шпакл|клей|підлог))`, 'i');




const SAFETYKIT_HINT = lbRx(String.raw`${__T[5]}(?:used|emptied|discharged|set\s+off)\s+(?:the\s+|a\s+|my\s+|our\s+)?(?:fire\s+extinguisher|extinguisher|first[-\s]aid\s+kit)(?![a-z])|${__T[5]}(?<!fire\s)extinguisher\s+(?:(?:was|has\s+been|got|is)\s+)?(?:used|discharged|empty|emptied|missing|expired)(?![a-z])|${__T[4]}(?:використа\S*|использова\S*|спустошив\S*|розрядив\S*|разрядил\S*)${__T[7]}(?:вогнегасник\S*|огнетушител\S*|аптечк\S*)|${__T[1]}(?:warndreieck|warnweste(?:n)?|verbandkasten|verbandskasten|verbandk(?:ä|ae|a)sten|erste-hilfe-kasten|feuerl(?:ö|oe|o)scher|unterlegkeil(?:e)?|radkeil(?:e)?|bordwerkzeug|wagenheber)(?:s|es)?${__T[0]}\s+${__T[9]}(?:fehlt|fehlen|weg${__T[0]}|verschwunden|verloren|liegen\s+gelassen|liegengelassen|${__T[13]}(?:da|vorhanden|an\s+bord|im\s+fahrzeug|im\s+lkw)${__T[0]}|abgelaufen|leer${__T[0]}|benutzt|ausgel(?:ö|oe|o)st|kaputt|defekt|besch(?:ä|ae|a)digt|unvollst(?:ä|ae|a)ndig)|${__T[1]}(?:warnleuchte|warnlampe)\s+${__T[8]}(?:fehlt|weg${__T[0]}|${__T[13]}(?:da|vorhanden|an\s+bord)${__T[0]})|${__T[3]}(?:kein|keine|keinen)\s+(?:warndreieck|warnweste|verband\S*kasten|erste-hilfe-kasten|feuerl(?:ö|oe|o)scher|unterlegkeil\S*|radkeil\S*)${__T[0]}${__T[39]}warning\s+triangle|hi-?vis(?:\s+(?:vest|jacket))?|high[-\s]visibility\s+(?:vest|jacket)|safety\s+vest|first[-\s]aid\s+kit|fire\s+extinguisher|wheel\s+chocks?|chocks)\s+${__T[9]}(?:missing|gone|lost|left\s+behind|not\s+(?:there|on\s+board|in\s+the\s+(?:cab|truck|vehicle))|expired|out\s+of\s+date|empty|used|discharged|damaged|broken|incomplete)${__T[24]}(?:no|missing)\s+(?:warning\s+triangle|first[-\s]aid\s+kit|fire\s+extinguisher|wheel\s+chocks?|hi-?vis\s+(?:vest|jacket))(?![a-z])|${__T[4]}(?:знак\S*\s+аварійн\S*\s+зупинк\S*|аварійн\S*\s+знак\S*|аварийн\S*\s+знак\S*|знак\S*\s+аварийн\S*|аптечк\S*|вогнегасник\S*|огнетушител\S*|жилет\S*|противідкатн\S*|противооткатн\S*)\s+${__T[9]}(?:нема\S*${__T[37]}\S*|прострочен\S*|просрочен\S*|порожн\S*|пуст\S*${__T[30]}пошкоджен\S*|поврежден\S*|використан\S*|использован\S*)|${__T[4]}${__T[36]})${__T[7]}(?:аптечк\S*|вогнегасник\S*|огнетушител\S*|аварійн\S*\s+знак\S*|знак\S*\s+аварій\S*|аварийн\S*\s+знак\S*|жилет\S*|противідкатн\S*|противооткатн\S*)`, 'i', 1);


const WHEEL_HINT = lbRx(String.raw`${__T[1]}(?:(?:auflieger|anh(?:ä|ae|a)nger|vorder|hinter)?reifen|felge)${__T[7]}eier(?:t|n)${__T[0]}${__RX[17]}|${__T[1]}(?:(?:anh(?:ä|ae|a)nger|auflieger|vorder|hinter|lenk|antriebs|zwillings)?(?:reifen|achse)|achsen)${__T[0]}\s+${__T[9]}(?:hei(?:ß|ss)|qualm(?:t|en)|rauch(?:t|en)|gl(?:ü|ue|u)h(?:t|en))${__T[0]}${__T[39]}tyres?|tires?|axles?|hubs?)\s+${__T[8]}(?:(?:running|getting|very|too)\s+)?(?:hot|smoking|smoke|burning)(?![a-z])|${__T[1]}rad\s*mut+ern?\s+${__T[9]}(?:locker${__T[0]}|locka${__T[0]}|lose${__T[0]}|abgefallen|gelockert|fehlt|fehlen)|${__T[1]}rader\s+${__T[8]}(?:wackelt|wackeln|eiert|eiern)|${__T[1]}(?:radmutter|radmuttern|radbolzen|radschraube|radschrauben|radmutternindikator(?:en)?)\s+${__T[9]}(?:locker${__T[0]}|lose${__T[0]}|hat\s+sich\s+gel(?:ö|oe|o)st|haben\s+sich\s+gel(?:ö|oe|o)st|fehlt|fehlen|abgerissen|abgebrochen|abgeschert|verloren|weg${__T[0]}|verdreht|lockern\s+sich|lockert\s+sich)|${__T[3]}(?:lockere|lose|fehlende|abgerissene|abgescherte)[rnsm]?${__T[7]}(?:radmutter|radbolzen|radschraube)\S*|${__T[1]}(?:vorder|hinter|zwillings|anh(?:ä|ae|a)nger|auflieger)?(?:rad|r(?:ä|ae|a)der)\s+${__T[8]}(?:wackelt|wackeln|eiert|eiern|locker${__T[0]}|hat\s+spiel|abgefallen|abgerissen|verloren|weggeflogen|(?:ist\s+)?(?:ab(?=\s*(?:$|[.,;!?)\n]|(?:am|an|vom|von|beim|bei|auf|w(?:ä|ae)hrend|unterwegs|hinten|vorne?|links|rechts)${__T[0]}))|weg(?=\s*(?:$|[.,;!?)\n])))|hei(?:ß|ss)${__T[0]}|qualmt|raucht|gl(?:ü|ue|u)ht)|${__RX[21]}${__T[1]}(?:radlager|radnabe|radnaben|nabe|naben)\s+${__T[9]}(?:hei(?:ß|ss)|qualmt|raucht|gl(?:ü|ue|u)ht|defekt|kaputt|brummt|mahlt|heult|(?:ist\s+|sehr\s+|zu\s+|extrem\s+|ganz\s+)laut${__T[0]}|ger(?:ä|ae|a)usch|hat\s+spiel|locker${__T[0]}|wackelt)|${__T[1]}felge[n]?\s+${__T[8]}(?:gerissen|gebrochen|verbogen|hat\s+(?:einen\s+)?riss)|${__T[3]}riss\s+in\s+der\s+felge${__T[39]}wheel\s+(?:nut|stud|bolt)s?|lug\s+(?:nut|bolt)s?)\s+${__T[9]}(?:loose|missing|sheared|broken|gone|came\s+(?:off|loose)|backing\s+off)${__T[24]}(?:loose|missing|sheared|broken)\s+(?:wheel\s+(?:nut|stud|bolt)|lug\s+(?:nut|bolt))s?|(?<![a-z])(?<!steering\s)(?<!spare\s)wheels?\s+${__T[8]}(?:wobbl\S*|is\s+loose|came\s+off|fell\s+off|come\s+off|coming\s+off|(?:is\s+|got\s+)?(?:very\s+)?hot(?![a-z])|smoking)${__T[39]}lost|losing)\s+a\s+wheel${__T[39]}wheel\s+)?(?:bearing|hub)s?\s+${__T[9]}(?:hot|smoking|noisy|(?<!no\s)noises?|(?<!no\s)making\s+(?:a\s+)?noise|grinding|humming|rumbling|droning|failed|gone|broken|has\s+play)${__T[24]}(?:cracked|broken)\s+(?:wheel\s+)?rims?|(?<![a-z])rims?${__T[7]}(?:cracked|broken|bent)(?![a-z])|${__T[4]}(?:колісн\S*|колесн\S*)\s+(?:гайк\S*|болт\S*|шпильк\S*)\s+${__T[8]}(?<!не\s)(?:ослаб\S*|відкрут\S*|открут\S*|розкрут\S*|раскрут\S*|нема\S*${__T[37]}\S*|злама\S*|слома\S*|відірв\S*|оторв\S*)|${__T[4]}(?:гайк\S*|болт\S*|шпильк\S*)\s+(?:на\s+)?колес\S*\s+${__T[8]}(?<!не\s)(?:ослаб\S*|відкрут\S*|открут\S*|розкрут\S*|раскрут\S*|нема\S*${__T[37]}\S*|злама\S*|слома\S*|відірв\S*|оторв\S*)|${__T[4]}колес\S*\s+${__T[8]}(?:хита\S*|болта\S*|шата\S*|розхита\S*|расшата\S*|відпал\S*|відвал\S*|відлеті\S*|отлете\S*|отлет\S*|отвал\S*|злетіл\S*|слетел\S*|гаряч\S*|горяч\S*|дими\S*|дымит\S*)|${__T[4]}(?:відпал\S*|відвал\S*|відлеті\S*|отлете\S*|отлет\S*|отвал\S*|загуби\S*|потеря\S*|злетіл\S*|слетел\S*)${__T[7]}колес\S*|${__T[4]}(?:маточин\S*|ступиц\S*|підшипник\S*|подшипник\S*)\s+${__T[9]}(?:гаряч\S*|горяч\S*|гріє\S*|греет\S*|гуд\S*|шум\S*|ви[єю]\S*|во[юе]т\S*|хруст\S*|скрип\S*|сви[сщ]т\S*|дими\S*|дымит\S*|злама\S*|слома\S*|люфт\S*)|${__T[2]}(?:гуд[еуи]\S*|шум[иі]\S*|ви[єю]\S*|во[юе]т\S*|хрустить|хрустит|гріє\S*|греет\S*|дими\S*|дымит\S*)${__T[7]}(?:маточин\S*|ступиц\S*|підшипник\S*|подшипник\S*)|${__RX[7]}${__T[2]}(?<!(?:гальмівн|тормозн)\S*\s+)(?:колісн\S*\s+)?диск\S*(?:\s+колес\S*)?${__T[7]}(?:трісну\S*|тресну\S*|трісн\S*|лопну\S*|погну\S*)${__RX[7]}|${__RX[7]}${__T[2]}не\s+(?:вистачає|хватает)\s+${__T[8]}(?:гайк|гайок|болт)\S*${__T[7]}(?:на\s+)?(?:колес|диск)\S*${__RX[7]}|${__RX[7]}${__T[2]}(?:на\s+)?колес\S*\s+не\s+(?:вистачає|хватает)${__T[7]}(?:гайк|гайок|болт)\S*${__RX[7]}|(?:${__T[1]}(?:radmutter-?(?:anzeiger|indikator)\S*|checkpoint(?:-?anzeiger)?\S*|radmutter-?kappen?)\s+${__T[8]}(?:verdreht|verstellt|gedreht|schief|verrutscht))${__RX[71]}|(?:${__T[5]}wheel\s+nut\s+indicators?\s+${__T[8]}(?:moved|turned|rotated|misaligned|out\s+of\s+line))${__RX[71]}|(?:${__T[2]}(?:бракує|немає|нема|відсутн\S*|нет|отсутству\S*)${__T[7]}(?:(?:колісн\S*|колесн\S*)\s+гайк\S*|(?:гайк|гайок|болт)\S*\s+(?:на\s+)?колес\S*)|${__T[2]}(?:відкрут|открут|розкрут|раскрут)\S*${__T[7]}(?:(?:колісн|колесн)\S*\s+(?:гайк|гайок|болт)\S*|(?:гайк|гайок|болт)\S*\s+(?:на\s+)?колес\S*)|${__T[2]}індикатор\S*${__T[7]}гайок${__T[7]}(?:зміст\S*|повернул\S*|збил\S*|зсун\S*))${__RX[71]}`, 'i', 1);
const TOLL_HINT = lbRx(String.raw`${__T[1]}(?:maut[\s-]?ger(?:ä|ae|a)t|mautbox|maut[- ]box|maut-obu|obu|on-?board-?unit|toll\s*collect(?:-?box|-?ger(?:ä|ae|a)t)?|go-?box)(?:e|en|s|es)?\s+${__T[9]}(?:defekt|kaputt|ausgefallen${__T[27]}zeigt${__T[7]}(?:rot|fehler\S*|st(?:ö|oe|o)rung)|leuchtet\s+rot|blinkt\s+rot|rot${__T[0]}|fehler\S*|st(?:ö|oe|o)rung|piept|bleibt\s+dunkel|dunkel${__T[0]}|aus${__T[0]}|tot${__T[0]}|fehlt|weg${__T[0]}|abgefallen|reagiert\s+nicht|bucht\s+nicht|startet\s+nicht)|${__T[3]}(?:mautst(?:ö|oe|o)rung|mautfehler)|${__T[3]}maut\s+${__T[8]}nicht\s+(?:ab)?gebucht|${__T[3]}(?:kein|keine)\s+maut${__T[7]}gebucht${__T[39]}toll\s+(?:box|unit|device|obu)|obu|on-?board\s+unit)s?\s+${__T[9]}(?:not\s+working|doesn['’]?t\s+work|isn['’]?t\s+working|broken|faulty|failed|dead|error|red(?![a-z])|beeping|missing|off(?![a-z])|won['’]?t\s+(?:book|switch\s+on|start))|(?<![a-z])toll${__T[7]}(?:not\s+booked|error)${__T[24]}obu\s+${__T[8]}(?:${__T[43]}${__T[30]}несправн\S*|неисправ\S*|червон\S*|красн\S*|помилк\S*|ошибк\S*|пищ\S*|пікає|вимкн\S*|выключ\S*|нема\S*${__T[37]}\S*)|${__T[4]}(?:пристр\S*|блок\S*|коробк\S*|устройств\S*|бокс\S*)${__T[7]}(?:мит\S*|оплат\S*\s+(?:дорог|проїзд|проезд)\S*|сплат\S*\s+мит\S*)\s+${__T[8]}(?:${__T[43]}${__T[30]}несправн\S*|неисправ\S*|червон\S*|красн\S*|помилк\S*|ошибк\S*|пищ\S*|пікає|вимкн\S*|выключ\S*|нема\S*${__T[37]}\S*)|${__T[4]}(?:бортов\S*\s+(?:пристр|блок|устройств)\S*|толл?\s*колл?ект\S*|toll\s*collect\S*)\s+${__T[8]}(?:${__T[43]}${__T[30]}несправн\S*|неисправ\S*|червон\S*|красн\S*|помилк\S*|ошибк\S*|пищ\S*|пікає|вимкн\S*|выключ\S*|нема\S*${__T[37]}\S*)`, 'i', 1);


const TICKET_HINT = lbRx(String.raw`${__T[1]}(?:straf|bu(?:ß|ss)geld|verwarnungs?(?:geld)?|verwarngeld)-?zettel(?:n)?${__T[0]}|${__T[1]}kn(?:ö|oe)llchen${__T[0]}|${__T[1]}(?:verwarnungsgeld(?:es)?|verwarngeld(?:es)?|parkverst(?:o|ö|oe)(?:ß|ss)(?:es|e)?|bu(?:ß|ss)geldbescheid(?:e|es)?|anh(?:ö|oe)rungsbogen|radarfalle|blitzerfoto)${__T[0]}|${__T[1]}geblitzt${__T[0]}|${__T[1]}(?:vom|im|in\s+(?:den|einen))\s+blitzer${__T[0]}|${__T[5]}(?:parking\s+(?:ticket|fine|notice|charge)s?|penalty\s+(?:charge\s+)?(?:notice|ticket)s?|speeding\s+(?:ticket|fine)s?|(?:traffic|police)\s+(?:ticket|fine)s?|speed\s+cameras?|(?:caught|flashed)\s+(?:by|on)\s+(?:a\s+)?(?:speed\s+)?camera)(?![a-z])|${__T[2]}штраф\S*|${__T[2]}камер\S*\s+(?:контролю\s+|контроля\s+)?(?:швидкост\S*|скорост\S*)|${__T[2]}(?:спрацювал\S*|сработал\S*)${__T[7]}(?:камер\S*|радар\S*)`, 'i', 1);


const TICKET_WORDS = /(?:straf|bu(?:ß|ss)geld|verwarnungs?(?:geld)?|verwarngeld)-?zettel\S*|kn(?:ö|oe)llchen|verwarnungsgeld\S*|parking\s+(?:ticket|fine|notice|charge)s?|penalty\s+(?:charge\s+)?(?:notice|ticket)s?|штраф\S*/i;
const TICKET_GLASS_DMG = /steinschlag|riss|gerissen|gesprungen|sprung|stern|kaputt|gebrochen|eingeschlagen|besch(?:ä|ae)digt|crack|chip|broken|smashed|damaged|тріс|трещ|скол|розбит|разбит|пошкодж/i;
const noTicket = (s) => { const v = String(s || ''); if (!TICKET_WORDS.test(v) || TICKET_GLASS_DMG.test(v)) return v; return v.replace(/(?:windschutzscheibe|frontscheibe|scheibenwischer|scheibe|windscreen|windshield|wipers?|лобов\S*(?:\s+скл\S*)?)/gi, ' '); };


const WSOBJ_SPANS = lbRx(String.raw`${__T[3]}(?:navi(?:gationsger(?:ä|ae)t)?|navi-?halterung|handy-?halter(?:ung)?|halterung|halter|saugnapf|dashcam|kamera|sonnenblende|sonnenschutz|vignette|maut-?plakette|gardinen?|vorh(?:ä|ae)nge|vorhang|rollo|thermomatte)\S*\s+${__T[9]}(?:an|vor|hinter|auf)\s+(?:der|die|dem|den)\s+(?:windschutz|front)scheibe${__T[0]}${__T[39]}sat-?nav|phone\s+(?:holder|mount)|mount|holder|suction\s+cup|dash\s*cam|sun\s*visor|curtains?|vignette)\s+${__T[9]}(?:on|at|in\s+front\s+of|behind)\s+the\s+(?:windscreen|windshield)(?![a-z])|${__T[2]}(?:тримач\S*|кріплен\S*|присоск\S*|навігатор\S*|відеореєстратор\S*|козир\S*|штор\S*|віньєтк\S*)\s+${__T[9]}на\s+лобов\S*\s+скл\S*`, 'gi');
const noWsObj = (s) => String(s || '').replace(WSOBJ_SPANS, ' ');





const CLIMATE_HINT = lbRx(String.raw`${__T[5]}(?:aircon|air\s*con|a\/c|night\s+heater|parking\s+heater|cab\s+heater|heater)\s+(?:(?:has|have|just|completely)\s+){0,2}(?:packed\s+(?:in|up)|gave\s+up|given\s+up|blowing\s+cold)(?![a-z])${__RX[18]}|${__T[1]}(?:standheizung|standklima(?:anlage)?|standk(?:ü|ue|u)hlung|parkk(?:ü|ue|u)hlung|klimaanlage|klimaautomatik|klimakompressor|klima(?![a-zäöüß-])|dieselheizung|luftheizung|webasto|eberspächer|eberspaecher)(?:en|s)?${__T[0]}\s+${__T[9]}(?:ausgefallen|f(?:ä|ae|a)llt\s+aus|geht\s+${__T[9]}(?:nicht|aus)${__T[0]}|riecht${__T[7]}(?:muffig|modrig|komisch|unangenehm|schlecht)|tropft(?!\s+nicht)|funktioniert\s+nicht|defekt|kaputt|startet\s+nicht|springt\s+nicht\s+an|springt\s+(?:nur\s+)?(?:schlecht|schwer)\s+an|l(?:ä|ae|a)sst\s+sich\s+${__T[13]}(?:starten|einschalten|anschalten)|heizt\s+nicht|k(?:ü|ue|u)hlt\s+nicht|wird\s+${__T[13]}(?:warm|kalt|k(?:ü|ue|u)hl)|bleibt\s+(?:kalt|warm|aus)|bl(?:ä|ae|a)st\s+(?:nur\s+)?(?:nicht|warm|kalt)|zeigt${__T[7]}(?:fehler\S*|st(?:ö|oe|o)rung)|fehler\S*|st(?:ö|oe|o)rung|qualmt|raucht|stinkt|piept|blinkt|schaltet\s+(?:sich\s+)?(?:\S+\s+)?ab|reagiert\s+nicht)|${__T[5]}(?:(?:parking|night|cab|auxiliary|diesel|bunk)\s+(?:heater|heating|cooler|air\s*con(?:ditioning|ditioner)?)|webasto|eberspächer|eberspaecher|air\s*con(?:ditioning|ditioner)?|aircon|a\/c|ac|climate\s+control)(?![a-z])\s+${__T[9]}(?:not\s+(?:working|heating|cooling|starting)|doesn['’]?t\s+(?:work|heat|cool|start)|does\s+not\s+(?:work|heat|cool|start)|will\s+not\s+(?:start|turn\s+on|switch\s+on|work)|isn['’]?t\s+(?:working|heating|cooling)|won['’]?t\s+(?:start|turn\s+on|switch\s+on|work)|broken|faulty|failed|dead|error|fault(?![a-z])|blowing\s+(?:warm|hot|cold)|smoking|stopped\s+working|keeps\s+(?:cutting|switching)\s+(?:out|off)|cuts\s+(?:out|off)|switches\s+(?:itself\s+)?off\s+by\s+itself)${__RX[45]}|${__T[4]}(?:кондиц\S*|кондиціон\S*|конде[йяюєї]${__T[6]}|кондер[аиуі]?${__T[6]}|автономк\S*|вебаст[оаиуеі]?|webasto|(?:автономн\S*|стоянков\S*|додатков\S*|дополнительн\S*)\s+(?:обігрівач\S*|опаленн\S*|отоплен\S*|отопител\S*|пічк\S*|печк\S*))\s+${__T[8]}(?:${__T[43]}|злама[внл]\S*${__T[17]}несправн\S*|неисправ\S*|не\s+гріє|не\s+греє|не\s+греет|не\s+ду(?:ет|є|е)|не\s+дме|не\s+охолоджу\S*|не\s+холод\S*|не\s+охлажда\S*|не\s+морози\S*|не\s+моро[зж]\S*|не\s+запуска\S*|не\s+заводит\S*|не\s+вмика\S*|не\s+включа\S*|вимика[а-яіїєґ]*ся|відключа[а-яіїєґ]*ся|отключа[а-яё]*ся|выключа[а-яё]*ся|помилк\S*|ошибк\S*|дими\S*|дымит\S*|вийшов\s+з\s+ладу|вышел\s+из\s+строя)(?![^.;!?]*(?:відремонт\S*|замінил\S*|замінен\S*${__T[29]}поменял\S*|помінял\S*|полагодил\S*|починил\S*|заправил\S*${__T[22]}|${__RX[7]}${__T[5]}(?:air\s*-?con(?:ditioning)?|a\/c|aircon)\s+${__T[8]}(?:smell\S*|stink\S*)(?![a-z])${__RX[7]}|${__RX[7]}${__T[2]}кондиціонер\S*${__T[7]}(?:смерд\S*|воня\S*|тхне)|${__T[2]}кондиционер\S*${__T[7]}(?:воня\S*|смерд\S*)${__RX[7]}|${__RX[7]}${__T[5]}(?:air\s*con|a\/c|aircon|air\s+conditioning)${__T[7]}(?:not|isn['’]?t|no\s+longer)${__T[7]}(?:cold|cool|cooling)(?![a-z])${__RX[7]}|${__T[1]}(?:l(?:ü|ue)ftung|gebl(?:ä|ae)se|klimaanlage|klima)${__T[7]}(?:riecht|stinkt|m(?:ü|ue)ffelt)${__T[7]}(?:muffig|modrig|faulig|nach\s+(?:schimmel|moder|keller))${__T[0]}${__RX[60]}|${__T[5]}(?:vents?|ventilation|blower|air\s+vents?)${__T[7]}(?:smell\S*|stink\S*)${__T[7]}(?:musty|mouldy|moldy|damp|of\s+mou?ld)(?![a-z])${__RX[60]}`, 'i', 1);
const CLIMATE2_HINT = lbRx(String.raw`(?:${__T[1]}(?:klima(?:anlage)?|gebl(?:ä|ae)se|l(?:ü|ue)ftung)\s+${__T[8]}(?:macht|bl(?:ä|ae)st|pustet|gibt|kommt)\s+(?:nur\s+(?:noch\s+)?)?(?:warme|hei(?:ß|ss)e|keine\s+kalte)\s+luft|${__T[1]}(?:aus\s+der\s+)?(?:l(?:ü|ue)ftung(?:sd(?:ü|ue)sen)?|klima(?:anlage)?|gebl(?:ä|ae)se|d(?:ü|ue)sen)\s+${__T[8]}(?:gestank|stinkt|stinken|m(?:ü|ue)ffelt|muffig|riecht${__T[7]}(?:muffig|modrig|faul|schimmelig|eklig))${__T[0]}|${__T[1]}(?:heizung|klima(?:anlage)?|gebl(?:ä|ae)se)\s+(?:l(?:ä|ae)sst\s+sich${__T[7]}nicht(?:\s+mehr)?\s+(?:ab|aus)?(?:schalten|einstellen|regeln|verstellen|runterdrehen|herunterregeln)|(?:geht|schaltet)${__T[7]}${__T[13]}aus|bl(?:ä|ae)st\s+(?:nur\s+(?:noch\s+)?|immer\s+|dauernd\s+)hei(?:ß|ss))${__T[0]}|${__T[1]}(?:klima|heizungs?|l(?:ü|ue)ftungs)?(?:bedienteil|bedienfeld|steuerger(?:ä|ae)t|display)\s+(?:der\s+klima\S*\s+|der\s+heizung\s+)?(?:\S+\s+)?(?:ausgefallen|kaputt|defekt|dunkel|tot|geht\s+nicht|reagiert\s+nicht)${__T[0]}(?<=(?:klima|heizung|l(?:ü|ue)ftung)\S*\s+(?:\S+\s+){0,3}\S+)|${__T[1]}(?:temperaturregler|temperaturregelung|klimasteuerung|klimaregelung)${__T[7]}(?:ausgefallen|kaputt|defekt|geht\s+nicht|reagiert\s+nicht|spinnt)${__T[0]}|${__T[1]}(?:umluft|l(?:ü|ue)ftungs|heizungs|luft|frischluft|mischluft)[\s-]?klappen?${__T[7]}(?:klemmt|klemmen|klappert|klappern|h(?:ä|ae)ngt|kaputt|defekt|geht\s+nicht|bewegt\s+sich\s+nicht)${__T[0]}|${__T[1]}klima(?:anlagen)?[\s-]?kompressor${__T[7]}(?:quietscht|kreischt|klackert|rattert|macht${__T[7]}ger(?:ä|ae)usch\S*|laut|kaputt|defekt|f(?:ä|ae)llt\s+aus|ausgefallen)${__T[0]}|${__T[5]}(?:climate\s+control|a\/?c|air\s+con)\s+(?:panel\s+|unit\s+|controls?\s+)?(?:is\s+)?(?:dead|broken|blank|not\s+responding)(?![a-z])|${__T[5]}(?:vents?|a\/?c|air\s+con)${__T[7]}(?:smell\S*|stink\S*|musty)(?![a-z])|${__T[5]}(?:a\/?c|air\s+con)\s+compressor${__T[7]}(?:noisy|squeal\S*|rattl\S*|making${__T[7]}noise|failed|broken)(?![a-z])|${__T[5]}heater\s+(?:is\s+)?(?:stuck\s+on\s+(?:hot|full)|won['’]?t\s+(?:turn|switch)\s+off|only\s+blows\s+hot)(?![a-z])|${__T[2]}заслонк\S*\s+(?:печк\S*|пічк\S*|отоплен\S*|обігрів\S*)${__T[7]}(?:не\s+(?:переключа\S*|перемика\S*|двига\S*|руха\S*|работа\S*|працю\S*)|заклини\S*|застря\S*${__T[17]}злама\S*)|${__T[2]}(?:кондиціонер|кондиционер|кондьор|кондей)${__T[7]}(?:дме|дує|дуе|дует|гонить|гонит|жене|дає|дает)${__T[7]}(?:тепл\S*|гаряч\S*|горяч\S*))${__RX[72]}`, 'i', 1);

const HEAT_HINT = lbRx(String.raw`(?:${__T[3]}(?:fahrerhaus|kabinen|front|scheiben|heizungs)?(?:heizung|gebl(?:ä|ae)se|l(?:ü|ue)ftung)${__T[0]}\s+${__T[8]}(?:(?:macht|gibt|bl(?:ä|ae)st|pustet|bringt)\s+(?:nur\s+(?:noch\s+)?)?kalte\s+luft|(?:geht|l(?:ä|ae)uft|funktioniert|dreht\s+sich)\s+(?:gar|(?:ü|ue)berhaupt)\s+nicht)${__T[0]}|${__T[3]}(?:heizung|gebl(?:ä|ae)se|l(?:ü|ue)ftung)\s+(?:ist\s+|l(?:ä|ae)uft\s+|bl(?:ä|ae)st\s+)?(?:nur\s+(?:noch\s+)?)?(?:sehr\s+|zu\s+|ganz\s+)?schwach${__T[0]}|${__T[1]}(?:kabine|fahrerhaus|f(?:ü|ue)hrerhaus)\s+${__T[8]}(?:wird\s+(?:es\s+)?${__T[13]}warm|bleibt\s+(?:eis)?kalt)${__T[0]}|${__T[1]}(?:front|windschutz)?scheiben?${__T[7]}taut\s+${__T[13]}(?:ab|auf|frei)${__T[0]}|${__T[5]}(?:heater|blower)\s+${__T[8]}(?:(?:is\s+)?(?:very\s+|too\s+|really\s+)?weak|(?:only\s+)?blows\s+(?:only\s+)?cold)(?![a-z])|${__T[5]}cab\s+${__T[38]}\s+not|isn['’]?t|is\s+not)\s+(?:warm|heat)(?:ing)?\s+up(?![a-z])|${__T[2]}вентилятор\S*\s+(?:пічк\S*|печк\S*|обігрів\S*|отоплен\S*|обдув\S*)${__T[7]}не\s+(?:крути\S*|працю\S*|работа\S*)|${__T[2]}(?:пічк\S*|печк\S*)${__T[7]}(?:дме|дує|дует|гонить|гонит|жене)${__T[7]}холодн\S*|${__T[2]}(?:пічк\S*|печк\S*)${__T[7]}(?:дме|дує|дует|гонить|гонит|жене|греет|гріє|гре[єе]|работает|працює)\s+(?:только|лише|тільки)\s+(?:в|на|у)\s+ног\S*|${__T[2]}(?:в|у)\s+(?:кабин[еі]|кабіні)\s+(?:(?!не\s)\S+\s+)?холодно${__T[6]}|${__T[2]}холодно\s+(?:в|у)\s+(?:кабин[еі]|кабіні)${__T[6]}|${__T[1]}(?:heizung|gebl(?:ä|ae)se)${__T[7]}(?:w(?:ä|ae)rmt|heizt|bl(?:ä|ae)st|pustet|kommt|geht)${__T[7]}nur\s+(?:(?:in\s+den|im|in\s+die)\s+)?(?:fu(?:ß|ss)raum|f(?:ü|ue)(?:ß|ss)e|unten)${__T[0]}|${__T[1]}(?:im\s+fahrerhaus|in\s+der\s+kabine|im\s+f(?:ü|ue)hrerhaus)\s+(?:ist\s+(?:es\s+)?)?(?:sehr\s+|zu\s+|so\s+|eis)?kalt${__T[0]})${__T[10]}${__T[42]}|normal)${__T[23]}sorted|working\s+again|no\s+longer${__T[11]}заменил\S*|полагодил\S*|починил\S*|поменял\S*|помінял\S*${__T[22]}`, 'i', 1);
const CLIMATE3_HINT = lbRx(String.raw`(?:${__T[1]}(?:standheizung|standklima(?:anlage)?|dieselheizung|luftheizung|webasto|eberspächer|eberspaecher)\s+${__T[8]}(?:geht|schaltet)\s+(?:sich\s+)?(?:\S+\s+){0,5}?(?:wieder\s+)?(?:aus|ab)${__T[0]}|${__T[5]}(?:(?:parking|night|diesel|bunk)\s+(?:heater|cooler)|webasto|eberspächer)${__T[7]}(?:keeps|kept)\s+(?:shutting|turning|cutting|switching)\s+(?:off|out|down)(?![a-z])|${__T[2]}(?:автономк\S*|вебаст\S*)\s+${__T[8]}(?:вимика\S*|відключа\S*|выключа\S*|отключа\S*|тухне|тухнет|глухне|глохне|глохнет))${__RX[72]}`, 'i', 1);




const WINDOW_HINT = lbRx(String.raw`${__T[1]}(?:fensterheber(?:motor|schalter)?|elektrische[nrs]?\s+fensterheber)(?:n|s)?${__T[0]}\s+${__T[9]}(?:ausgefallen|f(?:ä|ae|a)llt\s+aus${__T[27]}defekt|kaputt|klemmt|hakt|ruckelt|h(?:ä|ae|a)ngt|reagiert\s+nicht|ger(?:ä|ae|a)usch\S*|knackt|rattert|abgebrochen|gerissen|(?:sehr\s+|zu\s+|extrem\s+|ganz\s+|nur\s+noch\s+|nur\s+)?langsam${__T[0]}|bleibt${__T[7]}(?:stehen|h(?:ä|ae|a)ngen))|${__T[1]}(?:seiten|fahrer|beifahrer|t(?:ü|ue|u)r|schiebe|kabinen|fahrerhaus)?(?:fenster|scheibe)(?:n)?${__T[0]}\s+${__T[9]}(?:klemm(?:t|en)${__T[0]}|hakt${__T[0]}|(?:geht|gehen|f(?:ä|ae|a)hrt|fahren|l(?:ä|ae|a)uft|laufen|kommt|schlie(?:ß|ss)t)\s+${__T[8]}langsam${__T[0]}|(?:geht|gehen|f(?:ä|ae|a)hrt|fahren|l(?:ä|ae|a)sst\s+sich|lassen\s+sich|kommt|kommen)${__T[7]}nicht\s+(?:mehr\s+|richtig\s+|ganz\s+)?(?:zu|hoch|rauf|nach\s+oben|runter|herunter|nach\s+unten|auf|schlie(?:ß|ss)en|(?:ö|oe|o)ffnen)${__T[0]}|(?:schlie(?:ß|ss)t|schlie(?:ß|ss)en)${__T[7]}nicht${__T[0]}|bleibt${__T[7]}(?:offen|unten|halb\s+offen|einen\s+spalt\s+offen)|bleiben${__T[7]}(?:offen|unten)|rutscht${__T[7]}(?:runter|herunter|nach\s+unten|ab)|rutschen${__T[7]}(?:runter|herunter|nach\s+unten)|ist\s+aus\s+der\s+f(?:ü|ue|u)hrung|aus\s+der\s+f(?:ü|ue|u)hrung\s+gesprungen|in\s+die\s+t(?:ü|ue|u)r\s+gefallen)|${__T[5]}(?:(?:power|electric|side|driver['’]?s?|passenger['’]?s?|cab|door)\s+)?window(?:\s+(?:regulator|motor|switch|winder))?s?(?![a-z])\s+${__T[9]}${__T[38]}\s+not|will\s+not|can['’]?t|cannot|isn['’]?t|is\s+not)${__T[7]}(?:close|closing|shut|go(?:ing)?\s+(?:up|down)|wind\s+(?:up|down)|open|work|working)|${__T[5]}window\S*\s+${__T[8]}(?:stuck\s+(?:open|down|half)|(?:goes|going|moves?|moving|winds?|winding|closes|closing|opens|opening)\s+(?:up\s+|down\s+)?(?:very\s+|really\s+|too\s+)?slow(?:ly)?(?![a-z])|(?:is\s+|are\s+)?(?:very\s+|really\s+|too\s+)?(?:slow|sluggish)(?=\s*(?:$|[.,;!?]|to\s+(?:close|open|go)))|keeps\s+(?:sliding|dropping|falling)\s+down|(?:slid|dropped|fell)\s+(?:down\s+)?into\s+the\s+door)|${__T[5]}(?:window\s+(?:regulator|motor|switch|winder)|power\s+window)s?\s+${__T[8]}(?:broken|faulty|failed|dead|not\s+working|stuck|slow|sluggish|jerky)|${__T[4]}(?:склопідйомник\S*|стеклопод(?:ъ|ь)[её]мник\S*)\s+${__T[8]}(?:${__T[43]}|злама[внл]\S*${__T[17]}несправн\S*|неисправ\S*|заклин\S*|заїда\S*|заеда\S*|повільн\S*|медленн\S*|туго)|${__T[4]}(?:вікн\S*|бічн\S*\s+скл\S*|скло|склом|стекло|окн\S*|окошк\S*)\s+${__T[8]}(?:не\s+закрива\S*|не\s+закрыва\S*|не\s+підніма\S*|не\s+зачиня\S*|не\s+піднима\S*|не\s+поднима\S*|не\s+опуска\S*|застряг\S*|застрял\S*|залишається\s+відкрит\S*|остается\s+открыт\S*|оста[её]тся\s+открыт\S*|сповза\S*|сполза\S*|(?:дуже\s+|очень\s+)?(?:повільно|медленно)\s+(?:підніма|опуска|закрива|зачиня|поднима|закрыва)\S*|заїда\S*|заеда\S*)|${__T[5]}(?:(?:power|electric|driver['’]?s?|passenger['’]?s?)\s+)windows?\s+${__T[8]}(?:stuck|jammed|seized)(?![a-z])${__RX[48]}`, 'i', 1);



const WINDOW2_HINT = lbRx(String.raw`(?:${__T[1]}(?:(?:fahrer|beifahrer|seiten)?fenster|(?:fahrer|beifahrer|seiten)scheibe)${__T[0]}\s+${__T[8]}(?:runtergefallen|runtergerutscht|heruntergefallen|abgesackt|(?:ist\s+)?(?:in\s+die|in\s+der)\s+t(?:ü|ue)r\s+(?:gefallen|gerutscht|verschwunden))${__T[0]}|${__T[1]}(?:(?:fahrer|beifahrer|seiten)?fenster|(?:fahrer|beifahrer|seiten)scheibe)${__T[0]}\s+(?:f(?:ä|ae)hrt|geht|rutscht|l(?:ä|ae)uft)${__T[7]}(?:von\s+alleine?|von\s+selbst|einfach|immer\s+wieder|st(?:ä|ae)ndig)${__T[7]}(?:runter|herunter|auf|nach\s+unten)${__T[0]}|${__T[1]}(?:(?:fahrer|beifahrer|seiten)?fenster|(?:fahrer|beifahrer|seiten)scheibe)${__T[0]}\s+(?:geht|f(?:ä|ae)hrt|schlie(?:ß|ss)t)${__T[7]}(?:nur\s+(?:noch\s+)?(?:halb|zur\s+h(?:ä|ae)lfte|ein\s+st(?:ü|ue)ck|bis\s+zur\s+h(?:ä|ae)lfte))${__T[0]}|${__T[1]}fenster[-\s]?(?:schalter|taster|knopf|knöpfe|kn(?:oe)pfe)\s+${__T[8]}(?:geht\s+nicht|funktioniert\s+nicht|reagiert\s+nicht|defekt|kaputt|ohne\s+funktion|abgebrochen|klemmt)${__T[0]}|${__T[5]}(?:electric|power)\s+windows?\s+${__T[8]}(?:broken|broke|faulty|dead|not\s+working|isn['’]?t\s+working|doesn['’]?t\s+work|stopped\s+working|failed)(?![a-z])|${__T[5]}(?:(?:driver['’]?s?|passenger['’]?s?|side)\s+)?window\s+(?:is\s+|keeps\s+)?(?:not\s+(?:going|coming|winding|rolling)\s+(?:down|up)|won['’]?t\s+(?:go|wind|roll|come)\s+(?:down|up)|(?:goes|going|slides|sliding|drops|dropping)\s+down\s+by\s+itself|only\s+(?:goes|opens|closes)\s+half(?:way)?)(?![a-z])|${__T[2]}(?:вікно|скло|окно|стекло)${__T[7]}(?:впало|впало|упало|провалилось|провалилося|сповзло|сползло)${__T[7]}(?:в|у)\s+(?:двері|дверь|двер\S*))${__T[10]}${__T[42]})${__T[23]}working\s+again${__T[12]}замінив\S*|полагодил\S*${__T[29]}починил\S*))`, 'i', 1);


const WINDOW3_HINT = lbRx(String.raw`(?<!${__T[2]}(?:офис|офіс|туалет|склад[еуі]?${__T[6]}|цех|здани|будівл|душев|ванн|квартир|приложени|програм|додат|телефон|планшет|сайт|браузер)[^.;!?]*)${__RX[39]}${__RX[40]}(?:${__T[2]}(?:склопідіймач\S*|склопідіймальн\S*|склопідйомник\S*|стеклопод[ъь][её]мник\S*)\s+${__T[8]}(?:не\s+(?:працю|работа|реагу|реагиру)\S*|злама\S*${__T[17]}несправн\S*|неисправ\S*|заклин\S*|заїда\S*|заеда\S*|повільн\S*|медленн\S*|туго|гуде\S*|гудит|трещит|тріщить|відмовив|отказал\S*)|${__T[2]}(?:вікн\S*|окн[оаеуі]|окошк\S*|бічн\S*\s+скл\S*|боков\S*\s+стекл\S*)\s+${__T[8]}не\s+(?:откры\S*|відкри\S*|відчин\S*|опуска\S*)${__T[6]})`, 'i', 1);




const FUELCAP_HINT = lbRx(String.raw`${__T[2]}лючок${__T[7]}(?:бак\S*|бензобак\S*|паливн\S*|топливн\S*|adblue|адблю)\S*${__T[7]}(?:не\s+(?:відкрива\S*|закрива\S*|открыва\S*|закрыва\S*)${__T[30]}відірва\S*|оторва\S*)${__RX[0]}|${__T[1]}(?:(?:(?:diesel|adblue|harnstoff|kraftstoff)-?)?tank(?:deckel|verschlu(?:ss|ß)|klappe|schloss)|(?:diesel|adblue|harnstoff|kraftstoff)[\s-]?deckel|deckel\s+(?:vom|von\s+dem|des|am)\s+(?:(?:diesel|adblue|harnstoff|kraftstoff)-?)?(?:tank\S*|diesel|adblue))(?:dichtung|s|es|n)?${__T[0]}\s+${__T[9]}(?:verloren|fehlt|fehlen|weg${__T[0]}|abgefallen|abgerissen|abgebrochen|kaputt|defekt|klemmt|klemmen|(?:h(?:ä|ae|a)ngt|sitzt)\s+fest|(?:geht|gehen)${__T[7]}${__T[13]}(?:auf|zu|ab|drauf|ran)${__T[0]}|(?:schlie(?:ß|ss)t|schlie(?:ß|ss)en|passt|h(?:ä|ae|a)lt|rastet|dichtet)${__T[7]}nicht${__T[0]}|l(?:ä|ae|a)sst\s+sich\s+${__T[8]}${__T[13]}(?:(?:ö|oe|o)ffnen|schlie(?:ß|ss)en|abschrauben|aufschrauben|zuschrauben|zudrehen|aufdrehen|aufmachen|zumachen|abnehmen|abschlie(?:ß|ss)en)|liegen\s+(?:ge)?lassen|vergessen|steht\s+offen|offen\s+gelassen)|${__T[1]}(?:ohne|kein(?:en)?)${__T[7]}(?:(?:(?:diesel|adblue|harnstoff|kraftstoff)-?)?tank(?:deckel|verschlu(?:ss|ß)|klappe|schloss)|(?:diesel|adblue|harnstoff|kraftstoff)[\s-]?deckel|deckel\s+(?:vom|von\s+dem|des|am)\s+(?:(?:diesel|adblue|harnstoff|kraftstoff)-?)?(?:tank\S*|diesel|adblue))${__T[0]}|${__T[5]}(?:(?:fuel|diesel|tank|adblue|def|gas|petrol)\s+(?:tank\s+)?(?:filler\s+)?(?:cap|lid|flap)s?)(?![a-z])\s+${__T[8]}(?:missing|lost|gone|stuck|jammed|broken|(?:fell|came)\s+off|left\s+${__T[8]}(?:at|behind)|${__T[38]}\s+not|will\s+not|can['’]?t|cannot)\s+(?:be\s+)?(?:open|opened|close|closed|shut|lock|locked|come\s+off|removed|screw\S*|fit|seal))(?![a-z])|${__T[5]}(?:lost|missing|no|without|lose)\s+(?:the\s+|a\s+|my\s+)?(?:(?:fuel|diesel|tank|adblue|def|gas|petrol)\s+(?:tank\s+)?(?:filler\s+)?(?:cap|lid|flap)s?)(?![a-z])|${__T[5]}(?:can['’]?t|cannot|unable\s+to)\s+(?:open|close|shut|remove|get\s+off|unscrew)\s+(?:the\s+)?(?:(?:fuel|diesel|tank|adblue|def|gas|petrol)\s+(?:tank\s+)?(?:filler\s+)?(?:cap|lid|flap)s?)(?![a-z])|${__T[4]}(?:(?:кришк\S*|крышк\S*|замок|замк\S*)${__T[7]}(?:бак\S*|паливн\S*|топливн\S*|adblue|адблю))\s+${__T[8]}(?:загуб\S*|втрат\S*|втрач\S*|нема\S*|відсутн\S*|потер\S*|нет(?![а-яіїєґ])|отсутств\S*|не\s+відкрива\S*|не\s+закрива\S*|не\s+открыва\S*|не\s+закрыва\S*|не\s+відкруч\S*|не\s+откруч\S*|не\s+знима\S*|застря\S*|заклин\S*|злама[внл]\S*${__T[17]}відпал\S*|отпал\S*|залиши\S*|забу\S*|остави\S*)|${__T[4]}(?:загуби\S*|втрати\S*|потерял\S*|немає|нема(?![а-яіїєґ])|нет(?![а-яіїєґ])|без)${__T[7]}(?:(?:кришк\S*|крышк\S*)${__T[7]}(?:бак\S*|паливн\S*|топливн\S*|adblue|адблю))`, 'i', 1);






const FUELCARD_HINT = lbRx(String.raw`${__T[1]}(?:(?:tank|kraftstoff|diesel|flotten|dkv|uta)-?karte(?:n)?|(?:dkv|uta)\s+karte(?:n)?)${__T[0]}\s+${__T[9]}(?:verloren|weg${__T[0]}|fehlt|gestohlen|geklaut|abhanden\s+gekommen|${__T[13]}(?:da|auffindbar|zu\s+finden)${__T[0]}|gesperrt|abgelehnt|funktioniert\s+nicht|geht\s+nicht|wird${__T[7]}nicht\s+(?:angenommen|gelesen|akzeptiert|erkannt)|defekt|kaputt|gebrochen|abgelaufen|liegen\s+(?:ge)?lassen|vergessen)|${__T[1]}pin\s+${__T[8]}(?:(?:tank|kraftstoff|diesel|flotten|dkv|uta)-?karte(?:n)?|(?:dkv|uta)\s+karte(?:n)?)${__T[0]}${__T[7]}(?:vergessen|falsch|gesperrt)|${__T[5]}(?:(?:fuel|diesel|petrol|gas|fleet|dkv|uta)\s+cards?)(?![a-z])\s+${__T[8]}(?:lost|missing|stolen|gone|declined|rejected|blocked|expired|broken|not\s+working|not\s+(?:going|getting)\s+through|not\s+accepted|(?:doesn['’]?t|won['’]?t|isn['’]?t|does\s+not|will\s+not|is\s+not)\s+(?:work|working|accepted|read|go\s+through|going\s+through)|left\s+${__T[8]}(?:at|behind))(?![a-z])|${__T[5]}(?:lost|stole|missing|forgot|forgotten|left)\s+(?:the\s+|my\s+|a\s+|our\s+)?(?:(?:fuel|diesel|petrol|gas|fleet|dkv|uta)\s+cards?)(?![a-z])|${__T[4]}(?:(?:паливн\S*|топливн\S*|заправн\S*|заправочн\S*)\s+карт\S*|карт\S*\s+(?:dkv|uta)${__T[24]}(?:dkv|uta)\s+карт\S*)\s+${__T[8]}(?:загуб\S*|втрат\S*|втрач\S*|вкра\S*|украл\S*|украд\S*|потер\S*|заблок\S*${__T[15]}не\s+прийма\S*|не\s+принима\S*|не\s+чита\S*|не\s+проход\S*|не\s+пройшл\S*|не\s+прошл\S*|відхил\S*|отклон\S*|нема\S*|нет(?![а-яіїєґ])|забу\S*|залиши\S*|остави\S*)|${__T[4]}(?:загуби\S*|втрати\S*|потерял\S*|вкрали|украли|забу\S*|залиши\S*|остави\S*)${__T[7]}(?:(?:паливн\S*|топливн\S*|заправн\S*|заправочн\S*)\s+карт\S*|карт\S*\s+(?:dkv|uta)${__T[24]}(?:dkv|uta)\s+карт\S*)|${__T[4]}карт\S*${__T[7]}(?:на|при)\s+(?:заправц\S*|заправк\S*|АЗС)${__T[7]}(?:не\s+проход\S*|не\s+прийма\S*|не\s+принима\S*|відхил\S*|отклон\S*|заблок\S*)|${__T[4]}(?:не\s+приймають|не\s+принимают|відхилили|отклонили)${__T[7]}карт\S*\s+(?:на|при)\s+(?:заправц\S*|заправк\S*|АЗС)|${__T[4]}карт\S*\s+(?:не\s+прийма\S*|не\s+принима\S*|не\s+проход\S*|відхил\S*|отклон\S*)${__T[7]}(?:на|при)\s+(?:заправц\S*|заправк\S*|АЗС)`, 'i', 1);



const FUELCARD2_HINT = lbRx(String.raw`(?![^.;!?]*(?:geht\s+wieder${__T[26]}in\s+ordnung|frei|entsperrt)|entsperrt|neue\s+karte\s+(?:bekommen|erhalten|ist\s+da)|works\s+again|working\s+again|unblocked|sorted|знову\s+працю\S*|снова\s+работа\S*|розблок\S*|разблок\S*))(?:${__T[1]}(?:(?:tank|kraftstoff|diesel|flotten|dkv|uta)-?karte|(?:dkv|uta)\s+karte)${__T[0]}\s+(?:[^\s.,;!?]+\s+){0,2}?pin(?:[\s-]?(?:nummer|code))?\s+(?:(?:ist|wird|war|geht|immer|schon|auch)\s+){0,2}(?:falsch|gesperrt|vergessen|abgelehnt|ung(?:ü|ue)ltig|nicht\s+(?:angenommen|akzeptiert|bekannt|richtig)|nicht)${__T[0]}|${__T[1]}(?<!(?:ec|bank|kredit|giro|privat|visa|eigene|meine)\s)karte\s+(?:[^\s.,;!?]+\s+){0,1}?(?:an|bei|in)\s+(?:der|einer)\s+(?:tanke|tankstelle|zapfs(?:ä|ae)ule|s(?:ä|ae)ule|autohof)\s+(?:(?:wird|wurde|ist|war|immer|schon|wieder)\s+){0,2}(?:abgelehnt|gesperrt|nicht\s+(?:angenommen|akzeptiert|gelesen)|geht\s+nicht|funktioniert\s+nicht)${__T[0]}|${__T[1]}(?:an|bei|in)\s+(?:der|einer)\s+(?:tanke|tankstelle|zapfs(?:ä|ae)ule|s(?:ä|ae)ule|autohof)\s+(?:(?:die|meine|unsere)\s+)?(?<!(?:ec|bank|kredit|giro|privat|visa|eigene|meine)\s)karte\s+(?:(?:wird|wurde|ist|war|immer|schon|wieder)\s+){0,2}(?:abgelehnt|gesperrt|nicht\s+(?:angenommen|akzeptiert|gelesen)|geht\s+nicht|funktioniert\s+nicht)${__T[0]}|${__T[1]}kann\s+nicht\s+tanken\s+(?:(?:weil|da|die)\s+){0,2}karte\s+(?:(?:wird|ist|geht)\s+)?(?:abgelehnt|gesperrt|nicht\s+(?:angenommen|akzeptiert|gelesen)|geht\s+nicht|nicht|funktioniert\s+nicht)${__T[0]}|${__T[1]}(?<!(?:ec|bank|kredit|giro|privat|visa|eigene|meine)\s)karte\s+(?:wird\s+)?(?:abgelehnt|geht\s+nicht|gesperrt|funktioniert\s+nicht)\s+(?:(?:und|ich|deshalb|daher|also)\s+){0,2}kann\s+(?:ich\s+)?nicht\s+tanken${__T[0]}|${__T[5]}(?:fuel|diesel|fleet)\s+cards?\s+(?:[^\s.,;!?]+\s+){0,1}?pin\s+(?:(?:is|was|keeps)\s+)?(?:wrong|incorrect|rejected|blocked|locked|forgotten)(?![a-z])|${__T[5]}(?<!(?:bank|credit|debit|my\s+own|private)\s)card\s+(?:was\s+|got\s+|is\s+|keeps\s+getting\s+)?(?:declined|rejected|refused|not\s+accepted)\s+at\s+the\s+(?:fuel\s+station|petrol\s+station|gas\s+station|pump|truck\s+stop)(?![a-z])|${__T[5]}(?:can['’]?t|cannot|unable\s+to)\s+(?:re)?fuel\s+(?:(?:because|as|the|my)\s+){0,2}card\s+(?:is\s+|was\s+)?(?:declined|rejected|blocked|not\s+working)(?![a-z]))`, 'i', 1);






const UNDERRUN_HINT = lbRx(String.raw`${__T[1]}(?:(?:auflieger|anh(?:ä|ae)nger)sto(?:ß|ss)stange|sto(?:ß|ss)stange\s+${__T[8]}(?:am|vom|des|hinten\s+am)\s+${__T[16]}trailer)s?)${__T[0]}\s+${__T[8]}(?:verbogen|abgerissen|abgefahren|lose|locker|kaputt|besch(?:ä|ae)digt|eingedr(?:ü|ue)ckt|gebrochen|h(?:ä|ae)ngt)${__RX[73]}|${__T[5]}(?:trailer|rear)\s+bumper\s+(?:(?:is|was|got|has\s+been|been)\s+){0,2}(?:bent|damaged|hanging|loose|broken|ripped\s+off|torn\s+off|missing|smashed|dented)(?![a-z])${__RX[73]}|${__T[4]}(?:бампер\S*${__T[7]}(?:причеп\S*|причіп\S*|напівпричеп\S*|прицеп\S*|полуприцеп\S*)|задн\S*\s+бампер\S*)${__T[7]}(?:погнут\S*|зігнут\S*|загнут\S*|відірва\S*|пошкодж\S*|зламан\S*|висить|висит|оторва\S*|согнут\S*|поврежд\S*)|${__T[1]}(?:(?:heck|front|seiten)?unterfahrschutz(?:es)?|seitenschutz(?:vorrichtung)?(?:es|en)?|seitliche[nrs]?\s+schutzvorrichtung(?:en)?|rammschutz(?:es)?)${__T[0]}\s+${__T[9]}(?:verbogen|eingedr(?:ü|ue|u)ckt|besch(?:ä|ae|a)digt|verzogen|krumm|deformiert|angefahren|abgeknickt|geknickt|gebrochen|gerissen|eingerissen|kaputt|defekt|schief|verschoben|fehlt|ist\s+weg)${__T[0]}|${__T[1]}(?:verbogene[nrs]?|eingedr(?:ü|ue|u)ckte[nrs]?|besch(?:ä|ae|a)digte[nrs]?|krumme[nrs]?)${__T[7]}(?:(?:heck|front|seiten)?unterfahrschutz(?:es)?|seitenschutz(?:vorrichtung)?(?:es|en)?|seitliche[nrs]?\s+schutzvorrichtung(?:en)?|rammschutz(?:es)?)${__T[0]}|${__T[5]}(?:(?:(?:rear|front|side)\s+)?underr(?:un|ide)\s+(?:bar|protection|guard|protector)s?|side\s+guards?|side\s+(?:impact\s+)?protection\s+(?:bar|rail)s?)(?![a-z])\s+${__T[8]}(?:bent|damaged|dented|broken|cracked|crooked|missing|pushed\s+in|knocked\s+in|deformed)(?![a-z])|${__T[5]}(?:bent|damaged|dented|broken)\s+(?:the\s+)?(?:(?:(?:rear|front|side)\s+)?underr(?:un|ide)\s+(?:bar|protection|guard|protector)s?|side\s+guards?|side\s+(?:impact\s+)?protection\s+(?:bar|rail)s?)(?![a-z])|${__T[4]}(?:(?:(?:протипідкатн|противоподкатн|противопідкатн|підкатн|подкатн|відбійн|отбойн)\S*|(?:бічн|бокова|бокової|боков)\S*\s+(?:захист\S*|защит\S*|огорож\S*|ограждени\S*))(?:\s+(?:брус\S*|балк\S*|рам\S*))?)\s+${__T[8]}(?:погну\S*|зігну\S*|согну\S*|вигну\S*|пошкоджен\S*|поврежд\S*${__T[30]}деформ\S*|вм['’]?ят\S*|відсутн\S*|нема\S*|нет(?![а-яіїєґ]))|${__T[4]}(?:погнут\S*|зігнут\S*|пошкоджен\S*|поврежд\S*|деформ\S*)${__T[7]}(?:(?:(?:протипідкатн|противоподкатн|противопідкатн|підкатн|подкатн|відбійн|отбойн)\S*|(?:бічн|бокова|бокової|боков)\S*\s+(?:захист\S*|защит\S*|огорож\S*|ограждени\S*))(?:\s+(?:брус\S*|балк\S*|рам\S*))?)|${__T[1]}(?:hintere[nrs]?\s+sto(?:ß|ss)stange|sto(?:ß|ss)stange\s+hinten)${__T[0]}\s+${__T[8]}(?:verbogen|abgerissen|abgefahren|lose|locker|kaputt|besch(?:ä|ae)digt|eingedr(?:ü|ue)ckt|gebrochen|h(?:ä|ae)ngt)${__T[0]}${__RX[73]}|${__T[2]}(?:погнул\S*|погнув|согнул\S*|оторвал\S*|повредил\S*|помял\S*|зігнув|зігнул\S*|відірвав\S*|пошкодив\S*|пом['’ʼ]?яв\S*)${__T[7]}(?:задн\S*\s+бампер\S*|бампер\S*${__T[7]}(?:причеп\S*|причіп\S*|напівпричеп\S*|прицеп\S*|полуприцеп\S*))(?![^.;!?]*(?:відремонт\S*|замінил\S*|замінен\S*${__T[29]}выправил\S*|вирівнял\S*))`, 'i', 1);







const FLAT2_HINT = lbRx(String.raw`(?:${__T[1]}reifen\s+(?:ist\s+|hat\s+sich\s+)?${__T[8]}von\s+der\s+felge\s+(?:gesprungen|gerutscht|abgesprungen|runter)${__T[0]}|${__T[2]}(?<!не\s)(?:порвал\S*|разорвал\S*|розірвал\S*|розірвало|порвало|разорвало)${__T[7]}${__T[19]}|${__T[2]}${__T[19]}${__T[7]}(?<!не\s)(?:порвал\S*|разорвал\S*|розірвал\S*|розірвало|порвало|разорвало|взорвал\S*|вибухнул\S*|вибухло|бортанул\S*|сдул\S*|здул\S*|пусто[ей]|пустая|пусте|пуста|порожн\S*)${__T[6]})${__RX[74]}`, 'i', 1);


const FLAT3_HINT = lbRx(String.raw`(?:${__T[2]}(?<!не\s)(?:взорвал\S*|бахнул\S*|бахнуло|вибухнул\S*|вибухнуло|рвануло|рванул\S*|стрельнул\S*|стрельнуло)\s+(?:(?!(?:и|і|та|а|но|але)\s)\S+\s+){0,3}?${__T[19]}|${__T[2]}${__T[19]}\s+${__T[9]}(?:в|у)\s+(?:лохмот\S*|лахмітт\S*|клочья|клапт\S*|ошмет\S*)|${__T[2]}(?:с|з)\s+(?:пробит\S*|спущен\S*|лопнувш\S*|лопнул\S*|порван\S*|розірван\S*|пробитим)\s+${__T[19]}|${__T[2]}не\s+(?:могу|можу|можем|можемо|получается|виходить|выходит)${__T[7]}(?:открутить|открутити|відкрутити|снять|зняти|поменять|поміняти|замінити|заменить|скрутить|скрутити)${__T[7]}(?:колес|колiс|коліс)\S*|${__T[2]}(?:колесн\S*|колісн\S*)\s+(?:болт|гайк|гайок)\S*${__T[7]}не\s+(?:откручива\S*|откручу\S*|відкручу\S*|отворачива\S*|поддают\S*|піддают\S*|раскручива\S*|розкручу\S*)|${__T[2]}(?:болт|гайк|гайок)\S*\s+(?:на|у|в|с|з)\s+(?:колес|колiс|коліс)\S*${__T[7]}не\s+(?:откручива\S*|откручу\S*|відкручу\S*|отворачива\S*|поддают\S*|піддают\S*|раскручива\S*|розкручу\S*)|${__T[2]}не\s+(?:откручива\S*|откручу\S*|відкручу\S*|отворачива\S*|раскручива\S*|розкручу\S*)${__T[7]}(?:болт|гайк|гайок)\S*|${__T[2]}(?:выездн\S*|виїзн\S*|мобильн\S*|мобільн\S*)\s+шиномонтаж\S*|${__T[2]}шиномонтаж\S*${__T[7]}(?:на\s+(?:трас\S*|дорог\S*|автобан\S*|обочин\S*|узбіч\S*)|выезд\S*|виїзд\S*)|${__T[1]}(?:reifen|rad)\s+(?:ist\s+)?(?:\S+\s+)?(?:explodiert|in\s+fetzen|zerfetzt)${__T[0]}|${__T[1]}(?:radmutter\S*|radbolzen|radschrauben?|rad)\s+${__T[8]}(?:l(?:ä|ae|a)ss\S*\s+sich\s+nicht\s+(?:l(?:ö|oe|o)sen|abschrauben|aufdrehen|abnehmen)|geh\S*\s+nicht\s+(?:auf|ab|los))${__T[0]}|${__T[1]}(?:mobiler?\s+)?reifen(?:dienst|service|notdienst)${__T[7]}(?:gerufen|angerufen|bestellt|kommt|unterwegs|verständigt)${__T[0]}|${__T[5]}(?:tyre|tire)${__T[7]}(?:exploded|shredded|in\s+shreds)(?![a-z]))${__RX[74]}`, 'i', 1);
const TYRE4_HINT = lbRx(String.raw`(?:${__T[2]}${__T[19]}${__T[7]}(?<!не\s)(?:подспуска\S*|підспуска\S*|подтравлива\S*|не\s+накачива\S*|не\s+накачу\S*|не\s+держит\s+давлени\S*|не\s+трима\S*\s+тиск)|${__T[2]}(?:надо|нужно|треба|потрібно)${__T[7]}(?:подкачать|подкачати|підкачати|накачать|накачати)${__T[7]}${__T[19]}|${__T[1]}zisch\S*\s+${__T[8]}(?:am|aus\s+dem|im|vom)\s+(?:reifen|rad)${__T[0]}|${__T[2]}(?:шишк|шишак)\S*\s+(?:на\s+|у\s+|в\s+)?${__T[40]}\S*|${__T[2]}(?<!не\s)(?:шипит|шипить)${__T[7]}(?:воздух\s+|повітря\s+)?(?:у\s+|в\s+|из\s+|з\s+|із\s+)?${__T[40]}\S*|${__T[2]}${__T[40]}\S*${__T[7]}(?<!не\s)(?:шипит|шипить)|${__T[2]}(?:воздух|повітря)${__T[7]}(?<!не\s)(?:шипит|шипить|травит|травить|выходит|виходить)\s+(?:у\s+|в\s+|из\s+|з\s+|із\s+)${__T[40]}\S*|${__T[2]}протектор\S*${__T[7]}(?<!не\s)(?:отслоил\S*|отслаива\S*|відшарув\S*|відклеї\S*|відклеюєт\S*|отклеил\S*|оторвал\S*|відірвал\S*|сорвал\S*|сорвало|облаз\S*)|${__T[2]}(?:сорвало|сорвал\S*|оторвало|відірвало|зірвало)${__T[7]}протектор|${__T[2]}(?:неравномерн\S*|нерівномірн\S*|односторонн\S*|однобічн\S*)${__T[7]}(?:износ\S*|знос\S*)${__T[7]}${__T[19]}|${__T[2]}(?:лыс\S*|лис[аі]\S*)${__T[7]}(?:резин\S*|гум[аиуі]|шин\S*|покрышк\S*|покришк\S*)|${__T[2]}(?:ниппел\S*|ніпел\S*|вентил\S*\s+(?:колес|шин)\S*)${__T[7]}(?<!не\s)(?:сломал\S*|сломан\S*|зламал\S*|зламан\S*|оторвал\S*|відірвал\S*|травит|травить|пропуска\S*|сифонит|свистит|тече|течет)${__T[6]}|${__T[2]}(?:камень|камінь|камінець|камешек|камни|каміння)\s+${__T[8]}(?:между|між)${__T[7]}(?:колес|шин|скат|спарк|спарен|сдвоен)\S*|${__T[2]}(?:между|між)${__T[7]}(?:колес|шин|скат)\S*\s+${__T[8]}(?:камень|камінь|камінець|камешек|камни|каміння)|${__T[2]}(?:лампа|лампочка|індикатор\S*|индикатор\S*)\s+(?:контрол\S*\s+)?(?:давлени\S*|тиску)\s+(?:в\s+|у\s+)?(?:шин\S*|колес\S*)|${__T[1]}(?:reifen)?ventil${__T[7]}(?:abgebrochen|abgerissen|undicht|kaputt)${__T[0]}|${__T[5]}(?:tyre|tire)\s+valve${__T[7]}(?:broken|leak\S*|snapped|damaged))${__RX[7]}`, 'i', 1);



const BRAKE4_HINT = lbRx(String.raw`(?:${__T[2]}(?:тормоз\S*|гальм\S*)${__T[7]}(?<!не\s)(?:пропал\S*|отказал\S*|отказыва\S*|исчез\S*|зникл\S*|зник${__T[6]}|відмовил\S*|відмовля\S*)|${__T[2]}(?<!не\s)(?:пропал\S*|отказал\S*|исчез\S*|зникл\S*|відмовил\S*)${__T[7]}(?:тормоз\S*|гальм\S*)|${__T[2]}(?:нет|немає|нема)\s+(?:тормоз\S*|гальм\S*)|${__T[2]}(?:(?:тормоз\S*|гальм\S*)|колодк\S*|суппорт\S*|супорт\S*)${__T[7]}(?<!не\s)(?:прикипел\S*|прикипіл\S*|закис\S*|закисл\S*|клинит|клинить)|${__T[2]}не\s+(?:отпуска\S*|відпуска\S*)${__T[7]}(?:тормоз\S*|гальм\S*)|${__T[2]}(?:колес\S*|коліс\S*)${__T[7]}(?<!не\s)(?:клинит|клинить|подклинива\S*|підклинює)|${__T[2]}(?:тормоз\S*|гальм\S*)${__T[7]}(?<!не\s)(?:стуч\S*|стука\S*|грюка\S*)|${__T[2]}(?:тормозн\S*|гальмівн\S*)\s+диск\S*${__T[7]}(?<!не\s)(?:крив\S*|повел\S*|повело|деформ\S*|бьет|б['’ʼ]?є)|${__T[2]}колодк\S*${__T[7]}(?:до|в|на)\s+(?:металл\S*|метал\S*|железо|залізо)|${__T[2]}(?:воздух|повітря)${__T[7]}(?:не|плохо|погано|долго|довго)\s+(?:накачива\S*|накачу\S*|набира\S*|набирає|поднима\S*|піднима\S*|кача\S*)|${__T[2]}(?<!не\s)(?:пищит|пищить|запищал\S*|пищал\S*|пищить|горит|горить|загорел\S*|загорі\S*|стоп)\s+${__T[8]}(?:давлени\S*\s+воздух\S*|тиск\S*\s+повітр\S*)|${__T[2]}(?:давлени\S*\s+воздух\S*|тиск\S*\s+повітр\S*)${__T[7]}(?<!не\s)(?:пищит|пищить|пищал\S*|горит|горить)|${__T[2]}(?<!не\s)(?:горит|горить|загорел\S*|загорі\S*|светится|світиться|мигает|блимає|ошибка|помилка)${__T[7]}(?<![a-z])(?:abs|ebs)(?![a-z])|${__T[2]}(?:педал\S*\s+)?(?:тормоз\S*|гальм\S*)\s+${__T[8]}(?:в|у|до)\s+(?:пол|пола|полу|підлог\S*)${__T[6]}|${__T[2]}(?:тормоз\S*|гальм\S*|колодк\S*)${__T[7]}(?<!не\s)(?:визж\S*|верещ\S*|скреж\S*|грею\S*|грее\S*|гріют\S*|гріє\S*|нагрева\S*|нагріва\S*|горяч\S*|гаряч\S*|дымят|дымит|димлять|димить|раскал\S*|розжар\S*)|${__T[2]}(?:лампа|лампочк\S*|индикатор\S*|індикатор\S*|значок|символ)${__T[7]}(?:колодок|(?:износа|зносу)\s+колодок|давлени\S*\s+воздух\S*|тиск\S*\s+повітр\S*)|${__T[2]}(?:прицеп\S*|полуприцеп\S*|причіп\S*|причеп\S*|напівпричіп\S*)${__T[7]}(?:сам\S*\s+|постоянно\s+|постійно\s+)?(?:тормозит|подтормажива\S*|притормажива\S*|гальмує|підгальмову\S*|пригальмову\S*)\s+(?:сам|сама|само|сами|постоянно|постійно|все\s+время|весь\s+час)${__T[6]}|${__T[2]}(?:прицеп\S*|полуприцеп\S*|причіп\S*|причеп\S*|напівпричіп\S*)\s+(?:сам|сама|само|постоянно|постійно)\s+(?:тормозит|подтормажива\S*|притормажива\S*|гальмує|підгальмову\S*|пригальмову\S*)|${__T[1]}(?:anh(?:ä|ae)nger|auflieger|trailer)\s+bremst\s+(?:von\s+selbst|von\s+allein|allein|selbstst(?:ä|ae)ndig|st(?:ä|ae)ndig|dauernd)${__T[0]}|${__T[5]}trailer\s+(?:keeps\s+)?brak(?:es|ing)\s+(?:by\s+itself|on\s+its\s+own)|${__T[2]}(?<!(?:шин\S*|колес\S*|коліс\S*|баллон|балон|кондиц\S*|кондиціон\S*|рефриж\S*)${__T[7]})(?:шипит|шипить|травит|травить|свистит|свистить)${__T[7]}(?:воздух|повітря)${__T[6]}(?!(?:[^.;!?]*[^а-яіїєґё.;!?])?(?:шин|колес|коліс|кондиц|рефриж))|${__T[2]}(?:воздух|повітря|давлени\S*|тиск)${__T[7]}(?:уходит|уходить|йде|іде|спускает|спускає|пада\S*|выходит|виходить|травит|травить)\s+(?:за\s+ночь|за\s+ніч|ночью|вночі|уночі|за\s+выходные|за\s+вихідні)${__T[6]}(?!(?:[^.;!?]*[^а-яіїєґё.;!?])?(?:шин|колес|коліс))|${__T[2]}(?:вода|воды|воду|конденсат\S*)\s+${__T[8]}(?:в|у|из|з)\s+(?:ресивер\S*|воздушн\S*\s+баллон\S*|повітрян\S*\s+балон\S*)(?![^.;!?]*(?:слит|слил|злит|злил|нормал))|${__T[2]}(?:красн\S*|червон\S*|желт\S*|жовт\S*)${__T[7]}(?:головк\S*|шланг\S*|рукав\S*|пальм\S*)${__T[7]}(?<!не\s)(?:травит|травить|шипит|шипить|пропуска\S*|сифонит|оторвал\S*|відірвал\S*|порвал\S*|тече|течет|свистит|свистить)|${__T[2]}(?:уводит|уводить|тянет|тягне|веде|ведет|бросает|кидает|кидає|заносит|заносить|бьет|б['’ʼ]?є|дергает|смика\S*|трясет|трясе)\s+${__T[9]}(?:при|во\s+время|під\s+час)\s+(?:торможени\S*|гальмуванн\S*)|${__T[1]}brems\S*${__T[7]}kreisch\S*)${__RX[7]}`, 'i', 1);
const WHEEL2_HINT = lbRx(String.raw`(?:${__T[2]}(?:колесо|колесе|колеса|колесі)${__T[7]}(?<!не\s)(?:грее\S*|гріє\S*|нагрева\S*|нагріва\S*|горяче\S*|гаряче\S*|раскал\S*|розжар\S*|дымит|димить|открутил\S*|відкрутил\S*|отвалил\S*|відвалил\S*|восьмерит|восьмерить|виляет|виляє)${__T[6]}|${__T[2]}(?:гайк|гайок|болт)\S*${__T[7]}(?<!не\s)(?:ослаб|відкрут|открут|розкрут|раскрут)\S*${__T[7]}(?:на\s+|у\s+|в\s+)?(?:колес|коліс|колiс|диск)\S*|${__T[2]}(?:трещин|тріщин)\S*\s+(?:на\s+|в\s+|у\s+)?(?:колесн\S*\s+|колісн\S*\s+)?диск[а-яіїєґё]*${__T[6]}(?!\s+(?:сцеплен|зчеплен|тормоз|гальм))|${__T[1]}(?<!nicht\s)rad\s+(?:hat\s+sich\s+|ist\s+)(?:(?!nicht\s)\S+\s+)?(?:gel(?:ö|oe)st|gelockert|abgefallen|losgerissen)${__T[0]})${__RX[7]}`, 'i', 1);
const VIBR2_HINT = lbRx(String.raw`(?:${__T[2]}(?:колесо|колеса)\s+(?<!не\s)(?:бьет|б'є|б’є|бьют|б'ють|б’ють)${__T[7]}(?:на\s+скорост\S*|на\s+швидкост\S*|при\s+разгон\S*|на\s+ходу|в\s+руль|у\s+кермо))${__RX[7]}`, 'i', 1);

const TYRE5_HINT = lbRx(String.raw`(?:${__T[2]}(?:в|у)\s+${__T[19]}${__T[7]}(?:саморез\S*|шуруп\S*|гвозд\S*|гвіздок|цвях\S*|болт\S*|скоб\S*|железк\S*|залізяк\S*|металл?\S*)|${__T[2]}протектор\S*${__T[7]}(?<!не\s)(?:слетел\S*|злетів|злетіл\S*|слез|слазит|злазить|облетел\S*)|${__T[1]}lauffl(?:ä|ae|a)che\s+${__T[9]}(?:abgel(?:ö|oe|o)st|l(?:ö|oe|o)st\s+sich|abgerissen|abgeplatzt|abgefetzt)${__T[0]}|${__T[5]}(?:tread${__T[7]}(?:separat\S*|came\s+off|coming\s+off|peel\S*|delaminat\S*)))${__RX[74]}`, 'i', 1);
const TYRE_HINT = lbRx(String.raw`${__T[1]}(?:reifen)?profil(?:tiefe)?${__T[0]}\s+(?:(?:ist|hat|vorne|hinten|links|rechts|am\s+\S+)\s+){0,2}(?:nur\s+noch|unter|weniger\s+als|kaum\s+noch|bis\s+auf)\s+(?:ca\.?\s+|etwa\s+)?\d+(?:[,.]\d+)?\s?mm(?![a-z])${__RX[75]}|${__T[1]}reifen[sn]?\s+(?:(?:ist|sind|vorne|hinten|links|rechts)\s+){0,2}(?:nur\s+noch|unter|weniger\s+als)\s+\d+(?:[,.]\d+)?\s?mm(?![a-z])${__RX[75]}|${__T[1]}reifen[sn]?\s+${__T[9]}(?:bis\s+auf\s+(?:die\s+)?(?:karkasse|stahlg(?:ü|ue)rtel|gewebe|drähte|draehte)|(?:ist|sind)\s+(?:komplett\s+|total\s+|ganz\s+)?(?:durch|glatt|runter)(?=\s*(?:$|[.,;!?])))${__RX[75]}|${__T[5]}tread\s+(?:is\s+)?(?:down\s+to|below|under|only)\s+\d+(?:\.\d+)?\s?mm(?![a-z])${__RX[75]}|${__T[5]}tread\s+(?:is\s+|has\s+)?(?:worn\s+(?:down|away|out)|gone)(?![a-z])${__RX[75]}|${__T[2]}протектор\S*${__T[7]}(?:стерся|стерт\S*|стерлися|зношен\S*|зносився|изношен\S*|износился)${__T[10]}fixed|repaired|replaced|замінил\S*|заменил\S*))|${__T[2]}(?:зачепив|зачепила|зачепили|наїхав|наїхала|наїхали|зацепил|зацепила|зацепили|заехал|заехала|наехал|наехала)${__T[7]}(?:на\s+)?бордюр\S*${__RX[65]}|${__T[5]}kerbed\s+(?:the\s+|a\s+)?(?:\S+\s+)?(?:tyres?|tires?|wheels?)(?![a-z])${__RX[18]}|${__T[5]}(?:hit|clipped|caught|mounted|clouted)\s+(?:a|the)\s+kerb(?![a-z])${__RX[18]}|${__T[1]}(?:reifen)?profil${__T[0]}\s+(?:(?:ist|sind|am|vorne|hinten|links|rechts|fast|so\s+gut\s+wie|komplett|ganz|schon|total)\s+){0,3}(?:runter|weg|unten|durch|am\s+ende)${__T[0]}${__RX[17]}|${__T[1]}(?:kaum|fast\s+kein|so\s+gut\s+wie\s+kein|wenig)\s+(?:noch\s+|mehr\s+)?profil${__T[0]}${__RX[17]}|${__T[1]}reifen[sn]?\s+${__T[8]}(?:ohne\s+profil|hat\s+(?:(?:n|['’]n|ein|einen)\s+)?ei${__T[0]})${__RX[17]}|${__T[2]}(?:(?:лис(?:а|і|ая|ые)|лыс(?:ая|ые|ую))\s+(?:резин\S*|шин\S*|покрышк\S*|покришк\S*)|(?:резин\S*|шин\S*)\s+(?:зовсім\s+|совсем\s+)?лис(?:а|і|ая|ые))${__T[6]}|${__T[1]}(?:rdks|reifendruckkontroll\S*|reifendruck(?:überwachung|ueberwachung)\S*|tpms|(?:tyre|tire)\s+pressure\s+monitor\S*)(?![a-zäöüß-])\s+${__T[9]}(?:warn\S*|meldet\s+${__T[8]}(?:druckverlust|warnung|zu\s+wenig|niedrig\S*)|leuchtet|alarm\S*|druckverlust|piept|alert\S*|light|warning)|${__T[1]}(?:(?:zwillings|vorder|hinter|antriebs|lenk${__T[25]}ae|a)nger)?reifen[sn]?|lauffl(?:ä|ae|a)che|reifenflanke|seitenwand|reifenprofil|profil)${__T[0]}${__T[44]}verlier\S*${__T[7]}luft|beule|blase|ausbeulung|schnitt|eingeschnitten|eingerissen|rissig|risse${__T[0]}|riss${__T[0]}|abgefahren|blank${__T[0]}|(?:kein|zu\s+wenig|wenig|kaum)\s+profil|zu\s+wenig${__T[0]}|(?:zu\s+)?(?:gering|niedrig)${__T[0]}|l(?:ö|oe|o)s(?:t|en)\s+sich|besch(?:ä|ae|a)digt|aufgerissen|(?:draht|gewebe|stahl\S*|karkasse)${__T[7]}(?:schaut|guckt|sichtbar|zu\s+sehen|kommt\s+raus)|scheuer\S*|ber(?:ü|ue|u)hren\s+sich|(?:hat|mit)\s+(?:einen\s+|eine\s+|einem\s+)?(?:nagel|schraube|fremdk(?:ö|oe|o)rper))${__RX[75]}|${__T[1]}(?:reifenschaden|reifensch(?:ä|ae|a)den|reifenbeule|reifenriss|reifendruckwarnung|reifendruck-warnung|luftverlust${__T[7]}(?:am|im)${__T[7]}reifen\S*)|${__T[1]}(?:nagel|schraube|fremdk(?:ö|oe|o)rper|glasscherbe|beule|blase|schnitt|riss)\s+${__T[8]}(?:im|in\s+der|in\s+dem|am|an\s+der)${__T[7]}(?:reifen|lauffl(?:ä|ae|a)che|seitenwand|flanke|reifenflanke)\S*|${__T[1]}reifendruck\s+${__T[8]}(?:zu\s+)?(?:niedrig|gering|f(?:ä|ae|a)llt|sinkt|warnung|warnt)|${__T[1]}(?:scheuert|scheuern|schleift|schleifen)${__T[7]}(?:am|an\s+den|an\s+dem|an\s+der)${__T[7]}reifen\S*|${__T[5]}(?:tyre|tire)s?\s+${__T[8]}(?:bulge|bulging|cut(?![a-z])|cracked|cracks|worn|bald|los(?:ing|es)\s+air|leak(?:ing|s)\s+air|going\s+down|(?:is\s+)?low\s+on\s+air|(?:has\s+)?low\s+(?:air\s+)?pressure|damaged|tread${__T[7]}(?:coming\s+off|separating|low|worn)|sidewall\s+damage\S*|rubbing)(?![a-z])${__RX[76]}|${__T[5]}(?:nail|screw|bolt|bulge|cut|glass)\s+in\s+(?:the\s+|a\s+)?(?:\S+\s+)?(?:tyre|tire)s?(?![a-z])${__RX[76]}|${__T[5]}(?:bald|worn|damaged|bulging)${__T[7]}(?:tyre|tire)s?(?![a-z])${__RX[76]}|${__T[5]}(?:tyre|tire)\s+pressure${__T[7]}(?:warning|low|light|dropping)${__RX[76]}|${__T[4]}(?:шин\S*|колес\S*|покришк\S*|покрышк\S*|протектор\S*|резин(?!к)\S*)\s+${__T[8]}(?:зношен\S*|изношен\S*|лис\S*|лыс\S*|гриж\S*|грыж\S*|поріз\S*|порез\S*|тріщин\S*|трещин\S*|пошкоджен\S*|поврежд\S*|трав\S*${__T[7]}повітр\S*|трав\S*${__T[7]}воздух\S*|втрача\S*\s+тиск|теря\S*\s+давлен\S*|відшаров\S*|отслаива\S*)${__RX[76]}|${__T[4]}(?:гриж\S*|грыж\S*|цвях\S*|гвозд\S*|саморіз\S*|саморез\S*|шуруп\S*|поріз\S*|порез\S*)${__T[7]}(?:на|в|у)${__T[7]}(?:шин\S*|колес\S*|покришк\S*|покрышк\S*|протектор\S*)${__RX[76]}|${__T[4]}(?:поріз\S*|порез\S*)${__T[7]}(?:шин\S*|колес\S*|покришк\S*|покрышк\S*)${__RX[76]}|${__T[4]}(?:низьк\S*|низк\S*)\s+тиск\S*${__T[7]}(?:в|у)${__T[7]}шин\S*${__RX[76]}|${__T[4]}(?:низьк\S*|низк\S*)\s+(?:тиск|давлени)\S*${__T[7]}(?:в|у)${__T[7]}(?:шин|колес)\S*${__RX[76]}|${__T[4]}(?:тиск|давлени)\S*\s+(?:в|у)${__T[7]}(?:шин|колес)\S*${__T[7]}(?:низьк\S*|низк\S*|мал\S*|впав|упал\S*|пада\S*)${__RX[76]}|(?<![a-z])(?<!no\s)low\s+(?:tyre|tire)\s+pressure(?![a-z])${__RX[76]}|${__RX[7]}${__T[2]}(?:колесо|колеса|шина|шини|шины)${__T[7]}(?:спуска\S*|трав\S*)${__RX[7]}|${__RX[7]}${__T[5]}(?:wheel|tyre|tire)\s+(?:is\s+|keeps\s+)?(?:losing|loses|leaking|leaks)${__T[7]}air(?![a-z])${__RX[7]}|${__T[1]}(?:reifenventil\S*|ventil(?:kappe)?\s+(?:am|vom|des)${__T[7]}(?:reifen${__T[34]}ae)ngerreifen)\S*)\s+(?:(?:ist|vorne|hinten|links|rechts)\s+){0,2}(?:abgerissen|abgebrochen|undicht|kaputt|defekt|verbogen|zischt)${__T[0]}${__RX[77]}|${__T[1]}(?:karkasse|stahlg(?:ü|ue)rtel|stahlcord|cord|gewebe(?:lage)?)${__T[0]}\s+(?:(?:ist|sind|schon|schaut|kommt|guckt|liegt)\s+){0,2}(?:sichtbar|zu\s+sehen|frei|raus|heraus|durch)${__T[0]}${__RX[77]}|${__T[1]}(?:stahl|draht|dr(?:ä|ae)hte|gewebe)\s+(?:schaut|schauen|kommt|kommen|guckt|gucken|steht|stehen|ist|sind)\s+${__T[8]}(?:raus|heraus|vor|sichtbar)${__T[7]}(?:am|aus\s+dem|im|beim)${__T[7]}(?:reifen${__T[34]}ae)ngerreifen)${__T[0]}${__RX[77]}|${__T[1]}(?:reifen${__T[34]}ae)ngerreifen)(?:n)?${__T[0]}\s+(?:(?:ist|sind|vorne|hinten|links|rechts|schon|total|ganz|sehr|stark|alle|alt\s+und)\s+){0,3}(?:por(?:ö|oe)s|rissig|ausgeh(?:ä|ae)rtet|br(?:ü|ue)chig)${__T[0]}${__RX[77]}|${__T[1]}reifen(?:druck)?(?:warnung|warnmeldung|kontrolle|fehler)\s+${__T[8]}(?:im|auf\s+dem|am)\s+(?:display|bildschirm|tacho|armaturenbrett)${__RX[77]}|${__T[5]}(?:bulge|bubble|lump|cut|gash)\s+(?:on|in)\s+(?:the\s+)?(?:\S+\s+)?(?:tyre|tire)(?:wall)?s?(?![a-z])${__RX[77]}|${__T[5]}(?:wire|wires|steel|cord|belt|canvas|ply)\s+(?:is\s+|are\s+)?(?:showing|visible|exposed|sticking\s+out|coming\s+through)\s+(?:on|in|from|through)\s+(?:the\s+)?(?:\S+\s+)?(?:tyre|tire)s?(?![a-z])${__RX[77]}|${__T[5]}(?:tyre|tire)s?${__T[7]}(?:valve|valve\s+stem)${__T[7]}(?:broken|snapped|leaking|ripped\s+off|missing)(?![a-z])${__RX[77]}|${__T[2]}(?:корд\S*|металокорд\S*)${__T[7]}(?:видно|видн\S*|вилі\S*|вылез\S*|стирчить|торчит)${__RX[77]}|${__T[2]}(?:видно|видн\S*)${__T[7]}корд\S*${__RX[77]}|${__T[1]}(?:reifen${__T[34]}ae)ngerreifen)(?:n)?${__T[0]}\s+(?:(?:ist|sind|wirkt|wirken|fühlt\s+sich|fuehlt\s+sich|vorne|hinten|links|rechts|schon|etwas|ganz|sehr|so|zu|total)\s+){0,4}(?:weich|zischt|zischen|pfeift)${__T[0]}${__RX[78]}|${__T[1]}(?:reifen${__T[34]}ae)ngerreifen)(?:n)?${__T[0]}[^.;!?]{0,40}?(?:muss|m(?:ü|ue)ssen|st(?:ä|ae)ndig|immer\s+wieder|t(?:ä|ae)glich|jeden\s+(?:tag|morgen))(?:(?!nicht|kein)[^.;!?]){0,30}?(?:nach|auf)(?:gepumpt|pumpen)${__T[0]}${__RX[78]}|${__T[1]}(?<!nicht\s)(?<!nicht\s(?:mehr|so)\s)(?:muss|m(?:ü|ue)ssen|st(?:ä|ae)ndig|immer\s+wieder|t(?:ä|ae)glich|jeden\s+(?:tag|morgen))\s+(?:(?!nicht|kein)\S+\s+){0,3}?luft\s+${__T[9]}nach(?:f(?:ü|ue)llen|pumpen|gef(?:ü|ue)llt|gepumpt)${__T[0]}${__RX[78]}|${__T[5]}(?:tyre|tire)s?\s+${__T[8]}(?:is|are|feels?|looks?|seems?|going)\s+(?:a\s+bit\s+|very\s+|quite\s+|really\s+|a\s+little\s+)?soft(?![a-z])${__RX[78]}|${__T[5]}(?:tyre|tire)s?\s+${__T[8]}(?:keeps?\s+)?(?:needing|needs)\s+(?:more\s+)?air(?![a-z])${__RX[78]}|${__T[5]}(?:keep|have\s+to\s+keep|keep\s+having\s+to)\s+(?:pumping\s+up|inflating|topping\s+up)\s+(?:the\s+)?(?:\S+\s+)?(?:tyre|tire)s?(?![a-z])${__RX[78]}|${__T[5]}(?:tyre|tire)s?\s+(?:is\s+|are\s+)?hissing(?![a-z])${__RX[78]}|${__T[5]}hissing\s+(?:noise\s+|sound\s+)?(?:from|at)\s+(?:the\s+)?(?:\S+\s+)?(?:tyre|tire|wheel)s?(?![a-z])${__RX[78]}|${__T[2]}(?:повільно\s+|потихеньку\s+|медленно\s+)?спуска\S*${__T[7]}(?:колесо|колеса|шина|шину|шини|шины)${__T[6]}${__RX[78]}|${__T[2]}(?:колесо|колеса|шина|шини|шины)${__T[7]}(?:шипить|шипит|свистить|свистит)${__T[6]}${__RX[78]}|${__RX[7]}${__T[2]}(?:датчик\S*|сенсор\S*|індикатор\S*|индикатор\S*|лампочк\S*|значок\S*)\s+(?:тиску|давлени\S*)\s+(?:(?:в|у)\s+)?(?:шин\S*|колес\S*|колiс\S*|коліс\S*)${__T[7]}(?:гори\S*|світит\S*|светит\S*|мига\S*|блима\S*|загор\S*)${__RX[7]}|${__RX[7]}${__T[2]}(?:гори\S*|світит\S*|светит\S*|мига\S*|блима\S*|загор\S*)\s+(?:датчик\S*|сенсор\S*|індикатор\S*|индикатор\S*|лампочк\S*|значок\S*)\s+(?:тиску|давлени\S*)\s+(?:(?:в|у)\s+)?(?:шин\S*|колес\S*|колiс\S*|коліс\S*)${__RX[7]}|(?:${__T[1]}(?:reifen)?flanke\S*\s+${__T[8]}(?:auf|an|ein)geschnitten|${__T[1]}reifen\S*\s+${__T[8]}(?:aufgeschnitten|angeschnitten|eingeschnitten))${__RX[71]}|(?:${__T[1]}steine?\s+${__T[9]}zwischen\s+(?:den\s+)?(?:zwillingsreifen|zwillingsr(?:ä|ae)dern|doppelreifen)|${__T[1]}(?:zwillings|doppel)reifen\S*\s+${__T[9]}steine?${__T[0]})${__RX[71]}|(?:${__T[1]}reifendruck-?anzeige\S*${__T[7]}(?:rot|leuchtet|blinkt|warnt))${__RX[71]}|(?:${__T[5]}(?:sidewall\s+(?:is\s+)?cut|cut\s+in\s+the\s+(?:tyre|tire|sidewall)|(?:tyre|tire)\s+(?:is\s+)?(?:cut|slashed)(?![a-z])))${__RX[71]}|(?:${__T[5]}stones?\s+${__T[8]}between\s+(?:the\s+)?(?:twin|dual)\s+(?:tyres|tires|wheels))${__RX[71]}|(?:${__T[2]}(?:порізан\S*|порезан\S*)${__T[7]}(?:шин|покришк)\S*|${__T[2]}(?:шин|покришк)\S*${__T[7]}(?:порізан\S*|порезан\S*)|${__T[2]}(?:у|в)\s+(?:шині|шине|покришці|покрышке)${__T[7]}(?:цвях\S*|гвозд\S*|саморіз\S*|саморез\S*|шуруп\S*|болт\S*)|${__T[2]}(?:камін\S*|камен\S*)${__T[7]}(?:між|между)\s+(?:спарен|сдвоен)\S*\s+(?:колес|шин)\S*)${__RX[71]}|${__T[2]}(?:загор\S*|гор(?:ить|ит)|світит\S*|светит\S*|блима\S*|мига\S*|попереджен\S*|предупрежден\S*|помилк\S*|ошибк\S*)\s+(?:(?:про|о|по|щодо)\s+)?(?:низьк\S*\s+|низк\S*\s+)?(?:тиск\S*|давлени\S*)\s+(?:(?:в|у)\s+)?(?:шин\S*|колес\S*|коліс\S*)${__RX[13]}`, 'i', 1);



const TYRE2_HINT = lbRx(String.raw`(?:${__T[1]}(?:(?:auflieger|anh(?:ä|ae|a)nger|vorder|hinter|antriebs|lenk)?reifen(?:flanke)?|flanke|lauf?fl(?:ä|ae|a)che)[sn]?\s+${__T[9]}(?:aufgescheuert|abgescheuert|durchgescheuert|angescheuert)${__T[0]}|${__T[1]}laufl(?:ä|ae|a)che\s+${__T[8]}(?:l(?:ö|oe|o)st\s+sich|abgel(?:ö|oe|o)st|kommt\s+ab)${__T[0]}|${__T[5]}tread\s+(?:is\s+|has\s+)?(?:separating|separated|coming\s+(?:off|away|apart)|came\s+off|peeling|delaminat\S*))${__T[10]}fixed|repaired|replaced${__T[11]}заменил\S*))`, 'i', 1);




const TYRE3_HINT = lbRx(String.raw`(?:${__T[1]}(?:bordstein|bordsteinkante|kantstein|randstein)\S*\s+${__T[9]}(?:mitgenommen|gestreift|touchiert|erwischt|gerammt|geschrammt|ber(?:ü|ue)hrt|angefahren|aufgeschlitzt|aufgerissen|eingeschnitten|zerkratzt|verbogen|besch(?:ä|ae)digt|(?:hoch|dr(?:ü|ue)ber|rauf|r(?:ü|ue)ber)\s?gefahren|gekommen|gefahren|geknallt|gesto(?:ß|ss)en|geraten|gerutscht)${__T[0]}|${__T[5]}(?:hit|clipped|scraped|mounted|struck|bumped|caught|ran\s+over|went\s+over|drove\s+over|went\s+up|ran\s+up)\s+(?:the\s+|a\s+)?(?:kerb|curb)(?:stone)?s?(?![a-z])|${__T[5]}(?:kerb|curb)\s+(?:strike|damage|rash)(?![a-z])|${__T[2]}(?:зачепив|зачепила|наїхав\s+на|наїхала\s+на|заїхав\s+на|вдарив\S*\s+(?:об|в)|задел|задела|наехал\s+на|наехала\s+на|заехал\s+на|ударил\S*\s+(?:об|о|в))${__T[7]}бордюр\S*|${__T[2]}бордюр\S*${__T[7]}(?:зачепив|зачепила|задел|задела|пошкод\S*|повред\S*))${__T[10]}geflickt|wieder\s+(?:ok|in\s+ordnung)|fixed|repaired|replaced${__T[12]}отремонт\S*|заменил\S*))`, 'i', 1);
const TYREWALL_RX = lbRx(String.raw`${__T[1]}(?:reifen|pneu)\S*\s+(?:[^.,;!?\s]+\s+){0,4}?seitenwand(?!${__T[7]}(?:vom|des|am|der|an\s+der)${__T[7]}${__T[16]}aufbau|koffer|kasten|pritsche|ladefl(?:ä|ae)che|laderaum)\S*)|${__T[1]}seitenwand\s+(?:vom|des|am|an\s+dem)${__T[7]}(?:reifen|pneu)\S*`, 'gi');
const noTyreWall = (s) => s.replace(TYREWALL_RX, ' ');


const bodyWall = (s) => /seitenwand/i.test(s) && !/reifen|flanke|pneu/i.test(s) && (LOAD_HINT.test(s) || FLOOR_HINT.test(s));






const CABLOCK_HINT = lbRx(String.raw`${__T[1]}(?:funk)?schl(?:ü|ue)ssel(?:s)?\s+(?:(?:hat|ist|die|der)\s+)?(?:batterie|akku)\s+(?:ist\s+)?(?:leer|alle|platt)${__T[0]}${__RX[17]}|${__T[1]}(?:batterie|akku)\s+(?:vom|im|des)\s+(?:funk)?schl(?:ü|ue)ssel(?:s)?\s+(?:ist\s+)?(?:leer|alle|platt)${__T[0]}${__RX[17]}|${__T[5]}central\s+locking\s+(?:is\s+)?(?:playing\s+up|acting\s+up|has\s+a\s+mind\s+of\s+its\s+own)(?![a-z])${__RX[37]}|${__T[1]}zentralverriegelung\s+${__T[8]}(?:spinnt|spackt|zickt|macht\s+${__T[8]}(?:was\s+sie\s+will|faxen|probleme|zicken)|spielt\s+verr(?:ü|ue)ckt|geht\s+mal\s+und\s+mal\s+nicht|(?:schlie(?:ß|ss)t|verriegelt)\s+von\s+selbst)${__T[0]}${__RX[17]}|${__T[1]}t(?:ü|ue|u)rschl(?:oss|(?:ö|oe)sser)\s+${__T[8]}(?:hakt|haken|geht\s+(?:nur\s+)?(?:noch\s+)?(?:ganz\s+|sehr\s+)?schwer|schwerg(?:ä|ae)ngig)${__T[0]}${__RX[17]}|${__T[1]}(?:lkw|fahrzeug|fahrerhaus|kabine|zugmaschine)\s+(?:geht|ging)${__T[7]}${__T[13]}auf${__T[0]}${__RX[17]}|${__T[1]}(?:krieg|kriege|kriegen|bekomme|bekommen)\s+(?:ich\s+|wir\s+)?(?:den|das)\s+(?:lkw|fahrzeug|fahrerhaus)${__T[7]}${__T[13]}(?:auf|zu)${__T[0]}${__RX[17]}|${__T[1]}(?:zentralverriegelung|funkschl(?:ü|ue|u)ssel|funkfernbedienung|schl(?:ü|ue|u)sselfernbedienung|(?:fahrzeug|lkw|t(?:ü|ue|u)r)?schl(?:ü|ue|u)ssel|t(?:ü|ue|u)rschloss|t(?:ü|ue|u)rschl(?:ö|oe|o)sser|t(?:ü|ue|u)rverriegelung)(?:s|n)?${__T[0]}(?![^.;!?]*(?:z(?:ü|ue|u)ndschloss|z(?:ü|ue|u)ndung|lenkradschloss|lenkradsperre))\s+${__T[9]}(?:eingefroren|zugefroren|festgefroren|defekt|kaputt|ausgefallen|geht\s+nicht|gehen\s+nicht|funktioniert\s+nicht|reagiert\s+nicht|klemmt|abgebrochen|gebrochen|dreht\s+(?:sich\s+)?nicht|l(?:ä|ae|a)sst\s+sich\s+${__T[13]}drehen|(?:schlie(?:ß|ss)t|sperrt|verriegelt)${__T[7]}nicht(?:\s+mehr)?\s+(?:ab|zu)?${__T[0]}|verriegelt\s+nicht)|${__T[1]}(?:lkw|fahrzeug|fahrerhaus|kabine|zugmaschine|wagen)\s+${__T[8]}(?:l(?:ä|ae|a)sst\s+sich|kann\s+(?:ich|man))${__T[7]}${__T[13]}(?:\S+\s+)?(?:abschlie(?:ß|ss)en|abschlie(?:ß|ss)t|verriegeln|zusperren|absperren)|${__T[1]}schl(?:ü|ue|u)ssel${__T[7]}(?:im|in\s+der|in\s+dem)\s+(?:t(?:ü|ue|u)r)?schloss${__T[7]}abgebrochen|${__T[5]}(?:central\s+locking|key\s+fob|remote\s+key|(?<!(?:trailer|reefer|rear|back|barn|cargo|box|side)\s+)door\s+locks?|cab\s+locks?)(?![a-z])\s+${__T[8]}(?:not\s+working|doesn['’]?t\s+work|isn['’]?t\s+working|broken|broke|failed|dead|stuck|jammed|snapped|won['’]?t\s+(?:lock|turn|work))(?![a-z])|${__T[5]}(?:cab|truck|lorry|vehicle|tractor\s+unit)\s+(?:(?!doors?\s)\S+\s+)?${__T[38]}\s+not|can['’]?t|cannot|will\s+not)\s+(?:be\s+)?lock(?:ed)?(?![a-z])|${__T[5]}key${__T[7]}(?:snapped|broke\s+off|broken\s+off)${__T[7]}in\s+(?:the\s+)?(?:\S+\s+)?lock|${__T[4]}(?:центральн\S*\s+замок\S*|брелок\S*|брелк\S*|ключ\S*|замок\s+двер\S*|замк\S*\s+двер\S*|дверн\S*\s+замок\S*)(?![^.;!?]*(?:запалюван|зажиган))\s+${__T[8]}(?:застряг\S*|застрял\S*${__T[15]}не\s+спрацьову\S*|не\s+срабатыва\S*|зламав\S*|злама[внл]\S*${__T[17]}заклин\S*|не\s+поверта\S*|не\s+повора\S*)|${__T[4]}(?:кабін\S*|кабин\S*|машин\S*|вантажівк\S*|грузовик\S*)${__T[7]}не${__T[7]}(?:зачиня\S*|закрива\S*|закрыва\S*|запира\S*)\s+на\s+ключ|${__RX[7]}${__T[5]}key\s+(?:has\s+|got\s+|is\s+)?(?:broken|broke|snapped)(?:\s+off)?(?![a-z])${__RX[7]}|${__RX[7]}${__T[5]}(?:broke|snapped)\s+(?:the|my)\s+key(?![a-z])${__RX[7]}|(?:${__T[5]}key\s+${__T[18]}does\s+not|can['’]?t|cannot)\s+turn|${__T[2]}ключ\S*${__T[7]}не\s+(?:провертає\S*|повертає\S*|проворачива\S*|поворачива\S*))${__RX[11]}|(?:${__T[5]}(?:(?:cab\s+|driver(?:['’]?s)?\s+)?door\s+locks?|locks?\s+on\s+the\s+(?:cab|door)|door\s+lock\s+cylinders?)\s+(?:is\s+|are\s+)?(?:\S+\s+)?frozen|${__T[2]}замок\s+(?!зажиган|запалюван)${__T[8]}(?:замерз\S*|примерз\S*|змерз\S*)|${__T[2]}(?:замерз|примерз)\S*\s+замок(?!\s+(?:зажиган|запалюван)))${__RX[22]}`, 'i', 1);


const CABLOCK2_HINT = lbRx(String.raw`(?:${__T[1]}schl(?:ü|ue)ssel${__T[7]}(?:steckt|klemmt|h(?:ä|ae)ngt)\s+(?:fest\s+)?(?:im|in\s+der)\s+(?:t(?:ü|ue)r(?:schloss)?|schloss)${__T[0]}|${__T[1]}zentralverriegelung\s+${__T[8]}(?:schlie(?:ß|ss|s)t|(?:ö|oe)ffnet|verriegelt|entriegelt|geht\s+(?:auf|zu))\s+(?:sich\s+)?(?:von\s+)?(?:allein\S*|selbst|selbstst(?:ä|ae)ndig|st(?:ä|ae)ndig|dauernd|immer\s+wieder)${__T[0]}|${__T[1]}(?:lkw|laster|fahrerhaus|kabine|zugmaschine)\s+(?:l(?:ä|ae)sst\s+sich${__T[7]}${__T[13]}(?:aufschlie(?:ß|ss|s)en|aufsperren|(?:ö|oe)ffnen|entriegeln|verriegeln|zusperren)|geht${__T[7]}${__T[13]}zu)${__T[0]}|${__T[1]}komm(?:e|en|t)?${__T[7]}${__T[13]}(?:ins|in\s+(?:den|die|das))\s+(?:fahrerhaus|lkw|kabine|laster|zugmaschine)${__T[0]}(?![^.;!?]*(?:tritt|stufe|leiter|haltegriff|knie|r(?:ü|ue)cken))|${__T[5]}(?:can['’]?t|cannot|can\s+not|unable\s+to)\s+(?:lock|unlock|open|get\s+into)\s+(?:the\s+|my\s+)?(?:truck|cab|lorry|vehicle)(?![a-z])|${__T[5]}locked\s+out\s+of\s+(?:the\s+|my\s+)?(?:truck|cab|lorry|vehicle)(?![a-z])|${__T[2]}не\s+(?:можу|могу|вдається|получается)\s+(?:закрити|відкрити|замкнути|відімкнути|закрыть|открыть|замкнуть)${__T[7]}(?:кабін\S*|кабин\S*|вантажівк\S*|фур\S*|тягач\S*))${__RX[53]}`, 'i', 1);

const CABLOCK3_HINT = lbRx(String.raw`${__RX[54]}(?:${__T[2]}(?:центральн\S*\s+замок|центральн\S*\s+замк\S*|центральн\S*)${__T[7]}(?:не\s+(?:закрыва\S*|закрива\S*|замыка\S*|замика\S*|блокиру\S*|блоку\S*|срабатыва\S*|спрацьову\S*|реагиру\S*|реагу\S*)|(?<!не\s)(?:сам\S*\s+)?(?:открыва\S*|відкрива\S*|відчиня\S*)\s+(?:сам\S*|постоянно|постійно))|${__T[2]}(?:двер\S*|двері|кабин\S*|кабін\S*)${__T[7]}не\s+(?:блокиру\S*|блоку\S*|запира\S*|замика\S*|замыка\S*|закрыва\S*\s+на\s+ключ|закрива\S*\s+на\s+ключ|ставит\S*\s+на\s+замок)|${__T[2]}(?:брелок\S*|ключ\S*)${__T[7]}не\s+(?:закрыва\S*|закрива\S*|открыва\S*|відкрива\S*|відчиня\S*|работа\S*|працю\S*|реагиру\S*|реагу\S*)\s*(?:\S+\s+)?(?:двер\S*|двері|кабин\S*|кабін\S*|машин\S*|машину|грузовик\S*|фур\S*)?)`, 'i', 1);




const VIBR_HINT = lbRx(String.raw`${__T[1]}(?:lkw${__T[25]}ae|a)nger|fahrzeug|zugmaschine)\s+${__T[8]}eier(?:t|n)${__T[0]}(?!${__T[7]}(?:rum|herum)${__T[0]})${__RX[17]}|${__T[1]}${__T[47]}(?:vibriert|vibrieren|vibration(?:en)?|schaukelt|schaukeln|aufschaukeln|schaukelt\s+sich\s+auf|flattert|(?:lenkrad)?flattern|rüttelt|ruettelt|rütteln|unwucht|schwingt${__T[7]}auf|zittert|lenkrad(?:es|s)?${__T[7]}schl(?:ä|ae)gt)${__T[0]}${__RX[79]}|${__T[5]}${__T[47]}(?:vibrates|vibrating|vibration|vibrations|shakes|shaking|shudders|shuddering|judders|juddering|sways|swaying|wheel\s+imbalance|out\s+of\s+balance)(?![a-z])${__RX[79]}|${__T[4]}${__T[47]}(?:вібру\S*|вібрац\S*|трясе|трусить|тряс[её]т|трясет|трясеться|тряс[её]тся|вибриру\S*|вибрац\S*|розгойду\S*|раскачива\S*|хитає|(?<!(?:компресор|компрессор|насос)${__T[7]}(?:не\s+)?)качає|(?:кермо|руль|колесо|колеса)\s+(?!не\s)(?:\S+\s+)?(?:б['’ʼ]?є|бь[её]т|б['’ʼ]?ється)|(?:б['’ʼ]?є|бьет)${__T[7]}(?:кермо|руль|руля))(?![а-яіїєґ])|${__T[1]}(?:kardanwelle|kardan|gelenkwelle|antriebswelle|mittellager)${__T[0]}\s+${__T[9]}(?:schl(?:ä|ae|a)gt|klappert|klopft|brummt|rumpelt|rattert|heult|wackelt|hat\s+spiel|defekt|kaputt|ausgeschlagen)${__T[10]}nicht\s+mehr${__T[26]}in\s+ordnung)))|${__T[5]}(?:prop(?:eller)?\s+shaft|drive\s?shaft|driveline)\s+${__T[9]}(?:knock\S*|rattl\S*|vibrat\S*|play|loose|broken|damaged)|${__RX[21]}(?:${__T[5]}(?:propshaft|prop\s+shaft|propeller\s+shaft|drive\s?shaft)\s+${__T[9]}(?:worn|knock\S*|clunk\S*)|${__T[5]}(?:u-?js?|universal\s+joints?)\s+${__T[8]}(?:worn|knock\S*|clunk\S*|play|broken|gone|loose)(?![a-z])|${__T[2]}(?:кардан\S*|крестовин\S*|хрестовин\S*)\s+${__T[9]}(?:б['’ʼ]?(?:ьет|ється|є)${__T[6]}|стуч\S*|стук\S*|разбит\S*|розбит\S*|люфт\S*|болта\S*|теля\S*|гремит|гримить))${__RX[21]}`, 'i', 1);



const DECK_HINT = lbRx(String.raw`${__T[1]}(?:(?:lade|ober|unter)?etage(?:n)?|lade(?:ebene|deck)(?:n|s)?|ober(?:deck|ebene)|unter(?:deck|ebene)|zwischen(?:deck|boden|ebene)|doppelstock(?:system|anlage|boden)?|auffahr(?:rampe|schiene)(?:n)?|rampe(?:n)?\s+hydraulisch|hydraulische(?:n)?\s+(?:rampe|etage|anlage)(?:n)?|hydraulik(?:schlauch|schl(?:ä|ae|a)uche|zylinder|pumpe|anlage|aggregat|leitung)?|hubzylinder)${__T[0]}\s+${__T[9]}(?:geht${__T[7]}nicht(?:\s+mehr)?${__T[0]}|gehen${__T[7]}nicht${__T[0]}|f(?:ä|ae|a)hrt${__T[7]}${__T[13]}(?:hoch|runter|herunter|rauf|aus|ein)|l(?:ä|ae|a)sst\s+sich${__T[7]}${__T[13]}(?:\S+\s+)?(?:hochfahren|herunterfahren|runterfahren|absenken|senken|heben|anheben|bewegen|ausfahren|einfahren|verriegeln|sichern)|senkt\s+sich${__T[7]}(?:ab|von\s+selbst|allein)|sackt${__T[7]}ab|klemmt|h(?:ä|ae|a)ngt\s+fest|blockiert|undicht|leckt|tropft|verliert${__T[7]}(?:öl|oel|druck)|geplatzt|gerissen|abgerissen|verbogen|defekt|kaputt|ausgefallen|f(?:ä|ae|a)llt\s+aus|funktioniert${__T[7]}nicht)${__T[0]}${__RX[80]}|${__T[5]}(?:(?:upper|lower|top|bottom|loading|car)\s+decks?|decks?|loading\s+ramps?|ramps?|hydraulics|hydraulic\s+(?:system|hose|pump|cylinder|ram|ramp|deck|line)s?)(?![a-z])\s+${__T[9]}(?:not\s+working|doesn['’]?t\s+work|isn['’]?t\s+working|won['’]?t\s+(?:lift|lower|go\s+up|go\s+down|move|lock|rise)|will\s+not\s+(?:lift|lower|move|rise)|stuck|jammed|leaking|leaks|burst|failed|broken|dropping|drops|sinking|sinks|keeps\s+(?:dropping|sinking|lowering))(?![a-z])${__RX[80]}|${__T[4]}(?:гідравлі\S*|гидравли\S*|аппарел\S*|рамп[аиуі]\S*|верхн\S*\s+(?:ярус|поверх|площадк|платформ)\S*|нижн\S*\s+(?:ярус|поверх|площадк|платформ)\S*|ярус\S*|гідрошланг\S*|гидрошланг\S*)\s+${__T[9]}(?:${__T[43]}|тече|теч[её]т|течет|протіка\S*|протека\S*|заклини\S*|заїло|заело|не\s+підніма\S*|не\s+поднима\S*|не\s+опуска\S*|сам\S*\s+опуска\S*|опуска\S*\s+сам\S*|просіда\S*|проседа\S*${__T[28]}лопнув|лопнул\S*|порвал\S*|прорвал\S*)`, 'i', 1);
const FLOOR_HINT = lbRx(String.raw`${__T[4]}(?:дірк\S*|дір[аиу](?![а-яіїєґ])|дыр\S*|пробоїн\S*|пробоин\S*)\s+(?:в|у)\s+(?:підлоз\S*|підлог\S*|полу|поле)${__T[7]}(?:причеп\S*|причіп\S*|напівпричеп\S*|прицеп\S*|полуприцеп\S*|кузов\S*|фур\S*)|${__T[1]}(?<!(?:kein|keine|keinen|ohne)\s+)(?:(?:lade|laderaum${__T[25]}ae)nger|koffer|aufbau|holz|siebdruck)boden|ladefl(?:ä|ae)che|bodenplatten?|bodenbretter|bodenbrett|(?:seiten)?bordw(?:a|ä|ae)nd(?:e)?|seitenw(?:a|ä|ae)nd(?:e)?|stirnw(?:a|ä|ae)nd(?:e)?|r(?:ü|ue)ckw(?:a|ä|ae)nd(?:e)?|(?:koffer|aufbau)w(?:a|ä|ae)nd(?:e)?|${__T[16]}koffer|aufbau)dach|(?:mittel|eck|steck)?runge(?:n)?|boden\s+(?:im|vom|des|der|in\s+(?:der|dem|den))${__T[7]}${__T[16]}laderaum|koffer|trailer|aufbau|k(?:ü|ue)hlkoffer|k(?:ü|ue)hlauflieger)|dach\s+(?:vom|des)${__T[7]}${__T[16]}koffer|aufbau))(?:s|es|n)?${__T[0]}\s+(?:(?!nicht\s|kein)\S+\s+){0,3}?(?:gebrochen|durchgebrochen|eingebrochen|angebrochen|abgebrochen|gerissen|eingerissen|aufgerissen|kaputt|defekt|besch(?:ä|ae|a)digt|verbogen|eingedr(?:ü|ue)ckt|eingebeult|verbeult|zerbeult|verzogen|abgerissen|morsch|verfault|durchgefault|durchgerostet|aufgeplatzt|durchgetreten|zersplittert|gesplittert|l(?:ö|oe)chrig|gibt\s+nach|hat${__T[7]}(?:loch|l(?:ö|oe)cher|riss|risse))${__T[0]}${__RX[81]}|${__T[1]}(?:loch|l(?:ö|oe)cher|riss|risse|bruch)\s+(?:im|in\s+(?:der|den|dem))${__T[7]}(?:(?:lade|laderaum${__T[25]}ae)nger|koffer|aufbau|holz|siebdruck)boden|ladefl(?:ä|ae)che|bodenplatten?|bodenbretter|bodenbrett|(?:seiten)?bordw(?:a|ä|ae)nd(?:e)?|seitenw(?:a|ä|ae)nd(?:e)?|stirnw(?:a|ä|ae)nd(?:e)?|r(?:ü|ue)ckw(?:a|ä|ae)nd(?:e)?|(?:koffer|aufbau)w(?:a|ä|ae)nd(?:e)?|${__T[16]}koffer|aufbau)dach|(?:mittel|eck|steck)?runge(?:n)?|boden\s+(?:im|vom|des|der|in\s+(?:der|dem|den))${__T[7]}${__T[16]}laderaum|koffer|trailer|aufbau|k(?:ü|ue)hlkoffer|k(?:ü|ue)hlauflieger)|dach\s+(?:vom|des)${__T[7]}${__T[16]}koffer|aufbau))${__T[0]}|${__T[1]}(?:besch(?:ä|ae|a)digte|kaputte|gebrochene|verbogene|eingedr(?:ü|ue)ckte|morsche|durchgebrochene)(?:n|r|s)?\s+(?:(?:lade|laderaum${__T[25]}ae)nger|koffer|aufbau|holz|siebdruck)boden|ladefl(?:ä|ae)che|bodenplatten?|bodenbretter|bodenbrett|(?:seiten)?bordw(?:a|ä|ae)nd(?:e)?|seitenw(?:a|ä|ae)nd(?:e)?|stirnw(?:a|ä|ae)nd(?:e)?|r(?:ü|ue)ckw(?:a|ä|ae)nd(?:e)?|(?:koffer|aufbau)w(?:a|ä|ae)nd(?:e)?|${__T[16]}koffer|aufbau)dach|(?:mittel|eck|steck)?runge(?:n)?|boden\s+(?:im|vom|des|der|in\s+(?:der|dem|den))${__T[7]}${__T[16]}laderaum|koffer|trailer|aufbau|k(?:ü|ue)hlkoffer|k(?:ü|ue)hlauflieger)|dach\s+(?:vom|des)${__T[7]}${__T[16]}koffer|aufbau))${__T[0]}${__RX[81]}|${__T[5]}(?:(?:trailer|load(?:ing)?|cargo|box|body|wooden)\s+floor|floor\s?boards?|floor\s+(?:of|in)\s+the\s+(?:trailer|box|body|load\s+space|truck)|side\s?(?:boards?|walls?|panels?)|drop\s?sides?|tail\s?boards?|headboards?|bulkheads?|front\s+walls?|stanchions?|trailer\s+(?:walls?|sides?|body))(?![a-z])\s+(?:(?!not\s)\S+\s+){0,3}?(?:broken|cracked|damaged|bent|dented|holed|rotten|torn|split|smashed|punctured|caved\s+in|gave\s+way|giving\s+way|has\s+(?:a\s+)?holes?)(?![a-z])${__RX[81]}|${__T[5]}(?:hole|holes|crack|cracks)\s+in\s+the${__T[7]}(?:floor|side\s?wall|side\s?board|headboard|bulkhead)(?![a-z])(?!\s+mat)|${__T[5]}(?:broken|cracked|damaged|bent|rotten|dented)\s+(?:(?:trailer|load(?:ing)?|cargo|box|body|wooden)\s+floor|floor\s?boards?|floor\s+(?:of|in)\s+the\s+(?:trailer|box|body|load\s+space|truck)|side\s?(?:boards?|walls?|panels?)|drop\s?sides?|tail\s?boards?|headboards?|bulkheads?|front\s+walls?|stanchions?|trailer\s+(?:walls?|sides?|body))(?![a-z])|${__T[2]}(?:(?:підлог\S*|пол(?:ы|а|у)?)\s+(?:(?:в|у)\s+)?(?:причеп|напівпричеп|полуприцеп|прицеп|кузов|фургон|трейлер)\S*|борт(?:ик)?(?:а|и|ы|у)?${__T[6]}|стінк\S*\s+(?:причеп|напівпричеп|кузов|фургон)\S*|стенк\S*\s+(?:прицеп|полуприцеп|кузов|фургон)\S*)\s+${__T[9]}(?:злама[внл]|сломан|проломлен|пробит|пошкоджен|поврежден|погнут|вигнут|прогнил|гнил|тріснул|треснул|дірк|дыр|продавлен|вм['’ʼ]?ят|прогнув|прогнул|провалил|провалив)\S*(?![^.;!?]*(?:відремонт\S*|отремонт\S*|замінил\S*|замінен\S*|заменил\S*|заменен\S*|усунул\S*|устранил\S*|полагодил\S*|починил\S*|зварил\S*|заварил\S*))|${__T[1]}(?:runge|rungen|einstecklatte|einstecklatten|einsteckbretter|einsteckbrett)${__T[0]}\s+(?:(?:hinten|vorne|vorn|links|rechts|ist|sind|eine|einer|komplett|ganz|schon)\s+){0,2}(?:gebrochen|abgebrochen|kaputt|gesplittert)${__T[0]}(?!\s+(?:mehr\s+)?nicht)${__RX[27]}|${__T[1]}(?:loch|l(?:ö|oe)cher|riss)\s+im\s+(?:lade)?boden${__T[0]}${__RX[27]}`, 'i', 1);
const FLOOR2_HINT = lbRx(String.raw`${__T[10]}geschwei(?:ß|ss)t|geflickt|gerichtet|funktioniert\s+wieder|geht\s+wieder|wieder\s+(?:ok|in\s+ordnung|fest|da|dran)|nicht\s+mehr|kein(?:e|en)?\s+(?:loch|l(?:ö|oe)cher|riss)${__T[23]}welded|sorted|no\s+longer${__T[11]}заменил\S*|полагодил\S*|починил\S*${__T[22]}(?:${__T[1]}(?:seiten|mittel|eck|steck|einsteck)?runge(?:n)?${__T[0]}\s+${__T[8]}(?:locker|lose|wackel(?:t|n)|steck(?:t|en)\s+fest|(?:geht|gehen)${__T[7]}${__T[13]}(?:raus|heraus|rein|hinein|ab)|l(?:ä|ae|a)(?:ss|ß)t\s+sich${__T[7]}${__T[13]}(?:\S+\s+)?(?:ziehen|rausziehen|herausziehen|stecken|einstecken|l(?:ö|oe)sen|entfernen))${__T[0]}|${__T[1]}(?<!(?:mein|meine|dein|sein|ihr|unser)\s+)(?:koffer(?:wand|aufbau|dach)?|aufbau(?:wand)?|(?:wand|dach)\s+(?:vom|des)\s+${__T[16]}koffer|trailer)s?)${__T[0]}\s+(?:(?:hat|mit)\s+)?(?:(?:ein|einen|nen|n|gro(?:ß|ss)e[ns]?|kleine[ns]?|mehrere|zwei)\s+)?(?:loch|l(?:ö|oe)cher|riss|risse)${__T[0]}|${__T[1]}(?:einsteck|lade|bord|holz)?latte(?:n)?${__T[0]}\s+(?:(?:sind|ist|hinten|links|rechts|seitlich|zwei|drei|mehrere|einige)\s+){0,2}(?:fehlen|fehlt|weg|gebrochen|abgebrochen|durchgebrochen|kaputt|gesplittert|zersplittert|morsch)${__T[0]}|${__T[5]}(?:slats?|stanchions?|side\s+posts?)${__T[7]}(?:missing|broken|snapped|loose|stuck|bent|cracked)(?![a-z])|${__T[5]}(?:hole|holes|tear|crack)\s+in\s+(?:the\s+)?(?:box\s+body|body\s+wall|trailer\s+(?:wall|roof)|box\s+(?:wall|roof))(?![a-z]))`, 'i', 1);

const GREASE_HINT = lbRx(String.raw`${__T[1]}(?:zentralschmier(?:ung|anlage|pumpe|system)|zentralschmierungsanlage|schmieranlage|schmierpumpe|schmiersystem|fettpumpe|fettbeh(?:ä|ae)lter|fettvorrat)${__T[0]}(?![^.;!?]*(?:beim\s+service|in\s+der\s+werkstatt|behoben|repariert))\s+${__T[9]}(?:leer|fast\s+leer|fehler\S*|st(?:ö|oe)rung|defekt|kaputt|ausgefallen${__T[27]}f(?:ö|oe)rdert\s+nicht|pumpt\s+nicht|warnung|blinkt|leuchtet|nachf(?:ü|ue)llen|nachgef(?:ü|ue)llt|aufgef(?:ü|ue)llt)${__T[0]}|${__T[1]}(?:sattelplatte|sattelkupplung|k(?:ö|oe)nigszapfen)\S*\s+${__T[9]}(?:trocken|nicht${__T[7]}(?:gefettet|geschmiert|abgeschmiert)|ungefettet|ohne\s+fett|muss${__T[7]}(?:gefettet|abgeschmiert)\s+werden)${__T[0]}${__T[39]}central\s+lubrication(?:\s+system)?|auto[\s-]?lube|grease\s+(?:pump|reservoir|system)|lubrication\s+(?:pump|system))\s+${__T[9]}(?:empty|low|fault|error|warning|failed|failure|not\s+working|broken)${__T[24]}fifth[\s-]wheel(?:\s+plate)?\s+${__T[8]}(?:dry|not\s+greased|needs\s+greas\S*|without\s+grease)(?![a-z])|${__T[4]}(?:(?:централізован|центральн)\S*\s+(?:змащ|смаз)\S*|(?:систем|насос)\S*\s+(?:змащ|смаз)\S*)\s+${__T[9]}(?:порожн\S*|пуст\S*|помилк\S*|ошибк\S*|несправн\S*|не\s+працю\S*|не\s+работ\S*|злама[вл]\S*|сломал\S*)${__RX[82]}|${__T[4]}(?:плит\S*\s+)?(?:сідл\S*|седл\S*)\s+${__T[9]}(?:сух\S*|не\s+змащ\S*|без\s+мастил\S*|не\s+смаз\S*)${__RX[82]}|(?:${__T[2]}авто(?:змащ|змаз|смаз)\S*\s+${__T[8]}(?:порожн\S*|пуст\S*|помилк\S*|ошибк\S*|несправн\S*|неисправ\S*|не\s+працю\S*|не\s+работ\S*|злама[вл]\S*|сломал\S*)|${__T[2]}${__T[36]})\s+(?:змащенн\S*|смазк\S*|мастил\S*)\s+(?:на\s+)?(?:сідл\S*|седл\S*)|${__T[2]}(?:змащенн\S*|смазк\S*|мастил\S*)\s+(?:на\s+)?(?:сідл\S*|седл\S*)\s+${__T[36]}${__T[37]}\S*))${__RX[83]}`, 'i', 1);


const ELEC_HINT = lbRx(String.raw`${__T[1]}(?:(?:strom|batterie|masse|plus|anh(?:ä|ae|a)nger|auflieger|spiral|verbindungs|licht|lampen|elektro|(?:abs|ebs)[\s-]?)?kabel(?:baum|b(?:ä|ae)ume|strang|str(?:ä|ae)nge|n|s)?|verkabelung|elektrik|spirale|wendel(?:kabel)?|batteriepol(?:e)?|polklemme(?:n)?|(?:anh(?:ä|ae|a)nger|auflieger)(?:stecker|steckdose)|(?:stecker|steckdose)\s+(?:(?:am|vom|zum|des|der)\s+)?(?:anh(?:ä|ae|a)nger|auflieger)\S*)${__T[0]}(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|angefressen|angebissen|abgebissen|angeknabbert))\s+${__T[9]}(?:blank|liegt${__T[7]}frei|durchgescheuert|aufgescheuert|angescheuert|gescheuert|scheuert|schmort|schmoren|angeschmort|verschmort|geschmolzen|eingeklemmt|gequetscht|abgerissen|gerissen|lose|locker|h(?:ä|ae)ngt${__T[7]}(?:herunter|runter|lose)|korrodiert|oxidiert|defekt|kaputt|spinnt|funkt|wackelkontakt|kurzschluss)${__T[0]}|${__T[1]}(?:kurzschluss|kabelbrand|schmorstelle)${__T[0]}(?![^.;!?]*(?:behoben|repariert))|${__T[1]}sicherung(?:en)?${__T[0]}\s+${__T[9]}(?:fliegt|fliegen|knallt|brennt${__T[7]}durch|brennen${__T[7]}durch|springt${__T[7]}(?:raus|heraus)|l(?:ö|oe)st${__T[7]}aus|durchgebrannt)${__T[0]}${__T[39]}exposed|bare|chafed|frayed|melted|loose|damaged)${__T[7]}(?:wires?|wiring|cables?|harness)${__T[24]}(?<!(?:tir|customs)\s+)(?:wires?|wiring|cables?|(?:wiring\s+)?harness|trailer\s+(?:cable|lead|plug|socket|connector)s?|suzie|susie)\s+${__T[8]}(?:exposed|bare|chafed|frayed|melt\S*|burnt|torn|ripped|damaged|broken|hanging\s+(?:down|loose))${__T[24]}fuses?\s+${__T[8]}(?:keeps?\s+blowing|blow(?:s|ing)|blown)${__T[24]}short\s+circuit|${__T[4]}(?:кабел\S*|провод\S*|проводк\S*|джгут\S*|спірал\S*|розетк\S*\s+причеп\S*)\s+${__T[9]}(?:оголен\S*|оголив\S*|перетерт\S*|протерт\S*|розплавив\S*|оплавив\S*|оплавлен\S*|обірван\S*|обірвав\S*|відірван\S*|відірвав\S*|звиса\S*|пошкоджен\S*|плавиться)|${__T[4]}запобіжник\S*\s+${__T[8]}(?:вибива\S*|перегора\S*|згорів|згора\S*)|${__T[4]}(?:коротк\S*\s+замикан\S*|замикання)|${__RX[7]}${__T[2]}(?:роз['’]?єм\S*|розетк\S*|разъ[её]м\S*|штекер\S*|вилк\S*)${__T[7]}(?:причеп\S*|напівпричеп\S*|прицеп\S*|полуприцеп\S*)${__T[7]}(?:злама\S*|слома\S*${__T[15]}згорі\S*|сгоре\S*|обірва\S*|оборва\S*|розбит\S*|разбит\S*)${__RX[7]}|${__RX[8]}${__T[2]}(?:дріт|дроти|провід|проводи|провод\S*|кабел\S*|джгут\S*|жгут\S*)${__T[7]}(?:перетер\S*|протер\S*|обгорі\S*|обгоре\S*|оплави\S*)${__RX[8]}|(?:${__T[1]}steckdose\S*\s+${__T[8]}(?:am|vom|des|an\s+der|an\s+dem)\s+(?:anh(?:ä|ae)nger|auflieger|trailer)\S*${__T[7]}(?:verbrannt|verschmort|kaputt|defekt|abgebrochen|locker|wackelt|korrodiert|gebrochen)|(?<![a-zäöüß0-9-])(?:7|13|15)[\s-]?polig\S*${__T[7]}(?:stecker|steckdose|kabel|spirale)\S*${__T[7]}(?:defekt|kaputt|locker|abgebrochen|verbrannt|verschmort|wackelt|gebrochen|abgerissen)|${__T[2]}спіральн\S*\s+(?:кабел|провод|шнур)\S*${__T[7]}(?:порвав\S*|порван\S*|пошкодж\S*|обірва\S*|оборва\S*|перетер\S*|зламав\S*|зламан\S*)|${__T[2]}фішк\S*\s+${__T[8]}(?:зламан\S*|зламал\S*|згорі\S*|оплав\S*|розбит\S*|тріснул\S*|сломан\S*|сгорел\S*))${__RX[11]}|(?:${__T[2]}(?:дріт|дроти|провід|проводи|провод\S*|кабел\S*|джгут\S*|жгут\S*|спірал\S*|спирал\S*)${__T[7]}(?:оголен\S*|оголил\S*|порва\S*|обірва\S*|оборва\S*)|${__T[2]}(?:оголен\S*|голий|голі|голый|голые)\s+(?:дріт|дроти|провід|проводи|провод\S*|кабел\S*)|${__T[2]}(?:запобіжник|предохранител)\S*\s+${__T[8]}(?:горить|горит|вибива\S*|выбива\S*|виліта\S*|вилета\S*|вылета\S*|згор\S*|сгор\S*|перегор\S*))${__RX[83]}`, 'i', 1);

const ELEC2_HINT = lbRx(String.raw`(?:${__T[1]}(?<!(?:gurt|plane|planen|ratsche|riemen|kette|seil)\S*${__T[7]})(?![^.;!?]*(?:gurt|plane|ratsche|kette|riemen|seil))(?:bord|batterie|betriebs|lade)?spannung\s+${__T[8]}(?:zu\s+(?:niedrig|gering|tief|hoch)|schwankt|f(?:ä|ae)llt${__T[7]}ab|bricht${__T[7]}ein|springt|stimmt\s+nicht|nur\s+(?:noch\s+)?\d+(?:[,.]\d+)?\s*(?:v|volt))${__T[0]}(?![^.;!?]*(?:gurt|plane|ratsche|kette|riemen|spanngurt))|${__T[1]}spannungswandler${__T[7]}(?:defekt|kaputt|geht\s+nicht|ausgefallen)|${__T[1]}(?:die\s+)?(?:elektrik|elektronik|bordelektrik|bordelektronik)\s+${__T[8]}(?:spinnt|spielt${__T[7]}verr(?:ü|ue)ckt|f(?:ä|ae)llt\s+${__T[8]}aus|ist${__T[7]}ausgefallen|macht${__T[7]}(?:probleme|zicken|faxen)|hat${__T[7]}(?:fehler|probleme|aussetzer)|geht${__T[7]}(?:aus|nicht)|funktioniert\s+(?:(?:gar|immer|oft|manchmal|zeitweise|teilweise)\s+)?nicht)${__T[0]}|${__T[1]}(?:alles\s+elektrische|ganze\s+elektrik|der\s+ganze\s+strom|strom\s+im\s+(?:lkw|fahrerhaus|fahrzeug))\s+${__T[8]}(?:f(?:ä|ae)llt${__T[7]}aus|geht${__T[7]}aus|weg|ist\s+weg|ausgefallen)${__T[0]}|${__T[1]}(?:strom|stromausfall)\s+(?:im|am)\s+(?:lkw|fahrerhaus|fahrzeug${__T[25]}ae|a)nger)|${__T[5]}(?:blown|burnt|burned)\s+(?:out\s+)?fuses?(?![a-z])|${__T[5]}fuses?${__T[7]}(?:blown|blew|burnt|burned\s+out|keep\s+going)(?![a-z])|${__T[5]}(?:electrics|electronics|electrical\s+system)\s+${__T[8]}(?:playing\s+up|acting\s+up|going\s+crazy|cutting\s+out|failing|keep\s+failing|dead|faulty|not\s+working)(?![a-z])|${__T[5]}(?:voltage|battery\s+voltage)${__T[7]}(?:too\s+low|low|dropping|drops|fluctuat\S*|unstable)(?![a-z])|${__T[2]}(?:електрик|електронік|электрик|электроник|проводк)\S*${__T[7]}(?:глюч\S*|барахл\S*${__T[15]}вируб\S*|выруб\S*|відмов\S*|отказ\S*|пропада\S*|зника\S*)${__T[6]}|${__T[2]}(?:напруг|напряжени)\S*${__T[7]}(?:низьк\S*|низк\S*|пада\S*|стрибає|скаче\S*|скач\S*)${__T[6]})${__T[10]}nicht\s+mehr${__T[26]}in\s+ordnung|normal)${__T[23]}sorted|no\s+longer${__T[11]}заменил\S*|усунул\S*|устранил\S*|полагодил\S*|починил\S*${__T[22]}`, 'i', 1);



const ELEC3_HINT = lbRx(String.raw`(?:${__T[2]}(?:коротк\S*\s+замыкани\S*|замыкани\S*\s+(?:в|у)\s+(?:проводк|електропроводк|электропроводк|ланцюз|цеп)\S*)|${__T[2]}(?:постійно\s+|постоянно\s+|весь\s+час\s+|все\s+время\s+|знову\s+|снова\s+|опять\s+)?(?:перегора\S*|вибива\S*|выбива\S*|згорів|згора\S*|сгорел\S*|сгора\S*)${__T[7]}(?:запобіжник\S*|предохранител\S*)|${__T[2]}предохранител\S*\s+${__T[8]}(?:выбива\S*|перегора\S*|сгора\S*)|${__T[2]}(?:клем\S*|контакт\S*\s+(?:на\s+)?(?:акб|аккумулятор\S*|акумулятор\S*|батаре\S*))\s+${__T[8]}(?<!не\s)(?:окисл\S*|окисли\S*|окислил\S*|окиснил\S*|окисни\S*|відпал\S*|отвал\S*|болта\S*|бовта\S*|слетел\S*|злетіл\S*|соскочил\S*|зіскочил\S*|сгнил\S*|згнил\S*|оплав\S*|расплав\S*|розплав\S*|в\s+нал(?:[её]те|ьоті)|позелен\S*|поржав\S*|іржав\S*)${__T[6]}|${__T[2]}(?:окислил\S*|окиснил\S*|отвалил\S*|відпал\S*|слетел\S*|злетіл\S*|оплавил\S*|розплавил\S*)${__T[7]}клем\S*)${__T[10]}fixed|repaired|replaced${__T[12]}замінив\S*|полагодил\S*${__T[29]}починил\S*|усунул\S*|устранил\S*|почистил\S*|зачистил\S*|затянул\S*|подтянул\S*|підтягнул\S*))`, 'i', 1);


const BATT_HINT = lbRx(String.raw`${__T[1]}(?:(?:starter|lkw-?|fahrzeug|anh(?:ä|ae|a)nger)?batterie(?:n)?)${__T[0]}${__RX[84]}\s+${__T[9]}(?:ausgelaufen|l(?:ä|ae|a)uft\s+aus|undicht|leckt|tropft|s(?:ä|ae|a)ure|gast|zischt|stinkt|riecht|aufgebl(?:ä|ae|a)ht|bl(?:ä|ae|a)ht${__T[7]}auf|gew(?:ö|oe|o)lbt|ausgebeult|sehr\s+hei(?:ß|ss)|hei(?:ß|ss)|kocht|blubbert|gerissen|gebrochen|geplatzt|explodiert)${__T[0]}|${__T[1]}(?:batteries(?:ä|ae|a)ure|s(?:ä|ae|a)ure\s+(?:aus|an|von)\s+(?:der\s+)?batterie)${__T[0]}${__RX[84]}|${__T[1]}(?:batterie(?:kasten|k(?:ä|ae|a)sten|fach|deckel|kastendeckel|abdeckung|halter(?:ung)?))${__T[0]}${__RX[84]}\s+${__T[9]}(?:fehlt|fehlen|weg${__T[0]}|verloren|offen|steht\s+offen|lose|locker|klappert|kaputt|defekt|gebrochen|abgebrochen|abgerissen|gerissen|geht${__T[7]}${__T[13]}zu|schlie(?:ß|ss)t\s+nicht|h(?:ä|ae|a)lt\s+nicht)${__T[0]}|${__T[1]}(?:batterie(?:haupt|trenn)?schalter|batterietrenner|hauptschalter|trennschalter)${__T[0]}${__RX[84]}\s+${__T[9]}(?:defekt|kaputt|klemmt|abgebrochen|geht${__T[7]}nicht|funktioniert${__T[7]}nicht|schaltet${__T[7]}nicht|l(?:ä|ae|a)sst\s+sich${__T[7]}${__T[13]}(?:\S+\s+)?(?:einschalten|ausschalten|drehen|bet(?:ä|ae|a)tigen|umlegen|schalten))${__T[0]}${__T[39]}truck\s+)?batter(?:y|ies)${__T[41]}))\s+${__T[8]}(?:leak\S*|acid|swollen|swelling|bulging|hissing|gassing|smells?|smelling|stinks?|cracked|boiling|(?:very\s+)?hot|overheat\S*)${__T[41]}))|(?<![a-z])battery\s+acid${__T[24]}battery\s+(?:box|cover|lid|compartment)s?\s+${__T[8]}(?:missing|gone|lost|open|loose|broken|cracked|won['’]?t\s+close)${__T[24]}(?:battery\s+)?(?:isolator|master|main|disconnect|cut-?off)\s+switch\s+${__T[8]}(?:broken|faulty|stuck|not\s+working|doesn['’]?t\s+work|won['’]?t\s+(?:turn|switch|move))(?![a-z])|${__T[4]}(?:акумулятор|аккумулятор|акб)\S*\s+${__T[9]}(?:тече|протіка\S*|протека\S*|потік|протік|потек|протек|потекл\S*|протекл\S*|кислот\S*|здув\S*|роздув\S*|вздул\S*|раздул\S*|шипить|шипит|смердить|воняє|воняет|пахне|пахнет|тріснув|тріснул\S*|треснул\S*|кипить|кипит|гаряч\S*|горяч\S*)|${__T[4]}кислот\S*\s+(?:з\s+|из\s+)?(?:акумулятор|аккумулятор)\S*|${__T[4]}(?:кришк\S*|ящик\S*|короб\S*)${__T[7]}(?:акумулятор|аккумулятор|акб)\S*\s+${__T[8]}${__T[36]}${__T[37]}\S*|відкрит\S*|открыт\S*${__T[30]}загуб\S*|потерял\S*|не\s+закрива\S*|бовта\S*|болта\S*)|${__T[4]}(?:вимикач\S*|выключател\S*)\s+(?:маси|массы|акумулятор\S*|аккумулятор\S*|акб)\s+${__T[8]}(?:${__T[43]}${__T[30]}сломал\S*|несправн\S*|неисправ\S*|заїло|заело|не\s+вмика\S*|не\s+включа\S*|не\s+вимика\S*|не\s+выключа\S*)`, 'i', 1);
const SPARE_HINT = lbRx(String.raw`${__T[1]}(?:ersatzrad|reserverad|ersatzreifen|reservereifen)(?:es|s)?${__T[0]}${__RX[85]}\s+${__T[9]}(?:fehlt|fehlen|weg${__T[0]}|${__T[13]}(?:da|vorhanden|an\s+bord|dabei)${__T[0]}|platt|luftleer|ohne\s+luft|hat\s+keine\s+luft|kaputt|defekt|besch(?:ä|ae|a)digt|abgefahren|por(?:ö|oe)s|rissig|unbrauchbar|klemmt|passt\s+nicht)${__T[0]}|${__T[1]}(?:kein|keinen|ohne)\s+(?:ersatzrad|reserverad|ersatzreifen|reservereifen)(?:es|s)?${__T[0]}${__RX[85]}|${__T[1]}(?:ersatzrad|reserverad)(?:halter|halterung|winde|korb|tr(?:ä|ae|a)ger)(?:s|n)?${__T[0]}${__RX[85]}\s+${__T[9]}(?:klemmt|hakt|eingerostet|festgerostet|fest${__T[0]}|kaputt|defekt|geht\s+nicht\s+(?:auf|runter|herunter|ab)|l(?:ä|ae|a)(?:ss|ß)t\s+sich\s+nicht${__T[7]}(?:(?:ö|oe)ffnen|ablassen|herunterlassen|l(?:ö|oe)sen|kurbeln))${__T[0]}|${__T[5]}spare\s+(?:wheel|tyre|tire)s?(?:\s+(?:carrier|winch|cradle))?${__RX[85]}\s+${__T[8]}(?:missing|gone|flat|damaged|unusable|stuck|jammed|seized|not\s+there|won['’]?t\s+(?:come\s+)?(?:down|off|open))(?![a-z])|${__T[5]}(?:no|without(?:\s+a)?)\s+spare\s+(?:wheel|tyre|tire)(?![a-z])${__RX[85]}|${__T[4]}(?:запасн\S*\s+колес\S*|запаск\S*)${__RX[85]}\s+${__T[8]}(?:відсутн|нема|спущ|пробит|пошкодж|злама[внл]|заклин|отсутств|поврежд|слома|нет(?![а-яіїєґ]))\S*|${__T[4]}(?:немає|нема|без|нет)\s+(?:запасн\S*\s+колес\S*|запаск\S*)${__RX[85]}`, 'i', 1);
const SERVICE_HINT = lbRx(String.raw`${__T[1]}(?<!(?:kein|keine|keinen|ohne)\s)(?:service|wartungs|inspektions|(?:ö|oe)lwechsel|(?:ö|oe)lservice|kundendienst)[-\s]?(?:anzeige|meldung|symbol|leuchte|lampe|erinnerung|warnung)(?:n)?${__T[0]}${__RX[86]}|${__T[1]}(?<!(?:kein|keine|keinen|ohne)\s)(?:service|wartung|inspektion|(?:ö|oe)lwechsel|(?:ö|oe)lservice|kundendienst)${__T[0]}${__RX[86]}${__T[44]}f(?:ä|ae)llig|(?:ü|ue)berf(?:ä|ae)llig|(?:ü|ue)berzogen|(?:ü|ue)berschritten|abgelaufen)${__T[0]}|${__T[1]}schraubenschl(?:ü|ue)ssel(?:-?symbol)?${__T[0]}(?![^.;!?]*(?:erledigt|gemacht|durchgef(?:ü|ue)hrt|zur(?:ü|ue)ckgesetzt|behoben|repariert))\s+${__T[9]}(?:leuchtet|blinkt|erscheint|angezeigt|im\s+display|ist\s+an)${__T[0]}|${__T[5]}(?<!no\s)(?:service|maintenance|inspection|oil\s+change|spanner|wrench)\s+(?:light|indicator|warning|reminder|symbol|icon|message)(?![a-z])${__RX[87]}|${__T[5]}(?:service|maintenance|inspection|oil\s+change)\s+(?:is\s+|now\s+|already\s+|long\s+)?(?:due|overdue|required)(?![a-z])${__RX[87]}|(?<![а-яіїєґё-])(?:сервіс\S*|сервис\S*|техобслуговуван\S*|техобслуживан\S*|(?:заміна|заміну|замена|замену)\s+масла)\s+${__T[8]}(?:потрібн\S*|потрібен|треба|пора|нужн\S*|необхідн\S*|необходим\S*|прострочен\S*|просрочен\S*|горить|горит|світиться|светится)${__T[6]}${__RX[88]}|(?<![а-яіїєґё-])(?:пора|треба|потрібн\S*|потрібен|нужн\S*|надо)${__T[7]}(?:на\s+)?(?:то|техобслуговуван\S*|техобслуживан\S*|сервіс|сервис|заміну\s+масла|замену\s+масла)${__T[6]}${__RX[88]}`, 'i', 1);

const AIRBAG_HINT = lbRx(String.raw`${__T[1]}(?<!(?:kein|keine|keinen|ohne)\s)(?:(?:fahrer|beifahrer|seiten|kopf|vorhang|knie|lenkrad)?-?airbags?|gurtstraffer|gurtstrammer)${__T[0]}${__RX[89]}\s+${__T[9]}(?<!(?:nicht|nie|kein|keine|keinen|ohne|not|no|never|не|ні|без)\s)(?:ausgel(?:ö|oe|o)st|aufgegangen|ging\s+auf|gingen\s+auf|ist\s+raus|aufgeblasen|geplatzt|geknallt|hat\s+gezündet|gez(?:ü|ue)ndet|ausgefahren)${__T[0]}|${__T[1]}(?<!(?:nicht|kein|keine|keinen|ohne)\s)(?:ausgel(?:ö|oe|o)ste[rn]?|aufgegangene[rn]?)\s+(?:(?:fahrer|beifahrer|seiten|kopf|vorhang|knie|lenkrad)?-?airbags?|gurtstraffer)${__T[0]}${__RX[89]}|${__T[5]}(?<!no\s)(?:airbags?|(?:seat\s*belt|belt)\s+pretensioners?)${__T[41]}))\s+${__T[9]}(?<!(?:not|never|n't)\s)(?:deployed|went\s+off|has\s+gone\s+off|popped(?:\s+out)?|blew\s+up|fired|triggered|inflated)(?![a-z])|${__T[2]}(?<!не\s)(?:спрацювал[аио]?|вистрілил[аио]?|розкрил(?:ась|ися|ася)|сработал[аио]?|выстрелил[аио]?|раскрыл(?:ась|ись|ся))\s+${__T[8]}(?:подушк[аиі]\s+безпеки|подушк[аи]\s+безопасности|ейрбег\S*|аірбег\S*|эйрбег\S*|айрбег\S*|натяжувач\S*|натяжител\S*)|${__T[2]}(?:подушк[аиі]\s+безпеки|подушк[аи]\s+безопасности|ейрбег\S*|аірбег\S*|эйрбег\S*|айрбег\S*|натяжувач\S*\s+(?:ременя|ременів)|натяжител\S*\s+(?:ремня|ремней))(?![^.;!?]*(?:відремонт\S*|замінил\S*|замінен\S*${__T[29]}заменен\S*))\s+${__T[8]}(?<!не\s)(?:спрацювал[аио]?|вистрілил[аио]?|розкрил(?:ась|ися|ася)|сработал[аио]?|выстрелил[аио]?|раскрыл(?:ась|ись|ся))${__T[6]}`, 'i', 1);

const WATERFUEL_HINT = lbRx(String.raw`${__T[1]}(?<!(?:kein|keine|ohne|nicht)\s)wasser\s+(?:im|in\s+(?:der|dem|den))\s+(?:diesel|dieseltank|kraftstoff|kraftstofftank|tank|sprit|treibstoff|kraftstofffilter|dieselfilter|kraftstoffsystem|einspritzung|einspritzanlage|dieselleitung|kraftstoffleitung)${__T[0]}${__RX[90]}|${__T[1]}(?:wasserabscheider|wasser-im-kraftstoff|wasser-im-diesel|wassersensor)(?:s)?${__T[0]}${__RX[90]}(?:\s+${__T[9]}(?:voll|warnung|warnt|leuchte|leuchtet|lampe|anzeige|symbol|meldung|blinkt|ist\s+an|alarm|piept|fehler|st(?:ö|oe)rung))${__T[0]}|${__T[1]}(?:kraftstofffilter|dieselfilter)\s+(?:\S+\s+){0,1}?wasser(?:symbol|anzeige|warnung)?${__T[0]}${__RX[90]}|${__T[5]}(?<!no\s)water\s+in\s+(?:the\s+)?(?:fuel|diesel|tank|fuel\s+filter|fuel\s+system)(?![a-z])(?![^.;!?]*(?:drained|fixed|replaced))|${__T[5]}water\s+separator(?![a-z])(?![^.;!?]*(?:drained|fixed|replaced))\s+${__T[8]}(?:full|warning|light|alarm|on)(?![a-z])|${__T[2]}(?<!${__T[36]}|без)\s)вод[аиу]\s+(?:в|у)\s+(?:паливі|пальному|дизелі|баку|паливному\s+фільтрі|топливе|солярке|дизеле|баке|топливном\s+фильтре)${__T[6]}${__RX[91]}|${__T[2]}(?:в|у)\s+(?:паливі|пальному|дизелі|баку|паливному\s+фільтрі|топливе|солярке|дизеле|баке|топливном\s+фильтре)\s+(?:\S+\s+){0,1}?(?<!${__T[36]}|без)\s)вод[аи]${__T[6]}${__RX[91]}`, 'i', 1);

const OVERLOAD_HINT = lbRx(String.raw`${__T[1]}(?<!(?:nicht|kein|keine|nie)\s)(?:(?:ü|ue)berladen(?:e[rsnm]?)?|(?:ü|ue)berladung|(?:ü|ue)bergewicht)${__T[0]}|${__T[1]}(?:achslast\S*|achsgewicht\S*|gesamtgewicht\S*|zgg|gewicht|vorderachse|hinterachse|antriebsachse)\s+${__T[9]}(?:(?<!nicht\s)(?:ü|ue)berschritten|zu\s+hoch|zu\s+schwer)${__T[0]}|${__T[1]}zu\s+schwer\s+(?:be|ge)?laden${__T[0]}|${__T[1]}(?:ü|ue)berschreitung\s+(?:der\s+|des\s+)?(?:zul\S*\s+)?(?:achslast\S*|gesamtgewicht\S*)|${__T[5]}(?<!(?:not|never|clutch)\s)(?:overloaded|overweight)(?![a-z])|${__T[5]}(?:axle\s+(?:weight|load)s?|gross\s+(?:vehicle\s+)?weight|gvw)\s+${__T[8]}(?<!not\s)(?:exceeded|too\s+high|over\s+the\s+limit)(?![a-z])|${__T[5]}over\s+(?:the\s+)?(?:axle|weight)\s+limit|${__T[2]}(?<!(?:не|зчеплення|сцепление)\s)(?:перевантажен(?:ий|а|е|о|і|ого|ому)${__T[6]}|перевантаження\s+(?:на\s+)?(?:вісь|осі|осей)${__T[6]}|перегруз(?:[аеу])?${__T[6]}|перегружен\S*)|${__T[2]}(?:перевищен\S*|превышен\S*)${__T[7]}(?:осьов\S*|осев\S*|навантаженн\S*\s+на\s+(?:віс|вісь|осі)\S*|нагрузк\S*\s+на\s+ос\S*|допустим\S*${__T[7]}(?:мас\S*|вага\S*|вес\S*))|${__T[2]}(?:осьов\S*\s+навантаженн\S*|осев\S*\s+нагрузк\S*|нагрузк\S*\s+на\s+ос\S*)${__T[7]}(?:перевищен\S*|превышен\S*)`, 'i', 1);

const NOISE_HINT = lbRx(String.raw`^(?![\s\S]*(?:radio|handy|funkger|funk\s|navi|tablet|lautsprecher|telefon|phone|speaker|kopfh|headset|радіо|радио|телефон|рація|рация))[\s\S]*?(?:${__T[1]}(?<!(?:kein|keine|keinerlei|ohne|nie)\s)(?:ger(?:ä|ae)usch(?:e|en)?|\S+ger(?:ä|ae)usch(?:e|en)?|l(?:ä|ae)rm)${__T[0]}|${__T[1]}(?:quietscht|quietschen|schleift|schleifen|klackert|klackern|rasselt|rasseln|pfeift|pfeifen|brummt|brummen|knackt|knacken|knarzt|knarzen|knirscht|knirschen|heult|heulen|rumpelt|rumpeln|kreischt|kreischen|surrt|surren)${__T[0]}|${__T[5]}(?<!(?:no|without)\s)(?:noise|noises|noisy|squeal\S*|squeak\S*|grinding|grinds|rattl\S*|knocking|knocks|whining|whines|whistl\S*|clunk\S*|rumbl\S*|screech\S*)(?![a-z])|${__T[2]}(?<!(?:без|немає|нет)\s)(?:звук|звуки|шум|шуми|шумы|шумить|шумит|стук\S*|скрип\S*|свист\S*|гул|гудіння|гудение|(?<!не\s)(?:гудит|гуде|гудить)|скреже\S*|скрегіт\S*|тріск(?!ачк)\S*|треск\S*|брязкіт|дребезж\S*|деренч\S*)${__T[6]})${__T[10]}nicht\s+mehr|(?:ist|sind)\s+weg|wieder\s+(?:ok|in\s+ordnung|ruhig)${__T[23]}no\s+longer|gone\s+now${__T[12]}отремонт\S*|заменил\S*|поменял\S*|помінял\S*|більше\s+не|больше\s+не|зник|пропал))`, 'i', 1);



const ALARM_HINT = lbRx(String.raw`^(?![\s\S]*(?:k(?:ü|ue)hl|reefer|aggregat|thermo\s?king|carrier|reifendruck|rdks|tpms|reifen|tyre|tire|rauch|feuer|smoke|fire|warner|assistent|assist|r(?:ü|ue)ckfahr|revers|back-?up|gurt|belt|wecker|clock|handy|phone|telefon|radio|tacho|рефриж|холод|шин|тиск|давлен|дим|дым|пожеж|пожар|аварійн|аварийн|ремін|ремен|будильн|телефон|задн\S*\s+хід|задн\S*\s+ход))[\s\S]*?(?:(?:${__T[1]}(?<!(?:kein|keine|keiner|ohne|nicht|no|without|без|немає|нет)\s)(?:alarm-?anlage\S*|diebstahl-?warnanlage\S*|dwa|alarmsirene\S*|innenraum(?:ü|ue)berwachung\S*|alarm\s+system\S*|(?:car|truck|lorry|vehicle|van|cab|anti-?theft|burglar|security)\s+alarm\S*)${__T[0]}|${__T[2]}(?<!(?:kein|keine|keiner|ohne|nicht|no|without|без|немає|нет)\s)(?:охоронн\S*\s+)?(?:сигналізац\S*|сигнализац\S*))${__RX[92]}|${__T[1]}(?:fehlalarm|false\s+alarm)${__T[0]}${__RX[92]}|${__T[1]}(?<!(?:kein|keine|keiner|ohne|nicht|no|without|без|немає|нет)\s)(?:alarm|fehlalarm|false\s+alarm)${__T[0]}[^.;!?]*?(?<![a-zäöüßа-яіїєґё])(?:geht|ging|gehen|losgeh\S*|losgegangen|l(?:ö|oe)st|ausgel(?:ö|oe)st|ausl(?:ö|oe)s\S*|heult|hupt|piep\S*|schrillt|spinnt|dauernd|st(?:ä|ae)ndig|grundlos|von\s+(?:allein|selbst)|ohne\s+grund|go(?:es|ing)?\s+off|went\s+off|keeps?|kept|triggered|sound(?:s|ing|ed)|won['’]?t\s+stop|going|beep\S*|for\s+no\s+reason|спрацьов\S*|спрацювал\S*|срабатыва\S*|сработал\S*|вмика\S*|включа\S*|вил\S*|орет|кричить|верещ\S*|пищ\S*)${__RX[92]}|(?<![a-zäöüßа-яіїєґё])(?:geht|ging|gehen|losgeh\S*|losgegangen|l(?:ö|oe)st|ausgel(?:ö|oe)st|ausl(?:ö|oe)s\S*|heult|hupt|piep\S*|schrillt|spinnt|dauernd|st(?:ä|ae)ndig|grundlos|von\s+(?:allein|selbst)|ohne\s+grund|go(?:es|ing)?\s+off|went\s+off|keeps?|kept|triggered|sound(?:s|ing|ed)|won['’]?t\s+stop|going|beep\S*|for\s+no\s+reason|спрацьов\S*|спрацювал\S*|срабатыва\S*|сработал\S*|вмика\S*|включа\S*|вил\S*|орет|кричить|верещ\S*|пищ\S*)[^.;!?]*?${__T[1]}(?<!(?:kein|keine|keiner|ohne|nicht|no|without|без|немає|нет)\s)(?:alarm|fehlalarm|false\s+alarm)${__T[0]}${__RX[92]})`, 'i', 1);
const HINT_ORDER = ['fire', 'acc', 'wild', 'hitrun', 'vandal', 'storm', 'bridge', 'fixobj', 'stow', 'roofice', 'trlr', 'exhaust', 'flat', 'tyre', 'wheel', 'brake', 'parkbrake', 'pedal', 'steer', 'vibr', 'noise', 'coupling', 'grease', 'cabtilt', 'susp', 'step', 'injury', 'airbag', 'loose', 'underrun', 'overload', 'load', 'lashgear', 'deck', 'floor', 'leak', 'pfilter', 'warnlight', 'marten', 'gelfuel', 'waterfuel', 'elec', 'batt', 'engine', 'oillevel', 'gear', 'service', 'dash', 'telem', 'adas', 'seat', 'cabkit', 'mirror', 'lights', 'contour', 'visib', 'climate', 'door', 'window', 'cableak', 'cablock', 'pest', 'nest', 'engnest', 'stuck', 'safetykit', 'spare', 'roadchk', 'theft', 'tow', 'reefer', 'alarm', 'fuel', 'fuelcap', 'dryfuel', 'nostart', 'tarp', 'custdmg', 'cargo', 'glass', 'lost', 'numplate', 'sticker', 'fuelcard', 'toll', 'ticket', 'tacho'];
function groupHints(opened) {
  const sum = $('#hintsum'); if (!sum) return;
  const all = HINT_ORDER.map((id) => $('#' + id)).filter(Boolean);
  const vis = all.filter((p) => !p.hidden); const many = vis.length > 1;

  let prev = sum; if (vis.some((p) => { const ok = prev.nextElementSibling === p; prev = p; return !ok; })) sum.after(...vis);
  sum.hidden = !many; sum.textContent = many ? t('hint_group') : '';
  for (const p of all) {
    const pos = vis.indexOf(p); const fold = many && pos > 0 && !opened.has(p.id);
    const ul = p.querySelector('ul'); if (ul) ul.hidden = fold;
    let b = p.querySelector('[data-hintfold]');
    if (!many || pos < 1) { if (b) b.remove(); continue; }
    if (!b) {
      b = document.createElement('button'); b.type = 'button'; b.className = 'btn secondary small'; b.dataset.hintfold = '';
      b.style.cssText = 'display:block;margin-top:6px;white-space:nowrap'; p.append(b);
      b.onclick = () => { if (opened.has(p.id)) opened.delete(p.id); else opened.add(p.id); groupHints(opened); };
    }
    b.textContent = t(fold ? 'hint_show' : 'hint_hide'); b.setAttribute('aria-expanded', String(!fold));
  }
}

function srcInsp(si) {
  if (!si) return '';
  const late = si.received_at ? ` <span class="small muted">(${esc(t('insp_received_late').replace('{d}', fmtDT(si.received_at)))})</span>` : '';
  const km = si.odometer_km !== null && si.odometer_km !== undefined ? ` · ${esc(t('km'))} ${fmtKm(si.odometer_km)}` : '';

  const via = si.via ? ` · <span data-srcvia>${esc(t('srci_via').replace('{v}', `${t(si.via.kind === 'anhaenger' ? 'trailer' : 'truck')} ${si.via.plate}`))}</span>` : '';
  let h = `<dt>${esc(t('srci_lbl'))}</dt><dd data-srcinsp>${esc(t('srci_val').replace('{d}', fmtDT(si.performed_at)))}${late}${via}${km}</dd>`;
  if ('last_ok_at' in si) h += `<dt>${esc(t('srci_lastok'))}</dt><dd data-lastok>${si.last_ok_at ? esc(t('srci_val').replace('{d}', fmtDT(si.last_ok_at))) : `<span class="muted">${esc(t('srci_lastok_none'))}</span>`}<br><span class="small muted">${esc(t('srci_window'))}</span></dd>`;
  return h;
}

const takenFmt = (x) => `${fmtD(x.slice(0, 10))} ${x.slice(11, 16)}`;
function occLate(c) {
  const a = c.occurred_at.length === 10 ? c.occurred_at : BERLIN_FMT.format(new Date(c.occurred_at)); const b = BERLIN_FMT.format(new Date(c.created_at));
  const n = Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000);
  return n >= 1 ? ` <span class="chip${n >= 3 ? ' mittel' : ''}" data-occlate>${esc(t('occ_late').replace('{d}', nDays(n)))}</span>` : '';
}



function notMineHint(vs, id) {
  if (!S.me || S.me.role !== 'driver' || !id) return '';
  const mine = vs.filter((v) => v.assigned); const v = vs.find((x) => x.id === id);
  if (!mine.length || !v || v.assigned || (v.coupled && mine.some((m) => m.id === v.coupled.id))) return '';
  return `<div class="panel warn small" data-notmine role="status">${esc(t('notmine_hint').replace('{p}', mine.map((m) => m.plate).join(', ')))}</div>`;
}
function repAssign(a, vid) {
  if (!a) return '';
  return `<dt>${esc(t('rep_assign'))}</dt><dd data-repassign><span class="chip mittel">${esc(t('rep_assign_not'))}</span><ul class="small" style="margin:4px 0 0;padding-left:18px"><li>${a.own_plates.length ? esc(t('rep_assign_own').replace('{p}', a.own_plates.join(', '))) : esc(t('rep_assign_none'))}</li>${a.vehicle_drivers.length ? `<li>${esc(t('rep_assign_drv').replace('{n}', a.vehicle_drivers.join(', ')))}</li>` : ''}</ul><p class="small muted" style="margin:2px 0 0">${esc(t('rep_assign_hint'))} <a href="#/vehicles/${esc(vid)}" class="noprint">${esc(t('vehicle_file'))} ›</a></p></dd>`;
}
function occDrivers(o) {
  if (!o) return '';
  const row = (x) => `<li>${esc(x.display_name)} · ${x.basis === 'kontrolle' ? `${esc(t('occ_drv_check'))} ${fmtDT(x.at)}` : `${esc(t('occ_drv_assign'))} ${fmtD(x.at)} – ${x.until ? fmtD(x.until) : esc(t('occ_drv_open'))}`}${x.via_plate ? ` (${esc(t('occ_drv_via'))} ${esc(x.via_plate)})` : ''}</li>`;
  return `<dt>${esc(t('occ_drivers'))}</dt><dd data-occdrivers>${o.drivers.length ? `<ul class="small" style="margin:0;padding-left:18px">${o.drivers.map(row).join('')}</ul>` : `<span class="muted">${esc(t('occ_drv_none'))}</span>`}<p class="small muted" style="margin:2px 0 0">${esc(t(o.day_only ? 'occ_drv_hint_day' : 'occ_drv_hint'))}${o.truncated ? ' ' + esc(t('occ_drv_more')) : ''}</p></dd>`;
}


const HINT_LONG = 1000; const HINT_PAUSE = 300;





const HINT_RX_PART = 8000;
function rxAlts(s) {
  const top = []; let d = 0, cls = false, st = 0;
  for (let i = 0; i < s.length; i++) { const c = s[i]; if (c === '\\') { i++; continue; } if (cls) { if (c === ']') cls = false; continue; } if (c === '[') cls = true; else if (c === '(') d++; else if (c === ')') d--; else if (c === '|' && !d) { top.push(s.slice(st, i)); st = i + 1; } }
  top.push(s.slice(st));

  const wrapped = (a) => { if (!a.startsWith('(?:') || !a.endsWith(')')) return false; let k = 0, c2 = false; for (let i = 0; i < a.length - 1; i++) { const c = a[i]; if (c === '\\') { i++; continue; } if (c2) { if (c === ']') c2 = false; continue; } if (c === '[') c2 = true; else if (c === '(') k++; else if (c === ')' && --k === 0) return false; } return true; };
  return top.flatMap((a) => (a.length > HINT_RX_PART && wrapped(a) ? rxAlts(a.slice(3, -1)) : [a]));
}
function fastHint(rx) {
  if (rx.source.length <= HINT_RX_PART || rx.global || rx.sticky) return;
  const parts = []; let cur = '';
  for (const a of rxAlts(rx.source)) { if (cur && cur.length + a.length + 1 > HINT_RX_PART) { parts.push(cur); cur = a; } else cur = cur ? `${cur}|${a}` : a; }
  if (cur) parts.push(cur);
  const rs = parts.map((p) => new RegExp(p, rx.flags));
  rx.test = (s) => rs.some((r) => r.test(s));
}

fastHint(ENGINE_HINT); fastHint(NOSTART_HINT); fastHint(DOOR_HINT); fastHint(BRAKE_HINT); fastHint(TYRE_HINT); fastHint(GEAR_HINT); fastHint(WHEEL_HINT); fastHint(SUSP_HINT); fastHint(CABLEAK_HINT); fastHint(STEER_HINT); fastHint(LIGHTS_HINT); fastHint(TARP_HINT); fastHint(LEAK_HINT); fastHint(VISIB_HINT); fastHint(WARNLIGHT_HINT); fastHint(REEFER_HINT); fastHint(DASH_HINT);
const tfill = (k, o) => Object.entries(o).reduce((a, [x, y]) => a.split(`{${x}}`).join(String(y)), t(k));
async function viewNewMulti(...a) { return (await lazyModule('verwaltung')).viewNewMulti(...a); }
async function viewNew(preId) {
  if (!mayReport()) { render(`<h1>${esc(t('report_damage'))}</h1><p class="muted">${esc(t('no_permission_view'))}</p>`, 'new'); return; }
  const vs = await vehiclesCached();
  if (!vs.length) { render(`<h1>${esc(t('report_damage'))}</h1>${outboxBanner()}${noVehiclesNote()}`, 'new'); return; }
  const mine = vs.filter((v) => v.assigned);
  const others = vs.filter((v) => !v.assigned);
  const pick = (arr) => `<div class="vehpick">${arr.map((v) => `<label><input type="radio" name="veh" value="${esc(v.id)}" required>${plate(v.plate, { locked: v.availability === 'gesperrt' })}<span class="small muted">${v.kind === 'anhaenger' ? esc(t('vk_anhaenger')) + ' · ' : ''}${esc(v.site || '')}</span></label>`).join('')}</div>`;
  const ws = S.meta.workshops;
  render(`<h1>${esc(t('report_damage'))}</h1>${outboxBanner()}${helpLink('report')}${['owner', 'fleet'].includes(S.me.role) ? `<p class="small"><a href="#/new/multi" class="tap" id="tomulti">${esc(t('multi_link'))}</a></p>` : ''}<form id="f" novalidate>
    <label for="vq">${esc(t('choose_vehicle'))}</label><input id="vq" placeholder="SZ-…" autocomplete="off" style="margin-bottom:8px">
    ${mine.length ? `<h3>${esc(t('my_vehicles'))}</h3>${pick(mine)}<details><summary>${esc(t('other_vehicles'))}</summary>${pick(others)}</details>` : pick(vs)}
    <div id="known"></div><label for="d">${esc(t('what_wrong'))}<span class="hint">${esc(t('what_wrong_hint'))}</span></label><textarea id="d" required minlength="5" maxlength="4000"></textarea>
    <p id="hintsum" class="small muted" hidden role="status" style="margin:6px 0"></p>
    <div id="acc" class="panel" hidden role="status"><b>${esc(t('acc_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('acc_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    ${tachoPanel()}
    <div id="theft" class="panel" hidden role="status"><b>${esc(t('theft_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('theft_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="tow" class="panel" hidden role="status"><b>${esc(t('tow_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('tow_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="stow" class="panel" hidden role="status"><b>${esc(t('stow_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('stow_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="cargo" class="panel" hidden role="status"><b>${esc(t('cargo_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('cargo_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="roofice" class="panel" hidden role="status"><b>${esc(t('roofice_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('roofice_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="hitrun" class="panel" hidden role="status"><b>${esc(t('hitrun_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('hitrun_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="vandal" class="panel" hidden role="status"><b>${esc(t('vandal_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('vandal_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="marten" class="panel" hidden role="status"><b>${esc(t('marten_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('marten_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="storm" class="panel" hidden role="status"><b>${esc(t('storm_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('storm_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="bridge" class="panel" hidden role="status"><b>${esc(t('bridge_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('bridge_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="fixobj" class="panel" hidden role="status"><b>${esc(t('fixobj_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('fixobj_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    ${glassPanel()}
    <div id="wild" class="panel" hidden role="status"><b>${esc(t('wild_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('wild_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="fuel" class="panel" hidden role="status"><b>${esc(t('fuel_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('fuel_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul><p id="fueldrv" class="small" hidden style="margin:6px 0 0"></p></div>
    <div id="flat" class="panel" hidden role="status"><b>${esc(t('flat_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('flat_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="roadchk" class="panel" hidden role="status"><b>${esc(t('roadchk_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('roadchk_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="nostart" class="panel" hidden role="status"><b>${esc(t('nostart_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('nostart_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="pfilter" class="panel" hidden role="status"><b>${esc(t('pfilter_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('pfilter_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="warnlight" class="panel" hidden role="status"><b>${esc(t('warnlight_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('warnlight_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="leak" class="panel" hidden role="status"><b>${esc(t('leak_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('leak_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="custdmg" class="panel" hidden role="status"><b>${esc(t('custdmg_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('custdmg_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="fire" class="panel" hidden role="status"><b>${esc(t('fire_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('fire_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="reefer" class="panel" hidden role="status"><b>${esc(t('reefer_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('reefer_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="brake" class="panel" hidden role="status"><b>${esc(t('brake_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('brake_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="parkbrake" class="panel" hidden role="status"><b>${esc(t('parkbrake_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('parkbrake_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="pedal" class="panel" hidden role="status"><b>${esc(t('pedal_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('pedal_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="injury" class="panel" hidden role="status"><b>${esc(t('injury_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('injury_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="trlr" class="panel" hidden role="status"></div>
    <div id="tarp" class="panel" hidden role="status"><b>${esc(t('tarp_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('tarp_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="load" class="panel" hidden role="status"><b>${esc(t('load_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('load_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="mirror" class="panel" hidden role="status"><b>${esc(t('mirror_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('mirror_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="coupling" class="panel" hidden role="status"><b>${esc(t('coupling_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('coupling_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="grease" class="panel" hidden role="status"><b>${esc(t('grease_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('grease_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="lights" class="panel" hidden role="status"><b>${esc(t('lights_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('lights_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="contour" class="panel" hidden role="status"><b>${esc(t('contour_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('contour_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="door" class="panel" hidden role="status"><b>${esc(t('door_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('door_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="stuck" class="panel" hidden role="status"><b>${esc(t('stuck_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('stuck_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="visib" class="panel" hidden role="status"><b>${esc(t('visib_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('visib_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="step" class="panel" hidden role="status"><b>${esc(t('step_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('step_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="loose" class="panel" hidden role="status"><b>${esc(t('loose_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('loose_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="adas" class="panel" hidden role="status"><b>${esc(t('adas_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('adas_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="steer" class="panel" hidden role="status"><b>${esc(t('steer_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('steer_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="engine" class="panel" hidden role="status"><b>${esc(t('engine_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('engine_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="oillevel" class="panel" hidden role="status"><b>${esc(t('oillevel_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('oillevel_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="susp" class="panel" hidden role="status"><b>${esc(t('susp_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('susp_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="gear" class="panel" hidden role="status"><b>${esc(t('gear_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('gear_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="seat" class="panel" hidden role="status"><b>${esc(t('seat_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('seat_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="cabkit" class="panel" hidden role="status"><b>${esc(t('cabkit_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('cabkit_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="dash" class="panel" hidden role="status"><b>${esc(t('dash_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('dash_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="telem" class="panel" hidden role="status"><b>${esc(t('telem_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('telem_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="exhaust" class="panel" hidden role="status"><b>${esc(t('exhaust_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('exhaust_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="cabtilt" class="panel" hidden role="status"><b>${esc(t('cabtilt_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('cabtilt_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="gelfuel" class="panel" hidden role="status"><b>${esc(t('gelfuel_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('gelfuel_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="dryfuel" class="panel" hidden role="status"><b>${esc(t('dryfuel_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('dryfuel_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="elec" class="panel" hidden role="status"><b>${esc(t('elec_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('elec_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="batt" class="panel" hidden role="status"><b>${esc(t('batt_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('batt_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="safetykit" class="panel" hidden role="status"><b>${esc(t('safetykit_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('safetykit_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="airbag" class="panel" hidden role="status"><b>${esc(t('airbag_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('airbag_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="waterfuel" class="panel" hidden role="status"><b>${esc(t('waterfuel_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('waterfuel_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="overload" class="panel" hidden role="status"><b>${esc(t('overload_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('overload_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="alarm" class="panel" hidden role="status"><b>${esc(t('alarm_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('alarm_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="noise" class="panel" hidden role="status"><b>${esc(t('noise_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('noise_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="service" class="panel" hidden role="status"><b>${esc(t('service_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('service_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="spare" class="panel" hidden role="status"><b>${esc(t('spare_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('spare_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="wheel" class="panel" hidden role="status"><b>${esc(t('wheel_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('wheel_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="ticket" class="panel" hidden role="status"><b>${esc(t('ticket_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('ticket_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="toll" class="panel" hidden role="status"><b>${esc(t('toll_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('toll_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="climate" class="panel" hidden role="status"><b>${esc(t('climate_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('climate_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="window" class="panel" hidden role="status"><b>${esc(t('window_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('window_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="cableak" class="panel" hidden role="status"><b>${esc(t('cableak_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('cableak_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="pest" class="panel" hidden role="status"><b>${esc(t('pest_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('pest_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="nest" class="panel" hidden role="status"><b>${esc(t('nest_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('nest_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="engnest" class="panel" hidden role="status"><b>${esc(t('engnest_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('engnest_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="fuelcap" class="panel" hidden role="status"><b>${esc(t('fuelcap_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('fuelcap_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="fuelcard" class="panel" hidden role="status"><b>${esc(t('fuelcard_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('fuelcard_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="underrun" class="panel" hidden role="status"><b>${esc(t('underrun_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('underrun_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="tyre" class="panel" hidden role="status"><b>${esc(t('tyre_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('tyre_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="cablock" class="panel" hidden role="status"><b>${esc(t('cablock_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('cablock_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="vibr" class="panel" hidden role="status"><b>${esc(t('vibr_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('vibr_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="lashgear" class="panel" hidden role="status"><b>${esc(t('lashgear_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('lashgear_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="floor" class="panel" hidden role="status"><b>${esc(t('floor_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('floor_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="deck" class="panel" hidden role="status"><b>${esc(t('deck_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('deck_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="lost" class="panel" hidden role="status"><b>${esc(t('lost_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('lost_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="numplate" class="panel" hidden role="status"><b>${esc(t('numplate_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('numplate_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div id="sticker" class="panel" hidden role="status"><b>${esc(t('sticker_hint_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('sticker_hint_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <label id="lbl_prio">${esc(t('urgency'))}</label><div class="choices" role="radiogroup" aria-labelledby="lbl_prio">${['niedrig', 'mittel', 'kritisch'].map((p, i) => `<label class="choice c-${p}"><input type="radio" name="prio" value="${p}"${i === 0 ? ' checked' : ''}><span><b>${esc(t('prio_' + p))}</b><span class="small muted">${esc(t('prio_' + p + '_d'))}</span></span></label>`).join('')}</div>
    <label id="lbl_drv">${esc(t('driveable'))}</label><div class="choices" role="radiogroup" aria-labelledby="lbl_drv">${['fahrbereit', 'eingeschraenkt', 'nicht_fahrbereit', 'unbekannt'].map((p) => `<label class="choice${p === 'nicht_fahrbereit' ? ' c-kritisch' : ''}"><input type="radio" name="drv" value="${p}"${p === 'unbekannt' ? ' checked' : ''}><b>${esc(t('drv_' + p))}</b></label>`).join('')}</div>
    <label for="w">${esc(t('workshop'))}</label><select id="w"><option value="">–</option>${ws.map((w) => `<option value="${esc(w.code)}">${esc(wsLabel(w))}</option>`).join('')}</select>
    <label for="l">${esc(t('location'))}</label><input id="l" maxlength="300">
    ${occurredFields(null)}
    <label for="ph">${esc(t('photos_now'))}<span class="hint">${esc(t('photos_now_hint'))}</span></label><input type="file" id="ph" accept="image/jpeg,image/png,image/webp" multiple>
    <div id="phlater_w" hidden><label class="check" style="margin-top:6px"><input type="checkbox" id="phlater"> ${esc(t('photos_later_opt'))}</label><p class="small muted" style="margin:2px 0 0">${esc(t('photos_later_hint'))}</p></div>
    <div class="actions"><button class="btn block" id="sb">${esc(t('send_report'))}</button></div></form>`, 'new');

  if (mine.length === 1) { const r = $(`input[name=veh][value="${CSS.escape(mine[0].id)}"]`); if (r) r.checked = true; }

  if (preId) { const r = $(`input[name=veh][value="${CSS.escape(preId)}"]`); if (r) { r.checked = true; const det = r.closest('details'); if (det) det.open = true; r.closest('label').scrollIntoView({ block: 'center' }); } else toast(t('qr_vehicle_unknown'), true); }

  if (S.me.role === 'driver' && mine.length) {
    let known = null;
    const showKnown = () => { const sel = $('input[name=veh]:checked'); const box = $('#known'); if (!box) return; const v = known && sel && known.find((x) => x.id === sel.value);


      const cv = !v && known && sel ? coupledKnown(known, sel.value) : null;
      box.innerHTML = notMineHint(vs, sel && sel.value) + (v ? coupledAlert(v.coupled) + drvNotes(v.notes) + knownDefects(v.known_defects) + relItems(v.open_items_after_release) + coupledDefects(v.coupled) : cv ? `${cv.locked ? `<div class="alert" role="alert" style="margin-bottom:8px" data-cplocked><b>${esc(t('scan_locked'))}</b></div>` : ''}${drvNotes(cv.notes)}${knownDefects(cv.known_defects)}${relItems(cv.open_items_after_release)}` : ''); };
    showKnown();
    api('GET', '/api/me/vehicles').then((r) => { known = r.vehicles; showKnown(); }).catch(() => { known = myVehCached(); showKnown(); });
    $$('input[name=veh]').forEach((r) => r.addEventListener('change', showKnown));
  }


  if (S.me.role !== 'driver') {
    let seq = 0;
    const showOpen = async () => {
      const sel = $('input[name=veh]:checked'); const box = $('#known'); if (!box) return; const my = ++seq;
      if (!sel) { box.innerHTML = ''; return; }
      try {
        const r = await api('GET', `/api/cases?status=open&limit=50&vehicle_id=${encodeURIComponent(sel.value)}`);
        if (my !== seq) return;
        box.innerHTML = knownDefects((r.cases || []).map((c) => ({ id: c.id, description: c.description || '', priority: c.priority, status: c.status, created_at: c.created_at, check_item: c.check_item, planned_date: c.planned_date, parts_expected_date: c.parts_expected_date })));
      } catch { if (my === seq) box.innerHTML = ''; }
    };
    $$('input[name=veh]').forEach((r) => r.addEventListener('change', showOpen));
    if ($('input[name=veh]:checked')) showOpen();
  }




  const trailerHint = () => {
    const box = $('#trlr'); if (!box) return false;
    const r = $('input[name=veh]:checked'); const v = r && vs.find((x) => x.id === r.value);
    const show = !!(v && v.kind !== 'anhaenger' && v.trailer_plate && TRAILER_DMG.test($('#d').value) && !FOREIGN_TRAILER.test($('#d').value));
    if (show) { const html = `<b>${esc(t('trlr_title').replace('{p}', v.trailer_plate))}</b><p class="small" style="margin:6px 0 0">${esc(t('trlr_text').replaceAll('{p}', v.trailer_plate))}</p>`; if (box.innerHTML !== html) box.innerHTML = html; }
    return show;
  };
  const hints = () => { const dv = recurFix($('#d').value); const dsk = noSticker(dv); const dck = noCabkit(dv); $('#trlr').hidden = !trailerHint(); const dfx = noFixed(dv); const dsh = noSeatHeat(noReefRu(dfx)); const wild = WILD_HINT.test(dv); $('#wild').hidden = !wild; const hitrun = !wild && (HITRUN_HINT.test(dv) || HITRUN2_HINT.test(dv) || HITRUN3_HINT.test(dv)); $('#hitrun').hidden = !hitrun; const bridge = !wild && !hitrun && BRIDGE_HINT.test(dv); $('#bridge').hidden = !bridge; const injhit = INJURY_HINT.test(dv); const daccx = noReefRu(injhit ? dv.replace(INJURY_WORDS, ' ') : dv); const accReal = ACC_HINT.test(daccx) || ACC2_HINT.test(daccx) || ACC3_HINT.test(daccx); $('#acc').hidden = wild || hitrun || bridge || !accReal; $('#tacho').hidden = !TACHO_HINT.test(dv) && !TACHO2_HINT.test(dv); const theft = THEFT_HINT.test(dv); $('#theft').hidden = !theft; $('#vandal').hidden = theft || hitrun || !VANDAL_HINT.test(dv) || TYRE3_HINT.test(dv); $('#alarm').hidden = theft || !ALARM_HINT.test(dv); $('#tow').hidden = !TOW_HINT.test(dv); $('#stow').hidden = !STOW_HINT.test(dv); $('#roofice').hidden = !ROOFICE_HINT.test(dv); $('#glass').hidden = !GLASS_HINT.test(noTicket(noWsObj(dsk))); $('#lost').hidden = !LOST_HINT.test(dv); $('#numplate').hidden = !NUMPLATE_HINT.test(dsk); $('#sticker').hidden = !STICKER_HINT.test(dv); $('#fuel').hidden = !FUEL_HINT.test(dv); fuelDrv(); $('#flat').hidden = !FLAT_HINT.test(noAux(dv)) && !FLAT2_HINT.test(noAux(dv)) && !FLAT3_HINT.test(noAux(dv)); $('#roadchk').hidden = !ROADCHK_HINT.test(dv); $('#nostart').hidden = !NOSTART_HINT.test(noAux(dfx)) && !NOSTART2_HINT.test(noAux(dfx)); $('#pfilter').hidden = !PFILTER_HINT.test(dfx); $('#warnlight').hidden = !WARNLIGHT_HINT.test(dfx) && !WARNLIGHT2_HINT.test(dfx); $('#leak').hidden = !LEAK_HINT.test(dv) && !LEAK2_HINT.test(dv) && !LEAK3_HINT.test(dv); $('#marten').hidden = !MARTEN_HINT.test(dv); $('#storm').hidden = !STORM_HINT.test(dv); $('#custdmg').hidden = !CUSTDMG_HINT.test(dv); { const fixobj = !wild && !hitrun && !bridge && $('#custdmg').hidden && FIXOBJ_HINT.test(dv); $('#fixobj').hidden = !fixobj; $('#acc').hidden ||= fixobj; } $('#cargo').hidden = !CARGO_HINT.test(dv); $('#fire').hidden = !FIRE_HINT.test(noLampBurn(dv)); $('#reefer').hidden = !REEFER_HINT.test(dck) && !REEFER2_HINT.test(dck) && !REEFER3_HINT.test(dck); $('#brake').hidden = !BRAKE_HINT.test(noParkbrake(dv)) && !AIRLINE_HINT.test(dv) && !BRAKE2_HINT.test(noParkbrake(dv)) && !BRAKE3_HINT.test(dv) && !BRAKE4_HINT.test(noParkbrake(dv)); $('#parkbrake').hidden = !PARKBRAKE_HINT.test(dv); $('#pedal').hidden = !PEDAL_HINT.test(dv); { const nest = NEST_HINT.test(dv); $('#nest').hidden = !nest; $('#engnest').hidden = !ENGNEST_HINT.test(dv); $('#pest').hidden = !PEST_HINT.test(nest ? dv.replace(NEST_WORDS, ' ') : dv); } $('#tarp').hidden = !TARP_HINT.test(dck) && !TARP2_HINT.test(dck); $('#load').hidden = !LOAD_HINT.test(dv) && !LOAD2_HINT.test(dv); $('#lashgear').hidden = !LASHGEAR_HINT.test(dv) && !LASHGEAR2_HINT.test(dv); $('#contour').hidden = !CONTOUR_HINT.test(dv); $('#mirror').hidden = !MIRROR_HINT.test(dfx) && !MIRROR2_HINT.test(dfx) && !MIRROR3_HINT.test(dfx); $('#coupling').hidden = !COUPLING_HINT.test(dv) && !COUPLING2_HINT.test(dv) && !COUPLING3_HINT.test(dv); $('#lights').hidden = !LIGHTS_HINT.test(dck) && !LIGHTS2_HINT.test(dck) && !LIGHTS3_HINT.test(dck) && !LIGHTS4_HINT.test(dck); $('#door').hidden = !DOOR_HINT.test(dfx) && !DOOR2_HINT.test(dfx) && !DOOR3_HINT.test(dfx) && !DOOR4_HINT.test(dfx) && !DOOR5_HINT.test(dfx); $('#stuck').hidden = !STUCK_HINT.test(dv); $('#visib').hidden = !VISIB_HINT.test(dsh) && !VISIB2_HINT.test(dsh) && !VISIB3_HINT.test(dsh) && !HEAT_HINT.test(dsh); $('#step').hidden = !STEP_HINT.test(dfx); $('#injury').hidden = !injhit || wild || hitrun || bridge || accReal || !$('#step').hidden || !$('#stow').hidden; { let dl = noFixed(dsk); if (!$('#numplate').hidden) dl = dl.replace(NUMPLATE_WORDS, ' '); if (!$('#step').hidden) dl = dl.replace(STEP_WORDS, ' '); $('#loose').hidden = !LOOSE_HINT.test(dl); } $('#adas').hidden = !ADAS_HINT.test(dv) && !ADAS2_HINT.test(dv); $('#steer').hidden = !STEER_HINT.test(dv) && !STEER2_HINT.test(dv) && !STEER3_HINT.test(dv); $('#engine').hidden = !ENGINE_HINT.test(noAux(dv)) && !ENGINE2_HINT.test(noAux(dv)) && !ENGINE3_HINT.test(noAux(dv)) && !ENGINE4_HINT.test(noAux(dv)); $('#oillevel').hidden = !OILLEVEL_HINT.test(dv); $('#grease').hidden = !GREASE_HINT.test(dv); $('#elec').hidden = !ELEC_HINT.test(dfx) && !ELEC2_HINT.test(dfx) && !ELEC3_HINT.test(dfx); $('#batt').hidden = !BATT_HINT.test(noAux(dfx)); $('#susp').hidden = !SUSP_HINT.test(noSeatSusp(dv)) && !SUSP2_HINT.test(noSeatSusp(dv)); $('#gear').hidden = !GEAR_HINT.test(dfx) && !GEAR2_HINT.test(dfx) && !GEAR3_HINT.test(dfx); $('#seat').hidden = !SEAT_HINT.test(dsh) && !SEATSUSP_HINT.test(dsh) && !SEAT2_HINT.test(dsh); $('#cabkit').hidden = !CABKIT_HINT.test(dfx) && !CABKIT_HINT.test(noSeatHeat(dfx, 1)); $('#dash').hidden = !DASH_HINT.test(dfx); $('#telem').hidden = !TELEM_HINT.test(dfx); $('#exhaust').hidden = !EXHAUST_HINT.test(dfx) && !EXHAUST2_HINT.test(dfx); $('#cabtilt').hidden = !CABTILT_HINT.test(dfx); $('#gelfuel').hidden = !GELFUEL_HINT.test(dv); $('#dryfuel').hidden = !DRYFUEL_HINT.test(noAux(dv)); $('#safetykit').hidden = !SAFETYKIT_HINT.test(dv); $('#spare').hidden = !SPARE_HINT.test(dv); $('#service').hidden = !SERVICE_HINT.test(dv); $('#airbag').hidden = !AIRBAG_HINT.test(dv); $('#waterfuel').hidden = !WATERFUEL_HINT.test(dv); $('#overload').hidden = !OVERLOAD_HINT.test(dv); $('#wheel').hidden = !WHEEL_HINT.test(noAux(dv)) && !WHEEL2_HINT.test(noAux(dv)); $('#toll').hidden = !TOLL_HINT.test(dfx); $('#ticket').hidden = !$('#roadchk').hidden || !TICKET_HINT.test(dv); $('#climate').hidden = !CLIMATE_HINT.test(dfx) && !CLIMATE2_HINT.test(dfx) && !CLIMATE3_HINT.test(dfx); $('#window').hidden = !WINDOW_HINT.test(dfx) && !WINDOW2_HINT.test(dfx) && !WINDOW3_HINT.test(dfx); $('#cableak').hidden = !CABLEAK_HINT.test(noCabHyd(dfx)); $('#fuelcap').hidden = !FUELCAP_HINT.test(dfx); $('#fuelcard').hidden = !FUELCARD_HINT.test(dv) && !FUELCARD2_HINT.test(dv); $('#underrun').hidden = !UNDERRUN_HINT.test(dv); $('#tyre').hidden = !(TYRE_HINT.test(noAux(dv)) || TYRE2_HINT.test(noAux(dv)) || TYRE3_HINT.test(dv) || TYRE4_HINT.test(noAux(dv)) || TYRE5_HINT.test(noAux(dv))) || bodyWall(dv); $('#cablock').hidden = !CABLOCK_HINT.test(dfx) && !CABLOCK2_HINT.test(dfx) && !CABLOCK3_HINT.test(dfx); $('#vibr').hidden = !VIBR_HINT.test(dv) && !VIBR2_HINT.test(dv); $('#deck').hidden = !DECK_HINT.test(noCabHyd(dv)); $('#floor').hidden = !FLOOR_HINT.test(noTyreWall(dv)) && !FLOOR2_HINT.test(noTyreWall(dv)); $('#noise').hidden = !NOISE_HINT.test(dv) || ctrlKinds(dv).size > 0 || stalkKinds(dv).size > 0 || HINT_ORDER.some((k) => { if (k === 'noise' || k === 'trlr') return false; const el = $('#' + k); return !!el && !el.hidden; }); for (const k of ctrlKinds(dv)) $('#' + k).hidden = false; for (const k of stalkKinds(dv)) $('#' + k).hidden = false; groupHints(hintOpen); };

  const fuelDrv = () => { const w = $('#fueldrv'); if (!w) return; const d = $('input[name=drv]:checked'); const bad = !$('#fuel').hidden && !!d && ['unbekannt', 'fahrbereit'].includes(d.value);
    w.hidden = !bad; w.textContent = bad ? '⚠️ ' + t('fuel_drv_warn').replace('{a}', t('drv_' + d.value)).replace('{b}', t('drv_nicht_fahrbereit')) : ''; };
  const hintOpen = new Set();






  const dEl = $('#d'); let hintT = 0;
  const hintsSoon = () => { clearTimeout(hintT); if (dEl.value.length > HINT_LONG) hintT = setTimeout(() => { if (dEl.isConnected) hints(); }, HINT_PAUSE); else hints(); };
  const hintsNow = () => { clearTimeout(hintT); hints(); };
  dEl.addEventListener('input', hintsSoon); dEl.addEventListener('change', hintsNow);
  (window.requestIdleCallback || ((f) => setTimeout(f, 250)))(() => { if (dEl.isConnected && $('#d') === dEl) hints(); });
  $$('input[name=drv]').forEach((x) => x.addEventListener('change', fuelDrv));
  $$('input[name=veh]').forEach((x) => x.addEventListener('change', hints));
  photoLimitWatch($('#ph'), () => { const d = $('#occd').value; return d ? { day: d, k: 'photo_old_occ' } : { day: bDate(), k: 'photo_old_new' }; });
  $('#occd').addEventListener('input', () => $('#ph')._photoOld()); $('#occd').addEventListener('change', () => $('#ph')._photoOld());

  $('#ph').addEventListener('change', () => { const w = $('#phlater_w'); if (w) w.hidden = !photoUsable($('#ph')).length; if (w && w.hidden) $('#phlater').checked = false; });
  const draft = bindFormDraft('new', $('#f'), 'veh', preId, ['vq', 'phlater']);
  const key = uid();


  $('#vq').onkeydown = (e) => { if (e.key === 'Enter') e.preventDefault(); };
  $('#vq').oninput = () => { const q = searchKey($('#vq').value); $$('.vehpick label').forEach((l) => { l.hidden = !!q && !searchKey(l.textContent).includes(q); const r = $('input', l); if (l.hidden && r && r.checked) r.checked = false; }); if (q) $$('details').forEach((d) => (d.open = true)); };
  $('#f').onsubmit = async (e) => {
    e.preventDefault();


    const sb = $('#sb');
    const veh = $('input[name=veh]:checked');

    if (!veh) { toast(t('choose_vehicle'), true); const vp = $('.vehpick'); if (vp) { vp.setAttribute('role', 'radiogroup'); markInvalid(vp, t('choose_vehicle')); } $('#vq').focus(); return; }
    if ($('#d').value.trim().length < 5) { toast(t('desc_too_short'), true); markInvalid($('#d'), t('desc_too_short')); $('#d').focus(); return; }
    const occ = occurredValue($('#occd').value, $('#occt').value);
    if (occ === undefined) { toast(t('occ_need_date'), true); markInvalid($('#occd'), t('occ_need_date')); $('#occd').focus(); return; }
    if (occ && occ.slice(0, 10) > bDate()) { toast(t('occ_future'), true); markInvalid($('#occd'), t('occ_future')); $('#occd').focus(); return; }
    sb.disabled = true;
    const who = outboxWho();
    const photoFiles = photoUsable($('#ph'));


    const hold = !!(photoFiles.length && $('#phlater') && $('#phlater').checked);
    const body = { vehicle_id: veh.value, description: $('#d').value, priority: $('input[name=prio]:checked').value,
      driveability: $('input[name=drv]:checked').value, workshop_site: $('#w').value || null, location_note: $('#l').value || null, request_key: key, ...(occ ? { occurred_at: occ } : {}), ...(hold ? { photos_later: photoFiles.length } : {}) };
    try {
      const r = await api('POST', '/api/cases', body, { timeoutMs: SEND_TIMEOUT_MS });
      draft.clear();
      const files = photoFiles;




      const crit = body.priority === 'kritisch' || body.driveability === 'nicht_fahrbereit';
      let ph = sb;
      if (crit && sb.isConnected) {
        render(`<h1>${esc(t('report_damage'))}</h1><div class="panel alert" role="alert" data-sentcritical><p><b>${esc(t('report_sent'))}: ${esc(r.case_no)}</b></p>${files.length ? `<p class="small" id="phstate" data-phstate role="status">${hold ? esc(tn('photos_held', files.length)) : `${esc(t('uploading'))} 1/${files.length}`}</p>` : ''}${r.urgent_push_recipients === 0 ? `<p data-nopush><b>⚠ ${esc(t('no_push_reach'))}</b></p>` : ''}${callBox(body.vehicle_id)}<p><a class="btn" href="#/cases/${esc(r.id)}">${esc(t('open_report'))} ›</a></p></div>`, 'new');
        ph = $('#phstate') || null;
      }
      if (hold) {
        const held = await photosLater('/api/cases', body, r, r.id, files, who, true);
        toast(`${t('report_sent')}: ${r.case_no} · ${held === files.length ? tn('photos_held', held) : t('photos_held_fail')}`, held !== files.length);
        if (ph && ph.isConnected && ph !== sb && held !== files.length) ph.textContent = t('photos_held_fail');
        if (crit && !sb.isConnected) return;
        if (sb.isConnected) location.hash = '#/cases/' + r.id;
        return;
      }
      const { failed, later } = files.length ? await uploadPhotosSafe('/api/cases', body, r, r.id, files, ph, who) : { failed: 0, later: 0 };
      toast(`${t('report_sent')}: ${r.case_no}${failed ? ' · ' + tn('photos_failed', failed) : ''}${later ? ' · ' + tn('photos_stored', later) : ''}`, !!failed);
      if (crit) {
        if (ph && ph.isConnected && ph !== sb) ph.textContent = failed || later ? [failed ? tn('photos_failed', failed) : '', later ? tn('photos_stored', later) : ''].filter(Boolean).join(' · ') : t('photos_done');
        if (!sb.isConnected) return;
      }
      if (sb.isConnected) location.hash = '#/cases/' + r.id;
    } catch (err) {


      if (err.offline || err.status === 401 || err.code === 'user_mismatch' || err.code === 'env_mismatch') {
        const files = photoFiles;
        let stored = 0;
        if (files.length) { try { const list = []; for (const f of files) list.push(await prepPhoto(f)); await photosPut(key, list); stored = list.length; } catch {} }
        outboxAdd('/api/cases', body, stored, who);
        draft.clear();
        if (hold && stored && who) outboxSet(outboxGet(who.key).map((x) => (x.body.request_key === key ? { ...x, hold: true } : x)), who.key);
        if (!err.offline || !sb.isConnected) { toast(t(err.offline ? 'outbox_saved' : 'outbox_saved_login')); return; }
        render(`<h1>${esc(t('report_damage'))}</h1><div class="panel alert" role="alert"><p><b>${esc(t('outbox_saved'))}</b></p>${files.length && !stored ? `<p>${esc(t('photos_offline'))}</p>` : stored ? `<p>${esc(tn('photos_stored', stored))}</p>` : ''}${body.priority === 'kritisch' || body.driveability === 'nicht_fahrbereit' ? callBox(body.vehicle_id) : ''}</div><div id="outbox_slot"></div><div class="actions"><a class="btn secondary" href="#/">${esc(t('back'))}</a></div>`, 'new');
        return;
      }
      toast(err.message, true); sb.disabled = false;
    }
  };
}



function myPlanned(v) {
  let h = '';
  if (v.planned_workshop_date) h += `<dt>${esc(t('planned_ws_short'))}</dt><dd><b>${fmtD(v.planned_workshop_date)}</b>${todayMark(v.planned_workshop_date)} ${(v.planned_workshop_sites || []).length ? ` · <span data-plannedws>${v.planned_workshop_sites.map((w) => esc(wsName(w))).join(', ')}</span>` : ''} <span class="small muted">${esc(t('my_ws_hint'))}</span>${v.planned_workshop_note ? `<br><span data-plannote>${esc(t('plan_note_lbl'))}: ${esc(v.planned_workshop_note)}</span>` : ''}</dd>`;
  const pi = v.planned_inspection;
  if (pi && ![...(v.next_inspections || []), ...(v.km_due || [])].some((r) => r.kind === pi.kind && r.planned_date)) h += `<dt>${esc(mk(pi.kind))}</dt><dd>${esc(t('planned'))} ${fmtD(pi.planned_date)}${todayMark(pi.planned_date)}</dd>`;
  return h;
}




const vehSeenKey = () => `cfp_vseen_${S.me.id}_${S.me.environment}`;
function vehSeenSave(cur) { try { localStorage.setItem(vehSeenKey(), JSON.stringify(cur)); } catch {} }
function vehChangeNote(mv) {
  const cur = mv.map((v) => ({ id: v.id, plate: v.plate }));
  S.vcur = cur;
  let seen = null; try { seen = JSON.parse(localStorage.getItem(vehSeenKey()) || 'null'); } catch {}
  if (!Array.isArray(seen)) { vehSeenSave(cur); return ''; }
  const ids = new Set(seen.map((x) => x && x.id));
  const added = mv.filter((v) => !ids.has(v.id));
  const gone = seen.filter((x) => x && x.id && !mv.some((v) => v.id === x.id));
  if (!added.length && !gone.length) { vehSeenSave(cur); return ''; }
  return `<section class="panel warn" role="note" id="vchange"><h2 style="margin-top:0">${esc(t('drv_vchange_title'))}</h2>${added.length ? `<p data-vchnew>${esc(t('drv_vchange_new'))} ${added.map((v) => `<b style="white-space:nowrap">${esc(v.plate)}</b>${v.valid_from ? ` <span class="small muted" style="white-space:nowrap">(${esc(t('drv_assigned_since'))} ${fmtD(v.valid_from)})</span>` : ''}`).join(', ')}</p>` : ''}${gone.length ? `<p data-vchgone>${esc(t('drv_vchange_gone'))} ${gone.map((x) => `<b style="white-space:nowrap">${esc(x.plate || '')}</b>`).join(', ')}</p>` : ''}<p class="small">${esc(t('drv_vchange_hint').replace('{c}', t('nav_cases')))}</p><div class="actions"><button class="btn secondary" id="vchangeok">${esc(t('drv_vchange_ok'))}</button></div></section>`;
}

function myVehCached() { try { const c = JSON.parse(localStorage.getItem(`cfp_myveh_${S.me.id}_${S.me.environment}`) || 'null'); return c && Array.isArray(c.vehicles) ? c.vehicles : null; } catch { return null; } }




function drvInspRows(v) {

  const dk = (k) => (k === 'HU' ? t('hu_long') : k === 'SP' ? t('sp_long') : mk(k));
  return (v.next_inspections || []).map((r) => `<dt>${esc(dk(r.kind))}</dt><dd>${fmtD(r.next_due_date)}${r.next_due_date < bDate() ? ` <span class="chip kritisch">${esc(t('drv_overdue'))}</span>` : ''}${r.planned_date ? ` <span class="small">· ${esc(t('planned'))} ${fmtD(r.planned_date)}${todayMark(r.planned_date)}</span>` : ''}</dd>`).join('')
    + (v.inspections_unclear || []).map((k) => `<dt>${esc(dk(k))}</dt><dd><span class="chip mittel" data-unclear>${esc(t('ms_ungeklaert'))}</span> <span class="small muted" data-unclearwho>${esc(t('drv_unclear_fleet'))}</span></dd>`).join('');
}



function drvNotes(notes) {
  const list = (notes || []).filter((n) => !n.valid_until || n.valid_until >= bDate());
  return list.length ? `<div class="vnotes-drv" role="note">${list.map((n) => `<p><b>ⓘ ${n.plate ? esc(n.plate) + ': ' : ''}${esc(n.text)}</b> <span class="small muted">${fmtD(n.created_at)}${n.valid_until ? ' · ' + esc(t('vnote_until').replace('{d}', fmtD(n.valid_until))) : ''}</span></p>`).join('')}</div>` : '';
}


function coupledDefects(c) {
  if (!c || (!(c.known_defects || []).length && !(c.open_items_after_release || []).length)) return '';
  return `<div class="drv-coupled" data-coupled><p style="margin:10px 0 0"><b>${esc(t(c.kind === 'anhaenger' ? 'trailer' : 'truck'))} ${esc(c.plate)}</b></p>${knownDefects(c.known_defects)}${relItems(c.open_items_after_release)}</div>`;
}
function drvCoupled(c) {
  if (!c || (!(c.next_inspections || []).length && !(c.inspections_unclear || []).length && !(c.known_defects || []).length && !(c.open_items_after_release || []).length)) return '';
  const rows = drvInspRows(c);
  return `<div class="drv-coupled" data-coupled><p style="margin:10px 0 0"><b>${esc(t(c.kind === 'anhaenger' ? 'trailer' : 'truck'))} ${esc(c.plate)}</b></p>${rows ? `<dl class="kv" style="margin-top:4px">${rows}</dl>` : ''}${knownDefects(c.known_defects)}${relItems(c.open_items_after_release)}</div>`;
}

function relItems(list) {
  if (!list || !list.length) return '';
  return `<div class="small" role="note" data-relitems><b>${esc(t('rel_items_title'))} (${list.length})</b><ul style="margin:4px 0">${list.map((o) => `<li${langAttr(o.description)}>${esc(o.description)} <span class="muted">· ${esc(o.case_no)}${o.closed_at ? ' · ' + esc(t('st_fahrzeug_freigegeben')) + ' ' + fmtD(o.closed_at) : ''}</span></li>`).join('')}</ul><span class="muted">${esc(t('rel_items_hint'))}</span></div>`;
}
function knownDefects(list) {
  if (!list || !list.length) return '';
  return `<details class="known"${list.length <= 3 ? ' open' : ''}><summary>${esc(t('known_defects'))} (${list.length})</summary><ul class="small">${list.map((k) => {

    const txt = `${k.check_item ? esc(checkLabel(k.check_item)) + ': ' : ''}${ltxt(k.description.replace(/^\[Kontrolle [^\]]*\]\s*[a-z_]+:\s*/, ''))}`;
    return `<li><span class="chip ${esc(k.priority)}">${esc(t('prio_' + k.priority))}</span> ${k.id ? `<a href="#/cases/${esc(k.id)}">${txt}</a>` : txt} <span class="muted">· ${esc(t('st_' + k.status))} · ${fmtD(k.created_at)}${k.planned_date ? ' · ' + esc(t('planned_ws_short')) + ' ' + fmtD(k.planned_date) : ''}${k.parts_expected_date ? ' · ' + esc(t('parts_eta')) + ' ' + fmtD(k.parts_expected_date) : ''}${rdyOf(k) ? ` · <span data-kdrdy>${rdyTxt(k.ready_expected_on)}</span>` : ''}${k.workshop_site ? ` · <span data-kdws>${esc(wsName(k.workshop_site))}</span>` : ''}</span>${k.parts_drive ? ` <span class="chip ok" style="white-space:nowrap" data-kdpdr>🚚 ${esc(t('pdr_short'))}</span>` : ''}${k.parts_drive && k.parts_eta_reached ? `<br><b class="small" data-kdpdrlate>⚠ ${esc(t('kd_pdr_reached'))}</b>` : ''}${k.driveability && !k.safety_lock && !k.parts_drive ? ` <span class="chip mittel" style="white-space:nowrap" data-kddrv>${esc(t(k.driveability === 'eingeschraenkt' ? 'dispo_upcoming_limited' : 'kd_drv_not'))}</span>` : ''}${k.vehicle_location || k.tow_service ? `<br><span data-kdloc>📍 ${esc(t('vl_title'))}: ${k.vehicle_location ? esc(k.vehicle_location) : `<span class="muted">${esc(t('vl_unknown'))}</span>`}${k.tow_service ? ` · <span class="chip mittel">${esc(t('vl_towed_chip'))}</span> ${esc(k.tow_service)}${k.towed_on ? ' · ' + fmtD(k.towed_on) : ''}` : ''}${vlAt(k)}</span>` : ''}</li>`; }).join('')}</ul></details>`;
}



const isQualityRelease = (c, A) => c.status === 'in_reparatur' && c.workshop_site === 'EXTERN' && ['owner', 'fleet'].includes(S.me.role) && (A || []).includes('request_quality_check');

const evLabel = (a) => (t('hev_' + a) !== 'hev_' + a ? t('hev_' + a) : t('act_' + a) !== 'act_' + a ? t('act_' + a) : '');


function apwBox(c) {
  if (!c.appraisal_wait_on) return '';
  const k = S.me.role === 'workshop' ? 'apw_hint_ws' : isMgr() ? 'apw_hint_mgr' : 'apw_hint_dispo';
  return `<div class="panel warn" role="note" data-apwcase><b>🔍 ${esc(t('apw_title'))} ${fmtD(c.appraisal_wait_on)}${c.appraisal_wait_on === bDate() ? ' (' + esc(t('today')) + ')' : ''}</b> – ${esc(t(k))}</div>`;
}
async function viewCase(id, pre = null) {
  const d = pre || await api('GET', '/api/cases/' + id);
  const c = d.case;


  const A = isQualityRelease(c, d.allowed_actions) ? d.allowed_actions.flatMap((a) => (a === 'request_quality_check' ? [a, 'quality_release'] : [a])) : d.allowed_actions;
  const prioLine = c.reported_priority !== c.priority ? ` <span class="muted small">(${esc(t('reported_prio'))}: ${esc(t('prio_' + c.reported_priority))})</span>` : '';

  let html = `<p class="noprint" style="display:flex;gap:12px;flex-wrap:wrap;align-items:center"><a class="backlink" href="#/cases">‹ ${esc(t('back'))}</a>${isMgr() ? `<button type="button" class="btn secondary" id="nextunrec" style="margin-left:auto">${esc(t('next_unreceived'))} ›</button>` : ''}</p>
    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">${plate(d.vehicle.plate, { big: true, locked: c.safety_lock })}<span class="chip ${c.status === 'fahrzeug_freigegeben' ? 'ok' : esc(c.priority)}">${esc(stTxt(c))}</span>${c.environment === 'test' ? '<span class="chip test">TEST</span>' : ''}</div>
    <h1 style="margin-top:12px" data-title="${esc(c.case_no)} · ${esc(d.vehicle.plate)}"><span translate="no">${esc(c.case_no)}</span></h1>
    <p class="print-only small">${printStamp()} · CEVIK ${esc(t('app'))} [CLAUDE]</p>
    <div class="actions noprint"><button type="button" class="btn secondary" id="cprt">${esc(t('print'))}</button></div>
    ${c.safety_lock ? `<div class="panel alert"><b>${esc(t('locked'))}</b> – ${esc(translateLockReason(S.lang, c.safety_lock_reason || ''))}</div>` : ''}
    ${isWithdrawn(c) && (S.me.role === 'driver' || c.reporter_id === S.me.id) ? `<div class="panel" role="note" data-wdagain>${esc(t('wd_again_hint'))}</div>` : ''}
    ${d.access === 'preview' ? `<div class="panel">${esc(t('preview_hint'))}</div>` : ''}
    ${d.maintenance_event ? (() => { const me = d.maintenance_event; const ri = me.reinspection; const good = ri && !DEFECT_RESULTS.includes(ri.result); return `<div class="panel ${good ? 'good' : ''}"><b>${esc(t('md_case'))}: ${esc(mk(me.kind))} ${fmtD(me.done_date)}</b> · ${esc(t('res_' + me.result))} – ${ri ? `${esc(t('reinsp_done'))} ${fmtD(ri.done_date)}${ri.result ? ' · ' + esc(t('res_' + ri.result)) : ''} (${esc(ri.evidence)})` : `${c.status === 'fahrzeug_freigegeben' ? `<span class="chip mittel">${esc(t('todo_reinspection'))}</span> ` : ''}${esc(t('md_case_hint'))}`} <a class="noprint" href="#/vehicles/${esc(c.vehicle_id)}">${esc(t('vehicle_file'))} ›</a></div>`; })() : ''}
    ${d.maintenance_rule ? `<div class="panel ${d.maintenance_rule.done_since_order ? 'good' : ''}"><b>${esc(t('mo_case'))}: ${esc(mk(d.maintenance_rule.kind))}</b> – ${d.maintenance_rule.done_since_order ? `${esc(t('mo_done'))} ${fmtD(d.maintenance_rule.last_done_date)}` : esc(t('mo_case_hint'))} <a class="noprint" href="#/vehicles/${esc(c.vehicle_id)}">${esc(t('vehicle_file'))} ›</a></div>` : ''}
    ${d.tire_winter ? (() => { const w = d.tire_winter; const good = w.status === 'erfuellt'; return `<div class="panel ${good ? 'good' : ''}" id="cwinter"><b>${esc(t('wo_case'))}</b> <span class="chip ${good ? 'ok' : w.status === 'nicht_erfuellt' ? 'kritisch' : 'mittel'}">${esc(t('ws_' + w.status))}</span>${w.noncompliant.length ? ` – ${esc(t('winter_bad').replace('{p}', w.noncompliant.map(posL).join(', ')))}` : ''}${w.missing.length ? ` – ${esc(t('winter_missing').replace('{p}', w.missing.map(posL).join(', ')))}` : ''}${good ? '' : `<p class="small" id="cwhint">${esc(t(['fahrzeug_freigegeben', 'abgelehnt'].includes(c.status) ? 'wo_case_hint_closed' : 'wo_case_hint'))}</p>`}${!good && !['fahrzeug_freigegeben', 'abgelehnt'].includes(c.status) && ['owner', 'fleet', 'workshop'].includes(S.me.role) ? ` <span class="noprint"><a href="#/vehicles/${esc(c.vehicle_id)}?sec=wo" id="cwrec">❄ ${esc(t('wo_rec'))} ›</a> ·</span>` : ''} <a class="noprint" href="#/vehicles/${esc(c.vehicle_id)}">${esc(t('vehicle_file'))} ›</a></div>`; })() : ''}
    ${qBanner(c)}${rejBox(c, d)}
    ${isMgr() && TACHO_HINT.test(cDesc(c.description) || '') ? `<div class="panel" data-tachocard><b>${esc(t('tcard_mgr_t'))}</b> ${esc(t('tcard_mgr_s'))} <a class="noprint" href="${d.reporter_driver_id ? '#/drivers/' + esc(d.reporter_driver_id) : '#/drivers'}">${esc(t(d.reporter_driver_id ? 'tcard_mgr_link' : 'drivers'))} ›</a></div>` : ''}
    ${apwBox(c)}
    ${c.cost_over_limit_at ? `<div class="panel warn"><b>${esc(t('cost_approval_pending'))}</b>${isMgr() || S.me.role === 'workshop' ? ` – ${esc(t(isMgr() ? 'cost_approval_hint_mgr' : 'cost_approval_hint_ws'))}` : ''} <span class="small muted">(${fmtDT(c.cost_over_limit_at)})</span></div>` : ''}
    <section class="panel"><p style="white-space:pre-wrap;font-size:1.05rem"${langAttr(cDesc(c.description))}>${esc(cDesc(c.description))}</p>
    <dl class="kv">
      <dt>${esc(t('urgency'))}</dt><dd><span class="chip ${esc(c.priority)}">${esc(t('prio_' + c.priority))}</span>${prioLine}</dd>
      <dt>${esc(t('driveable'))}</dt><dd>${c.origin === 'kontrolle' && c.reported_driveability === 'unbekannt' ? `<span data-drvcheck>${esc(t('drv_not_asked_check'))}${S.me.role === 'driver' && OPEN_CASE_ST.includes(c.status) ? ' – ' + esc(t('check_defect_clarify')) : ''}</span>` : esc(t('drv_' + c.reported_driveability))}</dd>
      ${d.reporter_name || d.reporter_name_hidden ? `<dt>${esc(t('reported_by'))}</dt><dd>${esc(pnm(d.reporter_name, d.reporter_name_hidden))} · ${fmtDT(c.created_at)}</dd>` : `<dt>${esc(t('date'))}</dt><dd>${fmtDT(c.created_at)}</dd>`}${repAssign(d.reporter_assignment, c.vehicle_id)}
      ${srcInsp(d.source_inspection)}
      ${c.occurred_at ? `<dt>${esc(t('occurred'))}</dt><dd data-occurred>${fmtOccurred(c.occurred_at)}${occLate(c)}</dd>${occDrivers(d.occurred_drivers)}` : ''}
      <dt>${esc(t('received'))}</dt><dd>${c.fleet_received_at ? fmtDT(c.fleet_received_at) : esc(t('not_yet'))}${c.fleet_received_at && d.received_by ? ` · ${esc(d.received_by.name)}${d.received_by.current ? '' : ` <span class="chip mittel" data-recvgone>${esc(t('recv_gone'))}</span>`}` : ''}</dd>
      <dt>${esc(t('workshop'))}</dt><dd>${esc(wsName(c.workshop_site || c.suggested_workshop_site))}${c.planned_date ? ' · ' + esc(t('planned')) + ' ' + fmtD(c.planned_date) : ''}${c.planned_date && c.planned_note ? `<br><span class="small" data-plannote>${esc(t('plan_note_lbl'))}: ${esc(c.planned_note)}</span>` : ''}</dd>${c.followup_on && !['fahrzeug_freigegeben', 'abgelehnt'].includes(c.status) ? `<dt>${esc(t('followup'))}</dt><dd><span class="chip${c.followup_on <= bDate() ? ' mittel' : ''}">${fmtD(c.followup_on)}</span>${c.followup_note ? ' ' + esc(c.followup_note) : ''}</dd>` : ''}
      ${rdyOf(c) ? `<dt>${esc(t('rdy_title'))}</dt><dd id="rdy"><b>${fmtD(c.ready_expected_on)}</b>${c.ready_expected_on === bDate() ? ' (' + esc(t('today')) + ')' : ''}${c.ready_expected_on < bDate() ? ` <span class="chip mittel" data-rdypast>${esc(t('rdy_passed'))}</span>` : ''} <span class="small muted">${esc(t('rdy_by_ws'))}</span>${((m) => (m ? ` <span class="small" data-rdymoves>· ${esc(tn('rdy_moved', m.n))} (${esc(t('rdy_first'))} ${fmtD(m.first)})</span>` : ''))(rdyMoves(d))}</dd>` : ''}
      ${c.status === 'wartet_teile' ? `<dt>${esc(t('parts_eta'))}</dt><dd>${c.parts_expected_date ? partsEta(c, '', false) : `<span class="muted">${esc(t('parts_eta_none'))}</span>`}</dd>` : ''}${pdrInfo(c, d)}
      ${c.status === 'wartet_teile' && d.parts_wait ? partsWaitRows(d.parts_wait) : ''}
      ${c.status !== 'gemeldet' ? `<dt>${esc(t('workshop_ack'))}</dt><dd>${c.workshop_ack_at ? fmtDT(c.workshop_ack_at) + (c.workshop_ack_by_name ? ` · <span data-ackby>${esc(c.workshop_ack_by_name)}</span>` : '') : esc(t('not_yet'))}</dd>` : ''}
      ${c.location_note ? `<dt>${esc(t('location_shown'))}</dt><dd>${esc(c.location_note)}</dd>` : ''}
      ${workStateInfo(c, d)}${vehLocInfo(c)}${handoverInfo(c)}${pickupInfo(c)}
      ${d.parent ? `<dt>${esc(t('parent'))}</dt><dd>${d.parent.id ? `<a href="#/cases/${esc(d.parent.id)}" translate="no">${esc(d.parent.case_no)}</a>` : esc(d.parent.case_no)}</dd>` : ''}
      ${d.duplicate_of ? `<dt>${esc(t('dup_of'))}</dt><dd>${S.me.role === 'driver' || !d.duplicate_of.id ? noTr(d.duplicate_of.case_no) : `<a href="#/cases/${esc(d.duplicate_of.id)}" translate="no">${esc(d.duplicate_of.case_no)}</a>`}</dd>` : ''}${d.duplicates && d.duplicates.length ? `<dt>${esc(t('duplicates'))}</dt><dd>${d.duplicates.map((x) => `<span style="white-space:nowrap" data-dupat><a href="#/cases/${esc(x.id)}" translate="no">${esc(x.case_no)}</a>${x.created_at ? ` <span class="small muted">(${esc(t('reported_at_short'))} ${fmtDT(x.created_at)})</span>` : ''}</span>`).join(', ')}</dd>` : ''}
      ${!['driver'].includes(S.me.role) ? `<dt>${esc(t('vehicle_file'))}</dt><dd><a href="#/vehicles/${esc(d.vehicle.id)}">${esc(d.vehicle.plate)}</a></dd>` : ''}
      ${!['driver'].includes(S.me.role) && d.vehicle.vin ? `<dt>${esc(t('vin'))}</dt><dd translate="no" data-cvin>${esc(d.vehicle.vin)}</dd>${d.vehicle.manufacturer || d.vehicle.model ? `<dt>${esc(t('manufacturer'))}</dt><dd>${esc([d.vehicle.manufacturer, d.vehicle.model].filter(Boolean).join(' '))}</dd>` : ''}${d.vehicle.kind !== 'anhaenger' && d.vehicle.trailer_plate ? `<dt>${esc(t('trailer'))}</dt><dd>${esc(d.vehicle.trailer_plate)}</dd>` : ''}` : ''}
    </dl>${vehInfo(d.vehicle_info, c, A)}</section>`;


  const main = A.filter((a) => !['comment', 'upload', 'inspection', 'resolve_open_item', 'resolve_released_item'].includes(a));
  if (main.length || A.includes('inspection')) {
    html += `<div class="actions">${A.includes('inspection') ? `<a class="btn" href="#/inspect/${esc(c.id)}">${esc(t('act_inspection'))}</a>` : ''}${main.map((a) => `<button class="btn ${['reject', 'set_safety_lock', 'withdraw_order'].includes(a) ? 'danger' : ['technical_release', 'quality_release'].includes(a) ? 'go' : ['record_work', 'add_part', 'add_open_item', 'add_external_cost', 'change_priority', 'reassign_workshop', 'correct_vehicle', 'lift_safety_lock', 'return_for_rework', 'set_planned_date', 'set_parts_eta', 'set_followup', 'set_vehicle_location', 'set_handover', 'set_occurred_at', 'set_work_state', 'set_ready_date', 'set_parts_drive'].includes(a) ? 'secondary' : ''}" data-act="${esc(a)}">${esc(t('act_' + a))}</button>`).join('')}</div><div id="actform"></div>`;
  } else html += `<div id="actform"></div>`;




  const pl = d.photos_later; const plHere = c.reporter_id === S.me.id && outboxGet().some((x) => x.hold && x.photo_target === c.id && !x.failed);
  const plBox = pl && pl.received < pl.announced && !['fahrzeug_freigegeben', 'abgelehnt'].includes(c.status)
    ? `<div class="panel small" role="note" data-photoslater><p style="margin:0">📷 ${esc(t('photos_later_case').replace('{n}', pl.announced).replace('{x}', pl.received))}</p>${plHere ? `<div class="actions"><button type="button" class="btn secondary" data-obx-release="${esc(c.id)}">${esc(t('photos_send_now'))}</button></div>` : ''}</div>` : '';
  html += `<h2>${esc(t('files'))}</h2>${plBox}<div class="thumbs">${d.files.map((f) => {
    const role = f.uploader_role ? t('role_' + f.uploader_role) : '';
    const name = f.uploaded_by_name_hidden ? t('name_hidden_driver') : (f.uploaded_by_name || '');
    const info = [fmtDT(f.created_at), role, name && name !== role ? name : ''].filter(Boolean);
    const link = f.content_type.startsWith('image/') ? `<a href="${fileUrl(f.id)}" target="_blank" rel="noopener"><img loading="lazy" src="${fileUrl(f.id)}" alt="${esc([f.filename, ...info].join(' · '))}"></a>` : `<a href="${fileUrl(f.id)}" target="_blank" rel="noopener" aria-label="${esc(['PDF', f.filename, ...info].join(' · '))}">PDF<br>${esc(f.filename.slice(0, 14))}</a>`;

    const tk = f.taken_at ? `<span data-taken>📷 ${esc(takenFmt(f.taken_at))}</span>${f.taken_before_occurrence ? `<span class="chip mittel" data-taken-before>${esc(t('taken_before_occ'))}</span>` : ''}` : '';
    if (f.taken_at) info.push(t('taken_at') + ' ' + takenFmt(f.taken_at));
    return `<figure class="thumb" data-fileinfo title="${esc(info.join(' · '))}">${link}<figcaption class="small muted"><span>${esc(fmtD(f.created_at))} ${esc(fmtHM(f.created_at))}</span>${tk}${role ? `<span data-uprole="${esc(f.uploader_role)}">${esc(role)}</span>` : ''}${name && name !== role ? `<span>${esc(name)}</span>` : ''}</figcaption></figure>`;
  }).join('')}</div>`;
  const canUpload = A.includes('upload') || (c.reporter_id === S.me.id && !['fahrzeug_freigegeben', 'abgelehnt'].includes(c.status));

  const filesFree = Math.max(0, PHOTO_MAX - d.files.length);
  if (canUpload && filesFree) html += `<label class="btn secondary noprint" style="margin-top:8px;display:inline-flex">${esc(t('add_photos'))}<input id="file" type="file" accept="image/*,application/pdf" multiple hidden></label>${filesFree < PHOTO_MAX / 2 ? ` <span class="small muted" id="filesfree">${esc(t('files_free').replace('{n}', filesFree).replace('{max}', PHOTO_MAX))}</span>` : ''}`;
  else if (canUpload) html += `<p class="small muted" id="filesfull">${esc(t('files_full').replace('{max}', PHOTO_MAX))}</p>`;


  if (d.open_items.length) {
    html += `<h2>${esc(t('open_items'))}</h2><div class="list">${d.open_items.map((o) => `<div class="row note ${o.safety_relevant && o.status === 'offen' ? 'p-kritisch' : ''}"><span class="chip ${o.status === 'offen' ? (o.safety_relevant ? 'kritisch' : 'mittel') : 'ok'}">${esc(t('oi_' + o.status))}</span><span class="title" style="white-space:normal"${langAttr(o.description)}>${esc(o.description)}${oiFileLink(o, d)}</span>${o.status === 'offen' && (A.includes('resolve_open_item') || isMgr()) ? `<span style="display:flex;gap:6px;flex-wrap:wrap">${A.includes('resolve_open_item') ? `<button class="btn secondary" data-resolve="${esc(o.id)}">${esc(t('done'))}</button>` : ''}${isMgr() ? `<button class="btn secondary" data-oifu="${esc(o.id)}" data-safety="${o.safety_relevant ? 1 : 0}">${esc(t('oi_to_case'))}</button>` : ''}</span>` : '<span></span>'}<span class="sub" style="white-space:normal">${o.safety_relevant ? esc(t('safety_relevant')) + ' · ' : ''}${esc((pnm(o.created_by_name, o.created_by_name_hidden) || t('role_' + o.created_by_name_role)))} · ${fmtDT(o.created_at)}${o.resolution_note ? ' · ' + (/^Folgeauftrag \S{1,40}$/.test(o.resolution_note) ? esc(t('oi_followup_ref').replace('{v}', () => o.resolution_note.slice(13))) : rriNote(o.resolution_note) ? esc(rriNote(o.resolution_note)) : ltxt(o.resolution_note)) : ''}</span></div>`).join('')}</div>`;
  }
  if (d.followups.length) html += `<h2>${esc(t('followups'))}</h2><div class="list">${d.followups.map((f) => `<a class="row note p-${esc(f.priority)}" href="#/cases/${esc(f.id)}"><span class="chip">${esc(f.case_no)}</span><span class="title" style="white-space:normal"${langAttr(cDesc(f.description))}>${esc(cDesc(f.description))}</span><span class="chip">${esc(t('st_' + f.status))}</span><span class="sub" data-fuprio>${esc(t('prio_' + f.priority))}${f.safety_lock ? ` · <b>${esc(t('locked'))}</b>` : ''}</span></a>`).join('')}</div>`;
  if (d.inspections.length) html += `<h2>${esc(t('inspections'))}</h2>${d.inspections.map((i) => `<details class="panel cinsp"><summary>${fmtDT(i.created_at)} · ${esc((pnm(i.performed_by_name, i.performed_by_name_hidden) || t('role_' + i.performed_by_name_role)))} · <span class="chip ${i.result === 'ok' ? 'ok' : 'kritisch'}">${i.result === 'ok' ? 'OK' : esc(t('defect'))}</span>${i.odometer_km ? ' · ' + fmtKm(i.odometer_km) : ''}</summary><table>${i.items.map((it) => `<tr><td>${esc(checkLabel(it.key))}</td><td><span class="chip ${it.result === 'mangel' ? 'kritisch' : it.result === 'ok' ? 'ok' : ''}">${esc(t(it.result === 'mangel' ? 'defect' : it.result))}</span>${it.note ? ' ' + esc(it.note) : ''}${it.followup_case_no ? (it.followup_case_id ? ` → <a href="#/cases/${esc(it.followup_case_id)}">${esc(it.followup_case_no)}</a>` : ` → ${esc(it.followup_case_no)}`) : ''}</td></tr>`).join('')}</table></details>`).join('')}`;


  if (d.work) {
    html += `<h2>${esc(t('work'))} & ${esc(t('parts'))}</h2><div class="scroll"><table><thead><tr><th>${esc(t('date'))}</th><th>${esc(t('activity'))}</th><th>${esc(t('hours'))}</th></tr></thead><tbody>${d.work.map((w) => `<tr><td>${fmtD(w.work_date)}</td><td>${esc(w.description)}<br><span class="small muted">${esc(w.user_name)}${todayAt(w.created_at) ? ` · <span data-bkat>${esc(t('cost_booked'))} ${todayAt(w.created_at)}</span>` : ''}</span></td><td>${hrs(w.hours)}</td></tr>`).join('') || `<tr><td colspan="3" class="muted">–</td></tr>`}</tbody></table>
      <table style="margin-top:8px"><thead><tr><th>${esc(t('part_name'))}</th><th>${esc(t('qty'))}</th><th>€</th></tr></thead><tbody>${d.parts.map((p) => `<tr><td><span${langAttr(p.name)}>${esc(p.name)}</span>${p.part_number ? ` <span class="small muted pn">${esc(p.part_number)}</span>${['owner', 'fleet', 'workshop'].includes(S.me.role) && p.part_number.trim().length >= 3 ? ` <a class="small noprint" href="#/stock/usage" data-puq="${esc(p.part_number)}">${esc(t('ptu_more'))}</a>` : ''}` : ''}${bookedAt(p.created_at)}${bookedWho(p.created_at, p.user_name)}${p.warranty_until ? '<br>' : ''}${warrChip(p.warranty_until)}${partFileLink(p, d)}</td><td>${fmtNum(p.quantity)} ${esc(unitL(p.unit))}</td><td>${p.unit_price_net === null ? `<span class="chip mittel">${esc(t('unvalued'))}</span>` : eur(rc2(Number(p.quantity) * p.unit_price_net)) + (Number(p.quantity) !== 1 ? ` <span class="small muted">(${esc(t('per_unit'))} ${eur3(p.unit_price_net)})</span>` : '') + (p.valuation === 'estimate' ? ' (' + esc(t('estimate')) + ')' : '')}</td></tr>`).join('') || `<tr><td colspan="3" class="muted">–</td></tr>`}</tbody></table></div>`;
  }
  if (d.costs) {
    const k = d.costs;
    html += `<section class="panel ${k.complete ? '' : ''}"><h3>${esc(t('costs'))}</h3><dl class="kv"><dt>${esc(t('actual_cost'))}</dt><dd>${eurIst(k)}</dd><dt>${esc(t('estimate'))}</dt><dd>${eur(k.estimate_net)}</dd><dt>${esc(t('unvalued'))}</dt><dd>${k.unvalued_items ? `<span class="chip mittel">${k.unvalued_items}</span>` : '0'}</dd><dt>${esc(t('hours'))}</dt><dd>${hrs(k.hours)}${k.hourly_rate_net === null ? ` <span class="small muted">(${esc(t('hourly_rate'))}: –)</span>` : ''}</dd>${d.cost_limit ? `<dt>${esc(t('cost_limit'))}</dt><dd>${d.cost_limit.limit_net !== null ? eur(d.cost_limit.limit_net) : '–'}${d.cost_limit.approved_net !== null ? ` · ${esc(t('cost_approved_upto'))} ${eur(d.cost_limit.approved_net)}` : ''}${d.cost_limit.over_since ? ` <span class="chip mittel">${esc(t('cost_approval_pending'))}</span>` : ''}</dd>` : ''}</dl>
      ${d.external_costs && d.external_costs.length ? `<table>${d.external_costs.map((x) => `<tr><td style="overflow-wrap:anywhere">${esc(x.supplier)} ${esc(x.invoice_no || '')}${bookedAt(x.created_at)}${warrChip(x.warranty_until)}${x.covers_work_and_parts ? `<br><span class="small muted">${esc(t('covers_all'))}</span>` : ''}${x.note ? `<br><span class="small muted" data-extnote>${esc(x.note)}</span>` : ''}${extFileLink(x)}</td><td>${x.amount_net === null ? esc(t('unvalued')) : eur(x.amount_net) + (x.valuation === 'estimate' ? ' (' + esc(t('estimate')) + ')' : '')}</td></tr>`).join('')}</table>` : ''}${k.external_replaces_own ? `<p class="small muted">${esc(t('ext_replaces_note'))}</p>` : ''}</section>`;
  }


  if (d.insurance_contracts) html += d.duplicate_of && !d.claim
    ? `<section class="panel"><h3>${esc(t('claim_title'))}</h3><p class="small muted">${esc(t('claim_dup_hint'))}${d.duplicate_of.id ? ` <a href="#/cases/${esc(d.duplicate_of.id)}" translate="no">${esc(d.duplicate_of.case_no)}</a>` : ''}</p></section>`
    : (await claimSection(d.claim, d.insurance_contracts, d.files || [], c.description, c, (d.vehicle_info && d.vehicle_info.coupled) || [])).replace('</h3>', () => `</h3>${claimNamedIn(d.opponent_in_claims)}`);

  {
    const spans = []; let cur = 'gemeldet'; let since = c.created_at;
    for (const e of d.events) if (e.to_status && e.to_status !== cur) { spans.push([cur, Date.parse(e.created_at) - Date.parse(since)]); cur = e.to_status; since = e.created_at; }
    const closed = ['fahrzeug_freigegeben', 'abgelehnt'].includes(cur);
    if (!closed) spans.push([cur, nowMs() - Date.parse(since)]);
    const sum = {}; for (const [st, ms] of spans) sum[st] = (sum[st] || 0) + Math.max(0, ms);
    const dur = (ms) => { const h = ms / 3600000; return h < 1 ? `${Math.round(ms / 60000)} ${t('min_short')}` : h < 48 ? `${fmtNum(Math.round(h * 10) / 10)} ${t('h_short')}` : `${nDays(Math.round((h / 24) * 10) / 10)}`; };
    if (Object.keys(sum).length > 1 || closed) html += `<h2>${esc(t('time_per_status'))}</h2><dl class="kv">${Object.entries(sum).map(([st, ms]) => `<dt>${esc(t('st_' + st))}${!closed && st === cur ? ` (${esc(t('current'))})` : ''}</dt><dd>${dur(ms)}</dd>`).join('')}</dl>`;
  }

  html += `<h2>${esc(t('history'))}</h2><ol class="timeline">${d.events.map((e) => `<li><time>${fmtDT(e.created_at)}</time> · <b>${esc(e.action === 'comment' && e.payload && e.payload.question ? t('act_question') : evLabel(e.action) ? evLabel(e.action) : e.action === 'create' ? t('report_sent') : e.action)}</b>${e.actor_name || e.actor_name_hidden ? ' · ' + esc(pnm(e.actor_name, e.actor_name_hidden)) : ''}${e.to_status && e.from_status !== e.to_status ? ` → ${esc(t('st_' + e.to_status))}` : ''}${e.note ? `<div style="white-space:pre-wrap"${langAttr(evNote(e))}>${esc(evNote(e))}</div>` : ''}${e.action === 'cost_limit_exceeded' && e.payload ? `<div class="small muted">${esc(t('costs'))} ${eur(e.payload.total_net)} > ${esc(t((e.payload.approved_net || 0) > (e.payload.limit_net || 0) ? 'cost_approved_upto' : 'cost_limit'))} ${eur(Math.max(e.payload.limit_net, e.payload.approved_net || 0))}</div>` : ''}${e.action === 'correct_vehicle' && e.payload && e.payload.inspection_id ? `<div class="small muted cvinsp">${esc(cvInspText(e.payload))}</div>` : ''}${e.action === 'file_added' && e.payload && e.payload.filename ? `<div class="small muted" data-fileev>📎 ${esc(e.payload.filename)}</div>` : ''}${e.action === 'approve_costs' && e.payload ? `<div class="small muted">${esc(t('cost_approved_upto'))} ${eur(e.payload.approved_net)}</div>` : ''}${e.action === 'parts_partial' && e.payload && 'to' in e.payload ? `<div class="small muted" data-ppev>${esc(t('pp_eta'))}: ${e.payload.from ? fmtD(e.payload.from) : '–'} → ${e.payload.to ? fmtD(e.payload.to) : '–'}</div>` : ''}${['parts_partial', 'resume_repair'].includes(e.action) && e.payload && e.payload.file_id ? `<div class="small" data-dlvev>📎 ${esc(t('dlv_file'))}: <a href="${fileUrl(e.payload.file_id)}" target="_blank" rel="noopener">${esc(e.payload.file_name || '')}</a></div>` : ''}${e.payload && e.payload.work_state_cleared ? `<div class="small muted" data-wscev>${esc(t('rr_ws_cleared'))}</div>` : ''}${e.action === 'set_parts_eta' && e.payload ? `<div class="small muted">${e.payload.from ? fmtD(e.payload.from) : '–'} → ${e.payload.to ? fmtD(e.payload.to) : '–'}</div>` : evFromTo(e)}${e.payload && e.payload.planned_to ? `<div class="small muted">${esc(t('planned'))}: ${e.payload.planned_from ? fmtD(e.payload.planned_from) + ' → ' : ''}${fmtD(e.payload.planned_to)}</div>` : ''}${e.payload && e.payload.parts_expected_date ? `<div class="small muted">${esc(t('parts_eta'))} ${fmtD(e.payload.parts_expected_date)}</div>` : ''}${e.payload && e.payload.pickup_for_driver ? `<div class="small muted" data-puev>${esc(t('pu_ev_driver'))}${e.payload.pickup_valid_until ? ' · ' + esc(t('pu_valid_until')) + ' ' + fmtD(e.payload.pickup_valid_until) : ''}</div>` : ''}${e.payload && e.payload.pickup_replaced ? `<div class="small muted" data-pureplev>${esc(tn('pu_ev_replaced', e.payload.pickup_replaced))}</div>` : ''}${e.payload && e.payload.winter_open_confirmed ? `<div class="small muted wqev">❄ ${esc(t('wq_ev_open'))}${[...(e.payload.noncompliant || []), ...(e.payload.missing || [])].length ? ': ' + esc([...(e.payload.noncompliant || []), ...(e.payload.missing || [])].join(', ')) : ''}</div>` : ''}</li>`).join('')}</ol>`;
  if (A.includes('comment')) html += `<form id="cf"><label for="ct">${esc(t('act_comment'))}</label><textarea id="ct" required minlength="3"></textarea>${S.me.role !== 'driver' ? `<fieldset style="border:0;padding:0;margin:8px 0"><legend class="small muted">${esc(t('notify_only'))}</legend><div style="display:flex;gap:14px;flex-wrap:wrap">${[['fleet', t('nt_fleet_owner')], ['workshop', t('role_workshop')], ['reporter', t('reported_by')]].filter(([k]) => k !== 'workshop' || (c.status !== 'abgelehnt' && (c.workshop_site || c.suggested_workshop_site))).map(([k, l]) => { const off = k === 'reporter' && d.reporter_unreachable; return `<label class="small${off ? ' muted' : ''}" style="display:flex;gap:6px;align-items:center;min-height:44px"><input type="checkbox" data-nt="${k}"${off ? ' disabled' : ''}> ${esc(l)}${off ? ` <span style="white-space:nowrap">(${esc(t(d.reporter_unreachable === 'inactive' ? 'reporter_off_inactive' : 'reporter_off_other'))})</span>` : ''}</label>`; }).join('')}</div>${isMgr() && !d.reporter_unreachable && c.reporter_id && c.reporter_id !== S.me.id && OPEN_CASE_ST.includes(c.status) ? `<label class="small" style="display:flex;gap:6px;align-items:center;min-height:44px"><input type="checkbox" data-q> ${esc(t('q_ask'))}</label>` : ''}</fieldset>` : ''}<div class="actions"><button class="btn secondary">${esc(t('save'))}</button></div></form>`;
  if (!onPage('#/cases/' + id, '#/cases/' + c.id)) return;
  if (S.quietBg && caseHashId() !== String(id)) return;
  render(html, 'cases', { defer: true });
  S.caseView = { id: String(id), at: Date.now(), sig: caseSig(d) };
  $('#cprt').onclick = () => window.print();






  const cmd = async (action, note, payload = {}, opts = {}) => {
    const fAct = opts.formAction || action;
    const key = JSON.stringify([c.id, action, note ?? null, payload]);

    const commandId = S.pendCmd && S.pendCmd.key === key && Date.now() - S.pendCmd.at < 10 * 60000 ? S.pendCmd.id : uid(); S.pendCmd = { key, id: commandId, at: Date.now() };
    try { const r = await api('POST', `/api/cases/${c.id}/commands`, { action, command_id: commandId, expected_version: c.version, note, payload }, { timeoutMs: SEND_TIMEOUT_MS }); if (S.cmdOffline && S.cmdOffline.key === key) S.cmdOffline = null; S.pendCmd = null; if (r && r.no_workshop_user) toast(t('no_ws_user_warn'), true); else if (r && r.external_workshop) toast(t('ext_ws_hint')); else if (r && r.no_recipients) toast(t('no_recipients_warn'), true); else if (r && r.km_rejected && !r.duplicate) toast('✓ · ⚠ ' + (r.km_rejected.next_km !== undefined ? t('ev_km_greater').replace('{km}', fmtNum(r.km_rejected.km)).replace('{next}', fmtNum(r.km_rejected.next_km)) : t('ev_km_smaller').replace('{km}', fmtNum(r.km_rejected.km)).replace('{prev}', fmtNum(r.km_rejected.previous_km))), true); else if (r && r.km_test_only && !r.duplicate) toast('✓ · ' + t('ext_km_test_toast')); else toast(r && r.duplicate ? t('cmd_duplicate') : '✓'); if (action === 'record_work' && r && !r.duplicate) S.workNext = { from: c.id, date: payload.work_date || bDate(), at: Date.now() }; if (S.openAct && S.openAct.action === fAct) S.openAct = null; actDraft(c.id).clear(); if (opts.next) return opts.next(r); viewCase(c.id); }







    catch (err) {
      if (err.offline) { S.cmdOffline = { key, at: Date.now() }; actDraftSave(c.id, fAct); }
      const maybeMine = err.code === 'version_conflict' && S.cmdOffline && S.cmdOffline.key === key;
      const generic = err.code === 'version_conflict' && action !== 'approve_costs';
      if (!generic) toast(err.offline ? `${err.message} ${t('cmd_offline_kept')}` : err.message, true);
      if (err.code === 'version_conflict') {
        S.actSince = []; S.lostAct = { caseId: c.id, action, note, payload }; try { await viewCase(c.id); } catch {}
        const lost = $('#lostact'); if (lost) lost.scrollIntoView({ block: 'center' }); else if (generic) toast(t(maybeMine ? 'cmd_maybe_saved' : 'case_conflict_kept'), true);
        if (maybeMine) { S.cmdOffline = null; actDraft(c.id).clear(); }
      } else if (err.code === 'cost_approval_open') viewCase(c.id);
      else if (err.code === 'insufficient_stock' && action === 'add_part' && payload.stock_item_id) stockShortfall(payload.stock_item_id, err.data);
      else if (err.code === 'duplicate_invoice' && action === 'add_external_cost') dupInvoiceHint(err.data);
    }
  };
  const nu = $('#nextunrec'); if (nu) nu.onclick = async () => {
    try {
      const r = await api('GET', '/api/cases?status=open&unreceived=1&limit=50');
      const nx = (r.cases || []).find((x) => x.id !== c.id);
      if (nx) location.hash = `#/cases/${encodeURIComponent(nx.id)}`; else toast(t('next_unreceived_none'));
    } catch (err) { toast(err.message, true); }
  };
  $$('[data-act]').forEach((b) => (b.onclick = () => actionForm(b.dataset.act, c, cmd, {}, d)));

  $$('[data-cppull]').forEach((b) => (b.onclick = () => {
    const f = b.closest('form'); if (!f) return;
    const map = { police_station: b.dataset.st, police_ref: b.dataset.ref, police_reported_on: b.dataset.on };
    if (Object.entries(map).some(([k, v]) => f.elements[k] && f.elements[k].value && f.elements[k].value !== v) && !confirm(t('cp_pull_confirm'))) return;
    for (const [k, v] of Object.entries(map)) if (f.elements[k]) { f.elements[k].value = v || ''; f.elements[k].dispatchEvent(new Event('input', { bubbles: true })); }
    toast(t('cp_pulled'));
  }));
  $$('[data-resolve]').forEach((b) => (b.onclick = () => actionForm('resolve_open_item', c, cmd, { open_item_id: b.dataset.resolve })));

  $$('[data-relres]').forEach((b) => (b.onclick = () => actionForm('resolve_released_item', c, cmd, { open_item_id: b.dataset.relres }, d)));



  $$('[data-oifu]').forEach((b) => (b.onclick = () => {
    const old = $('#oiff'); if (old) old.remove();
    const row = b.closest('.row'); const safety = b.dataset.safety === '1';
    const f = document.createElement('form'); f.id = 'oiff'; f.className = 'panel';
    f.innerHTML = `<p class="small muted">${esc(t(safety ? 'oi_to_case_hint_safety' : 'oi_to_case_hint'))}</p>${c.safety_lock ? `<p class="small warn" role="note" data-oilock>${esc(t('oi_lock_stays'))}</p>` : ''}<label for="oifp">${esc(t('urgency'))}</label><select id="oifp" name="priority">${['niedrig', 'mittel', 'kritisch'].map((p) => `<option value="${p}"${p === (safety ? 'kritisch' : 'mittel') ? ' selected' : ''}>${esc(t('prio_' + p))}</option>`).join('')}</select><label for="oifn">${esc(t('note'))}</label><textarea id="oifn" name="note" rows="2" maxlength="1000"></textarea><div class="actions"><button class="btn">${esc(t('oi_to_case'))}</button><button type="button" class="btn secondary" id="oifx">${esc(t('cancel'))}</button></div>`;
    row.after(f);
    $('#oifx').onclick = () => f.remove();
    f.onsubmit = async (e) => {
      e.preventDefault();
      try {
        const r = await api('POST', `/api/cases/${encodeURIComponent(c.id)}/open-items/${encodeURIComponent(b.dataset.oifu)}/followup`, { priority: $('#oifp').value, note: $('#oifn').value.trim() || undefined }, { timeoutMs: SEND_TIMEOUT_MS });
        toast(t('oi_to_case_done').replace('{v}', () => r.case_no));
        location.hash = `#/cases/${encodeURIComponent(r.id)}`;
      } catch (err) { toast(err.message, true); }
    };
  }));


  if (S.openAct && (S.openAct.caseId !== c.id || !S.renderSame || !A.includes(S.openAct.action))) S.openAct = null;


  let actDr = null;
  if (!S.openAct && !(S.lostAct && S.lostAct.caseId === c.id)) {
    const ad = actDraft(c.id); const x = ad.load();
    if (x && x.action && A.includes(x.action)) { S.openAct = { caseId: c.id, action: x.action, preset: x.preset || {} }; actDr = x; }
    else if (x && x.action) { const { note = null, ...payload } = x.v; S.lostAct = { caseId: c.id, action: x.action, note, payload }; ad.clear(); }
  }

  if (S.lostAct && (S.lostAct.caseId !== c.id || A.includes(S.lostAct.action))) S.lostAct = null;
  if (S.lostAct && $('#actform')) showLostInputs(c);

  if (S.openAct) { try { await actionForm(S.openAct.action, c, cmd, S.openAct.preset, d, { restore: true }); } catch {   } }
  if (actDr && $('#af')) restoreActDraft(c, actDr);


  if (S.autoAct && S.autoAct.caseId === c.id) { const aa = S.autoAct; S.autoAct = null; if (!S.openAct && A.includes(aa.action) && $('#actform')) { await actionForm(aa.action, c, cmd, {}, d); const wi = $('#af input[name=work_date]'); if (wi && aa.date && aa.date !== wi.value && aa.date <= bDate()) { wi.value = aa.date; wi.dispatchEvent(new Event('change', { bubbles: true })); } } }
  if (S.workNext && S.workNext.from === c.id && !S.openAct && Date.now() - S.workNext.at < 60000) { const wn = S.workNext; S.workNext = null; workNextPanel(c, wn); } else if (S.workNext && S.workNext.from !== c.id) S.workNext = null;
  finishRender();

  if (S.clLost && S.clLost.id === c.id) { const L = S.clLost; S.clLost = null; if ($('#clf')) conflictKeep($('#clf'), L, 'cllost'); }
  const clf = $('#clf'); if (clf) clf.onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(clf)); for (const k of Object.keys(b)) if (b[k] === '') b[k] = null; try { const r = await api('PUT', `/api/cases/${c.id}/claim`, b, { timeoutMs: SEND_TIMEOUT_MS });   if (r && r.warning && r.warning.code === 'contract_not_valid_at_occurrence') toast(t('claim_contract_invalid').replace('{d}', fmtD(r.warning.day)).replace('{p}', `${r.warning.start_date ? fmtD(r.warning.start_date) : '…'}–${r.warning.end_date ? fmtD(r.warning.end_date) : '…'}`), true); else toast('✓'); viewCase(c.id); } catch (err) { if (err.code === 'version_conflict') { S.clLost = { id: c.id, ...conflictMine(clf) }; viewCase(c.id); return; } toast(err.message, true); } };
  const cf = $('#cf'); if (cf) cf.onsubmit = (e) => { e.preventDefault(); const q = !!($('[data-q]', cf) || {}).checked; const notify = $$('[data-nt]', cf).filter((x) => x.checked).map((x) => x.dataset.nt); if (q && !notify.includes('reporter')) notify.push('reporter'); return cmd('comment', $('#ct').value, { ...(notify.length ? { notify } : {}), ...(q ? { question: true } : {}) }); };

  const qbox = cf && $('[data-q]', cf); if (qbox) qbox.onchange = () => { const r = $('[data-nt="reporter"]', cf); if (qbox.checked && r) r.checked = true; };


  const fi = $('#file'); if (fi) fi.onchange = async () => {
    const all = [...fi.files]; const take = all.slice(0, filesFree); const skipped = all.slice(filesFree); const errs = []; const dupes = [];


    const prog = document.createElement('span'); prog.className = 'small muted'; prog.setAttribute('role', 'status'); fi.after(prog); fi.disabled = true;

    const who = outboxWho(); const ox = who ? { env: who.env } : {}; const hash0 = location.hash;
    let later = 0, darkN = 0, blurN = 0;
    for (const [i, file] of take.entries()) {
      prog.textContent = ` ${t('uploading')} ${i + 1}/${take.length}`;
      try {
        const taken = await photoTakenAt(file); const blob = await prepareUpload(file);


        const rej = uploadReject(blob, file.name); if (rej) { errs.push(`${file.name}: ${rej}`); continue; }
        const r = await api('POST', `/api/cases/${c.id}/files`, blob, { timeoutMs: PHOTO_TIMEOUT_MS, ...ox, headers: photoHeaders(file.name, blob, taken) });
        if (r && r.duplicate) dupes.push(file.name);
        else { const q = await photoCheck(blob); if (q.dark) darkN++; else if (q.blurry) blurN++; }
      }
      catch (err) {

        if (err.code === 'too_many') { errs.push(t('files_full').replace('{max}', PHOTO_MAX)); break; }
        if (photoRetry(err)) { later = await photosLater('/api/cases', { request_key: uid() }, c, c.id, take.slice(i), who); if (!later) errs.push(`${file.name}: ${err.message}`); break; }
        errs.push(`${file.name}: ${err.message}`);
      }
    }
    prog.remove(); fi.disabled = false;
    if (later) toast(tn('photos_stored', later));

    if (location.hash === hash0 && (!who || (outboxWho() || {}).env === who.env)) await viewCase(c.id).catch(() => {});
    if (skipped.length) errs.unshift(tn('files_skipped', skipped.length).replace('{max}', PHOTO_MAX).replace('{names}', skipped.map((f) => f.name).join(', ')));
    if (dupes.length) errs.push(`${t('file_dup')}: ${dupes.join(', ')}`);
    if (darkN) errs.push(tn('photos_dark_added', darkN));
    if (blurN) errs.push(tn('photos_blurry_added', blurN));
    const hints = (darkN ? 1 : 0) + (blurN ? 1 : 0);
    if (errs.length) toast(errs.join(' · '), errs.length > hints); else if (take.length && !later) toast('✓');
  };
}



const CLAIM_CLS = { gemeldet: 'mittel', in_pruefung: 'mittel', reguliert: 'ok', abgelehnt: 'kritisch', zurueckgezogen: '' };
const claimChip = (st) => `<span class="chip ${CLAIM_CLS[st]}">${esc(t('cls_' + st))}</span>`;



const claimNamedIn = (list) => (list && list.length ? `<p class="small" data-conamed>ℹ️ ${esc(t('co_named_in'))} ${list.map((x) => `<a href="#/cases/${esc(x.case_id)}" style="white-space:nowrap" translate="no">${esc(x.case_no)}</a> (${plate(x.plate)})`).join(', ')}</p>` : '');

async function claimSection(...a) { return (await lazyModule('schaden')).claimSection(...a); }
async function viewClaims(...a) { return (await lazyModule('verwaltung')).viewClaims(...a); }


const tachoHistList = (list, canCancel) => `<ul class="small tachohist">${list.map((o) => `<li${o.cancelled_at ? ' class="muted"' : ''}>${o.cancelled_at ? '<s>' : ''}${fmtD(o.downloaded_on)} · ${esc(o.evidence)}${o.note ? ' – ' + esc(o.note === 'Import' ? t('odo_src_import') : o.note) : ''}${o.cancelled_at ? '</s>' : ''}${o.created_by_name ? ` <span class="muted">(${esc(o.created_by_name)})</span>` : ''}${o.cancelled_at ? ` <span class="chip">${esc(t('tacho_cancelled'))}</span> ${esc(o.cancel_reason || '')}` : canCancel ? ` <button type="button" class="btn secondary small" data-tcancel="${esc(o.id)}">${esc(t('tacho_cancel'))}</button>` : ''}</li>`).join('')}</ul>${canCancel && list.some((o) => !o.cancelled_at) ? `<p class="small muted noprint">${esc(t('tacho_cancel_hint'))}</p>` : ''}`;
const bindTachoCancel = (root, reload) => $$('[data-tcancel]', root).forEach((b) => (b.onclick = async () => { const reason = prompt(t('tacho_cancel_reason')); if (!reason) return; try { await api('POST', `/api/tacho/downloads/${b.dataset.tcancel}/cancel`, { reason }, { timeoutMs: SEND_TIMEOUT_MS });   toast('✓'); reload(); } catch (err) { toast(err.message, true); } }));


const wsLabel = (w) => (w && w.code === 'EXTERN' ? t('ws_extern') : (w && w.name) || '') + (w && w.active === false ? ` (${t('ws_closed')})` : '');

const wsAll = () => (S.meta && (S.meta.workshops_all || S.meta.workshops)) || [];
const wsName = (code) => wsLabel(wsAll().find((w) => w.code === code)) || code || '–';


const viBy = (o) => { const a = [o.workshop_site ? t('vi_done_ws').replace('{ws}', wsName(o.workshop_site)) : '', o.ext_suppliers && o.ext_suppliers.length ? t('vi_done_ext').replace('{list}', o.ext_suppliers.join(', ')) : '', o.parts && o.parts.length ? t('vi_done_parts').replace('{list}', o.parts.join(', ')) : ''].filter(Boolean); return a.length ? `<br><span class="small muted" data-viby>${esc(a.join(' · '))}</span>` : ''; };

const extPrevSame = (vi, name) => { const k = String(name || '').trim().toLowerCase(); if (!k || !vi) return []; const seen = new Set(); return [...(vi.previous_same_item || []), ...(vi.recent_closed || [])].filter((o) => o.id && (o.ext_suppliers || []).some((x) => String(x).trim().toLowerCase() === k) && !seen.has(o.id) && seen.add(o.id)); };
const supplierLabel = (x) => { const m = /^Lager (\S+)$/.exec(String(x || '')); return m && wsAll().some((w) => w.code === m[1]) ? t('part_from_stock').replace('{ws}', wsName(m[1])) : x; };
const checkLabel = (k) => (CHECK_LABELS[S.lang] || CHECK_LABELS.de)[k] || k;


const cDesc = (s) => caseDescText(s, S.lang, { kind: mk, res: (c) => (c ? t('res_' + c) : null) });




const freeLang = (s) => {
  const x = String(s || ''); const cy = (x.match(/[Ѐ-ӿ]/g) || []).length; const la = (x.match(/[a-zäöüß]/gi) || []).length;
  if (!cy && !la) return null;
  const l = cy > la ? (/[ыэъё]/i.test(x) && !/[іїєґ]/i.test(x) ? 'ru' : 'uk') : (S.lang === 'uk' ? '' : S.lang);
  return l === S.lang ? null : l;
};
const langAttr = (s) => { const l = freeLang(s); return l === null ? '' : ` lang="${l}"`; };

const ltxt = (s) => { const a = langAttr(s); return a ? `<span${a}>${esc(s)}</span>` : esc(s); };



const PHOTO_MAX = 10;



const MEDIA_EXT = /\.(mp4|m4v|mov|qt|3gp|3g2|avi|mkv|webm|wmv|mpe?g|m4a|mp3|aac|amr|ogg|oga|opus|wav|flac|caf)$/i;
const isMediaFile = (f) => !!f && (/^(video|audio)\//i.test(f.type || '') || ((!f.type || f.type === 'application/octet-stream') && MEDIA_EXT.test(f.name || '')));
const photoUsable = (input) => [...((input && input.files) || [])].filter((f) => !isMediaFile(f)).slice(0, PHOTO_MAX);

const photoOldDay = (taken, ref) => { let o = null; for (const x of taken || []) { const d = x ? String(x).slice(0, 10) : ''; if (/^\d{4}-\d{2}-\d{2}$/.test(d) && ref && d < ref && (!o || d < o)) o = d; } return o; };
function photoLimitWatch(input, oldRef) {
  if (!input) return;
  const note = document.createElement('p'); note.className = 'panel warn small'; note.setAttribute('role', 'status'); note.hidden = true; note.dataset.photomax = '';
  input.insertAdjacentElement('afterend', note);

  const dark = document.createElement('p'); dark.className = 'panel warn small'; dark.setAttribute('role', 'status'); dark.hidden = true; dark.dataset.photodark = '';
  note.insertAdjacentElement('afterend', dark);

  const blur = document.createElement('p'); blur.className = 'panel warn small'; blur.setAttribute('role', 'status'); blur.hidden = true; blur.dataset.photoblur = '';
  dark.insertAdjacentElement('afterend', blur);

  const old = document.createElement('p'); old.className = 'panel warn small'; old.setAttribute('role', 'status'); old.hidden = true; old.dataset.photoold = '';
  blur.insertAdjacentElement('afterend', old);

  const media = document.createElement('p'); media.className = 'panel warn small'; media.setAttribute('role', 'status'); media.hidden = true; media.dataset.photomedia = '';
  input.insertAdjacentElement('afterend', media);
  let taken = [];
  const oldUpd = () => { const r = oldRef ? oldRef() : null; const d = r ? photoOldDay(taken, r.day) : null; old.hidden = !d; old.textContent = d ? t(r.k).replace('{d}', fmtD(d)) : ''; };
  input._photoOld = oldUpd;
  let run = 0;
  input.onchange = async () => {
    const mf = [...(input.files || [])].filter(isMediaFile);
    media.hidden = !mf.length; media.textContent = mf.length ? t('photos_media_skip').replace('{names}', mf.map((f) => f.name || '?').join(', ')) : '';
    const n = (input.files || []).length - mf.length;
    note.hidden = n <= PHOTO_MAX;
    note.textContent = n > PHOTO_MAX ? t('photos_over_max').replace('{n}', n).replace('{max}', PHOTO_MAX) : '';
    const my = ++run; dark.hidden = true; dark.textContent = ''; blur.hidden = true; blur.textContent = ''; taken = []; oldUpd();
    if (oldRef) { const tk = []; for (const f of photoUsable(input)) tk.push(await photoTakenAt(f)); if (my !== run || !old.isConnected) return; taken = tk; oldUpd(); }
    let d = 0, b = 0; for (const f of photoUsable(input)) { const q = await photoCheck(f); if (q.dark) d++; else if (q.blurry) b++; }
    if (my !== run || !dark.isConnected) return;
    dark.hidden = !d; dark.textContent = d ? tn('photos_dark', d) : '';
    blur.hidden = !b; blur.textContent = b ? tn('photos_blurry', b) : '';
  };
}



const PHOTO_DARK_LUMA = 40;
const lumaMean = (px) => { let s = 0, n = 0; for (let i = 0; i + 3 < px.length; i += 4) { if (px[i + 3] < 128) continue; s += 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]; n++; } return n ? s / n : 255; };





const PHOTO_BLUR_SIDE = 256, PHOTO_BLUR_EDGE = 16, PHOTO_BLUR_MIN_EDGES = 20, PHOTO_BLUR_MIN_SD = 8;
const photoSharpness = (px, w, h) => {
  if (w < 3 || h < 3) return null;
  const y = new Float32Array(w * h); let s = 0, s2 = 0;
  for (let i = 0; i < w * h; i++) { const v = 0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]; y[i] = v; s += v; s2 += v * v; }
  const n = w * h, mean = s / n, sd = Math.sqrt(Math.max(0, s2 / n - mean * mean));
  let edges = 0;
  for (let r = 1; r < h - 1; r++) for (let c = 1; c < w - 1; c++) { const i = r * w + c; if (Math.abs(4 * y[i] - y[i - 1] - y[i + 1] - y[i - w] - y[i + w]) > PHOTO_BLUR_EDGE) edges++; }
  return { edges, sd };
};
const isBlurry = (q) => !!q && q.sd >= PHOTO_BLUR_MIN_SD && q.edges < PHOTO_BLUR_MIN_EDGES;

async function photoCheck(file) {
  const none = { dark: false, blurry: false };
  if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type || '')) return none;
  try {
    const bmp = await decodeImage(file);
    try {
      const cv = document.createElement('canvas'); cv.width = 32; cv.height = 32; const cx = cv.getContext('2d'); cx.drawImage(bmp.src, 0, 0, 32, 32);
      if (lumaMean(cx.getImageData(0, 0, 32, 32).data) < PHOTO_DARK_LUMA) return { dark: true, blurry: false };
      if (!bmp.w || !bmp.h) return none;
      const sc = Math.min(1, PHOTO_BLUR_SIDE / Math.max(bmp.w, bmp.h)); const w = Math.max(1, Math.round(bmp.w * sc)), h = Math.max(1, Math.round(bmp.h * sc));
      const cb = document.createElement('canvas'); cb.width = w; cb.height = h; const xb = cb.getContext('2d'); xb.imageSmoothingQuality = 'high'; xb.drawImage(bmp.src, 0, 0, w, h);
      return { dark: false, blurry: isBlurry(photoSharpness(xb.getImageData(0, 0, w, h).data, w, h)) };
    } finally { bmp.done(); }
  } catch { return none; }
}

const UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
function uploadReject(blob, name = '') {
  const tp = String(blob.type || '').toLowerCase();
  if (/heic|heif/.test(tp) || /\.(heic|heif)$/i.test(name) && !UPLOAD_TYPES.includes(tp)) return t('file_heic_hint');
  if (isMediaFile({ type: tp, name })) return t('file_media_hint');
  if (tp && !UPLOAD_TYPES.includes(tp)) return t('err_type');
  if (blob.size > UPLOAD_MAX_BYTES) return t('err_too_large');
  return '';
}


async function decodeImage(file) {
  if (typeof createImageBitmap === 'function') { try { const b = await createImageBitmap(file); return { src: b, w: b.width, h: b.height, done: () => {} }; } catch {   } }
  const url = URL.createObjectURL(file); const img = new Image();
  try { img.src = url; await img.decode(); } catch (e) { URL.revokeObjectURL(url); throw e; }
  return { src: img, w: img.naturalWidth, h: img.naturalHeight, done: () => URL.revokeObjectURL(url) };
}



function exifTaken(v) {
  if (v.byteLength < 4 || v.getUint16(0) !== 0xFFD8) return null;
  let p = 2;
  while (p + 4 <= v.byteLength) {
    const mk = v.getUint16(p); if ((mk & 0xFF00) !== 0xFF00 || mk === 0xFFDA) return null;
    const len = v.getUint16(p + 2);
    if (mk === 0xFFE1 && p + 10 <= v.byteLength && v.getUint32(p + 4) === 0x45786966) {
      const t0 = p + 10, end = Math.min(v.byteLength, p + 2 + len); if (t0 + 8 > end) return null;
      const bo = v.getUint16(t0); if (bo !== 0x4949 && bo !== 0x4D4D) return null; const le = bo === 0x4949;
      const okR = (o, n) => o >= 0 && t0 + o + n <= end; const u16 = (o) => v.getUint16(t0 + o, le), u32 = (o) => v.getUint32(t0 + o, le);
      const ifd = (o) => { const out = {}; if (!okR(o, 2)) return out; const n = u16(o); for (let i = 0; i < n && i < 400; i++) { const e = o + 2 + i * 12; if (!okR(e, 12)) break; out[u16(e)] = { type: u16(e + 2), count: u32(e + 4), at: e + 8 }; } return out; };
      const str = (en) => { if (!en || en.type !== 2 || en.count > 64) return null; const off = en.count > 4 ? u32(en.at) : en.at; if (!okR(off, en.count)) return null; let x = ''; for (let i = 0; i < en.count; i++) { const ch = v.getUint8(t0 + off + i); if (!ch) break; x += String.fromCharCode(ch); } return x; };
      if (!okR(4, 4)) return null;
      const i0 = ifd(u32(4)); const ep = i0[0x8769]; const ex = ep && ep.count === 1 ? ifd(ep.type === 3 ? u16(ep.at) : u32(ep.at)) : {};
      const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})/.exec(str(ex[0x9003]) || str(ex[0x9004]) || '');
      if (!m || m[1] < '2000' || +m[2] < 1 || +m[2] > 12 || +m[3] < 1 || +m[3] > 31 || +m[4] > 23 || +m[5] > 59) return null;
      return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`;
    }
    p += 2 + len;
  }
  return null;
}
async function photoTakenAt(file) {
  try {
    if (!file || !(/^image\/jpe?g$/i.test(file.type || '') || (!file.type && /\.jpe?g$/i.test(file.name || '')))) return null;
    return exifTaken(new DataView(await file.slice(0, 131072).arrayBuffer()));
  } catch { return null; }
}

async function prepPhoto(f) { const taken = await photoTakenAt(f); return { blob: await prepareUpload(f), name: f.name, ...(taken ? { taken } : {}) }; }
const photoHeaders = (name, blob, taken) => ({ 'x-filename': encodeURIComponent(name), 'content-type': blob.type || 'application/octet-stream', ...(taken ? { 'x-taken-at': taken } : {}) });
async function prepareUpload(file) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  try {
    const bmp = await decodeImage(file);
    try {
      if (!bmp.w || !bmp.h) return file;
      const scale = Math.min(1, 1600 / Math.max(bmp.w, bmp.h));
      const cv = document.createElement('canvas');
      cv.width = Math.round(bmp.w * scale); cv.height = Math.round(bmp.h * scale);
      cv.getContext('2d').drawImage(bmp.src, 0, 0, cv.width, cv.height);
      return await new Promise((res) => cv.toBlob((b) => res(b || file), 'image/jpeg', 0.82));
    } finally { bmp.done(); }
  } catch { return file; }
}



async function loadDupOptions(c) {
  const hint = () => $('#dupmore');
  try {
    const r = await api('GET', `/api/cases?vehicle_id=${encodeURIComponent(c.vehicle_id)}&status=open&sort=oldest&limit=500`);
    const sel = $('#dupsel'); if (!sel || !hint()) return;
    const list = (r.cases || []).filter((o) => o.id !== c.id && !o.duplicate_of).reverse();
    const keep = sel.value;
    sel.innerHTML = `<option value="">${esc(t('dup_none'))}</option>${list.map((o) => `<option value="${esc(o.id)}">${esc(o.case_no)} · ${esc(t('st_' + o.status))}</option>`).join('')}`;
    if (list.some((o) => o.id === keep)) sel.value = keep;
    hint().textContent = r.truncated ? t('dup_more_fail') : tn('dup_all', list.length);
  } catch { if (hint()) hint().textContent = t('dup_more_fail'); }
}


const extFileLink = (x) => (x.file_id && x.file_name ? `<br><span class="small" data-extfile>📎 ${esc(t('ext_file'))}: <a href="${fileUrl(x.file_id)}" target="_blank" rel="noopener">${esc(x.file_name)}</a></span>` : '');

const oiFileLink = (o, d) => { const f = o.file_id && ((d && d.files) || []).find((x) => x.id === o.file_id); return f ? `<br><span class="small" data-oifile>📎 <a href="${fileUrl(f.id)}" target="_blank" rel="noopener">${esc(f.content_type === 'application/pdf' ? 'PDF' : t('ext_photo'))} · ${esc(f.filename)}</a></span>` : ''; };
function oiFileSelect(d) {
  const files = (d && d.files) || [];
  if (!files.length) return `<p class="small muted" id="oifile-none">${esc(t('oi_file_none'))}</p>`;
  return `<label for="oifile">${esc(t('oi_file'))}<span class="hint">${esc(t('oi_file_hint'))}</span></label><select id="oifile" name="file_id"><option value="">–</option>${files.slice().reverse().map((f) => `<option value="${esc(f.id)}">${esc(f.content_type === 'application/pdf' ? 'PDF' : t('ext_photo'))} · ${esc(f.filename)} · ${fmtDT(f.created_at)}</option>`).join('')}</select>`;
}

function partFileSelect(d) {
  const files = (d && d.files) || [];
  if (!files.length) return `<p class="small muted" id="partfile-none">${esc(t('pt_file_none'))}</p>`;
  return `<label for="partfile">${esc(t('pt_file'))}<span class="hint">${esc(t('oi_file_hint'))}</span></label><select id="partfile" name="file_id"><option value="">–</option>${files.slice().reverse().map((f) => `<option value="${esc(f.id)}">${esc(f.content_type === 'application/pdf' ? 'PDF' : t('ext_photo'))} · ${esc(f.filename)} · ${fmtDT(f.created_at)}</option>`).join('')}</select>`;
}

function dlvFileSelect(d) {
  const files = (d && d.files) || [];
  if (!files.length) return `<p class="small muted" id="dlvfile-none">${esc(t('dlv_file_none'))}</p>`;

  const more = files.length >= PHOTO_MAX ? `<p class="panel warn small" id="dlvfile-full">${esc(t('files_full').replace('{max}', PHOTO_MAX))} ${esc(t('dlv_file_full'))}</p>` : '';
  return `${more}<label for="dlvfile">${esc(t('dlv_file'))}<span class="hint">${esc(t('oi_file_hint'))}</span></label><select id="dlvfile" name="file_id"><option value="">–</option>${files.slice().reverse().map((f) => `<option value="${esc(f.id)}">${esc(f.content_type === 'application/pdf' ? 'PDF' : t('ext_photo'))} · ${esc(f.filename)} · ${fmtDT(f.created_at)}</option>`).join('')}</select>`;
}
const partFileLink = (p, d) => { const f = p.file_id && ((d && d.files) || []).find((x) => x.id === p.file_id); return f ? `<br><span class="small" data-partfile>📎 <a href="${fileUrl(f.id)}" target="_blank" rel="noopener">${esc(f.content_type === 'application/pdf' ? 'PDF' : t('ext_photo'))} · ${esc(f.filename)}</a></span>` : ''; };
function extFileSelect(d) {
  const files = (d && d.files) || [];
  if (!files.length) return `<p class="small muted" id="extfile-none">${esc(t('ext_file_none'))}</p>`;
  return `<label for="extfile">${esc(t('ext_file'))}<span class="hint">${esc(t('ext_file_hint'))}</span></label><select id="extfile" name="file_id"><option value="">–</option>${files.slice().reverse().map((f) => `<option value="${esc(f.id)}">${esc(f.content_type === 'application/pdf' ? 'PDF' : t('ext_photo'))} · ${esc(f.filename)} · ${fmtDT(f.created_at)}</option>`).join('')}</select>`;
}
function extDocList(d) {
  const xs = ((d && d.external_costs) || []).filter((x) => x.file_id && x.file_name);
  if (!xs.length) return '';
  return `<div id="extdocs"><p class="small" style="margin-bottom:2px"><strong>${esc(t('ext_docs'))}</strong></p><ul class="small" style="margin-top:0">${xs.map((x) => `<li>${esc(x.supplier)}${x.amount_net === null ? '' : ' · ' + eur(x.amount_net) + (x.valuation === 'estimate' ? ' (' + esc(t('estimate')) + ')' : '')}: <a href="${fileUrl(x.file_id)}" target="_blank" rel="noopener">${esc(x.file_name)}</a></li>`).join('')}</ul></div>`;
}
const LOST_LABELS = { hours: 'hours', description: 'activity', work_date: 'date', name: 'part_name', part_number: 'part_number', quantity: 'qty', unit_price_net: 'price_net', supplier: 'supplier', invoice_no: 'invoice_no', amount_net: 'amount_net', parts_expected_date: 'parts_eta', planned_date: 'planned', followup_on: 'followup', priority: 'new_priority', workshop_site: 'workshop' };
function showLostInputs(c) {
  const la = S.lostAct; const box = $('#actform'); if (!la || !box) return;
  const rows = Object.entries(la.payload || {}).filter(([k, v]) => v !== null && v !== '' && typeof v !== 'object' && typeof v !== 'boolean' && !/^(confirm|command|stock_item_id|file_id)/.test(k)).map(([k, v]) => [t(LOST_LABELS[k] || k), /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? fmtD(String(v)) : String(v)]);
  if (la.note) rows.push([t('note'), la.note]);
  box.innerHTML = `<div class="panel warn" id="lostact" role="alert"><h3>${esc(t('act_' + la.action))}</h3><p>${esc(t('case_conflict_lost').replace('{st}', t('st_' + c.status)))}</p>${rows.length ? `<dl class="kv">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd style="white-space:pre-wrap;user-select:text">${esc(v)}</dd>`).join('')}</dl>` : ''}<div class="actions"><button type="button" class="btn secondary" id="lostok">${esc(t('case_conflict_dismiss'))}</button></div></div>`;
  $('#lostok').onclick = () => { S.lostAct = null; S.openAct = null; actDraft(c.id).clear(); box.innerHTML = ''; };
}

function actionForm(action, c, cmd, preset = {}, d = null, { restore = false } = {}) {
  const box = $('#actform');
  S.openAct = { caseId: c.id, action, preset };
  const f = [];
  const needsNote = ['change_priority', 'set_safety_lock', 'lift_safety_lock', 'approve_repair', 'reassign_workshop', 'correct_vehicle', 'reject', 'withdraw_order', 'wait_parts', 'parts_partial', 'resolve_open_item', 'resolve_released_item', 'request_quality_check', 'return_for_rework', 'technical_release', 'approve_costs', 'quality_release', 'reopen'];
  const qrel = action === 'quality_release';
  const isQc = action === 'request_quality_check' || qrel; const isRel = action === 'technical_release' || qrel;


  const vSite = (action === 'approve_repair' || action === 'reassign_workshop') && d && d.vehicle ? d.vehicle.site || '' : ''; const vWs = vSite ? wsForSite(vSite) : '';


  const wsCand = c.workshop_site || c.suggested_workshop_site || '';
  const wsCandClosed = action === 'approve_repair' && wsCand && !S.meta.workshops.some((w) => w.code === wsCand);
  const wsSel = (wsCandClosed ? '' : wsCand) || vWs;
  const wsClosedHint = wsCandClosed ? `<p class="small alert" data-apwsclosed>${esc(t('apr_ws_closed_hint').replace('{ws}', () => wsLabel({ ...(wsAll().find((w) => w.code === wsCand) || { name: wsCand }), active: true })))}</p>` : '';
  const wsOpts = `${wsSel ? '' : '<option value="" selected>–</option>'}${S.meta.workshops.map((w) => `<option value="${esc(w.code)}"${wsSel === w.code ? ' selected' : ''}>${esc(wsLabel(w))}</option>`).join('')}`;
  const wsSiteHint = vWs && wsSel && wsSel !== vWs ? `<p class="small alert" data-apwshint>${esc(t('apr_ws_site_hint').replace('{site}', () => vSite).replace('{ws}', () => wsLabel(S.meta.workshops.find((w) => w.code === vWs) || { code: vWs })))}</p>` : '';
  const prioOpts = (sel) => ['niedrig', 'mittel', 'kritisch'].map((p) => `<option value="${p}"${p === sel ? ' selected' : ''}>${esc(t('prio_' + p))}</option>`).join('');
  switch (action) {

    case 'resolve_released_item': {
      const o = (((d && d.vehicle_info) || {}).released_items || []).find((x) => x.id === preset.open_item_id);
      if (o) f.push(`<p class="small" data-rrihint><b${langAttr(o.description)}>${esc(clipTxt(o.description, 200))}</b><br><span class="muted">${esc(t('rri_hint').replace('{v}', () => o.case_no))}</span></p>`);
      break;
    }
    case 'change_priority': f.push(`<label>${esc(t('new_priority'))}</label><select name="priority">${prioOpts(c.priority)}</select>`); break;
    case 'approve_repair': f.push(`<label>${esc(t('workshop'))}</label><select name="workshop_site" required>${wsOpts}</select>${wsClosedHint}${wsSiteHint}<label>${esc(t('urgency'))}</label><select name="priority">${prioOpts(c.priority)}</select><label>${esc(t('planned'))}</label><input type="date" name="planned_date">`); break;

    case 'reassign_workshop': f.push(`<label>${esc(t('workshop'))}</label><select name="workshop_site" required><option value="">${esc(t('rws_choose'))}</option>${S.meta.workshops.filter((w) => w.code !== c.workshop_site).map((w) => `<option value="${esc(w.code)}">${esc(wsLabel(w))}</option>`).join('')}</select>${wsSiteHint}${rwsDrop(c)}`); break;

    case 'correct_vehicle': f.push(`<p class="small muted" id="cvhint">${esc(t(c.origin === 'kontrolle' && c.check_item ? 'cv_hint_insp' : 'cv_hint'))}${c.safety_lock ? ' ' + esc(t('cv_hint_lock')) : ''}</p><label for="cvveh">${esc(t('cv_new_vehicle'))}</label><select id="cvveh" name="vehicle_id" required><option value="">${esc(t('loading'))}</option></select>`); break;
    case 'reject': {

      const vi = (d && d.vehicle_info) || {}; const oc = vi.other_open_cases || []; const more = Math.max(0, (vi.other_open_total || 0) - oc.length);
      if (oc.length) f.push(`<label for="dupsel">${esc(t('dup_select'))}<span class="hint">${esc(t('dup_hint'))}</span></label><select id="dupsel" name="duplicate_of"><option value="">${esc(t('dup_none'))}</option>${oc.map((o) => `<option value="${esc(o.id)}">${esc(o.case_no)} · ${esc(t('st_' + o.status))}</option>`).join('')}</select>${more ? `<p class="small muted" id="dupmore">${esc(tn('dup_loading', more))}</p>` : ''}`);

      f.push(`<p class="small muted" data-dupcoupled>${esc(t('dup_coupled_hint').replace('{a}', t('act_correct_vehicle')))}</p>`);
      break;
    }

    case 'reopen': f.push(`<p class="small muted" id="reohint">${esc(t('reopen_hint'))}${c.duplicate_of ? ' ' + esc(t('reopen_dup_hint')) : ''}</p>`); break;
    case 'approve_costs': f.push(`<p class="small muted">${esc(t('cost_approve_hint'))}</p>${extDocList(d)}`); break;
    case 'acknowledge': f.push(`<label>${esc(t('planned'))}</label><input type="date" name="planned_date">`); break;
    case 'wait_parts': f.push(`<label>${esc(t('parts_eta'))}<span class="hint">${esc(t('parts_eta_hint'))}</span></label><input type="date" name="parts_expected_date" min="${bDate()}" max="${bYearAhead()}">`); break;
    case 'parts_partial': { const cur = c.parts_expected_date || ''; const mn = cur && cur < bDate() ? cur : bDate();
      f.push(`<p class="small muted" id="pphint">${esc(t('pp_hint'))}</p>${c.parts_drive_at && !c.safety_lock ? `<p class="panel small" id="etapdr">🚚 ${esc(t('eta_pdr_hint'))}</p>` : ''}<label for="ppeta">${esc(t('pp_eta'))}<span class="hint">${esc(t('pp_eta_hint'))}</span></label><input type="date" id="ppeta" name="parts_expected_date" min="${esc(mn)}" max="${bYearAhead()}" value="${esc(cur)}">${dlvFileSelect(d)}`); break; }


    case 'resume_repair': f.push(`${c.parts_drive_at ? `<p class="panel warn small" id="rrpdr">🚚 ${esc(t('rr_pdr'))}</p>` : ''}${dlvFileSelect(d)}${c.work_state_note ? `<p class="small" id="rrws"><b>${esc(t('wst_title'))}:</b> <span style="white-space:pre-wrap"${langAttr(c.work_state_note)}>${esc(clipTxt(c.work_state_note, 200))}</span></p><label class="check"><input type="checkbox" name="clear_work_state" id="rrwsclr"> ${esc(t('rr_ws_clear'))}</label>` : ''}`); break;

    case 'set_parts_eta': f.push(`${c.parts_drive_at && !c.safety_lock ? `<p class="panel small" id="etapdr">🚚 ${esc(t('eta_pdr_hint'))}</p>` : ''}<label>${esc(t('parts_eta'))}<span class="hint">${esc(t('parts_eta_hint'))} (${esc(t('planned_clear_hint'))})</span></label><input type="date" name="parts_expected_date" min="${bDate()}" max="${bYearAhead()}" value="${esc(c.parts_expected_date || '')}">`); break;
    case 'set_followup': f.push(`<p class="small muted">${esc(t('followup_hint'))}</p><label>${esc(t('followup'))}<span class="hint">${esc(t('planned_clear_hint'))}</span></label><input type="date" name="followup_on" min="${c.followup_on && c.followup_on < bDate() ? esc(c.followup_on) : bDate()}" value="${esc(c.followup_on || '')}">`); break;
    case 'set_vehicle_location': f.push(`<p class="small muted" id="vlhint">${esc(t('vl_hint'))}</p><label>${esc(t('vl_title'))}<span class="hint">${esc(t('vl_location_hint'))}</span></label><input name="vehicle_location" maxlength="300" autocomplete="off" value="${esc(c.vehicle_location || '')}"${c.location_note && !c.vehicle_location ? ` placeholder="${esc(clipTxt(c.location_note, 80))}"` : ''}>${c.location_note ? `<p class="small muted" data-vlreported>${esc(t('location_shown'))}: ${esc(c.location_note)}</p>` : ''}<label>${esc(t('vl_service'))}</label><input name="tow_service" maxlength="120" autocomplete="off" value="${esc(c.tow_service || '')}"><label>${esc(t('vl_on'))}</label><input type="date" name="towed_on" max="${bDate()}" value="${esc(c.towed_on || '')}"><p class="small muted">${esc(t('vl_clear_hint'))}</p>`); break;
    case 'set_handover': f.push(`<p class="small muted" id="hohint">${esc(t('ho_hint'))}</p><label for="ho_keys">${esc(t('ho_keys'))}</label><select id="ho_keys" name="keys">${['', 'da', 'fehlt'].map((v) => `<option value="${v}"${(c.handover_keys || '') === v ? ' selected' : ''}>${esc(t(v ? 'ho_' + v : 'ho_none'))}</option>`).join('')}</select><label for="ho_papers">${esc(t('ho_papers'))}</label><select id="ho_papers" name="papers">${['', 'da', 'fehlt'].map((v) => `<option value="${v}"${(c.handover_papers || '') === v ? ' selected' : ''}>${esc(t(v ? 'ho_' + v : 'ho_none'))}</option>`).join('')}</select>`); break;
    case 'set_occurred_at': f.push(`<p class="small muted">${esc(t('occ_set_hint'))}</p>${occurredFields(c.occurred_at, true)}`); break;
    case 'set_parts_drive': f.push(`<input type="hidden" name="on" value="${c.parts_drive_at ? '0' : '1'}"><p class="small muted" id="pdrhint">${esc(t(c.parts_drive_at ? 'pdr_off_hint' : 'pdr_on_hint'))}</p>${!c.parts_drive_at && d && Array.isArray(d.open_items) && d.open_items.some((o) => o.status === 'offen' && o.safety_relevant) ? `<p class="panel warn small" id="pdrsafety">${esc(t('err_safety_items_open'))}</p>` : ''}`); break;
    case 'set_work_state': f.push(`<p class="small muted" id="wsthint">${esc(t('wst_hint'))}</p>`); break;
    case 'set_ready_date': { const mn = c.status === 'werkstatt_freigegeben' && c.planned_date && c.planned_date > bDate() ? c.planned_date : bDate(); const cur = c.ready_expected_on || '';
      f.push(`<p class="small muted" id="rdyhint">${esc(t('rdy_hint'))}</p><label for="rdyd">${esc(t('rdy_title'))}<span class="hint">${esc(t('planned_clear_hint'))}</span></label><input type="date" id="rdyd" name="ready_expected_on" min="${esc(cur && cur < mn ? cur : mn)}" value="${esc(cur)}">`); break; }
    case 'set_planned_date': f.push(`<label>${esc(t('planned'))}<span class="hint">${esc(t('planned_clear_hint'))}</span></label><input type="date" name="planned_date" value="${esc(c.planned_date || '')}"><label for="plnote">${esc(t('plan_note_lbl'))}<span class="hint">${esc(t('plan_note_hint'))}</span></label><input id="plnote" name="planned_note" maxlength="200" autocomplete="off" value="${esc(c.planned_note || '')}">`); break;
    case 'record_work': f.push(`<label for="whours">${esc(t('hours'))}</label><input id="whours" name="hours" inputmode="decimal" required placeholder="${esc(t('wh_ph'))}" aria-describedby="whconv"><p class="small muted" id="whconv" data-whconv aria-live="polite" hidden></p><label>${esc(t('activity'))}</label><input name="description" required list="worksugg" autocomplete="off"><datalist id="worksugg"></datalist><p class="small" id="whdesc" data-whdesc aria-live="polite" style="margin-top:6px" hidden></p><label>${esc(t('date'))}</label><input type="date" name="work_date" value="${bDate()}" max="${bDate()}" min="${workDateMin(c.created_at)}"><p class="small" id="wdprev" data-wdprev hidden></p><p class="small muted" id="workday" data-workday aria-live="polite"></p><details id="wdweek" class="small"><summary>${esc(t('wd_week'))}</summary><div id="wdweekb"></div></details>`); break;
    case 'add_part': f.push(`<div id="stocksel"></div><div id="freepart">`); f.push(`<label>${esc(t('part_name'))}</label><input name="name" required list="partsugg" autocomplete="off"><datalist id="partsugg"></datalist><p class="small" id="pqname" data-pqname aria-live="polite" style="margin-top:6px" hidden></p><label>${esc(t('part_number'))}</label><input name="part_number"><label for="pqty">${esc(t('qty'))}</label><input id="pqty" name="quantity" inputmode="decimal" value="1" aria-describedby="pqconv"><p class="small muted" id="pqconv" data-pqconv aria-live="polite" hidden></p><label>${esc(t('price_net'))}</label><input name="unit_price_net" inputmode="decimal"><label class="check"><input type="checkbox" name="estimate"> ${esc(t('estimate'))}</label><label>${esc(t('supplier'))}<span class="hint" data-psuphint>${esc(t('part_supplier_hint'))}</span></label><input name="supplier" maxlength="120"></div><label>${esc(t('warranty_until'))}<span class="hint">${esc(t('warranty_hint'))}</span></label><input type="date" name="warranty_until" style="max-width:220px">${partFileSelect(d)}`); break;
    case 'add_open_item': f.push(`<label>${esc(t('open_items'))}</label><input name="description" required><label class="check"><input type="checkbox" name="safety_relevant"> ${esc(t('safety_relevant'))}</label>${oiFileSelect(d)}`); break;
    case 'add_external_cost': f.push(`<label>${esc(t('supplier'))}</label><input name="supplier" required><p class="panel small" id="xsprev" role="note" hidden></p><label>${esc(t('invoice_no'))}</label><input name="invoice_no"><label>${esc(t('amount_net'))}<span class="hint">${esc(t('ext_amount_hint'))}</span></label><input name="amount_net" inputmode="decimal"><label class="check"><input type="checkbox" name="estimate"> ${esc(t('estimate'))}</label><label class="check"><input type="checkbox" name="covers_work_and_parts"> ${esc(t('covers_all'))}</label><label>${esc(t('warranty_until'))}<span class="hint">${esc(t('warranty_hint'))}</span></label><input type="date" name="warranty_until" style="max-width:220px"><div id="extkm"><label for="extkmv">${esc(t('ext_km_label'))}<span class="hint">${esc(t('ext_km_hint'))}</span></label><input id="extkmv" name="odometer_km" inputmode="numeric" pattern=" *[0-9][0-9 .]*" maxlength="40" style="max-width:220px"><div id="extkmd" aria-live="polite"></div><label for="extkmo">${esc(t('ext_km_on'))}</label><input type="date" id="extkmo" name="odometer_on" max="${bDate()}" style="max-width:220px"></div>${extFileSelect(d)}`); break;
  }


  if (qrel) f.push(`<p class="panel small" id="qrelhint">${esc(t('qrel_hint').replace('{a}', t('act_request_quality_check')).replace('{b}', t('act_technical_release')))}</p>`);
  if ((isQc || isRel) && d && TACHO_WORK.test([c.description, ...(d.parts || []).map((x) => x.name), ...(d.work || []).map((x) => x.description), ...(d.external_costs || []).map((x) => `${x.supplier || ''} ${x.note || ''}`)].join(' | '))) f.push(`<p class="panel small" data-tachowork>${esc(t('tacho_work_hint'))}</p>`);

  if (isQc && d && d.tire_winter && !['erfuellt', 'nicht_pflichtig'].includes(d.tire_winter.status)) f.push(`<p class="panel small" id="wqopen">${esc(t('wq_open_hint'))}</p><label class="check"><input type="checkbox" name="confirm_winter_open" required> ${esc(t('wq_open_confirm'))}</label>`);



  if (isQc && d && Array.isArray(d.qc_missing)) {
    const qm = d.qc_missing;
    if (qm.includes('work')) f.push(`<p class="panel warn small" id="qcmwork" role="note">${esc(S.me.role === 'workshop' ? t('qc_miss_work_ws').replace('{a}', () => t('act_record_work')) : t('err_work_missing'))}</p>`);
    if (qm.includes('inspection')) f.push(`<p class="panel warn small" id="qcminsp" role="note">${esc(t('err_inspection_missing'))}</p>`);
    if (qm.includes('inspection_after_rework')) f.push(`<p class="panel warn small" id="rwinsp">${esc(t('err_inspection_after_rework_missing'))}</p>`);
    if (qm.includes('safety_items') && !isRel) f.push(`<p class="panel warn small" id="qcmsafety" role="note">${esc(t('err_safety_items_open'))} ${esc(t('qc_miss_safety'))}</p>`);
  } else if (isQc && d && Array.isArray(d.inspections) && Array.isArray(d.events)) {
    const li = d.inspections.filter((i) => i.kind === 'nach_reparatur').map((i) => i.created_at).sort().pop();
    const rw = d.events.filter((e) => e.action === 'return_for_rework').map((e) => e.created_at).sort().pop();
    if (li && rw && li <= rw) f.push(`<p class="panel warn small" id="rwinsp">${esc(t('err_inspection_after_rework_missing'))}</p>`);
  }

  if ((isQc || isRel) && hoMissing(c).length) f.push(`<p class="panel warn small" id="relho">${esc(t('ho_release_warn').replace('{x}', hoMissing(c).join(', ')))}</p>`);


  { const ow = (isQc || isRel) && d && d.vehicle_info && Array.isArray(d.vehicle_info.other_open_cases) ? d.vehicle_info.other_open_cases.filter((o) => ['werkstatt_freigegeben', 'in_reparatur', 'wartet_teile', 'abschlusskontrolle'].includes(o.status)) : [];
    if (ow.length) f.push(`<p class="panel warn small" id="relother" role="note"><b>${esc(t('rel_other_ws'))}</b> ${ow.map((o) => `<span style="white-space:nowrap"><a href="#/cases/${esc(o.id)}" translate="no">${esc(o.case_no)}</a> · ${esc(t('st_' + o.status))}</span>`).join(', ')}<br>${esc(t('rel_other_ws_hint'))}</p>`);


    const cw = (isQc || isRel) && d && d.vehicle_info && Array.isArray(d.vehicle_info.coupled) ? d.vehicle_info.coupled.flatMap((g) => (g.open_cases || []).filter((o) => ['werkstatt_freigegeben', 'in_reparatur', 'wartet_teile', 'abschlusskontrolle'].includes(o.status)).map((o) => ({ ...o, plate: g.plate, kind: g.kind }))) : [];
    if (cw.length) f.push(`<p class="panel warn small" id="relcoupled" role="note"><b>${esc(t('rel_cpl_ws'))}</b> ${cw.map((o) => `<span>🔗 ${esc(t('vk_' + o.kind))} ${esc(o.plate)}: <a href="#/cases/${esc(o.id)}" translate="no">${esc(o.case_no)}</a> · ${esc(t('st_' + o.status))}</span>`).join(', ')}<br>${esc(t('rel_cpl_ws_hint'))}</p>`); }
  if (isQc || isRel) {

    const puPre = !c.pickup_note && qrel && c.vehicle_location ? c.vehicle_location.slice(0, 300) : '';
    f.push(`<label for="pu_note">${esc(t('pu_title'))}<span class="hint">${esc(t('pu_hint'))}</span></label><textarea id="pu_note" name="pickup_note" maxlength="300" rows="2">${esc(c.pickup_note || puPre)}</textarea>${puPre ? `<p class="small muted" id="qrelpu">${esc(t('qrel_pu_prefill'))}</p>` : ''}`);

    const puOld = isRel && d && d.vehicle_info && Array.isArray(d.vehicle_info.notes) ? d.vehicle_info.notes.filter((n) => n.pickup) : [];
    if (puOld.length) f.push(`<p class="panel small" id="pu_repl">${esc(t('pu_replaced_hint').replace('{d}', puOld.map((n) => fmtD(n.created_at)).join(', ')))}</p>`);
    if (isRel) f.push(`<label class="check"><input type="checkbox" name="pickup_for_driver" id="pu_drv"> ${esc(t('pu_for_driver'))}</label><div id="pu_until_box" hidden><label for="pu_until">${esc(t('pu_valid_until'))}<span class="hint">${esc(t('pu_valid_until_hint'))}</span></label><input type="date" id="pu_until" name="pickup_valid_until" min="${esc(bDate())}"></div>`);
  }
  if (isRel && c.cost_over_limit_at) f.push(`<p class="panel warn small" id="relcost">${esc(t('err_cost_approval_open'))}</p>`);


  if (isRel) { const rc = relCostOpen(d); if (rc) f.push(`<p class="panel warn small" id="relcostopen" role="note">${esc(rc)}</p>`); }

  if (action === 'reject' && c.safety_lock) f.push(`<p class="panel warn small" id="rejlock">${esc(t('err_safety_lock_active'))}</p>`);
  if (action === 'withdraw_order') {
    f.push(`<p class="small muted" id="wdhint">${esc(t('withdraw_hint'))}</p>`);
    if (c.safety_lock) f.push(`<p class="panel warn small" id="wdlock">${esc(t('err_withdraw_locked'))}</p>`);
    const oi = d && Array.isArray(d.open_items) ? d.open_items.filter((o) => o.status === 'offen') : [];
    if (oi.some((o) => o.safety_relevant)) f.push(`<p class="panel warn small" id="wdsafety">${esc(t('err_safety_items_open'))}</p>`);
    else if (oi.length) f.push(`<p class="small" id="wdleft">${esc(t('withdraw_left').replace('{n}', oi.length))}</p>`);
  }
  if ((isRel || action === 'lift_safety_lock') && d && Array.isArray(d.open_items) && d.open_items.some((o) => o.status === 'offen' && o.safety_relevant)) f.push(`<p class="panel warn small" id="relsafety">${esc(t('err_safety_items_open'))}</p>`);
  if (isRel || action === 'lift_safety_lock') f.push(`<label class="check"><input type="checkbox" name="confirm" required> ${esc(t('confirm'))}</label>`);
  const noteLabel = action === 'set_work_state' ? t('wst_title') : action === 'parts_partial' ? t('pp_note') : action === 'approve_repair' ? t('scope') : isRel ? t('evidence') : needsNote.includes(action) ? t('reason') : t('note');
  f.push(`<label>${esc(noteLabel)}${action === 'set_parts_eta' ? `<span class="hint">${esc(t('parts_eta_note_hint'))}</span>` : action === 'parts_partial' ? `<span class="hint">${esc(t('pp_note_hint'))}</span>` : ''}</label><textarea name="note"${needsNote.includes(action) ? ' required minlength="3"' : ''}${['set_followup', 'set_handover'].includes(action) ? ' maxlength="300"' : action === 'set_work_state' ? ' maxlength="500" rows="4" placeholder="' + esc(t('wst_ph')) + '"' : ''}>${action === 'set_followup' ? esc(c.followup_note || '') : action === 'set_work_state' ? esc(c.work_state_note || '') : ''}</textarea>${action === 'set_work_state' ? `<p class="small muted" id="wstclear">${esc(t('wst_clear_hint'))}</p>` : ''}`);
  if (action === 'add_part') api('GET', '/api/part-suggestions').then((r) => {
    const dl = $('#partsugg'); if (!dl) return;
    dl.innerHTML = r.suggestions.map((x) => `<option value="${esc(x.name)}">${esc(x.part_number || '')}</option>`).join('');
    const nm = $('#af input[name=name]'); const pn = $('#af input[name=part_number]');
    if (nm && pn) nm.addEventListener('change', () => { const hit = r.suggestions.find((x) => x.name === nm.value); if (hit && hit.part_number && !pn.value) pn.value = hit.part_number; });
  }).catch(() => {});
  if (action === 'record_work') api('GET', '/api/work-suggestions').then((r) => { const dl = $('#worksugg'); if (dl) dl.innerHTML = r.suggestions.map((x) => `<option value="${esc(x)}">`).join(''); }).catch(() => {});




  const bkVin = d && d.vehicle && d.vehicle.vin; const bkKm = action === 'add_external_cost' && d && d.vehicle_info && d.vehicle_info.last_km;
  const bkDoc = ['add_part', 'add_external_cost'].includes(action) ? `${bkVin ? `<br><span id="bkvin">${esc(t('vin'))}: <span translate="no">${esc(bkVin)}</span></span>` : ''}${bkKm ? `<br><span class="muted" id="bkkm">${esc(t('irv_last_km').replace('{km}', fmtNum(bkKm.km)).replace('{d}', fmtD(bkKm.measured_at)))}</span>` : ''}${action === 'add_external_cost' ? `<br><span class="muted" id="bkdoc">${esc(t('bk_doc'))}</span>` : ''}` : '';
  const bkFor = ['record_work', 'add_part', 'add_external_cost'].includes(action) ? `<p class="panel small" id="afcase"><b>${esc(t('bk_for'))}: ${esc(c.case_no || '')} · ${esc((d && d.vehicle && d.vehicle.plate) || c.plate || '')}</b>${c.description ? `<br><span class="muted">${ltxt(clipTxt(c.description, 80))}</span>` : ''}${bkDoc}<br><span class="muted">${esc(t('bk_check'))}</span></p>` : '';


  const apwF = ['start_repair', 'record_work', 'add_part', 'add_external_cost', 'approve_repair'].includes(action) && c.appraisal_wait_on ? `<p class="panel warn small" data-apwform>🔍 <b>${esc(t('apw_title'))} ${fmtD(c.appraisal_wait_on)}</b> – ${esc(t(action === 'approve_repair' ? 'apw_appr_mgr' : 'apw_hint_ws'))}</p>` : '';
  box.innerHTML = `<form class="panel" id="af"><h3>${esc(t('act_' + action))}</h3>${apwF}${bkFor}${f.join('')}<div class="actions"><button class="btn">${esc(t('save'))}</button><button type="button" class="btn secondary" id="ac">${esc(t('cancel'))}</button></div></form>`;
  if (!restore) box.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (!restore) { const h3 = box.querySelector('#af h3'); if (h3) { h3.tabIndex = -1; h3.focus({ preventScroll: true }); } }
  $('#ac').onclick = () => { box.innerHTML = ''; S.openAct = null; actDraft(c.id).clear(); const ab = document.querySelector(`button[data-act="${action}"]`); if (ab) ab.focus(); };


  if ($('#pu_drv')) $('#pu_drv').onchange = () => { $('#pu_until_box').hidden = !$('#pu_drv').checked; };
  if (action === 'set_followup') { const fi = $('#af input[name=followup_on]'); if (fi) fi.onchange = () => { fi.min = fi.value === (c.followup_on || '') ? fi.min : bDate(); }; }
  if (action === 'reject' && $('#dupmore')) loadDupOptions(c);
  if (action === 'correct_vehicle') api('GET', '/api/vehicles').then((r) => {
    const sel = $('#cvveh'); if (!sel) return;
    const vs = (r.vehicles || []).filter((v) => v.active !== 0 && v.id !== c.vehicle_id).sort((x, y) => plateCmp(x.plate, y.plate));
    sel.innerHTML = `<option value="">${esc(t('cv_choose'))}</option>` + vs.map((v) => `<option value="${esc(v.id)}">${esc(v.plate)}${v.kind === 'anhaenger' ? ' · ' + esc(t('trailer')) : ''}${v.site ? ' · ' + esc(v.site) : ''}</option>`).join('');
  }).catch(() => {});

  const afUpd = (e) => { if (!e.isTrusted) return; const x = actDraft(c.id).load(); if (x && x.action === action) actDraftSave(c.id, action); };
  $('#af').addEventListener('input', afUpd); $('#af').addEventListener('change', afUpd);
  const stockP = action === 'add_part' ? loadStockSelect(c) : null;
  { const xs = $('#af input[name=supplier]'), xp = $('#xsprev'); if (xs && xp) { const upd = () => { const m = extPrevSame(d && d.vehicle_info, xs.value); xp.hidden = !m.length; xp.innerHTML = m.length ? `${esc(t('ext_prev_same').replace('{s}', xs.value.trim()))} ${m.map((o) => `<a href="#/cases/${esc(o.id)}" translate="no">${esc(o.case_no)}</a> (${fmtD(o.closed_at)})`).join(', ')}` : ''; }; xs.addEventListener('input', upd); xs.addEventListener('change', upd); upd(); } }

  if (action === 'add_external_cost') { const ki = $('#extkmv'), ko = $('#extkmo'), kb = $('#extkmd'), lk = d && d.vehicle_info && d.vehicle_info.last_km; if (ki && kb && lk) { const upd = () => {
    const v = ki.value; const k = /^ *[0-9][0-9 .]*$/.test(v) ? Number(v.replace(/[ .]/g, '')) : null; const past = ko && ko.value && ko.value < bDate();
    kb.innerHTML = k === null || !Number.isFinite(k) || past ? '' : k < lk.km ? `<p class="panel warn small" role="alert" id="extkmlow" style="margin:4px 0 0">⚠️ ${esc(t('ext_km_lower').replace('{prev}', fmtNum(lk.km)))}</p>` : `<p class="small muted" id="extkmdiff" style="margin:4px 0 0">${esc(t('irv_km_diff').replace('{n}', fmtNum(k - lk.km)))}</p>${kmDigitsWarn(k, lk.km, 'id="extkmdigits"')}`;
  }; ki.addEventListener('input', upd); if (ko) ko.addEventListener('change', upd); } }
  if ($('#dupsel')) $('#dupsel').onchange = () => { const ta = $('#af textarea[name=note]'); const o = $('#dupsel').selectedOptions[0]; if (ta && !ta.value && $('#dupsel').value) ta.value = `${t('dup_of')} ${o.textContent.split(' · ')[0]}`; };
  offDayWatch($$('#af input[name=planned_date]'));

  offDayWatch($$('#af input[name=ready_expected_on], #af input[name=parts_expected_date]'), 'date_offday_hint');
  if (action === 'record_work') { workDayWatch(c); hoursWatch(); }
  if (action === 'add_part') partQtyWatch();
  $('#af').onsubmit = (e) => {
    e.preventDefault();
    if (e.target._scanChk && e.target._scanChk()) return;
    const fd = new FormData(e.target);
    const p = { ...preset };
    for (const [k, v] of fd.entries()) if (k !== 'note' && v !== '') p[k] = v;
    for (const k of ['confirm', 'confirm_winter_open', 'confirm_duplicate_invoice', 'safety_relevant', 'covers_work_and_parts', 'pickup_for_driver', 'clear_work_state']) if (k in p) p[k] = true;
    if (!p.pickup_for_driver) delete p.pickup_valid_until;
    if (p.estimate) { p.valuation = 'estimate'; delete p.estimate; }

    if (action === 'set_planned_date') p.planned_note = p.planned_date ? String(fd.get('planned_note') || '').trim() : '';
    if (action === 'set_ready_date') p.ready_expected_on = String(fd.get('ready_expected_on') || '');
    if (action === 'set_occurred_at') {
      const occ = occurredValue(fd.get('occ_date') || '', fd.get('occ_time') || ''); delete p.occ_date; delete p.occ_time;
      if (occ === undefined) { toast(t('occ_need_date'), true); markInvalid($('#occd'), t('occ_need_date')); return; }
      p.occurred_at = occ;
    }

    for (const k of ['hours', 'quantity', 'unit_price_net', 'amount_net']) if (k in p) p[k] = String(p[k]).trim();
    if (p.stock_item_id) { delete p.name; delete p.part_number; delete p.supplier; if (!fd.get('unit_price_net')) delete p.unit_price_net; } else delete p.stock_item_id;

    if (action === 'record_work' && p.work_date && p.work_date < bDate().slice(0, 7) + '-01' && !confirm(t('work_past_month_confirm').replace('{m}', fmtMonth(p.work_date.slice(0, 7))))) return;
    if (qrel) {


      const note = fd.get('note') || null;
      const q = {}; if (p.pickup_note) q.pickup_note = p.pickup_note; if (p.confirm_winter_open) q.confirm_winter_open = true;
      const rel = { confirm: true }; if (p.pickup_for_driver) { rel.pickup_for_driver = true; if (p.pickup_valid_until) rel.pickup_valid_until = p.pickup_valid_until; }
      return cmd('request_quality_check', note, q, { formAction: action, next: async () => {
        try {
          const cur = await api('GET', '/api/cases/' + c.id);
          if (cur.case.status === 'abschlusskontrolle') { await api('POST', `/api/cases/${c.id}/commands`, { action: 'technical_release', command_id: uid(), expected_version: cur.case.version, note, payload: rel }, { timeoutMs: SEND_TIMEOUT_MS }); toast('✓'); }
        } catch (err) { toast(t('qrel_step2_failed').replace('{msg}', err.message).replace('{b}', t('act_technical_release')), true); }
        await viewCase(c.id);
      } });
    }
    return cmd(action, fd.get('note') || null, p);
  };
  return stockP;
}





const hoursOf = (raw) => {
  const s = String(raw || '').trim().replace(/[\s\u00a0]+/g, ' '); if (!s || s.length > 60) return null;
  const p = parseHours(s); if (p && p.minutesOver) return null; if (typeof p === 'number') return Math.round(p * 60);
  const d = s.replace(new RegExp(`(\\d)\\s*${H_U}\\.?$`, 'i'), '$1');
  return /^\d{1,2}([.,]\d+)?$/.test(d) ? Math.round(Number(d.replace(',', '.')) * 60) : null;
};
const hoursText = (min) => { const h = Math.floor(min / 60); const m = min % 60; return !h ? t('wh_m').replace('{m}', m) : !m ? t('wh_h').replace('{h}', h) : t('wh_hm').replace('{h}', h).replace('{m}', m); };
function hoursWatch() {
  const inp = $('#whours'); const out = $('#whconv'); if (!inp || !out) return;
  const show = () => { const min = hoursOf(inp.value); const ok = min !== null && min > 0 && min <= 1440; out.textContent = ok ? hoursText(min) : ''; out.hidden = !ok; };
  inp.addEventListener('input', show); show();



  const desc = $('#af input[name=description]'); const box = $('#whdesc'); if (!desc || !box) return;
  const offer = () => {
    const d = inp.value.trim() ? null : durationIn(desc.value);
    if (!d) { box.hidden = true; box.textContent = ''; return; }
    box.innerHTML = `<button type="button" class="btn secondary small" data-whtake>⏱ ${esc(t('wh_take').replace('{d}', d.part).replace('{h}', hoursText(Math.round(d.hours * 60)).replace(/^=\s*/, '')))}</button>`;
    box.hidden = false;
    box.querySelector('[data-whtake]').onclick = () => {
      inp.value = d.part; desc.value = d.rest; box.hidden = true; box.textContent = '';
      inp.dispatchEvent(new Event('input', { bubbles: true })); desc.dispatchEvent(new Event('input', { bubbles: true }));
      desc.focus();
    };
  };
  desc.addEventListener('input', offer); inp.addEventListener('input', offer); offer();
}





const qtyLabel = (n, unit) => `= ${fmtNum(n)}${unit ? ' ' + unitL(unitCanon(unit) || unit) : ''}`;
function partQtyWatch() {
  const inp = $('#pqty'); const out = $('#pqconv'); if (!inp || !out) return;

  const show = () => {
    const v = inp.value.trim(); const w = parseQty(v); const m = w ? null : v.match(/^(\d{1,6}(?:[.,]\d{1,3})?)\s*([^\s\d]{1,12}?)\.?$/);
    const txt = w && w.n > 0 && (w.unit === null || unitCanon(w.unit)) ? qtyLabel(w.n, w.unit) : m && unitCanon(m[2]) && !/^[x×]$/i.test(m[2]) ? `= ${m[1]} ${unitL(unitCanon(m[2]))}` : '';
    out.textContent = txt; out.hidden = !txt;
  };
  inp.addEventListener('input', show); show();
  const nm = $('#af input[name=name]'); const box = $('#pqname'); if (!nm || !box) return;
  const offer = () => {
    const q = nm.disabled || !['', '1'].includes(inp.value.trim()) ? null : qtyIn(nm.value);
    if (!q || !(q.n > 0) || (q.n === 1 && !q.unit)) { box.hidden = true; box.textContent = ''; return; }
    box.innerHTML = `<button type="button" class="btn secondary small" data-pqtake>🔢 ${esc(t('pq_take').replace('{d}', q.part).replace('{q}', qtyLabel(q.n, q.unit).replace(/^=\s*/, '')))}</button>`;
    box.hidden = false;
    box.querySelector('[data-pqtake]').onclick = () => {
      inp.value = q.part; nm.value = q.rest; box.hidden = true; box.textContent = '';
      inp.dispatchEvent(new Event('input', { bubbles: true })); nm.dispatchEvent(new Event('input', { bubbles: true }));
      nm.focus();
    };
  };
  nm.addEventListener('input', offer); inp.addEventListener('input', offer); offer();
}





const WN_ST = ['in_reparatur', 'wartet_teile', 'werkstatt_freigegeben'];
function workNextPanel(c, wn) {
  const box = $('#actform'); if (!box || box.innerHTML.trim() || !c.workshop_site) return;
  Promise.all([api('GET', '/api/cases?status=open&limit=100'), api('GET', '/api/work-day?date=' + encodeURIComponent(wn.date)).catch(() => null)]).then(([r, wd]) => {
    if (!document.body.contains(box) || box.innerHTML.trim() || S.openAct) return;
    const xs = (r.cases || []).filter((x) => x.id !== c.id && WN_ST.includes(x.status) && x.workshop_site === c.workshop_site)
      .sort((x, y) => WN_ST.indexOf(x.status) - WN_ST.indexOf(y.status) || plateCmp(x.plate || '', y.plate || ''));
    const h = (x) => fmtNum(x, { maximumFractionDigits: 2 });
    const byCase = new Map(((wd && wd.cases) || []).map((x) => [x.case_id, x.hours]));
    const sum = wd ? (wd.hours ? t('wd_sum').replace('{d}', fmtD(wd.date)).replace('{h}', h(wd.hours)) : '') : '';
    if (!xs.length) { if (sum) box.innerHTML = `<div class="panel small noprint" id="worknext" role="status"><p style="margin:0">${esc(sum)}.</p></div>`; return; }
    const shown = xs.slice(0, 8);
    box.innerHTML = `<div class="panel noprint" id="worknext" role="status"><h3 style="margin-top:0">${esc(t('wnx_title'))}</h3>${sum ? `<p class="small" id="wnxsum">${esc(sum)}.</p>` : ''}<p class="small muted">${esc(t('wnx_hint').replace('{a}', () => t('act_record_work')))}</p><ul style="list-style:none;padding:0;margin:0;display:grid;gap:6px">${shown.map((x) => {
      const bk = byCase.get(x.id);
      return `<li><button type="button" class="btn secondary" data-wnext="${esc(x.id)}" style="width:100%;text-align:left;display:block;white-space:normal"><b translate="no">${esc(x.plate || '')}</b> · <span translate="no">${esc(x.case_no || '')}</span> · ${esc(t('st_' + x.status))}${x.description ? `<br><span class="small muted">${ltxt(clipTxt(x.description, 70))}</span>` : ''}<br><span class="small" data-wnxh>${esc(bk ? t('wnx_booked').replace('{d}', fmtD(wn.date)).replace('{h}', h(bk)) : t('wnx_none').replace('{d}', fmtD(wn.date)))}</span></button></li>`;
    }).join('')}</ul>${xs.length > shown.length ? `<p class="small muted"><a href="#/cases">${esc(t('wnx_more').replace('{n}', xs.length - shown.length))}</a></p>` : ''}<div class="actions"><button type="button" class="btn secondary" id="wnxclose">${esc(t('wnx_done'))}</button></div></div>`;
    $$('[data-wnext]', box).forEach((b) => { b.onclick = () => { S.autoAct = { caseId: b.dataset.wnext, action: 'record_work', date: wn.date }; location.hash = '#/cases/' + encodeURIComponent(b.dataset.wnext); }; });
    $('#wnxclose').onclick = () => { box.innerHTML = ''; };
  }).catch(() => {});
}
function workDayWatch(c) {
  const inp = $('#af input[name=work_date]'); const box = $('#workday'); if (!inp || !box) return;
  let seq = 0;
  const load = () => {
    const d = inp.value; const my = ++seq;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { box.textContent = ''; return; }
    api('GET', '/api/work-day?date=' + encodeURIComponent(d)).then((r) => {
      if (my !== seq || !document.body.contains(box)) return;
      const h = (x) => fmtNum(x, { maximumFractionDigits: 2 });
      if (!r.hours) { box.innerHTML = esc(t('wd_none').replace('{d}', fmtD(r.date))); return; }
      const list = r.cases.map((x) => `${x.case_id === c.id ? `<b data-wdthis>${esc(x.case_no)} (${esc(t('wd_this'))})</b>` : esc(x.case_no)}${x.plate ? ' · ' + esc(x.plate) : ''}: <span style="white-space:nowrap">${esc(h(x.hours))} ${esc(t('wd_h'))}</span>`).join('; ');
      const same = r.cases.some((x) => x.case_id === c.id);
      box.innerHTML = `${esc(t('wd_sum').replace('{d}', fmtD(r.date)).replace('{h}', h(r.hours)))}${list ? ' – ' + list : ''}${r.other_environment_hours ? ' · ' + esc(t('wd_other_env').replace('{h}', h(r.other_environment_hours))) : ''}. ${esc(t('wd_left').replace('{h}', h(r.remaining)).replace('{max}', h(r.limit)))}${same ? `<br><b data-wdsame>⚠ ${esc(t('wd_same_case'))}</b>` : ''}`;
    }).catch(() => { if (my === seq) box.textContent = ''; });
  };

  const wk = $('#wdweek'); let wseq = 0;
  const loadWeek = () => {
    const wb = $('#wdweekb'); if (!wk || !wk.open || !wb) return; const d = /^\d{4}-\d{2}-\d{2}$/.test(inp.value) ? inp.value : bDate(); const my = ++wseq;
    api('GET', '/api/work-day?week=1&date=' + encodeURIComponent(d)).then((r) => {
      if (my !== wseq || !document.body.contains(wb)) return;
      const h = (x) => fmtNum(x, { maximumFractionDigits: 2 });
      wb.innerHTML = `<p style="margin:6px 0">${esc(t('wd_week_sum').replace('{a}', fmtD(r.from)).replace('{b}', fmtD(r.to)).replace('{h}', h(r.hours)))}</p><ul data-wdweek style="margin:4px 0;padding-left:18px">${r.days.map((x) => `<li${x.date === d ? ' data-wdday' : ''}>${x.date === d ? '<b>' : ''}${esc(fmtDue(x.date))}${x.date === d ? '</b>' : ''}: ${x.hours ? `<span style="white-space:nowrap">${esc(h(x.hours))} ${esc(t('wd_h'))}</span>${x.cases.length ? ' – ' + x.cases.map((k) => `${esc(k.case_no)}${k.plate ? ' · ' + esc(k.plate) : ''}: ${esc(h(k.hours))} ${esc(t('wd_h'))}`).join('; ') : ''}${x.other_environment_hours ? ' · ' + esc(t('wd_other_env').replace('{h}', h(x.other_environment_hours))) : ''}` : '–'}</li>`).join('')}</ul>`;
    }).catch(() => { if (my === wseq) wb.textContent = ''; });
  };
  if (wk) wk.addEventListener('toggle', loadWeek);



  const pv = $('#wdprev');
  if (pv && S.me && S.me.role === 'workshop') {
    let pd = bDate(-1); for (let i = 0; i < 7 && (isWeekendD(pd) || holName(pd)); i++) pd = bDate(-2 - i);


    let typed = false; if (inp.form) inp.form.addEventListener('input', () => { typed = true; }, { once: true });
    if (pd >= (inp.min || '')) api('GET', '/api/work-day?date=' + encodeURIComponent(pd)).then((r) => {
      if (!document.body.contains(pv) || r.hours || typed) return;
      pv.innerHTML = `${esc(t('wd_prev_none').replace('{d}', fmtDue(pd)))} <button type="button" class="btn secondary" data-wdprevgo style="white-space:nowrap">${esc(t('wd_prev_go').replace('{d}', fmtD(pd)))}</button>`;
      pv.hidden = false;
      const b = pv.querySelector('[data-wdprevgo]');
      const sync = () => { pv.hidden = inp.value === pd; };
      b.onclick = () => { inp.value = pd; inp.dispatchEvent(new Event('change')); };
      inp.addEventListener('change', sync); inp.addEventListener('input', sync); sync();
    }).catch(() => {});
  }
  inp.addEventListener('change', loadWeek);
  inp.addEventListener('change', load); inp.addEventListener('input', load);
  setTimeout(load, 0);
}



function checklistHtml(cpl = false) {
  return S.meta.checklist.map((i) => `<div class="checkitem" data-key="${esc(i.key)}"><span id="cl_${esc(i.key)}">${esc(checkLabel(i.key))}</span>
    <span class="seg" role="radiogroup" aria-labelledby="cl_${esc(i.key)}"><label><input type="radio" name="${esc(i.key)}" value="ok" required>${esc(t('ok'))}</label><label class="bad"><input type="radio" name="${esc(i.key)}" value="mangel">${esc(t('defect'))}</label><label><input type="radio" name="${esc(i.key)}" value="na">${esc(t('na'))}</label></span>
    <div class="detail" hidden><input name="${esc(i.key)}__note" minlength="3" maxlength="1000" placeholder="${esc(t('defect_note'))}"><label class="check"><input type="checkbox" name="${esc(i.key)}__safety"> ${esc(t('safety_relevant'))}</label><p class="small muted" data-safetyhint>${esc(t('check_safety_locks'))}</p>${cpl ? `<div class="cplwrap" hidden><label for="cpl_${esc(i.key)}" class="small" style="white-space:nowrap">${esc(t('cpl_which'))}</label><select id="cpl_${esc(i.key)}" name="${esc(i.key)}__on"><option value="">–</option><option value="coupled">–</option></select></div>` : ''}</div></div>`).join('');
}

function cplUpdate(form, sv) {
  const c = sv && sv.coupled;

  const cid = c ? c.id : '';
  if (form.dataset.cpl !== undefined && form.dataset.cpl !== cid) $$('.cplwrap select', form).forEach((x) => (x.value = ''));
  form.dataset.cpl = cid;
  const nm = (k, p) => `${t(k === 'anhaenger' ? 'trailer' : 'truck')} ${p}`;
  $$('.cplwrap', form).forEach((w) => {
    const sel = $('select', w);
    if (!c) { w.hidden = true; sel.value = ''; return; }
    w.hidden = false; sel.options[0].textContent = nm(sv.kind, sv.plate); sel.options[1].textContent = nm(c.kind, c.plate);
  });
}

const tmKmRej = (dir, km, at) => dir === 'above' ? t('tm_km_rejected_next').replace('{km}', fmtKm(km)).replace('{date}', at ? fmtD(at) : '–') : t('tm_km_rejected').replace('{km}', fmtKm(km));
const kmWarn = (r) => (r.km_rejected && r.km_rejected.next_km !== undefined ? ' · ' + t('km_not_taken_next').replace('{km}', fmtNum(r.km_rejected.km)).replace('{next}', fmtNum(r.km_rejected.next_km)) : r.km_rejected && r.km_rejected.previous_km === undefined ? ' · ' + t('km_not_taken_other').replace('{km}', fmtNum(r.km_rejected.km)) : r.km_rejected ? ' · ' + t('km_not_taken').replace('{km}', fmtNum(r.km_rejected.km)).replace('{prev}', fmtNum(r.km_rejected.previous_km)) : r.km_test_only ? ' · ' + t('km_test_only') : '') + (r.km_equals_truck ? ' · ' + t('km_eq_truck_saved').replace('{p}', r.km_equals_truck.plate) : '');

const cplNote = (r) => (r && r.coupled_defects ? ' · ' + tn('cpl_reported', r.coupled_defects.n).replace('{v}', `${t(r.coupled_defects.kind === 'anhaenger' ? 'trailer' : 'truck')} ${r.coupled_defects.plate}`) : '') + (r && r.coupled_missing ? ' · ' + t('cpl_missing') : '');
function bindChecklist(form) {
  $$('.checkitem', form).forEach((row) => {
    $$('input[type=radio]', row).forEach((r) => (r.onchange = () => { row.classList.remove('missing'); document.querySelectorAll('.toast.err').forEach((x) => x.remove());     const bad = r.value === 'mangel' && r.checked; $('.detail', row).hidden = !bad; $('.detail input', row).required = bad; }));
  });

  let shown = false;
  form.addEventListener('invalid', (e) => {
    const row = e.target.closest('.checkitem');

    if ((row && e.target.name && e.target.name.endsWith('__note')) || e.target.id === 'km') {
      e.preventDefault();
      if (shown) return;
      shown = true; setTimeout(() => (shown = false), 0);
      e.target.scrollIntoView({ block: 'center' }); e.target.focus({ preventScroll: true });

      const im = e.target.id === 'km' ? (e.target.dataset.cfpFx && e.target.validationMessage ? e.target.validationMessage : t('km_invalid')) : t('defect_note_missing');
      toast(im, true);
      markInvalid(e.target, im);
      return;
    }
    if (!row || e.target.type !== 'radio') return;
    e.preventDefault();
    row.classList.add('missing');

    const seg = $('.seg', row);
    if (seg && !seg.hasAttribute('aria-invalid')) { seg.setAttribute('aria-invalid', 'true'); seg.addEventListener('change', () => seg.removeAttribute('aria-invalid'), { once: true }); }
    if (shown) return;
    shown = true; setTimeout(() => (shown = false), 0);
    if (seg) markInvalid(seg, t('check_answer_missing'), row);
    const open = $$('.checkitem', form).filter((r) => !$('input[type=radio]:checked', r)).length;
    row.scrollIntoView({ block: 'center' });
    $('input[type=radio]', row).focus({ preventScroll: true });
    toast(tn('check_missing', open), true);
  }, true);
}




const FORM_DRAFT_MS = 12 * 3600000;



const actDraft = (caseId) => formDraft('act_' + caseId, $('#af'));
function actDraftSave(caseId, action) {
  const af = $('#af'); if (!af || !S.openAct || S.openAct.caseId !== caseId || S.openAct.action !== action) return;
  formDraft('act_' + caseId, af).save({ action, preset: S.openAct.preset || {}, cmd: S.pendCmd || null });
}
function restoreActDraft(c, x) {
  const af = $('#af'); const ad = formDraft('act_' + c.id, af);
  ad.restore(x);

  if (x.cmd && x.cmd.key && Date.now() - x.cmd.at < 10 * 60000) { S.pendCmd = x.cmd; S.cmdOffline = { key: x.cmd.key, at: x.cmd.at }; }
  const box = document.createElement('div'); box.className = 'panel'; box.id = 'adraft'; box.setAttribute('role', 'status'); box.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:center';
  box.innerHTML = `<span class="small" style="flex:1 1 200px">${esc(t('form_draft_restored').replace('{d}', fmtDT(x.at)))} ${esc(t('act_draft_check'))}</span><button type="button" class="btn secondary" id="adx">${esc(t('inventory_draft_discard'))}</button>`;
  af.querySelector('h3').insertAdjacentElement('afterend', box);
  $('#adx').onclick = () => { if (!confirm(t('form_draft_discard_confirm'))) return; ad.clear(); S.openAct = null; S.pendCmd = null; $('#actform').innerHTML = ''; };
  $('#actform').scrollIntoView({ block: 'start' });
}
function formDraft(page, form, skip = []) {

  if (!S.me) return { load: () => null, save() {}, clear() {}, restore() {} };
  const key = `cfp_fd_${page}_${S.me.id}_${S.viewEnv && S.me.role === 'owner' ? S.viewEnv : S.me.environment}`;
  const fields = () => [...form.elements].filter((x) => (x.name || x.id) && !['file', 'button', 'submit', 'search'].includes(x.type) && !skip.includes(x.id));
  const fk = (x) => x.name || x.id;
  const d = {
    load() { try { const x = JSON.parse(sessionStorage.getItem(key) || 'null'); return x && x.v && typeof x.v === 'object' && Date.now() - Date.parse(x.at) < FORM_DRAFT_MS ? x : null; } catch { return null; } },
    save(extra = {}) {
      try {
        const v = {};
        for (const x of fields()) { if (x.type === 'radio') { if (x.checked) v[fk(x)] = x.value; } else if (x.type === 'checkbox') { if (x.checked) v[fk(x)] = true; } else if (x.value !== '') v[fk(x)] = x.value; }
        const ph = $('input[type=file]', form); const photos = ph && ph.files ? ph.files.length : 0;
        sessionStorage.setItem(key, JSON.stringify({ ...extra, at: new Date().toISOString(), v, photos }));
      } catch {   }
    },
    clear() { try { sessionStorage.removeItem(key); } catch {} },

    restore(x) {
      for (const el of fields()) {
        const k = fk(el); if (!(k in x.v)) continue;
        if (el.type === 'radio') { if (el.value !== x.v[k] || el.checked) continue; el.checked = true; const det = el.closest('details'); if (det) det.open = true; el.dispatchEvent(new Event('change', { bubbles: true })); }
        else if (el.type === 'checkbox') { el.checked = x.v[k] === true; }
        else if (el.tagName === 'SELECT') { if ([...el.options].some((o) => o.value === x.v[k])) { el.value = x.v[k]; el.dispatchEvent(new Event('change', { bubbles: true })); } }
        else { el.value = String(x.v[k]); el.dispatchEvent(new Event('input', { bubbles: true })); }
      }
    },
  };
  return d;
}


function bindFormDraft(page, form, vehField, preId, skip) {
  const d = formDraft(page, form, skip);
  const x = d.load();
  if (x && !(preId && x.v[vehField] && x.v[vehField] !== preId)) {
    d.restore(x);
    const box = document.createElement('div'); box.className = 'panel'; box.id = 'fdraft'; box.setAttribute('role', 'status'); box.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:center';
    box.innerHTML = `<span class="small" style="flex:1 1 200px">${esc(t('form_draft_restored').replace('{d}', fmtDT(x.at)))}${x.photos ? ' ' + esc(t('form_draft_photos')) : ''}</span><button type="button" class="btn secondary" id="fdx">${esc(t('inventory_draft_discard'))}</button>`;
    form.prepend(box);
    $('#fdx').onclick = () => { if (!confirm(t('form_draft_discard_confirm'))) return; d.clear(); route(); };
  }
  const save = (e) => { if (e.isTrusted) d.save(); };
  form.addEventListener('input', save); form.addEventListener('change', save);
  return d;
}
function collectChecklist(form) {
  const fd = new FormData(form);
  return S.meta.checklist.map((i) => ({ key: i.key, result: fd.get(i.key), note: fd.get(i.key + '__note') || null, safety_relevant: !!fd.get(i.key + '__safety'), ...(fd.get(i.key) === 'mangel' && fd.get(i.key + '__on') === 'coupled' ? { on_coupled: true } : {}) }));
}
async function viewInspection(...a) { return (await lazyModule('fahrzeug')).viewInspection(...a); }
async function viewDepartureCheck(preId) {
  if (!mayCheck()) { render(`<h1>${esc(t('departure_check'))}</h1><p class="muted">${esc(t('no_permission_view'))}</p>`, 'check'); return; }
  const vs = await vehiclesCached();
  if (!vs.length) { render(`<h1>${esc(t('departure_check'))}</h1>${outboxBanner()}${noVehiclesNote()}`, 'check'); return; }
  render(`<h1>${esc(t('departure_check'))}</h1>${outboxBanner()}${helpLink('check')}<form id="f"><label for="v">${esc(t('vehicle'))}</label><select id="v" required><option value="">–</option>${vs.map((v) => `<option value="${esc(v.id)}"${v.assigned && vs.filter((x) => x.assigned).length === 1 ? ' selected' : ''}>${esc(v.plate)}${v.kind === 'anhaenger' ? ' (' + esc(t('vk_anhaenger')) + ')' : ''}${v.availability === 'gesperrt' ? ' – ' + esc(t('locked')) : ''}</option>`).join('')}</select><div id="known"></div>
    ${checklistHtml(true)}${tachoPanel()}${glassPanel(true)}<label for="km">${esc(t('km'))}<span class="hint" id="kmtr" hidden>${esc(t('kmtr_hint'))}</span></label><p class="small muted" id="dckmlast" hidden style="margin:0 0 4px"></p><input id="km" inputmode="numeric" pattern=" *[0-9][0-9 .]*" maxlength="40"><div id="dckmd" aria-live="polite"></div>
    <label for="ph">${esc(t('photos_now'))}<span class="hint">${esc(t('check_photos_hint'))}</span></label><input type="file" id="ph" accept="image/jpeg,image/png,image/webp" multiple>
    <div class="actions"><button class="btn block" id="sb">${esc(t('submit_inspection'))}</button></div></form><p class="small"><a class="tap" href="#/check/paper">${esc(t('paper_form'))}</a> – ${esc(t('paper_hint'))}</p><p class="small" id="dcdmg">${esc(t('dc_damage_hint'))} <a class="tap" id="dcdmglink" href="#/new">${esc(t('report_damage'))} ›</a></p>`, 'check');
  const form = $('#f'); bindChecklist(form);

  const dmgLink = () => { const a = $('#dcdmglink'); if (a) a.href = /^VIN:[A-Z0-9]+$/.test($('#v').value) ? '#/new/' + $('#v').value : '#/new'; };
  $('#v').addEventListener('change', dmgLink);

  const cplSync = () => cplUpdate(form, vs.find((x) => x.id === $('#v').value));
  $('#v').addEventListener('change', cplSync);
  if (preId) { if (vs.some((v) => v.id === preId)) $('#v').value = preId; else toast(t('qr_vehicle_unknown'), true); }


  const kmTr = () => { const v = vs.find((x) => x.id === $('#v').value); $('#kmtr').hidden = !(v && v.kind === 'anhaenger'); };
  $('#v').addEventListener('change', kmTr);
  const dcKm = () => departureKmInfo(vs); $('#v').addEventListener('change', dcKm); $('#km').addEventListener('input', dcKm);
  dmgLink(); cplSync(); kmTr(); dcKm();



  const tachoCheck = () => { const ms = collectChecklist(form).filter((i) => i.result === 'mangel'); $('#tacho').hidden = !ms.some((i) => TACHO_HINT.test(i.note || '')); $('#glass').hidden = !ms.some((i) => GLASS_HINT.test(i.note || '')); };
  form.addEventListener('input', tachoCheck); form.addEventListener('change', tachoCheck);


  let known = null;
  const showKnown = () => { const box = $('#known'); if (!box) return; const id = $('#v').value; box.innerHTML = notMineHint(vs, id) + departureLockBox(vs.find((x) => x.id === id), known && (known.find((x) => x.id === id) || coupledKnown(known, id))); };
  showKnown();
  $('#v').addEventListener('change', showKnown);
  if (S.me.role === 'driver') api('GET', '/api/me/vehicles').then((r) => { known = r.vehicles; showKnown(); }).catch(() => { known = myVehCached(); showKnown(); });
  photoLimitWatch($('#ph'), () => ({ day: bDate(), k: 'photo_old_check' }));
  const draft = bindFormDraft('check', form, 'v', preId);
  tachoCheck();



  let dcVeh = $('#v').value, dcFrom = null;
  const dcHasInput = () => $$('input[type=radio]:checked', form).length > 0 || !!$('#km').value.trim() || !!($('#ph').files && $('#ph').files.length);
  const dcPlate = (id) => { const v = vs.find((x) => x.id === id); return v ? v.plate : id; };
  const dcClose = () => { dcFrom = null; const b = $('#dcsw'); if (b) b.remove(); };

  $('#v').addEventListener('change', () => {
    const nv = $('#v').value;
    if (dcFrom && (nv === dcFrom || !nv)) { if (nv) { dcClose(); dcVeh = nv; } return; }
    if (!dcFrom && dcVeh && nv && nv !== dcVeh && dcHasInput()) dcFrom = dcVeh;
    if (nv) dcVeh = nv;
    if (!dcFrom || !nv) return;
    let box = $('#dcsw');
    if (!box) { box = document.createElement('div'); box.id = 'dcsw'; box.className = 'panel alert'; box.setAttribute('role', 'alert'); $('#known').insertAdjacentElement('beforebegin', box); }
    box.innerHTML = `<p><b>${esc(t('dcsw_title').replace('{from}', dcPlate(dcFrom)).replace('{to}', dcPlate(nv)))}</b></p><p class="small">${esc(t('dcsw_hint'))}</p><div class="actions"><button type="button" class="btn" id="dcswnew">${esc(t('dcsw_new'))}</button><button type="button" class="btn secondary" id="dcswkeep">${esc(t('dcsw_keep'))}</button></div>`;
    $('#dcswnew').onclick = () => {
      $$('.checkitem', form).forEach((row) => { $$('input[type=radio]', row).forEach((r) => (r.checked = false)); const det = $('.detail', row); det.hidden = true; $$('input', det).forEach((x) => { if (x.type === 'checkbox') x.checked = false; else { x.value = ''; x.required = false; } }); $$('select', det).forEach((x) => (x.value = '')); row.classList.remove('missing'); });
      $('#km').value = ''; $('#ph').value = ''; $('#km').dispatchEvent(new Event('input', { bubbles: true })); $('#ph').dispatchEvent(new Event('change', { bubbles: true }));
      dcClose(); tachoCheck(); draft.save(); toast(t('dcsw_cleared'));
      const first = $('.checkitem input[type=radio]', form); if (first) first.focus();
    };
    $('#dcswkeep').onclick = () => { dcClose(); draft.save(); $('#v').focus(); };
  });
  const key = uid();
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (dcFrom && $('#dcsw')) { $('#dcsw').scrollIntoView({ block: 'center' }); toast(t('dcsw_decide'), true); return; }
    const sb = $('#sb');
    const who = outboxWho();

    if ($('#km').value.trim() && !kmInputOk($('#km').value)) { $('#km').focus(); toast(t('km_invalid'), true); return; }
    const body = { kind: 'abfahrt', vehicle_id: $('#v').value, request_key: key, items: collectChecklist(form), odometer_km: $('#km').value || null, checklist_version: S.meta.checklist_version || undefined };
    const files = photoUsable($('#ph'));
    const hasDefect = body.items.some((i) => i.result === 'mangel');
    try {
      sb.disabled = true;
      const r = await api('POST', '/api/inspections', body, { timeoutMs: SEND_TIMEOUT_MS });
      draft.clear();

      let failed = 0;

      const fTarget = (r.followups.find((f) => f && f.id && (!f.repeat || f.own)) || (S.me.role !== 'driver' ? r.followups.find((f) => f && f.id) : null) || {}).id;
      let later = 0;
      if (files.length && fTarget) ({ failed, later } = await uploadPhotosSafe('/api/inspections', body, r, fTarget, files, sb, who));
      const lockedPage = sb.isConnected && (r.vehicle_locked || r.coupled_locked);

      const extra = `${files.length && !fTarget ? ' · ' + photosSkippedText(r) : ''}${failed ? ' · ' + tn('photos_failed', failed) : ''}${later ? ' · ' + tn('photos_stored', later) : ''}${kmWarn(r)}${cplNote(r)}`;
      if (!lockedPage) toast(`${t('check_saved')}${extra}${lockedWarn(r)}`, !!failed || !!r.km_rejected || !!r.km_equals_truck || !!r.vehicle_locked || !!r.coupled_locked);
      else if (extra) toast(extra.slice(3), !!failed || !!r.km_rejected || !!r.km_equals_truck);


      if (lockedPage) {
        render(`<h1>${esc(t('departure_check'))}</h1><div class="panel alert" role="alert" data-lockedresult><p><b>${esc(t('check_saved'))}</b></p>${r.vehicle_locked ? `<p><b>⚠ ${esc(t('locked'))} – ${esc(t('do_not_drive'))}</b></p>` : ''}${r.coupled_locked ? `<p><b>⚠ ${esc(coupledLockedText(r.coupled_locked))}</b></p>` : ''}${callBox(body.vehicle_id)}</div><div class="actions">${fTarget ? `<a class="btn secondary" href="#/cases/${esc(fTarget)}">${esc(t('locked_open_followup'))}</a>` : ''}<a class="btn secondary" href="#/">${esc(t('back'))}</a></div>`);
        return;
      }



      const mine = (r.followups || []).filter((f) => f && f.id && (!f.repeat || f.own));
      if (sb.isConnected && S.me.role === 'driver' && mine.length) {
        render(`<h1>${esc(t('departure_check'))}</h1><div class="panel" role="status" data-defectresult><p><b>${esc(t('check_saved'))}</b></p><p>${esc(tn('check_defects_reported', mine.length))}: ${mine.map((f) => `<a href="#/cases/${esc(f.id)}">${esc(f.case_no || '')}</a>`).join(', ')}</p><p><b>${esc(t('check_defect_clarify'))}</b></p><div class="actions"><a class="btn secondary" href="#/emergency?v=${esc(body.vehicle_id)}">☎ ${esc(t('em_title'))}</a></div></div><div class="actions"><a class="btn secondary" href="#/cases/${esc(mine[0].id)}">${esc(t('locked_open_followup'))}</a><a class="btn secondary" href="#/">${esc(t('back'))}</a></div>`);
        return;
      }
      if (sb.isConnected) location.hash = fTarget ? '#/cases/' + fTarget : '#/';
    } catch (err) {
      sb.disabled = false;
      if (err.offline || err.status === 401 || err.code === 'user_mismatch' || err.code === 'env_mismatch') {
        let stored = 0;
        if (files.length && hasDefect) { try { const list = []; for (const f of files) list.push(await prepPhoto(f)); await photosPut(key, list); stored = list.length; } catch {} }
        outboxAdd('/api/inspections', body, stored, who);
        draft.clear();
        if (!err.offline || !sb.isConnected) { toast(t(err.offline ? 'outbox_saved' : 'outbox_saved_login')); return; }
        const critical = body.items.some((i) => i.result === 'mangel' && i.safety_relevant);
        render(`<h1>${esc(t('departure_check'))}</h1><div class="panel alert" role="alert"><p><b>${esc(t('outbox_saved'))}</b></p>${critical ? callBox(body.vehicle_id) : ''}${files.length && !hasDefect ? `<p class="small">${esc(t('check_photos_skipped'))}</p>` : files.length && !stored ? `<p>${esc(t('photos_offline'))}</p>` : stored ? `<p>${esc(tn('photos_stored', stored))}</p>` : ''}</div><div id="outbox_slot"></div><div class="actions"><a class="btn secondary" href="#/">${esc(t('back'))}</a></div>`, 'check');
        return;
      }
      toast(err.message, true);
    }
  };
}




function departureKmInfo(vs) {
  const v = vs.find((x) => x.id === $('#v').value); const last = v && Number.isFinite(v.last_km) ? v.last_km : null;
  const hint = $('#dckmlast'); const box = $('#dckmd'); if (!hint || !box) return;
  hint.hidden = last === null; hint.textContent = last === null ? '' : t('irv_last_km').replace('{km}', fmtNum(last)).replace('{d}', fmtD(v.last_km_at));
  const raw = $('#km').value; const k = kmInputOk(raw) && raw.trim() ? Number(raw.replace(/[\s\u00a0.]/g, '')) : null;
  if (last === null || k === null) { box.innerHTML = ''; return; }
  if (k < last) { box.innerHTML = `<p class="panel warn small" role="alert" id="dckmlow" style="margin:4px 0 0">⚠️ ${esc(t('dc_km_lower').replace('{prev}', fmtNum(last)).replace('{d}', fmtD(v.last_km_at)))}</p>`; return; }
  box.innerHTML = `<p class="small muted" id="dckmdiff" style="margin:4px 0 0">${esc(t('irv_km_diff').replace('{n}', fmtNum(k - last)))}</p>${kmDigitsWarn(k, last, 'id="dckmdigits"')}`;
}

function kmDigitsWarn(k, last, attr, key = 'dc_km_digits') { return Number.isFinite(k) && Number.isFinite(last) && last > 0 && String(Math.trunc(k)).length > String(Math.trunc(last)).length ? `<p class="panel warn small" role="alert" ${attr} style="margin:4px 0 0">⚠️ ${esc(t(key).replace('{km}', fmtNum(k)).replace('{prev}', fmtNum(last)))}</p>` : ''; }
function kmInputOk(v) { const x = String(v).replace(/[\s\u00a0]/g, ''); if (!/^\d+$/.test(x) && !/^[1-9]\d{0,2}(\.\d{3})+$/.test(x)) return false; const n = Number(x.replace(/\./g, '')); return n >= 0 && n <= 5000000; }

async function viewCheckPaper(...a) { return (await lazyModule('fahrzeug')).viewCheckPaper(...a); }




const mayCheck = () => ['driver', 'fleet', 'owner', 'workshop'].includes(S.me && S.me.role);
const mayReport = () => !!(S.me && S.me.role !== 'viewer');





const FB_HREF = { gesperrt: '#/vehicles?f=gesperrt', werkstatt: '#/vehicles?f=werkstatt', meldung_offen: '#/vehicles?f=meldung_offen', einsatzbereit_lt_system: '#/vehicles?f=einsatzbereit_lt_system' };

async function viewVehicles(...a) { return (await lazyModule('fahrzeug')).viewVehicles(...a); }

const coupledLockedText = (c) => `${t(c.kind === 'anhaenger' ? 'trailer' : 'truck')} ${c.plate}: ${t('locked')} – ${t('do_not_drive')}`;
function coupledLockedChip(c) {
  if (!c || !c.locked) return '';
  return `<span class="chip kritisch">${esc(coupledLockedText(c))}</span>`;
}



function coupledKnown(known, id) { const p = known.find((x) => x.coupled && x.coupled.id === id); return p ? { locked: p.coupled.locked, known_defects: p.coupled.known_defects || [], open_items_after_release: p.coupled.open_items_after_release || [], notes: p.notes || [] } : null; }



const todayMark = (d) => (d && d === bDate() ? ` <b data-today>(${esc(t('today'))})</b>` : d && d === bDate(1) ? ` <b data-tomorrow>(${esc(t('tomorrow'))})</b>` : '');
function departureLockBox(sv, kv) {
  const locked = (kv && kv.locked) || (sv && sv.availability === 'gesperrt');
  const c = (kv && kv.coupled) || (sv && sv.coupled && sv.coupled.availability === 'gesperrt' ? { ...sv.coupled, locked: true } : null);

  const today = sv && sv.last_check_at && BERLIN_FMT.format(new Date(sv.last_check_at)) === bDate() ? `<p class="panel small" role="status" data-dctoday style="margin:0 0 8px">${esc(t('dc_today_done').replace('{t}', fmtDT(sv.last_check_at)).replace('{r}', t(sv.last_check_result === 'maengel' ? 'dc_today_def' : 'dc_today_ok')))}</p>` : '';
  return (sv ? outboxVehAlert(sv.id) : '') + today + (locked ? `<div class="alert" role="alert" style="margin-bottom:8px"><b>${esc(t('scan_locked'))}</b></div>` : '') + coupledAlert(c) + (kv ? drvNotes(kv.notes) + knownDefects(kv.known_defects) + relItems(kv.open_items_after_release) + coupledDefects(kv.coupled) + dcInspBox(kv) : '');
}



function dcInspItems(v, who = '') {
  if (!v) return [];
  const today = bDate(); const tm = bDate(1); const out = [];
  const dk = (k) => (k === 'HU' ? t('hu_long') : k === 'SP' ? t('sp_long') : mk(k));
  for (const r of v.next_inspections || []) {
    const parts = [];
    if (r.next_due_date && r.next_due_date < today) parts.push(`${fmtD(r.next_due_date)} <span class="chip kritisch">${esc(t('drv_overdue'))}</span>`);
    else if (r.next_due_date && r.next_due_date <= tm) parts.push(`${esc(t('c_due_on').replace('{d}', fmtD(r.next_due_date)))}${todayMark(r.next_due_date)}`);
    if (r.planned_date && r.planned_date >= today && r.planned_date <= tm) parts.push(`${esc(t('planned'))} ${fmtD(r.planned_date)}${todayMark(r.planned_date)}`);
    if (parts.length) out.push({ crit: !!(r.next_due_date && r.next_due_date < today), html: `<li>${who}<b>${esc(dk(r.kind))}</b>: ${parts.join(' · ')}</li>` });
  }
  const pi = v.planned_inspection;
  if (pi && pi.planned_date >= today && pi.planned_date <= tm && !(v.next_inspections || []).some((r) => r.kind === pi.kind && r.planned_date)) out.push({ crit: false, html: `<li>${who}<b>${esc(dk(pi.kind))}</b>: ${esc(t('planned'))} ${fmtD(pi.planned_date)}${todayMark(pi.planned_date)}</li>` });
  return out;
}
function dcInspBox(kv) {
  const c = kv.coupled;
  const items = [...dcInspItems(kv), ...dcInspItems(c, c ? `${esc(t(c.kind === 'anhaenger' ? 'trailer' : 'truck'))} ${esc(c.plate)} – ` : '')];
  if (!items.length) return '';
  const crit = items.some((i) => i.crit);
  return `<div class="panel ${crit ? 'warn' : ''} small" role="note" data-dcinsp style="margin:8px 0"><b>${esc(t(crit ? 'dc_insp_over' : 'dc_insp_t'))}</b><ul style="margin:4px 0 0;padding-left:18px">${items.map((i) => i.html).join('')}</ul>${crit ? `<p style="margin:4px 0 0">${esc(t('dc_insp_over_hint'))}</p>` : ''}</div>`;
}
const lockedWarn = (r) => (r && r.vehicle_locked ? ` · ${t('locked')} – ${t('do_not_drive')}` : '') + (r && r.coupled_locked ? ` · ${coupledLockedText(r.coupled_locked)}` : '');
const coupledAlert = (c) => (c && c.locked ? `<div class="alert" role="alert" style="margin-bottom:8px">${esc(coupledLockedText(c))}</div>` : '');



const posL = (code) => posWord(code, S.lang);
const fmtKm = (n) => fmtNum(n) + (S.lang === 'uk' ? ' км' : ' km');

const fmtMm = (n) => fmtNum(n) + (S.lang === 'uk' ? ' мм' : ' mm');




const kmDigHtml = (m) => (m && m.km_digits_prev ? ` <span class="chip mittel" style="white-space:normal" data-kmdigits>⚠️ ${esc(t('km_due_digits').replace('{prev}', fmtKm(m.km_digits_prev)))}</span>` : '');


const kmFcHint = (fc) => t('km_forecast_hint').replace('{from}', fmtD(fc.from)).replace('{to}', fmtD(fc.to)).replace('{kpd}', fmtNum(fc.km_per_day));

const kmFcHtml = (fc, short = false) => `<span class="km-fc" title="${esc(kmFcHint(fc))}">${esc(t('km_forecast').replace('{d}', fmtD(fc.date)))}${short ? '' : `<span class="sr-only"> – ${esc(kmFcHint(fc))}</span>`}</span>`;


const mY = (d) => (d ? `${d.slice(5, 7)}/${d.slice(0, 4)}` : '–');


function huNote(x, i) {
  const c = (x.note_codes || [])[i];
  if (!c || S.lang === 'de') return x.notes[i];
  const k = 'hn_' + c.code; const s = t(k);
  return s === k ? x.notes[i] : s.replace(/\{(\w+)\}/g, (m, n) => (n in (c.p || {}) ? isoDay(c.p[n]) : m));
}





const wsTranslit = (x) => String(x || '').normalize('NFC').trim().toLocaleLowerCase('de').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
function wsForSite(site) {
  const k = wsTranslit(site); if (!k) return '';

  const byName = S.meta.workshops.filter((x) => wsTranslit(x.name).includes(k));
  const w = S.meta.workshops.find((x) => wsTranslit(x.code) === k) || (byName.length === 1 ? byName[0] : null);
  return w ? w.code : '';
}


function siteWsHints(r, newSite) {
  const bs = r && r.open_workshop_by_status;
  if (!Array.isArray(bs)) return r && r.open_workshop_cases ? [tn('veh_site_ws_open', r.open_workshop_cases).replace('{list}', () => (r.open_workshop_sites || []).join(', '))] : [];
  const nw = wsForSite(newSite); const g = { gemeldet: [], werkstatt_freigegeben: [], fixed: [] };
  for (const x of bs) if (!(nw && x.site === nw)) (x.status === 'gemeldet' || x.status === 'werkstatt_freigegeben' ? g[x.status] : g.fixed).push(x);
  const name = (c) => wsLabel(S.meta.workshops.find((w) => w.code === c) || { name: c });
  const cnt = (arr) => arr.reduce((a, x) => a + x.n, 0); const lst = (arr) => [...new Set(arr.map((x) => name(x.site)))].join(', ');
  return [g.gemeldet.length ? tn('veh_site_ws_reported', cnt(g.gemeldet)).replace('{list}', () => lst(g.gemeldet)) : '',
    g.werkstatt_freigegeben.length ? tn('veh_site_ws_movable', cnt(g.werkstatt_freigegeben)).replace('{list}', () => lst(g.werkstatt_freigegeben)) : '',
    g.fixed.length ? tn('veh_site_ws_fixed', cnt(g.fixed)).replace('{list}', () => lst(g.fixed)) : ''].filter(Boolean);
}
const wsOptions = (site) => `${site ? '' : '<option value="" selected>–</option>'}${S.meta.workshops.map((w) => `<option value="${esc(w.code)}"${w.code === site ? ' selected' : ''}>${esc(wsLabel(w))}</option>`).join('')}`;

function maintOrderHtml(rid, kind, orders, v) {
  if (!isMgr() || !rid) return '';
  const o = orders && orders.get(rid);
  if (o) return `<p class="small">🔧 <a href="#/cases/${esc(o.id)}">${esc(t('mo_open'))} ${esc(o.case_no)}</a> · ${esc(t('st_' + o.status))}</p>`;
  const site = wsForSite(v && v.site);
  return `<details class="noprint"><summary>${esc(t('mo_create'))}</summary><form data-mord="${esc(rid)}"><label>${esc(t('workshop'))} (${esc(mk(kind))})</label><select name="workshop_site">${wsOptions(site)}</select><label>${esc(t('urgency'))}</label><select name="priority"><option value="niedrig">${esc(t('prio_niedrig'))}</option><option value="mittel">${esc(t('prio_mittel'))}</option></select><label>${esc(t('note'))}</label><input name="note" maxlength="300"><p class="small muted">${esc(t('mo_hint'))}</p>${v && v.svc && v.svc.length ? `<p class="small" role="note" data-mosvc>⚠ ${esc(t('mo_svc_hint').replace('{list}', () => v.svc.map((c) => c.partner + (c.contract_no ? ' (' + c.contract_no + ')' : '')).join(', ')))}</p>` : ''}<div class="actions"><button class="btn secondary">${esc(t('mo_create'))}</button></div></form></details>`;
}
const DEFECT_RESULTS = ['erhebliche_maengel', 'gefaehrliche_maengel', 'verkehrsunsicher'];








async function viewVehicle(...a) { return (await lazyModule('fahrzeug')).viewVehicle(...a); }



const CT_KINDS = ['leasing', 'miete', 'finanzierung', 'versicherung', 'wartung', 'sonstiges'];
const CT_CLS = { handeln: 'kritisch', hinweis: 'mittel', ok: 'ok', beendet: '' };
const ctChip = (s) => `<span class="chip ${CT_CLS[s.overall]}">${esc(t('cs_' + s.overall))}</span>`;

function ctLines(c, { noEvidence = false } = {}) {
  const s = c.status; const out = [];
  if (c.start_date || c.end_date) out.push(`${c.start_date ? `${esc(t('ct_start'))}: ${fmtD(c.start_date)} · ` : ''}${esc(t('ct_end'))}: ${c.end_date ? `<b>${fmtD(c.end_date)}</b>` : '–'}${s.end && s.end.status === 'abgelaufen' ? ` <span class="chip kritisch" style="white-space:normal">${esc(t('ct_overdue'))}</span>` : s.end && s.end.status === 'laeuft_aus' ? ` <span class="chip mittel">${esc(t('cs_hinweis'))}</span>` : ''}`);
  if (s.notice) out.push(`${esc(t('ct_notice_by'))}: <b>${fmtD(s.notice.by)}</b> · ${esc(t('ct_notice'))}: ${esc(String(c.notice_months))}${s.notice.status === 'bald' ? ` <span class="chip mittel">${esc(t('cs_hinweis'))}</span>` : s.notice.status === 'verstrichen' ? ` <span class="chip">${esc(t('ct_notice_passed'))}</span>` : ''}`);
  if (s.km) {
    if (s.km.driven !== undefined) out.push(`${esc(t('ct_km_allow'))}: ${fmtKm(c.km_allowance)} · ${esc(t('ct_driven'))}: ${fmtKm(s.km.driven)}${s.km.measured_at ? ` <span class="small muted" data-ct-read>(${esc(t('ct_km_read'))} ${fmtD(s.km.measured_at)})</span>` : ''} · ${esc(t('ct_left'))}: ${fmtKm(Math.max(0, s.km.remaining))}${s.km.status === 'ueber' ? ` <span class="chip kritisch">${esc(t('ct_km_over'))}</span> · ${esc(t('ct_km_excess'))}: <b>${fmtKm(-s.km.remaining)}</b>` : ''}${s.km.forecast_driven ? `<br>${esc(t('ct_forecast'))}: <span class="chip ${s.km.status === 'prognose_ueber' ? 'mittel' : ''}">≈ ${fmtKm(s.km.forecast_driven)}</span> <span class="small muted">(${esc(t('ct_forecast_hint'))})</span>` : ''}`);
    else if (s.km.status === 'zaehler') out.push(`${esc(t('ct_km_allow'))}: ${fmtKm(c.km_allowance)} · <span class="chip mittel" style="white-space:normal">${esc(t('ct_km_counter_drop').replace('{d}', fmtD(s.km.drop_at)))}</span>`);
    else if (s.km.status === 'unter_start') out.push(`${esc(t('ct_km_allow'))}: ${fmtKm(c.km_allowance)} · <span class="chip mittel" style="white-space:normal" data-ct-below>${esc(t('ct_km_below').replace('{km}', fmtKm(s.km.current_km)).replace('{start}', fmtKm(s.km.start_km)))}</span>`);
    else out.push(`${esc(t('ct_km_allow'))}: ${fmtKm(c.km_allowance)} · <span class="muted">${esc(t('ct_km_none'))}</span>`);

    if (s.km.start_digits_prev) out.push(`<span class="chip mittel" style="white-space:normal" data-ctstartdigits>⚠️ ${esc(t('ct_start_digits').replace('{prev}', fmtKm(s.km.start_digits_prev)))}</span>`);
  }



  if (c.reading) out.push(`<span data-ctread>${esc(t('km'))}: ${fmtKm(c.reading.km)} <span class="small muted">(${esc(t('ct_km_read'))} ${fmtD(c.reading.measured_at)}${c.reading.source ? ' · ' + esc(odoSrc(c.reading.source)) : ''})</span></span>`);

  if (c.reading && c.reading.digits_prev) out.push(`<span class="chip mittel" style="white-space:normal" data-ctdigits>⚠️ ${esc(t('ct_km_digits').replace('{prev}', fmtKm(c.reading.digits_prev)))}</span>`);

  if (c.no_reading) out.push(`<span class="muted" data-ctnoread>${esc(t('ct_km_noread'))}</span>`);
  if (c.monthly_rate_net !== null) out.push(`${esc(t('ct_rate'))}: ${eur(c.monthly_rate_net)}`);
  if (!noEvidence) out.push(`<span class="small muted">${esc(t('evidence'))}: ${esc(c.evidence)}${c.note ? ' · ' + esc(c.note) : ''}</span>`);
  if (c.ended_on) out.push(`<span class="small">${esc(t('ct_ended_on'))} ${fmtD(c.ended_on)}${c.end_note ? ' · ' + esc(c.end_note) : ''}</span>`);
  return out;
}



const cvEl = (fm, k) => fm.elements.namedItem(k) || fm.querySelector(`[data-cv="${CSS.escape(k)}"]`);
function formVals(fm, dflt) { const o = {}; for (const el of fm.elements) { const nm = el.name || (el.dataset && el.dataset.cv); if (!nm || el.type === 'hidden') continue; o[nm] = el.type === 'checkbox' ? (dflt ? el.defaultChecked : el.checked) : el.tagName === 'SELECT' ? (dflt ? ([...el.options].find((x) => x.defaultSelected) || el.options[0] || {}).value || '' : el.value) : (dflt ? el.defaultValue : el.value); } return o; }
function conflictKeep(fm, L, hid, dev = false) {
  const dp = fm.closest('details'); const now = formVals(fm, true);

  if (Object.keys(L.mine).every((k) => !(k in now) || now[k] === L.mine[k]) && Object.keys(L.seen).every((k) => !(k in now) || now[k] === L.seen[k] || now[k] === L.mine[k])) { toast(t('saved_before')); return false; }
  const other = Object.keys(L.seen).filter((k) => k in now && now[k] !== L.seen[k] && now[k] !== L.mine[k]); const names = [];
  for (const k of other) { const el = cvEl(fm, k); if (!el) continue; el.classList.add('ct-other'); el.setAttribute('aria-describedby', hid); if (el.dataset.cvl) { names.push(el.dataset.cvl); continue; } const lb = el.type === 'checkbox' ? el.closest('label') : el.previousElementSibling; if (lb && lb.tagName === 'LABEL') names.push((el.type === 'checkbox' ? lb.textContent : (lb.firstChild && lb.firstChild.textContent) || lb.textContent).trim()); }
  const both = []; for (const [k, v] of Object.entries(L.mine)) { const el = cvEl(fm, k); if (!el) continue; if (el.type === 'checkbox') el.checked = !!v; else el.value = v; if (other.includes(k) && now[k] !== v) both.push(k); }
  if (dp) dp.open = true;
  fm.insertAdjacentHTML('afterbegin', `<div class="panel warn small" role="status" id="${esc(hid)}" data-ctlost>${esc(t(dev ? 'ctd_kept' : 'case_conflict_kept'))}${names.length ? `<br>${esc(t(dev ? 'ctd_other_fields' : 'ct_other_fields'))}: <b>${esc(names.join(', '))}</b>` : ''}${both.length ? `<br>⚠️ ${esc(t(dev ? 'ctd_both_fields' : 'ct_both_fields'))}` : ''}</div>`);
  const hn = fm.querySelector('[data-ctlost]'); if (hn) hn.scrollIntoView({ block: 'center' }); return true;
}
const conflictMine = (fm) => { const seen = formVals(fm, true), cur = formVals(fm, false); const mine = {}; for (const k of Object.keys(cur)) if (cur[k] !== seen[k]) mine[k] = cur[k]; return { seen, mine }; };






function ctRet(rc) {
  if (!rc) return '';
  const parts = [rc.open_cases ? t('ct_ret_open').replace('{n}', rc.open_cases) : '', rc.open_items ? t('ct_ret_items').replace('{n}', rc.open_items) : ''].filter(Boolean);
  return `<span class="sub" data-ct-ret style="white-space:normal"><span class="chip ${parts.length ? 'mittel' : 'ok'}" style="white-space:normal">${esc(t('ct_ret'))}: ${esc(parts.length ? parts.join(' · ') : t('ct_ret_clear'))}</span></span>`;
}



async function viewContracts(...a) { return (await lazyModule('verwaltung')).viewContracts(...a); }


const tireAge = (m) => (m === null || m === undefined ? '' : m >= 12 ? t('tire_age_years').replace('{y}', Math.floor(m / 12)).replace('{m}', m % 12) : t('tire_age_months').replace('{n}', m));





const hoText = (x) => `${t('ho_keys')}: ${t(x.keys ? 'ho_' + x.keys : 'ho_none')} · ${t('ho_papers')}: ${t(x.papers ? 'ho_' + x.papers : 'ho_none')}`;
const rwsDrop = (c) => (c.planned_date ? `<p class="small muted" data-rwsdrop>${esc(t('rws_drop_plan').replace('{d}', fmtD(c.planned_date)))}</p>` : c.workshop_ack_at ? `<p class="small muted" data-rwsdrop>${esc(t('rws_drop_ack'))}</p>` : '')
  + (c.handover_keys || c.handover_papers ? `<p class="small muted" data-rwsho>${esc(t('rws_drop_ho').replace('{v}', () => hoText({ keys: c.handover_keys, papers: c.handover_papers })))}</p>` : '');

const woApptTxt = (o) => `🔧 ${esc(t('mo_open'))} ${esc(o.case_no)} · ${o.planned_date ? `${esc(t('planned_appt'))} ${fmtD(o.planned_date)}` : esc(t('ms_ohne_termin'))}`;


const pnCompact = (x) => String(x || '').toLowerCase().replace(/[\s\-./]/g, '');
const stockHit = (i, q) => { const h = helpNorm(q); if (!h) return true; if ([i.name, i.part_number, i.location].some((x) => helpNorm(x).includes(h))) return true; const c = pnCompact(q); return c.length >= 3 && pnCompact(i.part_number).includes(c); };








async function loadStockSelect(...a) { return (await lazyModule('lager', 1)).loadStockSelect(...a); }



function stockShortfall(itemId, data) {
  const el = $('#stocksel'); const sel = el && $('select', el);
  if (!sel || !data || typeof data.available !== 'number') return;
  const o = [...sel.options].find((x) => x.value === itemId); if (!o) return;
  const q = fmtNum(data.available), u = unitL(data.unit);
  o.textContent = o.textContent.replace(/ \([^()]*\)$/, '') + ` (${q} ${u})`;
  let h = $('#stockshort'); if (!h) { h = document.createElement('p'); h.id = 'stockshort'; h.className = 'small panel warn'; h.setAttribute('role', 'status'); sel.after(h); }
  h.textContent = t('stock_short_inline').replace('{q}', q).replace('{u}', u).replace(/\.\.(?=\s|$)/g, '.');
  const it = (el._items || []).find((i) => i.id === itemId);
  if (data.available <= 0) {
    o.disabled = true; if (it) it.on_hand = 0;
    if (sel.value === itemId) {
      sel.value = ''; sel.onchange();
      const fp = $('#freepart');
      if (fp && it) { const n = fp.querySelector('[name=name]'), pn = fp.querySelector('[name=part_number]'); if (n && !n.value) n.value = it.name; if (pn && !pn.value && it.part_number) pn.value = it.part_number; }
      h.textContent += ' ' + t('stock_short_out');
    }
  } else if (it) it.on_hand = data.available;
  if (sel.onchange) sel.onchange();
  sel.focus();
}


function dupInvoiceHint(data) {
  const f = $('#af'); const inv = f && f.querySelector('[name=invoice_no]'); if (!inv || !data || !Array.isArray(data.matches)) return;
  const li = data.matches.map((m) => `<li><a href="#/cases/${esc(m.case_id)}" translate="no">${esc(m.case_no)}</a>${m.same_case ? ` (${esc(t('dup_invoice_this_case'))})` : ''} · ${esc(m.supplier || '–')} · ${esc(eur(m.amount_net))} · ${esc(fmtD(m.booked_at))}</li>`).join('');
  let h = $('#dupinv'); if (!h) { h = document.createElement('div'); h.id = 'dupinv'; h.className = 'panel warn small'; h.setAttribute('role', 'status'); inv.after(h); }
  h.innerHTML = `<p>${esc(t('dup_invoice_hint').replace('{no}', data.invoice_no || inv.value))}</p><ul>${li}</ul><label class="check"><input type="checkbox" name="confirm_duplicate_invoice"> ${esc(t('dup_invoice_confirm'))}</label>`;

  inv.oninput = () => { const x = $('#dupinv'); if (x) x.remove(); inv.oninput = null; };
  h.querySelector('input').focus();
}

async function viewStock(...a) { return (await lazyModule('lager')).viewStock(...a); }

async function viewStockCount(...a) { return (await lazyModule('lager')).viewStockCount(...a); }

async function viewReorder(...a) { return (await lazyModule('lager')).viewReorder(...a); }

async function viewStockAsOf(...a) { return (await lazyModule('lager')).viewStockAsOf(...a); }

async function viewStockJournal(...a) { return (await lazyModule('lager')).viewStockJournal(...a); }

async function viewStockReceipt(...a) { return (await lazyModule('lager')).viewStockReceipt(...a); }



document.addEventListener('click', (e) => { const a = e.target && e.target.closest ? e.target.closest('a[data-puq]') : null; if (!a) return; try { sessionStorage.setItem('cfp_pu_q', a.dataset.puq); sessionStorage.setItem('cfp_pu_from', ''); sessionStorage.setItem('cfp_pu_to', ''); } catch {   } });
async function viewPartsUsage(...a) { return (await lazyModule('lager')).viewPartsUsage(...a); }



async function viewStockItem(...a) { return (await lazyModule('lager')).viewStockItem(...a); }


async function viewFines(...a) { return (await lazyModule('verwaltung')).viewFines(...a); }







async function viewFine(...a) { return (await lazyModule('verwaltung')).viewFine(...a); }





function pushEnv(ev) {
  if (!S.me || S.me.role !== 'owner' || !['test', 'production'].includes(ev)) return false;
  const cur = S.viewEnv || S.me.environment; if (cur === ev) return false;
  S.viewEnv = ev; try { localStorage.setItem('cfp_env', ev); } catch {   }
  const es = document.getElementById('envsel'); if (es) es.value = ev;
  S.unread = 0; refreshUnread(); return true;
}
function envFn() { return (S.me && S.me.role === 'owner' && S.viewEnv) || (S.me && S.me.environment) || ''; }


const WS_NO_VSDEF = new Set(['caseVsite', 'planVsite']);
function vsDef(k) { return S[k] !== undefined ? S[k] : (S.me && S.me.role !== 'driver' && !(S.me.role === 'workshop' && WS_NO_VSDEF.has(k)) && S.me.home_site) || ''; }
function siteSelect(id, name, options, cur, label = t('site'), allLabel = t('all')) {
  return `<label for="${id}">${esc(label)}</label><select id="${id}"${name ? ` name="${name}"` : ''}><option value="">${esc(allLabel)}</option>${[...new Set([...(options || []), ...(cur ? [cur] : [])])].map((x) => `<option value="${esc(x)}"${x === cur ? ' selected' : ''}>${esc(x === 'ohne' ? t('cs_nosite') : x)}</option>`).join('')}</select>`;
}


async function viewCosts(...a) { return (await lazyModule('verwaltung')).viewCosts(...a); }



async function viewDriverRecords(...a) { return (await lazyModule('verwaltung')).viewDriverRecords(...a); }






async function viewDrivers(...a) { return (await lazyModule('verwaltung')).viewDrivers(...a); }
async function viewDriver(...a) { return (await lazyModule('verwaltung')).viewDriver(...a); }






function odoSrc(s) {
  const v = String(s || ''); if (!v) return '';
  if (v.startsWith('manuell:')) return `${t('odo_src_manual')} (${t('role_' + v.slice(8))})`;

  if (v === 'kontrolle' || v === 'kontrolle:abfahrt') return t('departure_check');
  if (v === 'kontrolle:nach_reparatur') return t('inspection');
  if (v.startsWith('telematik:')) return `${t('area_telematics')} (${provL(v.slice(10))})`;
  if (v === 'import') return t('odo_src_import');
  if (v.startsWith('wartung:')) return mk(v.slice(8));
  if (v === 'fremdleistung') return t('odo_src_ext');
  return v;
}
function evFromTo(e) {

  if (e.action === 'add_external_cost' && e.payload && e.payload.odometer_km !== undefined && Number.isFinite(Number(e.payload.odometer_km))) {
    const p = e.payload; const k = p.km_rejected; const kmN = Number(p.odometer_km);
    const txt = k ? '⚠ ' + (k.next_km !== undefined ? t('ev_km_greater').replace('{km}', fmtNum(kmN)).replace('{next}', fmtNum(Number(k.next_km))) : t('ev_km_smaller').replace('{km}', fmtNum(kmN)).replace('{prev}', fmtNum(Number(k.previous_km))))
      : (p.km_test_only ? t('ext_km_ev_test') : t('ext_km_ev')).replace('{km}', fmtNum(kmN)).replace('{d}', p.odometer_on ? fmtD(p.odometer_on) : fmtD(e.created_at));
    return `<div class="small${k ? '' : ' muted'}"${k ? ' style="color:var(--mid)"' : ''} data-ev-extkm${k ? '="rejected"' : ''}>${esc(txt)}</div>`;
  }
  if (e.action === 'set_parts_drive' && e.payload) return `<div class="small muted" data-ev-pdr>${esc(t(e.payload.cleared ? 'pdr_ev_off' : 'pdr_ev_on'))}</div>`;
  if (e.payload && e.payload.parts_drive_ended) return `<div class="small muted" data-ev-pdrend>${esc(t('pdr_ev_ended'))}</div>` + evFromTo({ ...e, payload: (({ parts_drive_ended: _x, ...r }) => r)(e.payload) });
  if (e.action === 'set_work_state' && e.payload && e.payload.cleared) return `<div class="small muted" data-ev-wstclear>${esc(t('wst_cleared'))}</div>`;
  const p = e.payload; if (!p || typeof p !== 'object' || !('from' in p) || !('to' in p)) return '';

  if (e.action === 'reassign_workshop' && p.handover_before && typeof p.handover_before === 'object') return `<div class="small muted">${esc(wsName(p.from))} → ${esc(wsName(p.to))}</div><div class="small muted" data-ev-horeset>${esc(t('ev_ho_reset').replace('{v}', () => hoText(p.handover_before)))}</div>`;
  if (e.action === 'parts_partial') return '';
  const oneSide = ['set_followup', 'set_planned_date', 'set_vehicle_location', 'set_handover', 'set_occurred_at'].includes(e.action) || /^\d{4}-\d{2}-\d{2}$/.test(String(p.from || p.to || ''));
  if (!(p.from && p.to) && !oneSide) return '';
  if (!p.from && !p.to) return '';
  const v = (x) => { if (x === null || x === undefined || x === '') return '–';
    if (e.action === 'change_priority') return t('prio_' + x);
    if (e.action === 'reassign_workshop') return wsName(x);
    if (e.action === 'set_vehicle_location' && typeof x === 'object') return [x.location, x.service, x.on ? fmtD(x.on) : null].filter(Boolean).join(' · ') || '–';
    if (e.action === 'set_occurred_at') return fmtOccurred(x);
    if (e.action === 'set_handover' && typeof x === 'object') return hoText(x);
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(x))) return fmtD(x);
    return String(x); };

  const pn = e.action === 'set_planned_date' && 'note_to' in p ? `<div class="small muted" data-ev-plannote>${esc(t('ev_plan_note'))}: ${esc(v(p.note_from))} → ${esc(v(p.note_to))}</div>` : '';
  if (pn && p.from === p.to) return pn;
  return `<div class="small muted">${esc(v(p.from))} → ${esc(v(p.to))}</div>${pn}`;
}

function cvInspText(p) {
  const parts = [t('cv_ev_insp')];
  if (Array.isArray(p.moved_cases) && p.moved_cases.length) parts.push(t('cv_ev_cases').replace('{l}', () => p.moved_cases.join(', ')));
  if (typeof p.with_case_no === 'string') parts.push(t('cv_ev_with').replace('{v}', () => p.with_case_no));
  if (p.km && Number.isFinite(Number(p.km.km))) parts.push(t(p.km.moved ? 'cv_ev_km_moved' : 'cv_ev_km_kept').replace('{km}', () => fmtNum(Number(p.km.km))));
  return parts.join(' · ');
}

function rriNote(n) { const m = String(n || '').match(/^Vorgang (\S{1,40}): ([\s\S]*)$/); return m ? t('rri_done_in').replace('{v}', () => m[1]) + ': ' + m[2] : null; }
function evNote(e) {
  const n = String(e.note || '');
  const p = e.payload || {};

  if (e.action === 'repeat_finding' && (p.code === 'repeat_departure_check' || p.code === 'repeat_repair_check') && typeof p.defect_note === 'string') return p.defect_note;
  if (e.action === 'inspection' && (p.code === 'inspection_defects' || p.code === 'inspection_ok')) {
    const k = p.km_rejected;
    const km = k && Number.isFinite(Number(k.km)) ? ' · ' + (k.next_km !== undefined ? t('ev_km_greater').replace('{km}', fmtNum(Number(k.km))).replace('{next}', fmtNum(Number(k.next_km))) : t('ev_km_smaller').replace('{km}', fmtNum(Number(k.km))).replace('{prev}', fmtNum(Number(k.previous_km)))) : '';
    return (p.code === 'inspection_defects' ? tn('ev_defects', Number(p.defects) || 0) : t('ev_no_defects')) + km;
  }

  if (e.action === 'checked_while_locked' && p.code === 'departure_check_while_locked') {
    const when = p.performed_at ? fmtDT(p.performed_at) : fmtDT(e.created_at);
    return Number.isFinite(Number(p.km)) && p.km !== null && p.km !== undefined ? t('ev_checked_locked_km').replace('{t}', when).replace('{km}', fmtNum(Number(p.km))) : t('ev_checked_locked').replace('{t}', when);
  }
  if (e.action === 'open_item_to_case' && typeof p.case_no === 'string') return t('oi_followup_ref').replace('{v}', () => p.case_no);

  if (e.action === 'resolve_released_item' && typeof p.from_case_no === 'string') return t('rri_ev').replace('{v}', () => p.from_case_no).replace('{d}', () => String(p.description || '')) + (n ? ' · ' + n : '');
  if (e.action === 'resolve_open_item' && typeof p.done_in_case_no === 'string') return rriNote(n) || n;

  if (e.action === 'inspection_moved' && p.code === 'inspection_moved' && typeof p.to === 'string') return t('ev_insp_moved').replace('{p}', () => p.to);
  if (e.action === 'repeat_finding') return n.replace(/^Erneut festgestellt \(Abfahrtskontrolle\): /, '');

  if (e.action === 'approve_repair') {
    let a;
    if ((a = n.match(/^Auftrag aus Prüftermin ([^:]{1,40}?)(?:: ([\s\S]*))?$/))) return t('ev_order_maint').replace('{k}', mk(a[1])) + (a[2] ? ': ' + a[2] : '');
    if ((a = n.match(/^Mängelbeseitigung aus ([^:]{1,40}?) vom (\d{2})\.(\d{2})\.(\d{4})(?:: ([\s\S]*))?$/))) return t('ev_order_defects').replace('{k}', mk(a[1])).replace('{d}', fmtD(`${a[4]}-${a[3]}-${a[2]}`)) + (a[5] ? ': ' + a[5] : '');
    if ((a = n.match(/^Auftrag Winterreifen(?:: ([\s\S]*))?$/))) return t('ev_order_winter') + (a[1] ? ': ' + a[1] : '');
  }
  if (e.action !== 'inspection') return n;
  const m = n.match(/^(?:(\d+) Mangel\/Mängel festgestellt|Kontrolle ohne Mängel)(?: · km-Stand (\d+) (?:größer als später erfasst \((\d+)\)|kleiner als zuletzt erfasst \((\d+)\)) – nicht in die Fahrzeugakte übernommen)?$/);
  if (!m) return n;
  const head = m[1] ? tn('ev_defects', Number(m[1])) : t('ev_no_defects');
  const km = m[2] ? ' · ' + (m[3] ? t('ev_km_greater').replace('{km}', fmtNum(Number(m[2]))).replace('{next}', fmtNum(Number(m[3]))) : t('ev_km_smaller').replace('{km}', fmtNum(Number(m[2]))).replace('{prev}', fmtNum(Number(m[4])))) : '';
  return head + km;
}

function warrChip(d) { return d ? ` <span class="chip${d >= bDate() ? ' ok' : ''}">${esc(t('warranty_until_d').replace('{d}', fmtD(d)))}</span>` : ''; }

function vehInfo(vi, c, A = []) {
  const prev = (vi && vi.previous_same_item) || [];
  const vn = (vi && vi.notes) || [];
  const wr = (vi && vi.warranties) || [];
  const ls = (vi && vi.lease_contracts) || [];

  const rc = ((vi && vi.recent_closed) || []).filter((o) => !prev.some((p) => p.id === o.id));
  const cpl = (vi && vi.coupled) || [];
  const ri = (vi && vi.released_items) || [];
  const lc = (vi && vi.later_cases) || [];
  if (!vi || (!lc.length && !cpl.length && !ri.length && !vi.other_open_total && !vi.inspections_due.length && !vi.last_km && !prev.length && !vn.length && !wr.length && !ls.length && !rc.length)) return '';
  const today = bDate();
  const parts = [];

  const oo = vi.other_open_total ? vi.other_open_cases.filter((o) => !lc.some((l) => l.id === o.id)) : [];
  if (vi.other_open_total && (oo.length || vi.other_open_total > vi.other_open_cases.length)) parts.push(`<dt>${esc(t('vi_other_cases'))}</dt><dd>${oo.map((o) => `<a href="#/cases/${esc(o.id)}" translate="no">${esc(o.case_no)}</a> <span class="chip ${esc(o.priority)}">${esc(t('st_' + o.status))}</span>${o.safety_lock ? ` <span class="chip kritisch">${esc(t('locked'))}</span>` : ''}${o.description ? `<br><span class="small" data-ocdesc>${ltxt(clipTxt(cDesc(o.description), 90))}${o.created_at ? ` <span class="muted">· ${fmtDT(o.created_at)}</span>` : ''}</span>` : ''}`).join('<br>')}${vi.other_open_total > vi.other_open_cases.length ? `<br><span class="small muted">+${vi.other_open_total - vi.other_open_cases.length}</span>` : ''}</dd>`);
  for (const g of cpl) parts.unshift(`<dt>${esc(t('vi_coupled').replace('{p}', g.plate).replace('{k}', t(g.kind === 'anhaenger' ? 'trailer' : 'truck')))}</dt><dd data-vicoupled>${S.me.role !== 'workshop' ? `<a href="#/vehicles/${esc(g.vehicle_id)}">${esc(t('vehicle_file'))} ›</a>` : ''}${g.open_cases.length ? g.open_cases.map((o) => `<br><a href="#/cases/${esc(o.id)}" translate="no">${esc(o.case_no)}</a> <span class="chip ${esc(o.priority)}">${esc(t('st_' + o.status))}</span>${o.safety_lock ? ` <span class="chip kritisch">${esc(t('locked'))}</span>` : ''}${o.claim ? ` <span class="chip" data-vicclaim>${esc(t('claim_title'))}: ${esc(o.claim.insurer || '')}${o.claim.claim_no ? ' · ' + noTr(o.claim.claim_no) : ''}</span>` : ''}${o.description ? `<br><span class="small"${langAttr(o.description)}>${ltxt(clipTxt(cDesc(o.description), 80))}</span>` : ''}`).join('') : g.elsewhere ? `<br><span class="chip mittel" data-vicelse>${esc(t('vi_coupled_else'))}</span>` : `<br><span class="small muted">${esc(t('vi_coupled_none'))}</span>`}</dd>`);
  if (vi.coupled_truncated) parts.unshift(`<dd class="small muted" data-vicoupledmore>${esc(t('vi_coupled_more'))}</dd>`);
  if (vi.inspections_due.length) parts.push(`<dt>${esc(t('vi_due').replace('{days}', nDays(vi.inspections_due_days || 30)))}${vi.inspections_due.some((m) => m.recall_ref) ? ' · ' + esc(t('vi_recalls')) : ''}</dt><dd>${vi.inspections_due.map((m) => `${esc(mkR(m))} ${m.next_due_date ? fmtD(m.next_due_date) : esc(t('vi_recall_open'))}${m.next_due_date && m.next_due_date < today ? ` <span class="chip kritisch">${esc(t('ms_ueberfaellig'))}</span>` : ''}${m.recall_ref ? ` <span class="small muted">(${noTr(m.recall_ref)})</span>` : ''}`).join('<br>')}${(vi.inspections_due_total || 0) > vi.inspections_due.length ? `<br><span class="small muted" id="vidmore">+${vi.inspections_due_total - vi.inspections_due.length} · <a class="noprint" href="#/vehicles/${encodeURIComponent(c.vehicle_id)}">${esc(t('vi_due_all'))} ›</a></span>` : ''}</dd>`);
  if (rc.length) parts.push(`<dt>${esc(t('vi_recent_closed'))}</dt><dd data-virecent>${rc.map((o) => `${o.id ? `<a href="#/cases/${esc(o.id)}" translate="no">${esc(o.case_no)}</a>` : `<b>${esc(o.case_no)}</b>`} <span class="chip">${esc(o.kind === 'released' ? t('st_fahrzeug_freigegeben') : t('vi_kind_' + o.kind))}</span> <span class="small muted">${fmtD(o.closed_at)}</span>${o.description ? `<br><span class="small">${ltxt(clipTxt(cDesc(o.description), 90))}</span>` : ''}${viBy(o)}${o.note ? `<br><span class="small muted">${esc(t('vi_close_note'))}: ${ltxt(clipTxt(o.note, 160))}</span>` : ''}`).join('<br>')}${vi.recent_closed_truncated ? `<br><span class="small muted">${esc(t('vi_recent_more'))} · <a class="noprint" href="#/vehicles/${encodeURIComponent(c.vehicle_id)}">${esc(t('vehicle_file'))} ›</a></span>` : ''}<div class="small muted">${esc(t('vi_recent_closed_hint'))}</div></dd>`);
  if (ri.length) parts.unshift(`<dt>${esc(t('vi_rel_items'))}</dt><dd data-virelitems>${ri.map((o) => `<span${langAttr(o.description)}>${esc(clipTxt(o.description, 160))}</span>${o.safety_relevant ? ` <span class="chip kritisch">${esc(t('safety_relevant'))}</span>` : ''}<br><span class="small muted">${o.case_id ? `<a href="#/cases/${esc(o.case_id)}" translate="no">${esc(o.case_no)}</a>` : esc(o.case_no)}${o.closed_at ? ' · ' + esc(t('st_fahrzeug_freigegeben')) + ' ' + fmtD(o.closed_at) : ''}</span>${A.includes('resolve_released_item') && o.id ? ` <button type="button" class="btn secondary noprint" data-relres="${esc(o.id)}">${esc(t('rri_btn'))}</button>` : ''}`).join('<br>')}${vi.released_items_truncated ? `<br><span class="small muted">${esc(t('vi_rel_items_more'))}${S.me.role !== 'workshop' ? ` · <a class="noprint" href="#/vehicles/${encodeURIComponent(c.vehicle_id)}">${esc(t('vehicle_file'))} ›</a>` : ''}</span>` : ''}<div class="small muted">${esc(t('vi_rel_items_hint'))}</div></dd>`);
  if (prev.length) parts.unshift(`<dt>${esc(t('vi_prev_same'))}</dt><dd>${prev.map((o) => `<a href="#/cases/${esc(o.id)}" translate="no">${esc(o.case_no)}</a> · ${esc(t('st_fahrzeug_freigegeben'))} ${fmtD(o.closed_at)}${viBy(o)}`).join('<br>')}<div class="small muted">${esc(t('vi_prev_same_hint'))}</div></dd>`);
  if (lc.length) parts.unshift(`<dt>${esc(t('vi_later'))}</dt><dd data-vilater>${lc.map((o) => `<span style="white-space:nowrap">${o.id ? `<a href="#/cases/${esc(o.id)}" translate="no">${esc(o.case_no)}</a>` : `<b translate="no">${esc(o.case_no)}</b>`} <span class="chip">${esc(t('st_' + o.status))}</span></span>${o.safety_lock ? ` <span class="chip kritisch">${esc(t('locked'))}</span>` : ''} <span class="small muted">${fmtD(o.created_at)}</span>${o.same_item ? ` <span class="chip mittel" data-vilatersame>${esc(t('vi_later_same'))}</span>` : ''}${o.description ? `<br><span class="small">${ltxt(clipTxt(cDesc(o.description), 90))}</span>` : ''}`).join('<br>')}${vi.later_cases_truncated ? `<br><span class="small muted">${esc(t('vi_recent_more'))}</span>` : ''}<div class="small muted">${esc(t('vi_later_hint'))}</div></dd>`);
  if (wr.length) parts.unshift(`<dt>${esc(t('vi_warranty'))}</dt><dd>${wr.map((w) => `<a href="#/cases/${esc(w.case_id)}" translate="no">${esc(w.case_no)}</a> · ${esc(w.item)}${w.item_kind === 'part' && w.supplier ? ` <span class="small muted">(${esc(supplierLabel(w.supplier))})</span>` : ''} · ${esc(t('warranty_until_d').replace('{d}', fmtD(w.warranty_until)))}`).join('<br>')}${vi.warranties_truncated ? `<div class="small" role="note" data-warrmore>${esc(t('warr_more').replace('{n}', vi.warranties_max))}</div>` : ''}<div class="small muted">${esc(t('vi_warranty_hint'))}</div></dd>`);

  const svc = ls.filter((l) => l.kind === 'wartung'), lsl = ls.filter((l) => l.kind !== 'wartung');
  if (svc.length) parts.unshift(`<dt>${esc(t('vi_service'))}</dt><dd data-viservice>${svc.map((l) => `${esc(l.partner)}${l.contract_no ? ' · ' + noTr(l.contract_no) : ''}${l.end_date ? ` <span class="small muted">${esc(t('vi_lease_until').replace('{d}', fmtD(l.end_date)))}</span>` : ''}`).join('<br>')}<div class="small muted">${esc(t('vi_service_hint'))}</div></dd>`);
  if (lsl.length) parts.unshift(`<dt>${esc(t('vi_lease'))}</dt><dd data-vilease>${lsl.map((l) => `${esc(t('ck_' + l.kind))} · ${esc(l.partner)}${l.contract_no ? ' · ' + noTr(l.contract_no) : ''}${l.end_date ? ` <span class="small muted">${esc(t('vi_lease_until').replace('{d}', fmtD(l.end_date)))}</span>` : ''}`).join('<br>')}<div class="small muted">${esc(t('vi_lease_hint'))}</div></dd>`);
  if (vn.length) parts.unshift(`<dt>${esc(t('vnotes'))}</dt><dd>${vn.map((n) => `<b>ⓘ ${esc(n.text)}</b>${n.valid_until ? ` <span class="small muted">${esc(t('vnote_until').replace('{d}', fmtD(n.valid_until)))}</span>` : ''}`).join('<br>')}</dd>`);
  if (vi.last_km) parts.push(`<dt>${esc(t('km'))}</dt><dd>${fmtKm(vi.last_km.km)} <span class="small muted">(${fmtD(vi.last_km.measured_at)})</span></dd>`);
  return `<details class="small vinfo" style="margin-top:8px"${ri.length || cpl.some((g) => g.open_cases.length) || vi.other_open_total || prev.length || rc.length || vn.length || wr.length || ls.length || vi.inspections_due.some((m) => m.recall_ref || (m.next_due_date && m.next_due_date < today)) ? ' open' : ''}><summary><b>${esc(t('vi_title'))}</b></summary><dl class="kv">${parts.join('')}</dl></details>`;
}

async function viewScan(...a) { return (await lazyModule('scan')).viewScan(...a); }



const telHref = (p) => 'tel:' + String(p).trim().replace(/^((?:\+|00)[\d\s]*?)\s*\(0\)/, '$1').replace(/[^\d+]/g, '');


const telAbroad = (p) => { const s = String(p).trim(); if (!/^\(?0[1-9]/.test(s)) return null; const label = '+49 ' + s.replace(/^\(0([^)]*)\)\s*/, '$1 ').replace(/^0/, '').trim(); return { label, href: telHref(label) }; };


const emWinText = (w) => `${dayRanges(w.days).map(([a, b]) => (a === b ? t('em_wd_' + a) : `${t('em_wd_' + a)}${b === a + 1 ? ', ' : '–'}${t('em_wd_' + b)}`)).join(', ')} ${w.from ? `${w.from}–${w.to}${w.to <= w.from ? ` (${t('em_overnight')})` : ''}` : t('em_allday')}`;

const emHoursText = (h) => (!h ? '' : `${windowsOf(h).map(emWinText).join('; ')}${h.no_holidays ? ` · ${t('em_no_hol_short')}${h.holiday_state ? ` (${t('em_hol_state_short').replace('{x}', t('st_' + h.holiday_state))})` : ''}` : ''}`);

const emNextText = (h, now) => { const n = nextOpen(h, now); if (!n) return ''; const when = n.in_days === 0 ? n.hm : n.in_days === 1 ? `${t('em_tomorrow')} ${n.hm}` : `${t('em_wd_' + n.wd)} ${n.in_days > 6 ? fmtD(n.day) + ' ' : ''}${n.hm}`; const loc = nextOpenLocal(n, undefined, now); const locTxt = loc ? ` <span style="white-space:nowrap">(${esc(t('em_next_local').replace('{x}', `${loc.day !== n.day ? t('em_wd_' + (((new Date(loc.day + 'T12:00:00Z').getUTCDay() + 6) % 7) + 1)) + ' ' : ''}${loc.hm}`))})</span>` : ''; return ` <span class="small muted emnext" data-emnext="${esc(n.day + ' ' + n.hm)}"${loc ? ` data-emnextlocal="${esc(loc.day + ' ' + loc.hm)}"` : ''}><span style="white-space:nowrap">${esc(t('em_next_open').replace('{x}', when))}</span>${locTxt}</span>`; };

const emTzNote = (contacts, now = new Date()) => { if (!contacts.some((c) => c.hours)) return ''; const z = tzDiff(now); return z ? `<p class="panel small" data-emtz role="note">🕒 ${esc(t('em_tz_note').replace('{b}', z.berlin).replace('{l}', z.local))}</p>` : ''; };

const emSortNow = (list, now) => list.map((c, i) => ({ c, i, r: reachableNow(c.hours, now) })).sort((a, b) => (a.r === false) - (b.r === false) || a.i - b.i);
function emRows(list, now = new Date()) {
  const rows = emSortNow(list, now);
  const allClosed = rows.length && rows.every((x) => x.r === false);
  return `${allClosed ? `<p class="panel warn small" data-emallclosed role="note">${esc(t('em_all_closed'))}</p>` : ''}<div class="list">${rows.map(({ c, r }) => `<div class="row emrow${r === false ? ' emclosed' : ''}"${r === null ? '' : ` data-emopen="${r ? 1 : 0}"`}><span aria-hidden="true">☎</span><span class="title"><b>${esc(c.label)}</b> <span class="chip">${esc(t('em_kind_' + c.kind))}</span>${r === null ? '' : ` <span class="chip ${r ? 'ok' : 'muted'}">${esc(t(r ? 'em_open_now' : 'em_closed_now'))}</span>`}${r === false ? emNextText(c.hours, now) : ''}${c.hours ? `<br><span class="small emhours">${esc(t('em_hours_short'))}: ${esc(emHoursText(c.hours))}</span>` : ''}${c.note ? `<br><span class="small">${esc(c.note)}</span>` : ''}${(() => { const a = telAbroad(c.phone); return a ? `<br><span class="small muted emabroad">${esc(t('em_abroad'))}: <a href="${esc(a.href)}" aria-label="${esc(t('em_abroad_call').replace('{x}', c.label))}">${esc(a.label)}</a></span>` : ''; })()}</span><a class="btn" href="${esc(telHref(c.phone))}" aria-label="${esc(t('em_call_x').replace('{x}', c.label))}">${esc(c.phone)}</a></div>`).join('')}</div>`;
}

function emBreakdownInfo(v) {
  const rows = [];
  if (v.vin) rows.push(`<dt>${esc(t('em_bd_vin'))}</dt><dd class="embdvin" translate="no">${esc(v.vin)}</dd>`);
  if (v.manufacturer || v.model) rows.push(`<dt>${esc(t('em_bd_make'))}</dt><dd>${esc([v.manufacturer, v.model].filter(Boolean).join(' '))}${v.kind ? ` <span class="small muted">· ${esc(t('vk_' + v.kind))}</span>` : ''}</dd>`);
  if (v.tires && v.tires.length) rows.push(`<dt>${esc(t('em_bd_tires'))}</dt><dd>${v.tires.map((x) => `${esc(t('axle_' + x.axle))}: <b translate="no">${esc(x.size)}</b>${x.verified ? '' : ` <span class="small muted">(${esc(t('em_bd_unverified'))})</span>`}`).join('<br>')}</dd>`);
  if (!rows.length) return '';
  return `<details class="panel small" data-embd style="margin:0 0 10px"><summary><b>${esc(t('em_bd_title'))}</b></summary><p class="muted" style="margin:6px 0">${esc(t('em_bd_hint'))}</p><dl class="kv">${rows.join('')}</dl></details>`;
}
async function viewEmergency(vid) {
  render(`<p class="muted">${esc(t('loading'))}</p>`, 'more');
  const key = `cfp_emerg_${S.me.id}_${S.me.role === 'owner' && S.viewEnv ? S.viewEnv : S.me.environment}_${vid || ''}`;
  let d = null; let cachedAt = null;
  try { d = await api('GET', '/api/emergency' + (vid ? `?vehicle_id=${encodeURIComponent(vid)}` : '')); try { localStorage.setItem(key, JSON.stringify({ at: new Date().toISOString(), d })); } catch {} }
  catch (err) {
    if (!err.offline) throw err;
    try {
      let c = JSON.parse(localStorage.getItem(key) || 'null');

      if (!c && vid) { const g = JSON.parse(localStorage.getItem(key.slice(0, -vid.length)) || 'null'); if (g && g.d) c = { at: g.at, d: { ...g.d, vehicles: (g.d.vehicles || []).some((v) => v.id === vid) ? g.d.vehicles : [] } }; }
      if (c) { d = c.d; cachedAt = c.at; }
    } catch {}
  }
  const fromFile = /[?&]from=file\b/.test(location.hash);
  let html = `<p class="noprint"><a class="backlink" href="${vid ? (fromFile ? `#/vehicles/${encodeURIComponent(vid)}` : `#/v/${esc(vid)}`) : '#/'}">‹ ${esc(t('back'))}</a></p><h1>${esc(t('em_title'))}</h1>
    <section class="panel alert" role="note"><p style="margin-top:0"><b>${esc(t('em_112'))}</b></p><a class="btn danger block" href="tel:112" id="em112">${esc(t('em_112_btn'))}</a></section>`;
  if (!d) html += `<div class="panel alert">${esc(t('offline_view'))}</div><p class="muted">${esc(t('em_offline_none'))}</p>`;
  else {
    if (cachedAt) html += `<div class="panel alert">${esc(t('offline_view'))} (${esc(t('as_of'))} ${fmtDT(cachedAt)})</div>`;
    html += emTzNote([...d.general, ...d.vehicles.flatMap((v) => v.contacts)]);
    for (const v of d.vehicles) { const bd = emBreakdownInfo(v); if (v.contacts.length || bd) html += `<h2>${plate(v.plate)}${v.contacts.length ? ` <span class="small muted">${esc(t('em_for_vehicle'))}</span>` : ''}</h2>${bd}${v.contacts.length ? emRows(v.contacts) : ''}`; }
    if (d.general.length) html += `<h2>${esc(t('em_general'))}</h2>${emRows(d.general)}`;
    if (!d.general.length && !d.vehicles.some((v) => v.contacts.length)) html += `<p class="muted" id="emnone">${esc(t(d.can_edit ? 'em_none_mgr' : 'em_none'))}</p>`;
    if (d.can_edit && !cachedAt) html += `<div class="actions noprint"><a class="btn secondary" href="#/emergency/edit">${esc(t('em_manage'))}</a></div>`;
  }
  html += `<p style="margin-top:16px">${mayReport() ? `<a class="tap" href="${vid ? `#/new/${esc(vid)}` : '#/new'}">${esc(t('report_damage'))} ›</a> · ` : ''}<a class="tap" href="#/help?s=accident">${esc(t('help_accident_t'))} ›</a></p>`;
  render(html, 'more');
}


async function viewEmergencyEdit(...a) { return (await lazyModule('verwaltung')).viewEmergencyEdit(...a); }


async function viewQrSheet(...a) { return (await lazyModule('verwaltung')).viewQrSheet(...a); }




async function viewDriverGuide(...a) { return (await lazyModule('verwaltung')).viewDriverGuide(...a); }


const TST = { ueberfaellig: 'kritisch', bald: 'mittel', keine: '', ok: 'ok' };
async function viewTachoHistory(...a) { return (await lazyModule('verwaltung')).viewTachoHistory(...a); }

async function viewTacho(...a) { return (await lazyModule('verwaltung')).viewTacho(...a); }



async function viewInbox(...a) { return (await lazyModule('suche')).viewInbox(...a); }




function inboxPush() {
  if (!S.me || !/^#\/inbox/.test(location.hash)) return;
  const np = $('#np'); const nl = $('#nlist');
  if (!viewDirty() && !(np && np.open) && !(nl && nl.dataset.more)) { route(); return; }
  inboxBanner();
}
function inboxBanner() {
  if ($('#nnew')) return;
  const h = $('#main h1') || document.querySelector('main h1'); if (!h) return;
  h.insertAdjacentHTML('afterend', `<p class="panel small" id="nnew" role="status">${esc(t('nf_new'))} <button type="button" class="btn secondary" id="nnewb">${esc(t('nf_reload'))}</button></p>`);
  $('#nnewb').onclick = () => route();
}






async function inboxPoll() {
  if (!S.me || S.quietBg || (location.hash || '') !== '#/inbox' || S.lastHash !== '#/inbox' || document.visibilityState !== 'visible') return;
  const np = $('#np'); const nl = $('#nlist'); const ae = document.activeElement;
  if (viewDirty() || (np && np.open) || (nl && nl.dataset.more) || (ae && ae.matches && ae.matches('input, select, textarea')) || document.querySelector('dialog[open], .toast.err')) { inboxBanner(); return; }
  S.quietBg = true;
  try { await viewInbox(); } catch {   } finally { S.quietBg = false; }
}



async function pushNudge() {
  const el = $('#pushnudge'); if (!el || !S.me || S.me.role !== 'driver') return;
  const k = 'cfp_pushnudge_off_' + S.me.id; let off = false; try { off = localStorage.getItem(k) === '1'; } catch {}
  if (off || !('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined' || Notification.permission === 'denied') return;
  try { const reg = await navigator.serviceWorker.getRegistration(); if (!reg || !reg.pushManager || await reg.pushManager.getSubscription()) return; } catch { return; }
  if (!document.body.contains(el)) return;
  el.hidden = false;
  el.innerHTML = `<p class="small" style="margin-top:0">${esc(t('push_nudge'))}</p><div id="pushnudgep"></div><div class="actions"><button type="button" class="btn secondary" id="pushnudgeoff">${esc(t('push_nudge_off'))}</button></div>`;
  $('#pushnudgeoff').onclick = () => { try { localStorage.setItem(k, '1'); } catch {} el.remove(); };
  await pushPanel($('#pushnudgep'));
}

async function loadNotifyPrefs(...a) { return (await lazyModule('konto', 1)).loadNotifyPrefs(...a); }
async function pushPanel(...a) { return (await lazyModule('konto', 1)).pushPanel(...a); }


async function pushRebind() {
  try {
    if (!('serviceWorker' in navigator) || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker.getRegistration(); const sub = reg && reg.pushManager ? await reg.pushManager.getSubscription() : null;
    if (!sub) return;
    const j = sub.toJSON(); await api('POST', '/api/push/subscribe', { endpoint: j.endpoint, keys: j.keys, device_label: deviceLabel() });
  } catch {}
}

const deviceLabel = () => { const ua = navigator.userAgent; return /Android/.test(ua) ? (/Mobile/.test(ua) ? 'Android' : 'Android-Tablet') : /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'iPad' : /Windows/.test(ua) ? 'Windows-PC' : /Mac/.test(ua) ? 'Mac' : t('device'); };







const isoDay = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? fmtD(v) : String(v));
function fMsg(stored, fallback) {
  let o = stored;
  if (typeof o === 'string') { try { o = JSON.parse(o); } catch { return fallback; } }
  if (o && o.k === 'INSPECTION_UNCLEAR' && o.a && o.a.nc && S.lang !== 'de') {
    const k = 'hn_' + o.a.nc.code; const s = t(k);
    if (s !== k) o = { ...o, a: { ...o.a, note: s.replace(/\{(\w+)\}/g, (m, n) => (n in (o.a.nc.p || {}) ? isoDay(o.a.nc.p[n]) : m)) } };
  }

  if (o && o.a && typeof o.a === 'object') {
    const a = { ...o.a };
    if (typeof a.kind === 'string') a.kind = mk(a.kind);
    if (typeof a.reason === 'string') a.reason = translateLockReason(S.lang, a.reason);
    if (typeof a.pos === 'string') a.pos = posL(a.pos);
    if ('unit' in a && a.unit != null) a.unit = unitL(a.unit);

    if (typeof a.site === 'string' && a.site && S.meta && S.meta.workshops) { const w = wsAll().find((x) => x.code === a.site); a.site = w ? wsLabel({ ...w, active: true }) || a.site : a.site; }
    o = { ...o, a };
  }
  return findingMessage(o, fallback, S.lang);
}


const fcLabel = (code) => (code && (STRINGS[S.lang]['fc_' + code] || STRINGS.de['fc_' + code]) ? `<b style="display:block">${esc(t('fc_' + code))}</b>` : '');

async function viewMaster(...a) { return (await lazyModule('verwaltung')).viewMaster(...a); }



const PRINT_OPEN = '#mhist, #vaf, #tirehistd, #ddhist, #dthist, #dlchist, #vthist, details.cinsp, details.vinfo';
window.addEventListener('beforeprint', () => { for (const d of document.querySelectorAll(PRINT_OPEN)) if (!d.open) { d.open = true; d.dataset.printOpened = '1'; } });
window.addEventListener('afterprint', () => { for (const d of document.querySelectorAll(PRINT_OPEN)) if (d.dataset.printOpened) { d.open = false; delete d.dataset.printOpened; } });


async function pushOffForLogout() {
  try {
    if (!('serviceWorker' in navigator)) return null;
    const reg = await navigator.serviceWorker.getRegistration();


    try { if (reg && reg.getNotifications) for (const n of await reg.getNotifications()) n.close(); } catch {   }
    const sub = reg && reg.pushManager ? await reg.pushManager.getSubscription() : null;
    if (!sub) return null;
    const ep = sub.endpoint; sub.unsubscribe().catch(() => {}); return ep;
  } catch { return null; }
}

function downloadChecked(blob, name) { download(blob, name); if (blob.cfpTruncated) toast(t('export_truncated').replace('{n}', blob.cfpTruncated), true); }
function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }


const mEv = (e) => (e === 'Frist nach StVZO Anlage VIII berechnet (aus der Fahrzeugakte angelegt)' ? t('ev_husp_rule') : String(e || ''))
  .replace(' · Durchführung: ', ' · ' + t('ev_done_label') + ': ').replace(/\(Plakette ([^():]+): fällig bis Monatsende\)/, (_, m) => t('ev_plaque_month').replace('{m}', m));







const kmUnclearDateDue = (r) => r.status === 'ungeklaert' && ['ueberfaellig', 'faellig'].includes(r.date_status);

async function viewMaintMulti(...a) { return (await lazyModule('verwaltung')).viewMaintMulti(...a); }
async function viewMaint(...a) { return (await lazyModule('verwaltung')).viewMaint(...a); }





const dur = (h) => (h === null || h === undefined ? '–' : h < 48 ? `${fmtNum(h)} ${t('h_short')}` : `${nDays(Math.round(h / 2.4) / 10)}`);
async function viewKpi(...a) { return (await lazyModule('verwaltung')).viewKpi(...a); }


async function viewAudit(...a) { return (await lazyModule('verwaltung')).viewAudit(...a); }




const tlHash = (id, f) => '#/vehicles/' + id + '/timeline' + (f ? '?f=' + f : '');
async function viewTimeline(...a) { return (await lazyModule('verwaltung')).viewTimeline(...a); }




const clipTxt = (x, n) => { const a = [...String(x || '')]; return a.length > n ? a.slice(0, n - 1).join('') + '…' : a.join(''); };
async function viewPlan(...a) { return (await lazyModule('verwaltung')).viewPlan(...a); }

async function viewWsLoad(...a) { return (await lazyModule('verwaltung')).viewWsLoad(...a); }



function tmAge(iso) {
  const h = Math.floor((nowMs() - new Date(iso).getTime()) / 3600000);
  if (!(h >= 0)) return '';
  return h >= 48 ? t('tm_age_d').replace('{n}', Math.floor(h / 24)) : t('tm_age_h').replace('{n}', h);
}

const TM_PROV = { webfleet: 'Webfleet', yellowfox: 'YellowFox' };
const provL = (p) => TM_PROV[p] || p;
async function viewTelematics(...a) { return (await lazyModule('verwaltung')).viewTelematics(...a); }


async function viewQuality(...a) { return (await lazyModule('verwaltung')).viewQuality(...a); }



async function viewReadiness(...a) { return (await lazyModule('verwaltung')).viewReadiness(...a); }

async function viewUsage(...a) { return (await lazyModule('verwaltung')).viewUsage(...a); }


async function viewSearch(...a) { return (await lazyModule('suche')).viewSearch(...a); }


async function viewHelp(...a) { return (await lazyModule('suche')).viewHelp(...a); }



function helpSections(r) {

  if (r === 'viewer') return ['viewer', 'kpi', 'costs', 'exports', 'push', 'login2fa'];

  const parts = ['report', 'accident', 'wild', 'tachofault', 'theft', 'glass', 'lost', 'fuel', 'flat', 'roadchk', 'nostart', 'tow', 'warnlight', 'leak', 'stow', 'custdmg', 'hitrun', 'vandal', 'marten', 'storm', 'bridge', 'fire', 'reefer', 'brake', 'parkbrake', 'pedal', 'injury', 'airbag', 'fixobj', 'tarp', 'load', 'overload', 'mirror', 'coupling', 'grease', 'elec', 'batt', 'lights', 'door', 'stuck', 'visib', 'loose', 'adas', 'steer', 'engine', 'service', 'susp', 'noise', 'gear', 'seat', 'dash', 'exhaust', 'cabtilt', 'pest', 'nest', 'engnest', 'gelfuel', 'waterfuel', 'dryfuel', 'safetykit', 'spare', 'wheel', 'toll', 'ticket', 'climate', 'window', 'fuelcap', 'fuelcard', 'underrun', 'floor', 'tyre', 'cablock', 'alarm', 'vibr', 'deck', 'roofice', 'cargo', 'numplate', 'pfilter', 'step', 'lashgear', 'contour', 'sticker', 'cabkit', 'cableak', 'telem', 'oillevel', 'prio', ...(r === 'dispatch' ? [] : ['check']), 'push', 'offline', 'login2fa'];
  if (r === 'workshop') parts.unshift('ws', 'costlimit', 'stock');
  if (r === 'workshop') parts.splice(parts.indexOf('stock') + 1, 0, 'tires');

  if (['owner', 'fleet'].includes(r)) parts.unshift('fleet', 'handover', 'release', 'costlimit', 'dates', 'defects', 'kpi', 'costs', 'drivers', 'leaver', 'contracts', 'claims', 'fines', 'tires', 'stock');
  if (r === 'owner') parts.splice(parts.indexOf('stock') + 1, 0, 'privacy', 'settings');

  if (['owner', 'fleet'].includes(r)) parts.splice(parts.indexOf('stock') + 1, 0, 'access');


  if (['owner', 'fleet', 'workshop'].includes(r)) parts.splice(parts.indexOf('stock') + 1, 0, 'exports');
  if (r === 'dispatch') parts.splice(parts.indexOf('push'), 0, 'exports');
  if (r === 'dispatch') parts.unshift('dispo');
  if (r === 'driver') parts.unshift('myveh', 'myfines');
  return parts;
}


const helpLink = (n) => (S.me && helpSections(S.me.role).includes(n) ? `<p class="small noprint navlinks" style="margin:0 0 4px"><a href="#/help?s=${n}">${esc(t('help_page'))} ›</a></p>` : '');






async function viewDefects(...a) { return (await lazyModule('verwaltung')).viewDefects(...a); }






async function viewFleetTires(...a) { return (await lazyModule('verwaltung')).viewFleetTires(...a); }


async function loadSessions(...a) { return (await lazyModule('konto', 1)).loadSessions(...a); }

async function viewMore(...a) { return (await lazyModule('suche')).viewMore(...a); }




async function loadTotp(...a) { return (await lazyModule('konto', 1)).loadTotp(...a); }





async function viewUsers(...a) { return (await lazyModule('verwaltung')).viewUsers(...a); }

async function viewSettings(...a) { return (await lazyModule('verwaltung')).viewSettings(...a); }




async function fetchVersion() {
  try { const r = await fetch('/version.json', { cache: 'no-store' }); if (!r.ok) return null; return (await r.json()).version || null; } catch { return null; }
}
async function checkVersion() {

  if (!S.appVersion && BUILD_VERSION) S.appVersion = BUILD_VERSION;
  const v = await fetchVersion();
  if (!v) return;
  if (!S.appVersion) { S.appVersion = v; return; }
  if (v === S.appVersion || document.getElementById('upd')) return;
  const el = document.createElement('div');
  el.id = 'upd'; el.className = 'update-bar'; el.setAttribute('role', 'status');
  el.innerHTML = `<span>${esc(t('update_available'))}</span><button type="button" class="btn">${esc(t('update_now'))}</button><button type="button" class="btn secondary" aria-label="${esc(t('later'))}">×</button>`;
  const [now, later] = el.querySelectorAll('button');

  now.onclick = () => { if (viewDirty() && !confirm(t('update_unsaved'))) return; location.reload(); };
  later.onclick = () => el.remove();
  document.body.appendChild(el);
}
checkVersion();


document.addEventListener('keydown', (e) => { const el = e.target; if (e.key === 'Enter' && el && el.tagName === 'INPUT' && /__note$/.test(el.name || '')) e.preventDefault(); }, true);


function nativeValidityText(el) {
  const v = el.validity; if (!v || v.valid || v.customError) return '';
  const isDate = el.type === 'date' || el.type === 'month';
  const lim = (x) => (isDate && /^\d{4}-\d{2}-\d{2}$/.test(x) ? fmtD(x) : x);
  if (v.valueMissing) return t(el.type === 'checkbox' ? 'v_check' : el.type === 'file' ? 'v_file' : el.type === 'radio' || el.tagName === 'SELECT' ? 'v_choose' : 'v_required');
  if (v.tooShort) return tn('v_too_short', el.minLength).replace('{c}', el.value.length);
  if (v.tooLong) return tn('v_too_long', el.maxLength);
  if (v.badInput) return t('v_bad');
  if (v.typeMismatch) return t(el.type === 'email' ? 'v_type_email' : 'v_type');
  if (v.patternMismatch) return t('v_pattern');
  if (v.rangeUnderflow) return t(isDate ? 'v_min_date' : 'v_min').replace('{n}', () => lim(el.min));
  if (v.rangeOverflow) return t(isDate ? 'v_max_date' : 'v_max').replace('{n}', () => lim(el.max));
  if (v.stepMismatch) return t('v_step').replace('{n}', () => el.step);
  return '';
}
document.addEventListener('invalid', (e) => {
  const el = e.target; if (!el || typeof el.setCustomValidity !== 'function') return;
  const msg = nativeValidityText(el); if (!msg) return;
  el.setCustomValidity(msg); el.dataset.cfpNv = '1';
}, true);

const clearNativeValidity = (e) => {
  const el = e.target; if (!el || !el.dataset) return;
  const scope = el.form || (el.closest && el.closest('form'));
  for (const x of scope ? scope.querySelectorAll('[data-cfp-nv]') : el.dataset.cfpNv ? [el] : []) { delete x.dataset.cfpNv; x.setCustomValidity(''); }
};

document.addEventListener('input', clearNativeValidity, true);
document.addEventListener('change', clearNativeValidity, true);

const AMBIG_RE = /^-?[1-9]\d{0,2}(\.\d{3})+$/;

const AMBIG_NUM = { test: (x) => S.lang !== 'en' && AMBIG_RE.test(x) };
document.addEventListener('input', (e) => { const el = e.target; if (el instanceof HTMLInputElement && el.inputMode === 'decimal') el.setCustomValidity(AMBIG_NUM.test(el.value.trim()) ? t('num_ambiguous') : ''); });
document.addEventListener('change', (e) => { const el = e.target; if (el instanceof HTMLInputElement && el.inputMode === 'decimal' && AMBIG_NUM.test(el.value.trim())) el.reportValidity(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkVersion(); });
setInterval(checkVersion, 30 * 60 * 1000);


if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});

  navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.type === 'navigate') {
    if (typeof e.data.hash === 'string') S.pushNav = { hash: e.data.hash, at: Date.now() };

    if (!S.me && ['test', 'production'].includes(e.data.env)) history.replaceState(history.state, '', location.pathname + '?env=' + e.data.env + location.hash);
    if (pushEnv(e.data.env)) { if (location.hash === e.data.hash) route(); else location.hash = e.data.hash; return; } if (location.hash === e.data.hash) { if (!viewDirty()) route(); } else location.hash = e.data.hash; } if (e.data && e.data.type === 'push') refreshUnread(true).then(inboxPush).then(() => { caseAutoRefresh(15000); vehFileAutoRefresh(15000); }); });
}
document.documentElement.lang = S.lang;
route();






const LAZY_MODULES = {}, LAZY_READY = {}, LAZY_TRY = {}, LAZY_HINT_MS = 300;

function lazyModule(g, quiet) {
  if (!LAZY_MODULES[g]) LAZY_MODULES[g] = import(`./app-${g}.js${LAZY_TRY[g] ? `?r=${LAZY_TRY[g]}` : ''}`).then((m) => { LAZY_READY[g] = true; return m; }).catch((e) => { delete LAZY_MODULES[g]; LAZY_TRY[g] = (LAZY_TRY[g] || 0) + 1; console.error(e); throw new Error(t('lazy_load_failed')); });
  if (!LAZY_READY[g] && !quiet) { const gen = S.routeGen, h = location.hash, p = LAZY_MODULES[g]; setTimeout(() => { if (!LAZY_READY[g] && LAZY_MODULES[g] === p && S.routeGen === gen && location.hash === h) render(`<p class="muted">${esc(t('loading'))}</p>`); }, LAZY_HINT_MS); }
  return LAZY_MODULES[g];
}

export { $, $$, BERLIN_DT_FMT, BERLIN_FMT, BRIDGE_HINT, CARGO_HINT, CASE_SORTS, CT_KINDS, DEFECT_RESULTS, FORM_DRAFT_MS, FUEL_HINT, GLASS_HINT, HITRUN2_HINT, HITRUN3_HINT, HITRUN_HINT, ICON, MARTEN_HINT, MORE_MAX, NUMPLATE_HINT, OPEN_CASE_ST, PHOTO_TIMEOUT_MS, ROOFICE_HINT, S, SEND_TIMEOUT_MS, STATES, STORM_HINT, STOW_HINT, STRINGS, THEFT_HINT, TM_PROV, TOW_HINT, TST, VANDAL_HINT, VEH_SORTS, WILD_HINT, WST_ST, afLink, afterLogin, agentFindingsCsv, announceHits, api, auditActionLabel, auditDetailText, bDate, berlinLocalDT, bindChecklist, bindFormDraft, bindLang, bindPwShow, bindTachoCancel, cDesc, caseFilterQ, caseList, checkLabel, checklistHtml, claimChip, clearOfflineData, clipTxt, collectChecklist, comboClearV, conflictKeep, conflictMine, coupledLockedText, coverageGaps, ctChip, ctLines, ctRet, dataQualityCsv, dateOpts, decIn, defectItemsCsv, defectVehiclesCsv, deviceId, deviceLabel, dispoDayBefore, download, downloadChecked, dqDetail, dur, emHoursText, ensureLang, envFn, esc, eur, eur3, eurIst, fMsg, fcLabel, federalHoliday, fileUrl, filterUsers, flushOutbox, fmtD, fmtDT, fmtDue, fmtHM, fmtKm, fmtMm, fmtMonth, fmtNum, formVals, hashNorm, helpLink, helpLoaded, helpMatches, helpNorm, helpSections, hj, hoMissing, holName, holidayGaps, huNote, inviteExpired, isCasesHash, isClaimsHash, isContractsHash, isDriversHash, isFinesHash, isMaintHash, isMgr, isPlanHash, isStockHash, isTachoHash, isTiresHash, isUnusedUser, isVehHash, isWeekendD, kmDigHtml, kmDigitsWarn, kmFcHint, kmFcHtml, kmInputOk, kmUnclearDateDue, kmWarn, langAttr, langLoaded, langSelect, loadHelp, loadNotifyPrefs, loadSessions, loadTotp, locOf, lostDup, lostIs, lostMark, ltxt, mEv, mY, maintOrderHtml, markInvalid, markSession, mayCheck, mayReport, mk, mkR, nDays, nextWorkdayAfter, noSticker, noTicket, noTr, noVehiclesNote, noWsObj, noneP, notifHref, nowMs, occurredFields, occurredValue, odoSrc, offDayWatch, onPage, otherEnvOutbox, outboxGet, ownerT, paintBadge, parseQty, partsEta, partsWaitDays, phoneIn, planVehTag, plate, plateCmp, pnCompact, pnm, posL, prepareUpload, printHead, printStamp, provL, pushOffForLogout, pushPanel, pwField, qrSvg, rc2, rdyOf, rdyTxt, readCsvFile, reasonText, recentRepeat, recurFix, refreshUnread, render, resetUserState, rkFor, rwsDrop, searchKey, siteKeyUi, siteSelect, siteWsHints, sortPref, sortUsers, stTxt, stackTables, stockHit, stockNoteText, supplierLabel, t, tachoHistList, telAbroad, telHref, tfill, tireAge, tireSizeSame, tlHash, tmAge, tmKmRej, tn, toast, todayMark, translateLockReason, translateNextAction, tzNote, uiLoc, uid, unitIn, unitL, usersCsv, vOverdue, vehSig, vehiclesCached, viewInbox, viewLogin, vinOf, vlAt, vsDef, warrChip, woApptTxt, woTag, wsAll, wsForSite, wsLabel, wsName, wsOptions };
