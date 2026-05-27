'use client';

import React, { useState, useCallback, useEffect } from 'react';
import FaultTreeCanvas from '@/components/editor/FaultTreeCanvas';
import ToolboxPanel from '@/components/editor/panels/ToolboxPanel';
import PropertyPanel from '@/components/editor/panels/PropertyPanel';
import EventTreeCanvas from '@/components/editor/EventTreeCanvas';
import ETPropertyPanel from '@/components/editor/panels/ETPropertyPanel';
import ResultsDashboard from '@/components/results/ResultsDashboard';
import AnalysisReport from '@/components/results/AnalysisReport';
import BasicEventTable from '@/components/data/BasicEventTable';
import ParameterTable from '@/components/data/ParameterTable';
import CCFGroupTable from '@/components/data/CCFGroupTable';
import InitiatingEventTable from '@/components/data/InitiatingEventTable';
import EndStateTable from '@/components/data/EndStateTable';
import FaultTreeTable from '@/components/data/FaultTreeTable';
import EventTreeTable from '@/components/data/EventTreeTable';
import FlagGroupTable from '@/components/data/FlagGroupTable';
import RecoveryRuleTable from '@/components/data/RecoveryRuleTable';
import SeismicDashboard from '@/components/seismic/SeismicDashboard';
import QuantificationPanel from '@/components/results/QuantificationPanel';
import ProjectManager from '@/components/project/ProjectManager';
import type { NavigationTarget } from '@/lib/types/project';
import { useModelStore } from '@/store/modelStore';
import { useProjectStore } from '@/store/projectStore';
import { useResultsStore, runWorkerCommand, abortComputation } from '@/store/resultsStore';
import { useYjsStore } from '@/store/yjsStore';

import ValidationPanel from '@/components/editor/ValidationPanel';
import FeedbackModal from '@/components/feedback/FeedbackModal';
import { QuanticaLogo } from '@/components/brand/QuanticaLogo';


