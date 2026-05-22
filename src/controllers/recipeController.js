const Recipe = require("../models/Recipe");
const Region = require("../models/Region");
const User = require("../models/User");
const mongoose = require("mongoose");
const { sendSuccess, sendError } = require("../utils/apiResponse");

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function parseTags(tagsInput) {
  if (Array.isArray(tagsInput)) {
    return tagsInput.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean);
  }

  if (typeof tagsInput !== "string") {
    return [];
  }

  return tagsInput
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}

function parseIngredients(input) {
  if (Array.isArray(input)) {
    return input
      .map((item) => ({
        ingredient: item.ingredient || null,
        ingredientName: String(item.ingredientName || "").trim(),
        quantity: Number(item.quantity || 0),
        unit: String(item.unit || "").trim(),
        notes: String(item.notes || "").trim()
      }))
      .filter((item) => item.ingredient || item.ingredientName);
  }

  if (typeof input !== "string") {
    return [];
  }

  return input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [ingredientName, quantity, unit, notes] = line.split("|").map((part) => part.trim());
      return {
        ingredientName: ingredientName || "",
        quantity: Number(quantity || 0),
        unit: unit || "",
        notes: notes || ""
      };
    })
    .filter((item) => item.ingredientName);
}

function parseSteps(input) {
  if (Array.isArray(input)) {
    return input
      .map((step, index) => ({
        order: Number(step.order || index + 1),
        text: String(step.text || "").trim(),
        tip: String(step.tip || "").trim()
      }))
      .filter((step) => step.text);
  }

  if (typeof input !== "string") {
    return [];
  }

  return input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text, index) => ({
      order: index + 1,
      text,
      tip: ""
    }));
}

function toObjectId(value) {
  if (!value) {
    return null;
  }

  const normalized = String(value).trim();
  if (!mongoose.Types.ObjectId.isValid(normalized)) {
    return null;
  }

  return new mongoose.Types.ObjectId(normalized);
}

async function resolveUserId(body = {}, fallbackUserId = null) {
  const fromBody = toObjectId(body.usuario_id || body.userId || body.user || body.author);
  if (fromBody) {
    return fromBody;
  }

  const fromFallback = toObjectId(fallbackUserId);
  if (fromFallback) {
    return fromFallback;
  }

  const firstUser = await User.findOne().select("_id").lean();
  return firstUser ? firstUser._id : null;
}

function mapLegacyIngredients(ingredients = []) {
  return ingredients
    .map((item) => ({
      ingrediente_id: toObjectId(item.ingredient || item.ingrediente_id),
      cantidad: Number(item.quantity || item.cantidad || 0),
      unidad: String(item.unit || item.unidad || "").trim()
    }))
    .filter((item) => item.ingrediente_id);
}

function mapLegacySteps(steps = []) {
  return steps
    .map((step) => String(step.text || step.descripcion || "").trim())
    .filter(Boolean);
}

async function mapRecipePayload(body = {}, fallbackRecipe = null) {
  const title = String(body.title || body.titulo || "").trim();
  const summary = String(body.summary || body.descripcion || "").trim();
  const difficulty = body.difficulty || body.dificultad || "media";
  const prepMinutes = Number(body.prepMinutes || body.tiempo_preparacion || 0);
  const cookMinutes = Number(body.cookMinutes || 0);
  const tags = parseTags(body.tags || body.etiquetas);
  const ingredients = parseIngredients(body.ingredients || body.ingredientsData || body.ingredientes);
  const steps = parseSteps(body.steps || body.stepsData || body.pasos);
  const resolvedUserId = await resolveUserId(body, fallbackRecipe && fallbackRecipe.usuario_id);
  const legacyRegionId = toObjectId(body.region_id || body.region);

  const payload = {
    titulo: title,
    descripcion: summary,
    dificultad: difficulty,
    tiempo_preparacion: prepMinutes,
    imagen_principal: String(body.imageUrl || body.imagen_principal || "").trim(),
    ingredientes: mapLegacyIngredients(ingredients),
    pasos: mapLegacySteps(steps),
    etiquetas: tags,
    vistas: Number(body.vistas || 0),
    likes: Number(body.likes || 0),
    usuario_id: resolvedUserId,
    fecha_publicacion: body.fecha_publicacion
      ? new Date(body.fecha_publicacion)
      : fallbackRecipe && fallbackRecipe.fecha_publicacion
        ? fallbackRecipe.fecha_publicacion
        : new Date(),
    title,
    slug: slugify(body.slug || title),
    summary,
    region: body.region || null,
    difficulty,
    prepMinutes,
    cookMinutes,
    servings: Number(body.servings || 1),
    imageUrl: String(body.imageUrl || body.imagen_principal || "").trim(),
    status: body.status || "borrador",
    tags,
    ingredients,
    steps,
    author: resolvedUserId
  };

  if (legacyRegionId) {
    payload.region_id = legacyRegionId;
  }

  return {
    payload,
    hasUser: Boolean(resolvedUserId)
  };
}

async function renderRecipesPage(req, res) {
  try {
    const recipes = await Recipe.find().populate("region", "name").sort({ createdAt: -1 }).lean();

    return res.render("recipes/index", {
      pageTitle: "Chef's Logic | Recetas",
      activeTab: "recetas",
      recipes,
      errorMessage: ""
    });
  } catch (error) {
    return res.status(500).render("recipes/index", {
      pageTitle: "Chef's Logic | Recetas",
      activeTab: "recetas",
      recipes: [],
      errorMessage: "No fue posible cargar las recetas."
    });
  }
}

