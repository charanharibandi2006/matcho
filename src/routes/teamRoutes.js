const express = require("express");
const router = express.Router();

const authenticateUser = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/authorizeRoles");

const {
    createTeam,
    generateTeams,
    getAllTeams,
    getTeamById,
    updateTeam,
    deleteTeam
} = require("../controllers/teamController");

// Manual Team Creation
router.post(
    "/",
    authenticateUser,
    authorizeRoles("organizer", "admin"),
    createTeam
);

// Automatic Team Generation
router.post(
    "/auto/:tournamentId",
    authenticateUser,
    authorizeRoles("organizer", "admin"),
    generateTeams
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