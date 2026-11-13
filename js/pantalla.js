// Pantalla de la Fogata: ranking en vivo para proyector/TV, con anuncios grandes.
// Solo lee datos: nunca escribe en la partida. No muestra nombres de estaciones
// (para no regalar ubicaciones a los equipos que están en el Refugio).
import { GAME } from './config.js';
import { RES, teamById, stationById, total, fmtSec, STATUS_TEXT, SPECIALS, activeSpecials, effectiveStatus, lugarCorto, missionById, rewardText } from './engine.js';
import { startClient, serverNow } from './backend.js';
import { $, esc, netText, registerSW, speak, stopSpeaking, canSpeak } from './ui.js';

const rules = GAME.rules;
const goalTotal = RES.reduce((a, r) => a + (rules.faroGoal[r.id] || 0), 0);
let state = null;
registerSW();

$('#brandLine').textContent = [GAME.brand?.name, GAME.brand?.tagline].filter(Boolean).join(' · ');

// ---------------------------------------------------------------- columnas (se crean una vez)
const FLAME = id => `<svg class="flame" viewBox="0 0 180 220" aria-hidden="true">
  <defs>
    <radialGradient id="glow-${id}"><stop stop-color="#ff9d24" stop-opacity=".5"/><stop offset="1" stop-color="#ff6a12" stop-opacity="0"/></radialGradient>
    <linearGradient id="wood-${id}" x2="0" y2="1"><stop stop-color="#2a1710"/><stop offset=".4" stop-color="#67402a"/><stop offset=".58" stop-color="#352018"/><stop offset="1" stop-color="#130e0b"/></linearGradient>
    <linearGradient id="outer-${id}" x2=".15" y2="1"><stop stop-color="#ff3b08" stop-opacity=".1"/><stop offset=".35" stop-color="#ef4b0c"/><stop offset=".72" stop-color="#ff9d18"/><stop offset="1" stop-color="#ffcb53"/></linearGradient>
    <linearGradient id="inner-${id}" x2="0" y2="1"><stop stop-color="#ffe994" stop-opacity=".2"/><stop offset=".5" stop-color="#ffca46"/><stop offset="1" stop-color="#fff3c0"/></linearGradient>
    <filter id="heat-${id}" x="-30%" y="-20%" width="160%" height="150%"><feTurbulence type="fractalNoise" baseFrequency=".045 .09" numOctaves="2" seed="7" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G"/></filter>
    <filter id="soft-${id}"><feGaussianBlur stdDeviation="1.2"/></filter>
  </defs>
  <ellipse cx="90" cy="194" rx="75" ry="18" fill="#030807" opacity=".7"/>
  <ellipse cx="90" cy="175" rx="86" ry="43" fill="url(#glow-${id})"/>
  <g fill="#373b30" stroke="#53513d" stroke-width=".8">
    <ellipse cx="29" cy="195" rx="11" ry="6"/><ellipse cx="48" cy="204" rx="12" ry="6"/><ellipse cx="73" cy="208" rx="11" ry="5"/><ellipse cx="99" cy="209" rx="12" ry="5"/><ellipse cx="126" cy="205" rx="12" ry="6"/><ellipse cx="148" cy="196" rx="11" ry="6"/>
  </g>
  <g stroke-linecap="round">
    <path d="M40 191 137 171 M43 172 135 198 M62 201 115 166" stroke="#120e0b" stroke-width="16"/>
    <path d="M40 189 137 169 M43 170 135 196 M62 199 115 164" stroke="url(#wood-${id})" stroke-width="12"/>
    <path d="m45 187 17-4m10-2 23-5m15-2 20-4M48 171l20 6m12 4 23 6m12 3 14 4M66 196l14-10m11-8 18-11" stroke="#b37742" stroke-opacity=".45" stroke-width="1.2"/>
    <path d="m69 187 14-3m9-6 12-2m-27 11 21 7m-8-15 9-6" stroke="#ff6c1c" stroke-width="2"/>
  </g>
  <g class="fire" style="transform-origin:90px 190px">
    <ellipse cx="90" cy="163" rx="52" ry="55" fill="url(#glow-${id})"/>
    <g filter="url(#heat-${id})">
      <g><animateTransform attributeName="transform" type="translate" values="0 0;2 -3;-1 1;0 0" dur="1.8s" begin="-${id.length * .3}s" repeatCount="indefinite"/>
        <path fill="url(#outer-${id})" d="M89 187C58 189 41 170 48 149c4-14 16-22 12-39 14 8 17 19 14 28 16-17-4-39 7-61 6-13 15-21 12-40 25 23-1 42 12 64 8 13 6 22 4 31 9-11 19-19 14-34 24 18 8 41 18 57 11 22-7 36-52 32Z"/>
        <path fill="url(#outer-${id})" opacity=".85" d="M66 186c-25-11-32-26-23-47 1 18 17 17 14 33 7-11 6-22 4-28 20 12 22 31 5 42m45-3c29-12 33-28 24-47 0 16-16 16-15 29-5-10-2-20 1-25-19 8-25 28-10 43Z"/>
      </g>
      <g><animateTransform attributeName="transform" type="skewX" values="-2;3;-1;-2" dur="1.3s" repeatCount="indefinite"/>
        <path fill="url(#inner-${id})" d="M90 188c-25 0-35-16-23-37 6-11 11-19 8-30 15 9 15 21 13 31 19-22 1-38 15-56-1 21 16 30 12 49-2 8-7 13-5 21 4-5 9-11 9-18 13 23-2 40-29 40Z"/>
        <path fill="#fff6ce" opacity=".9" filter="url(#soft-${id})" d="M89 187c-15-1-19-12-10-24 5-6 9-12 8-20 14 10 4 18 10 25 4-5 5-10 5-14 12 19 1 33-13 33Z"/>
      </g>
    </g>
    <g fill="#ffbd58">
      <circle cx="69" cy="132" r="1.2"><animate attributeName="cy" values="157;53" dur="2.9s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.9;0" dur="2.9s" repeatCount="indefinite"/></circle>
      <circle cx="108" cy="120" r=".9"><animate attributeName="cy" values="165;38" dur="3.7s" repeatCount="indefinite"/><animate attributeName="cx" values="101;119;112" dur="3.7s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;0" dur="3.7s" repeatCount="indefinite"/></circle>
      <circle cx="85" cy="95" r=".7"><animate attributeName="cy" values="149;24" dur="3.1s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.8;0" dur="3.1s" repeatCount="indefinite"/></circle>
    </g>
  </g></svg>`;

