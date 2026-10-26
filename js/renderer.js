/**
 * js/renderer.js
 * Visual rendering engine for HTML5 Canvas, SVG Space-Time Ladder, Window Tapes, and Logs.
 */
window.ARQ = window.ARQ || {};

window.ARQ.applyTheme = function (themeKey) {
  const { appState, drawChannelCanvas, renderLadderDiagram, renderTransmissionLog } = window.ARQ;
  appState.theme = themeKey;
  document.documentElement.setAttribute('data-theme', themeKey);
  document.querySelectorAll('.theme-btn').forEach(btn => {
    const active = btn.getAttribute('data-set-theme') === themeKey;
    btn.style.background = active ? 'var(--accent-primary)' : 'transparent';
    btn.style.color = active ? '#ffffff' : 'var(--text-secondary)';
  });
  drawChannelCanvas(appState.currentTick);
  renderLadderDiagram(appState.currentTick);
  renderTransmissionLog();
};

window.ARQ.syncFaultPillsUI = function () {
  const { appState, recomputeAndRender } = window.ARQ;
  const fContainer = document.getElementById('frameFaultPills');
  const aContainer = document.getElementById('ackFaultPills');
  fContainer.innerHTML = '';
  aContainer.innerHTML = '';
  const colsClass = appState.totalFrames <= 10 ? 'grid grid-cols-10 gap-1' : 'grid grid-cols-8 gap-1';
  fContainer.className = colsClass;
  aContainer.className = colsClass;

  for (let i = 0; i < appState.totalFrames; i++) {
    const fSelected = appState.lostFrames.includes(i);
    const fBtn = document.createElement('button');
    fBtn.type = 'button';
    fBtn.className = 'w-full py-1 rounded text-[9.5px] font-mono font-bold border transition text-center';
    fBtn.style.background = fSelected ? 'var(--danger-soft)' : 'var(--bg-panel)';
    fBtn.style.color = fSelected ? 'var(--danger-accent)' : 'var(--text-muted)';
    fBtn.style.borderColor = fSelected ? 'var(--danger-accent)' : 'var(--border-subtle)';
    fBtn.textContent = `F${i}`;
    fBtn.addEventListener('click', () => {
      const idx = appState.lostFrames.indexOf(i);
      if (idx === -1) appState.lostFrames.push(i);
      else appState.lostFrames.splice(idx, 1);
      appState.lostFrames.sort((a, b) => a - b);
      document.getElementById('inputLostFrames').value = appState.lostFrames.join(', ');
      recomputeAndRender(true);
    });
    fContainer.appendChild(fBtn);

    const aSelected = appState.lostAcks.includes(i);
    const aBtn = document.createElement('button');
    aBtn.type = 'button';
    aBtn.className = 'w-full py-1 rounded text-[9.5px] font-mono font-bold border transition text-center';
    aBtn.style.background = aSelected ? 'var(--warn-soft)' : 'var(--bg-panel)';
    aBtn.style.color = aSelected ? 'var(--warn-accent)' : 'var(--text-muted)';
    aBtn.style.borderColor = aSelected ? 'var(--warn-accent)' : 'var(--border-subtle)';
    aBtn.textContent = `A${i}`;
    aBtn.addEventListener('click', () => {
      const idx = appState.lostAcks.indexOf(i);
      if (idx === -1) appState.lostAcks.push(i);
      else appState.lostAcks.splice(idx, 1);
      appState.lostAcks.sort((a, b) => a - b);
      document.getElementById('inputLostAcks').value = appState.lostAcks.join(', ');
      recomputeAndRender(true);
    });
    aContainer.appendChild(aBtn);
  }
};

window.ARQ.updateControlPanelUI = function () {
  const { appState, validateProtocolConfig, syncFaultPillsUI } = window.ARQ;

  document.querySelectorAll('.protocol-btn').forEach(btn => {
    const active = btn.getAttribute('data-protocol') === appState.protocol;
    if (active) {
      btn.classList.add('active');
      btn.style.background = 'var(--accent-primary)';
      btn.style.color = '#ffffff';
    } else {
      btn.classList.remove('active');
      btn.style.background = 'transparent';
      btn.style.color = 'var(--text-secondary)';
    }
  });

  const seqSpace = Math.pow(2, appState.seqBits);
  document.getElementById('labelTotalFrames').textContent = appState.totalFrames;
  document.getElementById('inputTotalFrames').value = appState.totalFrames;
  document.getElementById('labelSeqSpace').textContent = `${appState.seqBits}b (0..${seqSpace - 1})`;
  document.getElementById('inputSeqBits').value = appState.seqBits;

  const inputWs = document.getElementById('inputWs');
  const inputWr = document.getElementById('inputWr');
  inputWs.value = appState.ws;
  inputWr.value = appState.wr;

  const validation = validateProtocolConfig(appState.protocol, appState.seqBits, appState.ws, appState.wr);
  document.getElementById('protocolFormulaBadge').textContent = validation.formula;

  if (appState.protocol === 'SW') {
    inputWs.disabled = true;
    inputWr.disabled = true;
    document.getElementById('badgeWsLimit').textContent = 'locked: 1';
    document.getElementById('badgeWrLimit').textContent = 'locked: 1';
    document.getElementById('receiverRuleBadge').textContent = 'Individual ACK | Wr = 1';
  } else if (appState.protocol === 'GBN') {
    inputWs.disabled = false;
    inputWr.disabled = true;
    document.getElementById('badgeWsLimit').textContent = `max: ${validation.maxWs}`;
    document.getElementById('badgeWrLimit').textContent = 'locked: 1';
    document.getElementById('receiverRuleBadge').textContent = 'Out-of-order: Discarded (Cumul ACK)';
  } else {
    inputWs.disabled = false;
    inputWr.disabled = false;
    document.getElementById('badgeWsLimit').textContent = `max: ${validation.maxWs}`;
    document.getElementById('badgeWrLimit').textContent = `max: ${validation.maxWr}`;
    document.getElementById('receiverRuleBadge').textContent = 'Out-of-order: Buffered in Wr (Indiv ACK)';
  }

  const alertBox = document.getElementById('validationAlert');
  const alertIcon = document.getElementById('validationIcon');
  alertBox.style.background = validation.valid ? 'var(--ack-soft)' : 'var(--danger-soft)';
  alertBox.style.borderColor = validation.valid ? 'var(--ack-border)' : 'var(--danger-border)';
  alertBox.style.color = validation.valid ? 'var(--ack-accent)' : 'var(--danger-accent)';
  alertIcon.className = validation.valid
    ? 'fa-solid fa-circle-check mt-0.5 shrink-0'
    : 'fa-solid fa-triangle-exclamation mt-0.5 shrink-0';

  document.getElementById('validationTitle').textContent = validation.title;
  document.getElementById('validationDesc').textContent = validation.message;

  syncFaultPillsUI();
};

