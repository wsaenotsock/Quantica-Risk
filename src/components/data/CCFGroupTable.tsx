'use client';

import React, { useState } from 'react';
import { useModelStore } from '@/store/modelStore';
import type { CCFGroup } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { useTableSort } from '@/lib/hooks/useTableSort';

export default function CCFGroupTable({ locale = 'ja', highlightedId }: { locale?: 'ja' | 'en'; highlightedId?: string | null }) {
  const model = useModelStore((s) => s.model);
  const addCCFGroup = useModelStore((s) => s.addCCFGroup);
  const updateCCFGroup = useModelStore((s) => s.updateCCFGroup);
  const removeCCFGroup = useModelStore((s) => s.removeCCFGroup);
  const [searchTerm, setSearchTerm] = useState('');
  const [memberSearchTerms, setMemberSearchTerms] = useState<Record<string, string>>({});

  const handleAdd = () => {
    const newId = uuidv4();
    const newGroup: CCFGroup = {
      id: newId,
      name: locale === 'ja' ? '新規CCFグループ' : 'New CCF Group',
      model: 'beta_factor',
      members: [],
      parameters: { beta: 0.1 },
    };
    addCCFGroup(newGroup);
  };

  const handleDelete = (id: string) => {
    if (confirm(locale === 'ja' ? 'このCCFグループを削除しますか？' : 'Delete this CCF group?')) {
      removeCCFGroup(id);
    }
  };

  const handleModelChange = (group: CCFGroup, newModel: CCFGroup['model']) => {
    let newParams = { ...group.parameters };
    if (newModel === 'beta_factor') {
      newParams = { beta: newParams.beta ?? 0.1 };
    } else if (newModel === 'mgl') {
      newParams = { beta: newParams.beta ?? 0.1, gamma: newParams.gamma ?? 0.5 };
    } else if (newModel === 'alpha_factor') {
      newParams = { alpha1: 0.9, alpha2: 0.1 };
    }
    updateCCFGroup({ ...group, model: newModel, parameters: newParams });
  };

  const baseFilteredGroups = (model.ccfGroups || []).filter((g) => 
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    g.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const { items: filteredGroups, requestSort, sortConfig } = useTableSort<CCFGroup>(baseFilteredGroups, 'name');

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return ' ↕️';
    return sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽';
  };

  return (
    <div style={{ padding: 'var(--space-lg)', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600 }}>
          {locale === 'ja' ? '共通原因故障 (CCF) データ' : 'Common Cause Failure (CCF) Data'}
          <span className="badge badge--success" style={{ marginLeft: '12px' }}>
            {(model.ccfGroups || []).length}
          </span>
        </h2>
        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder={locale === 'ja' ? '検索...' : 'Search...'} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '250px' }}
          />
          <button className="btn btn--primary" onClick={handleAdd}>
            + {locale === 'ja' ? '新規作成' : 'Add New'}
          </button>
        </div>
      </div>

      <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', overflow: 'hidden' }}>
        <table className="results-table">
          <thead>
            <tr>
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('name')}>{locale === 'ja' ? 'グループ名' : 'Name'}{getSortIcon('name')}</th>
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('model')}>{locale === 'ja' ? 'モデル' : 'Model'}{getSortIcon('model')}</th>
              <th>{locale === 'ja' ? 'パラメータ' : 'Parameters'}</th>
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('members')}>{locale === 'ja' ? 'メンバー (基事象)' : 'Members'}{getSortIcon('members')}</th>
              <th>{locale === 'ja' ? '操作' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {filteredGroups.map((g) => {
              const isHighlighted = highlightedId ? (
                g.id === highlightedId ||
                g.members.includes(highlightedId) ||
                g.members.some(m => model.basicEvents.find(be => be.id === m)?.eventId === highlightedId)
              ) : false;
              return (
                <tr key={g.id} style={{ 
                  background: isHighlighted ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
                  transition: 'background 0.3s ease'
                }}>
                <td>
                  <input
                    className="form-input"
                    style={{ padding: '4px 8px', fontSize: '11px', background: 'transparent' }}
                    value={g.name}
                    onChange={(e) => updateCCFGroup({ ...g, name: e.target.value })}
                  />
                </td>
                <td>
                  <select
                    className="form-select"
                    style={{ padding: '4px 8px', fontSize: '11px', background: 'transparent' }}
                    value={g.model}
                    onChange={(e) => handleModelChange(g, e.target.value as CCFGroup['model'])}
                  >
                    <option value="beta_factor">Beta Factor (β)</option>
                    <option value="mgl">MGL (β, γ)</option>
                    <option value="alpha_factor">Alpha Factor (α)</option>
                  </select>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {Object.entries(g.parameters).map(([key, val]) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{key}:</span>
                        <input
                          className="form-input form-input--mono"
                          type="number"
                          step="any"
                          style={{ width: '60px', padding: '2px 4px', fontSize: '10px', background: 'transparent' }}
                          value={val}
                          onChange={(e) => updateCCFGroup({
                            ...g,
                            parameters: { ...g.parameters, [key]: parseFloat(e.target.value) || 0 }
                          })}
                        />
                      </div>
                    ))}
                  </div>
                </td>
                 <td>
                   <div style={{ marginBottom: '4px' }}>
                     <input
                       type="text"
                       className="form-input"
                       placeholder={locale === 'ja' ? 'メンバー検索...' : 'Search members...'}
                       value={memberSearchTerms[g.id] || ''}
                       onChange={(e) => setMemberSearchTerms({ ...memberSearchTerms, [g.id]: e.target.value })}
                       style={{ padding: '2px 6px', fontSize: '10px', height: '24px', width: '250px' }}
                     />
                   </div>
                   <div style={{
                     maxHeight: '100px',
                     overflowY: 'auto',
                     border: '1px solid var(--border-default)',
                     borderRadius: 'var(--radius-sm)',
                     padding: '4px 8px',
                     background: 'var(--bg-elevated)',
                     width: '250px'
                   }}>
                     {model.basicEvents
                       .filter(be => 
                         !memberSearchTerms[g.id] || 
                         be.name.toLowerCase().includes(memberSearchTerms[g.id].toLowerCase()) ||
                         (be.failureMode && be.failureMode.toLowerCase().includes(memberSearchTerms[g.id].toLowerCase())) ||
                         (be.eventId && be.eventId.toLowerCase().includes(memberSearchTerms[g.id].toLowerCase()))
                       )
                       .map((be) => {
                         const fm = be.failureMode || (be.parameterId ? (model.parameters?.find(p => p.id === be.parameterId)?.name) : '') || '';
                         const labelText = fm ? `${be.name} (${fm})` : be.name;
                         return (
                           <label key={be.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', padding: '2px 0', cursor: 'pointer' }}>
                             <input
                               type="checkbox"
                               checked={g.members.includes(be.id)}
                               onChange={(e) => {
                                 const newMembers = e.target.checked
                                   ? [...g.members, be.id]
                                   : g.members.filter(id => id !== be.id);
                                 updateCCFGroup({ ...g, members: newMembers });
                               }}
                             />
                             <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={labelText}>
                               {labelText}
                             </span>
                           </label>
                         );
                       })}
                     {model.basicEvents.length === 0 && (
                       <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                         {locale === 'ja' ? '基事象がありません' : 'No basic events'}
                       </span>
                     )}
                   </div>
                 </td>
                <td>
                  <button 
                    className="btn btn--danger btn--sm" 
                    onClick={() => handleDelete(g.id)}
                    style={{ padding: '2px 6px', fontSize: '10px' }}
                  >
                    削除
                  </button>
                </td>
              </tr>
            );
          })}
            {filteredGroups.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-tertiary)' }}>
                  {locale === 'ja' ? 'データがありません' : 'No data available'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
