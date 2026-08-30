const express = require("express");

const router = express.Router();

const {
    generateRandomFixtures,
    getFixtureSetup,
    saveFixtureSetup,
    getFixturesByTournament,
    updateFixtureScore,
    swapUpcomingFixtureSides,
    generateNextRound,
    generateFinal
} = require("../controllers/fixtureController");

const authenticateUser =
    require("../middleware/authMiddleware");

const authorizeRoles =
    require("../middleware/authorizeRoles");

// ==========================================
// GET FIXTURE SETUP
// ==========================================

router.get(
    "/setup/:tournamentId",
    authenticateUser,
    authorizeRoles("Organizer", "Admin"),
    getFixtureSetup
);

// ==========================================
// SAVE / UPDATE FIXTURE SETUP
// ==========================================

router.put(
    "/setup/:tournamentId",
    authenticateUser,
    authorizeRoles("Organizer", "Admin"),
    saveFixtureSetup
);

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
// SWAP UPCOMING FIXTURE OPPONENTS
// ==========================================

router.post(
    "/swap",
    authenticateUser,
    authorizeRoles("Organizer", "Admin"),
    swapUpcomingFixtureSides
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