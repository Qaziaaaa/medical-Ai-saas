import React from 'react';
import Spinner from './Spinner';

const variantClasses = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 border border-transparent disabled:bg-primary-300',
  secondary:
    'bg-white text-neutral-700 hover:bg-neutral-50 focus:ring-primary-500 border border-neutral-300 disabled:bg-neutral-100 disabled:text-neutral-400',
  danger:
    'bg-danger-500 text-white hover:bg-danger-700 focus:ring-danger-500 border border-transparent disabled:bg-danger-500/50',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm rounded',
  md: 'px-4 py-2 text-sm rounded-md',
  lg: 'px-6 py-3 text-base rounded-lg',
};

const spinnerSizeMap = {
  sm: 'sm',
  md: 'sm',
  lg: 'md',
};

/**
 * Button — primary/secondary/danger variants, sm/md/lg sizes.
 * Shows a spinner when loading=true and disables interaction.
 */
const Button = React.forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    children,
    className = '',
    type = 'button',
    ...rest
  },
  ref
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      className={[
        'inline-flex items-center justify-center gap-2 font-medium',
        'transition-colors duration-150 ease-in-out',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:cursor-not-allowed',
        variantClasses[variant] ?? variantClasses.primary,
        sizeClasses[size] ?? sizeClasses.md,
        className,
      ].join(' ')}
      {...rest}
    >
      {loading && (
        <Spinner
          size={spinnerSizeMap[size] ?? 'sm'}
          className={variant === 'secondary' ? 'text-neutral-500' : 'text-white'}
        />
      )}
      {children}
    </button>
  );
});

export default Button;
