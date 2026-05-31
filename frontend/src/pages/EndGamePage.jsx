import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { useSocket } from '../hooks/useSocket';
import './EndGamePage.css';

export default function EndGamePage() {
  const { codigo }  = useParams();
  const navigate    = useNavigate();
  const { state, dispatch } = useGame();
  const { emit }    = useSocket();

  const jugadorId   = state.jugadorId || localStorage.getItem('ag_jugadorId');
  const esGanador   = state.ganadorId === jugadorId;
  const ranking     = state.ranking ?? [];

  const [showModal, setShowModal] = useState(false);
  const [timeLeft, setTimeLeft]   = useState(10);

  // Redirigir si no hay estado de fin de partida o si el juego se reinicia
  useEffect(() => {
    if (state.estado === 'ESPERANDO') {
      if (state.esAdmin) {
        navigate(`/lobby/${codigo}`);
      } else {
        setShowModal(true);
      }
    } else if (!state.ganadorId && !state.ranking?.length && !showModal) {
      navigate('/');
    }
  }, [state.estado, state.ganadorId, state.ranking, navigate, codigo, state.esAdmin, showModal]);

  // Temporizador del modal
  useEffect(() => {
    if (!showModal) return;

    if (timeLeft <= 0) {
      handleGoHome();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [showModal, timeLeft]); // eslint-disable-line

  function handlePlayAgain() {
    emit('reiniciar_partida', { codigoSala: codigo });
  }

  function handleAcceptRematch() {
    navigate(`/lobby/${codigo}`);
  }

  function handleGoHome() {
    emit('abandonar_partida', { codigoSala: codigo, jugadorId });
    dispatch({ type: 'RESET' });
    navigate('/');
  }

  return (
    <div className="page end-page">
      <div className="end-bg">
        <div className="end-bg__orb end-bg__orb--1" />
        <div className="end-bg__orb end-bg__orb--2" />
      </div>

      <div className="end-content fade-in">
        {/* Resultado principal */}
        <div className="end-result">
          <div className={`end-result__icon ${esGanador ? 'end-result__icon--win' : 'end-result__icon--lose'}`}>
            {esGanador ? '🏆' : '💪'}
          </div>
          <h1 className={`end-result__title ${esGanador ? 'end-result__title--win' : ''}`}>
            {esGanador ? '¡GANASTE!' : '¡Buen intento!'}
          </h1>
          <p className="end-result__sub">
            {esGanador
              ? `¡Eres el más ágil mental de la sala!`
              : `${state.ganadorNombre || 'Alguien'} fue el más rápido esta vez.`
            }
          </p>
        </div>

        {/* Ranking */}
        {ranking.length > 0 && (
          <div className="glass-card end-ranking slide-up">
            <h3 className="end-ranking__title">🏅 Ranking Final</h3>
            <ol className="end-ranking__list">
              {ranking.map((j, idx) => (
                <li
                  key={j.id}
                  className={`rank-item ${j.id === jugadorId ? 'rank-item--me' : ''} ${idx === 0 ? 'rank-item--winner' : ''}`}
                >
                  <span className="rank-item__pos">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                  </span>
                  <span className="rank-item__name">
                    {j.nombre}
                    {j.id === jugadorId && <span className="rank-item__you"> (tú)</span>}
                  </span>
                  <span className="rank-item__cards">{j.cartasRestantes} 🃏</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Acciones */}
        <div className="end-actions slide-up">
          {state.esAdmin && (
            <button id="btn-new-game" className="btn btn-primary btn-lg" onClick={handlePlayAgain}>
              🔄 Nueva partida
            </button>
          )}
          <button id="btn-home" className="btn btn-ghost" onClick={handleGoHome}>
            🏠 Ir al inicio
          </button>
        </div>
      </div>

      {/* Modal para los demás jugadores */}
      {showModal && (
        <div className="modal-overlay fade-in">
          <div className="modal-content scale-up glass-card" style={{ textAlign: 'center', maxWidth: '300px' }}>
            <h2 style={{ color: 'var(--yellow-light)', marginBottom: '12px' }}>¡Nueva partida!</h2>
            <p style={{ marginBottom: '20px' }}>El admin quiere jugar de nuevo. ¿Revancha?</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '12px' }}>
              <button className="btn btn-primary" onClick={handleAcceptRematch}>
                Sí, acepto
              </button>
              <button className="btn btn-ghost" onClick={handleGoHome} style={{ background: 'rgba(255,255,255,0.1)' }}>
                No, me retiro
              </button>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
              Saliendo en {timeLeft}s...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
