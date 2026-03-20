/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import * as React from 'react';
import { cn } from '../../lib/utils/cn';

type Ctx = { open: boolean; setOpen: (v: boolean) => void };
const DropdownCtx = React.createContext<Ctx | null>(null);

function useDropdownCtx() {
  const ctx = React.useContext(DropdownCtx);
  if (!ctx) throw new Error('DropdownMenu components must be used within <DropdownMenu>');
  return ctx;
}

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <DropdownCtx.Provider value={{ open, setOpen }}>
      <div ref={rootRef} className="relative inline-block" onKeyDown={onKeyDown}>
        {children}
      </div>
    </DropdownCtx.Provider>
  );
}

// Widen onClick to accept any Element events (so asChild works with custom components)
type TriggerProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'children'> & {
  asChild?: boolean;
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<Element>;
};

export const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, TriggerProps>(
  ({ asChild, onClick, children, ...props }, ref) => {
    const { open, setOpen } = useDropdownCtx();

    if (asChild) {
      const child = React.Children.only(children as React.ReactElement<any>);
      const mergedOnClick: React.MouseEventHandler<any> = (e) => {
        setOpen(!open);
        onClick?.(e);
        child.props?.onClick?.(e);
      };
      // Do not pass ref here to avoid ref-during-render warnings
      return React.cloneElement(child, { onClick: mergedOnClick });
    }

    return (
      <button
        ref={ref}
        {...props}
        onClick={(e) => {
          setOpen(!open);
          onClick?.(e as unknown as React.MouseEvent<Element>);
        }}
      >
        {children}
      </button>
    );
  }
);
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

type ContentProps = React.HTMLAttributes<HTMLDivElement> & {
  align?: 'start' | 'end';
};

export const DropdownMenuContent = React.forwardRef<HTMLDivElement, ContentProps>(
  ({ className, align = 'start', ...props }, ref) => {
    const { open } = useDropdownCtx();
    if (!open) return null;

    return (
      <div
        ref={ref}
        role="menu"
        className={cn(
          'absolute z-50 min-w-40 rounded-md border bg-white p-1 text-sm shadow-md ring-1 ring-black/5',
          'dark:border-white/10 dark:bg-neutral-900',
          align === 'end' ? 'right-0' : 'left-0',
          className
        )}
        tabIndex={-1}
        {...props}
      />
    );
  }
);
DropdownMenuContent.displayName = 'DropdownMenuContent';

type ItemProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  inset?: boolean;
};

export const DropdownMenuItem = React.forwardRef<HTMLButtonElement, ItemProps>(
  ({ className, inset, onClick, children, ...props }, ref) => {
    const { setOpen } = useDropdownCtx();
    return (
      <button
        ref={ref}
        role="menuitem"
        className={cn(
          'w-full cursor-pointer select-none rounded-sm px-2 py-1.5 text-left outline-none transition-colors',
          'hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10',
          'disabled:pointer-events-none disabled:opacity-50',
          inset && 'pl-8',
          className
        )}
        onClick={(e) => {
          onClick?.(e);
          setOpen(false);
        }}
        {...props}
      >
        {children}
      </button>
    );
  }
);
DropdownMenuItem.displayName = 'DropdownMenuItem';
