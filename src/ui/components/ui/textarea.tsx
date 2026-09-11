import type { TextareaHTMLAttributes } from 'react';
import * as stylex from '@stylexjs/stylex';
const styles = stylex.create({ base: { fontFamily: 'inherit', outline: 'none', border: 0, backgroundColor: 'transparent', resize: 'none' } });
export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea {...stylex.props(styles.base)} className={`ui-textarea ${className}`} {...props} />; }
