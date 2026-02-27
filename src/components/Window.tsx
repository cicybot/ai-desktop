import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ResizableBox, ResizeCallbackData } from 'react-resizable';
import { X, Minus, Maximize2, Minimize2, ExternalLink, RotateCw } from 'lucide-react';
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
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(window.title);
  const [size, setSize] = useState({ width: window.width, height: window.height });
  const nodeRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number; wx: number; wy: number } | null>(null);

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

  const handleDragStart = useCallback((e: React.PointerEvent) => {
    if (window.isMaximized) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY, wx: window.x, wy: window.y };
    setIsDragging(true);
  }, [window.x, window.y, window.isMaximized]);

  const handleDragMove = useCallback((e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const newX = Math.max(0, dragStart.current.wx + e.clientX - dragStart.current.x);
    const newY = Math.max(0, dragStart.current.wy + e.clientY - dragStart.current.y);
    if (nodeRef.current) {
      nodeRef.current.style.left = newX + 'px';
      nodeRef.current.style.top = newY + 'px';
    }
  }, []);

  const handleDragEnd = useCallback((e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const newX = Math.max(0, dragStart.current.wx + e.clientX - dragStart.current.x);
    const newY = Math.max(0, dragStart.current.wy + e.clientY - dragStart.current.y);
    dragStart.current = null;
    setIsDragging(false);
    onUpdate(window.id, { x: newX, y: newY });
  }, [window.id, onUpdate]);

  if (window.isMinimized) {
    return null;
  }

  // Determine if we need to mask the iframe
  // 1. If dragging or resizing (even if active), mask it to prevent event stealing during fast movements
  // 2. If not active, mask it so clicks activate the window instead of interacting with iframe content
  const showMask = isDragging || isResizing || !isActive;

  const WindowContent = (
    <div className="flex flex-col w-full h-full">
        {/* Title Bar */}
        <div
          className={`h-9 bg-gray-200/80 border-b border-gray-300/50 flex items-center justify-between px-3 shrink-0 select-none ${isDragging ? 'cursor-move' : 'cursor-grab active:cursor-move'}`}
          onPointerDown={(e) => {
            handleDragStart(e);
          }}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
        >
            {/* Window Controls */}
            <div className="flex items-center gap-0 group z-50" onPointerDown={(e) => e.stopPropagation()}>
                <button 
                    onClick={() => onClose(window.id)}
                    className="p-1.5 flex items-center justify-center cursor-pointer"
                >
                    <span className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-black/0 hover:text-black/50 transition-colors shadow-sm"><X size={8} strokeWidth={3} /></span>
                </button>
                <button 
                    onClick={() => onMinimize(window.id)}
                    className="p-1.5 flex items-center justify-center cursor-pointer"
                >
                    <span className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 flex items-center justify-center text-black/0 hover:text-black/50 transition-colors shadow-sm"><Minus size={8} strokeWidth={3} /></span>
                </button>
                <button 
                    onClick={() => onMaximize(window.id)}
                    className="p-1.5 flex items-center justify-center cursor-pointer"
                >
                    <span className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-black/0 hover:text-black/50 transition-colors shadow-sm">{window.isMaximized ? <Minimize2 size={8} strokeWidth={3} /> : <Maximize2 size={8} strokeWidth={3} />}</span>
                </button>
            </div>

            {/* Address Bar / Title */}
            {window.type === 'ttyd' ? (
            editingTitle ? (
            <input
                type="text"
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { onUpdate(window.id, { title: titleDraft }); setEditingTitle(false); } if (e.key === 'Escape') setEditingTitle(false); }}
                onBlur={() => { onUpdate(window.id, { title: titleDraft }); setEditingTitle(false); }}
                onPointerDown={e => e.stopPropagation()}
                className="flex-1 mx-4 bg-white text-xs text-center px-2 py-0.5 rounded border border-blue-400/50 outline-none"
                autoFocus
            />
            ) : (
            <div className="flex-1 text-center text-xs text-gray-500 truncate" onDoubleClick={() => { setTitleDraft(window.title); setEditingTitle(true); }}>{window.title}</div>
            )
            ) : (
            <div className="flex-1 mx-4 flex justify-center items-center">
                <input 
                    type="text" 
                    readOnly
                    value={window.title}
                    onPointerDown={(e) => e.stopPropagation()}
                    onDoubleClick={() => { setTitleDraft(window.title); setEditingTitle(true); }}
                    className="w-full max-w-md bg-white/50 text-xs text-center px-2 py-0.5 rounded transition-colors outline-none border border-transparent placeholder-gray-400 truncate cursor-default"
                    placeholder="Enter URL..."
                />
            </div>
            )}
            
            <div className="flex items-center gap-1">
                <button
                    onClick={() => { const iframe = document.querySelector<HTMLIFrameElement>(`iframe[title="${window.title}"]`); if (iframe) iframe.src = iframe.src; }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="p-1 hover:bg-black/10 rounded transition-colors"
                    title="Reload"
                >
                    <RotateCw size={12} className="text-gray-500" />
                </button>
                <button
                    onClick={() => globalThis.open(window.url, '_blank')}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="p-1 hover:bg-black/10 rounded transition-colors"
                    title="Open in new window"
                >
                    <ExternalLink size={12} className="text-gray-500" />
                </button>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative bg-white w-full h-full overflow-hidden">
            {showMask && (
                <div 
                    className="absolute inset-0 z-50 bg-transparent" 
                />
            )}
            <iframe
                src={window.url}
                className="w-full h-full border-none"
                title={window.title}
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
                style={{ pointerEvents: showMask ? 'none' : 'auto' }}
            />
        </div>
    </div>
  );

  if (window.isMaximized) {
    return (
        <div
            ref={nodeRef}
            style={{
                position: 'absolute',
                zIndex: window.zIndex,
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
            }}
            className={cn(
                "absolute flex flex-col bg-white shadow-none border-none overflow-hidden",
                isActive ? "z-[50]" : "z-[10]"
            )}
            onPointerDown={() => onFocus(window.id)}
        >
            {WindowContent}
        </div>
    );
  }

  return (
    <div
      ref={nodeRef}
      style={{
        position: 'absolute',
        zIndex: window.zIndex,
        left: window.x,
        top: window.y,
        width: size.width,
        height: size.height,
      }}
      className={cn(
        "absolute flex flex-col bg-white rounded-lg shadow-lg border border-gray-200",
        isActive ? "shadow-xl" : "opacity-95 shadow-md"
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
                h === 's' && "bottom-0 left-0 right-0 h-3 cursor-s-resize -mb-1.5",
                h === 'e' && "right-0 top-0 bottom-0 w-3 cursor-e-resize -mr-1.5",
                h === 'se' && "bottom-0 right-0 w-8 h-8 cursor-se-resize z-50 -mr-2 -mb-2"
            );
            return <span className={className} ref={ref} />;
        }}
        className="flex flex-col w-full h-full overflow-hidden rounded-lg"
      >
        {WindowContent}
      </ResizableBox>
    </div>
  );
}
