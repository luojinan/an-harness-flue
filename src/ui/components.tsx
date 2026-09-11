import type { ButtonHTMLAttributes, TextareaHTMLAttributes } from 'react';
export function Button({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) { return <button className={`ui-button ${className}`} {...props} />; }
export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea className={`ui-textarea ${className}`} {...props} />; }
