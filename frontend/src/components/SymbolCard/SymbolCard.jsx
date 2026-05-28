import { useMemo } from 'react';
import { isImageUrl } from '../../utils/symbols';
import './SymbolCard.css';

/**
 * SymbolCard — carta rectangular que ocupa el ancho disponible.
 * Los símbolos se distribuyen en una cuadrícula CSS adaptable.
 * Cada ícono tiene rotación y escala aleatoria para mayor dificultad.
 *
 * Props:
 *   symbols      string[]   — array de emojis/URLs
 *   interactive  boolean    — si los símbolos son clickeables
 *   onSymbolClick fn(sym)   — callback al hacer click en un símbolo
 *   highlight    string     — símbolo a resaltar (para animación de acierto)
 *   variant      'pozo'|'player'
 *   disabled     boolean    — bloquea clics (cooldown)
 */
export default function SymbolCard({
  symbols = [],
  interactive = false,
  onSymbolClick,
  highlight = null,
  variant = 'player',
  disabled = false,
}) {
  // Solo giros múltiplos de 90° para que el ícono no desborde su celda
  const transforms = useMemo(() => {
    if (!symbols || symbols.length === 0) return {};
    const angles = [0, 90, 180, 270];
    return symbols.reduce((acc, sym) => {
      acc[sym] = { rotate: angles[Math.floor(Math.random() * angles.length)] };
      return acc;
    }, {});
  }, [symbols.join(',')]); // eslint-disable-line

  function handleClick(sym) {
    if (!interactive || disabled) return;
    onSymbolClick?.(sym);
  }

  return (
    <div className={`symbol-card symbol-card--${variant}`}>
      {symbols.map((sym) => {
        const isHit = highlight === sym;
        const t = transforms[sym] || { scale: 1, rotate: 0 };

        return (
          <button
            key={sym}
            className={`symbol ${isHit ? 'symbol--hit' : ''} ${disabled ? 'symbol--disabled' : ''}`}
            onClick={() => handleClick(sym)}
            disabled={!interactive || disabled}
            aria-label={`Símbolo ${sym}`}
          >
            {/* El ícono lleva la transformación visual; el botón no rota */}
            <span
              className="symbol__inner"
              style={{
                transform: `rotate(${(transforms[sym]?.rotate ?? 0)}deg)`,
              }}
            >
              {isImageUrl(sym)
                ? <img src={sym} alt="símbolo" className="symbol__img" />
                : <span className="symbol__emoji">{sym}</span>
              }
            </span>
          </button>
        );
      })}
    </div>
  );
}
