import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Desktop } from './components/Desktop';
import { Dock } from './components/Dock';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { CentralPrompt } from './components/CentralPrompt';
import { LoginDialog } from './components/LoginDialog';
import { DesktopState, WindowState, WindowType, getTtydUrl, Conversation, Message, User } from './types';
import { groupsApi, authApi, Group, tmuxApi, ttydApi } from './lib/api';
import { DesktopAgent, AgentAction } from './lib/agent';

const STORAGE_KEY = 'macos-web-state-v1';

const DEFAULT_DESKTOP: DesktopState = {
  id: 'desktop-1',
  groupId: null,
  name: 'Desktop 1',
  windows: [],
  wallpaper: 'default',
  activeConversationId: null,
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export default function App() {
  const [desktops, setDesktops] = useState<DesktopState[]>([DEFAULT_DESKTOP]);
  const [activeDesktopId, setActiveDesktopId] = useState<string>('desktop-1');
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [globalLoading, setGlobalLoading] = useState<string | false>(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarPosition, setSidebarPosition] = useState<'left' | 'right'>('right');
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // User State
  const [user, setUser] = useState<User | null>(null);
  const [userPerms, setUserPerms] = useState<string[]>([]);
  const [userGroupId, setUserGroupId] = useState<number | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [agentStatus, setAgentStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const agentRef = useRef<DesktopAgent | null>(null);
  // 用 ref 存最新的 handler，避免 WS 回调闭包问题
  const actionHandlerRef = useRef<(action: AgentAction) => void>(() => {});

  const hasPermission = (perm: string) => userPerms.includes(perm);

  // Check auth first, then load state
  useEffect(() => {
    const init = async () => {
      // Step 3: 解析 URL 参数 token 和 group
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');
      const urlGroup = params.get('group');
      
      if (urlToken) {
        localStorage.setItem('token', urlToken);
        window.history.replaceState({}, '', window.location.pathname);
      }

      const savedToken = localStorage.getItem('token');
      if (!savedToken) {
        setIsLoading(false);
        setIsLoginOpen(true);
        return;
      }

      // 验证 token 并获取 group_id
      try {
        const result = await authApi.verify();
        if (!result.valid) {
          localStorage.removeItem('token');
          setIsLoading(false);
          setIsLoginOpen(true);
          return;
        }
        
        const tokenGroupId = result.group_id || null;
        setUserPerms(result.perms || []);
        setUserGroupId(tokenGroupId);
        
        // Step 3: 校验 URL group 参数与 token group_id 一致
        if (urlGroup && tokenGroupId !== null) {
          const urlGroupNum = parseInt(urlGroup, 10);
          if (urlGroupNum !== tokenGroupId) {
            console.error('[Auth] URL group mismatch:', urlGroupNum, 'vs token group_id:', tokenGroupId);
            alert('Access denied: group mismatch');
            localStorage.removeItem('token');
            setIsLoading(false);
            setIsLoginOpen(true);
            return;
          }
        }
        
        setUser({
          id: 'u-token',
          name: 'Admin',
          email: '',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=admin`,
          plan: 'pro',
        });
      } catch {
        localStorage.removeItem('token');
        setIsLoading(false);
        setIsLoginOpen(true);
        return;
      }

      // Step 4: 按 group_id 加载窗口
      try {
        const [groupsRes, ttydRes] = await Promise.all([
          groupsApi.list(),
          ttydApi.list(),
        ]);
        const ttydMap = new Map<string, { title: string; ttyd_port: number }>();
        if (ttydRes.configs) {
          for (const c of ttydRes.configs) {
            ttydMap.set(c.pane_id, { title: c.title, ttyd_port: c.ttyd_port });
          }
        }

        if (groupsRes.groups && groupsRes.groups.length > 0) {
          // Step 4: 客户 token 只加载自己的 group，管理员加载全部
          let filteredGroups = groupsRes.groups;
          if (userGroupId !== null) {
            filteredGroups = groupsRes.groups.filter((g: Group) => g.id === userGroupId);
          }
          
          if (filteredGroups.length === 0) {
            setDesktops([DEFAULT_DESKTOP]);
            setIsLoading(false);
            return;
          }
          
          const loadedDesktops: DesktopState[] = await Promise.all(
            filteredGroups.map(async (group: Group) => {
              try {
                const detail = await groupsApi.get(group.id);
                const windows: WindowState[] = (detail.panes || []).map((p: any) => {
                  const ttyd = ttydMap.get(p.pane_id);
                  return {
                    id: p.pane_id,
                    type: 'ttyd' as WindowType,
                    title: ttyd?.title || p.pane_id,
                    url: getTtydUrl(p.pane_id),
                    x: p.pos_x || 100,
                    y: p.pos_y || 100,
                    width: p.width || 800,
                    height: p.height || 600,
                    zIndex: p.z_index || 1,
                    isMinimized: false,
                    isMaximized: false,
                  };
                });
                return {
                  id: `desktop-${group.id}`,
                  groupId: group.id,
                  name: group.name,
                  windows,
                  wallpaper: 'default',
                  activeConversationId: null,
                };
              } catch {
                return {
                  id: `desktop-${group.id}`,
                  groupId: group.id,
                  name: group.name,
                  windows: [],
                  wallpaper: 'default',
                  activeConversationId: null,
                };
              }
            })
          );
          setDesktops(loadedDesktops);
          setActiveDesktopId(loadedDesktops[0].id);
        }
      } catch (e) {
        console.error('Failed to load from API, falling back to localStorage', e);
        const savedState = localStorage.getItem(STORAGE_KEY);
        if (savedState) {
          try {
            const parsed = JSON.parse(savedState);
            if (parsed.desktops && parsed.desktops.length > 0) {
              setDesktops(parsed.desktops);
              setActiveDesktopId(parsed.activeDesktopId || parsed.desktops[0].id);
            }
          } catch (parseError) {
            console.error('Failed to parse localStorage', parseError);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // Save state to localStorage on change
  useEffect(() => {
    if (isLoading) return;
    const state = {
      desktops,
      activeDesktopId,
      user,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [desktops, activeDesktopId, user, isLoading]);

  const activeDesktop = desktops.find((d) => d.id === activeDesktopId) || desktops[0];
  
  // Safety check: if no desktop exists, show loading or error
  if (!activeDesktop) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="text-xl mb-2">Loading desktop...</div>
          <div className="text-sm text-gray-400">Please wait</div>
        </div>
      </div>
    );
  }
  
  const activeConversationId = activeDesktop.activeConversationId;
  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const handleAddWindow = async (type: WindowType, url?: string, title?: string, paneId?: string) => {
    if (!activeDesktop.groupId) return;

    // Dedup: if same paneId or same url already on this desktop, just focus it
    const existing = activeDesktop.windows.find(w =>
      (paneId && w.id === paneId) || (type !== 'ttyd' && url && w.url === url)
    );
    if (existing) {
      const maxZ = Math.max(0, ...activeDesktop.windows.map(w => w.zIndex));
      setActiveWindowId(existing.id);
      handleUpdateWindow(existing.id, { isMinimized: false, zIndex: maxZ + 1 });
      return;
    }

    const maxZ = Math.max(0, ...activeDesktop.windows.map(w => w.zIndex));

    if (type === 'ttyd') {
      try {
        let finalPaneId = paneId;
        let finalTitle = title || 'Terminal';
        if (!finalPaneId) {
          setGlobalLoading('Creating agent...');
          await new Promise(r => setTimeout(r, 0));
          try {
            const result = await tmuxApi.create({ title: finalTitle });
            finalPaneId = result.pane_id;
            finalTitle = result.title || finalTitle;
          } finally {
            setGlobalLoading(false);
          }
        }
        await groupsApi.addPane(activeDesktop.groupId, finalPaneId);
        const newWindow: WindowState = {
          id: finalPaneId,
          type,
          title: finalTitle,
          url: getTtydUrl(finalPaneId),
          x: 20 + (activeDesktop.windows.length * 30),
          y: 20 + (activeDesktop.windows.length * 30),
          width: 1050,
          height: 700,
          zIndex: maxZ + 1,
          isMinimized: false,
          isMaximized: false,
        };
        setDesktops((prev) =>
          prev.map((d) =>
            d.id === activeDesktopId ? { ...d, windows: [...d.windows, newWindow] } : d
          )
        );
        setActiveWindowId(newWindow.id);
      } catch (e) {
        console.error('Failed to create terminal:', e);
      }
    } else {
      setGlobalLoading('Opening app...');
      await new Promise(r => setTimeout(r, 0));
      try {
        const windowId = generateId();
        const newWindow: WindowState = {
          id: windowId,
          type,
          title: title || 'New Window',
          url: url || 'https://www.google.com/webhp?igu=1',
          x: 20 + (activeDesktop.windows.length * 30),
          y: 20 + (activeDesktop.windows.length * 30),
          width: 1050,
          height: 700,
          zIndex: maxZ + 1,
          isMinimized: false,
          isMaximized: false,
        };
        try {
          await groupsApi.addPane(activeDesktop.groupId, windowId);
        } catch (e) {
          console.error('Failed to add pane to API:', e);
        }
        setDesktops((prev) =>
          prev.map((d) =>
            d.id === activeDesktopId ? { ...d, windows: [...d.windows, newWindow] } : d
          )
        );
        setActiveWindowId(newWindow.id);
      } finally {
        setGlobalLoading(false);
      }
    }
  };

  const handleUpdateWindow = async (id: string, updates: Partial<WindowState>) => {
    // 限制窗口位置：x >= 0, y >= -20 (保证顶部栏至少 20px 可见)
    const sanitizedUpdates = { ...updates };
    if (sanitizedUpdates.x !== undefined) {
      sanitizedUpdates.x = Math.max(0, sanitizedUpdates.x);
    }
    if (sanitizedUpdates.y !== undefined) {
      sanitizedUpdates.y = Math.max(-20, sanitizedUpdates.y);
    }

    if (!activeDesktop.groupId) {
      setDesktops((prev) =>
        prev.map((d) =>
          d.id === activeDesktopId
            ? {
                ...d,
                windows: d.windows.map((w) =>
                  w.id === id ? { ...w, ...sanitizedUpdates } : w
                ),
              }
            : d
        )
      );
      return;
    }

    const window = activeDesktop.windows.find((w) => w.id === id);
    if (window && sanitizedUpdates.title && window.type === 'ttyd') {
      tmuxApi.renamePane(id, sanitizedUpdates.title).catch(e => console.error('Failed to rename pane:', e));
    }
    if (window && (sanitizedUpdates.x !== undefined || sanitizedUpdates.y !== undefined || sanitizedUpdates.width !== undefined || sanitizedUpdates.height !== undefined || sanitizedUpdates.zIndex !== undefined)) {
      try {
        await groupsApi.updatePaneLayout(activeDesktop.groupId, id, {
          pos_x: sanitizedUpdates.x ?? window.x,
          pos_y: sanitizedUpdates.y ?? window.y,
          width: sanitizedUpdates.width ?? window.width,
          height: sanitizedUpdates.height ?? window.height,
          z_index: sanitizedUpdates.zIndex ?? window.zIndex,
        });
      } catch (e) {
        console.error('Failed to update pane layout:', e);
      }
    }

    setDesktops((prev) =>
      prev.map((d) =>
        d.id === activeDesktopId
          ? {
              ...d,
              windows: d.windows.map((w) =>
                w.id === id ? { ...w, ...sanitizedUpdates } : w
              ),
            }
          : d
      )
    );
  };

  const handleFocusWindow = (id: string) => {
    setActiveWindowId(id);
    setDesktops((prev) =>
        prev.map((d) => {
            if (d.id !== activeDesktopId) return d;
            
            const maxZ = Math.max(0, ...d.windows.map(w => w.zIndex));
            return {
                ...d,
                windows: d.windows.map(w => 
                    w.id === id ? { ...w, zIndex: maxZ + 1 } : w
                )
            };
        })
    );
  };

  const handleCloseWindow = async (id: string) => {
    const win = activeDesktop.windows.find(w => w.id === id);

    // Remove from UI immediately
    setDesktops((prev) =>
      prev.map((d) =>
        d.id === activeDesktopId
          ? { ...d, windows: d.windows.filter((w) => w.id !== id) }
          : d
      )
    );
    if (activeWindowId === id) setActiveWindowId(null);

    // API cleanup in background
    if (activeDesktop.groupId) {
      groupsApi.removePane(activeDesktop.groupId, id).catch(() => {});
    }
    if (win?.type === 'ttyd') {
      // Only remove from group, don't delete the pane/agent
    }
  };

  const handleMinimizeWindow = (id: string) => {
    handleUpdateWindow(id, { isMinimized: true });
    setActiveWindowId(null);
  };

  const handleMaximizeWindow = (id: string) => {
    const window = activeDesktop.windows.find((w) => w.id === id);
    if (window) {
      handleUpdateWindow(id, { isMaximized: !window.isMaximized });
    }
  };

  const handleAddDesktop = async () => {
    const name = `Desktop ${desktops.length + 1}`;
    setGlobalLoading('Creating desktop...');
    await new Promise(r => setTimeout(r, 0));
    try {
      const group = await groupsApi.create(name);
      const newDesktop: DesktopState = {
        id: `desktop-${group.id}`,
        groupId: group.id,
        name: group.name,
        windows: [],
        wallpaper: 'default',
        activeConversationId: null,
      };
      setDesktops((prev) => [...prev, newDesktop]);
      setActiveDesktopId(newDesktop.id);
    } catch (e) {
      console.error('Failed to create desktop:', e);
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleRenameDesktop = async (id: string, name: string) => {
    setDesktops((prev) =>
      prev.map((d) => (d.id === id ? { ...d, name } : d))
    );
    const desktop = desktops.find((d) => d.id === id);
    if (desktop?.groupId) {
      groupsApi.update(desktop.groupId, name).catch(() => {});
    }
  };

  const handleRemoveDesktop = async (id: string) => {
    if (desktops.length <= 1) return;
    
    const desktop = desktops.find((d) => d.id === id);
    if (desktop?.groupId) {
      try {
        await groupsApi.delete(desktop.groupId);
      } catch (e) {
        console.error('Failed to delete desktop:', e);
      }
    }
    
    const newDesktops = desktops.filter((d) => d.id !== id);
    setDesktops(newDesktops);
    
    if (activeDesktopId === id) {
      setActiveDesktopId(newDesktops[0].id);
    }
  };

  // Sidebar Handlers
  const setActiveConversationId = (id: string | null) => {
    setDesktops(prev => prev.map(d => 
        d.id === activeDesktopId ? { ...d, activeConversationId: id } : d
    ));
  };

  // Agent action handler — 处理后端推送的操作指令
  const handleAgentAction = useCallback(async (action: AgentAction) => {
    switch (action.type) {
      case 'add_terminal':
        await handleAddWindow('ttyd', undefined, action.title);
        break;
      case 'add_iframe':
        await handleAddWindow('preview', action.url, action.title);
        break;
      case 'close_window':
        await handleCloseWindow(action.window_id);
        break;
      case 'close_all':
        for (const w of [...activeDesktop.windows]) await handleCloseWindow(w.id);
        break;
      case 'resize_window':
        await handleUpdateWindow(action.window_id, {
          ...(action.x !== undefined && { x: action.x }),
          ...(action.y !== undefined && { y: action.y }),
          ...(action.width !== undefined && { width: action.width }),
          ...(action.height !== undefined && { height: action.height }),
        });
        break;
      case 'grid_layout':
        await handleLayoutGrid();
        break;
      case 'focus_window':
        handleFocusWindow(action.window_id);
        break;
      case 'minimize_window':
        handleMinimizeWindow(action.window_id);
        break;
      case 'maximize_window':
        handleMaximizeWindow(action.window_id);
        break;
      case 'restart_terminal':
        try { await tmuxApi.restartPane(action.window_id); } catch {}
        break;
      case 'send_command':
        try { await tmuxApi.send(action.window_id, action.command); } catch {}
        break;
      case 'message':
      case 'thinking':
      case 'error': {
        const convId = activeConversationId;
        if (convId) {
          addAssistantMessage(convId, action.type === 'error' ? `❌ ${action.content}` : action.type === 'thinking' ? `💭 ${action.content}` : action.content);
        }
        break;
      }
    }
  }, [activeDesktop, activeConversationId]);

  // 保持 ref 最新
  useEffect(() => {
    actionHandlerRef.current = handleAgentAction;
  }, [handleAgentAction]);

  // 每个桌面建立 WS Agent 连接
  useEffect(() => {
    if (!activeDesktop.groupId) return;
    const token = localStorage.getItem('token') || '';
    
    // 销毁旧连接
    agentRef.current?.destroy();
    
    agentRef.current = new DesktopAgent(
      activeDesktop.groupId,
      token,
      (action) => actionHandlerRef.current(action),
      setAgentStatus,
    );

    return () => {
      agentRef.current?.destroy();
      agentRef.current = null;
    };
  }, [activeDesktop.groupId]);

  const handleNewConversation = () => {
    const newId = generateId();
    const newConversation: Conversation = {
      id: newId,
      desktopId: activeDesktopId,
      title: 'New Chat',
      messages: [],
      updatedAt: Date.now(),
    };
    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(newId);
    setIsSidebarOpen(true);
  };

  const addAssistantMessage = (convId: string, content: string) => {
    const msg: Message = { id: generateId(), role: 'assistant', content, timestamp: Date.now() };
    setConversations(prev => prev.map(c =>
      c.id === convId ? { ...c, messages: [...c.messages, msg], updatedAt: Date.now() } : c
    ));
  };

  const handleAgentCommand = async (cmd: string, convId: string) => {
    const lower = cmd.toLowerCase().trim();

    // 终端操作
    if (/^(open|new|创建|打开)\s*(terminal|终端)/i.test(lower)) {
      await handleAddWindow('ttyd');
      addAssistantMessage(convId, '✅ 已创建新终端');
      return true;
    }

    if (/^(close|关闭)\s*(terminal|终端|window|窗口)\s*(all|所有)?/i.test(lower)) {
      const wins = [...activeDesktop.windows];
      for (const w of wins) await handleCloseWindow(w.id);
      addAssistantMessage(convId, `✅ 已关闭 ${wins.length} 个窗口`);
      return true;
    }

    if (/^(restart|重启)\s*(terminal|终端)\s*(.+)?/i.test(lower)) {
      const match = cmd.match(/(?:restart|重启)\s*(?:terminal|终端)\s*(.+)?/i);
      const target = match?.[1]?.trim();
      const win = target
        ? activeDesktop.windows.find(w => w.title.toLowerCase().includes(target.toLowerCase()) || w.id.includes(target))
        : activeDesktop.windows.find(w => w.type === 'ttyd');
      if (win) {
        try { await tmuxApi.restartPane(win.id); addAssistantMessage(convId, `✅ 已重启终端: ${win.title}`); }
        catch { addAssistantMessage(convId, `❌ 重启失败: ${win.title}`); }
      } else {
        addAssistantMessage(convId, '❌ 未找到终端');
      }
      return true;
    }

    // 发送命令到终端
    const sendMatch = cmd.match(/^(?:send|run|执行|发送)\s+(.+?)(?:\s+(?:to|到)\s+(.+))?$/i);
    if (sendMatch) {
      const command = sendMatch[1];
      const target = sendMatch[2]?.trim();
      const win = target
        ? activeDesktop.windows.find(w => w.title.toLowerCase().includes(target.toLowerCase()))
        : activeDesktop.windows.find(w => w.type === 'ttyd');
      if (win) {
        try { await tmuxApi.send(win.id, command); addAssistantMessage(convId, `✅ 已发送命令到 ${win.title}: \`${command}\``); }
        catch { addAssistantMessage(convId, `❌ 发送失败`); }
      } else {
        addAssistantMessage(convId, '❌ 未找到终端');
      }
      return true;
    }

    // 浏览器
    const urlMatch = cmd.match(/^(?:open|打开)\s+(https?:\/\/\S+)(?:\s+(.+))?$/i);
    if (urlMatch) {
      await handleAddWindow('preview', urlMatch[1], urlMatch[2] || urlMatch[1]);
      addAssistantMessage(convId, `✅ 已打开: ${urlMatch[1]}`);
      return true;
    }
    if (/^(open|new|打开)\s*(browser|浏览器)/i.test(lower)) {
      await handleAddWindow('preview', 'https://www.google.com/webhp?igu=1', 'Google');
      addAssistantMessage(convId, '✅ 已打开浏览器');
      return true;
    }

    // 桌面操作
    if (/^(new|add|新建|添加)\s*(desktop|桌面)/i.test(lower)) {
      await handleAddDesktop();
      addAssistantMessage(convId, '✅ 已创建新桌面');
      return true;
    }

    const switchMatch = cmd.match(/^(?:switch|切换)\s*(?:to|到)?\s*(?:desktop|桌面)\s*(.+)/i);
    if (switchMatch) {
      const target = switchMatch[1].trim();
      const d = desktops.find(d => d.name.toLowerCase().includes(target.toLowerCase()) || d.id.includes(target));
      if (d) { setActiveDesktopId(d.id); addAssistantMessage(convId, `✅ 已切换到: ${d.name}`); }
      else { addAssistantMessage(convId, `❌ 未找到桌面: ${target}`); }
      return true;
    }

    if (/^(grid|layout|布局|排列)/i.test(lower)) {
      await handleLayoutGrid();
      addAssistantMessage(convId, '✅ 已自动排列窗口');
      return true;
    }

    // 状态查询
    if (/^(status|状态|list|列表|ls)/i.test(lower)) {
      const wins = activeDesktop.windows.map(w => `  • ${w.title} (${w.type})`).join('\n');
      const desktopList = desktops.map(d => `  ${d.id === activeDesktopId ? '▶' : '○'} ${d.name} (${d.windows.length} 窗口)`).join('\n');
      addAssistantMessage(convId, `📊 **当前桌面:** ${activeDesktop.name}\n\n**窗口:**\n${wins || '  (空)'}\n\n**所有桌面:**\n${desktopList}`);
      return true;
    }

    // 帮助
    if (/^(help|帮助|commands|命令|\?)/i.test(lower)) {
      addAssistantMessage(convId, `🤖 **ZapOS Agent 命令:**

**终端:**
• \`open terminal\` — 创建终端
• \`close terminal all\` — 关闭所有窗口
• \`restart terminal [name]\` — 重启终端
• \`send <cmd> to <name>\` — 发送命令到终端

**浏览器:**
• \`open browser\` — 打开浏览器
• \`open https://...\` — 打开URL

**桌面:**
• \`new desktop\` — 新建桌面
• \`switch to desktop <name>\` — 切换桌面
• \`grid\` — 自动排列窗口

**查询:**
• \`status\` — 查看当前状态
• \`help\` — 显示帮助`);
      return true;
    }

    return false;
  };

  const handleSendMessage = async (content: string) => {
    let currentConversationId = activeConversationId;

    if (!currentConversationId) {
      const newId = generateId();
      const newConversation: Conversation = {
        id: newId,
        desktopId: activeDesktopId,
        title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
        messages: [],
        updatedAt: Date.now(),
      };
      setConversations(prev => [newConversation, ...prev]);
      currentConversationId = newId;
      setActiveConversationId(newId);
    }

    const userMsg: Message = { id: generateId(), role: 'user', content, timestamp: Date.now() };
    setConversations(prev => prev.map(c =>
      c.id === currentConversationId
        ? { ...c, title: c.messages.length === 0 ? content.slice(0, 30) + (content.length > 30 ? '...' : '') : c.title, messages: [...c.messages, userMsg], updatedAt: Date.now() }
        : c
    ));
    setIsSidebarOpen(true);

    const handled = await handleAgentCommand(content, currentConversationId!);
    if (!handled) {
      // 本地命令不匹配，发给后端 Agent
      if (agentRef.current) {
        agentRef.current.send(content);
        addAssistantMessage(currentConversationId!, '💭 正在思考...');
      } else {
        addAssistantMessage(currentConversationId!, '⚠️ Agent 未连接，输入 `help` 查看本地命令');
      }
    }
  };

  // Check if we should show the central prompt (empty desktop, no windows)
  const showCentralPrompt = activeDesktop.windows.length === 0;
  const activeDesktopConversations = conversations.filter(c => c.desktopId === activeDesktopId);
  
  // Auto-open sidebar when there are windows
  useEffect(() => {
    if (activeDesktop.windows.length > 0 && !isSidebarOpen) {
      setIsSidebarOpen(true);
    }
  }, [activeDesktop.windows.length]);

  const handleLayoutSplit = (direction: 'h' | 'v') => {
    const wins = activeDesktop.windows.filter(w => !w.isMinimized);
    const count = wins.length;
    if (count === 0) return;
    const startX = 20, startY = 20;
    const bottom = 60;
    const gap = 8;
    const availW = window.innerWidth - startX * 2;
    const availH = window.innerHeight - startY - bottom;

    setDesktops(prev => prev.map(d => {
      if (d.id !== activeDesktopId) return d;
      const newWindows = d.windows.map(w => {
        const idx = wins.findIndex(ww => ww.id === w.id);
        if (idx === -1) return w;
        if (direction === 'v') {
          const colW = (availW - (count - 1) * gap) / count;
          return { ...w, x: startX + idx * (colW + gap), y: startY, width: colW, height: availH, isMaximized: false, isMinimized: false };
        } else {
          const rowH = (availH - (count - 1) * gap) / count;
          return { ...w, x: startX, y: startY + idx * (rowH + gap), width: availW, height: rowH, isMaximized: false, isMinimized: false };
        }
      });
      return { ...d, windows: newWindows };
    }));
  };

  const handleLayoutGrid = async () => {
    const windows = activeDesktop.windows;
    const count = windows.length;
    if (count === 0) return;
    
    // Calculate available space
    const startX = 20, startY = 20;
    const dockHeight = 60;
    const gap = 8;
    const sidebarWidth = isSidebarOpen ? 320 : 0;
    
    const availableWidth = window.innerWidth - sidebarWidth - (startX * 2);
    const availableHeight = window.innerHeight - startY - dockHeight; 

    // Find optimal grid dimensions
    // We want the cell aspect ratio to be close to 16:9 (1.77) or at least > 1
    let bestCols = 1;
    let bestRows = 1;
    let bestScore = Infinity;

    for (let cols = 1; cols <= count; cols++) {
        const rows = Math.ceil(count / cols);
        const cellWidth = availableWidth / cols;
        const cellHeight = availableHeight / rows;
        const ratio = cellWidth / cellHeight;
        
        // We prefer landscape windows, so ratio around 1.6 is good.
        // We penalize very narrow or very flat windows.
        const targetRatio = 1.6;
        const score = Math.abs(ratio - targetRatio);
        
        if (score < bestScore) {
            bestScore = score;
            bestCols = cols;
            bestRows = rows;
        }
    }

    setDesktops(prev => prev.map(d => {
        if (d.id !== activeDesktopId) return d;
        
        // Create a copy of windows to sort or maintain order? 
        // Let's maintain current z-index order or just ID order?
        // Usually users expect visual order to be somewhat stable, but for now let's just iterate.
        // To make it stable, we might want to sort by current X/Y position?
        // Let's sort by Y then X to keep "top-left" windows at the start.
        const sortedWindows = [...d.windows].sort((a, b) => {
            if (Math.abs(a.y - b.y) > 50) return a.y - b.y; // Row major-ish
            return a.x - b.x;
        });

        const newWindows = d.windows.map(w => w); // Clone
        
        let windowIndex = 0;
        for (let r = 0; r < bestRows; r++) {
            // How many windows in this row?
            // If it's the last row, it takes the remainder.
            // But wait, if we have N=5, Cols=3. Rows=2.
            // Row 0: 3 windows.
            // Row 1: 2 windows.
            // We want the last row to fill the width? Or stay grid aligned?
            // "Fill width" looks better usually.
            
            const remainingWindows = count - windowIndex;
            const isLastRow = r === bestRows - 1;
            
            // Standard grid approach:
            // const colsInRow = bestCols;
            
            // "Fill last row" approach:
            // If we are at the last row, distribute remaining windows evenly.
            // However, if the grid is 4x2 and we have 5 windows (4 in row 1, 1 in row 2),
            // the single window in row 2 being super wide might look weird.
            // Let's stick to "Fill width" for now as requested "regular" but "experience good".
            
            const colsInRow = (isLastRow && remainingWindows < bestCols) ? remainingWindows : bestCols;
            
            const rowHeight = (availableHeight - ((bestRows - 1) * gap)) / bestRows;
            const widthPerWindow = (availableWidth - ((colsInRow - 1) * gap)) / colsInRow;

            for (let c = 0; c < colsInRow; c++) {
                if (windowIndex >= count) break;
                
                const targetWindow = sortedWindows[windowIndex];
                const originalIndex = d.windows.findIndex(w => w.id === targetWindow.id);
                
                if (originalIndex !== -1) {
                    newWindows[originalIndex] = {
                        ...newWindows[originalIndex],
                        x: startX + (c * (widthPerWindow + gap)),
                        y: startY + (r * (rowHeight + gap)),
                        width: widthPerWindow,
                        height: rowHeight,
                        isMaximized: false,
                        isMinimized: false
                    };
                }
                
                windowIndex++;
            }
        }

        return {
            ...d,
            windows: newWindows
        };
    }));

    // 同步布局到API
    if (activeDesktop.groupId) {
      // 需要用计算后的新坐标，重新算一遍
      const sortedWindows = [...activeDesktop.windows].sort((a, b) => {
        if (Math.abs(a.y - b.y) > 50) return a.y - b.y;
        return a.x - b.x;
      });
      const layoutPanes: { pane_id: string; pos_x: number; pos_y: number; width: number; height: number; z_index: number }[] = [];
      let idx = 0;
      for (let r = 0; r < bestRows; r++) {
        const remaining = count - idx;
        const isLast = r === bestRows - 1;
        const colsInRow = (isLast && remaining < bestCols) ? remaining : bestCols;
        const rowHeight = (availableHeight - ((bestRows - 1) * gap)) / bestRows;
        const widthPerWindow = (availableWidth - ((colsInRow - 1) * gap)) / colsInRow;
        for (let c = 0; c < colsInRow; c++) {
          if (idx >= count) break;
          const w = sortedWindows[idx];
          layoutPanes.push({
            pane_id: w.id,
            pos_x: startX + (c * (widthPerWindow + gap)),
            pos_y: startY + (r * (rowHeight + gap)),
            width: widthPerWindow,
            height: rowHeight,
            z_index: w.zIndex,
          });
          idx++;
        }
      }
      try {
        await groupsApi.batchUpdateLayout(activeDesktop.groupId, layoutPanes);
      } catch (e) {
        console.error('Failed to sync layout to API:', e);
      }
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col font-sans text-gray-900 select-none bg-black">
      {globalLoading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/20">
          <div className="flex items-center gap-3 bg-[#1c1f26] px-6 py-4 rounded-xl border border-[#2a2e35] shadow-2xl">
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-300">{globalLoading}</span>
          </div>
        </div>
      )}
      <TopBar
        desktops={desktops}
        activeDesktopId={activeDesktopId}
        onSwitchDesktop={setActiveDesktopId}
        onAddDesktop={handleAddDesktop}
        onRemoveDesktop={handleRemoveDesktop}
        onRenameDesktop={handleRenameDesktop}
        onAddWindow={handleAddWindow}
        isCreatingAgent={false}
        setLoading={setGlobalLoading}
        isSidebarOpen={isSidebarOpen}
        sidebarPosition={sidebarPosition}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onSetSidebarPosition={setSidebarPosition}
        onLayoutGrid={handleLayoutGrid}
        onLayoutSplitH={() => handleLayoutSplit('h')}
        onLayoutSplitV={() => handleLayoutSplit('v')}
        user={user}
        onOpenLogin={() => setIsLoginOpen(true)}
        onLogout={() => {
            setUser(null);
            setIsLoginOpen(false);
        }}
        onUpgrade={(planId) => {
            if (user) {
                setUser({ ...user, plan: planId });
            }
        }}
        userPerms={userPerms}
        userGroupId={userGroupId}

      />
      
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
        {sidebarPosition === 'left' && (
            <Sidebar
                isOpen={isSidebarOpen}
                position="left"
                conversations={activeDesktopConversations}
                activeConversationId={activeConversationId}
                onNewConversation={handleNewConversation}
                onSelectConversation={setActiveConversationId}
                onSendMessage={handleSendMessage}
                onClose={() => setIsSidebarOpen(false)}
                groupId={activeDesktop.groupId}
            />
        )}

        <div className="flex-1 relative">
            {/* CentralPrompt - 空桌面时居中显示 */}
            {showCentralPrompt && (
                <CentralPrompt 
                  onSendMessage={handleSendMessage} 
                  groupId={activeDesktop?.groupId || null}
                  userPerms={userPerms}
                />
            )}

            {desktops.map((desktop) => (
              <div key={desktop.id} style={{ display: desktop.id === activeDesktopId ? 'block' : 'none' }} className="absolute inset-0">
                <Desktop
                    id={desktop.id}
                    name={desktop.name}
                    windows={desktop.windows}
                    activeWindowId={desktop.id === activeDesktopId ? activeWindowId : null}
                    onUpdateWindow={handleUpdateWindow}
                    onFocusWindow={handleFocusWindow}
                    onCloseWindow={handleCloseWindow}
                    onMinimizeWindow={handleMinimizeWindow}
                    onMaximizeWindow={handleMaximizeWindow}
                />
              </div>
            ))}
            
            <Dock
                windows={activeDesktop.windows}
                activeWindowId={activeWindowId}
                onAddWindow={(type) => handleAddWindow(type)}
                onActivateWindow={(id) => {
                    handleFocusWindow(id);
                    handleUpdateWindow(id, { isMinimized: false });
                }}
            />
        </div>

        {/* Right Sidebar */}
        {sidebarPosition === 'right' && (
            <Sidebar
                isOpen={isSidebarOpen}
                position="right"
                conversations={activeDesktopConversations}
                activeConversationId={activeConversationId}
                onNewConversation={handleNewConversation}
                onSelectConversation={setActiveConversationId}
                onSendMessage={handleSendMessage}
                onClose={() => setIsSidebarOpen(false)}
                groupId={activeDesktop.groupId}
            />
        )}
      </div>

      <LoginDialog 
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        user={user}
        onLogin={(u) => {
            setUser(u);
            setIsLoginOpen(false);
        }}
        onLogout={() => {
            setUser(null);
            localStorage.removeItem('token');
            setIsLoginOpen(false);
        }}
        onUpgrade={() => {}}
      />
    </div>
  );
}
