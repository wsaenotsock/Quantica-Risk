import type { CutSet, RecoveryRule } from '@/lib/types';

/**
 * Applies recovery rules (post-processing) to generated Minimal Cutsets.
 */
export function applyRecoveryRules(
  cutsets: CutSet[],
  rules: RecoveryRule[],
  probabilities: Map<string, number>,
  basicEvents: { id: string; eventId?: string; name: string }[] = [],
  initiatingEvents: { id: string; code?: string; name: string }[] = []
): { processedCutsets: CutSet[]; appliedCount: number } {
  if (!rules || rules.length === 0) {
    return { processedCutsets: cutsets, appliedCount: 0 };
  }

  // UUID to eventId map
  const uuidToEventId = new Map<string, string>();
  basicEvents.forEach(be => {
    if (be.eventId) uuidToEventId.set(be.id, be.eventId);
  });
  initiatingEvents.forEach(ie => {
    if (ie.code) uuidToEventId.set(ie.id, ie.code);
  });

  // 1. Sort rules by priority (higher priority first)
  const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);
  
  let processed = [...cutsets];
  let appliedCount = 0;

  for (const rule of sortedRules) {
    const nextBatch: CutSet[] = [];
    
    for (const cs of processed) {
      const csUserIds = cs.events.map(id => uuidToEventId.get(id) || id);
      // Check if all events in the condition are present in the cutset
      const matches = rule.condition.every(condId => 
        cs.events.includes(condId) || csUserIds.includes(condId)
      );
      
      if (matches) {
        appliedCount++;
        
        if (rule.action === 'remove') {
          // Mutually exclusive: discard this cutset
          continue;
        } else if (rule.action === 'add' && rule.targetEventId) {
          const targetBe = basicEvents.find(be => be.eventId === rule.targetEventId || be.id === rule.targetEventId);
          const targetUuid = targetBe ? targetBe.id : rule.targetEventId;
          
          // Add recovery event (e.g. Human Error Recovery)
          if (!cs.events.includes(targetUuid)) {
            const newEvents = [...cs.events, targetUuid];
            const pRec = rule.probability ?? probabilities.get(targetUuid) ?? 1.0;
            nextBatch.push({
              events: newEvents,
              probability: cs.probability * pRec,
              order: newEvents.length
            });
            continue;
          }
        } else if (rule.action === 'replace' && rule.targetEventId) {
          const targetBe = basicEvents.find(be => be.eventId === rule.targetEventId || be.id === rule.targetEventId);
          const targetUuid = targetBe ? targetBe.id : rule.targetEventId;
          
          // Replace condition events with target (less common but supported)
          const newEvents = cs.events.filter(e => {
            const userId = uuidToEventId.get(e);
            return !rule.condition.includes(e) && (!userId || !rule.condition.includes(userId));
          });
          newEvents.push(targetUuid);
          const pRec = rule.probability ?? probabilities.get(targetUuid) ?? 1.0;
          
          // Re-calculate probability (simplified)
          let baseProb = 1.0;
          for (const e of cs.events.filter(e => {
            const userId = uuidToEventId.get(e);
            return !rule.condition.includes(e) && (!userId || !rule.condition.includes(userId));
          })) {
            baseProb *= probabilities.get(e) ?? 1.0;
          }

          nextBatch.push({
            events: newEvents,
            probability: baseProb * pRec,
            order: newEvents.length
          });
          continue;
        } else if (rule.action === 'set_probability' && rule.probability !== undefined) {
            // Adjust the total probability of the cutset
            nextBatch.push({
                ...cs,
                probability: rule.probability
            });
            continue;
        }
      }
      nextBatch.push(cs);
    }
    processed = nextBatch;
  }

  // 2. Re-minimize cutsets after additions/replacements
  // If {A, B} became {A, B, R}, it's no longer minimal if {A, B} or {R} also exists.
  // Actually, usually recovery makes cutsets more specific, so they remain minimal 
  // unless other rules were applied.
  const minimized = minimizeRecoveryResults(processed);

  return {
    processedCutsets: minimized.sort((a, b) => b.probability - a.probability),
    appliedCount
  };
}

/**
 * Ensures cutsets are still minimal after post-processing changes.
 */
function minimizeRecoveryResults(cutsets: CutSet[]): CutSet[] {
  if (cutsets.length <= 1) return cutsets;

  // Sort by order (length) to check subsets efficiently
  const sorted = [...cutsets].sort((a, b) => a.order - b.order);
  const minimal: CutSet[] = [];

  for (const cs of sorted) {
    const csSet = new Set(cs.events);
    const isSubset = minimal.some((m) => {
      return m.events.every((e) => csSet.has(e));
    });
    if (!isSubset) {
      minimal.push(cs);
    }
  }

  return minimal;
}
