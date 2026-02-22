import React from 'react';
import { Terminal, Globe, Monitor } from 'lucide-react';
import { motion } from 'motion/react';
import { WindowState } from '../types';
import { cn } from '../lib/utils';

interface DockProps {
  windows: WindowState[];
  activeWindowId: string | null;
  onAddWindow: (type: 'ttyd' | 'preview') => void;
  onActivateWindow: (id: string) => void;
}

export function Dock({ windows, activeWindowId, onAddWindow, onActivateWindow }: DockProps) {
  if (windows.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 z-[100] flex justify-center items-end group pointer-events-none">
      {/* Trigger zone */}
      <div className="absolute bottom-0 w-full h-4 pointer-events-auto" />
      
      <div className="mb-4 pointer-events-auto transition-transform duration-300 translate-y-[120%] group-hover:translate-y-0">
        <div className="flex items-end gap-2 px-3 py-2 bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl">
          {/* Running Windows */}
          {windows.map((window) => (
            <DockItem
              key={window.id}
              label={window.title}
              icon={
                window.type === 'ttyd' ? (
                  <Terminal size={20} className="text-gray-300" />
                ) : (
                  <Globe size={20} className="text-blue-400" />
                )
              }
              isActive={activeWindowId === window.id}
              isOpen={true}
              onClick={() => onActivateWindow(window.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface DockItemProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  isOpen?: boolean;
  onClick: () => void;
}

const DockItem: React.FC<DockItemProps> = ({ icon, label, isActive, isOpen, onClick }) => {
  return (
    <div className="group relative flex flex-col items-center gap-1">
      {/* Tooltip */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gray-800 text-white text-[10px] rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
        {label}
        <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45" />
      </div>

      <motion.button
        whileHover={{ scale: 1.1, y: -3 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200",
          "bg-white/40 hover:bg-white/60 shadow-lg border border-white/30",
          isActive && "bg-white/70 ring-2 ring-blue-400/50"
        )}
      >
        {icon}
      </motion.button>
      
      {/* Indicator dot */}
      <div className={cn(
        "w-1 h-1 rounded-full bg-black/50 transition-all duration-300",
        isOpen ? "opacity-100" : "opacity-0"
      )} />
    </div>
  );
}
