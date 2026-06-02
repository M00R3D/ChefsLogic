/**
 * cookbookSeeder.js
 * Crea 15 recetarios tematicos ligados a recetas existentes.
 * Uso: node src/seeders/cookbookSeeder.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

const Cookbook = require("../models/Cookbook");
const Recipe = require("../models/Recipe");
const User = require("../models/User");

const THEMATIC_COOKBOOKS = [
  { title: "Antojitos Callejeros", description: "Tacos, tostadas y bocados populares.", theme: "antojitos", tags: ["antojitos", "rapido"], recipeTags: ["antojitos", "tacos", "quesadilla"] },
  { title: "Mariscos del Pacífico", description: "Sabores costeros y recetas frescas.", theme: "mariscos", tags: ["mariscos", "costa"], recipeTags: ["mariscos", "ceviche", "pescado", "camarones"] },
  { title: "Moles y Salsas", description: "Recetas con moles tradicionales y salsas caseras.", theme: "mexicana", tags: ["mole", "tradicional"], recipeTags: ["mole", "chiles"] },
  { title: "Sopas y Caldos", description: "Platillos reconfortantes para cualquier día.", theme: "sopas", tags: ["sopas", "caldos"], recipeTags: ["sopas", "caldos"] },
  { title: "Cocina del Norte", description: "Cortes, asados y sazón norteña.", theme: "carnes", tags: ["norte", "carnes"], recipeTags: ["carnes", "asado", "cabrito"] },
  { title: "Delicias del Sureste", description: "Inspirado en Yucatán y el Caribe mexicano.", theme: "mexicana", tags: ["sureste", "regional"], recipeTags: ["pibil", "yucatan", "cochinita"] },
  { title: "Recetas con Pollo", description: "Opciones prácticas y sabrosas con pollo.", theme: "carnes", tags: ["pollo", "casero"], recipeTags: ["pollo"] },
  { title: "Favoritas de Fin de Semana", description: "Recetas para compartir en familia.", theme: "mexicana", tags: ["familiar", "fin-de-semana"], recipeTags: ["tradicional", "carnes", "mariscos"] },
  { title: "Sabores Tropicales", description: "Ingredientes frescos, cítricos y especiados.", theme: "mexicana", tags: ["tropical", "fresco"], recipeTags: ["tropical", "citrico", "veracruz"] },
  { title: "Tamales y Masa", description: "Preparaciones clásicas basadas en maíz.", theme: "desayunos", tags: ["masa", "tamales"], recipeTags: ["tamales", "tortilla"] },
  { title: "Picantes de México", description: "Para amantes del chile en todas sus formas.", theme: "mexicana", tags: ["picante", "chile"], recipeTags: ["chiles", "mole"] },
  { title: "Platos Festivos", description: "Recetas para celebraciones especiales.", theme: "mexicana", tags: ["festivo", "especial"], recipeTags: ["festivo", "mole", "tradicional"] },
  { title: "Comidas Rápidas", description: "Opciones sencillas para el día a día.", theme: "desayunos", tags: ["rapido", "facil"], recipeTags: ["facil", "tacos", "ensaladas"] },
  { title: "Dulces Mexicanos", description: "Postres y recetas con toque dulce.", theme: "postres", tags: ["postres", "dulce"], recipeTags: ["postres", "dulce"] },
  { title: "Colección Chef's Logic", description: "Selección curada para demo completa de la plataforma.", theme: "internacional", tags: ["demo", "destacadas"], recipeTags: ["tradicional", "mole", "mariscos", "antojitos"] }
];

function uniqueIds(ids) {
  const seen = new Set();
  const result = [];
  for (const id of ids) {
    const key = String(id || "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(id);
  }
  return result;
}

async function pickRecipes(recipeTags = [], fallbackLimit = 8) {
  let recipes = [];
  if (recipeTags.length) {
    recipes = await Recipe.find({ tags: { $in: recipeTags } }).sort({ likeCount: -1, createdAt: -1 }).limit(10).select("_id").lean();
  }

  if (!recipes.length) {
    recipes = await Recipe.find({ status: "publicada" }).sort({ createdAt: -1 }).limit(fallbackLimit).select("_id").lean();
  }

  return uniqueIds(recipes.map((r) => r._id));
}

async function seedCookbooks() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/chefslogic";
  console.log("Seeder de recetarios: conectando a", uri);
  await mongoose.connect(uri);

  const owner = await User.findOne().select("_id");
  if (!owner) {
    throw new Error("No hay usuarios para asignar como owner en recetarios.");
  }

  let inserted = 0;
  let updated = 0;

  for (const cb of THEMATIC_COOKBOOKS) {
    const recipeIds = await pickRecipes(cb.recipeTags, 8);
    const payload = {
      nombre: cb.title,
      descripcion: cb.description,
      publico: true,
      fecha_creacion: new Date(),
      usuario_id: owner._id,
      recetas: recipeIds,
      title: cb.title,
      description: cb.description,
      owner: owner._id,
      recipes: recipeIds,
      isPublic: true,
      coverImage: "",
      tags: cb.tags,
      theme: cb.theme,
      accentColor: "#C0392B",
      coverEmoji: "📖"
    };

    const existing = await Cookbook.findOne({ title: cb.title });
    if (existing) {
      existing.set(payload);
      await existing.save();
      updated++;
      console.log(`  ↻ Actualizado: ${cb.title}`);
    } else {
      await Cookbook.create(payload);
      inserted++;
      console.log(`  ✔ Insertado: ${cb.title}`);
    }
  }

  console.log(`\nResumen recetarios: insertados=${inserted}, actualizados=${updated}`);
  await mongoose.disconnect();
  process.exit(0);
}

seedCookbooks().catch((err) => {
  console.error("ERROR en cookbookSeeder:", err.message || err);
  process.exit(1);
});
