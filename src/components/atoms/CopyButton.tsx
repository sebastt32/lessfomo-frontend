import { useEffect, useState } from 'react';

export interface CopyButtonProps {
  value: string;
  /** Accessible name, e.g. "Copy wallet address". */
  label: string;
}

/** Copies `value` to the clipboard and confirms it for a moment. */
export function CopyButton({ value, label }: CopyButtonProps) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    if (state === 'idle') return;
    const timer = setTimeout(() => setState('idle'), 2000);
    return () => clearTimeout(timer);
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState('copied');
    } catch {
      setState('failed');
    }
  }

  return (
    <button type="button" className="button button--quiet button--small" aria-label={label} onClick={copy}>
      <span aria-live="polite">{state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : 'Copy'}</span>
    </button>
  );
}
