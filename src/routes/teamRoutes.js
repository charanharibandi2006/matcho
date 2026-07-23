const express = require("express");

const router = express.Router();

const authenticateUser = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/authorizeRoles");

const validate = require("../middleware/validate");

const { teamValidation } = require("../validators/teamValidator");

const {
    createTeam,
    getAllTeams,
    getTeamById,
    updateTeam,
    deleteTeam
} = require("../controllers/teamController");

// Create Team
router.post(
    "/",
    authenticateUser,
    authorizeRoles("organizer", "admin"),
    teamValidation,
    validate,
    createTeam
);

// Get All Teams
router.get("/", getAllTeams);

// Get Team By ID
router.get("/:id", getTeamById);

// Update Team
router.put(
    "/:id",
    authenticateUser,
    authorizeRoles("organizer", "admin"),
    updateTeam
);

// Delete Team
router.delete(
    "/:id",
    authenticateUser,
    authorizeRoles("organizer", "admin"),
    deleteTeam
);

module.exports = router;