import React, { useState } from 'react';
import { Terminal, Globe } from 'lucide-react';
import { WindowState } from '../types';
import { cn } from '../lib/utils';

interface DockProps {
  windows: WindowState[];
  activeWindowId: string | null;
  onAddWindow: (type: 'ttyd' | 'preview') => void;
  onActivateWindow: (id: string) => void;
}

export function Dock({ windows, activeWindowId, onAddWindow, onActivateWindow }: DockProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (windows.length === 0) return null;

  const getSize = (i: number) => {
    if (hoveredIndex === null) return 40;
    const d = Math.abs(i - hoveredIndex);
    if (d === 0) return 60;
    if (d === 1) return 50;
    if (d === 2) return 44;
    return 40;
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 h-16 z-[100] flex justify-center items-end group pointer-events-none">
      <div className="absolute bottom-0 w-full h-4 pointer-events-auto" />
      <div className="mb-4 pointer-events-auto transition-transform duration-300 translate-y-[120%] group-hover:translate-y-0">
        <div className="flex items-end gap-1 px-3 py-2 bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl">
          {windows.map((window, i) => {
            const size = getSize(i);
            return (
              <div
                key={window.id}
                className="relative flex flex-col items-center"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {hoveredIndex === i && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-[10px] rounded-md pointer-events-none whitespace-nowrap z-10">
                    {window.title}
                    <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45" />
                  </div>
                )}
                <button
                  onClick={() => onActivateWindow(window.id)}
                  style={{ width: size, height: size, transition: 'width 0.15s ease, height 0.15s ease' }}
                  className={cn(
                    "rounded-lg flex items-center justify-center shrink-0",
                    window.type === 'ttyd' ? "bg-black/70 hover:bg-black/90 shadow-lg border border-white/10" : "bg-white/40 hover:bg-white/60 shadow-lg border border-white/30",
                    activeWindowId === window.id && "ring-2 ring-blue-400/50"
                  )}
                >
                  {window.type === 'ttyd' ? <Terminal size={size * 0.5} className="text-green-400" /> : <Globe size={size * 0.5} className="text-blue-400" />}
                </button>
                <div className={cn("w-1 h-1 rounded-full bg-black/50 mt-1")} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