window.ARQ.renderCurrentTickState = function () {
  const { appState, drawChannelCanvas, renderLadderDiagram, renderTransmissionLog } = window.ARQ;
  const sim = appState.simulation;
  if (!sim) return;

  const intTick = Math.min(sim.maxTick, Math.floor(appState.currentTick + 0.0001));
  const snap = sim.snapshots[intTick] || sim.snapshots[0];

  document.getElementById('scrubberTickLabel').textContent = intTick;
  document.getElementById('timelineScrubber').value = appState.currentTick;
  document.getElementById('liveTickHeadline').textContent = snap.headline;

  // Update Pinned Performance Summary
  document.getElementById('metricDelivered').textContent = snap.metrics.delivered;
  document.getElementById('metricDeliveredTarget').textContent = `/${appState.totalFrames}`;
  document.getElementById('metricAttempts').textContent = snap.metrics.attempts;
  document.getElementById('metricRetransmissions').textContent = snap.metrics.retransmissions;
  document.getElementById('metricDiscarded').textContent = snap.metrics.discarded;
  document.getElementById('metricSimTime').textContent = intTick;
  document.getElementById('metricTotalSimTime').textContent = `/ ${sim.maxTick} ticks`;

  // Real-time efficiency metric
  const effBadge = document.getElementById('metricEfficiencyBadge');
  if (effBadge) {
    const eff = snap.metrics.attempts > 0
      ? ((snap.metrics.delivered / snap.metrics.attempts) * 100).toFixed(1) + '%'
      : '100%';
    effBadge.textContent = 'η = ' + eff;
  }

  // Render Compact Sender Tape
  const winEnd = Math.min(appState.totalFrames - 1, snap.senderBase + appState.ws - 1);
  document.getElementById('senderWindowText').innerHTML = snap.senderBase < appState.totalFrames
    ? `Active: <strong>[F${snap.senderBase}..F${winEnd}]</strong> (base=${snap.senderBase}, next=${snap.senderNext}, W<sub>s</sub>=${appState.ws})`
    : `<strong>All ${appState.totalFrames} Frames ACKed!</strong>`;

  const senderTape = document.getElementById('senderTapeContainer');
  senderTape.innerHTML = '';

  const timers = [];
  snap.senderFrames.forEach(f => {
    const inWin = f.index >= snap.senderBase && f.index <= winEnd && snap.senderBase < appState.totalFrames;
    let bg = inWin ? 'var(--sender-bg)' : 'var(--bg-subtle)';
    let border = inWin ? 'var(--sender-border)' : 'var(--border-subtle)';
    let statusIconHtml = inWin
      ? '<span class="text-[8px] font-mono font-semibold" style="color: var(--sender-accent);">READY</span>'
      : '<i class="fa-regular fa-clock text-[8px] opacity-30"></i>';
    let statusColor = inWin ? 'var(--sender-accent)' : 'var(--text-muted)';
    let tooltipTitle = `Frame ${f.index} (Seq ${f.seq}): ${inWin ? 'In Window (Ready to send)' : 'Waiting in queue'}`;

    if (f.state === 'acked') {
      bg = 'var(--ack-soft)';
      border = 'var(--ack-border)';
      statusIconHtml = '<i class="fa-solid fa-circle-check text-[10px]" style="color: var(--ack-accent);"></i>';
      statusColor = 'var(--ack-accent)';
      tooltipTitle = `Frame ${f.index} (Seq ${f.seq}): Acknowledged`;
    } else if (f.state === 'timeout') {
      bg = 'var(--danger-soft)';
      border = 'var(--danger-border)';
      statusIconHtml = '<div class="flex items-center gap-0.5 font-mono text-[8px] font-bold" style="color: var(--danger-accent);"><i class="fa-solid fa-rotate text-[7.5px]"></i><span>RTO</span></div>';
      statusColor = 'var(--danger-accent)';
      tooltipTitle = `Frame ${f.index} (Seq ${f.seq}): Timeout! Retransmitting`;
    } else if (f.state === 'inflight') {
      bg = 'var(--warn-soft)';
      border = 'var(--warn-border)';
      statusIconHtml = `<div class="flex items-center gap-0.5 font-mono text-[8.5px] font-bold" style="color: var(--warn-accent);"><i class="fa-solid fa-stopwatch text-[8px]"></i><span>${f.timerRemaining !== null ? f.timerRemaining + 't' : ''}</span></div>`;
      statusColor = 'var(--warn-accent)';
      tooltipTitle = `Frame ${f.index} (Seq ${f.seq}): In Flight (${f.timerRemaining}t remaining)`;
      if (f.timerRemaining !== null) timers.push(`F${f.index}:${f.timerRemaining}t`);
    }

    const el = document.createElement('div');
    el.className = `relative tape-frame-card rounded-lg border flex flex-col justify-between transition cursor-pointer select-none ${inWin ? 'sender-window-slot' : ''}`;
    el.style.background = bg;
    el.style.borderColor = border;
    el.title = tooltipTitle;
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', `Frame ${f.index}, Seq ${f.seq}`);
    el.addEventListener('click', () => window.ARQ.inspectFrame(f.index, 'sender'));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        window.ARQ.inspectFrame(f.index, 'sender');
      }
    });
    el.innerHTML = `
      <div class="flex items-center justify-between w-full text-[9.5px] font-mono font-bold leading-none">
        <div class="flex items-center gap-1">
          <span>F${f.index}</span>
          ${inWin && f.index === snap.senderBase ? '<span class="px-1 py-0.2 rounded text-[7px] font-mono font-black text-white" style="background: var(--sender-accent);">BASE</span>' : ''}
        </div>
        <span class="opacity-60 text-[8.5px]">S${f.seq}</span>
      </div>
      <div class="flex items-center justify-center mt-1 h-3.5" style="color: ${statusColor};">${statusIconHtml}</div>
    `;
    senderTape.appendChild(el);
  });

  document.getElementById('senderTimerSummary').textContent = timers.length > 0
    ? `Timers: ${timers.slice(0, 4).join(' ')}`
    : 'No active timer';

  // Render Compact Receiver Tape
  const rcvWinEnd = Math.min(appState.totalFrames - 1, snap.rcvBase + appState.wr - 1);
  document.getElementById('receiverWindowText').innerHTML = snap.rcvBase < appState.totalFrames
    ? `Active: <strong>[F${snap.rcvBase}..F${rcvWinEnd}]</strong> (R<sub>next</sub>=${snap.rcvBase}, W<sub>r</sub>=${appState.wr})`
    : `<strong>All ${appState.totalFrames} Frames Delivered!</strong>`;

  const receiverTape = document.getElementById('receiverTapeContainer');
  receiverTape.innerHTML = '';

  snap.receiverFrames.forEach(r => {
    const inRcvWin = r.index >= snap.rcvBase && r.index <= rcvWinEnd && snap.rcvBase < appState.totalFrames;
    let bg = inRcvWin ? 'var(--receiver-bg)' : 'var(--bg-subtle)';
    let border = inRcvWin ? 'var(--receiver-border)' : 'var(--border-subtle)';
    let statusIconHtml = inRcvWin
      ? '<span class="text-[8px] font-mono font-semibold" style="color: var(--receiver-accent);">WANT</span>'
      : '<i class="fa-regular fa-circle text-[7.5px] opacity-30"></i>';
    let statusColor = inRcvWin ? 'var(--receiver-accent)' : 'var(--text-muted)';
    let tooltipTitle = `Frame ${r.index} (Seq ${r.seq}): ${inRcvWin ? 'Expected in window' : 'Waiting'}`;

    if (r.state === 'delivered') {
      bg = 'var(--ack-soft)';
      border = 'var(--ack-border)';
      statusIconHtml = '<i class="fa-solid fa-circle-check text-[10px]" style="color: var(--ack-accent);"></i>';
      statusColor = 'var(--ack-accent)';
      tooltipTitle = `Frame ${r.index} (Seq ${r.seq}): Delivered to Upper Layer`;
    } else if (r.state === 'buffered') {
      bg = 'var(--receiver-soft)';
      border = 'var(--receiver-border)';
      statusIconHtml = '<div class="flex items-center gap-0.5 font-mono text-[8px] font-bold" style="color: var(--receiver-accent);"><i class="fa-solid fa-box-archive text-[7.5px]"></i><span>BUF</span></div>';
      statusColor = 'var(--receiver-accent)';
      tooltipTitle = `Frame ${r.index} (Seq ${r.seq}): Buffered in Receive Window`;
    } else if (r.discardCount > 0) {
      statusIconHtml = `<div class="flex items-center gap-0.5 font-mono text-[8px] font-bold" style="color: var(--danger-accent);"><i class="fa-solid fa-ban text-[7.5px]"></i><span>×${r.discardCount}</span></div>`;
      statusColor = 'var(--danger-accent)';
      tooltipTitle = `Frame ${r.index} (Seq ${r.seq}): Discarded out-of-order (${r.discardCount} times)`;
    }

    const el = document.createElement('div');
    el.className = `relative tape-frame-card rounded-lg border flex flex-col justify-between transition cursor-pointer select-none ${inRcvWin ? 'receiver-window-slot' : ''}`;
    el.style.background = bg;
    el.style.borderColor = border;
    el.title = tooltipTitle;
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', `Frame ${r.index}, Seq ${r.seq}`);
    el.addEventListener('click', () => window.ARQ.inspectFrame(r.index, 'receiver'));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        window.ARQ.inspectFrame(r.index, 'receiver');
      }
    });
    el.innerHTML = `
      <div class="flex items-center justify-between w-full text-[9.5px] font-mono font-bold leading-none">
        <div class="flex items-center gap-1">
          <span>F${r.index}</span>
          ${inRcvWin && r.index === snap.rcvBase ? '<span class="px-1 py-0.2 rounded text-[7px] font-mono font-black text-white" style="background: var(--receiver-accent);">NEXT</span>' : ''}
        </div>
        <span class="opacity-60 text-[8.5px]">S${r.seq}</span>
      </div>
      <div class="flex items-center justify-center mt-1 h-3.5" style="color: ${statusColor};">${statusIconHtml}</div>
    `;
    receiverTape.appendChild(el);
  });

  drawChannelCanvas(appState.currentTick);
  renderLadderDiagram(appState.currentTick);
  if (appState.logFormat === 'live') renderTransmissionLog();
};

