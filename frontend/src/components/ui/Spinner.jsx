import React from 'react';

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

/**
 * Spinner — animated spinning circle.
 * Sizes: sm (h-4 w-4) | md (h-8 w-8) | lg (h-12 w-12)
 */
function Spinner({ size = 'md', className = '', label = 'Loading…' }) {
  return (
    <svg
      className={[
        'animate-spin',
        sizeClasses[size] ?? sizeClasses.md,
        'text-current',
        className,
      ].join(' ')}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
      role="status"
    >
      <title>{label}</title>
      {/* Track */}
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      {/* Arc */}
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export default Spinner;
