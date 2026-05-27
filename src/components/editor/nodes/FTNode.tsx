'use client';

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { FTNodeData, FTNodeType, GateType } from '@/lib/types';

// ===== AND Gate SVG Symbol =====
function ANDGateSymbol() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <path
        d="M 8 39 L 8 23 A 16 16 0 0 1 40 23 L 40 39 Z"
        fill="rgba(59, 130, 246, 0.12)"
        stroke="#3B82F6"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <text x="24" y="31" textAnchor="middle" fill="#3B82F6" fontSize="10.5" fontWeight="700" fontFamily="Inter, sans-serif">AND</text>
    </svg>
  );
}

// ===== OR Gate SVG Symbol =====
function ORGateSymbol() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <path
        d="M6 39C6 39 10 27 24 8C38 27 42 39 42 39C42 39 33 33 24 33C15 33 6 39 6 39Z"
        fill="rgba(168, 85, 247, 0.12)"
        stroke="#A855F7"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <text x="24" y="31" textAnchor="middle" fill="#A855F7" fontSize="10.5" fontWeight="700" fontFamily="Inter, sans-serif">OR</text>
    </svg>
  );
}

// ===== K-of-N Gate SVG Symbol =====
function AtleastGateSymbol({ k }: { k?: number }) {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <path
        d="M 8 39 L 8 23 A 16 16 0 0 1 40 23 L 40 39 Z"
        fill="rgba(6, 182, 212, 0.12)"
        stroke="#06B6D4"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <text x="24" y="31" textAnchor="middle" fill="#06B6D4" fontSize="10" fontWeight="700" fontFamily="Inter, sans-serif">{k ?? '?'}/N</text>
    </svg>
  );
}

// ===== Basic Event Symbol (Circle) =====
function BasicEventSymbol({ failureType, hasParameter }: { failureType?: 'time' | 'demand'; hasParameter?: boolean }) {
  let color = '#94A3B8'; // Fallback / Custom (No Parameter)
  let bgColor = 'rgba(148, 163, 184, 0.12)';

  if (hasParameter) {
    if (failureType === 'demand') {
      color = '#F97316'; // Amber Orange for Demand-based
      bgColor = 'rgba(249, 115, 22, 0.12)';
    } else {
      color = '#00D68F'; // Emerald Green for Time-based
      bgColor = 'rgba(0, 214, 143, 0.12)';
    }
  }

  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="15" fill={bgColor} stroke={color} strokeWidth="2.5" />
    </svg>
  );
}

// ===== House Event Symbol =====
function HouseEventSymbol() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <path
        d="M24 10L38 23V38H10V23L24 10Z"
        fill="rgba(255, 176, 32, 0.12)"
        stroke="#FFB020"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ===== Transfer Gate Symbol (Triangle) =====
function TransferGateSymbol() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <path
        d="M24 10L39 38H9L24 10Z"
        fill="rgba(6, 182, 212, 0.12)"
        stroke="#06B6D4"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ===== Undeveloped Event Symbol (Diamond) =====
function UndevelopedSymbol() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <path
        d="M24 9L39 24L24 39L9 24L24 9Z"
        fill="rgba(255, 71, 87, 0.12)"
        stroke="#FF4757"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}


// ===== Gate Symbol Lookup =====
function GateSymbol({ nodeType, gateType, k, failureType, hasParameter }: { nodeType: string; gateType?: string; k?: number; failureType?: 'time' | 'demand'; hasParameter?: boolean }) {
  let resolvedType = nodeType;
  if (nodeType === 'topEvent') {
    if (gateType === 'AND') resolvedType = 'andGate';
    else if (gateType === 'OR') resolvedType = 'orGate';
    else if (gateType === 'ATLEAST') resolvedType = 'atleastGate';
  }

  switch (resolvedType) {
    case 'andGate': return <ANDGateSymbol />;
    case 'orGate': return <ORGateSymbol />;
    case 'atleastGate': return <AtleastGateSymbol k={k} />;
    case 'basicEvent': return <BasicEventSymbol failureType={failureType} hasParameter={hasParameter} />;
    case 'houseEvent': return <HouseEventSymbol />;
    case 'transferGate': return <TransferGateSymbol />;
    case 'undeveloped': return <UndevelopedSymbol />;
    case 'topEvent': return <ANDGateSymbol />; // fallback
    default: return <BasicEventSymbol failureType={failureType} hasParameter={hasParameter} />;
  }
}

