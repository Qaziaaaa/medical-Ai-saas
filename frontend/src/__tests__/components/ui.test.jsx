import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

// ─── Button ──────────────────────────────────────────────────────────────────

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('applies primary variant classes by default', () => {
    render(<Button>Save</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toMatch(/bg-primary-600/);
  });

  it('applies secondary variant classes', () => {
    render(<Button variant="secondary">Cancel</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toMatch(/bg-white/);
  });

  it('applies danger variant classes', () => {
    render(<Button variant="danger">Delete</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toMatch(/bg-danger-500/);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Save</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled and shows spinner when loading=true', () => {
    render(<Button loading>Save</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    // Spinner SVG should be present
    expect(btn.querySelector('svg')).toBeInTheDocument();
  });

  it('does not fire onClick when disabled', async () => {
    const handler = vi.fn();
    render(<Button disabled onClick={handler}>Save</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(handler).not.toHaveBeenCalled();
  });

  it('renders sm, md, lg size classes', () => {
    const { rerender } = render(<Button size="sm">X</Button>);
    expect(screen.getByRole('button').className).toMatch(/px-3/);

    rerender(<Button size="lg">X</Button>);
    expect(screen.getByRole('button').className).toMatch(/px-6/);
  });
});

// ─── Input ───────────────────────────────────────────────────────────────────

describe('Input', () => {
  it('renders a label when provided', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('renders an error message and sets aria-invalid', () => {
    render(<Input label="Email" error="Required" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not render error element when no error', () => {
    render(<Input label="Email" />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('passes through standard input props', () => {
    render(<Input label="Age" type="number" placeholder="Enter age" />);
    const input = screen.getByLabelText(/age/i);
    expect(input).toHaveAttribute('type', 'number');
    expect(input).toHaveAttribute('placeholder', 'Enter age');
  });

  it('shows required asterisk when required prop is set', () => {
    render(<Input label="Name" required />);
    // The asterisk span is aria-hidden but the label text should still be there
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toHaveAttribute('required');
  });
});

// ─── Badge ───────────────────────────────────────────────────────────────────

describe('Badge', () => {
  it('renders label text', () => {
    render(<Badge label="Active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders children as text', () => {
    render(<Badge variant="success">Confirmed</Badge>);
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });

  it('applies success variant classes', () => {
    render(<Badge variant="success">OK</Badge>);
    expect(screen.getByText('OK').className).toMatch(/bg-success-50/);
  });

  it('applies danger variant classes', () => {
    render(<Badge variant="danger">Error</Badge>);
    expect(screen.getByText('Error').className).toMatch(/bg-danger-50/);
  });

  it('applies warning variant classes', () => {
    render(<Badge variant="warning">Warn</Badge>);
    expect(screen.getByText('Warn').className).toMatch(/bg-warning-50/);
  });

  it('applies info variant classes', () => {
    render(<Badge variant="info">Info</Badge>);
    expect(screen.getByText('Info').className).toMatch(/bg-info-50/);
  });

  it('defaults to neutral variant', () => {
    render(<Badge>Neutral</Badge>);
    expect(screen.getByText('Neutral').className).toMatch(/bg-neutral-100/);
  });
});

// ─── Card ────────────────────────────────────────────────────────────────────

describe('Card', () => {
  it('renders children', () => {
    render(<Card><p>Content</p></Card>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders title and subtitle', () => {
    render(<Card title="Patients" subtitle="All records" />);
    expect(screen.getByText('Patients')).toBeInTheDocument();
    expect(screen.getByText('All records')).toBeInTheDocument();
  });

  it('renders actions slot', () => {
    render(<Card title="T" actions={<button>Add</button>} />);
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
  });
});

// ─── Spinner ─────────────────────────────────────────────────────────────────

describe('Spinner', () => {
  it('renders an SVG element', () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('applies sm size class', () => {
    const { container } = render(<Spinner size="sm" />);
    expect(container.querySelector('svg').className).toMatch(/h-4/);
  });

  it('applies lg size class', () => {
    const { container } = render(<Spinner size="lg" />);
    expect(container.querySelector('svg').className).toMatch(/h-12/);
  });
});

// ─── Skeleton ────────────────────────────────────────────────────────────────

describe('Skeleton', () => {
  it('renders one block by default', () => {
    const { container } = render(<Skeleton />);
    // One animated div inside the wrapper
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(1);
  });

  it('renders the specified number of lines', () => {
    const { container } = render(<Skeleton lines={4} />);
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(4);
  });

  it('applies custom height class', () => {
    const { container } = render(<Skeleton height="h-8" />);
    expect(container.querySelector('.animate-pulse').className).toMatch(/h-8/);
  });

  it('has aria-busy attribute', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveAttribute('aria-busy', 'true');
  });
});

// ─── EmptyState ──────────────────────────────────────────────────────────────

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="No patients" description="Add your first patient." />);
    expect(screen.getByText('No patients')).toBeInTheDocument();
    expect(screen.getByText('Add your first patient.')).toBeInTheDocument();
  });

  it('renders action element', () => {
    render(
      <EmptyState
        title="Empty"
        action={<button>Add Patient</button>}
      />
    );
    expect(screen.getByRole('button', { name: /add patient/i })).toBeInTheDocument();
  });

  it('renders icon slot', () => {
    render(
      <EmptyState
        title="Empty"
        icon={<svg data-testid="icon" />}
      />
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});

// ─── Modal ───────────────────────────────────────────────────────────────────

describe('Modal', () => {
  it('renders nothing when isOpen=false', () => {
    render(<Modal isOpen={false} onClose={() => {}} title="Test"><p>Body</p></Modal>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders dialog when isOpen=true', () => {
    render(<Modal isOpen onClose={() => {}} title="Test"><p>Body</p></Modal>);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(<Modal isOpen onClose={onClose} title="Test"><p>Body</p></Modal>);
    await userEvent.click(screen.getByRole('button', { name: /close modal/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal isOpen onClose={onClose} title="Test"><p>Body</p></Modal>
    );
    // The backdrop is the aria-hidden overlay div
    const backdrop = container.querySelector('[aria-hidden="true"]');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<Modal isOpen onClose={onClose} title="Test"><p>Body</p></Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has aria-modal and aria-labelledby attributes', () => {
    render(<Modal isOpen onClose={() => {}} title="My Modal"><p>Body</p></Modal>);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
  });
});
