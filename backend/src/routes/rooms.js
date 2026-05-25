'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router  = express.Router();

const Room          = require('../models/Room');
const { prepareDeck, shuffle } = require('../engine/deckEngine');
const { getRoom, setRoom }     = require('../state/gameState');

/* ─────────────────────────────────────────
   Helpers
───────────────────────────────────────── */
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function getPublicPlayerList(room) {
  return Object.values(room.jugadores).map(j => ({
    id: j.id,
    nombre: j.nombre,
    conectado: j.conectado,
    cartasRestantes: room.mazosJugadores[j.id]?.length ?? 0,
  }));
}

/* ─────────────────────────────────────────
   POST /api/rooms  — Crear sala
───────────────────────────────────────── */
router.post('/', async (req, res) => {
  try {
    const { adminNombre } = req.body;
    if (!adminNombre?.trim()) return res.status(400).json({ error: 'El nombre del admin es requerido.' });

    let codigoSala;
    let attempts = 0;
    do {
      codigoSala = generateCode();
      attempts++;
    } while ((await Room.exists({ codigoSala })) && attempts < 10);

    const adminId = uuidv4();

    await Room.create({ codigoSala, adminId, adminNombre: adminNombre.trim(), estado: 'ESPERANDO' });

    setRoom(codigoSala, {
      codigoSala,
      adminId,
      adminNombre: adminNombre.trim(),
      estado: 'ESPERANDO',
      jugadores: {},
      mazosJugadores: {},
      pozoActual: null,
      procesando: false,
    });

    return res.status(201).json({ codigoSala, adminId });
  } catch (err) {
    console.error('[POST /rooms]', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

/* ─────────────────────────────────────────
   GET /api/rooms/:codigo  — Estado de sala
───────────────────────────────────────── */
router.get('/:codigo', async (req, res) => {
  try {
    const dbRoom = await Room.findOne({ codigoSala: req.params.codigo.toUpperCase() }).lean();
    if (!dbRoom) return res.status(404).json({ error: 'Sala no encontrada.' });

    const memRoom = getRoom(dbRoom.codigoSala);
    const jugadores = memRoom ? getPublicPlayerList(memRoom) : [];

    return res.json({
      codigoSala: dbRoom.codigoSala,
      adminNombre: dbRoom.adminNombre,
      estado: dbRoom.estado,
      maxJugadores: dbRoom.maxJugadores,
      jugadores,
    });
  } catch (err) {
    console.error('[GET /rooms/:codigo]', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

/* ─────────────────────────────────────────
   POST /api/rooms/:codigo/alistar  — Iniciar partida
───────────────────────────────────────── */
router.post('/:codigo/alistar', async (req, res) => {
  try {
    const codigo  = req.params.codigo.toUpperCase();
    const { adminId, recursos = [] } = req.body;

    const dbRoom  = await Room.findOne({ codigoSala: codigo });
    if (!dbRoom)             return res.status(404).json({ error: 'Sala no encontrada.' });
    if (dbRoom.adminId !== adminId) return res.status(403).json({ error: 'No autorizado.' });
    if (dbRoom.estado !== 'ESPERANDO') return res.status(409).json({ error: 'La partida ya fue iniciada.' });

    const memRoom = getRoom(codigo);
    if (!memRoom) return res.status(404).json({ error: 'Sala no encontrada en memoria.' });

    const jugadorIds = Object.keys(memRoom.jugadores);
    if (jugadorIds.length < 2) return res.status(400).json({ error: 'Se necesitan al menos 2 jugadores.' });

    // Generar mazo con n=7 → 57 cartas, 8 símbolos/carta
    const n = 7;
    const { deck } = prepareDeck(n, recursos);
    const shuffledDeck = shuffle([...deck]);

    // El último elemento del deck es el pozo inicial
    const pozoActual = shuffledDeck.pop();

    // Distribuir cartas equitativamente
    const cardsPerPlayer = Math.floor(shuffledDeck.length / jugadorIds.length);
    const mazosJugadores = {};
    jugadorIds.forEach((id, idx) => {
      mazosJugadores[id] = shuffledDeck.slice(idx * cardsPerPlayer, (idx + 1) * cardsPerPlayer);
    });

    // Actualizar estado en memoria
    memRoom.estado        = 'JUGANDO';
    memRoom.mazosJugadores = mazosJugadores;
    memRoom.pozoActual    = pozoActual;

    // Persistir estado en DB
    dbRoom.estado    = 'JUGANDO';
    dbRoom.recursos  = recursos;
    await dbRoom.save();

    return res.json({
      success: true,
      totalCartas: deck.length + 1,
      cartasPorJugador: cardsPerPlayer,
    });
  } catch (err) {
    console.error('[POST /rooms/:codigo/alistar]', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
