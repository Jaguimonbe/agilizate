import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useGame } from '../context/GameContext';
import { useSocket } from '../hooks/useSocket';
import PlayerList from '../components/PlayerList/PlayerList';
import './LobbyPage.css';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default function LobbyPage() {
  const { codigo } = useParams();
  const navigate   = useNavigate();
  const { state, dispatch } = useGame();
  const { connect, emit }   = useSocket();

  const [copied,  setCopied]  = useState(false);
  const [loading, setLoading] = useState(false);

  /* ── Conectar socket y unirse a sala ─────── */
  useEffect(() => {
    const jugadorId    = state.jugadorId    || localStorage.getItem('ag_jugadorId');
    const jugadorNombre= state.jugadorNombre|| localStorage.getItem('ag_jugadorNombre');
    const adminId      = state.adminId      || localStorage.getItem('ag_adminId');

    if (!jugadorId || !jugadorNombre) {
      navigate('/');
      return;
    }

    connect();

    // Pequeño delay para asegurar que el socket está conectado
    const t = setTimeout(() => {
      emit('unirse_sala', {
        codigoSala:    codigo,
        jugadorNombre,
        jugadorId,
        token:         jugadorId,
      });

      if (!state.jugadorId) {
        dispatch({
          type: 'SET_SESSION',
          payload: {
            jugadorId,
            jugadorNombre,
            codigoSala: codigo,
            adminId,
            esAdmin: jugadorId === adminId,
          },
        });
      }
    }, 400);

    return () => clearTimeout(t);
  }, [codigo]); // eslint-disable-line

  /* ── Escuchar evento juego_iniciado ──────── */
  useEffect(() => {
    if (state.estado === 'JUGANDO') {
      navigate(`/game/${codigo}`);
    }
  }, [state.estado, codigo, navigate]);

  /* ── Alistar partida (solo admin) ────────── */
  const handleAlistar = useCallback(async () => {
    const adminId = state.adminId || localStorage.getItem('ag_adminId');
    if (state.jugadores.length < 2) {
      toast.error('Se necesitan al menos 2 jugadores para iniciar');
      return;
    }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/rooms/${codigo}/alistar`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ adminId, recursos: [] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al alistar');

      // Disparar broadcast a todos los sockets de la sala
      await fetch(`${API}/api/rooms/${codigo}/start-broadcast`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ codigoSala: codigo }),
      });

      toast.success(`¡Partida iniciada! ${data.totalCartas} cartas generadas`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [codigo, state.adminId, state.jugadores.length]);

  /* ── Copiar código ───────────────────────── */
  function copyCodigo() {
    navigator.clipboard.writeText(codigo).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const esAdmin    = state.esAdmin || state.jugadorId === (state.adminId || localStorage.getItem('ag_adminId'));
  const jugadores  = state.jugadores;

  return (
    <div className="page lobby-page">
      <div className="lobby-bg">
        <div className="lobby-bg__orb" />
      </div>

      <div className="lobby-content fade-in">
        {/* Header */}
        <div className="lobby-header">
          <span className="badge badge-purple">Sala de espera</span>
          <h1 className="lobby-title">¡Prepárense!</h1>
          <p className="lobby-sub">Comparte el código con tus amigos</p>
        </div>

        {/* Código de sala */}
        <div className="glass-card lobby-code-card">
          <p className="lobby-code-label">Código de sala</p>
          <div className="room-code">{codigo}</div>
          <button id="btn-copy" className="btn btn-ghost btn-sm" onClick={copyCodigo}>
            {copied ? '✅ ¡Copiado!' : '📋 Copiar código'}
          </button>
        </div>

        {/* Lista de jugadores */}
        <div className="glass-card lobby-players-card">
          <div className="lobby-players-header">
            <h3>Jugadores en sala</h3>
            <span className="badge badge-green">{jugadores.length} / 8</span>
          </div>

          {jugadores.length === 0 ? (
            <div className="lobby-waiting">
              <span className="spinner" />
              <p>Esperando jugadores…</p>
            </div>
          ) : (
            <PlayerList jugadores={jugadores} miId={state.jugadorId} />
          )}
        </div>

        {/* Acciones */}
        {esAdmin ? (
          <div className="lobby-actions slide-up">
            <div className="lobby-admin-hint">
              <span>👑</span>
              <p>Eres el administrador. Cuando todos estén listos, presiona <strong>Alistar</strong>.</p>
            </div>
            <button
              id="btn-alistar"
              className="btn btn-secondary btn-lg btn-full"
              onClick={handleAlistar}
              disabled={loading || jugadores.length < 2}
            >
              {loading ? <span className="spinner" /> : '⚡ Alistar Partida'}
            </button>
          </div>
        ) : (
          <div className="lobby-waiting-admin glass-card">
            <span className="spinner" />
            <p>Esperando que el admin inicie la partida…</p>
          </div>
        )}

        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
          ← Salir de la sala
        </button>
      </div>
    </div>
  );
}
