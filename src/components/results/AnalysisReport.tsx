'use client';

import React from 'react';
import { useResultsStore } from '@/store/resultsStore';
import { useModelStore } from '@/store/modelStore';
import { formatDuration } from '@/lib/utils/format';
import { aggregateResults } from '@/lib/utils/aggregation';
import { QuanticaLogo } from '@/components/brand/QuanticaLogo';

export interface ReportOptions {
  showExecSummary: boolean;
  showBasicInfo: boolean;
  showQuantResult: boolean;
  showUncertainty: boolean;
  showMCS: boolean;
}

interface AnalysisReportProps {
  locale?: 'ja' | 'en';
  options?: ReportOptions;
}

export default function AnalysisReport({ 
  locale = 'ja', 
  options = {
    showExecSummary: true,
    showBasicInfo: true,
    showQuantResult: true,
    showUncertainty: true,
    showMCS: true
  } 
}: AnalysisReportProps) {
  const results = useResultsStore((s) => s.results);
  const activeResultId = useResultsStore((s) => s.activeResultId);
  
  const result = React.useMemo(() => {
    if (!activeResultId) return null;
    if (activeResultId === '__total_aggregated__') {
      return aggregateResults(Object.values(results));
    }
    return results[activeResultId];
  }, [activeResultId, results]);
  const model = useModelStore((s) => s.model);
  const selectedEventTreeId = useModelStore((s) => s.selectedEventTreeId);
  const et = model.eventTrees.find(t => t.id === selectedEventTreeId);

  if (!result) {
    return (
      <div style={{
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%',
        minHeight: '300px',
        padding: '40px',
        textAlign: 'center',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📄</div>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '18px', fontWeight: 600 }}>
          {locale === 'ja' ? 'レポート対象データがありません' : 'No Data to Report'}
        </h3>
        <p style={{ fontSize: '14px', lineHeight: '1.6', maxWidth: '400px', margin: '0 auto' }}>
          {locale === 'ja' 
            ? 'まだ一度も解析が実行されていないか、アクティブな結果が選択されていません。定量化設定画面から解析（Run）を行ってください。' 
            : 'No active quantification results found. Please run a quantification from the settings panel first.'}
        </p>
      </div>
    );
  }

  const t = {
    title: locale === 'ja' ? '解析サマリーレポート' : 'Analysis Summary Report',
    project: locale === 'ja' ? 'プロジェクト' : 'Project',
    date: locale === 'ja' ? '出力日時' : 'Export Date',
    et: locale === 'ja' ? 'イベントツリー' : 'Event Tree',
    ie: locale === 'ja' ? '起因事象' : 'Initiating Event',
    quantResult: locale === 'ja' ? '定量化結果 (点推定)' : 'Quantification Result (Point Estimate)',
    topProb: locale === 'ja' ? 'CDF / 非成功頻度合計' : 'Total Frequency (CDF)',
    uncertainty: locale === 'ja' ? '不確かさ解析サマリー' : 'Uncertainty Analysis Summary',
    trials: locale === 'ja' ? '試行回数' : 'Trials',
    mean: locale === 'ja' ? '平均値 (Mean)' : 'Mean',
    median: locale === 'ja' ? '中央値 (Median)' : 'Median',
    p5: locale === 'ja' ? '5%値 (Lower Bound)' : '5% Bound',
    p95: locale === 'ja' ? '95%値 (Upper Bound)' : '95% Bound',
    mcsTitle: locale === 'ja' ? '上位最小カットセット (MCS)' : 'Top Cut Sets (MCS)',
    execSummary: locale === 'ja' ? 'エグゼクティブ・サマリー' : 'Executive Summary',
  };

  const uncertainty = (result as any).uncertainty;

  const getEventFormattedName = (id: string) => {
    const be = model.basicEvents.find(b => b.id === id);
    if (be) {
      return be.eventId ? `${be.name} [${be.eventId}]` : be.name;
    }
    const ie = model.initiatingEvents.find(i => i.id === id);
    if (ie) {
      return ie.code ? `${ie.name} [${ie.code}]` : ie.name;
    }
    return id;
  };

  const getEventDisplayName = (eid: string) => {
    const be = model.basicEvents.find(b => b.id === eid);
    const ie = model.initiatingEvents.find(i => i.id === eid);
    if (be || ie) return getEventFormattedName(eid);
    
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
    const be = model.basicEvents.find(b => b.id === eid);
    if (be && be.probability !== undefined) return be.probability;
    const ie = model.initiatingEvents.find(i => i.id === eid);
    if (ie) return ie.frequency;
    
    if (result && result.baseProbabilities && result.baseProbabilities[eid] !== undefined) {
      return result.baseProbabilities[eid];
    }
    return 0;
  };

  const getEventFailureMode = (eid: string) => {
    // CCF 独立イベントのデコード: CCF_GroupID_IND_MemberID
    if (eid.startsWith('CCF_') && eid.includes('_IND_')) {
      const memberId = eid.split('_IND_')[1];
      const be = model.basicEvents.find(b => b.id === memberId);
      if (be) {
        if (be.failureMode) return be.failureMode;
        if (be.parameterId) {
          const param = model.parameters?.find(p => p.id === be.parameterId);
          if (param) return param.name;
        }
      }
      return '';
    }
    const be = model.basicEvents.find(b => b.id === eid);
    if (be) {
      if (be.failureMode) return be.failureMode;
      if (be.parameterId) {
        const param = model.parameters?.find(p => p.id === be.parameterId);
        if (param) return param.name;
      }
    }
    return '';
  };

  return (
    <div className="analysis-report print-content" style={{ padding: '40px 60px', background: 'white', color: 'black', minHeight: '100%', fontFamily: '"Inter", "Segoe UI", sans-serif' }}>
      <header style={{ borderBottom: '3px solid #333', marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <QuanticaLogo theme="light" style={{ height: '55px', width: '100px' }} />
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', letterSpacing: '-0.5px', textTransform: 'uppercase' }}>{t.title}</h1>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '11px', color: '#444' }}>
          <div style={{ fontWeight: 'bold' }}>{t.date}</div>
          <div>{new Date().toLocaleString(locale === 'ja' ? 'ja-JP' : 'en-US')}</div>
        </div>
      </header>

      {/* Executive Summary */}
      {options.showExecSummary && (
        <section style={{ marginBottom: '40px', padding: '25px', background: '#fcfcfc', border: '1px solid #eee', borderRadius: '12px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '15px', color: '#111', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: '8px', height: '18px', background: '#3b82f6', borderRadius: '2px' }}></span>
            {t.execSummary}
          </h2>
          <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#333', margin: 0 }}>
            {locale === 'ja' ? (
              <>
                本レポートは、プロジェクト「<strong>{model.name}</strong>」における「<strong>{et?.name || 'N/A'}</strong>」の安全性解析結果をまとめたものです。
                最新の解析エンジンによる定量化の結果、目標事象の発生頻度は年間 <strong>{result.topEventProbability.toExponential(4)}</strong> と推定されました。
                {uncertainty ? ` また、不確かさ解析の結果、平均値は ${uncertainty.mean.toExponential(4)} であり、90%信頼区間は ${uncertainty.p5.toExponential(4)} から ${uncertainty.p95.toExponential(4)} の範囲にあります。` : ''}
                主なリスク寄与要因は、下位の最小カットセット（MCS）セクションに詳述されています。
              </>
            ) : (
              <>
                This report summarizes the safety analysis for "<strong>{et?.name || 'N/A'}</strong>" within project "<strong>{model.name}</strong>".
                Quantification using the latest BDD engine estimates the top event frequency at <strong>{result.topEventProbability.toExponential(4)}</strong> per year.
                {uncertainty ? ` Uncertainty analysis shows a mean value of ${uncertainty.mean.toExponential(4)}, with a 90% confidence interval ranging from ${uncertainty.p5.toExponential(4)} to ${uncertainty.p95.toExponential(4)}.` : ''}
                Primary risk contributors are detailed in the Minimal Cut Sets (MCS) section below.
              </>
            )}
          </p>
        </section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '40px' }}>
        {options.showBasicInfo && (
          <section>
            <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', color: '#666', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '15px' }}>
              Basic Information
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '10px 0', color: '#666' }}>{t.project}</td>
                  <td style={{ padding: '10px 0', fontWeight: 600, textAlign: 'right' }}>{model.name}</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 0', color: '#666' }}>{t.et}</td>
                  <td style={{ padding: '10px 0', fontWeight: 600, textAlign: 'right' }}>{et?.name || 'N/A'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 0', color: '#666' }}>{t.ie}</td>
                  <td style={{ padding: '10px 0', fontWeight: 600, textAlign: 'right' }}>
                    {model.initiatingEvents.find(i => i.id === et?.initiatingEventId)?.name || 'N/A'}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        )}

        {options.showQuantResult && (
          <section>
            <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', color: '#666', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '15px' }}>
              {t.quantResult}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div style={{ padding: '15px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, marginBottom: '5px' }}>{t.topProb}</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>{result.topEventProbability.toExponential(4)}</div>
              </div>
              <div style={{ padding: '15px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, marginBottom: '5px' }}>METHODOLOGY</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>{result.method.toUpperCase().replace('_', ' ')}</div>
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#666', background: '#fff', border: '1px solid #eee', padding: '10px', borderRadius: '6px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div>
                <strong>Pruning:</strong>{' '}
                {result.enablePruning === false 
                  ? (locale === 'ja' ? '無効' : 'Disabled') 
                  : (result.bddCutOff !== undefined 
                      ? result.bddCutOff.toExponential(1) 
                      : (model.quantificationSettings?.bddCutOff || 1e-20).toExponential(1))
                }
              </div>
              <div>
                <strong>{locale === 'ja' ? 'カットオフ' : 'Cut-off'}:</strong>{' '}
                {result.cutoff?.toExponential(1) || 'None'}
              </div>
              <div>
                <strong>{locale === 'ja' ? '計算時間' : 'Compute Time'}:</strong>{' '}
                {formatDuration(result.computeTimeMs)}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Uncertainty Section */}
      {options.showUncertainty && (
        <section style={{ marginBottom: '40px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', color: '#666', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '15px' }}>
            {t.uncertainty}
          </h3>
          {uncertainty ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
              <div style={{ padding: '12px', border: '1px solid #eee', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px' }}>{t.mean}</div>
                <div style={{ fontWeight: 700 }}>{uncertainty.mean.toExponential(3)}</div>
              </div>
              <div style={{ padding: '12px', border: '1px solid #eee', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px' }}>{t.p5}</div>
                <div style={{ fontWeight: 700 }}>{uncertainty.p5.toExponential(3)}</div>
              </div>
              <div style={{ padding: '12px', border: '1px solid #eee', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px' }}>{t.median}</div>
                <div style={{ fontWeight: 700 }}>{uncertainty.p50.toExponential(3)}</div>
              </div>
              <div style={{ padding: '12px', border: '1px solid #eee', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px' }}>{t.p95}</div>
                <div style={{ fontWeight: 700 }}>{uncertainty.p95.toExponential(3)}</div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '20px', border: '1px dashed #ddd', borderRadius: '8px', textAlign: 'center', color: '#999', fontSize: '13px' }}>
              {locale === 'ja' ? '不確かさ解析結果は利用できません。' : 'Uncertainty results not available.'}
            </div>
          )}
        </section>
      )}

      {options.showMCS && (
        <section style={{ pageBreakBefore: 'always' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', color: '#666', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between' }}>
            <span>{t.mcsTitle}</span>
            <span style={{ fontSize: '11px', fontWeight: 500, color: '#888' }}>
              {locale === 'ja' ? '合計: ' : 'Total: '}{result.cutSets.length.toLocaleString()}
              {result.rawCutSetCount !== undefined && ` (${locale === 'ja' ? '縮約前: ' : 'Raw: '}${result.rawCutSetCount.toLocaleString()})`}
            </span>
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #333' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left', width: '60px' }}>Rank</th>
                <th style={{ padding: '12px 8px', textAlign: 'left' }}>Minimal Cut Set (Logic Path)</th>
                <th style={{ padding: '12px 8px', textAlign: 'right', width: '120px' }}>Probability</th>
                <th style={{ padding: '12px 8px', textAlign: 'right', width: '100px' }}>Contribution</th>
              </tr>
            </thead>
            <tbody>
              {result.cutSets.slice(0, 50).map((cs, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px 8px', color: '#999' }}>#{i + 1}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {cs.events.map((eid, j) => {
                        const fm = getEventFailureMode(eid);
                        return (
                          <span key={j} style={{ padding: '2px 6px', background: '#f1f5f9', borderRadius: '3px', fontSize: '10px', border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontWeight: 600 }}>{getEventDisplayName(eid)}</span>
                            {fm && (
                              <span style={{ 
                                background: 'rgba(220, 38, 38, 0.08)', 
                                color: '#dc2626', 
                                padding: '0px 4px', 
                                borderRadius: '2px',
                                fontSize: '9px',
                                fontWeight: 500
                              }}>
                                {fm}
                              </span>
                            )}
                            <span style={{ marginLeft: '4px', opacity: 0.6, fontWeight: 400 }}>
                              ({getEventProb(eid).toExponential(1)})
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>{cs.probability.toExponential(3)}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: '#666' }}>{((cs.probability / result.topEventProbability) * 100).toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <footer style={{ marginTop: '60px', paddingTop: '20px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#999' }}>
        <div>Generated by Quantica Risk Analytical Intelligence System</div>
        <div style={{ fontWeight: 'bold', color: '#666' }}>CONFIDENTIAL • OFFICIAL REPORT</div>
        <div>Page 1 of 1</div>
      </footer>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        @media print {
          body * { visibility: hidden; }
          .print-content, .print-content * { visibility: visible; }
          .print-content { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
            padding: 0 !important;
            margin: 0 !important;
          }
          .analysis-report {
            border: none !important;
            padding: 0 !important;
          }
          button, .tabs, .app-header, .toolbox, .property-panel { display: none !important; }
          @page {
            margin: 2cm;
          }
        }
      `}</style>
    </div>
  );
}
