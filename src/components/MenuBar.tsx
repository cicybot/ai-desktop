import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Battery, Wifi, Search, Command, Monitor, Plus, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface MenuBarProps {
  desktops: { id: string; name: string }[];
  activeDesktopId: string;
  onSwitchDesktop: (id: string) => void;
  onAddDesktop: () => void;
  onRemoveDesktop: (id: string) => void;
}

export function MenuBar({
  desktops,
  activeDesktopId,
  onSwitchDesktop,
  onAddDesktop,
  onRemoveDesktop,
}: MenuBarProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-8 bg-white/30 backdrop-blur-xl border-b border-white/20 flex items-center justify-between px-4 select-none z-[1000] relative shadow-sm">
      {/* Left: App Menu */}
      <div className="flex items-center gap-4">
        <div className="font-bold text-sm flex items-center gap-2">
          <Command size={16} />
          <span>MacOS Web</span>
        </div>
        
        {/* Desktop Switcher */}
        <div className="flex items-center gap-1 ml-4 bg-black/5 p-1 rounded-lg">
          {desktops.map((desktop) => (
            <button
              key={desktop.id}
              onClick={() => onSwitchDesktop(desktop.id)}
              className={cn(
                "px-3 py-0.5 text-xs rounded-md transition-all flex items-center gap-2 group",
                activeDesktopId === desktop.id
                  ? "bg-white shadow-sm text-black font-medium"
                  : "hover:bg-black/5 text-gray-600"
              )}
            >
              <Monitor size={12} />
              {desktop.name}
              {/* Only show delete on hover if not the only desktop */}
              {desktops.length > 1 && (
                <span 
                    onClick={(e) => { e.stopPropagation(); onRemoveDesktop(desktop.id); }}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity ml-1"
                >
                    <Trash2 size={10} />
                </span>
              )}
            </button>
          ))}
          <button
            onClick={onAddDesktop}
            className="p-1 hover:bg-black/5 rounded-md text-gray-600 transition-colors"
            title="Add Desktop"
          >
            <Plus size={12} />
          </button>
        </div>
      </div>

      {/* Right: Status Icons */}
      <div className="flex items-center gap-4 text-sm font-medium text-gray-800">
        <div className="flex items-center gap-3 opacity-80">
            <Search size={16} />
            <Wifi size={16} />
            <Battery size={16} />
        </div>
        <span>{format(time, 'EEE MMM d h:mm aa')}</span>
      </div>
    </div>
  );
}
