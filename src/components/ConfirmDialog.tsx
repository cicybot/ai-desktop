import React from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  danger?: boolean;
}

export function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmText = 'Confirm', danger = false }: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div className="bg-[#1c1f26] border border-[#2a2e35] rounded-xl shadow-2xl w-80 p-5" onClick={e => e.stopPropagation()}>
        <div className="text-white font-semibold text-sm mb-2">{title}</div>
        <div className="text-gray-400 text-xs mb-5">{message}</div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-[#252932] rounded border border-[#333] hover:border-gray-500 transition-colors">Cancel</button>
          <button onClick={onConfirm} className={`px-3 py-1.5 text-xs text-white rounded transition-colors ${danger ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'}`}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
