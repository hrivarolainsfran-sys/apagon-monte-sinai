// Checklist del ensayo general + prueba de cada celular (no escribe nada en la partida).
import { GAME } from './config.js';
import { findByCode, MISSIONS, CHESTS, CHEST_EFFECTS, resById } from './engine.js';
import { startClient } from './backend.js';
import { openScanner } from './scanner.js';
import { $, esc, ls, vibrate, netText, brandHeader, registerSW, speak, canSpeak } from './ui.js';

$('#brand').innerHTML = brandHeader();
registerSW();

const L = (href, txt) => `<a href="${href}" target="_blank">${txt}</a>`;
const PHASES = [
  { id: 'a', title: '1 · Una semana antes', when: 'Preparación general', items: [
    ['a1', 'Cargar el teléfono real de SOS', `En <code>js/config.js</code> → <code>coordinator.phone</code>. Hoy dice ${esc(GAME.coordinator.phone)}.`, 'Coordinación'],
    ['a2', 'Definir el equipo de staff', 'Coordinador (panel) · 3–4 Sombras · 6 monitores de misión · 1 persona en la Fogata/pantalla · 1 responsable de primeros auxilios.', 'Coordinación'],
    ['a3', 'Pasar links y PIN por privado', `Sombras y misiones: PIN de Sombra. Coordinación: PIN de admin. ${L('sombra.html', 'Sombra')} · ${L('mision.html', 'Misión')} · ${L('admin.html', 'Panel')}`, 'Coordinación'],
    ['a4', 'Imprimir todo y plastificar mate', `${L('imprimir.html', 'Hoja de impresión')}: 1 inicio + Refugio · 2 estaciones (12) · 3 cofres (${CHESTS.length}) · 4 tarjetas de equipo (${GAME.teams.length}) · 5 fichas de misión (${MISSIONS.length}). Imprimir desde la dirección publicada.`, 'Coordinación'],
    ['a5', 'Imprimir tablas Morse', 'Una por equipo para la misión "Mensaje en Morse".', 'Misiones'],
    ['a6', 'Juntar materiales de misiones', MISSIONS.map(m => `${m.icon} ${esc(m.materiales || '')}`).join('<br>'), 'Misiones'],
    ['a7', 'Equipo técnico', 'Proyector o TV + parlantes + alargue · notebook con Chrome · router WiFi con chip cerca de la Fogata (si la señal es mala) · power banks.', 'Coordinación'],
    ['a8', 'Material de noche', 'Linternas ROJAS para las Sombras · pulseras o cinta luminosa para marcar cada QR · cinta de peligro para límites · botiquín.', 'Coordinación'],
  ]},
  { id: 'b', title: '2 · Ensayo general', when: 'El día anterior, al atardecer y ya de noche', items: [
    ['b1', 'Recorrer límites y zonas peligrosas', 'Marcar el perímetro con luces o cinta. Señalar pozos, raíces, la pileta. Definir el punto de reunión de emergencia.', 'Todos'],
    ['b2', 'Esconder los QR según el lugar sugerido', 'Cada tarjeta dice "📍 Esconder en". Si cambian un lugar, anotarlo. El QR a la altura de la vista, con la marca luminosa AL LADO (no encima).', 'Coordinación'],
    ['b3', 'Anclar el GPS de las estaciones', `En el ${L('admin.html', 'panel')} → Estaciones → "Activar mi GPS" y "Anclar aquí" parado en cada QR. Esperar ±15 m.`, 'Coordinación'],
    ['b4', 'Probar celulares (arriba en esta página)', 'Al menos un Android barato y un iPhone, DE NOCHE: escanear un QR real con linterna, GPS, conexión en cada zona.', 'Todos'],
    ['b5', 'Medir la señal en cada estación', 'Con "Conexión al juego" de esta página. Donde no haya señal, la app guarda y envía después: está bien, pero conviene saberlo.', 'Coordinación'],
    ['b6', 'Probar la Pantalla de la Fogata', `${L('pantalla.html', 'Pantalla')} → Activar sonido → Pantalla completa → 🎬 Ver intro. Revisar volumen y que la notebook no se suspenda.`, 'Fogata'],
    ['b7', 'Partida de prueba de punta a punta', `En el panel: Iniciar → un Operador escanea una estación → deposita en el Refugio → una Sombra lo atrapa → un monitor registra una misión → un evento especial → cuenta regresiva de 5 min.`, 'Todos'],
    ['b8', '⚠ REINICIAR la partida al terminar el ensayo', 'Panel → Zona peligrosa → Reiniciar partida. Si no, los cofres quedan abiertos y los puntos del ensayo siguen.', 'Coordinación'],
  ]},
  { id: 'c', title: '3 · La noche del juego', when: 'Antes de empezar', items: [
    ['c1', 'Celulares cargados y en modo "no molestar"', 'Operadores, Sombras y monitores. Brillo bajo.', 'Todos'],
    ['c2', 'Pantalla lista', 'Abierta, sonido activado, pantalla completa.', 'Fogata'],
    ['c3', 'Staff en sus puestos', 'Monitores de misión con su ficha, materiales y mision.html abierto. Sombras con linterna roja y sombra.html abierto.', 'Todos'],
    ['c4', 'Armar los 4 equipos y repartir roles', 'Operador, 2 Vigías, Rastreador, Portador, Capitán. El Portador recibe la tarjeta del equipo.', 'Coordinación'],
    ['c5', 'Cada Operador escanea su tarjeta', 'Desde el QR "ENTRÁ AL JUEGO". Verificar que diga EQUIPO ROJO/AZUL/VERDE/AMARILLO.', 'Coordinación'],
    ['c6', 'Charla de seguridad (3 min)', 'Caminar, no correr · nadie se separa · las Sombras atrapan con luz, nunca tocando · Fogata = zona segura · botón SOS · punto de reunión.', 'Coordinación'],
    ['c7', '🎬 Intro → ▶ Iniciar', 'Panel: "Reproducir la intro" y al terminar "Iniciar".', 'Coordinación'],
  ]},
  { id: 'd', title: '4 · Durante y al final', when: 'Juego de ~75 minutos', items: [
    ['d1', 'Minuto 20 · 📦 Suministros x2', 'En una estación lejana, para mover a todos.', 'Coordinación'],
    ['d2', 'Minuto 35 · ⛈ Tormenta (5 min)', '', 'Coordinación'],
    ['d3', 'Minuto 50 · 🌑 Eclipse (5 min)', 'Avisar a las Sombras que salgan con todo.', 'Coordinación'],
    ['d4', 'Minuto 60 · ⏰ Cuenta regresiva de 15 min', '', 'Coordinación'],
    ['d5', 'Fin: TODOS a la Fogata y contar a los chicos', 'Conteo uno por uno antes de anunciar ganadores.', 'Todos'],
    ['d6', 'Premiación con la Pantalla', 'Primer Faro encendido, más puntos, mejor misión…', 'Coordinación'],
    ['d7', 'Recolectar QR y materiales', `Lista de QR: Refugio, 12 estaciones, ${CHESTS.length} cofres, ${GAME.teams.length} tarjetas.`, 'Todos'],
  ]},
];

