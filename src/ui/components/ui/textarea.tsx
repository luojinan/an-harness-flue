import type { ComponentPropsWithRef } from 'react';
import * as stylex from '@stylexjs/stylex';
import { t } from '../../tokens.stylex';

const styles = stylex.create({
  base: {
    fontFamily: 'inherit',
    fontSize: 'inherit',
    lineHeight: 1.5,
    color: t.text,
    backgroundColor: 'transparent',
    borderStyle: 'none',
    outline: 'none',
    resize: 'none',
    '::placeholder': { color: t.textFaint },
  },
});

/** `ComponentPropsWithRef` so the composer can hold a ref for auto-grow. */
export function Textarea({
  xstyle,
  ...props
}: ComponentPropsWithRef<'textarea'> & { xstyle?: stylex.StyleXStyles }) {
  return <textarea {...stylex.props(styles.base, xstyle)} {...props} />;
}
