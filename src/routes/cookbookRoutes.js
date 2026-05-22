const express = require("express");
const cookbookController = require("../controllers/cookbookController");

const router = express.Router();

router.get("/cookbooks", cookbookController.renderCookbooksPage);
router.get("/cookbooks/create", cookbookController.renderCreateCookbookPage);
router.post("/cookbooks", cookbookController.createCookbook);

router.get("/api/cookbooks", cookbookController.getAllCookbooks);
router.get("/api/cookbooks/:id", cookbookController.getCookbookById);
router.post("/api/cookbooks", cookbookController.createCookbook);
router.put("/api/cookbooks/:id", cookbookController.updateCookbook);
router.delete("/api/cookbooks/:id", cookbookController.deleteCookbook);

module.exports = router;
