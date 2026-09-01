import React from 'react';
import { cn } from '../../lib/utils';

export const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        'flex min-h-[130px] w-full rounded-none border border-[#111111] bg-[#F9F9F7] p-3 text-xs md:text-sm text-[#111111] font-mono placeholder:text-[#888888] focus-visible:outline-none focus-visible:border-b-2 focus-visible:border-b-[#111111] disabled:cursor-not-allowed disabled:opacity-50 leading-relaxed shadow-none',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

Textarea.displayName = 'Textarea';
