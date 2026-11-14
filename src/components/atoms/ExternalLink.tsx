import type { ReactNode } from 'react';

export interface ExternalLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
}

/** Opens in a new tab without giving the target page access to this window. */
export function ExternalLink({ href, children, className, 'aria-label': ariaLabel }: ExternalLinkProps) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} aria-label={ariaLabel}>
      {children}
    </a>
  );
}
