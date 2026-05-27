const Ingredient = require("../models/Ingredient");
const { sendSuccess, sendError } = require("../utils/apiResponse");

const VALID_MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre"
];

function parseSeasonality(rawSeasonality) {
  const seasonality = Array.isArray(rawSeasonality)
    ? rawSeasonality.map((item) => String(item).trim().toLowerCase()).filter(Boolean)
    : String(rawSeasonality || "")
        .split(",")
        .map((month) => month.trim().toLowerCase())
        .filter(Boolean);

  const invalidSeasonality = seasonality.filter((month) => !VALID_MONTHS.includes(month));

  return {
    seasonality: seasonality.filter((month) => VALID_MONTHS.includes(month)),
    invalidSeasonality
  };
}

function mapIngredientPayload(body = {}) {
  const { seasonality, invalidSeasonality } = parseSeasonality(body.seasonality);

  const tags = Array.isArray(body.tags)
    ? body.tags
    : String(body.tags || "")
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean);

  const rawName = String(body.name || body.nombre || "").trim();
  const rawCategory = String(body.category || body.categoria || "otro").trim();
  const rawUnit = String(body.defaultUnit || body.unidad || "g").trim();

  return {
    payload: {
      nombre: rawName,
      categoria: rawCategory,
      cantidad: Number(body.cantidad || 1),
      unidad: rawUnit,
      precio_aprox: Number(body.precio_aprox || body.precioAprox || 0),
      accesibilidad: body.accesibilidad || "medio",
      name: rawName,
      category: rawCategory,
      defaultUnit: rawUnit,
      seasonality,
      nutritionalInfo: {
        calories: Number(body.calories || 0),
        protein: Number(body.protein || 0),
        carbs: Number(body.carbs || 0),
        fat: Number(body.fat || 0)
      },
      tags
    },
    invalidSeasonality
  };
}

function getSeasonalityErrorMessage(invalidSeasonality) {
  return `Meses no validos en estacionalidad: ${invalidSeasonality.join(", ")}. Usa meses como: ${VALID_MONTHS.join(", ")}.`;
}

const PAGE_SIZE = 25;

const ALL_CATEGORIES = [
  "verdura", "fruta", "proteina", "grano", "especia", "lacteo",
  "aceite", "condimento", "chile", "salsa", "bebida", "conserva", "hongo", "otro"
];

async function renderIngredientsPage(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const search = String(req.query.q || "").trim();
    const categoryFilter = String(req.query.category || "").trim().toLowerCase();
    const tagFilter = String(req.query.tag || "").trim().toLowerCase();

    const conditions = [];
    if (search) {
      conditions.push({ $or: [
        { name: { $regex: search, $options: "i" } },
        { nombre: { $regex: search, $options: "i" } }
      ]});
    }
    if (categoryFilter && categoryFilter !== "all") {
      conditions.push({ category: categoryFilter });
    }
    if (tagFilter) {
      conditions.push({ tags: tagFilter });
    }
    const query = conditions.length ? { $and: conditions } : {};

    const [ingredients, total, allTags, categoryCounts] = await Promise.all([
      Ingredient.find(query).sort({ name: 1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(),
      Ingredient.countDocuments(query),
      Ingredient.distinct("tags"),
      Ingredient.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } }
      ])
    ]);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const catCountMap = {};
    categoryCounts.forEach((c) => { catCountMap[c._id || "otro"] = c.count; });

    return res.render("ingredients/index", {
      pageTitle: "Chef's Logic | Ingredientes",
      activeTab: "ingredientes",
      ingredients,
      page,
      totalPages,
      total,
      search,
      categoryFilter,
      tagFilter,
      allTags: allTags.filter(Boolean).sort(),
      allCategories: ALL_CATEGORIES,
      catCountMap,
      errorMessage: ""
    });
  } catch (error) {
    return res.status(500).render("ingredients/index", {
      pageTitle: "Chef's Logic | Ingredientes",
      activeTab: "ingredientes",
      ingredients: [],
      page: 1,
      totalPages: 1,
      total: 0,
      search: "",
      categoryFilter: "",
      tagFilter: "",
      allTags: [],
      allCategories: ALL_CATEGORIES,
      catCountMap: {},
      errorMessage: "No fue posible cargar ingredientes."
    });
  }
}

function renderCreateIngredientPage(req, res) {
  return res.render("ingredients/create", {
    pageTitle: "Chef's Logic | Nuevo ingrediente",
    activeTab: "ingredientes",
    errorMessage: ""
  });
}

async function getAllIngredients(req, res) {
  try {
    const ingredients = await Ingredient.find().sort({ name: 1 });
    return sendSuccess(res, ingredients, "Ingredientes obtenidos correctamente.");
  } catch (error) {
    return sendError(res, error, "No fue posible listar ingredientes.");
  }
}

async function getIngredientById(req, res) {
  try {
    const ingredient = await Ingredient.findById(req.params.id);

    if (!ingredient) {
      return sendError(res, new Error("Ingrediente no encontrado."), "Ingrediente no encontrado.", 404);
    }

    return sendSuccess(res, ingredient, "Ingrediente obtenido correctamente.");
  } catch (error) {
    return sendError(res, error, "No fue posible obtener el ingrediente.");
  }
}

async function createIngredient(req, res) {
  try {
    const { payload, invalidSeasonality } = mapIngredientPayload(req.body);

    if (!payload.name) {
      return sendError(res, new Error("El nombre es obligatorio."), "El nombre es obligatorio.", 400);
    }

    if (invalidSeasonality.length > 0) {
      const message = getSeasonalityErrorMessage(invalidSeasonality);
      return sendError(res, new Error(message), message, 400);
    }

    const ingredient = await Ingredient.create(payload);

    if (req.accepts("html") && !req.path.startsWith("/api")) {
      return res.redirect("/ingredients");
    }

    return sendSuccess(res, ingredient, "Ingrediente creado correctamente.", 201);
  } catch (error) {
    if (error && error.code === 11000) {
      return sendError(res, new Error("Ya existe un ingrediente con ese nombre."), "Ingrediente duplicado.", 409);
    }

    return sendError(res, error, "No fue posible crear el ingrediente.");
  }
}

async function updateIngredient(req, res) {
  try {
    const { payload, invalidSeasonality } = mapIngredientPayload(req.body);

    if (invalidSeasonality.length > 0) {
      const message = getSeasonalityErrorMessage(invalidSeasonality);
      return sendError(res, new Error(message), message, 400);
    }

    const updated = await Ingredient.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true
    });

    if (!updated) {
      return sendError(res, new Error("Ingrediente no encontrado."), "Ingrediente no encontrado.", 404);
    }

    return sendSuccess(res, updated, "Ingrediente actualizado correctamente.");
  } catch (error) {
    return sendError(res, error, "No fue posible actualizar el ingrediente.");
  }
}

async function deleteIngredient(req, res) {
  try {
    const deleted = await Ingredient.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return sendError(res, new Error("Ingrediente no encontrado."), "Ingrediente no encontrado.", 404);
    }

    return sendSuccess(res, { id: req.params.id }, "Ingrediente eliminado correctamente.");
  } catch (error) {
    return sendError(res, error, "No fue posible eliminar el ingrediente.");
  }
}

module.exports = {
  renderIngredientsPage,
  renderCreateIngredientPage,
  getAllIngredients,
  getIngredientById,
  createIngredient,
  updateIngredient,
  deleteIngredient
};
