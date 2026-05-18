import React from 'react';
import { Toaster, toast as hotToast } from 'react-hot-toast';

/**
 * ToastProvider — wraps react-hot-toast's <Toaster> with consistent
 * positioning and styling that matches the medical SaaS theme.
 *
 * Mount this once near the root of the app (e.g. in App.jsx).
 */
function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      containerStyle={{ top: 16, right: 16 }}
      toastOptions={{
        // Default duration
        duration: 4000,

        // Base style shared by all toasts
        style: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '0.875rem',
          borderRadius: '0.5rem',
          padding: '12px 16px',
          boxShadow:
            '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          maxWidth: '360px',
        },

        // Per-type overrides
        success: {
          style: {
            background: '#f0fdf4',
            color: '#15803d',
            border: '1px solid #bbf7d0',
          },
          iconTheme: {
            primary: '#22c55e',
            secondary: '#f0fdf4',
          },
        },

        error: {
          style: {
            background: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
          },
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fef2f2',
          },
          duration: 6000,
        },

        loading: {
          style: {
            background: '#eff6ff',
            color: '#1d4ed8',
            border: '1px solid #bfdbfe',
          },
        },
      }}
    />
  );
}

/**
 * Re-export the toast utility so consumers can import from one place:
 *   import { toast } from '@/components/ui';
 */
export const toast = hotToast;

export default ToastProvider;
