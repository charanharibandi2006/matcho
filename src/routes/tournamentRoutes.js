const express = require("express");
const router = express.Router();

const authenticateUser = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/authorizeRoles");

const { tournamentValidation } = require("../validators/tournamentValidator");
const validate = require("../middleware/validate");

const {
    createTournament,
    getAllTournaments,
    getTournamentById,
    updateTournament,
    deleteTournament
} = require("../controllers/tournamentController");

// Create Tournament (Organizer/Admin Only)
router.post(
    "/",
    authenticateUser,
    authorizeRoles("organizer", "admin"),
    tournamentValidation,
    validate,
    createTournament
);

// Get All Tournaments (Public)
router.get("/", getAllTournaments);

// Get Tournament by ID (Public)
router.get("/:id", getTournamentById);

// Update Tournament (Organizer/Admin Only)
router.put(
    "/:id",
    authenticateUser,
    authorizeRoles("organizer", "admin"),
    updateTournament
);

// Delete Tournament (Organizer/Admin Only)
router.delete(
    "/:id",
    authenticateUser,
    authorizeRoles("organizer", "admin"),
    deleteTournament
);

module.exports = router;