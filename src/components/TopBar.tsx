import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Globe, Plus, RefreshCw, Monitor, Trash2, ChevronDown, Settings, LogOut, Sidebar as SidebarIcon, AlignLeft, AlignRight, Wifi, LayoutGrid, User as UserIcon, Check, Bot, Loader2, RotateCw, Pencil, Columns, Rows } from 'lucide-react';
import axios from 'axios';
import { cn } from '../lib/utils';
import { WindowType, DesktopState, User, PLANS } from '../types';
import { Logo } from './Logo';
import { ttydApi, appsApi, tmuxApi } from '../lib/api';
import { ConfirmDialog } from './ConfirmDialog';

interface TtydConfig {
  pane_id: string;
  title: string;
  ttyd_port: number;
  active: number;
}

interface TopBarProps {
  desktops: DesktopState[];
  activeDesktopId: string;
  onSwitchDesktop: (id: string) => void;
  onAddDesktop: () => void;
  onRemoveDesktop: (id: string) => void;
  onRenameDesktop: (id: string, name: string) => void;
  onAddWindow: (type: WindowType, url?: string, title?: string, paneId?: string) => void;
  isSidebarOpen: boolean;
  sidebarPosition: 'left' | 'right';
  onToggleSidebar: () => void;
  onSetSidebarPosition: (position: 'left' | 'right') => void;
  onLayoutGrid: () => void;
  onLayoutSplitH: () => void;
  onLayoutSplitV: () => void;
  user: User | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  onUpgrade: (planId: 'free' | 'pro' | 'enterprise') => void;
  userPerms?: string[];
  userGroupId?: number | null;
  isCreatingAgent?: boolean;
  setLoading: (msg: string | false) => void;
}

