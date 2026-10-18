/**
 * js/engine.js
 * Pure Discrete-Event Simulation Engine for Stop-and-Wait, Go-Back-N, and Selective Repeat.
 */
window.ARQ = window.ARQ || {};

/**
 * Validates configuration rules from Page 2 of the Lab Sheet
 */
window.ARQ.validateProtocolConfig = function (protocol, m, ws, wr) {
  const seqSpace = Math.pow(2, m);
  if (protocol === 'SW') {
    const valid = (ws === 1 && wr === 1);
    return {
      valid,
      maxWs: 1,
      maxWr: 1,
      formula: 'Ws = 1, Wr = 1',
      title: valid ? 'Stop-and-Wait Ready:' : 'Invalid Stop-and-Wait:',
      message: valid
        ? `Locks Ws=1, Wr=1 (${seqSpace} seqs: 0..${seqSpace - 1}).`
        : `Requires Ws = 1 and Wr = 1.`
    };
  } else if (protocol === 'GBN') {
    const maxWs = seqSpace - 1;
    const valid = (ws >= 1 && ws <= maxWs && wr === 1);
    return {
      valid,
      maxWs,
      maxWr: 1,
      formula: `Ws \u2264 2^m - 1 (${maxWs})`,
      title: valid ? 'Valid GBN Config:' : 'Invalid GBN Window:',
      message: valid
        ? `Ws (${ws}) \u2264 2^${m}-1 (${maxWs}), Wr=1. No modulo-${seqSpace} aliasing.`
        : `Ws=${ws} exceeds 2^${m}-1 (${maxWs})! Causes sequence aliasing.`
    };
  } else {
    const maxWin = Math.max(1, Math.pow(2, m - 1));
    const valid = (ws >= 1 && ws <= maxWin && wr >= 1 && wr <= maxWin && (m > 1 || (ws === 1 && wr === 1)));
    return {
      valid,
      maxWs: maxWin,
      maxWr: maxWin,
      formula: `Ws, Wr \u2264 2^(m-1) (${maxWin})`,
      title: valid ? 'Valid SR Config:' : 'Invalid SR Window (TC 7):',
      message: valid
        ? `Ws (${ws}), Wr (${wr}) \u2264 2^(${m}-1) (${maxWin}). Windows disjoint.`
        : `Ws (${ws}) or Wr (${wr}) > 2^(${m}-1) = ${maxWin}! Causes window overlap.`
    };
  }
};

function consumeFault(faultArray, targetIndex) {
  const idx = faultArray.indexOf(targetIndex);
  if (idx !== -1) {
    faultArray.splice(idx, 1);
    return true;
  }
  return false;
}

function buildTickSnapshot(tick, headline, senderBase, senderNext, rcvBase, senderFrames, receiverFrames, metrics) {
  const { TIMEOUT_TICKS } = window.ARQ;
  return {
    tick,
    headline,
    senderBase,
    senderNext,
    rcvBase,
    senderFrames: senderFrames.map(f => ({
      index: f.index,
      seq: f.seq,
      state: f.needsRetransmit ? 'timeout' : f.state,
      attempts: f.attempts,
      timerRemaining: (f.state === 'inflight' && f.timerStart !== null && !f.needsRetransmit)
        ? Math.max(0, TIMEOUT_TICKS - (tick - f.timerStart))
        : null
    })),
    receiverFrames: receiverFrames.map(r => ({
      index: r.index,
      seq: r.seq,
      state: r.state,
      discardCount: r.discardCount
    })),
    metrics: { ...metrics }
  };
}

/**
 * Core Generalized Discrete-Event ARQ Simulator Engine
 */
