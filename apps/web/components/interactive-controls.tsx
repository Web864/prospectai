'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

const focusable =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type OverlayProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  variant?: 'dialog' | 'drawer';
};

function Overlay({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  variant = 'dialog',
}: OverlayProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>(focusable)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onOpenChange(false);
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(focusable));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [open, onOpenChange]);

  if (!open) return null;
  return (
    <div
      className={`overlay overlay-${variant}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
    >
      <div
        ref={panelRef}
        className={`overlay-panel ${variant}-panel`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <header className="overlay-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <button className="icon-button" type="button" onClick={() => onOpenChange(false)}>
            <span aria-hidden="true">x</span>
            <span className="sr-only">Close</span>
          </button>
        </header>
        <div className="overlay-body">{children}</div>
        {footer && <footer className="overlay-footer">{footer}</footer>}
      </div>
    </div>
  );
}

export function Dialog(props: Omit<OverlayProps, 'variant'>) {
  return <Overlay {...props} />;
}

export function Drawer(props: Omit<OverlayProps, 'variant'>) {
  return <Overlay {...props} variant="drawer" />;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  tone = 'danger',
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </button>
          <button
            className={`button ${tone === 'danger' ? 'button-danger' : ''}`}
            type="button"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p>This action requires confirmation.</p>
    </Dialog>
  );
}

export type MenuItem = { label: string; onSelect: () => void; destructive?: boolean };

export function DropdownMenu({ label, items }: { label: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    function closeOnOutsideClick(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [open]);

  return (
    <div className="dropdown" ref={rootRef}>
      <button
        className="button button-secondary"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {label} <span aria-hidden="true">v</span>
      </button>
      {open && (
        <div
          className="dropdown-menu"
          role="menu"
          ref={menuRef}
          onKeyDown={(event) => {
            const menuItems = Array.from(
              menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
            );
            const currentIndex = menuItems.indexOf(document.activeElement as HTMLButtonElement);
            let nextIndex = currentIndex;
            if (event.key === 'Escape') {
              setOpen(false);
              return;
            }
            if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % menuItems.length;
            else if (event.key === 'ArrowUp')
              nextIndex = (currentIndex - 1 + menuItems.length) % menuItems.length;
            else if (event.key === 'Home') nextIndex = 0;
            else if (event.key === 'End') nextIndex = menuItems.length - 1;
            else return;
            event.preventDefault();
            menuItems[nextIndex]?.focus();
          }}
        >
          {items.map((item) => (
            <button
              className={item.destructive ? 'menu-danger' : ''}
              type="button"
              role="menuitem"
              key={item.label}
              onClick={() => {
                item.onSelect();
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export type TabItem = { id: string; label: string; content: ReactNode };

export function Tabs({
  items,
  label,
  defaultTab,
}: {
  items: TabItem[];
  label: string;
  defaultTab?: string;
}) {
  const [active, setActive] = useState(defaultTab ?? items[0]?.id);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const baseId = useId();

  function selectByKeyboard(index: number, key: string) {
    let next = index;
    if (key === 'ArrowRight') next = (index + 1) % items.length;
    else if (key === 'ArrowLeft') next = (index - 1 + items.length) % items.length;
    else if (key === 'Home') next = 0;
    else if (key === 'End') next = items.length - 1;
    else return;
    setActive(items[next]?.id);
    tabRefs.current[next]?.focus();
  }

  const selected = items.find((item) => item.id === active) ?? items[0];
  if (!selected) return null;
  return (
    <div className="tabs">
      <div className="tab-list" role="tablist" aria-label={label}>
        {items.map((item, index) => (
          <button
            key={item.id}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            id={`${baseId}-${item.id}-tab`}
            role="tab"
            type="button"
            aria-selected={selected.id === item.id}
            aria-controls={`${baseId}-${item.id}-panel`}
            tabIndex={selected.id === item.id ? 0 : -1}
            onClick={() => setActive(item.id)}
            onKeyDown={(event) => selectByKeyboard(index, event.key)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <section
        className="tab-panel"
        id={`${baseId}-${selected.id}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-${selected.id}-tab`}
      >
        {selected.content}
      </section>
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <nav className="pagination" aria-label="Lead list pages">
      <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Previous
      </button>
      <span aria-live="polite">
        Page {page} of {totalPages}
      </span>
      <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Next
      </button>
    </nav>
  );
}

type Toast = { id: string; message: string; tone: 'positive' | 'danger' };
const ToastContext = createContext<((message: string, tone?: Toast['tone']) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Set<number>>(new Set());
  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current.clear();
    },
    [],
  );
  const notify = useCallback((message: string, tone: Toast['tone'] = 'positive') => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message, tone }]);
    const timer = window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
      timers.current.delete(timer);
    }, 4000);
    timers.current.add(timer);
  }, []);
  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div className={`toast toast-${toast.tone}`} role="status" key={toast.id}>
            {toast.message}
            <button
              type="button"
              onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
            >
              <span aria-hidden="true">x</span>
              <span className="sr-only">Dismiss notification</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const notify = useContext(ToastContext);
  if (!notify) throw new Error('useToast must be used within ToastProvider');
  return notify;
}

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <span className="tooltip" tabIndex={0} aria-describedby={id}>
      {children}
      <span className="tooltip-content" role="tooltip" id={id}>
        {label}
      </span>
    </span>
  );
}

export function Skeleton({
  label = 'Loading content',
  lines = 3,
}: {
  label?: string;
  lines?: number;
}) {
  return (
    <div className="skeleton" role="status" aria-label={label}>
      {Array.from({ length: lines }, (_, index) => (
        <span key={index} aria-hidden="true" />
      ))}
    </div>
  );
}

export function ConfirmationState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="confirmation-state" role="status">
      <strong>{title}</strong>
      <span>{children}</span>
    </div>
  );
}