/**
 * Dynamically Sized Channel Canvas Renderer
 * — Technical dual-station propagation bus with directional vector packets
 */
window.ARQ.drawChannelCanvas = function (floatTick) {
  const { appState, THEME_PALETTES, PROP_DELAY } = window.ARQ;
  const canvas = document.getElementById('channelCanvas');
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
  }

  const pal = THEME_PALETTES[appState.theme] || THEME_PALETTES.paper;
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.scale(dpr, dpr);

  const W = rect.width;
  const H = rect.height;

  // Background
  ctx.fillStyle = pal.canvasBg;
  ctx.fillRect(0, 0, W, H);

  const stationH = 26;
  const topY = 40;
  const bottomY = H - 40;
  const midY = (topY + bottomY) / 2;

  // 1. Top Station Band: TX Bus (Sender)
  ctx.fillStyle = pal.senderLaneBg || 'transparent';
  ctx.fillRect(0, 0, W, stationH);
  ctx.strokeStyle = pal.gridLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, stationH);
  ctx.lineTo(W, stationH);
  ctx.stroke();

  // TX badge tag on far left
  ctx.fillStyle = pal.dataFill;
  ctx.strokeStyle = pal.dataStroke;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(10, 6, 26, 15, 3);
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
  ctx.fillStyle = pal.senderLabel;
  ctx.textAlign = 'center';
  ctx.fillText('TX', 23, 17);

  // 2. Bottom Station Band: RX Bus (Receiver)
  ctx.fillStyle = pal.receiverLaneBg || 'transparent';
  ctx.fillRect(0, H - stationH, W, stationH);
  ctx.strokeStyle = pal.gridLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, H - stationH);
  ctx.lineTo(W, H - stationH);
  ctx.stroke();

  // RX badge tag on far left
  ctx.fillStyle = pal.bufColor ? 'rgba(167, 139, 250, 0.12)' : pal.ackFill;
  ctx.strokeStyle = pal.receiverLabel;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(10, H - 21, 26, 15, 3);
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
  ctx.fillStyle = pal.receiverLabel;
  ctx.textAlign = 'center';
  ctx.fillText('RX', 23, H - 10);

  // 3. Central Channel Medium (Dashed Midline)
  ctx.strokeStyle = pal.midLine || pal.gridLine;
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(16, midY);
  ctx.lineTo(W - 16, midY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Frame Column Guidelines and Port Dots
  const N = appState.totalFrames;
  const leftPad = 52;
  const rightPad = 32;
  const usableW = Math.max(120, W - leftPad - rightPad);

  for (let i = 0; i < N; i++) {
    const x = leftPad + (N === 1 ? usableW / 2 : (i / (N - 1)) * usableW);

    // Column guideline
    ctx.strokeStyle = pal.laneLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, stationH);
    ctx.lineTo(x, H - stationH);
    ctx.stroke();

    // Port nodes at station boundary
    ctx.fillStyle = pal.senderLabel;
    ctx.beginPath();
    ctx.arc(x, stationH, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = pal.receiverLabel;
    ctx.beginPath();
    ctx.arc(x, H - stationH, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Frame column label in TX band
    ctx.fillStyle = pal.laneText;
    ctx.font = '600 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`F${i}`, x, 18);
  }

  const sim = appState.simulation;
  if (!sim || !sim.allChannelPackets || sim.allChannelPackets.length === 0) {
    // Idle state
    ctx.fillStyle = pal.laneText;
    ctx.font = '600 10.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CHANNEL STANDBY — PROPAGATION MEDIUM IDLE', W / 2, midY - 6);
    ctx.font = '500 9.5px "Plus Jakarta Sans", sans-serif';
    ctx.globalAlpha = 0.65;
    ctx.fillText('Press Play [Space] or Step [+1t] to transmit frames', W / 2, midY + 14);
    ctx.globalAlpha = 1;
    ctx.restore();
    return;
  }

  // Midline channel info
  ctx.fillStyle = pal.laneText;
  ctx.globalAlpha = 0.45;
  ctx.font = '500 8.5px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText('RTT = 6t (PROP = 3t)', W - 16, midY - 6);
  ctx.globalAlpha = 1;

  // Render packets in channel
  sim.allChannelPackets.forEach(pkt => {
    const endT = pkt.willDrop ? pkt.dropTick + 0.8 : pkt.arriveTick + 0.35;
    if (floatTick < pkt.sendTick || floatTick > endT) return;

    const laneX = leftPad + (N === 1 ? usableW / 2 : (pkt.frameIdx / (N - 1)) * usableW);

    if (pkt.willDrop && floatTick >= pkt.dropTick) {
      const elapsed = floatTick - pkt.dropTick;
      const fade = Math.max(0, 1 - elapsed / 0.8);
      const dropProg = (pkt.dropTick - pkt.sendTick) / PROP_DELAY;
      const y = pkt.type === 'DATA'
        ? topY + dropProg * (bottomY - topY)
        : bottomY - dropProg * (bottomY - topY);

      ctx.save();
      ctx.globalAlpha = fade;

      // Drop shockwave ring
      const ringRadius = 10 + elapsed * 14;
      ctx.strokeStyle = pal.lostColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(laneX, y, ringRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Bold Cross
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(laneX - 6, y - 6);
      ctx.lineTo(laneX + 6, y + 6);
      ctx.moveTo(laneX + 6, y - 6);
      ctx.lineTo(laneX - 6, y + 6);
      ctx.stroke();

      // Loss label
      ctx.fillStyle = pal.lostColor;
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${pkt.type === 'DATA' ? 'F' : 'ACK '}${pkt.frameIdx} ✕ DROPPED`, laneX, y - 14);
      ctx.restore();
      return;
    }

    const prog = Math.min(1, Math.max(0, (floatTick - pkt.sendTick) / PROP_DELAY));
    const y = pkt.type === 'DATA'
      ? topY + prog * (bottomY - topY)
      : bottomY - prog * (bottomY - topY);

    const isData = pkt.type === 'DATA';
    const boxW = isData && pkt.isRetransmission ? 72 : 62;
    const boxH = 23;

    ctx.save();
    ctx.fillStyle = isData ? (pkt.isRetransmission ? pal.retxFill : pal.dataFill) : pal.ackFill;
    ctx.strokeStyle = isData ? (pkt.isRetransmission ? pal.retxStroke : pal.dataStroke) : pal.ackStroke;
    ctx.lineWidth = 1.5;

    // Pill background
    ctx.beginPath();
    ctx.roundRect(laneX - boxW / 2, y - boxH / 2, boxW, boxH, 5);
    ctx.fill();
    ctx.stroke();

    // Direction arrow:
    // DATA moves DOWN (top to bottom): apex points DOWN (+Y)
    // ACK moves UP (bottom to top): apex points UP (-Y)
    const arrowX = laneX + boxW / 2 - 9;
    const arrowY = y;
    ctx.fillStyle = isData ? (pkt.isRetransmission ? pal.retxStroke : pal.dataStroke) : pal.ackStroke;
    ctx.beginPath();
    if (isData) {
      // Point DOWN
      ctx.moveTo(arrowX, arrowY + 4);
      ctx.lineTo(arrowX + 3.5, arrowY - 3);
      ctx.lineTo(arrowX - 3.5, arrowY - 3);
    } else {
      // Point UP
      ctx.moveTo(arrowX, arrowY - 4);
      ctx.lineTo(arrowX + 3.5, arrowY + 3);
      ctx.lineTo(arrowX - 3.5, arrowY + 3);
    }
    ctx.closePath();
    ctx.fill();

    // Label text
    ctx.fillStyle = isData ? (pkt.isRetransmission ? pal.retxText : pal.dataText) : pal.ackText;
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      isData ? `${pkt.isRetransmission ? 'Re-' : ''}F${pkt.frameIdx}(S${pkt.seqNum})` : `ACK ${pkt.frameIdx}`,
      laneX - 5,
      y + 3
    );
    ctx.restore();
  });

  ctx.restore();
};

/**
 * LIVE-UPDATING Space-Time Ladder Diagram Renderer
 */
window.ARQ.renderLadderDiagram = function (floatTick = window.ARQ.appState.currentTick) {
  const { appState, THEME_PALETTES } = window.ARQ;
  const container = document.getElementById('ladderSvgContainer');
  const sim = appState.simulation;
  if (!container || !sim) return;

  const pal = THEME_PALETTES[appState.theme] || THEME_PALETTES.obsidian;
  const pillBg = pal.pillBg || pal.canvasBg;
  const totalTicks = Math.max(12, sim.maxTick + 2);
  const svgW = 620;
  const rowH = 26;
  const topPad = 38;
  const bottomPad = 30;
  const svgH = topPad + totalTicks * rowH + bottomPad;
  const senderX = 86;
  const receiverX = svgW - 86;
  const spanX = receiverX - senderX;

  let svg = `<svg viewBox="0 0 ${svgW} ${svgH}" class="w-full h-auto font-mono select-none">`;

  // Header Column Titles
  svg += `<rect x="${senderX - 42}" y="6" width="84" height="22" rx="6" fill="${pal.dataFill}" stroke="${pal.dataStroke}" stroke-width="1.3" />`;
  svg += `<text x="${senderX}" y="20" text-anchor="middle" fill="${pal.dataStroke}" font-size="10" font-weight="bold">SENDER</text>`;

  svg += `<rect x="${receiverX - 46}" y="6" width="92" height="22" rx="6" fill="${pal.ackFill}" stroke="${pal.bufColor}" stroke-width="1.3" />`;
  svg += `<text x="${receiverX}" y="20" text-anchor="middle" fill="${pal.bufColor}" font-size="10" font-weight="bold">RECEIVER</text>`;

  // Horizontal Tick Grid Lines
  for (let t = 0; t <= totalTicks; t += 2) {
    const y = topPad + t * rowH;
    const isPast = t <= floatTick;
    svg += `<line x1="${senderX}" y1="${y}" x2="${receiverX}" y2="${y}" stroke="${pal.gridLine}" stroke-dasharray="3,4" stroke-width="0.8" opacity="${isPast ? '0.65' : '0.28'}" />`;
    svg += `<text x="${senderX - 12}" y="${y + 3}" text-anchor="end" fill="${pal.laneText}" font-size="9" opacity="${isPast ? '0.95' : '0.4'}">t=${t}</text>`;
  }

  // Vertical Node Timelines
  const curY = topPad + Math.min(totalTicks, Math.max(0, floatTick)) * rowH;
  svg += `<line x1="${senderX}" y1="${topPad}" x2="${senderX}" y2="${svgH - bottomPad}" stroke="${pal.gridLine}" stroke-width="2" />`;
  svg += `<line x1="${receiverX}" y1="${topPad}" x2="${receiverX}" y2="${svgH - bottomPad}" stroke="${pal.gridLine}" stroke-width="2" />`;

  svg += `<line x1="${senderX}" y1="${topPad}" x2="${senderX}" y2="${curY}" stroke="${pal.dataStroke}" stroke-width="2.6" />`;
  svg += `<line x1="${receiverX}" y1="${topPad}" x2="${receiverX}" y2="${curY}" stroke="${pal.bufColor}" stroke-width="2.6" />`;

  // Pass 1: Render Ray Lines, Endpoints & Drop Stop-Markers First
  const pillLabelsToRender = [];

  sim.ladderEvents.forEach(ev => {
    const isData = ev.type === 'DATA';
    const startX = isData ? senderX : receiverX;
    const dir = isData ? 1 : -1;
    const fullEndX = ev.status === 'lost'
      ? startX + dir * (spanX * 0.42)
      : (isData ? receiverX : senderX);

    const y1 = topPad + ev.sendTick * rowH;
    const fullY2 = topPad + ev.endTick * rowH;

    let color = isData ? pal.dataStroke : pal.ackStroke;
    if (ev.status === 'retransmit') color = pal.retxStroke;
    else if (ev.status === 'lost' || ev.status === 'discarded') color = pal.lostColor;
    else if (ev.status === 'buffered') color = pal.bufColor;

    if (floatTick < ev.sendTick) {
      svg += `<line x1="${startX}" y1="${y1}" x2="${fullEndX}" y2="${fullY2}" stroke="${pal.gridLine}" stroke-width="1" stroke-dasharray="2,4" opacity="0.22" />`;
      return;
    }

    const duration = Math.max(0.001, ev.endTick - ev.sendTick);
    const prog = Math.min(1, Math.max(0, (floatTick - ev.sendTick) / duration));
    const curX = startX + (fullEndX - startX) * prog;
    const curRayY = y1 + (fullY2 - y1) * prog;

    svg += `<line x1="${startX}" y1="${y1}" x2="${curX}" y2="${curRayY}" stroke="${color}" stroke-width="${prog < 1 ? '2.4' : '1.85'}" ${!isData ? 'stroke-dasharray="5,3"' : ''} />`;
    svg += `<circle cx="${startX}" cy="${y1}" r="3" fill="${color}" />`;

    const fixedLabelRatio = ev.status === 'lost' ? 0.52 : 0.23;
    const labelProg = prog < 1 ? prog : fixedLabelRatio;
    const labelX = startX + (fullEndX - startX) * labelProg;
    const labelY = y1 + (fullY2 - y1) * labelProg;

    const textStr = (ev.status === 'lost' && prog >= 1) ? `${ev.label} \u2715` : ev.label;

    if (prog < 1) {
      svg += `<circle cx="${curX}" cy="${curRayY}" r="5.5" fill="${color}" opacity="0.22" />`;
      svg += `<circle cx="${curX}" cy="${curRayY}" r="3.2" fill="${color}" />`;
    } else if (ev.status === 'lost') {
      svg += `<circle cx="${fullEndX}" cy="${fullY2}" r="6.5" fill="${pillBg}" stroke="${pal.lostColor}" stroke-width="1.8" />`;
      svg += `<line x1="${fullEndX - 3}" y1="${fullY2 - 3}" x2="${fullEndX + 3}" y2="${fullY2 + 3}" stroke="${pal.lostColor}" stroke-width="1.8" />`;
      svg += `<line x1="${fullEndX + 3}" y1="${fullY2 - 3}" x2="${fullEndX - 3}" y2="${fullY2 + 3}" stroke="${pal.lostColor}" stroke-width="1.8" />`;
    } else {
      svg += `<circle cx="${fullEndX}" cy="${fullY2}" r="3" fill="${color}" />`;
    }

    pillLabelsToRender.push({
      x: labelX,
      y: prog < 1 ? labelY - 10 : labelY,
      text: textStr,
      color
    });
  });

  // Pass 2: Render Opaque Pill Badges on Top of All Rays
  pillLabelsToRender.forEach(lbl => {
    const pillW = Math.max(46, lbl.text.length * 5.7 + 12);
    const pillH = 14;
    svg += `<rect x="${lbl.x - pillW / 2}" y="${lbl.y - pillH / 2}" width="${pillW}" height="${pillH}" rx="4" fill="${pillBg}" stroke="${lbl.color}" stroke-width="1.1" />`;
    svg += `<text x="${lbl.x}" y="${lbl.y + 3}" text-anchor="middle" fill="${lbl.color}" font-size="8.5" font-weight="bold">${lbl.text}</text>`;
  });

  // Live Horizontal Time Cursor Scanline
  svg += `<line x1="${senderX - 14}" y1="${curY}" x2="${receiverX + 14}" y2="${curY}" stroke="var(--accent-primary)" stroke-width="1.5" stroke-dasharray="4,2" />`;
  svg += `<rect x="${receiverX + 8}" y="${curY - 8}" width="64" height="16" rx="4" fill="var(--accent-primary)" />`;
  svg += `<text x="${receiverX + 40}" y="${curY + 3}" text-anchor="middle" fill="#ffffff" font-size="8.5" font-weight="bold">t=${floatTick.toFixed(1)}</text>`;

  svg += `</svg>`;
  container.innerHTML = svg;

  // Auto-scroll ladder stage during playback
  const scrollParent = document.getElementById('viewLadderStage');
  if (scrollParent && !scrollParent.classList.contains('hidden') && appState.isPlaying) {
    const containerH = scrollParent.clientHeight;
    const targetScroll = Math.max(0, (curY / svgH) * scrollParent.scrollHeight - containerH * 0.55);
    scrollParent.scrollTop = targetScroll;
  }
};

/**
 * Clickable Frame Inspector UX Enhancement
 */
window.ARQ.inspectFrame = function (frameIdx, side) {
  const { appState } = window.ARQ;
  const sim = appState.simulation;
  const card = document.getElementById('frameInspectorCard');
  if (!card || !sim) return;

  const intTick = Math.min(sim.maxTick, Math.floor(appState.currentTick + 0.0001));
  const snap = sim.snapshots[intTick] || sim.snapshots[0];
  const seq = frameIdx % Math.pow(2, appState.seqBits);

  const badge = document.getElementById('inspectBadge');
  const detail = document.getElementById('inspectDetail');

  badge.textContent = `F${frameIdx} (S${seq}) • ${side === 'sender' ? 'TX LANE' : 'RX LANE'}`;

  let desc = '';
  if (side === 'sender') {
    const f = snap.senderFrames.find(x => x.index === frameIdx);
    const winEnd = Math.min(appState.totalFrames - 1, snap.senderBase + appState.ws - 1);
    const inWin = frameIdx >= snap.senderBase && frameIdx <= winEnd;
    if (f.state === 'acked') {
      desc = `Acknowledged. Transmission completed successfully.`;
    } else if (f.state === 'timeout') {
      desc = `Retransmission timeout expired! Pending retransmission.`;
    } else if (f.state === 'inflight') {
      desc = `In flight on channel (${f.timerRemaining ?? 0}t remaining on retransmission timer).`;
    } else if (inWin) {
      desc = `Inside sender window [F${snap.senderBase}..F${winEnd}]. Ready for transmission.`;
    } else {
      desc = `Queued outside window (Waiting for base F${snap.senderBase} to advance).`;
    }
  } else {
    const r = snap.receiverFrames.find(x => x.index === frameIdx);
    const rcvWinEnd = Math.min(appState.totalFrames - 1, snap.rcvBase + appState.wr - 1);
    const inWin = frameIdx >= snap.rcvBase && frameIdx <= rcvWinEnd;
    if (r.state === 'delivered') {
      desc = `Delivered to upper protocol layer.`;
    } else if (r.state === 'buffered') {
      desc = `Buffered in receiver memory. Waiting for missing preceding frame F${snap.rcvBase}.`;
    } else if (r.discardCount > 0) {
      desc = `Discarded ${r.discardCount} time(s) due to out-of-order arrival without buffer space.`;
    } else if (inWin) {
      desc = `Inside receiver window [F${snap.rcvBase}..F${rcvWinEnd}]. Expected next sequence number.`;
    } else {
      desc = `Outside receiver window (Current receiver base is F${snap.rcvBase}).`;
    }
  }

  detail.textContent = desc;
  card.classList.remove('hidden');
};

/**
 * Maps each log entry to a high-contrast visual style with Soft Canvas tokens
 */
function getLogOperationStyle(level, text) {
  const isLight = window.ARQ.appState.theme === 'paper';
  const lower = (text || '').toLowerCase();

  let cat = level;
  if (!cat) {
    if (lower.includes('error') || lower.includes('invalid')) cat = 'error';
    else if (lower.includes('loss') || lower.includes('lost')) cat = 'loss';
    else if (lower.includes('timeout') || lower.includes('retransmitting')) cat = 'timeout';
    else if (lower.includes('retransmitted')) cat = 'retransmit';
    else if (lower.includes('discarded')) cat = 'warn';
    else if (lower.includes('buffered')) cat = 'buffer';
    else if (lower.includes('received successfully') || lower.includes('delivered')) cat = 'recv';
    else if (lower.includes('ack') && lower.includes('generated')) cat = 'ack';
    else if (lower.includes('transmitted') || lower.includes('sent frame')) cat = 'send';
    else cat = 'info';
  }

  const styles = {
    send: {
      badge: 'TX',
      icon: 'fa-solid fa-arrow-up-right-from-square',
      border: 'var(--data-accent)',
      bg: isLight ? 'var(--sender-bg)' : 'rgba(84, 131, 184, 0.12)',
      badgeBg: isLight ? 'var(--sender-soft)' : 'rgba(84, 131, 184, 0.24)',
      text: isLight ? 'var(--text-main)' : '#8bb2de'
    },
    recv: {
      badge: 'RX',
      icon: 'fa-solid fa-arrow-down-left-and-up-right-to-center',
      border: 'var(--ack-accent)',
      bg: isLight ? 'var(--ack-soft)' : 'rgba(67, 134, 109, 0.13)',
      badgeBg: isLight ? 'var(--ack-soft)' : 'rgba(67, 134, 109, 0.25)',
      text: isLight ? 'var(--text-main)' : '#7cbfa5'
    },
    ack: {
      badge: 'ACK',
      icon: 'fa-solid fa-check',
      border: 'var(--ack-accent)',
      bg: isLight ? 'var(--ack-soft)' : 'rgba(67, 134, 109, 0.12)',
      badgeBg: isLight ? 'var(--ack-soft)' : 'rgba(67, 134, 109, 0.24)',
      text: isLight ? 'var(--text-main)' : '#7cbfa5'
    },
    buffer: {
      badge: 'BUF',
      icon: 'fa-solid fa-box-archive',
      border: 'var(--receiver-accent)',
      bg: isLight ? 'var(--receiver-soft)' : 'rgba(139, 120, 184, 0.14)',
      badgeBg: isLight ? 'var(--receiver-soft)' : 'rgba(139, 120, 184, 0.26)',
      text: isLight ? 'var(--text-main)' : '#b5a5db'
    },
    loss: {
      badge: 'LOST',
      icon: 'fa-solid fa-xmark',
      border: 'var(--danger-accent)',
      bg: isLight ? 'var(--danger-soft)' : 'rgba(199, 107, 112, 0.16)',
      badgeBg: isLight ? 'var(--danger-soft)' : 'rgba(199, 107, 112, 0.30)',
      text: isLight ? 'var(--text-main)' : '#e59da1'
    },
    timeout: {
      badge: 'RTO',
      icon: 'fa-solid fa-clock-rotate-left',
      border: 'var(--warn-accent)',
      bg: isLight ? 'var(--warn-soft)' : 'rgba(193, 138, 67, 0.16)',
      badgeBg: isLight ? 'var(--warn-soft)' : 'rgba(193, 138, 67, 0.30)',
      text: isLight ? 'var(--text-main)' : '#dfb57e'
    },
    retransmit: {
      badge: 'RE-TX',
      icon: 'fa-solid fa-arrows-rotate',
      border: 'var(--warn-accent)',
      bg: isLight ? 'var(--warn-soft)' : 'rgba(193, 138, 67, 0.15)',
      badgeBg: isLight ? 'var(--warn-soft)' : 'rgba(193, 138, 67, 0.28)',
      text: isLight ? 'var(--text-main)' : '#dfb57e'
    },
    warn: {
      badge: 'DISC',
      icon: 'fa-solid fa-ban',
      border: 'var(--danger-accent)',
      bg: isLight ? 'var(--danger-soft)' : 'rgba(199, 107, 112, 0.14)',
      badgeBg: isLight ? 'var(--danger-soft)' : 'rgba(199, 107, 112, 0.26)',
      text: isLight ? 'var(--text-main)' : '#e59da1'
    },
    error: {
      badge: 'ERR',
      icon: 'fa-solid fa-triangle-exclamation',
      border: 'var(--danger-accent)',
      bg: 'var(--danger-soft)',
      badgeBg: 'var(--danger-soft)',
      text: isLight ? 'var(--text-main)' : '#e59da1'
    },
    info: {
      badge: 'CFG',
      icon: 'fa-solid fa-sliders',
      border: 'var(--border-subtle)',
      bg: 'var(--surface-soft)',
      badgeBg: 'var(--border-subtle)',
      text: 'var(--text-secondary)'
    }
  };

  return styles[cat] || styles.info;
}

window.ARQ.renderTransmissionLog = function () {
  const { appState } = window.ARQ;
  const container = document.getElementById('transmissionLogContainer');
  const sim = appState.simulation;
  if (!container || !sim) return;

  container.innerHTML = '';

  if (appState.logFormat === 'assignment') {
    sim.assignmentLines.forEach(line => {
      if (!line) {
        const spacer = document.createElement('div');
        spacer.className = 'h-1.5';
        container.appendChild(spacer);
        return;
      }

      if (line === 'TRANSMISSION LOG' || line === 'PERFORMANCE SUMMARY') {
        const header = document.createElement('div');
        header.className = 'font-extrabold border-b pb-1 pt-1.5 text-[10.5px] uppercase tracking-wider flex items-center gap-1.5';
        header.style.color = 'var(--accent-primary)';
        header.style.borderColor = 'var(--border-subtle)';
        header.innerHTML = `<i class="fa-solid fa-chevron-right text-[8px]"></i><span>${line}</span>`;
        container.appendChild(header);
        return;
      }

      const st = getLogOperationStyle(null, line);
      const row = document.createElement('div');
      row.className = 'px-2 py-1 rounded-md text-[10.5px] flex items-center gap-2 transition';
      row.style.background = st.bg;
      row.style.borderLeft = `3px solid ${st.border}`;
      row.style.color = st.text;
      row.innerHTML = `
        <span class="px-1.5 py-0.2 rounded text-[8.5px] font-extrabold shrink-0 flex items-center gap-1" style="background: ${st.badgeBg}; color: ${st.border};"><i class="${st.icon} text-[7.5px]"></i><span>${st.badge}</span></span>
        <span class="font-medium break-words">${line}</span>
      `;
      container.appendChild(row);
    });
  } else {
    const curT = Math.floor(appState.currentTick + 0.0001);
    const logs = sim.tickLogs.filter(l => l.tick <= curT);
    if (logs.length === 0) {
      container.innerHTML = `
        <div class="theme-subtle border border-dashed rounded-xl p-4 text-center space-y-2 mt-4" style="border-color: var(--border-subtle);">
          <div class="w-8 h-8 rounded-full mx-auto flex items-center justify-center border" style="background: var(--accent-primary-soft); color: var(--accent-primary); border-color: var(--accent-primary-border);">
            <i class="fa-solid fa-play text-xs ml-0.5"></i>
          </div>
          <div class="text-[11.5px] font-bold theme-text-main">Ready for Transmission</div>
          <p class="text-[10px] theme-text-muted leading-relaxed max-w-xs mx-auto">
            Press <kbd class="px-1.5 py-0.5 rounded border theme-text-main font-mono" style="background: var(--surface-soft); border-color: var(--border-subtle);">Space</kbd> to run or <kbd class="px-1.5 py-0.5 rounded border theme-text-main font-mono" style="background: var(--surface-soft); border-color: var(--border-subtle);">&rarr;</kbd> to step +1 tick. Telemetry frames and timeouts will stream live.
          </p>
        </div>
      `;
      return;
    }
    logs.forEach(item => {
      const st = getLogOperationStyle(item.level, item.text);
      const isCurrentTick = item.tick === curT;
      const row = document.createElement('div');
      row.className = 'px-2 py-1.5 rounded-md text-[10.5px] flex items-center gap-1.5 transition';
      row.style.background = st.bg;
      row.style.borderLeft = `3.5px solid ${st.border}`;
      row.style.borderTop = `1px solid ${isCurrentTick ? st.border : 'transparent'}`;
      row.style.borderRight = `1px solid ${isCurrentTick ? st.border : 'transparent'}`;
      row.style.borderBottom = `1px solid ${isCurrentTick ? st.border : 'transparent'}`;
      row.style.color = st.text;

      row.innerHTML = `
        <span class="font-extrabold shrink-0 w-9 text-[10px]" style="color: ${st.border};">t=${item.tick}</span>
        <span class="px-1.5 py-0.2 rounded text-[8.5px] font-extrabold shrink-0 flex items-center gap-1" style="background: ${st.badgeBg}; color: ${st.border};"><i class="${st.icon} text-[7.5px]"></i><span>${st.badge}</span></span>
        <span class="font-semibold flex-1 break-words">${item.text}</span>
      `;
      container.appendChild(row);
    });

    // Auto-scroll only if user has not scrolled up to inspect previous logs
    const isUserScrolledUp = (container.scrollHeight - container.scrollTop - container.clientHeight) > 40;
    const jumpBtn = document.getElementById('btnJumpToLatestLog');
    if (!isUserScrolledUp) {
      container.scrollTop = container.scrollHeight;
      if (jumpBtn) jumpBtn.classList.add('hidden');
    } else {
      if (jumpBtn) jumpBtn.classList.remove('hidden');
    }
  }
};