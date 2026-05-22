const express = require("express");
const ingredientController = require("../controllers/ingredientController");

const router = express.Router();

router.get("/ingredients", ingredientController.renderIngredientsPage);
router.get("/ingredients/create", ingredientController.renderCreateIngredientPage);
router.post("/ingredients", ingredientController.createIngredient);

router.get("/api/ingredients", ingredientController.getAllIngredients);
router.get("/api/ingredients/:id", ingredientController.getIngredientById);
router.post("/api/ingredients", ingredientController.createIngredient);
router.put("/api/ingredients/:id", ingredientController.updateIngredient);
router.delete("/api/ingredients/:id", ingredientController.deleteIngredient);

module.exports = router;
