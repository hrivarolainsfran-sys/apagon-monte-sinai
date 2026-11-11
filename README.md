# APAGÓN · Juego Nocturno
Juego nocturno híbrido (QR + GPS) para el Campamento Monte Sinaí.

## Qué hay en la carpeta
| Archivo | Para quién | Qué hace |
|---|---|---|
| `index.html` | Jugadores (Operador de cada equipo) | Mochila, Refugio, radar GPS, escáner QR, SOS |
| `sombra.html` | Monitores-Sombra (PIN de Sombra) | Escanean la tarjeta del equipo que iluminaron → pierde 50% de la mochila |
| `admin.html` | Coordinación (PIN de admin) | Iniciar/pausar, ranking en vivo, mensajes, ajustes, **anclar GPS de estaciones** |
| `pantalla.html` | Proyector o TV en la Fogata | Ranking en vivo, fuego de cada equipo y anuncios grandes (capturas, Faros, mensajes). Solo lee: no hace falta PIN |
| `mision.html` | Monitores de cada puesto de misión (PIN de Sombra) | Muestra el reto; si el equipo lo logra, escanean su tarjeta y reciben el premio |
| `trueque.html` | Monitor de la Fogata (PIN de Sombra) | Registra trueques de recursos del Refugio entre dos equipos |
| `imprimir.html` | Organización | Todos los QR listos para imprimir: inicio, Refugio, 12 estaciones y 4 tarjetas de equipo (Rojo, Azul, Verde, Amarillo) |
| `js/config.js` | Organización | Equipos, estaciones, recursos, reglas, PINs, teléfono SOS |

Para agregar un logo, poné la imagen en esta carpeta y escribí su nombre en `brand.logo` de `js/config.js`.

## Puesta en marcha (unas 2 horas, gratis)
1. **Firebase (la base de datos en vivo)**
   - Entrá a https://console.firebase.google.com → *Agregar proyecto* (sin Analytics).
   - *Compilación → Firestore Database → Crear base de datos* (ubicación `southamerica-east1`, São Paulo).
   - En *Reglas*, pegá el contenido de `firestore.rules` y publicá.
   - *Configuración del proyecto → Tus apps → Web (</>)* → copiá el objeto `firebaseConfig` y pegalo en `js/config.js` en `firebase: { ... }`.
2. **Editá `js/config.js`**: PINs (como hash, ver comentario en el archivo), teléfono de coordinación, nombres de equipos y estaciones, cantidades.
3. **Publicá la carpeta** (necesita HTTPS para cámara y GPS):
   - Lo más fácil: https://app.netlify.com/drop → arrastrá la carpeta `apagon` (con cuenta gratis queda fija).
   - Copiá la URL que te da y ponela en `publicUrl` de `config.js`; volvé a subir.
4. **Imprimí** `imprimir.html` (papel mate, plastificado sin brillo, mínimo 10 cm).
5. **Al atardecer, anclá las estaciones**: andá con un celular a cada QR escondido, abrí `admin.html` → *Activar mi GPS* → esperá ±15 m → *Anclar aquí*. Las estaciones "secretas" no aparecen en el radar.
6. **Prueba general de noche** con 2 o 3 celulares baratos (Android + iPhone): escanear, capturar, depositar, ver el ranking.

## Eventos especiales (desde el panel de coordinación)
| Evento | Qué pasa | Cuándo usarlo |
|---|---|---|
| ⛈ **Tormenta** | El radar deja de funcionar | Cuando los equipos dependen demasiado del celular |
| 📦 **Lluvia de suministros** | Una estación elegida da el DOBLE y se anuncia dónde está | Para mover a todos hacia una zona y generar choques |
| 🌑 **Eclipse** | Si una Sombra los ilumina, pierden TODA la mochila | Momento de máxima tensión, 5 min |
| ⏰ **Cuenta regresiva** | Reloj visible en todos los celulares y en la Fogata; en cero el juego termina solo | Los últimos 10–15 minutos |

Todos avisan a los celulares y salen en grande en la Pantalla de la Fogata. Se pueden terminar antes con "Terminar".
Para practicar sin tocar la partida real, agregá `?demo` al final de cualquier dirección.

## Cofres sorpresa
6 QR de un solo uso (sección 3 de la hoja de impresión). El primer equipo que escanea uno se queda con el contenido; los demás ven "llegaron tarde". El contenido es secreto (en el panel se ve cuál es cuál):

| Cofre | Contenido |
|---|---|
| 🎁 Envío al Refugio | +3 de un recurso directo al Refugio (ya a salvo) |
| ⭐ Tesoro | +40 puntos |
| 🛡 Escudo | Las Sombras no los pueden atrapar por 5 minutos |
| 📜 Mapa del tesoro | Les revela dónde hay una estación secreta |
| 💥 Trampa | ¡Emboscada! Pierden la mitad de la mochila |

