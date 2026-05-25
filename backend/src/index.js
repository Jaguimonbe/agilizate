'use strict';

require('dotenv').config();

const express   = require('express');
const http      = require('http');
const { Server } = require('socket.io');
const cors      = require('cors');
const mongoose  = require('mongoose');

const roomsRouter      = require('./routes/rooms');
const registerHandlers = require('./socket/handlers');

/* ─── App Setup ─────────────────────────────── */
const app    = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
  },
  pingTimeout:  60000,
  pingInterval: 25000,
});

/* ─── Middlewares ───────────────────────────── */
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

/* ─── Health check ──────────────────────────── */
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

/* ─── REST Routes ───────────────────────────── */
app.use('/api/rooms', roomsRouter);

/* ─── Socket.io ─────────────────────────────── */
io.on('connection', socket => {
  console.log(`[socket] conectado: ${socket.id}`);
  registerHandlers(io, socket);
});

/* ─── After /alistar: broadcast game start ──── */
// Parche: las rutas REST emiten juego_iniciado vía io
// Exportamos io para usarlo en las rutas
app.set('io', io);

/* ─── Actualizar ruta alistar para emitir inicio ─ */
// El emit real se hace dentro del handler de socket broadcast_inicio
// Aquí hacemos el broadcast desde la ruta REST directamente
const roomsRoute = require('./routes/rooms');
app.post('/api/rooms/:codigo/start-broadcast', (req, res) => {
  const { codigoSala } = req.body;
  const { getRoom }   = require('./state/gameState');
  const room          = getRoom(codigoSala?.toUpperCase());
  if (!room) return res.status(404).json({ error: 'No encontrada' });

  const { getPublicPlayerList } = require('./socket/handlers');

  // Emitir estado personalizado a cada jugador
  Object.values(room.jugadores).forEach(j => {
    const s = io.sockets.sockets.get(j.socketId);
    if (s) {
      s.emit('juego_iniciado', {
        pozoActual: room.pozoActual,
        misCartas:  room.mazosJugadores[j.id] ?? [],
        conteos:    Object.fromEntries(
          Object.entries(room.mazosJugadores).map(([id, m]) => [id, m.length])
        ),
        jugadores: Object.values(room.jugadores).map(p => ({
          id: p.id, nombre: p.nombre, conectado: p.conectado,
          cartasRestantes: room.mazosJugadores[p.id]?.length ?? 0,
        })),
      });
    }
  });
  res.json({ ok: true });
});

/* ─── MongoDB + Start ───────────────────────── */
const PORT       = process.env.PORT || 3001;
const MONGO_URI  = process.env.MONGODB_URI || 'mongodb://localhost:27017/agilizate';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log(`[db] MongoDB conectado`);
    server.listen(PORT, () => console.log(`[server] escuchando en http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('[db] Error de conexión:', err.message);
    process.exit(1);
  });
