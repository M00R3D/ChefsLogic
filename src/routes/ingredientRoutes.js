const express = require("express");
const ingredientController = require("../controllers/ingredientController");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/ingredients", ingredientController.renderIngredientsPage);
router.get("/ingredients/create", requireAuth, ingredientController.renderCreateIngredientPage);
router.get("/ingredients/:id/edit", requireAuth, ingredientController.renderEditIngredientPage);
router.post("/ingredients", requireAuth, ingredientController.createIngredient);
router.post("/ingredients/:id", requireAuth, ingredientController.updateIngredientFromForm);
router.get("/ingredients/moderation", requireAuth, requireAdmin, ingredientController.renderModerationPage);
router.get("/ingredients/:id", ingredientController.renderIngredientDetailPage);
router.post("/ingredients/:id/approve", requireAuth, requireAdmin, ingredientController.approveIngredient);
router.post("/ingredients/:id/reject", requireAuth, requireAdmin, ingredientController.rejectIngredient);
router.post("/ingredients/:id/delete", requireAuth, ingredientController.deleteIngredient);

router.get("/api/ingredients", ingredientController.getAllIngredients);
router.get("/api/ingredients/name-availability", ingredientController.checkIngredientNameAvailability);
router.get("/api/ingredients/:id", ingredientController.getIngredientById);
router.post("/api/ingredients", requireAuth, ingredientController.createIngredient);
router.put("/api/ingredients/:id", requireAuth, ingredientController.updateIngredient);
router.delete("/api/ingredients/:id", requireAuth, ingredientController.deleteIngredient);
router.post("/api/ingredients/:id/approve", requireAuth, requireAdmin, ingredientController.approveIngredient);
router.post("/api/ingredients/:id/reject", requireAuth, requireAdmin, ingredientController.rejectIngredient);

module.exports = router;
