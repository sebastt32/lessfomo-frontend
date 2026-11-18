import './OfflineNotice.css';

export interface OfflineNoticeProps {
  apiUrl: string;
  onRetry: () => void;
}

export function OfflineNotice({ apiUrl, onRetry }: OfflineNoticeProps) {
  return (
    <section className="offline-notice" role="alert" aria-labelledby="offline-notice-title">
      <h2 id="offline-notice-title" className="offline-notice__title">
        El servidor de lessfomo no responde
      </h2>
      <p>
        Este panel lee los datos en vivo del servidor de lessfomo en <code>{apiUrl}</code>. Inicia el servidor (por
        ejemplo, con <code>npm run dev</code> en el repositorio lessfomo) o configura <code>VITE_API_URL</code> con la
        dirección correcta, y vuelve a intentarlo. La página también se reconecta sola cuando el servidor vuelve.
      </p>
      <button type="button" className="button" onClick={onRetry}>
        Reintentar
      </button>
    </section>
  );
}
