const mongoose = require('mongoose');

const eventoSchema = new mongoose.Schema(
  {
    usuario_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    receta_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Recipe',
      default: null
    },
    tipo: {
      type: String,
      enum: ['ver_receta', 'like', 'guardar_receta', 'buscar_receta', 'crear_receta', 'crear_ingrediente', 'crear_recetario'],
      required: [true, 'El tipo de evento es obligatorio.']
    },
    fecha: {
      type: Date,
      default: Date.now
    },
    dispositivo: {
      type: String,
      default: 'web'
    }
  },
  {
    collection: 'eventos'
  }
);

module.exports = mongoose.model('Evento', eventoSchema);
