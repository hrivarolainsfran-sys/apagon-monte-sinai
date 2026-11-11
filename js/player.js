import { GAME } from './config.js';
import { RES, teamById, stationById, resById, findByCode, total, fmtRes, fmtSec, distM, cooldownMs, STATUS_TEXT, SPECIALS, activeSpecials, effectiveStatus, isActive, specialText, lugarCorto } from './engine.js';
import { startClient, serverNow } from './backend.js';
import { openScanner, closeScanner, isScannerOpen } from './scanner.js';
import { $, esc, ls, vibrate, netText, brandHeader, registerSW } from './ui.js';

const rules = GAME.rules;
let client = null;
let state = null;
let teamId = ls.get('team');
if (teamId && !teamById[teamId]) teamId = null;

$('#brand').innerHTML = brandHeader();
registerSW();

// ---------------------------------------------------------------- render
function render() {
  const joined = !!teamId;
  $('#join').classList.toggle('hidden', joined);
  $('#game').classList.toggle('hidden', !joined);
  $('#bottomBar').classList.toggle('hidden', !joined);
  if (!joined || !state) { $('#teamChip').textContent = ''; document.documentElement.style.removeProperty('--team'); return; }

  const t = teamById[teamId], ts = state.teams[teamId];
  document.documentElement.style.setProperty('--team', t.color);
  $('#teamChip').textContent = 'EQUIPO ' + t.name.toUpperCase();

  renderLive();

  // Mochila: un casillero por lugar disponible
  const load = total(ts.carry);
  $('#carryCount').textContent = `${load} / ${rules.backpackMax}`;
  const items = RES.flatMap(r => Array(ts.carry[r.id]).fill(r.icon));
  const slots = Array.from({ length: rules.backpackMax }, (_, i) => items[i]
    ? `<div class="slot full">${items[i]}</div>` : `<div class="slot"></div>`);
  const prevLoad = render.prevLoad ?? load;
  $('#carry').innerHTML = slots.join('');
  // sólo animar los casilleros nuevos
  [...$('#carry').children].forEach((el, i) => { if (i < prevLoad) el.style.animation = 'none'; });
  render.prevLoad = load;
  $('#carryLegend').innerHTML = RES.map(r => `<span>${r.icon} ${esc(r.name)}</span>`).join('');

  // Refugio / Faro
  let have = 0, need = 0;
  $('#bank').innerHTML = RES.map(r => {
    const goal = rules.faroGoal[r.id] || 0, n = ts.bank[r.id];
    have += Math.min(n, goal); need += goal;
    const pct = goal ? Math.min(100, Math.round(n / goal * 100)) : 100;
    return `<div class="bank-row${n >= goal ? ' done' : ''}"><span>${r.icon}</span><div class="bar"><i style="width:${pct}%"></i></div><span class="ct"><b>${n}</b>/${goal}</span></div>`;
  }).join('');
  const p = need ? have / need : 0;
  $('#flame').style.setProperty('--p', p.toFixed(3));
  $('#flame').classList.toggle('lit', ts.faroPos != null);
  $('#faroPct').textContent = ts.faroPos != null ? '¡ENCENDIDO!' : Math.round(p * 100) + '%';
  $('#faro').innerHTML = ts.faroPos != null
    ? `<b>${ts.faroPos + 1}° equipo en encender el Faro.</b> Sigan juntando recursos: cada uno suma puntos.`
    : `Completen <b>${Object.values(rules.faroGoal)[0]} de cada recurso</b> en el Refugio para encender el Faro y pedir rescate.`;

  // Posiciones con barra relativa
  const max = Math.max(1, ...state.ranking.map(r => r.score));
  $('#ranking').innerHTML = state.ranking.map((rk, i) => {
    const tt = teamById[rk.teamId], me = rk.teamId === teamId;
    const faro = state.teams[rk.teamId].faroPos != null ? ' 🔥' : '';
    return `<div class="rank-row${me ? ' me' : ''}"><span class="pos">${i + 1}</span>
      <div class="nm"><span><span class="dot" style="background:${tt.color};color:${tt.color}"></span>${esc(tt.name)}${faro}</span>
      <div class="meter"><i style="width:${Math.round(rk.score / max * 100)}%;background:${tt.color}"></i></div></div>
      <span class="pts">${rk.score}</span></div>`;
  }).join('');

  updateRadar();
}

