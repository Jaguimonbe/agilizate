import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useGame } from '../context/GameContext';
import { useSocket } from '../hooks/useSocket';
import './HomePage.css';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default function HomePage() {
  const navigate = useNavigate();
  const { dispatch } = useGame();
  const { connect, emit } = useSocket();

  const [tab, setTab]           = useState('join');   // 'create' | 'join'
  const [nombre, setNombre]     = useState('');
  const [codigo, setCodigo]     = useState('');
  const [loading, setLoading]   = useState(false);

  /* ── Crear sala ─────────────────────────── */
  async function handleCreate(e) {
    e.preventDefault();
    if (!nombre.trim()) return toast.error('Ingresa tu nombre');

    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/rooms`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ adminNombre: nombre.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear sala');

      // Guardar sesión
      localStorage.setItem('ag_jugadorId',    data.adminId);
      localStorage.setItem('ag_jugadorNombre', nombre.trim());
      localStorage.setItem('ag_codigoSala',    data.codigoSala);
      localStorage.setItem('ag_adminId',       data.adminId);

      dispatch({
        type: 'SET_SESSION',
        payload: {
          jugadorId:     data.adminId,
          jugadorNombre: nombre.trim(),
          codigoSala:    data.codigoSala,
          adminId:       data.adminId,
          esAdmin:       true,
          estado:        'ESPERANDO',
        },
      });

      connect();
      navigate(`/lobby/${data.codigoSala}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  /* ── Unirse a sala ──────────────────────── */
  async function handleJoin(e) {
    e.preventDefault();
    if (!nombre.trim()) return toast.error('Ingresa tu nombre');
    if (!codigo.trim()) return toast.error('Ingresa el código de sala');

    const code = codigo.trim().toUpperCase();
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/rooms/${code}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sala no encontrada');
      if (data.estado === 'FINALIZADA') throw new Error('La partida ya finalizó');

      // Recuperar o generar ID de jugador
      const prevId    = localStorage.getItem('ag_jugadorId');
      const prevSala  = localStorage.getItem('ag_codigoSala');
      const jugadorId = (prevSala === code && prevId) ? prevId : crypto.randomUUID();

      localStorage.setItem('ag_jugadorId',    jugadorId);
      localStorage.setItem('ag_jugadorNombre', nombre.trim());
      localStorage.setItem('ag_codigoSala',    code);

      dispatch({
        type: 'SET_SESSION',
        payload: {
          jugadorId,
          jugadorNombre: nombre.trim(),
          codigoSala:    code,
          adminId:       data.adminId,
          esAdmin:       false,
          estado:        data.estado,
        },
      });

      connect();

      if (data.estado === 'JUGANDO') {
        navigate(`/game/${code}`);
      } else {
        navigate(`/lobby/${code}`);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page home-page">
      {/* Fondo decorativo */}
      <div className="home-bg">
        <div className="home-bg__orb home-bg__orb--1" />
        <div className="home-bg__orb home-bg__orb--2" />
      </div>

      <div className="home-content fade-in">
        {/* Logo / Título */}
        <div className="home-logo">
          <div className="home-logo__icon">🎴</div>
          <h1 className="home-logo__title">Agilízate</h1>
          <p className="home-logo__subtitle">Juego de agilidad mental</p>
        </div>

        {/* Card */}
        <div className="glass-card home-card slide-up">
          {/* Tabs */}
          <div className="home-tabs">
            <button
              id="tab-join"
              className={`home-tab ${tab === 'join' ? 'home-tab--active' : ''}`}
              onClick={() => setTab('join')}
            >
              Unirse a sala
            </button>
            <button
              id="tab-create"
              className={`home-tab ${tab === 'create' ? 'home-tab--active' : ''}`}
              onClick={() => setTab('create')}
            >
              Crear sala
            </button>
            <button
              id="tab-practice"
              className={`home-tab ${tab === 'practice' ? 'home-tab--active' : ''}`}
              onClick={() => setTab('practice')}
            >
              Práctica
            </button>
          </div>

          {/* Formulario Unirse */}
          {tab === 'join' && (
            <form className="home-form" onSubmit={handleJoin}>
              <div className="form-group">
                <label className="form-label">Tu nombre</label>
                <input
                  id="input-nombre-join"
                  className="input-field"
                  type="text"
                  placeholder="Ej: Camila"
                  maxLength={20}
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Código de sala</label>
                <input
                  id="input-codigo"
                  className="input-field input-code"
                  type="text"
                  placeholder="Ej: A4X9"
                  maxLength={4}
                  value={codigo}
                  onChange={e => setCodigo(e.target.value.toUpperCase())}
                />
              </div>
              <button id="btn-join" className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
                {loading ? <span className="spinner" /> : '🚀 Entrar a la sala'}
              </button>
            </form>
          )}

          {/* Formulario Crear */}
          {tab === 'create' && (
            <form className="home-form" onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Tu nombre (serás el admin)</label>
                <input
                  id="input-nombre-create"
                  className="input-field"
                  type="text"
                  placeholder="Ej: Luis"
                  maxLength={20}
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  autoFocus
                />
              </div>
              <button id="btn-create" className="btn btn-secondary btn-full btn-lg" type="submit" disabled={loading}>
                {loading ? <span className="spinner" /> : '✨ Crear nueva sala'}
              </button>
            </form>
          )}

          {/* Opciones Práctica */}
          {tab === 'practice' && (
            <div className="home-form">
              <p style={{ textAlign: 'center', marginBottom: '20px', color: 'var(--text-2)' }}>
                Juega en solitario para mejorar tu agilidad visual.
              </p>
              <button 
                className="btn btn-primary btn-full btn-lg" 
                style={{ marginBottom: '15px' }}
                onClick={() => navigate('/practice?mode=time')}
              >
                ⏳ 1 Minuto (Mayor cantidad de match)
              </button>
              <button 
                className="btn btn-secondary btn-full btn-lg" 
                onClick={() => navigate('/practice?mode=deck')}
              >
                🃏 Mazo Completo (Duración total)
              </button>
            </div>
          )}
        </div>

        <p className="home-footer">
          🃏 Basado en la mecánica <em>Spot It! / Dobble</em> — ¡Un símbolo en común siempre!
        </p>
      </div>
    </div>
  );
}
