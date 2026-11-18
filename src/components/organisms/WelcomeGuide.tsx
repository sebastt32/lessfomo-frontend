import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { GUIDE_STEPS } from '../../lib/welcomeGuide';
import './WelcomeGuide.css';

export interface WelcomeGuideProps {
  /** Called when the guide is finished or skipped. */
  onClose: () => void;
}

const TITLE_ID = 'welcome-guide-title';
const BODY_ID = 'welcome-guide-body';

/** A modal of a few short steps that explains the platform the first time someone signs in. */
export function WelcomeGuide({ onClose }: WelcomeGuideProps) {
  const [index, setIndex] = useState(0);
  const dialog = useRef<HTMLDivElement>(null);
  const primary = useRef<HTMLButtonElement>(null);
  const step = GUIDE_STEPS[index]!;
  const last = index === GUIDE_STEPS.length - 1;

  // Focus moves into the guide when it opens and back to what was focused when it closes.
  useEffect(() => {
    const opener = document.activeElement;
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  // Every step starts on its main button.
  useEffect(() => {
    primary.current?.focus();
  }, [index]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const buttons = [...(dialog.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
    if (buttons.length === 0) return;
    const first = buttons[0]!;
    const end = buttons[buttons.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      end.focus();
    } else if (!event.shiftKey && document.activeElement === end) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="guide-backdrop">
      <div
        ref={dialog}
        className="guide"
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        aria-describedby={BODY_ID}
        onKeyDown={handleKeyDown}
      >
        <p className="guide__progress">
          Paso {index + 1} de {GUIDE_STEPS.length}
        </p>
        <h2 id={TITLE_ID} className="guide__title">
          {step.title}
        </h2>
        <p id={BODY_ID} className="guide__body">
          {step.body}
        </p>
        <div className="guide__dots" aria-hidden="true">
          {GUIDE_STEPS.map((item, dot) => (
            <span key={item.title} className={dot === index ? 'guide__dot guide__dot--current' : 'guide__dot'} />
          ))}
        </div>
        <div className="guide__actions">
          {index > 0 ? (
            <button type="button" className="button button--quiet" onClick={() => setIndex(index - 1)}>
              Anterior
            </button>
          ) : null}
          <button
            ref={primary}
            type="button"
            className="button"
            onClick={() => (last ? onClose() : setIndex(index + 1))}
          >
            {last ? 'Empezar' : 'Siguiente'}
          </button>
          {last ? null : (
            <button type="button" className="button button--quiet guide__skip" onClick={onClose}>
              Saltar guía
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
