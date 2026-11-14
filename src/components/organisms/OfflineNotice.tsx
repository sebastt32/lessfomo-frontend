import './OfflineNotice.css';

export interface OfflineNoticeProps {
  apiUrl: string;
  onRetry: () => void;
}

export function OfflineNotice({ apiUrl, onRetry }: OfflineNoticeProps) {
  return (
    <section className="offline-notice" role="alert" aria-labelledby="offline-notice-title">
      <h2 id="offline-notice-title" className="offline-notice__title">
        The screener API is not answering
      </h2>
      <p>
        This dashboard reads live data from the lessfomo backend at <code>{apiUrl}</code>. Start the backend (for example{' '}
        <code>npm run dev</code> in the lessfomo repository), or point <code>VITE_API_URL</code> at the right address,
        then try again. The page also reconnects on its own once the API is back.
      </p>
      <button type="button" className="button" onClick={onRetry}>
        Try again
      </button>
    </section>
  );
}
