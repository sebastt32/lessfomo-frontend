import { formatDate, formatTime } from '../../lib/format';
import './DateTime.css';

export interface DateTimeProps {
  /** ISO 8601 instant; shown in the viewer's timezone, with the full ISO value on hover. */
  iso: string;
  /** "stacked" puts the time under the date (tables); "inline" keeps both on one line. */
  layout?: 'stacked' | 'inline';
}

/** A creation date and time, e.g. "14 nov 2026 03:15". */
export function DateTime({ iso, layout = 'inline' }: DateTimeProps) {
  return (
    <time className={`date-time date-time--${layout}`} dateTime={iso} title={iso}>
      <span className="date-time__date">{formatDate(iso)}</span> <span className="date-time__time">{formatTime(iso)}</span>
    </time>
  );
}
