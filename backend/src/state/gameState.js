/**
 * Estado en Memoria (In-Memory Game State)
 * Estructura: Map<codigoSala, RoomState>
 *
 * RoomState {
 *   codigoSala: string,
 *   adminId:    string,
 *   estado:     'ESPERANDO' | 'JUGANDO' | 'FINALIZADA',
 *   jugadores:  { [jugadorId]: { id, nombre, socketId, conectado } },
 *   mazosJugadores: { [jugadorId]: string[][] },
 *   pozoActual: string[],
 *   procesando: boolean,  ← mutex para race conditions
 * }
 */

'use strict';

const state = new Map();

function getRoom(codigoSala) {
  return state.get(codigoSala) ?? null;
}

function setRoom(codigoSala, roomState) {
  state.set(codigoSala, roomState);
}

function deleteRoom(codigoSala) {
  state.delete(codigoSala);
}

function listRooms() {
  return [...state.keys()];
}

module.exports = { getRoom, setRoom, deleteRoom, listRooms };
