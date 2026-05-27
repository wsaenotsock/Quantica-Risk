'use client';

import React, { useState } from 'react';
import { useModelStore } from '@/store/modelStore';
import type { RecoveryGroup, RecoveryRule, RecoveryAction } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

interface RecoveryRuleTableProps {
  locale?: 'ja' | 'en';
  highlightedId?: string | null;
}

export default function RecoveryRuleTable({ locale = 'ja', highlightedId }: RecoveryRuleTableProps) {
  const model = useModelStore((s) => s.model);
  const addRecoveryGroup = useModelStore((s) => s.addRecoveryGroup);
  const updateRecoveryGroup = useModelStore((s) => s.updateRecoveryGroup);
  const removeRecoveryGroup = useModelStore((s) => s.removeRecoveryGroup);
  const setModel = useModelStore((s) => s.setModel);

  const [searchTerm, setSearchTerm] = useState('');
  const [newCondInput, setNewCondInput] = useState<Record<string, string>>({});

  const recoveryGroups = model.recoveryGroups || [];
  const filteredGroups = recoveryGroups.filter(rg => 
    rg.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleActive = (id: string) => {
    const newActiveId = model.activeRecoveryGroupId === id ? undefined : id;
    setModel({ ...model, activeRecoveryGroupId: newActiveId });
  };

  const handleAddRule = (groupId: string) => {
    const group = recoveryGroups.find(g => g.id === groupId);
    if (!group) return;

    const newRule: RecoveryRule = {
      id: uuidv4(),
      name: locale === 'ja' ? '新規リカバリールール' : 'New Recovery Rule',
      condition: [],
      action: 'add',
      priority: 10
    };

    updateRecoveryGroup(groupId, {
      rules: [...(group.rules || []), newRule]
    });
  };

  const handleUpdateRule = (groupId: string, ruleId: string, updates: Partial<RecoveryRule>) => {
    const group = recoveryGroups.find(g => g.id === groupId);
    if (!group) return;

    const newRules = (group.rules || []).map(r => r.id === ruleId ? { ...r, ...updates } : r);
    updateRecoveryGroup(groupId, { rules: newRules });
  };

  const handleRemoveRule = (groupId: string, ruleId: string) => {
    const group = recoveryGroups.find(g => g.id === groupId);
    if (!group) return;

    const newRules = (group.rules || []).filter(r => r.id !== ruleId);
    updateRecoveryGroup(groupId, { rules: newRules });
  };

  const handleToggleCondition = (groupId: string, ruleId: string, eventId: string) => {
    const group = recoveryGroups.find(g => g.id === groupId);
    if (!group) return;

    const rule = (group.rules || []).find(r => r.id === ruleId);
    if (!rule) return;

    const newCondition = rule.condition.includes(eventId)
      ? rule.condition.filter(id => id !== eventId)
      : [...rule.condition, eventId];

    handleUpdateRule(groupId, ruleId, { condition: newCondition });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input 
            className="form-input" 
            placeholder={locale === 'ja' ? 'リカバリーグループを検索...' : 'Search recovery groups...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ maxWidth: '300px' }}
          />
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
             {locale === 'ja' 
               ? `現在の有効グループ: ${recoveryGroups.find(g => g.id === model.activeRecoveryGroupId)?.name || 'なし'}` 
               : `Active Group: ${recoveryGroups.find(g => g.id === model.activeRecoveryGroupId)?.name || 'None'}`}
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            const newGroup: RecoveryGroup = {
              id: uuidv4(),
              name: locale === 'ja' ? '新規リカバリーグループ' : 'New Recovery Group',
              description: locale === 'ja' ? '新規追加されたグループです。' : 'A newly added group.',
              rules: []
            };
            addRecoveryGroup(newGroup);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {locale === 'ja' ? 'リカバリーグループを追加' : 'Add Recovery Group'}
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {filteredGroups.map((group) => (
            <div 
              key={group.id} 
              className={`card ${model.activeRecoveryGroupId === group.id ? 'card--active' : ''}`}
              style={{ 
                border: '1px solid var(--border-default)', 
                borderRadius: '8px', 
                background: 'var(--bg-secondary)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.2s ease',
                boxShadow: model.activeRecoveryGroupId === group.id ? '0 0 0 2px var(--accent-blue-alpha)' : 'none'
              }}
            >
              <div style={{ 
                padding: '12px 16px', 
                borderBottom: '1px solid var(--border-default)', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                background: model.activeRecoveryGroupId === group.id ? 'var(--accent-blue-alpha)' : 'transparent'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <input 
                    className="form-input" 
                    value={group.name} 
                    onChange={(e) => updateRecoveryGroup(group.id, { name: e.target.value })}
                    style={{ 
                      background: 'transparent', 
                      border: 'none', 
                      fontWeight: 600, 
                      fontSize: '14px',
                      padding: '2px 4px',
                      width: '240px'
                    }}
                  />
                  <input 
                    className="form-input" 
                    value={group.description || ''} 
                    placeholder={locale === 'ja' ? '説明を追加...' : 'Add description...'}
                    onChange={(e) => updateRecoveryGroup(group.id, { description: e.target.value })}
                    style={{ 
                      background: 'transparent', 
                      border: 'none', 
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                      padding: '2px 4px',
                      flex: 1,
                      marginLeft: '12px'
                    }}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', cursor: 'pointer', marginLeft: '12px', userSelect: 'none' }}>
                    <input 
                      type="checkbox" 
                      checked={model.activeRecoveryGroupId === group.id} 
                      onChange={() => toggleActive(group.id)}
                    />
                    {locale === 'ja' ? '有効にする' : 'Activate'}
                  </label>
                  {model.activeRecoveryGroupId === group.id && (
                    <span className="badge badge--success" style={{ fontSize: '9px', padding: '2px 6px', marginLeft: '8px' }}>
                      {locale === 'ja' ? '解析適用中' : 'ACTIVE'}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (confirm(locale === 'ja' ? `リカバリーグループ "${group.name}" を削除しますか？\n内包されているすべてのリカバリールールが削除されます。` : `Delete recovery group "${group.name}"?\nAll nested recovery rules will be deleted.`)) {
                      removeRecoveryGroup(group.id);
                    }
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-danger)', cursor: 'pointer', padding: '4px', marginLeft: '12px' }}
                >
                  <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              
              <div style={{ padding: '12px', flex: 1 }}>
                {(!group.rules || group.rules.length === 0) ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    {locale === 'ja' ? 'このグループにはリカバリールールが登録されていません。' : 'No recovery rules registered in this group.'}
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-default)', textAlign: 'left', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '8px', width: '180px' }}>{locale === 'ja' ? '名称' : 'Name'}</th>
                        <th style={{ padding: '8px' }}>{locale === 'ja' ? '条件 (AND)' : 'Condition (AND)'}</th>
                        <th style={{ padding: '8px', width: '120px' }}>{locale === 'ja' ? 'アクション' : 'Action'}</th>
                        <th style={{ padding: '8px', width: '150px' }}>{locale === 'ja' ? '対象事象' : 'Target Event'}</th>
                        <th style={{ padding: '8px', width: '90px' }}>{locale === 'ja' ? '確率' : 'Prob.'}</th>
                        <th style={{ padding: '8px', width: '70px' }}>{locale === 'ja' ? '優先度' : 'Priority'}</th>
                        <th style={{ padding: '8px', width: '40px', textAlign: 'center' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.rules.map((rule) => {
                        const isHighlighted = highlightedId ? (
                          rule.id === highlightedId ||
                          rule.condition.includes(highlightedId) ||
                          rule.targetEventId === highlightedId ||
                          model.basicEvents.find(be => be.id === highlightedId)?.eventId === rule.targetEventId ||
                          rule.condition.some(cid => model.basicEvents.find(be => be.id === cid)?.eventId === highlightedId)
                        ) : false;
                        return (
                          <tr key={rule.id} style={{ 
                            borderBottom: '1px solid var(--border-default)',
                            background: isHighlighted ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
                            transition: 'background 0.3s ease'
                          }}>
                            <td style={{ padding: '4px' }}>
                              <input 
                                className="form-input" 
                                value={rule.name} 
                                onChange={(e) => handleUpdateRule(group.id, rule.id, { name: e.target.value })}
                                style={{ background: 'transparent', border: 'none', padding: '2px 4px', fontWeight: 600, width: '100%' }}
                              />
                            </td>
                            <td style={{ padding: '4px' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', minHeight: '28px', alignItems: 'center' }}>
                                {rule.condition.map(cid => {
                                  const foundBe = model.basicEvents.find(be => be.id === cid || be.eventId === cid);
                                  return (
                                    <span 
                                      key={cid} 
                                      style={{ 
                                        background: 'var(--accent-blue-alpha)', 
                                        padding: '2px 6px', 
                                        borderRadius: '4px', 
                                        fontSize: '11px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                    >
                                      {foundBe ? `[${foundBe.eventId || foundBe.id}] ${foundBe.name}` : cid}
                                      <span 
                                        style={{ cursor: 'pointer', opacity: 0.6, marginLeft: '4px' }} 
                                        onClick={() => handleToggleCondition(group.id, rule.id, cid)}
                                      >×</span>
                                    </span>
                                  );
                                })}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <input
                                    list={`event-list-rec-cond-${rule.id}`}
                                    className="form-input form-input--mono"
                                    placeholder={locale === 'ja' ? 'ID入力/選択...' : 'Enter/select ID...'}
                                    value={newCondInput[rule.id] || ''}
                                    onChange={(e) => setNewCondInput(prev => ({ ...prev, [rule.id]: e.target.value }))}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const val = (newCondInput[rule.id] || '').trim();
                                        if (val) {
                                          handleToggleCondition(group.id, rule.id, val);
                                          setNewCondInput(prev => ({ ...prev, [rule.id]: '' }));
                                        }
                                      }
                                    }}
                                    style={{ width: '120px', padding: '2px 4px', fontSize: '11px', border: '1px dashed var(--border-default)', background: 'transparent' }}
                                  />
                                  <datalist id={`event-list-rec-cond-${rule.id}`}>
                                    {model.basicEvents.map(be => (
                                      <option key={be.id} value={be.eventId || be.id}>
                                        {be.eventId ? `[${be.eventId}] ${be.name}` : be.name}
                                      </option>
                                    ))}
                                  </datalist>
                                  <button
                                    type="button"
                                    className="btn btn--secondary btn--sm"
                                    onClick={() => {
                                      const val = (newCondInput[rule.id] || '').trim();
                                      if (val) {
                                        handleToggleCondition(group.id, rule.id, val);
                                        setNewCondInput(prev => ({ ...prev, [rule.id]: '' }));
                                      }
                                    }}
                                    style={{ padding: '2px 6px', fontSize: '10px', height: '22px' }}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '4px' }}>
                              <select
                                className="form-select"
                                value={rule.action}
                                onChange={(e) => handleUpdateRule(group.id, rule.id, { action: e.target.value as RecoveryAction })}
                                style={{ background: 'transparent', border: 'none', padding: '2px 4px', fontSize: '11px', width: '100%' }}
                              >
                                <option value="add">{locale === 'ja' ? '追加 (Add)' : 'Add'}</option>
                                <option value="remove">{locale === 'ja' ? '削除 (Remove)' : 'Remove'}</option>
                                <option value="replace">{locale === 'ja' ? '置換 (Replace)' : 'Replace'}</option>
                                <option value="set_probability">{locale === 'ja' ? '確率設定' : 'Set Prob'}</option>
                              </select>
                            </td>
                            <td style={{ padding: '4px' }}>
                              {rule.action !== 'remove' && rule.action !== 'set_probability' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <input
                                    list={`event-list-rec-target-${rule.id}`}
                                    className="form-input form-input--mono"
                                    value={rule.targetEventId || ''}
                                    onChange={(e) => handleUpdateRule(group.id, rule.id, { targetEventId: e.target.value })}
                                    placeholder={locale === 'ja' ? 'ID直接入力または選択...' : 'Type or select ID...'}
                                    style={{ padding: '2px 6px', fontSize: '11px', width: '100%', background: 'transparent', border: 'none' }}
                                  />
                                  <datalist id={`event-list-rec-target-${rule.id}`}>
                                    {model.basicEvents.map(be => (
                                      <option key={be.id} value={be.eventId || be.id}>
                                        {be.eventId ? `[${be.eventId}] ${be.name}` : be.name}
                                      </option>
                                    ))}
                                  </datalist>
                                  {(() => {
                                    const foundBe = model.basicEvents.find(be => be.eventId === rule.targetEventId || be.id === rule.targetEventId);
                                    return foundBe ? (
                                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)', paddingLeft: '4px' }}>
                                        🏷️ {foundBe.name}
                                      </span>
                                    ) : null;
                                  })()}
                                </div>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '11px', paddingLeft: '8px' }}>N/A</span>
                              )}
                            </td>
                            <td style={{ padding: '4px' }}>
                              <input 
                                className="form-input td-mono" 
                                type="number"
                                step="0.0001"
                                value={rule.probability ?? ''} 
                                onChange={(e) => handleUpdateRule(group.id, rule.id, { probability: e.target.value ? parseFloat(e.target.value) : undefined })}
                                placeholder="1.0"
                                style={{ background: 'transparent', border: 'none', padding: '2px 4px', width: '100%' }}
                              />
                            </td>
                            <td style={{ padding: '4px' }}>
                              <input 
                                className="form-input td-mono" 
                                type="number"
                                value={rule.priority} 
                                onChange={(e) => handleUpdateRule(group.id, rule.id, { priority: parseInt(e.target.value) || 0 })}
                                style={{ background: 'transparent', border: 'none', padding: '2px 4px', width: '100%' }}
                              />
                            </td>
                            <td style={{ padding: '4px', textAlign: 'center' }}>
                              <button
                                onClick={() => {
                                  if (confirm(locale === 'ja' ? `ルール "${rule.name}" を削除しますか？` : `Delete rule "${rule.name}"?`)) {
                                    handleRemoveRule(group.id, rule.id);
                                  }
                                }}
                                style={{ background: 'none', border: 'none', color: 'var(--text-danger)', cursor: 'pointer', padding: '4px' }}
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => handleAddRule(group.id)}
                  style={{ marginTop: '12px', width: '100%', fontSize: '11px' }}
                >
                  + {locale === 'ja' ? 'ルールを追加' : 'Add Rule'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
