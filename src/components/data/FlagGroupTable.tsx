'use client';

import React, { useState } from 'react';
import { useModelStore } from '@/store/modelStore';
import type { FlagGroup, FlagItem } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

interface FlagGroupTableProps {
  locale?: 'ja' | 'en';
  highlightedId?: string | null;
}

export default function FlagGroupTable({ locale = 'ja', highlightedId }: FlagGroupTableProps) {
  const model = useModelStore((s) => s.model);
  const addFlagGroup = useModelStore((s) => s.addFlagGroup);
  const updateFlagGroup = useModelStore((s) => s.updateFlagGroup);
  const removeFlagGroup = useModelStore((s) => s.removeFlagGroup);
  const setModel = useModelStore((s) => s.setModel);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  const flagGroups = model.flagGroups || [];
  const filteredGroups = flagGroups.filter(fg => 
    fg.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleActive = (id: string) => {
    const newActiveId = model.activeFlagGroupId === id ? undefined : id;
    setModel({ ...model, activeFlagGroupId: newActiveId });
  };

  const handleAddItem = (groupId: string) => {
    const group = flagGroups.find(g => g.id === groupId);
    if (!group) return;
    
    const firstBe = model.basicEvents[0];
    const newItem: FlagItem = {
      eventId: firstBe ? (firstBe.eventId || firstBe.id) : '',
      state: false
    };
    
    updateFlagGroup(groupId, {
      items: [...group.items, newItem]
    });
  };

  const handleUpdateItem = (groupId: string, index: number, updates: Partial<FlagItem>) => {
    const group = flagGroups.find(g => g.id === groupId);
    if (!group) return;
    
    const newItems = [...group.items];
    newItems[index] = { ...newItems[index], ...updates };
    
    updateFlagGroup(groupId, { items: newItems });
  };

  const handleRemoveItem = (groupId: string, index: number) => {
    const group = flagGroups.find(g => g.id === groupId);
    if (!group) return;
    
    const newItems = group.items.filter((_, i) => i !== index);
    updateFlagGroup(groupId, { items: newItems });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input 
            className="form-input" 
            placeholder={locale === 'ja' ? 'フラググループを検索...' : 'Search flag groups...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ maxWidth: '300px' }}
          />
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
             {locale === 'ja' ? `現在の有効グループ: ${flagGroups.find(g => g.id === model.activeFlagGroupId)?.name || 'なし'}` : `Active Group: ${flagGroups.find(g => g.id === model.activeFlagGroupId)?.name || 'None'}`}
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            const newGroup: FlagGroup = {
              id: uuidv4(),
              name: locale === 'ja' ? '新規フラググループ' : 'New Flag Group',
              items: []
            };
            addFlagGroup(newGroup);
            setEditingGroupId(newGroup.id);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {locale === 'ja' ? 'フラググループを追加' : 'Add Flag Group'}
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '16px' }}>
          {filteredGroups.map((group) => (
            <div 
              key={group.id} 
              className={`card ${model.activeFlagGroupId === group.id ? 'card--active' : ''}`}
              style={{ 
                border: '1px solid var(--border-default)', 
                borderRadius: '8px', 
                background: 'var(--bg-secondary)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ 
                padding: '12px 16px', 
                borderBottom: '1px solid var(--border-default)', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                background: model.activeFlagGroupId === group.id ? 'var(--accent-blue-alpha)' : 'transparent'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                   <input 
                    className="form-input" 
                    value={group.name} 
                    onChange={(e) => updateFlagGroup(group.id, { name: e.target.value })}
                    style={{ 
                      background: 'transparent', 
                      border: 'none', 
                      fontWeight: 600, 
                      fontSize: '14px',
                      padding: '2px 4px',
                      width: '200px'
                    }}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={model.activeFlagGroupId === group.id} 
                      onChange={() => toggleActive(group.id)}
                    />
                    {locale === 'ja' ? '有効にする' : 'Activate'}
                  </label>
                  {model.activeFlagGroupId === group.id && (
                    <span className="badge badge--success" style={{ fontSize: '9px', padding: '2px 6px' }}>
                      {locale === 'ja' ? '解析適用中' : 'ACTIVE'}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (confirm(locale === 'ja' ? `フラググループ "${group.name}" を削除しますか？` : `Delete flag group "${group.name}"?`)) {
                      removeFlagGroup(group.id);
                    }
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-danger)', cursor: 'pointer', padding: '4px' }}
                >
                  <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              
              <div style={{ padding: '12px', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-default)', textAlign: 'left' }}>
                      <th style={{ padding: '8px' }}>{locale === 'ja' ? '対象事象' : 'Target Event'}</th>
                      <th style={{ padding: '8px', width: '100px' }}>{locale === 'ja' ? '状態' : 'State'}</th>
                      <th style={{ padding: '8px', width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item, idx) => {
                      const isHighlighted = highlightedId ? (
                        item.eventId === highlightedId ||
                        model.basicEvents.find(be => be.id === item.eventId)?.eventId === highlightedId
                      ) : false;
                      return (
                        <tr key={idx} style={{ 
                          borderBottom: '1px solid var(--border-default)',
                          background: isHighlighted ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
                          transition: 'background 0.3s ease'
                        }}>
                          <td style={{ padding: '4px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <input
                                list={`event-list-${group.id}-${idx}`}
                                className="form-input form-input--mono"
                                value={item.eventId}
                                onChange={(e) => handleUpdateItem(group.id, idx, { eventId: e.target.value })}
                                placeholder={locale === 'ja' ? 'ID直接入力または選択...' : 'Type or select ID...'}
                                style={{ width: '100%', background: 'transparent', border: 'none', padding: '4px 8px', fontSize: '12px' }}
                              />
                              <datalist id={`event-list-${group.id}-${idx}`}>
                                {model.basicEvents.map(be => (
                                  <option key={be.id} value={be.eventId || be.id}>
                                    {be.eventId ? `[${be.eventId}] ${be.name}` : be.name}
                                  </option>
                                ))}
                                {model.houseEvents?.map(he => (
                                  <option key={he.id} value={he.eventId || he.id}>
                                    {he.eventId ? `[${he.eventId}] ${he.name}` : he.name}
                                  </option>
                                ))}
                              </datalist>
                              {(() => {
                                const matchedEvent = model.basicEvents.find(be => be.eventId === item.eventId || be.id === item.eventId)
                                  || model.houseEvents?.find(he => he.eventId === item.eventId || he.id === item.eventId);
                                return matchedEvent ? (
                                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', paddingLeft: '8px' }}>
                                    🏷️ {matchedEvent.name}
                                  </span>
                                ) : null;
                              })()}
                            </div>
                          </td>
                          <td style={{ padding: '4px' }}>
                            <select
                              className="form-select"
                              value={item.state ? 'true' : 'false'}
                              onChange={(e) => handleUpdateItem(group.id, idx, { state: e.target.value === 'true' })}
                              style={{ 
                                width: '100%', 
                                background: 'transparent', 
                                border: 'none',
                                color: item.state ? 'var(--accent-green)' : 'var(--accent-red)',
                                fontWeight: 600
                              }}
                            >
                              <option value="true">TRUE (1)</option>
                              <option value="false">FALSE (0)</option>
                            </select>
                          </td>
                          <td style={{ padding: '4px', textAlign: 'center' }}>
                             <button
                              onClick={() => handleRemoveItem(group.id, idx)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => handleAddItem(group.id)}
                  style={{ marginTop: '8px', width: '100%', fontSize: '11px' }}
                >
                  + {locale === 'ja' ? 'アイテムを追加' : 'Add Item'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
