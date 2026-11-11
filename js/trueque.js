// Trueque en el Refugio: un monitor de la Fogata registra un intercambio de recursos entre dos equipos.
import { GAME } from './config.js';
import { RES, teamById, fmtRes, total, STATUS_TEXT, effectiveStatus, zero } from './engine.js';
import { startClient, serverNow } from './backend.js';
import { $, esc, vibrate, netText, brandHeader, pinGate, registerSW } from './ui.js';

let client, state;
const sel = { A: null, B: null };
const give = { A: zero(), B: zero() };
$('#brand').innerHTML = brandHeader();
registerSW();

function side(k) {
  const other = k === 'A' ? 'B' : 'A';
  const t = sel[k] && teamById[sel[k]], bank = t && state ? state.teams[t.id].bank : null;
  return `<h3>${k === 'A' ? 'Equipo 1' : 'Equipo 2'}${t ? ` · <span style="color:${t.color}">${esc(t.name)}</span> entrega:` : ''}</h3>
    <div class="pick">${GAME.teams.map(x => `<button style="--c:${x.color}" class="${sel[k] === x.id ? 'on' : ''}" data-pick="${k}:${x.id}" ${sel[other] === x.id ? 'disabled' : ''}>${esc(x.name)}</button>`).join('')}</div>
    ${t ? RES.map(r => `<div class="step"><span>${r.icon}</span><span>${esc(r.name)}</span><span class="muted" style="font-size:.8rem">tiene ${bank[r.id]}</span>
      <button data-step="${k}:${r.id}:-1">−</button><span class="n">${give[k][r.id]}</span><button data-step="${k}:${r.id}:1" ${give[k][r.id] >= bank[r.id] ? 'disabled' : ''}>+</button></div>`).join('') : '<p class="muted">Elegí el equipo.</p>'}`;
}

function render() {
  if (state) {
    const status = effectiveStatus(state, serverNow());
    $('#statusBanner').textContent = STATUS_TEXT[status].replace(/^🔴 /, '');
    $('#statusBanner').className = 'status-banner ' + status;
    // si un equipo ya no tiene lo que iba a dar (otro trueque o ajuste), recortar
    for (const k of ['A', 'B']) if (sel[k]) for (const r of RES) give[k][r.id] = Math.min(give[k][r.id], state.teams[sel[k]].bank[r.id]);
  }
  $('#sideA').innerHTML = side('A');
  $('#sideB').innerHTML = side('B');
  const ready = sel.A && sel.B && (total(give.A) || total(give.B));
  $('#summary').innerHTML = ready
    ? `<b style="color:${teamById[sel.A].color}">${esc(teamById[sel.A].name)}</b> da ${fmtRes(give.A)}<br>⇅<br><b style="color:${teamById[sel.B].color}">${esc(teamById[sel.B].name)}</b> da ${fmtRes(give.B)}`
    : '<span class="muted">Elegí los dos equipos y qué entrega cada uno.</span>';
  $('#confirmBtn').disabled = !ready;
}

document.addEventListener('click', e => {
  const p = e.target.closest('[data-pick]');
  if (p) { const [k, id] = p.dataset.pick.split(':'); sel[k] = sel[k] === id ? null : id; give[k] = zero(); render(); }
  const s = e.target.closest('[data-step]');
  if (s) { const [k, r, d] = s.dataset.step.split(':'); give[k][r] = Math.max(0, give[k][r] + Number(d)); render(); }
});

function showResult(res) {
  $('#result').classList.toggle('bad', !res.ok);
  $('#result').classList.toggle('ok', !!res.ok);
  $('#resultIcon').textContent = res.ok ? '🤝' : '✖';
  $('#resultText').textContent = res.text;
  $('#result').classList.remove('hidden');
  vibrate(res.ok ? [80, 50, 200] : [250, 80, 250]);
}
$('#resultOk').onclick = () => $('#result').classList.add('hidden');

$('#confirmBtn').onclick = async () => {
  const a = teamById[sel.A].name, b = teamById[sel.B].name;
  if (!confirm(`¿Confirmar?\n${a} da ${fmtRes(give.A)}\n${b} da ${fmtRes(give.B)}`)) return;
  const res = await client.send('trade', { teamA: sel.A, teamB: sel.B, giveA: { ...give.A }, giveB: { ...give.B } });
  showResult(res);
  if (res.ok) { give.A = zero(); give.B = zero(); sel.A = sel.B = null; render(); }
};

render();
pinGate([GAME.sombraPinHash, GAME.adminPinHash], 'sombra', async () => {
  client = await startClient({ onState: s => { state = s; render(); }, onStatus: st => { $('#net').textContent = netText(st); } });
});
