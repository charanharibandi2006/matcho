const express = require("express");

const router = express.Router();

const authenticateUser =
    require("../middleware/authMiddleware");

const {
    registerForTournament,
    getTournamentParticipants
} = require("../controllers/registrationController");


router.post(
    "/tournaments/join",
    authenticateUser,
    registerForTournament
);

router.get(
    "/tournaments/:tournamentId/participants",
    authenticateUser,
    getTournamentParticipants
);


module.exports = router;