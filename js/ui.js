import { GAME } from './config.js';

export const $ = (s, r = document) => r.querySelector(s);
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const ls = {
  get(k) { try { return localStorage.getItem(GAME.gameId + ':' + k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(GAME.gameId + ':' + k, v); } catch {} },
  del(k) { try { localStorage.removeItem(GAME.gameId + ':' + k); } catch {} },
};

export function vibrate(p) { try { navigator.vibrate && navigator.vibrate(p); } catch {} }

export const hhmm = ts => new Date(ts).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export function netText(st) {
  if (!st) return '…';
  if (st.error) return '⚠ ' + st.error;
  if (st.mode === 'demo') return 'MODO DEMO · datos solo en este dispositivo';
  if (st.online && !st.pending) return '● en línea';
  return `○ sin señal${st.pending ? ` · ${st.pending} por enviar` : ''}`;
}

let toastTimer;
export function toast(text, ok = true) {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.append(el); }
  el.textContent = text; el.className = ok ? 'show' : 'show bad';
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.className = ''; }, 3500);
}

export function brandHeader() {
  const b = GAME.brand || {};
  return `<div class="brand">
    ${b.logo ? `<img src="${esc(b.logo)}" alt="" onerror="this.remove()">` : ''}
    <div><div class="brand-name">${esc(b.name || '')}</div><div class="brand-tag">${esc(b.tagline || '')}</div></div>
  </div>`;
}

export function registerSW() {
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
}

async function pinHash(pin) {
  const data = new TextEncoder().encode('apagon:' + pin);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Pantalla de PIN para admin y Sombras. Compara contra hashes: el PIN no aparece en el código.
// (Protege de curiosos; no es seguridad fuerte.)
export function pinGate(hashes, key, onOk) {
  if (sessionStorage.getItem(GAME.gameId + ':' + key) === 'ok') return onOk(sessionStorage.getItem(GAME.gameId + ':' + key + ':pin') || '');
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `${brandHeader()}<h2>Ingresá el PIN</h2><form class="row" style="max-width:320px;width:100%"><input type="password" inputmode="numeric" autocomplete="off" placeholder="PIN"><button class="primary">Entrar</button></form><p class="muted" data-m></p>`;
  document.body.append(ov);
  const input = ov.querySelector('input'); input.focus();
  ov.querySelector('form').addEventListener('submit', async e => {
    e.preventDefault();
    const pin = input.value.trim();
    if (hashes.includes(await pinHash(pin))) {
      sessionStorage.setItem(GAME.gameId + ':' + key, 'ok');
      sessionStorage.setItem(GAME.gameId + ':' + key + ':pin', pin); // solo esta pestaña; sirve para descifrar ubicaciones
      ov.remove(); onOk(pin);
    }
    else { ov.querySelector('[data-m]').textContent = 'PIN incorrecto'; input.value = ''; }
  });
}

// ---------------------------------------------------------------- narración (síntesis de voz del navegador)
let cachedVoice;
function pickVoice() {
  if (cachedVoice !== undefined) return cachedVoice;
  const vs = (window.speechSynthesis?.getVoices() || []).filter(v => v.lang?.toLowerCase().startsWith('es'));
  // Preferir español latinoamericano
  const pref = ['es-419', 'es-mx', 'es-us', 'es-ar', 'es-co', 'es-py', 'es-es'];
  vs.sort((a, b) => {
    const ia = pref.indexOf(a.lang.toLowerCase()), ib = pref.indexOf(b.lang.toLowerCase());
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  cachedVoice = vs[0] || null;
  return cachedVoice;
}
if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => { cachedVoice = undefined; };
export const canSpeak = () => 'speechSynthesis' in window;
export function stopSpeaking() { try { speechSynthesis.cancel(); } catch {} }
// Lee un texto en voz alta; resuelve cuando termina (o tras un máximo, por si el navegador no avisa).
export function speak(text, { rate = .92, pitch = .85 } = {}) {
  return new Promise(res => {
    if (!canSpeak()) return res(false);
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(); if (v) u.voice = v;
    u.lang = v?.lang || 'es-419'; u.rate = rate; u.pitch = pitch;
    const t = setTimeout(() => res(true), 2500 + text.length * 110);
    u.onend = u.onerror = () => { clearTimeout(t); res(true); };
    speechSynthesis.speak(u);
  });
}
