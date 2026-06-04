const Cookbook = require("../models/Cookbook");
const Recipe = require("../models/Recipe");
const User = require("../models/User");
const Evento = require("../models/Evento");
const mongoose = require("mongoose");
const { sendSuccess, sendError } = require("../utils/apiResponse");

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
  const fromBody = toObjectId(body.usuario_id || body.userId || body.user || body.owner);
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

function canManageCookbook(user, cookbook) {
  if (!user || !cookbook) return false;
  const role = String(user.role || user.rol || "usuario").toLowerCase();
  if (role === "admin") return true;

  const userId = String(user._id || user.id || "");
  const ownerId = String(
    (cookbook.owner && cookbook.owner._id) ||
    cookbook.owner ||
    (cookbook.usuario_id && cookbook.usuario_id._id) ||
    cookbook.usuario_id ||
    ""
  );
  return Boolean(userId && ownerId && userId === ownerId);
}

function isAdminUser(user) {
  return String((user && (user.role || user.rol)) || "usuario").toLowerCase() === "admin";
}

function parseRecipeIds(rawRecipes) {
  const values = Array.isArray(rawRecipes)
    ? rawRecipes
    : String(rawRecipes || "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);

  return values.map((id) => toObjectId(id)).filter(Boolean);
}

async function mapCookbookPayload(body = {}, fallbackCookbook = null) {
  const tags = Array.isArray(body.tags)
    ? body.tags
    : String(body.tags || "")
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean);

  const recipeIds = parseRecipeIds(body.recipes || body.recetas);
  const title = String(body.title || body.nombre || "").trim();
  const description = String(body.description || body.descripcion || "").trim();
  const hasIsPublicProp = Object.prototype.hasOwnProperty.call(body, 'isPublic') || Object.prototype.hasOwnProperty.call(body, 'publico');
  const isPublicRaw = String(body.isPublic ?? body.publico ?? "").toLowerCase().trim();
  const parsedIsPublic =
    body.isPublic === true ||
    body.isPublic === "true" ||
    body.isPublic === 1 ||
    body.isPublic === "1" ||
    body.isPublic === "on" ||
    body.publico === true ||
    body.publico === "true" ||
    body.publico === 1 ||
    body.publico === "1" ||
    isPublicRaw === "on";
  // Default to published (public) when creating and no explicit flag provided
  const isPublic = hasIsPublicProp ? parsedIsPublic : true;
  const resolvedUserId = await resolveUserId(body, fallbackCookbook && fallbackCookbook.usuario_id);

  return {
    payload: {
      nombre: title,
      descripcion: description,
      publico: isPublic,
      fecha_creacion: body.fecha_creacion
        ? new Date(body.fecha_creacion)
        : fallbackCookbook && fallbackCookbook.fecha_creacion
          ? fallbackCookbook.fecha_creacion
          : new Date(),
      usuario_id: resolvedUserId,
      recetas: recipeIds,
      title,
      description,
      coverImage: String(body.coverImage || "").trim(),
      isPublic,
      recipes: recipeIds,
      owner: resolvedUserId,
      tags,
      theme: String(body.theme || "otro").trim(),
      accentColor: String(body.accentColor || "").replace(/[^#a-zA-Z0-9]/g, "").slice(0, 20),
      coverEmoji: String(body.coverEmoji || "📖").trim().slice(0, 8)
    },
    hasUser: Boolean(resolvedUserId)
  };
}

const ALL_THEMES = ["mexicana","postres","bebidas","vegano","mariscos","antojitos","sopas","desayunos","carnes","internacional","otro"];
const CB_PAGE_SIZE = 12;

async function renderCookbooksPage(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const themeFilter = String(req.query.theme || "").trim().toLowerCase();
    const search = String(req.query.q || "").trim();
    if (search) {
      await Evento.create({
        tipo: "buscar_receta",
        fecha: new Date()
      }).catch(() => {});
    }
    const conditions = [];
    if (search) conditions.push({ $or: [{ title: { $regex: search, $options: "i" } }, { nombre: { $regex: search, $options: "i" } }] });
    if (themeFilter && themeFilter !== "all") conditions.push({ theme: themeFilter });
    const query = conditions.length ? { $and: conditions } : {};

    const [cookbooks, total, themeCounts] = await Promise.all([
      Cookbook.find(query)
        .populate("recipes", "title slug summary imageUrl imagen_principal")
        .populate("owner", "name nombre")
        .populate("usuario_id", "name nombre")
        .sort({ createdAt: -1 })
        .skip((page - 1) * CB_PAGE_SIZE).limit(CB_PAGE_SIZE).lean(),
      Cookbook.countDocuments(query),
      Cookbook.aggregate([{ $group: { _id: "$theme", count: { $sum: 1 } } }])
    ]);

    const totalPages = Math.max(1, Math.ceil(total / CB_PAGE_SIZE));
    const themeCountMap = {};
    themeCounts.forEach((t) => { themeCountMap[t._id || "otro"] = t.count; });

    return res.render("cookbooks/index", {
      pageTitle: "Chef's Logic | Recetarios",
      activeTab: "recetarios",
      cookbooks,
      page,
      totalPages,
      total,
      themeFilter,
      search,
      allThemes: ALL_THEMES,
      themeCountMap,
      errorMessage: ""
    });
  } catch (error) {
    return res.status(500).render("cookbooks/index", {
      pageTitle: "Chef's Logic | Recetarios",
      activeTab: "recetarios",
      cookbooks: [],
      page: 1, totalPages: 1, total: 0,
      themeFilter: "", search: "",
      allThemes: ALL_THEMES, themeCountMap: {},
      errorMessage: "No fue posible cargar los recetarios."
    });
  }
}

async function renderCreateCookbookPage(req, res) {
  try {
    const allRecipes = await Recipe.find()
      .select("title summary author usuario_id")
      .populate("author", "name nombre")
      .populate("usuario_id", "name nombre")
      .sort({ title: 1 })
      .lean();

    return res.render("cookbooks/create", {
      pageTitle: "Chef's Logic | Nuevo recetario",
      activeTab: "recetarios",
      allRecipes,
      errorMessage: ""
    });
  } catch (error) {
    return res.status(500).render("cookbooks/create", {
      pageTitle: "Chef's Logic | Nuevo recetario",
      activeTab: "recetarios",
      allRecipes: [],
      errorMessage: "No fue posible abrir el formulario."
    });
  }
}

async function getAllCookbooks(req, res) {
  try {
    const cookbooks = await Cookbook.find().populate("recipes", "title").sort({ createdAt: -1 });
    return sendSuccess(res, cookbooks, "Recetarios obtenidos correctamente.");
  } catch (error) {
    return sendError(res, error, "No fue posible listar recetarios.");
  }
}

async function getCookbookById(req, res) {
  try {
    const cookbook = await Cookbook.findById(req.params.id).populate("recipes", "title summary");

    if (!cookbook) {
      return sendError(res, new Error("Recetario no encontrado."), "Recetario no encontrado.", 404);
    }

    return sendSuccess(res, cookbook, "Recetario obtenido correctamente.");
  } catch (error) {
    return sendError(res, error, "No fue posible obtener el recetario.");
  }
}

async function createCookbook(req, res) {
  try {
    const { payload, hasUser } = await mapCookbookPayload(req.body, {
      usuario_id: req.session && req.session.userId ? req.session.userId : null,
      owner: req.session && req.session.userId ? req.session.userId : null
    });

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

    const cookbook = await Cookbook.create(payload);
    try {
      await Evento.create({
        tipo: 'crear_recetario',
        usuario_id: req.session && req.session.userId ? req.session.userId : null,
        fecha: new Date(),
        dispositivo: 'web'
      });
    } catch (e) { /* ignore */ }
    if (req.accepts("html") && !req.path.startsWith("/api")) {
      return res.redirect("/cookbooks");
    }

    return sendSuccess(res, cookbook, "Recetario creado correctamente.", 201);
  } catch (error) {
    return sendError(res, error, "No fue posible crear el recetario.");
  }
}

async function updateCookbook(req, res) {
  try {
    const existingCookbook = await Cookbook.findById(req.params.id).lean();

    if (!existingCookbook) {
      return sendError(res, new Error("Recetario no encontrado."), "Recetario no encontrado.", 404);
    }

    if (!canManageCookbook(res.locals.currentUser, existingCookbook)) {
      return sendError(res, new Error("Acceso denegado."), "No tienes permiso para editar este recetario.", 403);
    }

    const { payload, hasUser } = await mapCookbookPayload(req.body, existingCookbook);

    if (!hasUser) {
      return sendError(
        res,
        new Error("No hay usuario disponible para usuario_id."),
        "Necesitas enviar usuario_id o tener al menos un usuario en la coleccion usuarios.",
        400
      );
    }

    const updated = await Cookbook.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true
    });

    if (req.accepts("html") && !req.path.startsWith("/api")) {
      return res.redirect(`/cookbooks/${req.params.id}`);
    }

    return sendSuccess(res, updated, "Recetario actualizado correctamente.");
  } catch (error) {
    return sendError(res, error, "No fue posible actualizar el recetario.");
  }
}

