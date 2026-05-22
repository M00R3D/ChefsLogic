const mongoose = require("mongoose");

const interactionSchema = new mongoose.Schema(
  {
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
      enum: ["like", "comment", "save", "share", "rating", "follow"],
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

module.exports = mongoose.model("Interaction", interactionSchema);