function NetworkMonitor() {
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      const start = performance.now();
      try {
        await axios.get('https://g-fast-api.cicy.de5.net/api/health');
        const end = performance.now();
        setLatency(Math.round(end - start));
      } catch (e) {
        setLatency(null);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  let color = "text-gray-500";
  if (latency !== null) {
    if (latency < 100) color = "text-green-400";
    else if (latency < 300) color = "text-yellow-400";
    else color = "text-red-400";
  }

  return (
    <div className="flex items-center gap-2" title={latency !== null ? `Latency: ${latency}ms` : "Offline"}>
      <Wifi size={18} className={color} />
      {latency !== null && <span className="text-xs font-mono text-gray-500">{latency}ms</span>}
    </div>
  );
}

export function TopBar({
  desktops,
  activeDesktopId,
  onSwitchDesktop,
  onAddDesktop,
  onRemoveDesktop,
  onRenameDesktop,
  onAddWindow,
  isSidebarOpen,
  sidebarPosition,
  onToggleSidebar,
  onSetSidebarPosition,
  onLayoutGrid,
  onLayoutSplitH,
  onLayoutSplitV,
  user,
  onOpenLogin,
  onLogout,
  onUpgrade,
  userPerms = [],
  userGroupId = null,
  isCreatingAgent,
  setLoading,
}: TopBarProps) {
  const hasPermission = (perm: string) => userPerms.includes(perm);

  const [activeMenu, setActiveMenu] = useState<'chats' | 'apps' | 'desktops' | 'settings' | 'user' | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [editingDesktopId, setEditingDesktopId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [desktopSearch, setDesktopSearch] = useState('');

  // Cache layer: window memory + localStorage
  const _cache = ((window as any).__mc = (window as any).__mc || {}) as Record<string, any>;
  const cacheGet = (key: string) => {
    if (_cache[key]) return _cache[key];
    try { const v = localStorage.getItem('cache_' + key); if (v) { _cache[key] = JSON.parse(v); return _cache[key]; } } catch {}
    return null;
  };
  const cacheSet = (key: string, val: any) => {
    _cache[key] = val;
    try { localStorage.setItem('cache_' + key, JSON.stringify(val)); } catch {}
  };

  const [agents, _setAgents] = useState<TtydConfig[]>(() => cacheGet('agents') || []);
  const setAgents = (v: TtydConfig[] | ((prev: TtydConfig[]) => TtydConfig[])) => {
    _setAgents(prev => { const next = typeof v === 'function' ? v(prev) : v; cacheSet('agents', next); return next; });
  };
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agentSearch, setAgentSearch] = useState('');
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [editingAgentName, setEditingAgentName] = useState('');
  const [apps, _setApps] = useState<{id: number; name: string; url: string; icon: string}[]>(() => cacheGet('apps') || []);
  const setApps = (v: typeof apps | ((prev: typeof apps) => typeof apps)) => {
    _setApps(prev => { const next = typeof v === 'function' ? v(prev) : v; cacheSet('apps', next); return next; });
  };
  const [appSearch, setAppSearch] = useState('');
  const [editingAppId, setEditingAppId] = useState<number | null>(null);
  const [editingAppName, setEditingAppName] = useState('');
  const [confirm, setConfirm] = useState<{title: string; message: string; onConfirm: () => void; danger?: boolean} | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const loadAgents = async () => {
    setAgentsLoading(true);
    try {
      const res = await ttydApi.list();
      const list = (res.configs || []).filter((c: TtydConfig) => c.active);
      setAgents(list);
    } catch (e) {
      console.error('[TopBar] loadAgents error:', e);
    } finally {
      setAgentsLoading(false);
    }
  };

  const loadApps = async () => {
    try {
      const res = await appsApi.list();
      setApps(res.apps || []);
    } catch (e) {
      console.error('[TopBar] loadApps error:', e);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
        setEditingDesktopId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = (menu: 'chats' | 'apps' | 'desktops' | 'settings' | 'user') => {
    setActiveMenu(activeMenu === menu ? null : menu);
    if (menu === 'chats' && activeMenu !== 'chats') { loadAgents(); setAgentSearch(''); }
    if (menu === 'apps' && activeMenu !== 'apps') { loadApps(); setAppSearch(''); setUrlInput(''); }
    if (menu === 'desktops' && activeMenu !== 'desktops') { setDesktopSearch(''); }
    if (menu !== 'desktops') {
        setEditingDesktopId(null);
    }
  };

  const handleAddUrl = async () => {
    if (urlInput.trim()) {
      let url = urlInput.trim();
      if (!url.startsWith('http')) url = 'https://' + url;
      if (apps.some(a => a.url === url)) {
        onAddWindow('preview', url, apps.find(a => a.url === url)!.name);
        setUrlInput('');
        setActiveMenu(null);
        return;
      }
      setLoading('Adding app...');
      try {
        const name = new URL(url).hostname;
        await appsApi.create(name, url);
        setApps(prev => [...prev, { id: Date.now(), name, url, icon: '' }]);
        onAddWindow('preview', url, name);
      } catch {} finally { setLoading(false); }
      setUrlInput('');
      setActiveMenu(null);
    }
  };

  const withLoading = async (msg: string, fn: () => Promise<any>) => {
    setLoading(msg); await new Promise(r => setTimeout(r, 0));
    try { await fn(); } finally { setLoading(false); }
  };

  const handleFinishRenaming = () => {
    if (editingDesktopId && editingName.trim()) {
        onRenameDesktop(editingDesktopId, editingName.trim());
    }
    setEditingDesktopId(null);
  };

  const activeDesktop = desktops.find(d => d.id === activeDesktopId);
  const openPaneIds = new Set(activeDesktop?.windows.map(w => w.id) || []);

  return (
    <div className="h-12 bg-[#0f1115] border-b border-[#2a2e35] flex items-center px-4 select-none z-[1000] relative text-gray-400 text-sm font-medium" ref={menuRef}>
      
      {/* Left: Logo & Desktop Switcher */}
      <div className="flex items-center gap-4">
        <Logo size="sm" showText={false} />
        <span className="text-xs text-gray-500">v0.2.1</span>

        {/* Desktop Switcher Button */}
        <div className="relative">
            <button
            onClick={() => { if (userGroupId === null) toggleMenu('desktops'); }}
            className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded bg-[#1c1f26] border border-[#2a2e35] hover:bg-[#252932] transition-colors text-gray-300",
                userGroupId !== null && "opacity-50 cursor-not-allowed",
                activeMenu === 'desktops' && "bg-[#252932] text-white border-gray-600"
            )}
            >
            <span>{activeDesktop?.name || 'Desktop'}</span>
            <ChevronDown size={14} className="text-gray-500" />
            </button>

            {activeMenu === 'desktops' && (
            <div className="absolute top-full left-0 mt-2 w-80 bg-[#1c1f26] border border-[#2a2e35] rounded-lg shadow-xl overflow-hidden z-50 flex flex-col">
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2e35] text-xs text-gray-500 uppercase tracking-wider">
                <span>Workspaces</span>
                <button className="hover:text-white cursor-pointer" onClick={() => {
                    onAddDesktop();
                }}><Plus size={14} /></button>
                </div>
                <div className="px-2 py-1.5 border-b border-[#2a2e35]">
                  <input type="text" value={desktopSearch} onChange={e => setDesktopSearch(e.target.value)} placeholder="Search desktops..." className="w-full bg-[#252932] text-white text-xs px-2 py-1 rounded border border-[#333] outline-none placeholder-gray-500 focus:border-blue-500/50" autoFocus />
                </div>
                <div className="py-1 max-h-80 overflow-y-auto">
                {desktops.filter(d => !desktopSearch || d.name.toLowerCase().includes(desktopSearch.toLowerCase())).map((desktop) => (
                    <div
                    key={desktop.id}
                    className="group flex items-center px-3 py-2 hover:bg-[#2a2e35] cursor-pointer"
                    onClick={() => {
                        if (editingDesktopId !== desktop.id) {
                            onSwitchDesktop(desktop.id);
                            setActiveMenu(null);
                        }
                    }}
                    >
                    <Monitor size={14} className={desktop.id === activeDesktopId ? "text-blue-400 shrink-0" : "text-gray-500 shrink-0"} />
                    {editingDesktopId === desktop.id ? (
                        <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleFinishRenaming(); e.stopPropagation(); }}
                            onBlur={handleFinishRenaming}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#111] text-white px-1 py-0.5 rounded border border-blue-500/50 outline-none flex-1 text-xs ml-2"
                            autoFocus
                        />
                    ) : (
                        <span className={cn("truncate flex-1 ml-2 text-gray-400 group-hover:text-white", desktop.id === activeDesktopId && "font-medium text-white")}>{desktop.name}</span>
                    )}
                    {editingDesktopId !== desktop.id && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100" onClick={e => e.stopPropagation()}>
                          <button onClick={() => { setEditingDesktopId(desktop.id); setEditingName(desktop.name); }} className="text-gray-500 hover:text-blue-400 p-0.5" title="Rename"><Pencil size={12} /></button>
                          {desktops.length > 1 && (
                            <button onClick={() => setConfirm({ title: 'Delete Desktop', message: `Delete "${desktop.name}"? All windows will be closed.`, danger: true, onConfirm: () => { setConfirm(null); withLoading('Deleting desktop...', () => Promise.resolve(onRemoveDesktop(desktop.id))); } })} className="text-gray-500 hover:text-red-400 p-0.5" title="Delete"><Trash2 size={12} /></button>
                          )}
                        </div>
                    )}
                    </div>
                ))}
                </div>
            </div>
            )}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-[#2a2e35]" />

        {/* Agents Menu (formerly Chats) */}
        <div className="relative">
            <button
            onClick={() => toggleMenu('chats')}
            className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded transition-colors hover:text-white",
                activeMenu === 'chats' && "text-white"
            )}
            >
            {isCreatingAgent ? <Loader2 size={16} className="text-blue-400 animate-spin" /> : <Bot size={16} className="text-blue-400" />}
            <span>Agents</span>
            </button>

            {activeMenu === 'chats' && (
            <div className="absolute top-full left-0 mt-2 w-80 bg-[#1c1f26] border border-[#2a2e35] rounded-lg shadow-xl overflow-hidden z-50 flex flex-col">
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2e35] text-xs text-gray-500 uppercase tracking-wider">
                <span>Active Agents</span>
                <div className="flex gap-2">
                    <button className="hover:text-white cursor-pointer" onClick={loadAgents}><RefreshCw size={14} className={agentsLoading ? 'animate-spin' : ''} /></button>
                    <button className="hover:text-white cursor-pointer" onClick={() => {
                        onAddWindow('ttyd');
                        setActiveMenu(null);
                    }}><Plus size={14} /></button>
                </div>
                </div>
                <div className="px-2 py-1.5 border-b border-[#2a2e35]">
                  <input type="text" value={agentSearch} onChange={e => setAgentSearch(e.target.value)} placeholder="Search agents..." className="w-full bg-[#252932] text-white text-xs px-2 py-1 rounded border border-[#333] outline-none placeholder-gray-500 focus:border-blue-500/50" autoFocus />
                </div>
                <div className="py-1 max-h-80 overflow-y-auto">
                {agents.filter(a => !agentSearch || (a.title || a.pane_id).toLowerCase().includes(agentSearch.toLowerCase())).length === 0 ? (
                    <div className="px-3 py-2 text-xs text-gray-500">No agents found</div>
                ) : agents.filter(a => !agentSearch || (a.title || a.pane_id).toLowerCase().includes(agentSearch.toLowerCase())).map((a) => (
                    <div
                    key={a.pane_id}
                    className={cn("group w-full text-left px-3 py-2 hover:bg-[#2a2e35] flex items-center gap-2 transition-colors cursor-pointer", openPaneIds.has(a.pane_id) ? "text-white bg-[#252932]" : "text-gray-400 hover:text-white")}
                    onClick={() => {
                        if (editingAgentId !== a.pane_id) {
                            onAddWindow('ttyd', undefined, a.title || a.pane_id, a.pane_id);
                            setActiveMenu(null);
                        }
                    }}
                    >
                    <Bot size={14} className={openPaneIds.has(a.pane_id) ? "text-green-400 shrink-0" : "text-blue-400 shrink-0"} />
                    {editingAgentId === a.pane_id ? (
                        <input
                            type="text"
                            value={editingAgentName}
                            onChange={e => setEditingAgentName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { setAgents(prev => prev.map(x => x.pane_id === a.pane_id ? {...x, title: editingAgentName} : x)); setEditingAgentId(null); withLoading('Renaming...', () => tmuxApi.renamePane(a.pane_id, editingAgentName)); } e.stopPropagation(); }}
                            onBlur={() => { setAgents(prev => prev.map(x => x.pane_id === a.pane_id ? {...x, title: editingAgentName} : x)); setEditingAgentId(null); withLoading('Renaming...', () => tmuxApi.renamePane(a.pane_id, editingAgentName)); }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#111] text-white px-1 py-0.5 rounded border border-blue-500/50 outline-none flex-1 text-xs"
                            autoFocus
                        />
                    ) : (
                        <span className="truncate flex-1">{a.title || a.pane_id}</span>
                    )}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setEditingAgentId(a.pane_id); setEditingAgentName(a.title || a.pane_id); }} className="text-gray-500 hover:text-blue-400 p-0.5" title="Rename"><Pencil size={12} /></button>
                      <button onClick={() => setConfirm({ title: 'Restart Agent', message: `Restart "${a.title || a.pane_id}"?`, onConfirm: () => { setConfirm(null); withLoading('Restarting...', () => tmuxApi.restartPane(a.pane_id).then(loadAgents)); } })} className="text-gray-500 hover:text-yellow-400 p-0.5" title="Restart"><RotateCw size={12} /></button>
                      <button onClick={() => setConfirm({ title: 'Delete Agent', message: `Delete "${a.title || a.pane_id}"? This cannot be undone.`, danger: true, onConfirm: () => { setConfirm(null); withLoading('Deleting agent...', () => tmuxApi.deletePane(a.pane_id).then(loadAgents)); } })} className="text-gray-500 hover:text-red-400 p-0.5" title="Delete"><Trash2 size={12} /></button>
                    </div>
                    </div>
                ))}
                </div>
            </div>
            )}
        </div>

        {/* Apps Menu */}
        <div className="relative">
            <button
            onClick={() => toggleMenu('apps')}
            className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded transition-colors hover:text-white",
                activeMenu === 'apps' && "text-white"
            )}
            >
            <Globe size={18} />
            <span>Apps</span>
            </button>

            {activeMenu === 'apps' && (
            <div className="absolute top-full left-0 mt-2 w-80 bg-[#1c1f26] border border-[#2a2e35] rounded-lg shadow-xl overflow-hidden z-50 flex flex-col">
                <div className="p-2 border-b border-[#2a2e35]">
                <div className="flex items-center gap-2 bg-[#252932] rounded border border-[#333] px-2 py-1 focus-within:border-blue-500/50">
                    <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                    placeholder="Add URL..."
                    className="bg-transparent border-none outline-none text-white text-sm w-full placeholder-gray-500"
                    />
                    <button onClick={handleAddUrl} className="text-green-500 hover:text-green-400">
                    <Plus size={16} />
                    </button>
                </div>
                </div>
                {apps.length > 0 && (
                <div className="px-2 py-1.5 border-b border-[#2a2e35]">
                  <input type="text" value={appSearch} onChange={e => setAppSearch(e.target.value)} placeholder="Search apps..." className="w-full bg-[#252932] text-white text-xs px-2 py-1 rounded border border-[#333] outline-none placeholder-gray-500 focus:border-blue-500/50" autoFocus />
                </div>
                )}
                <div className="py-1 max-h-80 overflow-y-auto">
                {apps.filter(a => !appSearch || a.name.toLowerCase().includes(appSearch.toLowerCase()) || a.url.toLowerCase().includes(appSearch.toLowerCase())).length === 0 ? (
                    <div className="px-3 py-2 text-xs text-gray-500">No apps found</div>
                ) : apps.filter(a => !appSearch || a.name.toLowerCase().includes(appSearch.toLowerCase()) || a.url.toLowerCase().includes(appSearch.toLowerCase())).map((a) => (
                    <div
                    key={a.id}
                    className="group w-full text-left px-3 py-2 hover:bg-[#2a2e35] flex items-center gap-2 text-gray-400 hover:text-white transition-colors cursor-pointer"
                    onClick={() => {
                        if (editingAppId !== a.id) {
                            onAddWindow('preview', a.url, a.name);
                            setActiveMenu(null);
                        }
                    }}
                    >
                    <Globe size={14} className="text-blue-400 shrink-0" />
                    {editingAppId === a.id ? (
                        <input
                            type="text"
                            value={editingAppName}
                            onChange={e => setEditingAppName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { setApps(prev => prev.map(x => x.id === a.id ? {...x, name: editingAppName} : x)); setEditingAppId(null); withLoading('Renaming...', () => appsApi.update(a.id, { name: editingAppName })); } e.stopPropagation(); }}
                            onBlur={() => { setApps(prev => prev.map(x => x.id === a.id ? {...x, name: editingAppName} : x)); setEditingAppId(null); withLoading('Renaming...', () => appsApi.update(a.id, { name: editingAppName })); }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#111] text-white px-1 py-0.5 rounded border border-blue-500/50 outline-none flex-1 text-xs"
                            autoFocus
                        />
                    ) : (
                        <span className="truncate flex-1">{a.name}</span>
                    )}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setEditingAppId(a.id); setEditingAppName(a.name); }} className="text-gray-500 hover:text-blue-400 p-0.5" title="Rename"><Pencil size={12} /></button>
                      <button onClick={() => setConfirm({ title: 'Delete App', message: `Delete "${a.name}"?`, danger: true, onConfirm: () => { setConfirm(null); withLoading('Deleting app...', async () => { await appsApi.delete(a.id); setApps(prev => prev.filter(x => x.id !== a.id)); }); } })} className="text-gray-500 hover:text-red-400 p-0.5" title="Delete"><Trash2 size={12} /></button>
                    </div>
                    </div>
                ))}
                </div>
            </div>
            )}
        </div>
      </div>

      <div className="flex-1" />

      {/* Right: Stats & Settings */}
      <div className="flex items-center gap-4 text-gray-500">
        <NetworkMonitor />
        
        <div className="w-px h-4 bg-[#2a2e35]" />

        {/* Layout Buttons */}
        {activeDesktop && activeDesktop.windows.length >= 2 && (
          <div className="flex items-center gap-1">
            <button onClick={onLayoutSplitV} className="hover:text-white transition-colors flex items-center justify-center" title="Split Vertical">
              <Columns size={18} />
            </button>
            <button onClick={onLayoutSplitH} className="hover:text-white transition-colors flex items-center justify-center" title="Split Horizontal">
              <Rows size={18} />
            </button>
            <button onClick={onLayoutGrid} className="hover:text-white transition-colors flex items-center justify-center" title="Grid Layout">
              <LayoutGrid size={18} />
            </button>
          </div>
        )}

        {/* Sidebar Toggle */}
        <button 
          onClick={onToggleSidebar}
          className={cn("hover:text-white transition-colors flex items-center justify-center", isSidebarOpen && "text-blue-400")}
          title="Toggle Copilot"
        >
          <SidebarIcon size={18} />
        </button>

        {/* Settings Menu */}
        <div className="relative flex items-center">
          <button 
            onClick={() => toggleMenu('settings')}
            className={cn("hover:text-white transition-colors flex items-center justify-center", activeMenu === 'settings' && "text-white")}
          >
            <Settings size={18} />
          </button>

          {activeMenu === 'settings' && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-[#1c1f26] border border-[#2a2e35] rounded-lg shadow-xl overflow-hidden z-50 flex flex-col">
              <div className="px-3 py-2 border-b border-[#2a2e35] text-xs text-gray-500 uppercase tracking-wider">
                Settings
              </div>
              <div className="py-1">
                <div className="px-3 py-2 text-sm text-gray-400">Sidebar Position</div>
                <div className="flex px-2 pb-2 gap-1">
                  <button
                    onClick={() => {
                      onSetSidebarPosition('left');
                      setActiveMenu(null);
                    }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-1.5 rounded border transition-colors",
                      sidebarPosition === 'left' 
                        ? "bg-[#252932] border-blue-500/50 text-white" 
                        : "border-[#333] hover:bg-[#2a2e35] text-gray-400"
                    )}
                  >
                    <AlignLeft size={14} />
                    <span>Left</span>
                  </button>
                  <button
                    onClick={() => {
                      onSetSidebarPosition('right');
                      setActiveMenu(null);
                    }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-1.5 rounded border transition-colors",
                      sidebarPosition === 'right' 
                        ? "bg-[#252932] border-blue-500/50 text-white" 
                        : "border-[#333] hover:bg-[#2a2e35] text-gray-400"
                    )}
                  >
                    <AlignRight size={14} />
                    <span>Right</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="relative flex items-center">
            <button 
            onClick={() => user ? toggleMenu('user') : onOpenLogin()}
            className={cn(
                "hover:text-white transition-colors flex items-center justify-center",
                activeMenu === 'user' && "text-white"
            )}
            title={user ? user.name : "Sign In"}
            >
            {user && user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-5 h-5 rounded-full" />
            ) : (
                <UserIcon size={18} className={cn(user ? "text-blue-400" : "")} />
            )}
            </button>

            {activeMenu === 'user' && user && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-[#1c1f26] border border-[#2a2e35] rounded-lg shadow-xl overflow-hidden z-50 flex flex-col">
                {/* User Info Header */}
                <div className="p-4 border-b border-[#2a2e35]">
                    <div className="font-bold text-white">{user.name}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                    <div className="mt-2 text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded w-fit uppercase tracking-wider">{user.plan} Plan</div>
                </div>
                
                {/* Plans */}
                <div className="py-1 border-b border-[#2a2e35]">
                    <div className="px-3 py-1 text-xs text-gray-500 uppercase tracking-wider">Switch Plan</div>
                    {PLANS.map(plan => (
                        <button
                            key={plan.id}
                            onClick={() => {
                                onUpgrade(plan.id);
                                setActiveMenu(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#2a2e35] hover:text-white flex items-center justify-between group"
                        >
                            <span>{plan.name}</span>
                            {user.plan === plan.id && <Check size={14} className="text-blue-400" />}
                        </button>
                    ))}
                </div>

                {/* Actions */}
                <div className="py-1">
                    <button 
                        onClick={() => {
                            onLogout();
                            setActiveMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[#2a2e35] hover:text-red-300 flex items-center gap-2"
                    >
                        <LogOut size={14} />
                        <span>Log Out</span>
                    </button>
                </div>
            </div>
            )}
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title || ''}
        message={confirm?.message || ''}
        onConfirm={() => confirm?.onConfirm()}
        onCancel={() => setConfirm(null)}
        confirmText={confirm?.danger ? 'Delete' : 'Confirm'}
        danger={confirm?.danger}
      />
    </div>
  );
}