const cols = {};
$('#teams').innerHTML = GAME.teams.map(t => `
  <section class="tcol" id="col-${t.id}" style="--c:${t.color}">
    <div class="pos"></div>
    <div class="tname">${esc(t.name.toUpperCase())}</div>
    ${FLAME(t.id)}
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
    case 'trade': return `🤝 Trueque entre ${tn(f.teamA)} y ${tn(f.teamB)}`;
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
        bengala: { cls: 'capture', ic: '🎆', t1: `¡${n} LANZÓ UNA BENGALA!`, t2: f.target ? `${teamById[f.target]?.name || ''} queda con el radar encandilado ${f.amount} min` : 'Se apagó sola', sound: 'capture', shake: f.target || null },
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
    } else if (f.kind === 'trade') {
      queue.push({ cls: 'special', ic: '🤝', t1: '¡TRUEQUE EN EL REFUGIO!', t2: `${teamById[f.teamA]?.name} da ${resTxt(f.giveA) || 'nada'} · ${teamById[f.teamB]?.name} da ${resTxt(f.giveB) || 'nada'}`, sound: 'msg' });
      for (const l of f.lit || []) queue.push({ cls: 'faro', ic: '🔥', t1: `¡${teamById[l.id].name.toUpperCase()} ENCENDIÓ EL FARO!`, t2: `${l.pos + 1}° equipo en pedir rescate · +${rules.faroBonus[l.pos] || 0} pts`, sound: 'faro' });
    } else if (f.kind === 'ceremony') {
      playCeremony();
    } else if (f.kind === 'intro') {
      playIntro();
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

// ---------------------------------------------------------------- intro narrada
let introRunning = false;
async function playIntro() {
  const cfg = GAME.intro;
  if (!cfg?.lines?.length || introRunning) return;
  introRunning = true;
  document.querySelector('.announce')?.remove();
  const ov = document.createElement('div');
  ov.className = 'intro';
  ov.innerHTML = `<button class="sm skip">Saltar ✕</button><div class="line"></div><div class="dots">${cfg.lines.map(() => '<i></i>').join('')}</div>`;
  document.body.append(ov);
  let stop = false;
  const pending = new Set();
  // espera que se corta al instante si tocan "Saltar"
  const wait = ms => new Promise(r => { const t = setTimeout(done, ms); function done() { clearTimeout(t); pending.delete(done); r(); } pending.add(done); });
  ov.querySelector('.skip').onclick = () => { stop = true; stopSpeaking(); [...pending].forEach(f => f()); };
  const ambience = startAmbience();
  let rec = null;
  if (cfg.audio) { rec = new Audio(cfg.audio); rec.play().catch(() => { rec = null; }); }
  const useVoice = !rec && audio && canSpeak();
  const lineEl = ov.querySelector('.line'), dots = [...ov.querySelectorAll('.dots i')];
  await wait(1200);
  for (let i = 0; i < cfg.lines.length && !stop; i++) {
    const l = cfg.lines[i];
    lineEl.classList.remove('on'); await wait(500);
    lineEl.textContent = l.texto; lineEl.classList.toggle('first', i === 0); lineEl.classList.add('on');
    dots.forEach((d, j) => d.classList.toggle('on', j <= i));
    const min = (l.segundos || Math.max(4, l.texto.length * .075)) * 1000;
    if (useVoice) await Promise.race([Promise.all([speak(l.texto), wait(Math.min(min, 3000))]), new Promise(r => pending.add(r))]);
    else await wait(min);
    await wait(500);
  }
  lineEl.classList.remove('on'); await wait(stop ? 0 : 800);
  if (!stop) {
    lineEl.remove();
    const t = document.createElement('div'); t.className = 'title'; t.textContent = 'APAGÓN'; ov.append(t);
    requestAnimationFrame(() => t.classList.add('on'));
    play('faro');
    await wait(3500);
  }
  rec?.pause(); ambience?.stop(); stopSpeaking();
  ov.remove(); introRunning = false;
  if (!showing) nextAnnouncement();
}
// Ambiente: viento grave + latido, solo si el sonido está activado
function startAmbience() {
  if (!audio) return null;
  const len = audio.sampleRate * 2, buf = audio.createBuffer(1, len, audio.sampleRate), d = buf.getChannelData(0);
  let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + .02 * w) / 1.02; d[i] = last * 3.5; }
  const src = audio.createBufferSource(); src.buffer = buf; src.loop = true;
  const lp = audio.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
  const g = audio.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(.35, audio.currentTime + 3);
  src.connect(lp).connect(g).connect(audio.destination); src.start();
  const beat = setInterval(() => { tone(55, 0, .35, 'sine', .35); tone(52, .28, .4, 'sine', .25); }, 1600);
  return { stop() { clearInterval(beat); try { g.gain.linearRampToValueAtTime(0, audio.currentTime + 1); setTimeout(() => src.stop(), 1100); } catch {} } };
}
$('#introBtn').onclick = () => playIntro();

// ---------------------------------------------------------------- premiación + reflexión de cierre
let cerRunning = false;
function awardsList() {
  const T = GAME.teams.map(t => ({ t, s: state.teams[t.id] }));
  const best = (fn, min = 1) => {
    const v = Math.max(...T.map(x => fn(x.s)));
    return v >= min ? { v, names: T.filter(x => fn(x.s) === v).map(x => x.t) } : null;
  };
  const join = ts => ts.map(t => `<span style="color:${t.color}">${esc(t.name)}</span>`).join(' y ');
  const list = [];
  const first = T.find(x => x.s.faroPos === 0);
  if (first) list.push({ ic: '🔥', name: join([first.t]), why: 'Primer equipo en encender el Faro de Rescate' });
  const mi = best(s => Object.keys(s.missions || {}).length);
  if (mi) list.push({ ic: '💪', name: join(mi.names), why: `Más misiones superadas (${mi.v})` });
  const sc = best(s => s.scans);
  if (sc) list.push({ ic: '🎒', name: join(sc.names), why: `Más recursos saqueados (${sc.v} ${sc.v === 1 ? 'saqueo' : 'saqueos'})` });
  const tr = best(s => s.trades || 0);
  if (tr) list.push({ ic: '🤝', name: join(tr.names), why: `Mejores negociadores (${tr.v} ${tr.v === 1 ? 'trueque' : 'trueques'})` });
  const ca = best(s => s.captures);
  if (ca) list.push({ ic: '🦁', name: join(ca.names), why: `Los más valientes: los iluminaron ${ca.v} ${ca.v === 1 ? 'vez' : 'veces'} y siguieron` });
  const sh = Object.entries(state.shadows || {}).sort((a, b) => b[1] - a[1])[0];
  if (sh) list.push({ ic: '🌑', name: esc(sh[0]), why: `Mejor Sombra de la noche (${sh[1]} ${sh[1] === 1 ? 'captura' : 'capturas'})` });
  return list;
}
async function playCeremony() {
  if (!state || cerRunning) return;
  cerRunning = true;
  document.querySelector('.announce')?.remove();
  const ov = document.createElement('div');
  ov.className = 'cer';
  ov.innerHTML = '<button class="sm close">Cerrar ✕</button><div class="stage"></div>';
  document.body.append(ov);
  const stage = ov.querySelector('.stage');
  let stop = false;
  const pending = new Set();
  const wait = ms => new Promise(r => { const t = setTimeout(done, ms); function done() { clearTimeout(t); pending.delete(done); r(); } pending.add(done); });
  const finish = () => { stop = true; [...pending].forEach(f => f()); };
  ov.querySelector('.close').onclick = finish;
  const show = html => { stage.innerHTML = `<div class="fade">${html}</div>`; };

  show('<div class="kicker">Campamento Monte Sinaí</div><div class="big">🏆 PREMIACIÓN</div>');
  play('faro'); await wait(3500);
  for (const a of awardsList()) {
    if (stop) break;
    show(`<div class="award"><div class="ic">${a.ic}</div><div class="name">${a.name}</div><div class="why">${a.why}</div></div>`);
    play('msg'); await wait(5000);
  }
  if (!stop) {
    // podio 3° → 2° → 1°
    const rk = state.ranking.slice(0, 3);
    const order = [1, 0, 2].filter(i => rk[i]); // izquierda 2°, centro 1°, derecha 3°
    const H = { 0: 52, 1: 38, 2: 28 };
    stage.innerHTML = `<div class="kicker" style="margin-bottom:2vh">Posiciones finales</div><div class="podium">${order.map(i => {
      const t = teamById[rk[i].teamId];
      return `<div class="col" data-i="${i}"><div class="tn" style="color:${t.color}">${esc(t.name)}</div><div class="pts">${rk[i].score} pts${state.teams[t.id].faroPos != null ? ' · 🔥' : ''}</div>
        <div class="block" style="height:${H[i]}vh;background:${t.color}">${i + 1}°</div></div>`;
    }).join('')}</div>`;
    for (const i of [2, 1, 0]) {
      if (stop || !rk[i]) continue;
      await wait(i === 0 ? 2600 : 1600);
      if (i === 0) [0, .12, .24, .36, .48, .6, .72].forEach(d => audio && tone(180 + Math.random() * 40, d, .1, 'square', .08)); // redoble
      if (i === 0) await wait(900);
      stage.querySelector(`.col[data-i="${i}"]`)?.classList.add('on');
      play(i === 0 ? 'faro' : 'msg');
    }
    await wait(7000);
  }
  const c = GAME.cierre;
  if (!stop && c?.texto) {
    show(`<div class="refl"><div class="t">${esc(c.titulo || '')}</div><div class="x">${esc(c.texto)}</div>${c.cita ? `<div class="c">${esc(c.cita)}</div>` : ''}</div>`);
    if (audio && canSpeak()) { await speak(c.texto); if (c.cita && !stop) await speak(c.cita.replace(/[—"]/g, ' ')); }
    // La reflexión queda en pantalla hasta que alguien toque "Cerrar" (para poder hablarle al grupo)
    if (!stop) await new Promise(r => pending.add(r));
  }
  stopSpeaking(); ov.remove(); cerRunning = false;
  if (!showing) nextAnnouncement();
}
$('#ceremonyBtn').onclick = () => playCeremony();

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
