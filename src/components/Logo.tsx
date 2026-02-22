import React from 'react';
import { Zap } from 'lucide-react';
import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Logo({ className, showText = true, size = 'md' }: LogoProps) {
  const iconSize = size === 'sm' ? 14 : size === 'md' ? 18 : size === 'lg' ? 24 : 32;
  const textSize = size === 'sm' ? 'text-sm' : size === 'md' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-4xl';
  const boxSize = size === 'sm' ? 'w-6 h-6' : size === 'md' ? 'w-8 h-8' : size === 'lg' ? 'w-10 h-10' : 'w-16 h-16';

  return (
    <div className={cn("flex items-center gap-2.5 font-bold select-none", className)}>
      <div className={cn(
        "flex items-center justify-center rounded-lg bg-gradient-to-br from-yellow-400 to-orange-600 text-white shadow-lg shadow-orange-500/20",
        boxSize
      )}>
        <Zap size={iconSize} fill="currentColor" className="text-white drop-shadow-sm" strokeWidth={3} />
      </div>
      {showText && (
        <span className={cn("tracking-tight text-white font-display", textSize)}>
          Zap<span className="text-yellow-500">OS</span>
        </span>
      )}
    </div>
  );
}
