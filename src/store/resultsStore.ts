'use client';

import { create } from 'zustand';
import type { QuantificationResult, PRAModel, ImportanceMeasure } from '@/lib/types';

interface ResultsState {
  results: Record<string, QuantificationResult>; // targetId -> Result
  aggregatedTargetIds: string[]; // List of target IDs to include in the aggregated view
  activeResultId: string | null;
  isComputing: boolean;
  error: string | null;

  setResult: (targetId: string, result: QuantificationResult) => void;
  setActiveResult: (targetId: string | null) => void;
  setAggregatedTargetIds: (targetIds: string[]) => void;
  toggleAggregatedTargetId: (targetId: string) => void;
  setComputing: (computing: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useResultsStore = create<ResultsState>((set) => ({
  results: {},
  aggregatedTargetIds: [],
  activeResultId: null,
  isComputing: false,
  error: null,

  setResult: (targetId, result) => set((state) => {
    const newAggregated = state.aggregatedTargetIds.includes(targetId) 
      ? state.aggregatedTargetIds 
      : [...state.aggregatedTargetIds, targetId];
    return {
      results: { ...state.results, [targetId]: result },
      aggregatedTargetIds: newAggregated,
      activeResultId: targetId,
      isComputing: false, 
      error: null 
    };
  }),
  setActiveResult: (targetId) => set({ activeResultId: targetId }),
  setAggregatedTargetIds: (targetIds) => set({ aggregatedTargetIds: targetIds }),
  toggleAggregatedTargetId: (targetId) => set((state) => ({
    aggregatedTargetIds: state.aggregatedTargetIds.includes(targetId)
      ? state.aggregatedTargetIds.filter(id => id !== targetId)
      : [...state.aggregatedTargetIds, targetId]
  })),
  setComputing: (computing) => set({ isComputing: computing }),
  setError: (error) => set({ error, isComputing: false }),
  clear: () => set({ results: {}, aggregatedTargetIds: [], activeResultId: null, error: null, isComputing: false }),
}));

// --- Web Worker Integration ---
let workerInstance: Worker | null = null;
let msgId = 0;
const resolvers = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();
let currentAbortController: AbortController | null = null;

export function abortComputation() {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }

  if (workerInstance) {
    console.warn('[Compute] Hard-terminating worker by user request.');
    workerInstance.terminate();
    workerInstance = null;
  }

  resolvers.forEach((deferred) => {
    deferred.reject(new Error('ABORTED'));
  });
  resolvers.clear();

  useResultsStore.getState().setComputing(false);
}

function getWorker(): Worker {
  if (typeof window === 'undefined') {
    throw new Error('Worker cannot be created on server side');
  }
  if (!workerInstance) {
    workerInstance = new Worker(new URL('../workers/quant.worker.ts', import.meta.url));
    workerInstance.onmessage = (e) => {
      const { id, type, result, error } = e.data;
      const deferred = resolvers.get(id);
      if (deferred) {
        resolvers.delete(id);
        if (type === 'SUCCESS') deferred.resolve(result);
        else deferred.reject(new Error(error));
      }
    };
  }
  return workerInstance;
}

export async function runWorkerCommand<T>(type: string, payload: any): Promise<T> {
  const engineMode = process.env.NEXT_PUBLIC_ENGINE_MODE || 'client';

  if (engineMode === 'server') {
    try {
      const fullPayload = { ...payload };

      // Dynamically import useModelStore to prevent circular dependency at bootstrap
      const { useModelStore } = await import('./modelStore');
      fullPayload.model = useModelStore.getState().model;

      const activeResultId = useResultsStore.getState().activeResultId;
      if (activeResultId) {
        fullPayload.currentResult = useResultsStore.getState().results[activeResultId];
      }

      const endpoint = process.env.NEXT_PUBLIC_COMPUTE_ENDPOINT || '/api/quantify';
      console.log(`[Compute] Sending task to endpoint: ${endpoint}`);

      currentAbortController = new AbortController();
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, payload: fullPayload }),
        signal: currentAbortController.signal,
      });
      currentAbortController = null;

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server calculation error: ${response.status}`);
      }

      const data = await response.json();
      return data.result as T;
    } catch (err: any) {
      currentAbortController = null;
      if (err.name === 'AbortError') {
        throw new Error('ABORTED');
      }
      throw new Error(`Server quantification failed: ${err.message}`);
    }
  }

  return new Promise((resolve, reject) => {
    try {
      const worker = getWorker();
      const id = ++msgId;
      resolvers.set(id, { resolve, reject });
      worker.postMessage({ id, type, payload });
    } catch (err) {
      reject(err);
    }
  });
}