// ===== Unified FT Node Component =====
const FTNode = memo((props: any) => {
  const { data, selected } = props;
  const label = String(data.label || '');
  const nodeType = String(data.nodeType || '') as FTNodeType;
  const probability = data.probability;
  const k = data.k;
  const collapsed = !!data.collapsed;
  const isGate = ['andGate', 'orGate', 'atleastGate', 'topEvent'].includes(nodeType);
  const isDropTarget = !!data.isDropTarget;

  const [flagHovered, setFlagHovered] = React.useState(false);
  const [recHovered, setRecHovered] = React.useState(false);
  const [ccfHovered, setCcfHovered] = React.useState(false);

  return (
    <div
      className={`ft-node ${selected ? 'selected' : ''} ${isDropTarget ? 'ft-node--drop-target' : ''}`}
    >
      {nodeType === 'topEvent' && (
        <div style={{
          position: 'absolute',
          top: -18,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          color: 'var(--text-tertiary)',
          fontSize: '9px',
          padding: '2px 8px',
          borderRadius: '12px',
          fontWeight: '600',
          zIndex: 10,
          whiteSpace: 'nowrap'
        }}>
          TOP
        </div>
      )}
      {/* Input Handle (from parent gate) */}
      {nodeType !== 'topEvent' && (
        <Handle
          type="target"
          position={Position.Top}
          style={{
            background: 'var(--accent-green)',
            width: 8,
            height: 8,
            top: -4,
            border: 'none',
          }}
        />
      )}

      <div className="ft-node__gate-symbol">
        <GateSymbol
          nodeType={nodeType}
          gateType={data.gateType as string}
          k={k}
          failureType={data.failureType as 'time' | 'demand'}
          hasParameter={!!data.parameterId}
        />
      </div>

      {data.eventId && (
        <div style={{
          fontSize: '10px',
          color: 'var(--text-tertiary)',
          fontWeight: '600',
          marginTop: '4px',
          marginBottom: '-2px',
          textAlign: 'center',
          fontFamily: 'monospace'
        }}>
          [{data.eventId}]
        </div>
      )}

      <div className="ft-node__label">{String(label)}</div>

      {collapsed && (
        <div style={{
          position: 'absolute',
          bottom: -8,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--accent-amber)',
          color: '#fff',
          fontSize: '12px',
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          zIndex: 20,
          border: '2px solid var(--bg-elevated)'
        }}>
          +
        </div>
      )}

      {/* 参照パラメータ名の表示 */}
      {(data.parameterName || data.parameterId) && (
        <div style={{
          fontSize: '9px',
          color: 'var(--accent-blue)',
          fontWeight: '700',
          marginTop: '2px',
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
          textAlign: 'center',
          maxWidth: '180px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }} title={data.parameterName || data.parameterId}>
          🔗 {data.parameterName || data.parameterId}
        </div>
      )}

      {probability !== undefined && (
        <div className="ft-node__probability" style={{ marginTop: (data.parameterName || data.parameterId) ? '1px' : '4px' }}>
          {Number(probability).toExponential(2)}
        </div>
      )}

      {/* CCF設定済みバッジの表示 */}
      {!!data.isCCF && (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('app-navigate', {
              detail: { viewMode: 'data', tab: 'ccf', targetId: props.id }
            }));
          }}
          onMouseEnter={() => setCcfHovered(true)}
          onMouseLeave={() => setCcfHovered(false)}
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            background: 'var(--accent-red)',
            color: '#fff',
            fontSize: '8px',
            fontWeight: 'bold',
            padding: '2px 5px',
            borderRadius: '4px',
            boxShadow: ccfHovered ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
            zIndex: 10,
            letterSpacing: '0.5px',
            cursor: 'pointer',
            transform: ccfHovered ? 'scale(1.15)' : 'scale(1)',
            transition: 'all 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            filter: ccfHovered ? 'brightness(1.1)' : 'none'
          }}
          title={data.locale === 'en' ? 'Click to navigate to CCF Group' : 'クリックでCCFデータベースへ移動'}
        >
          CCF
        </div>
      )}

      {/* Indicator Container (Top-Left Stacking) */}
      <div style={{
        position: 'absolute',
        top: -10,
        left: -10,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        zIndex: 30,
        alignItems: 'flex-start'
      }}>
        {/* Flag Badge */}
        {!!data.isFlagged && (
          <div 
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent('app-navigate', {
                detail: { viewMode: 'data', tab: 'flags', targetId: data.eventId || props.id }
              }));
            }}
            onMouseEnter={() => setFlagHovered(true)}
            onMouseLeave={() => setFlagHovered(false)}
            style={{
              background: data.flagState ? 'var(--accent-red)' : 'var(--accent-green)',
              color: '#fff',
              fontSize: '9px',
              fontWeight: 'bold',
              padding: '2px 6px',
              borderRadius: '10px',
              boxShadow: flagHovered ? 'var(--shadow-lg)' : 'var(--shadow-md)',
              opacity: data.isFlagGroupActive ? 1 : 0.4,
              zIndex: 30,
              border: '2px solid var(--bg-elevated)',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              transform: flagHovered ? 'scale(1.15)' : 'scale(1)',
              transition: 'all 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              filter: (data.isFlagGroupActive ? 'none' : 'grayscale(1) ') + (flagHovered ? 'brightness(1.1)' : '')
            }}
            title={data.locale === 'en' ? 'Click to navigate to Flag settings' : 'クリックでフラグ設定へ移動'}
          >
            {data.flagState ? '🏳️ TRUE' : '🚩 FALSE'}
          </div>
        )}

        {/* Recovery Badge */}
        {!!data.isRecovery && (
          <div 
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent('app-navigate', {
                detail: { viewMode: 'data', tab: 'recovery', targetId: props.id }
              }));
            }}
            onMouseEnter={() => setRecHovered(true)}
            onMouseLeave={() => setRecHovered(false)}
            style={{
              background: 'var(--accent-blue)',
              color: '#fff',
              fontSize: '9px',
              fontWeight: 'bold',
              padding: '2px 6px',
              borderRadius: '10px',
              boxShadow: recHovered ? 'var(--shadow-lg)' : 'var(--shadow-md)',
              opacity: data.isRecoveryGroupActive ? 1 : 0.4,
              zIndex: 30,
              border: '2px solid var(--bg-elevated)',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              transform: recHovered ? 'scale(1.15)' : 'scale(1)',
              transition: 'all 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              filter: (data.isRecoveryGroupActive ? 'none' : 'grayscale(1) ') + (recHovered ? 'brightness(1.1)' : '')
            }}
            title={data.locale === 'en' ? 'Click to navigate to Recovery rules' : 'クリックでリカバリルールへ移動'}
          >
            🩹 REC
          </div>
        )}
      </div>

      {/* Output Handle (to children) */}
      {isGate && (
        <Handle
          type="source"
          position={Position.Bottom}
          style={{
            background: 'var(--accent-green)',
            width: 8,
            height: 8,
            bottom: -4,
            border: 'none',
          }}
        />
      )}

      {/* Transfer gates also have output handle */}
      {nodeType === 'transferGate' && (
        <Handle
          type="source"
          position={Position.Bottom}
          style={{
            background: 'var(--accent-cyan)',
            width: 8,
            height: 8,
            bottom: -4,
            border: 'none',
          }}
        />
      )}
    </div>
  );
});

export default FTNode;

// Export all node types for React Flow registration
export const ftNodeTypes = {
  andGate: FTNode,
  orGate: FTNode,
  atleastGate: FTNode,
  basicEvent: FTNode,
  houseEvent: FTNode,
  transferGate: FTNode,
  undeveloped: FTNode,
  topEvent: FTNode,
};
