/**
 * freshSeed.js
 * Equivalente a "migrate:fresh --seed" para este proyecto.
 * Limpia datos demo y ejecuta seeders en orden.
 *
 * Uso: node src/seeders/freshSeed.js
 */

require("dotenv").config();
const path = require("path");
const mongoose = require("mongoose");
const { spawnSync } = require("child_process");

const COLLECTIONS_TO_CLEAR = [
  "interacciones",
  "recetarios",
  "recetas",
  "ingredientes",
  "regiones",
  "usuarios",
  "sessions"
];

function runSeederScript(scriptPath) {
  const result = spawnSync(process.execPath, [scriptPath], { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`Fallo ejecutando: ${scriptPath}`);
  }
}

async function clearCollections(uri) {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  for (const name of COLLECTIONS_TO_CLEAR) {
    const exists = await db.listCollections({ name }).hasNext();
    if (!exists) {
      console.log(`  - ${name}: no existe, se omite`);
      continue;
    }

    const result = await db.collection(name).deleteMany({});
    console.log(`  - ${name}: eliminados ${result.deletedCount}`);
  }

  await mongoose.disconnect();
}

async function runFreshSeed() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/chefslogic";
  const root = path.resolve(__dirname);

  console.log("=========================================");
  console.log(" Chef's Logic - Fresh Seed");
  console.log("=========================================");
  console.log("\n1) Limpiando colecciones...");
  await clearCollections(uri);

  console.log("\n2) Ejecutando seeders en orden...");
  runSeederScript(path.join(root, "userSeeder.js"));
  runSeederScript(path.join(root, "fixRegionesValidator.js"));
  runSeederScript(path.join(root, "regionSeeder.js"));
  runSeederScript(path.join(root, "ingredientSeeder.js"));
  runSeederScript(path.join(root, "recipeSeeder.js"));
  runSeederScript(path.join(root, "cookbookSeeder.js"));

  console.log("\n=========================================");
  console.log(" Fresh seed completado correctamente");
  console.log("=========================================");
}

runFreshSeed().catch((err) => {
  console.error("\nERROR en freshSeed:", err.message || err);
  process.exit(1);
});
