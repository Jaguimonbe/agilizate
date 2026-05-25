'use strict';

const { getRoom, setRoom, deleteRoom } = require('../state/gameState');

/* ─── Helpers ─────────────────────────────────── */
function getPublicPlayerList(room) {
  return Object.values(room.jugadores).map(j => ({
    id: j.id,
    nombre: j.nombre,
    conectado: j.conectado,
    cartasRestantes: room.mazosJugadores[j.id]?.length ?? 0,
  }));
}

function getCardCounts(room) {
  return Object.fromEntries(
    Object.entries(room.mazosJugadores).map(([id, mazo]) => [id, mazo.length])
  );
}

function buildRanking(room) {
  return Object.values(room.jugadores)
    .map(j => ({
      id: j.id,
      nombre: j.nombre,
      cartasRestantes: room.mazosJugadores[j.id]?.length ?? 0,
    }))
    .sort((a, b) => a.cartasRestantes - b.cartasRestantes);
}

/* ─── Registro de handlers ────────────────────── */
module.exports = function registerHandlers(io, socket) {

  /* ── unirse_sala ─────────────────────────────── */
  socket.on('unirse_sala', ({ codigoSala, jugadorNombre, jugadorId, token }) => {
    const code = codigoSala?.toUpperCase();
    const room = getRoom(code);

    if (!room) {
      socket.emit('error_sala', { mensaje: 'Sala no encontrada o expirada.' });
      return;
    }

    socket.join(code);

    // Reconexión: token conocido
    if (token && room.jugadores[token]) {
      room.jugadores[token].socketId  = socket.id;
      room.jugadores[token].conectado = true;
      socket.jugadorId   = token;
      socket.codigoSala  = code;

      socket.emit('estado_restaurado', {
        jugadorId:    token,
        pozoActual:   room.pozoActual,
        misCartas:    room.mazosJugadores[token] ?? [],
        estado:       room.estado,
        jugadores:    getPublicPlayerList(room),
        conteos:      getCardCounts(room),
      });

      io.to(code).emit('jugador_reconectado', { jugadorId: token, jugadores: getPublicPlayerList(room) });
      return;
    }

    // Nuevo jugador — usar ID enviado desde cliente (persistido en localStorage)
    const id = jugadorId || require('uuid').v4();

    if (Object.keys(room.jugadores).length >= 8) {
      socket.emit('error_sala', { mensaje: 'La sala está llena (máx. 8 jugadores).' });
      return;
    }

    room.jugadores[id] = { id, nombre: jugadorNombre, socketId: socket.id, conectado: true };
    socket.jugadorId  = id;
    socket.codigoSala = code;

    socket.emit('unido_sala', {
      jugadorId: id,
      estado:    room.estado,
      adminId:   room.adminId,
      jugadores: getPublicPlayerList(room),
    });

    socket.to(code).emit('jugador_unido', { jugadores: getPublicPlayerList(room) });
  });

  /* ── solicitar_estado_juego ──────────────────── */
  socket.on('solicitar_estado_juego', ({ codigoSala, jugadorId }) => {
    const room = getRoom(codigoSala?.toUpperCase());
    if (!room || room.estado !== 'JUGANDO') return;
    socket.emit('estado_juego', {
      pozoActual:  room.pozoActual,
      misCartas:   room.mazosJugadores[jugadorId] ?? [],
      conteos:     getCardCounts(room),
      jugadores:   getPublicPlayerList(room),
    });
  });

  /* ── juego_iniciado (el servidor backend lo emite tras /alistar) ─ */
  socket.on('broadcast_inicio', ({ codigoSala }) => {
    const room = getRoom(codigoSala?.toUpperCase());
    if (!room) return;
    // Enviar estado personalizado a cada jugador
    Object.values(room.jugadores).forEach(j => {
      const targetSocket = io.sockets.sockets.get(j.socketId);
      if (targetSocket) {
        targetSocket.emit('juego_iniciado', {
          pozoActual: room.pozoActual,
          misCartas:  room.mazosJugadores[j.id] ?? [],
          conteos:    getCardCounts(room),
          jugadores:  getPublicPlayerList(room),
        });
      }
    });
  });

  /* ── intentar_acierto ────────────────────────── */
  socket.on('intentar_acierto', ({ codigoSala, jugadorId, figuraSeleccionada }) => {
    const code = codigoSala?.toUpperCase();
    const room = getRoom(code);
    if (!room || room.estado !== 'JUGANDO') return;

    // Mutex síncrono: descartar si ya se está procesando
    if (room.procesando) return;
    room.procesando = true;

    try {
      const mazo = room.mazosJugadores[jugadorId];
      if (!mazo || mazo.length === 0) return;

      const cartaActual = mazo[mazo.length - 1]; // tope del mazo

      const enCarta = cartaActual.includes(figuraSeleccionada);
      const enPozo  = room.pozoActual.includes(figuraSeleccionada);

      if (!enCarta || !enPozo) {
        // Fallo: penalización solo al jugador
        const failSocket = io.sockets.sockets.get(room.jugadores[jugadorId]?.socketId);
        if (failSocket) failSocket.emit('error_cooldown', { mensaje: 'Figura incorrecta. ¡3 segundos de penalización!' });
        return;
      }

      // ✅ Acierto válido
      const cartaJugada = mazo.pop();          // quitar carta del jugador
      room.pozoActual   = cartaJugada;          // su carta se convierte en nuevo pozo

      // ¿Ganó?
      if (mazo.length === 0) {
        room.estado = 'FINALIZADA';
        io.to(code).emit('fin_partida', {
          ganadorId: jugadorId,
          ganadorNombre: room.jugadores[jugadorId]?.nombre,
          ranking: buildRanking(room),
        });
        return;
      }

      io.to(code).emit('actualizar_pozo', {
        nuevaCartaPozo:          cartaJugada,
        ganadorRondaId:          jugadorId,
        cartasRestantesGanador:  mazo.length,
        conteos:                 getCardCounts(room),
        jugadores:               getPublicPlayerList(room),
      });

    } finally {
      room.procesando = false;
    }
  });

  /* ── abandonar_partida ───────────────────────── */
  socket.on('abandonar_partida', ({ codigoSala, jugadorId }) => {
    handleLeave(io, socket, codigoSala?.toUpperCase(), jugadorId);
  });

  /* ── disconnect ──────────────────────────────── */
  socket.on('disconnect', () => {
    const { codigoSala, jugadorId } = socket;
    if (codigoSala && jugadorId) {
      handleLeave(io, socket, codigoSala, jugadorId);
    }
  });
};

function handleLeave(io, socket, code, jugadorId) {
  const room = getRoom(code);
  if (!room) return;

  if (room.jugadores[jugadorId]) {
    room.jugadores[jugadorId].conectado = false;
  }

  socket.leave(code);
  io.to(code).emit('jugador_desconectado', {
    jugadorId,
    jugadores: getPublicPlayerList(room),
  });
}
