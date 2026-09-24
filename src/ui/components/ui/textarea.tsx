import type { ComponentPropsWithRef } from 'react';
import { cn } from '../../lib/utils';

/** `ComponentPropsWithRef` so the composer can hold a ref for auto-grow. */
export function Textarea({
  className,
  ...props
}: ComponentPropsWithRef<'textarea'>) {
  return <textarea className={cn('w-full resize-none border-0 bg-transparent px-1 py-2 text-base leading-6 text-foreground outline-none placeholder:text-muted-foreground', className)} {...props} />;
}
