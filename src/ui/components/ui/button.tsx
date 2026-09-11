import type { ButtonHTMLAttributes } from 'react';
import * as stylex from '@stylexjs/stylex';
const styles = stylex.create({ base: { fontFamily: 'inherit', borderRadius: 8, border: '1px solid #e5e7eb', backgroundColor: '#fff', padding: '0.55rem 0.9rem', cursor: 'pointer', transition: 'background-color 150ms' }, hover: { backgroundColor: { ':hover': '#f3f4f6' } } });
export function Button({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) { return <button {...stylex.props(styles.base, styles.hover)} className={`ui-button ${className}`} {...props} />; }
