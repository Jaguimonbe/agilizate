import { createContext, useContext, useReducer, useRef } from 'react';

const GameContext = createContext(null);

const initialState = {
  // Sala
  codigoSala:   null,
  adminId:      null,
  jugadorId:    null,
  jugadorNombre: null,
  esAdmin:      false,
  estado:       'IDLE', // IDLE | ESPERANDO | JUGANDO | FINALIZADA

  // Juego
  pozoActual:   [],
  misCartas:    [],   // stack; [0] es la siguiente, [last] es la actual
  conteos:      {},   // { jugadorId: cartasRestantes }
  jugadores:    [],   // [{ id, nombre, conectado, cartasRestantes }]

  // Resultado
  ganadorId:    null,
  ganadorNombre: null,
  ranking:      [],

  // UI
  cooldown:     false,
  conectado:    false,
  ultimoMatch:  null, // { simbolo, ganadorId, ganadorNombre, timestamp }
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_SESSION':
      return { ...state, ...action.payload };
    case 'SET_CONECTADO':
      return { ...state, conectado: action.payload };
    case 'UNIDO_SALA':
      return { ...state, ...action.payload, estado: action.payload.estado ?? 'ESPERANDO' };
    case 'JUGADORES_UPDATE':
      return { ...state, jugadores: action.payload };
    case 'ESTADO_RESTAURADO':
      return {
        ...state,
        estado:     action.payload.estado,
        pozoActual: action.payload.pozoActual || [],
        misCartas:  action.payload.misCartas || [],
        conteos:    action.payload.conteos || {},
        jugadores:  action.payload.jugadores || [],
      };
    case 'JUEGO_INICIADO':
      return {
        ...state,
        estado:     'JUGANDO',
        pozoActual: action.payload.pozoActual,
        misCartas:  action.payload.misCartas,
        conteos:    action.payload.conteos,
        jugadores:  action.payload.jugadores,
      };
    case 'ACTUALIZAR_POZO': {
      const { nuevaCartaPozo, ganadorRondaId, conteos, jugadores } = action.payload;
      let nuevasCartas = state.misCartas;
      
      // Encontrar el símbolo que hizo match (intersección entre pozo viejo y nuevo)
      const matchedSymbol = state.pozoActual.find(sym => nuevaCartaPozo.includes(sym));
      const ganador = jugadores.find(j => j.id === ganadorRondaId);

      // Si el jugador local fue el que acertó, removemos su carta actual (la del tope)
      if (ganadorRondaId === state.jugadorId && nuevasCartas.length > 0) {
        nuevasCartas = [...state.misCartas];
        nuevasCartas.pop(); 
      }

      return {
        ...state,
        pozoActual: nuevaCartaPozo,
        misCartas:  nuevasCartas,
        conteos:    conteos,
        jugadores:  jugadores,
        ultimoMatch: {
          simbolo: matchedSymbol,
          ganadorId: ganadorRondaId,
          ganadorNombre: ganador ? ganador.nombre : 'Alguien',
          timestamp: Date.now()
        }
      };
    }
    case 'CARTA_JUGADA':
      // Remover la última carta del mazo propio
      return { ...state, misCartas: action.payload.misCartas };
    case 'COOLDOWN_ON':
      return { ...state, cooldown: true };
    case 'COOLDOWN_OFF':
      return { ...state, cooldown: false };
    case 'FIN_PARTIDA':
      return {
        ...state,
        estado:       'FINALIZADA',
        ganadorId:    action.payload.ganadorId,
        ganadorNombre: action.payload.ganadorNombre,
        ranking:      action.payload.ranking,
      };
    case 'JUEGO_REINICIADO':
      return {
        ...state,
        estado:       'ESPERANDO',
        pozoActual:   [],
        misCartas:    [],
        conteos:      {},
        ganadorId:    null,
        ganadorNombre: null,
        ranking:      [],
        ultimoMatch:  null,
        cooldown:     false
      };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const socketRef = useRef(null);

  return (
    <GameContext.Provider value={{ state, dispatch, socketRef }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame debe usarse dentro de <GameProvider>');
  return ctx;
}
