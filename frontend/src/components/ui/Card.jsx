import React from 'react';
import { cn } from '../../lib/utils';

export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        'rounded-none border border-[#111111] bg-[#F9F9F7] shadow-none',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return (
    <div
      className={cn('flex flex-col space-y-1 p-4 border-b border-[#111111]', className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }) {
  return (
    <h3
      className={cn('text-base md:text-lg font-serif font-bold tracking-tight text-[#111111]', className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }) {
  return <p className={cn('text-xs text-[#555555] font-sans uppercase font-medium', className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-4', className)} {...props} />;
}

export function CardFooter({ className, ...props }) {
  return (
    <div
      className={cn('flex items-center p-4 border-t border-[#111111] bg-[#F9F9F7]', className)}
      {...props}
    />
  );
}
