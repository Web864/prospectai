import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import {
  ConfirmationDialog,
  Dialog,
  Pagination,
  Skeleton,
  Tabs,
  ToastProvider,
  useToast,
} from './interactive-controls';

afterEach(cleanup);

function DialogHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open dialog</button>
      <Dialog open={open} onOpenChange={setOpen} title="Review lead">
        <button>Inside action</button>
      </Dialog>
    </>
  );
}

function ToastHarness() {
  const notify = useToast();
  return <button onClick={() => notify('Notes saved')}>Save</button>;
}

describe('interactive controls', () => {
  it('opens, focuses, and closes a dialog', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    await user.click(screen.getByRole('button', { name: 'Open dialog' }));
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement?.textContent).toContain('Close');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('requires confirmation before invoking a destructive action', async () => {
    const user = userEvent.setup();
    const confirm = vi.fn();
    const { rerender } = render(
      <ConfirmationDialog
        open
        onOpenChange={() => undefined}
        title="Delete lead?"
        description="Permanent action"
        confirmLabel="Delete lead"
        onConfirm={confirm}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(confirm).not.toHaveBeenCalled();
    rerender(
      <ConfirmationDialog
        open
        onOpenChange={() => undefined}
        title="Delete lead?"
        description="Permanent action"
        confirmLabel="Delete lead"
        onConfirm={confirm}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Delete lead' }));
    expect(confirm).toHaveBeenCalledOnce();
  });

  it('switches tabs with pointer and keyboard input', async () => {
    const user = userEvent.setup();
    render(
      <Tabs
        label="Example"
        items={[
          { id: 'one', label: 'One', content: 'First panel' },
          { id: 'two', label: 'Two', content: 'Second panel' },
        ]}
      />,
    );
    await user.click(screen.getByRole('tab', { name: 'Two' }));
    expect(screen.getByRole('tabpanel').textContent).toBe('Second panel');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Two' }), { key: 'ArrowLeft' });
    expect(screen.getByRole('tabpanel').textContent).toBe('First panel');
  });

  it('moves through paginated results without exceeding bounds', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Pagination page={2} totalPages={3} onPageChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(onChange).toHaveBeenCalledWith(3);
    await user.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('announces skeleton loading and toast feedback', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Skeleton label="Loading lead" lines={2} />
        <ToastProvider>
          <ToastHarness />
        </ToastProvider>
      </>,
    );
    expect(screen.getByRole('status', { name: 'Loading lead' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Notes saved')).toBeTruthy();
  });
});
