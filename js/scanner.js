// Escáner QR a pantalla completa con linterna y entrada manual de respaldo.
// Usa la librería html5-qrcode (cargada en el HTML como script global).
let current = null;

export function isScannerOpen() { return !!current; }

export function openScanner({ title = 'Escaneá un código', hint = '', onCode }) {
  closeScanner();
  const ov = document.createElement('div');
  ov.className = 'overlay scanner';
  ov.innerHTML = `
    <h2>${title}</h2>
    ${hint ? `<p class="muted">${hint}</p>` : ''}
    <div id="qr-reader"></div>
    <div class="row" style="margin-top:10px">
      <button type="button" data-a="torch">🔦 Linterna</button>
      <button type="button" data-a="close">✕ Cerrar</button>
    </div>
    <form class="row manual">
      <input placeholder="o escribí el código (ej. APG-S-XXXXX)" autocapitalize="characters" autocomplete="off">
      <button class="primary">OK</button>
    </form>
    <p class="muted" data-msg></p>`;
  document.body.append(ov);
  const msg = t => { ov.querySelector('[data-msg]').textContent = t; };
  let done = false;
  const finish = code => { if (done) return; done = true; closeScanner(); onCode(code); };

  ov.querySelector('[data-a=close]').onclick = () => closeScanner();
  ov.querySelector('form').addEventListener('submit', e => {
    e.preventDefault();
    const v = ov.querySelector('input').value.trim();
    if (v) finish(v);
  });

  const sc = window.Html5Qrcode ? new window.Html5Qrcode('qr-reader', { verbose: false }) : null;
  current = { ov, sc };
  if (!sc) { msg('El escáner no cargó (¿sin internet la primera vez?). Escribí el código a mano.'); return; }

  sc.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: (w, h) => { const m = Math.floor(Math.min(w, h) * 0.8); return { width: m, height: m }; } },
    text => finish(text),
    () => {}
  ).catch(err => msg('No se pudo abrir la cámara (' + (err?.message || err) + '). Revisá el permiso de cámara o escribí el código.'));

  let torch = false;
  ov.querySelector('[data-a=torch]').onclick = async () => {
    try {
      await sc.applyVideoConstraints({ advanced: [{ torch: !torch }] });
      torch = !torch;
      msg(torch ? 'Linterna encendida' : '');
    } catch {
      msg('Este celular no deja prender la linterna desde la web (pasa en iPhone). Que el Vigía alumbre de costado.');
    }
  };
}

export function closeScanner() {
  if (!current) return;
  const { ov, sc } = current;
  current = null;
  ov.style.display = 'none';
  const cleanup = () => { try { sc && sc.clear(); } catch {} ov.remove(); };
  try {
    if (sc && sc.isScanning) sc.stop().catch(() => {}).finally(cleanup);
    else cleanup();
  } catch { cleanup(); }
}
