// Pantalla de la Fogata: ranking en vivo para proyector/TV, con anuncios grandes.
// Solo lee datos: nunca escribe en la partida. No muestra nombres de estaciones
// (para no regalar ubicaciones a los equipos que están en el Refugio).
import { GAME } from './config.js';
import { RES, teamById, stationById, total, fmtSec, STATUS_TEXT, SPECIALS, activeSpecials, effectiveStatus, lugarCorto, missionById, rewardText } from './engine.js';
import { startClient, serverNow } from './backend.js';
import { $, esc, netText, registerSW } from './ui.js';

const rules = GAME.rules;
const goalTotal = RES.reduce((a, r) => a + (rules.faroGoal[r.id] || 0), 0);
let state = null;
registerSW();

$('#brandLine').textContent = [GAME.brand?.name, GAME.brand?.tagline].filter(Boolean).join(' · ');

// ---------------------------------------------------------------- columnas (se crean una vez)
const FLAME = `<svg class="flame" viewBox="0 0 100 120" aria-hidden="true">
  <ellipse cx="50" cy="112" rx="34" ry="6" fill="#1a2330"/>
  <path d="M30 110 L70 98 M30 98 L70 110" stroke="#5a3a22" stroke-width="7" stroke-linecap="round"/>
  <g class="fire" style="transform-origin:50% 100%">
    <path fill="url(#fg)" d="M50 6 C58 26 76 38 76 66 C76 88 64 104 50 104 C36 104 24 88 24 66 C24 50 34 42 38 30 C42 44 46 48 50 50 C48 36 46 22 50 6 Z"/>
    <path fill="#fff3c4" opacity=".75" d="M50 56 C56 66 62 72 62 84 C62 96 56 102 50 102 C44 102 38 96 38 86 C38 76 46 70 50 56 Z"/>
  </g></svg>`;

const cols = {};
$('#teams').innerHTML = GAME.teams.map(t => `
  <section class="tcol" id="col-${t.id}" style="--c:${t.color}">
    <div class="pos"></div>
    <div class="tname">${esc(t.name.toUpperCase())}</div>
    ${FLAME}
    <div class="pct"></div>
    <div class="res-list">${RES.map(r => `<div class="bank-row" data-r="${r.id}"><span>${r.icon}</span><div class="bar"><i></i></div><span class="ct"></span></div>`).join('')}</div>
    <div class="foot"><div class="score">0<small>pts</small></div><div class="stats"></div></div>
  </section>`).join('');
for (const t of GAME.teams) {
  const el = $('#col-' + t.id);
  cols[t.id] = { el, pos: el.querySelector('.pos'), fire: el.querySelector('.fire'), pct: el.querySelector('.pct'), score: el.querySelector('.score'), stats: el.querySelector('.stats'),
    rows: Object.fromEntries(RES.map(r => [r.id, el.querySelector(`[data-r="${r.id}"]`)])) };
}

function render() {
  if (!state) return;
  renderLive();

  const posOf = Object.fromEntries(state.ranking.map((r, i) => [r.teamId, i]));
  for (const t of GAME.teams) {
    const ts = state.teams[t.id], c = cols[t.id];
    let have = 0;
    for (const r of RES) {
      const goal = rules.faroGoal[r.id] || 0, n = ts.bank[r.id];
      have += Math.min(n, goal);
      const row = c.rows[r.id];
      row.classList.toggle('done', n >= goal);
      row.querySelector('i').style.width = (goal ? Math.min(100, n / goal * 100) : 100) + '%';
      row.querySelector('.ct').innerHTML = `<b>${n}</b>/${goal}`;
    }
    const p = goalTotal ? have / goalTotal : 0, lit = ts.faroPos != null;
    c.fire.style.transform = `scale(${(.35 + p * .65).toFixed(3)})`;
    c.fire.style.filter = lit ? 'drop-shadow(0 0 18px #ffb238) drop-shadow(0 0 40px #ff6a1f)' : `drop-shadow(0 0 ${Math.round(p * 14)}px #ff9a2f)`;
    c.el.classList.toggle('lit', lit);
    c.pct.textContent = lit ? `🔥 FARO ${ts.faroPos + 1}°` : Math.round(p * 100) + '%';
    const pos = posOf[t.id];
    c.pos.textContent = (pos + 1) + '°';
    c.pos.classList.toggle('first', pos === 0 && state.ranking[0].score > 0);
    c.score.innerHTML = `${ts.score}<small>pts</small>`;
    c.stats.innerHTML = `🎒 ${total(ts.carry)} en camino<br>🔦 ${ts.captures} ${ts.captures === 1 ? 'captura' : 'capturas'}`;
  }

  // Ticker: últimos eventos, sin nombres de estaciones
  $('#ticker').innerHTML = state.feed.map(tickerText).filter(Boolean).slice(0, 8).map(x => `<span>${x}</span>`).join('')
    || '<span>El Refugio espera noticias…</span>';
  $('#elapsed').textContent = elapsedText();
}

