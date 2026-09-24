import type { SelectHTMLAttributes } from 'react';
import { cn } from './ui/utils';

interface CustomSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}

/** Native semantics give keyboard, mobile picker and screen-reader support. */
export function CustomSelect({ value, onChange, options, placeholder = 'Auswählen…', className, ...props }: CustomSelectProps) {
  return <select {...props} value={value} onChange={(event) => onChange(event.target.value)} aria-label={props['aria-label'] || (props.id ? undefined : placeholder !== 'Auswählen…' ? placeholder : value)} className={cn('h-9 w-full min-w-0 rounded-md border border-border-strong bg-surface px-3 text-sm text-text-primary focus:border-accent-500 focus:outline-none disabled:opacity-50', className)}>
    {!options.includes(value) && <option value={value}>{value || placeholder}</option>}
    {options.map((option) => <option key={option} value={option}>{option}</option>)}
  </select>;
}
