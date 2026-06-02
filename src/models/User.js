const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // Legacy fields required by existing MongoDB collection validator.
    nombre: {
      type: String,
      trim: true,
      default: ""
    },
    correo: {
      type: String,
      trim: true,
      lowercase: true,
      default: ""
    },
    password: {
      type: String,
      default: ""
    },
    avatar: {
      type: String,
      default: "default.png"
    },
    fecha_registro: {
      type: Date,
      default: Date.now
    },
    rol: {
      type: String,
      enum: ["usuario", "admin"],
      default: "usuario"
    },
    name: {
      type: String,
      required: [true, "El nombre es obligatorio."],
      trim: true,
      minlength: 2,
      maxlength: 80
    },
    email: {
      type: String,
      required: [true, "El email es obligatorio."],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "El email no es valido."]
    },
    passwordHash: {
      type: String,
      required: [true, "La contrasena en hash es obligatoria."],
      minlength: 20
    },
    role: {
      type: String,
      enum: ["usuario", "admin"],
      default: "usuario"
    },
    avatarUrl: {
      type: String,
      default: ""
    },
    bio: {
      type: String,
      maxlength: 220,
      default: ""
    },
    favoriteRegions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Region"
      }
    ],
    savedRecipes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Recipe"
      }
    ],
      likedRecipes: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Recipe"
        }
      ],
      isActive: {
      type: Boolean,
      default: true
      },
      permissions: {
        canModerateIngredients: {
          type: Boolean,
          default: false
        },
        canDeleteAnyDocument: {
          type: Boolean,
          default: false
        },
        canApproveUserContent: {
          type: Boolean,
          default: false
        }
    }
  },
  {
    timestamps: true,
    collection: "usuarios"
  }
);

module.exports = mongoose.model("User", userSchema);