window.ARQ.runGeneralizedARQSimulation = function (config) {
  const { PROP_DELAY, TIMEOUT_TICKS, validateProtocolConfig } = window.ARQ;
  const { protocol, totalFrames, seqBits, ws, wr, lostFrames, lostAcks } = config;
  const seqSpace = Math.pow(2, seqBits);
  const validation = validateProtocolConfig(protocol, seqBits, ws, wr);

  const assignmentLines = [];
  const tickLogs = [];
  const ladderEvents = [];

  const protocolNames = { SW: 'Stop-and-Wait', GBN: 'Go-Back-N', SR: 'Selective Repeat' };

  assignmentLines.push(`TRANSMISSION LOG`);
  assignmentLines.push(`Protocol: ${protocolNames[protocol]}`);
  assignmentLines.push(`Config: N=${totalFrames}, m=${seqBits} (Seq 0..${seqSpace - 1}), Ws=${ws}, Wr=${wr}`);

  if (!validation.valid) {
    assignmentLines.push(`[ERROR] Invalid Configuration Detected!`);
    assignmentLines.push(`${validation.title} ${validation.message}`);
    tickLogs.push({ tick: 0, level: 'error', text: `${validation.title} ${validation.message}` });

    const emptySender = Array.from({ length: totalFrames }, (_, i) => ({
      index: i, seq: i % seqSpace, state: 'unsent', attempts: 0, timerRemaining: null
    }));
    const emptyRcv = Array.from({ length: totalFrames }, (_, i) => ({
      index: i, seq: i % seqSpace, state: 'expected', discardCount: 0
    }));

    return {
      valid: false,
      validation,
      maxTick: 0,
      metrics: { delivered: 0, attempts: 0, retransmissions: 0, discarded: 0, simTime: 0 },
      snapshots: [{
        tick: 0,
        headline: `${validation.title} ${validation.message}`,
        senderBase: 0,
        senderNext: 0,
        rcvBase: 0,
        senderFrames: emptySender,
        receiverFrames: emptyRcv,
        metrics: { delivered: 0, attempts: 0, retransmissions: 0, discarded: 0, simTime: 0 }
      }],
      allChannelPackets: [],
      assignmentLines,
      tickLogs,
      ladderEvents
    };
  }

  const pendingFrameDrops = [...lostFrames];
  const pendingAckDrops = [...lostAcks];

  let senderBase = 0;
  let senderNext = 0;
  const senderFrames = Array.from({ length: totalFrames }, (_, i) => ({
    index: i,
    seq: i % seqSpace,
    state: 'unsent',
    attempts: 0,
    timerStart: null,
    needsRetransmit: false
  }));

  let rcvBase = 0;
  const receiverFrames = Array.from({ length: totalFrames }, (_, i) => ({
    index: i,
    seq: i % seqSpace,
    state: 'expected',
    discardCount: 0
  }));

  const allChannelPackets = [];
  let packetIdCounter = 1;

  let totalAttempts = 0;
  let totalRetransmissions = 0;
  let totalDiscarded = 0;
  let deliveredCount = 0;

  const snapshots = [];
  const MAX_SIM_TICKS = 400;
  let tick = 0;

  while (tick <= MAX_SIM_TICKS) {
    const tickEvents = [];

    // STEP 1: Process mid-channel losses and arrivals
    for (const pkt of allChannelPackets) {
      if (pkt.status !== 'flying') continue;

      if (pkt.willDrop && tick === pkt.dropTick) {
        pkt.status = 'dropped';
        if (pkt.type === 'DATA') {
          assignmentLines.push(`Frame loss detected (Frame ${pkt.frameIdx}, Seq ${pkt.seqNum})`);
          tickLogs.push({ tick, level: 'loss', text: `Frame ${pkt.frameIdx} (Seq ${pkt.seqNum}) LOST in channel` });
          tickEvents.push(`Frame ${pkt.frameIdx} LOST`);
        } else {
          assignmentLines.push(`ACK loss detected (ACK ${pkt.frameIdx}, Seq ${pkt.seqNum})`);
          tickLogs.push({ tick, level: 'loss', text: `ACK ${pkt.frameIdx} (Seq ${pkt.seqNum}) LOST in channel` });
          tickEvents.push(`ACK ${pkt.frameIdx} LOST`);
        }
        continue;
      }

      if (!pkt.willDrop && tick === pkt.arriveTick) {
        pkt.status = 'arrived';

        if (pkt.type === 'DATA') {
          const fIdx = pkt.frameIdx;
          const fSeq = pkt.seqNum;

          if (protocol === 'SW' || protocol === 'GBN') {
            if (fIdx === rcvBase) {
              receiverFrames[fIdx].state = 'delivered';
              rcvBase++;
              deliveredCount++;
              assignmentLines.push(`Frame ${fIdx} (Seq ${fSeq}) received successfully`);

              const shouldDropAck = consumeFault(pendingAckDrops, fIdx);
              const ackPkt = {
                id: packetIdCounter++,
                type: 'ACK',
                frameIdx: fIdx,
                seqNum: fSeq,
                cumulativeUpTo: fIdx,
                sendTick: tick,
                arriveTick: tick + PROP_DELAY,
                willDrop: shouldDropAck,
                dropTick: tick + Math.ceil(PROP_DELAY / 2),
                status: 'flying'
              };
              allChannelPackets.push(ackPkt);
              ladderEvents.push({
                type: 'ACK',
                frameIdx: fIdx,
                seqNum: fSeq,
                sendTick: tick,
                endTick: shouldDropAck ? ackPkt.dropTick : ackPkt.arriveTick,
                status: shouldDropAck ? 'lost' : 'ok',
                label: protocol === 'GBN' ? `ACK ${fIdx} (Cum)` : `ACK ${fIdx}`
              });

              assignmentLines.push(`ACK ${fIdx} (Seq ${fSeq}) generated`);
              tickLogs.push({ tick, level: 'recv', text: `Frame ${fIdx} delivered -> ACK ${fIdx} sent` });
              tickEvents.push(`Frame ${fIdx} OK, ACK ${fIdx} sent`);
            } else if (fIdx > rcvBase) {
              totalDiscarded++;
              receiverFrames[fIdx].discardCount++;
              if (pkt.ladderRef) pkt.ladderRef.status = 'discarded';

              assignmentLines.push(`Frame ${fIdx} out-of-order (Expected ${rcvBase}) -> Discarded`);
              tickLogs.push({ tick, level: 'warn', text: `GBN discarded out-of-order Frame ${fIdx} (expected ${rcvBase})` });
              tickEvents.push(`Frame ${fIdx} DISCARDED`);

              if (rcvBase > 0) {
                const lastInOrder = rcvBase - 1;
                const lastSeq = lastInOrder % seqSpace;
                const dupAckPkt = {
                  id: packetIdCounter++,
                  type: 'ACK',
                  frameIdx: lastInOrder,
                  seqNum: lastSeq,
                  cumulativeUpTo: lastInOrder,
                  sendTick: tick,
                  arriveTick: tick + PROP_DELAY,
                  willDrop: false,
                  dropTick: -1,
                  status: 'flying'
                };
                allChannelPackets.push(dupAckPkt);
                ladderEvents.push({
                  type: 'ACK',
                  frameIdx: lastInOrder,
                  seqNum: lastSeq,
                  sendTick: tick,
                  endTick: dupAckPkt.arriveTick,
                  status: 'dup',
                  label: `Dup ACK ${lastInOrder}`
                });
              }
            } else {
              totalDiscarded++;
              receiverFrames[fIdx].discardCount++;
              if (pkt.ladderRef) pkt.ladderRef.status = 'discarded';
              assignmentLines.push(`Duplicate Frame ${fIdx} discarded -> Re-sent ACK ${fIdx}`);
              tickLogs.push({ tick, level: 'warn', text: `Duplicate Frame ${fIdx} discarded -> Re-sent ACK ${fIdx}` });

              const resendAck = {
                id: packetIdCounter++,
                type: 'ACK',
                frameIdx: fIdx,
                seqNum: fSeq,
                cumulativeUpTo: Math.max(fIdx, rcvBase - 1),
                sendTick: tick,
                arriveTick: tick + PROP_DELAY,
                willDrop: false,
                dropTick: -1,
                status: 'flying'
              };
              allChannelPackets.push(resendAck);
              ladderEvents.push({
                type: 'ACK',
                frameIdx: fIdx,
                seqNum: fSeq,
                sendTick: tick,
                endTick: resendAck.arriveTick,
                status: 'ok',
                label: `ACK ${fIdx}`
              });
            }
          } else if (protocol === 'SR') {
            if (fIdx >= rcvBase && fIdx < rcvBase + wr) {
              if (fIdx === rcvBase) {
                receiverFrames[fIdx].state = 'delivered';
                deliveredCount++;
                assignmentLines.push(`Frame ${fIdx} (Seq ${fSeq}) received successfully`);

                rcvBase++;
                const flushed = [];
                while (rcvBase < totalFrames && receiverFrames[rcvBase].state === 'buffered') {
                  receiverFrames[rcvBase].state = 'delivered';
                  deliveredCount++;
                  flushed.push(rcvBase);
                  rcvBase++;
                }
                if (flushed.length > 0) {
                  assignmentLines.push(`Buffered [${flushed.join(', ')}] delivered, Wr slid to ${rcvBase}`);
                  tickLogs.push({ tick, level: 'recv', text: `Delivered F${fIdx} + buffered [${flushed.join(', ')}]` });
                } else {
                  tickLogs.push({ tick, level: 'recv', text: `SR delivered Frame ${fIdx} -> Sent ACK ${fIdx}` });
                }
              } else {
                if (receiverFrames[fIdx].state !== 'buffered' && receiverFrames[fIdx].state !== 'delivered') {
                  receiverFrames[fIdx].state = 'buffered';
                  if (pkt.ladderRef) pkt.ladderRef.status = 'buffered';
                  assignmentLines.push(`Frame ${fIdx} (Seq ${fSeq}) buffered in SR receiver window`);
                  tickLogs.push({ tick, level: 'buffer', text: `SR buffered out-of-order Frame ${fIdx}` });
                } else {
                  totalDiscarded++;
                }
              }

              const shouldDropAck = consumeFault(pendingAckDrops, fIdx);
              const srAckPkt = {
                id: packetIdCounter++,
                type: 'ACK',
                frameIdx: fIdx,
                seqNum: fSeq,
                cumulativeUpTo: fIdx,
                sendTick: tick,
                arriveTick: tick + PROP_DELAY,
                willDrop: shouldDropAck,
                dropTick: tick + Math.ceil(PROP_DELAY / 2),
                status: 'flying'
              };
              allChannelPackets.push(srAckPkt);
              ladderEvents.push({
                type: 'ACK',
                frameIdx: fIdx,
                seqNum: fSeq,
                sendTick: tick,
                endTick: shouldDropAck ? srAckPkt.dropTick : srAckPkt.arriveTick,
                status: shouldDropAck ? 'lost' : 'ok',
                label: `ACK ${fIdx}`
              });
              assignmentLines.push(`ACK ${fIdx} (Seq ${fSeq}) generated`);
              tickEvents.push(`Frame ${fIdx} OK, ACK ${fIdx} sent`);
            } else if (fIdx < rcvBase) {
              totalDiscarded++;
              receiverFrames[fIdx].discardCount++;
              if (pkt.ladderRef) pkt.ladderRef.status = 'discarded';
              assignmentLines.push(`Duplicate Frame ${fIdx} discarded -> Re-sent ACK ${fIdx}`);
              const srDupAck = {
                id: packetIdCounter++,
                type: 'ACK',
                frameIdx: fIdx,
                seqNum: fSeq,
                cumulativeUpTo: fIdx,
                sendTick: tick,
                arriveTick: tick + PROP_DELAY,
                willDrop: false,
                dropTick: -1,
                status: 'flying'
              };
              allChannelPackets.push(srDupAck);
              ladderEvents.push({
                type: 'ACK',
                frameIdx: fIdx,
                seqNum: fSeq,
                sendTick: tick,
                endTick: srDupAck.arriveTick,
                status: 'ok',
                label: `ACK ${fIdx}`
              });
            } else {
              totalDiscarded++;
              receiverFrames[fIdx].discardCount++;
              if (pkt.ladderRef) pkt.ladderRef.status = 'discarded';
              assignmentLines.push(`Frame ${fIdx} outside SR window -> Discarded`);
            }
          }
        } else if (pkt.type === 'ACK') {
          const ackIdx = pkt.frameIdx;

          if (protocol === 'SW') {
            if (ackIdx === senderBase && senderFrames[ackIdx].state !== 'acked') {
              senderFrames[ackIdx].state = 'acked';
              senderFrames[ackIdx].timerStart = null;
              senderFrames[ackIdx].needsRetransmit = false;
              senderBase++;
              tickLogs.push({ tick, level: 'ack', text: `ACK ${ackIdx} received -> base=${senderBase}` });
              tickEvents.push(`ACK ${ackIdx} received`);
            }
          } else if (protocol === 'GBN') {
            const cumulIdx = pkt.cumulativeUpTo !== undefined ? pkt.cumulativeUpTo : ackIdx;
            if (cumulIdx >= senderBase) {
              for (let i = senderBase; i <= cumulIdx; i++) {
                senderFrames[i].state = 'acked';
                senderFrames[i].timerStart = null;
                senderFrames[i].needsRetransmit = false;
              }
              senderBase = cumulIdx + 1;
              if (senderBase < senderNext && senderBase < totalFrames && senderFrames[senderBase].timerStart === null) {
                senderFrames[senderBase].timerStart = tick;
              }
              tickLogs.push({ tick, level: 'ack', text: `Cumul ACK ${cumulIdx} received -> base=${senderBase}` });
              tickEvents.push(`Cumul ACK ${cumulIdx} received`);
            }
          } else if (protocol === 'SR') {
            if (senderFrames[ackIdx].state !== 'acked') {
              senderFrames[ackIdx].state = 'acked';
              senderFrames[ackIdx].timerStart = null;
              senderFrames[ackIdx].needsRetransmit = false;
              while (senderBase < totalFrames && senderFrames[senderBase].state === 'acked') {
                senderBase++;
              }
              tickLogs.push({ tick, level: 'ack', text: `Indiv ACK ${ackIdx} received -> base=${senderBase}` });
              tickEvents.push(`Indiv ACK ${ackIdx} received`);
            }
          }
        }
      }
    }

    // STEP 2: Completion check
    if (senderBase >= totalFrames && deliveredCount >= totalFrames) {
      snapshots.push(buildTickSnapshot(
        tick,
        `Simulation Complete at Tick ${tick} — All ${totalFrames} frames delivered!`,
        senderBase,
        senderNext,
        rcvBase,
        senderFrames,
        receiverFrames,
        { delivered: deliveredCount, attempts: totalAttempts, retransmissions: totalRetransmissions, discarded: totalDiscarded, simTime: tick }
      ));
      break;
    }

    // STEP 3: Check Sender Timers
    if (protocol === 'SW' || protocol === 'GBN') {
      if (senderBase < senderNext && senderBase < totalFrames) {
        const bf = senderFrames[senderBase];
        if (bf.state === 'inflight' && !bf.needsRetransmit && bf.timerStart !== null && tick - bf.timerStart >= TIMEOUT_TICKS) {
          assignmentLines.push(`Timeout occurred (Frame ${senderBase})`);
          if (protocol === 'GBN') {
            const rb = [];
            for (let i = senderBase; i < senderNext; i++) {
              senderFrames[i].needsRetransmit = true;
              senderFrames[i].timerStart = null;
              rb.push(i);
            }
            assignmentLines.push(`Retransmitting outstanding frames [${rb.join(', ')}]`);
            tickLogs.push({ tick, level: 'timeout', text: `Timeout F${senderBase}! GBN retransmitting [${rb.join(', ')}]` });
            tickEvents.push(`TIMEOUT F${senderBase} -> GBN [${rb.join(', ')}]`);
          } else {
            bf.needsRetransmit = true;
            bf.timerStart = null;
            assignmentLines.push(`Retransmitting Frame ${senderBase}`);
            tickLogs.push({ tick, level: 'timeout', text: `Timeout F${senderBase}! Retransmitting.` });
            tickEvents.push(`TIMEOUT F${senderBase}`);
          }
        }
      }
    } else if (protocol === 'SR') {
      for (let i = senderBase; i < senderNext; i++) {
        const f = senderFrames[i];
        if (f.state === 'inflight' && !f.needsRetransmit && f.timerStart !== null && tick - f.timerStart >= TIMEOUT_TICKS) {
          f.needsRetransmit = true;
          f.timerStart = null;
          assignmentLines.push(`Timeout occurred (Frame ${i})`);
          assignmentLines.push(`Selective Repeat: Retransmitting Frame ${i}`);
          tickLogs.push({ tick, level: 'timeout', text: `SR Timeout F${i}! Retransmitting only F${i}` });
          tickEvents.push(`SR TIMEOUT F${i}`);
        }
      }
    }

    // STEP 4: Sender Transmits 1 Frame this Tick
    let frameToSendIdx = null;
    let isRetransmit = false;

    for (let i = senderBase; i < senderNext; i++) {
      if (senderFrames[i].needsRetransmit && senderFrames[i].state !== 'acked') {
        frameToSendIdx = i;
        isRetransmit = true;
        break;
      }
    }

    if (frameToSendIdx === null && senderNext < totalFrames && senderNext < senderBase + ws) {
      frameToSendIdx = senderNext;
      isRetransmit = false;
      senderNext++;
    }

    if (frameToSendIdx !== null) {
      const fObj = senderFrames[frameToSendIdx];
      fObj.state = 'inflight';
      fObj.needsRetransmit = false;
      fObj.timerStart = tick;
      fObj.attempts++;

      totalAttempts++;
      if (isRetransmit) totalRetransmissions++;

      const shouldDropData = consumeFault(pendingFrameDrops, frameToSendIdx);
      const ladderEntry = {
        type: 'DATA',
        frameIdx: frameToSendIdx,
        seqNum: fObj.seq,
        sendTick: tick,
        endTick: shouldDropData ? tick + Math.ceil(PROP_DELAY / 2) : tick + PROP_DELAY,
        status: shouldDropData ? 'lost' : (isRetransmit ? 'retransmit' : 'ok'),
        label: `${isRetransmit ? 'Re-' : ''}F${frameToSendIdx}(S${fObj.seq})`
      };
      ladderEvents.push(ladderEntry);

      allChannelPackets.push({
        id: packetIdCounter++,
        type: 'DATA',
        frameIdx: frameToSendIdx,
        seqNum: fObj.seq,
        sendTick: tick,
        arriveTick: tick + PROP_DELAY,
        willDrop: shouldDropData,
        dropTick: tick + Math.ceil(PROP_DELAY / 2),
        isRetransmission: isRetransmit,
        status: 'flying',
        ladderRef: ladderEntry
      });

      assignmentLines.push(
        isRetransmit
          ? `Frame ${frameToSendIdx} (Seq ${fObj.seq}) retransmitted`
          : `Frame ${frameToSendIdx} (Seq ${fObj.seq}) transmitted`
      );
      tickLogs.push({
        tick,
        level: isRetransmit ? 'retransmit' : 'send',
        text: isRetransmit
          ? `Retransmitted Frame ${frameToSendIdx} (Seq ${fObj.seq})`
          : `Sent Frame ${frameToSendIdx} (Seq ${fObj.seq})`
      });
      tickEvents.push(isRetransmit ? `Re-Tx F${frameToSendIdx}` : `Sent F${frameToSendIdx} (Seq ${fObj.seq})`);
    }

    snapshots.push(buildTickSnapshot(
      tick,
      tickEvents.length > 0 ? tickEvents.join(' | ') : 'Frames propagating in channel...',
      senderBase,
      senderNext,
      rcvBase,
      senderFrames,
      receiverFrames,
      { delivered: deliveredCount, attempts: totalAttempts, retransmissions: totalRetransmissions, discarded: totalDiscarded, simTime: tick }
    ));

    tick++;
  }

  const finalSimTime = snapshots.length > 0 ? snapshots[snapshots.length - 1].tick : 0;

  assignmentLines.push(``);
  assignmentLines.push(`PERFORMANCE SUMMARY`);
  assignmentLines.push(`Successfully delivered frames: ${deliveredCount}`);
  assignmentLines.push(`Total transmission attempts: ${totalAttempts}`);
  assignmentLines.push(`Total retransmissions: ${totalRetransmissions}`);
  assignmentLines.push(`Total frames discarded: ${totalDiscarded}`);
  assignmentLines.push(`Total simulated time: ${finalSimTime} ticks`);

  return {
    valid: true,
    validation,
    maxTick: finalSimTime,
    metrics: {
      delivered: deliveredCount,
      attempts: totalAttempts,
      retransmissions: totalRetransmissions,
      discarded: totalDiscarded,
      simTime: finalSimTime
    },
    snapshots,
    allChannelPackets,
    assignmentLines,
    tickLogs,
    ladderEvents
  };
};