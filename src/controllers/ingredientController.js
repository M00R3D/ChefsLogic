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
const MODERATION_PAGE_SIZE = 25;

const ALL_CATEGORIES = [
  "verdura", "fruta", "proteina", "grano", "especia", "lacteo",
  "aceite", "condimento", "chile", "salsa", "bebida", "conserva", "hongo", "otro"
];

function isAdminUser(user) {
  return String((user && (user.role || user.rol)) || "usuario").toLowerCase() === "admin";
}

function getPublicIngredientsFilter() {
  return {
    approvalStatus: "approved",
    isPublic: true
  };
}

function toObjectIdString(value) {
  return String(value || "").trim();
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderCreateIngredientWithError(res, message, statusCode) {
  return res.status(statusCode || 400).render("ingredients/create", {
    pageTitle: "Chef's Logic | Nuevo ingrediente",
    activeTab: "ingredientes",
    errorMessage: message || "No fue posible crear el ingrediente."
  });
}

function getOwnPendingFilter(user) {
  const userId = toObjectIdString(user && user._id);
  if (!userId) {
    return null;
  }

  return {
    createdBy: userId,
    approvalStatus: "pending"
  };
}

async function renderIngredientsPage(req, res) {
  try {
    const currentUser = res.locals.currentUser;
    const isAdmin = isAdminUser(currentUser);
    const ownPendingFilter = isAdmin ? null : getOwnPendingFilter(currentUser);
    const submitted = String(req.query.submitted || "").trim().toLowerCase();
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const search = String(req.query.q || "").trim();
    const categoryFilter = String(req.query.category || "").trim().toLowerCase();
    const tagFilter = String(req.query.tag || "").trim().toLowerCase();

    const conditions = [getPublicIngredientsFilter()];
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

    const [ingredients, total, allTags, categoryCounts, myPendingIngredients] = await Promise.all([
      Ingredient.find(query).sort({ name: 1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(),
      Ingredient.countDocuments(query),
      Ingredient.distinct("tags"),
      Ingredient.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } }
      ]),
      ownPendingFilter
        ? Ingredient.find(ownPendingFilter).sort({ createdAt: -1 }).limit(30).lean()
        : Promise.resolve([])
    ]);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const catCountMap = {};
    categoryCounts.forEach((c) => { catCountMap[c._id || "otro"] = c.count; });

    return res.render("ingredients/index", {
      pageTitle: "Chef's Logic | Ingredientes",
      activeTab: "ingredientes",
      isAdmin,
      ingredients,
      myPendingIngredients,
      page,
      totalPages,
      total,
      search,
      categoryFilter,
      tagFilter,
      allTags: allTags.filter(Boolean).sort(),
      allCategories: ALL_CATEGORIES,
      catCountMap,
      submitted,
      errorMessage: ""
    });
  } catch (error) {
    return res.status(500).render("ingredients/index", {
      pageTitle: "Chef's Logic | Ingredientes",
      activeTab: "ingredientes",
      isAdmin: isAdminUser(res.locals.currentUser),
      ingredients: [],
      myPendingIngredients: [],
      page: 1,
      totalPages: 1,
      total: 0,
      search: "",
      categoryFilter: "",
      tagFilter: "",
      allTags: [],
      allCategories: ALL_CATEGORIES,
      catCountMap: {},
      submitted: "",
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
    const wantsAll = String(req.query.scope || "").toLowerCase() === "all";
    const canSeeAll = wantsAll && isAdminUser(res.locals.currentUser);
    const query = canSeeAll ? {} : getPublicIngredientsFilter();
    const ingredients = await Ingredient.find(query).sort({ name: 1 });
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

    if (!isAdminUser(res.locals.currentUser)) {
      const isVisible = ingredient.approvalStatus === "approved" && Boolean(ingredient.isPublic);
      if (!isVisible) {
        return sendError(res, new Error("Ingrediente no encontrado."), "Ingrediente no encontrado.", 404);
      }
    }

    return sendSuccess(res, ingredient, "Ingrediente obtenido correctamente.");
  } catch (error) {
    return sendError(res, error, "No fue posible obtener el ingrediente.");
  }
}

async function checkIngredientNameAvailability(req, res) {
  try {
    const rawName = String(req.query.name || "").trim();
    if (!rawName) {
      return sendError(res, new Error("El nombre es obligatorio."), "Debes enviar un nombre de ingrediente.", 400);
    }

    const exactName = new RegExp(`^${escapeRegex(rawName)}$`, "i");
    const exists = await Ingredient.exists({
      $or: [
        { name: exactName },
        { nombre: exactName }
      ]
    });

    return sendSuccess(
      res,
      {
        name: rawName,
        available: !Boolean(exists)
      },
      "Disponibilidad de nombre obtenida correctamente."
    );
  } catch (error) {
    return sendError(res, error, "No fue posible validar la disponibilidad del nombre.");
  }
}

async function createIngredient(req, res) {
  try {
    const currentUser = res.locals.currentUser;
    const isAdmin = isAdminUser(currentUser);
    const currentUserId = currentUser ? toObjectIdString(currentUser._id) : "";
    const { payload, invalidSeasonality } = mapIngredientPayload(req.body);

    if (!payload.name) {
      if (req.accepts("html") && !req.path.startsWith("/api")) {
        return renderCreateIngredientWithError(res, "El nombre del ingrediente es obligatorio.", 400);
      }
      return sendError(res, new Error("El nombre es obligatorio."), "El nombre es obligatorio.", 400);
    }

    if (invalidSeasonality.length > 0) {
      const message = getSeasonalityErrorMessage(invalidSeasonality);
      if (req.accepts("html") && !req.path.startsWith("/api")) {
        return renderCreateIngredientWithError(res, message, 400);
      }
      return sendError(res, new Error(message), message, 400);
    }

    payload.createdBy = currentUserId || null;
    payload.sourceType = isAdmin ? "admin" : "user";
    payload.approvalStatus = isAdmin ? "approved" : "pending";
    payload.isPublic = isAdmin;
    payload.approvedBy = isAdmin ? currentUserId : null;
    payload.approvedAt = isAdmin ? new Date() : null;

    const ingredient = await Ingredient.create(payload);

    if (req.accepts("html") && !req.path.startsWith("/api")) {
      const submitted = isAdmin ? "approved" : "pending";
      return res.redirect(`/ingredients?submitted=${submitted}`);
    }

    const message = isAdmin
      ? "Ingrediente creado y publicado correctamente."
      : "Ingrediente recibido. Queda pendiente de aprobación por un administrador.";
    return sendSuccess(res, ingredient, message, 201);
  } catch (error) {
    if (error && error.code === 11000) {
      if (req.accepts("html") && !req.path.startsWith("/api")) {
        return renderCreateIngredientWithError(res, "Ya existe un ingrediente con ese nombre. Prueba otro nombre.", 409);
      }
      return sendError(res, new Error("Ya existe un ingrediente con ese nombre."), "Ingrediente duplicado.", 409);
    }

    if (req.accepts("html") && !req.path.startsWith("/api")) {
      return renderCreateIngredientWithError(res, "No fue posible crear el ingrediente. Revisa los datos e intenta de nuevo.", 500);
    }

    return sendError(res, error, "No fue posible crear el ingrediente.");
  }
}

async function updateIngredient(req, res) {
  try {
    if (!isAdminUser(res.locals.currentUser)) {
      return sendError(res, new Error("Acceso denegado."), "Solo administradores pueden actualizar ingredientes.", 403);
    }

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
    if (!isAdminUser(res.locals.currentUser)) {
      if (req.accepts("html") && !req.path.startsWith("/api")) {
        return res.status(403).redirect("/ingredients");
      }
      return sendError(res, new Error("Acceso denegado."), "Solo administradores pueden eliminar ingredientes.", 403);
    }

    const deleted = await Ingredient.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return sendError(res, new Error("Ingrediente no encontrado."), "Ingrediente no encontrado.", 404);
    }

    if (req.accepts("html") && !req.path.startsWith("/api")) {
      return res.redirect("/ingredients/moderation");
    }

    return sendSuccess(res, { id: req.params.id }, "Ingrediente eliminado correctamente.");
  } catch (error) {
    return sendError(res, error, "No fue posible eliminar el ingrediente.");
  }
}

