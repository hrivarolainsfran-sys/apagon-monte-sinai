import { GAME } from './config.js';
import { RES, teamById, stationById, resById, total, distM, fmtSec, STATUS_TEXT, SPECIALS, activeSpecials, effectiveStatus } from './engine.js';
import { startClient, serverNow } from './backend.js';
import { $, esc, hhmm, netText, toast, brandHeader, pinGate, registerSW } from './ui.js';

const rules = GAME.rules;
let client, state;
let fix = null; // mejor lectura GPS reciente del admin

$('#brand').innerHTML = brandHeader();
registerSW();

const resCells = o => RES.map(r => `${r.icon}${o[r.id]}`).join(' ');

function render() {
  if (!state) return;
  const now = serverNow();
  const status = effectiveStatus(state, now);
  const sb = $('#statusBanner');
  sb.textContent = STATUS_TEXT[status].replace(/^🔴 /, '') + (state.statusTs ? ` · desde ${hhmm(state.statusTs)}` : '')
    + (status === 'running' && state.endsAt ? ` · ⏰ quedan ${fmtSec((state.endsAt - now) / 1000)}` : '');
  sb.className = 'status-banner ' + status;

  // Eventos especiales activos
  const act = activeSpecials(state, now);
  $('#activeSpecials').innerHTML = act.length ? act.map(x => `<div class="row" style="margin:4px 0"><span>${SPECIALS[x.kind].icon} <b>${SPECIALS[x.kind].name}</b>${x.stationId ? ' · ' + esc(stationById[x.stationId].name) : ''} · ${fmtSec((x.endTs - now) / 1000)}</span><button class="sm shrink" data-spend="${x.id}">Terminar</button></div>`).join('') : 'Ningún evento activo.';
  $('#cdInfo').textContent = state.endsAt ? (now < state.endsAt ? `Termina a las ${hhmm(state.endsAt)}` : 'La cuenta regresiva terminó: el juego está cerrado.') : '';
  $('#teams').innerHTML = state.ranking.map((rk, i) => {
    const t = teamById[rk.teamId], ts = state.teams[rk.teamId];
    const imm = now - ts.lastCaptureTs < rules.captureImmunitySec * 1000;
    return `<tr>
      <td>${i + 1}</td>
      <td><span class="dot" style="background:${t.color}"></span><b>${esc(t.name)}</b></td>
      <td>${resCells(ts.carry)} <span class="muted">(${total(ts.carry)}/${rules.backpackMax})</span></td>
      <td>${RES.map(r => `${r.icon}${ts.bank[r.id]}<span class="muted">/${rules.faroGoal[r.id]}</span>`).join(' ')}</td>
      <td>${ts.faroPos != null ? `🔥 ${ts.faroPos + 1}°` : ''}</td>
      <td><b>${ts.score}</b></td>
      <td>${ts.captures}${imm ? ' 🛡' : ''}</td>
      <td><button class="sm" data-cap="${t.id}">🔦 Atrapar</button> <button class="sm" data-adj="${t.id}">±</button></td>
    </tr>`;
  }).join('');

  $('#stations').innerHTML = GAME.stations.map(def => {
    const st = state.stations[def.id], r = resById[def.resource];
    const anchored = st.lat != null;
    const d = anchored && fix ? Math.round(distM(fix.lat, fix.lng, st.lat, st.lng)) + ' m' : '';
    return `<tr>
      <td><b>${esc(def.name)}</b><br><span class="muted">${esc(def.code)}${def.lugar ? ' · 📍 ' + esc(def.lugar) : ''}</span></td>
      <td>${r.icon} +${def.amount}</td>
      <td>${st.usesLeft}/${def.uses}${st.usesLeft <= 0 ? ' ⛔' : ''}</td>
      <td>${def.radar === false ? '🕳 secreta' : '📡'}</td>
      <td>${anchored ? `✅ ±${Math.round(st.acc ?? 0)} m` : '<span class="muted">sin anclar</span>'}</td>
      <td>${d}</td>
      <td><button class="sm" data-anchor="${def.id}" ${fix ? '' : 'disabled'}>📍 Anclar aquí</button></td>
    </tr>`;
  }).join('');

  const feedKey = state.feed.length + ':' + (state.feed[0]?.id || '');
  if (feedKey !== render.feedKey) render.feedKey = feedKey, $('#feed').innerHTML = state.feed.slice(0, 120).map(f => {
    const t = f.teamId && teamById[f.teamId];
    return `<div><time>${hhmm(f.ts)}</time>${t ? `<span class="dot" style="background:${t.color}"></span>` : ''}${esc(f.text)}</div>`;
  }).join('') || '<p class="muted">Sin actividad todavía.</p>';
}

// ---- estado del juego
document.querySelectorAll('[data-state]').forEach(b => b.onclick = async () => {
  const st = b.dataset.state;
  if (st === 'ended' && !confirm('¿Terminar el juego? Ya no se podrá escanear.')) return;
  const res = await client.send('game_state', { status: st });
  toast(res.text, res.ok);
});

// ---- capturar / ajustar (delegación)
document.addEventListener('click', async e => {
  const cap = e.target.closest('[data-cap]');
  if (cap) {
    const t = teamById[cap.dataset.cap];
    if (!confirm(`¿Registrar que una Sombra iluminó a ${t.name}? Pierde ${rules.captureLossPct}% de la mochila.`)) return;
    const res = await client.send('capture', { teamId: t.id, by: 'Admin' });
    toast(res.text, res.ok);
  }
  const adj = e.target.closest('[data-adj]');
  if (adj) openAdjust(adj.dataset.adj);
  const anc = e.target.closest('[data-anchor]');
  if (anc && fix) {
    const def = stationById[anc.dataset.anchor];
    if (fix.acc > 25 && !confirm(`La precisión es ±${Math.round(fix.acc)} m (baja). ¿Anclar igual "${def.name}"?`)) return;
    const res = await client.send('station_pos', { stationId: def.id, lat: fix.lat, lng: fix.lng, acc: fix.acc });
    toast(`${def.name}: ${res.text}`, res.ok);
  }
});

