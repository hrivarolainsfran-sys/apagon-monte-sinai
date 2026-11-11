# APAGÓN · Juego Nocturno
Juego nocturno híbrido (QR + GPS) para el Campamento Monte Sinaí.

## Qué hay en la carpeta
| Archivo | Para quién | Qué hace |
|---|---|---|
| `index.html` | Jugadores (Operador de cada equipo) | Mochila, Refugio, radar GPS, escáner QR, SOS |
| `sombra.html` | Monitores-Sombra (PIN de Sombra) | Escanean la tarjeta del equipo que iluminaron → pierde 50% de la mochila |
| `admin.html` | Coordinación (PIN de admin) | Iniciar/pausar, ranking en vivo, mensajes, ajustes, **anclar GPS de estaciones** |
| `pantalla.html` | Proyector o TV en la Fogata | Ranking en vivo, fuego de cada equipo y anuncios grandes (capturas, Faros, mensajes). Solo lee: no hace falta PIN |
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
