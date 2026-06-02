function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();

  if (req.path.startsWith("/api")) {
    return res.status(401).json({
      success: false,
      message: "Debes iniciar sesion para realizar esta accion."
    });
  }

  req.session.returnTo = req.originalUrl;
  return res.redirect("/login");
}

function getAdminFallbackPath(req) {
  const path = String(req.originalUrl || req.path || "");

  if (path.startsWith("/ingredients")) {
    return "/ingredients";
  }

  if (path.startsWith("/recipes")) {
    return "/recipes";
  }

  if (path.startsWith("/cookbooks")) {
    return "/cookbooks";
  }

  return "/";
}

function requireAdmin(req, res, next) {
  const user = res.locals && res.locals.currentUser;
  const role = String((user && (user.role || user.rol)) || "usuario").toLowerCase();

  if (role === "admin") {
    return next();
  }

  if (req.path.startsWith("/api")) {
    return res.status(403).json({
      success: false,
      message: "Solo administradores pueden realizar esta accion."
    });
  }

  return res.status(403).redirect(getAdminFallbackPath(req));
}

module.exports = { requireAuth, requireAdmin };
