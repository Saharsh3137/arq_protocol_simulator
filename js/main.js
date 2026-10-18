/**
 * js/main.js
 * Playback Controller, Event Listeners, Stage View Switcher & Application Bootstrap.
 */
window.ARQ = window.ARQ || {};

window.ARQ.recomputeAndRender = function (resetTickToZero = true) {
  const {
    appState,
    pauseSimulation,
    updateControlPanelUI,
    runGeneralizedARQSimulation,
    renderCurrentTickState,
    renderTransmissionLog
  } = window.ARQ;

  pauseSimulation();
  updateControlPanelUI();

  appState.simulation = runGeneralizedARQSimulation({
    protocol: appState.protocol,
    totalFrames: appState.totalFrames,
    seqBits: appState.seqBits,
    ws: appState.ws,
    wr: appState.wr,
    lostFrames: appState.lostFrames,
    lostAcks: appState.lostAcks
  });

  const maxTick = appState.simulation.maxTick;
  const scrubber = document.getElementById('timelineScrubber');
  scrubber.max = maxTick;
  document.getElementById('scrubberMaxLabel').textContent = `/${maxTick}`;

  if (resetTickToZero || appState.currentTick > maxTick) {
    appState.currentTick = 0;
  }
  scrubber.value = appState.currentTick;

  renderCurrentTickState();
  renderTransmissionLog();
};

window.ARQ.startSimulation = function () {
  const { appState, animationLoop } = window.ARQ;
  if (!appState.simulation) return;
  if (appState.currentTick >= appState.simulation.maxTick) appState.currentTick = 0;
  appState.isPlaying = true;
  appState.lastFrameTime = performance.now();
  document.getElementById('iconPlayPause').className = 'fa-solid fa-pause text-[10px]';
  document.getElementById('textPlayPause').textContent = 'Pause';
  requestAnimationFrame(animationLoop);
};

window.ARQ.pauseSimulation = function () {
  const { appState } = window.ARQ;
  appState.isPlaying = false;
  const icon = document.getElementById('iconPlayPause');
  const txt = document.getElementById('textPlayPause');
  if (icon) icon.className = 'fa-solid fa-play text-[10px]';
  if (txt) txt.textContent = 'Play';
};

window.ARQ.animationLoop = function (now) {
  const { appState, renderCurrentTickState, pauseSimulation, animationLoop } = window.ARQ;
  if (!appState.isPlaying) return;
  const dt = (now - appState.lastFrameTime) / 1000;
  appState.lastFrameTime = now;

  appState.currentTick += dt * appState.playbackSpeed;
  if (appState.currentTick >= appState.simulation.maxTick) {
    appState.currentTick = appState.simulation.maxTick;
    renderCurrentTickState();
    pauseSimulation();
    return;
  }
  renderCurrentTickState();
  requestAnimationFrame(animationLoop);
};