// ---------------------------------------------------------------- render + guardado local
const key = 'check:' ;
const total = PHASES.reduce((a, p) => a + p.items.length, 0);
function renderPhases() {
  $('#phases').innerHTML = PHASES.map(p => `
    <section class="card phase"><h2>${esc(p.title)}</h2><div class="when">${esc(p.when)}</div>
      ${p.items.map(([id, t, d, who]) => {
        const done = ls.get(key + id) === '1';
        return `<label class="item${done ? ' done' : ''}"><input type="checkbox" data-id="${id}" ${done ? 'checked' : ''}>
          <div><b>${t}${who ? `<span class="who">${esc(who)}</span>` : ''}</b>${d ? `<span>${d}</span>` : ''}</div></label>`;
      }).join('')}
    </section>`).join('');
  updatePct();
}
function updatePct() {
  const n = PHASES.flatMap(p => p.items).filter(([id]) => ls.get(key + id) === '1').length;
  const pct = Math.round(n / total * 100);
  $('#pct').textContent = pct + '%'; $('#pctBar').style.width = pct + '%';
}
document.addEventListener('change', e => {
  const cb = e.target.closest('input[data-id]'); if (!cb) return;
  if (cb.checked) ls.set(key + cb.dataset.id, '1'); else ls.del(key + cb.dataset.id);
  cb.closest('.item').classList.toggle('done', cb.checked);
  updatePct();
});
renderPhases();

// ---------------------------------------------------------------- avisos de configuración
const warnings = [];
if (/000000/.test(GAME.coordinator.phone)) warnings.push(`📞 El teléfono de SOS todavía es de ejemplo (${esc(GAME.coordinator.phone)}). Cambialo en <code>js/config.js</code>.`);
function showWarnings(extra = []) {
  const all = [...warnings, ...extra];
  $('#warnings').innerHTML = all.length ? `<h3 style="color:var(--bad)">⚠ Pendientes detectados</h3>${all.map(w => `<p style="margin:6px 0">${w}</p>`).join('')}` : '<h3 style="color:var(--good)">✅ Sin pendientes de configuración</h3>';
}
showWarnings();