async function renderModerationPage(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const statusFilter = String(req.query.status || "pending").toLowerCase();
    const search = String(req.query.q || "").trim();

    const query = {};
    if (["pending", "approved", "rejected"].includes(statusFilter)) {
      query.approvalStatus = statusFilter;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { nombre: { $regex: search, $options: "i" } }
      ];
    }

    const [ingredients, total] = await Promise.all([
      Ingredient.find(query)
        .populate("createdBy", "name nombre email correo")
        .populate("approvedBy", "name nombre")
        .sort({ createdAt: -1 })
        .skip((page - 1) * MODERATION_PAGE_SIZE)
        .limit(MODERATION_PAGE_SIZE)
        .lean(),
      Ingredient.countDocuments(query)
    ]);

    return res.render("ingredients/moderation", {
      pageTitle: "Chef's Logic | Moderación de ingredientes",
      activeTab: "moderacion",
      ingredients,
      statusFilter,
      search,
      page,
      total,
      totalPages: Math.max(1, Math.ceil(total / MODERATION_PAGE_SIZE)),
      errorMessage: ""
    });
  } catch (error) {
    return res.status(500).render("ingredients/moderation", {
      pageTitle: "Chef's Logic | Moderación de ingredientes",
      activeTab: "moderacion",
      ingredients: [],
      statusFilter: "pending",
      search: "",
      page: 1,
      total: 0,
      totalPages: 1,
      errorMessage: "No fue posible cargar la moderación de ingredientes."
    });
  }
}

