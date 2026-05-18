import React from 'react';

/**
 * EmptyState — centered empty state with icon slot, title, description,
 * and an optional action button/element.
 *
 * Props:
 *   icon        — ReactNode (e.g. an SVG icon)
 *   title       — string
 *   description — string
 *   action      — ReactNode (e.g. a <Button>)
 *   className   — extra wrapper classes
 */
function EmptyState({ icon, title, description, action, className = '' }) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center text-center py-16 px-6',
        className,
      ].join(' ')}
      role="status"
      aria-label={title ?? 'No data'}
    >
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
          {icon}
        </div>
      )}

      {title && (
        <h3 className="text-h3 text-neutral-900 mb-1">{title}</h3>
      )}

      {description && (
        <p className="text-sm text-neutral-500 max-w-sm">{description}</p>
      )}

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export default EmptyState;
