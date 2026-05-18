import React from 'react';

/**
 * Card — white surface with shadow and rounded corners.
 * Props: title, subtitle, actions (ReactNode), children.
 */
function Card({ title, subtitle, actions, children, className = '', noPadding = false }) {
  const hasHeader = title || subtitle || actions;

  return (
    <div
      className={[
        'bg-white rounded-lg shadow-card border border-neutral-200',
        className,
      ].join(' ')}
    >
      {hasHeader && (
        <div
          className={[
            'flex items-start justify-between gap-4',
            noPadding ? 'px-6 pt-6' : 'px-6 pt-6',
            children ? 'pb-4 border-b border-neutral-100' : 'pb-6',
          ].join(' ')}
        >
          <div className="min-w-0">
            {title && (
              <h3 className="text-h3 text-neutral-900 truncate">{title}</h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-sm text-neutral-500">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          )}
        </div>
      )}

      {children && (
        <div className={noPadding ? '' : 'p-6'}>{children}</div>
      )}
    </div>
  );
}

export default Card;
