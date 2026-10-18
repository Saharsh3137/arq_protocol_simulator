/**
 * js/config.js
 * Central configuration, theme palettes, state store, and helper utilities.
 */
window.ARQ = window.ARQ || {};

window.ARQ.PROP_DELAY = 3;
window.ARQ.TIMEOUT_TICKS = 9;

// Theme Palettes for HTML5 Canvas & Dynamic Badges
window.ARQ.THEME_PALETTES = {
  paper: {
    canvasBg: '#f8fafc',
    pillBg: '#ffffff',
    gridLine: '#cbd5e1',
    laneLine: 'rgba(148, 163, 184, 0.35)',
    laneText: '#64748b',
    dataFill: '#eff6ff',
    dataStroke: '#2563eb',
    dataText: '#1e3a8a',
    retxFill: '#fffbeb',
    retxStroke: '#d97706',
    retxText: '#92400e',
    ackFill: '#f0fdfa',
    ackStroke: '#0d9488',
    ackText: '#115e59',
    lostColor: '#e11d48',
    bufColor: '#7c3aed'
  },
  obsidian: {
    canvasBg: '#14171d',
    pillBg: '#191c22',
    gridLine: '#2d323e',
    laneLine: 'rgba(75, 85, 99, 0.35)',
    laneText: '#9ca3af',
    dataFill: '#0c2d48',
    dataStroke: '#38bdf8',
    dataText: '#e0f2fe',
    retxFill: '#3b2106',
    retxStroke: '#f59e0b',
    retxText: '#fef3c7',
    ackFill: '#063729',
    ackStroke: '#10b981',
    ackText: '#d1fae5',
    lostColor: '#f43f5e',
    bufColor: '#c084fc'
  }
};

// Application Reactive State
window.ARQ.appState = {
  theme: 'obsidian',
  protocol: 'GBN',       // 'SW' | 'GBN' | 'SR'
  totalFrames: 10,       // N
  seqBits: 3,            // m
  ws: 4,                 // Sender Window Size
  wr: 1,                 // Receiver Window Size
  lostFrames: [3, 7],
  lostAcks: [5],
  simulation: null,
  currentTick: 0,
  isPlaying: false,
  playbackSpeed: 0.9,
  activeStageView: 'channel',
  logFormat: 'live',
  lastFrameTime: 0
};

/**
 * Parses comma-separated string of numbers into a sorted array of valid indices
 */
window.ARQ.parseNumberList = function (str, maxLimit) {
  if (!str || !str.trim()) return [];
  return str
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n) && n >= 0 && n < maxLimit);
};

/**
 * Applies a preset Lab Sheet Test Case (TC 1–7) to appState
 */
window.ARQ.applyTestCasePreset = function (tc) {
  const { appState } = window.ARQ;

  if (tc === 1) {
    appState.totalFrames = 8; appState.seqBits = 3;
    appState.ws = appState.protocol === 'SW' ? 1 : 4;
    appState.wr = appState.protocol === 'SR' ? 4 : 1;
    appState.lostFrames = []; appState.lostAcks = [];
  } else if (tc === 2) {
    appState.totalFrames = 10; appState.seqBits = 3;
    appState.ws = appState.protocol === 'SW' ? 1 : 4;
    appState.wr = appState.protocol === 'SR' ? 4 : 1;
    appState.lostFrames = [3]; appState.lostAcks = [];
  } else if (tc === 3) {
    appState.totalFrames = 8; appState.seqBits = 3;
    appState.ws = appState.protocol === 'SW' ? 1 : 4;
    appState.wr = appState.protocol === 'SR' ? 4 : 1;
    appState.lostFrames = []; appState.lostAcks = [2];
  } else if (tc === 4) {
    appState.totalFrames = 10; appState.seqBits = 3;
    appState.ws = appState.protocol === 'SW' ? 1 : 4;
    appState.wr = appState.protocol === 'SR' ? 4 : 1;
    appState.lostFrames = [2, 3, 4]; appState.lostAcks = [];
  } else if (tc === 5) {
    if (appState.protocol === 'SW') appState.protocol = 'GBN';
    appState.totalFrames = 12; appState.seqBits = 4;
    appState.ws = 6; appState.wr = appState.protocol === 'SR' ? 6 : 1;
    appState.lostFrames = [2, 7]; appState.lostAcks = [];
  } else if (tc === 6) {
    appState.totalFrames = 10; appState.seqBits = 2;
    appState.ws = appState.protocol === 'SW' ? 1 : (appState.protocol === 'SR' ? 2 : 3);
    appState.wr = appState.protocol === 'SR' ? 2 : 1;
    appState.lostFrames = [3]; appState.lostAcks = [];
  } else if (tc === 7) {
    appState.protocol = 'SR'; appState.totalFrames = 10;
    appState.seqBits = 3; appState.ws = 6; appState.wr = 6;
    appState.lostFrames = [3]; appState.lostAcks = [];
  }
};