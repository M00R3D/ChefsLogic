const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const Recipe = require("./models/Recipe");
const Ingredient = require("./models/Ingredient");
const Cookbook = require("./models/Cookbook");
const recipeRoutes = require("./routes/recipeRoutes");
const ingredientRoutes = require("./routes/ingredientRoutes");
const cookbookRoutes = require("./routes/cookbookRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/", async (req, res) => {
  let dashboardStats = {
    recipes: 0,
    ingredients: 0,
    cookbooks: 0
  };

  try {
    const [recipes, ingredients, cookbooks] = await Promise.all([
      Recipe.countDocuments(),
      Ingredient.countDocuments(),
      Cookbook.countDocuments()
    ]);

    dashboardStats = {
      recipes,
      ingredients,
      cookbooks
    };
  } catch (error) {
    console.warn("No fue posible cargar metricas para el home:", error.message);
  }

  res.render("index", {
    appName: "Chef's Logic",
    pageTitle: "Chef's Logic | Cocina Mexicana Inteligente",
    activeTab: "inicio",
    statusMessage: "Verificando estado de la API...",
    dashboardStats
  });
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
    const [recipes, ingredients, cookbooks] = await Promise.all([
      Recipe.countDocuments(),
      Ingredient.countDocuments(),
      Cookbook.countDocuments()
    ]);

    return res.json({
      success: true,
      data: {
        recipes,
        ingredients,
        cookbooks,
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

app.use(recipeRoutes);
app.use(ingredientRoutes);
app.use(cookbookRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
