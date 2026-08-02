const express = require("express");
const router = express.Router();

const {
    generateRandomFixtures,
    generateManualFixtures,
    getFixturesByTournament,
    updateScore,
    generateNextRound
} = require("../controllers/fixtureController");

const authenticateUser = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/authorizeRoles");

router.post(
    "/random/:tournamentId",
    authenticateUser,
    authorizeRoles("organizer", "admin"),
    generateRandomFixtures
);

router.post(
    "/manual/:tournamentId",
    authenticateUser,
    authorizeRoles("organizer", "admin"),
    generateManualFixtures
);


router.get("/:tournamentId", getFixturesByTournament);

router.put("/score/:id", authenticateUser, authorizeRoles("organizer", "admin"), updateScore);

router.post("/next-round/:tournamentId", authenticateUser, authorizeRoles("organizer", "admin"), generateNextRound);

module.exports = router;