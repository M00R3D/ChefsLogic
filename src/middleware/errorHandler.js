function notFound(req, res) {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({
      success: false,
      message: "Ruta no encontrada."
    });
  }

  return res.status(404).render("index", {
    pageTitle: "Chef's Logic | Pagina no encontrada",
    activeTab: "inicio",
    recipes: [],
    regions: [],
    errorMessage: "La pagina solicitada no existe."
  });
}

function errorHandler(err, req, res, next) {
  console.error("Unhandled error:", err);

  if (res.headersSent) {
    return next(err);
  }

  if (req.path.startsWith("/api")) {
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor."
    });
  }

  return res.status(500).render("index", {
    pageTitle: "Chef's Logic | Error",
    activeTab: "inicio",
    recipes: [],
    regions: [],
    errorMessage: "Ocurrio un error inesperado en el servidor."
  });
}

module.exports = {
  notFound,
  errorHandler
};