// Estado, eventos activos y cuenta regresiva (cada segundo)
function renderLive() {
  const now = serverNow(), status = effectiveStatus(state, now);
  const sb = $('#statusBanner');
  sb.textContent = STATUS_TEXT[status].replace(/^🔴 /, '');
  sb.className = 'status-banner ' + status;
  $('#specials').innerHTML = activeSpecials(state, now).map(x => {
    const st = x.stationId && stationById[x.stationId];
    return `<span class="chip ${x.kind}">${SPECIALS[x.kind].icon} ${SPECIALS[x.kind].name}${st ? ': ' + esc(lugarCorto(st)) : ''} · ${fmtSec((x.endTs - now) / 1000)}</span>`;
  }).join('');
  const left = state.endsAt ? (state.endsAt - now) / 1000 : null;
  $('#elapsed').innerHTML = (status === 'running' && left != null && left > 0)
    ? `<span class="cd${left <= 60 ? ' hot' : ''}">⏰ quedan ${fmtSec(left)}</span>` : elapsedText();
}

const tn = id => { const t = teamById[id]; return t ? `<b style="color:${t.color}">${esc(t.name)}</b>` : '¿?'; };
const resTxt = o => RES.filter(r => o?.[r.id]).map(r => `${o[r.id]}${r.icon}`).join(' ');
function tickerText(f) {
  switch (f.kind) {
    case 'scan': { const r = RES.find(x => x.id === f.resource); return `${tn(f.teamId)} consiguió +${f.amount} ${r?.icon || ''}`; }
    case 'deposit': return f.faroPos != null ? `🔥 ${tn(f.teamId)} encendió el Faro (${f.faroPos + 1}°)` : `🏠 ${tn(f.teamId)} aseguró ${resTxt(f.items)}`;
    case 'capture': return `🔦 Las Sombras iluminaron a ${tn(f.teamId)}${total(f.lost || {}) ? ` (−${total(f.lost)})` : ''}`;
    case 'message': return f.toTeam ? '' : `📢 ${esc(f.msg)}`;
    case 'special': { const d = SPECIALS[f.special]; const st = f.stationId && stationById[f.stationId]; return d ? `${d.icon} ${d.name}${st ? ' en ' + esc(lugarCorto(st)) : ''}` : ''; }
    case 'chest': return { refugio: `🎁 ${tn(f.teamId)} abrió un cofre: +${f.amount} ${RES.find(r => r.id === f.resource)?.icon || ''}`, puntos: `⭐ ${tn(f.teamId)} encontró un tesoro (+${f.amount} pts)`, escudo: `🛡 ${tn(f.teamId)} consiguió un escudo`, mapa: `📜 ${tn(f.teamId)} encontró un mapa del tesoro`, trampa: `💥 ${tn(f.teamId)} cayó en una trampa` }[f.effect] || '';
    case 'mission': { const m = missionById[f.missionId]; return m ? `💪 ${tn(f.teamId)} superó "${esc(m.name)}" (${esc(rewardText(m.reward))})` : ''; }
    case 'countdown': return f.minutes ? `⏰ ¡Quedan ${f.minutes} minutos!` : '';
    case 'state': return { running: '▶ El Apagón está en marcha', paused: '⏸ Pausa', ended: '🏁 Fin del juego', lobby: '⏳ En espera' }[f.status];
    default: return '';
  }
}

