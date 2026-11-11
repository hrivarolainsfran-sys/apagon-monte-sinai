// Motor del juego: todo el estado se calcula a partir de una lista de eventos.
// Así funciona sin conexión: cada celular guarda sus eventos y, al sincronizar,
// todos llegan al mismo resultado ordenando por hora.
import { GAME } from './config.js';

export const RES = GAME.resources;
export const resById = Object.fromEntries(RES.map(r => [r.id, r]));
export const teamById = Object.fromEntries(GAME.teams.map(t => [t.id, t]));
export const stationById = Object.fromEntries(GAME.stations.map(s => [s.id, s]));

export const normCode = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export function findByCode(raw) {
  const c = normCode(raw);
  if (!c) return null;
  const st = GAME.stations.find(s => normCode(s.code) === c);
  if (st) return { kind: 'station', item: st };
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

export function reduce(events) {
  const rules = GAME.rules;
  const evs = events
    .filter(e => e && e.id && e.type && typeof e.ts === 'number')
    .sort((a, b) => (a.ts - b.ts) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const s = { status: 'lobby', statusTs: 0, teams: {}, stations: {}, results: {}, feed: [], messages: [], ranking: [], faroCount: 0, eventCount: evs.length, specials: [], endsAt: null };
  for (const t of GAME.teams) s.teams[t.id] = { carry: zero(), bank: zero(), faroAt: null, faroPos: null, captures: 0, lastCaptureTs: 0, lastCaptureLost: null, lastCaptureBy: '', scans: 0, score: 0 };
  for (const st of GAME.stations) s.stations[st.id] = { usesLeft: st.uses, lastByTeam: {}, lat: st.lat ?? null, lng: st.lng ?? null, acc: null, anchoredTs: null };

  // Las posiciones GPS de las estaciones sobreviven a un reinicio.
  for (const e of evs) {
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
    ts.score = RES.reduce((a, r) => a + ts.bank[r.id] * r.points, 0) + (ts.faroPos != null ? (rules.faroBonus[ts.faroPos] || 0) : 0);
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
      const since = e.ts - team.lastCaptureTs, imm = rules.captureImmunitySec * 1000;
      if (since < imm) return no(`${tname} todavía tiene inmunidad (${fmtSec((imm - since) / 1000)}).`);
      const eclipse = isActive(s, 'eclipse', e.ts);
      const pct = eclipse ? 100 : rules.captureLossPct;
      const lost = zero();
      for (const r of RES) { lost[r.id] = Math.ceil(team.carry[r.id] * pct / 100); team.carry[r.id] -= lost[r.id]; }
      team.captures++; team.lastCaptureTs = e.ts; team.lastCaptureLost = lost; team.lastCaptureBy = String(e.by || 'una Sombra').slice(0, 40);
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
