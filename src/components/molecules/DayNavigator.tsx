import { parseDay, shiftDay } from '../../lib/dailyRecord';
import './DayNavigator.css';

export interface DayNavigatorProps {
  /** The day shown, YYYY-MM-DD. */
  day: string;
  /** The latest day that can be picked: today, YYYY-MM-DD. */
  today: string;
  onChange: (day: string) => void;
}

/** Previous day, a date picker and next day (never past today), plus a jump back to today. */
export function DayNavigator({ day, today, onChange }: DayNavigatorProps) {
  const isToday = day >= today;
  return (
    <div className="day-nav">
      <button type="button" className="button button--quiet" onClick={() => onChange(shiftDay(day, -1))}>
        <span aria-hidden="true">← </span>Previous day
      </button>
      <label className="day-nav__picker">
        <span className="visually-hidden">Day</span>
        <input
          type="date"
          value={day}
          max={today}
          onChange={(event) => {
            const value = event.target.value;
            if (parseDay(value) !== null && value <= today) onChange(value);
          }}
        />
      </label>
      <button type="button" className="button button--quiet" onClick={() => onChange(shiftDay(day, 1))} disabled={isToday}>
        Next day<span aria-hidden="true"> →</span>
      </button>
      {isToday ? null : (
        <button type="button" className="button button--quiet" onClick={() => onChange(today)}>
          Today
        </button>
      )}
    </div>
  );
}
