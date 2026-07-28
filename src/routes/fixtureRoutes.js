const express = require("express");
const router = express.Router();

const {
    generateFixtures,
    getFixturesByTournament,
    updateScore,
    generateNextRound
} = require("../controllers/fixtureController");

const authenticateUser = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/authorizeRoles");

router.post(
    "/generate/:tournamentId",
    authenticateUser,
    authorizeRoles("organizer", "admin"),
    generateFixtures,

);

router.get("/:tournamentId", getFixturesByTournament);

router.put("/score/:id", authenticateUser, authorizeRoles("organizer", "admin"), updateScore);

router.post("/next-round/:tournamentId", authenticateUser, authorizeRoles("organizer", "admin"), generateNextRound);

module.exports = router;