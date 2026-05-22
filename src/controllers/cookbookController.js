const Cookbook = require("../models/Cookbook");
const Recipe = require("../models/Recipe");
const User = require("../models/User");
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
  const isPublic =
    body.isPublic === true ||
    body.isPublic === "true" ||
    body.isPublic === "on" ||
    body.publico === true ||
    body.publico === "true";
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
      tags
    },
    hasUser: Boolean(resolvedUserId)
  };
}

async function renderCookbooksPage(req, res) {
  try {
    const cookbooks = await Cookbook.find().populate("recipes", "title").sort({ createdAt: -1 }).lean();

    return res.render("cookbooks/index", {
      pageTitle: "Chef's Logic | Recetarios",
      activeTab: "recetarios",
      cookbooks,
      errorMessage: ""
    });
  } catch (error) {
    return res.status(500).render("cookbooks/index", {
      pageTitle: "Chef's Logic | Recetarios",
      activeTab: "recetarios",
      cookbooks: [],
      errorMessage: "No fue posible cargar los recetarios."
    });
  }
}

async function renderCreateCookbookPage(req, res) {
  try {
    const recipes = await Recipe.find().select("title").sort({ title: 1 }).lean();

    return res.render("cookbooks/create", {
      pageTitle: "Chef's Logic | Nuevo recetario",
      activeTab: "recetarios",
      recipes,
      errorMessage: ""
    });
  } catch (error) {
    return res.status(500).render("cookbooks/create", {
      pageTitle: "Chef's Logic | Nuevo recetario",
      activeTab: "recetarios",
      recipes: [],
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
    const { payload, hasUser } = await mapCookbookPayload(req.body);

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

    return sendSuccess(res, updated, "Recetario actualizado correctamente.");
  } catch (error) {
    return sendError(res, error, "No fue posible actualizar el recetario.");
  }
}

async function deleteCookbook(req, res) {
  try {
    const deleted = await Cookbook.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return sendError(res, new Error("Recetario no encontrado."), "Recetario no encontrado.", 404);
    }

    return sendSuccess(res, { id: req.params.id }, "Recetario eliminado correctamente.");
  } catch (error) {
    return sendError(res, error, "No fue posible eliminar el recetario.");
  }
}

module.exports = {
  renderCookbooksPage,
  renderCreateCookbookPage,
  getAllCookbooks,
  getCookbookById,
  createCookbook,
  updateCookbook,
  deleteCookbook
};