// Estado del juego, cuenta regresiva y eventos activos (se refresca cada segundo)
function renderLive() {
  if (!state || !teamId) return;
  const now = serverNow(), status = effectiveStatus(state, now);
  const sb = $('#statusBanner');
  sb.textContent = STATUS_TEXT[status].replace(/^🔴 /, '');
  sb.className = 'status-banner ' + status;
  const chips = activeSpecials(state, now).map(x => {
    const d = SPECIALS[x.kind], left = fmtSec((x.endTs - now) / 1000);
    const extra = x.kind === 'suministros' ? ': ' + esc(lugarCorto(stationById[x.stationId])) + ' x2' : '';
    return `<span class="chip ${x.kind}">${d.icon} ${esc(d.name)}${extra} · ${left}</span>`;
  });
  const shield = state.teams[teamId].shieldUntil - now;
  if (shield > 0) chips.unshift(`<span class="chip suministros">🛡 Escudo · ${fmtSec(shield / 1000)}</span>`);
  if (status === 'running' && state.endsAt) chips.unshift(`<span class="chip timer">⏰ Quedan ${fmtSec((state.endsAt - now) / 1000)}</span>`);
  $('#specials').innerHTML = chips.join('');
}
setInterval(renderLive, 1000);

function setNet(st) { $('#net').textContent = netText(st); }

// ---------------------------------------------------------------- unirse
function tryJoin(raw) {
  const f = findByCode(raw);
  if (!f || f.kind !== 'team') { $('#joinMsg').textContent = 'Ese no es un código de equipo. Pedile la tarjeta a tu monitor.'; vibrate([80, 60, 80]); return; }
  teamId = f.item.id; ls.set('team', teamId);
  // No mostrar mensajes viejos al entrar
  ls.set('seenMsg', String(Date.now()));
  ls.set('seenCapture', String(Date.now()));
  ls.set('seenSpecial', String(serverNow()));
  vibrate(120);
  render();
}
$('#joinScan').onclick = () => openScanner({ title: 'Tarjeta de equipo', onCode: tryJoin });
$('#joinForm').addEventListener('submit', e => { e.preventDefault(); tryJoin($('#joinCode').value); });
$('#leaveBtn').onclick = () => {
  if (!confirm('¿Salir de este equipo? Los recursos quedan guardados en el equipo.')) return;
  teamId = null; ls.del('team'); render();
};

// ---------------------------------------------------------------- escanear
function showResult(res) {
  $('#result').classList.toggle('bad', !res.ok);
  $('#result').classList.toggle('ok', !!res.ok);
  $('#resultIcon').textContent = res.ok ? (res.pending ? '📶' : '✅') : '✖';
  $('#resultText').textContent = res.text;
  $('#result').classList.remove('hidden');
  vibrate(res.ok ? [60, 40, 120] : [250, 80, 250]);
  clearTimeout(showResult.t);
  showResult.t = setTimeout(() => $('#result').classList.add('hidden'), 4500);
}
$('#resultOk').onclick = () => $('#result').classList.add('hidden');

async function handleCode(raw) {
  const f = findByCode(raw);
  if (!f) return showResult({ ok: false, text: 'Código desconocido. ¿Lo escanearon bien?' });
  if (f.kind === 'team') return showResult({ ok: false, text: f.item.id === teamId ? 'Esa es SU tarjeta de equipo. Cuídenla: las Sombras la buscan.' : `Esa es la tarjeta de ${f.item.name}. Solo las Sombras pueden usarla.` });
  const status = effectiveStatus(state, serverNow());
  if (status !== 'running') return showResult({ ok: false, text: state.endsAt && status === 'ended' ? '¡Se acabó el tiempo! Vuelvan a la Fogata.' : STATUS_TEXT[status] });
  if (f.kind === 'chest') {
    const res = await client.send('open_chest', { teamId, chestId: f.item.id });
    if (!res.ok || res.pending) return showResult(res);
    const icon = { refugio: '🎁', puntos: '⭐', escudo: '🛡', mapa: '📜', trampa: '💥' }[res.chest] || '🎁';
    const title = res.chest === 'trampa' ? '¡EMBOSCADA!' : '¡COFRE ABIERTO!';
    pushAlert(icon, title, res.text.replace(/^\S+\s/, ''));
    return;
  }
  const res = f.kind === 'station'
    ? await client.send('scan_station', { teamId, stationId: f.item.id })
    : await client.send('deposit', { teamId });
  showResult(res);
}
$('#scanBtn').onclick = () => {
  if (isLocked()) return;
  openScanner({ title: 'Escaneá una estación o el Refugio', onCode: handleCode });
};

// ---------------------------------------------------------------- SOS
$('#sosCall').textContent = `📞 Llamar a ${GAME.coordinator.name}: ${GAME.coordinator.phone}`;
$('#sosCall').href = 'tel:' + GAME.coordinator.phone.replace(/[^\d+]/g, '');
$('#sosBtn').onclick = () => $('#sos').classList.remove('hidden');
$('#sosClose').onclick = () => $('#sos').classList.add('hidden');

