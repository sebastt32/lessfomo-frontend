import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import './HelpTip.css';

export interface HelpTipProps {
  /** The concept, as it reads in "¿Qué es …?" (the button's accessible name). */
  topic: string;
  /** One or two plain sentences. */
  children: ReactNode;
}

/**
 * A "?" next to a concept: tapping it shows a short explanation, which works on phones too (unlike a
 * tooltip on hover). Another tap, Escape or a tap elsewhere closes it. Never put it inside another button.
 */
export function HelpTip({ topic, children }: HelpTipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent | MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span className="help-tip" ref={root}>
      <button
        ref={button}
        type="button"
        className="help-tip__button"
        aria-label={`¿Qué es ${topic}?`}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={(event) => {
          // A help mark inside a clickable row explains; it must not also open the row.
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        ?
      </button>
      {open ? (
        <span id={id} role="note" className="help-tip__bubble">
          {children}
        </span>
      ) : null}
    </span>
  );
}