$('#adjRes').innerHTML = RES.map(r => `<option value="${r.id}">${r.icon} ${esc(r.name)}</option>`).join('');
let adjTeam = null;
function openAdjust(id) {
  adjTeam = id;
  $('#adjTitle').textContent = 'Ajustar · ' + teamById[id].name;
  $('#adjDelta').value = 1;
  $('#adjDlg').showModal();
}
$('#adjCancel').onclick = () => $('#adjDlg').close();
$('#adjForm').addEventListener('submit', async e => {
  e.preventDefault();
  $('#adjDlg').close();
  const delta = parseInt($('#adjDelta').value, 10);
  if (!delta) return;
  const res = await client.send('adjust', { teamId: adjTeam, where: $('#adjWhere').value, resource: $('#adjRes').value, delta });
  toast(res.text, res.ok);
});

// ---- mensajes
$('#msgTarget').innerHTML = `<option value="">📢 Todos los equipos</option>` + GAME.teams.map(t => `<option value="${t.id}">Solo ${esc(t.name)}</option>`).join('');
document.querySelectorAll('[data-quick]').forEach(b => b.onclick = () => { $('#msgText').value = b.dataset.quick; });
$('#msgForm').addEventListener('submit', async e => {
  e.preventDefault();
  const text = $('#msgText').value.trim();
  if (!text) return;
  const teamId = $('#msgTarget').value || null;
  const res = await client.send('message', { text, ...(teamId ? { teamId } : {}) });
  toast(res.text, res.ok);
  if (res.ok) $('#msgText').value = '';
});

// ---- reinicio
$('#resetBtn').onclick = async () => {
  const v = prompt('Esto reinicia TODA la partida. Escribí REINICIAR para confirmar.');
  if (v !== 'REINICIAR') return;
  await client.send('reset');
  await client.send('game_state', { status: 'lobby' });
  toast('Partida reiniciada');
};

// ---- GPS para anclar estaciones
let watchId = null;
const readings = [];
$('#gpsBtn').onclick = () => {
  if (watchId != null) {
    navigator.geolocation.clearWatch(watchId); watchId = null; fix = null; readings.length = 0;
    $('#gpsBtn').textContent = '📍 Activar mi GPS para anclar'; $('#gpsInfo').textContent = 'GPS apagado.'; render(); return;
  }
  if (!('geolocation' in navigator)) return toast('Este dispositivo no tiene GPS en el navegador', false);
  $('#gpsBtn').textContent = '⏹ Apagar GPS';
  $('#gpsInfo').textContent = 'Buscando señal…';
  watchId = navigator.geolocation.watchPosition(p => {
    const now = Date.now();
    readings.push({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy, ts: now });
    while (readings.length && now - readings[0].ts > 20000) readings.shift();
    // Promedio ponderado por precisión de los últimos 20 s: más estable que una sola lectura
    const w = readings.map(r => 1 / Math.max(r.acc, 1) ** 2), W = w.reduce((a, b) => a + b, 0);
    fix = {
      lat: readings.reduce((a, r, i) => a + r.lat * w[i], 0) / W,
      lng: readings.reduce((a, r, i) => a + r.lng * w[i], 0) / W,
      acc: Math.min(...readings.map(r => r.acc)),
    };
    $('#gpsInfo').textContent = `Precisión ±${Math.round(fix.acc)} m · ${readings.length} lecturas (promedio de 20 s). ${fix.acc > 15 ? 'Esperá quieto un momento…' : '¡Lista para anclar!'}`;
    render();
  }, err => { $('#gpsInfo').textContent = 'Error GPS: ' + err.message; }, { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 });
};

// ---- eventos especiales
$('#spStation').innerHTML = GAME.stations.map(st => `<option value="${st.id}">${resById[st.resource].icon} ${esc(st.name)}${st.lugar ? ' — ' + esc(st.lugar) : ''}</option>`).join('');
document.querySelectorAll('[data-sp]').forEach(b => b.onclick = async () => {
  const kind = b.dataset.sp, minutes = Number($('#spMin').value);
  const d = SPECIALS[kind];
  const extra = kind === 'suministros' ? { stationId: $('#spStation').value } : {};
  if (!confirm(`¿Activar ${d.icon} ${d.name} por ${minutes} minutos?\n${d.desc}`)) return;
  const res = await client.send('special', { kind, minutes, ...extra });
  toast(res.text, res.ok);
});
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-spend]');
  if (!b) return;
  const res = await client.send('special_end', { specialId: b.dataset.spend });
  toast(res.text, res.ok);
});
document.querySelectorAll('[data-cd]').forEach(b => b.onclick = async () => {
  const minutes = Number(b.dataset.cd);
  if (minutes && !confirm(`¿Empezar la cuenta regresiva final de ${minutes} minutos? Al llegar a cero el juego termina solo.`)) return;
  const res = await client.send('countdown', { minutes });
  toast(res.text, res.ok);
});

setInterval(render, 1000); // refresca inmunidades y relojes

pinGate([GAME.adminPinHash], 'admin', async () => {
  client = await startClient({ onState: s => { state = s; render(); }, onStatus: st => { $('#net').textContent = netText(st); } });
});
