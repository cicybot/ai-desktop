import React, { useState, useEffect } from 'react';
import { X, Copy, Trash2, Plus, Check } from 'lucide-react';
import { tokensApi, groupsApi, TokenInfo, Group } from '../lib/api';
import { cn } from '../lib/utils';

interface TokenManagerProps {
  onClose: () => void;
}

const ALL_PERMS = ['api_full', 'ttyd_read', 'prompt'];

export function TokenManager({ onClose }: TokenManagerProps) {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [newTokenId, setNewTokenId] = useState<number | null>(null);

  // 创建表单
  const [showForm, setShowForm] = useState(false);
  const [formGroupId, setFormGroupId] = useState<string>('');
  const [formPerms, setFormPerms] = useState<string[]>(['ttyd_read', 'prompt']);
  const [formNote, setFormNote] = useState('');
  const [creating, setCreating] = useState(false);

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
      const result = await tokensApi.create({
        group_id: formGroupId ? parseInt(formGroupId) : null,
        perms: formPerms,
        note: formNote || undefined,
      });
      setNewToken(result.token);
      setNewTokenId(result.id);
      setTokens(await tokensApi.list());
      setShowForm(false);
      setFormGroupId(''); setFormPerms(['ttyd_read', 'prompt']); setFormNote('');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    await tokensApi.delete(id);
    setTokens(t => t.filter(x => x.id !== id));
    if (newTokenId === id) { setNewToken(null); setNewTokenId(null); }
  };

  const copyText = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const groupName = (id: number | null) => {
    if (id === null) return <span className="text-gray-500">全部</span>;
    const g = groups.find(x => x.id === id);
    return <span className="text-blue-400">{g ? g.name : `#${id}`}</span>;
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-[#1c1f26] border border-[#2a2e35] rounded-xl shadow-2xl w-[700px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2e35]">
          <span className="text-white font-semibold">Token 管理</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowForm(f => !f)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors">
              <Plus size={14} /> 新建
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><X size={18} /></button>
          </div>
        </div>

        {/* 新建表单 */}
        {showForm && (
          <div className="px-5 py-4 border-b border-[#2a2e35] bg-[#161920] space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Group（留空=全部）</label>
                <select value={formGroupId} onChange={e => setFormGroupId(e.target.value)}
                  className="w-full bg-[#252932] border border-[#333] rounded px-2 py-1.5 text-sm text-white">
                  <option value="">全部 group</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name} (#{g.id})</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">备注</label>
                <input value={formNote} onChange={e => setFormNote(e.target.value)} placeholder="客户名称等"
                  className="w-full bg-[#252932] border border-[#333] rounded px-2 py-1.5 text-sm text-white placeholder-gray-600" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">权限</label>
              <div className="flex gap-2">
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
              className="px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
              {creating ? '创建中...' : '确认创建'}
            </button>
          </div>
        )}

        {/* 新 token 展示 */}
        {newToken && (
          <div className="px-5 py-3 bg-green-900/30 border-b border-green-700/40 flex items-center gap-2">
            <span className="text-xs text-green-400 font-medium">新 Token（仅显示一次）：</span>
            <code className="flex-1 text-xs text-green-300 font-mono truncate">{newToken}</code>
            <button onClick={() => copyText(newToken, -1)} className="text-green-400 hover:text-green-200 transition-colors">
              {copiedId === -1 ? <Check size={14} /> : <Copy size={14} />}
            </button>
            <button onClick={() => { setNewToken(null); setNewTokenId(null); }} className="text-gray-500 hover:text-white"><X size={14} /></button>
          </div>
        )}

        {/* Token 列表 */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-10 text-gray-500 text-sm">加载中...</div>
          ) : tokens.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-sm">暂无 Token</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-[#2a2e35]">
                  <th className="px-4 py-2 text-left">ID</th>
                  <th className="px-4 py-2 text-left">前缀</th>
                  <th className="px-4 py-2 text-left">Group</th>
                  <th className="px-4 py-2 text-left">权限</th>
                  <th className="px-4 py-2 text-left">备注</th>
                  <th className="px-4 py-2 text-left">创建时间</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {tokens.map(t => (
                  <tr key={t.id} className={cn("border-b border-[#1e2128] hover:bg-[#252932] transition-colors", newTokenId === t.id && "bg-green-900/10")}>
                    <td className="px-4 py-2.5 text-gray-400">#{t.id}</td>
                    <td className="px-4 py-2.5 font-mono text-gray-300">{t.token_prefix}...</td>
                    <td className="px-4 py-2.5">{groupName(t.group_id)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {t.perms.split(',').map(p => (
                          <span key={p} className="px-1.5 py-0.5 bg-[#2a2e35] rounded text-xs text-gray-300">{p}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 max-w-[120px] truncate">{t.note || '-'}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{t.created_at.slice(0, 10)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {newTokenId === t.id && newToken && (
                          <button onClick={() => copyText(newToken, t.id)} className="text-green-400 hover:text-green-200 transition-colors" title="复制 Token">
                            {copiedId === t.id ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        )}
                        <button onClick={() => handleDelete(t.id)} className="text-gray-600 hover:text-red-400 transition-colors" title="删除">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