async function renderRecipeDetail(req, res) {
  try {
    const recipe = await Recipe.findById(req.params.id)
      .populate("region", "name")
      .populate("ingredients.ingredient", "name")
      .lean();

    if (!recipe) {
      return res.status(404).render("recipes/show", {
        pageTitle: "Chef's Logic | Receta no encontrada",
        activeTab: "recetas",
        recipe: null,
        errorMessage: "La receta no existe."
      });
    }

    return res.render("recipes/show", {
      pageTitle: `Chef's Logic | ${recipe.title}`,
      activeTab: "recetas",
      recipe,
      errorMessage: ""
    });
  } catch (error) {
    return res.status(500).render("recipes/show", {
      pageTitle: "Chef's Logic | Error",
      activeTab: "recetas",
      recipe: null,
      errorMessage: "No fue posible cargar la receta."
    });
  }
}

async function renderCreateRecipePage(req, res) {
  try {
    const regions = await Region.find().sort({ name: 1 }).lean();

    return res.render("recipes/create", {
      pageTitle: "Chef's Logic | Nueva receta",
      activeTab: "recetas",
      regions,
      recipe: null,
      errorMessage: ""
    });
  } catch (error) {
    return res.status(500).render("recipes/create", {
      pageTitle: "Chef's Logic | Nueva receta",
      activeTab: "recetas",
      regions: [],
      recipe: null,
      errorMessage: "No fue posible abrir el formulario."
    });
  }
}

async function renderEditRecipePage(req, res) {
  try {
    const [recipe, regions] = await Promise.all([
      Recipe.findById(req.params.id).lean(),
      Region.find().sort({ name: 1 }).lean()
    ]);

    if (!recipe) {
      return res.status(404).render("recipes/edit", {
        pageTitle: "Chef's Logic | Editar receta",
        activeTab: "recetas",
        regions,
        recipe: null,
        errorMessage: "La receta no existe."
      });
    }

    return res.render("recipes/edit", {
      pageTitle: `Chef's Logic | Editar ${recipe.title}`,
      activeTab: "recetas",
      regions,
      recipe,
      errorMessage: ""
    });
  } catch (error) {
    return res.status(500).render("recipes/edit", {
      pageTitle: "Chef's Logic | Editar receta",
      activeTab: "recetas",
      regions: [],
      recipe: null,
      errorMessage: "No fue posible cargar la receta."
    });
  }
}

async function getAllRecipes(req, res) {
  try {
    const recipes = await Recipe.find().populate("region", "name").sort({ createdAt: -1 });
    return sendSuccess(res, recipes, "Recetas obtenidas correctamente.");
  } catch (error) {
    return sendError(res, error, "No fue posible listar recetas.");
  }
}

async function getRecipeById(req, res) {
  try {
    const recipe = await Recipe.findById(req.params.id)
      .populate("region", "name")
      .populate("ingredients.ingredient", "name");

    if (!recipe) {
      return sendError(res, new Error("Receta no encontrada."), "Receta no encontrada.", 404);
    }

    return sendSuccess(res, recipe, "Receta obtenida correctamente.");
  } catch (error) {
    return sendError(res, error, "No fue posible obtener la receta.");
  }
}

async function createRecipe(req, res) {
  try {
    const { payload, hasUser } = await mapRecipePayload(req.body);

    if (!payload.title) {
      return sendError(res, new Error("El titulo es obligatorio."), "El titulo es obligatorio.", 400);
    }

    if (!hasUser) {
      return sendError(
        res,
        new Error("No hay usuario disponible para usuario_id."),
        "Necesitas enviar usuario_id o tener al menos un usuario en la coleccion usuarios.",
        400
      );
    }

    const createdRecipe = await Recipe.create(payload);

    if (req.accepts("html") && !req.path.startsWith("/api")) {
      return res.redirect(`/recipes/${createdRecipe._id}`);
    }

    return sendSuccess(res, createdRecipe, "Receta creada correctamente.", 201);
  } catch (error) {
    if (error && error.code === 11000) {
      return sendError(res, new Error("Ya existe una receta con ese slug."), "Slug duplicado.", 409);
    }

    return sendError(res, error, "No fue posible crear la receta.");
  }
}

async function updateRecipe(req, res) {
  try {
    const existingRecipe = await Recipe.findById(req.params.id).lean();

    if (!existingRecipe) {
      return sendError(res, new Error("Receta no encontrada."), "Receta no encontrada.", 404);
    }

    const { payload, hasUser } = await mapRecipePayload(req.body, existingRecipe);

    if (!hasUser) {
      return sendError(
        res,
        new Error("No hay usuario disponible para usuario_id."),
        "Necesitas enviar usuario_id o tener al menos un usuario en la coleccion usuarios.",
        400
      );
    }

    const updatedRecipe = await Recipe.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true
    });

    if (req.accepts("html") && !req.path.startsWith("/api")) {
      return res.redirect(`/recipes/${updatedRecipe._id}`);
    }

    return sendSuccess(res, updatedRecipe, "Receta actualizada correctamente.");
  } catch (error) {
    return sendError(res, error, "No fue posible actualizar la receta.");
  }
}

async function deleteRecipe(req, res) {
  try {
    const deletedRecipe = await Recipe.findByIdAndDelete(req.params.id);

    if (!deletedRecipe) {
      return sendError(res, new Error("Receta no encontrada."), "Receta no encontrada.", 404);
    }

    return sendSuccess(res, { id: req.params.id }, "Receta eliminada correctamente.");
  } catch (error) {
    return sendError(res, error, "No fue posible eliminar la receta.");
  }
}

module.exports = {
  renderRecipesPage,
  renderRecipeDetail,
  renderCreateRecipePage,
  renderEditRecipePage,
  getAllRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe
};
