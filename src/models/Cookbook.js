const mongoose = require("mongoose");

const cookbookSchema = new mongoose.Schema(
  {
    // Legacy fields required by existing MongoDB collection validator.
    nombre: {
      type: String,
      trim: true,
      default: ""
    },
    publico: {
      type: Boolean,
      default: false
    },
    usuario_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    fecha_creacion: {
      type: Date,
      default: Date.now
    },
    recetas: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Recipe"
      }
    ],
    title: {
      type: String,
      required: [true, "El titulo del recetario es obligatorio."],
      trim: true,
      minlength: 3,
      maxlength: 140
    },
    description: {
      type: String,
      default: "",
      maxlength: 500
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    recipes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Recipe"
      }
    ],
    isPublic: {
      type: Boolean,
      default: false
    },
    coverImage: {
      type: String,
      default: ""
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true
      }
    ]
  },
  {
    timestamps: true,
    collection: "recetarios"
  }
);

module.exports = mongoose.model("Cookbook", cookbookSchema);
