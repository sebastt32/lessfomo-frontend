import { useState } from 'react';
import { WelcomeGuide } from '../components/organisms/WelcomeGuide';
import { hasSeenGuide, markGuideSeen } from '../lib/welcomeGuide';

/** The first-visit guide: opens by itself the first time in this browser, and again from the "Guía" button. */
export function WelcomeGuideContainer() {
  const [open, setOpen] = useState(() => !hasSeenGuide());

  function close() {
    markGuideSeen();
    setOpen(false);
  }

  return (
    <>
      <button type="button" className="button button--quiet button--small" onClick={() => setOpen(true)}>
        Guía
      </button>
      {open ? <WelcomeGuide onClose={close} /> : null}
    </>
  );
}
