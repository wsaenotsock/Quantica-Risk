'use client';

import React, { useMemo, useState } from 'react';
import { useResultsStore } from '@/store/resultsStore';
import { useModelStore } from '@/store/modelStore';
import UncertaintyPanel from './UncertaintyPanel';
import SensitivityPanel from './SensitivityPanel';
import { downloadFile, jsonToCsv } from '@/lib/utils/export';
import { formatDuration } from '@/lib/utils/format';
import { aggregateResults } from '@/lib/utils/aggregation';

interface ResultsDashboardProps {
  locale?: 'ja' | 'en';
}

type ImportanceTab = 'fv' | 'raw' | 'rrw' | 'birnbaum';

export default function ResultsDashboard({ locale = 'ja' }: ResultsDashboardProps) {
  const results = useResultsStore((s) => s.results);
  const aggregatedTargetIds = useResultsStore((s) => s.aggregatedTargetIds);
  const activeResultId = useResultsStore((s) => s.activeResultId);
  const setActiveResult = useResultsStore((s) => s.setActiveResult);
  const isComputing = useResultsStore((s) => s.isComputing);
  
  const result = useMemo(() => {
    if (!activeResultId) return null;
    if (activeResultId === '__total_aggregated__') {
      const selectedResults = Object.entries(results)
        .filter(([id]) => aggregatedTargetIds.includes(id))
        .map(([_, r]) => r);
      if (selectedResults.length === 0) return null;
      return aggregateResults(selectedResults);
    }
    return results[activeResultId];
  }, [activeResultId, results, aggregatedTargetIds]);

  const isAggregated = activeResultId === '__total_aggregated__';
  const model = useModelStore((s) => s.model);
  const [activeTab, setActiveTab] = useState<'cutsets' | 'importance' | 'endstates' | 'sequences' | 'uncertainty' | 'sensitivity'>('cutsets');
  const [importanceTab, setImportanceTab] = useState<ImportanceTab>('fv');
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSeqId, setSelectedSeqId] = useState<string | null>(null);

  const t = useMemo(() => ({
    title: locale === 'ja' ? '解析結果' : 'Results',
    topEvent: locale === 'ja' ? 'トップイベント確率 / 非成功頻度合計' : 'Top Event Prob / Total Non-Success',
    bddExact: locale === 'ja' ? 'BDD精密値' : 'BDD Exact',
    rareEvent: locale === 'ja' ? 'Rare Event近似' : 'Rare Event Approx',
    mcub: locale === 'ja' ? 'MCUB近似' : 'MCUB Approx',
    computeTime: locale === 'ja' ? '計算時間' : 'Compute Time',
    cutsets: locale === 'ja' ? 'カットセット' : 'Cut Sets',
    importance: locale === 'ja' ? '重要度指標' : 'Importance',
    endstates: locale === 'ja' ? '終状態別頻度' : 'End State Freq',
    uncertainty: locale === 'ja' ? '不確かさ解析' : 'Uncertainty',
    sensitivity: locale === 'ja' ? '感度解析' : 'Sensitivity',
    sequences: locale === 'ja' ? 'シーケンス別頻度' : 'Sequence Freq',
    totalMCS: locale === 'ja' ? '総MCS数' : 'Total MCS',
    rank: locale === 'ja' ? '順位' : 'Rank',
    events: locale === 'ja' ? '基事象' : 'Events',
    order: locale === 'ja' ? '次数' : 'Order',
    probability: locale === 'ja' ? '確率' : 'Probability',
    eventName: locale === 'ja' ? '事象名' : 'Event Name',
    cdfTotal: locale === 'ja' ? 'CDF合計' : 'Total CDF',
    endStateName: locale === 'ja' ? '終状態' : 'End State',
    category: locale === 'ja' ? 'カテゴリ' : 'Category',
    frequency: locale === 'ja' ? '頻度 [/yr]' : 'Frequency [/yr]',
    contribution: locale === 'ja' ? '寄与率' : 'Contribution',
    path: locale === 'ja' ? 'パス' : 'Path',
    sequenceName: locale === 'ja' ? 'シーケンス名' : 'Seq Name',
    noResults: locale === 'ja' ? '定量化を実行してください' : 'Run quantification',
    computing: locale === 'ja' ? '計算中...' : 'Computing...',
  }), [locale]);

  const selectedSeq = useMemo(() => {
    if (!selectedSeqId || !result?.sequenceResults) return null;
    return result.sequenceResults.find(s => s.sequenceId === selectedSeqId);
  }, [selectedSeqId, result]);

  const sortedImportance = useMemo(() => {
    const source = selectedSeq ? selectedSeq.importanceMeasures : result?.importanceMeasures;
    return [...(source || [])].sort((a, b) => {
      switch (importanceTab) {
        case 'fv': return b.fv - a.fv;
        case 'raw': return b.raw - a.raw;
        case 'rrw': return b.rrw - a.rrw;
        case 'birnbaum': return b.birnbaum - a.birnbaum;
        default: return 0;
      }
    });
  }, [selectedSeq, result, importanceTab]);

  const maxImportanceValue = useMemo(() => {
    if (!sortedImportance.length) return 0.001;
    return Math.max(
      ...sortedImportance.map((m) => {
        switch (importanceTab) {
          case 'fv': return m.fv;
          case 'raw': return m.raw;
          case 'rrw': return m.rrw;
          case 'birnbaum': return m.birnbaum;
          default: return 0;
        }
      }),
      0.001
    );
  }, [sortedImportance, importanceTab]);

  const allCutsets = useMemo(() => {
    const source = selectedSeq ? selectedSeq.cutSets : result?.cutSets;
    return source || [];
  }, [selectedSeq, result]);

  const activeRawCount = useMemo(() => {
    return selectedSeq ? selectedSeq.rawCutSetCount : result?.rawCutSetCount;
  }, [selectedSeq, result]);

  const totalPages = Math.max(1, Math.ceil(allCutsets.length / pageSize));

  const displayedCutsets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return allCutsets.slice(start, start + pageSize);
  }, [allCutsets, currentPage, pageSize]);

  // Reset to page 1 when active content or page size changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedSeqId, result, activeTab, pageSize]);
  const selectedMethods: string[] = React.useMemo(() => {
    const raw = model.quantificationSettings?.approximation;
    const arr = Array.isArray(raw) ? [...raw] : (raw ? [raw] : ['bdd_exact']);
    const finalArr = arr.length > 0 ? arr : ['bdd_exact']; // fallback
    
    // Enforce explicit display order: BDD -> MCUB -> Rare Event
    const order: Record<string, number> = { 'bdd_exact': 0, 'mcub': 1, 'rare_event': 2 };
    return finalArr.sort((a, b) => (order[a] ?? 99) - (order[b] ?? 99));
  }, [model.quantificationSettings?.approximation]);

  const computedValues = React.useMemo(() => {
    if (!result || !result.cutSets) return { bdd_exact: result?.topEventProbability ?? 0, rare_event: 0, mcub: 0 };
    
    // Rare Event
    let sum = 0;
    for (const cs of result.cutSets) sum += cs.probability;
    const rareVal = Math.min(sum, 1);

    // MCUB
    let prod = 1;
    for (const cs of result.cutSets) prod *= (1 - Math.min(cs.probability, 1));
    const mcubVal = 1 - prod;

    return {
      bdd_exact: result.topEventProbability,
      rare_event: rareVal,
      mcub: mcubVal
    };
  }, [result, result?.cutSets, result?.topEventProbability]);

  const targetOptions = useMemo(() => {
    const opts: { id: string; label: string }[] = [];
    
    // Include individual quantified results
    Object.keys(results).forEach(rid => {
      const ft = model.faultTrees.find(f => f.id === rid);
      const et = model.eventTrees.find(e => e.id === rid);
      const label = ft ? `🌳 ${ft.name}` : (et ? `🌿 ${et.name}` : `ID: ${rid}`);
      opts.push({ id: rid, label });
    });

    // Insert Consolidated Total at the beginning if more than 1
    if (Object.keys(results).length > 1) {
      opts.unshift({ id: '__total_aggregated__', label: locale === 'ja' ? '📊 総合結果 (Consolidated)' : '📊 Total Consolidated' });
    }
    
    return opts;
  }, [results, model.faultTrees, model.eventTrees, locale]);

  if (isComputing) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', gap: 'var(--space-md)'
      }}>
        <div className="animate-pulse" style={{
          width: 64, height: 64, borderRadius: 'var(--radius-full)',
          background: 'linear-gradient(135deg, var(--accent-green), var(--accent-cyan))',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28
        }}>⚛</div>
        <div style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{t.computing}</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="empty-state" style={{ height: '100%' }}>
        <div className="empty-state__icon">📊</div>
        <div className="empty-state__title">{t.noResults}</div>
        <div className="empty-state__description">
          {locale === 'ja'
            ? '「定量化」タブで解析対象を選択して実行、または計算済みの結果を選択してください'
            : 'Select an analysis target in the "Quantification" tab and run or select a calculated result.'}
        </div>
      </div>
    );
  }

  // Find event names for cutsets
  const eventNameMap = new Map<string, string>();
  const eventIdMap = new Map<string, string>();
  const eventProbMap = new Map<string, number>();
  for (const be of model.basicEvents) {
    eventNameMap.set(be.id, be.name);
    if (be.eventId) {
      eventIdMap.set(be.id, be.eventId);
    }
    eventProbMap.set(be.id, be.probability || 0);
  }
  for (const ie of model.initiatingEvents) {
    eventNameMap.set(ie.id, ie.name);
    if (ie.code) {
      eventIdMap.set(ie.id, ie.code);
    }
    eventProbMap.set(ie.id, ie.frequency);
  }

  const getEventFormattedName = (id: string) => {
    const name = eventNameMap.get(id) || id;
    const code = eventIdMap.get(id);
    return code ? `${name} [${code}]` : name;
  };

  const getEventDisplayName = (eid: string) => {
    if (eventNameMap.has(eid)) return getEventFormattedName(eid);
    
    // CCF 独立イベントのデコード: CCF_GroupID_IND_MemberID
    if (eid.startsWith('CCF_') && eid.includes('_IND_')) {
      const memberId = eid.split('_IND_')[1];
      const memberFormatted = getEventFormattedName(memberId);
      return locale === 'ja' ? `${memberFormatted} (CCF個別独立)` : `${memberFormatted} (CCF Ind)`;
    }
    
    // CCF 多重故障イベントのデコード: CCF_GroupID_Member1_Member2...
    if (eid.startsWith('CCF_')) {
      const parts = eid.split('_');
      const memberIds = parts.slice(2);
      if (memberIds.length > 0) {
        const memberNames = memberIds.map(id => getEventFormattedName(id)).join(' - ');
        return `CCF (${memberNames})`;
      }
    }
    
    return eid;
  };

  const getEventProb = (eid: string) => {
    if (eventProbMap.has(eid)) return eventProbMap.get(eid)!;
    if (result && result.baseProbabilities && result.baseProbabilities[eid] !== undefined) {
      return result.baseProbabilities[eid];
    }
    return 0;
  };

  const getMethodLabel = (m: string) => {
    switch(m) {
      case 'bdd_exact': return t.bddExact;
      case 'rare_event': return t.rareEvent;
      case 'mcub': return t.mcub;
      default: return m;
    }
  };

  const primaryMethod = selectedMethods[0];
  const secondaryMethods = selectedMethods.slice(1);

  return (
    <div className="animate-fadeIn" style={{
      display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden'
    }}>
      {/* Top Selector Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '12px var(--space-md)', 
        borderBottom: '1px solid var(--border-default)',
        background: 'var(--bg-secondary)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>{t.title}</h2>
          {targetOptions.length > 0 && (
            <select 
              className="form-input"
              style={{ height: '32px', padding: '0 12px', fontSize: '13px', minWidth: '220px', fontWeight: 500 }}
              value={activeResultId || ''}
              onChange={(e) => setActiveResult(e.target.value)}
            >
              {targetOptions.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          )}
        </div>
        {isAggregated && (
          <div style={{ fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 600, background: 'rgba(59, 130, 246, 0.1)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            {locale === 'ja' ? '📊 統合表示モード' : '📊 Aggregated View Mode'}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-md)',
        padding: 'var(--space-md)', flexShrink: 0
      }}>
        <div className="stat-card">
          <div className="stat-card__label">{getMethodLabel(primaryMethod)}</div>
          <div className="stat-card__value">{(computedValues as any)[primaryMethod]?.toExponential(3)}</div>
          {secondaryMethods.length > 0 && (
            <div className="stat-card__sub" style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {secondaryMethods.map(m => (
                <div key={m} style={{ fontSize: '11px' }}>
                  {getMethodLabel(m)}: {(computedValues as any)[m]?.toExponential(3)}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="stat-card">
          <div className="stat-card__label">{t.totalMCS} ({locale === 'ja' ? '縮約後' : 'Min'})</div>
          <div className="stat-card__value" style={{ color: 'var(--accent-amber)' }}>
            {result.cutSets.length.toLocaleString()}
          </div>
          <div className="stat-card__sub" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Max order: {Math.max(...result.cutSets.map(c => c.order), 0)}</span>
            {result.rawCutSetCount !== undefined && (
              <span style={{ color: 'var(--text-muted)' }}>
                {locale === 'ja' ? '縮約前:' : 'Raw:'} {result.rawCutSetCount.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">{t.computeTime}</div>
          <div className="stat-card__value" style={{ color: 'var(--accent-cyan)', fontSize: result.computeTimeMs >= 60000 ? '18px' : '22px' }}>
            {formatDuration(result.computeTimeMs)}
          </div>
          <div className="stat-card__sub">{locale === 'ja' ? '計算処理時間' : 'Execution Time'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">{locale === 'ja' ? '解析手法 / 条件設定' : 'Method / Settings'}</div>
          <div className="stat-card__value" style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>
            {result.method.toUpperCase().replace('_', ' ')}
          </div>
          <div className="stat-card__sub" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div>
              <span>Pruning:{' '}</span>
              <span style={{ fontWeight: 500, color: result.enablePruning === false ? 'var(--text-muted)' : 'inherit' }}>
                {result.enablePruning === false 
                  ? (locale === 'ja' ? '無効' : 'Disabled') 
                  : (result.bddCutOff !== undefined 
                      ? result.bddCutOff.toExponential(1) 
                      : (model.quantificationSettings?.bddCutOff || 1e-20).toExponential(1))
                }
              </span>
            </div>
            <div>
              <span>Cut-off:{' '}</span>
              <span style={{ fontWeight: 500 }}>{result.cutoff?.toExponential(1) || 'None'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 var(--space-md)', flexShrink: 0 }}>
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'cutsets' ? 'tab--active' : ''}`}
            onClick={() => setActiveTab('cutsets')}
          >
            {t.cutsets}
          </button>
          {!isAggregated && (
            <button
              className={`tab ${activeTab === 'importance' ? 'tab--active' : ''}`}
              onClick={() => setActiveTab('importance')}
            >
              {t.importance}
            </button>
          )}
          <button
            className={`tab ${activeTab === 'endstates' ? 'tab--active' : ''}`}
            onClick={() => setActiveTab('endstates')}
          >
            {t.endstates}
          </button>
          {result.sequenceResults && (
            <button
              className={`tab ${activeTab === 'sequences' ? 'tab--active' : ''}`}
              onClick={() => setActiveTab('sequences')}
            >
              {t.sequences}
            </button>
          )}
          {!isAggregated && (
            <>
              <button
                className={`tab ${activeTab === 'uncertainty' ? 'tab--active' : ''}`}
                onClick={() => setActiveTab('uncertainty')}
              >
                {t.uncertainty}
              </button>
              <button
                className={`tab ${activeTab === 'sensitivity' ? 'tab--active' : ''}`}
                onClick={() => setActiveTab('sensitivity')}
              >
                {t.sensitivity}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-md)' }}>
        {/* Cutsets Tab */}
        {activeTab === 'cutsets' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h3 style={{ margin: 0 }}>
                  {selectedSeq
                    ? `${t.cutsets} (${selectedSeq.sequenceName})`
                    : `${t.cutsets} (${locale === 'ja' ? '全合計' : 'Total Risk'})`}
                </h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => {
                      const csvData = displayedCutsets.map((cs, i) => ({
                        Rank: i + 1,
                        Events: cs.events.join(' | '),
                        Order: cs.order,
                        Probability: cs.probability,
                        Contribution: ((cs.probability / result.topEventProbability) * 100).toFixed(2) + '%'
                      }));
                      downloadFile(jsonToCsv(csvData), `MCS_Export_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
                    }}
                  >
                    📥 CSV
                  </button>
                  {selectedSeq && (
                    <button className="btn btn--ghost btn--sm" onClick={() => setSelectedSeqId(null)}>
                      {locale === 'ja' ? '全合計に戻す' : 'Show Total'}
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {locale === 'ja' ? 'ページ表示件数:' : 'Items per Page:'}
                </span>
                <select
                  className="form-select"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  style={{ width: '80px', padding: '2px 8px', fontSize: '12px' }}
                >
                  <option value={10}>10</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={500}>500</option>
                  <option value={1000}>1000</option>
                </select>
              </div>
            </div>

            <table className="results-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>{t.rank}</th>
                  <th>{t.events}</th>
                  <th style={{ width: '60px', textAlign: 'center' }}>{t.order}</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>{t.probability}</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>{t.contribution}</th>
                </tr>
              </thead>
              <tbody>
                {displayedCutsets.map((cs, i) => {
                  const globalIndex = (currentPage - 1) * pageSize + i;
                  return (
                    <tr key={i}>
                      <td style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>#{globalIndex + 1}</td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {cs.events.map((eid, j) => (
                          <span key={j} className="badge badge--neutral" style={{ fontSize: '10px' }}>
                            {getEventDisplayName(eid)}
                            <span style={{ marginLeft: '4px', opacity: 0.6 }}>
                              ({getEventProb(eid).toExponential(1)})
                            </span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>{cs.order}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                      {cs.probability.toExponential(3)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent-amber)' }}>
                      {((cs.probability / result.topEventProbability) * 100).toFixed(2)}%
                    </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '16px',
                marginTop: '16px',
                padding: '12px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)'
              }}>
                <button
                  className="btn btn--secondary btn--sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(1)}
                  title={locale === 'ja' ? '最初へ' : 'First'}
                >
                  «
                </button>
                <button
                  className="btn btn--secondary btn--sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  ‹ {locale === 'ja' ? '前へ' : 'Prev'}
                </button>
                
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  padding: '0 16px' 
                }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {currentPage}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>/</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {totalPages}
                  </span>
                </div>

                <button
                  className="btn btn--secondary btn--sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                >
                  {locale === 'ja' ? '次へ' : 'Next'} ›
                </button>
                <button
                  className="btn btn--secondary btn--sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  title={locale === 'ja' ? '最後へ' : 'Last'}
                >
                  »
                </button>
                
                <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                  {locale === 'ja' ? '表示件数: ' : 'Total: '}{allCutsets.length.toLocaleString()}
                  {activeRawCount !== undefined && (
                    <span style={{ opacity: 0.7, marginLeft: '6px' }}>
                      ({locale === 'ja' ? '縮約前: ' : 'Raw: '}{activeRawCount.toLocaleString()})
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Importance Tab */}
        {activeTab === 'importance' && (
          <div>
            <div className="tabs" style={{ marginBottom: '16px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                {(['fv', 'raw', 'rrw', 'birnbaum'] as ImportanceTab[]).map(type => (
                  <button
                    key={type}
                    className={`tab tab--sm ${importanceTab === type ? 'tab--active' : ''}`}
                    onClick={() => setImportanceTab(type)}
                  >
                    {type.toUpperCase()}
                  </button>
                ))}
              </div>
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  const csvData = sortedImportance.map(m => ({
                    EventId: m.eventId,
                    EventName: eventNameMap.get(m.eventId) || m.eventId,
                    FV: m.fv,
                    RAW: m.raw,
                    RRW: m.rrw,
                    Birnbaum: m.birnbaum
                  }));
                  downloadFile(jsonToCsv(csvData), `Importance_Export_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
                }}
              >
                📥 CSV
              </button>
            </div>

            <table className="results-table">
              <thead>
                <tr>
                  <th>{t.eventName}</th>
                  <th style={{ width: '250px' }}>Chart</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {sortedImportance.map((m) => {
                  const val = m[importanceTab];
                  const barWidth = Math.max((val / maxImportanceValue) * 100, 1);
                  return (
                    <tr key={m.eventId}>
                      <td style={{ fontWeight: 500 }}>{getEventDisplayName(m.eventId)}</td>
                      <td>
                        <div style={{ width: '100%', height: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${barWidth}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-cyan))',
                            borderRadius: '6px'
                          }} />
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                        {val.toExponential(3)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* End States Tab */}
        {activeTab === 'endstates' && (
          <div className="animate-fadeIn">
            {/* Category Summary Section */}
            <div style={{ marginBottom: 'var(--space-xl)' }}>
              <h4 style={{ fontSize: '14px', marginBottom: 'var(--space-md)', color: 'var(--text-secondary)' }}>
                {locale === 'ja' ? 'カテゴリ別サマリー' : 'Category Summary'}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
                {Array.from(new Set(model.endStates.flatMap(es => es.categories || []))).sort().map(cat => {
                  const totalFreq = result.endStateResults
                    ?.filter(r => r.category.split(', ').includes(cat))
                    .reduce((sum, r) => sum + r.frequency, 0) || 0;
                  const isZero = totalFreq === 0;

                  return (
                    <div key={cat} className="stat-card" style={{ borderLeft: isZero ? '3px solid var(--border-default)' : '3px solid var(--accent-blue)', opacity: isZero ? 0.6 : 1 }}>
                      <div className="stat-card__label">{cat}</div>
                      <div className="stat-card__value" style={{ fontSize: '16px' }}>
                        {isZero ? (locale === 'ja' ? '対象なし' : 'No Target') : totalFreq.toExponential(2)}
                      </div>
                      <div style={{ width: '100%', height: '4px', background: 'var(--bg-secondary)', marginTop: '8px', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: isZero ? '0%' : '100%', height: '100%', background: 'var(--accent-blue)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <h4 style={{ fontSize: '14px', marginBottom: 'var(--space-md)', color: 'var(--text-secondary)' }}>
              {locale === 'ja' ? '終状態詳細' : 'End State Details'}
            </h4>
            <table className="results-table">
              <thead>
                <tr>
                  <th>{t.endStateName}</th>
                  <th>{t.category}</th>
                  <th style={{ textAlign: 'right' }}>{t.frequency}</th>
                  <th style={{ textAlign: 'right' }}>{t.contribution} (CDF)</th>
                </tr>
              </thead>
              <tbody>
                {model.endStates.map((es) => {
                  const esResult = result.endStateResults?.find(r => r.endStateId === es.id);
                  const isZero = !esResult || esResult.frequency === 0;
                  return (
                    <tr key={es.id} style={{ opacity: isZero ? 0.6 : 1 }}>
                      <td style={{ fontWeight: 600 }}>{es.name}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {(es.categories || []).map(cat => (
                            <span key={cat} className="badge badge--ghost" style={{ fontSize: '9px' }}>{cat}</span>
                          ))}
                        </div>
                      </td>
                      <td className="td-mono" style={{ textAlign: 'right', color: isZero ? 'var(--text-tertiary)' : 'inherit' }}>
                        {esResult ? esResult.frequency.toExponential(2) : (locale === 'ja' ? '対象なし' : 'No Target')}
                      </td>
                      <td className="td-mono" style={{ textAlign: 'right' }}>
                        {esResult && esResult.cdfContribution > 0
                          ? `${esResult.cdfContribution.toFixed(1)}%`
                          : (isZero ? '—' : '0.0%')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Sequences Tab */}
        {activeTab === 'sequences' && result.sequenceResults && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>{t.sequences}</h3>
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  const csvData = result.sequenceResults!.map(seq => {
                    const seqInfo = model.eventTrees.flatMap(et => et.sequences).find((s: any) => s.id === seq.sequenceId);
                    const es = model.endStates.find(e => e.id === seqInfo?.endStateId);
                    return {
                      Name: seq.sequenceName,
                      Path: seq.pathDescription,
                      Frequency: seq.frequency,
                      EndState: es?.name || 'N/A',
                      Category: es?.categories.join(', ') || '-'
                    };
                  });
                  downloadFile(jsonToCsv(csvData), `Sequences_Export_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
                }}
              >
                📥 CSV Download
              </button>
            </div>
            <table className="results-table">
              <thead>
                <tr>
                  <th>{t.sequenceName}</th>
                  <th>{t.path}</th>
                  <th>{locale === 'ja' ? '終状態' : 'End State'}</th>
                  <th>{locale === 'ja' ? 'カテゴリ' : 'Category'}</th>
                  <th style={{ textAlign: 'right' }}>{t.frequency}</th>
                  <th style={{ textAlign: 'center' }}>{t.rank}</th>
                </tr>
              </thead>
              <tbody>
                {(result.sequenceResults || []).map((seq) => {
                  const seqInfo = model.eventTrees.flatMap(et => et.sequences).find((s: any) => s.id === seq.sequenceId);
                  const es = model.endStates.find(e => e.id === seqInfo?.endStateId);

                  return (
                    <tr
                      key={seq.sequenceId}
                      className={selectedSeqId === seq.sequenceId ? 'tr--selected' : ''}
                      onClick={() => {
                        setSelectedSeqId(seq.sequenceId);
                        setActiveTab('cutsets'); // Switch to cutsets to see the result
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{seq.sequenceName}</td>
                      <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{seq.pathDescription}</td>
                      <td style={{ fontWeight: 500 }}>{es?.name || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {(es?.categories || []).map(cat => (
                            <span key={cat} className="badge badge--ghost" style={{ fontSize: '9px' }}>{cat}</span>
                          ))}
                        </div>
                      </td>
                      <td className="td-mono" style={{ textAlign: 'right' }}>
                        {seq.frequency.toExponential(3)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '10px', color: 'var(--accent-blue)', textDecoration: 'underline' }}>
                          {locale === 'ja' ? '詳細分析' : 'Details'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Uncertainty Tab */}
        {activeTab === 'uncertainty' && (
          <UncertaintyPanel locale={locale} />
        )}

        {/* Sensitivity Tab */}
        {activeTab === 'sensitivity' && (
          <SensitivityPanel locale={locale} />
        )}
      </div>
    </div>
  );
}
