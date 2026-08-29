import { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', type = 'text', ...props }, ref) => {
    const inputId = props.id || `input-${Math.random().toString(36).substring(2, 9)}`;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold uppercase tracking-wider text-dark-300"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={`w-full px-3.5 py-2.5 bg-dark-900/60 border rounded-lg text-sm text-white placeholder-dark-500 focus:outline-none focus:ring-2 transition-all duration-200 ${
            error
              ? 'border-red-500/50 focus:ring-red-500/30'
              : 'border-dark-700/60 focus:border-brand-500/60 focus:ring-brand-500/25'
          } ${className}`}
          {...props}
        />
        {error && (
          <span className="text-xs text-red-400 font-medium">{error}</span>
        )}
        {!error && helperText && (
          <span className="text-xs text-dark-400">{helperText}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
