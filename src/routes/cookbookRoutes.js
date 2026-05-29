const express = require("express");
const cookbookController = require("../controllers/cookbookController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/cookbooks", cookbookController.renderCookbooksPage);
router.get("/cookbooks/create", requireAuth, cookbookController.renderCreateCookbookPage);
router.get("/cookbooks/:id", cookbookController.renderCookbookDetail);
router.get("/cookbooks/:id/edit", requireAuth, cookbookController.renderEditCookbookPage);
router.post("/cookbooks", requireAuth, cookbookController.createCookbook);
router.post("/cookbooks/:id", requireAuth, cookbookController.updateCookbookFromForm);
router.post("/cookbooks/:id/delete", requireAuth, cookbookController.deleteCookbookFromForm);

router.get("/api/cookbooks", cookbookController.getAllCookbooks);
router.get("/api/cookbooks/:id", cookbookController.getCookbookById);
router.post("/api/cookbooks", requireAuth, cookbookController.createCookbook);
router.put("/api/cookbooks/:id", requireAuth, cookbookController.updateCookbook);
router.delete("/api/cookbooks/:id", requireAuth, cookbookController.deleteCookbook);

module.exports = router;
