import { formatCount } from '../../lib/format';
import './Pagination.css';

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /** What is being paged, for the accessible name, e.g. "Token history". */
  label: string;
}

export function Pagination({ page, pageSize, total, onPageChange, label }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);

  return (
    <nav className="pagination" aria-label={`${label} pages`}>
      <p className="pagination__summary">
        {total === 0
          ? 'No tokens'
          : `Showing ${formatCount(first)}–${formatCount(last)} of ${formatCount(total)}`}
      </p>
      <div className="pagination__controls">
        <button
          type="button"
          className="button button--quiet"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <span className="pagination__page" aria-current="page">
          Page {formatCount(page)} of {formatCount(pages)}
        </span>
        <button
          type="button"
          className="button button--quiet"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