// Bootstrap Application on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  const {
    appState,
    applyTheme,
    parseNumberList,
    applyTestCasePreset,
    recomputeAndRender,
    startSimulation,
    pauseSimulation,
    renderCurrentTickState,
    renderTransmissionLog,
    drawChannelCanvas,
    renderLadderDiagram,
    openComparisonModal,
    copyTextToClipboard
  } = window.ARQ;

  // Theme Switcher (Default to Obsidian)
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => applyTheme(btn.getAttribute('data-set-theme')));
  });
  applyTheme('obsidian');

  // Protocol Selection
  document.querySelectorAll('.protocol-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.getAttribute('data-protocol');
      appState.protocol = p;
      const maxHalf = Math.max(1, Math.pow(2, appState.seqBits - 1));
      const maxGbn = Math.pow(2, appState.seqBits) - 1;
      if (p === 'SW') {
        appState.ws = 1; appState.wr = 1;
      } else if (p === 'GBN') {
        appState.ws = Math.min(4, maxGbn); appState.wr = 1;
      } else {
        appState.ws = Math.min(4, maxHalf); appState.wr = Math.min(4, maxHalf);
      }
      recomputeAndRender(true);
    });
  });

  // Parameter Inputs
  document.getElementById('inputTotalFrames').addEventListener('input', e => {
    appState.totalFrames = parseInt(e.target.value, 10) || 10;
    appState.lostFrames = appState.lostFrames.filter(i => i < appState.totalFrames);
    appState.lostAcks = appState.lostAcks.filter(i => i < appState.totalFrames);
    document.getElementById('inputLostFrames').value = appState.lostFrames.join(', ');
    document.getElementById('inputLostAcks').value = appState.lostAcks.join(', ');
    recomputeAndRender(true);
  });

  document.getElementById('inputSeqBits').addEventListener('input', e => {
    appState.seqBits = parseInt(e.target.value, 10) || 3;
    recomputeAndRender(true);
  });

  document.getElementById('inputWs').addEventListener('input', e => {
    appState.ws = Math.max(1, parseInt(e.target.value, 10) || 1);
    recomputeAndRender(true);
  });

  document.getElementById('inputWr').addEventListener('input', e => {
    appState.wr = Math.max(1, parseInt(e.target.value, 10) || 1);
    recomputeAndRender(true);
  });

  document.getElementById('inputLostFrames').addEventListener('input', e => {
    appState.lostFrames = parseNumberList(e.target.value, appState.totalFrames);
    recomputeAndRender(true);
  });

  document.getElementById('inputLostAcks').addEventListener('input', e => {
    appState.lostAcks = parseNumberList(e.target.value, appState.totalFrames);
    recomputeAndRender(true);
  });

  document.getElementById('btnClearErrors').addEventListener('click', () => {
    appState.lostFrames = [];
    appState.lostAcks = [];
    document.getElementById('inputLostFrames').value = '';
    document.getElementById('inputLostAcks').value = '';
    recomputeAndRender(true);
  });

  // 7 Preset Lab Sheet Test Cases
  document.querySelectorAll('.tc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tc = parseInt(btn.getAttribute('data-tc'), 10);
      applyTestCasePreset(tc);
      document.getElementById('inputLostFrames').value = appState.lostFrames.join(', ');
      document.getElementById('inputLostAcks').value = appState.lostAcks.join(', ');
      recomputeAndRender(true);
    });
  });

  // Playback Controls
  document.getElementById('btnPlayPause').addEventListener('click', () => {
    if (appState.isPlaying) pauseSimulation();
    else startSimulation();
  });

  document.getElementById('btnStepForward').addEventListener('click', () => {
    pauseSimulation();
    if (!appState.simulation) return;
    appState.currentTick = Math.min(appState.simulation.maxTick, Math.floor(appState.currentTick) + 1);
    renderCurrentTickState();
  });

  document.getElementById('btnStepBack').addEventListener('click', () => {
    pauseSimulation();
    appState.currentTick = Math.max(0, Math.ceil(appState.currentTick) - 1);
    renderCurrentTickState();
  });

  document.getElementById('btnJumpEnd').addEventListener('click', () => {
    pauseSimulation();
    if (!appState.simulation) return;
    appState.currentTick = appState.simulation.maxTick;
    renderCurrentTickState();
  });

  document.getElementById('btnResetSim').addEventListener('click', () => {
    pauseSimulation();
    appState.currentTick = 0;
    renderCurrentTickState();
  });

  document.getElementById('timelineScrubber').addEventListener('input', e => {
    pauseSimulation();
    appState.currentTick = parseFloat(e.target.value) || 0;
    renderCurrentTickState();
  });

  document.getElementById('selectSpeed').addEventListener('change', e => {
    appState.playbackSpeed = parseFloat(e.target.value) || 0.9;
  });

  // Stage View Switcher (Channel | Split Live | Live Ladder)
  const syncStageViewLayout = () => {
    document.querySelectorAll('.stage-tab-btn').forEach(b => {
      const active = b.getAttribute('data-view') === appState.activeStageView;
      b.style.background = active ? 'var(--accent-primary)' : 'transparent';
      b.style.color = active ? '#ffffff' : 'var(--text-secondary)';
    });

    const wrapper = document.getElementById('stageBodyWrapper');
    const chView = document.getElementById('viewChannelStage');
    const ldView = document.getElementById('viewLadderStage');

    if (appState.activeStageView === 'channel') {
      wrapper.className = 'flex-1 min-h-0 grid grid-cols-1 w-full h-full overflow-hidden';
      chView.classList.remove('hidden');
      ldView.classList.add('hidden');
    } else if (appState.activeStageView === 'ladder') {
      wrapper.className = 'flex-1 min-h-0 grid grid-cols-1 w-full h-full overflow-hidden';
      chView.classList.add('hidden');
      ldView.classList.remove('hidden');
    } else {
      wrapper.className = 'flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 w-full h-full overflow-hidden';
      chView.classList.remove('hidden');
      ldView.classList.remove('hidden');
    }

    drawChannelCanvas(appState.currentTick);
    renderLadderDiagram(appState.currentTick);
  };
  syncStageViewLayout();

  document.querySelectorAll('.stage-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      appState.activeStageView = btn.getAttribute('data-view');
      syncStageViewLayout();
    });
  });

  document.getElementById('selectLogFormat').addEventListener('change', e => {
    appState.logFormat = e.target.value;
    renderTransmissionLog();
  });

  document.getElementById('btnCopyLog').addEventListener('click', () => {
    if (!appState.simulation) return;
    copyTextToClipboard(appState.simulation.assignmentLines.join('\n'), document.getElementById('copyLogText'), 'Copied!');
  });

  // Comparison Modal
  document.getElementById('btnRunComparison').addEventListener('click', openComparisonModal);
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const m = document.getElementById(btn.getAttribute('data-close-modal'));
      m.classList.add('hidden');
      m.classList.remove('flex');
    });
  });

  document.getElementById('btnCopyComparisonMarkdown').addEventListener('click', () => {
    copyTextToClipboard(window._latestComparisonMarkdown || '', document.getElementById('textCopyComparison'), 'Copied!');
  });

  // ResizeObserver ensures the Canvas dynamically fits the exact middle space
  const stageContainer = document.getElementById('viewChannelStage');
  if (window.ResizeObserver && stageContainer) {
    const ro = new ResizeObserver(() => drawChannelCanvas(appState.currentTick));
    ro.observe(stageContainer);
  }
  window.addEventListener('resize', () => drawChannelCanvas(appState.currentTick));

  recomputeAndRender(true);
});