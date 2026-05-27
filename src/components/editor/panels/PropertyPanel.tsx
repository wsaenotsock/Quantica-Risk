'use client';

import React from 'react';
import type { BasicEvent, Gate, GateType } from '@/lib/types';
import { useModelStore } from '@/store/modelStore';

interface BasicEventIDInputProps {
  basicEvent: BasicEvent;
  basicEvents: BasicEvent[];
  updateBasicEvent: (event: BasicEvent) => void;
  updateBasicEventIdGlobal: (oldEventId: string, newEventId: string, syncWithEvent?: BasicEvent) => void;
  cloneAndUpdateBasicEventLocal: (
    faultTreeId: string,
    parentGateId: string,
    oldEvent: BasicEvent,
    newEventId: string,
    syncWithEvent?: BasicEvent
  ) => string;
  selectedFaultTreeId: string | null;
  selectedNodeRawId?: string | null;
  onNodeSelect?: (id: string | null, type: string | null, rawId?: string | null) => void;
  locale: 'ja' | 'en';
}

interface PendingSync {
  trimmedId: string;
  sameIdEvent: BasicEvent;
  renameMode: 'local' | 'global';
}

interface PendingRename {
  trimmedId: string;
  currentId: string;
}

function BasicEventIDInput({
  basicEvent,
  basicEvents,
  updateBasicEvent,
  updateBasicEventIdGlobal,
  cloneAndUpdateBasicEventLocal,
  selectedFaultTreeId,
  selectedNodeRawId,
  onNodeSelect,
  locale
}: BasicEventIDInputProps) {
  const [localEventId, setLocalEventId] = React.useState(basicEvent.eventId || '');
  const [pendingSync, setPendingSync] = React.useState<PendingSync | null>(null);
  const [pendingRename, setPendingRename] = React.useState<PendingRename | null>(null);

  React.useEffect(() => {
    setLocalEventId(basicEvent.eventId || '');
  }, [basicEvent.id, basicEvent.eventId]);

  const hasChanged = localEventId.trim() !== (basicEvent.eventId || '');

  const commitEventId = () => {
    const trimmedId = localEventId.trim();
    const currentId = basicEvent.eventId || '';
    
    if (trimmedId === currentId) return;

    // ストアから最新データを取得して重複チェック
    const storeBasicEvents = useModelStore.getState().model.basicEvents;

    // 1. 変更前のID（currentId）を持つ基本事象が複数存在するかチェック
    // 従来の storeBasicEvents.filter(...).length > 1 は、basicEvents 内の重複をチェックしていたが、
    // FTモデル全体で同じUUIDが複数箇所で参照（共有）されているかを確認する必要がある。
    let referenceCount = 0;
    const storeFaultTrees = useModelStore.getState().model.faultTrees;
    for (const ft of storeFaultTrees) {
      for (const gate of ft.gates) {
        for (const childId of gate.children) {
          if (childId === basicEvent.id) {
            referenceCount++;
          }
        }
      }
    }
    const isSharedId = referenceCount > 1;

    if (isSharedId) {
      // 変更元IDが共有されているので、グローバル/ローカルの確認モーダルを表示
      setPendingRename({ trimmedId, currentId });
    } else {
      // 共有されていなければ、ローカル（＝単一のイベント）の変更として処理
      proceedWithRename(trimmedId, 'local');
    }
  };

  const proceedWithRename = (trimmedId: string, mode: 'local' | 'global') => {
    const storeBasicEvents = useModelStore.getState().model.basicEvents;

    // 2. 新しいIDがすでに他の基本事象で使われているかチェック
    const sameIdEvent = trimmedId 
      ? storeBasicEvents.find(e => {
          if (mode === 'global') {
            // グローバル変更の場合は、今回の変更対象（元のID）以外の基本事象と重複しているか
            const currentId = basicEvent.eventId || '';
            if (e.eventId && e.eventId.trim().toLowerCase() === currentId.toLowerCase()) {
              return false;
            }
          } else {
            // ローカル変更の場合は、自分自身（UUID）以外と重複しているか
            if (e.id === basicEvent.id) return false;
          }
          const eEventId = e.eventId;
          if (eEventId && eEventId.trim() !== '' && eEventId.trim().toLowerCase() === trimmedId.toLowerCase()) {
            return true;
          }
          return false;
        })
      : null;

    if (sameIdEvent) {
      // 新IDが既存のものと重複する場合：既存データ反映モーダルを表示する準備
      setPendingSync({ 
        trimmedId, 
        sameIdEvent,
        renameMode: mode
      });
    } else {
      // 重複しない場合：即時適用
      if (mode === 'global') {
        const currentId = basicEvent.eventId || '';
        updateBasicEventIdGlobal(currentId, trimmedId);
      } else {
        // ローカル変更（自分のみ）
        if (selectedFaultTreeId && selectedNodeRawId && selectedNodeRawId.includes('::')) {
          const parentGateId = selectedNodeRawId.split('::')[0];
          const newUUID = cloneAndUpdateBasicEventLocal(
            selectedFaultTreeId,
            parentGateId,
            basicEvent,
            trimmedId
          );
          setLocalEventId(trimmedId);
          if (onNodeSelect) {
            onNodeSelect(newUUID, 'basicEvent', `${parentGateId}::${newUUID}`);
          }
        } else {
          updateBasicEvent({
            ...basicEvent,
            eventId: trimmedId,
            __force_sync_others__: false
          } as any);
          setLocalEventId(trimmedId);
        }
      }
    }
  };

  const handleConfirmSync = () => {
    if (!pendingSync) return;
    const { trimmedId, sameIdEvent, renameMode } = pendingSync;
    
    if (renameMode === 'global') {
      const currentId = basicEvent.eventId || '';
      updateBasicEventIdGlobal(currentId, trimmedId, sameIdEvent);
      setLocalEventId(trimmedId);
    } else {
      if (selectedFaultTreeId && selectedNodeRawId && selectedNodeRawId.includes('::')) {
        const parentGateId = selectedNodeRawId.split('::')[0];
        const newUUID = cloneAndUpdateBasicEventLocal(
          selectedFaultTreeId,
          parentGateId,
          basicEvent,
          trimmedId,
          sameIdEvent
        );
        setLocalEventId(trimmedId);
        if (onNodeSelect) {
          onNodeSelect(newUUID, 'basicEvent', `${parentGateId}::${newUUID}`);
        }
      } else {
        updateBasicEvent({
          ...basicEvent,
          eventId: trimmedId,
          name: sameIdEvent.name,
          tags: sameIdEvent.tags || [],
          failureType: sameIdEvent.failureType,
          failureRate: sameIdEvent.failureRate,
          repairTime: sameIdEvent.repairTime,
          probability: sameIdEvent.probability,
          missionTime: sameIdEvent.missionTime,
          demands: sameIdEvent.demands,
          distribution: JSON.parse(JSON.stringify(sameIdEvent.distribution)),
          parameterId: sameIdEvent.parameterId,
          source: sameIdEvent.source || '',
          memo: sameIdEvent.memo || '',
          seismicFragilityId: sameIdEvent.seismicFragilityId,
          __force_sync_others__: false
        } as any);
        setLocalEventId(trimmedId);
      }
    }
    setPendingSync(null);
  };

  const handleCancelSync = () => {
    if (!pendingSync) return;
    // 同一IDで異なるデータは不可のため、元のIDに戻す
    setLocalEventId(basicEvent.eventId || '');
    setPendingSync(null);
  };

  return (
    <>
      <div style={{ display: 'flex', gap: '8px', width: '100%', alignItems: 'center' }}>
        <input
          className="form-input form-input--mono"
          style={{ flex: 1, margin: 0 }}
          placeholder={locale === 'ja' ? '例: BE-01' : 'e.g. BE-01'}
          value={localEventId}
          onChange={(e) => setLocalEventId(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commitEventId();
            }
          }}
        />
        {hasChanged && (
          <button 
            className="btn btn--primary btn--sm"
            onClick={commitEventId}
            style={{ 
              padding: '6px 12px', 
              whiteSpace: 'nowrap',
              fontSize: '12px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {locale === 'ja' ? '適用' : 'Apply'}
          </button>
        )}
      </div>

      {/* ID変更モード選択モーダル（ローカル vs グローバル） */}
      {pendingRename && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(30, 35, 55, 0.98), rgba(20, 24, 40, 0.98))',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '16px',
            padding: '28px 32px',
            maxWidth: '480px',
            width: '90%',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(99, 102, 241, 0.1)',
            color: '#e2e8f0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ fontSize: '24px' }}>🔄</span>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                {locale === 'ja' ? '基事象IDの変更範囲の選択' : 'Select ID Change Scope'}
              </h3>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: '14px', lineHeight: '1.6', color: '#cbd5e1' }}>
              {locale === 'ja'
                ? `変更前の基事象ID "${pendingRename.currentId}" は、モデル内の複数の基事象で共有されています。`
                : `The event ID "${pendingRename.currentId}" is shared by multiple basic events in the model.`}
            </p>
            <p style={{ margin: '0 0 20px', fontSize: '14px', lineHeight: '1.6', color: '#cbd5e1' }}>
              {locale === 'ja'
                ? `IDの変更を、選択しているこの基事象のみに適用しますか（ローカル）、それとも同じIDを持つすべての基事象に適用しますか（グローバル）？`
                : `Do you want to apply the ID change to only this selected event (Local) or to all events sharing this ID (Global)?`}
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <button
                onClick={() => {
                  const trimmed = pendingRename.trimmedId;
                  setPendingRename(null);
                  proceedWithRename(trimmed, 'local');
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  background: 'rgba(99, 102, 241, 0.05)',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.2)';
                }}
              >
                <span style={{ fontWeight: 600, color: '#a5b4fc', fontSize: '14px' }}>
                  {locale === 'ja' ? '選択中の基事象のみ変更 (ローカル)' : 'Change only selected event (Local)'}
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                  {locale === 'ja' ? 'この基事象だけが新しいIDになります。他の基事象は元のIDのまま維持されます。' : 'Only this event gets the new ID. Others remain with the current ID.'}
                </span>
              </button>

              <button
                onClick={() => {
                  const trimmed = pendingRename.trimmedId;
                  setPendingRename(null);
                  proceedWithRename(trimmed, 'global');
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(168, 85, 247, 0.2)',
                  background: 'rgba(168, 85, 247, 0.05)',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(168, 85, 247, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(168, 85, 247, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.2)';
                }}
              >
                <span style={{ fontWeight: 600, color: '#c084fc', fontSize: '14px' }}>
                  {locale === 'ja' ? 'すべての同一IDの基事象を変更 (グローバル)' : 'Change all events sharing this ID (Global)'}
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                  {locale === 'ja' ? `モデル内のすべての同一ID "${pendingRename.currentId}" の基事象が一括で "${pendingRename.trimmedId}" に変更されます。` : `All events sharing the ID "${pendingRename.currentId}" will be renamed to "${pendingRename.trimmedId}".`}
                </span>
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setPendingRename(null)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  background: 'rgba(51, 65, 85, 0.5)',
                  color: '#94a3b8',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {locale === 'ja' ? 'キャンセル' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 同一ID確認モーダル */}
      {pendingSync && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(30, 35, 55, 0.98), rgba(20, 24, 40, 0.98))',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '16px',
            padding: '28px 32px',
            maxWidth: '480px',
            width: '90%',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(99, 102, 241, 0.1)',
            color: '#e2e8f0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ fontSize: '24px' }}>⚠️</span>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                {locale === 'ja' ? '既存データの反映確認' : 'Confirm Data Sync'}
              </h3>
            </div>
            <p style={{ margin: '0 0 8px', fontSize: '14px', lineHeight: '1.6', color: '#cbd5e1' }}>
              {locale === 'ja' 
                ? `基事象ID "${pendingSync.trimmedId}" は既に存在します。`
                : `Basic Event ID "${pendingSync.trimmedId}" already exists.`}
            </p>
            <p style={{ margin: '0 0 20px', fontSize: '14px', lineHeight: '1.6', color: '#cbd5e1' }}>
              {locale === 'ja'
                ? `既存の基事象「${pendingSync.sameIdEvent.name}」のデータ（故障率、ミッション時間、分布など）をこの基本事象に反映しますか？`
                : `Apply data from existing event "${pendingSync.sameIdEvent.name}" (failure rate, mission time, distribution, etc.) to this event?`}
            </p>
            <div style={{
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '20px',
              fontSize: '12px',
              color: '#a5b4fc',
            }}>
              {locale === 'ja' ? '📋 コピー元: ' : '📋 Source: '}
              <strong>{pendingSync.sameIdEvent.name}</strong>
              {pendingSync.sameIdEvent.failureRate !== undefined && (
                <span> | {locale === 'ja' ? '故障率' : 'λ'}: {pendingSync.sameIdEvent.failureRate}</span>
              )}
              {pendingSync.sameIdEvent.probability !== undefined && (
                <span> | {locale === 'ja' ? '確率' : 'P'}: {pendingSync.sameIdEvent.probability}</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCancelSync}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  background: 'rgba(51, 65, 85, 0.5)',
                  color: '#94a3b8',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {locale === 'ja' ? 'キャンセル' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmSync}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                  transition: 'all 0.2s',
                }}
              >
                {locale === 'ja' ? 'データを反映' : 'Apply Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


interface PropertyPanelProps {
  selectedNodeId: string | null;
  selectedNodeType: string | null;
  selectedFaultTreeId: string | null;
  selectedNodeRawId?: string | null;
  onNodeSelect?: (id: string | null, type: string | null, rawId?: string | null) => void;
  locale?: 'ja' | 'en';
}

export default function PropertyPanel({ 
  selectedNodeId, 
  selectedNodeType, 
  selectedFaultTreeId: propSelectedFaultTreeId,
  selectedNodeRawId,
  onNodeSelect,
  locale = 'ja' 
}: PropertyPanelProps) {
  const model = useModelStore((s) => s.model);
  const updateBasicEvent = useModelStore((s) => s.updateBasicEvent);
  const updateBasicEventIdGlobal = useModelStore((s) => s.updateBasicEventIdGlobal);
  const cloneAndUpdateBasicEventLocal = useModelStore((s) => s.cloneAndUpdateBasicEventLocal);
  const updateGate = useModelStore((s) => s.updateGate);
  const convertToSubtree = useModelStore((s) => s.convertToSubtree);
  const selectFaultTree = useModelStore((s) => s.selectFaultTree);
  const storeSelectedFaultTreeId = useModelStore((s) => s.selectedFaultTreeId);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [lastConversion, setLastConversion] = React.useState<{ from: string, to: string } | null>(null);
  
  // Robust ID resolution: prop > store > inverse lookup from gate
  let selectedFaultTreeId = propSelectedFaultTreeId || storeSelectedFaultTreeId;
  if (!selectedFaultTreeId && selectedNodeId) {
    const parentFT = model.faultTrees.find(ft => ft.gates.some(g => g.id === selectedNodeId));
    if (parentFT) selectedFaultTreeId = parentFT.id;
  }

  if (!selectedNodeId || !selectedNodeType) {
    return (
      <div className="property-panel">
        <div className="empty-state" style={{ height: '100%' }}>
          <div className="empty-state__icon">📋</div>
          <div className="empty-state__title">
            {locale === 'ja' ? 'プロパティ' : 'Properties'}
          </div>
          <div className="empty-state__description">
            {locale === 'ja' ? 'ノードを選択して編集' : 'Select a node to edit'}
          </div>
        </div>
      </div>
    );
  }

  // Find the event or gate
  const basicEvent = model.basicEvents.find((e) => e.id === selectedNodeId);
  const gate = selectedFaultTreeId
    ? model.faultTrees.find((ft) => ft.id === selectedFaultTreeId)?.gates.find((g) => g.id === selectedNodeId)
    : null;

  if (basicEvent) {
    return (
      <div className="property-panel animate-slideIn">
        <div className="property-panel__header">
          <span className="property-panel__title">
            {locale === 'ja' ? '基事象 プロパティ' : 'Basic Event Properties'}
          </span>
          <span className="badge badge--success">BE</span>
        </div>

        <div className="property-panel__section">
          <div className="property-panel__section-title">
            {locale === 'ja' ? '基本情報' : 'Basic Info'}
          </div>
          <div className="form-group">
            <label className="form-label">{locale === 'ja' ? '基事象ID' : 'Basic Event ID'}</label>
            <BasicEventIDInput
              basicEvent={basicEvent}
              basicEvents={model.basicEvents}
              updateBasicEvent={updateBasicEvent}
              updateBasicEventIdGlobal={updateBasicEventIdGlobal}
              cloneAndUpdateBasicEventLocal={cloneAndUpdateBasicEventLocal}
              selectedFaultTreeId={selectedFaultTreeId}
              selectedNodeRawId={selectedNodeRawId}
              onNodeSelect={onNodeSelect}
              locale={locale}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{locale === 'ja' ? '名前' : 'Name'}</label>
            <input
              className="form-input"
              value={basicEvent.name}
              onChange={(e) => updateBasicEvent({ ...basicEvent, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{locale === 'ja' ? 'タグ' : 'Tags'}</label>
            <input
              className="form-input"
              value={basicEvent.tags.join(', ')}
              onChange={(e) => updateBasicEvent({ ...basicEvent, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
              placeholder={locale === 'ja' ? 'カンマ区切り' : 'Comma separated'}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{locale === 'ja' ? '故障モード' : 'Failure Mode'}</label>
             <input
              className="form-input"
              value={basicEvent.failureMode || ''}
              onChange={(e) => updateBasicEvent({ ...basicEvent, failureMode: e.target.value })}
              placeholder={
                basicEvent.parameterId
                  ? (model.parameters?.find(p => p.id === basicEvent.parameterId)?.name || '')
                  : (locale === 'ja' ? '例: 開失敗、動作固着' : 'e.g. Fail to open')
              }
            />
          </div>
        </div>

        {basicEvent.eventType === 'houseEvent' && (
          <div className="property-panel__section animate-slideIn">
            <div className="property-panel__section-title">
              {locale === 'ja' ? '論理スイッチ設定' : 'Logic Switch Settings'}
            </div>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="form-label">{locale === 'ja' ? 'ハウス事象状態 (True/False)' : 'House Event State'}</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className={`btn ${basicEvent.probability === 1 ? 'btn--primary' : 'btn--secondary'}`}
                  style={{ flex: 1 }}
                  onClick={() => updateBasicEvent({ ...basicEvent, probability: 1, failureRate: 1, failureType: 'demand', demands: 1, distribution: { type: 'point' } })}
                >
                  {locale === 'ja' ? 'ON (True: P=1)' : 'ON (True: P=1)'}
                </button>
                <button
                  type="button"
                  className={`btn ${basicEvent.probability === 0 ? 'btn--danger' : 'btn--secondary'}`}
                  style={{ flex: 1 }}
                  onClick={() => updateBasicEvent({ ...basicEvent, probability: 0, failureRate: 0, failureType: 'demand', demands: 1, distribution: { type: 'point' } })}
                >
                  {locale === 'ja' ? 'OFF (False: P=0)' : 'OFF (False: P=0)'}
                </button>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px', lineHeight: '1.4' }}>
                {locale === 'ja' 
                  ? 'ハウス事象は発生確率が1.0(必ず発生)または0.0(絶対発生しない)に固定された論理スイッチとして機能します。ランダムな故障分布は持ちません。' 
                  : 'House events act as logic switches fixed at probability 1.0 (True) or 0.0 (False). They do not have random failure distributions.'}
              </p>
            </div>
          </div>
        )}

        {basicEvent.eventType !== 'transferGate' && basicEvent.eventType !== 'houseEvent' && (
          <>
            <div className="property-panel__section">
              <div className="property-panel__section-title">
                {locale === 'ja' ? '故障データ' : 'Failure Data'}
              </div>
              <div className="form-group">
                <label className="form-label">{locale === 'ja' ? '参照パラメータ' : 'Reference Parameter'}</label>
                <select
                  className="form-select"
                  value={basicEvent.parameterId || ''}
                  onChange={(e) => {
                    const pid = e.target.value;
                    if (!pid) {
                      updateBasicEvent({ ...basicEvent, parameterId: undefined });
                    } else {
                      const param = (model.parameters || []).find(p => p.id === pid);
                      if (param) {
                        updateBasicEvent({
                          ...basicEvent,
                          parameterId: pid,
                          failureType: param.failureType,
                          failureRate: param.value,
                          probability: param.failureType === 'demand'
                            ? param.value * (basicEvent.demands ?? 1)
                            : param.value * (basicEvent.missionTime ?? 24)
                        });
                      }
                    }
                  }}
                >
                  <option value="">{locale === 'ja' ? 'なし (個別設定)' : 'None (Custom)'}</option>
                  {(model.parameters || []).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{locale === 'ja' ? '故障率タイプ' : 'Failure Type'}</label>
                <select
                  className="form-select"
                  value={basicEvent.failureType || 'time'}
                  disabled={!!basicEvent.parameterId}
                  onChange={(e) => {
                    const newType = e.target.value as 'time' | 'demand';
                    updateBasicEvent({
                      ...basicEvent,
                      failureType: newType,
                      probability: newType === 'demand'
                        ? basicEvent.failureRate * (basicEvent.demands ?? 1)
                        : basicEvent.failureRate * (basicEvent.missionTime ?? 24)
                    });
                  }}
                >
                  <option value="time">{locale === 'ja' ? '時間故障率' : 'Time-based'}</option>
                  <option value="demand">{locale === 'ja' ? 'デマンド故障率' : 'Demand-based'}</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">
                  {basicEvent.failureType === 'demand'
                    ? (locale === 'ja' ? 'デマンド故障率 [/demand]' : 'Failure Rate [/demand]')
                    : (locale === 'ja' ? '時間故障率 [/hr]' : 'Failure Rate [/hr]')}
                </label>
                <input
                  className="form-input form-input--mono"
                  type="number"
                  step="0.000001"
                  disabled={!!basicEvent.parameterId}
                  value={basicEvent.failureRate}
                  onChange={(e) => {
                    const newRate = parseFloat(e.target.value) || 0;
                    updateBasicEvent({
                      ...basicEvent,
                      failureRate: newRate,
                      probability: basicEvent.failureType === 'demand'
                        ? newRate * (basicEvent.demands ?? 1)
                        : newRate * (basicEvent.missionTime ?? 24)
                    });
                  }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{locale === 'ja' ? '確率 (自動計算)' : 'Probability (Auto)'}</label>
                <input
                  className="form-input form-input--mono"
                  style={{ opacity: 0.7, backgroundColor: 'var(--bg-secondary)' }}
                  type="number"
                  readOnly
                  value={basicEvent.probability ?? ''}
                />
              </div>
              {basicEvent.failureType !== 'demand' && (
                <div className="form-group">
                  <label className="form-label">{locale === 'ja' ? '復旧時間 [hr]' : 'Repair Time [hr]'}</label>
                  <input
                    className="form-input form-input--mono"
                    type="number"
                    step="any"
                    value={basicEvent.repairTime ?? ''}
                    onChange={(e) => updateBasicEvent({ ...basicEvent, repairTime: parseFloat(e.target.value) || undefined })}
                  />
                </div>
              )}
              {basicEvent.failureType === 'demand' ? (
                <div className="form-group">
                  <label className="form-label">{locale === 'ja' ? 'デマンド数' : 'Demands'}</label>
                  <input
                    className="form-input form-input--mono"
                    type="number"
                    min="1"
                    step="1"
                    value={basicEvent.demands ?? 1}
                    onChange={(e) => {
                      const newDemands = parseInt(e.target.value) || 1;
                      updateBasicEvent({
                        ...basicEvent,
                        demands: newDemands,
                        probability: basicEvent.failureRate * newDemands
                      });
                    }}
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">{locale === 'ja' ? 'ミッション時間 [hr]' : 'Mission Time [hr]'}</label>
                  <input
                    className="form-input form-input--mono"
                    type="number"
                    step="any"
                    value={basicEvent.missionTime ?? ''}
                    onChange={(e) => {
                      const newTime = parseFloat(e.target.value) || undefined;
                      updateBasicEvent({
                        ...basicEvent,
                        missionTime: newTime,
                        probability: basicEvent.failureRate * (newTime ?? 24)
                      });
                    }}
                  />
                </div>
              )}
            </div>

            <div className="property-panel__section">
              <div className="property-panel__section-title">
                {locale === 'ja' ? '分布形状' : 'Distribution'}
              </div>
              <div className="form-group">
                <label className="form-label">{locale === 'ja' ? 'タイプ' : 'Type'}</label>
                <select
                  className="form-select"
                  value={basicEvent.distribution.type}
                  onChange={(e) => updateBasicEvent({
                    ...basicEvent,
                    distribution: { ...basicEvent.distribution, type: e.target.value as any }
                  })}
                >
                  <option value="point">Point</option>
                  <option value="lognormal">Lognormal</option>
                  <option value="normal">Normal</option>
                  <option value="uniform">Uniform</option>
                  <option value="beta">Beta</option>
                  <option value="gamma">Gamma</option>
                  <option value="weibull">Weibull</option>
                </select>
              </div>

              <div style={{ padding: 'var(--space-sm)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                {basicEvent.distribution.type === 'lognormal' && (
                  <div className="form-group">
                    <label className="form-label">Error Factor</label>
                    <input
                      className="form-input form-input--mono"
                      type="number"
                      step="any"
                      value={basicEvent.distribution.errorFactor ?? 3}
                      onChange={(e) => updateBasicEvent({
                        ...basicEvent,
                        distribution: { ...basicEvent.distribution, errorFactor: parseFloat(e.target.value) || 0 }
                      })}
                    />
                  </div>
                )}
                {basicEvent.distribution.type === 'normal' && (
                  <div className="form-group">
                    <label className="form-label">Std Deviation</label>
                    <input
                      className="form-input form-input--mono"
                      type="number"
                      step="any"
                      value={basicEvent.distribution.stdDev ?? 0}
                      onChange={(e) => updateBasicEvent({
                        ...basicEvent,
                        distribution: { ...basicEvent.distribution, stdDev: parseFloat(e.target.value) || 0 }
                      })}
                    />
                  </div>
                )}
                {basicEvent.distribution.type === 'uniform' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div className="form-group">
                      <label className="form-label">Min</label>
                      <input
                        className="form-input form-input--mono"
                        type="number"
                        step="any"
                        value={basicEvent.distribution.lower ?? 0}
                        onChange={(e) => updateBasicEvent({
                          ...basicEvent,
                          distribution: { ...basicEvent.distribution, lower: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Max</label>
                      <input
                        className="form-input form-input--mono"
                        type="number"
                        step="any"
                        value={basicEvent.distribution.upper ?? 0}
                        onChange={(e) => updateBasicEvent({
                          ...basicEvent,
                          distribution: { ...basicEvent.distribution, upper: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                  </div>
                )}
                {(basicEvent.distribution.type === 'gamma' || basicEvent.distribution.type === 'weibull') && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div className="form-group">
                      <label className="form-label">Shape (k)</label>
                      <input
                        className="form-input form-input--mono"
                        type="number"
                        step="any"
                        value={basicEvent.distribution.shape ?? 1.5}
                        onChange={(e) => updateBasicEvent({
                          ...basicEvent,
                          distribution: { ...basicEvent.distribution, shape: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Scale (θ/λ)</label>
                      <input
                        className="form-input form-input--mono"
                        type="number"
                        step="any"
                        value={basicEvent.distribution.scale ?? 0}
                        onChange={(e) => updateBasicEvent({
                          ...basicEvent,
                          distribution: { ...basicEvent.distribution, scale: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                  </div>
                )}
                {basicEvent.distribution.type === 'beta' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div className="form-group">
                      <label className="form-label">Alpha (α)</label>
                      <input
                        className="form-input form-input--mono"
                        type="number"
                        step="any"
                        value={basicEvent.distribution.alpha ?? 2}
                        onChange={(e) => updateBasicEvent({
                          ...basicEvent,
                          distribution: { ...basicEvent.distribution, alpha: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Beta (β)</label>
                      <input
                        className="form-input form-input--mono"
                        type="number"
                        step="any"
                        value={basicEvent.distribution.beta ?? 10}
                        onChange={(e) => updateBasicEvent({
                          ...basicEvent,
                          distribution: { ...basicEvent.distribution, beta: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                  </div>
                )}
                {basicEvent.distribution.type === 'point' && (
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center', padding: 'var(--space-xs)' }}>
                    {locale === 'ja' ? '不確かさなし (固定値)' : 'No uncertainty (Fixed value)'}
                  </div>
                )}
              </div>
            </div>

            <div className="property-panel__section">
              <div className="property-panel__section-title">
                {locale === 'ja' ? '地震設定' : 'Seismic Settings'}
              </div>
              <div className="form-group">
                <label className="form-label">{locale === 'ja' ? 'フラジリティ曲線' : 'Fragility Curve'}</label>
                <select
                  className="form-select"
                  value={basicEvent.seismicFragilityId || ''}
                  onChange={(e) => updateBasicEvent({ ...basicEvent, seismicFragilityId: e.target.value || undefined })}
                >
                  <option value="">-- {locale === 'ja' ? '未割当' : 'Not Assigned'} --</option>
                  {(model.seismicFragilities || []).map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}

        {basicEvent.eventType === 'transferGate' && (
          <div className="property-panel__section animate-slideIn">
            <div className="property-panel__section-title">
              {locale === 'ja' ? 'トランスファ設定' : 'Transfer Settings'}
            </div>
            <div className="form-group">
              <label className="form-label">{locale === 'ja' ? 'リンク先FT' : 'Linked Fault Tree'}</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  className="form-select"
                  style={{ flex: 1 }}
                  value={basicEvent.linkedFaultTreeId || ''}
                  onChange={(e) => updateBasicEvent({ ...basicEvent, linkedFaultTreeId: e.target.value })}
                >
                  <option value="">-- {locale === 'ja' ? '未選択' : 'Select Tree'} --</option>
                  {model.faultTrees.filter(f => f.id !== selectedFaultTreeId).map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                {basicEvent.linkedFaultTreeId && (
                  <button 
                    className="btn btn--secondary btn--sm"
                    onClick={() => selectFaultTree(basicEvent.linkedFaultTreeId || null)}
                  >
                    GO
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="property-panel__section">
          <div className="property-panel__section-title">
            {locale === 'ja' ? 'データソース' : 'Source'}
          </div>
          <div className="form-group">
            <label className="form-label">Source</label>
            <input
              className="form-input"
              value={basicEvent.source}
              onChange={(e) => updateBasicEvent({ ...basicEvent, source: e.target.value })}
              placeholder="e.g., NUREG/CR-6928"
            />
          </div>
          <div className="form-group">
            <label className="form-label">{locale === 'ja' ? 'メモ' : 'Memo'}</label>
            <textarea
              className="form-textarea"
              value={basicEvent.memo}
              onChange={(e) => updateBasicEvent({ ...basicEvent, memo: e.target.value })}
            />
          </div>
        </div>
      </div>
    );
  }

  if (gate) {
    return (
      <div className="property-panel animate-slideIn">
        <div className="property-panel__header">
          <span className="property-panel__title">
            {locale === 'ja' ? 'ゲート プロパティ' : 'Gate Properties'}
          </span>
          <span className="badge badge--info">{gate.type}</span>
        </div>

        <div className="property-panel__section">
          <div className="form-group">
            <label className="form-label">{locale === 'ja' ? '名前' : 'Name'}</label>
            <input
              className="form-input"
              value={gate.name}
              onChange={(e) => {
                if (selectedFaultTreeId) {
                  updateGate(selectedFaultTreeId, { ...gate, name: e.target.value });
                }
              }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{locale === 'ja' ? 'ゲートタイプ' : 'Gate Type'}</label>
            <select
              className="form-select"
              value={gate.type}
              onChange={(e) => {
                if (selectedFaultTreeId) {
                  updateGate(selectedFaultTreeId, { ...gate, type: e.target.value as GateType });
                }
              }}
            >
              <option value="AND">AND</option>
              <option value="OR">OR</option>
              <option value="ATLEAST">ATLEAST (K/N)</option>
              <option value="NOT">NOT</option>
              <option value="XOR">XOR</option>
              <option value="VOTE">VOTE</option>
              <option value="TRANSFER">TRANSFER</option>
            </select>
          </div>

          {gate.type === 'TRANSFER' && (
            <div className="form-group animate-fadeIn">
              <label className="form-label">{locale === 'ja' ? 'リンク先FT' : 'Linked Fault Tree'}</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  className="form-select"
                  style={{ flex: 1 }}
                  value={gate.linkedFaultTreeId || ''}
                  onChange={(e) => {
                    if (selectedFaultTreeId) {
                      updateGate(selectedFaultTreeId, { ...gate, linkedFaultTreeId: e.target.value });
                    }
                  }}
                >
                  <option value="">-- {locale === 'ja' ? '未選択' : 'Select Tree'} --</option>
                  {model.faultTrees.filter(f => f.id !== selectedFaultTreeId).map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                {gate.linkedFaultTreeId && (
                  <button 
                    className="btn btn--secondary btn--sm"
                    onClick={() => selectFaultTree(gate.linkedFaultTreeId || null)}
                  >
                    GO
                  </button>
                )}
              </div>
            </div>
          )}
          {(gate.type === 'ATLEAST' || gate.type === 'VOTE') && (
            <div className="form-group">
              <label className="form-label">K value</label>
              <input
                className="form-input form-input--mono"
                type="number"
                min="1"
                value={gate.k ?? 1}
                onChange={(e) => {
                  if (selectedFaultTreeId) {
                    updateGate(selectedFaultTreeId, { ...gate, k: parseInt(e.target.value) || 1 });
                  }
                }}
              />
            </div>
          )}
        </div>

        <div className="property-panel__section">
          <div className="property-panel__section-title">
            {locale === 'ja' ? '系統別管理' : 'Componentization'}
          </div>
          {gate.type !== 'TRANSFER' ? (
            <>
              <button
                type="button"
                className="btn btn--outline btn--sm w-full"
                style={{ 
                  marginTop: '8px', 
                  justifyContent: 'center',
                  backgroundColor: isProcessing ? 'var(--bg-secondary)' : undefined,
                  color: isProcessing ? 'var(--text-tertiary)' : undefined,
                  opacity: isProcessing ? 0.7 : 1,
                  cursor: isProcessing ? 'wait' : 'pointer'
                }}
                disabled={isProcessing}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                if (!selectedFaultTreeId) return;

                setIsProcessing(true);
                const originalTreeId = selectedFaultTreeId;
                
                try {
                  convertToSubtree(selectedFaultTreeId, gate.id);
                  setLastConversion({ from: originalTreeId, to: 'new' });
                  setTimeout(() => setIsProcessing(false), 800);
                } catch (err) {
                  console.error('Conversion error:', err);
                  setIsProcessing(false);
                }
                }}
              >
                {isProcessing ? (locale === 'ja' ? '処理中...' : 'Processing...') : (locale === 'ja' ? 'サブツリーとして分離' : 'Convert to Sub-tree')}
              </button>
              {lastConversion && (
                <div style={{ 
                  marginTop: '12px', 
                  padding: '8px', 
                  background: 'var(--accent-blue)15', 
                  border: '1px solid var(--accent-blue)30',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11px',
                  color: 'var(--accent-blue)'
                }}>
                  <div>✅ {locale === 'ja' ? '新しい系統ツリーへ移動しました' : 'Moved to new sub-tree'}</div>
                  <button 
                    className="btn btn--link btn--sm" 
                    style={{ marginTop: '4px', padding: 0, fontSize: '11px' }}
                    onClick={() => {
                      selectFaultTree(lastConversion.from);
                      setLastConversion(null);
                    }}
                  >
                    {locale === 'ja' ? '元のツリーに戻る' : 'Go back to original tree'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '4px 0' }}>
              {locale === 'ja' ? 'このゲートは他系統へリンクされています' : 'This gate links to another system'}
            </div>
          )}
        </div>

        <div className="property-panel__section">
          <div className="property-panel__section-title">
            {locale === 'ja' ? '子ノード' : 'Children'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {gate.children.length} {locale === 'ja' ? '個の入力' : 'inputs'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="property-panel">
      <div className="empty-state" style={{ height: '100%' }}>
        <div className="empty-state__icon">📋</div>
        <div className="empty-state__title">
          {locale === 'ja' ? '未対応のノードタイプ' : 'Unsupported node type'}
        </div>
      </div>
    </div>
  );
}