// ---------------------------------------------------------------- avisos (mensajes y capturas)
const alertQueue = [];
function pushAlert(icon, title, text) {
  alertQueue.push({ icon, title, text });
  if ($('#alert').classList.contains('hidden')) nextAlert();
}
function nextAlert() {
  const a = alertQueue.shift();
  if (!a) { $('#alert').classList.add('hidden'); return; }
  $('#alertIcon').textContent = a.icon; $('#alertTitle').textContent = a.title; $('#alertText').textContent = a.text;
  $('#alert').classList.remove('hidden');
  vibrate([200, 100, 200, 100, 400]);
}
$('#alertOk').onclick = nextAlert;

function checkNotifications() {
  if (!teamId || !state) return;
  const seenMsg = +ls.get('seenMsg') || 0;
  const fresh = state.messages.filter(m => m.ts > seenMsg && (!m.teamId || m.teamId === teamId));
  if (fresh.length) {
    ls.set('seenMsg', String(Math.max(...fresh.map(m => m.ts))));
    fresh.forEach(m => pushAlert('📢', m.teamId ? 'MENSAJE PARA SU EQUIPO' : 'TRANSMISIÓN', m.text));
  }
  // Eventos especiales y cuenta regresiva
  if (ls.get('seenSpecial') == null) ls.set('seenSpecial', String(serverNow()));
  const seenSp = +ls.get('seenSpecial');
  const sp = state.feed.filter(f => (f.kind === 'special' || (f.kind === 'countdown' && f.minutes > 0)) && f.ts > seenSp).reverse();
  if (sp.length) {
    ls.set('seenSpecial', String(Math.max(...sp.map(f => f.ts))));
    for (const f of sp) {
      if (f.kind === 'countdown') { pushAlert('⏰', 'CUENTA REGRESIVA', `¡Quedan ${f.minutes} minutos! Cuando llegue a cero, lo que no esté en el Refugio se pierde.`); continue; }
      const d = SPECIALS[f.special], x = state.specials.find(y => y.id === f.specialId);
      pushAlert(d.icon, d.name.toUpperCase(), (x ? specialText(x).replace(/^\S+ [^:]+: /, '') : d.desc).replace(/([^.!])$/, '$1.') + ` Dura ${f.minutes} minutos.`);
    }
  }

  const ts = state.teams[teamId];
  const seenCap = +ls.get('seenCapture') || 0;
  if (ts.lastCaptureTs > seenCap) {
    ls.set('seenCapture', String(ts.lastCaptureTs));
    const lost = ts.lastCaptureLost && total(ts.lastCaptureLost) ? `Perdieron ${fmtRes(ts.lastCaptureLost)}.` : 'La mochila estaba vacía: no perdieron nada.';
    pushAlert('🔦', '¡LOS ILUMINARON!', `${ts.lastCaptureBy} los atrapó. ${lost} Tienen ${Math.round(rules.captureImmunitySec / 60)} min de inmunidad.`);
  }
}

// ---------------------------------------------------------------- interferencia (pantalla encendida mucho tiempo)
let visibleSince = document.visibilityState === 'visible' ? Date.now() : null;
document.addEventListener('visibilitychange', () => {
  visibleSince = document.visibilityState === 'visible' ? Math.max(Date.now(), +ls.get('lockUntil') || 0) : null;
});
const isLocked = () => Date.now() < (+ls.get('lockUntil') || 0);

setInterval(() => {
  const now = Date.now(), lockUntil = +ls.get('lockUntil') || 0;
  const meter = $('#screenMeter');
  if (now < lockUntil) {
    $('#lock').classList.remove('hidden');
    $('#lockCount').textContent = Math.ceil((lockUntil - now) / 1000);
    meter.textContent = '';
    return;
  }
  $('#lock').classList.add('hidden');
  const limit = rules.interferenceSec;
  if (!limit || !state || effectiveStatus(state, serverNow()) !== 'running' || !teamId || !visibleSince) { meter.textContent = ''; return; }
  const secs = Math.max(0, (now - visibleSince) / 1000);
  const left = Math.ceil(limit - secs);
  meter.innerHTML = `<span>📱 Pantalla</span><span class="track"><i style="width:${Math.max(0, Math.min(100, left / limit * 100))}%"></i></span><span>${left}s</span>`;
  meter.classList.toggle('warn', left <= 10);
  if (left === 10 || left === 5) vibrate(60);
  if (secs >= limit) {
    const until = now + rules.interferenceLockSec * 1000;
    ls.set('lockUntil', String(until));
    visibleSince = until;
    closeScanner();
    vibrate([400, 100, 400]);
  }
}, 500);

