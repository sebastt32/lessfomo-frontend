import type { MouseEvent } from 'react';
import './ViewNav.css';

export interface ViewNavItem<T extends string> {
  value: T;
  label: string;
  href: string;
}

export interface ViewNavProps<T extends string> {
  items: readonly ViewNavItem<T>[];
  /** The view being shown; null when the page is not one of the items (a token's own view). */
  current: T | null;
  /** Called for plain left clicks; modified clicks (new tab, etc.) keep the browser's behavior. */
  onNavigate: (href: string) => void;
}

/** Links between the app's views. Real links, so they can be opened in a new tab and shared. */
export function ViewNav<T extends string>({ items, current, onNavigate }: ViewNavProps<T>) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate(href);
  }

  return (
    <nav className="view-nav" aria-label="Views">
      {items.map((item) => (
        <a
          key={item.value}
          className="view-nav__link"
          href={item.href}
          aria-current={item.value === current ? 'page' : undefined}
          onClick={(event) => handleClick(event, item.href)}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