async function approveIngredient(req, res) {
  try {
    const adminId = toObjectIdString(res.locals.currentUser && res.locals.currentUser._id);
    const updated = await Ingredient.findByIdAndUpdate(
      req.params.id,
      {
        approvalStatus: "approved",
        isPublic: true,
        approvedBy: adminId || null,
        approvedAt: new Date()
      },
      { new: true }
    );

    if (!updated) {
      if (req.accepts("html") && !req.path.startsWith("/api")) {
        return res.redirect("/ingredients/moderation");
      }
      return sendError(res, new Error("Ingrediente no encontrado."), "Ingrediente no encontrado.", 404);
    }

    if (req.accepts("html") && !req.path.startsWith("/api")) {
      return res.redirect("/ingredients/moderation?status=pending");
    }

    return sendSuccess(res, updated, "Ingrediente aprobado correctamente.");
  } catch (error) {
    return sendError(res, error, "No fue posible aprobar el ingrediente.");
  }
}

async function rejectIngredient(req, res) {
  try {
    const adminId = toObjectIdString(res.locals.currentUser && res.locals.currentUser._id);
    const updated = await Ingredient.findByIdAndUpdate(
      req.params.id,
      {
        approvalStatus: "rejected",
        isPublic: false,
        approvedBy: adminId || null,
        approvedAt: new Date()
      },
      { new: true }
    );

    if (!updated) {
      if (req.accepts("html") && !req.path.startsWith("/api")) {
        return res.redirect("/ingredients/moderation");
      }
      return sendError(res, new Error("Ingrediente no encontrado."), "Ingrediente no encontrado.", 404);
    }

    if (req.accepts("html") && !req.path.startsWith("/api")) {
      return res.redirect("/ingredients/moderation?status=pending");
    }

    return sendSuccess(res, updated, "Ingrediente rechazado correctamente.");
  } catch (error) {
    return sendError(res, error, "No fue posible rechazar el ingrediente.");
  }
}

module.exports = {
  renderIngredientsPage,
  renderModerationPage,
  renderCreateIngredientPage,
  getAllIngredients,
  getIngredientById,
  checkIngredientNameAvailability,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  approveIngredient,
  rejectIngredient
};
