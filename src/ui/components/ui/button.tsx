import type { ComponentPropsWithRef } from 'react';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-border bg-input px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: '',
        ghost: 'border-transparent bg-transparent hover:bg-hover',
      },
      size: {
        default: '',
        icon: 'size-10 p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

/**
 * `render` lets a Base UI part (`Drawer.Trigger`, `Collapsible.Trigger`, …) reuse
 * this component instead of restyling a bare `<button>` at each call site.
 *
 * `mergeProps` rather than a plain spread concatenates `className` and chains
 * event handlers, so Base UI parts can safely compose this button.
 */
export function Button({
  className,
  variant,
  size,
  render,
  ref,
  ...props
}: ComponentPropsWithRef<'button'> &
  VariantProps<typeof buttonVariants> & { render?: useRender.RenderProp }) {
  return useRender({
    render,
    ref,
    defaultTagName: 'button',
    props: mergeProps<'button'>({ className: cn(buttonVariants({ variant, size }), className) }, props),
  });
}
