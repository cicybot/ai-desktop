import React, { useState, useEffect, useCallback } from 'react';
import { Desktop } from './components/Desktop';
import { Dock } from './components/Dock';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { CentralPrompt } from './components/CentralPrompt';
import { DesktopState, WindowState, WindowType, DEFAULT_TTYD_URL, Conversation, Message } from './types';

const STORAGE_KEY = 'macos-web-state-v1';

const DEFAULT_DESKTOP: DesktopState = {
  id: 'desktop-1',
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
  
  // Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarPosition, setSidebarPosition] = useState<'left' | 'right'>('right');
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.desktops && parsed.desktops.length > 0) {
          setDesktops(parsed.desktops);
          setActiveDesktopId(parsed.activeDesktopId || parsed.desktops[0].id);
        }
      } catch (e) {
        console.error('Failed to load state', e);
      }
    }
  }, []);

  // Save state to localStorage on change
  useEffect(() => {
    const state = {
      desktops,
      activeDesktopId,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [desktops, activeDesktopId]);

  const activeDesktop = desktops.find((d) => d.id === activeDesktopId) || desktops[0];
  const activeConversationId = activeDesktop.activeConversationId;
  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const handleAddWindow = (type: WindowType, url?: string, title?: string) => {
    const maxZ = Math.max(0, ...activeDesktop.windows.map(w => w.zIndex));
    const newWindow: WindowState = {
      id: generateId(),
      type,
      title: title || (type === 'ttyd' ? 'Terminal' : 'New Window'),
      url: url || (type === 'ttyd' ? DEFAULT_TTYD_URL : 'https://www.google.com/webhp?igu=1'),
      x: 100 + (activeDesktop.windows.length * 20),
      y: 100 + (activeDesktop.windows.length * 20),
      width: 800,
      height: 600,
      zIndex: maxZ + 1,
      isMinimized: false,
      isMaximized: false,
    };

    setDesktops((prev) =>
      prev.map((d) =>
        d.id === activeDesktopId
          ? { ...d, windows: [...d.windows, newWindow] }
          : d
      )
    );
    setActiveWindowId(newWindow.id);
  };

  const handleUpdateWindow = (id: string, updates: Partial<WindowState>) => {
    setDesktops((prev) =>
      prev.map((d) =>
        d.id === activeDesktopId
          ? {
              ...d,
              windows: d.windows.map((w) =>
                w.id === id ? { ...w, ...updates } : w
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

  const handleCloseWindow = (id: string) => {
    setDesktops((prev) =>
      prev.map((d) =>
        d.id === activeDesktopId
          ? { ...d, windows: d.windows.filter((w) => w.id !== id) }
          : d
      )
    );
    if (activeWindowId === id) {
      setActiveWindowId(null);
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

  const handleAddDesktop = () => {
    const newId = generateId();
    const newDesktop: DesktopState = {
      id: newId,
      name: `Desktop ${desktops.length + 1}`,
      windows: [],
      wallpaper: 'default',
      activeConversationId: null,
    };
    setDesktops((prev) => [...prev, newDesktop]);
    setActiveDesktopId(newId);
  };

  const handleRemoveDesktop = (id: string) => {
    if (desktops.length <= 1) return;
    
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

  const handleNewConversation = () => {
    const newId = generateId();
    const newConversation: Conversation = {
      id: newId,
      title: 'New Chat',
      messages: [],
      updatedAt: Date.now(),
    };
    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(newId);
    setIsSidebarOpen(true);
  };

  const handleSendMessage = (content: string) => {
    let currentConversationId = activeConversationId;
    let newConversations = [...conversations];

    if (!currentConversationId) {
        const newId = generateId();
        const newConversation: Conversation = {
            id: newId,
            title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
            messages: [],
            updatedAt: Date.now(),
        };
        newConversations = [newConversation, ...newConversations];
        currentConversationId = newId;
        setActiveConversationId(newId);
    }

    const userMsg: Message = {
        id: generateId(),
        role: 'user',
        content,
        timestamp: Date.now(),
    };

    setConversations(prev => {
        const updated = prev.length === 0 ? newConversations : prev;
        return updated.map(c => {
            if (c.id === currentConversationId) {
                return {
                    ...c,
                    title: c.messages.length === 0 ? content.slice(0, 30) + (content.length > 30 ? '...' : '') : c.title,
                    messages: [...c.messages, userMsg],
                    updatedAt: Date.now(),
                };
            }
            return c;
        });
    });

    setIsSidebarOpen(true);

    // Mock Response
    setTimeout(() => {
        const responseMsg: Message = {
            id: generateId(),
            role: 'assistant',
            content: "I'm a mock AI assistant. I can't actually process your request yet, but I'm here to help!",
            timestamp: Date.now(),
        };
        setConversations(prev => prev.map(c => 
            c.id === currentConversationId 
            ? { ...c, messages: [...c.messages, responseMsg] }
            : c
        ));
    }, 1000);
  };

  // Check if we should show the central prompt
  // Show if:
  // 1. No active conversation for this desktop OR
  // 2. Active conversation has 0 messages
  const showCentralPrompt = !activeConversation || activeConversation.messages.length === 0;

  const handleLayoutGrid = () => {
    const windows = activeDesktop.windows;
    if (windows.length === 0) return;

    const count = windows.length;
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    
    // Calculate available space (subtract dock and topbar)
    // TopBar is 48px (h-12)
    // Dock is roughly 80px (h-16 + padding) - let's assume 100px bottom margin
    const availableWidth = window.innerWidth;
    const availableHeight = window.innerHeight - 48 - 100; 
    
    const width = Math.floor(availableWidth / cols);
    const height = Math.floor(availableHeight / rows);

    setDesktops(prev => prev.map(d => {
        if (d.id !== activeDesktopId) return d;
        
        return {
            ...d,
            windows: d.windows.map((w, index) => {
                const row = Math.floor(index / cols);
                const col = index % cols;
                return {
                    ...w,
                    x: col * width,
                    y: 48 + (row * height), // Start below TopBar
                    width: width - 4, // Gap
                    height: height - 4, // Gap
                    isMaximized: false,
                    isMinimized: false
                };
            })
        };
    }));
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col font-sans text-gray-900 select-none bg-black">
      <TopBar
        desktops={desktops}
        activeDesktopId={activeDesktopId}
        onSwitchDesktop={setActiveDesktopId}
        onAddDesktop={handleAddDesktop}
        onRemoveDesktop={handleRemoveDesktop}
        onAddWindow={handleAddWindow}
        isSidebarOpen={isSidebarOpen}
        sidebarPosition={sidebarPosition}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onSetSidebarPosition={setSidebarPosition}
        onLayoutGrid={handleLayoutGrid}
      />
      
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
        {sidebarPosition === 'left' && (
            <Sidebar
                isOpen={isSidebarOpen}
                position="left"
                conversations={conversations}
                activeConversationId={activeConversationId}
                onNewConversation={handleNewConversation}
                onSelectConversation={setActiveConversationId}
                onSendMessage={handleSendMessage}
                onClose={() => setIsSidebarOpen(false)}
            />
        )}

        <div className="flex-1 relative">
            {showCentralPrompt && (
                <CentralPrompt onSendMessage={handleSendMessage} />
            )}

            <Desktop
                id={activeDesktop.id}
                name={activeDesktop.name}
                windows={activeDesktop.windows}
                activeWindowId={activeWindowId}
                onUpdateWindow={handleUpdateWindow}
                onFocusWindow={handleFocusWindow}
                onCloseWindow={handleCloseWindow}
                onMinimizeWindow={handleMinimizeWindow}
                onMaximizeWindow={handleMaximizeWindow}
            />
            
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
                conversations={conversations}
                activeConversationId={activeConversationId}
                onNewConversation={handleNewConversation}
                onSelectConversation={setActiveConversationId}
                onSendMessage={handleSendMessage}
                onClose={() => setIsSidebarOpen(false)}
            />
        )}
      </div>
    </div>
  );
}
