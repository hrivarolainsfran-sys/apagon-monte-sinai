// =====================================================================
//  APAGÓN — Configuración del juego
//  Editá este archivo para adaptar el juego a tu campamento.
// =====================================================================

export const GAME = {
  // Cambiá este ID para empezar una partida totalmente nueva (otra "sala").
  gameId: 'apagon-monte-sinai-2026',
  title: 'APAGÓN',
  // logo: nombre de un archivo de imagen en la carpeta (ej. 'logo.png'); vacío = sin logo.
  brand: { name: 'Juego Nocturno', tagline: 'Campamento Monte Sinaí', logo: '' },

  // PINs guardados como hash SHA-256 de "apagon:<PIN>" (así no se leen en el código público).
  // Para cambiar uno, en la Terminal de Mac:  printf 'apagon:NUEVOPIN' | shasum -a 256
  adminPinHash: 'e188c438b68baa91d86a0a176f85802bc6b0a37f1f8efee639212770487f6c76',  // panel de administración
  sombraPinHash: '0f40e4025c73d018ea5430a4126fd54be3c4f14b703c4f4ada88bdb9d5765a65', // modo Sombra (monitores cazadores)

  // Contacto que aparece al tocar el botón SOS
  coordinator: { name: 'Coordinación del campamento', phone: '+595 986 629 003' },

  // URL pública donde va a quedar alojada la app (para el QR de inicio).
  // Si la dejás vacía se usa la dirección desde donde abrís imprimir.html.
  publicUrl: '',

  // ---------------------------------------------------------------
  //  FIREBASE: pegá acá la configuración de tu proyecto.
  //  Si queda en null, la app corre en MODO DEMO (datos solo en ese
  //  dispositivo; sirve para probar, NO para jugar con varios celulares).
  // ---------------------------------------------------------------
  // (Esta configuración web de Firebase es pública por diseño; la protección está en firestore.rules.)
  firebase: {
    apiKey: 'AIzaSyAPMrWtfp53Zrbf0p1jC-zOYkIjlC1CZZc',
    authDomain: 'apagon-monte-sinai.firebaseapp.com',
    projectId: 'apagon-monte-sinai',
    storageBucket: 'apagon-monte-sinai.firebasestorage.app',
    messagingSenderId: '523054484390',
    appId: '1:523054484390:web:de4610716856f97ec3dd67',
  },

  resources: [
    { id: 'agua',     name: 'Agua',     icon: '💧', points: 10 },
    { id: 'energia',  name: 'Energía',  icon: '⚡', points: 10 },
    { id: 'medicina', name: 'Medicina', icon: '✚', points: 15 },
    { id: 'senal',    name: 'Señal',    icon: '📡', points: 15 },
  ],

  rules: {
    backpackMax: 6,              // cuántos recursos puede llevar un equipo antes de volver a la base
    faroGoal: { agua: 7, energia: 7, medicina: 7, senal: 7 }, // para encender el Faro de Rescate
    faroBonus: [100, 60, 40, 20], // puntos extra para el 1°, 2°, 3°, 4° faro encendido
    cooldownMin: 4,              // minutos antes de que un equipo pueda volver a saquear la misma estación
    captureLossPct: 50,          // % de la mochila que se pierde al ser iluminado por una Sombra
    captureImmunitySec: 180,     // segundos de inmunidad después de una captura
    interferenceSec: 60,         // segundos seguidos con la pantalla encendida antes de la "interferencia" (0 = desactivado)
    interferenceLockSec: 30,     // segundos que dura el bloqueo por interferencia
    // Bandas del radar GPS (metros). El GPS en el monte tiene 10-30 m de error: no achiques demasiado.
    radarBands: [
      { max: 15,       level: 4, label: '¡AQUÍ CERCA!' },
      { max: 35,       level: 3, label: 'CALIENTE' },
      { max: 70,       level: 2, label: 'TIBIO' },
      { max: Infinity, level: 1, label: 'FRÍO' },
    ],
  },

  base: { code: 'APG-B-RF7K2', name: 'Refugio (Base)', lugar: 'La Fogata (zona segura: las Sombras no atrapan a menos de 15 m)' },

  teams: [
    { id: 't1', name: 'Rojo',     color: '#ff3b30', code: 'APG-T-RJ4M7' },
    { id: 't2', name: 'Azul',     color: '#2f8cff', code: 'APG-T-AZ9C2' },
    { id: 't3', name: 'Verde',    color: '#34c759', code: 'APG-T-VD3P8' },
    { id: 't4', name: 'Amarillo', color: '#ffd60a', code: 'APG-T-AM6W5' },
  ],

  // uses = cuántas veces se puede saquear en total (entre todos los equipos) antes de agotarse.
  // lat/lng se cargan desde el panel admin con "Anclar aquí" (no hace falta escribirlas).
  // radar:false = estación secreta, no aparece en el radar.
  // lugar = dónde esconderla en el Campamento Monte Sinaí (sale impreso en la tarjeta de la estación).
  // Cada recurso tiene una estación al norte, una al centro/sur y una secreta en el bosque,
  // para que los equipos tengan que cruzar todo el campamento.
  stations: [
    { id: 's01', code: 'APG-S-W8KD3', name: 'Pozo Viejo',          resource: 'agua',     amount: 1, uses: 10, lugar: 'Base del Tanque de Agua' },
    { id: 's02', code: 'APG-S-A2RX9', name: 'Arroyo Oscuro',       resource: 'agua',     amount: 2, uses: 7,  lugar: 'Pileta (cerco o máquina de bombeo)' },
    { id: 's03', code: 'APG-S-T5NB4', name: 'Tanque Roto',         resource: 'agua',     amount: 3, uses: 4,  lugar: 'Bosque al este del Tanque, a 20–30 m del borde', radar: false },
    { id: 's04', code: 'APG-S-G7PM2', name: 'Generador',           resource: 'energia',  amount: 1, uses: 10, lugar: 'Galpón grande junto al Tanque' },
    { id: 's05', code: 'APG-S-E3VH8', name: 'Torre Eléctrica',     resource: 'energia',  amount: 2, uses: 7,  lugar: 'Arco sur de la Cancha de Fútbol' },
    { id: 's06', code: 'APG-S-B9QJ6', name: 'Batería Abandonada',  resource: 'energia',  amount: 3, uses: 4,  lugar: 'Bosque oeste, detrás de las cabañas del norte', radar: false },
    { id: 's07', code: 'APG-S-M4CF7', name: 'Enfermería',          resource: 'medicina', amount: 1, uses: 10, lugar: 'Cabañas del centro (la más grande)' },
    { id: 's08', code: 'APG-S-K6LT3', name: 'Botiquín Perdido',    resource: 'medicina', amount: 2, uses: 7,  lugar: 'Cancha de Vóley (poste de la red)' },
    { id: 's09', code: 'APG-S-C8YW5', name: 'Carpa Médica',        resource: 'medicina', amount: 3, uses: 4,  lugar: 'Borde del bosque sudoeste, cabaña aislada', radar: false },
    { id: 's10', code: 'APG-S-N2HZ8', name: 'Antena',              resource: 'senal',    amount: 1, uses: 10, lugar: 'Camino central, entre cabañas y Cancha de Vóley' },
    { id: 's11', code: 'APG-S-R5DU4', name: 'Radio del Guardia',   resource: 'senal',    amount: 2, uses: 7,  lugar: 'Entrada / camino sur del campamento' },
    { id: 's12', code: 'APG-S-V3XE9', name: 'Colina del Eco',      resource: 'senal',    amount: 3, uses: 4,  lugar: 'Cabañas del sudeste, junto al bosque', radar: false },
  ],

  // Cofres sorpresa: QR de un solo uso. El PRIMER equipo que lo escanea se queda con el contenido.
  // El contenido no se imprime en la tarjeta: es sorpresa (los monitores lo ven en el panel).
  // effect: 'refugio' (+amount de un recurso directo al Refugio) · 'puntos' (+amount puntos)
  //         'escudo' (inmune a las Sombras por amount minutos) · 'mapa' (revela una estación secreta)
  //         'trampa' (¡emboscada! pierden la mitad de la mochila)
  chests: [
    { id: 'c1', code: 'APG-C-YTYZ8', effect: 'refugio', resource: 'medicina', amount: 3, lugar: 'Detrás de la Fogata, en lo oscuro (a unos 30 m)' },
    { id: 'c2', code: 'APG-C-7VQ6W', effect: 'trampa',                                 lugar: 'Pileta, debajo de una reposera o en una esquina' },
    { id: 'c3', code: 'APG-C-ZE52P', effect: 'escudo', amount: 5,                       lugar: 'Arco norte de la Cancha de Fútbol' },
    { id: 'c4', code: 'APG-C-Y8ME5', effect: 'mapa',                                   lugar: 'Galpón detrás del Tanque de Agua' },
    { id: 'c5', code: 'APG-C-4W4WY', effect: 'refugio', resource: 'senal', amount: 3,    lugar: 'Cabaña más lejana del sudeste' },
    { id: 'c6', code: 'APG-C-EQK4N', effect: 'puntos', amount: 40,                      lugar: 'Borde del bosque oeste, junto al camino' },
  ],

  // Misiones de grupo: puestos atendidos por un monitor (página mision.html).
  // El equipo hace el reto; si lo logra, el monitor escanea su tarjeta y reciben la recompensa.
  // Cada equipo puede completar cada misión una sola vez.
  // reward: { type: 'refugio', resource, amount }  → recursos directo al Refugio
  //         { type: 'puntos', amount }             → puntos extra
  missions: [
    { id: 'm1', icon: '🔦', name: 'Guía en la oscuridad', lugar: 'Cancha de Fútbol (centro)', tiempo: '3 min',
      reward: { type: 'refugio', resource: 'energia', amount: 2 },
      reto: 'Todo el equipo con los ojos vendados, menos el Guía. El Guía, SIN tocarlos y solo con la voz, los lleva por un recorrido de 6 conos y de vuelta. Si alguien toca un cono, vuelve al inicio.',
      materiales: '6 conos o botellas, vendas para los ojos' },
    { id: 'm2', icon: '📡', name: 'Mensaje en Morse', lugar: 'Cancha de Vóley', tiempo: '3 min',
      reward: { type: 'refugio', resource: 'senal', amount: 2 },
      reto: 'El monitor transmite con la linterna una palabra corta en Morse (ej. LUZ, FARO, SOS, AGUA). El equipo tiene una tabla Morse impresa y debe descifrarla antes de que se acabe el tiempo. Se puede repetir la transmisión 2 veces.',
      materiales: 'Linterna, tabla Morse impresa (una por equipo), lista de palabras' },
    { id: 'm3', icon: '💧', name: 'Cadena de agua', lugar: 'Pileta', tiempo: '2 min',
      reward: { type: 'refugio', resource: 'agua', amount: 2 },
      reto: 'En fila, pasando un vaso de mano en mano (sin caminar con el vaso), llenar una botella hasta la marca. El primero carga en el balde; el último vuelca en la botella.',
      materiales: 'Balde con agua, 1 vaso por equipo, botella de 2 L con una marca' },
    { id: 'm4', icon: '✚', name: 'Triaje de emergencia', lugar: 'Cabañas del centro (Enfermería)', tiempo: '2 min',
      reward: { type: 'refugio', resource: 'medicina', amount: 2 },
      reto: 'Uno del equipo hace de "herido". Los demás le arman un cabestrillo en el brazo y un vendaje en la cabeza, y lo trasladan sentado en una "silla de manos" 10 pasos. El monitor revisa que todo esté firme.',
      materiales: '2 vendas o pañuelos triangulares, cinta' },
    { id: 'm5', icon: '🧠', name: 'Memoria del Apagón', lugar: 'Cerca de la Fogata (a 20 m, en lo oscuro)', tiempo: '1 min',
      reward: { type: 'puntos', amount: 30 },
      reto: 'El monitor ilumina 10 objetos durante 20 segundos y después los tapa. El equipo tiene 1 minuto para nombrar al menos 8. Cambiar algún objeto entre equipo y equipo.',
      materiales: '12–15 objetos chicos, una tela para taparlos, linterna' },
    { id: 'm6', icon: '⭕', name: 'Aro sin soltarse', lugar: 'Galpón junto al Tanque de Agua', tiempo: '1 min',
      reward: { type: 'puntos', amount: 30 },
      reto: 'Todo el equipo en ronda, tomados de las manos. Tienen que pasar un aro por todos los cuerpos y que vuelva al inicio SIN soltarse las manos, en menos de 60 segundos.',
      materiales: 'Un aro (hula-hula), cronómetro' },
  ],

  // Intro narrada: se reproduce en la Pantalla de la Fogata (botón en el panel de coordinación).
  // La voz la pone el navegador (síntesis de voz en español). Si preferís grabar tu propia voz,
  // subí un archivo de audio a la carpeta y poné su nombre en `audio` (ej. 'intro.mp3'):
  // entonces suena tu grabación y los textos van apareciendo al ritmo de `segundos`.
  intro: {
    audio: '',
    lines: [
      { texto: 'Campamento Monte Sinaí. Veintiuna horas.', segundos: 5 },
      { texto: 'Hace una hora, una tormenta cortó la luz en toda la región. Las radios se callaron. Los caminos quedaron a oscuras.', segundos: 9 },
      { texto: 'No sabemos cuánto va a durar el apagón. Pero sí sabemos algo: no estamos solos.', segundos: 7 },
      { texto: 'En el monte se mueven las Sombras. No hacen ruido. Buscan la luz. Si los iluminan, se llevan lo que cargan.', segundos: 9 },
      { texto: 'Para pedir rescate hay que encender el Faro: agua, energía, medicina y señal. Siete de cada uno.', segundos: 8 },
      { texto: 'Los recursos están escondidos por todo el campamento. El radar de sus celulares los va a guiar… mientras haya señal.', segundos: 8 },
      { texto: 'Esta Fogata es el Refugio. Todo lo que traigan hasta aquí, está a salvo.', segundos: 6 },
      { texto: 'Nadie camina solo. Caminen, no corran. Cuiden a su equipo.', segundos: 6 },
      { texto: 'Equipos Rojo, Azul, Verde y Amarillo… el Apagón comienza ahora.', segundos: 6 },
    ],
  },
};