async function deleteCookbook(req, res) {
  try {
    const existingCookbook = await Cookbook.findById(req.params.id).lean();

    if (!existingCookbook) {
      return sendError(res, new Error("Recetario no encontrado."), "Recetario no encontrado.", 404);
    }

    if (!canManageCookbook(res.locals.currentUser, existingCookbook)) {
      return sendError(res, new Error("Acceso denegado."), "No tienes permiso para eliminar este recetario.", 403);
    }

    const deleted = await Cookbook.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return sendError(res, new Error("Recetario no encontrado."), "Recetario no encontrado.", 404);
    }

    if (req.accepts("html") && !req.path.startsWith("/api")) {
      return res.redirect("/cookbooks");
    }

    return sendSuccess(res, { id: req.params.id }, "Recetario eliminado correctamente.");
  } catch (error) {
    return sendError(res, error, "No fue posible eliminar el recetario.");
  }
}

async function renderCookbookDetail(req, res) {
  try {
    const cookbook = await Cookbook.findById(req.params.id)
      .populate("recipes", "title slug summary imageUrl imagen_principal author usuario_id")
      .populate("owner", "name nombre")
      .populate("usuario_id", "name nombre")
      .lean();

    if (!cookbook) {
      return res.status(404).render("cookbooks/show", {
        pageTitle: "Chef's Logic | Recetario",
        activeTab: "recetarios",
        cookbook: null,
        canManage: false,
        errorMessage: "Recetario no encontrado."
      });
    }

    return res.render("cookbooks/show", {
      pageTitle: `Chef's Logic | ${cookbook.title || cookbook.nombre || "Recetario"}`,
      activeTab: "recetarios",
      cookbook,
      canManage: canManageCookbook(res.locals.currentUser, cookbook),
      errorMessage: ""
    });
  } catch (error) {
    return res.status(500).render("cookbooks/show", {
      pageTitle: "Chef's Logic | Recetario",
      activeTab: "recetarios",
      cookbook: null,
      canManage: false,
      errorMessage: "No fue posible cargar el recetario."
    });
  }
}

