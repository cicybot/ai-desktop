import React from 'react';
import { Bot, Plus, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

interface Agent {
  pane_id: string;
  title: string;
  ttyd_port?: number;
  active?: number;
}

interface AgentSidebarProps {
  agents: Agent[];
  selectedAgentId: string | null;
  onSelectAgent: (agent: Agent) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function AgentSidebar({
  agents,
  selectedAgentId,
  onSelectAgent,
  onRefresh,
  isLoading,
}: AgentSidebarProps) {
  return (
    <div className="fixed left-0 top-5 bottom-5 w-72 bg-[#1c1f26] border-r border-[#2a2e35] flex flex-col z-40">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2e35]">
        <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Agents</span>
        <div className="flex gap-2">
          <button 
            className="hover:text-white cursor-pointer p-1" 
            onClick={onRefresh}
            title="Refresh"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-2">
        {agents.length === 0 ? (
          <div className="px-4 py-3 text-xs text-gray-500">No agents found</div>
        ) : (
          agents.map((agent) => (
            <div
              key={agent.pane_id}
              className={cn(
                "w-full text-left px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors",
                selectedAgentId === agent.pane_id 
                  ? "bg-[#252932] text-white" 
                  : "text-gray-400 hover:bg-[#2a2e35] hover:text-white"
              )}
              onClick={() => onSelectAgent(agent)}
            >
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                selectedAgentId === agent.pane_id ? "bg-green-500/20" : "bg-blue-500/20"
              )}>
                <Bot size={18} className={selectedAgentId === agent.pane_id ? "text-green-400" : "text-blue-400"} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{agent.title || agent.pane_id}</div>
                <div className="text-xs text-gray-500 truncate">{agent.pane_id}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
