const mongoose = require("mongoose");

const interactionSchema = new mongoose.Schema(
  {
    // Legacy fields required by existing MongoDB collection validator.
    tipo: {
      type: String,
      enum: ["like", "dislike", "favorito", "comentario", "visualizacion", "comment", "save", "share", "rating", "follow", "view"],
      default: "like"
    },
    fecha: {
      type: Date,
      default: Date.now
    },
    dispositivo: {
      type: String,
      default: "web"
    },
    comentario: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500
    },
    usuario_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    receta_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recipe",
      default: null
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    recipe: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recipe",
      default: null
    },
    cookbook: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cookbook",
      default: null
    },
    type: {
      type: String,
      enum: ["like", "dislike", "comment", "save", "share", "rating", "follow", "view"],
      required: [true, "El tipo de interaccion es obligatorio."]
    },
    targetType: {
      type: String,
      enum: ["recipe", "cookbook", "user"],
      required: [true, "El tipo de objetivo es obligatorio."]
    },
    value: {
      type: Number,
      default: 1,
      min: 0,
      max: 5
    },
    commentText: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    collection: "interacciones"
  }
);

const legacyToModernTypeMap = {
  like: "like",
  dislike: "dislike",
  favorito: "save",
  comentario: "comment",
  visualizacion: "view"
};

const modernToLegacyTypeMap = {
  like: "like",
  dislike: "dislike",
  save: "favorito",
  comment: "comentario",
  view: "visualizacion"
};

interactionSchema.pre("validate", function syncLegacyAndModern() {
  if (!this.type && this.tipo) this.type = legacyToModernTypeMap[this.tipo] || this.tipo;
  if (!this.tipo && this.type) this.tipo = modernToLegacyTypeMap[this.type] || this.type;

  if (!this.user && this.usuario_id) this.user = this.usuario_id;
  if (!this.usuario_id && this.user) this.usuario_id = this.user;

  if (!this.recipe && this.receta_id) this.recipe = this.receta_id;
  if (!this.receta_id && this.recipe) this.receta_id = this.recipe;

  if (!this.commentText && this.comentario) this.commentText = this.comentario;
  if (!this.comentario && this.commentText) this.comentario = this.commentText;

  if (!this.fecha) this.fecha = this.createdAt || new Date();
  if (!this.dispositivo) this.dispositivo = "web";

  if (!this.targetType) {
    this.targetType = this.recipe || this.receta_id ? "recipe" : "user";
  }
});

module.exports = mongoose.model("Interaction", interactionSchema);
