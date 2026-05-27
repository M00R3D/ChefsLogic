const mongoose = require("mongoose");

const ingredientSchema = new mongoose.Schema(
  {
    // Legacy fields required by existing MongoDB collection validator.
    nombre: {
      type: String,
      trim: true,
      default: ""
    },
    categoria: {
      type: String,
      trim: true,
      default: "otro"
    },
    cantidad: {
      type: Number,
      min: 0,
      default: 1
    },
    unidad: {
      type: String,
      trim: true,
      default: "g"
    },
    precio_aprox: {
      type: Number,
      min: 0,
      default: 0
    },
    accesibilidad: {
      type: String,
      enum: ["economico", "medio", "premium"],
      default: "medio"
    },
    name: {
      type: String,
      required: [true, "El nombre del ingrediente es obligatorio."],
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 120
    },
    category: {
      type: String,
      enum: [
        "verdura", "fruta", "proteina", "grano", "especia", "lacteo",
        "aceite", "condimento", "chile", "salsa", "bebida", "conserva", "hongo", "otro"
      ],
      default: "otro"
    },
    defaultUnit: {
      type: String,
      enum: ["g", "kg", "ml", "l", "pieza", "cdita", "cda", "taza", "manojo", "ramita", "lata", "botella", "sobre", "diente"],
      default: "g"
    },
    seasonality: [
      {
        type: String,
        enum: [
          "enero",
          "febrero",
          "marzo",
          "abril",
          "mayo",
          "junio",
          "julio",
          "agosto",
          "septiembre",
          "octubre",
          "noviembre",
          "diciembre"
        ]
      }
    ],
    nutritionalInfo: {
      calories: { type: Number, min: 0, default: 0 },
      protein: { type: Number, min: 0, default: 0 },
      carbs: { type: Number, min: 0, default: 0 },
      fat: { type: Number, min: 0, default: 0 }
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true
      }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true,
    collection: "ingredientes"
  }
);

module.exports = mongoose.model("Ingredient", ingredientSchema);
