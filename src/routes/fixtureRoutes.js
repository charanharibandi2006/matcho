const express = require("express");

const router = express.Router();

const {
    generateRandomFixtures,
    getFixturesByTournament,
    updateFixtureScore,
    generateNextRound,
    generateFinal
} = require("../controllers/fixtureController");

const authenticateUser =
    require("../middleware/authMiddleware");

const authorizeRoles =
    require("../middleware/authorizeRoles");


// ==========================================
// GENERATE RANDOM FIXTURES
// ==========================================

router.post(
    "/random/:tournamentId",
    authenticateUser,
    authorizeRoles("Organizer", "Admin"),
    generateRandomFixtures
);


// ==========================================
// GET TOURNAMENT FIXTURES
// ==========================================

router.get(
    "/:tournamentId",
    getFixturesByTournament
);


// ==========================================
// UPDATE FIXTURE SCORE
// ==========================================

router.put(
    "/score/:id",
    authenticateUser,
    authorizeRoles("Organizer", "Admin"),
    updateFixtureScore
);


// ==========================================
// GENERATE NEXT ROUND
// ==========================================

router.post(
    "/next-round/:tournamentId",
    authenticateUser,
    authorizeRoles("Organizer", "Admin"),
    generateNextRound
);


// ==========================================
// GENERATE FINAL
// ==========================================

router.post(
    "/final/:tournamentId",
    authenticateUser,
    authorizeRoles("Organizer", "Admin"),
    generateFinal
);


module.exports = router;