// Tiempo de juego acumulado (sumando los tramos "en juego")
function elapsedText() {
  const st = state.feed.filter(f => f.kind === 'state').slice().reverse();
  let ms = 0, from = null;
  for (const f of st) {
    if (f.status === 'running') { if (from == null) from = f.ts; }
    else if (from != null) { ms += f.ts - from; from = null; }
  }
  if (from != null) ms += serverNow() - from;
  if (!ms) return '';
  const m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60;
  return `⏱ ${m}:${String(s).padStart(2, '0')} de juego`;
}

setInterval(() => {
  $('#clock').textContent = new Date().toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (state) renderLive();
}, 1000);

// ---------------------------------------------------------------- anuncios grandes
const seen = new Set();
let first = true;
const queue = [];
let showing = false;

function collectAnnouncements() {
  const fresh = state.feed.filter(f => !seen.has(f.id));
  fresh.forEach(f => seen.add(f.id));
  // En la primera carga (o si llegan eventos viejos sincronizando) no se anuncia nada.
  if (first) { first = false; return; }
  const recent = fresh.filter(f => serverNow() - f.ts < 120000).reverse(); // del más viejo al más nuevo
  for (const f of recent) {
    const t = teamById[f.teamId];
    if (f.kind === 'capture') {
      queue.push({ cls: 'capture', ic: '🔦', t1: `¡${t.name.toUpperCase()} FUE ILUMINADO!`, t2: total(f.lost || {}) ? `Pierde ${resTxt(f.lost)} de la mochila` : 'Tenía la mochila vacía: no pierde nada', sound: 'capture', shake: f.teamId });
    } else if ((f.kind === 'deposit' || f.kind === 'adjust') && f.faroPos != null) {
      queue.push({ cls: 'faro', ic: '🔥', t1: `¡${t.name.toUpperCase()} ENCENDIÓ EL FARO!`, t2: `${f.faroPos + 1}° equipo en pedir rescate · +${rules.faroBonus[f.faroPos] || 0} pts`, sound: 'faro' });
    } else if (f.kind === 'message' && !f.toTeam) {
      queue.push({ cls: 'msg', ic: '📢', t1: esc(f.msg), t2: '', sound: 'msg', raw: true });
    } else if (f.kind === 'special' && SPECIALS[f.special]) {
      const d = SPECIALS[f.special], st = f.stationId && stationById[f.stationId];
      queue.push({ cls: f.special === 'eclipse' ? 'capture' : f.special === 'suministros' ? 'faro' : 'special', ic: d.icon, t1: '¡' + d.name.toUpperCase() + '!',
        t2: (st ? `${lugarCorto(st)} da el DOBLE de recursos` : d.desc) + ` · ${f.minutes} min`, sound: f.special === 'eclipse' ? 'capture' : 'msg' });
    } else if (f.kind === 'chest') {
      const n = t.name.toUpperCase();
      const a = {
        refugio: { cls: 'faro', ic: '🎁', t1: `¡${n} ABRIÓ UN COFRE!`, t2: `Envío de emergencia: +${f.amount} ${RES.find(r => r.id === f.resource)?.icon || ''} directo al Refugio`, sound: 'faro' },
        puntos:  { cls: 'faro', ic: '⭐', t1: `¡${n} ENCONTRÓ UN TESORO!`, t2: `+${f.amount} puntos`, sound: 'faro' },
        escudo:  { cls: 'special', ic: '🛡', t1: `¡${n} TIENE ESCUDO!`, t2: `Las Sombras no los pueden atrapar por ${f.amount} minutos`, sound: 'msg' },
        mapa:    { cls: 'special', ic: '📜', t1: `¡${n} ENCONTRÓ UN MAPA!`, t2: 'Ahora saben dónde hay una estación secreta…', sound: 'msg' },
        trampa:  { cls: 'capture', ic: '💥', t1: `¡${n} CAYÓ EN UNA TRAMPA!`, t2: f.lost && total(f.lost) ? `Pierde ${resTxt(f.lost)} de la mochila` : 'Por suerte tenía la mochila vacía', sound: 'capture', shake: f.teamId },
      }[f.effect];
      if (a) queue.push(a);
      if (f.faroPos != null) queue.push({ cls: 'faro', ic: '🔥', t1: `¡${n} ENCENDIÓ EL FARO!`, t2: `${f.faroPos + 1}° equipo en pedir rescate · +${rules.faroBonus[f.faroPos] || 0} pts`, sound: 'faro' });
    } else if (f.kind === 'mission') {
      const m = missionById[f.missionId];
      if (m) queue.push({ cls: 'faro', ic: m.icon, t1: `¡${t.name.toUpperCase()} SUPERÓ LA MISIÓN!`, t2: `"${m.name}" · ${rewardText(m.reward)}`, sound: 'faro' });
      if (f.faroPos != null) queue.push({ cls: 'faro', ic: '🔥', t1: `¡${t.name.toUpperCase()} ENCENDIÓ EL FARO!`, t2: `${f.faroPos + 1}° equipo en pedir rescate · +${rules.faroBonus[f.faroPos] || 0} pts`, sound: 'faro' });
    } else if (f.kind === 'countdown' && f.minutes > 0) {
      queue.push({ cls: 'faro', ic: '⏰', t1: `¡QUEDAN ${f.minutes} MINUTOS!`, t2: 'Lo que no esté en el Refugio cuando llegue a cero, se pierde', sound: 'faro' });
    } else if (f.kind === 'state' && (f.status === 'running' || f.status === 'ended')) {
      queue.push(f.status === 'running'
        ? { cls: 'faro', ic: '🌑', t1: '¡COMIENZA EL APAGÓN!', t2: 'Junten recursos y vuelvan a la Fogata', sound: 'faro' }
        : { cls: 'msg', ic: '🏁', t1: 'FIN DEL JUEGO', t2: 'Todos los equipos a la Fogata', sound: 'msg' });
    }
  }
  if (!showing) nextAnnouncement();
}

