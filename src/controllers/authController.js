const bcrypt = require("bcryptjs");
const User = require("../models/User");

function normalizeEmail(rawEmail) {
  return String(rawEmail || "")
    .toLowerCase()
    .trim();
}

async function validatePassword(user, password) {
  const hash = String(user.passwordHash || "").trim();
  if (hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch {
      return false;
    }
  }

  const legacyPassword = String(user.password || "");
  if (!legacyPassword) {
    return false;
  }

  // Some legacy records stored bcrypt hash in `password`.
  if (/^\$2[aby]\$\d{2}\$/.test(legacyPassword)) {
    try {
      return await bcrypt.compare(password, legacyPassword);
    } catch {
      return false;
    }
  }

  return legacyPassword === password;
}

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
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!email || !password) {
      req.session.flashError = "Email y contraseña son requeridos.";
      return res.redirect("/login");
    }

    const user = await User.findOne({
      $or: [{ email }, { correo: email }]
    });
    if (!user) {
      req.session.flashError = "Credenciales incorrectas.";
      return res.redirect("/login");
    }

    const isValid = await validatePassword(user, password);
    if (!isValid) {
      req.session.flashError = "Credenciales incorrectas.";
      return res.redirect("/login");
    }

    if (!user.passwordHash) {
      user.passwordHash = await bcrypt.hash(password, 12);
      if (!user.email && user.correo) {
        user.email = normalizeEmail(user.correo);
      }
      if (!user.name && user.nombre) {
        user.name = String(user.nombre).trim();
      }
      await user.save();
    }

    req.session.userId = user._id.toString();
    req.session.userName = user.name || user.nombre || "Chef";

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
    const email = normalizeEmail(req.body.email);
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

    const existing = await User.findOne({
      $or: [{ email }, { correo: email }]
    });
    if (existing) {
      req.session.flashError = "Ya existe una cuenta con ese email.";
      return res.redirect("/register");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      passwordHash,
      nombre: name,
      correo: email,
      // Keep legacy field populated but never store plain text passwords.
      password: passwordHash,
      avatar: "default.png",
      fecha_registro: new Date(),
      rol: "usuario"
    });

    req.session.userId = user._id.toString();
    req.session.userName = user.name;

    return res.redirect("/");
  } catch (error) {
    console.error("Register error:", error);

    if (error && error.code === 11000) {
      req.session.flashError = "Ya existe una cuenta con ese email.";
      return res.redirect("/register");
    }

    if (error && error.name === "ValidationError") {
      const messages = Object.values(error.errors || {})
        .map((entry) => entry && entry.message)
        .filter(Boolean);

      req.session.flashError = messages.length
        ? `No se pudo crear la cuenta: ${messages.join(" ")}`
        : "No se pudo crear la cuenta por un error de validacion.";
      return res.redirect("/register");
    }

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
