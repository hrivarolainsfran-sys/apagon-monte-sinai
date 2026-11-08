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
    <img src="${esc(b.logo || 'logo.png')}" alt="" onerror="this.remove()">
    <div><div class="brand-name">${esc(b.name || '')}</div><div class="brand-tag">${esc(b.tagline || '')}</div></div>
  </div>`;
}

export function registerSW() {
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
}

// Pantalla de PIN simple para admin y Sombras (protección básica, no es seguridad fuerte).
export function pinGate(pins, key, onOk) {
  if (sessionStorage.getItem(GAME.gameId + ':' + key) === 'ok') return onOk();
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `${brandHeader()}<h2>Ingresá el PIN</h2><form class="row" style="max-width:320px;width:100%"><input type="password" inputmode="numeric" autocomplete="off" placeholder="PIN"><button class="primary">Entrar</button></form><p class="muted" data-m></p>`;
  document.body.append(ov);
  const input = ov.querySelector('input'); input.focus();
  ov.querySelector('form').addEventListener('submit', e => {
    e.preventDefault();
    if (pins.includes(input.value.trim())) { sessionStorage.setItem(GAME.gameId + ':' + key, 'ok'); ov.remove(); onOk(); }
    else { ov.querySelector('[data-m]').textContent = 'PIN incorrecto'; input.value = ''; }
  });
}