// ---------------------------------------------------------------- pruebas del celular
const st = (id, txt, cls = '') => { const el = $(id); el.textContent = txt; el.className = 'st ' + cls; };

$('#bCam').onclick = () => openScanner({ title: 'Prueba: escaneá cualquier QR del juego', onCode: raw => {
  const f = findByCode(raw);
  if (!f) return st('#tCam', 'Leyó algo, pero no es un código del juego', 'bad');
  const what = f.kind === 'station' ? `estación "${f.item.name}" (${resById[f.item.resource].icon})` : f.kind === 'team' ? `tarjeta del equipo ${f.item.name}` : f.kind === 'chest' ? `cofre ${f.item.id.toUpperCase()} (${CHEST_EFFECTS[f.item.effect]?.icon || ''})` : 'QR del Refugio';
  st('#tCam', `✅ Funciona: leyó ${what}`, 'ok'); vibrate(80);
}});

let gpsWatch = null;
$('#bGps').onclick = () => {
  if (!('geolocation' in navigator)) return st('#tGps', 'Este celular no tiene GPS en el navegador', 'bad');
  if (gpsWatch != null) { navigator.geolocation.clearWatch(gpsWatch); gpsWatch = null; $('#bGps').textContent = 'Probar'; return; }
  $('#bGps').textContent = 'Detener'; st('#tGps', 'Buscando señal…');
  gpsWatch = navigator.geolocation.watchPosition(
    p => { const a = Math.round(p.coords.accuracy); st('#tGps', `Precisión ±${a} m ${a <= 20 ? '✅ buena' : a <= 40 ? '· aceptable' : '· débil: salí de abajo de los árboles'}`, a <= 20 ? 'ok' : a <= 40 ? '' : 'bad'); },
    e => st('#tGps', e.code === 1 ? 'Permiso de ubicación denegado: activalo en el navegador' : 'Sin señal GPS todavía…', 'bad'),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 });
};

let client = null;
$('#bNet').onclick = async () => {
  st('#tNet', 'Conectando…');
  const t0 = performance.now();
  let first = true;
  client = client || await startClient({
    onState: s => {
      if (!first) return; first = false;
      const anchored = GAME.stations.filter(x => s.stations[x.id].lat != null).length;
      showWarnings(anchored < GAME.stations.length ? [`📍 Estaciones con GPS anclado: ${anchored} de ${GAME.stations.length}. Anclalas desde el panel durante el ensayo.`] : []);
    },
    onStatus: s => { lastNet = s; showNet(); },
  });
  clearInterval(netTimer); netTimer = setInterval(showNet, 2000);
  function showNet() {
    const s = lastNet || {};
    if (s.error) { clearInterval(netTimer); return st('#tNet', netText(s), 'bad'); }
    if (s.mode === 'demo') return st('#tNet', netText(s));
    if (s.online) { clearInterval(netTimer); return st('#tNet', `✅ En línea · respondió en ${((performance.now() - t0) / 1000).toFixed(1)} s`, 'ok'); }
    const secs = (performance.now() - t0) / 1000;
    st('#tNet', secs < 30 ? 'Conectando… (si pasa de 30 s, en este lugar no hay señal)' : '○ Sin señal acá: la app guarda y envía cuando vuelva', secs < 30 ? '' : 'bad');
  }
};
let lastNet = null, netTimer = null;

$('#bVib').onclick = () => { vibrate([120, 80, 120]); st('#tVib', navigator.vibrate ? '¿Vibró? Si no, revisá el modo silencio' : 'Este celular no vibra desde la web (iPhone): usen sonido', navigator.vibrate ? '' : 'bad'); };
$('#bVoz').onclick = async () => {
  if (!canSpeak()) return st('#tVoz', 'Este navegador no puede leer en voz alta', 'bad');
  st('#tVoz', 'Hablando…'); await speak('Equipos Rojo, Azul, Verde y Amarillo… el Apagón comienza ahora.'); st('#tVoz', '¿Se escuchó bien? Si no, subí el volumen', 'ok');
};
$('#bBat').onclick = async () => {
  try { const b = await navigator.getBattery(); const p = Math.round(b.level * 100); st('#tBat', `${p}%${b.charging ? ' (cargando)' : ''} ${p >= 70 ? '✅' : '· conviene cargar'}`, p >= 70 ? 'ok' : 'bad'); }
  catch { st('#tBat', 'Este celular no informa la batería a la web (iPhone): revisala a mano'); }
};
