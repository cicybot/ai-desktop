import React, { useState, useEffect, useMemo } from 'react';
import { X, Copy, Trash2, Plus, Check, Link, ArrowUp, ArrowDown } from 'lucide-react';
import { tokensApi, groupsApi, TokenInfo, Group } from '../lib/api';
import { cn } from '../lib/utils';
import { ConfirmDialog } from './ConfirmDialog';

interface TokenManagerProps {
  onClose: () => void;
}

const ALL_PERMS = ['api_full', 'ttyd_read', 'prompt', 'app_manage', 'agent_manage', 'desktop_manage'];

function buildShareUrl(token: string, groupId: number | null): string {
  const base = `${window.location.origin}/?token=${token}`;
  return groupId ? `${base}&group=${groupId}` : base;
}

export function TokenManager({ onClose }: TokenManagerProps) {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [newTokenGroupId, setNewTokenGroupId] = useState<number | null>(null);

  // 创建表单
  const [showForm, setShowForm] = useState(false);
  const [formGroupId, setFormGroupId] = useState<string>('');
  const [formPerms, setFormPerms] = useState<string[]>(['ttyd_read', 'prompt']);
  const [formNote, setFormNote] = useState('');
  const [creating, setCreating] = useState(false);

  // 筛选和排序
  const [filterGroup, setFilterGroup] = useState<string>('');
  const [sortAsc, setSortAsc] = useState(false);

  // 批量选择和确认
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirm, setConfirm] = useState<{title: string; message: string; onConfirm: () => void} | null>(null);

  useEffect(() => {
    Promise.all([tokensApi.list(), groupsApi.list()]).then(([t, g]) => {
      setTokens(t);
      setGroups(g.groups);
      setLoading(false);
    });
  }, []);

  const handleCreate = async () => {
    if (formPerms.length === 0) return;
    setCreating(true);
    try {
      const gid = formGroupId ? parseInt(formGroupId) : null;
      const result = await tokensApi.create({
        group_id: gid,
        perms: formPerms,
        note: formNote || undefined,
      });
      setNewToken(result.token);
      setNewTokenGroupId(gid);
      setTokens(await tokensApi.list());
      setShowForm(false);
      setFormGroupId(''); setFormPerms(['ttyd_read', 'prompt']); setFormNote('');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    setConfirm({ title: '删除 Token', message: `确定删除 Token #${id}？`, onConfirm: async () => {
      setConfirm(null);
      await tokensApi.delete(id);
      setTokens(t => t.filter(x => x.id !== id));
      setSelected(s => { const n = new Set(s); n.delete(id); return n; });
    }});
  };

  const handleBatchDelete = () => {
    const ids = [...selected];
    setConfirm({ title: '批量删除', message: `确定删除选中的 ${ids.length} 个 Token？`, onConfirm: async () => {
      setConfirm(null);
      for (const id of ids) await tokensApi.delete(id);
      setTokens(t => t.filter(x => !selected.has(x.id)));
      setSelected(new Set());
    }});
  };

  const handleDeleteAll = () => {
    setConfirm({ title: '全部删除', message: `确定删除全部 ${tokens.length} 个 Token？`, onConfirm: async () => {
      setConfirm(null);
      for (const t of tokens) await tokensApi.delete(t.id);
      setTokens([]);
      setSelected(new Set());
    }});
  };

  const toggleSelect = (id: number) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(s => s.size === filteredTokens.length ? new Set() : new Set(filteredTokens.map(t => t.id)));

  const doCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const groupName = (id: number | null) => {
    if (id === null) return <span className="text-gray-500">全部</span>;
    const g = groups.find(x => x.id === id);
    return <span className="text-blue-400">{g ? g.name : `#${id}`}</span>;
  };

  const filteredTokens = useMemo(() => {
    let list = tokens;
    if (filterGroup === 'null') list = list.filter(t => t.group_id === null);
    else if (filterGroup) list = list.filter(t => t.group_id === parseInt(filterGroup));
    return list.sort((a, b) => sortAsc
      ? a.created_at.localeCompare(b.created_at)
      : b.created_at.localeCompare(a.created_at));
  }, [tokens, filterGroup, sortAsc]);

  return (
    <div className="fixed inset-0 z-[10000] bg-[#0f1115] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2e35]">
        <span className="text-white font-semibold text-lg">🔑 API Tokens</span>
        <div className="flex items-center gap-3">
          <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)}
            className="bg-[#252932] border border-[#333] rounded px-3 py-2 text-sm text-white">
            <option value="">全部 Group</option>
            <option value="null">无 Group</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <button onClick={() => setShowForm(f => !f)} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors">
            <Plus size={14} /> 新建 Token
          </button>
          {selected.size > 0 && (
            <button onClick={handleBatchDelete}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm rounded-lg transition-colors">
              <Trash2 size={14} /> 删除选中({selected.size})
            </button>
          )}
          {tokens.length > 0 && selected.size === 0 && (
            <button onClick={handleDeleteAll}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm rounded-lg transition-colors">
              <Trash2 size={14} /> 全部删除
            </button>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1"><X size={20} /></button>
        </div>
      </div>

      {/* 新建表单 */}
      {showForm && (
        <div className="px-6 py-4 border-b border-[#2a2e35] bg-[#161920] space-y-3">
          <div className="flex gap-4 max-w-2xl">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Group（留空=全部）</label>
              <select value={formGroupId} onChange={e => setFormGroupId(e.target.value)}
                className="w-full bg-[#252932] border border-[#333] rounded px-3 py-2 text-sm text-white">
                <option value="">全部 group</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name} (#{g.id})</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">备注</label>
              <input value={formNote} onChange={e => setFormNote(e.target.value)} placeholder="客户名称等"
                className="w-full bg-[#252932] border border-[#333] rounded px-3 py-2 text-sm text-white placeholder-gray-600" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">权限</label>
            <div className="flex gap-3">
              {ALL_PERMS.map(p => (
                <label key={p} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={formPerms.includes(p)}
                    onChange={e => setFormPerms(prev => e.target.checked ? [...prev, p] : prev.filter(x => x !== p))}
                    className="accent-blue-500" />
                  <span className="text-sm text-gray-300">{p}</span>
                </label>
              ))}
            </div>
          </div>
          <button onClick={handleCreate} disabled={creating || formPerms.length === 0}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
            {creating ? '创建中...' : '确认创建'}
          </button>
        </div>
      )}

      {/* 创建成功弹窗 */}
      {newToken && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60" onClick={() => setNewToken(null)}>
          <div className="bg-[#1a1d24] border border-[#333] rounded-xl p-6 max-w-lg w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold">✅ Token 已创建</h3>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Token（仅显示一次）</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-green-300 font-mono bg-black/40 px-3 py-2 rounded break-all">{newToken}</code>
                <button onClick={() => doCopy(newToken, 'tk')} className="text-green-400 hover:text-green-200 shrink-0">
                  {copiedKey === 'tk' ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">分享链接</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-blue-300 font-mono bg-black/40 px-3 py-2 rounded break-all">{buildShareUrl(newToken, newTokenGroupId)}</code>
                <button onClick={() => doCopy(buildShareUrl(newToken, newTokenGroupId), 'url')} className="text-blue-400 hover:text-blue-200 shrink-0">
                  {copiedKey === 'url' ? <Check size={16} /> : <Link size={16} />}
                </button>
              </div>
            </div>
            <button onClick={() => setNewToken(null)} className="w-full py-2 bg-[#252932] hover:bg-[#333] text-white text-sm rounded-lg transition-colors">关闭</button>
          </div>
        </div>
      )}

      {/* Token 列表 */}
      <div className="flex-1 overflow-y-auto px-6">
        {loading ? (
          <div className="text-center py-10 text-gray-500 text-sm">加载中...</div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-sm">暂无 Token</div>
        ) : (
          <table className="w-full text-sm mt-2">
            <thead className="sticky top-0 bg-[#0f1115]">
              <tr className="text-xs text-gray-500 border-b border-[#2a2e35]">
                <th className="px-4 py-3 w-8"><input type="checkbox" checked={selected.size === filteredTokens.length && filteredTokens.length > 0} onChange={toggleAll} className="accent-blue-500" /></th>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">前缀</th>
                <th className="px-4 py-3 text-left">Group</th>
                <th className="px-4 py-3 text-left">权限</th>
                <th className="px-4 py-3 text-left">备注</th>
                <th className="px-4 py-3 text-left cursor-pointer hover:text-white select-none" onClick={() => setSortAsc(!sortAsc)}>
                  创建时间 {sortAsc ? <ArrowUp size={12} className="inline" /> : <ArrowDown size={12} className="inline" />}
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filteredTokens.map(t => (
                <tr key={t.id} className="border-b border-[#1e2128] hover:bg-[#1a1d24] transition-colors">
                  <td className="px-4 py-3"><input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleSelect(t.id)} className="accent-blue-500" /></td>
                  <td className="px-4 py-3 text-gray-400">#{t.id}</td>
                  <td className="px-4 py-3 font-mono text-gray-300">{t.token_prefix}</td>
                  <td className="px-4 py-3">{groupName(t.group_id)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {t.perms.split(',').map(p => (
                        <span key={p} className="px-1.5 py-0.5 bg-[#252932] rounded text-xs text-gray-300">{p}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 max-w-[150px] truncate">{t.note || '-'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{t.created_at.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(t.id)} className="text-gray-600 hover:text-red-400 transition-colors" title="删除">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <ConfirmDialog open={!!confirm} title={confirm?.title || ''} message={confirm?.message || ''} onConfirm={confirm?.onConfirm || (() => {})} onCancel={() => setConfirm(null)} confirmText="删除" danger />
    </div>
  );
}