Se cambian en `chests` de `js/config.js`.

## Misiones de grupo
6 puestos atendidos por un monitor con `mision.html`. Cada equipo puede hacer cada misión una vez; si lo logra, el monitor escanea su tarjeta.
Las fichas con el reto y los materiales se imprimen en la sección 5 de la hoja de impresión.

| Misión | Dónde | Premio |
|---|---|---|
| 🔦 Guía en la oscuridad | Cancha de Fútbol | +2 ⚡ al Refugio |
| 📡 Mensaje en Morse | Cancha de Vóley | +2 📡 al Refugio |
| 💧 Cadena de agua | Pileta | +2 💧 al Refugio |
| ✚ Triaje de emergencia | Cabañas del centro | +2 ✚ al Refugio |
| 🧠 Memoria del Apagón | Cerca de la Fogata | +30 pts |
| ⭕ Aro sin soltarse | Galpón junto al Tanque | +30 pts |

Se cambian en `missions` de `js/config.js`.

## Intro narrada
Con todos reunidos en la Fogata: en la pantalla tocá **🔇 Activar sonido**, y desde el panel tocá **🎬 Reproducir la intro** (≈ 70 s, con voz, ambiente y el título APAGÓN al final). Después, **▶ Iniciar**.
La pantalla también tiene un botón **🎬 Ver intro** para ensayar. Los chicos pueden releer la historia en su celular ("📜 La historia del Apagón").
El texto se cambia en `intro` de `js/config.js`. Para usar tu propia voz grabada, subí el audio a la carpeta y poné su nombre en `intro.audio`.

## Seguridad: mapa en vivo
Mientras el juego está en marcha, el celular de cada Operador envía su ubicación cada minuto, **cifrada**: solo el panel de coordinación (con el PIN de admin) puede leerla. El panel muestra un mapa con el Refugio, las estaciones y los equipos, y avisa si un equipo sale de la zona (250 m del Refugio), si deja de reportar o si tiene poca batería. Cada equipo tiene un enlace "Abrir en Google Maps".
⚠ La clave de cifrado está atada al PIN de admin: si cambiás ese PIN, hay que regenerarla.

## Trueque, bengala y premiación
- 🤝 **Trueque**: en la Fogata, con los dos Capitanes presentes, el monitor registra el intercambio en `trueque.html` (solo recursos del Refugio).
- 🎆 **Cofre Bengala (C7)**: encandila el radar del equipo que va primero (o del segundo, si lo abre el primero) por 5 minutos.
- 🏆 **Premiación**: panel → "Premiación en la Fogata". Menciones (primer Faro, más misiones, más saqueos, mejores negociadores, los más valientes, mejor Sombra), podio y la reflexión de cierre (`cierre` en `js/config.js`), que queda en pantalla hasta tocar "Cerrar".

## Cómo se juega (para explicar a los chicos)
- Juntan 💧 Agua, ⚡ Energía, ✚ Medicina y 📡 Señal escaneando estaciones escondidas.
- La mochila aguanta **6**. Hay que volver al **Refugio** y escanear su QR para asegurar lo que llevan.
- Si una **Sombra** los ilumina con la linterna, el Portador entrega la tarjeta del equipo → pierden la **mitad de la mochila** (lo del Refugio está a salvo). Después tienen 3 min de inmunidad.
- Cada estación se puede volver a saquear a los 4 min y **se agota** después de cierta cantidad de usos en total.
- Con 7 de cada recurso en el Refugio encienden el **Faro de Rescate** (+100 / +60 / +40 / +20 pts al 1°, 2°, 3° y 4°).
- **Interferencia:** si la pantalla queda encendida 60 s seguidos, la app se bloquea 30 s. Apagar y prender la pantalla reinicia el contador.

## Notas técnicas
- **Modo demo:** con `firebase: null` todo funciona, pero los datos quedan solo en ese dispositivo (útil para probar).
- **Sin señal:** la app guarda los escaneos en el celular y los envía cuando vuelve la señal (aparece "○ sin señal · N por enviar").
- **Partida nueva:** *Reiniciar partida* en el admin (conserva el GPS de las estaciones), o cambiá `gameId` en `config.js`.
- **iPhone:** la linterna no se puede prender desde la web y no vibra; el Vigía alumbra de costado y el radar puede usar sonido.
- **Seguridad:** los PIN solo frenan curiosos; no publiques el link de `admin.html`.
- Si cambiás archivos después de publicar, subí `CACHE` en `sw.js` (`apagon-v2`, …) para que los celulares se actualicen.
