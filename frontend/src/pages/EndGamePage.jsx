import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import './EndGamePage.css';

export default function EndGamePage() {
  const { codigo }  = useParams();
  const navigate    = useNavigate();
  const { state, dispatch } = useGame();

  const jugadorId   = state.jugadorId || localStorage.getItem('ag_jugadorId');
  const esGanador   = state.ganadorId === jugadorId;
  const ranking     = state.ranking ?? [];

  // Redirigir si no hay estado de fin de partida
  useEffect(() => {
    if (!state.ganadorId && !state.ranking?.length) {
      navigate('/');
    }
  }, []); // eslint-disable-line

  function handleReset() {
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
          <button id="btn-new-game" className="btn btn-primary btn-lg" onClick={handleReset}>
            🔄 Nueva partida
          </button>
          <button id="btn-home" className="btn btn-ghost" onClick={handleReset}>
            🏠 Ir al inicio
          </button>
        </div>
      </div>
    </div>
  );
}
