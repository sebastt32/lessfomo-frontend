import { formatScore } from '../../lib/format';
import './ScoreBar.css';

export interface ScoreBarProps {
  /** 0-100 */
  score: number;
}

export function ScoreBar({ score }: ScoreBarProps) {
  const clamped = Math.min(100, Math.max(0, score));
  return (
    <span className="score-bar">
      <span className="score-bar__value">{formatScore(score)}</span>
      <span className="score-bar__track" aria-hidden="true">
        <span className="score-bar__fill" style={{ inlineSize: `${clamped}%` }} />
      </span>
    </span>
  );
}
