import React from 'react';

/**
 * Skeleton — animated gray placeholder for loading states.
 * Props:
 *   lines    — number of line-shaped blocks to render (default 1)
 *   height   — Tailwind height class applied to each block (default 'h-4')
 *   className — extra classes applied to the wrapper
 */
function Skeleton({ lines = 1, height = 'h-4', className = '' }) {
  return (
    <div
      className={['flex flex-col gap-2', className].join(' ')}
      aria-busy="true"
      aria-label="Loading…"
    >
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={[
            'animate-pulse rounded bg-neutral-200',
            height,
            // Make the last line shorter for a natural paragraph look
            lines > 1 && i === lines - 1 ? 'w-3/4' : 'w-full',
          ].join(' ')}
        />
      ))}
    </div>
  );
}

export default Skeleton;
