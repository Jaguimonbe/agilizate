import './PlayerList.css';

/**
 * Lista de jugadores con contadores de cartas.
 * Props:
 *   jugadores  [{ id, nombre, conectado, cartasRestantes }]
 *   miId       string  — id del jugador local (para resaltar)
 */
export default function PlayerList({ jugadores = [], miId }) {
  return (
    <div className="player-list">
      <h3 className="player-list__title">Jugadores</h3>
      <ul className="player-list__items">
        {jugadores.map(j => (
          <li
            key={j.id}
            className={`player-item ${j.id === miId ? 'player-item--me' : ''} ${!j.conectado ? 'player-item--offline' : ''}`}
          >
            <span className="player-item__dot" />
            <span className="player-item__name">
              {j.nombre} {j.id === miId && <span className="player-item__you">(tú)</span>}
            </span>
            <span className="player-item__cards">
              {j.cartasRestantes} 🃏
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
