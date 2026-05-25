const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    codigoSala: { type: String, required: true, unique: true, uppercase: true, trim: true },
    adminId:    { type: String, required: true },
    adminNombre:{ type: String, required: true },
    estado:     { type: String, enum: ['ESPERANDO', 'JUGANDO', 'FINALIZADA'], default: 'ESPERANDO' },
    maxJugadores: { type: Number, default: 8 },
    recursos:   { type: [String], default: [] }, // URLs o emojis personalizados
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', roomSchema);
