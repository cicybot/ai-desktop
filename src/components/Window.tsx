import React, { useState, useEffect, useRef } from 'react';
import { motion, useDragControls } from 'motion/react';
import { ResizableBox, ResizeCallbackData } from 'react-resizable';
import { X, Minus, Maximize2, Minimize2 } from 'lucide-react';
import { WindowState } from '../types';
import { cn } from '../lib/utils';
import 'react-resizable/css/styles.css';

interface WindowProps {
  window: WindowState;
  isActive: boolean;
  onFocus: (id: string) => void;
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  onMaximize: (id: string) => void;
  onUpdate: (id: string, updates: Partial<WindowState>) => void;
}

export const Window: React.FC<WindowProps> = ({
  window,
  isActive,
  onFocus,
  onClose,
  onMinimize,
  onMaximize,
  onUpdate,
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [size, setSize] = useState({ width: window.width, height: window.height });
  const dragControls = useDragControls();
  const nodeRef = useRef<HTMLDivElement>(null);

  // Sync size from props when not resizing
  useEffect(() => {
    if (!isResizing) {
      setSize({ width: window.width, height: window.height });
    }
  }, [window.width, window.height, isResizing]);

  const handleResize = (e: React.SyntheticEvent, data: ResizeCallbackData) => {
    setSize({ width: data.size.width, height: data.size.height });
  };

  const handleResizeStop = (e: React.SyntheticEvent, data: ResizeCallbackData) => {
    setIsResizing(false);
    onUpdate(window.id, { width: data.size.width, height: data.size.height });
  };

  const handleDragEnd = (event: any, info: any) => {
    setIsDragging(false);
    const newX = window.x + info.offset.x;
    const newY = window.y + info.offset.y;
    onUpdate(window.id, { x: newX, y: newY });
  };

  if (window.isMinimized) {
    return null;
  }

  // Determine if we need to mask the iframe
  // 1. If dragging or resizing (even if active), mask it to prevent event stealing during fast movements
  // 2. If not active, mask it so clicks activate the window instead of interacting with iframe content
  const showMask = isDragging || isResizing || !isActive;

  return (
    <motion.div
      ref={nodeRef}
      drag
      dragListener={false}
      dragControls={dragControls}
      dragMomentum={false}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      initial={{ x: window.x, y: window.y }}
      style={{
        position: 'absolute',
        x: window.x,
        y: window.y,
        zIndex: window.zIndex,
        width: size.width,
        height: size.height,
      }}
      className={cn(
        "absolute flex flex-col bg-white/80 backdrop-blur-md rounded-lg shadow-2xl border border-white/20 overflow-hidden",
        isActive ? "ring-1 ring-black/5 shadow-xl" : "opacity-90 shadow-md"
      )}
      onPointerDown={() => onFocus(window.id)}
    >
      <ResizableBox
        width={size.width}
        height={size.height}
        minConstraints={[300, 200]}
        maxConstraints={[1920, 1080]}
        onResizeStart={() => setIsResizing(true)}
        onResize={handleResize}
        onResizeStop={handleResizeStop}
        resizeHandles={['se', 's', 'e']}
        handle={(h, ref) => {
            const className = cn(
                "absolute z-50 hover:bg-blue-500/20 transition-colors",
                h === 's' && "bottom-0 left-0 right-0 h-2 cursor-s-resize -mb-1",
                h === 'e' && "right-0 top-0 bottom-0 w-2 cursor-e-resize -mr-1",
                h === 'se' && "bottom-0 right-0 w-5 h-5 cursor-se-resize z-50 -mr-1 -mb-1"
            );
            return <span className={className} ref={ref} />;
        }}
        className="flex flex-col w-full h-full"
      >
        {/* Title Bar */}
        <div
          className="h-9 bg-gray-200/80 border-b border-gray-300/50 flex items-center justify-between px-3 shrink-0 cursor-grab active:cursor-grabbing select-none"
          onPointerDown={(e) => {
            dragControls.start(e);
          }}
        >
            {/* Window Controls */}
            <div className="flex items-center gap-2 group z-50" onPointerDown={(e) => e.stopPropagation()}>
                <button 
                    onClick={() => onClose(window.id)}
                    className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-black/0 hover:text-black/50 transition-colors shadow-sm"
                >
                    <X size={8} strokeWidth={3} />
                </button>
                <button 
                    onClick={() => onMinimize(window.id)}
                    className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 flex items-center justify-center text-black/0 hover:text-black/50 transition-colors shadow-sm"
                >
                    <Minus size={8} strokeWidth={3} />
                </button>
                <button 
                    onClick={() => onMaximize(window.id)}
                    className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-black/0 hover:text-black/50 transition-colors shadow-sm"
                >
                    {window.isMaximized ? <Minimize2 size={8} strokeWidth={3} /> : <Maximize2 size={8} strokeWidth={3} />}
                </button>
            </div>

            {/* Address Bar / Title */}
            <div className="flex-1 mx-4 flex justify-center items-center">
                <input 
                    type="text" 
                    value={window.url}
                    onChange={(e) => onUpdate(window.id, { url: e.target.value })}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="w-full max-w-md bg-white/50 hover:bg-white/80 focus:bg-white text-xs text-center focus:text-left px-2 py-0.5 rounded transition-colors outline-none border border-transparent focus:border-blue-400/50 placeholder-gray-400 truncate cursor-text"
                    placeholder="Enter URL..."
                />
            </div>
            
            <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Content */}
        <div className="flex-1 relative bg-white w-full h-full overflow-hidden">
            {/* Overlay to catch clicks during drag/resize or when inactive */}
            {showMask && (
                <div 
                    className="absolute inset-0 z-50 bg-transparent" 
                    // If it's inactive, clicking this mask should focus the window.
                    // The parent onPointerDown handles focus, but if we have an iframe, 
                    // the iframe swallows the event unless we have this mask.
                />
            )}
            <iframe
                src={window.url}
                className="w-full h-full border-none"
                title={window.title}
                style={{ pointerEvents: showMask ? 'none' : 'auto' }}
            />
        </div>
      </ResizableBox>
    </motion.div>
  );
}
