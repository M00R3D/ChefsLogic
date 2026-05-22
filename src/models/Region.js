const mongoose = require("mongoose");

const regionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre de la region es obligatorio."],
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 120
    },
    slug: {
      type: String,
      required: [true, "El slug de la region es obligatorio."],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9-]+$/, "El slug solo permite letras minusculas, numeros y guiones."]
    },
    description: {
      type: String,
      default: "",
      maxlength: 400
    },
    climate: {
      type: String,
      enum: ["templado", "calido", "frio", "seco", "tropical", "mixto"],
      default: "mixto"
    },
    spiceLevel: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    icon: {
      type: String,
      default: "map-pin"
    }
  },
  {
    timestamps: true,
    collection: "regiones"
  }
);

module.exports = mongoose.model("Region", regionSchema);
