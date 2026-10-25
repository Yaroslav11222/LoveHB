import type { CSSProperties } from 'react';
import { Symbol } from './Symbol';

export function Ambient({ count = 12 }: { count?: number }) {
  return <div className="ambient" aria-hidden="true">{Array.from({ length: count }, (_, i) =>
    <span className={`mote ${i % 4 === 0 ? 'mote--star' : ''}`} key={i} style={{ '--x': `${(i * 37 + 9) % 96}%`, '--y': `${(i * 23 + 8) % 91}%`, '--delay': `${i * -1.7}s`, '--duration': `${9 + i % 6}s` } as CSSProperties}>
      {i % 4 === 0 && <Symbol />}
    </span>)}</div>;
}
