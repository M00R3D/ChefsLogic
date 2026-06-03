/**
 * recipeSeeder.js
 * Inserta recetas representativas por región para demostrar el modelo de datos.
 * Crea/actualiza (idempotente) recetas con campos legacy y modernos.
 * Uso: node src/seeders/recipeSeeder.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const Region = require("../models/Region");
const Recipe = require("../models/Recipe");
const User = require("../models/User");
const Ingredient = require("../models/Ingredient");

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function normalizeKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Plantillas de recetas por región (títulos + resumen + tags + plantilla simple de ingredientes/pasos)
const RECIPES_BY_REGION = {
  "noroeste": [
    {
      title: "Tacos de pescado estilo Baja",
      tags: ["mariscos","tacos"],
      difficulty: "facil",
      image: "https://www.recetasnestle.com.mx/sites/default/files/styles/recipe_detail_desktop_new/public/srh_recipes/24f49d0459444d4c89c9e4d9747a2145.webp?itok=dP46DW2J"
    },
    {
      title: "Ceviche sinaloense",
      tags: ["mariscos","ceviche"],
      difficulty: "facil",
      image: "https://i0.wp.com/estoessinaloa.com/wp-content/uploads/2021/02/9AEB32EF-8AA5-44DB-997D-A2D0B30678A1.jpeg?fit=712%2C400&ssl=1"
    },
    {
      title: "Camarones al coco",
      tags: ["mariscos","camarones"],
      difficulty: "media",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTwY7aibPr6vl2s0oLm0pjkIPYEswKwS2IEXStXsRJv-Q&s=10"
    },
    {
      title: "Carne asada con frijoles",
      tags: ["carnes","asado"],
      difficulty: "media",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS3Ctb6EZbFgpI9E05-RFMGtuIgLHGliD_UitlJLj3e8Q&s=10"
    },
    {
      title: "Sopa de mariscos del Pacífico",
      tags: ["sopas","mariscos"],
      difficulty: "media",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRERp9CiitbA3IIsDVkNCVUm0dXPk4ytohKrK4P4xx2Vw&s=10"
    },
    {
      title: "Ensalada de nopal y queso",
      tags: ["ensaladas","tradicional"],
      difficulty: "facil",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRCRQO9UHKk1Q5FToFPjx030xgNc3BX-cVlJO28J2z71w&s=10"
    },
    {
      title: "Tortilla de harina casera",
      tags: ["panes","acompañamiento"],
      difficulty: "media",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRKbjqM9IobumW5JcJ9rdOVir7TO1O2CWrZ_Jp92kTjsQ&s=10"
    },
    {
      title: "Chiles rellenos estilo norteño",
      tags: ["chiles","tradicional"],
      difficulty: "dificil",
      image: "https://www.mexicodesconocido.com.mx/sites/default/files/nodes/2381/chiles-rellenos-nortenos.jpg"
    }
  ],
  "noreste": [
    {
      title: "Cabrito al pastor",
      tags: ["cabrito","asado"],
      difficulty: "dificil",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ0Hj3xt8us4oLCQVgUNRJfLEr5AxHW7CdVjOxLaIjQUg&s=10"
    },
    {
      title: "Carne seca con machaca",
      tags: ["carnes","machaca"],
      difficulty: "media",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTtSjiHWWRns1M3AD9OWHfHoNw15dQYs2yGUt1KUQAf3w&s=10"
    },
    {
      title: "Frijoles con venado",
      tags: ["carnes","frijoles"],
      difficulty: "media",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTAclrlE3pP971Z1n5uGziVlZblX8AVgeeWWTA_eRL0hw&s=10"
    },
    {
      title: "Tortilla de harina con chorizo",
      tags: ["tortillas","chorizo"],
      difficulty: "facil",
      image: "https://cdn0.recetasgratis.net/es/posts/6/6/7/burritos_de_choriqueso_60766_paso_5_600.jpg"
    },
    {
      title: "Caldo de res estilo norteño",
      tags: ["caldos","res"],
      difficulty: "media",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSClSempLETOVrK7XzebnNxe3DkoBIUITmDgn8a8_lGow&s=10"
    },
    {
      title: "Asado con salsa de chile seco",
      tags: ["carnes","salsa"],
      difficulty: "media",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQFxYUIPbTDwDOHLW4pJ7jrwrZsgcPIC03_P8I2_wrmeg&s=10"
    },
    {
      title: "Ensalada de nopal asado",
      tags: ["ensaladas","nopal"],
      difficulty: "facil",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQSRH-259azbySTQe-654aaVkEHOt2M2BA-9KBROrgClQ&s=10"
    },
    {
      title: "Empanadas de carne al horno",
      tags: ["empanadas","horno"],
      difficulty: "media",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTMMkHTtFIRh9yZIUVFor_UQhNRbO2aV4f7Bas2VUFJEg&s=10"
    }
  ],
  "occidente": [
    {
      title: "Birria tapatía",
      tags: ["birria","carnes"],
      difficulty: "dificil",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQuL62ZCg8nxkM0AjvpATvnO6IyP_fdVlQfzC5g_2vxAg&s=10"
    },
    {
      title: "Pozole Jalisco",
      tags: ["pozole","tradicional"],
      difficulty: "media",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR84-8eZWNva9cP0jBXI49ui0dsp95KrbhlVHAfT9VVeQ&s=10"
    },
    {
      title: "Torta ahogada",
      tags: ["antojitos","pan"],
      difficulty: "media",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRVCDp_q--qevQwK2RA9VxJxQIh7WP6gIovSltkKH44cQ&s=10"
    },
    {
      title: "Carne en su jugo",
      tags: ["carnes","tradicional"],
      difficulty: "media",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSbhNQRC-_aVy4PoNaLGbuy7vbLZZO60CfxlRSYLhmiNg&s=10"
    },
    {
      title: "Tejuino con nieve de limón",
      tags: ["bebidas","postre"],
      difficulty: "facil",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRk9L3f4bfX2a2d_SccA6ToUKagvBqrNOI1xB1IL4ghDQ&s=10"
    },
    {
      title: "Arroz a la tumbada (versión occidental)",
      tags: ["mariscos","arroz"],
      difficulty: "media",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSNGOhAqHf-L-oGNgqOWTOb1GrpiF0UV2xx4SjtJhSigw&s=10"
    },
    {
      title: "Caldillo de pescado estilo occidente",
      tags: ["mariscos","sopa"],
      difficulty: "media",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcROhSt8IPreydvDjYCb2WKAIxqXuMUXvYhR7LxBvCBKmw&s=10"
    },
    {
      title: "Tamales de dulce de la región",
      tags: ["postres","tamales"],
      difficulty: "media",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS4OfnBFxZS7PvmMl1B0wYXtYQxy413IXOSX3Vct1PT-A&s=10"
    }
  ],
  "centro-sur": [
    {
      title: "Mole poblano clásico",
      tags: ["mole","puebla"],
      difficulty: "dificil",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSUcQJUsTweco9UmuVgkk7P2Hpxc7rahwQ5XU9ABV4Xfg&s=10"
    },
    {
      title: "Chiles en nogada (versión tradicional)",
      tags: ["festivo","chiles"],
      difficulty: "dificil",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQiuPYIn4L_dvaUX1uOx5JoOk0Rqttmq_XZ0ga45UBNnw&s=10"
    },
    {
      title: "Tlayudas de la CDMX",
      tags: ["antojitos","tlayuda"],
      difficulty: "media",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS43xWydbPQHDKGomVOeBtPg4WTrkeAesTkQKeAZu_AjQ&s=10"
    },
    {
      title: "Tamales de elote con crema",
      tags: ["tamales","dulce"],
      difficulty: "facil",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTwxjM8VIq_xc0PBkirCsMCr1ZQFgdyqhWAtCuT3od5iQ&s=10"
    },
    {
      title: "Sopa de tortilla",
      tags: ["sopas","tortilla"],
      difficulty: "facil",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTA399GBaHmi68gLj3QB_KQmWpenSyfCx6pzSRBcGqPXA&s=10"
    },
    {
      title: "Enchiladas de mole verde",
      tags: ["enchiladas","mole"],
      difficulty: "media",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSa-Jb5r-v_uRo18ARE9GgZ3KIhP0RcF2ILxpIHj7DtPA&s=10"
    },
    {
      title: "Quesadillas placenteras",
      tags: ["antojitos","quesadilla"],
      difficulty: "facil",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcToCtCq9MFhoKX5F4SOCxG474dwzafEwVCh4sU43S0IdA&s=10"
    },
    {
      title: "Carnitas estilo centro",
      tags: ["carnitas","cerdo"],
      difficulty: "media",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTuHdAdhvyHDwq_7c4MwUjXiTekm-PRv9In4rxvt8vk1A&s=10"
    }
  ],
  "oriente": [
    { title: "Huachinango a la veracruzana", tags: ["mariscos","veracruz"], difficulty: "media" },
    { title: "Arroz a la tumbada veracruzana", tags: ["mariscos","arroz"], difficulty: "media" },
    { title: "Pescado a la talla adaptado", tags: ["mariscos","talla"], difficulty: "media" },
    { title: "Tacos de cochinita al estilo golfo", tags: ["cochinita","antojitos"], difficulty: "media" },
    { title: "Tamales de chipilín", tags: ["tamales","regional"], difficulty: "media" },
    { title: "Mole de Xico (versión ligera)", tags: ["mole","regional"], difficulty: "dificil" },
    { title: "Ensalada tropical con aguacate", tags: ["ensaladas","tropical"], difficulty: "facil" },
    { title: "Camarones al mojo de ajo", tags: ["mariscos","camarones"], difficulty: "facil" }
  ],
  "sur": [
    { title: "Mole negro oaxaqueño", tags: ["mole","oaxaca"], difficulty: "dificil" },
    { title: "Tlayudas oaxaqueñas auténticas", tags: ["antojitos","tlayuda"], difficulty: "media" },
    { title: "Tamales de mole oaxaqueño", tags: ["tamales","mole"], difficulty: "media" },
    { title: "Ensalada de hoja santa y queso", tags: ["ensaladas","regional"], difficulty: "facil" },
    { title: "Chapulines con guacamole", tags: ["antojitos","insectos"], difficulty: "media" },
    { title: "Pescado en hoja de plátano", tags: ["mariscos","regional"], difficulty: "media" },
    { title: "Sopa de piedra (versión)", tags: ["sopas","tradicional"], difficulty: "dificil" },
    { title: "Mole verde con pollo", tags: ["mole","pollo"], difficulty: "media" }
  ],
  "sureste": [
    { title: "Cochinita pibil clásica", tags: ["cochinita","pibil"], difficulty: "dificil" },
    { title: "Sopa de lima", tags: ["sopas","yucatán"], difficulty: "facil" },
    { title: "Panuchos y salbutes mixtos", tags: ["antojitos","yucatán"], difficulty: "media" },
    { title: "Pescado tikin-xic", tags: ["mariscos","maya"], difficulty: "media" },
    { title: "Relleno negro (versión sureste)", tags: ["mole","regional"], difficulty: "dificil" },
    { title: "Ensalada de naranja agria", tags: ["ensaladas","citrico"], difficulty: "facil" },
    { title: "Tamales de chaya", tags: ["tamales","regional"], difficulty: "media" },
    { title: "Pollo tikin-xic en hojas", tags: ["pollo","mariscos"], difficulty: "media" }
  ]
};

function buildIngredientNameList(tags = [], title = "", regionSlug = "") {
  const selected = ["Sal", "Aceite vegetal", "Cebolla", "Ajo"];
  const tagSet = new Set((tags || []).map((tag) => normalizeKey(tag)));
  const titleKey = normalizeKey(title);

  if (tagSet.has("mariscos") || titleKey.includes("pescado") || titleKey.includes("ceviche")) {
    selected.push("Pescado blanco");
  }
  if (titleKey.includes("camaron")) {
    selected.push("Camarón");
  }
  if (tagSet.has("mole") || titleKey.includes("mole")) {
    selected.push("Chile ancho", "Chile guajillo");
  }
  if (tagSet.has("cochinita") || titleKey.includes("cerdo") || titleKey.includes("carnitas")) {
    selected.push("Carne de cerdo", "Achiote");
  }
  if (titleKey.includes("res") || tagSet.has("carnes") || titleKey.includes("birria")) {
    selected.push("Carne de res");
  }
  if (tagSet.has("tamales") || tagSet.has("tortilla") || tagSet.has("antojitos")) {
    selected.push("Masa de maíz", "Tortilla de maíz");
  }
  if (titleKey.includes("nopal")) {
    selected.push("Nopal");
  }
  if (titleKey.includes("lima") || titleKey.includes("limon")) {
    selected.push("Limón");
  }
  if (titleKey.includes("hoja") || regionSlug === "sur" || regionSlug === "sureste") {
    selected.push("Hoja de plátano");
  }
  if (titleKey.includes("queso") || titleKey.includes("nogada")) {
    selected.push("Queso fresco", "Crema");
  }

  return Array.from(new Set(selected)).slice(0, 7);
}

function buildLinkedIngredients(tags, title, regionSlug, ingredientMap) {
  const ingredientNames = buildIngredientNameList(tags, title, regionSlug);
  const modern = [];

  for (const name of ingredientNames) {
    const ingredientDoc = ingredientMap.get(normalizeKey(name));
    if (!ingredientDoc) {
      continue;
    }

    modern.push({
      ingredient: ingredientDoc._id,
      ingredientName: ingredientDoc.name || ingredientDoc.nombre,
      quantity: 1,
      unit: ingredientDoc.defaultUnit || ingredientDoc.unidad || "g",
      notes: ""
    });
  }

  const legacy = modern.map((item) => ({
    ingrediente_id: item.ingredient,
    cantidad: item.quantity,
    unidad: item.unit,
    preparacion: ""
  }));

  return { modern, legacy };
}

function buildSimpleSteps(title) {
  return [
    { order: 1, text: `Preparar los ingredientes para ${title}.` },
    { order: 2, text: `Cocinar a fuego medio siguiendo la técnica tradicional.` },
    { order: 3, text: `Ajustar sazón y acompañar al gusto.` }
  ];
}

async function seedRecipes() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/chefslogic";
  console.log("Iniciando seeder de recetas...");
  await mongoose.connect(uri);

  // Asegurar usuario para asignar como autor
  let user = await User.findOne({ $or: [{ email: "seeder@chefslogic.local" }, { correo: "seeder@chefslogic.local" }] });
  if (!user) {
    const passwordHash = await bcrypt.hash("changeme123", 12);
    user = await User.create({
      name: "Seeder User",
      email: "seeder@chefslogic.local",
      passwordHash,
      nombre: "Seeder User",
      correo: "seeder@chefslogic.local",
      password: passwordHash,
      rol: "usuario",
      role: "usuario",
      avatar: "default.png",
      fecha_registro: new Date(),
      permissions: {
        canModerateIngredients: false,
        canDeleteAnyDocument: false,
        canApproveUserContent: false
      }
    });
    console.log("  Usuario seeder creado:", user.email);
  }

  let totalInserted = 0;
  let totalUpdated = 0;

  const ingredientDocs = await Ingredient.find({}, { _id: 1, name: 1, nombre: 1, defaultUnit: 1, unidad: 1 }).lean();
  const ingredientMap = new Map();
  for (const doc of ingredientDocs) {
    const modernName = normalizeKey(doc.name);
    const legacyName = normalizeKey(doc.nombre);
    if (modernName) ingredientMap.set(modernName, doc);
    if (legacyName) ingredientMap.set(legacyName, doc);
  }

  for (const [regionSlug, recipes] of Object.entries(RECIPES_BY_REGION)) {
    const regionDoc = await Region.findOne({ slug: regionSlug });
    if (!regionDoc) {
      console.warn(`  Region no encontrada: ${regionSlug} — se omiten sus recetas.`);
      continue;
    }

    for (const r of recipes) {
      const title = r.title;
      const slug = slugify(title + " " + regionSlug);
      const linkedIngredients = buildLinkedIngredients(r.tags, title, regionSlug, ingredientMap);

      const payload = {
        // Legacy fields
        titulo: title,
        descripcion: r.summary || `${title} — receta representativa de la región ${regionDoc.name}.`,
        dificultad: r.difficulty || "media",
        tiempo_preparacion: (r.prepMinutes || 20) + (r.cookMinutes || 30),
        imagen_principal: r.image || `/uploads/recipes/${slug}.jpg`,
        ingredientes: linkedIngredients.legacy,
        pasos: (r.legacyPasos || ["Preparar ingredientes.", "Cocinar.", "Servir."]),
        etiquetas: r.tags || [],
        vistas: 0,
        likes: 0,
        usuario_id: user._id,
        region_id: regionDoc._id,
        fecha_publicacion: new Date(),

        // Modern fields
        title,
        slug,
        summary: r.summary || `Receta de ${title} de la región ${regionDoc.name}.`,
        region: regionDoc._id,
        difficulty: r.difficulty || "media",
        prepMinutes: r.prepMinutes || 20,
        cookMinutes: r.cookMinutes || 30,
        servings: r.servings || 2,
        imageUrl: r.image || `/uploads/recipes/${slug}.jpg`,
        status: "publicada",
        ingredients: linkedIngredients.modern,
        steps: buildSimpleSteps(title),
        tags: (r.tags || []).map((t) => String(t).toLowerCase()),
        author: user._id,
        likeCount: 0,
        coverStyle: "image",
        fallbackEmoji: r.icon || "🍽️"
      };

      const existing = await Recipe.findOne({ slug: payload.slug });
      if (existing) {
        existing.set(payload);
        await existing.save();
        totalUpdated++;
        console.log(`  ↻ Actualizada: ${payload.title} (${payload.slug})`);
      } else {
        await Recipe.create(payload);
        totalInserted++;
        console.log(`  ✔ Insertada: ${payload.title} (${payload.slug})`);
      }
    }
  }

  console.log(`\nResumen: insertadas=${totalInserted}, actualizadas=${totalUpdated}`);
  await mongoose.disconnect();
  process.exit(0);
}

seedRecipes().catch((err) => {
  console.error("ERROR en recipeSeeder:", err.message || err);
  process.exit(1);
});
