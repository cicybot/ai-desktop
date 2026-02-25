import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, X, ChevronLeft, ChevronRight, History, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { Conversation, Message } from '../types';

interface SidebarProps {
  isOpen: boolean;
  position: 'left' | 'right';
  conversations: Conversation[];
  activeConversationId: string | null;
  onNewConversation: () => void;
  onSelectConversation: (id: string) => void;
  onSendMessage: (content: string) => void;
  onClose: () => void;
  groupId: number | null;
}

export function Sidebar({
  isOpen,
  position,
  conversations,
  activeConversationId,
  onNewConversation,
  onSelectConversation,
  onSendMessage,
  onClose,
  groupId,
}: SidebarProps) {
  const [input, setInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  // WebSocket 连接到 /ws/agent/{group_id}
  useEffect(() => {
    if (!groupId || !isOpen) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    // Dynamic WebSocket URL based on current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const wsUrl = `${protocol}//g-fast-api.${host.replace('desktop.', '')}/ws/agent/${groupId}?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[Sidebar] WebSocket connected to group', groupId);
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'message' && data.content) {
          // Trigger parent callback to add assistant message
          onSendMessage(`[Assistant] ${data.content}`);
        }
      } catch (e) {
        console.error('[Sidebar] Failed to parse message:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('[Sidebar] WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('[Sidebar] WebSocket closed');
      setIsConnected(false);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [groupId, isOpen, onSendMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    // Send to WebSocket only
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'prompt',
        content: input
      }));
    }
    
    setInput('');
  };

  if (!isOpen) return null;

  return (
    <div className={cn(
      "w-80 bg-[#1e1e1e] border-r border-[#333] flex flex-col h-full transition-all duration-300 shrink-0",
      position === 'right' && "border-l border-r-0 order-last"
    )}>
      {/* Header */}
      <div className="h-10 border-b border-[#333] flex items-center justify-between px-3 bg-[#252526]">
        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Copilot</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowHistory(!showHistory)} className={cn("p-1 rounded hover:bg-[#333] text-gray-400 hover:text-white", showHistory && "bg-[#333] text-white")}>
            <History size={14} />
          </button>
          <button onClick={onNewConversation} className="p-1 rounded hover:bg-[#333] text-gray-400 hover:text-white">
            <Plus size={14} />
          </button>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#333] text-gray-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col relative">
        {showHistory ? (
          <div className="absolute inset-0 bg-[#1e1e1e] z-10 overflow-y-auto p-2">
            <h3 className="text-xs font-semibold text-gray-500 mb-2 px-2">History</h3>
            {conversations.map(c => (
              <button
                key={c.id}
                onClick={() => {
                  onSelectConversation(c.id);
                  setShowHistory(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 rounded text-sm mb-1 truncate",
                  activeConversationId === c.id ? "bg-[#37373d] text-white" : "text-gray-400 hover:bg-[#2a2d2e] hover:text-gray-200"
                )}
              >
                {c.title || 'New Chat'}
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeConversation?.messages.length === 0 && (
                <div className="text-center text-gray-500 text-sm mt-10">
                  <p>How can I help you today?</p>
                </div>
              )}
              {activeConversation?.messages.map((msg) => (
                <div key={msg.id} className={cn("flex flex-col gap-1", msg.role === 'user' ? "items-end" : "items-start")}>
                  <div className={cn(
                    "max-w-[90%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                    msg.role === 'user' ? "bg-[#0e639c] text-white" : "bg-[#252526] text-gray-300 border border-[#333]"
                  )}>
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-gray-600 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-[#333] bg-[#1e1e1e]">
              <div className="relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask Copilot..."
                  className="w-full bg-[#2d2d2d] text-gray-200 text-sm rounded border border-[#3c3c3c] focus:border-[#007fd4] outline-none p-2 pr-8 resize-none h-20"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="absolute bottom-2 right-2 p-1 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={14} />
                </button>
              </div>
              {/* Connection Status */}
              <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-600">
                <div className={cn("w-1.5 h-1.5 rounded-full", isConnected ? "bg-green-500" : "bg-red-500")} />
                <span>{isConnected ? "Connected" : "Disconnected"}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
