// src/components/ui/inputs.tsx
import { useState } from 'react';
import { cn } from '../../lib/cn';
import { Eye, EyeOff, ChevronDown } from 'lucide-react';

/* ========== TEXT INPUT ========== */
export function TextInput({
  id,
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  type = 'text',
  disabled,
  describedBy,
  invalid,
  leftIcon,
  rightIcon,
  autoComplete,
  className,
}: {
  id: string;
  name: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onBlur: React.FocusEventHandler<HTMLInputElement>;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  describedBy?: string;
  invalid?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  autoComplete?: string;
  className?: string;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>
  required?: boolean;
}) {
  return (
    <div className="relative">
      {leftIcon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          {leftIcon}
        </div>
      )}
      <input
        id={id}
        name={name}
        value={value ?? ''}
        onChange={onChange}
        onBlur={onBlur}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        className={cn(
          'input pr-10',         // padding droit pour l’icône optionnelle
          leftIcon && 'pl-10',   // padding gauche si icône gauche
          invalid && 'border-[color:var(--danger)]',
          className
        )}
      />
      {rightIcon && (
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">
          {rightIcon}
        </div>
      )}
    </div>
  );
}

/* ========== PASSWORD INPUT (toggle visibilité) ========== */
export function PasswordInput(props: Omit<Parameters<typeof TextInput>[0], 'type' | 'rightIcon'>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <TextInput
        {...props}
        type={show ? 'text' : 'password'}
        rightIcon={
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.preventDefault();
              setShow((s) => !s);
            }}
            className="pointer-events-auto text-muted hover:opacity-80"
            aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
      />
    </div>
  );
}

/* ========== TEXTAREA ========== */
export function Textarea({
  id,
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  describedBy,
  invalid,
  rows = 4,
  disabled,
  className,
}: {
  id: string;
  name: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLTextAreaElement>;
  onBlur: React.FocusEventHandler<HTMLTextAreaElement>;
  placeholder?: string;
  describedBy?: string;
  invalid?: boolean;
  rows?: number;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <textarea
      id={id}
      name={name}
      value={value ?? ''}
      onChange={onChange}
      onBlur={onBlur}
      rows={rows}
      placeholder={placeholder}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      disabled={disabled}
      className={cn('input', invalid && 'border-[color:var(--danger)]', className)}
    />
  );
}

/* ========== SELECT ========== */
export function Select({
  id,
  name,
  value,
  onChange,
  onBlur,
  children,
  describedBy,
  invalid,
  disabled,
  placeholder,
  className,
}: {
  id: string;
  name: string;
  value: string | number;
  onChange: React.ChangeEventHandler<HTMLSelectElement>;
  onBlur: React.FocusEventHandler<HTMLSelectElement>;
  children: React.ReactNode;
  describedBy?: string;
  invalid?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        name={name}
        value={value ?? ''}
        onChange={onChange}
        onBlur={onBlur}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        className={cn('select pr-10', invalid && 'border-[color:var(--danger)]', className)}
      >
        {placeholder && (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        )}
        {children}
      </select>
      <div
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
        aria-hidden
      >
        <ChevronDown size={16} />
      </div>
    </div>
  );
}

/* ========== CHECKBOX ========== */
export function Checkbox({
  id,
  name,
  checked,
  onChange,
  describedBy,
  disabled,
  label,
  className,
}: {
  id: string;
  name: string;
  checked: boolean;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  describedBy?: string;
  disabled?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <label className={cn('inline-flex items-center gap-2 text-sm', className)}>
      <input
        id={id}
        name={name}
        type="checkbox"
        checked={!!checked}
        onChange={onChange}
        aria-describedby={describedBy}
        disabled={disabled}
        className="h-4 w-4 rounded border border-token text-[color:var(--primary)] focus:ring-[color:var(--primary)]"
      />
      {label && <span>{label}</span>}
    </label>
  );
}

/* ========== SWITCH (button accessible) ========== */
export function Switch({
  id,
  name,
  checked,
  onChange,
  describedBy,
  disabled,
  className,
}: {
  id: string;
  name: string;
  checked: boolean;
  onChange: (e: { target: { name: string; checked: boolean } }) => void;
  describedBy?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-describedby={describedBy}
      onClick={() => onChange({ target: { name, checked: !checked } })}
      disabled={disabled}
      className={cn(
        'inline-flex h-6 w-10 items-center rounded-full border transition-colors',
        checked
          ? 'border-[color:var(--primary)]'
          : 'border-token',
        className
      )}
      style={{
        background: checked
          ? 'var(--primary)'
          : 'color-mix(in oklab, var(--surface) 88%, var(--border))',
      }}
    >
      <span
        className={cn(
          'ml-0.5 inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
          checked && 'translate-x-4'
        )}
      />
      <input type="checkbox" id={id} name={name} checked={checked} readOnly hidden />
    </button>
  );
}
