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
    btn.style.background = active ? 'var(--accent-primary)' : 'transparent';
    btn.style.color = active ? '#ffffff' : 'var(--text-secondary)';
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
  alertBox.style.borderColor = validation.valid ? 'var(--ack-accent)' : 'var(--danger-accent)';
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
    let bg = 'var(--bg-subtle)';
    let border = 'var(--border-main)';
    let statusLabel = 'Wait';
    let statusColor = 'var(--text-muted)';

    if (f.state === 'acked') {
      bg = 'var(--ack-soft)';
      border = 'var(--ack-accent)';
      statusLabel = 'ACKed';
      statusColor = 'var(--ack-accent)';
    } else if (f.state === 'timeout') {
      bg = 'var(--danger-soft)';
      border = 'var(--danger-accent)';
      statusLabel = 'Re-Tx';
      statusColor = 'var(--danger-accent)';
    } else if (f.state === 'inflight') {
      bg = 'var(--warn-soft)';
      border = 'var(--warn-accent)';
      statusLabel = f.timerRemaining !== null ? `${f.timerRemaining}t` : 'Sent';
      statusColor = 'var(--warn-accent)';
      if (f.timerRemaining !== null) timers.push(`F${f.index}:${f.timerRemaining}t`);
    }

    const el = document.createElement('div');
    el.className = `relative w-12 shrink-0 rounded-lg border px-1.5 py-1 flex flex-col items-center justify-between transition ${inWin ? 'sender-window-slot border-2' : ''}`;
    el.style.background = bg;
    el.style.borderColor = border;
    el.innerHTML = `
      ${inWin && f.index === snap.senderBase ? `<span class="absolute -top-2 left-0.5 px-1 rounded text-[8px] font-mono font-extrabold text-white" style="background: var(--sender-accent);">BASE</span>` : ''}
      <div class="flex items-center justify-between w-full text-[10px] font-mono font-extrabold">
        <span>F${f.index}</span>
        <span class="opacity-70 text-[9px]">S${f.seq}</span>
      </div>
      <div class="text-[9px] font-mono font-bold mt-0.5" style="color: ${statusColor};">${statusLabel}</div>
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
    let bg = 'var(--bg-subtle)';
    let border = 'var(--border-main)';
    let statusLabel = 'Exp';
    let statusColor = 'var(--text-muted)';

    if (r.state === 'delivered') {
      bg = 'var(--ack-soft)';
      border = 'var(--ack-accent)';
      statusLabel = 'Deliv';
      statusColor = 'var(--ack-accent)';
    } else if (r.state === 'buffered') {
      bg = 'var(--receiver-soft)';
      border = 'var(--receiver-accent)';
      statusLabel = 'Buf';
      statusColor = 'var(--receiver-accent)';
    } else if (r.discardCount > 0) {
      statusLabel = `Disc×${r.discardCount}`;
      statusColor = 'var(--danger-accent)';
    }

    const el = document.createElement('div');
    el.className = `relative w-12 shrink-0 rounded-lg border px-1.5 py-1 flex flex-col items-center justify-between transition ${inRcvWin ? 'receiver-window-slot border-2' : ''}`;
    el.style.background = bg;
    el.style.borderColor = border;
    el.innerHTML = `
      ${inRcvWin && r.index === snap.rcvBase ? `<span class="absolute -top-2 left-0.5 px-1 rounded text-[8px] font-mono font-extrabold text-white" style="background: var(--receiver-accent);">NEXT</span>` : ''}
      <div class="flex items-center justify-between w-full text-[10px] font-mono font-extrabold">
        <span>F${r.index}</span>
        <span class="opacity-70 text-[9px]">S${r.seq}</span>
      </div>
      <div class="text-[9px] font-mono font-bold mt-0.5" style="color: ${statusColor};">${statusLabel}</div>
    `;
    receiverTape.appendChild(el);
  });

  drawChannelCanvas(appState.currentTick);
  renderLadderDiagram(appState.currentTick);
  if (appState.logFormat === 'live') renderTransmissionLog();
};

/**
 * Dynamically Sized Channel Canvas Renderer
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

  ctx.fillStyle = pal.canvasBg;
  ctx.fillRect(0, 0, W, H);

  const topY = 24;
  const bottomY = H - 20;
  const midY = (topY + bottomY) / 2;

  // Center fault line
  ctx.strokeStyle = pal.gridLine;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(16, midY);
  ctx.lineTo(W - 16, midY);
  ctx.stroke();
  ctx.setLineDash([]);

  const N = appState.totalFrames;
  const leftPad = 38;
  const rightPad = 38;
  const usableW = Math.max(120, W - leftPad - rightPad);

  for (let i = 0; i < N; i++) {
    const x = leftPad + (N === 1 ? usableW / 2 : (i / (N - 1)) * usableW);
    ctx.strokeStyle = pal.laneLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, topY);
    ctx.lineTo(x, bottomY);
    ctx.stroke();

    ctx.fillStyle = pal.laneText;
    ctx.font = '600 9.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`F${i}`, x, topY - 7);
  }

  const sim = appState.simulation;
  if (!sim || !sim.allChannelPackets) {
    ctx.restore();
    return;
  }

  sim.allChannelPackets.forEach(pkt => {
    const endT = pkt.willDrop ? pkt.dropTick + 0.75 : pkt.arriveTick + 0.3;
    if (floatTick < pkt.sendTick || floatTick > endT) return;

    const laneX = leftPad + (N === 1 ? usableW / 2 : (pkt.frameIdx / (N - 1)) * usableW);

    if (pkt.willDrop && floatTick >= pkt.dropTick) {
      const fade = Math.max(0, 1 - (floatTick - pkt.dropTick) / 0.75);
      const dropProg = (pkt.dropTick - pkt.sendTick) / PROP_DELAY;
      const y = pkt.type === 'DATA'
        ? topY + dropProg * (bottomY - topY)
        : bottomY - dropProg * (bottomY - topY);

      ctx.save();
      ctx.globalAlpha = fade;
      ctx.strokeStyle = pal.lostColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(laneX - 8, y - 8);
      ctx.lineTo(laneX + 8, y + 8);
      ctx.moveTo(laneX + 8, y - 8);
      ctx.lineTo(laneX - 8, y + 8);
      ctx.stroke();

      ctx.fillStyle = pal.lostColor;
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${pkt.type} ${pkt.frameIdx} LOST`, laneX, y - 13);
      ctx.restore();
      return;
    }

    const prog = Math.min(1, Math.max(0, (floatTick - pkt.sendTick) / PROP_DELAY));
    const y = pkt.type === 'DATA'
      ? topY + prog * (bottomY - topY)
      : bottomY - prog * (bottomY - topY);

    const isData = pkt.type === 'DATA';
    const boxW = 56;
    const boxH = 24;

    ctx.save();
    ctx.fillStyle = isData ? (pkt.isRetransmission ? pal.retxFill : pal.dataFill) : pal.ackFill;
    ctx.strokeStyle = isData ? (pkt.isRetransmission ? pal.retxStroke : pal.dataStroke) : pal.ackStroke;
    ctx.lineWidth = 1.8;

    ctx.beginPath();
    ctx.roundRect(laneX - boxW / 2, y - boxH / 2, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isData ? (pkt.isRetransmission ? pal.retxText : pal.dataText) : pal.ackText;
    ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      isData ? `${pkt.isRetransmission ? 'Re-' : ''}F${pkt.frameIdx}(S${pkt.seqNum})` : `ACK ${pkt.frameIdx}`,
      laneX,
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
 * Maps each log entry to a high-contrast visual style
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
      border: '#38bdf8',
      bg: isLight ? 'rgba(2, 132, 199, 0.09)' : 'rgba(56, 189, 248, 0.12)',
      badgeBg: isLight ? 'rgba(2, 132, 199, 0.18)' : 'rgba(56, 189, 248, 0.24)',
      text: isLight ? '#0369a1' : '#7dd3fc'
    },
    recv: {
      badge: 'RX',
      border: '#10b981',
      bg: isLight ? 'rgba(5, 150, 105, 0.09)' : 'rgba(16, 185, 129, 0.13)',
      badgeBg: isLight ? 'rgba(5, 150, 105, 0.18)' : 'rgba(16, 185, 129, 0.25)',
      text: isLight ? '#047857' : '#6ee7b7'
    },
    ack: {
      badge: 'ACK',
      border: '#2dd4bf',
      bg: isLight ? 'rgba(13, 148, 136, 0.09)' : 'rgba(45, 212, 191, 0.12)',
      badgeBg: isLight ? 'rgba(13, 148, 136, 0.18)' : 'rgba(45, 212, 191, 0.24)',
      text: isLight ? '#0f766e' : '#5eead4'
    },
    buffer: {
      badge: 'BUF',
      border: '#c084fc',
      bg: isLight ? 'rgba(124, 58, 237, 0.09)' : 'rgba(192, 132, 252, 0.14)',
      badgeBg: isLight ? 'rgba(124, 58, 237, 0.18)' : 'rgba(192, 132, 252, 0.26)',
      text: isLight ? '#6d28d9' : '#d8b4fe'
    },
    loss: {
      badge: 'LOST',
      border: '#f43f5e',
      bg: isLight ? 'rgba(225, 29, 72, 0.10)' : 'rgba(244, 63, 94, 0.16)',
      badgeBg: isLight ? 'rgba(225, 29, 72, 0.20)' : 'rgba(244, 63, 94, 0.30)',
      text: isLight ? '#be123c' : '#fda4af'
    },
    timeout: {
      badge: 'RTO',
      border: '#f59e0b',
      bg: isLight ? 'rgba(217, 119, 6, 0.11)' : 'rgba(245, 158, 11, 0.16)',
      badgeBg: isLight ? 'rgba(217, 119, 6, 0.22)' : 'rgba(245, 158, 11, 0.30)',
      text: isLight ? '#b45309' : '#fde68a'
    },
    retransmit: {
      badge: 'RE-TX',
      border: '#fb923c',
      bg: isLight ? 'rgba(234, 88, 12, 0.10)' : 'rgba(251, 146, 60, 0.15)',
      badgeBg: isLight ? 'rgba(234, 88, 12, 0.20)' : 'rgba(251, 146, 60, 0.28)',
      text: isLight ? '#c2410c' : '#fed7aa'
    },
    warn: {
      badge: 'DISC',
      border: '#f472b6',
      bg: isLight ? 'rgba(219, 39, 119, 0.09)' : 'rgba(244, 114, 182, 0.14)',
      badgeBg: isLight ? 'rgba(219, 39, 119, 0.18)' : 'rgba(244, 114, 182, 0.26)',
      text: isLight ? '#be185d' : '#fbcfe8'
    },
    error: {
      badge: 'ERR',
      border: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.18)',
      badgeBg: 'rgba(239, 68, 68, 0.32)',
      text: isLight ? '#b91c1c' : '#fca5a5'
    },
    info: {
      badge: 'CFG',
      border: 'var(--border-main)',
      bg: 'var(--bg-subtle)',
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
        header.style.borderColor = 'var(--border-main)';
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
        <span class="px-1.5 py-0.2 rounded text-[8.5px] font-extrabold shrink-0" style="background: ${st.badgeBg}; color: ${st.border};">${st.badge}</span>
        <span class="font-medium break-words">${line}</span>
      `;
      container.appendChild(row);
    });
  } else {
    const curT = Math.floor(appState.currentTick + 0.0001);
    const logs = sim.tickLogs.filter(l => l.tick <= curT);
    if (logs.length === 0) {
      container.innerHTML = `<div class="theme-text-muted italic p-2 rounded border theme-subtle text-[10.5px]">Tick ${curT}: Press <strong>Play</strong> or <strong>+1 Tick</strong> to watch color-coded events appear live.</div>`;
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
        <span class="px-1.5 py-0.2 rounded text-[8.5px] font-extrabold shrink-0" style="background: ${st.badgeBg}; color: ${st.border};">${st.badge}</span>
        <span class="font-semibold flex-1 break-words">${item.text}</span>
      `;
      container.appendChild(row);
    });
    container.scrollTop = container.scrollHeight;
  }
};