// ---------------------------------------------------------------- radar GPS
let watchId = null, fix = null, level = 0;
function radarToggle() {
  if (watchId != null) {
    navigator.geolocation.clearWatch(watchId); watchId = null; fix = null; level = 0;
    $('#radarBtn').textContent = 'Encender radar'; $('#radar').dataset.on = '0';
    $('#radarLabel').textContent = 'APAGADO'; $('#radarLabel').className = 'radar-label';
    paintRings(0);
    return;
  }
  if (!('geolocation' in navigator)) { $('#radarInfo').textContent = 'Este celular no tiene GPS disponible en el navegador.'; return; }
  unlockAudio();
  $('#radarBtn').textContent = 'Apagar radar'; $('#radar').dataset.on = '1';
  $('#radarLabel').textContent = 'BUSCANDO…'; $('#radarLabel').className = 'radar-label';
  watchId = navigator.geolocation.watchPosition(
    p => { fix = { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy, ts: Date.now() }; updateRadar(); },
    err => { $('#radarInfo').textContent = err.code === 1 ? 'Permiso de ubicación denegado. Activalo en el navegador para usar el radar.' : 'Sin señal GPS todavía… salgan de debajo de los árboles un momento.'; },
    { enableHighAccuracy: true, maximumAge: 3000, timeout: 25000 }
  );
}
$('#radarBtn').onclick = radarToggle;
const sonarSel = $('#sonarMode');
sonarSel.value = ls.get('sonar') || 'vib';
sonarSel.onchange = () => { ls.set('sonar', sonarSel.value); unlockAudio(); };

function paintRings(n) { $('#radar').dataset.level = String(n); }

function updateRadar() {
  if (watchId == null || !fix || !state || !teamId) return;
  const now = serverNow();
  if (isActive(state, 'tormenta', now)) {
    level = 0; paintRings(0); $('#radarLabel').textContent = '⛈ TORMENTA';
    $('#radarInfo').textContent = 'La tormenta bloquea el radar. Busquen las estaciones a ojo hasta que pase.';
    return;
  }
  const cands = GAME.stations.filter(def => {
    const st = state.stations[def.id];
    if (def.radar === false || st.lat == null || st.usesLeft <= 0) return false;
    const last = st.lastByTeam[teamId];
    return !(last != null && now - last < cooldownMs(def));
  });
  const lbl = $('#radarLabel');
  if (!cands.length) {
    level = 0; lbl.textContent = 'SIN SEÑALES'; lbl.className = 'radar-label l1'; paintRings(0);
    $('#radarInfo').textContent = 'No hay estaciones detectables ahora. Las secretas no aparecen en el radar: búsquenlas con linterna.';
    return;
  }
  let best = null;
  for (const def of cands) {
    const st = state.stations[def.id];
    const d = distM(fix.lat, fix.lng, st.lat, st.lng);
    if (!best || d < best.d) best = { def, d };
  }
  const band = rules.radarBands.find(b => best.d <= b.max) || rules.radarBands[rules.radarBands.length - 1];
  level = band.level;
  lbl.textContent = band.label; lbl.className = 'radar-label l' + band.level; paintRings(band.level);
  const r = resById[best.def.resource];
  const hint = band.level >= 3 ? `Se detecta ${r.icon} ${r.name} cerca. ` : '';
  const acc = Math.round(fix.acc);
  $('#radarInfo').textContent = `${hint}GPS ±${acc} m${acc > 35 ? ' · señal débil: quédense quietos unos segundos' : ''}`;
}

// Sonar: pitido o vibración más rápido cuanto más cerca
let audioCtx = null;
function unlockAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch {}
}
function beep(freq) {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.frequency.value = freq; o.type = 'sine';
  g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12);
  o.connect(g).connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.13);
}
const PERIOD = { 1: 0, 2: 2600, 3: 1300, 4: 550 };
let lastPing = 0;
setInterval(() => {
  if (watchId == null || !level || document.visibilityState !== 'visible' || isLocked() || state?.status !== 'running') return;
  const per = PERIOD[level]; if (!per) return;
  const now = Date.now(); if (now - lastPing < per) return;
  lastPing = now;
  const mode = sonarSel.value;
  if (mode === 'vib') vibrate(level >= 4 ? 90 : 50);
  if (mode === 'sound') beep(level >= 4 ? 1320 : level === 3 ? 990 : 660);
}, 100);
// Revisar enfriamientos que vencen aunque no haya eventos nuevos
setInterval(updateRadar, 5000);

// ---------------------------------------------------------------- inicio
render();
client = await startClient({
  onState: s => { state = s; render(); checkNotifications(); },
  onStatus: setNet,
});
