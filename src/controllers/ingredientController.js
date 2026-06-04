const Ingredient = require("../models/Ingredient");
const Interaction = require('../models/Interaction');
const Evento = require('../models/Evento');
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

function canManageIngredient(user, ingredient) {
  if (!user || !ingredient) {
    return false;
  }

  if (isAdminUser(user)) {
    return true;
  }

  const userId = toObjectIdString(user._id || user.id);
  const ownerId = toObjectIdString(
    (ingredient.createdBy && ingredient.createdBy._id) ||
    ingredient.createdBy
  );

  return Boolean(userId && ownerId && userId === ownerId);
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
    ingredient: null,
    formAction: "/ingredients",
    submitLabel: "Guardar ingrediente",
    isEditMode: false,
    errorMessage: message || "No fue posible crear el ingrediente."
  });
}

function renderIngredientForm(res, options = {}) {
  const ingredient = options.ingredient || null;
  const isEditMode = Boolean(options.isEditMode);
  const heading = isEditMode ? "Editar ingrediente" : "Nuevo ingrediente";

  return res.status(options.statusCode || 200).render("ingredients/create", {
    pageTitle: options.pageTitle || `Chef's Logic | ${heading}`,
    activeTab: "ingredientes",
    ingredient,
    formAction: options.formAction || (ingredient ? `/ingredients/${ingredient._id}` : "/ingredients"),
    submitLabel: options.submitLabel || (isEditMode ? "Guardar cambios" : "Guardar ingrediente"),
    isEditMode,
    errorMessage: options.errorMessage || ""
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
      // record a search event so admin dashboard counts searches across resources
      Evento.create({
        tipo: 'buscar_receta',
        usuario_id: req.session && req.session.userId ? req.session.userId : null,
        fecha: new Date(),
        dispositivo: 'web'
      }).catch(() => {});
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
  return renderIngredientForm(res, {
    ingredient: null,
    isEditMode: false,
    errorMessage: ""
  });
}

async function renderEditIngredientPage(req, res) {
  try {
    const ingredient = await Ingredient.findById(req.params.id).lean();

    if (!ingredient) {
      return renderIngredientForm(res, {
        statusCode: 404,
        ingredient: null,
        isEditMode: true,
        errorMessage: "Ingrediente no encontrado."
      });
    }

    if (!canManageIngredient(res.locals.currentUser, ingredient)) {
      return renderIngredientForm(res, {
        statusCode: 403,
        ingredient,
        isEditMode: true,
        errorMessage: "No tienes permiso para editar este ingrediente."
      });
    }

    return renderIngredientForm(res, {
      ingredient,
      isEditMode: true,
      errorMessage: ""
    });
  } catch (error) {
    return renderIngredientForm(res, {
      statusCode: 500,
      ingredient: null,
      isEditMode: true,
      errorMessage: "No fue posible cargar el formulario de edición."
    });
  }
}

async function renderIngredientDetailPage(req, res) {
  try {
    const ingredient = await Ingredient.findById(req.params.id).lean();

    if (!ingredient) {
      return res.status(404).render("ingredients/show", {
        pageTitle: "Chef's Logic | Ingrediente",
        activeTab: "ingredientes",
        ingredient: null,
        errorMessage: "Ingrediente no encontrado."
      });
    }

    const canManage = canManageIngredient(res.locals.currentUser, ingredient);

    if (!isAdminUser(res.locals.currentUser) && !canManage) {
      const isVisible = ingredient.approvalStatus === "approved" && Boolean(ingredient.isPublic);
      if (!isVisible) {
        return res.status(404).render("ingredients/show", {
          pageTitle: "Chef's Logic | Ingrediente",
          activeTab: "ingredientes",
          ingredient: null,
          errorMessage: "Ingrediente no encontrado."
        });
      }
    }

    return res.render("ingredients/show", {
      pageTitle: `Chef's Logic | ${ingredient.name || ingredient.nombre || "Ingrediente"}`,
      activeTab: "ingredientes",
      ingredient,
      canManage,
      errorMessage: ""
    });
  } catch (error) {
    return res.status(500).render("ingredients/show", {
      pageTitle: "Chef's Logic | Ingrediente",
      activeTab: "ingredientes",
      ingredient: null,
      errorMessage: "No fue posible cargar el detalle del ingrediente."
    });
  }
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

    if (!isAdminUser(res.locals.currentUser) && !canManageIngredient(res.locals.currentUser, ingredient)) {
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
    // Per new policy: ingredients created are published immediately
    payload.approvalStatus = "approved";
    payload.isPublic = true;
    payload.approvedBy = currentUserId || null;
    payload.approvedAt = new Date();

    const ingredient = await Ingredient.create(payload);
    await Interaction.create({
      tipo: 'crear_ingrediente',
      usuario_id: currentUserId || null,
      fecha: new Date(),
      metadata: {
        ingrediente_id: ingredient._id,
        nombre: ingredient.name
      }
    }).catch(() => null);
    try {
      await Evento.create({
        tipo: 'crear_ingrediente',
        usuario_id: req.session && req.session.userId ? req.session.userId : null,
        fecha: new Date(),
        dispositivo: 'web'
      });
    } catch (e) { /* ignore */ }
    if (req.accepts("html") && !req.path.startsWith("/api")) {
      return res.redirect(`/ingredients?submitted=approved`);
    }

    return sendSuccess(res, ingredient, "Ingrediente creado y publicado correctamente.", 201);
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
    const existingIngredient = await Ingredient.findById(req.params.id).lean();

    if (!existingIngredient) {
      return sendError(res, new Error("Ingrediente no encontrado."), "Ingrediente no encontrado.", 404);
    }

    if (!canManageIngredient(res.locals.currentUser, existingIngredient)) {
      return sendError(res, new Error("Acceso denegado."), "No tienes permiso para actualizar este ingrediente.", 403);
    }

    const { payload, invalidSeasonality } = mapIngredientPayload(req.body);

    if (invalidSeasonality.length > 0) {
      const message = getSeasonalityErrorMessage(invalidSeasonality);
      return sendError(res, new Error(message), message, 400);
    }

    payload.createdBy = existingIngredient.createdBy || null;
    payload.sourceType = existingIngredient.sourceType || payload.sourceType || "user";
    payload.approvalStatus = existingIngredient.approvalStatus || "approved";
    payload.isPublic = typeof existingIngredient.isPublic === "boolean" ? existingIngredient.isPublic : true;
    payload.approvedBy = existingIngredient.approvedBy || null;
    payload.approvedAt = existingIngredient.approvedAt || null;

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
    const existingIngredient = await Ingredient.findById(req.params.id).lean();

    if (!existingIngredient) {
      return sendError(res, new Error("Ingrediente no encontrado."), "Ingrediente no encontrado.", 404);
    }

    if (!canManageIngredient(res.locals.currentUser, existingIngredient)) {
      if (req.accepts("html") && !req.path.startsWith("/api")) {
        return res.status(403).redirect(`/ingredients/${req.params.id}`);
      }
      return sendError(res, new Error("Acceso denegado."), "No tienes permiso para eliminar este ingrediente.", 403);
    }

    const deleted = await Ingredient.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return sendError(res, new Error("Ingrediente no encontrado."), "Ingrediente no encontrado.", 404);
    }

    if (req.accepts("html") && !req.path.startsWith("/api")) {
      const referer = String(req.get("referer") || "");
      const redirectTo = referer.includes("/ingredients/moderation") ? "/ingredients/moderation" : "/ingredients";
      return res.redirect(redirectTo);
    }

    return sendSuccess(res, { id: req.params.id }, "Ingrediente eliminado correctamente.");
  } catch (error) {
    return sendError(res, error, "No fue posible eliminar el ingrediente.");
  }
}

async function updateIngredientFromForm(req, res) {
  try {
    const existingIngredient = await Ingredient.findById(req.params.id).lean();

    if (!existingIngredient) {
      return res.status(404).redirect("/ingredients");
    }

    if (!canManageIngredient(res.locals.currentUser, existingIngredient)) {
      return res.status(403).redirect(`/ingredients/${req.params.id}`);
    }

    const { payload, invalidSeasonality } = mapIngredientPayload(req.body);

    if (!payload.name) {
      return renderIngredientForm(res, {
        statusCode: 400,
        ingredient: { ...existingIngredient, ...payload },
        isEditMode: true,
        errorMessage: "El nombre del ingrediente es obligatorio."
      });
    }

    if (invalidSeasonality.length > 0) {
      return renderIngredientForm(res, {
        statusCode: 400,
        ingredient: { ...existingIngredient, ...payload },
        isEditMode: true,
        errorMessage: getSeasonalityErrorMessage(invalidSeasonality)
      });
    }

    payload.createdBy = existingIngredient.createdBy || null;
    payload.sourceType = existingIngredient.sourceType || payload.sourceType || "user";
    payload.approvalStatus = existingIngredient.approvalStatus || "approved";
    payload.isPublic = typeof existingIngredient.isPublic === "boolean" ? existingIngredient.isPublic : true;
    payload.approvedBy = existingIngredient.approvedBy || null;
    payload.approvedAt = existingIngredient.approvedAt || null;

    const updated = await Ingredient.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true
    });

    if (!updated) {
      return res.status(404).redirect("/ingredients");
    }

    return res.redirect(`/ingredients/${updated._id}`);
  } catch (error) {
    if (error && error.code === 11000) {
      const existingIngredient = await Ingredient.findById(req.params.id).lean();
      return renderIngredientForm(res, {
        statusCode: 409,
        ingredient: { ...existingIngredient, ...mapIngredientPayload(req.body).payload },
        isEditMode: true,
        errorMessage: "Ya existe un ingrediente con ese nombre. Prueba otro nombre."
      });
    }

    const existingIngredient = await Ingredient.findById(req.params.id).lean();
    return renderIngredientForm(res, {
      statusCode: 500,
      ingredient: existingIngredient,
      isEditMode: true,
      errorMessage: "No fue posible actualizar el ingrediente. Revisa los datos e intenta de nuevo."
    });
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
  renderEditIngredientPage,
  renderIngredientDetailPage,
  getAllIngredients,
  getIngredientById,
  checkIngredientNameAvailability,
  createIngredient,
  updateIngredient,
  updateIngredientFromForm,
  deleteIngredient,
  approveIngredient,
  rejectIngredient
};
