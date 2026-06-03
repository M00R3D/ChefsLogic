const path = require("path");
const fs = require("fs");
const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const Recipe = require("./models/Recipe");
const Ingredient = require("./models/Ingredient");
const Cookbook = require("./models/Cookbook");
const recipeRoutes = require("./routes/recipeRoutes");
const ingredientRoutes = require("./routes/ingredientRoutes");
const cookbookRoutes = require("./routes/cookbookRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const Region = require("./models/Region");
const User = require("./models/User");
const authRoutes = require("./routes/authRoutes");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "..", "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "chefslogic-secret-key-change-in-prod",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/chefslogic",
      touchAfter: 24 * 3600
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000
    }
  })
);

app.use(async (req, res, next) => {
  if (req.session && req.session.userId) {
    try {
      const user = await User.findById(req.session.userId)
        .select("name nombre email correo role rol savedRecipes likedRecipes permissions")
        .lean();
      if (user) {
        res.locals.currentUser = {
          ...user,
          name: user.name || user.nombre || "Chef",
          email: user.email || user.correo || "",
          role: user.role || user.rol || "usuario",
          permissions: user.permissions || {}
        };
      } else {
        res.locals.currentUser = null;
      }
    } catch {
      res.locals.currentUser = null;
    }
  } else {
    res.locals.currentUser = null;
  }
  next();
});

app.use(authRoutes);
app.use(dashboardRoutes);

app.get("/", async (req, res) => {
  try {
    const [
      recipesResult,
      regionsResult,
      cookbooksResult,
      ingredientsResult,
      recipeCountResult,
      ingredientCountResult,
      cookbookCountResult
    ] = await Promise.allSettled([
      Recipe.find().populate("region", "name nombre").sort({ createdAt: -1 }).limit(9).lean(),
      Region.find().sort({ name: 1, nombre: 1 }).lean(),
      Cookbook.find().sort({ createdAt: -1 }).limit(6).select("title nombre theme accentColor coverEmoji coverImage recipes recetas tags isPublic publico").lean(),
      Ingredient.find().sort({ createdAt: -1 }).limit(8).select("name nombre category categoria defaultUnit unidad").lean(),
      Recipe.countDocuments(),
      Ingredient.countDocuments(),
      Cookbook.countDocuments()
    ]);

    const recipes = recipesResult.status === "fulfilled" ? recipesResult.value : [];
    const regions = regionsResult.status === "fulfilled" ? regionsResult.value : [];
    const featuredCookbooks = cookbooksResult.status === "fulfilled" ? cookbooksResult.value : [];
    const recentIngredients = ingredientsResult.status === "fulfilled" ? ingredientsResult.value : [];

    const stats = {
      recipes: recipeCountResult.status === "fulfilled" ? recipeCountResult.value : recipes.length,
      ingredients: ingredientCountResult.status === "fulfilled" ? ingredientCountResult.value : recentIngredients.length,
      cookbooks: cookbookCountResult.status === "fulfilled" ? cookbookCountResult.value : featuredCookbooks.length
    };

    return res.render("index", {
      pageTitle: "Chef's Logic | Descubre Cocina Mexicana",
      activeTab: "inicio",
      recipes,
      regions,
      featuredCookbooks,
      recentIngredients,
      stats,
      errorMessage: ""
    });
  } catch (error) {
    console.warn("Home route error:", error.message);
    return res.render("index", {
      pageTitle: "Chef's Logic",
      activeTab: "inicio",
      recipes: [],
      regions: [],
      featuredCookbooks: [],
      recentIngredients: [],
      stats: { recipes: 0, ingredients: 0, cookbooks: 0 },
      errorMessage: "No fue posible cargar las recetas."
    });
  }
});

app.get("/api/health", (req, res) => {
  const readyStateMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting"
  };

  const dbStateCode = mongoose.connection.readyState;
  const dbConnected = dbStateCode === 1;

  res.json({
    status: dbConnected ? "ok" : "degraded",
    message: "Chef's Logic API ready",
    timestamp: new Date().toISOString(),
    database: {
      connected: dbConnected,
      state: readyStateMap[dbStateCode] || "unknown",
      name: mongoose.connection.name || null
    }
  });
});

app.get("/test-db", async (req, res) => {
  try {
    const db = mongoose.connection.db;

    if (!db) {
      return res.status(503).json({
        connected: false,
        error: "No hay conexion activa a MongoDB."
      });
    }

    const collections = await db.listCollections().toArray();

    return res.json({
      connected: true,
      database: mongoose.connection.name,
      collections: collections.map((item) => item.name)
    });
  } catch (error) {
    return res.status(500).json({
      connected: false,
      error: error.message
    });
  }
});

app.get("/api/dashboard-stats", async (req, res) => {
  try {
    const [recipes, ingredients, cookbooks, users, events] = await Promise.all([
      Recipe.countDocuments(),
      Ingredient.countDocuments(),
      Cookbook.countDocuments(),
      require('./models/User').countDocuments(),
      require('./models/Evento').countDocuments()
    ]);

    return res.json({
      success: true,
      data: {
        recipes,
        ingredients,
        cookbooks,
        users,
        events,
        database: mongoose.connection.name || null,
        connected: mongoose.connection.readyState === 1,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "No fue posible cargar metricas del dashboard.",
      error: error.message
    });
  }
});

// ── Image upload endpoint ──────────────────────────────────────
const uploadsDir = path.join(__dirname, "..", "public", "uploads");
if (!fs.existsSync(uploadsDir)) { fs.mkdirSync(uploadsDir, { recursive: true }); }

const imageStorage = multer.diskStorage({
  destination: function (_req, _file, cb) { cb(null, uploadsDir); },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, "");
    cb(null, Date.now() + "-" + Math.floor(Math.random() * 1e6) + (ext || ".jpg"));
  }
});

const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (_req, file, cb) {
    const allowed = /^image\/(jpeg|jpg|png|webp|gif)$/;
    if (allowed.test(file.mimetype)) { cb(null, true); }
    else { cb(new Error("Solo se permiten imágenes (jpg, png, webp, gif).")); }
  }
});

app.post("/api/upload/image", imageUpload.single("image"), function (req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No se recibio ningún archivo." });
  }
  return res.json({ success: true, url: "/uploads/" + req.file.filename });
});
// ───────────────────────────────────────────────────────────────

app.use(recipeRoutes);
app.use(ingredientRoutes);
app.use(cookbookRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
