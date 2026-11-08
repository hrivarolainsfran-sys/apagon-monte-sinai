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
  coordinator: { name: 'Coordinación del campamento', phone: '+595 981 000000' },

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
    faroGoal: { agua: 6, energia: 6, medicina: 6, senal: 6 }, // para encender el Faro de Rescate
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

  base: { code: 'APG-B-RF7K2', name: 'Refugio (Base)' },

  teams: [
    { id: 't1', name: 'Rojo',     color: '#ff3b30', code: 'APG-T-RJ4M7' },
    { id: 't2', name: 'Azul',     color: '#2f8cff', code: 'APG-T-AZ9C2' },
    { id: 't3', name: 'Verde',    color: '#34c759', code: 'APG-T-VD3P8' },
    { id: 't4', name: 'Amarillo', color: '#ffd60a', code: 'APG-T-AM6W5' },
  ],

  // uses = cuántas veces se puede saquear en total (entre todos los equipos) antes de agotarse.
  // lat/lng se cargan desde el panel admin con "Anclar aquí" (no hace falta escribirlas).
  // radar:false = estación secreta, no aparece en el radar.
  stations: [
    { id: 's01', code: 'APG-S-W8KD3', name: 'Pozo Viejo',          resource: 'agua',     amount: 1, uses: 15 },
    { id: 's02', code: 'APG-S-A2RX9', name: 'Arroyo Oscuro',       resource: 'agua',     amount: 2, uses: 10 },
    { id: 's03', code: 'APG-S-T5NB4', name: 'Tanque Roto',         resource: 'agua',     amount: 3, uses: 6, radar: false },
    { id: 's04', code: 'APG-S-G7PM2', name: 'Generador',           resource: 'energia',  amount: 1, uses: 15 },
    { id: 's05', code: 'APG-S-E3VH8', name: 'Torre Eléctrica',     resource: 'energia',  amount: 2, uses: 10 },
    { id: 's06', code: 'APG-S-B9QJ6', name: 'Batería Abandonada',  resource: 'energia',  amount: 3, uses: 6, radar: false },
    { id: 's07', code: 'APG-S-M4CF7', name: 'Enfermería',          resource: 'medicina', amount: 1, uses: 15 },
    { id: 's08', code: 'APG-S-K6LT3', name: 'Botiquín Perdido',    resource: 'medicina', amount: 2, uses: 10 },
    { id: 's09', code: 'APG-S-C8YW5', name: 'Carpa Médica',        resource: 'medicina', amount: 3, uses: 6, radar: false },
    { id: 's10', code: 'APG-S-N2HZ8', name: 'Antena',              resource: 'senal',    amount: 1, uses: 15 },
    { id: 's11', code: 'APG-S-R5DU4', name: 'Radio del Guardia',   resource: 'senal',    amount: 2, uses: 10 },
    { id: 's12', code: 'APG-S-V3XE9', name: 'Colina del Eco',      resource: 'senal',    amount: 3, uses: 6, radar: false },
  ],
};