type ViewMode = 'editor' | 'et_editor' | 'results' | 'split' | 'data' | 'report' | 'seismic' | 'quantification';
type Locale = 'ja' | 'en';

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [editorType, setEditorType] = useState<'FT' | 'ET'>('FT');
  const [dataViewTab, setDataViewTab] = useState<'faultTrees' | 'eventTrees' | 'basicEvents' | 'parameters' | 'ccf' | 'initiatingEvents' | 'endStates' | 'flags' | 'recovery'>('basicEvents');
  const [locale, setLocale] = useState<Locale>('ja');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeRawId, setSelectedNodeRawId] = useState<string | null>(null);
  const [selectedNodeType, setSelectedNodeType] = useState<string | null>(null);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [highlightedEntityId, setHighlightedEntityId] = useState<string | null>(null);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [reportOptions, setReportOptions] = useState({
    showExecSummary: true,
    showBasicInfo: true,
    showQuantResult: true,
    showUncertainty: true,
    showMCS: true
  });
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [modal, setModal] = useState<{
    show: boolean,
    type: 'new' | 'rename' | 'delete' | 'deleteNode' | 'deleteEdge',
    value: string,
    title: string,
    nodeId?: string,
    rawNodeId?: string,
    nodeType?: string,
    edgeId?: string,
    onConfirm: (val: string, deleteMode?: 'local' | 'global') => void
  }>({
    show: false,
    type: 'new',
    value: '',
    title: '',
    onConfirm: () => { }
  });

  const model = useModelStore((s) => s.model);
  const selectedFaultTreeId = useModelStore((s) => s.selectedFaultTreeId);
  const selectedEventTreeId = useModelStore((s) => s.selectedEventTreeId);
  const selectFaultTree = useModelStore((s) => s.selectFaultTree);
  const selectEventTree = useModelStore((s) => s.selectEventTree);
  const isDirty = useModelStore((s) => s.isDirty);
  const past = useModelStore((s) => s.past);
  const future = useModelStore((s) => s.future);
  const undo = useModelStore((s) => s.undo);
  const redo = useModelStore((s) => s.redo);
  const saveToLocalStorage = useModelStore((s) => s.saveToLocalStorage);

  // Yjs Collaboration
  const activeProjectId = useProjectStore(s => s.activeProjectId);
  const userName = useProjectStore(s => s.userName);
  const isConnected = useYjsStore(s => s.isConnected);
  const users = useYjsStore(s => s.users);
  const connect = useYjsStore(s => s.connect);
  const disconnect = useYjsStore(s => s.disconnect);
  const updateCursor = useYjsStore(s => s.updateCursor);

  // Connect to Yjs room when project changes
  useEffect(() => {
    if (activeProjectId) {
      connect(`quantica-risk-project-${activeProjectId}`, userName);
    } else {
      disconnect();
    }
    return () => disconnect();
  }, [activeProjectId, userName, connect, disconnect]);

  // Update awareness cursor
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // Throttle cursor updates slightly for performance if needed, but Yjs handles it well
      updateCursor({ x: e.clientX, y: e.clientY, view: viewMode });
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [viewMode, updateCursor]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveToLocalStorage();
        setShowSaveToast(true);
        setTimeout(() => setShowSaveToast(false), 3000);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (past.length > 0) undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (future.length > 0) redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveToLocalStorage, undo, redo, past.length, future.length]);
  // Handle cross-component navigation events (e.g. from canvas badges to database tables)
  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<{ viewMode: ViewMode; tab?: typeof dataViewTab; targetId?: string }>;
      if (customEvent && customEvent.detail) {
        const { viewMode: newViewMode, tab, targetId } = customEvent.detail;
        setViewMode(newViewMode);
        if (tab) {
          setDataViewTab(tab);
        }
        if (targetId) {
          setHighlightedEntityId(targetId);
          setTimeout(() => setHighlightedEntityId(null), 3000);
        }
      }
    };
    window.addEventListener('app-navigate', handleNavigate);
    return () => window.removeEventListener('app-navigate', handleNavigate);
  }, []);

  const loadFromLocalStorage = useModelStore((s) => s.loadFromLocalStorage);
  const removeGate = useModelStore((s) => s.removeGate);
  const removeBasicEvent = useModelStore((s) => s.removeBasicEvent);
  const addFaultTree = useModelStore((s) => s.addFaultTree);
  const removeFaultTree = useModelStore((s) => s.removeFaultTree);
  const updateFaultTree = useModelStore((s) => s.updateFaultTree);
  const addEventTree = useModelStore((s) => s.addEventTree);
  const removeEventTree = useModelStore((s) => s.removeEventTree);
  const updateEventTree = useModelStore((s) => s.updateEventTree);

  const setResult = useResultsStore((s) => s.setResult);
  const setComputing = useResultsStore((s) => s.setComputing);
  const setError = useResultsStore((s) => s.setError);
  const isComputing = useResultsStore((s) => s.isComputing);

  // Auto-select first fault tree
  useEffect(() => {
    const hasSelectedFT = model.faultTrees?.some(ft => ft.id === selectedFaultTreeId);
    if ((!selectedFaultTreeId || !hasSelectedFT) && model.faultTrees && model.faultTrees.length > 0) {
      selectFaultTree(model.faultTrees[0].id);
    }
  }, [model, selectedFaultTreeId, selectFaultTree]);

  // Auto-select first event tree
  useEffect(() => {
    const hasSelectedET = model.eventTrees?.some(et => et.id === selectedEventTreeId);
    if ((!selectedEventTreeId || !hasSelectedET) && model.eventTrees && model.eventTrees.length > 0) {
      selectEventTree(model.eventTrees[0].id);
    }
  }, [model, selectedEventTreeId, selectEventTree]);


  // Load saved theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('quantica-risk-theme') as 'dark' | 'light';
    const initialTheme = savedTheme || 'light';
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  // Update theme
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('quantica-risk-theme', newTheme);
  }, [theme]);

  // Load saved model on mount
  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  const onNodeSelect = useCallback((id: string | null, type: string | null, rawId?: string | null) => {
    setSelectedNodeId(id);
    setSelectedNodeType(type);
    setSelectedNodeRawId(rawId || id);
  }, []);

  // Run BDD/ET quantification via Worker
  const handleQuantify = useCallback(async () => {
    if (viewMode === 'et_editor') {
      if (!selectedEventTreeId) return;
      const et = model.eventTrees?.find((t) => t.id === selectedEventTreeId);
      if (!et) return;

      setComputing(true);
      try {
        const result = await runWorkerCommand<any>('QUANTIFY_ET', { model, targetId: selectedEventTreeId });
        setResult(selectedEventTreeId!, result);
        setViewMode('results');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'ET Quantification failed');
      } finally {
        setComputing(false);
      }
    } else {
      if (!selectedFaultTreeId) return;
      const ft = model.faultTrees?.find((t) => t.id === selectedFaultTreeId);
      if (!ft) return;

      setComputing(true);
      setViewMode('split');

      try {
        const result = await runWorkerCommand<any>('QUANTIFY_FT', { model, targetId: selectedFaultTreeId });
        setResult(selectedFaultTreeId!, result);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Quantification failed');
      } finally {
        setComputing(false);
      }
    }
  }, [model, viewMode, selectedFaultTreeId, selectedEventTreeId, setResult, setComputing, setError]);

  // Save
  const handleSave = useCallback(() => {
    saveToLocalStorage();
    // Also auto-save to active project if one is selected
    const { activeProjectId } = useProjectStore.getState();
    if (activeProjectId) {
      fetch(`/api/projects/${activeProjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: useModelStore.getState().model }),
      }).catch(console.error);
    }
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 2000);
  }, [saveToLocalStorage]);

  // Export Model
  const handleExportModel = useCallback(async () => {
    const defaultName = `${model.name || 'PRA_Model'}_${new Date().toISOString().slice(0, 10)}.json`;
    const dataStr = JSON.stringify(model, null, 2);

    // Try modern File System Access API (showSaveFilePicker) first for Explorer Dialog
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: defaultName,
          types: [{
            description: 'JSON Files',
            accept: {
              'application/json': ['.json'],
            },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(dataStr);
        await writable.close();
        return; // Success!
      } catch (err) {
        if ((err as Error).name === 'AbortError') return; // Cancelled by user
        console.error('File System Access API failed, falling back...', err);
      }
    }

    // Fallback: Standard browser download
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = defaultName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [model]);

  // Import Model
  const handleImportModel = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (!imported || typeof imported !== 'object') {
          throw new Error(locale === 'ja' ? '無効なJSON形式です' : 'Invalid JSON format');
        }
        if (!imported.faultTrees || !imported.eventTrees) {
          throw new Error(locale === 'ja' ? '有効なPRAモデルデータではありません' : 'Not a valid PRA model data');
        }

        useModelStore.getState().setModel(imported);

        const { activeProjectId } = useProjectStore.getState();
        if (activeProjectId) {
          fetch(`/api/projects/${activeProjectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: imported }),
          }).catch(console.error);
        }

        alert(locale === 'ja' ? 'モデルを正常にインポートしました！' : 'Model imported successfully!');
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Import failed');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [locale]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'q') {
        e.preventDefault();
        handleQuantify();
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        redo();
      }
      if (e.key === 'Delete' && selectedNodeId) {
        setModal({
          show: true,
          type: 'deleteNode',
          title: locale === 'ja' ? 'ノードの削除' : 'Delete Node',
          value: (selectedNodeRawId && selectedNodeRawId.includes('::')) ? 'local' : 'global',
          nodeId: selectedNodeId,
          rawNodeId: selectedNodeRawId || undefined,
          nodeType: selectedNodeType || 'basicEvent',
          onConfirm: (val: string, deleteMode?: 'local' | 'global') => {
            if (['andGate', 'orGate', 'atleastGate', 'topEvent'].includes(selectedNodeType || '')) {
              if (selectedFaultTreeId) removeGate(selectedFaultTreeId, selectedNodeId);
            } else {
              if (deleteMode === 'local' && selectedNodeRawId && selectedNodeRawId.includes('::') && selectedFaultTreeId) {
                const parentGateId = selectedNodeRawId.split('::')[0];
                useModelStore.getState().removeChildFromGate(selectedFaultTreeId, parentGateId, selectedNodeId);
              } else {
                removeBasicEvent(selectedNodeId);
              }
            }
            setSelectedNodeId(null);
            setSelectedNodeRawId(null);
            setSelectedNodeType(null);
          }
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave, handleQuantify, undo, redo, selectedNodeId, selectedNodeType, selectedFaultTreeId, removeGate, removeBasicEvent, locale]);

  const handleNewFT = useCallback(() => {
    setModal({
      show: true,
      type: 'new',
      title: locale === 'ja' ? '新しいFault Treeの作成' : 'Create New Fault Tree',
      value: 'New FT',
      onConfirm: (name) => {
        if (name.trim()) {
          addFaultTree(name.trim());
        }
      }
    });
  }, [locale, addFaultTree]);

  const handleRenameFT = useCallback(() => {
    if (!selectedFaultTreeId) return;
    const ft = model.faultTrees?.find(f => f.id === selectedFaultTreeId);
    if (!ft) return;

    setModal({
      show: true,
      type: 'rename',
      title: locale === 'ja' ? 'Fault Treeの名称変更' : 'Rename Fault Tree',
      value: ft.name,
      onConfirm: (name) => {
        if (name.trim()) {
          updateFaultTree(selectedFaultTreeId, { name: name.trim() });
        }
      }
    });
  }, [locale, selectedFaultTreeId, model.faultTrees, updateFaultTree]);

  const handleDeleteFT = useCallback(() => {
    if (!selectedFaultTreeId) return;
    if ((model.faultTrees?.length || 0) <= 1) {
      alert(locale === 'ja' ? '最後のFault Treeは削除できません' : 'Cannot delete the last Fault Tree');
      return;
    }

    setModal({
      show: true,
      type: 'delete',
      title: locale === 'ja' ? 'Fault Treeの削除' : 'Delete Fault Tree',
      value: '',
      onConfirm: () => {
        removeFaultTree(selectedFaultTreeId);
      }
    });
  }, [locale, selectedFaultTreeId, model.faultTrees, removeFaultTree]);

  const handleNewET = useCallback(() => {
    const ieId = model.initiatingEvents?.[0]?.id || crypto.randomUUID();
    setModal({
      show: true,
      type: 'new',
      title: locale === 'ja' ? '新しいEvent Treeの作成' : 'Create New Event Tree',
      value: 'New ET',
      onConfirm: (name) => {
        if (name.trim()) {
          addEventTree(name.trim(), ieId);
        }
      }
    });
  }, [locale, addEventTree, model.initiatingEvents]);

  const handleRenameET = useCallback(() => {
    if (!selectedEventTreeId) return;
    const et = model.eventTrees?.find(e => e.id === selectedEventTreeId);
    if (!et) return;

    setModal({
      show: true,
      type: 'rename',
      title: locale === 'ja' ? 'Event Treeの名称変更' : 'Rename Event Tree',
      value: et.name,
      onConfirm: (name) => {
        if (name.trim()) {
          updateEventTree(selectedEventTreeId, { name: name.trim() });
        }
      }
    });
  }, [locale, selectedEventTreeId, model.eventTrees, updateEventTree]);

  const handleDeleteET = useCallback(() => {
    if (!selectedEventTreeId) return;
    setModal({
      show: true,
      type: 'delete',
      title: locale === 'ja' ? 'Event Treeの削除' : 'Delete Event Tree',
      value: '',
      onConfirm: () => {
        removeEventTree(selectedEventTreeId);
      }
    });
  }, [locale, selectedEventTreeId, removeEventTree]);

  const handleHeaderAddRequest = useCallback((index?: number) => {
    if (!selectedEventTreeId) return;
    setModal({
      show: true,
      type: 'new',
      title: locale === 'ja' ? 'ヘッダー(Top Event)の追加' : 'Add Header (Top Event)',
      value: 'Header',
      onConfirm: (name) => {
        if (name.trim()) {
          const newFE = {
            id: crypto.randomUUID(),
            name: name.trim(),
            branches: [
              { id: 'success', label: locale === 'ja' ? '成功' : 'Success' },
              { id: 'failure', label: locale === 'ja' ? '失敗' : 'Failure' }
            ],
            code: ''
          };
          useModelStore.getState().addFunctionalEvent(selectedEventTreeId, newFE, index);
        }
      }
    });
  }, [locale, selectedEventTreeId]);

  const handleNodeDeleteRequest = useCallback((nodeId: string, nodeType: string, rawNodeId?: string) => {
    setModal({
      show: true,
      type: 'deleteNode',
      title: locale === 'ja' ? 'ノードの削除' : 'Delete Node',
      value: (rawNodeId && rawNodeId.includes('::')) ? 'local' : 'global',
      nodeId,
      rawNodeId,
      nodeType,
      onConfirm: (val: string, deleteMode?: 'local' | 'global') => {
        if (['andGate', 'orGate', 'atleastGate', 'topEvent'].includes(nodeType)) {
          if (selectedFaultTreeId) removeGate(selectedFaultTreeId, nodeId);
        } else {
          if (deleteMode === 'local' && rawNodeId && rawNodeId.includes('::') && selectedFaultTreeId) {
            const parentGateId = rawNodeId.split('::')[0];
            useModelStore.getState().removeChildFromGate(selectedFaultTreeId, parentGateId, nodeId);
          } else {
            removeBasicEvent(nodeId);
          }
        }
        if (selectedNodeId === nodeId) {
          setSelectedNodeId(null);
          setSelectedNodeRawId(null);
          setSelectedNodeType(null);
        }
      }
    });
  }, [locale, selectedFaultTreeId, removeGate, removeBasicEvent, selectedNodeId]);

  const handleEdgeDeleteRequest = useCallback((edges: any[]) => {
    setModal({
      show: true,
      type: 'deleteEdge',
      title: locale === 'ja' ? '接続線の削除' : 'Delete Connection',
      value: '',
      onConfirm: () => {
        if (selectedFaultTreeId) {
          edges.forEach(edge => {
            useModelStore.getState().removeChildFromGate(selectedFaultTreeId, edge.source, edge.target);
          });
        }
      }
    });
  }, [locale, selectedFaultTreeId]);

  const t = {
    quantify: locale === 'ja' ? '⚛ 定量化実行' : '⚛ Quantify',
    save: locale === 'ja' ? '💾 一時保存' : '💾 Save',
    projectManager: locale === 'ja' ? '📁 プロジェクト管理' : '📁 Projects',
    exportModel: locale === 'ja' ? '📤 モデル出力' : '📤 Export Model',
    importModel: locale === 'ja' ? '📥 モデル入力' : '📥 Import Model',
    editor: locale === 'ja' ? 'FTエディタ' : 'FT Editor',
    results: locale === 'ja' ? '結果' : 'Results',
    data: locale === 'ja' ? 'データ' : 'Data',
    split: locale === 'ja' ? '分割' : 'Split',
    etEditor: locale === 'ja' ? 'ETエディタ' : 'ET Editor',
    report: locale === 'ja' ? '報告書' : 'Report',
    seismic: locale === 'ja' ? '地震PRA' : 'Seismic PRA',
    quantification: locale === 'ja' ? '定量化' : 'Quantification',
    modelName: locale === 'ja' ? model.name : model.name,
    saved: locale === 'ja' ? '✓ 保存しました' : '✓ Saved',
  };

  return (
    <div className="app-layout">
      {/* ===== Header ===== */}
      <header className="app-header">
        <div 
          className="app-header__logo" 
          onClick={() => window.open('/pitch', '_blank')}
          style={{ cursor: 'pointer', paddingLeft: '12px' }}
          title={locale === 'ja' ? 'Quantica Riskの詳細を見る (新しいタブ)' : 'View Quantica Risk Details (New Tab)'}
        >
          <div className="app-header__logo-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70px', width: '126px', minHeight: '70px', minWidth: '126px', flexShrink: 0, background: 'none', border: 'none', boxShadow: 'none', zIndex: 101 }}>
            <QuanticaLogo theme={theme} style={{ height: '70px', width: '126px', minHeight: '70px', minWidth: '126px', flexShrink: 0 }} />
          </div>
          <span className="app-header__subtitle" style={{ marginLeft: '12px', borderLeft: '1px solid var(--border-default)', paddingLeft: '12px' }}>
            {locale === 'ja' ? 'Browser-Based PRA Engine' : 'Browser-Based PRA Engine'}
          </span>
          {isComputing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="computing-indicator">
                <div className="spinner-dot" />
                {locale === 'ja' ? '計算中...' : 'Calculating...'}
              </div>
              <button 
                onClick={() => {
                  if (window.confirm(locale === 'ja' ? '計算を中断しますか？' : 'Abort calculation?')) {
                    abortComputation();
                  }
                }}
                className="btn btn-ghost"
                style={{ 
                  height: '24px', 
                  padding: '0 10px', 
                  fontSize: '11px', 
                  color: 'var(--accent-red)', 
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                  background: 'rgba(239, 68, 68, 0.05)',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title={locale === 'ja' ? '計算中断' : 'Cancel Calculation'}
              >
                <span style={{ fontSize: '14px' }}>🛑</span>
                {locale === 'ja' ? '計算中断' : 'Abort'}
              </button>
            </div>
          )}
        </div>

        <div className="app-header__actions">
          <div className="toolbar__separator" />

          {/* View mode */}
          <div className="tabs" style={{ background: 'var(--bg-primary)' }}>
            <button className={`tab ${viewMode === 'editor' ? 'tab--active' : ''}`} onClick={() => { setViewMode('editor'); setEditorType('FT'); }}>{t.editor}</button>
            <button className={`tab ${viewMode === 'et_editor' ? 'tab--active' : ''}`} onClick={() => { setViewMode('et_editor'); setEditorType('ET'); }}>{t.etEditor}</button>
            <button 
              className={`tab ${viewMode === 'split' ? 'tab--active' : ''}`} 
              onClick={() => {
                if (viewMode === 'split') {
                  setViewMode(editorType === 'ET' ? 'et_editor' : 'editor');
                } else {
                  setViewMode('split');
                }
              }}
            >
              {viewMode === 'split' 
                ? (locale === 'ja' ? '分割解除' : 'Unsplit') 
                : t.split}
            </button>
            <button className={`tab ${viewMode === 'quantification' ? 'tab--active' : ''}`} onClick={() => setViewMode('quantification')}>{t.quantification}</button>
            <button className={`tab ${viewMode === 'results' ? 'tab--active' : ''}`} onClick={() => setViewMode('results')}>{t.results}</button>
            <button className={`tab ${viewMode === 'report' ? 'tab--active' : ''}`} onClick={() => setViewMode('report')}>{t.report}</button>
            <button className={`tab ${viewMode === 'seismic' ? 'tab--active' : ''}`} onClick={() => setViewMode('seismic')}>{t.seismic}</button>
            <button className={`tab ${viewMode === 'data' ? 'tab--active' : ''}`} onClick={() => setViewMode('data')}>{t.data}</button>
          </div>

          <div className="toolbar__separator" />

          {/* Presence UI */}
          {activeProjectId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 8px' }}>
              <div
                title={isConnected ? (locale === 'ja' ? 'オンライン' : 'Online') : (locale === 'ja' ? '接続中...' : 'Connecting...')}
                style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: isConnected ? 'var(--accent-green)' : 'var(--accent-amber)',
                  boxShadow: isConnected ? '0 0 8px var(--accent-green)' : 'none',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {users.slice(0, 2).map((u, i) => (
                  <div 
                    key={i} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 6, 
                      background: 'var(--bg-secondary)', 
                      padding: '3px 10px', 
                      borderRadius: 16, 
                      border: `1px solid ${u.color}40`,
                      boxShadow: `0 0 4px ${u.color}20`
                    }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: u.color }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {u.name === userName ? (locale === 'ja' ? '自分' : 'You') : u.name}
                    </span>
                  </div>
                ))}
                {users.length > 2 && (
                  <span style={{ fontSize: 11, opacity: 0.6, fontWeight: 600 }}>
                    +{users.length - 2} users
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="toolbar__separator" />

          {/* Undo/Redo */}
          <div className="btn-group">
            <button
              className="btn btn--ghost btn--sm"
              onClick={undo}
              disabled={past.length === 0}
              title={locale === 'ja' ? '元に戻す (Ctrl+Z)' : 'Undo (Ctrl+Z)'}
            >
              ↩
            </button>
            <button
              className="btn btn--ghost btn--sm"
              onClick={redo}
              disabled={future.length === 0}
              title={locale === 'ja' ? 'やり直し (Ctrl+Y)' : 'Redo (Ctrl+Y)'}
            >
              ↪
            </button>
          </div>

          <div className="toolbar__separator" />

          <div className="toolbar__separator" />

          {/* Save button */}
          <button className="btn btn--secondary" onClick={handleSave}>
            {t.save}
            {isDirty && <span style={{ color: 'var(--accent-amber)', marginLeft: 4 }}>●</span>}
          </button>

          {/* Project Manager button */}
          <button
            className="btn btn--secondary"
            onClick={() => setShowProjectManager(true)}
            style={{ fontWeight: 600 }}
          >
            {t.projectManager}
          </button>

          {/* Model Export / Import */}
          <button
            className="btn btn--secondary"
            onClick={handleExportModel}
            title={locale === 'ja' ? '現在のモデルをJSONファイルとして保存します' : 'Export current model as JSON'}
            style={{ fontWeight: 600 }}
          >
            {t.exportModel}
          </button>
          <button
            className="btn btn--secondary"
            onClick={() => document.getElementById('model-import-input')?.click()}
            title={locale === 'ja' ? 'JSONファイルからモデルを読み込みます' : 'Import model from JSON file'}
            style={{ fontWeight: 600 }}
          >
            {t.importModel}
          </button>
          <input
            id="model-import-input"
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImportModel}
          />

          <div className="toolbar__separator" />

          {/* PRA Episteme Link */}
          <button
            className="btn btn--secondary"
            title="PRA Knowledge Intelligence Platform"
            style={{ fontWeight: 600 }}
            onClick={() => window.open('https://pra-episteme.vercel.app/', '_blank', 'noopener,noreferrer')}
          >
            <span style={{ fontSize: '14px' }}>📖</span> 
            PRA Episteme
          </button>

          <div className="toolbar__separator" />

          {/* Theme switch */}
          <button
            className="btn btn--ghost btn--sm"
            onClick={toggleTheme}
            style={{ fontSize: '16px', minWidth: 36 }}
            title={locale === 'ja' ? 'テーマ切り替え' : 'Toggle Theme'}
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>

          {/* Language switch */}
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => setLocale(locale === 'ja' ? 'en' : 'ja')}
            style={{ fontWeight: 600, minWidth: 36 }}
          >
            {locale === 'ja' ? 'EN' : 'JA'}
          </button>
        </div>
      </header>

      {/* ===== Main Content ===== */}
      <main className="app-main" style={{ position: 'relative' }}>
        {/* Left Sidebar (Selector + Toolbox) */}
        {(viewMode === 'editor' || viewMode === 'split' || viewMode === 'et_editor') && (
          <div style={{ position: 'relative', display: 'flex', height: '100%', flexShrink: 0 }}>
            <aside className="toolbox" style={{
              width: leftPanelCollapsed ? '0px' : 'var(--sidebar-width)',
              minWidth: leftPanelCollapsed ? '0px' : 'var(--sidebar-width)',
              borderRight: leftPanelCollapsed ? 'none' : '1px solid var(--border-default)',
              overflow: 'hidden',
              transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
              opacity: leftPanelCollapsed ? 0 : 1
            }}>
              {/* FT/ET Selector Section */}
              <div className="toolbox__section" style={{ borderBottom: '1px solid var(--border-default)' }}>
                <div className="toolbox__section-title">
                  {editorType === 'ET' ? (locale === 'ja' ? 'Event Tree 選択' : 'Event Tree Selector') : (locale === 'ja' ? 'Fault Tree 選択' : 'Fault Tree Selector')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                  <input 
                    type="text" 
                    className="form-input form-input--sm" 
                    placeholder={locale === 'ja' ? 'モデルを検索...' : 'Search models...'}
                    value={modelSearchQuery}
                    onChange={(e) => setModelSearchQuery(e.target.value)}
                    style={{ width: '100%', fontSize: '12px' }}
                  />
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <select
                      className="form-select"
                      style={{ flex: 1, fontSize: '12px', height: '32px' }}
                      value={editorType === 'ET' ? (selectedEventTreeId ?? '') : (selectedFaultTreeId ?? '')}
                      onChange={(e) => {
                        if (editorType === 'ET') {
                          selectEventTree(e.target.value);
                        } else {
                          selectFaultTree(e.target.value);
                        }
                      }}
                    >
                      {editorType === 'ET' ? (
                        model.eventTrees
                          ?.filter(et => et.name.toLowerCase().includes(modelSearchQuery.toLowerCase()))
                          .map((et) => (
                            <option key={et.id} value={et.id}>{et.name}</option>
                          ))
                      ) : (
                        model.faultTrees
                          ?.filter(ft => ft.name.toLowerCase().includes(modelSearchQuery.toLowerCase()))
                          .map((ft) => (
                            <option key={ft.id} value={ft.id}>{ft.name}</option>
                          ))
                      )}
                    </select>
                  <button className="btn btn--secondary btn--sm" style={{ padding: '0 8px', minWidth: '32px' }} onClick={editorType === 'ET' ? handleNewET : handleNewFT} title={locale === 'ja' ? '新規作成' : 'New'}>+</button>
                  <button className="btn btn--secondary btn--sm" style={{ padding: '0 8px', minWidth: '32px' }} onClick={editorType === 'ET' ? handleRenameET : handleRenameFT} title={locale === 'ja' ? '名称変更' : 'Rename'}>✎</button>
                  <button className="btn btn--secondary btn--sm" style={{ padding: '0 8px', minWidth: '32px', color: 'var(--accent-red)' }} onClick={editorType === 'ET' ? handleDeleteET : handleDeleteFT} title={locale === 'ja' ? '削除' : 'Delete'}>×</button>
                </div>
                </div>
              </div>

              {/* Toolbox (only for FT) */}
              {editorType === 'FT' && (
                <ToolboxPanel locale={locale} />
              )}
              
              {/* ET Help Tips */}
              {editorType === 'ET' && (
                <div className="toolbox__section">
                  <div className="toolbox__section-title">
                    {locale === 'ja' ? '操作ヒント' : 'Tips'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.8 }}>
                    <div>📌 {locale === 'ja' ? 'シーケンスをクリックして分岐編集' : 'Click sequence to edit branches'}</div>
                    <div>🖱️ {locale === 'ja' ? 'パスをクリックで分岐を追加・削除' : 'Click path to add/remove branches'}</div>
                    <div>➕ {locale === 'ja' ? 'ヘッダーを右クリックで列の挿入・削除' : 'Right-click header to insert/remove columns'}</div>
                    <div>⌨️ {locale === 'ja' ? 'Ctrl+S:保存 / Ctrl+Z:元に戻す / Ctrl+Y:やり直し' : 'Ctrl+S:Save / Ctrl+Z:Undo / Ctrl+Y:Redo'}</div>
                    <div>📸 {locale === 'ja' ? '右上のボタンでSVG書き出し' : 'SVG export button at top-right'}</div>
                  </div>
                </div>
              )}
            </aside>
            <button
              onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
              style={{
                position: 'absolute',
                right: '-20px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                width: '20px',
                height: '48px',
                borderRadius: '0 8px 8px 0',
                background: 'rgba(99, 102, 241, 0.05)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderLeft: 'none',
                backdropFilter: 'blur(4px)',
                color: 'rgba(255, 255, 255, 0.6)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s, color 0.2s, border-color 0.2s',
                boxShadow: 'none',
                fontSize: '10px',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.95)';
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                e.currentTarget.style.boxShadow = '0 0 12px rgba(99, 102, 241, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.05)';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.2)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              title={leftPanelCollapsed ? (locale === 'ja' ? 'パネルを展開' : 'Expand Panel') : (locale === 'ja' ? 'パネルを折りたたむ' : 'Collapse Panel')}
            >
              {leftPanelCollapsed ? '▶' : '◀'}
            </button>
          </div>
        )}

        {/* FT Canvas */}
        {((viewMode === 'editor' || viewMode === 'split') && editorType === 'FT') && (
          <div className="canvas-wrapper" style={{ flex: 1, position: 'relative', height: '100%', minHeight: 0, minWidth: '400px', width: '100%' }}>
            <FaultTreeCanvas
              onNodeSelect={onNodeSelect}
              onNodeDeleteRequest={handleNodeDeleteRequest}
              onEdgeDeleteRequest={handleEdgeDeleteRequest}
              onQuantifySuccess={() => setViewMode('split')}
              locale={locale}
            />
          </div>
        )}

        {/* ET Canvas */}
        {((viewMode === 'et_editor' || viewMode === 'split') && editorType === 'ET') && (
          <div className="canvas-wrapper" style={{ flex: 1, position: 'relative', height: '100%', minHeight: 0, minWidth: '400px', width: '100%' }}>
            <EventTreeCanvas
              onNodeSelect={onNodeSelect}
              onHeaderAddRequest={handleHeaderAddRequest}
              onQuantifySuccess={() => setViewMode('split')}
              onJumpToFT={(ftId) => {
                selectFaultTree(ftId);
                setEditorType('FT');
                // Keep viewMode as is (could be 'et_editor' or 'split')
                // If it was 'et_editor', change to 'editor'
                if (viewMode === 'et_editor') setViewMode('editor');
              }}
              locale={locale}
            />
          </div>
        )}

        {/* Seismic Dashboard */}
        {viewMode === 'seismic' && (
          <div className="canvas-wrapper" style={{ flex: 1, position: 'relative', height: '100%', minHeight: 0, width: '100%' }}>
            <SeismicDashboard locale={locale} />
          </div>
        )}

        {/* Sidebar (Property Panel + Validation) */}
        {(viewMode === 'editor' || viewMode === 'et_editor' || (viewMode === 'split' && selectedNodeId)) && (
          <div style={{ position: 'relative', display: 'flex', height: '100%', flexShrink: 0 }}>
            {/* 右側パネル開閉トグルボタン */}
            <button
              onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
              style={{
                position: 'absolute',
                left: '-20px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                width: '20px',
                height: '48px',
                borderRadius: '8px 0 0 8px',
                background: 'rgba(99, 102, 241, 0.05)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRight: 'none',
                backdropFilter: 'blur(4px)',
                color: 'rgba(255, 255, 255, 0.6)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s, color 0.2s, border-color 0.2s',
                boxShadow: 'none',
                fontSize: '10px',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.95)';
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                e.currentTarget.style.boxShadow = '0 0 12px rgba(99, 102, 241, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.05)';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.2)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              title={rightPanelCollapsed ? (locale === 'ja' ? 'パネルを展開' : 'Expand Panel') : (locale === 'ja' ? 'パネルを折りたたむ' : 'Collapse Panel')}
            >
              {rightPanelCollapsed ? '◀' : '▶'}
            </button>

            {/* パネルコンテンツ本体 */}
            <div style={{
              width: rightPanelCollapsed ? '0px' : '320px',
              minWidth: rightPanelCollapsed ? '0px' : '320px',
              display: 'flex',
              flexDirection: 'column',
              borderLeft: rightPanelCollapsed ? 'none' : '1px solid var(--border-default)',
              background: 'var(--bg-primary)',
              overflow: 'hidden',
              transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
              opacity: rightPanelCollapsed ? 0 : 1
            }}>
              <div style={{ flex: '0 1 auto', overflowY: 'auto', borderBottom: '1px solid var(--border-default)' }}>
                {(viewMode === 'editor' || (viewMode === 'split' && editorType === 'FT')) && (
                  <PropertyPanel
                    selectedNodeId={selectedNodeId}
                    selectedNodeType={selectedNodeType}
                    selectedFaultTreeId={selectedFaultTreeId}
                    selectedNodeRawId={selectedNodeRawId}
                    onNodeSelect={(id, type, rawId) => {
                      setSelectedNodeId(id);
                      setSelectedNodeType(type);
                      setSelectedNodeRawId(rawId ?? null);
                    }}
                    locale={locale}
                  />
                )}
                {(viewMode === 'et_editor' || (viewMode === 'split' && editorType === 'ET')) && (
                  <ETPropertyPanel
                    selectedNodeId={selectedNodeId}
                    selectedNodeType={selectedNodeType}
                    locale={locale}
                    onNodeSelect={(id, type) => {
                      setSelectedNodeId(id);
                      setSelectedNodeType(type);
                    }}
                  />
                )}
              </div>
              <div style={{ flex: '1 1 auto', overflowY: 'auto' }}>
                <ValidationPanel locale={locale} />
              </div>
            </div>
          </div>
        )}

        {/* Results Panel */}
        {(viewMode === 'results' || viewMode === 'split') && (
          <div style={{
            width: viewMode === 'split' ? '45%' : '100%',
            minWidth: viewMode === 'split' ? '450px' : 'none',
            borderLeft: viewMode === 'split' ? '1px solid var(--border-default)' : 'none',
            background: 'var(--bg-primary)',
            overflow: 'auto',
            height: '100%',
          }}>
            <ResultsDashboard locale={locale} />
          </div>
        )}

        {/* Quantification Settings */}
        {viewMode === 'quantification' && (
          <div style={{ flex: 1, background: 'var(--bg-primary)', overflow: 'auto' }}>
            <QuantificationPanel locale={locale} onNavigateToResults={() => setViewMode('results')} />
          </div>
        )}

        {/* Report View */}
        {viewMode === 'report' && (
          <div style={{ flex: 1, background: 'var(--bg-secondary)', overflow: 'hidden', display: 'flex' }}>
            {/* Report Configuration Sidebar */}
            <aside style={{ width: '280px', background: 'var(--bg-primary)', borderRight: '1px solid var(--border-default)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  {locale === 'ja' ? 'レポート構成' : 'Report Config'}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { id: 'showExecSummary', label: locale === 'ja' ? 'エグゼクティブ・サマリー' : 'Executive Summary' },
                    { id: 'showBasicInfo', label: locale === 'ja' ? '基本情報' : 'Basic Information' },
                    { id: 'showQuantResult', label: locale === 'ja' ? '定量化結果' : 'Quantification Result' },
                    { id: 'showUncertainty', label: locale === 'ja' ? '不確かさ解析' : 'Uncertainty Analysis' },
                    { id: 'showMCS', label: locale === 'ja' ? '最小カットセット (MCS)' : 'Minimal Cut Sets' },
                  ].map(opt => (
                    <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px' }}>
                      <input 
                         type="checkbox" 
                        checked={(reportOptions as any)[opt.id]} 
                        onChange={(e) => setReportOptions({ ...reportOptions, [opt.id]: e.target.checked })}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 'auto' }}>
                <button 
                  className="btn btn--primary" 
                  onClick={() => window.print()}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', fontWeight: 600 }}
                >
                  📄 {locale === 'ja' ? 'PDF/印刷を実行' : 'Print to PDF'}
                </button>
              </div>
            </aside>

            {/* Preview Area */}
            <div style={{ flex: 1, overflow: 'auto', padding: '40px' }}>
              <div style={{ maxWidth: '900px', margin: '0 auto', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', background: 'white' }}>
                <AnalysisReport locale={locale} options={reportOptions} />
              </div>
            </div>
          </div>
        )}

        {/* Remote Cursors Overlay */}
        {isConnected && users.map((u, i) => {
          if (!u.cursor || u.name === userName || u.cursor.view !== viewMode) return null;
          return (
            <div
              key={i}
              style={{
                position: 'fixed',
                left: u.cursor.x,
                top: u.cursor.y,
                pointerEvents: 'none',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                transition: 'left 0.1s linear, top 0.1s linear',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5.5 15L8 9L14 6.5L1 1Z" fill={u.color} stroke="white" strokeWidth="1" strokeLinejoin="round" />
              </svg>
              <div style={{
                background: u.color,
                color: 'white',
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: '0 4px 4px 4px',
                marginTop: 2,
                fontWeight: 600,
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                whiteSpace: 'nowrap'
              }}>
                {u.name}
              </div>
            </div>
          );
        })}

        {/* Data Panel */}
        {viewMode === 'data' && (
          <div style={{ flex: 1, background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 16px 0 16px', borderBottom: '1px solid var(--border-default)' }}>
              <div className="tabs" style={{ background: 'transparent' }}>
                <button className={`tab ${dataViewTab === 'faultTrees' ? 'tab--active' : ''}`} onClick={() => setDataViewTab('faultTrees')}>
                  🌿 {locale === 'ja' ? 'Fault Trees' : 'Fault Trees'}
                </button>
                <button className={`tab ${dataViewTab === 'eventTrees' ? 'tab--active' : ''}`} onClick={() => setDataViewTab('eventTrees')}>
                  🌳 {locale === 'ja' ? 'Event Trees' : 'Event Trees'}
                </button>
                <button className={`tab ${dataViewTab === 'basicEvents' ? 'tab--active' : ''}`} onClick={() => setDataViewTab('basicEvents')}>
                  {locale === 'ja' ? '基事象' : 'Basic Events'}
                </button>
                <button className={`tab ${dataViewTab === 'initiatingEvents' ? 'tab--active' : ''}`} onClick={() => setDataViewTab('initiatingEvents')}>
                  {locale === 'ja' ? '起因事象' : 'Initiating Events'}
                </button>
                <button className={`tab ${dataViewTab === 'parameters' ? 'tab--active' : ''}`} onClick={() => setDataViewTab('parameters')}>
                  {locale === 'ja' ? '故障率データ' : 'Failure Rate Data'}
                </button>
                <button className={`tab ${dataViewTab === 'ccf' ? 'tab--active' : ''}`} onClick={() => setDataViewTab('ccf')}>
                  {locale === 'ja' ? '共通原因故障 (CCF)' : 'CCF Groups'}
                </button>
                <button className={`tab ${dataViewTab === 'endStates' ? 'tab--active' : ''}`} onClick={() => setDataViewTab('endStates')}>
                  {locale === 'ja' ? '終状態データベース' : 'End States'}
                </button>
                <button className={`tab ${dataViewTab === 'flags' ? 'tab--active' : ''}`} onClick={() => setDataViewTab('flags')}>
                  🚩 {locale === 'ja' ? 'フラグ設定' : 'Flags'}
                </button>
                <button className={`tab ${dataViewTab === 'recovery' ? 'tab--active' : ''}`} onClick={() => setDataViewTab('recovery')}>
                  🩹 {locale === 'ja' ? 'リカバリールール' : 'Recovery Rules'}
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {dataViewTab === 'faultTrees' && <FaultTreeTable locale={locale} onOpenFT={(id) => { selectFaultTree(id); setEditorType('FT'); setViewMode('editor'); }} />}
              {dataViewTab === 'eventTrees' && <EventTreeTable locale={locale} onOpenET={(id) => { selectEventTree(id); setEditorType('ET'); setViewMode('et_editor'); }} />}
              {dataViewTab === 'basicEvents' && <BasicEventTable locale={locale} highlightedId={highlightedEntityId} onNavigateToFT={(ftId, nodeId) => { selectFaultTree(ftId); setEditorType('FT'); setViewMode('editor'); if (nodeId) { setSelectedNodeId(nodeId); setSelectedNodeType('basicEvent'); } }} />}
              {dataViewTab === 'initiatingEvents' && <InitiatingEventTable locale={locale} />}
              {dataViewTab === 'parameters' && <ParameterTable locale={locale} />}
              {dataViewTab === 'ccf' && <CCFGroupTable locale={locale} highlightedId={highlightedEntityId} />}
              {dataViewTab === 'endStates' && <EndStateTable locale={locale} />}
              {dataViewTab === 'flags' && <FlagGroupTable locale={locale} highlightedId={highlightedEntityId} />}
              {dataViewTab === 'recovery' && <RecoveryRuleTable locale={locale} highlightedId={highlightedEntityId} />}
            </div>
          </div>
        )}
      </main>

      {/* Custom Modal */}
      {modal.show && (
        <div className="modal-overlay" onClick={() => setModal({ ...modal, show: false })}>
          <div className="modal-content animate-slideIn" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{modal.title}</span>
              <button className="modal-close" onClick={() => setModal({ ...modal, show: false })}>×</button>
            </div>
            <div className="modal-body">
              {modal.type === 'delete' || modal.type === 'deleteNode' || modal.type === 'deleteEdge' ? (
                <div style={{ padding: '10px 0', color: 'var(--text-primary)' }}>
                  {modal.type === 'deleteNode' && !['andGate', 'orGate', 'atleastGate', 'topEvent'].includes(modal.nodeType || '') ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ fontWeight: 600 }}>
                        {locale === 'ja' ? '基事象の削除方法を選択してください：' : 'Select how to delete this Basic Event:'}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: modal.rawNodeId?.includes('::') ? 'pointer' : 'not-allowed', padding: '8px', background: 'var(--bg-secondary)', borderRadius: '6px', border: modal.value === 'local' ? '1px solid var(--accent-blue)' : '1px solid transparent', opacity: modal.rawNodeId?.includes('::') ? 1 : 0.5 }}>
                          <input type="radio" name="deleteMode" value="local" checked={modal.value === 'local'} onChange={() => setModal({ ...modal, value: 'local' })} disabled={!modal.rawNodeId?.includes('::')} />
                          <div>
                            <div style={{ fontWeight: 600 }}>{locale === 'ja' ? '選択した場所のみ削除 (ローカル)' : 'Delete from selected location only (Local)'}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{locale === 'ja' ? '現在のゲートからの接続のみを解除します。モデル全体には残ります。' : 'Removes connection from current gate only. Keeps event in the model.'}</div>
                          </div>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px', background: 'var(--bg-secondary)', borderRadius: '6px', border: modal.value === 'global' ? '1px solid var(--accent-red)' : '1px solid transparent' }}>
                          <input type="radio" name="deleteMode" value="global" checked={modal.value === 'global'} onChange={() => setModal({ ...modal, value: 'global' })} />
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--accent-red)' }}>{locale === 'ja' ? 'モデル全体から削除 (グローバル)' : 'Delete from entire model (Global)'}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{locale === 'ja' ? 'すべてのFault Treeからこの事象を完全に削除します。' : 'Completely removes this event from all Fault Trees.'}</div>
                          </div>
                        </label>
                      </div>
                    </div>
                  ) : (
                    locale === 'ja'
                      ? 'このアイテムを削除してもよろしいですか？'
                      : 'Are you sure you want to delete this item?'
                  )}
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">{locale === 'ja' ? '名称' : 'Name'}</label>
                  <input
                    className="form-input"
                    autoFocus
                    value={modal.value}
                    onChange={(e) => setModal({ ...modal, value: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        modal.onConfirm(modal.value);
                        setModal({ ...modal, show: false });
                      }
                    }}
                  />
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn--secondary" onClick={() => setModal({ ...modal, show: false })}>
                {locale === 'ja' ? 'キャンセル' : 'Cancel'}
              </button>
              <button
                className={`btn ${modal.type === 'delete' || modal.type === 'deleteNode' || modal.type === 'deleteEdge' ? 'btn--danger' : 'btn--primary'}`}
                onClick={() => {
                  if (modal.type === 'deleteNode' && !['andGate', 'orGate', 'atleastGate', 'topEvent'].includes(modal.nodeType || '')) {
                    modal.onConfirm(modal.value, (modal.value || 'local') as 'local' | 'global');
                  } else {
                    modal.onConfirm(modal.value);
                  }
                  setModal({ ...modal, show: false });
                }}
              >
                {modal.type === 'delete' || modal.type === 'deleteNode' || modal.type === 'deleteEdge'
                  ? (locale === 'ja' ? '削除実行' : 'Delete')
                  : (locale === 'ja' ? '保存' : 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Manager Modal */}
      {showProjectManager && (
        <ProjectManager
          locale={locale}
          onClose={() => setShowProjectManager(false)}
          onNavigate={(target: NavigationTarget) => {
            // Close modal
            setShowProjectManager(false);

            // Switch view
            setViewMode(target.view as ViewMode);

            // Select appropriate tree
            if (target.faultTreeId) {
              selectFaultTree(target.faultTreeId);
            }
            if (target.eventTreeId) {
              selectEventTree(target.eventTreeId);
            }

            // Select node (for FT editor)
            if (target.nodeId) {
              setSelectedNodeId(target.nodeId);
              setSelectedNodeType(target.nodeType || null);
            }

            // Switch data tab
            if (target.dataTab) {
              setDataViewTab(target.dataTab);
            }

            // Set highlight (will be cleared after animation)
            if (target.highlightId) {
              setHighlightedEntityId(target.highlightId);
              // Clear highlight after animation completes
              setTimeout(() => setHighlightedEntityId(null), 3000);
            }
          }}
        />
      )}

      {/* ===== Floating Feedback Trigger ===== */}
      <button
        onClick={() => setShowFeedbackModal(true)}
        title={locale === 'ja' ? '要望・不具合を報告する' : 'Report request / bug'}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9000,
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent-blue), #2563eb)',
          color: 'white',
          border: 'none',
          boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '22px',
          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
        onMouseOver={e => {
          e.currentTarget.style.transform = 'scale(1.1) translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 12px 32px rgba(37, 99, 235, 0.5)';
        }}
        onMouseOut={e => {
          e.currentTarget.style.transform = 'scale(1) translateY(0)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(37, 99, 235, 0.4)';
        }}
      >
        💬
      </button>

      {/* ===== Feedback Modal ===== */}
      <FeedbackModal 
        isOpen={showFeedbackModal} 
        onClose={() => setShowFeedbackModal(false)} 
        locale={locale} 
      />
    </div>
  );
}
