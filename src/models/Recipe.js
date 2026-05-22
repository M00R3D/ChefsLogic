const mongoose = require("mongoose");

const recipeIngredientSchema = new mongoose.Schema(
  {
    ingredient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ingredient",
      default: null
    },
    ingredientName: {
      type: String,
      trim: true,
      default: ""
    },
    quantity: {
      type: Number,
      min: 0,
      default: 0
    },
    unit: {
      type: String,
      trim: true,
      default: ""
    },
    notes: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { _id: false }
);

const recipeStepSchema = new mongoose.Schema(
  {
    order: {
      type: Number,
      required: true,
      min: 1
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    tip: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { _id: false }
);

const legacyRecipeIngredientSchema = new mongoose.Schema(
  {
    ingrediente_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ingredient",
      default: null
    },
    cantidad: {
      type: Number,
      min: 0,
      default: 0
    },
    unidad: {
      type: String,
      trim: true,
      default: ""
    },
    preparacion: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { _id: false }
);

const recipeSchema = new mongoose.Schema(
  {
    // Legacy fields required by existing MongoDB collection validator.
    titulo: {
      type: String,
      trim: true,
      default: ""
    },
    descripcion: {
      type: String,
      trim: true,
      default: ""
    },
    dificultad: {
      type: String,
      enum: ["facil", "media", "dificil"],
      default: "media"
    },
    tiempo_preparacion: {
      type: Number,
      min: 0,
      default: 0
    },
    imagen_principal: {
      type: String,
      trim: true,
      default: ""
    },
    ingredientes: [legacyRecipeIngredientSchema],
    pasos: [
      {
        type: String,
        trim: true
      }
    ],
    etiquetas: [
      {
        type: String,
        trim: true,
        lowercase: true
      }
    ],
    vistas: {
      type: Number,
      min: 0,
      default: 0
    },
    likes: {
      type: Number,
      min: 0,
      default: 0
    },
    usuario_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    region_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Region"
    },
    fecha_publicacion: {
      type: Date,
      default: Date.now
    },
    title: {
      type: String,
      required: [true, "El titulo es obligatorio."],
      trim: true,
      minlength: 3,
      maxlength: 140
    },
    slug: {
      type: String,
      required: [true, "El slug es obligatorio."],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9-]+$/, "El slug solo permite letras minusculas, numeros y guiones."]
    },
    summary: {
      type: String,
      default: "",
      maxlength: 400
    },
    region: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Region",
      default: null
    },
    difficulty: {
      type: String,
      enum: ["facil", "media", "dificil"],
      default: "media"
    },
    prepMinutes: {
      type: Number,
      min: 0,
      default: 10
    },
    cookMinutes: {
      type: Number,
      min: 0,
      default: 20
    },
    servings: {
      type: Number,
      min: 1,
      default: 2
    },
    imageUrl: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: ["borrador", "publicada", "archivada"],
      default: "borrador"
    },
    ingredients: [recipeIngredientSchema],
    steps: [recipeStepSchema],
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true
      }
    ],
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    ratingAvg: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    ratingCount: {
      type: Number,
      min: 0,
      default: 0
    },
    likeCount: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  {
    timestamps: true,
    collection: "recetas"
  }
);

recipeSchema.index({ title: "text", summary: "text", tags: "text" });

module.exports = mongoose.model("Recipe", recipeSchema);
