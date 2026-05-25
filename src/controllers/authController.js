const bcrypt = require("bcryptjs");
const User = require("../models/User");

function renderLoginPage(req, res) {
  if (req.session.userId) return res.redirect("/");

  if (req.query && req.query.returnTo) {
    req.session.returnTo = String(req.query.returnTo);
  }

  const errorMessage = req.session.flashError || "";
  const successMessage = req.session.flashSuccess || "";
  delete req.session.flashError;
  delete req.session.flashSuccess;

  return res.render("auth/login", {
    pageTitle: "Chef's Logic | Ingresar",
    activeTab: "",
    errorMessage,
    successMessage
  });
}

async function login(req, res) {
  try {
    const email = String(req.body.email || "")
      .toLowerCase()
      .trim();
    const password = String(req.body.password || "");

    if (!email || !password) {
      req.session.flashError = "Email y contraseña son requeridos.";
      return res.redirect("/login");
    }

    const user = await User.findOne({ email });
    if (!user) {
      req.session.flashError = "Credenciales incorrectas.";
      return res.redirect("/login");
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      req.session.flashError = "Credenciales incorrectas.";
      return res.redirect("/login");
    }

    req.session.userId = user._id.toString();
    req.session.userName = user.name;

    const returnTo = req.session.returnTo || "/";
    delete req.session.returnTo;
    return res.redirect(returnTo);
  } catch (error) {
    console.error("Login error:", error.message);
    req.session.flashError = "Error al iniciar sesion. Intenta de nuevo.";
    return res.redirect("/login");
  }
}

function renderRegisterPage(req, res) {
  if (req.session.userId) return res.redirect("/");

  const errorMessage = req.session.flashError || "";
  delete req.session.flashError;

  return res.render("auth/register", {
    pageTitle: "Chef's Logic | Registrarse",
    activeTab: "",
    errorMessage
  });
}

async function register(req, res) {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "")
      .toLowerCase()
      .trim();
    const password = String(req.body.password || "");
    const confirmPassword = String(req.body.confirmPassword || "");

    if (!name || !email || !password) {
      req.session.flashError = "Todos los campos son requeridos.";
      return res.redirect("/register");
    }

    if (password !== confirmPassword) {
      req.session.flashError = "Las contraseñas no coinciden.";
      return res.redirect("/register");
    }

    if (password.length < 8) {
      req.session.flashError = "La contraseña debe tener al menos 8 caracteres.";
      return res.redirect("/register");
    }

    const existing = await User.findOne({ email });
    if (existing) {
      req.session.flashError = "Ya existe una cuenta con ese email.";
      return res.redirect("/register");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({ name, email, passwordHash });

    req.session.userId = user._id.toString();
    req.session.userName = user.name;

    return res.redirect("/");
  } catch (error) {
    console.error("Register error:", error.message);
    req.session.flashError = "Error al crear la cuenta. Intenta de nuevo.";
    return res.redirect("/register");
  }
}

function logout(req, res) {
  req.session.destroy((err) => {
    if (err) console.error("Session destroy error:", err);
    return res.redirect("/login");
  });
}

module.exports = {
  renderLoginPage,
  renderRegisterPage,
  login,
  register,
  logout
};
