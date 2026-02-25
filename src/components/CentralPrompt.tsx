import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Logo } from './Logo';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface CentralPromptProps {
  onSendMessage: (message: string) => void;
  groupId: number | null;
  userPerms: string[];
}

export function CentralPrompt({ onSendMessage, groupId, userPerms }: CentralPromptProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hasPromptPermission = userPerms.includes('prompt');

  // WebSocket connection
  useEffect(() => {
    if (!groupId) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    // Dynamic WebSocket URL based on current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const wsUrl = `${protocol}//g-fast-api.${host.replace('desktop.', '')}/ws/agent/${groupId}?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[CentralPrompt] WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'message' && data.content) {
          const newMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: data.content,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, newMessage]);
        }
      } catch (e) {
        console.error('[CentralPrompt] Failed to parse message:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('[CentralPrompt] WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('[CentralPrompt] WebSocket closed');
      setIsConnected(false);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [groupId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !hasPromptPermission) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Send to WebSocket only
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'prompt',
        content: input
      }));
    }

    setInput('');
  };

  const startRecording = async () => {
    if (!hasPromptPermission) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (error) {
      console.error('[CentralPrompt] Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      // Dynamic STT service URL
      const sttUrl = import.meta.env.VITE_STT_URL || `${window.location.protocol}//${window.location.hostname}:15003`;
      const response = await fetch(`${sttUrl}/transcribe`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        if (data.text) {
          setInput(data.text);
          // Auto-send after transcription
          setTimeout(() => {
            if (data.text.trim()) {
              handleSend();
            }
          }, 100);
        }
      }
    } catch (error) {
      console.error('[CentralPrompt] Transcription failed:', error);
    } finally {
      setIsTranscribing(false);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className={cn(
      "absolute z-40 pointer-events-none transition-all duration-300",
      hasMessages 
        ? "bottom-6 left-1/2 -translate-x-1/2 w-full max-w-3xl px-6"
        : "inset-0 flex flex-col items-center justify-center"
    )}>
      <div className="w-full pointer-events-auto">
        {!hasMessages && (
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Logo size="xl" showText={false} />
            </div>
            <h1 className="text-4xl font-semibold text-white mb-3 tracking-tight">
              How can I help you today?
            </h1>
            <p className="text-gray-400 text-lg font-light">
              {hasPromptPermission 
                ? "I can help you manage your windows, run commands, or answer questions."
                : "You can view the conversation history."}
            </p>
          </div>
        )}

        {/* Message History */}
        {hasMessages && (
          <div className="mb-4 max-h-96 overflow-y-auto bg-[#1e1e1e]/90 backdrop-blur-xl rounded-xl border border-[#333] p-4 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={cn(
                "flex gap-3",
                msg.role === 'user' ? "justify-end" : "justify-start"
              )}>
                <div className={cn(
                  "max-w-[80%] rounded-lg px-4 py-2",
                  msg.role === 'user' 
                    ? "bg-yellow-600 text-white" 
                    : "bg-[#2d2d2d] text-gray-200"
                )}>
                  <p className="text-sm">{msg.content}</p>
                  <p className="text-xs opacity-60 mt-1">
                    {msg.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
        
        {/* Input Box */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl opacity-20 group-hover:opacity-40 transition duration-500 blur-lg"></div>
          <div className="relative bg-[#1e1e1e]/90 backdrop-blur-xl rounded-xl border border-[#333] shadow-2xl flex items-center p-2 group-focus-within:border-yellow-500/50 transition-colors">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={hasPromptPermission ? "Ask anything..." : "Read-only mode"}
              disabled={!hasPromptPermission}
              className="flex-1 bg-transparent border-none outline-none text-white text-lg px-4 py-3 placeholder-gray-500 font-light disabled:opacity-50"
              autoFocus={hasPromptPermission}
            />
            
            {/* Voice Button */}
            {hasPromptPermission && (
              <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={isTranscribing}
                className={cn(
                  "p-3 rounded-lg transition-all duration-200 mr-2",
                  isRecording 
                    ? "bg-red-600 text-white animate-pulse" 
                    : isTranscribing
                    ? "bg-gray-600 text-white"
                    : "bg-[#2d2d2d] text-gray-400 hover:bg-[#3d3d3d] hover:text-white"
                )}
                title={isRecording ? "Release to stop" : "Hold to record"}
              >
                {isTranscribing ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : isRecording ? (
                  <MicOff size={20} />
                ) : (
                  <Mic size={20} />
                )}
              </button>
            )}

            {/* Send Button */}
            <button 
              onClick={handleSend}
              disabled={!input.trim() || !hasPromptPermission}
              className={cn(
                "p-3 rounded-lg transition-all duration-200",
                input.trim() && hasPromptPermission
                  ? "bg-yellow-600 hover:bg-yellow-500 text-white shadow-lg shadow-yellow-500/20" 
                  : "bg-[#2d2d2d] text-gray-500 cursor-not-allowed"
              )}
            >
              <Send size={20} />
            </button>
          </div>
        </div>

        {/* Connection Status */}
        {hasPromptPermission && (
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isConnected ? "bg-green-500" : "bg-red-500"
              )} />
              <span>{isConnected ? "Connected" : "Disconnected"}</span>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="hover:text-white transition-colors"
              >
                Clear history
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
