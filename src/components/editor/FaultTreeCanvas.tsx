'use client';

import React, { useCallback, useRef, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type Node,
  type EdgeChange,
  type NodeChange,
  type OnEdgesChange,
  type OnNodesChange,
  BackgroundVariant,
  type ReactFlowInstance,
  Panel,
  type OnConnect,
  useViewport,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toSvg } from 'html-to-image';
import { v4 as uuidv4 } from 'uuid';
import { ftNodeTypes } from '@/components/editor/nodes/FTNode';
import { useModelStore } from '@/store/modelStore';
import { useResultsStore, runWorkerCommand } from '@/store/resultsStore';
import type { FTNodeData, FTNodeType, BasicEvent, GateType } from '@/lib/types';

interface FaultTreeCanvasProps {
  onNodeSelect: (nodeId: string | null, nodeType: string | null) => void;
  onNodeDeleteRequest: (nodeId: string, nodeType: string) => void;
  onEdgeDeleteRequest: (edges: Edge[]) => void;
  onQuantifySuccess?: () => void;
  locale?: 'ja' | 'en';
}

// Utility to resolve the actual model ID from unique React Flow render IDs (e.g., parentId::childId)
const getRealId = (nodeId: string): string => {
  if (nodeId.includes('::')) {
    return nodeId.split('::')[1];
  }
  return nodeId;
};

