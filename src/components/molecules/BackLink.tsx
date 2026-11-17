import type { MouseEvent } from 'react';
import './BackLink.css';

export interface BackLinkProps {
  href: string;
  /** Says where it goes, e.g. "Back to History". */
  children: string;
  /** Called for plain left clicks; modified clicks (new tab, etc.) keep the browser's behavior. */
  onNavigate: () => void;
}

/** A real link back to where the reader came from, so it also works in a new tab. */
export function BackLink({ href, children, onNavigate }: BackLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate();
  }

  return (
    <a className="back-link" href={href} onClick={handleClick}>
      <span className="back-link__arrow" aria-hidden="true">
        ←
      </span>
      {children}
    </a>
  );
}
