const express = require("express");

const router = express.Router();

const authenticateUser =
    require("../middleware/authMiddleware");

const {
    publicRegisterForTournament,
    getTournamentParticipants
} = require("../controllers/registrationController");

// Public player registration
// No player account/login required.
router.post(
    "/tournaments/join-public",
    publicRegisterForTournament
);

// Organizer-only participant list
router.get(
    "/tournaments/:tournamentId/participants",
    authenticateUser,
    getTournamentParticipants
);

module.exports = router;