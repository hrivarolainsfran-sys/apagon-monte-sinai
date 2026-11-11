import { GAME } from './config.js';
import { teamById, findByCode, total, fmtSec, STATUS_TEXT, SPECIALS, activeSpecials, effectiveStatus } from './engine.js';
import { startClient, serverNow } from './backend.js';
import { openScanner } from './scanner.js';
import { $, esc, ls, hhmm, vibrate, netText, brandHeader, pinGate, registerSW } from './ui.js';

const rules = GAME.rules;
let client, state;

$('#brand').innerHTML = brandHeader();
registerSW();
$('#name').value = ls.get('sombraName') || '';
$('#name').onchange = () => ls.set('sombraName', $('#name').value.trim());

function render() {
  if (!state) return;
  const now = serverNow(), status = effectiveStatus(state, now);
  $('#statusBanner').textContent = STATUS_TEXT[status].replace(/^🔴 /, '') + (status === 'running' && state.endsAt ? ` · ⏰ ${fmtSec((state.endsAt - now) / 1000)}` : '');
  $('#statusBanner').className = 'status-banner ' + status;
  $('#specials').innerHTML = activeSpecials(state, now).map(x => `<span class="chip ${x.kind}">${SPECIALS[x.kind].icon} ${SPECIALS[x.kind].name} · ${fmtSec((x.endTs - now) / 1000)}${x.kind === 'eclipse' ? ' — ¡las capturas quitan TODA la mochila!' : ''}</span>`).join('');
  $('#teams').innerHTML = GAME.teams.map(t => {
    const ts = state.teams[t.id];
    const immLeft = rules.captureImmunitySec * 1000 - (now - ts.lastCaptureTs);
    return `<div style="padding:5px 0;border-bottom:1px solid var(--line)"><span class="dot" style="background:${t.color}"></span><b>${esc(t.name)}</b>
      <span style="float:right">${immLeft > 0 ? `🛡 inmune ${fmtSec(immLeft / 1000)}` : `🎒 ${total(ts.carry)} recursos`}</span></div>`;
  }).join('');
  const caps = state.feed.filter(f => f.text.startsWith('🔦')).slice(0, 30);
  $('#feed').innerHTML = caps.map(f => `<div><time>${hhmm(f.ts)}</time>${esc(f.text)}</div>`).join('') || '<p class="muted">Nadie atrapado todavía.</p>';
}

function showResult(res) {
  $('#result').classList.toggle('bad', !res.ok);
  $('#resultIcon').textContent = res.ok ? '🔦' : '✖';
  $('#resultText').textContent = res.text;
  $('#result').classList.remove('hidden');
  vibrate(res.ok ? [80, 50, 200] : [250, 80, 250]);
}
$('#resultOk').onclick = () => $('#result').classList.add('hidden');

async function handle(raw) {
  const f = findByCode(raw);
  if (!f || f.kind !== 'team') return showResult({ ok: false, text: 'Eso no es una tarjeta de equipo.' });
  const by = $('#name').value.trim() || 'una Sombra';
  ls.set('sombraName', $('#name').value.trim());
  showResult(await client.send('capture', { teamId: f.item.id, by }));
}
$('#scanBtn').onclick = () => openScanner({ title: 'Escaneá la tarjeta del equipo', onCode: handle });

setInterval(render, 1000);

pinGate([GAME.sombraPinHash, GAME.adminPinHash], 'sombra', async () => {
  client = await startClient({ onState: s => { state = s; render(); }, onStatus: st => { $('#net').textContent = netText(st); } });
});
