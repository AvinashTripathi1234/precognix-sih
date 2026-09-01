import React from 'react';
import { cn } from '../../lib/utils';

export function Badge({ className, variant = 'default', children, ...props }) {
  const variants = {
    default: 'bg-transparent text-[#111111] border-[#111111]',
    critical: 'bg-[#CC0000] text-white border-[#CC0000] font-bold',
    high: 'bg-[#111111] text-white border-[#111111] font-bold',
    moderate: 'bg-[#F9F9F7] text-[#111111] border-[#111111] font-bold',
    low: 'bg-[#F9F9F7] text-[#555555] border-[#888888] font-bold',
    indigo: 'bg-[#F9F9F7] text-[#111111] border-[#111111]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-none border px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
