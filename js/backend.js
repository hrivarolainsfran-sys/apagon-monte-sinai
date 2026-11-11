// Conexión de datos: Firebase (varios celulares en vivo) o MODO DEMO (un solo dispositivo).
import { GAME } from './config.js';
import { reduce, uid } from './engine.js';

const FB_VERSION = '10.12.2';

export function deviceId() {
  const k = GAME.gameId + ':device';
  try {
    let d = localStorage.getItem(k);
    if (!d) { d = uid(); localStorage.setItem(k, d); }
    return d;
  } catch { return 'anon'; }
}

// Hora de los eventos: siempre creciente en este celular (dos escaneos nunca empatan)
// y corregida con la hora del servidor si el reloj del celular está muy desfasado.
let lastTs = 0, clockOffset = 0;
function eventTime() {
  const t = Math.max(Date.now() + clockOffset, lastTs + 1);
  lastTs = t;
  return t;
}
export const serverNow = () => Date.now() + clockOffset;
async function syncClock() {
  try {
    const t0 = Date.now();
    const r = await fetch(location.origin + location.pathname, { method: 'HEAD', cache: 'no-store' });
    const t1 = Date.now();
    const d = Date.parse(r.headers.get('date'));
    if (!d) return;
    const off = d + 500 - (t0 + t1) / 2; // el header Date tiene precisión de 1 s
    if (Math.abs(off) > 5000) clockOffset = Math.round(off);
  } catch {}
}

export async function startClient({ onState, onStatus }) {
  syncClock();
  let state = reduce([]);
  const waiters = new Map();
  const handle = evs => {
    state = reduce(evs);
    for (const [id, fn] of waiters) if (state.results[id]) { waiters.delete(id); fn(state.results[id]); }
    onState(state);
  };

  let be;
  // ?demo en la dirección = modo práctica: no toca la partida real (datos solo en este dispositivo).
  const forceDemo = new URLSearchParams(location.search).has('demo');
  if (GAME.firebase && GAME.firebase.apiKey && !forceDemo) {
    try { be = await firebaseBackend(handle, onStatus); }
    catch (err) {
      console.error(err);
      onStatus({ mode: 'error', error: 'No se pudo conectar a Firebase: ' + err.message });
      be = demoBackend(handle, () => {});
    }
  } else {
    be = demoBackend(handle, onStatus);
  }

  return {
    mode: be.mode,
    get state() { return state; },
    send(type, data = {}) {
      const ev = { ...data, id: uid(), ts: eventTime(), type, device: deviceId() };
      const p = new Promise(res => {
        waiters.set(ev.id, res);
        setTimeout(() => {
          if (waiters.has(ev.id)) { waiters.delete(ev.id); res({ ok: true, pending: true, text: 'Registrado. Se confirma cuando vuelva la señal.' }); }
        }, 5000);
      });
      Promise.resolve().then(() => be.add(ev)).catch(err => { console.error(err); onStatus({ mode: be.mode, error: 'Error al guardar: ' + err.message }); });
      return p;
    },
    // Ubicación de los equipos: un documento por equipo que se sobrescribe (no se guarda historial).
    setPresence(teamId, data) {
      return Promise.resolve(be.setPresence(teamId, { ...data, teamId, ts: Date.now() + clockOffset })).catch(err => console.warn('presencia', err));
    },
    onPresence(cb) { be.onPresence(cb); },
  };
}

function demoBackend(onEvents, onStatus) {
  const key = 'apagon_demo_events:' + GAME.gameId;
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel(key) : null;
  const read = () => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
  const emit = () => onEvents(read());
  window.addEventListener('storage', e => { if (e.key === key) emit(); });
  if (bc) bc.onmessage = emit;
  setTimeout(() => { onStatus({ mode: 'demo', online: true, pending: 0 }); emit(); }, 0);
  const pkey = 'apagon_demo_presence:' + GAME.gameId;
  const readP = () => { try { return JSON.parse(localStorage.getItem(pkey) || '{}'); } catch { return {}; } };
  const pListeners = [];
  const emitP = () => pListeners.forEach(f => f(readP()));
  window.addEventListener('storage', e => { if (e.key === pkey) emitP(); });
  const pbc = 'BroadcastChannel' in window ? new BroadcastChannel(pkey) : null;
  if (pbc) pbc.onmessage = emitP;
  return {
    mode: 'demo',
    setPresence(teamId, data) { const p = readP(); p[teamId] = data; localStorage.setItem(pkey, JSON.stringify(p)); if (pbc) pbc.postMessage(1); emitP(); },
    onPresence(cb) { pListeners.push(cb); setTimeout(() => cb(readP()), 0); },
    add(ev) {
      const a = read(); a.push(ev);
      localStorage.setItem(key, JSON.stringify(a));
      if (bc) bc.postMessage(1);
      emit();
    },
  };
}

async function firebaseBackend(onEvents, onStatus) {
  const { initializeApp } = await import(`https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-app.js`);
  const fs = await import(`https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-firestore.js`);
  const app = initializeApp(GAME.firebase);
  let db;
  try {
    db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) });
  } catch {
    db = fs.getFirestore(app);
  }
  const col = fs.collection(db, 'games', GAME.gameId, 'events');
  fs.onSnapshot(col, { includeMetadataChanges: true }, snap => {
    const pending = snap.docs.filter(d => d.metadata.hasPendingWrites).length;
    onStatus({ mode: 'firebase', online: !snap.metadata.fromCache, pending });
    onEvents(snap.docs.map(d => d.data()));
  }, err => onStatus({ mode: 'firebase', error: err.message }));
  const pcol = fs.collection(db, 'games', GAME.gameId, 'presence');
  return {
    mode: 'firebase',
    add: ev => fs.setDoc(fs.doc(col, ev.id), ev),
    setPresence: (teamId, data) => fs.setDoc(fs.doc(pcol, teamId), data),
    onPresence(cb) {
      fs.onSnapshot(pcol, snap => cb(Object.fromEntries(snap.docs.map(d => [d.id, d.data()]))), err => console.warn('presencia', err));
    },
  };
}
