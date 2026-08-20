const express = require("express");

const router = express.Router();

const authenticateUser =
    require("../middleware/authMiddleware");

const authorizeRoles =
    require("../middleware/authorizeRoles");

const {
    getTournamentTeams,
    createTeam,
    updateTeam,
    deleteTeam,
} = require("../controllers/teamController");


// =========================================================
// GET TEAMS
// =========================================================

router.get(
    "/tournaments/:tournamentId/teams",
    authenticateUser,
    authorizeRoles(
        "Organizer",
        "Admin"
    ),
    getTournamentTeams
);


// =========================================================
// CREATE TEAM
// =========================================================

router.post(
    "/tournaments/:tournamentId/teams",
    authenticateUser,
    authorizeRoles(
        "Organizer",
        "Admin"
    ),
    createTeam
);


// =========================================================
// UPDATE TEAM
// =========================================================

router.put(
    "/tournaments/:tournamentId/teams/:teamId",
    authenticateUser,
    authorizeRoles(
        "Organizer",
        "Admin"
    ),
    updateTeam
);


// =========================================================
// DELETE TEAM
// =========================================================

router.delete(
    "/tournaments/:tournamentId/teams/:teamId",
    authenticateUser,
    authorizeRoles(
        "Organizer",
        "Admin"
    ),
    deleteTeam
);


module.exports = router;