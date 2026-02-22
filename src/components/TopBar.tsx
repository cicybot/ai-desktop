import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Globe, Plus, RefreshCw, Monitor, Trash2, ChevronDown, Zap, Settings, LogOut, Sidebar as SidebarIcon, AlignLeft, AlignRight, Wifi, LayoutGrid } from 'lucide-react';
import { cn } from '../lib/utils';
import { WindowType, DesktopState } from '../types';

interface TopBarProps {
  desktops: DesktopState[];
  activeDesktopId: string;
  onSwitchDesktop: (id: string) => void;
  onAddDesktop: () => void;
  onRemoveDesktop: (id: string) => void;
  onAddWindow: (type: WindowType, url?: string, title?: string) => void;
  isSidebarOpen: boolean;
  sidebarPosition: 'left' | 'right';
  onToggleSidebar: () => void;
  onSetSidebarPosition: (position: 'left' | 'right') => void;
  onLayoutGrid: () => void;
}

function NetworkMonitor() {
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      const start = performance.now();
      try {
        await fetch('/api/health', { method: 'HEAD', cache: 'no-store' });
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
  onAddWindow,
  isSidebarOpen,
  sidebarPosition,
  onToggleSidebar,
  onSetSidebarPosition,
  onLayoutGrid,
}: TopBarProps) {
  const [activeMenu, setActiveMenu] = useState<'chats' | 'apps' | 'desktops' | 'settings' | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = (menu: 'chats' | 'apps' | 'desktops' | 'settings') => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const handleAddUrl = () => {
    if (urlInput.trim()) {
      let url = urlInput.trim();
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      onAddWindow('preview', url, new URL(url).hostname);
      setUrlInput('');
      setActiveMenu(null);
    }
  };

  const activeDesktop = desktops.find(d => d.id === activeDesktopId);

  return (
    <div className="h-12 bg-[#0f1115] border-b border-[#2a2e35] flex items-center px-4 select-none z-[1000] relative text-gray-400 text-sm font-medium" ref={menuRef}>
      
      {/* Left: Logo & Desktop Switcher */}
      <div className="flex items-center gap-4">
        <div className="text-yellow-500 flex items-center justify-center">
            <Zap size={20} fill="currentColor" />
        </div>

        {/* Desktop Switcher Button */}
        <div className="relative">
            <button
            onClick={() => toggleMenu('desktops')}
            className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded bg-[#1c1f26] border border-[#2a2e35] hover:bg-[#252932] transition-colors text-gray-300",
                activeMenu === 'desktops' && "bg-[#252932] text-white border-gray-600"
            )}
            >
            <span>{activeDesktop?.name || 'Desktop'}</span>
            </button>

            {activeMenu === 'desktops' && (
            <div className="absolute top-full left-0 mt-2 w-56 bg-[#1c1f26] border border-[#2a2e35] rounded-lg shadow-xl overflow-hidden z-50 flex flex-col">
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2e35] text-xs text-gray-500 uppercase tracking-wider">
                <span>Workspaces</span>
                <button className="hover:text-white" onClick={() => {
                    onAddDesktop();
                    setActiveMenu(null);
                }}><Plus size={14} /></button>
                </div>
                <div className="py-1">
                {desktops.map((desktop) => (
                    <div
                    key={desktop.id}
                    className="group flex items-center justify-between px-3 py-2 hover:bg-[#2a2e35] cursor-pointer"
                    onClick={() => {
                        onSwitchDesktop(desktop.id);
                        setActiveMenu(null);
                    }}
                    >
                    <div className="flex items-center gap-2 text-gray-400 group-hover:text-white">
                        <Monitor size={14} className={desktop.id === activeDesktopId ? "text-blue-400" : "text-gray-500"} />
                        <span className={cn("truncate", desktop.id === activeDesktopId && "font-medium text-white")}>
                            {desktop.name}
                        </span>
                    </div>
                    {desktops.length > 1 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemoveDesktop(desktop.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500 transition-opacity"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                    </div>
                ))}
                </div>
            </div>
            )}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-[#2a2e35]" />

        {/* Chats Menu */}
        <div className="relative">
            <button
            onClick={() => toggleMenu('chats')}
            className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded transition-colors hover:text-white",
                activeMenu === 'chats' && "text-white"
            )}
            >
            <span className="font-mono text-blue-400 text-lg leading-none">{'>_'}</span>
            <span>Chats</span>
            </button>

            {activeMenu === 'chats' && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-[#1c1f26] border border-[#2a2e35] rounded-lg shadow-xl overflow-hidden z-50 flex flex-col">
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2e35] text-xs text-gray-500 uppercase tracking-wider">
                <span>Terminal Sessions</span>
                <div className="flex gap-2">
                    <button className="hover:text-white"><RefreshCw size={14} /></button>
                    <button className="hover:text-white" onClick={() => {
                        onAddWindow('ttyd');
                        setActiveMenu(null);
                    }}><Plus size={14} /></button>
                </div>
                </div>
                <div className="py-1 max-h-64 overflow-y-auto">
                {/* Mock Data */}
                {['pane_1771782405384', 'pane_1771781510926', 'test1', 'Fast-Api', 'ttyd-proxy'].map((session) => (
                    <button
                    key={session}
                    onClick={() => {
                        onAddWindow('ttyd', undefined, session);
                        setActiveMenu(null);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-[#2a2e35] flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                    <span className="text-blue-400 font-mono">{'>_'}</span>
                    <span className="truncate">{session}</span>
                    </button>
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
            <div className="absolute top-full left-0 mt-2 w-72 bg-[#1c1f26] border border-[#2a2e35] rounded-lg shadow-xl overflow-hidden z-50 flex flex-col">
                <div className="p-2 border-b border-[#2a2e35]">
                <div className="flex items-center gap-2 bg-[#252932] rounded border border-[#333] px-2 py-1 focus-within:border-blue-500/50">
                    <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                    placeholder="https://example.com"
                    className="bg-transparent border-none outline-none text-white text-sm w-full placeholder-gray-500"
                    autoFocus
                    />
                    <button onClick={handleAddUrl} className="text-green-500 hover:text-green-400">
                    <Plus size={16} />
                    </button>
                </div>
                </div>
                <div className="py-1">
                <button
                    onClick={() => {
                        onAddWindow('preview', 'https://www.google.com/webhp?igu=1', 'Google');
                        setActiveMenu(null);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-[#2a2e35] flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                    <Globe size={14} className="text-blue-400" />
                    <span>Open Google</span>
                </button>
                <button
                    onClick={() => {
                        onAddWindow('preview', 'https://bing.com', 'Bing');
                        setActiveMenu(null);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-[#2a2e35] flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                    <Globe size={14} className="text-green-400" />
                    <span>Open Bing</span>
                </button>
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

        {/* Grid Layout Button */}
        <button 
          onClick={onLayoutGrid}
          className="hover:text-white transition-colors flex items-center justify-center"
          title="Grid Layout"
        >
          <LayoutGrid size={18} />
        </button>

        {/* Sidebar Toggle */}
        <button 
          onClick={onToggleSidebar}
          className={cn("hover:text-white transition-colors flex items-center justify-center", isSidebarOpen && "text-blue-400")}
          title="Toggle Sidebar"
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

        <button className="hover:text-white transition-colors flex items-center justify-center">
            <LogOut size={18} />
        </button>
      </div>

    </div>
  );
}
