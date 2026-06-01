/**
 * Actualiza el validator de la colección regiones al esquema Mongoose moderno.
 * Ejecutar una sola vez: node src/seeders/fixRegionesValidator.js
 */
require("dotenv").config();
const mongoose = require("mongoose");

async function fixValidator() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/chefslogic";
  await mongoose.connect(uri);

  await mongoose.connection.db.command({
    collMod: "regiones",
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["name", "slug"],
        properties: {
          name:        { bsonType: "string" },
          slug:        { bsonType: "string" },
          description: { bsonType: "string" },
          climate:     { bsonType: "string", enum: ["templado", "calido", "frio", "seco", "tropical", "mixto"] },
          spiceLevel:  { bsonType: "number" },
          icon:        { bsonType: "string" },
          states:      { bsonType: "array", items: { bsonType: "string" } }
        }
      }
    },
    validationLevel: "moderate",
    validationAction: "warn"
  });

  console.log("Validator de la colección 'regiones' actualizado correctamente.");
  await mongoose.disconnect();
  process.exit(0);
}

fixValidator().catch((err) => {
  console.error("ERROR:", err.message || err);
  process.exit(1);
});