export default function FaultTreeCanvas({ 
  onNodeSelect, 
  onNodeDeleteRequest, 
  onEdgeDeleteRequest,
  onQuantifySuccess,
  locale = 'ja' 
}: FaultTreeCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance<Node<FTNodeData>, Edge> | null>(null);

  const model = useModelStore((s) => s.model);
  const selectedFaultTreeId = useModelStore((s) => s.selectedFaultTreeId);
  const [isLocked, setIsLocked] = useState(false);
  const [viewMode, setViewMode] = useState<'tree' | 'network'>('tree'); // Add tree vs network view toggle
  const addBasicEvent = useModelStore((s) => s.addBasicEvent);
  const updateBasicEvent = useModelStore((s) => s.updateBasicEvent);
  const selectFaultTree = useModelStore((s) => s.selectFaultTree);
  const addGate = useModelStore((s) => s.addGate);
  const updateGate = useModelStore((s) => s.updateGate);
  const removeGate = useModelStore((s) => s.removeGate);
  const removeBasicEvent = useModelStore((s) => s.removeBasicEvent);
  const toggleGateCollapse = useModelStore((s) => s.toggleGateCollapse);
  const autoLayout = useModelStore((s) => s.autoLayout);
  const addChildToGate = useModelStore((s) => s.addChildToGate);
  const removeChildFromGate = useModelStore((s) => s.removeChildFromGate);
  const moveGateChild = useModelStore((s) => s.moveGateChild);

  const setComputing = useResultsStore(s => s.setComputing);
  const setResult = useResultsStore(s => s.setResult);
  const setError = useResultsStore(s => s.setError);

  const handleExportImage = async () => {
    if (!reactFlowWrapper.current || !selectedFaultTreeId) return;
    
    const ft = model.faultTrees.find(t => t.id === selectedFaultTreeId);
    const safeName = (ft?.name || 'fault-tree').replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_');
    const filename = `${safeName}.svg`;

    let fileHandle: any = null;

    // Try to get file handle FIRST to preserve user gesture context
    if ('showSaveFilePicker' in window) {
      try {
        fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'SVG Image',
            accept: { 'image/svg+xml': ['.svg'] },
          }],
        });
      } catch (err: any) {
        if (err.name === 'AbortError') return; // User cancelled
        console.warn('showSaveFilePicker failed or was cancelled', err);
      }
    }

    try {
      // Temporarily hide UI elements during capture
      const elementsToHide = reactFlowWrapper.current.querySelectorAll(
        '.react-flow__controls, .react-flow__minimap, .react-flow__panel'
      );
      
      elementsToHide.forEach((el) => {
        (el as HTMLElement).style.setProperty('display', 'none', 'important');
      });

      const style = getComputedStyle(document.body);
      const canvasBg = style.getPropertyValue('--bg-canvas').trim() || '#f1f5f9';

      const dataUrl = await toSvg(reactFlowWrapper.current, {
        backgroundColor: canvasBg,
        style: {
          background: canvasBg,
        }
      });

      // Restore UI elements
      elementsToHide.forEach((el) => {
        (el as HTMLElement).style.removeProperty('display');
      });

      // Convert dataUrl to Blob robustly
      const blobResponse = await fetch(dataUrl);
      const svgBlob = await blobResponse.blob();

      if (fileHandle) {
        const writable = await fileHandle.createWritable();
        await writable.write(svgBlob);
        await writable.close();
      } else {
        // Fallback for browsers without File System Access API
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        alert(`書き出しを開始しました: ${filename}\nダウンロードフォルダを確認してください。`);
      }
    } catch (error) {
      console.error('Failed to export SVG:', error);
      alert('SVGの書き出しに失敗しました。詳細: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const CustomControls = () => {
    const { zoom } = useViewport();
    const { fitView, zoomIn, zoomOut, setCenter } = useReactFlow();
    
    const handleReset = () => {
      const topNode = nodes.find(
        (n) => n.type === 'topEvent' || n.data?.nodeType === 'topEvent'
      );
      if (topNode) {
        // Center with 100% zoom, but offset center targeting downwards (+250px)
        // to make the root Top Event reside beautifully at the upper center of viewport.
        setCenter(
          topNode.position.x + 100, 
          topNode.position.y + 250, 
          { zoom: 1, duration: 500 }
        );
      } else {
        fitView({ duration: 500, padding: 0.2 });
      }
    };

    return (
      <div style={{ 
        display: 'flex', 
        gap: '4px', 
        padding: '4px', 
        background: 'var(--bg-secondary)', 
        border: '1px solid var(--border-default)', 
        borderRadius: 'var(--radius-md)', 
        boxShadow: 'var(--shadow-lg)',
        alignItems: 'center',
        zIndex: 10
      }}>
        <button className="btn btn--ghost btn--sm" style={{ padding: '4px 8px' }} onClick={() => zoomOut({ duration: 300 })} title={locale === 'ja' ? 'ズームアウト' : 'Zoom Out'}>−</button>
        <div style={{ width: 45, textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          {Math.round(zoom * 100)}%
        </div>
        <button className="btn btn--ghost btn--sm" style={{ padding: '4px 8px' }} onClick={() => zoomIn({ duration: 300 })} title={locale === 'ja' ? 'ズームイン' : 'Zoom In'}>+</button>
        
        <div style={{ width: '1px', height: '16px', background: 'var(--border-default)', margin: '0 4px' }} />
        
        <button 
          className="btn btn--ghost btn--sm" 
          onClick={handleReset}
          style={{ fontSize: '11px' }}
          title={locale === 'ja' ? 'トップノードにフォーカス' : 'Focus on Top Node'}
        >
          Reset
        </button>
        
        <button 
          className="btn btn--ghost btn--sm" 
          onClick={() => fitView({ duration: 400, padding: 0.2 })}
          style={{ fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 'bold' }}
          title={locale === 'ja' ? '全体表示' : 'Fit to Screen'}
        >
          Fit
        </button>

        <div style={{ width: '1px', height: '16px', background: 'var(--border-default)', margin: '0 4px' }} />

        <button 
          className="btn btn--ghost btn--sm" 
          onClick={() => setIsLocked(!isLocked)}
          title={isLocked ? (locale === 'ja' ? 'ロック解除' : 'Unlock') : (locale === 'ja' ? '編集ロック' : 'Lock')}
          style={{ 
            fontSize: '14px', 
            color: isLocked ? 'var(--accent-amber)' : 'var(--accent-green)',
            background: isLocked ? 'transparent' : 'rgba(16, 185, 129, 0.1)',
            borderRadius: '4px',
            minWidth: '32px'
          }}
        >
          {isLocked ? '🔒' : '🔓'}
        </button>

        <div style={{ width: '1px', height: '16px', background: 'var(--border-default)', margin: '0 4px' }} />

        <button 
          className="btn btn--ghost btn--sm" 
          onClick={() => setViewMode(viewMode === 'tree' ? 'network' : 'tree')}
          title={viewMode === 'tree' ? (locale === 'ja' ? 'ネットワーク型描画に切替' : 'Switch to Network View') : (locale === 'ja' ? 'ツリー型描画に切替' : 'Switch to Tree View')}
          style={{ 
            fontSize: '11px', 
            color: viewMode === 'tree' ? 'var(--accent-blue)' : 'var(--accent-green)',
            fontWeight: 'bold',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {viewMode === 'tree' ? '🌲 Tree' : '🕸️ Net'}
        </button>
      </div>
    );
  };

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, nodeId: string, nodeType: string } | null>(null);
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);
  const [copiedNodeId, setCopiedNodeId] = useState<{ nodeId: string, nodeType: string } | null>(null);

  const { nodes, edges } = useMemo(() => {
    const ft = model.faultTrees?.find((t) => t.id === selectedFaultTreeId);
    if (!ft) return { nodes: [], edges: [] };

    let activeFlagGroup = model.flagGroups?.find(g => g.id === model.activeFlagGroupId);
    const isFlagGroupActive = !!activeFlagGroup;
    if (!activeFlagGroup && model.flagGroups && model.flagGroups.length > 0) {
      activeFlagGroup = model.flagGroups[0];
    }
    
    // Resolve active recovery rules based on activeRecoveryGroupId
    let recoveryRules = model.recoveryRules || [];
    let isRecoveryGroupActive = false;
    if (model.activeRecoveryGroupId) {
      const activeGroup = model.recoveryGroups?.find(g => g.id === model.activeRecoveryGroupId);
      recoveryRules = activeGroup ? activeGroup.rules || [] : [];
      isRecoveryGroupActive = !!activeGroup;
    } else if (model.recoveryGroups && model.recoveryGroups.length > 0) {
      recoveryRules = model.recoveryGroups[0]?.rules || [];
    }

    const nodes: Node<FTNodeData>[] = [];
    const edges: Edge[] = [];
    const processedNodes = new Set<string>();
    const allChildIds = new Set(ft.gates.flatMap(g => g.children));
    
    // Also track all children across ALL fault trees to identify truly "unassigned" basic events
    const allChildIdsGlobal = new Set(
      model.faultTrees?.flatMap(t => t.gates).flatMap(g => g.children) || []
    );

    const processNode = (nodeId: string, parentId?: string) => {
      const gate = ft.gates.find((g) => g.id === nodeId);
      if (gate) {
        if (processedNodes.has(nodeId)) return;
        processedNodes.add(nodeId);

        const isTopGate = gate.id === ft.topGateId;
        let flowNodeType: FTNodeType = 'andGate';
        if (isTopGate) flowNodeType = 'topEvent';
        else if (gate.type === 'OR') flowNodeType = 'orGate';
        else if (gate.type === 'ATLEAST' || gate.type === 'VOTE') flowNodeType = 'atleastGate';
        else if (gate.type === 'TRANSFER') flowNodeType = 'transferGate';
        
        let resolvedGatePosition = gate.position;
        if (viewMode === 'tree' && parentId) {
          const parentGate = ft.gates.find(g => g.id === parentId);
          if (parentGate) {
            resolvedGatePosition = {
              x: gate.position.x,
              y: parentGate.position.y + 220
            };
          }
        }

        nodes.push({
          id: gate.id,
          type: flowNodeType,
          position: resolvedGatePosition,
          width: 200,
          height: 120,
          origin: [0.5, 0],
          data: {
            label: gate.name,
            nodeType: flowNodeType,
            gateType: gate.type,
            k: gate.k,
            collapsed: gate.collapsed,
            isDropTarget: dragOverNodeId === gate.id,
            id: gate.id,
          },
        });

        // Gates can also be flagged if we allow it, but usually it's basic/house events.
        // For now, let's check if the gate's realId is in flags or recovery.
        const gateRealId = gate.id;
        const gateFlag = activeFlagGroup?.items.find(item => item.eventId === gateRealId);
        const isGateInRecovery = recoveryRules.some(r => r.condition.includes(gateRealId) || r.targetEventId === gateRealId);

        if (gateFlag || isGateInRecovery) {
          const lastNode = nodes[nodes.length - 1];
          lastNode.data = {
            ...lastNode.data,
            isFlagged: !!gateFlag,
            flagState: gateFlag?.state,
            isFlagGroupActive,
            isRecovery: isGateInRecovery,
            isRecoveryGroupActive
          };
        }

        if (gate.collapsed) return;

        for (const childId of gate.children) {
          const isChildGate = ft.gates.some((g) => g.id === childId);
          // Basic events get composite ID ONLY in Tree mode. In Network mode, they use the original ID.
          const renderChildId = (isChildGate || viewMode === 'network') ? childId : `${gate.id}::${childId}`;

          edges.push({
            id: `${gate.id}-${renderChildId}`,
            source: gate.id,
            target: renderChildId,
            type: 'smoothstep',
            interactionWidth: 20,
            style: { stroke: 'var(--text-tertiary)', strokeWidth: 2 },
          });
          processNode(childId, gate.id);
        }
      } else {
        // In network mode, basic events are deduplicated globally on traversal
        if (viewMode === 'network') {
          if (processedNodes.has(nodeId)) return;
          processedNodes.add(nodeId);
        }

        const foundBe = model.basicEvents.find((e) => e.id === nodeId);
        const foundHe = model.houseEvents?.find((e) => e.id === nodeId);
        const be = foundBe || foundHe;

        if (be) {
          // Compose visual unique ID in tree mode, otherwise use the actual basic event ID
          const renderId = (viewMode === 'tree' && parentId) ? `${parentId}::${nodeId}` : nodeId;
          
          // DYNAMIC AUTO-SPACING:
          // In tree mode, we fully auto-align basic events centered right beneath their parent gate.
          // This instantly fixes overlapping on view mode toggle, and makes children naturally
          // follow their parent gates like a real fault tree tool.
          let resolvedPosition = (be as any).position || { x: 0, y: 0 };
          let isDraggable = !isLocked;

          if (viewMode === 'tree' && parentId) {
            const parentGate = ft.gates.find(g => g.id === parentId);
            if (parentGate) {
              const childIndex = parentGate.children.indexOf(nodeId);
              const totalChildren = parentGate.children.length;
              
              // Calculate centered horizontal offset (220px spacing matching visual width)
              const spacing = 220;
              const offsetX = (childIndex - (totalChildren - 1) / 2) * spacing;
              
              resolvedPosition = {
                x: parentGate.position.x + offsetX,
                y: parentGate.position.y + 220 // Visual depth height matching autoLayout nodeHeight
              };
              
              // Let user drag single items even in tree mode if lock is released. 
              // Upon release, the node will automatically snap back to maintain structural integrity.
              // isDraggable = false;
            }
          }

          const isHouseEvent = !!foundHe || (foundBe?.eventType === 'houseEvent');
          const resolvedNodeType = isHouseEvent ? 'houseEvent' : (foundBe?.eventType || 'basicEvent');
          
          // Cast be to any to avoid TS errors on missing properties between BasicEvent and HouseEvent
          const beAny = be as any;

          const isCCF = (model.ccfGroups || []).some(g => g.members.includes(be.id));
          const param = (model.parameters || []).find((p) => p.id === beAny.parameterId);
          const parameterName = param ? param.name : undefined;
          
          nodes.push({
            id: renderId,
            type: resolvedNodeType, 
            position: resolvedPosition,
            width: 200,
            height: 120,
            origin: [0.5, 0],
            draggable: isDraggable,
            data: {
              label: be.name,
              nodeType: resolvedNodeType,
              eventId: beAny.eventId || be.id,
              probability: beAny.probability ?? (beAny.failureRate ? (beAny.failureRate * (beAny.missionTime ?? 24)) : (isHouseEvent ? (beAny.state ? 1 : 0) : undefined)),
              failureType: beAny.failureType,
              parameterId: beAny.parameterId,
              parameterName,
              isCCF,
              isDropTarget: dragOverNodeId === renderId,
              id: be.id, // Holds true model ID
              isFlagged: !!activeFlagGroup?.items.some(item => 
                item.eventId === be.id || (beAny.eventId && item.eventId === beAny.eventId)
              ),
              flagState: activeFlagGroup?.items.find(item => 
                item.eventId === be.id || (beAny.eventId && item.eventId === beAny.eventId)
              )?.state,
              isFlagGroupActive,
              isRecovery: recoveryRules.some(r => 
                r.condition.includes(be.id) || 
                (beAny.eventId && r.condition.includes(beAny.eventId)) ||
                r.targetEventId === be.id ||
                (beAny.eventId && r.targetEventId === beAny.eventId)
              ),
              isRecoveryGroupActive,
            },
          });
        }
      }
    };

    // Start traversal from all root nodes (nodes that are not children of any gate)
    // This handles the top event, orphaned trees, and truly isolated nodes in a single pass.
    const roots = [
      ...ft.gates.filter(g => !allChildIds.has(g.id)).map(g => g.id),
      ...model.basicEvents.filter(be => !allChildIdsGlobal.has(be.id)).map(be => be.id),
      ...(model.houseEvents || []).filter(he => !allChildIdsGlobal.has(he.id)).map(he => he.id)
    ];

    roots.forEach(rootId => processNode(rootId));

    return { nodes, edges };
  }, [selectedFaultTreeId, model, dragOverNodeId, viewMode, isLocked]);

  const [nodesState, setNodes, onNodesChange] = useNodesState(nodes);
  const [edgesState, setEdges, onEdgesChange] = useEdgesState(edges);

  React.useEffect(() => {
    setNodes(nodes);
    setEdges((eds) => 
      edges.map(newEdge => {
        const existing = eds.find(e => e.id === newEdge.id);
        return existing ? { ...newEdge, selected: existing.selected } : newEdge;
      })
    );
  }, [nodes, edges, setNodes, setEdges]);

  // Automatically fit view ONLY when switching to a DIFFERENT fault tree
  React.useEffect(() => {
    if (reactFlowInstance.current && nodes.length > 0) {
      setTimeout(() => {
        reactFlowInstance.current?.fitView({ duration: 600, padding: 0.2 });
      }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFaultTreeId]);

  const onConnect: OnConnect = useCallback(
    (params) => {
      setEdges((eds) => addEdge({ 
        ...params, 
        type: 'smoothstep',
        style: { stroke: 'var(--text-tertiary)', strokeWidth: 2 },
      }, eds));
      if (selectedFaultTreeId && params.source && params.target) {
        const ft = model.faultTrees.find((t) => t.id === selectedFaultTreeId);
        const parentGate = ft?.gates.find((g) => g.id === params.source);
        const targetRealId = getRealId(params.target);
        if (parentGate && !parentGate.children.includes(targetRealId)) {
          const updatedGate = { ...parentGate, children: [...parentGate.children, targetRealId] };
          useModelStore.getState().updateGate(selectedFaultTreeId, updatedGate);
        }
      }
    },
    [setEdges, model, selectedFaultTreeId]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeSelect(getRealId(node.id), (node.data as FTNodeData).nodeType);
    },
    [onNodeSelect]
  );

  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const data = node.data as FTNodeData;
      const isGate = ['andGate', 'orGate', 'atleastGate', 'topEvent'].includes(data.nodeType);
      if (selectedFaultTreeId && isGate) {
        toggleGateCollapse(selectedFaultTreeId, getRealId(node.id));
      }
    },
    [selectedFaultTreeId, toggleGateCollapse]
  );

  const onEdgesDelete = useCallback(
    (edgesToDelete: Edge[]) => {
      if (!selectedFaultTreeId) return;
      edgesToDelete.forEach((edge) => {
        removeChildFromGate(selectedFaultTreeId, edge.source, getRealId(edge.target));
      });
    },
    [selectedFaultTreeId, removeChildFromGate]
  );

  const pasteSubtree = useCallback((
    sourceNodeId: string,
    sourceNodeType: string,
    targetGateId: string | null
  ) => {
    if (!selectedFaultTreeId) return;
    
    // Ensure we resolve the real underlying model UUID immediately
    const realSourceNodeId = getRealId(sourceNodeId);
    const realTargetGateId = targetGateId ? getRealId(targetGateId) : null;

    const ft = model.faultTrees.find(t => t.id === selectedFaultTreeId);
    if (!ft) return;

    if (['andGate', 'orGate', 'atleastGate', 'topEvent', 'transferGate'].includes(sourceNodeType)) {
      // Recursive clone of a sub-tree (gates)
      let sourceGate = null;
      let sourceFtId = null;
      for (const f of model.faultTrees) {
        const g = f.gates.find((gate) => gate.id === realSourceNodeId);
        if (g) {
          sourceGate = g;
          sourceFtId = f.id;
          break;
        }
      }

      if (sourceGate && sourceFtId) {
        const sourceFt = model.faultTrees.find(f => f.id === sourceFtId);
        if (!sourceFt) return;

        // Calculate unified position offset to maintain visual structure
        let offset = { x: 60, y: 60 };
        if (realTargetGateId) {
          const targetGate = ft.gates.find(g => g.id === realTargetGateId);
          if (targetGate) {
            offset = {
              x: targetGate.position.x - sourceGate.position.x,
              y: targetGate.position.y + 220 - sourceGate.position.y
            };
          }
        }

        // Recursive function to clone gate structures
        const cloneSubtree = (currentGateId: string): string => {
          const originalGate = sourceFt.gates.find(g => g.id === currentGateId);
          if (!originalGate) return '';

          const nextNewGateId = uuidv4();
          const clonedChildren: string[] = [];

          for (const childId of originalGate.children) {
            const isChildGate = sourceFt.gates.some(g => g.id === childId);
            if (isChildGate) {
              // Recurse nested gates
              const clonedChildGateId = cloneSubtree(childId);
              if (clonedChildGateId) {
                clonedChildren.push(clonedChildGateId);
              }
            } else {
              // Basic Events keep EXACT same original ID for shared references (PRA logic)
              clonedChildren.push(childId);
            }
          }

          // Add the cloned gate
          addGate(selectedFaultTreeId, {
            ...originalGate,
            id: nextNewGateId,
            name: currentGateId === realSourceNodeId ? `${originalGate.name} (Copy)` : originalGate.name,
            position: {
              x: originalGate.position.x + offset.x,
              y: originalGate.position.y + offset.y
            },
            children: clonedChildren
          });

          return nextNewGateId;
        };

        // Begin cloning at the root of copied gate
        const newRootGateId = cloneSubtree(realSourceNodeId);

        // Link the new cloned root under target parent gate if present
        if (realTargetGateId && newRootGateId) {
          const targetGate = ft.gates.find(g => g.id === realTargetGateId);
          if (targetGate) {
            updateGate(selectedFaultTreeId, {
              ...targetGate,
              children: [...targetGate.children, newRootGateId]
            });
          }
        }
      }
    } else {
      // Shared reference paste of a basic event (only if pasting onto a target gate)
      if (realTargetGateId && model.basicEvents.some(e => e.id === realSourceNodeId)) {
        const targetGate = ft.gates.find(g => g.id === realTargetGateId);
        if (targetGate && !targetGate.children.includes(realSourceNodeId)) {
          updateGate(selectedFaultTreeId, {
            ...targetGate,
            children: [...targetGate.children, realSourceNodeId]
          });
        }
      }
    }
  }, [selectedFaultTreeId, model, addGate, updateGate]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const isCmdOrCtrl = event.ctrlKey || event.metaKey;

      // 1. Delete
      if (event.key === 'Delete') {
        const selectedEdges = edgesState.filter((e) => e.selected);
        const selectedNodes = nodesState.filter((n) => n.selected);

        // Node deletion is handled by the parent (page.tsx) with a confirmation modal
        if (selectedNodes.length > 0) return;

        // If only edges are selected, request confirmation from parent
        if (selectedEdges.length > 0) {
          onEdgeDeleteRequest(selectedEdges);
        }
      }

      // 2. Copy (Ctrl + C)
      if (isCmdOrCtrl && event.key.toLowerCase() === 'c') {
        const selectedNode = nodesState.find((n) => n.selected);
        if (selectedNode) {
          event.preventDefault(); // Prevent native copying mechanisms
          const nodeType = selectedNode.type || (selectedNode.data as any).nodeType;
          setCopiedNodeId({ nodeId: getRealId(selectedNode.id), nodeType });
        }
      }

      // 3. Paste (Ctrl + V)
      if (isCmdOrCtrl && event.key.toLowerCase() === 'v') {
        if (!selectedFaultTreeId || !copiedNodeId) return;
        event.preventDefault(); // Prevent native browser pasting behaviors

        // Find selected node to determine if paste target is a gate
        const selectedNode = nodesState.find((n) => n.selected);
        const targetGateId = selectedNode && ['andGate', 'orGate', 'atleastGate', 'topEvent'].includes(selectedNode.type || (selectedNode.data as any).nodeType)
          ? selectedNode.id
          : null;

        pasteSubtree(copiedNodeId.nodeId, copiedNodeId.nodeType, targetGateId);
      }
    },
    [edgesState, nodesState, onEdgeDeleteRequest, selectedFaultTreeId, copiedNodeId, pasteSubtree, setCopiedNodeId]
  );

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      // 1. Save position
      if (!selectedFaultTreeId) return;
      const ft = model.faultTrees?.find((t) => t.id === selectedFaultTreeId);
      
      const realNodeId = getRealId(node.id);
      const gate = ft?.gates.find((g) => g.id === realNodeId);
      if (gate) {
        updateGate(selectedFaultTreeId, { ...gate, position: node.position });
      } else {
        const be = model.basicEvents.find((e) => e.id === realNodeId);
        if (be) {
          // Only overwrite model shared position in Network Mode.
          // In Tree Mode, letting store persist a single position would collapse all visuals together.
          if (viewMode === 'network') {
            updateBasicEvent({ ...be, position: node.position });
          }
        }
      }

      // 2. Link to gate if dropped over one
      if (dragOverNodeId && selectedFaultTreeId) {
        const targetNode = nodes.find((n) => n.id === dragOverNodeId);
        if (targetNode) {
          // Find old parent gate and remove connection to keep connection line single
          const currentFt = model.faultTrees?.find((t) => t.id === selectedFaultTreeId);
          if (currentFt) {
            const oldParent = currentFt.gates.find((g) => g.children.includes(realNodeId));
            if (oldParent && oldParent.id !== dragOverNodeId) {
              removeChildFromGate(selectedFaultTreeId, oldParent.id, realNodeId);
            }
          }
          addChildToGate(selectedFaultTreeId, dragOverNodeId, realNodeId);
        }
      }
      setDragOverNodeId(null);
    },
    [selectedFaultTreeId, model, updateGate, updateBasicEvent, dragOverNodeId, nodes, addChildToGate, removeChildFromGate, viewMode]
  );

  const onInit = useCallback((instance: ReactFlowInstance<Node<FTNodeData>, Edge>) => {
    reactFlowInstance.current = instance;
  }, []);

  const onPaneClick = useCallback(() => {
    onNodeSelect(null, null);
    setContextMenu(null);
  }, [onNodeSelect]);

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
        nodeType: node.type || (node.data.nodeType as string),
      });
    },
    []
  );

  const handleAddChildBasicEvent = useCallback(() => {
    if (!contextMenu || !selectedFaultTreeId) return;
    const gateId = contextMenu.nodeId;
    const faultTree = model.faultTrees.find((ft) => ft.id === selectedFaultTreeId);
    const gate = faultTree?.gates.find((g) => g.id === gateId);
    
    if (gate) {
      const newId = uuidv4();
      const newEvent: BasicEvent = {
        id: newId,
        name: locale === 'ja' ? '新規基事象' : 'New Basic Event',
        tags: [],
        failureType: 'time',
        failureRate: 1e-4,
        probability: 1e-4,
        missionTime: 24,
        demands: 1,
        distribution: { type: 'lognormal', mean: 1e-4, errorFactor: 3 },
        source: '',
        memo: '',
        position: { x: gate.position.x, y: gate.position.y + 220 },
      };
      addBasicEvent(newEvent);

      const updatedGate = { ...gate, children: [...gate.children, newId] };
      updateGate(selectedFaultTreeId, updatedGate);
    }
    setContextMenu(null);
  }, [contextMenu, selectedFaultTreeId, model, locale, addBasicEvent, updateGate]);

  const handleInsertGateAbove = useCallback(() => {
    if (!contextMenu || !selectedFaultTreeId) return;
    const nodeId = contextMenu.nodeId;
    const realNodeId = getRealId(nodeId);
    
    const faultTree = model.faultTrees.find((ft) => ft.id === selectedFaultTreeId);
    if (!faultTree) return;
    
    // 1. Find the target node position and check existence
    let currentPosition = { x: 0, y: 0 };
    let isBasicEvent = false;
    
    const be = model.basicEvents.find((e) => e.id === realNodeId);
    if (be) {
      currentPosition = be.position || { x: 0, y: 0 };
      isBasicEvent = true;
    } else {
      const gate = faultTree.gates.find((g) => g.id === realNodeId);
      if (gate) {
        currentPosition = gate.position;
      } else {
        return; // Node not found
      }
    }
    
    // 2. Find parent gate of the target node in the active FT
    let parentGate = nodeId.includes('::') 
      ? faultTree.gates.find(g => g.id === nodeId.split('::')[0]) 
      : null;

    if (!parentGate) {
      parentGate = faultTree.gates.find((g) => g.children.includes(realNodeId));
    }

    if (!parentGate) {
      alert(locale === 'ja' ? '挿入先となる親ゲートが見つかりませんでした。' : 'Parent gate not found.');
      setContextMenu(null);
      return;
    }

    const newGateId = uuidv4();
    const newGate = {
      id: newGateId,
      name: locale === 'ja' ? '新規ORゲート' : 'New OR Gate',
      type: 'OR' as any,
      children: [realNodeId],
      position: { x: currentPosition.x, y: Math.max(currentPosition.y - 100, parentGate.position.y + 30) },
    };

    // 1. Add new gate
    addGate(selectedFaultTreeId, newGate);

    // 2. Replace target node ID with the new gate ID in the parent's children
    const updatedParentGate = {
      ...parentGate,
      children: parentGate.children.map((cid) => (cid === realNodeId ? newGateId : cid)),
    };
    updateGate(selectedFaultTreeId, updatedParentGate);

    // 3. Move the target node slightly down relative to the new gate
    if (isBasicEvent && be) {
      updateBasicEvent({
        ...be,
        position: { x: (be.position?.x || 0), y: (be.position?.y || 0) + 100 },
      });
    } else {
      const targetGate = faultTree.gates.find((g) => g.id === realNodeId);
      if (targetGate) {
        updateGate(selectedFaultTreeId, {
          ...targetGate,
          position: { x: targetGate.position.x, y: targetGate.position.y + 100 },
        });
      }
    }

    setContextMenu(null);
  }, [contextMenu, selectedFaultTreeId, model, locale, addGate, updateGate, updateBasicEvent]);

  const handleInsertSibling = useCallback((insertType: 'basicEvent' | 'gate') => {
    if (!contextMenu || !selectedFaultTreeId) return;
    const nodeId = contextMenu.nodeId;
    const realNodeId = getRealId(nodeId);
    const ft = model.faultTrees.find(t => t.id === selectedFaultTreeId);
    if (!ft) return;

    let currentPosition = { x: 0, y: 0 };
    const targetBe = model.basicEvents.find(e => e.id === realNodeId);
    const targetGate = ft.gates.find(g => g.id === realNodeId);
    
    if (targetBe) currentPosition = targetBe.position || { x: 0, y: 0 };
    else if (targetGate) currentPosition = targetGate.position;
    else return;

    let parentGate = nodeId.includes('::') 
      ? ft.gates.find(g => g.id === nodeId.split('::')[0]) 
      : null;

    if (!parentGate) {
      parentGate = ft.gates.find(g => g.children.includes(realNodeId));
    }

    const newId = uuidv4();
    const newPos = { x: currentPosition.x + 250, y: currentPosition.y };

    if (insertType === 'gate') {
      addGate(selectedFaultTreeId, {
        id: newId,
        name: locale === 'ja' ? '新規ORゲート' : 'New OR Gate',
        type: 'OR',
        children: [],
        position: newPos
      });
    } else {
      addBasicEvent({
        id: newId,
        name: locale === 'ja' ? '新規基事象' : 'New Basic Event',
        tags: [],
        failureType: 'time',
        failureRate: 1e-4,
        probability: 1e-4,
        missionTime: 24,
        demands: 1,
        distribution: { type: 'lognormal', mean: 1e-4, errorFactor: 3 },
        source: '',
        memo: '',
        position: newPos
      });
    }

    if (parentGate) {
      const childIdx = parentGate.children.indexOf(realNodeId);
      const newChildren = [...parentGate.children];
      newChildren.splice(childIdx + 1, 0, newId);
      updateGate(selectedFaultTreeId, {
        ...parentGate,
        children: newChildren
      });
    }
    setContextMenu(null);
  }, [contextMenu, selectedFaultTreeId, model, locale, addGate, addBasicEvent, updateGate]);

  const handleDeleteNode = useCallback((nodeId: string, nodeType: string) => {
    if (onNodeDeleteRequest) {
      onNodeDeleteRequest(getRealId(nodeId), nodeType);
    }
    setContextMenu(null);
  }, [onNodeDeleteRequest]);

  const handleCopyNode = useCallback((nodeId: string, nodeType: string) => {
    setCopiedNodeId({ nodeId: getRealId(nodeId), nodeType });
    setContextMenu(null);
  }, []);

  const handlePasteNode = useCallback(() => {
    if (!contextMenu || !selectedFaultTreeId || !copiedNodeId) return;
    const targetGateId = contextMenu.nodeId;
    
    pasteSubtree(copiedNodeId.nodeId, copiedNodeId.nodeType, targetGateId);
    setContextMenu(null);
  }, [contextMenu, selectedFaultTreeId, copiedNodeId, pasteSubtree]);
  
  const handleMoveChild = useCallback((direction: 'left' | 'right') => {
    if (!contextMenu || !selectedFaultTreeId) return;
    const nodeId = contextMenu.nodeId;
    const ft = model.faultTrees?.find(t => t.id === selectedFaultTreeId);
    if (!ft) return;

    const parentGate = ft.gates.find(g => g.children.includes(nodeId));
    if (parentGate) {
      moveGateChild(selectedFaultTreeId, parentGate.id, nodeId, direction);
      // Re-run auto layout to show the change
      setTimeout(() => autoLayout(selectedFaultTreeId), 50);
    }
    setContextMenu(null);
  }, [contextMenu, selectedFaultTreeId, model, moveGateChild, autoLayout]);

  const onNodeDrag = useCallback(
    (event: React.MouseEvent, node: Node) => {
      // 1. Existing drop-target detection logic for nested gate dragging
      const elements = document.elementsFromPoint(event.clientX, event.clientY);
      const targetNodeElement = elements.find(
        (el) => el.classList.contains('react-flow__node') && el.getAttribute('data-id') !== node.id
      );
      const targetId = targetNodeElement?.getAttribute('data-id') || null;

      const targetNode = nodes.find((n) => n.id === targetId);
      const isGateOver = targetNode && ['andGate', 'orGate', 'atleastGate', 'topEvent'].includes(targetNode.data.nodeType);

      setDragOverNodeId(isGateOver ? targetId : null);

      // 2. PREMIUM REAL-TIME CHILD TRACKING (IN TREE MODE)
      // Ensures basic events remain perfectly stuck directly underneath their parent gates during active drag gestures.
      if (viewMode === 'tree' && selectedFaultTreeId) {
        const isDraggedGate = ['andGate', 'orGate', 'atleastGate', 'topEvent'].includes(node.type || (node.data as any)?.nodeType || '');
        
        if (isDraggedGate) {
          const draggedGateId = node.id;
          const ft = model.faultTrees?.find((t) => t.id === selectedFaultTreeId);
          const parentGate = ft?.gates.find((g) => g.id === draggedGateId);
          
          if (parentGate && parentGate.children.length > 0) {
            setNodes((nds) =>
              nds.map((n) => {
                // If this visual node represents a basic event strictly mapped under the moving gate, shift it
                if (n.id.startsWith(`${draggedGateId}::`)) {
                  const realId = getRealId(n.id);
                  const childIndex = parentGate.children.indexOf(realId);
                  const totalChildren = parentGate.children.length;
                  
                  if (childIndex > -1) {
                    const spacing = 220;
                    const offsetX = (childIndex - (totalChildren - 1) / 2) * spacing;
                    return {
                      ...n,
                      position: {
                        x: node.position.x + offsetX,
                        y: node.position.y + 220
                      }
                    };
                  }
                }
                return n;
              })
            );
          }
        }
      }
    },
    [nodes, viewMode, selectedFaultTreeId, model, setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    
    // During native HTML5 drag-and-drop, standard React mouse events (like mouseEnter) 
    // on child components may not fire reliably. 
    // We determine the hovered node by checking the DOM element under the cursor.
    const target = event.target as Element;
    const nodeElement = target.closest('.react-flow__node');
    const id = nodeElement?.getAttribute('data-id') || null;
    
    setDragOverNodeId((prev) => (prev !== id ? id : prev));
  }, []);
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      
      const target = event.target as Element;
      const nodeElement = target.closest('.react-flow__node');
      const parentGateId = nodeElement?.getAttribute('data-id') || null;
      
      setDragOverNodeId(null);

      const type = event.dataTransfer.getData('application/reactflow') as FTNodeType;
      const position = reactFlowInstance.current?.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      }) || { x: 0, y: 0 };

      if (!type || !selectedFaultTreeId) return;

      const ft = model.faultTrees.find(t => t.id === selectedFaultTreeId);
      if (!ft) return;

      const newId = uuidv4();
      
      // Determine final position and connect if parent exists
      let finalPosition = position;
      if (parentGateId) {
        const parentGate = ft.gates.find(g => g.id === parentGateId);
        if (parentGate) {
          finalPosition = { x: parentGate.position.x, y: parentGate.position.y + 220 };
        }
      }

      // 1. Create the node
      if (type === 'basicEvent') {
        const newEvent: BasicEvent = {
          id: newId,
          name: locale === 'ja' ? '新規基事象' : 'New Basic Event',
          eventType: 'basicEvent',
          tags: [],
          failureType: 'time',
          failureRate: 1e-4,
          probability: 1e-4,
          missionTime: 24,
          demands: 1,
          distribution: { type: 'lognormal', mean: 1e-4, errorFactor: 3 },
          source: '',
          memo: '',
          position: finalPosition,
        };
        addBasicEvent(newEvent);
      } else if (type === 'andGate' || type === 'orGate' || type === 'atleastGate' || type === 'topEvent' || type === 'transferGate') {
        const gateType: GateType = 
          type === 'andGate' ? 'AND' : 
          type === 'orGate' ? 'OR' : 
          type === 'atleastGate' ? 'ATLEAST' : 
          type === 'transferGate' ? 'TRANSFER' : 'AND';
        
        addGate(selectedFaultTreeId, {
          id: newId,
          name: type === 'transferGate' ? (locale === 'ja' ? '新規系統リンク' : 'New System Link') : (locale === 'ja' ? '新規ゲート' : 'New Gate'),
          type: gateType,
          children: [],
          position: finalPosition,
          k: type === 'atleastGate' ? 2 : undefined,
        });
      } else if (type === 'houseEvent' || type === 'undeveloped') {
        const newEvent: BasicEvent = {
          id: newId,
          name: type === 'houseEvent' ? (locale === 'ja' ? 'ハウス事象' : 'House Event') : (locale === 'ja' ? '未展開事象' : 'Undeveloped Event'),
          eventType: type,
          tags: [],
          failureType: 'time',
          failureRate: 0,
          probability: 0,
          distribution: { type: 'point', mean: 0 },
          source: '',
          memo: '',
          position: finalPosition,
        };
        addBasicEvent(newEvent);
      }

      // 2. Link to parent if dropped on a gate
      if (parentGateId) {
        const parentGate = ft.gates.find(g => g.id === parentGateId);
        if (parentGate) {
          updateGate(selectedFaultTreeId, { 
            ...parentGate, 
            children: [...parentGate.children, newId] 
          });
        }
      }
    },
    [selectedFaultTreeId, addBasicEvent, addGate, updateGate, locale, dragOverNodeId, model]
  );


  if (!selectedFaultTreeId) {
    return (
      <div className="canvas-area">
        <div className="empty-state" style={{ height: '100%' }}>
          <div className="empty-state__icon">🌳</div>
          <div className="empty-state__title">
            {locale === 'ja' ? 'Fault Treeを選択' : 'Select a Fault Tree'}
          </div>
          <div className="empty-state__description">
            {locale === 'ja' ? '左上のモデルリストからFTを選択してください' : 'Select an FT from the model list'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="canvas-area" ref={reactFlowWrapper} tabIndex={0}>
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
            borderRadius: 'var(--radius-md)',
            zIndex: 1000,
            padding: '4px 0',
            minWidth: '150px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {['andGate', 'orGate', 'atleastGate', 'topEvent'].includes(contextMenu.nodeType) && (
            <button
              className="context-menu-item"
              style={{
                width: '100%',
                padding: '8px 16px',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '13px',
                cursor: 'pointer',
              }}
              onClick={handleAddChildBasicEvent}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {locale === 'ja' ? '基事象を追加' : 'Add Basic Event'}
            </button>
          )}
          <button
            className="context-menu-item"
            style={{
              width: '100%',
              padding: '8px 16px',
              textAlign: 'left',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '13px',
              cursor: 'pointer',
            }}
            onClick={() => handleCopyNode(contextMenu.nodeId, contextMenu.nodeType)}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            {locale === 'ja' ? 'コピー' : 'Copy'}
          </button>
          {['andGate', 'orGate', 'atleastGate', 'topEvent'].includes(contextMenu.nodeType) && copiedNodeId && (
            <button
              className="context-menu-item"
              style={{
                width: '100%',
                padding: '8px 16px',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-primary, #3b82f6)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
              onClick={handlePasteNode}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              📋 {locale === 'ja' ? 'ここに貼り付け' : 'Paste Here'}
            </button>
          )}
          {['basicEvent', 'houseEvent', 'undeveloped'].includes(contextMenu.nodeType) && (
            <>
              <button
                className="context-menu-item"
                style={{
                  width: '100%',
                  padding: '8px 16px',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
                onClick={() => handleInsertSibling('basicEvent')}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                ➡️ {locale === 'ja' ? '右に基事象を挿入' : 'Insert Basic Event to Right'}
              </button>
              <button
                className="context-menu-item"
                style={{
                  width: '100%',
                  padding: '8px 16px',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
                onClick={() => handleInsertSibling('gate')}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                ➡️ {locale === 'ja' ? '右にゲートを挿入' : 'Insert Gate to Right'}
              </button>
            </>
          )}
          {['andGate', 'orGate', 'atleastGate', 'basicEvent'].includes(contextMenu.nodeType) && (
            <button
              className="context-menu-item"
              style={{
                width: '100%',
                padding: '8px 16px',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '13px',
                cursor: 'pointer',
              }}
              onClick={handleInsertGateAbove}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              ⬆️ {locale === 'ja' ? '上にゲートを挿入' : 'Insert Gate Above'}
            </button>
          )}
          <button
            className="context-menu-item"
            style={{
              width: '100%',
              padding: '8px 16px',
              textAlign: 'left',
              background: 'transparent',
              border: 'none',
              color: 'var(--accent-red)',
              fontSize: '13px',
              cursor: 'pointer',
            }}
            onClick={() => handleDeleteNode(contextMenu.nodeId, contextMenu.nodeType)}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            {locale === 'ja' ? '削除' : 'Delete'}
          </button>
          
          {/* Reordering */}
          {contextMenu.nodeType !== 'topEvent' && (
            <>
              <div style={{ height: '1px', background: 'var(--border-default)', margin: '4px 0' }} />
              <div style={{ padding: '4px 16px', fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                {locale === 'ja' ? '並び替え (オートレイアウト用)' : 'Reorder (for Auto Layout)'}
              </div>
              <button
                className="context-menu-item"
                style={{
                  width: '100%',
                  padding: '8px 16px',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
                onClick={() => handleMoveChild('left')}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                ← {locale === 'ja' ? '左へ移動' : 'Move Left'}
              </button>
              <button
                className="context-menu-item"
                style={{
                  width: '100%',
                  padding: '8px 16px',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
                onClick={() => handleMoveChild('right')}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                → {locale === 'ja' ? '右へ移動' : 'Move Right'}
              </button>
            </>
          )}
        </div>
      )}
      <ReactFlow
        nodes={nodesState}
        edges={edgesState}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeOrigin={[0.5, 0]}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onEdgesDelete={onEdgesDelete}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onInit={onInit}
        nodeTypes={ftNodeTypes as any}
        deleteKeyCode={null}
        onKeyDown={handleKeyDown}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={!isLocked}
        nodesConnectable={!isLocked}
        elementsSelectable={!isLocked}
        minZoom={0.01}
        maxZoom={4}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--text-muted)" />
        <Panel position="bottom-left">
          <CustomControls />
        </Panel>
        <MiniMap
          position="bottom-right"
          nodeColor={(n) => {
            const nodeType = n.type || (n.data as any)?.nodeType;
            if (nodeType === 'topEvent') return '#FF4757';
            if (nodeType === 'andGate') return '#3B82F6';
            if (nodeType === 'orGate') return '#A855F7';
            if (nodeType === 'atleastGate') return '#6366F1';
            if (['basicEvent', 'houseEvent', 'undeveloped', 'transferGate'].includes(nodeType)) {
              return '#00D68F';
            }
            return '#94A3B8';
          }}
          style={{ 
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            width: 200,
            height: 150
          }}
        />
        <Panel position="top-right" style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn btn--primary btn--sm" 
            onClick={async () => {
              if (!selectedFaultTreeId) return;
              setComputing(true);
              try {
                const result = await runWorkerCommand<any>('QUANTIFY_FT', { model, targetId: selectedFaultTreeId });
                setResult(selectedFaultTreeId, result);
                if (onQuantifySuccess) onQuantifySuccess();
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Quantification failed');
              } finally {
                setComputing(false);
              }
            }}
            style={{ 
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              padding: '6px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600
            }}
          >
            <span style={{ fontSize: '14px' }}>⚛</span>
            {locale === 'ja' ? '定量化実行' : 'Quantify'}
          </button>
          <button 
            className="btn btn--secondary btn--sm" 
            onClick={() => selectedFaultTreeId && autoLayout(selectedFaultTreeId)}
            style={{ 
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span style={{ fontSize: '14px' }}>✨</span>
            {locale === 'ja' ? 'オートレイアウト' : 'Auto Layout'}
          </button>
          <button 
            className="btn btn--secondary btn--sm" 
            onClick={handleExportImage}
            title={locale === 'ja' ? 'SVGエクスポート' : 'Save as SVG'}
            style={{ 
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            📸 {locale === 'ja' ? 'SVGエクスポート' : 'Save as SVG'}
          </button>
        </Panel>
      </ReactFlow>
    </div>
  );
}
