import type { PRAModel, EventTree, QuantificationResult, SequenceResult, EndStateResult, CutSet, Sequence } from '@/lib/types';
import { 
  quantifyFaultTree, 
  BDDNode, 
  TRUE_NODE, 
  FALSE_NODE, 
  bddAnd, 
  bddOr, 
  bddNot, 
  buildBDD, 
  calculateProbability, 
  extractMCS, 
  minimizeCutSets, 
  calculateImportanceMeasures,
  resetBDD,
  makeBDDNode,
  getVariableOrder,
  rareEventApprox,
  mcubApprox
} from './bdd';
import { applyRecoveryRules } from './post_process';

/**
 * Quantifies an Event Tree using BDD logic to support MCS and Importance.
 */
export function quantifyEventTree(
  et: EventTree,
  model: PRAModel,
  method: 'bdd_exact' | 'rare_event' | 'mcub' = 'bdd_exact'
): QuantificationResult {
  const startTime = performance.now();

  // 1. Reset BDD state
  resetBDD();

  // 1. Prepare Flag Map for Logical Pruning first so it can override probabilities
  const flagMap = new Map<string, boolean>();
  let activeFlagGroup = model.flagGroups?.find(fg => fg.id === model.activeFlagGroupId);
  if (!activeFlagGroup && model.flagGroups && model.flagGroups.length > 0) {
    activeFlagGroup = model.flagGroups[0];
  }
  if (activeFlagGroup) {
    activeFlagGroup.items.forEach(item => {
      flagMap.set(item.eventId, item.state);
    });
  }

  // 1.5 Prepare Active Recovery Rules
  let recoveryRules = model.recoveryRules || [];
  if (model.activeRecoveryGroupId) {
    const recoveryGroup = model.recoveryGroups?.find(g => g.id === model.activeRecoveryGroupId);
    if (recoveryGroup) {
      recoveryRules = recoveryGroup.rules || [];
    } else {
      recoveryRules = [];
    }
  } else if (model.recoveryGroups && model.recoveryGroups.length > 0) {
    recoveryRules = model.recoveryGroups[0]?.rules || [];
  }

  // 2. Prepare probability map and variable order using the same logic as Fault Tree engine
  const probabilities = new Map<string, number>();
  
  // Resolve all basic event probabilities first
  model.basicEvents.forEach(be => {
    let p = be.probability;
    if (be.parameterId) {
      const param = model.parameters?.find(p => p.id === be.parameterId);
      if (param) {
        p = param.failureType === 'demand'
          ? param.value * (be.demands ?? 1)
          : param.value * (be.missionTime ?? 24);
      }
    }
    if (p === undefined || p === null) {
      p = be.failureType === 'demand'
        ? (be.failureRate || 0) * (be.demands ?? 1)
        : (be.failureRate || 0) * (be.missionTime || 0); // Use 0 if mission time is not set, or 24? 
        // Quantica Risk convention: if rate is given but no time, we might need a default.
        // But 0 is safer if the user hasn't specified. Let's use 24 for backward compat if needed,
        // but the user likely wants their actual mission time.
    }

    // Apply Flag Override if active
    let isFlagOverridden = false;
    let flagState = false;
    if (flagMap.has(be.id)) {
      isFlagOverridden = true;
      flagState = flagMap.get(be.id)!;
    } else {
      const beAny = be as any;
      if (beAny.eventId && flagMap.has(beAny.eventId)) {
        isFlagOverridden = true;
        flagState = flagMap.get(beAny.eventId)!;
      }
    }

    if (isFlagOverridden) {
      p = flagState ? 1.0 : 0.0;
    }

    probabilities.set(be.id, Math.min(p || 0, 1));
  });

  const ie = model.initiatingEvents?.find(i => i.id === et.initiatingEventId);
  if (ie) {
    probabilities.set(ie.id, ie.frequency);
  }

  // 3. Pre-compute Global Variable Order for consistent BDD logic
  // To correctly combine BDDs from different FTs in the ET, we MUST use a single shared global variable order.
  const referencedFTIds = new Set<string>();
  if (ie && ie.linkedFaultTreeId) referencedFTIds.add(ie.linkedFaultTreeId);
  et.functionalEvents.forEach(fe => {
    if (fe.linkedFaultTreeId) referencedFTIds.add(fe.linkedFaultTreeId);
  });
  
  const referencedTopGateIds: string[] = [];
  referencedFTIds.forEach(ftId => {
    const ft = model.faultTrees.find(f => f.id === ftId);
    if (ft && ft.topGateId) referencedTopGateIds.push(ft.topGateId);
  });

  // Compute global DFS ordering covering all sub-trees
  const globalVariableOrder = getVariableOrder(referencedTopGateIds, [], model.basicEvents, model.faultTrees);

  // 3. Build FT BDD Cache
  const ftBDDCache = new Map<string, BDDNode>();
  const getFTBDD = (ftId: string): BDDNode => {
    if (ftBDDCache.has(ftId)) return ftBDDCache.get(ftId)!;
    const ft = model.faultTrees.find(f => f.id === ftId);
    if (!ft) return FALSE_NODE;
    
    const isPruningEnabled = model.quantificationSettings?.enablePruning === true;
    const bddCutoff = isPruningEnabled ? (model.quantificationSettings?.bddCutOff ?? 1e-20) : 0;
    
    // IMPORTANT: Use the uniform shared globalVariableOrder to prevent crashes/corruption!
    // Also passing user bddCutOff value for radical graph compression / pruning!
    const bdd = buildBDD(ft.topGateId, ft.gates, model.basicEvents, globalVariableOrder, model.faultTrees, new Set(), new Map(), bddCutoff, new Map(), flagMap);
    ftBDDCache.set(ftId, bdd);
    return bdd;
  };

  // 3. Initiating Event BDD
  let ieBDD = ie ? makeBDDNode(ie.id, TRUE_NODE, FALSE_NODE) : FALSE_NODE;
  if (ie && ie.linkedFaultTreeId) {
    const ftBDD = getFTBDD(ie.linkedFaultTreeId);
    ieBDD = bddAnd(ieBDD, ftBDD); 
  }

  // 4. Build Sequence BDDs
  const sequenceResults: SequenceResult[] = [];
  const endStateFreqMap = new Map<string, number>();
  
  // Pre-initialize all model end states to 0 so that chained/transfer target end states render with 0.00e+0 instead of N/A in the results dashboard
  model.endStates.forEach(es => {
    endStateFreqMap.set(es.id, 0);
  });

  const sequenceBDDs: Record<string, any> = {};
  let totalRiskBDD = FALSE_NODE;

  // Cache for intermediate prefix BDDs to eliminate O(Depth * Count) redundancy
  const pathBDDCache = new Map<string, BDDNode>();

  // 4. Recursive Sequence Evaluator
  const evaluateSequence = (
    seq: Sequence,
    baseBDD: BDDNode,
    pathPrefix: string,
    currentEt: EventTree
  ) => {
    let seqBDD = baseBDD;
    let pathDesc = pathPrefix;
    
    let pathKey = "BASE";

    for (let i = 0; i < seq.path.length; i++) {
      const decision = seq.path[i];
      const fe = currentEt.functionalEvents.find(f => f.id === decision.functionalEventId);
      if (!fe) continue;
      
      // Construct incremental cache key representing this distinct logic path
      pathKey += `|${decision.functionalEventId}:${decision.branchId}`;
      
      // If we've already computed up to this prefix in ANY sequence, reuse it!
      if (pathBDDCache.has(pathKey)) {
        seqBDD = pathBDDCache.get(pathKey)!;
        // Update metadata only (description string building)
        const branchIndex = fe.branches.findIndex(b => b.id === decision.branchId);
        const branch = fe.branches[branchIndex];
        const isSuccess = branchIndex === 0;
        const display = isSuccess ? 'Success' : 'Failure';
        pathDesc += `${fe.name}(${display}) ➡ `;
        continue;
      }

      const branchIndex = fe.branches.findIndex(b => b.id === decision.branchId);
      const branch = fe.branches[branchIndex];
      if (!branch) continue;

      const isSuccess = branchIndex === 0;
      const display = isSuccess ? 'Success' : 'Failure';
      pathDesc += `${fe.name}(${display}) ➡ `;

      let branchBDD = FALSE_NODE;

      // Heuristic check if this branch is explicitly "Success" (Branch 0 usually)
      const searchTarget = (branch.label || '').toLowerCase();
      const isFirstOrSuccess = isSuccess || (branchIndex === 0 && !searchTarget.includes('fail') && !searchTarget.includes('失敗'));

      if (fe.linkedFaultTreeId) {
        branchBDD = getFTBDD(fe.linkedFaultTreeId);
        if (isFirstOrSuccess) {
          branchBDD = bddNot(branchBDD);
        }
      } else {
        const virtualId = `MANUAL_${fe.id}`;
        // Probability of Success (Branch 0)
        const successProb = fe.branches[0].probability ?? 1.0;
        probabilities.set(virtualId, successProb);
        
        branchBDD = makeBDDNode(virtualId, TRUE_NODE, FALSE_NODE);
        if (branchIndex === 1) {
          // If the failure branch has an explicit probability set by the user, use it directly instead of forcing complement
          const failProb = fe.branches[1]?.probability;
          if (failProb !== undefined && failProb !== null) {
            const failId = `MANUAL_${fe.id}_FAIL`;
            probabilities.set(failId, failProb);
            branchBDD = makeBDDNode(failId, TRUE_NODE, FALSE_NODE);
          } else {
            // Otherwise, fall back to success complement
            branchBDD = bddNot(branchBDD);
          }
        } else if (branchIndex > 1) {
          // Fallback for multi-branch manual
          const multiId = `MANUAL_${fe.id}_B${branchIndex}`;
          probabilities.set(multiId, branch.probability ?? 0);
          branchBDD = makeBDDNode(multiId, TRUE_NODE, FALSE_NODE);
        }
      }

      seqBDD = bddAnd(seqBDD, branchBDD);
      pathBDDCache.set(pathKey, seqBDD); // Store for reuse across parallel sequences
    }

    // もしトランスファー先ETが指定されていれば、再帰的に移行先ETを展開して計算！
    if (seq.transferETId) {
      const subEt = model.eventTrees?.find(t => t.id === seq.transferETId);
      if (subEt) {
        for (const subSeq of subEt.sequences) {
          evaluateSequence(subSeq, seqBDD, `${pathDesc.trim()} ➡ `, subEt);
        }
        return; // 中継点シーケンス自体の終状態集計はスキップ（トランスファー先へ全権委任）
      }
    }

    sequenceBDDs[seq.id] = seqBDD;

    const seqFreq = calculateProbability(seqBDD, probabilities);
    
    // Look up the end state to see if it is a success sequence.
    // If success, we skip MCS extraction and Importance as they are analytical nonsense for success states, and cause exponential slowdowns.
    const endState = model.endStates?.find(es => es.id === seq.endStateId);
    const isSuccessState = endState 
      ? (endState.categories.includes('success') || endState.name?.toLowerCase().includes('ok')) 
      : false;

    let seqRawMCS: string[][] = [];
    let seqMinimalMCS: string[][] = [];

    if (!isSuccessState) {
      // Only extract failure cutsets for NON-SUCCESS sequences!
      seqRawMCS = extractMCS(seqBDD);
      seqMinimalMCS = minimizeCutSets(seqRawMCS);
    }
    const seqCutSets: CutSet[] = seqMinimalMCS.map(cs => {
      let prob = 1;
      for (const id of cs) prob *= probabilities.get(id) ?? 0;
      return {
        events: cs,
        probability: prob,
        order: cs.length
      };
    }).sort((a, b) => b.probability - a.probability);

    // Apply Recovery Rules to Sequence Cutsets
    const { processedCutsets: recoveredCutSets, appliedCount: seqAppliedCount } = applyRecoveryRules(
      seqCutSets,
      recoveryRules,
      probabilities,
      model.basicEvents,
      model.initiatingEvents
    );

    // Re-calculate sequence frequency based on post-processed cutsets
    const recoveredFreq = method === 'mcub' ? mcubApprox(recoveredCutSets) : rareEventApprox(recoveredCutSets);

    // Calculate importance for this sequence (skip if success)
    const seqImportance = !isSuccessState 
      ? calculateImportanceMeasures(seqBDD, model.basicEvents, recoveredFreq, probabilities)
      : [];

    sequenceResults.push({
      sequenceId: seq.id,
      sequenceName: seq.name || seq.id,
      pathDescription: pathDesc.trim(),
      frequency: recoveredFreq,
      cutSets: recoveredCutSets.slice(0, 50),
      rawCutSetCount: seqRawMCS.length,
      importanceMeasures: seqImportance,
      appliedRecoveryCount: seqAppliedCount
    });

    if (seq.endStateId) {
      const es = model.endStates.find(e => e.id === seq.endStateId);
      const categories = es?.categories || [];
      
      // A sequence is Non-Success if it doesn't have an explicit 'success' category
      const isSuccess = categories.length === 1 && 
        (categories[0].toLowerCase() === 'success' || categories[0] === '成功' || categories[0] === 'OK');
      
      const isPruningEnabled = model.quantificationSettings?.enablePruning === true;
      const bddCutoff = isPruningEnabled ? (model.quantificationSettings?.bddCutOff ?? 1e-20) : 0;
      if (es && !isSuccess) {
        if (recoveredFreq >= bddCutoff) {
          console.log(`      [ET-LOG] Aggregating significant sequence ${seq.id} (freq: ${recoveredFreq}) into totalRiskBDD...`);
          totalRiskBDD = bddOr(totalRiskBDD, seqBDD);
          console.log(`      [ET-LOG] SUCCESS aggregating ${seq.id}.`);
        } else {
          console.log(`      [ET-LOG] Skipping aggregation of trivial sequence ${seq.id} (freq: ${recoveredFreq} < bddCutoff).`);
        }
      }
      
      const current = endStateFreqMap.get(seq.endStateId) || 0;
      endStateFreqMap.set(seq.endStateId, current + recoveredFreq);
    }
  };

  // メインETの全初期シーケンスを開始
  for (const seq of et.sequences) {
    evaluateSequence(seq, ieBDD, '', et);
  }

  // 6. Aggregate Results
  const totalNonSuccessFreq = calculateProbability(totalRiskBDD, probabilities);
  const endStateResults: EndStateResult[] = [];
  
  endStateFreqMap.forEach((freq, id) => {
    const es = model.endStates.find(e => e.id === id);
    if (es) {
      const categories = es.categories || [];
      const isSuccess = categories.length === 1 && 
        (categories[0].toLowerCase() === 'success' || categories[0] === '成功' || categories[0] === 'OK');

      endStateResults.push({
        endStateId: id,
        endStateName: es.name,
        category: categories.join(', '),
        frequency: freq,
        cdfContribution: totalNonSuccessFreq > 0 && !isSuccess
          ? (freq / totalNonSuccessFreq) * 100 
          : 0
      });
    }
  });

  endStateResults.sort((a, b) => b.frequency - a.frequency);

  // 7. Extract MCS and Importance for the Total Risk
  const rawMCS = extractMCS(totalRiskBDD);
  const minimalMCS = minimizeCutSets(rawMCS);
  
  const cutSets: CutSet[] = minimalMCS.map(cs => {
    let prob = 1;
    for (const id of cs) prob *= probabilities.get(id) ?? 0;
    return {
      events: cs,
      probability: prob,
      order: cs.length
    };
  }).sort((a, b) => b.probability - a.probability);

  // Apply Recovery Rules to Total Risk Cutsets
  const { processedCutsets: recoveredCutSets, appliedCount: totalAppliedCount } = applyRecoveryRules(
    cutSets,
    recoveryRules,
    probabilities,
    model.basicEvents,
    model.initiatingEvents
  );

  const totalRecoveredFreq = method === 'mcub' ? mcubApprox(recoveredCutSets) : rareEventApprox(recoveredCutSets);

  const importanceMeasures = calculateImportanceMeasures(
    totalRiskBDD,
    model.basicEvents,
    totalRecoveredFreq,
    probabilities
  );

  const computeTimeMs = performance.now() - startTime;

  const topEventProbabilityApprox = method === 'mcub'
    ? mcubApprox(recoveredCutSets)
    : rareEventApprox(recoveredCutSets);

  return {
    topEventProbability: totalRecoveredFreq,
    topEventProbabilityApprox: topEventProbabilityApprox,
    cutSets: recoveredCutSets.slice(0, 100),
    rawCutSetCount: rawMCS.length,
    importanceMeasures,
    totalCDF: totalRecoveredFreq,
    totalRiskBDD, // Exported for Monte Carlo
    sequenceBDDs,
    endStateResults,
    sequenceResults,
    computeTimeMs,
    method: method,
    baseProbabilities: Object.fromEntries(probabilities),
    appliedRecoveryCount: totalAppliedCount
  };
}
