// Motor del juego: todo el estado se calcula a partir de una lista de eventos.
// Así funciona sin conexión: cada celular guarda sus eventos y, al sincronizar,
// todos llegan al mismo resultado ordenando por hora.
import { GAME } from './config.js';

export const RES = GAME.resources;
export const resById = Object.fromEntries(RES.map(r => [r.id, r]));
export const teamById = Object.fromEntries(GAME.teams.map(t => [t.id, t]));
export const stationById = Object.fromEntries(GAME.stations.map(s => [s.id, s]));
export const CHESTS = GAME.chests || [];
export const chestById = Object.fromEntries(CHESTS.map(c => [c.id, c]));
export const MISSIONS = GAME.missions || [];
export const missionById = Object.fromEntries(MISSIONS.map(m => [m.id, m]));
export const rewardText = rw => rw?.type === 'puntos' ? `+${rw.amount} pts` : rw ? `+${rw.amount} ${resById[rw.resource]?.icon || ''} al Refugio` : '';
// Descripción de cada efecto de cofre (para el panel y los avisos)
export const CHEST_EFFECTS = {
  refugio: { icon: '🎁', name: 'Envío al Refugio' },
  puntos:  { icon: '⭐', name: 'Puntos extra' },
  escudo:  { icon: '🛡', name: 'Escudo' },
  mapa:    { icon: '📜', name: 'Mapa del tesoro' },
  trampa:  { icon: '💥', name: 'Trampa' },
  bengala: { icon: '🎆', name: 'Bengala' },
};

