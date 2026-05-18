import React from 'react';

const variantClasses = {
  success: 'bg-success-50 text-success-700 ring-success-500/20',
  warning: 'bg-warning-50 text-warning-700 ring-warning-500/20',
  danger:  'bg-danger-50  text-danger-700  ring-danger-500/20',
  info:    'bg-info-50    text-info-700    ring-info-500/20',
  neutral: 'bg-neutral-100 text-neutral-600 ring-neutral-500/20',
};

/**
 * Badge — small pill label.
 * Variants: success | warning | danger | info | neutral
 */
function Badge({ variant = 'neutral', label, children, className = '' }) {
  const text = label ?? children;

  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-0.5',
        'text-xs font-medium ring-1 ring-inset',
        variantClasses[variant] ?? variantClasses.neutral,
        className,
      ].join(' ')}
    >
      {text}
    </span>
  );
}

export default Badge;
