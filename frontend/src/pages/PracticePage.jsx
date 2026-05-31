import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { prepareDeck } from '../utils/deckEngine';
import SymbolCard from '../components/SymbolCard/SymbolCard';
import { isImageUrl } from '../utils/symbols';
import './PracticePage.css';

export default function PracticePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'time'; // 'time' o 'deck'

  const [pozoActual, setPozoActual] = useState([]);
  const [misCartas, setMisCartas] = useState([]);
  const [puntaje, setPuntaje] = useState(0);
  const [time, setTime] = useState(mode === 'time' ? 60 : 0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isCooldown, setIsCooldown] = useState(false);
  const [matchAnimData, setMatchAnimData] = useState(null);
  
  const timerRef = useRef(null);

  // Iniciar el juego
  useEffect(() => {
    iniciarMazo();
    return () => clearInterval(timerRef.current);
  }, []);

  function iniciarMazo() {
    const { deck } = prepareDeck(7); // Mazo completo de 57 cartas
    const nuevoPozo = deck.pop();
    setPozoActual(nuevoPozo);
    setMisCartas(deck);
    setPuntaje(0);
    setIsGameOver(false);
    setTime(mode === 'time' ? 60 : 0);
    iniciarTemporizador();
  }

  function iniciarTemporizador() {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTime(prev => {
        if (mode === 'time') {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsGameOver(true);
            return 0;
          }
          return prev - 1;
        } else {
          return prev + 1;
        }
      });
    }, 1000);
  }

  function handleSymbolClick(simbolo) {
    if (isGameOver || isCooldown || misCartas.length === 0) return;

    const cartaActual = misCartas[misCartas.length - 1];
    const enCarta = cartaActual.includes(simbolo);
    const enPozo = pozoActual.includes(simbolo);

    if (enCarta && enPozo) {
      // MATCH CORRECTO
      const nuevaCarta = misCartas.pop();
      setPozoActual(nuevaCarta);
      setMisCartas([...misCartas]);
      setPuntaje(p => p + 1);

      // Animación de match
      setMatchAnimData({ simbolo });
      setTimeout(() => setMatchAnimData(null), 1500);

      // Si es el modo 'deck' y se acaban las cartas, termina el juego
      if (mode === 'deck' && misCartas.length === 0) {
        clearInterval(timerRef.current);
        setIsGameOver(true);
      } 
      // Si es el modo 'time' y se acaban las cartas antes del minuto, regeneramos el mazo
      else if (mode === 'time' && misCartas.length === 0) {
        const { deck } = prepareDeck(7);
        const nuevoPozo = deck.pop();
        setPozoActual(nuevoPozo);
        setMisCartas(deck);
      }
    } else {
      // ERROR
      setIsCooldown(true);
      setTimeout(() => setIsCooldown(false), 3000); // 3 segundos de penalización
    }
  }

  function formatearTiempo(segundos) {
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;
    return `${min}:${seg < 10 ? '0' + seg : seg}`;
  }

  return (
    <div className="page game-page practice-page">
      {/* Botón de salir (Flotante superior izquierda) */}
      <div className="practice-exit">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>← Salir</button>
      </div>

      {/* Contenido del juego (oculto si ya terminó) */}
      {!isGameOver && (
        <>
          {/* Mitad Superior: Pozo */}
          <section className="game-half game-half--pozo">
            <div className="game-card-wrapper">
              <SymbolCard
                symbols={pozoActual}
                interactive={false}
                variant="pozo"
              />
            </div>
          </section>

          {/* Divisor Visual con Stats (En el medio) */}
          <div className="practice-divider">
            <div className="practice-stat-pill" title={mode === 'time' ? 'Tiempo Restante' : 'Tiempo Transcurrido'}>
              <span className="stat-icon">{mode === 'time' ? '⏳' : '⏱️'}</span>
              <span className="stat-value">{formatearTiempo(time)}</span>
            </div>
            <div className="practice-stat-pill" title="Matches Acertados">
              <span className="stat-icon">🎯</span>
              <span className="stat-value">{puntaje}</span>
            </div>
            <div className="practice-stat-pill" title="Cartas Restantes">
              <span className="stat-icon">🃏</span>
              <span className="stat-value">{misCartas.length}</span>
            </div>
          </div>

          {/* Overlay Animación de Match */}
          {matchAnimData && (
            <div className="match-anim-overlay">
              <div className="match-anim-content">
                <span className="match-anim-title">¡Acertaste!</span>
                <div className="match-anim-symbol">
                  {isImageUrl(matchAnimData.simbolo) ? (
                    <img src={matchAnimData.simbolo} alt="Match" draggable="false" />
                  ) : (
                    matchAnimData.simbolo
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Mitad Inferior: Mi Carta */}
          <section className={`game-half game-half--player ${isCooldown ? 'game-half--cooldown' : ''}`}>
            {isCooldown && (
              <div className="cooldown-overlay">
                <span className="cooldown-icon">❌</span>
                <p>¡Error! 3s de penalización</p>
              </div>
            )}
            <div className={`game-card-wrapper ${isCooldown ? 'shake-anim' : ''}`}>
              {misCartas.length > 0 ? (
                <SymbolCard
                  symbols={misCartas[misCartas.length - 1]}
                  interactive={true}
                  onSymbolClick={handleSymbolClick}
                  disabled={isCooldown}
                  hitSymbol={null}
                />
              ) : (
                <div className="game-empty-state">
                  <span className="game-empty-icon">🎉</span>
                  <p>¡Mazo completado!</p>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* Modal de Fin de Juego */}
      {isGameOver && (
        <div className="modal-overlay fade-in">
          <div className="modal-content scale-up glass-card" style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div className="end-result__icon end-result__icon--win">🏆</div>
            <h1 className="end-result__title end-result__title--win">¡Práctica Finalizada!</h1>
            
            <div className="practice-results">
              {mode === 'time' ? (
                <>
                  <p>Lograste hacer</p>
                  <h2 className="practice-score">{puntaje} Matches</h2>
                  <p>en 1 minuto.</p>
                </>
              ) : (
                <>
                  <p>Completaste el mazo en</p>
                  <h2 className="practice-score">{formatearTiempo(time)}</h2>
                  <p>sin equivocarte fatalmente.</p>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
              <button className="btn btn-primary" onClick={iniciarMazo}>
                🔄 Volver a intentar
              </button>
              <button className="btn btn-ghost" onClick={() => navigate('/')} style={{ background: 'rgba(255,255,255,0.1)' }}>
                🏠 Ir al inicio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
