const express = require("express");

const router = express.Router();

const {
    generateRandomFixtures,
    getFixtureSetup,
    saveFixtureSetup,
    getPoolAssignments,
    randomizePoolAssignments,
    savePoolAssignments,
    clearPoolAssignments,
    getFixturesByTournament,
    updateFixtureScore,
    swapUpcomingFixtureSides,
    generateNextRound,
    generateFinal,
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
// GET POOL ASSIGNMENTS
// ==========================================

router.get(
    "/pools/:tournamentId",
    authenticateUser,
    authorizeRoles("Organizer", "Admin"),
    getPoolAssignments
);

// ==========================================
// RANDOMLY ASSIGN TEAMS / PLAYERS TO POOLS
// ==========================================

router.post(
    "/pools/:tournamentId/random",
    authenticateUser,
    authorizeRoles("Organizer", "Admin"),
    randomizePoolAssignments
);

// ==========================================
// SAVE MANUAL POOL ASSIGNMENTS
// ==========================================

router.put(
    "/pools/:tournamentId",
    authenticateUser,
    authorizeRoles("Organizer", "Admin"),
    savePoolAssignments
);

// ==========================================
// CLEAR POOL ASSIGNMENTS
// ==========================================

router.delete(
    "/pools/:tournamentId",
    authenticateUser,
    authorizeRoles("Organizer", "Admin"),
    clearPoolAssignments
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