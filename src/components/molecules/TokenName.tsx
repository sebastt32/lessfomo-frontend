import './TokenName.css';

export interface TokenNameProps {
  symbol: string;
  name: string;
}

export function TokenName({ symbol, name }: TokenNameProps) {
  return (
    <span className="token-name">
      <span className="token-name__symbol">{symbol === '' ? '(no symbol)' : symbol}</span>
      <span className="token-name__name">{name}</span>
    </span>
  );
}
