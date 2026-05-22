const express = require("express");
const recipeController = require("../controllers/recipeController");

const router = express.Router();

router.get("/recipes", recipeController.renderRecipesPage);
router.get("/recipes/create", recipeController.renderCreateRecipePage);
router.get("/recipes/:id/edit", recipeController.renderEditRecipePage);
router.get("/recipes/:id", recipeController.renderRecipeDetail);
router.post("/recipes", recipeController.createRecipe);
router.post("/recipes/:id", recipeController.updateRecipe);

router.get("/api/recipes", recipeController.getAllRecipes);
router.get("/api/recipes/:id", recipeController.getRecipeById);
router.post("/api/recipes", recipeController.createRecipe);
router.put("/api/recipes/:id", recipeController.updateRecipe);
router.delete("/api/recipes/:id", recipeController.deleteRecipe);

module.exports = router;
