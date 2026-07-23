const express = require("express");
const router = express.Router();

const {
    createMatch,
    getAllMatches,
    getMatchById,
    updateMatch,
    deleteMatch
} = require("../controllers/matchController");

const authenticateUser = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/authorizeRoles");

const { matchValidation } = require("../validators/matchValidator");
const validate = require("../middleware/validate");

// Public Routes
router.get("/", getAllMatches);
router.get("/:id", getMatchById);

// Protected Routes
router.post(
    "/",
    authenticateUser,
    authorizeRoles("organizer", "admin"),
    matchValidation,
    validate,
    createMatch
);

router.put(
    "/:id",
    authenticateUser,
    authorizeRoles("organizer", "admin"),
    matchValidation,
    validate,
    updateMatch
);

router.delete(
    "/:id",
    authenticateUser,
    authorizeRoles("organizer", "admin"),
    deleteMatch
);

module.exports = router;