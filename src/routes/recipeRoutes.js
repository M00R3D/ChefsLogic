const express = require("express");
const recipeController = require("../controllers/recipeController");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/recipes", recipeController.renderRecipesPage);
router.get("/recipes/create", requireAuth, recipeController.renderCreateRecipePage);
router.get("/recipes/:id/edit", requireAuth, recipeController.renderEditRecipePage);
router.get("/recipes/:id", recipeController.renderRecipeDetail);
router.post("/recipes", requireAuth, recipeController.createRecipe);
router.post("/recipes/:id", requireAuth, recipeController.updateRecipe);

router.get("/api/recipes", recipeController.getAllRecipes);
router.get("/api/recipes/slug-availability", recipeController.checkRecipeSlugAvailability);
router.get("/api/recipes/:id", recipeController.getRecipeById);
router.post("/api/recipes", requireAuth, recipeController.createRecipe);
router.put("/api/recipes/:id", requireAuth, recipeController.updateRecipe);
router.delete("/api/recipes/:id", requireAuth, recipeController.deleteRecipe);
router.post("/api/recipes/:id/like", requireAuth, recipeController.likeRecipe);
router.post("/api/recipes/:id/dislike", requireAuth, recipeController.dislikeRecipe);
router.post("/api/recipes/:id/save", requireAuth, recipeController.saveRecipe);
router.post("/api/recipes/:id/comment", requireAuth, recipeController.addComment);
router.delete("/api/recipes/:id/comments/:commentId", requireAuth, requireAdmin, recipeController.deleteComment);
router.put("/api/recipes/:id/comments/:commentId", requireAuth, requireAdmin, recipeController.updateComment);
// Support form-based delete from UI
router.post("/recipes/:id/delete", requireAuth, recipeController.deleteRecipeFromForm);
router.get('/recipes/:id/comments/:commentId/edit', requireAuth, requireAdmin, recipeController.renderEditCommentPage);
router.post('/recipes/:id/comments/:commentId/edit', requireAuth, requireAdmin, recipeController.updateCommentFromForm);

module.exports = router;
