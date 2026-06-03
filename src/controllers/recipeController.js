
const Recipe = require("../models/Recipe");
const Region = require("../models/Region");
const Ingredient = require("../models/Ingredient");
const User = require("../models/User");
const Interaction = require("../models/Interaction");
const Evento = require("../models/Evento");
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

async function recordEvento(payload) {
  try {
    await Evento.create(payload);
  } catch (error) {
    console.error('Evento create failed:', error && error.message ? error.message : error);
  }
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
      const [ingredientName, quantity, unit, notes, ingredientId] = line.split("|").map((part) => part.trim());
      return {
        ingredient: ingredientId || null,
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

function canEditRecipeForUser(user, recipe) {
  if (!user || !recipe) {
    return false;
  }

  var role = String(user.role || user.rol || "usuario").toLowerCase();
  if (role === "admin") {
    return true;
  }

  var userId = String(user._id || user.id || "");
  var ownerId = String(recipe.author || recipe.usuario_id || "");
  return Boolean(userId && ownerId && userId === ownerId);
}

function isAdminUser(user) {
  return String((user && (user.role || user.rol)) || "usuario").toLowerCase() === "admin";
}

function ingredientCatalogQueryForUser(user) {
  if (isAdminUser(user)) {
    return {};
  }

  const userId = toObjectId(user && user._id);
  if (userId) {
    return {
      $or: [
        {
          approvalStatus: "approved",
          isPublic: true
        },
        {
          createdBy: userId,
          approvalStatus: "pending"
        }
      ]
    };
  }

  return {
    approvalStatus: "approved",
    isPublic: true
  };
}

function sanitizeRecipeIngredientsForViewer(recipe, viewer) {
  if (!recipe || isAdminUser(viewer) || !Array.isArray(recipe.ingredients)) {
    return recipe;
  }

  const sanitized = { ...recipe };
  sanitized.ingredients = recipe.ingredients.filter((item) => {
    const linkedIngredient = item && item.ingredient;
    if (!linkedIngredient) {
      return true;
    }

    return String(linkedIngredient.approvalStatus || "approved") !== "rejected";
  });
  return sanitized;
}

function mapModernToLegacyInteractionType(type) {
  const key = String(type || "").toLowerCase();
  const map = {
    like: "like",
    dislike: "dislike",
    save: "favorito",
    comment: "comentario",
    view: "visualizacion"
  };
  return map[key] || key;
}

function buildRecipeInteractionFilter(userId, recipeId, type) {
  const legacyType = mapModernToLegacyInteractionType(type);
  return {
    $or: [
      {
        user: userId,
        recipe: recipeId,
        targetType: "recipe",
        type
      },
      {
        usuario_id: userId,
        receta_id: recipeId,
        tipo: legacyType
      },
      {
        usuario_id: userId,
        receta_id: recipeId,
        tipo: type
      }
    ]
  };
}

function buildRecipeInteractionPayload(userId, recipeId, type, extra = {}) {
  const commentText = String(extra.commentText || "").trim();
  const legacyType = mapModernToLegacyInteractionType(type);

  return {
    // Legacy
    tipo: legacyType,
    fecha: new Date(),
    dispositivo: "web",
    comentario: commentText,
    usuario_id: userId,
    receta_id: recipeId,
    // Modern
    user: userId,
    recipe: recipeId,
    type,
    targetType: "recipe",
    value: Number(extra.value || 1),
    commentText,
    metadata: extra.metadata || {}
  };
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
    author: resolvedUserId,
    accentColor: String(body.accentColor || "").replace(/[^#a-zA-Z0-9]/g, "").slice(0, 20),
    fallbackEmoji: String(body.fallbackEmoji || "").trim().slice(0, 8),
    coverStyle: ["image", "gradient", "symbol", "plain"].includes(body.coverStyle) ? body.coverStyle : "plain"
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
    const currentUser = res.locals.currentUser;
    const currentUserId = currentUser ? String(currentUser._id) : null;

    const allRecipes = await Recipe.find()
      .populate("region", "name")
      .populate("author", "name nombre")
      .populate("usuario_id", "name nombre")
      .sort({ createdAt: -1 })
      .lean();

    if (req.query && String(req.query.q || '').trim()) {
      await recordEvento({
        usuario_id: req.session && req.session.userId ? toObjectId(req.session.userId) : null,
        tipo: 'buscar_receta',
        dispositivo: 'web'
      });
    }

    const myRecipes = currentUserId
      ? allRecipes.filter((r) => String(r.author || r.usuario_id || "") === currentUserId)
      : [];

    const otherRecipes = currentUserId
      ? allRecipes.filter((r) => String(r.author || r.usuario_id || "") !== currentUserId)
      : allRecipes;

    let savedRecipes = [];
    if (currentUser) {
      const userFull = await User.findById(currentUser._id)
        .select("savedRecipes")
        .populate({
          path: "savedRecipes",
          populate: [
            { path: "region", select: "name" },
            { path: "author", select: "name nombre" },
            { path: "usuario_id", select: "name nombre" }
          ]
        })
        .lean();
      savedRecipes = (userFull && Array.isArray(userFull.savedRecipes) ? userFull.savedRecipes : [])
        .filter(Boolean);
    }

    // Set on res.locals so EJS can access them directly in the template
    res.locals.myRecipes    = myRecipes;
    res.locals.otherRecipes = otherRecipes;
    res.locals.savedRecipes = savedRecipes;

    return res.render("recipes/index", {
      pageTitle: "Chef's Logic | Recetas",
      activeTab: "recetas",
      errorMessage: ""
    });
  } catch (error) {
    console.error("renderRecipesPage error:", error);
    res.locals.myRecipes    = [];
    res.locals.otherRecipes = [];
    res.locals.savedRecipes = [];
    return res.status(500).render("recipes/index", {
      pageTitle: "Chef's Logic | Recetas",
      activeTab: "recetas",
      errorMessage: "No fue posible cargar las recetas."
    });
  }
}

async function renderRecipeDetail(req, res) {
  try {
    const requestedRecipeId = toObjectId(req.params.id);

    const [recipe, comments] = await Promise.all([
      Recipe.findById(req.params.id)
        .populate("region", "name")
        .populate("author", "name nombre")
        .populate("usuario_id", "name nombre")
        .populate("ingredients.ingredient", "name category categoria approvalStatus isPublic")
        .lean(),
      Interaction.find({
        $or: [
          {
            recipe: requestedRecipeId || req.params.id,
            targetType: "recipe",
            type: "comment"
          },
          {
            receta_id: requestedRecipeId || req.params.id,
            tipo: "comentario"
          },
          {
            receta_id: requestedRecipeId || req.params.id,
            tipo: "comment"
          }
        ]
      })
        .populate("user", "name nombre")
        .populate("usuario_id", "name nombre")
        .sort({ createdAt: -1 })
        .lean()
    ]);

    let userHasLiked = false;
    let userHasSaved = false;

    if (req.session && req.session.userId && recipe) {
      const currentUser = await User.findById(req.session.userId)
        .select("likedRecipes savedRecipes")
        .lean();

      if (currentUser) {
        const recipeIdText = String(recipe._id);
        userHasLiked = (currentUser.likedRecipes || []).some((id) => String(id) === recipeIdText);
        userHasSaved = (currentUser.savedRecipes || []).some((id) => String(id) === recipeIdText);
      }
    }

    if (!recipe) {
      return res.status(404).render("recipes/show", {
        pageTitle: "Chef's Logic | Receta no encontrada",
        activeTab: "recetas",
        recipe: null,
        comments: [],
        userHasLiked: false,
        userHasSaved: false,
        errorMessage: "La receta no existe."
      });
    }

    const safeRecipe = sanitizeRecipeIngredientsForViewer(recipe, res.locals.currentUser);

    await recordEvento({
      usuario_id: req.session && req.session.userId ? toObjectId(req.session.userId) : null,
      receta_id: recipe._id,
      tipo: 'ver_receta',
      dispositivo: 'web'
    });

    return res.render("recipes/show", {
      pageTitle: `Chef's Logic | ${recipe.title}`,
      activeTab: "recetas",
      recipe: safeRecipe,
      comments: (comments || []).map((entry) => {
        const resolvedUser = entry.user || entry.usuario_id || null;
        return {
          ...entry,
          commentText: entry.commentText || entry.comentario || "",
          createdAt: entry.createdAt || entry.fecha || new Date().toISOString(),
          user: resolvedUser
            ? {
                _id: resolvedUser._id,
                name: resolvedUser.name || resolvedUser.nombre || "Usuario"
              }
            : { name: "Usuario" }
        };
      }),
      userHasLiked,
      userHasSaved,
      canEdit: canEditRecipeForUser(res.locals.currentUser, recipe),
      errorMessage: ""
    });
  } catch (error) {
    return res.status(500).render("recipes/show", {
      pageTitle: "Chef's Logic | Error",
      activeTab: "recetas",
      recipe: null,
      comments: [],
      userHasLiked: false,
      userHasSaved: false,
      canEdit: false,
      errorMessage: "No fue posible cargar la receta."
    });
  }
}

async function renderCreateRecipePage(req, res) {
  try {
    const [regions, allIngredients] = await Promise.all([
      Region.find().sort({ name: 1 }).lean(),
      Ingredient.find(ingredientCatalogQueryForUser(res.locals.currentUser)).sort({ name: 1 }).lean()
    ]);

    return res.render("recipes/create", {
      pageTitle: "Chef's Logic | Nueva receta",
      activeTab: "recetas",
      regions,
      allIngredients,
      recipe: null,
      errorMessage: ""
    });
  } catch (error) {
    return res.status(500).render("recipes/create", {
      pageTitle: "Chef's Logic | Nueva receta",
      activeTab: "recetas",
      regions: [],
      allIngredients: [],
      recipe: null,
      errorMessage: "No fue posible abrir el formulario."
    });
  }
}

async function checkRecipeSlugAvailability(req, res) {
  try {
    const requested = String(req.query.slug || req.query.title || "");
    const normalizedSlug = slugify(requested);

    if (!normalizedSlug) {
      return sendError(res, new Error("Slug invalido."), "Debes enviar un slug o titulo valido.", 400);
    }

    const exists = await Recipe.exists({ slug: normalizedSlug });

    return sendSuccess(
      res,
      {
        slug: normalizedSlug,
        available: !Boolean(exists)
      },
      "Disponibilidad de slug obtenida correctamente."
    );
  } catch (error) {
    return sendError(res, error, "No fue posible verificar la disponibilidad del slug.");
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

    if (!canEditRecipeForUser(res.locals.currentUser, recipe)) {
      return res.status(403).render("recipes/edit", {
        pageTitle: "Chef's Logic | Editar receta",
        activeTab: "recetas",
        regions,
        recipe: null,
        errorMessage: "No tienes permiso para editar esta receta."
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
      .populate("ingredients.ingredient", "name approvalStatus isPublic");

    if (!recipe) {
      return sendError(res, new Error("Receta no encontrada."), "Receta no encontrada.", 404);
    }

    const safeRecipe = sanitizeRecipeIngredientsForViewer(
      recipe && typeof recipe.toObject === "function" ? recipe.toObject() : recipe,
      res.locals.currentUser
    );

    return sendSuccess(res, safeRecipe, "Receta obtenida correctamente.");
  } catch (error) {
    return sendError(res, error, "No fue posible obtener la receta.");
  }
}

async function createRecipe(req, res) {
  try {
    if (req.session && req.session.userId) {
      req.body.userId = req.session.userId;
      req.body.usuario_id = req.session.userId;
    }

    const { payload, hasUser } = await mapRecipePayload(req.body);

    if (!payload.title) {
      if (req.accepts("html") && !req.path.startsWith("/api")) {
        const [regions, allIngredients] = await Promise.all([
          Region.find().sort({ name: 1 }).lean(),
          Ingredient.find(ingredientCatalogQueryForUser(res.locals.currentUser)).sort({ name: 1 }).lean()
        ]);
        return res.status(400).render("recipes/create", {
          pageTitle: "Chef's Logic | Nueva receta",
          activeTab: "recetas",
          regions,
          allIngredients,
          recipe: null,
          errorMessage: "El titulo es obligatorio."
        });
      }

      return sendError(res, new Error("El titulo es obligatorio."), "El titulo es obligatorio.", 400);
    }

    if (!hasUser) {
      if (req.accepts("html") && !req.path.startsWith("/api")) {
        const [regions, allIngredients] = await Promise.all([
          Region.find().sort({ name: 1 }).lean(),
          Ingredient.find(ingredientCatalogQueryForUser(res.locals.currentUser)).sort({ name: 1 }).lean()
        ]);
        return res.status(400).render("recipes/create", {
          pageTitle: "Chef's Logic | Nueva receta",
          activeTab: "recetas",
          regions,
          allIngredients,
          recipe: null,
          errorMessage: "No fue posible identificar el usuario que crea la receta."
        });
      }

      return sendError(
        res,
        new Error("No hay usuario disponible para usuario_id."),
        "Necesitas enviar usuario_id o tener al menos un usuario en la coleccion usuarios.",
        400
      );
    }

    const createdRecipe = await Recipe.create(payload);
    await recordEvento({
      usuario_id: req.session && req.session.userId ? toObjectId(req.session.userId) : null,
      receta_id: createdRecipe._id,
      tipo: 'crear_receta',
      dispositivo: 'web'
    });

    if (req.accepts("html") && !req.path.startsWith("/api")) {
      return res.redirect(`/recipes/${createdRecipe._id}`);
    }

    return sendSuccess(res, createdRecipe, "Receta creada correctamente.", 201);
  } catch (error) {
    if (req.accepts("html") && !req.path.startsWith("/api")) {
      const [regions, allIngredients] = await Promise.all([
        Region.find().sort({ name: 1 }).lean(),
        Ingredient.find(ingredientCatalogQueryForUser(res.locals.currentUser)).sort({ name: 1 }).lean()
      ]);

      const errorMessage = (error && error.code === 11000)
        ? "Ya existe una receta con ese slug. Cambia el titulo o ajusta el slug."
        : "No fue posible crear la receta. Revisa los datos e intenta de nuevo.";

      return res.status((error && error.code === 11000) ? 409 : 500).render("recipes/create", {
        pageTitle: "Chef's Logic | Nueva receta",
        activeTab: "recetas",
        regions,
        allIngredients,
        recipe: null,
        errorMessage
      });
    }

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

    if (!canEditRecipeForUser(res.locals.currentUser, existingRecipe)) {
      if (req.accepts("html") && !req.path.startsWith("/api")) {
        const regions = await Region.find().sort({ name: 1 }).lean();
        return res.status(403).render("recipes/edit", {
          pageTitle: "Chef's Logic | Editar receta",
          activeTab: "recetas",
          regions,
          recipe: null,
          errorMessage: "No tienes permiso para editar esta receta."
        });
      }
      return sendError(res, new Error("Acceso denegado."), "No tienes permiso para editar esta receta.", 403);
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
    if (!isAdminUser(res.locals.currentUser)) {
      return sendError(res, new Error("Acceso denegado."), "Solo administradores pueden eliminar recetas.", 403);
    }

    const existingRecipe = await Recipe.findById(req.params.id).lean();

    if (!existingRecipe) {
      return sendError(res, new Error("Receta no encontrada."), "Receta no encontrada.", 404);
    }

    const deletedRecipe = await Recipe.findByIdAndDelete(req.params.id);

    if (!deletedRecipe) {
      return sendError(res, new Error("Receta no encontrada."), "Receta no encontrada.", 404);
    }

    return sendSuccess(res, { id: req.params.id }, "Receta eliminada correctamente.");
  } catch (error) {
    return sendError(res, error, "No fue posible eliminar la receta.");
  }
}

async function likeRecipe(req, res) {
  try {
    const recipeId = toObjectId(req.params.id);
    const userId = toObjectId(req.session && req.session.userId);

    if (!recipeId || !userId) {
      return sendError(res, new Error("Solicitud invalida."), "Solicitud invalida.", 400);
    }

    const [recipe, user] = await Promise.all([
      Recipe.findById(recipeId),
      User.findById(userId).select("likedRecipes")
    ]);

    if (!recipe) {
      return sendError(res, new Error("Receta no encontrada."), "Receta no encontrada.", 404);
    }

    if (!user) {
      return sendError(res, new Error("Usuario no encontrado."), "Usuario no encontrado.", 404);
    }

    user.likedRecipes = Array.isArray(user.likedRecipes) ? user.likedRecipes : [];
    const wasLiked = user.likedRecipes.some((id) => String(id) === String(recipeId));

    if (wasLiked) {
      user.likedRecipes = user.likedRecipes.filter((id) => String(id) !== String(recipeId));
      await Interaction.deleteMany(buildRecipeInteractionFilter(userId, recipeId, "like"));
    } else {
      user.likedRecipes.push(recipeId);
      await Interaction.create(buildRecipeInteractionPayload(userId, recipeId, "like", { value: 1 }));
      await recordEvento({
        usuario_id: userId,
        receta_id: recipeId,
        tipo: 'like',
        dispositivo: 'web'
      });
    }

    await user.save();

    const likeCount = await User.countDocuments({ likedRecipes: recipeId });

    recipe.likeCount = likeCount;
    recipe.likes = likeCount;
    await recipe.save();

    return sendSuccess(
      res,
      { liked: !wasLiked, likeCount },
      !wasLiked ? "Receta marcada con like." : "Like removido correctamente."
    );
  } catch (error) {
    console.error("Like interaction error:", error);
    return sendError(res, error, "No fue posible registrar el like.");
  }
}

async function dislikeRecipe(req, res) {
  try {
    const recipeId = toObjectId(req.params.id);
    const userId = toObjectId(req.session && req.session.userId);

    if (!recipeId || !userId) {
      return sendError(res, new Error("Solicitud invalida."), "Solicitud invalida.", 400);
    }

    const [recipe, user] = await Promise.all([
      Recipe.findById(recipeId),
      User.findById(userId).select("likedRecipes")
    ]);

    if (!recipe) {
      return sendError(res, new Error("Receta no encontrada."), "Receta no encontrada.", 404);
    }

    if (!user) {
      return sendError(res, new Error("Usuario no encontrado."), "Usuario no encontrado.", 404);
    }

    user.likedRecipes = Array.isArray(user.likedRecipes) ? user.likedRecipes : [];
    user.likedRecipes = user.likedRecipes.filter((id) => String(id) !== String(recipeId));
    await user.save();
    await Interaction.deleteMany(buildRecipeInteractionFilter(userId, recipeId, "like"));

    const likeCount = await User.countDocuments({ likedRecipes: recipeId });
    recipe.likeCount = likeCount;
    recipe.likes = likeCount;
    await recipe.save();

    return sendSuccess(res, { liked: false, likeCount }, "Dislike aplicado. Like removido.");
  } catch (error) {
    console.error("Dislike interaction error:", error);
    return sendError(res, error, "No fue posible aplicar dislike.");
  }
}

async function saveRecipe(req, res) {
  try {
    const recipeId = toObjectId(req.params.id);
    const userId = toObjectId(req.session && req.session.userId);

    if (!recipeId || !userId) {
      return sendError(res, new Error("Solicitud invalida."), "Solicitud invalida.", 400);
    }

    const [recipe, user] = await Promise.all([
      Recipe.findById(recipeId).select("_id"),
      User.findById(userId).select("savedRecipes")
    ]);

    if (!recipe) {
      return sendError(res, new Error("Receta no encontrada."), "Receta no encontrada.", 404);
    }

    if (!user) {
      return sendError(res, new Error("Usuario no encontrado."), "Usuario no encontrado.", 404);
    }

    user.savedRecipes = Array.isArray(user.savedRecipes) ? user.savedRecipes : [];
    const wasSaved = user.savedRecipes.some((id) => String(id) === String(recipeId));

    if (wasSaved) {
      user.savedRecipes = user.savedRecipes.filter((id) => String(id) !== String(recipeId));
      await Interaction.deleteMany(buildRecipeInteractionFilter(userId, recipeId, "save"));
    } else {
      user.savedRecipes.push(recipeId);
      await Interaction.create(buildRecipeInteractionPayload(userId, recipeId, "save", { value: 1 }));
      await recordEvento({
        usuario_id: userId,
        receta_id: recipeId,
        tipo: 'guardar_receta',
        dispositivo: 'web'
      });
    }

    await user.save();

    return sendSuccess(
      res,
      { saved: !wasSaved },
      !wasSaved ? "Receta guardada correctamente." : "Receta removida de guardados."
    );
  } catch (error) {
    console.error("Save interaction error:", error);
    return sendError(res, error, "No fue posible guardar la receta.");
  }
}

async function addComment(req, res) {
  try {
    const recipeId = toObjectId(req.params.id);
    const userId = toObjectId(req.session && req.session.userId);
    const commentText = String(req.body.commentText || req.body.comment || req.body.text || "").trim();

    if (!recipeId || !userId) {
      return sendError(res, new Error("Solicitud invalida."), "Solicitud invalida.", 400);
    }

    if (!commentText) {
      return sendError(res, new Error("El comentario no puede estar vacio."), "Escribe un comentario.", 400);
    }

    const recipe = await Recipe.findById(recipeId).select("_id title");
    if (!recipe) {
      return sendError(res, new Error("Receta no encontrada."), "Receta no encontrada.", 404);
    }

    const interaction = await Interaction.create(
      buildRecipeInteractionPayload(userId, recipeId, "comment", {
        commentText,
        value: 1
      })
    );

    const populated = await Interaction.findById(interaction._id)
      .populate("user", "name nombre")
      .populate("usuario_id", "name nombre")
      .lean();

    const resolvedUser = populated && (populated.user || populated.usuario_id);

    const normalized = {
      ...populated,
      commentText: (populated && (populated.commentText || populated.comentario)) || commentText,
      createdAt: (populated && (populated.createdAt || populated.fecha)) || new Date().toISOString(),
      user: resolvedUser
        ? {
            _id: resolvedUser._id,
            name: resolvedUser.name || resolvedUser.nombre || "Usuario"
          }
        : { name: "Usuario" }
    };

    return sendSuccess(res, normalized, "Comentario publicado.", 201);
  } catch (error) {
    console.error("Comment interaction error:", error);
    return sendError(res, error, "No fue posible publicar el comentario.");
  }
}

module.exports = {
  renderRecipesPage,
  renderRecipeDetail,
  renderCreateRecipePage,
  checkRecipeSlugAvailability,
  renderEditRecipePage,
  getAllRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  likeRecipe,
  dislikeRecipe,
  saveRecipe,
  addComment
};
