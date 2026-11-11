// Puesto de misión: el monitor elige su misión, pone el reto y, si el equipo lo logra,
// escanea la tarjeta del equipo para darle la recompensa.
import { GAME } from './config.js';
import { teamById, findByCode, STATUS_TEXT, MISSIONS, missionById, rewardText, effectiveStatus } from './engine.js';
import { startClient, serverNow } from './backend.js';
import { openScanner } from './scanner.js';
import { $, esc, ls, vibrate, netText, brandHeader, pinGate, registerSW } from './ui.js';

let client, state;
$('#brand').innerHTML = brandHeader();
registerSW();

const sel = $('#mission');
sel.innerHTML = MISSIONS.map(m => `<option value="${m.id}">${m.icon} ${esc(m.name)} — ${esc(m.lugar)}</option>`).join('');
if (missionById[ls.get('mission')]) sel.value = ls.get('mission');
sel.onchange = () => { ls.set('mission', sel.value); render(); };
const current = () => missionById[sel.value];

function render() {
  const m = current();
  if (m) {
    $('#mTitle').textContent = `${m.icon} ${m.name}`;
    $('#mReto').textContent = m.reto;
    $('#mMeta').innerHTML = [
      `<span class="chip suministros">🏆 ${esc(rewardText(m.reward))}</span>`,
      m.tiempo ? `<span class="chip">⏱ ${esc(m.tiempo)}</span>` : '',
      `<span class="chip">📍 ${esc(m.lugar)}</span>`,
      m.materiales ? `<span class="chip">🧰 ${esc(m.materiales)}</span>` : '',
    ].join('');
  }
  if (!state) return;
  const status = effectiveStatus(state, serverNow());
  $('#statusBanner').textContent = STATUS_TEXT[status].replace(/^🔴 /, '');
  $('#statusBanner').className = 'status-banner ' + status;
  $('#teams').innerHTML = GAME.teams.map(t => {
    const done = m && state.teams[t.id].missions[m.id];
    return `<button class="team-btn${done ? ' done' : ''}" data-team="${t.id}" ${done ? 'disabled' : ''}>
      <span><span class="dot" style="background:${t.color};color:${t.color}"></span><b>${esc(t.name)}</b></span>
      <span class="muted">${done ? '✅ completada' : 'pendiente'}</span></button>`;
  }).join('');
}

function showResult(res) {
  $('#result').classList.toggle('bad', !res.ok);
  $('#result').classList.toggle('ok', !!res.ok);
  $('#resultIcon').textContent = res.ok ? '💪' : '✖';
  $('#resultText').textContent = res.text;
  $('#result').classList.remove('hidden');
  vibrate(res.ok ? [80, 50, 200] : [250, 80, 250]);
}
$('#resultOk').onclick = () => $('#result').classList.add('hidden');

async function complete(teamId) {
  const m = current();
  if (!m) return;
  showResult(await client.send('mission_done', { teamId, missionId: m.id }));
}
$('#scanBtn').onclick = () => openScanner({
  title: 'Tarjeta del equipo que completó la misión',
  onCode: raw => {
    const f = findByCode(raw);
    if (!f || f.kind !== 'team') return showResult({ ok: false, text: 'Eso no es una tarjeta de equipo.' });
    complete(f.item.id);
  },
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-team]');
  if (!b) return;
  const t = teamById[b.dataset.team], m = current();
  if (confirm(`¿${t.name} completó "${m.name}"? Reciben ${rewardText(m.reward)}.`)) complete(t.id);
});

render();
setInterval(render, 5000);
pinGate([GAME.sombraPinHash, GAME.adminPinHash], 'sombra', async () => {
  client = await startClient({ onState: s => { state = s; render(); }, onStatus: st => { $('#net').textContent = netText(st); } });
});
