const path = require("path");
const express = require("express");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/", (req, res) => {
  res.render("index", {
    appName: "Chef's Logic",
    pageTitle: "Chef's Logic | Cocina Mexicana Inteligente"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Chef's Logic API ready",
    timestamp: new Date().toISOString()
  });
});

module.exports = app;
