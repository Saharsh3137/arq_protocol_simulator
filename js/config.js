/**
 * js/config.js
 * Central configuration, theme palettes, state store, and helper utilities.
 */
window.ARQ = window.ARQ || {};

window.ARQ.PROP_DELAY = 3;
window.ARQ.TIMEOUT_TICKS = 9;

// Theme Palettes for HTML5 Canvas & Dynamic Badges (Soft Canvas & Muted Slate)
window.ARQ.THEME_PALETTES = {
  paper: {
    canvasBg: '#FAFBF9',
    pillBg: '#FFFFFF',
    gridLine: 'rgba(41, 51, 47, 0.06)',
    laneLine: 'rgba(41, 51, 47, 0.05)',
    laneText: '#737E77',
    senderLaneBg: 'rgba(84, 131, 184, 0.05)',
    receiverLaneBg: 'rgba(139, 120, 184, 0.05)',
    midLine: 'rgba(41, 51, 47, 0.10)',
    senderLabel: '#5483B8',
    receiverLabel: '#8B78B8',
    dataFill: 'rgba(84, 131, 184, 0.09)',
    dataStroke: '#5483B8',
    dataText: '#243C5A',
    retxFill: 'rgba(193, 138, 67, 0.10)',
    retxStroke: '#C18A43',
    retxText: '#5C3D12',
    ackFill: 'rgba(67, 134, 109, 0.09)',
    ackStroke: '#43866D',
    ackText: '#1C4435',
    lostColor: '#C76B70',
    bufColor: '#8B78B8'
  },
  obsidian: {
    canvasBg: '#1A211F',
    pillBg: '#242D2B',
    gridLine: 'rgba(237, 242, 239, 0.06)',
    laneLine: 'rgba(237, 242, 239, 0.05)',
    laneText: '#9CA8A3',
    senderLaneBg: 'rgba(112, 160, 214, 0.06)',
    receiverLaneBg: 'rgba(168, 150, 209, 0.06)',
    midLine: 'rgba(237, 242, 239, 0.12)',
    senderLabel: '#70A0D6',
    receiverLabel: '#A896D1',
    dataFill: 'rgba(112, 160, 214, 0.14)',
    dataStroke: '#70A0D6',
    dataText: '#EDF2EF',
    retxFill: 'rgba(217, 164, 91, 0.14)',
    retxStroke: '#D9A45B',
    retxText: '#FFF9EF',
    ackFill: 'rgba(92, 168, 141, 0.14)',
    ackStroke: '#5CA88D',
    ackText: '#F2F9F5',
    lostColor: '#DB8287',
    bufColor: '#A896D1'
  }
};

// Application Reactive State (Soft Canvas Light Theme Default)
window.ARQ.appState = {
  theme: 'paper',
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