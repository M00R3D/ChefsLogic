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

module.exports = { requireAuth };
