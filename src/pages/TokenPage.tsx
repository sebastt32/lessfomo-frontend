import type { ReactNode } from 'react';
import { Disclaimer } from '../components/organisms/Disclaimer';
import { TOKEN_VIEW_ID } from '../components/organisms/TokenView';
import { HistoryTemplate } from '../components/templates/HistoryTemplate';
import { HeaderContainer } from '../containers/HeaderContainer';
import { OfflineNoticeContainer } from '../containers/OfflineNoticeContainer';
import { TokenViewContainer } from '../containers/TokenViewContainer';

export interface TokenPageProps {
  mint: string;
  /** Where "Back" goes: the list the reader came from, or the live view. */
  back: { href: string; label: string };
  onBack: () => void;
  headerExtras?: ReactNode;
}

const SKIP_LINK = { href: `#${TOKEN_VIEW_ID}`, label: 'Skip to the token' };

/** A token's own view (`?view=token&mint=<mint>`): full width, with its chart, cycle and details. */
export function TokenPage({ mint, back, onBack, headerExtras }: TokenPageProps) {
  return (
    <HistoryTemplate
      header={<HeaderContainer extras={headerExtras} />}
      notice={<OfflineNoticeContainer />}
      // Keyed by mint: another token starts from scratch instead of showing the previous one's data.
      list={<TokenViewContainer key={mint} mint={mint} back={back} onBack={onBack} />}
      footer={<Disclaimer />}
      skipLink={SKIP_LINK}
    />
  );
}
