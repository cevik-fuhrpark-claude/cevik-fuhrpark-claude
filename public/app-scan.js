// [CLAUDE] AUTOMATISCH ERZEUGT durch scripts/build-app.mjs aus public/app.js – nicht von Hand bearbeiten (Code in app.js ändern, dann npm run build)
import { ICON, S, api, coupledLockedText, esc, mayCheck, mayReport, plate, render, t, toast, vehiclesCached } from './app-main.js';


async function viewScan(id) {
  const vs = await vehiclesCached();
  const v = vs.find((x) => x.id === id);


  if (!v) {
    if (S.me.role !== 'driver' && /^VIN:[A-Z0-9]+$/.test(id)) { try { await api('GET', '/api/vehicles/' + encodeURIComponent(id)); location.hash = '#/vehicles/' + id; return; } catch (e) { if (e && e.status === 401) return; } }
    toast(t('qr_vehicle_unknown'), true); location.hash = mayReport() ? '#/new' : '#/'; return;
  }
  render(`<div>${plate(v.plate, { big: true, locked: v.availability === 'gesperrt' })}</div><h1 style="margin-top:12px">${esc(t('scan_title'))}</h1>
    ${v.availability === 'gesperrt' ? `<div class="panel alert" role="alert"><b>${esc(t('scan_locked'))}</b></div>` : ''}
    ${v.coupled && v.coupled.availability === 'gesperrt' ? `<div class="panel alert" role="alert"><b>${esc(coupledLockedText(v.coupled))}</b></div>` : ''}
    ${['werkstatt', 'meldung_offen'].includes(v.availability) ? `<p data-scanav>${S.me.role !== 'driver' ? `<a href="#/vehicles/${esc(v.id)}" class="chip mittel" style="padding:4px 10px">${esc(t('av_' + v.availability))}</a>` : `<span class="chip mittel">${esc(t('av_' + v.availability))}</span>`}</p>` : ''}
    <div class="list">${mayReport() ? `<a class="row" href="#/new/${esc(v.id)}"><span>⚠</span><span class="title">${esc(t('report_damage'))}</span><span></span></a>` : ''}
    ${mayCheck() ? `<a class="row" href="#/check/${esc(v.id)}"><span>✓</span><span class="title">${esc(t('departure_check'))}</span><span></span></a>` : ''}
    <a class="row" href="#/emergency?v=${esc(v.id)}"><span>☎</span><span class="title">${esc(t('em_title'))}</span><span></span></a>
    ${S.me.role !== 'driver' ? `<a class="row" href="#/vehicles/${esc(v.id)}"><span>${ICON.truck}</span><span class="title">${esc(t('vehicle_file'))}</span><span></span></a>` : ''}</div>`, 'new');
}

export { viewScan };
