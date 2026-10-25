export function RaceControlsHint() {
  return <div className="race-controls-hint" aria-label="Управление гонкой">
    <div className="race-controls-hint__arrows">
      <div className="race-control-key race-control-key--gas"><kbd aria-label="Стрелка вверх">↑</kbd><span>Газ</span></div>
      <div className="race-control-key"><kbd aria-label="Стрелка влево">←</kbd><span>Влево</span></div>
      <div className="race-control-key"><kbd aria-label="Стрелка вниз">↓</kbd><span>Тормоз</span></div>
      <div className="race-control-key"><kbd aria-label="Стрелка вправо">→</kbd><span>Вправо</span></div>
    </div>
    <div className="race-controls-hint__extras">
      <div className="race-control-key"><kbd className="race-keycap--space">Пробел</kbd><span>Ускорение</span></div>
      <div className="race-control-key"><kbd>R</kbd><span>На трассу</span></div>
    </div>
    <p className="race-controls-hint__touch">На телефоне удерживай кнопки под трассой: газ, руль и ускорение.</p>
  </div>;
}
