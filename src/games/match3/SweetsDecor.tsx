import type { CSSProperties } from 'react';
import { asset } from '../../content/world';
import './sweets-decor.css';

const ornaments = [
  { kind: 'candy', x: 8, y: 30, size: 110, turn: -23 },
  { kind: 'candy', x: 91, y: 62, size: 102, turn: 28 },
  { kind: 'gift', x: 10, y: 80, size: 85, turn: -10 },
] as const;

export function SweetsDecor() {
  return <div className="sweets-decor" aria-hidden="true">
    {ornaments.map(({ kind, x, y, size, turn }, index) => <span key={index} className="sweets-decor__ornament" style={{ '--x': `${x}%`, '--y': `${y}%`, '--size': `${size}px`, '--turn': `${turn}deg`, '--delay': `${index * -2.3}s` } as CSSProperties}>
      <img src={asset(`plush/${kind}.png`)} alt="" width="1254" height="1254" loading="lazy" decoding="async" draggable={false}/>
    </span>)}
  </div>;
}
