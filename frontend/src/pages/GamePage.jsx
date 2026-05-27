import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useGame } from '../context/GameContext';
import { useSocket } from '../hooks/useSocket';
import { useCooldown } from '../hooks/useCooldown';
import SymbolCard from '../components/SymbolCard/SymbolCard';
import PlayerList from '../components/PlayerList/PlayerList';
import { isImageUrl } from '../utils/symbols';
import './GamePage.css';

export default function GamePage() {
  const { codigo }  = useParams();
  const navigate    = useNavigate();
  const { state, dispatch } = useGame();
  const { connect, emit }   = useSocket();
  const isCooldown  = useCooldown();

  const [hitSymbol,   setHitSymbol]   = useState(null);
  const [shakeBoard,  setShakeBoard]  = useState(false);
  const [countdown,   setCountdown]   = useState(3);
  const [matchAnimData, setMatchAnimData] = useState(null);
  const countdownRef  = useRef(null);
  const hasJoined     = useRef(false);

  /* ── Animación de Match ──────────────────────── */
  useEffect(() => {
    if (state.ultimoMatch && state.ultimoMatch.simbolo) {
      setMatchAnimData(state.ultimoMatch);
      const timer = setTimeout(() => {
        setMatchAnimData(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state.ultimoMatch]);

  /* ── Conectar y solicitar estado si ya está jugando ── */
  useEffect(() => {
    const jugadorId    = state.jugadorId    || localStorage.getItem('ag_jugadorId');
    const jugadorNombre= state.jugadorNombre|| localStorage.getItem('ag_jugadorNombre');

    if (!jugadorId || !jugadorNombre) { navigate('/'); return; }

    connect();

    if (!hasJoined.current) {
      hasJoined.current = true;
      setTimeout(() => {
        emit('unirse_sala', { codigoSala: codigo, jugadorNombre, jugadorId, token: jugadorId });
        emit('solicitar_estado_juego', { codigoSala: codigo, jugadorId });
      }, 400);

      if (!state.jugadorId) {
        dispatch({ type: 'SET_SESSION', payload: { jugadorId, jugadorNombre, codigoSala: codigo } });
      }
    }
  }, [codigo]); // eslint-disable-line

  /* ── Redirigir al final de partida ─────────── */
  useEffect(() => {
    if (state.estado === 'FINALIZADA') {
      navigate(`/fin/${codigo}`);
    }
  }, [state.estado, codigo, navigate]);

  /* ── Cooldown countdown display ─────────────── */
  useEffect(() => {
    if (isCooldown) {
      setCountdown(3);
      setShakeBoard(true);
      setTimeout(() => setShakeBoard(false), 500);

      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) { clearInterval(countdownRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(countdownRef.current);
      setCountdown(3);
    }
    return () => clearInterval(countdownRef.current);
  }, [isCooldown]);

  /* ── Click en símbolo ────────────────────────── */
  function handleSymbolClick(figura) {
    if (isCooldown) return;
    const jugadorId = state.jugadorId || localStorage.getItem('ag_jugadorId');
    emit('intentar_acierto', { codigoSala: codigo, jugadorId, figuraSeleccionada: figura });
  }

  /* ── Datos derivados ─────────────────────────── */
  const jugadorId = state.jugadorId || localStorage.getItem('ag_jugadorId');
  const misCartas = state.misCartas ?? [];
  const cartaActual = misCartas.length > 0 ? misCartas[misCartas.length - 1] : [];
  const pozoActual  = state.pozoActual ?? [];
  const cartasRestantes = misCartas.length;

  return (
    <div className={`page--game game-page ${shakeBoard ? 'shake' : ''}`}>

      {/* ── MITAD SUPERIOR: El Pozo ────────────── */}
      <section className="game-half game-half--pozo">
        <div className="game-half__header">
          <span className="badge badge-purple">El Pozo 🌀</span>
          <div className="player-counts">
            {state.jugadores.map(j => (
              <span key={j.id} className={`count-chip ${j.id === jugadorId ? 'count-chip--me' : ''}`}>
                {j.nombre.split(' ')[0]}: {j.cartasRestantes}🃏
              </span>
            ))}
          </div>
        </div>

        <div className="game-card-wrapper" style={{ position: 'relative' }}>
          <SymbolCard
            symbols={pozoActual}
            interactive={false}
            variant="pozo"
          />

          {/* OVERLAY DE ANIMACIÓN DE MATCH */}
          {matchAnimData && (
            <div className="match-anim-overlay">
              <div className="match-anim-content">
                <span className="match-anim-title">{matchAnimData.ganadorNombre} acertó</span>
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
        </div>
      </section>

      {/* ── DIVISOR ───────────────────────────── */}
      <div className="game-divider">
        <span className="game-divider__badge">VS</span>
      </div>

      {/* ── MITAD INFERIOR: Mi Carta ──────────── */}
      <section className={`game-half game-half--player ${isCooldown ? 'game-half--cooldown' : ''}`}>
        {/* Overlay de cooldown */}
        {isCooldown && (
          <div className="cooldown-overlay">
            <div className="cooldown-content">
              <span className="cooldown-icon">🚫</span>
              <p className="cooldown-text">¡Figura incorrecta!</p>
              <div className="cooldown-timer">{countdown}</div>
            </div>
          </div>
        )}

        <div className="game-half__header">
          <span className="badge badge-yellow">Mi Carta ✋</span>
          <span className="my-cards-count">{cartasRestantes} cartas restantes</span>
        </div>

        <div className="game-card-wrapper">
          {cartaActual.length > 0 ? (
            <SymbolCard
              symbols={cartaActual}
              interactive={!isCooldown}
              onSymbolClick={handleSymbolClick}
              highlight={hitSymbol}
              variant="player"
              disabled={isCooldown}
            />
          ) : (
            <div className="no-cards">
              <span>🎉</span>
              <p>¡Sin cartas! Esperando resultado…</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
