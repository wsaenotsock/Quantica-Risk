'use client';

import React from 'react';
import { useModelStore } from '@/store/modelStore';
import { useResultsStore, runWorkerCommand } from '@/store/resultsStore';
import type { GlobalQuantificationSettings } from '@/lib/types';

interface QuantificationPanelProps {
  locale: 'ja' | 'en';
  onNavigateToResults?: () => void;
}

export default function QuantificationPanel({ locale, onNavigateToResults }: QuantificationPanelProps) {
  const model = useModelStore(s => s.model);
  const settings = model.quantificationSettings || {
    cutOff: 1e-20,
    bddCutOff: 1e-20,
    enablePruning: false,
    approximation: ['bdd_exact', 'mcub', 'rare_event'],
    monteCarloSamples: 10000,
    useLHS: true,
    runUncertainty: false,
    maxCutsets: 100000
  };
  const updateSettings = useModelStore(s => s.updateQuantificationSettings);
  
  // Ensure settings.approximation is treated as an array safely
  const currentMethods: string[] = React.useMemo(() => {
    const raw = settings.approximation;
    if (Array.isArray(raw)) return raw;
    return raw ? [raw] : ['bdd_exact'];
  }, [settings.approximation]);

  const handleToggleMethod = (method: string) => {
    const next = currentMethods.includes(method)
      ? currentMethods.filter(m => m !== method)
      : [...currentMethods, method];
    // Keep at least one method? Or allow none? Let's allow none, but usually at least BDD is chosen.
    updateSettings({ ...settings, approximation: next as any });
  };
  
  const [cutOffInput, setCutOffInput] = React.useState(settings.cutOff.toString());
  const [bddCutOffInput, setBddCutOffInput] = React.useState((settings.bddCutOff ?? 1e-20).toString());

  React.useEffect(() => {
    setCutOffInput(settings.cutOff.toExponential());
  }, [settings.cutOff]);

  React.useEffect(() => {
    setBddCutOffInput((settings.bddCutOff ?? 1e-20).toExponential());
  }, [settings.bddCutOff, settings.cutOff]);
  
  const [showPruningHelp, setShowPruningHelp] = React.useState(false);
  const [showCutsetHelp, setShowCutsetHelp] = React.useState(false);
  
  const results = useResultsStore(s => s.results || {});
  const activeResultId = useResultsStore(s => s.activeResultId);
  const setActiveResult = useResultsStore(s => s.setActiveResult);
  const aggregatedTargetIds = useResultsStore(s => s.aggregatedTargetIds);
  const toggleAggregatedTargetId = useResultsStore(s => s.toggleAggregatedTargetId);
  const setComputing = useResultsStore(s => s.setComputing);
  const setResult = useResultsStore(s => s.setResult);
  const setError = useResultsStore(s => s.setError);

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const faultTrees = model.faultTrees || [];
  const eventTrees = model.eventTrees || [];

  const runBatch = async () => {
    if (selectedIds.size === 0) return;
    setComputing(true);
    try {
      for (const id of Array.from(selectedIds)) {
        const isFT = faultTrees.some(f => f.id === id);
        const result = await runWorkerCommand<any>(isFT ? 'QUANTIFY_FT' : 'QUANTIFY_ET', { model, targetId: id });
        
        // Save intermediate result so that subsequent RUN_MONTE_CARLO can access it via resultsStore
        setResult(id, result);
        
        if (settings.runUncertainty) {
          const mc = await runWorkerCommand<any>('RUN_MONTE_CARLO', { 
            targetType: 'total', 
            targetId: id, 
            trials: settings.monteCarloSamples, 
            useLHS: settings.useLHS 
          });
          result.uncertainty = mc;
          setResult(id, result);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Batch quantification failed');
    } finally {
      setComputing(false);
    }
  };

  const handleChange = (key: keyof GlobalQuantificationSettings, value: any) => {
    updateSettings({ [key]: value });
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleGroup = (ids: string[], select: boolean) => {
    const next = new Set(selectedIds);
    ids.forEach(id => {
      if (select) next.add(id);
      else next.delete(id);
    });
    setSelectedIds(next);
  };

  const t = {
    title: locale === 'ja' ? '定量化設定' : 'Quantification Settings',
    cutOff: locale === 'ja' ? 'カットセット抽出下限 (Cut-off)' : 'Cut-off Threshold',
    bddCutOff: locale === 'ja' ? '枝刈り閾値 (Pruning)' : 'Pruning Threshold',
    approximation: locale === 'ja' ? '計算手法' : 'Calculation Method',
    maxCutsets: locale === 'ja' ? '最大カットセット数 (打ち切り値)' : 'Max Cutsets Limit',
    cutoffTip: locale === 'ja' 
      ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>💡 <strong>カットオフの注意点:</strong> 設定値を下げすぎると（例: 1e-40）、探索木が膨大になり極小確率の経路だけで「最大カットセット数」の枠を使い切ってしまいます。その結果、本来の支配的な組み合わせが抽出されなくなるため、近似値が急落する原因となります。</div>
          <div style={{ borderTop: '1px solid rgba(59, 130, 246, 0.2)', paddingTop: '6px' }}>
            💡 <strong>最大数と抽出数の差異:</strong> 最大数（打ち切り値）を大きく設定しても、最終的な「総MCS数」がそれより少なくなることがあります。これは抽出過程で他の短い組み合わせに包含（吸収）され、極小カットセットとして整理・削減されるためです。なお、縮約前のカットセット数についても結果に出力しております。
          </div>
        </div>
      )
      : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>💡 <strong>Cut-off Caveat:</strong> Setting the threshold too low (e.g., 1e-40) can flood the extraction limit with negligible paths, locking out dominant combinations and causing computed probabilities to drop.</div>
          <div style={{ borderTop: '1px solid rgba(59, 130, 246, 0.2)', paddingTop: '6px' }}>
            💡 <strong>Discrepancy in Counts:</strong> The final MCS count may be lower than the specified "Max Cutsets". This is because redundant combinations are absorbed by smaller subsets during the minimization process.
          </div>
        </div>
      ),
    mcSamples: locale === 'ja' ? 'モンテカルロ試行回数' : 'Monte Carlo Samples',
    useLHS: locale === 'ja' ? 'LHS (Latin Hypercube Sampling) を使用' : 'Use Latin Hypercube Sampling (LHS)',
    runFT: locale === 'ja' ? 'FT定量化実行' : 'Run FT Quantification',
    runET: locale === 'ja' ? 'ET定量化実行' : 'Run ET Quantification',
    targetList: locale === 'ja' ? '解析対象リスト' : 'Analysis Targets',
    settingsDesc: locale === 'ja' ? '解析実行時の共通パラメーターを設定します。' : 'Set global parameters for quantification.',
    runSelected: locale === 'ja' ? '選択した解析を実行' : 'Run Selected Analysis',
    runUncertaintyLabel: locale === 'ja' ? '定量化後に不確かさ解析（モンテカルロ法）を実行する' : 'Run Uncertainty Analysis (Monte Carlo) after quantification',
    selectAll: locale === 'ja' ? 'すべて選択' : 'Select All',
    deselectAll: locale === 'ja' ? '選択解除' : 'Deselect',
    groupExact: locale === 'ja' ? '厳密評価 (Exact)' : 'Exact Evaluation',
    groupApprox: locale === 'ja' ? '近似評価 & カットセット設定 (Approx & MCS)' : 'Approximations & Cutsets',
  };

  const renderTargetItem = (target: any, isFT: boolean) => {
    const isSelected = selectedIds.has(target.id);
    const hasResult = !!results[target.id];
    const isActive = activeResultId === target.id;

    return (
      <div 
        key={target.id} 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          background: isActive ? 'var(--bg-secondary)' : 'var(--bg-primary)', 
          padding: '10px 16px', 
          borderRadius: '8px', 
          border: `1px solid ${isActive ? 'var(--accent-blue)' : 'var(--border-default)'}`,
          transition: 'all 0.2s',
          marginBottom: '4px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input type="checkbox" checked={isSelected} onChange={() => toggleSelection(target.id)} style={{ width: '16px', height: '16px' }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>
              {isFT ? '🌳' : '🌿'} {target.name}
              {hasResult && <span style={{ marginLeft: 8, fontSize: '10px', color: 'var(--accent-green)', background: 'rgba(0,214,143,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{locale === 'ja' ? '完了' : 'Done'}</span>}
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {hasResult && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', marginRight: '4px', color: 'var(--text-secondary)' }}>
              <input 
                type="checkbox" 
                checked={aggregatedTargetIds.includes(target.id)} 
                onChange={() => toggleAggregatedTargetId(target.id)} 
                style={{ width: '14px', height: '14px' }}
              />
              {locale === 'ja' ? '統合対象' : 'Include'}
            </label>
          )}
          {hasResult && (
            <button 
              className={`btn btn--sm ${isActive ? 'btn--primary' : 'btn--secondary'}`}
              onClick={() => {
                setActiveResult(target.id);
                onNavigateToResults?.();
              }}
            >
              {locale === 'ja' ? '結果を表示' : 'View'}
            </button>
          )}
          <button 
            className="btn btn--ghost btn--sm"
            onClick={async () => {
              setComputing(true);
              try {
                const result = await runWorkerCommand<any>(isFT ? 'QUANTIFY_FT' : 'QUANTIFY_ET', { model, targetId: target.id });
                
                // Save intermediate result so that subsequent RUN_MONTE_CARLO can access it via resultsStore
                setResult(target.id, result);
                
                if (settings.runUncertainty) {
                  const mc = await runWorkerCommand<any>('RUN_MONTE_CARLO', { 
                    targetType: 'total', 
                    targetId: target.id, 
                    trials: settings.monteCarloSamples, 
                    useLHS: settings.useLHS 
                  });
                  result.uncertainty = mc;
                  setResult(target.id, result);
                }
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Quantification failed');
              } finally {
                setComputing(false);
              }
            }}
          >
            {locale === 'ja' ? '実行' : 'Run'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="quantification-panel" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>⚙️ {t.title}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{t.settingsDesc}</p>
        </div>
        <button 
          className="btn btn--primary" 
          disabled={selectedIds.size === 0} 
          onClick={runBatch}
          style={{ padding: '12px 24px', borderRadius: '8px', fontWeight: 600, boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
        >
          🚀 {t.runSelected} ({selectedIds.size})
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left Column: All Configuration Sections */}
        <div style={{ display: 'grid', gap: '24px' }}>
        <section className="card" style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-default)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📊</span> {locale === 'ja' ? '基本設定' : 'Basic Settings'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '16px' }}>
            {/* Left Group: Exact Logic (Completely independent of cutsets) */}
            <div style={{ 
              background: 'rgba(59, 130, 246, 0.04)', 
              border: '1px solid rgba(59, 130, 246, 0.2)', 
              borderRadius: '8px', 
              padding: '16px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-blue)', marginBottom: '12px', borderBottom: '1px solid rgba(59, 130, 246, 0.1)', paddingBottom: '6px' }}>
                🛡️ {t.groupExact}
              </div>
              <div className="form-group" style={{ marginTop: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
                  <input 
                    type="checkbox" 
                    checked={currentMethods.includes('bdd_exact')} 
                    onChange={() => handleToggleMethod('bdd_exact')} 
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>{locale === 'ja' ? 'BDD (厳密解)' : 'BDD (Exact)'}</span>
                </label>
                
                {currentMethods.includes('bdd_exact') && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                      <input 
                        type="checkbox" 
                        checked={settings.enablePruning === true} 
                        onChange={(e) => handleChange('enablePruning', e.target.checked)} 
                        style={{ width: '16px', height: '16px' }}
                      />
                      <span style={{ fontWeight: 500 }}>{locale === 'ja' ? 'Pruning（枝刈り）を使用' : 'Use Pruning'}</span>
                    </label>

                    {settings.enablePruning === true && (
                      <div style={{ paddingLeft: '24px' }}>
                        <label className="form-label" style={{ marginBottom: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>{t.bddCutOff}</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={bddCutOffInput} 
                          onChange={(e) => {
                            const val = e.target.value;
                            setBddCutOffInput(val);
                            const parsed = parseFloat(val);
                            if (!isNaN(parsed) && parsed >= 0) {
                              handleChange('bddCutOff', parsed);
                            }
                          }}
                          onBlur={() => {
                            setBddCutOffInput((settings.bddCutOff ?? 1e-20).toExponential());
                          }}
                          placeholder="例: 1e-12"
                          style={{ padding: '6px 10px', height: 'auto', fontSize: '13px', border: '1px solid var(--accent-blue)' }}
                        />
                      </div>
                    )}
                    
                    {settings.enablePruning === true && (
                      <div style={{ paddingLeft: '24px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.9, lineHeight: 1.4 }}>
                      {locale === 'ja' 
                        ? '※確率上限がこの閾値未満と判定された論理パスの展開をBDD構築時点で打ち切り、計算速度を大幅に向上させます。（例：閾値 1e-10 のとき、サブツリーの最大確率が 1e-15 である場合は展開を即時打ち切ります）' 
                        : '* Discards logical subtree expansion during BDD synthesis when the upper bound probability falls below this value. (e.g., terminates search if subtree max probability is 1e-15 while threshold is 1e-10)'}
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setShowPruningHelp(true)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-blue)',
                          fontSize: '11px',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span>📘</span>
                        {locale === 'ja' ? '詳細な数学的解説を読む' : 'Read detailed mathematical explanation'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

            {/* Right Group: Approximation Logic & Cutset Extraction (Highly coupled) */}
            <div style={{ 
              background: 'rgba(255,255,255,0.02)', 
              border: '1px solid var(--border-default)', 
              borderRadius: '8px', 
              padding: '16px' 
            }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                ✂️ {t.groupApprox}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Approximation Selections */}
                <div className="form-group">
                  <label className="form-label" style={{ marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {locale === 'ja' ? '近似手法の選択' : 'Approximation Methods'}
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                      <input type="checkbox" checked={currentMethods.includes('rare_event')} onChange={() => handleToggleMethod('rare_event')} />
                      <span>{locale === 'ja' ? '稀有事象近似' : 'Rare Event Approx'}</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                      <input type="checkbox" checked={currentMethods.includes('mcub')} onChange={() => handleToggleMethod('mcub')} />
                      <span>{locale === 'ja' ? 'MCUB' : 'MCUB'}</span>
                    </label>
                  </div>
                </div>


                {/* Cutset Tuning Parameters */}
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ marginBottom: '4px', fontSize: '13px' }}>{t.cutOff}</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={cutOffInput} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setCutOffInput(val);
                        const parsed = parseFloat(val);
                        if (!isNaN(parsed) && parsed >= 0) {
                          handleChange('cutOff', parsed);
                        }
                      }}
                      onBlur={() => {
                        setCutOffInput(settings.cutOff.toExponential());
                      }}
                      placeholder="例: 1e-15"
                      style={{ padding: '6px 10px', height: 'auto', fontSize: '13px' }}
                    />
                    <div style={{ marginTop: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setShowCutsetHelp(true)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-blue)',
                          fontSize: '11px',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span>📘</span>
                        {locale === 'ja' ? '詳細な数学的解説を読む' : 'Read detailed mathematical explanation'}
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ marginBottom: '4px', fontSize: '13px' }}>{t.maxCutsets}</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={settings.maxCutsets ?? 100000} 
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val > 0) {
                          handleChange('maxCutsets', val);
                        }
                      }}
                      min={1}
                      placeholder="例: 100000"
                      style={{ padding: '6px 10px', height: 'auto', fontSize: '13px' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ 
            marginTop: '16px', 
            padding: '12px 16px', 
            background: 'rgba(59, 130, 246, 0.08)', 
            border: '1px solid rgba(59, 130, 246, 0.2)', 
            borderRadius: '8px', 
            fontSize: '12px', 
            lineHeight: '1.6', 
            color: 'var(--text-secondary)' 
          }}>
            {t.cutoffTip}
          </div>
        </section>

        <section className="card" style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-default)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎲</span> {locale === 'ja' ? '不確かさ解析設定' : 'Uncertainty Analysis'}
          </h3>
          <div style={{ display: 'grid', gap: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '8px' }}>
              <input type="checkbox" checked={settings.runUncertainty} onChange={(e) => handleChange('runUncertainty', e.target.checked)} />
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-blue)' }}>{t.runUncertaintyLabel}</span>
            </label>
            <div className="form-group">
              <label className="form-label">{t.mcSamples}</label>
              <input type="number" className="form-input" value={settings.monteCarloSamples} onChange={(e) => handleChange('monteCarloSamples', parseInt(e.target.value))} style={{ width: '200px' }} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.useLHS} onChange={(e) => handleChange('useLHS', e.target.checked)} />
              <span style={{ fontSize: '14px' }}>{t.useLHS}</span>
            </label>
          </div>
        </section>
        </div>

        {/* Right Column: Targets List Section (Stacked Vertically) */}
        <div style={{ display: 'grid', gap: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 -8px 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎯</span> {t.targetList}
          </h3>

          {/* Total Aggregated View Card */}
          {Object.keys(results).length > 1 && (
            <section className="card" style={{ 
              padding: '16px 20px', 
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), var(--bg-secondary))', 
              borderRadius: '12px', 
              border: `2px solid ${activeResultId === '__total_aggregated__' ? 'var(--accent-blue)' : 'var(--border-default)'}`, 
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📊</span> {locale === 'ja' ? '全解析結果の統合' : 'Consolidated Total Results'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {locale === 'ja' ? `選択された ${aggregatedTargetIds.length}件 の解析結果を合成して表示します。` : `Aggregating ${aggregatedTargetIds.length} selected results.`}
                  </div>
                </div>
                <button 
                  className={`btn btn--sm ${activeResultId === '__total_aggregated__' ? 'btn--primary' : 'btn--secondary'}`}
                  style={{ padding: '8px 16px', fontWeight: 600 }}
                  onClick={() => {
                    setActiveResult('__total_aggregated__');
                    onNavigateToResults?.();
                  }}
                >
                  {locale === 'ja' ? '統合ビューを開く' : 'Open Aggregated View'}
                </button>
              </div>
            </section>
          )}
          {/* Fault Trees Section */}
          <section className="card" style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>🌳 Fault Trees</h3>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button className="btn btn--ghost btn--xs" onClick={() => toggleGroup(faultTrees.map(f => f.id), true)}>{t.selectAll}</button>
                <button className="btn btn--ghost btn--xs" onClick={() => toggleGroup(faultTrees.map(f => f.id), false)}>{t.deselectAll}</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {faultTrees.map(ft => renderTargetItem(ft, true))}
            </div>
          </section>

          {/* Event Trees Section */}
          <section className="card" style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>🌿 Event Trees</h3>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button className="btn btn--ghost btn--xs" onClick={() => toggleGroup(eventTrees.map(e => e.id), true)}>{t.selectAll}</button>
                <button className="btn btn--ghost btn--xs" onClick={() => toggleGroup(eventTrees.map(e => e.id), false)}>{t.deselectAll}</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {eventTrees.map(et => renderTargetItem(et, false))}
            </div>
          </section>
        </div>
      </div>

      {/* ===== Pruning Detailed Help Modal ===== */}
      {showPruningHelp && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowPruningHelp(false)}>
          <div style={{
            width: '90vw', maxWidth: 600, maxHeight: '80vh',
            background: 'var(--bg-elevated)', borderRadius: 12,
            border: '1px solid var(--border-default)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ 
              padding: '16px 20px', 
              borderBottom: '1px solid var(--border-default)', 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'rgba(255,255,255,0.02)'
            }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📘</span>
                {locale === 'ja' ? 'Pruning（枝刈り）の詳細解説' : 'Details of Pruning Mechanism'}
              </h3>
              <button 
                onClick={() => setShowPruningHelp(false)}
                className="btn btn-ghost"
                style={{ padding: '4px 8px', minWidth: 'auto', fontSize: '18px' }}
              >✕</button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px', overflowY: 'auto', fontSize: '14px', lineHeight: 1.6 }}>
              
              {/* Overview section */}
              <div style={{ 
                background: 'rgba(59, 130, 246, 0.05)', 
                padding: '16px', 
                borderRadius: '8px', 
                borderLeft: '4px solid var(--accent-blue)',
                marginBottom: '24px'
              }}>
                <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
                  💡 {locale === 'ja' ? 'Pruning の目的' : 'Core Objective'}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {locale === 'ja' 
                    ? '大規模なFTの計算において、数千万〜億通りの論理的組合せ爆発（BDD Node Explosion）によるメモリ枯渇を未然に防ぐための事前スクリーニング機構です。寄与の極めて低い枝を「探索前」に切り落とし、計算効率を劇的に改善します。'
                    : 'A pre-screening safeguard against BDD combinatorial memory overflow. By pre-determining sub-threshold dominance before node generation, it aggressively circumvents millions of useless memory allocations.'}
                </div>
              </div>

              {/* 1. Subtree Logic Details */}
              <div style={{ marginBottom: '28px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: 'var(--accent-blue)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }}>
                  1. {locale === 'ja' ? 'アルゴリズムと「サブツリー」の判定' : 'Algorithm & "Subtree" Resolution'}
                </h4>
                <p style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>
                  {locale === 'ja' 
                    ? '計算エンジンは、BDDグラフを構築する直前に、最上位から再帰的にツリーを下り、各論理ゲート（サブツリー）の到達可能な「確率上限値」を高速に見積もります。'
                    : 'Immediately prior to graph synthesis, the engine performs recursive descent to evaluate reachable upper probability limits for every logical sub-gate.'}
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '12px', border: '1px solid var(--border-default)' }}>
                  <div style={{ color: 'var(--accent-green)' }}>// {locale === 'ja' ? '評価アルゴリズムの概略' : 'Pseudo Code'}</div>
                  <div>if (Gate.Type == OR)  P_max = sum(Children.P_max);</div>
                  <div>if (Gate.Type == AND) P_max = product(Children.P_max);</div>
                  <div>if (Gate.Type == VOTE) P_max = sum(Children.P_max); // Conservative</div>
                  <div style={{ marginTop: '8px', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                    {locale === 'ja' ? 'if (P_max < Threshold) => 枝を「論理的定数 0 (発生しない)」として即時置換' : 'if (P_max < Threshold) => Replace branch with constant FALSE (Immediate Cut)'}
                  </div>
                </div>
              </div>

              {/* 2. Dependency Nuance */}
              <div style={{ marginBottom: '28px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: 'var(--accent-blue)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }}>
                  2. {locale === 'ja' ? '基事象の従属性（依存性）の数学的扱い' : '2. Strictness of Base Event Dependencies'}
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Step A */}
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ background: 'var(--bg-tertiary)', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>A</span>
                      {locale === 'ja' ? '判定フェーズ（保守的な高速近似）' : 'Phase A: Fast Conservative Approximation'}
                    </div>
                    <p style={{ margin: '0 0 8px 24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {locale === 'ja' 
                        ? '演算資源を消費しないよう「基事象の完全独立」を仮定したRare Event Approximationを用います。これは一般的に「十分安全な上限値」と見なされます。'
                        : 'Employs standalone Rare Event Approximation (assuming absolute component independence) to evaluate threshold gates without burning memory CPU cycles.'}
                    </p>
                    <div style={{ margin: '0 0 0 24px', padding: '10px', background: 'rgba(239, 68, 68, 0.05)', border: '1px dashed rgba(239, 68, 68, 0.2)', borderRadius: '6px', fontSize: '12px', lineHeight: 1.5 }}>
                      <strong>{locale === 'ja' ? '⚠️ 理論上の注意点' : '⚠️ Theoretical Boundary Warning'}</strong><br/>
                      {locale === 'ja' 
                        ? 'サポート系（電源等）の共有などにより、同一基事象が、あるANDゲートの下位にある複数の異なる系統に含まれる場合、単純積算 (P(A) × P(A)) によって確率上限値が数学的真値より小さく見積もられます。その枝全体の推定確率が極めて低く、計算上の閾値を下回る場合に限り、Pruning の対象となる理論的可能性があります。しかし、実用上は計算の劇的な高速化のメリットの方が遥かに大きく、計算上の誤差はユーザーが指定した閾値（Pruning Threshold）の範囲内に収まります。' 
                        : 'If identical base events populate multiple input branches under the same AND structure (e.g., due to shared support systems), multiplicative estimation (P(A) × P(A)) evaluates lower than the true probability. Theoretically, this could cause a very low-probability branch to fall below the threshold and be discarded early. In practice, the immense computational speedup far outweighs this, and accuracy impact is contained within user-defined Threshold bounds.'}
                    </div>
                  </div>

                  {/* Step B */}
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ background: 'var(--accent-blue)', color: 'white', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>B</span>
                      {locale === 'ja' ? 'BDD演算フェーズ（厳密解の導出）' : 'Phase B: The Definitive BDD Operations'}
                    </div>
                    <p style={{ margin: '0 0 0 24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {locale === 'ja' 
                        ? 'Pruningを生き残った「支配的な論理経路」のみでBDDが構成されます。BDDの内部ではシャノンの展開定理に基づき、基事象の重複、共有依存性（Common Components）は完全にマージ・解消されます。つまり最終段での数学的厳密性は完璧に維持されます。'
                        : 'Remaining dominant logic triggers canonical BDD graph compression based on Shannon Expansion. Here, all components and nested dependencies merge automatically and flawlessly.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Numeric Case Study */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: 'var(--accent-blue)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }}>
                  3. {locale === 'ja' ? '具体的な数値シミュレーション' : '3. Concrete Numerical Case Study'}
                </h4>
                
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-default)', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', borderBottom: '1px solid var(--border-default)', padding: '10px', background: 'var(--bg-tertiary)', fontWeight: 600, fontSize: '12px' }}>
                    <div>{locale === 'ja' ? 'コンポーネント' : 'Components'}</div>
                    <div>{locale === 'ja' ? '挙動' : 'Behavior'}</div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', borderBottom: '1px solid var(--border-default)', padding: '10px', fontSize: '13px' }}>
                    <div style={{ fontWeight: 'bold' }}>{locale === 'ja' ? '基本事象 A' : 'Event A'}</div>
                    <div>Probability = 1.0e-4</div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', borderBottom: '1px solid var(--border-default)', padding: '10px', fontSize: '13px' }}>
                    <div style={{ fontWeight: 'bold' }}>{locale === 'ja' ? '基本事象 B' : 'Event B'}</div>
                    <div>Probability = 1.0e-6</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', padding: '10px', fontSize: '13px', background: 'rgba(239, 68, 68, 0.03)' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--accent-red)' }}>AND Gate(A, B)</div>
                    <div>
                      MaxProb = 1.0e-10<br/>
                      <div style={{ marginTop: '4px', padding: '4px 8px', background: 'var(--bg-elevated)', borderRadius: '4px', border: '1px solid rgba(239,68,68,0.4)', display: 'inline-block', color: 'var(--accent-red)', fontSize: '11px', fontWeight: 'bold' }}>
                        {locale === 'ja' ? '🚨 もし閾値が 1.0e-9 ならば、この配下の展開を完全に中止。' : '🚨 Discarded entirely if Threshold is 1.0e-9.'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '30px', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-default)', fontSize: '13px', color: 'var(--text-primary)', fontWeight: '500', textAlign: 'center' }}>
                🏆 {locale === 'ja' 
                  ? '結論：Pruningは「安全性を確保しつつ不要な爆発を防ぐ」業界標準の高速化技術です。' 
                  : 'Conclusion: A standard methodology safeguarding absolute system speed while guaranteeing bounding conservation.'}
              </div>

            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-default)', background: 'rgba(255,255,255,0.01)', textAlign: 'right' }}>
              <button 
                onClick={() => setShowPruningHelp(false)}
                className="btn btn--primary"
              >
                {locale === 'ja' ? '閉じる' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Cutset Extraction Help Modal ===== */}
      {showCutsetHelp && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowCutsetHelp(false)}>
          <div style={{
            width: '90vw', maxWidth: 650, maxHeight: '80vh',
            background: 'var(--bg-elevated)', borderRadius: 12,
            border: '1px solid var(--border-default)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ 
              padding: '16px 20px', 
              borderBottom: '1px solid var(--border-default)', 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'rgba(255,255,255,0.02)'
            }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📘</span>
                {locale === 'ja' ? 'カットセット抽出下限（Cut-off）の詳細解説' : 'Details of Cutset Extraction Cutoff'}
              </h3>
              <button 
                onClick={() => setShowCutsetHelp(false)}
                className="btn btn-ghost"
                style={{ padding: '4px 8px', minWidth: 'auto', fontSize: '18px' }}
              >✕</button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px', overflowY: 'auto', fontSize: '14px', lineHeight: 1.6 }}>
              
              {/* Overview */}
              <div style={{ 
                background: 'rgba(16, 185, 129, 0.05)', 
                padding: '16px', 
                borderRadius: '8px', 
                borderLeft: '4px solid var(--accent-green)',
                marginBottom: '24px'
              }}>
                <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
                  💡 {locale === 'ja' ? 'カットセット抽出下限の目的' : 'Purpose of Cutset Filtering'}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {locale === 'ja' 
                    ? '論理計算が完了した膨大な「ミニマル・カットセット（MCS）」の山の中から、確率が低すぎて全体リスクに寄与しない組み合わせをテーブルから除外（ポスト・フィルタリング）し、結果をクリーンに要約するための設定値です。'
                    : 'A post-computation sieve to eliminate logically sound but statistically insignificant Cutsets from the final output table, ensuring summary data remains concise and meaningful.'}
                </div>
              </div>

              {/* 1. Comparison Table */}
              <div style={{ marginBottom: '28px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: 'var(--accent-blue)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }}>
                  1. {locale === 'ja' ? 'Pruning（枝刈り）との決定的違い' : '1. Crucial Differentiation from Pruning'}
                </h4>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-default)', borderRadius: '8px', overflow: 'hidden', fontSize: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1.5fr', borderBottom: '2px solid var(--border-default)', background: 'var(--bg-tertiary)', padding: '8px', fontWeight: 'bold' }}>
                    <div>{locale === 'ja' ? '項目' : 'Feature'}</div>
                    <div>{locale === 'ja' ? 'Pruning（枝刈り）' : 'Pruning'}</div>
                    <div style={{ color: 'var(--accent-green)' }}>{locale === 'ja' ? 'カットセット抽出下限' : 'Cutset Cutoff'}</div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1.5fr', borderBottom: '1px solid var(--border-default)', padding: '10px', background: 'rgba(0,0,0,0.1)' }}>
                    <div style={{ fontWeight: 600 }}>{locale === 'ja' ? '実行タイミング' : 'Timing'}</div>
                    <div>{locale === 'ja' ? 'BDD構築 「前」' : 'BEFORE BDD Build'}</div>
                    <div style={{ fontWeight: 600 }}>{locale === 'ja' ? 'BDD構築 「後」' : 'AFTER BDD Build'}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1.5fr', borderBottom: '1px solid var(--border-default)', padding: '10px' }}>
                    <div style={{ fontWeight: 600 }}>{locale === 'ja' ? '主な目的' : 'Core Goal'}</div>
                    <div>{locale === 'ja' ? 'メモリ爆発の回避' : 'Prevent RAM Crash'}</div>
                    <div>{locale === 'ja' ? '出力テーブルの整理' : 'Clean Output Table'}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1.5fr', padding: '10px', background: 'rgba(0,0,0,0.1)' }}>
                    <div style={{ fontWeight: 600 }}>{locale === 'ja' ? '対象' : 'Target Scope'}</div>
                    <div>{locale === 'ja' ? '中間の論理分岐' : 'Logic Gate Branches'}</div>
                    <div>{locale === 'ja' ? '個別のMCS行データ' : 'Individual MCS Rows'}</div>
                  </div>
                </div>
              </div>

              {/* 2. Algorithmic Filtering */}
              <div style={{ marginBottom: '28px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: 'var(--accent-blue)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }}>
                  2. {locale === 'ja' ? '数学的フィルターロジック' : '2. Post-Synthesis Filter Mechanism'}
                </h4>
                <p style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>
                  {locale === 'ja' 
                    ? 'すべての論理展開が終わり、数百万行に及ぶ個別の事象組合せ（$C_1, C_2, ...$）がリストアップされた直後、以下のスクリーニングを実行します。'
                    : 'Immediately following explicit list generation of potentially millions of unique event combinations ($C_1, C_2, ...$).'}
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '12px', border: '1px solid var(--border-default)' }}>
                  <div>Probability_Cutset = P(Base1) * P(Base2) * ...;</div>
                  <div style={{ marginTop: '6px', color: 'var(--accent-green)', fontWeight: 'bold' }}>
                    if (Probability_Cutset &lt; User_Cutoff) &#123;
                  </div>
                  <div style={{ paddingLeft: '16px', color: 'var(--text-secondary)' }}>
                    // {locale === 'ja' ? '結果リストから除外。重要度計算の母集団にも載せない。' : 'Discard from final list and importance indices'}
                  </div>
                  <div style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>&#125;</div>
                </div>
              </div>

              {/* 3. Important Note on Totals */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: 'var(--accent-blue)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }}>
                  3. {locale === 'ja' ? '累積確率への影響と推奨設定' : '3. Impact on Total Probability'}
                </h4>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-default)', borderRadius: '8px', padding: '14px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {locale === 'ja' 
                    ? '微小なカットセットを無数に切り捨てるため、抽出されたカットセット群の「単純合計値」は、BDD演算で得られる数学的厳密値（BDD Total）に比べてごく僅かに小さくなる場合があります。'
                    : 'Because infinitesimal cutsets are discarded en masse, the brute Sum of surviving rows may slightly under-report compared to the native BDD Total value.'}
                  <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.1)', color: 'var(--text-primary)' }}>
                    📌 **{locale === 'ja' ? 'ベストプラクティス' : 'Best Practice'}**:
                    <ul style={{ margin: '6px 0 0 20px', padding: 0 }}>
                      <li>{locale === 'ja' ? '合計値を確認したい場合：BDD Total の結果を参照する。' : 'For absolute sums: Reference the explicit BDD Total output.'}</li>
                      <li>{locale === 'ja' ? '設定のコツ：通常、Pruning閾値と同等か、それより若干小さく設定します。' : 'Tuning: Set slightly equal to or below your current Pruning threshold.'}</li>
                    </ul>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-default)', background: 'rgba(255,255,255,0.01)', textAlign: 'right' }}>
              <button 
                onClick={() => setShowCutsetHelp(false)}
                className="btn btn--primary"
              >
                {locale === 'ja' ? '閉じる' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
