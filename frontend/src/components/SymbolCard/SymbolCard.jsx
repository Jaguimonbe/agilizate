import { useMemo } from 'react';
import { isImageUrl } from '../../utils/symbols';
import './SymbolCard.css';

/**
 * SymbolCard — carta de juego con hasta 8 símbolos dispuestos en anillo + centro.
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
  const center = symbols[0];
  const ring   = symbols.slice(1);
  const total  = ring.length;

  // Generar variaciones de tamaño y rotación consistentes para cada carta
  const transforms = useMemo(() => {
    if (!symbols || symbols.length === 0) return {};
    return symbols.reduce((acc, sym) => {
      // Escala aleatoria entre 0.65 y 1.35
      const scale = 0.65 + Math.random() * 0.7;
      // Rotación aleatoria entre 0 y 359 grados
      const rotate = Math.floor(Math.random() * 360);

      acc[sym] = { scale, rotate };
      return acc;
    }, {});
  }, [symbols.join(',')]);

  function handleClick(sym) {
    if (!interactive || disabled) return;
    onSymbolClick?.(sym);
  }

  function getAngle(index) {
    return (360 / total) * index - 90; // empieza desde arriba
  }

  return (
    <div className={`symbol-card symbol-card--${variant}`}>
      <div className="symbol-card__inner">
        {/* Centro */}
        {center && (
          <button
            className={`symbol symbol--center ${highlight === center ? 'symbol--hit' : ''} ${disabled ? 'symbol--disabled' : ''}`}
            onClick={() => handleClick(center)}
            disabled={!interactive || disabled}
            aria-label={`Símbolo ${center}`}
            style={{
              '--sym-scale': transforms[center]?.scale || 1,
              '--sym-rotate': `${transforms[center]?.rotate || 0}deg`,
            }}
          >
            {isImageUrl(center)
              ? <img src={center} alt="símbolo" className="symbol__img" />
              : <span className="symbol__emoji">{center}</span>
            }
          </button>
        )}

        {/* Anillo */}
        {ring.map((sym, i) => {
          const angle   = getAngle(i);
          const rad     = (angle * Math.PI) / 180;
          const radius  = 38; // % del contenedor
          const x       = 50 + radius * Math.cos(rad);
          const y       = 50 + radius * Math.sin(rad);
          const isHit   = highlight === sym;

          return (
            <button
              key={i}
              className={`symbol symbol--ring ${isHit ? 'symbol--hit' : ''} ${disabled ? 'symbol--disabled' : ''}`}
              style={{ 
                left: `${x}%`, 
                top: `${y}%`,
                '--sym-scale': transforms[sym]?.scale || 1,
                '--sym-rotate': `${transforms[sym]?.rotate || 0}deg`
              }}
              onClick={() => handleClick(sym)}
              disabled={!interactive || disabled}
              aria-label={`Símbolo ${sym}`}
            >
              {isImageUrl(sym)
                ? <img src={sym} alt="símbolo" className="symbol__img" />
                : <span className="symbol__emoji">{sym}</span>
              }
            </button>
          );
        })}
      </div>
    </div>
  );
}
