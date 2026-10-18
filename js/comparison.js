/**
 * js/comparison.js
 * Side-by-side 3-Protocol Comparison Modal & Clipboard Export Utilities.
 */
window.ARQ = window.ARQ || {};

window.ARQ.openComparisonModal = function () {
  const { appState, runGeneralizedARQSimulation } = window.ARQ;
  const N = appState.totalFrames;
  const m = appState.seqBits;
  const seqSpace = Math.pow(2, m);
  const gbnWs = Math.min(appState.ws, seqSpace - 1);
  const srWin = Math.min(appState.ws, Math.max(1, Math.pow(2, m - 1)));

  const swRes = runGeneralizedARQSimulation({ protocol: 'SW', totalFrames: N, seqBits: m, ws: 1, wr: 1, lostFrames: appState.lostFrames, lostAcks: appState.lostAcks });
  const gbnRes = runGeneralizedARQSimulation({ protocol: 'GBN', totalFrames: N, seqBits: m, ws: gbnWs, wr: 1, lostFrames: appState.lostFrames, lostAcks: appState.lostAcks });
  const srRes = runGeneralizedARQSimulation({ protocol: 'SR', totalFrames: N, seqBits: m, ws: srWin, wr: srWin, lostFrames: appState.lostFrames, lostAcks: appState.lostAcks });

  document.getElementById('comparisonParamsSummary').innerHTML = `
    <strong>Active Test Setup:</strong> Frames (N) = <strong>${N}</strong> | Seq Bits (m) = <strong>${m}</strong> (0..${seqSpace - 1}) |
    Lost Frames = <strong>[${appState.lostFrames.join(', ') || 'None'}]</strong> | Lost ACKs = <strong>[${appState.lostAcks.join(', ') || 'None'}]</strong>
  `;

  const rows = [
    { name: '1. Stop-and-Wait', ws: 1, wr: 1, res: swRes },
    { name: '2. Go-Back-N (GBN)', ws: gbnWs, wr: 1, res: gbnRes },
    { name: '3. Selective Repeat (SR)', ws: srWin, wr: srWin, res: srRes }
  ];

  const tbody = document.getElementById('comparisonTableBody');
  tbody.innerHTML = '';

  rows.forEach(r => {
    const mt = r.res.metrics;
    const eff = mt.attempts > 0 ? ((mt.delivered / mt.attempts) * 100).toFixed(1) + '%' : '0%';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="py-2.5 px-3 font-bold theme-text-main">${r.name}</td>
      <td class="py-2.5 px-3 theme-text-sec">W<sub>s</sub>=${r.ws}, W<sub>r</sub>=${r.wr}</td>
      <td class="py-2.5 px-3 font-bold" style="color: var(--ack-accent);">${mt.delivered}/${N}</td>
      <td class="py-2.5 px-3 font-bold" style="color: var(--sender-accent);">${mt.attempts}</td>
      <td class="py-2.5 px-3 font-bold" style="color: var(--warn-accent);">${mt.retransmissions}</td>
      <td class="py-2.5 px-3 font-bold" style="color: var(--danger-accent);">${mt.discarded}</td>
      <td class="py-2.5 px-3 font-bold" style="color: var(--accent-primary);">${mt.simTime} ticks</td>
      <td class="py-2.5 px-3 font-bold">${eff}</td>
    `;
    tbody.appendChild(tr);
  });

  const maxTime = Math.max(1, swRes.metrics.simTime, gbnRes.metrics.simTime, srRes.metrics.simTime);
  const maxAtt = Math.max(1, swRes.metrics.attempts, gbnRes.metrics.attempts, srRes.metrics.attempts);

  document.getElementById('comparisonVisualBars').innerHTML = `
    <div class="theme-subtle border rounded-xl p-3 space-y-2">
      <div class="font-bold theme-text-main">Simulated Time Comparison</div>
      ${rows.map(r => `
        <div class="space-y-1">
          <div class="flex justify-between text-[11px] font-mono"><span>${r.name}</span><strong>${r.res.metrics.simTime} ticks</strong></div>
          <div class="w-full h-2 rounded-full overflow-hidden" style="background: var(--border-main);">
            <div class="h-full rounded-full" style="width: ${(r.res.metrics.simTime / maxTime) * 100}%; background: var(--accent-primary);"></div>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="theme-subtle border rounded-xl p-3 space-y-2">
      <div class="font-bold theme-text-main">Total Attempts & Retransmissions</div>
      ${rows.map(r => `
        <div class="space-y-1">
          <div class="flex justify-between text-[11px] font-mono"><span>${r.name}</span><strong>${r.res.metrics.attempts} tx (${r.res.metrics.retransmissions} Re-Tx)</strong></div>
          <div class="w-full h-2 rounded-full overflow-hidden" style="background: var(--border-main);">
            <div class="h-full rounded-full" style="width: ${(r.res.metrics.attempts / maxAtt) * 100}%; background: var(--warn-accent);"></div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  window._latestComparisonMarkdown = [
    `| Protocol | Windows | Delivered | Attempts | Retransmissions | Discarded | Simulated Time |`,
    `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |`,
    ...rows.map(r => `| ${r.name} | Ws=${r.ws}, Wr=${r.wr} | ${r.res.metrics.delivered} | ${r.res.metrics.attempts} | ${r.res.metrics.retransmissions} | ${r.res.metrics.discarded} | ${r.res.metrics.simTime} ticks |`)
  ].join('\n');

  const modal = document.getElementById('modalComparison');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
};

window.ARQ.copyTextToClipboard = function (text, feedbackElem, feedbackLabel) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    if (feedbackElem) {
      const orig = feedbackElem.textContent;
      feedbackElem.textContent = feedbackLabel || 'Copied!';
      setTimeout(() => { feedbackElem.textContent = orig; }, 1600);
    }
  } catch (e) {}
  document.body.removeChild(ta);
};