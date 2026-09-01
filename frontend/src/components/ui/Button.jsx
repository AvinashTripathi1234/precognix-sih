import React from 'react';
import { cn } from '../../lib/utils';

export const Button = React.forwardRef(
  ({ className, variant = 'default', size = 'default', disabled, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 rounded-none text-xs font-mono font-bold uppercase tracking-wider transition-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#111111] disabled:pointer-events-none disabled:opacity-50 cursor-pointer border';

    const variants = {
      default: 'bg-[#111111] text-[#F9F9F7] border-[#111111] hover:bg-[#2a2a2a]',
      destructive: 'bg-[#CC0000] text-white border-[#CC0000] hover:bg-[#a00000]',
      outline: 'border-[#111111] bg-transparent text-[#111111] hover:bg-[#111111] hover:text-[#F9F9F7]',
      secondary: 'border-[#111111] bg-transparent text-[#111111] hover:bg-[#111111] hover:text-[#F9F9F7]',
      ghost: 'border-transparent text-[#111111] hover:bg-[#111111] hover:text-[#F9F9F7]',
      emerald: 'bg-[#111111] text-[#F9F9F7] border-[#111111] hover:bg-[#2a2a2a]',
    };

    const sizes = {
      default: 'h-10 px-4 py-2',
      sm: 'h-8 px-3 text-[11px]',
      lg: 'h-12 px-6 text-xs md:text-sm font-bold',
      icon: 'h-9 w-9 p-0',
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
