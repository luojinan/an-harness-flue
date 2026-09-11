import type { ComponentPropsWithRef } from 'react';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';
import { t } from '../../tokens.stylex';

const styles = stylex.create({
  base: {
    fontFamily: 'inherit',
    fontSize: 'inherit',
    color: t.text,
    backgroundColor: { default: t.bgInput, ':hover': t.bgHover },
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: t.border,
    borderRadius: t.radiusMd,
    paddingBlock: '0.55rem',
    paddingInline: '0.9rem',
    cursor: 'pointer',
    transitionProperty: 'background-color',
    transitionDuration: '150ms',
  },
});

/**
 * `render` lets a Base UI part (`Drawer.Trigger`, `Collapsible.Trigger`, …) reuse
 * this component instead of restyling a bare `<button>` at each call site.
 *
 * `mergeProps` rather than a plain spread: it *concatenates* `className` and
 * chains event handlers, so the class StyleX generates survives being composed
 * with a Base UI part's own class. A spread would overwrite one with the other.
 */
export function Button({
  xstyle,
  render,
  ref,
  ...props
}: ComponentPropsWithRef<'button'> & {
  xstyle?: stylex.StyleXStyles;
  render?: useRender.RenderProp;
}) {
  return useRender({
    render,
    ref,
    defaultTagName: 'button',
    props: mergeProps<'button'>(stylex.props(styles.base, xstyle), props),
  });
}
