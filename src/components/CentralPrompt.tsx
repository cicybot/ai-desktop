import React, { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

interface CentralPromptProps {
  onSendMessage: (message: string) => void;
}

export function CentralPrompt({ onSendMessage }: CentralPromptProps) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-40 pointer-events-none">
      <div className="w-full max-w-2xl px-6 pointer-events-auto transform -translate-y-12">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg shadow-blue-500/20">
              <Sparkles className="text-white" size={32} />
            </div>
          </div>
          <h1 className="text-4xl font-semibold text-white mb-3 tracking-tight">
            How can I help you today?
          </h1>
          <p className="text-gray-400 text-lg font-light">
            I can help you manage your windows, run commands, or answer questions.
          </p>
        </div>
        
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl opacity-20 group-hover:opacity-40 transition duration-500 blur-lg"></div>
          <div className="relative bg-[#1e1e1e]/90 backdrop-blur-xl rounded-xl border border-[#333] shadow-2xl flex items-center p-2 group-focus-within:border-blue-500/50 transition-colors">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSend();
                }
              }}
              placeholder="Ask anything..."
              className="flex-1 bg-transparent border-none outline-none text-white text-lg px-4 py-3 placeholder-gray-500 font-light"
              autoFocus
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim()}
              className={cn(
                "p-3 rounded-lg transition-all duration-200",
                input.trim() 
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20" 
                  : "bg-[#2d2d2d] text-gray-500 cursor-not-allowed"
              )}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
        
        <div className="mt-6 flex justify-center gap-3">
          {['Open Terminal', 'New Browser', 'Switch to Desktop 2'].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => onSendMessage(suggestion)}
              className="px-4 py-2 bg-[#2d2d2d]/50 hover:bg-[#3d3d3d] border border-[#333] hover:border-gray-500 rounded-full text-sm text-gray-400 hover:text-white transition-all backdrop-blur-sm"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
