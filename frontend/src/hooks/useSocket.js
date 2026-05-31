import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useGame } from '../context/GameContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export function useSocket() {
  const { dispatch, socketRef } = useGame();
  const listenersAttached = useRef(false);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io(BACKEND_URL, {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      dispatch({ type: 'SET_CONECTADO', payload: true });
    });

    socket.on('disconnect', () => {
      dispatch({ type: 'SET_CONECTADO', payload: false });
    });

    socket.on('error_sala', ({ mensaje }) => {
      console.error('[socket] error_sala:', mensaje);
      // El componente que lo use puede escuchar via toast
      socket._lastError = mensaje;
      socket.emit('_error_sala_msg', mensaje);
    });

    socket.on('unido_sala', payload => {
      dispatch({ type: 'UNIDO_SALA', payload });
    });

    socket.on('estado_restaurado', payload => {
      dispatch({ type: 'ESTADO_RESTAURADO', payload });
    });

    socket.on('jugador_unido', ({ jugadores }) => {
      dispatch({ type: 'JUGADORES_UPDATE', payload: jugadores });
    });

    socket.on('jugador_desconectado', ({ jugadores }) => {
      dispatch({ type: 'JUGADORES_UPDATE', payload: jugadores });
    });

    socket.on('jugador_reconectado', ({ jugadores }) => {
      dispatch({ type: 'JUGADORES_UPDATE', payload: jugadores });
    });

    socket.on('juego_iniciado', payload => {
      dispatch({ type: 'JUEGO_INICIADO', payload });
    });

    socket.on('actualizar_pozo', payload => {
      dispatch({ type: 'ACTUALIZAR_POZO', payload });
    });

    socket.on('error_cooldown', () => {
      dispatch({ type: 'COOLDOWN_ON' });
    });

    socket.on('fin_partida', payload => {
      dispatch({ type: 'FIN_PARTIDA', payload });
    });

    socket.on('juego_reiniciado', () => {
      dispatch({ type: 'JUEGO_REINICIADO' });
    });

    listenersAttached.current = true;
  }, [dispatch, socketRef]);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    listenersAttached.current = false;
  }, [socketRef]);

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, [socketRef]);

  useEffect(() => {
    return () => {
      // No desconectar en unmount parcial; solo en reset explícito
    };
  }, []);

  return { connect, disconnect, emit, socket: socketRef };
}