export const normCode = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export function findByCode(raw) {
  const c = normCode(raw);
  if (!c) return null;
  const st = GAME.stations.find(s => normCode(s.code) === c);
  if (st) return { kind: 'station', item: st };
  const ch = CHESTS.find(x => normCode(x.code) === c);
  if (ch) return { kind: 'chest', item: ch };
  const tm = GAME.teams.find(t => normCode(t.code) === c);
  if (tm) return { kind: 'team', item: tm };
  if (normCode(GAME.base.code) === c) return { kind: 'base', item: GAME.base };
  return null;
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const zero = () => Object.fromEntries(RES.map(r => [r.id, 0]));
export const total = o => Object.values(o).reduce((a, b) => a + b, 0);
export const fmtRes = o => RES.filter(r => o[r.id]).map(r => `${o[r.id]} ${r.icon}`).join('  ') || 'nada';
export function fmtSec(sec) {
  sec = Math.max(0, Math.ceil(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return m ? `${m}:${String(s).padStart(2, '0')} min` : `${s} s`;
}

export function distM(lat1, lng1, lat2, lng2) {
  const R = 6371000, toR = Math.PI / 180;
  const dLat = (lat2 - lat1) * toR, dLng = (lng2 - lng1) * toR;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toR) * Math.cos(lat2 * toR) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export const cooldownMs = def => (def.cooldownMin ?? GAME.rules.cooldownMin) * 60000;

export const STATUS_TEXT = {
  lobby: '⏳ Esperando la señal de inicio',
  running: '🔴 EN JUEGO',
  paused: '⏸ PAUSA — quédense donde están',
  ended: '🏁 FIN — vuelvan al Refugio',
};

// ---------------------------------------------------------------- eventos especiales
export const SPECIALS = {
  tormenta:    { icon: '⛈', name: 'Tormenta',             desc: 'El radar no funciona. Busquen las estaciones a ojo.' },
  suministros: { icon: '📦', name: 'Lluvia de suministros', desc: 'Una estación da el DOBLE de recursos.' },
  eclipse:     { icon: '🌑', name: 'Eclipse',              desc: 'Si una Sombra los ilumina, pierden TODA la mochila.' },
};
// Eventos activos en un momento dado (now = hora del servidor).
export const activeSpecials = (s, now) => s.specials.filter(x => x.startTs <= now && now < x.endTs);
export const isActive = (s, kind, now, stationId) => s.specials.some(x => x.kind === kind && x.startTs <= now && now < x.endTs && (!stationId || x.stationId === stationId));
// Estado efectivo: si terminó la cuenta regresiva, el juego está terminado aunque nadie haya tocado "Terminar".
export const effectiveStatus = (s, now) => (s.status === 'running' && s.endsAt && now >= s.endsAt) ? 'ended' : s.status;
// Lugar sin la aclaración entre paréntesis: "Pileta (cerco…)" → "Pileta"
export const lugarCorto = st => st ? (st.lugar || st.name).replace(/\s*\(.*\)\s*$/, '') : '';
export const specialText = x => {
  const d = SPECIALS[x.kind]; if (!d) return '';
  if (x.kind === 'suministros') { const st = stationById[x.stationId]; return `${d.icon} ${d.name}: ${st ? `${st.name}, en ${lugarCorto(st)},` : 'una estación'} da el doble`; }
  return `${d.icon} ${d.name}: ${d.desc}`;
};

// Puntaje en el momento (para decidir a quién apunta una bengala)
export const liveScore = (t, rules = GAME.rules) => RES.reduce((a, r) => a + t.bank[r.id] * r.points, 0) + (t.faroPos != null ? (rules.faroBonus[t.faroPos] || 0) : 0) + t.bonusPts;

export function reduce(events) {
  const rules = GAME.rules;
  const evs = events
    .filter(e => e && e.id && e.type && typeof e.ts === 'number')
    .sort((a, b) => (a.ts - b.ts) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const s = { status: 'lobby', statusTs: 0, teams: {}, stations: {}, results: {}, feed: [], messages: [], ranking: [], faroCount: 0, eventCount: evs.length, specials: [], endsAt: null, shadows: {}, base: null, ceremonyTs: null };
  for (const t of GAME.teams) s.teams[t.id] = { carry: zero(), bank: zero(), faroAt: null, faroPos: null, captures: 0, lastCaptureTs: 0, lastCaptureLost: null, lastCaptureBy: '', scans: 0, score: 0, bonusPts: 0, shieldUntil: 0, missions: {}, flareUntil: 0, trades: 0 };
  s.chests = Object.fromEntries(CHESTS.map(c => [c.id, { openedBy: null, ts: null }]));
  for (const st of GAME.stations) s.stations[st.id] = { usesLeft: st.uses, lastByTeam: {}, lat: st.lat ?? null, lng: st.lng ?? null, acc: null, anchoredTs: null };

  // Las posiciones GPS de las estaciones sobreviven a un reinicio.
  for (const e of evs) {
    if (e.type === 'station_pos' && e.stationId === 'base') {
      s.base = { lat: e.lat, lng: e.lng, acc: e.acc ?? null, anchoredTs: e.ts };
      s.results[e.id] = { ok: true, text: 'Refugio anclado' };
    }
    if (e.type === 'station_pos' && s.stations[e.stationId]) {
      Object.assign(s.stations[e.stationId], { lat: e.lat, lng: e.lng, acc: e.acc ?? null, anchoredTs: e.ts });
      s.results[e.id] = { ok: true, text: 'Estación anclada' };
    }
  }
  let start = 0;
  evs.forEach((e, i) => { if (e.type === 'reset') start = i + 1; });
  for (const e of evs.slice(start)) apply(s, e, rules);

  for (const t of GAME.teams) {
    const ts = s.teams[t.id];
    ts.score = RES.reduce((a, r) => a + ts.bank[r.id] * r.points, 0) + (ts.faroPos != null ? (rules.faroBonus[ts.faroPos] || 0) : 0) + ts.bonusPts;
  }
  s.ranking = GAME.teams.map(t => ({ teamId: t.id, score: s.teams[t.id].score })).sort((a, b) => b.score - a.score);
  s.feed.reverse(); // más reciente primero
  return s;
}

function apply(s, e, rules) {
  const team = e.teamId ? s.teams[e.teamId] : null;
  const tname = e.teamId && teamById[e.teamId] ? teamById[e.teamId].name : '¿?';
  // kind/datos extra en el feed: la pantalla de la Fogata arma sus propios textos
  // (sin revelar nombres de estaciones).
  const ok = (text, feedText, extra = {}, feedExtra = {}) => {
    s.results[e.id] = { ok: true, text, ...extra };
    if (feedText) s.feed.push({ id: e.id, ts: e.ts, text: feedText, teamId: e.teamId || null, ...feedExtra });
  };
  const no = text => { s.results[e.id] = { ok: false, text }; };
  const running = () => {
    if (s.status === 'running' && s.endsAt && e.ts >= s.endsAt) { no('¡Se acabó el tiempo! Vuelvan a la Fogata.'); return false; }
    if (s.status === 'running') return true;
    no(s.status === 'paused' ? 'El juego está en pausa.' : s.status === 'ended' ? 'El juego terminó.' : 'El juego todavía no empezó.');
    return false;
  };
  const checkFaro = () => {
    if (team.faroAt == null && RES.every(r => team.bank[r.id] >= (rules.faroGoal[r.id] || 0))) {
      team.faroAt = e.ts; team.faroPos = s.faroCount++;
      return ` · 🔥 ¡FARO DE RESCATE ENCENDIDO! (${team.faroPos + 1}° lugar)`;
    }
    return '';
  };

  switch (e.type) {
    case 'game_state': {
      if (!STATUS_TEXT[e.status]) return no('Estado inválido');
      s.status = e.status; s.statusTs = e.ts;
      if (e.status === 'running' && s.endsAt && e.ts >= s.endsAt) s.endsAt = null; // reanudar después de una cuenta regresiva vencida
      return ok(STATUS_TEXT[e.status], `Juego: ${STATUS_TEXT[e.status]}`, {}, { kind: 'state', status: e.status });
    }
    case 'scan_station': {
      if (!team) return no('Equipo desconocido.');
      const def = stationById[e.stationId], st = s.stations[e.stationId];
      if (!def) return no('Estación desconocida.');
      if (!running()) return;
      const r = resById[def.resource];
      if (st.usesLeft <= 0) return no(`${def.name} está agotada. Busquen otra fuente de ${r.icon} ${r.name}.`);
      const last = st.lastByTeam[e.teamId], cd = cooldownMs(def);
      if (last != null && e.ts - last < cd) return no(`Ya saquearon ${def.name}. Vuelvan en ${fmtSec((cd - (e.ts - last)) / 1000)}.`);
      const cap = rules.backpackMax - total(team.carry);
      if (cap <= 0) return no(`Mochila llena (${rules.backpackMax}). Vuelvan al Refugio a descargar.`);
      const boost = isActive(s, 'suministros', e.ts, def.id);
      const amount = def.amount * (boost ? 2 : 1);
      const give = Math.min(amount, cap);
      team.carry[r.id] += give; st.usesLeft--; st.lastByTeam[e.teamId] = e.ts; team.scans++;
      const txt = `+${give} ${r.icon} ${r.name}${boost ? ' 📦 ¡DOBLE!' : ''}${give < amount ? ' (no entraba más en la mochila)' : ''}`;
      return ok(txt, `${tname} saqueó ${def.name}: ${txt}`, { resource: r.id }, { kind: 'scan', resource: r.id, amount: give });
    }
    case 'deposit': {
      if (!team) return no('Equipo desconocido.');
      if (!running()) return;
      if (total(team.carry) === 0) return no('La mochila está vacía. Salgan a buscar recursos.');
      const parts = fmtRes(team.carry), items = { ...team.carry };
      for (const r of RES) { team.bank[r.id] += team.carry[r.id]; team.carry[r.id] = 0; }
      const lit = checkFaro();
      const txt = `Asegurado en el Refugio: ${parts}` + lit;
      return ok(txt, `${tname} — ${txt}`, {}, { kind: 'deposit', items, faroPos: lit ? team.faroPos : null });
    }
    case 'capture': {
      if (!team) return no('Equipo desconocido.');
      if (!running()) return;
      if (team.shieldUntil > e.ts) return no(`${tname} tiene un 🛡 escudo de un cofre (${fmtSec((team.shieldUntil - e.ts) / 1000)}).`);
      const since = e.ts - team.lastCaptureTs, imm = rules.captureImmunitySec * 1000;
      if (since < imm) return no(`${tname} todavía tiene inmunidad (${fmtSec((imm - since) / 1000)}).`);
      const eclipse = isActive(s, 'eclipse', e.ts);
      const pct = eclipse ? 100 : rules.captureLossPct;
      const lost = zero();
      for (const r of RES) { lost[r.id] = Math.ceil(team.carry[r.id] * pct / 100); team.carry[r.id] -= lost[r.id]; }
      team.captures++; team.lastCaptureTs = e.ts; team.lastCaptureLost = lost; team.lastCaptureBy = String(e.by || 'una Sombra').slice(0, 40);
      if (e.by && e.by !== 'Admin') s.shadows[team.lastCaptureBy] = (s.shadows[team.lastCaptureBy] || 0) + 1;
      const txt = (total(lost) ? `🔦 ${tname} fue iluminado y pierde ${fmtRes(lost)}` : `🔦 ${tname} fue iluminado (mochila vacía, no pierde nada)`) + (eclipse ? ' 🌑 (eclipse)' : '');
      return ok(txt, `${txt} — por ${team.lastCaptureBy}`, {}, { kind: 'capture', lost, by: team.lastCaptureBy });
    }
    case 'adjust': {
      if (!team || !resById[e.resource] || !['carry', 'bank'].includes(e.where)) return no('Ajuste inválido.');
      const d = Math.trunc(Number(e.delta) || 0);
      team[e.where][e.resource] = Math.max(0, team[e.where][e.resource] + d);
      const r = resById[e.resource];
      const lit = e.where === 'bank' ? checkFaro() : '';
      const txt = `Ajuste admin: ${d > 0 ? '+' : ''}${d} ${r.icon} en ${e.where === 'bank' ? 'Refugio' : 'mochila'}` + lit;
      return ok(txt, `${tname} — ${txt}`, {}, { kind: 'adjust', faroPos: lit ? team.faroPos : null });
    }
    case 'message': {
      const text = String(e.text || '').slice(0, 280);
      if (!text) return no('Mensaje vacío.');
      s.messages.push({ id: e.id, ts: e.ts, text, teamId: e.teamId || null });
      return ok('Mensaje enviado', `📢 ${e.teamId ? `(a ${tname}) ` : ''}${text}`, {}, { kind: 'message', msg: text, toTeam: e.teamId || null });
    }
    case 'open_chest': {
      if (!team) return no('Equipo desconocido.');
      const def = chestById[e.chestId], ch = s.chests[e.chestId];
      if (!def) return no('Cofre desconocido.');
      if (!running()) return;
      if (ch.openedBy) return no(`Este cofre ya fue abierto por ${teamById[ch.openedBy]?.name || 'otro equipo'}. Llegaron tarde…`);
      ch.openedBy = e.teamId; ch.ts = e.ts;
      let txt = '', pub = '', extra = {};
      switch (def.effect) {
        case 'refugio': {
          const r = resById[def.resource]; const n = def.amount || 2;
          team.bank[r.id] += n;
          const lit = checkFaro();
          txt = `🎁 ¡Envío de emergencia! +${n} ${r.icon} ${r.name} directo al Refugio (ya está a salvo).${lit}`;
          pub = `🎁 ${tname} abrió un cofre: +${n} ${r.icon} al Refugio`;
          extra = { resource: r.id, amount: n, faroPos: lit ? team.faroPos : null };
          break;
        }
        case 'puntos': {
          const n = def.amount || 30; team.bonusPts += n;
          txt = `⭐ ¡Tesoro! +${n} puntos para el equipo.`; pub = `⭐ ${tname} abrió un cofre: +${n} puntos`; extra = { amount: n };
          break;
        }
        case 'escudo': {
          const m = def.amount || 5; team.shieldUntil = e.ts + m * 60000;
          txt = `🛡 ¡Escudo! Durante ${m} minutos las Sombras no los pueden atrapar.`; pub = `🛡 ${tname} consiguió un escudo de ${m} min`; extra = { amount: m };
          break;
        }
        case 'mapa': {
          // revela la estación secreta con más usos restantes
          const secret = GAME.stations.filter(x => x.radar === false && s.stations[x.id].usesLeft > 0)
            .sort((a, b) => s.stations[b.id].usesLeft - s.stations[a.id].usesLeft)[0];
          if (secret) {
            const r = resById[secret.resource];
            txt = `📜 ¡Mapa del tesoro! Hay una estación secreta de ${r.icon} ${r.name} (+${secret.amount}) en: ${secret.lugar || secret.name}.`;
          } else txt = '📜 Un mapa viejo… todas las estaciones secretas ya están agotadas.';
          pub = `📜 ${tname} encontró un mapa del tesoro`;
          break;
        }
        case 'trampa': {
          const lost = zero();
          for (const r of RES) { lost[r.id] = Math.ceil(team.carry[r.id] / 2); team.carry[r.id] -= lost[r.id]; }
          txt = total(lost) ? `💥 ¡EMBOSCADA! Era una trampa: pierden ${fmtRes(lost)}.` : '💥 ¡EMBOSCADA! Era una trampa… por suerte la mochila estaba vacía.';
          pub = `💥 ${tname} cayó en una trampa`; extra = { lost };
          break;
        }
        case 'bengala': {
          const m = def.amount || 5;
          const target = GAME.teams.filter(t => t.id !== e.teamId).map(t => ({ id: t.id, sc: liveScore(s.teams[t.id], rules) })).sort((a, b) => b.sc - a.sc)[0];
          if (target) {
            s.teams[target.id].flareUntil = Math.max(s.teams[target.id].flareUntil, e.ts) + m * 60000;
            const tn2 = teamById[target.id].name;
            txt = `🎆 ¡Bengala! La lanzaron contra ${tn2} (el equipo que más amenaza): su radar queda encandilado ${m} minutos.`;
            pub = `🎆 ${tname} lanzó una bengala contra ${tn2}`; extra = { target: target.id, amount: m };
          } else { txt = '🎆 La bengala se apagó sola.'; pub = `🎆 ${tname} encontró una bengala`; }
          break;
        }
        default: txt = 'El cofre estaba vacío.'; pub = `${tname} abrió un cofre vacío`;
      }
      return ok(txt, pub, { chest: def.effect }, { kind: 'chest', effect: def.effect, chestId: def.id, ...extra });
    }
    case 'mission_done': {
      if (!team) return no('Equipo desconocido.');
      const m = missionById[e.missionId];
      if (!m) return no('Misión desconocida.');
      if (!running()) return;
      if (team.missions[m.id]) return no(`${tname} ya completó "${m.name}". Cada misión vale una sola vez.`);
      team.missions[m.id] = e.ts;
      const rw = m.reward || {};
      let lit = '';
      if (rw.type === 'puntos') team.bonusPts += rw.amount || 0;
      else if (resById[rw.resource]) { team.bank[rw.resource] += rw.amount || 0; lit = checkFaro(); }
      const txt = `💪 ${tname} completó "${m.name}": ${rewardText(rw)}${lit}`;
      return ok(txt, txt, {}, { kind: 'mission', missionId: m.id, faroPos: lit ? team.faroPos : null });
    }
    case 'trade': {
      const A = s.teams[e.teamA], B = s.teams[e.teamB];
      if (!A || !B || e.teamA === e.teamB) return no('Elegí dos equipos distintos.');
      if (!running()) return;
      const clean = o => Object.fromEntries(RES.map(r => [r.id, Math.max(0, Math.trunc(Number(o?.[r.id]) || 0))]));
      const gA = clean(e.giveA), gB = clean(e.giveB);
      if (!total(gA) && !total(gB)) return no('El trueque está vacío.');
      const nA = teamById[e.teamA].name, nB = teamById[e.teamB].name;
      for (const r of RES) {
        if (A.bank[r.id] < gA[r.id]) return no(`${nA} no tiene ${gA[r.id]} ${r.icon} en el Refugio (tiene ${A.bank[r.id]}).`);
        if (B.bank[r.id] < gB[r.id]) return no(`${nB} no tiene ${gB[r.id]} ${r.icon} en el Refugio (tiene ${B.bank[r.id]}).`);
      }
      for (const r of RES) { A.bank[r.id] += gB[r.id] - gA[r.id]; B.bank[r.id] += gA[r.id] - gB[r.id]; }
      A.trades++; B.trades++;
      const faroFor = (t, id) => {
        if (t.faroAt == null && RES.every(r => t.bank[r.id] >= (rules.faroGoal[r.id] || 0))) { t.faroAt = e.ts; t.faroPos = s.faroCount++; return { id, pos: t.faroPos }; }
        return null;
      };
      const lit = [faroFor(A, e.teamA), faroFor(B, e.teamB)].filter(Boolean);
      const txt = `🤝 Trueque: ${nA} da ${fmtRes(gA)} y ${nB} da ${fmtRes(gB)}` + lit.map(l => ` · 🔥 ¡${teamById[l.id].name} encendió el Faro!`).join('');
      return ok(txt, txt, {}, { kind: 'trade', teamA: e.teamA, teamB: e.teamB, giveA: gA, giveB: gB, lit });
    }
    case 'ceremony':
      s.ceremonyTs = e.ts;
      return ok('Premiación en marcha en la Fogata', '🏆 Comienza la premiación', {}, { kind: 'ceremony' });
    case 'intro':
      return ok('Intro en marcha en la Fogata', '🎬 Comienza la intro del Apagón', {}, { kind: 'intro' });
    case 'special': {
      if (!SPECIALS[e.kind]) return no('Evento especial desconocido.');
      if (e.kind === 'suministros' && !stationById[e.stationId]) return no('Elegí una estación.');
      const mins = Math.max(1, Math.min(60, Number(e.minutes) || 5));
      const x = { id: e.id, kind: e.kind, stationId: e.stationId || null, startTs: e.ts, endTs: e.ts + mins * 60000, minutes: mins };
      s.specials.push(x);
      const txt = specialText(x) + ` (${mins} min)`;
      return ok(txt, txt, {}, { kind: 'special', special: e.kind, stationId: x.stationId, minutes: mins, specialId: x.id });
    }
    case 'special_end': {
      const x = s.specials.find(y => y.id === e.specialId);
      if (!x || x.endTs <= e.ts) return no('Ese evento ya terminó.');
      x.endTs = e.ts;
      return ok('Evento terminado', `${SPECIALS[x.kind].icon} Terminó: ${SPECIALS[x.kind].name}`, {}, { kind: 'special_end', special: x.kind });
    }
    case 'countdown': {
      const mins = Number(e.minutes) || 0;
      if (mins <= 0) { s.endsAt = null; return ok('Cuenta regresiva cancelada', '⏰ Cuenta regresiva cancelada', {}, { kind: 'countdown', minutes: 0 }); }
      s.endsAt = e.ts + Math.min(180, mins) * 60000;
      return ok(`Cuenta regresiva: ${mins} min`, `⏰ ¡Quedan ${mins} minutos!`, {}, { kind: 'countdown', minutes: mins, endsAt: s.endsAt });
    }
    case 'station_pos':
    case 'reset':
      return;
    default:
      return no('Evento desconocido.');
  }
}