function nextAnnouncement() {
  const a = queue.shift();
  document.querySelector('.announce')?.remove();
  if (!a) { showing = false; return; }
  showing = true;
  if (a.shake) { const el = cols[a.shake].el; el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); }
  const ov = document.createElement('div');
  ov.className = 'announce ' + a.cls;
  ov.innerHTML = `<div class="box"><div class="ic">${a.ic}</div><div class="t1">${a.raw ? a.t1 : esc(a.t1)}</div><div class="t2">${esc(a.t2)}</div></div>`;
  document.body.append(ov);
  play(a.sound);
  setTimeout(nextAnnouncement, a.cls === 'msg' ? 7000 : 5500);
}

// ---------------------------------------------------------------- sonido (requiere un clic para activarse)
let audio = null;
$('#soundBtn').onclick = () => {
  if (audio) { audio.close(); audio = null; $('#soundBtn').textContent = '🔇 Activar sonido'; return; }
  audio = new (window.AudioContext || window.webkitAudioContext)();
  $('#soundBtn').textContent = '🔊 Sonido activado';
  play('msg');
};
function tone(freq, start, dur, type = 'sine', vol = .3) {
  const o = audio.createOscillator(), g = audio.createGain(), t0 = audio.currentTime + start;
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + .02); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
  o.connect(g).connect(audio.destination); o.start(t0); o.stop(t0 + dur + .05);
}
function play(kind) {
  if (!audio) return;
  if (kind === 'capture') { tone(220, 0, .35, 'sawtooth', .25); tone(165, .35, .5, 'sawtooth', .25); }
  if (kind === 'faro') [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .14, .5, 'triangle', .3));
  if (kind === 'msg') { tone(880, 0, .25); tone(1175, .18, .4); }
}

// ---------------------------------------------------------------- pantalla completa, mantener encendida, ocultar controles
$('#fsBtn').onclick = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {});
let wake = null;
async function keepAwake() { try { wake = await navigator.wakeLock?.request('screen'); } catch {} }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') keepAwake(); });
keepAwake();
let idleT;
const wakeUi = () => { document.body.classList.remove('idle'); clearTimeout(idleT); idleT = setTimeout(() => document.body.classList.add('idle'), 4000); };
['mousemove', 'touchstart', 'keydown'].forEach(ev => document.addEventListener(ev, wakeUi));
wakeUi();

startClient({
  onState: s => { state = s; render(); collectAnnouncements(); },
  onStatus: st => { $('#net').textContent = netText(st); },
});
