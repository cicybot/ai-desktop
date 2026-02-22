import React from 'react';
import { Window } from './Window';
import { WindowState } from '../types';

interface DesktopProps {
  id: string;
  name: string;
  windows: WindowState[];
  activeWindowId: string | null;
  onUpdateWindow: (id: string, updates: Partial<WindowState>) => void;
  onFocusWindow: (id: string) => void;
  onCloseWindow: (id: string) => void;
  onMinimizeWindow: (id: string) => void;
  onMaximizeWindow: (id: string) => void;
}

export function Desktop({
  id,
  name,
  windows,
  activeWindowId,
  onUpdateWindow,
  onFocusWindow,
  onCloseWindow,
  onMinimizeWindow,
  onMaximizeWindow,
}: DesktopProps) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0a0a0a]">
      {/* Tech Grid Background */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
            backgroundImage: `linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/80 pointer-events-none" />
      
      {/* Windows Layer */}
      <div className="relative w-full h-full">
        {windows.map((window) => (
          <Window
            key={window.id}
            window={window}
            isActive={activeWindowId === window.id}
            onUpdate={onUpdateWindow}
            onFocus={onFocusWindow}
            onClose={onCloseWindow}
            onMinimize={onMinimizeWindow}
            onMaximize={onMaximizeWindow}
          />
        ))}
      </div>
    </div>
  );
}
