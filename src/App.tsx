import React, { useState, useEffect, useCallback } from 'react';
import { Desktop } from './components/Desktop';
import { Dock } from './components/Dock';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { CentralPrompt } from './components/CentralPrompt';
import { LoginDialog } from './components/LoginDialog';
import { DesktopState, WindowState, WindowType, DEFAULT_TTYD_URL, Conversation, Message, User } from './types';

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

  // User State
  const [user, setUser] = useState<User | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

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
        if (parsed.user) {
            setUser(parsed.user);
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
      user,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [desktops, activeDesktopId, user]);

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

  const handleRenameDesktop = (id: string, name: string) => {
    setDesktops((prev) =>
      prev.map((d) => (d.id === id ? { ...d, name } : d))
    );
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
      desktopId: activeDesktopId,
      title: 'New Chat',
      messages: [],
      updatedAt: Date.now(),
    };
    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(newId);
    setIsSidebarOpen(true);
  };

  const handleSendMessage = (content: string) => {
    // Check for commands
    if (content.toLowerCase() === 'open terminal') {
        handleAddWindow('ttyd');
        return;
    }
    if (content.toLowerCase() === 'new browser' || content.toLowerCase() === 'open browser') {
        handleAddWindow('preview', 'https://www.google.com/webhp?igu=1', 'Google');
        return;
    }
    if (content.toLowerCase() === 'switch to desktop 2') {
        if (desktops.length < 2) {
            handleAddDesktop();
        }
        // Find the second desktop
        const secondDesktop = desktops[1] || desktops[0]; // Fallback if add failed or async issue (though state update is batched usually, here we might need to wait, but for simplicity let's just try to switch if exists)
        // Actually, since setState is async, we can't switch immediately if we just added it.
        // But if it exists:
        if (desktops.length >= 2) {
             setActiveDesktopId(desktops[1].id);
        }
        return;
    }

    let currentConversationId = activeConversationId;
    let newConversations = [...conversations];

    if (!currentConversationId) {
        const newId = generateId();
        const newConversation: Conversation = {
            id: newId,
            desktopId: activeDesktopId,
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
        // If we created a new conversation locally, use that list as base, otherwise use prev
        // But wait, if we created a new one, it's already in newConversations.
        // However, prev might have changed? Unlikely in this synchronous block but good practice.
        // Actually, if we created a new conversation, we need to make sure we don't lose it.
        
        // Simpler approach:
        // If currentConversationId was null, we definitely created a new one.
        // We need to add it to the state.
        
        let updatedConversations = prev;
        if (!activeConversationId) {
             // We created a new one
             const newConv = newConversations.find(c => c.id === currentConversationId);
             if (newConv) {
                 updatedConversations = [newConv, ...prev];
             }
        }

        return updatedConversations.map(c => {
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
  // 1. No windows on the active desktop
  // 2. No conversation history for THIS desktop
  const activeDesktopConversations = conversations.filter(c => c.desktopId === activeDesktopId);
  const showCentralPrompt = activeDesktop.windows.length === 0 && activeDesktopConversations.length === 0;

  const handleLayoutGrid = () => {
    const windows = activeDesktop.windows;
    const count = windows.length;
    if (count === 0) return;
    
    // Calculate available space
    const topBarHeight = 48;
    const dockHeight = 96; // Approx
    const gap = 8;
    const outerMargin = 16;
    const sidebarWidth = isSidebarOpen ? 320 : 0;
    
    const availableWidth = window.innerWidth - sidebarWidth - (outerMargin * 2);
    const availableHeight = window.innerHeight - topBarHeight - dockHeight - outerMargin; 

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
                        x: outerMargin + (c * (widthPerWindow + gap)),
                        y: topBarHeight + outerMargin + (r * (rowHeight + gap)),
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
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col font-sans text-gray-900 select-none bg-black">
      <TopBar
        desktops={desktops}
        activeDesktopId={activeDesktopId}
        onSwitchDesktop={setActiveDesktopId}
        onAddDesktop={handleAddDesktop}
        onRemoveDesktop={handleRemoveDesktop}
        onRenameDesktop={handleRenameDesktop}
        onAddWindow={handleAddWindow}
        isSidebarOpen={isSidebarOpen}
        sidebarPosition={sidebarPosition}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onSetSidebarPosition={setSidebarPosition}
        onLayoutGrid={handleLayoutGrid}
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
                conversations={activeDesktopConversations}
                activeConversationId={activeConversationId}
                onNewConversation={handleNewConversation}
                onSelectConversation={setActiveConversationId}
                onSendMessage={handleSendMessage}
                onClose={() => setIsSidebarOpen(false)}
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
            setIsLoginOpen(false);
        }}
        onUpgrade={(planId) => {
            if (user) {
                setUser({ ...user, plan: planId });
            }
        }}
      />
    </div>
  );
}
