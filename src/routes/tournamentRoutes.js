const express = require("express");

const router = express.Router();

const authenticateUser =
    require("../middleware/authMiddleware");

const authorizeRoles =
    require("../middleware/authorizeRoles");

const {
    tournamentValidation,
    tournamentUpdateValidation
} = require("../validators/tournamentValidator");

const validate =
    require("../middleware/validate");

const {
    createTournament,
    getAllTournaments,
    getTournamentById,
    getTournamentByRegistrationCode,
    getMyTournaments,
    updateTournament,
    deleteTournament
} = require("../controllers/tournamentController");


// ==========================================
// CREATE TOURNAMENT
// ==========================================

router.post(
    "/",
    authenticateUser,
    authorizeRoles("Organizer"),
    tournamentValidation,
    validate,
    createTournament
);


// ==========================================
// GET ALL TOURNAMENTS
// ==========================================

router.get(
    "/",
    getAllTournaments
);




// ==========================================
// GET TOURNAMENT BY ID
// ==========================================
router.get(
    "/registration/:code",
    getTournamentByRegistrationCode
);

router.get(
    "/my",
    authenticateUser,
    authorizeRoles("Organizer", "Admin"),
    getMyTournaments
);

router.get(
    "/:id",
    getTournamentById
);


// ==========================================
// UPDATE TOURNAMENT
// ==========================================

router.put(
    "/:id",
    authenticateUser,
    authorizeRoles("Organizer", "Admin"),
    tournamentUpdateValidation,
    validate,
    updateTournament
);


// ==========================================
// DELETE TOURNAMENT
// ==========================================

router.delete(
    "/:id",
    authenticateUser,
    authorizeRoles("Organizer", "Admin"),
    deleteTournament
);


module.exports = router;