async function renderEditCookbookPage(req, res) {
  try {
    const [cookbook, allRecipes] = await Promise.all([
      Cookbook.findById(req.params.id).lean(),
      Recipe.find()
        .select("title summary author usuario_id")
        .populate("author", "name nombre")
        .populate("usuario_id", "name nombre")
        .sort({ title: 1 })
        .lean()
    ]);

    if (!cookbook) {
      return res.status(404).render("cookbooks/edit", {
        pageTitle: "Chef's Logic | Editar recetario",
        activeTab: "recetarios",
        cookbook: null,
        allRecipes: [],
        errorMessage: "Recetario no encontrado."
      });
    }

    if (!canManageCookbook(res.locals.currentUser, cookbook)) {
      return res.status(403).render("cookbooks/edit", {
        pageTitle: "Chef's Logic | Editar recetario",
        activeTab: "recetarios",
        cookbook,
        allRecipes: [],
        errorMessage: "No tienes permiso para editar este recetario."
      });
    }

    return res.render("cookbooks/edit", {
      pageTitle: "Chef's Logic | Editar recetario",
      activeTab: "recetarios",
      cookbook,
      allRecipes,
      errorMessage: ""
    });
  } catch (error) {
    return res.status(500).render("cookbooks/edit", {
      pageTitle: "Chef's Logic | Editar recetario",
      activeTab: "recetarios",
      cookbook: null,
      allRecipes: [],
      errorMessage: "No fue posible cargar el formulario de edición."
    });
  }
}

async function updateCookbookFromForm(req, res) {
  try {
    const existingCookbook = await Cookbook.findById(req.params.id).lean();

    if (!existingCookbook) {
      return res.status(404).redirect("/cookbooks");
    }

    if (!canManageCookbook(res.locals.currentUser, existingCookbook)) {
      return res.status(403).redirect(`/cookbooks/${req.params.id}`);
    }

    return updateCookbook(req, res);
  } catch (error) {
    return res.status(500).redirect(`/cookbooks/${req.params.id}`);
  }
}

async function deleteCookbookFromForm(req, res) {
  try {
    const existingCookbook = await Cookbook.findById(req.params.id).lean();

    if (!existingCookbook) {
      return res.status(404).redirect("/cookbooks");
    }

    if (!canManageCookbook(res.locals.currentUser, existingCookbook)) {
      return res.status(403).redirect(`/cookbooks/${req.params.id}`);
    }

    await Cookbook.findByIdAndDelete(req.params.id);
    return res.redirect("/cookbooks");
  } catch (error) {
    return res.status(500).redirect(`/cookbooks/${req.params.id}`);
  }
}

module.exports = {
  renderCookbooksPage,
  renderCreateCookbookPage,
  renderCookbookDetail,
  renderEditCookbookPage,
  updateCookbookFromForm,
  deleteCookbookFromForm,
  getAllCookbooks,
  getCookbookById,
  createCookbook,
  updateCookbook,
  deleteCookbook
};
